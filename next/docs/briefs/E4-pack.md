# E4-pack: the ep4 pack, the switch, the quick start, the core seams (wave 4a, beside E4-story and E4-battle)

Episode 4 lives entirely in a lazy pack. You build the pack's skeleton and the only core-file changes Episode 4 makes,
and you pay for every core byte by trimming core JS in the same change. Read `docs/briefs/COMMON.md`, `DESIGN.md`,
`docs/EPISODE4_PLAN.md` sections 0, 3, 10, 11 and 13 (your contract), `docs/PWA_PACKS.md`, `src/game/packs.js`,
`src/data/x1/index.js` (the entry pattern), `src/data/maps/ep3/index.js` and `hollow_gate.js` (the patch pattern),
`src/game/episodes.js`, `src/scenes/title.js` (the Fine Print hook, `startEpisode3`, the slot picker),
`src/game/state.js` (`EP3_START`, `newGameEp3`), `src/game/story.js` (`creditsPending`, `CREDITS_HANDOFF`).

## Items, in order

1. **Measure first.** `node qa/integrate/x1_budget.mjs` and `node qa/pwa/precache.test.mjs`; write the pre-tap bytes
   down. Your report gives before and after, gzipped.
2. **The core seams** of plan 13.2, exactly as listed (packs.js entry with prefix `ep4_` and `register(engine)`,
   `EP4_LIVE = false`, the title hook line, `creditsPending` from the table with a `flag` per entry, `QUEST_EXT` in
   `mainQuestFor`, the Heat unit's `heatQuench`/`heatWord`/`heatSfx`, `export const SCRIPTS`, `POLICY_EXT` checked first
   in `competentPolicy`, `export const BACKDROPS`). Then **trim** comments and dead code in precached core JS until the
   pre-tap load is at or below step 1's number. Never trim behavior; rerun the suites.
3. **The pack skeleton** `src/data/ep4/index.js`: the X1 entry pattern with ORDER `flags, enemies, items, skills, loot,
   encounters, shops, ai, npcs, quests, text, story, ledger, audio, world, maps, hooks, start, title`, missing modules
   skipped, `register(engine)` idempotent; it merges `audio.js` into `engine.audio.manifest` (never overwriting an id).
   `maps.js`: awaits the ep3 pack's `register()` first (plan 3.3, the order trap), then registers every
   `src/data/maps/ep4_*.js` module by a guarded list (the 10 names of plan 2.1) and the patches from
   `ep4_patches.js` (`withEastRoad`, `withEp4Wake`; stub them as identity if the file is missing).
   `hooks.js`: `CREDITS_HANDOFF[4]`, the live end card for 3 (`END_CARD_EP3_LIVE`, "Episode 4 begins in the morning."),
   `QUEST_EXT` push (guarded until E4-story's quest exists), `LQ_DEBUG.newGameEp4`.
4. **`start.js`**: `EP4_START` and `newGameEp4(name, { slot })` per plan 10.4, built on `pickRunSlot`. Use the
   simulator's `ep4_flood_road` loadout if it exists, else `foundry_heart` plus the First Bell Hammer and Ember Heart;
   say which.
5. **Build tool and budget files:** `LAZY_PREFIXES` gains `assets/audio/sfx/ep4_` and `assets/audio/ambience/ep4_`;
   `packCapsMB.ep4 = 1.0`; `precache.test.mjs` reads `src/data/ep4/audio.js` for ids referenced under `src/data/ep4/`.
6. **Tests** (node, fake storage): plan 10.7 cases that need no maps or scenes; the rest pending with a clear skip
   reason E4-integrate turns on; the pack table entry; the order trap (patched only with both packs); `?ep=4` hidden
   while `EP4_MAPS_LISTED` is false; nothing fetched while `EP4_LIVE` is false.
7. `docs/PWA_PACKS.md`: an "ep4 pack" section.

## Rules

- Owned paths: plan 11.1, row E4-pack. Not story, battle data, maps, art, audio, PLAN.md, PROGRESS.md.
- No git. No em dashes. Every subprocess gets a timeout; one browser job at a time (this machine runs Scott's loops).
- Verify: `node qa/run.mjs core saves ui pwa`; `python tools/pwa/build_pwa.py --check`; a headless check that an
  Episode 3 credits save still loads, autosaves to its own slot and shows the unchanged Episode 3 end card.
- Report under 400 words: the seams with gzipped bytes in and out, the exact exports (`EP4_LIVE`, `newGameEp4`,
  `EP4_START`, `QUEST_EXT`, `POLICY_EXT`, `SCRIPTS`, `BACKDROPS`), test counts, what E4-integrate must switch on.
