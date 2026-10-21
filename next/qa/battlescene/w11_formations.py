"""Every multi-foe formation on the stage, desktop and phone (W11 Part A, CRITIQUE_4 item 1).

For each encounter: start it (fresh party, fixed seed), run to the first command menu, force every foe's
weakness row on (the worst case: all rows at once), snap `rows`; then pick Attack so the targeting reticle,
name tag and damage preview show on the first foe, snap `target`. Each snap is cropped to the game canvas and
scaled to 2x; one contact sheet per device and tag goes to next/qa/battlescene/out/:

  python next/qa/battlescene/w11_formations.py --tag before
  python next/qa/battlescene/w11_formations.py --tag after --device phone --only other_selves,c3_mixed

Sheets: w11a_1_formations_<tag>_<device>.png (rows) and w11a_1_targets_<tag>_<device>.png (targeting).
Fails on any console error, page error or engine error.
"""
import argparse
import pathlib
import sys
import time

HERE = pathlib.Path(__file__).resolve().parent
QA = HERE.parent
sys.path.insert(0, str(QA))
from shots import start_server, watchdog  # noqa: E402

OUT = HERE / 'out'
DEVICES = {
    'desktop': {'width': 1920, 'height': 1080, 'dpr': 1},
    'phone': {'width': 844, 'height': 390, 'dpr': 3, 'mobile': True, 'touch': True},
}
# Every Episode 1 and Episode 2 formation of three or more foes, the 2-foe groups with the widest art, and the
# single bosses (their rows move too on the touch layout).
FORMATIONS = [
    'valley_slimes', 'valley_pack', 'f1_slimes', 'f1_mites', 'f1_wraith', 'f2_wraiths', 'f2_mites', 'f3_mixed',
    'road_quick', 'road_pack', 'c1_quick', 'other_selves', 'c3_mixed',
    'valley_wolves', 'f2_golem', 'f3_wraiths', 'c2_knight', 'c3_knights', 'road_beetles',
    'echo_warden', 'archivore', 'whisperwood_alpha', 'nameless_king',
]
BOSSES = {'echo_warden', 'archivore', 'whisperwood_alpha', 'nameless_king', 'other_selves'}
WAIT_MENU = "(() => { const b = LQ_DEBUG.state().battle; return !!(b && b.menu !== 'closed' && !b.fast); })()"
ROWS_ON = "(() => { const s = LQ_ENGINE.scene; for (const a of s.actors.values()) if (a.side === 'enemy' && !a.dead) s.rowShow.set(a.uid, 100000); return true; })()"


def advance_until(page, cond, max_frames=6000, step=5):
    used = 0
    while used < max_frames:
        if page.evaluate(cond):
            return used
        page.evaluate(f'LQ_DEBUG.advance({step})')
        used += step
    raise RuntimeError(f'condition not met within {max_frames} frames: {cond}')


def crop(page, path):
    v = page.evaluate('LQ_DEBUG.view()')
    clip = {'x': v['cssX'], 'y': v['cssY'], 'width': 384 * v['cssScale'], 'height': 216 * v['cssScale']}
    page.screenshot(path=str(path), clip=clip)


