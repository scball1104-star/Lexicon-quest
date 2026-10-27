# C1-state: the Deep Stacks run state (enter, descend, bank, die, resume, the vault, the record)

You are **C1-state**, wave C1 of the Deep Stacks (`docs/DEEP_STACKS_PLAN.md`, sections 2, 7, 8). Other agents may
run beside you (C1-gen, C1-data, C2 agents); stay in your owned paths. Nobody will answer questions: use your
judgment and write assumptions in your report.

**Goal.** Pure functions over `game` that make the Stacks' rules true: the snapshot on entry, level 1 and empty
hands, the vault's uniques in hand, the floor counter, banking with the Bookmark, death that keeps the vault and
loses this run's blues, the record, the suspend save, and old saves that load untouched.

## Read, in this order
1. `docs/briefs/COMMON.md`, `DESIGN.md` (saves, party, battle rules sections).
2. `docs/DEEP_STACKS_PLAN.md` sections 2, 7, 8, 11 (the contract; 7's table is the spec).
3. `src/game/state.js` (`createGame`, `newMember`, `give`, `take`, `addGear`, `removeGear`, `heal`, `serialize`,
   `deserialize`, `saveMeta`, `setPosition`, `setSafePoint`), `src/battle/rules.js` (`memberStats`, level-up and
   skills-by-level, mastery), `src/data/party.js`, `src/data/skills.js` (what a level-1 member knows),
   `src/game/save*.js` or wherever slots are written and listed (slot ids, meta), `qa/saves/*` (fixtures of old
   saves, round-trip tests).
4. `src/data/cave/items.js` and `index.js` if C1-data has landed (the unique ids); otherwise code against the
   plan's ids and say so.

## Owned paths (create or modify nothing else)
`src/game/cave.js` (new), `qa/cave/state_*.test.mjs`, `qa/saves/cave_*.test.mjs`, `qa/cave/out/**`.
Not owned: `src/game/state.js` (H3-vows owns its save fields this week; you add nothing there: `game.cave` rides on
the existing serializer, which clones the whole object), the save/load scenes, every data file.

## Deliverables

### 1. `src/game/cave.js`
- `ensureCave(game)` creates `game.cave = { vault: [], record: { floor: 0, readings: 0, clears: 0, time: 0 },
  run: null, snapshot: null }` when missing (old saves).
- `canEnter(game) -> { ok, why }` (needs `ep1_complete`, not already in a run).
- `enter(game, { seed, playtime })`: snapshot the fields in plan 2.2 (deep copy); reset every active member to
  level 1 (stats, EXP 0, HP/MP full at level 1, level-1 skills, mastery 0, nothing worn); `gear` = instances of
  every vault unique (fresh uids); `items` = {}; `gold` = 0; `run = { seed, floor: 1, blues: [], chests: 0,
  kills: 0, started: playtime }`; `record.readings += 1`; sets `game.cave.inRun = true`.
- `descend(game) -> floor` (increments the floor and the record's deepest), `foundBlue(game, uniqueId)` (adds to
  `run.blues` and gives the instance), `foundBookmark(game)` / `hasBookmark(game)`.
- `bank(game, { playtime })`: restore the snapshot (party, gear, items, gold, map, pos, lastSafe, mastery),
  then add this run's blues to `vault` and to `gear` (the worn ones stay worn on the restored member if a slot
  is free, else to `gear`); consume one Bookmark; `record.time += elapsed`; clear `run`, `snapshot`, `inRun`;
  return `{ blues, floor }` for the Archivist's line. The order is law: restore first, then touch anything else.
- `die(game, { playtime })`: restore the snapshot; this run's blues are dropped (not in `vault`, not in `gear`);
  the record keeps the floor; clear the run. Returns `{ lost: [...], floor }`.
- `clear(game, { playtime })` (B100): as `bank` without consuming a Bookmark, plus `deep_stacks_cleared`,
  `record.clears += 1`.
- `resumeInfo(game) -> { floor, seed } | null`, used by the title for "Resume the Deep Stacks (B23)".
- `inRun(game)`, `floorOf(game)`, `vaultIds(game)`, `recordOf(game)`.
- Vault uniques in the overworld: on `bank`, they are ordinary instances in the restored inventory; `enter`
  removes them from the restored snapshot's `gear` and worn slots before snapshotting? No: the snapshot holds the
  overworld state as is; `enter` builds the run inventory from `vault`, and `bank` or `die` restores the snapshot
  and then re-adds any vault unique that the snapshot already held exactly once (no duplicates: test it).
- Every function is pure over `game` plus the arguments; no engine, no scenes, no DOM.

### 2. The suspend save
Document in the file header how the field writes the suspend save: `serialize(game)` to the slot id `cave` on
floor arrival, `saveMeta` carrying `{ cave: { floor } }`. If the slot writer needs a change for a fifth slot id,
write the exact change in the report for C2-world; do not edit the save scenes.

### 3. Tests
`qa/cave/state_*.test.mjs`: enter resets levels, skills, mastery, gear, items, gold exactly; the vault's
uniques are in `gear` at B1; bank restores every snapshot field byte for byte except the added blues and the
consumed Bookmark; die restores and drops this run's blues only; no duplicate vault uniques after enter, bank,
enter, bank; record arithmetic; Quit equals die; `clear` sets the flag and keeps the Bookmark.
`qa/saves/cave_*.test.mjs`: a round trip of a game mid-run through `serialize`/`deserialize` keeps `cave`
intact; an old save fixture without `cave` loads and `ensureCave` fills it; a save with H3's vow fields and a
cave run both survive a round trip.

## Verify before you report
`node qa/run.mjs cave saves battle` green. No em dash. Bound every command.

## Report (last message, under 450 words)
The API with exact signatures, the snapshot field list, the duplicate rule, the suspend-save note for C2-world,
test counts, known gaps.
