"""Deterministic software instruments for the Lexicon Quest tracker.

Every instrument renders one note: render(f0, gate_s, vel, sr, rng) -> mono (N,) or stereo (N, 2)
float64 array, peak roughly 0.5 at full velocity. `rng` is a numpy Generator seeded per note by the
tracker so renders are bit-for-bit repeatable. Oscillators are band-limited wavetables (additive),
so there is no aliasing even on high notes.
"""
import math
import numpy as np
from scipy import signal

TWO_PI = 2.0 * math.pi

# --------------------------------------------------------------------------------------
# Oscillators
# --------------------------------------------------------------------------------------

_TABLE_CACHE = {}
TABLE_SIZE = 4096


def _wavetable(kind, nharm):
    key = (kind, nharm)
    t = _TABLE_CACHE.get(key)
    if t is not None:
        return t
    x = np.arange(TABLE_SIZE) / TABLE_SIZE
    k = np.arange(1, nharm + 1)
    if kind == 'sine':
        k = k[:1]
        amps = np.array([1.0])
    elif kind == 'saw':
        amps = ((-1.0) ** (k + 1)) / k
    elif kind == 'square':
        amps = np.where(k % 2 == 1, 1.0 / k, 0.0)
    elif kind == 'triangle':
        amps = np.where(k % 2 == 1, ((-1.0) ** ((k - 1) // 2)) / (k * k), 0.0)
    else:
        raise ValueError(kind)
    # Lanczos sigma factor: tames Gibbs ringing at the band edge (sounds smoother, no "fizz")
    sigma = np.sinc(k / (nharm + 1))
    amps = amps * sigma
    table = (amps[:, None] * np.sin(TWO_PI * k[:, None] * x[None, :])).sum(axis=0)
    table /= max(1e-9, np.abs(table).max())
    table = np.concatenate([table, table[:1]])  # wrap sample for interpolation
    _TABLE_CACHE[key] = table
    return table


def osc(kind, f_inst, sr, phase0=0.0, margin=1.06):
    """Band-limited oscillator. f_inst: per-sample frequency array (Hz)."""
    fmax = float(np.max(f_inst)) * margin
    nharm = int(max(1, min(TABLE_SIZE // 2 - 2, (sr * 0.5) / fmax)))
    table = _wavetable(kind, nharm)
    ph = (np.cumsum(f_inst) / sr + phase0) % 1.0
    idx = ph * TABLE_SIZE
    i0 = idx.astype(np.int64)
    frac = idx - i0
    return table[i0] * (1.0 - frac) + table[i0 + 1] * frac


def pulse(f_inst, sr, duty, phase0=0.0):
    """Band-limited pulse as the difference of two saws (duty may be an array for PWM)."""
    fmax = float(np.max(f_inst)) * 1.06
    nharm = int(max(1, min(TABLE_SIZE // 2 - 2, (sr * 0.5) / fmax)))
    table = _wavetable('saw', nharm)
    ph = (np.cumsum(f_inst) / sr + phase0)
    a = _lookup(table, ph % 1.0)
    b = _lookup(table, (ph + duty) % 1.0)
    return (a - b) * 0.5


def _lookup(table, ph):
    idx = ph * TABLE_SIZE
    i0 = idx.astype(np.int64)
    frac = idx - i0
    return table[i0] * (1.0 - frac) + table[i0 + 1] * frac


def vibrato(n, sr, f0, rate=5.2, depth_semi=0.12, delay=0.25, ramp=0.4, phase=0.0):
    """Per-sample frequency array with delayed vibrato."""
    t = np.arange(n) / sr
    amt = np.clip((t - delay) / max(1e-6, ramp), 0.0, 1.0)
    lfo = np.sin(TWO_PI * rate * t + phase) * depth_semi * amt
    return f0 * (2.0 ** (lfo / 12.0))


# --------------------------------------------------------------------------------------
# Envelopes
# --------------------------------------------------------------------------------------

def adsr(n_gate, sr, a, d, s, r, curve=5.0):
    """ADSR envelope. Returns an array of n_gate + release samples."""
    na = max(1, int(a * sr))
    nd = max(1, int(d * sr))
    nr = max(1, int(r * sr))
    total = n_gate + nr
    env = np.zeros(total)
    t = np.arange(total) / sr
    # attack: exponential approach reaching 1 at t = a
    att = (1.0 - np.exp(-curve * t[:na] / max(1e-6, a))) / (1.0 - math.exp(-curve))
    env[:na] = att
    # decay toward sustain
    rest = total - na
    if rest > 0:
        td = np.arange(rest) / sr
        env[na:] = s + (1.0 - s) * np.exp(-4.0 * td / max(1e-6, d))
    # release from the level at gate end
    if n_gate < total:
        lvl = env[max(0, n_gate - 1)]
        tr = np.arange(total - n_gate) / sr
        env[n_gate:] = lvl * np.exp(-5.0 * tr / max(1e-6, r))
    return env


def exp_decay(n, sr, tau, start=1.0):
    t = np.arange(n) / sr
    return start * np.exp(-t / max(1e-6, tau))


def fade_edges(x, sr, ms_in=2.0, ms_out=8.0):
    n = x.shape[0]
    ni = min(n, max(1, int(sr * ms_in / 1000)))
    no = min(n, max(1, int(sr * ms_out / 1000)))
    w = np.ones(n)
    w[:ni] *= np.linspace(0.0, 1.0, ni)
    w[n - no:] *= np.linspace(1.0, 0.0, no)
    if x.ndim == 2:
        return x * w[:, None]
    return x * w


# --------------------------------------------------------------------------------------
# Filters (RBJ cookbook biquads)
# --------------------------------------------------------------------------------------

def biquad(kind, f, sr, q=0.707, gain_db=0.0):
    f = min(f, sr * 0.49)
    w0 = TWO_PI * f / sr
    cw, sw = math.cos(w0), math.sin(w0)
    alpha = sw / (2.0 * q)
    A = 10.0 ** (gain_db / 40.0)
    if kind == 'lp':
        b = [(1 - cw) / 2, 1 - cw, (1 - cw) / 2]
        a = [1 + alpha, -2 * cw, 1 - alpha]
    elif kind == 'hp':
        b = [(1 + cw) / 2, -(1 + cw), (1 + cw) / 2]
        a = [1 + alpha, -2 * cw, 1 - alpha]
    elif kind == 'bp':  # constant 0 dB peak gain
        b = [alpha, 0.0, -alpha]
        a = [1 + alpha, -2 * cw, 1 - alpha]
    elif kind == 'notch':
        b = [1.0, -2 * cw, 1.0]
        a = [1 + alpha, -2 * cw, 1 - alpha]
    elif kind == 'peak':
        b = [1 + alpha * A, -2 * cw, 1 - alpha * A]
        a = [1 + alpha / A, -2 * cw, 1 - alpha / A]
    elif kind == 'lowshelf':
        sq = 2 * math.sqrt(A) * alpha
        b = [A * ((A + 1) - (A - 1) * cw + sq), 2 * A * ((A - 1) - (A + 1) * cw), A * ((A + 1) - (A - 1) * cw - sq)]
        a = [(A + 1) + (A - 1) * cw + sq, -2 * ((A - 1) + (A + 1) * cw), (A + 1) + (A - 1) * cw - sq]
    elif kind == 'highshelf':
        sq = 2 * math.sqrt(A) * alpha
        b = [A * ((A + 1) + (A - 1) * cw + sq), -2 * A * ((A - 1) + (A + 1) * cw), A * ((A + 1) + (A - 1) * cw - sq)]
        a = [(A + 1) - (A - 1) * cw + sq, 2 * ((A - 1) - (A + 1) * cw), (A + 1) - (A - 1) * cw - sq]
    else:
        raise ValueError(kind)
    b = np.array(b) / a[0]
    a = np.array(a) / a[0]
    return b, a


def filt(x, kind, f, sr, q=0.707, gain_db=0.0, passes=1):
    b, a = biquad(kind, f, sr, q, gain_db)
    y = x
    for _ in range(passes):
        y = signal.lfilter(b, a, y, axis=0)
    return y


def morph_lp(x, sr, f_dark, f_bright, amount, q=0.8):
    """Time-varying lowpass approximated by crossfading a dark and a bright static filter.
    amount: per-sample array in 0..1 (0 = dark, 1 = bright)."""
    d = filt(x, 'lp', f_dark, sr, q)
    br = filt(x, 'lp', f_bright, sr, q)
    if x.ndim == 2:
        amount = amount[:, None]
    return d * (1.0 - amount) + br * amount


def noise(n, rng):
    return rng.standard_normal(n)


def normalize(x, peak=0.5):
    m = float(np.abs(x).max()) if x.size else 0.0
    if m < 1e-9:
        return x
    return x * (peak / m)


def pan_stereo(mono, pan):
    """Constant-power pan of a mono signal; pan in -1..1."""
    th = (pan + 1.0) * 0.25 * math.pi
    return np.stack([mono * math.cos(th), mono * math.sin(th)], axis=1)


# --------------------------------------------------------------------------------------
# Instruments
# --------------------------------------------------------------------------------------

class Instrument:
    name = 'instrument'
    release = 0.3          # seconds rendered after the gate
    max_len = 12.0         # hard cap on a note's rendered length (seconds)
    stereo = False

    def length(self, gate_s):
        return min(self.max_len, gate_s + self.release)

    def render(self, f0, gate_s, vel, sr, rng, **p):
        raise NotImplementedError


class StringsPad(Instrument):
    """Detuned saws, lowpass, slow attack. Stereo (voices spread L/C/R)."""
    name = 'strings'
    stereo = True
    release = 0.9

    def __init__(self, attack=0.55, detune=7.0, dark=1400.0, bright=3600.0, body_lp=True,
                 vib_rate=5.0, vib_depth=0.08, octave_up=0.0, sub=0.0, width=0.8, release=0.9):
        self.attack = attack
        self.detune = detune
        self.dark = dark
        self.bright = bright
        self.vib_rate = vib_rate
        self.vib_depth = vib_depth
        self.octave_up = octave_up
        self.sub = sub
        self.width = width
        self.release = release
        self.body_lp = body_lp

    def render(self, f0, gate_s, vel, sr, rng, **p):
        n_gate = int(gate_s * sr)
        env = adsr(n_gate, sr, self.attack, 0.6, 0.85, self.release)
        n = env.shape[0]
        out = np.zeros((n, 2))
        # five players, unevenly detuned, each with its own vibrato rate/phase: a section shimmer
        # rather than the deep periodic beating three symmetric voices produce
        d = self.detune
        cents = [-1.3 * d, -0.45 * d, 0.1 * d, 0.6 * d, 1.25 * d]
        pans = [-self.width, -0.4 * self.width, 0.05 * self.width, 0.5 * self.width, self.width]
        gains = [0.8, 1.0, 1.0, 1.0, 0.8]
        for c, pan, g, ph in zip(cents, pans, gains, (0.0, 0.21, 0.47, 0.63, 0.86)):
            f = vibrato(n, sr, f0 * 2 ** (c / 1200.0), rate=self.vib_rate + rng.uniform(-0.45, 0.45),
                        depth_semi=self.vib_depth * rng.uniform(0.7, 1.3), delay=0.3 + rng.uniform(0, 0.15),
                        ramp=0.6, phase=rng.uniform(0, TWO_PI))
            v = osc('saw', f, sr, phase0=ph) * g
            if self.octave_up > 0:
                v = v + self.octave_up * g * osc('saw', f * 2.0, sr, phase0=ph + 0.2)
            out += pan_stereo(v, pan)
        if self.sub > 0:
            out += pan_stereo(self.sub * osc('sine', np.full(n, f0 * 0.5), sr), 0.0)
        # brightness opens with velocity and the attack
        t = np.arange(n) / sr
        open_amt = np.clip(t / max(0.05, self.attack * 1.4), 0, 1) * (0.35 + 0.65 * vel)
        out = morph_lp(out, sr, self.dark, self.bright, open_amt, q=0.75)
        if self.body_lp:
            out = filt(out, 'hp', max(40.0, f0 * 0.5), sr, 0.7)
        out *= env[:, None] * (0.25 + 0.75 * vel)
        return normalize(out, 0.5 * (0.4 + 0.6 * vel))


class ChoirPad(Instrument):
    """Formant-filtered pulse stack: an "oo" that opens slightly toward "ah". Stereo."""
    name = 'choir'
    stereo = True
    release = 1.1

    def render(self, f0, gate_s, vel, sr, rng, **p):
        n_gate = int(gate_s * sr)
        env = adsr(n_gate, sr, 0.9, 0.8, 0.9, self.release)
        n = env.shape[0]
        voices = []
        for c, ph in ((-9.0, 0.1), (-3.0, 0.4), (3.0, 0.7), (9.0, 0.85)):
            f = vibrato(n, sr, f0 * 2 ** (c / 1200.0), rate=4.6 + rng.uniform(-0.4, 0.4),
                        depth_semi=0.15, delay=0.5, ramp=0.8, phase=rng.uniform(0, TWO_PI))
            voices.append(pulse(f, sr, 0.42, phase0=ph))
        src = (voices[0] + voices[1] + voices[2] + voices[3]) * 0.25
        src += 0.08 * noise(n, rng)  # breath
        # formants: 'oo' (300, 870, 2240) morphing toward 'ah' (660, 1120, 2750)
        t = np.arange(n) / sr
        m = np.clip(t / 2.5, 0, 0.55)
        def formants(fs, amps):
            y = np.zeros(n)
            for fq, am in zip(fs, amps):
                y += am * filt(src, 'bp', fq, sr, q=7.0)
            return y
        oo = formants((300, 870, 2240), (1.0, 0.45, 0.12))
        ah = formants((660, 1120, 2750), (1.0, 0.7, 0.2))
        mono = oo * (1 - m) + ah * m
        mono = filt(mono, 'lp', 5000, sr, 0.7)
        left = filt(mono, 'peak', 1500, sr, q=1.5, gain_db=1.5)
        right = filt(mono, 'peak', 900, sr, q=1.5, gain_db=1.5)
        out = np.stack([left, right], axis=1) * env[:, None]
        return normalize(out, 0.45 * (0.5 + 0.5 * vel))


class Horn(Instrument):
    """French horn: filtered saw with a slow swell and a round sine body."""
    name = 'horn'
    release = 0.35

    def __init__(self, attack=0.09, swell=0.5, dark=900.0, bright=2600.0):
        self.attack = attack
        self.swell = swell
        self.dark = dark
        self.bright = bright

    def render(self, f0, gate_s, vel, sr, rng, **p):
        n_gate = int(gate_s * sr)
        env = adsr(n_gate, sr, self.attack, 0.25, 0.88, self.release)
        n = env.shape[0]
        t = np.arange(n) / sr
        # slight scoop into the pitch (brass lip)
        scoop = f0 * (2.0 ** (-0.25 * np.exp(-t / 0.04) / 12.0))
        f = scoop * (2.0 ** ((np.sin(TWO_PI * 4.8 * t) * 0.07 * np.clip((t - 0.4) / 0.5, 0, 1)) / 12.0))
        v = osc('saw', f, sr) * 0.8 + osc('sine', f, sr) * 0.35
        swell_amt = np.clip(t / max(0.05, self.swell), 0, 1) * (0.3 + 0.7 * vel)
        v = morph_lp(v, sr, self.dark + f0 * 0.5, self.bright + f0, swell_amt, q=0.9)
        v = filt(v, 'peak', 450, sr, q=1.2, gain_db=2.0)
        v *= env
        return normalize(v, 0.5 * (0.45 + 0.55 * vel))


class Oboe(Instrument):
    """Reedy lead: narrow pulse, nasal formant, delayed vibrato, a little breath."""
    name = 'oboe'
    release = 0.18

    def __init__(self, vib_rate=5.4, vib_depth=0.13, duty=0.28):
        self.vib_rate = vib_rate
        self.vib_depth = vib_depth
        self.duty = duty

    def render(self, f0, gate_s, vel, sr, rng, **p):
        n_gate = int(gate_s * sr)
        env = adsr(n_gate, sr, 0.055, 0.12, 0.9, self.release)
        n = env.shape[0]
        f = vibrato(n, sr, f0, rate=self.vib_rate, depth_semi=self.vib_depth * (0.7 + 0.3 * vel),
                    delay=0.28, ramp=0.45)
        v = pulse(f, sr, self.duty)
        v = filt(v, 'lp', 2000 + 900 * vel + f0, sr, 0.75)
        v = v + 0.5 * filt(v, 'bp', 1150, sr, q=3.0) + 0.15 * filt(v, 'bp', 2400, sr, q=4.0)
        breath = filt(noise(n, rng), 'bp', 2800, sr, q=1.2) * 0.035
        v = v + breath
        v *= env
        # soft expression swell within long notes
        t = np.arange(n) / sr
        v *= 0.85 + 0.15 * np.clip(t / 0.8, 0, 1)
        return normalize(v, 0.5 * (0.5 + 0.5 * vel))


class Flute(Instrument):
    name = 'flute'
    release = 0.16

    def render(self, f0, gate_s, vel, sr, rng, **p):
        n_gate = int(gate_s * sr)
        env = adsr(n_gate, sr, 0.07, 0.15, 0.88, self.release)
        n = env.shape[0]
        f = vibrato(n, sr, f0, rate=5.0, depth_semi=0.1, delay=0.3, ramp=0.4)
        v = osc('sine', f, sr) + 0.22 * osc('sine', f * 2, sr, phase0=0.1) + 0.08 * osc('sine', f * 3, sr)
        breath = filt(noise(n, rng), 'bp', f0 * 2.0, sr, q=1.5) * 0.06
        v = v + breath
        return normalize(v * env, 0.5 * (0.5 + 0.5 * vel))


class Pizzicato(Instrument):
    name = 'pizz'
    release = 0.25

    def render(self, f0, gate_s, vel, sr, rng, **p):
        n = int(min(0.6, gate_s + self.release) * sr)
        t = np.arange(n) / sr
        env = np.exp(-t / (0.09 + 0.05 * (1 - vel))) * (1 - np.exp(-t / 0.002))
        v = osc('saw', np.full(n, f0), sr) * 0.7 + osc('triangle', np.full(n, f0), sr) * 0.5
        v = filt(v, 'lp', min(sr * 0.45, 1200 + f0 * 2.5), sr, 0.9)
        thump = filt(noise(n, rng), 'lp', 400, sr) * np.exp(-t / 0.01) * 0.6
        return normalize((v + thump) * env, 0.5 * (0.4 + 0.6 * vel))


class Harp(Instrument):
    """Karplus-Strong string with fractional delay and a lowpass loop filter."""
    name = 'harp'
    release = 1.8

    def __init__(self, decay=2.2, brightness=0.55, release=1.8):
        self.decay = decay
        self.brightness = brightness
        self.release = release

    def render(self, f0, gate_s, vel, sr, rng, **p):
        n = int(min(self.max_len, gate_s + self.release) * sr)
        return karplus_strong(f0, n, sr, rng, decay_t=self.decay * (0.7 + 0.3 * vel),
                              brightness=self.brightness * (0.6 + 0.4 * vel), vel=vel)


def karplus_strong(f0, n, sr, rng, decay_t=2.0, brightness=0.5, vel=1.0, pick_pos=0.28):
    # loop lowpass: one pole y = (1-c) x + c y[-1]; brighter = smaller c
    c = 0.15 + 0.5 * (1.0 - brightness)
    lp_delay = c / (1.0 - c)
    d_total = sr / f0 - lp_delay
    if d_total < 2.0:
        d_total = 2.0
    di = int(math.floor(d_total))
    frac = d_total - di
    g = 10.0 ** (-3.0 / max(1.0, f0 * decay_t))
    # excitation: short noise burst with a pick-position comb and a velocity-dependent lowpass
    ex_len = di + 1
    ex = rng.standard_normal(ex_len)
    pp = max(1, int(pick_pos * di))
    ex[pp:] -= ex[:-pp]
    ex = filt(ex, 'lp', 1800 + 6000 * vel, sr, 0.7)
    x = np.zeros(n + 2 * di + 2)
    x[:ex_len] = ex
    y = np.zeros(n + 2 * di + 2)
    bl, al = np.array([1.0 - c]), np.array([1.0, -c])
    zi = np.zeros(1)
    B = di
    nblocks = (n + B - 1) // B
    for k in range(nblocks):
        s = k * B
        e = s + B
        xb = x[s:e]
        if k == 0:
            yb = xb.copy()
        else:
            prev = y[s - B:s]
            if k >= 2:
                prev_shift = np.concatenate(([y[s - B - 1]], prev[:-1]))
            else:
                prev_shift = np.concatenate(([0.0], prev[:-1]))
            fb = (1.0 - frac) * prev + frac * prev_shift
            fb, zi = signal.lfilter(bl, al, fb, zi=zi)
            yb = xb + g * fb
        y[s:e] = yb
    out = y[:n]
    # body resonance and a soft top
    out = filt(out, 'peak', 220, sr, q=1.0, gain_db=2.0)
    out = filt(out, 'lp', 7000, sr, 0.7)
    out = fade_edges(out, sr, 0.5, 30.0)
    # level by the ringing body (after the pick transient), then soften the transient spike
    body_from = min(n - 1, 3 * di + 2)
    body_peak = float(np.abs(out[body_from:]).max()) if body_from < n else 0.0
    if body_peak > 1e-6:
        limit = 1.25 * body_peak
        out[:body_from] = limit * np.tanh(out[:body_from] / limit)
    return normalize(out, 0.5 * (0.45 + 0.55 * vel))


class Mallet(Instrument):
    """Additive struck-bar family: celesta, music box, glockenspiel. Partial ratios per preset."""
    name = 'mallet'

    PRESETS = {
        # ratios, relative amps, decay seconds (tau) per partial, strike noise amount, hp cutoff
        'celesta': dict(ratios=(1.0, 2.76, 5.4, 8.9), amps=(1.0, 0.25, 0.08, 0.02), taus=(1.3, 0.35, 0.15, 0.08),
                        strike=0.12, bright_lp=9000),
        'musicbox': dict(ratios=(1.0, 6.27, 17.5), amps=(1.0, 0.35, 0.06), taus=(1.6, 0.25, 0.08),
                         strike=0.25, bright_lp=12000),
        'glock': dict(ratios=(1.0, 2.76, 5.4, 8.93), amps=(1.0, 0.45, 0.2, 0.06), taus=(2.2, 1.1, 0.5, 0.2),
                      strike=0.18, bright_lp=14000),
        'vibes': dict(ratios=(1.0, 4.0, 9.8), amps=(1.0, 0.18, 0.04), taus=(2.6, 0.5, 0.2),
                      strike=0.06, bright_lp=7000),
    }

    def __init__(self, preset='celesta', release=1.5):
        self.preset = preset
        self.release = release
        self.p = self.PRESETS[preset]

    def render(self, f0, gate_s, vel, sr, rng, **p):
        cfg = self.p
        n = int(min(self.max_len, gate_s + self.release) * sr)
        t = np.arange(n) / sr
        v = np.zeros(n)
        for r, a, tau in zip(cfg['ratios'], cfg['amps'], cfg['taus']):
            f = f0 * r
            if f > sr * 0.45:
                continue
            # higher velocity = brighter (upper partials louder) and slightly longer ring
            amp = a * (1.0 if r == 1.0 else (0.5 + 0.8 * vel))
            v += amp * np.sin(TWO_PI * f * t + rng.uniform(0, TWO_PI) * (0.0 if r == 1.0 else 1.0)) * np.exp(-t / (tau * (0.8 + 0.4 * vel)))
        strike = filt(noise(n, rng), 'bp', min(sr * 0.4, f0 * 4), sr, q=1.0) * np.exp(-t / 0.006) * cfg['strike']
        v = v + strike
        v *= (1 - np.exp(-t / 0.0015))
        v = filt(v, 'lp', min(sr * 0.45, cfg['bright_lp']), sr, 0.7)
        v = fade_edges(v, sr, 0.3, 25.0)
        return normalize(v, 0.5 * (0.35 + 0.65 * vel))


class Piano(Instrument):
    """Simple additive piano: slightly inharmonic partials, two-stage decay, hammer noise."""
    name = 'piano'
    release = 2.5

    def render(self, f0, gate_s, vel, sr, rng, **p):
        n = int(min(self.max_len, gate_s + self.release) * sr)
        t = np.arange(n) / sr
        v = np.zeros(n)
        B = 0.0004 if f0 > 200 else 0.0002
        nh = int(min(14, (sr * 0.45) / f0))
        for k in range(1, nh + 1):
            f = f0 * k * math.sqrt(1 + B * k * k)
            amp = (1.0 / k) * (0.6 + 0.4 * vel) ** (k - 1)
            if k % 7 == 0:  # strike at 1/7 of the string: 7th partials are weak
                amp *= 0.2
            tau = (1.8 / math.sqrt(k)) * (0.9 if f0 > 400 else 1.4)
            fast = np.exp(-t / (tau * 0.22)) * 0.6
            slow = np.exp(-t / tau) * 0.4
            v += amp * np.sin(TWO_PI * f * t + 0.3 * k) * (fast + slow)
        hammer = filt(noise(n, rng), 'bp', min(sr * 0.4, f0 * 3), sr, q=0.8) * np.exp(-t / 0.004) * 0.25
        v = v + hammer
        v *= (1 - np.exp(-t / 0.001))
        # damper after the gate (key release): quicker decay
        n_gate = int(gate_s * sr)
        if n_gate < n:
            td = np.arange(n - n_gate) / sr
            v[n_gate:] *= np.exp(-td / 0.35)
        v = filt(v, 'lp', min(sr * 0.45, 6500 + 4000 * vel), sr, 0.7)
        v = fade_edges(v, sr, 0.2, 20.0)
        return normalize(v, 0.5 * (0.35 + 0.65 * vel))


class Bell(Instrument):
    """Church bell: inharmonic partials (hum, prime, tierce, quint, nominal...), long decay."""
    name = 'bell'
    release = 6.0
    max_len = 9.0

    def render(self, f0, gate_s, vel, sr, rng, **p):
        n = int(min(self.max_len, gate_s + self.release) * sr)
        t = np.arange(n) / sr
        parts = ((0.5, 0.55, 5.5), (1.0, 1.0, 4.2), (1.2, 0.55, 3.4), (1.5, 0.35, 2.8),
                 (2.0, 0.6, 2.2), (2.51, 0.22, 1.5), (3.0, 0.2, 1.2), (4.17, 0.12, 0.7), (5.43, 0.06, 0.4))
        v = np.zeros(n)
        for r, a, tau in parts:
            f = f0 * r
            if f > sr * 0.45:
                continue
            # slow beating between two detuned copies gives the bell its "wow"
            det = 1.0 + rng.uniform(0.0008, 0.0025)
            v += a * (np.sin(TWO_PI * f * t) + 0.7 * np.sin(TWO_PI * f * det * t + 1.0)) * np.exp(-t / tau)
        clang = filt(noise(n, rng), 'bp', min(sr * 0.4, f0 * 3.2), sr, q=1.5) * np.exp(-t / 0.012) * 0.5
        v = v + clang
        v *= (1 - np.exp(-t / 0.002))
        v = filt(v, 'lp', 8000, sr, 0.7)
        v = fade_edges(v, sr, 0.3, 60.0)
        return normalize(v, 0.5 * (0.4 + 0.6 * vel))


class Bass(Instrument):
    name = 'bass'
    release = 0.12

    def render(self, f0, gate_s, vel, sr, rng, **p):
        n_gate = int(gate_s * sr)
        env = adsr(n_gate, sr, 0.012, 0.35, 0.75, self.release)
        n = env.shape[0]
        f = np.full(n, f0)
        v = osc('sine', f, sr) * 0.9 + osc('triangle', f, sr) * 0.5
        v = filt(v, 'lp', 700 + 500 * vel, sr, 0.8)
        t = np.arange(n) / sr
        v *= 1.0 + 0.4 * np.exp(-t / 0.06)   # attack bump
        return normalize(v * env, 0.5 * (0.5 + 0.5 * vel))


class LowDrum(Instrument):
    """Timpani-like: pitched sine sweep plus a felt thump."""
    name = 'lowdrum'
    release = 1.2

    def render(self, f0, gate_s, vel, sr, rng, **p):
        n = int(1.4 * sr)
        t = np.arange(n) / sr
        f = f0 * (1.0 + 1.2 * np.exp(-t / 0.035))
        body = np.sin(TWO_PI * np.cumsum(f) / sr) * np.exp(-t / (0.5 + 0.3 * vel))
        thump = filt(noise(n, rng), 'lp', 300, sr) * np.exp(-t / 0.02) * 0.8
        v = body + thump
        v = filt(v, 'lp', 1800, sr, 0.7)
        return normalize(v, 0.5 * (0.5 + 0.5 * vel))


class Creak(Instrument):
    """Deep wooden creak: an irregular, decelerating impulse train through a low resonance,
    with a sub thump. Used for the Archive's "root creak" percussion."""
    name = 'creak'
    release = 1.0

    def render(self, f0, gate_s, vel, sr, rng, **p):
        n = int(1.3 * sr)
        t = np.arange(n) / sr
        imp = np.zeros(n)
        pos = 0.0
        rate = 55.0 + rng.uniform(-10, 10)
        while pos < 0.55:
            i = int(pos * sr)
            if i < n:
                imp[i] = rng.uniform(0.6, 1.0)
            rate *= 0.985 + rng.uniform(-0.01, 0.01)
            pos += 1.0 / max(12.0, rate) * rng.uniform(0.85, 1.15)
        res = filt(imp, 'bp', 140.0, sr, q=9.0) * 6.0 + filt(imp, 'bp', 420.0, sr, q=6.0) * 2.5 \
            + filt(imp, 'bp', 900.0, sr, q=5.0) * 0.8
        res *= np.exp(-t / 0.5)
        res = res / max(1e-6, float(np.abs(res).max()))
        sub = np.sin(TWO_PI * np.cumsum(f0 * (1 + 0.8 * np.exp(-t / 0.05))) / sr) * np.exp(-t / 0.22)
        v = res + 0.35 * sub
        v = filt(v, 'lp', 1500, sr, 0.7)
        return normalize(v, 0.5 * (0.4 + 0.6 * vel))


class Shaker(Instrument):
    name = 'shaker'
    release = 0.1

    def __init__(self, brush=False):
        self.brush = brush

    def render(self, f0, gate_s, vel, sr, rng, **p):
        n = int((0.35 if self.brush else 0.12) * sr)
        t = np.arange(n) / sr
        v = noise(n, rng)
        if self.brush:
            v = filt(v, 'bp', 2600, sr, q=0.9) * (1 - np.exp(-t / 0.04)) * np.exp(-t / 0.12)
        else:
            v = filt(v, 'hp', 5000, sr, 0.8) * np.exp(-t / 0.03) * (1 - np.exp(-t / 0.002))
        return normalize(v, 0.5 * (0.5 + 0.5 * vel))


def make(name, **kw):
    """Instrument factory by short name used in song files."""
    table = {
        'strings': lambda: StringsPad(**kw),
        'strings_low': lambda: StringsPad(attack=0.7, detune=6.0, dark=800.0, bright=2200.0, sub=0.12, **kw),
        'strings_high': lambda: StringsPad(attack=0.45, detune=8.0, dark=1800.0, bright=5000.0, **kw),
        'choir': lambda: ChoirPad(),
        'horn': lambda: Horn(**kw),
        'oboe': lambda: Oboe(**kw),
        'flute': lambda: Flute(),
        'pizz': lambda: Pizzicato(),
        'harp': lambda: Harp(**kw),
        'celesta': lambda: Mallet('celesta', **kw),
        'musicbox': lambda: Mallet('musicbox', **kw),
        'glock': lambda: Mallet('glock', **kw),
        'vibes': lambda: Mallet('vibes', **kw),
        'piano': lambda: Piano(),
        'bell': lambda: Bell(),
        'bass': lambda: Bass(),
        'lowdrum': lambda: LowDrum(),
        'creak': lambda: Creak(),
        'shaker': lambda: Shaker(),
        'brush': lambda: Shaker(brush=True),
    }
    return table[name]()
