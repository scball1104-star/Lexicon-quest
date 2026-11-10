# E6-story: the Episode 6 script, cast and quests, as pack modules (wave 6a, beside E6-pack and E6-battle)

Write Episode 6's words.

## Inputs (read first, in this order)

The repo's `AGENTS.md`, `docs/briefs/COMMON.md`, `DESIGN.md`, `docs/story/EPISODE6.md` (your contract), `docs/EPISODE6_PLAN.md`
sections 0.1, 2, 3, 4.10, 5.1 (barks), 5.3, 8.3 (music cues), 9.4 (close-up kinds) and 10.5; for voice
`docs/story/EPISODE1.md` section 4, `EPISODE5.md` sections 4 and 9 (what changed in the build), `STAGING_EP5.md` (your
staging file's model) and `RESPONSIBILITY_ARC.md` section 0. Model the code on `src/data/ep5/story.js`, `npcs.js`,
`quests.js`, `text.js`, `ledger.js` (pack registration by mutation: `registerStory`, `prependTalk`, `FLAG_IDS.push`,
`ALL_SIDE_QUESTS.push`, `BANNERS`, `BOOKS`, `BARKS`, `BESTIARY`, `SPEAKER_NAMES`, `LEDGER`, `PLACES`, `REACHED`).

## Owned paths

`src/data/ep6/{flags,npcs,quests,text,story,ledger}.js`, `docs/story/STAGING_EP6.md`, `docs/story/EPISODE6.md` (section 9
only), `qa/content/ep6_*`. Never a core data file and never an `ep5` file: everything registers by mutation.

## Outputs (items, in order)

1. **`flags.js`**: every flag of plan 2.2 with a one-line meaning, pushed onto `FLAG_IDS`.
2. **`story.js`**: every scene of EPISODE6 section 1 and the side scenes of plan 2.5, cutscene API only, guarded by
   `SCENE_CONDITIONS` and registered with `registerStory`. `ep6_morning` also requires `EP6_LIVE`, counter
   `credits5_rolled` (checked by the trigger) and not `tier_1`; every other scene needs a flag only an Episode 6 scene
   sets. The speaker swap "The Signal Apprentice" to "Pippa" (two records, the Episode 5 mechanism). The two truth choices
   set `mira_told`/`mira_spared` (one line in `cloud_library`, one Talk line) and `told_aeris`/`kept_from_aeris` (one line in
   `cloud_library`, and the gift in `isles_return`).
3. **The first five minutes** (EPISODE6 section 1's table) are the spec: control by about 0:35, the slip close-up by 0:20,
   Mira's choice by 3:00, the fight by 4:00. Keep `ep6_morning` to 6 boxes.
4. **Staging and showing** (CRITIQUE_6 item 3 and 11, CRITIQUE_7 items 7 and 8): every scene walks the party to marks two
   tiles from the speaker first; the five payoffs call `s.closeup('ep6_slip' | 'ep6_manifest' | 'ep6_letter' | 'ep6_page',
   { mode })` behind a `PAGE_KINDS[kind]` guard (narration fallback until E6-tiles lands the pages in wave 6b); the first
   page opens in three modes (`name`, `seal`, `torn`), the line "Keep this one." last; Vex is opaque, and in `vex_relay`
   and `vex_falls` the party stops two rows below him. `vex_falls` draws the rope with the pack helper of plan 5.2 (ask
   E6-scene-ui by name in your report; until it exists, narration says the line holds).
5. **Box budgets**: at most 12 boxes per main scene, except `anchor_lesson` 14, `vex_falls` 16, `fifth_voice` 14,
   `scribe_after` 18, `cloud_library` 18, `isles_return` 14; about 200 on the main path. Count them in a test.
6. **`npcs.js`**: the Zephyr Landing cast (`aeris`, `liora`, `bennet`, `suri`, `ilex`, `nova`, `piri`, `thea`,
   `ep6_innkeeper`, `pippa`) with stages (`zephyr_arrived`, `charts_seen`, `obs_f2_done`, `isles_restored`,
   `ep6_complete`); Episode 6 lines for Saffron Haven, Valewyn, Emberpeak, Hollowmere and Willowmere residents through
   `prependTalk` (Holt's two lines are in the bible). No portrait aliases (Aeris has none: plan 9.5).
7. **`quests.js`**: `MAIN_QUEST_EP6` (steps `crossing`, `airstair`, `zephyr` (Aeris, the chart room, the dock, the gate),
   `obs_f1`, `obs_f2`, `obs_f3`, `scribe`, `library`, `epilogue6`), map-aware Talk for every step in Mira's and Bram's voices
   that **names the action** ("Turn the vane, then ride the lane back to the post"), the three side quests with plan 7
   rewards, `epilogue6` naming something doable; while `EP6_LIVE`, `epilogue5` Talk points at the water stairs and lists
   only that step (PLAYTEST_REVIEW_7 item 10). The one-time low-MP hint "Keep something back to anchor us." (a bark and
   `EP6_BATTLE_TEXT.low_mp`).
8. **`text.js`**: 11 banners (Zephyr Landing's conditional), books `flight_manifests`, `flight_logs`, `pilot_charter`,
   barks of plan 5.1, bestiary for the 11 new foes (each names Aloft or grounded), `CREDITS_EP6`, `END_CARD_EP6` ("To be
   continued" / "Episode 7 is not playable yet."), `END_CARD_EP5_LIVE`, `END_TITLE_EP6` ("End of Episode 6" / "Words on the
   Wind"), `EPISODE7_CARD` ("Episode 7: The Vanishing World" / "The other half of the page lies north."), the boss cards and
   arc lines (`EP6_BOSS_CARDS`, `EP6_ARC_LINES`, `EP6_BATTLE_TEXT` exported for E6-scene-ui), every inspect line of plan 4
   (the board and the chimes in two states, the post rack, the beacon, the chain, lanes, posts, vanes, relays, speaking
   tubes, grilles, the charter's three lines, the lamps, the desk, the quills, the Wind Script, the library shelves, the
   feather).
9. **`ledger.js`**: the rows, `PLACES.zephyr`, `REACHED.zephyr` of plan 5.3 (counted only when `EP6_LIVE`); the hero's row
   stays unkept.
10. **`docs/story/STAGING_EP6.md`** (the shape of `STAGING_EP5.md`), and EPISODE6 section 9 (build notes, deltas only).

## Done when

Every scene of the beat sheet and plan 2.5 is registered, inside its box budget, staged to listed marks, guarded so nothing
is reachable with `EP6_LIVE` false; `node qa/run.mjs content` is green; the four preview reads of item "Tests" are done.

## Tests to run

`node qa/run.mjs content`; `python qa/content/preview_dialogue.py` on `ep6_morning`, `anchor_lesson`, `vex_falls`,
`fifth_voice`, `cloud_library`; read them aloud against the tone guide (EPISODE6 section 4). Tests you add
(`qa/content/ep6_*`): ids unique across six episodes and the X1, cave and tier packs; flags declared; every box within 3 x
42; music cues return to the map track; inspect ids resolve; STAGING marks listed; budgets; nothing reachable with
`EP6_LIVE` false or with `tier_1`; the pack registers twice without duplicates; **Bram's two boss tips each name a lever
the data has** (plan 6.6; assert against E6-battle's data once it exists, pending before).

## Traps

- **Collisions** (plan 2): Episode 3 owns `oath_*` (the landings are `pledge_*`) and the phase id `updraft`; Episode 5 owns
  `landing_*`, `sel_memory_*`, `sky_*`; X1 owns `orrery*`; Episode 2 owns `testimony_*` for its witnesses (yours are
  `testimony_liora`, `_bennet`, `_suri`). Grep every new id.
- **Mira's tips were a contract in Episode 5; Bram's are now** ("When it winds the bellows, I anchor us. Keep me standing."
  and "When it rewrites the course, I anchor us. Keep me standing."). If a tip has to change, report a story question; never
  write a tip the data does not back (PLAYTEST_REVIEW_6 item 8).
- **Lines in the bible are final voice.** Cut to fit a budget; do not rewrite a canon line.
- **No word games, ever.** The board, the manifests, the letter and the page are pictures and lines, never puzzles. No
  real names, no credit or nod to any teacher or author. ASCII only. `{hero}`.
- House rules: no git; LF endings (count CR bytes before and after: zero); no em dashes; stay in owned paths; bound every
  command; never edit `src/data/text.js` (a hot core file) or any `ep5` file.

## Report (under 400 words)

Scene count and box totals, changes to the beat sheet and why, the contracts for maps (marks, spawn ids, sign and inspect
ids) and battle (encounter ids, `beacon_lit` Fury, `anchor_learned`, `GALE_START` needs), and the rope helper you need from
E6-scene-ui.
