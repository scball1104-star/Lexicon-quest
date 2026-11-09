# CRITIQUE 7: Episode 5 art, readability, staging and polish

Read-only review, Monday 2026-11-09 (Eastern), checkout `D:\LexiconQuest` on branch `scott/ep5-design` with `EP5_LIVE`
true. Bar: Chrono Trigger, Lufia II, FF6, with the phone as the bar. Play, pacing and balance are in
`docs/PLAYTEST_REVIEW_7.md` (same sitting, same reviewer).

Sources: the 20 E5-integrate shots in `qa/out/` (phone 2532x1170 first; halved copies in `qa/out/review7/shots/p_*.png`),
and my own frames from headless sessions on the phone profile (844x390 at 3x), portrait 375x812 and desktop 1280x720, all
in `qa/out/review7/play/` (contact sheets `sh_road.png`, `sh_dial.png`, `sh_f1.png`, `sh_f2f3.png`, `sh_saffron.png`,
`sh_portrait.png`, `sh_desk.png`). Luminance is mean Rec. 709 luma of the named region, 0 to 1.

Tags: **Fact** (seen or measured, or read in the named source), **Reported** (from a plan or report), **Inference** (my
reading, with the check that would settle it). Sizes: **S** hours, **M** about a day, **L** several days or new art.

## 1. Verdict

Episode 5 looks like a different place from Episode 4, which is what the tone guide asked for. The three Labyrinth floors
are three palettes and none is violet (ochre courts, lapis and gold gallery, basalt and star-glass), F3 is the darkest map,
field foes carry a side-coded rim, the sundial's hour reads at rest, the sky badge and the Turn marker clear the phone
contrast floor by a wide margin, and all four payoffs are close-ups now. Running sand against shade reads across the screen.
What does not hold: the **Day** battle stage is the night painting brightened, with the moon and stars still in it, so the
episode's two skies are one sky at two exposures; the **False Futures** stand on the party's side of the stage with Fear's
HUD row over the hero's head; the **deck of the Saffron Wind**, the first new map, is murky; and **Saffron Haven** reads as
a lilac plaza, not a saffron town at dusk. Most are S. The battle menu bug that stops a player casting Turn the Sky is a play
blocker and is ranked in PLAYTEST_REVIEW_7 item 1; it is the first thing to fix in the whole episode.

## 2. Plan 0.1, the art and UX rows: fixed or not

| Episode 4 problem | Episode 5 | Status |
|---|---|---|
| C1 rule marks unreadable on a phone | Sun badge 0.372 on a 0.108 box ring; Turn marker disc 0.498; head disc 0.373 (Fact, `s1_fight_open.png`) | Fixed |
| C2 tall foe's HUD row across its chest | Knight's row above the helmet; Oracle's row top-left, clear of the body (Fact, `p_battle_mirage_knight.png`, `p_battle_oracle_prophecy.png`) | Fixed, but see item 2 (the Futures) |
| C3 payoffs told, not shown | Letter, prophecy, Ishra's page, restored chart are close-ups (Fact, the four story shots) | Fixed; one ordering slip (item 7) |
| C4 wheel marks too small | Three notches, lit one large, a needle, drawn above the stand; the hero's head never covers the face (Fact, `sh_dial.png`) | Fixed |
| C5 backdrops from one painting | Sea at night, a gallery of arches, the purple observatory sky for the Oracle (Fact) | Fixed; the Day grade is item 1 |
| C6 last floor the brightest | F1 0.609, F2 0.207, F3 0.127 at start state (Reported, `MAPS_EP5_B.md` 5; matches the frames) | Fixed |
| C7 first floor Episode 3's lilac | F1 ochre sandstone, F2 lapis and gold, F3 basalt (Fact, `sh_f1.png`, `sh_f2f3.png`) | Fixed |
| C8 field foes rimmed in their own colour | F3 shade: pale blue rim, ochre hem, 0.201 against floor 0.107 (Fact, `crop_f3_foe.png`); F1 birds pale on ochre | Fixed |
| C11 party stacked over the speaker | Most scenes walk to marks; Vex's scene still crowds (item 8) | Mostly fixed |
| P2 signature Tech below the fold | Turn the Sky floats first in gold and the root cursor opens on Tech (Fact, `s5_sub.png`) | Fixed on screen; cannot be confirmed (PLAYTEST_REVIEW_7 item 1) |
| P8 one-way wheel cycling | The dial asks "Dawn / Noon (now) / Dusk", cursor on now (Fact, s3) | Fixed |
| P9 the learn line said nothing | Help "Turn the sky now. Breaks a foretelling." (Fact) | Fixed (learn line not seen) |

## 3. Ten findings, ranked by player impact

