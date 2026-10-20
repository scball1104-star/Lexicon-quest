# World: the field scene, maps on screen, events, cutscenes

Owner: W2-world; Episode 2 systems E2-world (section 1d). Code: `src/world/*`, `src/scenes/field.js`, `src/game/*`.
Tests: `qa/world/`.
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
sign fades, low particles, y-sorted props and actors (feet row; ties: props, followers, leader), mid
particles (grass sway over the feet), overhead layer (building ridges, `overhead` tiles), lighting (tint
multiply plus desaturation, the darkness light map, glow halos, the Lantern pulse), lit windows after dusk,
high particles, emotes, the interaction prompt, the cutscene fade, banner.

## 1b. Light, night and life (W4-world-polish)

**Lighting (`world/lighting.js`, CRITIQUE_1 C7).** A dark map (`lighting.dark` > 0) draws one light map per
frame: it starts as the room's ambient (a dim, slightly cool multiplier, `ambientFor(dark)`), every light
stamps a radial falloff into it with `lighten` (per-channel max, so two lights never add into a Venn
diagram), and the map multiplies the frame; a faint indigo lift keeps nothing at pure black. A stamp has
four brightness bands (`BANDS`) whose edges are Bayer-ordered dithered rings, cached per (radius, kind,
ambient). Kinds: `cool` (the party's own light), `warm` (braziers, candelabras, lamps; also an additive
orange halo), `lantern` (pale green: the leader's light while the Lantern of Recall is raised), `neutral`
(map `light` events without a colour). A `light` event's `r` under 16 is in tiles.

**Night.** `TINTS.night` is a deep indigo multiply plus a saturation drop; `dusk` a lighter one. Under
`dusk`/`night` (and `dawn` for the lamps) `FieldScene.syncTimeOfDay()` sets every `lamp_post` prop to its
lit frame (which makes it a light source) and back to unlit by day, whatever state the map authored; the
ambient set follows (fireflies over grass at night, birds by day). It runs on map load and whenever the tint
name changes (a scene's `tint`, a flag). `world/townlife.js` finds each building prefab's windows once
(clusters of the kit's warm pane colours) and its chimney (the `chimney_stone` cap template-matched in the
facade); after dusk the pane pixels are painted again over the tinted facade with a dithered halo.

**Ambient life (`world/particles.js`, C17).** Per map and tint: `leaves` (field; ochre, tumbling, tinted
with the time of day), `fireflies` (dusk/night, spawned over grass only), `birds` (day; a sparrow pecks on a
grass tile at least five tiles away and takes off, flapping, when the party comes within ~3 tiles),
`smoke` (town; from the detected chimney tops), `motes` (dungeons and `ambientFx: ['motes']` interiors such
as the library), `drips` (ink beads with a splash), `embers` (dark rooms). Tall grass sways under any
actor's step (`onActorEnter` -> `particles.sway`), drawn in the `mid` pass so it is tinted and darkened
with the world. Caps are fixed; draw stays under 1 ms on the darkest floor (F3, 18 lights: 0.92 ms).

**Game over return (PLAYTEST 7.11).** `game.lastSafe` is no longer every map load. It is set when a map is
entered from another map (door, edge, ferry, warp), on any stairs transfer (so the stairs you came down),
by the chapel bell and a Keeper's font when used, and by an `object`/`trigger`/`actor` event carrying
`safe: true` after its script or text (the F2 Lantern pedestal). Same-map notch doors and pit falls do not
move it. `FieldScene.markSafe()` records the leader's tile and facing.

Input on the field: directions walk, `run` (or `cancel` on a keyboard) runs unless `alwaysRun`, `confirm`
interacts with the faced tile (across counters), `menu` pushes the menu, `pageR` uses a field ability and `pageL`
switches it (section 1c; near hidden ink `pageR` is always the Lantern of Recall). Under a dialog (`updateBelow`)
the field animates but reads no input.

**The Lantern prompt (W5, PLAYTEST 2.4).** While the Lantern of Recall is carried, not raised, and any `*_faint`
tile (ink bridges, wall glyphs, ink switches) lies within `LANTERN_HINT_TILES` (2) of the leader, `lanternHint`
is on: the lantern icon and the `{i:btn_pageR}` glyph bob over the leader's head (`drawLanternHint`). Touch
layouts show the icon alone plus a tappable on-canvas button at `LANTERN_BTN` (322, 128, 58 x 18). W9 made that
button the field ability button (`abilities.js ABILITY_BTN`, the same rect): a tap there uses what `pageR` would,
which near hidden ink is the Lantern. `hiddenInkNear()` is cached per tile and rechecked every
20 frames. `debugState().lanternHint` reports it.

**Receiving things (W5).** `giveItem(id, qty)` puts the item in the bag (`inventory.grant`), shows the toast
(which plays `item_get` / `key_item` or the rarity drop sound, and the legendary beam at the leader's feet) and
then, for gear, runs `maybeEquipPrompt(uid)`; `giveGear(inst, { at })` does the same for a rolled instance
(random chests pass the chest's screen point for the beam). The prompt is described in `docs/UI.md` (W5).
After a won fight `startBattle` reads `engine.lastBattleDrops` (uids the battle scene left behind), waits for
the fade-in and offers each drop in turn.

**One-shot tells (W5, PLAYTEST fix 6).** `ambientFx` may hold, besides particle kind strings, `'page_fall'` or
`{ fx: 'page_fall', at?: [x, y], area?: { x, y, w, h }, radius?: 5, id? }` (`fxTriggersOf`): when the leader
first enters `area` (or, with no area, comes within `radius` tiles of a pit tile) one loose page drifts down
from above and is swallowed by the pit at `at` (default: the nearest pit tile) with `page_flutter`
(`particles.pageFall`). Once per map load; `debugState().fxDone` lists what has fired. Default off.

## 1c. Field abilities (W9-abilities, `src/world/abilities.js`, art in `src/world/fieldart.js`)

Lufia II gave every hero a field tool that opened the map; here each party member has one.

| Ability | Owner | What it does |
|---|---|---|
| Dash Strike | hero (always) | A 3-tile dash (4 frames a tile; running is 8). Plows through pots, breaks thin root walls and cracked rock (`object` + `breakable`), pushes a light block, bonks off walls. A visible enemy it strikes **from behind** (the enemy faces the dash direction) starts the fight `preemptive`: the free first turn. The dash counts as one step for dungeon enemies. |
| Appraise | Mira | Face a visible enemy up to 5 tiles ahead (or one tile off the line, never through a wall): Mira steps to the front, a lens beam and reticle, then the Appraise window (each kind of foe: head, name, level, shields, weak and resist icons as the battle draws them, its flavor line). The encounter's types go into `game.bestiary` (the rewards.js contract, plus `appraised: true`), so the battle shows them instead of "?" and the Bestiary lists the creature. |
| Lantern | Mira, once `lantern_of_recall` is carried | `FieldScene.useLantern()`, unchanged. |
| Shove | Bram | Pushes a heavy block (`block` + `heavy`) one tile (22 frames, dust, a small shake). The hero alone only rocks it. |

**What `pageR` does** (`FieldAbilities.resolve`): (1) an object that needs one ability: a heavy block on the faced
tile is Shove, a breakable in the dash lane is Dash Strike, whatever is selected; (2) the selected ability when it
has a target (Dash: an enemy in the lane; Appraise: an enemy in view; Shove: a faced heavy block); (3) the Lantern
when unrevealed ink is within `LANTERN_REACH` (6, the reveal radius), so every "raise the Lantern with
{i:btn_pageR}" line stays true whatever is selected; (4) the selected ability on its own (a free dash, the raised
Lantern, "Nothing here to read."). `pageL` switches the selection (saved as `engine.game.fieldAbility`) and shows the
**wheel** over the leader for 96 frames: one slot per ability, the selected one framed and lifted, a name tag with
its owner's head, and the `{i:btn_pageL} switch {i:btn_pageR} use` line above it.

**Prompts.** When an ability has a target, its 12 px icon and the `{i:btn_pageR}` glyph bob over the target (the
generic check prompt steps aside for breakables). Touch layouts show the on-canvas ability button (`ABILITY_BTN`,
the old Lantern button) with the ability's icon and name, pulsing when it has a target, and a swap tab (`CYCLE_BTN`,
302, 128, 18 x 18) left of it; both appear whenever there is a target, hidden ink is near or the wheel is open.

**Tag-in.** Shove and Appraise swap the leader's sprite with the owner's (puffs, a hop): Bram or Mira is in front for
the action, then everyone is back in place, with the ability's name over (or, acting upward, under) the actor. Dash
Strike is the hero's own: afterimages every other frame, speed lines, a crescent slash, an eight-ray hit spark and
debris at the impact; the party does not keep up during the dash and runs the leader's trail afterwards (`catchUp`,
6 frames a tile). A dash ends on a door, step trigger, exit or open doorway, and the field fires it once the lock
lifts.

**Hint lines.** One first-time remark per ability (text.js `BARKS`): `first_heavy_block` (Bram, when the hero bumps a
heavy block), `first_dash_target` (Mira, a breakable within two tiles), `first_appraise_target` (Mira, an
unappraised foe in view while another ability is selected; it names `{i:btn_pageL}` for the lens). The Status screen
lists each member's field abilities on its Equipment window ("Field"), and an appraised creature is known in the
Bestiary (name, weak points, HP) before any fight.

**Breakables and what they hide** (`events.js`): an `object` with `breakable: 'roots' | 'rock'` draws the field art
(`ab_root_wall` / `ab_cliff_crack`, solid over both of its rows) until Dash Strike breaks it (`breakWall`): then the
open art (`ab_root_wall_broken` / `ab_cliff_grotto`, walkable), its `opens` wall cells carved to the map's floor
terrain (`carveOpenings`), saved for good in `engine.game.opened` (`<map>:<id>`). Any event with
`behind: '<breakable id>'` is concealed (no prop, no prompt, no glint) until then. The map module keeps a tiles.json
stand-in sprite (`root_drape`, `wall_cracked`) so the map tools validate and draw it.

**Field art** (`fieldart.js`): hand-placed pixel strings in the master palette, rasterized once into the image
`fieldart` (112 x 32) and added to the live tiles db (`heavy_block` object; `ab_*` tiles) by `installFieldArt`
before the first map builds. `python qa/world/fieldart_preview.py` renders the sheet and the sprites on their real
tiles.

## 1d. Episode 2 field systems (E2-world, EPISODE2_PLAN 5)

**Silverglass beams** (`world/beam.js` pure tracing, `world/silverglass.js` on the field as `field.glass`).
Event types `beam` (`dir`, `sprite: beam_window | beam_lens`), `mirror` (`state` 0 = '/', 1 = backslash; `fixed`,
`heavy`, `push`, `sprite: mirror_stand | mirror_heavy`, `text`), `receptor` (`target` id or list, `latch`, `flag`,
`script`, `face`, `sprite: receptor | receptor_wall`). Tracing: a source emits from its own cell; the beam passes every
cell whose code is not `solid`/`void` (props, gates, blocks, pots and chests count as solid; actors never block) and
`beam: 'pass'` tiles (`glass_slot`, `glass_slot_face`); mirrors and receptors are checked before the cell code; a
receptor lights only through its `face` (the side the crystal looks toward; none = any side) and stops the beam; its
back stops it as a wall would. 256 cells max, loop guard on (cell, direction). Several sources union.
- **Confirm** on a turnable mirror turns it (`mirror_turn`, a 1 px lift, an immediate re-trace). Its `text` (the
  `court_lens` line) is read only the first time that line is met in the save, before the turn. Fixed mirrors read
  their text. `push: true` mirrors slide when walked into; `heavy: true` ones move only by Bram's Shove (W9, through
  `EV.isPushable` / `scanLane`); both keep their state; neither ever enters a glass bridge cell (`blockCanMove`).
