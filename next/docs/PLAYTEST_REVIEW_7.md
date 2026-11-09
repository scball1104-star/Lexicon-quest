# Playtest Review 7: Episode 5 on a phone, from an Episode 4 save and from the quick start

Read-only fresh-eyes review, Monday 2026-11-09 (Eastern), checkout `D:\LexiconQuest` on branch `scott/ep5-design` with
`EP5_LIVE = true` (Fact, `src/game/episodes.js` line 11). Art and UX are in `docs/CRITIQUE_7.md` (same sitting); this file
is play, pacing, puzzles, balance and story beats.

Sources: the four E5-integrate autoplay runs (`qa/out/autoplay/{desktop,phone}-ep5{,-new}-report.json` and `-dialog.log`),
`qa/integrate/story_time.py` re-run on all four (`qa/out/review7/play/timer_2026-11-09.txt`), the simulator driven from two
scratch scripts (`qa/out/review7/play/sim_prophecy.mjs`, `sim_levels.mjs`), and my own short headless sessions on the phone
profile (844x390 at 3x, touch, one browser at a time, every one under a hard timeout), scripts and output in
`qa/out/review7/play/`:

- s1 the first five minutes from the Episode 4 credits save, real keys, normal text speed, the deck fight by hand;
- s2 every sun and shade puzzle at its natural approach, at rest, at each hour that matters;
- s3, s3b, s3c a dial by real keys, and the Starwright Bow's Lantern bridge by real keys;
- s4, s5, s5b the Sand Oracle and Turn the Sky through the battle menu (real keys and injected confirm);
- s6 try to lose a save (an Episode 5 save loaded with every `ep5` file blocked);
- s7 portrait 375x812 and desktop 1280x720.

Tags: **Fact** (seen in a render, a log, a measure or the code), **Reported** (from a plan, a report or the bot),
**Inference** (my reading, with the check that would settle it). Sizes: **S** hours, **M** about a day, **L** more.

---

## 0. Verdict

Episode 5 plays end to end from both starts with no softlock and no game over (Reported, 4 bot runs; Fact for every
session of mine), lands inside the time target (61 to 86 minutes on the repo's own timer, Fact), keeps every save (Fact,
s6), and its new field mechanic is the best puzzle idea the game has shipped: sun and shade reads from the floor, the hour is
chosen by name, and the puzzles are about where stones stand, not about cycling a wheel. But **a human cannot cast Turn the
Sky**. The Tech list opens on it in gold exactly as planned, and confirming it does nothing: the battle menu refuses any
party skill whose target is `none` (Fact, s5 and s5b, `src/battle/scene/menu.js`). Every bot acts through `battleAct` and
Auto, so all four integration runs passed. The episode's central decision, the Mirage Knight's lesson and the Oracle's
whole design sit behind that one bug. Fix it first (S), then fix the reading window, which today can promise "Mira can turn
the sky" when she has no turn before the Turn (major, S). With those two the episode is close to shippable.

---

## 1. Ranked findings

### 1. BLOCKER: Turn the Sky cannot be cast from the battle menu (keys or touch). (S)
- Where: `src/battle/scene/menu.js` sub-list confirm (about line 258) calls `startTarget(base)`, which returns false when
  `b.targets()` gives `mode === 'none'` (line 161), and the menu plays the buzzer. `turn_sky` is `target: 'none'`
  (`src/data/ep5/skills.js` line 25). No earlier party skill had a `none` target, so the path was never exercised.
- Seen (Fact): `qa/out/review7/play/s5_6_result.json` and `s5_sub.png`: Mira's turn with a foretelling pinned, the root
  cursor already on Tech, Z opens the list with Turn the Sky first in gold; Z on it, Z again: the menu stays `sub`, MP 134,
  the star still pinned. The same with `LQ_DEBUG.press('confirm')` (`s5b_result.json`), so it is not a key problem. Only
  Enter (Auto) cast it (MP 134 to 122, the sky turned). `s4_6_techlist0.png` shows the list.
