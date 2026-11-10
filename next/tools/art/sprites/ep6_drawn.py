"""The Episode 6 foes drawn in code at 1x (E6-sprites; no painting to cut, so every derived frame is a re-render of the same
drawing with different parameters, never a resample; the ep5_futures.py approach):

  storm_page      the Storm-Marked Page (an aloft add of F3): a loose page torn at its foot, one corner dog-eared, its
                  old ink lines written over with storm-blue runes and an ink eye in a swirl at its centre. The Lost Page's
                  idea, drawn larger (about 40 x 46) so it reads beside the other foes; it hovers over its own shadow.
  false_beacon    the False Beacon (the Scribe's phase 2 add, aloft): a lamp on a broken mast, about 40 x 60. The mast
                  is snapped above the lamp and leans; a spar with cut rigging; a brass cage lamp whose flame is an
                  almond eye with a slit pupil (its light says home, and it is lying); a halo of dithered lamplight; a
                  stump of planks for a foot and a ground shadow.
  broken_compass  the Broken Compass (the Scribe's phase 2 add, grounded): a brass compass rose about 48 x 48 standing
                  on a small gimbal stand: a brass ring, a cream face with an eight-point rose (cobalt and white), a
                  red-and-white needle snapped in the middle (the north half skewed), a crack across the glass, and a
                  ground shadow.

Contrast rule as ep6_enemies.py: a full dark outline and the side rim (white aloft, brass grounded); the shadows and the
halo take no outline. Frames face RIGHT (toward the party), origin bottom-centre.

    base()           -> {id: rgba}
    derived(id, img) -> {suffix: rgba} on the anim_frames canvas (idle_1, attack, hurt, cast)
"""
import numpy as np
import pal as P
from pix import hex2rgb, blank
import anim_frames as AF
import cleanup as CL

SIZES = {'storm_page': (44, 50), 'false_beacon': (46, 64), 'broken_compass': (50, 58)}


def C(ref):
    c = np.array(hex2rgb(P.color(ref, 'ep6_drawn')), np.float32) / 255
    return np.array([c[0], c[1], c[2], 1.0], np.float32)


class Canvas:
    def __init__(self, w, h):
        self.a = blank(w, h)
        self.w, self.h = w, h

    def put(self, x, y, ref, only_empty=False):
        x, y = int(round(x)), int(round(y))
        if 0 <= x < self.w and 0 <= y < self.h:
            if only_empty and self.a[y, x, 3] > 0.5:
                return
            self.a[y, x] = C(ref)

    def line(self, x0, y0, x1, y1, ref, only_empty=False):
        n = int(max(abs(x1 - x0), abs(y1 - y0))) + 1
        for i in range(n + 1):
            self.put(x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n, ref, only_empty)

    def rows(self, rows, leg, x0, y0):
        for j, row in enumerate(rows):
            for i, ch in enumerate(row):
                if ch != '.':
                    self.put(x0 + i, y0 + j, leg[ch])


def finish(cv, side, shadow_rows, cx, rx, ry=2.4, lamp=None, halo=0.0):
    """outline everything, the side rim, then the ground shadow (dithered, only where nothing stands) and a halo"""
    import ep6_enemies as E6
    img = CL.ramp_outline(cv.a)
    al = img[..., 3] > 0.5
    p = np.pad(al, 1)
    ring = (p[:-2, 1:-1] | p[2:, 1:-1] | p[1:-1, :-2] | p[1:-1, 2:]) & ~al
    img[ring] = C('shadow:0')
    img = E6.side_rim(E6.dark_outline(img), side, min_nb=5)
    H, W = img.shape[:2]
    y0, y1 = shadow_rows
    cy = (y0 + y1) / 2.0
    for y in range(y0, min(H, y1 + 1)):
        for x in range(W):
            if ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1 and (x + y) % 2 == 0 and img[y, x, 3] < 0.5:
                img[y, x] = C('shadow:1')
    if lamp and halo > 0:
        lx, ly, r = lamp
        rr = r * (0.8 + 0.4 * halo)
        for y in range(H):
            for x in range(W):
                d = np.hypot(x + 0.5 - lx, (y + 0.5 - ly) * 1.1)
                if img[y, x, 3] < 0.5 and rr - 2.0 < d <= rr and (x + y) % 2 == 0:
                    img[y, x] = C('fire:4' if d < rr - 1.0 else 'gold:3')
    return img


