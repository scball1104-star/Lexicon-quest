"""Battle HUD kit: gauges, Fury shine, timeline slots, shield pips, weakness frame, BREAK burst, reticle,
elite mark, tiny labels (3x5 caps)."""
from __future__ import annotations

import math

import numpy as np

import uipal as P
from lib import blank, hexc, paste
from spr import draw

TINY = {
    'A': ['.#.', '#.#', '###', '#.#', '#.#'], 'B': ['##.', '#.#', '##.', '#.#', '##.'],
    'C': ['.##', '#..', '#..', '#..', '.##'], 'D': ['##.', '#.#', '#.#', '#.#', '##.'],
    'E': ['###', '#..', '##.', '#..', '###'], 'F': ['###', '#..', '##.', '#..', '#..'],
    'G': ['.##', '#..', '#.#', '#.#', '.##'], 'H': ['#.#', '#.#', '###', '#.#', '#.#'],
    'I': ['###', '.#.', '.#.', '.#.', '###'], 'K': ['#.#', '#.#', '##.', '#.#', '#.#'],
    'L': ['#..', '#..', '#..', '#..', '###'], 'M': ['#...#', '##.##', '#.#.#', '#...#', '#...#'],
    'N': ['#..#', '##.#', '#.##', '#..#', '#..#'], 'O': ['.#.', '#.#', '#.#', '#.#', '.#.'],
    'Q': ['.#.', '#.#', '#.#', '#.#', '.##'],
    'P': ['##.', '#.#', '##.', '#..', '#..'], 'R': ['##.', '#.#', '##.', '#.#', '#.#'],
    'S': ['.##', '#..', '.#.', '..#', '##.'], 'T': ['###', '.#.', '.#.', '.#.', '.#.'],
    'U': ['#.#', '#.#', '#.#', '#.#', '###'], 'V': ['#.#', '#.#', '#.#', '.#.', '.#.'],
    'X': ['#.#', '#.#', '.#.', '#.#', '#.#'], 'Y': ['#.#', '#.#', '.#.', '.#.', '.#.'],
    'W': ['#...#', '#...#', '#.#.#', '##.##', '#...#'], 'Z': ['###', '..#', '.#.', '#..', '###'],
    '0': ['###', '#.#', '#.#', '#.#', '###'], '1': ['.#.', '##.', '.#.', '.#.', '###'],
    '2': ['##.', '..#', '.#.', '#..', '###'], '3': ['##.', '..#', '.#.', '..#', '##.'],
    '+': ['...', '.#.', '###', '.#.', '...'], '/': ['..#', '..#', '.#.', '#..', '#..'],
}


def tiny_mask(text, gap=1):
    cols = []
    for i, ch in enumerate(text):
        if ch == ' ':
            cols.append(np.zeros((5, 2), bool))
            continue
        g = TINY[ch]
        m = np.array([[c == '#' for c in r] for r in g])
        cols.append(m)
        if i < len(text) - 1:
            cols.append(np.zeros((5, gap), bool))
    return np.concatenate(cols, axis=1)


def tiny_text(text, color, outline=P.OUTLINE, shadow=True):
    m = tiny_mask(text)
    h, w = m.shape
    a = blank(w + 2, h + 2)
    for y in range(h):
        for x in range(w):
            if m[y, x]:
                if shadow:
                    a[y + 1, x + 1] = hexc(outline)
    for y in range(h):
        for x in range(w):
            if m[y, x]:
                a[y, x] = hexc(color)
    return a


# ----------------------------------------------------------------------------------------------- gauges
def gauge_frame(fill_h=3):
    """3-slice gauge frame: 2 px caps, 1 px tileable middle. Interior = dark well with a lit bottom lip."""
    H = fill_h + 2
    a = blank(5, H + 1)
    ink = hexc(P.OUTLINE)
    well = hexc(P.INK[2])
    lip = hexc(P.STEEL[2])
    for y in range(H + 1):
        for x in range(5):
            a[y, x] = ink
    for y in range(1, H - 1):
        for x in range(1, 4):
            a[y, x] = well
    # lit bottom lip under the well (gives the gauge a recessed bevel)
    for x in range(1, 4):
        a[H - 1, x] = lip
    # rounded caps
    a[0, 0, 3] = 0
    a[H, 0, 3] = 0
    a[0, 4, 3] = 0
    a[H, 4, 3] = 0
    return a


