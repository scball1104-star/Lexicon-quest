"""boss_eraser: "The Eraser" (the Eraser's battle; its phase 4, The Last Silence, has its own loop in the same file). C minor,
136 BPM, 4/4. One MP3 holds two loops back to back: the battle (64 bars, 112.9 s) and the Last Silence (16 bars, 28.2 s).
Manifest ids `boss_eraser` (the battle loop) and `boss_eraser_silence` (the same file, `start` = `loopStart` = the second
loop), file ep8_boss_eraser.mp3. The scene switches with audio.music('boss_eraser_silence', { fade: 1.2 }) when phase 4
begins: the buffer is shared (one fetch, already decoded), so the switch never waits on the network.

The plan's brief (EPISODE8_PLAN 8.1): a 4/4 drive of low strings, timpani, choir and a running harpsichord; the B section
quotes `scriptorium_town` with its phrases cut off; a phase 4 cue (a loop point) that thins to the violin alone over a pedal,
the motif played whole on the last bar.

The drive is Episode 7's song-local cello section in spiccato eighths (imported from ep7_theme, not changed), the timpani on 1
and 3, the harpsichord in running sixteenths over the chord (a page being copied too fast), the choir pad and the bass. The
name motif is the strings', from the third of C minor so the intervals stay exact: Eb4 Bb4 C5 Ab4 (0 +7 +9 +5) in half notes,
the Ab held into the Ab chord, the low brass two octaves under (bars 1 and 9). B quotes the Scriptorium tune (ep8_theme.TUNE)
in C minor at half speed (one tune bar = two bars here) on the violin, the town's own instrument, with the horn under it; the
Eraser takes the last two notes of every phrase (ep8_theme.tune(finished=False, cut=2)): where they belong the melody stops,
the harpsichord stops, and a dry stab of low brass and timpani lands like a rubbed-out word. C climbs the motif from Eb, F and
G, then fortissimo from Eb an octave up. R builds on a G pedal. M (61-64): the violin plays Eb Bb C and the fourth note is
rubbed out again, into the loop.

The Last Silence (S, 16 bars): everything falls away but a pedal (C and G in the low strings, a very soft choir, a heartbeat on
the timpani every bar) and the violin alone. It tries the motif three times and is cut off each time (Eb Bb C; G D Eb; Ab Eb
F), and on the last bar plays it whole, in its tonic guise with the Dorian sixth, C5 G5 A5 F5, the F held into the loop's
first bar: the one place in the episode's battle music where the name is said to the end.

Form (bar: harmony, two bars per chord unless noted)
  A    1-16   Cm, Ab, Fm, G, Cm, Ab, Db, G: the drive, the strings' motif (1, 9)
  B    17-32  the Scriptorium quote, cut: Cm, Fm7, Abmaj7, Dm7b5-G7sus4, Ab, Cm, Fm7-Ab, Cm (one tune bar = two bars)
  C    33-48  Cm, Ab, Ab, G | Fm, Bbm, Bbm, G | Cm, Ab, Ab, G7 | Cm, Ab, Fm, G (one bar each): the motif climbs, then ff
  R    49-60  a G pedal: G, Ab/G alternating, then Cm/G, G; the choir rising, a timpani roll (59-60)
  M    61-64  Cm: the violin's motif rubbed out on its fourth note
  S    1-16   (the second loop) the pedal on C, the violin alone; bar 16 the motif whole: C G A F
"""
import copy
import math

import numpy as np

from tracker import Song, GUARD_SAMPLES
import ep8_theme as E
import ep7_theme as E7
import ep6_theme as E6

BPM = 136


def pairs(*names):
    out = []
    for n in names:
        out += [n, n]
    return out


A_CH = pairs('Cm', 'Ab', 'Fm', 'G', 'Cm', 'Ab', 'Db', 'G')
QUOTE_CH = [[(0, 'Cm')], [(0, 'Fm7')], [(0, 'Abmaj7')], [(0, 'Dm7b5'), (2, 'G7sus4')], [(0, 'Ab')], [(0, 'Cm')],
            [(0, 'Fm7'), (2, 'Ab')], [(0, 'Cm')]]
B_CH = []
for segs in QUOTE_CH:                                    # two bars for each 4/4 bar of the tune
    B_CH += [segs[0][1], segs[-1][1]]
C_CH = ['Cm', 'Ab', 'Ab', 'G', 'Fm', 'Bbm', 'Bbm', 'G', 'Cm', 'Ab', 'Ab', 'G7', 'Cm', 'Ab', 'Fm', 'G']
R_CH = ['G', 'Ab/G'] * 4 + ['Cm/G', 'G'] * 2
M_CH = ['Cm'] * 4
BARS = A_CH + B_CH + C_CH + R_CH + M_CH
assert len(BARS) == 64, len(BARS)
S_CH = ['Cm'] * 15 + ['F/C']
SONG_KW = dict(reverb_room=0.88, reverb_damp=0.45, reverb_len=3.6, reverb_level=-9.5, delay_beats=(0.75, 0.5),
               delay_feedback=0.22, delay_level=-21.0)
