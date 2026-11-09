"""E5-pack (EPISODE5_PLAN 10.6, PLAYTEST_REVIEW_6 fix 1 carried over to Episode 5): an Episode 5 save loaded while the ep5 pack
cannot be fetched never lands in the developer test town and is never overwritten with "Test Town".

A save standing in ep5_lab_f2 at (20, 28) with Episodes 1 to 4 done and ep5_started is seeded into record 1 and loaded the way
Continue does, with the pack forced on (?pack=ep5, as a live switch would) and every request for src/data/ep5/** and
src/data/maps/ep5_* refused. It must:

  1. never put the party on _testtown (sampled all through the wait),
  2. land on a real map (Emberpeak's east road end, the Episode 4 landing) with its flags intact,
  3. leave record 1 on ep5_lab_f2 (20, 28) after that landing (the map change), and after the party walks on to another map
     never hold the test town,
  4. keep the field running with no console error beyond the refused requests.

    python next/qa/saves/ep5_blocked_pack.py

Needs nothing but a browser. Exit code 1 on any failure.
"""
import json
import pathlib
import re
import sys
import time

HERE = pathlib.Path(__file__).resolve().parent
NEXT = HERE.parent.parent
sys.path.insert(0, str(HERE.parent / 'world'))
sys.path.insert(0, str(HERE.parent))
import fieldlab  # noqa: E402

SLOT = 'lq-next-slot-1'
SLOT_JS = f"(() => {{ try {{ const e = JSON.parse(localStorage.getItem('{SLOT}')); return e && e.data ? {{ map: e.data.map, pos: e.data.pos }} : null; }} catch (e) {{ return String(e); }} }})()"
SRC = lambda rel: (NEXT / rel).read_text(encoding='utf-8')  # noqa: E731
EP3_DONE = re.findall(r"'([a-z0-9_]+)'", re.search(r"EP3_DONE_FLAGS = \[([^\]]+)\]", SRC('src/data/ep4/start.js')).group(1))
EP4_DONE = re.findall(r"'([a-z0-9_]+)'", re.search(r"EP4_DONE_FLAGS = \[([^\]]+)\]", SRC('src/data/ep5/start.js')).group(1))


class Fail(Exception):
    pass


def main():
    lab = fieldlab.Lab(device='desktop', timeout=60000)
    state = {'refused': 0}

    def handler(route):
        state['refused'] += 1
        route.abort('failed')

    ok, detail = False, ''
    try:
        lab.page.route(re.compile(r'/src/data/ep5/|/src/data/maps/ep5_'), handler)
        lab.open('?debug=1&fps=0&pack=ep5')
        lab.page.wait_for_function("LQ_DEBUG.engine.hasScene('field')", timeout=30000, polling=50)
        lab.run("LQ_DEBUG.reset('title'); true")
        lab.page.wait_for_function("LQ_DEBUG.scene() === 'title' && !LQ_DEBUG.state().transition", timeout=30000, polling=30)
        lab.run("localStorage.clear()")
        lab.run("""(async (a) => {
          const S = await import('/next/src/game/state.js');
          const g = S.createGame('Pia', { map: 'ep5_lab_f2', pos: { x: 20, y: 28, dir: 'up' }, autosaveSlot: 1 });
          S.addMember(g, 'mira'); S.addMember(g, 'bram');
          for (const f of [...S.EP1_DONE_FLAGS, ...S.EP2_DONE_FLAGS, ...a.flags, 'ep5_started', 'ep5_morning_done']) g.flags[f] = true;
          for (const c of ['credits_rolled', 'credits2_rolled', 'credits3_rolled', 'credits4_rolled']) g.counters[c] = 1;
          g.lastSafe = { map: g.map, pos: { ...g.pos } };
          LQ_ENGINE.save.save(1, S.serialize(g), S.saveMeta(g));
          return true; })(%s)""" % json.dumps({'flags': EP3_DONE + EP4_DONE}))
        before = lab.run(SLOT_JS)
        if not before or before.get('map') != 'ep5_lab_f2':
            raise Fail(f'the seeded record is not on ep5_lab_f2: {before}')
        lab.run("""(async () => {
          const S = await import('/next/src/game/state.js');
          const g = S.deserialize(LQ_ENGINE.save.load(1));
          LQ_ENGINE.game = g;
          LQ_ENGINE.reset('field', { map: g.map, x: g.pos.x, y: g.pos.y, dir: g.pos.dir });
          return true; })()""")
        seen, landed, t0 = set(), None, time.time()
        while time.time() - t0 < 60:
            m = lab.run('LQ_ENGINE.game ? LQ_ENGINE.game.map : null')
            if m:
                seen.add(m)
            if m == '_testtown':
                raise Fail('the party stands in the developer test town')
            f = lab.run('(() => { const f = LQ_ENGINE.stack.find(s => s.name === "field"); return f && f.map ? { id: f.map.id, loading: !!f.loading, back: f.packReturn } : null; })()')
            if m in ('emberpeak', 'valley') and f and f['id'] == m and not f['loading']:
                landed = {'map': m, 'packReturn': f['back'], 'pos': lab.run('LQ_ENGINE.game.pos')}
                break
            lab.frames(15)
        if not landed:
            raise Fail(f'no landing within 60 s (maps seen: {sorted(seen)})')
        print(f'  landed on {landed["map"]} at {landed["pos"]} after {time.time() - t0:.1f} s; maps seen {sorted(seen)}; packReturn {landed["packReturn"]}', flush=True)
        flags = lab.run('LQ_ENGINE.game.flags')
        if not flags.get('ep5_started') or not flags.get('ep4_complete'):
            raise Fail('flags lost')
        lab.frames(120)
        after = lab.run(SLOT_JS)
        if not after or after.get('map') != 'ep5_lab_f2' or (after['pos']['x'], after['pos']['y']) != (20, 28):
            raise Fail(f'record 1 changed after the landing: {after}')
        print(f'  record 1 after the landing (a map change): {after}', flush=True)
        OUT = NEXT / 'qa' / 'out' / 'ep5_pack'
        OUT.mkdir(parents=True, exist_ok=True)
        lab.page.screenshot(path=str(OUT / 'ep5_blocked_pack_landing.png'))
        # walk on: warp to the inn (a door, as a player would), the first autosave the old code wrote over the run
        lab.run("LQ_DEBUG.warp('pk_inn', 17, 7, 'down')")
        lab.frames(120)
        walked = lab.run(SLOT_JS)
        print(f'  record 1 after the party walked on: {walked}', flush=True)
        if walked and walked.get('map') == '_testtown':
            raise Fail('record 1 now holds the test town')
        errs = [e for e in lab.errors if 'ERR_FAILED' not in e and 'Failed to load resource' not in e and 'packs' not in e
                and 'ep5' not in e and 'dynamically imported' not in e]
        if errs:
            raise Fail('console errors: ' + ' | '.join(errs[:5]))
        ok = True
    except Exception as e:  # noqa: BLE001
        detail = f'{type(e).__name__}: {e}'
    finally:
        lab.close()
    print('EP5_BLOCKED_PACK:', 'PASS' if ok else f'FAIL {detail}', f'(requests refused: {state["refused"]})')
    return 0 if ok else 1


if __name__ == '__main__':
    sys.exit(main())
