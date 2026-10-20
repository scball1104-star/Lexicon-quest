"""E2-tiles guard: every id in out/_tiles_before.json is unchanged in assets/tiles/tiles.json (except terrain
'order', which is recomputed from TERRAIN_ORDER and only shifts). Prints new ids per section."""
import json, os, sys
from pxlib import TILES_DIR, OUT_DIR
a = json.load(open(os.path.join(OUT_DIR, '_tiles_before.json')))
b = json.load(open(os.path.join(TILES_DIR, 'tiles.json')))
bad = 0
for sec in ('terrains', 'walls', 'tiles', 'objects', 'overlays'):
    for k, v in a[sec].items():
        w = b[sec].get(k)
        if w is None:
            print('MISSING', sec, k); bad += 1; continue
        v2, w2 = dict(v), dict(w)
        v2.pop('order', None); w2.pop('order', None)
        if v2 != w2:
            print('CHANGED', sec, k); bad += 1
    new = [k for k in b[sec] if k not in a[sec]]
    print('%-9s +%d new' % (sec, len(new)), ' '.join(new) if '-v' in sys.argv else '')
oa = [t for t in a['terrainOrder']]
ob = [t for t in b['terrainOrder'] if t in oa]
print('relative terrain order kept:', oa == ob)
sys.exit(1 if bad or oa != ob else 0)
