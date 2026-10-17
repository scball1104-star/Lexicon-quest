"""Synth instruments for the jingle tracker (SNES / DQ / FF flavor).

Signature: inst(freq_hz, dur_s, vel 0..1, g) -> mono float array at RENDER_SR.
`dur_s` is the gate (note-on) time; the returned array includes the release tail.
"""
from __future__ import annotations

import math

import numpy as np

import dsp
import kit
from dsp import RENDER_SR as SR, ns, tvec


def _adsr(dur, a, d, s, r, sr=SR):
    n = ns(dur + r * 5, sr)
    return dsp.env_adsr(n, sr, a, d, s, r, dur), n


def _vib(n, rate=5.5, depth=0.006, delay=0.18, fade=0.25, sr=SR):
    return 1.0 + dsp.lfo(rate, n, sr, depth, delay=delay, fade=fade)


def _scoop(n, amount=0.015, time=0.035, sr=SR):
    """Pitch scoop into the note (brass, voice)."""
    t = tvec(n, sr)
    return 1.0 - amount * np.exp(-t / time)


def pulse_lead(f, dur, vel, g, duty=0.25, pwm=0.1, bright=1.0):
    """Chip pulse lead: slow PWM, delayed vibrato, gentle filter."""
    env, n = _adsr(dur, 0.004, 0.12, 0.72, 0.07)
    freq = f * _vib(n, 5.8, 0.007, 0.15, 0.2)
    d = duty + pwm * dsp.lfo(2.3, n, SR, 1.0, g.random() * 6)
    y = dsp.pulse(freq, n, SR, d) * env
    y = dsp.butter(y, "low", min(9000, f * 8 * bright + 800), SR, 2)
    return y * 0.5


def brass(f, dur, vel, g, bright=1.0):
    """SNES-style brass: detuned saws, filter 'blat' on the attack, pitch scoop, delayed vibrato."""
    env, n = _adsr(dur, 0.018, 0.25, 0.8, 0.12)
    freq = f * _scoop(n, 0.018, 0.03) * _vib(n, 5.2, 0.005, 0.22, 0.25)
    y = dsp.saw(freq * 2 ** (4 / 1200), n, SR, g.random()) + dsp.saw(freq * 2 ** (-4 / 1200), n, SR, g.random())
    t = tvec(n, SR)
    fenv = np.clip(t / 0.025, 0, 1) * (0.55 + 0.45 * np.exp(-t / 0.18))
    cutoff = f * (1.2 + (3.5 + 3.0 * vel) * bright * fenv) + 300
    y = dsp.bq_tv(y, "lp", np.minimum(cutoff, 9500), 0.9, SR, block=32)
    y = dsp.saturate(y * 0.6, 1.4)
    return y * env * 0.6


def horn(f, dur, vel, g):
    """Mellow French horn: darker brass with a slower swell."""
    env, n = _adsr(dur, 0.06, 0.4, 0.85, 0.18)
    freq = f * _vib(n, 4.8, 0.004, 0.3, 0.3)
    y = dsp.saw(freq, n, SR, g.random()) + 0.6 * dsp.triangle(freq, n, SR)
    t = tvec(n, SR)
    cutoff = f * (1.0 + 2.2 * np.clip(t / 0.08, 0, 1)) + 250
    y = dsp.bq_tv(y, "lp", np.minimum(cutoff, 4000), 0.8, SR, block=32)
    return y * env * 0.55


def strings(f, dur, vel, g):
    """String ensemble pad: three detuned saws, low-passed, slow attack, chorus."""
    env, n = _adsr(dur, 0.09, 0.3, 0.85, 0.32)
    y = np.zeros(n)
    for c in (-9.0, 0.0, 8.0):
        fr = f * 2 ** (c / 1200) * _vib(n, 5.0 + c * 0.05, 0.004, 0.25, 0.3)
        y += dsp.saw(fr, n, SR, g.random())
    y = dsp.butter(y, "low", min(6500, f * 4.5 + 600), SR, 2)
    y = dsp.butter(y, "high", 120, SR, 1)
    return y * env * 0.32