- Why it matters: the Oracle's Last Prophecy, the Knight's Mirror Turn ("Turn the sky on it") and the star_reading lesson
  all need this skill. The simulator's attack-only party wins the Oracle 0% of the time (Fact, `sim_levels.mjs`, 120 fights);
  a human who tries the advertised answer hears a buzzer.
- Smallest fix: in the sub confirm, when `b.targets(unit, base).mode === 'none'`, return `{ ...base }` as the action (the
  root already does this for Defend). Then add a scene test that opens the Tech list with confirm presses and casts every
  party skill whose target is `none`, and one realplay check that casts Turn the Sky by key. (Alternative: give `turn_sky`
  `target: 'self'`; check the effect ignores the target.)

### 2. MAJOR: a reading can land with no Mira turn before it, while the text says she can answer. (S)
- Where: `src/data/ep5/ai.js` `readStar` (line 133) reads whenever the Turn is `READ_AT = 3` actions away **or less**, and it
  runs in `afterTurn`, after the Oracle's own action was counted (`rules.js` line 1459). `src/data/ep5/scene.js`
  `answerLine` (line 506) adds "Mira can turn the sky." whenever she knows the skill.
- Seen (Fact): `qa/out/review7/shots/crop_prophecy_timeline.png` (from the integrate shot): Arden is acting, the red pinned
  marker is the very next slot, Mira's head comes after it, and the box says "Mira can turn the sky." In 200 seeded
  fights at Lv 24, careful play: 494 readings, of which 125 came with 1 action left, 140 with 2, 229 with 3; Mira had a turn
  inside the window in 414 (84%); 45 landed even for the careful policy with Hourglass Sand (`sim_prophecy.mjs`). This is the
  bot's "11 read, 7 broken" (Reported): one desktop run had 3 land while Mira stood at 73 to 103 MP.
- Why: the decision is "read the marker, keep Mira ready". A window of one action that is not Mira's is not a decision; it is
  a dice roll the screen calls a choice.
- Smallest fix: read only when the Turn is exactly 3 actions away, and if Mira's next turn still falls after the marker,
  hold the marker one action past her turn (the `hold` path Hourglass Sand already uses). Make `answerLine` honest: when Mira
  cannot act first, say "Hourglass Sand holds the sky." instead. Re-run `--check`.

### 3. MINOR: the Oracle's difficulty is all or nothing, and an Episode 4 save meets it at Lv 25. (S, data)
- Seen (Fact, `sim_levels.mjs`, 120 fights each): careful Lv 24 win 100%, 13.9 rounds, 22% HP lost; reckless 72%; attack-only
  0%. Lv 25: careful 100% (19% lost, 12.5 rounds), reckless 80%. Mirage Knight Lv 24: careful 100%, reckless 94%.
- Arrival (Fact, reports): an Episode 4 save arrives at 9,608 or 9,746 EXP (Lv 21 or 22), the quick start at 8,900. The plan's
  18 fights add about 3,830 EXP (Fact, sim progression 8,900 to 12,729 before the Oracle), so an Episode 4 save that fights
  everything meets the Oracle near 13,400 EXP, Lv 25 (Inference; the bots stop optional fights at a cap, so they never show
  it). Check: one Continue run with the cap off.
- Is Lv 22 too easy? No (Inference): the Oracle stays inside its round band at Lv 25 and the reckless policy still loses one
  fight in five. The real risk is the 0% attack-only line: once item 1 is fixed the fight is fair, but until then it is the
  hardest wall in the game.
