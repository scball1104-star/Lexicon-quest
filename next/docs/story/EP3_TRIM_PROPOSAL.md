# Episode 3 trim proposal: Emberpeak arrival, pre-Warden, and the "hearth" line

Status: PROPOSAL for Scott. Nothing in `ep3.js` has been changed. Drafted 2026-11-03.
Source of the ask: `docs/PLAYTEST_REVIEW_5.md` section 1, trims e and f (target: first play under 90 minutes, now
estimated 75 to 97).

Rules used: whole boxes only are cut. No line is rewritten, merged or invented. A box that a later scene leans on is kept
and the reason is given. Claims are tagged Fact (read in the file) or Inference (my judgment or arithmetic).

---

## 0. Counts, and one mismatch with the review

| Scene | Boxes in `ep3.js` now | After | Cut |
|---|---|---|---|
| `veyra_square` | 9 | 7 | 2 |
| `memorial_wall` (first look) | 7 | 5 | 2 |
| `ilya_bellhouse` | 10 | 8 | 2 |
| **Arrival chain, the three the review names** | **26** | **20** | **6** |
| `pk_arrival` (Rusk at the gate), optional | 7 | 6 | 1 (optional) |
| `cinder_warden`, first time, before the fight | 8 (7 text plus the choice) | 5 (4 text plus the choice) | 3 |

Fact: the file and `STAGING_EP3.md` give Veyra 9, memorial 7, Ilya 10. PLAYTEST_REVIEW_5 says Ilya 12 and "about 28".
Counting `pk_arrival` the chain is 33, not 28, so the review's 28 matches no count I can reproduce. I used the file. With
the file's 26, six cuts reach the review's target of 20. If you want the target measured from 33, add the optional Rusk
cut and accept that you land at 26 to 27.

"Box" here means one `say` or `narrate` call; the choice prompt counts as one box (the review's 8 to 5 for the Warden
only works if it does).

---

## 1. Arrival chain

### 1a. `pk_arrival` (Rusk at the gate), 7 boxes. Nothing required; one optional cut

| # | Speaker | Line | Mark |
|---|---|---|---|
| 1 | narration | Ash falls like slow snow on iron roofs and banked fires. Up in its tower, the bell hangs dark. | KEEP (first look at the town; the dark bell is paid off at the First Bell) |
| 2 | rusk | Nobody comes up the sand road. Nobody's come up it since I was a boy. | KEEP |
| 3 | narration | Rusk looks at the Smith. He does not know him. He straightens anyway. | KEEP (carries the beat on its own) |
| 4 | rusk | ...Smith. | KEEP |
| 5 | smith | Watch. | KEEP |
| 6 | mira | He doesn't know you. His back does. | CUT, optional (box 3 already says it; Inference) |
| 7 | rusk | Foreman Veyra's at the coolant station. She'll want a word with anyone who walks in. | KEEP (the only pointer to Veyra) |

### 1b. `veyra_square`, 9 boxes to 7

| # | Speaker | Line | Mark |
|---|---|---|---|
| 1 | narration | A woman in a soot-streaked coat chalks numbers on a slate beside a stone cistern. A whistle hangs at her neck. | KEEP (introduces her and the station) |
| 2 | veyra | Foreman Veyra. You're not shift, you're not Watch. Can you carry a crate? | KEEP (name and the errand hook) |
| 3 | veyra | The furnaces woke a month ago with nobody feeding them. The Warden runs the lifts now. | KEEP (the premise, and the only place the town says "Warden") |
| 4 | veyra | The mine gates are shut from inside. Names come off the memorial wall about one a week. | CUT (the memorial scene shows the flat plate and the going-soft plate; a search of `ep3.js` finds no later mention of "mine gates" or "one a week", Fact) |
| 5 | veyra | We sand the plates and pretend it's soot. | CUT (flavor; nothing refers to it, Fact by search) |
| 6 | veyra | The foundry gate answers to one key. The founder's apprentice keeps it. Ilya, in the Bell House. | KEEP (the route to the key) |
| 7 | veyra | You've got a guard's back and a smith's hands. Which are you? | KEEP (sets up box 8 and 9) |
| 8 | bram | Today? Both. | KEEP |
| 9 | veyra | Then you'll do. Come back when you've seen Ilya. I've three people you should hear. | KEEP (answers box 8; "three people" is paid off by `coolant_start`, which names Ilya, Harl and Sella, Fact) |

