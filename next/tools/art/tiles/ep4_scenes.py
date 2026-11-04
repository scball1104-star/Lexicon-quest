"""E4-tiles previews: the contact sheets, the mock rooms, the phone crops and the flood_grey check (out/ep4/).

    python ep4_scenes.py               # everything
    python ep4_scenes.py contact       # contact sheets only
    python ep4_scenes.py mocks         # mock rooms (3x and 1x) + phone crops
    python ep4_scenes.py tint          # the flood_grey measurement -> out/ep4/flood_grey_check.json

EP4DB merges assets/tiles/ep4_tiles.json (and x1_tiles.json, as the live game may hold both) into tiles.json the way
the pack loader does, so any tool can preview ep4 ids:  import ep4_scenes; db = ep4_scenes.EP4DB()

Tide water in the mocks: a scene gives `heights` (one string per row, '0' '1' '2' or '.' for no basin) and `level`;
every basin cell with height < level is drawn as tide_water over its floor (the E4-world rule, plan 4.4).
"""
import json, os, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from pxlib import Canvas, OUT_DIR, TILES_DIR
import compose
from compose import TileDB
from e2_scenes import carve, depth

OUT = os.path.join(OUT_DIR, 'ep4')


class EP4DB(TileDB):
    def __init__(self):
        super().__init__()
        from terrain import TERRAIN_ORDER
        order = list(TERRAIN_ORDER)
        for name, mod in (('x1_tiles.json', 'x1'), ('ep4_tiles.json', 'ep4')):
            p = os.path.join(TILES_DIR, name)
            if not os.path.exists(p):
                continue
            with open(p) as f:
                frag = json.load(f)
            for k in ('terrains', 'walls', 'tiles', 'objects', 'overlays'):
                tgt = self.db.setdefault(k, {})
                for tid, v in frag.get(k, {}).items():
                    if tid in tgt:
                        raise SystemExit('%s id clashes: %s.%s' % (name, k, tid))
                    tgt[tid] = v
            order = __import__(mod).merged_order(order, list(frag['terrains']))
        for tid, v in self.db['terrains'].items():
            if tid in order:
                v['order'] = order.index(tid)


def render(sc, db):
    import x1_preview
    sc = dict(sc)
    if sc.get('heights') is not None:
        rows = [list(r) for r in sc['ground']]
        for y, hr in enumerate(sc['heights']):
            for x, ch in enumerate(hr):
                if ch.isdigit() and int(ch) < sc.get('level', 0):
                    rows[y][x] = '~'
        sc['ground'] = [''.join(r) for r in rows]
        sc['legend'] = dict(sc['legend'], **{'~': 'tide_water'})
    cv = x1_preview.render(sc, db, map_id=sc.get('map_id'), frame=sc.get('frame', 0))
    if sc.get('heights') is not None and sc.get('level', 0) > 0:
        water_up_faces(cv, sc)
    return cv


def water_up_faces(cv, sc):
    """The water's surface carried up the bottom row of a north wall face to the tide mark of its level (the mark rows
    of ep4_kit: mark 1 at face row 26, mark 2 at row 18), so the wall's own marks read as the gauge. A presentation the
    mocks propose to E4-world; it changes no collision."""
    from ep4_kit import tq, MARK1_Y, MARK2_Y
    rows = sc['ground']
    lvl = sc['level']
    mark = MARK1_Y if lvl == 1 else MARK2_Y
    r0 = mark - 16
    for y in range(1, len(rows)):
        for x in range(len(rows[y])):
            if rows[y][x] != '~':
                continue
            if sc['legend'].get(rows[y - 1][x], '').endswith('_face') or (sc.get('door_cells') and (x, y - 1) in sc['door_cells']):
                for r in range(r0, 16):
                    for px in range(16):
                        X, Y = x * 16 + px, (y - 1) * 16 + r
                        if r == r0:
                            cv.set(X, Y, tq(4) if (px + x) % 4 == 0 else tq(3))
                        elif r == r0 + 1:
                            cv.put(X, Y, tq(2)[:3] + (170,))
                        else:
                            cv.put(X, Y, tq(1)[:3] + (150,))


