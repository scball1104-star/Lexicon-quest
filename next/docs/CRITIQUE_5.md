# CRITIQUE 5: Episode 3 art and UX

Read-only review, 2026-11-02, checkout `D:\lq-e3review` (commit 0e9911a, EP3_LIVE false). Bar: Chrono Trigger, Lufia II,
FF6, with the phone as the bar. Sources: the 15 E3-integrate shots (`qa/shots.json`, `qa/integrate/ep3_shots.py`) as
rendered in `D:\LexiconQuest\next\qa\out\` (phone 2532x1170 first, desktop and portrait for comparison, and the
`-FAILED` frames, which show the pre-turn states), plus four short headless phone runs of my own through the
`LQ_DEBUG` harness (port 8795/8796, EP3_LIVE switched on in memory only, no file touched):

- `qa/out/review5/critic/elite_*.png`, `elite_sheet.png`: `sr_first` with `forceElite`, intro, command and target states.
- `qa/out/review5/critic/warden_*.png`, `warden_sheet.png`: `cinder_warden`, card, command and target states.
- `qa/out/review5/critic/ember_ash.png`, `ember_none.png`, `ember_ash_vs_none.png`: Emberpeak (17,17) with and without `pk_restored`.
- Native-resolution crops for every small-detail claim (same folder: `hound_on_ash`, `f2_foe`, `f3_bellgate`,
  `f1_dry_trough`, `f2_troughs`, `heat_pips`, `oath_bram`, `warden_body`, `slag_river`, `ember_ground`, grates).

Tags: **Fact** = seen in a shot or measured, or read in the named source line. **Inference** = my reading, with the
check that would settle it. Luminance is mean Rec.709 luma of the game area, 0 to 1.

Sizes: **S** = hours, one file or a data change. **M** = about a day for one agent. **L** = several days or a new art set.

## 1. Verdict

Episode 3 is the strongest-looking episode so far in its machinery and the weakest in its centre. The quench language
works at a glance: molten slag is the one bright orange thing on screen, crust is dark, running water is a bright
animated blue line, and a closed hot grate glows like a grill (Fact, `-FAILED` vs final shots). The three foundry
floors are three different places (lilac riveted steel, soot brick with arched vents, navy basalt with bronze ribs and
slag as the only light), which answers CRITIQUE_4 item 6. Bram's painted portrait is the best face in the game.

What does not read on a phone: the Cinder Warden is a brown mass the same value as its red backdrop, so the episode's
boss has no shape; field foes vanish into ash and steel exactly as CRITIQUE_4 item 8 warned and the plan's phone rule
forbade; and "ash" reads as a red-clay town in slightly dimmer light. Add the confirmed foe-name overlap and story
scenes that frame the payoff object out of shot, and the honest answer is: the same game, at Episode 2's level, with
better puzzles and a worse boss. Items 1 to 5 close most of the gap; none needs a new system.

## 2. The brief's questions, answered

| Question | Answer | Rank |
|---|---|---|
| Does ash read as ash (the tint)? | **Partly.** The ground is grey ash gravel, but the square is crimson cobble and `ash_haze` is 11.9% darker than `none` (bar: 12%). Flakes are sparse 1 px specks. | 3 |
| Do the three foundry floors look different? | **Yes.** Distinct material, palette and darkness (F1 L 0.231, F2 0.190, F3 0.157). F1 is monotone within itself. | 9, protect |
| Do sluices and troughs read at rest? | **Half.** Wet troughs yes; F2 dry trough yes; F1 dry trough barely; the sluice's `/` or `\` state no. | 10 |
| Are field foes visible on ash? | **No.** Grey hound on grey ash, grey wraiths on grey steel and brick, copper golems on copper trim. | 2 |
| Do Heat pips and the Oath read in battle? | **Mostly.** Lit pip clear, unlit pips near-black; Oath ring clear, Oath status icon not. | 11 |
| Is the Warden a readable shape? | **No.** Body luma 0.20 on a 0.24 backdrop; only the furnace eye reads. | 1 |
| Known: phone foe name labels overlap ("Stoneskin..." over "Cinder Hound") | **Confirmed and located**, see item 4. | 4 |

## 3. Fifteen findings, ranked by player impact

1. **The Cinder Warden has no silhouette.** (M)
   - Where: `phone-battle_warden_oath.png`, `review5/critic/warden_sheet.png`, `warden_body.png`.
   - See (Fact): a brown and umber mass with a thin orange rim on a red-orange forge backdrop. Measured body luma 0.204
     against 0.237 for the backdrop beside it: the same value. No head, arm or hammer reads; the only focal point is the
     round furnace grate. On touch the command window covers its lower left body, and in target mode the name tag
     "The Cinder Warden" sits across its chest under the eye.
   - Why: FF6 and Chrono Trigger bosses separate from their stage by value first (a dark shape on a light field or the
     reverse) and give the eye one place to go. This is the most complex fight in the game (Heat, coils, Oath); the
     player must see what the Warden is doing with its hammer.
   - Fix: a value pass on the `cinder_warden` frames (darken the body two steps, merge speckle into 3 to 4 value groups,
     a hot rim light from the forge side, hammer and head picked out in the brightest metal), and darken or desaturate
     the backdrop by about 30% behind the boss slot (a radial falloff). Put the target name tag under the feet or beside
     the boss, never on the body (`drawNameTag` already has the `onHead` rule; extend it to the whole body box for bosses).

2. **Field foes camouflage on ash and steel.** (S)
   - Where: `phone-field_sand_road_slag.png` (hound, right), `phone-field_foundry_f1_quench.png` (wraith, right),
     `phone-field_foundry_f2_hot_gate.png` (left of the bell), `phone-field_foundry_f3_dark.png` (golems by the slag);
     crops `hound_on_ash.png`, `f2_foe.png`, `f3_golem.png`.
   - See (Fact): the Cinder Hound's body is the ash's own grey; only its orange mane shows. The foundry wraiths are
     grey-violet hoods on grey-violet floors, readable only by two yellow eye pixels. The golems are copper on a floor
     with copper ribs.
   - Why: EPISODE3_PLAN 4 (phone rule) requires "field enemies get a rim light so they never camouflage on ash floors";
     CRITIQUE_4 item 8 said the same of the Court. Lufia II's visible enemies are the planning layer.
   - Fix: a 1 px dark outline in each material's own darkest tone, a 1 px warm rim light on the top edge, a ground
     shadow on every field foe, and a bright accent cluster (eyes or core) of at least 2 x 2.

3. **Ash reads as red clay, and the restoration has no payoff.** (S tint, M palette)
   - Where: `phone-field_emberpeak_square.png`, `review5/critic/ember_ash_vs_none.png`, `ember_ground.png`.
   - See (Fact): measured on the same Emberpeak frame, luma 0.258 under `ash_haze` vs 0.293 with `none`, saturation
     0.349 vs 0.405. The ratio is 0.881: 11.9% darker, just under the plan's 12% bar (EPISODE3_PLAN 5.2). The dominant
     colour of the square is the crimson cobble (mean rgb 0.34, 0.24, 0.23), so ash reads as terracotta in dim light, and
     the "after" picture is the same town a little redder. Ash flakes are a few grey 1 px specks; no haze on the ground.
     On the Sand Road the grass west of the slag stays vivid green under the tint (`phone-field_sand_road_slag.png`).
   - Why: FF6's World of Ruin and CT's eras sell change through palette before text. CRITIQUE_4 item 3 was this same
     before/after failure in the Hollow.
   - Fix: `ash_haze` (`src/world/ep3/fx.js` line 17) to a cooler grey (about `#a39d98`) at 0.7 with desat 0.55; a pale
     ground haze band; ash flakes at 2 px with slow drift, 2 to 3 times as many; repaint the square cobble from crimson
     to soot brown with ash in the joints so `pk_restored` can lift it to warm brick. Measure again (target 20% or more).

