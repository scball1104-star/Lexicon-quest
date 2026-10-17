"""Rebuild every sprite sheet, atlas, contact sheet and the README.

    python build_all.py            (about 10 seconds; deterministic)

Outputs: next/assets/sprites/*.png + *.json + README.md, previews in tools/art/sprites/out/.
Reads next/assets/palette.json (W1-tiles) at build time; re-run after palette tweaks.
"""
import os, sys, json, time
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(HERE, 'chars'))
from pix import DST, OUT
import pal as P


def main():
    t0 = time.time()
    import build_party_field, build_party_battle, build_npcs, build_props, build_enemies, build_bosses
    import build_portraits, build_misc
    steps = [
        ('party_field', build_party_field.build),
        ('party_battle', build_party_battle.build),
        ('npcs', build_npcs.build),
        ('props', build_props.build),
        ('enemies_battle', build_enemies.build_battle),
        ('enemies_field', build_enemies.build_field),
        ('bosses_battle', build_bosses.build),
        ('portraits', build_portraits.build_atlas),
        ('misc', build_misc.build),
    ]
    for name, fn in steps:
        t = time.time()
        fn()
        print('%-15s %.1fs' % (name, time.time() - t))
    import make_readme
    make_readme.write(P.EXTRAS)
    import overview
    overview.render()
    print('done in %.1fs' % (time.time() - t0))


if __name__ == '__main__':
    main()
