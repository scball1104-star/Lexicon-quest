"""Offline reload check (issue #60): a returning player opens the game with no network.

  1. First visit, online, in a fresh throwaway browser context: the game boots to the title, the service worker installs,
     finishes the precache (every PRECACHE entry of sw.js is in the shell cache) and controls the page.
  2. A returning visit (a second page load, the worker in control from the start) opens the Episode 6 content:
     ?pack=ep5,ep6&ep=6 forces the packs, as a save past Episode 5 would want them. It waits for LQ_PACKS.packReady('ep6')
     and for every ep6 file in assets/pack_files.json (sound files aside) to sit in the worker's runtime cache.
  3. The network is cut, then the page reloads. context.set_offline(True) alone is NOT enough: it takes the page offline,
     but the service worker's own fetch() still reaches the network (measured 2026-11-10 with Playwright 1.60: 382 server
     hits after set_offline), so a worker that fell through to the network would pass. So the cut is real as well: locally
     the server drops every request with no answer (and lists them); with --live the browser runs through a local CONNECT
     tunnel (TLS bytes passed through untouched) that closes every tunnel and refuses new ones. A probe for a pack file no
     cache can hold must come back 503 from the worker, which proves the worker saw no network. The cut lives in
     _offline.py, shared with pwa.py check_offline and check_packoffline.
     PASS when: the loading bar reaches the tap prompt and the title draws (canvas not blank); zero page errors and zero
     console errors; no missing assets; the page is still controlled and its one shell cache is named after the
     SHELL_VERSION in sw.js; ensurePack('ep6') resolves ok from the cache; no shell or ep6 request failed. Every failed
     request is listed. Two failures are expected and not counted: the probe itself, and the browser's own update check of
     sw.js (always from the network, by spec). The HTTP cache is cleared before the cut (Cache Storage stays): Pages sends
     max-age=600, which would otherwise hide a worker cache miss for ten minutes.

  python next/qa/pwa/offline_reload.py               local: serves the repo root on a free port (pwa.py's gzip server)
  python next/qa/pwa/offline_reload.py --live        the published game, read only, fresh browser profile
  python next/qa/pwa/offline_reload.py --fresh-sw    local, serving a sw.js generated now by build_pwa.py --out
                                                     (the repo's sw.js is only rebuilt at ship, so it can lag overhaul)
  python next/qa/pwa/offline_reload.py --first-visit the packs load in the same visit that installs the worker (no step 2
                                                     reload). Waits for packs.js refetchUsed() to finish before the cut:
                                                     it re-fetches through the worker what the visit used before the
                                                     worker took control (issue #63). PASS since 2026-11-10.

Last line, machine read: OFFLINE_RELOAD: PASS  or  OFFLINE_RELOAD: FAIL <reason>. Exit code 1 on FAIL, 3 on the overall timeout.
Writes next/qa/pwa/out/offline-reload{,-live}.json and offline-reload-{online,offline}.png (out/ is git-ignored).
"""
import argparse
import io
import json
import os
import pathlib
import re
import subprocess
import sys
import tempfile
import threading
import time
import urllib.request

HERE = pathlib.Path(__file__).resolve().parent
NEXT = HERE.parent.parent
sys.path.insert(0, str(HERE))
sys.path.insert(0, str(NEXT / 'qa' / 'world'))
import pwa       # noqa: E402  the same gzip server the other PWA checks use
import fieldlab  # noqa: E402  GPU_ARGS / GPU_JS
import _offline  # noqa: E402  the real network cut, shared with pwa.py check_offline / check_packoffline
from _offline import Cut, Tunnel, PROBE_JS  # noqa: E402

LIVE = 'https://scball1104-star.github.io/Lexicon-quest'
OUT = HERE / 'out'
QUERY = '?pack=ep5,ep6&ep=6'
RUNTIME_CACHE = 'lq-next-runtime-v1'
OVERALL_S = 175

STATE_JS = """() => { const e = window.LQ_ENGINE; if (!e || !e.bootScene) return null; const b = e.bootScene.debugState();
  return { phase: b.phase, percent: b.percent, waiting: b.waiting, frames: e.renderedFrames, failed: b.failed,
           scene: e.scene ? e.scene.name : null }; }"""
