# World: the field scene, maps on screen, events, cutscenes

Owner: W2-world. Code: `src/world/*`, `src/scenes/field.js`, `src/game/story.js`. Tests: `qa/world/`.
Benchmarks: Chrono Trigger (snappy grid walk, party caterpillar, no HUD), Lufia II (visible enemies that
step when you step, blocks, plates, switches, keys, dark rooms), Secret of Mana (lush, alive).

## 1. How the field runs

```
engine.push('field', { map, x, y, dir })        // or { map, mark: 'bed', lighting: 'day' }
engine.push('field')                            // reads engine.game.map / engine.game.pos (load game)
```

Per logic frame (`FieldScene.update`): actors interpolate (16 px per step; 12 frames walking, 8 running,
18 slow), sliding props, leader arrival (doors, exits, pits, step triggers), NPC and enemy brains, player
input (only when no cutscene lock, no transition, and the field is the top scene), the faced-interactable
prompt, the Lantern timer, camera, lighting, particles, banner, and the `ep1_complete` credits handoff.

Draw order: ground layer (terrain autotiles, walls, legend tiles, decor tiles, overlays, building bases),
sign fades, low particles, y-sorted props and actors (feet row; ties: props, followers, leader), overhead
layer (building ridges, `overhead` tiles), lighting (tint multiply, darkness with banded light stamps,
warm glows, the Lantern glow), high particles, emotes, the interaction prompt, the cutscene fade, banner.

Input on the field: directions walk, `run` (or `cancel` on a keyboard) runs unless `alwaysRun`, `confirm`
interacts with the faced tile (across counters), `menu` pushes the menu, `pageR` raises the Lantern of Recall.
Under a dialog (`updateBelow`) the field animates but reads no input.

## 2. Map module vocabulary (DESIGN 5.1 plus)

Top level: `id name area music ambience lighting{tint,dark,lights[]} under underMap legend ground overlays
decor overhead events exits marks start weather weatherZone pitTo`.

- `legend` values: terrains (A2 autotiles layered by `terrainOrder`; A1 water/ink animate at 220 ms),
  `<wall>_top` / `<wall>_face`, plain tiles, line16 tiles (fences, counters), object ids (placed at the cell).
  `' '` with no legend entry is void (solid, drawn dark). `under` is the terrain beneath walls and plain tiles.
- `overlays [{t,x,y}]`: decal tiles drawn after the cell; a terrain id here is a terrain patch (carpets).
  An overlay's collision code replaces the cell's, on every cell a tall tile covers (a 32x32 door over
  cliff faces makes its four cells walkable).
- `decor [{t,x,y,state?,w?,h?}]`: tiles.json objects (anchor = bottom-left footprint tile), props.json
  objects (x,y = left footprint tile, bottom row), or plain tiles repeated w by h. Buildings and pieces go
  into the cached layers (base rows below actors, `overheadRows` above); everything else is a y-sorted prop.
- `overhead [{t,x,y}]`: plain tiles drawn above actors.
- `exits [{x,y,w,h,to}]`: map edges (wipe in the travel direction).
- `marks {name:[x,y]}`: named tiles for cutscenes. `start {x,y,dir}`: default warp spot.
- `weather: 'rain'` (+ `weatherZone {x,y,w,h}`), `pitTo [map,x,y,dir]` for `pit` terrain.

Collision codes: `none solid water ledge_s ledge_e ledge_w pit counter`. Ledges may be entered only in
their direction, by the party, as a hop. Pits swallow the party (fall to `pitTo`) and repel NPCs/enemies.
Counters block but talking reaches across them.

### Events `{ id, type, x, y, w?, h?, if?, ifNot? }` (`if`/`ifNot`: flags; the entity exists only while they hold)

