"""Build every synthesized sound for Lexicon Quest NEXT and write the audio manifest + README.

    python tools/audio/build.py                  # sfx + jingles + ambience + manifest + README
    python tools/audio/build.py --sfx --only cursor,confirm
    python tools/audio/build.py --jingles
    python tools/audio/build.py --manifest       # only rewrite manifest.json / README.md from files on disk

Output (paths relative to next/):
    assets/audio/sfx/<id>.wav            16-bit mono 22050 Hz (variants: <id>_1.wav, <id>_2.wav, ...)
    assets/audio/jingles/<id>.wav        16-bit stereo 22050 Hz
    assets/audio/ambience/<id>.wav       16-bit mono 22050 Hz, seamless loops (runtime widens to stereo)
    assets/audio/manifest.json           {music, sfx, jingles, ambience}
    assets/audio/README.md               every sound's intent and measured level, for auditing by ear

Mastering per sound: DC block, decimate 44.1k -> 22.05k (Kaiser window), trim silence, 2 ms fade-in /
5 ms fade-out, loudness-normalize to the group target, look-ahead peak limit, true peak <= -1 dBFS,
TPDF dither to 16 bit. Deterministic: seeds derive from the sound id.
"""
from __future__ import annotations

import argparse
import json
import sys
import time
import zlib
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent
NEXT = HERE.parent.parent
REPO = NEXT.parent
sys.path.insert(0, str(HERE))

import dsp  # noqa: E402

AUDIO = NEXT / "assets" / "audio"
SFX_SR = 22050
JINGLE_SR = 32000
JINGLE_KBPS = 160
AMB_SR = 22050
TP_CEIL = dsp.db(-1.0)          # true-peak ceiling
SAMPLE_CEIL = dsp.db(-1.4)      # limiter ceiling on samples, leaves room for inter-sample peaks

# Loudness targets. SFX: max K-weighted loudness over a 200 ms window (LUFS-like). Others: integrated.
GROUP_TARGET = {
    "ui": -19.0, "text": -25.0, "foot": -27.0, "field": -18.0, "story": -17.0,
    "weapon": -15.0, "impact": -14.0, "magic": -15.5, "status": -16.5, "big": -14.0, "loot": -16.0,
}
JINGLE_TARGET = -17.0     # integrated; music is normalized to -16, so jingles sit just under it
AMBIENCE_TARGET = -22.0   # integrated; a bed about 11 dB under the music at default sliders
MUSIC_TARGET = -16.0      # integrated; manifest volume brings each track here

MUSIC_IDS = ["title", "willowmere", "valley", "archive", "battle", "boss_archivore", "mystery", "sorrow",
             "triumph", "victory", "gameover",
             # Episode 2 (composed in tools/music/songs/)
             "hollow", "hollowmere", "fading_road", "court", "boss_king"]
LEGACY_MUSIC = {
    "title": "../assets/audio/title.mp3",
    "willowmere": "../assets/audio/town.mp3",
    "valley": "../assets/audio/region-1.mp3",
    "battle": "../assets/audio/battle.mp3",
    "boss_archivore": "../assets/audio/boss.mp3",
}
# What plays when a cue has no file yet. null = silence (ambience carries the scene).
MUSIC_FALLBACK = {
    "title": None, "willowmere": None, "valley": "willowmere", "archive": None, "battle": None,
    "boss_archivore": "battle", "mystery": None, "sorrow": None, "triumph": "title", "victory": None,
    "gameover": None,
    "hollow": "willowmere", "hollowmere": "hollow", "fading_road": "valley", "court": "archive",
    "boss_king": "boss_archivore",
}


def seed_of(name: str, v: int = 0) -> int:
    return (zlib.crc32(name.encode()) + 7919 * v) & 0x7FFFFFFF


