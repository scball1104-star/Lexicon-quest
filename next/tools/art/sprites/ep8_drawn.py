"""The Episode 8 foes drawn in code at 1x (E8-sprites; no painting to cut, so every derived frame is a re-render of the
same drawing with different parameters, never a resample; the ep6_drawn.py / ep7_drawn.py approach):

  struck_page   the Struck-Out Page (F3 and the Sentry's adds): the Lost Page's idea (a loose page with an ink eye) in
                violet ink, drawn at about 42 x 50 so it reads beside the other foes. Cream paper ruled with violet lines
                of writing, a torn foot, the eye at its centre, and a heavy black bar struck through it corner to corner
                with a gold edge. It hovers over its own shadow. (The Rime-Written Page of Episode 7 was frost blue and
                icicled; the Storm-Marked Page of Episode 6 grey with runes.)
  truth_grief   Rejected Truth: Grief (the Eraser's phase 2 mender), about 40 x 48: a small hooded figure made of wet
                pages: a hood and cloak of overlapping cream leaves gone grey and blue where they are soaked, ink running
                down them in streaks, a dark face under the hood with two pale tear lines, drops of ink falling from the
                hem. Ground shadow. (Episode 2's False Sorrow was a mirror shard; this is paper and water.)
  truth_change  Rejected Truth: Change (the warder), about 40 x 56: a tall standing page with a door cut into it, the
                door ajar on warm gold light, the page's top corner turning over; it stands on its own shadow.

Contrast rule as ep8_enemies.py: a full dark outline and the warm gilt rim; the shadows take no outline. Frames face RIGHT
(toward the party), origin bottom-centre.

    base()           -> {id: rgba}
    derived(id, img) -> {suffix: rgba} on the anim_frames canvas (idle_1, attack, hurt, cast)
"""
import numpy as np
from pix import blank
import anim_frames as AF
import cleanup as CL
from ep6_drawn import Canvas, C, sparkle

SIZES = {'struck_page': (44, 52), 'truth_grief': (42, 50), 'truth_change': (42, 58)}


def finish(cv, shadow_rows, cx, rx, ry=2.4):
    """outline everything, the gilt rim, then the ground shadow (dithered, only where nothing stands)"""
    import ep8_enemies as E8
    img = CL.ramp_outline(cv.a)
    al = img[..., 3] > 0.5
    p = np.pad(al, 1)
    ring = (p[:-2, 1:-1] | p[2:, 1:-1] | p[1:-1, :-2] | p[1:-1, 2:]) & ~al
    img[ring] = C('shadow:0')
    img = E8.side_rim(E8.dark_outline(img), 'gilt', min_nb=5, right=True)
    H, W = img.shape[:2]
    y0, y1 = shadow_rows
    cy = (y0 + y1) / 2.0
    for y in range(y0, min(H, y1 + 1)):
        for x in range(W):
            if ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1 and (x + y) % 2 == 0 and img[y, x, 3] < 0.5:
                img[y, x] = C('shadow:1')
    return img


# ----------------------------------------------------------------------------- the Struck-Out Page
PAPER = ['stone_warm:3', 'stone_warm:4', 'stone_warm:5', 'metal:4']      # edge, shadow, base, light


