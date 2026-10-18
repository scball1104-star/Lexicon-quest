# CRITIQUE 1: NEXT build vs the DESIGN.md bar

Read-only art direction pass, 2026-10-17. Sources: `qa/out/*.png`, `tools/maps/previews/*.png`, `tools/art/tiles/out/preview_*.png`, `tools/art/sprites/out/*.png`, `tools/art/ui/out/mock_*_3x.png`, `qa/battlescene/out/*`. Ranked most damaging first. Each item: where, what, why it misses the bar, the one change.

## Issues

1. **Two pixel densities in every painted scene.** `desktop-ui_title`, `desktop-battle_*`, prologue, credits, name entry. Sampled back to 384x216 the title frame has 54,093 unique colors and the battle frame 7,735; the town frame has 708 and the palette 74. The key art is a photo-downscaled painting under 1px-outlined chibi sprites and a 74-color UI. FF6 and Chrono backdrops are drawn in the same ramps as the sprites. Change: run every backdrop through `palette.json` with ordered dither (target under 200 colors per frame) and keep the painting only as the source.

2. **Portraits and sprites are different people.** `mock_dialog_3x`, `desktop-ui_menu`, `party_battle_4x`. Bram's portrait is grey-haired and bearded; his field and battle sprites are a brown-haired youth. Mira's portrait has loose violet hair and medium skin; her sprites are a hooded figure with the face hidden. The player sees both every few minutes. Change: redraw the two sprite heads to the portraits (Bram grey hair plus beard pixels, Mira hood down with violet hair), keep bodies.

3. **Battle has no stage.** `desktop-battle_command`, `mock_battle_3x`. The party stands in mid-air over a waterfall, the wolves on stairs, no ground line, no cast shadows, no darkened lower band (DESIGN 7 asks for one). Lufia II and FF6 put every combatant on one ground plane. Change: a 30 percent indigo band over the bottom 45 percent of the backdrop plus a dithered ellipse shadow under every sprite, feet aligned to one baseline.

4. **Turn timeline icons are unreadable.** `_zoom_timeline`, all battle shots. The eight 16x16 slots are crops of eyebrows; hero, Mira, Bram and wolf are indistinguishable. The timeline is the core CTB decision tool and it reads as noise. Change: use the chibi head from each field sprite (and the enemy field sprite) with a side-colored frame, name on hover of the cursor.

5. **Battle-start shatter rotates pixel art.** `desktop-battle_start`, `desktop-start-shards18`. Shards of the last frame are rotated at free angles, so the pixel grid breaks (DESIGN rule 3), and a stray grey glyph sits at bottom-left. Change: replace rotation with axis-aligned slices that slide apart over a 2-step mosaic, drawn at internal res; find and remove the stray glyph.

6. **Archive floors are boxes in a loud void.** `tools/maps/previews/archive_f1/f2/f3.png`, `desktop-field_archive_dark_lantern`. Rooms are rectangles on a brown diagonal-hatch fill, walls are a two-row grey band with no face depth, floors are one tile with dust specks. Lufia dungeons read as carved space with thick walls and black beyond. Change: void becomes flat `#14101e`, every wall gets a face row plus a 1px floor shadow, rooms get pillars and alcoves at the corners. Also confirm the F3 pit (preview shows pink) and the valley's flat navy rectangle (bottom right, near `chest_whisperwood`) are real art in game.

7. **Lantern light is flat alpha discs.** `desktop-field_push_block`, `desktop-field_archive_dark_lantern`. Two translucent circles overlap into a Venn diagram with hard edges. Change: a 3-step dithered radial falloff composited with max, not add.

8. **Enemy sprites keep painting noise.** `enemies_battle_4x`, `wolves` crop. Auto-downscale left single-pixel speckle (moss on the briar wolf, slime edges) and soft edges with no outline. Change: quantize each enemy to 12 to 16 colors from its ramps, despeckle isolated pixels, add a 1px outline in the ramp's darkest step.

9. **Walkable ground out-shouts the actors.** `desktop-field_town_morning`, `preview_lantern_square`. The plaza cobble uses the darkest stone step on every mortar line, so the floor has more contrast than the NPCs (DESIGN 6.2 wants the opposite). Change: mortar in the mid step, highlight only every third stone.

10. **Reward window overlaps the HUD.** `desktop-battle_victory`. The Victory window covers the help bar and timeline, cutting "AUTO" and "Victory!". Change: hide the help bar and timeline when the rewards window opens.

11. **Combat hit feedback is thin.** `_zoom_slash`, strips. The slash is a 1px arc; the hit is a solid white silhouette and a number. No impact star, no visible hit-stop or shake in the strips. Change: a 3-frame slash sprite (white core, element edge) plus an 8-frame impact star, 3 frames hit-stop, 2px shake.

12. **Touch targets are keyboard-sized.** `phone-ui_menu`, `phone-battle_command`, `tablet-field_touch`. Menu rows are 11 internal px, about 18 css px on the phone, and there is no tap-to-select; tablet A/B are about 40 css px. Change: on touch devices, tap selects the row under the finger with one-row hit slop, and A/B/d-pad scale to a 56 css px minimum.

13. **Name drift.** Battle status says "Hero" while the menu and save say "Arden". Change: battle reads the party member's name.

14. **Game over backdrop.** `desktop-ui_gameover`. A hard black band covers the top 40 internal px with no matching bottom band. Change: fill the whole frame with the gradient.

15. **Followers spawn on the leader.** `desktop-field_town_morning`. All three stack on one tile. Change: spawn followers on the two trailing tiles.

16. **Library rug reads as a tile grid.** `tools/maps/previews/library.png`. Sixteen framed squares, no border. Change: one bordered multi-tile rug object.

17. **Field lacks ambient motion.** No leaves, dust, fireflies or water shimmer in valley or town shots. Change: ship the leaf and firefly emitters from DESIGN 6.5 on the valley first.

## Already at the bar

- Pixel integrity on desktop: 0 device pixels off the 5x grid in title, town, battle and dialogue shots.
- Title logo and ribbon, location banner, nameplate tab, glove cursor, 9-slice windows with bevel and gradient, Config window colors.
- Fonts: main, large and number faces; WEAK, CRITICAL, BREAK labels.
- Menus: party status, equip compare with arrows, shop "Who can use it", bestiary, save records, name entry.
- Town architecture, trees, lamp posts and the willow; Willowmere and valley layouts are well composed.
- Party chibi sprite set: full pose list, consistent outlines and light from upper left.
- Battle: target name tag, damage preview box, telegraph bubble, break shields, boss death flash, pixel dissolve, combo name card, level-up window.
