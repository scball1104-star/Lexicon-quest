"""Gameplay recorder for the Lexicon Quest trailer (version 2: real moving gameplay).

Drives the game in headless Chromium the way qa/shots.py does (its static server over the repo root,
/next/index.html?debug=1&fps=0, LQ_DEBUG.ready()), then records each clip in clips.json frame by frame:

  * the game clock is FROZEN (LQ_DEBUG.setSpeed(0)) and stepped with LQ_DEBUG.advance(2) per output frame,
    so every clip is exactly 30 fps of 60 Hz game time, deterministic, whatever the machine load;
  * input is REAL keyboard events (Playwright keyboard.down / up): the key level is held across the stepped
    frames, so the game sees a held arrow or a pressed Z exactly as from a player;
  * each frame is read straight from the renderer's 384x216 offscreen canvas (LQ_ENGINE.renderer.canvas),
    so there is no page chrome, no letterbox and no scaling: native game pixels. The FPS overlay is off (&fps=0).

Output, per clip, in next/qa/trailer/out/<clip>/:
  frame_0000.png ...       the PNG sequence (384x216, lossless, 30 fps)
  <clip>.png               the same frames as one lossless animated PNG (APNG, 30 fps)
  clip.json                frames, seconds, fps, the console errors seen (must be empty)
and next/qa/trailer/out/contact_sheet.png (first, middle, last frame of every clip, at 2x nearest-neighbour).

  python next/qa/trailer/record_gameplay.py                  every clip in clips.json
  python next/qa/trailer/record_gameplay.py --only town_walk,battle_exchange
  python next/qa/trailer/record_gameplay.py --list
  python next/qa/trailer/record_gameplay.py --probe town_walk    run the setup only, save out/probe.png, print the field
  python next/qa/trailer/record_gameplay.py --probe town_walk --eval "LQ_DEBUG.scene()"   ... and print a JS value

Clip format (clips.json): {"name", "note", "query" (extra URL params), "storage", "settings", "setup": [steps],
"record": [steps]}. Setup steps are qa/shots.py's step vocabulary (call, eval, advance, press, waitFor, assert...)
and run with the clock at normal speed (async LQ_DEBUG calls like warp need it); recording then freezes it. Record steps (every one captures frames as it goes):
  {"rec": 30}                         capture 30 output frames (60 logic frames), no input change
  {"hold": "ArrowRight", "rec": 24}   hold a real key down for 24 output frames, then release it
  {"hold": ["ShiftLeft", "ArrowUp"], "rec": 20}   several keys held together
  {"tap": "KeyZ", "rec": 10}          press a key for 2 logic frames, then capture 10 frames
  {"walk": [x, y], "face": "up", "run": false, "tail": 6}   walk to a tile on held arrow keys along the game's own
                                      pathfinder route; "tail": only the last 6 tiles are captured (the head runs untaped)
  {"until": "js expr", "max": 150}    capture until the expression is true (or max frames; "need": true fails)
  {"eval": "js"} / {"call": ...}      any shots.py step, run between captures (no frame captured)
Every clip runs on a fresh page with clean storage; a console error or engine error fails the clip.
"""
import argparse
import base64
import fnmatch
import io
import json
import pathlib
import sys
import time

HERE = pathlib.Path(__file__).resolve().parent
QA = HERE.parent
sys.path.insert(0, str(QA))
import shots  # noqa: E402  (static server over the repo root, CALL_JS, run_step: reused as is)

OUT = HERE / 'out'
SPEC = HERE / 'clips.json'
FPS = 30
STEP_PER_FRAME = 60 // FPS
DEVICE = {'width': 1920, 'height': 1080, 'dpr': 1}

TICK_JS = """(cap) => {
  LQ_DEBUG.advance(1);
  const f = (LQ_ENGINE.stack || []).find(s => s.name === 'field');
  const L = f && f.leader;
  return [cap ? LQ_ENGINE.renderer.canvas.toDataURL('image/png') : null, L ? [L.tx, L.ty, !!L.moving] : null];
}"""

