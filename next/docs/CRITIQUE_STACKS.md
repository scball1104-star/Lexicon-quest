# CRITIQUE STACKS: the Deep Stacks, played

Read-only play review by C3-critic, Wednesday 2026-10-28 (Eastern), branch `overhaul`, `CAVE_LIVE = false` on disk and the pack forced
with `?cave=1`, `X1_LIVE = true` as on disk. Brief: `docs/briefs/C3-critic.md`. Every shot, log and rig is in `qa/cave/critic_out/`;
the phone file is `phone-stk-*`, its desktop twin `desktop-stk-*`.

Method (Fact): headless Chromium, phone 844x390 at 3x with the touch layout shown, then desktop 1920x1080, from an `ep1_complete` save
(`newGameEp2`) standing at the library door. Default settings (text speed 2, manual battle). Every battle command went through the
real menu (cursor, sub-list, target; 3,233 commands, 54 fell back to `battleAct`) after a 1.25 s think, chosen by a plain player's
policy: Feather the fallen, Mira mends under 50%, Fury when full, Channel when her MP is under 80%, Defend under a telegraph, else hit
the weakest foe. Reading pauses at 3.5 words a second. Running everywhere. The route fights every foe on a floor before it opens the
chests. Time is logic frames, so it is game time at the chosen battle speed.

What I played: phone seed 11, library to B30 (B1 to B5 and B15, B25 at 1x, the rest at 2x; every chest to B12, only short detours
from B13), closed and resumed on B7, banked at B30, a second reading to B2, Quit. Desktop seed 30, library to B10 at 1x then 2x,
banked at B10, a second reading to B5, a forced wipe after a blue find. Deep floors B45, B75, B95 at 1x and the Binder from real deep
states (the descent simulator's careful party, snapshotted on arrival, loaded through the title's Resume row). Small rigs: a blue
chest, a suspend in mid-fight, a refused floor, the hall's edges, field music after a fight, the Binder's phase change frame by frame.

Build note (Fact): at 10:09 the orchestrator's media pass changed `src/data/cave/foes.js` and `src/scenes/battle.js` (painted battle
stages for bands 2, 4 and 5). Every page I played booted before that, so the shots show the earlier stages; issues 2 and 16 are
checked against the files as they are now.

Tags: **Fact** = I saw it in a shot, a log, a run's JSON or a source line. **Inference** = my judgment.

## Verdict

**Five minutes (Fact for the clock, Inference for the feel):** yes. The hall at 0:11, Hollis done and B1 under foot by 1:15, the
first fight at 1:23 to 1:37, and "level one, empty hands" reads as a rule because Hollis says it and the empty Equip screen agrees.

**After B30 (Inference):** probably not. By hand B1 to B30 took 124 game minutes; Root Cellars fights average 7 rounds and none ended with
a member down, the field plays the victory loop after every won fight, and below B40 the same six Court foes return as elites for sixty
floors at 10 to 20 minutes a floor.

**A second reading (Inference):** the machinery earns it (the vault comes in, B1's foes are back, Resume is trustworthy), but the reasons
to return are thin: the first blue chest is B11 in 16 of 30 seeds, early uniques are weaker than Episode 2 gear, and a death can be
dodged by closing the app.

## The three 10/27 fixes

1. **Confirmed (Fact).** The second reading's B1 has 4 of 4 foes on both devices (`phone-stk-61-second-b1.png`,
   `desktop-stk-61-second-b1.png`, `stk_phone_s11.json` "second").
2. **Confirmed (Fact).** In the real fight the Binder swaps to `binder_loose` at 70% and `binder_binding` at 30% with no shim
   (`phone-stk-deep99-12-binder-look3.png`, `-look5.png`, `desktop-stk-shatter-2-08.png`, `desktop-stk-shatter-3-08.png`).
3. **Partly (Fact).** 318 B18 and 503 B3 now build, but seeds 601 to 700 still refuse 2 of 9,000 floors (612 B54, 687 B58,
   `gen_refusals.json`), and in the game that is issue 1.

