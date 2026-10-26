# Playtest Review X1: the Wider Valley, a brand-new phone player

Read-only play review, Monday 2026-10-26 (Eastern), branch `overhaul`, `X1_LIVE = true` on disk, unpublished.
Brief: `docs/briefs/X1-review.md` (play-critic). Read first and not repeated here except where I confirm or contest it: `docs/CRITIQUE_X1.md`.

Method (all Fact unless tagged): one persistent headless Chromium on the phone profile (844x390 at 3x, `is_mobile`, touch), one job at a time,
text speed 2, manual battles for the first fights and the flee test, the autoplay helpers only to walk, solve plates and reach states faster
(never to judge). I started from a save made just after the first fight (valley, Lv 2, three potions, 60 gold, plain gear, only the flags
the real game has at that point) and played with no walkthrough: signs, Talk, the journal and what the screen showed. Then I loaded an old
Episode 1 credits save, the mid-Archive fixtures `x1_ep1_f1_mid` and `x1_ep1_f2_mid`, the Episode 2 fixture `x1_ep2_court_mid`, and tried to
break saves. 13 debug fights at recommended levels and 10 at the two main bosses and the two optional bosses measured the level curve.
Scratch (shots, the driver, notes) is in `qa/out/reviewx1/px/`. Tags: **Fact** (seen in a shot, a run or a source line), **Reported**
(from a log, plan or the autoplay reports), **Inference** (with the check). Sizes: S hours, M about a day, L several days.

---

## 0. Verdict

The expansion plays like the same game and mostly teaches itself: the Old Fold crack, Patch the scarecrow, the Shove niche, the Stones and
the Barrow all got solved from on-screen tells plus one Mira or Bram line, with no dead ends in the regular flow and no way to lose a level
(Fact). The main route is exactly as long and as hard as before (Fact, section 4). Three things can hurt a real player: **FLEE on a phone
wedges the battle** (a pre-existing menu bug that the new fleeable field foes now expose), **a save made inside the Barrow's Ewe Chamber
reloads you into a sealed room**, and **nothing outside Talk ever tells a player the west exists**. Counts: 1 blocker, 4 major, 9 minor.
Added playtime, honestly: about 60 to 80 minutes for a first-timer who does everything, about 35 for a casual one (section 4).

---

## 1. The first hour, as played

Clock is game time from my run unless noted; the bot reference is `qa/out/autoplay/desktop-complete-report.json` (Reported).

| Game time | What happened | What a newcomer feels |
|---|---|---|
| 0:00 | First fight at valley column x 7 (wolves, auto-win, still Lv 2: each member 38 EXP) | Clear. The west gate (0, 28) is 7 tiles away and nothing points at it |
| 0:50 | Walked back to town and down again, then to the west edge | Only found because I went looking. The edge is bare grass (Fact, `px/a10_up5.png`) |
| 1:20 | Downs: arrival lane, signpost with five arms, Thornfold hamlet, Brindle | Best first impression in the expansion. The hamlet and the signpost read as a place |
| 2:40 | Brindle's quest: Mira's "Five missing. Three places a sheep would hide, and one with a fence" | Clear, counted ("Strays found 3/5"), the Recommended Lv is on the journal line |
| 3:50 | The Old Fold crack: Mira's bark on the way in ("Hear how hollow that sounds?"), pill "Dash" with a sword icon over the crack | Discovered unaided. Chest gave the Bell Crown (rare head, 4 affixes) |
| 5:20 | Patch the scarecrow: inspect, Mira's bark, pageL, Appraise, chest revealed | Works. The bark does not say what to press (critic 10), but the pill's swap icon is tappable |
| 6:00 | Papers: Iris (library) and Quill (the rest) named by Mira and Brindle, return, the Stones scene | The strongest beat in the build. Twelve names, the thirteenth slab stays blank |
| 9:30 | Barrow at Lv 3: landing, switch, Shove niche, plate, hearth, Reeve | Readable, a little long (about 3.5 min of puzzle with the helper walking) |
| 13:00 | High Moor, Odo, stile Dash, Terrace, Orrery, Larchhill, Millrace, Culvert | Each opens with a quiet minute and no foe near the lane (Fact) |

Brief questions answered from play:

