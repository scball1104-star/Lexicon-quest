"""The world map painting and the map stone (issue #97, docs/WORLD_MAP_PLAN.md waves 2 and 10).

    python next/tools/art/worldmap/build_worldmap.py            build everything below
    python next/tools/art/worldmap/build_worldmap.py --preview  also write tools/art/worldmap/out/preview_*.png (x3)

Writes (all pack files of the lazy `worldmap` pack; deterministic, no global RNG, so a rebuild is byte-identical):
  assets/ui/worldmap_map.png        424 x 664: three stacked 424 x 216 layers of the same world, and a sprite strip:
                                      y 0    the painting in full colour (a region the party has visited)
                                      y 216  the brown-ink sketch on paper (a region the party has heard of)
                                      y 432  blank paper (a region nobody has named yet)
                                      y 648  16 px strip: the Saffron Wind, the Kestrel (drawn by the scene when the story
                                             has them at sea or in the air)
  assets/tiles/worldmap.png         the map stone (waystone) object sheet: 2 frames of 16 x 32 (dim, lit)
  assets/tiles/worldmap_tiles.json  its tile fragment (objects.worldmap_stone), merged into the live tile db by ensurePack
  src/data/worldmap/layout.js       GENERATED: the 53 x 27 region grid (8 px cells) and each place's pixel point, which the
                                    map scene reads (the one source for where things are is this file's G and PLACES)

How it is made: the terrain is the game's own autotiles at 16 px (tools/art/tiles/compose.py with the ep4, ep5, ep6 and x1
fragments), box-averaged to half size and snapped to the palette, as the approved mock-up still 1 was. Every glyph
(mountain, pine, town, cave, tower, keep, stacks, archive, foundry, labyrinth, skyport) is then drawn at the final 1:1
pixel density in the house style: a 1 px darkest outline, light from the upper left, three tones per ramp. The ink layer
draws the same glyphs and the coastline in brown ink on parchment, so a rumoured region shows its shape and nothing else.

The layout is the mock-up's (WORLD_MAP_PLAN 8 item 12, approved 2026-11-11), five ocean columns wider on the east so the
scene can keep the town list off the coast.
"""
import json, os, sys
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
NEXT = os.path.normpath(os.path.join(HERE, '..', '..', '..'))
sys.path.insert(0, os.path.join(NEXT, 'tools', 'art', 'tiles'))
import compose  # noqa: E402
from pxlib import Canvas, C, hexc, snap_to_palette, h32  # noqa: E402

TILES = os.path.join(NEXT, 'assets', 'tiles')
OUT = os.path.join(HERE, 'out')
COLS, ROWS = 53, 27            # 16 px cells of the source; 8 px cells on screen
W, H = COLS * 8, ROWS * 8      # 424 x 216
STRIP_Y, STRIP_H = 3 * H, 16

# ------------------------------------------------------------------------------------------------- the world
# One char per 16 px cell (8 px on screen). Geography follows the story docs' directions (EPISODE1..6): the Archive
# north of the valley; Hollowmere east of the river beside its mere; Emberpeak north-east in the ash hills; Valewyn
# downriver on the coast; Saffron Haven south across the sea; the Skybound Isles north-west of Saffron, out on the
# water; the white North beyond the mountains. The Wider Valley (X1) is the heath and downs west of Willowmere.
G = [
    "SSSSSSSSSSSSSSSSSSSSSSSS~~~~~~~~~~~~~~~~~~~~~~~~~~~~~",
    "SSSSSSSSSSSSSSSSSSSSSSS~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~",
    "SSSSSSSSSSSSSSSSSSSSSS~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~",
    "SSSSSSSSSSSSSSSSSSSSS~~~~~~~aaaaa~~~~~~~~~~~~~~~~~~~~",
    "....................~~~~~aaaaaaaaaa~~~~~~~~~~~~~~~~~~",
    "hhhh.......,........~~~~aaaaaaaaaaaa~~~~~~~~~~~~~~~~~",
    "hhhh.......,........w...aaaaaaaaaaaa~~~~~~~~~~~~~~~~~",
    "hhh........,.......w...aaaaaaaaaaaaaa~~~~~~~~~~~~~~~~",
    "hh.........,......w...aaaaaaaaaaaaaaa~~~~~~~~~~~~~~~~",
    "...........,......w..sssssaaaaaaaaaaff~~~~~~~~~~~~~~~",
    "....,,,,,,,,,,....w..,,,,,,,,,aaaafff~~~~~~~~~~~~~~~~",
    "........,,....,,,,,,,,......sss..fffff~~~~~~~~~~~~~~~",
    "........,.........w.........ss..ffffff~~~~~~~~~~~~~~~",
    "........,.........w...mmmm.....fffftff~~~~~~~~~~~~~~~",
    "........,........w...mmmmmm...fffftttf~~~~~~~~~~~~~~~",
    "........,.......w....mmmmmm...ffftttt~~~~~~~~~~~~~~~~",
    ".........,......w.....mmmm....fftttt~~~~~~~~~~~~~~~~~",
    "~..............w..............ffttt~~~~~~~~~~~~~~~~~~",
    "~~~...........~~~~...........~~~~~~~~~~~~~~~~~~~~~~~~",
    "~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~",
    "~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~",
    "~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~",
    "~~~~~~~~~~~~~~~~~~~~~~~~~ssssssss~~~~~~~~~~~~~~~~~~~~",
    "~~~~~~~~~~~~~~~~~~~~~~~ssDDDDDDDDss~~~~~~~~~~~~~~~~~~",
    "~~~~~~~~~~~~~~~~~~~~~~sDDDDDDDDDDDDs~~~~~~~~~~~~~~~~~",
    "~~~~~~~~~~~~~~~~~~~~~sDDDDDDDDDDDDDDs~~~~~~~~~~~~~~~~",
    "~~~~~~~~~~~~~~~~~~~~sDDDDDDDDDDDDDDDDs~~~~~~~~~~~~~~~",
]
LEGEND = {'.': 'grass', ',': 'dirt', '~': 'water', 'w': 'water', 'm': 'mere_water', 's': 'sand', 'D': 'dune_sand',
          'a': 'ash_ground', 'f': 'flood_grass', 't': 'tide_water', 'S': 'sand', 'h': 'x1_moor_turf'}
