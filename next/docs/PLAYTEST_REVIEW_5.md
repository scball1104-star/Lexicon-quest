# Playtest Review 5: Episode 3 on a phone, from an Episode 2 save and from the quick start

Read-only fresh-eyes review, Monday 2026-11-02 (Eastern), checkout `D:\lq-e3review` at commit 0e9911a, where `EP3_LIVE`
is false. Episode 3 was reached the way E3-integrate reached it: `shots.py`'s server with `LQ_EP3_LIVE=1` (a local copy
of the switch, the file on disk untouched) and the `LQ_DEBUG` harness. Sources: the four E3-integrate autoplay runs
(`D:\LexiconQuest\next\qa\out\autoplay\{desktop,phone}-ep3{,-new}-report.json` and `-dialog.log`, 2026-11-02 21:12 to
21:59), `qa/integrate/story_time.py` re-run on all four, `tools/sim/simulate.mjs --zone foundry_f2` and
`--zone foundry_heart` (both "All targets met"), the E3-integrate phone shots, the map previews in `tools/maps/previews`,
and the code named below. New evidence: eight short headless sessions on the phone profile (844x390 at 3x, `is_mobile`,
touch), menus driven by real key presses and real touch taps (no `battleAct`): s1 to s1c the title, the Load page and
the save rule; s2 the start state of every quench puzzle; s3 the road sluice and the F1 dam crate solved by keys; s4 to
s4d the Cinder Warden's command menu, telegraphs and phases. Scripts, logs and PNGs are in `qa/out/review5/play/`.
Claims are tagged **Fact** (seen in a render, a log or the code), **Reported** (from a plan, a report or the bot) or
**Inference**.

Not repeated here: anything the critic (CRITIQUE_5, running beside this) owns on art: the ash tint, floor identity,
foe visibility on ash, the Warden's silhouette.

---

## 0. Verdict

Episode 3 plays end to end on a phone from both starts with no softlock, and its best ideas land: crust that stays
cooled, Bram's mother's name on the Bell Gate, the Oath line before the boss, a quick start that refuses rather than
overwrite (Fact: 4 autoplay runs, 0 game overs, 0 errors; s1c). Three things stand between it and the bar. (1) **The save
rule can still be broken from Continue**: loading an Episode 2 Record and walking out of the inn wrote over a different
run's autosave with no prompt (Fact, s1b). (2) **Tempered Oath, the boss's central decision, is hard to find on a phone**:
it is the 8th of 8 Techs, below the fold, its help line is covered by the list, and the Last Hammer telegraph never names
Bram (Fact, s4c, s4d). (3) **Pacing is over the target** on the repo's own timer, 86 to 126 minutes against 60 to 90, and
the first fight comes 4.8 to 6.3 minutes after the morning against under 5 (Fact, re-run). About half the overrun is the
timer over-counting one-paddle puzzles (Inference, section 1); the rest is fights and walking, and section 1 names the
trims. Quench is readable without text but shallow: no puzzle needs more than two paddle turns.

---

## 1. Pacing: the clock, and what to trim

**The timer, re-run (Fact, `qa/out/review5/play/timer_2026-11-02.txt`).**

| Run | Battles | Pages | Estimate | First fight after the morning |
|---|---|---|---|---|
| desktop, Episode 2 save | 22 | 298 | 90 to 122 min | not measured (no marks) |
| desktop, quick start | 20 | 317 | 87 to 117 | 4.8 to 5.6 min |
| phone, Episode 2 save | 19 | 300 | 86 to 117 | 4.9 to 5.7 |
| phone, quick start | 22 | 314 | 93 to 126 | 5.4 to 6.3 |

This matches E3-integrate's "86 to 122" and "4.8 to 5.7" for the first three runs; the phone quick start (21:59) is the
slowest run and was not in that range (Fact). Where the minutes go in the phone quick start: dialogue 24.0 min, field
30 to 40, puzzles 18 to 36, battles 21 to 25 (Fact).

**The puzzle term is over-counted (Inference, cheap check named).** `story_time.py` gives every distinct `quench` note
1.5 to 3 minutes. The run's notes say how many turns each took (Fact, report notes): road 2, F1 slag hall 1, F1 dam 0
(one Shove), F1 shaft 1, F1 wheel 2, F2 gates 1, F2 series 2, F3 east pair 1 and 1, F3 Hand 1 then 1 (two notes, one
puzzle), F3 Home 0 (one Shove). Seven are a single action a player sees and does in 30 to 60 seconds. Weighting those at
0.5 to 1 minute gives 9.5 to 19 minutes instead of 18 to 36, which takes **8 to 17 minutes off** every estimate: about
78 to 109 for the phone quick start. Check: time one first-time human on F1, or change the weight in `story_time.py` to
use the turn count (S).

