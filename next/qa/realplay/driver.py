"""The realplay driver: Lexicon Quest played through the controls a player has.

It READS the game through LQ_DEBUG / LQ_ENGINE (where am I, what is the cursor on) and may SET UP a start point (a save, a
fight, a warp, a Lv). Every game ACTION inside a tested sequence goes through page.keyboard, the on-screen touch controls or
a real touch on the canvas. A guard wraps the automation surface (LQ_DEBUG.press, battleAct, battleUntil) and
counts calls (the game's own input.inject, a shop tap, is not one): run.py fails a scenario in which any fired.

    p = Play('desktop'); p.boot('&pack=ep4'); p.act('confirm'); p.until("...js...", 'label'); p.close()
"""
import json
import pathlib
import sys
import time

HERE = pathlib.Path(__file__).resolve().parent
QA = HERE.parent
sys.path.insert(0, str(QA))
import shots  # noqa: E402  (static server over the repo root)

OUT = QA / 'out' / 'realplay'
DEVICES = {
    'desktop': {'width': 1920, 'height': 1080, 'dpr': 1},
    'phone': {'width': 844, 'height': 390, 'dpr': 3, 'mobile': True, 'touch': True},
    'portrait': {'width': 390, 'height': 844, 'dpr': 3, 'mobile': True, 'touch': True},
    'smallphone': {'width': 667, 'height': 375, 'dpr': 2, 'mobile': True, 'touch': True},
    'tinyphone': {'width': 568, 'height': 320, 'dpr': 2, 'mobile': True, 'touch': True},
}
KEY_FOR = {'up': 'ArrowUp', 'down': 'ArrowDown', 'left': 'ArrowLeft', 'right': 'ArrowRight', 'confirm': 'KeyZ', 'cancel': 'KeyX',
           'menu': 'KeyC', 'run': 'ShiftLeft', 'pageL': 'KeyQ', 'pageR': 'KeyE', 'start': 'Enter'}
DIRS = ('up', 'down', 'left', 'right')
GUARD_JS = """() => {
  if (window.__rpGuard) return;
  const g = window.__rpGuard = { calls: [] };
  const wrap = (o, k, name) => { const f = o[k]; if (typeof f !== 'function') return; o[k] = function (...a) { g.calls.push(name); return f.apply(this, a); }; };
  for (const k of ['press', 'battleAct', 'battleUntil']) wrap(LQ_DEBUG, k, 'LQ_DEBUG.' + k);
}"""
LITE_JS = """() => {
  const E = LQ_ENGINE, s = E.scene, name = s ? s.name : null;
  let ss = null;
  try { ss = s && s.debugState ? s.debugState() : null; } catch (e) { ss = { error: String(e) }; }
  return { scene: name, scenes: E.stack.map(x => x.name), transition: E.transition ? E.transition.phase : null, frame: E.frame, ss };
}"""


class Stuck(Exception):
    """A wait that never came true: the game did not do what the input should have made it do."""


