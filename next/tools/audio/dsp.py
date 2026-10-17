"""Small DSP toolkit for Lexicon Quest NEXT sound design (numpy + scipy).

Everything is deterministic: random sources take an explicit numpy Generator.
Signals are float64 numpy arrays, mono shape (n,) or stereo shape (n, 2).
Synthesis normally runs at RENDER_SR (44.1 kHz, band-limited oscillators) and is
decimated to the delivery rate by `resample`, which removes aliasing cleanly.
"""
from __future__ import annotations

import math
import wave
from pathlib import Path

import numpy as np
from scipy import signal

RENDER_SR = 44100
TAU = 2.0 * math.pi

NOTE_INDEX = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}


# ----------------------------------------------------------------------------- basics
def rng(seed: int) -> np.random.Generator:
    return np.random.default_rng(seed)


def ns(dur: float, sr: int = RENDER_SR) -> int:
    return max(1, int(round(dur * sr)))


def tvec(n: int, sr: int = RENDER_SR) -> np.ndarray:
    return np.arange(n) / sr


def midi_hz(m: float) -> float:
    return 440.0 * 2.0 ** ((m - 69) / 12.0)


def note_midi(name: str) -> int:
    """'C4' = 60, 'F#5', 'Bb3'."""
    name = name.strip()
    letter = name[0].upper()
    i = 1
    acc = 0
    while i < len(name) and name[i] in "#b":
        acc += 1 if name[i] == "#" else -1
        i += 1
    octave = int(name[i:])
    return 12 * (octave + 1) + NOTE_INDEX[letter] + acc


def note_hz(name: str) -> float:
    return midi_hz(note_midi(name))


def db(x: float) -> float:
    return 10.0 ** (x / 20.0)


def to_db(x: float) -> float:
    return 20.0 * math.log10(max(1e-12, x))


def as_arr(v, n: int) -> np.ndarray:
    a = np.asarray(v, dtype=float)
    if a.ndim == 0:
        return np.full(n, float(a))
    if len(a) != n:
        a = np.interp(np.linspace(0, 1, n), np.linspace(0, 1, len(a)), a)
    return a


def glide(f0: float, f1: float, n: int, curve: str = "exp", power: float = 1.0) -> np.ndarray:
    """Frequency trajectory from f0 to f1 over n samples (exp = musical/log glide)."""
    x = np.linspace(0.0, 1.0, n) ** power
    if curve == "exp" and f0 > 0 and f1 > 0:
        return f0 * (f1 / f0) ** x
    return f0 + (f1 - f0) * x


# ----------------------------------------------------------------------------- oscillators
def _phase(freq, n: int, sr: int, phase0: float = 0.0):
    f = as_arr(freq, n)
    inc = f / sr
    ph = phase0 + np.concatenate(([0.0], np.cumsum(inc[:-1])))
    return ph, np.abs(inc)


def _blep(t: np.ndarray, dt: np.ndarray) -> np.ndarray:
    out = np.zeros_like(t)
    dt = np.maximum(dt, 1e-9)
    m = t < dt
    x = t[m] / dt[m]
    out[m] = x + x - x * x - 1.0
    m2 = t > 1.0 - dt
    x = (t[m2] - 1.0) / dt[m2]
    out[m2] = x * x + x + x + 1.0
    return out


def sine(freq, n: int, sr: int = RENDER_SR, phase0: float = 0.0) -> np.ndarray:
    ph, _ = _phase(freq, n, sr, phase0)
    return np.sin(TAU * ph)


def saw(freq, n: int, sr: int = RENDER_SR, phase0: float = 0.0) -> np.ndarray:
    ph, dt = _phase(freq, n, sr, phase0)
    t = ph % 1.0
    return 2.0 * t - 1.0 - _blep(t, dt)


def pulse(freq, n: int, sr: int = RENDER_SR, duty=0.5, phase0: float = 0.0) -> np.ndarray:
    """Band-limited pulse (PolyBLEP). duty may be an array (PWM). DC removed."""
    ph, dt = _phase(freq, n, sr, phase0)
    d = np.clip(as_arr(duty, n), 0.02, 0.98)
    t = ph % 1.0
    y = np.where(t < d, 1.0, -1.0)
    y = y + _blep(t, dt)
    y = y - _blep((t - d) % 1.0, dt)
    return y - (2.0 * d - 1.0)


