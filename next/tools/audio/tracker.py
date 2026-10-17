"""A tiny tracker: songs written as note strings, rendered with instruments.py.

Note string syntax (space separated tokens, `|` bar lines are ignored):
    C5:8        C5 eighth note           durations: 1 2 4 8 16 32, triplets 4t 8t 16t, dots 4. 8.
    r:4         quarter rest             ties: C5:4+8 (a quarter tied to an eighth)
    [C4,E4,G4]:2  chord                   suffix > = accent, ' = staccato (half gate)
    C5          same duration as the previous token
    C3:16@0.4   explicit velocity (0..1) for this note (crescendo rolls)

A song:
    Song(bpm=144, transpose=0, tracks=[Track('brass', "C5:8 E5:8 G5:4", vol=0.8, pan=-0.2, rev=0.2, echo=0.1)],
         reverb=dict(t60=1.4, bright=0.6), echo=dict(beats=0.75, feedback=0.35, lp=3800), tail=1.2)
`rev` / `echo` are send levels into the shared reverb and the stereo ping-pong echo (SNES style).
"""
from __future__ import annotations

from dataclasses import dataclass, field

import zlib

import numpy as np

import dsp
from dsp import RENDER_SR as SR, ns
from instruments import INSTRUMENTS

DUR = {"1": 4.0, "2": 2.0, "4": 1.0, "8": 0.5, "16": 0.25, "32": 0.125,
       "2t": 4 / 3, "4t": 2 / 3, "8t": 1 / 3, "16t": 1 / 6, "32t": 1 / 12}


def _beats(spec: str) -> float:
    total = 0.0
    for part in spec.split("+"):
        dots = len(part) - len(part.rstrip("."))
        base = DUR[part.rstrip(".")]
        b = base
        add = base
        for _ in range(dots):
            add /= 2
            b += add
        total += b
    return total


def parse(seq: str):
    events = []
    t = 0.0
    last = "4"
    for tok in seq.split():
        if tok == "|":
            continue
        accent = 1.0
        stacc = False
        vel_override = None
        if "@" in tok:
            tok, v = tok.split("@", 1)
            vel_override = float(v)
        while tok and tok[-1] in ">'":
            if tok[-1] == ">":
                accent = 1.22
            else:
                stacc = True
            tok = tok[:-1]
        if ":" in tok:
            pitch, d = tok.split(":", 1)
            last = d
        else:
            pitch, d = tok, last
        beats = _beats(d)
        if pitch != "r":
            if pitch.startswith("["):
                names = [p for p in pitch[1:-1].split(",") if p]
            else:
                names = [pitch]
            events.append(dict(t=t, beats=beats, notes=[dsp.note_midi(nm) for nm in names], accent=accent, stacc=stacc,
                               vel=vel_override))
        t += beats
    return events, t


@dataclass
class Track:
    inst: str
    seq: str
    vol: float = 0.8
    pan: float = 0.0
    vel: float = 0.8
    gate: float = 0.92
    transpose: int = 0
    rev: float = 0.15
    echo: float = 0.0
    start: float = 0.0      # beats offset
    seed: int = 1


@dataclass
class Song:
    bpm: float
    tracks: list
    transpose: int = 0
    reverb: dict = field(default_factory=lambda: dict(t60=1.3, bright=0.6, predelay=0.015))
    echo: dict = field(default_factory=lambda: dict(beats=0.75, feedback=0.32, lp=3800.0))
    tail: float = 1.2
    warmth: float = 10500.0   # master low-pass (SNES-style softness)


def _echo_wet(x: np.ndarray, delay: float, feedback: float, lp: float, repeats: int = 7) -> np.ndarray:
    d = ns(delay)
    n = len(x) + d * repeats
    out = np.zeros((n, 2))
    tap = x.copy()
    for i in range(1, repeats + 1):
        tap = dsp.onepole_lp(tap, lp) * (feedback if i > 1 else 1.0)
        c = 1 if i % 2 else 0
        s = d * i
        out[s: s + len(tap), c] += tap
        out[s: s + len(tap), 1 - c] += tap * 0.25
    return out


def song_end(song: Song) -> float:
    """Seconds until the last note's gate ends (before release tails)."""
    spb = 60.0 / song.bpm
    end = 0.0
    for tr in song.tracks:
        _, tot = parse(tr.seq)
        end = max(end, tr.start + tot)
    return end * spb


def render(song: Song) -> np.ndarray:
    spb = 60.0 / song.bpm
    end_beats = 0.0
    parsed = []
    for tr in song.tracks:
        ev, tot = parse(tr.seq)
        parsed.append(ev)
        end_beats = max(end_beats, tr.start + tot)
    length = end_beats * spb + song.tail + 2.5
    N = ns(length)
    dry = np.zeros((N, 2))
    rev_send = np.zeros(N)
    echo_send = np.zeros(N)
    for tr, ev in zip(song.tracks, parsed):
        g = dsp.rng(tr.seed * 7717 + zlib.crc32(tr.inst.encode()) % 100000)
        inst = INSTRUMENTS[tr.inst]
        buf = np.zeros(N)
        for e in ev:
            for m in e["notes"]:
                f = dsp.midi_hz(m + tr.transpose + song.transpose)
                gate = e["beats"] * spb * (0.5 if e["stacc"] else tr.gate)
                vel = min(1.0, (e["vel"] if e.get("vel") is not None else tr.vel) * e["accent"])
                x = inst(f, gate, vel, g) * (vel ** 1.3)
                x = dsp.end_fade(x, SR)
                s = ns((tr.start + e["t"]) * spb)
                k = min(len(x), N - s)
                if k > 0:
                    buf[s: s + k] += x[:k]
        buf *= tr.vol
        dry += dsp.pan(buf, tr.pan)
        rev_send += buf * tr.rev
        echo_send += buf * tr.echo
    out = dry
    if np.any(rev_send):
        w = dsp.reverb(rev_send, SR, t60=song.reverb.get("t60", 1.3), wet=1.0, dry=0.0,
                       predelay=song.reverb.get("predelay", 0.015), bright=song.reverb.get("bright", 0.6))
        k = min(len(w), N)
        out[:k] += w[:k]
    if np.any(echo_send):
        e = song.echo
        w = _echo_wet(echo_send, e.get("beats", 0.75) * spb, e.get("feedback", 0.32), e.get("lp", 3800.0))
        k = min(len(w), N)
        out[:k] += w[:k]
    out = dsp.butter(out, "low", song.warmth, SR, 2)
    return out