def tri_bass(f, dur, vel, g):
    """Triangle bass with a sine sub and a soft pluck."""
    env, n = _adsr(dur, 0.004, 0.25, 0.65, 0.06)
    y = dsp.triangle(f, n, SR) + 0.35 * dsp.sine(f, n, SR)
    return y * env * 0.7


def pizz_bass(f, dur, vel, g):
    """Plucked bass (pizzicato / harp low end)."""
    y = kit.karplus(f, max(0.5, dur + 0.4), g, t60=0.9, bright=0.35)
    y += 0.5 * dsp.sine(f, len(y), SR) * dsp.env_exp(len(y), SR, 0.25, 0.003)
    return y * 0.6


def harp(f, dur, vel, g):
    """Harp / pluck: Karplus-Strong plus a sine body. Rings past the gate."""
    t60 = float(np.clip(2.2 - math.log2(f / 220.0) * 0.45, 0.5, 2.4))
    y = kit.karplus(f, t60 * 0.9 + 0.1, g, t60=t60, bright=0.5, pick=0.17)
    body = dsp.sine(f, len(y), SR) * dsp.env_exp(len(y), SR, t60 * 0.25, 0.002)
    return (y * 0.75 + body * 0.35) * 0.55


def celesta(f, dur, vel, g):
    """Celesta / music box: sine with a quickly fading 4th partial and a tiny strike."""
    n = ns(max(0.6, dur + 0.6))
    t = tvec(n, SR)
    y = np.sin(dsp.TAU * f * t) * np.exp(-t / 0.55) + 0.35 * np.sin(dsp.TAU * f * 4.0 * t) * np.exp(-t / 0.06)
    y += 0.12 * np.sin(dsp.TAU * f * 2.0 * t) * np.exp(-t / 0.25)
    y *= np.clip(t / 0.0015, 0, 1)
    return kit.release(y, 0.15) * 0.45


def bell(f, dur, vel, g):
    """Bright FM bell (glockenspiel-like)."""
    return kit.fm_bell(f, max(0.9, dur + 0.8), ratio=3.5, index=2.2 * (0.6 + 0.4 * vel), decay=0.45, idx_decay=0.09) * 0.4


def chapel_bell(f, dur, vel, g):
    """Church bell (f = nominal)."""
    return kit.church_bell(f, max(2.5, dur + 2.0), g, decay=1.1, eerie=0.3) * 0.45


def flute(f, dur, vel, g):
    """Flute: near-sine with a little 2nd/3rd harmonic, breath chiff, delayed vibrato."""
    env, n = _adsr(dur, 0.035, 0.2, 0.85, 0.09)
    freq = f * _vib(n, 5.2, 0.006, 0.2, 0.3)
    ph = np.cumsum(freq / SR)
    y = np.sin(dsp.TAU * ph) + 0.12 * np.sin(2 * dsp.TAU * ph) + 0.04 * np.sin(3 * dsp.TAU * ph)
    breath = dsp.bq(dsp.white(n, g), "bp", min(9000, f * 2.0), 1.2, SR)
    chiff = np.exp(-tvec(n, SR) / 0.03)
    y = y + breath * (0.06 + 0.25 * chiff)
    return y * env * 0.5


def oboe(f, dur, vel, g):
    """Oboe-ish double reed: narrow pulse through formant peaks, vibrato."""
    env, n = _adsr(dur, 0.03, 0.2, 0.85, 0.1)
    freq = f * _vib(n, 5.0, 0.007, 0.2, 0.3)
    y = dsp.pulse(freq, n, SR, 0.16)
    y = dsp.bq(y, "peak", 1150, 2.0, SR, 9.0)
    y = dsp.bq(y, "peak", 2700, 2.5, SR, 6.0)
    y = dsp.butter(y, "low", 5000, SR, 2)
    y = dsp.butter(y, "high", f * 0.8, SR, 2)
    return y * env * 0.18


def organ(f, dur, vel, g):
    """Small chapel organ: additive drawbars with a gentle swell and slow tremulant."""
    env, n = _adsr(dur, 0.05, 0.4, 0.92, 0.22)
    t = tvec(n, SR)
    y = np.zeros(n)
    for h, a in ((0.5, 0.35), (1, 1.0), (2, 0.55), (3, 0.25), (4, 0.22), (6, 0.08)):
        if f * h < SR * 0.45:
            y += a * np.sin(dsp.TAU * f * h * t + g.random() * dsp.TAU)
    y *= 1.0 + 0.06 * np.sin(dsp.TAU * 5.5 * t)
    return y * env * 0.22


