"""W13 item 1: every boss of both episodes on the stage at the moment the HUD crowds it most, desktop and phone.

For each boss: start its encounter (fresh party, fixed seed), fast-forward to the first party turn with a
telegraph pending (the help window shows the warning at its longest and the "!" stands over the foe; the Other
Selves wait for the Mirrored Combo, the unmasked King for phase 3 first), let the menu settle, and save the game
canvas at the device's own pixels:

    next/qa/battlescene/out/w13_<boss>_<tag>_<device>.png      (tag = before | after)

then picks Attack and saves the target view (reticle, name tag, damage preview) as w13_<boss>_target_<tag>_<device>.png,
plus one contact sheet per tag and device, w13_sheet_<tag>_<device>.png, for a side-by-side look.

  python next/qa/battlescene/w13_hud.py --tag before
  python next/qa/battlescene/w13_hud.py --tag after --device phone --only king_veiled,king_unmasked

Prints, per view, the help lines drawn and the boss's sprite top so the overlap is checkable as numbers too.
Fails on any console error, page error or engine error.
"""
import argparse
import json
import pathlib
import sys
import time

HERE = pathlib.Path(__file__).resolve().parent
QA = HERE.parent
sys.path.insert(0, str(QA))
from shots import start_server, watchdog  # noqa: E402

OUT = HERE / 'out'
SPEC = json.loads((QA / 'shots.json').read_text(encoding='utf-8'))
DEVICES = {k: SPEC['devices'][k] for k in ('desktop', 'phone')}

# name -> (encounter, seed, fast-forward conditions in order)
BOSSES = {
    'archivore': ('archivore', 2, ['telegraph']),
    'echo_warden': ('echo_warden', 2, ['telegraph']),
    'briar_alpha': ('whisperwood_alpha', 2, ['telegraph']),
    'elder_alpha': ('whisperwood_alpha_t2', 2, ['telegraph']),
    'other_selves': ('other_selves', 1, ['mirror']),
    'king_veiled': ('nameless_king', 3, ['telegraph']),
    'king_unmasked': ('nameless_king', 3, ['phase3', 'defend_to_telegraph']),
    # extra King states: a member Kept in a shard (the Fury badge on his row), and phase 2 with Sorrow and Pride
    'king_kept': ('nameless_king', 3, ['kept']),
    'king_phase2': ('nameless_king', 3, ['phase2']),
}
# 'defend_to_telegraph': the party Defends until the foe telegraphs (the fast-forward's own picks win first)
DEFEND_STEP = """(() => { const s = LQ_ENGINE.scene; if (!s || s.name !== 'battle') return 'gone';
  const b = LQ_DEBUG.state().battle; if (!(b && b.menu !== 'closed' && !b.fast)) return 'busy';
  if (s.telegraphs.size) return 'done';
  s.menu.close(); s.performParty({ type: 'defend' }); return 'defended'; })()"""
WAIT_MENU = "(() => { const b = LQ_DEBUG.state().battle; return !!(b && b.menu !== 'closed' && !b.fast); })()"
PROBE = """(() => {
  const s = LQ_ENGINE.scene; const r = LQ_ENGINE.renderer;
  const hv = s.helpView(r);
  const foes = [...s.actors.values()].filter((a) => a.side === 'enemy' && !a.dead)
    .map((a) => ({ id: a.id, name: a.name, x: a.cx, top: a.top, w: a.w, h: a.h, feet: Math.round(a.y) }));
  return { help: hv.text, tele: s.telegraphs.size, foes };
})()"""


def advance_until(page, cond, max_frames=20000, step=5):
    used = 0
    while used < max_frames:
        if page.evaluate(cond):
            return used
        page.evaluate(f'LQ_DEBUG.advance({step})')
        used += step
    raise RuntimeError(f'condition not met within {max_frames} frames: {cond}')


def crop(page, path, dpr):
    from PIL import Image
    v = page.evaluate('LQ_DEBUG.view()')
    page.screenshot(path=str(path))
    s = v['cssScale'] * dpr
    x0, y0 = round(v['cssX'] * dpr), round(v['cssY'] * dpr)
    img = Image.open(path).convert('RGB')
    img.crop((x0, y0, x0 + round(384 * s), y0 + round(216 * s))).save(path)


