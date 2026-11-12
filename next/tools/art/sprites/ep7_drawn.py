"""The Episode 7 foes drawn in code at 1x (E7-sprites; no painting to cut, so every derived frame is a re-render of the
same drawing with different parameters, never a resample; the ep6_drawn.py approach):

  rimed_page   the Rime-Written Page (F3): the Lost Page's idea (a loose page with an ink eye) in a frost recolour, drawn
               larger (about 42 x 50) so it reads beside the other foes. Pale blue-white paper ruled with cold blue
               lines, a crust of rime along its top edge and corners, three icicles hanging from its torn foot, and an
               eye at its centre under frosted lids. It hovers over its own shadow. (The Storm-Marked Page of Episode 6
               was grey with storm runes and a swirl; this one is ruled, rimed and icicled.)
  closed_gate  the Closed Gate (the Phantom's phase 2 add, grounded), about 44 x 56: an iron gate leaf hung on a
               square stone post, its bars and rails iron, the gaps between them glazed with ice, an arched top rail
               with three finials, and a frozen padlock at the centre in a crust of ice. Ground shadow.
  lost_letter  the Lost Letter (the Phantom's phase 2 add), about 40 x 36: a folded letter, cream paper, its flap open
               and its red wax seal broken in two, inside a faceted shell of clear ice. It hovers over its own shadow.

Contrast rule as ep7_enemies.py: a full dark outline and the cool rim; the shadows take no outline. Frames face RIGHT
(toward the party), origin bottom-centre.

    base()           -> {id: rgba}
    derived(id, img) -> {suffix: rgba} on the anim_frames canvas (idle_1, attack, hurt, cast)
"""
import numpy as np
from pix import blank
import anim_frames as AF
import cleanup as CL
from ep6_drawn import Canvas, C, sparkle

SIZES = {'rimed_page': (44, 52), 'closed_gate': (48, 62), 'lost_letter': (44, 42)}


def finish(cv, shadow_rows, cx, rx, ry=2.4):
    """outline everything, the cool rim, then the ground shadow (dithered, only where nothing stands)"""
    import ep7_enemies as E7
    img = CL.ramp_outline(cv.a)
    al = img[..., 3] > 0.5
    p = np.pad(al, 1)
    ring = (p[:-2, 1:-1] | p[2:, 1:-1] | p[1:-1, :-2] | p[1:-1, 2:]) & ~al
    img[ring] = C('shadow:0')
    img = E7.side_rim(E7.dark_outline(img), 'frost', min_nb=5, right=True)
    H, W = img.shape[:2]
    y0, y1 = shadow_rows
    cy = (y0 + y1) / 2.0
    for y in range(y0, min(H, y1 + 1)):
        for x in range(W):
            if ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1 and (x + y) % 2 == 0 and img[y, x, 3] < 0.5:
                img[y, x] = C('shadow:1')
    return img


# ----------------------------------------------------------------------------- the Rime-Written Page
PAPER = ['stone_cool:4', 'stone_cool:5', 'ice:3', 'metal:4']      # edge, shadow, base, light


