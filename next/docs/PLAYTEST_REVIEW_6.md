# Playtest Review 6: Episode 4 on a phone, from an Episode 3 save and from the quick start

Read-only fresh-eyes review, Wednesday 2026-11-04 (Eastern), checkout `D:\LexiconQuest` on branch `scott/ep4-build` with
`EP4_LIVE = true` (Fact, `src/game/episodes.js` line 9). Sources: the four E4-integrate autoplay runs
(`qa/out/autoplay/{desktop,phone}-ep4{,-new}-report.json` and `-dialog.log`, 2026-11-04 00:52 to 01:42),
`qa/integrate/story_time.py` re-run on all four, `node tools/sim/simulate.mjs --check` re-run ("All targets met", 153,200
battles in 348 s), and the code named below. New evidence: twelve short headless sessions on the phone profile (844x390 at
3x, `is_mobile`, touch), one browser at a time, every one under a hard timeout: s1 to s1c the title, Continue and the save
rule; s2 an Episode 4 save loaded with the pack unreachable; s3 the start state of every tide puzzle; s4 the road lane and
F1's papered door solved by real key presses; s5 to s6 the Paper Regent (menus by real keys, plus four fast Auto fights);
s7 the Witness Book scene read by real presses; s8 the principles sign and the Inkbound Barrister's telegraph. Scripts, logs
and PNGs are in `qa/out/review6/play/`. Claims are tagged **Fact** (seen in a render, a log or the code), **Reported**
(from a plan, a report or the bot) or **Inference**.

Not repeated here: what critic-6 (running beside this) owns on art: the rain tint, floor identity, the wheel and post
marks at rest, grounded against floating pontoons, foe visibility on wet stone, the Regent's three looks.

---

## 0. Verdict

Episode 4 plays end to end on a phone from both starts with no softlock and no game over (Fact: 4 autoplay runs, 0 game
overs; no console errors in my sessions beyond the audio warnings of fix 3 and the fetches I blocked on purpose in
s2b). Its best ideas land: one wheel that both opens and closes routes, seals that wash off for good, three principle sockets over the gate, a Witness Book where "Not yet." loses nothing, and Auto that does use
Answer (Fact, 4 of 4 fast fights). The Continue guard and the quick start's slot picker now hold against every way I tried
to make them overwrite another run (Fact, s1, s1b, s1c).

Four things stand between it and the bar. (1) **A save can still be lost**: an Episode 4 save loaded while the `ep4` pack
cannot be fetched lands in the developer Test Town, and the first map change autosaves "Test Town" over the run's Keep
position (Fact, s2b). (2) **Answer, the boss's central decision, is the 7th of 7 hero Techs, below the fold**, and the
Episode 3 fix that floats Tempered Oath to the top is hard-coded to the Oath, so it does nothing for Answer (Fact, s5b,
`src/battle/scene/menu.js` line 136). This is Review 5's fix 2 again. (3) **Pacing is over the target** on the repo's own
timer, 87 to 137 minutes against 60 to 90 (Fact, re-run). About half the overrun is the timer counting every wheel click
as minutes of thought (Inference, section 1); the rest is fights, with the Regent met at Lv 21 instead of 20 (Fact).
(4) **A quick-start party hears none of Episode 4's music or sounds**: 13 "unknown audio id" warnings in both quick-start
runs, none from an Episode 3 save (Fact, fix 3).

---

## 1. Pacing: the clock, and what to trim

**The timer, re-run (Fact, `qa/out/review6/play/timer_2026-11-04.txt`).**

| Run | Battles | Pages | Estimate | First fight after the morning |
|---|---|---|---|---|
| desktop, Episode 3 save | 18 | 249 | 87 to 123 min | 3.9 to 4.5 min |
| desktop, quick start | 22 | 263 | 97 to 135 | 3.5 to 4.0 |
| phone, Episode 3 save | 18 | 251 | 89 to 125 | 3.5 to 4.0 |
| phone, quick start | 23 | 269 | 99 to 137 | 3.4 to 3.9 |

