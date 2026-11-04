# CRITIQUE 6: Episode 4 art and UX

Read-only review, 2026-11-04, checkout `D:\LexiconQuest` on branch `scott/ep4-build` with `EP4_LIVE` true. Bar: Chrono
Trigger, Lufia II, FF6, with the phone as the bar. Sources: the 18 E4-integrate shots as rendered in
`D:\LexiconQuest\next\qa\out\` (phone 2532x1170 first, desktop for comparison; `-FAILED` files ignored as stale), the
pack's sprite atlases and backdrops read directly, and these sheets and crops of my own (no browser run, no file outside
this folder touched):

- `qa/out/review6/critic/foes_a.png`, `foes_b.png`: every Episode 4 battle foe at 3x (base and cast frames).
- `qa/out/review6/critic/regent_looks.png`: the Paper Regent's three looks at 2x.
- `qa/out/review6/critic/npcs_down.png`, `lyra_portrait.png`: the ten new NPCs at 6x, Lyra's portrait from the phone.
- `qa/out/review6/critic/foundry_vs_keep.png`: Episode 3 F1 to F3 (top) against Keep F1 to F3 (bottom), same scale.
- `qa/out/review6/critic/field_foes_and_pips.png`: field foes on keep floors, the decree seals, the Barrister's rows.
- `qa/out/review6/critic/posts_wheels.png`: lock wheels and tide posts at native phone size.
- `qa/out/review6/critic/backdrops.png`: the five Episode 4 battle backdrops.

Tags: **Fact** = seen in a shot or measured, or read in the named source line. **Reported** = from the sprite pass's nit
list, not yet seen by me. **Inference** = my reading, with the check that would settle it. Luminance is mean Rec.709 luma
of the named region, 0 to 1.

Sizes: **S** = hours, one file or a data change. **M** = about a day for one agent. **L** = several days or a new art set.

## 1. Verdict

Episode 4's core idea reads. Flooded versus drained is the clearest state change the game has shipped: turquoise water
with a bright rim against brown mud and stone, visible from across the screen, with a drowned roof as the picture that
tells you what happened here (Fact, `flood_lane_mid` vs `flood_lane_low`). Valewyn reads as one image around a white
crowned statue. The Paper Regent is the first boss since Episode 1 with a real silhouette (body luma 0.45 on a 0.26
backdrop). Several CRITIQUE_5 items are visibly fixed: the phone command grid no longer reflows, Bram is grey, lamps are
lanterns, the ending has light pools.

What does not hold: the episode's one new battle rule, the Decree, has seals you cannot read on a phone; the mini-boss
wears its HUD across its chest; and the three moments the episode is about (the signature that holds, the scraped word,
"Keep this one.") are told in narration over an unchanged map, never shown. Underneath that, four of five battle
backdrops are the same painting, the last keep floor is the brightest map in the episode, and the first keep floor is
Episode 3's lilac again. Items 1 to 4 are mostly S and close most of the gap.

## 2. The sprite-pass nits and the known question, answered

| Question | Answer | Item |
|---|---|---|
| Lockjaw Crab reads partly as a beetle | **Confirmed, and it is one.** Built from the `moss_scarab` cell; the claws are two thin curled stalks that read as antennae, in battle and in the field. | 9 |
| Gutter Phantom's cast glow is violet, not gold | **Confirmed.** The cast frame shows a lilac halo on the cowl; the recipe asks for gold. | 14 |
| Royal Ward writs are small | **Plausible, not seen.** No shot shows phase 2. They are 31 x 45 against the Regent's 133 x 135. | 15 |
| Lyra's grey hair is subtle | **Confirmed, and the portrait is the bigger gap.** One or two grey pixels on the sprite; the portrait has none and reads twenty-something, not fifty. | 10 |
| Keep maps plainer than the Foundry floors | **Half.** F1 yes (one lilac stone, few props). F2 no: the richest floor in the episode (326 quantized colours vs 130 to 170 for the Foundry). F3 is busy but reads as a palace, not a drowned court. | 6, 7 |

## 3. Fifteen findings, ranked by player impact

1. **Decree seals cannot be read on a phone.** (S)
   - Where: `phone-battle_decree_pips.png`, `phone-battle_barrister.png`; crop in `field_foes_and_pips.png`. Drawn by the
     pack's `PIPS.fire` hook, `src/data/ep4/scene.js` (header line 11).
   - See (Fact): lit seal luma 0.222 (dark red, rgb 0.43, 0.16, 0.19); unlit seals 0.143 on a box of 0.135. The two
     unlit seals are invisible; the lit one is a dim red blot next to bright white "?" tiles. This is the same failure
     CRITIQUE_5 item 11 named for Heat pips, carried into the episode's one new rule.
   - Why: a Decree is a countdown the player must plan against (fire, Lamp Oil, Break, Answer). If the count does not
     read, the rule is noise. Sea of Stars' lock counters are the brightest thing on the foe.
   - Fix: lit seal as a bright red wax disc with a white highlight pixel; unlit as a pale grey outlined disc; the box a
     step lighter than the backdrop. Measure: unlit at least 0.15 luma above its box.

2. **Phone: the Barrister wears its weakness row across its chest.** (S)
   - Where: `phone-battle_barrister.png` vs `desktop-battle_barrister.png`; `src/scenes/battle.js` `planEnemyRows`
     (line 829, called at 787).
   - See (Fact): on the phone the shield, three "?" tiles and the seal box sit over the Barrister's collar and chest,
     between its face and its hands; on desktop the same row sits under its feet. CRITIQUE_5 protected "pips on the row
     above the head, never across a body"; the touch planner pushes a tall foe's row down into the body instead.
   - Fix: for any foe taller than the band, place the row under the feet (as desktop does) or beside the body; never
     inside the body box. Add the Barrister and the Regent to the row-placement test.

3. **The episode's payoffs are told, never shown.** (M)
   - Where: `phone-story_witness_book.png`, `phone-story_regent_after.png`, `phone-story_vex_archive.png`;
     `src/data/ep4/story.js` `witness_book` (line 478) and `regent_after` (line 557).
   - See (Fact): no Episode 4 scene calls the close-up insert (`src/world/closeup.js` is used by Episode 2 and the cave,
     not by `src/data/ep4/`). The signing is a narration box while the hero stands at a lectern about 12 px wide; the
     scraped CLOSE, the OPEN that holds, the counter-seal line "Keep this one." and Vex's "V." are narrated over an empty
     throne and a paper heap. The player is told "the ink goes on dark, and stays" and sees nothing change.
   - Why: CT shows the object the line is about; CRITIQUE_4 item 11 and CRITIQUE_5 item 5 asked for this and it recurs.
     Here it is worse because the episode's whole argument is visual ("nobody explains; the water shows it", EPISODE4
     section 4).
   - Fix: three close-up inserts in the Episode 2 pattern: the Witness Book page with the name going dark under the pen;
     the charter with CLOSE running off under water and OPEN holding; the counter-seal line with "Keep this one." in a
     warm hand and the "V." beneath. One painted page reused three times with overlays is enough.

4. **Lock wheel marks and tide post water lines are too small to plan from.** (S)
   - Where: `posts_wheels.png` (crops from `flood_lane_mid/low`, `keep_f1_pontoons_mid`, `keep_f3_dark`).
   - See (Fact): the wheel's level is shown only by a needle about 1 px wide and 5 px long on a dark dial (up for mid,
     left for low); nothing marks low, mid and high on the dial face. The tide post is a clear red and white pole with
     gold bands, but the water line on it is a single pale dash. When the party stands at the wheel the hero's head
     covers half the dial.
   - Why: EPISODE4_PLAN 4 (phone rule): "every wheel's mark, every tide post's water line ... must read at phone scale".
     Lufia II puts the state on the switch.
   - Fix: three coloured notches on the dial (low, mid, high) with the current one lit; a thick bright needle; a 2 px
     foam ring where water meets the post; draw the wheel on the tile above its stand so the party never covers it.

5. **Four of five battle backdrops are one painting, and the fifth is a different style.** (M; L for new art)
   - Where: `backdrops.png`; `assets/backdrops/ep4_battle_keep.png`, `ep4_battle_archive_deep.png`,
     `ep4_battle_throne.png`, `ep4_battle_witness.png`, `ep4_battle_flood_road.png`.
   - See (Fact): keep, archive, throne and witness are crops and grades of the same moonlit Valewyn painting
     (environments cell 3): arches, crowned statue, waterfalls, sky. Every keep fight, the Barrister and the Paper Regent
     happen outdoors under the moon, though the story puts them in a drowned archive and a round throne room. The flood
     road backdrop is a procedural flat green field with grey oval puddles and blob clouds, a much plainer style that
     meets the painted ones at the first boss-free fight.
   - Why: FF6 and CT change the battle stage with the dungeon; a boss's stage is part of its identity (CRITIQUE_5 protected
     the foundry backdrop for this reason).
   - Fix: at minimum, crop the throne backdrop to an interior (arches and water only, no sky) and grade the archive one to
     near-black with chain lanterns; give the flood road painted depth (a hedgerow band, the drowned farm roof, rain
     haze). Best: one new interior painting for the Keep shared by F2 and the throne.

6. **F3 is the brightest map in the episode and reads as a palace, not a drowned court.** (S to M)
   - Where: `phone-field_ep4_keep_f3_dark.png`, `phone-story_witness_book.png`; `src/data/maps/ep4_keep_f3.js` line 183
     (`dark: 0.3`).
   - See (Fact): mean luma F1 0.27 to 0.28, F2 0.186, F3 **0.529**, Valewyn's plaza in daylight 0.412. The descent goes
     dim, darker, then floodlit. The marble is white with a gold grid; "going green at each tide mark" (EPISODE4 section
     4) shows as a few small green tufts. Episode 3's three floors darkened in order and CRITIQUE_5 protected that.
   - Why: the last floor before the boss should be the most oppressive; here it is the most cheerful.
   - Fix: raise F3's darkness to about 0.5 with lantern pools as the light; a dark green waterline band on every wall at
     each mark and a stain on the floor below the high mark; grey the white marble two steps. Measure: F3 luma at or below
     F2's.

7. **Keep F1 is Episode 3's lilac again, and the plainest floor.** (M)
   - Where: `foundry_vs_keep.png` (bottom left vs top left), `phone-field_ep4_keep_f1_*.png`; `assets/tiles/ep4.png`,
     `src/data/maps/ep4_keep_f1.js`.
   - See (Fact): walls, walkways and channel kerbs are one lilac-violet stone in one value; mean saturation 0.42 to 0.52,
     the same family CRITIQUE_5 item 9 asked Episode 3's F1 to leave. The Foundry F1 had furnaces, grates, vents and
     glowing brick in the same frame; Keep F1 has a pillar, a bench, two lanterns and rubble. Detail measures are close
     (194 vs 138 to 170 colours), so the gap is variety and focal points, not noise (Inference).
   - Why: the teaching floor is where the player forms the picture of the Keep. "Grey rain on turquoise water, white
     marble going green" is the tone guide; F1 is neither grey nor marble.
   - Fix: a cool grey-green stone for F1 with algae at the waterline, two or three floor variants per room (drowned
     carpet, cracked flag, silt drift), and one set piece per area (the papered door's red seal big and central, a sunken
     statue in the Audience Hall).

8. **Field foes on keep floors are rimmed in their own colour.** (S)
   - Where: `field_foes_and_pips.png` (F2 phantom, F1 crab); `tools/art/sprites/ep4_enemies.py` line 518 (`FIELD_RIM`:
     `gutter_phantom` and `drowned_watch` get `WEED`, green).
   - See (Fact): the green Gutter Phantom on F2's dark teal tile measures 0.207 against 0.131 for the floor; it reads by its
     two gold eye pixels only, the exact CRITIQUE_5 item 2 failure. The rim the plan required exists but is the body's own
     green. The grey crab on lilac stone is borderline.
   - Fix: a warm or pale rim (not the body hue) on every field foe, a ground shadow, and an accent cluster of at least
     2 x 2. Check each foe on its own floor at phone scale, not on the sheet background.

9. **The Lockjaw Crab is a beetle.** (S to M)
   - Where: `foes_a.png`; `tools/art/sprites/ep4_enemies.py` lines 11 and 175 (source cell 3, which COMMON names
     `moss_scarab`), `crab_paint` line 249.
   - See (Fact): a domed studded shell, six legs, two curled red stalks rising from the front. In the field it is a grey
     dome with red legs and a horn. Nothing reads as a pincer. Reported by the sprite pass; confirmed.
   - Why: the name promises a crab and its skill is Clamp; the player should see the clamp.
   - Fix: repaint the two stalks as two big low pincers held forward (the brightest rust on the sprite), flatten the dome
     into a wide shell, and add eye stalks. Same on the field sprite.

10. **Lyra looks twenty, not fifty.** (S to M)
    - Where: `lyra_portrait.png`, `npcs_down.png`, `phone-story_regent_hall.png`, `phone-story_crown_remembers.png`.
    - See (Fact): EPISODE4 section 3 gives "fifties, dark skin, braided black hair with grey in it". The reused
      `noble_lady` portrait is a young woman with loose curls and no grey; the `npc_lyra` sprite has black hair with at
      most one or two grey pixels. Reported as "subtle"; it is absent where the player looks longest.
    - Why: her twelve years of guilt and Hale's "thirty years" are the episode's adult story; a young face undercuts both.
    - Fix: a grey streak at the temples and through the curls on the portrait, a few age lines at the eyes; on the sprite,
      a 2 px grey band at the temple. Show both side by side before shipping (the Bram recolor precedent).

11. **The party stands on top of the scene, and covers Vex.** (S)
    - Where: `phone-story_vex_archive.png`; `src/data/maps/ep4_keep_f2.js` lines 136 (`vex_trig` row 3) and 192
      (`vex_chair` at 29, 2).
    - See (Fact): the trigger runs the scene with the hero on the tile directly under Vex's chair, so only Vex's head shows
      above the hero's; he also renders pale inside the dome and reads as a ghost (CRITIQUE_5 below-the-line said the same
      of Episode 3). In `ep4_morning`, `regent_hall`, `regent_after` and `ep4_ending` the party is stacked on one column
      (Inference: the shot recipe's warp; check in play whether scenes re-stage followers).
    - Fix: `s.walk` the party to marks two tiles below and beside the speaker before the first line; move `vex_trig` one
      row down; draw Vex above the dome glass at full opacity.

12. **The Barrister is not the drowned advocate the story describes.** (S)
    - Where: `foes_b.png`; `tools/art/sprites/ep4_enemies.py`; brief in EPISODE4 section 3 ("a black gown with a white
      collar") and EPISODE4_PLAN 9 ("recolor, collar, paper sleeves").
    - See (Fact): a hooded wraith in ragged grey-black with paper tabs and a cyan rim; no collar, no gown shape, no face. It
      reads as Episode 1's ink wraith in a new colour (Inference: built from the same cell; check the recipe).
    - Fix: a bright white collar and bands at the throat (the one bright shape on the body, and a target for the eye), a
      gown hem cut straight, a pale face under the hood, one hand holding a scroll.

13. **Phone, Regent fight: the action name prints twice and the help bar floats mid-screen.** (S)
    - Where: `phone-battle_regent_answer.png`; `src/scenes/battle.js`.
    - See (Fact): "Arden: Answer" shows in the help bar (moved to mid-screen over the backdrop for the tall boss) and again
      in the bottom-left window that replaces the command menu. The duplicate costs a line where the key moment of the
      fight should breathe.
    - Fix: while an action plays, show it once (bottom window); keep the help bar at the top edge for tall bosses and
      shorten it rather than moving it.

14. **Gutter Phantom's cast glow is violet, not gold.** (S)
    - Where: `foes_a.png` (`gutter_phantom_cast`); `tools/art/sprites/ep4_enemies.py` line 486.
    - See (Fact): the cast frame adds a lilac halo around the cowl and lilac sparkles. The recipe calls `AF.glow(..., 'gold',
      ...)` on a hue mask of 60 to 120 degrees; the cast face pixels fall outside it, so the gold never lands and the
      violet of the base frame shows through (Inference on the cause; check by dumping the mask).
    - Fix: widen or replace the mask (use the eye cluster positions from line 380), so the cast reads as two drowned
      lanterns flaring gold.

15. **The Royal Ward's writs may read as props.** (S)
    - Where: `foes_b.png`; `assets/sprites/ep4_enemies_battle.png` (`writ_silence`, `writ_oblivion`).
    - See (Fact): 31 x 45 each, a third of the Regent's height and smaller than every ordinary Episode 4 foe; a scroll on a
      brass stand, with the two told apart only by a cream versus slate page. (Reported: "small".) No shot shows phase 2.
    - Check: render the Royal Ward with both writs on the phone before resizing. Likely fix: 1.3x scale, a coloured
      seal (gold for Silence, red for Oblivion) as the readable difference, and a ground shadow so they stand on the floor.

## 4. Also seen, below the line

- Title (`phone-ui_title_ep4.png`): the "v0.2 NEXT" label overlaps the menu window's lower-left edge; the menu splits the
  episode rows across columns (Episode 2 alone at the bottom of column 1, Episodes 3 and 4 in column 2).
- The drained lane floor is brown mud (luma 0.29) rather than the plan's "pale wet stone with dark weed lines at each
  mark"; it still reads as walkable, so this is a wording gap, not a bug.
- `blank_decree` and `barrister_witness` share one paper-bird silhouette; fine as kin, but they meet in no fight together.
- The pontoon lanterns stand in the channel water in F1 (on chains per the plan, but no chain is drawn).
- The ending (`phone-story_ep4_ending.png`) frames the plaza; Ada's letter, the hook object, is not visible.

## 5. Protect these (do not lose them in the fix pass)

- **Flooded vs drained at a glance**: animated turquoise with a bright rim against mud and stone, and the drowned roof in
  the lane. Do not dim the water in item 6's or item 7's pass.
- **Valewyn's plaza**: the white crowned faceless statue as the one focal point, the flood board, the lantern lamps.
- **The Paper Regent's three looks**: turquoise and gold phase 1 matching canon (crown, trident), the cream charter look,
  and its value separation from the backdrop. Its timeline head with the crown.
- **The fixed phone command grid** (Attack, Combo / Tech, Item / Magic, Defend / Fury, Swap in every fight): CRITIQUE_5
  item 8, fixed. Greyed Fury.
- **Bram's grey recolor** in field and battle (CRITIQUE_5 item 7, fixed), and the Lyra and Vex painted portraits' style.
- **F2's archive**: brick, teal tile, bookcases rising from water, chain lanterns. The best keep floor.
- **The three gold sockets lit over the Witness doorway**, and the red and white tide posts with gold bands.
- **The ending's night with lamp pools** (CRITIQUE_5 item 13, fixed). The rain.
- **Speaker tag "The Regent" until she is named**, then "Lyra": the name change is the story.
- **The title row "Episode 4: new party"** and its hint "Your own save stays under Continue."

## 6. Not checked

Motion (water rising, seal wash, pontoons floating, the decree unroll and void effects), audio, the Regent's phase 2
(writs) on screen, the Barrister's later turns, real touch feel, and puzzle solvability without Talk (play-critic-6).
No game was played start to finish; every claim about a scene is from one frame.
