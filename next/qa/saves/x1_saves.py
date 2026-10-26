"""X1-integrate: old saves meet the expansion in a real browser (docs/EXPANSION1_PLAN.md 12.1, docs/briefs/X1-integrate.md items 2 and 6).

Each fixture save in qa/saves/fixtures/x1_*.json (a finished Episode 1 save from before the expansion, an Archive F1 and F2 mid-run save, an
Episode 2 mid-Court save) is loaded through the title's Continue three ways:

  off    X1_LIVE as shipped (false): the save loads and plays, and the hub maps show none of the new doors
  on     the switch on (a local copy of live.js, served in memory): the save loads, the x1 pack comes up, and the party walks into the Downs and
         the Millrace and back (the arrival flags, the doors, the walk), with no console error
  fail   the switch on and the pack's entry module refused once (a network error): the save still loads and plays as Episode 1 did, the
         player is not blocked, and the retry brings the pack up a few seconds later
and newGameEp3's quick start loads and plays the same way.

    python qa/saves/x1_saves.py [--only credits_desktop,f1_mid] [--modes off,on,fail] [--device desktop|phone]

Needs nothing but a browser. Exit code 1 on any failure; a summary line per (save, mode) is printed.
"""
import argparse
import json
import pathlib
import sys
import time

HERE = pathlib.Path(__file__).resolve().parent
QA = HERE.parent
sys.path.insert(0, str(QA))
sys.path.insert(0, str(QA / 'integrate'))
import autoplay as ap  # noqa: E402
import autoplay_x1  # noqa: E402

FIX = HERE / 'fixtures'


def make_ep3(path):
    """newGameEp3's quick start as a save file (built by the game's own function in Node)."""
    import subprocess
    code = ("import('./src/game/state.js').then(m => { const g = m.newGameEp3('Arden'); process.stdout.write(JSON.stringify(g)); })")
    r = subprocess.run(['node', '-e', code], capture_output=True, text=True, timeout=60, cwd=str(QA.parent))
    if r.returncode != 0:
        raise SystemExit('newGameEp3: ' + r.stderr[-300:])
    path.write_text(r.stdout, encoding='utf-8')


