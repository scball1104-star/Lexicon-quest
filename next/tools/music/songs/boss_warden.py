"""boss_warden: "The Cinder Warden" (the Warden's battle). C minor, 7/8 at 144 BPM (quarter-note beat, so a bar is 3.5
beats, grouped 2+2+3 eighths), 80 bars (116.7 s), loops.

Anvil strikes on the accents of the 2+2+3 drive, low brass and timpani under a choir. The name motif is in the brass
from the start (C G A F, the A natural a hot Dorian note in the minor key) and in the bell section it is joined by
the First Bell theme (e3_theme.py) quoted in minor, C G Ab F: the bell is the weapon's head, so every strike of the
quote lands on bell and anvil together, and the fourth note (F) is the bell's, as it is in `first_bell`. The last bar
before the loop turns to C major, the one bar of light.

Form (bar: harmony)
  I    1-4    Cm pedal: timpani and anvil on the accents, the choir enters on bar 3
  A    5-20   Cm, Ab, Fm, G7, Cm, Ab, Bb, G7 (2 bars each): brass states the motif every four bars, spiccato strings drive
  A2   21-36  Cm, Ab, Fm, G7, Cm, Db, Bb, G: choir and horns, the motif an octave higher
  B    37-52  the bell quote (Cm, Fm, Cm, Fm / Cm, Ab, Cm, Bb, each twice): bell and anvil together on every accent
  C    53-68  the motif climbs (Cm, Db, Eb, Fm), a G7 hemiola of three stabs per bar, then Ab, Bb, G7sus4
  R    69-79  the ostinato creeps back (Cm, Ab, Fm, G7 pedals), a timpani roll builds
  M    80     C major: one bar of light, the bell's C, then the loop
"""
from tracker import Song
import synth
import e3_theme as T
import lullaby as L

A_CH = ['Cm', 'Cm', 'Ab', 'Ab', 'Fm', 'Fm', 'G7', 'G7', 'Cm', 'Cm', 'Ab', 'Ab', 'Bb', 'Bb', 'G7', 'G7']
A2_CH = ['Cm', 'Cm', 'Ab', 'Ab', 'Fm', 'Fm', 'G7', 'G7', 'Cm', 'Cm', 'Db', 'Db', 'Bb', 'Bb', 'G', 'G']
QUOTE_1 = ['Cm', 'Fm', 'Cm', 'Fm']
QUOTE_2 = ['Cm', 'Ab', 'Cm', 'Bb']
B_CH = QUOTE_1 * 2 + QUOTE_2 * 2
C_CH = ['Cm', 'Cm', 'Db', 'Db', 'Eb', 'Eb', 'Fm', 'Fm', 'G7', 'G7', 'G7', 'G7', 'Ab', 'Ab', 'Bb', 'G7sus4']
R_CH = ['Cm', 'Cm', 'Ab', 'Ab', 'Fm', 'Fm', 'G7', 'G7', 'G7', 'G7', 'G7']
BARS = ['Cm'] * 4 + A_CH + A2_CH + B_CH + C_CH + R_CH + ['C']
assert len(BARS) == 80, len(BARS)

# the quote: First Bell theme degrees re-barred to 7/8 (beats sum to 3.5): (beat, degree, duration)
QUOTE = [
    [(0.0, 0, 1.0), (1.0, 4, 1.0), (2.0, 5, 1.0), (3.0, 3, 0.5)],     # the motif: the F is the bell's
    [(0.0, 4, 2.0), (2.0, 2, 1.0), (3.0, 1, 0.5)],
    [(0.0, 0, 1.5), (1.5, 1, 0.5), (2.0, 2, 0.5), (2.5, 4, 1.0)],
    [(0.0, 5, 2.0), (2.0, 4, 1.5)],
]
ACCENTS = (0.0, 1.0, 2.0)       # the 2 + 2 + 3 eighth grouping
SPAN = {0.0: 1.0, 1.0: 1.0, 2.0: 1.5}


