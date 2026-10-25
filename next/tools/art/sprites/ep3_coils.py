"""The Furnace Coils (E3-sprites): `bellows_coil` and `smelter_coil`, the Cinder Warden's phase 2 adds. A small new
sprite, drawn in code at 1x (no painting to cut): a coil of pipe wound round an invisible post on a bronze
stand, glowing along the pipe's centre line. One drawing routine, two recolours with their own tops:

  bellows_coil  bronze pipe, a ruddy glow, a leather bellows bag with brass bands on top that pumps; it
                Stokes the Warden every turn (+1 Heat), so its idle is the bellows breathing
  smelter_coil  dark iron pipe, a white-yellow glow, a crucible on top with a slag spout and a falling drip;
                it sprays Slag every second turn, so its attack tilts the crucible and fans the spray

Every frame is a re-render of the same drawing with different parameters (glow, bob, lean, spray), so the
derived frames stay clean pixels instead of resampled ones.

    base()          -> {'bellows_coil': rgba, 'smelter_coil': rgba}   facing RIGHT, origin bottom-centre
    derived(id, img) -> {suffix: rgba or (rgba, dox)} on the anim_frames canvas (idle_1, attack, hurt)
    field is not needed: the coils are battle-only adds.
"""
import numpy as np
import pal as P
from pix import hex2rgb, blank
import anim_frames as AF
import cleanup as CL

W, H = 46, 58
CX = 22.5


def C(ref):
    c = np.array(hex2rgb(P.color(ref, 'coil')), np.float32) / 255
    return np.array([c[0], c[1], c[2], 1.0], np.float32)


KINDS = {
    'bellows_coil': dict(pipe=['wood:0', 'wood:1', 'wood:2', 'wood:3', 'wood:4', 'gold:3'],
                         glow=['roof_red:3', 'fire:2', 'fire:3', 'fire:4'],
                         stand=['shadow:0', 'shadow:2', 'stone_warm:1', 'stone_warm:2', 'stone_warm:3'],
                         radius=11.0, turns=3.0, top='bellows'),
    'smelter_coil': dict(pipe=['shadow:0', 'shadow:1', 'shadow:2', 'stone_warm:1', 'stone_warm:2', 'stone_warm:3'],
                         glow=['fire:3', 'fire:4', 'fire:5', 'metal:4'],
                         stand=['shadow:0', 'shadow:2', 'wood:1', 'wood:2', 'wood:3'],
                         radius=10.0, turns=3.0, top='crucible'),
}


def disc(cv, zb, cx, cy, r, depth, colors, glow=None, gl=0.0, light=(-0.55, -0.7)):
    """a shaded tube cross-section: a disc lit from the upper left; `glow` paints a hot line through the middle
    (gl 0..1 chooses how bright)"""
    R = int(np.ceil(r)) + 1
    for yy in range(int(cy) - R, int(cy) + R + 1):
        for xx in range(int(cx) - R, int(cx) + R + 1):
            if not (0 <= xx < W and 0 <= yy < H):
                continue
            dx, dy = xx + 0.5 - cx, yy + 0.5 - cy
            d = np.hypot(dx, dy)
            if d > r:
                continue
            if depth < zb[yy, xx] - 0.001:
                continue
            nz = np.sqrt(max(0.0, 1 - (d / r) ** 2))
            lam = (dx * light[0] + dy * light[1]) / max(r, 1e-3) * 0.55 + nz * 0.55
            k = np.clip(lam, 0, 0.999)
            ref = colors[1 + int(k * (len(colors) - 2))] if depth > 0 else colors[1 + int(k * (len(colors) - 4))]
            if glow is not None and d < r * 0.38 and depth > -0.2:
                ref = glow[min(len(glow) - 1, int(gl * (len(glow) - 0.01)))]
            cv[yy, xx] = C(ref)
            zb[yy, xx] = depth


def coil(cv, zb, kind, glow_lvl, bob=0, lean=0.0):
    """a spring of pipe: tube radius 2.1, ellipse amplitude 2, pitch 9, three turns, the glow a seam down the
    front of every turn (drawn after the shading so no later tube pixel can bury it)"""
    spec = KINDS[kind]
    top, bot = 17 + bob, 43 + bob
    Rr = spec['radius']
    turns = spec['turns']
    n = 360
    pts = []
    for i in range(n + 1):
        u = i / n
        t = u * turns * 2 * np.pi + 0.6
        y = bot + (top - bot) * u
        sway = lean * (1 - u)
        pts.append((CX + Rr * np.sin(t) + sway, y + 2.0 * np.cos(t), np.cos(t)))
    for (x, y, z) in pts:
        disc(cv, zb, x, y, 2.2 if z > 0 else 1.8, z, spec['pipe'])
    gl = spec['glow']
    k = min(len(gl) - 1, int(glow_lvl * (len(gl) - 0.01)))
    for (x, y, z) in pts:
        if z > 0.1:
            px, py = int(x), int(y)
            if 0 <= px < W and 0 <= py < H and abs(zb[py, px] - z) < 0.25:
                cv[py, px] = C(gl[k])
                if z > 0.5 and px - 1 >= 0 and abs(zb[py, px - 1] - z) < 0.4:
                    cv[py, px - 1] = C(gl[max(0, k - 1)])


