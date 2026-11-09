"""The False Futures (E5-sprites): `future_hunger` and `future_fear`, the Sand Oracle's phase 2 adds. A small new sprite
drawn in code at 1x (no painting to cut): a cracked hourglass in a frame of two caps and two posts, wearing a mask over
its upper glass, standing on its own ground shadow (CRITIQUE_6 item 15: about 40 x 58, 1.3x the size the Episode 4 writs
first had, so they read as beings beside the boss, not props). One drawing routine, two recolours with their own masks
(the ep4_writs.py approach):

  future_hunger  sun: a gold frame, amber glass, gold sand, a gold mask with its jaw hanging open on ivory teeth
  future_fear    star: an indigo frame with silver caps, pale blue glass, pale sand, a pale mask with two hollow eyes

Every frame is a re-render of the same drawing with different parameters (bob, lean, glow, jaw, the sand's fall), so
the derived frames stay clean pixels instead of resampled ones. Contrast rule as ep5_enemies.py.

    base()           -> {id: rgba}  facing RIGHT, origin bottom-centre
    derived(id, img) -> {suffix: rgba} on the anim_frames canvas (idle_1, attack, hurt, cast)
"""
import numpy as np
import pal as P
from pix import hex2rgb, blank
import anim_frames as AF
import cleanup as CL

W, H = 42, 60
CX = 20.5


def C(ref):
    c = np.array(hex2rgb(P.color(ref, 'future')), np.float32) / 255
    return np.array([c[0], c[1], c[2], 1.0], np.float32)


KINDS = {
    'future_hunger': dict(frame=['wood:0', 'wood:1', 'gold:2', 'gold:3', 'gold:4'],
                          glass=['wood:0', 'wood:1', 'wood:2', 'wood:3'], sand=['gold:2', 'gold:3', 'gold:4'],
                          mask=['wood:1', 'gold:2', 'gold:3', 'gold:4', 'gold:5'], hole='shadow:0',
                          glow=['gold:4', 'gold:5', 'fire:5'], side='sun'),
    'future_fear': dict(frame=['shadow:0', 'ink:1', 'ink:2', 'ink:3', 'ink:4'],
                        glass=['ink:3', 'cloth_blue:3', 'ice:1', 'ice:2'], sand=['stone_cool:3', 'stone_cool:4', 'metal:3'],
                        mask=['stone_cool:2', 'stone_cool:3', 'stone_cool:4', 'metal:3', 'metal:4'], hole='shadow:0',
                        glow=['ice:2', 'ice:3', 'metal:4'], side='star'),
}
SILVER = ['stone_cool:2', 'stone_cool:3', 'metal:2', 'metal:3', 'metal:4']


def put(cv, x, y, ref):
    x, y = int(round(x)), int(round(y))
    if 0 <= x < W and 0 <= y < H:
        cv[y, x] = C(ref)


def half_width(y, top, neck, bot):
    """the glass's half width at row y: two bulbs meeting at the neck"""
    if y <= neck:
        t = (y - top) / max(1, neck - top)
        return 2 + 10.5 * np.sin(np.pi * min(1.0, 0.18 + t * 0.82)) ** 0.8 if t < 0.92 else 1.5
    t = (y - neck) / max(1, bot - neck)
    return 2 + 10.5 * np.sin(np.pi * min(1.0, 0.08 + t * 0.82)) ** 0.8 if t > 0.08 else 1.5