def struck_page(bob=0, flap=0, lean=0.0, glow=0.0, hurt=False):
    W, H = SIZES['struck_page']
    cv = Canvas(W, H)
    x0, x1 = 7, 35
    top, bot = 7 + bob, 40 + bob
    cx = (x0 + x1) / 2.0

    def sx(y):
        return int(np.floor(lean * (bot - y) / (bot - top) + 0.5))

    def bend(x):
        d = max(0, 6 - (x - x0)) if x < cx else max(0, 6 - (x1 - x))
        return -int(round(flap * d / 3.0))

    torn = {x: bot - (0, 2, 1, 3, 0, 1, 2, 0, 3, 1, 0)[(x * 5) % 11] for x in range(x0, x1 + 1)}
    for x in range(x0, x1 + 1):
        b = bend(x)
        for y in range(top, torn[x] + 1):
            yy = y + b
            k = 2
            if x <= x0 + 1 or x >= x1 - 1:
                k = 1
            if y == top:
                k = 3
            if x > cx + 8 and y > top + 2:
                k = 1 if (x + y) % 6 == 0 else 2
            cv.put(x + sx(yy), yy, PAPER[k] if not hurt else ('stone_cool:4' if k < 2 else 'stone_cool:5'))
    # violet ruled lines with words on them in short ink dashes
    for r, y in enumerate(range(top + 4, bot - 3, 4)):
        for x in range(x0 + 2, x1 - 1):
            yy = y + bend(x)
            cv.put(x + sx(yy), yy, 'cloth_purple:4' if not hurt else 'stone_cool:3')
        x = x0 + 3 + (r % 3)
        while x < x1 - 3:
            n = 2 + (x * 3 + r) % 4
            for i in range(n):
                xx = x + i
                if xx < x1 - 3:
                    yy = y - 1 + bend(xx)
                    cv.put(xx + sx(yy), yy, 'hair_violet:3' if not hurt else 'stone_cool:3')
            x += n + 2
    # the eye at the centre, violet iris
    ex, ey = int(cx), top + 15
    EYE = ['..kWWWWWk..', '.kWWkkkWWk.', 'kWkvVVVvkWk', 'kkvVVBVVvkk', '.kkvvvvvkk.', '..kkkkkkk..']
    leg = {'k': 'ink:1', 'W': 'metal:4', 'v': 'cloth_purple:3', 'V': 'cloth_purple:4', 'B': 'shadow:0'}
    if glow >= 0.5:
        leg.update({'v': 'gold:4', 'V': 'gold:5'})
    rows = EYE if not hurt else ['..kWWWWWk..', '.kWWWWWWWk.', 'kkkkkkkkkkk', '...........', '...........', '...........']
    for j, row in enumerate(rows):
        for i, ch in enumerate(row):
            if ch != '.':
                y = ey - 2 + j
                cv.put(ex - 5 + i + sx(y), y, leg[ch])
    # the bar struck through it: a heavy ink stroke from the upper left over the edge to the lower right, a gold lip
    # on its upper side (it is the struck line the Page charges)
    for t in range(0, 46):
        x = x0 - 4 + t * (x1 - x0 + 8) / 45.0
        y = top + 2 + t * (bot - top - 2) / 45.0 * 0.78
        for w in range(-1, 2):
            yy = int(round(y)) + w
            cv.put(int(round(x)) + sx(yy), yy, 'shadow:0' if w > -1 else ('gold:4' if glow < 0.5 else 'gold:5'))
    img = finish(cv, (H - 5, H - 2), cx + 1, 12 - abs(bob))
    if glow > 0:
        img = sparkle(img, [(cx - 16, top - 2), (cx + 15, top + 3), (cx - 2, top - 5), (cx + 19, top + 18), (cx - 20, top + 20)],
                      ['gold:5', 'gold:4', 'cloth_purple:4'])
    return img


# ----------------------------------------------------------------------------- Grief
WET = ['stone_cool:2', 'stone_cool:3', 'stone_cool:4', 'stone_cool:5', 'stone_warm:5']    # soaked to dry, dark to light


