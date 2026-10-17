# Lexicon Quest: NEXT (the professional rebuild)

Owner: Scott Ball. Started 2026-10-17. Published at `https://scball1104-star.github.io/Lexicon-quest/next/`
(the old build keeps running at the root URL until Scott approves a swap).

This file is the **design bible and contract** every agent builds against. If code and this file disagree,
fix one of them in the same change. Read it fully before writing anything.

---

## 0. Why this rebuild exists

The current root build is a *web page with a game embedded in it*: a dashboard header, cards, side panels,
"Travel to goal" buttons, and a battle screen made of HTML cards with text. Its best assets (painted
pixel-style key art, enemies, bosses, portraits, party and prop sheets in `../assets/art/`) are strong.
Its engine (`../rpg-engine.js`) works but is wrapped in ~30 override layers.

NEXT is a **real game**: one full-screen pixel canvas, SNES-era presentation, built clean in ES modules,
Episode 1 (Willowmere, the valley, the Rootbound Archive, the Archivore) made genuinely excellent first,
on systems that scale to all eight realms later.

Scott's standing direction, from his own words:
- "I want the gameplay and graphics to compare to Final Fantasy, Lufia 2, Chronotrigger, Diablo 2,
  Dragon Quest, Secret of Mana, etc. I want it to be the best aspects of each."
- No crosswords anywhere. Pure JRPG. The story (the mystery of the disappearing names) stays.
- "Every dungeon should be enjoyable to explore, every battle should involve meaningful decisions, and the
  player should understand where to go without constantly consulting instructions."
- Mobile and PC. Professional quality: visuals, audio, gameplay, experience.

## 1. What we take from each reference game

| Game | Trait we must deliver | Where it lives in NEXT |
|---|---|---|
| **Lufia II** | Intricate dungeons, environmental puzzles (push blocks, switches, tools), secrets, visible dungeon enemies that move only when you move, IP/Fury gauge | `world/`, dungeon maps, `battle/` fury |
| **Chrono Trigger** | Cinematic storytelling, character relationships, readable sprites, combo techs between party members, party follows you, no-HUD field | `world/cutscene`, `battle/` combos, followers |
| **Final Fantasy** | Deep progression, party roles, abilities, equipment, memorable multi-phase bosses, FF-style windows, dialogue with portraits, battle transitions | `ui/`, `battle/`, `data/` |
| **Diablo II** | Rare loot with affixes, rarity colors, drop beams and sounds, elite enemies with modifiers, build choices | `battle/loot`, items UI |
| **Dragon Quest** | Inviting towns, memorable NPCs, inns, shops, church-style save, satisfying jingles, clean menus | town maps, NPC writing, audio jingles |
| **Secret of Mana** | Beautiful connected environments, lush color, animated combat, distinctive weapons with weapon-level growth | tiles/palette, battle anims, mastery |
| **Modern (Sea of Stars, Octopath)** | Weakness + Break shields, timeline you can plan against, quality-of-life (battle speed, auto, save anywhere on field via menu, skippable scenes) | `battle/`, options |

## 2. Hard rules (break one and the work is rejected)

1. **No em dashes** in any player-facing text or any doc Scott reads. Use commas, colons, periods or "-".
2. **No crosswords, word puzzles, or letter-guessing** gameplay. Names are story, not mechanics.
3. **Pixel integrity.** Everything renders at the internal resolution with nearest-neighbor scaling. No
   smoothing on game art, no sub-pixel drawing of sprites (round positions), no mixed pixel densities.
4. **Never invent content that contradicts** the existing story in `../rpg-chapter1.js`,
   `../REFORGED_REALMS_VISION.md`, `../rpg-data.js` unless this file says to change it.
5. **No external runtime dependencies.** No CDNs, no npm packages at runtime. Vanilla ES modules.
   Dev tools may use Python 3.12 (Pillow, numpy installed) and Node 24. Playwright (Python) with Chromium
   is installed for headless screenshots.
