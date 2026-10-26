"""Seamless ambience loops (mono, 44.1 kHz render; build.py resamples circularly to 22.05 kHz).

Every layer is periodic in the loop length N, so the file loops without a seam:
  * noise beds are FFT-shaped (circular) noise
  * modulation signals contain only whole cycles per loop
  * one-shot events (birds, drips, rustles) are added with wrap-around
  * reverb is a circular convolution
  * time-varying filters are run over three periods and the last period is kept (steady state)
The runtime plays two copies half a loop apart, panned left/right, for a wide stereo bed.
"""
from __future__ import annotations

import math
import zlib

import numpy as np
from scipy import signal

import dsp
import kit
from dsp import RENDER_SR as SR, ns, tvec

REG: dict = {}
STEMS: dict = {}  # filled on render, for level checks (score of each layer inside a loop)


def amb(id_, intent, seconds, trim_db=0.0, out_sr=22050):
    """out_sr: delivery rate. Dark beds with nothing above 8 kHz ship at 16 kHz to save space."""
    def deco(fn):
        REG[id_] = dict(id=id_, fn=lambda: fn(ns(seconds), dsp.rng(zlib.crc32(id_.encode()))),
                        intent=intent, seconds=seconds, trim_db=trim_db, sr=SR, out_sr=out_sr)
        return fn
    return deco


# ----------------------------------------------------------------------------- circular helpers
def fft_band(x, lo=None, hi=None, order=2):
    """Zero-phase circular Butterworth-magnitude band filter."""
    n = len(x)
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(n, 1 / SR)
    H = np.ones_like(f)
    if hi:
        H *= 1 / np.sqrt(1 + (f / hi) ** (2 * order))
    if lo:
        with np.errstate(divide="ignore"):
            H *= 1 / np.sqrt(1 + (lo / np.maximum(f, 1e-6)) ** (2 * order))
    return np.fft.irfft(X * H, n)


def circ_noise(n, g, slope=-3.0, lo=None, hi=None, order=2):
    y = dsp.colored(n, g, slope)
    if lo or hi:
        y = fft_band(y, lo, hi, order)
    return y / (np.std(y) + 1e-12)


def periodic_lfo(n, g, rate_hz, smooth=True):
    """Random smooth control in [-1, 1] that repeats exactly every n samples."""
    return dsp.smooth_random(n, g, rate_hz, SR, periodic=True)


def place(buf, x, pos, gain=1.0):
    n = len(buf)
    idx = (int(pos) + np.arange(len(x))) % n
    np.add.at(buf, idx, x * gain)


def circ_reverb(x, t60=1.2, predelay=0.02, bright=0.5, seed=3):
    ir = dsp.reverb_ir(SR, t60, predelay, bright, seed, stereo_out=False)
    n = len(x)
    if len(ir) >= n:
        ir = ir[: n - 1]
    return np.fft.irfft(np.fft.rfft(x) * np.fft.rfft(ir, n), n)


def tv_filter_periodic(x, kind, f0, q):
    """Time-varying biquad on a periodic input with periodic f0: run 3 periods, keep the last."""
    n = len(x)
    xx = np.concatenate([x, x, x])
    ff = np.concatenate([f0, f0, f0])
    y = dsp.bq_tv(xx, kind, ff, q, SR, block=64)
    return y[2 * n:]


# ----------------------------------------------------------------------------- birds
def chirp(g, f0, f1, dur, harm=0.08, vib=0.0):
    k = ns(dur)
    t = np.linspace(0, 1, k)
    f = f0 * (f1 / f0) ** (t ** 0.8)
    if vib:
        f = f * (1 + vib * np.sin(2 * np.pi * 38 * t * dur))
    ph = np.cumsum(f / SR)
    y = np.sin(2 * np.pi * ph) + harm * np.sin(4 * np.pi * ph)
    env = np.sin(np.pi * t) ** 1.5
    return y * env