def square(freq, n: int, sr: int = RENDER_SR, phase0: float = 0.0) -> np.ndarray:
    return pulse(freq, n, sr, 0.5, phase0)


def triangle(freq, n: int, sr: int = RENDER_SR, phase0: float = 0.0, steps: int = 0) -> np.ndarray:
    """Triangle. steps=16 gives the stepped 4-bit chip triangle."""
    ph, _ = _phase(freq, n, sr, phase0)
    t = (ph + 0.25) % 1.0
    y = 1.0 - 4.0 * np.abs(t - 0.5)
    if steps:
        y = np.round((y + 1.0) * 0.5 * (steps - 1)) / (steps - 1) * 2.0 - 1.0
    return y


def supersaw(freq, n: int, sr: int = RENDER_SR, voices: int = 3, detune_cents: float = 12.0, g: np.random.Generator | None = None) -> np.ndarray:
    g = g or rng(1)
    out = np.zeros(n)
    f = as_arr(freq, n)
    for i in range(voices):
        c = 0.0 if voices == 1 else (i / (voices - 1) * 2.0 - 1.0) * detune_cents
        out += saw(f * 2 ** (c / 1200.0), n, sr, g.random())
    return out / math.sqrt(voices)


def fm(carrier, ratio: float, index, n: int, sr: int = RENDER_SR, fb: float = 0.0) -> np.ndarray:
    """Two-operator FM: sin(2pi fc t + index * sin(2pi fc*ratio t))."""
    fc = as_arr(carrier, n)
    mph, _ = _phase(fc * ratio, n, sr)
    mod = np.sin(TAU * mph) * as_arr(index, n)
    cph, _ = _phase(fc, n, sr)
    return np.sin(TAU * cph + mod)


def partials(freq: float, ratios, amps, decays, n: int, sr: int = RENDER_SR, g: np.random.Generator | None = None) -> np.ndarray:
    """Sum of sine partials with individual exponential decays (bells, glass, metal)."""
    g = g or rng(2)
    t = tvec(n, sr)
    out = np.zeros(n)
    for r, a, d in zip(ratios, amps, decays):
        f = freq * r
        if f >= sr * 0.45:
            continue
        out += a * np.sin(TAU * f * t + g.random() * TAU) * np.exp(-t / d)
    return out


# ----------------------------------------------------------------------------- noise
def white(n: int, g: np.random.Generator) -> np.ndarray:
    return g.uniform(-1.0, 1.0, n)


