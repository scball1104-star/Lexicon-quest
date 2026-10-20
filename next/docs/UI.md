# UI (W2-ui): windows, dialogue, menus, shops, title, save/load, config, game over, credits

Source of truth: `src/ui/*.js` (each file opens with its API) and the scenes listed below. Art comes from
`assets/ui/*` (see `assets/ui/README.md`); every helper falls back to procedural drawing when the art is
missing, so nothing here can crash a build that lacks it.

## Primitives (`src/ui/`, import from `src/ui/index.js`)

| Module | API |
|---|---|
| `window.js` | `drawWindow(r, x, y, w, h, { scheme, kind: 'std'|'field'|'thin', field, alpha, open: 0..1, tail: { x, dir } })` -> rect. `drawTail`, `drawSelBar(r, x, y, w)`, `drawGauge(r, x, y, w, frac, 'hp'|'mp'|'fury'|'exp'|'atb', { thin, lag, glow })`, `drawLabel(r, 'hp'|'mp'|'fury'|'lv'|'exp'|'next'|'atk'|'def'|'mag'|'spd'|'ready'|'ko', x, y)`, `drawIcon(r, id, x, y, { alpha })` (`icon_<id>` or any ui.json frame), `drawIcon16`, `drawPortrait(r, id, x, y, 48|32)` (thin frame included, false when no art), `drawBanner(r, text, cx, y)`, `drawDivider`, `drawTextMark(r, 'more'|'end', x, y)`, `drawScrollArrow`, `drawPageArrow`, `drawPageDots`, `drawDelta(r, delta, x, y)`, `btn('confirm')` -> `{i:btn_confirm}`, `schemeColors(r, scheme)`, `currentScheme(r)`, `SCHEMES`, `WindowAnim` (6-frame grow from center; instant under `reduceMotion`). |
| `cursor.js` | `drawCursor(r, hotX, hotY)` (fingertip at the hotspot; frame 1 of the art bobs), `drawRowCursor(r, rowX, rowY)`, `cursorHotspotForRow`. |
| `list.js` | `new List({ x, y, w, rows, rowH: 12, columns, colW, columnMajor, items: [{ id, label, icon, right, color, disabled, help }], textX, iconX, align: 'center', cursorDx, cursorDy, onChange, skipDisabled, confirmSfx, cancelSfx, tapMode: 'double'|'single' })`. `update(input, audio)` -> `'confirm'|'cancel'|'pageL'|'pageR'|null`; plays `cursor`, `confirm`, `cancel`, `buzzer`; keyboard, gamepad and touch (tap selects, tap again confirms, drag scrolls; `tapMode: 'single'` confirms on the first tap, used by the name grid). `draw(r, { scheme, cursor, bar, frame, pageDots })`; rows taller than 12 px center their text, icon and bar (`textDy`). `item`, `index`, `moveTo`, `setItems(items, keepIndex)`, `rowRect(i)`, `isVisible(i)`, `pointerRow`, `active`. Disabled rows are landable and buzz (FF style). **`columnMajor` (W7):** with `columns: 2, rows: 4` the first column fills top to bottom, then the second (battle commands, the touch main menu); up / down stay inside a column, left / right keep the row (a missing cell lands on the column's last item); no scrolling; `cellIndex(row, col)`. **Touch rows (W4b, W7):** `TOUCH_ROW_H = 20` (33 css px on the phone profile, where one game px is 5/3 css px; it was 15), `TOUCH_TAP_H = 27` (45 css px, for short standalone menus), `touchUi(engine)` (true while the touch controls show), `rowHeightFor(engine, base)` (base with a keyboard or pad, at least `TOUCH_ROW_H` on touch), `tapRowHeight(engine, base)` (at least `TOUCH_TAP_H` on touch), `rowsThatFit(px, rowH)`. Every menu builds its lists with these and derives `rows` from its window, so lists scroll instead of overflowing. |
| `choice.js` | `ChoiceBox(engine, options, { x, y, anchor, cancel, field })` embedded (touch rows are `tapRowHeight`, 27 px, stepping down while the box would pass 150 px); `ChoiceScene` registered as **`choice`**: `await engine.pushAwait('choice', { options, cancel?: index|false, x?, y?, anchor? })` -> index. `popScene(engine, scene, result)` pops a specific scene (see "below" rule). |
| `dialog.js` | scene **`dialog`** (also `src/scenes/dialog.js`): `await engine.pushAwait('dialog', { who, name?, portrait?, text, choices?, position?: 'top'|'bottom' (default: bottom, flipped to the top by `pickPosition` when the window would hide the speaker's actor or the hero), cancel?, instant?, boxes?, tail? })` -> chosen index or `undefined`. Typewriter with `text_blip_low/mid/high` per speaker (hero mid, Mira high, Bram low, narration silent), 3-line pages, **a window sized to its text (W7: `dialogHeight(lines)` = 7 + 11 per line + 5 px, so 23 / 34 / 45 px, at most 21 % of the 216 px screen; a portrait asks for two lines), the name tab above the window (below it at the top), the 48 px portrait anchored to the screen-side edge and overlapping the far edge**, more/end marks, `{hero}` substitution, name tab from `speakerName(who)`, portrait from the party or `NPCS[who].portrait` when the art exists. `transparent` + `updateBelow`. A dialog pushed within 3 frames of the last one skips the open animation. `say(engine, data)`, `sayLines(engine, [{ who, text }])`. |
| `toast.js` | `installToasts(engine)` (done by `title.js` install) -> `engine.toasts`: `show({ text, icon, icon16, sfx, jingle, frames, beam })`, `received(itemIdOrGearInstance, qty, { jingle: false | id, sfx: false | id, beam: bool, at: [x, y] })`, `gold(n)`, `flash(text)`. Queued top-center strips, 1.5 s, drawn from the engine `postdraw` hook; each returns a Promise. **Rarity (W5):** `toastSpec(item, qty, opts)` (pure, `qa/ui/toast.test.mjs`) maps what is shown and played: the name in its rarity color; common gear and consumables `item_get`, key items `key_item`; magic / rare / legendary / set gear play `RARITIES[r].sfx` (`drop_magic`, `drop_rare`, `drop_legendary`) instead of the jingle, and legendary / set items also get the `beam_<rarity>` sprite rising from screen point `at` (bottom center; the field passes the chest or the leader's feet) for the whole 1.5 s, drawn twice (the second pass additive) so it reads over a lit floor, with its sparkles and a soft flash. |
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
| `menu` | `pushAwait('menu', { page?: 'items'|'tech'|'magic'|'equip'|'status'|'journal'|'config'|'save', member?, instant? })` | `undefined` when closed. Plays `menu_open` / `menu_close`. Quit resets the engine to `title` itself. Save page does not heal (the chapel does that before pushing). Touch layout (`TOUCH_LAYOUT`, W7): the ten commands in two columns of five (column major), 30 px rows (50 css px), the party panel 240 px wide, the gold/time/map box under the commands to y 212, the help line in the bottom of the party panel (no help bar). |
| `shop` | `pushAwait('shop', { shopId })` | `true` when the player leaves. Keeper = the NPC whose `service.id` is the shop. Quantity picker: real arrow glyphs; a tap on an arrow steps the count, elsewhere in the window confirms, outside it cancels. |
| `inn` | `pushAwait('inn', { price, who? })` | `true` after the rest (fade, `inn_rest`, full heal, autosave slot 0), `false` if declined or too poor. |
| `config` | `pushAwait('config')` | `undefined` on cancel. Edits `master music sfx ambience textSpeed battleSpeed autoBattle equipPrompts windowColor alwaysRun reduceMotion touchControls scaleMode` via `engine.setSetting` (`SETTING_KEYS`), plus a "Reset to defaults" action row (asks Reset / Keep mine, then writes `DEFAULT_SETTINGS`). Text speed offers Slow / Normal / Fast / Instant. Battle speed and Auto battle help lines name their in-battle toggles with device glyphs (`{i:btn_pageR}`, `{i:btn_start}`; nothing on touch, which has no such buttons): `ROWS[i].help` may be a function of the engine, read it with `helpFor(row, engine)`. 13 rows at 11 px on desktop; on touch 15 px rows that scroll. A tap on the selected row steps forward, on its left arrow back, inside a slider to that point. |
| `loadGame` | `pushAwait('loadGame', { mode: 'load'|'save' })` | load: sets `engine.game`, `reset('field')`; save: `true` after `save_chime`. Slot 0 (autosave) is listed in load mode. |
| `gameover` | `push('gameover')` (the battle scene does this on defeat) | never returns: Retry (`heal` + `reset('field', lastSafe)`), Load, Title. Rows are `rowHeightFor(engine, 11)` (15 px on touch; the window grows and sits at y 138 so the line under it fits). |
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
  the touch controls show, every list row is at least `TOUCH_ROW_H` (20 px = 33 css px on the 844x390 phone
  profile, where one game px is 5/3 css px; short menus use `TOUCH_TAP_H`, 27 px = 45 css px) and windows derive
  their visible row count from their height; the name entry grid types on a single tap (20 px cells).
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

## W5-systems: the equip prompt, rest flow, Lantern help

- **Equip prompt** (PLAYTEST 3). `game/inventory.js` `equipOffers(g, uidOrInstance)` (pure, `qa/ui/inventory.test.mjs`)
  decides: for each member, the best key the item fits where at least one delta line is positive and the
  role-weighted gain (`weightedGain`, the Optimize weights) beats what is worn; weapon keys are measured with that
  weapon active (`equipDeltaFor`). Offers are sorted best gain first (Iron Pike: Bram; Mirrorguard Mail: Mira,
  then Bram, then the hero). `FieldScene.maybeEquipPrompt(uid)` shows the dialog `Equip the Iron Pike on Bram?`
  with `Yes / Later` (one member) or `Equip the Chain Shirt?` with the names then `Later`; Yes equips through
  `equipGear`, plays `equip` and shows `Bram: {c:green}ATK +7{/c}  {c:green}DEF +1{/c}` (`deltaLine`) in a toast
  (a second weapon type is labelled `Arden (axe):`). It runs after `giveItem` (chests, pots, scenes), `giveGear`
  (random chests) and, for battle drops, after the rewards window and the fade (the battle scene leaves the uids
  in `engine.lastBattleDrops`; `startBattle` consumes them). The Config row **Equip prompts** (`equipPrompts`,
  default on) turns it off.
- **Rest flow.** Fonts, the chapel bell and `rest: true` objects ask `Rest here?` (Rest / Not now) before healing;
  Rest restores HP and MP in full (`state.heal` with the stats provider), sets the game over return point,
  toasts `HP and MP restored.`, then asks `Record your journey here?` (Save / Not now), which opens the menu's
  save page. See `docs/WORLD.md` (events `font`, `save`, `object`).
- **Lantern help.** The Key Items tab's description of the Lantern of Recall ends with `Raise it: {i:btn_pageR}.`
  (keyboard / pad glyph) or `Raise it: the Lantern button.` on touch.
- `python qa/integrate/w5_shots.py [--device desktop,phone] [--only ...]`: drives the real scenes for every item
  above plus the battle touch rows, the Auto / Speed hint, the touch game-over menu and the pit tell; PNGs in
  `qa/integrate/out/`.

## W7-phone-ux: dialogue size, battle commands, the log, touch rows, the bestiary picture

Source: `docs/CRITIQUE_3.md` items 1, 2, 5, 6, 7, 9 (the phone is the bar). Verified by `python qa/ui/phone_ux.py`.

- **Dialogue (item 1).** The window is as tall as the longest page of its box: 1, 2 or 3 lines (`dialogHeight`), never a spare
  fourth. A 3-line window is 45 px, 21 % of the screen (it was a fixed 62 px, 29 %). The name tab sits above the window, the
  48 px portrait stands on the window's screen-side edge and overlaps its far edge (FF6 style), so a portrait does not make
  the window taller (it asks for two lines). `pickPosition(h, actors, prefer)` (pure, node-tested) picks bottom or top:
  the window starts at the bottom and flips to the top (opaque there) when the speaker's actor (`field.actorById(who)`, or
  the one that is `talking`) or the hero (`field.leader`) would be under it (screen span from `field.camera.toScreen`); it
  stays where it is while that still hides nobody (no flicker inside one scene); an explicit `position`, `y` or `rect` wins.
- **Battle commands (item 2).** Two columns of four rows (`layout.CMD_COLS / CMD_ROWS / CMD_COL_W`), column major (Attack,
  Tech, Magic, Fury | Combo, Item, Defend, Swap, Flee): every command is on screen, no scroll arrow. Keyboard: up / down stay in
  the column, left / right keep the row. The command window is 126 px wide; the party status window gives up 34 px
  (`statusRow` packs the HP gauge, the MP block and the Fury gauge tighter). **Touch:** 18 px rows (30 css px,
  `TOUCH_CMD_ROW_H`), the window rises to y 132, and **Flee is a FLEE button in the help window** next to AUTO and x1
  (`HELP_TOUCH_BTNS.flee`): the first tap arms it ("Tap FLEE again to run."), a second tap within a second runs; dim on boss
  fights. That keeps the grid at four rows even for Mira (Magic and Swap). Swap's label is plain "Swap" (its help line names
  the weapon). Keyboard and pad keep Flee in the grid (a ninth command grows the window by one row).
