"""Episode 4 sounds (E4-audio), docs/EPISODE4_PLAN.md 8.4: eight sfx, one clear bell variant and two ambience beds.

    python tools/audio/ep4_sfx.py              # render every Episode 4 sound into assets/audio/{sfx,ambience}/ep4_*.wav
    python tools/audio/ep4_sfx.py --only bell_drowned,seal_wash
    python tools/audio/ep4_sfx.py --review     # also write tools/audio/out/ep4/<id>.png (waveform + spectrogram)

Deliberately NOT registered in sfx_defs.REG and NOT run by build.py: build.py writes every registered sound to
assets/audio/sfx/<id>.wav (precached) and into assets/audio/manifest.json, and Episode 4 must add no byte to either
(plan 13). These files are named ep4_<id>.wav so build_pwa.py's LAZY_PREFIXES keep them out of the precache, and the
game finds them through the pack fragment src/data/ep4/audio.js. Same mastering chain as build.py (build.master): DC
block, 44.1k -> 22.05k, trim, fades, loudness to the group target, limiter, true peak <= -1 dBFS, TPDF dither.
"""
from __future__ import annotations

import argparse
import json
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
OUT = HERE / "out" / "ep4"
REG: dict = {}
AMB: dict = {}


def sfx(id_, group, intent, target=None, tail_db=-48.0, fallback=None, vary=0.0, max_voices=0):
    def deco(fn):
        REG[id_] = dict(id=id_, fn=fn, group=group, intent=intent, target=target, tail_db=tail_db, fallback=fallback,
                        vary=vary, max_voices=max_voices)
        return fn
    return deco


def amb(id_, intent, seconds, fallback=None, out_sr=22050):
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


def verb(x, t60=0.6, wet=0.15, bright=0.6, predelay=0.008):
    return dsp.mono(dsp.reverb(x, SR, t60=t60, wet=wet, predelay=predelay, bright=bright))


def norm(x):
    return x / (np.max(np.abs(x)) + 1e-12)


# ============================================================================ the tide locks

@sfx("tide_wheel", "field", "A lock wheel turns one mark: an iron ratchet, three pawl clicks, then a heavy clunk as it seats.",
     target=-18.0, tail_db=-44, fallback="block_push")
def tide_wheel(g, v):
    m = M()
    m.add(kit.creak(0.42, g, 18, 30, modes=(240, 610, 1300), qs=(8, 9, 8)), 0.0, 0.25)      # the axle under load
    for i, at in enumerate((0.06, 0.18, 0.30)):                                             # three ratchet clicks
        m.add(kit.knock([g.uniform(2300, 2700), g.uniform(4100, 4700), 6200], [22, 24, 20], g, 0.05, 0.008,
                        gains=[1.0, 0.6, 0.3]), at, 0.55 + 0.05 * i)
        m.add(kit.metal(1900.0 + 120 * i, 0.12, g, decay=0.05, bright=1.0), at, 0.12)
    m.add(kit.knock([150, 380, 900], [7, 9, 8], g, 0.2, 0.07, gains=[1.0, 0.6, 0.3]), 0.44, 1.0)   # the clunk
    m.add(kit.thump(110, 55, 0.18, 0.06, 0.001), 0.44, 0.55)
    m.add(kit.metal(620.0, 0.5, g, decay=0.22, bright=0.6), 0.45, 0.18)                    # iron ring after
    return verb(m.out, 0.55, 0.14, bright=0.45)


@sfx("water_rise", "field", "A basin fills: a deep gulp, then water swelling up the walls, about 0.8 s.",
     target=-18.0, tail_db=-42, fallback="splash")
def water_rise(g, v):
    m = M()
    d = 0.85
    n = ns(d)
    m.add(kit.thump(95, 60, 0.22, 0.09, 0.004), 0.0, 0.7)                                  # the gulp
    gulp = dsp.bq_tv(dsp.pink(ns(0.22), g), "bp", dsp.glide(260, 520, ns(0.22), "exp"), 2.5, SR, block=32)
    m.add(norm(gulp) * kit.gate(0.22, 0.01, 0.12), 0.0, 0.45)
    swell = dsp.bq_tv(dsp.pink(n, g), "bp", dsp.glide(300, 1300, n, "exp", 0.8), 0.8, SR, block=32)
    t = np.arange(n) / SR
    env = np.clip(t / 0.5, 0, 1) ** 1.4 * np.clip((d - t) / 0.25, 0, 1)
    m.add(norm(swell) * env * (0.8 + 0.2 * dsp.lfo(6.0, n, SR)), 0.05, 0.75)
    m.add(kit.bubbles(0.6, g, count=14, fmin=260, fmax=900, rise=1.5), 0.15, 0.35)
    m.add(kit.rumble(d, g, fc=140.0, rough=0.4, attack=0.3, release=0.3), 0.0, 0.4)
    return verb(m.out, 0.7, 0.16, bright=0.45)


