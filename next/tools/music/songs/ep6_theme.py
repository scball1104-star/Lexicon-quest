"""Shared material for the Episode 6 tracks (E6-audio): the Zephyr tune, written once in scale degrees, and the wind harp.

`zephyr` (ep6_zephyr.py) plays the tune in G major in its B section (the docks coming home); `boss_scribe`
(ep6_boss_scribe.py) quotes it in E minor in its B section, re-barred to 6/8 by `swing68` (each quarter a dotted
quarter, each off-beat eighth the last eighth of its group, so one 4/4 bar of the tune becomes two bars of 6/8): the
town's own song written as a storm.

The tune opens with the complete name motif, degrees 0 4 5 3 (G D E C in G major, exactly 0 +7 +9 +5). Its fourth note
is held across the bar line, where it becomes the root of the next chord (Cmaj7, the Lydian colour of the IV under the
next bar's F#). Eight bars of 4/4, degrees 0-based from the tonic (7 = the octave).

The wind harp (`WindHarp`) is song-local (synth.py is not E6-audio's file): an aeolian harp, a bank of strings that
nobody plucks. Each string is a set of very narrow two-pole resonators, one per harmonic, and the wind is the
excitation: low-passed noise under a slow swell envelope, a separate gust of noise for every resonator so the harmonics
wander independently. So a note has no attack: it swells in as the wind catches it, sings on its harmonics while the
gust holds, and rings on and fades when the gust lets go (each resonator's own decay). Two strings per course a few
cents apart give the slow shimmer of a real harp in the wind; `harmonics` shifts the voice up onto its overtones (the
fundamental almost gone), the sound of a wind harp singing high in a strong wind.
"""
import math
import os
import sys

import numpy as np
from scipy import signal

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))   # tools/music, for a direct run
import synth  # noqa: E402
import lullaby as L  # noqa: E402
import e3_theme as T3  # noqa: E402

# (bar offset, beat, degree, duration in beats)
TUNE = [
    (0, 0.0, 0, 1), (0, 1.0, 4, 1), (0, 2.0, 5, 1), (0, 3.0, 3, 2),            # the motif; the 4th note held into bar 2
    (1, 1.0, 2, 0.5), (1, 1.5, 4, 0.5), (1, 2.0, 7, 2),                         # and the wind lifts it an octave
    (2, 0.0, 6, 1.5), (2, 1.5, 5, 0.5), (2, 2.0, 4, 1), (2, 3.0, 2, 1),
    (3, 0.0, 4, 3), (3, 3.0, 1, 1),
    (4, 0.0, 7, 1), (4, 1.0, 6, 0.5), (4, 1.5, 7, 0.5), (4, 2.0, 8, 1), (4, 3.0, 6, 1),   # F# over C: the Lydian #11
    (5, 0.0, 4, 2), (5, 2.0, 5, 1), (5, 3.0, 4, 1),
    (6, 0.0, 2, 1), (6, 1.0, 4, 1), (6, 2.0, 3, 1), (6, 3.0, 1, 1),
    (7, 0.0, 0, 4),
]
MOTIF = {(0, 0.0), (0, 1.0), (0, 2.0), (0, 3.0)}     # the four motif notes
HELD = (0, 3.0)                                       # the held fourth note
# per bar, [(beat, chord)]: G major for zephyr's B section (bar 4's C carries the F#: Lydian on the IV)
CHORDS_MAJOR = [[(0, 'G')], [(0, 'Cmaj7')], [(0, 'Em7')], [(0, 'D')], [(0, 'C')], [(0, 'G/B')],
                [(0, 'Am7'), (2, 'D7')], [(0, 'G')]]
# the same bars in E minor for the boss's quote (the town's song written as a storm)
CHORDS_MINOR = [[(0, 'Em')], [(0, 'Am7')], [(0, 'Cmaj7')], [(0, 'B7')], [(0, 'C')], [(0, 'G')],
                [(0, 'Am7'), (2, 'B7')], [(0, 'Em')]]

# chord helpers: e3_theme's, with the qualities Episode 6 needs (a local table; e3_theme is not changed)
_QUAL = dict(T3._QUAL)
_QUAL.update({'maj7#11': (0, 4, 6, 7, 11), '6': (0, 4, 7, 9), 'sus2': (0, 2, 7), 'add9': (0, 2, 4, 7),
              'm9': (0, 2, 3, 7, 10), '7b9': (0, 1, 4, 7, 10)})


