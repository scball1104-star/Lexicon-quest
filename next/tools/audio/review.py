"""Visual self-review for generated audio: waveform + spectrogram contact sheets.

    python tools/audio/review.py                 # every category -> tools/audio/out/sheet_<cat>_<n>.png
    python tools/audio/review.py --only cursor,confirm --detail
    python tools/audio/review.py --kind jingles --detail

Each cell: name, duration, peak dBFS, loudness (LUFS, short-window max for sfx, integrated for
the rest), an amplitude envelope (min/max per pixel, linear), the RMS curve in dB, and a
log-frequency spectrogram (0 .. Nyquist). Red frame = clipping or peak above -1 dBFS.
"""
from __future__ import annotations

import argparse
import json
import math
import sys
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent
NEXT = HERE.parent.parent
sys.path.insert(0, str(HERE))

import matplotlib  # noqa: E402

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
from scipy import signal  # noqa: E402

import dsp  # noqa: E402

OUT = HERE / "out"


def load_manifest():
    return json.loads((NEXT / "assets/audio/manifest.json").read_text(encoding="utf-8"))


def stats(x, sr, kind):
    pk = float(np.max(np.abs(x))) if len(x) else 0.0
    tp = dsp.true_peak(x)
    lo = dsp.lufs_window_max(x, sr) if kind == "sfx" else dsp.lufs_integrated(x, sr)
    dc = float(np.mean(dsp.mono(x)))
    return dict(dur=len(x) / sr, peak=dsp.to_db(pk), tpeak=dsp.to_db(tp), lufs=lo, dc=dc)


