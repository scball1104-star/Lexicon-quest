"""triumph: "Names Returned" (story resolution). D major, 100 BPM, 4/4, 20 bars plus a ring-out (about 52 s).

This one ends rather than loops (loopStart 0, loopEnd at the end of the ring-out).

Form
  intro  bars 1-4    D pedal: harp eighths, strings on D(add9), the horn plays the name motif in long notes
                     (D4 A4 B4 G4) over G/D and A7/D.
  A      bars 5-12   Horn theme built from the motif: D, A/C#, Bm7, G / D/F#, G, Asus4-A, A7. Glock answers.
  B      bars 13-20  Tutti: strings double the horn an octave up, glock on top, timpani. Bm7, Em7, A7, then the
                     borrowed Bb and C (bVI, bVII) lift into D, the motif in quarters over D and G/D, and a
                     glowing D(add9) finish with choir, harp glissando and a ritardando.
"""
from tracker import Song

CHORDS = ['D', 'D', 'G/D', 'A7/D', 'D', 'A/C#', 'Bm7', 'G', 'D/F#', 'G', 'Asus4 A', 'A7',
          'D', 'Bm7', 'Em7', 'A7', 'Bb', 'C', 'D G/D', 'D(add9)']

HARP8 = {
    'D': 'd3 a3 d4 f#4 a4 d5 a4 f#4', 'G/D': 'd3 b3 d4 g4 b4 d5 b4 g4', 'A7/D': 'd3 a3 c#4 e4 g4 a4 g4 e4',
    'A/C#': 'c#3 a3 c#4 e4 a4 e5 a4 e4', 'Bm7': 'b2 f#3 b3 d4 f#4 a4 f#4 d4', 'G': 'g2 d3 g3 b3 d4 g4 d4 b3',
    'D/F#': 'f#2 d3 f#3 a3 d4 f#4 d4 a3', 'Asus4': 'a2 e3 a3 d4 e4 a4 e4 d4', 'A': 'a2 e3 a3 c#4 e4 a4 e4 c#4',
    'A7': 'a2 e3 g3 a3 c#4 e4 g4 e4', 'Em7': 'e3 b3 d4 g4 b4 d5 b4 g4', 'Bb': 'bb2 f3 bb3 d4 f4 bb4 f4 d4',
    'C': 'c3 g3 c4 e4 g4 c5 g4 e4',
}


def harp_bar(tr, t, fig, vel, step=0.5, rise=0.12):
    notes = HARP8[fig].split()
    n = len(notes)
    for i, p in enumerate(notes):
        shape = 1.0 - abs((i - (n - 1) / 2.0) / ((n - 1) / 2.0))
        tr.add(t + i * step, p, step, vel=vel + rise * shape, gate=1.6)


