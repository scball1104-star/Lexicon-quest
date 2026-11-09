"""E5-scene-ui headless check of the Episode 5 pages (one browser job, run by hand, ?pack=ep4,ep5): the Episode 5 credits
(CREDITS_HANDOFF[5]: CREDITS_EP5 over ep5_dialog_keyart) and the end card, the Journal with the Episode 5 main quest, the
Bestiary detail of the Episode 5 foes, and Mira's Tech page listing Turn the Sky, on desktop, phone (844x390) and portrait.
Every text line is checked to stay inside the screen. PNGs in next/qa/ui/out/ep5_pages_*.png (3x).

    python next/qa/ui/ep5_scene_pages.py
"""
import base64
import io
import pathlib
import sys

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))
from shots import start_server, watchdog  # noqa: E402
from e3_title import DEVICES, check, adv  # noqa: E402

OUT = HERE / 'out'
FOES = ['dune_stalker', 'dune_scarab', 'dust_harrier', 'silt_reaver', 'starsilt', 'horizon_shade', 'tomorrow_husk',
        'mirage_knight', 'mirage_double', 'oracle', 'future_hunger', 'future_fear']


def shot(page, name):
    from PIL import Image
    raw = base64.b64decode(page.evaluate('LQ_ENGINE.renderer.canvas.toDataURL("image/png")').split(',', 1)[1])
    im = Image.open(io.BytesIO(raw)).convert('RGB')
    path = OUT / f'ep5_pages_{name}.png'
    im.resize((im.width * 3, im.height * 3), Image.NEAREST).save(path)
    print('  shot', path, flush=True)


# Wrap r.text for one frame and report every line drawn past the right edge of the screen (x + width > 384 - 2).
OVERFLOW = """(() => { const r = LQ_ENGINE.renderer, t = r.text.bind(r), out = [];
  r.text = (s, x, y, o = {}) => { const w = r.measure(s, o.font); const x0 = o.align === 'center' ? x - w / 2 : o.align === 'right' ? x - w : x;
    if (x0 < 0 || x0 + w > 384) out.push(String(s).slice(0, 40) + ' @' + Math.round(x0) + '+' + w); return t(s, x, y, o); };
  LQ_DEBUG.advance(1); r.text = t; return out; })()"""


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    watchdog(600)
    server = start_server()
    base = f'http://127.0.0.1:{server.server_port}/next/index.html?debug=1&fps=0&seed=7&pack=ep4,ep5'
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
            page.evaluate("LQ_DEBUG.settings({ rotateHintSeen: true }); true")
            page.evaluate("LQ_PACKS.forcePack('ep4'); LQ_PACKS.forcePack('ep5'); LQ_PACKS.ensurePack('ep5'); true")
            page.wait_for_function("LQ_PACKS.packReady('ep5') && !!LQ_DEBUG.newGameEp5", timeout=30000)
            page.evaluate("LQ_DEBUG.newGameEp5('Arden', { slot: 0, scene: 'none' })")
            page.wait_for_function("!!LQ_ENGINE.game", timeout=20000)
            adv(page, 5)
            page.evaluate("for (const f of ['ep5_started', 'road_landed', 'haven_arrived', 'lab_entered', 'sky_learned']) LQ_ENGINE.game.flags[f] = true; true")
            page.evaluate("(() => { const g = LQ_ENGINE.game; g.bestiary = g.bestiary || {};"
                          f" for (const id of {FOES!r}) g.bestiary[id] = {{ seen: 2, killed: 1, weak: ['ice'], resist: ['fire'] }}; return true; }})()")
            # credits
            page.evaluate("(async () => { const st = await import('./src/game/story.js'); const h = st.CREDITS_HANDOFF[5]; LQ_ENGINE.reset('credits', { cards: h.cards, music: h.music, episode: 5, endCard: h.endCard }); return true; })()")
            adv(page, 10)
            st = page.evaluate("LQ_ENGINE.scene.debugState()")
            check(st['episode'] == 5 and st['art'] == 'ep5_dialog_keyart' and st['first'] == 'Episode 5: The Last Prophecy', f'credits: episode 5 cards over its key art ({st})')
            for i, at in enumerate((420, 1500, 2700, 3900)):
                adv(page, at - (0 if i == 0 else (420, 1500, 2700, 3900)[i - 1]))
                over = page.evaluate(OVERFLOW)
                check(not over, f'credits frame {at}: no line past the edge {over}')
                shot(page, f'{dname}_credits_{i}')
            # the end card (field.js pushes titleCard with CREDITS_HANDOFF[5].endCard), then the Journal
            page.evaluate("(async () => { const st = await import('./src/game/story.js'); LQ_ENGINE.reset('titleCard', { ...st.CREDITS_HANDOFF[5].endCard }); return true; })()")
            adv(page, 150)
            over = page.evaluate(OVERFLOW)
            check(not over, f'end card: no line past the edge {over}')
            shot(page, f'{dname}_end_card')
            page.evaluate("LQ_ENGINE.reset('menu', { page: 'journal', instant: true }); true")
            adv(page, 10)
            over = page.evaluate(OVERFLOW)
            check(not over, f'journal: no line past the edge {over}')
            shot(page, f'{dname}_journal')
            page.evaluate("LQ_ENGINE.scene.screen.tab = 1; true")
            for id in ('dune_scarab', 'tomorrow_husk', 'mirage_knight', 'oracle', 'future_fear'):
                page.evaluate(f"(() => {{ const b = LQ_ENGINE.scene.screen.beasts; b.moveTo(b.items.findIndex((it) => it.id === '{id}')); }})()")
                adv(page, 6)
                over = page.evaluate(OVERFLOW)
                check(not over, f'bestiary {id}: no line past the edge {over}')
                shot(page, f'{dname}_bestiary_{id}')
            # Mira's Tech page lists Turn the Sky
            page.evaluate("LQ_ENGINE.reset('menu', { page: 'tech', member: 1, instant: true }); true")
            adv(page, 10)
            labels = page.evaluate("LQ_ENGINE.scene.screen && LQ_ENGINE.scene.screen.list ? LQ_ENGINE.scene.screen.list.items.map((it) => it.label) : []")
            check('Turn the Sky' in labels, f"Mira's Tech page lists Turn the Sky: {labels}")
            page.evaluate("(() => { const l = LQ_ENGINE.scene.screen.list; l.moveTo(l.items.findIndex((it) => it.label === 'Turn the Sky')); })()")
            adv(page, 6)
            over = page.evaluate(OVERFLOW)
            check(not over, f'tech: no line past the edge {over}')
            shot(page, f'{dname}_tech_mira')
            ctx.close()
        browser.close()
    server.shutdown()
    if errors:
        print('\n'.join(errors[:10]))
        print('EP5_PAGES: FAIL (console errors)')
        return 1
    print('EP5_PAGES: PASS')
    return 0


if __name__ == '__main__':
    sys.exit(main())
