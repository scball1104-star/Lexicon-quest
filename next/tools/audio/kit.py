"""Reusable sound-design building blocks (mono float arrays at dsp.RENDER_SR unless noted).

Each function is small, deterministic (takes a numpy Generator when random) and documented by
what it is for. SFX, jingles and ambience are assembled from these.
"""
from __future__ import annotations

import math

import numpy as np
from scipy import signal

import dsp
from dsp import RENDER_SR as SR, ns, tvec

# ----------------------------------------------------------------------------- tonal


def release(y, frac=0.18):
    """Smooth release over the last `frac` of a clip so notes cut short never end abruptly."""
    k = max(2, int(len(y) * frac))
    if k >= len(y):
        return y
    out = y.copy()
    out[-k:] *= np.cos(np.linspace(0, np.pi / 2, k)) ** 2
    return out


def tone(freq, dur, wave="pulse", duty=0.5, decay=0.08, attack=0.002, hold=0.0, vib=0.0, vib_rate=6.0, lp=None, sr=SR):
    """One synthetic note: pulse/square/saw/tri/sine with an exponential envelope."""
    n = ns(dur, sr)
    f = dsp.as_arr(freq, n)
    if vib:
        f = f * (1.0 + vib * dsp.lfo(vib_rate, n, sr, delay=0.05, fade=0.1))
    if wave == "pulse":
        y = dsp.pulse(f, n, sr, duty)
    elif wave == "square":
        y = dsp.square(f, n, sr)
    elif wave == "saw":
        y = dsp.saw(f, n, sr)
    elif wave == "tri":
        y = dsp.triangle(f, n, sr)
    elif wave == "sine":
        y = dsp.sine(f, n, sr)
    else:
        raise ValueError(wave)
    y = y * dsp.env_exp(n, sr, decay, attack, hold)
    if lp:
        y = dsp.butter(y, "low", lp, sr, 2)
    return release(y)


def blips(notes, step, dur, wave="pulse", duty=0.25, decay=0.05, attack=0.001, gains=None, lp=None, sr=SR):
    """A quick sequence of notes (names or Hz) `step` seconds apart."""
    m = dsp.Mix(sr)
    for i, nt in enumerate(notes):
        f = dsp.note_hz(nt) if isinstance(nt, str) else nt
        gn = gains[i] if gains else 1.0
        m.add(tone(f, dur, wave, duty, decay, attack, lp=lp, sr=sr), i * step, gn)
    return m.out


def chorus_tone(freq, dur, wave="sine", cents=None, decay=0.3, attack=0.004, sr=SR, mix_tri=0.0, beat=4.5):
    """Two detuned copies (soft chorus) of a tone, for heals and magic. The detune is a fixed
    beat rate in Hz (`beat`), so high notes shimmer gently instead of beating roughly.
    (`cents` is accepted for backward compatibility and ignored.)"""
    a = tone(freq + beat / 2, dur, wave, decay=decay, attack=attack, sr=sr)
    b = tone(freq - beat / 2, dur, wave, decay=decay, attack=attack, sr=sr)
    y = 0.5 * (a + b)
    if mix_tri:
        y += mix_tri * tone(freq, dur, "tri", decay=decay * 0.7, attack=attack, sr=sr)
    return y


def fm_bell(freq, dur, ratio=3.5, index=3.0, decay=0.6, idx_decay=0.25, attack=0.001, sr=SR):
    """Classic two-op FM bell / chime (decaying modulation index = bright strike, mellow tail)."""
    n = ns(dur, sr)
    t = tvec(n, sr)
    idx = index * np.exp(-t / idx_decay)
    y = dsp.fm(freq, ratio, idx, n, sr)
    return release(y * dsp.env_exp(n, sr, decay, attack))


def glass(freq, dur, g, decay=0.35, sr=SR):
    """Glassy / crystalline ping: inharmonic partials of a free plate."""
    ratios = [1.0, 2.32, 4.25, 6.63, 9.38]
    amps = [1.0, 0.55, 0.32, 0.18, 0.1]
    decs = [decay, decay * 0.7, decay * 0.45, decay * 0.3, decay * 0.2]
    n = ns(dur, sr)
    y = dsp.partials(freq, ratios, amps, decs, n, sr, g)
    return release(y * np.clip(tvec(n, sr) / 0.0008, 0, 1))


