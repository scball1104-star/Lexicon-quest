"""high_moor: "The High Moor" (x1_highmoor). D Dorian, 76 BPM, 4/4, 28 bars (88.4 s), loops.

Wide wind. A D pedal (bowed bass and low strings) that never moves under modal chords, a hammered dulcimer playing long
notes, one distant horn, breaths of wind (band noise, the pitch moves the band) and a very soft timpani at the start of each
section. Nothing is in a hurry.

The name motif is stated in long notes by the dulcimer, one note a bar: D (bar 1), A (bar 2), B (bar 3), the B the Dorian
sixth over a minor chord. The horn, far off, lands the fourth note (G) in bar 4. That four-bar statement opens the track
and returns in bars 21-24.

Form
  A    1-4    Dm G/D Dm C/D: the motif, a bar a note, the horn lands G
  B    5-12   Dm C/D G/D Dm Am/D C/D G/D Dm: the long modal theme in the dulcimer (half notes), strings holding under it
  C    13-20  F C G Dm F Am Em G (all over the D pedal): the horn takes the theme's opening high, choir joins, the wind rises
  A'   21-28  the motif again (21-24), then Dm G/D Dm C/D drifting, a falling dulcimer arpeggio, the pedal alone at the end
"""
from tracker import Song
import e3_theme as T

A = ['Dm', 'G/D', 'Dm', 'C/D']
B = ['Dm', 'C/D', 'G/D', 'Dm', 'Am/D', 'C/D', 'G/D', 'Dm']
C = ['F', 'C', 'G', 'Dm', 'F', 'Am', 'Em', 'G']
BARS = A + B + C + A + A
assert len(BARS) == 28

THEME = ['d5/2 f5/1 e5/1', 'g5/3 e5/1', 'd5/2 b4/2', 'a4/4', 'a4/2 c5/1 e5/1', 'd5/3 c5/1', 'b4/2 g4/2', 'd5/4']
HORN_C = ['d5/2 f5/1 e5/1', 'g5/4', 'a5/2 g5/2', 'f5/4', 'd5/2 f5/1 e5/1', 'a5/4', 'g5/2 e5/2', 'd5/4']


def chord_tones(name, lo, hi):
    return T.tones(name.split('/')[0], lo, hi)


def build():
    s = Song('high_moor', bpm=76, beats_per_bar=4, bars=28, key='D dorian', title='The High Moor',
             reverb_room=0.9, reverb_damp=0.35, reverb_len=4.6, reverb_level=-6.5,
             delay_beats=(1.5, 1.0), delay_feedback=0.32, delay_level=-15.0, target_lufs=-16.0, true_peak_trim=True,
             intended_chords=BARS)
    bs = s.bar_start

    dulc = s.track('dulcimer', 'dulcimer', volume=-3.0, pan=0.12, reverb=0.45, delay=0.25, role='melody', vel=0.64, gate=1.0, humanize_ms=6)
    horn = s.track('distant horn', 'horn', volume=-16.0, pan=-0.35, reverb=0.9, delay=0.3, role='melody', vel=0.5, gate=1.0, lowpass=2600)
    low = s.track('low strings', 'strings_low', volume=-13.0, reverb=0.45, role='pad', vel=0.42, gate=1.0, width=0.8)
    mid = s.track('strings', 'strings', volume=-13.0, reverb=0.5, role='pad', vel=0.36, gate=1.0, width=1.0)
    ped = s.track('pedal', 'bowbass', volume=-11.0, reverb=0.25, role='bass', vel=0.42, gate=1.0)
    choir = s.track('choir', 'choir', volume=-12.0, reverb=0.6, role='pad', vel=0.34, gate=1.0)
    wind = s.track('wind', 'steam', volume=-9.0, pan=0.0, reverb=0.7, role='perc', pitched=True, vel=0.3, gate=1.0, width=1.0)
    timp = s.track('timpani', 'lowdrum', volume=-6.0, reverb=0.5, role='perc', vel=0.3)

    # ---- the motif, a bar a note, and the horn that lands the fourth ----------------------------------------------------
    for first in (1, 21):
        dulc.add(bs(first), 'd4', 4.0, vel=0.66)
        dulc.add(bs(first + 1), 'a4', 4.0, vel=0.66)
        dulc.add(bs(first + 2), 'b4', 4.0, vel=0.66)
        horn.add(bs(first + 3), 'g4', 4.0, vel=0.56)
        dulc.add(bs(first + 3), 'd3', 4.0, vel=0.4)
    # ---- the long modal theme ------------------------------------------------------------------------------------------
    for i, p in enumerate(THEME):
        dulc.seq(bar=5 + i, pattern=p, vel=0.64)
        if i in (3, 7):
            dulc.add(bs(5 + i), 'd4', 4.0, vel=0.38)
    for i, p in enumerate(HORN_C):
        horn.seq(bar=13 + i, pattern=p, vel=0.54)
    for i, p in enumerate(THEME):
        dulc.seq(bar=13 + i, pattern=p.replace('5', '4') if i % 2 == 0 else p, vel=0.4)
    # the drift at the end: a falling arpeggio, then the pedal alone
    for i, (bar, pat) in enumerate(((25, 'f5/2 d5/2'), (26, 'e5/2 b4/2'), (27, 'a4/2 f4/2'), (28, 'g4/4'))):
        dulc.seq(bar=bar, pattern=pat, vel=0.5 - 0.06 * i)

    # ---- the pedal and the harmony ------------------------------------------------------------------------------------
    for bar in range(1, 29):
        name = BARS[bar - 1]
        ped.add(bs(bar), 'd2', 4.0, vel=0.4)
        low.chord(bs(bar), ['d3', 'a3'] + chord_tones(name, 53, 62)[:1], 4.0, vel=0.4)
        if bar >= 5:
            mid.chord(bs(bar), chord_tones(name, 58, 74)[:3], 4.0, vel=0.32 if bar < 13 else 0.42)
        if 13 <= bar <= 20:
            choir.chord(bs(bar), chord_tones(name, 52, 66)[:3], 4.0, vel=0.34)
    for bar, d, v in ((1, 8.0, 0.22), (5, 8.0, 0.25), (9, 8.0, 0.25), (13, 8.0, 0.3), (17, 8.0, 0.34), (21, 8.0, 0.25), (25, 8.0, 0.2)):
        wind.add(bs(bar) + 1.0, 'd3', d, vel=v)
    for bar in (5, 13, 21):
        timp.add(bs(bar), 'd2', 1.0, vel=0.34)
    return s