def run_one(name, save, mode, device):
    on = mode in ('on', 'fail')
    bot = ap.Bot(device, speed=2, resume=str(save), tag=f'-saves-{mode}', x1=on)
    result = {'save': name, 'mode': mode, 'ok': False, 'detail': ''}
    try:
        if mode == 'fail':
            hits = {'n': 0}

            def handler(route):
                hits['n'] += 1
                if hits['n'] == 1:
                    route.abort('failed')
                else:
                    route.continue_()
            bot.page.route('**/src/data/x1/index.js*', handler)
        bot.open()
        Route = autoplay_x1.build(ap)
        r = Route(bot, phases=[], resumed=True)
        r.title_to_bed()                                  # Continue loads the save (awaiting the pack, at most 1.5 s)
        bot.resume = None
        f = r.ensure_any()
        g0 = bot.game()
        result['load'] = {'map': f['map'], 'level': g0['party'][0]['level']}
        flags = bot.flags()
        if mode == 'off':
            # the game plays as it did: nothing of the expansion is registered, the hub maps carry no new door
            ready = bot.js("!!(window.LQ_PACKS && LQ_PACKS.packReady('x1'))")
            if ready:
                raise ap.Fail('the x1 pack came up with the switch off')
            if f['map'] in ('valley', 'willowmere') and (bot.ent(f, 'x1_downs_door') or bot.ent(f, 'x1_west_gate')):
                raise ap.Fail('a new door exists with the switch off')
            bot.frames(120)
            r.note('off: loaded and ran 2 seconds with no new door and no pack')
        elif mode == 'on':
            r.wait_pack()
            home = (g0['map'], g0['pos']['x'], g0['pos']['y'], g0['pos'].get('dir') or 'down')
            try:
                gate = ('downs_arrived',) + (('millrace_arrived',) if flags.get('archive_f1_done') else ())
                r.arrivals(*gate)
                r.travel('x1_downs')
                bot.settle()
                r.travel('willowmere' if flags.get('ep1_complete') or flags.get('archive_f1_done') else 'valley')
                r.note('on: walked into the Downs' + (' and the Millrace' if 'millrace_arrived' in gate else '') + ' and back')
            except ap.Fail as e:
                # deep inside Episode 2 or 3 (the Court's gates, the inn): no door route on foot from here. The new maps still have to load and
                # play for this save's flags, so the party is warped in, walks to Brindle and the Millrace road, and is warped home.
                r.note(f'on: no walk from {f["map"]} ({str(e)[:60]}); warped in instead')
                for m, x, y, d in (('x1_downs', 54, 25, 'left'), ('x1_millrace', 23, 1, 'down'), ('x1_highmoor', 35, 34, 'up'), home):
                    bot.call('warp', m, x, y, d, ms=30000)
                    bot.frames(30)
                    ff = bot.settle()
                    if ff['map'] != m:
                        raise ap.Fail(f'warp to {m} landed on {ff["map"]}')
                    if m == 'x1_downs':
                        bot.walk_to([r.mark('x1_downs', 'brindle')], fight=True, label='Brindle')
                r.note('on: warped into the Downs, the Millrace and the moor and home again, walking in each')
        else:
            # the pack's entry module was refused once: the save plays unchanged, then the retry succeeds
            bot.frames(60)
            ready = bot.js("!!(window.LQ_PACKS && LQ_PACKS.packReady('x1'))")
            f = bot.settle()
            r.note(f'fail: loaded on {f["map"]}, pack ready right away: {ready}')
            t0 = time.time()
            while time.time() - t0 < 40 and not bot.js("!!(window.LQ_PACKS && LQ_PACKS.packReady('x1'))"):
                bot.frames(30)
            if not bot.js("!!(window.LQ_PACKS && LQ_PACKS.packReady('x1'))"):
                raise ap.Fail('the retry did not bring the pack up within 40 s')
            r.note('fail: the retry brought the pack up')
            st = bot.js("LQ_PACKS.packState('x1')")
            r.note(f'fail: pack state after the retry: ready {st.get("ready")}, errors recorded {len(st.get("errors") or [])}')
            bot.errors = [e for e in bot.errors if 'ERR_FAILED' not in e]       # the refused request is the test, the browser logs it
        bot.check_errors()
        result['ok'] = True
    except Exception as e:                                 # noqa: BLE001
        result['detail'] = f'{type(e).__name__}: {e}'
        try:
            bot.shot('saves-fail')
        except Exception:
            pass
    finally:
        result['notes'] = [n for n in bot.notes if n.startswith(('off:', 'on:', 'fail:'))]
        result['gameovers'] = bot.gameovers
        bot.close()
    return result


def main(argv):
    ap_ = argparse.ArgumentParser()
    ap_.add_argument('--only', default=None)
    ap_.add_argument('--modes', default='off,on,fail')
    ap_.add_argument('--device', default='desktop')
    a = ap_.parse_args(argv)
    saves = {p.stem.replace('x1_', '', 1): p for p in sorted(FIX.glob('x1_*.json'))}
    ep3 = ap.OUT / 'x1-newgameep3.json'
    make_ep3(ep3)
    saves['newGameEp3'] = ep3
    if a.only:
        want = a.only.split(',')
        saves = {k: v for k, v in saves.items() if k in want}
    results = []
    for name, path in saves.items():
        for mode in a.modes.split(','):
            print(f'-- {name} / {mode}', flush=True)
            res = run_one(name, path, mode, a.device)
            print(f'   {"ok" if res["ok"] else "FAIL"} {res.get("load")} {res.get("notes")} {res["detail"]}', flush=True)
            results.append(res)
    out = ap.OUT / f'{a.device}-saves-report.json'
    out.write_text(json.dumps(results, indent=1), encoding='utf-8')
    bad = [r for r in results if not r['ok']]
    print(f'{len(results) - len(bad)} of {len(results)} ok; report {out}')
    return 1 if bad else 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
