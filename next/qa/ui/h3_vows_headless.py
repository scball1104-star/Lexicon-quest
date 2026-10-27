"""H3-vows headless check (not part of node qa/run.mjs: one browser job, run by hand or by the H3 verify list).

On the desktop and phone profiles, in the real game (docs/VOWS.md):
  1. a clean load has no console or page errors;
  2. the rest flow at a Keeper's font: "Rest here?", the heal, then "Take a vow?" with "No vow" first and selected, then
     "Record your journey here?": with "No vow" the flow costs exactly ONE more confirm than before H3 and nothing else
     changes (the autoplay bot's generic handler picks index 0, so it is unchanged);
  3. choosing a vow shows its line and asks once; "Not this one" returns to the list; "Take the vow" sets game.vow;
  4. the menu's info box and the Journal's Quests header carry the line (screenshots for the eye);
  5. a kept-vow run: with "No fleeing" carried, three Archive F1 fights on Auto, then the next rest pays sword mastery +4
     (the kept box and Bram's line), and the vow is gone; a broken vow (Flee) shows the toast and settles to one line.

    python next/qa/ui/h3_vows_headless.py
    python next/qa/ui/h3_vows_headless.py --device phone
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
         'bram_joined': 1, 'left_town': 1, 'first_fight_done': 1, 'archive_entered': 1, 'archive_f1_done': 1,
         'echo_warden_defeated': 1, 'lantern_get': 1, 'archive_f2_done': 1, 'f1_arrived': 1, 'f2_arrived': 1, 'f3_arrived': 1}
# every one-shot companion remark is marked said, so no box but the rest flow's own opens at the font
SILENCE_BARKS = "(async () => { const T = await import('/next/src/data/text.js'); for (const k of Object.keys(T.BARKS)) LQ_ENGINE.game.counters['bark:' + k] = 1; return true; })()"
FIELD = "LQ_ENGINE.stack.find(s => s.name === 'field')"
GAME = 'LQ_ENGINE.game'
FONT = {'map': 'archive_f3', 'x': 23, 'y': 27, 'dir': 'up'}   # the tile under the F3 Keeper's font (22,26; 4 x 2), facing it


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
        path = OUT / f'{self.device}-h3-{name}.png'
        self.page.screenshot(path=str(path))
        return path

    def pick(self, index):
        """Choose a choice-box row the bot's way: down (verified) until the glove sits on it, then confirm."""
        for _ in range(12):
            d = self.dialog() or {}
            cur = d.get('choiceIndex') or 0
            if cur == index:
                break
            self.press('down' if cur < index else 'up', wait=3)
        self.confirm_box()

    def confirm_box(self):
        """Confirm the open box and make sure the press landed: the box must change (or close) within 12 frames, else press once more."""
        before = self.log_dialog_texts()
        for attempt in range(2):
            self.press('confirm', wait=2)
            for _ in range(6):
                self.frames(2)
                if self.ev('LQ_DEBUG.scene()') != 'dialog' or self.log_dialog_texts() != before:
                    return True
        return False

    def dialog(self):
        st = self.ev('LQ_DEBUG.state()')
        return st['sceneState'] if st['scene'] == 'dialog' else None

    def wait_dialog(self, frames=400):
        """Advance until a dialog is fully typed (choices open if it has them); returns its state."""
        for _ in range(frames // 4):
            self.frames(4)
            d = self.dialog()
            if d and d.get('done') and (not d.get('choices') or d.get('choiceIndex') is not None):
                self.frames(10)
                return self.dialog() or d
        raise AssertionError(f'no dialog settled (scene {self.ev("LQ_DEBUG.scene()")}, state {self.dialog()}, box {self.log_dialog_texts()})')

    def wait_field(self, frames=900):
        """Advance until the field is on top, unlocked, out of any transition, with no toast and the leader standing, for three
        checks in a row (the bot's settle rule); a stray plain box (no choices) is dismissed on the way."""
        calm = 0
        for _ in range(frames // 5):
            self.frames(5)
            sc = self.ev('LQ_DEBUG.scene()')
            if sc == 'field':
                st = self.ev("(() => { const F = " + FIELD + "; return !F.inputLocked && !LQ_ENGINE.transition && !(LQ_ENGINE.toasts && LQ_ENGINE.toasts.busy) && !F.loading && !F.pendingWarp && !(F.leader && F.leader.moving) && !(F.banner && F.banner.active); })()")
                calm = calm + 1 if st else 0
                if calm >= 3:
                    return True
                continue
            calm = 0
            if sc == 'dialog':
                d = self.dialog()
                if d and d.get('done') and not d.get('choices'):
                    self.press('confirm', wait=3)
        raise AssertionError(f'the field did not come back (scene {self.ev("LQ_DEBUG.scene()")}, box {self.log_dialog_texts()})')

    def start_at_font(self, extra_js=''):
        self.run("LQ_DEBUG.newGame('Arden', {scene: 'field', party: ['mira', 'bram'], level: 7, gold: 300, items: {potion: 4, ether: 2, lantern_of_recall: 1}, "
                 "gear: ['longsword', 'iron_pike', 'crystal_rod'], map: %r, pos: {x: %d, y: %d, dir: %r}, flags: %s, hp: 0.6, playtime: 7420})"
                 % (FONT['map'], FONT['x'], FONT['y'], FONT['dir'], json.dumps(FLAGS)))
        self.page.wait_for_function(FIELD + ' && !' + FIELD + '.loading && !!' + FIELD + '.map', timeout=20000)
        self.ev(SILENCE_BARKS)
        self.run(GAME + ".counters.battles = 2" + ('; ' + extra_js if extra_js else ''))
        self.frames(170)   # the location banner out
        self.wait_field()
        f = self.ev('LQ_DEBUG.fieldState()')
        return f

    def face_font(self):
        """Stand under the F3 font facing it (a battle or a scene may have turned or moved the leader)."""
        f = self.ev('LQ_DEBUG.fieldState()')
        if not (f and f.get('prompt') and f['prompt'].get('kind') == 'check'):
            self.run(FIELD + ".leader.face('up')")
            self.frames(3)
            f = self.ev('LQ_DEBUG.fieldState()')
        if not (f and f.get('prompt')):
            self.ev("LQ_DEBUG.warp(%r, %d, %d, %r)" % (FONT['map'], FONT['x'], FONT['y'], FONT['dir']))
            self.wait_field()
            self.frames(40)
            self.wait_field()
            f = self.ev('LQ_DEBUG.fieldState()')
        if not (f and f.get('prompt')):
            raise AssertionError(f'not facing the font: {f and f.get("leader")} prompt {f and f.get("prompt")}')

    def rest(self, log=None, device=''):
        """Interact with the font: its inspect box (one confirm), then "Rest here?" (confirm = Rest). Returns the presses used."""
        self.face_font()
        presses = 0
        self.press('confirm', wait=4); presses += 1          # interact
        d = self.wait_dialog()
        if not d.get('choices'):                               # the font's own line ("A Keeper's font...")
            self.confirm_box(); presses += 1
            d = self.wait_dialog()
        box = self.log_dialog_texts()
        if log is not None:
            check(box and box['text'] == 'Rest here?' and box['choices'] == ['Rest', 'Not now'] and box['index'] == 0, f'{device}: "Rest here?" first, Rest selected, as before', log)
        self.confirm_box(); presses += 1                       # Rest
        return presses

    def log_dialog_texts(self, n=3):
        return self.ev("(() => { const s = LQ_ENGINE.scene; return s && s.name === 'dialog' ? { text: s.box && s.box.text, choices: s.choices, index: s.choiceBox ? s.choiceBox.index : null } : null; })()")


def run_device(browser, base, device, log):
    rig = Rig(browser, base, device)
    files = []
    rig.boot()
    rig.frames(20)
    check(rig.ev('LQ_DEBUG.scene()') == 'title', f'{device}: boots to the title with no errors', log)

    # ---- 2. the rest flow with "No vow": one extra confirm, the save prompt still follows
    f = rig.start_at_font()
    check(f['map'] == 'archive_f3' and f['prompt'] and f['prompt']['kind'] == 'check', f'{device}: standing at the F3 font, facing it', log)
    presses = rig.rest(log, device)                   # the font's line, "Rest here?", Rest: three presses, as before H3
    d = rig.wait_dialog(900)                          # the heal toast runs its 70 frames, then the vow window
    box = rig.log_dialog_texts()
    check(box and box['text'] == 'Take a vow?', f'{device}: "Take a vow?" follows the heal (saw {box})', log)
    check(box['choices'][0] == 'No vow' and box['index'] == 0, f'{device}: "No vow" is first and selected ({box["choices"]})', log)
    check(box['choices'][1:] == ['No fleeing', 'No healing items', 'Walk the road', 'Mira stands', 'No Fury'], f'{device}: the five vows are offered', log)
    files.append(rig.shot('offer'))
    rig.confirm_box(); presses += 1                   # No vow: ONE press
    d = rig.wait_dialog()
    box = rig.log_dialog_texts()
    check(box and box['text'] == 'Record your journey here?' and box['choices'] == ['Save', 'Not now'], f'{device}: the save prompt follows at once (saw {box})', log)
    check(presses == 4, f'{device}: with "No vow" the flow to the save prompt is 4 presses: 3 as before H3 plus the one window ({presses})', log)
    rig.pick(1)                       # Not now
    rig.wait_field()
    check(rig.ev(GAME + '.vow') is None, f'{device}: no vow taken', log)
    hp = rig.ev("(() => { const m = LQ_ENGINE.game.party[0]; return [m.hp, m.mp]; })()")
    check(hp[0] > 0, f'{device}: rested ({hp})', log)

    # ---- 3. choosing a vow: its line, one confirm; "Not this one" returns to the list
    rig.rest()                                        # Rest again (no vow carried: the window shows again)
    d = rig.wait_dialog(900)
    box = rig.log_dialog_texts()
    check(box['text'] == 'Take a vow?', f'{device}: the window shows again at the next rest (saw {box})', log)
    rig.pick(1)                                                                         # No fleeing
    d = rig.wait_dialog()
    box = rig.log_dialog_texts()
    check(box['text'].startswith('Stand in every fight until you rest.') and box['choices'] == ['Take the vow', 'Not this one'], f'{device}: the vow\'s line and rule, asked once (saw {box})', log)
    files.append(rig.shot('confirm'))
    rig.pick(1)                                                         # Not this one -> back to the list
    d = rig.wait_dialog()
    box = rig.log_dialog_texts()
    check(box['text'] == 'Take a vow?', f'{device}: "Not this one" returns to the list (saw {box})', log)
    rig.pick(1)
    rig.wait_dialog(); rig.confirm_box()                                                # Take the vow
    d = rig.wait_dialog(900)                                                            # (the toast) then the save prompt
    box = rig.log_dialog_texts()
    check(box['text'] == 'Record your journey here?', f'{device}: after taking a vow the save prompt follows (saw {box})', log)
    rig.pick(1)
    rig.wait_field()
    vow = rig.ev(GAME + '.vow')
    check(vow and vow['id'] == 'no_flee' and vow['state'] == 'active', f'{device}: game.vow is No fleeing, active ({vow})', log)

    # ---- 4. the menu line and the Journal header
    rig.press('menu', wait=20)
    check(rig.ev('LQ_DEBUG.scene()') == 'menu', f'{device}: the menu opens', log)
    files.append(rig.shot('menu'))
    rig.press('cancel', wait=10)
    rig.run("LQ_DEBUG.engine.pushAwait('menu', {page: 'journal', instant: true})")
    rig.frames(8)
    check(rig.ev('LQ_DEBUG.state().sceneState.screen.tab') == 0, f'{device}: the Journal opens on Quests', log)
    files.append(rig.shot('journal'))
    rig.press('cancel', wait=6); rig.press('cancel', wait=10)
    rig.wait_field()

    # ---- 5a. a kept-vow run: three F1 fights on Auto, then the next rest pays
    rig.run("LQ_DEBUG.settings({ autoBattle: true, battleSpeed: 2 })")
    for enc in ['f1_slimes', 'f1_mites', 'f1_mixed']:
        rig.run("LQ_DEBUG.battle(%r)" % enc)
        for _ in range(900):
            rig.frames(10)
            if rig.ev('LQ_DEBUG.scene()') == 'battle' and rig.ev("LQ_DEBUG.state().battle && LQ_DEBUG.state().battle.phase") == 'rewards':
                rig.press('confirm', wait=6)
            if rig.ev('LQ_DEBUG.scene()') == 'field':
                break
        rig.wait_field()
        check(rig.ev(GAME + '.vow.state') == 'active', f'{device}: {enc} won on Auto, the vow holds', log)
    check(rig.ev(GAME + '.counters.battles') >= 5, f'{device}: three battles counted', log)
    before = rig.ev(GAME + '.party[0].mastery.sword')   # the fights themselves earn mastery; the vow pays on top at the rest
    rig.rest()
    d = rig.wait_dialog(900)
    box = rig.log_dialog_texts()
    check(box['text'].startswith('Vow kept: No fleeing.\nArden: sword mastery +4.'), f'{device}: the kept box pays sword mastery +4, naming a tech if the points unlock one (saw {box})', log)
    files.append(rig.shot('kept'))
    rig.confirm_box()
    d = rig.wait_dialog()
    box = rig.log_dialog_texts()
    check(box['text'] == 'Not one step back. I saw it. So did the road.', f'{device}: Bram\'s line follows (saw {box})', log)
    files.append(rig.shot('kept-line'))
    rig.confirm_box()
    d = rig.wait_dialog(900)
    check(rig.log_dialog_texts()['text'] == 'Take a vow?', f'{device}: then the offer', log)
    rig.confirm_box(); rig.wait_dialog(); rig.pick(1)
    rig.wait_field()
    after = rig.ev(GAME + '.party[0].mastery.sword')
    kept = rig.ev(GAME + '.vowsKept')
    check(after == before + 4 and kept == [{'id': 'no_flee', 'chapter': 1, 'paid': True}] and rig.ev(GAME + '.vow') is None,
          f'{device}: mastery {before} -> {after}, vowsKept {kept}, vow cleared', log)

    # ---- 5b. a broken vow: Flee under "No fleeing" shows the toast; the next rest says one line and pays nothing
    rig.run(GAME + ".vow = { id: 'no_flee', chapter: 1, battles: " + GAME + ".counters.battles, state: 'active', brokenBy: null }")
    rig.run("LQ_DEBUG.settings({ autoBattle: false, battleSpeed: 2 })")
    rig.run("LQ_DEBUG.battle('f1_slimes', { canFlee: true })")
    fled = False
    for _ in range(400):
        rig.frames(10)
        if rig.ev('LQ_DEBUG.scene()') != 'battle':
            break
        st = rig.ev('LQ_DEBUG.state().battle') or {}
        if st.get('phase') == 'play' and st.get('current') and rig.ev("LQ_ENGINE.scene.menu && LQ_ENGINE.scene.menu.state !== 'closed'"):
            rig.run("LQ_DEBUG.battleAct({ type: 'flee' })")
            fled = True
            rig.frames(10)
            if rig.ev(GAME + '.vow.state') == 'broken':
                break
    check(fled, f'{device}: a Flee command was issued', log)
    for _ in range(400):                      # the escape roll is 20 to 95 percent and rises 15 points per attempt
        if rig.ev(GAME + '.vow.state') == 'broken' or rig.ev('LQ_DEBUG.scene()') != 'battle':
            break
        if rig.ev('LQ_DEBUG.scene()') == 'battle' and rig.ev("LQ_ENGINE.scene.menu && LQ_ENGINE.scene.menu.state !== 'closed'"):
            rig.run("LQ_DEBUG.battleAct({ type: 'flee' })")
        rig.frames(10)
    check(rig.ev(GAME + '.vow.state') == 'broken' and rig.ev(GAME + '.vow.brokenBy') == 'flee', f'{device}: the escape broke the vow', log)
    files.append(rig.shot('broken-toast'))
    for _ in range(200):
        rig.frames(10)
        if rig.ev('LQ_DEBUG.scene()') == 'field':
            break
    rig.wait_field()
    check(rig.ev("(async () => { const V = await import('/next/src/game/vows.js'); return V.vowLine(LQ_ENGINE.game); })()") == 'Vow ended', f'{device}: the menu line reads "Vow ended" until the next rest', log)
    rig.press('menu', wait=20)
    files.append(rig.shot('menu-ended'))
    rig.press('cancel', wait=10)
    rig.run("LQ_DEBUG.engine.pushAwait('menu', {page: 'journal', instant: true})")
    rig.frames(8)
    files.append(rig.shot('journal-ended'))
    rig.press('cancel', wait=6); rig.press('cancel', wait=10)
    rig.wait_field()
    mastery = rig.ev(GAME + '.party[0].mastery.sword')
    rig.rest()
    d = rig.wait_dialog(900)
    box = rig.log_dialog_texts()
    check(box['text'] == "You ran. Fair enough. Some fights are tomorrow's. The vow's done, that's all.", f'{device}: one honest line, from Bram (saw {box})', log)
    files.append(rig.shot('broken-line'))
    rig.confirm_box()
    d = rig.wait_dialog(900)
    check(rig.log_dialog_texts()['text'] == 'Take a vow?', f'{device}: then the offer again', log)
    rig.confirm_box(); rig.wait_dialog(); rig.pick(1)
    rig.wait_field()
    check(rig.ev(GAME + '.party[0].mastery.sword') == mastery and len(rig.ev(GAME + '.vowsKept')) == 1 and rig.ev(GAME + '.vow') is None,
          f'{device}: a broken vow pays nothing and is cleared', log)
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
    timer = watchdog(600)   # the whole job is bounded: it exits non-zero if the browser hangs
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
    (OUT / 'h3_vows_headless.log').write_text('\n'.join(log + [f'FAIL {f}' for f in failed] + [f'wall {time.time() - t0:.1f}s']) + '\n', encoding='utf-8')
    print(f'{len(log)} checks ok, {len(failed)} failed, {time.time() - t0:.1f}s; shots: ' + ', '.join(str(f) for f in files))
    sys.exit(1 if failed else 0)


if __name__ == '__main__':
    main()
