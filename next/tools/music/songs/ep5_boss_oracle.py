"""boss_oracle: "The Sand Oracle" (the Oracle's battle). C minor, 12/8 felt as four dotted quarters (written as six quarter
beats per bar at 132, so the pulse is 88 a minute), 42 bars: 2 intro bars played once, then a 40-bar loop (109.1 s).
Manifest id `boss_oracle`, file ep5_boss_oracle.mp3.

The plan's brief: a 12/8 drive, frame drums and low brass on the accents, a plucked ostinato, choir pads; the B section
quotes `saffron` in minor (the town's own song read as an ending); a last major bar before the loop.

The name motif is the brass's, from the third of the key, Eb Bb C Ab: one note on each pulse of a bar, the Ab held across
the bar line, where it becomes the root of the next chord (Ab), as the oud's Bb did in `saffron`. A2 doubles it with the
high strings an octave up and the horn an octave down. B quotes the Saffron tune (ep5_theme.TUNE) in C minor, re-barred to
12/8 by `swing128`: the motif notes on the oud (the town's instrument), the rest on horn and strings, then on the brass.
C climbs the motif from Eb, F, G and Ab, then a G7 hemiola (six quarter-note stabs against four pulses) and the motif
fortissimo. The last bar before the loop is C major: the oud plays the motif in its tonic guise, C G A F, and bends the F
down a half step onto E, the major third of the key: the town's sigh, landing in the light for one bar.

Form (bar: harmony)
  I    1-2    Cm: frame drums and a low brass pedal, the ostinato enters in bar 2 (played once, before loopStart)
  A    3-10   Cm, Ab, Fm, G, Cm, Ab, Db, G7: the brass motif (bars 3 and 7), choir pads, the drive
  A2   11-18  Cm, Ab, Fm, G, Cm, Eb, Db, G7: the motif doubled (high strings above, horn below), bars 11 and 15
  B    19-26  the Saffron quote: Cm, Eb, Abmaj7, G, Fm7, Fm6, Cm-G7, Gsus4-G
  C    27-34  the motif climbs (Cm, Fm, Gm, Ab), G7 hemiola (31-32), the motif fortissimo (33), G7
  R    35-41  the ostinato creeps back (Cm, Ab, Fm, G7), the motif cut short, a timpani roll builds on G7
  M    42     C major: the oud's motif, its last note bent onto E

The intro plays once: bars 1 and 2 are rendered as a head before loopStart and the loop body is bars 3 to 42, so the
seam (bar 42 -> bar 3) keeps the tracker's sample-continuous guard (the E4-integrate fix to boss_regent, here from the
start). loopStart is the bar line of bar 3: 2 bars of 6 beats at 132 = 5.454545 s.
"""
import copy
import math

import numpy as np

import synth
from tracker import Song, GUARD_SAMPLES
import e3_theme as T
import ep5_theme as E

BPB = 6.0
PULSES = (0.0, 1.5, 3.0, 4.5)
INTRO_BARS = 2
A_CH = ['Cm', 'Ab', 'Fm', 'G', 'Cm', 'Ab', 'Db', 'G7']
A2_CH = ['Cm', 'Ab', 'Fm', 'G', 'Cm', 'Eb', 'Db', 'G7']
B_CH = [b[0][1] for b in E.CHORDS_MINOR]            # the quote's harmony (bars 25 and 26 change at beat 3; see SPLIT)
C_CH = ['Cm', 'Fm', 'Gm', 'Ab', 'G7', 'G7', 'Cm', 'G7']
R_CH = ['Cm', 'Ab', 'Fm', 'G7', 'G7', 'G7', 'G7']
BARS = ['Cm'] * INTRO_BARS + A_CH + A2_CH + B_CH + C_CH + R_CH + ['C']
assert len(BARS) == 42, len(BARS)
SPLIT = {25: 'G7', 26: 'G'}                          # the second half of bars 25 and 26 (CHORDS_MINOR bars 7 and 8)
SONG_KW = dict(reverb_room=0.84, reverb_damp=0.4, reverb_len=3.2, reverb_level=-9.5, delay_beats=(0.75, 0.5),
               delay_feedback=0.22, delay_level=-20.0)


