"""H2-ledger headless check (not part of node qa/run.mjs: one browser job, run by hand or by the H2 verify list).

On the desktop and phone profiles, in the real game:
  1. a clean load has no console or page errors;
  2. the Journal's Ledger tab opens, the glove skips the place headers, the detail reads the kept line, and the
     counter in its header matches namesKept of the game's flags;
  3. the title shows "Names kept: N of M" only once a save exists, and its number matches the slot;
  4. the Aim line shows after the menu closes, is hidden while a cutscene runs and while a battle is on top, and is
     gone again about four seconds after it showed.

    python next/qa/ui/h2_ledger_headless.py
    python next/qa/ui/h2_ledger_headless.py --device phone
"""
import argparse
import json
import pathlib
import sys
import time

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))
from shots import start_server, watchdog, new_page  # noqa: E402

OUT = HERE / 'out'
SPEC = json.loads((HERE.parent / 'shots.json').read_text(encoding='utf-8'))
DEVICES = SPEC['devices']
READY = "LQ_DEBUG.engine.hasScene('menu') && LQ_DEBUG.commands().includes('newGame')"
FLAGS = {'cold_open_done': 1, 'intro_done': 1, 'saw_fading_sign': 1, 'yard_fight_done': 1, 'met_mael': 1, 'mira_joined': 1,
         'bram_joined': 1, 'hazel_farewell_done': 1, 'wick_quest_started': 1, 'wick_tag_found': 1, 'wick_tag_done': 1}
FIELD = "LQ_ENGINE.stack.find(s => s.name === 'field')"


def check(cond, msg, log):
    if not cond:
        raise AssertionError(msg)
    log.append(msg)
    print('  ok', msg, flush=True)


class Rig:
    def __init__(self, browser, base, device):
        dev = DEVICES[device]
        self.device, self.base = device, base
        self.ctx = browser.new_context(viewport={'width': dev['width'], 'height': dev['height']}, device_scale_factor=dev.get('dpr', 1),
                                       is_mobile=dev.get('mobile', False), has_touch=dev.get('touch', False), reduced_motion='no-preference')
        self.ctx.set_default_timeout(20000)
        self.errors = []
        self.page = None

    def boot(self, storage=None):
        if self.page:
            self.page.close()
        self.page, errs = new_page(self.ctx, {'storage': storage or {}})
        ignore = SPEC.get('ignoreConsole', [])
        self.page.on('console', lambda m: self.errors.append(m.text) if m.type == 'error' and not any(p in m.text for p in ignore) else None)
        self.page.on('pageerror', lambda ex: self.errors.append(str(ex)))
        self.page.goto(self.base, wait_until='load')
        self.page.evaluate('Promise.race([LQ_DEBUG.ready(), new Promise((_, no) => setTimeout(() => no(new Error("ready timeout")), 20000))])')
        self.page.wait_for_function(READY, timeout=20000)
        return self.page

    def ev(self, js):
        return self.page.evaluate(js)

    def run(self, js):
        return self.page.evaluate('(() => { ' + js + '; return true; })()')

    def frames(self, n):
        self.page.evaluate(f'LQ_DEBUG.advance({n})')

    def press(self, action, n=1, wait=6):
        self.page.evaluate('([a, n]) => LQ_DEBUG.press(a, n)', [action, n])
        self.frames(wait)

    def shot(self, name):
        OUT.mkdir(parents=True, exist_ok=True)
        path = OUT / f'{self.device}-h2-{name}.png'
        self.page.screenshot(path=str(path))
        return path


