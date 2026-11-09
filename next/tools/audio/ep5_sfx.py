"""Episode 5 sounds (E5-audio), docs/EPISODE5_PLAN.md 8.4: eight sfx, a day variant of sky_turn and one ambience bed.

    python tools/audio/ep5_sfx.py              # render every Episode 5 sound into assets/audio/{sfx,ambience}/ep5_*.wav
    python tools/audio/ep5_sfx.py --only sky_turn,sky_turn_day
    python tools/audio/ep5_sfx.py --review     # also write tools/audio/out/ep5/<id>.png (waveform + spectrogram)

Deliberately NOT registered in sfx_defs.REG and NOT run by build.py, exactly as tools/audio/ep4_sfx.py: build.py writes every
registered sound to assets/audio/sfx/<id>.wav (precached) and into assets/audio/manifest.json, and Episode 5 must add no byte
to either (plan 13). These files are named ep5_<id>.wav so build_pwa.py's LAZY_PREFIXES keep them out of the precache, and
the game finds them through the pack fragment src/data/ep5/audio.js. Same mastering chain as build.py (build.master).

Three pairs must never be confused (the brief): sky_turn (night) and sky_turn_day are one event in two skies, told apart by
pitch and timbre (a low bronze gong with a glass shimmer on top, against a warm brass swell a sixth higher); prophecy_break is
NOT Episode 4's decree_void (no paper tear, no fixed arpeggio: a crack of scattering glass stars, then pings that glide
upward); caravan_bell is NOT bell_drowned (a small, bright, high copper bell, harmonic and beat-free, against a low bronze
bell through water).
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
OUT = HERE / "out" / "ep5"
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


def grains(dur, g, density, band=(1800, 6500), length=(0.0008, 0.003), env=None):
    """Sand: thousands of tiny dry clicks (each a band-limited noise speck), density following `env` (0..1 per sample)."""
    n = ns(dur)
    y = np.zeros(n)
    k = int(density * dur)
    if env is None:
        env = np.ones(n)
    for _ in range(k):
        pos = int(g.integers(0, n))
        if g.random() > env[pos]:
            continue
        ln = max(8, ns(float(g.uniform(*length))))
        speck = g.standard_normal(ln) * np.exp(-np.arange(ln) / (ln / 3.0))
        e = min(n, pos + ln)
        y[pos:e] += speck[: e - pos] * float(g.uniform(0.3, 1.0))
    return bp(y, band[0], band[1])


# ============================================================================ sun and shade (the field)

@sfx("sun_dial", "field", "A sundial set to a new hour: stone grinding a quarter turn on its pivot, a seat-clunk, then a "
     "small bright chime (the hour taking hold).", target=-18.0, tail_db=-46, fallback="switch_on")
def sun_dial(g, v):
    m = M()
    d = 0.5
    n = ns(d)
    t = np.arange(n) / SR
    speed = np.sin(np.pi * np.clip(t / d, 0, 1)) ** 0.8                                  # the turn starts, runs, stops
    gr = kit.grind(d, g, band=(180, 1300), rough=0.85) * speed
    m.add(gr, 0.0, 0.7)
    m.add(kit.rumble(d, g, fc=120.0, rough=0.5, attack=0.08, release=0.15), 0.0, 0.35)
    # stick-slip chatter of stone on stone, faster in the middle of the turn
    m.add(kit.creak(d, g, 26, 44, modes=(310, 760, 1500), qs=(6, 7, 6), jitter=0.35) * speed, 0.0, 0.3)
    m.add(kit.knock([140, 360, 820], [6, 8, 7], g, 0.18, 0.05, gains=[1.0, 0.6, 0.3]), 0.49, 0.85)   # it seats
    m.add(kit.thump(95, 55, 0.16, 0.05, 0.001), 0.49, 0.4)
    # the chime: a small bright bar a fifth over a high E, short and clean
    m.add(kit.fm_bell(hz("E6"), 0.7, ratio=3.0, index=1.2, decay=0.2, idx_decay=0.04), 0.56, 0.15)
    m.add(kit.fm_bell(hz("B6"), 0.6, ratio=3.0, index=1.0, decay=0.16, idx_decay=0.03), 0.62, 0.09)
    return verb(m.out, 0.7, 0.16, bright=0.55)


@sfx("sand_run", "field", "Sand starts to run where the light falls: a dry hiss of grains that rises into a soft pour, about "
     "0.6 s, ending still running (sand_hold is its end).", target=-19.0, tail_db=-44, fallback="shelf_move")
def sand_run(g, v):
    d = 0.66
    n = ns(d)
    t = np.arange(n) / SR
    rise = np.clip(t / 0.5, 0, 1) ** 1.6
    env = np.clip(0.15 + 0.85 * rise, 0, 1)
    m = M()
    hiss = grains(d, g, 26000, band=(2200, 7500), env=env)
    m.add(norm(hiss) * (0.25 + 0.75 * rise) * np.clip((d - t) / 0.08, 0, 1), 0.0, 0.55)
    # the pour: a body of pink noise that opens up as more sand moves
    body = dsp.bq_tv(dsp.pink(n, g), "bp", dsp.glide(900, 2300, n, "exp", 0.7), 0.7, SR, block=32)
    m.add(norm(body) * rise * np.clip((d - t) / 0.1, 0, 1) * (0.85 + 0.15 * dsp.lfo(11.0, n, SR)), 0.0, 0.5)
    m.add(kit.rumble(d, g, fc=200.0, rough=0.6, attack=0.35, release=0.12), 0.0, 0.14)
    return verb(m.out, 0.45, 0.1, bright=0.5)


@sfx("sand_hold", "field", "Sand settles in shade: a soft settling crunch thinning to silence, about 0.5 s.",
     target=-20.0, tail_db=-46, fallback="land")
def sand_hold(g, v):
    d = 0.5
    n = ns(d)
    t = np.arange(n) / SR
    fall = np.exp(-t / 0.13)
    m = M()
    m.add(norm(grains(d, g, 15000, band=(1500, 5500), env=np.clip(fall * 1.2, 0, 1))) * fall, 0.0, 0.6)
    crunch = grains(0.12, g, 5000, band=(600, 2600), length=(0.002, 0.006))                 # a few heavier grains bed down
    m.add(norm(crunch) * np.exp(-np.arange(len(crunch)) / SR / 0.04), 0.005, 0.5)
    m.add(kit.thump(120, 70, 0.12, 0.04, 0.003), 0.0, 0.3)                                    # the heap's soft weight
    return verb(m.out, 0.4, 0.08, bright=0.45)


@sfx("lamp_roll", "field", "A lamp cart moves along its rail: iron wheels rolling on a stone rail (a turning rumble with a "
     "faint iron ring), and two clunks as the wheels cross the rail joints.", target=-18.0, tail_db=-44, fallback="block_push")
def lamp_roll(g, v):
    d = 0.8
    n = ns(d)
    t = np.arange(n) / SR
    env = np.clip(t / 0.08, 0, 1) * np.clip((d - t) / 0.2, 0, 1)
    turn = 0.6 + 0.4 * np.abs(np.sin(2 * np.pi * 6.5 * t))                                    # the wheel's rotation
    m = M()
    roll = bp(dsp.brown(n, g), 90, 700) * turn * env
    m.add(norm(roll), 0.0, 0.55)
    m.add(kit.grind(d, g, band=(500, 2400), rough=0.6) * env * turn, 0.0, 0.3)
    ring = dsp.partials(hz("A5"), [1.0, 2.76, 5.4], [1.0, 0.4, 0.15], [0.5, 0.25, 0.1], n, SR, g) * env
    m.add(ring, 0.0, 0.05)                                                                      # iron on iron, faint
    for at, k in ((0.26, 0.95), (0.58, 0.8)):                                                   # the rail joints
        m.add(kit.knock([180, 470, 1100], [7, 9, 8], g, 0.16, 0.04, gains=[1.0, 0.6, 0.35]), at, k)
        m.add(kit.metal(820.0, 0.3, g, decay=0.09, bright=0.7), at + 0.002, 0.16 * k)
        m.add(kit.thump(110, 60, 0.12, 0.04, 0.001), at, 0.35 * k)
    return verb(m.out, 0.6, 0.14, bright=0.45)


# ============================================================================ the Turning Sky (battle)

GONG_RATIOS = (1.0, 1.47, 1.98, 2.44, 2.97, 3.56, 4.12, 5.21, 6.33, 7.48, 8.9, 10.6)


def _gong(f, dur, g, swell=0.35):
    """A tam-tam-like bronze gong struck soft: inharmonic partials that bloom (the upper ones arrive late)."""
    n = ns(dur)
    t = np.arange(n) / SR
    y = np.zeros(n)
    for i, r in enumerate(GONG_RATIOS):
        a = 1.0 / (1.0 + 0.55 * i)
        bloom = 1.0 - np.exp(-t / (0.02 + swell * (i / len(GONG_RATIOS))))
        dec = np.exp(-t / (2.4 - 0.22 * i))
        y += a * np.sin(2 * np.pi * f * r * t + g.random() * 6.283) * bloom * dec
    return y


@sfx("sky_turn", "big", "The sky turns to Night: a slow bronze gong swell (about A2, it blooms rather than strikes) with a "
     "shimmer of glass on top that drifts down like stars coming out. The night half of the pair; sky_turn_day is the day.",
     target=-15.0, tail_db=-46, fallback="combo_start")
def sky_turn(g, v):
    d = 1.6
    n = ns(d)
    t = np.arange(n) / SR
    m = M()
    gong = _gong(hz("A2"), d, g, swell=0.45)
    sw = np.clip(t / 0.45, 0, 1) ** 1.5                                                         # the swell
    m.add(norm(gong) * (0.25 + 0.75 * sw), 0.0, 0.85)
    m.add(lp(kit.noise_burst(0.05, g, (80, 400), 0.04, 0.01), 500), 0.0, 0.2)                 # the soft beater
    # the shimmer: glass points falling through a high pentatonic set as the swell peaks
    notes = ("E7", "C#7", "B6", "A6", "F#6", "E6")
    for i, nm in enumerate(notes):
        m.add(kit.glass(hz(nm), 0.9, g, decay=0.24), 0.32 + 0.09 * i, 0.15 - 0.015 * i)
    m.add(kit.sparkle(1.0, g, density=40.0, fmin=4000, fmax=9000, fall=1.6), 0.3, 0.1)
    return verb(m.out, 1.8, 0.28, bright=0.5, predelay=0.02)


def _brass(f, t, cut, g):
    """A brass voice built from harmonics (clean, no aliasing): saw-like 1/k amplitudes under a time-varying lowpass
    `cut` (Hz per sample), two copies a few cents apart for the section, a slow late vibrato."""
    vib = 1.0 + 0.003 * np.sin(2 * np.pi * 5.0 * t) * np.clip((t - 0.3) / 0.3, 0, 1)
    y = np.zeros(len(t))
    for det, amp in ((1.0, 1.0), (1.0035, 0.6)):
        ph = 2 * np.pi * np.cumsum(f * det * vib) / SR + g.random() * 6.283
        for k in range(1, 40):
            if f * k > 7000:
                break
            w = 1.0 / (1.0 + (f * k / cut) ** 4)
            y += amp * w * np.sin(k * ph) / k
    return y


@sfx("sky_turn_day", "big", "The sky turns to Day: the same swell in brass, warm and a sixth higher (an F#3 major chord "
     "opening from dark to bright), a rising fifth on top. An extra id beside sky_turn (plan 8.4: night and day by pitch).",
     target=-15.0, tail_db=-46, fallback="combo_start")
def sky_turn_day(g, v):
    d = 1.4
    n = ns(d)
    t = np.arange(n) / SR
    m = M()
    sw = np.clip(t / 0.5, 0, 1) ** 1.3 * np.clip((d - t) / 0.55, 0, 1)
    cut = 500.0 + 2600.0 * np.clip(t / 0.6, 0, 1) ** 1.2                                          # the brass opening up
    for nm, a in (("F#3", 1.0), ("A#3", 0.7), ("C#4", 0.8), ("F#4", 0.55)):
        m.add(_brass(hz(nm), t, cut, g) * sw, 0.0, 0.22 * a)
    # the lift on top: a fifth rising into the light
    for at, nm in ((0.35, "C#5"), (0.55, "F#5")):
        k = ns(0.8)
        tt = np.arange(k) / SR
        call = _brass(hz(nm), tt, np.full(k, 3000.0), g) * np.clip(tt / 0.08, 0, 1) * np.exp(-tt / 0.45)
        m.add(call, at, 0.12)
    m.add(kit.sparkle(0.6, g, density=18.0, fmin=3000, fmax=6500, fall=1.2), 0.45, 0.04)
    return verb(m.out, 1.2, 0.2, bright=0.65, predelay=0.015)


@sfx("prophecy_read", "big", "The Last Prophecy (a telegraph): a high celestial chime, two struck star-bells a tritone "
     "apart, over a low drone that swells underneath and does not resolve.", target=-15.0, tail_db=-44,
     fallback="telegraph")
def prophecy_read(g, v):
    d = 1.6
    n = ns(d)
    t = np.arange(n) / SR
    m = M()
    f = hz("C2")
    drone = dsp.saw(f, n, SR) * 0.5 + dsp.saw(f * 1.003, n, SR) * 0.5 + dsp.sine(f, n, SR) * 0.8 + \
        0.35 * dsp.saw(f * 1.5, n, SR)                                                         # root and fifth
    env = np.clip(t / 0.5, 0, 1) ** 1.4 * np.clip((d - t) / 0.4, 0, 1)
    m.add(dsp.bq_tv(drone, "lp", 220.0 + 380.0 * np.clip(t / 0.8, 0, 1), 1.2, SR, block=64) * env, 0.0, 0.5)
    for at, nm, k in ((0.0, "F#7", 0.45), (0.22, "C7", 0.38)):                                # the star-bells: a tritone
        m.add(kit.fm_bell(hz(nm), 1.3, ratio=2.0, index=2.2, decay=0.55, idx_decay=0.08), at, k)
        m.add(kit.glass(hz(nm) / 2, 1.0, g, decay=0.4), at, k * 0.35)
    m.add(kit.sparkle(1.0, g, density=22.0, fmin=5000, fmax=9500, fall=1.4), 0.05, 0.05)
    return verb(m.out, 1.6, 0.26, bright=0.6, predelay=0.02)


@sfx("prophecy_break", "magic", "A foretelling broken (Turn the Sky): glass stars cracking and scattering (a spray of tiny "
     "tinks, wide and fast), then a sparkle whose pings glide upward and climb out of hearing. No paper, no fixed chord "
     "(that is decree_void).", target=-15.5, tail_db=-46, fallback="glass_break")
def prophecy_break(g, v):
    m = M()
    m.add(kit.shatter(0.5, g, count=46, fmin=2600, fmax=8500, spread=0.3), 0.0, 0.55)
    m.add(kit.noise_burst(0.02, g, ("high", 3500), 0.006, 0.0003), 0.0, 0.35)                # the crack
    m.add(kit.thump(260, 130, 0.12, 0.03, 0.001), 0.0, 0.18)
    # rising pings: each a short sine that glides up an octave, starting higher as the spray thins
    for i in range(16):
        at = 0.12 + 0.045 * i + float(g.uniform(-0.01, 0.01))
        f0 = 1400.0 * (1.12 ** i) * float(g.uniform(0.95, 1.05))
        k = ns(0.22)
        tt = np.arange(k) / SR
        f = f0 * (1.0 + 1.0 * (1 - np.exp(-tt / 0.06)))
        p = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt / 0.05) * np.clip(tt / 0.002, 0, 1)
        m.add(p, at, 0.22 * (1.0 - 0.03 * i))
    # a thin rising whistle under the pings: the sky letting go
    k = ns(0.75)
    tt = np.arange(k) / SR
    w = dsp.sine(dsp.glide(1200, 5200, k, "exp", 0.8), k, SR) * np.clip(tt / 0.2, 0, 1) * np.clip((0.75 - tt) / 0.3, 0, 1)
    m.add(w, 0.12, 0.08)
    return verb(m.out, 1.1, 0.2, bright=0.8)


# ============================================================================ the caravan bells

def _handbell(f, dur, g, decay=2.6):
    """A small cast copper bell tuned the old way: harmonic, beat-free partials (hum an octave down, the prime, a pure fifth
    and octave above, a small major tenth) instead of a church bell's minor tierce and beating pairs."""
    n = ns(dur)
    t = np.arange(n) / SR
    spec = ((0.5, 0.25, 1.4), (1.0, 1.0, 1.0), (1.5, 0.22, 0.55), (2.0, 0.42, 0.45), (2.5, 0.14, 0.3),
            (3.0, 0.16, 0.22), (4.2, 0.07, 0.12), (5.4, 0.05, 0.08))
    y = np.zeros(n)
    for r, a, dd in spec:
        if f * r > SR * 0.45:
            continue
        y += a * np.sin(2 * np.pi * f * r * t + g.random() * 6.283) * np.exp(-t / (decay * dd))
    return y * np.clip(t / 0.0006, 0, 1)


