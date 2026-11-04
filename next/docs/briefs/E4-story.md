# E4-story: the Episode 4 script, cast and quests, as pack modules (wave 4a, beside E4-pack and E4-battle)

Write Episode 4's words. Read `docs/briefs/COMMON.md`, `DESIGN.md`, `docs/story/EPISODE4.md` (your contract),
`docs/EPISODE4_PLAN.md` sections 2, 3, 4.9, 5.1 (barks), 5.3, 8.3 (music cues) and 10.5, and for voice
`docs/story/EPISODE1.md` section 4, `EPISODE3.md` section 4 and `RESPONSIBILITY_ARC.md` section 0. Model the code on
`src/data/story/ep3.js` (scenes) and `src/data/x1/story.js`, `npcs.js`, `quests.js`, `text.js` (pack registration by
mutation: `registerStory`, `prependTalk`, `FLAG_IDS.push`, `ALL_SIDE_QUESTS.push`, `BANNERS`, `BOOKS`, `BARKS`,
`BESTIARY`, `SPEAKER_NAMES`, `LEDGER`).

## Items, in order

1. **`src/data/ep4/flags.js`**: every flag of plan 2.2 with a one-line meaning, pushed onto `FLAG_IDS`.
2. **`src/data/ep4/story.js`**: every scene of EPISODE4 section 1 and the side scenes of plan 2.5, cutscene API only,
   guarded by `SCENE_CONDITIONS` and registered with `registerStory`. `ep4_morning` also requires `EP4_LIVE`, counter
   `credits3_rolled` (checked by the trigger, as Episode 3 did) and not `tier_1`; every other scene needs a flag only an
   Episode 4 scene sets. The speaker swap "The Regent" to "Lyra" with two records (`regent_e`, `lyra_n`). The truth
   choice sets `lyra_truth` or `lyra_kind` and changes exactly one line in `crown_remembers` and the gift.
3. **Box budgets**: at most 12 boxes per main scene, except `ep4_morning` 13, `regent_after` 24, `crown_remembers` 14;
   about 220 on the main path. Count them in a test.
4. **`npcs.js`**: the Valewyn cast (`regent_e`, `lyra_n`, `hale`, `nilo`, `dorian`, `joss`, `ada` on sprite
   `npc_courier_v`, `vance`, `linn`, `sori`) with stages (`vw_arrived`, `keep_f2_done`, `vw_restored`, `ep4_complete`);
   Episode 4 lines for Emberpeak, Hollowmere and Willowmere residents through `prependTalk`; portrait alias `lyra` and
   `regent_e` to `noble_lady`.
5. **`quests.js`**: `MAIN_QUEST_EP4` (steps `flood_road`, `valewyn` (Regent, Joss), `keep_f1`, `keep_f2`, `keep_f3`,
   `regent`, `crown`, `epilogue4`), map-aware Talk for every step in Mira's and Bram's voices, the three side quests
   with plan 7 rewards (the council choice exactly once, the other district after `ep4_complete`), `epilogue4` naming
   something doable; export what E4-pack's `hooks.js` pushes onto `QUEST_EXT`; while `EP4_LIVE`, `epilogue3` Talk
   points at the east road.
6. **`text.js`**: 10 banners (Valewyn's conditional), books `vw_records`, `keep_ledger`, `tide_log`, barks
   `first_tide`, `first_wash`, `first_float`, `first_true_ink`, bestiary for the 12 new foes, `CREDITS_EP4`,
   `END_CARD_EP4` ("To be continued" / "Episode 5 is not playable yet."), `END_CARD_EP3_LIVE`, `EPISODE5_CARD`, every
   inspect line of plan 4.
7. **`ledger.js`**: the rows, `PLACES.valewyn`, `REACHED.valewyn` of plan 5.3 (counted only when `EP4_LIVE`).
8. **`docs/story/STAGING_EP4.md`**, and EPISODE4 section 9 (build notes, deltas only).

## Rules

- Owned paths: plan 11.1, row E4-story. Never a core data file: everything registers by mutation.
- No word games, ever. No real names, no credit to any teacher or author. No em dashes. ASCII only. `{hero}`.
- Tests (`qa/content/ep4_*`): ids unique across four episodes and the X1, cave and tier packs; flags declared; every
  box within 3 x 42; music cues return to the map track; inspect ids resolve; STAGING marks listed; budgets; nothing
  reachable with `EP4_LIVE` false; the pack registers twice without duplicates.
- Verify: `node qa/run.mjs content`; `python qa/content/preview_dialogue.py` on `ep4_morning`, `witness_book`,
  `regent_after`; read them aloud against the tone guide.
- Report under 400 words: scene count and box totals, changes to the beat sheet and why, the contracts for maps (marks,
  spawn ids, sign ids) and battle (encounter ids, `council_records` Fury, `hero_signed`).