def build():
    s = Song('triumph', bpm=[(0, 100), (72, 100), (76, 86), (80, 72)], beats_per_bar=4, bars=20, key='D major',
             title='Names Returned', reverb_room=0.8, reverb_damp=0.35, reverb_len=3.2, reverb_level=-8.0,
             delay_beats=(0.75, 0.5), delay_feedback=0.22, delay_level=-15.0, target_lufs=-16.0,
             ends=True, ring_out=3.0, intended_chords=CHORDS)

    horn = s.track('horn', 'horn', volume=-9.5, pan=-0.1, reverb=0.35, role='melody', vel=0.7, gate=0.92, humanize_ms=4)
    horn2 = s.track('horn 2', 'horn', volume=-13.0, pan=0.2, reverb=0.35, role='pad', vel=0.6, gate=0.95)
    strings = s.track('strings', 'strings', volume=-15.0, reverb=0.4, role='pad', vel=0.55, gate=1.0, width=0.85)
    highstr = s.track('high strings', 'strings_high', volume=-13.5, reverb=0.4, role='pad', vel=0.6, gate=0.95, width=0.6)
    lowstr = s.track('low strings', 'strings_low', volume=-16.0, reverb=0.3, role='pad', vel=0.55, gate=1.0, width=0.5)
    choir = s.track('choir', 'choir', volume=-17.0, reverb=0.5, role='pad', vel=0.6, gate=1.0)
    harp = s.track('harp', 'harp', volume=-8.5, pan=-0.35, reverb=0.3, role='arp', humanize_ms=5, vel_jitter=0.04)
    glock = s.track('glockenspiel', 'glock', volume=-14.5, pan=0.35, reverb=0.45, delay=0.25, role='arp', vel=0.6, gate=0.9, humanize_ms=4)
    bass = s.track('bass', 'bass', volume=-12.5, reverb=0.05, role='bass', vel=0.6, gate=0.9)
    timp = s.track('timpani', 'lowdrum', volume=-15.0, pan=0.1, reverb=0.35, role='perc', pitched=False, vel=0.8)

    bs = s.bar_start

    # ---- horn: the theme ---------------------------------------------------------------------------------
    horn.seq(bar=3, pattern='@0.5 d4/2 a4/2 | b4/2 g4/2')
    horn.seq(bar=5, pattern='@0.68 d4/1.5 a4/0.5 b4/1 g4/1 | f#4/2 e4/1 d4/1 | b4/1.5 a4/0.5 f#4/1 d4/1 | e4/2 f#4/0.5 r/0.5 g4/1')
    horn.seq(bar=9, pattern='@0.72 a4/1.5 b4/0.5 a4/1 f#4/1 | g4/2 b4/1 d5/1 | e5/1.5 d5/0.5 c#5/1 b4/1 | a4/3 r/1')
    horn.seq(bar=13, pattern='@0.85 d5/1.5 a5/0.5 b5/1 g5/1 | f#5/2 d5/1 b4/1 | g4/1 b4/1 e5/1 g5/1 | a5/2 g5/1 e5/0.5 r/0.5')
    horn.seq(bar=17, pattern='@0.88 f5/1.5 bb4/0.5 d5/1 f5/1 | g5/1.5 c5/0.5 e5/1 g5/1 | @0.92 d5/1 a5/1 b5/1 g5/1 | @0.95 a5/4.5')
    # second horn: harmony under the theme in B (thirds / sixths), and the final chord
    horn2.seq(bar=13, pattern='@0.55 f#4/2 d5/2 | d5/2 b4/1 g4/1 | e4/1 g4/1 b4/1 e5/1 | e5/2 e5/1 c#5/1')
    horn2.seq(bar=17, pattern='@0.6 d5/2 bb4/2 | e5/2 c5/2 | f#5/1 f#5/1 g5/1 e5/1 | @0.7 f#5/4.5')

    # ---- strings ---------------------------------------------------------------------------------------------
    mid = [(1, 8, ['d4', 'f#4', 'a4', 'e5']), (3, 4, ['d4', 'g4', 'b4']), (4, 4, ['c#4', 'g4', 'a4']),
           (5, 4, ['d4', 'f#4', 'a4']), (6, 4, ['c#4', 'e4', 'a4']), (7, 4, ['b3', 'd4', 'f#4']), (8, 4, ['b3', 'd4', 'g4']),
           (9, 4, ['a3', 'd4', 'f#4']), (10, 4, ['b3', 'd4', 'g4']), (11, 2, ['a3', 'd4', 'e4']), (11.5, 2, ['a3', 'c#4', 'e4']),
           (12, 4, ['a3', 'c#4', 'g4']),
           (13, 4, ['f#4', 'a4', 'd5']), (14, 4, ['d4', 'f#4', 'b4']), (15, 4, ['e4', 'g4', 'b4', 'd5']), (16, 4, ['e4', 'g4', 'a4', 'c#5']),
           (17, 4, ['d4', 'f4', 'bb4']), (18, 4, ['e4', 'g4', 'c5']), (19, 2, ['d4', 'f#4', 'a4']), (19.5, 2, ['d4', 'g4', 'b4']),
           (20, 4.5, ['d4', 'f#4', 'a4', 'e5'])]
    for bar, beats, voicing in mid:
        t = bs(int(bar)) + (2 if bar % 1 else 0)
        v = 0.45 if bar < 5 else (0.55 if bar < 13 else 0.7)
        if bar >= 19:
            v = 0.78
        strings.chord(t, voicing, beats, vel=v)
    # high strings: octave doubling of the theme in B plus a countermelody in A
    highstr.seq(bar=9, pattern='@0.5 f#5/4 | g5/4 | e5/2 c#5/2 | e5/4')
    highstr.seq(bar=13, pattern='@0.7 d6/1.5 a6/0.5 b6/1 g6/1 | f#6/2 d6/1 b5/1 | g5/1 b5/1 e6/1 g6/1 | a6/2 g6/1 e6/1')
    highstr.seq(bar=17, pattern='@0.75 f6/1.5 bb5/0.5 d6/1 f6/1 | g6/1.5 c6/0.5 e6/1 g6/1 | @0.8 d6/1 a6/1 b6/1 g6/1 | @0.85 a6/4.5')
    # low strings and bass
    roots = {1: ('d2', 'a2'), 3: ('d2', 'a2'), 4: ('d2', 'a2'), 5: ('d2', 'a2'), 6: ('c#2', 'a2'), 7: ('b1', 'f#2'), 8: ('g2', 'd3'),
             9: ('f#2', 'd3'), 10: ('g2', 'd3'), 11: ('a2', 'e3'), 12: ('a2', 'e3'), 13: ('d2', 'a2'), 14: ('b1', 'f#2'),
             15: ('e2', 'b2'), 16: ('a2', 'e3'), 17: ('bb1', 'f2'), 18: ('c2', 'g2'), 19: ('d2', 'a2'), 20: ('d2', 'a2')}
    for bar, (r, f) in roots.items():
        beats = 8 if bar == 1 else (4.5 if bar == 20 else 4)
        v = 0.45 if bar < 5 else (0.55 if bar < 13 else 0.68)
        lowstr.chord(bs(bar), [r, f], beats, vel=v)
    # bass: rhythmic from bar 5 (root on 1, root on 3, fifth on 4), whole notes in the intro and the end
    for bar, (r, f) in roots.items():
        if bar < 5:
            bass.add(bs(bar), r, 4, vel=0.5)
        elif bar < 19:
            bass.add(bs(bar), r, 2, vel=0.62)
            bass.add(bs(bar) + 2, r, 1, vel=0.56)
            bass.add(bs(bar) + 3, f, 1, vel=0.5)
        else:
            bass.add(bs(bar), r, 4 if bar == 19 else 4.5, vel=0.62)

    # ---- harp ------------------------------------------------------------------------------------------------
    plan = {1: 'D', 2: 'D', 3: 'G/D', 4: 'A7/D', 5: 'D', 6: 'A/C#', 7: 'Bm7', 8: 'G', 9: 'D/F#', 10: 'G',
            12: 'A7', 13: 'D', 14: 'Bm7', 15: 'Em7', 16: 'A7', 17: 'Bb', 18: 'C'}
    for bar, fig in plan.items():
        v = 0.5 if bar < 5 else (0.56 if bar < 13 else 0.62)
        harp_bar(harp, bs(bar), fig, v)
    harp_bar(harp, bs(11), 'Asus4', 0.56)
    # bar 19: quarters, bar 20: a glissando up two octaves into the final chord
    harp.seq(bar=19, pattern='d3/1 a3/1 d4/1 g4/1', vel=0.6)
    gliss = 'd3 e3 f#3 g3 a3 b3 c#4 d4 e4 f#4 g4 a4 b4 c#5 d5 e5 f#5 g5 a5 b5 c#6 d6'.split()
    for i, p in enumerate(gliss):
        harp.add(bs(20) - 1.0 + i * (1.0 / len(gliss)), p, 0.3, vel=0.5 + 0.3 * i / len(gliss), gate=2.0)
    harp.chord(bs(20) + 0.02, ['d4', 'a4', 'd5', 'f#5', 'a5'], 4.0, vel=0.7, gate=1.0)

    # ---- glockenspiel: answers and the final shimmer ---------------------------------------------------------
    glock.seq(bar=2, pattern='r/3 a5/0.5 d6/0.5', vel=0.5)
    glock.seq(bar=8, pattern='r/2 d6/0.5 a6/0.5 b6/0.5 g6/0.5', vel=0.55)
    glock.seq(bar=12, pattern='r/1 d6/0.75 a6/0.25 b6/1 g6/1', vel=0.6)
    glock.seq(bar=13, pattern='d6/1.5 a6/0.5 b6/1 g6/1 | f#6/2 r/2', vel=0.62)
    glock.seq(bar=16, pattern='r/2 e6/0.5 g6/0.5 a6/0.5 c#7/0.5', vel=0.6)
    glock.seq(bar=17, pattern='f6/1 r/1 bb6/1 r/1 | g6/1 r/1 c7/1 r/1', vel=0.6)
    glock.seq(bar=19, pattern='d6/1 a6/1 b6/1 g6/1', vel=0.7)
    glock.seq(bar=20, pattern='d6/0.5 f#6/0.5 a6/0.5 d7/0.5 a6/2.5', vel=0.72)

    # ---- choir on the finish -----------------------------------------------------------------------------------
    choir.chord(bs(17), ['d4', 'f4', 'bb4'], 4, vel=0.5)
    choir.chord(bs(18), ['e4', 'g4', 'c5'], 4, vel=0.55)
    choir.chord(bs(19), ['d4', 'f#4', 'a4'], 4, vel=0.6)
    choir.chord(bs(20), ['d4', 'f#4', 'a4', 'd5'], 4.5, vel=0.7)

    # ---- timpani -----------------------------------------------------------------------------------------------
    for bar, beat, v in [(5, 1, 0.8), (9, 1, 0.7), (13, 1, 0.9), (17, 1, 0.85), (18, 1, 0.85), (19, 1, 0.9), (20, 1, 1.0)]:
        timp.add(bs(bar) + beat - 1, 'd2', 0.5, vel=v)
    # rolls into bar 13 and bar 19
    for bar in (12, 18):
        for i in range(8):
            timp.add(bs(bar) + 2 + i * 0.25, 'd2', 0.25, vel=0.35 + 0.06 * i)
    return s
