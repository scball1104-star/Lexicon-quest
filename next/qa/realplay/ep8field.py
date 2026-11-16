"""Episode 8 by real input in the field: pop-up books read by real keys and a real tap, with a held direction across the reads
(EPISODE8_PLAN 12, "The books, with real input"; docs/WORLD_EP8.md, docs/MAPS_EP8_A.md 2).

The bots read through injected presses; here the start point is set up (the quick start, the Stair at a named cell facing a named
book, the scenes before it already seen, every field remark heard, the Stair's two wandering foes taken off the map so no fight
breaks the walk) and everything after is a real key (desktop) or a finger on the on-screen A button and d-pad (phone):

  1. `pb_willow` is read from its south side (15,45), moving nobody; then a direction held for exactly N steps' frames walks N
     cells, straight after the read: round to the notch and up the bridge it stood up (14..15 x 41..43) to the landing, no step
     dropped (every cell of the line, in order) and none added (still on the last cell 60 frames after the release).
  2. Gap B the long way round: up the column, along the strip, down into the pocket, and `pb_b` read from there (its far side):
     it opens north, a wall on the strip and a bridge over the void; then over the bridge to the desk with the direction held.
  3. Gap C: across the book's open pages, then closed from its far (north) side, then read from the south so it opens the other
     way; over the new bridge with the direction held.
  4. A read that would put pages on the party's own cell is refused (`wall_on_party`): nothing changes (the book state and every
     page cell), the party is where it was, and a held direction after the refusal steps exactly as far as it is held. Stage
     lever: Bram is set on the strip cell (16,35) that `pb_b`'s north pages would wall (a player gets there only by walking the
     whole party round; two trailing followers never stand there).
  5. (phone) One read by a tap on the A button alone.

    python next/qa/realplay/ep8field.py                 desktop keys, then phone touch (under 4 minutes)
    python next/qa/realplay/ep8field.py --device phone

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
from driver import Play, Stuck  # noqa: E402
from ep7field import held_walk  # noqa: E402
from menus import free, settle  # noqa: E402

SEEN = ['ep8_started', 'ep8_morning_done', 'ep8_roofed', 'afraid_yes', 'stair_arrived', 'first_rub_done', 'first_book_read', 'eraser_seen']
PLACE = """async ([map, x, y, dir, flags]) => {
  const t0 = Date.now();
  while (!(LQ_DEBUG.commands && LQ_DEBUG.commands().includes('newGameEp8'))) {
    if (Date.now() - t0 > 150000) throw new Error('newGameEp8 never registered');
    await new Promise((ok) => setTimeout(ok, 50));
  }
  await LQ_DEBUG.newGameEp8('Arden', { slot: 1, scene: 'none' });
  const g = LQ_ENGINE.game;
  for (const f of flags) g.flags[f] = true;
  // every field remark counts as heard (a first-read bark is a box of its own; this file tests the reads, not the barks)
  const { BARKS } = await import('./src/data/text.js'); for (const k of Object.keys(BARKS)) g.counters['bark:' + k] = 1;
  for (const k of ['first_open', 'first_wall', 'first_side', 'first_pair', 'would_fold']) g.counters['bark:' + k] = 1;
  g.map = map; g.pos = { x, y, dir };
  LQ_DEBUG.settings({ textSpeed: 4, autoBattle: true, battleSpeed: 2, equipPrompts: false, rotateHintSeen: true });
  LQ_ENGINE.reset('field');
  return true;
}"""
# stage levers (page code, never an input): the Stair's wandering foes off the map; one follower set on a chosen cell
NO_FOES = "(() => { const f = LQ_ENGINE.stack.find(s => s.name === 'field'); for (const a of f.actors.slice()) if (a.kind === 'enemy') f.removeActor(a); return true; })()"
SET_FOLLOWER = """([k, x, y]) => { const f = LQ_ENGINE.stack.find(s => s.name === 'field'), a = f.followers[k];
  if (a.setPos) a.setPos(x, y, 'down'); else { a.tx = x; a.ty = y; a.x = x * 16; a.y = y * 16; } return [a.tx, a.ty]; }"""
LEADER = "(() => { const f = LQ_ENGINE.scene, L = f && f.leader; return L ? [L.tx, L.ty, !!L.moving, L.dir] : null; })()"
BOOKS = ("(() => { const f = LQ_ENGINE.stack.find(s => s.name === 'field'); const s = f && f.books; if (!s || !s.active) return null;"
         " const d = s.debugState(); return { state: d.state, open: d.open, reads: d.reads, refusals: d.refusals, last: d.lastRead,"
         " busy: !!(s.busy || s.anim), locked: !!f.inputLocked, party: s.partyCells().map(([x, y]) => x + ',' + y) }; })()")
OPEN = "LQ_DEBUG.booksOpen()"
# docs/MAPS_EP8_A.md 2: book a's pages (14..15 x 41..43), book b's north pages (the strip wall 15..16 x 35, the bridge 15..16 x 32..34),
# book c's south pages (the wall 14..15 x 23, the bridge 14..15 x 24..25) and its north pages (the wall 14..15 x 21, the bridge 19..20)
A_BRIDGE = {(x, y) for x in (14, 15) for y in (41, 42, 43)}
B_WALL, B_BRIDGE = {(15, 35), (16, 35)}, {(x, y) for x in (15, 16) for y in (32, 33, 34)}
C_SOUTH = {(x, y) for x in (14, 15) for y in (24, 25)}
C_NORTH = {(x, y) for x in (14, 15) for y in (19, 20)}


def place(p, x, y, d):
    p.boot('&pack=ep7,ep8&ep=8')
    p.page.evaluate(PLACE, ['ep8_stair', x, y, d, SEEN])
    p.until("LQ_DEBUG.scene() === 'field' && !LQ_ENGINE.transition && !!LQ_ENGINE.scene.map && LQ_ENGINE.scene.map.id === 'ep8_stair' && !LQ_ENGINE.scene.loading && !!LQ_ENGINE.scene.books && LQ_ENGINE.scene.books.active",
            'the Stair with its books', 60)
    p.frames(20)
    settle(p)
    p.js(NO_FOES)
    L = p.js(LEADER)
    p.check(L and (L[0], L[1]) == (x, y), f'on ({x},{y})', L)
    p.check(p.js(BOOKS)['open'] == {'a': '-', 'b': '-', 'c': 's', 'l': '-'}, 'the authored start on arrival (c open south)', p.js(BOOKS))


def cells_are(p, cells, want):
    rows = (p.js(OPEN) or {}).get('rows') or []
    return all(rows[y][x] == want for x, y in cells) if rows else False


def read(p, d, book, want, label, by='act'):
    """Face `d` (bump the book) and confirm with this device's control: one press, one read, `book` then stands `want`."""
    s0 = p.js(BOOKS)
    p.act(d)
    p.frames(8)
    if by == 'tap':
        p.press_control('a')
    else:
        p.act('confirm')
    p.until("(() => { const f = LQ_ENGINE.scene, s = f && f.books; return !!s && !s.busy && !s.anim && !s.revealing && !f.inputLocked; })()", f'{label}: the read settles', 10)
    p.frames(24)                      # the float line's page guard and the open's input hold are over
    s = p.js(BOOKS)
    p.check(s['reads'] == s0['reads'] + 1 and s['refusals'] == s0['refusals'], f'{label}: one press, one read', (s0['reads'], s['reads'], s['last']))
    p.check(s['open'].get(book) == want, f'{label}: {book} stands {want}', s['open'])
    return s