4. **Phone: the elite name sits under the next foe's row (known issue, confirmed).** (S)
   - Where: `review5/critic/elite_target0.png` and `elite_sheet.png` (`sr_first`, `forceElite`, phone 844x390 at DPR 3).
   - See (Fact): the gold elite tag "Stoneskin Cinder Hound" is drawn by `HUD.drawEliteTag` (`src/battle/scene/hud.js`
     line 465) at `actor.top - 12`, centred on the foe, with no window and no collision test. On the touch layout the
     hound's own weakness row (shield 4, two "?") is planned onto the same band and drawn after it
     (`src/scenes/battle.js` line 791 then 799), so the screen reads "Stone[4][?][?]r Hound". When the hound is then
     targeted, the windowed name tag repeats the same name a line above. The tag's life is `scaled(90)` decremented in
     the draw call, so it counts rendered frames, not time (Inference: about 1.5 s at 60 Hz, half that at 120 Hz; in
     the harness, where `advance` renders once per call, it lasts through the whole command phase). Also seen in the
     same run: the battle log truncates "Cinder Beetle, Stoneskin..." and, targeting the beetle, the damage preview
     "18-23 ?" sits on the hound's face.
   - Fix: draw the elite tag only while the intro message is up (end it when the command menu opens), give it the thin
     window, and place it through `planEnemyRows` like the rows (or under the feet). Count its life in logic steps, not
     draws. Keep `drawPreviewTag` off other foes' head boxes.

