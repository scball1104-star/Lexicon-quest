"""Headless checks for the W4b UI polish items, driven by real taps on the phone profile (DESIGN 10).

Boots the game like qa/shots.py (same static server), opens a phone context (844x390 css, dpr 3, touch) or the
desktop one, drives the REAL scenes with touch taps / LQ_DEBUG presses and asserts state after every step.
Screenshots go to next/qa/ui/out/. Fails on any console or page error. Exit code 1 on any failure.

  python next/qa/ui/polish.py                 run every check
  python next/qa/ui/polish.py --only touch_title,credits_end

Checks: touch_title (tap selects, second tap confirms, 20 px rows = 33 css px), touch_menu (main menu touch layout),
touch_config (tap on a row steps the value, left arrow steps back, slider tap, Reset to defaults), touch_shop_qty
(quantity arrows by touch, tap elsewhere confirms), touch_name_entry (one tap types a glyph), text_instant (text
speed 4 shows a page at once), credits_end (triumph plays, the last card holds centered inside the screen on the
phone), popup_stack (numbers stack 10 px apart, CRITICAL rides its number, BREAK above MISS; a zoomed PNG).
"""
import argparse
import json
import pathlib
import sys
import time

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))
from shots import start_server, watchdog, game_to_css  # noqa: E402

OUT = HERE / 'out'
DEVICES = {
    'phone': dict(viewport={'width': 844, 'height': 390}, device_scale_factor=3, is_mobile=True, has_touch=True),
    'desktop': dict(viewport={'width': 1920, 'height': 1080}, device_scale_factor=1),
}
NG = ("LQ_DEBUG.newGame('Arden', {scene: 'stage', banner: false, party: ['mira', 'bram'], level: 6, gold: 1240, "
      "items: {potion: 3, ether: 1}, gear: ['longsword', 'iron_pike'], flags: {intro_done: 1, mira_joined: 1, bram_joined: 1, tess_quest_started: 1}, "
      "hp: 0.6, playtime: 5025, map: 'willowmere'})")


class Driver:
    def __init__(self, page, device):
        self.page, self.device, self.touch = page, device, DEVICES[device].get('has_touch', False)
        self.shots = []

    def frames(self, n):
        start = self.page.evaluate('LQ_DEBUG.state().frame')
        self.page.wait_for_function(f'LQ_DEBUG.state().frame >= {start + n}', timeout=15000, polling=16)

    def press(self, action, n=1, wait=8):
        self.page.evaluate('([a, n]) => LQ_DEBUG.press(a, n)', [action, n])
        self.frames(wait)

    def tap(self, gx, gy, wait=10):
        x, y = game_to_css(self.page, gx, gy)
        if self.touch:
            self.page.touchscreen.tap(x, y)
        else:
            self.page.mouse.click(x, y)
        self.frames(wait)

    def ev(self, js):
        return self.page.evaluate(js)

    def run(self, js):
        return self.page.evaluate('(() => { ' + js + '; return true; })()')

    def scene(self):
        return self.page.evaluate('LQ_DEBUG.scene()')

    def state(self):
        return self.page.evaluate('LQ_DEBUG.state().sceneState')

    def expect(self, scene, what=''):
        s = self.scene()
        assert s == scene, f'expected scene {scene!r} but got {s!r} {what}'

    def shot(self, name):
        OUT.mkdir(parents=True, exist_ok=True)
        path = OUT / f'{self.device}-{name}.png'
        self.page.screenshot(path=str(path))
        self.shots.append(path)
        return path

    def css_scale(self):
        return self.ev('LQ_DEBUG.view().cssScale')


def new_game(d):
    d.run(NG)
    d.frames(6)
    d.expect('_uiStage', 'after newGame')


# ------------------------------------------------------------------------------------------------ checks
def check_touch_title(d):
    d.run("LQ_DEBUG.reset('title')")
    d.frames(30)
    d.expect('title')
    st = d.state()
    assert st['backdrop'] is True, 'title draws the quantized backdrop atlas'
    assert st['rowH'] == 20, f"touch rows are 20 px (got {st['rowH']})"
    assert st['rowH'] * d.css_scale() >= 32, 'rows are at least 32 css px on the phone'
    row_y = lambda i: st['listY'] + i * st['rowH'] + 7
    d.tap(190, row_y(2))                          # Config row: first tap selects
    d.expect('title', 'first tap only moves the cursor')
    assert d.state()['index'] == 2, 'tap selected the Config row'
    d.shot('touch_title_selected')
    d.tap(190, row_y(2))                          # second tap confirms
    d.frames(12)
    d.expect('config', 'second tap on the selected row confirms')
    d.press('cancel')
    d.expect('title')
    d.tap(190, row_y(0))
    assert d.state()['index'] == 0