def chord_at(bar, beat):
    if bar in SPLIT and beat >= 3.0:
        return SPLIT[bar]
    return BARS[bar - 1]


class IntroLoopSong(Song):
    """The loop body (this Song) with a once-only intro placed before loopStart, both at the body's gain; the intro's last
    60 ms fade out under the body's ramped guard (the copy of the loop end), so the first entry and every loop seam stay
    sample-continuous. The same construction as ep4_boss_regent.IntroLoopSong, with the intro length as a field."""

    intro_beats = INTRO_BARS * BPB

    def render(self, verbose=True):
        Song.render(self, verbose)
        body = self.audio
        intro = self.intro
        intro.target_lufs = 0.0
        intro.render(verbose=False)                                   # pass 1: measure the intro's own loudness
        intro.target_lufs = intro.stats['pre_lufs'] + self.stats['gain_db']
        head = intro.render(verbose=False)                            # pass 2: at the body's gain
        n = int(round(intro.beat_to_sec(self.intro_beats) * self.sr))
        g = GUARD_SAMPLES
        fade = 0.5 + 0.5 * np.cos(np.linspace(0.0, math.pi, g))
        joint = head[n - g:n] * fade[:, None] + body[:g]
        self.audio = np.concatenate([head[:n - g], joint, body[g:]], axis=0)
        self.loop_start_sample = n
        self.loop_end_sample = n - g + self.loop_end_sample
        self.stats['intro_s'] = n / self.sr
        self.stats['intro_gain_db'] = intro.stats['gain_db']
        self.stats['duration'] = self.audio.shape[0] / self.sr
        if verbose:
            print('  intro once: %.3f s before loopStart, rendered at the body gain %.2f dB' % (n / self.sr, self.stats['gain_db']))
        return self.audio


def build():
    """Composed on its 42 written bars (compose), then split: bars 1..2 into the intro, 3..42 into the loop."""
    src = compose()
    off = INTRO_BARS * BPB
    body = IntroLoopSong('ep5_boss_oracle', bpm=132, beats_per_bar=BPB, bars=42 - INTRO_BARS, key='C minor',
                         title='The Sand Oracle', target_lufs=-16.0, true_peak_trim=True, intended_chords=BARS[INTRO_BARS:],
                         **SONG_KW)
    intro = Song('ep5_boss_oracle_intro', bpm=132, beats_per_bar=BPB, bars=INTRO_BARS, key='C minor',
                 title='The Sand Oracle (intro)', ends=True, ring_out=1.0, target_lufs=-16.0,
                 intended_chords=BARS[:INTRO_BARS], **SONG_KW)
    for tr in src.tracks:
        for dst, keep, shift in ((body, lambda n: n.t >= off, off), (intro, lambda n: n.t < off, 0.0)):
            t = copy.copy(tr)
            t.song = dst
            t.notes = []
            for n in tr.notes:
                if keep(n):
                    m = copy.copy(n)
                    m.t = n.t - shift
                    t.notes.append(m)
            dst.tracks.append(t)
    body.intro = intro
    return body


def motif128(track, bar, start, vel, hold=6.0):
    """The motif in 12/8: one note on each pulse of the bar, the fourth held `hold` beats (across the bar line)."""
    t0 = (bar - 1) * BPB
    for i, (iv, dur) in enumerate(((0, 1.5), (7, 1.5), (9, 1.5), (5, hold))):
        track.add(t0 + PULSES[i], start + iv, dur, vel=vel)


