"""the_downs: "The Shepherd's Road" (x1_downs, x1_loomhouse). G major, 6/8 (tracker quarter = 92, a dotted quarter is 61),
40 bars (78.3 s), loops. Open and unhurried.

A tin whistle and a fiddle over a drone (low strings on an open G and D fifth), a plucked bass on the two dotted-quarter
pulses of each bar and a light hand drum. The whistle opens with the name motif as a shepherd's call: G D E (bar 1), C
held (bar 2), and a second whistle far off (quiet, wide, wet) answers the fourth note an octave up, the way one shepherd
calls across a valley to another. The call comes back in A'' and, alone over the drone, twice in the coda.

Form
  A    1-8    G C C G Em C D G: the call, then the whistle's plain tune; drone, bass, drum
  A'   9-16   G C G Em C G D G: the fiddle takes the tune above, the whistle holds long notes under it
  B    17-24  C G Am Em C G D D7: the tune lifts into the upper octave, harp arpeggios, a soft string pad
  A''  25-32  the call and the tune again, the fiddle a third below the whistle
  C    33-40  G C G D G C D G: thin again; the call twice with its far answer, then a falling line home
"""
from tracker import Song
import e3_theme as T

A = ['G', 'C', 'C', 'G', 'Em', 'C', 'D', 'G']
A2 = ['G', 'C', 'G', 'Em', 'C', 'G', 'D', 'G']
B = ['C', 'G', 'Am', 'Em', 'C', 'G', 'D', 'D7']
CODA = ['G', 'C', 'G', 'D', 'G', 'C', 'D', 'G']
BARS = A + A2 + B + A + CODA
assert len(BARS) == 40

TUNE_A = ['g4/1 d5/1 e5/1', 'c5/1.5 r/1.5', 'e5/1.5 d5/0.5 c5/0.5 d5/0.5', 'b4/1.5 g4/1.5',
          'e5/1 g5/0.5 b5/0.5 a5/1', 'g5/1.5 e5/0.5 c5/0.5 e5/0.5', 'd5/1 e5/0.5 f#5/0.5 a5/1', 'g5/2 r/1']
FIDDLE_A2 = ['g5/1.5 d5/0.5 g5/0.5 b5/0.5', 'c6/1.5 b5/0.5 a5/0.5 g5/0.5', 'b5/1 a5/0.5 g5/0.5 d5/1', 'e5/1.5 g5/0.5 b5/1',
             'c6/1 b5/0.5 a5/0.5 g5/0.5 e5/0.5', 'd5/1.5 g5/0.5 b5/0.5 d6/0.5', 'c6/1 a5/0.5 f#5/0.5 a5/1', 'g5/3']
WHISTLE_A2 = ['g4/3', 'g4/3', 'b4/3', 'g4/3', 'g4/3', 'b4/3', 'a4/3', 'b4/3']
TUNE_B = ['e6/1.5 d6/0.5 c6/1', 'b5/1 d6/1 g6/1', 'a5/1.5 c6/0.5 e6/1', 'd6/1 b5/1 g5/1',
          'c6/1.5 e6/1.5', 'd6/1 b5/0.5 g5/0.5 d6/1', 'f#6/1.5 e6/0.5 d6/1', 'c6/1.5 a5/1.5']
FIDDLE_A3 = ['e4/1 b4/1 c5/1', 'a4/1.5 r/1.5', 'c5/1.5 b4/0.5 a4/0.5 b4/0.5', 'g4/1.5 d4/1.5',
             'c5/1 e5/0.5 g5/0.5 f#5/1', 'e5/1.5 c5/0.5 g4/0.5 c5/0.5', 'a4/1 c5/0.5 d5/0.5 f#5/1', 'e5/2 r/1']
CODA_FALL = ['g5/3', 'e5/1.5 g5/1.5', 'd5/3', 'b4/1.5 d5/1.5']


