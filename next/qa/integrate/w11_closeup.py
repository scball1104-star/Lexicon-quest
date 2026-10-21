"""The fountain close-up (W11 Part A, CRITIQUE_4 item 2), every mode on one sheet.

Boots the game, starts Episode 2 in the Nameless Hollow square, opens world/closeup.js in each mode (dusk with the
hero's smudge, the fountain_check crowd of strangers, Mira alone in daylight after nh_restored, the night ending with
the lanterns and the hero faint) and saves the insert at 4x plus a full phone frame:

  python next/qa/integrate/w11_closeup.py [--device phone]

Output: next/qa/integrate/out/w11a_2_closeup_modes.png (4x crops) and w11a_2_closeup_<mode>_<device>.png.
"""
import argparse
import pathlib
import sys

HERE = pathlib.Path(__file__).resolve().parent
QA = HERE.parent
sys.path.insert(0, str(QA))
from shots import start_server, watchdog  # noqa: E402

OUT = HERE / 'out'
DEVICES = {
    'desktop': {'width': 1920, 'height': 1080, 'dpr': 1},
    'phone': {'width': 844, 'height': 390, 'dpr': 3, 'mobile': True, 'touch': True},
}
MODES = [
    ('dusk', [], "{}"),
    ('strangers', [], "{ strangers: true }"),
    ('day_mira', ['nh_restored'], "{ faces: ['mira'] }"),
    ('night', ['nh_restored'], "{ mode: 'night' }"),
]


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--device', default='desktop,phone')
    a = ap.parse_args()
    OUT.mkdir(parents=True, exist_ok=True)
    watchdog(120)
    server = start_server()
    base = f'http://127.0.0.1:{server.server_port}/next/index.html?debug=1&fps=0&seed=7'
    from playwright.sync_api import sync_playwright
    from PIL import Image
    crops = []
    errors = []
    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True)
        for dname in a.device.split(','):
            dev = DEVICES[dname]
            ctx = browser.new_context(viewport={'width': dev['width'], 'height': dev['height']}, device_scale_factor=dev.get('dpr', 1),
                                      is_mobile=dev.get('mobile', False), has_touch=dev.get('touch', False))
            page = ctx.new_page()
            page.add_init_script('(() => { try { localStorage.clear(); } catch (e) {} })()')
            page.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None)
            page.on('pageerror', lambda e: errors.append(str(e)))
            page.goto(base, wait_until='load')
            page.wait_for_function("window.LQ_DEBUG && LQ_DEBUG.engine && LQ_DEBUG.engine.hasScene('field') && LQ_DEBUG.commands().includes('newGameEp2')", timeout=20000)
            page.evaluate('LQ_DEBUG.ready()')
            page.evaluate("LQ_DEBUG.newGameEp2('Arden', { scene: 'none' })")
            for mode, flags, opts in MODES:
                page.evaluate("(() => { const g = LQ_ENGINE.game; for (const f of ['nh_arrived', 'met_elian']) g.flags[f] = true; g.flags.nh_restored = %s; return true; })()"
                              % ('true' if 'nh_restored' in flags else 'false'))
                page.evaluate("LQ_DEBUG.warp('nameless_hollow', 21, 21, 'up')")
                page.wait_for_function("(() => { const f = LQ_ENGINE.scenes.find((x) => x.name === 'field'); return f && f.map && !f.loading && f.map.id === 'nameless_hollow'; })()", timeout=20000)
                page.evaluate('LQ_DEBUG.advance(200)')
                if mode == 'night':
                    page.evaluate("LQ_ENGINE.scenes.find((x) => x.name === 'field').lighting.setTint('night', 0)")
                page.evaluate(f"(() => {{ void LQ_ENGINE.scenes.find((x) => x.name === 'field').closeup.open('fountain', {opts}); return LQ_ENGINE.scene.name; }})()")
                page.evaluate('LQ_DEBUG.advance(70)')
                top = page.evaluate('LQ_DEBUG.scene()')
                if top != 'field':
                    print(f'  note: {mode}: {top} on top of the field', flush=True)
                path = OUT / f'w11a_2_closeup_{mode}_{dname}.png'
                page.screenshot(path=str(path))
                if dname == 'desktop':
                    v = page.evaluate('LQ_DEBUG.view()')
                    s = v['cssScale']
                    x0, y0 = v['cssX'] + 88 * s, v['cssY'] + 16 * s
                    img = Image.open(path).convert('RGB').crop((int(x0), int(y0), int(x0 + 208 * s), int(y0 + 96 * s)))
                    crops.append(img.resize((208 * 4, 96 * 4), Image.NEAREST))
                page.evaluate("LQ_ENGINE.scenes.find((x) => x.name === 'field').closeup.reset()")
            ctx.close()
        browser.close()
    server.shutdown()
    if crops:
        sheet = Image.new('RGB', (208 * 4 * 2 + 12, (96 * 4 + 12) * ((len(crops) + 1) // 2)), (20, 16, 30))
        for i, c in enumerate(crops):
            sheet.paste(c, ((i % 2) * (208 * 4 + 12), (i // 2) * (96 * 4 + 12)))
        sheet.save(OUT / 'w11a_2_closeup_modes.png')
    print('errors:', errors[:5])
    return 1 if errors else 0


if __name__ == '__main__':
    sys.exit(main())