def books_held(p):
    """1 to 3: the three main-path gaps of the Stair by real input, a held direction after every read."""
    place(p, 15, 45, 'up')
    # 1. the willow from its south side, then the bridge it stood up, the direction held straight after the read
    s0 = p.js(BOOKS)
    p.act('confirm')
    p.until("(() => { const s = LQ_ENGINE.scene.books; return !!s && !s.busy && !s.anim && !LQ_ENGINE.scene.inputLocked; })()", 'the willow read settles', 10)
    s = p.js(BOOKS)
    p.check(s['reads'] == s0['reads'] + 1 and s['open']['a'] == 'n', 'pb_willow read by a real press: open north', s)
    p.check(p.js(LEADER)[:2] == [15, 45], 'the read moved nobody', p.js(LEADER))
    p.check(cells_are(p, A_BRIDGE, '='), 'its pages are a bridge over the void (14..15 x 41..43)', p.js(OPEN))
    held_walk(p, 'right', (16, 45), 'east beside the book, pressed straight after the read')
    held_walk(p, 'up', (16, 43), 'up to the notch')
    held_walk(p, 'left', (15, 43), 'onto the bridge')
    held_walk(p, 'up', (15, 40), 'the bridge held north to the landing')
    p.shot('willow-crossed')
    # 2. Gap B the long way round, read from the pocket (its far side): open north
    held_walk(p, 'left', (14, 40), 'west on the landing')
    held_walk(p, 'up', (14, 35), 'up the column to the strip')
    held_walk(p, 'right', (17, 35), 'east along the strip')
    held_walk(p, 'down', (17, 37), 'round the way down')
    held_walk(p, 'left', (16, 37), 'into the pocket')
    read(p, 'up', 'b', 'n', 'pb_b from the pocket')
    p.check(cells_are(p, B_WALL, '#') and cells_are(p, B_BRIDGE, '='), 'a wall on the strip, a bridge over the void', p.js(OPEN))
    held_walk(p, 'right', (17, 37), 'out of the pocket, pressed straight after the read')
    held_walk(p, 'up', (17, 34), 'up beside the wall')
    held_walk(p, 'left', (16, 34), 'onto the bridge')
    held_walk(p, 'up', (16, 31), 'the bridge held north to the desk')
    p.shot('gap-b-crossed')
    # 3. Gap C: across its open pages, close it from the far side, read it again from the south
    held_walk(p, 'left', (15, 31), 'west at the desk')
    held_walk(p, 'up', (15, 24), "up across the book's open pages")
    held_walk(p, 'right', (16, 24), 'off the bridge')
    held_walk(p, 'up', (16, 21), 'up the island')
    held_walk(p, 'left', (15, 21), 'to its north side')
    read(p, 'down', 'c', '-', 'pb_c closed from the far side')
    p.check(cells_are(p, C_SOUTH, 'o'), 'the bridge behind is void again', p.js(OPEN))
    held_walk(p, 'right', (16, 21), 'east, pressed straight after the close')
    held_walk(p, 'down', (16, 23), 'down the island')
    held_walk(p, 'left', (15, 23), "onto the wall's old cell")
    read(p, 'up', 'c', 'n', 'pb_c from the south')
    p.check(cells_are(p, C_NORTH, '='), 'a bridge north over the upper void (19..20)', p.js(OPEN))
    held_walk(p, 'right', (16, 23), 'east, pressed straight after the read')
    held_walk(p, 'up', (16, 20), 'up to the step-on')
    held_walk(p, 'left', (15, 20), 'onto the bridge')
    held_walk(p, 'up', (15, 18), 'the bridge held north to the high stair')
    p.shot('gap-c-crossed')
    p.check(free(p), 'the field is free after the reads', p.lite()['scenes'])


