"""PWA checks for Lexicon Quest NEXT (W6-pwa): loading screen, size table, offline reload, debug runs.

Serves the REPO ROOT (so ../assets/... resolves) on a free port and drives headless Chromium:

  1. loading   a fresh visit throttled to 10 Mbps / 40 ms (docs/PWA.md budget). Captures the loading screen at
               0 %, 50 % and 100 % (the "Tap or press any key" prompt) to qa/pwa/out/<device>-loading-<pct>.png and
               measures time to the first frame, time to the tap prompt and the bytes downloaded by then.
  2. offline   one online visit (service worker installs and precaches), then the context goes offline and the
               page is reloaded: the shell, scenes and art must come from the worker and reach the title.
  3. retry     a blocked critical asset shows the retry prompt (qa/pwa/out/desktop-loading-error.png); a press recovers.
  4. update    a changed sw.js installs beside the old one, waits, and the game shows the "Update ready" toast.
  5. debug     ?debug=1 runs must never install a worker (shots.py and every QA harness rely on this).
  6. packoffline  XP-packs: a visit with ?pack=x1,x2 loads both expansion packs (forced on while their switches are off), the
               worker's runtime cache ends up holding every file in assets/pack_files.json, and after going offline a
               reload still brings both packs up (ready) from that cache. The pack files were never precached.

  python next/qa/pwa/pwa.py                  all three checks
  python next/qa/pwa/pwa.py --only loading   or: retry, offline, update, debug, packoffline (comma list)
  python next/qa/pwa/pwa.py --mbps 10        throttle for check 1 (0 = unthrottled)

Writes qa/pwa/out/pwa-report.json (timings and the bytes table). Exit code 1 on any failed check.
"""
import argparse
import gzip
import http.server
import json
import os
import pathlib
import socketserver
import sys
import threading
import time
import urllib.parse
from urllib.parse import urlparse

ROOT = pathlib.Path(__file__).resolve().parents[3]
NEXT = ROOT / 'next'
OUT = pathlib.Path(__file__).resolve().parent / 'out'

MIME = {
    '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.webp': 'image/webp',
    '.png': 'image/png', '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.html': 'text/html', '.css': 'text/css',
    '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json',
}
DEVICES = {
    'desktop': {'width': 1280, 'height': 720, 'dpr': 1, 'mobile': False},
    'phone': {'width': 390, 'height': 844, 'dpr': 2, 'mobile': True},
}


GZIP_EXT = {'.js', '.mjs', '.json', '.html', '.css', '.svg', '.webmanifest'}
_gz = {}


class Handler(http.server.SimpleHTTPRequestHandler):
    protocol_version = 'HTTP/1.1'
    sw_version = None        # when set, /next/sw.js is served with this SHELL_VERSION (simulates a new deploy)

    def do_GET(self):
        if Handler.sw_version and urlparse(self.path).path.endswith('/next/sw.js'):
            import re
            src = (NEXT / 'sw.js').read_text(encoding='utf-8')
            body = re.sub(r"const SHELL_VERSION = '[^']*';", f"const SHELL_VERSION = '{Handler.sw_version}';", src).encode()
            self.send_response(200)
            self.send_header('Content-Type', 'text/javascript')
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        # GitHub Pages gzips text responses; do the same so the measured bytes match what players download.
        path = urllib.parse.unquote(urlparse(self.path).path)
        full = ROOT / path.lstrip('/')
        if path.endswith('/') and (full / 'index.html').is_file():
            full = full / 'index.html'
        if (full.suffix.lower() in GZIP_EXT and full.is_file() and 'gzip' in self.headers.get('Accept-Encoding', '')):
            key = (str(full), full.stat().st_mtime_ns)
            if key not in _gz:
                _gz[key] = gzip.compress(full.read_bytes(), 6)
            body = _gz[key]
            self.send_response(200)
            self.send_header('Content-Type', MIME.get(full.suffix.lower(), 'application/octet-stream'))
            self.send_header('Content-Encoding', 'gzip')
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        super().do_GET()

    def __init__(self, *a, **k):
        super().__init__(*a, directory=str(ROOT), **k)

    def guess_type(self, path):
        return MIME.get(os.path.splitext(str(path))[1].lower()) or super().guess_type(path)

    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache')
        super().end_headers()

    def log_message(self, *a):
        pass

    def handle(self):
        try:
            super().handle()
        except (ConnectionResetError, BrokenPipeError, ConnectionAbortedError):
            pass