This matches E4-integrate's "87 to 137" and "3.4 to 4.5" (Reported, verified). The first-fight gate passes on all four.
Where the minutes go in the slowest run (phone quick start): dialogue 20.4 min, field 32.5 to 43.3, **puzzles 23 to 46**,
battles 22.9 to 27.5 (Fact).

**The puzzle term is over-counted (Inference, cheap check named).** `story_time.py` scores a tide puzzle like a quench
puzzle: 0.5 to 1 minute for the first action and 1 to 2 minutes for each further one. The bot's notes count wheel turns:
lane 3, F1 papered door 3, pontoons 1, gallery and tidegate 3, channel 2, F2 stacks 1, F2 two locks 6, F3 Voice 1, Truth 6,
Mercy 2: 28 turns over 10 puzzles (Fact, reports). But a wheel only cycles one way (low, mid, high, low), so going from
high back to mid is two clicks through low, and half of those 28 turns are cycling, not deciding (Fact, `tide.js`
`nextLevel`; s4: three presses took F1's wheel low, mid, high, then the fourth went straight to low). Weighting each extra
turn at 0.3 to 0.6 min gives 10 to 21 minutes instead of 23 to 46: about **12 to 25 minutes off** every estimate, so about
74 to 112 for the slowest run. Check: time one first-time human on F2's Two Locks, or change the weight in
`story_time.py` (S).

**The fights.** The quick-start runs fought 21 ordinary groups against the plan's 20, and every run reached Lv 21 in F3
before the Witness Book (Fact: `witness_book` step at Lv 21 in all four reports). An Episode 3 save already arrives at
Lv 18, not the plan's 17 (Fact, `phone-ep3-credits-save.json` party Lv 18). E4-integrate's suggested cut of one
`e4k3_watch` and one `e4k3_decrees` group (Reported) is about 2.2 minutes at 1x (Fact, timer lists 1.0 to 1.2 min each)
and removes about 680 EXP before the Regent, which should hold Lv 20 (Inference; check with `simulate.mjs --zone
ep4_keep_f3`).

**Where the reading goes (Fact, timer).** The longest dialogue runs are on maps, not single scenes: F2 2.5 to 2.8 min
(arrival, `lyra_memory_2`, `vex_archive` 10 calls, the Barrister 7), the Drowned Throne 2.4 (`paper_regent` 9 and the start
of `regent_after` 22), the Flood Road opening 2.2 to 2.8. Calls per scene by my count of `say`/`narrate` in
`src/data/ep4/story.js`: `crown_remembers` 16 against its budget of 14, everything else at or under budget, 223 in all
against about 220 (Fact). The F3 run (2.2 min) includes equip prompts ("Equip the Forge Helm of Sight on Arden?"), which
the timer counts as story (Fact, timer output).

**Trims to land 60 to 90, in order (sizes; savings are Inference on the timer's own rules):**

| # | Trim | Where | Saves | Size |
|---|---|---|---|---|
| a | Weight tide puzzles by decisions, not clicks (0.3 to 0.6 min per extra turn) | `qa/integrate/story_time.py` | 12 to 25 min of estimate | S |
| b | Cut one `e4k3_watch` and one `e4k3_decrees` group (the Regent at Lv 20, as planned) | `src/data/maps/ep4_keep_f3.js` enemy list | about 2.2 min | S |
| c | Do not count "Equip the ...?" prompts as story pages | `story_time.py` | about 0.5 min of estimate | S |
| d | Proposal for Scott and Stephen: `crown_remembers` 16 to 14 (inside its own budget); `vex_archive` 10 to 7 (keep "Four lists. One hand.", "Paper's not the problem here. The seal is.", "Read the charter. You'll want to sign something. Do.") | `src/data/ep4/story.js` | about 1 min | S, story |

With a to c the slowest run comes to about 71 to 109, the Episode 3 save runs to about 60 to 96 (Inference). If the high end
still sits above 90 after a human timing, the plan's own Cut 3 (merge F2 into F1) is the only lever big enough, and it is a
story decision for Scott and Stephen, not for E4-fixes.

---

## 2. Tide locks: clarity without text, and do they feel different from Episode 3's quench

I placed the party at the natural approach to every puzzle with no dialogue open and looked at the phone frame
(`qa/out/review6/play/s3-*.png`), then solved the road lane and F1's papered door by real key presses (s4). Fact for what
is on screen, Inference for what a newcomer concludes.

| Puzzle | At rest, no text | Verdict |
|---|---|---|
| Road lane (`s3-01`, `s4`) | A flooded lane with a drowned roof in it, a striped post, a wheel with a "!" bubble, a floating punt by the shed | Clear. The roof says "this was dry once". First press reads the wheel line, the next turns it (Fact: 3 presses of text, then the drain) |
| F1 B papered door (`s3-03`, `s4-07` to `s4-13`) | From the wheel stand (row 18) the canal and the seal (row 9) are **off the top of the screen** | The goal is seen first by walking the dry canal at low, which is good teaching. But the wash itself happens off screen: the water rises at the top edge, and the next thing the player sees is Mira's "Forged ink runs. It ran." about an event they did not watch (Fact, `s4-08`, `s4-09`). Fix 6 |
| F1 C pontoons (`s3-07`, `s3-08`) | Dry channel, two grounded crates on its floor, a post with a waterline, wheels on both banks | Clear once the lane is done. The bark "Down for the road, up for the boat. It's a staircase made of water." is the whole mechanic in one line |
| F1 E/F gallery and tidegate | Lip and floodgate visible from the east bank | Clear; the floodgate opening far from its wheel pans the camera to it (Fact, `system.js` `reveal`, line 303) |
| F2 B stacks, F2 D two locks (`s3-10`, `s3-11`) | Stacks at mid with floating crates; D's `wh_c` stands in the b channel | D is the first real order puzzle: `wh_c` is reachable only while b is low. Reads from the frame |
| F3 hub (`s3-12`) | Three dark sockets over the Petition Gate, one per principle | Very good: progress you can see without a counter |
| F3 Voice, Truth, Mercy (`s3-13` to `s3-15`) | Truth: a culvert and a block, two seals at two heights | Truth is the capstone: Shove the dam, mid washes one seal, high washes the other, low lets you walk (Fact, `MAPS_EP4_B.md` solution). Mercy's high water is the light |

**Different from quench? Yes (Inference).** Episode 3's quench never needed more than two paddle turns and only one puzzle
asked for an order (PLAYTEST_REVIEW_5 section 2). Here the same wheel opens and closes routes, F1 B asks "up, then down",
F2 D asks "this basin first", F3 Truth asks "mid, then high, then low", and pontoons make a level that is wrong for walking
right for floating (Fact, bot notes: 6 turns in F2 D and F3 Truth). The plan's risk "water, again" (EPISODE4_PLAN 14) is met.
The one thing that blunts it is the one-way cycle: overshooting means two more clicks and two more 24-frame animations,
and on a phone a newcomer cannot tell which mark is next without counting (Inference; section 8).

---

## 3. Difficulty: the Barrister and the Regent

Simulator, this checkout (Fact, `qa/out/review6/play/sim_check.txt` lines 421 to 445):

| Boss | Lv | competent | reckless | naive | rounds (competent) | HP lost (competent) |
|---|---|---|---|---|---|---|
| Inkbound Barrister | 19 / 20 | 100% / 100% | 65% (Lv 19) | 0% / 0% | 8.3 / 8.3 | 14 to 16% |
| Paper Regent | 20 / 21 | 99% / 100% | 74% (Lv 20) | 0% / 0% | 13.5 / 12.5 | 15 to 16% |

Strikes from the Roll answered 63% by the competent policy (Fact, sim line 507). Four fast Auto fights in the game at Lv 20
all used Answer on the Regent (Fact, s6: `hero:skill:answer>e0` in every run).

Read as a first-timer (Inference): both are the same cliff as Episode 3. A player who answers telegraphs loses about 15%
HP; one who never does loses every time; reckless wins 65 to 74%, above "attack-only 60% or less" if reckless is that line.
Retry keeps progress, so the cliff is survivable; the fix is making the answer findable (fix 2), not changing numbers.

**The Barrister is not the fight the plan describes (Fact, `src/data/ep4/enemies.js` lines 95 to 104).** Plan 6.4: HP 2000,
6 shields, weak fire, one Stamp a turn. Data: HP 2500, 8 shields, weak light, spear, bow, **resists fire**, `stampsPerTurn: 2`
and Haste. Mira's one tip is "Every stamp makes its case stronger. Burn the paper before it objects." Fire still voids
(any fire damage does, plan 6.3), so the tip works, but the weakness row a phone player reads at that moment lists light, spear and bow, and
not fire (Fact, data and `s8-03`). The bot took 10 to 15 rounds against a
careful target of 7 to 9 (Fact, reports; the sim's competent 8.3 is faster than the in-game Auto). Likely E4-battle tuned
it to meet the sim targets (Inference); either way the tip and the row disagree.

On the phone at the Objection (Fact, `s8-03`): three red wax pips lit beside the weakness row, never across the body; the
telegraph "The Inkbound Barrister rises. 'Objection!'..." in the top window; the witness's own row. Clear.

---

## 4. The Answer decision and the Witness Book

**Is Answer discovered? Only if the player scrolls (Fact, s5b).** At Lv 20 the hero's Tech list is Rising Slash, Crescent
Sweep, Flash Step, Steady, Second Wind, True Strike, **Answer**: 7 rows, 4 visible, Answer 6 presses down
(`s5b-03-hero_tech_bottom.png`). `src/data/ep4/skills.js` line 111 pushes it onto the end of `CHARACTER_SKILLS.hero`. The
Episode 3 fix that lists Tempered Oath first in gold while a hammer is raised is `list.findIndex((it) => it.id ===
'tempered_oath')` behind `hammer()`, which only looks for `turnable` (Fact, `menu.js` lines 90, 106, 136); Strike from the Roll
is `answerable`, so none of it fires. The help line does read well now ("Answer to your name. Voids a decree." in the top
window, not covered by the list), which is Review 5's fix landing (Fact). The telegraph names the hero ("The Paper Regent
unrolls a decree with Pia's name on it...", `s5-01`) but not the answer. The pointers a player has are the Witness Book's
"{hero} learned Answer." and Mira's tip before the boss, "When it unrolls your name, answer it. You. Not us." (Fact,
`story.js` line 525), which is excellent and easy to tap past.

In one Auto fight the hero stood at 1 MP of 45 when the Strike was announced (Fact, `s5-01`); a Break voided it instead.
Auto answered in all four fast fights (Fact, s6), so this is not an Auto bug; it shows that a human who spends the hero's MP
on Flash Step (4) and True Strike (5) has nothing for Answer (10), and nothing says to keep it (Inference).

**Does the Witness Book land? Mostly (Inference, s7).** The sequence is right: the memory, the gate opening, the lectern
pan, Mira's "Somebody whose name the lists keep coming for.", a choice where "Not yet." costs nothing, the name written
with a flash and `triumph`, then "It held. Under water. Yours held." Two things weaken it on the screen: the antechamber is
a dry, bright marble room with no water near the lectern (Fact, `s7-05`, `s7-06`), so "under water" is told, not shown;
and "learned Answer" is never tied to what it does until the throne room. Both are cheap (fix 9).

---

## 5. The save rule: trying to lose a save

| Try | Result |
|---|---|
| Record 2 holds an Episode 3 finish whose `autosaveSlot` still points at Record 1; Record 1 and the Autosave hold two other runs. Load Record 2, play `ep4_morning` by key presses (26), change map | Records 0 and 1 untouched; the run autosaves to Record 2 (Fact, s1; `loadGame.js` line 76, the seed and name guard) |
| Episode 4: new party with the Autosave and Records 1 and 2 full | "This party will save to Record 3.", with Back as the default (Fact, `s1b-02`) |
| Episode 4: new party with all four full | "Every save slot holds a game. Save over one you no longer need first." and Back only; no slot written (Fact, `s1c-01`) |
| Seeds that could collide (two quick starts with the same name) | Seeds come from `Date.now()` (Fact, `state.js` line 38), so the guard tells runs apart |
| **An Episode 4 save loaded while the pack cannot be fetched** (a first load on a bad connection, or a cleared cache) | The map falls back to the developer Test Town with its banner; the first door autosaves `map: '_testtown'` over the run's Keep position (Fact, s2b: slot 0 went from `ep4_keep_f1` to `_testtown`). **A save lost.** Fix 1 |

---

## 6. Ten to fix, ranked by player impact

Sizes: **S** = hours, data or one file. **M** = about a day for one agent. **L** = several days.

1. **An Episode 4 save is overwritten with "Test Town" when the pack does not load.** (S to M) Fact.
   - Where: `src/scenes/field.js` `loadMap`, lines 147 to 159; `src/game/packFallback.js` `landing()` (only `x1_` maps have a
     landing, so an `ep4_` map falls through to `_testtown`).
   - What (s2b): an Episode 4 save at `ep4_keep_f1` (22,26), loaded with `src/data/ep4/**` unreachable: after the 8-second wait
     the party stands in Test Town; one map change and slot 0 reads `_testtown`. The Keep position is gone and Test Town has no
     road back.
   - Fix: give `ep4_` (and `ep3/`) maps a landing on a real core map (Emberpeak's east road end, or `pk_inn`) with
     `packReturn` set, as `x1_` maps have; and never autosave while on `_testtown` or while a `packReturn` is pending. Test:
     the s2b repro leaves the slot's map as it was.

2. **Answer is the last of 7 hero Techs, below the fold, during the Strike from the Roll.** (S) Fact.
   - Where: `src/battle/scene/menu.js` lines 90, 106 and 136 (the Oath rule keyed to `turnable` and `tempered_oath`);
     `src/data/ep4/skills.js` line 111.
   - Fix: generalize the rule: when a pending telegraph is `answerable` and the unit is the hero, open the root on Tech and list
     Answer first in gold (the same code path as the Oath, no new UI). Add "Answer it." to the end of the Strike's telegraph
     line, or show the hero's Answer cost beside it. A one-time hint when the hero drops under 10 MP in this fight ("Keep
     something back for Answer.") answers the MP trap.

3. **A quick-start party plays Episode 4 with no Episode 4 sound.** (S to M) Fact.
   - Where: the pack's audio merge, `src/data/ep4/index.js` (lines 11 to 15 and 88, `audioFragment` into
     `engine.audio.manifest`) and `src/game/packs.js` lines 181 to 231 (`register(engine)`, then `audio.loadPack('ep4')`).
   - What: both quick-start autoplay runs logged 13 warnings, "[audio] unknown music id boss_regent", "sunken_keep",
     "valewyn", the ambiences `canal_rain` and `keep_drip`, and the SFX `tide_wheel`, `water_rise`, `water_drain`,
     `seal_wash`, `seal_stamp`, `decree_unroll`, `decree_void`, `bell_drowned` (Fact, `phone-ep4-new-report.json` and
     `desktop-ep4-new-report.json` `warnings`). Both Episode 3 save runs logged none. My forced-pack sessions hit the same
     (Fact, `s4-log.txt`, `s5-log.txt`). So the boss theme, the town theme, the Keep theme and every tide sound are silent on
     that path (Inference: the pack registered before it had an engine, and the later call did not merge).
   - Fix: find the load order on the quick-start path and merge the fragment whenever an engine arrives; add an assert to the
     autoplay that a run's `warnings` holds no "unknown ... id" line.

4. **On a keyboard, Enter turns Auto on in battle.** (S) Fact; desktop only, but it breaks fix 2's decision for every keyboard
   player in every episode.
   - Where: `src/core/input.js` line 27 (`start: ['Enter', 'NumpadEnter']`, and `confirm` also has Enter);
     `src/scenes/battle.js` line 401 checks `start` before the menu reads `confirm`.
   - What (s5, s5b): Down then Enter on Tech closed the menu, showed AUTO, and the hero used Flash Step; Right, Down, Down,
     Enter for Defend made Bram Attack. With Z instead of Enter the Tech list opened.
   - Fix: take Enter off `start` (leave Tab or a pad button), or ignore `start` in battle while a command menu is open. The
     bots never hit this because they use `battleAct`, not the menu.

5. **Pacing over the target: 87 to 137 minutes against 60 to 90.** (S to M) Fact for the clock, Inference for the savings.
   Section 1, trims a to c for E4-fixes; d is a story proposal for Scott and Stephen. Check: re-run the timer on all four.

6. **A seal washes off screen; the camera never shows it.** (S) Fact.
   - Where: `src/data/ep4/field/system.js` `setGate` calls `reveal()` for a far floodgate (line 299), but nothing calls it for a
     newly washed forgery.
   - What (s4): F1's wheel stand is 9 rows below the papered door; at high the door is above the top edge, and the first wash,
     the episode's "forged ink runs" moment, plays unseen before Mira comments on it.
   - Fix: on a wash more than 6 tiles from the wheel, reuse `reveal()` on the seal (pan, hold, back; confirm skips).

7. **The Paper Regent is fought at Lv 21, not 20.** (S) Fact (all four reports: Lv 21 at the Witness Book).
   - Where: `src/data/maps/ep4_keep_f3.js` enemy list; Section 1, trim b. Also note an Episode 3 save arrives at Lv 18
     (Fact), a level above the plan's assumption, which pushes the same way.
   - Check: `simulate.mjs --check` still "All targets met" after the cut, and the next autoplay notes "Paper Regent attempt 1:
     Lv 20".

8. **The Barrister resists fire while its tip says "Burn the paper".** (M, because the sim targets must stay met) Fact for
   the data, Inference for the confusion.
   - Where: `src/data/ep4/enemies.js` lines 95 to 104 (HP 2500, 8 shields, `resist: ['fire', ...]`, `stampsPerTurn: 2`,
     Haste) against plan 6.4 (HP 2000, 6 shields, weak fire, one Stamp).
   - Fix: take fire out of `resist` (neutral at least) and retune HP or shields to keep the targets; if the tuning needs the
     resist, the tip needs a new line, and that is a story proposal for Scott and Stephen. Also look at why the in-game Auto
     takes 10 to 15 rounds when the sim's competent takes 8.3.

9. **The Witness Book says "under water" in a dry room, and "learned Answer" says nothing about what it does.** (S to M)
   Inference.
   - Where: the antechamber of `src/data/maps/ep4_keep_f3.js` (x 17..26, rows 4..8; `witness_lectern` 24,5);
     `story.js` `witness_book` (line 478 on).
   - Fix: a shallow water decal or a small basin under the lectern so the page is visibly drowned (map art, no new system);
     and in the learn line, the move's purpose: "{hero} learned Answer. It voids a decree." (a story-text proposal; the
     help line already says it).

10. **The void message reads "The Paper Regent: is broken: the decree falls apart!"** (S) Fact.
   - Where: `src/data/ep4/scene.js` line 281 (`${name}: ${why}`) with `VOID_WHY` on line 230. The answer case reads "The Paper
     Regent: its decree will not stand." Plan 6.5 has "{hero} answers to their name. The decree will not stand."
   - Fix: drop the colon for `break` ("The Paper Regent is broken: the decree falls apart!"), and use the plan's line for
     `answer`.

---

## 7. Protect these

- **The save picker and the Continue guard**: "This party will save to Record 3." with Back as the default; refusal with Back
  only when full; a Record whose autosave slot points at another run redirects to its own slot (Fact, s1 to s1c).
- **The two-way tide rule**, taught in one bark: "Down for the road, up for the boat. It's a staircase made of water." (Fact).
- **Washes that stay washed** and basins that reload at their start levels: the bot's round trips kept `seal_b`, `seal_d`,
  `seal_t1`, `seal_t2`, the tidegate latch and every opened door (Reported, reports).
- **The floodgate reveal** (`system.js` line 303): a far gate opens on camera. Fix 6 should copy it, not replace it.
- **The three sockets over the Petition Gate**: progress you can read with no counter (Fact, `s3-12`).
- **Red seal pips beside the weakness row**, never across a body, and telegraphs that name the target ("with Pia's name on
  it") (Fact, `s5-01`, `s8-03`).
- **Mira's two tips**: "Every stamp makes its case stronger. Burn the paper before it objects." and "When it stamps, burn it.
  When it unrolls your name, answer it. You. Not us." Each is the whole fight in one box. Make the menu agree with them.
- **Auto uses Answer** (Fact, s6, 4 of 4) and voids at 2 Seals; keep the policy as it is.
- **The first fight at 3.4 to 4.5 minutes** and the road's one-wheel, two-level opener (Fact, timer).
- **"Not yet." in the Witness Book**: nothing lost, the book stays open, Bram's "Take your time. The water won't." (Fact,
  `story.js` lines 486 to 497). And the signature itself: narration, `name_restore`, a white flash, `triumph`.

---

## 8. Also seen, below the line

- The autoplay never records whether Answer was used in the Regent fight, though plan 12 asks for it (Fact: no Answer note in
  any report; `grep` of the four dialog logs). s6 shows it is used; the bot should note it.
- The bot's "sign principles_sign skipped: no tile to stand on" is a bot pathing gap, not a map bug: from (24,12) facing up
  the sign reads (Fact, s8).
- The quick start's slot notice window sits over the logo's subtitle (Fact, `s1b-02`), as in Episode 3.
- The bot's "font font_k3 unreachable" notes are correct: F3 has no rest point until the Petition Gate opens (Fact, map: the
  font is in the antechamber). With five F3 fights and three wings that is a long stretch; the F3 boat back to F1's font is the
  answer, and Talk should say so (Inference).
- **The wheel only turns one way** (`tide.js` `nextLevel`, `system.js` `turn()`): overshooting costs two more clicks and two
  24-frame animations, and F2 D and F3 Truth took 6 turns each for the bot (Fact). Letting Cancel while facing a wheel turn it
  back one mark, or a "Next: high" prompt, would remove the counting and keep the puzzle (M, Inference).
- The Barrister's Haste plus two stamps a turn means an Objection roughly every other Barrister turn (Inference, data); with fix
  8, check that the fight still has quiet turns.

## 9. Not checked

- A real phone, a timed human run, iOS Safari, audio. All sessions were headless Chromium with emulated touch.
- Talk naming the next step at every beat and after `ep4_complete` (plan 12); not driven.
- Every tide puzzle by a human hand: s4 solved two by keys; the rest are judged from still frames and the bot's turn counts.
- The Barrister and the Regent played to the end by hand: I drove the menus and read the telegraphs; the outcomes are the
  sim's and the bot's.
- The Three Witnesses council choice and its +25 Fury, Nilo's Bell, the Public Coffer.