S_LUFS = -18.0                                           # the Last Silence sits 2 LU under the battle: thinner, still heard


def section(bar):
    return 'A' if bar <= 16 else 'B' if bar <= 32 else 'C' if bar <= 48 else 'R' if bar <= 60 else 'M'


def motif44(track, t0, start, vel, hold=6.0, sixth=9):
    """The motif in half notes over two bars from beat t0, the fourth note held `hold` beats (across the bar line)."""
    for i, (iv, dur) in enumerate(((0, 2.0), (7, 2.0), (sixth, 2.0), (5, hold))):
        track.add(t0 + 2.0 * i, start + iv, dur, vel=vel)


def cuts():
    """Absolute beats (from bar 17) where the Eraser rubbed a quoted note out, with the length of the hole."""
    full = {(b, beat): dur for b, beat, _, dur in E.TUNE}
    kept = {(bar - 17, beat) for bar, beat, _, _, _ in E.tune(60, 'aeolian', 17, finished=False, cut=2)}
    out = []
    for (b, beat), dur in full.items():
        if (b, beat) not in kept:
            out.append((16 * 4 + 2.0 * (b * 4.0 + beat), 2.0 * dur))
    return sorted(out)


def compose_battle():
    s = Song('ep8_boss_eraser', bpm=BPM, beats_per_bar=4, bars=64, key='C minor', title='The Eraser', target_lufs=-16.0,
             true_peak_trim=True, intended_chords=BARS, **SONG_KW)
    bs = s.bar_start
    osti = s.track('cello ostinato', E7.Cello(bow=0.02, warmth=0.45, vib=0.03), volume=-6.0, pan=-0.2, reverb=0.25,
                   role='arp', vel=0.55, humanize_ms=3, vel_jitter=0.04, gate=0.45)
    harp = s.track('harpsichord', 'harpsichord', volume=-12.0, pan=0.3, reverb=0.25, role='arp', vel=0.5, gate=0.8,
                   humanize_ms=2)
    lowstr = s.track('low strings', 'strings_low', volume=-15.0, reverb=0.35, role='pad', vel=0.5, gate=1.0, width=0.8)
    hi = s.track('high strings', 'strings_high', volume=-8.0, pan=0.15, reverb=0.4, role='melody', vel=0.62, gate=0.98,
                 width=0.6)
    brass = s.track('low brass', 'brass', volume=-10.0, pan=0.05, reverb=0.32, role='melody', vel=0.7, gate=0.95)
    horn = s.track('horn', 'horn', volume=-10.5, pan=-0.2, reverb=0.4, role='melody', vel=0.6, gate=0.95)
    violin = s.track('violin', E.Violin(swell=0.1, vib=0.14, vib_delay=0.25, breath=0.4), volume=-1.5, pan=-0.05,
                     reverb=0.4, role='melody', vel=0.7, gate=0.96)
    choir = s.track('choir', 'choir', volume=-14.0, reverb=0.55, role='pad', vel=0.5, gate=1.0)
    timp = s.track('timpani', 'lowdrum', volume=-9.0, reverb=0.3, role='perc', vel=0.68, humanize_ms=2, vel_jitter=0.04)
    cym = s.track('cymbal', E6.Cymbal(), volume=-20.0, pan=-0.2, reverb=0.35, role='perc', pitched=False, vel=0.6)
    bass = s.track('bass', 'bass', volume=-12.0, reverb=0.05, role='bass', vel=0.6, gate=0.8)

    holes = cuts()

    def in_hole(t):
        """The drive stops for the first two beats of a rubbed-out word (the melody stays silent for all of it)."""
        return any(a <= t < a + min(d, 2.0) for a, d in holes)

    # ---- the drive --------------------------------------------------------------------------------------------------------
    for bar in range(1, 65):
        name = BARS[bar - 1]
        sec = section(bar)
        quote = sec == 'B'
        r = E.root_note(name, 36)                                       # C2 .. B2
        if sec == 'R':
            r = 43                                                      # the G pedal
        _, pcs, _ = E.parse(name)
        third = r + (3 if (E.parse(name)[0] + 3) % 12 in pcs else 4)
        fig = [r, r, r + 7, r, r + 12, r, r + 7, third]
        for i, p in enumerate(fig):
            t = bs(bar) + 0.5 * i
            if quote and in_hole(t):
                continue
            v = 0.52 + (0.12 if i in (0, 4) else 0.0) - (0.08 if quote else 0.0) + (0.05 if sec in ('C', 'R') else 0.0)
            osti.add(t, p + 12, 0.5, vel=v)
        lowstr.chord(bs(bar), [r, r + 7] if not quote else [r], 4.0, vel=0.46 if not quote else 0.4)
        tr = r if r <= 43 else r - 12
        timp.add(bs(bar), tr, 1.0, vel=0.7 if bar % 2 else 0.6)
        if not quote:
            timp.add(bs(bar) + 2.0, E.fifth_note(name, 31) if sec != 'R' else 38, 1.0, vel=0.5)
        if sec == 'C':
            for off in (3.0, 3.5):
                timp.add(bs(bar) + off, tr, 0.5, vel=0.4)
        bass.add(bs(bar), r - 12, 1.5, vel=0.6)
        bass.add(bs(bar) + 2.0, r - 12, 1.5, vel=0.5 if not quote else 0.42)
        lo = 55 + (bar - 49) // 2 if sec == 'R' else 55
        choir.chord(bs(bar), E.tones(name, lo, lo + 15)[:3], 4.0,
                    vel=0.42 if sec == 'A' else 0.36 if quote else 0.5 + (0.025 * (bar - 49) if sec == 'R' else 0.0))
        # the harpsichord: running sixteenths up and down the chord (stops for every rubbed-out word)
        tt = E.tones(name, 60, 86)
        run = tt[:5] + tt[3:0:-1]
        for i in range(16):
            t = bs(bar) + 0.25 * i
            if quote and in_hole(t):
                continue
            if sec == 'M' and bar == 64 and i >= 8:
                continue
            harp.add(t, run[i % len(run)], 0.25, vel=0.42 + (0.1 if i % 4 == 0 else 0.0))
        if bar in (16, 32, 48, 60):
            cym.add(bs(bar) + 2.0, 'c3', 2.0, vel=0.6)

    # ---- A: the strings' motif, the Ab held into the Ab chord -------------------------------------------------------------
    for bar in (1, 9):
        motif44(hi, bs(bar), 63, 0.66)                                  # Eb4 Bb4 C5 Ab4
        motif44(brass, bs(bar), 51, 0.62)                               # an octave down (Eb3)
        hi.seq(bar=bar + 4, pattern='g5/2 f5/2 | eb5/1 d5/1 c5/2', vel=0.56)   # an answer over Fm and G
        hi.seq(bar=bar + 6, pattern='f5/3 eb5/1 | d5/4', vel=0.56)
    # ---- B: the Scriptorium tune in C minor at half speed, its phrase ends rubbed out ----------------------------------------
    for bar, beat, p, dur, mo in E.tune(60, 'aeolian', 1, finished=False, cut=2):
        t = bs(17) + 2.0 * ((bar - 1) * 4.0 + beat)
        violin.add(t, p + 12, 2.0 * dur, vel=0.72 if mo else 0.66)
        horn.add(t, p, 2.0 * dur, vel=0.46)
    for a, d in holes:                                                  # the rubbed-out word: a dry stab, then nothing
        brass.chord(a, [48, 55], 0.5, vel=0.72, gate=0.5)
        timp.add(a, 36, 0.5, vel=0.74)
    # ---- C: the motif climbs, then fortissimo -----------------------------------------------------------------------------
    for bar, start, sixth in ((33, 63, 9), (37, 65, 8), (41, 67, 8)):   # Eb4 (Bb C Ab), F4 (C Db Bb), G4 (D Eb C)
        motif44(hi, bs(bar), start, 0.68, hold=4.0, sixth=sixth)
        motif44(brass, bs(bar), start - 12, 0.7, hold=4.0, sixth=sixth)
        motif44(horn, bs(bar), start - 12, 0.58, hold=4.0, sixth=sixth)
    motif44(hi, bs(45), 75, 0.8, hold=6.0)                               # Eb5 Bb5 C6 Ab5
    motif44(brass, bs(45), 63, 0.84, hold=6.0)
    motif44(horn, bs(45), 51, 0.7, hold=6.0)
    # ---- R: the build on the G pedal --------------------------------------------------------------------------------------
    hi.seq(bar=49, pattern='d5/4 | eb5/4 | d5/4 | eb5/2 f5/2 | g5/4 | ab5/4 | g5/4 | ab5/2 b5/2 | c6/4 | b5/4 | c6/4 | b5/4',
           vel=0.56)
    brass.seq(bar=55, pattern='g2/4 | ab2/4 | g2/2 c3/2 | d3/4 | c3/4 | b2/4', vel=0.66)
    for bar in (59, 60):
        for i in range(16):
            timp.add(bs(bar) + 0.25 * i, 'g1', 0.25, vel=0.3 + 0.025 * i + 0.08 * (bar - 59))
    # ---- M: the violin's motif, rubbed out on its fourth note -------------------------------------------------------------
    violin.seq(bar=61, pattern='eb5/2 bb5/2 | c6/4 | r/4 | r/4', vel=0.74)
    brass.chord(bs(63), [48, 55], 0.5, vel=0.76, gate=0.5)              # the fourth note rubbed out
    timp.add(bs(63), 36, 0.5, vel=0.8)
    hi.chord(bs(63) + 1.0, [67, 72, 75], 7.0, vel=0.34)                 # a held, thin Cm under the hole, into the loop
    return s