# ----------------------------------------------------------------------------- the Storm-Marked Page
PAPER = ['stone_cool:3', 'stone_cool:4', 'stone_cool:5', 'metal:3']   # edge, shadow, base, light
RUNES = [['..x..', '.xxx.', 'x.x.x', '..x..', '.x.x.'], ['x...x', '.x.x.', '..x..', '.x.x.', 'x...x'],
         ['xxx..', '..x..', '..xxx', '....x', '...x.'], ['x....', 'xxxx.', '...x.', '.xxxx', '....x'], ['.xxx.', 'x....', '.xxx.', '....x', '.xxx.']]


def storm_page(bob=0, flap=0, lean=0.0, glow=0.0, hurt=False):
    W, H = SIZES['storm_page']
    cv = Canvas(W, H)
    x0, x1 = 7, 36
    top, bot = 5 + bob, 40 + bob
    cx = (x0 + x1) / 2.0

    def sx(y):
        return int(round(lean * (bot - y) / (bot - top)))

    def bend(x):
        # the side flaps lift (flap > 0) or droop at the outer six columns, like the Lost Page's flutter
        d = max(0, 6 - (x - x0)) if x < cx else max(0, 6 - (x1 - x))
        return -int(round(flap * d / 3.0))

    # the torn foot: a jagged bottom edge
    torn = {x: bot - (0, 1, 3, 1, 0, 2, 1, 0, 2, 3, 1)[(x * 7) % 11] for x in range(x0, x1 + 1)}
    for x in range(x0, x1 + 1):
        b = bend(x)
        for y in range(top, torn[x] + 1):
            yy = y + b
            if x >= x1 - 6 and y < top + (x - (x1 - 6)) + 0:     # the dog-eared corner is folded away
                continue
            k = 2
            if x <= x0 + 1 or x >= x1 - 1:
                k = 1
            if y == top:
                k = 3
            if x < cx - 9 and y > top + 2:
                k = 1 if (x + y) % 5 == 0 else 2
            cv.put(x + sx(yy), yy, PAPER[k])
    # the fold: the turned-down corner, its back side darker, a crease line
    for i in range(6):
        for j in range(6 - i):
            x, y = x1 - 6 + i + j, top + i
            if x <= x1:
                cv.put(x + sx(y + bend(x)), y + bend(x), 'stone_cool:3' if j else 'stone_cool:2')
    # the old words: rows of dark dashes
    for r, y in enumerate(range(top + 4, bot - 3, 3)):
        x = x0 + 3 + (r % 2)
        while x < x1 - 3:
            n = 2 + (x * 3 + r) % 4
            for i in range(n):
                xx = x + i
                if xx < x1 - 3 and not (x1 - 8 <= xx and y < top + 7):
                    yy = y + bend(xx)
                    cv.put(xx + sx(yy), yy, 'shadow:2' if not hurt else 'stone_cool:2')
            x += n + 2
    # the storm runes written over them: blue glyphs, brighter with glow
    rc = ('water:4', 'ice:2') if glow < 0.5 else ('ice:3', 'metal:4')
    if hurt:
        rc = ('stone_cool:2', 'stone_cool:3')
    spots = [(x0 + 3, top + 4), (x0 + 21, top + 8), (x0 + 3, top + 21), (x0 + 21, top + 22), (x0 + 12, top + 27)]
    # a storm stroke slashed across the old words first: a jagged bolt of blue from the upper left to the lower right
    bolt = [(x0 + 2, top + 12), (x0 + 8, top + 10), (x0 + 6, top + 14), (x0 + 13, top + 12)]
    bolt2 = [(x0 + 18, top + 21), (x0 + 24, top + 19), (x0 + 22, top + 23), (x0 + 28, top + 21)]
    for b_ in (bolt, bolt2):
        for (ax, ay), (bx, by) in zip(b_, b_[1:]):
            n = int(max(abs(bx - ax), abs(by - ay))) + 1
            for i in range(n + 1):
                xx = int(round(ax + (bx - ax) * i / n)); yy = int(round(ay + (by - ay) * i / n)) + bend(xx)
                cv.put(xx + sx(yy), yy, rc[0])
                cv.put(xx + sx(yy + 1), yy + 1, 'roof_blue:2' if not hurt else 'stone_cool:2')
    for i, (rx, ry) in enumerate(spots):
        g = RUNES[i % len(RUNES)]
        for j, row in enumerate(g):
            for k, ch in enumerate(row):
                if ch == 'x':
                    yy = ry + j + bend(rx + k)
                    cv.put(rx + k + sx(yy), yy, rc[0] if j < 3 else rc[1])
    # the eye in a swirl at the centre
    ex, ey = int(cx) + 1, top + 16
    swirl = [(-5, 0), (-5, -1), (-4, -2), (-3, -3), (-2, -3), (-1, -4), (0, -4), (1, -4), (2, -3), (3, -3), (4, -2), (5, -1),
             (5, 0), (5, 1), (4, 2), (3, 3), (2, 3), (1, 4), (0, 4), (-1, 4), (-2, 3), (-3, 2), (-4, 1)]
    for (dx, dy) in swirl:
        cv.put(ex + dx + sx(ey + dy), ey + dy, rc[0])
    EYE = ['.kkkkk.', 'kkWbbkk', 'kbbBbbk', 'kkbbbkk', '.kkkkk.']
    leg = {'k': 'ink:1', 'W': 'metal:4', 'b': 'water:3' if not hurt else 'ink:2', 'B': 'ink:0'}
    if glow >= 0.5:
        leg['b'] = 'ice:2'
    for j, row in enumerate(EYE if not hurt else ['.......', 'kkkkkkk', '.kkkkk.', '.......', '.......']):
        for i, ch in enumerate(row):
            if ch != '.':
                y = ey - 2 + j
                cv.put(ex - 3 + i + sx(y), y, leg[ch])
    img = finish(cv, 'aloft', (H - 6, H - 2), cx + 1, 13 - abs(bob))
    if glow > 0:
        img = sparkle(img, [(cx - 16, top - 1), (cx + 15, top + 3), (cx - 2, top - 4), (cx + 19, top + 18), (cx - 20, top + 20)],
                      ['ice:3', 'metal:4', 'water:4'])
    return img


