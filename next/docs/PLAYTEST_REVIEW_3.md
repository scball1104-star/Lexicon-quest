# Playtest Review 3: Episode 2, The Town Without a Name

Read-only design review, Wednesday 2026-10-21 (Eastern), branch `overhaul`. The reviewer is a player and game
designer; art and UX are CRITIQUE_4's, cited here only where they change play. Sources: `src/data/story/ep2.js`
(scene boxes counted per scene), the maps (`east_road`, `nameless_hollow`, `court_f1..f3`, `court_throne`),
`docs/MAPS.md` section 6, `quests.js` (Talk), `ai.js`, `enemies.js`, `state.js`; the four Episode 2 autoplay runs
(`qa/out/autoplay/{desktop,phone}-ep2{,-new}-*`, 14:15 to 14:57 today) and the Episode 1 run (15:10);
`qa/integrate/story_time.py` re-run on all five; `simulate.mjs --check` ("All targets met") plus my own sim runs
(300 battles per row, and three in-memory tuning tests that edit no file); one static `mapcheck walk court_f1`; the
Episode 2 shots and map previews. I did not play by hand or start a browser. Claims are tagged **Fact** (read from
code, logs or sim output), **Reported** (from the integrator or HANDOFF) or **Inference**.

How minutes are estimated (story_time.py's own rule, kept so numbers compare): every page the bot saw, read at 15
characters a second plus 0.6 s; the bot's field time x1.5 to 2.0; fights at 1x with 1.5 s per command.

---

## 0. Verdict

Episode 2 is a better-built episode than Episode 1 was at the same stage: every beam puzzle can be read from the
screen, the Other Selves and the King are real telegraph fights with real choices, and the King, Elian and Mira
threads pay off in one strong scene. Its problems are pacing and one difficulty spike, not design: fresh-start and
"skip a few fights" players arrive a level under the plan, which makes the mini-boss harder than the final boss,
and the Fading Road's respawns plus a Borrowed-Shadow-heavy F2 add about ten minutes of fights nobody planned.

---

## 1. The first 15 minutes

Fresh start (`newGameEp2`, the desktop run), every optional farewell taken. Clock is a first-play estimate
(Inference from the run's pages, field time and battles); skip the optional parts and subtract about 1.5 minutes.

| Clock | What happens | Boxes |
|---|---|---|
| 0:00 to 1:05 | `ep2_morning`: Hazel, the count, one choice, two Hazel talk lines | 11 + 2 |
| 1:05 to 2:35 | walk to the well; `ep2_mael`: the blank letter, GONE TO THE FORD, one choice | 13 |
| 2:35 to 3:50 | optional: Tess starts The Last Route; Iris in the library; Talk | 5 + 6 |
| 3:50 to 5:40 | south gate, the valley, the east branch; often one Episode 1 valley wolf (2 rounds at Lv 9) | - |
| 5:40 to 6:50 | `garrick_crossing`: the planks, the toll, the rail | 14 |
| 6:50 to 7:50 | bank road east; `east_road_arrival`: the blank signpost | 4 |
| 7:50 to 9:30 | **first fight** `east_first_fight`: Mist Wolf and Glassback, Harden, a spell thrown back (5 to 6 rounds live) | 2 + 3 |
| 9:30 to 12:30 | the bank road: the milestone (optional), the bank wolves, the Dash-crack clearing (a quicksilver group, a chest) | 6 |
| 12:30 to 15:00 | the fog edge: `fading_stretch`; the guard beetles stand on the true path at (28,16), a forced fight | 4 |

- **Is there a fight in the first five minutes?** No (Fact: no scripted fight before `east_first_fight`). The first
  designed fight starts at about 6 to 8 minutes. The only earlier fight is an accidental Episode 1 valley wolf, two
  rounds at Lv 9, which reads as filler. It is still sooner than Episode 1's first blow (10 to 13 minutes,
  PLAYTEST_REVIEW_2).
- **First puzzle:** none in the first 15 minutes. The fog band is not a puzzle today: the true path is drawn in
  worn-path tiles (`east_road.js` line 84) inside a three-wide corridor (Fact). The first beam puzzle, Court F1 room
  B, arrives at about 40 to 48 minutes (Inference), a third of the way in.
- **First reveals:** the blank signpost (about 7:30), the milestone the Lantern cannot help (about 11, optional),
  the Court across the mere (about 25 to 28), the faces in the fountain (about 28 to 32).
- **Where it drags.** (a) 0:00 to 7:00: 49 boxes in five scenes with nothing to press but confirm, and one beat
  said twice 90 seconds apart: Mira's "Every map of the east stops at the river. As if the mapmaker forgot the next
  stroke." (`ep2_morning`), then Mael's "Every book I own about the Hollow stops in the same place. As if the writer
  forgot the next word." (`ep2_mael`) (Fact). A player continuing from an Episode 1 save reaches this straight after
  Episode 1's 52-box tail and the credits: two farewells to the same town back to back. (b) The road is good minute
  to minute, but it runs about 20 to 23 minutes against the plan's 12 because its groups respawn (section 4).
  (c) After the gate (about 28 to 42): `nh_arrival` 10, `fountain_faces` 12, `elian_hall` 16, `anwen_register` 13,
  `tovin_ferry` 10, so 61 boxes across four locations with no fight and no puzzle (Fact). The writing is good; the
  problem is that it follows a long road.

---

## 2. The beam puzzles, one by one

Method: lens start states and positions from the map files, the `_solved` previews, mapcheck, the shots. Every lens
starts wrong and splashes where it can be seen (Fact, checked per mirror below). mapcheck: F1 16 configurations,
F3 92, no softlocks anywhere (Fact, MAPS.md 6.2; F1 re-walked today, every event reached).

| Puzzle | Goal readable from the screen? | Tools readable? | Where a first-timer stalls | Does Talk rescue? |
|---|---|---|---|---|
| **F1 B, the teach room** | Yes: the crystal `rec_b` (27,19) sits beside the barred `gate_b`, one inlay cell between them, all in view from the door | One mirror with the bobbing prompt; `mir_b` starts '/' and splashes on the west wall (12,19), pointing at the way you go later | Nowhere; one press. Small risk: the room has two identical barred glass gates; `gate_short` (13,17) stays shut until E's floor switch, so the west gate invites a wrong guess. The `first_mirror` and `first_receptor` barks cover it | Yes |
| **F1 Silverglass Lock** (C, N, E) | Partly: `rec_lock` (25,7) is two rooms from the source; you learn the goal by following the light | `lens_1` (6,13) '/' splashes west; `lens_2` (22,13) backslash splashes south; `lens_3` (22,7) backslash splashes west; `block_n` (15,13) stands in the line and the beam splashes on it | (1) `door_c` is locked; the key is in D behind the teach gate. (2) The beam disappears into glass slots (11,13 and 22,9..11); you follow by walking, which is the point. (3) The block: Episode 1 taught push blocks, and the splash on its face reads | Mostly. Bram: "Keys are never next to their locks. I'd look east." Nothing mentions the block |
| **F2 north bridge** | Yes: the beam reaches a three-cell moat | `m_n1` (18,5) '/' splashes west; one turn lays the bridge with `first_glass_bridge` | Nowhere. The dim rail is near invisible on the phone (CRITIQUE_4 item 7), so you learn a bridge exists only by turning | Yes |
| **F2 east and the island** (one beam, two bridges) | Yes: the island with a mirror and a pool across the Well; the Keeper alcove east | `m_e1` (32,12): east lays bridge A to the alcove, west lays B to the island; `m_i1` (21,12) lays C south | The commit choice reads. Stepping onto a dim rail drops you into the Well and back to the Portrait Hall, a one to two minute walk. The glass key (`chest_key2`, East Gallery north-east corner) is easy to walk past; at `door_w` Talk without the key repeats the bridge hint and never points at the chest | Partly |
| **F3 Belonging** (dark) | Partly by design: the crystal is in the dark until the beam reaches it | Three mirrors in sequence; each wrong state splashes (`m_w1` west, `m_w2` south, `m_w3` east) and each right turn lights the next mirror | The darkness hides the next mirror until the beam or the party's light reaches it; that is the idea and it works because each turn reveals the next step | Yes, and Talk updates as vows light |
| **F3 Mercy** | Yes: `rec_mercy` (39,8) across the chasm | `m_e1` (34,19) lays the bridge north; `m_e2` (34,8) waits across it | Order is forced by the chasm; a fall lands on the lower ledge with a stair back | Yes |
| **F3 Courage** (Shove) | Yes: the beam crosses the socket inlay (12,27); the crystal is at the end of a long bridge | Heavy `mirh_c` (14,27) two tiles off the socket; the pageR Shove prompt; inspect "It turns, but it will not slide. Not for you." | The only two-verb puzzle (shove twice, then turn). A fresh-start player has never needed Shove before; the `first_heavy_block` bark names the button | Yes: Bram says he will shove it |

**Verdict.** Every puzzle can be solved from the screen alone on desktop (Fact for the mechanics: one decision per
mirror, every wrong state splashes in view, no softlocks; Inference for how a human reads it), which meets plan
section 11. The phone's weak waiting states (CRITIQUE_4 item 7: dim bridges, 2 to 3 px vow crystals) are the one art
item that changes play: on the phone you find bridges by trying. Challenge is low: the bot needed 14 turns for all
8 receptors and bridges, 1 to 3 each (Fact, run notes), and no puzzle asks you to undo a correct turn or feed two
receptors from one beam except F2's commit. Given the episode's length, keep it that way in the fix pass. Talk names
the next step everywhere except the two gaps in fix 10.

**The fog band.** Today a walk on a drawn path. If CRITIQUE_4 item 4 hides the path, it becomes a real puzzle with a
harsh fail state: every fog door lands at `fog_return` (19,18), the band's start, up to 20 tiles back (Fact,
`east_road.js` line 161). See fix 9.