- **Receptors** are gate sources (`sourceCount` / AND with switches, plates, braziers): lit while a beam arrives;
  `latch` keeps them lit; `flag` is set on light and, when already set at load, starts the receptor lit and opens its
  gate quietly; `script` is queued the first time it lights (never on a quiet load, never twice) and runs as soon as
  the field is idle. `beam_hit` and a sparkle on lighting. A gate with `sprite: 'door_vow'` shows its lit crystals
  (`door_vow_closed` frame = sources on, 0..3) and swaps to `door_vow_open`. Gate sprites: `door_glass`,
  `door_glass_key` (locked_door, key `glass_key`, consumed), `door_vow`, `door_throne`.
- **Bridges**: any cell holding `glass_bridge_[hv]_dim` (collision pit) swaps to `_lit` (collision none) while a beam
  crosses it, whichever way; `glass_bridge` sfx and the `first_glass_bridge` bark. Grace: a lit cell with any actor on
  it (leader, followers, NPCs) stays lit until vacated (`glass.update`).
- **Inlays**: a map overlay `{ t: 'inlay_*', inlay: '<receptorId>' }` shows its `_lit` tile while that receptor is lit.
- **Re-trace** on load (quiet), mirror turn (at once), block or mirror move (start and landing), any entity shown or
  hidden, any flag change, gates. Mirrors and blocks reset on re-entry; latched receptors persist through their flag.