def check_touch_menu(d):
    new_game(d)
    d.press('menu', wait=14)
    d.expect('menu')
    st = d.state()
    assert st['touch'] is True and st['rowH'] == 30, f'menu uses the two-column touch layout ({st})'
    assert st['rowH'] * d.css_scale() >= 44, 'main menu rows are at least 44 css px on the phone'
    d.shot('touch_menu')
    # Two columns of five, 30 px rows from y 10; the left one starts at x 253, the right one 61 px further.
    d.tap(253 + 61 + 20, 10 + 15)                  # Journal = index 5 = right column, first row
    assert d.state()['command'] == 'journal' and d.state()['mode'] == 'commands', 'first tap selects Journal'
    d.tap(253 + 61 + 20, 10 + 15)
    assert d.state()['mode'] == 'screen', 'second tap opens it'
    d.press('cancel'); d.press('cancel')
    d.expect('_uiStage')


def check_touch_config(d):
    new_game(d)
    d.run("LQ_DEBUG.engine.pushAwait('config')")
    d.frames(10)
    d.expect('config')
    st = d.state()
    rowh = st['rowH']
    list_y = 32 if rowh > 12 else 30
    assert st['rows'] < 13 if rowh == 20 else st['rows'] == 13, f'touch config scrolls ({st})'
    before = d.ev("LQ_DEBUG.engine.settings.windowColor")
    # Window color (scrolled into view with the keys first, so it is selected). A tap steps forward once.
    for _ in range(14):
        if d.state()['key'] == 'windowColor':
            break
        d.press('down', wait=3)
    assert d.state()['key'] == 'windowColor'
    wi = d.state()['index']
    wy = list_y + (wi - d.state()['scroll']) * rowh + rowh // 2
    d.tap(120, wy)                                 # the row is already selected (keys): one tap steps forward once
    assert d.state()['key'] == 'windowColor'
    after = d.ev("LQ_DEBUG.engine.settings.windowColor")
    assert after != before, 'tap on the selected row changes the value'
    d.tap(48 + 150 + 4, wy)                        # left arrow zone steps back
    assert d.ev("LQ_DEBUG.engine.settings.windowColor") == before, 'left arrow tap steps back'
    # Slider: tap the middle of the Music gauge -> about 0.5.
    for _ in range(wi - 1):
        d.press('up', wait=3)
    my = list_y + (1 - d.state()['scroll']) * rowh + rowh // 2
    d.tap(120, my)
    d.tap(48 + 150 + 12 + 45, my)
    music = d.ev("LQ_DEBUG.engine.settings.music")
    assert 0.4 <= music <= 0.6, f'slider tap sets the value near the tap ({music})'
    d.shot('touch_config')
    # Text speed -> Instant (value 4) with the keyboard path, then Reset to defaults through the choice.
    d.run("LQ_DEBUG.engine.setSetting('textSpeed', 4)")
    d.press('down', n=1); d.press('down', 1)
    for _ in range(12):
        if d.state()['key'] == 'reset':
            break
        d.press('down')
    assert d.state()['key'] == 'reset', 'reached the Reset row'
    d.press('confirm', wait=12)
    d.expect('choice', 'reset asks first')
    d.press('cancel', wait=10)                     # Keep mine
    d.expect('config')
    assert d.ev("LQ_DEBUG.engine.settings.textSpeed") == 4, 'Keep mine keeps the settings'
    d.press('confirm', wait=12)
    d.expect('choice')
    d.shot('config_reset_prompt')
    d.press('confirm', wait=12)                    # Reset
    d.expect('config')
    s = d.ev("({t: LQ_DEBUG.engine.settings.textSpeed, m: LQ_DEBUG.engine.settings.music, w: LQ_DEBUG.engine.settings.windowColor})")
    assert s['t'] == 2 and s['m'] == 0.7 and s['w'] == 'blue', f'defaults restored ({s})'
    d.press('cancel')
    d.expect('_uiStage')