6. **Bound every subprocess** in tools and tests (timeouts). Tests must finish fast and deterministically.
7. **Don't touch files outside `next/`** unless your brief says so. The root game must keep passing
   `node qa/run-gate.cjs`.
8. Agents **do not commit or push** unless their brief says so. The orchestrator merges.
9. **Look at your own output.** Every visual change is verified by rendering a PNG and viewing it. Every
   gameplay change is verified by running it. "Tests passed" is not "it looks/plays right".

## 3. Display, scale, input

- **Internal resolution: 384 x 216** (16:9). One canvas `#game`, `image-rendering: pixelated`.
- **Tile size: 16 px.** Visible field: 24 x 13.5 tiles.
- **Scaling:** largest integer scale that fits; if the integer scale would be < 2 on a small screen, use
  the exact fit scale (non-integer) with nearest-neighbor. Letterbox/pillarbox areas are filled with a
  dark themed backdrop (not flat black), and on touch devices the side bars host the touch controls.
- **Characters:** sprite cell 24 x 32, feet at bottom-center, footprint = one 16 px tile. Battle sprites
  may be larger (party battle cell 32 x 40; enemies 32 to 96 px; bosses up to 160 x 144).
- **Portraits:** 48 x 48 in dialogue windows, 32 x 32 in menus.
- **Text:** custom bitmap font (see 6.4). Body glyphs about 7 px cap height, 11 px line height.
- **Frame loop:** `requestAnimationFrame`, fixed 60 Hz logic step with accumulator, render once per frame.
  Pause logic when the tab is hidden.
- **Input actions** (never read raw keys in game code; read actions):
  `up down left right confirm cancel menu run pageL pageR start`.
  - Keyboard: arrows/WASD; confirm = Z/Enter/Space; cancel = X/Esc/Backspace; menu = C/Tab;
    run = Shift (hold) ; pageL/pageR = Q/E; start = Enter.
  - Gamepad (standard mapping): d-pad/left stick, A confirm, B cancel, Y/X menu, RB/LB page, B-hold run.
  - Touch: virtual d-pad (left bar or bottom-left overlay), A and B buttons (right), Menu button. Tap on a
    dialogue window = confirm. Touch controls only appear on touch devices.
  - Input module exposes `pressed(action)` (edge), `held(action)`, `repeat(action)` (menu auto-repeat:
    first repeat at 18 frames, then every 5).

## 4. Code layout and module contracts

```
next/
  index.html            one <canvas id="game">, loads src/main.js as type=module, no other UI markup
  package.json          {"type":"module","private":true} so node tests can import src/ directly
  DESIGN.md PLAN.md PROGRESS.md
  src/
    main.js             boot: create Engine, preload manifest, push TitleScene
    core/
      engine.js         Engine: loop, scene stack, global services (input, audio, assets, save, rng)
      renderer.js       canvas sizing, scale, letterbox, draw helpers (sprite, tile, rect, text)
      input.js          actions over keyboard, gamepad, touch (touch controls drawn in DOM overlay)
      assets.js         loads images/json/audio listed in assets/manifest.json, progress callback
      audio.js          music (crossfade, resume position, loop points), sfx (pooled), jingles
      save.js           3 slots in localStorage key `lq-next-slot-<n>`, plus `lq-next-settings`
      rng.js            seeded RNG (mulberry32) for deterministic tests
      tween.js          easing + tween helpers
      font.js           bitmap font renderer: measure, draw, wrap, color codes
      debug.js          window.LQ_DEBUG: warp(mapId,x,y), setFlag, give(itemId), battle(encId), state()
    scenes/             each scene: {enter(data), exit(), update(dt), draw(r), onResume()}
      title.js nameEntry.js field.js battle.js menu.js shop.js gameover.js credits.js prologue.js
    ui/                 window.js (9-slice), dialog.js, choice.js, cursor.js, numberPopup.js, toast.js
    world/              tilemap.js autotile.js actors.js npc.js events.js cutscene.js camera.js lighting.js
                        particles.js transitions.js
    battle/             rules.js (pure), ctb.js (pure), ai.js (pure), loot.js (pure), fx.js (presentation)
    data/               party.js skills.js items.js enemies.js encounters.js shops.js loot-tables.js
                        maps/<mapId>.js  story/<chapter>.js  npcs.js quests.js
  assets/
    manifest.json       every asset the game loads (id, type, path)
    palette.json        master palette ramps (see 6.1)
    tiles/              terrain + structure tilesets (.png) + tiles.json (tile ids, autotile groups, collision)
    sprites/            characters, npcs, props, enemies, bosses, portraits, fx (.png + .json atlases)
    ui/                 font.png font.json, windows, cursors, icons
    audio/music/        .mp3 (Suno), audio/sfx/ .wav, audio/jingles/ .wav, audio/manifest.json
  tools/                art/ and audio/ generators (Python), map preview renderer, contact sheets
  qa/
    run.mjs             discovers and runs every next/qa/**/*.test.mjs; exits non-zero on any failure
    shots.py            headless Chromium: boots the game, warps through key scenes, saves PNGs to qa/out/
```

