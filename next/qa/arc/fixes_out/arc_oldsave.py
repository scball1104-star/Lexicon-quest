"""H6-critic probe: an Episode 1 credits save made before H1 (qa/saves/fixtures/x1_ep1_credits_phone.json, no yard_fight_done)
is continued from the title and walks from home to the square. Does the H1 yard slime fire on a finished game?
python next/qa/arc/out/arc_oldsave.py --device phone"""
import argparse
import sys
import pathlib

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from arc_lib import NewPlayer, write_json, NEXT  # noqa: E402


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--device', default='phone')
    ap.add_argument('--save', default=str(NEXT / 'qa' / 'saves' / 'fixtures' / 'x1_ep1_credits_phone.json'))
    a = ap.parse_args()
    b = NewPlayer(a.device, speed=3, tag='-oldsave', resume=a.save, read=False)
    b.snap_rules = {'Something black and wet': 'oldsave-slime-narration', 'Good swing': 'oldsave-oren'}
    out = {}
    try:
        b.open()
        b.page.wait_for_function("LQ_DEBUG.scene() === 'title' && !LQ_DEBUG.state().transition", timeout=30000, polling=30)
        b.frames(30)
        out['title'] = b.scene_state()['ss'].get('ledger')
        b.snap('oldsave-title')
        b.title_continue(1)
        out['start'] = {'map': b.cur_map, 'flags_yard': b.flag('yard_fight_done'), 'level': b.game()['party'][0]['level']}
        b.through('home_exit')
        b.settle()
        b.walk_to([(20, 17)], label='toward the well')
        b.settle()
        out['after'] = {'yard_fight_done': b.flag('yard_fight_done'), 'battles': b.battles, 'boxes': [x['lines'] for x in b.boxes]}
        b.snap('oldsave-after')
    finally:
        out['errors'] = b.errors
        out['events'] = [e for e in b.events if e['kind'] in ('battle_start', 'battle_end', 'box')]
        write_json(f'{a.device}-arc-oldsave.json', out)
        b.close()
    print(out.get('title'), out.get('start'), out.get('after', {}).get('yard_fight_done'), out.get('after', {}).get('battles'))


if __name__ == '__main__':
    main()