**The first fight (Fact, `seg.py` on the logs).** From the end of `ep3_morning` to the end of `sr_first`: 87 game seconds
of bot field time (62 of it crossing Hollowmere from the inn to the east gate, 25 on the road), 22 to 28 pages, and the
fight (0.7 to 1.1 min). The road is not the problem: `first_fight_trig` is a column at x 6, five steps from the entry
(Fact, `sand_road.js` line 110). The walk across town and the gate scene are.

**Trims to land 60 to 90, in order (sizes; savings are Inference on the timer's own rules):**

| # | Trim | Where | Saves | Size |
|---|---|---|---|---|
| a | Weight puzzles by turns in the timer (above) | `qa/integrate/story_time.py` | 8 to 17 min of estimate | S |
| b | End `ep3_morning` with a fade to the east gate, so `sand_gate` plays on arrival; Aurel stays an optional talk | `src/data/story/ep3.js`, `nameless_hollow` | 1.5 to 2 min; first fight lands at about 3.3 to 4.5 | S |
| c | Gate scene 8 boxes to 5 (keep Vessa's chain line and "Throw these at anything that glows", drop Penny's repeat and one Smith/Bram exchange) | `ep3.js` `sand_gate` | 0.3 min | S |
| d | Cut 4 ordinary field foes: sand road 4 to 3, F2 6 to 4 (the plan says 5), F3 5 to 4 | `src/data/maps/ep3/*.js` enemy lists | 4 to 5 min, and the Warden is met at Lv 16 as planned instead of 17 | S |
| e | Emberpeak arrival chain (Veyra 9, memorial 7, Ilya 12 boxes, 5.1 min of reading with the coolant errand) to about 20 boxes; put Harl at the coolant station so the errand is two houses, not three | `ep3.js`, `emberpeak.js` | 1.5 to 2.5 min | S to M |
| f | Pre-Warden 8 boxes to 5 (keep "THE FIRE MUST NOT GO OUT", the choice, Bram's line, Mira's Oath line) | `ep3.js` line 575 on | 0.3 min | S |

With a to d the phone quick start comes to about 70 to 100; with e and f about 68 to 97 (Inference). If the next timer
still sits above 90 at the high end, the plan's own Cut 3 (merge F2 into F1) is the only lever big enough (10 to 12
minutes) and it is a story decision for Scott, not for E3-fixes.

---

## 2. Quench: clarity without text, and does it feel different from the beams

I placed the party at the natural approach to every puzzle with no dialogue open and looked at the phone frame
(`qa/out/review5/play/s2-*.png`; Fact for what is on screen, Inference for what a newcomer concludes).

| Puzzle | At rest, no text | Verdict |
|---|---|---|
| Road (`s2-01`) | Spout, paddle, water running left into a pool, a slag river beside it, a dry trough crossing it | Clear: the dry trough points at the slag |
| F1 slag hall (`s2-02`) | Water splashes left at a puddle; dry trough runs right to a glowing slag column | Clear |
| F1 dam (`s2-03`, `s3-06`) | Water stops at a crate in the trough; a dry trough and a basin beyond | Clear, and Shove fires from context with one press (Fact, s3). But the basin opens `hg_c` ten tiles north, off screen, with no camera pan (Fact: no pan in `quench.js`); Mira's "Full basin, cooled grate" names a grate the player cannot see |
| F1 wheel, F2 gates, F2 series (`s2-05` to `s2-09`) | Visible wrong outlets (puddle at 26,5 in F2), the long dry trough down to the moat | Clear. F2 gates starts with one basin already filled (Fact, `LQ_DEBUG.quench()`), so it is one turn |
| F3 Hand (`s2-10`) | Two paddles, a slag column, two slag pools | The one real sequence: cross the column, then choose a pool. Reads, in the F3 dark, because slag is the light |
| F3 Home (`s2-13`) | Water falls past a dry branch trough; a crate sits one tile off the stream | Clear once you have done F1's dam |

**Different from the beams? Partly (Inference).** Permanence is real and felt: the road tongue crusted 72 cells in one
turn and stayed (Fact, s3), and the bot's mid-foundry reloads kept crust, basins and gates (Reported). Dams are new and
the context Shove makes them phone-friendly. But no puzzle needs more than two paddle turns (Fact, turn counts above),
and only F3 Hand needs an order. The plan's promise, "cool this, then redirect to that", is taught once and never
tested. A newcomer will finish the foundry thinking quench is the beam with a nicer floor.

---

## 3. Difficulty: the Specter and the Warden

Simulator, this checkout (Fact, `qa/out/review5/play/sim_bosses.txt`):

| Boss | Lv | competent | reckless | naive | rounds (competent) | HP lost |
|---|---|---|---|---|---|---|
| Bellows Specter | 15 / 16 | 99% / 100% | 63% (Lv 15) | 0% / 0% | 8.1 / 7.7 | 19% |
| Cinder Warden | 16 / 17 | 99% / 99% | 71% (Lv 16) | 0% / 0% | 12.7 / 11.6 | 19 to 21% |

