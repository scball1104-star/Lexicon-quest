"""Headless screenshots of Lexicon Quest NEXT (DESIGN 10).

Serves the REPO ROOT (so ../assets/... resolves) with a threaded static server on a free port, opens
/next/index.html?debug=1&fps=0 in headless Chromium for each device, waits for LQ_DEBUG.ready(), runs each
shot's steps from qa/shots.json and saves next/qa/out/<device>-<name>.png. Any console error or page error
fails the run (exit code 1). A JSON report with timings goes to next/qa/out/shots-report.json.

  python next/qa/shots.py                      default devices x all shots
  python next/qa/shots.py --only title_dev,field_dev
  python next/qa/shots.py --device phone       (comma list; 'all' = every device in shots.json)
  python next/qa/shots.py --list
  python next/qa/shots.py --fps                keep the FPS overlay in the screenshots

Step vocabulary (shots.json):
  {"call": "push", "args": ["_devField"]}   LQ_DEBUG.<name>(...args) or LQ_DEBUG.call(name, ...args)
  {"wait": 500}                             real milliseconds
  {"frames": 30}                            wait until 30 more logic frames have run
  {"advance": 30}                           run 30 logic frames synchronously (deterministic)
  {"key": "ArrowRight", "hold": 400}        keyboard press (hold = ms between down and up)
  {"keys": ["ArrowDown", "ArrowDown", "z"]} several presses in a row
  {"press": "confirm", "frames": 1}         inject a game action
  {"tap": [192, 108]}                       tap/click at GAME pixel coordinates
  {"touch": "a", "hold": 120}               touch a touch-control element (dpad, a, b, menu, run)
  {"touch": "dpad", "dir": "right", "hold": 600}
  {"eval": "js expression"}                 evaluate in the page
  {"waitFor": "js expression", "timeout": 5000}
  {"assert": "js expression", "message": "why"}
  {"snap": "suffix"}                        extra screenshot <device>-<name>-<suffix>.png
  {"zoom": [x, y, w, h], "scale": 4}        save a nearest-neighbor zoom crop (screenshot px) for pixel checks
Shot options: "devices": [...] limit to devices, "query": "&scene=x" extra URL params, "settings": {...}
(applied after boot), "storage": {"lq-next-slot-1": {...}} (localStorage is cleared, then seeded, before load),
"settle": ms before the final screenshot.
"""
import argparse
import http.server
import json
import os
import pathlib
import socketserver
import sys
import threading
import time

ROOT = pathlib.Path(__file__).resolve().parents[2]
NEXT = ROOT / 'next'
QA = NEXT / 'qa'
OUT = QA / 'out'
SPEC = QA / 'shots.json'