ROUTE_JS = """async ([x, y]) => {
  const f = (LQ_ENGINE.stack || []).find(s => s.name === 'field');
  if (!f || !f.leader) return null;
  const { findPath } = await import('/next/src/world/pathfind.js');
  const L = f.leader;
  return findPath((cx, cy, nx, ny, d) => f.canStep(L, cx, cy, nx, ny, d) === true, [L.tx, L.ty], [x, y], { maxNodes: 20000 });
}"""

KEY_FOR = {'up': 'ArrowUp', 'down': 'ArrowDown', 'left': 'ArrowLeft', 'right': 'ArrowRight'}

FIELD_JS = """() => {
  const E = window.LQ_ENGINE; const f = (E.stack || []).find(s => s.name === 'field');
  if (!f || !f.map) return null;
  const L = f.leader;
  return { map: f.map.id, w: f.map.w, h: f.map.h, leader: L ? [L.tx, L.ty, L.dir] : null, locked: f.inputLocked,
    scenes: E.stack.map(s => s.name), cutscene: f.cutscene ? f.cutscene.running : null,
    ents: [...f.entities.values()].filter(e => e.present).map(e => [e.id, e.type, e.x, e.y, e.state]).slice(0, 80) };
}"""


class ClipError(Exception):
    pass


def png_from_data_url(url):
    return base64.b64decode(url.split(',', 1)[1])


class Recorder:
    """The clip's own clock: one logic frame at a time (LQ_DEBUG.advance(1)), a frame captured every second one."""

    def __init__(self, page, clip, outdir, errors):
        self.page, self.clip, self.outdir, self.errors = page, clip, outdir, errors
        self.frames = []          # raw PNG bytes
        self.logic = 0
        self.leader = None
        self.capture = True       # False while a walk's untaped head runs (walk "tail")

    def tick(self, n=1):
        for _ in range(n):
            self.logic += 1
            cap = self.capture and self.logic % STEP_PER_FRAME == 0
            url, self.leader = self.page.evaluate(TICK_JS, cap)
            if url:
                self.frames.append(png_from_data_url(url))

    def grab(self, n=1):
        """n more captured frames (rounds the clock to the next capture first)."""
        while self.logic % STEP_PER_FRAME:
            self.tick(1)
        self.tick(n * STEP_PER_FRAME)

    def keys_of(self, v):
        return v if isinstance(v, list) else [v]

    def walk(self, step):
        """Walk the leader to a tile on held arrow keys (a route from the game's own pathfinder, then one held key per
        straight run; the next key goes down the frame the leader reaches the run's last tile, so the walk never stops)."""
        gx, gy = step['walk']
        route = self.page.evaluate(ROUTE_JS, [gx, gy])
        if route is None:
            raise ClipError(f'no route to {gx},{gy}')
        runs = []
        for d in route:
            if runs and runs[-1][0] == d:
                runs[-1][1] += 1
            else:
                runs.append([d, 1])
        tail = step.get('tail')
        later = [sum(n for _, n in runs[i + 1:]) for i in range(len(runs))]
        run_key = 'ShiftLeft' if step.get('run') else None
        if run_key:
            self.page.keyboard.down(run_key)
        self.tick(1)
        x, y = self.leader[0], self.leader[1]
        mx = int(step.get('max', 900))
        for i, (d, n) in enumerate(runs):
            dx, dy = {'up': (0, -1), 'down': (0, 1), 'left': (-1, 0), 'right': (1, 0)}[d]
            tx, ty = x + dx * n, y + dy * n
            key = KEY_FOR[d]
            self.page.keyboard.down(key)
            spent = 0
            while (self.leader[0], self.leader[1]) != (tx, ty):
                if tail is not None:
                    self.capture = later[i] + abs(tx - self.leader[0]) + abs(ty - self.leader[1]) <= tail
                self.tick(1)
                spent += 1
                if spent > mx:
                    self.page.keyboard.up(key)
                    raise ClipError(f'walk stuck at {self.leader} heading {d} to {tx},{ty}')
            self.page.keyboard.up(key)
            x, y = tx, ty
        self.capture = True
        if run_key:
            self.page.keyboard.up(run_key)
        # let the last step finish
        spent = 0
        while self.leader[2] and spent < 60:
            self.tick(1)
            spent += 1
        if step.get('face'):
            k = KEY_FOR[step['face']]
            self.page.keyboard.down(k)
            self.tick(2)
            self.page.keyboard.up(k)

    def run(self, step, ctx):
        kind = next(iter(step))
        if kind == 'rec':
            self.grab(int(step['rec']))
        elif kind == 'hold':
            keys = self.keys_of(step['hold'])
            for k in keys:
                self.page.keyboard.down(k)
            if 'frames' in step:
                self.tick(int(step['frames']))
            else:
                self.grab(int(step.get('rec', 1)))
            for k in reversed(keys):
                self.page.keyboard.up(k)
        elif kind == 'tap':
            # down for two logic frames, up: a clean pressed edge and release (as a quick player press)
            self.page.keyboard.down(step['tap'])
            self.tick(2)
            self.page.keyboard.up(step['tap'])
            self.grab(int(step.get('rec', 0)))
        elif kind == 'walk':
            self.walk(step)
        elif kind == 'until':
            mx = int(step.get('max', 150))
            for _ in range(mx):
                if self.page.evaluate(step['until']):
                    break
                self.grab(1)
            else:
                if step.get('need', True):
                    raise ClipError(f'until never true in {mx} frames: {step["until"]}')
            self.grab(int(step.get('then', 0)))
        else:
            shots.run_step(self.page, step, ctx)

    def save(self):
        from PIL import Image
        self.outdir.mkdir(parents=True, exist_ok=True)
        for old in self.outdir.glob('frame_*.png'):
            old.unlink()
        ims = []
        for i, b in enumerate(self.frames):
            (self.outdir / f'frame_{i:04d}.png').write_bytes(b)
            im = Image.open(io.BytesIO(b)).convert('RGB')
            if im.size != (384, 216):
                raise ClipError(f'frame {i} is {im.size}, not 384x216')
            ims.append(im)
        if ims:
            ims[0].save(self.outdir / f'{self.clip["name"]}.png', save_all=True, append_images=ims[1:],
                        duration=int(1000 / FPS), loop=0, optimize=False)
        return ims


