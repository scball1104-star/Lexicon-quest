# CRITIQUE 2: NEXT build vs the DESIGN.md bar, second pass

Read-only art direction pass, 2026-10-18. Sources: `qa/out/desktop-*.png` and `phone-*.png` (shots dated 01:07 to 01:39), `qa/battlescene/out/desktop-stage-*` and `desktop-strip_impact-*`, `qa/world/out/p_*.png`, `tools/maps/previews/*.png`. Every desktop frame was sampled to 384x216 and checked for off-grid pixels and color count.

## Round 1 check (CRITIQUE_1 items 1 to 17)

| # | Item | Status | What still shows |
|---|---|---|---|
| 1 | Two pixel densities | Partly | Battle backdrops now 594 to 960 colors. Title, prologue, name entry, credits, inn and dialog tests still carry 10,500 to 13,951 colors with a 2x2 checker dither over the whole painting; `battle_start` 28,917. |
| 2 | Portraits vs sprites | Partly | Mira fixed (violet hair, hood down). Bram's sprite is still a brown-haired youth in teal under a grey-bearded portrait (`story_south_gate`, `ui_menu`, every battle). |
| 3 | Battle stage | Partly | One baseline and a darker band exist. No cast shadows (`_zoom_party_feet8x`); sprites still stand on painted bridge and stair texture. |
| 4 | Timeline icons | Fixed | Chibi heads, side-colored frames, preview slot. |
| 5 | Shatter rotation | Fixed | Axis-aligned slices (`strip_intro-slices`). |
| 6 | Archive floors | Mostly | Flat indigo void, wall faces, pillars. Rooms still rectangles. F3 pit still renders pink in `archive_f3.png` and no in-game shot shows it; the valley navy rectangle by `chest_whisperwood` is still in `valley.png`. |
| 7 | Lantern light | Fixed | Dithered radial falloff. |
| 8 | Enemy sprite noise | Partly | Slime and ink wraiths clean. Wolves keep fur hatching; bookmites are near-black blobs. |
| 9 | Plaza cobble | Fixed | Mortar in the mid step, NPCs lead the floor. |
| 10 | Reward overlap | Fixed | Help bar and timeline hide. |
| 11 | Hit feedback | Fixed | Impact star, flash, WEAK and CRITICAL labels, thrust lines. Slash arc still 1 px. |
| 12 | Touch targets | Partly | A and B now about 56 css px. Menu rows still about 18 css px; RUN and MENU pills about 14 css px tall. |
| 13 | Name drift | Fixed | Battle reads Arden. |
| 14 | Game over backdrop | Fixed | Full gradient. |
| 15 | Followers on leader | Fixed | Trail on two tiles. |
| 16 | Library rug grid | Fixed | One bordered rug in `story_mira_joins`. `previews/library.png` is stale (00:20) and still shows the grid. |
| 17 | Ambient motion | Fixed | Fireflies in `p_night_square`, chimney smoke, birds, motes shots exist. |

Previews predate the game shots by an hour; regenerate them before the next pass.

## New issues, ranked

1. **Bram is two people.** Where: every dialogue, menu, save record and battle. What: a grey-haired bearded veteran in the portrait, a brown-haired teal-shirted youth on the field and in battle and on the timeline. Why: the player meets both every few minutes; Chrono Trigger never lets a face and a sprite disagree. Change: redraw the sprite head only (grey hair, beard pixels, darker tunic) across the field and battle sheets, keep the bodies.

2. **The first screen is still a painting.** Where: `ui_title`, `ui_prologue`, `ui_name_entry`, `ui_credits`. What: 13,951 colors and a 2x2 checker dither across the whole image, visible at 3x in `crop_title_dither`. Why: FF6 and Lufia title art is drawn in the game's own ramps; a dithered photo under clean UI reads as a web page. Change: run the same quantizer that produced the 600-color battle backdrops over the key art, no global dither, dither only in the sky gradient.

3. **Battle backdrop contradicts the field.** Where: `stage-valley`, `battle_command`. What: a daylight meadow fight drops into a night town with a bridge and waterfall; wolves stand on stairs, the party on a bridge, no shadows. Why: FF6 and Lufia II match the ground plane to the terrain you were standing on. Change: a daylight meadow crop for valley encounters plus a 50 percent dithered ellipse under every combatant.

4. **Dark enemies vanish on the archive stage.** Where: `battle_break`, `stage-archive`, `crop_bookmites`. What: bookmites and the Archivore's base are near-black on dark violet, with a glowing open book directly behind the enemy zone. Why: the target the player must read is the lowest-contrast thing on screen. Change: a 1 px cream rim light on dark enemy sprites and a 20 percent darkening of the backdrop behind the enemy zone.

5. **Hidden-ink pits and bridges are flat navy rectangles.** Where: `p_dark_lantern`, `story_echo_warden`, `story_lantern_get`. What: hard-edged navy blocks with a row of cyan chevrons. Why: it reads as a missing texture, and this is the game's one field tool. Change: draw them with the animated ink-pool terrain, autotiled irregular edge, 1 px lighter rim.

6. **Valley terrain is blocky.** Where: `field_valley_wildlife`, `crop_tallgrass`, `valley.png`. What: tall grass as axis-aligned rectangles, the road a straight band with a 1 px fringe, the pond a rectangle. Why: Secret of Mana's fields have no right angles. Change: autotile tall grass and shoreline with the A2 blob set and give the road two width changes per screen.

7. **Text runs to the window edge.** Where: `ui_journal`, `crop_journal_edge`, first lines of every story dialog. What: body text ends on the inner bevel with zero right padding. Change: wrap width = inner width minus 8 px. Five story shots were captured mid-typewriter; the harness should wait for text completion.

8. **Cursor glove clipped at the screen edge.** Where: `ui_shop`, `ui_journal`, `ui_bestiary`, `crop_shop_cursor`. What: the list sits at x=0 so half the glove is off screen. Change: inset list windows 12 px or draw the glove inside the window.

9. **Touch chrome is still keyboard-sized.** Where: `phone-ui_menu`, `phone-ui_shop`, `phone-field_touch`. What: list rows about 18 css px, RUN and MENU pills about 14 css px tall, no tap affordance on lists. Change: tap selects the row under the finger with one-row slop; 44 css px minimum on every control.

10. **Push block reads as a cabinet.** Where: `field_push_block`, `crop_puzzle`. What: a steel-blue 16x24 panel with a gold rune and no top face. Why: Lufia blocks are heavy cubes you can read from across the room. Change: lit top face, dark front, 1 px floor shadow.

11. **Confirm glyph is inconsistent.** Where: dialogs show a small "+" cross; sign and toast dialogs show a triangle. Change: one bobbing triangle everywhere.

12. **Loose ends.** The Victory window is 60 percent empty (`battle_victory`): size it to content. Fury "READY" labels overlap the row separators in `ui_menu`: move the label inside the bar. Wolves keep fur hatching: despeckle and outline.

## Now at the bar

Pixel integrity: 0 off-grid device pixels across all 65 desktop shots. Menus: items with target picker, equip compare, status and mastery, shop with "who can use it", save and load records, config colors. Battle: timeline, break shields, damage preview, name tag, combo name card, boss telegraph bubble, KO pose, level-up window. Dialogue: portraits, nameplate tab, gold emphasis. Field: location banners, town architecture, the willow, lamp posts, night tint with lamp halos and lit windows, interiors, archive dark rooms with braziers, lantern falloff, fireflies.

`D:\LexiconQuest\next\docs\CRITIQUE_2.md`
