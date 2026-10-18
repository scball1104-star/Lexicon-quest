"""3x battle-stage mocks with the real sprites at the real layout slots, so sprites can be judged against
the stages they fight on (W5-art: dark enemies on the dark Archive stage, the composed valley stage).

    python mock_stage.py                       # out/mock_stage_<setup>_3x.png for every setup
    python mock_stage.py archive_f1 boss       # some of them
    python mock_stage.py --sprites DIR --tag before   # read the sprite atlases from DIR (a snapshot),
                                                      # write out/mock_stage_<setup>_before_3x.png

Layout follows src/battle/scene/layout.js: enemies at ENEMY_X[n] with feet on y 146, the party at
290 / 318 / 346, the boss at x 98, summoned pages at (200, 70); the stage band from the backdrop json
(bandY, bandAlpha, indigo #14101e) under the sprites; an ellipse shadow (misc.json) under every unit;
help window (4,4,218,19), timeline rail (226,6,154,18), command (4,152,92,60) and status (98,152,282,60)
windows as flat boxes. The archive_deep setup darkens battle_archive by 22 percent as battle.js does.
"""
import json, os, sys
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
NEXT = os.path.normpath(os.path.join(HERE, '..', '..', '..'))
DST = os.path.join(NEXT, 'assets', 'backdrops')
OUT = os.path.join(HERE, 'out')
W, H = 384, 216
FEET = 146
ENEMY_X = {1: [118], 2: [78, 164], 3: [52, 124, 196], 4: [40, 98, 156, 214], 5: [36, 86, 136, 186, 236]}
PARTY = [('hero_sword_idle_0', 290), ('mira_staff_idle_0', 318), ('bram_spear_idle_0', 346)]
SHADOWS = [('shadow_small', 12), ('shadow_medium', 18), ('shadow_large', 28), ('shadow_huge', 48)]

SETUPS = {
    'valley': ('battle_valley', ['briar_wolf', 'moss_scarab', 'ink_slime'], 0.0),
    'valley_dusk': ('battle_valley_dusk', ['briar_wolf', 'briar_wolf', 'moss_scarab'], 0.0),
    'archive_f1': ('battle_archive', ['ink_slime', 'page_wraith', 'bookmite'], 0.0),
    'archive_f2': ('battle_archive', ['page_wraith', 'tome_golem', 'bookmite'], 0.0),
    'archive_deep': ('battle_archive', ['ink_wraith', 'tome_golem', 'page_wraith'], 0.22),
    'boss': ('battle_boss', ['archivore', 'lost_page_1'], 0.0),
}


class Sprites:
    def __init__(self, folder):
        self.folder = folder
        self.at = {}
        for n in ('enemies_battle', 'bosses_battle', 'party_battle', 'misc'):
            with open(os.path.join(folder, n + '.json'), encoding='utf-8') as f:
                m = json.load(f)
            self.at[n] = (m, Image.open(os.path.join(folder, m['image'])).convert('RGBA'))

    def frame(self, name):
        for n in ('enemies_battle', 'bosses_battle', 'party_battle', 'misc'):
            m, img = self.at[n]
            if name in m['frames']:
                x, y, w, h = m['frames'][name]
                o = m['origin']
                ox, oy = (o[name] if isinstance(o, dict) else o) if o else (w // 2, h - 1)
                return img.crop((x, y, x + w, y + h)), ox, oy
        raise KeyError(name)


def shadow_for(w):
    want = max(10, w * 0.5)
    return min(SHADOWS, key=lambda f: abs(f[1] - want))[0]


def render(setup, spr, tag=''):
    bid, foes, darken = SETUPS[setup]
    p = os.path.join(DST, bid + '.png')
    if not os.path.exists(p):
        print('skip', setup, '(no', bid + '.png)')
        return None
    bg = Image.open(p).convert('RGBA')
    if darken:
        dark = Image.new('RGBA', (W, H), (0, 0, 0, int(round(darken * 255))))
        bg.alpha_composite(dark)
    with open(os.path.join(DST, bid + '.json'), encoding='utf-8') as f:
        meta = json.load(f)
    if meta.get('bandY') is not None:
        band = Image.new('RGBA', (W, H - meta['bandY']), (20, 16, 30, int(round(meta['bandAlpha'] * 255))))
        bg.alpha_composite(band, (0, meta['bandY']))
    units = []
    if setup == 'boss':
        units.append(('archivore', 98, FEET))
        units.append(('lost_page_1', 200, 70))
    else:
        for name, x in zip(foes, ENEMY_X[len(foes)]):
            units.append((name, x, FEET))
    for name, x in PARTY:
        units.append((name, x, FEET))
    # shadows first, then units left to right (the rightmost foe is in front)
    for name, x, y in units:
        if y != FEET:
            continue
        im, ox, oy = spr.frame(name)
        sh, sox, soy = spr.frame(shadow_for(im.width))
        bg.alpha_composite(sh, (x - sox, y - soy + 1))
    for name, x, y in units:
        im, ox, oy = spr.frame(name)
        bg.alpha_composite(im, (x - ox, y - oy))
    box = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(box)
    for (x, y, w, h) in ((4, 4, 218, 19), (4, 152, 92, 60), (98, 152, 282, 60)):
        d.rectangle((x, y, x + w - 1, y + h - 1), fill=(30, 46, 110, 235), outline=(226, 224, 222, 255))
    d.rectangle((226, 6, 379, 23), fill=(20, 16, 30, 150))
    bg.alpha_composite(box)
    out = os.path.join(OUT, 'mock_stage_%s%s_3x.png' % (setup, ('_' + tag) if tag else ''))
    bg.convert('RGB').resize((W * 3, H * 3), Image.NEAREST).save(out)
    print('wrote', out)
    return out


def main(argv):
    folder = os.path.join(NEXT, 'assets', 'sprites')
    tag = ''
    args = []
    i = 0
    while i < len(argv):
        if argv[i] == '--sprites':
            folder = argv[i + 1]; i += 2
        elif argv[i] == '--tag':
            tag = argv[i + 1]; i += 2
        else:
            args.append(argv[i]); i += 1
    spr = Sprites(folder)
    os.makedirs(OUT, exist_ok=True)
    for setup in (args or list(SETUPS)):
        render(setup, spr, tag)


if __name__ == '__main__':
    main(sys.argv[1:])
