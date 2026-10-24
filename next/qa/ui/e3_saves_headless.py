"""E3-saves headless check (not part of node qa/run.mjs: one browser job, run by hand).

  1. An Episode 1 credits save and an Episode 2 credits save, loaded as the Continue screen does (deserialize), still
     autosave to slot 0 at their next map entry.
  2. With slot 0 occupied by another run, LQ_DEBUG.newGameEp3 picks the first empty record and a map change writes only
     that record (localStorage read back, every other slot byte for byte).
  3. With every slot full it starts nothing and writes nothing.
  4. The title's slot picker panel (notice + Start/Back, and the refusal with only Back) is drawn; PNGs go to qa/out/.

    python next/qa/ui/e3_saves_headless.py
"""
import pathlib
import sys

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / 'world'))
sys.path.insert(0, str(HERE.parent))
import fieldlab  # noqa: E402

READY = "LQ_DEBUG.engine.hasScene('field') && LQ_DEBUG.commands().includes('newGameEp3')"
SLOT = "localStorage.getItem('lq-next-slot-%d')"
LOAD = """(async (a) => {
  const S = await import('/next/src/game/state.js');
  const g = S.deserialize(a.data);
  LQ_ENGINE.game = g;
  LQ_ENGINE.reset('field', { map: g.map, x: g.pos.x, y: g.pos.y, dir: 'down' });
  return g.autosaveSlot;
})(%s)"""


def check(cond, msg):
    if not cond:
        raise AssertionError(msg)
    print('  ok', msg, flush=True)


def seed_game(lab, name, flags_js, level, map_id, x, y):
    """Builds a credits-state game in the page and returns its serialized data."""
    return lab.run("""(async () => {
      const S = await import('/next/src/game/state.js');
      const g = S.createGame(%r);
      for (const f of %s) g.flags[f] = true;
      g.party[0].level = %d;
      S.setPosition(g, %r, %d, %d, 'down');
      return S.serialize(g);
    })()""" % (name, flags_js, level, map_id, x, y))


def wait_map(lab, m):
    lab.page.wait_for_function(
        '(m) => { const f = LQ_ENGINE.stack.find(sc => sc.name === "field"); return !!f && f.map && f.map.id === m && !f.loading && !LQ_DEBUG.state().transition; }',
        arg=m, timeout=30000, polling=30)
    lab.frames(10)


