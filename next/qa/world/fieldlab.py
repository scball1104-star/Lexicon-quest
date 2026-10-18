"""Headless field laboratory (W2-world): boot the game straight into the field, drive it through LQ_DEBUG,
and save the internal 384x216 frame as a PNG (optionally upscaled nearest-neighbour) for inspection.

    python next/qa/world/fieldlab.py --map _testtown --x 12 --y 18 --shot town            # one shot
    python next/qa/world/fieldlab.py --map _testdungeon --x 24 --y 13 --walk "left,left,up" --run --shot dng
    python next/qa/world/fieldlab.py --script path/to/steps.json                           # a step list

Steps JSON: a list of {"call": name, "args": [...]}, {"frames": n}, {"press": action, "frames": n},
{"walk": "up,up,left", "run": true}, {"eval": js}, {"shot": name}, {"assert": js, "message": m}.
Also importable: Lab(device='desktop').open(query) / run(js) / shot(name) / close().
Output: next/qa/world/out/<name>.png (3x) and <name>_x1.png (native). Fails loudly on console errors.
"""
import argparse
import json
import os
import pathlib
import sys
import time

HERE = pathlib.Path(__file__).resolve().parent
QA = HERE.parent
NEXT = QA.parent
OUT = HERE / 'out'
sys.path.insert(0, str(QA))
import shots  # noqa: E402  (reuses the static server over the repo root)

DEVICES = {
    'desktop': {'width': 1920, 'height': 1080, 'dpr': 1},
    'phone': {'width': 844, 'height': 390, 'dpr': 3, 'mobile': True, 'touch': True},
}


class Lab:
    def __init__(self, device='desktop', headless=True, timeout=25000):
        from playwright.sync_api import sync_playwright
        self.pw = sync_playwright().start()
        self.server = shots.start_server()
        self.port = self.server.server_address[1]
        dev = DEVICES[device]
        self.browser = self.pw.chromium.launch(headless=headless)
        self.ctx = self.browser.new_context(viewport={'width': dev['width'], 'height': dev['height']},
                                            device_scale_factor=dev['dpr'], is_mobile=dev.get('mobile', False),
                                            has_touch=dev.get('touch', False))
        self.page = self.ctx.new_page()
        self.errors = []
        self.noise = []      # 404s for modules that other agents have not written yet
        self.logs = []
        self.page.on('console', self._on_console)
        self.page.on('pageerror', lambda e: self.errors.append(f'pageerror: {e}\n{getattr(e, "stack", "")}'))
        self.timeout = timeout
        OUT.mkdir(parents=True, exist_ok=True)

    def _on_console(self, msg):
        text = msg.text
        self.logs.append(f'{msg.type}: {text}')
        if msg.type == 'error':
            loc = msg.location.get('url', '') if isinstance(msg.location, dict) else ''
            if 'status of 404' in text:
                self.noise.append(f'404: {loc}')
            else:
                self.errors.append(f'console.error: {text} {loc}')

    def open(self, query='?scene=_devTitle&debug=1&fps=0'):
        self.page.goto(f'http://127.0.0.1:{self.port}/next/index.html{query}', wait_until='load')
        self.page.wait_for_function('window.LQ_DEBUG && true', timeout=self.timeout)
        self.page.evaluate('Promise.race([LQ_DEBUG.ready(), new Promise((_, no) => setTimeout(() => no(new Error("ready timeout")), 20000))])')
        return self

    def run(self, js):
        return self.page.evaluate(js)

    def call(self, name, *args, ms=15000):
        return self.page.evaluate(shots.CALL_JS, [name, list(args), ms])

    def warp(self, map_id, x=None, y=None, d='down'):
        """Warp and wait until that map is live on the field (enter() is async)."""
        self.call('warp', map_id, x, y, d, ms=30000)
        self.page.wait_for_function(
            '(m) => { const s = LQ_DEBUG.state(); const f = LQ_ENGINE.stack.find(sc => sc.name === "field"); return !!f && !!f.map && f.map.id === m && !f.loading && !s.transition; }',
            arg=map_id, timeout=30000, polling=16)
        self.frames(2)

    def frames(self, n):
        start = self.run('LQ_DEBUG.state().frame')
        self.page.wait_for_function(f'LQ_DEBUG.state().frame >= {start + int(n)}', timeout=self.timeout, polling=16)

    def press(self, action, frames=1):
        self.run(f'LQ_DEBUG.press({json.dumps(action)}, {int(frames)})')

    def walk(self, dirs, run=False):
        return self.call('walk', dirs, run, ms=60000)

    def wait_idle(self, ms=8000):
        self.page.wait_for_function('(() => { const s = LQ_DEBUG.state(); return !s.transition && (!s.sceneState || (!s.sceneState.locked && !s.sceneState.leader?.moving)); })()', timeout=ms, polling=16)

    def shot(self, name, scale=3):
        data = self.run('LQ_ENGINE.renderer.canvas.toDataURL("image/png")')
        import base64
        from PIL import Image
        import io
        raw = base64.b64decode(data.split(',', 1)[1])
        im = Image.open(io.BytesIO(raw)).convert('RGB')
        im.save(OUT / f'{name}_x1.png')
        big = im.resize((im.width * scale, im.height * scale), Image.NEAREST)
        big.save(OUT / f'{name}.png')
        return str(OUT / f'{name}.png')

    def screenshot(self, name):
        p = OUT / f'{name}_page.png'
        self.page.screenshot(path=str(p))
        return str(p)

    def state(self):
        return self.run('LQ_DEBUG.state()')

    def close(self):
        try:
            self.ctx.close(); self.browser.close(); self.pw.stop()
        except Exception:
            pass
        try:
            self.server.shutdown()
        except Exception:
            pass


