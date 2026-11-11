# E7-pack: the ep7 pack, the switch, the quick start, the core seams (wave 7a, beside E7-story and E7-battle)

Episode 7 lives entirely in a lazy pack, exactly as Episode 6 does. You build the pack's skeleton and the only core-file
changes Episode 7 makes, and you pay for every core byte by trimming core JS in the same change.

## Inputs (read first, in this order)

The repo's `AGENTS.md`, `docs/briefs/COMMON.md`, `DESIGN.md`, `docs/EPISODE7_PLAN.md` sections 0, 0.1, 3, 10, 11 and 13
(your contract), `docs/PWA_PACKS.md` (the ep4 to ep6 sections above all), `src/game/packs.js`, the whole Episode 6
skeleton you are copying (`src/data/ep6/index.js`, `maps.js`, `hooks.js`, `start.js`, `title.js`), `src/game/episodes.js`,
`src/scenes/title.js` (the Episode 6 hook), `src/game/packFallback.js`, `src/game/story.js` (`creditsPending`,
`CREDITS_HANDOFF`), `qa/pwa/budget_ratchet.json`, `qa/pwa/packs.test.mjs`, `qa/pwa/precache.test.mjs`, and PROGRESS
2026-11-10 (PR #57's faster loading: what the side packs now wait for).

## Owned paths

`src/data/ep7/index.js`, `src/data/ep7/start.js`, `src/data/ep7/maps.js`, `src/data/ep7/hooks.js`; the core seams of plan
13.2 in `src/game/packs.js`, `src/game/episodes.js`, `src/scenes/title.js` (one line), `src/game/packFallback.js` (one
regex), plus the comment and dead-code trims in precached core JS that pay for them; `tools/pwa/build_pwa.py`
(`LAZY_PREFIXES` only), `qa/pwa/budget_ratchet.json` (`packCapsMB.ep7` only), `qa/pwa/packs.test.mjs` (the fixed-caps
line only), `qa/pwa/precache.test.mjs` (the ep7 fragment), `qa/core/ep7_*`, `qa/saves/ep7_*`, `qa/ui/ep7_*`,
`docs/PWA_PACKS.md` (an "ep7 pack" section). Nothing else; never an `ep6` file.

## Outputs (items, in order)

1. **Measure first.** `node qa/integrate/x1_budget.mjs` and `node qa/pwa/precache.test.mjs`; write the pre-tap and initial
   bytes down (plan 13.1 has 2026-11-10's: 2,443,421 pre-tap of 2,453,667; 6,662,933 initial of 6,689,914). Your report
   gives before and after, gzipped.
2. **The four core seams** of plan 13.2, exactly as listed: the `ep7` table entry (`touches: ['ep6_zl_inn',
   'ep6_zephyr']`, `wanted` on `ep6_complete` or `ep7_started`), `EP7_LIVE = false`, the title hook line (await ep6, then
   ep7, then `LQ_EP7.title`), and the `ep[4567]_` landing regex. Then **trim** comments and dead code in precached core JS
   until the pre-tap load is at or below step 1's number. Never trim behavior; rerun the suites.
3. **The pack skeleton** `src/data/ep7/index.js`: the ep6 entry pattern with ORDER `flags, enemies, items, skills, loot,
   encounters, rime, shops, ai, npcs, quests, text, story, ledger, audio, world, pages, maps, hooks, start, scene` (`title`
   loaded on first use by `hooks.js`), missing modules skipped, `register(engine)` idempotent, **awaiting the ep6 pack's
   registration first** (which awaits ep5, which awaits ep4); it merges `audio.js` into `engine.audio.manifest` (never
   overwriting an id) on every path, the quick start included.
   `maps.js`: awaits the ep6 pack (plan 3.3, the order trap), then registers every `src/data/maps/ep7_*.js` module by a
   guarded list (the 11 names of plan 2.1) and the patches from `ep7_patches.js` (`withEp7Wake`, `withNorthBerth`; identity
   if the file is missing). Start every pack's fetch at once and order only registration; measure the cold and warm time to
   the inn on the phone profile (five chained packs now, with ep3).
   `hooks.js`: `CREDITS_HANDOFF[7]`, the live end card for 6 (`END_CARD_EP6_LIVE`, "Episode 7 begins in the morning."),
   `QUEST_EXT` push (guarded until E7-story's quest exists), `globalThis.LQ_EP7` (`title`, `offer`, `start`),
   `LQ_DEBUG.newGameEp7`.
4. **`start.js`**: `EP7_START` and `newGameEp7(name, { slot })` per plan 10.4, built on `pickRunSlot`, awaiting ep6 (and
   its chain) then ep7, and both the ep6 and ep7 audio fragments, before the fade in. Use the simulator's `ep7_white_road`
   loadout if it exists, else the `ep6_obs_eyrie` loadout plus the Scribe's Quill and the Kestrel's Wings; say which. The
   quick start holds `white_road_letter`.
5. **Build tool and budget files:** `LAZY_PREFIXES` gains `assets/audio/sfx/ep7_` and `assets/audio/ambience/ep7_`;
   `packCapsMB.ep7 = 1.0`; the caps `deepEqual` in `packs.test.mjs` gains `ep7: 1.0`; `precache.test.mjs` reads
   `src/data/ep7/audio.js` for sfx ids referenced under `src/data/ep7/`.
6. **Tests** (node, fake storage): plan 10.8 cases that need no maps or scenes; the rest pending with a clear skip reason
   E7-integrate turns on; the pack table entry; the order trap (patched only with ep6 and ep7); `?ep=7` hidden while
   `EP7_MAPS_LISTED` is false; nothing fetched while `EP7_LIVE` is false; an Episode 5 save (no `ep6_complete`) never wants
   the pack; the pack-failure landing (an `ep7_vault_f2` save with `src/data/ep7/**` unreachable keeps its slot's map after a
   map change, and the field never autosaves on `_testtown`); the quick start resolves every ep6 and ep7 audio id.
7. `docs/PWA_PACKS.md`: an "ep7 pack" section (chain, caps, timings).

## Done when

The four seams are in, the pre-tap load is at or below the step-1 measure, `node qa/run.mjs core saves ui pwa battle` is
green, `simulate.mjs --check` is unchanged by your changes, an Episode 6 credits save still loads, autosaves to its own slot
and shows the unchanged Episode 6 end card with `EP7_LIVE` false, and every test of item 6 exists (passing or pending with
its reason).

## Tests to run

`node qa/run.mjs core saves ui pwa battle`; `node qa/pwa/precache.test.mjs`; `node qa/pwa/packs.test.mjs`;
`node tools/sim/simulate.mjs --check` (before and after: same numbers); `python tools/pwa/build_pwa.py --check`.

## Traps

- **The order trap.** `registerMap` overwrites by id; patching `ep6_zl_inn` or `ep6_zephyr` before the ep6 pack has
  registered them loses the patch silently. Await ep6 first; test both orders.
- **The cold chain.** If the cold entry to the inn on the phone profile is over 8 s, do not edit `packs.js` beyond your
  seam to fix it: PLAYTEST_REVIEW_8 item 8's fix touches a hot file and waits for Scott's or Stephen's word. Report the
  number and the fix.
- **Old saves.** Nothing may overwrite another run's slot; never autosave on `_testtown` or while a `packReturn` is
  pending; the quick start never offers Replace.
- **The quick start must await every pack and audio fragment** it needs before the fade in (PLAYTEST_REVIEW_6 fix 3: a
  party once heard no Episode 4 sound). Act I plays `zephyr`, which lives in the ep6 fragment.
- **`next/sw.js` is generated.** Only `python tools/pwa/build_pwa.py` writes it, and only from this LF worktree; never
  hand-merge it.
- **`assets/ep7_manifest.json` is generated** (sync-manifest); it must be `git add`ed at each wave close. You do not run
  git: say in your report that the orchestrator must add it.
- **Hot files** (`packs.js`, `episodes.js` and the title hook) are yours alone this wave; no other agent opens a core file.
- House rules: no git; LF endings (count CR bytes before and after every edit: zero); no em dashes; stay in owned paths;
  bound every command; one browser job at a time; rerun a flaky timeout alone (`x1_gate`, `x1_wild`, `walks`,
  `abilities_walks`, `qa/battle/sim.test.mjs`); never edit `assets/audio/manifest.json`, `src/data/ep6/**` or
  `src/data/maps/ep6_*.js`; restore `qa/world/out` if a suite rewrites it; dev scenes stay lazy and out of the precache.

## Report (under 400 words)

The seams with gzipped bytes in and out, the exact exports (`EP7_LIVE`, `newGameEp7`, `EP7_START`, `LQ_EP7`), the pack
chain timings (cold and warm, phone), test counts, what E7-integrate must switch on, and the manifest note for the
orchestrator.
