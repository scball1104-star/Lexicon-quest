"""Walk-cycle derivation for 24x32 field sprites.

Front/back views: the body bobs down 1 px on step frames; each leg is a column strip whose rows are
compressed (one row dropped for the planted leg, two for the raised leg, so its foot lifts 1 px);
the arm strips swing (the arm on the side of the raised leg moves 1 px down, the other stays).
Side views: the body bobs and the leg block is replaced by hand-drawn step legs.
"""
import numpy as np
from pix import blank

CW, CH = 24, 32


def shift(a, dx=0, dy=0):
    out = np.zeros_like(a)
    H, W = a.shape[:2]
    ys0, ys1 = max(0, -dy), min(H, H - dy)
    xs0, xs1 = max(0, -dx), min(W, W - dx)
    out[ys0 + dy:ys1 + dy, xs0 + dx:xs1 + dx] = a[ys0:ys1, xs0:xs1]
    return out


def front_step(stand, spec, raised_leg, bob=None):
    """raised_leg: 0 = image-left leg lifted, 1 = image-right leg lifted.
    spec: hip, legs [(x0,x1)], drop {'plant':[rows], 'raise':[rows]}, optional arms, bob, sway (y0,y1,x0,x1)"""
    hip = spec['hip']
    if bob is None:
        bob = spec.get('bob', 1)
    out = shift(stand, 0, bob)
    if 'sway' in spec:
        y0, y1, x0, x1 = spec['sway']
        dx = 1 if raised_leg == 0 else -1
        blk = out[y0:y1 + 1, x0:x1 + 1].copy()
        sh = shift(blk, dx, 0)
        # keep the outermost columns from vanishing: only move pixels, never open holes inside
        out[y0:y1 + 1, x0:x1 + 1] = np.where(sh[..., 3:4] > 0, sh, 0)
    for li, (x0, x1) in enumerate(spec['legs']):
        drop = spec['drop']['raise' if li == raised_leg else 'plant']
        rows = [r for r in range(hip, CH) if r not in drop]
        strip = stand[rows, x0:x1 + 1]
        out[hip + bob:, x0:x1 + 1] = 0
        top = hip + bob
        out[top:top + len(rows), x0:x1 + 1] = strip
    # arms: (x0, x1, y0, y1, flex). The arm on the raised-leg side swings forward (hand 1 px lower than
    # the bobbed body: the flex row is duplicated); the other swings back (flex row dropped, hand 1 px higher).
    for ai, (x0, x1, y0, y1, flex) in enumerate(spec.get('arms', [])):
        rows = list(range(y0, y1 + 1))
        if ai == raised_leg:
            k = rows.index(flex); rows = rows[:k + 1] + rows[k:]
        else:
            rows = [r for r in rows if r != flex]
        strip = stand[rows, x0:x1 + 1]
        out[y0 + bob:y1 + 2 + bob, x0:x1 + 1] = 0
        out[y0 + bob:y0 + bob + len(rows), x0:x1 + 1] = strip
    return out


def side_step(stand, spec, legs, bob=None, sway_dir=0):
    x0, x1 = spec['region']
    if bob is None:
        bob = spec.get('bob', 1)
    out = shift(stand, 0, bob)
    if 'sway' in spec and sway_dir:
        sy0, sy1, sx0, sx1 = spec['sway']
        blk = out[sy0:sy1 + 1, sx0:sx1 + 1].copy()
        out[sy0:sy1 + 1, sx0:sx1 + 1] = shift(blk, sway_dir, 0)
    n = len(legs)
    top = CH - n
    out[top:, x0:x1 + 1] = 0
    out[top:, x0:x1 + 1] = np.where(legs[:, x0:x1 + 1, 3:4] > 0, legs[:, x0:x1 + 1], 0)
    return out
