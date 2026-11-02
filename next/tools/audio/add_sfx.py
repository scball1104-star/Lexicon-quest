"""Bring a sound made outside the generators (a Runway / ElevenLabs Text to SFX MP3 on the Desktop) into the game as a
core-spec WAV (16-bit mono 22050 Hz, mastered to its group's level, fades) and register it for build.py.

    python tools/audio/add_sfx.py "<source.mp3>" <id> --group big --intent "..." --source "..." [--fit] [--max-dur S]
                                  [--start S] [--pack media] [--fallback ID] [--keep DIR] [--tail-db -54]

Two cases (docs/MEDIA_BUILD.md 4):
  * a swap of a generated core sound (the id is in sfx_defs.REG): the generated file is kept as <id>_synth.wav (manifest id
    <id>_synth, pack media, the fallback), the new file takes <id>.wav and, with --fit, is cut to stay AT OR UNDER the bytes of
    the file it replaces (the core set is precached); the pack stays core.
  * a new id (not in REG): lands in the lazy `media` pack (fetched after the title, runtime-cached, never precached) with the
    core --fallback it names, so old clients and the moment before the pack arrives still play something.
Then: python tools/audio/build.py --manifest   (rewrites manifest.json and README.md; node qa/run.mjs audio pwa).
Prints SFX_ADDED: <id> <bytes> (<old bytes>) <seconds> on success; the caller reads that back, not the exit code."""
import argparse, json, os, shutil, sys
from pathlib import Path
import numpy as np
HERE = Path(__file__).resolve().parent
NEXT = HERE.parent.parent
sys.path.insert(0, str(HERE))
import dsp  # noqa: E402
import build as B  # noqa: E402

REG_PATH = HERE / 'external_sfx.json'
SFX = NEXT / 'assets' / 'audio' / 'sfx'


def load_reg():
    return json.loads(REG_PATH.read_text(encoding='utf-8')) if REG_PATH.exists() else {'sfx': {}}


def save_reg(reg):
    REG_PATH.write_text(json.dumps(reg, indent=1) + '\n', encoding='utf-8')


def cut(y, sr, start, max_dur):
    if start > 0:
        y = y[int(start * sr):]
    if max_dur and len(y) > int(max_dur * sr):
        n = int(max_dur * sr)
        y = y[:n].copy()
        k = min(n // 4, int(0.08 * sr))          # a short fade so the cut never clicks
        if k > 1:
            y[-k:] *= np.linspace(1.0, 0.0, k)
    return y


def main(argv):
    ap = argparse.ArgumentParser()
    ap.add_argument('src'); ap.add_argument('id')
    ap.add_argument('--group', required=True, choices=sorted(B.GROUP_TARGET))
    ap.add_argument('--intent', default=''); ap.add_argument('--source', default='Runway, ElevenLabs Text to SFX')
    ap.add_argument('--fit', action='store_true', help='cut so the WAV stays at or under the bytes of the file it replaces')
    ap.add_argument('--max-dur', type=float, default=None); ap.add_argument('--start', type=float, default=0.0)
    ap.add_argument('--pack', default=None, help='core for a swap, media for a new id (the defaults)')
    ap.add_argument('--fallback', default=None, help='a core sfx id that plays while the pack is not here (new ids)')
    ap.add_argument('--target', type=float, default=None, help='LUFS (200 ms window max); default = the group target')
    ap.add_argument('--tail-db', type=float, default=-54.0)
    ap.add_argument('--keep', default=None, help='folder that keeps the untouched source (outside the repo)')
    a = ap.parse_args(argv)
    src = Path(a.src)
    if not src.is_file():
        print('missing', src); return 2
    import sfx_defs
    swap = a.id in sfx_defs.REG
    if swap and sfx_defs.REG[a.id]['variants'] != 1:
        print('a variant sound cannot be swapped by this tool'); return 2
    reg = load_reg()
    entry = reg['sfx'].get(a.id, {})
    dst = SFX / f'{a.id}.wav'
    synth = SFX / f'{a.id}_synth.wav'
    old_bytes = entry.get('replacedBytes')
    if swap and not synth.exists():
        # first swap: the file on disk IS the generated one (deterministic); keep it as the fallback
        shutil.copyfile(dst, synth)
        old_bytes = dst.stat().st_size
    elif swap and old_bytes is None:
        old_bytes = synth.stat().st_size
    y, sr = dsp.read_audio(src)
    y = dsp.mono(np.asarray(y, np.float64))
    y = dsp.dc_block(y, sr, 18.0)
    y = dsp.trim_head(y, sr, -50.0)
    target = a.target if a.target is not None else (sfx_defs.REG[a.id]['target'] if swap and sfx_defs.REG[a.id]['target'] is not None else B.GROUP_TARGET[a.group])
    max_dur = a.max_dur
    if a.fit and old_bytes:
        cap = (old_bytes - 44) / 2 / B.SFX_SR - 0.002
        max_dur = min(max_dur, cap) if max_dur else cap
    out, info = None, None
    for _ in range(12):
        out, info = B.master(cut(y, sr, a.start, max_dur), sr, B.SFX_SR, target, 'window', a.tail_db)
        if not (a.fit and old_bytes) or 44 + 2 * len(out) <= old_bytes:
            break
        max_dur = (max_dur or len(out) / B.SFX_SR) * 0.97
    dsp.write_wav(dst, out, B.SFX_SR, seed=B.seed_of(a.id))
    size = dst.stat().st_size
    if a.fit and old_bytes and size > old_bytes:
        print(f'SFX_TOO_BIG: {a.id} {size} > {old_bytes}'); return 3
    if a.keep:
        os.makedirs(a.keep, exist_ok=True)
        shutil.copy(src, os.path.join(a.keep, f'{a.id}_source{src.suffix.lower()}'))
    rec = {'src': f'assets/audio/sfx/{a.id}.wav', 'group': a.group, 'pack': a.pack or ('core' if swap else 'media'),
           'intent': a.intent or entry.get('intent', ''), 'source': a.source, 'seconds': info['duration'], 'lufs': info['lufs'],
           'bytes': size}
    if swap:
        rec['replaces'] = f'{a.id}_synth'; rec['replacedBytes'] = old_bytes
    elif a.fallback:
        rec['fallback'] = a.fallback
    reg['sfx'][a.id] = rec
    save_reg(reg)
    print(f"SFX_ADDED: {a.id} {size} ({old_bytes or 'new'}) {info['duration']} s  L {info['lufs']} (t {target})  tp {info['peak_db']}")
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
