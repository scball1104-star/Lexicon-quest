"""court: "The Court of Mirrors" (court_f1, court_f2). D Phrygian, 76 BPM, 4/4, 28 bars (88.4 s), loops.

A melody in strict canon with its own mirror inversion, half a bar apart: whatever the leader plays, the
follower plays two beats later turned upside down around C (p -> S - p, S a multiple of 12). C is the
mirror axis of the D Phrygian collection, so the inversion never leaves the mode, and the name motif
F C D Bb (the motif's minor-mode guise, starting on the third) comes back as G C Bb D, which is exactly
NAME_MOTIF_INVERTED (0, -7, -9, -5): the name and its reflection in counterpoint. The leader's line was
chosen so that each note sums with the note two beats earlier to a consonance (sum mod 12 in
{0, 3, 4, 5, 7, 8, 9}); the few weak-eighth seconds that remain are the cold glint of the glass.

The following voice is doubled by a quiet glass pad (the mirror's halo). Under it a low string pedal on D (Eb for two bars in B, the Phrygian shadow), high strings holding long
mirror chords, and sparse glass percussion.

Form
  X   1-8    celesta leads (motif, then a slow descent to D and a climb to Eb6), harp follows in mirror
  Y   9-16   the line rises again; the pedal slips to Eb in bars 13-14
  X'  17-24  the mirror swaps: the harp leads an octave lower, the celesta follows above
  coda 25-28 the motif once more, the descent stops on D: the follower answers Bb (the mirror chord Bb/D)
"""
from tracker import Song
from theory import midi
import synth

S_BELOW = 144      # follower below the leader (mirror around C5)
S_ABOVE = 156      # follower above (mirror around F#5 / C6)
DELAY = 2.0        # half a bar

X = 'f5/1.5 c6/0.5 d6/2 | bb5/2 a5/2 | g5/2 f5/2 | eb5/2 d5/2 | f5/2 bb5/2 | a5/2 c6/2 | eb6/2 d6/2 | bb5/2 g5/2'
Y = 'a5/2 c6/2 | eb6/2 d6/2 | g5/2 bb5/2 | a5/2 g5/2 | bb5/2 f5/2 | eb5/2 c5/2 | f5/2 d5/2 | eb5/2 d5/2'
CODA = 'f5/1.5 c6/0.5 d6/2 | bb5/2 a5/2 | g5/2 f5/2 | d5/4'

# (bar, pattern, leader, octave shift, mirror sum)
SECTIONS = [(1, X, 'celesta', 0, S_BELOW), (9, Y, 'celesta', 0, S_BELOW),
            (17, X, 'harp', -12, S_ABOVE), (25, CODA, 'celesta', 0, S_BELOW)]

CHORDS = ['Dphr', 'Gm/D', 'Gm/D', 'Dm', 'Bb/D', 'F/D', 'Eb/D', 'Gm/D',
          'Dm', 'Cm/D', 'Gm/D', 'Dm', 'Eb', 'Cm/Eb', 'Bb/D', 'Dm',
          'Dphr', 'Gm/D', 'Gm/D', 'Dm', 'Bb/D', 'F/D', 'Eb/D', 'Gm/D',
          'Dphr', 'Gm/D', 'Gm/D', 'Bb/D']


def parse(pattern):
    out, t = [], 0.0
    for tok in pattern.replace('|', ' ').split():
        n, d = tok.split('/')
        d = float(d)
        if n != 'r':
            out.append((t, d, midi(n)))
        t += d
    return out


def canon_notes():
    """[(beat, dur, midi, instrument, role)] for the whole loop, leader and follower."""
    notes = []
    for bar, pat, leader, shift, S in SECTIONS:
        follower = 'harp' if leader == 'celesta' else 'celesta'
        t0 = (bar - 1) * 4.0
        for t, d, p in parse(pat):
            lp = p + shift
            notes.append((t0 + t, d, lp, leader, 'dux'))
            notes.append((t0 + t + DELAY, d, S - lp, follower, 'comes'))
    return notes