5. **Story scenes frame the payoff out of shot.** (M)
   - Where: `phone-story_warden_after.png`, `phone-story_first_bell.png`, `phone-story_bram_memory_3.png`.
   - See (Fact): on "Garrick." (the line the episode exists for) the window covers the forge wall where the reforged leaf
     and anvil would be, and Bram's sprite is half hidden behind an NPC on the next tile. In `first_bell` the bell tower
     is not in frame; the gathered town is cut off at the bottom edge with only heads showing. In `bram_memory_3` the
     founder's stamp is not visible, only Bram's back at the gate. In most story shots the party stands stacked on one
     column of tiles (Inference: a warp artifact of the shot recipe; check in play whether scenes re-stage followers).
   - Why: CT frames the object and both speakers before the line plays; CRITIQUE_4 item 11 asked for this and it recurs.
   - Fix: per scene, `camera.panTo` the payoff object (anvil and leaf, the bell, the stamp) before the key line; put the
     window on the side away from it; walk the party to stand beside, not on top of, the speaker; a close-up insert of
     the stamp and the leaf (the Episode 2 `closeup.js` pattern).

6. **The Bell Gate's progress cannot be read.** (S)
   - Where: `phone-field_foundry_f3_dark.png`, crop `f3_bellgate.png`.
   - See (Fact): the three oath sockets are dark violet bells on a dark violet panel, about 10 px each at phone scale; at
     zero oaths they are nearly invisible. This is F3's goal (three oaths open the gate).
   - Why: Lufia II puts the goal state on the door. CRITIQUE_4 item 7 said the same of the vow door's crystals.
   - Fix: unlit sockets as a clear dark socket with a bronze rim; lit as a gold bell with a glow halo; a camera beat to
     the gate as each oath lands.

7. **Bram's sprites do not match his portrait.** (S)
   - Where: `phone-story_ep3_morning.png` (portrait) vs every field and battle shot.
   - See (Fact): the portrait is a grey-bearded man of about fifty; the field and battle Bram are young and brown-haired.
     EPISODE3_PLAN 9 (decision 2, default yes) asked for a grey recolor of beard and temples. Not in these shots.
   - Why: the episode's story is his age ("I was twenty", twenty-five years ago).
   - Fix: the planned recolor, shown side by side first as the plan says.

8. **Battle command layout changes between fights.** (S)
   - Where: `phone-battle_heat_pips.png` (Attack, Combo / Tech, Item / Magic, Defend / Fury, Swap),
     `phone-battle_bellows_specter.png` (Attack, Item / Tech, Defend / Fury, Swap / Combo), `elite_sheet.png` (Attack,
     Defend / Tech, Swap / Fury / Item).
   - See (Fact): the two-column grid reflows by which commands exist, so Item and Defend change cell from fight to fight.
   - Why: on touch, muscle memory is the menu. FF6's command window never moves an entry; missing ones grey out.
   - Fix: fixed cells for every command, greyed when unavailable.

