# E6-pack: the ep6 pack, the switch, the quick start, the core seams (wave 6a, beside E6-story and E6-battle)

Episode 6 lives entirely in a lazy pack, exactly as Episode 5 does. You build the pack's skeleton and the only core-file
changes Episode 6 makes, and you pay for every core byte by trimming core JS in the same change.

## Inputs (read first, in this order)

The repo's `AGENTS.md`, `docs/briefs/COMMON.md`, `DESIGN.md`, `docs/EPISODE6_PLAN.md` sections 0, 0.1, 3, 10, 11 and 13
(your contract), `docs/PWA_PACKS.md` (the ep4 and ep5 sections above all), `src/game/packs.js`, the whole Episode 5
skeleton you are copying (`src/data/ep5/index.js`, `maps.js`, `hooks.js`, `start.js`, `title.js`), `src/game/episodes.js`,
`src/scenes/title.js` (the Episode 5 hook, line 66), `src/game/packFallback.js`, `src/game/story.js` (`creditsPending`,
`CREDITS_HANDOFF`), `qa/pwa/budget_ratchet.json`, `qa/pwa/packs.test.mjs`, `qa/pwa/precache.test.mjs`.

## Owned paths

`src/data/ep6/index.js`, `src/data/ep6/start.js`, `src/data/ep6/maps.js`, `src/data/ep6/hooks.js`; the core seams of plan
13.2 in `src/game/packs.js`, `src/game/episodes.js`, `src/scenes/title.js` (one line), `src/game/packFallback.js` (one
regex), plus the comment and dead-code trims in precached core JS that pay for them; `tools/pwa/build_pwa.py`
(`LAZY_PREFIXES` only), `qa/pwa/budget_ratchet.json` (`packCapsMB.ep6` only), `qa/pwa/packs.test.mjs` (the fixed-caps
line only), `qa/pwa/precache.test.mjs` (the ep6 fragment), `qa/core/ep6_*`, `qa/saves/ep6_*`, `qa/ui/ep6_*`,
`docs/PWA_PACKS.md` (an "ep6 pack" section). Nothing else; never an `ep5` file.

## Outputs (items, in order)

