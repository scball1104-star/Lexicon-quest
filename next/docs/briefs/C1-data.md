# C1-data: the Deep Stacks data (bands, foes, scaling, loot, uniques, the Bookmark, the Binder)

You are **C1-data**, wave C1 of the Deep Stacks (`docs/DEEP_STACKS_PLAN.md`, sections 2, 5, 6, 12). Two other
agents run beside you (C1-gen owns the generator and prefabs; H3-vows owns the vows). Stay in your owned paths.
Nobody will answer questions: use your judgment and write assumptions in your report.

**Goal.** Every table the Stacks need, as a pack that registers itself the way X1 does, with no edit to any shared
data file: the five bands and their foe pools, the per-floor scaling curve, the loot zones by depth, sixteen cave
uniques plus the Binder's Quill, the Keeper's Bookmark, the Binder's boss data, and pure helpers the generator
and the integrator call.

## Read, in this order
1. `docs/briefs/COMMON.md`, `DESIGN.md` section 7 (battle design).
2. `docs/DEEP_STACKS_PLAN.md` (the contract; sections 5 and 6 are yours; 2.4 to 2.6 and 7 for the rules).
3. `src/data/x1/index.js` and `src/data/x1/items.js` (the `register()` pattern: a pack adds to `UNIQUES`,
   `KEY_ITEMS`, `ENCOUNTERS`, zones, without editing the shared files), `src/game/packs.js` (the `PACKS`
   shape; you do not edit it, C2-world adds the `cave` entry).
4. `src/data/enemies.js` (the 39 foes), `src/data/x1/enemies.js`, `src/data/encounters.js` (`enc`, `ZONES`,
   `encounterExpMul`), `src/battle/rules.js` around the encounter multipliers (`power`, `speed`, `hp`, `expMul`;
   `ELITE_MODS`), `src/data/expcurve.js`.
5. `src/data/loot-tables.js` (`RARITY_TABLES`, zone item levels, `CHEST_TIERS`, `AFFIX_COUNTS`),
   `src/data/items.js` (`UNIQUES`, `SETS`, equipment bases and tiers, affix ids), `src/battle/loot.js`.
6. `tools/sim/simulate.mjs` (`runBattle`, `runSet`: you use them to sanity-check the curve now; C3 builds the
   full `--cave` route).

## Owned paths (create or modify nothing else)
`src/data/cave/foes.js`, `src/data/cave/loot.js`, `src/data/cave/items.js`, `src/data/cave/index.js`,
`src/data/cave/live.js`, `qa/cave/data_*.test.mjs`, `qa/cave/out/**`.
Not owned: `gen.js`, `prefabs.js`, `landing.js`, `rng.js` (C1-gen), `story.js`, `text.js` (C2), every shared
data file, the engine, the sim (read only this wave).

## Deliverables

### 1. The pack index (`index.js`, `live.js`)
`live.js` exports `CAVE_LIVE = false` (the integrator flips it). `index.js` exports `register()` exactly in the
X1 shape (idempotent, guarded imports, errors not swallowed) and `CAVE_READY`. `register()` adds the uniques and
the Bookmark to the item tables, the cave loot zones, and nothing else; the generator-time encounter
registration is a helper (3) the integrator calls per floor.

### 2. Bands, pools and scaling (`foes.js`)
- `BANDS`: five entries `{ id, name, floors: [from, to], tileset, music, pool }` per plan section 4 and 5.1.
- `pool`: 6 to 10 encounter templates per band, `{ leader, enemies: [...], weight, move: 'chase'|'wander' }`,
  using foes that exist today (Episode 3 cinder and forge foes gated on `EP3_LIVE`; when it is false, bands
  four and five fall back to the hardest earlier pools with two elite mods, and the report says so).
- `scale(floor) -> { hp, power, speed, expMul, elite: 0|1|2 }`: a smooth curve so that a party fighting what it
  meets stays near the foe's level (plan 2.4 and 5.2): elites from B20, two mods from B50; `expMul` carries the
  1.5x. Document the curve in the file header with the numbers at B1, B10, B30, B60, B99.
- `encounterFor(seed, floor, index) -> { id: 'cave_bNN_eI', ...encSpec }`: deterministic pick from the band's
  pool with the scale applied (`hp`, `power`, `speed`, `expMul`, `noFlee: false`, `zone: 'cave_band_k'`).
- `registerFloorEncounters(specs)`: puts them in `ENCOUNTERS` (idempotent; the integrator calls it when a floor
  is generated and clears nothing).
- The Binder (B100): `BINDER` enemy data (three phases, level 58, built on the Archivore or Nameless King kit;
  say which and why), its encounter `cave_binder` with `boss: true, canFlee: false`.

### 3. Loot (`loot.js`)
- `itemLevel(floor) = min(16, 1 + floor / 6)` (plan 6.1), `rarityAt(floor)` (the weight table by depth),
  `consumablesAt(floor)`, five loot zones `cave_band_1..5` registered into the loot tables' zone maps.
- `bookmarkChance(floor)` (4%, 8%, 12% by depth, plan 2.6) and `rollRedChest(rng, floor, vaultIds)` ->
  `{ items: [...], gold, bookmark: bool }`; `rollBlueChest(rng, floor, vaultIds) -> uniqueId | null` weighted to
  the band's four (plan 6.3). Pure, take the RNG from the caller.

### 4. Uniques and the Bookmark (`items.js`)
Sixteen uniques plus the Binder's Quill, per plan 6.2: ids `cave_*`, `rarity: 'legendary'`, `unique: true`,
`cave: true`, a fixed affix set using existing affix ids, and one `prop` id each for a property no rolled item
has (list the prop ids in the report; C2-world or C3 wires the ones that need engine hooks; keep at least eight
props implementable with existing stats alone). Names, two-line flavour each, in the Stacks' voice, no em dashes.
`keepers_bookmark`: key item, consumable, description "Closes the book where you stand."

### 5. Tests (`qa/cave/data_*.test.mjs`)
Every pool foe exists; `scale` is monotone and inside sane bounds; `encounterFor` deterministic; item level and
rarity tables valid; every unique's base, slot and affix ids exist; no two uniques share a name; the Bookmark
is a key item; `register()` idempotent and adds exactly the ids it says; `EP3_LIVE=false` fallback works.
Sanity: with `runSet` from the sim, a competent party at the level the curve expects wins at least 85% at B1, B10,
B30 (write the numbers in the report; C3 does the real route).

## Verify before you report
`node qa/run.mjs cave battle content` green (if `run.mjs` needs a `cave` area, C1-gen adds the folder; coordinate
by writing your tests under `qa/cave/` with the `data_` prefix only). No em dash. Bound every command.

## Report (last message, under 450 words)
The band table, the curve's numbers, the uniques list with props, the Bookmark, the Binder's kit, the helpers'
exact signatures, the sanity numbers, known gaps, and what C2-world must call and when.