@sfx("water_drain", "field", "A basin drains: a falling rush that empties to a trickle and a last drip, about 0.8 s.",
     target=-18.5, tail_db=-42, fallback="splash")
def water_drain(g, v):
    m = M()
    d = 0.75
    n = ns(d)
    t = np.arange(n) / SR
    rush = dsp.bq_tv(dsp.pink(n, g), "bp", dsp.glide(1500, 380, n, "exp", 1.2), 0.9, SR, block=32)
    env = np.exp(-t / 0.28) * np.clip(t / 0.02, 0, 1)
    m.add(norm(rush) * env, 0.0, 0.85)
    m.add(kit.rumble(0.45, g, fc=120.0, rough=0.4, attack=0.02, release=0.35), 0.0, 0.35)
    tr = dsp.bq_tv(dsp.white(ns(0.5), g), "bp", dsp.glide(2400, 1800, ns(0.5)), 2.0, SR, block=32)
    m.add(norm(tr) * kit.gate(0.5, 0.1, 0.3) * (0.5 + 0.5 * np.abs(dsp.smooth_random(ns(0.5), g, 25.0, SR))), 0.3, 0.18)
    m.add(kit.bubbles(0.4, g, count=7, fmin=700, fmax=1500, rise=1.3), 0.35, 0.25)
    m.add(_drop(hz("A6"), 0.55), 0.78, 0.35)                                               # the last drip
    return verb(m.out, 0.7, 0.16, bright=0.5)


def _drop(f0, vel=1.0):
    n = ns(0.14)
    t = np.arange(n) / SR
    f = f0 * (1.0 + 0.85 * (1.0 - np.exp(-t / 0.012)))
    y = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.026) * (1 - np.exp(-t / 0.0006))
    return y * vel


# ============================================================================ seals and decrees

@sfx("seal_wash", "field", "A forged seal washes off under high water: a wet paper tear, then the red ink blooming away "
     "in a soft, sinking swirl. Wet and low; no shimmer (so it never reads as decree_void).",
     target=-18.0, tail_db=-42, fallback="ink_gurgle")
def seal_wash(g, v):
    m = M()
    n = ns(0.26)
    tear = dsp.bq_tv(dsp.white(n, g), "bp", dsp.glide(900, 1700, n, "exp"), 1.5, SR, block=32)
    chat = np.clip(dsp.smooth_random(n, g, 60.0, SR), 0, None) ** 0.7                      # the fibres letting go
    m.add(norm(tear) * chat * kit.gate(0.26, 0.01, 0.1), 0.0, 0.55)
    m.add(lp(kit.noise_burst(0.03, g, (300, 1200), 0.02, 0.001), 2000), 0.0, 0.4)  # the wet slap
    d = 0.9
    nb = ns(d)
    t = np.arange(nb) / SR
    bloom = dsp.bq_tv(dsp.pink(nb, g), "lp", dsp.glide(1400, 260, nb, "exp", 0.8), 1.2, SR, block=32)
    m.add(norm(bloom) * np.clip(t / 0.15, 0, 1) * np.exp(-t / 0.35), 0.12, 0.6)
    tone = dsp.sine(dsp.glide(hz("D4"), hz("A3"), nb, "exp"), nb, SR) * np.exp(-t / 0.3) * np.clip(t / 0.08, 0, 1)
    m.add(tone * (1 + 0.2 * dsp.lfo(5.0, nb, SR)), 0.12, 0.18)                             # a soft sinking hum
    m.add(kit.bubbles(0.6, g, count=10, fmin=220, fmax=700, rise=1.2), 0.15, 0.3)
    return verb(m.out, 0.8, 0.2, bright=0.35)


@sfx("seal_stamp", "impact", "Stamp: a heavy wax seal pressed onto paper. A dull padded thunk with a soft wax squash, a "
     "short wooden knock of the handle, a dry paper slap.", target=-16.5, tail_db=-44, fallback="hit_heavy")
def seal_stamp(g, v):
    m = M()
    m.add(kit.thump(150, 60, 0.2, 0.06, 0.0015), 0.0, 0.6)
    m.add(kit.knock([330, 800, 1650], [6, 7, 6], g, 0.14, 0.035, gains=[1.0, 0.6, 0.3]), 0.0, 1.0)
    sq = lp(kit.noise_burst(0.06, g, (250, 1400), 0.03, 0.002), 1800)            # the wax squash
    m.add(sq, 0.004, 0.8)
    m.add(kit.paper_flap(g, dur=0.02, band=(1200, 5000)), 0.0, 0.35)
    m.add(kit.thump(70, 40, 0.3, 0.12, 0.003), 0.01, 0.15)                                  # the table under it
    return verb(m.out, 0.45, 0.1, bright=0.35)


