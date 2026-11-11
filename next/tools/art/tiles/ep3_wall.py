"""Hollowmere's east wall walk and the far glow over Emberpeak (issue #99, docs/WORLD_MAP_PLAN.md section 4, Episode 3 opening).

    python tools/art/tiles/ep3_wall.py            -> assets/tiles/ep3.png and src/data/maps/ep3/_open_tiles.js
    python tools/art/tiles/ep3_wall.py --preview  -> also tools/art/tiles/out/ep3_wall_4x.png (a contact sheet)

Deterministic (pxlib hashes, no global RNG), so a rerun writes the same bytes. The ep3 pack has no asset manifest and the
first download is full (qa/pwa/budget_ratchet.json), so this sheet is the pack's own: assets/tiles/ep3.png (pack-owned by its
stem, never precached) is loaded by src/data/maps/ep3/index.js register(engine), and the tile entries below are merged into
the live tile database there (the generated module, not a JSON file, because a stray *_tiles.json would be listed in the core
manifest). Every entry is a 16 x 16 `tiles` entry, used as a map overlay by hollow_gate.js withEastGate:

  ew_walk_a / ew_walk_b   the wall walk's flagstones (walkable, over grass or the mere's edge)
  ew_merlon_n             the north parapet seen from the south: merlons with caps (solid)
  ew_corner_nw/_ne        its two corners (solid)
  ew_merlon_e             the east parapet seen from above, the walk's last flags beside it (solid)
  ew_curb_w               the low inner curb on the town side, the ground below it showing to its left (solid)
  ew_stair                three steps down to the west, onto the gate spur (walkable)
  ew_face / ew_face_e     the wall's south face under the walk, and its east end (solid)
  ew_glow_<row>_<col>     a 14 x 2 strip along the top of the mere: the far mountains with Emberpeak's red glow behind them
                          (keeps the water's collision; gated in the map on nh_restored, not first_bell_rung)

Palette: the house ramps (assets/palette.json): stone_warm for the wall (the town's own low wall is that beige stone), path
for the flags, shadow and ink for the far ridge, fire and roof_red for the glow.
"""
import os, sys
from pxlib import Canvas, C, SH, DARK, rnd, NEXT

OUT_PNG = os.path.join(NEXT, 'assets', 'tiles', 'ep3.png')
OUT_JS = os.path.join(NEXT, 'src', 'data', 'maps', 'ep3', '_open_tiles.js')
PREVIEW = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'out', 'ep3_wall_4x.png')
SEED = 9931
GLOW_W = 14

ST = lambda i: C('stone_warm', i)
PA = lambda i: C('path', i)


def flags(cv, ox, oy, w, h, seed):
    """Big worn flagstones: 8 x 8 blocks offset per row, mortar in stone_warm 2, a light top-left edge."""
    for y in range(h):
        for x in range(w):
            gx, gy = ox + x, oy + y
            row = gy // 8
            off = 4 if row % 2 else 0
            bx, by = (gx + off) % 8, gy % 8
            blk = (gx + off) // 8
            if bx == 7 or by == 7:
                cv.set(x, y, ST(2))
                continue
            t = rnd(blk, row, seed)
            base = PA(3) if t < 0.55 else PA(2) if t < 0.85 else ST(4)
            c = base
            if bx == 0 or by == 0:
                c = PA(4) if base != ST(4) else ST(5)
            elif bx == 6 or by == 6:
                c = PA(2) if base == PA(3) else ST(3)
            if rnd(gx, gy, seed + 1) < 0.06:
                c = ST(3)
            cv.set(x, y, c)


