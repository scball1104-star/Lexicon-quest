# C2-world: wiring the Deep Stacks into the game

You are **C2-world**, wave C2 of the Deep Stacks (`docs/DEEP_STACKS_PLAN.md`, every section; 2, 4, 7, 8, 9 and 12
most). You are the integrator: the pack, the entrance, the floors, the chests, the foes, the Bookmark, death,
banking, the suspend save and the floor tag. Other agents run beside you: H4-story (story scripts, `quests.js`,
`npcs.js`, `ledger.js`), C2-sprites-boss (`assets/sprites/cave_*`, `src/data/cave/maps/cave_b100.js`,
`cave_landing0.js`, `prefabs_b3..5.js`, `bands345.js`) and, when a slot frees, C2-story-ui (`src/data/cave/story.js`,
`text.js`, `src/scenes/title.js`, the plaque screen, the Journal line). Stay in your owned paths; where their
files have not landed yet, code against the contracts below with a fallback and say so.

## Read, in this order
1. `docs/briefs/COMMON.md`, `DESIGN.md` (sections 4, 5, 7), `docs/PWA_PACKS.md` (the pack rules; the `cave` entry
   is registered already in `src/game/packs.js`).
2. `docs/DEEP_STACKS_PLAN.md`.
3. The three C1 modules and their reports in `PLAN.md` Wave C: `src/data/cave/gen.js` (`generateFloor(seed,
   floor, opts)`, `arrivalOf`, `registerBand`, `B100_ARRIVAL`), `src/data/cave/foes.js` (`floorEncounters`,
   `registerFloorEncounters`, `foesPerFloor`, `isLanding`), `loot.js` (`setLootFloor`, `rollRedChest`,
   `rollBlueChest`, `blueChestDue`), `items.js` (`wornProps`, `CAVE_PROPS`), `index.js` (`register()`),
   `src/game/cave.js` (the whole API; its header holds the suspend-save note for you).
4. `src/world/maps.js` (`registerMap`, `loadMap`), `src/world/events.js` (stairs, chests `chest_${tier}`,
   `rollChest`, fonts, the rest flow), `src/scenes/field.js` (warps, autosave at line ~297, the HUD draw order,
   H2's Aim line, H3's run seam), `src/scenes/gameover.js` and how a wipe reaches it, `src/scenes/battle.js`
   (rewards, the `ko` op where H3 hooked), `src/core/save.js` (`checkSlot`, `list`, `exists`), `src/main.js`
   (`startPackWatch`, `?pack=` forcing), `src/game/packs.js` (`forcePack`, `ensurePack`), `src/data/x1/index.js`
   (how a pack registers maps, scenes and hub edits), `tools/maps/mapcheck.mjs` (`CHEST_TIERS`).
5. `qa/autoplay.py` (how the bot drives the game through `LQ_DEBUG`; you do not edit it, C3 does) and
   `qa/maps/x1_baseline/force_on.mjs` (forcing a pack on in Node).

## Owned paths (create or modify nothing else)
- `src/data/cave/world.js` (new: the glue), `src/data/cave/index.js` (add the imports of `world.js`, `bands345.js`
  and `story.js`, each guarded the way X1 guards a missing module), `src/data/cave/live.js` (leave `CAVE_LIVE`
  false; add `caveForced()` reading `?cave=1` if `packs.js` forcing is not enough).
- `src/game/packs.js`: the `cave` entry's `touches` only. `src/data/maps/library.js`: the trapdoor event and its
  locked inspect only (mark `stacks_trapdoor`).
- `src/world/events.js`: chest tiers `red` and `blue`, the stairs hook into generated floors, the font and save
  refusal inside a run. `src/world/maps.js`: only if `loadMap` needs to generate a `cave_bN` on demand.
- `src/core/save.js`: `SUSPEND_SLOTS` per the cave.js header. `src/scenes/field.js`: autosave target while in a
  run, the floor tag, the wipe route into the death flow, the two field props (`cave_move_plus`, `stairs_sense`).
