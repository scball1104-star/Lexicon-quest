# CRITIQUE 4: Episode 2 art and UX

Read-only review, 2026-10-21, branch `overhaul`. Bar: Chrono Trigger, Lufia II, FF6, with the phone as the bar.
Sources: the 13 Episode 2 shots in `qa/out` (phone 2532x1170 and desktop 1920x1080, plus the portrait-phone
variant of `battle_other_selves`), `qa/battlescene/out` (other_selves, nameless_king, glass_reflect), `qa/ui/out`
(ep2_*), the map previews for east_road, nameless_hollow, the five nh_* interiors, court_f1/f2/f3 (and _solved)
and court_throne, and Episode 1 phone shots for comparison (story_archivore, field_town_morning, story_wake,
battle_boss, battle_break, ui_title_card). Native-resolution crops were made for every claim about small detail.
Claims are Fact from the shots or the named source line unless marked Inference. No new renders were needed.

Sizes: **S** = hours, one file or a data change. **M** = about a day for one agent. **L** = several days or a new
art set.

## 1. Verdict

A player who loved Episode 1 will recognise the same game: the windows, the battle stage, the party, the
timeline and the field all carry over, and a few Episode 2 pieces beat Episode 1 (the F3 room lit only by the
beam, the F2 gallery of blank-faced portraits, Mira sealed in a glass prism, Vex standing inside the mirror). It is
not yet at the same quality, for one reason above all: the three images this episode is built on do not read on a
phone. The Fading Road has no fog, the Town Without a Name sits in plain daylight, and the faces in the fountain
are two coloured blobs above the party's heads, so the ending line "Your reflection is there now" points at
nothing. Episode 1's equivalents (the flickering sign, the lantern revealing ink, the Archivore's eye) were all
shown, not told. Add a phone mini-boss fight where one of three foes is invisible, portraits a tier below Episode
1's, and a first Court floor that is a grey tile grid, and the honest answer is: the same game, a notch lower.
Items 1 to 6 below close most of the gap; none needs new systems.

## 2. The known issues, checked

| Known issue | Verdict | Rank |
|---|---|---|
| Fading Road true path is a plain dirt road, mist faint, no tension | **Confirmed.** The path is the only dirt in the stretch; mist is capped at 14 blobs; the map tint is `none` (`east_road.js` lines 189-190). | 4 |
| `hollow_dusk` reads as daylight | **Confirmed, measured.** Mean luminance 0.459 under hollow_dusk vs 0.505 restored vs 0.485 Willowmere morning. | 3 |
| Phone: touch command window hides part of a foe in 3-foe fights; weakness rows overlap sprites | **Confirmed, and worse than "part":** the Nameless Reflection is fully hidden. | 1 |
| Black feather on the glass bench drawn as a letter | **Confirmed.** `court_f3.js` line 100 uses `prop_letter`. | 14 |
| Party reflections on the Court F1 carpet runner | **Confirmed.** Cause: the runner is `gallery_floor`, which is `reflect: true` (the F2 floor), so it works as built and looks wrong. | 12 |
| Episode 2 drawn portraits simpler than Episode 1's | **Confirmed**, and the `nameless_king` portrait is unreadable. | 5 |