- **Do you discover the new areas?** Only through Talk. After the first fight the valley's Talk list contains "The west fence has a gate in it now"
  (Fact, `talk_menu` at valley (9, 33)) and Willowmere's contains "The orchard gate on the west wall is open". No bark, no signpost, no
  lamp. A player who never opens Talk (PLAYTEST_REVIEW_4 found nothing tells them it exists) walks east to the Archive. See M2.
- **Do you understand each quest?** Strays, the Thirteenth Stone and Four Rolls: yes, each step names the next place in a line of speech and
  the journal. The Culvert itself: no, it has no hint at all (m1).
- **Chests that need Dash, Appraise, Shove?** All three taught on the spot: Dash by the bark and the lit pill, Shove by Bram's "That one
  won't budge for you" as I stepped next to the niche block, Appraise by the "!" over Patch.
- **The Lantern's job at the cleft?** A player holding the Lantern gets two Talk lines on the valley ("a stair on its far side, and not one
  board across", "Try the lamp"). Without the Lantern the cleft is a harmless drop: walking in dropped the party to the cleft's lip with no
  damage (Fact). The Terrace is also reachable by the moor's stile before the Lantern (m4).
- **Pacing between fights.** Foes notice at 3 tiles and start closing after about 90 frames (1.5 s), then one step per 20 frames; a player
  who keeps walking never gets caught (Fact: pack at distance 3 reached me in 2 s only because I stood still). Crossing the Downs, the moor
  and Larchhill on the route lanes took about 20, 10 and 9 seconds with no fight (Fact). Every X1 field map is `respawn: 'reentry'`
  (Fact, map files), so the 150 s timer matters only to the valley; a fought group stays gone until you re-enter. The expansion is
  therefore sparse on fights unless you seek them: 3 groups on each field map, 5 to 9 rounds each.

---

## 2. Critic's top five, confirmed or contested from play

1. **West way bare once open (critic 1): confirmed, and I would add the missing piece.** The shot shows tall grass with no post
   (`px/a10_up5.png`). The bigger gap is that the one thing that would say "the fence has a gate" is a Talk line. See M2 (merged).
2. **Talk crowding (critic 2): confirmed with new evidence.** With The Thirteenth Stone started, the Reeve line "The barrow door is in
   the turf mound north of the ring. The Reeve is at the far end. Bows and light, Bram." appeared on the moor, the Terrace, the Orrery and
   Larchhill (Fact, four Talk reads), where it is wrong-place advice, and the moor's own lines (Odo, the tower) never surfaced. See M3.
3. **Test-town fallback (critic 3): confirmed from source, not re-run.** `src/scenes/field.js` `loadMap` line 147 still falls back to
   `_testtown`. My own attempt to re-run the blocked-pack test used a route filter that blocked the whole game, so I stopped and rely on the
   critic's run. See M4.
4. **Puzzle weapons are sidegrades (critic 4): half confirmed.** Rewards that felt like rewards: the Bell Crown (a Dash crack, 4 affixes),
   the Fold Mantle (quest), the Millwright's Apron and Ash Bite (the Golem). The Drover's Bow for the Shove niche was a sidegrade by
   the stat line the critic quotes. Keep as a data tweak, below the four items above.
5. **Pine over the cleft (critic 5): confirmed.** The crown sits over the cleft's lower edge (`px/bb02_after_fall.png`). Minor.

---

## 3. Level curve and the optional bosses (Fact: debug fights, auto, my measured numbers)

The main route is unchanged: with X1 on the regular route reaches the Echo Warden at Lv 5, the Archivore at Lv 8 and the end at Lv 9 in
1,393 game seconds (`phone-x1-report.json`, `desktop-x1-report.json`), the same pace as the pre-X1 run (Warden at 715 s against 693 to
705 s). **Confirmed.**

Optional pay is full EXP, not 10 percent: `src/data/expcurve.js` sets `EXPANSION_FOE_EXP_MUL = 1`. `docs/EXPANSION1_PLAN.md` 7 and
`docs/BATTLE_X1.md` still describe 0.1 and "about one level over" (stale, m8). The sim row (Reported, `qa/out/sim_check.log`) is Lv 9 at the
Warden and Lv 11 at the Archivore for a completionist, accepted. From play: one Downs fight took the Lv 2 party to Lv 3, the Reeve to Lv 4,
and by the Culvert Golem the party was Lv 6 with 614 EXP (the main route reaches 424 EXP, Lv 6, only at the Warden). So the world pays in
gold, gear and levels together. It does not read as "gold and gear instead of levels".

