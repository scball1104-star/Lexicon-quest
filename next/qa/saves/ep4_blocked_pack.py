"""E4-fixes-A (PLAYTEST_REVIEW_6 fix 1, its s2b repro): an Episode 4 save loaded while the ep4 pack cannot be fetched never lands
in the developer test town and is never overwritten with "Test Town".

The Episode 3 credits save (qa/out/autoplay/<device>-ep3-credits-save.json, the autoplay's own) is edited to stand in
ep4_keep_f1 at (22, 26) with ep4_started set, seeded into record 1 and loaded through the title's Continue with every
request for the pack's code and maps refused. It must:

  1. never put the party on _testtown (sampled all through the wait),
  2. land on a real map (Emberpeak's east road end, the landing beside the Flood Road) with flags and levels intact,
  3. leave record 1 on ep4_keep_f1 (22, 26) after the landing and after the party walks onto another map,
  4. keep the field running with no console error beyond the refused requests.

    python qa/saves/ep4_blocked_pack.py [--device desktop|phone]

Needs nothing but a browser. Exit code 1 on any failure.
"""
import argparse
import json
import re
import sys
import time
import pathlib

HERE = pathlib.Path(__file__).resolve().parent
QA = HERE.parent
sys.path.insert(0, str(QA))
import autoplay as ap  # noqa: E402

SLOT = 'lq-next-slot-1'
SLOT_JS = f"(() => {{ try {{ const e = JSON.parse(localStorage.getItem('{SLOT}')); return e && e.data ? {{ map: e.data.map, pos: e.data.pos }} : null; }} catch (e) {{ return String(e); }} }})()"


def main(argv):
    a = argparse.ArgumentParser()
    a.add_argument('--device', default='phone')
    args = a.parse_args(argv)
    fix = ap.OUT / f'{args.device}-ep3-credits-save.json'
    g = json.loads(fix.read_text(encoding='utf-8'))
    g['map'] = 'ep4_keep_f1'
    g['pos'] = {'x': 22, 'y': 26, 'dir': 'up'}
    g['lastSafe'] = {'map': 'ep4_keep_f1', 'pos': {'x': 22, 'y': 26, 'dir': 'up'}}
    for f in ('ep4_started', 'ep4_morning_done'):
        g['flags'][f] = True
    save = ap.OUT / 'ep4-blocked-pack-save.json'
    save.write_text(json.dumps(g), encoding='utf-8')
    bot = ap.Bot(args.device, speed=2, resume=str(save), tag='-ep4-blocked-pack')
    state = {'refused': 0}

    def handler(route):
        state['refused'] += 1
        route.abort('failed')

    ok, detail = False, ''
    try:
        bot.page.route(re.compile(r'/src/data/ep4/|/src/data/maps/ep4_'), handler)
        bot.open()
        bot.page.wait_for_function("LQ_DEBUG.scene() === 'title' && !LQ_DEBUG.state().transition", timeout=30000, polling=30)
        bot.frames(10)
        before = bot.js(SLOT_JS)
        if not before or before.get('map') != 'ep4_keep_f1':
            raise ap.Fail(f'the seeded record is not on ep4_keep_f1: {before}')
        bot.title_continue(1)
        bot.resume = None
        seen, landed, t0 = set(), None, time.time()
        while time.time() - t0 < 45:
            m = bot.js('LQ_ENGINE.game ? LQ_ENGINE.game.map : null')
            if m:
                seen.add(m)
            if m == '_testtown':
                raise ap.Fail('the party stands in the developer test town')
            if m in ('emberpeak', 'valley') and bot.scene() == 'field':
                landed = bot.game()
                break
            bot.frames(15)
        if not landed:
            raise ap.Fail(f'no landing within 45 s (maps seen: {sorted(seen)})')
        print(f'  landed on {landed["map"]} at {landed["pos"]} after {time.time() - t0:.1f} s; maps seen {sorted(seen)}', flush=True)
        flags = bot.flags()
        if not flags.get('ep4_started') or not flags.get('ep3_complete'):
            raise ap.Fail('flags lost')
        bot.frames(120)
        after = bot.js(SLOT_JS)
        if not after or after.get('map') != 'ep4_keep_f1' or (after['pos']['x'], after['pos']['y']) != (22, 26):
            raise ap.Fail(f'record 1 changed after the landing: {after}')
        # walk on: warp to the inn (a door, as a player would), the first autosave the old code wrote over the run
        bot.js("LQ_DEBUG.warp('pk_inn', 17, 7, 'down')")
        bot.frames(120)
        walked = bot.js(SLOT_JS)
        print(f'  record 1 after the landing: {after}; after a map change: {walked}', flush=True)
        if walked and walked.get('map') == '_testtown':
            raise ap.Fail('record 1 now holds the test town')
        bot.errors = [e for e in bot.errors if 'ERR_FAILED' not in e and 'Failed to load resource' not in e and 'packs' not in e
                      and 'ep4' not in e and 'dynamically imported' not in e]
        bot.check_errors()
        ok = True
    except Exception as e:                                 # noqa: BLE001
        detail = f'{type(e).__name__}: {e}'
        try:
            bot.shot('ep4-blocked-pack-fail')
        except Exception:
            pass
    finally:
        bot.close()
    print('OK' if ok else f'FAIL {detail}', f'(requests refused: {state["refused"]})')
    return 0 if ok else 1


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