CRITIQUE_3 carry-overs that hold in Episode 2 (Fact): dialogue windows sized to their text, the two-column command
window, bestiary sprites, A/B glyphs on name entry. The one that recurs: CRITIQUE_3 item 3 ("rooms as rectangles in
void") is back on every Court floor (item 6 below).

## 3. Fifteen findings, ranked by player impact

1. **Phone: the mini-boss you cannot see.** (S)
   - Where: `qa/out/phone-battle_other_selves.png`, `qa/out/portrait-battle_other_selves.png`; `desktop-` of the same shot is fine.
   - See: the Nameless Reflection (left slot) is hidden by the command window except a white sliver, its "!"
     telegraph bubble points at empty backdrop; Mira's Reflection is cut in half. The weakness rows sit across
     the torsos. Mechanism (Fact, `src/battle/scene/layout.js`): `CMD_WIN_TOUCH` spans x 4-130, y 132-212;
     `ENEMY_X[3]` puts foes at x 52 and 124 with feet at y 146; `enemyRowAnchor` then lifts their rows to y 116,
     onto the body. Window plus row cover almost all of a 40 px sprite. Desktop is clear because `CMD_WIN` starts at y 152.
   - Why: FF6 and Lufia II never draw a menu over a living enemy; the planning game (Break, telegraphs, the
     Mirrored Combo bracket) depends on seeing who acts. This is the episode's mini-boss.
   - Fix: on the touch layout use touch-only slots right of the window (3 foes at x 150, 198, 246; 2 at 166, 232;
     party starts at 290), or lift any foe whose box meets `CMD_WIN_TOUCH` by 20 px. Put a weakness row under the
     feet when it fits and above the head when it does not, never across the body.

2. **The faces in the water do not read, and the ending shows nothing.** (M)
   - Where: `phone-field_hollow_fountain_faces.png`, `phone-story_ep2_ending.png`, `phone-story_hollowmere_restored.png`.
   - See: the party clumps at the south rim and covers the basin. Above their heads the water holds a pale grey
     oval (the hero's smudge) and a purple dome (the crown of Mira's hair, no eyes); each is about 20 x 8 px.
     `reflections.js` clips each face at the heads of the people at the rim, so only the top of the head can ever
     show. In the ending the night tint hides even that, so "Your reflection is there now. Faint" is text only.
   - Why: the plan calls this effect the episode's central image "without a word of text" (EPISODE2_PLAN 5.2).
     Chrono Trigger stages its key reveals so the object is unobstructed and the camera is on it; FF6 pans to
     the thing that matters while the party steps aside.
   - Fix: a "fountain view" insert used by `fountain_check`, `fountain_faces` and the ending: a framed 2x crop of
     the basin (about 128 x 64 internal) drawn over the field, with whole upright faces (eyes visible) for Mira,
     Bram and one stranger, the hero blank before `nh_restored` and faint after. In the scenes, walk the party to
     the basin's sides so the water stays clear, and lift the ending's tint locally around the fountain.

3. **The Hollow's dusk is daylight, so the restoration has no visual payoff.** (S for the tint, M for the palette)
   - Where: `phone-field_hollow_fountain_faces.png` (before) vs `phone-story_hollowmere_restored.png` (after) vs
     Episode 1 `phone-field_town_morning.png`.
   - See: before and after are the same sunny square. Measured on the desktop shots (game area): luminance 0.459
     before, 0.505 after, 0.485 Willowmere; saturation 0.31 vs 0.41. `hollow_dusk` (`lighting.js` line 31,
     `#b6b0d4` at 0.36 multiply) darkens each channel by only about 10 percent. The square also reuses
     Willowmere's warm cobbles, rose benches, lamps and green willow canopies, so the Town Without a Name reads as
     Willowmere's square with grey roofs.
   - Why: FF6's World of Ruin and Chrono Trigger's eras sell change through palette before a word is said;
     Dragon Quest gives every town its own colour. Here the before/after is a 9 percent brightness step.
   - Fix: `hollow_dusk` to about `#8e88c0` at 0.55 with desat 0.45 and a pale ground haze, lamps lit; on
     `hollowmere_restored` cross-fade through a warm `dawn` gold for the scene, then to `none`. Palette-swap the
     plaza kit for the Hollow (slate-grey cobble, silver-leaf canopy on `tree_birch_silver`, white-blue flowers).

4. **The Fading Road is a dirt road with a few wisps.** (M)
   - Where: `phone-field_fading_road_mist.png`, `tools/maps/previews/east_road.png`.
   - See: the zigzag true path is the only dirt in the stretch and the loop-door zones are plain grass beside it,
     so the "maze" is a road to follow. Mist is a handful of faint dithered patches (cap 14, `particles.js` line
     18); the map tint is `none`. The shot measures luminance 0.456 and saturation 0.52, more saturated than
     Willowmere. Cairns line a path that needs no guide.
   - Why: FF6's Phantom Forest wraps the screen in a moving fog layer, so the player feels lost even on a simple
     route. The plan wants cairns "each visible from the last" to be the guide; today the road makes them decoration.
   - Fix: paint the stretch as one ground (grass with sparse faded path flecks, no continuous road), add a
     full-area ground-fog layer (dithered white at 40 to 55 percent with a clear radius of about 2.5 tiles around
     the leader, drawn above actors at the edges), a grey `mist` tint for x 20 to 39, and let each cairn show a
     faint light when the leader is within 4 tiles. Keep the three-wide forgiving corridor.

5. **Episode 2 portraits drop a tier; the King's portrait is a blob.** (L for five repaints, S for the King re-crop)
   - Where: `phone-story_aurel.png` vs `phone-story_vex_mirror.png`; contact sheet of `assets/sprites/portraits.png`.
   - See: `elian`, `anwen`, `tovin`, `lena`, `aurel` are frontal, symmetric faces with flat skin, a pink cheek
     blot, hair as one mass, no light direction and no shoulders. Every Episode 1 portrait (for example `mael`, `hob`,
     `garrick`, `pip`) is three-quarter view with a key light and hair clusters.
     `nameless_king_48` is silver noise with a cyan slash and no face. Aurel's big reveal ("Elian.") plays with
     the weakest portrait in the game.
   - Why: FF6's cast reads as one painter's hand; a mismatch in the same dialogue window breaks that.
   - Fix: repaint the five at 48 px using `mael` and `garrick` as the lighting and ramp reference (three-quarter
     turn, light from upper left, 4 to 5 skin steps, hair in clusters). Re-crop `nameless_king` to the hood and
     face, with the unmasked face as a second portrait. Inference: the unused painted cells `hooded_sage` and
     `noble_lady` (no references in `src/`) could stand in for Orla or a later character.

6. **Court F1 is a grey tile grid floating in black.** (M)
   - Where: `phone-field_court_f1_beam_teach.png`, `-start.png`, `tools/maps/previews/court_f1.png`.
   - See: every room uses one light-grey 16 px flagstone with blue corner dots and the same strip of arched
     mirror-windows on its north wall; rooms differ only in size and float in a black void (CRITIQUE_3 item 3,
     repeated). Reflections and the faint hero smudge are near invisible on the light floor.
   - Why: this is the first Court screen and the teaching floor. Chrono Trigger's Zeal palace sells "silverglass"
     with gold trim, patterned floors and light; Lufia II gives every dungeon area a look you can name.
   - Fix: moonlight shafts from the windows as light pools (lighting.js already draws pools), a darker floor
     band along the walls, two or three floor variants (inlaid star, cracked glass panel, darker silver), vary the
     wall strip per room (tapestries, a broken mirror, a niche), and dress the void as the mere at night below the
     palace (dark water, moon glints) instead of flat black.

7. **The beam machinery's resting states are unreadable on the phone.** (S to M)
   - Where: `phone-field_court_f2_bridge.png` (bottom left), `phone-field_court_f3_dark_beam.png`,
     `assets/tiles/court.png` (bridge, inlay and vow door frames), `court_f3_solved.png`.
   - See: `glass_bridge_*_dim` is a dotted outline with no fill, nearly invisible over the void, so the player
     cannot see where a bridge will form. The vow door's three crystals are 2 to 3 px dots and lit vs unlit is a
     shift from dark blue to cyan; the F3 goal (three wings, three vows) has no readable progress. The silver
     inlays are 3 px raised tubes with rounded bends that read as pipes on the floor.
   - Why: Lufia II's rule, and DESIGN 5.3: "Every puzzle must be readable on screen without text explaining it."
     The lit states are excellent (section 5); the waiting states carry the puzzle and are the weak half.
   - Fix: fill dim bridges with a 25 percent glass tint plus a rail post at each end and a slow shimmer; redraw the
     vow door crystals at about 5 x 5 with a clear dark socket and a glow halo when lit (and a camera beat to the
     door when each vow lights); inlays as a flush 1 px line with a 1 px highlight that pulses when the receptor lights.

8. **Visible enemies in the Court are camouflaged.** (S)
   - Where: `phone-field_court_f1_beam_teach.png` (quicksilver at left and top right, a glint wisp top left),
     `phone-field_court_f2_bridge.png` (faceless knights).
   - See: the quicksilver is a grey blob on a grey floor; the wisp is a faint violet circle; the knights are dark
     grey on dark violet. At phone size they read as floor props.
   - Why: Lufia II's visible enemies are the planning layer of every room; you cannot plan around what you do not see.
   - Fix: a 1 px dark outline in the material's own dark (DESIGN 6.1), one bright accent cluster (eyes or core),
     a ground shadow on every field enemy, and wisps at alpha 0.8 or more.

9. **The Other Selves are flat violet cutouts.** (M)
   - Where: `qa/battlescene/out/phone-other_selves-card.png`, `phone-battle_other_selves.png` (timeline),
     `qa/ui/out/phone-ep2_bestiary_refl_hero.png`.
   - See: three party-sized sprites in one flat violet with almost no internal shading, on a violet backdrop. Their
     timeline heads are violet blobs that cannot be told apart, so the Mirrored Combo bracket ("Nameless
     Reflection and Mira's Reflection move as one") links two icons the player cannot name.
   - Why: in Chrono Trigger the shadow and clone fights keep each silhouette's signature so you know who is who;
     a mirror of your party should be eerie, not a placeholder.
   - Fix: a four-value glass ramp (white rim light, cyan mid, violet shadow, deep indigo outline) with a vertical
     glint stripe; keep each owner's signature accent (the hero's white scarf, Mira's staff gem, Bram's shield
     cross) in both the sprite and the timeline head; a pale backlight so they separate from the backdrop.

10. **The King is framed badly on the stage.** (S)
    - Where: `phone-battle_kept.png`, `phone-battle_king_unmasked.png`, `phone-nameless_king-card.png`.
    - See: the King's frame is 142 x 138 (cast 154 x 152) with feet on the y 146 baseline, so its top is at y 8
      while the help window covers y 4 to 23 and x 4 to 222: the crown is cut by the help window (Fact by the
      atlas sizes, matches the shot). The weakness row sits on the robe. His timeline head (`head_nameless_king`)
      is a dark square with a pale lintel and a slash: it reads as a window, not a king.
    - Why: FF6 bosses sit whole inside the battle field; the crown and the mask are the unmask beat's focal point.
    - Fix: give floating bosses their own slot (feet at about y 164, the hem passes behind the bottom windows) so
      the crown clears y 26; row under the hem or beside the boss; re-crop the timeline head on the hooded face.

11. **Story camera hides the person being spoken to.** (S)
    - Where: `phone-story_vex_mirror.png`.
    - See: Vex stands in the mirror at the far left; the hero is at the bottom-left corner under the portrait and
      window, only his hair showing; the right half of the frame is the void and the island.
    - Why: Chrono Trigger frames both speakers before the line plays. CRITIQUE_3 item 1 asked for the window to
      move to the top when the speaker stands low; it still does not.
    - Fix: `camera.panTo` the midpoint of the hero and the mirror before the exchange; move the window to the top
      when the addressed actor stands in the lower third of the view.

12. **Party reflections on the F1 carpet runner.** (S)
    - Where: `phone-field_court_f1_beam_teach.png` (Mira and Bram mirrored on the violet runner).
    - See: the runner is F2's `gallery_floor` (reflective) used as a carpet; it looks like cloth, and it is the one
      surface on F1 where reflections show clearly.
    - Fix: a non-reflective `gallery_runner` variant for F1 (or flag runner overlay cells off in
      `buildReflectGrid`), and raise F1's glass reflection contrast so the effect lives on the glass.

13. **F1's grey floor pasted into F2 and the throne room.** (S)
    - Where: `phone-field_court_f2_bridge.png` and `court_f2_solved.png` (the island), `phone-story_aurel.png` and
      `court_throne.png` (the dais).
    - See: a block of F1's light-grey flagstone and a hard-edged blue pool on F2's violet marquetry; the same grey
      block as the King's dais on the black mirror floor. Both read as missing tiles.
    - Fix: island and dais tiles drawn from each floor's own ramp (violet marquetry with silver inlay; black glass
      with a silver rim), the pool with a stone lip.

