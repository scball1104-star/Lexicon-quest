"""Episode 5 audio review (E5-audio): images and numbers for the things the ear would check.

    python tools/audio/ep5_review.py

Writes to tools/audio/out/ep5/:
  pairs.png        spectrograms side by side for the three pairs that must never be confused (plan 8.4 and the brief):
                   sky_turn vs sky_turn_day, prophecy_break vs ep4 decree_void, caravan_bell vs ep4 bell_drowned
  seams.png        each Episode 5 track decoded from its MP3 (PyAV): 1 s either side of loopEnd -> loopStart, the
                   waveform spliced exactly as the engine loops it, and the spectrum of 200 ms before vs after the seam
  bend.png         saffron bars 1-2 decoded: the oud's Bb bending to A (pitch track of the 330-560 Hz band)
and prints, per pair, the spectral centroid, the dominant frequency, the duration and the spectral distance (cosine of
the log-magnitude spectra: 1.0 = identical), and per track the seam's sample step against the loop's typical step and
the level 200 ms either side of the seam.
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
SFX = NEXT / "assets" / "audio" / "sfx"
MUS = NEXT / "assets" / "audio" / "music"
OUT = HERE / "out" / "ep5"
PAIRS = [("ep5_sky_turn", "ep5_sky_turn_day"), ("ep5_prophecy_break", "ep4_decree_void"), ("ep5_caravan_bell", "ep4_bell_drowned")]
TRACKS = ["ep5_saffron", "ep5_labyrinth", "ep5_boss_oracle"]


def spec(y, sr, nfft=4096):
    y = y[: max(len(y), nfft)]
    S = np.abs(np.fft.rfft(np.pad(y, (0, max(0, nfft - len(y)))) * np.hanning(max(len(y), nfft)), max(len(y), nfft)))
    f = np.fft.rfftfreq(max(len(y), nfft), 1.0 / sr)
    return f, S


def describe(y, sr):
    f, S = spec(y, sr)
    P = S ** 2
    cen = float((f * P).sum() / (P.sum() + 1e-12))
    dom = float(f[np.argmax(S * (f > 60))])
    # 1/3-octave band profile for the distance
    edges = 60.0 * 2 ** (np.arange(0, 28) / 3.0)
    prof = np.array([P[(f >= a) & (f < b)].sum() for a, b in zip(edges[:-1], edges[1:])])
    prof = 10 * np.log10(prof / (prof.sum() + 1e-12) + 1e-9)
    return dict(centroid=round(cen), dominant=round(dom), dur=round(len(y) / sr, 3)), prof


def main():
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    OUT.mkdir(parents=True, exist_ok=True)
    report = {"pairs": [], "seams": []}

    fig, ax = plt.subplots(len(PAIRS), 2, figsize=(12, 3.2 * len(PAIRS)))
    for i, (a, b) in enumerate(PAIRS):
        row = []
        profs = []
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
        m = dsp.mono(y) if y.ndim > 1 else y
        a, b = int(round(meta["loopStart"] * sr)), int(round(meta["loopEnd"] * sr))
        w = sr
        spliced = np.concatenate([m[b - w:b], m[a:a + w]])           # what the engine plays across the loop
        step = float(abs(m[b - 1] - m[a]))
        typical = float(np.median(np.abs(np.diff(m[a:b]))))
        p99 = float(np.percentile(np.abs(np.diff(m[a:b])), 99))
        k = int(0.2 * sr)
        pre, post = m[b - k:b], m[a:a + k]
        lv = lambda x: 20 * np.log10(np.sqrt((x ** 2).mean()) + 1e-12)
        report["seams"].append(dict(track=tid, loopStart=meta["loopStart"], loopEnd=meta["loopEnd"], step=round(step, 5),
                                    typical_step=round(typical, 5), p99_step=round(p99, 5),
                                    rms_before_db=round(lv(pre), 1), rms_after_db=round(lv(post), 1)))
        print(f"{tid:16s} seam step {step:.5f} (median step {typical:.5f}, p99 {p99:.5f})  "
              f"rms 200 ms before {lv(pre):6.1f} dB, after {lv(post):6.1f} dB")
        t = (np.arange(len(spliced)) - w) / sr
        ax[i][0].plot(t, spliced, lw=0.3)
        ax[i][0].axvline(0, color="r", lw=0.8)
        ax[i][0].set_title(f"{tid}: decoded MP3, loopEnd -> loopStart spliced (red), step {step:.4f} vs p99 {p99:.4f}", fontsize=9)
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

    # the oud's bend in saffron: bars 1-2 (Bb4 struck on beat 4 of bar 1, bent to A4 just after the bar line)
    meta = json.loads((MUS / "ep5_saffron.json").read_text(encoding="utf-8"))
    y, sr = dsp.read_audio(MUS / "ep5_saffron.mp3")
    m = dsp.mono(y) if y.ndim > 1 else y
    beat = 60.0 / meta["bpm"]
    s0 = int((meta["loopStart"] + 2.5 * beat) * sr)
    seg = m[s0: s0 + int(3.5 * beat * sr)]
    hop, win = 512, 8192
    times, pitch = [], []
    for k in range(0, len(seg) - win, hop):
        f, S = spec(seg[k:k + win], sr, 1 << 15)
        band = (f > 425) & (f < 480)
        times.append((k + win / 2) / sr + 2.5 * beat)
        pitch.append(float(f[band][np.argmax(S[band])]))
    fig, ax = plt.subplots(1, 1, figsize=(9, 3))
    ax.plot(np.array(times) / beat, pitch)
    ax.axhline(466.16, color="g", lw=0.6, ls="--")
    ax.axhline(440.0, color="r", lw=0.6, ls="--")
    ax.set_xlabel("beats from the loop start (bar 2 starts at beat 4)")
    ax.set_ylabel("Hz (strongest peak 425-480)")
    ax.set_title("saffron: the oud's Bb4 (466 Hz, green) bending to A4 (440 Hz, red)")
    fig.tight_layout()
    fig.savefig(OUT / "bend.png", dpi=90)
    plt.close(fig)
    tb = np.array(times) / beat
    at = lambda x: pitch[int(np.argmin(np.abs(tb - x)))]
    # before the bend (beat 3.6, the Bb ringing) and just after it lands (beat 4.45); later the pad's Bb3 (its 2nd harmonic
    # is 466 Hz) can be the strongest peak in the band again as the oud decays
    report["bend"] = dict(before_hz=round(at(3.6), 1), after_hz=round(at(4.45), 1))
    print("saffron bend: %.1f Hz at beat 3.6 -> %.1f Hz at beat 4.45" % (at(3.6), at(4.45)))
    (OUT / "review.json").write_text(json.dumps(report, indent=1), encoding="utf-8")


if __name__ == "__main__":
    main()
