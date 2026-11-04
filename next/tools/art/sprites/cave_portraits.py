"""The Deep Stacks pack's portraits -> assets/sprites/cave_portraits.png / .json (CRITIQUE_STACKS 21).

One portrait: Hollis, the Archivist (chars/portrait_hollis.py, the W12 SDF renderer), as hollis_48 (dialogue) and
hollis_32 (menus), the same shape as portraits.json. The pack loader merges `cave_portraits` into `portraits`
(assets.js MERGE_BASES), so the dialogue finds `hollis_48` for the speaker id `hollis` and nothing in the first
download grows. Preview: out/cave_portraits_6x.png.

    python next/tools/art/sprites/cave_portraits.py
"""
import os
import sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, 'chars'))
from pix import *
import portrait_hollis as H

NEXT = os.path.normpath(os.path.join(HERE, '..', '..', '..'))
DST = os.path.join(NEXT, 'assets', 'sprites')
OUT = os.path.join(HERE, 'out')


def build():
    b48, s32 = H.portrait(48), H.portrait(32)
    sh = Shelf(96, pad=0)
    sh.add('hollis_48', b48)
    sh.add('hollis_32', s32)
    sheet, rects = sh.render()
    save_png(sheet, os.path.join(DST, 'cave_portraits.png'))
    meta = {'image': 'cave_portraits.png', 'frames': rects, 'portraits': {'hollis': {'48': 'hollis_48', '32': 'hollis_32'}},
            'sources': {'hollis': 'SDF render (chars/portrait_hollis.py, the W12 renderer)'},
            'notes': 'Deep Stacks pack portraits, merged into portraits by the pack loader. Same shape as portraits.json.'}
    write_json(os.path.join(DST, 'cave_portraits.json'), meta)
    os.makedirs(OUT, exist_ok=True)
    contact([('hollis_48', b48), ('hollis_32', s32)], os.path.join(OUT, 'cave_portraits_6x.png'), scale=6, cols=2, title='Hollis 48 and 32 at 6x')
    return meta


if __name__ == '__main__':
    print(build()['frames'])