def bird_phrase(g, kind):
    m = dsp.Mix(SR)
    if kind == "warbler":  # quick up-down tweets then a trill
        t = 0.0
        for i in range(g.integers(3, 6)):
            f = g.uniform(3200, 4200)
            m.add(chirp(g, f, f * g.uniform(1.25, 1.5), g.uniform(0.04, 0.07)), t, g.uniform(0.6, 1.0))
            t += g.uniform(0.09, 0.14)
        for i in range(8):
            m.add(chirp(g, 4600, 3900, 0.025), t + i * 0.035, 0.5)
    elif kind == "whistle":  # two pure tones, high then lower (fee-bee)
        f = g.uniform(3000, 3600)
        m.add(chirp(g, f, f * 0.98, 0.22, harm=0.02), 0.0, 1.0)
        m.add(chirp(g, f * 0.84, f * 0.82, 0.26, harm=0.02), 0.3, 0.9)
    elif kind == "sparrow":  # repeated short chips
        f = g.uniform(4200, 5200)
        for i in range(g.integers(4, 8)):
            m.add(chirp(g, f, f * 0.7, 0.03, harm=0.15), i * g.uniform(0.07, 0.1), g.uniform(0.5, 0.9))
    elif kind == "dove":  # soft low coo, far away
        for i, (a, b) in enumerate(((620, 700), (700, 560), (560, 540))):
            m.add(chirp(g, a, b, 0.28 if i else 0.18, harm=0.25), i * 0.32, 0.5)
    return m.out


# ----------------------------------------------------------------------------- loops
@amb("river_birds", "Willowmere and the riverside valley: a gentle river (filtered noise with slow surges and "
     "a brighter ripple layer), small water plops, and a few songbirds (warbler, whistle, sparrow, a distant "
     "dove). Birds are sparse; with the runtime's left/right half-loop offset they answer each other.", 10.0)
def river_birds(n, g):
    flow = periodic_lfo(n, g, 0.5)
    ripple = periodic_lfo(n, g, 3.0)
    bed = circ_noise(n, g, -3.0, 220, 3200) * (0.75 + 0.25 * flow)
    bright = circ_noise(n, g, -1.5, 1500, 6500) * (0.55 + 0.45 * ripple) * 0.35
    y = bed + bright
    plops = np.zeros(n)
    for _ in range(46):
        f = math.exp(g.uniform(math.log(380), math.log(1300)))
        L = g.uniform(0.012, 0.03)
        k = ns(L)
        p = dsp.sine(dsp.glide(f, f * 1.8, k, "exp", 0.7), k, SR) * dsp.env_exp(k, SR, L * 0.3, 0.002)
        place(plops, p, g.integers(0, n), g.uniform(0.15, 0.5))
    y += plops * 0.9
    birds = np.zeros(n)
    plan = [("warbler", 0.6), ("whistle", 3.4), ("sparrow", 6.1), ("dove", 8.0)]
    for kind, at in plan:
        ph = bird_phrase(g, kind)
        gain = 0.22 if kind == "dove" else 0.5
        place(birds, ph, ns(at + g.uniform(-0.2, 0.2)), gain)
    birds = birds + 0.35 * circ_reverb(birds, 0.9, 0.03, 0.7)
    bed_n = y / (np.std(y) + 1e-12)
    STEMS["river_birds"] = dict(water=bed_n, birds=birds * 3.2)
    y = bed_n + birds * 3.2
    y = y + 0.12 * circ_reverb(y, 0.6, 0.015, 0.5)
    return y


@amb("archive_hush", "The Rootbound Archive: a low, still room tone, faint high air, a few distant drips in a "
     "large stone space, an occasional soft paper rustle and one far-off creak of roots settling. Quiet and "
     "spacious; it should feel ancient, not scary.", 10.0, out_sr=16000)
