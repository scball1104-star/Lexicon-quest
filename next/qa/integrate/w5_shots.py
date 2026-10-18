"""W5-systems verification shots: the equip prompt, legendary and rare toasts, the Lantern prompt (and the touch
Lantern button), battle touch rows and the Auto / Speed hint, the touch game-over menu, the font's rest flow and
the pit tell. Drives the real scenes headlessly on the desktop and phone profiles, asserts state, saves PNGs
(native and 3x nearest) to next/qa/integrate/out/, and fails on any console or page error.

    python next/qa/integrate/w5_shots.py                 every shot, both devices
    python next/qa/integrate/w5_shots.py --only equip_prompt,lantern_prompt --device phone
"""
import argparse
import base64
import io
import json
import pathlib
import sys
import time

HERE = pathlib.Path(__file__).resolve().parent
QA = HERE.parent
sys.path.insert(0, str(QA))
import shots  # noqa: E402

OUT = HERE / 'out'
DEVICES = {
    'desktop': dict(viewport={'width': 1920, 'height': 1080}, device_scale_factor=1),
    'phone': dict(viewport={'width': 844, 'height': 390}, device_scale_factor=3, is_mobile=True, has_touch=True),
}
PARTY = "party: ['mira', 'bram'], level: 6, gold: 300, items: { potion: 3, ether: 2 }, flags: { intro_done: 1, mira_joined: 1, bram_joined: 1, left_town: 1, archive_entered: 1 }"


