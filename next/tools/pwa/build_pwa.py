"""Regenerate the generated parts of the PWA: the service worker's precache list and version, and the
<link rel="modulepreload"> block in index.html (W6-pwa; see docs/PWA.md).

  python next/tools/pwa/build_pwa.py            rewrite next/sw.js (PRECACHE + SHELL_VERSION) and next/index.html
  python next/tools/pwa/build_pwa.py --check    change nothing; exit 1 when either file is stale (release gate)
  python next/tools/pwa/build_pwa.py --sizes    print the precache size table (raw and gzip -6, as GitHub Pages serves text)

Run it after ANY change to the shell (a module, a sprite sheet, an sfx, the manifest...) and before deploying.
SHELL_VERSION is a hash of every precached file's path and bytes, so browsers see a different sw.js, install the
new shell next to the old one and show "Update ready, restart to apply". Forget to run it and returning players
keep the old shell: `node next/qa/run.mjs` prints a warning, and `LQ_RELEASE=1 node next/qa/run.mjs pwa` fails.

What is precached: index.html, manifest.webmanifest, every src/**/*.js, assets/manifest.json, palette.json, the
sprites, tiles, ui, backdrops and icons folders (png and json), and the core sfx and the jingles. NOT precached
(stale-while-revalidate at runtime instead): the episode sfx packs (manifest sfx[].pack != core), music (../assets/audio/*.mp3, assets/audio/music), ambience and the
painted sheets (../assets/art/*.webp).

Expansion packs (docs/PWA_PACKS.md): the pack table is src/game/packs.js `PACKS` (read through node, mirrored into
tools/pwa/packs.json). Every file a pack owns (src/data/<id>/** except live.js, src/data/maps/<id>_*.js, assets/{tiles,sprites,ui,
backdrops}/<id>_* and <id>.png, assets/<id>_manifest.json) is left OUT of the precache and out of the modulepreload block; the list
of them is written to assets/pack_files.json, and sw.js gets a PACK_PATTERN so the service worker caches them at runtime
(stale-while-revalidate into lq-next-runtime-v1, which activation keeps, so a shell-only release never evicts a pack).
"""
import argparse
import gzip
import hashlib
import json
import pathlib
import re
import shutil
import subprocess
import sys

NEXT = pathlib.Path(__file__).resolve().parents[2]
SW = NEXT / 'sw.js'
INDEX = NEXT / 'index.html'
PACKS_JS = NEXT / 'src' / 'game' / 'packs.js'
PACKS_MIRROR = pathlib.Path(__file__).resolve().parent / 'packs.json'
PACK_FILES = NEXT / 'assets' / 'pack_files.json'
PACK_ASSET_DIRS = ('tiles', 'sprites', 'ui', 'backdrops')

FIXED = ['index.html', 'manifest.webmanifest', 'assets/manifest.json', 'assets/palette.json', 'assets/audio/manifest.json']
FOLDERS = {                                   # folder -> allowed suffixes
    'assets/icons': {'.png'},
    'assets/ui': {'.png', '.json'},
    'assets/ui/touch': {'.png'},
    'assets/tiles': {'.png', '.json'},
    'assets/sprites': {'.png', '.json'},
    'assets/backdrops': {'.png', '.json'},
    'assets/audio/sfx': {'.wav', '.mp3', '.ogg'},
    'assets/audio/jingles': {'.wav', '.mp3', '.ogg'},
}
SW_BEGIN, SW_END = '// build_pwa:begin', '// build_pwa:end'
HTML_BEGIN = '<!-- modulepreload:begin'
HTML_END = '<!-- modulepreload:end -->'
LITERAL = re.compile(r"""['"](\.{1,2}/[^'"\n]+?\.js)['"]""")


def audio_pack_files():
    """Sfx files the audio manifest puts in an episode pack (pack != 'core'). They are runtime-cached by the service
    worker when the engine first loads the pack, not precached, so the initial download stays inside its budget."""
    m = NEXT / 'assets' / 'audio' / 'manifest.json'
    if not m.is_file():
        return set()
    out = set()
    for e in json.loads(m.read_text(encoding='utf-8')).get('sfx', {}).values():
        if e.get('pack', 'core') != 'core':
            out.update(e['src'] if isinstance(e.get('src'), list) else [e.get('src')])
    return {p for p in out if p}


def load_packs(write=False):
    """The PACKS table of src/game/packs.js as {id: {entry, prefix, assets, audioPack, touches}}. Read through node (the table is
    the single source); tools/pwa/packs.json is the mirror used when node is missing. write=True refreshes the mirror."""
    table = None
    node = shutil.which('node')
    if node and PACKS_JS.is_file():
        script = ("import { PACKS } from %s; console.log(JSON.stringify(Object.fromEntries(Object.entries(PACKS).map(([k, v]) => "
                  "[k, { entry: v.entry, prefix: v.prefix, assets: v.assets, audioPack: v.audioPack, touches: v.touches }]))));"
                  % json.dumps(PACKS_JS.as_uri()))
        try:
            r = subprocess.run([node, '--input-type=module', '-e', script], capture_output=True, text=True, timeout=30)
            if r.returncode == 0:
                table = json.loads(r.stdout)
        except (OSError, ValueError, subprocess.TimeoutExpired):
            table = None
    if table is None:
        table = json.loads(PACKS_MIRROR.read_text(encoding='utf-8')) if PACKS_MIRROR.is_file() else {}
    elif write:
        text = json.dumps(table, indent=2) + '\n'
        if not PACKS_MIRROR.is_file() or PACKS_MIRROR.read_text(encoding='utf-8') != text:
            PACKS_MIRROR.write_text(text, encoding='utf-8', newline='\n')
    return table


