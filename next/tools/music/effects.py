"""Mix-bus effects: Schroeder (Freeverb-style) reverb, stereo feedback delay, K-weighted loudness,
lookahead limiter, DC removal. All deterministic, all numpy/scipy.

The reverb is a real Schroeder network (8 lowpass-feedback combs in parallel into 4 series allpasses,
with the right channel's delays offset for width). Because the network is linear and time-invariant,
we run it once on an impulse to get its impulse response and apply it with FFT convolution, which is
hundreds of times faster than running the recursion sample by sample in Python.
"""
import math
import numpy as np
from scipy import signal
from scipy.ndimage import maximum_filter1d


def _comb_lp(x, d, fb, damp):
    """Lowpass-feedback comb: y[n] = x[n] + fb * lp(y[n-d]). Block-wise (block = d)."""
    n = x.shape[0]
    y = np.zeros(n + d)
    zi = np.zeros(1)
    b = np.array([1.0 - damp])
    a = np.array([1.0, -damp])
    nblocks = (n + d - 1) // d
    for k in range(nblocks):
        s, e = k * d, min(n, (k + 1) * d)
        if k == 0:
            y[s:e] = x[s:e]
        else:
            prev = y[s - d:e - d]
            f, zi = signal.lfilter(b, a, prev, zi=zi)
            y[s:e] = x[s:e] + fb * f
    return y[:n]


def _allpass(x, d, g=0.5):
    """Schroeder allpass: y[n] = -g x[n] + x[n-d] + g y[n-d]. Block-wise."""
    n = x.shape[0]
    y = np.zeros(n + d)
    xp = np.concatenate([np.zeros(d), x])
    nblocks = (n + d - 1) // d
    for k in range(nblocks):
        s, e = k * d, min(n, (k + 1) * d)
        y[s:e] = -g * x[s:e] + xp[s:e] + g * y[s - d:e - d] if k > 0 else -g * x[s:e] + xp[s:e]
    return y[:n]


_IR_CACHE = {}


def reverb_ir(sr, room=0.82, damp=0.3, length=3.5, stereo_spread=23, predelay_ms=12.0):
    key = (sr, room, damp, length, stereo_spread, predelay_ms)
    if key in _IR_CACHE:
        return _IR_CACHE[key]
    n = int(length * sr)
    imp = np.zeros(n)
    imp[0] = 1.0
    fb = 0.70 + 0.28 * room
    combs = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617]
    aps = [556, 441, 341, 225]
    scale = sr / 44100.0
    outs = []
    for ch_off in (0, stereo_spread):
        acc = np.zeros(n)
        for d in combs:
            acc += _comb_lp(imp, int(round((d + ch_off) * scale)), fb, damp)
        acc /= len(combs)
        for d in aps:
            acc = _allpass(acc, int(round((d + ch_off) * scale)), 0.5)
        outs.append(acc)
    ir = np.stack(outs, axis=1)
    # gentle high rolloff so the tail is not fizzy, and a pre-delay
    bq_b, bq_a = _biquad_lp(5500.0, sr)
    ir = signal.lfilter(bq_b, bq_a, ir, axis=0)
    pre = int(predelay_ms * sr / 1000.0)
    ir = np.concatenate([np.zeros((pre, 2)), ir], axis=0)
    # normalise energy so send levels are predictable
    ir /= math.sqrt(float((ir ** 2).sum()) / 2.0) * 6.0
    _IR_CACHE[key] = ir
    return ir


def _biquad_lp(f, sr, q=0.707):
    w0 = 2 * math.pi * f / sr
    cw, sw = math.cos(w0), math.sin(w0)
    alpha = sw / (2 * q)
    b = np.array([(1 - cw) / 2, 1 - cw, (1 - cw) / 2])
    a = np.array([1 + alpha, -2 * cw, 1 - alpha])
    return b / a[0], a / a[0]