def room(name, sys_id, floor, W, H, rooms, paint=None, **kw):
    g = carve(W, H, rooms)
    if paint:
        paint(g)
    rows = depth(g)
    legend = {'#': sys_id + '_top', '|': sys_id + '_face', 'o': sys_id + '_out_face', 'v': sys_id + '_out_top',
              '.': floor, 'c': 'canal_floor', 'L': 'ledge_lip', 'F': 'ledge_face', 'M': 'ledge_lip_marble',
              'N': 'canal_stair_n', 'S': 'canal_stair_s', 'E': 'canal_stair_e', 'W': 'canal_stair_w'}
    legend.update(kw.pop('legend', {}))
    sc = {'name': name, 'legend': legend, 'ground': rows, 'under': kw.pop('under', floor), 'decor': [], 'overlays': [],
          'actors': [], 'frame': 0}
    sc.update(kw)
    return sc


# ====================================================================== the mock rooms
def papered_door(level, washed=False, wash_frame=False):
    """F1 B, the Papered Door: a channel (h0) along the north wall with the papered door in it, a kerb and stair up to
    the walkway (h1), a kerb and stair up to the wheel's stand (outside the basin)."""
    W, H = 22, 16
    def paint(g):
        for x in range(2, 20):
            for y in (4, 5, 6):
                g[y][x] = 'c'
            g[7][x] = 'N' if x in (10, 11) else 'L'
            g[11][x] = 'N' if x == 15 else 'L'
    hts = []
    for y in range(H):
        r = ''
        for x in range(W):
            if 2 <= x <= 19 and 4 <= y <= 7:
                r += '0' if y < 7 else '1'
            elif 2 <= x <= 19 and 8 <= y <= 11:
                r += '1'
            else:
                r += '.'
        hts.append(r)
    sc = room('f1_papered_%s' % ('high' if level == 2 else ('mid' if level == 1 else ('low_washed' if washed else 'low'))),
              'causeway', 'causeway_floor', W, H, [(2, 4, 19, 14, '.', 2)], paint=paint, map_id='ep4_keep_f1')
    sc['heights'] = hts
    sc['level'] = level
    seal_state = 2 if washed else (1 if wash_frame else 0)
    sc['decor'] = [
        {'t': 'door_canal_open', 'x': 10, 'y': 3},
        {'t': 'seal_paper', 'x': 10, 'y': 3, 'state': seal_state} if not washed else {'t': 'seal_paper', 'x': 10, 'y': 3, 'state': 2},
        {'t': 'tide_post', 'x': 4, 'y': 5, 'state': level},
        {'t': 'tide_wheel', 'x': 6, 'y': 12, 'state': level},
        {'t': 'font_tide', 'x': 17, 'y': 13},
    ]
    sc['actors'] = [{'x': 6, 'y': 13, 'dir': 'up'}, {'x': 8, 'y': 13, 'dir': 'up', 'who': 'mira'}]
    return sc


def pontoons(level):
    """F1 C, the Pontoons: a north-south channel (h0) between two walkways (h1), three moored pontoons on the crossing
    row; low = grounded on the channel floor, mid = afloat level with the walkways."""
    W, H = 24, 15
    def paint(g):
        for y in range(4, 14):
            for x in range(9, 12):
                g[y][x] = 'c'
            if y != 9:
                g[y][8] = 'L'
                g[y][12] = 'L'
    hts = []
    for y in range(H):
        r = ''
        for x in range(W):
            if 9 <= x <= 11 and 4 <= y <= 13:
                r += '0'
            elif x in (8, 12) and 4 <= y <= 13:
                r += '1'
            else:
                r += '.'
        hts.append(r)
    sc = room('f1_pontoons_%s' % ('mid' if level else 'low'), 'causeway', 'causeway_floor', W, H,
              [(2, 4, 21, 13, '.', 2)], paint=paint, map_id='ep4_keep_f1')
    sc['heights'] = hts
    sc['level'] = level
    st = 1 if level else 0
    sc['decor'] = [{'t': 'pontoon', 'x': x, 'y': 9, 'state': st} for x in (9, 10, 11)] + [
        {'t': 'tide_post', 'x': 10, 'y': 6, 'state': level},
        {'t': 'tide_wheel', 'x': 4, 'y': 6, 'state': level},
        {'t': 'lantern_chain', 'x': 15, 'y': 5, 'state': 0},
    ]
    sc['actors'] = [{'x': 6, 'y': 9, 'dir': 'right'}, {'x': 4, 'y': 9, 'dir': 'right', 'who': 'bram'}]
    return sc