def truth_grief(bob=0, lean=0.0, glow=0.0, hurt=False, drip=0):
    """a small hooded figure of wet pages: the leaves overlap like a cloak (each leaf a rounded tongue, lighter at its
    upper edge and soaked darker toward its foot), the hood a fold of two leaves round a dark face; ink runs down the
    leaves in streaks and drips from the hem"""
    W, H = SIZES['truth_grief']
    cv = Canvas(W, H)
    cx = W / 2.0 - 1
    foot = H - 6 + bob
    hood_top = 6 + bob

    def sx(y):
        return int(np.floor(lean * (foot - y) / float(foot - hood_top) + 0.5))

    # the cloak: pages hanging like shingles, three tiers, each page a tall leaf with a sagging, torn foot; the dry top of
    # each page cream, the rest soaked grey-blue, darkest at the foot where the water gathers
    tiers = [(hood_top + 12, 8, 4, 0), (hood_top + 19, 11, 5, 2), (hood_top + 26, 14, 6, 1)]
    for r, (yy, half, n, off) in enumerate(tiers):
        pw = (2 * half) / float(n)
        for i in range(n):
            lx0 = cx - half + i * pw - 1
            lx1 = lx0 + pw + 1
            ln = 11 + ((i * 5 + r * 3) % 3)
            for y in range(yy, min(foot + 1, yy + ln)):
                sag = int(round(1.5 * np.sin((y - yy) / 3.0 + i + r)))
                for x in range(int(round(lx0)) + sag, int(round(lx1)) + sag + 1):
                    if y >= yy + ln - 1 - ((x * 3 + i) % 3):
                        continue                     # the torn foot
                    t = (y - yy) / float(ln)
                    k = 4 if (y - yy) < 2 else (3 if t < 0.35 else (2 if t < 0.62 else (1 if t < 0.85 else 0)))
                    if x == int(round(lx0)) + sag:
                        k = 0                        # the shadowed left edge of each page
                    elif x == int(round(lx0)) + sag + 1 and k > 1:
                        k -= 1
                    if hurt:
                        k = min(k + 1, 4)
                    cv.put(x + sx(y), y, WET[k])
                # a ruled line or two on the dry top of each page
                if (y - yy) in (3, 6) and r < 2:
                    for x in range(int(round(lx0)) + 2, int(round(lx1)) - 1):
                        if (x + y) % 4:
                            cv.put(x + sag + sx(y), y, 'stone_cool:3')
    # the hood: a page curled over the head, cream at its rim, ruled, with the face a dark hollow inside
    for y in range(hood_top, hood_top + 15):
        t = (y - hood_top) / 15.0
        half = 2 + int(round(7 * min(1.0, t * 1.7)))
        for x in range(int(cx - half), int(cx + half) + 1):
            k = 4 if y <= hood_top + 1 or x <= cx - half + 1 else (3 if x < cx else 2)
            if x >= cx + half - 1:
                k = 1
            if (y - hood_top) % 4 == 3 and cx - half + 2 < x < cx + half - 1:
                k = min(k, 2)
            cv.put(x + sx(y), y, WET[k] if not hurt else WET[min(k + 1, 4)])
    for y in range(hood_top + 5, hood_top + 14):
        half = min(4, 1 + (y - hood_top - 5))
        for x in range(int(cx - half), int(cx + half) + 1):
            cv.put(x + sx(y) + 1, y, 'shadow:0' if y < hood_top + 12 else 'ink:1')
    # the face: two pale tear lines running from the dark down over the hood's lip
    for (dx, n) in ((-1, 7), (3, 6)):
        for k in range(n):
            y = hood_top + 9 + k
            cv.put(int(cx) + dx + sx(y), y, 'ice:2' if k < n - 2 else 'stone_cool:4')
    # ink running down the pages in streaks, pooling at their feet
    for (x, y0, n) in ((cx - 8, hood_top + 15, 11), (cx - 2, hood_top + 21, 12), (cx + 5, hood_top + 14, 13),
                       (cx + 10, hood_top + 24, 9), (cx - 12, hood_top + 27, 7)):
        for k in range(n):
            y = y0 + k
            cv.put(int(x) + sx(y), y, 'ink:3' if k % 3 else 'ink:2')
        cv.put(int(x) + 1 + sx(y0 + n - 1), y0 + n - 1, 'ink:2')
    # drops of ink falling from the hem
    for (x, y) in ((cx - 7, foot + 1 + drip), (cx + 2, foot + 2 - drip), (cx + 9, foot + drip)):
        if y < H - 3:
            cv.put(int(x), int(y), 'ink:3')
    img = finish(cv, (H - 5, H - 2), cx + 1, 11)
    if glow > 0:
        img = sparkle(img, [(cx - 14, hood_top), (cx + 13, hood_top + 5), (cx, hood_top - 4), (cx + 16, hood_top + 22)],
                      ['ice:3', 'stone_cool:5', 'cloth_purple:4'])
    return img


# ----------------------------------------------------------------------------- Change
PAGE = ['stone_warm:3', 'stone_warm:4', 'stone_warm:5', 'metal:4']


