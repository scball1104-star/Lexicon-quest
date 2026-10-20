"""Quick preview of the derived enemy frames from the CURRENT atlases (no repaint): writes
out/anim_<id>_4x.png contact sheets. python anim_preview.py [id ...]"""
import os, sys, json
import numpy as np
from PIL import Image
from pix import OUT, DST, contact, blank
import anim_frames as AF


def load_atlas(name):
    with open(os.path.join(DST, name + '.json'), encoding='utf-8') as f:
        j = json.load(f)
    im = Image.open(os.path.join(DST, name + '.png')).convert('RGBA')
    return j, np.asarray(im, np.float32) / 255


def frame(j, a, n):
    x, y, w, h = j['frames'][n]
    return a[y:y + h, x:x + w].copy()


ORDER = ['idle_1', 'attack', 'hurt', 'cast', 'die_0', 'die_1', 'die_2']

if __name__ == '__main__':
    ids = sys.argv[1:] or list(AF.ENEMY_ANIM)
    j, a = load_atlas('enemies_battle')
    for eid in ids:
        base = frame(j, a, eid)
        fr = AF.derive_enemy(eid, base, AF.ENEMY_ANIM[eid])
        items = AF.contact_items(eid, base, fr, ORDER)
        contact(items, os.path.join(OUT, f'anim_{eid}_4x.png'), scale=4, cols=8, bg=(41, 38, 87), title=f'{eid} derived frames at 4x')
        print(eid, {k: v[0].shape[:2] for k, v in fr.items()})
