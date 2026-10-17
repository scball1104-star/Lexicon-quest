"""Measure music tracks and find loop points. Writes tools/audio/music_levels.json, which build.py
uses for the manifest (`volume` brings each track to -16 LUFS; loopStart/loopEnd when a clean loop
is found). Decodes with PyAV (FFmpeg).

    python tools/audio/music_scan.py                 # every music src in the manifest
    python tools/audio/music_scan.py --plots         # also splice plots in tools/audio/out/loop_<id>.png

Loop finder
  1. content end = last second whose RMS is within 14 dB of the track's median (skips fades/silence)
  2. features every ~93 ms: 36 log-spaced band energies + 12-bin chroma, log-compressed, per-frame
     normalized
  3. for every lag L (loop length 35 s .. whole track) score each pair (i, i+L) by the mean cosine
     similarity of the 4 s before and 1.5 s after the two points (diagonal of the self-similarity
     matrix); the jump b -> a is smooth when what precedes b sounds like what precedes a
  4. refine the start at sample level by waveform cross-correlation (+-60 ms)
  5. adopt the loop only if the feature score is high and the spectral flux at the splice is not
     an outlier for that track; otherwise loop from 0 to the content end (still removes silence gaps)
"""
from __future__ import annotations

import argparse
import json
import math
import sys
from pathlib import Path

import numpy as np
from scipy import signal

HERE = Path(__file__).resolve().parent
NEXT = HERE.parent.parent
sys.path.insert(0, str(HERE))

import dsp  # noqa: E402

AN_SR = 22050
HOP = 2048
MIN_LOOP = 35.0


def features(m, sr):
    f, t, Z = signal.stft(m, sr, nperseg=4096, noverlap=4096 - HOP, boundary=None, padded=False)
    P = np.abs(Z) ** 2
    edges = np.geomspace(60, 8000, 37)
    bands = np.stack([P[(f >= lo) & (f < hi)].sum(axis=0) for lo, hi in zip(edges[:-1], edges[1:])])
    chroma = np.zeros((12, P.shape[1]))
    valid = (f > 80) & (f < 5000)
    pc = (np.round(12 * np.log2(f[valid] / 440.0)) % 12).astype(int)
    for k in range(12):
        chroma[k] = P[valid][pc == k].sum(axis=0)
    F = np.vstack([np.log1p(bands * 1e4), 1.5 * np.log1p(chroma * 1e4)])
    F = F - F.mean(axis=1, keepdims=True)
    F = F / (np.linalg.norm(F, axis=0, keepdims=True) + 1e-9)
    flux = np.r_[0, np.sqrt(np.sum(np.maximum(0, np.diff(np.log1p(bands * 1e4), axis=1)) ** 2, axis=0))]
    return F, flux, HOP / sr


def content_end(m, sr):
    w = sr // 2
    rms = np.array([np.sqrt(np.mean(m[i:i + w] ** 2)) + 1e-9 for i in range(0, len(m) - w, w)])
    db_ = 20 * np.log10(rms)
    thr = np.median(db_) - 14
    idx = np.nonzero(db_ > thr)[0]
    return (idx[-1] + 1) * w / sr if len(idx) else len(m) / sr


def content_start(m, sr):
    a = np.abs(m)
    thr = np.max(a) * 10 ** (-45 / 20)
    i = np.argmax(a > thr)
    return max(0.0, i / sr - 0.005)


def find_loop(m, sr, near_end=25.0):
    """Best loop pair with the loop END in the last `near_end` seconds of content (keeps most of the
    track in the loop), plus the best pair anywhere (used only if it is clearly better and long)."""
    F, flux, dt = features(m, sr)
    N = F.shape[1]
    cend = content_end(m, sr)
    back = int(4.0 / dt)
    fwd = int(1.5 / dt)
    bmax = int((cend - 1.6) / dt)
    bmin_end = int((cend - near_end) / dt)
    best_end = (-2.0, None, None)
    best_any = (-2.0, None, None)
    Lmin = int(MIN_LOOP / dt)
    k = np.ones(back + fwd) / (back + fwd)
    for L in range(Lmin, bmax - back):
        d = np.einsum("ij,ij->j", F[:, : N - L], F[:, L:])
        sm = np.convolve(d, k, mode="full")[back + fwd - 1: len(d)]
        i = np.arange(len(sm)) + back
        b = i + L
        ok = (b <= bmax) & (i > int(3.0 / dt))
        if not ok.any():
            continue
        sc = np.where(ok, sm, -2.0)
        j = int(np.argmax(sc))
        if sc[j] > best_any[0]:
            best_any = (float(sc[j]), int(i[j]), int(b[j]))
        sc2 = np.where(ok & (b >= bmin_end), sm, -2.0)
        j2 = int(np.argmax(sc2))
        if sc2[j2] > best_end[0]:
            best_end = (float(sc2[j2]), int(i[j2]), int(b[j2]))
    pick = None
    if best_end[1] is not None and best_end[0] >= 0.85:
        pick = best_end
    elif best_any[1] is not None and best_any[0] >= 0.92 and (best_any[2] - best_any[1]) * dt >= 0.4 * cend:
        pick = best_any
    else:
        pick = best_end if best_end[1] is not None else best_any
    if pick[1] is None:
        return dict(ok=False, contentEnd=cend)
    return dict(ok=True, score=pick[0], a=pick[1] * dt, b=pick[2] * dt, contentEnd=cend, flux=flux, dt=dt,
                best_any=dict(score=round(best_any[0], 3), a=round((best_any[1] or 0) * dt, 2), b=round((best_any[2] or 0) * dt, 2)))


