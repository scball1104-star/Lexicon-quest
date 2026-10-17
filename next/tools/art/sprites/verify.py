"""Sanity checks: every atlas rect inside its image, every COMMON.md id present, no em dashes, no blurry
(semi-transparent) pixels except shadows/glow."""
import os, json, re
import numpy as np
from PIL import Image
from pix import DST, NEXT
ok = True
def fail(msg):
    global ok
    ok = False
    print('FAIL', msg)
for fn in sorted(os.listdir(DST)):
    if not fn.endswith('.json'):
        continue
    meta = json.load(open(os.path.join(DST, fn), encoding='utf-8'))
    img = np.asarray(Image.open(os.path.join(DST, meta['image'])).convert('RGBA'))
    H, W = img.shape[:2]
    rects = dict(meta.get('frames', {}))
    for k, o in meta.get('objects', {}).items():
        rects[k] = o['frame']
        for f in o.get('frames', []):
            rects[k + '*'] = f
    for k, (x, y, w, h) in rects.items():
        if x < 0 or y < 0 or x + w > W or y + h > H:
            fail('%s %s out of bounds' % (fn, k))
    for an, a in meta.get('anims', {}).items():
        for f in a['frames']:
            if f not in meta['frames']:
                fail('%s anim %s missing frame %s' % (fn, an, f))
    al = img[..., 3]
    semi = ((al > 0) & (al < 255)).sum()
    if semi and fn not in ('misc.json', 'props.json'):
        fail('%s has %d semi-transparent pixels' % (fn, semi))
    print('%-20s %4dx%-4d %3d rects, %d semi-alpha px' % (fn, W, H, len(rects), semi))
pf = json.load(open(os.path.join(DST, 'party_field.json')))
npcs = json.load(open(os.path.join(DST, 'npcs.json')))
eb = json.load(open(os.path.join(DST, 'enemies_battle.json')))
bb = json.load(open(os.path.join(DST, 'bosses_battle.json')))
ef = json.load(open(os.path.join(DST, 'enemies_field.json')))
po = json.load(open(os.path.join(DST, 'portraits.json')))
for c in ('hero', 'mira', 'bram'):
    for d in ('down', 'left', 'right', 'up'):
        for i in ('0', '1', '2', 'blink'):
            if f'{c}_{d}_{i}' not in pf['frames']:
                fail('party_field missing %s_%s_%s' % (c, d, i))
for n in ('npc_elder npc_tess npc_baker npc_ferry npc_innkeeper npc_shopkeeper npc_smith npc_child_a npc_child_b '
          'npc_guard npc_old_woman npc_farmer npc_scholar npc_parent npc_bellkeeper animal_cat animal_dog '
          'animal_chicken animal_duck npc_dough').split():
    if n not in npcs['sprites']:
        fail('npcs missing ' + n)
for e in 'ink_slime page_wraith briar_wolf moss_scarab bookmite tome_golem ink_wraith echo_warden lost_page archivore'.split():
    if e not in eb['frames'] and e not in bb['frames']:
        fail('battle sprite missing ' + e)
    if e not in ef['sprites']:
        fail('field sprite missing ' + e)
for p in ('hero', 'mira', 'bram', 'mael'):
    if p not in po['portraits']:
        fail('portrait missing ' + p)
for root, _, files in os.walk(os.path.dirname(os.path.abspath(__file__))):
    if 'out' in root.split(os.sep):
        continue
    for f in files:
        if f.endswith(('.py', '.md', '.json')):
            if '' + chr(0x2014) + '' in open(os.path.join(root, f), encoding='utf-8', errors='ignore').read():
                fail('em dash in ' + f)
for f in os.listdir(DST):
    if f.endswith(('.md', '.json')) and '' + chr(0x2014) + '' in open(os.path.join(DST, f), encoding='utf-8').read():
        fail('em dash in ' + f)
print('ALL OK' if ok else 'PROBLEMS FOUND')
