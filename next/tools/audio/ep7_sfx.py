"""Episode 7 sounds (E7-audio), docs/EPISODE7_PLAN.md 8.4: eight sfx (rime_bite in three pitches) and two ambience beds, and
frost_melt (E7-fixes): frost_seal's own source, same seed, played backwards before mastering, for the doors that thaw.

    python tools/audio/ep7_sfx.py              # render every Episode 7 sound into assets/audio/{sfx,ambience}/ep7_*.wav
    python tools/audio/ep7_sfx.py --only call_cast,frost_seal
    python tools/audio/ep7_sfx.py --review     # also write tools/audio/out/ep7/<id>.png (waveform + spectrogram) and
                                               # tools/audio/out/ep7/pairs.png (the pairs that must never be confused)

Deliberately NOT registered in sfx_defs.REG and NOT run by build.py, exactly as tools/audio/ep6_sfx.py: build.py writes every
registered sound to assets/audio/sfx/<id>.wav (precached) and into assets/audio/manifest.json, and Episode 7 must add no byte
to either (plan 13). These files are named ep7_<id>.wav so build_pwa.py's LAZY_PREFIXES keep them out of the precache, and
the game finds them through the pack fragment src/data/ep7/audio.js. Same mastering chain as build.py (build.master).

The iceglass bell of the score is the voice of the field sounds too (`iceglass`: glass-bar partials 1, 2.76 and 5.4 with the
top pair beating slowly, a soft-mallet onset), so a name stone sounds like a far note of the Listening Bell.

`rime_bite` is pitched up a whole step per pip: `rime_bite` (one pip), `rime_bite_2` and `rime_bite_3` are the same crackle
rendered a step and two steps higher (the band, the tick and the decay all move), so 1, 2 and 3 are told apart.

Pairs that must never be confused (the brief; `--review` draws them in pairs.png): call_cast is NOT core `kept`;
farewell_break is NOT Episode 6's rewrite_break, Episode 5's prophecy_break or Episode 4's decree_void; rime_freeze is NOT core
`ice`; stone_hold is NOT core `stone_name` or `chime_post`.
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
OUT = HERE / "out" / "ep7"
REG: dict = {}
AMB: dict = {}
STEP = 2.0 ** (2.0 / 12.0)          # a whole step


def sfx(id_, group, intent, target=None, tail_db=-48.0, fallback=None, v=0, seed_id=None):
    def deco(fn):
        REG[id_] = dict(id=id_, fn=fn, group=group, intent=intent, target=target, tail_db=tail_db, fallback=fallback, v=v,
                        seed_id=seed_id or id_)
        return fn
    return deco


def amb(id_, intent, seconds, fallback=None, out_sr=16000):
    def deco(fn):
        AMB[id_] = dict(id=id_, fn=fn, intent=intent, seconds=seconds, fallback=fallback, out_sr=out_sr)
        return fn
    return deco


def M():
    return dsp.Mix(SR, 0.0)


def bp(x, lo, hi, order=2):
    return dsp.butter(x, "band", (lo, hi), SR, order)


def lp(x, f, order=2):
    return dsp.butter(x, "low", f, SR, order)


def verb(x, t60=0.6, wet=0.15, bright=0.6, predelay=0.008):
    return dsp.mono(dsp.reverb(x, SR, t60=t60, wet=wet, predelay=predelay, bright=bright))


def norm(x):
    return x / (np.max(np.abs(x)) + 1e-12)


def iceglass(f, dur, g, ring=0.9, beat=0.6, onset_ms=4.0):
    """The score's iceglass bell as a one-shot: glass-bar partials 1, 2.76, 5.4, the top pair beating slowly, soft mallet."""
    n = ns(dur)
    t = np.arange(n) / SR
    y = np.zeros(n)
    for r, a, d, on in ((1.0, 1.0, 1.0, onset_ms), (2.76, 0.45, 0.42, onset_ms * 1.5), (5.4, 0.2, 0.22, onset_ms * 2.2)):
        fr = f * r
        if fr > SR * 0.44:
            continue
        o = 0.5 - 0.5 * np.cos(np.pi * np.clip(t / (on / 1000.0), 0, 1))
        e = np.exp(-t / (ring * d)) * o
        if r == 1.0:
            y += a * np.sin(2 * np.pi * fr * t + g.random() * 6.283) * e
        else:
            bh = beat * (1.0 if r < 3 else 1.6)
            ph = g.random() * 6.283
            y += a * 0.5 * (np.sin(2 * np.pi * fr * t + ph) + np.sin(2 * np.pi * (fr + bh) * t + ph + 1.3)) * e
    return kit.release(y, 0.3)          # the last 30 percent fades to nothing: the one-shot never stops on a ringing bar


