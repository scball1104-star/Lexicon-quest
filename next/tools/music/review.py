"""Self-review renders for a rendered Song (the composer cannot listen, so it looks instead).

For each track it writes to tools/music/out/:
    <id>_overview.png   waveform L/R, short-term loudness curve, spectrogram, loop-seam zoom, stats
    <id>_pianoroll.png  notes over time per instrument lane, bar lines, chord labels per bar
and prints: chord per bar (implied by the rendered notes) next to the intended chord, melody phrase
statistics (rests, longest unbroken run), parallel-octave count between bass and melody, dynamics
range, spectral balance by band, loop seam discontinuity (with and without gapless trimming).
"""
import math
import os
import numpy as np

import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt  # noqa: E402
from matplotlib.patches import Rectangle  # noqa: E402

import effects  # noqa: E402
from theory import analyse_chord, name_of  # noqa: E402

LANE_COLORS = ['#e4572e', '#17bebb', '#ffc914', '#76b041', '#a06cd5', '#f28cb1', '#3a86ff', '#ff9f1c',
               '#2ec4b6', '#b5651d', '#8d99ae', '#6a994e']


def _band_db(x, sr):
    mono = x.mean(axis=1)
    spec = np.abs(np.fft.rfft(mono * np.hanning(len(mono)))) ** 2
    fr = np.fft.rfftfreq(len(mono), 1.0 / sr)
    total = spec.sum()
    bands = [('sub <80', 0, 80), ('low 80-250', 80, 250), ('lowmid 250-800', 250, 800), ('mid 0.8-2.5k', 800, 2500),
             ('high 2.5-6k', 2500, 6000), ('air >6k', 6000, sr / 2)]
    out = []
    for name, lo, hi in bands:
        e = spec[(fr >= lo) & (fr < hi)].sum()
        out.append((name, 10 * math.log10(max(1e-12, e / total))))
    return out


def chord_per_bar(song):
    rows = []
    bpb = song.beats_per_bar
    for bar in range(1, song.bars + 1):
        b0, b1 = (bar - 1) * bpb, bar * bpb
        w = np.zeros(12)
        lowest = None
        for tr in song.tracks:
            if not tr.pitched:
                continue
            for n in tr.notes:
                s, e = max(n.t, b0), min(n.t + n.dur, b1)
                if e <= s:
                    continue
                # weight sustained harmony more than passing melody tones
                weight = (e - s) * n.vel * (1.6 if tr.role in ('pad', 'bass') else 1.0)
                w[n.midi % 12] += weight
                if tr.role == 'bass' and n.t < b0 + 0.5 and n.t + n.dur > b0:
                    if lowest is None or n.midi < lowest:
                        lowest = n.midi
        label, score = analyse_chord(w, None if lowest is None else lowest % 12)
        rows.append((bar, label, score))
    return rows


def melody_stats(song):
    out = {}
    for tr in song.tracks:
        if tr.role != 'melody' or not tr.notes:
            continue
        notes = sorted(tr.notes, key=lambda n: n.t)
        covered = np.zeros(int(song.loop_beats * 8))
        for n in notes:
            s, e = int(n.t * 8), int(min(song.loop_beats, n.t + n.dur) * 8)
            covered[s:e] = 1
        rest_ratio = 1.0 - covered.mean()
        # longest run of notes without a rest of at least half a beat
        longest, run, last_end = 0, 0, None
        for n in notes:
            if last_end is not None and n.t - last_end >= 0.5:
                run = 0
            run += 1
            longest = max(longest, run)
            last_end = n.t + n.dur
        durs = [n.dur for n in notes]
        out[tr.name] = dict(notes=len(notes), rest_ratio=rest_ratio, longest_run=longest,
                            mean_dur=float(np.mean(durs)), min_dur=min(durs), max_dur=max(durs),
                            lo=name_of(min(n.midi for n in notes)), hi=name_of(max(n.midi for n in notes)))
    return out


def parallel_octaves(song):
    bass = [t for t in song.tracks if t.role == 'bass']
    mels = [t for t in song.tracks if t.role == 'melody']
    if not bass or not mels:
        return None
    bnotes = sorted(bass[0].notes, key=lambda n: n.t)

    def bass_at(t):
        cur = None
        for n in bnotes:
            if n.t <= t + 1e-6:
                cur = n
            else:
                break
        return cur
    results = {}
    for m in mels:
        notes = sorted(m.notes, key=lambda n: n.t)
        count, moves = 0, 0
        prev = None
        for n in notes:
            b = bass_at(n.t)
            if b is None:
                continue
            if prev is not None:
                pm, pb = prev
                if n.midi != pm and b.midi != pb:
                    moves += 1
                    same_dir = (n.midi - pm) * (b.midi - pb) > 0
                    if same_dir and (pm - pb) % 12 == 0 and (n.midi - b.midi) % 12 == 0:
                        count += 1
            prev = (n.midi, b.midi)
        results[m.name] = (count, moves)
    return results