def check_touch_shop_qty(d):
    new_game(d)
    gold0 = d.ev('LQ_DEBUG.engine.game.gold')
    potions0 = d.ev('LQ_DEBUG.engine.game.items.potion || 0')   # a new game already carries starter potions
    d.run("LQ_DEBUG.engine.pushAwait('shop', {shopId: 'willowmere_items'})")
    d.frames(10)
    d.expect('shop')
    st = d.state()
    assert st['rowH'] == (20 if d.touch else 12), f'shop rows ({st})'
    d.tap(36, 16)                                  # Buy strip (already selected) -> enter the list
    assert d.state()['focus'] == 'list', 'tap on the selected command enters the stock list'
    d.tap(100, 38 + 10)                            # Potion row (index 0, already selected) -> quantity picker
    assert d.state()['qty'] == 1, f"quantity picker open ({d.state()})"
    d.tap(100 + 184 - 14, 80 + 25)                 # right arrow zone
    d.tap(100 + 184 - 14, 80 + 25)
    assert d.state()['qty'] == 3, 'two taps on the right arrow'
    d.tap(100 + 184 - 28 - 8 - 14, 80 + 25)        # left arrow zone
    assert d.state()['qty'] == 2, 'left arrow tap'
    d.shot('touch_shop_qty')
    d.tap(140, 80 + 8)                             # elsewhere in the window confirms the purchase
    assert d.state()['qty'] is None, 'picker closed'
    assert d.ev('LQ_DEBUG.engine.game.gold') == gold0 - 40, 'bought 2 potions at 20 G'
    potions = d.ev('LQ_DEBUG.engine.game.items.potion')
    assert potions == potions0 + 2, f'{potions0} potions + 2 bought (have {potions})'
    d.tap(100, 38 + 7)                             # open again, then tap outside to cancel
    assert d.state()['qty'] == 1, f'picker reopened ({d.state()})'
    d.tap(40, 170)
    assert d.state()['qty'] is None and d.ev('LQ_DEBUG.engine.game.gold') == gold0 - 40, 'tap outside cancels'
    d.press('cancel'); d.press('cancel')
    d.expect('_uiStage')


