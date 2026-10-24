# E3-story: the Episode 3 script, cast and quests (wave 17a, run 2 of 10)

Write Episode 3's words. Read `docs/briefs/COMMON.md`, `DESIGN.md`, `docs/story/EPISODE3.md` (your contract),
`docs/EPISODE3_PLAN.md` sections 2, 3, 4.8, 5.1 (barks), 8.3 (music cues) and 10.5 (the switch), and for voice
`docs/story/EPISODE1.md` section 4 and `docs/story/EPISODE2.md` section 4. Model the code on `src/data/story/ep2.js`.

## Items, in order

1. **`src/data/story/ep3.js`**: every scene of EPISODE3 section 1 and the side scenes in plan 2.5, cutscene API only,
   wrapped and guarded like `ep2.js` (`SCENE_CONDITIONS`). `ep3_morning` and `sand_gate` also require `EP3_LIVE` from
   `src/game/episodes.js` (stub `false` if E3-saves has not landed). Inspect `lines` for every id in plan 4 (the
   memorial's three states, the proclamation, the silent bell, the coolant station, troughs, sluices, spouts, basins,
   the waterwheel, anvils, the Bell Gate, the feather, the leaf, the east road sign, the sand chain).
2. **Box budgets**: at most 12 boxes per main scene, except `ep3_morning` 14, `first_bell` 14, `warden_after` 24; about
   230 boxes on the main path. Count them in a test.
3. **`npcs.js`**: the Emberpeak cast (`veyra`, `ilya`, `sella`, `harl`, `bess`, `taro`, `rusk`, `garrick_e`, `penny_s`)
   with stages (`pk_arrived`, `foundry_f2_done`, `pk_restored`, `ep3_complete`); Episode 3 lines for Wren, Vessa,
   Penny, Elian, Aurel, Anwen, Hazel, Mael, Holt, Hal; Willowmere's Garrick hidden from `ep3_started`; the smithy note
   GONE EAST. G. The Smith's speaker tag until `garrick_named` (the Aurel swap pattern).
4. **`quests.js`**: plan 2.2 flags with meanings; the main quest (`sand_road`, `emberpeak` (Veyra, Ilya), `foundry_f1`,
   `foundry_f2`, `foundry_f3`, `warden`, `first_bell`, `epilogue3`), map-aware Talk for every step in Bram's and Mira's
   voices; three side quests with plan 7 rewards; `epilogue3` Talk names something doable. When `EP3_LIVE`,
   `epilogue2` points at the sand gate.
5. **`text.js`**: 9 banners (Emberpeak's conditional), books `foundry_ledger`, `pk_records`, barks `first_sluice`,
   `first_quench`, `first_basin`, bestiary for the 11 new foes, `CREDITS_EP3`, `END_CARD_EP3`, and the live variant of
   `END_CARD_EP2`'s sub.
6. **`docs/story/STAGING_EP3.md`**: who stands where, marks, props, camera and music per scene, the marks checklist.

## Rules

- Owned paths: `src/data/story/ep3.js` (new), `src/data/npcs.js`, `src/data/quests.js`, `src/data/text.js`,
  `docs/story/EPISODE3.md` (a build-notes section only), `docs/story/STAGING_EP3.md`, `qa/content/**`.
- No word games, ever. No em dashes. ASCII only. `{hero}` for the name. No git; bounded commands.
- Tests: ids unique across three episodes, flags declared, every box within 3 x 42, music cues return to the map
  track, inspect ids resolve, STAGING marks listed, box budgets, nothing reachable with `EP3_LIVE` false.
- Verify: `node qa/run.mjs content`; `python qa/content/preview_dialogue.py` on `ep3_morning`, `bram_memory_3`,
  `warden_after`; read them aloud against the tone guide.
- Report under 400 words: scene count and box totals, any change to the beat sheet and why, the contracts for maps
  (marks, spawn ids) and battle (encounter ids, the `coolant_done` Fury flag).