| Fight (auto, debug party) | Level | Rounds | Result |
|---|---|---|---|
| Echo Warden | 6 / 8 / 9 | 7 / 7 / 7 | win; at Lv 9 hero and Bram untouched, Mira 77/121 |
| Archivore | 8 / 9 / 11 | 10 / 11 / 9 | win; at Lv 11 hero 148/173 |
| Barrow Reeve | 3 / 5 | 17 / 13 | win; Mira down to 32/52 at Lv 3 |
| Millstone Golem | 5 / 6 | 20 / 12 | Lv 5: Mira KO'd, win; Lv 6: all alive |
| Optional groups (Downs, moor, Barrow, Larchhill, Terrace, Cellar) | 2 to 6 | 4 to 9 | 13 of 13 won, none KO'd |

Reading: the shields keep both main bosses at 7 to 11 rounds even three levels up, so the extra levels buy HP, not a short fight. **Both
are fair and neither is a pushover** at the accepted levels (the critic's watch item 14 resolves to "leave it"). The optional bosses are
winnable far below recommended (Reeve at Lv 3 on Auto), so they are gentle, not walls. Ordinary optional foes have no teeth at the
recommended level; that fits "gentle and optional" but means fights are rounds of waiting, not decisions (m9).

Time per region (Reported, bot game seconds, then my first-timer estimate in section 5): West and Downs sweep with Strays and the Stones
about 7 min, Barrow and Reeve 2.7, High Moor 2.2, Larchhill 2.4, Terrace 1.6, Millrace 2.1, Culvert and Golem 2.4, the north Lantern chain
3.8 (marks, tower, Orrery, Cellar), the three late quests 4.4.

---

## 4. Trying to break saves

| Test | Result |
|---|---|
| Old Episode 1 credits save (10-21 file), walk to Willowmere west edge, into the Downs, Talk | Loads clean, 0 errors, Downs open, Talk adds the orchard-gate line (Fact) |
| Mid-Archive F1 (Lv 4) and F2 (Lv 5) fixtures | Load clean. F2 mid: the Millrace door opens, the cleft is a harmless fall (Fact) |
| Episode 2 fixture mid-Court | Loads clean, the Downs and the cleft Talk lines work, 0 errors (Fact) |
| Lose to the Reeve (HP 1 party), Retry | Back at the hearth with full HP, `reeve_met` kept, gate stays open, retry works; no level lost (Fact) |
| Save inside the Counting Room mid-block, resume | The block resets to (20, 4), the gate stays open (flag), still solvable (Fact) |
| **Save inside the Ewe Chamber, resume** | **Trapped, see M1** |
| Save on the moor tarn ink bridge, resume | Lands on the shore with the ink gone, no harm (Fact) |
| Hay chute and the Terrace's one-way drop | Both land correctly (chute needs `yarrow_met`; the drop lands at the Archive door) (Fact) |
| Mid-load network kill | Not re-run (see section 2); the critic's finding stands |

---

## 5. Added playtime, honestly

Regular route: no change (Fact, section 3). Completionist, bot game time to the credits plus late quests: 3,137 s against 1,393 s, so
**1,744 s (29 min) of bot play added**, with 220 more dialogue boxes (625 against 405, Reported). A human adds reading (about 5 s a box:
18 min), manual speed-1 fights (26 more fights than the main route, 13 min) and walking at 12 frames a tile (4 min). That is about 64
minutes, and a first-timer with no walkthrough loses another 15 to 25 percent to looking around: **60 to 80 minutes** for everything, about
35 for a casual who skips half the optional fights and chests. `EXPANSION1_PLAN` section 13 says about 97 to 115; I think that is about a
quarter high (Inference; check: one human timing of the Downs and Barrow slice, the plan's 28 minutes against my 9.7).

---

## 6. Findings, ranked, as four-field fixes

### Blocker

**B1. FLEE on a phone wedges the battle.** (S)
- Where: `src/scenes/battle.js` lines 409 to 412 (the touch FLEE branch), against `src/battle/scene/menu.js` lines 98 to 102 and 273
  (`update` closes the menu before it returns an action; `fleeTap` does not).
- Observed (Fact, run, twice, taps 5 and 25 frames apart): in a fleeable fight (`dn_pack`) the root menu has no Flee row; FLEE lives only in the
  top help bar. First tap: "Tap FLEE again to run." Second tap: nothing happens. The hero's command menu stays open over 11 queued ops, which
  `runOps` never starts while a menu is open; pressing Attack and confirm logs "battle is over" and the screen sits there. The only way out I
  found was toggling AUTO (or Start), which closes the menu and plays the flee. A player will read it as a freeze and lose unsaved progress.
- Change: call `this.menu.close()` before `this.performParty(run)` in the touch FLEE branch (as `menu.update` does at line 273).
- Must stay fixed: the arm-then-run double tap and its "Tap FLEE again to run." text, bosses and the first fight staying unfleeable
  (`noFlee`, `canFlee: false`), the keyboard and pad paths, and the flee odds.

### Major

**M1. A save made inside the Ewe Chamber reloads into a sealed room.** (S to M)
- Where: `x1_barrow` Ewe Chamber (8..13, 15..16), switch `sw_slab` (15, 11), slab `slab_n` (12, 14).
- Observed (Fact): throw the switch (north slab opens), shove the niche block, take the bow, Menu, Save (allowed anywhere), quit,
  Continue. The party stands at (13, 16) with the switch off, the north slab shut and no switch, plate or font inside. Shove has no target, Dash
  does nothing, no foe to lose to. The only exit is an earlier slot; if that slot was overwritten the save is a dead end. (Culvert and other
  plate rooms: not tested; Inference that the Culvert's gate is flag-backed like the Barrow's `x1_gate_reeve_open`; check: save mid-Culvert after the plates and reload.)
- Change: make the slab state a flag-backed state (set by `sw_slab`, applied on map entry and on load) so the slab reopens as the player left it.
- Must stay fixed: "south slab open at the first visit", the rule that blocks reset on re-entry, no block guarding a door, and the Counting Room's
  existing flag persistence.

**M2. Nothing outside Talk tells a new player the west exists.** (S)
- Where: `valley` (0, 28..29) and `willowmere` (0, 16..17) right after `first_fight_done`; the post-fight lines in `src/data/story/ep1.js` `first_fight`.
- Observed (Fact): the fight happens 7 tiles from the gate; afterwards Mira says "Spear. Wolves hate it." and the road leads east. The gate has no
  post (`px/a10_up5.png`), the town's west edge only a lane, and the line that mentions the fence sits in Talk. A newcomer who does not open Talk
  finds the Downs by luck or after the Archive (this merges critic 1 with a missing bark).
- Change: one one-shot bark (Mira: "The west fence has a gate in it now.") when the party first comes within 5 tiles of the west edge after the first fight, plus critic 1's open-gate prop.
- Must stay fixed: the first-fight trigger column, the arrival cells (1, 28) and (1, 16), the closed-gate signposts before the fight, and map equality with the switch off.

**M3. Talk's side line is not map-aware and shows the Reeve everywhere.** (S)
- Where: `src/data/quests.js` `partyChat`; the `rollcall` Reeve line in `src/data/x1/quests.js`.
- Observed (Fact): with The Thirteenth Stone live, "The barrow door is in the turf mound north of the ring. The Reeve is at the far end. Bows and light,
  Bram." showed on the moor, the Terrace, the Orrery and Larchhill; no local line (Odo, the tower, Hesper, the hives) appeared. This is critic 2 with the wrong-place effect measured.
- Change: sort side picks so an entry whose `map` equals the current map comes first, and give the Reeve line a `map: 'x1_downs'` / `'x1_barrow'` filter.
- Must stay fixed: the main hint first, `maxSide` = 1, Episode 2 and 3 line priority, every Talk result on an old map.

**M4. A save inside an X1 map can land in the developer test town.** (M)
- Where: `src/scenes/field.js` `loadMap` line 147, `src/scenes/loadGame.js` lines 85 to 87 (`awaitPacks`).
- Observed: the critic's run (Fact there); the source line still exists (Fact here); I did not re-run it.
- Change and must-stay: as critic 3.

### Minor

**m1. The Culvert says nothing about its plates.** (S) Where: `x1_culvert` Talk. Observed (Fact): three banter lines ("Drains. It is always drains."); two plates, a
light block and a Shoved heavy block, and a barred gate are never named. Change: one Mira Talk line ("Two plates in the floor, and a gate that
wants both."). Must stay: the puzzle, `block_b2` shoving, the font before the Golem.

**m2. Hesper says "You carry a Lantern" to a player who does not.** (S) Where: `src/data/x1/story.js` line 327 (`hesper_meet`). Observed (Fact): I reached the Orrery by the
stile at Lv 3 with no Lantern and heard it; the Dark Stars quest then silently waits. Change: guard that line on `lantern_get`, else "Come back with a true light." Must stay: the scene's flags and `stars_started`.

**m3. Barks interrupt the approach to a foe.** (S) Where: `first_appraise_target` and `first_dash_target`. Observed (Fact): three times I was walking toward a pack when the bark fired and
swallowed the held direction for about a second, with the pack at 3 tiles. Change: do not fire a bark while a chase foe is within 5 tiles. Must stay: one bark per save and the icons.

**m4. The Terrace is open before the Lantern by the moor's stile.** (S, text) Observed (Fact): a Lv 3 party got to the Terrace and Orrery; foes there are Lv 6 to 7. Nothing harmful (I won
Terrace fights at Lv 5 and 6 with no KO), but the journal "Recommended Lv 6" is the only guard. Change: none required; keep the journal line. Must stay: the stile Dash route.

**m5. Chase foes do not path around props.** (S) Observed (Fact): the `dn_pack` stood 2 tiles away behind the willow for over 6 seconds, `chase` mode, never closing, while I could not step toward it either.
Looks frozen; harmless. Change: none now; watch. Must stay: the 3-tile notice and the slow start.

**m6. Mira says "Four roads" at a signpost with five arms.** (S) Where: Downs arrival Talk against `downs_signpost` ("THORNFOLD. THE STONES. THE HIGH MOOR. DROVERS' ROAD. LARCHHILL ROAD."). Change: "Five roads". Must stay: the line's wit.

**m7. The pine and the Appraise bark (critic 5 and 10)**, both confirmed, sized S, as the critic wrote them.

**m8. Plan and battle docs describe 0.1 EXP.** (S, docs) Where: `docs/EXPANSION1_PLAN.md` 7, `docs/BATTLE_X1.md`. Observed (Fact): code is `EXPANSION_FOE_EXP_MUL = 1`. Change: edit
the docs to say full pay and +3 levels, accepted. Must stay: `expcurve.js` and the sim's "All targets met".

**m9. Ordinary optional fights have no decisions.** (watch, no change) Observed (Fact): 13 of 13 groups auto-won with no KO and 4 to 9 rounds. That fits gentle and optional; if a
second playtest finds it dull, add one shield to a Moor group, not HP. Must stay: fleeability and the optional EXP cap.

---

## 7. Protect these (ten)

1. The Stones scene (twelve names, the hero's single line, the blank thirteenth slab).
2. Brindle's whistle, the sheep trotting home on their own, and the counted journal line "Strays found n/5".
3. The Old Fold crack tell, Mira's bark and the lit "Dash" pill with its sword icon.
4. Patch's "!", lens and the pill's swap icon.
5. The Barrow as a room: landing, hall, slabs, the niche, the hearth a step from the boss, and Retry returning to the hearth at full HP.
6. The chase pace and the 3-tile notice (a standing party is caught in about 2 s, a walking one never).
7. The shortcuts: the Terrace drop to the Archive door, the hay chute gate, the cleft's harmless fall.
8. The loot beats that land: Bell Crown, Fold Mantle, the Apron and Ash Bite from the Golem.
9. The writing: Odo's nine posts, Hesper, Ferrick ("Weir broke. Told nobody."), no explained forgetting, no em dashes.
10. The main route: Lv 5 at the Warden, 8 at the Archivore, 9 at the end, 1,393 game seconds, and clean loads of old Episode 1 and 2 saves.

---

## 8. Not checked

Whether a real thumb mis-taps FLEE differently from my 5 and 25 frame gaps (the bug does not depend on the gap); the Hidden Fold and the
Cellar ink route end to end by hand (the autoplay report shows both solved); Four Rolls, Crates and Things Not To Forget by hand (bot
passes only); music and SFX (not listened); portrait orientation; a slow-network pack load; the Culvert resume case (M1's Inference);
the real human clock for any slice (section 5 is an estimate, not a timed run).