def f2_room(level):
    W, H = 22, 14
    def paint(g):
        for y in range(7, 11):
            for x in range(8, 14):
                g[y][x] = 'c'
        for x in range(8, 14):
            g[6][x] = 'F'
    hts = []
    for y in range(H):
        hts.append(''.join('0' if (8 <= x <= 13 and 7 <= y <= 10) else '.' for x in range(W)))
    sc = room('f2_stacks_%s' % ('high' if level else 'low'), 'archive_stacks', 'keep_archive_floor', W, H,
              [(2, 4, 19, 12, '.', 2)], paint=paint, map_id='ep4_keep_f2')
    sc['heights'] = hts
    sc['level'] = level
    sc['decor'] = [{'t': 'book_crate', 'x': 10, 'y': 8, 'state': 1 if level else 0},
                   {'t': 'book_crate', 'x': 11, 'y': 8, 'state': 2 if level else 0},
                   {'t': 'witness_lectern', 'x': 4, 'y': 6, 'state': 0},
                   {'t': 'lantern_chain', 'x': 16, 'y': 5, 'state': 0}]
    sc['actors'] = [{'x': 6, 'y': 9, 'dir': 'right'}]
    return sc


def f3_hub():
    W, H = 24, 15
    def paint(g):
        for y in range(9, 13):
            for x in range(3, 7):
                g[y][x] = 'c'
        for x in range(3, 7):
            g[8][x] = 'M'
    sc = room('f3_hub', 'witness', 'witness_floor', W, H, [(2, 4, 21, 13, '.', 3)], paint=paint, map_id='ep4_keep_f3',
              legend={'M': 'ledge_face_marble'})
    sc['heights'] = [''.join('0' if (3 <= x <= 6 and 9 <= y <= 12) else '.' for x in range(W)) for y in range(H)]
    sc['level'] = 1
    sc['decor'] = [{'t': 'petition_gate_closed', 'x': 10, 'y': 3, 'state': 2},
                   {'t': 'principle_stone_voice', 'x': 14, 'y': 7, 'state': 1},
                   {'t': 'principle_stone_truth', 'x': 17, 'y': 7, 'state': 0},
                   {'t': 'principle_stone_mercy', 'x': 14, 'y': 11, 'state': 1},
                   {'t': 'tide_post', 'x': 5, 'y': 10, 'state': 1}]
    sc['actors'] = [{'x': 11, 'y': 10, 'dir': 'up'}]
    return sc


def crown_room():
    W, H = 18, 14
    sc = room('crown', 'witness', 'witness_floor', W, H, [(2, 4, 15, 12, '.', 3)], map_id='ep4_keep_crown')
    sc['decor'] = [{'t': 'throne_paper', 'x': 7, 'y': 7, 'state': 0}, {'t': 'lantern_chain', 'x': 4, 'y': 5},
                   {'t': 'lantern_chain', 'x': 13, 'y': 5}, {'t': 'door_seal_closed', 'x': 2, 'y': 3} if False else
                   {'t': 'witness_lectern', 'x': 13, 'y': 9, 'state': 1}]
    sc['actors'] = [{'x': 8, 'y': 11, 'dir': 'up'}]
    return sc


def plaza(restored=False):
    """Valewyn's Drowned Crown Plaza: marble walk, a canal across the south with a marble bridge, the faceless statue,
    the flood board, sandbags, the Regent's Hall to the north, the inn and the shop."""
    W, H = 26, 17
    rows = []
    for y in range(H):
        r = ''
        for x in range(W):
            if y in (12, 13) and not (11 <= x <= 13):
                r += '~'
            elif y in (12, 13):
                r += 'b'
            else:
                r += 'm'
        rows.append(r)
    legend = {'m': 'marble_walk', '~': 'tide_water', 'b': 'marble_walk'}
    sc = {'name': 'vw_plaza' + ('_restored' if restored else ''), 'legend': legend, 'ground': rows, 'under': 'marble_walk',
          'overlays': [], 'frame': 0, 'actors': [{'x': 12, 'y': 10, 'dir': 'up'}, {'x': 13, 'y': 10, 'dir': 'up', 'who': 'mira'}]}
    sc['decor'] = [
        {'t': 'regent_hall', 'x': 8, 'y': 5},
        {'t': 'inn_flood', 'x': 0, 'y': 10},
        {'t': 'shop_river', 'x': 19, 'y': 9},
        {'t': 'statue_faceless', 'x': 11, 'y': 9},
        {'t': 'flood_board', 'x': 15, 'y': 9, 'state': 2 if restored else 1},
        {'t': 'sandbags', 'x': 8, 'y': 11}, {'t': 'sandbag', 'x': 16, 'y': 11},
        {'t': 'mooring_post', 'x': 10, 'y': 11},
        {'t': 'bridge_marble_v_n_w', 'x': 11, 'y': 12}, {'t': 'bridge_marble_v_n_m', 'x': 12, 'y': 12},
        {'t': 'bridge_marble_v_n_e', 'x': 13, 'y': 12}, {'t': 'bridge_marble_v_s_w', 'x': 11, 'y': 13},
        {'t': 'bridge_marble_v_s_m', 'x': 12, 'y': 13}, {'t': 'bridge_marble_v_s_e', 'x': 13, 'y': 13},
        {'t': 'roof_drowned_a', 'x': 2, 'y': 13} if not restored else {'t': 'sandbag', 'x': 2, 'y': 14},
        {'t': 'great_lock', 'x': 21, 'y': 16, 'state': 1 if restored else 0},
    ]
    return sc


