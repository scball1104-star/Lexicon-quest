"""E3-scene-ui headless check of the Episode 3 pages (one browser job, run by hand): the Episode 3 credits over
dialog_keyart_ep3 with first_bell, the Bestiary detail of the Episode 3 foes, and Bram's Tech page listing Tempered Oath
(the menus pass the story flags now), on desktop, phone (844x390) and portrait. Every text line is checked to stay inside
its window (no overflow). PNGs in next/qa/ui/out/e3_pages_*.png (3x).

    python next/qa/ui/e3_pages.py
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
FOES = ['cinder_hound', 'cinder_beetle', 'slag_slime', 'ashbound_miner', 'furnace_construct', 'soot_phantom', 'forge_defender',
        'bellows_specter', 'cinder_warden', 'bellows_coil', 'smelter_coil']


def shot(page, name):
    from PIL import Image
    raw = base64.b64decode(page.evaluate('LQ_ENGINE.renderer.canvas.toDataURL("image/png")').split(',', 1)[1])
    im = Image.open(io.BytesIO(raw)).convert('RGB')
    path = OUT / f'e3_pages_{name}.png'
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
            page.evaluate("LQ_DEBUG.settings({ rotateHintSeen: true }); LQ_DEBUG.newGameEp3('Arden', { slot: 0, scene: 'none' }); true")
            page.evaluate("(() => { const g = LQ_ENGINE.game; g.flags.bram_memory_3 = true; g.bestiary = g.bestiary || {};"
                          f" for (const id of {FOES!r}) g.bestiary[id] = {{ seen: 2, killed: 1, weak: ['ice'], resist: ['fire'] }}; return true; }})()")
            # credits
            page.evaluate("LQ_ENGINE.reset('credits', { episode: 3 }); true")
            adv(page, 10)
            st = page.evaluate("LQ_ENGINE.scene.debugState()")
            check(st['episode'] == 3 and st['art'] == 'dialog_keyart_ep3' and st['first'] == 'Episode 3: The Forge of Ash', f'credits: episode 3 cards over its key art ({st})')
            for i, at in enumerate((420, 1500, 2700)):
                adv(page, at - (0 if i == 0 else (420, 1500, 2700)[i - 1]))
                over = page.evaluate(OVERFLOW)
                check(not over, f'credits frame {at}: no line past the edge {over}')
                shot(page, f'{dname}_credits_{i}')
            # Bestiary: the Episode 3 foes
            page.evaluate("LQ_ENGINE.reset('menu', { page: 'journal', instant: true }); true")
            adv(page, 10)
            page.evaluate("LQ_ENGINE.scene.screen.tab = 1; true")
            for id in ('bellows_specter', 'cinder_warden', 'smelter_coil'):
                page.evaluate(f"(() => {{ const b = LQ_ENGINE.scene.screen.beasts; b.moveTo(b.items.findIndex((it) => it.id === '{id}')); }})()")
                adv(page, 6)
                over = page.evaluate(OVERFLOW)
                check(not over, f'bestiary {id}: no line past the edge {over}')
                shot(page, f'{dname}_bestiary_{id}')
            # Bram's Tech page lists Tempered Oath
            page.evaluate("LQ_ENGINE.reset('menu', { page: 'tech', member: 2, instant: true }); true")
            adv(page, 10)
            labels = page.evaluate("LQ_ENGINE.scene.screen && LQ_ENGINE.scene.screen.list ? LQ_ENGINE.scene.screen.list.items.map((it) => it.label) : []")
            check('Tempered Oath' in labels, f"Bram's Tech page lists the Oath: {labels}")
            page.evaluate("(() => { const l = LQ_ENGINE.scene.screen.list; l.moveTo(l.items.findIndex((it) => it.label === 'Tempered Oath')); })()")
            adv(page, 6)
            shot(page, f'{dname}_tech_bram')
            ctx.close()
        browser.close()
    server.shutdown()
    if errors:
        print('\n'.join(errors[:10]))
        print('E3_PAGES: FAIL (console errors)')
        return 1
    print('E3_PAGES: PASS')
    return 0


if __name__ == '__main__':
    sys.exit(main())