def sheet(files, out_path, cols=2):
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
    names = [n.strip() for n in a.only.split(',') if n.strip()] or list(BOSSES)
    OUT.mkdir(parents=True, exist_ok=True)
    watchdog(a.timeout)
    server = start_server()
    base = f'http://127.0.0.1:{server.server_port}/next/index.html?debug=1&fps=0'
    failures = 0
    from playwright.sync_api import sync_playwright
    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True, args=['--autoplay-policy=no-user-gesture-required'])
        for dname in a.device.split(','):
            dev = DEVICES[dname]
            dpr = dev.get('dpr', 1)
            context = browser.new_context(viewport={'width': dev['width'], 'height': dev['height']}, device_scale_factor=dpr,
                                          is_mobile=dev.get('mobile', False), has_touch=dev.get('touch', False))
            context.set_default_timeout(20000)
            for name in names:
                enc, seed, conds = BOSSES[name]
                t0 = time.time()
                status, info = 'ok', {}
                errors = []
                page = context.new_page()
                page.add_init_script('(() => { try { localStorage.clear(); } catch (e) {} })()')
                page.on('console', lambda m, errors=errors: errors.append(f'console.error: {m.text}') if m.type == 'error' else None)
                page.on('pageerror', lambda e, errors=errors: errors.append(f'pageerror: {e}'))
                try:
                    page.goto(base, wait_until='load')
                    page.wait_for_function('window.LQ_DEBUG && true', timeout=15000)
                    page.evaluate('LQ_DEBUG.ready()')
                    page.evaluate('LQ_DEBUG.setSpeed(0)')
                    page.evaluate(f"LQ_DEBUG.battle({enc!r}, {{ fresh: true, seed: {seed} }})")
                    page.evaluate('LQ_DEBUG.advance(60)')
                    for c in conds:
                        if c == 'defend_to_telegraph':
                            for _ in range(4000):
                                st = page.evaluate(DEFEND_STEP)
                                if st in ('done', 'gone'):
                                    break
                                page.evaluate('LQ_DEBUG.advance(5)')
                            assert st == 'done', st
                            continue
                        page.evaluate(f'LQ_DEBUG.battleUntil({c!r})')
                        advance_until(page, WAIT_MENU)
                    page.evaluate('LQ_DEBUG.advance(40)')
                    info = page.evaluate(PROBE)
                    path = OUT / f'w13_{name}_{a.tag}_{dname}.png'
                    crop(page, path, dpr)
                    # then Attack: the target view (reticle, name tag, damage preview, the timeline's landing slot)
                    page.evaluate("LQ_DEBUG.press('confirm')")
                    page.evaluate('LQ_DEBUG.advance(6)')
                    crop(page, OUT / f'w13_{name}_target_{a.tag}_{dname}.png', dpr)
                    errs = page.evaluate('LQ_DEBUG.errors()')
                    if errs:
                        errors.extend(f'engine: {e["msg"]}' for e in errs)
                except Exception as e:  # noqa: BLE001
                    status = 'FAIL ' + str(e).splitlines()[0][:200]
                    failures += 1
                if errors and status == 'ok':
                    status = 'FAIL ' + ' | '.join(errors[:3])
                    failures += 1
                page.close()
                foes = ', '.join(f"{f['id']} top {f['top']} x {f['x']}" for f in info.get('foes', []))
                print(f'{status[:200]:<6} {dname:<8} {name:<14} {int((time.time() - t0) * 1000):>6} ms  help={info.get("help")!r}  {foes}', flush=True)
            # the sheet takes every boss already rendered for this tag and device (a partial --only run keeps the rest)
            every = [(f'{n}{v} ({a.tag}, {dname})', OUT / f'w13_{n}{v}_{a.tag}_{dname}.png') for n in BOSSES for v in ('', '_target')]
            sheet([(lab, p) for lab, p in every if p.exists()], OUT / f'w13_sheet_{a.tag}_{dname}.png')
            context.close()
        browser.close()
    server.shutdown()
    print(f'{failures} failures; files in {OUT}')
    return 1 if failures else 0


if __name__ == '__main__':
    sys.exit(main())