class Lab:
    def __init__(self, device):
        from playwright.sync_api import sync_playwright
        from PIL import Image
        self.Image = Image
        self.device = device
        self.touch = DEVICES[device].get('has_touch', False)
        self.pw = sync_playwright().start()
        self.server = shots.start_server()
        self.browser = self.pw.chromium.launch(headless=True)
        self.ctx = self.browser.new_context(**DEVICES[device])
        self.ctx.set_default_timeout(30000)
        self.page = self.ctx.new_page()
        self.errors = []
        self.page.on('console', lambda m: self.errors.append(f'console.error: {m.text}') if m.type == 'error' and 'status of 404' not in m.text else None)
        self.page.on('pageerror', lambda e: self.errors.append(f'pageerror: {e}'))
        self.files = []
        OUT.mkdir(parents=True, exist_ok=True)

    def open(self):
        self.page.goto(f'http://127.0.0.1:{self.server.server_port}/next/index.html?debug=1&fps=0', wait_until='load')
        self.page.wait_for_function('window.LQ_DEBUG && true', timeout=30000)
        self.page.evaluate('Promise.race([LQ_DEBUG.ready(), new Promise((_, no) => setTimeout(() => no(new Error("ready timeout")), 30000))])')
        self.js("LQ_DEBUG.settings({ textSpeed: 4, battleSpeed: 1, autoBattle: false, equipPrompts: true })")
        if self.touch:
            self.js("LQ_ENGINE.input._setDevice('touch')")
        return self

    def js(self, expr):
        return self.page.evaluate(expr)

    def fire(self, expr):
        """Start an async game call without awaiting it (a promise that waits for input would deadlock evaluate)."""
        return self.page.evaluate(f'(() => {{ Promise.resolve({expr}).catch((e) => console.error("[w5] " + (e && e.message))); return true; }})()')

    def call(self, name, *args, ms=30000):
        return self.page.evaluate(shots.CALL_JS, [name, list(args), ms])

    def frames(self, n, timeout=20000):
        start = self.js('LQ_ENGINE.frame')
        self.page.wait_for_function(f'LQ_ENGINE.frame >= {start + int(n)}', timeout=timeout, polling=10)

    def press(self, action, frames=1, wait=6):
        self.js(f'LQ_DEBUG.press({json.dumps(action)}, {int(frames)})')
        self.frames(wait)

    def tap(self, gx, gy, wait=8):
        x, y = shots.game_to_css(self.page, gx, gy)
        if self.touch:
            self.page.touchscreen.tap(x, y)
        else:
            self.page.mouse.click(x, y)
        self.frames(wait)

    def wait_scene(self, name, ms=20000):
        self.page.wait_for_function(f"LQ_DEBUG.scene() === {json.dumps(name)}", timeout=ms, polling=16)

    def next_choice(self, tries=40):
        """Confirm through plain dialog boxes (barks, lines) until a choice box is open; returns its state or None."""
        for _ in range(tries):
            sc = self.js('LQ_DEBUG.scene()')
            if sc == 'dialog':
                st = self.js("(() => { const s = LQ_ENGINE.scene; return { open: !!(s.choiceBox && s.choiceBox.anim.isOpen), choices: !!s.choices, typing: s.typing }; })()")
                if st['open']:
                    self.frames(2)
                    return self.js('LQ_DEBUG.state().sceneState')
                if not st['choices']:
                    self.press('confirm', 1, 6)
                    continue
            self.frames(6)
        return None

    def wait_choice(self, ms=20000):
        """Wait for a dialog whose choice box has finished opening (a press during the 5-frame open is lost)."""
        self.page.wait_for_function("(() => { const s = LQ_ENGINE.scene; return !!s && s.name === 'dialog' && !!s.choiceBox && s.choiceBox.anim.isOpen; })()", timeout=ms, polling=16)
        self.frames(2)
        return self.js('LQ_DEBUG.state().sceneState')

    def wait_field_idle(self, ms=30000):
        self.page.wait_for_function("(() => { const f = LQ_ENGINE.stack.find(s => s.name === 'field'); const st = LQ_DEBUG.state(); return !!f && !!f.map && !f.loading && !st.transition && !f.inputLocked && !f.pendingWarp && f.leader && !f.leader.moving && LQ_DEBUG.scene() === 'field'; })()", timeout=ms, polling=16)

    def new_field(self, map_id, x, y, d='down', extra=''):
        self.js(f"LQ_DEBUG.newGame('Arden', {{ scene: 'field', map: {json.dumps(map_id)}, pos: {{ x: {x}, y: {y}, dir: {json.dumps(d)} }}, {PARTY}{extra} }})")
        self.page.wait_for_function(f"(() => {{ const f = LQ_ENGINE.stack.find(s => s.name === 'field'); return !!f && !!f.map && f.map.id === {json.dumps(map_id)} && !f.loading && !LQ_DEBUG.state().transition; }})()", timeout=30000, polling=16)
        self.frames(30)
        # settle the arrival scene and the late first-time barks (first_dark_room fires 40 frames after load)
        for _ in range(2):
            self.settle_dialogs()
            self.frames(50)
        self.settle_dialogs()
        self.frames(4)

    def settle_dialogs(self):
        for _ in range(200):
            sc = self.js('LQ_DEBUG.scene()')
            if sc == 'field' and self.js("(() => { const f = LQ_ENGINE.scene; return !f.inputLocked && !f.cutscene.running && !f.pendingBarks.length; })()"):
                return
            if sc in ('dialog', 'choice', 'titleCard'):
                self.press('confirm', 1, 4)
            else:
                self.frames(4)

    def shot(self, name, scale=3):
        data = self.js('LQ_ENGINE.renderer.canvas.toDataURL("image/png")')
        raw = base64.b64decode(data.split(',', 1)[1])
        im = self.Image.open(io.BytesIO(raw)).convert('RGB')
        p1 = OUT / f'{self.device}-{name}_x1.png'
        im.save(p1)
        p = OUT / f'{self.device}-{name}.png'
        im.resize((im.width * scale, im.height * scale), self.Image.NEAREST).save(p)
        self.files.append(str(p))
        return str(p)

    def page_shot(self, name):
        p = OUT / f'{self.device}-{name}_page.png'
        self.page.screenshot(path=str(p))
        self.files.append(str(p))
        return str(p)

    def close(self):
        for fn in (self.ctx.close, self.browser.close, self.pw.stop, self.server.shutdown):
            try:
                fn()
            except Exception:
                pass


def check(cond, msg):
    if not cond:
        raise AssertionError(msg)