@sfx("caravan_bell", "story", "Hassan's caravan bell: a small copper bell, bright and high (D6, the key of saffron), one "
     "clapper strike with a tiny second touch, a long clean decay that does not beat. Nothing like bell_drowned (a low bronze "
     "bell through water).", target=-17.0, tail_db=-50, fallback="crystal_hit")
def caravan_bell(g, v):
    d = 4.0
    m = M()
    y = kit.release(_handbell(hz("D6"), d, g, decay=1.7), 0.45)
    m.add(norm(y), 0.0, 0.8)
    m.add(norm(_handbell(hz("D6"), 1.2, g, decay=1.0)), 0.085, 0.09)                       # the clapper's second touch
    clap = hp(kit.noise_burst(0.006, g, ("high", 3000), 0.0015, 0.0002), 2500)                 # copper on copper
    m.add(clap, 0.0, 0.3)
    m.add(clap, 0.085, 0.06)
    return verb(m.out, 1.4, 0.18, bright=0.75, predelay=0.012)


# ============================================================================ ambience

import ambience as A  # noqa: E402  (helpers only; importing registers nothing we write)


@amb("desert_wind", "The Caravan Road, Saffron Haven, Labyrinth F1: a low steady wind over open sand (a broad, slow breath, "
     "steadier than ash_wind's gusts), the faint dry hiss of grains always moving, and twice in the loop a gust that lifts "
     "a sheet of sand off a dune crest (a rising grain-hiss that falls away).", 10.0, fallback="ash_wind")
