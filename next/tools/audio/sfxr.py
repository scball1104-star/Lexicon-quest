"""sfxr-style one-shot generator (vectorized port of DrPetter's sfxr parameter model).

Parameters keep sfxr's names and 0..1 (or -1..1) ranges so presets can be shared with the
classic tool (sfxr / bfxr / jsfxr). The synthesis itself is a vectorized re-implementation:
band-limited oscillators instead of 8x supersampling, and sfxr's resonant low-pass / one-pole
high-pass / phaser mapped to equivalent filters with the same parameter trajectories.

    from sfxr import Sfxr, PRESETS, render
    y = render(PRESETS['pickup_coin'])                 # float array at RENDER_SR
    y = render(dict(PRESETS['laser_shoot'], base_freq=0.6))

Parameter reference (sfxr semantics, sampled at 44.1 kHz):
    wave            'square' | 'saw' | 'sine' | 'noise'
    env_attack      attack length,  len = v^2 * 100000 samples
    env_sustain     sustain length, len = v^2 * 100000 samples
    env_punch       extra level at the start of sustain (0..1), decays linearly over the sustain
    env_decay       decay length,   len = v^2 * 100000 samples
    base_freq       start pitch: period = 100 / (v^2 + 0.001) supersamples (0.3 ~ 320 Hz, 0.5 ~ 890 Hz)
    freq_limit      lowest pitch; the sound stops when a downward slide passes it (0 = none)
    freq_ramp       slide (-1..1): positive rises, period *= 1 - v^3 * 0.01 per sample
    freq_dramp      slide acceleration (-1..1)
    vib_strength    vibrato depth (0..1, 0.5 = +-25 % period)
    vib_speed       vibrato rate (0..1)
    arp_mod         one-time pitch jump (-1..1; positive jumps up)
    arp_speed       when the jump happens (1 = never, 0 = late, near 1 = early)
    duty            square duty (0 = 50 %, 1 = ~0 %)
    duty_ramp       duty sweep
    repeat_speed    restart pitch/duty/arp periodically (0 = off)
    pha_offset      phaser (flanger) delay offset (-1..1)
    pha_ramp        phaser sweep (-1..1)
    lpf_freq        resonant low-pass cutoff (1 = off)
    lpf_ramp        cutoff sweep (-1..1)
    lpf_resonance   0..1
    hpf_freq        one-pole high-pass cutoff (0 = off)
    hpf_ramp        high-pass sweep (-1..1)
"""
from __future__ import annotations

import math

import numpy as np

import dsp

SS = 8 * 44100  # sfxr's internal supersample rate; all sfxr period math is in these units

DEFAULTS = dict(
    wave="square",
    env_attack=0.0, env_sustain=0.3, env_punch=0.0, env_decay=0.4,
    base_freq=0.3, freq_limit=0.0, freq_ramp=0.0, freq_dramp=0.0,
    vib_strength=0.0, vib_speed=0.0,
    arp_mod=0.0, arp_speed=0.0,
    duty=0.0, duty_ramp=0.0,
    repeat_speed=0.0,
    pha_offset=0.0, pha_ramp=0.0,
    lpf_freq=1.0, lpf_ramp=0.0, lpf_resonance=0.0,
    hpf_freq=0.0, hpf_ramp=0.0,
    seed=1,
)

