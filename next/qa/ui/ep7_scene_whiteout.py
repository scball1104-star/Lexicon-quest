"""E7-scene-ui headless check of the field helpers in E7-story's `whiteout` (one browser job, run by hand).

The quick start (newGameEp7), warped to the White Road's high stretch with first_stone_read set, runs the scene through
the field's runScene('whiteout') and pages its boxes with LQ_DEBUG.press('confirm') (a debug check of the drawing, not a real-input
test). Checked: s.actorAlpha fades Mira and Bram to 0.3, s.frostNames puts the party row at the top right with their names frosted a
pip at a time to three (the battle's Rime drawer: the same pips and the same frost), the row thaws away at the end and the sprites
come back to full. PNGs in next/qa/ui/out/ep7_whiteout_*.png (3x), desktop and phone (844x390).

    python next/qa/ui/ep7_scene_whiteout.py
"""
import base64
import io
import pathlib
import sys

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))
from shots import start_server, watchdog  # noqa: E402

OUT = HERE / 'out'
DEVICES = {
    'desktop': {'width': 1920, 'height': 1080, 'dpr': 1},
    'phone': {'width': 844, 'height': 390, 'dpr': 3, 'mobile': True, 'touch': True},
}


def check(cond, msg):
    if not cond:
        raise AssertionError(msg)
    print('  ok', msg, flush=True)


def adv(page, n):
    page.evaluate(f'LQ_DEBUG.advance({n})')


def shot(page, name):
    from PIL import Image
    raw = base64.b64decode(page.evaluate('LQ_ENGINE.renderer.canvas.toDataURL("image/png")').split(',', 1)[1])
    im = Image.open(io.BytesIO(raw)).convert('RGB')
    path = OUT / f'ep7_whiteout_{name}.png'
    im.resize((384 * 3, 216 * 3), Image.NEAREST).save(path)
    print('  shot', path, flush=True)


STATE = """(() => { const f = LQ_ENGINE.stack.find((s) => s.name === 'field'); const a = (id) => f && f.actorById(id);
  return { frost: f && f.frost7 ? { ...f.frost7.shown } : null, mira: a('mira') ? a('mira').alpha : null, bram: a('bram') ? a('bram').alpha : null,
    running: !!(f && f.cutscene && f.cutscene.running) }; })()"""


def run(page, dname):
    page.evaluate("for (const k of ['ep4', 'ep5', 'ep6', 'ep7']) LQ_PACKS.forcePack(k); LQ_PACKS.ensurePack('ep7'); true")
    page.wait_for_function("LQ_PACKS.packReady && LQ_PACKS.packReady('ep7') && !!LQ_DEBUG.newGameEp7", timeout=90000)
    page.evaluate("LQ_DEBUG.newGameEp7('Arden', { slot: 1 })")
    page.wait_for_function("LQ_DEBUG.scene() === 'field'", timeout=60000)
    adv(page, 60)
    page.evaluate("LQ_DEBUG.setFlag('first_stone_read'); LQ_DEBUG.warp('ep7_white_road', 16, 24, 'down')")
    adv(page, 120)
    page.evaluate("LQ_ENGINE.scene.runScene('whiteout'); true")
    best = None
    for i in range(400):
        adv(page, 6)
        s = page.evaluate(STATE)
        if s['frost'] and all(v == 3 for v in s['frost'].values()) and best is None:
            adv(page, 20)
            shot(page, f'{dname}_frosted')
            best = page.evaluate(STATE)
        if not s['running']:
            break
        if page.evaluate("LQ_ENGINE.scene && LQ_ENGINE.scene.name === 'dialog'"):
            page.evaluate("LQ_DEBUG.press('confirm')")
    check(best is not None, f'the party row frosted to three ({best})')
    check(best['mira'] is not None and abs(best['mira'] - 0.3) < 0.01 and abs(best['bram'] - 0.3) < 0.01, f'Mira and Bram faded to 0.3 ({best})')
    end = page.evaluate(STATE)
    check(not end['running'], 'the scene ended')
    check(end['frost'] is None and end['mira'] == 1 and end['bram'] == 1, f'the row thawed away and the sprites came back ({end})')
    adv(page, 30)
    shot(page, f'{dname}_after')


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    watchdog(600)
    server = start_server()
    base = f'http://127.0.0.1:{server.server_port}/next/index.html?debug=1&fps=0&seed=7&pack=ep6,ep7&ep=7'
    from playwright.sync_api import sync_playwright
    errors = []
    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True)
        for dname, dev in DEVICES.items():
            print(dname, flush=True)
            ctx = browser.new_context(viewport={'width': dev['width'], 'height': dev['height']}, device_scale_factor=dev['dpr'],
                                      is_mobile=dev.get('mobile', False), has_touch=dev.get('touch', False))
            page = ctx.new_page()
            page.add_init_script('(() => { try { localStorage.clear(); } catch (e) {} })()')
            page.on('console', lambda m: errors.append(f'{dname}: {m.text}') if m.type == 'error' and '404' not in m.text else None)
            page.on('pageerror', lambda e: errors.append(f'{dname}: pageerror {e}'))
            page.goto(base, wait_until='load')
            page.wait_for_function('window.LQ_DEBUG && true', timeout=20000)
            page.evaluate('LQ_DEBUG.ready()')
            run(page, dname)
            ctx.close()
        browser.close()
    server.shutdown()
    if errors:
        print('\n'.join(errors[:10]))
        print('EP7_WHITEOUT: FAIL (console errors)')
        return 1
    print('EP7_WHITEOUT: PASS')
    return 0


if __name__ == '__main__':
    sys.exit(main())
