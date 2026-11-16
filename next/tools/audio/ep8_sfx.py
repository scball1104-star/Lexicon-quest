"""Episode 8 sounds (E8-audio), docs/EPISODE8_PLAN.md 8.4: eight sfx and one ambience bed.

    python tools/audio/ep8_sfx.py              # render every Episode 8 sound into assets/audio/{sfx,ambience}/ep8_*.wav
    python tools/audio/ep8_sfx.py --only read_cast,rub_out
    python tools/audio/ep8_sfx.py --review     # also write tools/audio/out/ep8/<id>.png (waveform + spectrogram) and
                                               # tools/audio/out/ep8/pairs.png (the pairs that must never be confused)

Deliberately NOT registered in sfx_defs.REG and NOT run by build.py, exactly as tools/audio/ep7_sfx.py: Episode 8 adds no byte
to the precache or to assets/audio/manifest.json. The files are named ep8_<id>.wav so build_pwa.py's LAZY_PREFIXES keep them
out of the precache, and the game finds them through the pack fragment src/data/ep8/audio.js. Same mastering chain as
build.py (build.master).

The engine cannot play a buffer backwards, so `page_fold` is its own render: page_open's flutter (the same seed) reversed, and
a cover's clap in place of the lift.

Pairs that must never be confused (the brief; `--review` draws them in pairs.png): read_cast is NOT core `kept` or Episode 7's
call_cast; unwrite_break is NOT Episode 4's decree_void, Episode 5's prophecy_break, Episode 6's rewrite_break or Episode 7's
farewell_break; rub_out is NOT core `ice` or `ink_gurgle` (the sound of Episode 6's Smudge, through the ink_wave fx);
page_open is NOT core `door_open` or `page_flutter`.
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
OUT = HERE / "out" / "ep8"
REG: dict = {}
AMB: dict = {}


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


def hp(x, f, order=2):
    return dsp.butter(x, "high", f, SR, order)


def verb(x, t60=0.6, wet=0.15, bright=0.6, predelay=0.008):
    return dsp.mono(dsp.reverb(x, SR, t60=t60, wet=wet, predelay=predelay, bright=bright))


def norm(x):
    return x / (np.max(np.abs(x)) + 1e-12)


def flutter(dur, g, rate0, rate1, band0, band1, gain_curve=None):
    """A run of page flaps whose rate (flaps a second) and brightness glide from (rate0, band0) to (rate1, band1)."""
    n = ns(dur)
    out = np.zeros(n)
    t = 0.0
    while t < dur - 0.03:
        u = t / dur
        rate = rate0 + (rate1 - rate0) * u
        lo = band0[0] + (band1[0] - band0[0]) * u
        hi = band0[1] + (band1[1] - band0[1]) * u
        fl = kit.paper_flap(g, SR, g.uniform(0.012, 0.03), band=(lo, hi))
        s = ns(t)
        k = min(len(fl), n - s)
        amp = g.uniform(0.5, 1.0) * (gain_curve(u) if gain_curve else 1.0)
        out[s:s + k] += fl[:k] * amp
        t += (1.0 / rate) * g.uniform(0.7, 1.3)
    return out


def bowed(f_curve, g, bright=2600.0):
    """A plain bowed tone along a per-sample frequency curve: saw through a lowpass, no vowel formants, a little rosin."""
    n = len(f_curve)
    ph = np.cumsum(f_curve) / SR
    saw = 2.0 * (ph % 1.0) - 1.0
    y = lp(saw, bright, 4) + 0.5 * np.sin(2 * np.pi * ph)
    t = np.arange(n) / SR
    ros = bp(dsp.white(n, g), 3500, 7000) * np.exp(-t / 0.07) * 0.08
    return y + ros


# ============================================================================ books (the field)

@sfx("page_open", "field", "A pop-up book opens: a heavy cover lifting (a leather spine's low creak and a soft knock), a rising "
     "flutter of pages (slow and low to fast and bright), and a soft paper thump as they stand up, about 0.8 s.",
     target=-18.0, tail_db=-48, fallback="page_flutter")
def page_open(g, v):
    m = M()
    m.add(kit.creak(0.28, g, 30, 55, modes=(170, 420, 900), qs=(7, 9, 8), jitter=0.3), 0.0, 0.35)          # the spine
    m.add(kit.knock([140, 310], [5, 7], g, 0.12, 0.03, gains=[1.0, 0.5]), 0.02, 0.16)                     # the cover lifts
    fl = flutter(0.5, g, 14, 42, (700, 2600), (1400, 5000), gain_curve=lambda u: 0.4 + 0.6 * u)
    m.add(fl, 0.16, 0.75)
    m.add(kit.thump(110, 70, 0.16, 0.05, 0.002, click=0.05, g=g), 0.68, 0.22)                              # they stand
    m.add(lp(dsp.pink(ns(0.12), g), 1800) * np.exp(-np.arange(ns(0.12)) / SR / 0.03), 0.68, 0.1)
    return verb(m.out, 0.5, 0.12, bright=0.5)


@sfx("page_fold", "field", "A pop-up book closes: page_open's flutter (its own seed) played backwards, so the pages fall fast "
     "to slow, then a cover's soft clap, about 0.7 s.", target=-18.0, tail_db=-48, fallback="page_flutter", seed_id="page_open")
def page_fold(g, v):
    m = M()
    fl = flutter(0.5, g, 14, 42, (700, 2600), (1400, 5000), gain_curve=lambda u: 0.4 + 0.6 * u)[::-1].copy()
    m.add(fl, 0.0, 0.75)
    m.add(kit.noise_burst(0.05, g, (600, 2400), 0.012, 0.0008), 0.5, 0.38)                                 # the cover's clap
    m.add(kit.thump(160, 90, 0.12, 0.035, 0.001), 0.5, 0.16)
    m.add(kit.knock([120, 260], [5, 6], g, 0.1, 0.025, gains=[1.0, 0.4]), 0.505, 0.12)
    return verb(m.out, 0.45, 0.11, bright=0.5)


# ============================================================================ erasure (battle)

@sfx("rub_out", "magic", "A command rubbed out: three short dry strokes of rubber on paper (a friction band that grates "
     "back and forth) and a small puff of breath as the crumbs are blown off, about 0.5 s. Not core ice (glassy partials) and "
     "not ink_gurgle (wet bubbles).", target=-17.0, tail_db=-46, fallback="debuff")
def rub_out(g, v):
    m = M()
    for k, (at, d, f) in enumerate(((0.0, 0.1, 1500), (0.11, 0.09, 1900), (0.21, 0.12, 1300))):
        n = ns(d)
        t = np.arange(n) / SR
        grit = dsp.crackle(n, g, 2600.0, SR, 0.0006)
        rub = bp(dsp.white(n, g), f * 0.6, f * 2.2) * (0.6 + 0.4 * np.abs(np.sin(2 * np.pi * 38 * t)))
        env = np.sin(np.pi * np.clip(t / d, 0, 1)) ** 0.8
        m.add((norm(rub) * 0.8 + norm(bp(grit, 1800, 6000)) * 0.5) * env, at, 0.5 - 0.06 * k)
    n = ns(0.18)
    t = np.arange(n) / SR
    puff = lp(dsp.pink(n, g), 900) * np.clip(t / 0.015, 0, 1) * np.exp(-t / 0.05)
    m.add(norm(puff), 0.34, 0.35)
    return verb(m.out, 0.3, 0.06, bright=0.5)


@sfx("ink_slide", "magic", "A Defend slides the ink off: a soft wet slide (a smooth resonant sweep falling through filtered "
     "noise) and a little bright tick at its end, about 0.5 s.", target=-17.5, tail_db=-46, fallback="defend")
def ink_slide(g, v):
    d = 0.42
    n = ns(d)
    t = np.arange(n) / SR
    m = M()
    wet = dsp.bq_tv(dsp.pink(n, g), "bp", dsp.glide(1400, 380, n, "exp"), 6.0, SR, block=32)
    m.add(norm(wet) * np.sin(np.pi * np.clip(t / d, 0, 1)) ** 1.2, 0.0, 0.6)
    m.add(norm(lp(dsp.brown(n, g), 300)) * np.sin(np.pi * np.clip(t / d, 0, 1)), 0.0, 0.2)
    k = ns(0.06)
    tt = np.arange(k) / SR
    tick = np.sin(2 * np.pi * 3520 * tt) * np.exp(-tt / 0.012) * np.clip(tt / 0.0005, 0, 1)
    m.add(tick, 0.4, 0.38)
    return verb(m.out, 0.35, 0.08, bright=0.6)


@sfx("read_cast", "magic", "Read Aloud cast: a clear warm rising phrase like a voice reading a line, on a plain bowed tone "
     "(no words, no vowel formant): G4 B4 D5 then up to E5, gliding between notes like speech inflection, the last note "
     "lifting at its end like a question answered, about 1.4 s. Not core kept (a bright held chime) and not Episode 7's "
     "call_cast (two separate sine tones and far echoes).", target=-16.5, tail_db=-48, fallback="buff")
def read_cast(g, v):
    seg = [("G4", 0.22), ("B4", 0.18), ("D5", 0.26), ("E5", 0.62)]
    total = sum(d for _, d in seg)
    n = ns(total)
    f = np.zeros(n)
    pos = 0
    prev = None
    for nm, d in seg:
        k = ns(d)
        target = hz(nm)
        if prev is None:
            f[pos:pos + k] = target
        else:
            gl = min(k, ns(0.045))                                           # a speech-like glide into each note
            f[pos:pos + gl] = np.geomspace(prev, target, gl)
            f[pos + gl:pos + k] = target
        prev = target
        pos += k
    t = np.arange(n) / SR
    f[-ns(0.25):] *= np.geomspace(1.0, 2 ** (0.6 / 12), ns(0.25))           # the last note lifts a little
    f *= 1.0 + 0.003 * np.sin(2 * np.pi * 5.4 * t) * np.clip((t - 0.7) / 0.2, 0, 1)
    y = bowed(f, g, bright=2000.0)
    env = np.clip(t / 0.04, 0, 1) * (0.85 + 0.15 * np.sin(np.pi * t / total)) * np.clip((total - t) / 0.18, 0, 1)
    y = y * env
    return verb(y, 1.0, 0.2, bright=0.55, predelay=0.02)


@sfx("unwrite_read", "big", "The Unwrite telegraph: a long low erasing hush (slow strokes of a broad rubber across a page, "
     "the noise rising and falling three times a second) and over it a faint high whine that creeps upward and never "
     "resolves, about 2 s.", target=-16.0, tail_db=-44, fallback="telegraph")
def unwrite_read(g, v):
    d = 2.0
    n = ns(d)
    t = np.arange(n) / SR
    m = M()
    sw = np.clip(t / 0.5, 0, 1) ** 1.3 * np.clip((d - t) / 0.35, 0, 1)
    strokes = 0.08 + 0.92 * np.abs(np.sin(2 * np.pi * 1.5 * t)) ** 2
    hush = dsp.bq_tv(dsp.pink(n, g), "bp", 260 + 120 * strokes, 1.2, SR, block=32)
    m.add(norm(hush) * sw * strokes, 0.0, 0.6)
    m.add(norm(bp(dsp.white(n, g), 900, 2600)) * sw * strokes * 0.6, 0.0, 0.45)            # the rubber's grain
    f = hz("D#7") * 2 ** (0.7 / 12 * (t / d)) * (1 + 0.002 * np.sin(2 * np.pi * 6.3 * t))
    whine = np.sin(2 * np.pi * np.cumsum(f) / SR) + 0.6 * np.sin(2 * np.pi * np.cumsum(f * 1.0035) / SR)  # beating
    m.add(whine * np.clip((t - 0.3) / 0.7, 0, 1) * np.clip((d - t) / 0.25, 0, 1), 0.0, 0.06)
    return verb(m.out, 0.9, 0.12, bright=0.45, predelay=0.02)


@sfx("unwrite_break", "magic", "An Unwrite broken (Read Aloud): a sheet of paper snapping taut (a sharp crack with a low "
     "drum-like thwap of the page), then a warm G major chord bowed all at once (G2 to B4), steady in pitch, swelling and settling, about "
     "1.5 s. Not decree_void (a glass arpeggio), prophecy_break (rising glass glides), rewrite_break (a quill snap and one "
     "rising tone) or farewell_break (ice cracking, a sine chord gliding up from flat).", target=-15.5, tail_db=-46,
     fallback="glass_break")
def unwrite_break(g, v):
    m = M()
    crack = kit.noise_burst(0.025, g, (1800, 7000), 0.006, 0.0003)
    m.add(crack, 0.0, 0.45)
    m.add(kit.noise_burst(0.012, g, ("high", 4000), 0.002, 0.0001), 0.0, 0.35)          # the snap's edge
    m.add(kit.thump(190, 120, 0.12, 0.03, 0.0005, click=0.15, g=g), 0.0, 0.35)                  # the page pulled taut
    m.add(flutter(0.12, g, 60, 30, (1500, 5000), (1200, 4000)), 0.01, 0.18)
    d = 1.25
    n = ns(d)
    t = np.arange(n) / SR
    env = np.clip(t / 0.09, 0, 1) ** 1.2 * (0.75 + 0.25 * np.exp(-t / 0.3)) * np.clip((d - t) / 0.5, 0, 1) ** 1.5
    chord = np.zeros(n)
    for k, nm in enumerate(("G2", "D3", "G3", "B3", "D4", "G4", "B4")):
        f = hz(nm) * (1 + 0.0015 * (k - 2.5)) * (1 + 0.003 * np.sin(2 * np.pi * (5.0 + 0.3 * k) * t) * np.clip((t - 0.3) / 0.3, 0, 1))
        chord += bowed(f, g, bright=1100 + 160 * k) * (1.0 if k else 0.8)
    m.add(norm(chord) * env, 0.06, 0.45)
    return verb(m.out, 1.4, 0.24, bright=0.5, predelay=0.02)


@sfx("silence_gather", "big", "The Last Silence charging: a thin white tone (a pure high sine with a breath of air) rising "
     "slowly a fifth, swelling in and thinning away with no hard end, about 2.6 s. The scene plays it as the jingle "
     "`silence_gather` with { duckMusic: 0.3 } so the music system ducks the mix for its length and brings it back over half "
     "a second (never a sudden loud return).", target=-19.0, tail_db=-50, fallback="telegraph")
def silence_gather(g, v):
    d = 2.6
    n = ns(d)
    t = np.arange(n) / SR
    f = hz("E6") * 2 ** (7.0 / 12 * (t / d) ** 1.4)
    tone = np.sin(2 * np.pi * np.cumsum(f) / SR)
    air = dsp.bq_tv(dsp.white(n, g), "bp", f, 12.0, SR, block=32)
    env = np.clip(t / 1.2, 0, 1) ** 2 * np.clip((d - t) / 0.9, 0, 1) ** 1.5
    y = (tone + 0.35 * norm(air)) * env
    return verb(y, 1.6, 0.25, bright=0.6, predelay=0.03)


# ============================================================================ ambience

import ambience as A  # noqa: E402  (helpers only; importing registers nothing we write)


def _exact(f, T):
    """A tone frequency with a whole number of cycles in the loop, so a hum never shows the seam."""
    return round(f * T) / T


@amb("library_hush", "The Index, the First Library, the Last Word: a vast room's hush (a wide soft air, deeper and longer "
     "than archive_hush, no drips), pages turning far off twice a loop (a flutter and a soft landing, deep in the reverb), a "
     "slow creak of a tall shelf once, and once a candle guttering (a flame's soft flutter and two tiny pops).", 10.0,
     fallback="archive_hush")
def library_hush(n, g):
    T = n / SR
    t = np.arange(n) / SR
    slow = np.clip(0.5 + 0.5 * A.periodic_lfo(n, g, 0.1), 0, 1)
    room = A.circ_noise(n, g, -4.5, 50, 700) * (0.8 + 0.2 * slow)
    air = A.circ_noise(n, g, -1.0, 1800, 6000) * 0.05
    hum = np.sin(2 * np.pi * _exact(61.7, T) * t) * 0.03
    fx = np.zeros(n)
    for at in (1.6, 6.2):                                                    # pages turning far off
        fl = flutter(0.45, g, 30, 18, (1200, 4200), (900, 3000), gain_curve=lambda u: np.sin(np.pi * u) ** 0.7)
        land = lp(dsp.pink(ns(0.1), g), 1200) * np.exp(-np.arange(ns(0.1)) / SR / 0.025)
        A.place(fx, lp(fl, 3800), ns(at), 0.5)
        A.place(fx, land, ns(at + 0.47), 0.25)
    cr = kit.creak(1.4, g, 12, 20, modes=(120, 300, 620), qs=(8, 10, 9), jitter=0.35)       # a tall shelf, slow
    A.place(fx, cr, ns(3.9), 0.5)
    k = ns(0.6)                                                              # the candle guttering
    tt = np.arange(k) / SR
    flame = lp(dsp.pink(k, g), 500) * (0.5 + 0.5 * np.abs(np.sin(2 * np.pi * 11 * tt))) * np.sin(np.pi * tt / 0.6)
    A.place(fx, norm(flame), ns(8.1), 0.45)
    for at in (8.25, 8.5):
        A.place(fx, kit.noise_burst(0.01, g, (1500, 4000), 0.002, 0.0002), ns(at), 0.25)
    wet = A.circ_reverb(fx, t60=3.2, predelay=0.05, bright=0.35, seed=8)
    bed = room / (np.std(room) + 1e-12) + air / (np.std(air) + 1e-12) * 0.06 + hum / (np.std(hum) + 1e-12) * 0.05
    return bed + (fx * 0.15 + wet * 1.3) * 7.0


# ============================================================================ render

def render_sfx(only=None, review=False):
    res = {}
    (AUDIO / "sfx").mkdir(parents=True, exist_ok=True)
    for id_, r in REG.items():
        if only and id_ not in only:
            continue
        seed = build.seed_of("ep8_" + r["seed_id"])
        y = r["fn"](dsp.rng(seed), 0)
        target = r["target"] if r["target"] is not None else build.GROUP_TARGET[r["group"]]
        y, info = build.master(y, dsp.RENDER_SR, build.SFX_SR, target, "window", r["tail_db"])
        path = AUDIO / "sfx" / f"ep8_{id_}.wav"
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
        g = dsp.rng(zlib.crc32(("ep8_" + id_).encode()))
        y = r["fn"](ns(r["seconds"]), g)
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
        path = AUDIO / "ambience" / f"ep8_{id_}.wav"
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
PAIRS = [("ep8_read_cast", "kept"), ("ep8_read_cast", "ep7_call_cast"), ("ep8_unwrite_break", "ep4_decree_void"),
         ("ep8_unwrite_break", "ep5_prophecy_break"), ("ep8_unwrite_break", "ep6_rewrite_break"),
         ("ep8_unwrite_break", "ep7_farewell_break"), ("ep8_rub_out", "ice"), ("ep8_rub_out", "ink_gurgle"),
         ("ep8_page_open", "door_open"), ("ep8_page_open", "page_flutter"), ("ep8_unwrite_read", "ep7_farewell_read")]


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


def level_shape(y, sr, points=64):
    """The sound's level over its own length (20 ms RMS in dB, resampled to `points`): how it moves in time."""
    hop = int(0.02 * sr)
    r = np.array([np.sqrt((y[j:j + hop] ** 2).mean() + 1e-12) for j in range(0, max(hop, len(y) - hop), hop)])
    d = 20 * np.log10(r + 1e-6)
    return np.interp(np.linspace(0, len(d) - 1, points), np.arange(len(d)), d)