- **Drawing**: after the ground layer and the reflections (actors and props stand in front of the light): a 2 px
  `#eef6ff` core with a 1 px dithered `magic_cyan` halo each side, BEAM_LIFT (6 px) above the tile centres (the height
  of a mirror's glass and a receptor's crystal), the halo alternating every 4 frames. After the props: four-point
  flares where it bends, a splash where it meets a wall, a dithered glow on lit receptors, bright pixels running along
  it (`reduceMotion` turns the moving parts off), the odd sparkle at bounces. In dark maps it is a light: a neutral
  radius-18 light every 32 px (at most 24) and one on each lit receptor (`glass.lights()`). Dark room with the beam
  lit: field draw 0.43 ms headless.
- **Barks** (text.js BARKS, once per save): `first_mirror` when the party first faces a turnable mirror,
  `first_glass_bridge` when a bridge first lights, `first_receptor` when a receptor is first on screen.

**Reflections** (`world/reflections.js`, `field.reflections`, drawn right after the ground). Cells are reflective when
their terrain or a tile on them says `reflect: true` (glass_floor, gallery_floor, throne_floor, mere_water); a solid
tile, or planks over water (`bridge|pier|dock|stairs` ids), hide the surface (`TileMap.reflectAt`). An actor's current
frame is drawn flipped under its feet, clipped to the reflective cells of the two rows below, alpha 0.35 tinted toward
the surface; in water it ripples a pixel band by band (off under `reduceMotion`). At most 8 a frame, nearest the leader
first. **The fountain** (`fountain` prop, on maps with reflective cells or `fountainFaces: true`): everyone standing on the row just south of its basin stills a dark oval of
water in the nearest open stretch (found from the art's water pixels); those with a reflection have their face in it,
upright, chin on the near waterline (leaning over a basin you meet your own face). No two patches overlap.
**Who has none**: an NPC whose `npcs.js` record has `noReflection` (until `nh_restored`), Hollow scene spawns (ids
`nh_*`, or `<npc>_<letter>` spawns of such an NPC, or its sprite), and `nameless_king` / `aurel_k` always. **The hero**:
a faceless pale smudge (alpha 0.12) until `nh_restored`, then a faint greyed whole reflection (alpha 0.2).
**In the glass**: the scene actor `vex` is drawn as an image in the mirror (silvered, translucent, no shadow).

**Doors.** `door` + `kind: 'mirror'` (sprite `mirror_tall`, drawn in its active frame; the event cell is the walk-in
cell): a white dither dissolve, `mirror_step`, and it sets the game over return point like any map-to-map door.
`door` + `kind: 'fog'` (no sprite): a soft grey dither, no door sounds, same map; on landing it sets `fog_looped` and,
when no step trigger stands on the landing tile, plays the `fog_loop` bark.

**Flag-gated map fields.** `overlays[]` and `overhead[]` entries accept `if` / `ifNot`; a flag change adds or removes
them, recomputes their cells' collision (an overlay's code applies only while present) and repaints
(`TileMap.refreshGated`). `music` and `lighting.tint` may be first-match lists (`[{ if: 'nh_restored', id: 'hollowmere' },
{ id: 'hollow' }]`, `story.pickConditional`); outside a scene the map track follows its flags. `BANNERS[id].states` (first
match of `{ if, ifNot, title, sub }`) is read by `bannerFor(mapId, mod, hasFlag)`.
New tint `hollow_dusk` (silver-violet, lighter and greyer than dusk): lamps lit and windows glowing (`LAMP_TINTS`), no
fireflies, no birds. New particle kind `mist`: ambientFx `'mist'` (anywhere) or `{ fx: 'mist', area: { x, y, w, h } }`
(tiles); up to 14 soft Bayer-dithered blobs drifting with the wind in the `mid` pass, prewarmed on load.

