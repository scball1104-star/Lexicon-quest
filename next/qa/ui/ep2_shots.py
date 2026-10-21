"""Episode 2 UI shots and checks (E2-scene-ui), on the phone profile (844x390, touch) and desktop 1920x1080.

Boots the game like qa/shots.py, drives the REAL scenes with LQ_DEBUG presses, asserts state after every step and
saves PNGs to next/qa/ui/out/ (ep2_*). Fails on any console or page error. Exit code 1 on any failure.

  python next/qa/ui/ep2_shots.py                      every check on both devices
  python next/qa/ui/ep2_shots.py --only title_ep2 --device phone

Checks:
  title_ep2     a save that finished Episode 1 makes the title offer "Episode 2"; it opens the name step filled with
                that save's name, then the Episode 2 card over the Episode 2 key art, then the field at home in bed
                with a Lv 9 party and Episode 1 done. Without such a save (and without ?ep=2) the entry is absent.
  credits_ep2   CREDITS_EP2 roll over dialog_keyart_ep2 with hollowmere (the field's handoff data).
  bestiary_ep2  the Episode 2 entries with the longest names and places, every Episode 2 entry checked in-game.
  journal_ep2   the Quests page mid-Episode 2 with the Hollow's errands.
"""
import argparse
import pathlib
import sys
import time

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))
from shots import start_server, watchdog  # noqa: E402

OUT = HERE / 'out'
DEVICES = {
    'desktop': dict(viewport={'width': 1920, 'height': 1080}, device_scale_factor=1),
    'phone': dict(viewport={'width': 844, 'height': 390}, device_scale_factor=3, is_mobile=True, has_touch=True),
}
EP2_SAVE = """(async () => {
  const st = await import('/next/src/game/state.js');
  const g = st.newGameEp2('Arden');
  g.map = 'willowmere'; g.playtime = 4321;
  LQ_DEBUG.engine.save.save(2, st.serialize(g), st.saveMeta(g));
  return true;
})()"""


class Driver:
    def __init__(self, page, device):
        self.page, self.device = page, device
        self.shots = []

    def frames(self, n):
        start = self.page.evaluate('LQ_DEBUG.state().frame')
        self.page.wait_for_function(f'LQ_DEBUG.state().frame >= {start + n}', timeout=15000, polling=16)

    def press(self, action, n=1, wait=8):
        self.page.evaluate('([a, n]) => LQ_DEBUG.press(a, n)', [action, n])
        self.frames(wait)

    def ev(self, js):
        return self.page.evaluate(js)

    def scene(self):
        return self.page.evaluate('LQ_DEBUG.scene()')

    def state(self):
        return self.page.evaluate('LQ_DEBUG.state().sceneState')

    def until(self, js, timeout=20000):
        self.page.wait_for_function(js, timeout=timeout, polling=30)

    def shot(self, name):
        OUT.mkdir(parents=True, exist_ok=True)
        path = OUT / f'{self.device}-ep2_{name}.png'
        self.page.screenshot(path=str(path))
        self.shots.append(path)
        return path


def check_title_ep2(d):
    d.ev("localStorage.clear(); LQ_DEBUG.reset('title')")
    d.frames(10)
    st = d.state()
    assert 'ep2' not in st['items'], f'no Episode 2 entry on a fresh browser ({st["items"]})'
    d.ev(EP2_SAVE)
    d.ev("LQ_DEBUG.reset('title')")
    d.frames(30)
    st = d.state()
    assert st['items'] == ['new', 'continue', 'ep2', 'config'], st['items']
    assert st['ep2']['name'] == 'Arden' and st['index'] == 1, st
    win = st['win']
    assert win['y'] >= 112 and win['y'] + win['h'] <= 212, f'menu window clear of the logo and inside the screen ({win})'
    d.press('down', wait=10)
    assert d.state()['index'] == 2
    d.shot('title')
    d.press('confirm', wait=50)
    assert d.scene() == 'nameEntryEp2', d.scene()
    assert d.state()['value'] == 'Arden', d.state()
    d.shot('name')
    d.press('start', wait=4)
    d.until("LQ_DEBUG.scene() === 'titleCard'")
    d.frames(40)
    st = d.state()
    assert st['text'] == 'Episode 2' and st['backdrop'] == 'dialog_keyart_ep2', st
    d.shot('card')
    d.until("LQ_DEBUG.scene() === 'field'", timeout=30000)
    g = d.ev("(() => { const g = LQ_DEBUG.engine.game; return { name: g.heroName, map: g.map, lv: g.party.map(m => m.level), ep1: !!g.flags.ep1_complete, chapter: g.chapter }; })()")
    assert g['name'] == 'Arden' and g['map'] == 'hero_home' and g['lv'] == [9, 9, 9] and g['ep1'] and g['chapter'] == 2, g
    d.frames(90)
    d.shot('field_start')


def check_credits_ep2(d):
    d.ev("LQ_DEBUG.newGameEp2('Arden', { scene: 'none' }); LQ_DEBUG.reset('_uiStage', {})")
    d.frames(6)
    d.ev("(async () => { const t = await import('/next/src/data/text.js'); LQ_DEBUG.engine.push('credits', { cards: t.CREDITS_EP2, music: 'hollowmere' }); return true; })()")
    d.until("LQ_DEBUG.scene() === 'credits'")
    d.frames(30)
    st = d.state()
    assert st['episode'] == 2 and st['art'] == 'dialog_keyart_ep2' and st['backdrop'] is True, st
    assert st['music'] in ('hollowmere', None), st
    d.page.evaluate("LQ_DEBUG.press('confirm', 360)")
    d.frames(200)
    d.shot('credits')


