"""Episode 7 by real input in the field: name stones read by real keys and a real tap, with a held direction across the reads
(EPISODE7_PLAN 12, "The stones, with real input"; docs/WORLD_EP7.md).

The bots read through injected presses; here the start point is set up (the quick start, the White Road at Gap A's west spur
(12,47) facing Asta's cairn, the scenes before it already seen, every field remark heard) and everything after is a real key
(desktop) or a finger on the on-screen A button and d-pad (phone):

  1. Asta is read (confirm on ns_asta), moving nobody; a direction held straight after the read for exactly N steps' frames walks
     N cells: the path to the far spur with no step dropped (every cell of the line, in order) and none added (still on the last
     cell 60 frames after the release).
  2. Bo is read from (19,39); then the party climbs Bo's path onto the ledge and reads Nyx: Asta, the oldest, lets go only now,
     with every member off Asta's path, and every Asta cell is fade again.
  3. Back down Bo's path with the followers on it: a read of Ilka would let Bo go under them, so it is refused (`fade`), the holds
     and every path cell are unchanged, and a held direction after the refusal steps exactly as far as it is held.
  4. (phone) One read by a tap on the A button alone.

    python next/qa/realplay/ep7field.py                 desktop keys, then phone touch (under 4 minutes)
    python next/qa/realplay/ep7field.py --device phone

run.py takes this module (SEQUENCES / TOUCH_ONLY).
"""
import argparse
import os
import pathlib
import sys
import threading
import time
import traceback

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from driver import KEY_FOR, Play, Stuck  # noqa: E402
from menus import free, settle  # noqa: E402

SPUR = (12, 47)
SEEN = ['ep7_started', 'ep7_morning_done', 'ep7_boarded', 'road_arrived', 'told_vex', 'valewyn_list_get', 'vex_carved', 'road_fight_done',
        'first_stone_read']
PLACE = """async ([map, x, y, dir, flags]) => {
  const t0 = Date.now();
  while (!(LQ_DEBUG.commands && LQ_DEBUG.commands().includes('newGameEp7'))) {
    if (Date.now() - t0 > 120000) throw new Error('newGameEp7 never registered');
    await new Promise((ok) => setTimeout(ok, 50));
  }
  await LQ_DEBUG.newGameEp7('Arden', { slot: 1, scene: 'none' });
  const g = LQ_ENGINE.game;
  for (const f of flags) g.flags[f] = true;
  // every field remark counts as heard (the first-read bark is a box of its own; this file tests the reads, not the barks)
  const { BARKS } = await import('./src/data/text.js'); for (const k of Object.keys(BARKS)) g.counters['bark:' + k] = 1;
  g.map = map; g.pos = { x, y, dir };
  LQ_DEBUG.settings({ textSpeed: 4, autoBattle: true, battleSpeed: 2, equipPrompts: false, rotateHintSeen: true });
  LQ_ENGINE.reset('field');
  return true;
}"""
LEADER = "(() => { const f = LQ_ENGINE.scene, L = f && f.leader; return L ? [L.tx, L.ty, !!L.moving, L.dir] : null; })()"
STONES = ("(() => { const f = LQ_ENGINE.stack.find(s => s.name === 'field'); const s = f && f.stones; if (!s || !s.active) return null;"
          " return { held: s.held(), reads: s.reads, refusals: s.refusals, last: s.lastRead, busy: !!(s.busy || s.anim), locked: !!f.inputLocked,"
          " party: s.partyCells().map(([x, y]) => x + ',' + y) }; })()")
OPEN = "LQ_DEBUG.stonesOpen()"
# Asta's path a (13..20, 45..46); Bo's b (19..20, 37..38) (docs/MAPS_EP7_A.md 2)
PATH_A = {(x, y) for x in range(13, 21) for y in (45, 46)}
PATH_B = {(x, y) for x in (19, 20) for y in (37, 38)}


def place(p):
    p.boot('&pack=ep6,ep7&ep=7')
    p.page.evaluate(PLACE, ['ep7_white_road', SPUR[0], SPUR[1], 'down', SEEN])
    p.until("LQ_DEBUG.scene() === 'field' && !LQ_ENGINE.transition && !!LQ_ENGINE.scene.map && LQ_ENGINE.scene.map.id === 'ep7_white_road' && !LQ_ENGINE.scene.loading && !!LQ_ENGINE.scene.stones && LQ_ENGINE.scene.stones.active",
            'the White Road with its stones', 40)
    p.frames(20)
    settle(p)
    L = p.js(LEADER)
    p.check(L and (L[0], L[1]) == SPUR, "on Gap A's west spur", L)
    p.check(p.js(STONES)['held'] == [], 'nothing held on arrival', p.js(STONES))