def desert_wind(n, g):
    slow = np.clip(0.5 + 0.5 * A.periodic_lfo(n, g, 0.12), 0, 1)
    src = A.circ_noise(n, g, -3.0)
    center = 190 + 160 * slow + 40 * A.periodic_lfo(n, g, 0.7)
    body = A.tv_filter_periodic(src, "bp", center, 0.8) * (0.6 + 0.4 * slow)
    low = A.circ_noise(n, g, -6.0, 25, 120) * (0.7 + 0.3 * slow)
    drift = A.circ_noise(n, g, 0.0, 2500, 6500) * (0.5 + 0.5 * slow)                         # grains always moving
    # two gusts: a swell of grain-hiss lifting off a crest, placed circularly so the loop never shows
    gusts = np.zeros(n)
    for at, ln in ((2.6, 1.6), (7.3, 1.3)):
        k = ns(ln)
        tt = np.arange(k) / SR
        env = np.sin(np.pi * tt / ln) ** 2 * (tt / ln) ** 0.4
        sheet = grains(ln, g, 9000 * ln, band=(2000, 7000), env=np.clip(env * 1.4, 0, 1))
        sheet = norm(sheet) * env
        sheet += norm(dsp.bq_tv(dsp.pink(k, g), "bp", dsp.glide(600, 1400, k, "exp"), 0.8, SR, block=64)) * env * 0.5
        A.place(gusts, sheet, ns(at))
    parts = dict(body=body / (np.std(body) + 1e-12), low=low / (np.std(low) + 1e-12) * 0.5,
                 drift=drift / (np.std(drift) + 1e-12) * 0.06, gusts=gusts / (np.std(gusts) + 1e-12) * 0.09)
    y = sum(parts.values())
    return A.circ_reverb(y, t60=0.8, predelay=0.02, bright=0.4)


# ============================================================================ render

def render_sfx(only=None, review=False):
    res = {}
    (AUDIO / "sfx").mkdir(parents=True, exist_ok=True)
    for id_, r in REG.items():
        if only and id_ not in only:
            continue
        seed = build.seed_of("ep5_" + id_)
        y = r["fn"](dsp.rng(seed), 0)
        target = r["target"] if r["target"] is not None else build.GROUP_TARGET[r["group"]]
        y, info = build.master(y, dsp.RENDER_SR, build.SFX_SR, target, "window", r["tail_db"])
        path = AUDIO / "sfx" / f"ep5_{id_}.wav"
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
        g = dsp.rng(zlib.crc32(("ep5_" + id_).encode()))
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
        path = AUDIO / "ambience" / f"ep5_{id_}.wav"
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