def archive_hush(n, g):
    tone = circ_noise(n, g, -6.0, 40, 260, 3) * (0.85 + 0.15 * periodic_lfo(n, g, 0.2))
    air = circ_noise(n, g, -2.0, 2500, 8000) * 0.06
    hum = (np.sin(2 * np.pi * np.arange(n) * round(55 * n / SR) / n) * 0.05
           + np.sin(2 * np.pi * np.arange(n) * round(82.5 * n / SR) / n) * 0.025)
    y = tone + air + hum
    fx = np.zeros(n)
    for at in (1.3, 4.9, 7.6):  # drips
        k = ns(0.05)
        f0 = g.uniform(900, 1300)
        d = dsp.sine(dsp.glide(f0, f0 * 1.9, k, "exp", 0.6), k, SR) * dsp.env_exp(k, SR, 0.012, 0.001)
        place(fx, d, ns(at + g.uniform(-0.15, 0.15)), g.uniform(0.35, 0.6))
    for at in (2.6, 6.4):  # paper rustles
        dur = g.uniform(0.35, 0.6)
        r = np.zeros(ns(dur))
        t = 0.0
        while t < dur - 0.03:
            fl = kit.paper_flap(g, SR, g.uniform(0.01, 0.025), band=(1200, 5500))
            s = ns(t)
            k = min(len(fl), len(r) - s)
            r[s: s + k] += fl[:k] * g.uniform(0.3, 1.0)
            t += g.uniform(0.02, 0.06)
        r *= np.sin(np.linspace(0, np.pi, len(r))) ** 0.8
        place(fx, r, ns(at), 0.18)
    cr = kit.creak(0.7, g, 22, 30, modes=(160, 390, 760), qs=(8, 9, 8))
    place(fx, cr, ns(8.7), 0.12)
    wet = circ_reverb(fx, 2.6, 0.045, 0.35, seed=5)
    bed_n = y / (np.std(y) + 1e-12)
    ev = (fx * 0.25 + wet * 1.2) * 6.5
    STEMS["archive_hush"] = dict(room=bed_n, events=ev)
    return bed_n + ev


@amb("wind_valley", "Open valley wind: a broad breathy bed with slow gusts, a faint whistling resonance that "
     "rises with each gust, and dry grass rustling on the strongest gusts. No events, so it never sounds "
     "repetitive.", 10.0, out_sr=16000)
def wind_valley(n, g):
    gust = 0.5 + 0.5 * periodic_lfo(n, g, 0.35)
    gust = np.clip(gust, 0, 1)
    src = circ_noise(n, g, -3.0)
    center = 380 + 520 * gust + 60 * periodic_lfo(n, g, 1.2)
    body = tv_filter_periodic(src, "bp", center, 0.9) * (0.35 + 0.65 * gust)
    src2 = circ_noise(n, g, -1.0)
    wcenter = 1050 + 450 * gust + 80 * periodic_lfo(n, g, 0.9)
    whistle = tv_filter_periodic(src2, "bp", wcenter, 14.0) * gust ** 2 * 0.5
    grass = circ_noise(n, g, 0.0, 2500, 7500) * np.clip(gust - 0.45, 0, 1) ** 1.5 * 0.9
    low = circ_noise(n, g, -6.0, 30, 160) * (0.5 + 0.5 * gust) * 0.6
    parts = dict(body=body / (np.std(body) + 1e-12), whistle=whistle / (np.std(whistle) + 1e-12) * 0.25,
                 grass=grass / (np.std(grass) + 1e-12) * 0.18, low=low / (np.std(low) + 1e-12) * 0.35)
    STEMS["wind_valley"] = parts
    return sum(parts.values())


# ----------------------------------------------------------------------------- Episode 2 (E2-audio)
def chime_note(f, dur, g):
    """One wind-chime tube: tubular-bell partials (1, 2.76, 5.40, 8.93) with long, glassy decays."""
    k = ns(dur)
    t = np.arange(k) / SR
    y = np.zeros(k)
    for r, a, d in ((1.0, 1.0, 1.6), (2.76, 0.45, 0.7), (5.40, 0.18, 0.3), (8.93, 0.06, 0.12)):
        if f * r < SR * 0.45:
            y += a * np.sin(2 * np.pi * f * r * t + g.uniform(0, 2 * np.pi)) * np.exp(-t / d)
    return y * np.clip(t / 0.002, 0, 1) * np.clip((dur - t) / 0.05, 0, 1)