1. **MAJOR: the Day stage is the night stage brightened; the moon and stars stay up.** (S to M)
   - Where: `battle_sky_turn`, my `s1_fight_turned.png` against `s1_fight_open.png`; `src/data/ep5/scene.js` `paintSky` and
     `setSky` (about line 480 to 503) cross-fade one backdrop to a lighter grade.
   - Seen (Fact): after "The sky turns. Day." the deck backdrop rises from luma 0.208 to 0.434 but keeps the crescent moon,
     the star field and the night sea's moon path, tinted lilac. It reads as fog over night, not as day. The Oracle's stage
     does the same over the purple observatory painting.
   - Why: the Turning Sky is the episode's one battle rule; the plan says the hours "must look like two places". CT's
     day and night versions of a field are different paintings, not a brightness slider.
   - Fix: give the day grade its own layer: fade the moon and the star specks out with `k`, warm the sky gradient toward
     pale gold and the sea toward turquoise. If a second painting is out of budget, at least hide the moon and stars in Day.

2. **MAJOR: the False Futures stand on the party's side; Fear's HUD row sits over the hero's head.** (S)
   - Where: `p_battle_oracle_futures.png` (the integrate shot at phone scale); the summon slots in the Oracle's encounter.
   - Seen (Fact): Hunger and Fear appear at x about 640 and 760 of 1266, touching the party line; Hunger's row "2 [sun] ?" is
     above Hunger, but Fear's "3 [star] ? ?" starts right above Arden's head, so it reads as the hero's. The Oracle is at
     the far left with its own row top-left.
   - Why: phase 2's decision is "one is Exposed under each sky: which first". The player must tell the two rows apart at a
     glance and know which body each belongs to.
   - Fix: summon the Futures into front-row slots beside the Oracle (left half of the stage), rows under their feet;
     add the Futures to the row-placement test.

3. **MINOR: shade is a hard-edged violet box per cell; on pale paving it reads as a carpet, not a shadow.** (S)
   - Where: `p_field_ep5_lab_f1_shove.png`, `sh_f1.png`, `sh_dial.png` (dawn crop); `src/data/ep5/field/art.js`.
   - Seen (Fact): a checker dither of saturated violet over each shaded cell, full-cell, square-ended. On running sand it
     works (the dark band across bright sand is unmistakable). On ochre or cream paving it looks like a purple rug or a
     selection overlay, especially the one-cell strips.
   - Fix: on non-sand cells use a cooler, less saturated indigo-grey at lower opacity, keep the stronger violet on sand where
     it carries meaning; darken the cell nearest the caster one step so the shadow has a root. Keep the dither.

4. **MINOR: the Saffron Wind's deck, the first new map, is too dark to read the party.** (S)
   - Where: `s1_ship_control.png`, `p_story_ship_bram.png`; `src/data/maps/ep5_ship.js` (tint `night`).
   - Seen (Fact): deck luma 0.097; Mira's purple robe and Yara are near-invisible on the dark brown planks; the rail lanterns
     are tiny and cast no pools; no stars show at the edges. The bible asks for "a lit deck under stars".
   - Fix: a `lights` entry per rail lantern (the F3 lamp pools prove the look), lift the deck one value step, a band of
     star sky at the map edges. Check Mira's luma against the deck at phone scale.

5. **MINOR: Saffron Haven reads as a lilac plaza, not a saffron town at dusk.** (S to M)
   - Where: `sh_saffron.png`, `p_field_ep5_saffron_dusk.png`; `src/data/maps/ep5_saffron.js`.
   - Seen (Fact): the same lilac-grey brick covers most of every frame; the lamp posts are unlit; the dusk tint is a slight
     pink shift (Inference from the frames: it does not read as evening); the armillary is a small object on one roof, not
     "above it all"; copper domes, the oasis, tents and camels are all there but scattered. The waystone did not stand out
     in any frame I took.
   - Fix: warm the plaza paving to sandstone and saffron (keep the lilac for shade), light the lamps while the tint is
     dusk, put the armillary on the skyline the player sees on entry, and give the waystone a focal place at the gate.

6. **MINOR: dawn and noon are the same light on the field.** (S)
   - Where: `s2_phone_road_noon_at_dial.png` vs `_dawn_`; field tints.
   - Seen (Fact): an unshaded sand patch is R/G/B 0.79/0.59/0.33 at noon and 0.74/0.52/0.27 at dawn (dusk 0.64/0.44/0.29).
   - Fix: a rose dawn tint about as strong as dusk, or the optional pale `desert_noon`. Same item as PLAYTEST_REVIEW_7 item 6.

7. **MINOR: the restored chart shows "Keep this one." two beats early.** (S)
   - Where: `p_story_oracle_after_chart.png`; `src/data/ep5/pages.js` `restored` mode; `oracle_after` steps 2 and 4.
   - Seen (Fact): on "Twenty years of struck stars light again..." (step 2) the close-up already shows the hero's star, the
     open-book constellation and the line "Keep this one." The bible orders the counter-seal as step 4, its own beat.
   - Fix: a stage parameter on the restored mode (stars only, then the hero's star, then the seal and its line), advanced by
     the scene at steps 2, 3 and 4.

8. **MINOR: Vex is a pale ghost, standing, with the party one row under him and a foe walking by.** (S)
   - Where: `p_story_vex_gallery.png`; `src/data/maps/ep5_lab_f2.js` (`vex_trig`, guard `e_c` at 26,7).
   - Seen (Fact): Vex renders translucent and upright (the bible kneels him at the star floor); the party stands directly
     below, the hero's head against his feet; a field shade stands two tiles from the party during the scene (the shot warps
     there, so in play the guard may be fought first: Inference).
   - Fix: Vex at full opacity with a kneel frame; stage the party two rows below as CRITIQUE_6 item 11 asked; hold or hide
     `e_c` while the scene runs.

