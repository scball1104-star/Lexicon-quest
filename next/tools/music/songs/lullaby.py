"""The Hollow lullaby, written once in scale degrees and realized three ways (Episode 2):

    hollow      A Dorian, music box and celesta: the name motif always stops after its third note
    hollowmere  D major, full strings, horn and glockenspiel: the fourth note finally lands
    boss_king   C minor, the B section turns the tune into a march (the father's song as a weapon)

Degrees are 0-based scale steps from the tonic (0 = tonic, 4 = fifth, 5 = sixth, 7 = the octave,
negative = below). The name motif in degrees is 0, 4, 5, 3 (1-5-6-4: NAME_MOTIF when the mode has a
major sixth). A "reflected melody": every two-bar phrase is answered by its diatonic mirror
inversion (the contour flipped step for step), starting on the phrase's own first note, or from
above in bars 19 and 31 so the answer comes back down to where the phrase arrived.

32 bars of 3/4. Each phrase is (bar, role, notes) where notes are (degree or None, beats) and the
special degree FOURTH / FOURTH_R marks where the motif's fourth note belongs (a rest unless the
caller asks for the complete motif).
"""

SCALES = {
    'major': (0, 2, 4, 5, 7, 9, 11),
    'dorian': (0, 2, 3, 5, 7, 9, 10),
    'aeolian': (0, 2, 3, 5, 7, 8, 10),
    'phrygian': (0, 1, 3, 5, 7, 8, 10),
}

FOURTH = 'fourth'        # the motif's missing fourth note (degree 3)
FOURTH_R = 'fourth_r'    # the same note in the reflection (degree -3, or 4 when reflected from 7)

BARS = 32

# role 'P' = the phrase, 'R' = its reflection
PHRASES = [
    # A: the motif and its mirror, then a falling phrase and its rising mirror
    (1, 'P', [(0, 1), (4, 2)]), (2, 'P', [(5, 2), (FOURTH, 1)]),
    (3, 'R', [(0, 1), (-4, 2)]), (4, 'R', [(-5, 2), (FOURTH_R, 1)]),
    (5, 'P', [(4, 2), (2, 1)]), (6, 'P', [(1, 2), (None, 1)]),
    (7, 'R', [(4, 2), (6, 1)]), (8, 'R', [(7, 2), (None, 1)]),
    # A': the same, with a pickup rhythm; the falling phrase now steps
    (9, 'P', [(None, 1), (0, 1), (4, 1)]), (10, 'P', [(5, 2), (FOURTH, 1)]),
    (11, 'R', [(None, 1), (0, 1), (-4, 1)]), (12, 'R', [(-5, 2), (FOURTH_R, 1)]),
    (13, 'P', [(4, 1), (3, 1), (2, 1)]), (14, 'P', [(1, 2), (None, 1)]),
    (15, 'R', [(4, 1), (5, 1), (6, 1)]), (16, 'R', [(7, 2), (None, 1)]),
    # B: a rising line answered from above, then a falling arpeggio answered by its climb
    (17, 'P', [(2, 1), (3, 1), (4, 1)]), (18, 'P', [(5, 3)]),
    (19, 'R', [(8, 1), (7, 1), (6, 1)]), (20, 'R', [(5, 3)]),
    (21, 'P', [(5, 1), (3, 1), (1, 1)]), (22, 'P', [(0, 2), (None, 1)]),
    (23, 'R', [(5, 1), (7, 1), (9, 1)]), (24, 'R', [(10, 2), (None, 1)]),
    # coda: the motif twice; the second time the sixth is held where the fourth note belongs
    (25, 'P', [(0, 1), (4, 2)]), (26, 'P', [(5, 2), (FOURTH, 1)]),
    (27, 'R', [(0, 1), (-4, 2)]), (28, 'R', [(-5, 2), (FOURTH_R, 1)]),
    (29, 'P', [(0, 1), (4, 2)]), (30, 'P', [(5, 2), (FOURTH, 1)]),
    (31, 'R', [(7, 1), (3, 2)]), (32, 'R', [(2, 2), (FOURTH_R, 1)]),
]

# chord per bar: (root degree, kind) with kind in '5' (triad), '6' (triad + sixth), '7' (seventh chord)
CHORDS = [
    (0, '5'), (0, '6'), (3, '5'), (3, '7'), (2, '5'), (1, '7'), (4, '5'), (0, '5'),
    (0, '5'), (0, '6'), (3, '5'), (3, '7'), (2, '5'), (1, '7'), (4, '7'), (0, '5'),
    (2, '5'), (3, '5'), (4, '5'), (3, '7'), (1, '7'), (0, '5'), (3, '5'), (4, '7'),
    (0, '5'), (0, '6'), (3, '5'), (3, '7'), (0, '5'), (0, '6'), (3, '5'), (3, '7'),
]

SECTIONS = {'A': range(1, 9), "A'": range(9, 17), 'B': range(17, 25), 'coda': range(25, 33)}


def pitch(tonic_midi, mode, d):
    """MIDI pitch of scale degree d (any integer) above tonic_midi in `mode`."""
    sc = SCALES[mode]
    o, i = divmod(int(d), 7)
    return tonic_midi + 12 * o + sc[i]


def chord_degrees(bar):
    root, kind = CHORDS[bar - 1]
    tones = [root, root + 2, root + 4]
    if kind == '6':
        tones.append(root + 5)
    elif kind == '7':
        tones.append(root + 6)
    return tones


def phrase_notes(bar_from, bar_to, complete):
    """[(bar, beat_in_bar, degree, beats, role)] for the phrases in bars bar_from..bar_to.
    complete=False turns every FOURTH / FOURTH_R into a rest (the Hollow); in bar 30 the sixth is then
    held through the beat where the fourth belongs."""
    out = []
    for bar, role, notes in PHRASES:
        if not (bar_from <= bar <= bar_to):
            continue
        beat = 0.0
        for d, dur in notes:
            if d == FOURTH:
                d = 3 if complete else None
            elif d == FOURTH_R:
                d = (4 if bar == 32 else -3) if complete else None
            if d is not None:
                out.append((bar, beat, d, dur, role))
            beat += dur
    if not complete:
        # bar 30: hold the sixth through the missing fourth note
        out = [(b, bt, d, (3.0 if (b == 30 and bt == 0.0) else dur), r) for b, bt, d, dur, r in out]
    return out


def check():
    """Every phrase fills its bar; the reflections are true mirror inversions of their phrases."""
    for bar, role, notes in PHRASES:
        assert abs(sum(d for _, d in notes) - 3.0) < 1e-9, bar
    pairs = [(1, 3, 0), (5, 7, 4), (9, 11, 0), (13, 15, 4), (17, 19, 8), (21, 23, 5), (25, 27, 0), (29, 31, 7)]
    for p, r, axis in pairs:
        pn = [d for b, _, d, _, _ in phrase_notes(p, p + 1, True)]
        rn = [d for b, _, d, _, _ in phrase_notes(r, r + 1, True)]
        first = pn[0]
        # mirror around the phrase's first note, then moved to the stated axis (a transposed mirror)
        want = [axis + (first - d) for d in pn]
        assert rn == want, (p, pn, rn, want)
    return True


if __name__ == '__main__':
    print('lullaby check', check())
