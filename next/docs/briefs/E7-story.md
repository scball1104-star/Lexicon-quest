# E7-story: the Episode 7 script, cast and quests, as pack modules (wave 7a, beside E7-pack and E7-battle)

Write Episode 7's words.

## Inputs (read first, in this order)

The repo's `AGENTS.md`, `docs/briefs/COMMON.md`, `DESIGN.md`, `docs/story/EPISODE7.md` (your contract), `docs/EPISODE7_PLAN.md`
sections 0.1, 2, 3, 4.11, 5.1 (barks), 5.2, 5.3, 8.3 (music cues), 9.4 (close-up kinds) and 10.5; for voice
`docs/story/EPISODE1.md` sections 3 and 4 (Tess, Hazel, the letters), `EPISODE3.md` section 1 (Mara, Ilya), `EPISODE6.md`
sections 4 and 9 (what changed in the build), `STAGING_EP6.md` (your staging file's model) and `RESPONSIBILITY_ARC.md`
section 0. Model the code on `src/data/ep6/story.js`, `npcs.js`, `quests.js`, `text.js`, `ledger.js` (pack registration by
mutation: `registerStory`, `prependTalk`, `FLAG_IDS.push`, `ALL_SIDE_QUESTS.push`, `BANNERS`, `BOOKS`, `BARKS`,
`BESTIARY`, `SPEAKER_NAMES`, `LEDGER`, `PLACES`, `REACHED`).

## Owned paths

`src/data/ep7/{flags,npcs,quests,text,story,ledger}.js`, `docs/story/STAGING_EP7.md`, `docs/story/EPISODE7.md` (section 9
only), `qa/content/ep7_*`. Never a core data file and never an `ep6` file: everything registers by mutation.

## Outputs (items, in order)

1. **`flags.js`**: every flag of plan 2.2 with a one-line meaning, pushed onto `FLAG_IDS`.
2. **`story.js`**: every scene of EPISODE7 section 1 and the side scenes of plan 2.5, cutscene API only, guarded by
   `SCENE_CONDITIONS` and registered with `registerStory`: 36 registered (27 main and chained, 7 side, 2 silent; under 40).
   `ep7_morning` also requires `EP7_LIVE`, counter `credits6_rolled` (checked by the trigger) and not `tier_1`, and gives
   `white_road_letter` only when the party does not hold it; every other scene needs a flag only an Episode 7 scene sets.
   The speaker swaps "The Keeper" to "Nox" (records `keeper` and `nox_t`) and "A Courier" to "Marten" (`courier_m`,
   `marten_m`), the Episodes 4 to 6 mechanism. The two truth choices set `told_vex`/`spared_vex` (one line in
   `doors_reopen`, one Talk line) and `told_nox`/`spared_nox` (one line in `whole_page`, and the gift in `doors_reopen`).
3. **The first five minutes** (EPISODE7 section 1's table) are the spec: control by about 0:35, the chart close-up by 0:20,
   Vex's choice by 3:00, the fight by 4:00. Keep `ep7_morning` to 6 boxes.
4. **Staging, camera and showing** (CRITIQUE_6 items 3 and 11, CRITIQUE_7 item 7, CRITIQUE_8 items 2 and 5): every scene
   walks the party to marks two tiles from the speaker first; every focus mark at least 12 tiles from a map's sides and 7
   from its top and bottom (list them in STAGING_EP7 so `qa/maps` can assert it); the six payoffs call `s.closeup('ep7_chart'
   | 'ep7_carving' | 'ep7_tally' | 'ep7_tag' | 'ep7_seventh' | 'ep7_page' | 'ep7_letter', { mode })` behind a
   `PAGE_KINDS[kind]` guard (narration fallback until E7-tiles lands the pages in wave 7b); the whole page opens in three
   modes (`joined`, `mark`, `signed`), the signature last, each mode called on the box that says it. The whiteout draws the
   fade (sprite alpha, the `whiteout` tint, the HUD frost through E7-scene-ui's drawer, plan 5.2); until the drawer exists,
   the sprite alpha and tint alone. The memories' frost-blot on a name uses the pack helper `s.frostBlot` (ask E7-scene-ui
   by name; until it exists, a "..." box).
5. **Box budgets**: at most 12 boxes per main scene, except `name_under_ice` 14, `whiteout` 14, `listening_bell` 14,
   `phantom_after` 18, `whole_page` 18, `doors_reopen` 16; about 190 on the main path. Count them in a test.
6. **`npcs.js`**: the Palehaven cast (`keeper`, `bryn`, `eira`, `eira_forge`, `sol`, `sol_waystation`, `maera`, `torr`,
   `mirael`, `ep7_innkeeper`) with stages (`palehaven_arrived`, `met_keeper`, `vault_f2_done`, `nox_named`,
   `doors_reopened`, `ep7_complete`). **Bryn, Eira, Torr and Mirael have two line sets by `nox_named`**: before it their
   canon lines say "the Keeper" (one word changed), after it word for word canon (EPISODE7 section 3). Episode 7 lines for
   Zephyr Landing, Saffron Haven, Valewyn, Emberpeak, Hollowmere and Willowmere residents through `prependTalk` (Tess's,
   Hazel's and Holt's are in the bible; the Court's empty frame gets its inspect after `nox_named`). No portrait aliases.
7. **`quests.js`**: `MAIN_QUEST_EP7` (steps `north` (the inn, the gangway), `road`, `palehaven` (the Keeper, the Watch, the
   gate), `vault_f1`, `vault_f2`, `vault_f3`, `phantom`, `page`, `epilogue7`), map-aware Talk for every step in Mira's and
   Bram's voices that **names the action** ("Read Bo's stone, then Nyx's; the first path you held goes when you take a
   third"), the three side quests with plan 7 rewards, `epilogue7` naming something doable; while `EP7_LIVE`, `epilogue6`
   Talk points at the inn's door and the north dock and lists only that step (PLAYTEST_REVIEW_7 item 10). The one-time
   low-MP hint "Keep something back to call us." (a bark and `EP7_BATTLE_TEXT.low_mp`).
8. **`text.js`**: 10 banners (Palehaven's conditional), books `keeper_book`, `missing_streets`, `keeper_charter`, barks of
   plan 5.1, bestiary for the 11 new foes (each names its cold moves), `CREDITS_EP7`, `END_CARD_EP7` ("To be continued" /
   "Episode 8 is not playable yet."), `END_CARD_EP6_LIVE`, `END_TITLE_EP7` ("End of Episode 7" / "The Vanishing World"),
   `EPISODE8_CARD` ("Episode 8: The First Library" / "The lists were written here."), the boss cards and arc lines
   (`EP7_BOSS_CARDS`, `EP7_ARC_LINES`, `EP7_BATTLE_TEXT` exported for E7-scene-ui, including the Defend help "Shake off the
   cold." and every Rime and Farewell message of plan 6.3 to 6.5), every inspect line of plan 4 and EPISODE7 section 7, the
   stone names (one text key per stone, plan 4.11), and **the Watch's and the Waystation's own save-bell keys**
   (`ep7_watch_bell`, `ep7_stove`: PLAYTEST_REVIEW_8 item 7).
9. **`ledger.js`**: the rows, `PLACES.palehaven`, `REACHED.palehaven` of plan 5.3 (counted only when `EP7_LIVE`), the
   proposed `vex` row (EPISODE7 choice 21); the hero's row stays unkept.
10. **`docs/story/STAGING_EP7.md`** (the shape of `STAGING_EP6.md`), and EPISODE7 section 9 (build notes, deltas only).

## Done when

Every scene of the beat sheet and plan 2.5 is registered, inside its box budget, staged to listed marks, guarded so nothing
is reachable with `EP7_LIVE` false; `node qa/run.mjs content` is green; the five preview reads of "Tests" are done.

## Tests to run

`node qa/run.mjs content`; `python qa/content/preview_dialogue.py` on `ep7_morning`, `name_under_ice`, `whiteout`,
`listening_bell`, `whole_page`; read them aloud against the tone guide (EPISODE7 section 4). Tests you add
(`qa/content/ep7_*`): ids unique across seven episodes and the X1, cave and tier packs; flags declared; every box within 3 x
42; music cues return to the map track; inspect ids resolve; STAGING marks listed with their edge distances; budgets;
nothing reachable with `EP7_LIVE` false or with `tier_1`; the pack registers twice without duplicates; **no Palehaven line
before `nox_named` contains "Nox"**; **no Episode 7 event or line uses an Episode 1 text key**; **Mira's two boss tips each
name a lever the data has** (plan 6.6; assert against E7-battle's data once it exists, pending before).

## Traps

- **Collisions** (plan 2): Episode 2 owns `corin` (so Nox's brother is Marten) and `testimony_*` for its witnesses (yours
  are `testimony_mirael`, `_sol`, `_eira`); Episode 1 owns `oren`, `tess`, `hazel` (Tess and Hazel get `prependTalk` lines,
  never new records); Episode 6 owns `aeris_memory_*` (yours are `keeper_memory_*`) and `pledge_*`. Grep every new id.
- **The hero never speaks in a box.** Call is narration, a HUD and a sound (EPISODE7 choice 15).
- **Mira's tips are a contract** ("When it borrows one of us, call them back, {hero}. Before its turn." and "When it says
  goodbye to one of us, call them, {hero}. Before it lands."). If a tip has to change, report a story question; never write
  a tip the data does not back (PLAYTEST_REVIEW_6 item 8).
- **Lines in the bible are final voice.** Cut to fit a budget; do not rewrite a canon line. Canon lines kept word for word:
  "The light exists so others can return.", "Do not freeze my life into a single farewell. Open the door for those who
  follow.", "Now you understand why I keep moving.", the townsfolk's canon lines.
- **No word games, ever.** The stones' names are flavor (EPISODE7 choice 13); the chart, the carving, the tally, the tag,
  the list, the page and the letter are pictures and lines, never puzzles. No real names, no credit or nod to any teacher or
  author. ASCII only. `{hero}`.
- **Grief is shown small** (EPISODE7 section 4): never describe Marten's or Mara's death; no humor in those beats.
- House rules: no git; LF endings (count CR bytes before and after: zero); no em dashes; stay in owned paths; bound every
  command; never edit `src/data/text.js` (a hot core file) or any `ep6` file.

## Report (under 400 words)

Scene count and box totals, changes to the beat sheet and why, the contracts for maps (marks with edge distances, spawn ids,
sign, stone-name and inspect ids) and battle (encounter ids, `hearth_lit` Fury, `call_learned`, the Rime and Farewell
messages), and the helpers you need from E7-scene-ui (the HUD frost drawer, `s.frostBlot`).
