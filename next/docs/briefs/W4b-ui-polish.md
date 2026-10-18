# W4b-ui-polish: title and prologue on the quantized key art, popup stacking, UI leftovers

**Owned paths:** `next/src/ui/**`, `next/src/scenes/{title,prologue,titleCard,nameEntry,menu,shop,inn,config,
loadGame,credits,dialog}.js`, `next/qa/ui/**`, `next/docs/UI.md`. Nobody else is coding right now, but stay in
these paths.

Read `next/docs/CRITIQUE_1.md` (C1 for the title, C12 check), the W4-battle report's gap "CRITICAL and BREAK
word art stack at one spot (ui numberPopup)", `next/assets/backdrops/README.md`, then `docs/UI.md`.

## Deliverables
1. **Title** uses the `title` backdrop atlas (`engine.assets.atlas('title').image`, 384x216, already quantized
   to the palette) instead of a runtime crop of `environments.webp`; keep the slow drift (drift the 384x216 image
   by at most 2 px using a 2 px wider render, or drop the drift if it would blur), keep the vignette, logo sparkle
   and attract mode. The prologue and title cards use `dialog_keyart`. Fall back to the old crop if the atlas is
   missing.
2. **Number popups**: stack multiple popups on the same target vertically (10 px apart, newest on top), and
   offset word art (CRITICAL, BREAK, WEAK, MISS) 12 px above the number it belongs to so the two never overlap;
   cap at 4 visible per target.
3. **Touch check (C12)**: confirm menu rows are at least 24 css px tall on the phone profile with tap-to-select
   and second-tap-confirm; shop quantity picker and name entry grid work by touch; fix anything that does not.
4. **Dialogue typewriter**: never cut a word at a page edge (the story shots show lines ending mid-word while
   typing is fine, but a page must end on a word boundary); keep the per-speaker blips.
5. **Config**: add a "Text speed: instant" option and make "Battle speed" and "Auto battle" visible in the
   battle help text (one line). Add "Reset to defaults".
6. **Credits**: verify the `triumph` track plays and the scroll ends cleanly on phone (no cut-off last line).

Verify with `python next/qa/shots.py --only ui_*,story_*` on desktop and phone (view them), `python
next/qa/ui/paths.py`, and `node next/qa/run.mjs` green. Report with image paths.