| type | fields | behaviour |
|---|---|---|
| `npc` | `sprite? dir? solid?` | id = `npcs.js` id; sprite, presence (`show`), movement (`moveFor`) and talk (`talkTo`) come from the data. Lines open the dialog with the NPC's portrait; a `scene` runs the cutscene; `service` pushes `shop`/`inn` after the lines. Faces the player while talking. |
| `actor` | `sprite dir solid? ghost? text? script?` | scripted sprite (echo_warden, archivore, ink readers). `ghost` = ink-tinted, 55% alpha, non-solid. |
| `door` | `to:[map,x,y,dir] kind:'door'|'stairs' sprite?` | fires when stepped on. Doors fade (door_open / door_close), stairs iris on the player. Same-map targets fade short with no music change. A flag-gated door opens `*_closed` tiles under it when it appears. |
| `chest` | `tier item? qty? gold? flag? ilvl?` | one-shot via `engine.game.opened`; `item` gives it (toast + item_get / key_item jingle), `gold` adds gold, neither rolls `rollChest(rng, tier, ilvl)` into `gear`. |
| `sign` | `text tile? fade? dir? lantern?` | `text` is an `ep1.js` lines id. `fade: 'shop'|'inn'|'square'|'gate'` washes the painted sign while `signs_fading` (gate: half after `left_town`), restored after `archivore_defeated`. `lantern: true` reads only once a `*_revealed` id is on or beside the cell. |
| `book` | `book` | `BOOKS` title then pages. |
| `object` | `sprite script? text? state? solid?` | inspectable prop; `script` runs a scene, `text` shows lines. `prop_letter` / `prop_ferry_bell` glint. |
| `trigger` | `script on:'enter'|'step'|'interact'` | `enter` runs after the fade-in; `step` when the leader arrives (also on the landing tile of a transfer); scenes guard themselves. |
| `enemy` | `sprite encounter move:'wander'|'patrol'|'chase'|'guard' path? radius?` | dungeons: one step per player step; field: own clock. Contact pushes `battle` with `preemptive` (touched from behind) / `ambush` (caught from behind). Won: gone until re-entry (dungeon) or 60 s (field). Fled: it sits still 2 s and the party backs off a tile. |
| `switch` | `target state kind:'floor'|'crystal' color? hidden?` | `confirm` while facing toggles it (crystal_hit / switch_on) and fires every target. `hidden` (ink) switches work only after the Lantern reveals them. |
| `plate` | `target` | down while a block, the party or any actor stands on it. |
| `block` | | push block: walking into it slides it one tile when the far tile is open floor (block_push). Resets on re-entry. |
| `gate` | `sprite:'door_locked'|'door_key'|'door_boss' state to?` or `cells closed open` | opens when every switch/plate/brazier naming it is on (AND); `to` makes the open door a transfer from its doorway cell. |
| `locked_door` | `key sprite to` | locked (door_locked sfx) until the key is carried; `archive_key` is consumed. Open state persists. |
| `shelf` | `sprite positions state` | a target: slides between positions (shelf_move), collision follows. |
| `brazier` | `lit flag? persist? target?` | confirm lights it (brazier_light, becomes a light source). |
| `font` | `sprite? text?` | Keeper's font: full heal. `save` | | chapel bell: lines, full heal, `save` jingle, `menu {page:'save'}`. |
| `ferry` | `to text rideIf` | reads `text`; with `rideIf` set, offers the ride (ferry fade). |
| `pot` | `item? qty? gold? sprite?` | breakable (pot_break, shards), solid until broken, respawns on re-entry. |
| `light` | `r color?` | extra light source. `pit` | `w h to` | drop area. |

Mechanism events draw themselves (tile ids like `plate_up` go into the ground layer; object ids become props).

## 3. Cutscene API (`src/world/cutscene.js`)

Exactly STAGING.md section 1: `lockInput unlockInput say choice walk face jump emote wait camera.panTo
camera.follow shake flash fade tint music sfx spawn despawn setFlag hasFlag give take battle addMember title`.
`walk(who, path)` with a direction list forces the steps; with a mark / event / actor name it pathfinds
(`pathfind.js`, actors as obstacles, the goal's neighbour for actors and solid events). Followers trail when
`hero` walks. `say` uses `pushAwait('dialog')`; `choice` re-pushes the last box with `choices` (CT look).
`give`/`take` play the jingle and the toast. `battle` pushes the battle scene. `addMember` joins the chain
and plays `party_join`. Every primitive resolves on game time, so `LQ_DEBUG.setSpeed(4)` speeds scenes up;
`Cutscene.cancel()` (field exit) resolves whatever is pending.

Visual flag states handled in the field: sign fades (`signs_fading`, `left_town`, `archivore_defeated`),
NPC presence and movement (`npcs.js show / moveFor`, refreshed on every `setFlag`), flag-gated events, the
Willowmere ink cast while names fade, and the `ep1_complete` handoff: push `credits`, then reload `hero_home`
at `bed` in day light.

## 4. Debug and QA

`LQ_DEBUG.warp(mapId, x, y, dir)`, `setFlag(flag, v)`, `give(id, qty)`, `party('mira','bram')`,
`call('scene', id)` (runs a cutscene; `LQ_DEBUG.scene()` itself is the engine's top-scene query), `lantern()`,
`walk('up,up,left', run)`, `goto(x, y, run)` (pathfinds), `fieldState()`.

- `node qa/run.mjs world`: autotile cases, pathfinding, collision and ledge rules, follower chain, enemy
  step rule, gate AND logic, and the headless walks (`qa/world/walks.py`, every map, zero console errors).
- `python qa/world/fieldlab.py --map valley --x 10 --y 30 --shot valley` or `--script steps.json`: boots
  headless, drives the field, saves the 384x216 frame at 3x in `qa/world/out/`.
- `python qa/shots.py --only field_town_morning,field_town_signs_fading,field_valley_wildlife,field_archive_dark_lantern,field_cutscene_dialog,field_chest_open,field_push_block`.

Performance (headless Chromium, 1920x1080): field update 0.05 ms, draw 0.15 to 0.5 ms on lit maps,
1.1 ms on the dark Archive floors (light stamps are cached per radius).

## 5. Known gaps

- No sleeping pose for the hero (the wake-up scene uses the zzz emote on the standing sprite).
- Field enemies use simple greedy chasing (no pathfinding) so walls can shelter the party.
- The `cracked wall` tool interaction is not implemented (Episode 1 has no bomb).
- Rain is particles only (no thunder, no puddle reflections).
