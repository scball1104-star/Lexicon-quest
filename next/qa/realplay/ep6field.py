"""Episode 6 by real input in the field: the Airstair's lane A ridden with the direction held through the ride, then by a tap
(EPISODE6_PLAN 12, "The ride, with real input"; docs/WORLD_EP6.md 1, held keys).

The bots ride through injected presses; here the start point is set up (the quick start, the Airstair's third landing at lane A's
mouth (8,23) facing the stream, the scenes before it already seen) and the ride is a real key (desktop) or a finger on the
on-screen d-pad (phone). Held: the direction stays down through the whole ride and on after it; the party must land on exactly
one cell, (15,23), and take no extra step once the input unlocks (the field refuses a direction held through a ride until it is
released). Tap (phone): one short tap on the d-pad starts the same ride, and the wind finishes it with the finger lifted.

    python next/qa/realplay/ep6field.py                 desktop keys, then phone touch (under 3 minutes)
    python next/qa/realplay/ep6field.py --device phone

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

MOUTH, LANDING, BEYOND = (8, 23), (15, 23), (16, 23)
SEEN = ['ep6_started', 'ep6_morning_done', 'ep6_boarded', 'airstair_arrived', 'mira_asked', 'mira_told', 'airstair_fight_done', 'saw_gust']
PLACE = """async ([map, x, y, dir, flags]) => {
  const t0 = Date.now();
  while (!(LQ_DEBUG.commands && LQ_DEBUG.commands().includes('newGameEp6'))) {
    if (Date.now() - t0 > 90000) throw new Error('newGameEp6 never registered');
    await new Promise((ok) => setTimeout(ok, 50));
  }
  await LQ_DEBUG.newGameEp6('Arden', { slot: 1, scene: 'none' });
  const g = LQ_ENGINE.game;
  for (const f of flags) g.flags[f] = true;
  // every field remark counts as heard (the first-ride bark is a box of its own; this file tests the ride, not the bark)
  const { BARKS } = await import('./src/data/text.js'); for (const k of Object.keys(BARKS)) g.counters['bark:' + k] = 1;
  g.map = map; g.pos = { x, y, dir };
  LQ_DEBUG.settings({ textSpeed: 4, autoBattle: true, battleSpeed: 2, equipPrompts: false, rotateHintSeen: true });
  LQ_ENGINE.reset('field');
  return true;
}"""
LEADER = "(() => { const f = LQ_ENGINE.scene, L = f && f.leader; return L ? [L.tx, L.ty, !!L.moving] : null; })()"
WIND = ("(() => { const f = LQ_ENGINE.stack.find(s => s.name === 'field'); const w = f && f.wind; if (!w) return null;"
        " return { riding: !!w.carry, settling: !!w.settle, rides: w.rides, hold: w.hold, last: w.lastRide, locked: !!f.inputLocked }; })()")


def place(p):
    p.boot('&pack=ep5,ep6&ep=6')
    p.page.evaluate(PLACE, ['ep6_airstair', MOUTH[0], MOUTH[1], 'right', SEEN])
    p.until("LQ_DEBUG.scene() === 'field' && !LQ_ENGINE.transition && !!LQ_ENGINE.scene.map && LQ_ENGINE.scene.map.id === 'ep6_airstair' && !LQ_ENGINE.scene.loading && !!LQ_ENGINE.scene.wind && LQ_ENGINE.scene.wind.active",
            'the Airstair with its lanes', 30)
    p.frames(20)
    settle(p)
    L = p.js(LEADER)
    p.check(L and (L[0], L[1]) == MOUTH, "at lane A's mouth", L)
    p.check(p.js("LQ_ENGINE.scene.wind.isLive(9, 23)"), 'lane A is live beside the party', p.js(WIND))


def down(p, d):
    if p.touch:
        box = p.control_box('dpad')
        x = box['x'] + box['width'] / 2 + {'left': -1, 'right': 1}.get(d, 0) * box['width'] * 0.33
        y = box['y'] + box['height'] / 2 + {'up': -1, 'down': 1}.get(d, 0) * box['width'] * 0.33
        p._touch('touchStart', x, y)
        return lambda: p._touch('touchEnd', x, y)
    p.page.keyboard.down(KEY_FOR[d])
    return lambda: p.page.keyboard.up(KEY_FOR[d])


def lane_held(p):
    """The direction held from the mouth through the ride and 60 frames past the landing: one landing cell, no extra step."""
    place(p)
    w0 = p.js(WIND)
    cells, rode, unlocked_at = [], False, None
    up = down(p, 'right')
    try:
        t0 = time.time()
        while time.time() - t0 < 20:
            L, w = p.js(LEADER), p.js(WIND)
            if L and (not cells or cells[-1] != (L[0], L[1])):
                cells.append((L[0], L[1]))
            rode = rode or w['riding']
            if rode and not w['riding'] and not w['settling'] and not w['locked'] and L and not L[2]:
                if unlocked_at is None:
                    unlocked_at = p.frame()
                elif p.frame() - unlocked_at >= 60:
                    break
            p.frames(1)
        p.shot('lane-a-held')
    finally:
        up()
    p.frames(6)
    w = p.js(WIND)
    L = p.js(LEADER)
    p.check(rode and w['rides'] == w0['rides'] + 1, 'one press while held: one ride', (w0['rides'], w['rides']))
    p.check(unlocked_at is not None, 'the input unlocks after the ride with the key still down', w)
    p.check((L[0], L[1]) == LANDING, f'lands on {LANDING}', L)
    after = cells[cells.index(LANDING):] if LANDING in cells else cells
    p.check(after == [LANDING], 'exactly one landing cell, no extra step after the unlock (60 frames held)', cells)
    p.check(BEYOND not in cells, f'never stepped on to {BEYOND}', cells)
    p.check((w.get('last') or {}).get('stop') == 'land', 'the ride ends in a landing', w.get('last'))
    path = (w.get('last') or {}).get('path') or []
    p.check(path[:1] == ['9,23'] and path[-1:] == ['15,23'], 'the path runs from the first lane cell to the landing', path)
    settle(p)
    # released: the next press is a plain step on the ledge
    p.hold('right', 3)
    p.until("(() => { const L = LQ_ENGINE.scene.leader; return L && !L.moving; })()", 'the step ends', 5)
    L = p.js(LEADER)
    p.check((L[0], L[1]) == BEYOND, 'after a release a fresh press steps on', L)


def lane_tap(p):
    """Phone: one short tap on the d-pad toward the stream; the wind does the rest with the finger lifted."""
    place(p)
    w0 = p.js(WIND)
    p.act('right')
    p.until("(() => { const f = LQ_ENGINE.scene, w = f.wind; return !!w && !w.carry && !w.settle && !f.inputLocked && !f.leader.moving && w.rides > %d; })()" % w0['rides'],
            'the tapped ride lands', 15)
    p.frames(30)
    p.shot('lane-a-tap')
    L, w = p.js(LEADER), p.js(WIND)
    p.check((L[0], L[1]) == LANDING, f'a tap rides lane A to {LANDING}', L)
    p.check(w['rides'] == w0['rides'] + 1 and (w.get('last') or {}).get('stop') == 'land', 'one tap: one ride, landed', w)
    p.check(free(p), 'the field is free after the ride', p.lite()['scenes'])


SEQUENCES = [('lane a held', lane_held)]
TOUCH_ONLY = [('lane a tap', lane_tap)]


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--device', default='desktop,phone')
    ap.add_argument('--timeout', type=int, default=400)
    args = ap.parse_args()
    timer = threading.Timer(args.timeout, lambda: (print(f'FAIL: ep6field exceeded {args.timeout} s', flush=True), os._exit(3)))
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
                    print(f'        {c["label"]}: {c["detail"][:160]}', flush=True)
                for e in (errs + [f'automation call: {c}' for c in calls])[:5]:
                    print(f'        {e[:200]}', flush=True)
        finally:
            p.close()
    print('EP6FIELD: ' + ('PASS' if not bad else f'FAIL ({bad})'))
    return 1 if bad else 0


if __name__ == '__main__':
    sys.exit(main())