WATER = set('~wmt')
assert len(G) == ROWS and all(len(r) == COLS for r in G), [len(r) for r in G]

# Regions (WORLD_MAP_PLAN 1: each episode opens one region of the same map). One letter per cell:
#   V Willowmere's valley (Ep 1)   W the Wider Valley (X1)   H the Hollow and its mere (Ep 2)   E the ash hills (Ep 3)
#   F the Flood Country (Ep 4)     S the south, Saffron Haven (Ep 5)   I the Skybound Isles (Ep 6)   N the white North (Ep 7)
REGION_IDS = 'VWHEFSIN'


def region_grid():
    g = [[None] * COLS for _ in range(ROWS)]
    river = {}
    for y, row in enumerate(G):
        xs = [x for x, ch in enumerate(row) if ch == 'w']
        if xs:
            river[y] = max(xs)
    for y, row in enumerate(G):
        for x, ch in enumerate(row):
            r = None
            if y <= 3 and ch == 'S':
                r = 'N'
            elif 12 <= x <= 19 and 19 <= y <= 23:
                r = 'I'                                   # the basalt stacks of the Isles stand in open water
            elif ch in 'af' or (ch == 's' and y <= 12) or (ch == 't'):
                r = 'E' if ch in 'as' else 'F'
            elif ch in 'sD' and y >= 19:
                r = 'S'
            elif ch not in WATER or ch in 'wm':
                if 4 <= y <= 18 and x <= 4:
                    r = 'W'
                elif 4 <= y <= 18 and x <= river.get(y, 18):
                    r = 'V'
                elif 4 <= y <= 18:
                    r = 'H'
            g[y][x] = r
    # mountains and the coast: the ash ring's flanks belong to the hills; Valewyn's coast past the ring is the Flood Country
    for y in range(4, 9):
        for x in range(21, 25):
            if g[y][x] == 'H' and G[y][x] == '.':
                g[y][x] = 'E'
    # open water takes the region of the nearest land (multi-source BFS, 4-neighbour, deterministic order)
    from collections import deque
    q = deque((x, y) for y in range(ROWS) for x in range(COLS) if g[y][x])
    while q:
        x, y = q.popleft()
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if 0 <= nx < COLS and 0 <= ny < ROWS and g[ny][nx] is None:
                g[ny][nx] = g[y][x]
                q.append((nx, ny))
    return [''.join(r) for r in g]


# Named places: id -> (cell x, cell y, glyph). The scene keys its names, flags and labels by these ids (src/data/worldmap/
# data.js); the label anchor is the glyph's centre, (cell x * 8 + 4, cell y * 8 + 4).
PLACES = {
    'willowmere': (8, 12, 'town_red'),
    'archive': (11, 6, 'archive'),
    'thornfold': (2, 10, 'hamlet'),
    'hollowmere': (20, 10, 'town_purple'),
    'court': (24, 14, 'tower_purple'),
    'emberpeak': (28, 8, 'town_ember'),
    'foundry': (31, 6, 'foundry'),
    'valewyn': (33, 11, 'town_blue'),
    'keep': (34, 15, 'keep'),
    'saffron': (28, 22, 'town_saffron'),
    'labyrinth': (32, 24, 'labyrinth'),
    'zephyr': (17, 21, 'skyport'),
    'north': (10, 1, None),
    'palehaven': (13, 3, None),     # Episode 7's town: a point in the snow below the peaks, no glyph of its own yet
}
# Points the party can stand between places (roads, the deck of a ship): id -> cell. No glyph.
POINTS = {'valley': (10, 9), 'east_road': (16, 11), 'sand_road': (24, 10), 'flood_road': (31, 10), 'sea_lane': (31, 19),
          'caravan_road': (29, 21), 'airstair': (17, 22)}