@amb("mere_still", "The Hollow by the still mere: slow water lapping at the stones (soft swells with small wet "
     "slaps and plops), a distant cluster of wind chimes once per loop, a faint high air, and one far-off "
     "bird. Hushed and a little lonely; nothing moves fast.", 10.0, out_sr=16000)
def mere_still(n, g):
    lap = 0.5 + 0.5 * np.sin(2 * np.pi * np.arange(n) * 4 / n + 0.7)            # four slow waves per loop
    lap = np.clip(lap + 0.25 * periodic_lfo(n, g, 0.8), 0, 1.2)
    bed = circ_noise(n, g, -4.0, 110, 1300) * (0.35 + 0.65 * lap ** 1.5)
    hiss = circ_noise(n, g, -1.0, 1500, 5500) * (0.15 + 0.45 * lap ** 3) * 0.3
    air = circ_noise(n, g, -2.0, 3000, 7500) * 0.03
    water = np.zeros(n)
    peaks = [int(n * (k + 0.17) / 4) for k in range(4)]                            # wave crests (sin max)
    for p0 in peaks:
        for _ in range(3):                                                         # a slap and two drops
            k = ns(g.uniform(0.04, 0.09))
            s = circ_noise(k, g, -2.0, 400, 2200)[:k] * np.exp(-np.arange(k) / (k * 0.25))
            place(water, s, p0 + int(g.uniform(-0.15, 0.25) * SR), g.uniform(0.15, 0.35))
        f = math.exp(g.uniform(math.log(450), math.log(1100)))
        k = ns(0.03)
        pl = dsp.sine(dsp.glide(f, f * 1.7, k, "exp", 0.7), k, SR) * dsp.env_exp(k, SR, 0.009, 0.002)
        place(water, pl, p0 + int(g.uniform(0.2, 0.5) * SR), g.uniform(0.2, 0.35))
    y = bed + hiss + air + water * 1.3
    chimes = np.zeros(n)
    notes = [dsp.note_hz(x) for x in ("A5", "C6", "D6", "E6", "G6", "A6")]                  # A minor pentatonic
    t = 2.6
    for _ in range(5):                                                              # one soft cluster
        place(chimes, chime_note(notes[g.integers(0, len(notes))], 2.2, g), ns(t), g.uniform(0.35, 0.8))
        t += g.uniform(0.12, 0.45)
    place(chimes, chime_note(notes[2], 2.2, g), ns(7.3), 0.3)                      # and a single stray tube
    chimes = chimes + 0.6 * circ_reverb(chimes, 1.6, 0.03, 0.55, seed=11)
    bird = np.zeros(n)
    place(bird, bird_phrase(g, "whistle"), ns(8.5), 0.5)
    bird = 0.4 * bird + 0.6 * circ_reverb(bird, 1.4, 0.04, 0.5, seed=12)
    bed_n = y / (np.std(y) + 1e-12)
    ev = chimes * 0.9 + bird * 0.45
    STEMS["mere_still"] = dict(water=bed_n, chimes=chimes * 0.9, bird=bird * 0.45)
    out = bed_n + ev
    return out + 0.1 * circ_reverb(out, 0.7, 0.02, 0.45, seed=13)


@amb("court_hush", "The Court of Mirrors: a cold, still palace of glass. A faint glass hum (a wet-finger-on-a-rim "
     "tone around A5 with a slowly beating partner and a fifth), a low room tone, and slow drips falling into "
     "a very large space, each one a small glassy ping. Beautiful and uneasy, never loud.", 10.0, out_sr=16000)