class Server(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True
    allow_reuse_address = True


def start_server():
    s = Server(('127.0.0.1', 0), Handler)
    threading.Thread(target=s.serve_forever, daemon=True).start()
    return s


def category(url):
    """Bucket a request URL for the size table."""
    p = urlparse(url).path
    if '/next/src/' in p: return 'js modules'
    if p.endswith('/index.html') or p.endswith('/next/') or p.endswith('.webmanifest') or p.endswith('/sw.js'): return 'html + pwa'
    if '/assets/audio/sfx/' in p or '/assets/audio/jingles/' in p or '/assets/audio/ambience/' in p: return 'audio sfx/jingles'
    if '/assets/audio/' in p and p.endswith('.mp3'): return 'music'
    if p.endswith('manifest.json') and 'audio' in p: return 'json data'
    if '/assets/art/' in p: return 'painted sheets'
    if p.endswith('.json'): return 'json data'
    if p.endswith(('.png', '.webp')): return 'pixel art'
    return 'other'


class Net:
    """Collects bytes per category from CDP Network events (encodedDataLength = bytes on the wire)."""

    def __init__(self, cdp):
        self.urls = {}
        self.bytes = {}
        self.total = 0
        cdp.on('Network.responseReceived', self._resp)
        cdp.on('Network.loadingFinished', self._done)
        cdp.send('Network.enable')

    def _resp(self, e):
        self.urls[e['requestId']] = e['response']['url']

    def _done(self, e):
        url = self.urls.get(e['requestId'], '')
        n = int(e.get('encodedDataLength') or 0)
        c = category(url)
        self.bytes[c] = self.bytes.get(c, 0) + n
        self.total += n

    def snapshot(self):
        return {'total': self.total, 'by_category': dict(sorted(self.bytes.items()))}


STATE_JS = """() => {
  const e = window.LQ_ENGINE;
  if (!e || !e.bootScene) return null;
  const b = e.bootScene.debugState();
  return { phase: b.phase, percent: b.percent, waiting: b.waiting, frames: e.renderedFrames,
           loaded: e.loaded, lazyDone: e.assets.lazyDone(), failed: b.failed };
}"""


def new_context(browser, dev):
    return browser.new_context(
        viewport={'width': dev['width'], 'height': dev['height']}, device_scale_factor=dev['dpr'],
        is_mobile=dev['mobile'], has_touch=dev['mobile'], reduced_motion='no-preference')


def check_loading(browser, base, dname, mbps, report):
    dev = DEVICES[dname]
    ctx = new_context(browser, dev)
    page = ctx.new_page()
    errors = []
    page.on('pageerror', lambda e: errors.append(f'pageerror: {e}'))
    page.on('console', lambda m: errors.append(f'console.error: {m.text}') if m.type == 'error' else None)
    cdp = ctx.new_cdp_session(page)
    net = Net(cdp)
    if mbps > 0:
        cdp.send('Network.emulateNetworkConditions', {
            'offline': False, 'latency': 40, 'downloadThroughput': mbps * 1024 * 1024 / 8, 'uploadThroughput': mbps * 1024 * 1024 / 16})
    t0 = time.time()
    page.goto(base + '/next/index.html', wait_until='commit')
    shots, marks = {}, {}
    ok = True
    deadline = t0 + 90
    st = None
    while time.time() < deadline:
        try:
            st = page.evaluate(STATE_JS)
        except Exception:
            st = None   # page still navigating
        now = round((time.time() - t0) * 1000)
        if st and st['frames'] >= 2:
            if 'first_frame_ms' not in marks:
                marks['first_frame_ms'] = now
                marks['first_frame_bytes'] = net.total
                shots['0'] = OUT / f'{dname}-loading-000.png'
                page.screenshot(path=str(shots['0']))
            if '50' not in shots and st['percent'] >= 50 and st['phase'] != 'ready':
                shots['50'] = OUT / f'{dname}-loading-050.png'
                page.screenshot(path=str(shots['50']))
                marks['half_ms'] = now
                marks['half_percent'] = st['percent']
            if st['phase'] == 'ready' and st['waiting']:
                marks['prompt_ms'] = now
                marks['prompt_bytes'] = net.total
                marks['prompt_by_category'] = net.snapshot()['by_category']
                page.wait_for_timeout(700)   # let the bar visibly reach 100 % and the prompt blink on
                shots['100'] = OUT / f'{dname}-loading-100.png'
                page.screenshot(path=str(shots['100']))
                break
            if st['phase'] == 'error':
                ok = False
                break
        time.sleep(0.05)
    else:
        ok = False
    if 'prompt_ms' not in marks:
        ok = False
    # Tap through, then let the lazy groups finish to get the full download table.
    if ok:
        page.keyboard.press('Enter')
        try:
            page.wait_for_function('window.LQ_ENGINE.assets.lazyDone() && window.LQ_ENGINE.scene && window.LQ_ENGINE.scene.name !== "_boot"', timeout=60000)
            marks['lazy_done_ms'] = round((time.time() - t0) * 1000)
        except Exception as e:  # noqa: BLE001
            ok = False
            errors.append(f'lazy groups never finished: {e}')
        page.wait_for_timeout(1500)
        marks['title_scene'] = page.evaluate('window.LQ_ENGINE.scene && window.LQ_ENGINE.scene.name')
    snap = net.snapshot()
    marks['total_bytes_after_lazy'] = snap['total']
    marks['by_category_after_lazy'] = snap['by_category']
    ctx.close()
    res = {'ok': ok and not errors, 'marks': marks, 'errors': errors, 'mbps': mbps,
           'shots': {k: str(v) for k, v in shots.items()}}
    report['loading_' + dname] = res
    print(f"[loading/{dname}] first frame {marks.get('first_frame_ms')} ms ({marks.get('first_frame_bytes', 0) / 1e6:.2f} MB), "
          f"tap prompt {marks.get('prompt_ms')} ms ({marks.get('prompt_bytes', 0) / 1e6:.2f} MB), "
          f"all lazy {marks.get('lazy_done_ms')} ms ({marks.get('total_bytes_after_lazy', 0) / 1e6:.2f} MB), "
          f"scene {marks.get('title_scene')} -> {'ok' if res['ok'] else 'FAIL'}")
    for e in errors:
        print('   ', e)
    return res['ok']


def poll(page, js, timeout=45, step=0.25):
    """Poll an async JS function body until it returns something truthy (wait_for_function does not await promises)."""
    end = time.time() + timeout
    while time.time() < end:
        v = page.evaluate(js)
        if v:
            return v
        time.sleep(step)
    raise TimeoutError('timed out waiting for: ' + js[:90])


def check_offline(browser, base, report):
    dev = DEVICES['desktop']
    ctx = new_context(browser, dev)
    page = ctx.new_page()
    errors = []
    page.on('pageerror', lambda e: errors.append(f'pageerror: {e}'))
    page.goto(base + '/next/index.html', wait_until='load')
    page.wait_for_function('window.LQ_ENGINE && window.LQ_ENGINE.bootScene && window.LQ_ENGINE.bootScene.waiting', timeout=60000)
    page.keyboard.press('Enter')
    page.wait_for_function('window.LQ_ENGINE.scene && window.LQ_ENGINE.scene.name !== "_boot"', timeout=60000)
    # main.js registers the worker a couple of seconds after the game is playable.
    poll(page, 'async () => { const r = await navigator.serviceWorker.getRegistration(); return !!(r && r.active); }')
    scope = page.evaluate('navigator.serviceWorker.getRegistration().then(r => r.scope)')
    # The worker precaches the whole shell; wait for the install to finish (the active worker means it did).
    poll(page, 'async () => (await caches.keys()).some((n) => n.startsWith("lq-next-shell"))')
    cache_names = page.evaluate('caches.keys()')
    cached = page.evaluate('caches.open(%s).then(c => c.keys()).then(k => k.length)' % json.dumps(next(n for n in cache_names if n.startswith('lq-next-shell'))))
    ctx.set_offline(True)
    page.reload(wait_until='load')
    ok = True
    try:
        page.wait_for_function('window.LQ_ENGINE && window.LQ_ENGINE.bootScene && window.LQ_ENGINE.bootScene.waiting', timeout=60000)
        info = page.evaluate("""() => ({
          controlled: !!navigator.serviceWorker.controller,
          missing: [...window.LQ_ENGINE.assets.missing],
          critical: window.LQ_ENGINE.assets.criticalMissing(),
          scenes: window.LQ_ENGINE.scenes ? window.LQ_ENGINE.scenes.length : 0,
        })""")
        page.keyboard.press('Enter')
        page.wait_for_function('window.LQ_ENGINE.scene && window.LQ_ENGINE.scene.name !== "_boot"', timeout=60000)
        page.wait_for_timeout(600)
        info['scene'] = page.evaluate('window.LQ_ENGINE.scene.name')
        page.screenshot(path=str(OUT / 'desktop-offline-title.png'))
    except Exception as e:  # noqa: BLE001
        ok = False
        info = {'error': str(e)}
    if ok and (not info['controlled'] or info['critical'] or info['missing'] or info['scene'] == '_boot'):
        ok = False
    ctx.close()
    report['offline'] = {'ok': ok and not errors, 'scope': scope, 'precached_entries': cached, 'info': info, 'errors': errors}
    print(f"[offline] scope {scope}, {cached} cached entries, offline reload -> {info} {'ok' if ok and not errors else 'FAIL'}")
    for e in errors:
        print('   ', e)
    return ok and not errors


def check_packoffline(browser, base, report):
    dev = DEVICES['desktop']
    ctx = new_context(browser, dev)
    page = ctx.new_page()
    errors = []
    page.on('pageerror', lambda e: errors.append(f'pageerror: {e}'))
    url = base + '/next/index.html?pack=x1,x2'
    lists = json.loads((NEXT / 'assets' / 'pack_files.json').read_text(encoding='utf-8'))
    want = sorted({f for k, v in lists.items() if not k.startswith('$') for f in v})
    page.goto(url, wait_until='load')
    page.wait_for_function('window.LQ_ENGINE && window.LQ_ENGINE.bootScene && window.LQ_ENGINE.bootScene.waiting', timeout=60000)
    page.keyboard.press('Enter')
    page.wait_for_function('window.LQ_ENGINE.scene && window.LQ_ENGINE.scene.name !== "_boot"', timeout=60000)
    ready = poll(page, "() => !!(window.LQ_PACKS && window.LQ_PACKS.packReady('x1') && window.LQ_PACKS.packReady('x2'))", timeout=60)
    online_state = page.evaluate("() => ({ x1: window.LQ_PACKS.packState('x1'), x2: window.LQ_PACKS.packState('x2') })")
    # the worker installs, takes control, and the idle warm fetches every pack file through it into the runtime cache
    js = ("async () => { const c = await caches.open('lq-next-runtime-v1'); const keys = (await c.keys()).map(r => new URL(r.url).pathname);"
          " const want = %s; const have = want.filter(w => keys.some(k => k.endsWith('/next/' + w))); return have.length === want.length ? have.length : 0; }" % json.dumps(want))
    try:
        cached = poll(page, js, timeout=90)
    except TimeoutError:
        cached = 0
    shell = page.evaluate(r"async () => { const names = await caches.keys(); const n = names.find(x => x.startsWith('lq-next-shell')); if (!n) return -1; const c = await caches.open(n); const keys = (await c.keys()).map(r => new URL(r.url).pathname); return keys.filter(k => /\/next\/src\/data\/x[12]\/(?!live)/.test(k) || /\/x[12]_manifest/.test(k)).length; }")
    ctx.set_offline(True)
    page.reload(wait_until='load')
    ok = cached == len(want) and shell == 0
    info = {}
    try:
        page.wait_for_function('window.LQ_ENGINE && window.LQ_ENGINE.bootScene && window.LQ_ENGINE.bootScene.waiting', timeout=60000)
        page.keyboard.press('Enter')
        page.wait_for_function('window.LQ_ENGINE.scene && window.LQ_ENGINE.scene.name !== "_boot"', timeout=60000)
        poll(page, "() => !!(window.LQ_PACKS && window.LQ_PACKS.packReady('x1') && window.LQ_PACKS.packReady('x2'))", timeout=30)
        info = page.evaluate("() => ({ x1: window.LQ_PACKS.packState('x1'), x2: window.LQ_PACKS.packState('x2'), controlled: !!navigator.serviceWorker.controller })")
        ok = ok and info['controlled'] and info['x1']['ready'] and info['x2']['ready']
    except Exception as e:  # noqa: BLE001
        ok = False
        info = {'error': str(e)}
    ctx.close()
    report['packoffline'] = {'ok': ok and not errors, 'files': len(want), 'runtime_cached': cached, 'in_shell_cache': shell, 'online': online_state, 'offline': info, 'errors': errors}
    print(f"[packoffline] {len(want)} pack files, {cached} in the runtime cache, {shell} in the shell cache; ready online {bool(ready)}; offline reload -> {info} {'ok' if ok and not errors else 'FAIL'}")
    for e in errors:
        print('   ', e)
    return ok and not errors


def check_retry(browser, base, report):
    """A critical asset that fails shows the retry prompt (not a blank canvas); a press retries and the game boots."""
    ctx = new_context(browser, DEVICES['desktop'])
    page = ctx.new_page()
    blocked = {'on': True}

    def handler(route):
        if blocked['on'] and route.request.url.endswith('assets/tiles/town.png'):
            route.abort()
        else:
            route.continue_()
    page.route('**/*', handler)
    page.goto(base + '/next/index.html', wait_until='commit')
    ok = True
    info = {}
    try:
        poll(page, '() => { const e = window.LQ_ENGINE; return !!(e && e.bootScene && e.bootScene.phase === "error" && e.bootScene.waiting); }', timeout=40)
        page.wait_for_timeout(500)
        info['failed'] = page.evaluate('window.LQ_ENGINE.bootScene.debugState().failed')
        page.screenshot(path=str(OUT / 'desktop-loading-error.png'))
        blocked['on'] = False
        page.keyboard.press('Enter')
        poll(page, '() => { const b = window.LQ_ENGINE.bootScene.debugState(); return b.phase === "ready" && b.waiting; }', timeout=40)
        info['retries'] = page.evaluate('window.LQ_ENGINE.bootScene.debugState().retries')
        info['critical_after_retry'] = page.evaluate('window.LQ_ENGINE.assets.criticalMissing()')
        ok = info['retries'] == 1 and not info['critical_after_retry'] and bool(info['failed'])
    except Exception as e:  # noqa: BLE001
        ok = False
        info['error'] = str(e)
    ctx.close()
    report['retry'] = {'ok': ok, 'info': info}
    print(f"[retry] failed asset shows the retry prompt, a press recovers -> {info} {'ok' if ok else 'FAIL'}")
    return ok


def check_update(browser, base, report):
    """A changed sw.js installs next to the old one, waits, and the game says so ("Update ready, restart to apply")."""
    ctx = new_context(browser, DEVICES['desktop'])
    page = ctx.new_page()
    page.goto(base + '/next/index.html', wait_until='load')
    page.wait_for_function('window.LQ_ENGINE && window.LQ_ENGINE.bootScene && window.LQ_ENGINE.bootScene.waiting', timeout=60000)
    page.keyboard.press('Enter')
    page.wait_for_function('window.LQ_ENGINE.scene && window.LQ_ENGINE.scene.name !== "_boot"', timeout=60000)
    poll(page, 'async () => { const r = await navigator.serviceWorker.getRegistration(); return !!(r && r.active && navigator.serviceWorker.controller); }')
    Handler.sw_version = 'test-update'
    ok = True
    info = {}
    try:
        page.evaluate('navigator.serviceWorker.getRegistration().then((r) => r.update())')
        poll(page, 'async () => { const r = await navigator.serviceWorker.getRegistration(); return !!r.waiting; }', timeout=60)
        poll(page, '() => { const t = window.LQ_ENGINE.toasts; const c = t && (t.current || (t.queue || [])[0]); return !!(c && /Update ready, restart to apply/.test(c.text)); }', timeout=15)
        page.wait_for_timeout(500)
        page.screenshot(path=str(OUT / 'desktop-update-toast.png'))
        info['caches'] = page.evaluate('caches.keys()')
        info['toast'] = True
    except Exception as e:  # noqa: BLE001
        ok = False
        info['error'] = str(e)
    finally:
        Handler.sw_version = None
    ctx.close()
    report['update'] = {'ok': ok, 'info': info}
    print(f"[update] new sw waits, toast shown -> {info} {'ok' if ok else 'FAIL'}")
    return ok


def check_debug(browser, base, report):
    ctx = new_context(browser, DEVICES['desktop'])
    page = ctx.new_page()
    page.goto(base + '/next/index.html?debug=1&fps=0', wait_until='load')
    page.wait_for_function('window.LQ_DEBUG && true', timeout=30000)
    page.evaluate('LQ_DEBUG.ready()')
    page.wait_for_timeout(4000)   # main.js would register at +2.5 s on a normal run
    regs = page.evaluate('navigator.serviceWorker.getRegistrations().then(r => r.length)')
    names = page.evaluate('caches.keys()')
    ok = regs == 0 and not any(n.startswith('lq-next') for n in names)
    ctx.close()
    report['debug'] = {'ok': ok, 'registrations': regs, 'caches': names}
    print(f"[debug] ?debug=1 registrations: {regs}, caches: {names} -> {'ok' if ok else 'FAIL'}")
    return ok


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--only', default='loading,retry,offline,update,debug,packoffline')
    ap.add_argument('--mbps', type=float, default=10.0)
    ap.add_argument('--devices', default='desktop,phone', help='devices for the loading check')
    ap.add_argument('--timeout', type=int, default=420)
    args = ap.parse_args()
    only = {x.strip() for x in args.only.split(',') if x.strip()}
    OUT.mkdir(parents=True, exist_ok=True)
    t = threading.Timer(args.timeout, lambda: (print('FAIL: pwa.py overall timeout', flush=True), os._exit(3)))
    t.daemon = True
    t.start()
    server = start_server()
    base = f'http://127.0.0.1:{server.server_port}'
    report = {'base': base}
    results = []
    from playwright.sync_api import sync_playwright
    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True, args=['--autoplay-policy=no-user-gesture-required'])
        if 'loading' in only:
            for d in [x for x in args.devices.split(',') if x in DEVICES]:
                results.append(check_loading(browser, base, d, args.mbps, report))
        if 'offline' in only:
            results.append(check_offline(browser, base, report))
        if 'packoffline' in only:
            results.append(check_packoffline(browser, base, report))
        if 'retry' in only:
            results.append(check_retry(browser, base, report))
        if 'update' in only:
            results.append(check_update(browser, base, report))
        if 'debug' in only:
            results.append(check_debug(browser, base, report))
        browser.close()
    (OUT / 'pwa-report.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
    print('PWA checks:', 'all passed' if all(results) else 'FAILED')
    sys.exit(0 if all(results) else 1)


if __name__ == '__main__':
    main()
