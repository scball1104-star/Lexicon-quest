"""W12 Episode 2 art pass: before / after / Episode 1 reference renders for the four items of
docs/briefs/W12-ep2-art.md (CRITIQUE_4 items 5, 9, 15 and 6).

Boots the real game (like qa/shots.py: one headless Chromium, one page per view, a watchdog), drives each view's
steps, saves the full frame to next/qa/integrate/out/w12/<tag>_<device>_<view>.png and, per item, one mosaic of the
views' crops at the device's own pixels:

    next/qa/integrate/out/w12_<item>_<tag>_<device>.png         (tag = before | after | ref)

then `sheet` puts before, after and the Episode 1 reference side by side per device:

    next/qa/integrate/out/w12_<item>_sheet.png

  python next/qa/integrate/w12_art.py render portraits --tag before --device desktop,phone
  python next/qa/integrate/w12_art.py render selves --tag ref
  python next/qa/integrate/w12_art.py sheet portraits

Items: portraits (the five Episode 2 dialogue portraits), selves (the Other Selves on the stage), king (the
Nameless King veiled and unmasked), court (each Court room's north wall). The `ref` tag renders the Episode 1
reference views of the item (Mael, Garrick, Hob and Pip speaking; the party and the Archivore on the stage; the
Archive's rooms).
"""
import argparse
import json
import pathlib
import sys
import time

HERE = pathlib.Path(__file__).resolve().parent
QA = HERE.parent
sys.path.insert(0, str(QA))
from shots import start_server, watchdog, run_step  # noqa: E402

OUT = HERE / 'out'
RAW = OUT / 'w12'
SPEC = json.loads((QA / 'shots.json').read_text(encoding='utf-8'))
DEVICES = {k: SPEC['devices'][k] for k in ('desktop', 'phone')}

READY = {'waitFor': "LQ_DEBUG.engine.hasScene('field') && LQ_DEBUG.commands().includes('newGameEp2')", 'timeout': 20000}
NEW2 = {'call': 'newGameEp2', 'args': ['Arden', {'scene': 'none'}]}


def flags_step(names):
    return {'eval': "(async () => { const g = LQ_ENGINE.game; for (const f of " + json.dumps(names) + ") g.flags[f] = true; "
            "const { BARKS } = await import('./src/data/text.js'); for (const k of Object.keys(BARKS)) g.counters['bark:' + k] = 1; return true; })()"}


def shot_steps(name):
    for s in SPEC['shots']:
        if s['name'] == name:
            return list(s['steps'])
    raise KeyError(name)


HOLLOW = ['ep2_morning_done', 'ep2_started', 'east_road_arrived', 'saw_court', 'nh_arrived', 'met_elian', 'heard_crisis',
          'met_anwen']
COURT = HOLLOW + ['testimony_tovin', 'court_ferry_open', 'court_entered', 'court_f1_arrived']

# portrait views: (portrait id, speaker name, a canon line from docs/story/EPISODE2.md or the Episode 1 script)
PORTRAITS = [
    ('elian', 'Elian', 'We remember each other. We simply cannot remember where we are.'),
    ('anwen', 'Sister Anwen', 'A name is a promise, not a title.'),
    ('tovin', 'Tovin', 'Nobody rows to the Court. The Court keeps what it takes.'),
    ('lena', 'Lena', 'Our clocks strike at midnight, but the tower has no hands.'),
    ('aurel', 'Aurel', 'I traded my name for theirs.'),
]
PORTRAITS_REF = [
    ('mael', 'Elder Mael', 'Ah, there you are. Did you sleep through the bell again?'),
    ('garrick', 'Garrick', 'They say the Hollow has a glass smith. Glass. Hm.'),
    ('hob', 'Hob', 'Off on an adventure? Sleep first. Nobody ever saved the world on no sleep.'),
    ('pip', 'Pip', 'Your Sister Anwen says the same words my grandmother did?'),
]
DIALOG_CROP = [0, 148, 250, 68]      # the portrait, the name tab and the first words of the line


def portrait_views(rows):
    views = []
    for pid, name, text in rows:
        steps = [READY, NEW2, flags_step(HOLLOW), {'call': 'warp', 'args': ['nameless_hollow', 21, 21, 'up'], 'timeout': 20000},
                 {'frames': 90},
                 {'eval': "(() => { LQ_DEBUG.push('dialog', " + json.dumps({'name': name, 'portrait': pid, 'text': text, 'instant': True})
                  + "); return LQ_DEBUG.scene(); })()"},
                 {'frames': 30}]
        views.append((pid, steps, [DIALOG_CROP]))
    return views


def battle_view(name, enc, seed, until, crop, extra=None):
    steps = [{'eval': 'LQ_DEBUG.setSpeed(0)'}, {'call': 'battle', 'args': [enc, {'fresh': True, 'seed': seed}]}, {'advance': 60}]
    if until:
        steps.append({'call': 'battleUntil', 'args': [until]})
    steps += [{'eval': "(() => { for (let i = 0; i < 4000; i++) { const b = LQ_DEBUG.state().battle; if (b && b.menu !== 'closed' && !b.fast) return i; LQ_DEBUG.advance(5); } return -1; })()"},
              {'advance': 30}]
    steps += extra or []
    return (name, steps, crop)


