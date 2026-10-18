# Playtest Review 1: pacing, clarity, difficulty, fun

Read-only design review, 2026-10-18. Sources: the design docs, the map previews, 45 autoplay frames and story shots, the clean run's 401 dialogue lines (`desktop-full-dialog.log` 1148 to 1562), both `desktop-*-last-game.json` save states, and `simulate.mjs --check`. Claims are tagged Fact, Reported or Inference where a decision rests on them.

## 1. The first 20 minutes

Basis: the bot's table at engine x3 with instant text; a reader at normal speed takes roughly three to four times the bot's game minutes (Inference; check: one timed human run from the title).

- 0:00 to 1:30. Title, name grid, six prologue cards. The key art carries it.
- 1:30 to 3:30. `wake_up`. Hazel in four boxes plus two Potions, six inspectables. The pale height marks are a quiet, good clue.
- 3:30 to 5:00. `fading_sign`. The first delight: the sign goes blank on the doorstep and Oren says "Oren. That's... me. I'm Oren."
- 5:00 to 8:00. `mael_intro`: twenty boxes and two choices before the player has done anything. The Register beat ("...Still there. Fainter than yesterday.") is the best line of the act, but this is the first drag.
- 8:00 to 14:00. Free roam. Tess, Wick and the Duke, Nella, the runaway starter, Hazel's mantle and Garrick's axe all open before the party exists. Charming, short loops, but a completionist spends ten minutes here with no fight (the bot alone spent 3.0 game minutes at instant text, Fact).
- 14:00 to 16:30. `mira_joins`. Iris forgets her name; "I've started writing it on my sleeve." Delight.
- 16:30 to 19:00. `south_gate`. "Garrick. Your father is Garrick, son." The strongest scene in town.
- 19:00 to 22:00. `leave_town` ("Then don't squint. Walk."), the valley banner, and only now the first fight, `e_wolves_a` (`valley_wolves`), which wanders at radius 3 and can be walked past.

Verdict: twenty minutes of excellent writing and zero combat. Every reference game lands a fight inside five minutes.

## 2. Clarity: can the player always know where to go?

Mostly yes, because of the Talk menu. The chain holds at every step: Mael's NPC line "Mira, at the library, east of the square. Then the south gate."; Talk in town "Out the south gate, then round through the valley. The Archive sits at its north end."; in the valley "Over the bridge, then follow the pilgrim road north. There is an old milestone at the fork."; F1 "The stairs down will be behind a locked gate... There'll be keys on this floor."; F2 "That voice is coming from deeper in the galleries."; after the Lantern "Where a path stops and the room seems to go on, raise the Lantern."; F3 "The big door needs a key the size of my hand. It's somewhere in these stacks." and "light the braziers. Dark rooms hide things."; before the boss, both tells in character. The Journal mirrors each step. Signs and banners do the rest.

Gaps:
1. The `first_visible_enemy` bark "It moves when we move. Watch it, pick your moment, then hit it first." fires in the valley, where enemies wander freely (DESIGN 5.2 makes the step rule dungeon-only). It is wrong where it is said and absent where it is true. Key it to `archive_f1`.
2. F1: the key is west (room C, pots and a block) while the critical door is east (plate room H, `keydoor_i`). A player who goes east first crosses the whole floor back. Add a Talk line once `gate_h` is open: "The key door. Back west, past the pots."
3. F3: nothing on screen or in Talk says the barred `gate_bk` wants all three crystals (`crystal_a`, `crystal_b`, `crystal_c`). Add Bram: "Bars mean a switch. Three crystals, three lights."
4. "Raise the Lantern" names no button; the reveal is automatic and the same green sparkle as a wall glyph (Reported, PLAYTEST 7.8). Give bridges their own `bridge_appear` moment.
5. Pit room: pits read as floor until the first fall (Reported, PLAYTEST 7.5).

## 3. Difficulty curve and the F3 spike

Facts from the simulator: every zone meets its targets; F3 careful play wins 100% in 3.1 to 5.4 rounds; attack-only wins only 34% (`f3_wraiths`) and 48% (`f3_golem`). Reported from the runs: three game overs on F3 at Lv 7 to 8 (run 1) and one Archivore loss at Lv 8 after 16 rounds, then a 19-round win (run 2). Fact from the save states: at the end of both runs the party still wore its starting gear while Mirrorguard Mail, Iron Pike x2, Chain Shirt x2, a Longsword and Lanternheart sat in the bag, and 8 Ethers were unused; frames 0033, 0035, 0039 and 0044 show MP 0/0/0 on all three members through F2 and F3. The bot's `menu_optimize_all()` runs once, in town, before any of that gear exists.