**Pure modules** (`battle/rules.js`, `ctb.js`, `ai.js`, `loot.js`, everything in `data/`, `world/autotile.js`)
must not touch the DOM, canvas or audio. They are imported directly by node tests.

**Scene contract:** `enter(data)`, `exit()`, `update(dt)` (dt in seconds, fixed 1/60), `draw(r)`,
optional `onResume(result)` when a pushed scene pops. Engine methods: `push(scene,data)`, `pop(result)`,
`replace(scene,data)`, `fadeTo(fn,{color,duration})`.

**Atlas JSON format** (all sprite sheets):
```json
{"image":"hero.png","cell":[24,32],
 "frames":{"down_0":[x,y,w,h],"...":[]},
 "anims":{"walk_down":{"frames":["down_1","down_0","down_2","down_0"],"fps":8,"loop":true}},
 "origin":[12,31]}
```
Character sheets: rows = down, left, right, up; columns = stand, step A, step B (3-frame RPG Maker order
is fine if the JSON says so). Extra rows allowed: `hurt`, `victory`, `cast`, `attack`, `ko`, `emote` etc.

## 5. Maps and world

### 5.1 Map module format (`src/data/maps/<id>.js`)
```js
export default {
  id: 'willowmere', name: 'Willowmere', area: 'town',          // town | field | dungeon | interior | world
  music: 'willowmere', ambience: 'river_birds', tileset: 'town',
  lighting: { tint: 'dawn', dark: 0 },                          // dark 0..1 for dungeons, light sources below
  legend: { '.': 'grass', ',': 'grass_flowers', '=': 'path', '~': 'water', '#': 'cliff', 'B': 'bridge_h' },
  ground: [ '..........~~~~....', /* one string per row, all rows same width */ ],
  decor:  [ { t: 'tree_willow', x: 3, y: 2 }, { t: 'house_red', x: 10, y: 4, door: 'house_hero' } ],
  overhead: [ /* drawn above actors: canopies, roof eaves, arches */ ],
  events: [
    { id: 'mael', type: 'npc', x: 12, y: 9, sprite: 'npc_elder', dir: 'down', move: 'stand', talk: 'mael_intro' },
    { id: 'door_inn', type: 'door', x: 6, y: 7, to: ['inn', 5, 9, 'up'] },
    { id: 'chest_1', type: 'chest', x: 2, y: 3, item: 'potion', qty: 2, flag: 'wm_chest_1' },
    { id: 'sign_1', type: 'sign', x: 8, y: 8, text: 'sign_square' },
    { id: 'trig_gate', type: 'trigger', x: 12, y: 18, w: 2, h: 1, script: 'leave_town_first_time', once: true },
    { id: 'slime_a', type: 'enemy', x: 20, y: 6, sprite: 'enemy_inkslime', encounter: 'archive_f1_a', move: 'chase' }
  ],
  exits: [ { x: 12, y: 18, w: 2, h: 1, to: ['valley', 30, 12, 'down'] } ],
  marks: { bedside: [4, 3], town_sign: [12, 17], meet_iris: [8, 6] }   // named points cutscenes refer to
};
```
- Triggers take `on: 'enter'` (fires when the player steps onto the tile) or `on: 'interact'` (confirm while facing).
  `marks` are required by story scripts: `walk`, `camera.panTo` and `spawn({at})` accept a mark name or x,y.