# Documented presets. Each mirrors one of sfxr's generator buttons, with fixed values so the
# output is reproducible. Comments say what each one is for in Lexicon Quest.
PRESETS = {
    # Menu tick / selection blip: short square, slightly thin duty, cut lows.
    "blip_select": dict(wave="square", base_freq=0.56, duty=0.35, env_sustain=0.07, env_decay=0.11, hpf_freq=0.12),
    # Coin / pickup: square with a punchy sustain and an upward arpeggio jump (B to E feel).
    "pickup_coin": dict(wave="square", base_freq=0.58, duty=0.25, env_sustain=0.07, env_punch=0.45, env_decay=0.28,
                        arp_speed=0.62, arp_mod=0.38),
    # Laser / zap: falling saw with a pitch floor.
    "laser_shoot": dict(wave="saw", base_freq=0.78, freq_limit=0.18, freq_ramp=-0.28, duty=0.3, duty_ramp=-0.1,
                        env_sustain=0.12, env_decay=0.17, hpf_freq=0.06),
    # Explosion: low noise with punch, slow pitch fall and a moving phaser.
    "explosion": dict(wave="noise", base_freq=0.2, freq_ramp=-0.08, env_sustain=0.33, env_punch=0.55, env_decay=0.48,
                      pha_offset=0.18, pha_ramp=-0.06, vib_strength=0.18, vib_speed=0.35, lpf_freq=0.75),
    # Power-up: rising square with vibrato and a repeat (classic charge-up).
    "powerup": dict(wave="square", base_freq=0.33, freq_ramp=0.2, duty=0.35, env_sustain=0.3, env_decay=0.28,
                    vib_strength=0.22, vib_speed=0.55, repeat_speed=0.58),
    # Hit / hurt: falling noise burst.
    "hit_hurt": dict(wave="noise", base_freq=0.5, freq_ramp=-0.42, env_sustain=0.05, env_decay=0.19, hpf_freq=0.14),
    # Jump: rising square chirp.
    "jump": dict(wave="square", base_freq=0.36, freq_ramp=0.26, duty=0.45, env_sustain=0.17, env_decay=0.17,
                 hpf_freq=0.05, lpf_freq=0.8),
    # Buzz / error: low saw with a little vibrato, filtered so it is not harsh.
    "buzz": dict(wave="saw", base_freq=0.16, env_sustain=0.2, env_decay=0.1, vib_strength=0.12, vib_speed=0.75,
                 lpf_freq=0.42, lpf_resonance=0.3),
    # Charge: long rising sweep with a fast repeat (fury gauge filling).
    "charge": dict(wave="square", base_freq=0.22, freq_ramp=0.12, duty=0.2, duty_ramp=0.25, env_attack=0.15,
                   env_sustain=0.25, env_decay=0.2, repeat_speed=0.7, lpf_freq=0.7),
    # Dissolve: noise whose pitch falls (enemy death crumble).
    "dissolve": dict(wave="noise", base_freq=0.62, freq_ramp=-0.24, env_sustain=0.22, env_decay=0.42, pha_offset=0.1,
                     pha_ramp=0.08, lpf_freq=0.85, lpf_ramp=-0.18),
    # Chirp: very short sine up-chirp (bird / sparkle seed).
    "chirp": dict(wave="sine", base_freq=0.62, freq_ramp=0.32, env_sustain=0.04, env_decay=0.08),
}


def _env(p, n_hint=None):
    a = int(p["env_attack"] ** 2 * 100000)
    s = int(p["env_sustain"] ** 2 * 100000)
    d = int(p["env_decay"] ** 2 * 100000)
    a1, s1, d1 = a + 1, s + 1, d + 1
    n = a1 + s1 + d1
    e = np.empty(n)
    e[:a1] = np.arange(a1) / max(1, a)
    e[a1:a1 + s1] = 1.0 + (1.0 - np.arange(s1) / max(1, s)) * 2.0 * p["env_punch"]
    e[a1 + s1:] = 1.0 - np.arange(d1) / max(1, d)
    return np.clip(e, 0.0, None)


