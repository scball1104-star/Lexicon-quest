"""World map travel by real input (issue #103, docs/WORLD_MAP_PLAN.md wave 3): Valewyn to Willowmere and back, and the offline
refusal.

The start point is set up (a save just after Episode 4, standing beside Valewyn's map stone). Then every action is a real key
(desktop) or a finger on the on-screen controls (phone, portrait): face the stone, confirm opens the map, the d-pad walks the
towns list, confirm travels. The checks: the route animation runs (a shot mid-way), the party lands on the cell beside the
destination's stone facing into the town with its followers, the town's music plays, no flag changed, the autosave holds the
new place in the run's own slot and no other slot was written. Offline: a save in Willowmere whose Episode 4 pack could not
load, the browser offline, the menu's Map row, Valewyn chosen: the trip is refused with one line and the party stays.

    python next/qa/realplay/worldmap.py                 desktop keys, then phone and portrait touch (under 3 minutes)
    python next/qa/realplay/worldmap.py --device phone

run.py takes this module (SEQUENCES).
"""
import argparse
import pathlib
import sys
import traceback

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from driver import Play, Stuck  # noqa: E402
from menus import free, menu_cmd, open_menu, settle  # noqa: E402

VALEWYN_STONE, BESIDE = (24, 30), (25, 30)          # data.js STONES.ep4_valewyn; the party starts east of it, facing it
ARRIVE = {'willowmere': ('willowmere', 14, 27, 'up'), 'valewyn': ('ep4_valewyn', 24, 29, 'right')}   # data.js STONES `at`
PLACE = """async ([map, x, y, dir, other]) => {
  const t0 = Date.now();
  while (!(LQ_DEBUG.commands && LQ_DEBUG.commands().includes('newGame'))) {
    if (Date.now() - t0 > 60000) throw new Error('newGame never registered');
    await new Promise((ok) => setTimeout(ok, 50));
  }
  const flags = Object.fromEntries((await (${FLAGS_JS})()).map((f) => [f, true]));
  // another run's save in slot 2: travel's autosave must never touch it
  if (other) localStorage.setItem('lq-next-slot-2', other);
  LQ_DEBUG.newGame('Arden', { scene: 'none', party: ['mira', 'bram'], level: 20, map, pos: { x, y, dir }, flags });
  const g = LQ_ENGINE.game;
  for (const c of ['credits_rolled', 'credits2_rolled', 'credits3_rolled', 'credits4_rolled']) g.counters[c] = 1;   // every ending seen
  const { BARKS } = await import('./src/data/text.js'); for (const k of Object.keys(BARKS)) g.counters['bark:' + k] = 1;
  LQ_DEBUG.settings({ textSpeed: 4, equipPrompts: false, rotateHintSeen: true, reduceMotion: false });
  LQ_ENGINE.reset('field', { map, x, y, dir });
  return true;
}"""
# Every done flag of Episodes 1 to 4 (read once per page and kept: the offline sequence blocks the ep4 and ep5 files after it)
FLAGS_JS = """async () => {
  if (!window.__wmFlags) {
    const S = await import('./src/game/state.js');
    const E3 = (await import('./src/data/ep4/start.js')).EP3_DONE_FLAGS, E4 = (await import('./src/data/ep5/start.js')).EP4_DONE_FLAGS;
    window.__wmFlags = [...S.EP1_DONE_FLAGS, ...S.EP2_DONE_FLAGS, ...E3, ...E4];
  }
  return window.__wmFlags;
}"""
PLACE = PLACE.replace('${FLAGS_JS}', FLAGS_JS)
FIELD_AT = "(() => { const f = LQ_ENGINE.scene; if (!f || f.name !== 'field' || !f.leader) return null; const L = f.leader;" \
           " return [f.mapId, L.tx, L.ty, L.dir, f.followers.length, !!f.loading, !!LQ_ENGINE.transition, LQ_ENGINE.audio.currentMusic()]; })()"
MAPSS = "(() => { const s = LQ_ENGINE.scene; return s && s.name === 'worldmap' ? s.debugState() : null; })()"
FLAGS = "JSON.stringify(Object.keys(LQ_ENGINE.game.flags).filter((k) => LQ_ENGINE.game.flags[k]).sort())"
SLOT = "(n) => { const v = localStorage.getItem('lq-next-slot-' + n); if (!v) return null; const j = JSON.parse(v); const d = j.data || j; return [d.map, d.pos && d.pos.x, d.pos && d.pos.y]; }"


