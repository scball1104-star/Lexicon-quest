"""Episode 2 battle mocks (E2-sprites): the real Episode 2 sprites on E2-tiles' stages, through E2-tiles'
tools/art/backdrops/mock_stage.py (imported, not edited), plus a lineup of the Court's armoured beings beside the
Echo Warden so they can be judged as different creatures.

    python ep2_mock.py      -> out/e2/mock_stage_<setup>_3x.png, out/e2/lineup_court_4x.png
"""
import os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'backdrops'))
import mock_stage as MS
from PIL import Image, ImageDraw

SETUPS = {
    'e2_road': ('battle_east_road', ['mist_wolf', 'glassback', 'quicksilver'], 0.0),
    'e2_court_f1': ('battle_court', ['quicksilver', 'glint_wisp', 'glass_sentinel'], 0.0),
    'e2_court_f2': ('battle_court', ['borrowed_shadow', 'faceless_knight', 'glint_wisp'], 0.0),
    'e2_other_selves': ('battle_court', ['refl_hero', 'refl_mira', 'refl_bram'], 0.0),
    'e2_court_f3': ('battle_court_deep', ['shard_swarm', 'faceless_knight', 'glass_sentinel'], 0.0),
    'e2_king_court': ('battle_throne', ['false_sorrow', 'nameless_king', 'false_pride'], 0.0),
    'e2_king_unmasked': ('battle_throne', ['nameless_king_unmasked'], 0.0),
}


def lineup(path, names, scale=4, bg=(44, 50, 86)):
    spr = MS.Sprites(os.path.join(MS.NEXT, 'assets', 'sprites'))
    fr = [(n,) + spr.frame(n) for n in names]
    up = max(oy for _, im, ox, oy in fr)
    w = sum(im.width for _, im, _, _ in fr) + 12 * (len(fr) + 1)
    h = up + 24
    out = Image.new('RGBA', (w, h), bg + (255,))
    d = ImageDraw.Draw(out)
    x = 12
    for n, im, ox, oy in fr:
        out.alpha_composite(im, (x, 8 + up - oy))
        x += im.width + 12
    out = out.convert('RGB').resize((w * scale, h * scale), Image.NEAREST)
    d = ImageDraw.Draw(out)
    x = 12
    for n, im, ox, oy in fr:
        d.text((x * scale, (h - 12) * scale), n, fill=(235, 235, 210))
        x += im.width + 12
    out.save(path)


def main():
    MS.SETUPS.update(SETUPS)
    MS.OUT = os.path.join(HERE, 'out', 'e2')
    os.makedirs(MS.OUT, exist_ok=True)
    spr = MS.Sprites(os.path.join(MS.NEXT, 'assets', 'sprites'))
    for s in SETUPS:
        MS.render(s, spr)
    lineup(os.path.join(MS.OUT, 'lineup_court_4x.png'),
           ['echo_warden', 'faceless_knight', 'false_pride', 'nameless_king', 'refl_hero', 'refl_mira', 'refl_bram'], 3)


if __name__ == '__main__':
    main()