@sfx("decree_void", "magic", "A decree is voided, and Answer: a crisp dry paper tear, then a bright rising shimmer of "
     "glass partials, high and clean (decree_void is dry and bright where seal_wash is wet and low).",
     target=-15.5, tail_db=-44, fallback="page_flutter")
def decree_void(g, v):
    m = M()
    n = ns(0.3)
    tear = dsp.bq_tv(dsp.white(n, g), "bp", dsp.glide(2200, 4800, n, "exp"), 1.2, SR, block=32)
    chat = np.clip(dsp.smooth_random(n, g, 90.0, SR), 0, None) ** 0.6
    m.add(norm(tear) * chat * kit.gate(0.3, 0.005, 0.08), 0.0, 0.6)
    m.add(kit.paper_flap(g, dur=0.03, band=(1800, 7000)), 0.24, 0.4)
    for i, (note, at) in enumerate((("D6", 0.16), ("A6", 0.22), ("D7", 0.28), ("F#7", 0.34))):
        m.add(kit.fm_bell(hz(note), 0.7, 2.0, 0.9, decay=0.28, idx_decay=0.06), at, 0.3 - 0.04 * i)
    m.add(kit.sparkle(0.6, g, density=55.0, fmin=4500, fmax=9500, fall=1.2), 0.18, 0.2)
    return verb(m.out, 0.9, 0.2, bright=0.9)


@sfx("decree_unroll", "magic", "A decree telegraph: a heavy scroll unrolling (a papery rasp in two rolls) over a low "
     "tone that rises a fourth, about 1.1 s.", target=-16.0, tail_db=-42, fallback="telegraph")
def decree_unroll(g, v):
    m = M()
    d = 1.1
    n = ns(d)
    t = np.arange(n) / SR
    for at, ln in ((0.0, 0.42), (0.38, 0.5)):
        k = ns(ln)
        r = dsp.bq_tv(dsp.white(k, g), "bp", dsp.glide(1100, 2600, k, "exp"), 1.6, SR, block=32)
        flick = 0.5 + 0.5 * np.abs(np.sin(2 * np.pi * np.cumsum(dsp.glide(28, 14, k)) / SR))   # the roll slapping
        m.add(norm(r) * flick * kit.gate(ln, 0.03, 0.12), at, 0.4)
    f = dsp.glide(hz("C3"), hz("F3"), n, "exp", 1.3)
    tone = dsp.saw(f, n, SR) * 0.4 + dsp.saw(f * 1.006, n, SR) * 0.4 + dsp.sine(f / 2, n, SR) * 0.5
    env = np.clip(t / 0.6, 0, 1) ** 1.5 * np.clip((d - t) / 0.12, 0, 1)
    m.add(lp(tone, 900) * env, 0.0, 0.55)
    m.add(kit.thump(90, 60, 0.2, 0.08, 0.002), d - 0.15, 0.4)                             # the scroll lands open
    return verb(m.out, 0.8, 0.16, bright=0.4)


# ============================================================================ the drowned bell

def _bronze(f, dur, g, decay):
    return kit.church_bell(f, dur, g, decay=decay, eerie=0.35)


@sfx("bell_drowned", "big", "The Keep's bell, heard through water: a bronze bell about D3, struck once, lowpassed and "
     "slowly wobbling (a gentle pitch and filter drift), long dark decay in a flooded hall.",
     target=-16.0, tail_db=-46, fallback="bell_toll")
def bell_drowned(g, v):
    d = 4.2
    y = _bronze(hz("D3"), d, g, decay=1.5)
    y = kit.release(y, 0.3)
    n = len(y)
    # the water: a time-varying lowpass sweeping slowly around 600 Hz, and a wobble in level
    cut = 620.0 * (1.0 + 0.25 * dsp.lfo(0.9, n, SR)) * np.exp(-np.arange(n) / SR / 6.0)
    y = dsp.bq_tv(y, "lp", np.maximum(cut, 260.0), 1.1, SR, block=64)
    y = y * (1.0 + 0.12 * dsp.lfo(1.7, n, SR))
    m = M()
    m.add(y, 0.0, 1.0)
    m.add(lp(kit.noise_burst(0.06, g, (150, 600), 0.04, 0.004), 700), 0.0, 0.2)  # a dull thud of the strike
    m.add(kit.bubbles(0.8, g, count=6, fmin=180, fmax=420, rise=1.1), 0.05, 0.12)
    return verb(m.out, 2.8, 0.35, bright=0.2, predelay=0.03)


@sfx("bell_clear", "big", "The principle stones (and the Keep's bell once the water is gone): the same bronze bell, clear, "
     "a step higher (E3), bright attack, long open decay. An extra id beside bell_drowned (plan 8.4: 'a clear variant').",
     target=-15.5, tail_db=-48, fallback="bell_toll")
