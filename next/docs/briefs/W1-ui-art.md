# W1-ui-art: fonts, windows, cursor, icons, battle UI, logo, emotes, touch skins

**Owned paths:** `next/tools/art/ui/**`, `next/assets/ui/**`.

You define the look of every menu, dialogue and HUD element. Target: Final Fantasy VI / Chrono Trigger windows
and fonts: clean, legible, elegant, unmistakably SNES, but with modern polish.

## Deliverables
1. **Fonts** (format in COMMON.md, white glyphs on transparent):
   - `font.png/json`: main proportional font, cap height about 7 px, line height 11, ASCII 32..126 plus
     curly quotes, ellipsis, heart, star, music note, arrows, and the "x" multiply sign. Must be very legible at 1x
     on a phone. Hand-design the glyphs as pixel data in Python (no system fonts).
   - `font_large.png/json`: titles, location banners, menu headers (cap height 10 to 12 px, a little serif flavor).
   - `font_num.png/json`: bold battle damage digits 0-9 plus `+ - % !` and the words MISS, CRITICAL, WEAK,
     BREAK as pre-drawn word art, with a built-in 1 px outline, readable over any backdrop.
2. **Window skin** `window.png/json`: FF-style frame (2 px light bevel border with rounded corners, inner shadow
   line) as a 9-slice; the fill gradient is drawn by code, so provide the frame plus `colors` for 6 schemes:
   `blue` (default, FF6-like), `crimson`, `forest`, `violet`, `slate`, `ember`. Also a translucent field variant
   and a "speech tail" piece for dialogue anchored to a speaker.
3. **Cursor** `cursor` (pointing glove, 2 frames for the bob, 16x12-ish), a selection highlight bar, scroll
   arrows (up/down), a "more text" blinking arrow for dialogue, page indicators.
4. **Icons** 12x12 (and 16x16 where useful) for every icon listed in DESIGN 6.4, crisp, palette-consistent.
5. **Battle UI**: HP/MP/Fury gauge frames and fills (Fury glows when full), timeline slot frame with
   party/enemy variants and a "current" highlight, shield pip icons (full/empty), weakness icon frame and a "?"
   unknown icon, a BREAK burst sprite (3 to 4 frames), target reticle (2 frames), status icons row.
6. **Emote balloons** 16x16, 2 frames each: `! ? ... heart sweat anger music zzz idea`. Interaction prompt
   glyph (small bobbing arrow or "!" bubble). Location banner frame (wide, ornate but subtle).
7. **Title logo** `logo.png`: "LEXICON QUEST" in custom pixel lettering about 260x56 with a gold-to-cream
   gradient, dark outline, a subtle inner bevel, a decorative quill or book flourish, and a separate subtitle
   strip "The Reforged Realms". Plus a 5-frame sparkle sprite to run across the logo.
8. **Touch control skins**: d-pad, A, B, Menu, Run buttons (normal and pressed), semi-transparent, readable on
   both bright and dark scenes. Button glyphs for prompts: keyboard (Z, X, C, Enter, Esc, Shift), gamepad
   (A, B, X, Y, LB, RB), touch (A, B).
9. **Rarity** beam/sparkle sprites tinted per rarity (Diablo-style drop column, 4 frames).
10. `assets/ui/ui.json` atlas for all non-font pieces; `assets/ui/README.md`.

## Verify
Compose mock screens at 384x216 (render at 3x): (a) a dialogue box at the bottom with a 48x48 portrait slot,
name tab, three lines of text, the more-arrow; (b) a main menu with party status panel and command list with the
cursor; (c) a battle HUD with command window, party status rows with gauges, a timeline, a damage number, a BREAK
burst, and a weakness row. Iterate until it looks like a shipped SNES-era classic with modern clarity. Test
legibility with pangrams and with the longest realistic lines.
