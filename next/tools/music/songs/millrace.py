"""millrace: "The Millrace" (x1_millrace, x1_mill). A major, 100 BPM, 6/8 (tracker quarter = 100, three to a bar),
44 bars (79.2 s), loops. One loop only: there is no second section for after `mill_turning`.

Warm and busy. The waterwheel is the ostinato: a wooden clack on the paddles (three clacks to a bar, the last one a
syncopation), a soft stir of brush for the water and a deep drum on the first pulse. An accordion carries the tune, a
strummed guitar-like harp keeps the chords, a fiddle takes the bridge, a tin whistle joins the last verse.

This is the one place in the valley where a name is kept, so the accordion plays the name motif COMPLETE and plain, A E F# D
(A4 E5 F#5 D5, scale degrees 1 5 6 4), as the first bar of the tune and again at the start of A'' and the coda. Nothing
interrupts it and no instrument takes the fourth note away.

Form
  I    1-4    A D A E: the wheel alone, then the strum
  A    5-12   A D A E A D E A: the accordion's tune, the motif complete in bars 5-6
  A'   13-20  the tune again, the fiddle above it
  B    21-28  F#m D A E F#m Bm E E: the bridge, the fiddle leads, the harp climbs
  A''  29-36  the tune with the tin whistle; the motif complete in bars 29-30
  C    37-44  A D A E A D E A: the wheel and the strum thinning, the motif once more, the accordion alone at the last bar
"""
from tracker import Song
import e3_theme as T

I = ['A', 'D', 'A', 'E']
A = ['A', 'D', 'A', 'E', 'A', 'D', 'E', 'A']
B = ['F#m', 'D', 'A', 'E', 'F#m', 'Bm', 'E', 'E']
BARS = I + A + A + B + A + A
assert len(BARS) == 44

TUNE_A = ['a4/1 e5/1 f#5/1', 'd5/1.5 e5/0.5 f#5/1', 'e5/1 c#5/1 a4/1', 'b4/2 g#4/1', 'c#5/1 e5/1 a5/1',
          'f#5/1.5 a5/0.5 f#5/1', 'e5/1 g#5/1 b4/1', 'a4/3']
TUNE_B = ['f#5/1 a5/1 c#6/1', 'd6/1.5 c#6/0.5 a5/1', 'a5/1 c#6/1 e6/1', 'd6/1 b5/1 g#5/1',
          'f#5/1 a5/1 c#6/1', 'd6/1.5 b5/0.5 f#5/1', 'g#5/1 b5/1 e6/1', 'e6/2 r/1']


def build():
    s = Song('millrace', bpm=100, beats_per_bar=3, bars=44, key='A major', title='The Millrace',
             reverb_room=0.7, reverb_damp=0.5, reverb_len=2.0, reverb_level=-10.0,
             delay_beats=(1.5, 1.0), delay_feedback=0.22, delay_level=-20.0, target_lufs=-16.0, true_peak_trim=True,
             intended_chords=BARS)
    bs = s.bar_start

    acc = s.track('accordion', 'accordion', volume=-8.0, pan=0.2, reverb=0.3, role='melody', vel=0.6, gate=0.96)
    fid = s.track('fiddle', 'fiddle', volume=-7.0, pan=0.3, reverb=0.35, role='melody', vel=0.6, gate=0.95)
    wh = s.track('tin whistle', 'tinwhistle', volume=-11.0, pan=-0.3, reverb=0.4, role='melody', vel=0.5, gate=0.95)
    gtr = s.track('guitar', 'harp', volume=-7.0, pan=-0.3, reverb=0.3, role='arp', vel=0.5, strum_ms=18, humanize_ms=5)
    bass = s.track('bass', 'pizz', volume=-6.0, pan=-0.05, reverb=0.2, role='bass', vel=0.58, humanize_ms=4)
    pad = s.track('strings', 'strings', volume=-16.0, reverb=0.4, role='pad', vel=0.36, gate=1.0, width=0.9)
    clack = s.track('paddle clack', 'woodblock', volume=-5.0, pan=0.0, reverb=0.35, role='perc', vel=0.5, humanize_ms=4)
    wash = s.track('water', 'brush', volume=-2.0, pan=-0.2, reverb=0.35, role='perc', pitched=False, vel=0.4)
    deep = s.track('wheel drum', 'framedrum', volume=-3.0, reverb=0.3, role='perc', vel=0.45, humanize_ms=4)

    def tune(track, bar0, pats, vel):
        for i, p in enumerate(pats):
            track.seq(bar=bar0 + i, pattern=p, vel=vel)

    # ---- the tune: the accordion carries it, the motif complete in the first bar -----------------------------------------
    tune(acc, 5, TUNE_A, 0.64)
    tune(acc, 13, TUNE_A, 0.62)
    tune(fid, 13, ['a5/3', 'a5/3', 'c#6/3', 'b5/3', 'e6/3', 'd6/3', 'e6/3', 'a5/3'], 0.46)
    tune(fid, 21, TUNE_B, 0.68)
    tune(acc, 21, ['a4/3', 'a4/3', 'a4/3', 'g#4/3', 'a4/3', 'b4/3', 'g#4/3', 'e4/3'], 0.46)
    tune(acc, 29, TUNE_A, 0.62)
    tune(wh, 29, ['a5/3', 'a5/3', 'c#6/3', 'b5/3', 'e6/3', 'd6/3', 'e6/3', 'a5/3'], 0.5)
    tune(acc, 37, TUNE_A[:4], 0.5)
    wh.seq(bar=37, pattern='e5/3 | d5/3', vel=0.3)
    acc.seq(bar=43, pattern='e5/3 | a4/3', vel=0.34)
    # the motif once more, plain, as the wheel slows (bars 41-42 repeat the first bar of the tune)
    acc.seq(bar=41, pattern='a4/1 e5/1 f#5/1 | d5/3', vel=0.52)

    # ---- the wheel -------------------------------------------------------------------------------------------------------
    for bar in range(1, 45):
        name = BARS[bar - 1]
        thin = bar >= 41
        # paddles: clacks on the first pulse, the third eighth and the last eighth (syncopated)
        for beat, v in ((0.0, 0.62), (1.0, 0.36), (2.5, 0.44)):
            clack.add(bs(bar) + beat, 'e5' if beat == 0.0 else 'b4', 0.25, vel=v * (0.6 if thin else 1.0))
        wash.add(bs(bar), 'c4', 0.5, vel=0.34)
        wash.add(bs(bar) + 1.5, 'c4', 0.5, vel=0.28)
        deep.add(bs(bar), 'a2', 0.5, vel=0.46 if not thin else 0.3)
        if bar >= 5 and not (bar >= 43):
            r = T.root_note(name, 33)
            bass.add(bs(bar), r, 0.5, vel=0.6)
            bass.add(bs(bar) + 1.5, T.fifth_note(name, 40), 0.5, vel=0.46)
        if bar >= 3 and bar <= 40:
            # strum: down on the pulse, up on the third eighth
            gtr.chord(bs(bar), T.tones(name, 52, 68)[:4], 1.0, vel=0.44)
            gtr.chord(bs(bar) + 1.5, T.tones(name, 55, 70)[:3], 0.5, vel=0.34)
            gtr.chord(bs(bar) + 2.5, T.tones(name, 55, 70)[:3], 0.5, vel=0.28)
        if 13 <= bar <= 36:
            pad.chord(bs(bar), T.tones(name, 57, 72)[:3], 3.0, vel=0.34)
    return s
