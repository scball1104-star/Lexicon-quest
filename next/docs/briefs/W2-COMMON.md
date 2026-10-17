# Wave 2 common notes (read after COMMON.md and DESIGN.md)

Wave 1 delivered the foundations. Read the docs for the pieces you build on; they are the contracts:

- Engine: `next/docs/ENGINE_API.md` and the reference scenes `src/scenes/_devTitle.js`, `_devField.js`, `_devGallery.js`, `_devUi.js`.
- UI art: `next/assets/ui/README.md` (fonts, window skin, icons, battle HUD pieces, emotes, logo, touch skins).
- Audio: `next/assets/audio/README.md` (every sfx/jingle/music id and its intent) and `src/core/audio.js` header.
- Battle rules and data: `next/docs/BATTLE.md` (section 7 is the scene API; section 6 is map placement plans).
- Story: `next/docs/story/STAGING.md` (section 1 = exact cutscene API the scripts call; sections 2 to 5 = what
  maps must contain) and `next/docs/story/EPISODE1.md`.
- Tiles: `next/assets/tiles/README.md` + `tiles.json`. Sprites: `next/assets/sprites/README.md` + atlases.
- Game state: `src/game/state.js` (flags, party, items, gear, position, save). Everyone reads `engine.game`.
- Scene registry: `src/scenes/registry.js` (orchestrator-owned) lazily imports `src/scenes/<name>.js` for the
  names listed there. Create your scene file under its agreed name with a default export (class or factory);
  optional `export async function install(engine)` for debug commands. Do not edit the registry.
- Manifest: after adding assets run `node next/qa/core/sync-manifest.mjs`.
- Tests: `node next/qa/run.mjs` must stay green. Screenshots: add shots to `qa/shots.json` only for your scenes
  (the file is shared; append entries, never remove others) and run `python next/qa/shots.py --only <names>`.

## Cross-agent interfaces for this wave

| Interface | Owner | Users |
|---|---|---|
| `src/ui/window.js` (`drawWindow(r, x,y,w,h,{scheme,field,tail})`), `src/ui/dialog.js` (`engine.pushAwait('dialog', {who, name, portrait, text, choices?})` -> index or undefined), `src/ui/choice.js`, `src/ui/list.js` (menu list with cursor, repeat scrolling), `src/ui/numberPopup.js`, `src/ui/toast.js` ("Received Potion x2" style) | W2-ui (deliver these FIRST, within your first hour, then message w2-world and w2-battle) | world, battle |
| Field scene + cutscene runner implementing STAGING.md section 1 against `engine.game` | W2-world | maps, ui (menu opens from field), battle (field pushes battle) |
| `engine.pushAwait('battle', {encounterId, start, boss, canFlee})` -> `'win' | 'lose' | 'flee'`; applies rewards to `engine.game` | W2-battle-scene | world |
| `engine.pushAwait('menu')`, `('shop', {shopId})`, `('inn', {price})`, `('titleCard', {text, sub, frames})`, `('gameover')`, `('credits')` | W2-ui | world |
| Map modules `src/data/maps/<id>.js` per DESIGN 5.1 (+ `marks`), validated by `qa/maps` | W2-maps | world |
| Debug: `LQ_DEBUG.warp(mapId, x, y)` (world), `LQ_DEBUG.battle(encId)` (battle), `LQ_DEBUG.give(id, qty)`, `LQ_DEBUG.setFlag(flag, v)` (world), `LQ_DEBUG.newGame(name)` (ui) | as listed | shots.py |

Message the owner (SendMessage to `w2-ui`, `w2-world`, `w2-battle`, `w2-maps`) when you need an interface
detail decided; do not guess silently and do not edit their files. Keep messages short and concrete.