# ------------------------------------------------------------------------------------------------- painting helpers
OUTL = C('shadow', 0)                    # the house outline (darkest)
P0, P1 = C('stone_warm', 5), C('stone_warm', 4)       # parchment and its fleck
INK, INK2 = C('earth', 2), C('earth', 3)              # brown ink and its light hatch


class Pen:
    """Draw a glyph in colour or in ink. Roles: o outline, l light, m mid, d dark, a accent (lamp, ember, rune)."""

    def __init__(self, cv, style):
        self.cv, self.style = cv, style

    def px(self, x, y, role, col=None):
        if self.style == 'color':
            self.cv.set(x, y, OUTL if role == 'o' else col)
        elif role == 'o':
            self.cv.set(x, y, INK)
        elif role == 'd' and (x + y) % 2 == 0:
            self.cv.set(x, y, INK2)

    def row(self, x0, x1, y, role, col=None):
        for x in range(x0, x1 + 1):
            self.px(x, y, role, col)


def mountain(p, cx, by, w=9, h=7, ramp='stone_warm', snow=False, glow=False):
    """A 1:1 mountain: base centred on cx, standing on row by (its outline row). Light from the upper left."""
    for r in range(h):
        y = by - h + r
        hw = max(1, int(round((r + 1) * (w / 2) / h)))
        ridge = cx - (r // 3)                                  # the ridge drifts left as it falls: a lit west face
        for x in range(cx - hw, cx + hw):
            if x < ridge - 1:
                role, col = 'l', C(ramp, 4 if x == ridge - 2 and r > 1 else 3)
            elif x < ridge:
                role, col = 'm', C(ramp, 3)
            else:
                role, col = 'd', C(ramp, 2 if x < ridge + 2 else 1)
            if snow and r < max(2, int(h * 0.4)):
                col = C('ice', 3 if role == 'l' else 2)
                role = 'l' if role != 'd' else 'm'
            if glow and r < 2:
                col, role = C('fire', 4 - r), 'a'
            p.px(x, y, role, col)
        p.px(cx - hw - 1, y, 'o')
        p.px(cx + hw, y, 'o')
    p.px(cx - 1, by - h - 1, 'o')
    p.px(cx, by - h - 1, 'o')
    p.row(cx - (w // 2) - 1, cx + (w // 2), by, 'o')


def pine(p, x, y, ramp='foliage_dark', snow=False):
    """A 5 x 7 conifer, trunk foot at (x, y)."""
    widths = [1, 3, 3, 5, 5]
    for i, wd in enumerate(widths):
        yy = y - 7 + i
        for k in range(wd):
            xx = x - wd // 2 + k
            left = k < wd // 2
            col = C(ramp, 3 if left else 2) if i % 2 == 0 else C(ramp, 2 if left else 1)
            if snow and i in (0, 1):
                col = C('ice', 3)
            p.px(xx, yy, 'l' if left else 'd', col)
        p.px(x - wd // 2 - 1, yy, 'o')
        p.px(x + wd // 2 + 1, yy, 'o')
    p.px(x, y - 8, 'o')
    p.row(x - 2, x + 2, y - 2, 'o')
    p.px(x, y - 1, 'd', C('wood', 1))
    p.px(x - 1, y - 1, 'o')
    p.px(x + 1, y - 1, 'o')


def forest(p, cx, cy, snow=False):
    """Three pines in one 8 px cell (and spilling a little over it)."""
    bx, by = cx * 8, cy * 8
    for dx, dy in ((2, 5), (6, 6), (4, 9)):
        pine(p, bx + dx, by + dy, snow=snow)


def house(p, x, y, roof, wall='stone_warm'):
    """A 7 x 7 house standing on row y, left edge x: a pitched roof over a whitewashed wall and a door."""
    for i in range(4):                                         # roof rows, apex at y - 6
        yy = y - 6 + i
        x0, x1 = x + 3 - i, x + 3 + i
        for xx in range(x0, x1 + 1):
            left = xx < x + 3
            p.px(xx, yy, 'l' if left else 'd', C(roof, 4 if (left and i < 2) else 3 if left else 2))
        p.px(x0 - 1, yy, 'o')
        p.px(x1 + 1, yy, 'o')
    p.px(x + 3, y - 7, 'o')
    for yy in (y - 2, y - 1):
        p.px(x, yy, 'o')
        p.px(x + 6, yy, 'o')
        for xx in range(x + 1, x + 6):
            p.px(xx, yy, 'm' if xx < x + 4 else 'd', C(wall, 5 if xx < x + 4 else 3))
    p.px(x + 3, y - 1, 'o')
    p.px(x + 4, y - 2, 'a', C('gold', 4))                  # a lit window
    p.row(x, x + 6, y, 'o')


def town(p, cx, cy, roof, wall='stone_warm'):
    """A town: three houses inside one cell and a little over it (two behind, one in front)."""
    bx, by = cx * 8, cy * 8
    house(p, bx - 3, by + 4, roof, wall)
    house(p, bx + 4, by + 3, roof, wall)
    house(p, bx + 1, by + 9, roof, wall)


def hamlet(p, cx, cy, roof='roof_green'):
    bx, by = cx * 8, cy * 8
    house(p, bx - 1, by + 5, roof)
    house(p, bx + 5, by + 8, roof)


def cave(p, cx, cy, ramp='stone_warm', glow=False):
    """A hill with a dark mouth (a dungeon you walk into)."""
    bx, by = cx * 8 + 4, cy * 8 + 8
    mountain(p, bx, by, w=11, h=7, ramp=ramp)
    for yy in range(by - 3, by):
        for xx in range(bx - 2, bx + 1):
            p.px(xx, yy, 'a' if glow and yy == by - 1 else 'o', C('fire', 3) if glow and yy == by - 1 else None)
    p.px(bx - 3, by - 2, 'o')
    p.px(bx + 1, by - 2, 'o')


def archive(p, cx, cy):
    """The Rootbound Archive: a stone door under an old tree whose roots hold the hill."""
    bx, by = cx * 8 + 4, cy * 8 + 8
    mountain(p, bx, by, w=11, h=5, ramp='stone_warm')
    for yy in range(by - 3, by):
        for xx in range(bx - 1, bx + 1):
            p.px(xx, yy, 'o')
    p.px(bx - 2, by - 2, 'o')
    p.px(bx + 1, by - 2, 'o')
    for i, wd in enumerate((3, 5, 7, 7, 5)):                  # the crown over the hill
        yy = by - 11 + i
        for k in range(wd):
            xx = bx - wd // 2 + k
            left = k <= wd // 2
            p.px(xx, yy, 'l' if left else 'd', C('grass', 4 if left and i < 2 else 3 if left else 2))
        p.px(bx - wd // 2 - 1, yy, 'o')
        p.px(bx + wd // 2 + 1, yy, 'o')
    p.row(bx - 1, bx + 1, by - 12, 'o')
    p.px(bx, by - 6, 'd', C('wood', 2))
    p.px(bx - 2, by - 5, 'd', C('wood', 1))
    p.px(bx + 2, by - 5, 'd', C('wood', 1))


def tower(p, cx, cy, ramp='stone_cool', cap='roof_blue', base=None):
    x, y = cx * 8 + 2, cy * 8 + 7
    for yy in range(y - 9, y):
        p.px(x - 1, yy, 'o')
        p.px(x + 4, yy, 'o')
        for xx in range(x, x + 4):
            p.px(xx, yy, 'l' if xx < x + 2 else 'd', C(ramp, 4 if xx < x + 2 else 2))
    for i in range(4):                                         # the cap
        yy = y - 13 + i
        for xx in range(x + 1 - i, x + 3 + i):
            p.px(xx, yy, 'l' if xx < x + 2 else 'd', C(cap, 4 if xx < x + 2 else 2))
        p.px(x - i, yy, 'o')
        p.px(x + 3 + i, yy, 'o')
    p.row(x + 1, x + 2, y - 14, 'o')
    p.row(x - 1, x + 4, y - 9, 'o')
    p.px(x + 1, y - 6, 'a', C('gold', 4))
    p.px(x + 1, y - 2, 'o')
    p.px(x + 2, y - 2, 'o')
    p.px(x + 1, y - 1, 'o')
    p.px(x + 2, y - 1, 'o')
    p.row(x - 1, x + 4, y, 'o')
    if base:
        p.row(x - 2, x + 5, y + 1, 'm', C(base, 4))


def keep(p, cx, cy):
    """The Sunken Keep: a drowned tower house, crenels above the water line."""
    x, y = cx * 8, cy * 8 + 6
    for yy in range(y - 6, y):
        p.px(x - 1, yy, 'o')
        p.px(x + 8, yy, 'o')
        for xx in range(x, x + 8):
            p.px(xx, yy, 'l' if xx < x + 4 else 'd', C('stone_cool', 4 if xx < x + 4 else 2))
    for k in (0, 3, 6):
        p.px(x + k, y - 7, 'l', C('stone_cool', 4))
        p.px(x + k + 1, y - 7, 'd', C('stone_cool', 3))
        p.row(x + k, x + k + 1, y - 8, 'o')
    p.px(x + 3, y - 3, 'o')
    p.px(x + 4, y - 3, 'o')
    p.row(x + 3, x + 4, y - 2, 'o')
    p.row(x - 1, x + 8, y, 'm', C('water', 5))
    p.row(x + 1, x + 6, y + 1, 'd', C('water', 4))


def stack(p, x, by, h=8, w=5):
    """A basalt sea stack of the Isles, foot on row by."""
    for yy in range(by - h, by):
        p.px(x - 1, yy, 'o')
        p.px(x + w, yy, 'o')
        for xx in range(x, x + w):
            p.px(xx, yy, 'l' if xx < x + 2 else 'd', C('stone_cool', 3 if xx < x + 2 else 1))
    p.row(x, x + w - 1, by - h - 1, 'o')
    p.row(x, x + w - 1, by - h, 'm', C('grass', 3))                # a cap of turf
    p.row(x - 1, x + w, by, 'm', C('water', 5))


def skyport(p, cx, cy):
    """Zephyr Landing: a white skyport tower on the tallest stack, a gold beacon on top."""
    x, by = cx * 8 + 1, cy * 8 + 8
    stack(p, x, by, h=6, w=6)
    tower(p, cx, cy - 1, ramp='stone_cool', cap='roof_blue')
    p.px(cx * 8 + 3, cy * 8 - 15, 'a', C('gold', 5))


def labyrinth(p, cx, cy):
    """The Oracle Labyrinth: a stepped sand temple with a dark door."""
    bx, by = cx * 8 + 4, cy * 8 + 8
    tiers = [(5, by - 6), (9, by - 4), (13, by - 2)]           # (width, top row): three steps of two rows
    for wd, top in tiers:                                      # outlines first: the step above covers what it hides
        p.row(bx - wd // 2 - 1, bx + wd // 2 + 1, top - 1, 'o')
    for wd, top in tiers:
        for yy in (top, top + 1):
            for xx in range(bx - wd // 2, bx + wd // 2 + 1):
                left = xx < bx
                p.px(xx, yy, 'l' if left else 'd', C('sand', 3 if left else 1) if yy == top else C('sand', 2 if left else 0))
            p.px(bx - wd // 2 - 1, yy, 'o')
            p.px(bx + wd // 2 + 1, yy, 'o')
    p.row(bx - 1, bx + 1, by - 3, 'o')
    p.row(bx - 1, bx + 1, by - 2, 'o')
    p.row(bx - 1, bx + 1, by - 1, 'o')
    p.row(bx - 7, bx + 7, by, 'o')


def foundry(p, cx, cy):
    """The Ashen Foundry: a forge hall with a chimney, embers at its mouth."""
    x, y = cx * 8 - 1, cy * 8 + 8
    for yy in range(y - 5, y):
        p.px(x - 1, yy, 'o')
        p.px(x + 9, yy, 'o')
        for xx in range(x, x + 9):
            p.px(xx, yy, 'l' if xx < x + 4 else 'd', C('stone_warm', 3 if xx < x + 4 else 1))
    p.row(x - 1, x + 9, y - 6, 'o')
    for yy in range(y - 11, y - 5):                            # the chimney
        p.px(x + 5, yy, 'o')
        p.px(x + 8, yy, 'o')
        p.px(x + 6, yy, 'l', C('stone_warm', 2))
        p.px(x + 7, yy, 'd', C('stone_warm', 1))
    p.row(x + 5, x + 8, y - 12, 'o')
    p.px(x + 6, y - 13, 'a', C('fire', 3))
    p.px(x + 7, y - 14, 'a', C('fire', 2))
    p.row(x + 2, x + 4, y - 3, 'o')
    p.row(x + 2, x + 4, y - 2, 'a', C('fire', 3))
    p.row(x + 2, x + 4, y - 1, 'a', C('fire', 4))
    p.row(x - 1, x + 9, y, 'o')


def draw_place(p, kind, cx, cy):
    {
        'town_red': lambda: town(p, cx, cy, 'roof_red'),
        'town_ember': lambda: town(p, cx, cy, 'roof_red', 'stone_cool'),
        'town_purple': lambda: town(p, cx, cy, 'roof_purple'),
        'town_blue': lambda: town(p, cx, cy, 'roof_blue'),
        'town_saffron': lambda: town(p, cx, cy, 'gold', 'sand'),
        'hamlet': lambda: hamlet(p, cx, cy),
        'archive': lambda: archive(p, cx, cy),
        'foundry': lambda: foundry(p, cx, cy),
        'labyrinth': lambda: labyrinth(p, cx, cy),
        'tower_purple': lambda: tower(p, cx, cy, 'stone_cool', 'roof_purple', base='stone_cool'),
        'keep': lambda: keep(p, cx, cy),
        'skyport': lambda: skyport(p, cx, cy),
    }[kind]()


def draw_glyphs(cv, style):
    """Every mountain, forest and place glyph, in reading order (north to south, so a southern glyph overlaps)."""
    p = Pen(cv, style)
    # the snow peaks of the North, and the spine between it and the valley
    for (x, y) in ((3, 0), (8, 1), (14, 0), (18, 1)):
        mountain(p, x * 8 + 4, y * 8 + 7, w=9, h=7, ramp='stone_cool', snow=True)
    for (x, y) in ((6, 2), (12, 2), (16, 2), (2, 2)):
        forest(p, x, y, snow=True)
    for x in range(0, 21):
        mountain(p, x * 8 + 3 + (x % 2), 35 + (x % 3), w=9, h=7, ramp='stone_cool', snow=True)
    # the ash hills' ring around Emberpeak, and the peak itself, glowing
    for (x, y) in ((25, 4), (27, 3), (31, 3), (33, 4), (24, 5), (35, 5), (36, 7), (24, 8), (35, 8)):
        mountain(p, x * 8 + 4, y * 8 + 7, w=9, h=8, ramp='stone_warm')
    mountain(p, 29 * 8 + 3, 5 * 8 + 6, w=11, h=9, ramp='roof_red', glow=True)
    # Whisperwood and the valley's edges; the Wider Valley's copses
    for (x, y) in ((3, 6), (4, 6), (3, 7), (14, 6), (15, 7), (2, 12), (3, 13), (2, 14), (12, 15), (13, 16), (25, 12),
                   (26, 13), (6, 17), (5, 16)):
        forest(p, x, y)
    # the Isles' sea stacks
    for (x, y, h) in ((14, 20, 8), (18, 20, 7), (15, 22, 6), (19, 23, 5)):
        stack(p, x * 8 + 1, y * 8 + 7, h=h)
    for pid, (x, y, kind) in sorted(PLACES.items(), key=lambda kv: (kv[1][1], kv[1][0])):
        if kind:
            draw_place(p, kind, x, y)


# ------------------------------------------------------------------------------------------------- layers
def tiledb():
    db = compose.TileDB()
    for f in ('ep4', 'ep5', 'ep6', 'x1'):
        with open(os.path.join(TILES, f + '_tiles.json')) as fh:
            frag = json.load(fh)
        for k in ('terrains', 'walls', 'tiles', 'objects'):
            db.db.setdefault(k, {}).update(frag.get(k, {}))
    order = ['water', 'tide_water', 'mere_water', 'sand', 'dune_sand', 'ash_ground', 'x1_moor_turf', 'dirt', 'grass',
             'flood_grass']
    for i, t in enumerate(order):
        db.db['terrains'][t]['order'] = 100 + i
    return db


def half(a):
    """848 x 432 -> 424 x 216: box-average each 2 x 2, then snap to the game palette (one pixel density on screen)."""
    a = a.astype(np.float32)
    b = (a[0::2, 0::2] + a[1::2, 0::2] + a[0::2, 1::2] + a[1::2, 1::2]) / 4
    cv = Canvas.from_array(np.round(b).astype(np.uint8))
    cv.a[..., 3] = 255
    snap_to_palette(cv)
    return cv


def terrain():
    """The colour painting's ground (no glyphs) and the water mask at 1:1 (True = water)."""
    db = tiledb()
    scene = {'name': 'world', 'legend': LEGEND, 'ground': G, 'under': 'grass'}
    cv16 = compose.render(scene, db=db, scale=1)
    a = cv16.a
    lum = a[..., :3].astype(np.float32).mean(axis=2)
    # the water mask: the same grid with every water char as water and every land char as grass (the same autotile
    # shore), read by colour; flood grass, heath and the North's ice would read as water in the painting itself
    mask_legend = {ch: ('water' if ch in WATER else 'grass') for ch in LEGEND}
    m16 = compose.render({'name': 'mask', 'legend': mask_legend, 'ground': G, 'under': 'grass'}, db=db, scale=1).a
    water16 = m16[..., 2].astype(int) > m16[..., 0].astype(int) + 20
    # the white North: the sand autotile re-inked in the ice ramp (no snow terrain exists)
    north = np.zeros(a.shape[:2], bool)
    for y, row in enumerate(G):
        for x, ch in enumerate(row):
            if ch == 'S':
                north[y * 16:(y + 1) * 16, x * 16:(x + 1) * 16] = True
    ice = [np.array(C('ice', i)[:3], np.uint8) for i in range(4)]
    for i, (lo, hi) in enumerate(((0, 120), (120, 160), (160, 195), (195, 256))):
        a[north & ~water16 & (lum >= lo) & (lum < hi), :3] = ice[i]
    col = half(a)
    water = (water16[0::2, 0::2].astype(int) + water16[1::2, 0::2] + water16[0::2, 1::2] + water16[1::2, 1::2]) >= 2
    return col, water


def parchment():
    cv = Canvas(W, H)
    for y in range(H):
        for x in range(W):
            n = h32(x, y, 97) % 100
            col = P0 if n > 9 else P1
            if (x % 16 == 0 or y % 16 == 0) and (x + y) % 2 == 0:
                col = C('earth', 4)
            cv.a[y, x] = col
    return cv


def ink_layer(water):
    """The rumour sketch: parchment, the coast and the river in brown ink, the land lightly flecked, every glyph inked."""
    cv = parchment()
    for y in range(H):
        for x in range(W):
            if water[y, x]:
                if (x * 7 + y * 3) % 23 == 0:
                    cv.a[y, x] = P1                            # a few strokes of sea
                continue
            edge = any(0 <= x + dx < W and 0 <= y + dy < H and water[y + dy, x + dx]
                       for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)))
            if edge:
                cv.a[y, x] = INK
            elif (x * 3 + y * 5) % 13 == 0:
                cv.a[y, x] = P1
    draw_glyphs(cv, 'ink')
    return cv


def strip():
    """The 16 px sprite strip: the Saffron Wind (x 0, 14 x 12) and the Kestrel (x 16, 22 x 12)."""
    cv = Canvas(W, STRIP_H)
    p = Pen(cv, 'color')
    # the ship: hull, mast, a sand-coloured sail
    px, py = 0, 13
    for i in range(3):
        y = py - 3 + i
        p.row(px + 1 + i, px + 12 - i, y, 'l' if i == 0 else 'd', C('wood', 3 if i == 0 else 2))
        p.px(px + i, y, 'o')
        p.px(px + 13 - i, y, 'o')
    p.row(px + 3, px + 10, py, 'o')
    p.row(px, px + 13, py - 4, 'o')
    for yy in range(py - 12, py - 4):
        p.px(px + 6, yy, 'd', C('wood', 1))
    for i in range(6):
        y = py - 11 + i
        p.row(px + 7, px + 7 + (6 - i) // 1 - 1, y, 'l', C('sand', 3 if i < 3 else 2))
        p.px(px + 7 + (6 - i), y, 'o')
    p.px(px + 6, py - 13, 'a', C('roof_red', 4))
    # the Kestrel: a red envelope over a wooden gondola, a gold lamp at the bow
    kx, ky = 16, 13
    for i in range(4):
        y = ky - 11 + i
        p.row(kx + 4 - i, kx + 17 + i, y, 'l' if i < 2 else 'd', C('roof_red', 4 if i < 2 else 2))
        p.px(kx + 3 - i, y, 'o')
        p.px(kx + 18 + i, y, 'o')
    p.row(kx + 4, kx + 17, ky - 12, 'o')
    p.row(kx + 1, kx + 20, ky - 7, 'o')
    for i in range(3):
        y = ky - 4 + i
        p.row(kx + 6 + i, kx + 15 - i, y, 'd', C('wood', 2))
        p.px(kx + 5 + i, y, 'o')
        p.px(kx + 16 - i, y, 'o')
    p.row(kx + 8, kx + 13, ky - 1, 'o')
    p.px(kx + 10, ky - 6, 'o')
    p.px(kx + 10, ky - 5, 'o')
    p.px(kx + 21, ky - 9, 'a', C('gold', 5))
    p.px(kx + 21, ky - 8, 'a', C('gold', 4))
    return cv


def waystone():
    """The map stone: a standing stone with a compass rune, 2 frames of 16 x 32 (0 dim, 1 lit). The stone stands on the
    lower 16 px cell and rises into the cell above."""
    cv = Canvas(32, 32)
    for f in (0, 1):
        ox = f * 16
        p = Pen(cv, 'color')
        top, foot = 9, 29
        for y in range(top, foot):
            inset = 2 if y == top else 1 if y < top + 2 else 0
            x0, x1 = ox + 4 + inset, ox + 11 - inset
            for x in range(x0, x1 + 1):
                if x < ox + 6:
                    col = C('stone_cool', 3)
                elif x < ox + 9:
                    col = C('stone_cool', 2)
                else:
                    col = C('stone_cool', 1)
                p.px(x, y, 'm', col)
            p.px(x0 - 1, y, 'o')
            p.px(x1 + 1, y, 'o')
        p.row(ox + 7, ox + 8, top - 1, 'o')
        p.px(ox + 6, top, 'o')
        p.px(ox + 9, top, 'o')
        p.px(ox + 5, top + 1, 'o')
        p.px(ox + 10, top + 1, 'o')
        # moss on the shaded side and a chip of light on the lit edge
        for (x, y) in ((ox + 10, 24), (ox + 11, 25), (ox + 10, 26), (ox + 11, 27), (ox + 9, 27)):
            p.px(x, y, 'd', C('grass', 2))
        for y in range(top + 3, foot - 3, 4):
            p.px(ox + 4, y, 'l', C('stone_cool', 4))
        # the compass rune: a four-point star, cyan, brighter and haloed when lit
        rune = C('magic_cyan', 3 if f else 1)
        core = C('magic_cyan', 4 if f else 2)
        cx, cy = ox + 7, 17
        for (dx, dy) in ((0, -3), (0, -2), (0, 2), (0, 3), (-2, 0), (-3, 0), (2, 0), (3, 0)):
            p.px(cx + dx, cy + dy, 'a', rune)
        for (dx, dy) in ((0, -1), (0, 1), (-1, 0), (1, 0)):
            p.px(cx + dx, cy + dy, 'a', core)
        p.px(cx, cy, 'a', C('magic_cyan', 4) if f else core)
        if f:
            for (dx, dy) in ((-1, -1), (1, -1), (-1, 1), (1, 1)):
                p.px(cx + dx, cy + dy, 'a', C('magic_cyan', 2))
            for (x, y) in ((ox + 3, 6), (ox + 12, 8), (ox + 2, 14)):
                cv.set(x, y, C('magic_cyan', 3))
        # the foot: a flat plinth and a soft cast shadow on the ground cell
        p.row(ox + 3, ox + 12, foot, 'o')
        p.row(ox + 4, ox + 11, foot - 1, 'd', C('stone_cool', 1))
        p.px(ox + 3, foot - 1, 'o')
        p.px(ox + 12, foot - 1, 'o')
        for x in range(ox + 3, ox + 14):
            cv.set(x, foot + 1, (*C('shadow', 0)[:3], 110))
        for x in range(ox + 5, ox + 12):
            cv.set(x, foot + 2, (*C('shadow', 0)[:3], 70))
    return cv


def tile_fragment():
    return {
        'version': 1,
        'tileSize': 16,
        'generator': 'next/tools/art/worldmap/build_worldmap.py',
        'note': 'The worldmap pack tile fragment: the map stone (waystone) at town gates and docks. Merged into the live tile '
                'database by ensurePack; never appended to tiles.json.',
        'objects': {
            'worldmap_stone': {
                'rect': [0, 0, 16, 32], 'anchor': [0, 1], 'footprint': [[0, 0]], 'overheadRows': 1, 'doorAt': None,
                'collision': 'solid', 'kind': 'prop', 'frames': [[0, 0, 16, 32], [16, 0, 16, 32]],
                'light': {'color': '#8af0e8', 'radius': 1.6},
                'note': 'the map stone (src/data/worldmap/field.js): frame 0 dim, 1 lit while the party stands by it',
                'sheet': 'worldmap.png',
            },
        },
    }


def save_indexed(cv, path):
    """An exact indexed PNG (every colour is already a palette colour): deterministic and small."""
    a = cv.a
    flat = a.reshape(-1, 4)
    uniq, inv = np.unique(flat, axis=0, return_inverse=True)
    assert len(uniq) <= 256, f'{path}: {len(uniq)} colours'
    im = Image.fromarray(inv.reshape(a.shape[:2]).astype(np.uint8), 'P')
    pal = uniq[:, :3].reshape(-1).tolist()
    im.putpalette(pal + [0] * (768 - len(pal)))
    alpha = uniq[:, 3].tolist()
    kw = {'transparency': bytes(alpha)} if any(v < 255 for v in alpha) else {}
    im.save(path, optimize=True, **kw)


def layout_js(regions):
    pts = {pid: [x * 8 + 4, y * 8 + 4] for pid, (x, y, _k) in PLACES.items()}
    pts.update({pid: [x * 8 + 4, y * 8 + 4] for pid, (x, y) in POINTS.items()})
    lines = [
        '// GENERATED by next/tools/art/worldmap/build_worldmap.py: do not edit. The world map painting\'s layout (issue #97):',
        '// the region of every 8 px cell of assets/ui/worldmap_map.png (one letter per cell, REGION_IDS in the build script)',
        '// and the pixel point of every place and road point (the glyph centre: the label and the party marker anchor there).',
        f'export const SIZE = {{ w: {W}, h: {H}, cell: 8, cols: {COLS}, rows: {ROWS}, ink: {H}, paper: {2 * H}, strip: {STRIP_Y} }};',
        f'export const SPRITES = {{ ship: [0, {STRIP_Y}, 14, 14], kestrel: [16, {STRIP_Y}, 23, 14] }};',
        'export const REGIONS = [',
    ]
    lines += [f"  '{r}'," for r in regions]
    lines += ['];', 'export const POINTS = {']
    lines += [f'  {pid}: [{x}, {y}],' for pid, (x, y) in pts.items()]
    lines += ['};', '']
    return '\n'.join(lines)


def build(preview=False):
    col, water = terrain()
    regions = region_grid()
    ink = ink_layer(water)
    paper = parchment()
    draw_glyphs(col, 'color')
    sheet = Canvas(W, STRIP_Y + STRIP_H)
    sheet.a[0:H] = col.a
    sheet.a[H:2 * H] = ink.a
    sheet.a[2 * H:3 * H] = paper.a
    sheet.a[STRIP_Y:STRIP_Y + STRIP_H] = strip().a
    save_indexed(sheet, os.path.join(NEXT, 'assets', 'ui', 'worldmap_map.png'))
    save_indexed(waystone(), os.path.join(NEXT, 'assets', 'tiles', 'worldmap.png'))
    with open(os.path.join(NEXT, 'assets', 'tiles', 'worldmap_tiles.json'), 'w', newline='\n') as fh:
        fh.write(json.dumps(tile_fragment(), indent=1) + '\n')
    with open(os.path.join(NEXT, 'src', 'data', 'worldmap', 'layout.js'), 'w', newline='\n') as fh:
        fh.write(layout_js(regions))
    if preview:
        os.makedirs(OUT, exist_ok=True)
        Image.fromarray(sheet.a, 'RGBA').resize((W * 3, (STRIP_Y + STRIP_H) * 3), Image.NEAREST).save(os.path.join(OUT, 'preview_sheet.png'))
        Image.fromarray(waystone().a, 'RGBA').resize((32 * 6, 32 * 6), Image.NEAREST).save(os.path.join(OUT, 'preview_stone.png'))
    print('worldmap: built assets/ui/worldmap_map.png, assets/tiles/worldmap.png, assets/tiles/worldmap_tiles.json, '
          'src/data/worldmap/layout.js')


if __name__ == '__main__':
    build(preview='--preview' in sys.argv)
