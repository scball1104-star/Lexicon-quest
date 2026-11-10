"""Episode 6 sounds (E6-audio), docs/EPISODE6_PLAN.md 8.4: nine sfx and two ambience beds.

    python tools/audio/ep6_sfx.py              # render every Episode 6 sound into assets/audio/{sfx,ambience}/ep6_*.wav
    python tools/audio/ep6_sfx.py --only gale_gust,signal_lamp
    python tools/audio/ep6_sfx.py --review     # also write tools/audio/out/ep6/<id>.png (waveform + spectrogram)

Deliberately NOT registered in sfx_defs.REG and NOT run by build.py, exactly as tools/audio/ep5_sfx.py: build.py writes every
registered sound to assets/audio/sfx/<id>.wav (precached) and into assets/audio/manifest.json, and Episode 6 must add no byte
to either (plan 13). These files are named ep6_<id>.wav so build_pwa.py's LAZY_PREFIXES keep them out of the precache, and
the game finds them through the pack fragment src/data/ep6/audio.js. Same mastering chain as build.py (build.master).

Three pairs must never be confused (the brief; tools/audio/ep6_review.py draws them): gale_gust is NOT core `thunder` (air,
not a strike: a broad noise swell that travels left to right with the rattle of rigging and no low boom or crack);
rewrite_break is NOT Episode 4's decree_void nor Episode 5's prophecy_break (a quill snapping, paper torn away on the wind, then
ONE clear tone rising; no glass, no arpeggio); signal_lamp is NOT Episode 5's caravan_bell (a small glass chime, short and
bright, with a soft flame catching under it; a sine-like glass partial set instead of a copper bell's long harmonic decay).
"""
from __future__ import annotations

import argparse
import json
import math
import sys
import zlib
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

import dsp  # noqa: E402
import kit  # noqa: E402
import build  # noqa: E402  (master(), seed_of(), targets; importing it has no side effects)
from dsp import RENDER_SR as SR, ns, note_hz as hz  # noqa: E402

NEXT = HERE.parent.parent
AUDIO = NEXT / "assets" / "audio"
OUT = HERE / "out" / "ep6"
REG: dict = {}
AMB: dict = {}


def sfx(id_, group, intent, target=None, tail_db=-48.0, fallback=None):
    def deco(fn):
        REG[id_] = dict(id=id_, fn=fn, group=group, intent=intent, target=target, tail_db=tail_db, fallback=fallback)
        return fn
    return deco


def amb(id_, intent, seconds, fallback=None, out_sr=16000):
    def deco(fn):
        AMB[id_] = dict(id=id_, fn=fn, intent=intent, seconds=seconds, fallback=fallback, out_sr=out_sr)
        return fn
    return deco


def M():
    return dsp.Mix(SR, 0.0)


def lp(x, f, order=2):
    return dsp.butter(x, "low", f, SR, order)


def hp(x, f, order=2):
    return dsp.butter(x, "high", f, SR, order)


def bp(x, lo, hi, order=2):
    return dsp.butter(x, "band", (lo, hi), SR, order)


def verb(x, t60=0.6, wet=0.15, bright=0.6, predelay=0.008):
    return dsp.mono(dsp.reverb(x, SR, t60=t60, wet=wet, predelay=predelay, bright=bright))


def norm(x):
    return x / (np.max(np.abs(x)) + 1e-12)


def air(dur, g, f0, f1, q=0.9, curve="exp"):
    """Moving air: pink noise through a swept band-pass (no envelope)."""
    n = ns(dur)
    return norm(dsp.bq_tv(dsp.pink(n, g), "bp", dsp.glide(f0, f1, n, curve), q, SR, block=32))


