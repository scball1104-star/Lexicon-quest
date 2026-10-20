"""A small SNES-style tracker: tempo map, tracks of notes, instruments, effects, loop-aware render.

Usage from a song module:

    from tracker import Song
    s = Song('archive', bpm=72, beats_per_bar=4, bars=28, key='D dorian')
    t = s.track('musicbox', inst='musicbox', volume=-10, pan=0.3, reverb=0.35, delay=0.2)
    t.seq(bar=1, beat=1, pattern='d6/1 a6 b6 g6/2 | r/4')
    audio = s.render()

Pattern DSL (whitespace-separated tokens, '|' is ignored):
    c4        a note (name + octave), duration = the last duration used (initial: 1 beat)
    c4/0.5    note with duration 0.5 beats     r/2   rest of 2 beats
    [c4 e4 g4]/2   a chord                     @0.7  set velocity for following notes
    c4.  staccato (gate 0.5)   c4_  legato (gate slightly over 1)   c4~  full gate (1.0)
    c4^  accent (+0.15 velocity)    >  / <   nudge velocity up / down by 0.06 from here on
    c4/1@0.4  per-note velocity override (does not change the running velocity)

Loop rendering: the loop body (bars 1..bars) is rendered twice back to back plus the head of a third
pass, and the delivered audio is the second pass, so every instrument tail and reverb tail from the end
of the loop is already present at the loop start. A 60 ms "guard" copy of the loop's last samples is
prepended (ramped) and a copy of the loop's first samples appended, so the seam stays sample-continuous
even if a decoder ignores the gapless tag and shifts the audio by up to +30 / -60 ms.
"""
import hashlib
import json
import math
import os
import re
import struct
import numpy as np

import synth
import effects
from theory import midi as midi_of, freq

SR = 44100
GUARD_SAMPLES = 2646        # 60 ms copy of the loop end placed before loopStart
GUARD_RAMP = 1323           # first 30 ms of the guard fade in
TAIL_SAMPLES = 2646         # 60 ms of loop-head continuation after loopEnd, then a 40 ms fade
TAIL_FADE = 1764


class Note:
    __slots__ = ('t', 'dur', 'midi', 'vel', 'gate', 'pan')

    def __init__(self, t, dur, midi, vel, gate, pan=None):
        self.t = t
        self.dur = dur
        self.midi = midi
        self.vel = vel
        self.gate = gate
        self.pan = pan


_TOKEN = re.compile(r'^(?P<pitch>[a-gr](?:[#b]*)(?:-?\d+)?)(?:/(?P<dur>[0-9.]+))?(?:@(?P<vel>[0-9.]+))?(?P<art>[._~^]*)$')