def bell_clear(g, v):
    y = _bronze(hz("E3"), 4.5, g, decay=1.7)
    y = kit.release(y, 0.3)
    m = M()
    m.add(y, 0.0, 1.0)
    m.add(kit.noise_burst(0.012, g, ("high", 2500), 0.004, 0.0002), 0.0, 0.25)
    return verb(m.out, 2.4, 0.3, bright=0.6, predelay=0.02)


# ============================================================================ ambience

import ambience as A  # noqa: E402  (circular helpers; importing registers nothing we write)


@amb("canal_rain", "The Flood Road and Valewyn: steady rain on open water (a soft hiss bed and countless tiny plinks on "
     "the surface), a gutter trickle running into a canal, slow gusts, now and then a heavier drip from an eave.",
     10.0, fallback="river_birds", out_sr=16000)
def canal_rain(n, g):
    bed = A.circ_noise(n, g, slope=-2.0, lo=700, hi=7000) * 0.35
    gust = 0.75 + 0.25 * A.periodic_lfo(n, g, 0.25)
    y = bed * gust
    # raindrops on water: thousands of tiny decaying plinks, density following the gusts
    k = int(10.0 * 900)
    for _ in range(k):
        pos = int(g.integers(0, n))
        f = float(g.uniform(1800, 6500))
        ln = ns(float(g.uniform(0.006, 0.018)))
        t = np.arange(ln) / SR
        p = np.sin(2 * np.pi * f * (1 + 0.6 * (1 - np.exp(-t / 0.004))) * t) * np.exp(-t / (ln / SR / 3))
        A.place(y, p * float(g.uniform(0.03, 0.12)) * gust[pos], pos)
    # the gutter: a narrow band of moving water, steady
    gut = A.circ_noise(n, g, slope=-3.0, lo=500, hi=2600)
    gut = A.tv_filter_periodic(gut, "bp", 1100.0 * (1 + 0.3 * A.periodic_lfo(n, g, 3.0)), 3.0)
    y += gut * 0.14 * (0.8 + 0.2 * A.periodic_lfo(n, g, 1.1))
    # heavier eave drips, a few per loop
    for _ in range(9):
        pos = int(g.integers(0, n))
        A.place(y, _drop(float(g.uniform(700, 1400)), float(g.uniform(0.25, 0.5))), pos)
    y += A.circ_noise(n, g, slope=-6.0, lo=60, hi=300) * 0.12                             # low body of the water
    return A.circ_reverb(y, t60=0.9, predelay=0.015, bright=0.5)


@amb("keep_drip", "The Sunken Keep: a still, flooded stone hall. A low water hum, slow lapping against stone, sparse "
     "drips (a few close, most far and wet) and once a far groan of the lock gear.", 10.0, fallback="archive_hush", out_sr=16000)
def keep_drip(n, g):
    y = A.circ_noise(n, g, slope=-6.0, lo=40, hi=400) * 0.25
    lap = A.circ_noise(n, g, slope=-3.0, lo=200, hi=1200)
    lap_env = np.clip(0.5 + 0.5 * A.periodic_lfo(n, g, 0.6), 0, 1) ** 2
    y += lap * lap_env * 0.18
    y += A.circ_noise(n, g, slope=-1.0, lo=4000, hi=9000) * 0.02                            # the faint air of the room
    for i in range(14):
        pos = int(g.integers(0, n))
        far = i % 3 != 0
        d = _drop(float(g.uniform(900, 2200)), float(g.uniform(0.15, 0.3) if far else g.uniform(0.45, 0.7)))
        if far:
            d = lp(d, 2500)
        A.place(y, d, pos)
    gr = kit.creak(1.2, g, 6, 11, modes=(90, 210, 460), qs=(6, 7, 6))
    A.place(y, lp(gr, 900) * 0.25, int(n * 0.55))
    return A.circ_reverb(y, t60=2.2, predelay=0.03, bright=0.35)


# ============================================================================ render

def render_sfx(only=None, review=False):
    res = {}
    (AUDIO / "sfx").mkdir(parents=True, exist_ok=True)
    for id_, r in REG.items():
        if only and id_ not in only:
            continue
        seed = build.seed_of("ep4_" + id_)
        y = r["fn"](dsp.rng(seed), 0)
        target = r["target"] if r["target"] is not None else build.GROUP_TARGET[r["group"]]
        y, info = build.master(y, dsp.RENDER_SR, build.SFX_SR, target, "window", r["tail_db"])
        path = AUDIO / "sfx" / f"ep4_{id_}.wav"
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
        g = dsp.rng(zlib.crc32(("ep4_" + id_).encode()))
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
        path = AUDIO / "ambience" / f"ep4_{id_}.wav"
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