def flood_lane():
    """The Flood Road's drowned lane: flood grass, the mud road running into water, the farm sluice and wheel, a post,
    the punt (pontoon) by the ditch, sandbags."""
    W, H = 26, 14
    rows = []
    for y in range(H):
        r = ''
        for x in range(W):
            if 6 <= y <= 7 and x < 12:
                r += '='
            elif 4 <= y <= 9 and 12 <= x <= 19:
                r += '~' if not (y == 9 and x > 17) else 'g'
            elif 6 <= y <= 7:
                r += '='
            else:
                r += 'g'
        rows.append(r)
    sc = {'name': 'flood_lane', 'legend': {'g': 'flood_grass', '=': 'mud_path', '~': 'tide_water'}, 'ground': rows,
          'under': 'flood_grass', 'overlays': [], 'frame': 0,
          'decor': [{'t': 'sluice_farm', 'x': 9, 'y': 4}, {'t': 'tide_wheel', 'x': 11, 'y': 4, 'state': 1},
                    {'t': 'tide_post', 'x': 13, 'y': 4, 'state': 1}, {'t': 'pontoon', 'x': 16, 'y': 9, 'state': 1},
                    {'t': 'sandbags', 'x': 5, 'y': 9}, {'t': 'mooring_post', 'x': 18, 'y': 10},
                    {'t': 'boat', 'x': 22, 'y': 6}],
          'actors': [{'x': 10, 'y': 6, 'dir': 'up'}]}
    return sc


def mocks():
    return [papered_door(0), papered_door(2, wash_frame=True), papered_door(0, washed=True), papered_door(1),
            pontoons(0), pontoons(1), f2_room(0), f2_room(1), f3_hub(), crown_room(), plaza(False), plaza(True),
            flood_lane()]