def check_touch_name_entry(d):
    d.run("LQ_DEBUG.reset('nameEntry')")
    d.frames(10)
    d.expect('nameEntry')
    st = d.state()
    cw, ch = st['cell']
    g = st['grid']
    assert (cw, ch) == ((20, 20) if d.touch else (14, 13)), f'cell size {st["cell"]}'
    cell = lambda row, col: (g['x'] + 12 + col * cw + cw // 2, g['y'] + 7 + row * ch + ch // 2)
    for _ in range(4):
        d.tap(*cell(4, 11))                        # erase glyph
    assert d.state()['value'] == '', 'four taps on the erase cell'
    d.tap(*cell(0, 12))                            # M
    d.tap(*cell(2, 8))                             # i
    d.tap(*cell(3, 4))                             # r
    d.tap(*cell(2, 0))                             # a
    assert d.state()['value'] == 'Mira', f"one tap per glyph typed the name ({d.state()['value']!r})"
    d.shot('touch_name_entry')
    d.tap(*cell(4, 12))                            # done
    d.frames(60)
    d.expect('prologue', 'the done cell starts the game')
    assert d.ev('LQ_DEBUG.engine.game.heroName') == 'Mira'
    d.press('start', wait=90)


def check_text_instant(d):
    new_game(d)
    d.run("LQ_DEBUG.engine.setSetting('textSpeed', 4)")
    long = 'The chamber is a hollow in the heart of the willow. Pages drift through the air like slow snow, and every one of them is blank. ' * 2
    d.run("LQ_DEBUG.engine.pushAwait('dialog', {who: 'mael', text: " + json.dumps(long) + "})")
    d.frames(12)
    d.expect('dialog')
    st = d.state()
    assert st['typing'] is False and st['shown'] == st['total'], f'instant text shows the whole page at once ({st})'
    assert st['pages'] >= 2
    d.run("LQ_DEBUG.engine.setSetting('textSpeed', 2)")
    d.press('confirm', wait=4)
    st = d.state()
    assert st['page'] == 1 and st['typing'] is True, 'normal speed types the next page'
    d.press('confirm', wait=4); d.press('confirm', wait=8)
    d.expect('_uiStage')


def check_credits_end(d):
    new_game(d)
    d.run("LQ_DEBUG.engine.push('credits')")
    d.frames(20)
    d.expect('credits')
    st = d.state()
    assert st['music'] == 'triumph', f"credits play the triumph track (got {st['music']})"
    assert st['backdrop'] is True
    d.page.evaluate("LQ_DEBUG.press('confirm', 2400)")          # hold confirm: 4x scroll
    d.page.wait_for_function("LQ_DEBUG.scene() !== 'credits' || (LQ_DEBUG.state().sceneState.holdT > 0)", timeout=30000, polling=50)
    d.expect('credits', 'still holding the last card')
    d.page.evaluate("LQ_DEBUG.press('confirm', 1)")             # release the hurry so the hold lasts
    d.frames(6)
    st = d.state()
    assert 0 < st['lastCardBottom'] <= 216 - 8, f'last card fully inside the screen ({st})'
    d.shot('credits_end')
    d.page.wait_for_function("LQ_DEBUG.scene() !== 'credits'", timeout=30000, polling=100)
    d.expect('_uiStage', 'credits pop back when the hold ends')


def check_popup_stack(d):
    d.run("LQ_DEBUG.battle('valley_wolves', {fresh: true, start: 'normal', seed: 7})")
    d.page.wait_for_function("LQ_DEBUG.scene() === 'battle' && LQ_DEBUG.state().sceneState.menu !== 'closed'", timeout=20000, polling=50)
    units = d.state()['units']
    foes = [u for u in units if u['x'] < 192]      # enemies stand on the left half of the stage
    assert foes, f'no enemies on the left ({units})'
    foe, other = foes[0], (foes[1] if len(foes) > 1 else foes[0])
    js = """(() => {
      const s = LQ_DEBUG.engine.scene; const a = s.actor(%r); const p = s.pops;
      p.spawn(a.cx, a.cy, 24); p.spawn(a.cx, a.cy, 31); p.spawn(a.cx, a.cy, 118, { kind: 'crit' }); p.word(a.cx, a.cy - 10, 'CRITICAL');
      const b = s.actor(%r); if (b) { p.word(b.cx, b.cy - 10, 'MISS'); p.word(b.cx, b.cy - 10, 'BREAK'); }
      return { active: p.active, groups: p.groups.length, cx: a.cx, cy: a.cy };
    })()""" % (foe['uid'], other['uid'])
    info = d.ev(js)
    assert info['active'] >= 6 and info['groups'] >= 1, f'popups spawned ({info})'
    d.frames(30)                                   # mid-life: bounce settled, column readable
    path = d.shot('popup_stack')
    # Zoomed crop around the target (4x nearest) for the eye.
    try:
        from PIL import Image
        v = d.ev('LQ_DEBUG.view()')
        im = Image.open(path)
        s = v['scale']
        x0, y0 = int(v['x'] + (info['cx'] - 60) * s), int(v['y'] + (info['cy'] - 90) * s)
        crop = im.crop((max(0, x0), max(0, y0), x0 + int(120 * s), y0 + int(110 * s)))
        zoom = path.with_name(path.stem + '-zoom.png')
        crop.resize((crop.width * 2, crop.height * 2), Image.NEAREST).save(zoom)
        d.shots.append(zoom)
    except ImportError:
        pass
    d.run("LQ_DEBUG.engine.scene.pops.clear()")


CHECKS = {
    'touch_title': ('phone', check_touch_title),
    'touch_menu': ('phone', check_touch_menu),
    'touch_config': ('phone', check_touch_config),
    'touch_shop_qty': ('phone', check_touch_shop_qty),
    'touch_name_entry': ('phone', check_touch_name_entry),
    'text_instant': ('desktop', check_text_instant),
    'credits_end': ('phone', check_credits_end),
    'popup_stack': ('desktop', check_popup_stack),
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
    watchdog(600)
    server = start_server()
    base = f'http://127.0.0.1:{server.server_port}/next/index.html?debug=1&fps=0'
    failures = 0
    from playwright.sync_api import sync_playwright
    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True, args=['--autoplay-policy=no-user-gesture-required'])
        contexts = {}
        for name in names:
            device, fn = CHECKS[name]
            errors = []
            t0 = time.time()
            ctx = browser.new_context(**DEVICES[device], reduced_motion='no-preference')
            ctx.set_default_timeout(15000)
            page = ctx.new_page()
            page.on('pageerror', lambda e: errors.append(f'pageerror: {e.message}'))
            page.on('console', lambda m: errors.append(f'console.error: {m.text}') if m.type == 'error' else None)
            status = 'ok'
            detail = ''
            shots = []
            try:
                page.goto(base)
                page.wait_for_function('window.LQ_DEBUG && LQ_DEBUG.ready && LQ_DEBUG.ready()', timeout=20000)
                page.wait_for_function("LQ_DEBUG.engine.hasScene('config') && LQ_DEBUG.commands().includes('newGame')", timeout=20000)
                d = Driver(page, device)
                fn(d)
                shots = d.shots
            except Exception as e:  # noqa: BLE001
                status = 'FAIL'
                detail = f'{type(e).__name__}: {e}'
            if errors and status == 'ok':
                status = 'FAIL'
                detail = ' | '.join(errors[:3])
            if status != 'ok':
                failures += 1
            print(f'{status:<5} {device:<8} {name:<20} {int((time.time() - t0) * 1000):>6} ms  {detail}', flush=True)
            for s in shots:
                print(f'      -> {s}')
            ctx.close()
        browser.close()
    print(f'\n{len(names) - failures}/{len(names)} checks ok')
    return 1 if failures else 0


if __name__ == '__main__':
    sys.exit(main())
