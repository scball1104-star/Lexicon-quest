"""The Binder (C2-sprites-boss, DEEP_STACKS_PLAN 5.4): the B100 boss on the Archivore's kit, its own creature in ink
and vellum, a bound book that unbinds across its three phases. Writes two pack atlases:

    assets/sprites/cave_bosses_battle.png/.json   binder, binder_loose, binder_binding + the Episode 1 boss frame set each
                                                  (_idle_1, _attack, _hurt, _cast, _devour, _die_0..2), anims <id>_idle, <id>_die
    assets/sprites/cave_enemies_field.png/.json   binder_avatar_0..2 (the map actor on B100; the Archivore avatar's rig)

    python cave_binder.py        (deterministic, about 25 s; previews in out/cave/)

The three looks (one per BINDER.phases entry in src/data/cave/foes.js; the ai emits `sprite` on a phase change and
the scene swaps the frame set, the Nameless King's unmask path):
    binder          The Spine. The Archivore's silhouette in cold vellum (metal / stone_cool ramps) and ink (the ink ramp:
                    the cover, the clasps, the tendrils), a crimson thread stitched down the spine with gold knots, the eye
                    a wax-seal amber. Bound and whole.
    binder_loose    Loose Leaves. The stitching gives: every other knot is torn out (ink gaps, thread ends hanging), the
                    wings spread wide and high, and seven loose leaves circle the body, each still carrying a mark.
    binder_binding  The Last Binding. The outer pages are burnt away (charred wing edges, ember fronts, drifting sparks);
                    the body goes dark as the cover and the thread burns bright across it in a lattice; the eye swells.
Each base is built on a 180 x 155 canvas (the Archivore's 148 x 139 at (16, 16)) so the spread wings fit; the derived
frames use the Archivore recipe (anim_frames.archivore_frames) re-stated here with that offset, and the death steps burn
(fire front, vellum ash) instead of the Archivore's violet dissolve. Frames are packed the X1 way: trimmed and centred on
the loader's default origin (bottom-centre), because the pack merge copies frames but not an origin table.
"""
import os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(HERE, 'chars'))
import json
import numpy as np
from PIL import Image
from pix import *
import pal as P
import anim_frames as AF
import anim_atlas as AA
import cleanup as CL
from anim_frames import col, canvas, opaque, m_poly, m_rect, cp, move, lean, squash, edge_lift, xform, sparkles, eye_scale, eye_shut, eye_glow, dissolve

OUTC = os.path.join(OUT, 'cave')
OX, OY = 16, 16            # the Archivore base sits at (OX, OY) inside the wide base
IDS = ['binder', 'binder_loose', 'binder_binding']
PHASE_OF = {'binder': 'the_spine', 'binder_loose': 'loose_leaves', 'binder_binding': 'the_last_binding'}

# ----------------------------------------------------------------------------- the recolour (exact source colours -> ramps)
LUT = {
    '#ebdfc8': 'metal:4', '#cfb89c': 'metal:3', '#c3a57c': 'stone_cool:5', '#ae8458': 'stone_cool:4', '#896042': 'stone_cool:3',
    '#a66142': 'stone_cool:3', '#6e3d2c': 'stone_cool:2', '#6a4532': 'stone_cool:2', '#482826': 'stone_cool:1', '#2d1b1f': 'shadow:1',
    '#5f322a': 'ink:2', '#825456': 'ink:3', '#724755': 'ink:3', '#5d3852': 'ink:2', '#4b2a47': 'ink:1', '#3c1e3d': 'ink:1',
    '#7040aa': 'ink:4', '#f6c830': 'fire:3', '#8f5533': 'roof_red:2', '#b87942': 'roof_red:3', '#d69c57': 'roof_red:4',
}


def load_archivore():
    j = json.load(open(os.path.join(DST, 'bosses_battle.json'), encoding='utf-8'))
    im = np.asarray(Image.open(os.path.join(DST, 'bosses_battle.png')).convert('RGBA')).astype(np.float32) / 255
    x, y, w, h = j['frames']['archivore']
    return im[y:y + h, x:x + w].copy()