def stand(p, map_id, x, y, d):
    p.until(f"(() => {{ const f = LQ_ENGINE.scene; return LQ_DEBUG.scene() === 'field' && !LQ_ENGINE.transition && f.mapId === '{map_id}' && !f.loading"
            " && [...f.entities.keys()].some((k) => k.startsWith('wm_stone')); })()", f'{map_id} with its stones', 40)
    p.frames(20)
    settle(p)


def open_from_stone(p, face):
    """Face the stone (a press toward a solid cell turns the leader) and confirm: the map opens."""
    p.act(face)
    p.frames(12)
    p.act('confirm')
    p.until("LQ_DEBUG.scene() === 'worldmap' && LQ_ENGINE.scene.debugState().composed", 'the map opens from the stone', 10)
    p.frames(10)


def pick(p, town):
    """Walk the towns list with the d-pad to `town`, then confirm."""
    for _ in range(12):
        st = p.js(MAPSS)
        if st['sel'] == town:
            break
        want = st['towns'].index(town)
        p.act('down' if want > st['index'] else 'up')
        p.frames(6)
    st = p.js(MAPSS)
    p.check(st['sel'] == town, f'{town} chosen in the list', st['sel'])
    p.check(st['ok'].get(town) == 'ok', f'{town} open for travel', st['ok'])
    p.act('confirm')


def ride(p, town, label):
    """The trip: a shot mid-way, then the field at the destination."""
    p.until("(() => { const s = LQ_ENGINE.scene; return s && s.name === 'worldmap' && s.trip && s.trip.T > 0 && s.trip.t >= s.trip.T / 2; })()",
            f'the route to {town} is half drawn', 10)
    st = p.js(MAPSS)
    p.check(120 <= st['trip']['T'] <= 180, 'the route takes 2 to 3 s', st['trip'])
    p.check(st['trip']['mode'] == 'road', 'by road (no ship lane, no Kestrel before Episode 6)', st['trip'])
    p.shot(f'{label}-route-midway')
    want = ARRIVE[town]
    p.until(f"(() => {{ const f = LQ_ENGINE.scene; return f && f.name === 'field' && f.mapId === '{want[0]}' && !f.loading && !LQ_ENGINE.transition; }})()",
            f'the party arrives in {town}', 20)
    p.frames(30)
    at = p.js(FIELD_AT)
    p.check(at and tuple(at[:4]) == want, f'{town}: beside the stone, facing into the town', at)
    p.check(at and at[4] >= 2, f'{town}: the party follows', at)
    on = p.js("(() => { const f = LQ_ENGINE.scene; const st = [...f.entities.values()].filter((e) => e.type === 'worldmap_stone').map((e) => e.x + ',' + e.y);"
              " return [f.leader, ...f.followers].filter((a) => st.includes(a.tx + ',' + a.ty)).map((a) => a.id); })()")
    p.check(on == [], f'{town}: nobody stands on the stone', on)
    p.check(p.js('LQ_ENGINE.stack.map((s) => s.name).join()') == 'field', 'nothing left over the field', p.js('LQ_ENGINE.stack.map((s) => s.name)'))
    p.check(free(p) or settle(p), 'the field takes input again', '')
    p.shot(f'{label}-arrived')
    return at


def valewyn_and_back(p):
    """Valewyn's stone to Willowmere by road, then Willowmere's gate stone back to Valewyn."""
    p.boot('&pack=ep4')
    other = p.js("JSON.stringify({ v: 1, savedAt: '2026-11-01T00:00:00Z', meta: { name: 'Other' }, data: { heroName: 'Other', map: 'nh_inn', pos: { x: 4, y: 4, dir: 'down' } } })")
    p.page.evaluate(PLACE, ['ep4_valewyn', BESIDE[0], BESIDE[1], 'left', other])
    stand(p, 'ep4_valewyn', *BESIDE, 'left')
    flags0 = p.js(FLAGS)
    slot2 = p.js("localStorage.getItem('lq-next-slot-2')")
    music0 = p.js('LQ_ENGINE.audio.currentMusic()')
    p.check(music0 == 'valewyn', "Valewyn's music before", music0)
    open_from_stone(p, 'left')
    p.shot('valewyn-map-open')
    pick(p, 'willowmere')
    at = ride(p, 'willowmere', 'to-willowmere')
    p.check(at and at[7] == 'willowmere', "Willowmere's music on arrival", at)
    p.check(p.js(FLAGS) == flags0, 'no flag or quest changed by travel', '')
    p.check(p.js(SLOT, 0) == ['willowmere', 14, 27], 'the autosave (the run\'s slot 0) holds the arrival', p.js(SLOT, 0))
    p.check(p.js("localStorage.getItem('lq-next-slot-2')") == slot2, 'another run\'s slot is untouched', '')
    # back: the gate stone is beside the party (east): turn to it, open, choose Valewyn
    open_from_stone(p, 'right')
    st = p.js(MAPSS)
    p.check(st['ok'].get('willowmere') == 'here', 'Willowmere is where the party stands', st['ok'])
    pick(p, 'valewyn')
    at = ride(p, 'valewyn', 'to-valewyn')
    p.check(at and at[7] == 'valewyn', "Valewyn's music again", at)
    p.check(p.js(FLAGS) == flags0, 'still no flag changed', '')
    p.check(p.js(SLOT, 0) == ['ep4_valewyn', 24, 29], 'the autosave holds Valewyn', p.js(SLOT, 0))
    p.check(p.js("localStorage.getItem('lq-next-slot-2')") == slot2, 'another run\'s slot is still untouched', '')


