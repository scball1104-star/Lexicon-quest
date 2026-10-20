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
sprites, tiles, ui, backdrops and icons folders (png and json), and the sfx and jingle audio. NOT precached
(stale-while-revalidate at runtime instead): music (../assets/audio/*.mp3, assets/audio/music), ambience and the
painted sheets (../assets/art/*.webp).
"""
import argparse
import gzip
import hashlib
import json
import pathlib
import re
import sys

NEXT = pathlib.Path(__file__).resolve().parents[2]
SW = NEXT / 'sw.js'
INDEX = NEXT / 'index.html'

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


def shell_files():
    out = [p for p in FIXED if (NEXT / p).is_file()]
    out += sorted(p.relative_to(NEXT).as_posix() for p in (NEXT / 'src').rglob('*.js'))
    for folder, exts in FOLDERS.items():
        d = NEXT / folder
        if d.is_dir():
            out += sorted(p.relative_to(NEXT).as_posix() for p in d.iterdir() if p.is_file() and p.suffix.lower() in exts)
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


def module_graph(entry='src/main.js'):
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
            if rel in seen:
                continue
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


def render_sw(text, files, version):
    a, b = text.index(SW_BEGIN), text.index(SW_END)
    lines = [SW_BEGIN, f"const SHELL_VERSION = '{version}';", 'const PRECACHE = [']
    lines += [f"  '{p}'," for p in files]
    lines += ['];', '']
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
    files = shell_files()
    version = shell_version(files)
    mods = module_graph()
    sw_old, html_old = SW.read_text(encoding='utf-8'), INDEX.read_text(encoding='utf-8')
    sw_new, html_new = render_sw(sw_old, files, version), render_index(html_old, mods)
    if args.sizes:
        g = sizes(files)
        print(f'{"group":<16}{"files":>6}{"raw KB":>10}{"gzip KB":>10}')
        for k, (n, raw, gz) in sorted(g.items()):
            print(f'{k:<16}{n:>6}{raw / 1024:>10.0f}{gz / 1024:>10.0f}')
        print(f'{"TOTAL":<16}{sum(v[0] for v in g.values()):>6}{sum(v[1] for v in g.values()) / 1024:>10.0f}{sum(v[2] for v in g.values()) / 1024:>10.0f}')
        return 0
    stale = [n for n, a, b in (('sw.js', sw_old, sw_new), ('index.html', html_old, html_new)) if a != b]
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
    print(f'version {version}: {len(files)} precache entries, {len(mods)} modules preloaded; wrote {", ".join(stale) or "nothing (already current)"}')
    return 0


if __name__ == '__main__':
    sys.exit(main())
