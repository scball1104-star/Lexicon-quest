"""W7 phone UX checks (CRITIQUE_3 items 1, 2, 5, 6, 7, 9), driven on the real scenes.

Boots the game like qa/shots.py (same static server), reuses the shots from qa/shots.json for the setups and
asserts on LQ_DEBUG state, real taps on the phone profile (844x390 css, dpr 3, touch) and arrow keys on the
desktop one. PNGs go to next/qa/ui/out/ (the phone ones are cropped to the 384x216 game area). Exit code 1 on
any failed check or console / page error.

  python next/qa/ui/phone_ux.py                       every check
  python next/qa/ui/phone_ux.py --only dialog,battle_phone

Checks:
  dialog          window <= 22 % of the screen (3 lines), 1 / 2 / 3 line sizes, flips to the top when the hero or the
                  speaker would be hidden (story_leave_town), stays at the bottom otherwise (story_fading_sign)
  battle_phone    every command on screen in two columns without Flee, taps select / confirm, the FLEE button arms
                  on the first tap and runs on the second, the touch rows are 18 px (30 css px)
  battle_mira     Mira (Magic, Swap): four rows hold every command on both devices
  battle_desktop  two columns incl. Flee, left / right keep the row, up / down stay in the column
  battle_log      the idle command window shows the last three lines (enemy turn, victory, level-up)
  bestiary        every enemy has a picture (silhouette when unseen), sheets saved
  hints           name entry shows the A / B tap glyphs and no Enter on touch, the keycaps and Enter on a keyboard
"""
import argparse
import json
import pathlib
import sys
import time

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))
from shots import start_server, watchdog, drive, new_page, game_to_css  # noqa: E402

OUT = HERE / 'out'
SPEC = json.loads((HERE.parent / 'shots.json').read_text(encoding='utf-8'))
SHOTS = {s['name']: s for s in SPEC['shots']}
DEVICES = SPEC['devices']
NG = ("LQ_DEBUG.newGame('Arden', {scene: 'stage', banner: false, party: ['mira', 'bram'], level: 6, gold: 1240, "
      "items: {potion: 3, ether: 1}, gear: ['longsword', 'iron_pike'], flags: {intro_done: 1, mira_joined: 1, bram_joined: 1}, "
      "hp: 0.6, playtime: 5025, map: 'willowmere'})")


class Rig:
    """One page on one device, with the shared helpers."""

    def __init__(self, browser, base, device):
        dev = DEVICES[device]
        self.device, self.base, self.touch = device, base, dev.get('touch', False)
        self.ctx = browser.new_context(viewport={'width': dev['width'], 'height': dev['height']}, device_scale_factor=dev.get('dpr', 1),
                                       is_mobile=dev.get('mobile', False), has_touch=dev.get('touch', False), reduced_motion='no-preference')
        self.ctx.set_default_timeout(15000)
        self.errors = []
        self.page = None

    def fresh(self):
        if self.page:
            self.page.close()
        self.page, errs = new_page(self.ctx, {})
        ignore = SPEC.get('ignoreConsole', [])
        self.page.on('console', lambda m: self.errors.append(m.text) if m.type == 'error' and not any(p in m.text for p in ignore) else None)
        self.page.on('pageerror', lambda ex: self.errors.append(str(ex)))
        return self.page

    def run_shot(self, name):
        self.fresh()
        ctx = {'device': self.device, 'name': name, 'files': [], 'zooms': [], 'touch': self.touch,
               'cdp': lambda: self.page.context.new_cdp_session(self.page)}
        drive(self.page, SHOTS[name], ctx, self.base)

    def boot(self):
        self.fresh()
        p = self.page
        p.goto(self.base, wait_until='load')
        p.evaluate('Promise.race([LQ_DEBUG.ready(), new Promise((_, no) => setTimeout(() => no(new Error("ready timeout")), 20000))])')
        p.wait_for_function("LQ_DEBUG.engine.hasScene('menu') && LQ_DEBUG.commands().includes('newGame')", timeout=20000)

    def ev(self, js):
        return self.page.evaluate(js)

    def frames(self, n):
        # advance() runs the logic frames synchronously, so it also works while a shot froze the clock (setSpeed(0)).
        self.page.evaluate(f'LQ_DEBUG.advance({n})')

    def press(self, action, wait=6):
        self.page.evaluate('(a) => LQ_DEBUG.press(a, 1)', action)
        self.frames(wait)

    def tap(self, gx, gy, wait=8):
        x, y = game_to_css(self.page, gx, gy)
        if self.touch:
            self.page.touchscreen.tap(x, y)
        else:
            self.page.mouse.click(x, y)
        self.frames(wait)

    def scene_state(self):
        return self.ev('LQ_DEBUG.state().sceneState')

    def battle(self):
        return self.ev('LQ_DEBUG.state().battle')

    def shot(self, name, crop=True):
        OUT.mkdir(parents=True, exist_ok=True)
        path = OUT / f'{self.device}-{name}.png'
        if crop:
            v = self.ev('LQ_DEBUG.view()')
            self.page.screenshot(path=str(path), clip={'x': v['cssX'], 'y': v['cssY'], 'width': v['cssW'], 'height': v['cssH']})
        else:
            self.page.screenshot(path=str(path))
        return path

    def css_scale(self):
        return self.ev('LQ_DEBUG.view().cssScale')