def metal(freq, dur, g, decay=0.3, bright=1.0, sr=SR):
    """Struck metal (blade edge, armor, coin): stiff-bar inharmonic partials."""
    ratios = [1.0, 2.756, 5.404, 8.933, 13.34]
    amps = [1.0, 0.7 * bright, 0.45 * bright, 0.25 * bright, 0.12 * bright]
    decs = [decay, decay * 0.6, decay * 0.4, decay * 0.25, decay * 0.15]
    n = ns(dur, sr)
    y = dsp.partials(freq, ratios, amps, decs, n, sr, g)
    return release(y * np.clip(tvec(n, sr) / 0.0005, 0, 1))


def church_bell(freq_nominal, dur, g, decay=2.5, eerie=0.0, sr=SR):
    """Bronze church bell. Partials relative to the nominal (strike) pitch: hum, prime, tierce
    (minor third, the bell's signature), quint, nominal and upper partials. `eerie` detunes the
    hum/prime pair so they beat slowly."""
    f = freq_nominal
    spec = [
        (0.5 * (1 + 0.004 * eerie), 0.55, decay * 1.6),
        (0.5 * (1 - 0.004 * eerie), 0.35 * eerie, decay * 1.5),
        (1.0, 0.65, decay * 1.1),
        (1.0 * (1 + 0.006 * eerie), 0.25 * eerie, decay * 1.0),
        (1.2, 0.5, decay * 0.9),
        (1.5, 0.35, decay * 0.7),
        (2.0, 0.9, decay * 0.55),
        (2.5, 0.35, decay * 0.35),
        (2.66, 0.3, decay * 0.3),
        (3.0, 0.25, decay * 0.25),
        (4.0, 0.2, decay * 0.18),
        (5.33, 0.12, decay * 0.12),
        (6.0, 0.08, decay * 0.1),
    ]
    n = ns(dur, sr)
    t = tvec(n, sr)
    y = np.zeros(n)
    for r, a, d in spec:
        if a <= 0 or f * r > sr * 0.45:
            continue
        y += a * np.sin(dsp.TAU * f * r * t + g.random() * dsp.TAU) * np.exp(-t / d)
    # clapper strike: short bright noise thump
    strike = dsp.butter(dsp.white(ns(0.03, sr), g), "band", (f * 1.5, min(sr * 0.45, f * 8)), sr, 2)
    strike *= dsp.env_exp(len(strike), sr, 0.006, 0.0005)
    y[: len(strike)] += strike * 0.6
    return release(y * np.clip(t / 0.0015, 0, 1), 0.12)


def karplus(freq, dur, g, t60=0.8, bright=0.6, pick=0.0, sr=SR):
    """Karplus-Strong plucked string with fractional-delay (allpass) tuning.
    bright 0..1 = excitation brightness, pick = pick position comb (0 = off)."""
    P = sr / freq
    D = int(P - 0.5 - 0.1)
    delta = P - 0.5 - D
    c = (1 - delta) / (1 + delta)
    rho = 10 ** (-3.0 / (freq * t60))
    n = ns(dur, sr)
    x = np.zeros(n)
    burst = g.uniform(-1, 1, D)
    burst = dsp.onepole_lp(burst, 500 + bright * 9000, sr)
    if pick:
        k = max(1, int(D * pick))
        burst = burst - np.concatenate([np.zeros(k), burst[:-k]])
    x[:D] = burst - burst.mean()
    a = np.zeros(D + 3)
    a[0] = 1.0
    a[1] += c
    a[D] -= rho * 0.5 * c
    a[D + 1] -= rho * 0.5 * (c + 1)
    a[D + 2] -= rho * 0.5
    y = signal.lfilter([1.0, c], a, x)
    return release(y / (np.max(np.abs(y)) + 1e-12), 0.12)


# ----------------------------------------------------------------------------- noise layers


