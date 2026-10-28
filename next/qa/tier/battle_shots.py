"""H7-hard-road: a Fine Print battle, looked at. A Lv 14 party on a tier_1 game meets the valley wolves and the Archivore
(both lifted); PNGs of the battle start and a few turns in, desktop and phone, plus the units' numbers next to the same fight
off the tier. Exit 1 on any console or page error. Output: qa/out/tier/<device>-battle-*.png (git-ignored).

    python qa/tier/battle_shots.py            both devices
"""
import json
import pathlib
import sys

HERE = pathlib.Path(__file__).resolve().parent
QA = HERE.parent
sys.path.insert(0, str(QA))
import shots  # noqa: E402

OUT = QA / 'out' / 'tier'
DEVICES = {
    'desktop': {'width': 1920, 'height': 1080, 'dpr': 1},
    'phone': {'width': 844, 'height': 390, 'dpr': 3, 'mobile': True, 'touch': True},
}
UNITS = "(() => { const b = LQ_ENGINE.stack.find((s) => s.name === 'battle'); return b && b.b ? b.b.units().filter((u) => u.side === 'enemy').map((u) => [u.id, u.maxHp, u.stats.atk, u.stats.spd]) : null; })()"


def run(device):
    from playwright.sync_api import sync_playwright
    errors, out = [], {}
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

        def frames(n):
            start = page.evaluate('LQ_ENGINE.frame')
            page.wait_for_function(f'LQ_ENGINE.frame >= {start + int(n)}', timeout=30000, polling=10)

        for tier in (False, True):
            flags = {'tier_1': True} if tier else {}
            for enc in ('valley_wolves', 'archivore'):
                page.evaluate(f"LQ_DEBUG.newGame('Arden', {{ scene: 'none', party: ['mira', 'bram'], level: 14, gear: [], flags: {json.dumps(flags)} }})")
                if tier:
                    page.evaluate("LQ_PACKS.ensurePack('tier')")
                    page.wait_for_function('!!globalThis.LQ_TIER')
                page.evaluate(f"LQ_DEBUG.battle('{enc}', {{ seed: 3 }})")
                page.wait_for_function("LQ_DEBUG.scene() === 'battle'")
                frames(150)
                tag = f'{device}-battle-{"tier" if tier else "base"}-{enc}'
                if tier:
                    page.locator('#game').screenshot(path=str(OUT / f'{tag}.png'))
                out[tag] = page.evaluate(UNITS)
                page.evaluate("LQ_ENGINE.reset('title')")
                frames(10)
        browser.close()
    server.shutdown()
    print(json.dumps({'device': device, 'units': out, 'errors': errors}, indent=1))
    return 0 if not errors else 1


if __name__ == '__main__':
    shots.watchdog(600)
    devs = sys.argv[1:] or ['desktop', 'phone']
    sys.exit(max(run(d) for d in devs))
