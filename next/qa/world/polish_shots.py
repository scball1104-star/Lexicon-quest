"""Targeted headless shots for the world polish wave (W4): dithered lighting, night, ambient life, game over.

    python next/qa/world/polish_shots.py                 every shot, desktop
    python next/qa/world/polish_shots.py --only night_square,dark_lantern
    python next/qa/world/polish_shots.py --device phone

Writes next/qa/world/out/p_<name>.png (3x) and p_<name>_x1.png. Fails (exit 1) on any console error.
"""
import argparse
import json
import sys
import pathlib

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from fieldlab import Lab  # noqa: E402

STORY_FLAGS = ['intro_done', 'saw_fading_sign', 'met_mael', 'mira_joined', 'bram_joined', 'left_town', 'valley_arrived',
               'archive_entered', 'f1_arrived', 'archive_f1_done', 'f2_arrived', 'echo_warden_defeated', 'lantern_get',
               'archive_f2_done', 'f3_arrived', 'found_thirteenth_bell', 'saw_milestone']

FIELD = "LQ_ENGINE.stack.find(s => s.name === 'field')"


def tint(lab, name):
    lab.run(f"{FIELD}.lighting.setTint({json.dumps(name)}, 0)")


SHOTS = {
    # C7: the dark test archive with the Lantern raised over hidden ink (same spot as field_archive_dark_lantern)
    'dark_lantern': [('flags', ['f1_arrived']), ('warp', ['_testdungeon', 12, 7, 'right']), ('frames', 120),
                     ('call', ['give', 'lantern_of_recall', 1]), ('call', ['lantern']), ('frames', 45)],
    'push_block': [('warp', ['_testdungeon', 9, 16, 'right']), ('frames', 120), ('walk', 'right'), ('frames', 4)],
    # F3 western stacks: dark 0.7, two braziers lit by the player, the party's cool light
    'f3_stacks': [('flags', STORY_FLAGS), ('warp', ['archive_f3', 3, 12, 'up']), ('party', ['mira', 'bram']), ('frames', 90),
                  ('press', ['confirm', 1]), ('frames', 50)],
    'f3_great_door': [('flags', STORY_FLAGS), ('warp', ['archive_f3', 20, 24, 'up']), ('party', ['mira', 'bram']), ('frames', 120)],
    # PLAYTEST 7.4: Willowmere at night, lamps lit, windows glowing, fireflies in the gardens
    'night_square': [('flags', ['intro_done']), ('warp', ['willowmere', 22, 19, 'down']), ('party', ['mira', 'bram']),
                     ('tint', 'night'), ('frames', 200)],
    'night_bell_tower': [('flags', ['intro_done']), ('warp', ['willowmere', 23, 15, 'up']), ('tint', 'night'), ('frames', 200)],
    'dusk_lane': [('flags', ['intro_done']), ('warp', ['willowmere', 6, 20, 'down']), ('tint', 'dusk'), ('frames', 200)],
    'dusk_valley': [('flags', ['valley_arrived']), ('warp', ['valley', 10, 30, 'right']), ('tint', 'dusk'), ('frames', 220)],
    # C17: leaves, birds, chimney smoke, grass sway
    'valley_life': [('flags', ['valley_arrived']), ('warp', ['valley', 10, 30, 'right']), ('frames', 260), ('walk', 'up,up,up'), ('frames', 6)],
    'town_smoke': [('flags', ['intro_done']), ('warp', ['willowmere', 10, 20, 'up']), ('frames', 300)],
    'library_motes': [('flags', ['intro_done', 'met_mael', 'mira_joined']), ('warp', ['library', 6, 8, 'up']), ('frames', 200)],
    'pilgrim_note': [('flags', ['valley_arrived', 'saw_milestone']), ('warp', ['valley', 40, 26, 'up']), ('frames', 60), ('press', ['confirm', 1]), ('frames', 100)],
    'gameover': [('call', ['push', 'gameover']), ('frames', 200)],
}


def run_shot(lab, name, steps):
    for kind, arg in steps:
        if kind == 'flags':
            for f in arg:
                lab.call('setFlag', f, True)
        elif kind == 'warp':
            lab.warp(*arg)
        elif kind == 'party':
            lab.call('party', *arg)
            lab.frames(2)
        elif kind == 'call':
            lab.call(arg[0], *arg[1:])
        elif kind == 'tint':
            tint(lab, arg)
        elif kind == 'frames':
            lab.frames(arg)
        elif kind == 'walk':
            lab.walk(arg, False)
        elif kind == 'press':
            lab.press(arg[0], arg[1])
    return lab.shot(f'p_{name}')


def main(argv):
    ap = argparse.ArgumentParser()
    ap.add_argument('--only', default='')
    ap.add_argument('--device', default='desktop')
    a = ap.parse_args(argv)
    names = [n for n in a.only.split(',') if n] or list(SHOTS)
    lab = Lab(device=a.device)
    failed = 0
    try:
        lab.open('?debug=1&fps=0')
        for n in names:
            try:
                path = run_shot(lab, n, SHOTS[n])
                perf = lab.run('LQ_DEBUG.perf()')
                print(f'{n}: {path}  draw {perf.get("drawMs")} ms (max {perf.get("drawMaxMs")})', flush=True)
            except Exception as e:  # noqa: BLE001
                failed += 1
                print(f'{n}: FAILED {e}', flush=True)
        if lab.errors:
            failed += 1
            print('console errors:\n  ' + '\n  '.join(lab.errors[:10]))
    finally:
        lab.close()
    return 1 if failed else 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
