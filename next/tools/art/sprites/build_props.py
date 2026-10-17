"""All props -> assets/sprites/props.png/.json

Per object: frame [x,y,w,h], anchor [px,py] = bottom-centre of the footprint in image px (relative to the
frame), footprint [wTiles,hTiles], solid, overheadY (rows above this draw over actors; 0 = none),
optional frames (animated / states), passable [[dx,dy]] tiles inside the footprint that are walkable.
"""
import os, sys, math
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'chars'))
from pix import *
import pal as P
import build_props_painted as BP
import smallprops as SP
from procedural import thirteenth_bell

# id: footprint, solid, overhead ('tree' => anchorY-32), extras
META = {
    'tree_willow':    dict(fp=[2, 1], solid=True, overhead='tree'),
    'tree_pine':      dict(fp=[1, 1], solid=True, overhead='tree'),
    'tree_pine_snow': dict(fp=[1, 1], solid=True, overhead='tree'),
    'tree_violet':    dict(fp=[2, 1], solid=True, overhead='tree'),
    'fountain':       dict(fp=[4, 2], solid=True),
    'arch_ruin':      dict(fp=[3, 1], solid=True, overhead='tree', passable=[[1, 0]]),
    'rune_shrine':    dict(fp=[3, 2], solid=True),
    'lamp_post':      dict(fp=[1, 1], solid=True, overhead='tree', frames=['lamp_post', 'lamp_post_lit']),
    'bench':          dict(fp=[2, 1], solid=True),
    'anvil':          dict(fp=[2, 1], solid=True),
    'hedge_flowers':  dict(fp=[3, 1], solid=True),
    'bush':           dict(fp=[1, 1], solid=True),
    'bookshelf':      dict(fp=[2, 1], solid=True),
    'desk':           dict(fp=[2, 1], solid=True),
    'bed':            dict(fp=[2, 2], solid=True),
    'fireplace':      dict(fp=[3, 1], solid=True),
    'printing_press': dict(fp=[2, 1], solid=True),
    'lectern':        dict(fp=[2, 1], solid=True),
    'crates_barrels': dict(fp=[3, 1], solid=True),
    'rug':            dict(fp=[3, 2], solid=False),
    'barrel':         dict(fp=[1, 1], solid=True),
    'crate':          dict(fp=[1, 1], solid=True),
    'pot':            dict(fp=[1, 1], solid=True, breakable='pot_broken'),
    'pot_broken':     dict(fp=[1, 1], solid=False),
    'signboard':      dict(fp=[1, 1], solid=True),
    'prop_milestone': dict(fp=[1, 1], solid=True, overhead='tree'),
    'prop_thirteenth_bell': dict(fp=[3, 2], solid=True),
    'prop_letter':    dict(fp=[1, 1], solid=False, frames=['prop_letter_0', 'prop_letter_1']),
    'prop_ferry_bell': dict(fp=[1, 1], solid=False),
}
for _tier in ('wood', 'iron', 'gold'):
    META['chest_' + _tier] = dict(fp=[1, 1], solid=True, frames=['chest_%s_closed' % _tier, 'chest_%s_open' % _tier])


def grid(txt, legend, who):
    return parse_grid(grid_from_text(txt), P.resolve(legend, who))


def lamp_lit(img):
    """brighten the lantern glass (warm, saturated, mid-bright pixels) for the lit frame"""
    out = img.copy()
    m = img[..., 3] > 0.5
    lab = to_oklab(img[..., :3].reshape(-1, 3)).reshape(img.shape[:2] + (3,))
    L = lab[..., 0]; C = np.hypot(lab[..., 1], lab[..., 2]); h = np.degrees(np.arctan2(lab[..., 2], lab[..., 1])) % 360
    glass = m & (h > 50) & (h < 100) & (C > 0.07) & (L > 0.55)
    hot = np.array(hex2rgb(P.color('fire:5')), np.float32) / 255
    warm = np.array(hex2rgb(P.color('fire:4')), np.float32) / 255
    out[glass, :3] = np.where((L[glass] > 0.72)[:, None], hot, warm)
    return out