- `src/scenes/gameover.js` (the in-run branch), `src/scenes/battle.js` (the `second_life` rise: one call where a
  member would fall; `first_blow_true`: one call), `src/battle/rules.js` (only if `first_blow_true` cannot be done
  in the scene; one line), `src/ui/screens/items.js` (the Bookmark's `use: 'cave_bank'`), `src/scenes/menu.js`
  (Quit inside a run asks once and counts as a death; Save refused inside a run).
- `tools/maps/mapcheck.mjs` (`CHEST_TIERS` red and blue). `qa/cave/world_*.test.mjs`, `qa/cave/world_headless.py`,
  `qa/cave/out/world_*` (name your files; the folder is not git-ignored).
Not owned: `gen.js`, `foes.js`, `loot.js`, `items.js`, `cave.js`, the C2-sprites-boss files, `story.js`, `text.js`,
`title.js`, `journal.js`, story scripts, `qa/autoplay.py`, the ratchet and precache tests.

## Contracts with the two agents beside you (code to these; fall back when a file is missing)
- C2-story-ui's `src/data/cave/story.js` exports scenes in the `ep1.js` shape and a `SCENE_CONDITIONS`:
  `stacks_locked` (trapdoor inspect before `ep1_complete`), `stacks_intro` (first talk, sets `deep_stacks_open`),
  `stacks_enter` (asks, then calls your `beginReading`), `stacks_return` (after bank, die, quit or clear; reads
  your `lastExit`), `stacks_no_save`, `binder_intro` (before the fight), `binder_cleared`. Its `text.js` exports
  `PLAQUES` (`plaque_b10` to `plaque_b90`, and `plaque_hall`) and `STACKS_TEXT` (the toast and card strings:
  `close`, `bank`, `quit_ask`, `save_refused`, `floor_tag`). Fallbacks: one plain line each.
- C2-sprites-boss: atlas `assets/sprites/cave_props` with `chest_red`, `chest_blue` (closed and open), `plaque`,
  `trapdoor`; `cave_bosses` with the Binder's frames; maps `cave_b100.js` (marks `arrival` at `[12, 18]`,
  `binder`, `quill_chest`) and `cave_landing0.js` (marks `archivist`, `plaque`; `stairs_down` to `cave_b1`,
  `stairs_up` to the library's `stacks_trapdoor`); `bands345.js` registering bands three to five. Fallbacks: wood
  and gold chest sprites, the Archivore's frames, and a generated B100 placeholder only in tests.

## Deliverables (`src/data/cave/world.js` unless said otherwise)
1. **Pack wiring.** `register()` loads `world.js`, `bands345.js`, `story.js` behind guards. `touches: ['library']`
   only if the trapdoor needs the pack present; otherwise keep `[]` and let the trapdoor's event call
   `ensurePack('cave')` before it warps. `?cave=1` (or `?pack=cave`) forces the pack on for tests while
   `CAVE_LIVE` is false; document which.
2. **Entry and exit.** `beginReading(engine, game, { seed })`: `cave.enter`, generate B1 and B2 (3), warp to B1's
   arrival, floor tag on, suspend save written. `endReading(engine, game, how)` with `how` in `bank | die | quit |
   clear`: the matching `cave.*` call, delete the suspend save, warp to `cave_landing0` at `archivist`, set
   `game.cave.lastExit = { how, floor, blues, lost }` for the story scene, and play `stacks_return`.
3. **Floors.** `prepareFloor(game, N)`: `registerMap(generateFloor(seed, N, opts))` with `opts.foes` from
   `floorEncounters(seed, N)` (register them), `opts.chests` from `blueChestDue(rng, N, run.lastBlueFloor,
   vaultIds)` and the red count, `opts.plaque` from `PLAQUES`, `opts.nextArrival(99)` = B100's arrival; also
   prepare N+1 (or B100 when N is 99: the hand-made map). The stairs event into `cave_bN` calls `prepareFloor`
   before the warp (hook in `events.js` or `field.js`), then `cave.descend`, `setLootFloor(N)`, the suspend save
   on arrival. Landings: no foes (the generator does it), the plaque is a `sign` with the landing text.
4. **Chests.** Tiers `red` and `blue` in `events.js` and `mapcheck`: sprites per the atlas; opening red rolls
   `rollRedChest(rng, floor, vaultIds, { props: wornProps(party), landing, holdsBookmark })` and gives items, gold,
   the Bookmark (`foundBookmark`); blue rolls `rollBlueChest` and `foundBlue` with the legendary jingle; both
   `noteChest` and mark opened (per run: `enter` already clears `cave_b*` opened keys). The RNG is seeded from
   `(run.seed, floor, chestId)` so a reload cannot reroll a chest.
5. **Foes.** Wins inside a run call `noteKills`. `second_life`: where a member would fall in battle, if
   `riseAvailable(game, id)`, `takeRise` and set HP to the fraction, one short toast. `first_blow_true`: the
   wearer's first Attack in a fight cannot miss (one line in the scene or rules; say where).
6. **The Bookmark.** Items screen: `use: 'cave_bank'` asks "Close the book here?" then `endReading('bank')`;
   outside a run the use is refused with one line. Landings guarantee a Bookmark through the loot roll
   (`holdsBookmark`), not here.
7. **Death and Quit.** A wipe while `inRun`: never the game over scene; a black card with `STACKS_TEXT.close`
   ("The Stacks close."), then `endReading('die')`. Menu Quit inside a run: one confirm (`quit_ask`), then
   `endReading('quit')`. Both must restore the party before any scene runs (cave.js already orders it; do not
   reorder).
8. **Saves.** `SUSPEND_SLOTS` in `core/save.js`; the field autosave targets `'cave'` while `inRun` and never slot 0;
   the suspend save is written on every floor arrival with `suspendMeta`; deleted on every exit. Manual Save
   inside a run is refused with `save_refused`. Loading the suspend save (`resumeInfo`) regenerates the floor
   from `(seed, floor)` and lands at the arrival (the title row that offers it is C2-story-ui's; expose
   `resumeReading(engine, game)` for it).
9. **HUD.** The floor tag ("B23") top centre, permanent inside a run, drawn where the Aim line draws (the Aim
   line stays off inside the Stacks). `LQ_DEBUG.state().cave = { floor, seed, blues, bookmarks, vault, record }`
   for the bot and the tests.
10. **Field props.** `cave_move_plus`: walk and run 15% faster inside a run. `stairs_sense`: a small arrow beside
    the floor tag pointing toward the stairs room while the wearer is in the party.

## Tests
`qa/cave/world_*.test.mjs` (Node): `prepareFloor` registers N and N+1 and their encounters; chest rolls are
deterministic per `(seed, floor, chestId)`; `endReading` for each `how` leaves the game as `cave.js` promises;
the save slot rules. `qa/cave/world_headless.py` (Playwright, desktop and phone, `?cave=1&debug=1`): a game with
`ep1_complete` via `LQ_DEBUG.newGame`, walk to the trapdoor, enter (drive the story scene's choice; with the
fallback scene if `story.js` is absent), floor tag reads B1, party is level 1 with empty slots, open a red chest,
descend to B3 (walk to the stairs using the autoplay grid helper `qa/autoplay_grid.mjs`), give a Bookmark through
`LQ_DEBUG`, use it from the menu, confirm the party is restored and the landing scene plays; a second run: wipe
on B1 (set HP to 1, fight), see the card, confirm the vault is intact; a third: reload the suspend save at B2.
Zero console errors.

## Verify before you report
`node qa/run.mjs cave world saves pwa core` (a `h4_*` or `art_*` failure is another agent's file; say so);
`python tools/pwa/build_pwa.py` then `node qa/run.mjs pwa` green: the precache may grow only by the seams you
touched (measure the gzipped delta of `events.js`, `field.js`, `battle.js`, `menu.js`, `items.js`, `save.js`,
`gameover.js`; keep it under 3 KB) and the cave pack stays under its 0.8 MB cap (`packs.test`); the headless rig
clean on desktop and phone; `python qa/autoplay.py` (desktop, Episode 1) still clears, proving the base game is
untouched when the pack is off. No em dash. Bound every command.

## Report (last message, under 450 words)
The glue API (`beginReading`, `endReading`, `prepareFloor`, `resumeReading`), every seam (file and line), the
fallbacks you used and which contracts the other agents must now meet exactly, the gzipped delta of the seams
and the pack size, the headless rig's log path, test counts, known gaps, and what C3-sim-bot needs to drive a
descent (the `LQ_DEBUG` surface).