### 1c. `memorial_wall`, first look, 7 boxes to 5

| # | Speaker | Line | Mark |
|---|---|---|---|
| 1 | narration | Names Etched in Iron. Rows of plates bolted to the wall, each stamped with a name. One plate has been hammered flat. | KEEP |
| 2 | narration | Below it hangs a newer plate. Its letters are going soft, like wax near a fire. | KEEP (the plate the later "going soft" look text and Mira's line point at) |
| 3 | narration | The Smith lays his hand on the flat place. | CUT (the next box says "That's hers." over the flat plate from box 1; the walk-up still plays as staging, only the text box goes) |
| 4 | smith | That's hers. | KEEP (sets up Garrick's "Hers." after the Warden, Fact: `ep3.js` line 659) |
| 5 | bram | What was it? | KEEP |
| 6 | smith | I'd tell you if I had it. | KEEP |
| 7 | mira | And this one is going now. Softly. I can't read it, and I'm watching it go. | CUT (box 2 and the permanent look text already say the plate is going soft; Inference) |

Cost of cut 7: Mira loses her only reaction at the wall. If you would rather keep her and lose box 2 instead, her "this
one" then has nothing to point at, so I do not recommend it.

### 1d. `ilya_bellhouse`, 10 boxes to 8

| # | Speaker | Line | Mark |
|---|---|---|---|
| 1 | narration | A workshop kept exactly as it was left. Bell molds on the shelves, and a practice bell over a bench with no dust. | CUT (the molds and the practice bell are both examinable objects with their own text, Fact: `ep3.js` lines 977 and 978) |
| 2 | ilya | Veyra sent you. She sends everyone she cannot use herself. Mind the molds. | KEEP |
| 3 | narration | Through the window stands the bell tower. In it hangs the First Bell, mouth open and no tongue. | KEEP (the First Bell with no clapper is what the Warden's hammer later fills) |
| 4 | ilya | She took the clapper in with her. Said a bell that can't ring can't be made to lie. | KEEP (the clapper is a plot item, Fact) |
| 5 | ilya | I can't say her name. I can say what she said. Shape shelter before weapons. | KEEP (echoed by the Voice, Fact: `ep3.js` line 395) |
| 6 | bram | ...I know that. | KEEP |
| 7 | ilya | You've got her husband's hands. He'd be about your age. | KEEP (seeds the Garrick reveal; protected name beat) |
| 8 | smith | About. | KEEP (same) |
| 9 | ilya | Her key to the ore lift. I've kept it oiled twenty-five years. Don't ask me why. | KEEP (the key box; `foundry_gate` echoes "oiled for twenty-five years") |
| 10 | ilya | She tuned every bell on this mountain. And one down in your valley, once. | CUT (`testimony_ilya` later has Ilya say "She tuned every bell on this mountain, by ear", Fact; I found no later use of "one down in your valley", Inference. Check this one with Scott: it is the only line that ties the founder to Hollowmere's own bell) |

---

## 2. Pre-Warden, `cinder_warden`, first time only (8 to 5)

The retry path (only Mira's line) is untouched.

| # | Speaker | Line | Mark |
|---|---|---|---|
| 1 | narration | A round crucible hall. A furnace the size of a house, and before it a bronze guardian with a molten hammer. | CUT (the camera pan and the boss title card show it; the map comment and the title "Keeper of the Heartforge" carry the rest) |
| 2 | cinder_warden | THE FIRE MUST NOT GO OUT. | KEEP (review: do not touch) |
| 3 | cinder_warden | ASH IS CLEAN. ASH FORGETS. | CUT (the theme is stated again by the Warden after the fight: "THE ORDER SAID KEEP THE FIRE", Fact) |
| 4 | cinder_warden | THE ORE COUNTER. YOU AND THE FOUNDER STOPPED MY FIRE. | CUT (search finds no later reference to "ore counter", Fact; "Put it out." now answers box 2 directly, Inference) |
| 5 | choice | Put it out. / We came for two names. | KEEP |
| 5a | cinder_warden | A MAN CANNOT PUT OUT A MOUNTAIN. / THERE ARE NO NAMES HERE. ONLY ASH. (one shows, by choice) | KEEP |
| 6 | bram | Mara. And my father's. I don't have his yet. I'll take it off you. | KEEP (review: keep) |
| 7 | mira | When it glows white, cool it. When the hammer goes up, put Bram in front. | KEEP (protected: the whole fight in one box) |

Risk (Inference): box 4 is the only place the Warden names the founder as its enemy. The review marks it cuttable
("keep the choice, Bram's line, Mira's line, the fire line"), so I followed it. If you want the founder tie kept, restore
box 4 and the scene is 6, not 5.

Protected and untouched: Mira's pre-Warden line (kept, box 7), the Mara and Garrick name scenes (all of `warden_after`,
not edited), the first fight's two teaching lines (in `sand_first_fight`, not edited).

---

## 3. Minutes saved

Per-box assumption in `qa/integrate/story_time.py` (Fact): a page costs the slower of typing (60 chars a second) and
reading (15 chars a second), plus 0.6 s to press on. At 15 cps that is `length / 15 + 0.6` seconds.

| Cuts | Seconds |
|---|---|
| Arrival, 6 cuts (87, 41, 42, 75, 113, 73 characters) | 32 |
| Optional Rusk cut (35 characters) | 3 |
| Pre-Warden, 3 cuts (107, 26, 53 characters) | 14 |
| **Total** | **46 to 49 s, about 0.8 min** |

Inference: this is less than the review's "1.5 to 2.5 min" for trim e. The timer counts only text, and the larger part of
that estimate came from putting Harl at the coolant station (the errand shrinks by a house), which is a map change and not
in this proposal. A first-time reader will also spend a little time walking and watching the scene staging that these cuts
leave in place, so the real saving is at least what is shown here, not more. These cuts alone will not move the 75 to 97
estimate by much; they matter as part of the review's sum of trims.

Not cut: every `s.walk`, `s.camera` and spawn call stays, so no staging breaks. `BOX_BUDGET` in `ep3.js` needs no change
(none of these scenes is listed over 12, Fact).

---

## 4. "By the hearth"

Current line (Fact, `ep3.js` line 60), spoken in `ep3_morning`:

> By the hearth sits an old man grey with road dust, his hands open on his knees as if he has put something down.

(The same line reads "Against the inn wall sits..." when the scene starts in `nameless_hollow`; that version is fine.)

What is actually there (Fact, `src/data/maps/nh_inn.js` and `src/data/maps/ep3/hollow_gate.js` line 60): the inn has no
fireplace or hearth tile. The Smith's mark `smith_seat` is placed at tile (19, 8), in the east guest room, on the floor
beside the guest beds (beds at 15,6, 18,6 and 20,6, a long table at 16,9, a rug at 17,5; a cooking pot sits far off at
20,3). `wren_wake` is (16, 7) and `inn_door` is (15, 3), the stair. `STAGING_EP3.md` says "by the hearth" too, so the
word came from the staging note, not the map. The nearest real things are the guest beds and the east wall.

Three suggested openings, for Scott to choose or reword (these are suggestions only, not written into the file):

1. At the foot of the guest beds sits an old man grey with road dust, his hands open on his knees as if he has put something down.
2. By the guest-room wall sits an old man grey with road dust, his hands open on his knees as if he has put something down.
3. Beside the beds sits an old man grey with road dust, his hands open on his knees as if he has put something down.

Only the opening four or five words change; the rest of the sentence is Scott's own and stays as is. Option 2 is the
nearest to the existing "Against the inn wall" in the other version, so the two sound like a pair.

If you would rather keep a hearth, the other fix is a map change (add a hearth decor tile at the Smith's seat). That is
outside this proposal.

---

## 5. What to approve

- [ ] The six arrival cuts (Veyra 4 and 5, memorial 3 and 7, Ilya 1 and 10).
- [ ] The optional Rusk cut (box 6 of `pk_arrival`).
- [ ] The three pre-Warden cuts (boxes 1, 3, 4).
- [ ] One of the three hearth openings, or your own wording.
- Decision flagged for Scott: Ilya box 10 (the "valley" bell) and Warden box 4 (the founder named) are the two cuts most
  likely to be missed later. Say if either should stay.
