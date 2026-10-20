# CRITIQUE 3: NEXT, third pass

Read-only review, 2026-10-20. Sources: 50 phone (iPhone landscape, 2532x1170) and desktop shots in `qa/out`, plus 3x crops. Phone is the bar. Claims are Fact from the shots unless marked Inference.

## 1. CRITIQUE_2 check

- Fixed: title, prologue and name-entry density (title samples 194 colors at 384x216), daylight valley battle stage with cast shadows, window text padding, glove clipping, one confirm triangle, Victory window sized, Fury READY beside the gauge, night ending, equip and shop and status screens.
- Partly: dark enemies (bookmites still dim on violet, `battle_break`); valley terrain (tall grass and road still step at right angles, `field_valley_wildlife`); push block (carved now, still reads as a headstone, `field_push_block`); touch (A, B, RUN, MENU are good, menu rows about 25 css px).
- Still showing: ink pits and bridges as flat navy rectangles (`field_archive_dark_lantern`, `story_lantern_get`, `story_echo_warden`).

## 2. Twelve improvements, ranked

1. **Dialogue window eats the phone screen.** Where: `story_fading_sign`, `archive_door`, `echo_warden`, `leave_town`. See: a four-line window under two lines of text, covering the bottom 30%, hiding the hero or the speaker. Why: Chrono keeps the speaker in view; here the person talking is often the one you cannot see. Change (code): size the window to its text (2 lines, about 48 px) and move it to the top when the speaker stands below mid screen.
2. **Battle commands show 4 rows.** Where: `battle_command`, `battle_boss`. See: Attack, Tech, Fury, Combo and a scroll arrow; Swap, Item, Flee are hidden. Why: on a boss turn a thumb should reach Item in one tap. Change (code): narrow the party panel and give the command window 6 rows.
3. **Archive floors look the same and float in black.** Where: `story_f1_arrival`, `thirteenth_bell`, `boss_door`. See: one grey flagstone with orange checks, rooms as rectangles in void; floors differ only by darkness. Why: Lufia II dungeons each have a theme you can name. Change (art): per-floor palette and floor tile (F1 oak and paper, F2 cold slate, F3 root green with ink glow), and dark roots and shelf silhouettes in the void.
4. **Ink pits are the one field tool and look like missing textures.** Where: `archive_dark_lantern`, `lantern_get`. See: hard navy rectangle, chevron bridge. Change (art): irregular autotiled edge, lighter rim, glow under the lantern beam, planks that grow in.
5. **A blank blue window sits bottom left.** Where: `battle_break`, `battle_victory`, `battle_levelup`. See: an empty command box. Why: reads as a bug on the most-seen screen. Change (code): hide it, or use it as the battle log.
6. **Damage preview prints "18-23 ? 1".** Where: `battle_target_preview` (crop confirms). See: the multiplication sign renders as "?". Why: the planning number is the game's hook. Change (code): add the glyph to the bitmap font or print "x1".
7. **Phone input leftovers.** Where: `ui_name_entry`, `ui_menu`. See: "Z pick, X erase, Enter" keycaps on a touch screen; menu rows near 25 css px against a 44 px floor. Change (code): A and B glyphs on touch, and tap the row under the finger with one row of slop.
8. **Bram is three people.** Where: `story_south_gate`, `leave_town`, `return`. See: grey-bearded portrait, a teal ponytailed youth as the gate sprite, a bearded armored party sprite in `f1_bell`; the gatehouse roof also draws over Mira's body. Why: it is the strongest scene in town. Change (art): reuse the armored sprite for the gate and lift the roof layer off the walkway.
9. **The bestiary shows no monster.** Where: `ui_bestiary`. See: text and icons, six "???" rows, no picture. Change (art and code): draw the battle sprite in the detail panel and a black silhouette for unseen entries.
10. **The boss on the field is not the boss in battle.** Where: `story_archivore` vs `battle_boss`. See: a small beetle on a rug, then a giant winged eye. Why: the walk to the door loses its payoff. Change (art): field avatar becomes the hovering eye at 2x with a shadow.
11. **Battle is posed, not performed.** Where: `battle_victory`, `battle_command`. See: three small sprites in one idle frame, no victory, hurt or cast pose (Inference: enemy frames are the parked W6 work). Why: Secret of Mana is animated combat. Change (art): ready, hurt, cast, KO and victory frames, enemy idle and hit frames.
12. **Music reuse across the dungeon.** Where: `src/data/story/ep1.js`, maps. See: `archive` on all three floors, `mystery` used once, `sorrow` referenced nowhere (grep; Inference that it never plays). Change (audio): `mystery` on F3, `sorrow` on the return and epilogue, a variant for F2.

## 3. Next big steps

A. **Finish Whisperwood Hollow as a second dungeon with a second Lantern verb.** The branch is parked. Add timed switches and a lantern upgrade (light braziers from range). Episode 1 runs about 70 to 85 minutes by the test saves (Inference); this adds a 20 minute optional dungeon and the Lufia II feeling of a tool that grows.

B. **Per-member field abilities.** Bram shoves heavy blocks, Mira reads glyphs to reveal hidden doors, Arden holds the lantern, switched on the menu button. It gives the followers a job in puzzles and a reason to read the party, which is the Chrono trait the field lacks.

C. **A vertical slice of Episode 2.** One town, one dungeon, one boss in a new realm tileset, built only from existing systems. It proves the eight-realm plan scales and tells Scott what a second hour costs.

D:\LexiconQuest\next\docs\CRITIQUE_3.md
