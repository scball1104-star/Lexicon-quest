"""H7-hard-road: Fine Print on the title, looked at. Seeds a finished Episode 2 record (the Episode 3 quick start's party) into
record 2, boots the game, waits for the tier row, and saves PNGs of the title with the row highlighted, the record ask, the
terms, and the first frame of the cold open, on desktop (1920x1080) and phone landscape (844x390 @3, touch). Exit 1 on any
console or page error. Output: qa/out/tier/<device>-*.png (git-ignored).

    python qa/tier/title_shots.py            both devices
    python qa/tier/title_shots.py phone      one
"""
import json
import pathlib
import sys
import time

HERE = pathlib.Path(__file__).resolve().parent
QA = HERE.parent
sys.path.insert(0, str(QA))
import shots  # noqa: E402  (static server over the repo root)

OUT = QA / 'out' / 'tier'
DEVICES = {
    'desktop': {'width': 1920, 'height': 1080, 'dpr': 1},
    'phone': {'width': 844, 'height': 390, 'dpr': 3, 'mobile': True, 'touch': True},
}
SEED = """async () => {
  const g = LQ_DEBUG.newGameEp3('Arden', { slot: 2, scene: 'none' });
  const game = LQ_ENGINE.game;
  const meta = { name: game.heroName, level: game.party[0].level, map: game.map, playtime: 21600, chapter: game.chapter, gold: game.gold, party: game.party.map((m) => m.id) };
  LQ_ENGINE.save.save(2, JSON.parse(JSON.stringify(game)), meta);
  LQ_ENGINE.game = null;
  LQ_ENGINE.reset('title');
  return g;
}"""


def run(device):
    from playwright.sync_api import sync_playwright
    errors = []
    server = shots.start_server()
    OUT.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as pw:
        dev = DEVICES[device]
        browser = pw.chromium.launch(headless=True)
        ctx = browser.new_context(viewport={'width': dev['width'], 'height': dev['height']}, device_scale_factor=dev['dpr'],
                                  is_mobile=dev.get('mobile', False), has_touch=dev.get('touch', False))
        page = ctx.new_page()
        page.set_default_timeout(30000)
        page.on('console', lambda m: errors.append(f'console.{m.type}: {m.text}') if m.type == 'error' else None)
        page.on('pageerror', lambda e: errors.append(f'pageerror: {e}'))
        page.add_init_script('(() => { try { localStorage.clear(); localStorage.setItem("lq-next-settings", JSON.stringify({ rotateHintSeen: true })); } catch (e) {} })()')
        page.goto(f'http://127.0.0.1:{server.server_port}/next/index.html?debug=1&fps=0', wait_until='load')
        page.wait_for_function('window.LQ_DEBUG && true')
        page.evaluate('Promise.race([LQ_DEBUG.ready(), new Promise((_, no) => setTimeout(() => no(new Error("ready timeout")), 30000))])')
        page.evaluate(SEED)
        page.wait_for_function("LQ_DEBUG.scene() === 'title' && ((LQ_DEBUG.state().sceneState || {}).items || []).includes('tier')", timeout=20000)
        ss = page.evaluate('LQ_DEBUG.state().sceneState')
        items = ss['items']

        def frames(n):
            start = page.evaluate('LQ_ENGINE.frame')
            page.wait_for_function(f'LQ_ENGINE.frame >= {start + int(n)}', timeout=20000, polling=10)

        def tap(action, n=1):
            for _ in range(n):
                page.evaluate(f'LQ_DEBUG.press("{action}", 2)')
                frames(6)

        shot = lambda label: page.locator('#game').screenshot(path=str(OUT / f'{device}-{label}.png'))
        frames(20)
        shot('title')
        tap('down', items.index('tier') - (ss.get('index') or 0))
        frames(10)
        shot('title-row')
        tap('confirm')
        page.wait_for_function("LQ_DEBUG.scene() === 'finePrint'")
        frames(12)
        shot('ask-records')
        st = page.evaluate('LQ_DEBUG.state().sceneState')
        tap('confirm')                          # the first record
        frames(12)
        shot('ask-terms')
        st2 = page.evaluate('LQ_DEBUG.state().sceneState')
        tap('down')                             # Back -> Begin
        tap('confirm')
        page.wait_for_function("(() => { const f = LQ_ENGINE.stack.find(s => s.name === 'field'); return LQ_DEBUG.scene() === 'field' && !!(f && f.map && f.map.id === 'bell_tower'); })()", timeout=30000)
        frames(90)
        shot('cold-open')
        g = page.evaluate('({ tier: LQ_ENGINE.game.tier, flags: LQ_ENGINE.game.flags, party: LQ_ENGINE.game.party.map(m => [m.id, m.level]), reserve: LQ_ENGINE.game.reserve.map(m => [m.id, m.level]), slot: LQ_ENGINE.game.autosaveSlot, hook: !!globalThis.LQ_TIER })')
        browser.close()
    server.shutdown()
    print(json.dumps({'device': device, 'items': items, 'ask': st, 'terms': st2, 'game': g, 'errors': errors}, indent=1))
    return 0 if not errors else 1


if __name__ == '__main__':
    shots.watchdog(600)
    devs = sys.argv[1:] or ['desktop', 'phone']
    sys.exit(max(run(d) for d in devs))