def flap(dur, g, rate=14.0, band=(500, 2600)):
    """Cloth (a sail, a coat) flapping in wind: band noise gated by fast irregular snaps."""
    n = ns(dur)
    t = np.arange(n) / SR
    r = rate * (1.0 + 0.3 * dsp.smooth_random(n, g, 4.0))
    ph = np.cumsum(r / SR)
    snap = np.abs(np.sin(np.pi * ph)) ** 8
    return norm(bp(dsp.white(n, g), *band) * snap * (0.5 + 0.5 * np.sin(np.pi * np.clip(t / dur, 0, 1))))


def rattle(dur, g, rate=22.0, modes=(620, 1450, 2900)):
    """Rigging rattling: lines and blocks knocking, a jittered tick train through small wooden modes."""
    n = ns(dur)
    x = np.zeros(n)
    rr = rate * (1.0 + 0.5 * dsp.smooth_random(n, g, 9.0))
    ticks = np.nonzero(np.diff(np.floor(np.cumsum(rr / SR))) > 0)[0]
    x[ticks] = g.uniform(0.2, 1.0, len(ticks))
    return norm(dsp.resonator(x, list(modes), [9, 11, 8], [1.0, 0.6, 0.35], SR))


def glass_chime(f, dur, g, decay=0.9):
    """A small glass chime: near-sine glass partials (1, 2.76, 5.4: a struck rod), clean, beat-free."""
    n = ns(dur)
    t = np.arange(n) / SR
    y = np.zeros(n)
    for r, a, d in ((1.0, 1.0, 1.0), (2.76, 0.32, 0.35), (5.4, 0.1, 0.12)):
        if f * r < SR * 0.45:
            y += a * np.sin(2 * np.pi * f * r * t + g.random() * 6.283) * np.exp(-t / (decay * d))
    return y * np.clip(t / 0.0008, 0, 1)


# ============================================================================ the gust lanes (the field)

@sfx("gust_carry", "field", "A ride on a gust lane starts: a rising rush of air with a cloth flap (about 0.5 s), then a low "
     "hold of moving air that thins away (the system plays it once; the hold is its own fade).", target=-19.0, tail_db=-46,
     fallback="jump")
def gust_carry(g, v):
    d = 1.15
    n = ns(d)
    t = np.arange(n) / SR
    m = M()
    rise = np.clip(t / 0.45, 0, 1) ** 1.5
    hold = np.clip((d - t) / 0.6, 0, 1) ** 1.2
    body = air(d, g, 300, 1500, q=0.8) * rise * hold * (0.7 + 0.3 * np.exp(-np.maximum(0, t - 0.5) / 0.25))
    m.add(body, 0.0, 0.7)
    m.add(air(d, g, 140, 260, q=0.7) * np.clip(t / 0.3, 0, 1) * hold, 0.0, 0.45)       # the low hold
    m.add(flap(0.45, g, rate=16.0) * np.linspace(0.3, 1.0, ns(0.45)), 0.18, 0.28)       # cloth caught by the gust
    return verb(m.out, 0.5, 0.12, bright=0.5)


@sfx("gust_land", "field", "A ride lands on ground: a soft boot thump on plank and a falling whoosh, about 0.4 s.",
     target=-19.0, tail_db=-46, fallback="land")
def gust_land(g, v):
    m = M()
    m.add(kit.whoosh(0.32, g, 1400, 300, q=1.1, peak=0.25, kind="pink"), 0.0, 0.5)
    m.add(kit.thump(120, 65, 0.16, 0.05, 0.001, click=0.15, g=g), 0.17, 0.75)           # the boots
    m.add(kit.knock([210, 480, 980], [7, 9, 8], g, 0.14, 0.035, gains=[1.0, 0.6, 0.3]), 0.172, 0.5)   # plank
    return verb(m.out, 0.35, 0.08, bright=0.45)


@sfx("vane_turn", "field", "A vane or fan toggled: a brass ratchet a quarter turn (six clicks), a creak of the post, then "
     "the wind changing pitch as the vane takes it.", target=-18.0, tail_db=-46, fallback="switch_on")
