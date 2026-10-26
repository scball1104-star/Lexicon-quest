"""X1-maps-wild previews: x1_highmoor and x1_larchhill at 2x, annotated and clean, plus a `_routes` variant of each with the three
routes drawn in three colours (A red, B blue, C green) and, for the moor, the ink route revealed.

    python tools/maps/previews/x1_highmoor_render.py              # all four previews (and their _clean twins), into tools/maps/previews/
    python tools/maps/previews/x1_highmoor_render.py x1_larchhill # one map
    python tools/maps/previews/x1_highmoor_render.py --scale=3

Why a script of its own: tools/maps/preview.py has not met the x1 NPC and field-foe atlases (the pack merges them at run time) and draws no routes.
This script reuses preview.render() and changes only what is drawn. The route cell lists come from qa/maps/x1_wild.test.mjs (the same
pathfinder the test asserts with): it is run with X1_WILD_DUMP=<file> and writes the three routes of each map.
"""
import copy, json, os, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
MAPS = os.path.normpath(os.path.join(HERE, '..'))
NEXT = os.path.normpath(os.path.join(MAPS, '..', '..'))
sys.path.insert(0, MAPS)
import preview as P                                    # noqa: E402
from x1_preview import X1DB                            # noqa: E402
from PIL import Image, ImageDraw                       # noqa: E402

sys.path.insert(0, HERE)
from x1_downs_render import X1Atlases, x1_npc_map      # noqa: E402

COLORS = {'A': (230, 60, 60), 'B': (70, 120, 255), 'C': (40, 200, 90)}
NAMES = {'x1_highmoor': {'A': 'A Chime Road', 'B': 'B Ridgeline', 'C': 'C Hidden Fold'},
         'x1_larchhill': {'A': 'A Switchback Road', 'B': 'B Terrace Stairs', 'C': 'C Aqueduct Walk'}}


def routes():
    out = os.path.join(MAPS, 'out', 'x1_wild_routes.json')
    os.makedirs(os.path.dirname(out), exist_ok=True)
    env = dict(os.environ, X1_WILD_DUMP=out)
    r = subprocess.run(['node', '--test', os.path.join(NEXT, 'qa', 'maps', 'x1_wild.test.mjs')], cwd=NEXT, env=env, capture_output=True, text=True, timeout=180)
    if not os.path.exists(out):
        raise SystemExit('route dump missing:\n' + r.stdout[-2000:] + r.stderr[-1000:])
    with open(out) as fh:
        return json.load(fh)


def reveal(mp):
    """The Lantern has been raised along the whole ink route: faint bridge cells drawn as revealed."""
    mp = copy.deepcopy(mp)
    for o in mp['overlays']:
        if o['t'].endswith('_faint'):
            o['t'] = o['t'].replace('_faint', '_revealed')
    return mp


def draw_routes(img, rt, scale, map_id):
    d = ImageDraw.Draw(img, 'RGBA')
    S = 16 * scale
    legend_y = 4
    for r, cells in rt.items():
        col = COLORS[r]
        pts = [((x + 0.5) * S, (y + 0.5) * S) for x, y in cells]
        off = {'A': -3, 'B': 0, 'C': 3}[r] * scale // 2          # the three lines run side by side where they share cells
        pts = [(x + off, y + off) for x, y in pts]
        d.line(pts, fill=col + (230,), width=max(2, scale + 1), joint='curve')
        for i in (0, len(pts) - 1):
            x, y = pts[i]
            d.ellipse([x - 4, y - 4, x + 4, y + 4], fill=col + (255,), outline=(255, 255, 255, 255))
        d.rectangle([4, legend_y, 150, legend_y + 13], fill=(0, 0, 0, 170))
        d.text((8, legend_y + 1), '%s: %d cells' % (NAMES[map_id][r], len(cells) - 1), fill=col + (255,))
        legend_y += 15
    return img


def render_one(db, spr, atl, npcs, map_id, name, scale, flags, rt=None, revealed=False):
    real = P.load_map(map_id)
    drawn = reveal(real) if revealed else real
    cv = P.render(drawn, db, spr, atl, npc_map=npcs, flags=flags)
    big = cv.image().resize((cv.w * scale, cv.h * scale), Image.NEAREST)
    big.save(os.path.join(HERE, '%s_clean.png' % name))
    real_ev = [e for e in real['events'] if P.present(e, flags)]
    ann = P.annotate(big.convert('RGBA'), dict(real, events=real_ev), scale)
    if rt:
        ann = draw_routes(ann, rt, scale, map_id)
    out = os.path.join(HERE, '%s.png' % name)
    ann.save(out)
    print('wrote', out, '%dx%d tiles' % (len(real['ground'][0]), len(real['ground'])))


def main(argv):
    scale = 2
    ids = []
    for a in argv[1:]:
        if a.startswith('--scale='):
            scale = int(a.split('=', 1)[1])
        else:
            ids.append(a)
    ids = ids or ['x1_highmoor', 'x1_larchhill']
    db, spr, atl, npcs = X1DB(), P.SpriteDB(), X1Atlases(), x1_npc_map()
    allr = routes()
    flags = {'first_fight_done'}
    for map_id in ids:
        render_one(db, spr, atl, npcs, map_id, map_id, scale, flags)
        render_one(db, spr, atl, npcs, map_id, map_id + '_routes', scale, flags, rt=allr[map_id], revealed=(map_id == 'x1_highmoor'))


if __name__ == '__main__':
    main(sys.argv)