class Track:
    def __init__(self, song, name, inst, volume=-12.0, pan=0.0, reverb=0.25, delay=0.0, vel=0.8,
                 gate=0.9, transpose=0, pitched=True, humanize_ms=0.0, vel_jitter=0.0, strum_ms=0.0,
                 lowpass=None, highpass=None, role=None, width=1.0):
        self.song = song
        self.name = name
        self.inst_name = inst if isinstance(inst, str) else inst.name
        self.inst = synth.make(inst) if isinstance(inst, str) else inst
        self.volume = volume
        self.pan = pan
        self.reverb = reverb
        self.delay = delay
        self.vel = vel
        self.gate = gate
        self.transpose = transpose
        self.pitched = pitched
        self.humanize_ms = humanize_ms
        self.vel_jitter = vel_jitter
        self.strum_ms = strum_ms
        self.lowpass = lowpass
        self.highpass = highpass
        self.role = role          # 'melody', 'bass', 'pad', 'arp', 'perc' (for the review)
        self.width = width
        self.notes = []

    # -- composing helpers ---------------------------------------------------------------
    def add(self, t, pitch, dur, vel=None, gate=None, pan=None):
        m = midi_of(pitch) if isinstance(pitch, str) else int(pitch)
        self.notes.append(Note(float(t), float(dur), m + self.transpose,
                               self.vel if vel is None else vel,
                               self.gate if gate is None else gate, pan))
        return self

    def chord(self, t, pitches, dur, vel=None, gate=None):
        for p in pitches:
            self.add(t, p, dur, vel, gate)
        return self

    def seq(self, bar=1, beat=1, pattern='', t=None, vel=None):
        """Place a pattern string starting at bar/beat (1-based) or absolute beat t. Returns end beat."""
        if t is None:
            t = (bar - 1) * self.song.beats_per_bar + (beat - 1)
        cur_vel = self.vel if vel is None else vel
        dur = 1.0
        for tok in re.findall(r'\[[^\]]*\]\S*|\S+', pattern):
            if tok == '|':
                continue
            if tok.startswith('@') and tok[1:].replace('.', '', 1).isdigit():
                cur_vel = float(tok[1:])
                continue
            if tok == '>':
                cur_vel = min(1.0, cur_vel + 0.06)
                continue
            if tok == '<':
                cur_vel = max(0.05, cur_vel - 0.06)
                continue
            chord = None
            if tok.startswith('['):
                inner, _, rest = tok[1:].partition(']')
                chord = inner.split(',') if ',' in inner else inner.split()
                tok = 'c0' + rest  # placeholder parse for the suffix
            m = _TOKEN.match(tok)
            if not m:
                raise ValueError('bad token %r in track %s' % (tok, self.name))
            if m.group('dur'):
                dur = float(m.group('dur'))
            art = m.group('art') or ''
            gate = self.gate
            if '.' in art:
                gate = 0.5
            if '_' in art:
                gate = 1.04
            if '~' in art:
                gate = 1.0
            v = float(m.group('vel')) if m.group('vel') else cur_vel
            if '^' in art:
                v = min(1.0, v + 0.15)
            pitch = m.group('pitch')
            if chord is not None:
                for i, p in enumerate(chord):
                    self.add(t + i * (self.strum_ms / 1000.0) * (self.song.base_bpm / 60.0), p.strip(), dur, v, gate)
            elif pitch != 'r':
                self.add(t, pitch, dur, v, gate)
            t += dur
        return t

    # -- rendering -----------------------------------------------------------------------
    def _seed(self, note):
        h = hashlib.blake2b(('%s|%.4f|%d' % (self.name, note.t, note.midi)).encode(), digest_size=8).digest()
        return int.from_bytes(h, 'little')

    def render_into(self, buf, song, pass_offsets_s, head_beats):
        """Render every note once and add it at each loop-pass offset (identical audio each pass)."""
        sr = song.sr
        for i, n in enumerate(self.notes):
            rng = np.random.default_rng(self._seed(n))
            t_off = rng.normal(0.0, self.humanize_ms / 1000.0) if self.humanize_ms > 0 else 0.0
            vel = float(np.clip(n.vel + (rng.normal(0.0, self.vel_jitter) if self.vel_jitter > 0 else 0.0), 0.05, 1.0))
            start_s = song.beat_to_sec(n.t) + t_off
            gate_s = max(0.02, song.beat_to_sec(n.t + n.dur * n.gate) - song.beat_to_sec(n.t))
            # pads: let very long notes be rendered as such; the instrument caps max_len
            audio = self.inst.render(freq(n.midi), gate_s, vel, sr, rng)
            if audio.ndim == 1:
                pan = self.pan if n.pan is None else n.pan
                audio = synth.pan_stereo(audio, pan)
            else:
                # stereo instrument: apply width then a pan offset
                mid = audio.mean(axis=1)
                side = (audio[:, 0] - audio[:, 1]) * 0.5 * self.width
                audio = np.stack([mid + side, mid - side], axis=1)
                if self.pan != 0.0:
                    th = (self.pan + 1.0) * 0.25 * math.pi
                    audio = audio * np.array([math.cos(th), math.sin(th)])[None, :] * math.sqrt(2.0)
            offsets = list(pass_offsets_s)
            if n.t < head_beats:
                offsets.append(pass_offsets_s[-1] + song.loop_sec)
            for off in offsets:
                s0 = int(round((start_s + off) * sr))
                e0 = min(buf.shape[0], s0 + audio.shape[0])
                if s0 < 0 or s0 >= buf.shape[0]:
                    continue
                buf[s0:e0] += audio[:e0 - s0]
        if self.lowpass:
            buf[:] = synth.filt(buf, 'lp', self.lowpass, sr, 0.7)
        if self.highpass:
            buf[:] = synth.filt(buf, 'hp', self.highpass, sr, 0.7)
        return buf