FULL = [0, 0, 384, 216]


def field_view(name, map_id, x, y, d, flags, crop=None, frames=200):
    steps = [READY, NEW2, flags_step(flags), {'call': 'warp', 'args': [map_id, x, y, d], 'timeout': 20000}, {'frames': frames}]
    return (name, steps, [crop or FULL])


ITEMS = {
    'portraits': {
        'before': lambda: portrait_views(PORTRAITS), 'after': lambda: portrait_views(PORTRAITS),
        'ref': lambda: portrait_views(PORTRAITS_REF),
    },
    'selves': {
        'before': lambda: [battle_view('other_selves', 'other_selves', 1, 'mirror', [FULL])],
        'after': lambda: [battle_view('other_selves', 'other_selves', 1, 'mirror', [FULL])],
        # Episode 1: the party on the stage (the silhouettes the reflections must echo) against the Archivore
        'ref': lambda: [battle_view('boss', 'archivore', 2, 'telegraph', [FULL])],
    },
    'king': {
        'before': lambda: [battle_view('veiled', 'nameless_king', 3, None, [FULL]),
                           battle_view('unmasked', 'nameless_king', 3, 'phase3', [FULL])],
        'after': lambda: [battle_view('veiled', 'nameless_king', 3, None, [FULL]),
                          battle_view('unmasked', 'nameless_king', 3, 'phase3', [FULL])],
        'ref': lambda: [battle_view('boss', 'archivore', 2, 'telegraph', [FULL])],
    },
    'court': {
        'before': lambda: COURT_VIEWS, 'after': lambda: COURT_VIEWS,
        'ref': lambda: [field_view('archive_f1', 'archive_f1', 15, 22, 'up', [], crop=WALL_CROP),
                        field_view('archive_f2', 'archive_f2', 15, 20, 'up', [], crop=WALL_CROP),
                        field_view('archive_f3', 'archive_f3', 15, 20, 'up', [], crop=WALL_CROP)],
    },
}

F2 = COURT + ['mira_memory_1', 'silverglass_lock_lit', 'silverglass_lock_seen', 'court_f1_done', 'court_f2_arrived']
F3 = F2 + ['portraits_started', 'mira_memory_2', 'vex_met', 'other_selves_defeated', 'court_f2_done', 'court_f3_arrived']
THRONE = F3 + ['vow_belonging', 'vow_belonging_seen', 'vow_mercy', 'vow_mercy_seen', 'vow_courage', 'vow_courage_seen',
               'mira_memory_3', 'vow_door_open']
COURT_VIEWS = []        # filled by court_views()
# one view per Court room: the leader stands a few tiles under the room's north wall (tools/maps/previews/court_*.png)
ROOMS = [
    ('f1_entry', 'court_f1', 19, 26, 'up', COURT), ('f1_teach', 'court_f1', 18, 19, 'up', COURT),
    ('f1_center', 'court_f1', 16, 13, 'up', COURT), ('f1_nw', 'court_f1', 6, 6, 'up', COURT),
    ('f1_ne', 'court_f1', 33, 6, 'up', COURT), ('f1_east', 'court_f1', 33, 19, 'up', COURT),
    ('f2_north', 'court_f2', 19, 5, 'up', F2), ('f2_south', 'court_f2', 12, 23, 'up', F2),
    ('f3_west', 'court_f3', 8, 8, 'up', F3), ('f3_north', 'court_f3', 22, 8, 'up', F3),
    ('f3_east', 'court_f3', 36, 8, 'up', F3), ('f3_hall', 'court_f3', 21, 19, 'up', F3),
    ('f3_south', 'court_f3', 16, 28, 'up', F3), ('throne', 'court_throne', 7, 8, 'up', THRONE),
]
WALL_CROP = FULL                     # the whole frame: the camera clamps at map edges, so the wall is not always on top


def court_views():
    return [field_view(n, m, x, y, d, f, crop=WALL_CROP) for (n, m, x, y, d, f) in ROOMS]


def to_device_crop(view, dpr, g):
    """game rect -> screenshot pixel rect"""
    s = view['cssScale'] * dpr
    x0 = (view['cssX'] + g[0] * view['cssScale']) * dpr
    y0 = (view['cssY'] + g[1] * view['cssScale']) * dpr
    return (int(round(x0)), int(round(y0)), int(round(x0 + g[2] * s)), int(round(y0 + g[3] * s)))


