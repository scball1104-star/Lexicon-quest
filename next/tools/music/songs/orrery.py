"""orrery: "The Orrery" (x1_terrace, x1_orrery, x1_cellar). F# Lydian, 72 BPM, 4/4, 30 bars (100.0 s), loops.

Glass and harp: clear, cold, kind. The harp plays one slow arpeggio in groups of three eighth notes across a bar of four
(three against four: the figure comes back to the same place only every three bars), under a celesta that sings in half
notes, a struck-glass chime on some downbeats, a glass pad and soft high strings. The harmony is the major triads of
F# Lydian (F#, G#, C#, and the minor A#m and D#m); the raised fourth (B sharp, written C) shows in the G# chord.

The celesta plays the name motif once, high and lit, in bar 17: C# G# A# F# (C#6 G#6 A#6 F#6), the dominant, its fifth, its
sixth and then the tonic, so the fourth note is the key note itself and the whole glass chamber lights on it. The Cellar
plays this track with the filter down if the engine can; otherwise the same track.

Form
  I    1-4    F# G# C# F#: harp and glass pad alone, the three against four
  A    5-12   F# G# C# F# / A#m D#m G# C#: the celesta's slow tune, strings join in the second four
  B    13-20  F# G# A#m D#m / C# F# G# C#: glass chimes, high strings, the motif at bar 17 (C# chord) landing on F# in bar 18
  A'   21-28  the tune again, thinner, the chimes on every other bar
  O    29-30  F#, C#: the harp alone, the C# turning back into the F# of the first bar
"""
from tracker import Song
import e3_theme as T

I = ['F#', 'G#', 'C#', 'F#']
A = ['F#', 'G#', 'C#', 'F#', 'A#m', 'D#m', 'G#', 'C#']
B = ['F#', 'G#', 'A#m', 'D#m', 'C#', 'F#', 'G#', 'C#']
BARS = I + A + B + A + ['F#', 'C#']
assert len(BARS) == 30

TUNE_P = ['a#5/2 c#6/2', 'd#6/4', 'c#6/2 g#5/2', 'f#5/4']
TUNE_Q = ['c#6/2 a#5/2', 'f#6/2 d#6/2', 'c6/3 d#6/1', 'c#6/4']          # the C is B sharp, the Lydian raised fourth


def build():
    s = Song('orrery', bpm=72, beats_per_bar=4, bars=30, key='F# lydian', title='The Orrery',
             reverb_room=0.88, reverb_damp=0.25, reverb_len=4.2, reverb_level=-6.5,
             delay_beats=(0.75, 0.5), delay_feedback=0.3, delay_level=-15.0, target_lufs=-16.0, true_peak_trim=True,
             intended_chords=BARS)
    bs = s.bar_start

    harp = s.track('harp', 'harp', volume=0.0, pan=-0.25, reverb=0.5, delay=0.2, role='arp', vel=0.5, humanize_ms=4, vel_jitter=0.03)
    cel = s.track('celesta', 'celesta', volume=-4.0, pan=0.2, reverb=0.55, delay=0.3, role='melody', vel=0.6, humanize_ms=3)
    glass = s.track('glass', 'glass', volume=-8.0, pan=0.35, reverb=0.6, delay=0.35, role='perc', vel=0.45, humanize_ms=3)
    pad = s.track('glass pad', 'glasspad', volume=-14.0, reverb=0.6, role='pad', vel=0.4, gate=1.0)
    hi = s.track('high strings', 'strings_high', volume=-16.0, reverb=0.5, role='pad', vel=0.38, gate=1.0, width=0.9)
    low = s.track('low strings', 'strings_low', volume=-20.0, reverb=0.45, role='pad', vel=0.34, gate=1.0, width=0.7)

    # ---- the arpeggio, three eighths to a group across four-beat bars ----------------------------------------------------
    n_eighths = 30 * 8
    for k in range(n_eighths):
        bar = k // 8 + 1
        name = BARS[bar - 1]
        t = T.tones(name, 54, 78)
        grp, pos = divmod(k, 3)
        idx = [0, 2, 3][pos] if len(t) >= 4 else pos
        p = t[idx % len(t)] + (12 if grp % 2 else 0)
        vel = 0.5 if pos == 0 else 0.34
        if bar >= 29 or bar <= 4 or bar >= 13:
            vel += 0.04
        harp.add(k * 0.5, p, 0.5, vel=vel, gate=1.8)

    # ---- the celesta ---------------------------------------------------------------------------------------------------
    for i, p in enumerate(TUNE_P):
        cel.seq(bar=5 + i, pattern=p, vel=0.6)
        cel.seq(bar=21 + i, pattern=p, vel=0.5)
    for i, p in enumerate(TUNE_Q):
        cel.seq(bar=9 + i, pattern=p, vel=0.6)
        cel.seq(bar=25 + i, pattern=p, vel=0.44)
    cel.seq(bar=13, pattern='a#5/2 c#6/2 | d#6/2 f#6/2', vel=0.56)
    cel.seq(bar=15, pattern='c#6/4 | a#5/4', vel=0.5)
    cel.seq(bar=17, pattern='c#6/1 g#6/1 a#6/1 f#6/1 | f#6/4', vel=0.7)    # the name motif, once, high and lit
    cel.seq(bar=19, pattern='d#6/2 c#6/2 | c#6/4', vel=0.5)

    # ---- glass chimes, pad, strings ------------------------------------------------------------------------------------
    for bar in list(range(13, 21)) + list(range(21, 29, 2)):
        name = BARS[bar - 1]
        glass.add(bs(bar), T.tones(name, 78, 96)[1], 1.0, vel=0.4)
        if bar in (13, 17):
            glass.add(bs(bar) + 2, T.tones(name, 84, 100)[0], 1.0, vel=0.3)
    for bar in range(1, 31):
        name = BARS[bar - 1]
        pad.chord(bs(bar), T.tones(name, 66, 80)[:2], 4.0, vel=0.34)
        if 9 <= bar <= 28:
            hi.chord(bs(bar), T.tones(name, 61, 76)[:3], 4.0, vel=0.34 if bar < 13 else 0.42)
            low.chord(bs(bar), [T.root_note(name, 38), T.fifth_note(name, 45)], 4.0, vel=0.34)
    return s