## Ranked issues

B = blocker, M = major, P = polish. "Known" marks a DEEP_STACKS_BALANCE 7 item, ranked here, not re-reported.

| # | Where (device) | What I saw (Fact) | Why it matters (Inference) | Smallest fix (Inference) | Owner | Cost |
|---|---|---|---|---|---|---|
| 1 B | B52 stairs, run seed 612 (phone, desktop) | Stepping on the stairs throws CaveGenError out of `field.update`: the red "Something went wrong." panel, the floor tag reads B53 on the B52 map (`phone-stk-refuse-02-stairs-try1.png`, `desktop-stk-refuse-02-stairs-try1.png`). | About 1 full descent in 45 would meet it (2 per 9,000 floors; Inference) and the reading cannot go on. | After the last dressing attempt, build the floor with no optional dressing instead of throwing; `beforeDoor` catches and does not call `descend` before the floor exists. | gen, world | hour |
| 2 M | Every floor after the first win (desktop; phone rows agree) | After a won fight the field's track is `victory` and stays: Stacks B1 and Archive F1 both (`stk_audio_desktop.json`); 24 of 28 phone floor arrivals B2 to B29 log `victory`; the other four follow a resume or a band's new track (`stk_phone_s11.json`). | The Stacks sound like one endless fanfare; it is the base game's bug, and 100 floors amplify it (a by-ear check settles what is heard). | In `battle.js` `beginVictory`, the fanfare's `then` plays `victory` only while `!this.leaving && e.scene === this`. | world (battle.js) | minutes |
| 3 M | Any fight (phone, desktop) | Mid-fight the suspend save still holds the floor's arrival; closing the tab, the title offers "Resume the Deep Stacks (B1)" and puts the party back at the arrival with its arrival HP (`phone-stk-susp-02-title.png`, `-03-resumed.png`, `desktop-stk-susp-03-resumed.png`, `stk_suspend_phone.json`). | Death and its loss of blues become optional for anyone who closes the app, so call C only punishes honest players. | Mark the suspend `inBattle: encounterId` at battle start; a Resume from it restarts that fight. | state, world | hour |
| 4 M | Hall rules, the Bookmark (phone, desktop) | Before a fall nothing says this reading's blues go: rule 2 "a gift you may carry out", rule 3 "Fall, and it closes on you.", the Bookmark "Closes the book where you stand."; only after: "and this time what they gave" (`phone-stk-07-rule2.png`, `-08-rule3.png`, `desktop-stk-82-die-lost.png`). | A Lufia player expects blues to survive; learning otherwise after a 90-minute run reads as a trick. | Rule 3: "Fall, and it takes back what this reading gave."; the Bookmark: "Keeps this reading's blue finds." | story-ui | minutes |
| 5 M | B45, B75, B95 at 1x (phone) | 10.4, 20.0 and 17.1 game minutes a floor; 8, 11, 12 fights, rounds up to 13 (`stk_deep_phone_state_b45.json`, `stk_deep_phone_state_b75.json`, `stk_deep_phone_state_b95.json`, `phone-stk-deep75-02-arrival.png`). Known 6, worse than its 8-minute model. | Forty floors at that length is a chore, not a descent. | `foeCount` cap 6 from B40 and the EXP pace refit. | balance, gen | hour |
| 6 M | B40 to B99 (phone) | The same six Court foes for sixty floors (from B80 also one Tome Golem group); from B60 every group leads with a two-mod elite (B75 and B95: 23 of 23 fights elite) (`stk_deep_phone_state_b95.json`, `phone-stk-deep95-02-arrival.png`). | Depth stops meaning new foes, and the gold name stops meaning rare. | Until EP3_LIVE, bands 4 and 5 draw from all three earlier pools scaled up, elites 1 group in 3. | data | hour |
| 7 M | B1 to B29 by hand (phone, desktop) | 1x floors take 4.4 to 7.7 game minutes on B1 to B5; 2x floors average 4.8 on B11 to B19 and 6.6 on B21 to B29, where fights average 7.0 rounds (62% over 5) and none of 54 ended with a member down (`stk_phone_s11.json`). | The plan's 2 to 4 minutes and 3 to 5 rounds hold only for the simulator's careful policy; a plain player meets long, safe fights. | Band 2 `BAND_ADJUST` hp back to 1.0 and the band's power up a step, so fights are shorter and sharper. | balance | hour |
| 8 M | The bag, B30 and deep (phone) | At B30 the bag held 44 Potions, 38 Ethers and 13,520 gold unused; the sim party reaches B45 with no Potion or Ether and B95 with 1 Potion beside 62 Eye Drops, 62 Echo Herbs, 22 Antidotes, 17 Silver Salves, 24 spare Bookmarks; at the Binder its MP is 0, 5, 3 (`phone-stk-55-save-refused.png`, `phone-stk-deep45-03-items.png`, `phone-stk-deep95-03-items.png`, `phone-stk-deep99-11-binder-phase1.png`). Known 7, plus the drought. | Bands 1 and 2 drown in heals, bands 3 to 5 starve, and the deep fights shrink to Attack and Channel. | In the Stacks, foe drops give no cures; bands 3 to 5 consumables lean to Hi-Ethers and Hi-Potions. | data, balance | hour |
| 9 M | First blue chest (Node, 30 game seeds) | The first blue is on B11 in 16 of 30 seeds (`blue_floors.txt`), past the B10 landing that guarantees the first Bookmark. | Half of first readings banked at B10 keep nothing, against the plan's "never more than ten floors away". | Before the first landing the pity rule fires at `floor - last >= 9`. | data | minutes |
| 10 M | Uniques, deep and outside (Node) | The careful party wears 6 of 6 found at B45, 4 of 10 at B75, 0 of 12 at B95 (`deep_states_summary.json`); band 1 and 2 uniques trail Episode 2 and 3 gear (the Pen atk 16 against Lanternheart 24, `uniques_outside.txt`). | The prize of the blue chest is shelf filler deep and in the rest of the game, the part of Scott's sentence it must serve. | C4-uniques: each grade beats an item level 16 rare in its slot; Lesser beats the Episode 2 start's piece. | data (C4) | day |
| 11 M | The Binder, by hand at 1x (phone) | 26 rounds, 4.6 minutes, nobody fell and the party ended with more HP than it began (2,813 to 4,593), a Lv 60 party arriving with MP 0, 5 and 3 (`stk_deep_phone_state_b99.json`, `phone-stk-deep99-11-binder-phase1.png`). | The hardest fight in the game ends a 100-floor run as a long, safe slog. | Binder HP down a quarter and the telegraphed blows up a quarter, so care decides it, not patience. | balance | hour |
| 12 M | Title and hall (phone, desktop) | With a reading suspended the title offers both Continue (slot 0: the hall, no reading) and Resume (`phone-stk-susp-02-title.png`, `stk_suspend_phone.json`); Continue then Begin writes a new reading over the suspended one with no warning (Fact in code, `world.js beginReading`). | A B40 run can vanish with two ordinary choices. | Hollis's offer asks "A reading is open below. Abandon it?" when a suspend exists. | state, story-ui | hour |
| 13 M | B1 to B9 weapons (desktop) | On seed 30 Bram had no spear or axe through B9 and Mira no staff until B6 (`stk_desktop_s30.json` worn rows); early equip prompts are Short Swords and Leather (Known 4 still shows). | Bare hands explain the 7- and 8-round fights of the first floors. | The first red chest of B1 to B3 rolls a weapon for a member whose hands are empty. | data | hour |
| 14 P | Equip prompt (phone) | "Equip the The Binder's Quill on Arden?" (`phone-stk-deep99-equip-prompt.png`); seven unique names start with "The". | It is the run's best moment and it reads as a typo. | `maybeEquipPrompt` drops the article when the name starts with "The ". | world | minutes |
| 15 P | Red chests (phone) | Gold in every red chest (`phone-stk-blue-02-red-040.png`), nothing to buy, gone on exit; the Mantle of Kept Names doubles it. | Noise in the larder, and one unique's property does nothing. | Swap Stacks gold for a consumable roll; give Kept Accounts another property. | data | hour |
| 16 P | B1 to B19, the Binder (phone) | The Catalogue plays `archive` with `archive_hush` and fights on the Archive backdrop (`phone-stk-susp-01-losing-fight.png`); the Binder fights on the Archivore's stage in the Forge; the current `foes.js` still gives band 1 `archive` and the Binder `boss`. | The first band sounds like the dungeon the player just finished. | Band 1 takes another existing track; the Binder takes the forge backdrop. | gen, art | minutes |
| 17 P | B100 clear (phone) | Two equip prompts come between the Binder's fall and "The Binder comes apart...", while the Quill's chest sits unopenable on the dais (`phone-stk-deep99-equip-prompt.png`, `-binder-cleared.png`). Known 10 still shows; no B100 plaque. | The last line of a 100-floor run arrives after two shop questions. | Defer drops past `binder_cleared` (H6's `pendingDrops`), drop the chest, add the plaque sign. | story-ui, world | hour |
| 18 P | Binder phase change (phone, desktop) | The swap plays the King's grey glass shatter and `glass_break` (`phone-stk-shatter-2-04.png`, `desktop-stk-shatter-2-06.png`). | A paper boss breaking like glass. | A page-burst fx and a paper-tear sound for this boss. | art | hour |
| 19 P | B1 (phone, desktop) | Bram's "It moves when we move", Mira's lens hint and the first-chest line replay (`phone-stk-dialog.log`): `newGameEp2` sets no bark counters. | Tutorials for veterans; the title's Episode 2 start does the same. | `newGameEp2` marks the Episode 1 barks seen. | state | minutes |
| 20 P | Second reading (phone, desktop) | The vault waits unworn in the pack; Hollis says so once per save (`phone-stk-60-vault-reminder.png`, `-62-second-equip.png`). | From the third reading a player walks B1 bare-handed beside his own uniques. | The equip prompt for each vault unique on B1's arrival. | story-ui | minutes |
| 21 P | Hall (phone) | Hollis speaks with a name tab and no portrait (`phone-stk-06-rule1.png`). | The one new character of the pack looks unfinished. | A 48 px head. | art | hour |
| 22 P | Title (phone) | With Resume and Episode 2 rows the window covers "The Reforged Realms" (`phone-stk-30-title-resume.png`, against `phone-stk-deep45-01-title.png`). | The first screen loses its subtitle. | Move the window down or tighten the rows when there are five. | story-ui | minutes |
| 23 P | Equip, B45 (phone) | "Sturdy Chain Shirt of the Bea..." runs past the left panel's edge (`phone-stk-deep45-04-equip-body.png`). | Deep loot names are long; this will be common. | Clip or shrink names to the panel. | story-ui | minutes |
| 24 P | Quit and Save in a reading (phone) | The question prints over the menu's own help line, both visible (`phone-stk-70-quit-ask.png`, `phone-stk-55-save-refused.png`). | Two sentences on one line at the moment that matters. | Clear the help bar while the box is up. | story-ui | minutes |
| 25 P | Plaque screen (phone, desktop) | Each unfound unique reads "..." above "Not yet found." (`phone-stk-hall-06-plaque-screen.png`, `desktop-stk-hall-06-plaque-screen.png`). | Reads as a missing string, as H6 found on the Ledger. | Drop the dots. | story-ui | minutes |

Not ranked: Known 5 (Auto Defends to death; I played by hand), Known 8 (bands 4 and 5 retune when EP3 goes live, issue 6 is its
player side), Known 9 (a stale QA record).

## Five things that work and must not be touched

1. **Hollis and the rules.** One idea a box, never over two lines, dry and kind; the empty Equip screen right after makes the reset a
   rule (`phone-stk-06-rule1.png`, `phone-stk-13b-equip-empty.png`).
2. **The blue chest and the bank.** The orange beam and toast, then "Four names kept. The Stacks noticed."
   (`phone-stk-blue-01-blue-040.png`, `phone-stk-52-hollis-kept.png`).
3. **The floors look hand-made.** Beside Archive F2 a B15 window holds up, and the bands change the look (`cmp-win-archive_f2.png`,
   `cmp-win-b15.png`, `cmp-b25.png`, `phone-stk-deep45-02-arrival.png`).
4. **Resume.** One titled row, the floor's arrival with its banner, the seed kept (`phone-stk-30-title-resume.png`, `-31-resumed.png`).
5. **The Binder's phases.** "The stitching gives..." and "It burns its own pages for thread..." with a card each, three looks, the B100
   ribbon on the title after (`phone-stk-deep99-12-binder-look2.png`, `-look4.png`, `-21-title-after.png`).

## Timings (game time; first five minutes from the library door)

| Beat | Phone | Desktop |
|---|---|---|
| The mezzanine, trapdoor in view | 0:07 | 0:06 |
| The hall | 0:11 | 0:09 |
| Hollis's first line (fully typed) | about 0:31 | about 0:29 |
| Go down, B1 arrives | 1:15 | 1:10 |
| First fight | about 1:37 | about 1:23 |
| First chest (the route fights first) | about 4:38 | about 4:51 |
| B1 done | 6:04 | 6:11 |
| B5 done | 26:19 | 30:17 |

| Floor at 1x | Phone | Desktop |
|---|---|---|
| B5 | 5.7 min (4 fights) | 5.7 min (4 fights) |
| B15 | 4.5 min (5) | not played |
| B45 | 10.4 min (8) | arrival only |
| B75 | 20.0 min (11) | arrival only |
| B95 | 17.1 min (12) | arrival only |
| The Binder | 4.6 min, 26 rounds | phase frames only |

No dialogue box ran over two lines; nothing overlapped the touch bars (Fact).

## Scott's open calls, as my play would answer them

- **A. Name.** Keep "the Deep Stacks": the plaques, Hollis and the Journal line all carry it well.
- **B. When it opens.** Keep after the credits; the level 1 reset makes timing irrelevant to balance, and early uniques are already weak.
- **C. Death.** Keep the default only with issue 3 closed and issue 4 said up front; as it stands, Lufia's rule is the fairer one.
- **D. Suspend.** Keep it: B1 to B30 was two game hours, a full clear well over ten. Make it honest (issue 3).
- **E. Uniques.** Scott's answer fits what I saw: sixteen were unworn by B95, so the grades must out-score rolled gear (issue 10).
- **F. B100 prize.** The Quill and the ribbon arrive; a credits line is not needed if the clear's last line comes first (issue 17).

## Not tested

Sound by ear (audio state only); real finger gestures (injected actions, touch layout shown); the tablet layout; Auto battle; a natural
wipe (none came in 47 floors by hand; the wipe was forced); B30 to B44 and B46 to B74 by hand; EP3-live pools.

## Fixed (C4-fixes, 2026-10-28)

`docs/briefs/C4-fixes.md`, in rank order. Rigs: `python qa/cave/fixes_rig.py` (phone, then desktop: issues 1, 3, 4, 12, 17 in the real
game) and `python qa/cave/fixes_ui_shots.py` (23, 24); shots in `qa/cave/fixes_out/` (`<device>-fix-NN-*.png`, `_page.png` the whole
page). Node: `qa/cave/fixes_world.test.mjs`, `qa/cave/fixes_balance.test.mjs`. Numbers: `docs/DEEP_STACKS_BALANCE.md` 9.

| # | Done | What changed | Proof |
|---|---|---|---|
| 1 | yes (world half; the generator half was the orchestrator's) | `world.js` builds the next floor BEFORE the run moves; a refusal is built once more from a derived seed (`floorSeedAgain`), a second refusal keeps the party, the run and the tag on the floor with one line (`stair_stuck`), never a red panel; the tag reads the map on screen | fixes_world 1 to 3; `*-fix-02-stair_refused` |
| 2 | earlier (orchestrator) | | |
| 3 | yes | the suspend is written at every battle start with `run.inBattle` and after every fight with `run.gone`; Resume restarts that fight where it began, the party as suspended, the beaten foes gone | fixes_world; `*-fix-03` to `-06` |
| 4 | yes | rule 3: "Fall instead, and the Stacks take back this reading's gifts."; the Bookmark's line and its question say the gifts come up with it | story_text, fixes_world; `*-fix-01-rule3` |
| 5 | yes | at most six foes a floor from B40, the EXP pace refit | fixes_balance; model 5.9 / 8.2 / 9.0 to 4.5 / 4.1 / 3.8 min at B45 / B75 / B95 |
| 6 | yes | until EP3_LIVE bands 4 and 5 draw all 25 earlier groups, each at its own level, an elite one group in three | data_foes, fixes_balance |
| 7 | yes | the Root Cellars hp 1, power 1.15 | 3.59 / 3.84 to 3.37 / 3.45 rounds (B20s / B30s) |
| 8 | yes | no cures from foes, the deep larder Hi-Potions and Hi-Ethers, Feathers rarer, one spare Bookmark | B90 bag: every mean under a dozen (was 69 Eye Drops) |
| 9 | yes (C4-uniques' `BLUE_PITY_FIRST`) | pinned: the first blue by B9 on 200 seeds | fixes_balance |
| 10 | C4-uniques | | |
| 11 | yes | the Binder HP 3000, MAG 4000, SPD 66: careful wins 98% in 9.4 rounds, ignoring the telegraphs 77% (was 93%) | sim 300 seeds; data_sanity |
| 12 | yes | Hollis: "A reading is open below. Abandon it?" Keep it keeps it | fixes_world; `*-fix-07`, `-08` |
| 13 | yes | the first red chest of B1 to B3 lends a bare-handed reader his kind of weapon; B1 to B5 drops draw every weapon kind | fixes_world, world_hooks |
| 14 | yes | `field.js` drops a leading "The " from the name in the prompt | `*-fix-11-quill_prompt` |
| 15 | yes | no gold in red chests (a gear chest may carry a supply); Kept Stores was C4-uniques' | data_loot |
| 16 | yes | the Catalogue plays `orrery`; the Binder fights on the Forge's painted stage | fixes_world |
| 17 | yes | the Binder's lent drops never prompt; "The Binder comes apart..." then the hall's lines, then the Quill's own prompt; the Quill chest gone; the B100 plaque in the antechamber | fixes_world (mapcheck); `*-fix-09` to `-11` |
| 18 | no (art gap) | the page-burst fx and a paper-tear sound need a new fx kind in the precached animator and a new SFX; nothing in the sheets fits | |
| 19 | yes | `newGameEp2` marks seven Episode 1 lesson barks seen | ep2 tests |
| 20 | yes | B1 of a reading that brought the vault down asks "The vault came down with you. Put it on?", then Optimize for every member | fixes_world |
| 21 | no (art gap) | Hollis's 48 px head: no existing portrait is his (npc_scholar has no head) | |
| 22 | yes | five or more touch rows lift the logo (to 10 px) and then tighten the rows; the window never covers the subtitle | `phone-fix-04-title_resume` |
| 23 | yes | the Equip slot names fit the panel (journal.js `fitLine`) | `phone-ui-equip_long_name` |
| 24 | yes | the menu draws no help line under its own question box | `phone-ui-quit_question` |
| 25 | yes | no "..." above "Not yet found." | ui_stacks |
| Known 4 | yes | `battle/loot.js` `rollBase` keeps slot and type below every base; Stacks elites drop at the floor's item level | fixes_world |
| Known 5 | yes | Auto Defends at low HP only while a heal or a Feather is coming | fixes_balance |
| Known 7 | yes (with 8) | | |
| Known 9 | yes | `qa/cave/out/cave_sanity.md` regenerated | |
| Known 10 | yes (with 17) | | |