1. **Measure first.** `node qa/integrate/x1_budget.mjs` and `node qa/pwa/precache.test.mjs`; write the pre-tap and initial
   bytes down (plan 13.1 has 2026-11-09's: 2,443,506 pre-tap of 2,453,667; 6,663,018 initial of 6,689,914). Your report
   gives before and after, gzipped.
2. **The four core seams** of plan 13.2, exactly as listed: the `ep6` table entry (`touches: ['ep5_sh_inn',
   'ep5_saffron']`, `wanted` on `ep5_complete` or `ep6_started`), `EP6_LIVE = false`, the title hook line (await ep5, then
   ep6, then `LQ_EP6.title`), and the `ep[456]_` landing regex. Then **trim** comments and dead code in precached core JS
   until the pre-tap load is at or below step 1's number. Never trim behavior; rerun the suites.
3. **The pack skeleton** `src/data/ep6/index.js`: the ep5 entry pattern with ORDER `flags, enemies, items, skills, loot,
   encounters, gale, shops, ai, npcs, quests, text, story, ledger, audio, world, pages, maps, hooks, start, scene` (`title`
   loaded on first use by `hooks.js`), missing modules skipped, `register(engine)` idempotent, **awaiting the ep5 pack's
   registration first** (which awaits ep4); it merges `audio.js` into `engine.audio.manifest` (never overwriting an id) on
   every path, the quick start included.
   `maps.js`: awaits the ep5 pack (plan 3.3, the order trap), then registers every `src/data/maps/ep6_*.js` module by a
   guarded list (the 11 names of plan 2.1) and the patches from `ep6_patches.js` (`withEp6Wake`, `withSkyBerth`; identity
   if the file is missing). Start every pack's fetch at once and order only registration; measure the cold and warm time to
   the inn on the phone profile (four chained packs now).
   `hooks.js`: `CREDITS_HANDOFF[6]`, the live end card for 5 (`END_CARD_EP5_LIVE`, "Episode 6 begins in the morning."),
   `QUEST_EXT` push (guarded until E6-story's quest exists), `globalThis.LQ_EP6` (`title`, `offer`, `start`),
   `LQ_DEBUG.newGameEp6`.
4. **`start.js`**: `EP6_START` and `newGameEp6(name, { slot })` per plan 10.4, built on `pickRunSlot`, awaiting ep5 then
   ep6 and both audio fragments before the fade in. Use the simulator's `ep6_airstair` loadout if it exists, else the
   `ep5_lab_oracle` loadout plus the Oracle's Mask and the Caravan Compass; say which.
5. **Build tool and budget files:** `LAZY_PREFIXES` gains `assets/audio/sfx/ep6_` and `assets/audio/ambience/ep6_`;
   `packCapsMB.ep6 = 1.0`; the caps `deepEqual` in `packs.test.mjs` gains `ep6: 1.0`; `precache.test.mjs` reads
   `src/data/ep6/audio.js` for sfx ids referenced under `src/data/ep6/`.
6. **Tests** (node, fake storage): plan 10.8 cases that need no maps or scenes; the rest pending with a clear skip reason
   E6-integrate turns on; the pack table entry; the order trap (patched only with ep5 and ep6); `?ep=6` hidden while
   `EP6_MAPS_LISTED` is false; nothing fetched while `EP6_LIVE` is false; an Episode 4 save (no `ep5_complete`) never wants
   the pack; the pack-failure landing (an `ep6_obs_f2` save with `src/data/ep6/**` unreachable keeps its slot's map after a
   map change, and the field never autosaves on `_testtown`); the quick start resolves every ep5 and ep6 audio id.
7. `docs/PWA_PACKS.md`: an "ep6 pack" section (chain, caps, timings).

## Done when

The four seams are in, the pre-tap load is at or below the step-1 measure, `node qa/run.mjs core saves ui pwa battle` is
green, `simulate.mjs --check` is unchanged by your changes, an Episode 5 credits save still loads, autosaves to its own slot
and shows the unchanged Episode 5 end card with `EP6_LIVE` false, and every test of item 6 exists (passing or pending with
its reason).

## Tests to run

`node qa/run.mjs core saves ui pwa battle`; `node qa/pwa/precache.test.mjs`; `node qa/pwa/packs.test.mjs`;
`node tools/sim/simulate.mjs --check` (before and after: same numbers); `python tools/pwa/build_pwa.py --check`.

## Traps

- **The order trap.** `registerMap` overwrites by id; patching `ep5_sh_inn` or `ep5_saffron` before the ep5 pack has
  registered them loses the patch silently. Await ep5 first; test both orders.
- **Old saves.** Nothing may overwrite another run's slot; never autosave on `_testtown` or while a `packReturn` is
  pending; the quick start never offers Replace.
- **The quick start must await every pack and audio fragment** it needs before the fade in (PLAYTEST_REVIEW_6 fix 3: a
  party once heard no Episode 4 sound).
- **`next/sw.js` is generated.** Only `python tools/pwa/build_pwa.py` writes it, and only from this LF worktree; never
  hand-merge it.
- **`assets/ep6_manifest.json` is generated** (sync-manifest); it must be `git add`ed at each wave close. You do not run
  git: say in your report that the orchestrator must add it.
- **Hot files** (`packs.js`, `episodes.js` and the title hook) are yours alone this wave; no other agent opens a core file.
- House rules: no git; LF endings (count CR bytes before and after every edit: zero); no em dashes; stay in owned paths;
  bound every command; one browser job at a time; rerun a flaky timeout alone (`x1_gate`, `x1_wild`, `walks`,
  `abilities_walks`, `qa/battle/sim.test.mjs`); never edit `assets/audio/manifest.json`, `src/data/ep5/**` or
  `src/data/maps/ep5_*.js`; restore `qa/world/out` if a suite rewrites it; dev scenes stay lazy and out of the precache.

## Report (under 400 words)

The seams with gzipped bytes in and out, the exact exports (`EP6_LIVE`, `newGameEp6`, `EP6_START`, `LQ_EP6`), the pack
chain timings (cold and warm, phone), test counts, what E6-integrate must switch on, and the manifest note for the
orchestrator.