def build():
    s = Song('the_downs', bpm=92, beats_per_bar=3, bars=40, key='G major', title="The Shepherd's Road",
             reverb_room=0.8, reverb_damp=0.4, reverb_len=3.0, reverb_level=-8.5,
             delay_beats=(1.5, 1.0), delay_feedback=0.28, delay_level=-16.0, target_lufs=-16.0, true_peak_trim=True,
             intended_chords=BARS)
    bs = s.bar_start

    whistle = s.track('tin whistle', 'tinwhistle', volume=-8.0, pan=-0.1, reverb=0.35, delay=0.15, role='melody', vel=0.64, gate=0.95)
    far = s.track('far whistle', 'tinwhistle', volume=-6.0, pan=0.55, reverb=0.9, delay=0.5, role='melody', vel=0.36, gate=0.95,
                  lowpass=3200)
    fiddle = s.track('fiddle', 'fiddle', volume=-8.0, pan=0.2, reverb=0.35, role='melody', vel=0.66, gate=0.95)
    drone = s.track('drone', 'strings_low', volume=-16.0, reverb=0.4, role='pad', vel=0.42, gate=1.0, width=0.7)
    pad = s.track('strings', 'strings', volume=-20.0, reverb=0.45, role='pad', vel=0.38, gate=1.0, width=0.9)
    bass = s.track('plucked bass', 'pizz', volume=-6.0, pan=-0.1, reverb=0.2, role='bass', vel=0.55, humanize_ms=4)
    drum = s.track('hand drum', 'framedrum', volume=-8.0, reverb=0.3, role='perc', vel=0.5, humanize_ms=5)
    harp = s.track('harp', 'harp', volume=-4.0, pan=-0.35, reverb=0.4, role='arp', vel=0.46, humanize_ms=6, vel_jitter=0.04)

    # ---- melodies ----------------------------------------------------------------------------------------------------
    def tune(track, bar0, pats, vel):
        for i, p in enumerate(pats):
            track.seq(bar=bar0 + i, pattern=p, vel=vel)

    tune(whistle, 1, TUNE_A, 0.66)
    far.add(bs(2) + 1.5, 'c6', 1.5, vel=0.4)                                   # the second whistle answers the fourth note
    tune(fiddle, 9, FIDDLE_A2, 0.68)
    tune(whistle, 9, WHISTLE_A2, 0.4)
    tune(whistle, 17, TUNE_B, 0.7)
    tune(whistle, 25, TUNE_A, 0.68)
    far.add(bs(26) + 1.5, 'c6', 1.5, vel=0.4)
    tune(fiddle, 25, FIDDLE_A3, 0.56)
    # coda: the call twice, alone, each answered from far off; then a falling line home
    for bar in (33, 35):
        whistle.seq(bar=bar, pattern='g4/1 d5/1 e5/1', vel=0.58 - 0.04 * (bar - 33) / 2)
        whistle.seq(bar=bar + 1, pattern='c5/1.5', vel=0.52)
        far.add(bs(bar + 1) + 1.5, 'c6', 1.5, vel=0.34)
    for i, p in enumerate(CODA_FALL):
        whistle.seq(bar=37 + i, pattern=p, vel=0.5 - 0.04 * i)
    fiddle.seq(bar=37, pattern='d5/3 | b4/3 | a4/3 | g4/3', vel=0.4)

    # ---- the drone, bass, drum and harmony ------------------------------------------------------------------------------
    for bar in range(1, 41):
        name = BARS[bar - 1]
        drone.chord(bs(bar), ['g2', 'd3'] if bar < 33 or bar > 36 else ['g2', 'd3'], 3.0, vel=0.42 if bar < 33 else 0.34)
        if 9 <= bar <= 32 or bar >= 37:
            pad.chord(bs(bar), T.tones(name, 55, 70)[:3], 3.0, vel=0.34 if bar < 17 else 0.42)
        r = T.root_note(name, 36)
        bass.add(bs(bar), r, 0.5, vel=0.6)
        bass.add(bs(bar) + 1.5, T.fifth_note(name, 43), 0.5, vel=0.46)
        if 5 <= bar <= 32 or bar >= 37:
            drum.add(bs(bar), 'a2', 0.5, vel=0.46)
            drum.add(bs(bar) + 1.0, 'e3', 0.25, vel=0.2)
            drum.add(bs(bar) + 1.5, 'c3', 0.5, vel=0.34)
            drum.add(bs(bar) + 2.5, 'e3', 0.25, vel=0.2)
        if 17 <= bar <= 24:
            t = T.tones(name, 50, 76)
            fig = [t[0], t[1], t[2], t[3] if len(t) > 3 else t[1], t[2], t[1]]
            for i, p in enumerate(fig):
                harp.add(bs(bar) + 0.5 * i, p, 0.5, vel=0.4 + (0.07 if i % 3 == 0 else 0.0), gate=1.6)
    return s
