"""Shared material for the Episode 7 tracks (E7-audio): the Palehaven tune, written once in scale degrees, the iceglass bell
and the song-local cello.

`palehaven` (ep7_palehaven.py) plays the tune in D Dorian in its B sections (the town's doors opening); `boss_phantom`
(ep7_boss_phantom.py) quotes it in F minor (Aeolian) in its B section, re-barred by `tune_aug` (every value doubled, so one
4/4 bar of the tune becomes two bars of the boss at 132: the town's own song, frozen to half speed under the drive).

The tune opens with the complete name motif, degrees 0 4 5 3 (D A B G in D Dorian, exactly 0 +7 +9 +5; the B is the Dorian
sixth, the warm note of the mode). Its fourth note is held over the bar line and rings on into bar 2, under the reply (in
`palehaven` the reply is the cello's: A F E under the G). Eight bars of 4/4, degrees 0-based from the tonic (7 = the octave).

The iceglass bell (`IceglassBell`) is song-local (synth.py is not E7-audio's file): a struck glass bar heard from very far
away, the Listening Bell's voice. A soft mallet strikes it hard (a felt thump and a 4 ms raised-cosine onset, the upper
partials slower to speak than the fundamental, so the strike is round, never a click); the bar rings on three inharmonic
partials near 1, 2.76 and 5.4 of the fundamental (a free bar's modes) with long separate decays (the fundamental about 4 s,
the top a second); and each of the two top partials is two modes a fraction of a hertz apart, so they beat slowly against
each other (the slow "wow" of a big bell, here on glass). Distance is in the voice itself: the very top is rolled off and a
little air (band noise on the fundamental) rides the first half second. It is the opposite of Episode 6's wind harp, which
has no attack at all. `damp` (seconds) stops the bar that long after the gate: the cut-off bell of `frostbound_vault`.

The cello (`Cello`) is song-local too: a bowed string with a warm body (formants near 250, 600 and 1500 Hz), two bow
strokes a few cents apart, delayed slow vibrato, a soft bow noise on the attack and a slow bow-in (no strings pad does a
solo line). `MuffledDrum` is a bass drum wrapped in felt (a low sine thump under a lowpass) with a crunch of snow on top
(footsteps in snow for the Vault's pulse).
"""
import math
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))   # tools/music, for a direct run
import synth  # noqa: E402
import lullaby as L  # noqa: E402
import ep6_theme as E6  # noqa: E402  (chord helpers only: parse, tones, root_note; ep6_theme is not changed)

# (bar offset, beat, degree, duration in beats)
TUNE = [
    (0, 0.0, 0, 1), (0, 1.0, 4, 1), (0, 2.0, 5, 1), (0, 3.0, 3, 2),            # the motif; the G rings on into bar 2
    (1, 1.0, 4, 0.5), (1, 1.5, 2, 0.5), (1, 2.0, 1, 2),                         # the reply under it: A F E
    (2, 0.0, 2, 1.5), (2, 1.5, 3, 0.5), (2, 2.0, 4, 1), (2, 3.0, 6, 1),
    (3, 0.0, 5, 3), (3, 3.0, 4, 1),                                             # the Dorian B over G: the door opening
    (4, 0.0, 7, 1), (4, 1.0, 5, 1), (4, 2.0, 4, 1), (4, 3.0, 3, 1),
    (5, 0.0, 2, 2), (5, 2.0, 3, 1), (5, 3.0, 2, 1),
    (6, 0.0, 1, 1), (6, 1.0, 2, 1), (6, 2.0, 4, 1), (6, 3.0, 1, 1),
    (7, 0.0, 0, 4),
]
MOTIF = {(0, 0.0), (0, 1.0), (0, 2.0), (0, 3.0)}     # the four motif notes
HELD = (0, 3.0)                                       # the held fourth note
# per bar, [(beat, chord)]: D Dorian for palehaven (bars 4 and 5 carry the Dorian IV, G major, under the B)
CHORDS_DORIAN = [[(0, 'Dm')], [(0, 'Em7')], [(0, 'F')], [(0, 'G')], [(0, 'G/B')], [(0, 'F')],
                 [(0, 'Am7'), (2, 'C')], [(0, 'Dm')]]
# the same functions in F minor for the boss's quote (the town's song frozen): ii half-diminished, bIII, iv, v
CHORDS_MINOR = [[(0, 'Fm')], [(0, 'Gm7b5')], [(0, 'Ab')], [(0, 'Bbm')], [(0, 'Bbm/Db')], [(0, 'Ab')],
                [(0, 'Cm7'), (2, 'Eb')], [(0, 'Fm')]]

parse = E6.parse
tones = E6.tones
root_note = E6.root_note
fifth_note = E6.fifth_note


def tune(tonic, mode, first_bar=1):
    """[(bar, beat, midi, dur, is_motif)] in 4/4, bars numbered from first_bar."""
    return [(first_bar + b, beat, L.pitch(tonic, mode, d), dur, (b, beat) in MOTIF) for b, beat, d, dur in TUNE]