def bricks(cv, x0, y0, w, h, seed, top=4):
    """Coursed wall face: 8 x 4 bricks, the top course lit."""
    for y in range(h):
        for x in range(w):
            gy = y
            course = gy // 4
            off = 4 if course % 2 else 0
            bx, by = (x + x0 + off) % 8, gy % 4
            if by == 3 or bx == 7:
                c = ST(1)
            else:
                t = rnd((x + x0 + off) // 8, course, seed)
                c = ST(top if course == 0 else 3) if t < 0.6 else ST(2 if course else 3)
                if by == 0 and bx < 6:
                    c = ST(min(5, (top if course == 0 else 3) + 1)) if t < 0.6 else ST(3)
            cv.set(x0 + x, y0 + y, c)


def merlon_row(cv, seed):
    """North parapet seen from the south: three merlons (5 px, capped) with the shore showing through the crenels between
    them, over a parapet course, its shadow on the walk below."""
    for x in range(16):
        m = (x % 6) < 4                     # merlon columns 0..3, crenel 4..5 (repeats every 6 px)
        for y in range(0, 6):
            if not m:
                continue
            c = ST(5) if y == 0 else ST(4) if y == 1 else ST(3) if (x % 6) < 3 else ST(2)
            if (x % 6) == 0 and y > 0:
                c = ST(4)
            cv.set(x, y, c)
        cv.set(x, 6, ST(5)); cv.set(x, 7, ST(4))   # the coping under the merlons
    bricks(cv, 0, 8, 16, 6, seed, top=3)
    for x in range(16):
        if (x % 6) == 3:
            for y in range(1, 6):
                cv.set(x, y, ST(1))
        cv.put(x, 14, SH(120)); cv.put(x, 15, SH(60))


def corner(cv, side, seed):
    """A corner tower stub: a wider capped merlon over the parapet course."""
    merlon_row(cv, seed)
    xs = range(0, 7) if side == 'w' else range(9, 16)
    for y in range(0, 8):
        for x in xs:
            cv.set(x, y, ST(5) if y == 0 else ST(4) if y < 2 or x in (xs[0], xs[-1]) else ST(3))
    for y in range(1, 8):
        cv.set(xs[-1] if side == 'w' else xs[0], y, ST(1))


def merlon_e(cv, seed):
    """East parapet seen from above: walk flags on the left 6 px, then the parapet top with a merlon block on its outer edge
    (raised, lit on top, its shadow falling on the walk)."""
    flags(cv, 0, 0, 16, 16, seed)
    for y in range(16):
        cv.put(5, y, SH(110)); cv.put(4, y, SH(50))
        for x in range(6, 16):
            k = x - 6
            c = ST(5) if k == 0 else ST(4) if k < 3 else ST(3) if k < 6 else ST(2)
            if (y % 8) == 7:
                c = ST(2)
            cv.set(x, y, c)
        # a merlon on the outer half, every other 8 rows: lighter top, dark lower edge
        if (y % 16) < 9:
            for x in range(11, 16):
                cv.set(x, y, ST(5) if (y % 16) < 2 else ST(4) if x < 14 else ST(3))
        elif (y % 16) == 9:
            for x in range(11, 16):
                cv.set(x, y, ST(1))


def curb_w(cv):
    """The low inner curb: the right 6 px a stone rail at walk height, the ground left of it untouched (transparent)."""
    for y in range(16):
        cv.set(10, y, ST(1))
        for x in range(11, 16):
            c = ST(5) if x == 11 else ST(4) if x < 14 else ST(3)
            if (y % 8) == 7:
                c = ST(2)
            cv.set(x, y, c)
        cv.put(9, y, SH(70))


def stair(cv, seed):
    """Three steps down to the west: treads in path stone, risers in stone_warm, the walk level on the right."""
    flags(cv, 0, 0, 16, 16, seed)
    for i, x0 in enumerate((0, 5, 10)):
        for x in range(x0, x0 + 5):
            for y in range(16):
                rise = (x - x0) == 4
                c = ST(2) if rise else (PA(3) if i == 2 else PA(2) if i == 1 else PA(1))
                if y in (0, 15):
                    c = ST(3)
                cv.set(x, y, c)
    for y in range(16):
        cv.set(15, y, ST(4))


def face(cv, seed, east=False):
    """The south face under the walk: the lip (the walk's edge) then four brick courses and the shadow at its foot."""
    for x in range(16):
        cv.set(x, 0, ST(5)); cv.set(x, 1, ST(3))
    bricks(cv, 0, 2, 16, 12, seed, top=3)
    for x in range(16):
        cv.put(x, 14, SH(140)); cv.put(x, 15, SH(70))
    if east:
        for y in range(0, 14):
            for x in range(9, 16):
                if y < 2:
                    cv.set(x, y, ST(5))
            cv.set(9, y, ST(1))


def glow_strip():
    """14 x 2 tiles: the dawn sky over the far shore, Emberpeak's red glow along the ridges, the ridge line, its foot on the
    water (transparent below it). The left three columns dither out so the strip meets the open mere."""
    W, H = GLOW_W * 16, 32
    cv = Canvas(W, H)
    # sky: dark violet at the top to the glow at the horizon (row 14..18), ordered dither between steps
    sky = [C('shadow', 1), C('ink', 2), C('roof_purple', 1), C('roof_red', 1), C('roof_red', 2), C('fire', 1), C('fire', 2)]
    bayer = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]
    peak = W - 3 * 16   # the glow is strongest over the right of the strip (north-east)
    ridge = []
    for x in range(W):
        far = 15 + int(3 * rnd(x // 6, SEED)) - (2 if abs(x - peak) < 18 else 0)
        near = 19 + int(4 * rnd(x // 9, SEED + 3))
        ridge.append((far, near))
    for x in range(W):
        heat = max(0.0, 1.0 - abs(x - peak) / 140.0)
        far, near = ridge[x]
        for y in range(H):
            if y < far:
                t = (y / max(1, far)) * (0.55 + 0.45 * heat) * (len(sky) - 1)
                i = int(t)
                fr = t - i
                if fr * 16 > bayer[y % 4][x % 4] and i + 1 < len(sky):
                    i += 1
                cv.set(x, y, sky[min(i, len(sky) - 1)])
            elif y < near:
                c = C('ink', 1)
                if y == far:
                    c = C('fire', 2) if heat > 0.55 else C('roof_red', 2) if heat > 0.25 else C('ink', 3)
                elif y == far + 1 and heat > 0.7 and rnd(x, y, SEED) < 0.5:
                    c = C('roof_red', 1)
                cv.set(x, y, c)
            elif y < near + 2:
                cv.set(x, y, C('shadow', 1))
            elif y < near + 5 and (x + y) % 2 == 0 and heat > 0.3 and rnd(x, y, SEED + 5) < heat * 0.6:
                cv.set(x, y, C('roof_red', 2))          # the glow on the water at the far shore
    # Emberpeak itself: a darker cone over the peak with a hot seam
    for dy in range(0, 10):
        for dx in range(-dy - 2, dy + 3):
            x, y = peak + dx, 8 + dy
            if 0 <= x < W and y < ridge[x][1]:
                cv.set(x, y, C('ink', 1) if abs(dx) < dy + 2 else C('shadow', 1))
    for y in range(8, 14):
        cv.set(peak + (y % 2), y, C('fire', 3) if y < 11 else C('fire', 2))
    cv.set(peak, 7, C('fire', 4)); cv.set(peak + 1, 7, C('fire', 2))
    # fade the left end into the open mere
    for x in range(48):
        for y in range(H):
            if bayer[y % 4][x % 4] >= int(16 * x / 48):
                cv.set(x, y, (0, 0, 0, 0))
    return cv


def build():
    walls = Canvas(16 * 11, 16)
    names = []

    def tile(name, fn, *a):
        c = Canvas(16, 16)
        fn(c, *a)
        walls.blit(c, len(names) * 16, 0)
        names.append(name)

    tile('ew_walk_a', lambda c: flags(c, 0, 0, 16, 16, SEED))
    tile('ew_walk_b', lambda c: flags(c, 3, 8, 16, 16, SEED + 7))
    tile('ew_merlon_n', merlon_row, SEED)
    tile('ew_corner_nw', corner, 'w', SEED)
    tile('ew_corner_ne', corner, 'e', SEED)
    tile('ew_merlon_e', merlon_e, SEED + 11)
    tile('ew_curb_w', lambda c: curb_w(c))
    tile('ew_stair', stair, SEED + 13)
    tile('ew_face', face, SEED + 17)
    tile('ew_face_e', lambda c: face(c, SEED + 19, east=True))
    glow = glow_strip()
    sheet = Canvas(GLOW_W * 16, 48)
    sheet.blit(glow, 0, 0)
    sheet.blit(walls, 0, 32)
    entries = {}
    solid = {'ew_merlon_n', 'ew_corner_nw', 'ew_corner_ne', 'ew_merlon_e', 'ew_curb_w', 'ew_face', 'ew_face_e'}
    for i, n in enumerate(names):
        entries[n] = {'sheet': 'ep3.png', 'x': i * 16, 'y': 32, 'w': 16, 'h': 16, 'collision': 'solid' if n in solid else 'none'}
    for r in range(2):
        for col in range(GLOW_W):
            entries[f'ew_glow_{r}_{col}'] = {'sheet': 'ep3.png', 'x': col * 16, 'y': r * 16, 'w': 16, 'h': 16, 'collision': 'water'}
    return sheet, entries


def write_js(entries):
    rows = ',\n'.join(f"    {k}: {{ sheet: '{v['sheet']}', x: {v['x']}, y: {v['y']}, w: 16, h: 16, collision: '{v['collision']}' }}"
                      for k, v in entries.items())
    text = ('// Generated by tools/art/tiles/ep3_wall.py (issue #99): the Episode 3 opening tiles in assets/tiles/ep3.png, merged into\n'
            '// the live tile database by index.js register(engine). Do not edit; rerun the script.\n'
            f'export const GLOW_W = {GLOW_W};\n'
            'export const EP3_TILES = {\n  tiles: {\n' + rows + ',\n  },\n};\n')
    with open(OUT_JS, 'w', encoding='utf-8', newline='\n') as f:
        f.write(text)


def main():
    sheet, entries = build()
    im = sheet.image().quantize(colors=64, method=2, dither=0) if False else sheet.image()
    os.makedirs(os.path.dirname(OUT_PNG), exist_ok=True)
    im.save(OUT_PNG, optimize=True)
    write_js(entries)
    print('ep3.png', sheet.w, 'x', sheet.h, os.path.getsize(OUT_PNG), 'bytes;', len(entries), 'tiles')
    if '--preview' in sys.argv:
        sheet.save(PREVIEW, scale=4)
        print('preview', PREVIEW)


if __name__ == '__main__':
    main()