def master(y: np.ndarray, sr_in: int, sr_out: int, target: float, mode: str, tail_db: float = -60.0,
           trim: bool = True, fin: float = 0.002, fout: float = 0.005):
    """Shared mastering chain. Returns (signal, info)."""
    y = dsp.dc_block(y, sr_in, 18.0)
    y = dsp.resample(y, sr_in, sr_out)
    if trim:
        y = dsp.trim_head(y, sr_out, -62.0)
        y = dsp.trim_tail(y, sr_out, tail_db, pad=0.012)
    y = dsp.fade(y, sr_out, fin, fout)
    L0 = dsp.lufs_window_max(y, sr_out) if mode == "window" else dsp.lufs_integrated(y, sr_out)
    y = y * dsp.db(target - L0)
    pk_before = float(np.max(np.abs(y)))
    y = dsp.limiter(y, sr_out, SAMPLE_CEIL)
    tp = dsp.true_peak(y)
    if tp > TP_CEIL:
        y = y * (TP_CEIL / tp) * 0.995
    y = y - np.mean(y, axis=0)  # remove any residual DC
    y = dsp.fade(y, sr_out, 0.0005, 0.003)
    L1 = dsp.lufs_window_max(y, sr_out) if mode == "window" else dsp.lufs_integrated(y, sr_out)
    # Small-speaker translation: loudness through a phone-like band (300 Hz .. 8 kHz).
    ph = dsp.butter(dsp.butter(y, "high", 300, sr_out, 4), "low", min(8000, sr_out * 0.45), sr_out, 2)
    Lp = dsp.lufs_window_max(ph, sr_out) if mode == "window" else dsp.lufs_integrated(ph, sr_out)
    info = dict(
        phone_db=round(Lp - L1, 1),
        duration=round(len(y) / sr_out, 3),
        lufs=round(L1, 1),
        target=target,
        peak_db=round(dsp.to_db(dsp.true_peak(y)), 2),
        limited_db=round(max(0.0, dsp.to_db(pk_before / SAMPLE_CEIL)), 1),
    )
    return y, info


# ----------------------------------------------------------------------------- SFX
def build_sfx(only=None, quiet=False):
    import sfx_defs
    out = {}
    (AUDIO / "sfx").mkdir(parents=True, exist_ok=True)
    for id_, r in sfx_defs.REG.items():
        if only and id_ not in only:
            continue
        files, infos = [], []
        for v in range(r["variants"]):
            g = dsp.rng(seed_of(id_, v))
            y = r["fn"](g, v)
            target = r["target"] if r["target"] is not None else GROUP_TARGET[r["group"]]
            y, info = master(y, dsp.RENDER_SR, SFX_SR, target, "window", r["tail_db"])
            name = f"{id_}.wav" if r["variants"] == 1 else f"{id_}_{v + 1}.wav"
            dsp.write_wav(AUDIO / "sfx" / name, y, SFX_SR, seed=seed_of(id_, v))
            files.append(f"assets/audio/sfx/{name}")
            infos.append(info)
        out[id_] = (files, infos)
        if not quiet:
            i0 = infos[0]
            lim = f"  LIMITED {i0['limited_db']} dB" if i0["limited_db"] > 3 else ""
            ph = f"  PHONE {i0['phone_db']:+.1f} dB" if i0["phone_db"] < -6 else ""
            print(f"  sfx {id_:20s} x{len(files)} {i0['duration']*1000:6.0f} ms  L {i0['lufs']:6.1f} (t {i0['target']})  tp {i0['peak_db']:6.2f}{lim}{ph}")
    return out


# ----------------------------------------------------------------------------- jingles
def build_jingles(only=None, quiet=False):
    """Jingles ship as stereo 32 kHz MP3 (160 kbps): a WAV set would be ~3.5 MB, the MP3 set ~0.7 MB.
    They never loop, so MP3 encoder padding (a few ms) is harmless. 16-bit WAV masters are kept in
    tools/audio/out/jingles_wav/ for review."""
    import jingles
    import tracker
    out = {}
    (AUDIO / "jingles").mkdir(parents=True, exist_ok=True)
    wav_dir = HERE / "out" / "jingles_wav"
    for id_, r in jingles.REG.items():
        if only and id_ not in only:
            continue
        y = r["fn"]()  # stereo at RENDER_SR
        end = tracker.song_end(r["song"]()) + r["keep"]
        n = min(len(y), dsp.ns(end))
        y = y[:n].copy()
        k = dsp.ns(r["keep"] * 0.75)
        y[n - k:] = (y[n - k:].T * np.cos(np.linspace(0, np.pi / 2, k)) ** 2).T
        y, info = master(y, dsp.RENDER_SR, JINGLE_SR, (r.get("target") or JINGLE_TARGET) + 0.5, "integrated",
                         trim=False, fin=0.001, fout=0.0)
        y = y * dsp.db(-0.4)  # headroom for MP3 inter-sample overs
        dsp.write_wav(wav_dir / f"{id_}.wav", y, JINGLE_SR, seed=seed_of(id_))
        name = f"{id_}.mp3"
        dsp.write_mp3(AUDIO / "jingles" / name, y, JINGLE_SR, JINGLE_KBPS, seed=seed_of(id_))
        z, zsr = dsp.read_audio(AUDIO / "jingles" / name)
        info = dict(info, duration=round(len(z) / zsr, 3), peak_db=round(dsp.to_db(dsp.true_peak(z)), 2),
                    lufs=round(dsp.lufs_integrated(z, zsr), 1))
        out[id_] = ([f"assets/audio/jingles/{name}"], [info])
        if not quiet:
            lim = f"  LIMITED {info['limited_db']} dB" if info["limited_db"] > 3 else ""
            print(f"  jingle {id_:16s} {info['duration']:5.2f} s  L {info['lufs']:6.1f}  tp {info['peak_db']:6.2f}  {(AUDIO / 'jingles' / name).stat().st_size // 1024} KB{lim}")
    return out


