# W7-phone-ux: the phone-facing fixes from CRITIQUE_3 (items 1, 2, 5, 6, 7, 9)

**Owned paths:** `next/src/ui/**`, `next/src/scenes/{dialog,nameEntry,menu}.js`, `next/src/battle/scene/{menu,layout,hud}.js`,
`next/src/scenes/battle.js` (command window, battle log and preview text only), `next/assets/ui/font*.json` and
`next/tools/art/ui/**` (only if a glyph is truly missing), `next/qa/ui/**`, `next/qa/battlescene/layout.test.mjs`,
`next/docs/UI.md`. Two other agents are running: one owns `src/data/**` and maps (secret dungeon), one owns
`tools/art/sprites`, `assets/sprites` and `src/battle/scene/{actors,animator}.js` (animation). Do not touch those.

Read `next/docs/CRITIQUE_3.md` items 1, 2, 5, 6, 7, 9 and `next/docs/UI.md`. The player plays on an iPhone in landscape.

1. **Dialogue height (item 1):** the dialogue window must not cover more than about 22% of the 216 px screen on a
   phone. Size the window to the page (1, 2 or 3 lines, never 4), keep the 48 px portrait legible (portrait may
   overlap the window's top edge FF6-style), and when the speaker or the hero would be hidden, flip the window to the
   top (`position:'top'` logic that checks the speaker actor's screen y). Desktop unchanged unless it also helps.
2. **Battle commands (item 2):** all commands visible without scrolling: lay the root command list out in two
   columns (4 rows x 2), widening the command window into the status window's left margin if needed, or move the
   rarely used Flee into the help window's touch buttons; keep keyboard order sensible (up/down within a column,
   left/right across). Keep tap-to-select, second tap confirms.
3. **Blank command window (item 5):** when no command is being chosen (enemy turns, victory, level-up), use that
   window as a short battle log (last 3 lines: "Briar Wolf attacks Mira", "BREAK!", "Mira learns Ember"), or hide it.
4. **Preview glyph (item 6):** the damage preview prints "18-23 ? 1" because the multiplication sign is missing or
   mis-mapped; make it render (use the font's glyph, or plain "x").
5. **Touch glyphs (item 7):** on touch devices, name entry and every menu hint show A/B touch glyphs, never keyboard
   keycaps; menu rows at least 44 css px tall on the phone profile (adjust TOUCH_ROW_H or the scale) while keeping
   lists on screen.
6. **Bestiary picture (item 9):** the bestiary detail panel draws the enemy's battle sprite (enemies_battle /
   bosses_battle atlases, scaled down to fit, nearest-neighbor, integer scale), and a black silhouette for unseen
   entries.

Verify with `python next/qa/shots.py --only <relevant ui_*, story_*, battle_* shots> --device all` (view the phone
ones), `python next/qa/ui/padding.py`, and keep `qa/ui/*`, `qa/core/*`, `qa/battlescene/*` green (`qa/maps`,
`qa/world/walks` and `qa/battle/fuzz` may fail meanwhile because of the other agent's in-progress dungeon; not yours).
