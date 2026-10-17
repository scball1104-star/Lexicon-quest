# W2-world: tilemap renderer, actors, NPCs, events, cutscene runner, camera, lighting, field scene

**Owned paths:** `next/src/world/**`, `next/src/scenes/field.js`, `next/src/game/story.js`, `next/qa/world/**`,
`next/docs/WORLD.md`.

You build the exploration half of the game: everything from the moment the player can walk. Reference feel:
Chrono Trigger (snappy, readable, party follows), Lufia II (dungeon machinery, visible enemies), Secret of Mana
(lush, alive). The maps come from W2-maps (DESIGN 5.1 format, validated), tiles from `assets/tiles/tiles.json`,
sprites from `assets/sprites/*.json`, UI windows from W2-ui, story scripts from `src/data/story/ep1.js` via the
exact API in `docs/story/STAGING.md` section 1. Use `src/scenes/_devField.js` as the starting reference.

## Deliverables
1. `world/tilemap.js` + `world/autotile.js`: load a map module, resolve `legend` to tile ids, compute the 47-blob
   autotile variant per terrain tile (A2 layout per the tiles README; A1 animated water 3 frames), place decor
   objects (footprints, anchors, overhead rows), build collision (tiles + objects + events), cache ground and
   overhead layers in `r.createLayer` chunks (rebuild only when a tile changes: doors, switches, bridges).
   Depth sort actors and props by feet y; overhead layer draws above actors; shadows under tall props/actors.
2. `world/actors.js`: `Actor` (sprite atlas, dir, anim, tile pos, pixel interpolation 12 frames walk / 8 run,
   step bob, footstep sfx by terrain every other frame-pair, shadow), movement with collision and ledge drops,
   push-block interaction, `Follower` chain (companions follow the leader's recorded path, Chrono Trigger style),
   NPC behaviors `stand | wander | patrol(path) | chase | guard | look_around`, map enemies that move only when the
   player moves inside dungeons (Lufia II) and wander in the valley; touch -> `engine.pushAwait('battle', ...)`
   with `preemptive` when touched from behind, `ambush` when it catches the player from behind; defeated enemies
   are removed until re-entry (dungeon) or 60 s (field). Animals idle.
3. `world/events.js`: doors (with `door_open`/`stairs` sfx and transitions: fade for doors, iris for stairs, wipe
   for map edges), chests (tiers wood/iron/gold: open anim, `chest_open`, loot via `rollChest` or fixed `item`,
   toast, `engine.game.opened`), signs/books/inspect (dialog), NPC talk (`talkTo`), triggers (`on:'enter'` after
   fade-in, step triggers, `interact`), switches/plates/crystal switches/push blocks/pits/cracked walls/one-way
   ledges/moving shelves/locked doors (counted keys, boss key), the Lantern of Recall reveal (hold `menu`? no:
   a field tool slot: pressing `pageR` on the field with the lantern raises it for 2 s: hidden-ink bridges and
   switches fade in with `lantern_reveal`), save point (chapel bell: heal + save prompt), shops/inns (push ui
   scenes). Interaction prompt glyph bobbing above the faced interactable.
4. `world/camera.js` (follow with soft bounds, pan, shake), `world/lighting.js` (map `lighting.dark` 0..1 with a
   radial light around the party and light sources: braziers, lanterns; day tints dawn/day/dusk/night/ink),
   `world/particles.js` (leaves in the valley, fireflies at dusk, dust motes and ink drips in the Archive,
   footstep puffs, sparkle on interactables), `world/transitions.js`, location banner on map entry (large font,
   2 s, `BANNERS[mapId]`), weather hook (light rain in the valley scene the story asks for).
5. `world/cutscene.js` + `game/story.js`: the runner exposing exactly STAGING.md section 1 (`say` -> W2-ui dialog,
   `choice`, `walk` with pathfinding to marks/events/actors, `face`, `jump`, `emote`, `wait`, `camera.panTo`,
   `camera.follow`, `shake`, `flash`, `fade`, `tint`, `music`, `sfx`, `spawn`, `despawn`, `setFlag`, `hasFlag`,
   `give`/`take` with the toast + `key_item`/`item_get` jingle, `battle` via the battle scene, `addMember` (join
   the follower chain + `party_join` jingle), `title` via ui `titleCard`, `lockInput`/`unlockInput`). Scenes
   are `scenes[id]` from `ep1.js`, already self-guarded. Visual flag states from STAGING.md section 2 (sign fading
   frames, gate sign, restored town, root passage, starter dough, ferry bell glint). The `ep1_complete` handoff
   to `credits` and the post-credits return.
6. `scenes/field.js`: ties it together: enter `{map, x, y, dir}` or from `engine.game`, `menu` action opens the
   W2-ui menu, `cancel` = run modifier on keyboard when not `alwaysRun`, playtime counter, autosave on map change
   (slot 0), ambience per map (`ambience` id in the module), music per map with `pushMusic` for interiors.
   Registers `LQ_DEBUG.warp(mapId, x, y)` and `LQ_DEBUG.setFlag`. Field HUD: none (DESIGN 5.1).
7. `qa/world/*.test.mjs`: autotile variant math (all 47 cases), collision and ledge rules, follower chain, path
   finding, enemy step rule, event trigger ordering; plus headless walks through every map in `src/data/maps`
   (warp, walk a scripted route, zero console errors).
8. `docs/WORLD.md`.

## Verify
Shots: town morning, town with the sign fading state, valley with wildlife, archive F1 dark room with lantern,
a cutscene mid-dialogue, chest opening, push-block puzzle mid-solve, at desktop and phone. View them. Profile
with `LQ_DEBUG.perf()`: field logic under 1 ms, draw under 3 ms on the largest map.
