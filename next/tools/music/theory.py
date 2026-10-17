"""Music theory helpers for the Lexicon Quest tracker.

Pitches are MIDI numbers (A4 = 69 = 440 Hz). Note names are lower case with
optional sharps/flats and an octave: c4, f#3, bb2. Scientific pitch (c4 = 60).

The shared "name" leitmotif is defined here once so every song imports it:
    rising perfect fifth, whole-step lift, falling major third
    intervals from the first note: [0, +7, +9, +5] semitones
"""

NAME_MOTIF = (0, 7, 9, 5)
# The inverted "fading" guise (used when a name is slipping away):
NAME_MOTIF_INVERTED = (0, -7, -9, -5)

_NAMES = {'c': 0, 'd': 2, 'e': 4, 'f': 5, 'g': 7, 'a': 9, 'b': 11}
_PC_NAMES_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
_PC_NAMES_FLAT = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']


def midi(name):
    """'c4' -> 60, 'f#3' -> 54, 'bb2' -> 46."""
    s = name.strip().lower()
    letter = s[0]
    if letter not in _NAMES:
        raise ValueError('bad note name: %r' % name)
    i = 1
    acc = 0
    while i < len(s) and s[i] in '#b':
        acc += 1 if s[i] == '#' else -1
        i += 1
    octave = int(s[i:])
    return 12 * (octave + 1) + _NAMES[letter] + acc


def freq(m):
    return 440.0 * 2.0 ** ((m - 69) / 12.0)


def name_of(m, flats=False):
    pc = int(m) % 12
    octv = int(m) // 12 - 1
    return (_PC_NAMES_FLAT if flats else _PC_NAMES_SHARP)[pc] + str(octv)


def pc_name(pc, flats=False):
    return (_PC_NAMES_FLAT if flats else _PC_NAMES_SHARP)[pc % 12]


def motif(start, guise=NAME_MOTIF, transpose=0):
    """Return the four MIDI pitches of the name motif starting on `start` (name or midi)."""
    base = midi(start) if isinstance(start, str) else int(start)
    return [base + transpose + d for d in guise]


# Chord templates (pitch classes relative to root) for the bar-by-bar harmonic analysis.
CHORD_TEMPLATES = {
    '': (0, 4, 7),
    'm': (0, 3, 7),
    'dim': (0, 3, 6),
    'aug': (0, 4, 8),
    'sus4': (0, 5, 7),
    'sus2': (0, 2, 7),
    '7': (0, 4, 7, 10),
    'maj7': (0, 4, 7, 11),
    'm7': (0, 3, 7, 10),
    'm(maj7)': (0, 3, 7, 11),
    'm6': (0, 3, 7, 9),
    '6': (0, 4, 7, 9),
    'add9': (0, 2, 4, 7),
    'm(add9)': (0, 2, 3, 7),
    'maj7#11': (0, 4, 6, 7, 11),
    '7sus4': (0, 5, 7, 10),
    'dim7': (0, 3, 6, 9),
    'm7b5': (0, 3, 6, 10),
    '7b9': (0, 1, 4, 7, 10),
    '5': (0, 7),
}


def analyse_chord(weights, bass_pc=None):
    """weights: 12-vector of pitch-class energy. Returns (label, score) of the best template.

    Score rewards covered template tones (weighted by energy) and penalises energy outside the
    template, with a small bonus when the bass note is the chord root (or a chord tone).
    """
    import numpy as np
    w = np.asarray(weights, dtype=float)
    if w.sum() <= 1e-9:
        return ('rest', 0.0)
    w = w / w.sum()
    best = ('?', -1e9)
    for root in range(12):
        for suffix, tpl in CHORD_TEMPLATES.items():
            tones = [(root + t) % 12 for t in tpl]
            inside = sum(w[t] for t in tones)
            outside = 1.0 - inside
            # prefer smaller templates when they explain the energy equally well
            covered = sum(1 for t in tones if w[t] > 0.04)
            score = inside - 1.6 * outside + 0.08 * covered - 0.03 * len(tpl)
            if bass_pc is not None:
                if bass_pc == root:
                    score += 0.12
                elif bass_pc in tones:
                    score += 0.04
            if score > best[1]:
                label = pc_name(root, flats=(suffix in ('m', 'm7', 'dim', 'm6', 'm(add9)') and root in (1, 3, 8, 10)))
                if bass_pc is not None and bass_pc != root:
                    label = label + suffix + '/' + pc_name(bass_pc)
                else:
                    label = label + suffix
                best = (label, score)
    return best