PLUM_SRC = ('#3c1e3d', '#4b2a47', '#724755', '#5d3852', '#825456', '#5f322a', '#7040aa')


def recolour(a):
    out = a.copy()
    op = opaque(a)
    q = (a[..., :3] * 255 + 0.5).astype(int)
    for src, ref in LUT.items():
        c = np.array(hex2rgb(src))
        m = op & np.all(q == c, -1)
        out[m, :3] = col(ref)
    return out


def plum_mask(a):
    """the Archivore's plum pixels (horns, bezel, tendril bodies) by their source colours, on the wide canvas"""
    q = (a[..., :3] * 255 + 0.5).astype(int)
    m = np.zeros(a.shape[:2], bool)
    for src in PLUM_SRC:
        m |= np.all(q == np.array(hex2rgb(src)), -1)
    m &= opaque(a)
    H, W = a.shape[:2]
    out = np.zeros((H + OY, W + 2 * OX), bool)
    out[OY:OY + H, OX:OX + W] = m
    return out


def horn_mask(b, plum):
    """the horns proper: plum pixels inside the horn quads (the quads also cover pale pages, which stay pages)"""
    return plum & (m_poly(b, ARC['horn_l']) | m_poly(b, ARC['horn_r'])) & opaque(b)


def tone_horns(b, horns, steps):
    lab = AF.lab_of(b)
    for lo, hi, ref in steps:
        b[horns & (lab[..., 0] >= lo) & (lab[..., 0] < hi), :3] = col(ref)
    return b


CLASP = ((0.0, 0.22, 'stone_cool:1'), (0.22, 0.34, 'stone_cool:2'), (0.34, 0.5, 'stone_cool:3'), (0.5, 2.0, 'metal:2'))


def wide(a):
    H, W = a.shape[:2]
    out = blank(W + 2 * OX, H + OY)
    out[OY:OY + H, OX:OX + W] = a
    return out


# base-relative geometry of the Archivore (anim_frames.ARC), moved to the wide base
def sh_pts(pts): return [(x + OX, y + OY) for x, y in pts]
def sh_rect(r): return (r[0] + OX, r[1] + OY, r[2] + OX, r[3] + OY)
ARC = dict(
    wing_l=sh_pts(AF.ARC['wing_l']), wing_r=sh_pts(AF.ARC['wing_r']), horn_l=sh_pts(AF.ARC['horn_l']), horn_r=sh_pts(AF.ARC['horn_r']),
    root_l=(AF.ARC['root_l'][0] + OX, AF.ARC['root_l'][1] + OY), root_r=(AF.ARC['root_r'][0] + OX, AF.ARC['root_r'][1] + OY),
    eye_zone=sh_rect(AF.ARC['eye_zone']), tendrils=sh_rect(AF.ARC['tendrils']),
)
SPINE_X = 74 + OX          # the book's centre column
EYE_ROWS = (54 + OY, 82 + OY)


class EyeZone:
    """anim_frames.eye_masks reads AF.ARC['eye_zone']: point it at the wide base's zone while a recipe runs."""
    def __enter__(self):
        self.old = AF.ARC['eye_zone']; AF.ARC['eye_zone'] = ARC['eye_zone']
    def __exit__(self, *a):
        AF.ARC['eye_zone'] = self.old


def put(a, x, y, ref):
    if 0 <= y < a.shape[0] and 0 <= x < a.shape[1]:
        a[y, x, :3] = col(ref); a[y, x, 3] = 1


def wing_masks(a):
    wl, wr = m_poly(a, ARC['wing_l']), m_poly(a, ARC['wing_r'])
    hl, hr = m_poly(a, ARC['horn_l']), m_poly(a, ARC['horn_r'])
    return (wl & ~hl & opaque(a)), (wr & ~hr & opaque(a))


def body_mask(a):
    wl, wr = wing_masks(a)
    hl, hr = m_poly(a, ARC['horn_l']), m_poly(a, ARC['horn_r'])
    tend = m_rect(a, ARC['tendrils'])
    return opaque(a) & ~wl & ~wr & ~hl & ~hr & ~tend


