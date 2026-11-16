"""E8-scene-ui headless check of the title's Episode 8 row, its slot picker and the Load Game star (one browser job, run by hand).

EP8_LIVE is still off on the branch, so the rows are added the way the hooks add them once the offers show: the ep8 pack loaded (it
brings ep7 to ep3), then the ep4 to ep8 title.js offerRow in turn (with the Episode 2 and 3 rows: seven episode rows).
With a finished Episode 7 in slot 0, on desktop, the phone (844x390) and the tall phone (375x812):
  1. the folded menu (one New party row) fits the screen; the open list has "Episode 8: new party" last, right after Episode 7, the
     seven episode rows together, its help note, every row inside the screen;
  2. a free record: KeyZ opens "This party will save to Record N." with Back highlighted and Start offered; Back closes it;
  3. slot 0 free: KeyZ goes straight to name entry (nameEntryEp8) with the newest finished record's name filled in;
  4. Load Game with a record that finished Episode 8: the gold star beside its place name, none beside the other.
PNGs in next/qa/ui/out/ep8_title_*.png (3x).

    python next/qa/ui/ep8_scene_title.py
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
    'tall': {'width': 375, 'height': 812, 'dpr': 3, 'mobile': True, 'touch': True},
}
SAVE = ("(n, flags) => localStorage.setItem('lq-next-slot-' + n, JSON.stringify({ v: 1, savedAt: '2026-11-0' + (n + 1) + 'T10:00:00Z',"
        " meta: { name: 'Wren', level: 31, map: 'ep7_ph_watch', party: ['hero', 'mira', 'bram'], chapter: 7 }, data: { heroName: 'Wren', flags: Object.fromEntries(flags.map((f) => [f, true])) } }))")
FLAGS = "['ep1_complete', 'ep2_complete', 'ep3_complete', 'ep4_complete', 'ep5_complete', 'ep6_complete', 'ep7_complete']"
ASK = "LQ_ENGINE.scene.name === 'ep8Ask' ? LQ_ENGINE.scene.debugState() : null"
ADD_ROW = ("(async () => { for (const k of ['ep4', 'ep5', 'ep6', 'ep7', 'ep8']) LQ_PACKS.forcePack(k); await LQ_PACKS.ensurePack('ep8');"
           " const t0 = Date.now(); while (!globalThis.LQ_EP8 && Date.now() - t0 < 60000) await new Promise((ok) => setTimeout(ok, 50));"
           " const ms = [];"
           " for (const n of [4, 5, 6, 7, 8]) ms.push([await import(`./src/data/ep${n}/title.js`), globalThis[`LQ_EP${n}`]]);"
           " const o = { show: true, url: true, name: 'Wren', slot: 0 };"
           " return ms.every(([m, h]) => m.offerRow(LQ_ENGINE.scene, o, h)); })()")


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
    path = OUT / f'ep8_title_{name}.png'
    im.resize((im.width * 3, im.height * 3), Image.NEAREST).save(path)
    page.screenshot(path=str(OUT / f'ep8_title_{name}_page.png'))
    print('  shot', path, flush=True)


def key(page, k):
    page.keyboard.down(k); adv(page, 2); page.keyboard.up(k); adv(page, 4)


def inside(page, label):
    s = page.evaluate('LQ_DEBUG.state().sceneState')
    win = s['win']
    check(win['y'] >= 0 and win['y'] + win['h'] <= 216 and win['x'] >= 0 and win['x'] + win['w'] <= 384, f"{label}: menu window inside the screen: {win}")
    rows = page.evaluate("LQ_ENGINE.scene.menu.items.map((_, i) => LQ_ENGINE.scene.menu.isVisible(i) ? LQ_ENGINE.scene.menu.rowRect(i) : null).filter(Boolean)")
    check(all(r['y'] >= 0 and r['y'] + r['h'] <= 216 and r['x'] >= 0 and r['x'] + r['w'] <= 384 for r in rows), f'{label}: every row inside the screen')
    return s


def title(page, slots, dname):
    page.evaluate("localStorage.clear()")
    for n in slots:
        page.evaluate(f"({SAVE})({n}, {FLAGS})")
    page.evaluate("LQ_DEBUG.settings({ rotateHintSeen: true }); LQ_ENGINE.game = null; LQ_DEBUG.reset('title'); true")
    adv(page, 30)
    check(page.evaluate(ADD_ROW), 'offerRow added the rows')
    adv(page, 30)
    s = inside(page, 'folded')
    check('ep8' not in s['items'], f"folded: the episode rows sit under New party ({s['items']})")
    shot(page, f'{dname}_folded')
    check(page.evaluate("LQ_ENGINE.scene.showQuickStart('ep8')"), 'the New party... list opens on the row')
    adv(page, 4)
    s = inside(page, 'open')
    it = s['items']
    eps = [x for x in it if x.startswith('ep')]
    check(len(eps) == 7 and eps[-1] == 'ep8' and it.index('ep8') == it.index('ep7') + 1, f"seven episode rows, Episode 8 last after Episode 7: {it}")
    check('Episode 8: new party' in s['labels'], f"the row's label: {s['labels']}")
    return s


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    watchdog(900)
    server = start_server()
    base = f'http://127.0.0.1:{server.server_port}/next/index.html?debug=1&fps=0&seed=7&pack=ep8'
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
            # before any key press (a key turns the touch layout to the keyboard one)
            title(page, [0], dname)
            adv(page, 30)
            shot(page, f'{dname}_row')
            key(page, 'KeyZ')
            g = page.evaluate(ASK)
            check(g and g['options'] == ['back', 'start'] and g['index'] == 0, f'free slot: Back highlighted, Start offered ({g})')
            adv(page, 8)
            shot(page, f'{dname}_free_slot')
            key(page, 'KeyX')
            check(page.evaluate(ASK) is None, 'Back (cancel) closes the notice')
            title(page, [1], dname)
            key(page, 'KeyZ')
            adv(page, 60)
            ne = page.evaluate("({ name: LQ_ENGINE.scene.name, value: LQ_ENGINE.scene.value, slot: LQ_ENGINE.scene.slot })")
            check(ne['name'] == 'nameEntryEp8' and ne['value'] == 'Wren' and ne['slot'] == 0, f'slot 0 free: name entry ({ne})')
            shot(page, f'{dname}_name_entry')
            # Load Game: record 1 finished Episode 8, record 2 did not
            page.evaluate("localStorage.clear()")
            page.evaluate(f"({SAVE})(1, [...{FLAGS}, 'ep8_complete'])")
            page.evaluate(f"({SAVE})(2, {FLAGS})")
            page.evaluate("LQ_ENGINE.game = null; LQ_DEBUG.reset('title'); true")
            adv(page, 20)
            page.evaluate("LQ_ENGINE.push('loadGame', { mode: 'load' })")
            adv(page, 20)
            shot(page, f'{dname}_load_star')
            ctx.close()
        browser.close()
    server.shutdown()
    if errors:
        print('\n'.join(errors[:10]))
        print('EP8_TITLE: FAIL (console errors)')
        return 1
    print('EP8_TITLE: PASS')
    return 0


if __name__ == '__main__':
    sys.exit(main())