class Song:
    def __init__(self, id, bpm, beats_per_bar=4, bars=16, key='C major', sr=SR, title='',
                 reverb_room=0.82, reverb_damp=0.3, reverb_len=3.5, reverb_level=-6.0,
                 delay_beats=(0.75, 0.5), delay_feedback=0.28, delay_level=-10.0,
                 target_lufs=-16.0, ends=False, ring_out=4.0, intended_chords=None, master_tilt_db=0.0,
                 true_peak_trim=False):
        self.id = id
        self.title = title or id
        self.tempo_map = [(0.0, float(bpm))] if isinstance(bpm, (int, float)) else [(float(b), float(v)) for b, v in bpm]
        self.base_bpm = self.tempo_map[0][1]
        self.beats_per_bar = beats_per_bar
        self.bars = bars
        self.loop_beats = bars * beats_per_bar
        self.key = key
        self.sr = sr
        self.tracks = []
        self.reverb_room = reverb_room
        self.reverb_damp = reverb_damp
        self.reverb_len = reverb_len
        self.reverb_level = reverb_level
        self.delay_beats = delay_beats
        self.delay_feedback = delay_feedback
        self.delay_level = delay_level
        self.target_lufs = target_lufs
        self.ends = ends              # True: the piece has a real ending (ring-out), loop restarts from 0
        self.ring_out = ring_out      # seconds of ring-out kept after the last bar when ends=True
        self.intended_chords = intended_chords or []
        self.master_tilt_db = master_tilt_db
        self.true_peak_trim = true_peak_trim   # Episode 2 songs: see render()
        self._build_tempo()

    # -- tempo -----------------------------------------------------------------------------
    def _build_tempo(self):
        step = 1.0 / 32.0
        end_beat = self.loop_beats + 8  # extra for tails of the head pass
        grid = np.arange(0.0, end_beat + step, step)
        pts_b = np.array([b for b, _ in self.tempo_map])
        pts_v = np.array([v for _, v in self.tempo_map])
        bpm = np.interp(grid, pts_b, pts_v)
        # beat b of pass k uses the same map (map restarts each pass)
        spb = 60.0 / bpm
        cum = np.concatenate([[0.0], np.cumsum(spb[:-1] * step)])
        self._grid = grid
        self._cum = cum
        self.loop_sec = float(np.interp(self.loop_beats, grid, cum))

    def beat_to_sec(self, b):
        if b <= self.loop_beats:
            return float(np.interp(b, self._grid, self._cum))
        # beyond the loop: continue at the final tempo
        extra = b - self.loop_beats
        return self.loop_sec + extra * 60.0 / self.tempo_map[-1][1]

    def bar_start(self, bar):
        return (bar - 1) * self.beats_per_bar

    # -- tracks ---------------------------------------------------------------------------
    def track(self, name, inst, **kw):
        t = Track(self, name, inst, **kw)
        self.tracks.append(t)
        return t

    # -- render ---------------------------------------------------------------------------
    def render(self, verbose=True):
        sr = self.sr
        L = self.loop_sec
        if self.ends:
            # one pass only: the file is the piece plus its ring-out, loop = whole file
            passes = (0.0,)
            head_beats = -1.0
            d0, d1 = 0, int((L + self.ring_out) * sr)
        else:
            passes = (0.0, L)
            head_beats = 1.0  # notes starting in the first beat are also rendered at the start of pass 3
            d0, d1 = int(round(L * sr)), int(round(2 * L * sr))
        tail_room = 10.0
        total = int((len(passes) * L + 2.0 + tail_room) * sr)
        dry = np.zeros((total, 2))
        rev_bus = np.zeros((total, 2))
        dly_bus = np.zeros((total, 2))
        track_rms = {}
        for tr in self.tracks:
            buf = np.zeros((total, 2))
            tr.render_into(buf, self, passes, head_beats)
            g = 10.0 ** (tr.volume / 20.0)
            buf *= g
            # measure the track's contribution over the delivered pass
            seg = buf[d0:d1]
            track_rms[tr.name] = 20.0 * math.log10(max(1e-9, float(np.sqrt((seg ** 2).mean()))))
            dry += buf
            if tr.reverb > 0:
                rev_bus += buf * tr.reverb
            if tr.delay > 0:
                dly_bus += buf * tr.delay
            if verbose:
                print('  rendered %-14s %4d notes  rms %6.1f dB' % (tr.name, len(tr.notes), track_rms[tr.name]))
        mix = dry.copy()
        if np.abs(rev_bus).max() > 0:
            wet = effects.reverb(rev_bus, sr, self.reverb_room, self.reverb_damp, self.reverb_len)
            mix += wet * 10.0 ** (self.reverb_level / 20.0)
        if np.abs(dly_bus).max() > 0:
            spb = 60.0 / self.base_bpm
            wet = effects.stereo_delay(dly_bus, sr, self.delay_beats[0] * spb, self.delay_beats[1] * spb,
                                       self.delay_feedback)
            mix += wet * 10.0 ** (self.delay_level / 20.0)
        mix = effects.dc_block(mix, sr, 22.0)
        if self.master_tilt_db:
            mix = synth.filt(mix, 'highshelf', 4000.0, sr, 0.7, self.master_tilt_db)
        # loudness normalise on the delivered pass, then limit
        deliver = mix[d0:d1]
        lufs = effects.lufs_integrated(deliver, sr)
        gain = 10.0 ** ((self.target_lufs - lufs) / 20.0)
        mix *= gain
        mix, gr = effects.limiter(mix, sr, ceiling_db=-1.0)
        # the limiter works on samples; if inter-sample peaks of the delivered pass still poke above -1 dBFS,
        # trim the whole mix by the excess. Opt-in (the Episode 2 songs set it) so Episode 1 renders keep their bytes.
        if self.true_peak_trim:
            tp = effects.true_peak_db(mix[d0:d1], sr)
            if tp > -1.0:
                mix *= 10.0 ** ((-1.03 - tp) / 20.0)
        self.stats = {'pre_lufs': lufs, 'gain_db': 20 * math.log10(gain), 'limiter_gr_db': gr, 'track_rms': track_rms}
        if self.ends:
            out = mix[d0:d1].copy()
            nf = int(0.25 * sr)
            out[-nf:] *= (0.5 + 0.5 * np.cos(np.linspace(0, math.pi, nf)))[:, None]
            self.loop_start_sample = 0
            self.loop_end_sample = out.shape[0]
            self.audio = out
            self.stats['lufs'] = effects.lufs_integrated(out, sr)
            self.stats['peak_db'] = 20 * math.log10(max(1e-9, float(np.abs(out).max())))
            self.stats['true_peak_db'] = effects.true_peak_db(out, sr)
            self.stats['dc'] = float(out.mean())
            self.stats['duration'] = out.shape[0] / sr
            return out
        # ---- assemble the delivered file: guard + loop pass 2 + tail -------------------
        ls = d0                          # start of pass 2 in `mix`
        le = d1                          # end of pass 2
        loop = mix[ls:le]
        guard = mix[le - GUARD_SAMPLES:le].copy()
        ramp = np.ones(GUARD_SAMPLES)
        ramp[:GUARD_RAMP] = 0.5 - 0.5 * np.cos(np.linspace(0, math.pi, GUARD_RAMP))
        guard *= ramp[:, None]
        tail = mix[le:le + TAIL_SAMPLES + TAIL_FADE].copy()
        fade = np.ones(tail.shape[0])
        fade[TAIL_SAMPLES:] = 0.5 + 0.5 * np.cos(np.linspace(0, math.pi, tail.shape[0] - TAIL_SAMPLES))
        tail *= fade[:, None]
        out = np.concatenate([guard, loop, tail], axis=0)
        self.loop_start_sample = GUARD_SAMPLES
        self.loop_end_sample = GUARD_SAMPLES + loop.shape[0]
        self.audio = out
        self.stats['lufs'] = effects.lufs_integrated(loop, sr)
        self.stats['peak_db'] = 20 * math.log10(max(1e-9, float(np.abs(out).max())))
        self.stats['true_peak_db'] = effects.true_peak_db(out, sr)
        self.stats['dc'] = float(out.mean())
        self.stats['duration'] = out.shape[0] / sr
        return out

    # -- output ----------------------------------------------------------------------------
    def meta(self):
        return {
            'loopStart': round(self.loop_start_sample / self.sr, 6),
            'loopEnd': round(self.loop_end_sample / self.sr, 6),
            'bpm': self.base_bpm,
            'key': self.key,
            'duration': round(self.audio.shape[0] / self.sr, 6),
        }

    def write(self, out_dir, kbps=160):
        import mp3tag
        os.makedirs(out_dir, exist_ok=True)
        mp3_path = os.path.join(out_dir, self.id + '.mp3')
        info = mp3tag.write_mp3(mp3_path, self.audio, self.sr, kbps=kbps)
        json_path = os.path.join(out_dir, self.id + '.json')
        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump(self.meta(), f, separators=(',', ':'))
        return mp3_path, json_path, info

    def write_wav(self, path):
        pcm = (np.clip(self.audio, -1, 1) * 32767).round().astype('<i2')
        data = pcm.tobytes()
        with open(path, 'wb') as f:
            f.write(b'RIFF' + struct.pack('<I', 36 + len(data)) + b'WAVE')
            f.write(b'fmt ' + struct.pack('<IHHIIHH', 16, 1, 2, self.sr, self.sr * 4, 4, 16))
            f.write(b'data' + struct.pack('<I', len(data)) + data)
