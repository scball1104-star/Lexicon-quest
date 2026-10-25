"""Bram's grey (EPISODE3_PLAN 9.2, decision 2 for Scott): a recolour of his existing field and battle frames that adds
grey to the beard and the temples, so the sprites match the grey-bearded `bram` portrait. A recolour, no redraw:
every hair-brown pixel in two bands of the head turns to the matching step of a grey ramp.

    ENABLED          the ONE flag. False by default (Scott's decision is pending); True when the environment
                     variable LQ_BRAM_GREY=1 is set for the build:   LQ_BRAM_GREY=1 python build_all.py
    apply(img)       -> img recoloured (always; callers check ENABLED)
    python bram_grey.py     writes out/bram_grey_before_after.png: the field and battle frames before and after, next
                            to the bram portrait (works with the flag off)

The bands, measured from the top row of the hair (y0): the temples are y0+4 .. y0+8 within 2 px of the head's left and
right edge; the beard is y0+9 .. y0+13 (everything hair-brown). The crown stays brown, so he reads as a brown-haired
man gone grey at the jaw and sides (Chrono Trigger's Frog / FF6's Cyan manner: a few steps, not a wash).
"""
import os
import numpy as np
import pal as P
from pix import hex2rgb

ENABLED = os.environ.get('LQ_BRAM_GREY', '0') == '1'


def _c(ref):
    return np.array(hex2rgb(P.color(ref, 'bram_grey')), np.float32) / 255


# hair_brown 1,2,3,4 -> a grey beard ramp (stone_cool 3, 4, 5 and metal 3); step 0 is the outline and stays
BROWN = [_c('hair_brown:%d' % i) for i in (1, 2, 3, 4)]
GREY = [_c('stone_cool:3'), _c('stone_cool:4'), _c('stone_cool:5'), _c('metal:3')]


def apply(img):
    out = img.copy()
    op = img[..., 3] > 0.5
    hair = np.zeros(op.shape, bool)
    which = np.full(op.shape, -1)
    for i, c in enumerate(BROWN):
        m = op & np.all(np.abs(img[..., :3] - c) < 0.012, -1)
        hair |= m
        which[m] = i
    ys, xs = np.nonzero(hair)
    if not len(ys):
        return out
    y0 = ys.min()
    sel_rows = (np.arange(op.shape[0]) >= y0 + 4) & (np.arange(op.shape[0]) <= y0 + 13)
    # the head's horizontal extent over the temple and beard rows (hair and skin together, x of opaque pixels)
    band = np.zeros(op.shape, bool)
    band[(y0 + 4):(y0 + 14), :] = True
    cols = np.nonzero((op & band).any(0))[0]
    # the head is the widest connected span near the hair: take the extent of the hair pixels' columns
    hx = np.nonzero(hair.any(0))[0]
    xmin, xmax = hx.min(), hx.max()
    yy, xx = np.mgrid[0:op.shape[0], 0:op.shape[1]]
    temples = hair & (yy >= y0 + 4) & (yy <= y0 + 8) & ((xx <= xmin + 2) | (xx >= xmax - 2))
    beard = hair & (yy >= y0 + 9) & (yy <= y0 + 13)
    sel = temples | beard
    for i, g in enumerate(GREY):
        m = sel & (which == i)
        out[m, :3] = g
    return out


def _rgb(a, bg=(70, 96, 72)):
    from PIL import Image
    im = Image.new('RGBA', (a.shape[1], a.shape[0]), bg + (255,))
    t = Image.fromarray((np.clip(a, 0, 1) * 255).astype('uint8'), 'RGBA')
    im.alpha_composite(t)
    return im


def main():
    import sys, json
    sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'chars'))
    from pix import OUT, DST
    from PIL import Image, ImageDraw
    import build_party_field as BF
    import build_party_battle as BB
    f = BF.char_frames('bram')
    bf = dict(BB.frames_for('bram'))
    sets = [('field down', f['down'][0], 8), ('field left', f['left'][0], 8), ('field up', f['up'][0], 8),
            ('battle spear', bf['spear_idle_0'], 6), ('battle hurt', bf['hurt'], 6), ('battle victory', bf['spear_victory'], 6)]
    pj = json.load(open(os.path.join(DST, 'portraits.json')))
    pim = np.asarray(Image.open(os.path.join(DST, 'portraits.png')).convert('RGBA')).astype(np.float32) / 255
    x, y, w, h = pj['frames']['bram_48']
    portrait = pim[y:y + h, x:x + w]
    colw = [48 * 6 + 12] + [fr.shape[1] * sc + 12 for _, fr, sc in sets]
    rowh = max(fr.shape[0] * sc for _, fr, sc in sets) + 24
    canvas = Image.new('RGB', (sum(colw) + 8, 2 * rowh + 8), (36, 44, 66))
    d = ImageDraw.Draw(canvas)
    px = canvas.width and 4
    pimg = _rgb(portrait, (36, 44, 66)).resize((48 * 6, 48 * 6), Image.NEAREST)
    canvas.paste(pimg, (4, rowh - 48 * 3 + 4))
    d.text((4, 2), 'bram portrait (reference)', fill=(230, 230, 210))
    xo = colw[0]
    for lab, fr, sc in sets:
        for r, after in enumerate((False, True)):
            im = _rgb(apply(fr) if after else fr).resize((fr.shape[1] * sc, fr.shape[0] * sc), Image.NEAREST)
            canvas.paste(im, (xo + 4, r * rowh + 16))
            d.text((xo + 4, r * rowh + 2), '%s %s' % (lab, 'AFTER' if after else 'before'), fill=(230, 230, 210))
        xo += fr.shape[1] * sc + 12
    out = os.path.join(OUT, 'bram_grey_before_after.png')
    canvas.save(out)
    # head zoom: the head rows of the field down frame at 14x, before and after, beside the portrait's face
    fr = f['down'][0]
    zoom = Image.new('RGB', (24 * 14 * 2 + 12 + 48 * 6, 14 * 15), (36, 44, 66))
    for i, after in enumerate((False, True)):
        im = _rgb((apply(fr) if after else fr)[0:15]).resize((24 * 14, 15 * 14), Image.NEAREST)
        zoom.paste(im, (i * (24 * 14 + 6), 0))
    zoom.paste(pimg.crop((0, 0, 48 * 6, 15 * 14)), (24 * 14 * 2 + 12, 0))
    zoom.save(os.path.join(OUT, 'bram_grey_head_zoom.png'))
    print(out)


if __name__ == '__main__':
    main()
