"""UI colors, read at build time from the master palette next/assets/palette.json (owned by W1-tiles).

Every UI ramp below is a list of hex colors, dark -> light, taken from the named palette ramps so UI and world
art share one palette. If palette.json is missing (fresh checkout mid-build), a frozen copy of the ramps the UI
uses is used instead and a warning is printed.

The only colors that are NOT palette entries:
  * font glyphs are pure white #ffffff (contract: white glyphs, tinted by code),
  * the five Diablo rarity colors fixed by DESIGN.md 6.4.
"""
from __future__ import annotations

import json
import sys

from lib import NEXT

_FALLBACK = {
    'shadow': ['#14101e', '#251d34', '#2e2b4c', '#4c445c'],
    'ink': ['#14101e', '#1a1334', '#292657', '#3f4186', '#7162bd'],
    'stone_cool': ['#251d34', '#2e2b4c', '#4c445c', '#66637f', '#8e8997', '#b3b6c4'],
    'metal': ['#2e2b4c', '#66637f', '#b3b6c4', '#e2e0de', '#f6f4ee'],
    'stone_warm': ['#2e2b4c', '#584951', '#7e6d6e', '#a18f85', '#cfb89c', '#ebdfc8'],
    'wood': ['#2d1b1f', '#482826', '#6e3d2c', '#8f5533', '#b87942', '#d69c57'],
    'path': ['#6a4532', '#896042', '#ae8458', '#c3a57c', '#e4cb96'],
    'sand': ['#ae8458', '#c3a57c', '#e4cb96', '#f6e4b9'],
    'grass': ['#1c3730', '#2a532f', '#427330', '#5a9032', '#84ad39', '#b6cc58'],
    'roof_green': ['#1b2332', '#1c3730', '#285743', '#397951', '#4f9e6e'],
    'water': ['#0e153b', '#1d3775', '#24559b', '#3e88ca', '#6ab3e4', '#b4e4f2'],
    'ice': ['#3e88ca', '#6ab3e4', '#b4e4f2', '#e8fffb'],
    'ui_blue': ['#0e153b', '#1d2a67', '#2c4797', '#4064b9', '#6891d9', '#e2e0de'],
    'magic_cyan': ['#1d3775', '#317aa1', '#2ec4d0', '#8af0e8', '#e8fffb'],
    'roof_purple': ['#1a1334', '#36195a', '#522a84', '#7040aa', '#9062c3'],
    'cloth_purple': ['#1a1334', '#36195a', '#522a84', '#7040aa', '#9062c3', '#bc94e2'],
    'magic_violet': ['#522a84', '#7040aa', '#9062c3', '#bc94e2', '#f6f4ee'],
    'roof_red': ['#2d1b1f', '#571f28', '#87332e', '#b34532', '#e06b39', '#eba14d'],
    'fire': ['#571f28', '#b34532', '#e06b39', '#eba14d', '#f9d77a', '#fff7d6'],
    'gold': ['#482826', '#8f5533', '#c38334', '#eba14d', '#f9d77a', '#fff7d6'],
    'blossom': ['#571f28', '#a83a6e', '#e070a0', '#fcc4dc'],
    'skin_light': ['#a66142', '#cc875b', '#e8b585', '#fae2cb'],
    'skin_med': ['#6e3d2c', '#a66142', '#cc875b', '#e8b585'],
}


def _load():
    p = NEXT / 'assets' / 'palette.json'
    try:
        js = json.loads(p.read_text(encoding='utf-8'))
        ramps = dict(_FALLBACK)
        ramps.update(js['ramps'])
        return ramps, set(c.lower() for c in js['colors']), True
    except Exception as e:  # noqa: BLE001
        print(f'[uipal] WARNING: {p} not readable ({e}); using frozen ramps', file=sys.stderr)
        cols = set(c for r in _FALLBACK.values() for c in r)
        return dict(_FALLBACK), cols, False


RAMPS, PALETTE, FROM_FILE = _load()
R = RAMPS


def ramp(name):
    return list(RAMPS[name])


# ---------------------------------------------------------------- UI ramps (dark -> light), all palette colors
INK = [R['ink'][0], R['ink'][1], R['shadow'][1], R['ink'][2], R['shadow'][3], R['stone_cool'][3]]
METAL = R['metal']                       # 2e2b4c 66637f b3b6c4 e2e0de f6f4ee
STEEL = [R['stone_cool'][0], R['stone_cool'][2], R['stone_cool'][3], R['stone_cool'][4], R['stone_cool'][5],
         R['metal'][3], R['metal'][4]]