def vane_turn(g, v):
    m = M()
    for i in range(6):                                                    # the ratchet's pawl over brass teeth
        at = 0.025 + 0.055 * i
        m.add(kit.metal(2300.0 + 90 * i, 0.06, g, decay=0.02, bright=0.8), at, 0.32)
        m.add(kit.knock([900, 2100], [10, 12], g, 0.05, 0.01, gains=[1.0, 0.5]), at, 0.25)
    m.add(kit.creak(0.32, g, 40, 70, modes=(330, 820, 1600), qs=(9, 11, 8)), 0.05, 0.3)
    m.add(kit.knock([150, 420, 900], [7, 8, 7], g, 0.14, 0.04, gains=[1.0, 0.5, 0.3]), 0.36, 0.55)   # it seats
    # the wind changes: a tonal whistle of air gliding a fourth up as the vane meets it
    k = ns(0.75)
    tt = np.arange(k) / SR
    f = dsp.glide(520, 700, k, "exp", 0.6)
    wh = dsp.bq_tv(dsp.pink(k, g), "bp", f, 9.0, SR, block=32)
    m.add(norm(wh) * np.sin(np.pi * np.clip(tt / 0.75, 0, 1)) ** 1.2, 0.33, 0.3)
    m.add(air(0.75, g, 400, 900, q=0.9) * np.sin(np.pi * np.clip(tt / 0.75, 0, 1)), 0.33, 0.25)
    return verb(m.out, 0.6, 0.14, bright=0.55)


@sfx("mooring_catch", "field", "A ride stops at a mooring post: a rope snapping taut (a short twang with a fibre crack) and "
     "a wooden knock.", target=-18.0, tail_db=-46, fallback="door_close")
def mooring_catch(g, v):
    m = M()
    k = ns(0.32)
    tt = np.arange(k) / SR
    f = 118.0 * (1.0 + 0.25 * np.exp(-tt / 0.03))                         # the rope: a low twang settling down
    tw = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt / 0.08)
    tw += 0.4 * np.sin(2 * np.pi * np.cumsum(2.02 * f) / SR) * np.exp(-tt / 0.05)
    m.add(tw, 0.0, 0.5)
    m.add(kit.noise_burst(0.05, g, (1200, 5000), 0.012, 0.0005), 0.0, 0.45)            # the fibres crack
    m.add(kit.knock([190, 450, 1020], [8, 9, 8], g, 0.18, 0.05, gains=[1.0, 0.65, 0.35]), 0.035, 0.9)
    m.add(kit.thump(140, 80, 0.12, 0.04, 0.001), 0.035, 0.35)
    m.add(kit.creak(0.18, g, 60, 40, modes=(420, 1050, 1900), qs=(8, 10, 8)), 0.08, 0.18)
    return verb(m.out, 0.45, 0.1, bright=0.5)


# ============================================================================ the Gale (battle)

@sfx("gale_gust", "big", "The battle's Gust: a broad gust swell that travels left to right (it rises, peaks past the middle "
     "and passes), with a rattle of rigging riding it. Air, not a strike: no boom, no crack (that is core thunder).",
     target=-15.5, tail_db=-46, fallback="flee")
def gale_gust(g, v):
    d = 1.5
    n = ns(d)
    t = np.arange(n) / SR
    m = M()
    sw = np.sin(np.pi * np.clip(t / d, 0, 1) ** 0.8) ** 1.6                # rises, peaks a little past the middle
    m.add(air(d, g, 350, 1700, q=0.7, curve="lin") * sw, 0.0, 0.7)
    m.add(air(d, g, 900, 3800, q=1.2) * sw ** 1.5, 0.0, 0.3)               # the high edge of the gust
    m.add(air(d, g, 160, 320, q=0.8) * sw, 0.0, 0.3)
    m.add(rattle(d, g, rate=24.0) * sw ** 2, 0.0, 0.22)                     # rigging
    m.add(flap(d, g, rate=11.0, band=(400, 2000)) * sw, 0.0, 0.18)
    return verb(m.out, 0.9, 0.18, bright=0.55, predelay=0.015)


