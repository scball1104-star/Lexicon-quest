"""Party battle sprites -> assets/sprites/party_battle.png/.json (32x40 cells, facing LEFT toward enemies).

Built as a puppet from the hand-pixeled LEFT field view: body (near arm removed) + posed arm + weapon,
with lean / crouch / kneel transforms. Weapons come from chars/battle_parts.py.
Per character the frames are: for each of its two weapon types: idle_0, idle_1, ready, windup, strike,
victory; plus shared cast, hurt, defend, kneel (low HP), ko.
"""
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'chars'))
import numpy as np
from pix import *
import pal as P
import walk as W
import battle_parts as BP
import hero as HERO, mira as MIRA, bram as BRAM

CELL = (32, 40)
OX, OY = 7, 8
HIP = 25
MODS = {'hero': HERO, 'mira': MIRA, 'bram': BRAM}
WEAPONS_OF = {'hero': ['sword', 'axe'], 'mira': ['staff', 'bow'], 'bram': ['spear', 'axe']}


def img(txt, legend, w=None):
    return parse_grid(grid_from_text(txt), legend, w=w)


def rot(a, grip, k):
    """rotate image CCW by k*90 and transform the grip point"""
    gx, gy = grip
    for _ in range(k % 4):
        H, Wd = a.shape[:2]
        a = np.rot90(a, 1).copy()
        gx, gy = gy, Wd - 1 - gx
    return a, (gx, gy)


_wcache = {}


def weapon(name, angle):
    key = (name, angle)
    if key in _wcache:
        return _wcache[key]
    leg = P.resolve(BP.WPAL, 'weapons')
    if name == 'bow':
        g, grip = BP.BOW[angle]
        out = (img(g, leg), grip)
    else:
        up, gu = BP.WEAPONS[name]['up']
        uf, gf = BP.WEAPONS[name]['up_fwd']
        up, uf = img(up, leg), img(uf, leg)
        table = {'up': (up, gu, 0), 'fwd': (up, gu, 1), 'down': (up, gu, 2), 'back': (up, gu, 3),
                 'up_fwd': (uf, gf, 0), 'down_fwd': (uf, gf, 1), 'down_back': (uf, gf, 2), 'up_back': (uf, gf, 3)}
        a, g0, k = table[angle]
        out = rot(a, g0, k)
    _wcache[key] = out
    return out


def left_body(c):
    mod = MODS[c]
    leg = P.resolve(mod.PAL, c)
    rows = grid_from_text(mod.LEFT)
    if c == 'hero':
        rows = [BP.HERO_NOARM_ROWS.get(i, r) for i, r in enumerate(rows)]
    elif c == 'mira':
        new = []
        for i, r in enumerate(rows):
            r = list(r)
            for x in range(0, 5):
                if r[x] in 'kKihgG3xu':
                    r[x] = '.'
            if i in (18, 19):
                r[4] = '1'
            new.append(''.join(r))
        rows = new
    return parse_grid(rows, leg, w=24), leg


def lean(a, dx, hip=HIP):
    """shear the upper body: rows < hip-5 move dx, the 5 rows above the hip move dx//2 (toward 0)"""
    if dx == 0:
        return a
    out = a.copy()
    half = int(dx / 2)
    for y in range(hip):
        d = dx if y < hip - 5 else half
        if d:
            row = a[y].copy()
            out[y] = 0
            if d > 0:
                out[y, d:] = row[:-d]
            else:
                out[y, :d] = row[-d:]
    return out


def lean_dx_at(y, dx, hip=HIP):
    return dx if y < hip - 5 else int(dx / 2)


def bob_upper(a, dy, hip=HIP):
    """push the upper body down by dy (breathing / crouch); legs stay"""
    out = a.copy()
    up = a[:hip].copy()
    out[:hip] = 0
    out[dy:hip + dy] = np.where(up[..., 3:4] > 0, up, out[dy:hip + dy])
    out[hip:hip + dy] = np.where(up[hip - dy:hip, ..., 3:4] > 0, up[hip - dy:hip], a[hip:hip + dy])
    return out