GOLD = R['gold']                         # 482826 8f5533 c38334 eba14d f9d77a fff7d6
FIRE = R['fire']                         # 571f28 b34532 e06b39 eba14d f9d77a fff7d6
RED = R['roof_red']                      # 2d1b1f 571f28 87332e b34532 e06b39 eba14d
GREEN = R['grass']                       # 1c3730 2a532f 427330 5a9032 84ad39 b6cc58
EMERALD = R['roof_green']                # 1b2332 1c3730 285743 397951 4f9e6e
WATER = R['water']                       # 0e153b 1d3775 24559b 3e88ca 6ab3e4 b4e4f2
ICE = R['ice']
UIB = R['ui_blue']                       # 0e153b 1d2a67 2c4797 4064b9 6891d9 e2e0de
CYAN = R['magic_cyan']                   # 1d3775 317aa1 2ec4d0 8af0e8 e8fffb
VIOLET = R['magic_violet']               # 522a84 7040aa 9062c3 bc94e2 f6f4ee
PURPLE = R['cloth_purple']               # 1a1334 36195a 522a84 7040aa 9062c3 bc94e2
WOOD = R['wood']
PAPER = [R['path'][0], R['path'][2], R['sand'][1], R['sand'][2], R['sand'][3]]
STONEW = R['stone_warm']
PINK = R['blossom']
SKIN = R['skin_light']
WHITE = R['metal'][4]                    # f6f4ee, the palette's white
OUTLINE = R['ink'][0]                    # 14101e

# window frame: warm-silver bevel from the metal ramp, ink outline
SILVER = {
    'hi': METAL[4],      # top/left outer bevel  f6f4ee
    'lt': METAL[3],      # top/left inner bevel  e2e0de
    'md': METAL[2],      # bottom/right inner    b3b6c4
    'dk': STEEL[3],      # bottom/right outer    8e8997
    'lo': METAL[1],      # deep shade            66637f
}

# window fill schemes: vertical gradient top -> mid -> bottom (drawn by code)
SCHEMES = {
    'blue':    {'top': UIB[3], 'mid': UIB[2], 'bottom': UIB[0], 'highlight': UIB[4], 'accent': GOLD[4]},
    'crimson': {'top': RED[3], 'mid': RED[2], 'bottom': RED[0], 'highlight': RED[5], 'accent': GOLD[4]},
    'forest':  {'top': EMERALD[3], 'mid': EMERALD[2], 'bottom': EMERALD[0], 'highlight': EMERALD[4],
                'accent': GOLD[4]},
    'violet':  {'top': PURPLE[3], 'mid': PURPLE[2], 'bottom': PURPLE[0], 'highlight': PURPLE[5], 'accent': GOLD[4]},
    'slate':   {'top': STEEL[2], 'mid': STEEL[1], 'bottom': STEEL[0], 'highlight': STEEL[4], 'accent': GOLD[4]},
    'ember':   {'top': WOOD[3], 'mid': WOOD[2], 'bottom': WOOD[0], 'highlight': WOOD[5], 'accent': GOLD[5]},
}

# named text colors for {c:name} codes (proposed table for core/font.js)
TEXT = {
    'white': WHITE,
    'gray': METAL[2],
    'dim': STEEL[3],
    'gold': GOLD[4],
    'cream': GOLD[5],
    'cyan': CYAN[3],
    'blue': WATER[4],
    'green': GREEN[5],
    'red': RED[4],
    'orange': FIRE[3],
    'violet': VIOLET[3],
    'pink': PINK[3],
    'shadow': OUTLINE,
}

# DESIGN.md 6.4 (fixed, not palette)
RARITY = {
    'common': '#e8e8e8',
    'magic': '#6f8cff',
    'rare': '#ffd34d',
    'legendary': '#ff8a2a',
    'set': '#3cdc6a',
}


def off_palette(arr, ignore=()):
    """Return the set of opaque colors in arr that are not palette entries (for verification)."""
    import numpy as np
    m = arr[..., 3] == 255
    cols = {'#%02x%02x%02x' % tuple(int(v) for v in px) for px in arr[m][:, :3]}
    ok = PALETTE | {c.lower() for c in ignore} | {'#ffffff'}
    return sorted(c for c in cols if c not in ok)
