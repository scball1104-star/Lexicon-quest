"""ash_road: "The Old Sand Road" (sand_road). A minor warming to C major, 100 BPM, 4/4, 38 bars (91.2 s), loops.

A travel theme: a fiddle and a low whistle over a cart-wheel rhythm (a soft drum on beat 1 and the "and" of 2, a
shaker rolling in eighths, plucked root-and-fifth). The harmony starts ash-grey (thin low strings, no harp) and warms
to amber: from the B section the harp arpeggiates, then horn and glockenspiel join and the key turns to C major.

The whistle opens the road with the complete name motif in A (A E F# D, scale degrees 1 5 6 4 in A dorian), and again
as the first thing of A' (quiet) and, in C major, of B' (C G A F, the same four degrees warmed by the new key).

Form
  A    1-8    Am, Am, F, C, Am, G, F, E7: whistle states the motif and a plain tune, thin accompaniment
  A'   9-16   Am, F, C, G, Am, F, G, Am: fiddle takes the tune, the whistle shadows it; pizzicato bass
  B    17-24  C, G/B, Am, F, C, G, F, C: the fiddle's warm tune in the major, harp arpeggios, a horn pedal
  B'   25-32  C, Em, F, C/E, Dm7, G, C, G: whistle and fiddle trade phrases, glockenspiel glints
  T    33-38  Am, F, G, Am, F, E7: the dust again, the fiddle thins out; E7 turns back to Am
"""
from tracker import Song
import e3_theme as T

A = ['Am', 'Am', 'F', 'C', 'Am', 'G', 'F', 'E7']
A2 = ['Am', 'F', 'C', 'G', 'Am', 'F', 'G', 'Am']
B = ['C', 'G/B', 'Am', 'F', 'C', 'G', 'F', 'C']
B2 = ['C', 'Em', 'F', 'C/E', 'Dm7', 'G', 'C', 'G']
TT = ['Am', 'F', 'G', 'Am', 'F', 'E7']
BARS = A + A2 + B + B2 + TT
assert len(BARS) == 38

WHISTLE_A = ['a4/1 e5/1 f#5/1 d5/1', 'e5/4', 'c5/2 a4/1 c5/1', 'e5/2 g5/2', 'a4/1 e5/1 f#5/1 d5/1', 'd5/2 b4/1 g4/1',
             'a4/2 c5/2', 'b4/1 g#4/1 e4/2']
FIDDLE_A2 = ['e5/1.5 d5/0.5 c5/1 a4/1', 'a4/2 c5/1 f5/1', 'e5/2 g5/1 e5/1', 'd5/1.5 e5/0.5 d5/1 b4/1',
             'c5/1 e5/1 a5/2', 'a5/1.5 g5/0.5 f5/1 e5/1', 'd5/2 g5/2', 'e5/2 a4/2']
FIDDLE_B = ['e5/1 g5/1 c6/2', 'b5/1.5 a5/0.5 g5/2', 'a5/1 e5/1 c5/2', 'f5/2 a5/1 c6/1',
            'e6/2 d6/1 c6/1', 'b5/1.5 c6/0.5 d6/2', 'c6/1 a5/1 f5/2', 'e5/1 g5/1 c5/2']
WHISTLE_B2 = ['c5/1 g5/1 a5/1 f5/1', 'e5/2 g5/2', 'f5/2 a5/1 c6/1', 'g5/2 e5/2',
              'd5/1 f5/1 a5/2', 'b5/1.5 a5/0.5 g5/2', 'e5/2 c5/2', 'd5/2 g5/2']
FIDDLE_T = ['a5/2 e5/2', 'c5/2 a4/2', 'b4/2 d5/2', 'e5/2 c5/2', 'a4/4', 'g#4/2 b4/2']


