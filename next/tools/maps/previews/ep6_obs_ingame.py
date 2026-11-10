"""E6-maps-b previews, drawn by the real game: the Storm Observatory's three floors (every vane state), the Scribe's Eyrie and
the Cloud Library (before and after their flags). Loads each map with ?pack=ep6, sets the variant's flags, turns its vane
groups through LQ_DEBUG.turnVane(group, { force: true }) (the field's own wind system, the same call confirm on a vane
makes), and stitches the whole map from camera windows of the 384 x 216 screen, so the lanes, chevrons, vanes, posts, the
storm tint, the darkness and the lamp pools are exactly what the field draws. reduceMotion is on (no lightning, frame 0
streaks), so the images and the luma numbers are deterministic.

    python tools/maps/previews/ep6_obs_ingame.py                  # every variant
    python tools/maps/previews/ep6_obs_ingame.py ep6_obs_f3       # one map's variants

Writes tools/maps/previews/<variant>.png (2x), <variant>_x1.png, a <map>_states.png sheet per floor (every vane state, 1x)
and the 844 x 390 phone frame <variant>_phone.png round the variant's focus. Prints the mean luma (Rec. 709 on sRGB) of the
whole map and of its walkable floor cells, and for F3 the party's floor (the cells beside the arrival on the phone frame).
Fails on any console error.
"""
import base64
import io
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
NEXT = os.path.normpath(os.path.join(HERE, '..', '..', '..'))
sys.path.insert(0, os.path.join(NEXT, 'qa', 'world'))
import numpy as np                         # noqa: E402
from PIL import Image                      # noqa: E402
from fieldlab import Lab                   # noqa: E402

QUERY = '?scene=_devTitle&debug=1&fps=0&pack=ep6&dev=62'
FIELD = 'LQ_ENGINE.stack.find(s => s.name === "field")'
PARTY = ['ep6_started', 'mira_joined', 'bram_joined']

# variant name, map, (x, y) arrival, flags, turned groups, phone focus (tiles)
VARIANTS = [
    ('ep6_obs_f1', 'ep6_obs_f1', (21, 27), [], [], (21, 20)),
    ('ep6_obs_f1_a', 'ep6_obs_f1', (21, 27), [], ['a'], (30, 8)),
    ('ep6_obs_f1_b', 'ep6_obs_f1', (21, 27), [], ['b'], (10, 4)),
    ('ep6_obs_f1_ab', 'ep6_obs_f1', (21, 27), [], ['a', 'b'], (14, 6)),
    ('ep6_obs_f2', 'ep6_obs_f2', (6, 26), [], [], (8, 18)),
    ('ep6_obs_f2_a', 'ep6_obs_f2', (6, 26), [], ['a'], (12, 17)),
    ('ep6_obs_f2_b', 'ep6_obs_f2', (6, 26), [], ['b'], (18, 10)),
    ('ep6_obs_f2_c', 'ep6_obs_f2', (6, 26), [], ['c'], (31, 10)),
    ('ep6_obs_f2_ab', 'ep6_obs_f2', (6, 26), [], ['a', 'b'], (18, 10)),
    ('ep6_obs_f2_ac', 'ep6_obs_f2', (6, 26), [], ['a', 'c'], (31, 10)),
    ('ep6_obs_f2_bc', 'ep6_obs_f2', (6, 26), [], ['b', 'c'], (18, 10)),
    ('ep6_obs_f2_abc', 'ep6_obs_f2', (6, 26), [], ['a', 'b', 'c'], (31, 10)),
    ('ep6_obs_f3', 'ep6_obs_f3', (18, 35), [], [], (18, 33)),
    ('ep6_obs_f3_a', 'ep6_obs_f3', (18, 35), [], ['a'], (17, 21)),
    ('ep6_obs_f3_b', 'ep6_obs_f3', (18, 35), [], ['b'], (18, 9)),
    ('ep6_obs_f3_c', 'ep6_obs_f3', (18, 35), [], ['c'], (18, 9)),
    ('ep6_obs_f3_ab', 'ep6_obs_f3', (18, 35), [], ['a', 'b'], (18, 9)),
    ('ep6_obs_f3_ac', 'ep6_obs_f3', (18, 35), [], ['a', 'c'], (18, 9)),
    ('ep6_obs_f3_bc', 'ep6_obs_f3', (18, 35), [], ['b', 'c'], (18, 9)),
    ('ep6_obs_f3_abc', 'ep6_obs_f3', (18, 35), [], ['a', 'b', 'c'], (18, 9)),
    ('ep6_obs_f3_lit', 'ep6_obs_f3', (18, 35), ['aeris_came', 'pledge_anchor', 'pledge_listen', 'pledge_return', 'pippa_found'],
     ['a', 'b', 'c'], (20, 9)),
    ('ep6_obs_eyrie', 'ep6_obs_eyrie', (11, 18), [], [], (11, 10)),
    ('ep6_obs_eyrie_after', 'ep6_obs_eyrie', (11, 18), ['scribe_defeated', 'compass_restored'], [], (13, 6)),
    ('ep6_library', 'ep6_library', (10, 11), [], [], (10, 7)),
    ('ep6_library_after', 'ep6_library', (10, 11), ['compass_restored', 'library_reached', 'first_page_read'], [], (10, 7)),
]


