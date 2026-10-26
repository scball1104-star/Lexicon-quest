"""Quantize and write the five Wider Valley battle stages (X1-tiles): assets/backdrops/x1_battle_<name>.png (indexed, palette only) and the
sidecar .json ({image, w, h, bandY, bandAlpha, fallback, ...}). File names carry the pack prefix; the backdrop ids stay battle_downs etc.

    python x1_build.py            # all five
    python x1_build.py battle_moor
"""
import json, os, sys
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import build as B                         # the shared palette quantizer (build.py is read only here)
import x1_compose as X

DST = B.DST
OUT = B.OUT
W, H = B.W, B.H

# id -> (band alpha, fallback backdrop key named in EXPANSION1_PLAN 7.3, note)
STAGES = {
    'battle_downs': (0.42, 'valley', "Shepherd's Downs: wide sky, three swells of downland, a drystone wall, a hawthorn in may, sheep, the Stones on the far crest (composed)"),
    'battle_moor': (0.44, 'valley', 'the High Moor: overcast sky, a low pale sun, heather and bracken, gorse, granite tors, the black tarn, the broken Watchtower (composed)'),
    'battle_barrow': (0.46, 'archive_deep', "the Wethers' Barrow: a turf-capped stone vault, five burial niches with two candles lit, cold flags, mist (composed)"),
    'battle_larchhill': (0.42, 'valley', 'Larchhill: warm afternoon, honey drystone terraces, orchard rows, white hives, the Windmill, the aqueduct (composed)'),
    'battle_culvert': (0.46, 'archive_deep', 'the Weir Culvert: a wet brick vault with iron ribs, a drain mouth and a trickle, standing water, a light shaft (composed)'),
}


def build_one(bid, pal):
    alpha, fallback, note = STAGES[bid]
    a = X.COMPOSE[bid]()
    idx = B.quantize_ordered(a, pal, 0.16)
    out = (pal[idx] * 255 + 0.5).astype(np.uint8)
    fname = 'x1_' + bid
    cols = np.unique(out.reshape(-1, 3), axis=0)
    lut = {tuple(c): i for i, c in enumerate(cols)}
    idxim = np.array([lut[tuple(p)] for p in out.reshape(-1, 3)], np.uint8).reshape(H, W)
    pim = Image.fromarray(idxim, 'P')
    pim.putpalette(cols.astype(np.uint8).flatten().tolist())
    os.makedirs(DST, exist_ok=True)
    pim.save(os.path.join(DST, fname + '.png'), optimize=True)
    meta = {'image': fname + '.png', 'w': W, 'h': H, 'cell': None, 'note': note, 'extraColors': [], 'colors': int(len(cols)),
            'composed': 'tools/art/backdrops/x1_compose.py (%s)' % bid, 'bandY': 118, 'bandAlpha': alpha,
            'bandNote': 'not baked: the battle scene fills rows bandY..216 with indigo #14101e at bandAlpha under the sprites',
            'backdropId': bid, 'fallback': fallback}
    with open(os.path.join(DST, fname + '.json'), 'w', encoding='utf-8', newline='\n') as f:
        json.dump(meta, f, indent=1)
        f.write('\n')
    os.makedirs(OUT, exist_ok=True)
    Image.fromarray(out, 'RGB').resize((W * 3, H * 3), Image.NEAREST).save(os.path.join(OUT, fname + '_3x.png'))
    print('%-18s %3d colours  %5d bytes' % (bid, len(cols), os.path.getsize(os.path.join(DST, fname + '.png'))))


def main(argv):
    pal = B.load_palette()
    for bid in (argv[1:] or list(STAGES)):
        build_one(bid, pal)


if __name__ == '__main__':
    main(sys.argv)