def books_refused(p):
    """4: pages that would land on the party are refused, and nothing changes."""
    place(p, 16, 37, 'up')
    at = p.page.evaluate(SET_FOLLOWER, [1, 16, 35])
    p.frames(4)
    s0 = p.js(BOOKS)
    p.check('16,35' in s0['party'], 'a party member stands on the strip cell the north pages would wall', (at, s0['party']))
    rows0 = (p.js(OPEN) or {}).get('rows')
    p.act('up')
    p.frames(8)
    p.act('confirm')
    p.frames(30)
    settle(p)
    s = p.js(BOOKS)
    p.check(s['refusals'] == s0['refusals'] + 1 and (s['last'] or {}).get('refused') == 'wall_on_party', 'the read is refused (wall_on_party)', s['last'])
    p.check(s['state'] == s0['state'] and s['reads'] == s0['reads'], 'the refusal changed no book', (s0['state'], s['state']))
    p.check((p.js(OPEN) or {}).get('rows') == rows0, 'the refusal changed no page cell', '')
    p.shot('b-refused')
    L = p.js(LEADER)
    p.check((L[0], L[1]) == (16, 37), 'the refusal moved nobody', L)
    held_walk(p, 'right', (17, 37), 'a held direction after the refusal')
    p.check(free(p), 'the field is free after the refusal', p.lite()['scenes'])


def book_tap(p):
    """5. Phone: the willow read by one tap on the A button alone (the party already faces the book)."""
    place(p, 15, 45, 'up')
    read(p, 'up', 'a', 'n', 'pb_willow by a tap', by='tap')
    p.shot('willow-tap')
    p.check(free(p), 'the field is free after the tapped read', p.lite()['scenes'])


SEQUENCES = [('books held', books_held), ('books refused', books_refused)]
TOUCH_ONLY = [('book tap', book_tap)]


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--device', default='desktop,phone')
    ap.add_argument('--timeout', type=int, default=600)
    args = ap.parse_args()
    timer = threading.Timer(args.timeout, lambda: (print(f'FAIL: ep8field exceeded {args.timeout} s', flush=True), os._exit(3)))
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
    print('EP8FIELD: ' + ('PASS' if not bad else f'FAIL ({bad})'))
    return 1 if bad else 0


if __name__ == '__main__':
    sys.exit(main())