14. **The black feather is a letter.** (S)
    - Where: `court_f3.js` line 100 (`object('feather_obj', 24, 7, 'prop_letter', ...)`), `court_f3.png` preview.
    - See: a cream envelope on the glass bench, so the object the scene is about is the wrong thing.
    - Fix: a 16 x 16 `prop_feather_black` (black vane, violet sheen, one white highlight) and swap the sprite id.

15. **The King's battle art is noise without a focal point.** (M)
    - Where: crops of `desktop-battle_kept.png` and `desktop-battle_king_unmasked.png`; compare `phone-battle_boss.png`.
    - See: the robe is a field of single-pixel grey, white and blue speckle from quantisation; the mask slash is a
      dark hole, and the unmasked face is about 8 x 10 px. The Archivore, by contrast, has one bright yellow eye
      that holds the frame.
    - Why: FF6 boss art has clean value groups and one place the eye goes.
    - Fix: a cleanup pass on `nameless_king` and `_unmasked` (merge speckle into 3 to 4 value groups per
      material, one light from the upper left), a cold glow behind the mask so it is the focal point, and a larger,
      lit face on the unmasked frame.

## 4. Also seen, below the line

- The throne room's great mirror shows the town on a grey checker plaza that reads as an image editor's
  transparency grid at phone size (`phone-story_aurel.png`).