---

## 3. Difficulty at the levels players will actually have

**Levels (Fact).** `EP2_START` makes a Lv 9 party at the Lv 9 floor, 1156 EXP (`state.js` line 54 via `newMember`),
but Episode 1's full clear ends at 1433 and the plan's curve starts there. The fresh-start bot stayed Lv 9 for all
10 road fights, reached the Other Selves at Lv 11 and the King at Lv 12. The sim's 80% route (skip one group in
five) meets F2's end at Lv 10 to 11 and the King at Lv 12. So **Lv 12 is the typical King and Lv 10 to 11 the
typical Other Selves**, but the boss targets are checked only at Lv 11 and 13 (`BOSS_LEVELS`).

| Fight (sim) | Lv | Careful win | Rounds (p90) | KOs | Ignoring telegraphs | Attack only |
|---|---|---|---|---|---|---|
| Echo Warden (Ep1 mini-boss) | 5 | 100% | 8.2 | 0.01 | 100% | - |
| Archivore (Ep1 boss) | 7 / 8 | 97% / 100% | 12.1 / 10.3 | 0.5 / 0.2 | 43% / 80% | 0% |
| **Other Selves** | **10** | **79 to 81%** | 8.1 (10.7) | **1.7 to 1.9** | 63 to 66% | 0%, dead in 2.8 rounds |
| Other Selves | 11 | 92 to 93% | 8.0 (10) | 0.8 to 0.9 | 81 to 82% | 0% |
| Other Selves | 12 | 99% | 7.6 | 0.5 | 95% | 0% |
| Nameless King | 11 | 86% | 14.6 (18.3) | 2.0 | 19% | 0% |
| **Nameless King** | **12** | **95 to 97%** | **13.5 to 13.7 (17.7)** | 1.2 | **34 to 49%** | 0% |
| Nameless King | 13 | 97 to 98% | 12.1 to 12.7 (16.3) | 0.7 to 0.9 | 65 to 73% | 0% |

