"""sorrow: "A Name Forgotten". A minor, 64 BPM, 4/4, 16 bars (about 60 s), loops.

Used when Bram cannot recall his father's name, and in the ending when the hero's own name stays faint.

Form
  A  bars 1-8    Solo oboe over soft strings and harp. The name motif appears on C (C5 G5 A5 F5):
                 inside A minor that is b3, b7, 1, b6, so the "lift" lands on F, the saddest note.
                 Lament bass A, G, F, E under phrase 1; phrase 2 ends on a modal G (bVII) half cadence.
  B  bars 9-16   The swell: harmony climbs F, G, Am, then F to E7/G# (rising bass) into the climax at bar 13
                 (oboe on E6, high strings in thirds below, harp in sixteenths), then settles over Dm7 and
                 E7sus4-E7 with the oboe silent, a slight ritardando, and the loop resolves back to Am.
"""
from tracker import Song

CHORDS = ['Am', 'Am/G', 'Fmaj7', 'E7sus4 E7', 'Am', 'C/G', 'Dm7', 'G',
          'Fmaj7', 'G', 'Am', 'F E7/G#', 'Am', 'Fmaj7', 'Dm7', 'E7sus4 E7']

HARP8 = {
    'Am': 'a2 e3 a3 c4 e4 c4 a3 e3', 'Am/G': 'g2 e3 a3 c4 e4 c4 a3 e3', 'Fmaj7': 'f2 c3 f3 a3 c4 e4 c4 a3',
    'E7sus4': 'e2 b2 e3 a3 b3 d4 b3 a3', 'E7': 'e2 b2 e3 g#3 b3 d4 b3 g#3', 'C/G': 'g2 e3 g3 c4 e4 g4 e4 c4',
    'Dm7': 'd3 a3 d4 f4 a4 c5 a4 f4', 'G': 'g2 d3 g3 b3 d4 g4 d4 b3', 'F': 'f2 c3 f3 a3 c4 f4 c4 a3',
    'E7/G#': 'g#2 e3 g#3 b3 d4 e4 d4 b3',
}
HARP16 = {
    'Am': 'a2 c3 e3 a3 c4 e4 a4 c5 e5 c5 a4 e4 c4 a3 e3 c3',
    'F': 'f2 a2 c3 f3 a3 c4 f4 a4 c5 a4 f4 c4 a3 f3 c3 a2',
    'Fmaj7': 'f2 a2 c3 e3 a3 c4 e4 a4 c5 a4 e4 c4 a3 e3 c3 a2',
    'G': 'g2 b2 d3 g3 b3 d4 g4 b4 d5 b4 g4 d4 b3 g3 d3 b2',
}


def harp_fig(tr, t, notes, step, vel, rise=0.1):
    n = len(notes)
    for i, p in enumerate(notes):
        # swell toward the middle of the figure
        shape = 1.0 - abs((i - (n - 1) / 2.0) / ((n - 1) / 2.0))
        tr.add(t + i * step, p, step, vel=vel + rise * shape, gate=1.8)


