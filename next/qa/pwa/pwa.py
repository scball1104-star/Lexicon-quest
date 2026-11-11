"""PWA checks for Lexicon Quest NEXT (W6-pwa): loading screen, size table, offline reload, debug runs.

Serves the REPO ROOT (so ../assets/... resolves) on a free port and drives headless Chromium:

  1. loading   a fresh visit throttled to 10 Mbps / 40 ms (docs/PWA.md budget). Captures the loading screen at
               0 %, 50 % and 100 % (the "Tap or press any key" prompt) to qa/pwa/out/<device>-loading-<pct>.png and
               measures time to the first frame, time to the tap prompt and the bytes downloaded by then.
  2. offline   one online visit (service worker installs and precaches), then the network is really cut (_offline.py:
               the HTTP cache is cleared, the context goes offline AND the local server drops every request, since
               set_offline alone lets the worker's own fetches through) and the page is reloaded: the shell, scenes and
               art must come from the worker and reach the title, and an uncacheable probe must get the worker's 503.
  3. retry     a blocked critical asset shows the retry prompt (qa/pwa/out/desktop-loading-error.png); a press recovers.
  4. update    the update flow with two versions of a generated sw.js (src/core/swUpdate.js): an idle title applies and reloads once;
               a game in progress never reloads and its saves do not change, the title applies it later; a refresh hands over at
               the loading screen; two tabs never reload, closing one lets the title apply; the loop guard holds; stills in qa/out/polish.
  5. debug     ?debug=1 runs must never install a worker (shots.py and every QA harness rely on this).
  6. packoffline  XP-packs: a visit with ?pack=x1,x2 loads both expansion packs (forced on while their switches are off), the
               worker's runtime cache ends up holding every file in assets/pack_files.json, and after the same real cut a
               reload still brings both packs up (ready) from that cache, and the probe gets 503. The pack files were never
               precached.

  python next/qa/pwa/pwa.py                  all three checks
  python next/qa/pwa/pwa.py --only loading   or: retry, offline, update, debug, packoffline (comma list)
  python next/qa/pwa/pwa.py --mbps 10        throttle for check 1 (0 = unthrottled)
  python next/qa/pwa/pwa.py --only offline,packoffline --sabotage
                                             proves the two offline checks can fail: right before the cut, offline deletes the
                                             runtime cache (the title art refetchUsed put there) and packoffline deletes the pack
                                             files from it. Both must then FAIL (the run prints a SABOTAGE: line and exits 1).

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

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import _offline  # noqa: E402  the real network cut (shared with offline_reload.py)

ROOT = pathlib.Path(__file__).resolve().parents[3]
NEXT = ROOT / 'next'
OUT = pathlib.Path(__file__).resolve().parent / 'out'
POLISH = NEXT / 'qa' / 'out' / 'polish'

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
    sw_text = None           # the generated worker to serve instead of the file on disk
    sw_strip = False         # serve it without the update handler (a build from before the update flow)

    def do_GET(self):
        if Handler.sw_version and urlparse(self.path).path.endswith('/next/sw.js'):
            import re
            src = Handler.sw_text or (NEXT / 'sw.js').read_text(encoding='utf-8')
            if Handler.sw_strip:
                src = src.replace("self.addEventListener('message'", "self.addEventListener('nomessage'")
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


SABOTAGE = {'on': False}   # --sabotage: delete what the offline checks need right before the cut, so they must FAIL


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
    # Issue #63: this first visit loaded the title art before the worker took control; packs.js refetchUsed() fetches it again
    # through the worker once the page is controlled. Cut before that finishes and the real cut finds ../assets/art/
    # environments.webp in no cache (set_offline alone hid this: the worker fetched it from the server). Same wait as
    # offline_reload.py --first-visit.
    refetch = poll(page, "() => { const P = window.LQ_PACKS; if (P && !P.refetchState) return { state: 'absent' };"
                         " const r = P && P.refetchState(); return r && r.state === 'done' ? r : null; }", timeout=60)
    sabotaged = page.evaluate(_offline.DROP_CACHES_JS, 'lq-next-runtime') if SABOTAGE['on'] else None
    _offline.cut(ctx, page)
    ok = True
    probe = None
    try:
        page.reload(wait_until='load')
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
        probe = _offline.probe(page)
    except Exception as e:  # noqa: BLE001
        ok = False
        info = {'error': str(e).splitlines()[0][:300]}
    if ok and (not info['controlled'] or info['critical'] or info['missing'] or info['scene'] == '_boot'):
        ok = False
    if ok and not _offline.probe_ok(probe):
        ok = False
        info['cut'] = f'network not really cut: the probe answered {probe} (want 503 from the worker)'
    refused_list = sorted(set(_offline.Cut.refused))
    refused = len(_offline.Cut.refused)
    ctx.close()
    _offline.restore()
    report['offline'] = {'ok': ok and not errors, 'scope': scope, 'precached_entries': cached, 'info': info, 'errors': errors,
                         'refetch': refetch, 'probe': probe, 'refused_at_cut': refused, 'refused': refused_list, 'sabotaged': sabotaged}
    print(f"[offline] scope {scope}, {cached} cached entries, offline reload -> {info} {'ok' if ok and not errors else 'FAIL'}")
    print(f"[offline] refetchUsed {refetch}; real cut: probe {probe}, {refused} requests refused by the server"
          + (f"; SABOTAGE deleted the caches {sabotaged}" if SABOTAGE['on'] else ''))
    for e in errors:
        print('   ', e)
    return ok and not errors


def check_packoffline(browser, base, report):
    dev = DEVICES['desktop']
    ctx = new_context(browser, dev)
    page = ctx.new_page()
    errors = []
    page.on('pageerror', lambda e: errors.append(f'pageerror: {e}'))
    lists = json.loads((NEXT / 'assets' / 'pack_files.json').read_text(encoding='utf-8'))
    # every pack in the list (x1, x2, cave, tier, ep3, ep4 ...), forced on (E4-integrate: it was ?pack=x1,x2 while the list grew)
    ids = [k for k in lists if not k.startswith('$')]
    url = base + '/next/index.html?pack=' + ','.join(ids)
    want = sorted({f for k, v in lists.items() if not k.startswith('$') for f in v if not f.endswith(('.mp3', '.wav'))})
    ready_js = "() => !!(window.LQ_PACKS && %s)" % ' && '.join(f"window.LQ_PACKS.packReady('{i}')" for i in ids)
    page.goto(url, wait_until='load')
    page.wait_for_function('window.LQ_ENGINE && window.LQ_ENGINE.bootScene && window.LQ_ENGINE.bootScene.waiting', timeout=60000)
    page.keyboard.press('Enter')
    page.wait_for_function('window.LQ_ENGINE.scene && window.LQ_ENGINE.scene.name !== "_boot"', timeout=60000)
    ready = poll(page, ready_js, timeout=60)
    online_state = page.evaluate("() => ({ x1: window.LQ_PACKS.packState('x1'), x2: window.LQ_PACKS.packState('x2'), ep4: window.LQ_PACKS.packState('ep4') })")
    # the worker installs, takes control, and the idle warm fetches every pack file through it into the runtime cache
    js = ("async () => { const c = await caches.open('lq-next-runtime-v1'); const keys = (await c.keys()).map(r => new URL(r.url).pathname);"
          " const want = %s; const have = want.filter(w => keys.some(k => k.endsWith('/next/' + w))); return have.length === want.length ? have.length : 0; }" % json.dumps(want))
    try:
        cached = poll(page, js, timeout=90)
    except TimeoutError:
        cached = 0
    shell = page.evaluate(r"async () => { const names = await caches.keys(); const n = names.find(x => x.startsWith('lq-next-shell')); if (!n) return -1; const c = await caches.open(n); const keys = (await c.keys()).map(r => new URL(r.url).pathname); return keys.filter(k => /\/next\/src\/data\/x[12]\/(?!live)/.test(k) || /\/x[12]_manifest/.test(k)).length; }")
    sabotaged = page.evaluate(_offline.DROP_ENTRIES_JS, ['lq-next-runtime-v1', want]) if SABOTAGE['on'] else None
    _offline.cut(ctx, page)
    ok = cached == len(want) and shell == 0
    info = {}
    probe = None
    try:
        page.reload(wait_until='load')
        page.wait_for_function('window.LQ_ENGINE && window.LQ_ENGINE.bootScene && window.LQ_ENGINE.bootScene.waiting', timeout=60000)
        page.keyboard.press('Enter')
        page.wait_for_function('window.LQ_ENGINE.scene && window.LQ_ENGINE.scene.name !== "_boot"', timeout=60000)
        poll(page, ready_js, timeout=30)
        info = page.evaluate("(ids) => ({ ready: ids.every((i) => window.LQ_PACKS.packReady(i)), controlled: !!navigator.serviceWorker.controller })", ids)
        ok = ok and info['controlled'] and info['ready']
        probe = _offline.probe(page)
    except Exception as e:  # noqa: BLE001
        ok = False
        info = {'error': str(e).splitlines()[0][:300]}
    if ok and not _offline.probe_ok(probe):
        ok = False
        info['cut'] = f'network not really cut: the probe answered {probe} (want 503 from the worker)'
    refused_list = sorted(set(_offline.Cut.refused))
    refused = len(_offline.Cut.refused)
    ctx.close()
    _offline.restore()
    report['packoffline'] = {'ok': ok and not errors, 'files': len(want), 'runtime_cached': cached, 'in_shell_cache': shell, 'online': online_state, 'offline': info, 'errors': errors,
                             'probe': probe, 'refused_at_cut': refused, 'refused': refused_list, 'sabotaged': sabotaged}
    print(f"[packoffline] {len(want)} pack files, {cached} in the runtime cache, {shell} in the shell cache; ready online {bool(ready)}; offline reload -> {info} {'ok' if ok and not errors else 'FAIL'}")
    print(f"[packoffline] real cut: probe {probe}, {refused} requests refused by the server"
          + (f"; SABOTAGE deleted {sabotaged} pack entries from the runtime cache" if SABOTAGE['on'] else ''))
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


TOAST_JS = "() => { const t = window.LQ_ENGINE.toasts; const c = t && (t.current || (t.queue || [])[0]); return c ? c.text : null; }"
SAVES_JS = "() => JSON.stringify(Object.keys(localStorage).sort().filter((k) => k.startsWith('lq-next-slot')).map((k) => [k, localStorage.getItem(k)]))"
READY_COPY = 'Update ready. It applies at the title screen or next launch.'
TABS_COPY = 'Update ready. Close other game tabs to apply it.'


class Tab:
    """One page of the game, past the tap prompt, counting its own document loads."""

    def __init__(self, ctx, base, name):
        self.page = ctx.new_page()
        self.name = name
        self.loads = 0
        self.errors = []
        self.page.on('load', self._load)
        self.page.on('pageerror', lambda e: self.errors.append(str(e)))
        self.page.goto(base + '/next/index.html', wait_until='load')
        self.tap()
        poll(self.page, 'async () => { const r = await navigator.serviceWorker.getRegistration(); return !!(r && r.active && navigator.serviceWorker.controller); }')

    def _load(self, _page):
        self.loads += 1

    def tap(self):
        self.page.wait_for_function('window.LQ_ENGINE && window.LQ_ENGINE.bootScene && window.LQ_ENGINE.bootScene.waiting', timeout=60000)
        self.page.keyboard.press('z')
        self.page.wait_for_function('window.LQ_ENGINE.scene && window.LQ_ENGINE.scene.name === "title"', timeout=60000)

    def to_field(self):
        self.page.evaluate("LQ_DEBUG.newGame('Keep', { scene: 'field', level: 3 })")
        self.page.wait_for_function('window.LQ_ENGINE.scene && window.LQ_ENGINE.scene.name === "field"', timeout=30000)
        self.page.evaluate('LQ_ENGINE.scene.autosave()')

    def worker(self):
        return self.page.evaluate("""async () => { const r = await navigator.serviceWorker.getRegistration();
          const keys = (await caches.keys()).filter((k) => k.startsWith('lq-next-shell-'));
          return { waiting: !!r.waiting, active: !!r.active, controlled: !!navigator.serviceWorker.controller, shells: keys }; }""")

    def scene(self):
        return self.page.evaluate('() => window.LQ_ENGINE.scene && window.LQ_ENGINE.scene.name')

    def toast(self, text, timeout=15):
        poll(self.page, TOAST_JS.replace('return c ? c.text : null', 'return !!c && c.text === ' + json.dumps(text)), timeout=timeout)

    def shot(self, name):
        POLISH.mkdir(parents=True, exist_ok=True)
        self.page.screenshot(path=str(POLISH / name))


def wait_loads(tab, cond, timeout, what):
    """Playwright delivers page events only inside its own calls, so wait with wait_for_timeout, never time.sleep."""
    end = time.time() + timeout
    while time.time() < end:
        if cond():
            return
        tab.page.wait_for_timeout(200)
    raise TimeoutError('timed out waiting for: ' + what)


def deploy(tab, version, strip=False):
    """Put a new sw.js on the server and let the page find it; returns when it waits (or has already been applied)."""
    Handler.sw_version = version
    Handler.sw_strip = strip
    tab.page.evaluate('navigator.serviceWorker.getRegistration().then((r) => r.update())')


def settle(*tabs, seconds=7):
    for t in tabs:
        t.page.wait_for_timeout(int(seconds * 1000 / len(tabs)))


def shell(version):
    return ['lq-next-shell-' + version]


def scenario_title(browser, base, out):
    """Idle title: applies, reloads exactly once, the new shell alone is left; the loop guard holds a second deploy back."""
    ctx = new_context(browser, DEVICES['desktop'])
    tab = Tab(ctx, base, 'title')
    start = tab.worker()['shells']
    before = tab.loads
    deploy(tab, 'v2')
    wait_loads(tab, lambda: tab.loads == before + 1, 45, 'reload after the deploy')
    tab.tap()
    w = tab.worker()
    assert w['shells'] == shell('v2') and not w['waiting'] and w['controlled'], w
    tab.toast('Game updated.')
    tab.shot('update-1-title-after-reload.png')
    settle(tab)
    assert tab.loads == before + 1, f'one reload only, saw {tab.loads - before}'
    out['title'] = {'loads': tab.loads - before, 'shells_before': start, 'shells_after': w['shells']}
    # Loop guard: a second build inside ten minutes waits; the title stays up and says so.
    deploy(tab, 'v3')
    poll(tab.page, 'async () => !!(await navigator.serviceWorker.getRegistration()).waiting', timeout=60)
    tab.toast(READY_COPY)
    settle(tab)
    assert tab.loads == before + 1, 'guard held'
    # ...and once the window has passed, it applies (a key press first: 20 idle seconds start the attract mode, which is not quiet).
    tab.page.keyboard.press('ArrowDown')
    tab.page.evaluate("sessionStorage.setItem('lq-update-reload', '1')")
    wait_loads(tab, lambda: tab.loads == before + 2, 30, 'reload after the guard window')
    tab.tap()
    w = tab.worker()
    assert w['shells'] == shell('v3'), w
    out['guard'] = {'held_inside_window': True, 'applied_after_window': w['shells']}
    assert not tab.errors, tab.errors
    ctx.close()


def scenario_mid_game(browser, base, out):
    """In a game: no reload, the save untouched, the toast. Back at the title it applies. A refresh mid-game applies at the loading screen."""
    ctx = new_context(browser, DEVICES['desktop'])
    tab = Tab(ctx, base, 'mid')
    tab.to_field()
    saves = tab.page.evaluate(SAVES_JS)
    assert 'Keep' in saves, 'the real autosave is on disk'
    n = tab.loads
    deploy(tab, 'v2')
    poll(tab.page, 'async () => !!(await navigator.serviceWorker.getRegistration()).waiting', timeout=60)
    tab.toast(READY_COPY)
    tab.page.wait_for_timeout(600)
    tab.shot('update-2-mid-game-toast.png')
    tab.page.evaluate('window.__same = window.LQ_ENGINE.game')
    settle(tab)
    assert tab.loads == n, f'no reload mid-game, saw {tab.loads - n}'
    assert tab.page.evaluate("LQ_ENGINE.scenes.some((s) => s.name === 'field')"), f'the field is still there under {tab.scene()}'
    assert tab.page.evaluate('window.__same === window.LQ_ENGINE.game'), 'the game object lives'
    assert tab.page.evaluate(SAVES_JS) == saves, 'saves untouched while waiting'
    assert tab.worker()['waiting'], 'still waiting'
    tab.page.evaluate("LQ_ENGINE.fadeTo(() => LQ_ENGINE.reset('title'), { duration: 0.3 })")
    wait_loads(tab, lambda: tab.loads == n + 1, 30, 'reload at the title')
    tab.tap()
    w = tab.worker()
    assert w['shells'] == shell('v2'), w
    assert tab.page.evaluate(SAVES_JS) == saves, 'saves identical after the update'
    out['mid_game'] = {'reloads_in_game': 0, 'reloads_at_title': 1, 'saves_identical': True, 'shells': w['shells']}
    assert not tab.errors, tab.errors
    ctx.close()


def scenario_refresh(browser, base, out):
    """The reported bug: a refresh with a worker waiting kept the old build. Now the loading screen hands over, with one more load."""
    ctx = new_context(browser, DEVICES['desktop'])
    tab = Tab(ctx, base, 'refresh')
    tab.to_field()
    deploy(tab, 'v2')
    poll(tab.page, 'async () => !!(await navigator.serviceWorker.getRegistration()).waiting', timeout=60)
    n = tab.loads
    tab.page.reload(wait_until='load')
    wait_loads(tab, lambda: tab.loads == n + 2, 30, 'refresh plus one reload')
    tab.tap()
    w = tab.worker()
    assert w['shells'] == shell('v2') and not w['waiting'], w
    settle(tab, seconds=4)
    assert tab.loads == n + 2, 'no third load'
    out['refresh'] = {'loads_after_player_refresh': tab.loads - n, 'shells': w['shells']}
    ctx.close()


def scenario_two_tabs(browser, base, out):
    """Two tabs: neither reloads, nothing is switched under the running game. Closing the other tab lets the title apply it."""
    ctx = new_context(browser, DEVICES['desktop'])
    a = Tab(ctx, base, 'a')
    b = Tab(ctx, base, 'b')
    na, nb = a.loads, b.loads
    deploy(a, 'v2')
    poll(a.page, 'async () => !!(await navigator.serviceWorker.getRegistration()).waiting', timeout=60)
    a.toast(TABS_COPY)
    a.shot('update-3-two-tabs-toast.png')
    settle(a, b)
    assert a.loads == na and b.loads == nb, 'both at the title: no reload'
    b.to_field()
    settle(a, b)
    w = a.worker()
    assert a.loads == na and b.loads == nb and w['waiting'] and len(w['shells']) == 2, (a.loads, b.loads, w)
    assert a.page.evaluate('!LQ_ENGINE.scene.busy'), 'the refused title takes input again'
    saves = b.page.evaluate(SAVES_JS)
    a.page.keyboard.press('ArrowDown')
    b.page.close()
    wait_loads(a, lambda: a.loads == na + 1, 30, 'the last tab applies')
    a.tap()
    w = a.worker()
    assert w['shells'] == shell('v2'), w
    assert a.page.evaluate(SAVES_JS) == saves, 'saves identical'
    settle(a, seconds=4)
    assert a.loads == na + 1, 'one reload only'
    out['two_tabs'] = {'reloads_while_two_open': 0, 'reloads_after_close': 1, 'shells': w['shells']}
    ctx.close()


def scenario_no_handler(browser, base, out):
    """A waiting worker that cannot answer (a rollback to a build before this one): the title frees itself, no reload."""
    ctx = new_context(browser, DEVICES['desktop'])
    tab = Tab(ctx, base, 'nohandler')
    n = tab.loads
    deploy(tab, 'old', strip=True)
    poll(tab.page, 'async () => !!(await navigator.serviceWorker.getRegistration()).waiting', timeout=60)
    tab.toast(READY_COPY, timeout=20)
    assert tab.page.evaluate('!LQ_ENGINE.scene.busy'), 'title free'
    assert tab.loads == n, 'no reload'
    out['no_handler'] = {'reloads': 0, 'title_free': True}
    ctx.close()


def check_update(browser, base, report):
    """Two versions of a freshly generated sw.js (tools/pwa/build_pwa.py --out, the repo's copy is only rebuilt at ship)."""
    import subprocess
    import tempfile
    ok = True
    info = {}
    with tempfile.TemporaryDirectory() as d:
        gen = pathlib.Path(d) / 'sw.js'
        subprocess.run([sys.executable, str(NEXT / 'tools' / 'pwa' / 'build_pwa.py'), '--out', str(gen)], check=True, timeout=60, capture_output=True)
        Handler.sw_text = gen.read_text(encoding='utf-8')
    for fn in (scenario_title, scenario_mid_game, scenario_refresh, scenario_two_tabs, scenario_no_handler):
        Handler.sw_version = 'v1'
        Handler.sw_strip = False
        try:
            fn(browser, base, info)
            print(f'[update] {fn.__name__} ok', flush=True)
        except Exception as e:  # noqa: BLE001
            ok = False
            info[fn.__name__] = repr(e)
            print(f'[update] {fn.__name__} FAIL {e!r}', flush=True)
    Handler.sw_version = None
    Handler.sw_text = None
    report['update'] = {'ok': ok, 'info': info}
    print(f"[update] {json.dumps(info)} {'ok' if ok else 'FAIL'}")
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
    ap.add_argument('--sabotage', action='store_true', help='delete what offline / packoffline need before the cut: both must FAIL')
    args = ap.parse_args()
    only = {x.strip() for x in args.only.split(',') if x.strip()}
    SABOTAGE['on'] = args.sabotage
    OUT.mkdir(parents=True, exist_ok=True)
    t = threading.Timer(args.timeout, lambda: (print('FAIL: pwa.py overall timeout', flush=True), os._exit(3)))
    t.daemon = True
    t.start()
    _offline.install_local_cut(Handler)   # this module's own Handler: run as a script it is __main__.Handler
    server = start_server()
    base = f'http://127.0.0.1:{server.server_port}'
    report = {'base': base, 'sabotage': args.sabotage}
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
    if args.sabotage:
        hit = {k: report[k]['ok'] for k in ('offline', 'packoffline') if k in report}
        print('SABOTAGE:', 'the sabotaged checks FAILED, as they must' if hit and not any(hit.values())
              else f'a sabotaged check still PASSED, so it cannot see a cache miss: {hit}')
    sys.exit(0 if all(results) else 1)


if __name__ == '__main__':
    main()