@sfx("anchor_set", "big", "Anchor cast: a spear driven into planks (a deep thunk with wood splitting a little) and a rope "
     "pulled tight after it (a rising creak that stops hard).", target=-15.5, tail_db=-46, fallback="spear_thrust")
def anchor_set(g, v):
    m = M()
    m.add(kit.whoosh(0.12, g, 900, 2600, q=1.5, peak=0.85), 0.0, 0.3)       # the thrust
    m.add(kit.thump(95, 48, 0.4, 0.12, 0.003, click=0.05, g=g), 0.11, 0.55)  # into the planks
    m.add(kit.knock([180, 420, 880, 1700], [6, 8, 9, 8], g, 0.3, 0.07, gains=[0.8, 1.0, 0.7, 0.4], exc=0.004), 0.11, 0.8)
    m.add(kit.noise_burst(0.12, g, (900, 4000), 0.035, 0.001), 0.115, 0.45)  # splinters
    m.add(kit.creak(0.42, g, 30, 95, modes=(300, 760, 1500), qs=(10, 12, 9), jitter=0.2), 0.36, 0.42)   # rope pulled tight
    k = ns(0.2)
    tt = np.arange(k) / SR
    m.add(np.sin(2 * np.pi * 165 * tt) * np.exp(-tt / 0.06), 0.78, 0.3)     # taut: it rings once
    return verb(m.out, 0.7, 0.14, bright=0.5)


@sfx("rewrite_read", "big", "The Rewrite telegraph: a dry quill scratching fast over paper (a run of short scratches), a low "
     "wind under it that swells and does not resolve.", target=-15.5, tail_db=-44, fallback="telegraph")
def rewrite_read(g, v):
    d = 1.7
    n = ns(d)
    t = np.arange(n) / SR
    m = M()
    # the quill: strokes of scratchy band noise, each a short upward glide, fast and irregular
    at = 0.0
    while at < 1.35:
        ln = float(g.uniform(0.05, 0.11))
        k = ns(ln)
        tt = np.arange(k) / SR
        s = dsp.bq_tv(dsp.white(k, g), "bp", dsp.glide(2400, 4200 + 1500 * g.random(), k, "exp"), 3.0, SR, block=16)
        grain = (np.abs(dsp.smooth_random(k, g, 220.0)) ** 2) * np.sin(np.pi * tt / ln) ** 0.6
        m.add(norm(s * grain), at, 0.35 * float(g.uniform(0.6, 1.0)))
        at += ln + float(g.uniform(0.005, 0.04))
    # the wind beneath: a low swell that rises and hangs on an open fifth of air, unresolved
    sw = np.clip(t / 0.7, 0, 1) ** 1.4 * np.clip((d - t) / 0.35, 0, 1)
    m.add(air(d, g, 180, 340, q=2.5) * sw, 0.0, 0.42)
    m.add(air(d, g, 270, 510, q=2.5) * sw, 0.0, 0.3)
    return verb(m.out, 1.1, 0.2, bright=0.5, predelay=0.02)


@sfx("rewrite_break", "magic", "A Rewrite broken (Anchor): a quill snapping, paper tearing away on the wind (a ripping "
     "noise that flies off to the side and up), then one clear rising tone. No glass, no arpeggio (decree_void, "
     "prophecy_break).", target=-15.5, tail_db=-46, fallback="glass_break")