def build():
    s = Song('ash_road', bpm=100, beats_per_bar=4, bars=38, key='A minor to C major', title='The Old Sand Road',
             reverb_room=0.76, reverb_damp=0.45, reverb_len=2.4, reverb_level=-9.0,
             delay_beats=(0.75, 0.5), delay_feedback=0.25, delay_level=-19.0, target_lufs=-16.0, true_peak_trim=True,
             intended_chords=BARS)
    bs = s.bar_start

    whistle = s.track('low whistle', 'whistle', volume=-9.0, pan=-0.15, reverb=0.4, delay=0.15, role='melody', vel=0.66, gate=0.95)
    fiddle = s.track('fiddle', 'fiddle', volume=-6.0, pan=0.2, reverb=0.35, role='melody', vel=0.68, gate=0.95)
    low = s.track('low strings', 'strings_low', volume=-17.0, reverb=0.4, role='pad', vel=0.46, gate=1.0, width=0.7)
    mid = s.track('strings', 'strings', volume=-19.0, reverb=0.4, role='pad', vel=0.42, gate=1.0, width=0.9)
    pizz = s.track('pizzicato', 'pizz', volume=-8.0, pan=-0.1, reverb=0.25, role='bass', vel=0.55, humanize_ms=4)
    bass = s.track('bass', 'bass', volume=-17.0, reverb=0.05, role='bass', vel=0.55, gate=0.8)
    drum = s.track('cart drum', 'lowdrum', volume=-10.0, reverb=0.25, role='perc', vel=0.32)
    shaker = s.track('shaker', 'shaker', volume=-5.0, pan=0.3, reverb=0.2, role='perc', pitched=False, vel=0.4, humanize_ms=4)
    brush = s.track('brush', 'brush', volume=-5.0, pan=-0.3, reverb=0.25, role='perc', pitched=False, vel=0.4)
    harp = s.track('harp', 'harp', volume=-6.0, pan=-0.35, reverb=0.4, role='arp', humanize_ms=6, vel_jitter=0.04, vel=0.5)
    horn = s.track('horn', 'horn', volume=-14.0, pan=-0.2, reverb=0.4, role='pad', vel=0.46, gate=1.0)
    glock = s.track('glockenspiel', 'glock', volume=-12.0, pan=0.35, reverb=0.4, delay=0.15, role='melody', vel=0.5, humanize_ms=3)

    # ---- melodies ------------------------------------------------------------------------------------------------
    for i, p in enumerate(WHISTLE_A):
        whistle.seq(bar=1 + i, pattern=p, vel=0.68)
    whistle.seq(bar=9, pattern='a4/1 e5/1 f#5/1 d5/1', vel=0.5)          # the motif again, quiet
    for i, p in enumerate(FIDDLE_A2):
        fiddle.seq(bar=9 + i, pattern=p, vel=0.7)
    for bar, notes in ((11, 'e4/4'), (12, 'g4/4'), (13, 'a4/4'), (14, 'f4/4'), (15, 'b4/4'), (16, 'c5/4')):
        whistle.seq(bar=bar, pattern=notes, vel=0.42)
    for i, p in enumerate(FIDDLE_B):
        fiddle.seq(bar=17 + i, pattern=p, vel=0.74)
    for bar, notes in ((17, 'c5/4'), (18, 'd5/4'), (19, 'e5/4'), (20, 'a4/4'), (21, 'g5/4'), (22, 'g5/4'), (23, 'a5/4'), (24, 'g5/4')):
        whistle.seq(bar=bar, pattern=notes, vel=0.45)
    whistle.seq(bar=17, pattern='c5/1 g5/1 a5/1 f5/1', vel=0.6)         # the motif in C major, as B begins
    for i, p in enumerate(WHISTLE_B2):
        whistle.seq(bar=25 + i, pattern=p, vel=0.72)
        if i % 2:
            fiddle.seq(bar=25 + i, pattern=p.replace('5', '4').replace('6', '5'), vel=0.6)
    for bar, notes in ((25, 'e5/4'), (27, 'a5/4'), (29, 'f5/4'), (31, 'g5/4')):
        fiddle.seq(bar=bar, pattern=notes, vel=0.55)
    for i, p in enumerate(FIDDLE_T):
        fiddle.seq(bar=33 + i, pattern=p, vel=0.6 - 0.04 * i)
    for bar, notes in ((33, 'e4/4'), (35, 'd4/4'), (36, 'c5/4')):
        whistle.seq(bar=bar, pattern=notes, vel=0.4)

    # ---- the cart wheel and the harmony ------------------------------------------------------------------------------
    for bar in range(1, 39):
        name = BARS[bar - 1]
        names = name.split()
        low.chord(bs(bar), T.tones(name, 43, 60)[:3], 4.0, vel=0.46)
        if bar >= 9:
            mid.chord(bs(bar), T.tones(name, 55, 70)[:3], 4.0, vel=0.38 if bar < 17 else 0.46)
        r = T.root_note(name, 33)
        f5 = T.fifth_note(name, 40)
        pizz.add(bs(bar), r, 0.5, vel=0.6)
        pizz.add(bs(bar) + 1, f5, 0.5, vel=0.42)
        pizz.add(bs(bar) + 2, r + 12 if r < 45 else r, 0.5, vel=0.5)
        pizz.add(bs(bar) + 3, f5, 0.5, vel=0.4)
        if bar >= 9:
            bass.add(bs(bar), r - 12 if r - 12 >= 28 else r, 1.5, vel=0.55)
            bass.add(bs(bar) + 2, r - 12 if r - 12 >= 28 else r, 1.5, vel=0.48)
        # the wheel: a soft drum on 1 and the "and" of 2, shaker in eighths, brush on 2 and 4
        drum.add(bs(bar), 'a1', 0.5, vel=0.34)
        drum.add(bs(bar) + 1.5, 'a1', 0.5, vel=0.26)
        for i, v in enumerate((0.55, 0.22, 0.32, 0.22, 0.5, 0.22, 0.32, 0.26)):
            shaker.add(bs(bar) + 0.5 * i, 'c4', 0.25, vel=v * (0.7 if bar < 9 else 1.0))
        if bar >= 5:
            brush.add(bs(bar) + 1, 'c4', 0.5, vel=0.34)
            brush.add(bs(bar) + 3, 'c4', 0.5, vel=0.34)
        # amber: harp arpeggios from B, horn pedal in B', glockenspiel glints in B'
        if 17 <= bar <= 32:
            t = T.tones(name, 52, 72)
            fig = [t[0], t[1], t[2], t[3] if len(t) > 3 else t[1], t[2], t[1], t[0], t[1]]
            for i, p in enumerate(fig):
                harp.add(bs(bar) + 0.5 * i, p, 0.5, vel=0.4 + (0.06 if i % 4 == 0 else 0.0), gate=1.6)
        if 25 <= bar <= 32:
            horn.chord(bs(bar), T.tones(name, 52, 66)[:2], 4.0, vel=0.42)
            glock.add(bs(bar) + 2, T.tones(name, 79, 96)[0], 1.0, vel=0.38)
            glock.add(bs(bar) + 3.5, T.tones(name, 84, 100)[1], 0.5, vel=0.3)
    return s