def rimed_page(bob=0, flap=0, lean=0.0, glow=0.0, hurt=False):
    W, H = SIZES['rimed_page']
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
    # the ruled lines: cold blue rules across the page, the old words on them in short dark dashes
    line = 'water:3' if not hurt else 'stone_cool:3'
    for r, y in enumerate(range(top + 4, bot - 3, 4)):
        for x in range(x0 + 2, x1 - 1):
            yy = y + bend(x)
            cv.put(x + sx(yy), yy, line)
        x = x0 + 3 + (r % 3)
        while x < x1 - 3:
            n = 2 + (x * 3 + r) % 4
            for i in range(n):
                xx = x + i
                if xx < x1 - 3:
                    yy = y - 1 + bend(xx)
                    cv.put(xx + sx(yy), yy, 'roof_blue:2' if not hurt else 'stone_cool:3')
            x += n + 2
    # the margin rule: a pale violet line down the left
    for y in range(top + 1, bot - 1):
        cv.put(x0 + 4 + sx(y + bend(x0 + 4)), y + bend(x0 + 4), 'magic_violet:2' if not hurt else 'stone_cool:3')
    # the eye at the centre under frosted lids
    ex, ey = int(cx), top + 16
    EYE = ['..kWWWWWk..', '.kWWkkkWWk.', 'kWkbIIIbkWk', 'kkbIIBIIbkk', '.kkbbbbbkk.', '..kkkkkkk..']
    leg = {'k': 'ink:1', 'W': 'metal:4', 'b': 'water:3', 'I': 'ice:2', 'B': 'ink:0'}
    if glow >= 0.5:
        leg.update({'b': 'ice:2', 'I': 'metal:4'})
    rows = EYE if not hurt else ['..kWWWWWk..', '.kWWWWWWWk.', 'kkkkkkkkkkk', '...........', '...........', '...........']
    for j, row in enumerate(rows):
        for i, ch in enumerate(row):
            if ch != '.':
                y = ey - 2 + j
                cv.put(ex - 5 + i + sx(y), y, leg[ch])
    # the rime crust: white crystals along the top edge and down the two top corners, standing a pixel proud
    rime = 'metal:4' if not hurt else 'stone_cool:5'
    for x in range(x0 - 1, x1 + 2):
        h = (0, 1, 2, 1, 0, 1, 0, 2, 1, 1)[(x * 7) % 10]
        for k in range(h + 1):
            yy = top - k + bend(min(max(x, x0), x1))
            cv.put(x + sx(yy), yy, rime if k == h else 'ice:3')
    for y in range(top, top + 9):
        for x in (x0 - 1, x1 + 1):
            if (y + x) % 3:
                yy = y + bend(x0 if x < cx else x1)
                cv.put(x + sx(yy), yy, 'ice:3')
    # icicles from the torn foot
    for (ix, n) in ((x0 + 5, 4), (int(cx) + 2, 6), (x1 - 4, 3)):
        yb = torn[ix] + bend(ix)
        for k in range(1, n + 1):
            cv.put(ix + sx(yb + k), yb + k, 'ice:2' if k < n - 1 else 'ice:3')
            if k < n // 2:
                cv.put(ix + 1 + sx(yb + k), yb + k, 'ice:1')
    img = finish(cv, (H - 5, H - 2), cx + 1, 12 - abs(bob))
    if glow > 0:
        img = sparkle(img, [(cx - 16, top - 2), (cx + 15, top + 3), (cx - 2, top - 5), (cx + 19, top + 18), (cx - 20, top + 20)],
                      ['metal:4', 'ice:3', 'ice:2'])
    return img


# ----------------------------------------------------------------------------- the Closed Gate
IRON = ['shadow:0', 'shadow:2', 'stone_cool:2', 'stone_cool:3']       # dark to light
STONE = ['stone_cool:2', 'stone_cool:3', 'stone_cool:4', 'stone_cool:5']


