"""Capture a battle frame while a party-member damage popup is live (checks party numbers show). Dev tool."""
import pathlib, sys
HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))
from shots import start_server, watchdog
from w13_hud import crop, DEFEND_STEP, WAIT_MENU
OUT = HERE / 'out'; OUT.mkdir(exist_ok=True)
tag = sys.argv[1] if len(sys.argv) > 1 else 'x'
watchdog(300)
server = start_server()
base = f'http://127.0.0.1:{server.server_port}/next/index.html?debug=1&fps=0'
from playwright.sync_api import sync_playwright
with sync_playwright() as pw:
    b = pw.chromium.launch(headless=True, args=['--autoplay-policy=no-user-gesture-required'])
    ctx = b.new_context(viewport={'width': 1152, 'height': 648})
    page = ctx.new_page()
    page.add_init_script('(() => { try { localStorage.clear(); } catch (e) {} })()')
    page.goto(base, wait_until='load'); page.wait_for_function('window.LQ_DEBUG && true')
    page.evaluate('LQ_DEBUG.ready()'); page.evaluate('LQ_DEBUG.setSpeed(0)')
    page.evaluate("LQ_DEBUG.battle('archivore', { fresh: true, seed: 2 })")
    page.evaluate('LQ_DEBUG.advance(60)')
    got = 0
    for i in range(3000):
        n = page.evaluate("LQ_ENGINE.scene.pops.list.filter(p => p.kind !== 'word').length")
        if n and i > 0:
            side = page.evaluate("(() => { const s = LQ_ENGINE.scene; return s.pops.list.map(p => p.text + '@' + p.x + ',' + p.y); })()")
            print('pops', side)
            page.evaluate('LQ_DEBUG.advance(8)')
            got += 1
            crop(page, OUT / f'party_pop_{tag}_{got}.png', 1)
            if got >= 2: break
            page.evaluate('LQ_DEBUG.advance(60)')
            continue
        st = page.evaluate(DEFEND_STEP)
        page.evaluate('LQ_DEBUG.advance(3)')
    for _ in range(600):
        if page.evaluate(WAIT_MENU): break
        page.evaluate('LQ_DEBUG.advance(5)')
    page.evaluate('LQ_DEBUG.advance(30)')
    crop(page, OUT / f'party_turn_{tag}.png', 1)
    b.close()
server.shutdown()