WORKER_JS = """async () => { const r = await navigator.serviceWorker.getRegistration();
  const shells = (await caches.keys()).filter((k) => k.startsWith('lq-next-shell-'));
  return { controlled: !!navigator.serviceWorker.controller, active: !!(r && r.active), installing: !!(r && r.installing),
           waiting: !!(r && r.waiting), shells }; }"""
CACHED_JS = """async (want) => { const c = await caches.open('%s'); const keys = (await c.keys()).map((r) => new URL(r.url).pathname);
  const missing = want.filter((w) => !keys.some((k) => k.endsWith('/next/' + w))); return { have: want.length - missing.length, missing: missing.slice(0, 8) }; }""" % RUNTIME_CACHE
COVER_JS = """async (lists) => { const c = await caches.open('%s');
  const keys = new Set((await c.keys()).map((r) => new URL(r.url).pathname.replace(/^.*?\\/next\\//, '')));
  const out = {}; for (const id of ['ep3', 'ep4', 'ep5', 'ep6']) { const w = (lists[id] || []).filter((f) => !/\\.(mp3|ogg|wav)$/.test(f));
    out[id] = (w.length - w.filter((f) => !keys.has(f)).length) + '/' + w.length; }
  out['assets/pack_files.json'] = keys.has('assets/pack_files.json'); return out; }""" % RUNTIME_CACHE
ENSURE_JS = """async () => { const P = window.LQ_PACKS; if (!P) return { error: 'no LQ_PACKS' };
  const r = await Promise.race([P.ensurePack('ep6'), new Promise((ok) => setTimeout(() => ok({ timeout: true }), 30000))]);
  return { result: r, ready: P.packReady('ep6'), state: P.packState('ep6') }; }"""


def log(*a):
    print(*a, flush=True)


def poll(page, js, timeout, step=0.25, arg=None):
    """Poll a (possibly async) JS function until it returns something truthy. page.wait_for_timeout keeps events flowing."""
    end = time.time() + timeout
    last = None
    while time.time() < end:
        try:
            last = page.evaluate(js, arg) if arg is not None else page.evaluate(js)
        except Exception:  # noqa: BLE001  page mid-navigation
            last = None
        if last:
            return last
        page.wait_for_timeout(int(step * 1000))
    raise TimeoutError('timed out waiting for: ' + js.strip().splitlines()[0][:100])


def shell_version_of(text):
    m = re.search(r"const SHELL_VERSION = '([^']*)';", text)
    return m.group(1) if m else None


def blank_report(png_bytes):
    """(blank, distinct colours, stddev) of a screenshot; blank means one flat colour or nearly so."""
    from PIL import Image, ImageStat
    im = Image.open(io.BytesIO(png_bytes)).convert('RGB')
    colours = im.getcolors(1 << 20)
    distinct = len(colours) if colours else 1 << 20
    sd = sum(ImageStat.Stat(im).stddev) / 3
    return distinct < 16 or sd < 4, distinct, round(sd, 1)


def to_prompt_then_title(page, timeout):
    """Wait for the loading bar to reach the tap prompt, press a key, wait for the title scene. Returns the boot state."""
    st = poll(page, "() => { const f = (%s)(); return f && f.phase === 'ready' && f.waiting ? f : (f && f.phase === 'error' ? f : null); }" % STATE_JS, timeout)
    if st.get('phase') == 'error':
        raise RuntimeError(f'loading screen shows the error prompt, failed: {st.get("failed")}')
    page.wait_for_timeout(500)
    page.keyboard.press('Enter')
    poll(page, "() => !!(window.LQ_ENGINE.scene && window.LQ_ENGINE.scene.name === 'title')", 30)
    page.wait_for_timeout(1200)   # let the title fade in fully
    return st


