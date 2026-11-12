# E8-pack: the ep8 pack, the switch, the quick start, the core seams (wave 8a, beside E8-story and E8-battle)

Episode 8 lives entirely in a lazy pack, exactly as Episode 7 does. You build the pack's skeleton and the only core-file
changes Episode 8 makes (five one-line seams), and you pay for every core byte by trimming core JS in the same change.

## Inputs (read first, in this order)

The repo's `AGENTS.md`, `docs/briefs/COMMON.md`, `DESIGN.md`, `docs/EPISODE8_PLAN.md` sections 0, 0.1, 3, 10, 11 and 13 (your
contract), `docs/story/EPISODE8.md` section 0 (what Episode 8 depends on in Episode 7), `docs/PWA_PACKS.md` (the ep4 to ep7
sections), `src/game/packs.js`, the whole Episode 7 skeleton you are copying (`src/data/ep7/index.js`, `maps.js`, `hooks.js`,
`start.js`, `title.js`), `src/game/episodes.js`, `src/scenes/title.js` (the Episode 7 hook), `src/game/packFallback.js`,
`src/game/story.js` (`creditsPending`, `CREDITS_HANDOFF`), `src/battle/rules.js` (the commands builder, around the
`out.push({ id: 'attack' ...` block), `docs/BATTLE.md` 14.8 (the wished `commands` call point), `qa/pwa/budget_ratchet.json`,
`qa/pwa/packs.test.mjs`, `qa/pwa/precache.test.mjs`, and CRITIQUE_9 / PLAYTEST_REVIEW_9 if they exist.

**Precondition:** Episode 7 is built and merged in `overhaul`. If `src/data/ep7/` does not exist, stop and report.

## Owned paths

`src/data/ep8/index.js`, `src/data/ep8/start.js`, `src/data/ep8/maps.js`, `src/data/ep8/hooks.js`; the core seams of plan
13.2 in `src/game/packs.js`, `src/game/episodes.js`, `src/scenes/title.js` (one line), `src/game/packFallback.js` (one regex),
`src/battle/rules.js` (one call point), plus the comment and dead-code trims in precached core JS that pay for them;
`tools/pwa/build_pwa.py` (`LAZY_PREFIXES` only), `qa/pwa/budget_ratchet.json` (`packCapsMB.ep8` only),
`qa/pwa/packs.test.mjs` (the fixed-caps line only), `qa/pwa/precache.test.mjs` (the ep8 fragment), `qa/core/ep8_*`,
`qa/saves/ep8_*`, `qa/ui/ep8_*`, `docs/PWA_PACKS.md` (an "ep8 pack" section). Never an `ep7` file.

## Outputs (items, in order)

1. **Measure first.** `node qa/integrate/x1_budget.mjs` and `node qa/pwa/precache.test.mjs`; write the pre-tap and initial bytes
   down. Measure the cold and warm entry to Episode 7's Keeper's Watch (`ep7_ph_watch`, 2026-11-11) on the phone profile (`fieldlab.GPU_ARGS`): this is the evidence
   for plan 13.5. Your report gives before and after, gzipped.
2. **The five core seams** of plan 13.2, exactly as listed: the `ep8` table entry (`touches: ['ep7_ph_watch', 'ep7_stillheart']`,
   `wanted` on `ep7_complete` or `ep8_started`), `EP8_LIVE = false`, the title hook (await ep7, then ep8, then `LQ_EP8.title`),
   the `ep[45678]_` landing regex, and `if (RULE_EXT.commands) RULE_EXT.commands(state, u, out);` at the end of the commands
   builder in `rules.js` (with `RULE_EXT.commands` documented beside `start` and `afterAction`). Then **trim** until the pre-tap
   load is at or below step 1's number. Never trim behavior; rerun the suites.
