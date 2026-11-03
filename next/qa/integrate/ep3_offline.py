"""Episode 3 offline check (E3-integrate seam 2): the ep3 pack and the Episode 3 field code are runtime-cached once loaded and
play offline after one visit, and none of it is in the precache.

One online visit with ?pack=ep3 (the pack forced on whatever EP3_LIVE says): the worker installs and takes control, the pack
loads (its register() also imports src/world/ep3/), and the idle warm fetches every file in assets/pack_files.json's ep3 list
through the worker into lq-next-runtime-v1. Then the context goes offline, the page reloads, the pack comes up ready from that
cache, and src/world/ep3/index.js imports offline.

    python next/qa/integrate/ep3_offline.py          exit 1 on any failure; qa/integrate/out/ep3_offline.json
"""
import json
import pathlib
import sys
import time

HERE = pathlib.Path(__file__).resolve().parent
NEXT = HERE.parents[1]
sys.path.insert(0, str(NEXT / 'qa'))
import shots  # noqa: E402

OUT = HERE / 'out'


def poll(page, js, timeout=60):
    t0 = time.time()
    while time.time() - t0 < timeout:
        v = page.evaluate(js)
        if v:
            return v
        page.wait_for_timeout(500)
    raise TimeoutError(js[:80])


def main():
    from playwright.sync_api import sync_playwright
    shots.watchdog(600)
    lists = json.loads((NEXT / 'assets' / 'pack_files.json').read_text(encoding='utf-8'))
    world = sorted(p.relative_to(NEXT).as_posix() for p in (NEXT / 'src' / 'world' / 'ep3').glob('*.js') if not p.name.startswith('_'))
    want = sorted(set(lists['ep3']) | set(world))
    sw = (NEXT / 'sw.js').read_text(encoding='utf-8')
    precached = [f for f in want if f"'{f}'," in sw]
    server = shots.start_server()
    base = f'http://127.0.0.1:{server.server_port}'
    report, errors = {'files': len(want), 'precached': precached}, []
    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True)
        ctx = browser.new_context(viewport={'width': 1280, 'height': 720})
        page = ctx.new_page()
        page.on('pageerror', lambda e: errors.append(f'pageerror: {e}'))
        page.on('console', lambda m: errors.append(f'console.error: {m.text}') if m.type == 'error' else None)

        def boot():
            page.wait_for_function('window.LQ_ENGINE && window.LQ_ENGINE.bootScene && window.LQ_ENGINE.bootScene.waiting', timeout=60000)
            page.keyboard.press('Enter')
            page.wait_for_function('window.LQ_ENGINE.scene && window.LQ_ENGINE.scene.name !== "_boot"', timeout=60000)

        page.goto(base + '/next/index.html?pack=ep3', wait_until='load')
        boot()
        poll(page, "() => !!(window.LQ_PACKS && window.LQ_PACKS.packReady('ep3'))", timeout=60)
        poll(page, 'async () => { const r = await navigator.serviceWorker.getRegistration(); return !!(r && r.active && navigator.serviceWorker.controller); }', timeout=90)
        # the pack's register() fetches the field code again once the worker controls the page (no help from this script)
        js = ("async () => { const c = await caches.open('lq-next-runtime-v1'); const keys = (await c.keys()).map(r => new URL(r.url).pathname);"
              " const want = %s; return want.filter(w => !keys.some(k => k.endsWith('/next/' + w))); }" % json.dumps(want))
        missing = want
        t0 = time.time()
        while time.time() - t0 < 90:
            missing = page.evaluate(js)
            if not missing:
                break
            page.wait_for_timeout(1000)
        report['missing_online'] = missing
        ctx.set_offline(True)
        page.reload(wait_until='load')
        boot()
        try:
            poll(page, "() => !!(window.LQ_PACKS && window.LQ_PACKS.packReady('ep3'))", timeout=30)
            report['offline_ready'] = True
        except TimeoutError:
            report['offline_ready'] = False
        report['offline_world_import'] = page.evaluate("import('./src/world/ep3/index.js').then((m) => typeof m.attach === 'function', () => false)")
        report['offline_map'] = page.evaluate("import('./src/data/maps/ep3/foundry_f3.js').then((m) => m.default.id, () => null)")
        report['controlled'] = page.evaluate('!!navigator.serviceWorker.controller')
        browser.close()
    server.shutdown()
    # the offline reload logs failed network fetches for music and art that only stream online: those are not pack failures
    report['errors'] = [e for e in errors if 'net::ERR_INTERNET_DISCONNECTED' not in e and 'Failed to load resource' not in e]
    ok = not precached and not report['missing_online'] and report['offline_ready'] and report['offline_world_import'] and report['offline_map'] == 'foundry_f3' and not report['errors']
    report['ok'] = bool(ok)
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / 'ep3_offline.json').write_text(json.dumps(report, indent=1), encoding='utf-8')
    print(json.dumps(report, indent=1))
    print('EP3_OFFLINE:', 'ok' if ok else 'FAIL')
    return 0 if ok else 1


if __name__ == '__main__':
    sys.exit(main())