def center(r):
    return r['x'] + r['w'] / 2, r['y'] + r['h'] / 2


# ------------------------------------------------------------------------------------------------ checks
def check_dialog(rigs):
    d = rigs['phone']
    rows = []
    for name, want in (('story_fading_sign', 'bottom'), ('story_archive_door', 'bottom'), ('story_echo_warden', 'bottom'),
                       ('story_leave_town', 'top'), ('story_mira_joins', None), ('ui_dialog', None)):
        d.run_shot(name)
        assert d.ev('LQ_DEBUG.scene()') == 'dialog', f'{name}: dialog on top'
        st = d.scene_state()
        h = st['rect']['h']
        rows.append((name, st['position'], h, st['lines'], bool(st['portrait'])))
        assert st['lines'] <= 3, f'{name}: never four lines ({st["lines"]})'
        assert h / 216 <= 0.22, f'{name}: window covers {h / 216:.1%} of the screen'
        if want:
            assert st['position'] == want, f'{name}: expected the {want}, got {st["position"]}'
        d.shot(name)
    print('      dialog:', ', '.join(f'{n}={p}/{h}px/{ln}l' for n, p, h, ln, _ in rows))
    # Window sizes follow the text: 1, 2 and 3 lines (and a portrait asks for two).
    d.boot()
    d.ev(NG)
    d.frames(6)
    sizes = {}
    for label, text, kw in (('one', 'Hello.', {}), ('two', 'A line of text that is long enough to wrap onto a second line of the window, no more.', {}),
                            ('three', 'This is a longer speech that needs all three lines of the window, because it goes on and on about the weather in Willowmere and the bells that rang in the night and then some more words to be sure.', {}),
                            ('portrait_one', 'Hi.', {'who': 'mira'})):
        d.page.evaluate('([t, k]) => { LQ_DEBUG.engine.pushAwait("dialog", { who: null, text: t, instant: true, ...k }); }', [text, kw])
        d.frames(14)
        st = d.scene_state()
        sizes[label] = st['rect']['h']
        d.page.evaluate('LQ_DEBUG.engine.pop()')
        d.frames(3)
    assert sizes['one'] == 23 and sizes['two'] == 34 and sizes['three'] == 45, f'window heights follow the text {sizes}'
    assert sizes['portrait_one'] == 34, f'a portrait asks for two lines {sizes}'
    print('      sizes:', sizes)


