# UI (W2-ui): windows, dialogue, menus, shops, title, save/load, config, game over, credits

Source of truth: `src/ui/*.js` (each file opens with its API) and the scenes listed below. Art comes from
`assets/ui/*` (see `assets/ui/README.md`); every helper falls back to procedural drawing when the art is
missing, so nothing here can crash a build that lacks it.

## Primitives (`src/ui/`, import from `src/ui/index.js`)

| Module | API |
|---|---|
| `window.js` | `drawWindow(r, x, y, w, h, { scheme, kind: 'std'|'field'|'thin', field, alpha, open: 0..1, tail: { x, dir } })` -> rect. `drawTail`, `drawSelBar(r, x, y, w)`, `drawGauge(r, x, y, w, frac, 'hp'|'mp'|'fury'|'exp'|'atb', { thin, lag, glow })`, `drawLabel(r, 'hp'|'mp'|'fury'|'lv'|'exp'|'next'|'atk'|'def'|'mag'|'spd'|'ready'|'ko', x, y)`, `drawIcon(r, id, x, y, { alpha })` (`icon_<id>` or any ui.json frame), `drawIcon16`, `drawPortrait(r, id, x, y, 48|32)` (thin frame included, false when no art), `drawBanner(r, text, cx, y)`, `drawDivider`, `drawTextMark(r, 'more'|'end', x, y)`, `drawScrollArrow`, `drawPageArrow`, `drawPageDots`, `drawDelta(r, delta, x, y)`, `btn('confirm')` -> `{i:btn_confirm}`, `schemeColors(r, scheme)`, `currentScheme(r)`, `SCHEMES`, `WindowAnim` (6-frame grow from center; instant under `reduceMotion`). |
| `cursor.js` | `drawCursor(r, hotX, hotY)` (fingertip at the hotspot; frame 1 of the art bobs), `drawRowCursor(r, rowX, rowY)`, `cursorHotspotForRow`. |
| `list.js` | `new List({ x, y, w, rows, rowH: 12, columns, colW, items: [{ id, label, icon, right, color, disabled, help }], textX, iconX, align: 'center', cursorDx, cursorDy, onChange, skipDisabled, confirmSfx, cancelSfx })`. `update(input, audio)` -> `'confirm'|'cancel'|'pageL'|'pageR'|null`; plays `cursor`, `confirm`, `cancel`, `buzzer`; keyboard, gamepad and touch (tap selects, tap again confirms, drag scrolls). `draw(r, { scheme, cursor, bar, frame, pageDots })`. `item`, `index`, `moveTo`, `setItems(items, keepIndex)`, `rowRect(i)`, `pointerRow`, `active`. Disabled rows are landable and buzz (FF style). |
| `choice.js` | `ChoiceBox(engine, options, { x, y, anchor, cancel, field })` embedded; `ChoiceScene` registered as **`choice`**: `await engine.pushAwait('choice', { options, cancel?: index|false, x?, y?, anchor? })` -> index. `popScene(engine, scene, result)` pops a specific scene (see "below" rule). |
| `dialog.js` | scene **`dialog`** (also `src/scenes/dialog.js`): `await engine.pushAwait('dialog', { who, name?, portrait?, text, choices?, position?: 'top'|'bottom', cancel?, instant?, boxes?, tail? })` -> chosen index or `undefined`. Typewriter with `text_blip_low/mid/high` per speaker (hero mid, Mira high, Bram low, narration silent), 3-line pages, more/end marks, `{hero}` substitution, name tab from `speakerName(who)`, portrait from the party or `NPCS[who].portrait` when the art exists. `transparent` + `updateBelow`. A dialog pushed within 3 frames of the last one skips the open animation. `say(engine, data)`, `sayLines(engine, [{ who, text }])`. |
| `toast.js` | `installToasts(engine)` (done by `title.js` install) -> `engine.toasts`: `show({ text, icon, icon16, sfx, jingle, frames })`, `received(itemIdOrGearInstance, qty, { jingle: false | id })`, `gold(n)`, `flash(text)`. Queued top-center strips, 1.5 s, drawn from the engine `postdraw` hook; each returns a Promise. |
| `numberPopup.js` | `new NumberPopups()`: `spawn(x, y, value, { kind: 'damage'|'crit'|'heal'|'mp'|'poison'|'gray' })`, `word(x, y, 'MISS'|...)`, `update()`, `draw(r)`, `active`, `clear()`. |
| `help.js` | `drawHelpBar(r, text, { right, y, h, scheme })` (default 4,184,376,28). |
| `party.js` | `drawMemberRow(r, member, x, y, { w, divider, frame })` (57 px FF6 row), `drawMemberLine`, `memberInfo(member)`, `WEAPON_ICON`, `SLOT_ICON`. |
| `keyart.js` | `KeyArt(engine, { cell, drift, range })`: painted key art cropped 16:9 with slow drift and a vignette (`drawKeyArt`). |
| `text.js` | `fillHero`, `fmtGold`, `fmtTime`, `roman`, `paginate`, `charsPerFrame`, `voiceFor`, `cap`. |
| `stage.js` | `_uiStage`: a stand-in field (key art + party sprites) used when `field` is not registered. |
| `screens/*.js` | Menu sub-screens: items, skills (tech/magic), equip, status, journal (+ bestiary), `common.js` (`MemberPicker`, `drawMemberHeader`, `drawTabs`). |