def tune_aug(tonic, mode, first_bar=1, beats_per_bar=4.0, factor=2.0):
    """The tune augmented: every position and value times `factor` (one tune bar = two boss bars at factor 2).
    [(abs_beat, midi, dur, is_motif)] from first_bar."""
    base = (first_bar - 1) * beats_per_bar
    return [(base + factor * ((bar - 1) * 4.0 + beat), p, factor * dur, mo) for bar, beat, p, dur, mo in tune(tonic, mode, 1)]


# ------------------------------------------------------------------------------------------------ instruments

class IceglassBell(synth.Instrument):
    """A struck glass bar heard from far away (the module docstring).

    ring:   the fundamental's decay time constant (s); the 2.76 partial rings 0.42 of it, the 5.4 partial 0.22
    beat:   the slow beating of the top partials, in Hz (the 5.4 pair beats at 1.6 times this)
    mallet: 0..1, how hard the soft mallet lands (the felt thump and the top partials' share)
    far:    0..1, distance: rolls the top off and lets the air ride the first half second
    damp:   None, or seconds after the gate at which a hand stops the bar (it dies in about 60 ms)
    """
    name = 'iceglass'

    def __init__(self, ring=4.2, beat=0.55, mallet=0.7, far=0.5, damp=None, release=None):
        self.ring = ring
        self.beat = beat
        self.mallet = mallet
        self.far = far
        self.damp = damp
        self.release = (4.0 * ring) if release is None else release
        self.max_len = 14.0

    def render(self, f0, gate_s, vel, sr, rng, **p):
        if self.damp is not None:
            n = int((gate_s + self.damp + 0.25) * sr)
        else:
            n = int(min(self.max_len, gate_s + self.release) * sr)
        t = np.arange(n) / sr
        hard = self.mallet * (0.55 + 0.45 * vel)
        y = np.zeros(n)
        # (ratio, amplitude, decay as a share of ring, onset ms): the top partials speak a little later (soft mallet)
        for r, a, d, on in ((1.0, 1.0, 1.0, 4.0), (2.76, 0.42 * (0.5 + hard), 0.42, 6.0), (5.4, 0.2 * (0.3 + hard), 0.22, 9.0)):
            f = f0 * r
            if f > 0.44 * sr:
                continue
            onset = np.clip(t / (on / 1000.0), 0.0, 1.0)
            onset = 0.5 - 0.5 * np.cos(math.pi * onset)
            env = np.exp(-t / (self.ring * d)) * onset
            if r == 1.0:
                y += a * np.sin(2 * math.pi * f * t + rng.random() * 6.283) * env
            else:
                # two modes a fraction of a hertz apart: the slow beat between the top partials
                bh = self.beat * (1.0 if r < 3 else 1.6) * (0.85 + 0.3 * rng.random())
                ph = rng.random() * 6.283
                y += a * 0.5 * (np.sin(2 * math.pi * f * t + ph) + np.sin(2 * math.pi * (f + bh) * t + ph + 1.3)) * env
        # the felt: a short low thump at the strike (round, under the fundamental)
        k = min(n, int(0.05 * sr))
        th = np.zeros(n)
        tt = t[:k]
        th[:k] = np.sin(2 * math.pi * min(f0 * 0.5, 220.0) * tt) * np.exp(-tt / 0.012) * (1 - np.exp(-tt / 0.001))
        y += 0.25 * hard * th
        # the air of distance: a breath of band noise on the fundamental over the first half second
        if self.far:
            air = synth.filt(synth.noise(n, rng), 'bp', min(0.4 * sr, f0 * 1.0), sr, q=8.0)
            air = air / (np.abs(air).max() + 1e-9) * np.exp(-t / 0.35) * (1 - np.exp(-t / 0.02))
            y += 0.06 * self.far * air
        if self.damp is not None:
            g0 = gate_s + self.damp
            y *= np.where(t < g0, 1.0, np.exp(-(t - g0) / 0.06))
        y = synth.filt(y, 'lp', 9000.0 - 4500.0 * self.far, sr, 0.7)
        y = synth.fade_edges(y, sr, 0.2, 60.0)
        return synth.normalize(y, 0.5 * (0.4 + 0.6 * vel))