def run(args, base, disk_version, want):
    from playwright.sync_api import sync_playwright
    res = {'base': base, 'expected_shell': disk_version}
    with sync_playwright() as pw:
        launch = ['--autoplay-policy=no-user-gesture-required'] + fieldlab.GPU_ARGS
        if args.tunnel:
            launch += [f'--proxy-server=http://127.0.0.1:{args.tunnel.server_address[1]}', '--proxy-bypass-list=<-loopback>']
        browser = pw.chromium.launch(headless=True, args=launch, timeout=30000)
        ctx = browser.new_context(viewport={'width': 1280, 'height': 720}, reduced_motion='no-preference')   # fresh, throwaway
        ctx.set_default_timeout(30000)
        page = ctx.new_page()
        phase = {'now': 'online'}
        errors = {'online': [], 'offline': []}
        failed = {'online': [], 'offline': []}
        page.on('pageerror', lambda e: errors[phase['now']].append(f'pageerror: {e}'))
        warns = {'online': [], 'offline': []}

        def on_console(m):
            where = (m.location or {}).get('url', '')
            if m.type == 'error':
                errors[phase['now']].append(f'console.error: {m.text} [at {where}]')
            elif m.type == 'warning':
                warns[phase['now']].append(f'console.warn: {m.text} [at {where}]')
        page.on('console', on_console)
        page.on('requestfailed', lambda r: failed[phase['now']].append(f'{r.url} ({r.failure})'))
        page.on('response', lambda r: failed[phase['now']].append(f'{r.url} (HTTP {r.status}{", from the worker" if r.from_service_worker else ""})') if r.status >= 400 else None)
        t0 = time.time()

        # ---- 1. first visit, online: the worker installs, precaches and takes control
        first = base + '/next/' + (QUERY if args.first_visit else '')
        page.goto(first, wait_until='load', timeout=60000)
        res['gpu'] = page.evaluate(fieldlab.GPU_JS)
        log(f'[offline_reload] first visit {first}  gpu: {res["gpu"]}')
        to_prompt_then_title(page, 90)
        res['online_title_s'] = round(time.time() - t0, 1)
        w = poll(page, "async () => { const w = await (%s)(); return w.controlled && w.active && !w.installing && w.shells.length ? w : null; }" % WORKER_JS, 60)
        res['online_worker'] = w
        log(f'[online] title in {res["online_title_s"]} s, worker {w}')
        shell_name = w['shells'][0]
        n_shell = page.evaluate("(n) => caches.open(n).then((c) => c.keys()).then((k) => k.length)", shell_name)
        res['precached_entries'] = n_shell
        if args.precache_n and n_shell < args.precache_n:
            raise RuntimeError(f'precache finished with {n_shell} of {args.precache_n} entries')

        # ---- 2. the Episode 6 pack, as a returning player's visit leaves it: a second visit, the worker in control from the start
        if not args.first_visit:
            page.goto(base + '/next/' + QUERY, wait_until='load', timeout=60000)
            log(f'[online] returning visit {base}/next/{QUERY}')
            to_prompt_then_title(page, 60)
        poll(page, "() => !!(window.LQ_PACKS && window.LQ_PACKS.packReady('ep6'))", 60)
        try:
            c = poll(page, "async (want) => { const r = await (%s)(want); return r.have === want.length ? r : null; }" % CACHED_JS, 60, arg=want)
        except TimeoutError:
            c = page.evaluate(CACHED_JS, want)
            raise RuntimeError(f'ep6 runtime cache incomplete online: {c["have"]}/{len(want)}, missing {c["missing"]}')
        res['ep6_runtime_cached'] = c['have']
        page.wait_for_timeout(1500)   # let any idle warm settle so nothing is half fetched when the network drops
        if args.first_visit:
            # issue #63: packs.js refetchUsed() re-fetches through the worker what this visit used before it took control
            # (a build from before the fix, --live until it ships, has no refetchState: nothing to wait for)
            res['refetch'] = poll(page, "() => { const P = window.LQ_PACKS; if (P && !P.refetchState) return { state: 'absent' }; const r = P && P.refetchState(); return r && r.state === 'done' ? r : null; }", 60)
            log(f'[online] refetchUsed: {res["refetch"]}')
        res['online_runtime_cover'] = page.evaluate(COVER_JS, args.lists)
        online_png = page.screenshot(path=str(OUT / 'offline-reload-online.png'))
        res['online_blank'] = blank_report(online_png)
        log(f'[online] ep6 ready, {c["have"]}/{len(want)} ep6 files in {RUNTIME_CACHE}, {n_shell} shell entries in {shell_name}, '
            f'{round(time.time() - t0, 1)} s')

        # ---- 3. offline, reload
        # The browser's HTTP cache goes too (Cache Storage stays): GitHub Pages answers with max-age=600, so for ten minutes
        # a worker cache miss is still served from the HTTP cache offline. A player back the next day has no such help.
        phase['now'] = 'offline'
        _offline.cut(ctx, page, args.tunnel)
        t1 = time.time()
        page.reload(wait_until='load', timeout=60000)
        st = to_prompt_then_title(page, 60)
        res['offline_title_s'] = round(time.time() - t1, 1)
        res['offline_boot'] = st
        off_png = page.screenshot(path=str(OUT / 'offline-reload-offline.png'))
        blank, distinct, sd = blank_report(off_png)
        res['offline_canvas'] = {'blank': blank, 'distinct_colours': distinct, 'stddev': sd}
        res['offline_worker'] = page.evaluate(WORKER_JS)
        res['offline_assets'] = page.evaluate("() => ({ missing: [...window.LQ_ENGINE.assets.missing], critical: window.LQ_ENGINE.assets.criticalMissing() })")
        res['offline_ep6'] = page.evaluate(ENSURE_JS)
        res['offline_probe'] = page.evaluate(PROBE_JS)
        page.wait_for_timeout(2000)   # anything the title or the pack fires late lands in the lists
        res['elapsed_s'] = round(time.time() - t0, 1)
        res['errors'] = errors
        res['warnings'] = warns
        res['failed_requests'] = {k: sorted(set(v)) for k, v in failed.items()}
        res['refused_while_offline'] = list(Cut.refused)
        ctx.close()
        browser.close()
    return res


