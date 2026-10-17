"""Headless cancel-path check for the W2-ui scenes (DESIGN 10, W2-ui brief).

Boots the game in headless Chromium (same server as qa/shots.py), creates a game with LQ_DEBUG.newGame
(UI stage when the field scene is absent) and drives the REAL scenes with LQ_DEBUG.press, asserting the
scene stack after every step. Fails on any console/page error. Exit code 1 on any failure.

  python next/qa/ui/paths.py            run every path
  python next/qa/ui/paths.py --only menu_items,shop
"""
import argparse
import json
import pathlib
import sys
import time

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))
from shots import start_server, watchdog  # noqa: E402

NG = ("LQ_DEBUG.newGame('Arden', {scene: 'stage', banner: false, party: ['mira', 'bram'], level: 6, gold: 500, "
      "items: {potion: 3, ether: 1, phoenix_feather: 1, tent: 1, lantern_of_recall: 1}, "
      "gear: ['longsword', 'iron_pike', 'chain_shirt'], flags: {intro_done: 1, met_mael: 1, mira_joined: 1, bram_joined: 1, "
      "tess_quest_started: 1}, hp: 0.5, map: 'willowmere'})")

STAGE = '_uiStage'


class Driver:
    def __init__(self, page):
        self.page = page
        self.log = []

    def frames(self, n):
        start = self.page.evaluate('LQ_DEBUG.state().frame')
        self.page.wait_for_function(f'LQ_DEBUG.state().frame >= {start + n}', timeout=15000, polling=16)

    def press(self, action, n=1, wait=8):
        self.page.evaluate('([a, n]) => LQ_DEBUG.press(a, n)', [action, n])
        self.frames(wait)
        self.log.append(action)

    def keys(self, *actions):
        for a in actions:
            self.press(a)

    def scene(self):
        return self.page.evaluate('LQ_DEBUG.scene()')

    def state(self):
        return self.page.evaluate('LQ_DEBUG.state().sceneState')

    def scenes(self):
        return self.page.evaluate('LQ_DEBUG.state().scenes')

    def ev(self, js):
        return self.page.evaluate(js)

    def run(self, js):
        """Run statements (pushes, assignments) without handing Playwright a Promise to await."""
        return self.page.evaluate('(() => { ' + js + '; return true; })()')

    def expect(self, scene, what=''):
        s = self.scene()
        if s != scene:
            raise AssertionError(f'expected scene {scene!r} but got {s!r} {what} (stack {self.scenes()}, presses {self.log[-8:]})')

    def expect_state(self, key, value, what=''):
        st = self.state() or {}
        cur = st.get(key) if isinstance(st, dict) else None
        if cur != value:
            raise AssertionError(f'expected {key}={value!r} but got {cur!r} {what} (state {st})')


def new_game(d):
    d.run(NG)
    d.frames(6)
    d.expect(STAGE, 'after newGame')


# ------------------------------------------------------------------------------------------------ paths
def path_menu_open_close(d):
    new_game(d)
    d.press('menu', wait=12)
    d.expect('menu', 'menu opens on menu action')
    d.press('cancel')
    d.expect(STAGE, 'cancel closes the menu')
    d.press('menu', wait=12)
    d.expect('menu')
    d.press('menu')
    d.expect(STAGE, 'menu action closes the menu too')


def path_menu_items(d):
    new_game(d)
    d.press('menu', wait=12)
    d.press('confirm')                       # Items
    d.expect('menu'); d.expect_state('mode', 'screen')
    d.press('confirm')                       # use potion -> picker
    assert d.state()['screen']['picker'] is True, 'picker opened'
    d.press('confirm')                       # use on hero (hurt)
    d.frames(4)
    hp = d.ev('LQ_DEBUG.engine.game.party[0].hp')
    potions = d.ev('LQ_DEBUG.engine.game.items.potion')
    assert potions == 4, f'one potion used (5 to start), have {potions}'
    assert hp > 0, 'hero healed'
    d.press('cancel')                        # close picker
    assert d.state()['screen']['picker'] is False
    d.press('pageR')                         # key items tab
    assert d.state()['screen']['tab'] == 1
    d.press('cancel')                        # back to commands
    d.expect_state('mode', 'commands')
    d.press('cancel')
    d.expect(STAGE)


