"""W15 save trap repro (PLAYTEST_REVIEW_4 fix 1, session 4), on the phone profile with real touch taps.

Slot 0 (the autosave) holds an Episode 1 credits save (Arden, Lv 10, 2840 G, in bed at home). Before W15 the title's
Episode 2 entry started a stock party whose first door rewrote slot 0 with no prompt. Now:
  1. the row reads "Episode 2: new party" and a note says the player's own game stays under Continue;
  2. Episode 2 (and New Game) ask first, naming the save: "Arden, Lv 10, Home"; Keep my save is highlighted;
  3. one tap on "Replace it" only moves the glove; Keep my save, cancel, and a tap off the box change nothing;
  4. with the guard declined, slot 0 is byte for byte the Episode 1 save;
  5. "Copy it, then start" puts the same bytes in Record 1, then the quick start plus one door rewrites slot 0
     (the player confirmed), and Record 1 still holds the finished Episode 1 run.
Fails on any console error. qa/world/walks.test.mjs runs it (the solo slot of node qa/run.mjs).

    python next/qa/integrate/w15_save_trap.py [--device phone|desktop]
"""
import argparse
import pathlib
import sys
import time

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / 'world'))
sys.path.insert(0, str(HERE.parent))
import fieldlab  # noqa: E402
import shots  # noqa: E402

READY = "LQ_DEBUG.engine.hasScene('field') && LQ_DEBUG.engine.hasScene('nameEntryEp2') && LQ_DEBUG.commands().includes('newGame')"
SEED = """(async () => {
  const S = await import('/next/src/game/state.js');
  try { localStorage.clear(); } catch (e) {}
  LQ_DEBUG.newGame('Arden', { scene: 'none', party: ['mira', 'bram'], level: 10, gold: 2840, playtime: 1442,
    flags: Object.fromEntries(S.EP1_DONE_FLAGS.map((f) => [f, true])) });
  const g = LQ_ENGINE.game;
  g.counters.credits_rolled = 1;
  S.setPosition(g, 'hero_home', 4, 3, 'down');
  LQ_ENGINE.save.save(0, S.serialize(g), S.saveMeta(g));
  LQ_ENGINE.game = null;
  LQ_DEBUG.reset('title');
  return true;
})()"""
SLOT = "localStorage.getItem('lq-next-slot-%d')"
AUTO_JS = ('window.__lqAuto && clearInterval(window.__lqAuto); window.__lqAuto = setInterval(() => { const s = LQ_DEBUG.scene(); '
           'if (s === "dialog" || s === "choice" || s === "titleCard") LQ_DEBUG.press("confirm", 1); }, 120)')


def check(cond, msg):
    if not cond:
        raise AssertionError(msg)
    print('  ok', msg, flush=True)


def title(lab):
    lab.page.wait_for_function("LQ_DEBUG.scene() === 'title' && !LQ_DEBUG.state().transition && !LQ_DEBUG.state().sceneState.busy", timeout=20000, polling=30)
    lab.frames(6)
    return lab.run('LQ_DEBUG.state().sceneState')


def tap(lab, gx, gy, touch):
    x, y = shots.game_to_css(lab.page, gx, gy)
    if touch:
        lab.page.touchscreen.tap(x, y)
    else:
        lab.page.mouse.click(x, y)
    lab.frames(8)