def draw(kind, bob=0, lean=0.0, glow=0.0, jaw=0, fall=0, hurt=False):
    sp = KINDS[kind]
    cv = blank(W, H)
    top, neck, bot = 9 + bob, 27 + bob, 45 + bob
    sx = lambda y: int(round(lean * (bot - y) / (bot - top)))   # the lean bends it toward the party, whole rows at a time
    fr = sp['frame'] if kind == 'future_hunger' else SILVER
    # caps
    for y, (x0, x1, k) in ((top - 4, (-14, 14, 4)), (top - 3, (-15, 15, 3)), (top - 2, (-15, 15, 2)), (top - 1, (-14, 14, 1)),
                           (bot + 1, (-14, 14, 4)), (bot + 2, (-15, 15, 3)), (bot + 3, (-15, 15, 2)), (bot + 4, (-14, 14, 1))):
        for x in range(int(CX + x0), int(CX + x1) + 1):
            kk = k if x < CX + 6 else max(0, k - 1)
            put(cv, x + sx(y), y, fr[kk])
    # the feet under the bottom cap
    for x in (CX - 12, CX + 11):
        for y in (bot + 5, bot + 6):
            put(cv, x, y, fr[1]); put(cv, x + 1, y, fr[2])
    # posts (behind the glass on the far side, in front on the near)
    post = sp['frame']
    for y in range(top, bot + 1):
        put(cv, CX - 14 + sx(y), y, post[3]); put(cv, CX - 13 + sx(y), y, post[2])
        put(cv, CX + 13 + sx(y), y, post[2]); put(cv, CX + 14 + sx(y), y, post[1])
    # glass
    g = sp['glass']
    for y in range(top, bot + 1):
        hw = half_width(y, top, neck, bot)
        for x in range(int(np.floor(CX - hw)), int(np.ceil(CX + hw)) + 1):
            dx = x + 0.5 - CX
            if abs(dx) > hw:
                continue
            k = 3 if dx < -hw * 0.5 else (2 if dx < hw * 0.2 else (1 if dx < hw * 0.7 else 0))
            put(cv, x + sx(y), y, g[k])
    # sand: a heap in the lower bulb, a sinking surface in the upper, a stream through the neck
    s = sp['sand']
    for y in range(neck + 9 - fall, bot + 1):
        hw = half_width(y, top, neck, bot) - 1
        hh = (y - (neck + 9 - fall)) / max(1, bot - (neck + 9 - fall))
        w = hw * min(1.0, 0.35 + hh)
        for x in range(int(CX - w), int(CX + w) + 1):
            put(cv, x + sx(y), y, s[2] if x < CX - w * 0.3 else (s[1] if x < CX + w * 0.4 else s[0]))
    for y in range(neck - 7 + fall, neck):
        hw = half_width(y, top, neck, bot) - 1
        for x in range(int(CX - hw), int(CX + hw) + 1):
            put(cv, x + sx(y), y, s[1] if x < CX else s[0])
    for y in range(neck - 1, neck + 9 - fall):
        if (y + fall) % 3 != 2:
            put(cv, CX + sx(y), y, s[2])
    # the crack: a jagged line down the lower glass from the neck, and a chipped-out piece at its foot
    pts = [(1, 2), (-2, 5), (0, 8), (-4, 11), (-3, 14), (-7, 17)]
    for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
        n = max(abs(x1 - x0), abs(y1 - y0))
        for i in range(n + 1):
            y = int(round(neck + y0 + (y1 - y0) * i / n))
            x = int(round(CX + x0 + (x1 - x0) * i / n))
            put(cv, x + sx(y), y, 'shadow:0' if not hurt else 'metal:4')
            put(cv, x + 1 + sx(y), y, sp['glass'][3])           # the crack's lit lip
    for (dx, dy) in ((-9, 17), (-8, 17), (-9, 18), (-10, 18), (-8, 16)):
        put(cv, CX + dx + sx(neck + dy), neck + dy, 'shadow:0')
    mask(cv, kind, top, sx, jaw, glow, hurt)
    img = CL.ramp_outline(cv)
    # a full 1 px dark outline round the whole of it, then the side rim (the contrast rule)
    import ep5_enemies as E5
    al = img[..., 3] > 0.5
    p = np.pad(al, 1)
    ring = (p[:-2, 1:-1] | p[2:, 1:-1] | p[1:-1, :-2] | p[1:-1, 2:]) & ~al
    ring[56:] = False                                       # the shadow takes no outline
    img[ring] = C('shadow:0')
    img = E5.side_rim(E5.dark_outline(img), sp['side'], min_nb=5)
    # ground shadow last (it takes no outline): a dithered ellipse under the feet, only where nothing stands
    for y in range(bot + 4 - bob, H):
        for x in range(W):
            if ((x + 0.5 - CX) / 17.0) ** 2 + ((y + 0.5 - (bot + 7 - bob)) / 2.6) ** 2 <= 1 and (x + y) % 2 == 0                     and img[y, x, 3] < 0.5:
                img[y, x] = C('shadow:1')
    if glow > 0:
        img = sparkle_sand(img, kind, top, glow)
    return img


# masks, 16 wide: hunger's jaw hangs open (rows below the J line drop by `jaw`), fear has two hollow eyes
HUNGER_TOP = ['....kkkkkkkk....',
              '..kkMMMMMMMMkk..',
              '.kMMMMmMMmMMMMk.',
              'kMMkkkMMMMkkkMMk',
              'kMkEEkkMMkkEEkMk',
              'kMMkkMMMMMMkkMmk',
              'kMMMMMMmmMMMMMmk',
              '.kMMMkkkkkkMMmk.',
              '.kMMkTkTTkTkMmk.']