- Collision comes from `tiles.json` (per tile) + decor footprints + events. A map validity test checks
  every map: rectangular rows, legend complete, every door/exit target exists and lands on a walkable tile,
  every scripted id exists, and the start-to-boss path is reachable (BFS that respects puzzle gates).
- Movement is **grid-based, 4-direction, smoothly interpolated** (walk 4 px/frame-ish = 16 px in 8 frames at
  run, 12 frames walking). Hold `run` to dash. Followers (2 companions) trail on the leader's path
  (Chrono Trigger / Lufia II caterpillar).
- **Field HUD: none.** On map entry, a location banner slides in for 2 s. Interactables show a small
  bobbing prompt glyph when the player faces them. That is all.

### 5.2 Visible enemies (Lufia II)
In dungeons and the valley's wild areas, enemies are on the map. In dungeons they **step only when the player
steps** (Lufia II rule), so the player can plan around them. Types: `wander`, `patrol` (path list), `chase`
(moves toward player when within 5 tiles), `guard` (stationary until adjacent). Touching one starts its
encounter. After victory it is removed until the map is re-entered (dungeon) or for 60 s (field).
No random encounters on any map in Episode 1.

### 5.3 Dungeon toolkit (Lufia II)
Push blocks (onto pressure plates), floor switches (toggle gates/bridges), crystal switches (hit with a tool),
pits that drop to the floor below, cracked walls (bomb/tool), one-way ledges, moving shelves, dark rooms lit by
braziers, keys and locked doors, a boss key, shortcuts back to the entrance. Episode 1 introduces **one field
tool** that the Archive teaches and then tests: the **Lantern of Recall** (reveals hidden ink: invisible bridges,
faded switches, secret doors). Every puzzle must be readable on screen without text explaining it.

### 5.4 Cutscenes (Chrono Trigger / FF)
`world/cutscene.js` runs async scripts against an API:
```js
export async function mael_intro(s) {
  await s.lockInput();
  await s.walk('mael', ['left','left']);
  await s.emote('hero', '!');
  await s.say('mael', "Ah, there you are. Did you sleep through the bell again?", { portrait: 'mael' });
  const c = await s.choice(['I was up early!', '...Maybe.']);
  await s.camera.panTo(12, 4, 40); await s.shake(4, 20); await s.flash('#fff', 10);
  await s.music('mystery'); await s.fade('out', 30); s.setFlag('met_mael'); await s.unlockInput();
}
```
Primitives: `say, choice, walk, face, jump, emote(! ? ... heart sweat anger music zzz), wait, camera.panTo,
camera.follow, shake, flash, fade, tint, music, sfx, spawn, despawn, setFlag, hasFlag, give, take, battle,
addMember, title(card text)`. Text is held in `data/story/*.js` by id, not inlined in maps. Position arguments
(`walk`, `camera.panTo`, `spawn`) accept a map mark name or x,y. `hasFlag` may be sync or async (always `await` it).
When `ep1_complete` is set, the field scene hands off to the credits scene using `CREDITS` from `data/text.js`;
there is no `credits()` cutscene primitive.

## 6. Art bible

### 6.1 Palette
Build `assets/palette.json` from the **existing painted sheets** in `../assets/art/` (k-means on
environments/world-sprites/party/portraits) merged with hand-curated ramps, so new tiles match the existing art.
Target ~56 colors in named ramps of 4 to 6 steps: `grass, foliage_dark, earth, path, stone_warm, stone_cool,
water, wood, roof_red, roof_blue, roof_purple, roof_green, skin_light, skin_med, skin_dark, hair_brown,
hair_violet, metal, gold, cloth_blue, cloth_purple, ink, magic_cyan, magic_violet, fire, ice, ui_blue, shadow`.
Rules: hue-shift ramps (shadows cooler/violet, highlights warmer/yellow), never pure black (darkest = deep
indigo `#14101e`-ish), outline color per material (dark of its ramp), not universal black.

