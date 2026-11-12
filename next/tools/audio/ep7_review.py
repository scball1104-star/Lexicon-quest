"""Episode 7 music review (E7-audio): the numbers and pictures the ear would check, from the decoded MP3s.

    python tools/audio/ep7_review.py

Writes to tools/audio/out/ep7/ (the sound pairs sheet, pairs.png, is drawn by `python tools/audio/ep7_sfx.py --review`):
  seams.png     each Episode 7 track decoded from its MP3 (PyAV): 1 s either side of loopEnd -> loopStart, the waveform
                spliced exactly as the engine loops it, and the spectrum of 200 ms before vs after the seam
  motif.png     palehaven bars 1-2 decoded: the strongest pitch per frame in the iceglass bell's band (D5 A5 B5 G5, the G
                left ringing into bar 2 under the cello's reply)
  levels.json   per track the decoded loop's integrated loudness (measuredLufs) and the volume that brings it to -16
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import dsp  # noqa: E402

NEXT = HERE.parent.parent
MUS = NEXT / "assets" / "audio" / "music"
OUT = HERE / "out" / "ep7"
TRACKS = ["ep7_palehaven", "ep7_frostbound_vault", "ep7_boss_phantom"]


def spec(y, sr, nfft=4096):
    m = max(len(y), nfft)
    S = np.abs(np.fft.rfft(np.pad(y, (0, m - len(y))) * np.hanning(m), m))
    return np.fft.rfftfreq(m, 1.0 / sr), S


def main():
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    OUT.mkdir(parents=True, exist_ok=True)
    report = {"seams": [], "levels": {}}
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
        d = np.abs(np.diff(m[a:b]))
        typical, p99 = float(np.median(d)), float(np.percentile(d, 99))
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

    # the bell's motif in palehaven bars 1-2: strongest peak per frame between 560 and 1000 Hz (D5 587, A5 880, B5 988,
    # G5 784); the cello's reply sits under the band, so the bell's own notes lead it
    meta = json.loads((MUS / "ep7_palehaven.json").read_text(encoding="utf-8"))
    y, sr = dsp.read_audio(MUS / "ep7_palehaven.mp3")
    m = dsp.mono(y) if y.ndim > 1 else y
    beat = 60.0 / meta["bpm"]
    s0 = int(meta["loopStart"] * sr)
    seg = m[s0: s0 + int(8 * beat * sr)]
    hop, win = 1024, 8192
    times, pitch = [], []
    for k in range(0, len(seg) - win, hop):
        f, S = spec(seg[k:k + win], sr, 1 << 15)
        band = (f > 560) & (f < 1000)
        times.append((k + win / 2) / sr / beat)
        pitch.append(float(f[band][np.argmax(S[band])]))
    fig, ax = plt.subplots(1, 1, figsize=(9, 3))
    ax.plot(times, pitch, ".", ms=3)
    for hzv, nm, c in ((587.33, "D5", "g"), (880.0, "A5", "b"), (987.77, "B5", "m"), (783.99, "G5", "r")):
        ax.axhline(hzv, color=c, lw=0.6, ls="--")
        ax.text(7.6, hzv + 4, nm, fontsize=8, color=c)
    ax.set_xlabel("beats from the loop start (bar 2 starts at beat 4)")
    ax.set_ylabel("Hz (strongest peak 560-1000)")
    ax.set_title("palehaven: the iceglass bell's motif D5 A5 B5 G5, the G ringing on into bar 2")
    fig.tight_layout()
    fig.savefig(OUT / "motif.png", dpi=90)
    plt.close(fig)
    per_beat = {}
    for bt in range(8):
        sel = [p for x, p in zip(times, pitch) if bt + 0.35 <= x < bt + 1.0]
        per_beat[bt] = round(float(np.median(sel)), 1) if sel else None
    report["motif_median_hz_per_beat"] = per_beat
    print("palehaven motif, median strongest pitch per beat:", per_beat)
    (OUT / "review.json").write_text(json.dumps(report, indent=1), encoding="utf-8", newline="\n")
    (OUT / "levels.json").write_text(json.dumps(report["levels"], indent=1), encoding="utf-8", newline="\n")


if __name__ == "__main__":
    main()
