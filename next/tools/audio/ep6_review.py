"""Episode 6 audio review (E6-audio): images and numbers for the things the ear would check.

    python tools/audio/ep6_review.py

Writes to tools/audio/out/ep6/:
  pairs.png        spectrograms side by side for the pairs that must never be confused (plan 8.4 and the brief):
                   gale_gust vs core thunder, rewrite_break vs ep4 decree_void, rewrite_break vs ep5 prophecy_break,
                   signal_lamp vs ep5 caravan_bell
  seams.png        each Episode 6 track decoded from its MP3 (PyAV): 1 s either side of loopEnd -> loopStart, the waveform
                   spliced exactly as the engine loops it, and the spectrum of 200 ms before vs after the seam
  motif.png        zephyr bars 1-2 decoded: the strongest pitch per frame in the wind harp's band (G4 D5 E5 C5, the C
                   swelling in on beat 4 and held over the bar line)
  levels.json      per track the decoded loop's integrated loudness (measuredLufs) and the volume that brings it to -16
and prints, per pair, the spectral centroid, the dominant frequency, the duration and the band-profile similarity (cosine of
the 1/3-octave log profiles: 1.0 = identical), and per track the seam's sample step against the loop's typical step and
the level 200 ms either side of the seam.
"""
from __future__ import annotations

import json
import math
import sys
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import dsp  # noqa: E402

NEXT = HERE.parent.parent
SFX = NEXT / "assets" / "audio" / "sfx"
MUS = NEXT / "assets" / "audio" / "music"
OUT = HERE / "out" / "ep6"
PAIRS = [("ep6_gale_gust", "thunder"), ("ep6_rewrite_break", "ep4_decree_void"), ("ep6_rewrite_break", "ep5_prophecy_break"),
         ("ep6_signal_lamp", "ep5_caravan_bell")]
TRACKS = ["ep6_zephyr", "ep6_storm_observatory", "ep6_boss_scribe"]


def spec(y, sr, nfft=4096):
    m = max(len(y), nfft)
    S = np.abs(np.fft.rfft(np.pad(y, (0, m - len(y))) * np.hanning(m), m))
    f = np.fft.rfftfreq(m, 1.0 / sr)
    return f, S


def describe(y, sr):
    f, S = spec(y, sr)
    P = S ** 2
    cen = float((f * P).sum() / (P.sum() + 1e-12))
    dom = float(f[np.argmax(S * (f > 60))])
    edges = 60.0 * 2 ** (np.arange(0, 28) / 3.0)
    prof = np.array([P[(f >= a) & (f < b)].sum() for a, b in zip(edges[:-1], edges[1:])])
    prof = 10 * np.log10(prof / (prof.sum() + 1e-12) + 1e-9)
    return dict(centroid=round(cen), dominant=round(dom), dur=round(len(y) / sr, 3)), prof