- **Battle log (item 5).** While nobody is choosing a command (enemy turns, the victory and level-up pages) the command window
  shows the last three lines the help window said (`BattleScene.log`, fed by `setHelp`, plus the rewards: EXP and gold,
  drops, "Arden reaches Lv 2", "Mira learns Ember"), the newest at the bottom, older ones dimmer. Nothing is drawn until
  there is a first line, so there is no blank box.
- **Preview glyph (item 6).** The "?" in "18-23 ? 1" was not a missing multiplication sign: it is the unknown-weakness marker,
  followed by the shield count. The tag now draws the same "?" box the enemy row uses (`{i:weak_unknown}`) and the shield
  icon before the count (`{i:icon_shield}1`). The font has both x and the multiply sign (U+00D7); nothing was missing.
- **Touch glyphs and rows (item 7).** Name entry's help line is the A / B tap glyphs and "when done" on touch (no "Enter";
  the keycaps and "or Enter" only on a keyboard; `NameEntryScene.helpText()`). `shots.py` presses keys, which flips the device
  to keyboard, so use `phone_ux.py hints` or real taps to see the touch glyphs. Rows: `TOUCH_ROW_H` 15 -> 20 (33 css px),
  short menus `TOUCH_TAP_H` 27 (45 css px): the touch main menu is two columns of 30 px rows, choice boxes use 27 px rows.
  A ten-row scrolling list cannot be 44 css px on a 216 px screen, so dense data lists stop at 33 css px.
