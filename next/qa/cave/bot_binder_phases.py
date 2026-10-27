"""The Binder's three looks in a real headless battle (C3-sim-bot): phase 1 'binder', phase 2 'binder_loose', phase 3 'binder_binding'.

    python next/qa/cave/bot_binder_phases.py [--device desktop|phone]

The page runs ?cave=1&debug=1 (the pack forced on). LQ_DEBUG.battle('cave_binder', { level: 60 }) starts the fight with Auto on.
src/data/cave/foes.js gives the Binder sprite.frame 'binder' and a `sprite` on phases 2 and 3; the battle scene swaps frames on a
phase event that carries `sprite` (animator ev_phase -> swapSprite -> actors.resolveArt, which finds the frames in bosses_battle,
where the pack loader merged cave_bosses_battle). The Archivore script that the Binder runs (ai.js enterPhase) does not forward
`sprite` yet, so the rig first records the phase event as the game emits it (the gap, reported), then installs a page-only shim
on this battle's planner that fills `sprite` from ENEMIES.binder.phases the way the one-line ai.js fix would, and drives the
fight across 70% and 30% (the Binder's HP set just above each threshold, the party's next hit crosses it). One shot per look in
next/qa/cave/out/bot_binder_<device>_phase<N>.png (the page at 5x). Prints BINDER_PHASES: <json>. Bounded (watchdog 300 s).
"""
import json
import pathlib
import sys
import time

HERE = pathlib.Path(__file__).resolve().parent
QA = HERE.parent
sys.path.insert(0, str(QA))
import autoplay  # noqa: E402
import shots  # noqa: E402

OUT = HERE / 'out'
SCENE = 'LQ_ENGINE.scene'
BINDER = "(() => { const s = LQ_ENGINE.scene; if (!s || s.name !== 'battle' || !s.b) return null; const u = s.b.units().find(x => x.id === 'binder'); const a = u && s.actors.get(u.uid); return u ? { uid: u.uid, hp: u.hp, maxHp: u.maxHp, phase: u.ai.phase, art: a ? (a.artId || null) : null, stem: a ? a.stem || null : null, atlas: a ? a.atlasId : null, phaseEvents: window.__binderPhases || [] } : null; })()"


def main(argv):
    device = 'phone' if '--device' in argv and argv[argv.index('--device') + 1] == 'phone' else 'desktop'
    shots.watchdog(300)
    bot = autoplay.Bot(device, speed=2, tag='-binder', query='&cave=1')
    out = {'device': device, 'shots': [], 'looks': [], 'errors': []}
    status = 'FAIL'
    try:
        bot.open()
        bot.page.wait_for_function('window.LQ_PACKS && LQ_PACKS.packReady("cave")', timeout=60000, polling=100)
        bot.js('LQ_DEBUG.battle("cave_binder", { level: 60, fresh: true })')
        bot.page.wait_for_function(f"(() => {{ const s = {SCENE}; return !!s && s.name === 'battle' && !!s.b && s.phase !== 'intro'; }})()", timeout=30000, polling=50)
        # record every phase event as the rules emit it (before any shim), then the shim: sprite from the phase data
        bot.js("""(async () => {
          const { ENEMIES } = await import('./src/data/enemies.js');
          const s = LQ_ENGINE.scene; window.__binderPhases = [];
          const orig = s.plan.bind(s);
          s.plan = (evs) => orig((evs || []).map((e) => {
            if (!e || e.type !== 'phase') return e;
            window.__binderPhases.push({ phase: e.phase, id: e.id, sprite: e.sprite === undefined ? 'absent' : e.sprite });
            const u = s.b.unit(e.actor); const p = u && ENEMIES[u.id] && ENEMIES[u.id].phases ? ENEMIES[u.id].phases[e.phase - 1] : null;
            return e.sprite || !p || !p.sprite ? e : { ...e, sprite: p.sprite };
          }));
        })()""")
        bot.frames(30)

        def shot(n):
            info = bot.js(BINDER)
            p = OUT / f'bot_binder_{device}_phase{n}.png'
            bot.page.screenshot(path=str(p))          # the game's 384 x 216 at 5x (desktop) or 6.6x (phone): no crop needed
            out['shots'].append(str(p))
            out['looks'].append({'phase': n, **{k: info[k] for k in ('art', 'stem', 'atlas', 'phase', 'hp', 'maxHp')}})
            print(f'  phase {n}: {out["looks"][-1]}', flush=True)

        shot(1)
        for n, frac, want in ((2, 0.705, 'binder_loose'), (3, 0.305, 'binder_binding')):
            bot.js(f"(() => {{ const s = LQ_ENGINE.scene; const u = s.b.units().find(x => x.id === 'binder'); u.hp = Math.ceil(u.maxHp * {frac}); }})()")
            t0 = time.time()
            while time.time() - t0 < 120:
                info = bot.js(BINDER)
                if not info:
                    raise autoplay.Fail('the battle ended before the phase')
                if info['art'] == want:
                    break
                # keep the party alive so the fight reaches the threshold (a proof rig, not a balance run)
                bot.js("(() => { const s = LQ_ENGINE.scene; for (const u of s.b.units()) if (u.side === 'party') { u.hp = u.maxHp; u.alive = true; } })()")
                bot.frames(20)
            else:
                raise autoplay.Fail(f'no {want} look after 120 s ({bot.js(BINDER)})')
            bot.frames(40)
            shot(n)
        out['phaseEvents'] = bot.js('window.__binderPhases || []')
        bot.check_errors()
        status = 'ok' if [l['art'] or 'binder' for l in out['looks']] == ['binder', 'binder_loose', 'binder_binding'] else 'FAIL'
    except Exception as e:  # noqa: BLE001
        out['detail'] = f'{type(e).__name__}: {e}'
        try:
            bot.shot('binder_fail')
        except Exception:
            pass
    finally:
        out['errors'] = bot.errors
        out['status'] = status
        (OUT / f'bot_binder_{device}.json').write_text(json.dumps(out, indent=1), encoding='utf-8')
        bot.close()
    print('BINDER_PHASES: ' + json.dumps({k: out.get(k) for k in ('device', 'status', 'looks', 'phaseEvents', 'detail')}), flush=True)
    return 0 if status == 'ok' else 1


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