# ----------------------------------------------------------------------------- ambience
def build_ambience(only=None, quiet=False):
    import ambience
    out = {}
    (AUDIO / "ambience").mkdir(parents=True, exist_ok=True)
    for id_, r in ambience.REG.items():
        if only and id_ not in only:
            continue
        y = r["fn"]()  # mono at AMB render rate, already seamless (circular)
        sr_in = r.get("sr", dsp.RENDER_SR)
        # Loops: no trimming, no fades (the loop must stay seamless); resample circularly.
        y = dsp.dc_block(np.concatenate([y, y, y]), sr_in, 18.0)[len(y): 2 * len(y)]
        osr = r.get("out_sr", AMB_SR)
        z = dsp.resample(np.concatenate([y, y, y]), sr_in, osr)
        n = len(z) // 3
        y = z[n: 2 * n]
        L0 = dsp.lufs_integrated(np.concatenate([y, y]), osr)
        y = y * dsp.db(AMBIENCE_TARGET + r.get("trim_db", 0.0) - L0)
        tp = dsp.true_peak(y)
        if tp > TP_CEIL:
            y = y * TP_CEIL / tp * 0.99
        y = y - y.mean()
        name = f"{id_}.wav"
        dsp.write_wav(AUDIO / "ambience" / name, y, osr, seed=seed_of(id_))
        info = dict(duration=round(len(y) / osr, 3), lufs=round(dsp.lufs_integrated(np.concatenate([y, y]), osr), 1),
                    target=AMBIENCE_TARGET, peak_db=round(dsp.to_db(dsp.true_peak(y)), 2), limited_db=0.0,
                    seam=round(float(abs(y[0] - y[-1])), 4))
        out[id_] = ([f"assets/audio/ambience/{name}"], [info])
        if not quiet:
            print(f"  ambience {id_:14s} {info['duration']:5.2f} s  L {info['lufs']:6.1f}  tp {info['peak_db']:6.2f}  seam step {info['seam']}")
    return out


# ----------------------------------------------------------------------------- manifest
def wav_info(path: Path):
    import wave
    with wave.open(str(path), "rb") as w:
        return w.getnframes() / w.getframerate(), w.getframerate(), w.getnchannels()


def music_section(old: dict):
    levels_path = HERE / "music_levels.json"
    levels = json.loads(levels_path.read_text(encoding="utf-8")) if levels_path.exists() else {}
    sec = {}
    for id_ in MUSIC_IDS:
        prev = (old or {}).get(id_, {}) or {}
        e = {"src": None, "volume": 1.0, "loopStart": None, "loopEnd": None, "fallback": MUSIC_FALLBACK.get(id_)}
        own = AUDIO / "music" / f"{id_}.mp3"
        if own.exists():
            e["src"] = f"assets/audio/music/{id_}.mp3"
            side = AUDIO / "music" / f"{id_}.json"
            if side.exists():
                try:
                    meta = json.loads(side.read_text(encoding="utf-8"))
                    for k in ("loopStart", "loopEnd", "loop", "bpm", "key", "start"):
                        if k in meta:
                            e[k] = meta[k]
                except Exception as ex:  # noqa: BLE001
                    print("  WARN bad sidecar", side, ex)
        elif id_ in LEGACY_MUSIC and (NEXT / LEGACY_MUSIC[id_]).exists():
            e["src"] = LEGACY_MUSIC[id_]
        # keep hand-set loop points for an unchanged src
        if prev.get("src") == e["src"] and e["src"]:
            for k in ("loopStart", "loopEnd", "start", "loop"):
                if prev.get(k) is not None and e.get(k) is None:
                    e[k] = prev[k]
        if e["src"]:
            lv = levels.get(e["src"])
            if lv and lv.get("lufs") is not None:
                e["volume"] = round(float(min(1.25, max(0.2, dsp.db(MUSIC_TARGET - lv["lufs"])))), 3)
                e["measuredLufs"] = lv["lufs"]
                e["duration"] = lv.get("duration")
                # loop points found by music_scan.py, unless the track ships its own (sidecar) or they were hand-set
                if e.get("loopEnd") is None and lv.get("loopEnd") is not None:
                    e["loopStart"] = lv.get("loopStart", 0.0)
                    e["loopEnd"] = lv["loopEnd"]
                    e["loopNote"] = {"trimmed": "whole track, trailing silence/fade skipped",
                                     "matched": "matched repeat found by music_scan.py"}.get(lv.get("loopKind"), lv.get("loopKind"))
        sec[id_] = e
    sec["_doc"] = ("src null = no file yet; the runtime then plays `fallback` (another music id) or silence when "
                   "fallback is null. volume brings the track to about -16 LUFS. loopStart/loopEnd in seconds "
                   "(null = loop the whole file). Files dropped at assets/audio/music/<id>.mp3 (+ <id>.json with "
                   "loopStart/loopEnd) win over the legacy root tracks after `python tools/audio/build.py --manifest`.")
    return sec