def stand(cv, kind, bob=0, squash=0):
    """a flared pedestal: a ringed neck under the coil, a wide foot with a lit left edge"""
    sp = KINDS[kind]['stand']
    for y in range(44, 56):
        t = (y - 44) / 11.0
        half = 4.5 + 10.5 * t ** 1.9
        for x in range(int(CX - half), int(CX + half) + 1):
            k = 2 if x < CX - half * 0.25 else (1 if x < CX + half * 0.5 else 0)
            if x <= CX - half + 1.2:
                k = 3
            if y in (47, 51):
                k = max(0, k - 1)             # the ring grooves
            cv[y, x] = C(sp[k])
    for x in range(int(CX - 15), int(CX + 16)):
        cv[55, x] = C(sp[3] if x < CX else sp[1])
    for x in range(int(CX - 5), int(CX + 6)):  # the neck's brass collar under the coil
        cv[43, x] = C('gold:3' if x < CX else 'gold:2')


def top_bellows(cv, glow_lvl, bob=0, pump=0):
    """a leather bag in ridges with brass bands and a nozzle that points at the Warden (right)"""
    lea = ['earth:0', 'earth:1', 'earth:2', 'earth:3', 'earth:4']
    brass = ['wood:2', 'gold:2', 'gold:3', 'gold:4']
    cy = 6 + bob + pump
    for i, y in enumerate(range(cy - 2, cy + 9)):
        w = 5.5 + 3.0 * np.sin((i + 0.5) / 11 * np.pi) + (1.4 if (i % 3 == 1) else 0)
        for x in range(int(CX - w), int(CX + w) + 1):
            k = 3 if x < CX - w * 0.35 else (2 if x < CX + w * 0.35 else 1)
            if i % 3 == 1:
                k = max(0, k - 1)
            cv[y, x] = C(lea[k])
    for y in (cy - 2, cy + 8):
        for x in range(int(CX - 7), int(CX + 8)):
            cv[y, x] = C(brass[2 if x < CX else 1])
    # nozzle
    for x in range(int(CX + 7), int(CX + 14)):
        for y in (cy + 2, cy + 3):
            cv[y, x] = C(brass[2 if y == cy + 2 else 1])
    for y in range(cy + 1, cy + 5):
        cv[y, int(CX + 14)] = C(brass[3] if y in (cy + 2, cy + 3) else brass[0])
    # the nozzle glows when the bellows work
    gl = ['roof_red:4', 'fire:2', 'fire:3', 'fire:4'][min(3, int(glow_lvl * 3.99))]
    cv[cy + 2, int(CX + 15)] = C(gl)
    cv[cy + 3, int(CX + 15)] = C('roof_red:3')


def top_crucible(cv, glow_lvl, bob=0, tilt=0.0, drip=0):
    """a crucible cup (dark iron, a brass lip), molten slag inside, a spout on the right and a falling drip"""
    iron = ['shadow:0', 'shadow:2', 'stone_warm:1', 'stone_warm:2', 'stone_warm:3']
    cy = 8 + bob
    for i, y in enumerate(range(cy, cy + 9)):
        half = 9 - 0.55 * i + 0.0
        sh = int(tilt * (8 - i) * 0.35)
        for x in range(int(CX - half) + sh, int(CX + half) + 1 + sh):
            k = 3 if x < CX - half * 0.3 + sh else 2
            if x >= CX + half * 0.55 + sh:
                k = 1
            cv[y, x] = C(iron[k])
    sh0 = int(tilt * 2.8)
    # molten slag in the cup
    slag = ['roof_red:4', 'fire:2', 'fire:3', 'fire:4', 'fire:5']
    lvl = min(4, 1 + int(glow_lvl * 3.99))
    for x in range(int(CX - 7) + sh0, int(CX + 8) + sh0):
        cv[cy, x] = C(slag[min(4, lvl + (1 if (x + cy) % 3 == 0 else 0))])
        cv[cy + 1, x] = C(slag[max(0, lvl - 1)])
    # brass lip
    for x in range(int(CX - 10) + sh0, int(CX + 11) + sh0):
        cv[cy - 1, x] = C('gold:3' if x < CX else 'gold:2')
    # spout
    for x in range(int(CX + 10) + sh0, int(CX + 15) + sh0):
        cv[cy + 1, x] = C('stone_warm:3'); cv[cy + 2, x] = C('stone_warm:1')
    cv[cy, int(CX + 14) + sh0] = C(slag[lvl])
    return cy, sh0