# ------------------------------------------------------------------------------------------------ shots
def equip_prompt(L):
    L.new_field('archive_f1', 4, 4)
    L.fire("LQ_ENGINE.scene.giveItem('iron_pike')")
    L.frames(20)
    L.shot('toast_common')
    ss = L.wait_choice()
    check(ss and ss.get('choices') == ['Yes', 'Later'], f'Iron Pike prompt choices {ss and ss.get("choices")}')
    check('Iron Pike on Bram' in L.js('LQ_ENGINE.scene.text'), 'prompt names Bram and the pike')
    L.shot('equip_prompt')
    L.press('confirm', 1, 6)                      # Yes
    L.frames(30)
    L.shot('equip_toast')
    g = L.js('LQ_ENGINE.game')
    bram = next(m for m in g['party'] if m['id'] == 'bram')
    check(bram['equip']['spear']['base'] == 'iron_pike', 'Bram wears the pike')
    check(not any(x.get('base') == 'iron_pike' for x in g['gear']), 'the pike left the bag')
    L.wait_field_idle()
    # two eligible: Chain Shirt (hero and Bram): the choice lists both names then Later
    L.fire("LQ_ENGINE.scene.giveItem('chain_shirt')")
    ss = L.wait_choice()
    check(ss.get('choices') == ['Arden', 'Bram', 'Later'], f'Chain Shirt prompt choices {ss.get("choices")}')
    L.shot('equip_prompt_two')
    L.press('cancel', 1, 6)                       # Later
    L.wait_field_idle()
    g = L.js('LQ_ENGINE.game')
    check(any(x.get('base') == 'chain_shirt' for x in g['gear']), 'Later keeps the shirt in the bag')
    # a downgrade never prompts; a switched-off setting never prompts
    L.fire("LQ_ENGINE.scene.giveItem('cloth_tunic')")
    L.frames(120)
    check(L.js('LQ_DEBUG.scene()') == 'field', 'a Cloth Tunic beats nothing anyone wears: no prompt')


def equip_prompt_off(L):
    L.new_field('archive_f1', 4, 4)
    L.js("LQ_DEBUG.settings({ equipPrompts: false })")
    L.fire("LQ_ENGINE.scene.giveItem('iron_pike')")
    L.frames(130)
    check(L.js('LQ_DEBUG.scene()') == 'field', 'no prompt while equipPrompts is off')
    L.js("LQ_DEBUG.settings({ equipPrompts: true })")


def legendary_toast(L):
    L.new_field('archive_f3', 20, 24)
    L.fire("LQ_ENGINE.scene.giveItem('lanternheart')")
    L.frames(26)
    L.shot('toast_legendary')
    L.frames(30)
    L.shot('toast_legendary_late')
    L.wait_choice()
    check('Lanternheart on Arden' in L.js('LQ_ENGINE.scene.text'), 'the legendary is offered to the hero')
    L.press('confirm', 1, 6)
    L.frames(20)
    L.shot('toast_legendary_equipped')
    L.wait_field_idle()
    # a rare drop: rarity-colored name, no beam
    L.fire("(async () => { const { rollItem } = await import('./src/battle/loot.js'); const { createRng } = await import('./src/core/rng.js'); const it = rollItem(createRng(5), { ilvl: 7, rarity: 'rare', base: 'iron_helm' }); LQ_ENGINE.scene.giveGear(it); })()")
    L.frames(26)
    L.shot('toast_rare')
    L.wait_choice()
    L.press('cancel', 1, 6)
    L.wait_field_idle()


def lantern_prompt(L):
    # F2, beside the pedestal: the faint ink bridge west of the hub lies within two tiles
    L.new_field('archive_f2', 7, 13, 'right', ", items: { lantern_of_recall: 1, potion: 2 }")
    L.js("(() => { const f = LQ_ENGINE.scene; f.setFlag('echo_warden_defeated'); f.setFlag('lantern_get'); })()")
    L.frames(30)
    spots = L.js("(() => { const m = LQ_ENGINE.scene.map; const out = []; for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) if (m.idsAt(x, y).some(id => /_faint$/.test(id))) out.push([x, y]); return out; })()")
    check(spots, 'F2 has faint ink')
    # stand two tiles from the nearest faint cell, on open floor
    best = L.js("(() => { const f = LQ_ENGINE.scene, m = f.map; const faint = []; for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) if (m.idsAt(x, y).some(id => /_faint$/.test(id))) faint.push([x, y]); "
                "for (const [fx, fy] of faint) for (const [dx, dy] of [[-2, 0], [2, 0], [0, -2], [0, 2], [-1, 0], [1, 0]]) { const x = fx + dx, y = fy + dy; if (m.inBounds(x, y) && !m.blockedAt(x, y) && m.codeAt(x, y) === 'none' && !m.idsAt(x, y).some(id => /_faint$/.test(id))) return [x, y, fx, fy]; } return null; })()")
    check(best, 'a floor tile within two tiles of faint ink')
    L.call('warp', 'archive_f2', best[0], best[1], 'left')
    L.wait_field_idle()
    L.frames(30)
    st = L.js('LQ_DEBUG.state().sceneState')
    check(st.get('lanternHint') is True, f'lanternHint on at {best}: {st.get("lanternHint")}')
    L.shot('lantern_prompt')
    if L.touch:
        # the on-canvas Lantern button raises the Lantern
        L.tap(322 + 29, 128 + 9, 10)
        st = L.js('LQ_DEBUG.state().sceneState')
        check(st.get('lantern', 0) > 0, 'the Lantern button raised the Lantern')
        L.frames(12)
        L.shot('lantern_button_tapped')
    else:
        L.press('pageR', 1, 12)
        st = L.js('LQ_DEBUG.state().sceneState')
        check(st.get('lantern', 0) > 0, 'pageR raised the Lantern')
    L.frames(130)
    for _ in range(40):
        if L.js('LQ_DEBUG.scene()') == 'dialog':
            L.press('confirm', 1, 6)
        else:
            break
    L.wait_field_idle()
    st = L.js('LQ_DEBUG.state().sceneState')
    check(st.get('lanternHint') is False, 'no hint once the ink nearby is revealed')
    # the Items screen names the button
    L.press('menu', 1, 10)
    L.wait_scene('menu')
    L.press('confirm', 1, 8)          # Items
    L.press('pageR', 1, 8)            # Key Items tab
    help_text = L.js("(() => { const s = LQ_ENGINE.scene; return s.screen && s.screen.help; })()")
    check(help_text and 'Raise it' in help_text, f'lantern help names the button: {help_text!r}')
    L.shot('lantern_items_help')
    L.press('cancel', 1, 6); L.press('cancel', 1, 6)