HUNGER_JAW = ['.kMmkTkTTkTkmmk.',
              '..kMkkkkkkkkmk..',
              '...kmmmmmmmmk...',
              '....kkkkkkkk....']
FEAR = ['....kkkkkkkk....',
        '..kkMMMMMMMMkk..',
        '.kMMMMMMMMMMmMk.',
        'kMMkkkkMMkkkkMmk',
        'kMkHHHHkkHHHHkmk',
        'kMkHHHHkkHHHHkmk',
        'kMkHHHHkkHHHHkmk',
        'kMMkkkkMMkkkkMmk',
        'kMMMMMMMMMMMmmmk',
        '.kMMMMMmmmmmmmk.',
        '.kMMMMMMmmmmmmk.',
        '..kMMMmmmmmmmk..',
        '...kkmmmmmmkk...',
        '.....kkkkkk.....']


def mask(cv, kind, top, sx, jaw, glow, hurt):
    sp = KINDS[kind]
    mk = sp['mask']
    leg = {'k': mk[0], 'M': mk[3], 'm': mk[2], 'E': sp['glow'][0] if glow else 'gold:3', 'T': 'stone_warm:5',
           'H': sp['hole']}
    x0, y0 = int(CX) - 7, top - 2
    if kind == 'future_hunger':
        rows = HUNGER_TOP
        stamp_rows(cv, rows, leg, x0, y0, sx)
        # the open mouth: a dark gape between the upper teeth and the hanging jaw
        for j in range(1 + jaw):
            stamp_rows(cv, ['.kk' + 'D' * 10 + 'k..'], dict(leg, D='shadow:0'), x0, y0 + len(rows) + j, sx)
        stamp_rows(cv, HUNGER_JAW, leg, x0, y0 + len(rows) + 1 + jaw, sx)
    else:
        stamp_rows(cv, FEAR, leg, x0, y0, sx)
        # the hollow eyes catch one cold pixel of light at their lower inside corner
        if glow:
            for (dx, dy) in ((5, 6), (10, 6)):
                put(cv, x0 + dx + sx(y0 + dy), y0 + dy, sp['glow'][1])


def stamp_rows(cv, rows, leg, x0, y0, sx):
    for j, row in enumerate(rows):
        for i, ch in enumerate(row):
            if ch == '.':
                continue
            y = y0 + j
            put(cv, x0 + i + sx(y), y, leg[ch])


def sparkle_sand(img, kind, top, glow):
    sp = KINDS[kind]
    out = img.copy()
    for (dx, dy, k) in ((-12, -6, 1), (10, -8, 2), (-4, -11, 0), (15, 2, 1), (-17, 8, 0), (6, -14, 1)):
        x, y = int(CX + dx), int(top + dy)
        if 0 <= x < W and 0 <= y < H and out[y, x, 3] < 0.5:
            out[y, x] = C(sp['glow'][k])
    return out


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
    out['idle_1'] = _onto(base_img, draw(kind, bob=-1, fall=2, jaw=1 if kind == 'future_hunger' else 0))
    out['attack'] = _onto(base_img, draw(kind, lean=3.0, jaw=3 if kind == 'future_hunger' else 0, glow=0.5))
    out['cast'] = _onto(base_img, draw(kind, bob=-1, glow=1.0, fall=4, jaw=2 if kind == 'future_hunger' else 0))
    hurt = draw(kind, lean=-2.0, hurt=True)
    out['hurt'] = AF.edge_lift(_onto(base_img, hurt), 2, prefer=('gold', 'wood', 'ink', 'stone_cool', 'shadow'))
    return out


if __name__ == '__main__':
    import os
    from pix import contact, OUT
    items = []
    for k in KINDS:
        items += [(k, draw(k)), (k + ' idle1', draw(k, bob=-1, fall=2, jaw=1)), (k + ' attack', draw(k, lean=3.0, jaw=3, glow=0.5)),
                  (k + ' cast', draw(k, glow=1.0, fall=4, jaw=2)), (k + ' hurt', draw(k, hurt=True, lean=-2))]
    os.makedirs(os.path.join(OUT, 'ep5'), exist_ok=True)
    for bg, tag in (((228, 196, 140), 'sand'), ((18, 16, 40), 'night')):
        contact(items, os.path.join(OUT, 'ep5', f'futures_6x_{tag}.png'), scale=6, cols=5, bg=bg)
