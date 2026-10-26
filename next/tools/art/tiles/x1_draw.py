"""Small drawing helpers shared by the x1 prop, building and far-decal modules (top-left light, 1 px dark outline in the
material's own dark, a baked ground shadow to the right). Everything draws into pxlib.Canvas and only uses palette ramps."""
import math
from pxlib import Canvas, C, SH, DARK, WHITE, rnd, h32

K = lambda i: C('stone_cool', i)       # 251d34 2e2b4c 4c445c 66637f 8e8997 b3b6c4
SW = lambda i: C('stone_warm', i)      # 2e2b4c 584951 7e6d6e a18f85 cfb89c ebdfc8
WD = lambda i: C('wood', i)            # 2d1b1f 482826 6e3d2c 8f5533 b87942 d69c57
EA = lambda i: C('earth', i)           # 2d1b1f 482826 6a4532 896042 ae8458
PA = lambda i: C('path', i)            # 6a4532 896042 ae8458 c3a57c e4cb96
SA = lambda i: C('sand', i)            # ae8458 c3a57c e4cb96 f6e4b9
GR = lambda i: C('grass', i)           # 1c3730 2a532f 427330 5a9032 84ad39 b6cc58
FD = lambda i: C('foliage_dark', i)    # 1b2332 1c3730 2a532f 427330
RG = lambda i: C('roof_green', i)      # 1b2332 1c3730 285743 397951 4f9e6e
MT = lambda i: C('metal', i)           # 2e2b4c 66637f b3b6c4 e2e0de f6f4ee
GD = lambda i: C('gold', i)            # 482826 8f5533 c38334 eba14d f9d77a fff7d6
FI = lambda i: C('fire', i)            # 571f28 b34532 e06b39 eba14d f9d77a fff7d6
RR = lambda i: C('roof_red', i)        # 2d1b1f 571f28 87332e b34532 e06b39 eba14d
WA = lambda i: C('water', i)
ICE = lambda i: C('ice', i)
IK = lambda i: C('ink', i)
SD = lambda i: C('shadow', i)
CB = lambda i: C('cloth_blue', i)
CP = lambda i: C('cloth_purple', i)
BL = lambda i: C('blossom', i)
CY = lambda i: C('magic_cyan', i)
HV = lambda i: C('hair_violet', i)
RP = lambda i: C('roof_purple', i)
SKL = lambda i: C('skin_light', i)


def ell(cv, cx, cy, rx, ry, fn):
    """Fill an ellipse; fn(dx, dy, d) -> colour or None (dx, dy normalised -1..1, d = radius 0..1)."""
    for y in range(int(cy - ry) - 1, int(cy + ry) + 2):
        for x in range(int(cx - rx) - 1, int(cx + rx) + 2):
            dx, dy = (x + 0.5 - cx) / rx, (y + 0.5 - cy) / ry
            d = math.sqrt(dx * dx + dy * dy)
            if d <= 1.0:
                c = fn(dx, dy, d)
                if c is not None:
                    cv.put(x, y, c)


def lit(ramp, outline=None, hi_t=0.5, mid_t=0.0, lo_t=-0.45, edge=0.86):
    """An ellipse colour function from a 4 step list [dark, mid-dark, mid, light]: lit from the top left, outline at the rim."""
    d0, d1, d2, d3 = ramp

    def fn(dx, dy, d):
        if outline is not None and d > edge:
            return outline
        t = -0.55 * dx - 0.75 * dy + 0.15 - d * 0.25
        if t > hi_t:
            return d3
        if t > mid_t:
            return d2
        if t > lo_t:
            return d1
        return d0
    return fn


def gshadow(cv, cx, cy, rx, ry, a=84):
    """A baked ground shadow: an ellipse of translucent indigo, checker-dithered at the rim."""
    for y in range(int(cy - ry) - 1, int(cy + ry) + 2):
        for x in range(int(cx - rx) - 1, int(cx + rx) + 2):
            dx, dy = (x + 0.5 - cx) / rx, (y + 0.5 - cy) / ry
            d = dx * dx + dy * dy
            if d <= 1.0 and (d < 0.55 or (x + y) % 2 == 0):
                cv.put(x, y, SH(a if d < 0.55 else a - 24))


def blk(cv, x0, y0, x1, y1, hi, mid, lo, out, corners=False):
    """Lit block (inclusive bounds): outline, light top-left, dark bottom-right."""
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            if not corners and (x in (x0, x1)) and (y in (y0, y1)):
                continue
            if x in (x0, x1) or y in (y0, y1):
                c = out
            elif y == y0 + 1 or x == x0 + 1:
                c = hi
            elif y == y1 - 1 or x == x1 - 1:
                c = lo
            else:
                c = mid
            cv.set(x, y, c)