def sparkle(img, pts, refs):
    out = img.copy()
    H, W = out.shape[:2]
    for i, (x, y) in enumerate(pts):
        x, y = int(x), int(y)
        if 0 <= x < W and 0 <= y < H and out[y, x, 3] < 0.5:
            out[y, x] = C(refs[i % len(refs)])
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                if i % 2 == 0 and 0 <= x + dx < W and 0 <= y + dy < H and out[y + dy, x + dx, 3] < 0.5:
                    out[y + dy, x + dx] = C(refs[(i + 1) % len(refs)])
    return out


# ----------------------------------------------------------------------------- the False Beacon
WOOD = ['shadow:1', 'shadow:2', 'stone_cool:2', 'stone_cool:3', 'stone_warm:3']   # weathered grey mast, dark to light


def false_beacon(bob=0, lean=0.0, glow=0.0, flick=0, hurt=False, sway=0):
    W, H = SIZES['false_beacon']
    cv = Canvas(W, H)
    foot = H - 7
    mx = 16                                                   # the mast's left column at the foot
    top = 11

    def mxat(y):
        # the mast leans a little toward the party as it rises; lean bends it further (attack / hurt)
        t = (foot - y) / float(foot - top)
        return mx + t * (2.0 + lean) + (sway * t * t)

    # the foot: a stump of three broken planks
    for (x0, x1, y0, ref) in ((7, 13, foot - 3, 'stone_warm:2'), (11, 26, foot - 1, 'stone_cool:2'), (22, 30, foot - 4, 'stone_warm:2')):
        for x in range(x0, x1 + 1):
            for y in range(y0, foot + 2):
                k = 'stone_warm:3' if y == y0 else (ref if y < foot + 1 else 'shadow:2')
                cv.put(x, y, k)
    # the mast: four columns, lit on the left
    for y in range(top, foot + 1):
        x = mxat(y)
        for i, k in enumerate((4, 3, 2, 1)):
            ref = WOOD[k]
            if (y * 5) % 13 == 0 and i in (1, 2):
                ref = WOOD[1]                                  # the grain
            cv.put(x + i, y, ref)
    # the break: splinters above the top
    tx = mxat(top)
    for (dx, dy, ref) in ((0, -1, WOOD[4]), (0, -2, WOOD[4]), (0, -3, WOOD[3]), (0, -4, WOOD[4]), (-1, -5, WOOD[4]),
                          (1, -1, WOOD[3]), (2, -1, WOOD[2]), (2, -2, WOOD[2]), (3, -2, WOOD[3]), (3, -3, WOOD[4]),
                          (4, -4, WOOD[4]), (3, -1, WOOD[1]), (1, -2, 'stone_warm:4')):
        cv.put(tx + dx, top + dy, ref)
    # the spar: a yard across the mast, snapped short on the left, its right end with cut rigging
    sy = top + 9
    sx0, sx1 = mxat(sy) - 5, mxat(sy) + 22
    for x in range(int(sx0), int(sx1) + 1):
        drop = int((x - sx0) / 14.0)                           # it sags
        cv.put(x, sy + drop, WOOD[4])
        cv.put(x, sy + drop + 1, WOOD[2])
    for (dx, dy) in ((-1, 0), (-2, -1), (-2, 1)):
        cv.put(sx0 + dx, sy + dy, WOOD[3])                     # the snapped end
    # rigging: two cut lines hanging from the spar, swaying
    for (rx, n) in ((sx0 + 2, 9), (sx1 - 1, 6)):
        for i in range(n):
            cv.put(rx + (sway if i > n // 2 else 0) + (1 if i % 4 == 3 else 0), sy + 2 + i + int((rx - sx0) / 14.0), 'path:1')
    # the lamp, hung from the spar: a hook, a brass cap, a cage of four bars round the glass, a base
    lx = int(round(sx1 - 6 + sway))
    ly = sy + 3 + bob
    lamp_cy = ly + 9
    cv.line(lx, sy + 2, lx, ly, 'gold:3')
    CAP = ['...kk...', '..kYYk..', '.kYYyyk.', 'kYYyyyyk']
    BASE = ['kYYyyyyk', '.kyyyyk.', '..kkkk..']
    leg = {'k': 'wood:0', 'Y': 'gold:4', 'y': 'gold:2'}
    cv.rows(CAP, leg, lx - 3, ly)
    # the glass: the light inside, bars only above and below the eye; an almond flame that is an eye
    gl = 'fire:5' if not hurt else 'stone_cool:4'
    gm = 'fire:4' if not hurt else 'stone_cool:3'
    for y in range(ly + 4, ly + 14):
        for x in range(lx - 3, lx + 5):
            edge = x in (lx - 3, lx + 4)
            bar = x in (lx - 1, lx + 2) and (y < ly + 6 or y > ly + 11)
            if edge:
                cv.put(x, y, 'gold:3' if x == lx - 3 else 'wood:1')
            elif bar:
                cv.put(x, y, 'wood:1')
            else:
                cv.put(x, y, gm if (y in (ly + 4, ly + 13) or x == lx + 3) else gl)
    # the eye: an almond with a dark slit pupil (flick moves the pupil a pixel)
    EYE = ['.rr.', 'rffr', 'fppf', 'rffr', '.rr.']
    eleg = {'r': 'roof_red:4', 'f': 'fire:4', 'p': 'wood:0'}
    if hurt:
        eleg = {'r': 'stone_cool:2', 'f': 'stone_cool:3', 'p': 'shadow:1'}
    elif glow >= 0.5:
        eleg = {'r': 'fire:3', 'f': 'fire:5', 'p': 'roof_red:1'}
    for j, row in enumerate(EYE):
        for i, ch in enumerate(row):
            if ch != '.':
                xx = lx - 1 + i
                if ch == 'p' and flick:
                    xx += 1 if i == 2 else 0
                    if i == 1:
                        cv.put(xx, ly + 6 + j, eleg['f'])
                        continue
                cv.put(xx, ly + 6 + j, eleg[ch])
    cv.rows(BASE, leg, lx - 3, ly + 14)
    halo = 0.5 + glow if not hurt else 0.0
    img = finish(cv, 'aloft', (H - 6, H - 2), 21, 16, lamp=(lx + 0.5, lamp_cy, 11), halo=halo)
    if glow > 0.5:
        img = sparkle(img, [(lx - 12, ly - 2), (lx + 11, ly + 2), (lx + 13, ly + 14), (lx - 13, ly + 16), (lx + 1, ly - 6)],
                      ['fire:5', 'gold:4', 'fire:4'])
    return img


# ----------------------------------------------------------------------------- the Broken Compass
def broken_compass(spin=0.0, lean=0.0, glow=0.0, hurt=False, jitter=0, bob=0):
    W, H = SIZES['broken_compass']
    cv = Canvas(W, H)
    cx, cy, R = 24.5, 23.5 + bob, 21.5
    foot = H - 6
    # the stand: a brass gimbal arc under the disc and a flat foot
    for x in range(14, 36):
        cv.put(x, foot, 'gold:3' if x < 30 else 'wood:1')
        cv.put(x, foot + 1, 'wood:1')
    for y in range(int(cy + R - 3), foot):
        cv.put(22, y, 'gold:4'); cv.put(23, y, 'gold:3'); cv.put(26, y, 'gold:3'); cv.put(27, y, 'wood:1')
    for x in range(20, 30):
        cv.put(x, foot - 2, 'gold:2')
    ang = np.radians(spin)

    def L(x, y):
        # lean: the disc tips toward the party (rows shift by height)
        return x + lean * (foot - y) / float(foot)

    a = cv.a
    for y in range(H):
        for x in range(W):
            dx, dy = x + 0.5 - cx, y + 0.5 - cy
            d = np.hypot(dx, dy)
            if d > R + 0.5:
                continue
            xx = int(round(L(x, y)))
            if d > R - 1.0:
                ref = 'gold:4' if dx + dy < -2 else ('gold:2' if dx + dy < 8 else 'wood:1')
            elif d > R - 3.2:
                ref = 'gold:3' if dx + dy < 0 else 'gold:2'
                if int((np.degrees(np.arctan2(dy, dx)) + 360) % 30) == 0:
                    ref = 'wood:0'                                   # the degree ticks
            elif d > R - 4.2:
                ref = 'wood:1'
            else:
                ref = 'stone_warm:5' if dx + dy < 10 else 'stone_warm:4'   # the cream face
                if hurt:
                    ref = 'stone_cool:4'
            cv.put(xx, y, ref)
    # the rose: four long points and four short, each split light and dark down its spine
    for k in range(8):
        th = ang + k * np.pi / 4
        long_ = k % 2 == 0
        rl = (R - 5.5) if long_ else (R - 10)
        wb = 3.2 if long_ else 2.4
        for i in range(200):
            t = i / 199.0
            r = t * rl
            half = wb * (1 - t)
            for s in np.linspace(-half, half, 7):
                px = cx + r * np.cos(th) - s * np.sin(th)
                py = cy + r * np.sin(th) + s * np.cos(th)
                light = s < 0
                if glow >= 0.5:
                    ref = 'ice:3' if light else 'water:4'
                elif hurt:
                    ref = 'stone_cool:3' if light else 'stone_cool:2'
                else:
                    ref = ('metal:4' if light else 'roof_blue:3') if long_ else ('roof_blue:3' if light else 'roof_blue:1')
                cv.put(L(px, py), py, ref)
    # the needle: red north, white south, snapped at the hub; the north half is skewed off true and jitters
    na = ang - np.pi / 2 + np.radians(24 + jitter * 9)
    sa = ang + np.pi / 2
    for (a0, ln, refs) in ((na, R - 7, ('roof_red:4', 'roof_red:2')), (sa, R - 9, ('metal:4', 'stone_cool:4'))):
        for i in range(120):
            t = i / 119.0
            r = 3 + t * ln
            half = 1.8 * (1 - t)
            for s in np.linspace(-half, half, 5):
                px = cx + r * np.cos(a0) - s * np.sin(a0)
                py = cy + r * np.sin(a0) + s * np.cos(a0)
                cv.put(L(px, py), py, refs[0] if s < 0 else refs[1])
    # the hub (a brass pin) and the broken stub of the north half left on it
    for (dx, dy, ref) in ((0, 0, 'gold:5'), (-1, 0, 'gold:4'), (0, -1, 'gold:4'), (1, 0, 'wood:1'), (0, 1, 'wood:1'),
                          (-1, -1, 'gold:3'), (1, 1, 'wood:0')):
        cv.put(L(cx - 0.5 + dx, cy + dy), cy - 0.5 + dy, ref)
    for i in range(3):
        px = cx + (1.5 + i) * np.cos(ang - np.pi / 2)
        py = cy + (1.5 + i) * np.sin(ang - np.pi / 2)
        cv.put(L(px, py), py, 'roof_red:2')
    # the crack across the glass: a jagged dark line with a lit lip
    pts = [(-14, -9), (-8, -6), (-5, -1), (1, 1), (5, 6), (11, 8), (15, 13)]
    for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
        n = max(abs(x1 - x0), abs(y1 - y0))
        for i in range(n + 1):
            x = cx + x0 + (x1 - x0) * i / n
            y = cy + y0 + (y1 - y0) * i / n
            cv.put(L(x, y), y, 'shadow:0' if not hurt else 'metal:4')
            cv.put(L(x, y) + 1, y - 1, 'metal:4' if not hurt else 'stone_cool:2')
    img = finish(cv, 'ground', (H - 5, H - 1), 25, 17)
    if glow > 0:
        img = sparkle(img, [(cx - 25, cy - 6), (cx + 24, cy - 12), (cx - 20, cy + 14), (cx + 22, cy + 12), (cx, cy - 25)],
                      ['ice:3', 'metal:4', 'water:4'])
    return img


# ----------------------------------------------------------------------------- frames
DRAW = {'storm_page': storm_page, 'false_beacon': false_beacon, 'broken_compass': broken_compass}
POSES = {
    'storm_page': {'base': {}, 'idle_1': dict(bob=-1, flap=1), 'attack': dict(lean=4.0, flap=-1, glow=0.3),
                   'cast': dict(bob=-2, flap=2, glow=1.0), 'hurt': dict(lean=-3.0, flap=-1, hurt=True)},
    'false_beacon': {'base': {}, 'idle_1': dict(flick=1, sway=1, bob=1), 'attack': dict(lean=3.0, glow=0.6, sway=2),
                     'cast': dict(glow=1.0, flick=1, sway=-1), 'hurt': dict(lean=-2.0, hurt=True, sway=-1)},
    'broken_compass': {'base': {}, 'idle_1': dict(spin=4.0, jitter=1), 'attack': dict(spin=30.0, lean=3.0, jitter=-1),
                       'cast': dict(spin=22.5, glow=1.0, jitter=1, bob=-1), 'hurt': dict(spin=-8.0, lean=-2.0, hurt=True)},
}
IDS = list(DRAW)


def draw(eid, pose='base'):
    return DRAW[eid](**POSES[eid][pose])


def base():
    return {k: draw(k) for k in IDS}


def _onto(base_img, frame):
    cvs = AF.canvas(base_img)
    out = blank(*cvs.shape[1::-1])
    h, w = frame.shape[:2]
    out[AF.PAD:AF.PAD + h, AF.PAD:AF.PAD + w] = frame
    return out


def derived(eid, base_img):
    out = {}
    for pose in ('idle_1', 'attack', 'cast'):
        out[pose] = _onto(base_img, draw(eid, pose))
    out['hurt'] = AF.edge_lift(_onto(base_img, draw(eid, 'hurt')), 2, prefer=('gold', 'wood', 'stone_cool', 'shadow', 'ink'))
    return out


if __name__ == '__main__':
    import os
    from pix import contact, OUT
    items = []
    for k in IDS:
        for pose in POSES[k]:
            items.append((f'{k} {pose}', draw(k, pose)))
    os.makedirs(os.path.join(OUT, 'ep6'), exist_ok=True)
    for bg, tag in (((214, 226, 240), 'cloud'), ((40, 44, 66), 'storm')):
        contact(items, os.path.join(OUT, 'ep6', f'drawn_6x_{tag}.png'), scale=6, cols=5, bg=bg)