9. **NIT: the noon stair to the road island is hidden under the stones.** (S) Same as PLAYTEST_REVIEW_7 item 7: draw the
   shade above the lower half of a caster sprite. `s2_phone_road_noon_island.png`.

10. **NIT: Turn the Sky has no icon in the Tech list; every other entry does.** (S)
    - Where: `s4_6_techlist0.png`; `hitIcon` in `src/battle/scene/menu.js` returns none for a `none` target.
    - Fix: a small sun-and-moon glyph, gold, so the signature entry reads as a thing and not a gap.

## 4. Also seen, below the line

- The Oracle reads as a shape in the integrate frames: gold scorpion, star-filled body, white mask, on the purple
  observatory sky (Fact). With a sub-list open its body is mostly behind the window on the phone (Fact, `s4_6_techlist0.png`);
  acceptable while choosing. I did not see the True Horizon look on screen.
- F1's dune walls are drawn as brown wave-textured sand next to the pale running sand (Fact, `sh_f1.png`; solid by the walk
  grid). Nothing lies, since both stop you, but the floor has two "sands" (Inference).
- Portrait 375x812 shows the game's global "Turn your phone sideways" card; nothing Episode 5 specific (Fact, `sh_portrait.png`).
- The telegraph box on the phone runs under the FLEE / AUTO / x1 buttons; the text wraps short of them, so nothing is
  covered (Fact, `p_battle_oracle_prophecy.png`).
- The observatory's rings are under the close-up during the reading (Fact, `sh_desk.png`); fine, but the room is plain once
  the close-up closes (Inference).

## 5. Protect these

- **Running against holding sand at a glance**: the pale striped flowing layer against violet shade and against dark held
  sand. Do not dim it in item 3's or item 6's pass.
- **The three floors**: ochre courts, lapis and gold gallery with bright window shafts, basalt and star-glass with lamp pools;
  F3 the darkest. Do not lighten F3.
- **The dial face**: three notches, the lit one large, the needle, above the stand.
- **The sky badge, the marker and the pinned slot**: the target's head on a red slot with a red star, and a red star over
  the member in the field.
- **The Mirage Knight**: the mirror shield painted with the other sky; the gallery backdrop.
- **The four close-ups**: the letter's blank line, the prophecy forming in starlight (it completes within 2 seconds),
  Ishra's warm hand, the chart with the hero's star.
- **Side-coded rims on field foes** (gold for sun foes, pale blue for star foes).
- **The quick-start title row** "Episode 5: new party" and its help "Your own save stays under Continue."
- **The every_road frame**: the armillary over the north gate, the domes, the crowd at the gate.

## 6. Top 10 to fix

| # | Fix | Where | Size |
|---|---|---|---|
| 1 | (Play blocker, PLAYTEST_REVIEW_7 item 1) Turn the Sky castable from the menu | `src/battle/scene/menu.js` | S |
| 2 | Day grade without the moon and stars; a warm day sky | `src/data/ep5/scene.js` `paintSky` | S to M |
| 3 | The Futures in front-row slots by the Oracle, rows under their feet; add them to the row test | the Oracle's summon slots, row test | S |
| 4 | Light the Saffron Wind's deck: lantern pools, one value lighter, stars at the edges | `src/data/maps/ep5_ship.js` | S |
| 5 | Saffron Haven: warm paving, lit lamps at dusk, the armillary on the skyline, the waystone placed | `src/data/maps/ep5_saffron.js`, tiles | S to M |
| 6 | Shade on paving: cooler and lighter, rooted at the caster; keep sand's violet | `src/data/ep5/field/art.js` | S |
| 7 | A rose dawn tint (or the pale noon tint) | `src/data/ep5/field/system.js` | S |
| 8 | Restored chart in three stages, the seal at step 4 | `src/data/ep5/pages.js`, `story.js` | S |
| 9 | Vex opaque and kneeling, the party two rows below, the guard held | `ep5_lab_f2.js`, `story.js` | S |
| 10 | Shade drawn over a caster's lower half; a Turn the Sky icon | `src/data/ep5/field/art.js`, `menu.js` | S |

**Verdict.** On the floor, Episode 5 is the strongest art the game has shipped: a mechanic you can read without a word, three
floors that each look like their own place, and every Episode 4 readability lesson carried through with measured margins. The
weak spots are all on the edges of that core: a Day sky that is the night sky in better light, two summons parked on the
party, a dark first map and a town that is not yet the saffron place its name promises. None needs new painted art to get
to the bar; most are an afternoon each. Fix the menu blocker first, then items 2 and 3, and the episode reads on a phone the
way the plan meant it to.