def build():
    s = Song('sorrow', bpm=[(0, 64), (60, 64), (64, 58)], beats_per_bar=4, bars=16, key='A minor',
             title='A Name Forgotten', reverb_room=0.84, reverb_damp=0.32, reverb_len=3.8, reverb_level=-7.5,
             delay_beats=(0.5, 0.75), delay_feedback=0.2, delay_level=-16.0, target_lufs=-16.0,
             intended_chords=CHORDS)

    oboe = s.track('oboe', 'oboe', volume=-9.5, pan=0.08, reverb=0.4, role='melody', vel=0.65, gate=0.92, humanize_ms=5)
    strings = s.track('strings', 'strings', volume=-16.5, reverb=0.45, role='pad', vel=0.5, gate=1.0, width=0.8)
    highstr = s.track('high strings', 'strings_high', volume=-17.5, reverb=0.5, role='pad', vel=0.55, gate=1.0, width=0.5)
    lowstr = s.track('low strings', 'strings_low', volume=-18.0, reverb=0.35, role='pad', vel=0.5, gate=1.0, width=0.5)
    harp = s.track('harp', 'harp', volume=-8.0, pan=-0.3, reverb=0.35, role='arp', humanize_ms=6, vel_jitter=0.04)
    bass = s.track('bass', 'bass', volume=-17.0, reverb=0.05, role='bass', vel=0.5, gate=0.98)
    celesta = s.track('celesta', 'celesta', volume=-12.0, pan=0.3, reverb=0.5, delay=0.3, role='arp', vel=0.4, humanize_ms=4)

    bs = s.bar_start

    # ---- oboe -------------------------------------------------------------------------------------
    oboe.seq(bar=1, pattern='r/1 c5/1.5 g5/0.5 a5/1 | f5/2 e5/1 d5/1 | c5/2 b4/1 c5/1 | b4/2.5 r/1.5', vel=0.62)
    oboe.seq(bar=5, pattern='r/0.5 c5/1 g5/0.5 a5/1 b5/1 | c6/2 g5/1 e5/1 | f5/1.5 e5/0.5 d5/1 c5/1 | d5/2.5 r/0.5 e5/0.5 f5/0.5', vel=0.66)
    oboe.seq(bar=9, pattern='g5/1.5 a5/0.5 f5/1 e5/1 | d5/1 e5/1 g5/1 a5/1 | b5/1.5 c6/0.5 b5/1 a5/0.5 r/0.5 | a5/1 b5/1 c6/1 d6/1', vel=0.72)
    oboe.seq(bar=13, pattern='@0.9 e6/2.5 d6/0.5 c6/1 | @0.8 b5/1.5 c6/0.5 a5/1 g5/0.5 r/0.5 | @0.6 a5/2 e5/2 | r/4')

    # ---- strings: mid voicings, climbing in B ---------------------------------------------------------
    mid = [(1, 8, ['e4', 'a4', 'c5']), (3, 4, ['f4', 'a4', 'c5']), (4, 2, ['e4', 'a4', 'b4']), (4.5, 2, ['e4', 'g#4', 'b4']),
           (5, 4, ['e4', 'a4', 'c5']), (6, 4, ['e4', 'g4', 'c5']), (7, 4, ['f4', 'a4', 'c5']), (8, 4, ['d4', 'g4', 'b4']),
           (9, 4, ['f4', 'a4', 'c5']), (10, 4, ['g4', 'b4', 'd5']), (11, 4, ['a4', 'c5', 'e5']), (12, 2, ['a4', 'c5', 'f5']),
           (12.5, 2, ['g#4', 'b4', 'd5']), (13, 4, ['a4', 'c5', 'e5']), (14, 4, ['a4', 'c5', 'f5']), (15, 4, ['f4', 'a4', 'c5']),
           (16, 2, ['e4', 'a4', 'b4']), (16.5, 2, ['e4', 'g#4', 'b4'])]
    for bar, beats, voicing in mid:
        t = bs(int(bar)) + (2 if bar % 1 else 0)
        v = 0.42
        bar = int(bar)
        if 9 <= bar <= 12:
            v = 0.5 + 0.06 * (bar - 9)
        elif 13 <= bar <= 14:
            v = 0.78 if bar == 13 else 0.68
        elif bar >= 15:
            v = 0.4
        strings.chord(t, voicing, beats, vel=v)

    # ---- high strings: thirds/sixths under the climax, a held line through the swell -------------------
    for bar, beats, p, v in [(9, 4, 'c5', 0.45), (10, 4, 'd5', 0.5), (11, 4, 'e5', 0.56), (12, 2, 'f5', 0.6), (13, 4, 'c6', 0.72),
                             (14, 4, 'g5', 0.62), (15, 4, 'f5', 0.45)]:
        highstr.add(bs(bar), p, beats, vel=v)
    highstr.add(bs(12) + 2, 'd5', 2, vel=0.62)

    # ---- low strings and bass: roots (lament bass in A) ------------------------------------------------
    roots = ['a2', 'g2', 'f2', 'e2', 'a2', 'g2', 'd2', 'g2', 'f2', 'g2', 'a2', 'f2', 'a2', 'f2', 'd2', 'e2']
    fifths = ['e3', 'e3', 'c3', 'b2', 'e3', 'e3', 'a2', 'd3', 'c3', 'd3', 'e3', 'c3', 'e3', 'c3', 'a2', 'b2']
    for i, (r, f) in enumerate(zip(roots, fifths)):
        bar = i + 1
        beats = 4
        v = 0.45 if bar < 9 else (0.55 if bar < 15 else 0.4)
        if bar == 12:
            beats = 2
        lowstr.chord(bs(bar), [r, f], beats, vel=v)
        bass.add(bs(bar), r, beats, vel=0.5 if bar != 13 else 0.6)
    lowstr.chord(bs(12) + 2, ['g#2', 'e3'], 2, vel=0.58)
    bass.add(bs(12) + 2, 'g#2', 2, vel=0.55)

    # ---- harp ------------------------------------------------------------------------------------------
    plan8 = {1: 'Am', 2: 'Am/G', 3: 'Fmaj7', 5: 'Am', 6: 'C/G', 7: 'Dm7', 8: 'G', 9: 'Fmaj7', 10: 'G', 15: 'Dm7'}
    for bar, fig in plan8.items():
        v = 0.48 if bar < 9 else (0.56 if bar < 15 else 0.42)
        harp_fig(harp, bs(bar), HARP8[fig].split(), 0.5, v)
    # bar 4 and 16: E7sus4 then E7, half bar each
    for bar, v in ((4, 0.46), (16, 0.4)):
        harp_fig(harp, bs(bar), HARP8['E7sus4'].split()[:4], 0.5, v)
        harp_fig(harp, bs(bar) + 2, HARP8['E7'].split()[:4], 0.5, v)
    # the climax bars in sixteenths
    harp_fig(harp, bs(11), HARP16['Am'].split(), 0.25, 0.58, rise=0.14)
    harp_fig(harp, bs(12), HARP16['F'].split()[:8], 0.25, 0.6, rise=0.1)
    harp_fig(harp, bs(12) + 2, 'g#2 b2 d3 e3 g#3 b3 d4 e4'.split(), 0.25, 0.62, rise=0.1)
    harp_fig(harp, bs(13), HARP16['Am'].split(), 0.25, 0.64, rise=0.14)
    harp_fig(harp, bs(14), HARP16['Fmaj7'].split(), 0.25, 0.56, rise=0.12)
    # bar 16 ends with a slow rise to hand into bar 1 (the loop resolves E7 -> Am)
    harp.seq(bar=16, beat=3, pattern='e3/0.5 g#3 b3 d4 e4/1 b4/1', vel=0.42)

    # ---- celesta glints (very soft) --------------------------------------------------------------------
    celesta.seq(bar=8, pattern='r/3 d6/0.5 g6/0.5', vel=0.35)
    celesta.seq(bar=14, pattern='r/2 c6/1 a5/1', vel=0.38)
    celesta.seq(bar=15, pattern='r/2 e6/1 c6/1', vel=0.34)
    return s