def crackle_env(dur, g, density, band=(1800, 7000), decay=0.0012):
    """Ice crackle whose density follows `density(t)` (clicks a second, an array over the sound's length)."""
    n = ns(dur)
    dens = np.broadcast_to(np.asarray(density, dtype=float), (n,)) if np.ndim(density) == 0 else density
    hit = g.random(n) < dens / SR
    x = np.zeros(n)
    x[hit] = g.uniform(0.2, 1.0, int(hit.sum())) * g.choice([-1.0, 1.0], int(hit.sum()))
    k = np.exp(-np.arange(ns(decay * 6)) / SR / decay)
    y = np.convolve(x, k)[:n]
    return norm(bp(y, *band))


def warm_tone(f, dur, g, attack=0.06, decay=0.5, vib=0.0):
    """A warm wordless tone (no voice): sine with soft 2nd and 3rd harmonics, a slow attack, a gentle vibrato."""
    n = ns(dur)
    t = np.arange(n) / SR
    ff = f * (1.0 + vib * np.sin(2 * np.pi * 5.0 * t) * np.clip(t / 0.25, 0, 1))
    ph = 2 * np.pi * np.cumsum(ff) / SR
    y = np.sin(ph) + 0.28 * np.sin(2 * ph + 0.4) + 0.1 * np.sin(3 * ph + 1.1)
    env = np.clip(t / attack, 0, 1) ** 1.5 * np.exp(-np.maximum(0, t - attack) / decay)
    return y * env


# ============================================================================ name stones (the field)

@sfx("stone_hold", "field", "A name stone read and held: one iceglass bell note (D5, the motif's root) and a crackle of ice "
     "settling outward (dense and bright at the strike, thinning and darkening as it spreads), about 0.7 s.",
     target=-18.0, tail_db=-48, fallback="crystal_hit")
def stone_hold(g, v):
    d = 0.75
    n = ns(d)
    t = np.arange(n) / SR
    m = M()
    m.add(iceglass(hz("D5"), 1.1, g, ring=0.4, beat=0.7), 0.0, 0.7)
    dens = 900.0 * np.exp(-t / 0.18) + 40.0
    cr = crackle_env(d, g, dens, band=(1500, 6500))
    m.add(lp(cr, 3500) * np.exp(-t / 0.3), 0.01, 0.28)            # settling outward: it darkens as it spreads
    m.add(kit.knock([hz("D5") * 0.5, hz("D5") * 1.38], [6, 8], g, 0.08, 0.02, gains=[1.0, 0.4]), 0.0, 0.25)   # the felt
    return verb(m.out, 0.9, 0.18, bright=0.55, predelay=0.012)


@sfx("stone_letgo", "field", "A held path lets go: a soft falling sigh of snow (band noise sliding down and away) with the "
     "bell note reversed under it (it swells and stops, the hold undone), about 0.6 s.", target=-19.0, tail_db=-48,
     fallback="debuff")
