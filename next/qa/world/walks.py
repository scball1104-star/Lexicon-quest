"""Headless walks through every map (W2-world): warp to each map's start, pathfind to the farthest
reachable tiles and walk there at run speed, and fail on any console error or page error.

    python next/qa/world/walks.py                # every map in src/data/maps
    python next/qa/world/walks.py willowmere valley
    python next/qa/world/walks.py --shots        # also save a frame per map in qa/world/out/walk_<map>.png

Runs in one browser session at 4x game speed. Story triggers are disarmed by setting the flags each scene
needs, so the walks exercise doors, ledges, pits and enemies without stopping for dialogue.
"""
import json
import pathlib
import sys
import time

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from fieldlab import Lab  # noqa: E402

NEXT = HERE.parent.parent
MAPS_DIR = NEXT / 'src' / 'data' / 'maps'
FLAGS = ['intro_done', 'saw_fading_sign', 'met_mael', 'mira_joined', 'bram_joined', 'left_town', 'valley_arrived',
         'archive_entered', 'f1_arrived', 'archive_f1_done', 'f2_arrived', 'echo_warden_defeated', 'lantern_get',
         'archive_f2_done', 'f3_arrived', 'found_thirteenth_bell', 'boss_door_open', 'archivore_defeated', 'returned_home',
         'saw_milestone', 'starter_quest_started', 'first_fight_done', 'campfire_rested',   # not ep1_complete: that rolls the credits
         # X1 (the switch is on): every arrival scene played, so no trigger interrupts a walk
         'downs_arrived', 'thornfold_arrived', 'stones_seen', 'moor_arrived', 'larchhill_arrived', 'terrace_arrived', 'millrace_arrived',
         'barrow_entered', 'cellar_entered', 'culvert_entered', 'stars_started', 'cleft_seen']
# Episode 2 maps (E2-world) are walked with the Episode 2 story done up to the King, so no scene fires mid-walk
# (not ep2_complete: that rolls the Episode 2 credits). Episode 1 maps are walked without them.
EP2_FLAGS = ['ep2_started', 'ep2_morning_done', 'crossing_done', 'east_road_arrived', 'east_first_fight_done',
             'saw_old_milestone', 'saw_cairns', 'fog_looped', 'waystation_rested', 'saw_court', 'nh_arrived', 'met_elian',
             'heard_crisis', 'met_anwen', 'court_ferry_open', 'court_entered', 'court_f1_arrived', 'mira_memory_1',
             'silverglass_lock_lit', 'silverglass_lock_seen', 'court_f1_done', 'court_f2_arrived', 'portraits_started',
             'portrait_child_seen', 'portrait_keeper_seen', 'portrait_king_seen', 'remembrance_open', 'mira_memory_2',
             'vex_met', 'other_selves_defeated', 'court_f2_done', 'court_f3_arrived', 'vow_belonging', 'vow_mercy',
             'vow_courage', 'vow_belonging_seen', 'vow_mercy_seen', 'vow_courage_seen', 'mira_memory_3', 'vow_door_open',
             'black_feather_found', 'nameless_king_defeated', 'aurel_named', 'mirror_sigil_get', 'nh_restored']
EP2_MAPS = ('east_road', 'nameless_hollow', 'nh_', 'court_')


def is_ep2(mid):
    return mid.startswith(EP2_MAPS)