def noise_burst(dur, g, band=None, decay=0.05, attack=0.001, hold=0.0, kind="white", order=2, sr=SR):
    """Filtered noise with an exponential envelope. band = (lo, hi) | ('low', f) | ('high', f)."""
    n = ns(dur, sr)
    if kind == "pink":
        x = dsp.pink(n, g)
    elif kind == "brown":
        x = dsp.brown(n, g)
    else:
        x = dsp.white(n, g)
    if band:
        if band[0] == "low":
            x = dsp.butter(x, "low", band[1], sr, order)
        elif band[0] == "high":
            x = dsp.butter(x, "high", band[1], sr, order)
        else:
            x = dsp.butter(x, "band", band, sr, order)
    x = x / (np.max(np.abs(x)) + 1e-12)
    return release(x * dsp.env_exp(n, sr, decay, attack, hold), 0.15)


def whoosh(dur, g, f0, f1, q=1.5, peak=0.5, kind="white", curve="exp", sr=SR):
    """Air movement: noise through a swept band-pass with a bell-shaped envelope (peak = 0..1 position)."""
    n = ns(dur, sr)
    x = dsp.pink(n, g) if kind == "pink" else dsp.white(n, g)
    f = dsp.glide(f0, f1, n, curve)
    y = dsp.bq_tv(x, "bp", f, q, sr, block=16)
    t = np.linspace(0, 1, n)
    env = np.where(t < peak, (t / max(peak, 1e-6)) ** 1.6, ((1 - t) / max(1 - peak, 1e-6)) ** 1.4)
    y = y * env
    return y / (np.max(np.abs(y)) + 1e-12)


def thump(f0, f1, dur, decay=0.08, attack=0.001, click=0.0, g=None, sr=SR):
    """Low pitched body hit (kick-drum style sine with a downward pitch sweep)."""
    n = ns(dur, sr)
    f = dsp.glide(f0, f1, n, "exp", 0.5)
    y = dsp.sine(f, n, sr) * dsp.env_exp(n, sr, decay, attack)
    if click and g is not None:
        c = noise_burst(0.006, g, ("high", 2000), 0.0012, 0.0002, sr=sr)
        y[: len(c)] += c * click
    return release(y, 0.25)


def knock(freqs, qs, g, dur=0.15, decay=0.04, gains=None, sr=SR, exc=0.002):
    """Modal knock (wood, hollow objects): a short noise click through resonators."""
    n = ns(dur, sr)
    x = np.zeros(n)
    e = dsp.white(ns(exc, sr), g) * np.hanning(ns(exc, sr))
    x[: len(e)] = e
    y = dsp.resonator(x, freqs, qs, gains or [1.0] * len(freqs), sr)
    y = y * dsp.env_exp(n, sr, decay, 0.0003)
    return release(y / (np.max(np.abs(y)) + 1e-12), 0.2)


def creak(dur, g, rate0=55.0, rate1=80.0, modes=(380, 930, 1750), qs=(10, 12, 9), jitter=0.25, sr=SR):
    """Wood creak: stick-slip impulse train (jittered rate) exciting resonant modes."""
    n = ns(dur, sr)
    rate = dsp.glide(rate0, rate1, n, "exp")
    rate = rate * (1 + jitter * dsp.smooth_random(n, g, 6.0, sr))
    ph = np.cumsum(rate / sr)
    ticks = np.nonzero(np.diff(np.floor(ph)) > 0)[0]
    x = np.zeros(n)
    x[ticks] = g.uniform(0.5, 1.0, len(ticks))
    y = dsp.resonator(x, modes, qs, [1.0, 0.7, 0.4], sr)
    t = np.linspace(0, 1, n)
    y *= np.sin(np.pi * t) ** 0.7
    return y / (np.max(np.abs(y)) + 1e-12)


def sparkle(dur, g, density=30.0, fmin=2500, fmax=8000, decay=(0.03, 0.12), fall=1.0, sr=SR):
    """Glitter: random short sine pings. fall>1 thins them out over time."""
    n = ns(dur, sr)
    m = dsp.Mix(sr, dur)
    count = int(density * dur)
    for i in range(count):
        u = g.random() ** fall
        at = u * dur * 0.92
        f = math.exp(g.uniform(math.log(fmin), math.log(fmax)))
        d = g.uniform(*decay)
        p = dsp.sine(f, ns(d * 5, sr), sr, g.random()) * dsp.env_exp(ns(d * 5, sr), sr, d, 0.0008)
        m.add(p, at, g.uniform(0.3, 1.0))
    y = m.out[:n]
    return y / (np.max(np.abs(y)) + 1e-12)