def battle_touch(L):
    L.js("LQ_DEBUG.settings({ autoBattle: false, battleSpeed: 1 })")
    L.js("LQ_DEBUG.battle('f1_wraith', { fresh: true, auto: false, seed: 'w5', gameover: false })")
    L.wait_scene('battle')
    L.page.wait_for_function("(() => { const b = LQ_DEBUG.state().battle; return b && b.menu === 'root'; })()", timeout=60000, polling=20)
    L.frames(20)
    b = L.js('LQ_DEBUG.state().battle')
    if L.touch:
        check(b['rowH'] == 15 and b['cmdRect']['h'] == 72 and b['menuRows'] == 4, f'touch rows {b["rowH"]} rect {b["cmdRect"]} rows {b["menuRows"]}')
        check(b['touch'] is True, 'touch buttons present')
    else:
        check(b['rowH'] == 11 and b['cmdRect']['h'] == 60, f'desktop rows {b["rowH"]} rect {b["cmdRect"]}')
    L.shot('battle_command')
    if L.touch:
        # tap the x2 button, then the AUTO button
        L.tap(190 + 14, 6 + 7, 8)
        check(L.js('LQ_DEBUG.state().settings.battleSpeed') == 2, 'x2 tapped')
        L.shot('battle_touch_x2')
        L.tap(158 + 15, 6 + 7, 8)
        check(L.js('LQ_DEBUG.state().settings.autoBattle') is True, 'AUTO tapped')
        L.frames(6)
        L.shot('battle_touch_auto')
        L.js("LQ_DEBUG.settings({ autoBattle: false, battleSpeed: 1 })")
        L.page.wait_for_function("(() => { const b = LQ_DEBUG.state().battle; return b && b.menu === 'root'; })()", timeout=60000, polling=20)
        # tap-to-select then second tap confirms: the Tech row (row 1) opens the sub-list
        r = L.js('LQ_DEBUG.state().battle.cmdRect')
        rowy = r['y'] + 6 + 15 + 7
        L.tap(r['x'] + 40, rowy, 8)
        L.tap(r['x'] + 40, rowy, 8)
        b = L.js('LQ_DEBUG.state().battle')
        check(b['menu'] in ('sub', 'target'), f'two taps opened the Tech list: {b["menu"]}')
        L.shot('battle_sub_touch')
        if b['menu'] == 'sub':
            # the sub-list opens with its first row selected: one tap on it confirms (tap the selected row)
            L.tap(4 + 40, 66 + 6 + 7, 8)
            b = L.js('LQ_DEBUG.state().battle')
            if b['menu'] == 'sub':
                L.tap(4 + 40, 66 + 6 + 7, 8)
                b = L.js('LQ_DEBUG.state().battle')
            check(b['menu'] == 'target', f'a tap on the selected tech starts targeting: {b["menu"]}')
        # tap another unit to select it, then tap it again to confirm (single-target techs only)
        bt = L.js('LQ_DEBUG.state().battle')
        units = [x for x in bt['units'] if not x['dead'] and not x['ko']]
        enemies = [x for x in units if x['uid'].startswith('e')]
        other = next((x for x in enemies if x['uid'] != bt['target']), None)
        if other and bt['target'] in [x['uid'] for x in enemies]:
            L.tap(other['x'], other['y'] - 16, 8)
            check(L.js('LQ_DEBUG.state().battle.target') == other['uid'], 'a tap on another foe selects it')
            L.shot('battle_target_touch')
            L.tap(other['x'], other['y'] - 16, 8)
        else:
            t = next(x for x in units if x['uid'] == bt['target'])
            L.tap(t['x'], t['y'] - 16, 8)
            if L.js('LQ_DEBUG.state().battle.menu') != 'closed':
                L.tap(t['x'], t['y'] - 16, 8)
        L.frames(10)
        check(L.js('LQ_DEBUG.state().battle.menu') == 'closed', 'tap on the unit confirmed the action')
    else:
        L.press('pageR', 1, 8)
        L.shot('battle_command_x2')
        L.press('pageR', 1, 8)
    L.js("LQ_DEBUG.battleUntil('over')")
    L.js("LQ_DEBUG.settings({ autoBattle: true, battleSpeed: 2 })")
    for _ in range(600):
        if L.js('LQ_DEBUG.scene()') != 'battle':
            break
        L.press('confirm', 1, 6)
    L.js("LQ_DEBUG.settings({ autoBattle: false, battleSpeed: 1 })")