### 6.2 Tiles (16 px)
- Terrain as **RPG Maker VX/MV "A2" autotiles**: each terrain is a 2x3-tile block (32 x 48 px) composed into
  47 blob variants by quarter-tiles at runtime (`world/autotile.js`). Animated water/lava as 3 frames side
  by side ("A1" style).
- Terrains for Episode 1: grass, tall grass, flowers (overlay), dirt path, cobblestone plaza, river water
  (animated, with foam edge), shallow water, sand bank, cliff (top + face, 3/4 view), stone floor (archive),
  wood floor (interiors), carpet, dark void/pit, ink pool (animated).
- Structures as multi-tile objects: houses (3 styles + inn + shop + smithy + chapel/bell tower + library),
  fences, walls, bridges, stairs, doors (open/closed), windows (lit/unlit), lamp posts, wells, signs, crates,
  barrels, pots (breakable), bookshelves (wall), reading tables, candelabras, statues, pressure plate, switch
  (on/off), push block, locked door, chest (closed/open, 3 tiers: wood, iron, gold).
- **Depth:** every tall object casts a soft shadow (dithered 50% indigo) down-right; trees and roofs split
  into base (collides) and canopy (overhead layer). Grass varies (3 to 4 variants, random but seeded per tile).
- **Readability:** walkable ground is lower contrast; blockers have stronger value contrast and outlines;
  interactables have one bright accent pixel cluster (gold or cyan).

### 6.3 Sprites
- Party field sprites derived from `../assets/art/party-sprites.png` (4 directions x 3 heroes, 96x128 cells):
  downscale to the 24x32 cell with careful resampling, quantize to the palette, clean outline, then derive
  walk frames (leg/arm shift, 1 px body bob). Add idle blink, victory, hurt, cast, attack, KO poses for
  battle at the 32x40 battle cell.
- Townsfolk from `../assets/art/townsfolk-sprites.png`, props from `world-sprites.png`, `interior-sprites.png`.
- Enemies and bosses from `enemies.webp` / `bosses.webp` (4x2 grids). Downscale to battle size, quantize,
  outline. Each enemy also gets a 16x16 or 24x24 **field sprite** (for visible dungeon enemies).
- Portraits from `portraits.webp` (4x2 grid: top row hero, Mira, Bram, Elder Mael) at 48x48 with a 1 px frame.
- Enemy and boss battle sprites get procedural motion in code (idle breathe/bob, hit flash, death dissolve);
  no frame animation required, but optional.

### 6.4 UI
- Windows: Final Fantasy style. Deep blue vertical gradient (default; Config lets the player pick 6 colors),
  2 px light bevel border with rounded corners, 9-slice from `assets/ui/window.png`. Field windows fill at alpha 0.92 (busier backgrounds bleed through below that).
- Cursor: pointing-hand glove (FF, about 18x12, hotspot at the fingertip) that bobs 1 px. Disabled options dim to 50%.
- Font: hand-built bitmap font `assets/ui/font.png` + `font.json` (ASCII 32..126 plus a few symbols: heart,
  arrow, note, star, ellipsis), proportional widths, 1 px shadow. A second **large** font for titles and
  location banners (about 12 to 14 px). Color codes in strings: `{c:gold}Text{/c}`.
- Icons 12x12 or 16x16: sword, spear, staff, axe, bow, shield, armor, helm, charm, boots, mantle, potion,
  ether, phoenix feather, key, letter, gold, star, fire, ice, thunder, light, poison, stun, chill, burn,
  regen, protect, haste, fury.
- Rarity colors (Diablo): common `#e8e8e8`, magic `#8fa6ff`, rare `#ffd34d`, legendary `#ff8a2a`, set `#3cdc6a`.

