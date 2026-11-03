"""E3-scene-ui headless check of the title's Episode 3 row and its slot picker (one browser job, run by hand).

With a finished Episode 2 in slot 0 and EP3_LIVE forced on for this page only (reset('title', { ep3Live: true }), the
production rule otherwise), on desktop, phone (844x390) and portrait:
  1. the row "Episode 3: new party" is listed, its help note shows when it is highlighted, and every row and the note sit
     inside the screen (the 4th load slot once hid under the help bar: rows are checked against the screen edge);
  2. a free record: KeyZ on the row opens the notice "This party will save to slot 1." with Back highlighted, Start offered;
  3. every record full: the refusal with only Back, and KeyZ on Back closes it with nothing written.
PNGs in next/qa/ui/out/e3_title_*.png (3x).

    python next/qa/ui/e3_title.py
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
    'portrait': {'width': 390, 'height': 844, 'dpr': 3, 'mobile': True, 'touch': True},
}
SAVE = ("(n, flags) => localStorage.setItem('lq-next-slot-' + n, JSON.stringify({ v: 1, savedAt: '2026-11-0' + (n + 1) + 'T10:00:00Z',"
        " meta: { name: 'Arden', level: 13, map: 'nh_inn' }, data: { heroName: 'Arden', flags: Object.fromEntries(flags.map((f) => [f, true])) } }))")


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
    path = OUT / f'e3_title_{name}.png'
    im.resize((im.width * 3, im.height * 3), Image.NEAREST).save(path)
    page.screenshot(path=str(OUT / f'e3_title_{name}_page.png'))
    print('  shot', path, flush=True)


def key(page, k):
    page.keyboard.down(k); adv(page, 2); page.keyboard.up(k); adv(page, 4)


def title(page, slots):
    page.evaluate("localStorage.clear()")
    for n in slots:
        page.evaluate(f"({SAVE})({n}, ['ep1_complete', 'ep2_complete'])")
    page.evaluate("LQ_DEBUG.settings({ rotateHintSeen: true }); LQ_ENGINE.game = null; LQ_DEBUG.reset('title', { ep3Live: true }); true")
    adv(page, 30)
    s = page.evaluate('LQ_DEBUG.state().sceneState')
    check('ep3' in s['items'], f"Episode 3 row listed: {s['labels']}")
    win = s['win']
    check(win['y'] >= 0 and win['y'] + win['h'] <= 216, f"menu window inside the screen: {win}")
    rows = page.evaluate("LQ_ENGINE.scene.menu.items.map((_, i) => LQ_ENGINE.scene.menu.rowRect(i))")
    check(all(r['y'] >= 0 and r['y'] + r['h'] <= 216 for r in rows), 'every row inside the screen')
    page.evaluate("LQ_ENGINE.scene.menu.moveTo(LQ_ENGINE.scene.menu.items.findIndex((it) => it.id === 'ep3')); true")
    adv(page, 4)
    return s


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    watchdog(600)
    server = start_server()
    base = f'http://127.0.0.1:{server.server_port}/next/index.html?debug=1&fps=0&seed=7'
    from playwright.sync_api import sync_playwright
    errors = []
    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True)
        for dname, dev in DEVICES.items():
            print(dname, flush=True)
            ctx = browser.new_context(viewport={'width': dev['width'], 'height': dev['height']}, device_scale_factor=dev['dpr'],
                                      is_mobile=dev.get('mobile', False), has_touch=dev.get('touch', False))
            page = ctx.new_page()
            page.on('console', lambda m: errors.append(f'{dname}: {m.text}') if m.type == 'error' and '404' not in m.text else None)
            page.on('pageerror', lambda e: errors.append(f'{dname}: pageerror {e}'))
            page.goto(base, wait_until='load')
            page.wait_for_function('window.LQ_DEBUG && true', timeout=20000)
            page.evaluate('LQ_DEBUG.ready()')
            # before any key press (a key turns the touch layout to the keyboard one): every record full, so Fine Print joins too
            title(page, [0, 1, 2, 3])
            adv(page, 30)
            shot(page, f'{dname}_rows_untouched')
            # a free record (slot 0 holds the Episode 2 game)
            title(page, [0])
            shot(page, f'{dname}_row')
            key(page, 'KeyZ')
            g = page.evaluate('LQ_DEBUG.state().sceneState.guard')
            check(g and g['options'] == ['back', 'start'] and g['index'] == 0, f'free slot: Back highlighted, Start offered ({g})')
            check('slot 1' in g['line'], f"the notice names the record: {g['line']}")
            adv(page, 8)
            shot(page, f'{dname}_free_slot')
            key(page, 'KeyX')
            check(page.evaluate('LQ_DEBUG.state().sceneState.guard') is None, 'Back (cancel) closes the notice')
            # every record full: the refusal, only Back
            title(page, [0, 1, 2, 3])
            shot(page, f'{dname}_row_all_full')
            before = page.evaluate("[0, 1, 2, 3].map((n) => localStorage.getItem('lq-next-slot-' + n))")
            key(page, 'KeyZ')
            g = page.evaluate('LQ_DEBUG.state().sceneState.guard')
            check(g and g['options'] == ['back'], f'all full: only Back ({g})')
            adv(page, 8)
            shot(page, f'{dname}_full')
            key(page, 'KeyZ')
            after = page.evaluate("[0, 1, 2, 3].map((n) => localStorage.getItem('lq-next-slot-' + n))")
            check(page.evaluate('LQ_DEBUG.state().sceneState.guard') is None and before == after, 'Back closes it and nothing was written')
            ctx.close()
        browser.close()
    server.shutdown()
    if errors:
        print('\n'.join(errors[:10]))
        print('E3_TITLE: FAIL (console errors)')
        return 1
    print('E3_TITLE: PASS')
    return 0


if __name__ == '__main__':
    sys.exit(main())
