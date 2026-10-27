"""H6-fixes probe: the yard slime's battle stage (item 21). A debug battle of `yard_slime` for a Lv 1 hero, one shot at the
first command. python next/qa/arc/fixes_out/fix_stage.py --device phone"""
import argparse
import sys
import pathlib

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from arc_lib import NewPlayer, write_json  # noqa: E402


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--device', default='phone')
    ap.add_argument('--tag', default='')
    a = ap.parse_args()
    b = NewPlayer(a.device, speed=3, tag='-stage' + a.tag, read=False)
    out = {}
    try:
        b.open()
        b.page.wait_for_function("LQ_DEBUG.scene() === 'title' && !LQ_DEBUG.state().transition", timeout=30000, polling=30)
        b.js("LQ_DEBUG.newGame('Arden', {scene: 'field', map: 'willowmere', pos: {x: 12, y: 15, dir: 'down'}, flags: {cold_open_done: 1, intro_done: 1, saw_fading_sign: 1}})")
        b.frames(120)
        b.js("LQ_DEBUG.settings({ autoBattle: false, battleSpeed: 1 })")
        b.js("LQ_DEBUG.battle('yard_slime', { level: 1, seed: 3 })")
        b.page.wait_for_function("LQ_DEBUG.state().battle && LQ_DEBUG.state().battle.menu && LQ_DEBUG.state().battle.menu !== 'closed'", timeout=30000, polling=30)
        b.frames(30)
        out['stage'] = b.js("LQ_DEBUG.state().battle.stage")
        b.snap('stage-yard')
    finally:
        out['errors'] = b.errors
        write_json(f'{a.device}-stage{a.tag}.json', out)
        b.close()
    print(out)


if __name__ == '__main__':
    main()