def blink(a, c):
    mod = MODS[c]
    leg = P.resolve(mod.PAL, c)
    out = a.copy()
    for (x, y, ch) in mod.BLINK.get('left', []):
        col = hex2rgb(leg[ch])
        out[y, x, :3] = np.array(col, np.float32) / 255
    return out


def legs_spread(a, c):
    mod = MODS[c]
    leg = P.resolve(mod.PAL, c)
    spec = dict(mod.WALK['left'])
    la = parse_grid(grid_from_text(mod.LEFT_A), leg, w=24)
    return W.side_step(a, spec, la, bob=0)


def kneel(a, c):
    leg = P.resolve(MODS[c].PAL, c)
    hip = {'hero': HIP, 'mira': 27, 'bram': 25}[c]
    out = blank(24, 32)
    up = a[:hip]
    out[BP.KNEEL_DROP:hip + BP.KNEEL_DROP] = up
    kl = parse_grid(grid_from_text(BP.KNEEL[c]), leg, w=24)
    n = kl.shape[0]
    out[32 - n:] = np.where(kl[..., 3:4] > 0, kl, out[32 - n:])
    return out


def compose(c, body, shoulder, arm_pose=None, wpn=None, angle=None, weapon_front=False, far_hand=None, sparkle=False):
    cell = blank(*CELL)
    leg_arm = P.resolve(BP.ARM_PAL[c], c + '_arm')
    wimg = None
    if wpn:
        wimg, grip = weapon(wpn, angle)
    if c == 'bram':
        if wimg is not None and not weapon_front:
            paste(cell, wimg, OX + far_hand[0] - grip[0], OY + far_hand[1] - grip[1])
        paste(cell, body, OX, OY)
        if wimg is not None and weapon_front:
            paste(cell, wimg, OX + far_hand[0] - grip[0], OY + far_hand[1] - grip[1])
            hand = img(""".00.\n0Rx0\n0rR0\n.00.""", leg_arm)
            paste(cell, hand, OX + far_hand[0] - 1, OY + far_hand[1] - 1)
        hx, hy = far_hand
    else:
        paste(cell, body, OX, OY)
        ag, anchor, hand = BP.ARMS[arm_pose]
        aimg = img(ag, leg_arm)
        ax, ay = shoulder[0] - anchor[0], shoulder[1] - anchor[1]
        hx, hy = ax + hand[0], ay + hand[1]
        if wimg is not None:
            paste(cell, wimg, OX + hx - grip[0], OY + hy - grip[1])
        paste(cell, aimg, OX + ax, OY + ay)
    if sparkle:
        sp = [(0, -3), (-3, 0), (3, 0), (0, 3), (-2, -2), (2, -2)]
        hot = np.array(hex2rgb(P.color('gold:5')), np.float32) / 255
        cool = np.array(hex2rgb(P.color('magic_cyan:3')), np.float32) / 255
        for i, (dx, dy) in enumerate(sp):
            x, y = OX + hx + dx, OY + hy - 4 + dy
            if 0 <= x < CELL[0] and 0 <= y < CELL[1]:
                cell[y, x, :3] = hot if i % 2 == 0 else cool
                cell[y, x, 3] = 1
    return cell