def rewrite_break(g, v):
    m = M()
    m.add(kit.knock([1700, 3400, 5200], [14, 12, 10], g, 0.06, 0.01, gains=[1.0, 0.6, 0.3]), 0.0, 0.7)   # the quill snaps
    m.add(kit.noise_burst(0.015, g, ("high", 3000), 0.004, 0.0002), 0.0, 0.45)
    # the tear: rough paper noise, fibres ripping in bursts, carried off by a rising whoosh
    d = 0.5
    k = ns(d)
    tt = np.arange(k) / SR
    rip = bp(dsp.white(k, g), 1200, 6500) * (np.abs(dsp.smooth_random(k, g, 140.0)) ** 1.5)
    m.add(norm(rip) * np.clip(tt / 0.02, 0, 1) * np.clip((d - tt) / 0.3, 0, 1), 0.04, 0.5)
    m.add(kit.whoosh(0.55, g, 600, 3200, q=1.0, peak=0.35, kind="pink"), 0.08, 0.35)
    for i in range(5):                                                     # loose scraps fluttering off
        m.add(kit.paper_flap(g), 0.3 + 0.06 * i + float(g.uniform(0, 0.02)), 0.18 * (1 - 0.15 * i))
    # the clear tone: one sine with a soft octave, gliding up a fifth, the course written plain again
    k = ns(0.8)
    tt = np.arange(k) / SR
    f = dsp.glide(hz("D5"), hz("A5"), k, "exp", 0.5)
    tone = dsp.sine(f, k, SR) + 0.25 * dsp.sine(f * 2, k, SR)
    m.add(tone * np.clip(tt / 0.08, 0, 1) * np.exp(-np.maximum(0, tt - 0.3) / 0.22), 0.32, 0.22)
    return verb(m.out, 1.0, 0.18, bright=0.65)


# ============================================================================ the signal lamps

@sfx("signal_lamp", "story", "A pledge lamp, the beacon, the chimes: a small glass chime (A6, with a fifth over it a moment "
     "later), bright, beat-free and short, and a soft flame catching under it (a breathy whoomph). Nothing like caravan_bell "
     "(a copper bell's long harmonic ring).", target=-17.0, tail_db=-50, fallback="crystal_hit")
def signal_lamp(g, v):
    m = M()
    m.add(glass_chime(hz("A6"), 1.6, g, decay=0.45), 0.0, 0.6)
    m.add(glass_chime(hz("E7"), 1.2, g, decay=0.35), 0.07, 0.32)
    m.add(hp(kit.noise_burst(0.004, g, ("high", 4000), 0.001, 0.0001), 3500), 0.0, 0.2)
    # the flame: a soft pink-noise swell low in the band, rising and settling (no crackle: it is a lamp, not a fire)
    k = ns(0.55)
    tt = np.arange(k) / SR
    fl = dsp.bq_tv(dsp.pink(k, g), "bp", dsp.glide(250, 700, k, "exp", 0.5), 0.9, SR, block=32)
    m.add(norm(fl) * np.clip(tt / 0.12, 0, 1) ** 1.5 * np.exp(-np.maximum(0, tt - 0.12) / 0.13), 0.03, 0.22)
    return verb(m.out, 1.1, 0.2, bright=0.75, predelay=0.012)


# ============================================================================ ambience

import ambience as A  # noqa: E402  (helpers only; importing registers nothing we write)


@amb("sky_wind", "The Airstair, Zephyr Landing, Observatory F1: a high steady wind over open sky (thinner and brighter than "
     "wind_valley), a faint hum of rigging (two soft tones that swell with the wind), and once in the loop a chime far off.",
     10.0, fallback="wind_valley")
