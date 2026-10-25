"""Shared material for the Episode 3 tracks (E3-audio): chord helpers and the First Bell theme.

The First Bell theme is eight bars of 4/4, written once in scale degrees (0 = tonic) and realized in several
modes: `emberpeak` (D dorian, with the toll missing), `first_bell` (D major, the bell lands) and `boss_warden`
(C aeolian, the bell as the weapon's head). Its first bar is the complete name motif, degrees 0 4 5 3
(D A B G): the fourth note, degree 3, is `(bar, beat) == (0, 3.0)` and again `(4, 3.0)`.
"""
import lullaby as L

# (bar offset, beat, degree, duration in beats)
THEME = [
    (0, 0.0, 0, 1), (0, 1.0, 4, 1), (0, 2.0, 5, 1), (0, 3.0, 3, 1),           # the motif; the 4th note is the bell's
    (1, 0.0, 4, 2), (1, 2.0, 2, 1), (1, 3.0, 1, 1),
    (2, 0.0, 0, 1.5), (2, 1.5, 1, 0.5), (2, 2.0, 2, 1), (2, 3.0, 4, 1),
    (3, 0.0, 5, 2), (3, 2.0, 4, 2),
    (4, 0.0, 0, 1), (4, 1.0, 4, 1), (4, 2.0, 5, 1), (4, 3.0, 3, 1),           # the motif again; 4th note again
    (5, 0.0, 7, 2), (5, 2.0, 6, 1), (5, 3.0, 5, 1),
    (6, 0.0, 4, 1.5), (6, 1.5, 5, 0.5), (6, 2.0, 4, 1), (6, 3.0, 2, 1),
    (7, 0.0, 0, 4),
]
FOURTHS = {(0, 3.0), (4, 3.0)}


def theme(tonic, mode, first_bar=1, drop_fourth=False):
    """[(bar, beat, midi, dur, is_fourth)] with bars numbered from `first_bar`.
    drop_fourth=True leaves the fourth note out (the rest where the bell belongs)."""
    out = []
    for b, beat, d, dur in THEME:
        fourth = (b, beat) in FOURTHS
        if fourth and drop_fourth:
            continue
        out.append((first_bar + b, beat, L.pitch(tonic, mode, d), dur, fourth))
    return out


_ROOTS = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}
_QUAL = {
    '': (0, 4, 7), 'm': (0, 3, 7), '7': (0, 4, 7, 10), 'm7': (0, 3, 7, 10), 'maj7': (0, 4, 7, 11),
    'sus4': (0, 5, 7), '7sus4': (0, 5, 7, 10), '5': (0, 7), 'dim': (0, 3, 6), 'add9': (0, 2, 4, 7),
    'm6': (0, 3, 7, 9), 'm7b5': (0, 3, 6, 10), 'm(add9)': (0, 2, 3, 7),
}


def parse(name):
    """'Bbm7/D' -> (root_pc, [chord pcs], bass_pc)."""
    main, _, slash = name.partition('/')
    root = _ROOTS[main[0]]
    i = 1
    while i < len(main) and main[i] in '#b':
        root += 1 if main[i] == '#' else -1
        i += 1
    ivs = _QUAL[main[i:]]
    pcs = [(root + iv) % 12 for iv in ivs]
    bass = root % 12
    if slash:
        bass = _ROOTS[slash[0]] + sum(1 if c == '#' else -1 for c in slash[1:])
        bass %= 12
    return root % 12, pcs, bass


def tones(name, lo, hi):
    """Chord tones of `name` with lo <= midi < hi, ascending."""
    _, pcs, _ = parse(name)
    return [p for p in range(lo, hi) if p % 12 in pcs]


def root_note(name, lo):
    """The lowest pitch >= lo that is the chord's bass note."""
    _, _, bass = parse(name)
    return lo + (bass - lo) % 12


def fifth_note(name, lo):
    root, pcs, _ = parse(name)
    return lo + ((root + 7) - lo) % 12
