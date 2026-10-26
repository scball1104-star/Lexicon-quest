"""larchhill: "Larchhill" (x1_larchhill). C Mixolydian, 84 BPM, 3/4, 42 bars (90.0 s), loops.

Sunny, busy and a little drowsy. A clarinet and an accordion over a plucked bass and a hand-pumped drone that hums like a
hive: the accordion holds an open C and G (the reeds a few cents apart, so it beats) and swells on every other bar, a waltz
oom-pah-pah of reed chords on beats 2 and 3 in the bright sections, a light shaker and a soft hand drum. The seventh is a
B flat all the way (Mixolydian), so every phrase leans back toward home.

The clarinet plays the name motif, C G A F (C5 G5 A5 F5, scale degrees 1 5 6 4), at the start of A and A'. The fourth
note, F, is answered by the accordion: its drone moves from C and G to F and C for a bar, the whole hive leaning on the
fourth, and settles back.

Form
  I    1-2    C: the drone and the plucked bass alone
  A    3-10   C F C Bb F C Gm C: the clarinet states the motif, the accordion answers on the F; drone, bass, drum
  B    11-18  F C Bb F Dm Gm C C: busier clarinet runs, the accordion's waltz chords, shaker
  A'   19-26  the motif again, the accordion takes the tune an octave down with the clarinet above it
  B'   27-34  F C Bb F Dm Gm C C: the accordion leads, the clarinet in thirds
  D    35-42  C F C G C F Gm C: drowsy, the clarinet low and slow, the chords drop away, the motif once more, quiet
"""
from tracker import Song
import synth
import e3_theme as T

A = ['C', 'F', 'C', 'Bb', 'F', 'C', 'Gm', 'C']
B = ['F', 'C', 'Bb', 'F', 'Dm', 'Gm', 'C', 'C']
D = ['C', 'F', 'C', 'G', 'C', 'F', 'Gm', 'C']
BARS = ['C', 'C'] + A + B + A + B + D
assert len(BARS) == 42

TUNE_A = ['c5/1 g5/1 a5/1', 'f5/2 r/1', 'e5/1 g5/1 c6/1', 'bb5/2 g5/1', 'a5/1 c6/1 a5/1', 'g5/1.5 e5/0.5 g5/1',
          'd5/1 f5/1 bb4/1', 'c5/3']
TUNE_B = ['a5/0.5 c6/0.5 f6/1 e6/1', 'g5/0.5 c6/0.5 e6/1 d6/1', 'd6/0.5 f6/0.5 bb5/1 a5/1', 'a5/0.5 c6/0.5 f6/1 c6/1',
          'f5/0.5 a5/0.5 d6/1 c6/1', 'bb5/0.5 d6/0.5 g6/1 f6/1', 'e6/1 g6/0.5 e6/0.5 c6/1', 'c6/2 r/1']
TUNE_D = ['g4/3', 'a4/2 c5/1', 'g4/3', 'b4/2 d5/1', 'e5/3', 'f5/2 a5/1', 'g5/2 bb4/1', 'c5/3']


def build():
    s = Song('larchhill', bpm=84, beats_per_bar=3, bars=42, key='C mixolydian', title='Larchhill',
             reverb_room=0.7, reverb_damp=0.45, reverb_len=2.2, reverb_level=-9.5,
             delay_beats=(1.5, 1.0), delay_feedback=0.25, delay_level=-19.0, target_lufs=-16.0, true_peak_trim=True,
             intended_chords=BARS)
    bs = s.bar_start

    clar = s.track('clarinet', 'clarinet', volume=-12.0, pan=-0.15, reverb=0.35, delay=0.1, role='melody', vel=0.62, gate=0.95)
    acc = s.track('accordion', 'accordion', volume=-3.0, pan=0.25, reverb=0.3, role='melody', vel=0.56, gate=0.97)
    chords = s.track('reed chords', 'accordion', volume=-8.0, pan=0.1, reverb=0.3, role='pad', vel=0.4, gate=0.6)
    drone = s.track('hive drone', synth.Accordion(beat_cents=14.0), volume=-9.0, pan=0.0, reverb=0.4, role='pad', vel=0.4, gate=1.0)
    bass = s.track('plucked bass', 'pizz', volume=-2.0, pan=-0.1, reverb=0.2, role='bass', vel=0.55, humanize_ms=4)
    drum = s.track('hand drum', 'framedrum', volume=-3.0, reverb=0.3, role='perc', vel=0.4, humanize_ms=5)
    shaker = s.track('shaker', 'shaker', volume=-1.0, pan=0.3, reverb=0.2, role='perc', pitched=False, vel=0.4, humanize_ms=4)

    def tune(track, bar0, pats, vel):
        for i, p in enumerate(pats):
            track.seq(bar=bar0 + i, pattern=p, vel=vel)

    # ---- melodies ------------------------------------------------------------------------------------------------------
    tune(clar, 3, TUNE_A, 0.66)                                  # the motif C G A, F, in bars 3-4
    tune(clar, 11, TUNE_B, 0.7)
    tune(clar, 19, TUNE_A, 0.66)
    tune(acc, 19, [p.replace('5', '4').replace('6', '5') for p in TUNE_A], 0.5)
    tune(acc, 27, TUNE_B, 0.62)
    tune(clar, 27, [p.replace('5', '4').replace('6', '5') for p in TUNE_B], 0.5)
    tune(clar, 35, TUNE_D, 0.5)
    clar.seq(bar=41, pattern='c5/1 g5/1 a5/1', vel=0.4)          # the motif once more, quiet (the F comes in bar 42's drone)
    clar.seq(bar=42, pattern='f5/3', vel=0.38)

    # ---- the hive: drone, answer on the fourth note, bass, waltz chords -----------------------------------------------
    answer_bars = {4, 22}                                         # the bar after the motif: the drone leans on F and C
    for bar in range(1, 43):
        name = BARS[bar - 1]
        low_pair = ['f3', 'c4'] if (bar in answer_bars or bar == 42) else ['c3', 'g3']
        swell = 0.46 if bar % 2 else 0.38
        drone.chord(bs(bar), low_pair, 3.0, vel=swell)
        if bar in answer_bars or bar == 42:
            acc.add(bs(bar) + 0.0, 'f5' if bar != 42 else 'f4', 3.0, vel=0.5)   # the accordion answers on the fourth note
        r = T.root_note(name, 36)
        bass.add(bs(bar), r, 0.5, vel=0.6)
        bass.add(bs(bar) + 1.5, T.fifth_note(name, 43), 0.5, vel=0.42)
        if 3 <= bar <= 34 or 37 <= bar <= 41:
            drum.add(bs(bar), 'a2', 0.5, vel=0.34)
        if bar >= 11 and bar <= 34:
            for beat in (1.0, 2.0):
                chords.chord(bs(bar) + beat, T.tones(name, 55, 68)[:3], 1.0, vel=0.34, gate=0.55)
            for i, v in enumerate((0.42, 0.2, 0.3, 0.2, 0.34, 0.2)):
                shaker.add(bs(bar) + 0.5 * i, 'c4', 0.25, vel=v)
    return s
