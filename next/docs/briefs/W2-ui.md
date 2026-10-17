# W2-ui: windows, dialogue, menus, shops, title, name entry, save/load, config, game over, credits

**Owned paths:** `next/src/ui/**`, `next/src/scenes/{title,nameEntry,prologue,titleCard,dialog,menu,shop,inn,
config,loadGame,gameover,credits}.js`, `next/src/game/inventory.js`, `next/qa/ui/**`, `next/docs/UI.md`.

The bar: Final Fantasy VI and Chrono Trigger menus. Fast, readable, consistent, satisfying sounds on every
cursor move, zero dead ends, works with keyboard, gamepad and touch (tap = select; tap selected = confirm;
swipe lists; B button = cancel).

## Deliver first (other agents are waiting): `src/ui/`
1. `window.js`: FF window per `assets/ui/README.md` (gradient fill inset, 9-slice frame, 6 schemes from
   `settings.windowScheme`, field variant alpha 0.92, speech tails). Open/close animation: 6-frame grow from
   center (skippable under reduceMotion).
2. `dialog.js` + scene `dialog`: bottom dialogue window (DESIGN 6.4 mock in `tools/art/ui/out/mock_dialogue_3x.png`):
   name tab, 48x48 portrait at left when given, typewriter text with per-character `text_blip` (3 pitches by
   speaker: hero mid, Mira high, Bram low, others mid; narration silent), confirm skips to full text then
   advances; auto page breaks (3 lines x 42 chars via `r.wrap`); the "more" arrow; `{hero}` substitution from
   `engine.game.heroName`; choices rendered as a small window above the dialog with the glove cursor; resolves
   `pushAwait` with the chosen index (cancel = last option) or undefined. Supports `position: 'top'` for scenes
   where the speaker is low on screen. `transparent` and `updateBelow` true so the field keeps animating.
3. `choice.js` (standalone choice window), `list.js` (generic vertical list: cursor, repeat-scroll, page
   indicators, disabled rows, columns, optional icons, `onChange` for help text), `cursor.js` (glove with bob),
   `numberPopup.js` (bouncing numbers using `font_num`), `toast.js` (top-center "Received Potion x2" strip with
   icon, queued, 1.5 s, jingle hook), `help.js` (bottom help bar).
   Then **message `w2-world` and `w2-battle`** with the exact signatures.

## Then the scenes
4. `title.js`: logo with sparkle anim, key art backdrop (`../assets/art/environments.webp` cell 0 via
   `r.image` crop, with a slow 1 px/s drift and a dark vignette), menu New Game / Continue (disabled when no
   saves) / Config, version string, `title` music, press-start attract: after 20 s idle fade to the prologue cards
   and back. `LQ_DEBUG.newGame(name)` jumps straight into a new game.
5. `nameEntry.js`: FF-style name entry grid (A-Z a-z 0-9 space, back, done), default "Hero", 8 chars, keyboard
   typing supported (`input.startText`), confirm sound; result -> `createGame(name)` set on `engine.game`,
   then `prologue`.
6. `prologue.js` + `titleCard.js`: full-screen title cards over slowly moving key art (text from
   `data/story/ep1.js` `PROLOGUE`), fade between cards, confirm advances, `start` skips all; then push `field`
   at `START_MAP/START_POS` and run the `wake_up` trigger (the world scene handles `on:'enter'` triggers).
7. `menu.js`: the field main menu (mock `mock_menu_3x.png`): left panel = party rows (portrait 32x32, name,
   weapon icon, Lv, HP/MP/Fury/NEXT gauges, status badges), right = commands Items, Tech, Magic, Equip, Status,
   Journal, Talk, Config, Save, plus gold/time/letters/chapter box, help bar. Sub-screens:
   - Items: consumables with qty and descriptions, use on a member (heal/cure/revive), key items tab.
   - Tech/Magic: per member, known skills (`knownSkills`), MP cost, help text; field-usable heals castable.
   - Equip (mock `mock_equip_3x.png`): slots weapon A/B, body, head, charm, boots, mantle; candidate list from
     `engine.game.gear` filtered by `canEquip`; stat deltas with green/red arrows via `equipDelta`; rarity-colored
     names; Optimize and Remove All; set bonus display.
   - Status: full stats, mastery per weapon with bars and next unlock, active statuses, EXP to next.
   - Journal: main quest step text + active side quests via `quests.js journal()`, bestiary tab (`text.js
     BESTIARY` + `engine.game.bestiary`: seen/killed counts, known weaknesses as icons).
   - Talk (Chrono Trigger style): `partyChat(hasFlag, engine.game.map)` shows the companion hint with portraits.
   - Config: music/sfx/ambience/master sliders, text speed, battle speed, auto-battle default, window scheme
     (live preview), always-run, reduce motion, touch controls, scale mode; persist via `engine.setSetting`.
   - Save: 3 slots with meta (name, level, map banner, playtime, chapter), confirm overwrite, `save` jingle.
     Saving is allowed anywhere on the field (DESIGN modern QoL) and the chapel bell is a full-heal save point.
8. `shop.js` (`{shopId}` -> `shops.js shopStock(id, flags)`): Buy/Sell/Leave, quantity picker, "can equip" and
   stat-delta hints per member, `buy`/`coin` sounds, keeper line from `npcs.js`. `inn.js` (`{price}`): confirm,
   fade, `inn_rest` jingle, full heal, autosave slot 0.
9. `loadGame.js` (Continue): slot list -> `deserialize` -> push `field` at saved map/pos. `gameover.js`:
   `GAMEOVER` text, `gameover_sting`, options Retry (reload lastSafe with full HP) / Load / Title.
   `credits.js`: scrolling `CREDITS` with `triumph` music then the `ep1_complete` return per STAGING.md.
10. `src/game/inventory.js`: equip/unequip/swap helpers that move instances between `engine.game.gear` and
    `member.equip`, sell, optimize, and `useItemOnMember` for field use (mirrors battle item effects).

## Verify
Shots for every screen (desktop + phone) in `qa/shots.json` driven through `LQ_DEBUG.newGame` and
`LQ_DEBUG.push`; view them. Unit tests for inventory helpers, wrap/paging logic, name cleaning, and that every
menu command has a working cancel path (drive the real scenes headlessly through `LQ_DEBUG.press`).
Sounds on every move/confirm/cancel/buzzer. Nothing may ever strand the player without a cancel.
