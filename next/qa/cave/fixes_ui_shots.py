"""C4-fixes: the three menu polish fixes on screen, phone first (issues 23, 24 and 14's prompt text).

    python next/qa/cave/fixes_ui_shots.py [--device phone|desktop]

  23  the Equip screen with a long deep-loot name worn: the slot row is clipped to the panel ("..." inside the window)
  24  the menu's Quit inside a reading: the question box owns the help line (the menu's help text is not drawn under it)
Shots: next/qa/cave/fixes_out/<device>-ui-*.png (3x) and _page.png. Prints FIXES_UI: PASS or FAIL. Bounded (240 s watchdog).
"""
import os
import pathlib
import shutil
import sys
import threading

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / 'world'))
sys.path.insert(0, str(HERE.parent))
from fieldlab import Lab  # noqa: E402

OUT = HERE / 'fixes_out'


def main(argv):
    device = argv[argv.index('--device') + 1] if '--device' in argv else 'phone'
    OUT.mkdir(parents=True, exist_ok=True)
    wd = threading.Timer(240, lambda: (print('FIXES_UI: FAIL watchdog'), os._exit(2)))
    wd.daemon = True
    wd.start()
    lab = Lab(device=device, timeout=30000)
    ok = True

    def shot(name):
        base = f'{device}-ui-{name}'
        src = pathlib.Path(lab.shot(base))
        for f in [src, src.with_name(f'{base}_x1.png')]:
            if f.exists():
                shutil.move(str(f), str(OUT / f.name))
        p = pathlib.Path(lab.screenshot(base))
        shutil.move(str(p), str(OUT / p.name))
        print('  shot', OUT / src.name)

    try:
        lab.open('?debug=1&fps=0&cave=1')
        lab.page.wait_for_function('window.LQ_PACKS && LQ_PACKS.packReady("cave")', timeout=40000)
        lab.page.wait_for_function('LQ_DEBUG.commands().includes("caveBegin")', timeout=10000)
        lab.run('LQ_DEBUG.newGameEp2("Arden", { scene: "none", seed: 77 }); LQ_ENGINE.reset("field", { map: "cave_landing0", x: 10, y: 10, dir: "up" })')
        lab.page.wait_for_function('(() => { const f = LQ_ENGINE.stack.find(s => s.name === "field"); return f && f.map && f.map.id === "cave_landing0" && !f.loading; })()', timeout=30000)
        lab.call('caveBegin', {'seed': 77}, ms=60000)
        lab.page.wait_for_function('(() => { const f = LQ_ENGINE.stack.find(s => s.name === "field"); return f && f.map && f.map.id === "cave_b1" && !f.loading; })()', timeout=60000)
        lab.frames(150)
        while lab.run('LQ_DEBUG.scene()') == 'dialog':      # the vault question cannot come (empty vault); any line is passed
            lab.press('confirm', 2)
            lab.frames(10)
        # 23: a long magic body worn by the hero
        lab.run('''(async () => { const g = LQ_ENGINE.game; const S = await import(new URL("src/game/state.js", location.href).href);
          const I = await import(new URL("src/game/inventory.js", location.href).href);
          const inst = { base: "chain_shirt", rarity: "magic", ilvl: 8, affixes: [], name: "Sturdy Chain Shirt of the Bear's Long Patience" };
          const uid = S.addGear(g, inst); I.equipGear(g, g.party[0], "body", uid); })()''')
        lab.press('menu', 2)
        lab.page.wait_for_function('LQ_DEBUG.scene() === "menu"', timeout=10000)
        lab.frames(20)
        lab.run('LQ_ENGINE.scene.openPage("equip", { member: 0 })')
        lab.frames(20)
        label = lab.run('LQ_ENGINE.scene.screen.slots.items.find(i => i.key === "body").label')
        width = lab.run(f'LQ_ENGINE.renderer.measure({repr(label)})')
        print('  body row:', label, width, 'px')
        if not (label.endswith('…') and width <= 118):
            ok = False
            print('  FAIL the long name is not fitted to the panel')
        shot('equip_long_name')
        lab.press('cancel', 2)
        lab.frames(20)
        # 24: Quit inside a reading, the question over the menu
        lab.run('LQ_ENGINE.scene.run("quit")')
        lab.page.wait_for_function('LQ_DEBUG.scene() === "dialog"', timeout=10000)
        lab.frames(40)
        mode = lab.run('LQ_ENGINE.stack.find(s => s.name === "menu").mode')
        print('  menu mode under the question:', mode)
        if mode != 'busy':
            ok = False
        shot('quit_question')
        lab.press('down', 2)
        lab.frames(6)
        lab.press('confirm', 2)
        lab.frames(30)
    except Exception as e:  # noqa: BLE001
        ok = False
        print('  FAIL', e)
    finally:
        if lab.errors:
            ok = False
            print('  CONSOLE ERRORS:', lab.errors[:5])
        lab.close()
        wd.cancel()
    print('FIXES_UI:', 'PASS' if ok else 'FAIL')
    return 0 if ok else 1


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