3. **The pack skeleton** `src/data/ep8/index.js`: the ep7 entry pattern with ORDER `flags, enemies, items, skills, loot,
   encounters, erasure, shops, ai, npcs, quests, text, credits, story, ledger, audio, world, pages, maps, hooks, start, scene`
   (`title` loaded on first use by `hooks.js`), missing modules skipped, `register(engine)` idempotent, **awaiting the ep7
   pack's registration first** (which awaits ep6, ep5, ep4); it merges `audio.js` into `engine.audio.manifest` (never
   overwriting an id) on every path, the quick start included.
   `maps.js`: awaits ep7 (the order trap), then registers every `src/data/maps/ep8_*.js` module by a guarded list (the 11 of
   plan 2.1) and the patches from `ep8_patches.js` (`withEp8Wake`, `withStairDoor`; identity if missing). Start every fetch at
   once; order only registration.
   `hooks.js`: `CREDITS_HANDOFF[8]` (plan 5.3: `hero_home`, `bed`, `credits8_rolled`, music `the_last_word`), the live end card
   for 7 (`END_CARD_EP7_LIVE`, "Episode 8 begins in the morning."), `QUEST_EXT` push (guarded until E8-story's quest exists),
   `globalThis.LQ_EP8` (`title`, `offer`, `start`), `LQ_DEBUG.newGameEp8`.
4. **`start.js`**: `EP8_START` and `newGameEp8(name, { slot })` per plan 10.4, on `pickRunSlot`, awaiting ep4 to ep7 then ep8,
   and the ep6, ep7 and ep8 audio fragments, before the fade in. Use the simulator's `ep8_stair` loadout if it exists, else
   `ep7_stillheart`'s plus the Stillheart Shard; say which. Read `EP7_START` and the built Episode 7 ending to set the flags.
5. **Build tool and budget files:** `LAZY_PREFIXES` gains `assets/audio/sfx/ep8_` and `assets/audio/ambience/ep8_`;
   `packCapsMB.ep8 = 1.0`; the caps `deepEqual` gains `ep8: 1.0`; `precache.test.mjs` reads `src/data/ep8/audio.js`.
6. **Tests** (node, fake storage): plan 10.9's cases that need no maps or scenes (the rest pending with a skip reason
   E8-integrate turns on), the pack table entry, the order trap (patched only with ep7 and ep8), `?ep=8` hidden while
   `EP8_MAPS_LISTED` is false, nothing fetched while `EP8_LIVE` is false, an Episode 6 save never wants the pack, the
   pack-failure landing, the quick start resolving every ep6, ep7 and ep8 audio id, **`RULE_EXT.commands` is called once per
   commands build and a battle with no hook builds exactly the same commands as before** (a deep-equal against Episodes 1 to 7
   fixtures), and **the ended save** (plan 10.8: an `ep8_complete` fixture wakes at `hero_home` `bed` and writes only its slot).
7. `docs/PWA_PACKS.md`: an "ep8 pack" section (chain, caps, timings).

## Done when

The five seams are in, the pre-tap load is at or below the step-1 measure, `node qa/run.mjs core saves ui pwa battle` is green,
`simulate.mjs --check` is unchanged by your changes (same numbers before and after), an Episode 7 credits save still loads,
autosaves to its own slot and shows the unchanged Episode 7 end card with `EP8_LIVE` false, and every item-6 test exists.

## Tests to run

`node qa/run.mjs core saves ui pwa battle`; `node qa/pwa/precache.test.mjs`; `node qa/pwa/packs.test.mjs`;
`node tools/sim/simulate.mjs --check` (before and after); `python tools/pwa/build_pwa.py --check`.

## Traps

- **Hot files.** `rules.js` and `packs.js` are on AGENTS.md's hot list: the orchestrator has said so in issue #68 before your
  wave; if not, stop and ask. Your seam in `rules.js` is one line, nothing else.
- **The order trap.** Patching `ep7_ph_watch` or `ep7_stillheart` before ep7 registers them loses the patch silently. Test both
  orders.
- **The cold chain.** Do not fix it beyond your seam: PLAYTEST_REVIEW_8 item 8's fix waits for Scott's or Stephen's word (plan
  13.5). Report the number.
- **Old saves.** Nothing overwrites another run's slot; never autosave on `_testtown` or while a `packReturn` is pending; no
  Replace.
- **Generated files.** `next/sw.js` (only `build_pwa.py`, from this LF worktree) and `assets/ep8_manifest.json` (the
  orchestrator `git add`s it).
- House rules: no git; LF endings (count CR bytes before and after: zero); no em dashes; owned paths only; bound every command;
  rerun a flaky timeout alone; never edit `assets/audio/manifest.json`, `src/data/ep7/**` or `src/data/maps/ep7_*.js`.

## Report (under 400 words)

The seams with gzipped bytes in and out, the exports (`EP8_LIVE`, `newGameEp8`, `EP8_START`, `LQ_EP8`, `RULE_EXT.commands`),
the chain timings (cold and warm, phone), test counts, what E8-integrate must switch on, and the manifest note.