class Cello(synth.Instrument):
    """A solo cello (the module docstring). bow: seconds for the bow to bite (the attack); warmth 0..1 darkens the top."""
    name = 'cello'
    release = 0.32

    def __init__(self, bow=0.12, warmth=0.6, vib=0.13):
        self.bow = bow
        self.warmth = warmth
        self.vib = vib

    def render(self, f0, gate_s, vel, sr, rng, **p):
        n_gate = int(gate_s * sr)
        env = synth.adsr(n_gate, sr, self.bow * (1.25 - 0.5 * vel), 0.25, 0.9, self.release)
        n = env.shape[0]
        t = np.arange(n) / sr
        f = synth.vibrato(n, sr, f0, rate=4.9 + rng.uniform(-0.3, 0.3), depth_semi=self.vib * (0.7 + 0.3 * vel),
                          delay=0.35, ramp=0.6, phase=rng.uniform(0, 6.283))
        v = synth.osc('saw', f, sr) + 0.3 * synth.osc('saw', f * 1.0031, sr, phase0=0.41)
        v += 0.35 * synth.osc('sine', f, sr)
        top = 1500 + 1600 * vel - 900 * self.warmth + 2.0 * f0
        v = synth.filt(v, 'lp', top, sr, 0.7)
        # the body: three broad formants
        v = (0.55 * v + 0.8 * synth.filt(v, 'bp', 250, sr, q=1.6) + 0.55 * synth.filt(v, 'bp', 600, sr, q=2.2)
             + 0.3 * synth.filt(v, 'bp', 1500, sr, q=2.8))
        bow = synth.filt(synth.noise(n, rng), 'bp', 1800, sr, q=0.9) * (0.035 + 0.08 * np.exp(-t / 0.09))
        v = synth.filt(v + bow, 'hp', max(35.0, f0 * 0.6), sr, 0.7)
        return synth.normalize(v * env, 0.5 * (0.45 + 0.55 * vel))


class MuffledDrum(synth.Instrument):
    """A felt-wrapped bass drum and a crunch of snow: footsteps for the Vault (the module docstring)."""
    name = 'muffled'
    release = 0.6

    def render(self, f0, gate_s, vel, sr, rng, **p):
        n = int(0.7 * sr)
        t = np.arange(n) / sr
        f = f0 * (1.0 + 0.5 * np.exp(-t / 0.03))
        body = np.sin(2 * math.pi * np.cumsum(f) / sr) * np.exp(-t / 0.18) * (1 - np.exp(-t / 0.004))
        felt = synth.filt(synth.noise(n, rng), 'lp', 250, sr) * np.exp(-t / 0.025)
        crunch = synth.filt(synth.noise(n, rng), 'bp', 2400, sr, q=0.8)
        grains = (np.abs(synth.filt(synth.noise(n, rng), 'lp', 60, sr)) * 6.0) ** 2
        crunch = crunch * np.clip(grains, 0, 1) * np.exp(-np.maximum(0, t - 0.01) / 0.07) * np.clip(t / 0.01, 0, 1)
        v = synth.filt(body + 0.6 * felt, 'lp', 420, sr, 0.7) + 0.05 * crunch / (np.abs(crunch).max() + 1e-9)
        return synth.normalize(v, 0.5 * (0.45 + 0.55 * vel))


def check():
    for b in range(8):
        tot = sum(dur for bb, beat, d, dur in TUNE if bb == b)
        if b not in (0, 1):                     # bar 0 carries the held note into bar 1, which then adds the rest
            assert abs(tot - 4.0) < 1e-9, (b, tot)
    assert abs(sum(d for bb, _, _, d in TUNE if bb in (0, 1)) - 8.0) < 1e-9
    assert [d for bb, beat, d, dur in TUNE if (bb, beat) in MOTIF] == [0, 4, 5, 3]
    assert [b for b, beat, d, dur in TUNE if (b, beat) == HELD and beat + dur > 4.0] == [0], 'the G held over the bar line'
    # the motif's intervals in D Dorian are the name motif exactly (0 +7 +9 +5): D A B G
    m = [p for _, _, p, _, mo in tune(62, 'dorian') if mo]
    assert [x - m[0] for x in m] == [0, 7, 9, 5], m
    assert [x % 12 for x in m] == [2, 9, 11, 7], 'D A B G'
    # every tune note is in D Dorian, and the Dorian sixth (B) is sung over the G of bar 4
    assert all(p % 12 in (2, 4, 5, 7, 9, 11, 0) for _, _, p, _, _ in tune(62, 'dorian'))
    assert any(p % 12 == 11 and dur >= 3 for b, _, p, dur, _ in tune(62, 'dorian') if b == 4)
    # the boss's quote: F minor, every value doubled (16 bars of 4 beats), F C Db Bb on the motif (the sixth gone minor)
    q = tune_aug(65, 'aeolian')
    assert abs(q[-1][0] + q[-1][2] - 64.0) < 1e-9, q[-1]
    assert [s for s, _, _, mo in q if mo] == [0.0, 2.0, 4.0, 6.0], 'one motif note on each half bar'
    assert [p % 12 for _, p, _, mo in q if mo] == [5, 0, 1, 10], 'F C Db Bb in F minor'
    assert all(abs(s * 2 - round(s * 2)) < 1e-9 for s, _, _, _ in q)
    # the chord tables parse, and each held tune note is a tone of its bar's chord
    for bars in (CHORDS_DORIAN, CHORDS_MINOR):
        assert len(bars) == 8
        for segs in bars:
            for _, c in segs:
                parse(c)
    for bar, beat, p, dur, _ in tune(62, 'dorian', 0):
        if dur >= 2 and beat + dur <= 4:
            assert p % 12 in parse(CHORDS_DORIAN[bar][0][1])[1], (bar, beat, p)
    return True


if __name__ == '__main__':
    print('ep7 theme check', check())
