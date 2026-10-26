"""wethers_barrow: "The Count" (x1_barrow). E minor, 66 (quarter), bars of 12 counted eighths plus one silent eighth, 14 bars
(82.7 s), loops.

Sparse. A low choir hum, a bone flute, a muted frame drum. The drum counts twelve, one soft tap to an eighth note, and the
thirteenth eighth never sounds: every bar is thirteen eighths long, the last of them silence, so the count is always one short
(tracker beat = one eighth note, 132 a minute, which is a quarter note of 66; a bar lasts 5.9 s). Under the count the
harmony holds still for a whole bar at a time.

The flute keeps the first three notes of the name motif and never plays the fourth (G D E, then a rest where the C belongs),
in A and again, from D, in B (D A B, then the rest). In the last four bars the count dwindles (twelve taps, nine, six, three)
and the flute is alone with the hum, and then the count comes round again from the top.

Form
  I    1-2    Em: the choir hum and the drum counting, nothing else
  A    3-6    Em Em C D: the flute, G D E and the missing fourth
  B    7-10   Am G D Em: the flute from D: D A B and the missing fourth; a low strings drone joins, a soft timpani on the bar
  A'   11-14  Em C D Em: the same, the count thinning bar by bar until three taps are left
"""
from tracker import Song
import e3_theme as T

BARS = ['Em', 'Em', 'Em', 'Em', 'C', 'D', 'Am', 'G', 'D', 'Em', 'Em', 'C', 'D', 'Em']
assert len(BARS) == 14
UNITS = 13          # eighths per bar: twelve counted, one silent


def build():
    s = Song('wethers_barrow', bpm=132, beats_per_bar=UNITS, bars=14, key='E minor', title='The Count',
             reverb_room=0.9, reverb_damp=0.45, reverb_len=4.8, reverb_level=-6.0,
             delay_beats=(3.0, 2.0), delay_feedback=0.3, delay_level=-17.0, target_lufs=-16.0, true_peak_trim=True,
             intended_chords=BARS)
    bs = s.bar_start

    flute = s.track('bone flute', 'boneflute', volume=-8.0, pan=0.1, reverb=0.55, delay=0.25, role='melody', vel=0.6, gate=0.97)
    hum = s.track('choir hum', 'choir', volume=-7.0, reverb=0.7, role='pad', vel=0.4, gate=1.0)
    low = s.track('low strings', 'strings_low', volume=-14.0, reverb=0.5, role='pad', vel=0.36, gate=1.0, width=0.8)
    count = s.track('frame drum', 'framedrum', volume=-3.0, pan=-0.1, reverb=0.35, role='perc', vel=0.3, humanize_ms=7)
    timp = s.track('timpani', 'lowdrum', volume=-10.0, reverb=0.6, role='perc', vel=0.3)

    # ---- the count: twelve taps, and the thirteenth never comes --------------------------------------------------------
    taps_per_bar = {11: 12, 12: 9, 13: 6, 14: 3}
    for bar in range(1, 15):
        for i in range(taps_per_bar.get(bar, 12)):
            accent = i % 3 == 0
            count.add(bs(bar) + i, 'a2' if accent else 'e3', 0.5, vel=0.34 if accent else 0.2)

    # ---- the flute keeps three notes and rests where the fourth belongs --------------------------------------------------
    for bar in (3, 5, 11, 12):
        flute.seq(bar=bar, pattern='g4/3 d5/3 e5/3 r/4', vel=0.6)         # the fourth (C) is the rest
    for bar in (4, 6):
        flute.seq(bar=bar, pattern='e5/5 d5/3 b4/3 r/2' if bar == 4 else 'a4/4 b4/4 g4/3 r/2', vel=0.52)
    for bar in (7, 9):
        flute.seq(bar=bar, pattern='d5/3 a5/3 b5/3 r/4', vel=0.56)        # from D: D A B, the G never comes
    flute.seq(bar=8, pattern='g5/5 e5/4 d5/2 r/2', vel=0.5)
    flute.seq(bar=10, pattern='b5/4 g5/3 e5/3 r/3', vel=0.5)
    flute.seq(bar=13, pattern='g4/3 d5/3 e5/3 r/4', vel=0.46)             # alone with the hum, quieter each time
    flute.seq(bar=14, pattern='e5/6 r/7', vel=0.4)

    # ---- the hum and the ground ----------------------------------------------------------------------------------------
    for bar in range(1, 15):
        name = BARS[bar - 1]
        hum.chord(bs(bar), T.tones(name, 40, 55)[:3], 12.5, vel=0.4 if bar not in (13, 14) else 0.34)
        low.chord(bs(bar), [T.root_note(name, 28), T.fifth_note(name, 35)], 12.5, vel=0.36)
        if 7 <= bar <= 10:
            timp.add(bs(bar), T.root_note(name, 31) - 12 if T.root_note(name, 31) - 12 >= 29 else T.root_note(name, 29), 1.0, vel=0.3)
    return s