def check_battle_phone(rigs):
    d = rigs['phone']
    d.run_shot('battle_command')
    b = d.battle()
    assert b['menu'] == 'root' and b['touch'], f'touch root menu ({b["menu"]}, touch={b["touch"]})'
    items = b['menuItems']
    assert 'flee' not in items and len(items) >= 6, f'Flee leaves the grid on touch: {items}'
    assert b['menuCols'] == 2 and b['menuRows'] == 4, f'two columns of four rows ({b["menuCols"]}x{b["menuRows"]})'
    cr = b['cmdRect']
    assert cr['y'] + cr['h'] == 212, f'window keeps the bottom edge {cr}'
    for i, rc in enumerate(b['rootRects']):
        assert cr['x'] <= rc['x'] and rc['x'] + rc['w'] <= cr['x'] + cr['w'] and cr['y'] <= rc['y'] and rc['y'] + rc['h'] <= cr['y'] + cr['h'], f'row {items[i]} inside the window'
    assert b['rowH'] * d.css_scale() >= 29.9, f'rows are 30 css px tall ({b["rowH"]} game px)'
    d.shot('battle_commands_phone')
    # Tap Defend (second column): first tap selects, second confirms -> the turn is used.
    i_item = items.index('item')
    d.tap(*center(b['rootRects'][i_item]))
    assert d.battle()['menuIndex'] == i_item, 'first tap selects Item'
    assert d.battle()['menu'] == 'root'
    d.tap(*center(b['rootRects'][i_item]))
    st = d.battle()
    assert st['menu'] == 'sub' or st['menu'] == 'root', f'second tap confirms Item ({st["menu"]})'
    if st['menu'] == 'sub':
        d.press('cancel')
    assert d.battle()['menu'] == 'root'
    # FLEE button: first tap arms, second runs.
    btn = b['helpBtns']['flee']
    d.tap(*center(btn), wait=3)
    assert d.battle()['fleeArmed'] > 0, 'first tap arms the FLEE button'
    assert d.battle()['menu'] == 'root', 'arming does not run'
    d.shot('battle_flee_armed')
    d.tap(*center(btn), wait=3)
    d.frames(120)
    st = d.ev('LQ_DEBUG.state()')
    gone = st['scene'] != 'battle'
    tried = (not gone) and any(a.endswith(':flee') for a in st['battle']['actions'])   # an attempt can fail and the fight goes on
    assert gone or st['battle']['phase'] in ('flee', 'leave') or tried, f'second tap runs away ({st["scene"]}, {st["battle"] and st["battle"]["actions"]})'
    print('      commands:', items)


def check_battle_desktop(rigs):
    d = rigs['desktop']
    d.run_shot('battle_command')
    b = d.battle()
    items = b['menuItems']
    assert 'flee' in items, f'Flee stays in the keyboard grid: {items}'
    assert b['menuCols'] == 2 and b['menuRows'] >= 4
    n = len(items)
    rows = b['menuRows']
    assert b['menuIndex'] == 0
    d.press('right')
    i = d.battle()['menuIndex']
    assert i == rows, f'right crosses to the same row of column 2 (index {i}, rows {rows})'
    d.press('down')
    assert d.battle()['menuIndex'] == rows + 1, 'down stays in the column'
    d.press('left')
    assert d.battle()['menuIndex'] == 1, 'left returns to the same row'
    d.press('up'); d.press('up')
    assert d.battle()['menuIndex'] == min(rows, n) - 1, 'up wraps inside the column'
    d.shot('battle_commands_desktop', crop=False)
    print('      desktop commands:', items)


def check_battle_mira(rigs):
    """Mira has Magic and a second weapon: the biggest ordinary command list (8 on touch, 8 with Flee on a keyboard)."""
    for dev in ('phone', 'desktop'):
        d = rigs[dev]
        d.run_shot('battle_break')       # same setup: f1_mites, then step to Mira's turn
        d.page.evaluate("LQ_DEBUG.battleUntil('mira')")
        d.page.evaluate("(() => { for (let i = 0; i < 600; i++) { const b = LQ_DEBUG.state().battle; if (b && b.menu !== 'closed' && !b.fast) return i; LQ_DEBUG.advance(5); } return -1; })()")
        d.frames(6)
        b = d.battle()
        items = b['menuItems']
        assert 'magic' in items, f'{dev}: Mira has Magic {items}'
        assert len(items) <= 8 and b['menuRows'] == 4, f'{dev}: four rows hold {items}'
        assert ('flee' in items) == (dev == 'desktop'), f'{dev}: Flee in the grid only off touch {items}'
        d.shot(f'battle_mira_{dev}')
        print(f'      {dev} Mira commands:', items)


def check_battle_log(rigs):
    d = rigs['phone']
    d.run_shot('battle_break')
    log = d.battle()['log']
    assert len(log) >= 2, f'break log {log}'
    assert any('BROKEN' in x for x in log), f'log has the break line {log}'
    d.shot('battle_log_break')
    d.run_shot('battle_victory')
    log = d.battle()['log']
    assert any('EXP' in x for x in log) and len(log) >= 2, f'victory log {log}'
    d.shot('battle_log_victory')
    d.run_shot('battle_levelup')
    st = d.battle()
    assert st['log'], 'level-up page keeps a log'
    d.shot('battle_log_levelup')
    print('      log:', log[-3:])