MIME = {
    '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.webp': 'image/webp',
    '.png': 'image/png', '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.html': 'text/html',
    '.css': 'text/css', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json',
}


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    protocol_version = 'HTTP/1.1'  # keep-alive: far fewer sockets (avoids Windows ERR_NO_BUFFER_SPACE)

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def guess_type(self, path):
        ext = os.path.splitext(str(path))[1].lower()
        return MIME.get(ext) or super().guess_type(path)

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def log_message(self, *args):
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
    server = Server(('127.0.0.1', 0), QuietHandler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    return server


def watchdog(seconds):
    def fire():
        print(f'\nFAIL: shots.py exceeded {seconds} s overall timeout', flush=True)
        os._exit(3)
    t = threading.Timer(seconds, fire)
    t.daemon = True
    t.start()
    return t


CALL_JS = """async ([name, args, ms]) => {
  const d = window.LQ_DEBUG;
  const fn = typeof d[name] === 'function' ? d[name].bind(d) : (...a) => d.call(name, ...a);
  const r = await Promise.race([fn(...args), new Promise((_, no) => setTimeout(() => no(new Error(`LQ_DEBUG.${name} did not settle in ${ms} ms`)), ms))]);
  try { return JSON.parse(JSON.stringify(r === undefined ? null : r)); } catch { return String(r); }
}"""


class ShotError(Exception):
    pass


def game_to_css(page, gx, gy):
    v = page.evaluate('LQ_DEBUG.view()')
    return v['cssX'] + (gx + 0.5) * v['cssScale'], v['cssY'] + (gy + 0.5) * v['cssScale']


def touch_point(cdp, kind, x, y):
    pts = [] if kind == 'touchEnd' else [{'x': x, 'y': y, 'id': 1, 'radiusX': 6, 'radiusY': 6, 'force': 1}]
    cdp.send('Input.dispatchTouchEvent', {'type': kind, 'touchPoints': pts})


def run_step(page, step, ctx):
    timeout = step.get('timeout', 15000)
    # The FIRST key names the step; later keys are its options ({"press": "right", "frames": 50}).
    kind = next(iter(step))
    if kind == 'call':
        return page.evaluate(CALL_JS, [step['call'], step.get('args', []), timeout])
    if kind == 'wait':
        page.wait_for_timeout(step['wait'])
    elif kind == 'frames':
        start = page.evaluate('LQ_DEBUG.state().frame')
        page.wait_for_function(f'LQ_DEBUG.state().frame >= {start + int(step["frames"])}', timeout=timeout, polling=16)
    elif kind == 'advance':
        page.evaluate(f'LQ_DEBUG.advance({int(step["advance"])})')
    elif kind in ('key', 'keys'):
        for key in step.get('keys', [step.get('key')]):
            if step.get('hold'):
                page.keyboard.down(key)
                page.wait_for_timeout(step['hold'])
                page.keyboard.up(key)
            else:
                page.keyboard.press(key, delay=step.get('delay', 40))
            page.wait_for_timeout(step.get('gap', 60))
    elif kind == 'press':
        page.evaluate('([a, n]) => LQ_DEBUG.press(a, n)', [step['press'], step.get('frames', 1)])
        page.wait_for_timeout(step.get('gap', 80))
    elif kind == 'tap':
        x, y = game_to_css(page, *step['tap'])
        if ctx['touch']:
            page.touchscreen.tap(x, y)
        else:
            page.mouse.click(x, y)
        page.wait_for_timeout(step.get('gap', 80))
    elif kind == 'touch':
        el = page.locator(f'[data-control="{step["touch"]}"]')
        box = el.bounding_box()
        if not box:
            raise ShotError(f'touch control {step["touch"]!r} is not visible')
        x, y = box['x'] + box['width'] / 2, box['y'] + box['height'] / 2
        d = step.get('dir')
        if d:
            off = box['width'] * 0.33
            x += {'left': -off, 'right': off}.get(d, 0)
            y += {'up': -off, 'down': off}.get(d, 0)
        cdp = ctx['cdp']()
        touch_point(cdp, 'touchStart', x, y)
        page.wait_for_timeout(step.get('hold', 90))
        touch_point(cdp, 'touchEnd', x, y)
        page.wait_for_timeout(step.get('gap', 80))
    elif kind == 'eval':
        return page.evaluate(step['eval'])
    elif kind == 'waitFor':
        page.wait_for_function(step['waitFor'], timeout=timeout, polling=50)
    elif kind == 'assert':
        ok = page.evaluate(step['assert'])
        if not ok:
            raise ShotError(f'assert failed: {step.get("message") or step["assert"]}')
    elif kind == 'snap':
        path = OUT / f'{ctx["device"]}-{ctx["name"]}-{step["snap"]}.png'
        page.screenshot(path=str(path))
        ctx['files'].append(str(path))
    elif kind == 'zoom':
        ctx['zooms'].append(step)
    else:
        raise ShotError(f'unknown step {step}')
    return None


def save_zooms(png_path, zooms, files):
    if not zooms:
        return
    try:
        from PIL import Image
    except ImportError:
        return
    im = Image.open(png_path)
    for i, z in enumerate(zooms):
        x, y, w, h = z['zoom']
        s = int(z.get('scale', 4))
        crop = im.crop((x, y, x + w, y + h)).resize((w * s, h * s), Image.NEAREST)
        out = png_path.with_name(png_path.stem + (f'-zoom{i}' if i else '-zoom') + '.png')
        crop.save(out)
        files.append(str(out))


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--only', action='append', default=[], help='shot names (comma list, repeatable)')
    ap.add_argument('--device', default=None, help="device names (comma list) or 'all'")
    ap.add_argument('--list', action='store_true')
    ap.add_argument('--fps', action='store_true', help='keep the FPS overlay visible')
    ap.add_argument('--timeout', type=int, default=900, help='overall timeout in seconds')
    args = ap.parse_args()

    spec = json.loads(SPEC.read_text(encoding='utf-8'))
    devices = spec['devices']
    shots = spec['shots']
    if args.list:
        print('devices:', ', '.join(f"{k}{' (default)' if k in spec['defaultDevices'] else ''}" for k in devices))
        for s in shots:
            print(f"  {s['name']:<22} {s.get('note', '')}")
        return 0
    only = {n.strip() for o in args.only for n in o.split(',') if n.strip()}
    if only:
        unknown = only - {s['name'] for s in shots}
        if unknown:
            print('unknown shot(s):', ', '.join(sorted(unknown)))
            return 2
        shots = [s for s in shots if s['name'] in only]
    dev_names = spec['defaultDevices'] if not args.device else (list(devices) if args.device == 'all' else [d.strip() for d in args.device.split(',')])
    for d in dev_names:
        if d not in devices:
            print('unknown device', d)
            return 2
    ignore = spec.get('ignoreConsole', [])

    OUT.mkdir(parents=True, exist_ok=True)
    watchdog(args.timeout)
    server = start_server()
    base = f'http://127.0.0.1:{server.server_port}/next/index.html?debug=1' + ('' if args.fps else '&fps=0')
    report = {'base': base, 'results': []}
    failures = 0
    t_all = time.time()

    from playwright.sync_api import sync_playwright, Error as PwError
    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True, args=['--autoplay-policy=no-user-gesture-required'])
        for dname in dev_names:
            dev = devices[dname]
            context = browser.new_context(
                viewport={'width': dev['width'], 'height': dev['height']},
                device_scale_factor=dev.get('dpr', 1), is_mobile=dev.get('mobile', False),
                has_touch=dev.get('touch', False), reduced_motion='no-preference')
            context.set_default_timeout(15000)
            for shot in shots:
                if shot.get('devices') and dname not in shot['devices']:
                    continue
                name = shot['name']
                page = context.new_page()
                # Every shot starts from clean storage (no settings/saves leaking between shots), then
                # seeds the keys in "storage" (values may be objects; they are JSON-encoded).
                seed = {k: (v if isinstance(v, str) else json.dumps(v)) for k, v in shot.get('storage', {}).items()}
                page.add_init_script('(() => { try { localStorage.clear(); const s = ' + json.dumps(seed)
                                     + '; for (const k in s) localStorage.setItem(k, s[k]); } catch (e) {} })()')
                errors = []

                def on_console(msg, errors=errors):
                    if msg.type == 'error':
                        text = msg.text
                        loc = msg.location.get('url', '') if isinstance(msg.location, dict) else ''
                        if any(p in text or p in loc for p in ignore):
                            return
                        errors.append(f'console.error: {text} {loc}'.strip())

                page.on('console', on_console)
                page.on('pageerror', lambda e, errors=errors: errors.append(f'pageerror: {e}'))
                cdp_holder = {}

                def get_cdp(page=page, holder=cdp_holder):
                    if 'cdp' not in holder:
                        holder['cdp'] = page.context.new_cdp_session(page)
                    return holder['cdp']

                ctx = {'device': dname, 'name': name, 'files': [], 'zooms': [], 'touch': dev.get('touch', False), 'cdp': get_cdp}
                t0 = time.time()
                status, detail = 'ok', ''
                png = OUT / f'{dname}-{name}.png'
                perf = None
                try:
                    url = base + shot.get('query', '')
                    page.goto(url, wait_until='load')
                    page.wait_for_function('window.LQ_DEBUG && true', timeout=15000)
                    page.evaluate('Promise.race([LQ_DEBUG.ready(), new Promise((_, no) => setTimeout(() => no(new Error("LQ_DEBUG.ready() timed out after 20 s")), 20000))])')
                    if shot.get('settings'):
                        page.evaluate('(s) => LQ_DEBUG.settings(s)', shot['settings'])
                    for step in shot.get('steps', []):
                        run_step(page, step, ctx)
                    page.wait_for_timeout(shot.get('settle', 120))
                    page.screenshot(path=str(png))
                    ctx['files'].insert(0, str(png))
                    save_zooms(png, ctx['zooms'], ctx['files'])
                    perf = page.evaluate('LQ_DEBUG.perf()')
                    state = page.evaluate('(() => { const s = LQ_DEBUG.state(); return { scene: s.scene, scenes: s.scenes, errors: s.errors, view: s.view, touch: s.touchVisible }; })()')
                    if state['errors']:
                        errors.extend(f'engine: {e}' for e in state['errors'])
                except (PwError, ShotError) as e:
                    status, detail = 'FAIL', str(e).splitlines()[0][:300]
                    try:
                        page.screenshot(path=str(OUT / f'{dname}-{name}-FAILED.png'))
                    except PwError:
                        pass
                if errors and status == 'ok':
                    status = 'FAIL'
                if errors:
                    detail = (detail + ' | ' if detail else '') + ' | '.join(errors[:5])
                if status != 'ok':
                    failures += 1
                ms = int((time.time() - t0) * 1000)
                fps = f"{perf['fps']:.0f}fps upd {perf['updateMs']:.2f} drw {perf['drawMs']:.2f}ms" if perf else ''
                print(f'{status:<4} {dname:<10} {name:<22} {ms:>6} ms  {fps}  {detail}', flush=True)
                report['results'].append({'device': dname, 'shot': name, 'status': status, 'ms': ms, 'detail': detail,
                                          'perf': perf, 'files': ctx['files']})
                page.close()
            context.close()
        browser.close()
    server.shutdown()
    (OUT / 'shots-report.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
    total = len(report['results'])
    print(f'\n{total - failures}/{total} shots ok in {time.time() - t_all:.1f} s; PNGs in {OUT}')
    return 1 if failures else 0


if __name__ == '__main__':
    sys.exit(main())