Live (the bot on Auto, Fact): the Other Selves took 10 to 12 rounds, the King 16 (desktop, Lv 12), 19 (phone, Lv 12),
14 and 14 (Lv 13). Live fights run about 30% longer than the sim, as in Episode 1.

**The Other Selves: a fair design with a numbers spike.** The rule ("everything you are not"), Mira's one tip and
the Mirrored Combo are readable and good. But at Lv 10 careful play loses one fight in five with nearly two KOs in a
typical win, where the Echo Warden lost nobody, and the mini-boss is harder than the final boss at the levels
players have (80% at Lv 10 against 96% for the King at Lv 12). Cause (Fact): the built ATK and MAG sit about 16% over
the plan (`refl_hero` ATK 100 vs 86, `refl_mira` MAG 102 vs 87, `refl_bram` ATK 88 vs 75), and an attack-only party
dies in about 3 rounds against 8.5 for the Archivore: a burst fight. Tested in memory: ATK and MAG x0.9 gives 90% at
Lv 10 (1.1 KOs), 97% at Lv 11, 8.1 to 8.3 rounds, and ignoring telegraphs still costs 8 to 13 points.

**The Mirrored Combo is a real choice nobody is told about.** The sim splits the pair in 1.6 to 1.9 of 2.9 to 3.4
combos a fight (Fact), so the answer works. On screen the telegraph says only "{a} and {b} move as one..." and Mira's
tip is about weapons. On the phone the Nameless Reflection is hidden under the command window and its "!" points at
nothing (CRITIQUE_4 item 1), and the timeline heads cannot be told apart (item 9): the player sees a bracket joining
two blobs. Those two art items decide whether this telegraph can be played.