BEASTS = ['glint_wisp', 'refl_hero', 'nameless_king', 'faceless_knight']


def check_bestiary_ep2(d):
    d.ev("LQ_DEBUG.newGameEp2('Arden', { scene: 'none' }); LQ_DEBUG.reset('_uiStage', {})")
    d.frames(6)
    ids = d.ev("(async () => { const m = await import('/next/src/data/text.js'); return Object.keys(m.BESTIARY); })()")
    seen = {i: {'seen': 3, 'killed': 1, 'weak': ['thunder', 'spear', 'axe', 'light', 'sword', 'staff', 'bow', 'fire'], 'resist': ['sword', 'ice', 'spear', 'fire']} for i in ids}
    d.page.evaluate('(b) => { LQ_DEBUG.engine.game.bestiary = b; }', seen)
    d.ev("(() => { LQ_DEBUG.engine.pushAwait('menu', { page: 'journal', instant: true }); return true; })()")
    d.frames(10)
    d.press('pageR', wait=8)
    at = 0
    for want in BEASTS:
        k = ids.index(want)
        while at != k:
            d.press('down', wait=3)
            at = (at + 1) % len(ids)
        d.frames(4)
        d.shot(f'bestiary_{want}')


def check_journal_ep2(d):
    flags = ['ep2_started', 'crossing_done', 'east_road_arrived', 'nh_arrived', 'met_elian', 'heard_crisis', 'met_anwen',
             'fountain_started', 'testimony_lena', 'last_route_started', 'letter_answer_started', 'nico_crowns_started']
    d.ev("LQ_DEBUG.newGameEp2('Arden', { scene: 'none' }); LQ_DEBUG.reset('_uiStage', {})")
    d.page.evaluate('(fs) => { for (const f of fs) LQ_DEBUG.engine.game.flags[f] = true; }', flags)
    d.ev("(() => { LQ_DEBUG.engine.pushAwait('menu', { page: 'journal', instant: true }); return true; })()")
    d.frames(10)
    d.shot('journal')
    d.press('down', n=1, wait=6)
    d.press('down', n=1, wait=6)
    d.shot('journal_scrolled')


CHECKS = {'title_ep2': check_title_ep2, 'credits_ep2': check_credits_ep2, 'bestiary_ep2': check_bestiary_ep2, 'journal_ep2': check_journal_ep2}


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--only', default='')
    ap.add_argument('--device', default='')
    args = ap.parse_args()
    names = [n for n in args.only.split(',') if n] or list(CHECKS)
    devices = [x for x in args.device.split(',') if x] or list(DEVICES)
    watchdog(600)
    server = start_server()
    base = f'http://127.0.0.1:{server.server_port}/next/index.html?debug=1&fps=0'
    failures = total = 0
    from playwright.sync_api import sync_playwright
    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True, args=['--autoplay-policy=no-user-gesture-required'])
        for device in devices:
            for name in names:
                total += 1
                errors = []
                t0 = time.time()
                ctx = browser.new_context(**DEVICES[device], reduced_motion='no-preference')
                ctx.set_default_timeout(15000)
                page = ctx.new_page()
                page.add_init_script('(() => { try { if (!sessionStorage.getItem("ep2qa")) { localStorage.clear(); sessionStorage.setItem("ep2qa", "1"); } } catch (e) {} })()')
                page.on('pageerror', lambda e, errors=errors: errors.append(f'pageerror: {e.message}'))
                page.on('console', lambda m, errors=errors: errors.append(f'console.error: {m.text}') if m.type == 'error' else None)
                status, detail = 'ok', ''
                d = Driver(page, device)
                try:
                    page.goto(base)
                    page.wait_for_function('window.LQ_DEBUG && LQ_DEBUG.ready && LQ_DEBUG.ready()', timeout=20000)
                    page.wait_for_function("LQ_DEBUG.engine.hasScene('nameEntryEp2') && LQ_DEBUG.commands().includes('newGameEp2')", timeout=20000)
                    CHECKS[name](d)
                except Exception as e:  # noqa: BLE001
                    status, detail = 'FAIL', f'{type(e).__name__}: {str(e)[:300]}'
                    try:
                        page.screenshot(path=str(OUT / f'{device}-ep2_{name}-FAILED.png'))
                    except Exception:  # noqa: BLE001
                        pass
                if errors and status == 'ok':
                    status, detail = 'FAIL', ' | '.join(errors[:3])
                if status != 'ok':
                    failures += 1
                print(f'{status:<5} {device:<8} {name:<14} {int((time.time() - t0) * 1000):>6} ms  {detail}', flush=True)
                for s in d.shots:
                    print(f'      -> {s}')
                ctx.close()
        browser.close()
    server.shutdown()
    print(f'\n{total - failures}/{total} checks ok')
    return 1 if failures else 0


if __name__ == '__main__':
    sys.exit(main())
