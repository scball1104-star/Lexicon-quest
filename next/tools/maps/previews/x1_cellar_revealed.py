"""Render the Keepers' Cellar with the whole ink route lit (every *_faint overlay read as *_revealed), the way the floor
looks once the Lantern has been raised along it. Writes tools/maps/previews/x1_cellar_revealed.png (+ out/).

    python tools/maps/previews/x1_cellar_revealed.py [scale]
"""
import os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.normpath(os.path.join(HERE, '..')))
import preview as P

_load = P.load_map


def load_revealed(map_id):
    mp = _load(map_id)
    for o in mp.get('overlays', []):
        o['t'] = o['t'].replace('_faint', '_revealed')
    return mp


P.load_map = load_revealed
scale = sys.argv[1] if len(sys.argv) > 1 else '2'
P.main(['preview.py', 'x1_cellar', '--scale=' + scale, '--previews', '--tag=revealed'])
