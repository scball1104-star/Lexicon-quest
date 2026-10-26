"""boss_millstone: "The Wheel Runs" (the Millstone Golem). D minor, 120 BPM (quarter), 5/4 grouped 3+2, 40 bars (100.0 s), loops.

Heavy and steady, and faster at the end of each loop. A millstone's grind (rubbed band noise over a stone thud) lands on
every pulse, timpani on the 3+2 accents, a bowed double bass holds a D pedal that scrapes, low brass answers on the second
group. Nothing swings: the wheel just comes round.

The brass plays the name motif AUGMENTED and low: F C D Bb (F3 C4 D4 Bb3), one note to a whole bar of five, so the four
notes take four bars, set on the grind. It returns every four bars of A and, higher, with a horn above it in B. In C the
grind speeds up: eighth notes from bar 29, sixteenth notes from bar 37, the timpani rolling, brass stabs on every beat,
and the last bar is the dominant, so the loop starts over faster than it ended slow.

Form
  I    1-4    Dm: the grind on the two groups, timpani, the bowed pedal
  A    5-16   Dm Dm Bb A / Dm Dm C A / Dm Bb C A: the brass motif on the grind (bars 5-8, 9-12, 13-16), stabs on the second group
  B    17-28  Gm Dm Bb A / Gm Dm C A / Bb C Dm A: the horn above the brass, a second grind an octave up, timpani on every group
  C    29-40  Dm Bb C A / Dm Bb C A / Dm Bb C A: the grind in eighths (29-36) and sixteenths (37-40), timpani roll, stabs
"""
from tracker import Song
import e3_theme as T

A = ['Dm', 'Dm', 'Bb', 'A', 'Dm', 'Dm', 'C', 'A', 'Dm', 'Bb', 'C', 'A']
B = ['Gm', 'Dm', 'Bb', 'A', 'Gm', 'Dm', 'C', 'A', 'Bb', 'C', 'Dm', 'A']
C = ['Dm', 'Bb', 'C', 'A'] * 3
BARS = ['Dm'] * 4 + A + B + C
assert len(BARS) == 40

MOTIF = ['f3', 'c4', 'd4', 'bb3']        # F C D Bb, augmented to a bar a note


