"""Shared material for the Episode 5 tracks (E5-audio): the Saffron tune, written once in scale degrees, and the oud.

`saffron` (ep5_saffron.py) plays the tune in F major in its B section (the caravans' warmth, the relative major of D
minor); `boss_oracle` (ep5_boss_oracle.py) quotes it in C minor in its B section, re-barred to 12/8 by `swing128` (each
quarter a dotted quarter, each off-beat eighth the last eighth of its group): the town's own song read as an ending.

The tune opens with the complete name motif, degrees 0 4 5 3 (F C D Bb in F major). In D minor, the A section of
`saffron`, the oud plays the same four pitches from the third of the key (F C D Bb), and its fourth note is bent down a
half step onto A, the fifth of the key, as the harmony moves under it: the town's sigh. In the tune itself (the B
section) the fourth note is held and not bent. Eight bars of 4/4, degrees 0-based from the tonic (7 = the octave).

The oud (`Oud`) is song-local (synth.py is not E5-audio's file): two courses of a Karplus-Strong string a few cents
apart, plucked near the bridge, a wooden body with a low hollow and a nasal mid, a plectrum click, no frets. `bend`
semitones (negative = down) glide in after `bend_delay` seconds over `bend_time`: the bent note is the same string
played slower, read back through a time-varying resampler, so the pitch moves while the string rings.
"""
import math
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))   # tools/music, for a direct run
import synth  # noqa: E402
import lullaby as L

# (bar offset, beat, degree, duration in beats)
TUNE = [
    (0, 0.0, 0, 1), (0, 1.0, 4, 1), (0, 2.0, 5, 1), (0, 3.0, 3, 2),            # the motif; the 4th note held into bar 2
    (1, 1.0, 2, 0.5), (1, 1.5, 1, 0.5), (1, 2.0, 2, 1), (1, 3.0, 4, 1),
    (2, 0.0, 5, 1.5), (2, 1.5, 4, 0.5), (2, 2.0, 3, 1), (2, 3.0, 2, 1),
    (3, 0.0, 1, 3), (3, 3.0, 4, 1),
    (4, 0.0, 7, 1.5), (4, 1.5, 6, 0.5), (4, 2.0, 5, 1), (4, 3.0, 4, 1),
    (5, 0.0, 5, 2), (5, 2.0, 3, 1), (5, 3.0, 1, 1),
    (6, 0.0, 2, 1), (6, 1.0, 4, 1), (6, 2.0, 3, 1), (6, 3.0, 1, 1),
    (7, 0.0, 1, 2), (7, 2.0, -1, 2),
]
MOTIF = {(0, 0.0), (0, 1.0), (0, 2.0), (0, 3.0)}     # the four motif notes
HELD = (0, 3.0)                                       # the held fourth note
# per bar, [(beat, chord)]: F major for saffron's B section
CHORDS_MAJOR = [[(0, 'F')], [(0, 'Gm7')], [(0, 'Bbmaj7')], [(0, 'C')], [(0, 'Dm7')], [(0, 'Gm')],
                [(0, 'F'), (2, 'Gm7')], [(0, 'Csus4'), (2, 'C')]]
# the same bars in C minor for the boss's quote (the raised leading tone B over the last dominant)
CHORDS_MINOR = [[(0, 'Cm')], [(0, 'Eb')], [(0, 'Abmaj7')], [(0, 'G')], [(0, 'Fm7')], [(0, 'Fm6')],
                [(0, 'Cm'), (2, 'G7')], [(0, 'Gsus4'), (2, 'G')]]


def tune(tonic, mode, first_bar=1, raise_last=False):
    """[(bar, beat, midi, dur, is_motif)] in 4/4. raise_last=True raises degree -1 in the last bar a half step (the
    leading tone over the dominant in a minor key)."""
    out = []
    for b, beat, d, dur in TUNE:
        p = L.pitch(tonic, mode, d)
        if raise_last and b == 7 and d == -1:
            p += 1
        out.append((first_bar + b, beat, p, dur, (b, beat) in MOTIF))
    return out