def render(params: dict, sr: int = dsp.RENDER_SR) -> np.ndarray:
    """Render an sfxr parameter set. Returns float mono at `sr` (normalized to peak 0.9)."""
    p = dict(DEFAULTS)
    p.update(params or {})
    g = dsp.rng(int(p["seed"]))
    env = _env(p)
    n = len(env)
    k = np.arange(n)

    rep = int((1.0 - p["repeat_speed"]) ** 2 * 20000 + 32) if p["repeat_speed"] > 0 else 0
    kk = k % rep if rep else k

    # pitch trajectory (period in supersamples)
    fperiod0 = 100.0 / (p["base_freq"] ** 2 + 0.001)
    fmax = 100.0 / (p["freq_limit"] ** 2 + 0.001)
    fslide0 = 1.0 - p["freq_ramp"] ** 3 * 0.01
    fdslide = -(p["freq_dramp"] ** 3) * 0.000001
    seg = rep if rep else n
    j = np.arange(seg)
    slides = np.maximum(1e-6, fslide0 + (j + 1) * fdslide)
    logp = np.log(fperiod0) + np.cumsum(np.log(slides))
    period = np.exp(logp)[kk]
    arp_mod = 1.0 - p["arp_mod"] ** 2 * 0.9 if p["arp_mod"] >= 0 else 1.0 + p["arp_mod"] ** 2 * 10.0
    if p["arp_speed"] < 1.0:
        arp_limit = int((1.0 - p["arp_speed"]) ** 2 * 20000 + 32)
        period = np.where(kk + 1 >= arp_limit, period * arp_mod, period)
    stop = n
    over = np.nonzero(period > fmax)[0]
    if len(over):
        period = np.minimum(period, fmax)
        if p["freq_limit"] > 0:
            stop = int(over[0])
    vib_amp = p["vib_strength"] * 0.5
    if vib_amp > 0:
        vib_speed = p["vib_speed"] ** 2 * 0.01
        period = period * (1.0 + np.sin((k + 1) * vib_speed) * vib_amp)
    period = np.maximum(period, 8.0)
    freq = np.minimum(SS / period, sr * 0.45)

    duty = np.clip(0.5 - p["duty"] * 0.5 + (kk + 1) * (-p["duty_ramp"] * 0.00005), 0.0, 0.5)

    w = p["wave"]
    if w == "square":
        y = 0.5 * dsp.pulse(freq, n, sr, np.maximum(duty, 0.03))
    elif w == "saw":
        y = -dsp.saw(freq, n, sr)
    elif w == "sine":
        y = dsp.sine(freq, n, sr)
    elif w == "noise":
        y = dsp.sample_hold(g.uniform(-1, 1, n), np.minimum(freq * 32.0 * sr / 44100.0, sr), sr)
    else:
        raise ValueError(w)

    # resonant low-pass (sfxr: fltw per supersample, damping fixed at reset)
    if p["lpf_freq"] < 1.0:
        fltw0 = p["lpf_freq"] ** 3 * 0.1
        fltw_d = 1.0 + p["lpf_ramp"] * 0.0001
        fltw = np.clip(fltw0 * fltw_d ** (8.0 * k), 0.0, 0.1)
        fltdmp = min(0.8, 5.0 / (1.0 + p["lpf_resonance"] ** 2 * 20.0) * (0.01 + fltw0))
        fc = np.sqrt(fltw) * SS / (2 * math.pi)
        q = np.clip(np.sqrt(np.maximum(fltw, 1e-9)) / fltdmp, 0.5, 18.0)
        y = dsp.bq_tv(y, "lp", np.clip(fc, 20.0, sr * 0.45), q, sr)
    # one-pole high-pass
    if p["hpf_freq"] > 0 or p["hpf_ramp"] != 0:
        flthp0 = p["hpf_freq"] ** 2 * 0.1
        flthp_d = 1.0 + p["hpf_ramp"] * 0.0003
        flthp = np.clip(flthp0 * flthp_d ** (8.0 * k), 0.00001, 0.1)
        fc = flthp * SS / (2 * math.pi)
        y = dsp.bq_tv(y, "hp", np.clip(fc, 5.0, sr * 0.45), 0.6, sr)
    # phaser (feed-forward comb with a moving delay)
    if p["pha_offset"] != 0 or p["pha_ramp"] != 0:
        fph0 = math.copysign(p["pha_offset"] ** 2 * 1020.0, p["pha_offset"])
        fdph = math.copysign(p["pha_ramp"] ** 2 * 1.0, p["pha_ramp"])
        iph = np.minimum(np.abs(fph0 + (k + 1) * fdph), 1023.0)
        delay = iph / SS * sr
        y = y + np.interp(k - delay, k, y, left=0.0)

    y = (y * env)[:stop]
    y = dsp.dc_block(y, sr)
    pk = np.max(np.abs(y)) + 1e-12
    return y * (0.9 / pk)


def mutate(params: dict, g: np.random.Generator, amount: float = 0.05, keys=None) -> dict:
    """Small random variation of a preset (for round-robin variants)."""
    out = dict(DEFAULTS)
    out.update(params)
    for k in keys or ("base_freq", "freq_ramp", "env_sustain", "env_decay", "duty", "lpf_freq", "hpf_freq"):
        v = out[k]
        if isinstance(v, (int, float)):
            lo = -1.0 if k in ("freq_ramp", "freq_dramp", "duty_ramp", "lpf_ramp", "hpf_ramp", "pha_offset", "pha_ramp", "arp_mod") else 0.0
            out[k] = float(np.clip(v + g.uniform(-amount, amount), lo, 1.0))
    out["seed"] = int(g.integers(1, 1 << 30))
    return out
