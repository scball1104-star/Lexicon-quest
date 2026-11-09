# E5-story: the Episode 5 script, cast and quests, as pack modules (wave 5a, beside E5-pack and E5-battle)

Write Episode 5's words. Read `docs/briefs/COMMON.md`, `DESIGN.md`, `docs/story/EPISODE5.md` (your contract),
`docs/EPISODE5_PLAN.md` sections 0.1, 2, 3, 4.10, 5.1 (barks), 5.3, 8.3 (music cues), 9.4 (close-up kinds) and 10.5, and
for voice `docs/story/EPISODE1.md` section 4, `EPISODE4.md` sections 4 and 9 (what changed in the build) and
`RESPONSIBILITY_ARC.md` section 0. Model the code on `src/data/ep4/story.js`, `npcs.js`, `quests.js`, `text.js`,
`ledger.js` (pack registration by mutation: `registerStory`, `prependTalk`, `FLAG_IDS.push`, `ALL_SIDE_QUESTS.push`,
`BANNERS`, `BOOKS`, `BARKS`, `BESTIARY`, `SPEAKER_NAMES`, `LEDGER`, `PLACES`, `REACHED`).

## Items, in order

1. **`src/data/ep5/flags.js`**: every flag of plan 2.2 with a one-line meaning, pushed onto `FLAG_IDS`.
2. **`src/data/ep5/story.js`**: every scene of EPISODE5 section 1 and the side scenes of plan 2.5, cutscene API only,
   guarded by `SCENE_CONDITIONS` and registered with `registerStory`. `ep5_morning` also requires `EP5_LIVE`, counter
   `credits4_rolled` (checked by the trigger) and not `tier_1`; every other scene needs a flag only an Episode 5 scene
   sets. Speaker swaps "The First Student" to "Ishra" and "A Traveler" to "Tamir" (two records each, the Episode 4
   mechanism). The two truth choices set `bram_told`/`bram_spared` (one line changes in `star_reading`, one road bark) and
   `star_restored`/`star_hidden` (one line in `oracle_after`, one in `every_road`, and the gift).
3. **The first five minutes** (EPISODE5 section 1's table) are the spec: control by about 0:35, the letter close-up by
   0:20, Bram's choice by 3:00, the fight by 4:00. Keep `ep5_morning` to 6 boxes.
4. **Staging and showing** (CRITIQUE_6 items 3 and 11): every scene walks the party to marks two tiles from the speaker
   first; the four payoffs call `s.closeup('ep5_letter' | 'ep5_chart' | 'ep5_page', { mode })` behind a
   `PAGE_KINDS[kind]` guard (narration fallback until E5-tiles lands the pages in wave 5b).
5. **Box budgets**: at most 12 boxes per main scene, except `star_reading` 16, `oracle_after` 22, `every_road` 14,
   `ep5_ending` 13; about 200 on the main path (Episode 4 shipped 223 and ran long). Count them in a test.
6. **`npcs.js`**: the Saffron Haven cast (`sel`, `yara`, `kamal`, `nasrin`, `laleh`, `omar`, `yasmin`, `hassan`,
   `ep5_innkeeper`, `tamir`) with stages (`haven_arrived`, `star_reading_done`, `lab_f2_done`, `haven_restored`,
   `ep5_complete`); Episode 5 lines for Valewyn, Emberpeak, Hollowmere and Willowmere residents through `prependTalk`. No
   portrait aliases (Sel has none: plan 9.5).
7. **`quests.js`**: `MAIN_QUEST_EP5` (steps `crossing`, `road`, `haven` (Sel, the tower, the gate), `lab_f1`, `lab_f2`,
   `lab_f3`, `oracle`, `roads`, `epilogue5`), map-aware Talk for every step in Mira's and Bram's voices that **names the
   action** ("Set the dial to dawn and walk the long shadow"), the three side quests with plan 7 rewards, `epilogue5`
   naming something doable; while `EP5_LIVE`, `epilogue4` Talk points at the south landing.
8. **`text.js`**: 11 banners (the Haven's conditional), books `haven_charts`, `travelers_log`, `well_vows`, barks
   `first_shade`, `first_shove_shade`, `first_window`, `first_lamp`, `sand_would_run`, the low-MP hint ("Keep something
   back to turn the sky."), bestiary for the 12 new foes (each names its sky side), `CREDITS_EP5`, `END_CARD_EP5` ("To be
   continued" / "Episode 6 is not playable yet."), `END_CARD_EP4_LIVE`, `EPISODE6_CARD`, the boss cards and arc lines,
   every inspect line of plan 4 (the waystone and bulletin in two states, the mural, dials, obelisks, plates, windows,
   lamps, springs, the feather).
9. **`ledger.js`**: the rows, `PLACES.saffron`, `REACHED.saffron` of plan 5.3 (counted only when `EP5_LIVE`).
10. **`docs/story/STAGING_EP5.md`** (the shape of `STAGING_EP4.md`), and EPISODE5 section 9 (build notes, deltas only).

## Rules

- Owned paths: plan 11.1, row E5-story. Never a core data file and never an `ep4` file: everything registers by mutation.
- No word games, ever: the waystone, the chart and the pages are pictures and lines, never puzzles. No real names, no
  credit or nod to any teacher or author. No em dashes. ASCII only. `{hero}`.
- Tests (`qa/content/ep5_*`): ids unique across five episodes and the X1, cave and tier packs; flags declared; every box
  within 3 x 42; music cues return to the map track; inspect ids resolve; STAGING marks listed; budgets; nothing
  reachable with `EP5_LIVE` false; the pack registers twice without duplicates; Mira's two boss tips each name a lever
  (plan 6.6; assert against E5-battle's data once it exists, pending before).
- Verify: `node qa/run.mjs content`; `python qa/content/preview_dialogue.py` on `ep5_morning`, `star_reading`,
  `vex_gallery`, `oracle_after`; read them aloud against the tone guide (EPISODE5 section 4).
- Report under 400 words: scene count and box totals, changes to the beat sheet and why, the contracts for maps (marks,
  spawn ids, sign and inspect ids) and battle (encounter ids, `moonwell_woken` Fury, `sky_learned`, `SKY_START` needs).