def glow(r=14):
    """soft glow disc (dithered levels) for lit lamps/candles; draw with additive blending"""
    w = r * 2
    a = blank(w, w)
    col = np.array(hex2rgb(P.color('fire:4')), np.float32) / 255
    for y in range(w):
        for x in range(w):
            d = math.hypot(x + 0.5 - r, y + 0.5 - r) / r
            if d < 1:
                al = 0.38 if d < 0.45 else (0.22 if d < 0.75 else (0.12 if (x + y) % 2 == 0 else 0))
                if al:
                    a[y, x, :3] = col; a[y, x, 3] = al
    return a


def collect():
    imgs = {}
    for pid in BP.PAINTED:
        imgs[pid] = BP.painted(pid)
    imgs['lamp_post_lit'] = lamp_lit(imgs['lamp_post'])
    for tier, leg in SP.CHEST_TIERS.items():
        imgs['chest_%s_closed' % tier] = grid(SP.CHEST_CLOSED, leg, 'chest')
        imgs['chest_%s_open' % tier] = grid(SP.CHEST_OPEN, leg, 'chest')
    for nm, txt in [('barrel', SP.BARREL), ('crate', SP.CRATE), ('pot', SP.POT), ('pot_broken', SP.POT_BROKEN),
                    ('signboard', SP.SIGNBOARD), ('bush', SP.BUSH), ('prop_letter_0', SP.LETTER_0),
                    ('prop_letter_1', SP.LETTER_1), ('prop_ferry_bell', SP.FERRY_BELL),
                    ('prop_milestone', SP.MILESTONE)]:
        imgs[nm] = grid(txt, SP.PROPS_PAL, nm)
    imgs['prop_thirteenth_bell'] = thirteenth_bell()
    imgs['lamp_glow'] = glow(14)
    return imgs


def anchor_of(img):
    al = img[..., 3] > 0.5
    ys = np.nonzero(al.any(1))[0]
    bottom = int(ys.max())
    rows = al[max(0, bottom - 3):bottom + 1]
    xs = np.nonzero(rows.any(0))[0]
    return [int(round((xs.min() + xs.max() + 1) / 2)), bottom]


def build():
    imgs = collect()
    sh = Shelf(512, pad=2)
    order = sorted(imgs.keys(), key=lambda n: (-imgs[n].shape[0], n))
    for n in order:
        sh.add(n, imgs[n])
    sheet, rects = sh.render()
    save_png(sheet, os.path.join(DST, 'props.png'))
    objects = {}
    for pid, m in META.items():
        frames = m.get('frames', [pid])
        base = imgs[frames[0]]
        anc = anchor_of(base)
        o = {'frame': rects[frames[0]], 'anchor': anc, 'footprint': m['fp'], 'solid': m['solid'],
             'overheadY': max(0, anc[1] - 32) if m.get('overhead') == 'tree' else 0}
        if len(frames) > 1:
            o['frames'] = [rects[f] for f in frames]
            o['frameNames'] = frames
        if 'passable' in m:
            o['passable'] = m['passable']
        if 'breakable' in m:
            o['breaksTo'] = m['breakable']
        objects[pid] = o
    objects['lamp_glow'] = {'frame': rects['lamp_glow'], 'anchor': [14, 14], 'footprint': [0, 0], 'solid': False,
                            'overheadY': 0, 'blend': 'lighter',
                            'note': 'additive glow; centre it on a lit lamp or candle'}
    meta = {'image': 'props.png', 'tile': 16,
            'notes': ('anchor = bottom-centre of the footprint in frame px. To place an object whose footprint '
                      'bottom-centre sits at tile (tx,ty): draw frame at x = tx*16 + footprint[0]*8 - anchor[0] '
                      '(tx = left footprint tile), y = ty*16 + 15 - anchor[1] (ty = bottom footprint row). '
                      'overheadY: frame rows [0, overheadY) draw in the overhead layer above actors (0 = none). '
                      'frames/frameNames: state alternates (closed/open, unlit/lit, glint).'),
            'objects': objects}
    write_json(os.path.join(DST, 'props.json'), meta)
    contact([(n, imgs[n]) for n in imgs], os.path.join(OUT, 'props_4x.png'), scale=4, cols=6, title='props at 4x')
    small = [(n, imgs[n]) for n in imgs if imgs[n].shape[0] <= 32 and imgs[n].shape[1] <= 32]
    contact(small, os.path.join(OUT, 'props_small_6x.png'), scale=6, cols=8, title='small props at 6x')
    return imgs, meta


if __name__ == '__main__':
    imgs, meta = build()
    print(len(meta['objects']), 'objects')