def write_manifest(results: dict):
    import sfx_defs
    try:
        import jingles
        JREG = jingles.REG
    except Exception:  # noqa: BLE001
        JREG = {}
    try:
        import ambience
        AREG = ambience.REG
    except Exception:  # noqa: BLE001
        AREG = {}
    path = AUDIO / "manifest.json"
    old = json.loads(path.read_text(encoding="utf-8")) if path.exists() else {}
    man = {
        "version": 1,
        "generatedBy": "python tools/audio/build.py (W1-audio). Edit the generators, not this file.",
        "music": music_section(old.get("music", {})),
        "sfx": {},
        "jingles": {},
        "ambience": {},
    }

    def files_for(kind, id_, variants):
        if variants == 1:
            return [f"assets/audio/{kind}/{id_}.wav"]
        return [f"assets/audio/{kind}/{id_}_{i + 1}.wav" for i in range(variants)]

    for id_, r in sfx_defs.REG.items():
        files = files_for("sfx", id_, r["variants"])
        if not all((NEXT / f).exists() for f in files):
            continue
        dur = max(wav_info(NEXT / f)[0] for f in files)
        e = {"src": files if len(files) > 1 else files[0], "volume": 1.0, "duration": round(dur, 3), "group": r["group"]}
        if r["vary"]:
            e["vary"] = r["vary"]
        if r["max_voices"]:
            e["maxVoices"] = r["max_voices"]
        if r["cooldown"] is not None:
            e["cooldown"] = r["cooldown"]
        man["sfx"][id_] = e
    if "text_blip_mid" in man["sfx"]:
        man["sfx"]["text_blip"] = {"alias": "text_blip_mid"}
    for id_, r in JREG.items():
        f = f"assets/audio/jingles/{id_}.mp3"
        if (NEXT / f).exists():
            z, zsr = dsp.read_audio(NEXT / f)
            man["jingles"][id_] = {"src": f, "volume": 1.0, "duration": round(len(z) / zsr, 3)}
    for id_, r in AREG.items():
        f = f"assets/audio/ambience/{id_}.wav"
        if (NEXT / f).exists():
            man["ambience"][id_] = {"src": f, "volume": 1.0, "duration": round(wav_info(NEXT / f)[0], 3), "widen": True}
    path.write_text(json.dumps(man, indent=1) + "\n", encoding="utf-8")
    stats_path = HERE / "out" / "build_stats.json"
    stats_path.parent.mkdir(parents=True, exist_ok=True)
    prev_stats = json.loads(stats_path.read_text(encoding="utf-8")) if stats_path.exists() else {}
    for kind, res in results.items():
        for id_, (files, infos) in res.items():
            prev_stats[f"{kind}:{id_}"] = infos[0]
    stats_path.write_text(json.dumps(prev_stats, indent=1), encoding="utf-8")
    return man, prev_stats


def total_size():
    tot = 0
    for sub in ("sfx", "jingles", "ambience"):
        for p in list((AUDIO / sub).glob("*.wav")) + list((AUDIO / sub).glob("*.mp3")):
            tot += p.stat().st_size
    return tot


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--sfx", action="store_true")
    ap.add_argument("--jingles", action="store_true")
    ap.add_argument("--ambience", action="store_true")
    ap.add_argument("--manifest", action="store_true")
    ap.add_argument("--only", default=None)
    ap.add_argument("--quiet", action="store_true")
    a = ap.parse_args()
    every = not (a.sfx or a.jingles or a.ambience or a.manifest)
    only = set(a.only.split(",")) if a.only else None
    t0 = time.time()
    results = {}
    if every or a.sfx:
        results["sfx"] = build_sfx(only, a.quiet)
    if every or a.jingles:
        results["jingles"] = build_jingles(only, a.quiet)
    if every or a.ambience:
        results["ambience"] = build_ambience(only, a.quiet)
    man, stats = write_manifest(results)
    import readme
    readme.write(man, stats)
    print(f"manifest: {len(man['sfx'])} sfx, {len(man['jingles'])} jingles, {len(man['ambience'])} ambience;"
          f" total {total_size() / 1e6:.2f} MB; {time.time() - t0:.1f} s")


if __name__ == "__main__":
    main()