def boot(page, clip, base):
    page.goto(base + clip.get('query', ''), wait_until='load')
    page.wait_for_function('window.LQ_DEBUG && true', timeout=30000)
    page.evaluate('Promise.race([LQ_DEBUG.ready(), new Promise((_, no) => setTimeout(() => no(new Error("LQ_DEBUG.ready() timed out after 40 s")), 40000))])')
    page.evaluate('LQ_DEBUG.overlay(false)')
    if clip.get('settings'):
        page.evaluate('(s) => LQ_DEBUG.settings(s)', clip['settings'])


def contact_sheet(results, path):
    from PIL import Image, ImageDraw
    scale, pad, label_h = 1, 6, 14
    W, H = 384 * scale, 216 * scale
    rows = [r for r in results if r.get('ims')]
    if not rows:
        return None
    sheet = Image.new('RGB', (pad + 3 * (W + pad), pad + len(rows) * (H + label_h + pad)), (24, 22, 30))
    d = ImageDraw.Draw(sheet)
    for ri, r in enumerate(rows):
        ims = r['ims']
        picks = [0, len(ims) // 2, len(ims) - 1]
        y = pad + ri * (H + label_h + pad)
        d.text((pad, y), f'{r["name"]}  {len(ims)} frames  {len(ims) / FPS:.2f} s  (first / middle / last)', fill=(230, 220, 180))
        for ci, fi in enumerate(picks):
            im = ims[fi].resize((W, H), Image.NEAREST)
            sheet.paste(im, (pad + ci * (W + pad), y + label_h))
    sheet.save(path)
    return path


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--only', default='', help='clip names or globs, comma list')
    ap.add_argument('--list', action='store_true')
    ap.add_argument('--probe', default='', help='run one clip\'s setup, save out/probe.png, print the field state')
    ap.add_argument('--eval', default='', help='with --probe: a JS expression to print after the setup')
    ap.add_argument('--timeout', type=int, default=900, help='overall timeout in seconds')
    args = ap.parse_args()

    spec = json.loads(SPEC.read_text(encoding='utf-8'))
    clips = [c for c in spec['clips'] if not c.get('disabled')]
    if args.list:
        for c in spec['clips']:
            print(f"  {c['name']:<20} {'(disabled) ' if c.get('disabled') else ''}{c.get('note', '')}")
        return 0
    if args.probe:
        clips = [c for c in spec['clips'] if c['name'] == args.probe]
    elif args.only:
        pats = [p.strip() for p in args.only.split(',') if p.strip()]
        clips = [c for c in clips if any(fnmatch.fnmatchcase(c['name'], p) for p in pats)]
    if not clips:
        print('no clips selected')
        return 2
    ignore = spec.get('ignoreConsole', [])

    OUT.mkdir(parents=True, exist_ok=True)
    shots.watchdog(args.timeout)
    server = shots.start_server()
    base = f'http://127.0.0.1:{server.server_port}/next/index.html?debug=1&fps=0'
    results, failures = [], 0
    from playwright.sync_api import sync_playwright, Error as PwError
    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True, args=['--autoplay-policy=no-user-gesture-required'])
        context = browser.new_context(viewport={'width': DEVICE['width'], 'height': DEVICE['height']},
                                      device_scale_factor=DEVICE['dpr'], reduced_motion='no-preference')
        context.set_default_timeout(30000)
        for clip in clips:
            name = clip['name']
            page = context.new_page()
            seed = {k: (v if isinstance(v, str) else json.dumps(v)) for k, v in clip.get('storage', {}).items()}
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
            ctx = {'device': 'trailer', 'name': name, 'files': [], 'zooms': [], 'touch': False, 'cdp': None}
            rec = Recorder(page, clip, OUT / name, errors)
            t0 = time.time()
            status, detail, ims = 'ok', '', []
            try:
                boot(page, clip, base)
                for step in clip.get('setup', []):
                    shots.run_step(page, step, ctx)
                if args.probe:
                    page.evaluate('LQ_DEBUG.advance(1)')
                    (OUT / 'probe.png').write_bytes(png_from_data_url(page.evaluate("LQ_ENGINE.renderer.canvas.toDataURL('image/png')")))
                    print(json.dumps(page.evaluate(FIELD_JS)))
                    if args.eval:
                        print(page.evaluate(args.eval))
                    print(json.dumps(page.evaluate('(() => { const s = LQ_DEBUG.state(); return {scene: s.scene, scenes: s.scenes, ss: s.sceneState, battle: s.battle}; })()'))[:3000])
                else:
                    page.evaluate('LQ_DEBUG.setSpeed(0)')
                    for step in clip.get('record', []):
                        rec.run(step, ctx)
                    eng = page.evaluate('LQ_DEBUG.errors().map(e => e.msg)')
                    errors.extend(f'engine: {m}' for m in eng)
                    ims = rec.save()
            except (PwError, ClipError, shots.ShotError) as e:
                status, detail = 'FAIL', str(e).splitlines()[0][:300]
                try:
                    (OUT / f'{name}-FAILED.png').write_bytes(png_from_data_url(page.evaluate("LQ_ENGINE.renderer.canvas.toDataURL('image/png')")))
                except Exception:
                    pass
            if errors:
                status = 'FAIL'
                detail = (detail + ' | ' if detail else '') + ' | '.join(errors[:5])
            if status != 'ok':
                failures += 1
            n = len(ims)
            info = {'name': name, 'note': clip.get('note', ''), 'status': status, 'detail': detail, 'frames': n,
                    'seconds': round(n / FPS, 3), 'fps': FPS, 'size': [384, 216], 'errors': errors,
                    'wall_s': round(time.time() - t0, 1)}
            if n and not args.probe:
                (OUT / name / 'clip.json').write_text(json.dumps(info, indent=2), encoding='utf-8')
            print(f'{status:<4} {name:<20} {n:>4} frames {n / FPS:5.2f} s  ({info["wall_s"]} s wall)  {detail}', flush=True)
            results.append({**info, 'ims': ims})
            page.close()
        context.close()
        browser.close()
    server.shutdown()
    if not args.probe:
        sheet = contact_sheet(results, OUT / 'contact_sheet.png')
        (OUT / 'report.json').write_text(json.dumps([{k: v for k, v in r.items() if k != 'ims'} for r in results], indent=2), encoding='utf-8')
        print(f'contact sheet: {sheet}')
    return 1 if failures else 0


if __name__ == '__main__':
    sys.exit(main())