def build():
    s = Song('court', bpm=76, beats_per_bar=4, bars=28, key='D phrygian', title='The Court of Mirrors',
             reverb_room=0.9, reverb_damp=0.25, reverb_len=4.8, reverb_level=-6.5,
             delay_beats=(1.0, 0.75), delay_feedback=0.3, delay_level=-15.0, target_lufs=-16.0, true_peak_trim=True,
             intended_chords=CHORDS)
    bs = s.bar_start

    celesta = s.track('celesta', 'celesta', volume=-8.5, pan=0.3, reverb=0.5, delay=0.3, role='melody', vel=0.66, gate=0.95, humanize_ms=3)
    softharp = synth.Harp(decay=2.6, brightness=0.45)  # a softer pluck, rounder canon voice
    harp = s.track('harp', softharp, volume=-3.0, pan=-0.3, reverb=0.45, delay=0.15, role='melody', vel=0.62, gate=1.0, humanize_ms=3)
    lowstr = s.track('low strings', 'strings_low', volume=-15.5, reverb=0.4, role='pad', vel=0.5, gate=1.0, width=0.5)
    bass = s.track('bass', 'bass', volume=-17.0, reverb=0.05, role='bass', vel=0.5, gate=1.0)
    hi = s.track('high strings', 'strings_high', volume=-21.0, reverb=0.55, role='pad', vel=0.42, gate=1.0, width=0.9)
    glass = s.track('glass', 'glass', volume=-9.0, pan=0.45, reverb=0.6, delay=0.4, role='perc', vel=0.4, humanize_ms=6)
    drip = s.track('glass drips', 'musicbox', volume=-14.0, pan=-0.5, reverb=0.7, delay=0.5, role='perc', vel=0.35)

    # the mirror's halo: whichever voice is following is doubled by a quiet glass pad
    halo = s.track('mirror halo', synth.GlassPad(attack=0.12, trem=0.6), volume=-17.0, pan=0.0, reverb=0.6, role='pad', vel=0.5, gate=0.95)
    tracks = {'celesta': celesta, 'harp': harp}
    for t, d, p, inst, role in canon_notes():
        if role == 'comes':
            halo.add(t, p + 12 if p < 67 else p, d, vel=0.5)
        v = 0.66 if role == 'dux' else 0.6
        if inst == 'harp':
            v += 0.04
        if t >= 96:
            v -= 0.06
        tracks[inst].add(t, p, d, vel=v)

    # ---- the pedal: D (Eb in bars 13-14), re-bowed every two bars --------------------------------
    for bar in range(1, 29, 2):
        root = 'eb2' if bar == 13 else 'd2'
        fifth = 'bb2' if bar == 13 else 'a2'
        v = 0.5 if bar not in (9, 11, 13, 15) else 0.56
        lowstr.chord(bs(bar), [root, fifth], 8.0, vel=v)
        bass.add(bs(bar), 'eb1' if bar == 13 else 'd1', 8.0, vel=0.5)

    # ---- high strings: long mirror chords (B section and X'), cold and quiet -------------------------
    for bar, notes, beats in ((9, ['a4', 'd5'], 8), (11, ['bb4', 'd5'], 8), (13, ['bb4', 'eb5'], 8),
                              (15, ['a4', 'd5'], 8), (17, ['f4', 'a4'], 8), (19, ['g4', 'bb4'], 8),
                              (21, ['f4', 'bb4'], 8), (23, ['g4', 'bb4'], 8), (25, ['f4', 'a4'], 8),
                              (27, ['f4', 'bb4'], 8)):
        hi.chord(bs(bar), notes, beats, vel=0.4 if bar < 25 else 0.36)

    # ---- glass percussion: sparse struck-glass pings, a few drips ----------------------------------------
    pings = {1: [(2.5, 'd7')], 2: [(3.5, 'a6')], 4: [(1.5, 'f7')], 5: [(2.5, 'd7'), (3.0, 'a6')],
             7: [(3.5, 'eb7')], 8: [(1.5, 'd7')], 9: [(2.5, 'a6')], 10: [(3.5, 'd7')], 11: [(1.5, 'f7')],
             12: [(2.5, 'a6'), (3.5, 'd7')], 13: [(2.5, 'eb7')], 14: [(3.5, 'bb6')], 15: [(1.5, 'd7')],
             16: [(2.5, 'a6')], 17: [(2.5, 'd7')], 19: [(3.5, 'f7')], 20: [(1.5, 'a6')], 21: [(2.5, 'd7'), (3.0, 'a6')],
             23: [(3.5, 'eb7')], 24: [(1.5, 'd7')], 26: [(2.5, 'a6')], 28: [(1.5, 'd7'), (3.5, 'a6')]}
    for bar, hits in pings.items():
        for beat, p in hits:
            glass.add(bs(bar) + beat, p, 0.5, vel=0.36 + 0.06 * ((bar * 7 + int(beat * 2)) % 3))
    for bar, beat, p in ((3, 3.75, 'a7'), (6, 1.25, 'd8'), (10, 2.75, 'f7'), (14, 0.75, 'bb7'), (18, 3.25, 'a7'),
                         (22, 1.75, 'd8'), (27, 2.25, 'a7')):
        drip.add(bs(bar) + beat, p, 0.25, vel=0.3)
    return s