def frames_for(c):
    body, leg = left_body(c)
    sh = {'hero': BP.HERO_SHOULDER, 'mira': BP.MIRA_SHOULDER, 'bram': (0, 0)}[c]
    fh = BP.BRAM_FAR_HAND
    out = []

    def S(dx=0, dy=0):
        return (sh[0] + lean_dx_at(sh[1], dx), sh[1] + dy)

    def F(x, y, dx=0, dy=0):
        return (x + lean_dx_at(y, dx), y + dy)

    for w in WEAPONS_OF[c]:
        b0 = body
        b1 = bob_upper(body, 1)
        rdy = lean(legs_spread(bob_upper(body, 1), c), -1)
        wnd = lean(bob_upper(body, 1), 1)
        stk = lean(legs_spread(bob_upper(body, 1), c), -2)
        if c == 'hero':
            out += [(f'{w}_idle_0', compose(c, b0, S(), 'down', w, 'down_fwd')),
                    (f'{w}_idle_1', compose(c, b1, S(0, 1), 'down', w, 'down_fwd')),
                    (f'{w}_ready', compose(c, rdy, S(-1, 1), 'fwd', w, 'up_fwd')),
                    (f'{w}_windup', compose(c, wnd, S(1, 1), 'up_back', w, 'up_back')),
                    (f'{w}_strike', compose(c, stk, S(-2, 1), 'fwd_down', w, 'down_fwd')),
                    (f'{w}_victory', compose(c, b0, S(), 'up', w, 'up'))]
        elif c == 'mira' and w == 'staff':
            out += [(f'{w}_idle_0', compose(c, b0, S(), 'fwd', w, 'up')),
                    (f'{w}_idle_1', compose(c, b1, S(0, 1), 'fwd', w, 'up')),
                    (f'{w}_ready', compose(c, rdy, S(-1, 1), 'fwd', w, 'up_fwd')),
                    (f'{w}_windup', compose(c, wnd, S(1, 1), 'up_back', w, 'up_back')),
                    (f'{w}_strike', compose(c, stk, S(-2, 1), 'fwd_down', w, 'down_fwd')),
                    (f'{w}_victory', compose(c, b0, S(), 'up', w, 'up'))]
        elif c == 'mira' and w == 'bow':
            out += [(f'{w}_idle_0', compose(c, b0, S(), 'fwd', 'bow', 'hold')),
                    (f'{w}_idle_1', compose(c, b1, S(0, 1), 'fwd', 'bow', 'hold')),
                    (f'{w}_ready', compose(c, rdy, S(-1, 1), 'fwd', 'bow', 'hold')),
                    (f'{w}_windup', compose(c, rdy, S(-1, 1), 'fwd', 'bow', 'drawn')),
                    (f'{w}_strike', compose(c, wnd, S(1, 1), 'fwd', 'bow', 'hold')),
                    (f'{w}_victory', compose(c, b0, S(), 'up', 'bow', 'hold'))]
        elif c == 'bram' and w == 'spear':
            out += [(f'{w}_idle_0', compose(c, b0, None, None, w, 'up', weapon_front=True, far_hand=F(3, 21))),
                    (f'{w}_idle_1', compose(c, b1, None, None, w, 'up', weapon_front=True, far_hand=F(3, 21, 0, 1))),
                    (f'{w}_ready', compose(c, rdy, None, None, w, 'up_fwd', weapon_front=True, far_hand=F(5, 21, -1, 1))),
                    (f'{w}_windup', compose(c, wnd, None, None, w, 'up_back', far_hand=F(16, 13, 1, 1))),
                    (f'{w}_strike', compose(c, stk, None, None, w, 'fwd', weapon_front=True, far_hand=F(9, 20, -2, 1))),
                    (f'{w}_victory', compose(c, b0, None, None, w, 'up', weapon_front=True, far_hand=F(3, 15)))]
        elif c == 'bram' and w == 'axe':
            out += [(f'{w}_idle_0', compose(c, b0, None, None, w, 'up', weapon_front=True, far_hand=F(3, 22))),
                    (f'{w}_idle_1', compose(c, b1, None, None, w, 'up', weapon_front=True, far_hand=F(3, 22, 0, 1))),
                    (f'{w}_ready', compose(c, rdy, None, None, w, 'up_fwd', weapon_front=True, far_hand=F(5, 21, -1, 1))),
                    (f'{w}_windup', compose(c, wnd, None, None, w, 'up_back', far_hand=F(15, 13, 1, 1))),
                    (f'{w}_strike', compose(c, stk, None, None, w, 'down_fwd', weapon_front=True, far_hand=F(7, 21, -2, 1))),
                    (f'{w}_victory', compose(c, b0, None, None, w, 'up', weapon_front=True, far_hand=F(3, 14)))]
    pw = WEAPONS_OF[c][0]
    crouch = legs_spread(bob_upper(body, 1), c)
    hurt = blink(lean(body, 2), c)
    kn = kneel(body, c)
    if c == 'bram':
        out += [('cast', compose(c, lean(body, 1), None, None, pw, 'up', weapon_front=True, far_hand=F(3, 15, 1), sparkle=True)),
                ('hurt', compose(c, hurt, None, None, pw, 'up_back', far_hand=F(16, 20, 2))),
                ('defend', compose(c, lean(crouch, -1), None, None, pw, 'up', weapon_front=True, far_hand=F(4, 21, -1, 1))),
                ('kneel', compose(c, kn, None, None, pw, 'up', weapon_front=True, far_hand=(3, 25)))]
    else:
        cw = 'staff' if c == 'mira' else pw
        out += [('cast', compose(c, body, S(), 'up_fwd', cw, 'up', sparkle=True)),
                ('hurt', compose(c, hurt, S(2, 0), 'down' if c == 'hero' else 'back_low', pw if c == 'hero' else 'staff',
                                 'down_fwd' if c == 'hero' else 'down_back')),
                ('defend', compose(c, crouch, S(0, 1), 'fwd', pw if c == 'hero' else 'staff', 'up')),
                ('kneel', compose(c, kn, S(0, BP.KNEEL_DROP), 'down' if c == 'hero' else 'fwd',
                                  pw if c == 'hero' else 'staff', 'down_fwd' if c == 'hero' else 'up'))]
    # KO: body (with arm down) rotated to lie on the ground, head to the right (fell backwards)
    kb = blink(body, c)
    ko_src = compose(c, kb, S(), 'down', None, None) if c != 'bram' else compose(c, kb, None, None, None, None, far_hand=fh)
    lying = np.rot90(ko_src, -1).copy()  # 40x32 -> rotated clockwise
    lying = crop_alpha(lying)[0]
    ko = blank(*CELL)
    h, wd = lying.shape[:2]
    paste(ko, lying, (CELL[0] - wd) // 2, CELL[1] - h)
    out.append(('ko', ko))
    return out


def build():
    allf = []
    per_char = {}
    for c in ('hero', 'mira', 'bram'):
        fr = frames_for(c)
        per_char[c] = fr
        allf += [(f'{c}_{n}', f) for n, f in fr]
    cols = 8
    # W6-anim extras appended after the original 51 cells, so every existing cell keeps its rect
    import anim_party as AP
    extra, alias = [], {}
    for c in ('hero', 'mira', 'bram'):
        for n, f in AP.extra_frames(c):
            if n in ('combo', 'levelup'):
                alias[f'{c}_{n}'] = f'{c}_{WEAPONS_OF[c][0]}_{n}'
            else:
                extra.append((f'{c}_{n}', f))
    sheet, rects = pack_rows(allf + extra, CELL, cols)
    for k, v in alias.items():
        rects[k] = list(rects[v])
    import anim_atlas as AA
    AA.save_indexed(sheet, os.path.join(DST, 'party_battle.png'))
    anims = {}
    for c in ('hero', 'mira', 'bram'):
        for w in WEAPONS_OF[c]:
            anims[f'{c}_{w}_idle'] = {'frames': [f'{c}_{w}_idle_0', f'{c}_{w}_idle_1'], 'fps': 2, 'loop': True}
            anims[f'{c}_{w}_attack'] = {'frames': [f'{c}_{w}_ready', f'{c}_{w}_windup', f'{c}_{w}_strike', f'{c}_{w}_strike'], 'fps': 10, 'loop': False}
    meta = {'image': 'party_battle.png', 'cell': list(CELL), 'origin': [OX + 12, OY + 31], 'facing': 'left',
            'weapons': WEAPONS_OF,
            'poses': 'per weapon: <char>_<weapon>_{idle_0,idle_1,ready,windup,strike,victory,crit,combo,levelup}; shared: <char>_{cast,hurt,defend,kneel,ko,combo,levelup} (combo and levelup alias the primary weapon frame)',
            'frames': rects, 'anims': anims}
    write_json(os.path.join(DST, 'party_battle.json'), meta)
    contact([(n, f) for n, f in allf + extra], os.path.join(OUT, 'party_battle_4x.png'), scale=4, cols=11,
            title='party_battle 32x40 at 4x (facing left)')
    return allf, per_char


if __name__ == '__main__':
    allf, per = build()
    print(len(allf), 'battle frames')
