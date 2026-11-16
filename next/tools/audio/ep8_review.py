"""Episode 8 music review (E8-audio): the numbers and pictures the ear would check, from the decoded MP3s.

    python tools/audio/ep8_review.py

Writes to tools/audio/out/ep8/ (the sound pairs sheet, pairs.png, is drawn by `python tools/audio/ep8_sfx.py --review`, the
violin's preview sheet by `python tools/music/songs/ep8_theme.py --preview`):
  seams.png        every Episode 8 loop decoded from its MP3 (PyAV): 1 s either side of loopEnd -> loopStart spliced exactly as
                   the engine loops it, and the spectrum of 200 ms before vs after the seam. boss_eraser has two loops in one
                   file (the battle, and the Last Silence from silenceStart to silenceEnd): both seams are drawn.
  motif.png        scriptorium_town bars 17-18 decoded: the strongest pitch per frame in the violin's band (G4 D5 E5, then the
                   C5 held five beats), and bars 1-2 for contrast (G4 D5 E5 and the silence where the C belongs)
  silence_pianoroll.png   the Last Silence loop's own piano roll (render.py draws the battle loop's)
  levels.json      per loop the decoded integrated loudness (measuredLufs) and the volume that brings it to its target
                   (-16 LUFS; the Last Silence -18, two LU under the battle on purpose)
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
OUT = HERE / "out" / "ep8"
# (label, file, start key, end key, target LUFS)
LOOPS = [("scriptorium_town", "ep8_scriptorium_town", "loopStart", "loopEnd", -16.0),
         ("first_library", "ep8_first_library", "loopStart", "loopEnd", -16.0),
         ("boss_eraser", "ep8_boss_eraser", "loopStart", "loopEnd", -16.0),
         ("boss_eraser_silence", "ep8_boss_eraser", "silenceStart", "silenceEnd", -18.0),
         ("the_last_word", "ep8_the_last_word", "loopStart", "loopEnd", -16.0)]


def spec(y, sr, nfft=4096):
    m = max(len(y), nfft)
    S = np.abs(np.fft.rfft(np.pad(y, (0, m - len(y))) * np.hanning(m), m))
    return np.fft.rfftfreq(m, 1.0 / sr), S


def pitch_track(m, sr, t0, beats, beat, lo, hi):
    seg = m[int(t0 * sr): int((t0 + beats * beat) * sr)]
    hop, win = 1024, 8192
    times, pitch = [], []
    for k in range(0, len(seg) - win, hop):
        f, S = spec(seg[k:k + win], sr, 1 << 15)
        band = (f > lo) & (f < hi)
        times.append((k + win / 2) / sr / beat)
        pitch.append(float(f[band][np.argmax(S[band])]))
    return times, pitch


def main():
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    OUT.mkdir(parents=True, exist_ok=True)
    report = {"seams": [], "levels": {}}
    cache = {}
    fig, ax = plt.subplots(len(LOOPS), 2, figsize=(12, 2.8 * len(LOOPS)))
    for i, (label, tid, ks, ke, target) in enumerate(LOOPS):
        meta = json.loads((MUS / f"{tid}.json").read_text(encoding="utf-8"))
        if tid not in cache:
            cache[tid] = dsp.read_audio(MUS / f"{tid}.mp3")
        y, sr = cache[tid]
        a, b = int(round(meta[ks] * sr)), int(round(meta[ke] * sr))
        stereo = y if y.ndim > 1 else np.stack([y, y], axis=1)
        lufs = float(dsp.lufs_integrated(stereo[a:b], sr))
        vol = 10 ** ((target - lufs) / 20.0)
        report["levels"][label] = dict(measuredLufs=round(lufs, 2), volume=round(vol, 3), target=target)
        m = dsp.mono(y) if y.ndim > 1 else y
        w = sr
        spliced = np.concatenate([m[b - w:b], m[a:a + w]])
        step = float(abs(m[b - 1] - m[a]))
        d = np.abs(np.diff(m[a:b]))
        typical, p99 = float(np.median(d)), float(np.percentile(d, 99))
        k = int(0.2 * sr)
        pre, post = m[b - k:b], m[a:a + k]
        lv = lambda x: 20 * np.log10(np.sqrt((x ** 2).mean()) + 1e-12)  # noqa: E731
        report["seams"].append(dict(loop=label, start=meta[ks], end=meta[ke], step=round(step, 5),
                                    typical_step=round(typical, 5), p99_step=round(p99, 5),
                                    rms_before_db=round(lv(pre), 1), rms_after_db=round(lv(post), 1)))
        print(f"{label:20s} decoded loop {lufs:6.2f} LUFS (volume {vol:.3f} to {target})  seam step {step:.5f} "
              f"(median {typical:.5f}, p99 {p99:.5f})  rms 200 ms before {lv(pre):6.1f} dB, after {lv(post):6.1f} dB")
        t = (np.arange(len(spliced)) - w) / sr
        ax[i][0].plot(t, spliced, lw=0.3)
        ax[i][0].axvline(0, color="r", lw=0.8)
        ax[i][0].set_title(f"{label}: decoded MP3, {ke} -> {ks} spliced (red), step {step:.4f} vs p99 {p99:.4f}", fontsize=9)
        f1, S1 = spec(pre, sr, 8192)
        f2, S2 = spec(post, sr, 8192)
        ax[i][1].semilogx(f1[1:], 20 * np.log10(S1[1:] + 1e-9), lw=0.5, label="200 ms before the seam")
        ax[i][1].semilogx(f2[1:], 20 * np.log10(S2[1:] + 1e-9), lw=0.5, label="200 ms after", alpha=0.8)
        ax[i][1].set_xlim(40, 16000)
        ax[i][1].legend(fontsize=7)
        ax[i][1].set_title("spectrum either side of the seam", fontsize=9)
    fig.tight_layout()
    fig.savefig(OUT / "seams.png", dpi=72)
    plt.close(fig)

    # the violin's motif: scriptorium_town bars 17-18 (finished: G4 D5 E5 C5, the C held five beats) and bars 1-2 (unfinished)
    meta = json.loads((MUS / "ep8_scriptorium_town.json").read_text(encoding="utf-8"))
    y, sr = dsp.read_audio(MUS / "ep8_scriptorium_town.mp3")
    m = dsp.mono(y) if y.ndim > 1 else y
    beat = 60.0 / meta["bpm"]
    fig, axs = plt.subplots(1, 2, figsize=(13, 3.2))
    per = {}
    for j, (bar, name) in enumerate(((17, "bars 17-18, finished"), (1, "bars 1-2, unfinished"))):
        t0 = meta["loopStart"] + (bar - 1) * 4 * beat
        times, pitch = pitch_track(m, sr, t0, 8, beat, 360, 700)
        axs[j].plot(times, pitch, ".", ms=3)
        for hzv, nm, c in ((392.0, "G4", "g"), (587.33, "D5", "b"), (659.26, "E5", "m"), (523.25, "C5", "r")):
            axs[j].axhline(hzv, color=c, lw=0.6, ls="--")
            axs[j].text(7.6, hzv + 4, nm, fontsize=8, color=c)
        axs[j].set_xlabel("beats from the bar")
        axs[j].set_title(f"scriptorium_town {name}: strongest pitch 360-700 Hz", fontsize=9)
        pb = {}
        for bt in range(8):
            sel = [p for x, p in zip(times, pitch) if bt + 0.35 <= x < bt + 1.0]
            pb[bt] = round(float(np.median(sel)), 1) if sel else None
        per[name] = pb
    fig.tight_layout()
    fig.savefig(OUT / "motif.png", dpi=80)
    plt.close(fig)
    report["motif_median_hz_per_beat"] = per
    print("scriptorium_town motif, median strongest pitch per beat:", per)

    # the Last Silence's own piano roll (the tracker's review draws the battle loop's)
    sys.path.insert(0, str(NEXT / "tools" / "music"))
    sys.path.insert(0, str(NEXT / "tools" / "music" / "songs"))
    import review  # noqa: E402
    import ep8_boss_eraser as B  # noqa: E402
    sil = B.build("silence")
    sil.render(verbose=False)
    chords = review.chord_per_bar(sil)
    p = review.pianoroll(sil, str(OUT), chords)
    print("the Last Silence piano roll:", p)
    (OUT / "review.json").write_text(json.dumps(report, indent=1), encoding="utf-8", newline="\n")
    (OUT / "levels.json").write_text(json.dumps(report["levels"], indent=1), encoding="utf-8", newline="\n")


if __name__ == "__main__":
    main()