def path_menu_member_screens(d):
    new_game(d)
    for cmd_index, name in [(1, 'tech'), (2, 'magic'), (3, 'equip'), (4, 'status')]:
        d.press('menu', wait=12)
        d.expect('menu')
        for _ in range(cmd_index):
            d.press('down')
        d.press('confirm')
        d.expect_state('mode', 'members', f'{name} asks for a member')
        d.press('down')                      # Mira
        d.press('confirm')
        d.expect_state('mode', 'screen', f'{name} screen open')
        if name == 'equip':
            d.press('confirm')               # slot -> candidates (sword? Mira has staff: longsword no, so maybe nothing)
            st = d.state()['screen']
            if st['focus'] == 'cands':
                d.press('cancel')
                assert d.state()['screen']['focus'] == 'slots'
            d.press('pageR')                 # next member
            assert d.state()['screen']['member'] == 'bram'
            d.press('confirm')               # spear slot -> Iron Pike candidate
            assert d.state()['screen']['focus'] == 'cands', 'bram has a spear candidate'
            d.press('down')
            d.press('confirm')               # equip it
            assert d.ev("LQ_DEBUG.engine.game.party[2].equip.spear.base") == 'iron_pike'
            assert d.state()['screen']['focus'] == 'slots'
        if name == 'magic':
            d.press('down')                  # Mend
            d.press('confirm')               # picker
            assert d.state()['screen']['picker'] is True
            d.press('confirm')               # heal hero
            d.frames(4)
            d.press('cancel')
        d.press('cancel')                    # leave the screen
        d.expect_state('mode', 'members', f'{name}: cancel returns to member pick')
        d.press('cancel')
        d.expect_state('mode', 'commands')
        d.press('cancel')
        d.expect(STAGE, f'{name}: fully closed')


def path_menu_journal_talk(d):
    new_game(d)
    d.press('menu', wait=12)
    for _ in range(5):
        d.press('down')
    d.press('confirm')                       # Journal
    d.expect_state('mode', 'screen')
    d.press('pageR')                         # bestiary
    assert d.state()['screen']['tab'] == 1
    d.press('down'); d.press('cancel')
    d.expect_state('mode', 'commands')
    d.press('down')                          # Talk
    d.press('confirm', wait=12)
    d.expect('dialog', 'Talk shows party chat')
    for _ in range(12):
        if d.scene() != 'dialog':
            break
        d.press('confirm', wait=6)
    d.expect('menu', 'back in the menu after the chat')
    d.press('cancel')
    d.expect(STAGE)


def path_menu_config_save_quit(d):
    new_game(d)
    d.run("localStorage.removeItem('lq-next-slot-1')")
    d.press('menu', wait=12)
    for _ in range(7):
        d.press('down')
    d.press('confirm', wait=10)              # Config
    d.expect('config')
    d.press('down'); d.press('right')
    d.press('cancel')
    d.expect('menu', 'config cancels back to the menu')
    d.press('down')
    d.press('confirm', wait=10)              # Save
    d.expect('loadGame')
    d.press('confirm', wait=70)              # slot 1 (empty: no overwrite prompt)
    d.expect('menu', 'save returns to the menu')
    assert d.ev("!!localStorage.getItem('lq-next-slot-1')"), 'slot 1 written'
    d.press('confirm', wait=10)              # Save again -> overwrite prompt
    d.expect('loadGame')
    d.press('confirm', wait=10)
    d.expect('choice', 'overwrite prompt')
    d.press('cancel', wait=10)               # keep it
    d.expect('loadGame')
    d.press('cancel')
    d.expect('menu')
    d.press('down')
    d.press('confirm', wait=10)              # Quit -> choice
    d.expect('choice')
    d.press('cancel')                        # Stay
    d.expect('menu')
    d.press('cancel')
    d.expect(STAGE)


