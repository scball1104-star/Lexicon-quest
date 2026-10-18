# UI (W2-ui): windows, dialogue, menus, shops, title, save/load, config, game over, credits

Source of truth: `src/ui/*.js` (each file opens with its API) and the scenes listed below. Art comes from
`assets/ui/*` (see `assets/ui/README.md`); every helper falls back to procedural drawing when the art is
missing, so nothing here can crash a build that lacks it.

## Primitives (`src/ui/`, import from `src/ui/index.js`)

| Module | API |
|---|---|
| `window.js` | `drawWindow(r, x, y, w, h, { scheme, kind: 'std'|'field'|'thin', field, alpha, open: 0..1, tail: { x, dir } })` -> rect. `drawTail`, `drawSelBar(r, x, y, w)`, `drawGauge(r, x, y, w, frac, 'hp'|'mp'|'fury'|'exp'|'atb', { thin, lag, glow })`, `drawLabel(r, 'hp'|'mp'|'fury'|'lv'|'exp'|'next'|'atk'|'def'|'mag'|'spd'|'ready'|'ko', x, y)`, `drawIcon(r, id, x, y, { alpha })` (`icon_<id>` or any ui.json frame), `drawIcon16`, `drawPortrait(r, id, x, y, 48|32)` (thin frame included, false when no art), `drawBanner(r, text, cx, y)`, `drawDivider`, `drawTextMark(r, 'more'|'end', x, y)`, `drawScrollArrow`, `drawPageArrow`, `drawPageDots`, `drawDelta(r, delta, x, y)`, `btn('confirm')` -> `{i:btn_confirm}`, `schemeColors(r, scheme)`, `currentScheme(r)`, `SCHEMES`, `WindowAnim` (6-frame grow from center; instant under `reduceMotion`). |
| `cursor.js` | `drawCursor(r, hotX, hotY)` (fingertip at the hotspot; frame 1 of the art bobs), `drawRowCursor(r, rowX, rowY)`, `cursorHotspotForRow`. |
| `list.js` | `new List({ x, y, w, rows, rowH: 12, columns, colW, items: [{ id, label, icon, right, color, disabled, help }], textX, iconX, align: 'center', cursorDx, cursorDy, onChange, skipDisabled, confirmSfx, cancelSfx, tapMode: 'double'|'single' })`. `update(input, audio)` -> `'confirm'|'cancel'|'pageL'|'pageR'|null`; plays `cursor`, `confirm`, `cancel`, `buzzer`; keyboard, gamepad and touch (tap selects, tap again confirms, drag scrolls; `tapMode: 'single'` confirms on the first tap, used by the name grid). `draw(r, { scheme, cursor, bar, frame, pageDots })`; rows taller than 12 px center their text, icon and bar (`textDy`). `item`, `index`, `moveTo`, `setItems(items, keepIndex)`, `rowRect(i)`, `isVisible(i)`, `pointerRow`, `active`. Disabled rows are landable and buzz (FF style). **Touch rows (W4b, C12):** `TOUCH_ROW_H = 15`, `touchUi(engine)` (true while the touch controls show), `rowHeightFor(engine, base)` (base with a keyboard or pad, at least 15 on touch = 25 css px on the phone profile), `rowsThatFit(px, rowH)`. Every menu builds its lists with these and derives `rows` from its window, so lists scroll instead of overflowing. |
| `choice.js` | `ChoiceBox(engine, options, { x, y, anchor, cancel, field })` embedded; `ChoiceScene` registered as **`choice`**: `await engine.pushAwait('choice', { options, cancel?: index|false, x?, y?, anchor? })` -> index. `popScene(engine, scene, result)` pops a specific scene (see "below" rule). |
| `dialog.js` | scene **`dialog`** (also `src/scenes/dialog.js`): `await engine.pushAwait('dialog', { who, name?, portrait?, text, choices?, position?: 'top'|'bottom', cancel?, instant?, boxes?, tail? })` -> chosen index or `undefined`. Typewriter with `text_blip_low/mid/high` per speaker (hero mid, Mira high, Bram low, narration silent), 3-line pages, more/end marks, `{hero}` substitution, name tab from `speakerName(who)`, portrait from the party or `NPCS[who].portrait` when the art exists. `transparent` + `updateBelow`. A dialog pushed within 3 frames of the last one skips the open animation. `say(engine, data)`, `sayLines(engine, [{ who, text }])`. |
| `toast.js` | `installToasts(engine)` (done by `title.js` install) -> `engine.toasts`: `show({ text, icon, icon16, sfx, jingle, frames })`, `received(itemIdOrGearInstance, qty, { jingle: false | id })`, `gold(n)`, `flash(text)`. Queued top-center strips, 1.5 s, drawn from the engine `postdraw` hook; each returns a Promise. |
| `numberPopup.js` | `new NumberPopups()`: `spawn(x, y, value, { kind: 'damage'|'crit'|'heal'|'mp'|'poison'|'gray' })`, `word(x, y, 'MISS'|...)`, `update()`, `draw(r)`, `layout()` (Map entry -> bottom y this frame), `active`, `clear()`. Popups within 14 x 28 px of a live group's anchor form one column per target: each new number lands one slot above the previous (10 px pitch for the small digits, newest on top), word art spawned within 12 frames of a number on the same target attaches 12 px above it (16 over a big crit) and rides its bounce, a word with no number (MISS, BREAK) takes a slot of its own, at most 4 entries per target (a fifth retires the oldest), and the column is relaxed at draw time so nothing overlaps mid-bounce. |
| `help.js` | `drawHelpBar(r, text, { right, y, h, scheme })` (default 4,184,376,28). |
| `party.js` | `drawMemberRow(r, member, x, y, { w, divider, frame })` (57 px FF6 row), `drawMemberLine`, `memberInfo(member)`, `WEAPON_ICON`, `SLOT_ICON`. |
| `keyart.js` | `KeyArt(engine, { backdrop: 'title'|'dialog_keyart', cell, drift, range })`: draws the palette-quantized 384x216 backdrop atlas (`assets/backdrops`, manifest atlases `title` and `dialog_keyart`) 1:1 with a whole-pixel drift of at most 2 px (the exposed strip is the edge column/row replicated, under the vignette), and falls back to the painted 16:9 crop of `environments.webp` when the atlas is missing. `usesBackdrop`, `drawBackdrop(r, id, { ox, oy, dark, vignette })` (false when missing), `drawKeyArt(r, cell, ...)` (the crop), `backdropImage(r, id)`. Title and name entry use `title`; prologue, title cards, credits use `dialog_keyart` (its vignette is baked, so they add only `dark`). Never name a scene field `backdrop`: the engine forwards `scene.backdrop` (an image) to the renderer's letterbox glow. |
| `text.js` | `fillHero`, `fmtGold`, `fmtTime`, `roman`, `paginate(lines, rows, { hard })`, `hardBreaks(text, lines)` (true where the wrapper cut a word across lines; with it `paginate` never ends a page mid-word), `charsPerFrame` (4 = instant), `voiceFor`, `cap`. |
| `stage.js` | `_uiStage`: a stand-in field (key art + party sprites) used when `field` is not registered. |
| `screens/*.js` | Menu sub-screens: items, skills (tech/magic), equip, status, journal (+ bestiary), `common.js` (`MemberPicker`, `drawMemberHeader`, `drawTabs`). |

