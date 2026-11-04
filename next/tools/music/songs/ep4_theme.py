"""Shared material for the Episode 4 tracks (E4-audio): the Valewyn tune, written once in scale degrees.

`valewyn` (ep4_valewyn.py) plays it in C major in its B section (the lift out of A minor); `boss_regent`
(ep4_boss_regent.py) quotes it in F minor in its B section, re-barred to 6/8 (the city's own song turned to law).

The tune opens with the complete name motif, degrees 0 4 5 3 (C G A F in C major), and its fourth note is held
under the bar line for a whole bar (the held breath): the celesta's note in `valewyn`, the brass's in the quote.
Then the flute's answer. Eight bars of 4/4, degrees 0-based from the tonic (7 = the octave).
"""
import lullaby as L

# (bar offset, beat, degree, duration in beats)
TUNE = [
    (0, 0.0, 0, 1), (0, 1.0, 4, 1), (0, 2.0, 5, 1), (0, 3.0, 3, 4),            # the motif; the 4th note held into bar 2
    (1, 3.0, 2, 0.5), (1, 3.5, 3, 0.5),                                         # the answer's pickup
    (2, 0.0, 8, 1.5), (2, 1.5, 6, 0.5), (2, 2.0, 4, 1), (2, 3.0, 5, 1),
    (3, 0.0, 4, 2), (3, 2.0, 2, 1), (3, 3.0, 4, 1),
    (4, 0.0, 5, 1.5), (4, 1.5, 7, 0.5), (4, 2.0, 5, 1), (4, 3.0, 3, 1),
    (5, 0.0, 4, 2), (5, 2.0, 2, 1), (5, 3.0, 0, 1),
    (6, 0.0, 1, 1), (6, 1.0, 3, 1), (6, 2.0, 5, 1), (6, 3.0, 7, 1),
    (7, 0.0, 7, 2), (7, 2.0, 6, 2),
]
MOTIF = {(0, 0.0), (0, 1.0), (0, 2.0), (0, 3.0)}     # the four motif notes (the celesta's in valewyn)
HELD = (0, 3.0)                                       # the held fourth note
# degree triads per bar in C major: C, F/A, G/B, C, F, C/E, Dm7, Gsus4-G
CHORDS_MAJOR = ['C', 'F/A', 'G/B', 'C', 'F', 'C/E', 'Dm7', 'G']
# the same bars in F minor for the quote (iv, v and a raised leading tone over the last dominant)
CHORDS_MINOR = ['Fm', 'Bbm/Db', 'Cm/Eb', 'Fm', 'Bbm', 'Fm/Ab', 'Gm7b5', 'C']


def tune(tonic, mode, first_bar=1, raise_last=False):
    """[(bar, beat, midi, dur, is_motif)] in 4/4. raise_last=True raises degree 6 in the last bar a half step (the
    leading tone over the dominant in a minor key)."""
    out = []
    for b, beat, d, dur in TUNE:
        p = L.pitch(tonic, mode, d)
        if raise_last and b == 7 and d == 6:
            p += 1
        out.append((first_bar + b, beat, p, dur, (b, beat) in MOTIF))
    return out


def swing68(pos):
    """Map a 4/4 position in quarter beats to 6/8 quarter beats, one 4/4 bar to two 6/8 bars: each quarter becomes a
    dotted quarter (the 6/8 pulse) and an off-beat eighth becomes the last eighth of its group (long-short lilt)."""
    k = int(pos // 1.0)
    f = pos - k
    return 1.5 * k + (1.0 if f >= 0.5 - 1e-9 else 0.0)


def tune68(tonic, mode, first_bar=1, beats_per_bar=3.0, raise_last=False):
    """The tune re-barred to 6/8 (two 6/8 bars per 4/4 bar). [(abs_beat, midi, dur, is_motif)] from first_bar."""
    out = []
    base = (first_bar - 1) * beats_per_bar
    for bar, beat, p, dur, motif in tune(tonic, mode, 1, raise_last):
        a = (bar - 1) * 4.0 + beat
        s0 = swing68(a)
        s1 = swing68(a + dur)
        out.append((base + s0, p, s1 - s0, motif))
    return out


def check():
    for b in range(8):
        tot = 0.0
        for bb, beat, d, dur in TUNE:
            if bb == b:
                tot += dur
        # bar 0 carries the held note into bar 1, which then only adds its pickup
        if b not in (0, 1):
            assert abs(tot - 4.0) < 1e-9, (b, tot)
    assert [d for bb, beat, d, dur in TUNE if (bb, beat) in MOTIF] == [0, 4, 5, 3]
    # 6/8: every note starts on an eighth and the quote fills sixteen bars of 3 beats
    t = tune68(65, 'aeolian')
    assert all(abs((s * 2) - round(s * 2)) < 1e-9 for s, _, _, _ in t)
    assert abs(t[-1][0] + t[-1][2] - 48.0) < 1e-9, t[-1]
    return True


if __name__ == '__main__':
    print('ep4 theme check', check())