def run_steps(lab, steps):
    for step in steps:
        kind = next(iter(step))
        if kind == 'call':
            if step['call'] == 'warp':
                lab.warp(*step.get('args', []))
            else:
                lab.call(step['call'], *step.get('args', []))
        elif kind == 'frames':
            lab.frames(step['frames'])
        elif kind == 'press':
            lab.press(step['press'], step.get('frames', 1))
        elif kind == 'walk':
            pos = lab.walk(step['walk'], step.get('run', False))
            print('  walk', step['walk'], '->', pos)
        elif kind == 'expect':
            st = lab.run('LQ_DEBUG.state().sceneState')
            got = [st['leader']['x'], st['leader']['y']] if st and st.get('leader') else None
            if got != list(step['expect']):
                raise AssertionError(f"expected leader at {step['expect']}, got {got} ({step.get('message', '')})")
            print('  at', got, 'ok')
        elif kind == 'eval':
            print('  eval ->', lab.run(step['eval']))
        elif kind == 'wait':
            lab.page.wait_for_timeout(step['wait'])
        elif kind == 'auto':
            # auto-advance dialogue, choices (first option) and title cards while scenes run
            lab.run('window.__lqAuto && clearInterval(window.__lqAuto); window.__lqAuto = ' + ('setInterval(() => { const s = LQ_DEBUG.scene(); if (s === "dialog" || s === "choice" || s === "titleCard" || s === "_devMessage") LQ_DEBUG.press("confirm", 1); else if (s === "battle" && window.__lqAutoBattle) LQ_DEBUG.pop("win"); }, %d)' % int(step.get('every', 150)) if step['auto'] else 'null'))
        elif kind == 'goto':
            pos = lab.call('goto', step['goto'][0], step['goto'][1], step.get('run', False), ms=120000)
            print('  goto', step['goto'], '->', pos)
        elif kind == 'idle':
            lab.page.wait_for_function('(() => { const s = LQ_DEBUG.state(); const f = s.sceneState || {}; return s.scene === "field" && !s.transition && !f.locked && !(f.leader && f.leader.moving); })()', timeout=step.get('timeout', 120000), polling=100)
        elif kind == 'waitFor':
            lab.page.wait_for_function(step['waitFor'], timeout=step.get('timeout', 30000), polling=50)
        elif kind == 'shot':
            print('shot', lab.shot(step['shot']))
        elif kind == 'assert':
            if not lab.run(step['assert']):
                raise AssertionError(step.get('message', step['assert']))
        else:
            raise ValueError(f'unknown step {step}')


def main(argv):
    ap = argparse.ArgumentParser()
    ap.add_argument('--map'); ap.add_argument('--x', type=int); ap.add_argument('--y', type=int); ap.add_argument('--dir', default='down')
    ap.add_argument('--walk'); ap.add_argument('--run', action='store_true'); ap.add_argument('--shot', default='field')
    ap.add_argument('--script'); ap.add_argument('--device', default='desktop'); ap.add_argument('--frames', type=int, default=30)
    ap.add_argument('--flags', help='comma list of flags to set before the warp')
    ap.add_argument('--eval', help='js to evaluate before the shot')
    a = ap.parse_args(argv)
    lab = Lab(device=a.device)
    code = 0
    try:
        lab.open()
        if a.flags:
            for f in a.flags.split(','):
                lab.call('setFlag', f.strip(), True)
        if a.map:
            lab.call('warp', a.map, a.x, a.y, a.dir, ms=30000)
            lab.frames(40)
        if a.script:
            with open(a.script) as fh:
                run_steps(lab, json.load(fh))
        if a.walk:
            lab.walk(a.walk, a.run)
        if a.eval:
            print('eval ->', lab.run(a.eval))
        lab.frames(a.frames)
        print('shot', lab.shot(a.shot))
        st = lab.state()
        print('scene', st.get('scene'), 'perf', st.get('perf'))
        print('fieldState', json.dumps(st.get('sceneState'), default=str)[:1500])
    finally:
        if lab.errors:
            code = 1
            print('ERRORS:')
            for e in lab.errors:
                print('  ', e[:1200])
        if lab.noise:
            print(f'(404 noise: {len(lab.noise)} missing modules: ' + ', '.join(sorted(set(n.rsplit("/", 1)[-1] for n in lab.noise))) + ')')
        warn = [l for l in lab.logs if l.startswith('warning')]
        if warn:
            print('warnings:')
            for w in warn[:30]:
                print('  ', w[:300])
        lab.close()
    return code


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
