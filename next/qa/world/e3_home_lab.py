"""Foundry F3, the Home (polish-world, PLAYTEST_REVIEW_5 #6): the order puzzle in the real game, every state shot at 3x.

    python next/qa/world/e3_home_lab.py                  # desktop
    python next/qa/world/e3_home_lab.py --device phone

States, in qa/world/out/e3_home_<device>_<n>_<state>.png (the 384x216 frame, 3x nearest):
  1 rest      the party at the entrance: the paddle spills at its feet, the plug and the lake glow, the crate in its slot
  2 wrong     shoved first: the crate stops at the foot of the molten plug; the next shove strains (nothing moves)
  3 cooled    the paddle turned by confirm: the plug is crust, the water runs on and sprays against the crate
  4 half      one more shove: the crate on the plug, the water foams at the corner, the lake still molten
  5 solved    the last shove: the crate in the corner, the water turns into the lake, which cools round the anvil
  6 reentry   down the stair to F2 and back mid-puzzle (after 3): plug crust kept, the paddle and the crate as authored
              (the save round trip itself is qa/world/e3_home.test.mjs)
Asserts each state through LQ_DEBUG; fails on any console error. Not in the gate (qa/world/e3_home.test.mjs is).
"""
import json
import sys
import pathlib

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from fieldlab import Lab  # noqa: E402

FIELD = 'LQ_ENGINE.stack.find(s => s.name === "field")'
AUTO_JS = ('window.__lqAuto && clearInterval(window.__lqAuto); window.__lqAuto = setInterval(() => { const s = LQ_DEBUG.scene(); '
           'if (s === "dialog" || s === "choice" || s === "titleCard") LQ_DEBUG.press("confirm", 1); }, 120)')
FLAGS = ['foundry_entered', 'foundry_f1_arrived', 'foundry_f1_done', 'foundry_f2_arrived', 'foundry_f2_done', 'foundry_f3_arrived',
         'lantern_get', 'bram_joined', 'mira_joined']
SHOTS = []


def fj(body):
    return f'(() => {{ const f = {FIELD}; {body} }})()'


def check(cond, msg):
    if not cond:
        raise AssertionError(msg)
    print('  ok', msg)


def q(lab):
    return lab.call('quench')


def crate(lab):
    return lab.run(fj('const e = f.entities.get("ore_home"); return [e.x, e.y];'))


def code(lab, x, y):
    return lab.run(fj(f'return f.map.codeAt({x}, {y});'))


def home_end(lab):
    return lab.run(fj('const r = f.quench.result; return r.streams.filter((s) => s.id === "sp_home").map((s) => [s.end.kind, s.end.x, s.end.y]);'))


def settle(lab):
    lab.page.wait_for_function(fj('return f.quench && f.quench.front.length === 0 && !f.inputLocked;'), timeout=20000, polling=50)
    lab.frames(10)


def quiet(lab):
    """No banner, no bark or box on screen (the auto-confirm clears boxes; barks are once a save)."""
    lab.page.wait_for_function(fj('return LQ_DEBUG.scene() === "field" && !f.banner.active && !(f.pendingBarks || []).length && !f.cutscene.running;'),
                               timeout=30000, polling=50)


def shot(lab, dev, n, name):
    quiet(lab)
    lab.frames(3)
    p = lab.shot(f'e3_home_{dev}_{n}_{name}')
    SHOTS.append(p)
    print('  shot', p)


def enter(lab):
    lab.warp('_testforge', 11, 7, 'left')          # a game exists after the first warp
    lab.run('LQ_ENGINE.game && (LQ_ENGINE.game.quenched = {}, LQ_ENGINE.game.opened = {})')
    for fl in FLAGS:
        lab.run(f'LQ_ENGINE.game.flags[{json.dumps(fl)}] = true')
    lab.warp('foundry_f3', 25, 26, 'down')
    lab.call('party', 'mira', 'bram')
    # the Home's one foe walks the row the crate is shoved from: keep it out of the frames
    lab.run(fj('for (const e of f.entities.values()) if (e.type === "enemy") { e.present = false; if (e.actor) f.removeActor(e.actor); } return true;'))
    lab.frames(6)
    lab.wait_idle(15000)
    quiet(lab)


def shove(lab):
    before = crate(lab)
    lab.run(fj('f.leader.face("up");'))
    lab.frames(2)
    lab.call('ability', 'shove')
    lab.page.wait_for_function(fj('return !f.entities.get("ore_home").data.sliding;'), timeout=15000, polling=50)
    lab.frames(50)
    settle(lab)
    return before != crate(lab)