def timpani(f, dur, vel, g):
    """Timpani: tuned membrane (pitch settles), inharmonic overtone, mallet thump."""
    n = ns(1.4)
    t = tvec(n, SR)
    fr = f * (1.0 + 0.04 * np.exp(-t / 0.03))
    ph = np.cumsum(fr / SR)
    y = np.sin(dsp.TAU * ph) * np.exp(-t / 0.55) + 0.4 * np.sin(dsp.TAU * ph * 1.51) * np.exp(-t / 0.25)
    y += 0.2 * np.sin(dsp.TAU * ph * 1.99) * np.exp(-t / 0.15)
    th = kit.noise_burst(0.05, g, ("low", 700), 0.012, 0.0005)
    y[: len(th)] += th * 0.6
    y *= np.clip(t / 0.002, 0, 1)
    return kit.release(y, 0.2) * (0.5 + 0.5 * vel) * 0.8


def snare(f, dur, vel, g):
    """Soft orchestral snare (f ignored)."""
    m = dsp.Mix(SR)
    m.add(kit.noise_burst(0.2, g, (1500, 7500), 0.06, 0.0008), 0.0, 0.8)
    m.add(kit.thump(220, 160, 0.08, 0.025), 0.0, 0.5)
    return m.out * (0.4 + 0.6 * vel) * 0.55


def crash(f, dur, vel, g):
    """Crash / suspended cymbal (f ignored): high noise with metallic partials, long decay."""
    n = ns(2.0)
    t = tvec(n, SR)
    x = dsp.butter(dsp.white(n, g), "high", 3500, SR, 2) * np.exp(-t / 0.55)
    x += 0.3 * dsp.butter(dsp.white(n, g), "band", (6000, 10000), SR, 2) * np.exp(-t / 0.3)
    met = dsp.partials(3100, [1, 1.37, 1.83, 2.41, 2.97], [0.4, 0.3, 0.25, 0.2, 0.15], [0.6, 0.5, 0.4, 0.3, 0.25], n, SR, g)
    y = (x + met * 0.25) * np.clip(t / 0.003, 0, 1)
    return kit.release(y, 0.25) * 0.35 * (0.4 + 0.6 * vel)


def roll_cymbal(f, dur, vel, g):
    """Cymbal swell (reverse-like crescendo over the gate, then a soft decay)."""
    n = ns(dur + 0.8)
    t = tvec(n, SR)
    x = dsp.butter(dsp.white(n, g), "high", 3000, SR, 2)
    env = np.where(t < dur, (t / max(dur, 1e-3)) ** 2, np.exp(-(t - dur) / 0.25))
    return x * env * 0.18 * (0.5 + 0.5 * vel)


def kick(f, dur, vel, g):
    return kit.thump(110, 45, 0.3, 0.09, 0.001) * 0.8 * (0.5 + 0.5 * vel)


def triangle_perc(f, dur, vel, g):
    """Orchestral triangle ting."""
    return dsp.partials(5200, [1, 1.47, 2.09, 2.81], [1, 0.5, 0.3, 0.2], [0.5, 0.35, 0.25, 0.15], ns(1.0), SR, g) * 0.12 * (0.5 + 0.5 * vel)


INSTRUMENTS = {
    "pulse": pulse_lead,
    "pulse12": lambda f, d, v, g: pulse_lead(f, d, v, g, duty=0.125, pwm=0.05),
    "brass": brass,
    "horn": horn,
    "strings": strings,
    "tri_bass": tri_bass,
    "pizz_bass": pizz_bass,
    "harp": harp,
    "celesta": celesta,
    "bell": bell,
    "chapel_bell": chapel_bell,
    "flute": flute,
    "oboe": oboe,
    "organ": organ,
    "timpani": timpani,
    "snare": snare,
    "crash": crash,
    "swell": roll_cymbal,
    "kick": kick,
    "triangle": triangle_perc,
}
