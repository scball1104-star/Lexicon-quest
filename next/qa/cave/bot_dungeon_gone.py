"""The second reading of a session and the field's dungeonGone memory (C3-sim-bot; docs/DEEP_STACKS_BALANCE.md 7.1).

    python next/qa/cave/bot_dungeon_gone.py

?cave=1&debug=1. A reading on seed 77: B1's foes are marked defeated the way field.js touchEnemy does on a win
(dungeonGone.get(mapId).add(entityId)), the reading is banked, a second reading begins on seed 99 in the same field: its B1
shows how many foes stand against how many the floor placed (the bug: none). Then the same again with the proposed fix applied
in the page (world.js beginReading would drop the cave_bN keys of dungeonGone before the warp): every placed foe stands.
Prints DUNGEON_GONE: <json> and writes next/qa/cave/out/bot_dungeon_gone.json. Bounded (watchdog 240 s).
"""
import json
import pathlib
import sys

HERE = pathlib.Path(__file__).resolve().parent
QA = HERE.parent
sys.path.insert(0, str(QA))
import autoplay  # noqa: E402
import shots  # noqa: E402

OUT = HERE / 'out'
FIELD = "LQ_ENGINE.stack.find(s => s.name === 'field')"
COUNT = f"(() => {{ const f = {FIELD}; return {{ map: f.map.id, placed: (f.map.mod.events || []).filter(e => e.type === 'enemy').length, present: f.actors.filter(a => a.kind === 'enemy').length }}; }})()"
DEFEAT = f"(() => {{ const f = {FIELD}; const ids = [...f.entities.values()].filter(x => x.type === 'enemy').map(x => x.id); if (!f.dungeonGone.has(f.mapId)) f.dungeonGone.set(f.mapId, new Set()); for (const id of ids) f.dungeonGone.get(f.mapId).add(id); return ids.length; }})()"
FIX = f"(() => {{ const f = {FIELD}; let n = 0; for (const k of [...f.dungeonGone.keys()]) if (/^cave_b\\d+$/.test(k)) {{ f.dungeonGone.delete(k); n++; }} return n; }})()"


def main():
    shots.watchdog(240)
    bot = autoplay.Bot('desktop', speed=3, tag='-dungeon-gone', query='&cave=1')
    out = {}
    status = 'FAIL'
    try:
        bot.open()
        bot.page.wait_for_function('window.LQ_PACKS && LQ_PACKS.packReady("cave")', timeout=60000, polling=100)
        bot.page.wait_for_function('LQ_DEBUG.commands().includes("caveBegin")', timeout=20000, polling=100)
        bot.js('LQ_DEBUG.newGameEp2("Arden", { scene: "none" })')
        bot.js('LQ_ENGINE.reset("field", { map: "cave_landing0", x: 10, y: 10, dir: "up" })')
        bot.settle()

        def reading(seed, fix=False):
            fixed = bot.js(FIX) if fix else 0
            bot.call('caveBegin', {'seed': seed}, ms=60000)
            bot.page.wait_for_function(f"(() => {{ const f = {FIELD}; return !!f && !!f.map && f.map.id === 'cave_b1' && !f.loading; }})()", timeout=60000, polling=50)
            bot.frames(20)
            c = bot.js(COUNT)
            c['seed'] = seed
            c['fixDropped'] = fixed
            return c

        def bank():
            bot.js(DEFEAT)
            bot.js('LQ_DEBUG.give("keepers_bookmark", 1)')
            bot.call('caveEnd', 'bank', ms=60000)
            bot.page.wait_for_function(f"(() => {{ const f = {FIELD}; return !!f && !!f.map && f.map.id === 'cave_landing0' && !f.loading; }})()", timeout=60000, polling=50)
            bot.settle()

        out['first'] = reading(77)
        bank()
        out['second'] = reading(99)                 # the bug: the field still marks foe_1.. of cave_b1 as gone
        bank()
        out['third_with_fix'] = reading(123, fix=True)
        bot.check_errors()
        bug = out['second']['present'] < out['second']['placed']
        fixed = out['third_with_fix']['present'] == out['third_with_fix']['placed']
        out['bug_reproduced'] = bug
        out['fix_works'] = fixed
        status = 'ok'
    except Exception as e:  # noqa: BLE001
        out['detail'] = f'{type(e).__name__}: {e}'
    finally:
        out['status'] = status
        out['errors'] = bot.errors
        (OUT / 'bot_dungeon_gone.json').write_text(json.dumps(out, indent=1), encoding='utf-8')
        bot.close()
    print('DUNGEON_GONE: ' + json.dumps(out), flush=True)
    return 0 if status == 'ok' else 1


if __name__ == '__main__':
    sys.exit(main())