def draw_cell(ax_w, ax_s, x, sr, title, st):
    m = dsp.mono(x)
    n = len(m)
    t = np.arange(n) / sr
    W = 400
    if n > W * 2:
        idx = np.linspace(0, n, W + 1).astype(int)
        mx = np.array([m[a:b].max() for a, b in zip(idx[:-1], idx[1:])])
        mn = np.array([m[a:b].min() for a, b in zip(idx[:-1], idx[1:])])
        tt = idx[:-1] / sr
        ax_w.fill_between(tt, mn, mx, color="#4a7bd0", linewidth=0)
    else:
        ax_w.plot(t, m, color="#4a7bd0", linewidth=0.6)
    if x.ndim == 2:
        side = (x[:, 0] - x[:, 1]) * 0.5
        ax_w.plot(t, side * 0 + 0, color="none")
    # RMS envelope in dB mapped onto the axis (right scale -60..0)
    win = max(1, int(0.01 * sr))
    rms = np.sqrt(np.convolve(m ** 2, np.ones(win) / win, mode="same") + 1e-12)
    rdb = np.clip(20 * np.log10(rms), -60, 0)
    ax_w.plot(t, rdb / 30.0 + 1.0, color="#e08a2a", linewidth=0.7, alpha=0.9)
    ax_w.set_ylim(-1.05, 1.05)
    ax_w.axhline(0.891, color="#c33", linewidth=0.4, linestyle=":")
    ax_w.axhline(-0.891, color="#c33", linewidth=0.4, linestyle=":")
    ax_w.set_xlim(0, max(t[-1] if n else 0.01, 0.01))
    ax_w.set_xticks([])
    ax_w.set_yticks([])
    bad = st["tpeak"] > -0.9 or abs(st["dc"]) > 0.003
    for sp in ax_w.spines.values():
        sp.set_color("#d22" if bad else "#888")
        sp.set_linewidth(1.6 if bad else 0.5)
    ax_w.set_title(f"{title}\n{st['dur']*1000:.0f} ms  pk {st['tpeak']:.1f}  L {st['lufs']:.1f}", fontsize=7, loc="left", pad=2)
    nper = 512 if sr >= 22050 else 256
    nper = min(nper, max(64, 2 ** int(math.log2(max(64, n // 4)))))
    f, tt, S = signal.spectrogram(m, sr, nperseg=nper, noverlap=nper * 3 // 4, window="hann", mode="magnitude")
    S = 20 * np.log10(S + 1e-9)
    S -= S.max()
    ax_s.pcolormesh(tt, np.maximum(f, 20), S, vmin=-80, vmax=0, cmap="magma", shading="auto")
    ax_s.set_yscale("log")
    ax_s.set_ylim(40, sr / 2)
    ax_s.set_xlim(0, max(t[-1] if n else 0.01, 0.01))
    ax_s.set_yticks([100, 1000, 10000])
    ax_s.set_yticklabels(["100", "1k", "10k"], fontsize=5)
    ax_s.tick_params(axis="x", labelsize=5, length=2)


def sheet(items, path, cols=6, cell_w=2.6, cell_h=2.3):
    rows = math.ceil(len(items) / cols)
    fig = plt.figure(figsize=(cols * cell_w, rows * cell_h), dpi=110)
    gs = fig.add_gridspec(rows * 2, cols, height_ratios=[1, 1.1] * rows, hspace=0.55, wspace=0.12)
    report = []
    for i, (name, x, sr, kind) in enumerate(items):
        r, c = divmod(i, cols)
        ax_w = fig.add_subplot(gs[r * 2, c])
        ax_s = fig.add_subplot(gs[r * 2 + 1, c])
        st = stats(x, sr, kind)
        draw_cell(ax_w, ax_s, x, sr, name, st)
        report.append((name, st))
    fig.savefig(path, bbox_inches="tight", facecolor="white")
    plt.close(fig)
    return report


def detail(name, x, sr, kind, path):
    st = stats(x, sr, kind)
    fig = plt.figure(figsize=(12, 6.5), dpi=100)
    gs = fig.add_gridspec(3, 1, height_ratios=[1, 0.5, 1.6], hspace=0.35)
    ax = fig.add_subplot(gs[0])
    if x.ndim == 2:
        t = np.arange(len(x)) / sr
        ax.plot(t, x[:, 0], linewidth=0.4, color="#3a6bc0", label="L")
        ax.plot(t, -x[:, 1], linewidth=0.4, color="#c0603a", label="R (inverted)")
        ax.legend(fontsize=7, loc="upper right")
    else:
        t = np.arange(len(x)) / sr
        ax.plot(t, x, linewidth=0.4, color="#3a6bc0")
    ax.set_ylim(-1.05, 1.05)
    ax.axhline(0.891, color="#c33", linewidth=0.5, linestyle=":")
    ax.axhline(-0.891, color="#c33", linewidth=0.5, linestyle=":")
    ax.set_title(f"{name}  {st['dur']:.3f}s  true peak {st['tpeak']:.2f} dBFS  L {st['lufs']:.1f}  DC {st['dc']:.4f}", fontsize=9, loc="left")
    ax2 = fig.add_subplot(gs[1], sharex=ax)
    m = dsp.mono(x)
    win = max(1, int(0.01 * sr))
    rms = np.sqrt(np.convolve(m ** 2, np.ones(win) / win, mode="same") + 1e-12)
    ax2.plot(t, 20 * np.log10(rms), color="#e08a2a", linewidth=0.8)
    ax2.set_ylim(-70, 0)
    ax2.set_ylabel("RMS dB", fontsize=7)
    ax2.grid(alpha=0.3)
    ax3 = fig.add_subplot(gs[2], sharex=ax)
    nper = 1024 if len(m) > 8192 else 256 if len(m) > 2048 else 128
    f, tt, S = signal.spectrogram(m, sr, nperseg=nper, noverlap=nper * 7 // 8, window="hann", mode="magnitude")
    S = 20 * np.log10(S + 1e-9)
    S -= S.max()
    ax3.pcolormesh(tt, np.maximum(f, 20), S, vmin=-90, vmax=0, cmap="magma", shading="auto")
    ax3.set_yscale("log")
    ax3.set_ylim(30, sr / 2)
    ax3.set_xlabel("s", fontsize=7)
    fig.savefig(path, bbox_inches="tight", facecolor="white")
    plt.close(fig)
    return st


def collect(kind_filter=None, only=None):
    man = load_manifest()
    items = []
    for kind in ("sfx", "jingles", "ambience"):
        if kind_filter and kind != kind_filter:
            continue
        for id_, e in man.get(kind, {}).items():
            if e.get("alias") or not e.get("src"):
                continue
            if only and id_ not in only:
                continue
            srcs = e["src"] if isinstance(e["src"], list) else [e["src"]]
            for j, s in enumerate(srcs):
                x, sr = dsp.read_audio(NEXT / s)
                label = id_ if len(srcs) == 1 else f"{id_}[{j}]"
                items.append((label, x, sr, kind, e.get("group", kind)))
    return items


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--kind", default=None)
    ap.add_argument("--only", default=None)
    ap.add_argument("--detail", action="store_true")
    ap.add_argument("--cols", type=int, default=6)
    a = ap.parse_args()
    OUT.mkdir(parents=True, exist_ok=True)
    only = set(a.only.split(",")) if a.only else None
    items = collect(a.kind, only)
    if a.detail:
        for name, x, sr, kind, _ in items:
            p = OUT / f"detail_{name.replace('[', '_').replace(']', '')}.png"
            detail(name, x, sr, kind, p)
            print(p)
        return
    groups: dict = {}
    for name, x, sr, kind, grp in items:
        groups.setdefault(grp, []).append((name, x, sr, kind))
    for grp, lst in groups.items():
        per = a.cols * 5
        for k in range(0, len(lst), per):
            p = OUT / f"sheet_{grp}_{k // per + 1}.png"
            rep = sheet(lst[k: k + per], p, cols=a.cols)
            print(p)
            for name, st in rep:
                flag = "  <-- CHECK" if st["tpeak"] > -0.9 or abs(st["dc"]) > 0.003 else ""
                print(f"   {name:22s} {st['dur']*1000:7.0f} ms  tp {st['tpeak']:6.2f}  L {st['lufs']:6.1f}{flag}")


if __name__ == "__main__":
    main()