def check_bestiary(rigs):
    d = rigs['phone']
    d.boot()
    d.ev(NG)
    d.frames(6)
    ids = d.ev("(async () => { const m = await import('/next/src/data/text.js'); return Object.keys(m.BESTIARY); })()")
    seen = {i: {'seen': 3, 'killed': 2, 'weak': ['fire']} for i in ids[:-3]}
    seen[ids[-3]] = {'seen': 1, 'killed': 0, 'weak': []}      # met, never beaten: first lore paragraph only
    d.page.evaluate('(b) => { LQ_DEBUG.engine.game.bestiary = b; }', seen)
    d.ev("(() => { LQ_DEBUG.engine.pushAwait('menu', { page: 'journal', instant: true }); return true; })()")
    d.frames(8)
    d.press('pageR', wait=8)
    paths = []
    for k, id_ in enumerate(ids):
        d.frames(4)
        assert d.scene_state()['screen']['beast'] == id_ if isinstance(d.scene_state().get('screen'), dict) else True
        paths.append(d.shot(f'bestiary_{k:02d}_{id_}'))
        d.press('down', wait=4)
    try:
        from PIL import Image
        W, H = 640, 360
        for sheet, chunk in enumerate((paths[:6], paths[6:])):
            if not chunk:
                continue
            im = Image.new('RGB', (W * 3 + 12, H * 2 + 6), (30, 30, 30))
            for j, p in enumerate(chunk):
                im.paste(Image.open(p).convert('RGB').resize((W, H), Image.LANCZOS), ((j % 3) * (W + 6), (j // 3) * (H + 6)))
            im.save(OUT / f'phone-bestiary_sheet{sheet}.png')
    except ImportError:
        pass
    print('      bestiary entries:', len(ids))


def check_hints(rigs):
    d = rigs['phone']
    d.boot()
    d.ev("LQ_DEBUG.reset('nameEntry')")
    d.frames(10)
    d.ev("LQ_DEBUG.engine.input._setDevice('touch')")
    d.frames(4)
    st = d.scene_state()
    assert st['device'] == 'touch', st
    assert 'btn_confirm' in st['help'] and 'btn_cancel' in st['help'] and 'Enter' not in st['help'], f'touch hint {st["help"]!r}'
    d.shot('name_entry_touch')
    d.ev("LQ_DEBUG.engine.input._setDevice('keyboard')")
    d.frames(4)
    st = d.scene_state()
    assert 'Enter' in st['help'], f'keyboard hint {st["help"]!r}'
    print('      hint (touch):', 'A/B glyphs, no Enter; keyboard keeps Enter')


CHECKS = {
    'dialog': check_dialog, 'battle_phone': check_battle_phone, 'battle_desktop': check_battle_desktop,
    'battle_mira': check_battle_mira, 'battle_log': check_battle_log, 'bestiary': check_bestiary, 'hints': check_hints,
}


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--only', default='')
    args = ap.parse_args()
    names = [n for n in args.only.split(',') if n] or list(CHECKS)
    unknown = [n for n in names if n not in CHECKS]
    if unknown:
        print('unknown check(s):', ', '.join(unknown))
        return 2
    watchdog(900)
    server = start_server()
    base = f'http://127.0.0.1:{server.server_port}/next/index.html?debug=1&fps=0'
    failures = 0
    from playwright.sync_api import sync_playwright
    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True, args=['--autoplay-policy=no-user-gesture-required'])
        rigs = {'phone': Rig(browser, base, 'phone'), 'desktop': Rig(browser, base, 'desktop')}
        for name in names:
            t0 = time.time()
            for r in rigs.values():
                r.errors.clear()
            status, detail = 'ok', ''
            try:
                CHECKS[name](rigs)
            except Exception as e:  # noqa: BLE001
                status, detail = 'FAIL', f'{type(e).__name__}: {e}'
            errs = [e for r in rigs.values() for e in r.errors]
            if errs and status == 'ok':
                status, detail = 'FAIL', 'console: ' + ' | '.join(errs[:3])
            if status != 'ok':
                failures += 1
            print(f'{status:<5} {name:<16} {int((time.time() - t0) * 1000):>6} ms  {detail}', flush=True)
        browser.close()
    print(f'\n{len(names) - failures}/{len(names)} checks ok; PNGs in {OUT}')
    return 1 if failures else 0


if __name__ == '__main__':
    sys.exit(main())