def image(data):
    return Image.open(io.BytesIO(base64.b64decode(data.split(',', 1)[1]))).convert('RGB')


def luma(a):
    a = a.astype(np.float32) / 255.0
    return a[..., 0] * 0.2126 + a[..., 1] * 0.7152 + a[..., 2] * 0.0722


def stitch(lab):
    info = lab.run(f'(() => {{ const f = {FIELD}; return [f.map.w, f.map.h]; }})()')
    W, H = info
    out = Image.new('RGB', (W * 16, H * 16))
    xs = list(range(192, W * 16, 384 - 32)) + [W * 16 - 192]
    ys = list(range(108, H * 16, 216 - 32)) + [H * 16 - 108]
    for cy in ys:
        for cx in xs:
            cam = lab.run(f'(() => {{ const f = {FIELD}; f.camera.panTo({cx}, {cy}, 0); return true; }})()')
            lab.frames(2)
            pair = lab.run(f'(() => {{ const f = {FIELD}; return [LQ_ENGINE.renderer.canvas.toDataURL("image/png"), f.camera.x, f.camera.y]; }})()')
            im = image(pair[0])
            out.paste(im, (int(round(pair[1])), int(round(pair[2]))))
    lab.run(f'(() => {{ const f = {FIELD}; f.camera.returnTo(f.leader, 0); return true; }})()')
    lab.frames(2)
    return out


