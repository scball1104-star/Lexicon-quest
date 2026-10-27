"""H6-fixes probe: the Aim line on Archive F3 once the Stacks Key is found (item 14), with a vow carried (item 25).
python next/qa/arc/fixes_out/fix_aim.py --device phone"""
import argparse
import json
import sys
import pathlib

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from arc_lib import NewPlayer, write_json, FIELD  # noqa: E402

FLAGS = {f: 1 for f in ['cold_open_done', 'intro_done', 'saw_fading_sign', 'yard_fight_done', 'met_mael', 'mira_joined', 'bram_joined',
                        'left_town', 'first_fight_done', 'archive_entered', 'archive_f1_done', 'echo_warden_defeated', 'lantern_get',
                        'archive_f2_done', 'f1_arrived', 'f2_arrived', 'f3_arrived']}
DRAWN = "(() => { const f = " + FIELD + "; return f.aimShown ? f.aim.title : null; })()"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--device', default='phone')
    a = ap.parse_args()
    b = NewPlayer(a.device, speed=3, tag='-aim', read=False)
    out = {}
    try:
        b.open()
        b.page.wait_for_function("LQ_DEBUG.scene() === 'title' && !LQ_DEBUG.state().transition", timeout=30000, polling=30)
        b.js("LQ_DEBUG.newGame('Arden', {scene: 'field', party: ['mira', 'bram'], level: 7, map: 'archive_f3', pos: {x: 23, y: 27, dir: 'up'}, flags: %s})" % json.dumps(FLAGS))
        b.page.wait_for_function(FIELD + ' && !' + FIELD + '.loading && !!' + FIELD + '.map', timeout=20000)
        b.settle(); b.frames(200); b.settle()
        for case, js in (('no-key', ''), ('key', "LQ_ENGINE.game.flags.stacks_key_found = true"),
                         ('key-vow', "LQ_ENGINE.game.vow = { id: 'no_flee', chapter: 1, battles: 0, state: 'active', brokenBy: null }")):
            if js:
                b.js(js)
            b.frames(30)
            b.open_menu(); b.close_menu(); b.frames(20)
            out[case] = {'step': b.js(DRAWN), 'aim': b.js("(async () => { const Q = await import('/next/src/data/quests.js'); const has = (f) => !!LQ_ENGINE.game.flags[f]; return Q.aimFor(Q.currentStep(has, Q.mainQuestFor(has)), has); })()")}
            b.snap(f'aim-{case}')
    finally:
        out['errors'] = b.errors
        write_json(f'{a.device}-aim.json', out)
        b.close()
    print(out)


if __name__ == '__main__':
    main()