- `battle_east_road` has flat banded sky and a flat ground, simpler than the painted `battle_court`
  (`phone-glass_reflect-rows.png`); it is the backdrop of the first seven Episode 2 fights.
- The Hollow interiors are their Willowmere layouts re-floored in grey stone; `nh_hall` is sparse next to the
  library it copies (previews).
- The King's field avatar is a crowned armored knight; in battle he is a towering glass wraith (`court_throne.png`).
- Inference: `phone-ep2_field_start.png` shows Mira and Bram standing on the hero's bed beside him under the zzz
  emote at the first frame of Episode 2; confirm in play whether `ep2_morning` re-stages them.

## 5. Protect these (do not lose them in the fix pass)

- **F3's dark beam room** (`phone-field_court_f3_dark_beam.png`): the beam as the only light, pillars, the black
  star-flecked mirror floor, clear reflections under the party. The best field screen in the episode.
- **F2's portrait gallery**: blank-faced portraits in gold frames, violet marquetry, a lit bridge appearing under the beam.
- **The beam itself**: a 2 px core with a cyan halo, instant feedback (turn the mirror, the receptor lights, the
  gate opens in the same press), and the teach room's wrong state splashing toward the west door.
- **Kept**: Mira sealed in a glass prism on the stage, readable at a glance (`phone-battle_kept.png`).
- **The Mirrored Combo bracket** on the timeline, and the boss cards THE OTHER SELVES / Hall of Reflections and
  THE NAMELESS KING / Keeper of the Court.
- **Vex in the mirror**: drawn inside the glass, silvered and translucent, with the painted `silver_rogue` portrait.
- **The ending's night**: lamp light pools on the square match Episode 1's night ending.
- **`battle_court`**: the painted mirror-palace backdrop.
- **The Hollow's layout**: a Dragon Quest town that reads at a glance, the Court's silhouette across the mere,
  the clocktower with no hands, the chapel's empty bell frame.
- **CRITIQUE_3 fixes holding**: dialogue windows sized to text, the two-column command grid, bestiary pictures, A/B glyphs
  on name entry, the "Episode 2" title entry.

## 6. Not checked

Motion and timing (beam shimmer, mist drift, the unmask shatter, the mirror-door dither, the Other Selves
entrance; the `mirror_cracks` and `unmask` battlescene files are crop filmstrips, not full frames), audio, real
touch feel on a device, and the field view of the Other Selves arena (no shot exists). No game was played.