def seam_metrics(audio, ls, le, sr, shifts=(0, 1105)):
    """Discontinuity at the loop seam for several decoder offsets (0 = gapless honoured)."""
    out = {}
    typical = float(np.abs(np.diff(audio[ls:le, 0])).mean()) + 1e-9
    for d in shifts:
        a = audio[le - 1 - d] if le - 1 - d < audio.shape[0] else audio[-1]
        b = audio[ls - d] if ls - d >= 0 else np.zeros(2)
        jump = float(np.abs(b - a).max())
        out[d] = jump / typical
    return out


def overview(song, out_dir):
    audio, sr = song.audio, song.sr
    ls, le = song.loop_start_sample, song.loop_end_sample
    t = np.arange(audio.shape[0]) / sr
    fig = plt.figure(figsize=(16, 11))
    gs = fig.add_gridspec(4, 2, height_ratios=[1.2, 1.0, 1.6, 1.0], hspace=0.45, wspace=0.25)
    ax = fig.add_subplot(gs[0, :])
    ax.plot(t, audio[:, 0], lw=0.3, color='#3a86ff', label='L')
    ax.plot(t, -np.abs(audio[:, 1]), lw=0.3, color='#e4572e', label='R (mirrored)')
    ax.axvline(ls / sr, color='k', ls='--', lw=0.8)
    ax.axvline(le / sr, color='k', ls='--', lw=0.8)
    for bar in range(0, song.bars + 1, 4):
        ax.axvline(ls / sr + song.beat_to_sec(bar * song.beats_per_bar), color='#999', lw=0.4)
        ax.text(ls / sr + song.beat_to_sec(bar * song.beats_per_bar), 0.95, str(bar + 1), fontsize=7, color='#555')
    ax.set_ylim(-1, 1)
    ax.set_title('%s: waveform (loop %.3fs .. %.3fs, bars every 4)' % (song.id, ls / sr, le / sr))
    ax.legend(loc='lower right', fontsize=7)
    ax = fig.add_subplot(gs[1, :])
    ts, st = effects.lufs_short_term(audio[ls:le], sr)
    ax.plot(ts, st, color='#76b041')
    ax.set_ylabel('short-term LUFS')
    ax.set_title('dynamics over the loop (range %.1f LU)' % (st.max() - st.min()))
    ax.grid(alpha=0.3)
    ax = fig.add_subplot(gs[2, :])
    mono = audio[ls:le].mean(axis=1)
    ax.specgram(mono, NFFT=4096, Fs=sr, noverlap=3072, cmap='magma', vmin=-130, vmax=-30)
    ax.set_yscale('symlog', linthresh=500)
    ax.set_ylim(30, 20000)
    ax.set_title('spectrogram of the loop (symlog frequency axis)')
    # loop seam zoom: last 25 ms + first 25 ms
    w = int(0.025 * sr)
    seam = np.concatenate([audio[le - w:le, 0], audio[ls:ls + w, 0]])
    ax = fig.add_subplot(gs[3, 0])
    ax.plot(np.arange(-w, w) / sr * 1000, seam, lw=0.6, color='#17bebb')
    ax.axvline(0, color='k', lw=0.8)
    ax.set_xlabel('ms around the loop seam (end -> start)')
    ax.set_title('loop seam, gapless decode')
    seam2 = np.concatenate([audio[le - w - 1105:le - 1105, 0], audio[ls - 1105:ls + w - 1105, 0]])
    ax = fig.add_subplot(gs[3, 1])
    ax.plot(np.arange(-w, w) / sr * 1000, seam2, lw=0.6, color='#a06cd5')
    ax.axvline(0, color='k', lw=0.8)
    ax.set_title('loop seam if a decoder ignores the gapless tag (+1105 samples)')
    s = song.stats
    txt = 'LUFS %.1f  peak %.2f dBFS  true peak %.2f  DC %.5f  limiter GR %.1f dB  dur %.2fs' % (
        s['lufs'], s['peak_db'], s['true_peak_db'], s['dc'], s['limiter_gr_db'], s['duration'])
    fig.text(0.5, 0.005, txt, ha='center', fontsize=9)
    path = os.path.join(out_dir, song.id + '_overview.png')
    fig.savefig(path, dpi=90)
    plt.close(fig)
    return path


