"""Does a clean sprite build reproduce the committed atlases? (issue #61)

    python next/tools/art/sprites/check_repro.py           all steps but the SDF portraits, about 100 s
    python next/tools/art/sprites/check_repro.py --full    every step, about 4 minutes
    python next/tools/art/sprites/check_repro.py --strict  also fail when pixels match but the png bytes do not

Copies the sprite tools and the art they read into a temp folder, runs build_all.py there (so the repo is never
written), then compares every file the build wrote under next/assets/sprites and next/assets/ui with the repo's:
png by decoded RGBA pixels and by bytes, everything else by bytes. It compares with the files on disk, so on a
clean checkout that is what is committed.

Exit 0: every output matches (pixel-equal files whose bytes differ are listed as warnings).
Exit 1: some output differs: the file, the changed pixel count, the box they sit in and the atlas frames they hit.
Exit 2: the build itself failed or ran past its time limit.
The last line is always `SPRITE_REPRO: ok|differs|failed ...`.
"""
import argparse, json, os, shutil, subprocess, sys, tempfile, time

HERE = os.path.dirname(os.path.abspath(__file__))
NEXT = os.path.normpath(os.path.join(HERE, '..', '..', '..'))
REPO = os.path.normpath(os.path.join(NEXT, '..'))

# what build_all.py reads or writes, relative to the repo root (audio, qa and src are not needed)
COPY = ['next/tools/art', 'next/assets/sprites', 'next/assets/ui', 'next/assets/tiles', 'next/assets/backdrops',
        'next/assets/palette.json', 'next/assets/palette.png', 'assets/art']
OUTPUTS = ['next/assets/sprites', 'next/assets/ui']
IGNORE = shutil.ignore_patterns('out', '__pycache__', '*.pyc', '*.log')


def snapshot(root):
    """{relative path: (size, mtime_ns)} of every file under the output folders"""
    snap = {}
    for rel in OUTPUTS:
        base = os.path.join(root, rel)
        for d, _, files in os.walk(base):
            for f in files:
                p = os.path.join(d, f)
                st = os.stat(p)
                snap[os.path.relpath(p, root).replace(os.sep, '/')] = (st.st_size, st.st_mtime_ns)
    return snap


def rgba(path):
    import numpy as np
    from PIL import Image
    with Image.open(path) as im:
        return np.asarray(im.convert('RGBA'))


def frames_hit(diff, meta_path):
    """atlas frame names whose rect holds a changed pixel -> count"""
    try:
        with open(meta_path, encoding='utf-8') as f:
            meta = json.load(f)
    except (OSError, ValueError):
        return {}
    hits = {}
    for k, r in (meta.get('frames') or {}).items():
        if isinstance(r, (list, tuple)) and len(r) >= 4:
            x, y, w, h = (int(v) for v in r[:4])
            n = int(diff[y:y + h, x:x + w].sum())
            if n:
                hits[k] = n
    return hits


def compare(rel, built, committed):
    """-> ('same' | 'bytes' | 'pixels' | 'new', detail)"""
    if not os.path.exists(committed):
        return 'new', 'not in the repo'
    with open(built, 'rb') as f:
        a = f.read()
    with open(committed, 'rb') as f:
        b = f.read()
    if a == b:
        return 'same', ''
    if not rel.endswith('.png'):
        return 'pixels', 'text differs (%d -> %d bytes)' % (len(b), len(a))
    import numpy as np
    A, B = rgba(committed), rgba(built)
    if A.shape != B.shape:
        return 'pixels', 'size %dx%d -> %dx%d' % (A.shape[1], A.shape[0], B.shape[1], B.shape[0])
    d = np.any(A != B, axis=2)
    if not d.any():
        return 'bytes', 'pixels equal, bytes differ (%d -> %d bytes)' % (len(b), len(a))
    ys, xs = np.nonzero(d)
    hits = frames_hit(d, committed[:-4] + '.json')
    top = ', '.join('%s %d' % kv for kv in sorted(hits.items(), key=lambda kv: -kv[1])[:12])
    more = ' (+%d more)' % (len(hits) - 12) if len(hits) > 12 else ''
    return 'pixels', ('%d px differ (max channel step %d) in x %d..%d, y %d..%d; frames: %s%s'
                      % (int(d.sum()), int(np.abs(A.astype(int) - B.astype(int)).max()),
                         xs.min(), xs.max(), ys.min(), ys.max(), top or 'none named', more))


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('--full', action='store_true', help='include the SDF portraits step (about 140 s more)')
    ap.add_argument('--strict', action='store_true', help='fail on byte-only differences too')
    ap.add_argument('--timeout', type=int, default=900, help='seconds before the build is stopped (default 900)')
    ap.add_argument('--keep', action='store_true', help='keep the temp folder and print its path')
    a = ap.parse_args(argv)
    t0 = time.time()
    tmp = tempfile.mkdtemp(prefix='lq_sprite_repro_')
    try:
        for rel in COPY:
            src, dst = os.path.join(REPO, rel), os.path.join(tmp, rel)
            if os.path.isdir(src):
                shutil.copytree(src, dst, ignore=IGNORE)
            elif os.path.exists(src):
                os.makedirs(os.path.dirname(dst), exist_ok=True)
                shutil.copy2(src, dst)
        before = snapshot(tmp)
        cmd = [sys.executable, os.path.join(tmp, 'next', 'tools', 'art', 'sprites', 'build_all.py')]
        if not a.full:
            cmd += ['--skip', 'portraits']
        print('building in %s%s' % (tmp, '' if a.full else ' (portraits skipped: --full to include)'), flush=True)
        try:
            r = subprocess.run(cmd, cwd=os.path.join(tmp, 'next', 'tools', 'art', 'sprites'), capture_output=True,
                               text=True, timeout=a.timeout)
        except subprocess.TimeoutExpired:
            print('SPRITE_REPRO: failed build ran past %d s' % a.timeout)
            return 2
        if r.returncode != 0:
            sys.stdout.write(r.stdout[-3000:])
            sys.stdout.write(r.stderr[-3000:])
            print('SPRITE_REPRO: failed build exit %d' % r.returncode)
            return 2
        after = snapshot(tmp)
        written = sorted(p for p in after if before.get(p) != after[p])
        res = {'same': [], 'bytes': [], 'pixels': [], 'new': []}
        for rel in written:
            kind, detail = compare(rel, os.path.join(tmp, rel), os.path.join(REPO, rel))
            res[kind].append((rel, detail))
        for rel, detail in res['pixels'] + res['new']:
            print('DIFFERS  %s: %s' % (rel, detail))
        for rel, detail in res['bytes']:
            print('%s  %s: %s' % ('DIFFERS' if a.strict else 'warning', rel, detail))
        el = time.time() - t0
        print('%d files written: %d identical, %d pixel-equal with other bytes, %d differ, %d new (%.0f s)'
              % (len(written), len(res['same']), len(res['bytes']), len(res['pixels']), len(res['new']), el))
        bad = res['pixels'] + res['new'] + (res['bytes'] if a.strict else [])
        if bad:
            print('SPRITE_REPRO: differs %d file(s) %.0fs' % (len(bad), el))
            return 1
        print('SPRITE_REPRO: ok %d files %.0fs' % (len(written), el))
        return 0
    finally:
        if a.keep:
            print('kept %s' % tmp)
        else:
            shutil.rmtree(tmp, ignore_errors=True)


if __name__ == '__main__':
    sys.exit(main())