def stone_letgo(g, v):
    d = 0.62
    n = ns(d)
    t = np.arange(n) / SR
    m = M()
    sigh = dsp.bq_tv(dsp.pink(n, g), "bp", dsp.glide(2600, 500, n, "exp", 0.8), 1.1, SR, block=32)
    m.add(norm(sigh) * np.sin(np.pi * np.clip(t / d, 0, 1)) ** 1.3, 0.0, 0.55)
    rev = iceglass(hz("D5"), 0.5, g, ring=0.35, beat=0.6)[::-1]
    m.add(rev * np.clip((0.5 - np.arange(len(rev)) / SR) / 0.02, 0, 1), 0.05, 0.42)
    m.add(kit.sparkle(0.5, g, density=18.0, fmin=2500, fmax=6000, decay=(0.01, 0.04)), 0.05, 0.08)   # loose snow
    return verb(m.out, 0.8, 0.16, bright=0.5)


@sfx("frost_seal", "field", "A frost door forming: a rising crackle of ice locking (sparse and low to dense and high, with "
     "the creak of ice under stress), then a low glass thump at the end as it seals, about 1.1 s. (The story also plays it "
     "for the round door opening.)", target=-17.0, tail_db=-48, fallback="ice")
def frost_seal(g, v):
    d = 0.95
    n = ns(d)
    t = np.arange(n) / SR
    m = M()
    dens = 60.0 + 1400.0 * (t / d) ** 2
    cr = crackle_env(d, g, dens, band=(1200, 7500))
    ramp = dsp.bq_tv(cr, "bp", dsp.glide(1600, 5200, n, "exp"), 1.2, SR, block=32)
    m.add(norm(ramp) * (0.3 + 0.7 * (t / d)), 0.0, 0.5)
    m.add(kit.creak(0.7, g, 70, 160, modes=(900, 2100, 3700), qs=(14, 16, 12), jitter=0.3), 0.2, 0.16)   # ice under stress
    # the seal: a low glass thump (a thick bar's partials, 1 : 2.76 : 5.4, on A2) and a body thump
    m.add(kit.thump(140, 90, 0.25, 0.05, 0.001, click=0.1, g=g), 0.93, 0.22)
    m.add(iceglass(hz("A3"), 0.6, g, ring=0.22, beat=0.8, onset_ms=1.5), 0.93, 0.45)
    return verb(m.out, 0.9, 0.16, bright=0.5, predelay=0.01)


@sfx("frost_melt", "field", "A frost door thawing: frost_seal's own render (its seed) backwards, so the reverb swells in, the "
     "glass thump comes early and the crackle thins out and falls as the ice lets go. For the round door opening and the "
     "iced doors running at dawn.", target=-17.0, tail_db=-48, fallback="ice", seed_id="frost_seal")
def frost_melt(g, v):
    return frost_seal(g, v)[::-1].copy()


# ============================================================================ Rime (battle)

def _bite(g, pip):
    s = STEP ** (pip - 1)
    d = 0.3
    n = ns(d)
    t = np.arange(n) / SR
    m = M()
    cr = crackle_env(d, g, 1800.0 * np.exp(-t / 0.06), band=(1900 * s, 4800 * s))
    m.add(cr * np.exp(-t / 0.07), 0.0, 0.32)
    f = hz("E6") * s                                                     # the tick: a tiny glass ping, the pip's pitch
    ping = (np.sin(2 * np.pi * f * t) + 0.3 * np.sin(2 * np.pi * 2.76 * f * t)) * np.exp(-t / 0.05) * np.clip(t / 0.001, 0, 1)
    m.add(ping, 0.0, 0.7)
    return verb(m.out, 0.35, 0.08, bright=0.5)


@sfx("rime_bite", "magic", "Rime added to a member (one pip): a short dry frost crackle with a tiny ice tick (E6), 0.3 s.",
     target=-17.0, tail_db=-46, fallback="debuff")
def rime_bite(g, v):
    return _bite(g, 1)