## Scenes (registry names)

| Name | Push | Resolves |
|---|---|---|
| `title` | boot | New Game -> `nameEntry`; Continue -> `loadGame`; Config -> `config`; 20 s idle -> prologue attract and back. |
| `nameEntry` | `replace` from title | `createGame(name)` on `engine.game`, then `replace('prologue')`. Keyboard typing via `input.startText()`. |
| `prologue` | `{ attract? }` | cards from `PROLOGUE`; confirm advances, start skips; then `reset('field', { map: START_MAP, x, y, dir })` (or the UI stage). |
| `titleCard` | `pushAwait('titleCard', { text, sub, frames })` | `true` when gone (confirm/start cuts the hold). |
| `dialog`, `choice` | see above | index / undefined |
| `menu` | `pushAwait('menu', { page?: 'items'|'tech'|'magic'|'equip'|'status'|'journal'|'config'|'save', member?, instant? })` | `undefined` when closed. Plays `menu_open` / `menu_close`. Quit resets the engine to `title` itself. Save page does not heal (the chapel does that before pushing). |
| `shop` | `pushAwait('shop', { shopId })` | `true` when the player leaves. Keeper = the NPC whose `service.id` is the shop. |
| `inn` | `pushAwait('inn', { price, who? })` | `true` after the rest (fade, `inn_rest`, full heal, autosave slot 0), `false` if declined or too poor. |
| `config` | `pushAwait('config')` | `undefined` on cancel. Edits `master music sfx ambience textSpeed battleSpeed autoBattle windowColor alwaysRun reduceMotion touchControls scaleMode` via `engine.setSetting`. |
| `loadGame` | `pushAwait('loadGame', { mode: 'load'|'save' })` | load: sets `engine.game`, `reset('field')`; save: `true` after `save_chime`. Slot 0 (autosave) is listed in load mode. |
| `gameover` | `push('gameover')` (the battle scene does this on defeat) | never returns: Retry (`heal` + `reset('field', lastSafe)`), Load, Title. |
| `credits` | `push('credits')` / `pushAwait` | pops `true` after the last card (start skips, confirm hurries). |

## Rules every scene follows

- **The `below` rule.** `dialog`, `choice` and `inn` are `updateBelow`, so the scene under them keeps
  animating. The engine updates that lower scene FIRST in the same frame and passes `update(dt, below = true)`.
  A field scene must not read input while `below` is true, or the confirm that closes a dialog also fires
  an interaction. The UI scenes pop themselves specifically (`popScene`) so a scene pushed underneath during
  that frame can never be popped by mistake.
- Every list move plays `cursor`, confirm `confirm`, back `cancel`, invalid `buzzer`; `equip`, `buy`,
  `coin`, `save_chime`, `menu_open/close`, `text_blip_*`, `heal`, `item_use`, `revive` where they belong.
- Nothing strands the player: every screen leaves on `cancel`; disabled rows can be landed on but buzz.
- Touch: tap = select, tap the selected row = confirm, drag scrolls, tap on a dialog advances, B = cancel.
- `{hero}` is substituted from `engine.game.heroName` in every dialog name/text, menu, credits and journal.

## Debug and QA

`LQ_DEBUG.newGame(name, { scene: 'field'|'stage'|'prologue'|'none', party: ['mira','bram'], level, gold, items,
gear, flags, hp (fraction), fury, playtime, map, banner })`, `LQ_DEBUG.give(itemId, qty)` (gear ids add instances),
`LQ_DEBUG.uiStage(data)`, `LQ_DEBUG.toast(text, icon)`.

- `node qa/run.mjs ui`: `qa/ui/inventory.test.mjs` (equip/unequip/optimize/sell/use), `qa/ui/primitives.test.mjs`
  (List navigation, text helpers, schemes, portraits, popups, config rows).
- `python qa/ui/paths.py`: drives the real scenes headlessly (menu and every sub-screen, dialog choices, shop,
  inn, title -> name entry -> prologue, game over, credits, title card) and asserts the scene stack after
  every press; zero console errors.
- `python qa/shots.py --only ui_title,...`: the `ui_*` shots in `qa/shots.json` (desktop + phone).

## Known gaps

- Field cure items (Antidote, Eye Drops, Echo Herb) refuse on the field because party records carry no
  statuses between battles in Episode 1; they work in battle.
- Tents are refused outside a save point ("Only at a save point"); the world scene owns save-point rests.
- The shop keeper line is a fixed per-kind line; NPC talk lines are shown by the field before pushing `shop`.
