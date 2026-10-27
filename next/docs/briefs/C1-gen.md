# C1-gen: the Deep Stacks floor generator

You are **C1-gen**, wave C1 of the Deep Stacks (`docs/DEEP_STACKS_PLAN.md`, sections 2.3, 4, 12 and 14). Two
other agents run beside you (C1-data owns the cave data files; H3-vows owns the vows). Stay in your owned paths.
Nobody will answer questions: use your judgment and write assumptions in your report.

**Goal.** A pure, seeded generator that turns `(seed, floor)` into a map module the engine already accepts, built
from hand-authored room prefabs so a generated floor looks like a hand-made Lexicon Quest map, with the stair far
from the arrival, red and blue chest marks, foe marks, landings every tenth floor, and proofs of determinism and
walkability on hundreds of seeds.

## Read, in this order
1. `docs/briefs/COMMON.md`, `DESIGN.md` section 5 (maps and world) and 6 (art bible).
2. `docs/DEEP_STACKS_PLAN.md` (the contract; section 4 is yours).
3. `src/data/maps/_kit.js` (every helper: `rows`, `door`, `stairs`, `enemy`, chests, marks), three hand-made
   dungeon maps for style (`archive_f1.js`, `archive_f2.js`, `court_f1.js`) and two X1 maps (`x1_barrow.js`,
   `x1_cellar.js`), `docs/MAPS.md`, `docs/story/STAGING.md` (marks).
4. `src/world/maps.js` (`registerMap`, `loadMap`, `peekMap`: your output goes through `registerMap`),
   `src/world/tilemap.js` (what `ground`, `legend`, `overlays`, `decor` mean at render time), `assets/tiles/tiles.json`
   (tile ids per sheet: archive, hollow, court, ember, forge, interior).
5. `tools/maps/mapcheck.mjs` and `tools/maps/preview*` (how a map is checked and rendered to PNG; reuse them),
   `qa/maps/*.test.mjs` (harness style), `src/core/` for a seeded RNG (if none exists, add `src/data/cave/rng.js`,
   a 20-line xorshift; never `Math.random`).

## Owned paths (create or modify nothing else)
- `src/data/cave/gen.js`, `src/data/cave/prefabs.js` (bands one and two: the Catalogue on the archive sheet,
  the Root Cellars on the hollow sheet; 30 to 40 room templates each), `src/data/cave/rng.js` if needed,
  `src/data/cave/landing.js` (one landing template per band, two bands now).
- `tools/cave/**` (preview renderer, contact sheets, `out/`), `qa/cave/gen_*.test.mjs`, `qa/cave/out/**`.
Not owned: anything under `src/data/cave/` that C1-data owns (`foes.js`, `loot.js`, `items.js`, `index.js`,
`live.js`, `story.js`, `text.js`), every existing map, the engine, the tilesets. If you need a tile that does not
exist, use the closest and list it.

## Deliverables

### 1. `generateFloor(seed, floor, opts) -> mapModule` (`src/data/cave/gen.js`)
- `opts = { foes: (floor) => [...encounterIds], chests: { red, blue }, band }` so the generator never imports
  the data files: C1-data's tables are injected by the integrator later. Default stubs let your tests run alone.
- Output shape exactly as a hand-made map: `id: 'cave_b' + floor`, `name` (the band's name and the floor,
  "The Catalogue, B7"), `area: 'dungeon'`, `tileset`, `music` (band's, from the plan), `lighting`, `backdrop`,
  `under`, `legend`, `ground` (rows), `overlays`, `decor`, `events`, `marks` (`arrival`, `stairs`, `chest_N`,
  `blue_chest`, `foe_N`, `plaque` on landings). Events: `stairs('stairs_down', x, y, ['cave_b' + (floor + 1),
  ax, ay, 'down'])`, chests as the kit's chest events with `tier: 'red' | 'blue'` and a deterministic id, foes
  via `enemy(id, x, y, sprite, encounterId, move, extra)` with `chase` or `wander`.
- Rooms: 8 to 12 per floor from the band's prefab list, placed on a grid without overlap, joined by corridors
  along a spanning tree plus one or two loops; dead ends get chests; the stair goes in the room with the
  greatest walk distance from the arrival room, never adjacent. Grid 40x30 at B1 growing to 56x40 by B99.
- Landings (`floor % 10 === 0`): the band's landing template only: no foes, one red chest, the plaque mark,
  the stair; the generator marks `landing: true` on the module.
- Determinism: same `(seed, floor)` gives byte-identical JSON on every run (test with 200 pairs).
- Walkability: the generator proves arrival to stairs and arrival to every chest reachable (BFS over the walk
  model your own code derives from the legend) and throws a named error if not; the test runs 200 seeds across
  B1, B9, B10, B19, B20, B35, B99 with zero throws, and runs `tools/maps/mapcheck.mjs` over 20 of them.
- Performance: a floor generates in under 30 ms on this machine (the field loads it on the stair).

### 2. Prefabs (`src/data/cave/prefabs.js`, `landing.js`)
Hand-author 30 to 40 rooms per band as ASCII rows in the kit's style with per-room mark points. Vary shape and
dressing (shelves, lecterns, broken stacks, roots, pools, pillars, rubble), sizes 5x4 to 12x9, at least six
dead-end-shaped rooms per band, two or three "set piece" rooms (a reading well, a collapsed gallery). Every
tile id must exist in the sheet. Render every prefab and every generated test floor at 3x and view them with the
Read tool; compare against Archive F2 side by side; iterate until a floor reads as a hand-made Lexicon Quest
dungeon, not a maze.

### 3. Previews (`tools/cave/preview.py` or `.mjs`)
`python tools/cave/preview.py --seed 7 --floor 15` renders a floor PNG with marks labelled (as `tools/maps/out/`
does), and `--sheet` renders a contact sheet of ten floors. Keep the outputs in `tools/cave/out/`.

### 4. Tests (`qa/cave/gen_*.test.mjs`)
Determinism; walkability on 200 seeds; stair never adjacent to arrival and always the farthest room; chest
counts in range; landings have no foes; every tile id exists; every event has a unique id; the module passes the
same checks `qa/maps` applies to hand maps (reuse their helpers if they import cleanly).

## Verify before you report
`node qa/run.mjs maps cave` green (if `run.mjs` needs a `cave` area added, add the folder; do not edit `run.mjs`
beyond what any new folder needs, and say so). Previews viewed. No em dash in any text. Bound every command.

## Report (last message, under 450 words)
The generator's API and the opts contract, prefab counts per band, the preview paths you viewed, timings, test
counts, known gaps, and exactly what C2-world must do to register a floor at the stair.