def reverb(x_stereo, sr, room=0.82, damp=0.3, length=3.5, width=1.0):
    """Returns the wet signal only. Input is mixed to mono then rendered to two decorrelated tails."""
    ir = reverb_ir(sr, room, damp, length)
    mono = x_stereo.mean(axis=1)
    wl = signal.fftconvolve(mono, ir[:, 0])[:x_stereo.shape[0]]
    wr = signal.fftconvolve(mono, ir[:, 1])[:x_stereo.shape[0]]
    mid = (wl + wr) * 0.5
    side = (wl - wr) * 0.5 * width
    return np.stack([mid + side, mid - side], axis=1)


def stereo_delay(x_stereo, sr, time_l, time_r, feedback=0.3, damp_hz=3500.0, pingpong=True):
    """Feedback delay with a lowpass in the loop. Returns the wet signal only."""
    n = x_stereo.shape[0]
    dl, dr = int(time_l * sr), int(time_r * sr)
    b, a = _biquad_lp(damp_hz, sr)
    out = np.zeros((n, 2))
    # left and right lines, ping-pong: left feeds right and right feeds left
    yl = np.zeros(n + dl)
    yr = np.zeros(n + dr)
    zl = np.zeros(2)
    zr = np.zeros(2)
    block = max(1, min(dl, dr))
    nblocks = (n + block - 1) // block
    for k in range(nblocks):
        s, e = k * block, min(n, (k + 1) * block)
        src_l = x_stereo[s:e, 0].copy()
        src_r = x_stereo[s:e, 1].copy()
        if s - dl >= 0:
            fb_l = yl[s - dl:e - dl]
        else:
            fb_l = np.zeros(e - s)
        if s - dr >= 0:
            fb_r = yr[s - dr:e - dr]
        else:
            fb_r = np.zeros(e - s)
        fl, zl = signal.lfilter(b, a, fb_l, zi=zl)
        fr, zr = signal.lfilter(b, a, fb_r, zi=zr)
        if pingpong:
            yl[s:e] = src_l + feedback * fr
            yr[s:e] = src_r + feedback * fl
        else:
            yl[s:e] = src_l + feedback * fl
            yr[s:e] = src_r + feedback * fr
    # the wet output is the delayed line (first repeat onward)
    out[dl:, 0] = yl[:n - dl]
    out[dr:, 1] = yr[:n - dr]
    return out


# ---------------------------------------------------------------- loudness (ITU-R BS.1770-4)

def _k_weight_coeffs(sr):
    # stage 1: high shelf +4 dB around 1681 Hz ; stage 2: high-pass (RLB) at 38 Hz
    def shelf(sr):
        f0, G, Q = 1681.974450955533, 3.999843853973347, 0.7071752369554196
        K = math.tan(math.pi * f0 / sr)
        Vh = 10 ** (G / 20.0)
        Vb = Vh ** 0.4996667741545416
        a0 = 1.0 + K / Q + K * K
        b0 = (Vh + Vb * K / Q + K * K) / a0
        b1 = 2.0 * (K * K - Vh) / a0
        b2 = (Vh - Vb * K / Q + K * K) / a0
        a1 = 2.0 * (K * K - 1.0) / a0
        a2 = (1.0 - K / Q + K * K) / a0
        return np.array([b0, b1, b2]), np.array([1.0, a1, a2])

    def hp(sr):
        f0, Q = 38.13547087602444, 0.5003270373238773
        K = math.tan(math.pi * f0 / sr)
        a0 = 1.0 + K / Q + K * K
        a1 = 2.0 * (K * K - 1.0) / a0
        a2 = (1.0 - K / Q + K * K) / a0
        return np.array([1.0, -2.0, 1.0]), np.array([1.0, a1, a2])
    return shelf(sr), hp(sr)