def down(p, d):
    """Press and keep down a direction (a key, or a finger on the d-pad); returns the release."""
    if p.touch:
        box = p.control_box('dpad')
        x = box['x'] + box['width'] / 2 + {'left': -1, 'right': 1}.get(d, 0) * box['width'] * 0.33
        y = box['y'] + box['height'] / 2 + {'up': -1, 'down': 1}.get(d, 0) * box['width'] * 0.33
        p._touch('touchStart', x, y)
        return lambda: p._touch('touchEnd', x, y)
    p.page.keyboard.down(KEY_FOR[d])
    return lambda: p.page.keyboard.up(KEY_FOR[d])


WALK = 12   # logic frames a walking step takes (qa/autoplay.py WALK): a held direction starts step k at frame WALK*k-(WALK+1)


def held_walk(p, d, target, label, up=None, timeout=25):
    """Keep `d` down for exactly the frames that make the steps to `target` (WALK*(n-1)+1, the bot's rule), release, wait 60
    frames. Every cell passed is recorded: the walk must be one straight, unbroken line (no step dropped) and end exactly on
    `target` (no step added after the release)."""
    L0 = p.js(LEADER)
    cells = [(L0[0], L0[1])]
    n = abs(target[0] - L0[0]) + abs(target[1] - L0[1])
    want = WALK * (n - 1) + 1
    up = up or down(p, d)
    try:
        # the count starts on the frame the first step starts (a d-pad finger turns the leader before it walks): step k then
        # starts WALK*k frames later, so WALK*(n-1)+1 held frames are exactly n steps, with WALK-1 frames of slack either way
        t0 = time.time()
        while time.time() - t0 < timeout:
            L = p.js(LEADER)
            if L[2] or (L[0], L[1]) != cells[-1]:
                break
            p.page.wait_for_timeout(2)
        f0 = p.frame()
        while time.time() - t0 < timeout and p.frame() - f0 < want:
            L = p.js(LEADER)
            if (L[0], L[1]) != cells[-1]:
                cells.append((L[0], L[1]))
            p.page.wait_for_timeout(4)
    finally:
        up()
    t0 = time.time()
    while time.time() - t0 < timeout:
        L = p.js(LEADER)
        if (L[0], L[1]) != cells[-1]:
            cells.append((L[0], L[1]))
        if not L[2]:
            break
        p.page.wait_for_timeout(4)
    p.frames(60)
    L = p.js(LEADER)
    if (L[0], L[1]) != cells[-1]:
        cells.append((L[0], L[1]))
    dx, dy = {'left': (-1, 0), 'right': (1, 0), 'up': (0, -1), 'down': (0, 1)}[d]
    line = [(L0[0] + dx * k, L0[1] + dy * k) for k in range(n + 1)]
    p.check(cells == line, f'{label}: every cell of the line in order, none dropped, none added', cells)
    p.check((L[0], L[1]) == tuple(target) and not L[2], f'{label}: on {target} 60 frames after the release', L)
    return cells


def read(p, d, expect, label, by='act'):
    """Face `d` (bump the cairn) and confirm with this device's control; the holds after the read must be `expect`."""
    s0 = p.js(STONES)
    p.act(d)
    p.frames(8)
    if by == 'tap':
        p.press_control('a')
    else:
        p.act('confirm')
    p.until("(() => { const f = LQ_ENGINE.scene, s = f && f.stones; return !!s && !s.busy && !s.anim && !f.inputLocked; })()", f'{label}: the read settles', 10)
    p.frames(24)                      # the float line's page guard (10 frames) and the draw-in's input hold are over
    s = p.js(STONES)
    p.check(s['reads'] == s0['reads'] + 1, f'{label}: one press, one read', (s0['reads'], s['reads'], s['last']))
    p.check(s['held'] == expect, f'{label}: holds {expect}', s['held'])
    return s


def open_cells(p, cells, want):
    rows = (p.js(OPEN) or {}).get('rows') or []
    return all(rows[y][x] == want for x, y in cells) if rows else False