**Story plumbing.** `story.js` merges `ep1.js` and `ep2.js` scenes and lines (`storyCollisions()` must stay empty).
The cutscene API's `give('gold', n)` adds gold with the coin sound and the gold toast (`field.giveGold`). The battle
gets the save's flags (`startBattle` passes `flags`; `scenes/battle.js` forwards them to `createEncounterBattle`: the
Nameless King's +25 Fury on `fountain_done`). Credits: `creditsPending` returns 1 or 2; Episode 2 pushes `credits` with
`{ cards: CREDITS_EP2, music: 'hollowmere' }`, counts `credits2_rolled` and wakes the party at `nh_inn` `inn_bed` in day
light (`CREDITS_HANDOFF`). **Quick start**: `state.newGameEp2(name)` (Lv 9, the simulator's `east_road` loadout, every
Episode 1 critical-path flag plus `ep1_complete` and `credits_rolled`, the Lantern and the first fragment, 900 gold,
potions 6, hi-potions 3, ethers 4, a phoenix feather, in bed at home so `ep2_morning` runs); `LQ_DEBUG.newGameEp2(name)`
starts it on the field.

**Debug.** `LQ_DEBUG.beams()` (traced beams, receptors, mirrors, bridges, grace, queue), `turnMirror(id)`,
`reflections()`, `newGameEp2(name)`; `fieldState().glass`. Fixtures: `_testcourt`, `_testcourt_dark`, `_testmere` in
`world/_testmap.js`. Tests: `qa/world/beam.test.mjs` (tracing), `e2_field.test.mjs` (receptors, gates, latch, scripts,
bridges, grace, inlays, sliding mirrors, the vow door, gated overlays, reflection budget on a headless field),
`e2_plumbing.test.mjs`, and `walks.test.mjs` (solo slot) which also runs `python qa/world/e2_lab.py [beam bridge shove dark mere doors
plumbing] [--device phone]` (asserted walks; shots `qa/world/out/e2_*.png`). `walks.py` walks Episode 2 maps with the
Episode 2 story flags set (no scene fires mid-walk).

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
| `chest` | `tier item? qty? gold? flag? ilvl?` | one-shot via `engine.game.opened`; `item` gives it (`field.giveItem`: toast, jingle or rarity sound, equip prompt), `gold` adds gold, neither rolls `rollChest(rng, tier, ilvl)`: its gold (coin toast), consumables (`giveItem`) and gear instances (`field.giveGear`, beam at the chest, `first_rare_drop` / `first_legendary_drop` barks). |
| `sign` | `text tile? fade? dir? lantern?` | `text` is an `ep1.js` lines id. `fade: 'shop'|'inn'|'square'|'gate'` washes the painted sign while `signs_fading` (gate: half after `left_town`), restored after `archivore_defeated`. `lantern: true` reads only once a `*_revealed` id is on or beside the cell. |
| `book` | `book` | `BOOKS` title then pages. |
| `object` | `sprite script? text? state? solid? rest?` | inspectable prop; `script` runs a scene, `text` shows lines. `prop_letter` / `prop_ferry_bell` glint. `rest: true` (the Pilgrim's Rest campfire) runs the font's rest flow after the script, without the font bark. `breakable: 'roots'` or `'rock'` with `h: 2`, `opens?` (W9): Dash Strike breaks it (section 1c). |
| `trigger` | `script on:'enter'|'step'|'interact'` | `enter` runs after the fade-in; `step` when the leader arrives (also on the landing tile of a transfer); scenes guard themselves. |
| `enemy` | `sprite encounter move:'wander'|'patrol'|'chase'|'guard' path? radius?` | dungeons: one step per player step; field: own clock. Contact pushes `battle` with `preemptive` (touched from behind) / `ambush` (caught from behind). Won: gone until re-entry (dungeon) or 60 s (field). Fled: it sits still 2 s and the party backs off a tile. |
| `switch` | `target state kind:'floor'|'crystal' color? hidden?` | `confirm` while facing toggles it (crystal_hit / switch_on) and fires every target. `hidden` (ink) switches work only after the Lantern reveals them. |
| `plate` | `target` | down while a block, the party or any actor stands on it. |
| `block` | `heavy?` | push block: walking into it slides it one tile when the far tile is open floor (block_push). Resets on re-entry. `heavy: true` (W9): it only rocks for the leader; Bram's Shove moves it (`moveBlock`, 22 frames). |
| `gate` | `sprite:'door_locked'|'door_key'|'door_boss' state to?` or `cells closed open` | opens when every switch/plate/brazier naming it is on (AND); `to` makes the open door a transfer from its doorway cell. |
| `locked_door` | `key sprite to` | locked (door_locked sfx) until the key is carried; `archive_key` is consumed. Open state persists. |
| `shelf` | `sprite positions state` | a target: slides between positions (shelf_move), collision follows. |
| `brazier` | `lit flag? persist? target?` | confirm lights it (brazier_light, becomes a light source). |
| `font` | `sprite? text? safe?` | Keeper's font: its lines, then the rest flow (`events.restFlow`): `Rest here?` (Rest / Not now); Rest = `heal` sfx, full HP and MP, the game over return point, sparkles, the `HP and MP restored.` toast, the `first_font` bark, then `Record your journey here?` (Save / Not now) which pushes `menu {page:'save'}`. `save` | | chapel bell: lines, the same rest flow with the `save` jingle and no bark. |
| `ferry` | `to text rideIf` | reads `text`; with `rideIf` set, offers the ride (ferry fade). |
| `pot` | `item? qty? gold? sprite?` | breakable (pot_break, shards), solid until broken, respawns on re-entry. |
| `light` | `r color?` | extra light source (`r` under 16 = tiles; a colour makes it warm with a halo). `pit` | `w h to` | drop area. |

Any event may carry `behind: '<breakable id>'` (W9): hidden until that breakable is broken.
`object`, `actor` and `trigger` events may carry `safe: true`: after their script or text the party's tile
becomes the game over return point (a `font` marks it when the party rests). Map-level `ambientFx: [...]` adds
particle kinds (`motes`, `leaves`, `fireflies`, `birds`, `smoke`, `drips`, `embers`) to what the area and tint
already give, and may hold `page_fall` tells (section 1).

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
`walk('up,up,left', run)`, `goto(x, y, run)` (pathfinds), `fieldState()`. W9: `ability(id?)` (uses what `pageR`
would, or forces `id`), `cycleAbility(d)`, `abilityState()` (selection, list, what `pageR` would do, the last hit);
`fieldState().abilities` carries the same.

- `node qa/run.mjs world`: autotile cases, pathfinding, collision and ledge rules, follower chain, enemy
  step rule, gate AND logic, and the headless walks (`qa/world/walks.py`, every map, zero console errors).
- `python qa/world/fieldlab.py --map valley --x 10 --y 30 --shot valley` or `--script steps.json`: boots
  headless, drives the field, saves the 384x216 frame at 3x in `qa/world/out/`.
- `python qa/shots.py --only field_town_morning,field_town_signs_fading,field_valley_wildlife,field_archive_dark_lantern,field_cutscene_dialog,field_chest_open,field_push_block`.
- `python qa/integrate/w5_shots.py` (W5): the equip prompt, legendary / rare toasts, the Lantern prompt and
  touch button, the font rest flow and the pit tell, on both profiles, with state assertions.

- `python qa/world/abilities_lab.py [wheel dash enemy appraise shove roots lantern film] [--device phone]` (W9):
  one scripted walk per ability on the real maps, with assertions and shots `qa/world/out/ab_*.png`; `film` freezes
  the game between frames for the dash and shove art. `node qa/run.mjs world` runs it (`abilities_walks.test.mjs`)
  and the pure rules (`abilities.test.mjs`).
- `python qa/world/polish_shots.py [--only night_square,dark_lantern,...] [--device phone]`: the polish
  wave's targeted shots (dithered lighting, night town, dusk valley, F3 braziers, ambient life, the
  pilgrim note, game over) in `qa/world/out/p_<name>.png`.