def pairs_sheet():
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    OUT.mkdir(parents=True, exist_ok=True)
    rows = []
    fig, ax = plt.subplots(len(PAIRS), 2, figsize=(12, 2.4 * len(PAIRS)))
    for i, (a, b) in enumerate(PAIRS):
        row, profs, envs = [], [], []
        for j, nm in enumerate((a, b)):
            y, sr = dsp.read_wav(AUDIO / "sfx" / f"{nm}.wav")
            y = dsp.mono(y) if y.ndim > 1 else y
            d, prof = describe(y, sr)
            profs.append(prof)
            envs.append(level_shape(y, sr))
            row.append((nm, d))
            ax[i][j].specgram(y, NFFT=512, Fs=sr, noverlap=384, cmap="magma")
            ax[i][j].set_title(f"{nm}  centroid {d['centroid']} Hz  peak {d['dominant']} Hz  {d['dur']} s", fontsize=9)
            ax[i][j].set_ylim(0, 11000)
        p0, q0 = profs[0] - profs[0].mean(), profs[1] - profs[1].mean()
        cos = float((p0 * q0).sum() / (np.linalg.norm(p0) * np.linalg.norm(q0) + 1e-12))
        ec = float(np.corrcoef(envs[0], envs[1])[0, 1])
        rows.append(dict(a=row[0], b=row[1], profile_cosine=round(cos, 3), envelope_corr=round(ec, 3)))
        ax[i][0].set_xlabel(f"band-profile similarity {cos:+.2f}   level-shape correlation {ec:+.2f}", fontsize=8)
        print(f"{a:20s} {row[0][1]}\n{b:20s} {row[1][1]}\n  band-profile similarity {cos:+.3f}, level-shape correlation "
              f"{ec:+.3f} (1 = same)")
    fig.tight_layout()
    fig.savefig(OUT / "pairs.png", dpi=72)
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