def run_device(browser, base, device, log):
    rig = Rig(browser, base, device)
    files = []
    # 1. a clean load, title with no save: no counter
    rig.boot()
    rig.frames(30)
    st = rig.ev('LQ_DEBUG.state()')
    check(st['scene'] == 'title', f'{device}: boots to the title', log)
    check(st['sceneState'].get('ledger') is None, f'{device}: no save, no counter', log)

    # 2. the Ledger tab in a mid-game
    rig.run("LQ_DEBUG.newGame('Arden', {scene: 'field', party: ['mira', 'bram'], level: 6, map: 'willowmere', pos: {x: 22, y: 12, dir: 'down'}, flags: %s})" % json.dumps(FLAGS))
    # the map loads over real time (module imports): wait for it, then run the location banner out
    rig.page.wait_for_function(FIELD + ' && !' + FIELD + '.loading && !!' + FIELD + '.map', timeout=20000)
    rig.frames(170)
    check(rig.ev(FIELD + '.banner.active') is False, f'{device}: the location banner has gone', log)
    expected = rig.ev("(async () => { const L = await import('/next/src/data/ledger.js'); return L.namesKept(LQ_ENGINE.game.flags); })()")
    step = rig.ev("(async () => { const Q = await import('/next/src/data/quests.js'); const has = (f) => !!LQ_ENGINE.game.flags[f]; return Q.currentStep(has, Q.mainQuestFor(has)).title; })()")
    rig.run("LQ_DEBUG.engine.pushAwait('menu', {page: 'journal', instant: true})")
    rig.frames(6)
    rig.press('pageL', wait=4)
    ss = rig.ev('LQ_DEBUG.state().sceneState')
    check(ss['screen']['tab'] == 2, f'{device}: pageL from Quests opens the Ledger tab', log)
    led = ss['screen']['ledger']
    check(led['name'] == 'hero', f'{device}: the glove starts on the hero\'s own name (the first header is skipped)', log)
    check(led['kept'] == expected['kept'] and led['total'] == expected['total'], f'{device}: header count {led["kept"]} of {led["total"]} matches namesKept', log)
    for _ in range(3):
        rig.press('down', wait=3)
    led = rig.ev('LQ_DEBUG.state().sceneState.screen.ledger')
    check(led['name'] == 'hazel', f'{device}: three downs skip the Willowmere header and land on Hazel', log)
    files.append(rig.shot('ledger'))
    # scroll to the end and back without an error; cancel closes the screen, then the menu
    for _ in range(60):
        rig.press('down', wait=1)
    led = rig.ev('LQ_DEBUG.state().sceneState.screen.ledger')
    check(led['scroll'] > 0, f'{device}: the list scrolled ({led["scroll"]})', log)
    files.append(rig.shot('ledger-end'))
    rig.press('cancel', wait=6)
    check(rig.ev('LQ_DEBUG.state().sceneState.screen') is None, f'{device}: cancel leaves the Ledger tab', log)
    rig.press('cancel', wait=10)
    check(rig.ev('LQ_DEBUG.scene()') == 'field', f'{device}: cancel closes the menu', log)
    check(rig.ev('LQ_DEBUG.state().sceneState.aim') is None, f'{device}: a menu pushed from outside the field (debug) shows no Aim line', log)

    # 4. the Aim line: after the menu the PLAYER opened closes, then hidden in a scene and under a battle
    rig.press('menu', wait=20)
    check(rig.ev('LQ_DEBUG.scene()') == 'menu', f'{device}: the menu button opens the menu', log)
    rig.press('cancel', wait=10)
    aim = rig.ev('LQ_DEBUG.state().sceneState.aim')
    check(aim == step, f'{device}: the Aim line shows the main step after the menu closes ({aim})', log)
    files.append(rig.shot('aim'))
    rig.frames(260)
    check(rig.ev('LQ_DEBUG.state().sceneState.aim') is None, f'{device}: the Aim line is gone after about four seconds', log)
    rig.press('menu', wait=20)
    rig.press('cancel', wait=10)
    check(rig.ev('LQ_DEBUG.state().sceneState.aim') == step, f'{device}: it shows again after the next menu close', log)
    rig.run(FIELD + ".cutscene.running = 'fake_scene'")
    check(rig.ev(FIELD + '.aimShown') is False, f'{device}: hidden while a cutscene runs', log)
    rig.run(FIELD + '.cutscene.running = false')
    check(rig.ev(FIELD + '.aimShown') is True, f'{device}: back once the scene lets go (the timer waited)', log)
    rig.run("LQ_DEBUG.battle('valley_wolves')")
    rig.frames(30)
    check(rig.ev('LQ_DEBUG.scene()') == 'battle', f'{device}: a battle is on top', log)
    check(rig.ev(FIELD + '.aimShown') is False, f'{device}: hidden under the battle', log)
    files.append(rig.shot('aim-battle'))

    # 3. the title with a save: the counter reads the slot
    env = {'v': 1, 'savedAt': '2026-10-26T12:00:00.000Z', 'meta': {'name': 'Arden', 'level': 6, 'map': 'willowmere'},
           'data': {'v': 1, 'heroName': 'Arden', 'map': 'willowmere', 'flags': FLAGS}}
    rig.boot({'lq-next-slot-2': env})
    rig.frames(30)
    st = rig.ev('LQ_DEBUG.state().sceneState')
    check(st['ledger'] and st['ledger']['slot'] == 2 and st['ledger']['kept'] == expected['kept'], f'{device}: the title counter reads slot 2 ({st["ledger"]})', log)
    files.append(rig.shot('title'))
    check(not rig.errors, f'{device}: no console or page errors ({rig.errors[:3]})', log)
    rig.ctx.close()
    return files


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--device', default='desktop,phone')
    args = ap.parse_args()
    from playwright.sync_api import sync_playwright
    server = start_server()
    base = f'http://127.0.0.1:{server.server_port}/next/index.html?debug=1&fps=0'
    log, files, failed = [], [], []
    timer = watchdog(420)   # the whole job is bounded: it exits non-zero if the browser hangs
    t0 = time.time()
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True, args=['--autoplay-policy=no-user-gesture-required'])
            for device in args.device.split(','):
                try:
                    files += run_device(browser, base, device, log)
                except Exception as ex:   # noqa: BLE001
                    failed.append(f'{device}: {ex}')
                    print('  FAIL', device, ex, flush=True)
            browser.close()
    finally:
        timer.cancel()
        server.shutdown()
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / 'h2_ledger_headless.log').write_text('\n'.join(log + [f'FAIL {f}' for f in failed] + [f'wall {time.time() - t0:.1f}s']) + '\n', encoding='utf-8')
    print(f'{len(log)} checks ok, {len(failed)} failed, {time.time() - t0:.1f}s; shots: ' + ', '.join(str(f) for f in files))
    sys.exit(1 if failed else 0)


if __name__ == '__main__':
    main()
