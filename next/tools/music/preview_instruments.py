"""Render one note per instrument and draw a contact sheet (waveform + spectrogram) to out/instruments.png.
Also prints tuning accuracy, peak and decay figures so the synth can be audited without ears.

    python tools/music/preview_instruments.py
"""
import os
import sys
import math
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import synth  # noqa: E402
import effects  # noqa: E402
from theory import freq, midi  # noqa: E402

import matplotlib  # noqa: E402
matplotlib.use('Agg')
import matplotlib.pyplot as plt  # noqa: E402

SR = 44100
OUT = os.path.join(HERE, 'out')


def measured_pitch(x, sr, f_guess):
    """Fundamental estimate via a windowed FFT peak near the expected pitch."""
    n = min(len(x), sr)
    seg = x[:n] * np.hanning(n)
    spec = np.abs(np.fft.rfft(seg, 8 * n))
    fr = np.fft.rfftfreq(8 * n, 1.0 / sr)
    lo, hi = f_guess * 0.85, f_guess * 1.15
    m = (fr > lo) & (fr < hi)
    if not m.any():
        return float('nan')
    return float(fr[m][np.argmax(spec[m])])


def main():
    os.makedirs(OUT, exist_ok=True)
    cases = [
        ('strings', 'a3', 2.5, 0.8), ('strings_low', 'd2', 3.0, 0.8), ('strings_high', 'a4', 2.5, 0.7),
        ('choir', 'e3', 3.0, 0.8), ('horn', 'f3', 1.5, 0.8), ('oboe', 'c5', 1.5, 0.8), ('flute', 'g5', 1.2, 0.7),
        ('pizz', 'd3', 0.3, 0.8), ('harp', 'a4', 0.5, 0.8), ('celesta', 'a5', 0.5, 0.8), ('musicbox', 'd6', 0.5, 0.8),
        ('glock', 'd6', 0.5, 0.8), ('piano', 'c4', 1.0, 0.8), ('bell', 'e3', 0.5, 0.9), ('bass', 'd2', 0.8, 0.8),
        ('lowdrum', 'd2', 0.2, 0.9), ('creak', 'd1', 0.2, 0.9), ('shaker', 'c4', 0.1, 0.8), ('brush', 'c4', 0.1, 0.8),
    ]
    cols = 4
    rows = math.ceil(len(cases) / cols)
    fig, axes = plt.subplots(rows * 2, cols, figsize=(cols * 4.2, rows * 4.2))
    print('%-13s %7s %9s %9s %7s %7s %7s' % ('inst', 'f0', 'measured', 'cents', 'len s', 'peak', 'rms dB'))
    for i, (name, note, gate, vel) in enumerate(cases):
        inst = synth.make(name)
        f0 = freq(midi(note))
        rng = np.random.default_rng(1234 + i)
        x = inst.render(f0, gate, vel, SR, rng)
        mono = x.mean(axis=1) if x.ndim == 2 else x
        peak = float(np.abs(mono).max())
        rms = 20 * math.log10(max(1e-9, float(np.sqrt((mono ** 2).mean()))))
        pitched = name not in ('lowdrum', 'creak', 'shaker', 'brush')
        f_meas = measured_pitch(mono, SR, f0) if pitched else float('nan')
        cents = 1200 * math.log2(f_meas / f0) if pitched and f_meas == f_meas else float('nan')
        print('%-13s %7.1f %9.1f %9.1f %7.2f %7.3f %7.1f' % (name, f0, f_meas, cents, len(mono) / SR, peak, rms))
        r, c = (i // cols) * 2, i % cols
        ax = axes[r][c]
        t = np.arange(len(mono)) / SR
        ax.plot(t, mono, lw=0.4, color='#3b5b9d')
        ax.set_title('%s %s gate %.1fs' % (name, note, gate), fontsize=9)
        ax.set_ylim(-0.6, 0.6)
        ax.tick_params(labelsize=7)
        ax2 = axes[r + 1][c]
        ax2.specgram(mono, NFFT=2048, Fs=SR, noverlap=1536, cmap='magma', vmin=-120, vmax=-20)
        ax2.set_ylim(0, 12000)
        ax2.tick_params(labelsize=7)
    for j in range(len(cases), rows * cols):
        axes[(j // cols) * 2][j % cols].axis('off')
        axes[(j // cols) * 2 + 1][j % cols].axis('off')
    fig.tight_layout()
    path = os.path.join(OUT, 'instruments.png')
    fig.savefig(path, dpi=80)
    print('wrote', path)

    # ---- effects sanity ---------------------------------------------------------------
    t = np.arange(SR * 4) / SR
    sine = 0.1 * np.sin(2 * math.pi * 1000 * t)
    st = np.stack([sine, sine], axis=1)
    print('LUFS of a -20 dBFS stereo 1 kHz sine: %.2f (expect about -20.0)' % effects.lufs_integrated(st, SR))
    ir = effects.reverb_ir(SR)
    env = 20 * np.log10(np.maximum(1e-9, np.abs(ir[:, 0])))
    # RT60 estimate from the decay slope
    tt = np.arange(len(ir)) / SR
    sel = (tt > 0.2) & (tt < 2.5)
    slope = np.polyfit(tt[sel], env[sel], 1)[0]
    print('reverb IR length %.1fs, decay slope %.1f dB/s -> RT60 ~ %.1fs' % (len(ir) / SR, slope, -60 / slope))
    loud = np.stack([np.sin(2 * math.pi * 220 * t) * 1.5, np.sin(2 * math.pi * 220 * t) * 1.5], axis=1)
    lim, gr = effects.limiter(loud, SR)
    print('limiter: in peak %.2f -> out peak %.3f (%.2f dBFS), GR %.1f dB' % (
        np.abs(loud).max(), np.abs(lim).max(), 20 * math.log10(np.abs(lim).max()), gr))


if __name__ == '__main__':
    main()