def main():
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    OUT.mkdir(parents=True, exist_ok=True)
    report = {"pairs": [], "seams": [], "levels": {}}

    fig, ax = plt.subplots(len(PAIRS), 2, figsize=(12, 3.0 * len(PAIRS)))
    for i, (a, b) in enumerate(PAIRS):
        row, profs = [], []
        for j, nm in enumerate((a, b)):
            y, sr = dsp.read_wav(SFX / f"{nm}.wav")
            y = dsp.mono(y) if y.ndim > 1 else y
            d, prof = describe(y, sr)
            profs.append(prof)
            row.append((nm, d))
            ax[i][j].specgram(y, NFFT=512, Fs=sr, noverlap=384, cmap="magma")
            ax[i][j].set_title(f"{nm}  centroid {d['centroid']} Hz  peak {d['dominant']} Hz  {d['dur']} s", fontsize=9)
            ax[i][j].set_ylim(0, 11000)
        p, q = profs
        p0, q0 = p - p.mean(), q - q.mean()
        cos = float((p0 * q0).sum() / (np.linalg.norm(p0) * np.linalg.norm(q0) + 1e-12))
        report["pairs"].append(dict(a=row[0], b=row[1], profile_cosine=round(cos, 3)))
        print(f"{a:20s} {row[0][1]}\n{b:20s} {row[1][1]}\n  band-profile similarity {cos:+.3f} (1 = same shape)")
    fig.tight_layout()
    fig.savefig(OUT / "pairs.png", dpi=80)
    plt.close(fig)

    fig, ax = plt.subplots(len(TRACKS), 2, figsize=(12, 3.0 * len(TRACKS)))
    for i, tid in enumerate(TRACKS):
        meta = json.loads((MUS / f"{tid}.json").read_text(encoding="utf-8"))
        y, sr = dsp.read_audio(MUS / f"{tid}.mp3")
        a, b = int(round(meta["loopStart"] * sr)), int(round(meta["loopEnd"] * sr))
        stereo = y if y.ndim > 1 else np.stack([y, y], axis=1)
        lufs = float(dsp.lufs_integrated(stereo[a:b], sr))
        vol = 10 ** ((-16.0 - lufs) / 20.0)
        report["levels"][tid] = dict(measuredLufs=round(lufs, 2), volume=round(vol, 3))
        m = dsp.mono(y) if y.ndim > 1 else y
        w = sr
        spliced = np.concatenate([m[b - w:b], m[a:a + w]])
        step = float(abs(m[b - 1] - m[a]))
        typical = float(np.median(np.abs(np.diff(m[a:b]))))
        p99 = float(np.percentile(np.abs(np.diff(m[a:b])), 99))
        k = int(0.2 * sr)
        pre, post = m[b - k:b], m[a:a + k]
        lv = lambda x: 20 * np.log10(np.sqrt((x ** 2).mean()) + 1e-12)  # noqa: E731
        report["seams"].append(dict(track=tid, loopStart=meta["loopStart"], loopEnd=meta["loopEnd"], step=round(step, 5),
                                    typical_step=round(typical, 5), p99_step=round(p99, 5),
                                    rms_before_db=round(lv(pre), 1), rms_after_db=round(lv(post), 1)))
        print(f"{tid:22s} decoded loop {lufs:6.2f} LUFS (volume {vol:.3f})  seam step {step:.5f} (median {typical:.5f}, "
              f"p99 {p99:.5f})  rms 200 ms before {lv(pre):6.1f} dB, after {lv(post):6.1f} dB")
        t = (np.arange(len(spliced)) - w) / sr
        ax[i][0].plot(t, spliced, lw=0.3)
        ax[i][0].axvline(0, color="r", lw=0.8)
        ax[i][0].set_title(f"{tid}: decoded MP3, loopEnd -> loopStart spliced (red), step {step:.4f} vs p99 {p99:.4f}",
                           fontsize=9)
        f1, S1 = spec(pre, sr, 8192)
        f2, S2 = spec(post, sr, 8192)
        ax[i][1].semilogx(f1[1:], 20 * np.log10(S1[1:] + 1e-9), lw=0.5, label="200 ms before the seam")
        ax[i][1].semilogx(f2[1:], 20 * np.log10(S2[1:] + 1e-9), lw=0.5, label="200 ms after", alpha=0.8)
        ax[i][1].set_xlim(40, 16000)
        ax[i][1].legend(fontsize=7)
        ax[i][1].set_title("spectrum either side of the seam", fontsize=9)
    fig.tight_layout()
    fig.savefig(OUT / "seams.png", dpi=80)
    plt.close(fig)

    # the wind harp's motif in zephyr, bars 1-2: strongest peak per frame between 370 and 700 Hz (G4 392, D5 587, E5 659,
    # C5 523); the harp's sixteenths share the band, so the plot marks the four targets and reports the median per beat
    meta = json.loads((MUS / "ep6_zephyr.json").read_text(encoding="utf-8"))
    y, sr = dsp.read_audio(MUS / "ep6_zephyr.mp3")
    m = dsp.mono(y) if y.ndim > 1 else y
    beat = 60.0 / meta["bpm"]
    s0 = int(meta["loopStart"] * sr)
    seg = m[s0: s0 + int(8 * beat * sr)]
    hop, win = 1024, 8192
    times, pitch = [], []
    for k in range(0, len(seg) - win, hop):
        f, S = spec(seg[k:k + win], sr, 1 << 15)
        band = (f > 370) & (f < 700)
        times.append((k + win / 2) / sr / beat)
        pitch.append(float(f[band][np.argmax(S[band])]))
    fig, ax = plt.subplots(1, 1, figsize=(9, 3))
    ax.plot(times, pitch, ".", ms=3)
    for hzv, nm, c in ((392.0, "G4", "g"), (587.33, "D5", "b"), (659.26, "E5", "m"), (523.25, "C5", "r")):
        ax.axhline(hzv, color=c, lw=0.6, ls="--")
        ax.text(7.6, hzv + 4, nm, fontsize=8, color=c)
    ax.set_xlabel("beats from the loop start (bar 2 starts at beat 4)")
    ax.set_ylabel("Hz (strongest peak 370-700)")
    ax.set_title("zephyr: the wind harp's motif G4 D5 E5 C5, the C on beat 4 held over the bar line")
    fig.tight_layout()
    fig.savefig(OUT / "motif.png", dpi=90)
    plt.close(fig)
    tb = np.array(times)
    per_beat = {}
    for bt in range(8):
        sel = [p for x, p in zip(tb, pitch) if bt + 0.35 <= x < bt + 1.0]
        per_beat[bt] = round(float(np.median(sel)), 1) if sel else None
    report["motif_median_hz_per_beat"] = per_beat
    print("zephyr motif, median strongest pitch per beat:", per_beat)
    (OUT / "review.json").write_text(json.dumps(report, indent=1), encoding="utf-8")
    (OUT / "levels.json").write_text(json.dumps(report["levels"], indent=1), encoding="utf-8")


if __name__ == "__main__":
    main()