def battle_drop_prompt(L):
    """A fight in the field whose rewards include gear: the equip prompt follows the rewards window."""
    L.new_field('archive_f2', 20, 15)
    L.js("LQ_DEBUG.settings({ autoBattle: true, battleSpeed: 2 })")
    L.fire("LQ_ENGINE.scene.startBattle('echo_warden', { boss: true, canFlee: false })")
    L.wait_scene('battle')
    L.js("LQ_DEBUG.battleUntil('end')")
    L.page.wait_for_function("(() => { const b = LQ_DEBUG.state().battle; return b && b.phase === 'rewards'; })()", timeout=120000, polling=30)
    L.frames(60)
    L.shot('battle_rewards_warden')
    for _ in range(40):
        if L.js('LQ_DEBUG.scene()') != 'battle':
            break
        L.press('confirm', 1, 8)
    L.wait_choice(30000)
    txt = L.js('LQ_ENGINE.scene.text')
    check('Mirrorguard Mail' in txt, f'the Warden drop is offered after the rewards: {txt!r}')
    L.shot('battle_drop_prompt')
    L.press('confirm', 1, 6)
    L.frames(30)
    g = L.js('LQ_ENGINE.game')
    check(any((m['equip'].get('body') or {}).get('base') == 'mirrorguard_mail' for m in g['party'] if isinstance(m['equip'].get('body'), dict)), 'someone wears the mail')
    # the Warden also rolls a rare: that prompt follows (Later)
    for _ in range(4):
        if L.next_choice(tries=20) is None:
            break
        L.press('cancel', 1, 6)
    L.js("LQ_DEBUG.settings({ autoBattle: false, battleSpeed: 1 })")
    L.wait_field_idle(60000)


def gameover_menu(L):
    L.new_field('archive_f1', 4, 4)
    L.js("LQ_DEBUG.push('gameover')")
    L.page.wait_for_function("LQ_DEBUG.state().sceneState && LQ_DEBUG.state().sceneState.t >= 2.8", timeout=20000, polling=50)
    L.frames(10)
    ss = L.js('LQ_DEBUG.state().sceneState')
    check(ss['rowH'] == (15 if L.touch else 11), f'game over rows {ss["rowH"]}')
    L.shot('gameover_menu')
    if L.touch:
        w = ss['win']
        L.tap(w['x'] + 40, w['y'] + 6 + 15 + 7, 6)      # tap Load (selects)
        check(L.js('LQ_DEBUG.state().sceneState.index') == 1, 'tap selected the Load row')
    L.js("LQ_DEBUG.reset('title')")
    L.frames(10)


