"""Quench channel art (Episode 3): slag, slag crust and the stone troughs -> forge.png (E3-tiles, EPISODE3_PLAN 5.1).

slag               A1 terrain, 3 frames, `flow: 'slag'`, collision `water` (not walkable). Orange, glowing, with dark
                   crust floes drifting on it and a one pixel dark lip with a hot inner edge.
slag_crust         plain 16 x 16 tile, `flow: 'channel'`, collision `none` (walkable): dark cooled rock with dim red
                   cracks. `slag_crust_b` / `slag_crust_c` are variants with the same crack endpoints (they join),
                   `slag_crust_fresh` is the first two seconds after cooling (cracks bright), `slag_crust_rim` is a
                   16-tile `line16` strip: index N*1 + E*2 + S*4 + W*8, a bit set when that neighbour is still molten
                   slag, so the crust glows along the side that touches the slag.
trough_*           stone channel tiles, `flow: 'channel'`, collision `none`. Dry frame = the tile itself, wet frames =
                   `wet: {x, y, anim}` on the same entry (3 frames, `frameDx` 16) and also `<id>_wet` as its own tile.
                   h, v, ne/nw/se/sw (corners, named by the two arms), t_n/t_e/t_s/t_w (a T with NO arm toward that
                   side), x (four arms) and end_n/end_e/end_s/end_w (a dead end open toward that side).
"""
import math
import numpy as np
from pxlib import Canvas, C, DARK, WHITE, h32, SH
from terrain import blank, scatter, Water
from forge_kit import K, SW, RR, FI, GD, EA, MT, SD, WA, ICE