def refine(m, sr, a, b, search=0.06, win=0.05):
    """Keep b, move a by up to +-search so the waveforms around a and b line up best."""
    w = int(win * sr)
    s = int(search * sr)
    bi = int(b * sr)
    ai = int(a * sr)
    ref = m[bi - w: bi + w]
    seg = m[ai - s - w: ai + s + w]
    c = signal.correlate(seg, ref, mode="valid")
    e = np.sqrt(signal.correlate(seg ** 2, np.ones_like(ref), mode="valid") * np.sum(ref ** 2)) + 1e-12
    nc = c / e
    k = int(np.argmax(nc))
    return (ai - s + k) / sr, float(nc[k])


def splice_flux(m, sr, a, b):
    """Spectral flux at the splice (audio up to b, then from a) as a percentile of the track's flux."""
    w = int(1.0 * sr)
    sp = np.concatenate([m[int(b * sr) - w: int(b * sr)], m[int(a * sr): int(a * sr) + w]])
    F, flux, dt = features(m, sr)
    _, fsp, _ = features(sp, sr)
    mid = len(fsp) // 2
    val = float(np.max(fsp[max(0, mid - 2): mid + 3]))
    return float((flux < val).mean() * 100.0)


def scan(src, plots=False, label=None, own_loop=False):
    y, sr = dsp.read_audio(NEXT / src)
    if own_loop:  # composed with designed loop points (sidecar json): only measure loudness
        return dict(lufs=round(dsp.lufs_integrated(y, sr), 2), duration=round(len(y) / sr, 3), sampleRate=sr,
                    loopKind="sidecar")
    L = dsp.lufs_integrated(y, sr)
    m = dsp.mono(y)
    dur = len(m) / sr
    ma = dsp.resample(m, sr, AN_SR)
    res = find_loop(ma, AN_SR)
    out = dict(lufs=round(L, 2), duration=round(dur, 3), sampleRate=sr, contentEnd=round(res["contentEnd"], 3))
    start = content_start(m, sr)
    if res.get("ok"):
        a2, nc = refine(ma, AN_SR, res["a"], res["b"])
        pct = splice_flux(ma, AN_SR, a2, res["b"])
        out.update(candidate=dict(loopStart=round(a2, 4), loopEnd=round(res["b"], 4), score=round(res["score"], 3),
                                  xcorr=round(nc, 3), spliceFluxPct=round(pct, 1), bestAnywhere=res.get("best_any")))
        good = res["score"] >= 0.85 and pct <= 97.0
        if good:
            out["loopStart"] = round(a2, 4)
            out["loopEnd"] = round(res["b"], 4)
            out["loopKind"] = "matched"
        if plots:
            plot_splice(ma, AN_SR, a2, res["b"], NEXT / "tools/audio/out" / f"loop_{label or Path(src).stem}.png",
                        f"{src}: loop {a2:.2f}s <- {res['b']:.2f}s  score {res['score']:.3f}  xcorr {nc:.2f}  flux pct {pct:.0f}  {'ADOPTED' if good else 'rejected'}")
    if "loopEnd" not in out:
        out["loopStart"] = round(start, 4)
        out["loopEnd"] = round(min(dur, res["contentEnd"] + 0.25), 4)
        out["loopKind"] = "trimmed"
    return out


def plot_splice(m, sr, a, b, path, title):
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    w = int(3 * sr)
    sp = np.concatenate([m[int(b * sr) - w: int(b * sr)], m[int(a * sr): int(a * sr) + w]])
    ref_b = m[int(b * sr) - w: int(b * sr) + w]
    fig, axes = plt.subplots(3, 1, figsize=(12, 7), dpi=90)
    t = (np.arange(len(sp)) - w) / sr
    axes[0].plot(t, sp, lw=0.3)
    axes[0].axvline(0, color="r", lw=0.7)
    axes[0].set_title(title, fontsize=8, loc="left")
    for ax, x, name in ((axes[1], sp, "splice (loop end -> loop start)"), (axes[2], ref_b, "original around loop end")):
        f, tt, S = signal.spectrogram(x, sr, nperseg=1024, noverlap=768)
        S = 20 * np.log10(S + 1e-12)
        S -= S.max()
        ax.pcolormesh(tt - 3, f, S, vmin=-80, vmax=0, cmap="magma", shading="auto")
        ax.set_yscale("symlog", linthresh=300)
        ax.set_ylim(50, sr / 2)
        ax.axvline(0, color="c", lw=0.7)
        ax.set_title(name, fontsize=8, loc="left")
    fig.tight_layout()
    fig.savefig(path)
    plt.close(fig)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--plots", action="store_true")
    a = ap.parse_args()
    man = json.loads((NEXT / "assets/audio/manifest.json").read_text(encoding="utf-8"))
    srcs = {}
    for id_, e in man["music"].items():
        if id_.startswith("_") or not e.get("src"):
            continue
        srcs.setdefault(e["src"], id_)
    out_path = HERE / "music_levels.json"
    levels = json.loads(out_path.read_text(encoding="utf-8")) if out_path.exists() else {}
    for src, id_ in srcs.items():
        side = (NEXT / src).with_suffix(".json")
        r = scan(src, a.plots, id_, own_loop=side.exists())
        levels[src] = r
        cand = r.get("candidate", {})
        if r["loopKind"] == "sidecar":
            print(f"{id_:15s} {src:32s} L {r['lufs']:6.1f}  dur {r['duration']:6.1f}  (loop points from its sidecar)")
            continue
        print(f"{id_:15s} {src:32s} L {r['lufs']:6.1f}  dur {r['duration']:6.1f}  end {r['contentEnd']:6.1f}  "
              f"loop {r['loopStart']:.2f}-{r['loopEnd']:.2f} ({r['loopKind']})  cand {cand}")
    out_path.write_text(json.dumps(levels, indent=1), encoding="utf-8")


if __name__ == "__main__":
    main()