@sfx("rime_bite_2", "magic", "Rime, the second pip: rime_bite a whole step higher (the band and the tick, F#6).",
     target=-17.0, tail_db=-46, fallback="debuff")
def rime_bite_2(g, v):
    return _bite(g, 2)


@sfx("rime_bite_3", "magic", "Rime, the third pip: rime_bite two whole steps higher (G#6), the last step before Frozen.",
     target=-17.0, tail_db=-46, fallback="debuff")
def rime_bite_3(g, v):
    return _bite(g, 3)


@sfx("rime_freeze", "magic", "A member Frozen: a glassy snap (a hard, bright, very short break) and a short ring of a glass "
     "bar (B6) that sags a little in pitch as it fades, about 0.6 s. Not core ice (no sparkle wash).", target=-16.0,
     tail_db=-46, fallback="ice")
def rime_freeze(g, v):
    d = 0.62
    m = M()
    m.add(kit.knock([2900, 4700, 6300], [9, 11, 10], g, 0.05, 0.006, gains=[1.0, 0.8, 0.5], exc=0.0006), 0.0, 0.9)  # snap
    m.add(kit.noise_burst(0.012, g, ("high", 3000), 0.003, 0.0001), 0.0, 0.5)
    n = ns(d)
    t = np.arange(n) / SR
    f = hz("B6") * (1.0 - 0.012 * (1 - np.exp(-t / 0.25)))
    ph = 2 * np.pi * np.cumsum(f) / SR
    ring = (np.sin(ph) + 0.35 * np.sin(2.76 * ph + 0.7)) * np.exp(-t / 0.18) * np.clip(t / 0.002, 0, 1)
    m.add(ring, 0.004, 0.45)
    m.add(kit.thump(180, 120, 0.12, 0.03, 0.0005), 0.0, 0.3)                # the body of the ice closing
    return verb(m.out, 0.5, 0.1, bright=0.6)


@sfx("call_cast", "magic", "Call cast: a clear rising two-note tone, D5 then A5 (the motif's first step), warm and wordless "
     "like a name called across snow, the second note held and coming back twice off the far drifts. No voice. Not core kept "
     "(a short bright held chime): this is two warm tones and a long open echo.", target=-16.5, tail_db=-48,
     fallback="buff")
def call_cast(g, v):
    m = M()
    m.add(warm_tone(hz("D5"), 0.26, g, attack=0.035, decay=0.15, vib=0.004), 0.0, 0.55)
    tone = warm_tone(hz("A5"), 0.75, g, attack=0.05, decay=0.32, vib=0.006)
    m.add(tone, 0.2, 0.62)
    for k, (at, gain) in enumerate(((0.43, 0.22), (0.66, 0.1))):          # the echo off the drifts, softer and darker
        m.add(lp(tone, 2600 - 700 * k), 0.2 + at, gain)
    m.add(dsp.bq(dsp.pink(ns(0.9), g), "bp", 900.0, 0.8, SR) * np.exp(-np.arange(ns(0.9)) / SR / 0.3) * 0.015, 0.0, 1.0)
    return verb(m.out, 1.4, 0.24, bright=0.55, predelay=0.03)


@sfx("farewell_read", "big", "The Farewell and Borrowed Light telegraph: a long low hush that swells, and over it a high thin "
     "whistle that wavers and slides a little flat and never resolves, about 1.8 s.", target=-16.0, tail_db=-44,
     fallback="telegraph")