def truth_change(lean=0.0, glow=0.0, hurt=False, turn=0, open_=0):
    """a tall page standing on its foot, an arched door cut into it, the door ajar on gold light; the top corner of the
    page turning over (turn lifts it further)"""
    W, H = SIZES['truth_change']
    cv = Canvas(W, H)
    x0, x1 = 8, 33
    top, foot = 5, H - 5

    def L(x, y):
        return x + int(np.floor(lean * (foot - y) / float(foot - top) + 0.5))

    fold = 7 + turn               # the turned corner's size (top right)
    for y in range(top, foot + 1):
        for x in range(x0, x1 + 1):
            if x - x0 > (x1 - x0) - fold + (y - top) and y - top < fold:
                continue          # the corner is folded away
            k = 2
            if x <= x0 + 1:
                k = 3
            elif x >= x1 - 1:
                k = 1
            if (x * 7 + y * 3) % 23 == 0:
                k = 1
            if hurt:
                k = min(k, 1)
            cv.put(L(x, y), y, PAGE[k])
    # ruled lines across the page, around the door
    dx0, dx1, dy0 = x0 + 7, x1 - 7, top + 18
    for y in range(top + 5, foot - 2, 5):
        for x in range(x0 + 3, x1 - 2):
            if dx0 - 1 <= x <= dx1 + 1 and y >= dy0 - 2:
                continue
            if x - x0 > (x1 - x0) - fold + (y - top) - 1 and y - top < fold + 1:
                continue
            if (x * 5 + y) % 9 not in (0, 4):
                cv.put(L(x, y), y, 'hair_violet:3' if not hurt else 'stone_cool:3')
    # the door: an arched hole cut in the page, the dark beyond, the door leaf ajar on gold light
    for y in range(dy0, foot + 1):
        for x in range(dx0, dx1 + 1):
            u = (x - dx0) / float(dx1 - dx0)
            arch = dy0 + int(round(5 * (2 * u - 1) ** 2))
            if y < arch:
                continue
            edge = x in (dx0, dx1) or y == arch
            if edge:
                cv.put(L(x, y), y, 'stone_warm:2')
            else:
                gx = dx1 - 2 - open_
                if x >= gx:
                    cv.put(L(x, y), y, 'gold:5' if x == gx else 'gold:4')     # the warm light through the gap
                else:
                    cv.put(L(x, y), y, 'hair_violet:2' if (x + y) % 2 else 'hair_violet:1')
    # the door leaf, swung in: a narrower panel with a gold knob
    for y in range(dy0 + 3, foot + 1):
        for x in range(dx0 + 1, dx1 - 3 - open_):
            k = 1 if x == dx0 + 1 else 2
            cv.put(L(x, y), y, PAGE[k] if not hurt else 'stone_cool:4')
    cv.put(L(dx1 - 5 - open_, (dy0 + foot) // 2 + 2), (dy0 + foot) // 2 + 2, 'gold:4')
    # the turned corner: the back of the page folded down over the front (a solid triangle, its fold line dark, the
    # crease's shadow cast on the page below it)
    for i in range(fold):
        for j in range(i + 1):
            x, y = x1 - fold + 1 + j, top + i
            cv.put(L(x, y), y, 'stone_warm:3' if (j == i) else ('stone_warm:4' if j < i - 1 else 'stone_warm:5'))
        x, y = x1 - fold + 1 + i + 1, top + i + 1
        if i < fold - 1:
            cv.put(L(x - 1, y), y, 'stone_warm:2')
    img = finish(cv, (H - 5, H - 2), (x0 + x1) / 2.0 + 1, 14)
    if glow > 0:
        img = sparkle(img, [(dx1 + 2, dy0 - 3), (dx0 - 4, dy0 + 2), (x1 + 3, top + 14), (x0 - 3, top + 6), (dx1 + 4, foot - 8)],
                      ['gold:5', 'gold:4', 'metal:4'])
    return img


# ----------------------------------------------------------------------------- frames
DRAW = {'struck_page': struck_page, 'truth_grief': truth_grief, 'truth_change': truth_change}
POSES = {
    'struck_page': {'base': {}, 'idle_1': dict(bob=-1, flap=1), 'attack': dict(lean=4.0, flap=-1, glow=0.3),
                    'cast': dict(bob=-2, flap=2, glow=1.0), 'hurt': dict(lean=-3.0, flap=-1, hurt=True)},
    'truth_grief': {'base': {}, 'idle_1': dict(bob=-1, drip=1), 'attack': dict(lean=3.0, drip=2),
                    'cast': dict(bob=-1, glow=1.0, drip=1), 'hurt': dict(lean=-3.0, hurt=True)},
    'truth_change': {'base': {}, 'idle_1': dict(turn=1, open_=1), 'attack': dict(lean=3.0, turn=2),
                     'cast': dict(glow=1.0, open_=3, turn=1), 'hurt': dict(lean=-2.0, hurt=True)},
}
IDS = list(DRAW)
CASTERS = ('struck_page', 'truth_grief', 'truth_change')


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
    out['hurt'] = AF.edge_lift(_onto(base_img, draw(eid, 'hurt')), 2, prefer=('stone_cool', 'shadow', 'ink', 'stone_warm'))
    return out


if __name__ == '__main__':
    import os
    from pix import contact, OUT
    items = []
    for k in IDS:
        for pose in POSES[k]:
            items.append((f'{k} {pose}', draw(k, pose)))
    os.makedirs(os.path.join(OUT, 'ep8'), exist_ok=True)
    for bg, tag in (((238, 230, 214), 'page'), ((52, 30, 84), 'void')):
        contact(items, os.path.join(OUT, 'ep8', f'drawn_6x_{tag}.png'), scale=6, cols=5, bg=bg)