def sky_wind(n, g):
    slow = np.clip(0.5 + 0.5 * A.periodic_lfo(n, g, 0.15), 0, 1)
    src = A.circ_noise(n, g, -2.0)
    center = 650 + 350 * slow + 80 * A.periodic_lfo(n, g, 0.6)
    body = A.tv_filter_periodic(src, "bp", center, 0.9) * (0.6 + 0.4 * slow)
    hiss = A.circ_noise(n, g, 0.0, 2500, 7000) * (0.5 + 0.5 * slow)
    low = A.circ_noise(n, g, -6.0, 60, 220) * 0.6
    t = np.arange(n) / SR
    # rigging hum: two tones whose periods divide the loop exactly, so the loop never shows
    T = n / SR
    f1, f2 = round(196.0 * T) / T, round(293.0 * T) / T
    hum = (np.sin(2 * np.pi * f1 * t) + 0.6 * np.sin(2 * np.pi * f2 * t)) * (0.2 + 0.8 * slow ** 2)
    chime = np.zeros(n)
    A.place(chime, glass_chime(hz("E7"), 1.4, g, decay=0.5), ns(6.2))
    A.place(chime, glass_chime(hz("B6"), 1.2, g, decay=0.45), ns(6.32))
    parts = dict(body=body / (np.std(body) + 1e-12), hiss=hiss / (np.std(hiss) + 1e-12) * 0.18,
                 low=low / (np.std(low) + 1e-12) * 0.35, hum=hum / (np.std(hum) + 1e-12) * 0.03,
                 chime=chime / (np.max(np.abs(chime)) + 1e-12) * 0.35)
    y = sum(parts.values())
    return A.circ_reverb(y, t60=1.2, predelay=0.02, bright=0.5)


@amb("storm_rumble", "Observatory F2, F3, the Eyrie: a low rumbling wind, a distant soft thunder roll once in the 8 s loop "
     "(so every 8 s, inside the plan's 6 to 9), rain on canvas (a fine patter on a taut sheet).", 8.0, fallback="moor_wind")
def storm_rumble(n, g):
    slow = np.clip(0.5 + 0.5 * A.periodic_lfo(n, g, 0.1), 0, 1)
    src = A.circ_noise(n, g, -4.5)
    body = A.tv_filter_periodic(src, "bp", 140 + 120 * slow, 0.8) * (0.6 + 0.4 * slow)
    low = A.circ_noise(n, g, -6.0, 25, 110)
    # rain on canvas: many tiny taps through a taut-sheet resonance, plus a steady fine hiss
    taps = np.zeros(n)
    k = int(900 * n / SR)
    pos = g.integers(0, n, k)
    taps[pos] = g.uniform(0.2, 1.0, k)
    canvas = A.fft_band(taps, 900, 5000)
    canvas = A.fft_band(canvas + 0.5 * A.fft_band(taps, 300, 700), 250, 7000)
    hiss = A.circ_noise(n, g, -1.0, 3000, 8000)
    # distant thunder: one slow soft roll, low-passed and long; the loop is 8 s, so it comes back every 8 s
    th = np.zeros(n)
    for at, ln in ((2.4, 3.4),):
        kk = ns(ln)
        tt = np.arange(kk) / SR
        env = np.clip(tt / 0.5, 0, 1) ** 1.5 * np.exp(-np.maximum(0, tt - 0.5) / (ln * 0.3))
        roll = dsp.butter(dsp.brown(kk, g), "low", 180.0, SR, 4) * (1 + 0.6 * dsp.smooth_random(kk, g, 3.0))
        A.place(th, norm(roll) * env, ns(at))
    parts = dict(body=body / (np.std(body) + 1e-12), low=low / (np.std(low) + 1e-12) * 0.6,
                 canvas=canvas / (np.std(canvas) + 1e-12) * 0.16, hiss=hiss / (np.std(hiss) + 1e-12) * 0.06,
                 thunder=th / (np.std(th) + 1e-12) * 0.45)
    y = sum(parts.values())
    return A.circ_reverb(y, t60=1.0, predelay=0.02, bright=0.35)


# ============================================================================ render