# ====================================================================== slag (A1)
class Slag(Water):
    """Molten slag: a bright orange body, slow flow lines of lighter orange and a hot yellow vein, dark crust floes
    that drift one pixel per frame. The bank is a one pixel dark lip, hottest on the molten side; under a far (north)
    bank the crust face drops into a red glow."""
    id = 'slag'
    flow = 'slag'

    def make_texture(self, frame, variant):
        t = blank(RR(4))
        # soft darker orange pools (depth)
        for y in range(16):
            for x in range(16):
                n = h32((x + frame) // 3, y // 2, 6801) % 7
                if n == 0:
                    t[y][x] = RR(3) if (x + y) % 2 == 0 else RR(4)
        # flow lines: three wavy bands of lighter orange, sliding right
        for i, y0 in enumerate((3, 8, 13)):
            for x in range(16):
                y = y0 + int(round(math.sin((x + frame * 2 + i * 5) * math.pi / 8.0) * 1.3))
                t[y % 16][x] = FI(3)
                if (x + frame + i * 3) % 5 in (0, 1):
                    t[(y + 1) % 16][x] = FI(3)
        # a hot vein
        for k in range(7):
            x = (2 + k + frame * 2) % 16
            y = (6 + (1 if k % 3 == 2 else 0)) % 16
            t[y][x] = FI(4)
        # crust floes: dark plates with a lit top and a glowing underside, drifting
        floes = ((11, 3, 4, 2), (3, 11, 5, 2), (13, 12, 3, 1))
        for i, (fx, fy, fw, fh) in enumerate(floes):
            ox = (fx + frame) % 16
            for yy in range(fh + 1):
                for xx in range(fw):
                    px, py = (ox + xx) % 16, (fy + yy) % 16
                    if yy == 0:
                        t[py][px] = RR(2)
                    elif yy == fh:
                        t[py][px] = RR(1)
                    else:
                        t[py][px] = RR(1)
            t[(fy + fh + 1) % 16][(ox + 1) % 16] = RR(3)
        # sparks
        for i, (x, y) in enumerate(((6, 2), (14, 9), (1, 6), (9, 14))):
            ph = (frame + i) % 3
            if ph == 0:
                t[y][x] = FI(5)
            elif ph == 1:
                t[y][(x + 1) % 16] = FI(4)
        return t

    def pixel(self, c, x, y):
        if not c.i('ground', x, y):
            return None
        g = c.f('ground', x, y)
        if c.i('surf', x, y):
            d = c.f('surf', x, y)
            s = c.side('surf', x, y)
            if s == 'N' and d < 2.0:
                # under the far bank's lip: a dark shadow line and a dull red band
                return RR(1) if d < 1 else RR(2)
            if d < 1:
                return FI(4) if (h32(x, y, c.frame, 6811) % 4) else FI(5)
            if d < 2 and (x + y + c.frame) % 3 == 0:
                return FI(4)
            return self.tex(c, x, y)
        s = c.side('surf', x, y)
        if s == 'N':
            k = 0
            while k < 8 and c.i('ground', x, y - k - 1) and not c.i('surf', x, y - k - 1):
                k += 1
            j = 0
            while j < 8 and c.i('ground', x, y + j + 1) and not c.i('surf', x, y + j + 1):
                j += 1
            if k == 0 or g < 1:
                return K(4) if (x % 4) else K(3)
            if k == 1:
                return K(3)
            if j == 0:
                return RR(2) if (x + y) % 2 else RR(3)
            if j == 1:
                return RR(1) if (x + y) % 2 else RR(2)
            return K(1) if k < 4 else K(0)
        # a thin dark lip all round the other sides, hot on its inner edge
        return RR(1) if (x + y) % 3 else SD(1)


# ====================================================================== crust
CRACK_WIGGLE = {
    0: {'N': [(8, 0), (7, 2), (8, 4), (8, 6), (8, 8)], 'S': [(8, 8), (9, 10), (8, 12), (8, 14), (8, 15)],
        'W': [(0, 8), (2, 9), (4, 8), (6, 8), (8, 8)], 'E': [(8, 8), (10, 7), (12, 8), (14, 8), (15, 8)]},
    1: {'N': [(8, 0), (9, 2), (9, 5), (8, 6), (8, 8)], 'S': [(8, 8), (7, 10), (8, 13), (8, 15)],
        'W': [(0, 8), (3, 7), (5, 8), (8, 8)], 'E': [(8, 8), (11, 9), (13, 8), (15, 8)]},
    2: {'N': [(8, 0), (8, 3), (7, 5), (8, 8)], 'S': [(8, 8), (8, 11), (9, 13), (8, 15)],
        'W': [(0, 8), (3, 9), (6, 9), (8, 8)], 'E': [(8, 8), (9, 6), (12, 7), (15, 8)]},
}
BRANCHES = {
    0: [[(7, 2), (4, 3), (3, 1)], [(10, 7), (11, 4), (13, 3)], [(4, 8), (3, 11), (4, 13)], [(9, 10), (12, 12), (13, 14)]],
    1: [[(9, 5), (12, 4), (13, 2)], [(5, 8), (4, 5), (2, 4)], [(7, 10), (4, 12), (3, 14)], [(11, 9), (12, 12)]],
    2: [[(7, 5), (4, 5), (2, 3)], [(12, 7), (13, 5), (14, 3)], [(6, 9), (5, 12), (6, 14)], [(9, 13), (12, 14), (14, 13)]],
}


def _poly(cv, pts, col, glow=None):
    for a, b in zip(pts, pts[1:]):
        (x0, y0), (x1, y1) = a, b
        n = max(abs(x1 - x0), abs(y1 - y0), 1)
        for k in range(n + 1):
            x = round(x0 + (x1 - x0) * k / n)
            y = round(y0 + (y1 - y0) * k / n)
            cv.set(x, y, col)


def crust(variant=0, fresh=False, mask=0):
    """Cooled slag. mask bits N=1 E=2 S=4 W=8: that neighbour is still molten (glowing rim on that side)."""
    cv = Canvas(16, 16)
    for y in range(16):
        for x in range(16):
            n = h32(x, y, 6821 + variant) % 23
            c = K(1)
            if n == 0:
                c = K(2)
            elif n in (1, 2):
                c = K(0)
            cv.set(x, y, c)
    if fresh:
        for y in range(16):
            for x in range(16):
                if (x + y) % 2 == 0 and cv.get(x, y) == K(1):
                    cv.set(x, y, K(2))
    dim = RR(2) if fresh else RR(1)
    mid = FI(3) if fresh else RR(2)
    # plate highlights beside the cracks (light from the top left), then the cracks themselves
    for arm in CRACK_WIGGLE[variant % 3].values():
        for (x, y) in arm:
            for (ox, oy) in ((-1, -1), (-1, 0), (0, -1)):
                if cv.get(x + ox, y + oy) in (K(1), K(0)) and 0 <= x + ox < 16 and 0 <= y + oy < 16:
                    cv.set(x + ox, y + oy, K(2))
    for arm in CRACK_WIGGLE[variant % 3].values():
        _poly(cv, arm, dim)
    for br in BRANCHES[variant % 3]:
        _poly(cv, br, SD(0) if not fresh else RR(2))
    # glints where the cracks meet
    cv.set(8, 8, mid)
    if fresh:
        cv.set(8, 8, FI(4))
        for (x, y) in ((8, 4), (8, 12), (4, 8), (12, 8)):
            cv.set(x, y, FI(3))
    else:
        for (x, y) in ((8, 5), (11, 8), (6, 8)):
            if cv.get(x, y) == dim:
                cv.set(x, y, mid)
    # a glowing rim on the sides that touch molten slag
    for i in range(16):
        for (bit, pts) in ((1, [(i, 0), (i, 1)]), (2, [(15, i), (14, i)]), (4, [(i, 15), (i, 14)]), (8, [(0, i), (1, i)])):
            if mask & bit:
                (x0, y0), (x1, y1) = pts
                cv.set(x0, y0, FI(3) if (i % 3) else FI(4))
                if i % 2 == 0:
                    cv.set(x1, y1, RR(2))
                else:
                    cv.set(x1, y1, RR(1))
    return cv


# ====================================================================== troughs
ARMS = {
    'h': 'EW', 'v': 'NS', 'ne': 'NE', 'nw': 'NW', 'se': 'SE', 'sw': 'SW',
    't_n': 'ESW', 't_e': 'NSW', 't_s': 'NEW', 't_w': 'NES', 'x': 'NESW',
    'end_n': 'N', 'end_e': 'E', 'end_s': 'S', 'end_w': 'W',
}


def _inside(arms):
    m = np.zeros((16, 16), bool)
    m[4:12, 4:12] = True
    if 'N' in arms:
        m[0:4, 4:12] = True
    if 'S' in arms:
        m[12:16, 4:12] = True
    if 'W' in arms:
        m[4:12, 0:4] = True
    if 'E' in arms:
        m[4:12, 12:16] = True
    # round the outside corners of the centre square where two arms do not meet there
    for (cx, cy, a, b) in ((4, 4, 'N', 'W'), (11, 4, 'N', 'E'), (4, 11, 'S', 'W'), (11, 11, 'S', 'E')):
        if a not in arms and b not in arms:
            m[cy, cx] = False
    return m


def trough(kind, wet, frame=0):
    arms = ARMS[kind]
    ins = _inside(arms)
    cv = Canvas(16, 16)
    up = lambda x, y: y > 0 and ins[y - 1, x] if y > 0 else ('N' in arms and 4 <= x < 12) and False
    for y in range(16):
        for x in range(16):
            def at(xx, yy):
                if 0 <= xx < 16 and 0 <= yy < 16:
                    return bool(ins[yy, xx])
                # off the tile edge: the channel carries on if that arm is open
                if yy < 0 or yy > 15:
                    return ('N' if yy < 0 else 'S') in arms and 4 <= xx < 12
                return ('W' if xx < 0 else 'E') in arms and 4 <= yy < 12
            if not ins[y, x]:
                # the stone slab around the channel
                c = K(3)
                n = h32(x, y, 6901) % 41
                if n == 0:
                    c = K(2)
                elif n == 1:
                    c = K(4)
                if at(x, y + 1):            # the near side (south) of a lip north of the channel: no, lip above channel
                    c = K(4)
                if at(x, y - 1) or at(x + 1, y) and False:
                    c = K(2)
                if at(x - 1, y) or at(x, y - 1):
                    c = K(2) if not at(x, y + 1) else c
                if at(x, y + 1) and at(x - 1, y):
                    c = K(4)
                if y == 0 and 'N' not in arms:
                    c = K(5)
                elif y == 15 and 'S' not in arms:
                    c = K(1)
                if x == 0 and 'W' not in arms:
                    c = K(4)
                elif x == 15 and 'E' not in arms:
                    c = K(1)
                cv.set(x, y, c)
                continue
            # inside the channel
            wall_n = not at(x, y - 1)             # a south-facing wall face above this pixel
            wall_n2 = not at(x, y - 2) and at(x, y - 1)
            wall_w = not at(x - 1, y)
            wall_e = not at(x + 1, y)
            wall_s = not at(x, y + 1)
            if wet:
                ph = (x + y - frame * 2) % 6
                c = WA(3)
                if ph == 0:
                    c = WA(5) if (x * 3 + y) % 4 else WA(4)
                elif ph == 1:
                    c = WA(4)
                elif ph == 4:
                    c = WA(2)
                if wall_n:
                    c = WA(1)
                elif wall_n2:
                    c = WA(2)
                elif wall_w:
                    c = WA(2) if y % 2 else WA(3)
                elif wall_s:
                    c = WA(4) if (x + frame) % 3 else WHITE
                if wall_e and not wall_n and not wall_s:
                    c = WA(4)
            else:
                c = K(1)
                n = h32(x, y, 6903) % 11
                if n == 0:
                    c = K(2)
                elif n == 1:
                    c = K(0)
                if wall_n:
                    c = K(2)
                elif wall_n2:
                    c = K(0)
                elif wall_w:
                    c = K(0)
                elif wall_s:
                    c = K(3)
                if wall_e and not wall_s:
                    c = K(2)
                # the stain where water used to stand
                if (x + y) % 5 == 0 and not (wall_n or wall_n2) and n > 7:
                    c = RR(1) if (x * 7 + y) % 3 == 0 else EA(1)
            cv.set(x, y, c)
    return cv


def line16_strip(fn):
    """16 tiles in a row of 8 x 2 (index N*1 + E*2 + S*4 + W*8 at (x + (i % 8) * 16, y + (i // 8) * 16))."""
    s = Canvas(128, 32)
    for i in range(16):
        s.paste(fn(i), (i % 8) * 16, (i // 8) * 16)
    return s


def build_into(sh):
    terr = sh.meta.setdefault('terrains', {})
    sl = Slag()
    x, y = sh.alloc(96, 48)
    for fr in range(3):
        sh.cv.paste(sl.block(fr), x + fr * 32, y)
    terr['slag'] = {'x': x, 'y': y, 'w': 32, 'h': 48, 'autotile': 'A1', 'kind': 'hole', 'collision': 'water',
                    'flow': 'slag', 'light': {'color': '#e06b39', 'radius': 3.2},
                    'anim': {'frames': [0, 1, 2, 1], 'frameDx': 32, 'ms': 380}, 'variants': [],
                    'note': 'molten slag; water that reaches a slag cell turns it into slag_crust for good'}
    sh.newline()
    # crust
    for tid, cv in (('slag_crust', crust(0)), ('slag_crust_b', crust(1)), ('slag_crust_c', crust(2))):
        sh.tile(tid, cv, collision='none', flow='channel',
                note='cooled slag (walkable); b and c are variants whose cracks join the plain tile\'s')
    sh.tile('slag_crust_fresh', crust(0, fresh=True), collision='none', flow='channel',
            note='the same tile for the first two seconds after cooling: cracks still bright')
    x, y = sh.alloc(128, 32)
    sh.cv.paste(line16_strip(lambda i: crust(0, mask=i)), x, y)
    sh.meta['tiles']['slag_crust_rim'] = {'x': x, 'y': y, 'w': 128, 'h': 32, 'collision': 'none', 'flow': 'channel',
                                          'autotile': 'line16',
                                          'note': 'crust with a glowing rim: index N*1+E*2+S*4+W*8, bit set where the '
                                                  'neighbour is still molten slag'}
    x, y = sh.alloc(128, 32)
    sh.cv.paste(line16_strip(lambda i: crust(0, fresh=True, mask=i)), x, y)
    sh.meta['tiles']['slag_crust_rim_fresh'] = {'x': x, 'y': y, 'w': 128, 'h': 32, 'collision': 'none',
                                                'flow': 'channel', 'autotile': 'line16',
                                                'note': 'slag_crust_rim, first two seconds after cooling'}
    sh.newline()
    # troughs, dry and wet
    for kind in ARMS:
        tid = 'trough_' + kind
        dry = trough(kind, False)
        wet = [trough(kind, True, f) for f in range(3)]
        s = Canvas(48, 16)
        for f in range(3):
            s.paste(wet[f], f * 16, 0)
        dx, dy = sh.alloc(16, 16)
        sh.cv.paste(dry, dx, dy)
        wx, wy = sh.alloc(48, 16)
        sh.cv.paste(s, wx, wy)
        anim = {'frames': [0, 1, 2, 1], 'frameDx': 16, 'ms': 160}
        arms = ARMS[kind]
        sh.meta['tiles'][tid] = {'x': dx, 'y': dy, 'w': 16, 'h': 16, 'collision': 'none', 'flow': 'channel',
                                 'arms': arms, 'wet': {'x': wx, 'y': wy, 'anim': anim},
                                 'note': 'dry frame; wet = this entry\'s `wet` (3 frames) or tile %s_wet' % tid}
        sh.meta['tiles'][tid + '_wet'] = {'x': wx, 'y': wy, 'w': 16, 'h': 16, 'collision': 'none', 'flow': 'channel',
                                          'arms': arms, 'anim': anim}
    sh.newline()