def lufs_integrated(x_stereo, sr):
    (b1, a1), (b2, a2) = _k_weight_coeffs(sr)
    y = signal.lfilter(b1, a1, x_stereo, axis=0)
    y = signal.lfilter(b2, a2, y, axis=0)
    blk = int(0.4 * sr)
    hop = int(0.1 * sr)
    n = y.shape[0]
    if n < blk:
        return -70.0
    ms = []
    for s in range(0, n - blk + 1, hop):
        seg = y[s:s + blk]
        ms.append(float((seg ** 2).mean(axis=0).sum()))
    ms = np.array(ms)
    lk = -0.691 + 10.0 * np.log10(np.maximum(ms, 1e-12))
    gated = ms[lk > -70.0]
    if gated.size == 0:
        return -70.0
    rel = -0.691 + 10.0 * math.log10(gated.mean()) - 10.0
    gated2 = ms[(lk > -70.0) & (lk > rel)]
    if gated2.size == 0:
        return -70.0
    return -0.691 + 10.0 * math.log10(gated2.mean())


def lufs_short_term(x_stereo, sr, hop_s=0.5):
    """Short-term (3 s window) loudness curve for the dynamics plot: returns (times, lufs)."""
    (b1, a1), (b2, a2) = _k_weight_coeffs(sr)
    y = signal.lfilter(b1, a1, x_stereo, axis=0)
    y = signal.lfilter(b2, a2, y, axis=0)
    blk = int(3.0 * sr)
    hop = int(hop_s * sr)
    ts, vals = [], []
    for s in range(0, max(1, y.shape[0] - blk + 1), hop):
        seg = y[s:s + blk]
        ms = float((seg ** 2).mean(axis=0).sum())
        ts.append((s + blk / 2) / sr)
        vals.append(-0.691 + 10.0 * math.log10(max(ms, 1e-12)))
    return np.array(ts), np.array(vals)


def true_peak_db(x_stereo, sr):
    up = signal.resample_poly(x_stereo, 4, 1, axis=0)
    return 20.0 * math.log10(max(1e-9, float(np.abs(up).max())))


def limiter(x_stereo, sr, ceiling_db=-1.0, lookahead_ms=5.0, release_ms=120.0):
    """Lookahead peak limiter with a smooth release. Returns (y, max_gain_reduction_db)."""
    ceiling = 10.0 ** (ceiling_db / 20.0)
    peak = np.abs(x_stereo).max(axis=1)
    la = max(1, int(lookahead_ms * sr / 1000.0))
    # the required gain so that the local peak (within the lookahead window) stays under the ceiling
    local = maximum_filter1d(peak, size=2 * la + 1, mode='nearest')
    need = np.minimum(1.0, ceiling / np.maximum(local, 1e-9))
    # smooth: fast attack (follow decreases quickly via a min filter), slow exponential release
    need = -maximum_filter1d(-need, size=la, mode='nearest')
    rel = math.exp(-1.0 / (release_ms * sr / 1000.0))
    # one-pole release of the gain curve (state initialised so the file start is not attenuated)
    sm = signal.lfilter([1 - rel], [1, -rel], need, zi=[rel * need[0]])[0]
    g = np.minimum(need, sm)
    # one more short smoothing to remove zipper noise on the attack side
    g = signal.lfilter([1 - 0.9], [1, -0.9], g, zi=[0.9 * g[0]])[0]
    g = np.minimum(g, need * 1.0 + 1e-6)
    y = x_stereo * g[:, None]
    y = np.clip(y, -ceiling, ceiling)
    gr = 20.0 * math.log10(max(1e-9, float(g.min())))
    return y, gr


def dc_block(x_stereo, sr, f=20.0):
    w0 = 2 * math.pi * f / sr
    cw, sw = math.cos(w0), math.sin(w0)
    alpha = sw / (2 * 0.707)
    b = np.array([(1 + cw) / 2, -(1 + cw), (1 + cw) / 2])
    a = np.array([1 + alpha, -2 * cw, 1 - alpha])
    return signal.lfilter(b / a[0], a / a[0], x_stereo, axis=0)