def main():
    lab = fieldlab.Lab(device='desktop')
    try:
        lab.open('?debug=1&fps=0')
        lab.page.wait_for_function(READY, timeout=20000, polling=50)

        # --- 1. old runs keep autosaving to slot 0
        for label, flags, map_id, x, y, warp_to in (
                ('Episode 1 credits', "(await import('/next/src/game/state.js')).EP1_DONE_FLAGS", 'hero_home', 4, 3, ('willowmere', 12, 11)),
                ('Episode 2 credits', "[...(await import('/next/src/game/state.js')).EP1_DONE_FLAGS, ...(await import('/next/src/game/state.js')).EP2_DONE_FLAGS]", 'nh_inn', 17, 7, ('nameless_hollow', 20, 10))):
            lab.run("localStorage.clear()")
            data = lab.run("""(async () => {
              const S = await import('/next/src/game/state.js');
              const g = S.createGame('Arden');
              for (const f of %s) g.flags[f] = true;
              g.party[0].level = 10;
              g.counters.credits_rolled = 1; if (%r === 'nh_inn') g.counters.credits2_rolled = 1;
              S.setPosition(g, %r, %d, %d, 'down');
              delete g.autosaveSlot;   // a save made before this change
              return S.serialize(g);
            })()""" % (flags, map_id, map_id, x, y))
            slot = lab.run(LOAD % ("{ data: %s }" % __import__('json').dumps(data)))
            check(slot == 0, f'{label}: a save without autosaveSlot loads as slot 0')
            wait_map(lab, map_id)
            lab.warp(*warp_to)
            lab.frames(20)
            raw0 = lab.run(SLOT % 0)
            print('  slot 0 map:', lab.run("(JSON.parse(localStorage.getItem('lq-next-slot-0') || '{}').meta || {}).map"), '| scene:', lab.run('LQ_DEBUG.scene()'))
            check(raw0 and f'"{warp_to[0]}"' in raw0, f'{label}: the next map entry wrote slot 0 ({warp_to[0]})')
            check(all(lab.run(SLOT % n) is None for n in (1, 2, 3)), f'{label}: slots 1 to 3 stay empty')

        # --- 2. quick start with slot 0 occupied writes only its own slot
        lab.run("localStorage.clear()")
        lab.run("""(async () => {
          const S = await import('/next/src/game/state.js');
          const g = S.createGame('Elder'); for (const f of S.EP1_DONE_FLAGS) g.flags[f] = true;
          LQ_ENGINE.save.save(0, S.serialize(g), S.saveMeta(g));
          LQ_ENGINE.save.save(1, S.serialize(g), S.saveMeta(g));
          return true; })()""")
        before = [lab.run(SLOT % n) for n in range(4)]
        res = lab.run("LQ_DEBUG.newGameEp3('Quill', { scene: 'field' })")
        check(res and res['slot'] == 2, f'the quick start picked the first empty record ({res})')
        wait_map(lab, 'nh_inn')
        lab.warp('nameless_hollow', 20, 10)
        lab.frames(20)
        lab.warp('nh_inn', 17, 7)
        lab.frames(20)
        after = [lab.run(SLOT % n) for n in range(4)]
        check(after[0] == before[0] and after[1] == before[1], 'slots 0 and 1 are byte for byte intact')
        check(after[3] is None, 'slot 3 stays empty')
        check(after[2] and '"Quill"' in after[2] and '"autosaveSlot":2' in after[2], 'slot 2 holds the new run with autosaveSlot 2')
        lab.shot('e3_saves_field_nh_inn')

        # --- 3. every slot full: nothing starts, nothing is written
        lab.run("(() => { for (let n = 0; n <= 3; n++) localStorage.setItem('lq-next-slot-' + n, JSON.stringify({ v: 1, savedAt: '2026-10-24T10:00:00Z', meta: { name: 'Full' + n, level: 5, map: 'hero_home' }, data: { heroName: 'Full' + n, flags: {} } })); return true; })()")
        before = [lab.run(SLOT % n) for n in range(4)]
        res = lab.run("LQ_DEBUG.newGameEp3('Quill', { scene: 'none' })")
        check(res is None, 'every slot full: newGameEp3 starts nothing')
        check([lab.run(SLOT % n) for n in range(4)] == before, 'and writes nothing')

        # --- 4. the picker panel, drawn on the title
        for label, shape in (('picker_slot2', 'one'), ('picker_full', 'full')):
            lab.run("localStorage.clear()")
            if shape == 'one':
                lab.run("(() => { for (const n of [0, 1]) localStorage.setItem('lq-next-slot-' + n, JSON.stringify({ v: 1, savedAt: '2026-10-24T10:00:00Z', meta: { name: 'Arden', level: 10, map: 'hero_home' }, data: { heroName: 'Arden', flags: {} } })); return true; })()")
            else:
                lab.run("(() => { for (let n = 0; n <= 3; n++) localStorage.setItem('lq-next-slot-' + n, JSON.stringify({ v: 1, savedAt: '2026-10-24T10:00:00Z', meta: { name: 'Arden', level: 10, map: 'hero_home' }, data: { heroName: 'Arden', flags: {} } })); return true; })()")
            lab.run("LQ_ENGINE.game = null; LQ_DEBUG.reset('title'); true")
            lab.page.wait_for_function("LQ_DEBUG.scene() === 'title' && !LQ_DEBUG.state().transition && !LQ_DEBUG.state().sceneState.busy", timeout=20000, polling=30)
            lab.frames(6)
            lab.run("LQ_ENGINE.scene.openSlotPicker(); true")
            lab.frames(8)
            g = lab.run('LQ_DEBUG.state().sceneState.guard')
            print('  guard', g)
            check(g is not None and g['options'][0] == 'back' and g['index'] == 0, f'{label}: Back is the highlighted choice')
            check(('start' in g['options']) == (shape == 'one'), f'{label}: Start only when a slot is free; never Replace')
            check('replace' not in g['options'], f'{label}: no Replace option')
            print('  shot', lab.shot(f'e3_saves_{label}'))
        if lab.errors:
            print('\n'.join(lab.errors))
            print('E3_SAVES_HEADLESS: FAIL (console errors)')
            return 1
        print('E3_SAVES_HEADLESS: PASS')
        return 0
    except Exception as e:  # noqa: BLE001
        print('E3_SAVES_HEADLESS: FAIL', repr(e))
        for line in lab.logs[-15:]:
            print('   ', line)
        return 1
    finally:
        lab.close()


if __name__ == '__main__':
    sys.exit(main())
