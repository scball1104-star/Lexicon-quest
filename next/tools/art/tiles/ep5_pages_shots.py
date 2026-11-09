"""E5-tiles: render every Episode 5 close-up page mode in a headless browser with the game's own fonts (one browser job).

    python ep5_pages_shots.py        # out/ep5/page_<kind>_<mode>_3x.png, a 3x contact page_all_3x.png,
                                     # and page_<kind>_<mode>_insert_phone.png (the insert on a dimmed field, 844 x 390)

The pages module is imported straight from src/data/ep5/pages.js and called the way world/closeup.js drawPage does
(mk() = a blank 208 x 96 canvas, r = the live renderer, opts = { name, mode }); a page with an `over` layer is shown
complete (its end state) and also half way through its write-in.
"""
import base64, io, json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
NEXT = os.path.normpath(os.path.join(HERE, '..', '..', '..'))
sys.path.insert(0, os.path.join(NEXT, 'qa'))
from shots import start_server, watchdog  # noqa: E402
from PIL import Image  # noqa: E402

OUT = os.path.join(HERE, 'out', 'ep5')
CASES = [('ep5_letter', 'full'), ('ep5_letter', 'blank'), ('ep5_chart', 'prophecy'), ('ep5_chart', 'restored'),
         ('ep5_chart', 'road'), ('ep5_page', None)]

JS = """async ([kind, mode, name, p]) => {
  const mod = await import('./src/data/ep5/pages.js');
  mod.register();
  const { PAGE_KINDS, INSERT } = await import('./src/world/closeup.js');
  const r = LQ_ENGINE.renderer;
  const mk = () => { const c = document.createElement('canvas'); c.width = INSERT.w; c.height = INSERT.h; return c; };
  const P = PAGE_KINDS[kind](mk, r, { name, mode: mode || undefined });
  const W = mk(), g = W.getContext('2d');
  g.drawImage(P.base, 0, 0);
  if (P.over && P.how === 'wipe') { const cut = Math.max(1, Math.round(INSERT.w * p)); g.drawImage(P.over, 0, 0, cut, INSERT.h, 0, 0, cut, INSERT.h); }
  if (P.over && P.how === 'run') { g.globalAlpha = 1 - p; g.drawImage(P.over, 0, 0); g.globalAlpha = 1; }
  return { url: W.toDataURL('image/png'), over: !!P.over, how: P.how || null };
}"""


def main():
    os.makedirs(OUT, exist_ok=True)
    watchdog(240)
    server = start_server()
    url = f'http://127.0.0.1:{server.server_port}/next/index.html?debug=1&fps=0&seed=7'
    from playwright.sync_api import sync_playwright
    errors = []
    shots = []
    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True)
        page = browser.new_page(viewport={'width': 1152, 'height': 648})
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.goto(url, wait_until='load')
        page.wait_for_function('window.LQ_DEBUG && window.LQ_ENGINE && LQ_ENGINE.renderer && LQ_ENGINE.renderer.fonts', timeout=30000)
        page.evaluate('LQ_DEBUG.ready()')
        for kind, mode in CASES:
            for p in (1.0, 0.5):
                res = page.evaluate(JS, [kind, mode, 'Arden', p])
                if p != 1.0 and not res['over']:
                    continue
                im = Image.open(io.BytesIO(base64.b64decode(res['url'].split(',', 1)[1]))).convert('RGB')
                tag = '%s_%s%s' % (kind, mode or 'one', '' if p == 1.0 else '_half')
                im.resize((im.width * 3, im.height * 3), Image.NEAREST).save(os.path.join(OUT, 'page_%s_3x.png' % tag))
                im.save(os.path.join(OUT, 'page_%s_x1.png' % tag))
                shots.append((tag, im))
                print('page', tag, res['how'] or '', flush=True)
        browser.close()
    server.shutdown()
    # a contact of every mode at 3x, and the insert on a dimmed phone frame for the two key pages
    cols = 2
    w, h = 208 * 3, 96 * 3
    full = [s for s in shots if not s[0].endswith('_half')]
    sheet = Image.new('RGB', (cols * (w + 12) + 12, ((len(full) + 1) // cols) * (h + 12) + 12), (24, 20, 34))
    for i, (tag, im) in enumerate(full):
        sheet.paste(im.resize((w, h), Image.NEAREST), (12 + (i % cols) * (w + 12), 12 + (i // cols) * (h + 12)))
    sheet.save(os.path.join(OUT, 'page_all_3x.png'))
    s = 390 / 216.0
    for tag, im in full:
        frame = Image.new('RGB', (384, 216), (12, 10, 24))
        frame.paste(im, ((384 - 208) // 2, 16))
        frame.resize((int(round(384 * s)), 390), Image.NEAREST).save(os.path.join(OUT, 'page_%s_insert_phone.png' % tag))
    if errors:
        print('\n'.join(errors[:10]))
        print('EP5_PAGES_SHOTS: FAIL')
        return 1
    print('EP5_PAGES_SHOTS: PASS (%d images)' % len(shots))
    return 0


if __name__ == '__main__':
    sys.exit(main())