def farewell_read(g, v):
    d = 1.8
    n = ns(d)
    t = np.arange(n) / SR
    m = M()
    sw = np.clip(t / 0.8, 0, 1) ** 1.5 * np.clip((d - t) / 0.4, 0, 1)
    hush = dsp.bq_tv(dsp.pink(n, g), "bp", dsp.glide(220, 380, n, "exp"), 1.4, SR, block=32)
    m.add(norm(hush) * sw, 0.0, 0.6)
    m.add(norm(lp(dsp.brown(n, g), 160)) * sw, 0.0, 0.35)
    f = hz("F#6") * (1.0 - 0.03 * (t / d) ** 1.5) * (1.0 + 0.004 * np.sin(2 * np.pi * 3.1 * t))
    wh = np.sin(2 * np.pi * np.cumsum(f) / SR)
    wh += 0.5 * norm(dsp.bq_tv(dsp.white(n, g), "bp", f, 30.0, SR, block=32))   # breath on the whistle
    m.add(wh * np.clip((t - 0.25) / 0.5, 0, 1) * np.clip((d - t) / 0.3, 0, 1), 0.0, 0.12)
    return verb(m.out, 1.2, 0.22, bright=0.45, predelay=0.02)


@sfx("farewell_break", "magic", "A Farewell broken (Call): ice cracking open (a crack, a low split, crackle running off) and "
     "a warm D major chord rising out of it (low to high, a quarter tone under pitch settling up into tune), about 1.4 s. "
     "Not decree_void (a fixed glass arpeggio), prophecy_break (rising glass glides) or rewrite_break (paper and one tone).",
     target=-15.5, tail_db=-46, fallback="glass_break")
def farewell_break(g, v):
    m = M()
    m.add(kit.knock([1900, 3300, 5100], [10, 12, 10], g, 0.07, 0.01, gains=[1.0, 0.7, 0.4], exc=0.0008), 0.0, 0.75)
    m.add(kit.thump(95, 55, 0.35, 0.09, 0.001, click=0.2, g=g), 0.0, 0.6)           # the ice splitting, low
    d = 0.6
    t0 = np.arange(ns(d)) / SR
    m.add(crackle_env(d, g, 1600.0 * np.exp(-t0 / 0.15), band=(1200, 6000)) * np.exp(-t0 / 0.25), 0.02, 0.35)
    # the warm chord: D3 A3 D4 F#4 A4, entering bottom to top 45 ms apart, each gliding up from a quarter tone flat
    for k, nm in enumerate(("D3", "A3", "D4", "F#4", "A4")):
        dur = 1.15 - 0.045 * k
        n = ns(dur)
        t = np.arange(n) / SR
        f = hz(nm) * 2 ** (-0.5 / 12 * np.exp(-t / 0.12))
        ph = 2 * np.pi * np.cumsum(f) / SR
        y = np.sin(ph) + 0.3 * np.sin(2 * ph) + 0.12 * np.sin(3 * ph)
        env = np.clip(t / 0.2, 0, 1) ** 1.6 * np.exp(-np.maximum(0, t - 0.35) / 0.35)
        m.add(y * env, 0.18 + 0.045 * k, 0.24 if k else 0.3)
    return verb(m.out, 1.3, 0.22, bright=0.5, predelay=0.02)


# ============================================================================ ambience

import ambience as A  # noqa: E402  (helpers only; importing registers nothing we write)


def _exact(f, T):
    """A tone frequency with a whole number of cycles in the loop, so a hum never shows the seam."""
    return round(f * T) / T


@amb("snow_wind", "The White Road, Palehaven: a soft steady wind over snow (lower and softer than sky_wind, with a fine snow "
     "hiss riding the gusts), a pine creak twice in the loop, and once a far glass chime.", 10.0, fallback="moor_wind")