def compose():
    s = Song('ep5_boss_oracle', bpm=132, beats_per_bar=BPB, bars=42, key='C minor', title='The Sand Oracle',
             target_lufs=-16.0, true_peak_trim=True, intended_chords=BARS, **SONG_KW)
    bs = s.bar_start

    ost = s.track('oud ostinato', E.Oud(decay=0.9, brightness=0.6, body=1.1), volume=-3.0, pan=-0.25, reverb=0.25,
                  role='arp', vel=0.56, humanize_ms=3, gate=0.7)
    pizz = s.track('pizzicato', 'pizz', volume=-14.0, pan=0.2, reverb=0.25, role='arp', vel=0.5, gate=0.6)
    oud = s.track('oud', E.Oud(decay=1.8), volume=5.0, pan=0.2, reverb=0.32, delay=0.12, role='melody', vel=0.74, gate=0.95)
    bent = s.track('oud (bent)', E.Oud(decay=6.0, bend=-1.0, bend_delay=0.2, bend_time=0.24),
                   volume=2.5, pan=0.2, reverb=0.4, delay=0.15, role='melody', vel=0.76, gate=1.0)
    brass = s.track('brass', 'brass', volume=-6.0, pan=0.1, reverb=0.32, role='melody', vel=0.8, gate=0.95)
    stab = s.track('brass stabs', 'brass', volume=-10.0, pan=-0.05, reverb=0.35, role='pad', vel=0.8, gate=0.5)
    pedal = s.track('low brass', 'brass', volume=-11.0, reverb=0.3, role='pad', vel=0.52, gate=0.9)
    horn = s.track('horn', 'horn', volume=-8.0, pan=-0.25, reverb=0.4, role='melody', vel=0.7, gate=0.95)
    hi = s.track('high strings', 'strings_high', volume=-9.0, pan=0.15, reverb=0.4, role='melody', vel=0.62, gate=0.98, width=0.6)
    choir = s.track('choir', 'choir', volume=-13.0, reverb=0.5, role='pad', vel=0.56, gate=1.0)
    tar = s.track('frame drums', E.Tar(), volume=-5.0, pan=-0.1, reverb=0.25, role='perc', pitched=False, vel=0.62,
                  humanize_ms=3, vel_jitter=0.04)
    tar2 = s.track('frame drums 2', E.Tar(), volume=-4.0, pan=0.3, reverb=0.3, role='perc', pitched=False, vel=0.5,
                   humanize_ms=4, vel_jitter=0.06)
    timp = s.track('timpani', 'lowdrum', volume=-9.0, reverb=0.3, role='perc', vel=0.7)
    bass = s.track('bass', 'bass', volume=-11.0, reverb=0.05, role='bass', vel=0.6, gate=0.8)

    # ---- the drive: the ostinato on the eighths, frame drums, low brass and timpani on the pulses -----------------------
    for bar in range(1, 43):
        quiet = 35 <= bar <= 38
        last = bar == 42
        for half in (0, 1):
            name = chord_at(bar, 3.0 * half)
            r = T.root_note(name, 48)                                   # C3 .. B3
            tt = T.tones(name, r, r + 13)
            third, fifth = tt[1], T.fifth_note(name, r)
            fig = [r, r, fifth, r + 12, fifth, third]                    # six eighths: one half of the bar
            if bar >= 2 and not last:
                for i, p in enumerate(fig):
                    v = 0.5 + (0.1 if i in (0, 3) else 0.0) - (0.08 if quiet else 0.0)
                    ost.add(bs(bar) + 3.0 * half + 0.5 * i, p, 0.5, vel=v)
                if bar >= 3 and not quiet:
                    for i in (0, 3):
                        pizz.add(bs(bar) + 3.0 * half + 0.5 * i, r - 12, 0.5, vel=0.52)
        name = BARS[bar - 1]
        if last:
            continue
        # frame drums: dum on the pulses 1 and 3 (accents), on 2 and 4 lighter, teks between
        for i in range(12):
            t = bs(bar) + 0.5 * i
            if i in (0, 6):
                tar.add(t, 'a2', 0.5, vel=0.7 if not quiet else 0.5)
            elif i in (3, 9):
                tar.add(t, 'a2', 0.5, vel=0.48 if not quiet else 0.36)
            elif i in (2, 5, 8, 11) and bar >= 3:
                tar.add(t, 'e5', 0.25, vel=0.36 + (0.08 if i == 11 else 0.0) - (0.1 if quiet else 0.0))
            if bar >= 11 and not quiet and i in (1, 4, 7, 10):
                tar2.add(t, 'g5', 0.25, vel=0.3 + 0.04 * (i == 10))
        r2 = T.root_note(name, 36)                                      # C2 .. B2
        if not quiet:
            pedal.add(bs(bar), T.root_note(name, 36), 3.0, vel=0.5 if bar < 3 else 0.58)
            pedal.add(bs(bar) + 3.0, T.root_note(chord_at(bar, 3.0), 36), 2.6, vel=0.5)
            if bar >= 3:
                timp.add(bs(bar), r2 if r2 >= 36 else r2 + 12, 1.0, vel=0.66)
                timp.add(bs(bar) + 3.0, T.fifth_note(name, 36), 1.0, vel=0.5)
            bass.add(bs(bar), r2 - 12, 3.0, vel=0.6)
            bass.add(bs(bar) + 3.0, T.root_note(chord_at(bar, 3.0), 24), 3.0, vel=0.52)
        else:
            bass.add(bs(bar), r2 - 12, 6.0, vel=0.44)
        if bar >= 3:
            for half in (0, 1):
                nm = chord_at(bar, 3.0 * half)
                choir.chord(bs(bar) + 3.0 * half, T.tones(nm, 55, 68)[:3], 3.0,
                            vel=0.4 if bar < 11 else (0.54 if not quiet else 0.4) + (0.03 * max(0, bar - 38)))

    # ---- A and A2: the motif in the brass, its held note becoming the root of the next bar ---------------------------
    for bar in (3, 7):
        motif128(brass, bar, 63, 0.84)                                    # Eb4 Bb4 C5 Ab4
        stab.chord(bs(bar + 2) + 4.5, T.tones(BARS[bar + 1], 55, 68)[:3], 1.0, vel=0.7)
        hi.add(bs(bar + 2), 72, 3.0, vel=0.5)
        hi.add(bs(bar + 2) + 3.0, 70, 1.5, vel=0.48)
        hi.add(bs(bar + 2) + 4.5, 67, 1.5, vel=0.46)
    for bar in (11, 15):
        motif128(brass, bar, 63, 0.86)
        motif128(hi, bar, 75, 0.6)
        motif128(horn, bar, 51, 0.66)
        stab.chord(bs(bar + 3) + 3.0, T.tones(BARS[bar + 2], 55, 68)[:3], 0.8, vel=0.78)
        stab.chord(bs(bar + 3) + 4.5, T.tones(BARS[bar + 2], 55, 68)[:3], 0.8, vel=0.82)
    for bar in (13, 17):                                                  # an answer under the held note, high strings
        hi.seq(t=bs(bar) + 1.5, pattern='c6/1.5 bb5/1.5 g5/1.5', vel=0.52)

    # ---- B: the Saffron tune in C minor, re-barred to 12/8 -----------------------------------------------------------
    for t, p, dur, motif in E.tune128(60, 'aeolian', first_bar=19, beats_per_bar=BPB, raise_last=True):
        bar = int(t // BPB) + 1
        if motif:
            oud.add(t, p + 12, min(dur, 3.0), vel=0.66)                   # C5 G5 Ab5 F5 on the oud, the town's instrument
            horn.add(t, p, dur, vel=0.42)
            continue
        if bar < 23:
            horn.add(t, p, dur, vel=0.72)
            hi.add(t, p + 12, dur, vel=0.56)
        else:
            brass.add(t, p, dur, vel=0.82)
            hi.add(t, p + 12, dur, vel=0.64)
            horn.add(t, p - 12, dur, vel=0.62)
    for bar in (22, 26):
        stab.chord(bs(bar) + 4.5, T.tones(chord_at(bar, 4.5), 55, 68)[:3], 0.8, vel=0.72)

    # ---- C: the motif climbs, the hemiola, the motif fortissimo -------------------------------------------------------
    for bar, start in ((27, 63), (28, 65), (29, 67), (30, 68)):           # Eb4, F4, G4, Ab4
        tones = [start, start + 7, start + 9, start + 5]
        # keep the climb in the key: each statement takes the scale's own sixth (C minor: the Ab, Bb, C, Db)
        sixth = {63: 72, 65: 74, 67: 75, 68: 77}[start]
        tones[2] = sixth
        for i, p in enumerate(tones):
            dur = 1.5
            brass.add(bs(bar) + PULSES[i], p, dur, vel=0.86)
            hi.add(bs(bar) + PULSES[i], p + 12, dur, vel=0.6)
            horn.add(bs(bar) + PULSES[i], p - 12, dur, vel=0.66)
    for bar in (31, 32):
        for k in range(6):                                                # hemiola: six quarter stabs against four pulses
            stab.chord(bs(bar) + k, T.tones('G7', 52, 67)[:4], 0.6, vel=0.7 + 0.05 * (bar - 31))
        for i in range(24):
            timp.add(bs(bar) + 0.25 * i, 'g2', 0.25, vel=0.26 + 0.03 * (bar - 31) + 0.03 * (i % 2 == 0))
    motif128(brass, 33, 63, 0.98)
    motif128(hi, 33, 75, 0.8)
    motif128(horn, 33, 51, 0.86)
    stab.chord(bs(34) + 3.0, T.tones('G7', 52, 67)[:4], 0.8, vel=0.88)
    stab.chord(bs(34) + 4.5, T.tones('G7', 52, 67)[:4], 0.8, vel=0.92)

    # ---- R: the ostinato creeps back; the motif cut short; the G7 build ------------------------------------------------
    hi.seq(t=bs(35), pattern='eb5/1.5 bb5/1.5 c6/3', vel=0.5)            # no fourth note
    hi.seq(t=bs(37), pattern='c5/1.5 g5/1.5 ab5/3', vel=0.54)
    for bar in range(39, 42):
        for k in range(6):
            stab.chord(bs(bar) + k, T.tones('G7', 52, 67)[:4], 0.5, vel=0.58 + 0.07 * (bar - 39))
        for i in range(24):
            timp.add(bs(bar) + 0.25 * i, 'g2', 0.25, vel=0.24 + 0.06 * (bar - 39) + 0.03 * (i % 2 == 0))
        choir.chord(bs(bar), ['f3', 'b3', 'd4'], 6.0, vel=0.44 + 0.04 * (bar - 39))

    # ---- M: C major, the oud's motif in its tonic guise, the F bent onto E ------------------------------------------------
    oud.add(bs(42) + 0.0, 'c5', 1.5, vel=0.8)
    oud.add(bs(42) + 1.5, 'g5', 1.5, vel=0.8)
    oud.add(bs(42) + 3.0, 'a5', 1.5, vel=0.8)
    bent.add(bs(42) + 4.5, 'f5', 1.5, vel=0.8)                            # bends to E5 inside the bar, over C major
    horn.chord(bs(42), ['c4', 'e4', 'g4'], 6.0, vel=0.6)
    hi.add(bs(42), 'e5', 6.0, vel=0.52)
    choir.chord(bs(42), ['c4', 'e4', 'g4'], 6.0, vel=0.5)
    timp.add(bs(42), 'c2', 1.0, vel=0.6)
    pedal.add(bs(42), 'c2', 6.0, vel=0.42)
    bass.add(bs(42), 'c1', 6.0, vel=0.5)
    return s