**The King: the right fight, a long middle.** Shape at Lv 12 (sim, 120 fights, Fact): phase 1 2.1 rounds, phase 2
(the ward and the adds) 7.0, phase 3 4.5; 4.5 telegraphs a fight; Defend is only 10% of party actions; Kept lands
0.4 times and is held off by Defend or Guard 1.3 times. So the telegraphs give a real choice (Defend the named
member, Bram's Guard, race to a Break, or accept and Recall), not a Defend chore. The long part is the middle: the
ward is half the fight. Tested in memory: Sorrow and Pride HP x0.8 brings Lv 12 to 12.0 rounds (p90 15.7) and Lv 13
to 11.3, careful 95 to 99%.

**Kept: tense, with two feel-bad edges.** Mira in the glass prism reads at a glance (CRITIQUE_4 protects it), the
telegraph names the target, and four answers exist, two of them taught in Talk. The edges (Fact, `ai.js`): (1) each
Kept adds +25% ATK and MAG to the King for the rest of the fight (`KEEP_EMPOWER` 0.25, line 474; the plan said +10%,
"a smaller snowball than Devour Name's +20%") with no sign on screen; that stack is why ignoring telegraphs at Lv 12
halves the win rate. (2) `keepTarget` picks Mira 40% of the time before the random roll, about 60% in all with
three free members, so the King usually seals the one member who carries Recall. A telegraphed Last Decree KOs a
non-defender at Lv 13 (trace, seed 3); that is fair.

---

## 4. Length

| | Ep2 fresh start (desktop) | Ep2 from Ep1 save (desktop) | Ep1 (desktop) |
|---|---|---|---|
| story_time.py estimate | 121 to 153 min | 112 to 142 | 99 to 117 |
| dialogue at 15 cps | 34.6 min (444 pages) | 33.6 | 32.2 (407) |
| field x1.5 to 2.0 | 38 to 51 | 36 to 48 | 35 to 47 |
| beam puzzle allowance | 12 to 24 (8 x 1.5 to 3) | 12 to 24 | **0, not counted** |
| fights at 1x | 36 to 44 (36 fights) | 31 to 37 (36) | 31 to 38 (33) |

(Fact; phone runs 121 to 153 and 110 to 140.) **The comparison is not like for like:** story_time.py gives thinking
time only to notes that start "beam ", so Episode 1's blocks, keys and Lantern bridges count zero. Without the
allowance Episode 2 is 109 to 129 (fresh) and 100 to 118 (from a save) against Episode 1's 99 to 117. Scene boxes are
equal: 361 against 362 `say`/`narrate` calls (my count, branches included). Episode 2's real extra length is fights,
most of all from a fresh start.

Against the bible's budget (Inference, midpoints):

| Act | Plan | Measured | Main cost |
|---|---|---|---|
| I Willowmere and the crossing | 6 | about 8 | 49 boxes |
| II the Fading Road | 12 | about 20 to 23 | 9 to 12 fights from 7 placed groups: `east_road` is `area: 'field'`, so groups return 60 s after a win (`field.js` line 45) |
| III the Hollow | 15 | about 14 | 61 boxes in the main chain, the side stories |
| IV F1 | 12 | about 20 | 8 fights, 2 puzzles |
| IV F2 | 16 | about 28 to 32 | 9 to 10 fights at 6 to 7 rounds live, 3 puzzles, 47 scene boxes |
| IV F3 | 15 | about 22 to 25 | 6 fights, 3 puzzles, a shopping trip home (Vessa's top tier opens at `court_f2_done`) |
| V the King | 8 | about 7 to 8 | 13 + 33 boxes, 14 to 19 rounds |
| VI Hollowmere | 6 | about 4 | 23 boxes |

F2's live fights deserve a line (Fact): the Borrowed Shadow is in 6 of F2's 8 groups, and the groups that hold it
run about twice the sim live (`c2_shadows` 6 to 10 rounds, average 7.6, against 3.4 to 3.6 in the sim; `c2_mixed`
5 to 8 against 3.3 to 3.5). The cause is unknown (the report does not log action types); see Not checked.

**Should it be trimmed? Yes, by about 11 to 13 minutes, from fights and repeated boxes, not from story.**

Fights (about 7 to 9 minutes):
1. `east_road`: groups return only when the map is re-entered (the dungeon rule). The bot fought 9 to 12 times against
   7 placed groups: saves 3 to 5 fights.
2. `east_road`: remove `e_way_wolves` (46,19), so the Waystation fire is a real haven: 1 fight.
3. `court_f2`: 8 groups to 6, removing both `c2_shadows` (the double-mimic groups, the longest live): 2 fights,
   about 2.5 minutes.
4. `court_f1`: 8 groups to 7, removing one `c1_quick` (3 to 8 rounds live): 1 fight.
   With 1 to 4, set `EP2_START` EXP to 1433 and raise Episode 2 ordinary EXP about 10% so `simulate --check` levels
   still pass.

Boxes (about 35 boxes, about 3 minutes at the measured 4.7 s a box):

| Scene | Now | Target | Cut |
|---|---|---|---|
| `ep2_morning` | 11 | 7 | Mira's map line (Mael says it), "Twelve beams", the "packed twice / once for you" pair to one box, one choice reply |
| `ep2_mael` | 13 | 9 | "So I wrote a letter..." (the narration shows it), "The east ford washed out..." (Bram's note says it); merge "I tried three times" into the narration |
| `garrick_crossing` | 14 | 10 | "Five. Counting the G.", "Couldn't have you three wading", Hal's rolls, the knife narration (the rail line carries it) |
| `elian_hall` | 16 | 11 | "Sit, if you like", the Fitch whistle line, the king branch's second box; keep crisis, ledger, bell, letter, the pale name |
| `vex_mirror` | 16 | 11 | the two choice replies (keep the choice), the after-banter pair, one narration |
| `other_selves` | 11 | 9 | the opening and closing narration (keep "That's me. I don't stand like that.") |
| `king_after` | 33 | 26 | the Tovin narration, "The second fragment of the Book of Names..." (Mira's "Hollowmere." alone), "Father called it the Kept Promise...", the frame narration (Aurel's line says it) |
| `court_f1_stairs`, `court_f2_stairs` | 2 + 2 | 0 | stairs banter; the flags can be set silently |

Boss length (about 1 to 1.5 minutes): the level fix (King at 13 runs 12.1 rounds against 13.7 at 12) and Sorrow and
Pride HP x0.8 (fix 7).

**New estimate (Inference):** fresh start about 109 to 141, from a save about 100 to 130 on the integrator's
yardstick; without the puzzle allowance about 97 to 117 fresh, which is Episode 1's 99 to 117. Both episodes still
measure long against the 60 to 90 design target on this yardstick. The check that settles it is cheap: one timed
human run of Acts I and II (about 30 minutes) against the estimate.

---

## 5. Story beats

- **Does the ending land?** Mostly yes. `king_after` puts the episode's three threads in one room in the right
  order: "I traded my name for theirs", the son at the door, "Aurel. Your name is Aurel." under the name flash (the
  speaker tag changes under it, a lovely touch), the town's name, the hero's name written twice, the list and the
  feather, the Kept Promise. Three caveats. (1) It is 33 boxes, the longest scene in either episode, and the tail
  after the last blow is 56 boxes (Episode 1: 52). (2) The last image, "Your reflection is there now. Faint," is text
  only on screen (CRITIQUE_4 item 2), so the hero's own beat ends on a sentence. (3) The hook repeats Episode 1's
  formula almost exactly: night, a single toll, a three-second wait, Mira: "...Thirteen." (Fact, `ending_hook` in
  ep1.js against `ep2_ending`). The second time it lands as recognition, not surprise.
- **The King's reveal pays off**, because the Court shows it in order before anyone says it: the portrait of the king
  with a boy on his shoulders, the three vows (the crown the boy wants, Tovin carrying the boy out of the mere, "Take
  mine instead" with the mouth that keeps moving), then Mira's third memory. By the throne room the player knows
  what he gave and why; the fight earns the name.
- **Elian's thread pays off, but its key line is not set up on the main path.** "That coat. It was always too big
  for you." and "This was wrapped in the coat, on the chapel step" are the reveal's hinges, yet "coat" appears in the
  main script only in `king_after` (lines 915 and 956); the foundling and the coat live in the optional chapel book
  `nh_register_page` and in the NPC `about` text (Fact). Elian's "You stand like someone I used to wait for" seeds the
  waiting; nothing seeds who he is. One narration box and one Anwen line fix it (fix 5).
- **Vex Quill is not set up.** His first appearance anywhere in NEXT is `vex_mirror` on F2 (Fact: no earlier mention
  in ep2.js, npcs.js or quests.js). The scene is 16 boxes of six aphorisms, between the F2 font and the Other Selves,
  so 27 boxes separate the font from the first blow. The payoff works ("A man with silver hair... left a feather."
  Bram: "Vex.") and "You're missing a page. The first one." is the episode's best hook for the hero, but a cold open
  plus a long speech makes him read as a lore delivery, not a rival. Seed him once in the Hollow and trim the scene
  (fixes 4 and 5).
- **Mira's arc is the spine and it holds**: counting as memory (forty-one candles, eleven pebbles, "Fifteen years. I
  counted."), "I was seven, and I ran," the boy in the water, "You came back. That was the whole promise."

---

## 6. Ten moments to protect

1. **The Glassback teaching fight**: Harden as a forced opener, a spell thrown back, then "Crack the shell, then
   cast." / "Axe first, then magic. Noted." It teaches Reflect without a tutorial box, as the Episode 1 wolves taught
   Lunge.
2. **Garrick's toll**: "Toll's one word." "Garrick." "Paid." and the rail GARRICK'S CROSSING. SAY IT WHEN YOU CROSS.
3. **The milestone**: the Lantern, the old tool, finds nothing: "This wasn't hidden. It was taken." It teaches the
   new episode's rule with the old episode's verb.
4. **Mira's counting**: "Forty-one." at Anwen's candles, the eleven pebbles of `fog_loop`, "Fifteen years. I
   counted." at the fountain.
5. **Tovin's pier**: "...Then watch me look.", the boy in the water for one breath, "I owe that girl a second
   crossing."
6. **The F1 teach room**: the untouched mirror points the beam at the way you will go later, one press opens the
   gate, and every later lens also starts wrong in plain view. Keep "every wrong state splashes where you can see it"
   as a rule for any new puzzle.
7. **F2's one beam, two bridges**: the optional alcove is a deliberate detour and never a trap (the island's bridge
   is upstream and stays lit; the grace rule holds a bridge under the party).
8. **The Other Selves**: weak to everything their owner is not, the Mirrored Combo as the party's own combo rule
   seen from the other side, and "That's me. I don't stand like that." / "You do. That's the trouble."
9. **The vow of Courage**: "Take mine instead." and the mouth that keeps moving with no sound. Shown, not told.
10. **"Aurel. Your name is Aurel."** said by his son, the tag change under the flash, then "Your name is on this page
    too." / "Then someone wrote it twice." Also keep Kept's core: a named target and four answers, Devour Name's
    sibling.

All of these lines fire in the four runs' dialogue logs (Fact).

---

## 7. Ten to fix, ranked by player impact

Sizes: **S** = hours, data or one file. **M** = about a day for one agent. **L** = several days.

1. **Fresh-start and 80%-route players run a level behind, and the mini-boss spikes.** (S, three small changes)
   - Where: `src/game/state.js` `EP2_START` (line 54: Lv 9 at 1156 EXP); `src/data/enemies.js` `refl_hero`,
     `refl_mira`, `refl_bram`; `tools/sim/simulate.mjs` `BOSS_LEVELS`.
   - What: the fresh-start bot was Lv 9 for all 10 road fights, Lv 11 at the Other Selves and Lv 12 at the King; the
     sim's 80% route meets them at Lv 10 to 11 and Lv 12. At Lv 10 the Other Selves win 79 to 81% careful with 1.7 to
     1.9 KOs, against the Echo Warden's 100% and 0.01, and against the King's 96% at Lv 12.
   - Why: a mini-boss harder than the final boss inverts the curve, and a first-time human plays below the sim's
     careful policy. It is the most likely first game over of the episode.
   - Fix: start `newGameEp2` at 1433 EXP (Episode 1's full clear). Reflections' ATK and MAG x0.9 (tested in memory:
     90% at Lv 10, 97% at Lv 11). Check bosses at the 80%-route level too: Other Selves careful 85% or better at
     Lv 10, King 90% or better at Lv 12.

2. **The Fading Road respawns, so the road is twice its budget.** (S)
   - Where: `east_road.js` line 187 (`area: 'field'`), `field.js` line 45 (`FIELD_RESPAWN_SEC = 60`), groups at lines
     177 to 183.
   - What: 7 placed groups, 9 to 12 fights in four runs (`road_beetles` four times in one); about 9.4 minutes of
     fights; about 20 to 23 minutes for an act budgeted at 12; and from a fresh start nothing levels.
   - Why: the respawns land around the Waystation fire, the toll house chest and Penny's cart, the places a player
     lingers; the fight count punishes exploring the road the episode asks you to remember.
   - Fix: a map flag so `east_road` groups return only on re-entry (the dungeon rule), and remove `e_way_wolves`
     (46,19). Saves about 4 to 5 minutes.

3. **The opening is 49 boxes of goodbyes before the first fight.** (S; M for the alternative)
   - Where: `ep2_morning` (11), `ep2_mael` (13), `garrick_crossing` (14), optional `iris_farewell` (6) and
     `tess_last_route` (5).
   - What: the first designed fight starts at about 6 to 8 minutes; Mira's and Mael's "stops / forgot the next word"
     lines repeat each other 90 seconds apart; for a continuing player this follows Episode 1's 52-box tail.
   - Why: the first five minutes of a second episode should feel like a departure, and this one re-reads the last
     one's goodbyes.
   - Fix: trim the three main scenes to about 26 boxes (table in section 4); the first fight then lands at about 4.5
     to 6.5 minutes. Alternative (M): stage the Mist Wolf and Glassback on the new planks as Garrick leaves, so the
     first fight is at the crossing.

4. **F2 is the long floor: a mimic in six of eight groups, and 27 boxes stacked between the font and the mini-boss.**
   (S, with an M option)
   - Where: `encounters.js` `court_f2` plan; `court_f2.js` line 117 (`vex_trig` between `font_f2` and `selves_trig`);
     the `other_selves` and `nameless_king` scenes (triggers have no once flag, so the full intro replays on every
     retry: 11 boxes plus the card, and 13 boxes, a choice and the card).
   - What: about 11 minutes of F2 fights; the Borrowed Shadow groups run about twice the sim live; a player who rests
     at the font reads `vex_mirror` (16) and `other_selves` (11) before the first blow, and again (11) after each loss.
   - Why: the floor that carries the episode's best set pieces (portraits, the island memory, Vex, the Other Selves)
     is the one where the player is most tired of fighting.
   - Fix: 6 groups (remove both `c2_shadows`); trim `vex_mirror` to about 11 boxes; move `vex_trig` and his mirror to
     the South Gallery before `door_w`, so the font sits between Vex and the arena (M if it needs a new mirror
     object); on a retry (a counter), boss intros play only the card and Mira's tip.

5. **Two payoffs have no setup on the main path: Elian's coat and Vex.** (S)
   - Where: `fountain_faces`, `anwen_register`, the Hollow square (`proclamation` or Wren's lines).
   - What: "That coat. It was always too big for you." and "wrapped in the coat, on the chapel step" are seeded only
     in an optional book; Vex appears cold on F2.
   - Why: a reveal the player could have guessed lands harder than one they are told; a rival met once in a long
     speech reads as exposition.
   - Fix: one narration box when Elian arrives ("a young man in a mayor's coat several sizes too big"); one Anwen line
     ("I raised half this town's foundlings. Elian came to me on that step, in a coat that still doesn't fit him.");
     one Vex seed in the Hollow, for example a black feather pinned where the town's name was on the proclamation
     board, or Wren: "A silver-haired guest stayed one night. He asked about lists. He paid in feathers."

6. **Kept snowballs past the plan, invisibly, and targets the cure.** (S)
   - Where: `ai.js` line 474 (`KEEP_EMPOWER = 0.25`), `keepTarget` (Mira 40% before the random roll).
   - What: each Kept adds +25% ATK and MAG for the rest of the fight with nothing on screen; ignoring telegraphs at
     Lv 12 wins 34 to 49% against 95 to 97% careful; the King seals Mira about 60% of the time.
   - Why: a punishment the player cannot see and cannot undo feels unfair even when the telegraph was clear; sealing
     the only member with Recall most of the time turns tension into a coin flip on Silver Salves.
   - Fix: 0.10 per Kept as planned, or drop the stack when that member is freed; a visible buff icon on the King; Mira
     bias 0.2. Check: sim careful unchanged, ignoring telegraphs at Lv 12 at 55% or better.

7. **The King's middle phase is half the fight.** (S)
   - Where: `enemies.js` `false_sorrow` (240 HP), `false_pride` (280 HP); the ward's 34% floor.
   - What: 13.5 to 13.7 rounds careful at Lv 12, above the 9 to 13 target; the ward phase is 7 of them; live 16 to 19.
   - Why: a long add phase with the boss at 25% damage is the least interesting part of a good fight.
   - Fix: Sorrow and Pride HP x0.8 (tested in memory: 12.0 rounds at Lv 12, 11.3 at Lv 13, careful 95 to 99%).

8. **The Mirrored Combo's counter is never shown.** (S, depends on CRITIQUE_4 items 1 and 9)
   - Where: the `reflections` telegraph text in `ai.js`; Mira's tip in `other_selves`; Talk at `font_f2`.
   - What: "{a} and {b} move as one..." with no hint; on the phone one of the pair is hidden; the heads are blobs.
   - Why: the plan calls it "the party's own combo rule seen from the other side"; that only works if the player can
     see who is paired and knows that pushing one back breaks it.
   - Fix: telegraph "{a} and {b} move as one. Break their rhythm!"; a second tip line from Mira: "When two of them
     stand side by side on the timeline, push one back."; land CRITIQUE_4 items 1 and 9 first.

9. **If the fog path is hidden (CRITIQUE_4 item 4), a miss costs up to 20 tiles.** (M)
   - Where: `east_road.js` line 161 (every fog door lands at `fog_return` (19,18)); the cairns at line 87.
   - What: today the path is drawn, so the fog never bites; hidden, with the clear radius CRITIQUE_4 proposes (about
     2.5 tiles) and cairns 3 to 5 apart, the next cairn is often out of sight and every wrong step restarts the band.
   - Why: the plan's own risk note ("the fog band could frustrate on a phone").
   - Fix: land each fog door at the last cairn passed (a checkpoint), keep cairns 4 tiles apart at most, and a clear
     radius of 4 tiles or more. Apply this together with CRITIQUE_4 item 4, not separately.

10. **Talk misses two steps.** (S)
    - Where: `quests.js` `court_f2` and `court_f1` chat.
    - What: on F2 without the glass key, Talk repeats the bridge hint and never points at the East Gallery chest; the
      F1 lock hint never mentions the block in the corridor; nothing covers the King's ward phase.
    - Fix: a `court_f2` entry `ifNot: 'glass_key_f2'` after the island ("The door at the end of the south gallery is
      glass. The key will be somewhere we already crossed: the east gallery's far corner."); "A block sits in the
      light in the north corridor. Shift it." on F1; at `font_f3`: "When his court stands, hit the weeping one with
      everyone at once. Pride can't guard against that."

## 8. Also seen, below the line

- Give the ending's "...Thirteen." to Bram, who is looking at his mountain: the repeat becomes a handoff (S).
- "He means to keep them." for a single named target reads as plural; "He means to keep {target}." (S).
- The shopping trip home from F3 (Vessa's top tier opens at `court_f2_done`; the bot made it, about 2 to 3 minutes):
  a Keeper peddler at the F1 landing would keep players in the dungeon (M).
- Episode 1 valley foes still engage a Lv 9 party on the way to the ford (2-round fights); let them flee from it (M).
- F3 has no rest before the vow door except the mirror shortcut to the F1 landing font; fine, but Talk never says it.
- The bot's "font_f1 unreachable" notes are a bot-model quirk: `mapcheck walk court_f1` reaches `font_f1` with every
  gate open (Fact). Its first shove of `heavy_shore` failed in all four runs but the reed chest was opened, so that
  is a bot path quirk, not a player block (Inference).

## 9. Not checked

- No hand play and no browser run: every minute figure is an estimate from the bot's logs with story_time.py's
  rules. A timed human run of Acts I and II is the check that settles the length question.
- Why Borrowed Shadow fights run about twice the sim live: the autoplay report does not log action types per fight.
  Check: log weapon and element per party action for F2 fights, then compare with the sim's `competent` habit.
- `KEEP_EMPOWER` at 0.10 could not be tested without editing `ai.js` (a module constant); the reflection-damage and
  adds-HP tests were in-memory patches of `ENEMIES`, no file changed.
- Phone touch feel, motion, audio, and the field view of the Other Selves arena (no shot exists).