def snow_wind(n, g):
    slow = np.clip(0.5 + 0.5 * A.periodic_lfo(n, g, 0.12), 0, 1)
    src = A.circ_noise(n, g, -3.5)
    body = A.tv_filter_periodic(src, "bp", 380 + 260 * slow + 60 * A.periodic_lfo(n, g, 0.5), 0.8) * (0.55 + 0.45 * slow)
    hiss = A.circ_noise(n, g, 0.0, 3000, 7000) * (0.25 + 0.75 * slow ** 2)
    low = A.circ_noise(n, g, -6.0, 50, 180) * 0.6
    creaks = np.zeros(n)
    for at in (2.3, 7.1):
        A.place(creaks, kit.creak(0.9, g, 18, 30, modes=(210, 470, 980), qs=(9, 11, 9), jitter=0.4), ns(at))
    chime = np.zeros(n)
    A.place(chime, iceglass(hz("E6"), 2.0, g, ring=0.7, beat=0.5), ns(5.4))
    chime = A.fft_band(chime, None, 4500)
    parts = dict(body=body / (np.std(body) + 1e-12), hiss=hiss / (np.std(hiss) + 1e-12) * 0.12,
                 low=low / (np.std(low) + 1e-12) * 0.4, creak=creaks / (np.max(np.abs(creaks)) + 1e-12) * 0.35,
                 chime=chime / (np.max(np.abs(chime)) + 1e-12) * 0.28)
    y = sum(parts.values())
    return A.circ_reverb(y, t60=1.3, predelay=0.025, bright=0.45)


@amb("vault_hush", "The Vault, the Stillheart: a deep hush, slow drips that freeze as they land (a drop, then a tiny tick of "
     "ice), a low hum of ice (two tones whose periods divide the loop), and a far bell-like groan once a loop (every 10 s).",
     10.0, fallback="archive_hush")
def vault_hush(n, g):
    T = n / SR
    slow = np.clip(0.5 + 0.5 * A.periodic_lfo(n, g, 0.08), 0, 1)
    hush = A.circ_noise(n, g, -4.0, 60, 900) * (0.7 + 0.3 * slow)
    deep = A.circ_noise(n, g, -6.0, 25, 120)
    t = np.arange(n) / SR
    hum = (np.sin(2 * np.pi * _exact(73.4, T) * t) + 0.5 * np.sin(2 * np.pi * _exact(110.2, T) * t + 0.7)) * (0.4 + 0.6 * slow)
    drips = np.zeros(n)
    for at, f in ((1.1, 1650), (3.7, 1420), (6.0, 1800), (8.6, 1520)):
        k = ns(0.12)
        tt = np.arange(k) / SR
        drop = np.sin(2 * np.pi * np.cumsum(f * (1 + 0.6 * np.exp(-tt / 0.01))) / SR) * np.exp(-tt / 0.025)
        A.place(drips, drop, ns(at))
        A.place(drips, kit.knock([f * 2.6, f * 4.1], [20, 18], g, 0.06, 0.012, gains=[1.0, 0.5]) * 0.35, ns(at + 0.09))
    groan = np.zeros(n)
    k = ns(3.0)
    tt = np.arange(k) / SR
    f0 = 98.0 * (1.0 - 0.02 * tt / 3.0)
    ph = 2 * np.pi * np.cumsum(f0) / SR
    gr = (np.sin(ph) + 0.5 * np.sin(2.76 * ph + 0.3) + 0.2 * np.sin(5.4 * ph + 1.1)) * np.clip(tt / 0.6, 0, 1) * np.exp(-tt / 0.9)
    A.place(groan, gr, ns(4.6))
    groan = A.fft_band(groan, 40, 900)
    parts = dict(hush=hush / (np.std(hush) + 1e-12), deep=deep / (np.std(deep) + 1e-12) * 0.7,
                 hum=hum / (np.std(hum) + 1e-12) * 0.08, drips=drips / (np.max(np.abs(drips)) + 1e-12) * 0.45,
                 groan=groan / (np.max(np.abs(groan)) + 1e-12) * 0.9)
    y = sum(parts.values())
    return A.circ_reverb(y, t60=2.2, predelay=0.035, bright=0.35)


# ============================================================================ render