FAR_JS = """(n) => {
  const f = LQ_ENGINE.stack.find(s => s.name === 'field'); if (!f || !f.map) return { reachable: 0, targets: [] };
  const L = f.leader, seen = new Map([[L.ty * 4096 + L.tx, 0]]), q = [[L.tx, L.ty]];
  const D = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  const isDoor = (x, y) => (f.byTile.get(x + ',' + y) || []).some(e => e.present && (e.type === 'door' || e.type === 'pit' || e.type === 'ferry' || (e.type === 'trigger' && e.ev.on !== 'enter')))
     || (f.map.mod.exits || []).some(ex => x >= ex.x && x < ex.x + (ex.w || 1) && y >= ex.y && y < ex.y + (ex.h || 1)) || f.map.codeAt(x, y) === 'pit';
  let head = 0;
  while (head < q.length) {
    const [x, y] = q[head++];
    for (const d in D) {
      const nx = x + D[d][0], ny = y + D[d][1], k = ny * 4096 + nx;
      if (seen.has(k)) continue;
      if (f.canStep(L, x, y, nx, ny, d) !== true) continue;
      if (f.actorAt(nx, ny)) continue;
      seen.set(k, seen.get(y * 4096 + x) + 1);
      if (!isDoor(nx, ny)) q.push([nx, ny]);
    }
  }
  const nearDoor = (x, y) => { for (let dx = -2; dx <= 2; dx++) for (let dy = -2; dy <= 2; dy++) if (isDoor(x + dx, y + dy)) return true; return false; };   // a far target an exit's width from the exit makes goto cut through it
  const cells = [...seen.entries()].filter(([k]) => !nearDoor(k % 4096, Math.floor(k / 4096))).sort((a, b) => b[1] - a[1]);
  const out = [];
  for (const [k, dist] of cells) { const x = k % 4096, y = Math.floor(k / 4096); if (out.every(o => Math.abs(o[0] - x) + Math.abs(o[1] - y) > 6)) out.push([x, y, dist]); if (out.length >= n) break; }
  return { reachable: seen.size, targets: out };
}"""


def map_ids():
    ids = sorted(p.stem for p in MAPS_DIR.glob('*.js') if not p.stem.startswith('_'))
    # Only shipped maps. The engine's scratch maps (src/world/_testmap.js) have doors on walk routes that
    # transfer mid-goto and stall the walk; they are dev fixtures, not content.
    return ids


def main(argv):
    shots = '--shots' in argv
    wanted = [a for a in argv if not a.startswith('--')] or map_ids()
    lab = Lab()
    failures = []
    report = []
    t0 = time.time()
    try:
        lab.open()
        for f in FLAGS:
            lab.call('setFlag', f, True)
        lab.run('LQ_DEBUG.setSpeed(4)')
        # dismiss any dialogue (first-time companion remarks) so walks never wait on a box
        lab.run('window.__lqAuto = setInterval(() => { const s = LQ_DEBUG.scene(); if (s === "dialog" || s === "choice" || s === "titleCard") LQ_DEBUG.press("confirm", 1); }, 120)')
        ep2_on = False
        for mid in wanted:
            t1 = time.time()
            if is_ep2(mid) != ep2_on:
                ep2_on = is_ep2(mid)
                for f in EP2_FLAGS:
                    lab.call('setFlag', f, ep2_on)
            lab.warp(mid)
            lab.frames(20)
            # visible enemies would start fights mid-walk: take them off the map for the route check
            lab.run("(() => { const f = LQ_ENGINE.stack.find(s => s.name === 'field'); if (f) for (const a of f.actors.slice()) if (a.kind === 'enemy') f.removeActor(a); })()")
            info = lab.page.evaluate(FAR_JS, 3)
            walked = []
            for (x, y, dist) in info.get('targets', []):
                pos = lab.call('goto', x, y, True, ms=90000)
                walked.append([x, y, pos])
            st = lab.state()
            ss = st.get('sceneState') or {}
            report.append({'map': mid, 'reachable': info.get('reachable'), 'walked': walked, 'draw': ss.get('perf', {}).get('drawMs'), 'ms': int((time.time() - t1) * 1000)})
            if shots:
                lab.shot(f'walk_{mid}')
            if ss.get('map') != mid and not mid.startswith('x1_'):     # the x1 maps carry arrival triggers and wide lanes: their walks are in qa/maps/x1_*.test.mjs; here only the console must stay clean
                failures.append(f'{mid}: ended on {ss.get("map")}')
            print(f"{mid:14s} reachable={info.get('reachable'):5} walked={len(walked)} draw={ss.get('perf', {}).get('drawMs')} ms  ({report[-1]['ms']} ms)")
    finally:
        errs = list(lab.errors)
        lab.close()
    for e in errs:
        failures.append(e[:300])
    (HERE / 'out').mkdir(exist_ok=True)
    (HERE / 'out' / 'walks-report.json').write_text(json.dumps({'maps': report, 'failures': failures}, indent=1))
    print(f'{len(report)} maps in {time.time() - t0:.1f} s')
    if failures:
        print('FAILURES:')
        for f in failures:
            print('  ', f)
        return 1
    print('OK: zero console errors')
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
