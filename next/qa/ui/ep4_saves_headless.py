"""E4-pack headless check (not part of node qa/run.mjs: one browser job, run by hand).

With EP4_LIVE false (as the pack ships tonight):
  1. Boot and the title fetch nothing of the ep4 pack (no request under src/data/ep4/ or for ep4_ files; no LQ_EP4).
  2. An Episode 3 credits save that owns slot 2 (slots 0 and 1 hold another run), loaded as Continue does, rolls the
     Episode 3 credits with the UNCHANGED end card ("Episode 4 is not playable yet."), wakes at pk_inn, and autosaves to
     slot 2 only: slots 0 and 1 byte for byte intact, slot 3 empty.
  3. Zero console errors.

    python next/qa/ui/ep4_saves_headless.py
"""
import json
import pathlib
import re
import sys

HERE = pathlib.Path(__file__).resolve().parent
NEXT = HERE.parent.parent
sys.path.insert(0, str(HERE.parent / 'world'))
sys.path.insert(0, str(HERE.parent))
import fieldlab  # noqa: E402

SLOT = "localStorage.getItem('lq-next-slot-%d')"
EP3_DONE = re.findall(r"'([a-z0-9_]+)'", re.search(r"EP3_DONE_FLAGS = \[([^\]]+)\]", (NEXT / 'src/data/ep4/start.js').read_text(encoding='utf-8')).group(1))


def check(cond, msg):
    if not cond:
        raise AssertionError(msg)
    print('  ok', msg, flush=True)


def main():
    lab = fieldlab.Lab(device='desktop')
    requests = []
    lab.page.on('request', lambda r: requests.append(r.url))
    try:
        lab.open('?debug=1&fps=0')
        lab.page.wait_for_function("LQ_DEBUG.engine.hasScene('field')", timeout=20000, polling=50)
        lab.run("LQ_DEBUG.reset('title'); true")
        lab.page.wait_for_function("LQ_DEBUG.scene() === 'title' && !LQ_DEBUG.state().transition", timeout=20000, polling=30)
        lab.frames(90)

        # --- 1. nothing of the pack is fetched while the switch is off
        ep4 = [u for u in requests if '/src/data/ep4/' in u or re.search(r'/ep4_[^/]*$', u)]
        check(not ep4, f'no ep4 pack request at boot and on the title ({ep4[:3]})')
        check(lab.run('typeof globalThis.LQ_EP4') == 'undefined', 'LQ_EP4 is not installed')
        check(lab.run("(async () => (await import('/next/src/game/packs.js')).packEnabled('ep4'))()") is False, "packEnabled('ep4') is false")

        # --- 2. an Episode 3 credits save in slot 2
        lab.run("localStorage.clear()")
        lab.run("""(async () => {
          const S = await import('/next/src/game/state.js');
          const g = S.createGame('Elder'); for (const f of S.EP1_DONE_FLAGS) g.flags[f] = true;
          LQ_ENGINE.save.save(0, S.serialize(g), S.saveMeta(g));
          LQ_ENGINE.save.save(1, S.serialize(g), S.saveMeta(g));
          return true; })()""")
        before = [lab.run(SLOT % n) for n in range(4)]
        data = lab.run("""(async (flags) => {
          const S = await import('/next/src/game/state.js');
          const g = S.newGameEp3('Sol', { slot: 2 });
          for (const f of flags) g.flags[f] = true;      // ep3_complete set, credits3_rolled not yet
          S.setPosition(g, 'emberpeak', 37, 15, 'left');
          return S.serialize(g);
        })(%s)""" % json.dumps(EP3_DONE))
        check(data['flags'].get('ep3_complete') and not data['counters'].get('credits3_rolled'), 'the fixture is an Episode 3 credits save')
        lab.run("""(() => {
          window.__seen = [];
          const e = LQ_ENGINE, orig = e.pushAwait.bind(e);
          e.pushAwait = (n, d) => { if (n === 'credits' || n === 'titleCard') { window.__seen.push([n, d || null]); return Promise.resolve(); } return orig(n, d); };
          return true; })()""")
        slot = lab.run("""(async (a) => {
          const S = await import('/next/src/game/state.js');
          const g = S.deserialize(a.data);
          LQ_ENGINE.game = g;
          LQ_ENGINE.reset('field', { map: g.map, x: g.pos.x, y: g.pos.y, dir: 'left' });
          return g.autosaveSlot; })(%s)""" % json.dumps({'data': data}))
        check(slot == 2, 'the save loads with its own autosaveSlot 2')
        lab.page.wait_for_function(
            '() => { const f = LQ_ENGINE.stack.find(sc => sc.name === "field"); return !!f && f.map && f.map.id === "pk_inn" && !f.loading && !LQ_DEBUG.state().transition; }',
            timeout=60000, polling=50)
        lab.frames(30)
        seen = lab.run('window.__seen')
        print('  seen', json.dumps(seen)[:300])
        names = [s[0] for s in seen]
        check(names[:2] == ['credits', 'titleCard'], 'the Episode 3 credits rolled, then the end card')
        card = seen[1][1]
        check(card['text'] == 'To be continued' and card['sub'] == 'Episode 4 is not playable yet.', f'the Episode 3 end card is unchanged ({card["sub"]})')
        lab.frames(30)
        after = [lab.run(SLOT % n) for n in range(4)]
        check(after[0] == before[0] and after[1] == before[1], 'slots 0 and 1 are byte for byte intact')
        check(after[3] is None, 'slot 3 stays empty')
        s2 = json.loads(after[2]) if after[2] else None
        check(s2 and s2['data']['map'] == 'pk_inn' and s2['data']['autosaveSlot'] == 2 and s2['data']['counters'].get('credits3_rolled') == 1,
              'slot 2 holds the run, awake at pk_inn, credits3_rolled set')
        ep4 = [u for u in requests if '/src/data/ep4/' in u]
        check(not ep4, f'still no ep4 pack request after the credits ({ep4[:3]})')
        print('  shot', lab.shot('ep4_saves_pk_inn_after_ep3_credits'))
        if lab.errors:
            print('\n'.join(lab.errors))
            print('EP4_SAVES_HEADLESS: FAIL (console errors)')
            return 1
        print('EP4_SAVES_HEADLESS: PASS')
        return 0
    except Exception as e:  # noqa: BLE001
        print('EP4_SAVES_HEADLESS: FAIL', e)
        if lab.errors:
            print('\n'.join(lab.errors[:10]))
        return 1
    finally:
        lab.close()


if __name__ == '__main__':
    sys.exit(main())
