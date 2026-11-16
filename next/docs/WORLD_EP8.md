# WORLD_EP8: pop-up books (E8-world)

Episode 8's one field mechanic, built as a pure rule plus a pack-side system (plan `docs/EPISODE8_PLAN.md` 4.4, 4.10, 5.1,
5.2). `src/scenes/field.js` is not edited. Everything is in the `ep8` pack.

| File | What |
|---|---|
| `src/data/ep8/field/popbooks.js` | the rule, pure (node-tested) |
| `src/data/ep8/field/system.js` | `Books`: collision override, read, animation, ghost, drawing, lights, rescue |
| `src/data/ep8/field/events.js` | the `popbook` event on `EXT`, `attach(field)`, `LQ_DEBUG.books / readBook / setBooks / booksOpen` |
| `src/data/ep8/field/art.js` | stand-ins (`void_violet`, `marble_page`, `ep8w_book_ns`, `ep8w_book_ew`), page, wall, ghost, realm and mote textures |
| `src/data/ep8/field/light.js` | the tints `rubout` and `violet` |
| `src/data/ep8/field/_testbooks.js` | the fixture map `ep8_testbooks` |
| `src/data/ep8/world.js` | registers the tints, the barks, the test map; attaches to every field |
| `tools/maps/ep8_check.mjs` | mapcheck's book search (one line in `mapcheck.mjs`) |
| `qa/world/ep8_books.test.mjs`, `qa/world/ep8_lab.py` | tests and the browser lab (shots in `qa/world/ep8_out/`) |

## The rule

- **Reading.** Confirm while facing a book from one of its two long sides. A shut book opens **away from the reader**: its
  pages fill the book's width for `length` cells beyond its far edge. An open book, read from either long side, shuts.
- **Pages.** A page cell over void is walkable (a bridge). A page cell over floor is solid (a wall of standing paper).
- **Pairs.** Opening a book whose `pair` stands open shuts the pair first. A swap is one read.
- **Refused** (buzzer, bark `would_fold` once, then a float line; nothing changes): `wall_on_party`, `bridge_under_party`
  (its own or its pair's bridge under the leader, a follower, or a cell being stepped from), `onto_actor` (an NPC, a foe or
  a trigger in the new pages). A short end is `side` (bark `first_side` once).
- Deterministic: no randomness, no timers, no damage tiles. Reset to `start` on every entry. **No save field.** A save on a
  bridge (or on a cell `start` walls) wakes on the nearest ground.

## The block (what map agents write)

```js
popbooks: {
  books: {
    a: { x: 14, y: 42, axis: 'ns', length: 3, realm: 'willowmere' },  // 2 x 1 at (14..15, 42), long sides north and south
    b: { x: 20, y: 30, axis: 'ew', length: 4, pair: 'c' },           // 1 x 2 at (20, 30..31), long sides west and east
  },
  start: { b: 'w' },        // optional, open on arrival ('n' 's' / 'e' 'w')
  goal: ['lift_up'],        // mapcheck only: marks the critical path visits, in order
  budget: 4,                // mapcheck only: a traded figure (say so in the map)
},
events: [{ id: 'pb_willow', type: 'popbook', book: 'a', x: 14, y: 42 /*, sprite?, name?, lantern? */ }, ...]
```

`(x, y)` is the book's top-left cell; the event sits there. Realms: `willowmere hollow emberpeak valewyn desert isles
north`. `name` overrides the realm line's text key (default `ep8_realm_<realm>`).

**Geometry the map agents must get right.** The first page row is next to the book, whose cells are solid, so a bridge is
stepped onto from the **side**: leave floor beside the first page row (a notch: the book sits one row back from the edge),
or the bridge cannot be used. Where pages end on floor (a wall), leave a ledge beside the last bridge row to step off. A
reading cell may be the book's own page cell (for the other direction) but never another book's. A reader standing on a
book's own bridge can never shut it (refused): "close it from the far side" means from ground on its other long side.

## The checks (`ep8_check.mjs`, run by `mapcheck check` and every `validate()`)

Errors: the block parses (axes, lengths, one owner a cell, no page on a book, pairs, one event per book at its cell, at most
6 books, `start`); book cells are ground; each book has ground on a long side; no reading cell on another book's pages; page
cells over void or plain floor only (never a wall, water, door, off-map); no event (anything but a light) or arrival on a
page cell; breadth first over (book state x party cell, at most 3^6 states), with keys, doors, Dash, Lantern and flag gates
as a fixpoint: no reachable state strands the party (the entrance is the start or any way off the map), every chest
reachable, the critical path (`goal`) reachable, never re-reading a book more than 6 cells behind, walking at most 1.3x the
straight route, decisions within plan 4.10 (`ep8_stair`, `ep8_library_f1/f2/f3`: 4 each, 16 total); and on every `ep8_` map
the camera rule on the focus marks of `docs/story/STAGING_EP8.md` ("Focus marks, `<map>` (...): `a`, `b`"; 12 from the
sides, 7 from top and bottom; an axis that fits one 24 x 13 screen is exempt). The grid is built from only the events
present under the flags searched; no flags means none set. Reported: `panned`, `decisions`, `steps`, `straight`,
`solution`, `margins`. `node tools/maps/ep8_check.mjs <map>` runs the bare map, then each `MAIN_FLAGS` set.

## The numbers

| | |
|---|---|
| open / fold | 16 / 12 frames, input locked only for them (field interact lock), instant under reduceMotion |
| far change | over 6 tiles and off screen: `reveal()` pan, confirm skips |
| rule timing (40 x 40, 6 books) | a read 0.006 ms, compile + full sweep 0.37 ms |
| browser (phone, GPU) | update 0.1 ms, draw at most 1 ms, read 0.2 ms, motes 0.1 ms a frame (budget 0.5) |
| page vs void | 0.683 (floor 0.35) |
| void below floor | 0.516 (floor 0.12), void sd 0.003 (flat) |
| ghost vs void | 0.718 (floor 0.15) |
| ghost outline vs floor | 0.334 mean (gold +0.203, its dark edge -0.508) |
| wall vs floor | 0.273 (floor 0.15) |
| motes | 3 frames, one every 30 game frames, +0.028 luma per frame at most (limit 0.03), paused under `rubout`, off under reduceMotion |
| `rubout` floor | 0.477 (min 0.22); `violet` at dark 0.2: 0.474 |

Measured on the stand-in art (`qa/world/ep8_lab.py`, phone 844x390): re-run once E8-tiles' sheet lands.

## Stubs and ids waiting on other agents

- Tiles (E8-tiles): `void_violet`, `marble_page`, `popbook` (`popbook_ns` / `popbook_ew`, or `popbook` with a matching
  footprint; frames shut, opening x2, open), `popbook_realm`. Stand-ins fill only ids the fragment lacks.
- Text (E8-story): barks `first_open first_wall first_side first_pair would_fold` (plan words used until `BARKS` has them);
  realm lines `ep8_realm_<realm>` (fallback: the plan's Willowmere line, else the realm's name).
- Audio (E8-audio): sfx `page_open`, `page_fold`; core `buzzer`.
- Open item (plan 5.2): the Listen inspect on `bell_tower` is not built here.