def phone_crop(cv, name, cx=None, cy=None):
    """The phone view: a 384 x 216 window (the game's whole screen) of the mock, saved at 2x (about the size one game
    pixel has on a 6-inch phone held sideways: 1.8 CSS px) and at 1x."""
    W, H = 384, 216
    if cv.w <= W and cv.h <= H:
        crop = cv
    else:
        cx = cv.w // 2 if cx is None else cx
        cy = cv.h // 2 if cy is None else cy
        x0 = max(0, min(cv.w - W, cx - W // 2))
        y0 = max(0, min(cv.h - H, cy - H // 2))
        crop = cv.crop(x0, y0, min(W, cv.w), min(H, cv.h))
    crop.save(os.path.join(OUT, 'phone_%s_2x.png' % name), 2)
    return crop


def run_mocks(db):
    os.makedirs(OUT, exist_ok=True)
    out = {}
    for sc in mocks():
        cv = render(sc, db)
        cv.save(os.path.join(OUT, 'mock_%s_3x.png' % sc['name']), 3)
        cv.save(os.path.join(OUT, 'mock_%s_x1.png' % sc['name']), 1)
        out[sc['name']] = cv
        print('mock', sc['name'], cv.w, cv.h)
    for n in out:
        phone_crop(out[n], n)
    # side-by-side pairs the brief asks for
    for a, b, name in (('f1_papered_low', 'f1_papered_high', 'pair_papered_low_high'),
                       ('f1_pontoons_low', 'f1_pontoons_mid', 'pair_pontoons_low_mid'),
                       ('f2_stacks_low', 'f2_stacks_high', 'pair_f2_low_high'),
                       ('vw_plaza', 'vw_plaza_restored', 'pair_plaza')):
        A, B = out[a].image(), out[b].image()
        im = Image.new('RGBA', (A.width + B.width + 8, max(A.height, B.height)), (20, 16, 30, 255))
        im.paste(A, (0, 0)); im.paste(B, (A.width + 8, 0))
        im.resize((im.width * 3, im.height * 3), Image.NEAREST).save(os.path.join(OUT, name + '_3x.png'))
        im.resize((im.width * 2, im.height * 2), Image.NEAREST).save(os.path.join(OUT, name + '_phone2x.png'))
    return out


# ====================================================================== contact sheets
def cells(m, sheet):
    x, y, w, h = m['rect']
    if m.get('frames'):
        return [sheet.crop((fx, fy, fx + fw, fy + fh)) for (fx, fy, fw, fh) in m['frames']]
    if m.get('anim'):
        return [sheet.crop((x + k * m['anim']['frameDx'], y, x + k * m['anim']['frameDx'] + w, y + h))
                for k in sorted(set(m['anim']['frames']))]
    return [sheet.crop((x, y, x + w, y + h))]


def draw_contact(items, scale, width, name, bg=(78, 92, 96, 255), bg2=(62, 74, 80, 255)):
    try:
        font = ImageFont.truetype('arial.ttf', 11)
    except Exception:
        font = ImageFont.load_default()
    pad = 8
    placed = []
    x = y = pad
    rowh = 0
    for label, imgs in items:
        w = sum(i.width for i in imgs) * scale + (len(imgs) - 1) * 4 + 4
        h = max(i.height for i in imgs) * scale
        tw = max(w, int(font.getlength(label)) + 4)
        if x + tw + pad > width:
            x = pad
            y += rowh + pad + 14
            rowh = 0
        placed.append((x, y, label, imgs, tw))
        x += tw + pad
        rowh = max(rowh, h)
    im = Image.new('RGBA', (width, y + rowh + pad + 20), bg)
    d = ImageDraw.Draw(im)
    for (x, y, label, imgs, tw) in placed:
        h = max(i.height for i in imgs) * scale
        d.rectangle((x - 2, y - 2, x + tw + 1, y + h + 13), fill=bg2)
        cx = x
        for i in imgs:
            big = i.resize((i.width * scale, i.height * scale), Image.NEAREST)
            im.alpha_composite(big, (cx, y + (h - big.height)))
            cx += big.width + 4
        d.text((x, y + h + 1), label, fill=(240, 236, 220, 255), font=font)
    p = os.path.join(OUT, name)
    im.convert('RGB').save(p)
    print('contact', p, im.size)
    return p


def contact():
    os.makedirs(OUT, exist_ok=True)
    with open(os.path.join(TILES_DIR, 'ep4_tiles.json')) as f:
        frag = json.load(f)
    sheet = Image.open(os.path.join(TILES_DIR, 'ep4.png')).convert('RGBA')
    objs = [(oid, cells(m, sheet)) for oid, m in frag['objects'].items()]
    big = [o for o in objs if max(i.height for i in o[1]) > 48 or sum(i.width for i in o[1]) > 120]
    small = [o for o in objs if o not in big]
    draw_contact(small, 3, 1500, 'contact_objects_3x.png')
    draw_contact(big, 2, 1500, 'contact_buildings_2x.png')
    tiles = []
    for tid, m in frag['tiles'].items():
        w, h = m.get('w', 16), m.get('h', 16)
        tiles.append((tid, [sheet.crop((m['x'], m['y'], m['x'] + w, m['y'] + h))]))
    draw_contact(tiles, 3, 1500, 'contact_tiles_3x.png')
    terr = []
    for tid, m in frag['terrains'].items():
        fr = [sheet.crop((m['x'], m['y'], m['x'] + 32, m['y'] + 48))]
        if m.get('anim'):
            fr = [sheet.crop((m['x'] + k * 32, m['y'], m['x'] + k * 32 + 32, m['y'] + 48)) for k in range(3)]
        fr += [sheet.crop((vx, vy, vx + 16, vy + 16)) for (vx, vy) in m.get('variants', [])]
        terr.append((tid, fr))
    for wid, m in frag['walls'].items():
        fr = [sheet.crop((m['top'][0], m['top'][1], m['top'][0] + 32, m['top'][1] + 48)),
              sheet.crop((m['face'][0], m['face'][1], m['face'][0] + 32, m['face'][1] + 32))]
        for st in m.get('faceStyles', [])[1:]:
            for (bx, by) in st:
                fr.append(sheet.crop((bx, by, bx + 32, by + 32)))
        terr.append((wid, fr))
    draw_contact(terr, 3, 1500, 'contact_terrains_3x.png')


# ====================================================================== flood_grey
CANDIDATES = {
    # name: (multiply colour, alpha, desat); applied like src/world/lighting.js (multiply at alpha, then saturation)
    'flood_grey_light': ('#a8b8b4', 0.55, 0.30),
    'flood_grey_mid': ('#93a5a2', 0.62, 0.38),
    'flood_grey_heavy': ('#7f928f', 0.68, 0.45),
}
MIN_DARKER = 0.10


def apply_tint(arr, color, alpha, desat):
    c = np.array([int(color[i:i + 2], 16) for i in (1, 3, 5)], np.float32) / 255.0
    out = arr * (1 - alpha) + arr * c * alpha
    lum = (out[..., 0] * 0.3 + out[..., 1] * 0.59 + out[..., 2] * 0.11)[..., None]
    return np.clip(out * (1 - desat) + lum * desat, 0, 1)


def luma(a):
    return float((a[..., 0] * 0.2126 + a[..., 1] * 0.7152 + a[..., 2] * 0.0722).mean())


def sat(a):
    mx, mn = a.max(-1), a.min(-1)
    return float(np.where(mx > 0, (mx - mn) / np.maximum(mx, 1e-6), 0).mean())


def tint(db):
    os.makedirs(OUT, exist_ok=True)
    sc = plaza(False)
    cv = render(sc, db)
    crop = cv.crop(0, 0, min(384, cv.w), min(216, cv.h)) if cv.w >= 384 else cv
    arr = crop.a[..., :3].astype(np.float32) / 255.0
    l0 = luma(arr)
    res = {'scene': 'vw_plaza mock (marble walk, canal, statue, board, Regent\'s Hall), phone crop %dx%d' % (crop.w, crop.h),
           'how': 'multiply the frame by color at alpha, then a saturation pass toward grey at desat (lighting.js order, '
                  'desatFirst false); mean Rec.709 luma over the crop',
           'mean_luma_none': round(l0, 4), 'saturation_none': round(sat(arr), 4), 'min_darker': MIN_DARKER,
           'candidates': {}}
    imgs = [Image.fromarray((arr * 255 + 0.5).astype(np.uint8))]
    chosen = None
    for name, (col, a, d) in CANDIDATES.items():
        t = apply_tint(arr, col, a, d)
        l1 = luma(t)
        darker = 1 - l1 / l0
        res['candidates'][name] = {'color': col, 'alpha': a, 'desat': d, 'mean_luma': round(l1, 4),
                                   'saturation': round(sat(t), 4), 'darker_pct': round(darker * 100, 1),
                                   'meets_10pct': bool(darker >= MIN_DARKER)}
        if chosen is None and darker >= 0.18:
            chosen = name
        imgs.append(Image.fromarray((t * 255 + 0.5).astype(np.uint8)))
    res['recommended'] = chosen
    res['recommended_tint'] = {'color': CANDIDATES[chosen][0], 'alpha': CANDIDATES[chosen][1], 'desat': CANDIDATES[chosen][2]} if chosen else None
    res['note'] = ('TINTS.flood_grey = { color, alpha, desat } as recommended (desatFirst false). It clears the 10 percent bar about twice over (CRITIQUE_3 and 5 found the Hollow and ash tints too timid at 9 to 12 percent) '
                   'so rain particles cannot eat it; lamps and lit windows drawn as lights stay warm.')
    with open(os.path.join(OUT, 'flood_grey_check.json'), 'w') as f:
        json.dump(res, f, indent=1)
    w, h = imgs[0].size
    strip = Image.new('RGB', (w * 2 * len(imgs) + 6 * (len(imgs) - 1), h * 2), (20, 16, 30))
    for i, im in enumerate(imgs):
        strip.paste(im.resize((w * 2, h * 2), Image.NEAREST), (i * (w * 2 + 6), 0))
    strip.save(os.path.join(OUT, 'flood_grey_compare.png'))
    print(json.dumps(res, indent=1))
    return res


def main(argv):
    want = argv[1:] or ['contact', 'mocks', 'tint']
    db = EP4DB()
    if 'contact' in want:
        contact()
    if 'mocks' in want:
        run_mocks(db)
    if 'tint' in want:
        tint(db)


if __name__ == '__main__':
    main(sys.argv)
