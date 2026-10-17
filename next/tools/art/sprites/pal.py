"""Master palette access.

`next/assets/palette.json` (owned by W1-tiles) is read at build time. Sprite legends refer to it as
'ramp:index' (index into the dark->light ramp, negative allowed). A literal '#rrggbb' is a per-sprite
extra colour; every extra used is recorded in EXTRAS so the build can report it.
"""
import json, os
from pix import NEXT, hex2rgb

PALETTE_PATH = os.path.join(NEXT, 'assets', 'palette.json')
_cache = {}
EXTRAS = {}  # hex -> set of sprite names


def master():
    if 'p' not in _cache:
        with open(PALETTE_PATH, encoding='utf-8') as f:
            _cache['p'] = json.load(f)
    return _cache['p']


def ramp(name):
    return master()['ramps'][name]


def color(ref, who='?'):
    """'ramp:i' -> hex; '#hex' -> hex (recorded as extra); None -> None"""
    if ref is None:
        return None
    if ref.startswith('#'):
        EXTRAS.setdefault(ref.lower(), set()).add(who)
        return ref
    name, i = ref.split(':')
    r = ramp(name)
    return r[int(i)]


def resolve(legend, who='?'):
    return {k: color(v, who) for k, v in legend.items()}


def all_colors():
    return list(dict.fromkeys(master()['colors']))


def darkest():
    return master().get('darkest', '#14101e')