9. **F1 is one lilac steel plate repeated.** (M)
   - Where: `phone-field_foundry_f1_quench*.png`; `phone-story_warden_after.png` (the same plate block as the Heartforge
     floor's centre).
   - See (Fact): F1 is the most saturated floor of the episode (0.456) and the coldest: lilac-blue riveted plates in
     every room and corridor. The Heartforge reuses a block of F1 plate on F3's dark floor, which reads as a missing tile
     (CRITIQUE_4 item 13's pattern).
   - Fix: a warm soot pass on F1 (iron grey with rust, ash drifts along walls, two or three floor variants per room:
     grate, cracked plate, ash-dusted); the Heartforge centre from the crucible ramp.

10. **Sluice state and F1's dry trough do not read at rest.** (S)
    - Where: `phone-field_foundry_f1_quench-start.png` (crop `f1_dry_trough.png`), `phone-field_foundry_f2_hot_gate.png`
      (crop `f2_troughs.png`), `phone-field_sand_road_slag-FAILED.png`.
    - See (Fact): the paddle is a wooden door leaf; which way it will send water is not visible at phone scale. F1's dry
      trough is one step darker than the floor; F2's dry trough (dark channel with a stone rim) reads. In every quench
      shot the party stands on the sluice tile and hides it.
    - Why: EPISODE3_PLAN 4 (phone rule): "every sluice's state and every trough's wet/dry state must read at phone scale".
    - Fix: a big arrow or chevron on the paddle face in the direction of flow; dry troughs as a dull grey channel with a
      dark floor and a 1 px rim highlight on every floor; step the leader off the sluice after a turn.

11. **The Oath icon and unlit Heat pips are the weak half.** (S)
    - Where: `phone-battle_warden_oath.png` (crop `oath_bram.png`), crop `heat_pips.png`.
    - See (Fact): the Oath's gold ring at Bram's feet reads at once; his row's Oath status icon is a small brown square
      with a hole that reads as a lock. Heat pips: the lit flame is clear; the two unlit pips are dark brown on near-black.
      Pips sit on the row above the head, never across a body (Fact, as planned).
    - Fix: `icon_oath` as a gold anvil or clasped hand on a bright frame; unlit pips as a grey outlined flame.

12. **An opened hot grate does not look open.** (S)
    - Where: crops `_gate-FAILED_grates.png` (closed: glowing bars) vs `_f2_hot_gate_grates.png` (opened).
    - See (Fact): the cooled grate is a dark recess with falling grey specks, the same frame as the closed vent beside it.
    - Fix: the open state as a raised or retracted grate showing the floor beyond, with the steam puff on the change.

13. **The ending night has no light.** (S)
    - Where: `phone-story_ep3_ending.png` (luma 0.141).
    - See (Fact): street lamps read unlit, braziers dim, no light pools; only the bell top glows. Episode 1 and 2 endings
      had lamp pools (protected in CRITIQUE_4).
    - Fix: light the lamps and braziers in the ending with `lighting.js` pools.

14. **The memorial reads as a shop window.** (S)
    - Where: `phone-field_emberpeak_square.png`, crop `memorial.png`.
    - See (Fact): a grey slab with two blank grey panels on a brick base; before lettering, nothing says memorial.
    - Fix: name plates as rows of small bronze plaques with a ledge of candles or flowers in front.

15. **Slag reads as a tile, crust as a grate.** (S to M)
    - Where: `phone-field_sand_road_slag-FAILED.png`, crop `slag_river.png`.
    - See (Fact): molten slag is an orange field with regular dark dashes and hard straight edges, like hot brickwork;
      crust is a perfect 16 px grid with lit nodes, like a metal floor grate. Both are readable as danger / walkable,
      which is what matters, but neither reads as a liquid or as cooled rock.
    - Fix: molten with irregular crust islands drifting downstream and a bright wobbling rim; crust as irregular dark
      plates with dull red seams that fade over a few seconds.

## 4. Also seen, below the line

- Field lamp heads are flat yellow triangles that read as traffic cones (`phone-field_emberpeak_square.png`).
- The warden fight's help window moves to mid-screen over the backdrop (for the tall boss); it overlaps the hanging cage.
- Vex in the furnace (`phone-story_vex_furnace.png`) is a faint ghost in the top-right corner, far from the window.
- The `-FAILED` shot for the sand road shows the sluice's text box cut mid-sentence ("Turn") because it was captured
  while typing (Inference: a shot-timing artifact, not a game bug).

## 5. Protect these (do not lose them in the fix pass)

- **The quench one-glance rule**: molten slag is the brightest thing on screen, crust goes dark, running water is a bright
  animated blue line crossing it. Do not let item 15's repaint dim the molten state.
- **Three foundry identities**: F2's soot brick with arched vents and the bell, F3's dark basalt with slag as the only light.
- **The hot grate's closed state**: glowing orange bars.
- **Bram's painted portrait**, and Vex's.
- **Battle backdrops**: `ash_road` (the volcano and dead trees) and the foundry backdrop; the Bellows Specter, the
  storm roc, reads on it.
- **Heat pips on the row above the head**, never across a body; the lit flame icon. The Oath ring at Bram's feet.
- **The boss card** THE CINDER WARDEN / Keeper of the Heartforge, and the Warden's furnace eye as its focal point.
- **Timeline heads** for the Warden and the Specter, distinct from the party.
- **The ending's night tint** (only add light to it), the title's "Episode 3: new party" row.

## 6. Not checked

Motion (slag flow, steam, ash drift, the paddle turn), audio, the Warden's later phases and coils, the Oath decision's
discovery and pacing (play-critic-5), real touch feel on a device. No game was played start to finish.