def font_rest(L):
    L.new_field('archive_f3', 23, 25, 'down', ", hp: 0.4")
    L.js("(() => { const f = LQ_ENGINE.scene; for (const m of f.game.party) m.mp = 1; })()")
    L.wait_field_idle()
    L.press('confirm', 1, 8)                       # the font's line
    L.wait_scene('dialog')
    ss = L.next_choice(tries=30)
    check(ss and ss.get('choices') == ['Rest', 'Not now'], f'Rest here? choices {ss and ss.get("choices")}')
    L.shot('font_rest_prompt')
    L.press('confirm', 1, 8)                       # Rest
    L.frames(30)
    g = L.js('LQ_ENGINE.game')
    vit = L.js("(async () => { const { memberStats } = await import('./src/battle/rules.js'); return LQ_ENGINE.game.party.map(m => [m.hp, memberStats(m).maxHp, m.mp, memberStats(m).maxMp]); })()")
    check(all(h == mh and m == mm for h, mh, m, mm in vit), f'full HP and MP after the font: {vit}')
    check(g['lastSafe']['map'] == 'archive_f3' and g['lastSafe']['pos']['x'] == 23 and g['lastSafe']['pos']['y'] == 25, f'the font is the return point: {g["lastSafe"]}')
    L.shot('font_rest_toast')
    ss = L.next_choice(tries=60)
    check(ss and ss.get('choices') == ['Save', 'Not now'], f'save prompt choices {ss and ss.get("choices")}')
    L.shot('font_save_prompt')
    L.press('confirm', 1, 8)                       # Save
    L.wait_scene('loadGame')
    L.frames(8)
    L.shot('font_save_page')
    L.press('cancel', 1, 8); L.press('cancel', 1, 8)
    L.frames(20)
    L.settle_dialogs()                             # the first_font bark plays once the field is quiet again
    L.wait_field_idle()


def pit_tell(L):
    L.new_field('archive_f3', 26, 14, 'right')
    L.js("(() => { const f = LQ_ENGINE.scene; f.fxTriggers = [{ id: 'page', fx: 'page_fall', radius: 5 }]; f.fxDone = new Set(); })()")
    L.wait_field_idle()
    L.call('walk', 'right', False)
    L.frames(2)
    st = L.js('LQ_DEBUG.state().sceneState')
    check('page' in (st.get('fxDone') or []), f'the page tell fired on entering the pit room: {st.get("fxDone")}')
    n = L.js("LQ_ENGINE.scene.particles.count('page')")
    check(n == 1, f'one page particle ({n})')
    L.frames(28)
    L.shot('pit_tell_1')
    L.frames(40)
    L.shot('pit_tell_2')
    L.frames(30)
    L.shot('pit_tell_3')
    L.frames(40)
    check(L.js("LQ_ENGINE.scene.particles.count('page')") == 0, 'the page is gone after falling in')
    L.call('walk', 'left', False)
    L.call('walk', 'right', False)
    L.frames(4)
    check(L.js("LQ_ENGINE.scene.particles.count('page')") == 0, 'one-shot: no second page')


SHOTS = {
    'equip_prompt': equip_prompt, 'equip_prompt_off': equip_prompt_off, 'legendary_toast': legendary_toast, 'lantern_prompt': lantern_prompt,
    'battle_touch': battle_touch, 'battle_drop_prompt': battle_drop_prompt, 'gameover_menu': gameover_menu, 'font_rest': font_rest, 'pit_tell': pit_tell,
}


def main(argv):
    ap = argparse.ArgumentParser()
    ap.add_argument('--only', default='')
    ap.add_argument('--device', default='desktop,phone')
    a = ap.parse_args(argv)
    shots.watchdog(1800)
    names = [n for n in a.only.split(',') if n] or list(SHOTS)
    failed = []
    files = []
    for device in a.device.split(','):
        L = Lab(device).open()
        try:
            for name in names:
                t0 = time.time()
                try:
                    SHOTS[name](L)
                    if L.errors:
                        raise AssertionError('console: ' + ' | '.join(L.errors[:3]))
                    print(f'ok    {device:8} {name:22} {time.time() - t0:5.1f} s', flush=True)
                except Exception as e:
                    L.shot(f'{name}-FAILED')
                    failed.append(f'{device} {name}: {e}')
                    print(f'FAIL  {device:8} {name:22} {e}', flush=True)
                    L.errors = []
        finally:
            files.extend(L.files)
            L.close()
    print('\n'.join(files))
    if failed:
        print('\nFAILED:\n  ' + '\n  '.join(failed))
        return 1
    print('ALL OK')
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
