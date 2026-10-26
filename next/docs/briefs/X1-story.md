# X1-story: the expansion's script, cast and quests (X1 wave W1, job 2 of 3; XP-packs runs first)

Write the words of the Wider Valley. Read `docs/briefs/COMMON.md`, `DESIGN.md`, `docs/EXPANSION_RECONCILIATION.md` (the decision log; it wins over the plan), `docs/story/EPISODE1.md` (sections 1 to 5:
the beat sheet, the cast, **the tone guide** and the lore of names), `docs/EXPANSION1_PLAN.md` sections 2, 4.11, 5, 6.2, 9, 11.3 and
12 (your contract), `docs/briefs/XP-packs.md` (how your modules are registered), and for code shape `src/data/story/ep2.js`, `src/data/story/ep3.js`, `src/data/quests.js` (side
quests, `counter`, `BANTER`, `partyChat`) and `src/data/npcs.js` (record shape, `show`, prepended talk). Skim
`docs/EXPANSION2_PLAN.md` sections 7 and 8 (the Episode 2 expansion's quests and cast) so the two do not read alike: its Maren stocks travellers' caches with tins and
its quests are about errands and lamps; ours is about names returning to stones.

## Items, in order

1. **Registration, not edits.** Every module you write exports `register()` (idempotent) that mutates the shared objects when the `x1` pack loads (`XP-packs.md` section 2); you edit **no** shared data file. `src/data/x1/live.js`
   (`X1_LIVE = false`, `X1_REGIONS`, `x1On(region)`) and `src/data/x1/index.js` already exist from XP-packs: import `live.js`, never create it. X1-integrate flips it last.
2. **`src/data/x1/flags.js`**: every flag of plan 2.2 with a one-line meaning (`X1_FLAGS`); `register()` assigns into `FLAGS` and **pushes onto `FLAG_IDS`**.
3. **`src/data/x1/npcs.js`**: the records of 2.5 and 9.1 (`brindle`, `tamsin`, `ferrick`, `hesper`, `odo`, `yarrow`, `stray_1` to
   `stray_5`, `fold_sheep_a`, `fold_sheep_b`) with `show` conditions (strays: `if: strays_started`, `ifNot: stray_N_found`; regions and
   `X1_LIVE`), services (`thornfold_loom`, `millrace_stall`), one Episode 2 and one Episode 3 line each, and `X1_TALK_PREPEND` (entries to
   add at the front of `iris`, `quill`, `pell`, `hal`, `oren`, `holt`, always guarded by new flags so first-match order for old states is
   unchanged); `register()` adds the records and applies the prepends through the `prependTalk` helper of XP-packs.
4. **`src/data/x1/quests.js`**: the six side quests of plan 5 (`strays`, `rollcall`, `pell_crates`, `four_rolls`, `dark_stars`,
   `not_to_forget`) in the `SIDE_QUESTS` shape with `journal` and two or more `chat` entries per step (Mira, Bram and the hero in voice;
   one map-aware, one fallback; the recommended level in the journal; a completed entry shows its "+n EXP"), `counter` where plan 5
   says, rewards in `REWARDS_X1` (item ids from plan 8), and `BANTER_X1` for the valley, Willowmere and the new maps (the cleft hint once
   `lantern_get` and not `terrace_arrived`; the south track once `archive_f1_done`; the west gate once `first_fight_done`; the moor's far
   tower). Every step's Talk names the next step. **Quest EXP is a small bonus** (plan 5.8): each quest's closing scene calls `await s.give('exp', n)` with Strays 8, Thirteenth Stone 12, Dark Stars 8, Pell's Crates 6,
   Four Rolls 12, Things Not To Forget 8 (54 in all), once, behind the quest's `done` flag. X1-battle may lower an amount if its ledger breaks the cap of plan 7.2; you never raise one.
5. **`src/data/x1/story.js`**: the 42 scenes of plan 2.6 and section 5 (cutscene API only; note the new path, not `src/data/story/`), registered through `registerStory({ scenes, lines, conditions })`, guarded like `ep2.js` and `ep3.js`
   (`SCENE_CONDITIONS`), each also requiring `x1On(region)`. Box budgets: a scene as listed, none over 12, the whole expansion at
   most 190 (about 180 planned). Variants: `reeve_intro` and `reeve_after` differ on `stones_lettered`; `rollcall_stones` also handles "the
   Reeve is already down" (sets `reeve_named`); `pin_place` chains into `mill_done`, which spawns Hal and Oren walking up the road. The mill
   door before the Archivore: the sound of bowls behind a barred door (one inspect, never a scene). The twelve stone names, the Reeve's name
   (Wystan is a placeholder), the Keepers' station names, Odo's chime song and Yarrow's honey are yours to write: ASCII, no collision with any
   named person in Episodes 1 to 3 or in `docs/EXPANSION2_PLAN.md`, no alphabetical pattern, and **no word game of any kind**.
   **Names to confirm:** hold the Reeve's name, the twelve stone names, the three Keepers' station names, Odo's chime song title and the nine chime-post words in ONE exported constant `X1_NAMES_TO_CONFIRM` in `src/data/x1/text.js` that
   every scene reads, and list the same table in a "Names to confirm" section of `STAGING_X1.md`, so Scott's real names are a one-place edit.
6. **`src/data/x1/text.js`**: the eleven banners of plan 2.1, every sign and inspect id of plan 4 (the chain, the oak, the cleft, the stones in
   three states, the sampler, the scarecrow, the star plate, the armillary, the slab, the weir, the mill wheel, the flour table, the chime
   posts, the Watchtower, the windmill, the barred mill door), books (`keeper_star_ledger`, `mill_ledger`, `burial_roll`,
   `x1_keeper_note_f2`, `barrow_names`, `cellar_note`), font texts (`thornfold_hearth`, `barrow_hearth`, `culvert_font`, `cellar_font`), the
   bark `first_appraise_object`, the Appraise texts, and the bestiary entries for `barrow_shade`, `barrow_reeve`, `millstone_golem`; `register()` assigns into `BANNERS`, `BOOKS`, `BARKS`, `BESTIARY` and the line tables.
7. **`docs/story/STAGING_X1.md`**: who stands where, the marks (the 4.11 checklist), props, camera and music cue per scene (cues from plan
   10.4), the quest-EXP call sites, the Names-to-confirm table.
8. **Tests `qa/content/x1_*.test.mjs`**: scene, flag, quest, NPC and text ids unique across the three episodes plus this one and the Episode 2 registry in `docs/EXPANSION2_PLAN.md`; every flag
   declared; every box within 3 x 42; box budgets (plan 2.6; total 190 at most, none over 12); every music cue returns to the map track;
   every inspect and text id the plan names resolves; every STAGING mark is in 4.11; the six `give('exp')` amounts and their total of 54; nothing reachable when
   `X1_LIVE` is false or the pack is not registered; a region switched off removes its scenes and NPCs; ASCII only; no U+2014.

## Rules

- Owned paths: `src/data/x1/{flags,quests,npcs,text,story}.js`, `docs/story/STAGING_X1.md`, `qa/content/x1_*`. You do **not** edit `quests.js`, `npcs.js`, `text.js`, `story.js`, `live.js` or `index.js`.
  Test your modules standalone and against the merged shape (call `register()` in the test).
- Voice and canon: EPISODE1 section 4 and plan 9.2 (nobody explains the forgetting; names are spoken with weight; the hero gets no backstory;
  Hal's mill lines only after the Archivore; the Keepers refused the order; the Reeve is never a monster, only a count that will not come
  out). No word games. No em dashes. ASCII. `{hero}` for the name.
- No git; bounded commands.
- Verify: `node qa/run.mjs content`; `python qa/content/preview_dialogue.py` on `rollcall_stones`, `mill_done` and `orrery_align`; read them
  aloud against the tone guide.
- Report under 400 words: scene and box totals per quest, any change to plan 5 and why, the contracts for maps (marks, inspect ids, spawn
  ids) and battle (encounter flags `barrow_reeve_defeated` and `millstone_golem_defeated`), and the Names-to-confirm table.