def tap_title_row(lab, item_id, touch):
    ss = title(lab)
    i = ss['items'].index(item_id)
    win = ss['win']
    tap(lab, win['x'] + win['w'] // 2, ss['listY'] + i * ss['rowH'] + ss['rowH'] // 2, touch)


def guard_box(lab):
    return lab.run("(() => { const t = LQ_ENGINE.scene; const b = t.guard && t.guard.box; return b ? { rect: b.rect, rowH: b.list.rowH, y: b.list.y } : null; })()")


def guard(lab):
    return lab.run('LQ_DEBUG.state().sceneState.guard')


def main(argv):
    ap = argparse.ArgumentParser()
    ap.add_argument('--device', default='phone')
    a = ap.parse_args(argv)
    touch = a.device != 'desktop'
    lab = fieldlab.Lab(device=a.device)
    try:
        lab.open('?debug=1&fps=0')
        lab.page.wait_for_function(READY, timeout=20000, polling=50)
        lab.run(SEED)
        ss = title(lab)
        raw0 = lab.run(SLOT % 0)
        check(raw0 and '"Arden"' in raw0, 'slot 0 holds the Episode 1 credits save')
        check('ep2' in ss['items'] and ss['labels'][ss['items'].index('ep2')] == 'Episode 2: new party', f'the row reads "Episode 2: new party" ({ss["labels"]})')

        # --- Episode 2 by touch: the row, the note, the guard
        tap_title_row(lab, 'ep2', touch)                               # first tap selects the row
        check(title(lab)['items'][title(lab)['index']] == 'ep2', 'one tap selects the Episode 2 row')
        tap_title_row(lab, 'ep2', touch)                               # second tap confirms it
        lab.frames(6)
        g = guard(lab)
        check(g is not None and g['id'] == 'ep2', 'Episode 2 asks before it starts')
        check(g['line'] == 'Arden, Lv 10, Home', f'the guard names what it would replace ({g["line"]})')
        check(g['options'] == ['keep', 'copy', 'replace'] and g['index'] == 0, f'Keep my save is the highlighted choice ({g})')
        box = guard_box(lab)
        tap(lab, box['rect']['x'] + 40, box['y'] + 2 * box['rowH'] + box['rowH'] // 2, touch)   # "Replace it", once
        g = guard(lab)
        check(g is not None and g['index'] == 2, 'one tap on Replace it only moves the glove')
        tap(lab, 192, max(2, box['rect']['y'] - 30), touch)            # a tap on the message, off the choices
        check(guard(lab) is not None, 'a tap off the choices changes nothing')
        check(lab.run(SLOT % 0) == raw0, 'slot 0 untouched while the guard is up')
        tap(lab, box['rect']['x'] + 40, box['y'] + box['rowH'] // 2, touch)                     # Keep my save: select
        tap(lab, box['rect']['x'] + 40, box['y'] + box['rowH'] // 2, touch)                     # and confirm
        check(guard(lab) is None and lab.run('LQ_DEBUG.scene()') == 'title', 'Keep my save goes back to the title')
        check(lab.run(SLOT % 0) == raw0, 'slot 0 untouched after Keep my save')

        # --- cancel, and New Game asks too
        for row in ('ep2', 'new'):
            ss = title(lab)
            lab.run(f"LQ_ENGINE.scene.menu.moveTo({ss['items'].index(row)})")
            lab.press('confirm', 1)
            lab.frames(12)
            g = guard(lab)
            check(g is not None and g['id'] == row, f'{row}: the guard opens')
            lab.press('cancel', 1)
            lab.frames(10)
            check(guard(lab) is None and lab.run('LQ_DEBUG.scene()') == 'title', f'{row}: cancel keeps the save')
        check(lab.run(SLOT % 0) == raw0, 'slot 0 untouched after both cancels')
        check(lab.run(SLOT % 1) is None, 'Record 1 is still empty')

        # --- the player confirms: Copy it, then start; the quick start plus one door
        ss = title(lab)
        lab.run(f"LQ_ENGINE.scene.menu.moveTo({ss['items'].index('ep2')})")
        lab.press('confirm', 1)
        lab.frames(12)
        lab.press('down', 1)
        lab.frames(6)
        check(guard(lab)['index'] == 1, 'Copy it, then start is chosen')
        lab.press('confirm', 1)
        lab.page.wait_for_function("LQ_DEBUG.scene() === 'nameEntryEp2' && !LQ_DEBUG.state().transition", timeout=20000, polling=30)
        check(lab.run(SLOT % 1) == raw0, 'Record 1 holds the Episode 1 save, byte for byte')
        check(lab.run('LQ_DEBUG.state().sceneState.value') == 'Arden', 'the Episode 2 entry keeps the player\'s own name')
        lab.frames(6)
        lab.press('start', 1)
        lab.page.wait_for_function("LQ_DEBUG.state().scenes.includes('field')", timeout=30000, polling=30)
        lab.run(AUTO_JS)
        lab.page.wait_for_function("(() => { const f = LQ_ENGINE.stack.find((s) => s.name === 'field'); return f && f.mapId === 'hero_home' && f.game.flags.ep2_morning_done && LQ_DEBUG.scene() === 'field' && !f.inputLocked && !LQ_DEBUG.state().transition; })()", timeout=90000, polling=100)
        lab.run('clearInterval(window.__lqAuto)')
        check(lab.run(SLOT % 0) == raw0, 'the morning scene at home has not written slot 0')
        t0 = time.time()
        lab.run("(LQ_DEBUG.call('goto', 12, 11), true)")
        lab.page.wait_for_function("(() => { const f = LQ_ENGINE.stack.find((s) => s.name === 'field'); return f && f.mapId === 'willowmere' && !f.loading; })()", timeout=60000, polling=50)
        lab.frames(20)
        raw_after = lab.run(SLOT % 0)
        check(raw_after != raw0 and '"willowmere"' in raw_after, f'after the player confirmed, the first door writes the new run ({time.time() - t0:.1f} s)')
        check(lab.run(SLOT % 1) == raw0, 'and Record 1 still holds the finished Episode 1 run')
        lab.run('clearInterval(window.__lqAuto)')
        if lab.errors:
            print('\n'.join(lab.errors))
            print('W15_SAVE_TRAP: FAIL (console errors)')
            return 1
        print('W15_SAVE_TRAP: PASS')
        return 0
    except Exception as e:  # noqa: BLE001
        print('W15_SAVE_TRAP: FAIL', repr(e))
        for line in lab.logs[-15:]:
            print('   ', line)
        return 1
    finally:
        lab.close()


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