def pack_of(rel, packs):
    """The pack id that owns the file `rel` (posix path under next/), or None. src/data/<id>/live.js is the one exception."""
    for pid, d in packs.items():
        pre = d['prefix']
        if rel == f'src/data/{pid}/live.js':
            continue
        if rel.startswith(f'src/data/{pid}/') or (rel.startswith(f'src/data/maps/{pre}') and rel.endswith('.js')):
            return pid
        if rel == f'assets/{pid}_manifest.json':
            return pid
        for folder in PACK_ASSET_DIRS:
            if rel.startswith(f'assets/{folder}/'):
                name = rel.rsplit('/', 1)[1]
                if name.startswith(pre) or name.rsplit('.', 1)[0] == pid:
                    return pid
    return None


def pack_file_lists(packs):
    """{id: [relative paths]}: every existing file each pack owns, sorted. Written to assets/pack_files.json."""
    out = {pid: [] for pid in packs}
    for root in (NEXT / 'src', NEXT / 'assets'):
        for p in root.rglob('*'):
            if not p.is_file():
                continue
            rel = p.relative_to(NEXT).as_posix()
            if '/out/' in rel or rel.endswith('.md') or rel == 'assets/pack_files.json':
                continue
            pid = pack_of(rel, packs)
            if pid:
                out[pid].append(rel)
    return {pid: sorted(v) for pid, v in out.items()}


def pack_pattern(packs):
    """Regex source (matched against the path under next/) of everything the service worker caches as a pack file."""
    alts = []
    for pid, d in packs.items():
        e = re.escape(pid)
        alts += [f'src/data/{e}/', f'src/data/maps/{re.escape(d["prefix"])}', f'assets/({"|".join(PACK_ASSET_DIRS)})/{e}(_|\\.)', f'assets/{e}_manifest\\.json']
    alts.append('assets/pack_files\\.json')
    return '^(' + '|'.join(alts) + ')'


def render_pack_files(packs):
    return json.dumps({'$comment': 'Generated by tools/pwa/build_pwa.py. Every file each expansion pack owns; none is precached. Do not edit.',
                       **pack_file_lists(packs)}, indent=1) + '\n'


def is_dev(rel):
    """src/scenes/_dev*.js: the dev title, test field, gallery and their UI. main.js imports them lazily for debug runs and
    ?scene=_dev... only, so they are neither precached nor preloaded (about 12 KB gzipped kept off a player's first load)."""
    return rel.startswith('src/scenes/_dev')


def shell_files():
    skip = audio_pack_files()
    packs = load_packs()
    out = [p for p in FIXED if (NEXT / p).is_file()]
    out += sorted(r for r in (p.relative_to(NEXT).as_posix() for p in (NEXT / 'src').rglob('*.js')) if not pack_of(r, packs) and not is_dev(r))
    for folder, exts in FOLDERS.items():
        d = NEXT / folder
        if d.is_dir():
            out += sorted(p.relative_to(NEXT).as_posix() for p in d.iterdir() if p.is_file() and p.suffix.lower() in exts and p.relative_to(NEXT).as_posix() not in skip and not pack_of(p.relative_to(NEXT).as_posix(), packs))
    return list(dict.fromkeys(out))


def file_bytes(p):
    """File contents for hashing. index.html is hashed without its generated modulepreload block (which depends on the
    other files, so including it would make the version chase its own tail). Line endings are normalised."""
    data = (NEXT / p).read_bytes()
    if p == 'index.html':
        t = data.decode('utf-8')
        if HTML_BEGIN in t and HTML_END in t:
            t = t[:t.index(HTML_BEGIN)] + t[t.index(HTML_END) + len(HTML_END):]
        data = t.replace('\r\n', '\n').encode('utf-8')
    return data


def shell_version(files):
    h = hashlib.sha1()
    for p in files:
        h.update(p.encode() + b'\0' + hashlib.sha1(file_bytes(p)).digest())
    return h.hexdigest()[:12]


