# Playtest Review 2: the build after Waves 5 to 8

Read-only design review, 2026-10-20. Sources: `PLAYTEST_REVIEW_1.md`, the latest autoplay (report and save of 09:24 to 09:38, 56 frames: 36 fights, 0 game overs, Lv 10, in-game clock 24.8 min), `qa/out/` shots, the Hollow map preview, the data files, `simulate.mjs --check` ("All targets met") and two ad-hoc sim runs. The bot never entered Whisperwood Hollow (its save has no hollow chest and no thornback, blot or alpha in the bestiary), so the Hollow is judged from map, scenes, tests and sim, not from play. Claims are tagged Fact, Reported or Inference.

## 1. The first 20 minutes

Bot clock (engine x2, instant text): wake 0:13, Mael 0:26, Mira joins about 2:25, Bram about 3:00, valley 4:08, Catalog Halls 8:08 at Lv 4.

- Review 1's worst gap is closed. The first fight is scripted on the valley road (`first_fight_trig` covers all of column 7), with Bram's Lunge tip, Mira's free Appraise and "Spear. Wolves hate it." (Fact).
- Boxes before the first blow: wake_up 9, fading_sign 10, mael_intro 18, mira_joins 18, bram_joins 21, two farewells, leave_town, valley 4 (Fact, counted in `ep1.js`). About 100. At normal reading speed that is roughly 10 to 13 minutes, down from 19 to 22 (Inference; check: one timed human run from the title).
- `mael_intro` is still the first drag: 18 boxes and 2 choices before any input that matters.
- The tail is the mirror: `archivore_after` 27 plus `return_to_willowmere` 31 boxes with one choice, about 100 boxes after the last hit (Fact).

## 2. Clarity

Review 1 gaps 1 to 3 are fixed: the enemy bark is keyed to `archive_entered`, Mira names the key door, Bram says "Bars mean a switch." Still open: a revealed bridge has only a sound (`bridge_appear`, `events.js:643`), no visual moment. New gap: `lantern_get` never mentions the pool. Quill, the pilgrim note and the journal carry the Whisperwood pointer, but at the moment the player gets the Lantern nothing says "go back" (Fact).

## 3. Difficulty

- Fact: every zone meets its targets. F3 attack-only still wins 34% and 48%; the Archivore is 10.4 rounds careful (99%), 80% when ignoring telegraphs. The bot reached the Archivore at Lv 8 with no game over, where run 1 had three (Inference: equip prompts, the F2 font and the F3 swap did it).
- Fact: 35 ordinary live fights averaged 5.5 rounds (valley 5.2, F1 4.8, F2 7.4, F3 5.1) against a 3 to 5 target and about 4 in the sim. A blind bestiary costs the sim only 0 to 0.6 rounds, so that is not the cause. Inference: attrition and elites.
- Hollow, Fact from the sim: wolves 3.2 rounds, blots 4.7, Alpha 7.9 and 7.4 careful at Lv 6 and 7 (the same band as the Echo Warden). Attack-only wins the Alpha 10% at Lv 6 and 52% at Lv 7, but 99% at Lv 9 and 100% at Lv 10 (ad-hoc, n=150). A party that comes after the Archivore, as the bot ended, walks it.
- Inference: the Alpha's design is good. Fire and axe are taught in the fiction ("thorns part for an axe"), it telegraphs a pounce, calls a wolf at 50% and hastes at 25%. The risk is timing, not tuning.

## 4. Ten moments to protect, ten to fix

Protect:
1. `fading_sign`: "Oren. That's... me." 2. The Register: "Fainter than yesterday." 3. "Mira. It's Mira." and the sleeve. 4. Holt returning Garrick's name, paid off by "say it again when you are back." 5. The first wolves: Lunge, free Appraise, "Spear. Wolves hate it." 6. The Echo Warden stance reading and its last words. 7. "A lamp that finds things." 8. "Who did we just lose?" 9. Hollow: Mira's "Briar burns" intro, then Sorrel, Ansel, Wren, and Bram saying them aloud (from script, not played). 10. The night ending, now with lit windows, and the Moth and Holt callbacks. All lines still fire in the logs (Fact).

Fix, one change each:
1. The F2 font is behind the Lantern, not before the Warden. Its bridge (30 to 32,14) is hidden ink, and the bot logged "cannot reach keeper_font_f2" from (4,25) pre-Lantern (Fact). F1 and F2 up to the Warden have no rest point. Add a font in the F2 entry hall near (20,6).
2. The Hollow has no rest point and the retry lands on its stairs (2,13), likely with the three foes back (Inference; check: lose to the Alpha on purpose). Mark the `gate_b` crossing as a landmark, as the field does for `kind: 'stairs'` doors (`field.js:266`).
3. The Alpha is level-blind. After `lantern_get`, if `lost_bridge_started`, Bram says "Quill's pool, east of the fork." so the Hollow is met at Lv 7, not Lv 10.
4. The Alpha's cutscene actor is the plain `briar_wolf` sprite, though the narration says "huge" and `briar_alpha` field frames exist (Fact, both 24 x 24). Use them and ask for a 2x avatar like `archivore_avatar`.
5. Autoplay never plays the Hollow. Add a `hollow` step after `lantern` and assert Thornwake and `hollow_cleared`.
6. Live fights run long. Log MP% and elite flag per fight in the report, then decide what to trim in F2.
7. Gold has no sink: 1,377 at the Lantern, 2,906 at the end (Fact); shops restock only on `archive_entered`, `archive_f1_done`, `echo_warden_defeated`. Add one tier on `archive_f2_done`.
8. The post-boss tail: cut `return_to_willowmere` from 31 to about 20 boxes, keeping Moth, the list, Holt and Iris's "First try."
9. Texts bake in `{i:btn_pageR}` as the Lantern button (`lantern_get`, `hollow_entry`). W9 turns pageR into an ability wheel (Inference): keep the Lantern in slot 0 and test that the printed button raises it.
10. Cut `mael_intro` to about 12 boxes by moving the Archive background to Talk.

## 5. What a player would miss against Lufia II and Chrono Trigger

- Field verbs. Lufia's tools are the dungeon vocabulary. Today there is one, the Lantern, then F3 repeats the pot, block, plate and crystal verbs. W9 is the right fix; place each ability's use before its reward.
- A reason to keep playing after the credits. The final save sits in Willowmere with only the Hollow left. There is no New Game+ (no match in `src`), no arena and no gold use. Chrono's second run and Lufia's Ancient Cave are what the player gets here, nothing.
- Per-character quests. Bram's Emberpeak is a campfire story, not a quest, and Mira has none. Chrono gave each hero one.
- Recruits. The party is three from minute 15 to the end; Chrono keeps adding people. Episode 2 should add one.
- A late-game spectacle gap: the Victory window's legendary reveal is not confirmed in the shots (unverified).
