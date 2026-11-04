"""Moving paintings in the browser (docs/MEDIA_BUILD.md 5), desktop and phone (844x390), headless Chromium:

  1. a hollow battle (paint_battle_hollow) draws its clip: the player reaches 'ready', the stage layer keeps changing,
     every stage pixel above the ground band is one of the still's own colours, zero console errors;
  2. the End of Episode 1 card (paint_card_bells) plays its clip under the text, zero console errors;
  3. with every clip answering 404, the same battle and card keep the still: the player says 'failed', the stage is
     pixel-identical to the still painting and does not change, nothing throws;
  4. reduce motion on: the player module and the clips are never requested; the still shows;
  5. a field scene requests no clip.
PNGs (3x) in next/qa/ui/out/clips_<device>_*.png. Needs assets/clips/paint_battle_hollow.webm and paint_card_bells.webm
(python tools/art/backdrops/build_clips.py).

    python next/qa/ui/clips_headless.py
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
PLAYER = "import('./src/ui/clips/player.js')"
STATE = f"(async (id) => {{ const m = await {PLAYER}; return m.clipState()[id] || null; }})"
# Colours of the stage layer rows 0..bandY-3 (above the band's dithered edge) against the still's whole colour set.
STAGE_COLOURS = """(async () => {
  const s = LQ_ENGINE.scene, L = s.backdropLayer, by = L.band.y - 3;
  const d = L.ctx.getImageData(0, 0, 384, by).data, got = new Set();
  for (let i = 0; i < d.length; i += 4) got.add((d[i] << 16) | (d[i + 1] << 8) | d[i + 2]);
  const img = LQ_ENGINE.assets.img('paint_battle_hollow');
  const c = document.createElement('canvas'); c.width = 384; c.height = 216; const g = c.getContext('2d'); g.drawImage(img, 0, 0);
  const all = g.getImageData(0, 0, 384, 216).data, still = new Set();
  for (let i = 0; i < all.length; i += 4) still.add((all[i] << 16) | (all[i + 1] << 8) | all[i + 2]);
  const e = g.getImageData(0, 0, 384, by).data; let same = 0;
  for (let i = 0; i < e.length; i += 4) if (e[i] === d[i] && e[i + 1] === d[i + 1] && e[i + 2] === d[i + 2]) same++;
  return { off: [...got].filter((x) => !still.has(x)).length, colours: got.size, same: same / (e.length / 4), painted: !!L.painted, clipN: L.clipN || 0, phase: s.phase };
})()"""
HASH = "(() => { const d = LQ_ENGINE.scene.backdropLayer.ctx.getImageData(0, 0, 384, 216).data; let h = 0; for (let i = 0; i < d.length; i += 7) h = (h * 31 + d[i]) | 0; return h; })()"
CANVAS_HASH = "(() => { const c = LQ_ENGINE.renderer.canvas; const d = c.getContext('2d').getImageData(0, 0, 384, 120).data; let h = 0; for (let i = 0; i < d.length; i += 7) h = (h * 31 + d[i]) | 0; return h; })()"


def check(cond, msg):
    if not cond:
        raise AssertionError(msg)
    print('  ok', msg, flush=True)


def shot(page, name):
    from PIL import Image
    raw = base64.b64decode(page.evaluate('LQ_ENGINE.renderer.canvas.toDataURL("image/png")').split(',', 1)[1])
    im = Image.open(io.BytesIO(raw)).convert('RGB')
    path = OUT / f'clips_{name}.png'
    im.resize((im.width * 3, im.height * 3), Image.NEAREST).save(path)
    print('  shot', path, flush=True)


def boot(browser, dev, errors, dname, block=False, reduce=False):
    ctx = browser.new_context(viewport={'width': dev['width'], 'height': dev['height']}, device_scale_factor=dev['dpr'],
                              is_mobile=dev.get('mobile', False), has_touch=dev.get('touch', False),
                              reduced_motion='reduce' if reduce else 'no-preference')
    page = ctx.new_page()
    asked = []
    page.on('request', lambda req: asked.append(req.url) if '/clips/' in req.url else None)
    if block:
        page.route('**/assets/clips/*.webm', lambda route: route.fulfill(status=404, body='missing'))

    def on_console(m):
        if m.type == 'error' and not (block and '404' in m.text):
            errors.append(f'{dname}{" (404 run)" if block else ""}: {m.text}')
    page.on('console', on_console)
    page.on('pageerror', lambda e: errors.append(f'{dname}: pageerror {e}'))
    page.goto(BASE, wait_until='load')
    page.wait_for_function('window.LQ_DEBUG && true', timeout=20000)
    page.evaluate('LQ_DEBUG.ready()')
    page.wait_for_function("LQ_DEBUG.commands().includes('battle') && LQ_DEBUG.engine.hasScene('titleCard')", timeout=20000)
    page.evaluate("LQ_DEBUG.settings({ rotateHintSeen: true }); true")
    return ctx, page, asked


def wait_clip(page, cid, cond, timeout=20000):
    """Poll the player's state for one clip until cond(state) (the state comes from an async import, so no wait_for_function)."""
    for _ in range(timeout // 100):
        st = page.evaluate(f"{STATE}('{cid}')")
        if st and cond(st):
            return st
        page.wait_for_timeout(100)
    raise AssertionError(f'{cid}: timed out, last state {st}')


def battle(page):
    page.evaluate("LQ_DEBUG.battle('hollow_wolves', { fresh: true, seed: 3 })")
    page.wait_for_function("LQ_ENGINE.scene && LQ_ENGINE.scene.name === 'battle' && LQ_ENGINE.scene.backdropLayer && LQ_ENGINE.scene.backdropLayer.painted", timeout=20000)


def card(page):
    page.evaluate("LQ_DEBUG.engine.push('titleCard', { text: 'End of Episode 1', sub: 'The Missing Name', frames: 100000, card: 'paint_card_bells' }); true")
    page.wait_for_function("LQ_ENGINE.scene && LQ_ENGINE.scene.name === 'titleCard' && LQ_ENGINE.assets.has('paint_card_bells')", timeout=20000)


def main():
    global BASE
    OUT.mkdir(parents=True, exist_ok=True)
    watchdog(600)
    server = start_server()
    BASE = f'http://127.0.0.1:{server.server_port}/next/index.html?debug=1&seed=7'
    from playwright.sync_api import sync_playwright
    errors = []
    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True)
        for dname, dev in DEVICES.items():
            print(dname, flush=True)
            # 1 + 2: the clips play
            ctx, page, asked = boot(browser, dev, errors, dname)
            check(page.evaluate("document.createElement('video').canPlayType('video/webm; codecs=\"vp9\"')") != '', 'this Chromium plays VP9')
            battle(page)
            wait_clip(page, 'paint_battle_hollow', lambda st: st['state'] == 'ready' and st['n'] > 24)
            a = page.evaluate(STAGE_COLOURS)
            check(a['painted'] and a['clipN'] > 12, f"the hollow stage draws the clip ({a['clipN']} frames composed, {a['phase']})")
            check(a['off'] == 0, f"every stage pixel is one of the still's colours ({a['colours']} colours, {a['off']} off)")
            h1 = page.evaluate(HASH); page.wait_for_timeout(700); h2 = page.evaluate(HASH)
            check(h1 != h2, 'the stage moves')
            s = page.evaluate(f"{STATE}('paint_battle_hollow')")
            check(s['playing'], f'the clip is playing ({s})')
            shot(page, f'{dname}_battle_hollow')
            card(page)
            wait_clip(page, 'paint_card_bells', lambda st: st['state'] == 'ready' and st['n'] > 24)
            c1 = page.evaluate(CANVAS_HASH); page.wait_for_timeout(700); c2 = page.evaluate(CANVAS_HASH)
            check(c1 != c2, 'the End of Episode 1 card moves under its text')
            shot(page, f'{dname}_end_card_bells')
            page.wait_for_timeout(700)
            s = page.evaluate(f"{STATE}('paint_battle_hollow')")
            check(s is None or not s['playing'], f'the battle clip paused once its scene stopped drawing it ({s})')
            check(all(u.endswith(('paint_battle_hollow.webm', 'paint_card_bells.webm', 'clips.json', 'player.js')) for u in asked), f'only the clips in use were requested ({len(asked)} requests)')
            ctx.close()
            # 3: every clip 404s -> the still
            ctx, page, asked = boot(browser, dev, errors, dname, block=True)
            battle(page)
            wait_clip(page, 'paint_battle_hollow', lambda st: st['state'] == 'failed')
            a = page.evaluate(STAGE_COLOURS)
            check(a['same'] == 1.0 and a['clipN'] == 0, f"404: the stage is the still, pixel for pixel ({a['same']:.4f})")
            h1 = page.evaluate(HASH); page.wait_for_timeout(500); h2 = page.evaluate(HASH)
            check(h1 == h2, '404: the stage holds still')
            shot(page, f'{dname}_battle_hollow_404')
            card(page)
            wait_clip(page, 'paint_card_bells', lambda st: st['state'] == 'failed')
            page.wait_for_timeout(300)
            check(page.evaluate("LQ_ENGINE.scene.name === 'titleCard' && LQ_ENGINE.scene.debugState().card === 'paint_card_bells'"), '404: the card still shows its painting')
            shot(page, f'{dname}_end_card_bells_404')
            ctx.close()
            # 4: reduce motion -> never requested
            ctx, page, asked = boot(browser, dev, errors, dname, reduce=True)
            page.evaluate("LQ_DEBUG.settings({ reduceMotion: true }); true")   # the Config row (it defaults to the OS preference)
            check(page.evaluate('LQ_ENGINE.settings.reduceMotion') is True, 'reduce motion is on')
            battle(page)
            card(page)
            page.wait_for_timeout(1500)
            check(asked == [], f'reduce motion: no clip and no player requested ({asked})')
            ctx.close()
            # 5: the field asks for nothing
            ctx, page, asked = boot(browser, dev, errors, dname)
            page.wait_for_function("LQ_DEBUG.engine.hasScene('field') && LQ_DEBUG.commands().includes('newGame')", timeout=20000)
            page.evaluate("Promise.resolve(LQ_DEBUG.newGame('Arden', { scene: 'field', map: 'willowmere', banner: false })).then(() => true)")
            page.wait_for_function("LQ_ENGINE.scene && LQ_ENGINE.scene.name === 'field'", timeout=20000)
            page.wait_for_timeout(1500)
            check(asked == [], f'the field requests no clip ({asked})')
            ctx.close()
        browser.close()
    server.shutdown()
    if errors:
        print('\n'.join(errors[:10]))
        print('CLIPS_HEADLESS: FAIL (console errors)')
        return 1
    print('CLIPS_HEADLESS: PASS')
    return 0


if __name__ == '__main__':
    sys.exit(main())
