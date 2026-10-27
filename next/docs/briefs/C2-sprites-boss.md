# C2-sprites-boss: the chests, the Binder, B100, the entrance hall, and bands three to five

You are **C2-sprites-boss**, wave C2 of the Deep Stacks (`docs/DEEP_STACKS_PLAN.md` sections 4, 5.4, 9, 12).
Other agents run beside you (C1-state owns `src/game/cave.js`; H4-story owns the story scripts; C2-world and
C2-story-ui may start later and own the wiring, the Archivist's lines and the title). Stay in your owned paths.
Nobody will answer questions: use your judgment and write assumptions in your report.

**Goal.** Everything the Stacks need to look finished that is art or a hand-made map: the red and blue chest
sprites, the Binder's battle art and its hand-made floor B100, the entrance hall under the library (the
Archivist's room, mark points only), and the room prefabs and landings for bands three to five (the Court Below,
the Ember Shelves, the Forge of Names) registered through the generator's `registerBand`.

## Read, in this order
1. `docs/briefs/COMMON.md`, `DESIGN.md` sections 5 and 6 (maps, art bible), `docs/briefs/W1-sprites.md`,
   `X1-sprites.md`, `X1-tiles.md` (the pack art pipeline: `tools/art/sprites`, atlas json shape, prefixed files).
2. `docs/DEEP_STACKS_PLAN.md` (the contract).
3. `src/data/cave/gen.js` (`registerBand(id, {prefabs, landing, legend, music, ...})`, the prefab shape, the
   lint in `tools/cave/lint_prefabs.mjs`, the previews in `tools/cave/preview.py`), `src/data/cave/prefabs.js`
   and `landing.js` (the two bands that exist: match their quality and shape vocabulary), `src/data/cave/foes.js`
   (the `BINDER` record: which sprite or art id it names; match it), `src/data/cave/items.js` (the Quill).
4. The boss art that exists: the Archivore and the Nameless King in `assets/sprites/*` atlases and their battle
   frames (`src/battle/scene/*`, `qa/battlescene/actors.test.mjs` for the frame names a boss needs: idle, hurt,
   cast, devour or its equivalent, death frames). The chest sprites in the props atlas and `src/world/events.js`
   `chest_${tier}` (the integrator maps red and blue to sprites you name).
5. Hand-made boss floors for style: `src/data/maps/archive_boss.js`, `court_throne.js`; interiors for the hall:
   `library.js`, `chapel.js`.

## Owned paths (create or modify nothing else)
- `assets/sprites/cave_*` (png and json atlases), `tools/art/sprites/cave_*` (the scripts that build them).
- `src/data/cave/maps/cave_b100.js`, `src/data/cave/maps/cave_landing0.js` (new folder).
- `src/data/cave/prefabs_b3.js`, `prefabs_b4.js`, `prefabs_b5.js`, `src/data/cave/bands345.js` (calls
  `registerBand` for the three bands with their prefabs and landings; the integrator imports it).
- `qa/cave/art_*.test.mjs`, `qa/cave/out/**`, `tools/cave/out/**`.
Not owned: `gen.js`, `prefabs.js`, `landing.js`, `foes.js`, `index.js`, the engine, the shared atlases and
`assets/manifest.json` (your files carry the `cave_` prefix, so `node qa/core/sync-manifest.mjs --pack cave` lists
them; run it and say so).

## Deliverables

### 1. Chests (`assets/sprites/cave_props.*`)
`chest_red` and `chest_blue`, closed and open, 16x16 in the game's chest style (the wood chest's silhouette, a
red lacquer and a deep blue with a brass clasp; the blue reads as rare at a glance on phone). Also `plaque`
(a wall plaque for landings) and `trapdoor` (closed and open) for the library.

### 2. The Binder (`assets/sprites/cave_bosses.*`)
The B100 boss: built on the Archivore's kit (C1-data's BINDER uses its AI and phases) or the Nameless King's,
recoloured and reshaped so it is its own creature: ink and vellum, a bound book that unbinds across its three
phases (say how: a tell per phase). Every battle frame the boss scene expects, at the Archivore's scale. View
it in a battle preview (the battlescene tools) and iterate.

### 3. B100 (`src/data/cave/maps/cave_b100.js`)
A hand-made floor in the Forge of Names kit: the approach, the Binder's hall, the chest with the Quill after
the fight (mark `quill_chest`), a `binder` mark where the fight triggers, `arrival` at `[12, 18]` or update the
generator's `B100_ARRIVAL` expectation in your report. No stair down. Passes `mapcheck`.

### 4. The entrance hall (`src/data/cave/maps/cave_landing0.js`)
Under the library: a small reading room gone wrong, the Archivist's spot (mark `archivist`), the plaque (mark
`plaque`), the first stair (`stairs('stairs_down', ...)` into `cave_b1` at the generator's arrival), a way back
up (`stairs('stairs_up', ...)` to `library` at the trapdoor), lamps. Passes `mapcheck`.

### 5. Bands three to five (`prefabs_b3.js`, `prefabs_b4.js`, `prefabs_b5.js`, `bands345.js`)
Thirty to forty rooms per band on the court, ember and forge sheets (cold stone and glass; ash and cinder; iron
and bellows), with the same marks, dead-end shapes and set pieces the first two bands have, plus one landing
each. Lint clean; 200-seed walkability on B45, B65, B85 through the generator with your bands registered.
Render contact sheets and view them; compare against the band's hand-made maps (`court_f2.js`, the Episode 3
ember and forge maps if they exist).

### 6. Tests (`qa/cave/art_*.test.mjs`)
Atlas ids exist and are listed by the pack manifest; B100 and the hall pass the map checks; bands three to five
prefabs lint clean; the 200-seed run; the Binder's frame names cover what the boss scene expects.

## Verify before you report
`node qa/core/sync-manifest.mjs --pack cave`; `python tools/pwa/build_pwa.py` then `node qa/run.mjs pwa cave maps`
green (a `state_*` or `h4_*` failure is another agent's file; say so); previews viewed. No em dash. Bound every command.

## Report (last message, under 450 words)
Sprite ids and atlas paths, the Binder's phase tells, B100 and the hall's marks, the three bands' counts, test
counts, preview paths, known gaps, and what C2-world must wire (sprite ids for the chest tiers, the trapdoor,
the hall's stairs, `bands345.js` import).