def parse(name):
    """'Bbm7/D' -> (root_pc, [chord pcs], bass_pc)."""
    main, _, slash = name.partition('/')
    root = T3._ROOTS[main[0]]
    i = 1
    while i < len(main) and main[i] in '#b':
        root += 1 if main[i] == '#' else -1
        i += 1
    ivs = _QUAL[main[i:]]
    pcs = [(root + iv) % 12 for iv in ivs]
    bass = root % 12
    if slash:
        bass = (T3._ROOTS[slash[0]] + sum(1 if c == '#' else -1 for c in slash[1:])) % 12
    return root % 12, pcs, bass


def tones(name, lo, hi):
    _, pcs, _ = parse(name)
    return [p for p in range(lo, hi) if p % 12 in pcs]


def root_note(name, lo):
    _, _, bass = parse(name)
    return lo + (bass - lo) % 12


def fifth_note(name, lo):
    root, _, _ = parse(name)
    return lo + ((root + 7) - lo) % 12


def tune(tonic, mode, first_bar=1):
    """[(bar, beat, midi, dur, is_motif)] in 4/4, bars numbered from first_bar."""
    return [(first_bar + b, beat, L.pitch(tonic, mode, d), dur, (b, beat) in MOTIF) for b, beat, d, dur in TUNE]