def render_sfx(only=None, review=False):
    res = {}
    (AUDIO / "sfx").mkdir(parents=True, exist_ok=True)
    for id_, r in REG.items():
        if only and id_ not in only:
            continue
        seed = build.seed_of("ep6_" + id_)
        y = r["fn"](dsp.rng(seed), 0)
        target = r["target"] if r["target"] is not None else build.GROUP_TARGET[r["group"]]
        y, info = build.master(y, dsp.RENDER_SR, build.SFX_SR, target, "window", r["tail_db"])
        path = AUDIO / "sfx" / f"ep6_{id_}.wav"
        dsp.write_wav(path, y, build.SFX_SR, seed=seed)
        info["bytes"] = path.stat().st_size
        res[id_] = info
        print(f"  sfx {id_:14s} {info['duration']*1000:6.0f} ms  L {info['lufs']:6.1f} (t {info['target']})  "
              f"tp {info['peak_db']:6.2f}  lim {info['limited_db']}  phone {info['phone_db']:+.1f}  {info['bytes']} B")
        if review:
            _review(id_, y, build.SFX_SR)
    return res


def render_amb(only=None, review=False):
    res = {}
    (AUDIO / "ambience").mkdir(parents=True, exist_ok=True)
    for id_, r in AMB.items():
        if only and id_ not in only:
            continue
        g = dsp.rng(zlib.crc32(("ep6_" + id_).encode()))
        y = r["fn"](ns(r["seconds"]), g)
        # build.build_ambience's chain: circular DC block and resample, integrated loudness, true peak, no fades
        y = dsp.dc_block(np.concatenate([y, y, y]), SR, 18.0)[len(y): 2 * len(y)]
        osr = r["out_sr"]
        z = dsp.resample(np.concatenate([y, y, y]), SR, osr)
        k = len(z) // 3
        y = z[k: 2 * k]
        L0 = dsp.lufs_integrated(np.concatenate([y, y]), osr)
        y = y * dsp.db(build.AMBIENCE_TARGET - L0)
        tp = dsp.true_peak(y)
        if tp > build.TP_CEIL:
            y = y * build.TP_CEIL / tp * 0.99
        y = y - y.mean()
        path = AUDIO / "ambience" / f"ep6_{id_}.wav"
        dsp.write_wav(path, y, osr, seed=zlib.crc32(id_.encode()))
        steps = np.abs(np.diff(y))
        info = dict(duration=round(len(y) / osr, 3), lufs=round(dsp.lufs_integrated(np.concatenate([y, y]), osr), 1),
                    peak_db=round(dsp.to_db(dsp.true_peak(y)), 2), seam=round(float(abs(y[0] - y[-1])), 5),
                    step_p99=round(float(np.percentile(steps, 99)), 5), bytes=path.stat().st_size)
        res[id_] = info
        print(f"  ambience {id_:12s} {info['duration']:5.2f} s  L {info['lufs']:6.1f}  tp {info['peak_db']:6.2f}  "
              f"seam step {info['seam']} (p99 step {info['step_p99']})  {info['bytes']} B")
        if review:
            _review(id_, np.concatenate([y[-osr:], y[:osr]]), osr, seam_at=1.0)
    return res


def _review(id_, y, sr, seam_at=None):
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    OUT.mkdir(parents=True, exist_ok=True)
    y = dsp.mono(y) if y.ndim > 1 else y
    fig, ax = plt.subplots(2, 1, figsize=(9, 5))
    t = np.arange(len(y)) / sr
    ax[0].plot(t, y, lw=0.4)
    ax[0].set_title(f"{id_}: waveform" + (" (1 s each side of the loop seam)" if seam_at else ""))
    if seam_at:
        ax[0].axvline(seam_at, color="r", lw=0.8)
    ax[1].specgram(y, NFFT=512, Fs=sr, noverlap=384, cmap="magma")
    ax[1].set_ylabel("Hz")
    fig.tight_layout()
    fig.savefig(OUT / f"{id_}.png", dpi=90)
    plt.close(fig)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--only", default=None)
    ap.add_argument("--review", action="store_true")
    a = ap.parse_args()
    only = set(a.only.split(",")) if a.only else None
    res = {"sfx": render_sfx(only, a.review), "ambience": render_amb(only, a.review)}
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "stats.json").write_text(json.dumps(res, indent=1), encoding="utf-8")


if __name__ == "__main__":
    main()
