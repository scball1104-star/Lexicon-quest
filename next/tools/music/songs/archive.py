"""archive: "The Rootbound Archive" (dungeon). D Dorian over a D pedal, 72 BPM, 4/4, 28 bars (93.3 s), loops.

Form
  A  bars 1-8    D pedal. Chromatic line cliche in the high strings (D, C#, C, B) while the music box
                 states the name motif (D6 A6 B6 G6) twice; harp eighths; celesta answers in bars 5-8.
  B  bars 9-16   The line continues down (A, Ab, G, F#, F) over bVI, bVI7 and the dominant, still on the
                 pedal; choir enters; the motif returns transposed to Bb with a dark Eb; a D major glimmer.
  C  bars 17-24  The bass finally moves: Dm, F/A, Gm, A7sus4-A7 / Dm, Bbmaj7, Gm6-Em7b5, A7b9.
                 Celesta sings an 8-bar melody built from the motif.
  A' bars 25-28  Pedal returns, motif restated, texture thins; bar 28 hands straight into bar 1.
"""
from tracker import Song

CHORDS = ['Dm', 'Dm', 'Dm(maj7)', 'Dm(maj7)', 'Dm7', 'Dm7', 'Dm6/G', 'Dm6/G',
          'Bbmaj7/D', 'Bbmaj7/D', 'Bb7/D', 'Bb7/D', 'A7sus4/D', 'A7/D', 'D', 'Dm',
          'Dm', 'F/A', 'Gm', 'A7sus4 A7', 'Dm', 'Bbmaj7', 'Gm6 Em7b5', 'A7b9',
          'Dm', 'Dm', 'Dm', 'Dm']

# harp figures: eight eighth notes per bar, low to high and back (pedal-friendly voicings)
HARP = {
    'Dm':      'd3 a3 d4 f4 a4 f4 d4 a3',
    'Dmmaj7':  'd3 a3 c#4 f4 a4 f4 c#4 a3',
    'Dm7':     'd3 a3 c4 f4 a4 f4 c4 a3',
    'Dm6':     'd3 g3 b3 d4 g4 d4 b3 g3',
    'Bbmaj7':  'd3 f3 bb3 d4 f4 a4 f4 d4',
    'Bb7':     'd3 f3 ab3 bb3 d4 f4 d4 bb3',
    'A7sus4':  'a2 e3 g3 a3 d4 e4 d4 a3',
    'A7':      'a2 e3 g3 a3 c#4 e4 c#4 a3',
    'D':       'd3 a3 d4 f#4 a4 f#4 d4 a3',
    'F/A':     'a2 c3 f3 a3 c4 f4 c4 a3',
    'Gm':      'g2 d3 g3 bb3 d4 g4 d4 bb3',
    'Gm6':     'g2 d3 e3 g3 bb3 e4 bb3 g3',
    'Em7b5':   'e3 g3 bb3 d4 g4 d4 bb3 g3',
    'A7b9':    'a2 e3 g3 bb3 c#4 e4 c#4 bb3',
}


def harp_eighths(tr, bar, fig, vel=0.55, rise=0.12):
    """Place a harp figure as eighths with a gentle swell toward the top of the arpeggio."""
    notes = HARP[fig].split()
    vels = [vel - rise * 0.5, vel - rise * 0.3, vel, vel + rise * 0.5, vel + rise, vel + rise * 0.5, vel, vel - rise * 0.3]
    t = tr.song.bar_start(bar)
    for i, (n, v) in enumerate(zip(notes, vels)):
        tr.add(t + i * 0.5, n, 0.5, vel=v, gate=1.6)


def harp_quarters(tr, bar, fig, vel=0.5):
    notes = HARP[fig].split()[::2]
    t = tr.song.bar_start(bar)
    for i, n in enumerate(notes):
        tr.add(t + i, n, 1.0, vel=vel + (0.06 if i == 2 else 0.0), gate=1.6)