def court_hush(n, g):
    idx = np.arange(n)

    def tone(f, amp):   # an exact whole number of cycles per loop, so the hum loops without a seam
        return amp * np.sin(2 * np.pi * idx * round(f * n / SR) / n)

    swell = 0.6 + 0.4 * periodic_lfo(n, g, 0.15)
    hum = (tone(880.0, 0.06) + tone(880.6, 0.05) + tone(1320.0, 0.018) + tone(1761.0, 0.01)) * swell
    room = circ_noise(n, g, -6.0, 35, 240, 3) * (0.85 + 0.15 * periodic_lfo(n, g, 0.2))
    air = circ_noise(n, g, -2.0, 2500, 7000) * 0.05
    bed = room + air
    bed = bed / (np.std(bed) + 1e-12)
    drips = np.zeros(n)
    for at in (0.9, 3.7, 6.2, 8.8):
        k = ns(0.06)
        f0 = g.uniform(1300, 1900)
        d = dsp.sine(dsp.glide(f0, f0 * 1.6, k, "exp", 0.6), k, SR) * dsp.env_exp(k, SR, 0.012, 0.001)
        place(drips, d, ns(at + g.uniform(-0.1, 0.1)), g.uniform(0.4, 0.6))
        tk = ns(0.5)
        tt = np.arange(tk) / SR
        f1 = g.uniform(2600, 3600)
        ping = (np.sin(2 * np.pi * f1 * tt) + 0.4 * np.sin(2 * np.pi * f1 * 2.32 * tt)) * np.exp(-tt / 0.12)
        place(drips, ping, ns(at + 0.01), g.uniform(0.08, 0.14))
    wet = circ_reverb(drips, 3.2, 0.06, 0.4, seed=21)
    ev = (drips * 0.25 + wet * 1.3) * 5.0
    hum_n = hum / (np.std(hum) + 1e-12) * 0.45
    STEMS["court_hush"] = dict(room=bed, hum=hum_n, drips=ev)
    y = bed + hum_n + ev
    # the bed is periodic, so the loop may start anywhere: start where the waveform is flattest so the
    # wrap-around step is a small one (a steady 880 Hz hum makes every step large at 16 kHz)
    d = np.abs(np.diff(np.concatenate([y, y[:1]])))
    smooth = np.convolve(d, np.ones(64) / 64, mode="same")
    return np.roll(y, -int(np.argmin(smooth[: n // 2])))


# ----------------------------------------------------------------------------- Episode 3 (E3-audio)
@amb("forge_rumble", "The Ashen Foundry: a low furnace drone (a whole-cycle 55 Hz and fifth), a bed of distant "
     "hammering on an anvil far down a stone hall (two strikes then a pause, softened by a big room), and slow "
     "steam venting as a breathy hiss. Heavy, warm, never loud.", 10.0, out_sr=16000)
def forge_rumble(n, g):
    idx = np.arange(n)

    def tone(f, amp):
        return amp * np.sin(2 * np.pi * idx * round(f * n / SR) / n)

    sw = 0.7 + 0.3 * periodic_lfo(n, g, 0.18)
    drone = (tone(55.0, 0.09) + tone(82.5, 0.04) + tone(110.0, 0.03)) * sw
    furnace = circ_noise(n, g, -6.0, 30, 220, 3) * (0.8 + 0.2 * periodic_lfo(n, g, 0.25))
    furnace = furnace / (np.std(furnace) + 1e-12)
    # steam vents: two slow breaths of band noise
    steam = np.zeros(n)
    for at, dur in ((2.3, 1.6), (7.1, 1.9)):
        k = ns(dur)
        x = circ_noise(k, g, -1.0, 1800, 6500)[:k] * np.sin(np.linspace(0, np.pi, k)) ** 2
        place(steam, x, ns(at), 0.5)
    # distant hammering: pairs of strikes
    ham = np.zeros(n)
    for at in (0.8, 1.35, 4.4, 4.95, 5.5, 8.3, 8.85):
        k = ns(0.5)
        tt = np.arange(k) / SR
        f = g.uniform(640, 760)
        hit = (np.sin(2 * np.pi * f * tt) + 0.5 * np.sin(2 * np.pi * f * 2.76 * tt) + 0.25 * np.sin(2 * np.pi * f * 5.4 * tt)) * np.exp(-tt / 0.09)
        place(ham, hit, ns(at + g.uniform(-0.03, 0.03)), g.uniform(0.7, 1.0))
    ham = fft_band(ham, None, 3200, 2)
    wet = circ_reverb(ham, 3.4, 0.07, 0.3, seed=31)
    ham_ev = (ham * 0.15 + wet * 1.3) * 3.0
    hum = drone / (np.std(drone) + 1e-12) * 0.5
    steam_n = steam / (np.std(steam) + 1e-12) * 0.18
    STEMS["forge_rumble"] = dict(furnace=furnace, drone=hum, steam=steam_n, hammer=ham_ev)
    y = furnace + hum + steam_n + ham_ev
    d = np.abs(np.diff(np.concatenate([y, y[:1]])))
    smooth = np.convolve(d, np.ones(64) / 64, mode="same")
    return np.roll(y, -int(np.argmin(smooth[: n // 2])))


@amb("ash_wind", "Ash wind over Emberpeak and the old sand road: dry, thin and low, a hollow breath with slow gusts, "
     "a faint hiss of grit, and a very sparse crackle of embers far away. No events, so it never sounds repeated.",
     10.0, out_sr=16000)
def ash_wind(n, g):
    gust = np.clip(0.5 + 0.5 * periodic_lfo(n, g, 0.3), 0, 1)
    src = circ_noise(n, g, -2.0)
    center = 300 + 420 * gust + 50 * periodic_lfo(n, g, 1.0)
    body = tv_filter_periodic(src, "bp", center, 1.1) * (0.3 + 0.7 * gust)
    grit = circ_noise(n, g, 0.0, 3000, 7000) * (0.15 + 0.85 * gust ** 2) * 0.5
    low = circ_noise(n, g, -6.0, 30, 150) * (0.5 + 0.5 * gust) * 0.5
    emb = np.zeros(n)
    for at in (1.7, 3.1, 3.25, 5.9, 8.2, 8.6):
        k = ns(0.03)
        tt = np.arange(k) / SR
        emb_hit = np.sin(2 * np.pi * g.uniform(2200, 4200) * tt) * np.exp(-tt / 0.004) * g.uniform(0.4, 1.0)
        place(emb, emb_hit, ns(at), 0.4)
    parts = dict(body=body / (np.std(body) + 1e-12), grit=grit / (np.std(grit) + 1e-12) * 0.1,
                 low=low / (np.std(low) + 1e-12) * 0.3, embers=emb * 0.35)
    STEMS["ash_wind"] = parts
    y = sum(parts.values())
    d = np.abs(np.diff(np.concatenate([y, y[:1]])))
    smooth = np.convolve(d, np.ones(64) / 64, mode="same")
    return np.roll(y, -int(np.argmin(smooth[: n // 2])))


# ----------------------------------------------------------------------------- Expansion 1 (X1-audio)
@amb("moor_wind", "The High Moor: wide dry wind, a broad low breath with slow gusts and a long swell, a faint hiss of "
     "grass that rises with each gust, a thin whistle over heather on the strongest ones. No events, so it never "
     "sounds repeated.", 10.0, out_sr=16000)
def moor_wind(n, g):
    gust = np.clip(0.5 + 0.5 * periodic_lfo(n, g, 0.22), 0, 1)
    slow = np.clip(0.5 + 0.5 * periodic_lfo(n, g, 0.1), 0, 1)
    src = circ_noise(n, g, -2.5)
    center = 260 + 520 * gust + 90 * periodic_lfo(n, g, 0.8)
    body = tv_filter_periodic(src, "bp", center, 0.7) * (0.35 + 0.65 * gust)
    low = circ_noise(n, g, -6.0, 25, 140) * (0.45 + 0.55 * slow) * 0.7
    grass = circ_noise(n, g, 0.0, 3500, 7800) * (0.12 + 0.88 * gust ** 1.6) * 0.5
    src2 = circ_noise(n, g, -1.0)
    wcenter = 820 + 380 * gust + 60 * periodic_lfo(n, g, 0.6)
    whistle = tv_filter_periodic(src2, "bp", wcenter, 16.0) * np.clip(gust - 0.55, 0, 1) ** 1.2
    parts = dict(body=body / (np.std(body) + 1e-12), low=low / (np.std(low) + 1e-12) * 0.45,
                 grass=grass / (np.std(grass) + 1e-12) * 0.12, whistle=whistle / (np.std(whistle) + 1e-12) * 0.12)
    STEMS["moor_wind"] = parts
    y = sum(parts.values())
    d = np.abs(np.diff(np.concatenate([y, y[:1]])))
    smooth = np.convolve(d, np.ones(64) / 64, mode="same")
    return np.roll(y, -int(np.argmin(smooth[: n // 2])))


@amb("larchhill_hum", "Larchhill: a warm hive hum (whole-cycle low tones), a few bees passing close, leaves stirring "
     "in a soft breeze, and one far windmill creak in the middle of the loop.", 10.0, out_sr=16000)
def larchhill_hum(n, g):
    idx = np.arange(n)

    def tone(f, amp, ph=0.0):
        return amp * np.sin(2 * np.pi * idx * round(f * n / SR) / n + ph)

    sw = 0.8 + 0.2 * periodic_lfo(n, g, 0.3)
    hum = (tone(110.0, 0.5) + tone(220.0, 0.3, 0.7) + tone(330.0, 0.12, 1.9) + tone(441.0, 0.08, 2.4)) * sw
    hum = fft_band(hum, 60, 900, 2)
    # bees: three passes of a buzzing, gliding saw-ish tone
    bees = np.zeros(n)
    for at, f0, f1, dur in ((1.2, 230, 330, 1.3), (4.6, 340, 240, 1.5), (7.7, 260, 300, 1.2)):
        k = ns(dur)
        tt = np.arange(k) / SR
        f = f0 + (f1 - f0) * tt / dur
        f = f * (1 + 0.05 * np.sin(2 * np.pi * 31 * tt))
        ph = np.cumsum(f / SR)
        b = (np.sin(2 * np.pi * ph) + 0.55 * np.sin(4 * np.pi * ph + 0.3) + 0.3 * np.sin(6 * np.pi * ph + 1.0))
        b = b * np.sin(np.pi * tt / dur) ** 1.6
        place(bees, b, ns(at), 0.5)
    bees = fft_band(bees, 150, 2200, 2)
    # leaves: soft band noise stirred by a slow breeze
    breeze = np.clip(0.5 + 0.5 * periodic_lfo(n, g, 0.4), 0, 1)
    leaves = circ_noise(n, g, -1.0, 2800, 7500) * (0.15 + 0.85 * breeze ** 1.5)
    # the far windmill creak: a decelerating tick train through low resonances, softened by a big room
    creak = np.zeros(n)
    k = ns(1.6)
    tick = np.zeros(k)
    pos, rate = 0.0, 16.0
    while pos < 1.5:
        tick[int(pos * SR)] = g.uniform(0.5, 1.0)
        pos += 1.0 / rate * g.uniform(0.8, 1.2)
        rate += 1.5
    cr = (dsp.resonator(tick, [140, 330, 720], [9, 10, 8], [1.0, 0.7, 0.4], SR)) * np.sin(np.pi * np.arange(k) / k) ** 0.7
    place(creak, cr, ns(5.2), 1.0)
    creak = fft_band(creak, 80, 1500, 2)
    creak_w = circ_reverb(creak, 2.6, 0.06, 0.3, seed=47)
    parts = dict(hum=hum / (np.std(hum) + 1e-12) * 0.55, bees=bees / (np.std(bees) + 1e-12) * 0.3,
                 leaves=leaves / (np.std(leaves) + 1e-12) * 0.18, creak=(creak * 0.3 + creak_w) / (np.std(creak_w) + 1e-12) * 0.22)
    STEMS["larchhill_hum"] = parts
    y = sum(parts.values())
    d = np.abs(np.diff(np.concatenate([y, y[:1]])))
    smooth = np.convolve(d, np.ones(64) / 64, mode="same")
    return np.roll(y, -int(np.argmin(smooth[: n // 2])))