def swing128(pos):
    """Map a 4/4 position in quarter beats to 12/8 written as six quarter beats a bar: each quarter becomes a dotted
    quarter (the 12/8 pulse) and an off-beat eighth becomes the last eighth of its group (long-short lilt)."""
    k = int(pos // 1.0)
    f = pos - k
    return 1.5 * k + (1.0 if f >= 0.5 - 1e-9 else 0.0)


def tune128(tonic, mode, first_bar=1, beats_per_bar=6.0, raise_last=False):
    """The tune re-barred to 12/8 (one 12/8 bar per 4/4 bar). [(abs_beat, midi, dur, is_motif)] from first_bar."""
    out = []
    base = (first_bar - 1) * beats_per_bar
    for bar, beat, p, dur, motif in tune(tonic, mode, 1, raise_last):
        a = (bar - 1) * 4.0 + beat
        s0 = swing128(a)
        s1 = swing128(a + dur)
        out.append((base + s0, p, s1 - s0, motif))
    return out


# ------------------------------------------------------------------------------------------------ the oud

def bend_resample(y, sr, semis):
    """Read y back at a time-varying rate 2**(semis[t]/12) (semis per output sample). Returns len(semis) samples."""
    rate = 2.0 ** (np.asarray(semis) / 12.0)
    pos = np.concatenate([[0.0], np.cumsum(rate[:-1])])
    pos = np.minimum(pos, len(y) - 1.001)
    return np.interp(pos, np.arange(len(y)), y)


class Oud(synth.Instrument):
    """A fretless short-necked lute: two courses, plucked near the bridge with a plectrum, a woody body.

    decay: seconds to -60 dB at the reference pitch (low notes ring longer, as on a real string).
    bend:  semitones the note glides by (negative = down) after bend_delay seconds, over bend_time seconds;
           a light vibrato follows the bend (the finger settling on the new pitch).
    """
    name = 'oud'
    release = 1.1

    def __init__(self, decay=1.4, brightness=0.62, bend=0.0, bend_delay=0.6, bend_time=0.3, release=1.1, body=1.0):
        self.decay = decay
        self.brightness = brightness
        self.bend = bend
        self.bend_delay = bend_delay
        self.bend_time = bend_time
        self.release = release
        self.body = body

    def render(self, f0, gate_s, vel, sr, rng, **p):
        n = int(min(self.max_len, gate_s + self.release) * sr)
        extra = int(n * 0.1) + 64 if self.bend else 0
        dec = self.decay * (0.75 + 0.25 * vel) * (1.0 + 0.35 * max(0.0, math.log2(220.0 / f0)))
        a = synth.karplus_strong(f0 * 0.99915, n + extra, sr, rng, decay_t=dec, brightness=self.brightness * (0.7 + 0.3 * vel),
                                 vel=vel, pick_pos=0.1)
        b = synth.karplus_strong(f0 * 1.00095, n + extra, sr, rng, decay_t=dec * 0.92,
                                 brightness=self.brightness * (0.65 + 0.3 * vel), vel=vel, pick_pos=0.155)
        v = a + 0.85 * b
        if self.bend:
            t = np.arange(n) / sr
            x = np.clip((t - self.bend_delay) / max(1e-3, self.bend_time), 0.0, 1.0)
            curve = 0.5 - 0.5 * np.cos(math.pi * x)                     # an S-curve glide
            settle = np.clip((t - self.bend_delay - self.bend_time) / 0.25, 0.0, 1.0)
            vib = 0.07 * settle * np.sin(2 * math.pi * 5.2 * np.maximum(0.0, t - self.bend_delay - self.bend_time))
            v = bend_resample(v, sr, self.bend * curve + vib)
        else:
            v = v[:n]
        # the body: a low hollow, a nasal mid, a soft top
        v = synth.filt(v, 'peak', 135.0, sr, q=1.3, gain_db=3.5 * self.body)
        v = synth.filt(v, 'peak', 1150.0, sr, q=1.5, gain_db=3.0 * self.body)
        v = synth.filt(v, 'lp', 5200.0, sr, 0.7)
        t = np.arange(n) / sr
        click = synth.filt(synth.noise(n, rng), 'bp', 2900.0, sr, q=1.6) * np.exp(-t / 0.0022) * (0.08 + 0.1 * vel)
        v = v + click
        # tame the pick spike against the ringing body (the tracker normalizes by peak, so an untamed spike makes the
        # string itself quiet): a soft clip at 1.8x the body's peak over the first 40 ms, crossfaded back to the dry string
        k0, k1 = int(0.04 * sr), int(0.2 * sr)
        if n > k1:
            lim = 1.8 * float(np.abs(v[k0:k1]).max()) + 1e-9
            w = np.clip((np.arange(k0) - 0.6 * k0) / (0.4 * k0), 0.0, 1.0)
            v[:k0] = (1.0 - w) * lim * np.tanh(v[:k0] / lim) + w * v[:k0]
        # the player lifts the finger at the end of the gate: a fast damp, not a cut
        g = int(gate_s * sr)
        if g < n:
            k = n - g
            v[g:] *= np.exp(-np.arange(k) / sr / 0.16)
        v = synth.fade_edges(v, sr, 0.3, 25.0)
        return synth.normalize(v, 0.5 * (0.42 + 0.58 * vel))


class Tar(synth.Instrument):
    """A frame drum played with the fingers (tar / riq style), two strokes chosen by pitch: below C4 the open 'dum' (a
    deep skin in the middle of the head), from C4 up the 'tek' (a dry slap on the rim with a thin jingle-free crack)."""
    name = 'tar'
    release = 0.3

    def render(self, f0, gate_s, vel, sr, rng, **p):
        n = int(0.6 * sr)
        t = np.arange(n) / sr
        if f0 < 261.0:
            f = f0 * (1.0 + 0.35 * np.exp(-t / 0.03))
            body = np.sin(2 * math.pi * np.cumsum(f) / sr) * np.exp(-t / (0.16 + 0.08 * vel))
            skin = synth.filt(synth.noise(n, rng), 'bp', 700.0, sr, q=0.9) * np.exp(-t / 0.02) * 0.35
            v = body + skin
            v = synth.filt(v, 'lp', 2600.0, sr, 0.7)
        else:
            crack = synth.filt(synth.noise(n, rng), 'bp', 2400.0 + f0 * 2.0, sr, q=1.1) * np.exp(-t / 0.012)
            ring = np.sin(2 * math.pi * f0 * 1.9 * t) * np.exp(-t / 0.035) * 0.35
            knock = np.sin(2 * math.pi * f0 * t) * np.exp(-t / 0.02) * 0.5
            v = crack + ring + knock
            v = synth.filt(v, 'hp', 300.0, sr, 0.7)
        v = v * (1.0 - np.exp(-t / 0.0006))
        return synth.normalize(v, 0.5 * (0.35 + 0.65 * vel))


def check():
    for b in range(8):
        tot = sum(dur for bb, beat, d, dur in TUNE if bb == b)
        if b not in (0, 1):                     # bar 0 carries the held note into bar 1, which then adds the rest
            assert abs(tot - 4.0) < 1e-9, (b, tot)
    assert abs(sum(d for bb, _, _, d in TUNE if bb in (0, 1)) - 8.0) < 1e-9
    assert [d for bb, beat, d, dur in TUNE if (bb, beat) in MOTIF] == [0, 4, 5, 3]
    # the motif's intervals in F major are the name motif exactly (0 +7 +9 +5)
    m = [p for _, _, p, _, mo in tune(65, 'major') if mo]
    assert [x - m[0] for x in m] == [0, 7, 9, 5], m
    # 12/8: every note starts on an eighth and the quote fills eight bars of 6 beats
    t = tune128(60, 'aeolian', raise_last=True)
    assert all(abs((s * 2) - round(s * 2)) < 1e-9 for s, _, _, _ in t)
    assert abs(t[-1][0] + t[-1][2] - 48.0) < 1e-9, t[-1]
    assert t[-1][1] % 12 == 11, 'the raised leading tone B in the last bar'
    return True


if __name__ == '__main__':
    print('ep5 theme check', check())
