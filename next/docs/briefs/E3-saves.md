# E3-saves: per-run autosave, the Episode 3 quick start, the episode switch (wave 17a, run 1 of 10)

Episode 3 is designed and approved. You go first because the riskiest thing in the episode is a save being lost
(the 10/23 trap: PLAYTEST_REVIEW_4 fix 1, fixed by W15 with a confirm). Read `docs/briefs/COMMON.md`, `DESIGN.md`,
`docs/EPISODE3_PLAN.md` section 10 (your contract) and sections 0 and 11, `docs/PLAYTEST_REVIEW_4.md` fix 1, and the
W15 save guard in `src/scenes/title.js` (`autosaveGuard`, `freeRecord`, `ep2Offer`, `startEpisode2`).

## Items, in order

1. **Per-run autosave slot.** `g.autosaveSlot` (default 0, serialized, absent in old saves = 0); `field.js` autosaves
   to it instead of `AUTOSAVE_SLOT`. Loading any slot keeps that run's `autosaveSlot`.
2. **The episode switch.** New `src/game/episodes.js`: `EP3_LIVE = false`, and a pure `episodeOffers(save, search)`
   returning the Episode 2 offer exactly as `ep2Offer` does today plus an Episode 3 offer (shown when `EP3_LIVE` and any
   slot has `ep2_complete`, or with `?ep=3` once `EP3_MAPS_LISTED` is true; import it lazily or default it to false if
   `encounters.js` does not export it yet). Keep `ep2Offer` working (re-export or delegate).
3. **`EP3_START` and `newGameEp3(name, { slot })`** in `src/game/state.js` per plan 10.4, built like `newGameEp2`. If
   the sim's `sand_road` loadout does not exist yet, use the `court_throne` loadout and say so.
4. **The slot picker** for the quick start (plan 10.3): slot 0 if empty, else the first empty manual slot with a
   one-line notice, else a refusal with only Back. Never Replace. Put the pure choice in `episodes.js`
   (`pickRunSlot(save)`), the UI in `title.js` behind the Episode 3 offer (the row itself can stay hidden until
   E3-scene-ui; a `LQ_DEBUG.newGameEp3` path is enough to test). New Game and Episode 2 keep the W15 guard unchanged.
5. **Tests** (node, fake storage): every case in plan 10.7 that does not need Episode 3 maps or scenes; the rest as
   pending tests with a clear skip reason that E3-integrate turns on.

## Rules

- Owned paths: `src/game/episodes.js` (new), `src/game/state.js`, `src/core/save.js` (only if a helper is needed),
  `src/scenes/field.js` (the autosave call only), `src/scenes/title.js` (the Episode 3 offer and picker only),
  `qa/core/**`, `qa/ui/**` (new tests). Not: story, maps, battle data, PLAN.md, PROGRESS.md, HANDOFF.md.
- No git. No em dashes. Every subprocess gets a timeout; one browser job at a time (this account also runs Scott's
  business loops).
- Verify: `node qa/run.mjs` green; a headless check that an Episode 1 credits save and an Episode 2 credits save still
  load and autosave to slot 0; the quick start with slot 0 occupied writes only its own slot (read localStorage back).
- Report under 400 words: what changed, the exact exports (`EP3_LIVE`, `episodeOffers`, `pickRunSlot`,
  `newGameEp3`, `EP3_START`), test counts, anything E3-integrate must switch on, and a plain-words paragraph for Scott.