def fill_slice(cols, h=3):
    """1 px wide gauge fill: top highlight, body, bottom shade."""
    a = blank(1, h)
    if h == 3:
        seq = [cols[0], cols[1], cols[2]]
    elif h == 2:
        seq = [cols[0], cols[2]]
    else:
        seq = [cols[0]] + [cols[1]] * (h - 2) + [cols[2]]
    for y, c in enumerate(seq):
        a[y, 0] = hexc(c)
    return a


GAUGE_FILLS = {
    'hp': [P.GREEN[5], P.GREEN[4], P.GREEN[3]],
    'hp_mid': [P.GOLD[4], P.GOLD[3], P.GOLD[2]],
    'hp_low': [P.FIRE[2], P.FIRE[1], P.RED[2]],
    'mp': [P.WATER[5], P.WATER[4], P.WATER[3]],
    'fury': [P.GOLD[5], P.FIRE[3], P.FIRE[2]],
    'lag': [P.WHITE, P.METAL[3], P.METAL[2]],
    'atb': [P.CYAN[4], P.CYAN[3], P.CYAN[2]],
    'exp': [P.VIOLET[4], P.VIOLET[3], P.VIOLET[2]],
}


def fury_shine_frames(n=4, w=24, h=3):
    """Tileable glint for a FULL Fury fill: a 3 px diagonal streak that travels right (w px period)."""
    out = []
    for i in range(n):
        a = blank(w, h)
        for y in range(h):
            for x in range(w):
                d = (x + y - i * (w // n)) % w
                if d in (0, 1):
                    a[y, x] = hexc(P.WHITE, 235)
                elif d in (2, w - 1):
                    a[y, x] = hexc(P.GOLD[5], 150)
        out.append(a)
    return out


def gauge_glow_frames():
    """9-slice halo drawn around a full gauge at (x-2, y-2, w+4, h+4); 2 rings, rounded, 2-frame pulse."""
    out = []
    for inner, outer in ((235, 130), (150, 70)):
        S = 11
        a = blank(S, S)
        for y in range(S):
            for x in range(S):
                d = min(x, y, S - 1 - x, S - 1 - y)
                cx, cy = min(x, S - 1 - x), min(y, S - 1 - y)
                if d == 0 and cx + cy >= 2:
                    a[y, x] = hexc(P.FIRE[3], outer)
                elif d == 1 and cx + cy >= 3:
                    a[y, x] = hexc(P.GOLD[4], inner)
        out.append(a)
    return out


# ----------------------------------------------------------------------------------------------- timeline
def tl_slot(kind):
    """18x18 slot frame with a 14x14 transparent window for a face crop. kind: party|enemy|current|preview|elite."""
    S = 18
    rim = {'party': (P.WATER[4], P.WATER[2]), 'enemy': (P.FIRE[2], P.RED[2]),
           'current': (P.GOLD[5], P.GOLD[3]), 'preview': (P.METAL[4], P.METAL[2]),
           'elite': (P.GOLD[4], P.GOLD[2])}[kind]
    a = blank(S, S)
    for y in range(S):
        for x in range(S):
            d = min(x, y, S - 1 - x, S - 1 - y)
            corner = (x in (0, S - 1)) and (y in (0, S - 1))
            if corner:
                continue
            if d == 0:
                a[y, x] = hexc(P.OUTLINE)
            elif d == 1:
                lit = (x <= y and x < S - 1 - y) or (y < x and y < S - 1 - x)
                lit = (y <= x and x + y < S - 1) or (x < y and x + y < S - 1)
                a[y, x] = hexc(rim[0] if lit else rim[1])
            elif d == 2:
                a[y, x] = hexc(P.OUTLINE, 160)
    if kind == 'preview':
        a[..., 3] = (a[..., 3].astype(int) * 140 // 255).astype(np.uint8)
    return a


def tl_current_glow():
    """Outer glow ring for the acting slot (22x22, 2 frames)."""
    out = []
    for al in (170, 90):
        a = blank(22, 22)
        for y in range(22):
            for x in range(22):
                d = min(x, y, 21 - x, 21 - y)
                corner = (x in (0, 1, 20, 21)) and (y in (0, 1, 20, 21)) and not (
                    (x in (1, 20)) and (y in (1, 20)))
                if d == 0 and not ((x in (0, 21)) and (y in (0, 21))):
                    if (x in (0, 21) and y in (1, 20)) or (y in (0, 21) and x in (1, 20)):
                        continue
                    a[y, x] = hexc(P.GOLD[4], al // 2)
                elif d == 1 and not ((x in (1, 20)) and (y in (1, 20))):
                    a[y, x] = hexc(P.GOLD[5], al)
        out.append(a)
    return out


def tl_rail():
    """3-slice rail the timeline slots sit on: thin gold line with ink border and end knobs."""
    a = blank(7, 5)
    a[1:4, :] = hexc(P.OUTLINE)
    a[2, 1:6] = hexc(P.GOLD[3])
    # knob caps
    for x in (0, 6):
        a[0:5, x] = hexc(P.OUTLINE)
    a[1:4, 1] = hexc(P.GOLD[4])
    a[1:4, 5] = hexc(P.GOLD[2])
    a[2, 1] = hexc(P.GOLD[5])
    return a


# ----------------------------------------------------------------------------------------------- shields & weakness
SHIELD_PIP = """
.111111.
13333221
13443221
13443221
13332221
.133221.
..1321..
...11...
"""


def shield_pip(state):
    if state == 'full':
        return draw(SHIELD_PIP.replace('1', 'K').replace('4', '4'), A=P.METAL, outline=False,
                    extra={'K': P.OUTLINE})
    if state == 'empty':
        return draw("""
        .KKKKKK.
        K......K
        K......K
        K......K
        K......K
        .K....K.
        ..K..K..
        ...KK...
        """.replace('.', '.'), A=P.STEEL, outline=False, extra={'K': P.STEEL[2]})
    if state == 'broken':
        return draw("""
        .KKKKKK.
        K334.22K
        K344.21K
        K33.321K
        K3.3221K
        .K.322K.
        ..K32K..
        ...KK...
        """, A=P.FIRE, outline=False, extra={'K': P.OUTLINE})


def shield_badge(broken=False):
    """12x13 shield holding the shield count (code draws 1-2 digits of the main font in white, centered
    at x+6, y+2). broken=True: cracked orange badge shown while the enemy is Broken."""
    art = """
    .KKKKKKKKKK.
    K4444444443K
    K4111111112K
    K4111111112K
    K4111111112K
    K4111111112K
    K4111111112K
    K4111111112K
    .K41111112K.
    ..K411112K..
    ...K4112K...
    ....K32K....
    .....KK.....
    """
    if not broken:
        return draw(art, A=[P.STEEL[0], P.STEEL[1], P.STEEL[2], P.STEEL[4], P.STEEL[5]], outline=False,
                    extra={'K': P.OUTLINE})
    art_b = """
    .KKKKKKKKKK.
    K4444K44443K
    K42222K2222K
    K422222K222K
    K42222K2222K
    K4222K22222K
    K42222K2222K
    K422222K222K
    .K42222K22K.
    ..K4222K2K..
    ...K42K2K...
    ....K3KK....
    .....KK.....
    """
    return draw(art_b, A=P.FIRE, outline=False, extra={'K': P.OUTLINE})


def weak_frame(kind='normal'):
    """14x14 frame around a 12x12 element/weapon icon on the weakness row."""
    rim = {'normal': (P.METAL[2], P.STEEL[2]), 'hit': (P.GOLD[5], P.GOLD[3]),
           'resist': (P.STEEL[3], P.STEEL[1])}[kind]
    a = blank(14, 14)
    for y in range(14):
        for x in range(14):
            d = min(x, y, 13 - x, 13 - y)
            if (x in (0, 13)) and (y in (0, 13)):
                continue
            if d == 0:
                a[y, x] = hexc(P.OUTLINE)
            elif d == 1:
                lit = y < x and x + y < 13 or x <= y and x + y < 13
                a[y, x] = hexc(rim[0] if (y == 1 or x == 1) else rim[1])
            else:
                a[y, x] = hexc(P.INK[2], 210)
    return a


UNKNOWN = """
............
....dddd....
...deeeed...
...dd..ed...
.......ed...
......ed....
.....ed.....
.....dd.....
............
.....ed.....
.....dd.....
............
"""


def weak_unknown():
    return draw(UNKNOWN, B=P.METAL + [P.METAL[-1]])


def weak_null():
    """A 12x12 slash mark placed over an icon for 'resists/null'."""
    a = blank(12, 12)
    for i in range(10):
        x, y = 1 + i, 10 - i
        a[y, x] = hexc(P.RED[4])
        a[y, min(11, x + 1)] = hexc(P.RED[2])
    return a


# ----------------------------------------------------------------------------------------------- BREAK burst
def burst_frames():
    """4-frame radial burst (96x60, origin = center) drawn behind the BREAK word art."""
    W, H = 96, 60
    cx, cy = W / 2 - 0.5, H / 2 - 0.5
    out = []
    specs = [  # (inner radius, ray length, n rays, core radius, alpha scale, ring only)
        (6, 22, 12, 9, 1.0, False),
        (10, 42, 14, 14, 1.0, False),
        (16, 47, 14, 11, 0.92, False),
        (28, 47, 14, 0, 0.6, True),
    ]
    cols = [P.GOLD[5], P.GOLD[4], P.FIRE[3], P.FIRE[2], P.FIRE[1]]
    for fi, (r0, rl, n, core, asc, ring) in enumerate(specs):
        a = blank(W, H)
        for y in range(H):
            for x in range(W):
                dx, dy = (x - cx), (y - cy) * 1.55
                r = math.hypot(dx, dy)
                ang = math.atan2(dy, dx)
                # jagged rays: alternate long and short
                k = (ang / (2 * math.pi)) * n
                frac = abs((k % 1.0) - 0.5) * 2          # 1 at ray center, 0 between rays
                long_ray = int(math.floor(k)) % 2 == 0
                L = rl * (1.0 if long_ray else 0.62) + fi * 0.5
                width = frac ** 2.2
                reach = r0 + (L - r0) * width
                if r <= reach and r >= (r0 if ring else 0):
                    t = r / max(1, L)
                    ci = min(len(cols) - 1, int(t * len(cols)))
                    a[y, x] = hexc(cols[ci], int(255 * asc))
                if core and r <= core:
                    a[y, x] = hexc(P.WHITE if r < core * 0.6 else P.GOLD[5], 255)
        # ink outline for punch
        m = a[..., 3] > 0
        ring_m = np.zeros_like(m)
        for oy, ox in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ring_m |= np.roll(np.roll(m, oy, 0), ox, 1)
        ring_m &= ~m
        a[ring_m] = hexc(P.FIRE[0], int(220 * asc))
        out.append(a)
    return out


# ----------------------------------------------------------------------------------------------- reticle
def reticle_frames():
    out = []
    for spread in (0, 2):
        S = 20 + spread * 2
        a = blank(S, S)
        L = 5
        for (sx, sy) in ((0, 0), (1, 0), (0, 1), (1, 1)):
            for i in range(L):
                for t in range(2):
                    x = i if sx == 0 else S - 1 - i
                    y = t if sy == 0 else S - 1 - t
                    a[y, x] = hexc(P.GOLD[4] if t == 0 else P.GOLD[2])
                    x2 = t if sx == 0 else S - 1 - t
                    y2 = i if sy == 0 else S - 1 - i
                    a[y2, x2] = hexc(P.GOLD[4] if t == 0 else P.GOLD[2])
        m = a[..., 3] > 0
        big = np.zeros((S + 2, S + 2, 4), np.uint8)
        big[1:-1, 1:-1] = a
        M = big[..., 3] > 0
        ring = np.zeros_like(M)
        for oy, ox in ((1, 0), (-1, 0), (0, 1), (0, -1), (1, 1), (-1, -1), (1, -1), (-1, 1)):
            ring |= np.roll(np.roll(M, oy, 0), ox, 1)
        ring &= ~M
        big[ring] = hexc(P.OUTLINE)
        out.append(big)
    # pad both frames to the same cell, centered
    S = max(f.shape[0] for f in out)
    res = []
    for f in out:
        c = blank(S, S)
        o = (S - f.shape[0]) // 2
        c[o:o + f.shape[0], o:o + f.shape[1]] = f
        res.append(c)
    return res


def target_arrow_frames():
    base = draw("""
    OOOOOOOOO
    O5544432O
    .O54432O.
    ..O543O..
    ...O3O...
    ....O....
    """, A=P.FIRE, outline=False)
    out = []
    for dy in (0, 2):
        c = blank(9, 8)
        c[dy:dy + 6] = base
        out.append(c)
    return out


ELITE = """
.d...d...d.
.dd.ded.dd.
.ddddedddd.
.dcdcdcdcd.
.ccccccccc.
.bbbbbbbbb.
"""


def turn_marker_frames():
    """Small gold down-triangle over the acting party member (2 frames)."""
    base = draw("""
    OOOOOOO
    O54443O
    .O543O.
    ..O3O..
    ...O...
    """, A=P.GOLD, outline=False)
    out = []
    for dy in (0, 1):
        c = blank(7, 6)
        c[dy:dy + 5] = base
        out.append(c)
    return out


def sprites():
    out = []
    out.append(('gauge_frame', gauge_frame(3), None))
    out.append(('gauge_frame_thin', gauge_frame(2), None))
    for k, cols in GAUGE_FILLS.items():
        out.append((f'gauge_{k}', fill_slice(cols, 3), None))
        out.append((f'gauge_{k}_thin', fill_slice(cols, 2), None))
    for i, f in enumerate(fury_shine_frames()):
        out.append((f'fury_shine_{i}', f, None))
    for i, f in enumerate(gauge_glow_frames()):
        out.append((f'gauge_glow_{i}', f, None))
    for k in ('party', 'enemy', 'current', 'preview', 'elite'):
        out.append((f'tl_{k}', tl_slot(k), None))
    for i, f in enumerate(tl_current_glow()):
        out.append((f'tl_glow_{i}', f, None))
    out.append(('tl_rail', tl_rail(), None))
    for st in ('full', 'empty', 'broken'):
        out.append((f'shield_{st}', shield_pip(st), None))
    out.append(('shield_badge', shield_badge(), None))
    out.append(('shield_badge_broken', shield_badge(True), None))
    for k in ('normal', 'hit', 'resist'):
        out.append((f'weak_frame' + ('' if k == 'normal' else '_' + k), weak_frame(k), None))
    out.append(('weak_unknown', weak_unknown(), None))
    out.append(('weak_null', weak_null(), None))
    for i, f in enumerate(burst_frames()):
        out.append((f'break_burst_{i}', f, (48, 30)))
    for i, f in enumerate(reticle_frames()):
        out.append((f'reticle_{i}', f, (f.shape[1] // 2, f.shape[0] // 2)))
    for i, f in enumerate(target_arrow_frames()):
        out.append((f'target_arrow_{i}', f, (4, 7)))
    for i, f in enumerate(turn_marker_frames()):
        out.append((f'turn_marker_{i}', f, (3, 5)))
    out.append(('elite_mark', draw(ELITE, B=P.GOLD), None))
    for lbl, col in (('HP', P.GOLD[4]), ('MP', P.GOLD[4]), ('FURY', P.FIRE[3]), ('LV', P.GOLD[4]),
                     ('EXP', P.GOLD[4]), ('NEXT', P.GOLD[4]), ('ATK', P.GOLD[4]), ('DEF', P.GOLD[4]),
                     ('MAG', P.GOLD[4]), ('SPD', P.GOLD[4]), ('READY', P.GOLD[5]), ('KO', P.RED[4])):
        out.append((f'lbl_{lbl.lower()}', tiny_text(lbl, col), None))
    return out


def anims():
    return {
        'fury_shine': {'frames': [f'fury_shine_{i}' for i in range(4)], 'fps': 10, 'loop': True},
        'gauge_glow': {'frames': ['gauge_glow_0', 'gauge_glow_1'], 'fps': 4, 'loop': True},
        'tl_glow': {'frames': ['tl_glow_0', 'tl_glow_1'], 'fps': 4, 'loop': True},
        'break_burst': {'frames': [f'break_burst_{i}' for i in range(4)], 'fps': 15, 'loop': False},
        'reticle': {'frames': ['reticle_0', 'reticle_1'], 'fps': 4, 'loop': True},
        'target_arrow': {'frames': ['target_arrow_0', 'target_arrow_1'], 'fps': 4, 'loop': True},
        'turn_marker': {'frames': ['turn_marker_0', 'turn_marker_1'], 'fps': 4, 'loop': True},
    }


def slices():
    s = {
        'gauge_frame': {'border': [2, 0, 2, 0], 'fillInset': [1, 1], 'fillHeight': 3},
        'gauge_frame_thin': {'border': [2, 0, 2, 0], 'fillInset': [1, 1], 'fillHeight': 2},
        'gauge_glow_0': {'border': [4, 4, 4, 4], 'place': 'around gauge rect: x-2, y-2, w+4, h+4'},
        'gauge_glow_1': {'border': [4, 4, 4, 4], 'place': 'around gauge rect: x-2, y-2, w+4, h+4'},
        'tl_rail': {'border': [2, 0, 2, 0]},
    }
    return s