## Scenes (registry names)

| Name | Push | Resolves |
|---|---|---|
| `title` | boot | New Game -> `nameEntry`; Continue -> `loadGame`; Config -> `config`; 20 s idle -> prologue attract and back. |
| `nameEntry` | `replace` from title | `createGame(name)` on `engine.game`, then `replace('prologue')`. Keyboard typing via `input.startText()`. |
| `prologue` | `{ attract? }` | cards from `PROLOGUE`; confirm advances, start skips; then `reset('field', { map: START_MAP, x, y, dir })` (or the UI stage). |
| `titleCard` | `pushAwait('titleCard', { text, sub, frames, backdrop?: id | false, bg? })` | `true` when gone (confirm/start cuts the hold). Draws `dialog_keyart` darkened under the text (flat `bg` when `backdrop: false` or the atlas is missing). |
| `dialog`, `choice` | see above | index / undefined |
| `menu` | `pushAwait('menu', { page?: 'items'|'tech'|'magic'|'equip'|'status'|'journal'|'config'|'save', member?, instant? })` | `undefined` when closed. Plays `menu_open` / `menu_close`. Quit resets the engine to `title` itself. Save page does not heal (the chapel does that before pushing). Touch layout (`TOUCH_LAYOUT`): 15 px command rows, the command window reaches y 166, the gold/time box sits under it to y 212, the help line and map title move into the bottom of the party panel (no help bar). |
| `shop` | `pushAwait('shop', { shopId })` | `true` when the player leaves. Keeper = the NPC whose `service.id` is the shop. Quantity picker: real arrow glyphs; a tap on an arrow steps the count, elsewhere in the window confirms, outside it cancels. |
| `inn` | `pushAwait('inn', { price, who? })` | `true` after the rest (fade, `inn_rest`, full heal, autosave slot 0), `false` if declined or too poor. |
| `config` | `pushAwait('config')` | `undefined` on cancel. Edits `master music sfx ambience textSpeed battleSpeed autoBattle windowColor alwaysRun reduceMotion touchControls scaleMode` via `engine.setSetting` (`SETTING_KEYS`), plus a "Reset to defaults" action row (asks Reset / Keep mine, then writes `DEFAULT_SETTINGS`). Text speed offers Slow / Normal / Fast / Instant. Battle speed and Auto battle help lines name their in-battle toggles with device glyphs (`{i:btn_pageR}`, `{i:btn_start}`; nothing on touch, which has no such buttons): `ROWS[i].help` may be a function of the engine, read it with `helpFor(row, engine)`. 13 rows at 11 px on desktop; on touch 15 px rows that scroll. A tap on the selected row steps forward, on its left arrow back, inside a slider to that point. |
| `loadGame` | `pushAwait('loadGame', { mode: 'load'|'save' })` | load: sets `engine.game`, `reset('field')`; save: `true` after `save_chime`. Slot 0 (autosave) is listed in load mode. |
| `gameover` | `push('gameover')` (the battle scene does this on defeat) | never returns: Retry (`heal` + `reset('field', lastSafe)`), Load, Title. |
| `credits` | `push('credits')` / `pushAwait` | pops `true` after the last card has held centered for 4 s (start skips, confirm hurries). Plays `triumph`; `debugState()` reports `music`, `holdT`, `lastCardBottom`. |