def build():
    s = Song('boss_warden', bpm=144, beats_per_bar=3.5, bars=80, key='C minor', title='The Cinder Warden',
             reverb_room=0.82, reverb_damp=0.4, reverb_len=2.8, reverb_level=-9.5,
             delay_beats=(0.75, 0.5), delay_feedback=0.22, delay_level=-20.0, target_lufs=-16.0, true_peak_trim=True,
             intended_chords=BARS)
    bs = s.bar_start

    spicc = synth.StringsPad(attack=0.018, detune=6.0, dark=900.0, bright=2800.0, sub=0.15, release=0.14)
    spicc.name = 'strings_low'
    lows = s.track('spiccato strings', spicc, volume=-10.0, reverb=0.25, role='bass', vel=0.66, gate=0.7, width=0.6)
    brass = s.track('brass', 'brass', volume=-6.0, pan=0.1, reverb=0.32, role='melody', vel=0.78, gate=0.92)
    stab = s.track('brass stabs', 'brass', volume=-9.0, pan=-0.05, reverb=0.35, role='pad', vel=0.82, gate=0.5)
    pedal = s.track('low brass', 'brass', volume=-9.0, reverb=0.35, role='pad', vel=0.5, gate=1.0)
    horn = s.track('horn', 'horn', volume=-8.0, pan=-0.25, reverb=0.38, role='melody', vel=0.7, gate=0.95)
    hi = s.track('high strings', 'strings_high', volume=-10.0, pan=0.15, reverb=0.38, role='melody', vel=0.64, gate=0.98, width=0.6)
    choir = s.track('choir', 'choir', volume=-11.0, reverb=0.5, role='pad', vel=0.58, gate=1.0)
    timp = s.track('timpani', 'lowdrum', volume=-11.0, reverb=0.3, role='perc', vel=0.7)
    anvil = s.track('anvil', 'anvil', volume=-4.0, pan=-0.1, reverb=0.35, role='perc', pitched=False, vel=0.7)
    bell = s.track('bell', 'bell', volume=0.0, pan=0.0, reverb=0.5, role='perc', vel=0.8)
    bass = s.track('bass', 'bass', volume=-10.0, reverb=0.05, role='bass', vel=0.62, gate=0.8)

    def root_of(bar):
        return T.root_note(BARS[bar - 1], 36)

    # ---- the drive: strings and bass on the 2+2+3 accents, timpani and anvil -------------------------------------
    for bar in range(1, 81):
        name = BARS[bar - 1]
        r = root_of(bar)
        quiet_ostinato = 69 <= bar <= 76
        v = 0.66 if bar >= 5 else 0.52
        if quiet_ostinato:
            v = 0.5
        if bar == 80:
            continue
        if bar >= 3 and not (53 + 8 <= bar <= 68):
            for beat in ACCENTS:
                p = r if beat < 2.0 else (r + 7 if bar % 2 else r + 12)
                lows.add(bs(bar) + beat, p, SPAN[beat], vel=v + (0.08 if beat == 0.0 else 0.0))
        if bar >= 5 and not (53 + 8 <= bar <= 68):
            bass.add(bs(bar), r - 12 if r - 12 >= 28 else r, 2.0, vel=0.6)
            bass.add(bs(bar) + 2.0, r - 12 if r - 12 >= 28 else r, 1.5, vel=0.5)
        # timpani: beat 0 and the 3-group; anvil on every accent from A (strong ones from the bell section)
        timp_on = bar <= 4 or 5 <= bar <= 68 or bar >= 77
        if timp_on:
            timp.add(bs(bar), r if r <= 43 else r - 12, 1.0, vel=0.4 if bar == 1 else 0.72)
            timp.add(bs(bar) + 2.0, r if r <= 43 else r - 12, 1.0, vel=0.55)
        if bar <= 4:
            anvil.add(bs(bar), 'c5', 0.5, vel=0.35 if bar == 1 else 0.6)
            anvil.add(bs(bar) + 2.0, 'g4', 0.5, vel=0.5)
        elif bar < 37:
            anvil.add(bs(bar), 'c5', 0.5, vel=0.7)
            anvil.add(bs(bar) + 1.0, 'g4', 0.5, vel=0.42)
            anvil.add(bs(bar) + 2.0, 'c5', 0.5, vel=0.6)
        elif bar < 69:
            for beat, p, v2 in ((0.0, 'c5', 0.86), (1.0, 'g4', 0.5), (2.0, 'c5', 0.74)):
                anvil.add(bs(bar) + beat, p, 0.5, vel=v2)
        if bar <= 4 or bar >= 77:
            pedal.add(bs(bar), 'c2', 3.5, vel=0.5)
        elif bar < 69:
            pedal.add(bs(bar), T.root_note(name, 28), 3.5, vel=0.45)

    # ---- intro and A: the motif in the brass, a stab where the fourth note belongs ------------------------------------
    choir.chord(bs(3), ['c4', 'eb4', 'g4'], 7.0, vel=0.42)
    for bar in (5, 9, 13, 17):
        brass.seq(bar=bar, pattern='c4/1 g4/1 a4/1 f4/0.5', vel=0.84)
        stab.chord(bs(bar + 1) + 0.0, T.tones(BARS[bar], 52, 66)[:3], 0.5, vel=0.9)
    for bar in (21, 25, 29, 33):
        brass.seq(bar=bar, pattern='c5/1 g5/1 a5/1 f5/0.5', vel=0.86)
        horn.seq(bar=bar, pattern='c4/1 g4/1 a4/1 f4/0.5', vel=0.7)
        stab.chord(bs(bar + 1), T.tones(BARS[bar], 52, 66)[:3], 0.5, vel=0.92)
    for bar in range(7, 21, 2):
        hi.seq(bar=bar, pattern='g5/2 eb5/1 d5/0.5 | c5/3.5', vel=0.55)
    for bar in range(21, 37):
        choir.chord(bs(bar), T.tones(BARS[bar - 1], 55, 68)[:3], 3.5, vel=0.52 if bar < 29 else 0.62)
    for bar in range(21, 37, 4):
        hi.seq(bar=bar + 2, pattern='c6/2 bb5/1 g5/0.5 | ab5/2 g5/1.5', vel=0.6)

    # ---- B: the First Bell quote, minor, bell and anvil together ---------------------------------------------------------
    for k in range(4):                       # four statements of the four-bar quote
        for i, notes in enumerate(QUOTE):
            bar = 37 + 4 * k + i
            for beat, deg, dur in notes:
                if i == 0 and deg == 3:      # the fourth note: the bell
                    bell.add(bs(bar) + beat, 'f3', 3.0, vel=1.0)
                    anvil.add(bs(bar) + beat, 'f5', 0.5, vel=0.95)
                    continue
                if k < 2:
                    horn.add(bs(bar) + beat, L.pitch(60, 'aeolian', deg), dur, vel=0.74)
                    hi.add(bs(bar) + beat, L.pitch(72, 'aeolian', deg), dur, vel=0.62)
                else:
                    brass.add(bs(bar) + beat, L.pitch(60, 'aeolian', deg), dur, vel=0.86)
                    hi.add(bs(bar) + beat, L.pitch(72, 'aeolian', deg), dur, vel=0.7)
                    horn.add(bs(bar) + beat, L.pitch(48, 'aeolian', deg), dur, vel=0.7)
            bell.add(bs(bar), T.root_note(BARS[bar - 1], 43), 3.0, vel=0.85)
            choir.chord(bs(bar), T.tones(BARS[bar - 1], 55, 68)[:3], 3.5, vel=0.5 if k < 2 else 0.64)
            if k >= 2:
                stab.chord(bs(bar) + 2.0, T.tones(BARS[bar - 1], 52, 66)[:3], 0.5, vel=0.85)

    # ---- C: the motif climbs; the G7 hemiola; Ab, Bb, G7sus4 ------------------------------------------------------------
    for bar, notes in ((53, 'c4 g4 a4 f4'), (55, 'db4 ab4 bb4 gb4'), (57, 'eb4 bb4 c5 ab4'), (59, 'f4 c5 d5 bb4')):
        a, b, c, d = notes.split()
        brass.seq(bar=bar, pattern='%s/1 %s/1 %s/1 %s/0.5' % (a, b, c, d), vel=0.86)
        hi.seq(bar=bar, pattern='%s/1 %s/1 %s/1 %s/0.5' % tuple(n[:-1] + str(int(n[-1]) + 1) for n in (a, b, c, d)), vel=0.62)
        stab.chord(bs(bar + 1), T.tones(BARS[bar], 52, 66)[:3], 0.5, vel=0.95)
    for bar in range(61, 65):
        third = 3.5 / 3.0
        for k in range(3):    # hemiola: three stabs across the 7/8 bar
            stab.chord(bs(bar) + k * third, T.tones('G7', 50, 65)[:4], 0.45, vel=0.7 + 0.05 * (bar - 61))
        choir.chord(bs(bar), ['g3', 'b3', 'f4', 'ab4'], 3.5, vel=0.55 + 0.05 * (bar - 61))
        for i in range(14):
            timp.add(bs(bar) + 0.25 * i, 'g1', 0.25, vel=0.25 + 0.025 * (bar - 61) + 0.02 * (i % 2 == 0))
    brass.seq(bar=65, pattern='c4/1 g4/1 a4/1 f4/0.5', vel=0.96)
    horn.seq(bar=65, pattern='eb4/1 bb4/1 c5/1 ab4/0.5', vel=0.86)
    hi.seq(bar=65, pattern='c5/1 g5/1 a5/1 f5/0.5', vel=0.8)
    stab.chord(bs(66), T.tones('Ab', 52, 66)[:3], 0.5, vel=1.0)
    for bar in range(65, 69):
        choir.chord(bs(bar), T.tones(BARS[bar - 1], 55, 68)[:3], 3.5, vel=0.64)
        bell.add(bs(bar), T.root_note(BARS[bar - 1], 43), 3.0, vel=0.8)

    # ---- R: the ostinato creeps back, a timpani roll builds into the major bar --------------------------------------------
    hi.seq(bar=77, pattern='g4/3.5', vel=0.5)
    for bar in range(69, 77):
        choir.chord(bs(bar), T.tones(BARS[bar - 1], 55, 68)[:3], 3.5, vel=0.4 + 0.02 * (bar - 69))
    hi.seq(bar=71, pattern='c5/1 g5/1 ab5/1.5', vel=0.6)          # the motif in C minor, cut short: no fourth note
    hi.seq(bar=73, pattern='f5/1 c5/1 ab4/1.5', vel=0.64)
    for bar in range(77, 80):
        for k in range(3):
            stab.chord(bs(bar) + k * 3.5 / 3.0, T.tones('G7', 50, 65)[:4], 0.45, vel=0.72 + 0.07 * (bar - 77))
        choir.chord(bs(bar), ['g3', 'b3', 'd4', 'f4'], 3.5, vel=0.58 + 0.05 * (bar - 77))
        for i in range(14):
            timp.add(bs(bar) + 0.25 * i, 'g1', 0.25, vel=0.3 + 0.06 * (bar - 77) + 0.03 * (i % 2 == 0))
    # M: the last bar is C major: one bar of light, with the bell's C, then the loop
    horn.seq(bar=80, pattern='c5/1 g5/1 a5/1 f5/0.5', vel=0.76)
    hi.seq(bar=80, pattern='e6/3.5', vel=0.6)
    choir.chord(bs(80), ['c4', 'e4', 'g4'], 3.5, vel=0.6)
    bell.add(bs(80), 'c3', 3.5, vel=0.9)
    pedal.add(bs(80), 'c2', 3.5, vel=0.4)
    return s
