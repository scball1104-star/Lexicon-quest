# E5-pack: the ep5 pack, the switch, the quick start, the core seams (wave 5a, beside E5-story and E5-battle)

Episode 5 lives entirely in a lazy pack, exactly as Episode 4 does. You build the pack's skeleton and the only core-file
changes Episode 5 makes, and you pay for every core byte by trimming core JS in the same change. Read
`docs/briefs/COMMON.md`, `DESIGN.md`, `docs/EPISODE5_PLAN.md` sections 0, 0.1, 3, 10, 11 and 13 (your contract),
`docs/PWA_PACKS.md` (the ep4 section above all), `src/game/packs.js`, the whole Episode 4 skeleton you are copying
(`src/data/ep4/index.js`, `maps.js`, `hooks.js`, `start.js`, `title.js`), `src/game/episodes.js`, `src/scenes/title.js`
(the Episode 4 hook), `src/game/packFallback.js`, `src/game/story.js` (`creditsPending`, `CREDITS_HANDOFF`), and
`src/battle/rules.js` around the type check (`weak:` near line 411), `addMod` and `endTurn`.

## Items, in order

1. **Measure first.** `node qa/integrate/x1_budget.mjs` and `node qa/pwa/precache.test.mjs`; write the pre-tap bytes
   down. Your report gives before and after, gzipped.
2. **The core seams** of plan 13.2, exactly as listed: the `ep5` table entry (`touches: ['ep4_vw_inn', 'ep4_valewyn']`),
   `EP5_LIVE = false`, the title hook line, the `RULE_EXT` seam in `rules.js` (export, `start` after setup, `afterAction`
   in `endTurn`, the per-hit `exposed` weakness rule that never calls `learnTypes`; a `mod` call point only if `addMod`
   cannot be cleared by source: say which), and the `ep[45]_` landing regex. Then **trim** comments and dead code in
   precached core JS until the pre-tap load is at or below step 1's number. Never trim behavior; rerun the suites.
3. **The pack skeleton** `src/data/ep5/index.js`: the ep4 entry pattern with ORDER `flags, enemies, items, skills, loot,
   encounters, sky, shops, ai, npcs, quests, text, story, ledger, audio, world, pages, maps, hooks, start, scene` (`title`
   loaded on first use by `hooks.js`), missing modules skipped, `register(engine)` idempotent, **awaiting the ep4 pack's
   registration first** (Episode 5's story uses Valewyn NPC ids and Episode 4's maps); it merges `audio.js` into
   `engine.audio.manifest` (never overwriting an id) on every path, the quick start included.
   `maps.js`: awaits the ep4 pack (plan 3.3, the order trap), then registers every `src/data/maps/ep5_*.js` module by a
   guarded list (the 11 names of plan 2.1) and the patches from `ep5_patches.js` (`withEp5Wake`, `withShipBerth`; identity
   if the file is missing). Start every pack's fetch at once and order only registration; measure the cold and warm time
   to the inn on the phone profile.
   `hooks.js`: `CREDITS_HANDOFF[5]`, the live end card for 4 (`END_CARD_EP4_LIVE`, "Episode 5 begins in the morning."),
   `QUEST_EXT` push (guarded until E5-story's quest exists), `globalThis.LQ_EP5` (`title`, `offer`, `start`),
   `LQ_DEBUG.newGameEp5`.
4. **`start.js`**: `EP5_START` and `newGameEp5(name, { slot })` per plan 10.4, built on `pickRunSlot`, awaiting ep4 then
   ep5 and both audio fragments before the fade in. Use the simulator's `ep5_ship` loadout if it exists, else the
   `ep4_keep_crown` loadout plus the Broken Seal and the Tidewarden's Trident; say which.
5. **Build tool and budget files:** `LAZY_PREFIXES` gains `assets/audio/sfx/ep5_` and `assets/audio/ambience/ep5_`;
   `packCapsMB.ep5 = 1.0`; `precache.test.mjs` reads `src/data/ep5/audio.js` for ids referenced under `src/data/ep5/`.
6. **Tests** (node, fake storage): plan 10.8 cases that need no maps or scenes; the rest pending with a clear skip reason
   E5-integrate turns on; the pack table entry; the order trap (patched only with ep4 and ep5); `?ep=5` hidden while
   `EP5_MAPS_LISTED` is false; nothing fetched while `EP5_LIVE` is false; `RULE_EXT` empty leaves every Episode 1 to 4
   battle bit-identical (run `simulate.mjs --check` before and after the seam: same numbers); the pack-failure landing
   (an `ep5_lab_f2` save with `src/data/ep5/**` unreachable keeps its slot's map after a map change); the quick start
   resolves every ep4 and ep5 audio id.
7. `docs/PWA_PACKS.md`: an "ep5 pack" section.

## Rules

- Owned paths: plan 11.1, row E5-pack. Not story, battle data, maps, art, audio, PLAN.md, PROGRESS.md, any `ep4` file.
- No git. No em dashes. Every subprocess gets a timeout; one browser job at a time (this machine runs Scott's loops).
- Verify: `node qa/run.mjs core saves ui pwa battle`; `node tools/sim/simulate.mjs --check` unchanged by the seam;
  `python tools/pwa/build_pwa.py --check`; a headless check that an Episode 4 credits save still loads, autosaves to its
  own slot and shows the unchanged Episode 4 end card.
- Report under 400 words: the seams with gzipped bytes in and out, the exact exports (`EP5_LIVE`, `newGameEp5`,
  `EP5_START`, `RULE_EXT` and its hook signatures, `LQ_EP5`), the pack chain timings, test counts, what E5-integrate must
  switch on.
