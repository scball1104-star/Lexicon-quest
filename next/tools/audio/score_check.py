"""Check the jingle scores without listening.

    python tools/audio/score_check.py              # all jingles
    python tools/audio/score_check.py victory_fanfare

For each jingle:
  * piano roll PNG (tools/audio/out/roll_<id>.png): every pitched track in its own color
  * chord implied on each beat (pitch-class set -> chord name)
  * clashes: two notes a semitone (or major 7th / minor 9th) apart that overlap for at least an
    eighth note, which in this idiom is almost always a mistake
  * stem balance: loudness of each track rendered alone; the lead should sit above the rest
"""
from __future__ import annotations

import sys
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

import matplotlib  # noqa: E402

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402

import dsp  # noqa: E402
import jingles  # noqa: E402
import tracker  # noqa: E402

PERC = {"timpani", "snare", "crash", "swell", "kick", "triangle"}
NAMES = ["C", "Db", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"]
CHORDS = {
    (0, 4, 7): "", (0, 3, 7): "m", (0, 4, 7, 10): "7", (0, 4, 7, 11): "maj7", (0, 3, 7, 10): "m7",
    (0, 4): "(no5)", (0, 7): "5", (0, 3): "m(no5)", (0, 4, 7, 2): "add9", (0, 2, 4, 7): "add9",
    (0, 4, 6, 7, 11): "maj7#11", (0, 4, 7, 11, 2): "maj9", (0, 3, 6): "dim", (0, 4, 10): "7(no5)",
    (0, 4, 6, 11): "maj7#11(no5)", (0, 2, 4, 7, 11): "maj9", (0, 4, 6, 7): "add#11",
}


def chord_name(pcs, bass):
    pcs = sorted(set(pcs))
    if not pcs:
        return "-"
    best = None
    for root in pcs:
        rel = tuple(sorted((p - root) % 12 for p in pcs))
        if rel in CHORDS:
            cand = NAMES[root] + CHORDS[rel]
            if bass is not None and bass % 12 != root:
                cand += "/" + NAMES[bass % 12]
            score = 0 if bass is not None and bass % 12 == root else 1
            if best is None or score < best[0]:
                best = (score, cand)
    if best:
        return best[1]
    return "{" + " ".join(NAMES[p] for p in pcs) + "}"


def notes_of(song):
    spb = 60.0 / song.bpm
    out = []
    for i, tr in enumerate(song.tracks):
        if tr.inst in PERC:
            continue
        ev, _ = tracker.parse(tr.seq)
        for e in ev:
            for m in e["notes"]:
                out.append(dict(track=i, inst=tr.inst, start=tr.start + e["t"], end=tr.start + e["t"] + e["beats"],
                                midi=m + tr.transpose + song.transpose))
    return out, spb


def analyse(jid):
    song = jingles.REG[jid]["song"]()
    notes, spb = notes_of(song)
    end = max(n["end"] for n in notes)
    lines = [f"== {jid}  ({song.bpm} bpm, {end:.2f} beats = {end * spb:.2f} s)"]
    # chords per beat
    row = []
    b = 0.0
    while b < end - 1e-6:
        sounding = [n for n in notes if n["start"] <= b + 0.01 and n["end"] > b + 0.01 and n["inst"] not in ("harp",)]
        if not sounding:
            sounding = [n for n in notes if n["start"] <= b + 0.01 and n["end"] > b + 0.01]
        bass = min((n["midi"] for n in sounding), default=None)
        row.append(f"{b:4.1f}:{chord_name([n['midi'] % 12 for n in sounding], bass)}")
        b += 1.0
    lines.append("  chords: " + "  ".join(row))
    # clashes
    clashes = []
    for i, a in enumerate(notes):
        for c in notes[i + 1:]:
            ov = min(a["end"], c["end"]) - max(a["start"], c["start"])
            if ov < 0.5 - 1e-6:
                continue
            iv = abs(a["midi"] - c["midi"])
            if iv % 12 in (1, 11) and iv != 0:
                clashes.append(f"{NAMES[a['midi'] % 12]}{a['midi'] // 12 - 1}({a['inst']}) vs "
                               f"{NAMES[c['midi'] % 12]}{c['midi'] // 12 - 1}({c['inst']}) at beat {max(a['start'], c['start']):.2f}")
    lines.append(f"  clashes (>= 1/8 note): {len(clashes)}" + ("".join("\n    " + c for c in clashes[:12])))
    # stems
    levels = []
    for i, tr in enumerate(song.tracks):
        solo = tracker.Song(bpm=song.bpm, transpose=song.transpose, tracks=[tr], tail=0.5, reverb=song.reverb, echo=song.echo)
        y = tracker.render(solo)
        levels.append((tr.inst, i, dsp.lufs_integrated(y, dsp.RENDER_SR)))
    lead = levels[0][2]
    lines.append("  stems (LUFS, first track = lead): " + ", ".join(f"{n}#{i} {L:.1f}" for n, i, L in levels))
    others = [L for n, i, L in levels[1:] if n not in PERC]
    if others:
        lines.append(f"  lead minus loudest other pitched part: {lead - max(others):+.1f} dB")
    # piano roll
    fig, ax = plt.subplots(figsize=(12, 4.5), dpi=100)
    cmap = plt.get_cmap("tab10")
    for n in notes:
        ax.add_patch(plt.Rectangle((n["start"], n["midi"] - 0.4), n["end"] - n["start"], 0.8,
                                   color=cmap(n["track"] % 10), alpha=0.8, linewidth=0))
    for t in range(int(end) + 1):
        ax.axvline(t, color="#ccc" if t % 4 else "#888", linewidth=0.5, zorder=0)
    ax.set_xlim(0, end + 0.25)
    mids = [n["midi"] for n in notes]
    ax.set_ylim(min(mids) - 2, max(mids) + 2)
    ax.set_yticks(range(12 * (min(mids) // 12), max(mids) + 2, 12))
    ax.set_yticklabels([f"C{k // 12 - 1}" for k in range(12 * (min(mids) // 12), max(mids) + 2, 12)])
    handles = [plt.Rectangle((0, 0), 1, 1, color=cmap(i % 10)) for i, tr in enumerate(song.tracks) if tr.inst not in PERC]
    labels = [f"{tr.inst}#{i}" for i, tr in enumerate(song.tracks) if tr.inst not in PERC]
    ax.legend(handles, labels, fontsize=7, loc="upper left", ncol=4)
    ax.set_title(f"{jid}: piano roll (beats)", fontsize=9, loc="left")
    out = HERE / "out" / f"roll_{jid}.png"
    fig.savefig(out, bbox_inches="tight")
    plt.close(fig)
    lines.append(f"  roll: {out}")
    return "\n".join(lines)


if __name__ == "__main__":
    ids = sys.argv[1:] or list(jingles.REG)
    for j in ids:
        print(analyse(j))