Inference: the spike the bot hit is "expected loadout never worn plus MP never refilled", not the encounter math. It still matters for humans: nothing prompts an equip, and the only MP refill between the town inn and the boss door is `keeper_font` at F3 (22,26), after all eight F3 fights; BATTLE.md 9 admits attrition is not simulated.

Recommendation, keeping every BATTLE.md target (the sim numbers do not move):
- Primary: when a picked-up piece beats the wearer's current one, the received toast offers "Equip?" with the right member preselected (Iron Pike to Bram, Chain Shirt to the hero, Mirrorguard Mail to Mira), as Chrono Trigger does.
- Placement: swap `e_cor_wraiths` (`f3_wraiths`, a two-tile patrol at (5,20), the only corridor from the western stacks to the bell hollow, so it cannot be avoided) with `e_ws_ink_b` (`f3_ink`, guard at (3,14) beside the letter). Plan counts stay 2/2/2/2.
- Only if a number must move: `ink_wraith` MAG 30 to 27, then `node tools/sim/simulate.mjs --check` must still print "All targets met".
- Check that settles it: rerun F3 with optimize after each floor's chests; expect zero or one game over.

The Archivore itself is right: 10.6 rounds careful, losable when telegraphs are ignored, and the run-2 loss follows the gear story.

## 4. Ten moments to protect, ten to fix

Protect:
1. `fading_sign`: the blank sign, Oren forgetting himself and laughing.
2. `mael_intro`: the Register, "Fainter than yesterday."
3. `mira_joins`: "Mira. It's Mira."
4. `south_gate`: Holt giving Garrick's name back, and his hourly promise.
5. `archive_door`: the hero's name gutters; Bram's mud pie witness.
6. `archive_f1_bell`: the toll from beneath the stairs landing.
7. `echo_warden`: stance reading, then "...keep... their names..."
8. `lantern_get`: "A lamp that finds things." and the first ink bridge.
9. `thirteenth_bell`: "Who did we just lose?"
10. The aftermath and return: Moth, the list with one name uncrossed, Holt shouting Garrick, Iris saying "First try." Also the BREAK word art and the "!" telegraph marker.

Fix (one change each):
1. Town front-loads four side quests and two farewells: start Tess, Wick and Nella only after `bram_joined`.
2. First fight at minute twenty and skippable: make `e_wolves_a` `chase` on the road at (14,33).
3. The valley bark teaches a dungeon rule: see 2.1.
4. No equip prompt on pickup: see 3.
5. No MP refill from inn to F3: add a Keeper's font at the F2 stairs room near (35,12).
6. Pits read as floor: a dark rim tile and one page seen drifting down before the first pit.
7. Game over retries at the map entrance: retry from the last `safe` point (font, pedestal, chapel).
8. The Whisperwood secret has no tell: give Quill a second line about "the pool past the pines where the pilgrims lost a bridge."
9. Nothing in the smithy is affordable at 80 gold: a 40-gold Leather Hood, or start at 100.
10. The ending reads as dusk, lamps unlit: a night palette with lit windows for `ending_hook`.

## 5. Missing professional beats

- A tutorial-free teaching fight: script the first wolf encounter so Mira's Appraise is free and reveals "spear", Bram's Lunge Breaks, and one bark says "Spear. Wolves hate it." One fight teaches weakness, Break and the timeline without a tutorial.
- A mid-dungeon breather: the F2 pedestal is `safe` but does not heal. A font and a save there, before the Warden, is what FF and DQ do before every mid-boss.
- A boss intro: the Echo Warden and the Archivore both get good lines but no camera pan, shake, music swell or title card before the swirl. `cutscene.js` already has every primitive needed.
- A reward after the boss: Lanternheart lands in the bag silently. Show it in the Victory window with the legendary beam DESIGN 7 asks for, and offer to equip it.
- A reason to revisit town mid-dungeon: the smithy restocks on `archive_f1_done` but the F1 shortcut only opens on `archive_f2_done`. Open `shortcut_f1` on `archive_f1_done` and let Nella's ferry make the trip two minutes; Garrick's "say it again when you are back" is already written for it.
- A fireside scene: three lines when the party rests at the Pilgrim's Rest campfire (39,22), the Chrono Trigger beat.

D:\LexiconQuest\next\docs\PLAYTEST_REVIEW_1.md