def stones_held(p):
    place(p)
    # 1. Asta, then a held direction straight after the read: exactly the steps it is held for
    s0 = p.js(STONES)
    p.act('confirm')
    s = p.js(STONES)
    p.check(s['reads'] == s0['reads'] + 1 and s['held'] == ['a'], 'Asta read by a real press', s)
    p.check(p.js(LEADER)[:2] == list(SPUR), 'the read moved nobody', p.js(LEADER))
    held_walk(p, 'up', (12, 46), 'up off the spur onto the road, pressed straight after the read')
    p.shot('asta-held')
    p.check(open_cells(p, PATH_A, 'o'), "every cell of Asta's path is open", p.js(OPEN))
    held_walk(p, 'right', (22, 46), "Asta's path held east to the far spur")
    # 2. Bo from (19,39); up Bo's path onto the ledge; Nyx: Asta lets go only now, the party off her path
    held_walk(p, 'up', (22, 40), 'north off the spur')
    held_walk(p, 'left', (19, 40), 'west to the road')
    held_walk(p, 'up', (19, 39), "to Bo's cairn")
    read(p, 'left', ['a', 'b'], 'Bo')
    p.check(open_cells(p, PATH_A, 'o'), 'Asta still held behind the party (two names at once)', p.js(OPEN))
    held_walk(p, 'up', (19, 36), "up Bo's path onto the ledge")
    held_walk(p, 'right', (21, 36), 'east on the ledge')
    held_walk(p, 'up', (21, 34), "to Nyx's cairn")
    s = p.js(STONES)
    p.check(not (set(tuple(map(int, c.split(','))) for c in s['party']) & PATH_A), "every member is off Asta's path before Nyx", s['party'])
    read(p, 'right', ['b', 'n'], 'Nyx')
    p.check(open_cells(p, PATH_A, '_'), "Nyx lets Asta go: her path is fade again, only now", p.js(OPEN))
    p.shot('nyx-held')
    # 3. back down Bo's path with the followers on it, then a read that would fade it under them
    held_walk(p, 'left', (19, 34), 'west on the ledge')
    held_walk(p, 'down', (19, 38), "down Bo's path")
    held_walk(p, 'up', (19, 36), 'back up, the followers on the path')
    s0 = p.js(STONES)
    on_b = set(tuple(map(int, c.split(','))) for c in s0['party']) & PATH_B
    p.check(bool(on_b), "a follower stands on Bo's path", s0['party'])
    rows0 = (p.js(OPEN) or {}).get('rows')
    p.act('left')
    p.frames(8)
    p.act('confirm')
    p.frames(30)
    settle(p)
    s = p.js(STONES)
    p.check(s['refusals'] == s0['refusals'] + 1 and (s['last'] or {}).get('refused') == 'fade', "Ilka's read is refused: Bo would fade under the party", s['last'])
    p.check(s['held'] == s0['held'] and s['reads'] == s0['reads'], 'the refusal changed no hold', (s0['held'], s['held']))
    p.check((p.js(OPEN) or {}).get('rows') == rows0, 'the refusal changed no path cell', '')
    p.shot('ilka-refused')
    L = p.js(LEADER)
    p.check((L[0], L[1]) == (19, 36), 'the refusal moved nobody', L)
    held_walk(p, 'right', (21, 36), 'a held direction after the refusal')
    p.check(free(p), 'the field is free after the reads', p.lite()['scenes'])


def stone_tap(p):
    """Phone: Asta read by one tap on the A button alone (the party already faces the cairn)."""
    place(p)
    read(p, 'down', ['a'], 'Asta by a tap', by='tap')
    p.shot('asta-tap')
    p.check(free(p), 'the field is free after the tapped read', p.lite()['scenes'])


SEQUENCES = [('stones held', stones_held)]
TOUCH_ONLY = [('stone tap', stone_tap)]


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--device', default='desktop,phone')
    ap.add_argument('--timeout', type=int, default=500)
    args = ap.parse_args()
    timer = threading.Timer(args.timeout, lambda: (print(f'FAIL: ep7field exceeded {args.timeout} s', flush=True), os._exit(3)))
    timer.daemon = True
    timer.start()
    bad = 0
    for device in [d for d in args.device.split(',') if d]:
        p = Play(device)
        try:
            for name, fn in SEQUENCES + (TOUCH_ONLY if p.touch else []):
                t0, n0, status, detail = time.time(), len(p.checks), 'ok', ''
                p.errors.clear()
                try:
                    fn(p)
                except Stuck as e:
                    status, detail = 'STUCK', str(e)
                except Exception:  # noqa: BLE001
                    status, detail = 'ERROR', traceback.format_exc()[-600:]
                fails = [c for c in p.checks[n0:] if not c['ok']]
                errs = list(p.errors) + p.engine_errors()
                calls = p.guard_calls()
                if status == 'ok' and (fails or errs or calls):
                    status = 'FAIL'
                bad += status != 'ok'
                print(f'{status:<5} {device:<8} {name:<22} {len(p.checks) - n0:>3} checks {time.time() - t0:>6.1f} s  {detail[:200]}', flush=True)
                for c in fails:
                    print(f'        {c["label"]}: {str(c["detail"])[:200]}', flush=True)
                for e in (errs + [f'automation call: {c}' for c in calls])[:5]:
                    print(f'        {e[:200]}', flush=True)
        finally:
            p.close()
    print('EP7FIELD: ' + ('PASS' if not bad else f'FAIL ({bad})'))
    return 1 if bad else 0


if __name__ == '__main__':
    sys.exit(main())