def mask_shade(cv, mask, ramp, outline, x0=0, y0=0, tex=None):
    """Fill a boolean mask (numpy h x w) with a 4 step ramp [dark, mid-dark, mid, light]: light on top/left rims, dark on
    bottom/right rims, an outline all round. tex(x, y) -> optional override colour for interior pixels."""
    h, w = mask.shape
    d0, d1, d2, d3 = ramp
    for y in range(h):
        for x in range(w):
            if not mask[y, x]:
                continue
            up = y > 0 and mask[y - 1, x]
            lf = x > 0 and mask[y, x - 1]
            dn = y < h - 1 and mask[y + 1, x]
            rt = x < w - 1 and mask[y, x + 1]
            if not (up and lf and dn and rt):
                c = outline
                # the lit rim sits one pixel inside the outline
            else:
                up2 = y > 1 and mask[y - 2, x]
                lf2 = x > 1 and mask[y, x - 2]
                dn2 = y < h - 2 and mask[y + 2, x]
                rt2 = x < w - 2 and mask[y, x + 2]
                if not up2 or not lf2:
                    c = d3
                elif not dn2 or not rt2:
                    c = d1
                else:
                    c = d2
                if tex is not None:
                    t = tex(x, y)
                    if t is not None:
                        c = t
            cv.set(x0 + x, y0 + y, c)


def tuft(cv, x, y, light=None, dark=None):
    """A little grass tuft 5 px wide standing at (x, y) (its feet)."""
    light = light or GR(4)
    dark = dark or GR(2)
    for dx, dy, c in ((-2, -2, dark), (0, -3, light), (2, -2, dark), (-1, -1, light), (1, -1, light), (0, -2, dark),
                      (-2, -1, dark), (2, -1, dark), (-1, 0, dark), (0, 0, dark), (1, 0, dark)):
        cv.set(x + dx, y + dy, c)


def poly_fill(cv, pts, fn):
    """Scanline fill of a polygon [(x, y)...]; fn(x, y) -> colour."""
    ys = [p[1] for p in pts]
    n = len(pts)
    for y in range(int(min(ys)), int(max(ys)) + 1):
        xs = []
        for i in range(n):
            (x0, y0), (x1, y1) = pts[i], pts[(i + 1) % n]
            if (y0 <= y + 0.5 < y1) or (y1 <= y + 0.5 < y0):
                xs.append(x0 + (y + 0.5 - y0) * (x1 - x0) / (y1 - y0))
        xs.sort()
        for i in range(0, len(xs) - 1, 2):
            for x in range(int(math.floor(xs[i] + 0.5)), int(math.floor(xs[i + 1] + 0.5))):
                c = fn(x, y)
                if c is not None:
                    cv.put(x, y, c)


def line_px(cv, x0, y0, x1, y1, c, thick=1):
    n = max(abs(x1 - x0), abs(y1 - y0), 1)
    for k in range(n + 1):
        x = round(x0 + (x1 - x0) * k / n)
        y = round(y0 + (y1 - y0) * k / n)
        for j in range(thick):
            cv.set(x, y + j, c)


def stamp(cv, rows, x, y, cm):
    cv.stamp(rows, x, y, cm, blend=True)


def strip_frames(frames):
    w, h = frames[0].w, frames[0].h
    s = Canvas(w * len(frames), h)
    for i, f in enumerate(frames):
        s.paste(f, i * w, 0)
    return s


def add_obj(sh, oid, frames, anchor, footprint, overhead=0, door=None, kind='prop', anim=None, states=False, **extra):
    """Pack frames as a strip. rect = frame 0.
    anim=(frame_indices, ms): the strip loops (meta 'anim' with frameDx = frame width);
    states=True: meta 'frames' lists every frame's rect (the event's `state` picks one, as in the court and the forge).
    Both may be given (a state object that also has an animation 'turnAnim' goes in extra)."""
    if isinstance(frames, Canvas):
        frames = [frames]
    s = strip_frames(frames)
    x, y = sh.alloc(s.w, s.h)
    sh.cv.paste(s, x, y)
    w, h = frames[0].w, frames[0].h
    m = {'rect': [x, y, w, h], 'anchor': list(anchor), 'footprint': [list(f) for f in footprint], 'overheadRows': overhead,
         'doorAt': list(door) if door is not None else None, 'collision': 'solid', 'kind': kind}
    if anim:
        m['anim'] = {'frames': list(anim[0]), 'frameDx': w, 'ms': anim[1]}
    if states:
        m['frames'] = [[x + i * w, y, w, h] for i in range(len(frames))]
    m.update(extra)
    sh.meta['objects'][oid] = m
    return m


def add_tile(sh, tid, cv, collision='none', **extra):
    x, y = sh.alloc(cv.w, cv.h)
    sh.cv.paste(cv, x, y)
    m = {'x': x, 'y': y, 'w': cv.w, 'h': cv.h, 'collision': collision}
    m.update(extra)
    sh.meta['tiles'][tid] = m
    return m


def alias(sh, new_id, old_id, kind='objects', note=None):
    """A second id for an existing entry (plan and brief spell some ids differently)."""
    d = dict(sh.meta[kind][old_id])
    d['note'] = (note or ('alias of %s' % old_id))
    sh.meta[kind][new_id] = d
