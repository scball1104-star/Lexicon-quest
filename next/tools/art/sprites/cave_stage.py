"""Battle-stage mocks for the Binder (C2-sprites-boss): the real atlases (base + the cave_ pack atlases) at the real layout
slots of tools/art/backdrops/mock_stage.py on the boss stage (battle_boss, as foes.js CAVE_ZONES.cave_boss says), one
image per look, plus the Archivore on the same stage for the side-by-side.

    python cave_stage.py          writes out/cave/stage_<look>_3x.png (and _1x)
"""
import json, os, sys
from PIL import Image, ImageDraw
HERE = os.path.dirname(os.path.abspath(__file__))
NEXT = os.path.normpath(os.path.join(HERE, '..', '..', '..'))
sys.path.insert(0, os.path.join(HERE, '..', 'backdrops'))
import mock_stage as MS

OUT = os.path.join(HERE, 'out', 'cave')
SPR = os.path.join(NEXT, 'assets', 'sprites')
BD = os.path.join(NEXT, 'assets', 'backdrops')
ATL = ('cave_bosses_battle', 'enemies_battle', 'bosses_battle', 'party_battle', 'misc')


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
                x, y, w, h = m['frames'][name][:4]
                o = m.get('origin')
                ox, oy = (o[name] if isinstance(o, dict) else o) if o else (w // 2, h - 1)
                return img.crop((x, y, x + w, y + h)), ox, oy
        raise KeyError(name)


# look -> [(frame, x, feet y)]: the boss at the boss slot, the Loose Leaves phase with a summoned page at the summon slot
SETUPS = {
    'archivore': [('archivore', 98, MS.FEET), ('lost_page_1', 200, 70)],
    'binder': [('binder', 98, MS.FEET)],
    'binder_cast': [('binder_cast', 98, MS.FEET)],
    'binder_loose': [('binder_loose', 98, MS.FEET), ('lost_page_1', 200, 70)],
    'binder_loose_devour': [('binder_loose_devour', 98, MS.FEET), ('lost_page_1', 200, 70)],
    'binder_binding': [('binder_binding', 98, MS.FEET)],
    'binder_binding_attack': [('binder_binding_attack', 98, MS.FEET)],
}


def render(name, spr):
    bg = Image.open(os.path.join(BD, 'battle_boss.png')).convert('RGBA')
    meta = json.load(open(os.path.join(BD, 'battle_boss.json'), encoding='utf-8'))
    if meta.get('bandY') is not None:
        bg.alpha_composite(Image.new('RGBA', (MS.W, MS.H - meta['bandY']), (20, 16, 30, int(round(meta['bandAlpha'] * 255)))), (0, meta['bandY']))
    units = list(SETUPS[name]) + [(n, x, MS.FEET) for n, x in MS.PARTY]
    for n, x, y in units:
        if y != MS.FEET:
            continue
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
    d.rectangle((226, 6, 379, 23), fill=(20, 16, 30, 150))
    bg.alpha_composite(box)
    rgb = bg.convert('RGB')
    rgb.save(os.path.join(OUT, f'stage_{name}_1x.png'))
    rgb.resize((MS.W * 3, MS.H * 3), Image.NEAREST).save(os.path.join(OUT, f'stage_{name}_3x.png'))


if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    spr = Sprites()
    names = sys.argv[1:] or list(SETUPS)
    for n in names:
        render(n, spr)
    # one strip of the three looks on the stage at 2x for the report
    ims = [Image.open(os.path.join(OUT, f'stage_{n}_1x.png')) for n in ('archivore', 'binder', 'binder_loose', 'binder_binding') if n in names]
    if ims:
        strip = Image.new('RGB', (MS.W * 2 * 2 + 8, MS.H * 2 * 2 + 8), (10, 8, 16))
        for i, im in enumerate(ims):
            strip.paste(im.resize((MS.W * 2, MS.H * 2), Image.NEAREST), ((i % 2) * (MS.W * 2 + 8), (i // 2) * (MS.H * 2 + 8)))
        strip.save(os.path.join(OUT, 'stage_looks_2x.png'))
    print('wrote', len(names), 'stage mocks to', OUT)