Oath used on 55% of Last Hammers by the competent policy (Fact). The bot met the Warden at Lv 17 in three of four runs
(Fact) against the plan's Lv 16, because it fights every visible foe (trim d fixes this).

Read as a first-timer (Inference): both bosses are a cliff, not a slope. A player who answers the telegraphs barely gets
hurt (19% HP); one who does not loses every time (naive 0%), and reckless, who throws items, wins 63 to 71%, above the
plan's "attack-only 60% or less" if reckless is the attack-only line. With Retry keeping progress and a font one room
before the Warden, the cliff is survivable; the fix is making the answer findable (fix 2), not changing numbers.

What I saw on the phone in the Warden fight (Fact, s4d): the first telegraph reads "The Cinder Warden raises its hammer
over Bram..." with three gold Heat pips lit above the weakness row, clear and not over the body; the phase-two coil is
its own small shape with its own row; the Last Hammer reads "The Cinder Warden raises the Last Hammer. The whole forge
holds its breath..." and the Heat pips show 1 of 3. At that moment Bram had exactly 8 MP, which is the Oath's cost,
only because Auto had been holding it (`ai.js` line 1132). A human who spent Bram's MP on Lunge and Shatter (both 3 to 6
MP) has nothing to Oath with, and nothing tells them to save it.

---

## 4. Ten to fix, ranked by player impact

Sizes: **S** = hours, data or one file. **M** = about a day for one agent. **L** = several days.

1. **Continue from an older Record overwrites another run's autosave.** (S for the guard, M for the clean version)
   - Where: `scenes/loadGame.js` `load()` (lines 72 to 90) never sets `g.autosaveSlot`; `game/state.js` line 41 defaults
     it to 0 for every Episode 1 and 2 run; `scenes/field.js` line 300 autosaves there on every map change.
   - What (Fact, s1b): slot 0 held "Cora Lv 9, Home, 0:25" (an Episode 1 run); Record 1 held "Arden Lv 14, The
     Signless Inn" (an Episode 2 finish). Load Record 1, `ep3_morning` plays (43 real key presses), first map change:
     slot 0 became "Arden Lv 14, nameless_hollow". Cora's run is gone. No prompt. (The map change was a `warp`, which
     runs the same `autosave()` as a door.)
   - Why: Episode 3's main entry is "Continue from your own save" (plan 10.2), and a player who kept their Episode 2
     finish in a Record and has since started anything else is exactly who will do this. Plan 10: "no Episode 3 path
     ever writes a save slot that holds another run."
   - Fix: on load, if slot 0 holds a game and the loaded game came from another slot, set `g.autosaveSlot` to the slot
     it was loaded from (the run then autosaves over its own Record) or ask once ("Autosave to Record 1?"). M: a run id
     in every save, and autosave only to a slot whose run id matches or is empty. Test: the s1b repro leaves slot 0
     untouched.

