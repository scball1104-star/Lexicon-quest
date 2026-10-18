# W5b-ui: the remaining UI items from the second critique

**Owned paths:** `next/src/ui/**`, `next/src/core/touch.js`, `next/src/core/input.js`, `next/src/scenes/{title,prologue,
titleCard,nameEntry,credits,menu,shop,gameover,config,loadGame}.js`, `next/src/battle/scene/hud.js` (Fury READY
label only), `next/qa/shots.py`, `next/qa/ui/**`, `next/tools/maps/preview.py` (only to re-render previews),
`next/tools/maps/previews/**`, `next/docs/UI.md`. Nobody else is coding right now.

Read `next/docs/CRITIQUE_2.md` items D1, D6, D7, D8, D10, D11, D12 (numbered in `next/PLAN.md` under
"Wave 5 visual backlog"), then `docs/UI.md` and `qa/shots.py`.

## Deliverables
1. **D1 one pixel density on key-art screens:** the title, prologue, name entry and credits still show 10k+
   colors because the vignette and overlays are alpha-blended over the quantized atlas. Replace the vignette and
   any alpha tint with ordered-dither (Bayer 4x4) darkening to palette colors, and draw the atlas 1:1. Verify with
   a color count on the rendered 384x216 frame (target under 150, excluding the logo's own gradient).
2. **D6 text padding:** every window keeps at least 8 px between its frame and text (dialog, menus, shop, help
   bar, status). Audit with a script that renders the ui shots and checks the window rects vs text extents.
3. **D7 cursor glove clipped at x=0** in Shop and Journal: shift the list or the glove so it is never clipped.
4. **D8 touch chrome:** RUN and MENU pills at least 36 css px tall on phones; keep them out of the game area.
5. **D10 consistent confirm glyphs:** one helper decides the glyph for the current device, used everywhere
   (title hints, dialog more-arrow help, config help, battle help).
6. **D11 Victory window and Fury READY:** empty Victory window on no-drop fights shows "No drops" in dim text
   and shrinks to fit; the Fury READY label sits beside the gauge, not over it (hud.js only for this).
7. **D12 QA harness:** `qa/shots.py` waits for the typewriter to finish (dialog exposes `LQ_DEBUG.state().dialog
   .done` or similar; add it if missing) before capturing story shots; re-render all map previews with
   `tools/maps/preview.py --all` so critics see current art.

Verify with `python next/qa/shots.py --only ui_*,story_*` on desktop and phone (view them), `python
next/qa/ui/paths.py`, and `node next/qa/run.mjs` green. Report with image paths and the color counts.
