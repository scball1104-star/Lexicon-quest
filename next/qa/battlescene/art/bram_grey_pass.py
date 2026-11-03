"""E3-fixes-battle (CRITIQUE_5 item 7, EPISODE3_PLAN 9 decision 2, default yes): Bram's field and battle frames go grey
to match his grey-bearded portrait. Uses tools/art/sprites/bram_grey.py's hair ramps and bands (read only): the
temples and beard take the grey ramp, the crown a salt-and-pepper mix of brown and grey (a man of about fifty).

  python next/qa/battlescene/art/bram_grey_pass.py --field <untouched party_field.png> --battle <untouched party_battle.png>
     [--preview out.png]   writes the two sheets in assets/sprites (Bram's frames only; every other pixel is kept)
Fold this into the sprite build (LQ_BRAM_GREY / bram_grey.ENABLED) if the sheets are ever rebuilt.
"""
import argparse, json, pathlib, sys
import numpy as np
from PIL import Image
from scipy import ndimage as ndi
NEXT = pathlib.Path(__file__).resolve().parents[3]
sys.path.insert(0, str(NEXT / 'tools/art/sprites'))
import bram_grey as BG

CROWN_MIX = 0.45     # share of grey in the crown


def grey(img):
    out = BG.apply(img)
    op = img[..., 3] > 0.5
    hair = op & np.any([np.all(np.abs(img[..., :3] - b) < 0.012, -1) for b in BG.BROWN], 0)
    if not hair.any(): return out
    # the head's hair only: the biggest hair blob within 14 rows of the top hair row (not boots, belt or shaft)
    y0 = np.nonzero(hair)[0].min(); hair[y0 + 14:] = False
    lab, n = ndi.label(hair, np.ones((3, 3)))
    head = lab == 1 + np.argmax(ndi.sum(hair, lab, range(1, n + 1)))
    for b, g in zip(BG.BROWN, BG.GREY):
        m = head & np.all(np.abs(img[..., :3] - b) < 0.012, -1) & np.all(out[..., :3] == img[..., :3], -1)
        out[m, :3] = b * (1 - CROWN_MIX) + g * CROWN_MIX
    return out


def do_sheet(src, name, out):
    fr = json.loads((NEXT / f'assets/sprites/{name}.json').read_text())['frames']
    im = Image.open(src); mode = im.mode
    a = np.array(im.convert('RGBA')).astype(np.float32) / 255
    n = 0
    for k, v in fr.items():
        if not k.startswith('bram'): continue
        x, y, w, h = v[:4]
        a[y:y + h, x:x + w] = grey(a[y:y + h, x:x + w]); n += 1
    b = np.round(a * 255).astype(np.uint8)
    # paletted with one transparent index (lossless while alpha is 0 or 255; party_field went 11.8 KB RGBA -> about 6 KB)
    if mode == 'P' or set(np.unique(b[..., 3])) <= {0, 255}:
        vis = b[..., 3] > 0
        cols, inv = np.unique(b[vis][:, :3], axis=0, return_inverse=True); assert len(cols) <= 255
        idx = np.full(vis.shape, 255, np.uint8); idx[vis] = inv.reshape(-1)
        p = Image.fromarray(idx, 'P'); p.putpalette([int(c) for c in cols.reshape(-1)] + [0, 0, 0] * (256 - len(cols)))
        p.save(out, optimize=True, transparency=255)
    else:
        Image.fromarray(b, 'RGBA').save(out, optimize=True)
    print(name, n, 'frames ->', out)


ap = argparse.ArgumentParser(); ap.add_argument('--field', required=True); ap.add_argument('--battle', required=True); ap.add_argument('--preview')
a = ap.parse_args()
do_sheet(a.field, 'party_field', NEXT / 'assets/sprites/party_field.png')
do_sheet(a.battle, 'party_battle', NEXT / 'assets/sprites/party_battle.png')
if a.preview:
    rows = []
    for name, src in (('party_field', a.field), ('party_battle', a.battle)):
        fr = json.loads((NEXT / f'assets/sprites/{name}.json').read_text())['frames']
        for sheet in (src, NEXT / f'assets/sprites/{name}.png'):
            im = Image.open(sheet).convert('RGBA'); tiles = []
            for k in ['bram_down_0', 'bram_left_0', 'bram_up_0'] if name == 'party_field' else ['bram_spear_idle_0', 'bram_spear_strike', 'bram_spear_victory']:
                x, y, w, h = fr[k][:4]; tiles.append(im.crop((x, y, x + w, y + h)).resize((w * 6, h * 6), Image.NEAREST))
            rows.append(tiles)
    W = max(sum(t.width + 12 for t in r) for r in rows); H = sum(max(t.height for t in r) + 12 for r in rows)
    por = Image.open(NEXT / 'assets/sprites/portraits.png').convert('RGBA'); pf = json.loads((NEXT / 'assets/sprites/portraits.json').read_text())['frames']['bram_48']
    pc = por.crop((pf[0], pf[1], pf[0] + pf[2], pf[1] + pf[3])).resize((pf[2] * 5, pf[3] * 5), Image.NEAREST)
    sheet = Image.new('RGBA', (W + pc.width + 20, max(H, pc.height)), (70, 96, 72, 255)); sheet.paste(pc, (0, 0), pc)
    yy = 0
    for r in rows:
        xx = pc.width + 20
        for t in r: sheet.paste(t, (xx, yy), t); xx += t.width + 12
        yy += max(t.height for t in r) + 12
    sheet.save(a.preview); print('preview', a.preview)