def module_graph(entry='src/main.js', packs=None):
    """Modules reachable by quoted relative .js paths (static imports, import() and the scene registry table).
    main.js's own graph comes first (the first frame needs it), then the scene registry that assets/manifest.json
    lists under "scenes" and everything the scenes import."""
    seeds = [entry]
    try:
        reg = json.loads((NEXT / 'assets' / 'manifest.json').read_text(encoding='utf-8')).get('scenes')
        if reg:
            seeds.append(reg)
    except (OSError, ValueError):
        pass
    seen, order = set(), []
    for seed in seeds:
        queue = [seed]
        while queue:
            rel = queue.pop(0)
            if rel in seen or is_dev(rel) or (packs and pack_of(rel, packs)):
                continue                     # a pack file is never preloaded (it is fetched when the pack is wanted); nor a dev scene
            seen.add(rel)
            f = NEXT / rel
            if not f.is_file():
                continue
            order.append(rel)
            for m in LITERAL.findall(f.read_text(encoding='utf-8', errors='replace')):
                nxt = (f.parent / m).resolve()
                try:
                    queue.append(nxt.relative_to(NEXT).as_posix())
                except ValueError:
                    pass
    return order


def render_sw(text, files, version, pattern=None):
    a, b = text.index(SW_BEGIN), text.index(SW_END)
    lines = [SW_BEGIN, f"const SHELL_VERSION = '{version}';", 'const PRECACHE = [']
    lines += [f"  '{p}'," for p in files]
    lines += ['];', 'const PACK_PATTERN = ' + json.dumps(pattern or '^$') + ';', '']
    return text[:a] + '\n'.join(lines) + text[b:]


def render_index(text, mods):
    a = text.index(HTML_BEGIN)
    b = text.index(HTML_END) + len(HTML_END)
    block = [HTML_BEGIN + ' (generated by tools/pwa/build_pwa.py, do not edit by hand) -->']
    block += [f'<link rel="modulepreload" href="{m}">' for m in mods if m != 'src/main.js']
    block.append(HTML_END)
    return text[:a] + '\n'.join(block) + text[b:]


def sizes(files):
    groups = {}
    for p in files:
        data = (NEXT / p).read_bytes()
        if p.startswith('src/'): g = 'js modules'
        elif p.startswith('assets/audio/sfx'): g = 'sfx'
        elif p.startswith('assets/audio/jingles'): g = 'jingles'
        elif p.endswith('.json'): g = 'json'
        elif p.endswith('.png'): g = 'png art'
        else: g = 'html + manifest'
        raw = len(data)
        gz = len(gzip.compress(data, 6)) if p.endswith(('.js', '.json', '.html', '.webmanifest')) else raw
        r = groups.setdefault(g, [0, 0, 0])
        r[0] += 1; r[1] += raw; r[2] += gz
    return groups


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--check', action='store_true')
    ap.add_argument('--sizes', action='store_true')
    args = ap.parse_args()
    packs = load_packs(write=not args.check and not args.sizes)
    files = shell_files()
    version = shell_version(files)
    mods = module_graph(packs=packs)
    sw_old, html_old = SW.read_text(encoding='utf-8'), INDEX.read_text(encoding='utf-8')
    sw_new, html_new = render_sw(sw_old, files, version, pack_pattern(packs)), render_index(html_old, mods)
    pf_old = PACK_FILES.read_text(encoding='utf-8') if PACK_FILES.is_file() else ''
    pf_new = render_pack_files(packs)
    if args.sizes:
        g = sizes(files)
        print(f'{"group":<16}{"files":>6}{"raw KB":>10}{"gzip KB":>10}')
        for k, (n, raw, gz) in sorted(g.items()):
            print(f'{k:<16}{n:>6}{raw / 1024:>10.0f}{gz / 1024:>10.0f}')
        print(f'{"TOTAL":<16}{sum(v[0] for v in g.values()):>6}{sum(v[1] for v in g.values()) / 1024:>10.0f}{sum(v[2] for v in g.values()) / 1024:>10.0f}')
        for pid, lst in json.loads(pf_new).items():
            if pid.startswith('$'):
                continue
            raw = sum((NEXT / r).stat().st_size for r in lst)
            gz = sum(len(gzip.compress((NEXT / r).read_bytes(), 6)) if r.endswith(('.js', '.json')) else (NEXT / r).stat().st_size for r in lst)
            print(f'pack {pid:<11}{len(lst):>6}{raw / 1024:>10.0f}{gz / 1024:>10.0f}   (not precached)')
        return 0
    stale = [n for n, a, b in (('sw.js', sw_old, sw_new), ('index.html', html_old, html_new), ('assets/pack_files.json', pf_old, pf_new)) if a != b]
    if args.check:
        if stale:
            m = re.search(r"SHELL_VERSION = '([^']*)'", sw_old)
            print(f'STALE: {", ".join(stale)} (sw.js has version {m.group(1) if m else "?"}, files hash to {version}). '
                  f'Run: python next/tools/pwa/build_pwa.py')
            return 1
        print(f'PWA files are current (version {version}, {len(files)} precache entries, {len(mods)} preloaded modules)')
        return 0
    if 'sw.js' in stale: SW.write_text(sw_new, encoding='utf-8', newline='\n')
    if 'index.html' in stale: INDEX.write_text(html_new, encoding='utf-8', newline='\n')
    if 'assets/pack_files.json' in stale: PACK_FILES.write_text(pf_new, encoding='utf-8', newline='\n')
    print(f'version {version}: {len(files)} precache entries, {len(mods)} modules preloaded; wrote {", ".join(stale) or "nothing (already current)"}')
    return 0


if __name__ == '__main__':
    sys.exit(main())