def compose_silence():
    s = Song('ep8_boss_eraser_silence', bpm=BPM, beats_per_bar=4, bars=16, key='C minor', title='The Eraser (The Last Silence)',
             target_lufs=S_LUFS, true_peak_trim=True, intended_chords=S_CH, **SONG_KW)
    bs = s.bar_start
    violin = s.track('violin', E.Violin(swell=0.3, vib=0.15, vib_delay=0.35, breath=0.7), volume=-3.0, pan=0.0, reverb=0.55,
                     delay=0.12, role='melody', vel=0.66, gate=0.97)
    pedal = s.track('pedal', 'strings_low', volume=-13.0, reverb=0.5, role='bass', vel=0.42, gate=1.0, width=0.8)
    choir = s.track('choir', 'choir', volume=-24.0, reverb=0.7, role='pad', vel=0.3, gate=1.0)
    timp = s.track('heartbeat', 'lowdrum', volume=-17.0, reverb=0.4, role='perc', vel=0.4)
    for bar in range(1, 17):
        pedal.chord(bs(bar), [36, 43], 4.0, vel=0.42)
        timp.add(bs(bar), 'c2', 1.0, vel=0.4)
        timp.add(bs(bar) + 0.75, 'c2', 0.5, vel=0.26)                   # the heartbeat's second beat
    choir.chord(bs(1), ['g3', 'c4', 'eb4'], 60.0, vel=0.3)
    choir.chord(bs(16), ['f3', 'a3', 'c4'], 4.0, vel=0.34)
    # three tries, each cut off; then the whole name
    violin.seq(bar=1, pattern='eb5/2 bb5/2 | c6/3', vel=0.62)
    violin.seq(bar=5, pattern='g5/2 d6/2 | eb6/3', vel=0.64)
    violin.seq(bar=9, pattern='ab5/2 eb6/2 | f6/3', vel=0.66)
    violin.seq(bar=12, pattern='r/2 g5/2 | f5/2 eb5/2 | d5/4 | r/4', vel=0.58)
    violin.seq(bar=16, pattern='c5/1 g5/1 a5/1 f5/1', vel=0.7)          # the motif whole: 0 +7 +9 +5
    return s