def offline_refusal(p):
    """The Episode 4 pack never loaded (its files blocked, as on a phone that was offline at boot), the browser offline: the
    menu's Map row, Valewyn chosen, the route starts and the trip is refused with one line; the party stays in Willowmere."""
    try:
        p.boot('')
        p.js(FLAGS_JS)
        p.ctx.route('**/src/data/ep4/**', lambda route: route.abort())
        p.ctx.route('**/src/data/ep5/**', lambda route: route.abort())
        p.page.evaluate(PLACE, ['willowmere', 20, 24, 'up', None])
        stand(p, 'willowmere', 20, 24, 'up')
        p.check(not p.js("LQ_PACKS.packReady('ep4')"), 'the ep4 pack is not up', p.js("LQ_PACKS.packState('ep4')"))
        p.ctx.set_offline(True)
        open_menu(p)
        menu_cmd(p, 'map')
        p.act('confirm')
        p.until("LQ_DEBUG.scene() === 'worldmap' && LQ_ENGINE.scene.debugState().composed", 'the Map row opens the map', 15)
        p.frames(10)
        pick(p, 'valewyn')
        p.until("(() => { const s = LQ_ENGINE.scene; return s && s.name === 'worldmap' && !s.trip && !!s.debugState().note; })()",
                'the trip is refused', 20)
        st = p.js(MAPSS)
        p.check('not ready yet' in st['note'], 'one clear line says why', st['note'])
        p.shot('offline-refused')
        p.act('cancel')
        p.until("LQ_DEBUG.scene() === 'menu'", 'back to the menu', 6)
        p.act('cancel')
        p.until("LQ_DEBUG.scene() === 'field'", 'back to the field', 6)
        at = p.js(FIELD_AT)
        p.check(at and tuple(at[:3]) == ('willowmere', 20, 24), 'the party stayed where it was', at)
    finally:
        p.ctx.set_offline(False)
        p.ctx.unroute('**/src/data/ep4/**')
        p.ctx.unroute('**/src/data/ep5/**')
        # the blocked pack's own fetch failures are the point of this sequence, not errors of the game
        p.errors[:] = [e for e in p.errors if not any(w in e for w in ('ERR_', 'Failed to fetch', 'Failed to load', 'net::', 'ep4', 'ep5'))]


SEQUENCES = [('travel valewyn and back', valewyn_and_back), ('travel offline refused', offline_refusal)]
TOUCH_ONLY = []


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--device', default=None)
    a = ap.parse_args()
    bad = 0
    for dev in ([a.device] if a.device else ['desktop', 'phone', 'portrait']):
        p = Play(dev)
        try:
            for name, fn in SEQUENCES:
                n0 = len(p.checks)
                p.errors.clear()
                try:
                    fn(p)
                    status = 'ok'
                except Stuck as e:
                    status = f'STUCK {e}'
                except Exception:  # noqa: BLE001
                    status = 'ERROR ' + traceback.format_exc()[-1500:]
                fails = [c for c in p.checks[n0:] if not c['ok']]
                errs = list(p.errors) + p.engine_errors()
                if status == 'ok' and (fails or errs):
                    status = 'FAIL'
                bad += status != 'ok'
                print(f'{status[:1600]:<6} {dev:<9} {name:<26} {len(p.checks) - n0} checks', flush=True)
                for c in fails:
                    print(f'   {c["label"]}: {c["detail"][:200]}', flush=True)
                for e in errs[:5]:
                    print(f'   {e[:200]}', flush=True)
        finally:
            p.close()
    sys.exit(1 if bad else 0)


if __name__ == '__main__':
    main()