SW_SCRIPT = re.compile(r'/next/sw\.js(\?[^ \]]*)?$')


def split_expected(res):
    """The probe this check fires itself (a 503 by design) is expected. So is the browser's update check of the worker
    script: register() and navigations fetch sw.js from the network, never through the worker (by spec), so offline it fails
    and Chromium logs a console error at sw.js. Nothing in the game waits on it. Anything else stays counted."""
    exp = []
    keep_f = []
    for f in res['failed_requests']['offline']:
        u = f.split(' (')[0]
        (exp if SW_SCRIPT.search(u) or _offline.PROBE_MARK in u else keep_f).append(f)
    keep_e = []
    for e in res['errors']['offline']:
        at = e.rsplit('[at ', 1)[-1].rstrip(']') if '[at ' in e else ''
        (exp if e.startswith('console.error: Failed to load resource') and (SW_SCRIPT.search(at) or _offline.PROBE_MARK in at) else keep_e).append(e)
    res['failed_requests']['offline'] = keep_f
    res['errors']['offline'] = keep_e
    res['expected_offline'] = exp


def verdict(res, want_version):
    reasons = []
    if res['offline_canvas']['blank']:
        reasons.append(f'title canvas blank offline ({res["offline_canvas"]})')
    if res['errors']['offline']:
        reasons.append(f'{len(res["errors"]["offline"])} page/console errors offline')
    w = res['offline_worker']
    if not w['controlled']:
        reasons.append('page not controlled by the worker after the offline reload')
    if w['shells'] != ['lq-next-shell-' + str(want_version)]:
        reasons.append(f'shell cache {w["shells"]} is not lq-next-shell-{want_version}')
    a = res['offline_assets']
    if a['critical'] or a['missing']:
        reasons.append(f'assets missing offline: {a}')
    e = res['offline_ep6']
    if not (e.get('ready') and isinstance(e.get('result'), dict) and e['result'].get('ok')):
        reasons.append(f'ensurePack(ep6) offline: {json.dumps(e)[:300]}')
    pr = res.get('offline_probe') or {}
    if pr.get('status') != 503:
        reasons.append(f'network not really cut: an uncacheable pack probe answered {pr.get("status")} (want 503 from the worker)')
    # A failed request matters when it is the shell, the ep6 pack, or the page itself.
    shellish = re.compile(r'/next/(index\.html|sw\.js|manifest\.webmanifest|src/|assets/(manifest|palette|pack_files|ep6_)|$)|/ep6_')
    bad = [f for f in res['failed_requests']['offline'] if shellish.search(f.split(' (')[0].split('?')[0])]
    if bad:
        reasons.append(f'{len(bad)} shell or ep6 requests failed offline, first: {bad[0]}')
    return reasons


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--live', action='store_true', help=f'target {LIVE}/next/ read only')
    ap.add_argument('--fresh-sw', action='store_true', help='local: serve a sw.js generated now (build_pwa.py --out)')
    ap.add_argument('--first-visit', action='store_true',
                    help='load the packs in the very visit that installs the worker (no returning visit); the harsher path')
    ap.add_argument('--timeout', type=int, default=OVERALL_S)
    args = ap.parse_args()
    t = threading.Timer(args.timeout, lambda: (print(f'OFFLINE_RELOAD: FAIL overall timeout {args.timeout} s', flush=True), os._exit(3)))
    t.daemon = True
    t.start()
    OUT.mkdir(parents=True, exist_ok=True)
    t0 = time.time()

    args.tunnel = None
    if args.live:
        base = LIVE
        args.tunnel = Tunnel()
        threading.Thread(target=args.tunnel.serve_forever, daemon=True).start()
        get = lambda rel: urllib.request.urlopen(f'{LIVE}/next/{rel}?nocache={int(time.time())}', timeout=20).read().decode('utf-8')  # noqa: E731
        sw_text = get('sw.js')
        lists = json.loads(get('assets/pack_files.json'))
    else:
        _offline.install_local_cut(pwa.Handler)
        server = pwa.start_server()
        base = f'http://127.0.0.1:{server.server_port}'
        sw_text = (NEXT / 'sw.js').read_text(encoding='utf-8')
        if args.fresh_sw:
            with tempfile.TemporaryDirectory() as d:
                gen = pathlib.Path(d) / 'sw.js'
                subprocess.run([sys.executable, str(NEXT / 'tools' / 'pwa' / 'build_pwa.py'), '--out', str(gen)], check=True, timeout=60, capture_output=True)
                sw_text = gen.read_text(encoding='utf-8')
            pwa.Handler.sw_text = sw_text
            pwa.Handler.sw_version = shell_version_of(sw_text)
        lists = json.loads((NEXT / 'assets' / 'pack_files.json').read_text(encoding='utf-8'))
    args.lists = lists
    version = shell_version_of(sw_text)
    precache = sw_text[sw_text.find('const PRECACHE = ['):]
    precache = precache[:precache.find('];')]
    args.precache_n = len(re.findall(r"^\s*'[^']+',?\s*$", precache, re.M))
    want = sorted(f for f in lists.get('ep6', []) if not f.endswith(('.mp3', '.wav')))
    log(f'[offline_reload] {"live" if args.live else "local"}{" (fresh sw)" if args.fresh_sw else ""}{" (first visit only)" if args.first_visit else ""}: SHELL_VERSION {version}, '
        f'{args.precache_n} precache entries, {len(want)} ep6 pack files')

    try:
        res = run(args, base, version, want)
    except Exception as e:  # noqa: BLE001
        log(f'OFFLINE_RELOAD: FAIL {type(e).__name__}: {str(e).splitlines()[0][:300]}')
        sys.exit(1)

    log(f'[online] runtime cache before the cut: {res["online_runtime_cover"]}')
    log(f'[offline] tap prompt + title in {res["offline_title_s"]} s, canvas {res["offline_canvas"]}, worker {res["offline_worker"]}')
    log(f'[offline] assets {res["offline_assets"]}, ensurePack(ep6) -> {json.dumps(res["offline_ep6"])[:200]}')
    split_expected(res)
    for k in ('online', 'offline'):
        log(f'[{k}] {len(res["errors"][k])} page/console errors' + ''.join(f'\n    {e[:200]}' for e in res['errors'][k]))
        log(f'[{k}] {len(res["failed_requests"][k])} failed requests' + ''.join(f'\n    {f[:200]}' for f in res['failed_requests'][k]))
    log(f'[offline] {len(res["expected_offline"])} expected, not counted (the browser worker update check, the probe)'
        + ''.join(f'\n    {e[:200]}' for e in res['expected_offline']))
    log(f'[offline] probe {res["offline_probe"]}; {len(res["refused_while_offline"])} requests refused at the cut'
        + ''.join(f'\n    {r[:160]}' for r in res['refused_while_offline'][:10]))
    log(f'[offline_reload] {round(time.time() - t0, 1)} s in all')
    reasons = verdict(res, version)
    res['reasons'] = reasons
    (OUT / ('offline-reload-live.json' if args.live else 'offline-reload.json')).write_text(json.dumps(res, indent=2), encoding='utf-8')
    if reasons:
        log('OFFLINE_RELOAD: FAIL ' + '; '.join(reasons))
        sys.exit(1)
    log('OFFLINE_RELOAD: PASS')
    sys.exit(0)


if __name__ == '__main__':
    main()