class Play:
    def __init__(self, device='desktop', speed=2, tag=''):
        from playwright.sync_api import sync_playwright
        self.device = device
        self.dev = DEVICES[device]
        self.touch = bool(self.dev.get('touch'))
        # A CDP touch takes about 100 ms to land: at 2x that is the 18 frames of menu auto-repeat, and one press walks two rows.
        self.speed = 1 if self.touch else speed
        self.tag = tag
        self.errors, self.checks, self.findings = [], [], []
        self.shot_n = 0
        OUT.mkdir(parents=True, exist_ok=True)
        self.pw = sync_playwright().start()
        self.server = shots.start_server()
        self.browser = self.pw.chromium.launch(headless=True, args=['--autoplay-policy=no-user-gesture-required'])
        self.ctx = self.browser.new_context(viewport={'width': self.dev['width'], 'height': self.dev['height']}, device_scale_factor=self.dev['dpr'],
                                            is_mobile=self.dev.get('mobile', False), has_touch=self.touch, reduced_motion='no-preference')
        self.ctx.set_default_timeout(30000)
        self.page = None
        self.cdp = None

    def boot(self, query='', storage=None, keep=False):
        """Open the game. `storage` {key: value} is placed in localStorage first (a save at a chosen map). keep: keep the old storage."""
        if self.page:
            self.page.close()
        page = self.page = self.ctx.new_page()
        self.cdp = None
        seed = json.dumps(storage or {})
        if not keep:
            page.add_init_script('(() => { try { if (sessionStorage.getItem("rp")) return; sessionStorage.setItem("rp", "1"); localStorage.clear(); '
                                 f'const s = {seed}; for (const k of Object.keys(s)) localStorage.setItem(k, typeof s[k] === "string" ? s[k] : JSON.stringify(s[k])); }} catch (e) {{}} }})()')
        page.on('console', lambda m: self.errors.append(f'console.error: {m.text}') if m.type == 'error' and '404' not in m.text else None)
        page.on('pageerror', lambda e: self.errors.append(f'pageerror: {e}'))
        page.goto(f'http://127.0.0.1:{self.server.server_port}/next/index.html?debug=1&fps=0&seed=7{query}', wait_until='load')
        page.wait_for_function('window.LQ_DEBUG && true', timeout=30000)
        page.evaluate('Promise.race([LQ_DEBUG.ready(), new Promise((_, no) => setTimeout(() => no(new Error("ready timeout")), 30000))])')
        page.evaluate(GUARD_JS)
        page.evaluate(f'LQ_DEBUG.setSpeed({self.speed})')
        self.frames(4)
        return self

    def close(self):
        for fn in (self.ctx.close, self.browser.close, self.pw.stop, self.server.shutdown):
            try:
                fn()
            except Exception:  # noqa: BLE001
                pass

    # ------------------------------------------------------------------ reading
    def js(self, expr, arg=None):
        return self.page.evaluate(expr, arg) if arg is not None else self.page.evaluate(expr)

    def lite(self):
        return self.page.evaluate(LITE_JS)

    def scene(self):
        return self.js('LQ_DEBUG.scene()')

    def ss(self):
        return self.lite()['ss'] or {}

    def battle(self):
        """The battle scene's debug state, or {} away from a battle."""
        return self.js("(() => { const s = LQ_ENGINE.scene; return s && s.name === 'battle' ? s.debugState() : {}; })()")

    def frame(self):
        return self.js('LQ_ENGINE.frame')

    def frames(self, n, timeout=20000):
        start = self.frame()
        self.page.wait_for_function(f'LQ_ENGINE.frame >= {start + int(n)}', timeout=timeout, polling=8)

    def until(self, js, label='', timeout=20):
        """Wait for a JS condition (game time scales with the speed, real seconds here). Stuck (with a screenshot) when it never comes."""
        try:
            if self.touch:
                self.page.evaluate('LQ_DEBUG.setSpeed(2)')
            self.page.wait_for_function(js, timeout=int(timeout * 1000), polling=16)
            if self.touch:
                self.page.evaluate('LQ_DEBUG.setSpeed(1)')
        except Exception as e:  # noqa: BLE001
            if 'Timeout' not in type(e).__name__ and 'Timeout' not in str(e):
                raise
            path = self.shot('STUCK-' + (label or 'wait'))
            raise Stuck(f'{label or js}: never came true in {timeout} s ({path})') from None

    def until_fn(self, fn, label='', timeout=20):
        t0 = time.time()
        while time.time() - t0 < timeout:
            v = fn()
            if v:
                return v
            self.page.wait_for_timeout(16)
        path = self.shot('STUCK-' + (label or 'wait'))
        raise Stuck(f'{label}: never came true in {timeout} s ({path})')

    def guard_calls(self):
        return self.js('window.__rpGuard ? window.__rpGuard.calls.slice() : []')

    # ------------------------------------------------------------------ acting: the only ways in
    def key(self, action, hold_frames=2):
        """A real key press: down, a couple of frames, up."""
        code = KEY_FOR.get(action, action)
        self.page.keyboard.down(code)
        self.frames(hold_frames)
        self.page.keyboard.up(code)
        self.frames(2)

    def _cdp(self):
        if not self.cdp:
            self.cdp = self.ctx.new_cdp_session(self.page)
        return self.cdp

    def _touch(self, kind, x=0, y=0):
        pts = [] if kind == 'touchEnd' else [{'x': x, 'y': y, 'id': 1, 'radiusX': 6, 'radiusY': 6, 'force': 1}]
        self._cdp().send('Input.dispatchTouchEvent', {'type': kind, 'touchPoints': pts})

    def control_box(self, name):
        return self.page.locator(f'[data-control="{name}"]').bounding_box()

    def press_control(self, name, d=None, hold_frames=3):
        """A real finger on an on-screen control (the DOM overlay): A, B, MENU, RUN, or the d-pad with a direction."""
        box = self.control_box(name)
        if not box:
            raise Stuck(f'touch control {name} is not on screen')
        x, y = box['x'] + box['width'] / 2, box['y'] + box['height'] / 2
        if d:
            off = box['width'] * 0.33
            x += {'left': -off, 'right': off}.get(d, 0)
            y += {'up': -off, 'down': off}.get(d, 0)
        self._touch('touchStart', x, y)
        self.frames(hold_frames)
        self._touch('touchEnd', x, y)
        self.frames(2)

    def act(self, action, hold_frames=None):
        """One press of a game action with this device's own control."""
        if not self.touch:
            return self.key(action, hold_frames or 2)
        if action in DIRS:
            return self.press_control('dpad', action, hold_frames or 3)
        name = {'confirm': 'a', 'cancel': 'b', 'menu': 'menu'}.get(action)
        if not name:
            raise ValueError(f'{action} has no on-screen control: tap its game-pixel target instead')
        return self.press_control(name, None, hold_frames or 3)

    def hold(self, action, frames):
        """Hold a direction (a walk, a menu's auto-repeat) for `frames` logic frames."""
        if not self.touch:
            code = KEY_FOR[action]
            self.page.keyboard.down(code)
            self.frames(frames)
            self.page.keyboard.up(code)
        else:
            self.press_control('dpad', action, frames)
        self.frames(1)

    def css(self, gx, gy):
        v = self.js('LQ_DEBUG.view()')
        return v['cssX'] + (gx + 0.5) * v['cssScale'], v['cssY'] + (gy + 0.5) * v['cssScale']

    def tap(self, gx, gy):
        """A real tap on the canvas at game pixels (a click on desktop)."""
        x, y = self.css(gx, gy)
        if self.touch:
            self._touch('touchStart', x, y)
            self.frames(2)
            self._touch('touchEnd', x, y)
        else:
            self.page.mouse.click(x, y)
        self.frames(3)

    def tap_rect(self, r):
        self.tap(r['x'] + r['w'] / 2, r['y'] + r['h'] / 2)

    # ------------------------------------------------------------------ recording
    def shot(self, label):
        self.shot_n += 1
        safe = ''.join(c if c.isalnum() or c in '-_' else '_' for c in label)[:70]
        path = OUT / f'{self.device}{self.tag}-{self.shot_n:03d}-{safe}.png'
        try:
            self.page.screenshot(path=str(path))
        except Exception:  # noqa: BLE001
            pass
        return str(path)

    def check(self, ok, label, detail=''):
        """A soft check: the run goes on, the failure is kept with a screenshot."""
        rec = {'ok': bool(ok), 'label': label, 'detail': str(detail)[:300]}
        if not ok:
            rec['shot'] = self.shot('FAIL-' + label)
            print(f'    FAIL {label}  {str(detail)[:200]}', flush=True)
        self.checks.append(rec)
        return bool(ok)

    def engine_errors(self):
        try:
            return [e['msg'] for e in self.js('LQ_DEBUG.errors()')]
        except Exception:  # noqa: BLE001
            return []


def in_bounds(r, w=384, h=216):
    return r['x'] >= 0 and r['y'] >= 0 and r['x'] + r['w'] <= w and r['y'] + r['h'] <= h


def overlap(a, b):
    return a['x'] < b['x'] + b['w'] and b['x'] < a['x'] + a['w'] and a['y'] < b['y'] + b['h'] and b['y'] < a['y'] + a['h']
