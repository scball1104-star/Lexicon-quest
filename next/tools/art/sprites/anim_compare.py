"""Side-by-side judge sheet: for each derived frame, base | derived | diff (red = removed, green = added,
yellow = changed) at 6x. python anim_compare.py <id> [names...]  -> out/anim_cmp_<id>.png"""
import os, sys, json
import numpy as np
from PIL import Image, ImageDraw
from pix import OUT, DST, blank
import anim_frames as AF
from anim_preview import load_atlas, frame, ORDER


def tile(a, scale, bg=(41, 38, 87)):
    h, w = a.shape[:2]
    im = Image.new('RGBA', (w, h), bg + (255,))
    im.alpha_composite(Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8), 'RGBA'))
    return im.resize((w * scale, h * scale), Image.NEAREST)


def diff_img(base_c, der, scale):
    # both on the same padded canvas size (hurt is wider: pad base to match)
    H = max(base_c.shape[0], der.shape[0]); W = max(base_c.shape[1], der.shape[1])
    A = blank(W, H); A[H - base_c.shape[0]:, :base_c.shape[1]] = base_c
    B = blank(W, H); B[H - der.shape[0]:, :der.shape[1]] = der
    ao, bo = A[..., 3] > 0.5, B[..., 3] > 0.5
    same = ao & bo & np.all(np.abs(A[..., :3] - B[..., :3]) < 1e-3, -1)
    out = np.zeros((H, W, 4), np.float32)
    out[same] = (0.35, 0.35, 0.45, 1)
    out[ao & ~bo] = (0.9, 0.2, 0.2, 1)
    out[bo & ~ao] = (0.2, 0.9, 0.3, 1)
    out[ao & bo & ~same] = (0.95, 0.85, 0.2, 1)
    return tile(out, scale, bg=(20, 16, 30))


def main(eid, names, sheet='enemies_battle', derive=None, scale=6):
    j, a = load_atlas(sheet)
    base = frame(j, a, eid)
    fr = derive(eid, base) if derive else AF.derive_enemy(eid, base, AF.ENEMY_ANIM[eid])
    names = names or [n for n in ORDER if n in fr]
    base_c = AF.canvas(base)
    rows = []
    for n in names:
        der = fr[n][0]
        rows.append((n, tile(base_c, scale), tile(der, scale), diff_img(base_c, der, scale)))
    cw = max(t[1].width for t in rows) + 8
    rh = max(t[1].height for t in rows) + 22
    img = Image.new('RGB', (cw * 3 + 8, rh * len(rows) + 4), (20, 16, 30))
    d = ImageDraw.Draw(img)
    for i, (n, b, dd, df) in enumerate(rows):
        y = 4 + i * rh
        d.text((6, y), f'{eid}: base | {n} | diff', fill=(235, 235, 210))
        for k, t in enumerate((b, dd, df)):
            img.paste(t, (4 + k * cw, y + 14))
    path = os.path.join(OUT, f'anim_cmp_{eid}.png')
    img.save(path)
    print(path, img.size)


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2:])