# ----------------------------------------------------------------------------- the stitched spine
def stitch_rows(a):
    """knot rows down the spine: above the eye, below it, and down the thread tail (the Archivore's blade)."""
    rows = []
    for y in list(range(22 + OY, EYE_ROWS[0] - 4, 7)) + list(range(EYE_ROWS[1] + 5, 134 + OY, 7)):
        if opaque(a)[y, SPINE_X]:
            rows.append(y)
    return rows


def knot(a, y, torn=False, glow=False):
    x = SPINE_X
    thread = 'fire:3' if glow else 'roof_red:3'
    if torn:
        # the knot is gone: an ink gap where the thread pulled through, one loose end hanging to the right
        for dx in (-1, 0, 1):
            put(a, x + dx, y, 'ink:0'); put(a, x + dx, y + 1, 'ink:1')
        put(a, x + 2, y + 1, 'roof_red:4'); put(a, x + 3, y + 2, 'roof_red:3')
        return
    for dx, dy in ((-1, -1), (1, -1), (-1, 1), (1, 1)):
        put(a, x + dx, y + dy, thread)
    put(a, x, y, 'gold:4' if not glow else 'fire:5')
    put(a, x - 2, y, 'roof_red:2'); put(a, x + 2, y, 'roof_red:2')


def spine_band(a, torn=False, glow=False):
    """the book's spine seen from the front: a five-wide band of ink leather down the body between the page halves,
    bevelled (lit left edge, shaded right), skipping the eye rows; torn = the band gapes in places, glow = it smoulders."""
    body = body_mask(a)
    rows = stitch_rows(a)
    y0, y1 = rows[0] - 4, rows[-1] + 4
    for y in range(y0, y1 + 1):
        if EYE_ROWS[0] - 4 <= y <= EYE_ROWS[1] + 4:
            continue
        for dx in range(-2, 3):
            x = SPINE_X + dx
            if not body[y, x]:
                continue
            if torn and (y // 3) % 4 == 1 and abs(dx) <= 1:
                put(a, x, y, 'ink:0')
                continue
            ref = 'ink:2' if dx == -2 else 'ink:0' if dx == 2 else ('ink:1' if not glow else 'roof_red:1')
            put(a, x, y, ref)
    return a


def spine(a, torn=False, glow=False):
    a = spine_band(a, torn=torn, glow=glow)
    rows = stitch_rows(a)
    # the thread itself: a crimson line down the spine between knots (over the pages and the tail)
    for y in range(rows[0] - 3, rows[-1] + 4):
        if opaque(a)[y, SPINE_X] and not (EYE_ROWS[0] - 3 <= y <= EYE_ROWS[1] + 3):
            put(a, SPINE_X, y, 'fire:2' if glow else 'roof_red:2')
    for i, y in enumerate(rows):
        knot(a, y, torn=(torn and i % 2 == 1), glow=glow)
    return a


# ----------------------------------------------------------------------------- phase bases
def bound(a):
    """binder: cold vellum, ink cover, the spine stitched whole, iron clasps where the horns were."""
    plum = plum_mask(a)
    b = wide(recolour(a))
    # the horns are the book's clasps: iron, with a lit edge on the left (the light comes from the top-left)
    b = tone_horns(b, horn_mask(b, plum), CLASP)
    b = spine(b)
    return b


LEAVES = [   # loose leaves around the body: (x, y) of the top-left in wide-base px, variant
    (38, 14, 0), (130, 20, 1), (22, 58, 2), (148, 66, 0), (32, 106, 1), (142, 110, 2), (60, 142, 0), (112, 142, 1)]
LEAF = {   # torn pages: vellum with a shaded edge, a mark still on each (k), a torn corner
    0: ['.00000', '0eeeE0', '0ekeE0', '0eeeE0', '0eEEE0', '.0EE0.', '..000.'],
    1: ['000000.', '0eeeee0', '0ekkee0', '0eeeeE0', '0eEEEE0', '.00000.'],
    2: ['.0000.', '0eeeE0', '0ekeE0', '0eeEE0', '0EEE0.', '.000..'],
}
LEAF_PAL = {'0': 'stone_cool:1', 'e': 'metal:3', 'E': 'stone_cool:5', 'k': 'ink:1'}


def leaf(a, x0, y0, v):
    for j, row in enumerate(LEAF[v]):
        for i, ch in enumerate(row):
            if ch != '.':
                put(a, x0 + i, y0 + j, LEAF_PAL[ch])


def loose(a):
    """binder_loose: the wings spread wide and high, the knots torn out one in two, loose leaves circling."""
    plum = plum_mask(a)
    b = wide(recolour(a))
    b = tone_horns(b, horn_mask(b, plum), CLASP)
    wl, wr = wing_masks(b)
    rl, rr = cp(ARC['root_l'][0], ARC['root_l'][1]), cp(ARC['root_r'][0], ARC['root_r'][1])
    # the wings open outward and lift: rigid moves about the roots (RotSprite sampling), drawn behind the body
    b = move(b, wl, rl, angle=11, sx=1.06, sy=1.06, ty=-3, behind=True, seam=4)
    b = move(b, wr, rr, angle=-11, sx=1.06, sy=1.06, ty=-3, behind=True, seam=4)
    b = spine(b, torn=True)
    for x, y, v in LEAVES:
        leaf(b, x, y, v)
    return b


def char_wings(b, keep=0.6, seed=11):
    """burn the outer pages: wing pixels beyond `keep` of the way from the root are gone, the front glows, sparks drift."""
    wl, wr = wing_masks(b)
    H, W = b.shape[:2]
    rng = np.random.RandomState(seed)
    noise = rng.rand(H, W)
    ys, xs = np.mgrid[0:H, 0:W]
    out = b.copy()
    for m, root in ((wl, ARC['root_l']), (wr, ARC['root_r'])):
        if not m.any():
            continue
        d = np.hypot(xs - root[0], ys - root[1])
        dmax = d[m].max()
        t = d / dmax + (noise - 0.5) * 0.16
        gone = m & (t > keep)
        front = m & ~gone & (t > keep - 0.035)
        glow = m & ~gone & ~front & (t > keep - 0.065)
        out[gone] = 0
        out[front, :3] = col('fire:2')
        out[glow, :3] = col('roof_red:3')
        # sparks: a few burnt pixels float up and out from the front
        fy, fx = np.nonzero(front)
        pick = rng.rand(len(fy)) < 0.09
        for y, x, ok in zip(fy, fx, pick):
            if not ok:
                continue
            dy, dx = rng.randint(3, 9), rng.randint(-3, 4)
            yy, xx = y - dy, x + dx
            if 0 <= yy < H and 0 <= xx < W and not opaque(out[yy:yy + 1, xx:xx + 1])[0, 0]:
                out[yy, xx, :3] = col('fire:4' if rng.rand() < 0.5 else 'fire:3'); out[yy, xx, 3] = 1
    return out


def binding(a):
    """binder_binding: burnt wings, a dark cover with the thread burning across it, the eye swollen."""
    plum = plum_mask(a)
    b = wide(recolour(a))
    body = body_mask(b)
    # the cover: the pages on the body darken to the binding's leather (vellum steps drop to the cool darks)
    q = (b[..., :3] * 255 + 0.5).astype(int)
    for src, ref in (('metal:4', 'stone_cool:3'), ('metal:3', 'stone_cool:2'), ('stone_cool:5', 'stone_cool:2'), ('stone_cool:4', 'stone_cool:1'),
                     ('stone_cool:3', 'shadow:1')):
        c = np.array(hex2rgb(P.color(src)))
        m = body & np.all(q == c, -1)
        b[m, :3] = col(ref)
    b = char_wings(b)
    # the horns burn too: ember-lit iron (the horns proper, never the pages inside the quads)
    b = tone_horns(b, horn_mask(b, plum), ((0.0, 0.25, 'shadow:1'), (0.25, 0.42, 'stone_cool:2'), (0.42, 2.0, 'roof_red:3')))
    # the thread lattice: cross-threads over the cover (never across the eye), two rows thick so they read at 1x, the spine alight
    for y in (33 + OY, 46 + OY, 93 + OY):
        for x in range(SPINE_X - 16, SPINE_X + 17):
            if body[y, x]:
                put(b, x, y, 'fire:3' if (x + y) % 4 else 'fire:4')
            if body[y + 1, x] and (x + y) % 3 == 0:
                put(b, x, y + 1, 'roof_red:4')
    b = spine(b, glow=True)
    with EyeZone():
        b = eye_scale(b, 1.22, 'round')
        iris, eye, pupil = AF.eye_masks(b)
        b[iris, :3] = col('gold:4')
    return b


# ----------------------------------------------------------------------------- derived frames (the Archivore recipe, offset)
def binder_frames(base, eid):
    S = ARC
    a = canvas(base)
    H, W = base.shape[:2]
    hl, hr = m_poly(a, S['horn_l']), m_poly(a, S['horn_r'])
    rl, rr = cp(*S['root_l']), cp(*S['root_r'])
    tend = m_rect(a, S['tendrils']) & ~m_poly(a, S['wing_l']) & ~m_poly(a, S['wing_r'])

    def inky(img):
        # the tendrils (dark, blue, low on the body) never move with the wings
        lab = AF.lab_of(img)
        low = np.zeros(img.shape[:2], bool)
        low[AF.cy_(92 + OY):] = True
        return opaque(img) & (lab[..., 2] < 0.0) & (lab[..., 0] < 0.5) & low

    def wings(img, ang, k=1.0, ty=0):
        pu = inky(img)
        img = move(img, m_poly(img, S['wing_l']) & ~m_poly(img, S['horn_l']) & ~pu, rl, angle=ang, sx=k, sy=k, ty=ty, behind=True, seam=4)
        img = move(img, m_poly(img, S['wing_r']) & ~m_poly(img, S['horn_r']) & ~pu, rr, angle=-ang, sx=k, sy=k, ty=ty, behind=True, seam=4)
        return img

    prefer = ('ink', 'shadow', 'stone_cool', 'metal', 'roof_red', 'fire')
    out = {}
    with EyeZone():
        out['idle_1'] = wings(a, 2.5, ty=-1)
        f = wings(a, 9, 1.04, ty=-2)
        f = eye_scale(f, 1.3, 'slit')
        out['attack'] = lean(f, 96 + OY, 2, taper=20)
        f = wings(a, -5, ty=1)
        f = eye_shut(f)
        # the recipe's lid is the Archivore's hide (earth); the Binder's lid is its cover
        zone = m_rect(f, (ARC['eye_zone'][0] - 2, ARC['eye_zone'][1] - 2, ARC['eye_zone'][2] + 2, ARC['eye_zone'][3] + 2))
        q = (f[..., :3] * 255 + 0.5).astype(int)
        for src, ref in (('earth:2', 'stone_cool:2'), ('earth:3', 'stone_cool:3'), ('earth:4', 'stone_cool:4')):
            m = zone & np.all(q == np.array(hex2rgb(P.color(src))), -1)
            f[m, :3] = col(ref)
        f = lean(f, 96 + OY, -2, taper=20)
        f, dox = squash(f, (40 + OY, 70 + OY), (44 + OX, 104 + OX))
        out['hurt'] = (edge_lift(f, 2, prefer=prefer), dox)
        # cast (the inhale): the wings fold in, the body contracts toward the eye, the eye burns; ink and vellum motes
        f = wings(a, -4, 0.94, ty=1)
        f = xform(f, cp(74 + OX, H - 1), sx=0.96, sy=0.98)
        f = eye_glow(f)
        cx, cy = 82 + OX, 68 + OY
        pts = [(cx - 40, cy - 30, 2), (cx + 38, cy - 34, 1), (cx - 46, cy + 10, 1), (cx + 44, cy + 6, 2), (cx - 22, cy - 46, 1),
               (cx + 20, cy + 40, 1), (cx - 30, cy + 34, 2), (cx + 30, cy - 50, 1)]
        out['cast'] = sparkles(f, pts, ['ink:4', 'metal:3', 'fire:3'])
        # devour: the eye swells with a dilated pupil, the tendrils reach for the party, the body lunges
        f = wings(a, 5, 1.02, ty=-1)
        f = move(f, tend, cp(40 + OX, 96 + OY), sx=1.14, sy=1.04)
        f = eye_scale(f, 1.55, 'round')
        out['devour'] = lean(f, 100 + OY, 3, taper=24)
    ox, oy = AF.origin_of(base)
    packed = {}
    for n, v in out.items():
        img, dox = (v if isinstance(v, tuple) else (v, 0))
        packed[n] = (img, ox + dox, oy)
    # the death: the Binder burns (an ember front, vellum ash) instead of the violet dissolve
    seed = sum(ord(c) for c in eid) * 7 + 3
    for i, lv in enumerate(AF.DIE_LEVELS):
        packed[f'die_{i}'] = (dissolve(a, lv, seed, edge='fire:3', ash='stone_cool:5'), ox, oy)
    return packed


def bases():
    a = load_archivore()
    return {'binder': bound(a), 'binder_loose': loose(a), 'binder_binding': binding(a)}


def frames_of(eid, base):
    H, W = base.shape[:2]
    out = [(eid, base, W // 2, H - 1)]
    fr = binder_frames(base, eid)
    out += [(f'{eid}_{n}', *fr[n]) for n in AF.ORDER if n in fr]
    return out


# ----------------------------------------------------------------------------- the field avatar
def avatar_frames():
    """binder_avatar_0..2 on the Archivore avatar's rig (chars/archivore_avatar.py) with the Binder's ramps and a stitched spine."""
    import archivore_avatar as AV
    saved = {k: dict(getattr(AV, k)) for k in ('FEATHER', 'PLUM', 'TENDRIL', 'PAGES', 'PLATE', 'BLADE', 'EYE_PAL')}
    AV.FEATHER.update(base='stone_cool:5', light='metal:3', dark='stone_cool:4', deep='stone_cool:3', outline='#1a1334')
    AV.PLUM.update(base='ink:1', light='ink:3', dark='ink:0', outline='shadow:0')
    AV.TENDRIL.update(base='ink:2', light='ink:4', dark='ink:1', outline='shadow:0')
    AV.PAGES.update(base='metal:3', light='metal:4', dark='stone_cool:5', outline='stone_cool:1')
    AV.PLATE.update(base='ink:1', light='roof_red:3', dark='ink:0', outline='shadow:0')
    AV.BLADE.update(base='roof_red:2', light='roof_red:4', dark='roof_red:1', outline='roof_red:0')
    AV.EYE_PAL.update({'o': 'ink:0', 'G': 'fire:2', 'Y': 'fire:3', 'y': 'fire:2', 'k': 'ink:0', 'W': 'fire:5'})
    gold3, gold4 = np.array(hex2rgb(P.color('gold:3'))) / 255, np.array(hex2rgb(P.color('gold:4'))) / 255
    try:
        frames = []
        for lift, spread, dy, sway in AV.POSES:
            cv = np.zeros((AV.H, AV.W, 4), np.float32)
            AV.horn(cv, -1); AV.horn(cv, 1)
            AV.wing(cv, -1, lift, spread); AV.wing(cv, 1, lift, spread)
            AV.tendril(cv, -1, sway, 0); AV.tendril(cv, 1, sway, 0); AV.tendril(cv, -1, sway, 1); AV.tendril(cv, 1, sway, 1)
            AV.blade(cv); AV.body(cv); AV.crown(cv)
            # the rig's gilt specks and the blade's gold line become the crimson thread and its knots
            for g, ref in ((gold3, 'roof_red:3'), (gold4, 'roof_red:4')):
                m = (cv[..., 3] > 0.5) & np.all(np.abs(cv[..., :3] - g) < 1e-3, -1)
                cv[m, :3] = col(ref)
            for y in (12, 15, 31, 34, 38, 42):
                put(cv, AV.CX, y, 'gold:4')
            # the wings' warm vane shade (path:3 in the rig) goes cold
            pth = np.array(hex2rgb(P.color('path:3'))) / 255
            m = (cv[..., 3] > 0.5) & np.all(np.abs(cv[..., :3] - pth) < 1e-3, -1)
            cv[m, :3] = col('stone_cool:4')
            AV.eye(cv)
            low = 47
            shift = (AV.H - 1 - AV.HOVER) - low + dy
            out = np.zeros_like(cv)
            if shift >= 0:
                out[shift:] = cv[:AV.H - shift]
            else:
                out[:AV.H + shift] = cv[-shift:]
            frames.append(out)
        return frames, (AV.W, AV.H, AV.HOVER)
    finally:
        for k, v in saved.items():
            getattr(AV, k).clear(); getattr(AV, k).update(v)


# ----------------------------------------------------------------------------- packing (the X1 way: origin = bottom-centre exactly)
def center_on_origin(t, ox, oy):
    h, w = t.shape[:2]
    assert h == oy + 1, 'content below the origin row (%d rows, origin row %d)' % (h, oy)
    ox2 = max(ox, w - 1 - ox)
    out = blank(2 * ox2 + 1, h)
    out[:, ox2 - ox:ox2 - ox + w] = t
    return out, ox2, oy


def pack_frames(frames, width=512, pad=2):
    items = []
    for name, img, ox, oy in frames:
        t, tox, toy = AF.trim(img, ox, oy)
        t, tox, toy = center_on_origin(t, tox, toy)
        items.append((name, t, tox, toy))
    order = sorted(range(len(items)), key=lambda i: (-items[i][1].shape[0], i))
    sh = Shelf(width, pad=pad)
    for i in order:
        sh.add(items[i][0], items[i][1])
    sheet, rects = sh.render()
    origin = {n: [int(tox), int(toy)] for n, _, tox, toy in items}
    for n, r in rects.items():
        assert origin[n] == [r[2] // 2, r[3] - 1], (n, origin[n], r)
    return sheet, rects, origin


NOTES_BOSS = ('Deep Stacks pack atlas (C2-sprites-boss), merged into bosses_battle by the loader. The Binder (B100) on the Archivore\'s '
              'kit: binder (The Spine: cold vellum wings, an ink cover, a crimson thread stitched down the spine with gold knots, a '
              'wax-seal amber eye), binder_loose (Loose Leaves: the knots torn out one in two, wings spread wide and high, seven loose '
              'leaves circling), binder_binding (The Last Binding: the outer pages burnt to ember fronts, a dark cover with the thread '
              'burning across it, the eye swollen). Each with _idle_1 (breathe), _attack (lunge, slit eye), _hurt (recoil, eye shut), '
              '_cast (the inhale: wings fold, eye burns, ink and vellum motes), _devour (the eye swells, the tendrils reach), _die_0..2 '
              '(burns from the top: ember front, vellum ash); anims <id>_idle and <id>_die. Facing RIGHT, 1x, untinted, origin = '
              'bottom-centre (the default, exact for every frame; the table agrees). BINDER.sprite.frame = binder; phases 2 and 3 '
              'carry sprite: binder_loose / binder_binding so the scene swaps the frame set on the phase banner (the King\'s unmask path).')
NOTES_FIELD = ('Deep Stacks pack atlas, merged into enemies_field. binder_avatar: the Binder on the B100 floor, 55x52, frontal, hovering '
               '`hover` px above its feet (the Archivore avatar rig in vellum, ink and crimson thread); _0 wings up, _1 wings down, _2 level; '
               'the field alternates _0/_1, anim binder_avatar_idle plays 0, 2, 1, 2. Facing: symmetric, the flip changes nothing.')


def build():
    saved = {k: set(v) for k, v in P.EXTRAS.items()}
    try:
        return _build()
    finally:
        P.EXTRAS.clear(); P.EXTRAS.update(saved)


def _build():
    os.makedirs(OUTC, exist_ok=True)
    B = bases()
    frames = []
    per = {}
    for eid in IDS:
        per[eid] = frames_of(eid, B[eid])
        frames += per[eid]
    sheet, rects, origin = pack_frames(frames, width=512)
    anims = {}
    for eid in IDS:
        anims.update(AA.enemy_anims(eid, rects))
    AA.save_indexed(sheet, os.path.join(DST, 'cave_bosses_battle.png'))
    meta = {'image': 'cave_bosses_battle.png', 'frames': rects, 'origin': origin, 'anims': anims, 'facing': 'right', 'notes': NOTES_BOSS}
    write_json(os.path.join(DST, 'cave_bosses_battle.json'), meta)
    # the field avatar
    av, (W, H, hover) = avatar_frames()
    sh = Shelf(256, pad=1)
    names = []
    for i, im in enumerate(av):
        n = f'binder_avatar_{i}'
        sh.add(n, im); names.append(n)
    fsheet, frects = sh.render()
    save_png(fsheet, os.path.join(DST, 'cave_enemies_field.png'))
    fmeta = {'image': 'cave_enemies_field.png', 'frames': frects,
             'anims': {'binder_avatar_idle': {'frames': [names[0], names[2], names[1], names[2]], 'fps': 5, 'loop': True}},
             'sprites': {'binder_avatar': {'size': [W, H], 'origin': [W // 2, H - 1], 'hover': hover}}, 'facing': 'left', 'notes': NOTES_FIELD}
    write_json(os.path.join(DST, 'cave_enemies_field.json'), fmeta)
    # previews: the three looks beside the Archivore at 4x, every frame per look at 3x, the avatar beside the Archivore's at 6x
    a = load_archivore()
    contact([('archivore', a)] + [(k, B[k]) for k in IDS], os.path.join(OUTC, 'binder_looks_4x.png'), scale=4, cols=4, bg=(34, 28, 44),
            title='the Archivore and the Binder\'s three looks at 4x')
    for eid in IDS:
        anim_sheet(os.path.join(OUTC, f'anim_{eid}_3x.png'), per[eid], eid)
    j = json.load(open(os.path.join(DST, 'enemies_field.json'), encoding='utf-8'))
    im = np.asarray(Image.open(os.path.join(DST, j['image'])).convert('RGBA')).astype(np.float32) / 255
    x, y, w, h = j['frames']['archivore_avatar_0']
    contact([('archivore_avatar_0', im[y:y + h, x:x + w])] + [(n, f) for n, f in zip(names, av)], os.path.join(OUTC, 'binder_avatar_6x.png'),
            scale=6, cols=4, bg=(52, 46, 60), title='field avatars at 6x')
    print('binder: %d boss frames, %d field frames; sheet %dx%d' % (len(rects), len(frects), sheet.shape[1], sheet.shape[0]))
    return meta, fmeta


def anim_sheet(path, frames, eid, scale=3, bg=(34, 28, 44)):
    from PIL import ImageDraw
    row = [(n[len(eid) + 1:] or 'base',) + AF.trim(img, ox, oy) for n, img, ox, oy in frames]
    up = max(f[3] for f in row)
    down = max(f[1].shape[0] - f[3] for f in row)
    cw = max(max(f[2], f[1].shape[1] - f[2]) for f in row) * 2 + 4
    rh = up + down + 10
    cols = 5
    nrow = (len(row) + cols - 1) // cols
    im = Image.new('RGB', (cols * cw * scale, nrow * rh * scale), bg)
    d = ImageDraw.Draw(im)
    for i, (lab, t, tox, toy) in enumerate(row):
        cxi, ryi = i % cols, i // cols
        x = cxi * cw + cw // 2 - tox
        y = ryi * rh + 8 + up - toy
        tile = to_pil(t).resize((t.shape[1] * scale, t.shape[0] * scale), Image.NEAREST)
        im.paste(tile, (x * scale, y * scale), tile)
        d.text((cxi * cw * scale + 3, ryi * rh * scale + 2), lab, fill=(230, 230, 210))
    im.save(path)


if __name__ == '__main__':
    build()