def render_sfx(only=None, review=False):
    res = {}
    (AUDIO / "sfx").mkdir(parents=True, exist_ok=True)
    for id_, r in REG.items():
        if only and id_ not in only:
            continue
        seed = build.seed_of("ep7_" + r["seed_id"])
        y = r["fn"](dsp.rng(seed), 0)
        target = r["target"] if r["target"] is not None else build.GROUP_TARGET[r["group"]]
        y, info = build.master(y, dsp.RENDER_SR, build.SFX_SR, target, "window", r["tail_db"])
        path = AUDIO / "sfx" / f"ep7_{id_}.wav"
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
        g = dsp.rng(zlib.crc32(("ep7_" + id_).encode()))
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
        path = AUDIO / "ambience" / f"ep7_{id_}.wav"
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
            _review(id_ + "_full", y, osr)
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


# ---------------------------------------------------------------------------- the pairs sheet
PAIRS = [("ep7_call_cast", "kept"), ("ep7_farewell_break", "ep6_rewrite_break"), ("ep7_farewell_break", "ep5_prophecy_break"),
         ("ep7_farewell_break", "ep4_decree_void"), ("ep7_rime_freeze", "ice"), ("ep7_stone_hold", "stone_name"),
         ("ep7_stone_hold", "chime_post_1"), ("ep7_rime_bite", "ep7_rime_bite_3")]


def describe(y, sr, nfft=4096):
    m = max(len(y), nfft)
    S = np.abs(np.fft.rfft(np.pad(y, (0, m - len(y))) * np.hanning(m), m))
    f = np.fft.rfftfreq(m, 1.0 / sr)
    P = S ** 2
    cen = float((f * P).sum() / (P.sum() + 1e-12))
    dom = float(f[np.argmax(S * (f > 60))])
    edges = 60.0 * 2 ** (np.arange(0, 28) / 3.0)
    prof = np.array([P[(f >= a) & (f < b)].sum() for a, b in zip(edges[:-1], edges[1:])])
    prof = 10 * np.log10(prof / (prof.sum() + 1e-12) + 1e-9)
    return dict(centroid=round(cen), dominant=round(dom), dur=round(len(y) / sr, 3)), prof


def pairs_sheet():
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    OUT.mkdir(parents=True, exist_ok=True)
    rows = []
    fig, ax = plt.subplots(len(PAIRS), 2, figsize=(12, 2.6 * len(PAIRS)))
    for i, (a, b) in enumerate(PAIRS):
        row, profs = [], []
        for j, nm in enumerate((a, b)):
            y, sr = dsp.read_wav(AUDIO / "sfx" / f"{nm}.wav")
            y = dsp.mono(y) if y.ndim > 1 else y
            d, prof = describe(y, sr)
            profs.append(prof)
            row.append((nm, d))
            ax[i][j].specgram(y, NFFT=512, Fs=sr, noverlap=384, cmap="magma")
            ax[i][j].set_title(f"{nm}  centroid {d['centroid']} Hz  peak {d['dominant']} Hz  {d['dur']} s", fontsize=9)
            ax[i][j].set_ylim(0, 11000)
        p0, q0 = profs[0] - profs[0].mean(), profs[1] - profs[1].mean()
        cos = float((p0 * q0).sum() / (np.linalg.norm(p0) * np.linalg.norm(q0) + 1e-12))
        rows.append(dict(a=row[0], b=row[1], profile_cosine=round(cos, 3)))
        print(f"{a:20s} {row[0][1]}\n{b:20s} {row[1][1]}\n  band-profile similarity {cos:+.3f} (1 = same shape)")
    fig.tight_layout()
    fig.savefig(OUT / "pairs.png", dpi=75)
    plt.close(fig)
    return rows


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--only", default=None)
    ap.add_argument("--review", action="store_true")
    a = ap.parse_args()
    only = set(a.only.split(",")) if a.only else None
    res = {"sfx": render_sfx(only, a.review), "ambience": render_amb(only, a.review)}
    if a.review:
        res["pairs"] = pairs_sheet()
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "stats.json").write_text(json.dumps(res, indent=1), encoding="utf-8", newline="\n")


if __name__ == "__main__":
    main()
