"""Battle-stage mocks for the X1 foes (X1-sprites): the real atlases (base + the x1_ pack atlases) at the real layout slots of
tools/art/backdrops/mock_stage.py on the existing stages that stand in for the X1 backdrops (archive_deep for the Barrow
and the Culvert; the dedicated x1_ backdrops, when X1-tiles ships them, are used if present).

    python x1_stage.py          writes out/x1/stage_<setup>_3x.png and out/x1/compare_*.png
"""
import json, os, sys
from PIL import Image, ImageDraw
HERE = os.path.dirname(os.path.abspath(__file__))
NEXT = os.path.normpath(os.path.join(HERE, '..', '..', '..'))
sys.path.insert(0, os.path.join(HERE, '..', 'backdrops'))
import mock_stage as MS

OUT = os.path.join(HERE, 'out', 'x1')
SPR = os.path.join(NEXT, 'assets', 'sprites')
BD = os.path.join(NEXT, 'assets', 'backdrops')
ATL = ('x1_bosses_battle', 'x1_enemies_battle', 'enemies_battle', 'bosses_battle', 'party_battle', 'misc')


class Sprites(MS.Sprites):
    def __init__(self):
        self.at = {}
        for n in ATL:
            with open(os.path.join(SPR, n + '.json'), encoding='utf-8') as f:
                m = json.load(f)
            self.at[n] = (m, Image.open(os.path.join(SPR, m['image'])).convert('RGBA'))

    def frame(self, name):
        for n in ATL:
            m, img = self.at[n]
            if name in m['frames']:
                f = m['frames'][name]
                x, y, w, h = f[:4]
                if len(f) >= 6:
                    ox, oy = f[4], f[5]
                else:
                    o = m.get('origin')
                    ox, oy = (o[name] if isinstance(o, dict) else o) if o else (w // 2, h - 1)
                return img.crop((x, y, x + w, y + h)), ox, oy
        raise KeyError(name)


SETUPS = {
    # the Barrow: two shades; a shade with a page wraith; the Reeve with a summoned shade
    'barrow_shades': ('x1_barrow', 'battle_archive', 0.22, ['barrow_shade', 'barrow_shade'], None),
    'barrow_mixed': ('x1_barrow', 'battle_archive', 0.22, ['barrow_shade', 'page_wraith', 'barrow_shade'], None),
    'barrow_reeve': ('x1_barrow', 'battle_archive', 0.22, None, [('barrow_reeve', 98, MS.FEET), ('barrow_shade', 200, MS.FEET)]),
    'culvert_golem': ('x1_culvert', 'battle_archive', 0.22, None, [('millstone_golem', 98, MS.FEET), ('moss_scarab', 200, MS.FEET)]),
    'compare_reeve': ('x1_barrow', 'battle_archive', 0.22, None, [('echo_warden', 60, MS.FEET), ('barrow_reeve', 150, MS.FEET), ('briar_alpha', 245, MS.FEET)]),
    'compare_golem': ('x1_culvert', 'battle_archive', 0.22, None, [('tome_golem', 80, MS.FEET), ('millstone_golem', 190, MS.FEET)]),
    'compare_shade': ('x1_barrow', 'battle_archive', 0.22, None, [('page_wraith', 60, MS.FEET), ('barrow_shade', 150, MS.FEET), ('ink_wraith', 245, MS.FEET)]),
}


def render(name, spr, party=True):
    mapid, bid, darken, foes, units = SETUPS[name]
    for cand in ('x1_' + bid.replace('battle_', ''), bid):
        p = os.path.join(BD, cand + '.png')
        if os.path.exists(p):
            bid = cand
            break
    bg = Image.open(os.path.join(BD, bid + '.png')).convert('RGBA')
    if darken:
        bg.alpha_composite(Image.new('RGBA', (MS.W, MS.H), (0, 0, 0, int(round(darken * 255)))))
    meta = json.load(open(os.path.join(BD, bid + '.json'), encoding='utf-8'))
    if meta.get('bandY') is not None:
        bg.alpha_composite(Image.new('RGBA', (MS.W, MS.H - meta['bandY']), (20, 16, 30, int(round(meta['bandAlpha'] * 255)))), (0, meta['bandY']))
    if units is None:
        units = [(n, x, MS.FEET) for n, x in zip(foes, MS.ENEMY_X[len(foes)])]
    units = list(units)
    if party and not name.startswith('compare'):
        units += [(n, x, MS.FEET) for n, x in MS.PARTY]
    for n, x, y in units:
        im, ox, oy = spr.frame(n)
        sh, sox, soy = spr.frame(MS.shadow_for(im.width))
        bg.alpha_composite(sh, (x - sox, y - soy + 1))
    for n, x, y in units:
        im, ox, oy = spr.frame(n)
        bg.alpha_composite(im, (x - ox, y - oy))
    box = Image.new('RGBA', (MS.W, MS.H), (0, 0, 0, 0))
    d = ImageDraw.Draw(box)
    for (x, y, w, h) in ((4, 4, 218, 19), (4, 152, 92, 60), (98, 152, 282, 60)):
        d.rectangle((x, y, x + w - 1, y + h - 1), fill=(30, 46, 110, 235), outline=(226, 224, 222, 255))
    bg.alpha_composite(box)
    rgb = bg.convert('RGB')
    rgb.save(os.path.join(OUT, f'stage_{name}_1x.png'))
    rgb.resize((MS.W * 3, MS.H * 3), Image.NEAREST).save(os.path.join(OUT, f'stage_{name}_3x.png'))
    rgb.resize((MS.W * 2, MS.H * 2), Image.NEAREST).save(os.path.join(OUT, f'stage_{name}_2x.png'))
    return bid


if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    spr = Sprites()
    for n in SETUPS:
        print(n, render(n, spr))
