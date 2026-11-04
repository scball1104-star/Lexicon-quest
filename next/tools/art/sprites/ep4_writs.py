"""The Forged Writs (E4-sprites): `writ_silence` and `writ_oblivion`, the Paper Regent's phase 2 adds. A small new
sprite drawn in code at 1x (no painting to cut): a scroll hung open on a brass stand, a wax seal at its foot and a
ribbon. One drawing routine, two recolours with their own marks (the ep3_coils.py approach):

  writ_silence   cream vellum, a violet ribbon and a violet seal, a hush mark (a struck mouth) in faded ink;
                 it mends the Regent, so its idle is the seal glowing
  writ_oblivion  grey-black vellum (ink soaked through), a red ribbon and a black seal, its lines scratched out;
                 it stamps the Regent, so its attack swings the seal forward

Every frame is a re-render of the same drawing with different parameters (glow, bob, lean, unroll), so the derived
frames stay clean pixels instead of resampled ones.

    base()           -> {id: rgba}  facing RIGHT, origin bottom-centre
    derived(id, img) -> {suffix: rgba} on the anim_frames canvas (idle_1, attack, hurt, cast)
"""
import numpy as np
import pal as P
from pix import hex2rgb, blank
import anim_frames as AF
import cleanup as CL

W, H = 34, 50
CX = 16.5


def C(ref):
    c = np.array(hex2rgb(P.color(ref, 'writ')), np.float32) / 255
    return np.array([c[0], c[1], c[2], 1.0], np.float32)


KINDS = {
    'writ_silence': dict(sheet=['stone_warm:2', 'stone_warm:3', 'stone_warm:4', 'stone_warm:5', 'metal:4'],
                         ink='cloth_purple:2', ribbon=['cloth_purple:1', 'cloth_purple:2', 'cloth_purple:3'],
                         seal=['cloth_purple:1', 'cloth_purple:3', 'cloth_purple:4', 'cloth_purple:5'],
                         glow=['magic_violet:2', 'magic_violet:3', 'magic_violet:4']),
    'writ_oblivion': dict(sheet=['shadow:1', 'shadow:2', 'stone_cool:2', 'stone_cool:3', 'stone_cool:4'],
                          ink='shadow:0', ribbon=['roof_red:1', 'roof_red:2', 'roof_red:3'],
                          seal=['shadow:0', 'ink:1', 'ink:2', 'ink:3'],
                          glow=['roof_red:3', 'roof_red:4', 'fire:3']),
}
BRASS = ['wood:1', 'wood:3', 'gold:2', 'gold:3', 'gold:4']


def put(cv, x, y, ref):
    x, y = int(x), int(y)
    if 0 <= x < W and 0 <= y < H:
        cv[y, x] = C(ref)


def stand(cv, lean=0.0):
    """a brass stand: a T-bar top, a thin post and a three-step foot, lit on the left"""
    for y in range(8, 44):
        x = int(round(CX + lean * (44 - y) / 36))
        put(cv, x - 1, y, BRASS[1]); put(cv, x, y, BRASS[3]); put(cv, x + 1, y, BRASS[2])
    for y, half in ((44, 3), (45, 5), (46, 7), (47, 8), (48, 9)):
        for x in range(int(CX - half), int(CX + half) + 1):
            k = 3 if x < CX - half * 0.4 else (2 if x < CX + half * 0.4 else 1)
            if y == 48:
                k = 0 if x > CX else 1
            put(cv, x, y, BRASS[k])
    tx = int(round(CX + lean))
    for x in range(tx - 12, tx + 13):
        put(cv, x, 7, BRASS[3] if x < tx else BRASS[2]); put(cv, x, 8, BRASS[1])
    for x in (tx - 13, tx + 13):
        put(cv, x, 6, BRASS[4]); put(cv, x, 7, BRASS[3]); put(cv, x, 8, BRASS[2]); put(cv, x, 9, BRASS[1])


def sheet(cv, kind, bob=0, lean=0.0, unroll=0, scratch=False):
    """the scroll hangs from the bar: a curled top roll, the sheet with ink lines, a bottom roll"""
    sp = KINDS[kind]
    s = sp['sheet']
    tx = CX + lean
    top, bot = 9 + bob, 33 + bob + unroll
    for y in range(top, bot + 1):
        sway = lean * 0.15 * (y - top) / max(1, bot - top)
        x0, x1 = int(round(tx - 9 + sway)), int(round(tx + 9 + sway))
        for x in range(x0, x1 + 1):
            k = 2
            if x <= x0 + 1:
                k = 3
            elif x >= x1 - 1:
                k = 1
            if (y - top) % 9 == 8:
                k = max(0, k - 1)       # a fold line
            put(cv, x, y, s[k])
        # ink lines (the forged text)
        if top + 3 <= y <= bot - 4 and (y - top) % 3 == 1:
            for x in range(x0 + 3, x1 - 2):
                if (x * 7 + y * 3) % 11 < 8:
                    put(cv, x, y, sp['ink'])
            if scratch:
                for x in range(x0 + 3, x1 - 2, 2):
                    put(cv, x, y - 1, sp['ink'])
    for y, ramp in ((top - 1, (3, 4, 2)), (top, (2, 3, 1)), (bot + 1, (2, 3, 1)), (bot + 2, (1, 2, 0))):
        for x in range(int(round(tx - 10)), int(round(tx + 11))):
            k = ramp[1] if x < tx - 4 else (ramp[0] if x < tx + 4 else ramp[2])
            put(cv, x, y, s[k])
    return top, bot


