"""Append derived animation frames to a battle atlas without moving any existing frame (W6-anim).

    sheet, rects, origin = append(sheet, rects, origin, frames, width=512)

frames: [(name, rgba, ox, oy)] on the generator's padded canvas. Each is trimmed to its alpha bbox (the origin
moves with the crop) and shelf-packed, tallest first, into a block placed under the base sheet. The base
sheet's pixels and every existing rect stay exactly where they were; the sheet only grows right and down.
"""
from pix import blank, Shelf
import anim_frames as AF


def append(sheet, rects, origin, frames, width=512, pad=2):
    items = []
    for name, img, ox, oy in frames:
        t, tox, toy = AF.trim(img, ox, oy)
        items.append((name, t, tox, toy))
    order = sorted(range(len(items)), key=lambda i: (-items[i][1].shape[0], i))
    sh = Shelf(width, pad=pad)
    for i in order:
        sh.add(items[i][0], items[i][1])
    block, brects = sh.render()
    H0, W0 = sheet.shape[:2]
    top = H0 + pad
    W = max(W0, width)
    out = blank(W, top + block.shape[0])
    out[:H0, :W0] = sheet
    out[top:top + block.shape[0], :block.shape[1]] = block
    rects = dict(rects)
    origin = dict(origin)
    for name, t, tox, toy in items:
        x, y, w, h = brects[name]
        rects[name] = [x, y + top, w, h]
        origin[name] = [int(tox), int(toy)]
    return out, rects, origin


IDLE_FPS = round(60 / 36, 4)    # the 2-frame breathe changes every 36 game frames
DIE_FPS = 15                    # die_0..2 at 4 game frames each


def enemy_anims(eid, names):
    an = {}
    if f'{eid}_idle_1' in names:
        an[f'{eid}_idle'] = {'frames': [eid, f'{eid}_idle_1'], 'fps': IDLE_FPS, 'loop': True}
    if f'{eid}_die_0' in names:
        an[f'{eid}_die'] = {'frames': [f'{eid}_die_{i}' for i in range(3)], 'fps': DIE_FPS, 'loop': False}
    return an


def save_indexed(a, path):
    """Lossless indexed PNG (the battle atlases use under 256 colours): about a third of the RGBA file size.
    Falls back to RGBA when a sheet ever has more than 256 distinct RGBA values."""
    import numpy as np
    from PIL import Image
    from pix import save_png
    q = (np.clip(a, 0, 1) * 255 + 0.5).astype(np.uint8)   # the same rounding as pix.to_pil
    q[q[..., 3] == 0] = 0
    flat = q.reshape(-1, 4)
    uniq, inv = np.unique(flat, axis=0, return_inverse=True)
    if len(uniq) > 256:
        return save_png(a, path)
    # transparent first so index 0 is the clear colour
    order = np.argsort(uniq[:, 3] != 0, kind='stable')
    remap = np.empty(len(uniq), np.int64)
    remap[order] = np.arange(len(uniq))
    uniq = uniq[order]
    idx = remap[inv.reshape(-1)].reshape(q.shape[:2]).astype(np.uint8)
    im = Image.fromarray(idx, 'P')
    im.putpalette(uniq[:, :3].reshape(-1).tolist())
    im.save(path, optimize=True, transparency=bytes(uniq[:, 3].tolist()))