def bubbles(dur, g, count=10, fmin=300, fmax=1200, length=(0.015, 0.04), rise=1.8, sr=SR):
    """Water/ink bubbles: short rising sine chirps."""
    m = dsp.Mix(sr, dur)
    for _ in range(count):
        at = g.random() * dur * 0.85
        f = math.exp(g.uniform(math.log(fmin), math.log(fmax)))
        L = g.uniform(*length)
        k = ns(L, sr)
        b = dsp.sine(dsp.glide(f, f * rise, k, "exp", 0.7), k, sr) * dsp.env_exp(k, sr, L * 0.35, 0.002)
        m.add(b, at, g.uniform(0.4, 1.0))
    y = m.out
    return y / (np.max(np.abs(y)) + 1e-12)


def shatter(dur, g, count=30, fmin=2200, fmax=7500, spread=0.25, sr=SR):
    """Glass / ceramic shards: many tiny glassy tinks spread over `spread` seconds plus grit."""
    m = dsp.Mix(sr, dur)
    for _ in range(count):
        at = (g.random() ** 2.2) * spread
        f = math.exp(g.uniform(math.log(fmin), math.log(fmax)))
        d = g.uniform(0.012, 0.06)
        k = ns(d * 5, sr)
        tink = dsp.partials(f, [1.0, 1.73, 2.61], [1.0, 0.5, 0.3], [d, d * 0.6, d * 0.4], k, sr, g)
        m.add(tink, at, g.uniform(0.25, 1.0))
    grit = noise_burst(spread + 0.1, g, (2500, 9500), spread * 0.35, 0.0008, sr=sr)
    m.add(grit, 0.0, 0.5)
    y = m.out
    return y / (np.max(np.abs(y)) + 1e-12)


def rumble(dur, g, fc=180.0, rough=0.5, attack=0.08, release=0.4, sr=SR):
    """Low rolling rumble (earth, thunder tails, gates)."""
    n = ns(dur, sr)
    x = dsp.brown(n, g)
    x = dsp.butter(x, "low", fc, sr, 4)
    am = 1.0 + rough * dsp.smooth_random(n, g, 5.0, sr)
    t = tvec(n, sr)
    env = np.clip(t / attack, 0, 1) * np.clip((dur - t) / release, 0, 1)
    y = x * am * env
    return y / (np.max(np.abs(y)) + 1e-12)


def grind(dur, g, band=(250, 1100), rough=0.8, sr=SR):
    """Stone-on-stone grinding: band noise with fast random amplitude (grain)."""
    n = ns(dur, sr)
    x = dsp.butter(dsp.white(n, g), "band", band, sr, 2)
    grain = np.abs(dsp.smooth_random(n, g, 45.0, sr)) ** 1.5
    y = x * (1 - rough + rough * grain)
    return y / (np.max(np.abs(y)) + 1e-12)


def paper_flap(g, sr=SR, dur=0.025, band=(1400, 6500)):
    """One page flap: a crisp band-limited noise burst with a tiny pitch-like resonance."""
    k = ns(dur, sr)
    x = dsp.butter(dsp.white(k, g), "band", band, sr, 2)
    x += 0.4 * dsp.bq(dsp.white(k, g), "bp", g.uniform(900, 2200), 6, sr)
    env = dsp.env_exp(k, sr, dur * 0.3, 0.001)
    return x * env


def reverse_swell(x):
    """Reverse a decaying sound to make a swell into an impact."""
    return x[::-1].copy()


def gate(dur, attack, release, sr=SR):
    n = ns(dur, sr)
    t = tvec(n, sr)
    return np.clip(t / max(attack, 1e-6), 0, 1) * np.clip((dur - t) / max(release, 1e-6), 0, 1)


def add(*parts):
    """Sum arrays of different lengths (zero-padded). Accepts (array) or (array, gain) tuples."""
    items = [(p, 1.0) if not isinstance(p, tuple) else p for p in parts]
    n = max(len(a) for a, _ in items)
    out = np.zeros(n)
    for a, k in items:
        out[: len(a)] += a * k
    return out