### 6.5 Effects and juice
Screen transitions (fade, iris, battle swirl/shatter), hit-stop (2 to 4 frames) on heavy hits, screen shake,
white hit-flash, damage numbers that pop and bounce (crit = larger + yellow), heal numbers green, MP blue,
particles (leaves, fireflies, dust motes, embers, ink drips, sparkles), light radius in dark dungeons, water
shimmer, day tint. Respect a `reduceMotion` setting (no shake/flash).

## 7. Battle design

- **Layout (FF6/Lufia II side view):** backdrop = region key art (`../assets/art/environments.webp`, 2 cols x
  4 rows, cell 0 Willowmere) cropped/scaled to 384x216 with a darkened lower band. Enemies left side, party on
  the right in a diagonal. Bottom: command window (left) and party status window (right: name, HP, MP, Fury).
  Top right: **turn timeline** (next 8 actors as mini icons).
- **Turn system: CTB timeline** (FFX-like). Each action has a delay; speed lowers delay. Selecting an action
  previews where the actor lands on the timeline. Status effects can push/pull timeline positions. No real-time
  pressure. Battle speed 1x/2x and an Auto toggle in Config.
- **Commands:** Attack, Tech (weapon techs, cost MP), Magic (for casters), Item, Defend, Swap Weapon,
  Flee. **Fury** (Lufia II IP): gauge 0 to 100 fills when the character takes or deals damage; when full a
  Fury art becomes available (per weapon). **Combo Techs** (Chrono Trigger): when two (or three) party members
  are all ready on consecutive timeline slots and have MP, a Combo option appears (e.g., Hero+Mira
  "Ember Edge", Hero+Bram "Cross Rend", Mira+Bram "Thorn Bulwark", all three "Dawnname").