def phone(img, fx, fy):
    W, H = img.size
    x0 = max(0, min(W - 384, fx * 16 + 8 - 192)) if W > 384 else 0
    y0 = max(0, min(H - 216, fy * 16 + 8 - 108)) if H > 216 else 0
    win = Image.new('RGB', (384, 216), (20, 16, 30))
    win.paste(img.crop((x0, y0, min(W, x0 + 384), min(H, y0 + 216))), (0, 0))
    s = 390 / 216
    pw = int(round(384 * s))
    frame = Image.new('RGB', (844, 390), (0, 0, 0))
    frame.paste(win.resize((pw, 390), Image.NEAREST), ((844 - pw) // 2, 0))
    return frame, (x0, y0)


def floor_mask(mp, W, H):
    walls = set('#|ovcd')
    m = np.zeros((H * 16, W * 16), bool)
    for y, row in enumerate(mp['ground']):
        for x, ch in enumerate(row):
            if ch not in walls:
                m[y * 16:(y + 1) * 16, x * 16:(x + 1) * 16] = True
    return m


def main(argv):
    only = [a for a in argv[1:] if not a.startswith('--')]
    todo = [v for v in VARIANTS if not only or v[1] in only or v[0] in only]
    lab = Lab(device='desktop')
    results = {}
    sheets = {}
    code = 0
    try:
        lab.open(QUERY)
        lab.page.wait_for_function('window.LQ_EP6 && true', timeout=90000)
        lab.run('LQ_ENGINE.settings.reduceMotion = true')
        # confirm any box (a first-time bark such as the dark-map line) so the stitched frames show the field alone
        lab.run('window.__lqAuto && clearInterval(window.__lqAuto); window.__lqAuto = setInterval(() => { const s = LQ_DEBUG.scene(); '
                'if (s === "dialog" || s === "choice" || s === "titleCard") LQ_DEBUG.press("confirm", 1); }, 60)')
        mods = {}
        for name, map_id, (x, y), flags, groups, focus in todo:
            lab.run('(() => { const g = LQ_ENGINE.game; if (g && g.flags) for (const k of Object.keys(g.flags)) delete g.flags[k]; return true; })()')
            for fl in PARTY + flags:
                lab.call('setFlag', fl, True)
            lab.warp(map_id, x, y, 'up')
            lab.call('party', 'mira', 'bram')
            lab.frames(140)
            lab.page.wait_for_function('LQ_DEBUG.scene() === "field"', timeout=30000, polling=16)
            lab.frames(30)
            for gname in groups:
                r = lab.run(f'LQ_DEBUG.turnVane({json.dumps(gname)}, {{ force: true }})')
                lab.frames(4)
            st = lab.run('LQ_DEBUG.wind()') if groups else None
            if map_id not in mods:
                mods[map_id] = lab.run(f'(() => {{ const f = {FIELD}; return {{ ground: f.map.mod.ground }}; }})()')
            img = stitch(lab)
            W, H = img.width // 16, img.height // 16
            img.save(os.path.join(HERE, name + '_x1.png'))
            img.resize((img.width * 2, img.height * 2), Image.NEAREST).save(os.path.join(HERE, name + '.png'))
            fr, org = phone(img, *focus)
            fr.save(os.path.join(HERE, name + '_phone.png'))
            L = luma(np.asarray(img))
            m = floor_mask(mods[map_id], W, H)
            res = {'whole': round(float(L.mean()), 3), 'floor': round(float(L[m].mean()), 3)}
            if map_id == 'ep6_obs_f3':
                # the party's floor round the arrival (18,35): the cells left and right of the leader, lower rows
                cells = [(17, 35), (19, 35), (18, 36), (17, 36), (19, 36)]
                res['party_floor'] = round(float(np.mean([L[cy * 16 + 8:cy * 16 + 16, cx * 16:cx * 16 + 16].mean() for cx, cy in cells])), 3)
                # the darkest landing cells a ride ends on (the Listen deck, the causeway), spire_stone with no lamp lit
                dark = [(17, 18), (16, 17), (17, 14), (16, 25), (22, 10)]
                res['spire_stone_unlit'] = round(float(np.mean([L[cy * 16:cy * 16 + 16, cx * 16:cx * 16 + 16].mean() for cx, cy in dark])), 3)
            if st:
                res['turned'] = st.get('turned') if isinstance(st, dict) else None
            results[name] = res
            sheets.setdefault(map_id, []).append((name, img))
            print('wrote', name, res)
        for map_id, items in sheets.items():
            if len(items) < 2 or map_id in ('ep6_obs_eyrie', 'ep6_library'):
                continue
            w, h = items[0][1].size
            cols = 2 if len(items) <= 4 else 3
            rws = (len(items) + cols - 1) // cols
            sheet = Image.new('RGB', (cols * (w + 8), rws * (h + 8)), (12, 10, 20))
            for i, (n, im) in enumerate(items):
                sheet.paste(im, ((i % cols) * (w + 8), (i // cols) * (h + 8)))
            sheet.save(os.path.join(HERE, map_id + '_states.png'))
            print('wrote sheet', map_id + '_states.png', [n for n, _ in items])
        if lab.errors:
            print('console errors:')
            for e in lab.errors:
                print('  ', e)
            code = 1
        print(json.dumps(results))
    except Exception as e:  # noqa: BLE001
        print('FAILED', e)
        for l in lab.logs[-30:]:
            print('   log', l)
        code = 1
    finally:
        lab.close()
    return code


if __name__ == '__main__':
    sys.exit(main(sys.argv))