def pianoroll(song, out_dir, chords):
    tracks = [t for t in song.tracks if t.notes]
    bpb = song.beats_per_bar
    n_lanes = len(tracks)
    fig_h = 1.2 + 1.35 * n_lanes
    fig, axes = plt.subplots(n_lanes, 1, figsize=(max(14, song.bars * 0.6), fig_h), sharex=True,
                             gridspec_kw={'hspace': 0.12})
    if n_lanes == 1:
        axes = [axes]
    for i, (tr, ax) in enumerate(zip(tracks, axes)):
        col = LANE_COLORS[i % len(LANE_COLORS)]
        lo = min(n.midi for n in tr.notes) - 1
        hi = max(n.midi for n in tr.notes) + 1
        for n in tr.notes:
            alpha = 0.35 + 0.65 * n.vel
            ax.add_patch(Rectangle((n.t, n.midi - 0.45), n.dur * n.gate, 0.9, color=col, alpha=alpha, lw=0))
        for bar in range(song.bars + 1):
            ax.axvline(bar * bpb, color='#bbb', lw=0.5 if bar % 4 else 1.0)
        ax.set_xlim(0, song.loop_beats)
        ax.set_ylim(lo, hi)
        ax.set_yticks([m for m in range(lo, hi + 1) if m % 12 == 0])
        ax.set_yticklabels([name_of(m) for m in range(lo, hi + 1) if m % 12 == 0], fontsize=7)
        ax.set_ylabel('%s\n(%s)' % (tr.name, tr.inst_name), fontsize=8, rotation=0, ha='right', va='center')
        ax.grid(axis='y', alpha=0.15)
        if i == 0:
            for bar, label, _ in chords:
                ax.text((bar - 1) * bpb + 0.1, hi - 0.4, '%d %s' % (bar, label), fontsize=7, va='top', color='#333')
    axes[-1].set_xticks([b * bpb for b in range(song.bars + 1)])
    axes[-1].set_xticklabels([str(b + 1) for b in range(song.bars + 1)], fontsize=7)
    axes[-1].set_xlabel('bar')
    fig.suptitle('%s: piano roll (%s, %d BPM, %d bars)' % (song.id, song.key, song.base_bpm, song.bars))
    path = os.path.join(out_dir, song.id + '_pianoroll.png')
    fig.savefig(path, dpi=90, bbox_inches='tight')
    plt.close(fig)
    return path


def report(song, out_dir):
    os.makedirs(out_dir, exist_ok=True)
    chords = chord_per_bar(song)
    p1 = overview(song, out_dir)
    p2 = pianoroll(song, out_dir, chords)
    print('\n=== %s review ===' % song.id)
    print('bar  rendered-chord       intended')
    mism = 0
    for bar, label, score in chords:
        intended = song.intended_chords[bar - 1] if bar - 1 < len(song.intended_chords) else ''
        flag = ''
        if intended and intended.split('/')[0].replace(' ', '') not in label.replace(' ', ''):
            flag = '  <-- check'
            mism += 1
        print('%3d  %-20s %-14s%s' % (bar, label, intended, flag))
    print('chord mismatches vs intended: %d of %d' % (mism, len(chords)))
    for name, st in melody_stats(song).items():
        print('melody %-12s notes %3d  rest ratio %.2f  longest run w/o rest %2d  dur mean %.2f (%.2f..%.2f)  range %s..%s' % (
            name, st['notes'], st['rest_ratio'], st['longest_run'], st['mean_dur'], st['min_dur'], st['max_dur'], st['lo'], st['hi']))
    po = parallel_octaves(song)
    if po:
        for name, (c, m) in po.items():
            print('parallel octaves bass vs %s: %d of %d simultaneous moves' % (name, c, m))
    ls, le = song.loop_start_sample, song.loop_end_sample
    seams = seam_metrics(song.audio, ls, le, song.sr)
    print('loop seam jump / typical sample step: gapless %.2f, +1105 shift %.2f (under ~3 = inaudible)' % (seams[0], seams[1105]))
    ts, st = effects.lufs_short_term(song.audio[ls:le], song.sr)
    print('dynamics: short-term LUFS min %.1f max %.1f range %.1f LU' % (st.min(), st.max(), st.max() - st.min()))
    print('spectral balance: ' + ', '.join('%s %.1f dB' % (n, v) for n, v in _band_db(song.audio[ls:le], song.sr)))
    s = song.stats
    print('levels: integrated %.2f LUFS, sample peak %.2f dBFS, true peak %.2f dBFS, DC %.6f, limiter GR %.1f dB' % (
        s['lufs'], s['peak_db'], s['true_peak_db'], s['dc'], s['limiter_gr_db']))
    print('track rms (dB, over the loop): ' + ', '.join('%s %.1f' % kv for kv in sorted(s['track_rms'].items(), key=lambda kv: -kv[1])))
    print('images:', p1, p2)
    return p1, p2