- **Weakness + Break (Octopath/SoS):** each enemy has a Shield count and weakness icons (sword, spear, staff,
  axe, fire, ice, thunder, light). Unknown weaknesses show as "?" until hit (or scanned with Mira's Appraise).
  Hitting a weakness removes 1 shield; at 0 the enemy is **Broken**: loses its next turn, takes +50% damage,
  shields refill after.
- **Telegraphs:** dangerous enemy actions are announced one turn early in the help window and on the timeline
  ("The Archivore inhales a storm of ink..."). Defend, Break, or Stun can answer them. Every boss has phases.
- **Statuses (Episode 1):** Poison, Burn, Chill (slow), Stun, Silence, Blind, Regen, Protect, Haste, Focus.
- **Weapon mastery (Secret of Mana):** each character can use 2 weapon types; using a type earns mastery XP;
  mastery levels unlock techs and a Fury art. Hero: sword/axe. Mira: staff/bow. Bram: spear/axe.
- **Elites (Diablo):** 1 in ~8 encounters has an elite with a gold name and 1 to 2 modifiers (Swift, Stoneskin,
  Vampiric, Cursed, Splitting). Elites drop magic+ loot.
- **Loot (Diablo):** rarity tiers above. Items have a base + affixes (prefix/suffix) with rolled values,
  e.g. "Gleaming Spear of Embers (+6 ATK, +12% fire)". Drop reveal: chest/burst with a rarity-colored beam
  and a rarity-specific sound. Equip screen shows stat deltas with green/red arrows for each party member.
- **Rewards screen:** EXP, gold, mastery points, items, level-up window with stat gains and a jingle.
- **Presentation:** battle start swirl + SFX; party enters from the right; each attack = step forward, weapon
  arc fx, hit-stop, flash, number pop; magic = cast pose, circle fx, element particles; enemy death =
  white flash then pixel dissolve; victory pose + fanfare.
- **Balance targets:** an ordinary fight takes 3 to 5 rounds without grinding; the Archivore takes 8 to 12
  rounds and can be lost if its telegraphs are ignored; a full-HP party at the expected level should survive
  any single non-telegraphed enemy action.

## 8. Audio

- **Music** (Suno, generated by the orchestrator; drop-in by id): `title` (exists), `willowmere`, `valley`,
  `archive`, `battle` (existing `../assets/audio/battle.mp3` until replaced), `boss_archivore`, `mystery`,
  `sorrow`, `triumph` (story), `victory` (short fanfare loop), `gameover`. `audio/manifest.json` holds
  `{id:{src, volume, loopStart, loopEnd}}`. Battle music interrupts field music; field music resumes at its
  position. Crossfade 0.6 s.
- **Jingles** (synthesized, short, DQ/FF flavor): `item_get`, `level_up`, `inn_rest`, `save`, `key_item`,
  `quest_done`, `party_join`.
- **SFX** (~45, synthesized WAV, 22.05 kHz mono): cursor, confirm, cancel, buzzer, text_blip (3 pitches),
  door_open, door_close, stairs, chest_open, pot_break, footstep_grass, footstep_stone, footstep_wood,
  block_push, switch_on, gate_open, bridge_appear, lantern_reveal, splash, encounter, flee, sword_slash,
  spear_thrust, staff_hit, axe_chop, bow_shot, hit_light, hit_heavy, crit, miss, enemy_die, boss_die, fire,
  ice, thunder, heal, buff, debuff, poison, break, fury_ready, fury_art, combo_start, level_up_sparkle,
  drop_common, drop_magic, drop_rare, drop_legendary, menu_open, menu_close, equip, buy, save_chime.
- **Ambience loops:** river_birds, archive_hush (paper rustle + distant drip), wind_valley.

## 9. Episode 1 content outline (writers expand; keep consistent with root story files)

- **Prologue** (skippable): title card text over animated key art. "In Aethelgard, every name is a promise..."
- **Willowmere, morning.** The hero wakes (DQ). Outside, a lantern-sign's name flickers and fades. The
  Thirteenth Bell rang at night though the tower holds twelve. **Elder Mael** asks the hero to visit the
  **Rootbound Archive** north of the valley and recover the first fragment of the Book of Names.
- **Mira** (archivist apprentice, staff/bow, curious, precise) joins at the library after a short scene.
  **Bram** (town guard and smith's son, spear/axe, warm, stubborn) joins at the south gate after a scene
  where he cannot remember his own father's name for a moment.
- Town life: inn (Nella the Ferrymender nearby), bakery (**Oren the Baker**), smithy, item shop, chapel with the
  Bell (save point), the hero's home, **Tess** at the south square (three undelivered letters side quest, reward
  Wayfarer Boots). Every NPC has a name, a personality, and dialogue that changes after key flags.
- **Willowmere Valley** (field): river, bridge, meadow, the Whisperwood edge, a milestone that reads "Every name
  is a promise that something will not be forgotten." Visible wildlife enemies, two secrets, the Archive
  pilgrimage road north.
- **Rootbound Archive** F1 The Catalog Halls (push blocks, keys, first visible-enemy rooms), F2 The Reading
  Galleries (Echo Warden mini-boss guards the **Lantern of Recall**; then lantern puzzles: hidden ink bridges),
  F3 The Rootbound Stacks (moving shelves, dark rooms, shortcut, boss door). **The Archivore** (bosses.webp
  cell 0): multi-phase, summons Lost Pages, devours a party member's name (Silence + stat drain) as its
  signature telegraphed move.
- **Ending of Episode 1:** fragment recovered, names return to Willowmere's signs, but the hero's own name stays
  faint on the Book's page: hook toward Episode 2 (Nameless Hollow). Credits roll with music.
- Target: 60 to 90 minutes for a first play, more with side content.

## 10. Quality bar and how we check it

- `node next/qa/run.mjs` passes (pure-logic tests, map validity, data integrity, story references).
- `python next/qa/shots.py` renders title, name entry, town, interior, valley, dungeon F1/F2/F3, dialogue,
  menu, shop, battle (start, mid, victory), boss, at desktop 1920x1080 and phone landscape 844x390, with zero
  console errors. Critic agents review these PNGs against section 1 and file issues in `PLAN.md`.
- A scripted **autoplay** run reaches the Archivore and wins with the expected-level party (no softlocks).
- Performance: 60 fps on a mid phone; never more than 3 ms per frame of logic in the field.