def build():
    s = Song('archive', bpm=72, beats_per_bar=4, bars=28, key='D dorian', title='The Rootbound Archive',
             reverb_room=0.88, reverb_damp=0.35, reverb_len=4.5, reverb_level=-7.0,
             delay_beats=(0.75, 0.5), delay_feedback=0.3, delay_level=-12.0,
             target_lufs=-16.0, intended_chords=CHORDS)

    bass = s.track('bass', 'bass', volume=-13.5, pan=0.0, reverb=0.06, role='bass', vel=0.6, gate=0.98)
    lowstr = s.track('low strings', 'strings_low', volume=-17.0, reverb=0.4, role='pad', vel=0.6, gate=1.0, width=0.7)
    highstr = s.track('high strings', 'strings_high', volume=-18.5, reverb=0.45, role='pad', vel=0.5, gate=1.0, width=0.5)
    choir = s.track('choir', 'choir', volume=-17.5, reverb=0.55, role='pad', vel=0.55, gate=1.0)
    harp = s.track('harp', 'harp', volume=-7.5, pan=-0.35, reverb=0.35, delay=0.0, role='arp', humanize_ms=6, vel_jitter=0.04)
    musicbox = s.track('music box', 'musicbox', volume=-12.0, pan=0.3, reverb=0.5, delay=0.4, role='melody', vel=0.7, gate=0.95, humanize_ms=4)
    celesta = s.track('celesta', 'celesta', volume=-12.5, pan=0.12, reverb=0.45, delay=0.2, role='melody', vel=0.65, gate=0.9, humanize_ms=5)
    pizz = s.track('pizzicato', 'pizz', volume=-15.5, pan=0.25, reverb=0.3, role='perc', vel=0.45)
    creak = s.track('root creak', 'creak', volume=-8.5, pan=-0.15, reverb=0.3, role='perc', pitched=False)

    # ---- bass: the pedal, re-bowed every bar, moving only in section C -----------------------
    for bar in range(1, 17):
        bass.add(s.bar_start(bar), 'd2', 4.0, vel=0.62 if bar % 2 else 0.5)
    for bar, p in zip(range(17, 25), ['d2', 'a2', 'g2', 'a2', 'd2', 'bb1', 'g2', 'a2']):
        bass.add(s.bar_start(bar), p, 4.0, vel=0.62)
    bass.add(s.bar_start(23) + 2, 'e2', 2.0, vel=0.55)   # Gm6 -> Em7b5 in bar 23
    for bar in range(25, 29):
        bass.add(s.bar_start(bar), 'd2', 4.0, vel=0.6 if bar % 2 else 0.48)

    # ---- low strings: one voicing per two bars (pedal sections), per bar in C ------------------
    low_voicings = [
        (1, 8, ['d3', 'f3', 'a3']), (3, 8, ['d3', 'f3', 'a3']), (5, 8, ['d3', 'f3', 'c4']), (7, 8, ['d3', 'g3', 'b3']),
        (9, 8, ['d3', 'f3', 'bb3']), (11, 8, ['d3', 'f3', 'ab3']), (13, 4, ['a2', 'e3', 'g3']), (14, 4, ['a2', 'e3', 'g3']),
        (15, 4, ['d3', 'f#3', 'a3']), (16, 4, ['d3', 'f3', 'a3']),
        (17, 4, ['d3', 'f3', 'a3']), (18, 4, ['a2', 'c3', 'f3']), (19, 4, ['g2', 'd3', 'bb3']), (20, 4, ['a2', 'e3', 'g3']),
        (21, 4, ['d3', 'f3', 'a3']), (22, 4, ['bb2', 'f3', 'a3']), (23, 2, ['g2', 'e3', 'bb3']), (24, 4, ['a2', 'e3', 'g3']),
        (25, 8, ['d3', 'f3', 'a3']), (27, 8, ['d3', 'f3', 'a3']),
    ]
    for bar, beats, voicing in low_voicings:
        v = 0.62 if 17 <= bar <= 24 else 0.55
        lowstr.chord(s.bar_start(bar), voicing, beats, vel=v)
    lowstr.chord(s.bar_start(23) + 2, ['e3', 'g3', 'bb3'], 2, vel=0.6)

    # ---- high strings: the chromatic line over the pedal, then chord tones in C -----------------
    line = [(1, 8, 'd5'), (3, 8, 'c#5'), (5, 8, 'c5'), (7, 8, 'b4'), (9, 8, 'a4'), (11, 8, 'ab4'), (13, 8, 'g4'),
            (15, 4, 'f#4'), (16, 4, 'f4')]
    for bar, beats, p in line:
        highstr.add(s.bar_start(bar), p, beats, vel=0.5 + (0.08 if bar >= 9 else 0.0))
    c_line = [(17, 8, 'a4'), (19, 4, 'g4'), (20, 2, 'd5'), (21, 8, 'd5'), (23, 4, 'd5'), (24, 4, 'c#5'),
              (25, 16, 'd5')]
    for bar, beats, p in c_line:
        highstr.add(s.bar_start(bar), p, beats, vel=0.58)
    highstr.add(s.bar_start(20) + 2, 'c#5', 2, vel=0.6)

    # ---- choir: section B and the end of C ---------------------------------------------------
    choir_voicings = [(9, 8, ['bb3', 'd4', 'f4']), (11, 8, ['ab3', 'd4', 'f4']), (13, 4, ['g3', 'd4', 'e4']),
                      (14, 4, ['g3', 'c#4', 'e4']), (15, 4, ['f#3', 'a3', 'd4']), (16, 4, ['f3', 'a3', 'd4']),
                      (21, 8, ['a3', 'd4', 'f4']), (23, 2, ['g3', 'bb3', 'e4']), (24, 4, ['g3', 'bb3', 'c#4'])]
    for bar, beats, voicing in choir_voicings:
        choir.chord(s.bar_start(bar), voicing, beats, vel=0.5 + (0.1 if bar in (13, 14, 24) else 0.0))
    choir.chord(s.bar_start(23) + 2, ['g3', 'bb3', 'd4'], 2, vel=0.5)

    # ---- harp ------------------------------------------------------------------------------------
    plan = {1: 'Dm', 2: 'Dm', 3: 'Dmmaj7', 4: 'Dmmaj7', 5: 'Dm7', 6: 'Dm7', 7: 'Dm6', 8: 'Dm6',
            9: 'Bbmaj7', 10: 'Bbmaj7', 11: 'Bb7', 12: 'Bb7', 13: 'A7sus4', 14: 'A7', 15: 'D', 16: 'Dm',
            17: 'Dm', 18: 'F/A', 19: 'Gm', 20: 'A7sus4', 21: 'Dm', 22: 'Bbmaj7', 23: 'Gm6', 24: 'A7b9',
            25: 'Dm', 26: 'Dm', 27: 'Dm', 28: 'Dm'}
    eighth_bars = {1, 2, 3, 4, 5, 6, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26}
    quarter_bars = {7, 9, 10, 11, 12, 13, 14, 27}
    for bar, fig in plan.items():
        v = 0.5 if bar <= 8 else (0.46 if bar <= 16 else 0.58)
        if bar in (25, 26):
            v = 0.5
        if bar in eighth_bars:
            harp_eighths(harp, bar, fig, vel=v)
        elif bar in quarter_bars:
            harp_quarters(harp, bar, fig, vel=v)
    # bar 8: half-note gesture, bar 20 second half uses the A7 voicing, bar 28: slow rise into the loop
    harp.seq(bar=8, pattern='d3/2 a3/2', vel=0.45)
    for i, n in enumerate(['a2', 'e3', 'g3', 'c#4']):
        harp.add(s.bar_start(20) + 2 + i * 0.5, n, 0.5, vel=0.55, gate=1.6)
    harp.seq(bar=28, pattern='d3/1 a3/1 d4/1 a4/1', vel=0.5)

    # ---- music box: the name motif ----------------------------------------------------------------
    mb = musicbox
    mb.seq(bar=1, pattern='r/1 d6/1.5 a6/0.5 b6/1 | g6/3 r/1', vel=0.72)
    mb.seq(bar=3, pattern='r/1 d6/1.5 a6/0.5 b6/1 | g6/1 a6/1 c#6/2', vel=0.68)
    mb.seq(bar=5, pattern='d6/2 r/2', vel=0.7)
    mb.seq(bar=7, pattern='r/2 e6/0.5 d6/0.5 b5/1 | a5/3 r/1', vel=0.6)
    # B: motif on Bb with the dark Eb, resolving to D
    mb.seq(bar=9, pattern='r/1 bb5/1.5 f6/0.5 g6/1 | eb6/2 d6/2', vel=0.66)
    mb.seq(bar=14, pattern='r/2 g6/0.5 f6/0.5 e6/1 | d6/4', vel=0.7)
    # A': restatement, then a quiet echo of the first two notes to hand into bar 1
    mb.seq(bar=25, pattern='r/1 d6/1.5 a6/0.5 b6/1 | g6/2 a6/1 f6/1', vel=0.7)
    mb.seq(bar=27, pattern='e6/2 d6/2 | r/2 a5/1 d6/1', vel=0.6)

    # ---- celesta: answer in A, the melody in C ------------------------------------------------------
    ce = celesta
    ce.seq(bar=5, pattern='r/2 a5/0.5 g5/0.5 f5/1 | e5/2 d5/1 c5/1 | b4/3 r/1', vel=0.55)
    ce.seq(bar=17, pattern='d5/1.5 a5/0.5 b5/1 g5/1 | a5/2 f5/1 e5/1 | d5/1.5 g5/0.5 a5/1 bb5/1 | a5/2.5 r/0.5 g5/0.5 f5/0.5', vel=0.66)
    ce.seq(bar=21, pattern='e5/1 d5/1 f5/1 a5/1 | d6/1.5 c6/0.5 a5/1 f5/0.5 r/0.5 | g5/2 e5/1 bb5/1 | a5/1.5 c#6/0.5 e6/1 g6/1', vel=0.7)
    # a few sparkle notes in B (very quiet) so the register is not empty
    ce.seq(bar=11, pattern='r/3 f5/0.5 ab5/0.5 | d6/2 r/2', vel=0.4)

    # ---- pizzicato heartbeat in B ------------------------------------------------------------------------
    for bar in range(9, 17):
        pizz.add(s.bar_start(bar) + 2, 'd3', 0.5, vel=0.42)
        pizz.add(s.bar_start(bar) + 3.5, 'd3', 0.5, vel=0.3)

    # ---- root creaks ---------------------------------------------------------------------------------------
    for bar, beat, v in [(1, 1, 0.9), (5, 1, 0.75), (9, 1, 0.85), (11, 3, 0.55), (13, 1, 0.8), (17, 1, 0.85),
                         (21, 1, 0.8), (23, 3, 0.5), (25, 1, 0.85), (27, 3, 0.45)]:
        creak.add(s.bar_start(bar) + beat - 1, 'd1', 0.5, vel=v)
    return s