def mark(cv, kind, top, lean=0.0):
    """silence: a struck-through mouth (a hush mark) in the middle of the sheet"""
    if kind != 'writ_silence':
        return
    sp = KINDS[kind]
    tx = int(round(CX + lean))
    y = top + 13
    for x in range(tx - 4, tx + 5):
        put(cv, x, y, sp['ink'])
    for i in range(-3, 4):
        put(cv, tx + i, y + (1 if abs(i) < 2 else 0), sp['ink'])          # the closed mouth
    for i in range(-6, 7):
        put(cv, tx + i, y, 'roof_red:3')                                    # struck through in red


def seal(cv, kind, bot, lean=0.0, glow=0.5, swing=0):
    """the wax seal at the sheet's foot on two ribbon tails; `swing` pushes it toward the party"""
    sp = KINDS[kind]
    cx, cy = CX + lean * 0.3 + 4 + swing, bot + 6
    for i in range(6):
        put(cv, cx - 3 + i * 0.2, bot + 2 + i, sp['ribbon'][1 if i < 4 else 0])
        put(cv, cx + 2 + i * 0.4, bot + 2 + i, sp['ribbon'][2 if i < 3 else 1])
    r = 3.6
    for y in range(int(cy - 5), int(cy + 6)):
        for x in range(int(cx - 5), int(cx + 6)):
            dx, dy = x + 0.5 - cx, y + 0.5 - cy
            d = np.hypot(dx, dy)
            if d > r:
                continue
            lam = (-dx - dy) / r
            k = 0 if d > r - 0.9 else (3 if lam > 0.5 else (2 if lam > -0.2 else 1))
            put(cv, x, y, sp['seal'][k])
    g = sp['glow'][min(2, int(glow * 2.99))]
    put(cv, cx - 0.5, cy - 0.5, g); put(cv, cx + 0.5, cy - 0.5, g)
    if glow > 0.7:
        put(cv, cx - 0.5, cy + 0.5, sp['glow'][1])


def draw(kind, glow=0.5, bob=0, lean=0.0, unroll=0, swing=0, hurt=False):
    cv = blank(W, H)
    stand(cv, lean * 0.4)
    top, bot = sheet(cv, kind, bob=bob, lean=lean, unroll=unroll, scratch=(kind == 'writ_oblivion'))
    mark(cv, kind, top, lean)
    seal(cv, kind, bot, lean, 0.0 if hurt else glow, swing)
    img = CL.ramp_outline(cv)
    al = img[..., 3] > 0.5
    p = np.pad(al, 1)
    edge = al & (~p[:-2, 1:-1] | ~p[1:-1, :-2])
    from pix import to_oklab
    lab = to_oklab(img[..., :3].reshape(-1, 3)).reshape(img.shape[:2] + (3,))
    img[edge & (lab[..., 0] < 0.42)] = C('stone_warm:3' if kind == 'writ_oblivion' else 'gold:3')
    return img


def base():
    return {k: draw(k) for k in KINDS}


def _onto(base_img, frame):
    cvs = AF.canvas(base_img)
    out = blank(*cvs.shape[1::-1])
    h, w = frame.shape[:2]
    out[AF.PAD:AF.PAD + h, AF.PAD:AF.PAD + w] = frame
    return out


def derived(kind, base_img):
    out = {}
    out['idle_1'] = _onto(base_img, draw(kind, glow=1.0, bob=-1))
    out['attack'] = _onto(base_img, draw(kind, glow=1.0, lean=2.5, swing=2))
    out['cast'] = AF.sparkles(_onto(base_img, draw(kind, glow=1.0, unroll=2)),
                              [(int(CX), -3, 2), (int(CX) + 8, 0, 1), (int(CX) - 7, -2, 1)],
                              KINDS[kind]['glow'])
    hurt = draw(kind, lean=-2.0, hurt=True)
    out['hurt'] = AF.edge_lift(_onto(base_img, hurt), 2, prefer=('stone_warm', 'shadow', 'wood', 'gold'))
    return out


if __name__ == '__main__':
    import os
    from pix import contact, OUT
    items = []
    for k in KINDS:
        items += [(k, draw(k)), (k + ' idle1', draw(k, glow=1.0, bob=-1)), (k + ' attack', draw(k, glow=1.0, lean=2.5, swing=2)),
                  (k + ' hurt', draw(k, hurt=True, lean=-2))]
    os.makedirs(os.path.join(OUT, 'ep4'), exist_ok=True)
    contact(items, os.path.join(OUT, 'ep4', 'writs_8x.png'), scale=8, cols=4, bg=(24, 34, 40))