## Rules every scene follows

- **The `below` rule.** `dialog`, `choice` and `inn` are `updateBelow`, so the scene under them keeps
  animating. The engine updates that lower scene FIRST in the same frame and passes `update(dt, below = true)`.
  A field scene must not read input while `below` is true, or the confirm that closes a dialog also fires
  an interaction. The UI scenes pop themselves specifically (`popScene`) so a scene pushed underneath during
  that frame can never be popped by mistake.
- Every list move plays `cursor`, confirm `confirm`, back `cancel`, invalid `buzzer`; `equip`, `buy`,
  `coin`, `save_chime`, `menu_open/close`, `text_blip_*`, `heal`, `item_use`, `revive` where they belong.
- Nothing strands the player: every screen leaves on `cancel`; disabled rows can be landed on but buzz.
- Touch: tap = select, tap the selected row = confirm, drag scrolls, tap on a dialog advances, B = cancel. While
  the touch controls show, every list row is at least `TOUCH_ROW_H` (15 px = 25 css px on the 844x390 phone
  profile, where one game px is 5/3 css px) and windows derive their visible row count from their height;
  the name entry grid types on a single tap (15 px cells).
- Dialogue pages end on word boundaries: lines wrap on words and `paginate` (with `hardBreaks`) never ends a
  page on a cut word. The typewriter may show a part-word only while it is still typing.
- `{hero}` is substituted from `engine.game.heroName` in every dialog name/text, menu, credits and journal.

## Debug and QA

`LQ_DEBUG.newGame(name, { scene: 'field'|'stage'|'prologue'|'none', party: ['mira','bram'], level, gold, items,
gear, flags, hp (fraction), fury, playtime, map, banner })`, `LQ_DEBUG.give(itemId, qty)` (gear ids add instances),
`LQ_DEBUG.uiStage(data)`, `LQ_DEBUG.toast(text, icon)`.

- `node qa/run.mjs ui`: `qa/ui/inventory.test.mjs` (equip/unequip/optimize/sell/use), `qa/ui/primitives.test.mjs`
  (List navigation and tap model, touch row helpers, text helpers, page boundaries, schemes, portraits, popup
  stacking, config rows, and a scan of every story string with the real font metrics: no word is wider than
  the dialog column).
- `python qa/ui/paths.py`: drives the real scenes headlessly (menu and every sub-screen, dialog choices, shop,
  inn, title -> name entry -> prologue, game over, credits, title card) and asserts the scene stack after
  every press; zero console errors.
- `python qa/ui/polish.py`: real taps on the phone profile (title tap-select / tap-confirm, main menu touch
  layout, config taps and Reset to defaults, shop quantity arrows, one-tap name entry), text speed Instant,
  credits end on the phone (triumph playing, last card inside the screen), and a battle popup column with a
  zoomed PNG. Screenshots in `qa/ui/out/`.
- `python qa/shots.py --only ui_title,...`: the `ui_*` shots in `qa/shots.json` (desktop + phone).

## Known gaps

- Touch row heights cover the UI module's lists only. The battle command menu (`src/battle/scene`) and the
  game-over menu (`scenes/gameover.js`, 11 px rows) belong to other agents and still use keyboard-sized rows.
- The battle help window does not say that Start toggles Auto and Q/E (LB/RB) toggle the speed; the Config
  help lines do. Proposal for the battle scene: when idle with the command menu open and no telegraph, append
  `{i:btn_start} Auto  {i:btn_pageR} Speed` to the right of the help text.

- Field cure items (Antidote, Eye Drops, Echo Herb) refuse on the field because party records carry no
  statuses between battles in Episode 1; they work in battle.
- Tents are refused outside a save point ("Only at a save point"); the world scene owns save-point rests.
- The shop keeper line is a fixed per-kind line; NPC talk lines are shown by the field before pushing `shop`.
