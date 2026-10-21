"""The Hollow's silver dusk against its restored daylight and Willowmere's morning (W11 Part A, CRITIQUE_4 item 3).

Snaps the Unwritten Square before nh_restored (hollow_dusk), the same view after it, and Willowmere's square, on
desktop and phone, and prints the mean luminance and saturation of the game area for each (the critic's yardstick:
before 0.459, after 0.505, Willowmere 0.485). A frame of the restoration cross-fade (dawn gold) is snapped too.

  python next/qa/integrate/w11_hollow_tint.py --tag after

Output: next/qa/integrate/out/w11a_3_<view>_<tag>_<device>.png and w11a_3_tint_<tag>.json.
"""
import argparse
import json
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
FIELD = "LQ_ENGINE.scenes.find((x) => x.name === 'field')"
VIEWS = [
    ('hollow_dusk', 'nameless_hollow', 22, 21, ['nh_arrived', 'met_elian']),
    ('hollow_restored', 'nameless_hollow', 22, 21, ['nh_arrived', 'met_elian', 'aurel_named', 'nh_restored']),
    ('willowmere', 'willowmere', 24, 20, []),
]


def stats(path, v):
    from PIL import Image
    import numpy as np
    im = Image.open(path).convert('RGB')
    k = im.width / v['vw'] if v.get('vw') else 1          # device pixels per css pixel
    s = v['cssScale'] * k
    x0, y0 = v['cssX'] * k, v['cssY'] * k
    im = im.crop((int(x0), int(y0), int(x0 + 384 * s), int(y0 + 216 * s)))
    a = np.asarray(im).astype('float32') / 255.0
    lum = float((0.2126 * a[..., 0] + 0.7152 * a[..., 1] + 0.0722 * a[..., 2]).mean())
    mx, mn = a.max(axis=2), a.min(axis=2)
    sat = float(np.where(mx > 0, (mx - mn) / np.maximum(mx, 1e-6), 0).mean())
    return round(lum, 3), round(sat, 3)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--tag', default='after')
    ap.add_argument('--device', default='desktop,phone')
    a = ap.parse_args()
    OUT.mkdir(parents=True, exist_ok=True)
    watchdog(240)
    server = start_server()
    base = f'http://127.0.0.1:{server.server_port}/next/index.html?debug=1&fps=0&seed=7'
    from playwright.sync_api import sync_playwright
    report, errors = {}, []
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
            for name, mid, x, y, flags in VIEWS:
                page.evaluate("(async () => { const g = LQ_ENGINE.game; for (const k of Object.keys(g.flags)) if (/^nh_|aurel_named/.test(k)) delete g.flags[k]; "
                              "for (const f of %s) g.flags[f] = true; const { BARKS } = await import('./src/data/text.js'); for (const k of Object.keys(BARKS)) g.counters['bark:' + k] = 1; return true; })()" % json.dumps(flags))
                page.evaluate(f"LQ_DEBUG.warp({mid!r}, {x}, {y}, 'down')")
                page.wait_for_function(f"(() => {{ const f = {FIELD}; return !!(f && f.map && f.map.id === {mid!r} && !f.loading); }})()", timeout=20000)
                page.wait_for_timeout(2600)       # the location banner leaves
                v = page.evaluate('({ ...LQ_DEBUG.view(), vw: window.innerWidth })')
                path = OUT / f'w11a_3_{name}_{a.tag}_{dname}.png'
                page.screenshot(path=str(path))
                report[f'{name}_{dname}'] = stats(path, v)
                if name == 'hollow_dusk':
                    # the restoration's cross-fade, a third of the way (the scene's own timing, without the scene)
                    has_dawn = page.evaluate(f"(() => {{ const f = {FIELD}; return !!(f.lighting && f.lighting.setTint); }})()")
                    if has_dawn:
                        page.evaluate(f"(() => {{ const f = {FIELD}; f.closeup.reset(); void f.lighting.setTint('hollow_dawn', 90); return true; }})()")
                        page.wait_for_timeout(900)
                        p2 = OUT / f'w11a_3_hollow_dawn_{a.tag}_{dname}.png'
                        page.screenshot(path=str(p2))
                        report[f'hollow_dawn_{dname}'] = stats(p2, v)
            ctx.close()
        browser.close()
    server.shutdown()
    (OUT / f'w11a_3_tint_{a.tag}.json').write_text(json.dumps(report, indent=1), encoding='utf-8')
    for k, (lum, sat) in report.items():
        print(f'{k:<28} luminance {lum:.3f}  saturation {sat:.3f}')
    print('errors:', errors[:5])
    return 1 if errors else 0


if __name__ == '__main__':
    sys.exit(main())