2. **Tempered Oath is hard to discover on a phone.** (S)
   - Where: `data/skills.js` (Oath is the last of Bram's 8 techs), the battle Tech list, `skills.js` line 497 (the Last
     Hammer telegraph text).
   - What (Fact, s4c, s4d): touch Tech (two taps: the first only moves the glove), the list shows 4 rows (Lunge, Skewer,
     Valiant Lance, Guard); Tempered Oath is 7 d-pad presses down. The list window covers the help bar, so its help
     reads "...in front. Turns a ...er blow." The Last Hammer telegraph does not name Bram; its "Defend, Break, or Bram"
     help exists only in data. Nothing marks the Oath as new.
   - Why: plan 6.5 calls this "the boss's central decision and it is Bram's". Mira's pre-fight line is the only pointer
     a player gets, and it is easy to tap past.
   - Fix: while a `turnable` telegraph is pending, open Bram's Tech list on the Oath (or list it first) with a "New" tag;
     add "Bram can stand in front." to the Last Hammer telegraph; draw the tech list above the help bar on touch (or put
     the selected help in the list's footer); a one-line hint the first time Bram drops under 8 MP in this fight.

3. **"Free one on the Load page first" points to a button that does not exist.** (S to M)
   - Where: `game/episodes.js` `SLOTS_FULL_NOTICE`; `scenes/loadGame.js` (no delete; `save.remove` has no UI caller).
   - What (Fact, s1c and code): with four games saved, Episode 3: new party shows the notice and Back, which is right,
     but no screen in the game frees a slot. The only way is to Save another game over a Record.
   - Fix: add Delete to the Load page with a confirm that names the run (M), or change the line to what works today
     ("Save over a Record you no longer need, then come back.") (S).

4. **Pacing over the target.** (S to M) Section 1, trims a to f. Owner: E3-fixes for a to d; e and f touch story text
   (show Scott before cutting lines).

5. **First fight later than 5 minutes after the morning.** (S) Section 1, trim b. Check: re-run the timer; the
   `first_fight_done` line should read under 5 on all four runs.

6. **Quench never asks for an order.** (M)
   - What (Fact): every puzzle is 0 to 2 turns; only F3 Hand has a "first this, then that".
   - Fix: make F3 Home the capstone it is named for: one paddle that must first cross the ring's near side, then be
     turned back to feed a basin, with the crate as the dam that holds the first crust's water. One map, no new systems.

7. **F1's dam opens a grate the player cannot see.** (S)
   - Where: `world/ep3/quench.js` (basin latch), `foundry_f1.js` `bs_c` at 35,14 opens `hg_c` at 32,4.
   - Fix: on a basin's first latch, pan the camera to its target and back (40 frames each way, skippable), as a
     receptor-to-door reveal; at least for targets more than 6 tiles away.

8. **The quick start says "slot 1"; the Load page says "Record 1".** (S)
   - Fact: `phone-ep3-new-0003-ep3_slot_notice.png` against `s1-01-title.png`. Use "Record 1" (and "the Autosave" for
     slot 0) in `episodes.js`.

9. **Bram's MP is a silent trap in the Warden fight.** (S, with fix 2) Bram has 34 MP at Lv 16 (Fact, s4b) and the Oath
   costs 8; the competent policy reserves it, a human will not know to. Either let the Oath cost Fury when MP is short,
   or give the pre-fight line a second sentence ("Keep something back for Bram.").

10. **Battle root rows take two taps.** (S) The first tap on Tech only moves the glove (Fact, s4c). Known pattern from
    PLAYTEST_REVIEW_4 fix 9 on choices; on the battle grid, a tap on a row should confirm it, as the title does.

---

## 5. Protect these

- **The quick start's slot picker**: free slot named before starting, refusal with Back only when full, never Replace;
  the bot's "only slot 1 was written" checks at four points (Fact, s1c; Reported, reports).
- **Crust that stays**, through reloads and the short lifts (Reported: "reload at before the Warden: 109 crust cells ...
  intact").
- **Context Shove**: standing at the crate, one press shoves it, whatever tab is selected (Fact, s3).
- **Visible wrong outlets**: water that goes the wrong way ends in a puddle you can see (F2 series, F1 slag hall).
- **Slag as light** in F3: the dark floor reads because the hazard is the lamp.
- **Heat pips above the weakness row**, gold when lit, never across a body; the telegraph names the target ("over Bram").
- **Mira's line before the Warden**: "When it glows white, cool it. When the hammer goes up, put Bram in front." It is
  the whole fight in one box. Keep it, and make the menu agree with it (fix 2).
- **Auto holding Bram's MP for the Oath** (`ai.js` 1132); 55% Oath use in the sim.
- **The name beats**: MARA OF THE FIRST BELL stamped on the gate under the ash; "Toll's one word." "Garrick." "Paid."
- **The first fight's two teaching lines** ("That beetle's heating up. Cool it before it boils over." then "Ice, and it
  went out like a coal in snow.") and the road's one-paddle opener: one idea, shown before it is needed.

---

## 6. Also seen, below the line

- The autoplay dialog log writes the page before a choice twice (three lines per run: Smith's ford line, the carters'
  shelter, the Warden's ORE COUNTER line; Fact: `ep3.js` lines 79, 175, 581 are single). It adds three pages to the
  timer; harmless, but fix in the logger.
- At the road sluice the first confirm did not turn the paddle and the second did (Fact, s3); likely the
  `first_sluice` bark took the first press. Fine, but the bark could fire on approach instead of on the press.
- The quick start opens on Wren's line about "Old fellow" with no recap; a player who skipped Episode 2 meets Aurel,
  Vessa and Penny by name with no introduction (Inference). One title card line ("Hollowmere remembers its name. Bram's
  father does not.") would carry it.
- The slot notice window sits over the logo's subtitle (Fact, `phone-ep3-new-0003`).
- Episode 3's bot runs spent 15 pages on "Equip the ...?" prompts and 24 on font prompts (Fact); both are fine for a
  player, but they are in the timer's dialogue minutes.

## 7. Not checked

- A real phone, a timed human run, iOS Safari, audio. All sessions were headless Chromium with emulated touch.
- Talk naming the next step at every beat, and after `ep3_complete` (plan 12); not driven.
- The Bellows Specter by hand (only the sim and the bot's 9 to 11 rounds).
- The Episode 2 save's Continue path to the credits: the four integrate runs cover it; I reproduced only the first map
  change.
- Every quench puzzle solved by a human hand: s3 solved two by keys; the rest are judged from the still frames and the
  bot's turn counts.