def path_dialog_choice(d):
    new_game(d)
    d.run("window.__res = 'pending'; LQ_DEBUG.engine.pushAwait('dialog', {who: 'mael', text: 'Pick one.', choices: ['Alpha', 'Beta', 'Gamma']}).then((v) => { window.__res = v; })")
    d.frames(80)
    d.expect('dialog')
    assert d.state()['choiceIndex'] == 0, 'choices are open at once with instant text'
    d.press('down'); d.press('confirm', wait=6)
    d.expect(STAGE)
    assert d.ev('window.__res') == 1, 'chosen index 1'
    d.run("window.__res = 'pending'; LQ_DEBUG.engine.pushAwait('dialog', {who: null, text: 'One. Two. Three.', choices: ['Yes', 'No']}).then((v) => { window.__res = v; })")
    d.frames(40); d.press('cancel', wait=6)
    assert d.ev('window.__res') == 1, 'cancel picks the last option'
    d.run("window.__res = 'pending'; LQ_DEBUG.engine.pushAwait('dialog', {boxes: [{who: 'mira', text: 'A'}, {who: 'bram', text: 'B'}]}).then((v) => { window.__res = v; })")
    d.frames(20); d.press('confirm', wait=8); d.expect('dialog', 'second box'); d.press('confirm', wait=8)
    d.expect(STAGE)
    assert d.ev('window.__res') is None


def path_shop(d):
    new_game(d)
    d.run("LQ_DEBUG.engine.pushAwait('shop', {shopId: 'willowmere_items'})")
    d.frames(6)
    d.expect('shop')
    d.press('confirm')                       # Buy -> list
    d.press('confirm')                       # Potion -> qty
    d.press('right'); d.press('confirm')     # buy 2
    assert d.ev('LQ_DEBUG.engine.game.items.potion') == 7
    assert d.ev('LQ_DEBUG.engine.game.gold') == 460
    d.press('cancel')                        # back to commands
    d.press('right')                         # Sell
    d.press('confirm')
    d.press('confirm')                       # sell potions qty picker
    d.press('confirm')                       # sell 1
    assert d.ev('LQ_DEBUG.engine.game.items.potion') == 6
    d.press('cancel'); d.press('right')      # Leave
    d.press('confirm')
    d.expect(STAGE, 'left the shop')
    d.run("LQ_DEBUG.engine.pushAwait('shop', {shopId: 'willowmere_smithy'})")
    d.frames(6)
    d.press('cancel')
    d.expect(STAGE, 'cancel on the command row leaves')


def path_inn(d):
    new_game(d)
    d.run("LQ_DEBUG.engine.game.map = 'inn'; window.__res = 'pending'; LQ_DEBUG.engine.pushAwait('inn', {price: 10}).then((v) => { window.__res = v; })")
    d.frames(60)
    d.expect('dialog')
    d.press('cancel', wait=10)               # Not tonight
    d.expect(STAGE)
    assert d.ev('window.__res') is False
    d.run("window.__res = 'pending'; LQ_DEBUG.engine.pushAwait('inn', {price: 10}).then((v) => { window.__res = v; })")
    d.frames(60); d.press('confirm', wait=10)   # Rest
    d.page.wait_for_function("window.__res !== 'pending' || LQ_DEBUG.scene() === 'dialog'", timeout=20000)
    if d.scene() == 'dialog':
        d.press('confirm', wait=10)
    d.page.wait_for_function("window.__res !== 'pending'", timeout=20000)
    assert d.ev('window.__res') is True
    hp = d.ev('LQ_DEBUG.engine.game.party[0].hp')
    assert hp == d.ev('LQ_DEBUG.state().game.party[0].hp') and hp > 50, 'full heal'
    assert d.ev('LQ_DEBUG.engine.game.gold') == 490