def render(item, tag, devices, timeout):
    from playwright.sync_api import sync_playwright
    from PIL import Image
    if item == 'court':
        ITEMS['court']['before'] = ITEMS['court']['after'] = court_views
    views = ITEMS[item][tag]()
    RAW.mkdir(parents=True, exist_ok=True)
    watchdog(timeout)
    server = start_server()
    base = f'http://127.0.0.1:{server.server_port}/next/index.html?debug=1&fps=0'
    errors = []
    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True, args=['--autoplay-policy=no-user-gesture-required'])
        for dname in devices:
            dev = DEVICES[dname]
            ctx = browser.new_context(viewport={'width': dev['width'], 'height': dev['height']}, device_scale_factor=dev.get('dpr', 1),
                                      is_mobile=dev.get('mobile', False), has_touch=dev.get('touch', False), reduced_motion='no-preference')
            ctx.set_default_timeout(20000)
            crops = []
            for vname, steps, rects in views:
                page = ctx.new_page()
                page.add_init_script('(() => { try { localStorage.clear(); } catch (e) {} })()')
                page.on('console', lambda m, v=vname: errors.append(f'{dname}/{v}: {m.text}') if m.type == 'error' else None)
                page.on('pageerror', lambda e, v=vname: errors.append(f'{dname}/{v}: {e}'))
                t0 = time.time()
                page.goto(base, wait_until='load')
                page.wait_for_function('window.LQ_DEBUG && true', timeout=15000)
                page.evaluate('LQ_DEBUG.ready()')
                sctx = {'device': dname, 'name': vname, 'files': [], 'zooms': [], 'touch': dev.get('touch', False),
                        'cdp': lambda p=page: p.context.new_cdp_session(p)}
                for st in steps:
                    run_step(page, st, sctx)
                page.wait_for_timeout(150)
                path = RAW / f'{tag}_{dname}_{item}_{vname}.png'
                page.screenshot(path=str(path))
                view = page.evaluate('LQ_DEBUG.view()')
                img = Image.open(path).convert('RGB')
                for g in rects:
                    crops.append((vname, img.crop(to_device_crop(view, dev.get('dpr', 1), g))))
                print(f'  {dname} {vname}: {time.time() - t0:.1f}s', flush=True)
                page.close()
            ctx.close()
            if item == 'court':
                # fourteen rooms: halve the device pixels so the mosaic stays viewable (the raw frames keep full size)
                crops = [(n, c.reduce(2)) for n, c in crops]
            mosaic(crops, cols=2 if item == 'court' else None).save(OUT / f'w12_{item}_{tag}_{dname}.png')
        browser.close()
    server.shutdown()
    if errors:
        print('console errors:', *errors[:10], sep='\n  ')
    return 1 if errors else 0


def mosaic(crops, cols=None, pad=8, bg=(20, 16, 30)):
    from PIL import Image
    if not crops:
        return Image.new('RGB', (8, 8), bg)
    w = max(c.width for _, c in crops)
    h = max(c.height for _, c in crops)
    cols = cols or (1 if w > 1200 else 2)
    rows = (len(crops) + cols - 1) // cols
    out = Image.new('RGB', (cols * (w + pad) + pad, rows * (h + pad) + pad), bg)
    for i, (_, c) in enumerate(crops):
        out.paste(c, (pad + (i % cols) * (w + pad), pad + (i // cols) * (h + pad)))
    return out


def sheet(item, scale_to=None):
    """before | after | Episode 1 reference, one row per device, labelled"""
    from PIL import Image, ImageDraw
    rows = []
    for dname in ('phone', 'desktop'):
        cells = []
        for tag in ('before', 'after', 'ref'):
            p = OUT / f'w12_{item}_{tag}_{dname}.png'
            if p.exists():
                cells.append((f'{tag.upper() if tag != "ref" else "EPISODE 1 REFERENCE"} ({dname})', Image.open(p).convert('RGB')))
        if cells:
            rows.append(cells)
    if not rows:
        print('nothing to compose for', item)
        return 1
    # normalise every cell to the same height per row (nearest, so pixels stay crisp)
    pad, lab = 16, 28
    built = []
    for cells in rows:
        h = scale_to or max(c.height for _, c in cells)
        rs = []
        for t, c in cells:
            k = h / c.height
            rs.append((t, c.resize((max(1, int(round(c.width * k))), h), Image.NEAREST)))
        built.append(rs)
    W = max(sum(c.width for _, c in rs) + pad * (len(rs) + 1) for rs in built)
    H = sum(rs[0][1].height + lab + pad for rs in built) + pad
    out = Image.new('RGB', (W, H), (34, 30, 46))
    d = ImageDraw.Draw(out)
    y = pad
    for rs in built:
        x = pad
        for t, c in rs:
            d.text((x, y + 6), t, fill=(240, 236, 220))
            out.paste(c, (x, y + lab))
            x += c.width + pad
        y += rs[0][1].height + lab + pad
    path = OUT / f'w12_{item}_sheet.png'
    out.save(path)
    print('wrote', path)
    return 0


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('cmd', choices=['render', 'sheet'])
    ap.add_argument('item', choices=sorted(ITEMS))
    ap.add_argument('--tag', default='after', choices=['before', 'after', 'ref'])
    ap.add_argument('--device', default='desktop,phone')
    ap.add_argument('--timeout', type=int, default=300)
    ap.add_argument('--height', type=int, default=None, help='sheet: scale every cell to this height')
    a = ap.parse_args()
    if a.cmd == 'sheet':
        return sheet(a.item, a.height)
    return render(a.item, a.tag, [d.strip() for d in a.device.split(',')], a.timeout)


if __name__ == '__main__':
    sys.exit(main())