- Fix: none required. If Scott wants the Episode 4 save at Lv 24, drop one `e5l3_husks` group when the party arrives above
  9,650 EXP (the Episode 4 review's lever).

### 4. MINOR: Mira's MP before the Eye depends on Ethers; the last font is three landings up. (S)
- Seen: every bot run spent 2 to 6 Ethers on Mira in F3 and entered the Eye at full MP (Reported). Mira's pool at Lv 24 is
  about 134 (Fact, s5), Turn the Sky 12, so a full bar is 11 casts and the fight reads 2 to 5 stars (Fact, reports). The
  only font is `font_l3` on the top landing; from the islands the brass lifts `lift_s` and `lift_t` go back up (Fact,
  `ep5_lab_f3.js` lines 100 and 112; the bot's "font_l3 unreachable" is its grid not modelling lifts, Inference). The once
  per save hint "Keep something back to turn the sky." exists (Fact, `scene.js` line 26).
- Sane? Yes for a player who walks back up once (Inference). A player who goes down at 30 MP gets two or three casts.
- Fix: let `spring_return` act as a rest and save font once it has filled (it is the last landing; the story already says
  the water rises there). One line in the map, no new art.

### 5. MINOR: the Starwright Bow is findable and reachable; only the bot cannot get it. (S, bot)
- Seen (Fact, `s3c_end.png`, `s3c_result.json`): from the Truth island, west along row 23 past the spring, down to (8,24);
  the Lantern icon and its key appear over the party; a short press lights the faint bridge at (7,24); one step, Z, the
  Bow and its equip toast. Walking into the unlit bridge drops you back on the same tile with a fall sound, which is a
  fair hint. The chest is in view from the island row (`s2_phone_f3_truth_bow_ledge.png`).
- The bot's "no tile to stand on next to chest_bow" (Reported, all four runs) is `qa/autoplay.py` Episode5 `lab_f3`: its
  static grid still calls (7,24) a pit after `reveal_near`.
- Fix (qa only): rebuild the grid after a reveal (or mark revealed `ink_bridge` cells walkable) so the route covers the Bow.

### 6. MINOR: the hour change is told by shadows alone; dawn looks like noon. (S)
- Seen (Fact): the road at noon and dawn from the dial (`s2_phone_road_noon_at_dial.png`, `_dawn_`): the same light; mean
  of an unshaded sand patch R/G/B 0.79/0.59/0.33 at noon against 0.74/0.52/0.27 at dawn, while dusk drops clearly (0.64/0.44/
  0.29). `LQ_DEBUG.shade()` reports `tint: 'dawn'` (Fact, s3), so it is there, just weak.
- Why: the plan's sweep plus a tint cross-fade is the feedback that "the hour changed". Today a player who picks Dawn sees the
  shadows jump and the screen stay the same.
- Fix: a stronger rose dawn tint (about the dusk tint's strength, warm instead of violet), or the optional `desert_noon` pale
  tint so dawn and noon differ by contrast.

### 7. MINOR: the noon "stair" to the road island hides under the stones' own sprites. (S)
- Seen (Fact, `s2_phone_road_noon_island.png`): the island chest is in plain view (good bait), but the noon shadows of
  `ss_step` and `ss_isle` fall on the cells the stones' sprites cover (`MAPS_EP5_A.md`: (17,8..9) and (18,7..8)), so about
  one shaded cell shows. The path reads only by bumping. Optional chest, so minor.
- Fix: draw the shade layer above the lower half of a caster's sprite (or trim the stones to h 1 art), so the stair shows.

### 8. MINOR: pacing is inside the target; two scenes run long. (S, story)
- Timer (Fact): Episode 4 save 61 to 81 minutes (phone and desktop), quick start 66 to 86; first fight 3.6 to 4.7 minutes
  after the morning (target under 5). Battles 14 (save runs, optional fights capped) to 18 (quick start) against 18 planned.
- Boxes (Fact, my count of `say` and `narrate` in `src/data/ep5/story.js`): about 204 on the main path against about 200.
  `vex_gallery` 15 against its 12 budget; `oracle_after` 19 of 22; `star_reading` 14 of 16. The longest dialogue run is F2
  (2.8 to 3.1 minutes: arrival, the map memory, Vex, the Knight).
- Fix: trim `vex_gallery` to 12 (keep "Every night I move you", "A lie that saves lives is still a lie" and "Somebody asked
  me to keep you. In writing."). Story decision for Scott and Stephen.

### 9. MINOR: the Turning Sky is learned by the second fight, mostly through WEAK popups. (S)
- First fight (Fact, s1): the deck opens at Night with the marker 4 actions out, Mira's line "Sun-things, at night. Hit them
  now, before the sky turns.", every hit shows WEAK and Breaks come fast; at the Turn "The sky turns. Day." and the foes take
  a thick gold rim (`s1_fight_open.png`, `s1_fight_turned.png`).
- Second fight (Reported, quick-start runs): `e5r_stalkers` at noon, both foes Ascendant, nothing Exposed until the Turn. The
  lesson it teaches is "wait for the Turn", which is right (Inference). The words Exposed and Ascendant never appear on
  screen (Inference from the frames; check the bestiary). The field link (dusk starts a fight at Night) is never said.
- Fix: one Talk line on the road after the first fight ("Sun-things glow by day. Fight them at dusk, or wait for the turn.").

### 10. NIT: the Valewyn morning Talk lists two old hints under the Episode 5 step. (S)
- Seen (Fact, `s1_result.json` log): Talk gives "Yara's ship is at the south landing..." first (good), then "Quill's pool,
  east of the fork..." and "Listen. Doors. Everybody in Valewyn is opening a door..." from earlier content.
- Fix: while `ep5_started` and not `ship_boarded`, show the Episode 5 line and Mira's, and hold the rest.

---

## 2. The first five minutes (EPISODE5 section 1), from the Episode 4 save, real keys

Bot frame counts at 1x with real keys (Fact, `s1_result.json`), plus about 2.5 seconds a box for a first-time reader
(Inference). Walking is the bot's direct path; a first-time player is slower (Inference, x1.5 to 2).

| Bible | Beat | Measured | Verdict |
|---|---|---|---|
| 0:00 | Fade in, Mira at the window, five boxes | first line 5 s after the load (party walks to marks) | holds |
| 0:20 | the star letter close-up | page 2 of the scene; "Mira / Bram", the top line a faint smudge | holds |
| 0:35 | Control in the inn | about 0:35 with reading (7 boxes, 12 s of staging) | holds |
| 0:40 to 2:00 | Valewyn to the south landing | 6 s to the street plus 15 s to the berth on the direct path; the toast "Board Yara's ship, south landing" | about 1:20 to 1:50 |
| 2:00 | the Saffron Wind at night | 4 s fade, 2 boxes, control | about 2:00 to 2:20 |
| 2:40 | Bram at the bow, the choice | 11 s walk to the bow; `Mine.` / `Nobody's. Go to sleep.` | about 2:40 |
| 3:30 | sand across the water, the fight | 2 s walk to the fight row, one narration, Mira's line | about 3:00 to 3:20 |
| 5:00 | dawn mid-fight, win | the Turn after 4 actions (about 10 s in); my fight 35 s with instant input | Turn about 3:30, win about 4:15 to 4:45 |

A question inside 60 seconds (whose name went), a choice with a cost by 3 minutes, a fight before 5: the table holds (Fact
for the order, Inference for the human seconds). The one soft spot is the deck itself: the first new map is very dark
(CRITIQUE_7 item 4).

---

## 3. Sun and shade: clarity without text, and is it different from the tide locks

At rest on the phone, no Talk (Fact for what is on screen, `qa/out/review7/play/s2_phone_*.png`; Inference for what a
newcomer concludes):

| Puzzle | At rest | Verdict |
|---|---|---|
| Road, the Glass Flat (`road_*_at_dial`) | pale striped sand across the road, an obelisk on the far bank, a dial with "!" | Clear. Dawn lays a one-tile violet bridge straight across the flat from the obelisk. The dial list reads "Dawn / Noon (now) / Dusk" with the cursor on now (Fact, s3) |
| Road, the island (`road_noon_island`) | chest on a paved island, two stones | Bait reads; the stair hides (item 7) |
| F1 B, two shadows (`f1_b_*`) | the strip of running sand with a chest on it, two obelisks | Clear: dawn's band crosses the strip at the chest's row |
| F1 C, the groove (`f1_c_*`) | a stone in a groove beside a sand corridor | Clear once B is done; the Shove prompt names itself |
| F1 D, the sun plate (`f1_d_*`) | plate, gate, a big sand court | The order (dawn latches, noon walks) is forced by reach, never by a wrong answer: good |
| F1 E, far court (`f1_e_*`) | a sand pool with two chests on it, the tall obelisk | Clear: dawn's long band reaches the chests |
| F2 B and D (`f2_*`) | lapis floor, light shafts as bright bands, pillars | The inversion reads: the light is the barrier. Good |
| F3 landings (`f3_*`) | basalt, sand bright only in lamp pools | Clear: "we are the sun now" reads from the pools |

No state I saw reads wrong: sand that runs is always the pale striped layer, sand that holds is under violet or in the dark
(Fact). One near-miss: F1's dune walls are drawn as brown wave-textured sand (`f1_b_noon`, solid by the walk grid) beside
the pale running sand; a newcomer may call both "sand", but both stop you, so nothing lies (Inference, nit).

**Different from Episode 4? Yes.** Tide locks were one number cycled at a wheel; here the hour is one choice by name and the
puzzle after F1 is where a stone or a lamp stands (Fact, MAPS_EP5_B solutions). The rule inverts indoors and again in the
Well, and the bot needed 1 to 3 decisions a puzzle (Reported), so nothing is cycling busywork. The plan's "another dial"
risk is met (Inference).

---

## 4. The Sand Oracle and the Mirage Knight

- **Readable?** The pin reads well: the named member's head in a red slot with a red star on the timeline, a red star over
  the member in the field, the telegraph line, Mira's Tech list floated and gold, the root cursor already on Tech (Fact,
  `s4_6_techlist0.png`, `s5_sub.png`). That is everything Review 6 asked for after Answer.
- **Fair?** Not yet: the skill cannot be cast (item 1), and one reading in four leaves one action (item 2).
- **The Knight**: the shield shows the other sky, the HUD row sits above the helmet, not across the body (Fact,
  `p_battle_mirage_knight.png`). Its lesson is "turn the sky on it", which also needs item 1. Careful play wins 100% at Lv 23
  (Fact, sim).
- **Turn the Sky found when pinned?** Found, yes (gold, first, cursor on Tech). Usable, no (item 1).
- **Answer on the Oracle**: says "A foretelling is not a decree." (Reported, plan 6.5; not seen).

---

## 5. Story beats (Inference unless marked)

- **Mira's silence** lands: the morning ends on her not answering (Fact, log), she says nothing about it for the road and
  the Haven, and the observatory pays it in three lines: "I read it on the letter. On the ship. I didn't say it." / "That's
  the first time I've read something and not said it." / Bram: "You did say it. You just took the long way." (Fact,
  `phone-ep5-dialog.log` lines 84 to 86). The close-up's starlight words finish within 2 seconds (Fact, `s7_desk1280_star_reading_2s.png`).
- **Sel's walk** lands: "Twenty years I believed it. Then three people walked in here off a list..." and "So I'm a fool, or
  the Oracle is." (Fact, log 166 to 169), then "There you are. Late, as usual." at the chart (log 215). Her restraint holds.
- **The Mirage Knight and Vex**: Vex's scene is the longest on F2 and over budget (item 8).
- **The show-don't-tell payoffs** are close-ups now (CRITIQUE_7 protects them); the chart's order is the one slip
  (CRITIQUE_7 item 7).

---

## 6. Saves and sound

- **The save rule held every way I tried (Fact, s6).** Slot 0 an Episode 4 finish, slot 1 an Episode 5 save in F2; reloaded
  with all 196 `ep5` files blocked; Continue on slot 1 landed the party in Emberpeak with the toast "Some new places could
  not load. They will try again." (Fact, `src/game/packs.js` line 36); I walked, talked and opened menus; both slots were
  byte-identical afterwards. The quick start wrote only its own slot in both bot runs (Reported, "slots checked ... only slot
  1 was written"). Review 6's P1 is fixed.
- **Sound on the quick start**: zero "unknown ... id" warnings in both quick-start bot runs (Reported) and in all eight of my
  quick-start sessions (Fact). Music identity was not checked by ear.

---

## 7. Ten to protect

1. Sun and shade as geometry: the hour by name, every shadow swinging at once, Shove the shade-maker, the indoor and Well inversions.
2. The dial's three notches with the lit one large and a needle, drawn above the stand (CRITIQUE_6 item 4 fixed).
3. The teaching ladder: one dial and one obelisk first, order by reach, never a wrong-answer gate.
4. The save rule: the blocked-pack landing that never autosaves, and the quick start's own slot.
5. The pinned marker: the target's head on a red slot with a star, and a red star over the member in the field.
6. Turn the Sky floated first and gold with the root cursor on Tech; its help line "Turn the sky now. Breaks a foretelling."
7. The deck fight as the Turning Sky's lesson: Night, marker 4 actions out, one line from Mira, WEAK on every hit, then the Turn.
8. Mira's three observatory lines and Sel's "So I'm a fool, or the Oracle is." Do not trim them in item 8's pass.
9. The pacing: 61 to 86 minutes and a first fight under 5 minutes, with 18 fights and about 200 boxes.
10. The Bow as a Lantern secret you can see from the island: keep it visible, keep the harmless fall.

---

## 8. Top 10 to fix

| # | Fix | Where | Size |
|---|---|---|---|
| 1 | Cast `none`-target party skills from the menu (Turn the Sky), plus a menu-path test and one realplay cast | `src/battle/scene/menu.js` sub confirm; a scene test; `qa/realplay` | S |
| 2 | Read a star only at 3 actions out; hold the marker past Mira's turn; make "Mira can turn the sky." conditional | `src/data/ep5/ai.js` `readStar`, `sky.js` hold, `scene.js` `answerLine` | S |
| 3 | Stronger dawn tint (or the pale noon tint) so the hour change shows on the screen | `src/data/ep5/field/system.js` tints | S |
| 4 | `spring_return` becomes a rest and save font once filled | `src/data/maps/ep5_lab_f3.js` | S |
| 5 | The bot covers the Bow (rebuild the grid after a Lantern reveal) | `qa/autoplay.py` | S |
| 6 | Shade above the lower half of a caster's sprite so the noon island stair shows | `src/data/ep5/field/art.js` draw order | S |
| 7 | One road Talk line about fighting sun-things at dusk | `src/data/ep5/quests.js` | S |
| 8 | Trim `vex_gallery` to 12 boxes | `src/data/ep5/story.js` (story decision) | S |
| 9 | Valewyn morning Talk: the Episode 5 step and Mira only | `src/data/ep5/quests.js` | S |
| 10 | Re-run the sim and one Continue run with optional fights on, to confirm the Oracle at Lv 25 is still in band after 1 and 2 | `tools/sim`, `qa/autoplay.py --episode 5` | S |

**Verdict.** Episode 5 is the best-built episode yet on the field: a new rule you can read from the floor, puzzles that teach
before they test, a save rule that holds under a broken network, and a story whose two quiet beats (Mira's silence, Sel's
walk) land. It is not playable as designed by a person, because the one skill the boss is built around buzzes when chosen;
every bot missed it because no bot opens the menu. Fix item 1 and item 2 (both S, a few hours together), add the menu-path
test so the next signature skill cannot slip the same way, and this is ready for Scott's and Stephen's own playthrough.
