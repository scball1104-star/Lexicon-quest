"""E5-scene-ui headless check of the title's Episode 5 row and its slot picker (one browser job, run by hand).

EP5_LIVE and EP5_MAPS_LISTED are still off on the branch, so the rows are added the way the hooks add them once the offers
show: the ep5 pack loaded (it brings the ep4 pack), then src/data/ep4/title.js offerRow and src/data/ep5/title.js offerRow.
With a finished Episode 4 in slot 0, on desktop, phone (844x390) and portrait:
  1. the row "Episode 5: new party" is listed after the Episode 4 row, the episode rows stay together when the menu folds into
     two columns, its help note shows, every row sits inside the screen;
  2. a free record: KeyZ opens "This party will save to Record N." with Back highlighted and Start offered; Back closes it;
  3. every record full: the refusal with only Back; Back closes it and nothing was written;
  4. slot 0 free: KeyZ goes straight to name entry (nameEntryEp5) with the newest finished record's name filled in.
PNGs in next/qa/ui/out/ep5_title_*.png (3x).

    python next/qa/ui/ep5_scene_title.py
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
        " meta: { name: 'Wren', level: 21, map: 'ep4_vw_inn' }, data: { heroName: 'Wren', flags: Object.fromEntries(flags.map((f) => [f, true])) } }))")
FLAGS = "['ep1_complete', 'ep2_complete', 'ep3_complete', 'ep4_complete']"
ASK = "LQ_ENGINE.scene.name === 'ep5Ask' ? LQ_ENGINE.scene.debugState() : null"
ADD_ROW = ("(async () => { LQ_PACKS.forcePack('ep4'); LQ_PACKS.forcePack('ep5'); await LQ_PACKS.ensurePack('ep5');"
           " const m4 = await import('./src/data/ep4/title.js'), m5 = await import('./src/data/ep5/title.js');"
           " const o = { show: true, url: true, name: 'Wren', slot: 0 };"
           " return m4.offerRow(LQ_ENGINE.scene, o, globalThis.LQ_EP4) && m5.offerRow(LQ_ENGINE.scene, o, globalThis.LQ_EP5); })()")


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
    path = OUT / f'ep5_title_{name}.png'
    im.resize((im.width * 3, im.height * 3), Image.NEAREST).save(path)
    page.screenshot(path=str(OUT / f'ep5_title_{name}_page.png'))
    print('  shot', path, flush=True)


def key(page, k):
    page.keyboard.down(k); adv(page, 2); page.keyboard.up(k); adv(page, 4)


def title(page, slots):
    page.evaluate("localStorage.clear()")
    for n in slots:
        page.evaluate(f"({SAVE})({n}, {FLAGS})")
    page.evaluate("LQ_DEBUG.settings({ rotateHintSeen: true }); LQ_ENGINE.game = null; LQ_DEBUG.reset('title'); true")
    adv(page, 30)
    check(page.evaluate(ADD_ROW), 'offerRow added the row')
    adv(page, 2)
    s = page.evaluate('LQ_DEBUG.state().sceneState')
    it = s['items']
    check('ep5' in it and 'ep4' in it and it.index('ep5') == it.index('ep4') + 1, f"Episode 5 row listed right after Episode 4: {s['labels']}")
    eps = [i for i, x in enumerate(it) if x.startswith('ep')]
    check(eps == list(range(eps[0], eps[0] + len(eps))), f"the episode rows stay together: {it}")
    win = s['win']
    check(win['y'] >= 0 and win['y'] + win['h'] <= 216, f"menu window inside the screen: {win}")
    rows = page.evaluate("LQ_ENGINE.scene.menu.items.map((_, i) => LQ_ENGINE.scene.menu.rowRect(i))")
    check(all(r['y'] >= 0 and r['y'] + r['h'] <= 216 for r in rows), 'every row inside the screen')
    page.evaluate("LQ_ENGINE.scene.menu.moveTo(LQ_ENGINE.scene.menu.items.findIndex((it) => it.id === 'ep5')); true")
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
            g = page.evaluate(ASK)
            check(g and g['options'] == ['back', 'start'] and g['index'] == 0, f'free slot: Back highlighted, Start offered ({g})')
            check('Record ' in g['notice'], f"the notice names the record: {g['notice']}")
            adv(page, 8)
            shot(page, f'{dname}_free_slot')
            key(page, 'KeyX')
            check(page.evaluate(ASK) is None, 'Back (cancel) closes the notice')
            # every record full: the refusal, only Back
            title(page, [0, 1, 2, 3])
            shot(page, f'{dname}_row_all_full')
            before = page.evaluate("[0, 1, 2, 3].map((n) => localStorage.getItem('lq-next-slot-' + n))")
            key(page, 'KeyZ')
            g = page.evaluate(ASK)
            check(g and g['options'] == ['back'], f'all full: only Back ({g})')
            adv(page, 8)
            shot(page, f'{dname}_full')
            key(page, 'KeyZ')
            after = page.evaluate("[0, 1, 2, 3].map((n) => localStorage.getItem('lq-next-slot-' + n))")
            check(page.evaluate(ASK) is None and before == after, 'Back closes it and nothing was written')
            # slot 0 free: straight to name entry with the name filled in
            title(page, [1])
            key(page, 'KeyZ')
            adv(page, 60)
            ne = page.evaluate("({ name: LQ_ENGINE.scene.name, value: LQ_ENGINE.scene.value, slot: LQ_ENGINE.scene.slot })")
            check(ne['name'] == 'nameEntryEp5' and ne['value'] == 'Wren' and ne['slot'] == 0, f'slot 0 free: name entry ({ne})')
            shot(page, f'{dname}_name_entry')
            ctx.close()
        browser.close()
    server.shutdown()
    if errors:
        print('\n'.join(errors[:10]))
        print('EP5_TITLE: FAIL (console errors)')
        return 1
    print('EP5_TITLE: PASS')
    return 0


if __name__ == '__main__':
    sys.exit(main())