def closed_gate(lean=0.0, glow=0.0, hurt=False, shut=0, rattle=0):
    W, H = SIZES['closed_gate']
    cv = Canvas(W, H)
    foot = H - 6
    # the post: a square stone post on the left, a cap stone with snow on it
    px0, px1 = 6, 12
    for y in range(9, foot + 1):
        for x in range(px0, px1 + 1):
            k = 3 if x == px0 else (2 if x < px0 + 3 else 1)
            if (y * 3 + x) % 11 == 0:
                k = 0
            cv.put(x, y, STONE[k])
    for x in range(px0 - 1, px1 + 2):
        cv.put(x, 8, 'stone_cool:5'); cv.put(x, 7, 'metal:4' if x % 3 else 'ice:3')
    for x in range(px0, px1 + 1):
        cv.put(x, 6, 'metal:4')
    # the leaf: hung from the post, it leans toward the party with lean (attack) and shakes with rattle
    gx0, gx1 = px1 + 1, 41
    top = 14
    t = lean

    def L(x, y):
        # whole pixels only (Python's round() is to even, which tears a leaning row into dots)
        return x + int(np.floor(t * (foot - y) / float(foot - top) + 0.5)) + rattle

    def arch(x):
        u = (x - gx0) / float(gx1 - gx0)
        return top + int(round(6 * (2 * u - 1) ** 2))

    # ice glazing between the bars (behind the iron)
    for x in range(gx0 + 1, gx1):
        for y in range(arch(x) + 2, foot - 2):
            ref = 'ice:1' if (x + y) % 7 else 'ice:2'
            if (x - gx0) % 7 in (2, 3) and (y - top) % 9 < 3:
                ref = 'metal:4' if (x + y) % 2 else 'ice:3'           # frost glints
            if hurt:
                ref = 'stone_cool:4' if (x + y) % 3 else 'stone_cool:5'
            cv.put(L(x, y), y, ref)
    # the iron: the arched top rail, two straight rails, the bars, the hinge straps
    iron = IRON if not hurt else ['shadow:1', 'stone_cool:2', 'stone_cool:3', 'stone_cool:4']
    for x in range(gx0, gx1 + 1):
        y = arch(x)
        cv.put(L(x, y), y, iron[3]); cv.put(L(x, y + 1), y + 1, iron[2]); cv.put(L(x, y + 2), y + 2, iron[1])
        for yr in (30, foot - 3):
            cv.put(L(x, yr), yr, iron[3]); cv.put(L(x, yr + 1), yr + 1, iron[1])
    for bx in range(gx0, gx1 + 1, 7):
        for y in range(arch(bx), foot):
            cv.put(L(bx, y), y, iron[2]); cv.put(L(bx + 1, y), y, iron[1])
        # the finials: a spear point on each bar above the top rail (every other bar)
        if (bx - gx0) % 14 == 0:
            y = arch(bx)
            for (dx, dy, k) in ((0, -1, 3), (1, -1, 2), (0, -2, 3), (1, -2, 2), (0, -3, 3), (1, -4, 3)):
                cv.put(L(bx + dx, y + dy), y + dy, iron[k])
    for (yh) in (18, foot - 6):
        for x in range(px1 - 1, px1 + 6):
            cv.put(L(x, yh), yh, 'stone_cool:3'); cv.put(L(x, yh + 1), yh + 1, iron[1])
    # the frozen lock: a padlock on the middle rail, crusted with ice
    lx, ly = 26, 27 - shut
    LOCK = ['..kkkk..',
            '.kS..Sk.',
            '.kS..Sk.',
            'kkkkkkkk',
            'kGGGGGgk',
            'kGgkkGgk',
            'kGGkGGgk',
            'kggggggk',
            '.kkkkkk.']
    leg = {'k': 'shadow:0', 'S': 'stone_cool:5', 'G': 'metal:3', 'g': 'stone_cool:4'}
    if hurt:
        leg['G'] = 'stone_cool:5'
    for j, row in enumerate(LOCK):
        for i, ch in enumerate(row):
            if ch != '.':
                cv.put(L(lx + i, ly + j), ly + j, leg[ch])
    # the ice crust over the lock: white over its shoulders, an icicle under it
    crust = 'metal:4' if glow < 0.5 else 'ice:3'
    for (dx, dy) in ((0, 3), (1, 2), (2, 3), (5, 3), (6, 2), (7, 3), (3, 8), (4, 8), (1, 7), (6, 7)):
        cv.put(L(lx + dx, ly + dy), ly + dy, crust)
    for k in range(3):
        cv.put(L(lx + 4, ly + 9 + k), ly + 9 + k, 'ice:2' if k < 2 else 'ice:3')
    if glow > 0:
        for (dx, dy) in ((2, 5), (5, 5)):
            cv.put(L(lx + dx, ly + dy), ly + dy, 'magic_violet:4')
    img = finish(cv, (H - 5, H - 1), 25, 20)
    if glow > 0:
        img = sparkle(img, [(lx - 10, ly - 4), (lx + 16, ly - 6), (lx + 18, ly + 10), (lx - 12, ly + 12), (lx + 4, ly - 12)],
                      ['metal:4', 'ice:3', 'magic_violet:4'])
    return img