def colored(n: int, g: np.random.Generator, slope_db_oct: float = -3.0, periodic: bool = False) -> np.ndarray:
    """Noise with a spectral slope (-3 = pink, -6 = brown). FFT shaped, so it is circular (loopable)."""
    x = g.standard_normal(n)
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(n)
    f[0] = f[1] if n > 1 else 1.0
    X *= (f / f[min(len(f) - 1, max(1, len(f) // 100))]) ** (slope_db_oct / 6.0206)
    X[0] = 0.0
    y = np.fft.irfft(X, n)
    return y / (np.max(np.abs(y)) + 1e-12)


def pink(n: int, g: np.random.Generator) -> np.ndarray:
    return colored(n, g, -3.0)


def brown(n: int, g: np.random.Generator) -> np.ndarray:
    return colored(n, g, -6.0)


def lfsr_noise(n: int, sr: int, rate, short: bool = False, seed: int = 1) -> np.ndarray:
    """NES-style 15-bit LFSR noise, sample-and-hold at `rate` Hz (array allowed for sweeps)."""
    r = as_arr(rate, n)
    clocks = np.floor(np.cumsum(r / sr)).astype(np.int64)
    total = int(clocks[-1]) + 2
    reg = 1 if seed == 0 else seed & 0x7FFF
    tap = 6 if short else 1
    seq = np.empty(total)
    for i in range(total):
        bit = (reg ^ (reg >> tap)) & 1
        reg = (reg >> 1) | (bit << 14)
        seq[i] = 1.0 if reg & 1 else -1.0
    return seq[clocks]


def crackle(n: int, g: np.random.Generator, density: float, sr: int = RENDER_SR, decay: float = 0.0015) -> np.ndarray:
    """Sparse random impulses with tiny exponential tails (fire, paper, gravel)."""
    out = np.zeros(n)
    count = int(density * n / sr)
    if count <= 0:
        return out
    pos = g.integers(0, n, count)
    amp = g.uniform(0.2, 1.0, count) * g.choice([-1.0, 1.0], count)
    np.add.at(out, pos, amp)
    k = np.exp(-tvec(ns(decay * 6, sr), sr) / decay)
    return signal.fftconvolve(out, k)[:n]


# ----------------------------------------------------------------------------- envelopes
def env_points(points, n: int, sr: int = RENDER_SR, curve: float = 1.0) -> np.ndarray:
    """Piecewise envelope from [(time_s, value), ...]. curve>1 makes segments exponential-ish."""
    ts = np.array([p[0] for p in points], float)
    vs = np.array([p[1] for p in points], float)
    t = tvec(n, sr)
    if curve == 1.0:
        return np.interp(t, ts, vs)
    out = np.empty(n)
    out[:] = vs[-1]
    out[t < ts[0]] = vs[0]
    for i in range(len(ts) - 1):
        m = (t >= ts[i]) & (t < ts[i + 1])
        if not m.any():
            continue
        x = (t[m] - ts[i]) / max(1e-9, ts[i + 1] - ts[i])
        if vs[i + 1] < vs[i]:
            x = 1.0 - (1.0 - x) ** curve
        else:
            x = x ** (1.0 / curve) if curve < 1 else x
        out[m] = vs[i] + (vs[i + 1] - vs[i]) * x
    return out


def env_exp(n: int, sr: int = RENDER_SR, decay: float = 0.1, attack: float = 0.002, hold: float = 0.0) -> np.ndarray:
    """Linear attack, optional hold, then exponential decay with time constant `decay`."""
    t = tvec(n, sr)
    a = np.clip(t / max(attack, 1e-6), 0.0, 1.0)
    d = np.exp(-np.maximum(0.0, t - attack - hold) / max(decay, 1e-6))
    return a * d


def env_adsr(n: int, sr: int, a: float, d: float, s: float, r: float, gate: float) -> np.ndarray:
    t = tvec(n, sr)
    e = np.zeros(n)
    att = t < a
    e[att] = t[att] / max(a, 1e-6)
    dec = (t >= a) & (t < gate)
    e[dec] = s + (1.0 - s) * np.exp(-(t[dec] - a) / max(d, 1e-6))
    gate_level = s + (1.0 - s) * math.exp(-max(0.0, gate - a) / max(d, 1e-6)) if gate >= a else gate / max(a, 1e-6)
    rel = t >= gate
    e[rel] = gate_level * np.exp(-(t[rel] - gate) / max(r, 1e-6))
    return e


def lfo(rate, n: int, sr: int = RENDER_SR, depth: float = 1.0, phase0: float = 0.0, delay: float = 0.0, fade: float = 0.0) -> np.ndarray:
    y = sine(rate, n, sr, phase0) * depth
    if delay or fade:
        t = tvec(n, sr)
        y *= np.clip((t - delay) / max(fade, 1e-6), 0.0, 1.0)
    return y


def smooth_random(n: int, g: np.random.Generator, rate_hz: float, sr: int = RENDER_SR, periodic: bool = False) -> np.ndarray:
    """Band-limited random control signal in about [-1, 1] (gusts, flicker). periodic=True loops."""
    if periodic:
        X = np.zeros(n // 2 + 1, complex)
        kmax = max(1, int(rate_hz * n / sr))
        k = np.arange(1, kmax + 1)
        X[1:kmax + 1] = (g.standard_normal(kmax) + 1j * g.standard_normal(kmax)) / np.sqrt(k)
        y = np.fft.irfft(X, n)
    else:
        m = max(4, int(n * rate_hz / sr) + 4)
        pts = g.uniform(-1, 1, m)
        y = signal.resample(pts, n)
    return y / (np.max(np.abs(y)) + 1e-12)


# ----------------------------------------------------------------------------- filters
def biquad_coef(kind: str, f0: float, q: float = 0.7071, sr: int = RENDER_SR, gain_db: float = 0.0):
    f0 = min(max(f0, 5.0), sr * 0.49)
    w = TAU * f0 / sr
    cw, sw = math.cos(w), math.sin(w)
    alpha = sw / (2.0 * q)
    A = 10 ** (gain_db / 40.0)
    if kind == "lp":
        b = [(1 - cw) / 2, 1 - cw, (1 - cw) / 2]
        a = [1 + alpha, -2 * cw, 1 - alpha]
    elif kind == "hp":
        b = [(1 + cw) / 2, -(1 + cw), (1 + cw) / 2]
        a = [1 + alpha, -2 * cw, 1 - alpha]
    elif kind == "bp":  # constant 0 dB peak gain
        b = [alpha, 0.0, -alpha]
        a = [1 + alpha, -2 * cw, 1 - alpha]
    elif kind == "notch":
        b = [1.0, -2 * cw, 1.0]
        a = [1 + alpha, -2 * cw, 1 - alpha]
    elif kind == "peak":
        b = [1 + alpha * A, -2 * cw, 1 - alpha * A]
        a = [1 + alpha / A, -2 * cw, 1 - alpha / A]
    elif kind == "lowshelf":
        sa = 2 * math.sqrt(A) * alpha
        b = [A * ((A + 1) - (A - 1) * cw + sa), 2 * A * ((A - 1) - (A + 1) * cw), A * ((A + 1) - (A - 1) * cw - sa)]
        a = [(A + 1) + (A - 1) * cw + sa, -2 * ((A - 1) + (A + 1) * cw), (A + 1) + (A - 1) * cw - sa]
    elif kind == "highshelf":
        sa = 2 * math.sqrt(A) * alpha
        b = [A * ((A + 1) + (A - 1) * cw + sa), -2 * A * ((A - 1) + (A + 1) * cw), A * ((A + 1) + (A - 1) * cw - sa)]
        a = [(A + 1) - (A - 1) * cw + sa, 2 * ((A - 1) - (A + 1) * cw), (A + 1) - (A - 1) * cw - sa]
    else:
        raise ValueError(kind)
    b = np.array(b) / a[0]
    a = np.array(a) / a[0]
    return b, a


def bq(x: np.ndarray, kind: str, f0: float, q: float = 0.7071, sr: int = RENDER_SR, gain_db: float = 0.0) -> np.ndarray:
    b, a = biquad_coef(kind, f0, q, sr, gain_db)
    return signal.lfilter(b, a, x, axis=0)


def bq_tv(x: np.ndarray, kind: str, f0, q=0.7071, sr: int = RENDER_SR, block: int = 32) -> np.ndarray:
    """Time-varying biquad (sweeps). f0 and q may be arrays (len(x)) or scalars."""
    n = len(x)
    f = as_arr(f0, n)
    qq = as_arr(q, n)
    y = np.empty(n)
    zi = np.zeros(2)
    for s in range(0, n, block):
        e = min(n, s + block)
        b, a = biquad_coef(kind, float(f[s]), float(qq[s]), sr)
        y[s:e], zi = signal.lfilter(b, a, x[s:e], zi=zi)
    return y


def butter(x: np.ndarray, kind: str, fc, sr: int = RENDER_SR, order: int = 4) -> np.ndarray:
    """Zero-surprise Butterworth (sos). kind: low, high, band (fc=(lo,hi))."""
    nyq = sr * 0.5
    if kind == "band":
        wn = [min(0.999, max(1e-4, fc[0] / nyq)), min(0.999, max(1e-4, fc[1] / nyq))]
    else:
        wn = min(0.999, max(1e-4, fc / nyq))
    sos = signal.butter(order, wn, btype=kind, output="sos")
    return signal.sosfilt(sos, x, axis=0)


def onepole_lp(x: np.ndarray, fc: float, sr: int = RENDER_SR) -> np.ndarray:
    a = math.exp(-TAU * fc / sr)
    return signal.lfilter([1 - a], [1, -a], x, axis=0)


def dc_block(x: np.ndarray, sr: int = RENDER_SR, fc: float = 18.0) -> np.ndarray:
    return butter(x, "high", fc, sr, order=2)


def resonator(x: np.ndarray, freqs, qs, gains, sr: int = RENDER_SR) -> np.ndarray:
    """Parallel band-pass bank (modal resonances: wood, glass, metal)."""
    out = np.zeros_like(x)
    for f, q, gn in zip(freqs, qs, gains):
        if f < sr * 0.45:
            out += gn * bq(x, "bp", f, q, sr)
    return out


# ----------------------------------------------------------------------------- effects
def saturate(x: np.ndarray, drive: float = 2.0) -> np.ndarray:
    return np.tanh(drive * x) / math.tanh(drive)


def bitcrush(x: np.ndarray, bits: float) -> np.ndarray:
    q = 2 ** (bits - 1)
    return np.round(x * q) / q


def sample_hold(x: np.ndarray, rate, sr: int = RENDER_SR) -> np.ndarray:
    """Sample-rate reduction (zipper/decimation effect). rate may sweep (array)."""
    n = len(x)
    r = as_arr(rate, n)
    idx = np.floor(np.cumsum(r / sr)).astype(np.int64)
    first = np.searchsorted(idx, idx, side="left")
    return x[first]


def chorus(x: np.ndarray, sr: int = RENDER_SR, depth_ms: float = 2.5, rate: float = 0.9, mix: float = 0.5, base_ms: float = 12.0, phase: float = 0.0) -> np.ndarray:
    n = len(x)
    t = np.arange(n)
    d = (base_ms + depth_ms * np.sin(TAU * rate * t / sr + phase)) * sr / 1000.0
    y = np.interp(t - d, t, x, left=0.0)
    return x * (1 - mix) + y * mix


def pan(x: np.ndarray, p: float = 0.0) -> np.ndarray:
    """Equal-power pan of a mono signal, p in [-1, 1]. Returns (n, 2)."""
    a = (p + 1.0) * math.pi / 4.0
    return np.stack([x * math.cos(a), x * math.sin(a)], axis=1) * math.sqrt(2.0)


def stereo(x: np.ndarray) -> np.ndarray:
    return x if x.ndim == 2 else np.stack([x, x], axis=1)


def mono(x: np.ndarray) -> np.ndarray:
    return x if x.ndim == 1 else x.mean(axis=1)


def reverb_ir(sr: int = RENDER_SR, t60: float = 1.2, predelay: float = 0.012, bright: float = 0.6, seed: int = 7, early: int = 6, stereo_out: bool = True) -> np.ndarray:
    """Synthetic room/plate impulse response. High bands decay faster (bright 0..1 controls it)."""
    g = rng(seed)
    n = ns(t60 * 1.15 + predelay, sr)
    t = tvec(n, sr)
    chans = []
    for c in range(2 if stereo_out else 1):
        noise = g.standard_normal(n)
        bands = [
            (butter(noise, "low", 400, sr, 2), 1.15),
            (butter(noise, "band", (400, 2000), sr, 2), 1.0),
            (butter(noise, "band", (2000, 6000), sr, 2), 0.55 + 0.35 * bright),
            (butter(noise, "high", 6000, sr, 2), 0.3 + 0.4 * bright),
        ]
        tail = np.zeros(n)
        for sig_b, k in bands:
            tail += sig_b * 10 ** (-3.0 * np.maximum(0.0, t - predelay) / (t60 * k))
        tail[t < predelay] = 0.0
        onset = np.clip((t - predelay) / 0.02, 0.0, 1.0)
        tail *= onset
        er = np.zeros(n)
        for i in range(early):
            d = predelay * 0.4 + g.uniform(0.003, 0.045)
            k = int(d * sr)
            if k < n:
                er[k] += g.uniform(0.3, 0.8) * g.choice([-1, 1]) * (1.0 - i / (early + 1))
        ir = tail / (np.sqrt(np.sum(tail ** 2)) + 1e-12) + er * 0.35
        chans.append(ir / (np.sqrt(np.sum(ir ** 2)) + 1e-12))
    return np.stack(chans, axis=1) if stereo_out else chans[0]


_IR_CACHE: dict = {}


def reverb(x: np.ndarray, sr: int = RENDER_SR, t60: float = 1.0, wet: float = 0.25, dry: float = 1.0, predelay: float = 0.012, bright: float = 0.6, seed: int = 7, out_stereo: bool = True, extend: bool = True) -> np.ndarray:
    key = (sr, round(t60, 3), round(predelay, 4), round(bright, 3), seed)
    if key not in _IR_CACHE:
        _IR_CACHE[key] = reverb_ir(sr, t60, predelay, bright, seed)
    ir = _IR_CACHE[key]
    xm = mono(x)
    n = len(xm) + (len(ir) if extend else 0)
    if out_stereo:
        base = stereo(x)
        out = np.zeros((n, 2))
        out[: len(base)] += base * dry
        for c in range(2):
            w = signal.fftconvolve(xm, ir[:, c])[:n]
            out[: len(w), c] += w * wet
        return out
    out = np.zeros(n)
    out[: len(xm)] += xm * dry
    w = signal.fftconvolve(xm, ir[:, 0])[:n]
    out[: len(w)] += w * wet
    return out


def pingpong(x: np.ndarray, sr: int, time: float, feedback: float = 0.35, wet: float = 0.3, lp: float = 4500.0, repeats: int = 8, spread: float = 1.0) -> np.ndarray:
    """Stereo ping-pong echo with darkening repeats (SNES echo flavor). Returns stereo, extended."""
    xm = mono(x)
    d = int(time * sr)
    n = len(xm) + d * repeats
    out = np.zeros((n, 2))
    base = stereo(x)
    out[: len(base)] += base
    tap = xm.copy()
    for i in range(1, repeats + 1):
        tap = onepole_lp(tap, lp, sr) * feedback if i > 1 else onepole_lp(tap, lp, sr)
        side = (i % 2) * 2 - 1  # +1 right on odd repeats
        lg = 0.5 - 0.5 * side * spread
        rg = 0.5 + 0.5 * side * spread
        s = d * i
        out[s: s + len(tap), 0] += tap * wet * lg * 1.4
        out[s: s + len(tap), 1] += tap * wet * rg * 1.4
    return out


def comb_lp_ir(sr: int, delay: float, fb: float, n: int) -> np.ndarray:
    k = int(delay * sr)
    ir = np.zeros(n)
    v = 1.0
    for i in range(0, n, max(1, k)):
        ir[i] = v
        v *= fb
    return ir


# ----------------------------------------------------------------------------- mixing helpers
def end_fade(x: np.ndarray, sr: int, dur: float = 0.006) -> np.ndarray:
    """Raised-cosine fade over the last `dur` seconds (prevents clicks when a clip is cut early)."""
    k = min(len(x) // 4, ns(dur, sr))
    if k < 2:
        return x
    y = x.copy()
    r = np.cos(np.linspace(0, math.pi / 2, k)) ** 2
    y[-k:] = (y[-k:].T * r).T
    return y


class Mix:
    """Growable mixing buffer. add(signal, at_seconds, gain, pan)."""

    def __init__(self, sr: int = RENDER_SR, dur: float = 0.0, channels: int = 1):
        self.sr = sr
        self.ch = channels
        self.buf = np.zeros((ns(dur, sr), channels)) if dur else np.zeros((0, channels))

    def add(self, x: np.ndarray, at: float = 0.0, gain: float = 1.0, pan_pos: float | None = None) -> "Mix":
        if x.ndim == 1:
            if self.ch == 2:
                x = pan(x, pan_pos or 0.0)
            else:
                x = x[:, None]
        elif x.ndim == 2 and self.ch == 1:
            x = x.mean(axis=1, keepdims=True)
        x = end_fade(x, self.sr)
        s = int(round(at * self.sr))
        e = s + len(x)
        if e > len(self.buf):
            self.buf = np.concatenate([self.buf, np.zeros((e - len(self.buf), self.ch))])
        self.buf[s:e] += x * gain
        return self

    @property
    def out(self) -> np.ndarray:
        return self.buf[:, 0].copy() if self.ch == 1 else self.buf.copy()


def fade(x: np.ndarray, sr: int, fin: float = 0.002, fout: float = 0.005) -> np.ndarray:
    y = x.copy()
    n = len(y)
    a = min(n, ns(fin, sr)) if fin > 0 else 0
    b = min(n, ns(fout, sr)) if fout > 0 else 0
    if a > 1:
        r = np.sin(np.linspace(0, math.pi / 2, a)) ** 2
        y[:a] = (y[:a].T * r).T
    if b > 1:
        r = np.cos(np.linspace(0, math.pi / 2, b)) ** 2
        y[n - b:] = (y[n - b:].T * r).T
    return y


def trim_tail(x: np.ndarray, sr: int, thresh_db: float = -66.0, pad: float = 0.02, min_len: float = 0.02) -> np.ndarray:
    """Cut trailing near-silence (relative to the peak) and leave `pad` seconds."""
    m = np.abs(mono(x))
    pk = m.max() + 1e-12
    thr = pk * db(thresh_db)
    idx = np.nonzero(m > thr)[0]
    if len(idx) == 0:
        return x[: ns(min_len, sr)]
    end = min(len(x), max(idx[-1] + ns(pad, sr), ns(min_len, sr)))
    return x[:end]


def trim_head(x: np.ndarray, sr: int, thresh_db: float = -60.0) -> np.ndarray:
    m = np.abs(mono(x))
    thr = (m.max() + 1e-12) * db(thresh_db)
    idx = np.nonzero(m > thr)[0]
    if len(idx) == 0:
        return x
    return x[max(0, idx[0] - ns(0.001, sr)):]


def norm_peak(x: np.ndarray, peak: float = 1.0) -> np.ndarray:
    return x * (peak / (np.max(np.abs(x)) + 1e-12))


def resample(x: np.ndarray, sr_in: int, sr_out: int) -> np.ndarray:
    if sr_in == sr_out:
        return x
    g = math.gcd(sr_in, sr_out)
    return signal.resample_poly(x, sr_out // g, sr_in // g, axis=0, window=("kaiser", 10.0))


def limiter(x: np.ndarray, sr: int, ceiling: float = 0.89, lookahead: float = 0.0025, release: float = 0.08) -> np.ndarray:
    """Look-ahead peak limiter. Transparent unless a peak exceeds `ceiling`."""
    from numpy.lib.stride_tricks import sliding_window_view
    m = np.abs(x) if x.ndim == 1 else np.max(np.abs(x), axis=1)
    need = np.minimum(1.0, ceiling / np.maximum(m, 1e-12))
    if need.min() >= 1.0:
        return x
    la = max(1, ns(lookahead, sr))
    padded = np.concatenate([need, np.ones(la)])
    gmin = sliding_window_view(padded, la + 1).min(axis=1)[: len(need)]
    a = math.exp(-1.0 / (release * sr))
    g = np.empty_like(gmin)
    prev = 1.0
    for i, v in enumerate(gmin):
        prev = min(v, 1.0 - (1.0 - prev) * a)
        g[i] = prev
    k = np.ones(la + 1) / (la + 1)
    gs = signal.lfilter(k, [1.0], np.concatenate([np.full(la, g[0]), g]))[la:]
    return (x.T * gs).T


# ----------------------------------------------------------------------------- loudness (ITU-R BS.1770)
def k_weight(x: np.ndarray, sr: int) -> np.ndarray:
    f0 = 1681.974450955533
    G = 3.999843853973347
    Q = 0.7071752369554196
    K = math.tan(math.pi * f0 / sr)
    Vh = 10 ** (G / 20.0)
    Vb = Vh ** 0.4996667741545416
    a0 = 1.0 + K / Q + K * K
    b1 = [(Vh + Vb * K / Q + K * K) / a0, 2.0 * (K * K - Vh) / a0, (Vh - Vb * K / Q + K * K) / a0]
    a1 = [1.0, 2.0 * (K * K - 1.0) / a0, (1.0 - K / Q + K * K) / a0]
    f0 = 38.13547087602444
    Q = 0.5003270373238773
    K = math.tan(math.pi * f0 / sr)
    a0 = 1.0 + K / Q + K * K
    b2 = [1.0, -2.0, 1.0]
    a2 = [1.0, 2.0 * (K * K - 1.0) / a0, (1.0 - K / Q + K * K) / a0]
    y = signal.lfilter(b1, a1, x, axis=0)
    return signal.lfilter(b2, a2, y, axis=0)


def _power(y: np.ndarray) -> np.ndarray:
    return y ** 2 if y.ndim == 1 else np.sum(y ** 2, axis=1)


def lufs_integrated(x: np.ndarray, sr: int) -> float:
    y = _power(k_weight(x, sr))
    blk = ns(0.4, sr)
    hop = ns(0.1, sr)
    if len(y) < blk:
        y = np.concatenate([y, np.zeros(blk - len(y))])
    c = np.concatenate([[0.0], np.cumsum(y)])
    starts = np.arange(0, len(y) - blk + 1, hop)
    z = (c[starts + blk] - c[starts]) / blk
    L = -0.691 + 10 * np.log10(np.maximum(z, 1e-20))
    z = z[L > -70]
    if len(z) == 0:
        return -99.0
    rel = -0.691 + 10 * math.log10(z.mean()) - 10
    L2 = -0.691 + 10 * np.log10(np.maximum(z, 1e-20))
    z2 = z[L2 > rel]
    return -0.691 + 10 * math.log10(max(1e-20, z2.mean() if len(z2) else z.mean()))


def lufs_window_max(x: np.ndarray, sr: int, win: float = 0.2, hop: float = 0.005) -> float:
    """Maximum short-window K-weighted loudness: our 'perceived loudness' for short SFX."""
    y = _power(k_weight(x, sr))
    w = ns(win, sr)
    if len(y) < w:
        y = np.concatenate([y, np.zeros(w - len(y))])
    c = np.concatenate([[0.0], np.cumsum(y)])
    starts = np.arange(0, len(y) - w + 1, max(1, ns(hop, sr)))
    z = (c[starts + w] - c[starts]) / w
    return -0.691 + 10 * math.log10(max(1e-20, z.max()))


def true_peak(x: np.ndarray, sr: int | None = None) -> float:
    up = signal.resample_poly(x, 4, 1, axis=0)
    return float(max(np.max(np.abs(up)), np.max(np.abs(x))))


# ----------------------------------------------------------------------------- WAV I/O
def write_wav(path, x: np.ndarray, sr: int, seed: int = 0) -> int:
    """16-bit PCM with TPDF dither. Returns bytes written."""
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    y = np.clip(x, -1.0, 1.0)
    g = rng(seed)
    d = (g.random(y.shape) - g.random(y.shape)) / 32768.0
    q = np.clip(np.round((y + d) * 32767.0), -32768, 32767).astype("<i2")
    ch = 1 if q.ndim == 1 else q.shape[1]
    with wave.open(str(path), "wb") as w:
        w.setnchannels(ch)
        w.setsampwidth(2)
        w.setframerate(sr)
        w.writeframes(q.tobytes())
    return path.stat().st_size


def read_wav(path):
    with wave.open(str(path), "rb") as w:
        ch = w.getnchannels()
        sr = w.getframerate()
        sw = w.getsampwidth()
        data = w.readframes(w.getnframes())
    if sw != 2:
        raise ValueError("expected 16-bit")
    a = np.frombuffer(data, "<i2").astype(float) / 32768.0
    if ch > 1:
        a = a.reshape(-1, ch)
    return a, sr


# ----------------------------------------------------------------------------- MP3 (jingles)
def write_mp3(path, x: np.ndarray, sr: int, kbps: int = 160, seed: int = 0) -> int:
    """Encode float audio to MP3 with lameenc (CBR). Stereo if x is (n, 2)."""
    import lameenc
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    y = np.clip(x, -1.0, 1.0)
    g = rng(seed)
    d = (g.random(y.shape) - g.random(y.shape)) / 32768.0
    q = np.clip(np.round((y + d) * 32767.0), -32768, 32767).astype("<i2")
    ch = 1 if q.ndim == 1 else q.shape[1]
    enc = lameenc.Encoder()
    enc.set_bit_rate(kbps)
    enc.set_in_sample_rate(sr)
    enc.set_channels(ch)
    enc.set_quality(2)
    data = enc.encode(q.tobytes()) + enc.flush()
    path.write_bytes(bytes(data))
    return path.stat().st_size


def read_audio(path):
    """Decode any audio file (wav/mp3/...) with PyAV. Returns (float array (n,) or (n, ch), sr)."""
    path = Path(path)
    if path.suffix.lower() == ".wav":
        return read_wav(path)
    import av
    with av.open(str(path)) as c:
        st = c.streams.audio[0]
        sr = st.rate
        chunks = []
        for frame in c.decode(st):
            a = frame.to_ndarray()
            if a.dtype.kind == "i":
                a = a.astype(np.float64) / 32768.0
            if frame.format.is_planar:
                a = a.T
            else:
                a = a.reshape(-1, frame.layout.nb_channels if hasattr(frame.layout, "nb_channels") else len(frame.layout.channels))
            chunks.append(a.astype(np.float64))
    y = np.concatenate(chunks, axis=0)
    if y.ndim == 2 and y.shape[1] == 1:
        y = y[:, 0]
    return y, sr