- `node qa/run.mjs world` also runs `qa/world/lighting.test.mjs` (band falloff, dithered edges, ambient,
  tints) without a browser.

Performance (headless Chromium, 1920x1080): field update 0.07 ms, draw 0.2 to 0.5 ms on lit maps,
0.9 ms on the darkest Archive floor (F3 great door hall, 18 lights; the light map pass is 0.78 ms of it).

## 5. Known gaps

- No sleeping pose for the hero (the wake-up scene uses the zzz emote on the standing sprite).
- Field enemies use simple greedy chasing (no pathfinding) so walls can shelter the party.
- Cracked rock and thin roots answer Dash Strike (W9); there is still no bomb. The Archive's decorative
  `wall_cracked` decals are not breakable: only `object` events with `breakable` are.
- Field abilities have no poses of their own (the field sheets hold walk frames only): Dash Strike uses the stride
  frame, lean offsets and effects; Shove and Appraise read through the tag-in swap, the lean and the lens beam.
- Rain is particles only (no thunder, no puddle reflections).
- Window detection relies on the kit's warm pane colours; a facade painted with other yellows gets no night
  glow (the chapel, library and every house in town.png match today). The item shop's display window glows
  too, which reads as a lit shop.
- Birds are drawn as 5x3 px sparrows by the particle system (no sprite sheet frame); they never land on
  plaza or path tiles.