def outline_and_rim(cv, kind):
    img = CL.ramp_outline(cv)
    # a warm rim on the upper-left edges so the dark iron reads on the dark stage
    al = img[..., 3] > 0.5
    p = np.pad(al, 1)
    up, left = p[:-2, 1:-1], p[1:-1, :-2]
    edge = al & (~up | ~left)
    from pix import to_oklab
    lab = to_oklab(img[..., :3].reshape(-1, 3)).reshape(img.shape[:2] + (3,))
    sel = edge & (lab[..., 0] < 0.42)
    img[sel] = C('gold:3' if kind == 'bellows_coil' else 'stone_warm:3')
    return img


def draw(kind, glow=0.6, bob=0, lean=0.0, pump=0, tilt=0.0, spray=0, drip=0, hurt=False):
    cv = blank(W, H)
    zb = np.full((H, W), -9.0, np.float32)
    stand(cv, kind, 0)
    zb[cv[..., 3] > 0.5] = 0.0
    # coil on top of the stand: the glow dims when hurt
    coil(cv, zb, kind, 0.0 if hurt else glow, bob=bob, lean=lean)
    # coil pixels must not be overwritten by the stand, so the stand is drawn first and the coil then paints over
    # with z-buffer only among tubes; (the stand is z = -9)
    if KINDS[kind]['top'] == 'bellows':
        top_bellows(cv, 0.0 if hurt else glow, bob=0, pump=pump)
    else:
        cy, sh0 = top_crucible(cv, 0.0 if hurt else glow, bob=0, tilt=tilt)
        # the drip under the spout
        gx = int(CX + 14) + sh0
        for k in range(3):
            y = cy + 4 + k * 2 + drip
            if 0 <= y < H - 1 and 0 <= gx < W:
                cv[y, gx] = C(['fire:4', 'fire:3', 'roof_red:4'][k])
        for k in range(spray):
            for j in range(3 + k):
                x, y = gx + 1 + j * 2, cy + 2 + int(0.5 * j * j * 0.5) + k * 2
                if 0 <= x < W and 0 <= y < H:
                    cv[y, x] = C(['fire:5', 'fire:4', 'fire:3'][min(2, j)])
    return outline_and_rim(cv, kind)


def base():
    return {k: draw(k) for k in KINDS}


def _onto(base_img, frame):
    cvs = AF.canvas(base_img)
    out = blank(*cvs.shape[1::-1])
    # the frame is drawn at base size; keep the same registration as the base
    h, w = frame.shape[:2]
    out[AF.PAD:AF.PAD + h, AF.PAD:AF.PAD + w] = frame
    return out


def derived(kind, base_img):
    """idle_1 (the glow swells; the bellows bag inflates / the slag drips), attack (a lunge toward the party with
    a flare; Slag Spray tilts the crucible and fans), hurt (the glow dies, the frame squashes)"""
    out = {}
    if kind == 'bellows_coil':
        out['idle_1'] = _onto(base_img, draw(kind, glow=1.0, pump=-1, bob=-1))
        out['attack'] = _onto(base_img, draw(kind, glow=1.0, pump=1, lean=2.5))
    else:
        out['idle_1'] = _onto(base_img, draw(kind, glow=1.0, bob=-1, drip=2))
        out['attack'] = _onto(base_img, draw(kind, glow=1.0, tilt=1.0, lean=1.5, spray=2))
    hurt = draw(kind, glow=0.0, lean=-2.0, hurt=True)
    hurt = AF.edge_lift(_onto(base_img, hurt), 2, prefer=('shadow', 'stone_warm', 'wood', 'roof_red'))
    out['hurt'] = hurt
    return out


if __name__ == '__main__':
    import os
    from pix import contact, OUT
    items = []
    for k in KINDS:
        items += [(k, draw(k)), (k + ' idle1', draw(k, glow=1.0, bob=-1, pump=-1, drip=2)),
                  (k + ' attack', draw(k, glow=1.0, tilt=1.0, lean=2.0, pump=1, spray=2)),
                  (k + ' hurt', draw(k, hurt=True, lean=-2))]
    os.makedirs(os.path.join(OUT, 'e3'), exist_ok=True)
    contact(items, os.path.join(OUT, 'e3', 'coils_8x.png'), scale=8, cols=4, bg=(34, 28, 30))
