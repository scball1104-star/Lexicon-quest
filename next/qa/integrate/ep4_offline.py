"""Episode 4 offline check (E4-integrate, EPISODE4_PLAN 12 budget: "packoffline with ?pack=ep4"): the ep4 pack (code, maps,
art fragments, pack audio) is runtime-cached once loaded and comes up offline after one visit, and none of it is precached.
The ep3_offline.py pattern: one online visit with ?pack=ep4 (forced on whatever EP4_LIVE says; the ep3 pack comes too, the
ep4 maps registry awaits it), the worker takes control, the idle warm fetches every file in assets/pack_files.json's ep4 list
into lq-next-runtime-v1; offline reload; the pack is ready from that cache and a keep map imports offline.
(pwa.py --only packoffline hard-codes ?pack=x1,x2, so it does not cover ep4.)

    python next/qa/integrate/ep4_offline.py          exit 1 on any failure; qa/integrate/out/ep4_offline.json
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
    want = sorted(f for f in lists['ep4'] if not f.endswith(('.mp3', '.wav')))     # music and pack sfx stream (runtime, on use)
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

        page.goto(base + '/next/index.html?pack=ep4', wait_until='load')
        boot()
        poll(page, "() => !!(window.LQ_PACKS && window.LQ_PACKS.packReady('ep4'))", timeout=60)
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
            poll(page, "() => !!(window.LQ_PACKS && window.LQ_PACKS.packReady('ep4'))", timeout=30)
            report['offline_ready'] = True
        except TimeoutError:
            report['offline_ready'] = False
        report['offline_world_import'] = page.evaluate("import('./src/data/ep4/field/events.js').then((m) => typeof m.attach === 'function', () => false)")
        report['offline_map'] = page.evaluate("import('./src/data/maps/ep4_keep_f3.js').then((m) => m.default.id, () => null)")
        report['controlled'] = page.evaluate('!!navigator.serviceWorker.controller')
        browser.close()
    server.shutdown()
    # the offline reload logs failed network fetches for music and art that only stream online: those are not pack failures
    report['errors'] = [e for e in errors if 'net::ERR_INTERNET_DISCONNECTED' not in e and 'Failed to load resource' not in e]
    ok = not precached and not report['missing_online'] and report['offline_ready'] and report['offline_world_import'] and report['offline_map'] == 'ep4_keep_f3' and not report['errors']
    report['ok'] = bool(ok)
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / 'ep4_offline.json').write_text(json.dumps(report, indent=1), encoding='utf-8')
    print(json.dumps(report, indent=1))
    print('EP4_OFFLINE:', 'ok' if ok else 'FAIL')
    return 0 if ok else 1


if __name__ == '__main__':
    sys.exit(main())