def swing68(pos):
    """Map a 4/4 position in quarter beats to 6/8 written as three quarter beats a bar: each quarter becomes a dotted
    quarter (the 6/8 pulse) and an off-beat eighth becomes the last eighth of its group (the long-short lilt)."""
    k = int(pos // 1.0 + 1e-9)
    f = pos - k
    return 1.5 * k + (1.0 if f >= 0.5 - 1e-9 else 0.0)


def tune68(tonic, mode, first_bar=1, beats_per_bar=3.0):
    """The tune re-barred to 6/8 (two 6/8 bars per 4/4 bar, 16 bars). [(abs_beat, midi, dur, is_motif)] from first_bar."""
    out = []
    base = (first_bar - 1) * beats_per_bar
    for bar, beat, p, dur, motif in tune(tonic, mode, 1):
        a = (bar - 1) * 4.0 + beat
        s0 = swing68(a)
        s1 = swing68(a + dur)
        out.append((base + s0, p, s1 - s0, motif))
    return out


# ------------------------------------------------------------------------------------------------ the wind harp

def _resonate(x, f, tau, sr, gate=None, tau_after=None):
    """A two-pole resonator at f Hz, its ringing time constant tau (s), unity gain at f (roughly). With `gate` (a sample
    index) and `tau_after`, the same string continues after the gate from its exact state but rings with the longer
    time constant: it catches the wind fast and lets go slowly."""
    def coef(tt):
        r = math.exp(-1.0 / (tt * sr))
        w = 2.0 * math.pi * f / sr
        return [1.0, -2.0 * r * math.cos(w), r * r], [(1.0 - r) * 2.0 * math.sin(w)]
    a, b = coef(tau)
    if gate is None or tau_after is None or gate >= len(x) - 2:
        return signal.lfilter(b, a, x)
    y0 = signal.lfilter(b, a, x[:gate])
    a2, b2 = coef(tau_after)
    zi = signal.lfiltic(b2, a2, y=[y0[-1], y0[-2]])
    y1, _ = signal.lfilter(b2, a2, x[gate:], zi=zi)
    return np.concatenate([y0, y1])


def _smooth(n, sr, rng, rate):
    """A slow random curve (0..1-ish around 0.5), `rate` changes a second, cosine-interpolated."""
    k = max(2, int(n / sr * rate) + 3)
    pts = rng.random(k)
    pos = np.arange(n) / sr * rate
    i = np.minimum(pos.astype(int), k - 2)
    fr = pos - i
    w = 0.5 - 0.5 * np.cos(math.pi * fr)
    return pts[i] * (1 - w) + pts[i + 1] * w


class WindHarp(synth.Instrument):
    """An aeolian harp: strings excited by the wind instead of a pluck (see the module docstring).

    swell:     seconds for the gust to catch the string (an S-curve; no attack transient at all)
    ring:      seconds the fundamental rings after the gust lets go (time constant; upper harmonics ring shorter)
    catch:     the strings' time constant while the gust holds (short: the note speaks within a beat)
    harmonics: 0 = the full voice (the fundamental leads); 1 = singing on its overtones (2nd and 3rd lead, the
               fundamental a whisper), for the high echoes
    air:       the breath of the wind itself around the strings (band noise, a few percent)
    """
    name = 'windharp'

    def __init__(self, swell=0.32, ring=1.1, catch=0.22, harmonics=0.0, air=0.03, gust=0.12, release=None):
        self.swell = swell
        self.ring = ring
        self.catch = catch
        self.harmonics = harmonics
        self.air = air
        self.gust = gust
        self.release = 3.2 * ring if release is None else release

    def render(self, f0, gate_s, vel, sr, rng, **p):
        n = int(min(self.max_len, gate_s + self.release) * sr)
        t = np.arange(n) / sr
        # the wind: an S-curve swell to the gate, a wavering hold, then it lets go over ~0.12 s
        sw = np.clip(t / max(1e-3, self.swell), 0.0, 1.0)
        env = (0.5 - 0.5 * np.cos(math.pi * sw)) ** 1.4
        off = np.clip((t - gate_s) / 0.12, 0.0, 1.0)
        env *= 1.0 - (0.5 - 0.5 * np.cos(math.pi * off))
        h = self.harmonics
        # harmonic amplitudes: a string driven by the wind sings brightest on its low overtones
        amps = np.array([1.0, 0.5, 0.32, 0.2, 0.12, 0.07, 0.045, 0.03])
        if h:
            amps = amps * np.array([1.0 - 0.85 * h, 1.0 + 0.6 * h, 1.0 + 1.1 * h, 1.0 + 0.9 * h, 1.0 + 0.5 * h, 1.0, 1.0, 1.0])
        bright = 0.55 + 0.45 * vel
        y = np.zeros(n)
        for course, det in enumerate((-2.6, 2.9)):                     # two strings a few cents apart
            fc = f0 * 2.0 ** (det / 1200.0)
            for k, a in enumerate(amps, start=1):
                fk = fc * k
                if fk > 0.42 * sr:
                    break
                a *= bright ** (k - 1)
                g = rng.standard_normal(n)
                g = synth.filt(g, 'bp', fk, sr, q=9.0)                 # the gust that reaches this harmonic
                # each harmonic has its own gust: the wind never pushes the overtones together
                wav = 1.0 - self.gust + self.gust * 2.0 * _smooth(n, sr, rng, 1.3 + 0.4 * k)
                tau = self.ring / (1.0 + 0.35 * (k - 1)) * (0.9 if course else 1.0)
                y += a * _resonate(g * env * wav, fk, min(self.catch, tau), sr, gate=int(gate_s * sr), tau_after=tau)
        # the air: a little band noise around the fundamental and the octave, under the same gust
        if self.air:
            air = synth.filt(rng.standard_normal(n), 'bp', min(0.4 * sr, f0 * 2.0), sr, q=6.0)
            air = air * env
            y = y / (np.abs(y).max() + 1e-9) + self.air * air / (np.abs(air).max() + 1e-9)
        y = synth.filt(y, 'lp', 7500.0, sr, 0.7)
        y = synth.fade_edges(y, sr, 1.0, 40.0)
        return synth.normalize(y, 0.5 * (0.4 + 0.6 * vel))


class Swell(synth.Instrument):
    """Any instrument with a gust envelope on top: the note rises to its middle and falls (sin^p), so a sustained drone
    breathes like wind. `depth` 0..1 is how far it falls back at the ends."""

    def __init__(self, inner, depth=0.75, power=1.6):
        self.inner = synth.make(inner) if isinstance(inner, str) else inner
        self.name = self.inner.name
        self.stereo = getattr(self.inner, 'stereo', False)
        self.release = self.inner.release
        self.max_len = self.inner.max_len
        self.depth = depth
        self.power = power

    def render(self, f0, gate_s, vel, sr, rng, **p):
        y = self.inner.render(f0, gate_s, vel, sr, rng)
        n = y.shape[0]
        t = np.arange(n) / sr
        x = np.clip(t / max(1e-3, gate_s), 0.0, 1.0)
        e = (1.0 - self.depth) + self.depth * np.sin(math.pi * x) ** self.power
        e[t > gate_s] = (1.0 - self.depth)
        return y * (e[:, None] if y.ndim == 2 else e)


class Cymbal(synth.Instrument):
    """A light suspended cymbal, two strokes chosen by pitch: below C4 a soft mallet roll that swells over the note's
    length and lets go at its end (the wind lifting into a downbeat), from C4 up a light stick tap on the bow with a short
    shimmer. Dense inharmonic partials (3 to 12 kHz) over shaped noise; no crash, nothing harsh."""
    name = 'cymbal'
    release = 1.6

    def render(self, f0, gate_s, vel, sr, rng, **p):
        roll = f0 < 261.0
        n = int(((gate_s if roll else 0.0) + self.release) * sr)
        t = np.arange(n) / sr
        ratios = np.array([1.0, 1.183, 1.411, 1.587, 1.764, 2.03, 2.31, 2.59, 2.87, 3.2, 3.61])
        base = 2900.0 + 300.0 * rng.random()
        y = np.zeros(n)
        for r in ratios:
            y += np.sin(2 * math.pi * base * r * t + rng.random() * 6.283) * (0.4 + 0.6 * rng.random())
        y = 0.25 * y / len(ratios) + synth.filt(synth.noise(n, rng), 'hp', 3800.0, sr, 0.7)
        y = synth.filt(y, 'hp', 2500.0, sr, 0.7)
        if roll:
            g = max(1, int(gate_s * sr))
            x = np.clip(t / (gate_s + 1e-9), 0.0, 1.0)
            env = x ** 2.2
            env[g:] = np.exp(-(t[g:] - gate_s) / 0.5)
            y *= env * (1.0 + 0.15 * np.sin(2 * math.pi * 11.0 * t))       # the mallets' flutter
        else:
            y *= np.exp(-t / 0.42) * (1.0 - np.exp(-t / 0.0015))
            y += synth.filt(synth.noise(n, rng), 'bp', 6200.0, sr, q=1.2) * np.exp(-t / 0.01) * 0.6
        y = synth.fade_edges(y, sr, 0.5, 30.0)
        return synth.normalize(y, 0.5 * (0.3 + 0.7 * vel))


def check():
    for b in range(8):
        tot = sum(dur for bb, beat, d, dur in TUNE if bb == b)
        if b not in (0, 1):                     # bar 0 carries the held note into bar 1, which then adds the rest
            assert abs(tot - 4.0) < 1e-9, (b, tot)
    assert abs(sum(d for bb, _, _, d in TUNE if bb in (0, 1)) - 8.0) < 1e-9
    assert [d for bb, beat, d, dur in TUNE if (bb, beat) in MOTIF] == [0, 4, 5, 3]
    assert [b for b, beat, d, dur in TUNE if (b, beat) == HELD and beat + dur > 4.0] == [0], 'the C held over the bar line'
    # the motif's intervals in G major are the name motif exactly (0 +7 +9 +5): G D E C
    m = [p for _, _, p, _, mo in tune(67, 'major') if mo]
    assert [x - m[0] for x in m] == [0, 7, 9, 5], m
    assert [x % 12 for x in m] == [7, 2, 4, 0], 'G D E C'
    # every tune note is in G major and bar 5 (index 4) has the F# over C
    assert all(p % 12 in (7, 9, 11, 0, 2, 4, 6) for _, _, p, _, _ in tune(67, 'major'))
    assert any(p % 12 == 6 for b, _, p, _, _ in tune(67, 'major') if b == 5)
    # 6/8: every note starts on an eighth, the quote fills sixteen bars of 3 beats, the motif's pulses are dotted quarters
    t = tune68(64, 'aeolian')
    assert all(abs((s * 2) - round(s * 2)) < 1e-9 for s, _, _, _ in t)
    assert abs(t[-1][0] + t[-1][2] - 48.0) < 1e-9, t[-1]
    assert [s for s, _, _, mo in t if mo] == [0.0, 1.5, 3.0, 4.5], 'one motif note on each 6/8 pulse'
    assert [p % 12 for _, p, _, mo in t if mo] == [4, 11, 0, 9], 'E B C A in E minor'
    # the chord tables parse
    for bars in (CHORDS_MAJOR, CHORDS_MINOR):
        assert len(bars) == 8
        for segs in bars:
            for _, c in segs:
                parse(c)
    return True


if __name__ == '__main__':
    print('ep6 theme check', check())
