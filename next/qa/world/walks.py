"""Headless walks through every map (W2-world): warp to each map's start, pathfind to the farthest
reachable tiles and walk there at run speed, and fail on any console error or page error.

    python next/qa/world/walks.py                # every map in src/data/maps plus the scratch maps
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
         'saw_milestone', 'starter_quest_started']   # not ep1_complete: that rolls the credits

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
  const cells = [...seen.entries()].filter(([k]) => !isDoor(k % 4096, Math.floor(k / 4096))).sort((a, b) => b[1] - a[1]);
  const out = [];
  for (const [k, dist] of cells) { const x = k % 4096, y = Math.floor(k / 4096); if (out.every(o => Math.abs(o[0] - x) + Math.abs(o[1] - y) > 6)) out.push([x, y, dist]); if (out.length >= n) break; }
  return { reachable: seen.size, targets: out };
}"""


def map_ids():
    ids = sorted(p.stem for p in MAPS_DIR.glob('*.js') if not p.stem.startswith('_'))
    return ids + ['_testtown', '_testdungeon', '_testhome']


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
        for mid in wanted:
            t1 = time.time()
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
            if ss.get('map') != mid:
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