def sheet(files, out_path, cols=3):
    from PIL import Image, ImageDraw
    if not files:
        return
    tw, th = 768, 432
    rows = (len(files) + cols - 1) // cols
    img = Image.new('RGB', (cols * tw + (cols + 1) * 8, rows * (th + 18) + 8), (20, 16, 30))
    d = ImageDraw.Draw(img)
    for i, (label, f) in enumerate(files):
        im = Image.open(f).convert('RGB').resize((tw, th), Image.NEAREST)
        x = 8 + (i % cols) * (tw + 8)
        y = 8 + (i // cols) * (th + 18)
        d.text((x, y), label, fill=(240, 220, 140))
        img.paste(im, (x, y + 14))
    img.save(out_path)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--tag', default='after')
    ap.add_argument('--only', default='')
    ap.add_argument('--device', default='desktop,phone')
    ap.add_argument('--timeout', type=int, default=600)
    a = ap.parse_args()
    names = [n.strip() for n in a.only.split(',') if n.strip()] or FORMATIONS
    tmp = OUT / 'w11a_form'
    tmp.mkdir(parents=True, exist_ok=True)
    watchdog(a.timeout)
    server = start_server()
    base = f'http://127.0.0.1:{server.server_port}/next/index.html?debug=1&fps=0&seed=7'
    failures = 0
    from playwright.sync_api import sync_playwright
    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True, args=['--autoplay-policy=no-user-gesture-required'])
        for dname in a.device.split(','):
            dev = DEVICES[dname]
            context = browser.new_context(viewport={'width': dev['width'], 'height': dev['height']}, device_scale_factor=dev.get('dpr', 1),
                                          is_mobile=dev.get('mobile', False), has_touch=dev.get('touch', False))
            context.set_default_timeout(20000)
            page = context.new_page()
            page.add_init_script('(() => { try { localStorage.clear(); } catch (e) {} })()')
            errors = []
            page.on('console', lambda m, errors=errors: errors.append(f'console.error: {m.text}') if m.type == 'error' else None)
            page.on('pageerror', lambda e, errors=errors: errors.append(f'pageerror: {e}'))
            page.goto(base, wait_until='load')
            page.wait_for_function('window.LQ_DEBUG && true', timeout=15000)
            page.evaluate('LQ_DEBUG.ready()')
            page.evaluate('LQ_DEBUG.setSpeed(0)')
            rows_files, target_files = [], []
            for enc in names:
                t0 = time.time()
                status = 'ok'
                try:
                    page.evaluate(f"LQ_DEBUG.battle({enc!r}, {{ fresh: true, seed: 4, noElite: true }})")
                    page.evaluate("LQ_DEBUG.advance(260)" if enc in BOSSES else "LQ_DEBUG.advance(90)")
                    advance_until(page, WAIT_MENU)
                    page.evaluate(ROWS_ON)
                    page.evaluate('LQ_DEBUG.advance(2)')
                    p1 = tmp / f'{a.tag}-{dname}-{enc}-rows.png'
                    crop(page, p1)
                    rows_files.append((enc, p1))
                    page.evaluate("LQ_DEBUG.press('confirm')")
                    page.evaluate('LQ_DEBUG.advance(4)')
                    page.evaluate("(() => { const s = LQ_ENGINE.scene; s.rowShow.clear(); return true; })()")
                    page.evaluate('LQ_DEBUG.advance(2)')
                    p2 = tmp / f'{a.tag}-{dname}-{enc}-target.png'
                    crop(page, p2)
                    target_files.append((enc, p2))
                    page.evaluate("LQ_DEBUG.press('cancel')")
                    page.evaluate('LQ_DEBUG.advance(4)')
                    errs = page.evaluate('LQ_DEBUG.errors()')
                    if errs:
                        errors.extend(f'engine: {e["msg"]}' for e in errs)
                    page.evaluate("(() => { const s = LQ_ENGINE.scene; if (s && s.name === 'battle') LQ_ENGINE.pop('flee'); return true; })()")
                    page.evaluate('LQ_DEBUG.advance(30)')
                except Exception as e:  # noqa: BLE001
                    status = 'FAIL ' + str(e).splitlines()[0][:200]
                    failures += 1
                    page.goto(base, wait_until='load')
                    page.wait_for_function('window.LQ_DEBUG && true', timeout=15000)
                    page.evaluate('LQ_DEBUG.ready()')
                    page.evaluate('LQ_DEBUG.setSpeed(0)')
                if errors:
                    status = 'FAIL ' + ' | '.join(errors[:3])
                    failures += 1
                    errors.clear()
                print(f'{status[:200]:<8} {dname:<8} {enc:<18} {int((time.time() - t0) * 1000):>6} ms', flush=True)
            sheet(rows_files, OUT / f'w11a_1_formations_{a.tag}_{dname}.png')
            sheet(target_files, OUT / f'w11a_1_targets_{a.tag}_{dname}.png')
            context.close()
        browser.close()
    server.shutdown()
    print(f'{failures} failures; sheets in {OUT}')
    return 1 if failures else 0


if __name__ == '__main__':
    sys.exit(main())