def build():
    s = Song('boss_millstone', bpm=120, beats_per_bar=5, bars=40, key='D minor', title='The Wheel Runs',
             reverb_room=0.78, reverb_damp=0.5, reverb_len=2.6, reverb_level=-9.5,
             delay_beats=(0.75, 0.5), delay_feedback=0.22, delay_level=-20.0, target_lufs=-16.0, true_peak_trim=True,
             intended_chords=BARS)
    bs = s.bar_start

    grind = s.track('millstone', 'grind', volume=-4.0, pan=-0.1, reverb=0.3, role='perc', pitched=True, vel=0.5, gate=0.9, humanize_ms=3)
    grind2 = s.track('millstone high', 'grind', volume=-6.0, pan=0.2, reverb=0.3, role='perc', pitched=True, vel=0.4, gate=0.9)
    timp = s.track('timpani', 'lowdrum', volume=-12.0, reverb=0.4, role='perc', vel=0.55)
    bowed = s.track('bowed bass', 'bowbass', volume=-10.0, reverb=0.25, role='bass', vel=0.55, gate=1.0)
    brass = s.track('low brass', 'brass', volume=-10.0, pan=-0.1, reverb=0.4, role='melody', vel=0.62, gate=0.98)
    stab = s.track('brass stabs', 'brass', volume=-9.0, pan=0.1, reverb=0.4, role='perc', vel=0.6, gate=0.5)
    horn = s.track('horn', 'horn', volume=-12.0, pan=-0.3, reverb=0.45, role='pad', vel=0.5, gate=1.0)
    low = s.track('low strings', 'strings_low', volume=-15.0, reverb=0.4, role='pad', vel=0.4, gate=1.0, width=0.7)
    hi = s.track('strings', 'strings_high', volume=-14.0, reverb=0.45, role='pad', vel=0.36, gate=1.0, width=0.9)

    for bar in range(1, 41):
        name = BARS[bar - 1]
        root = T.root_note(name, 26)
        fast8 = 29 <= bar <= 36
        fast16 = bar >= 37
        # the grind: on the two groups (beat 0 long, beat 3 short) until C, then in eighths, then in sixteenths
        if fast16:
            for i in range(20):
                grind.add(bs(bar) + 0.25 * i, 'd2' if i % 4 else 'a2', 0.2, vel=0.5 if i % 4 == 0 else 0.34)
        elif fast8:
            for i in range(10):
                grind.add(bs(bar) + 0.5 * i, 'd2' if i % 2 else 'a2', 0.4, vel=0.55 if i % 2 == 0 else 0.4)
        else:
            grind.add(bs(bar), 'd2', 2.7, vel=0.6)
            grind.add(bs(bar) + 3.0, 'a2', 1.7, vel=0.5)
            if 17 <= bar <= 28:
                grind2.add(bs(bar) + 1.0, 'd3', 0.9, vel=0.4)
                grind2.add(bs(bar) + 2.0, 'f3', 0.9, vel=0.36)
                grind2.add(bs(bar) + 4.0, 'd3', 0.9, vel=0.4)
        # timpani on the 3+2 accents, on every beat in B, rolling in C
        if fast16:
            for i in range(10):
                timp.add(bs(bar) + 0.5 * i, 'd2' if i % 2 == 0 else 'a1', 0.5, vel=0.4 + 0.04 * i)
        elif fast8:
            timp.add(bs(bar), 'd2', 0.5, vel=0.7)
            for beat in (1.0, 2.0, 3.0, 4.0):
                timp.add(bs(bar) + beat, 'a1', 0.5, vel=0.46)
        elif bar >= 17:
            for beat, v in ((0.0, 0.7), (1.0, 0.4), (2.0, 0.4), (3.0, 0.62), (4.0, 0.4)):
                timp.add(bs(bar) + beat, 'd2', 0.5, vel=v)
        else:
            timp.add(bs(bar), 'd2', 0.5, vel=0.7)
            timp.add(bs(bar) + 3.0, 'a1', 0.5, vel=0.55)
        # the bowed pedal and the low strings
        bowed.add(bs(bar), 'd2' if not fast16 else root, 2.9, vel=0.55)
        bowed.add(bs(bar) + 3.0, 'd2' if not fast16 else T.fifth_note(name, 33), 1.9, vel=0.5)
        low.chord(bs(bar), [root + 12, T.fifth_note(name, 45)], 5.0, vel=0.36 if bar >= 5 else 0.0)
        if bar >= 17:
            hi.chord(bs(bar), T.tones(name, 57, 72)[:3], 5.0, vel=0.34)
        # stabs on the second group
        if 5 <= bar <= 28 and bar % 2 == 0:
            stab.chord(bs(bar) + 3.0, [root + 12, T.fifth_note(name, 45)], 0.9, vel=0.6)
        if bar >= 29:
            for beat in (0.0, 1.0, 2.0, 3.0, 4.0) if fast16 else (0.0, 3.0):
                stab.chord(bs(bar) + beat, [root + 12, T.fifth_note(name, 45)], 0.4, vel=0.56)

    # ---- the motif, augmented: a bar a note, on the grind -----------------------------------------------------------------
    for first in (5, 9, 13, 21, 25):
        for i, p in enumerate(MOTIF):
            brass.add(bs(first + i), p, 4.9, vel=0.68)
    for first in (17,):
        for i, p in enumerate(MOTIF):
            brass.add(bs(first + i), p, 4.9, vel=0.68)
            horn.add(bs(first + i), ('f4', 'c5', 'd5', 'bb4')[i], 4.9, vel=0.5)
    for first in (21, 25):
        for i, p in enumerate(MOTIF):
            horn.add(bs(first + i), ('f4', 'c5', 'd5', 'bb4')[i], 4.9, vel=0.52)
    return s