def run(dev):
    lab = Lab(device=dev)
    failed = False
    try:
        lab.open()
        lab.run('LQ_DEBUG.setSpeed && LQ_DEBUG.setSpeed(2)')
        lab.run(AUTO_JS)
        enter(lab)
        settle(lab)
        # 1 rest
        check(home_end(lab) == [['splash', 25, 26]], f'rest: the paddle spills at the entrance {home_end(lab)}')
        check(code(lab, 22, 27) == 'water' and code(lab, 24, 28) == 'water', 'rest: the plug and the lake are molten')
        check(crate(lab) == [22, 29], 'rest: the crate in its slot')
        lab.call('goto', 27, 26, ms=60000)              # one step off the puddle, looking back at the paddle
        lab.run(fj('f.leader.face("left");'))
        shot(lab, dev, 1, 'rest')
        # 2 wrong order: shove first
        lab.call('goto', 22, 30, ms=60000)
        check(shove(lab), 'wrong: one shove moves the crate to the foot of the plug')
        check(crate(lab) == [22, 28], 'wrong: at (22,28)')
        lab.call('goto', 22, 29, ms=60000)
        lab.run(fj('f.leader.face("up");'))
        lab.frames(2)
        lab.call('ability', 'shove')
        lab.frames(24)
        lab.frames(3)
        SHOTS.append(lab.shot(f'e3_home_{dev}_2a_strain'))
        lab.frames(40)
        lab.wait_idle(15000)
        check(crate(lab) == [22, 28], 'wrong: the next shove strains; the crate stays off the molten plug')
        lab.call('goto', 20, 29, ms=60000)              # a step back: the crate at the foot of the glowing plug
        lab.run(fj('f.leader.face("right");'))
        shot(lab, dev, 2, 'wrong')
        # 3 cooled: turn the paddle the player's way (stand at the entrance, face it, confirm)
        lab.call('goto', 25, 26, ms=60000)
        lab.run(fj('f.leader.face("left");'))
        lab.frames(4)
        for _ in range(6):
            if lab.run(fj('return f.entities.get("sl_home").state;')) == 0:
                break
            lab.wait_idle(15000)
            lab.press('confirm', 1)
            lab.frames(30)
        check(lab.run(fj('return f.entities.get("sl_home").state;')) == 0, 'confirm turns sl_home')
        lab.frames(8)
        lab.run(fj('f.leader.face("down");'))
        lab.frames(10)
        shot(lab, dev, '3a', 'cooling')
        settle(lab)
        lab.frames(130)
        check(code(lab, 22, 27) == 'none', 'cooled: the plug is crust')
        check(home_end(lab) == [['splash', 22, 27]], f'cooled: the water sprays against the crate {home_end(lab)}')
        check(code(lab, 24, 28) == 'water', 'cooled: the lake is still molten')
        shot(lab, dev, 3, 'cooled')
        # 6 re-entry (mid-puzzle): the crust is kept; the paddle and the crate reset
        saved = lab.run('JSON.stringify({ quenched: LQ_ENGINE.game.quenched, opened: LQ_ENGINE.game.opened })')
        lab.warp('foundry_f2', 19, 17, 'down')
        lab.warp('foundry_f3', 25, 26, 'down')
        lab.run(fj('for (const e of f.entities.values()) if (e.type === "enemy") { e.present = false; if (e.actor) f.removeActor(e.actor); } return true;'))
        settle(lab)
        check(lab.run(fj('return f.entities.get("sl_home").state;')) == 1, 're-entry: the paddle is back as authored')
        check(crate(lab) == [22, 29], 're-entry: the crate is back in its slot')
        check(code(lab, 22, 27) == 'none', 're-entry: the plug stays crust')
        check(home_end(lab) == [['splash', 25, 26]], 're-entry: the water spills at the entrance again')
        check(json.loads(saved)['quenched'].get('foundry_f3'), 're-entry: the crust is in the save record')
        lab.run(fj('f.leader.face("down");'))
        shot(lab, dev, 6, 'reentry')
        # turn again, then the three shoves
        lab.call('turnSluice', 'sl_home')
        settle(lab)
        lab.call('goto', 22, 30, ms=60000)
        check(shove(lab), 'shove 1')
        lab.call('goto', 22, 29, ms=60000)
        check(shove(lab), 'shove 2: onto the cooled plug')
        check(crate(lab) == [22, 27], 'half: the crate on the plug')
        check(home_end(lab) == [['dam', 22, 27]], f'half: the water foams at the corner {home_end(lab)}')
        check(code(lab, 24, 28) == 'water', 'half: the lake still molten')
        shot(lab, dev, 4, 'half')
        lab.call('goto', 22, 28, ms=60000)
        check(shove(lab), 'shove 3: into the corner')
        check(crate(lab) == [22, 26], 'solved: the crate in the corner')
        lab.frames(14)
        shot(lab, dev, '5a', 'lake_cooling')
        settle(lab)
        lab.frames(130)
        check(code(lab, 24, 28) == 'none' and code(lab, 27, 29) == 'none', 'solved: the lake is crust')
        pos = lab.call('goto', 26, 28, ms=60000)
        check(pos == [26, 28], f'solved: the party walks to the anvil ({pos})')
        lab.run(fj('f.leader.face("left");'))
        shot(lab, dev, 5, 'solved')
        if lab.errors:
            print('CONSOLE ERRORS:')
            for e in lab.errors[:20]:
                print('  ', e)
            failed = True
    except Exception as e:  # noqa: BLE001
        failed = True
        print(f'  FAIL {dev}: {e}')
        try:
            lab.shot(f'e3_home_{dev}_fail')
        except Exception:
            pass
    finally:
        lab.close()
    return failed


def main(argv):
    dev = argv[argv.index('--device') + 1] if '--device' in argv else 'desktop'
    failed = run(dev)
    print('E3_HOME:', 'FAIL' if failed else 'PASS', json.dumps(SHOTS))
    return 1 if failed else 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