# ----------------------------------------------------------------------------- the Lost Letter
def lost_letter(bob=0, tilt=0.0, glow=0.0, hurt=False, open_=0):
    W, H = SIZES['lost_letter']
    cv = Canvas(W, H)
    cx = W / 2.0
    top = 5 + bob
    # the ice shell: a faceted block round the letter, clear ice with darker facets and white edges
    sx0, sx1, sy0, sy1 = 5, 38, top, top + 28

    def T(x, y):
        return int(np.floor(x + 0.5)) + int(np.floor(tilt * (y - (sy0 + sy1) / 2.0) / 14.0 + 0.5))

    for y in range(sy0, sy1 + 1):
        inset = max(0, 3 - (y - sy0), 3 - (sy1 - y))
        for x in range(sx0 + inset, sx1 - inset + 1):
            ref = 'ice:1'
            if (x - sx0) + (y - sy0) < 10 or x < sx0 + inset + 2:
                ref = 'ice:2'
            if x > sx1 - inset - 3 or y > sy1 - 2:
                ref = 'water:3'
            if hurt:
                ref = 'stone_cool:4'
            cv.put(T(x, y), y, ref)
    # the letter inside: cream paper, a V flap open (open_ lifts it), its broken red seal
    lx0, lx1, ly0, ly1 = 11, 32, top + 8, top + 22
    paper = ['stone_warm:3', 'stone_warm:4', 'stone_warm:5', 'metal:4']
    if hurt:
        paper = ['stone_cool:3', 'stone_cool:4', 'stone_cool:5', 'metal:3']
    for y in range(ly0, ly1 + 1):
        for x in range(lx0, lx1 + 1):
            k = 2
            if x == lx0 or y == ly0:
                k = 3
            if x == lx1 or y == ly1:
                k = 1
            cv.put(T(x, y), y, paper[k])
    mx = (lx0 + lx1) / 2.0
    # the folds: from the bottom corners to the middle, and the open flap above (a V)
    for i in range(0, 11):
        cv.put(T(lx0 + i, ly1 - i // 2), ly1 - i // 2, paper[0])
        cv.put(T(lx1 - i, ly1 - i // 2), ly1 - i // 2, paper[0])
    fl = 7 + open_
    for i in range(0, 11):
        y = ly0 - max(0, fl - abs(int(round(lx0 + i * (lx1 - lx0) / 10.0 - mx))) * fl // 11)
        x = lx0 + i * (lx1 - lx0) / 10.0
        for yy in range(int(y), ly0):
            cv.put(T(x, yy), yy, paper[1])
            cv.put(T(x + 1, yy), yy, paper[1])
        cv.put(T(x, y), y, paper[3])
    # writing lines on the visible sheet
    for r, y in enumerate((ly0 + 3, ly0 + 5)):
        for x in range(lx0 + 3, lx1 - 3):
            if (x + r * 2) % 5 != 0:
                cv.put(T(x, y), y, 'roof_blue:2' if not hurt else 'stone_cool:3')
    # the broken seal: a red wax disc split by a crack, the two halves apart
    sx, sy = int(mx) - 3, ly0 - 2
    SEAL = ['.rRR.rr.',
            'rRRr.rRr',
            'rRYr.Rrr',
            'rRRr.rRr',
            '.rrr.rr.']
    sl = {'r': 'roof_red:2', 'R': 'roof_red:3', 'Y': 'roof_red:4'}
    if hurt:
        sl = {'r': 'stone_cool:2', 'R': 'stone_cool:3', 'Y': 'stone_cool:4'}
    for j, row in enumerate(SEAL):
        for i, ch in enumerate(row):
            if ch != '.':
                cv.put(T(sx + i + (1 if i > 4 else 0), sy + j), sy + j, sl[ch])
    # the ice's white edges and glints (over the letter: it is inside the ice)
    for (x, y) in ((sx0 + 4, sy0 + 1), (sx0 + 5, sy0 + 1), (sx0 + 6, sy0 + 1), (sx0 + 2, sy0 + 3), (sx0 + 1, sy0 + 4),
                   (sx0 + 1, sy0 + 5), (sx1 - 6, sy0 + 3), (sx1 - 5, sy0 + 4), (sx0 + 8, sy1 - 3), (sx1 - 3, sy1 - 6)):
        cv.put(T(x, y), y, 'metal:4' if not hurt else 'stone_cool:5')
    # a facet line across the shell
    for i in range(14):
        x, y = sx1 - 4 - i, sy0 + 4 + i
        if cv.a[y, int(round(T(x, y)))][3] > 0.5:
            cv.put(T(x, y), y, 'ice:3' if glow < 0.5 else 'metal:4')
    img = finish(cv, (H - 5, H - 2), cx, 13 - abs(bob))
    if glow > 0:
        img = sparkle(img, [(cx - 18, top + 2), (cx + 18, top - 1), (cx, top - 4), (cx + 20, top + 20), (cx - 20, top + 22)],
                      ['metal:4', 'ice:3', 'roof_red:4'])
    return img


# ----------------------------------------------------------------------------- frames
DRAW = {'rimed_page': rimed_page, 'closed_gate': closed_gate, 'lost_letter': lost_letter}
POSES = {
    'rimed_page': {'base': {}, 'idle_1': dict(bob=-1, flap=1), 'attack': dict(lean=4.0, flap=-1, glow=0.3),
                   'cast': dict(bob=-2, flap=2, glow=1.0), 'hurt': dict(lean=-3.0, flap=-1, hurt=True)},
    'closed_gate': {'base': {}, 'idle_1': dict(rattle=1), 'attack': dict(lean=3.0, shut=1),
                    'cast': dict(glow=1.0, shut=2, rattle=1), 'hurt': dict(lean=-2.0, hurt=True, rattle=-1)},
    'lost_letter': {'base': {}, 'idle_1': dict(bob=-1, open_=1), 'attack': dict(tilt=3.0, open_=2),
                    'cast': dict(bob=-2, glow=1.0, open_=3), 'hurt': dict(tilt=-3.0, hurt=True)},
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
    out['hurt'] = AF.edge_lift(_onto(base_img, draw(eid, 'hurt')), 2, prefer=('stone_cool', 'shadow', 'ink', 'ice'))
    return out


if __name__ == '__main__':
    import os
    from pix import contact, OUT
    items = []
    for k in IDS:
        for pose in POSES[k]:
            items.append((f'{k} {pose}', draw(k, pose)))
    os.makedirs(os.path.join(OUT, 'ep7'), exist_ok=True)
    for bg, tag in (((226, 234, 242), 'snow'), ((30, 34, 52), 'vault')):
        contact(items, os.path.join(OUT, 'ep7', f'drawn_6x_{tag}.png'), scale=6, cols=5, bg=bg)