class TwoLoopSong(Song):
    """The battle loop and the Last Silence loop in one file, back to back: [guard, battle loop, tail][guard, silence loop,
    tail]. Each half is the tracker's own loop render (rendered twice, the second pass delivered), so both seams are
    sample-continuous; the silence half is normalized to S_LUFS on its own loop."""

    def render(self, verbose=True):
        body = self.body
        body.render(verbose)
        sil = self.silence
        sil.render(verbose)
        self.audio = np.concatenate([body.audio, sil.audio], axis=0)
        self.loop_start_sample = body.loop_start_sample
        self.loop_end_sample = body.loop_end_sample
        off = body.audio.shape[0]
        self.silence_start_sample = off + sil.loop_start_sample
        self.silence_end_sample = off + sil.loop_end_sample
        self.stats = dict(body.stats)
        self.stats['silence_lufs'] = sil.stats['lufs']
        self.stats['duration'] = self.audio.shape[0] / self.sr
        if verbose:
            print('  the Last Silence loop: %.6f s .. %.6f s (%.1f LUFS)' % (self.silence_start_sample / self.sr,
                                                                           self.silence_end_sample / self.sr,
                                                                           sil.stats['lufs']))
        return self.audio

    def meta(self):
        m = Song.meta(self)
        m['silenceStart'] = round(self.silence_start_sample / self.sr, 6)
        m['silenceEnd'] = round(self.silence_end_sample / self.sr, 6)
        return m


def build(part=None):
    """The file's song; build('battle') or build('silence') returns one half alone (for its piano roll)."""
    body = compose_battle()
    sil = compose_silence()
    if part == 'battle':
        return body
    if part == 'silence':
        return sil
    s = TwoLoopSong('ep8_boss_eraser', bpm=BPM, beats_per_bar=4, bars=64, key='C minor', title='The Eraser',
                    target_lufs=-16.0, true_peak_trim=True, intended_chords=BARS, **SONG_KW)
    s.tracks = body.tracks
    s.body = body
    s.silence = sil
    return s