def path_title_flow(d):
    d.run("localStorage.clear(); LQ_DEBUG.reset('title')")
    d.frames(10)
    d.expect('title')
    d.press('down')                          # Continue (disabled)
    d.press('confirm')
    d.expect('title', 'disabled Continue buzzes')
    d.press('down'); d.press('confirm', wait=10)   # Config
    d.expect('config')
    d.press('cancel'); d.expect('title')
    d.press('up'); d.press('up'); d.press('confirm', wait=60)   # New Game -> name entry (fade)
    d.expect('nameEntry')
    for _ in range(4):
        d.press('cancel')                    # erase "Hero"
    assert d.state()['value'] == ''
    d.press('cancel', wait=50)               # empty + cancel -> title
    d.expect('title')
    d.press('confirm', wait=60)
    d.expect('nameEntry')
    d.press('start', wait=70)                # done with default name -> prologue
    d.expect('prologue')
    d.press('start', wait=120)               # skip all -> stage (no field scene in a UI-only build) or field
    assert d.scene() in (STAGE, 'field'), f'prologue hands off, got {d.scene()}'
    assert d.ev('LQ_DEBUG.engine.game.heroName') == 'Hero'


def path_gameover_credits_cards(d):
    new_game(d)
    d.run("LQ_DEBUG.engine.push('gameover')")
    d.frames(170)
    d.expect('gameover')
    d.press('down'); d.press('down'); d.press('confirm', wait=70)   # Title
    d.expect('title')
    new_game(d)
    d.run("window.__res = 'pending'; LQ_DEBUG.engine.pushAwait('credits').then((v) => { window.__res = v; })")
    d.frames(20); d.expect('credits')
    d.press('start', wait=80)
    d.expect(STAGE, 'credits pop on start')
    d.run("window.__res = 'pending'; LQ_DEBUG.engine.pushAwait('titleCard', {text: 'Card', frames: 600}).then((v) => { window.__res = v; })")
    d.frames(30); d.expect('titleCard')
    d.press('confirm', wait=40)
    d.expect(STAGE, 'title card skips on confirm')
    assert d.ev('window.__res') is True


PATHS = {
    'menu_open_close': path_menu_open_close,
    'menu_items': path_menu_items,
    'menu_member_screens': path_menu_member_screens,
    'menu_journal_talk': path_menu_journal_talk,
    'menu_config_save_quit': path_menu_config_save_quit,
    'dialog_choice': path_dialog_choice,
    'shop': path_shop,
    'inn': path_inn,
    'title_flow': path_title_flow,
    'gameover_credits_cards': path_gameover_credits_cards,
}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--only', default='')
    args = ap.parse_args()
    names = [n for n in args.only.split(',') if n] or list(PATHS)
    watchdog(600)
    server = start_server()
    base = f'http://127.0.0.1:{server.server_port}/next/index.html?debug=1&fps=0'
    from playwright.sync_api import sync_playwright
    failures = 0
    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width': 1280, 'height': 720})
        context.set_default_timeout(15000)
        for name in names:
            page = context.new_page()
            errors = []
            page.on('console', lambda m, errors=errors: errors.append(m.text) if m.type == 'error' and 'Failed to load resource' not in m.text else None)
            page.on('pageerror', lambda e, errors=errors: errors.append(str(e)))
            t0 = time.time()
            status, detail = 'ok', ''
            try:
                page.goto(base, wait_until='load')
                page.wait_for_function('window.LQ_DEBUG && true')
                page.evaluate('LQ_DEBUG.ready()')
                page.wait_for_function("LQ_DEBUG.engine.hasScene('config') && LQ_DEBUG.commands().includes('newGame')", timeout=20000)
                page.evaluate("LQ_DEBUG.settings({textSpeed: 4, reduceMotion: true})")
                PATHS[name](Driver(page))
                eng = page.evaluate('LQ_DEBUG.errors()')
                if eng:
                    errors.extend(f'engine: {e["msg"]}' for e in eng)
            except Exception as e:  # noqa: BLE001
                status, detail = 'FAIL', str(e).splitlines()[0][:400]
            if errors:
                status = 'FAIL'
                detail = (detail + ' | ' if detail else '') + ' | '.join(errors[:4])
            if status != 'ok':
                failures += 1
            print(f'{status:<4} {name:<26} {int((time.time() - t0) * 1000):>6} ms  {detail}', flush=True)
            page.close()
        browser.close()
    server.shutdown()
    print(f'\n{len(names) - failures}/{len(names)} paths ok')
    return 1 if failures else 0


if __name__ == '__main__':
    sys.exit(main())