- **Bestiary picture (item 9).** The detail panel has a 92 x 78 picture box (top right) with the enemy's battle sprite
  (`enemies_battle`, or `bosses_battle` for echo_warden, archivore and lost_page; elite variants share a frame and add their
  tint) at the biggest scale of 2, 1, 1/2, 1/3, 1/4 that fits (`fitScale`, nearest neighbour), and a black silhouette on a
  lighter ground for an entry not met yet. The text column is 114 px; the lore starts at y 121 (four to five lines; Left /
  Right or a tap on the lore box scrolls).
- `python qa/ui/phone_ux.py [--only dialog,battle_phone,battle_desktop,battle_mira,battle_log,bestiary,hints]` asserts all of
  the above on the real scenes (taps on the phone profile, arrow keys on the desktop one); PNGs in `qa/ui/out/`
  (`phone-bestiary_sheet0.png`, `phone-battle_commands_phone.png`, `phone-battle_log_*.png`, `phone-name_entry_touch.png`).

## Known gaps

- The battle command menu, its sub-lists and the game-over menu now use `rowHeightFor` on touch (W5); the
  battle help window names Auto and Speed with device glyphs (desktop) or shows three tap buttons, FLEE, AUTO and x1 (touch, W7).

- Field cure items (Antidote, Eye Drops, Echo Herb) refuse on the field because party records carry no
  statuses between battles in Episode 1; they work in battle.
- Tents are refused outside a save point ("Only at a save point"); the world scene owns save-point rests.
- The shop keeper line is a fixed per-kind line; NPC talk lines are shown by the field before pushing `shop`.

## Text padding audit (D6) and colour count (D1)

- `python next/qa/ui/padding.py [--story] [--only a,b] [--device desktop,phone]` measures every window rect against the ink of every text drawn inside it (clipped text and text under a later window are ignored). Rule: 8 px left and right, 6 px top and bottom (a one-line header or help window is 20 to 26 px tall, so 6 is the most a centred line can have), 4 px in thin windows. Exit 1 on any violation.
- `python next/qa/ui/colors.py --limit 150` counts distinct colours of the rendered 384x216 frame for the key-art screens (title, prologue, name entry, credits, title card); the title logo is masked.
- Bestiary lore and the quest list draw only whole lines; Left / Right scroll a taller lore entry.
