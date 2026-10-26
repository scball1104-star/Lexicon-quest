"""X1 fix pass (PLAYTEST_REVIEW_X1 M4): a save made inside an x1 map never loads into the developer test town, even when the pack is blocked.

The Episode 1 credits fixture is edited to stand in x1_downs at (30, 16) with first_fight_done set, then loaded through the title's Continue
with every request for the pack's code and maps refused (a dead network). It must:

  1. never put the party on _testtown (sampled all through the wait),
  2. land on a real main-game map (the valley's west lane, a safe cell) once the bounded wait (about 8 s) gives up, with flags and levels intact,
  3. keep the game playable (the field runs, no console error beyond the refused requests),
  4. send the party back to x1_downs (30, 16) by itself once the block is lifted and the pack comes up.

    python qa/saves/x1_blocked_pack.py [--device desktop|phone]

Needs nothing but a browser. Exit code 1 on any failure.
"""
import argparse
import json
import pathlib
import re
import sys
import time

HERE = pathlib.Path(__file__).resolve().parent
QA = HERE.parent
sys.path.insert(0, str(QA))
sys.path.insert(0, str(QA / 'integrate'))
import autoplay as ap  # noqa: E402
import autoplay_x1  # noqa: E402

FIX = HERE / 'fixtures' / 'x1_ep1_credits_desktop.json'


def main(argv):
    a = argparse.ArgumentParser()
    a.add_argument('--device', default='desktop')
    args = a.parse_args(argv)
    g = json.loads(FIX.read_text(encoding='utf-8'))
    g['map'] = 'x1_downs'
    g['pos'] = {'x': 30, 'y': 16, 'dir': 'down'}
    g['lastSafe'] = {'map': 'x1_downs', 'pos': {'x': 30, 'y': 16, 'dir': 'down'}}
    g['flags']['first_fight_done'] = True
    save = ap.OUT / 'x1-blocked-pack-save.json'
    save.write_text(json.dumps(g), encoding='utf-8')
    bot = ap.Bot(args.device, speed=2, resume=str(save), tag='-blocked-pack', x1=True)
    state = {'block': True, 'refused': 0}

    def handler(route):
        if state['block']:
            state['refused'] += 1
            route.abort('failed')
        else:
            route.continue_()

    ok, detail = False, ''
    try:
        # the pack's code and maps (not live.js, which is part of the initial bundle)
        bot.page.route(re.compile(r'/src/data/x1/(?!live\.js)|/src/data/maps/x1_'), handler)
        bot.open()
        Route = autoplay_x1.build(ap)
        r = Route(bot, phases=[], resumed=True)
        r.title_to_bed()                                   # Continue: waits 1.5 s, then the field's own bounded wait
        bot.resume = None
        seen = set()
        t0 = time.time()
        landed = None
        while time.time() - t0 < 40:
            m = bot.js('LQ_ENGINE.game ? LQ_ENGINE.game.map : null')
            if m:
                seen.add(m)
            if m == '_testtown':
                raise ap.Fail('the party stands in the developer test town')
            if m == 'valley' and bot.scene() == 'field':
                landed = bot.game()
                break
            bot.frames(15)
        if not landed:
            raise ap.Fail(f'no landing on the valley within 40 s (maps seen: {sorted(seen)})')
        print(f'  landed on valley at {landed["pos"]} after {time.time() - t0:.1f} s; maps seen {sorted(seen)}', flush=True)
        if '_testtown' in seen:
            raise ap.Fail('_testtown was seen')
        flags = bot.flags()
        if not flags.get('first_fight_done') or not flags.get('ep1_complete'):
            raise ap.Fail('flags lost')
        if (landed['party'][0]['level'] or 0) < 2:
            raise ap.Fail('levels lost')
        safe = bot.js('LQ_ENGINE.game.lastSafe')
        if safe and safe.get('map') == '_testtown':
            raise ap.Fail('the safe point is the test town')
        bot.frames(120)                                    # the field runs
        print('  the field runs on the valley with the pack blocked', flush=True)
        # lift the block: the pack comes up (its retry), and the party goes back where the save left it
        state['block'] = False
        bot.js("LQ_PACKS.ensurePack('x1')")
        t1 = time.time()
        back = None
        while time.time() - t1 < 60:
            bot.frames(30)
            f = bot.js("({ map: LQ_ENGINE.game.map, ready: !!(window.LQ_PACKS && LQ_PACKS.packReady('x1')) })")
            if f['map'] == 'x1_downs':
                back = f
                break
        if not back:
            raise ap.Fail('the pack came up but the party did not go back to x1_downs')
        pos = bot.game()['pos']
        print(f'  back on x1_downs at ({pos["x"]}, {pos["y"]}) after {time.time() - t1:.1f} s', flush=True)
        if (pos['x'], pos['y']) != (30, 16):
            raise ap.Fail(f'back at {pos}, expected (30, 16)')
        bot.errors = [e for e in bot.errors if 'ERR_FAILED' not in e and 'Failed to load resource' not in e and 'packs' not in e]
        bot.check_errors()
        ok = True
    except Exception as e:                                 # noqa: BLE001
        detail = f'{type(e).__name__}: {e}'
        try:
            bot.shot('blocked-pack-fail')
        except Exception:
            pass
    finally:
        bot.close()
    print('OK' if ok else f'FAIL {detail}', f'(requests refused: {state["refused"]})')
    return 0 if ok else 1


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
