# X2-story: the Episode 2 expansion script, cast and quests (X2 wave XA; may run earlier, see below)

Write the words of the Mere Country. Read `docs/briefs/COMMON.md`, `DESIGN.md`, `docs/EXPANSION_RECONCILIATION.md` (the decision log), `docs/story/EPISODE2.md` (tone and canon), `docs/EXPANSION2_PLAN.md` sections 1, 3, 7, 8, 9.6 (quest EXP) and 13 (your contract),
`docs/briefs/XP-packs.md` (how your modules are registered), `docs/story/STAGING_EP2.md` (the staging shape) and for voice `docs/story/EPISODE1.md` section 4. Model the code on `src/data/story/ep2.js`, `src/data/quests.js` and the Episode 1 expansion's finished `src/data/x1/*` (read `docs/story/STAGING_X1.md` so the two
expansions do not read alike: Episode 1 owns barrows, counted names and lettered stones; yours are lamps, reeds, errands and caches).

**Early start.** You write only new files, so you may run before the Episode 2 art, battle and world agents: from the moment X1 wave W3 has closed (X1-story and XP-packs done), at any time before XA. You never touch a file another running agent owns.

## Items, in order

1. **`src/data/x2/story.js`**: every scene of plan 3.5 (about 42, including the parameterized `x2_cache_set`), cutscene API only, registered through `registerStory({ scenes, lines, conditions })`, guarded in `SCENE_CONDITIONS` and locked like `ep2.js` (also requiring `x2On()`); exports `scenes`, `lines`,
   `SCENE_CONDITIONS` and a `register()`. `lines` covers every inspect id the maps will use (signs, the spyglass, the telescope, the slate, plinths, the quiet cairn, the three hollow cairns, the scope, the toll sign and box, the crypt hatch, the cradle, the tide mirror, the seven chalk spots, the four boss approaches, the Cottage wicks,
   the Court secrets' tells, the Weald's blazed birches and Harn's map board). **Quest EXP is a small bonus**: quest-ending scenes call `await s.give('exp', n)` (built by X1-world; stub if absent) with Q1 6, Q2 4, Q3 8, Q4 4, Q5 4, Q6 8 (34 in all), once, behind the quest's `done` flag; X2-battle may lower an amount if its ledger needs it.
2. **Box budgets**: at most 10 boxes per side scene, 14 for the four boss intros and `x2_light_lit`; about 330 in all; counted in a test. Every box at most 3 lines of 42 characters.
3. **`src/data/x2/npcs.js`**: `X2_NPCS` (maren, dunn, bett, marit, ines, harn), `X2_TALK_PREPEND` (penny_e hints only, tovin, orla, anwen, nico, fitch, vessa, lena, wren, tess, mael; each entry carries its own flags so it never shadows an existing line), `X2_SPEAKERS`; `register()` adds the records and applies the prepends through `prependTalk`. Voices from plan 8. Nobody says a name the player has not learned.
4. **`src/data/x2/quests.js`**: `X2_FLAGS` (plan 3.2, one-line meaning each), `REWARDS_X2`, the six quests of plan 7 as `SIDE_QUESTS_X2` (**Q1 is Strangers' Stores, `strangers_stores`**: `x2_stores_started`, `x2_cache_quarry`, `x2_cache_heron`, `x2_cache_light`, `x2_stores_done`, the counted key item `cache_tin`, reward `cairnwalker_mantle`; steps, journal text, map-aware Talk, counters for Q1 (3), Q4 (4) and Q5 (7)), `X2_BANTER`;
   `register()` assigns into `FLAGS`, **pushes onto `FLAG_IDS`**, pushes onto `ALL_SIDE_QUESTS` and assigns `BANTER`. Talk after `ep2_complete` names the next open leg. No giver is Penny, Garrick or any NPC Episode 3 hides.
5. **`src/data/x2/text.js`**: banners (plan 3.1), books `maren_ledger`, `quarry_note`, `cistern_note`, `x2_slate`, barks `first_boardwalk`, `first_ink_bridge_water`, the bestiary entries for the 14 new records (the ordinary quarry foe is `delver_shade`); `register()` assigns into `BANNERS`, `BOOKS`, `BARKS`, `BESTIARY`.
6. **`docs/story/STAGING_X2.md`**: who stands where, marks, props, camera and music for every scene, and a section "4. Marks and named events checklist" in the shape `loadStaging` parses.

## Rules

- Owned paths: `src/data/x2/story.js`, `quests.js`, `npcs.js`, `text.js`, `docs/story/STAGING_X2.md`, `qa/content/x2_*.test.mjs`. `src/data/x2/index.js` and `live.js` are XP-packs'; your modules just export `register`. No edits to `quests.js`, `npcs.js`, `text.js` or `story.js` in `src/data/`.
- No word games, ever. No em dashes. ASCII only. `{hero}` for the name. No git; bounded commands. Music cues name the new tracks (`x2_*`, with `x2_weald` and `x2_shore` separate) with the plan's fallbacks and return to the map track.
- Tests (`qa/content/x2_*.test.mjs`): ids unique across all episodes and against Episode 1's registry, flags declared, box limits and budgets, no em dash, every inspect id has `lines`, no quest depends on a flag nothing sets, Q4 and Q5 stay completable with `ep3_started` set, quest EXP granted once with the amounts above.
- Verify: `node qa/run.mjs content`; `python qa/content/preview_dialogue.py` on `x2_lamplighter`, `x2_light_lit`, `x2_ines_done`; read them aloud against `ep2.js`'s register.
- Report under 400 words: scene and box totals, the flags and scene ids maps must use, any change to plan 7 and why, the Talk hint ids, anything the maps must stage.
