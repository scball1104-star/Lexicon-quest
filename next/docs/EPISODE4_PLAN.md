# Episode 4 production plan: The Sunken Keep

Owner: ep4-designer, 2026-11-03 (Tuesday, about 9:30 PM Eastern). Status: **designed tonight, building behind
`EP4_LIVE` (off)** on branch `scott/ep4-build` (cut from `origin/overhaul`). Story bible: `docs/story/EPISODE4.md`.
This file is the contract the build agents work from. Every build agent reads `docs/briefs/COMMON.md`, `DESIGN.md`,
`docs/story/EPISODE4.md`, this file and its own brief in `docs/briefs/E4-*.md`, in that order. House rules as always:
no em dashes, no git, stay in your owned paths, bound every command, look at your own output.

**Usage guard.** Tonight's push runs up to three agents at once, in the waves of section 11, with disjoint owned paths
inside every wave. The orchestrator checks weekly usage before each wave: under 75%, launch the wave; 75 to 85%, run
its agents one at a time; over 85%, stop and leave the branch publishable (Scott's standing guard; his business loops
and the schedule generators come first). Each agent is sized to finish in one sitting.

**Resource rule for tonight.** Art is made in code or cut from painted source sheets the game owns and has not used
(section 9), through the existing pipelines in `tools/art/**`. **No new Suno or Runway generations** (Scott's paid
accounts; they need his go). Music comes from the in-repo tracker (`tools/music`) or reuses existing tracks; SFX from
the existing generator (`tools/audio`).

---

## 0. Summary

**What gets built.** One road (the Flood Road, from Emberpeak's washed-out east road), one town with four interiors
(Valewyn), one three-floor dungeon plus a boss room (the Sunken Keep and the Drowned Throne), one new field mechanic
(**tide locks**: lock wheels raise and lower the water in a basin through three marks; the level decides which floors
are dry, moored pontoons float to bridge channels, and high water washes forged paper seals off doors for good), one
battle rule (**Decrees**: paper foes stamp themselves toward a telegraphed decree; fire, Lamp Oil, a Break or the
hero's Answer voids it), one new party skill (the hero's **Answer**), one mini-boss (the Inkbound Barrister), one
three-phase boss with the hero at its center (the Paper Regent, with two Forged Writs), 7 ordinary enemies, 3 new
tracker tracks plus reused ones, 8 SFX and 1 ambience, about 30 scenes, 3 side stories, and the Episode 3 save rule
carried over: no Episode 4 path ever writes a save slot that holds another run. Target 60 to 90 minutes (planned at
75), party Lv 17 to 21.

**The one structural difference from Episode 3: everything is in a lazy pack.** Episode 3 put its maps and field code
in a pack but its story, NPCs, quests, text, enemies and items in core files, which is part of why the first download
is full. Episode 4 lives entirely in the `ep4` pack (`src/data/ep4/**`, `src/data/maps/ep4_*.js`, `assets/*/ep4_*`,
`assets/tiles/ep4.png`, `assets/audio/sfx/ep4_*`), registered by mutation the way the X1 expansion is (`registerStory`,
`prependTalk`, `FLAG_IDS.push`, `ENEMIES` and `ITEMS` assignment). Core changes are a handful of one-line seams (section
13.2), and every core byte they add is paid for by trimming core JS in the same pull request.

**What is reused (most of it).** The engine, field scene, cutscene API, event vocabulary (doors, gates with AND logic,
flag gates, overlays with `if`/`ifNot`, push and heavy blocks, fonts, save bells, chests, lights, Keeper mirrors, lift
doors), the pack system (`src/game/packs.js`, `docs/PWA_PACKS.md`) and its atlas merge, Episode 3's per-run autosave
and `pickRunSlot`, the `EXT` event hook in `src/world/events.js`, Episode 3's permanence store pattern (`g.quenched`)
and its gate-source types, W9's abilities and the Lantern, the battle rules (CTB, Break, Fury, combos, telegraphs and
`charge`, phases, summons, HP locks, Cover, Taunt, the `nameless` status and its cures, **the Heat counter**, which
Decrees reuse with a new verb), `learn: { flag }`, the simulator, the map kit, `mapcheck`, the preview renderer, the
NPC paper-doll builder, the enemy recolor pipeline, the backdrop builder, the tracker and SFX generator, every jingle,
and the tracks `millrace`, `mystery`, `sorrow`, `triumph`, `battle`, `victory`, `gameover`, `first_bell`, `emberpeak`.
Painted source art the game has never shipped: `environments.webp` cell 3 (Valewyn), `bosses.webp` cell 3 (the Paper
Regent); the built but unused portrait `noble_lady` (portraits cell 4, Lyra). Vex's and the courier's art exist.

**What is genuinely new.** Tide locks (wheels, basins, heights, pontoons, forged seals, floodgates), the Decree verb on
the Heat counter, Answer, an `ep4` tile sheet (keep floors, canal kit, Valewyn town kit), 10 NPC specs, 7 enemy
recolors, the Barrister, the writs, the Paper Regent's three looks and avatar, 1 portrait crop, 3 tracks, 8 SFX, 1
ambience, the whole `src/data/ep4/` pack, the Episode 4 quick start and its title row.

**Waves (section 11; up to three at once, disjoint paths).**
- **4a** foundations: E4-pack, E4-story, E4-battle.
- **4b** art and field: E4-tiles, E4-sprites, E4-world.
- **4c** maps and sound: E4-maps-a, E4-maps-b, E4-audio.
- **4d** assembly: E4-scene-ui, then E4-integrate (flips `EP4_LIVE` on the branch after the full gate list).
- **4e** review: critic-6 and play-critic-6 (read-only), then E4-fixes.

**Done means.** A save that finished Episode 3 plays Episode 4 to its credits with no softlock; so does the
`newGameEp4` quick start, without touching any other run's save; the autoplay bot beats the Paper Regent at Lv 20 with
zero game overs on desktop and phone; `node qa/run.mjs` green with Episodes 1 to 3 untouched in meaning;
`simulate.mjs --check` prints "All targets met" for all four episodes (and `--cave --check`, `--tier 1 --check`
unchanged); the timed story read lands at 60 to 90 minutes; every new map preview viewed; shots with zero console
errors; the tap-prompt load does not grow (section 12).

---

## 1. Scope at a glance

| Thing | Count | Reused | New work |
|---|---|---|---|
| Maps | 10 new + 2 patches | interiors copied from Willowmere's and re-dressed; map kit, preview, mapcheck | `ep4_flood_road`, `ep4_valewyn`, 4 `ep4_vw_*` interiors, `ep4_keep_f1/f2/f3`, `ep4_keep_crown`; pack patches of `emberpeak` (east road) and `pk_inn` (wake trigger) |
| Field mechanics | 1 new (tide locks) | overlays, gates, flag gates, permanence store, EXT, lifts, Lantern | wheel/basin/pontoon/seal/floodgate events, a pure `tide.js`, height grids |
| Story scenes | about 30 + side scenes (under 40 built) | cutscene API, scene guards, Talk, journal, barks, vignette tint, `registerStory` | `src/data/ep4/story.js`, `STAGING_EP4.md` |
| NPCs | 9 new + memory actors + returns | paper-doll builder, `prependTalk` | specs, talk tables |
| Enemies | 7 ordinary + mini-boss + boss + 2 adds | rules, ai `basic`/`phased`, Cover, `charge`, HP locks, `nameless`, the Heat counter | Decree data, ai `barrister`, ai `paper_regent` (registered from the pack) |
| Party skills | 1 | skills.js shape, `learn: { flag }` | Answer |
| Items | 1 consumable, 6 key items, 16 bases, 6 uniques, 1 set | items.js, loot.js, rarity, affixes | tier 7 and 8 gear, affix tier 6 |
| Shops | 3 new + 1 restock | shops.js, shop scene | stock lists |
| Music | 3 new, 9 reused | tracker pipeline, name motif | `valewyn`, `sunken_keep`, `boss_regent` |
| SFX / ambience | 8 / 1 | generator | section 8.4 |
| Tiles | 1 new sheet | autotile, wall systems, the court and forge kit approach | `ep4.png` + `ep4_tiles.json` |
| Sprites | about 30 frame sets | recolor + derive pipelines, pack atlas merge | NPCs, 7 recolors, Barrister, writs, Regent x3, avatar |
| Portraits | 1 crop + 1 alias | portrait pipeline, `noble_lady` | `paper_regent` (crop), `lyra` (alias) |
| Backdrops | 5 | backdrop builder (environments cell 3) | `ep4_battle_flood_road`, `ep4_battle_keep`, `ep4_battle_archive_deep`, `ep4_battle_throne`, `ep4_dialog_keyart` |

---

## 2. Id registry (the contract)

Every id below was grepped against `src/`, `assets/tiles/tiles.json`, `assets/manifest.json`,
`assets/audio/manifest.json` on 2026-11-03: no collisions. Collisions found and avoided: `last_decree` (the Nameless
King's move), `countersign`, `witness_seal`, `codicil`, `errata`, `marginalia`, `strikethrough` (Fine Print
legendaries), the name Paper Crown (Episode 2), `testimony_*` names of Episodes 2 and 3, `courier_v` (the Episode 3
spawn id; Episode 4 keeps its sprite `npc_courier_v` and names the NPC record `ada`), `black_tide` (a skill; no `tide`
skill or item id may start with `black_`). **Prefixes:** maps and zones `ep4_` (the pack rule needs it: section 13.1);
encounters `e4r_` (road), `e4k1_`, `e4k2_`, `e4k3_` (keep floors); art `ep4_`; sfx `ep4_` file names. **Never** bare
`valewyn` as a map id (it is the music id), never `vw_` alone (always `ep4_vw_`), never `f1_`..`f3_`, `fo1_`..`fo3_`,
`sr_`, `pk_`, `oath_`, `vow_`.

### 2.1 Maps

| id | Banner (title / sub) | area | size | tileset | music | ambience | lighting |
|---|---|---|---|---|---|---|---|
| `ep4_flood_road` | The Flood Road / Down to Valewyn | field | 52 x 30 | town + `ep4` kit | `millrace` | `canal_rain` | tint `flood_grey`, rain particles |
| `ep4_valewyn` | Valewyn / The Drowned Crown Plaza; after `vw_restored`: Valewyn / The Crown Remembers | town | 44 x 34 | town + `ep4` kit | `valewyn` | `canal_rain` until `vw_restored` | tint `flood_grey`, then none |
| `ep4_vw_inn` | The Floodwatch Inn | interior | as `inn` | interior | town track | none | none |
| `ep4_vw_shop` | Riverbank Provisioner | interior | as `item_shop` | interior | town | none | none |
| `ep4_vw_forge` | Crown Guard Forge | interior | as `smithy` | interior | town | none | none |
| `ep4_vw_palace` | The Regent's Hall | interior | as `chapel` | interior | town | none | none |
| `ep4_keep_f1` | The Sunken Keep / I. Tidegate Causeway | dungeon | 40 x 30 | `ep4` | `sunken_keep` | `keep_drip` (alias of `archive_hush` if not built) | dark 0.2 |
| `ep4_keep_f2` | The Sunken Keep / II. Archives Below Water | dungeon | 40 x 30 | `ep4` | `sunken_keep` | same | dark 0.45, lanterns |
| `ep4_keep_f3` | The Sunken Keep / III. The Court of Witnesses | dungeon | 44 x 32 | `ep4` | `mystery` | same | dark 0.3 |
| `ep4_keep_crown` | The Drowned Throne | dungeon | 24 x 20 | `ep4` | none until the scene | same | dark 0.15 |

Patches (pack-side, never edits to the core or `ep3` map files): `emberpeak` gains the east-road exit, `pk_inn` gains
the `ep4_morning` enter trigger (section 3).

### 2.2 Story flags (all pushed onto `FLAG_IDS` and declared in the pack's `flags.js` with a one-line meaning)

Main: `ep4_started`, `east_road_open`, `flood_road_arrived`, `flood_first_fight_done`, `vw_arrived`, `met_regent`,
`met_joss`, `keep_ferry_open`, `keep_entered`, `keep_f1_done`, `barrister_defeated` (encounter flag), `keep_f2_done`,
`vex_archive_met`, `petition_gate_open`, `hero_signed`, `paper_regent_defeated` (encounter flag), `lyra_named`,
`charter_restored`, `tide_bell_rung`, `vw_restored`, `ep4_complete`.

Beats and world state: `ep4_morning_done`, `saw_flood_lane`, `ferry_rested`, `saw_valewyn`, `saw_statue`,
`keep_f1_arrived`, `keep_f2_arrived`, `keep_f3_arrived`, `lyra_memory_1`, `lyra_memory_2`, `lyra_memory_3`,
`principle_voice`, `principle_truth`, `principle_mercy`, `seal_key_found` (chest flag), `fragment4_get`, `lyra_truth`,
`lyra_kind`, `tidegate_open` (latched floodgate on F1).

Side: Witnesses `witnesses_started`, `testimony_hale`, `testimony_dorian`, `testimony_joss`, `council_shelter`,
`council_records`, `witnesses_done`; Coffer `coffer_found`; Nilo `nilo_started`, `nilo_bell_found` (chest flag),
`nilo_done`. Counter (not a flag): `credits4_rolled`. Map-local chest flags: `tide_key_f1`, `tide_key_f2`.

### 2.3 Key items (the pack's `items.js`, merged into `KEY_ITEMS`)

| id | name | icon | desc |
|---|---|---|---|
| `running_decree` | The Running Decree | letter | A royal order whose print runs. One line in another ink does not: "The gates. Please." |
| `lock_crank` | Lockwright's Crank | key | Joss's iron crank. Turns the Keep's lock wheels. |
| `tide_key` | Tide Key (counted, consumed) | key | A green-bronze key. Opens one door in the Keep. |
| `seal_key` | Sunken Seal Key | key | A key cast as a seal. Opens the Drowned Throne. |
| `name_fragment_4` | Fourth Name Fragment | book | The Drowned Charter: Valewyn's names in Keeper ink. |
| `nilo_bell` | Nilo's Boat Bell | letter (reuse) | A small brass bell, green with river. |

The true charter is story state (`charter_restored`), not an inventory item.

### 2.4 Enemies, encounters, zones (section 6)

Enemies: `flood_hound`, `lockjaw_crab`, `ink_bloom`, `drowned_watch`, `gutter_phantom`, `blank_decree`,
`waterlogged_sentinel`, `barrister`, `barrister_witness` (its summoned add, a Blank Decree variant), `paper_regent`,
`writ_silence`, `writ_oblivion`. Encounters: `e4r_first`, `e4r_hounds`, `e4r_crabs`, `e4r_mixed`, `e4k1_watch`,
`e4k1_blooms`, `e4k1_crabs`, `e4k1_mixed`, `e4k2_phantoms`, `e4k2_sentinel`, `e4k2_mixed`, `barrister`, `e4k3_decrees`,
`e4k3_watch`, `e4k3_sentinels`, `paper_regent`. Zones: `ep4_flood_road`, `ep4_keep_f1`, `ep4_keep_f2`, `ep4_keep_f3`,
`ep4_keep_crown` in `EP4_ZONE_ORDER` (exported by the pack's `encounters.js`), kept out of `Object.keys(ZONES)` behind
`EP4_MAPS_LISTED` with the non-enumerable `defineProperty` pattern the X1 pack uses.

### 2.5 Scenes (`src/data/ep4/story.js`; map and trigger)

| Scene | Map | Trigger |
|---|---|---|
| `ep4_morning` | pk_inn | enter trigger from the pack patch (`if: ep3_complete`, counter `credits3_rolled`, `EP4_LIVE`, not `ep4_morning_done`, not `tier_1`) |
| `east_road_gate` | emberpeak | step trigger `east_road_trig` at the washout (`if: ep4_started`) |
| `flood_road_arrival`, `flood_first_fight`, `flood_lane` | ep4_flood_road | on enter; step column `first_fight_trig`; step trigger `lane_trig` |
| `ferry_rest`, `vw_view` | ep4_flood_road | campfire object (`safe`, `rest`); step trigger on the bluff |
| `vw_arrival`, `vw_statue`, `joss_locks`, `keep_ferry` | ep4_valewyn | on enter; statue object; `joss` talk entry; ferry object (`lock_crank`) |
| `regent_hall` | ep4_vw_palace | step trigger inside the door |
| `keep_f1_arrival`, `lyra_memory_1` | ep4_keep_f1 | on enter; step trigger in the central hall |
| `keep_f2_arrival`, `lyra_memory_2`, `vex_archive`, `barrister`, `coffer_records` | ep4_keep_f2 | on enter; step triggers; arena trigger; records object (`lantern: true`) |
| `keep_f3_arrival`, `principle_voice`, `principle_truth`, `principle_mercy`, `lyra_memory_3`, `witness_book` | ep4_keep_f3 | on enter; stone objects; chained from the third principle |
| `paper_regent`, `regent_after` | ep4_keep_crown | step trigger row; after the battle |
| `crown_remembers`, `ep4_ending` | ep4_valewyn | on enter by the ferry after `regent_after`; chained |
| `witnesses_start`, `testimony_hale`, `testimony_dorian`, `testimony_joss`, `council_choice`, `nilo_bell` | ep4_valewyn, ep4_flood_road | NPC talk entries and the council switch objects |
| silent: `keep_f1_lift`, `keep_f2_stair` | F1, F2 | step triggers that set `keep_f1_done`, `keep_f2_done` |

### 2.6 NPC ids (the pack's `npcs.js`, merged into `NPCS`)

New: `regent_e` (tag "The Regent", from `vw_arrived` until `lyra_named`), `lyra_n` (tag "Lyra", from `lyra_named`),
`hale`, `nilo`, `dorian`, `joss`, `ada` (sprite `npc_courier_v`), `vance`, `linn`, `sori`. Scene spawns: `king_m`,
`regent_m` (memory tints), `boatman_m`, `scribe_m`, `guard_m`, `vex` (as Episodes 2 and 3), `regent_t` / `lyra_t`,
`hale_t`, `joss_t` (Drowned Throne actors). Emberpeak, Hollowmere and Willowmere NPCs keep their ids and get Episode 4
entries through `prependTalk`. Portrait alias: `lyra` and `regent_e` speak with `noble_lady`.

### 2.7 Audio ids

Music: `valewyn`, `sunken_keep`, `boss_regent` (new); `millrace`, `mystery`, `sorrow`, `triumph`, `battle`,
`victory`, `gameover`, `first_bell`, `emberpeak` (reused). SFX: `tide_wheel`, `water_rise`, `water_drain`,
`seal_wash`, `seal_stamp`, `decree_void`, `decree_unroll`, `bell_drowned`. Ambience: `canal_rain` (new), `keep_drip`
(alias of `archive_hush` unless E4-audio has time).

### 2.8 Skills, statuses, tints, particles

Skill `answer` (hero). Enemy skills: `stamp`, `runoff`, `edict`, `objection`, `flood_decree`, `strike_roll`,
`trident_sweep`, `wet_seal`, `breach`, plus ordinary moves named in 6.2 (each id grepped by E4-battle before use). No
new status (Decrees ride the Heat counter; Nameless is reused). Tint `flood_grey` (added to `TINTS` by the pack). Rain
uses the existing `rain` particle kind.

---

## 3. The world link: Emberpeak's east road and the inn

Episode 3's Emberpeak has a decor-only washout at the east road (mark `east_road` (37, 15), sign `east_road_sign`,
x 39 rows 14 to 15) and the courier walks in from there. Episode 4 patches the **registered** Emberpeak and inn maps
from inside the `ep4` pack (`src/data/maps/ep4_patches.js`, the `hollow_gate.js` pattern), never the files in
`src/data/maps/ep3/`:

1. **`withEastRoad(emberpeak)`**: a rope ladder prop down the washout (`rope_ladder`, `if: east_road_open`), the step
   trigger `east_road_trig` (`east_road_gate`, `if: ep4_started`) two tiles west of the drop, and a door on the drop to
   `ep4_flood_road` (1, 15, 'right') present only while `east_road_open`. The sign reads a second state after
   `ep4_started` (line `east_road_sign_ep4`, conditional). Every Episode 3 mark, event and walk result unchanged.
2. **`withEp4Wake(pk_inn)`**: an enter trigger `ep4_wake` at (0, 0) with `script: 'ep4_morning'`, `on: 'enter'` (the
   E3-integrate pattern), and marks `ada_hearth`, `garrick_door` beside the existing `inn_bed`.
3. **Order trap (must not miss).** `registerMap` overwrites by id and the `ep3` pack registers `emberpeak` and `pk_inn`
   itself. The ep4 pack's map registration therefore **awaits the ep3 pack first** (`await ensurePack('ep3')`, or
   imports `../maps/ep3/index.js` and awaits its `register()`), then reads the registered module with `peekMap(id)`
   and registers the patched one. `packs.js` `ep4.touches` lists `emberpeak` and `pk_inn` so `world/maps.js` waits on
   both packs (`packsForMap`). A test loads the two maps with the ep3 pack only (unpatched, as Episode 3 shipped) and
   with both (patched).
4. Walk tests: with Episode 3 complete flags and `EP4_LIVE` off the washout is impassable and no trigger fires; with
   `east_road_open` the exit is reachable.

Also: the Keeper mirror network gains no new pair tonight (cut line 1 restores one in the Regent's Hall).

---

## 4. Maps

General rules: DESIGN 5.1 format and MAPS.md conventions; every scene mark exists and is reachable; enemy counts match
`ZONES[zone].plan`; every puzzle reads on screen without text; lit paths lead forward, dead ends hold chests; render
previews with `tools/maps/preview.py` and view them. Coordinates are approximate; the map author records exact cells in
`docs/MAPS_EP4_A.md` / `docs/MAPS_EP4_B.md`. **Phone rule (CRITIQUE_4 items 7 and 8, CRITIQUE_5):** every wheel's
mark, every tide post's water line and every basin's dry or flooded state must read at phone scale (flooded water is
animated turquoise with a bright rim; a drained canal floor is pale wet stone with dark weed lines at each mark);
field enemies get a rim light so they never camouflage on wet stone.

### 4.1 `ep4_flood_road`: The Flood Road (52 x 30, field)

The road drops from Emberpeak's washout (west) through a drowned farming valley to Hale's landing and the river
crossing (east). Enter at (1, 15).
- **The washout (x 0 to 12).** Rocky descent, rain begins, a broken cart. `first_fight_trig` covers the passable
  height of column x 7; the `e4r_first` group waits at the bend about (11, 17).
- **The drowned lane (x 13 to 26).** One basin `lane` (levels 2: low, mid), wheel `wh_lane` on a stone stand at a
  farm sluice (`lane_trig` runs `flood_lane` as you approach). Start state: mid; the lane is under water and the road
  ends at it. Low: the lane drains and the road goes on east. Mid again: the moored punt `pt_lane` floats and bridges
  a ditch north to a wood chest. Tide post `post_lane` beside the wheel.
- **Hale's landing (x 27 to 40).** A tarp, the campfire `ferry_fire` (`script: 'ferry_rest'`, `safe`, `rest`), Hale
  (`hale`, shop `ferry_peddler`) and Nilo. Two groups nearby on the dry banks.
- **The bluff (x 41 to 51).** The `vw_view` trigger at about (45, 8) with the decal `valewyn_far` (environments cell 3,
  quantized) in the overhead layer. One group. The ferry door at the landing (`ferry_vw`, `kind: 'boat'`, a lift door
  with a boat sprite) to `ep4_valewyn` `ferry_in` (present from `saw_valewyn`).
- Enemies (4): e4r_first 1, e4r_hounds 1, e4r_crabs 1, e4r_mixed 1. Chests: wood (`hi_potion` x2, the punt), iron
  (Dash boulder, rolled). Marks: `entry`, `lane`, `fire`, `hale_spot`, `nilo_spot`, `bluff`, `valewyn_far`, `ferry`.

### 4.2 `ep4_valewyn`: Valewyn (44 x 34, town)

A Dragon Quest town that reads at a glance on a phone, built around one image: a faceless crowned statue in a plaza of
canals, with the half-drowned Keep beyond the north wall.
- **South landing** (ferry in, mark `ferry_in`). **The Drowned Crown Plaza** in the middle: the statue (`statue`,
  object, `script: 'vw_statue'`), the flood board (`flood_board`, sign with three states: running notices, a dry
  forged order, blank after `vw_restored`), sandbags, two council switches (`switch_shelter`, `switch_records`,
  objects, `script: 'council_choice'`, present from `witnesses_started`), canal bridges.
- **North:** the Regent's Hall (door to `ep4_vw_palace`). **West:** the Floodwatch Inn. **East:** the Riverbank
  Provisioner. **South-east:** the Crown Guard Forge. **North-east:** the canal works with Joss (`joss`) and the city's
  great lock wheel (`great_lock`, decor until `crown_remembers`).
- **North landing:** the Keep ferry (`keep_ferry_obj`, object `script: 'keep_ferry'`, needs `lock_crank`; after
  `keep_ferry_open` a boat door to `ep4_keep_f1` `start`).
- **The river quarter (south-west):** streets under water (`overlays` with `ifNot: 'vw_restored'`), roofs showing; after
  `vw_restored` they drain to wet cobbles (a flag-driven overlay swap, no tide event).
- Rain particles until `vw_restored`. Marks: `ferry_in`, `plaza`, `statue`, `board`, `palace_door`, `inn_door`,
  `shop_door`, `forge_door`, `canal_works`, `keep_landing`, `crowd_a` to `crowd_d`, `gather_lyra`, `gather_hale`,
  `gather_joss`, `gather_vance`, `night_view`.

### 4.3 Interiors (copy the Willowmere counterpart's layout and exits, then re-dress)

| id | from | contents |
|---|---|---|
| `ep4_vw_inn` | `inn` | the innkeeper (inn, 80 gold), oilskins drying, mark `inn_bed` (the post-credits wake point). |
| `ep4_vw_shop` | `item_shop` | Linn helps at the Provisioner (shop `riverbank`), rope, waxed ledgers. |
| `ep4_vw_forge` | `smithy` | Vance off duty and the Crown Guard smith (shop `vw_forge`). |
| `ep4_vw_palace` | `chapel` | the Regent at a long table of decrees (`regent_e`), the save bell (`save` event), `regent_trig` two tiles in, Dorian at the archive shelf. Marks `regent_spot`, `table`, `dorian_spot`. |

### 4.4 The tide grid (how a keep map declares water)

A map with tide locks adds a `tide` block (E4-world reads it; mapcheck models it):
```js
tide: {
  basins: { a: { start: 1, levels: 3, wheel: 'wh_a' }, b: { start: 0, levels: 3, wheel: 'wh_b' } },
  basin:  [ '....aaaa..bbb...', ... ],   // which basin a cell belongs to ('.' = none), same size as ground
  height: [ '....0012..011...', ... ],   // the cell's floor height inside its basin: 0 channel floor, 1 walkway, 2 gallery
}
```
At level L a basin cell of height h is **flooded** (collision `water`, drawn as water) when h < L and **dry** (its own
tile's collision) when h >= L. Level 0 is everything dry. Authoring rules mapcheck enforces: two orthogonally adjacent
walkable cells of different heights must have a stair tile between them or a solid ledge face (no free step between
heights); a wheel's faced cells are height 2 or outside every basin (the player never stands where the water rises);
no enemy, NPC or trigger stands on a basin cell below height 2; at most 3 basins per map (27 level states).

### 4.5 `ep4_keep_f1`: The Tidegate Causeway (40 x 30, dark 0.2)

The teaching floor for tide locks. Areas:

| Area | Approx. floor | What it does |
|---|---|---|
| A. Water Gate | x 16 to 23, y 24 to 28 | Arrival by boat (`start` 19,27,'up'), the font `font_k1` (rest and save, `safe`), the boat back to Valewyn. |
| B. The Papered Door | x 12 to 27, y 14 to 21 | **Puzzle B (wash):** basin `a`, levels 3, start 1. A door on the canal floor (height 0) papered with a forged notice (`seal_b`, `forgery: true`, `h: 0`). At low (0) the door is dry but sealed; raise to high (2): the water closes over the door and the seal washes off (permanent, red ink cloud, `seal_wash`); lower to low: walk through to a wood chest and the way north. The lesson: high water washes a forgery off, and it stays washed. `keep_f1_arrival` on enter. No enemies here. |
| C. The Pontoons | x 29 to 38, y 4 to 20 | Two groups on dry walkways. **Puzzle C (float):** basin `b`, levels 3, start 0. Three moored pontoons (`pontoon`, `rides: [1, 2]`) in a channel between walkways; at mid (1) they float level with the walkways and bridge east; at low they sit on the channel floor as solid boats. Wood chest `tide_key` (flag `tide_key_f1`). Dead end at low water on the channel floor: Nilo's bell chest (`nilo_bell`, flag `nilo_bell_found`, present only `if: 'nilo_started'`). |
| D. The Audience Hall | x 2 to 10, y 6 to 20 | Behind the locked door `door_d` (`tide_key`). The central hall with the step trigger `memory1_trig` (`lyra_memory_1`). Two groups. A Dash-cracked wall to a gold chest (`tidewalker_boots`). |
| E. North Gallery | x 12 to 26, y 2 to 7 | Gallery height 2, reached only at high water in basin `b`, when one pontoon (`pt_e`, `rides: [2]`) rises to gallery height under the gallery stair. Gold chest `seal_key` (flag `seal_key_found`). One group. |
| F. The Eastern Tidegate | x 28 to 38, y 22 to 28 | **Puzzle F (pressure):** the canon chokepoint. A floodgate `tidegate` whose source is basin `b` at level 2 (a counterweight float lifts it), `latch`, flag `tidegate_open`: once lifted it stays open. Lowering `b` afterwards (needed for C's route back) keeps it open. Behind it, the lift down to `ep4_keep_f2`; its trigger sets `keep_f1_done`. One group. |

- Enemies (6): e4k1_watch 2, e4k1_blooms 1, e4k1_crabs 2, e4k1_mixed 1. Chests: wood (B), wood (`tide_key`), wood
  (`nilo_bell`, conditional), gold (`tidewalker_boots`, Dash), gold (`seal_key`), iron (F, rolled). Marks: `start`,
  `font`, `papered`, `pontoons`, `audience`, `gallery`, `tidegate`, `lift_down`.

### 4.6 `ep4_keep_f2`: Archives Below Water (40 x 30, dark 0.45)

Stacks rise out of black water; book crates are pontoons; lanterns on chains are the light. A ring of reading floors
around a drowned scriptorium (a pit void that drops to F1's Pontoons, never a dead end).

| Area | Approx. floor | What it does |
|---|---|---|
| A. Stair Foot | x 2 to 10, y 22 to 28 | Arrival; `keep_f2_arrival`; font `font_k2`. |
| B. The Stacks | x 2 to 12, y 4 to 18 | **Puzzle B (two heights):** basin `a`, 3 levels. Book-crate pontoons at mid reach the walkway shelves; at high they reach the top gallery and a side room (iron chest). The step trigger `memory2_trig` (`lyra_memory_2`) at the drowned scriptorium's rail. Two groups. |
| C. The Dry Room | x 14 to 22, y 2 to 8 | The glass dome; `vex_trig` (`vex_archive`); the feather prop (`feather_dry`). Reached at low water across a channel floor in basin `b`. |
| D. Two Locks | x 24 to 38, y 2 to 18 | **Puzzle D (series):** basins `b` and `c` joined by an inner lock: `c`'s wheel stands on a walkway that is dry only while `b` is low; `c` at high washes a papered door (`seal_d`) on the far side; then `b` at mid floats the crate to it. Order is forced by reach, never by a wrong answer (washing is permanent). Wood chest (`tide_key`, flag `tide_key_f2`). Two groups. The Coffer: a records alcove in `c` with Keeper tide marks (`coffer_obj`, `lantern: true`, `script: 'coffer_records'`) readable only while `c` is high: true ink under water; opens a hidden door to the cache (gold chest, present `if: 'coffer_found'`: 190 gold, 2 `hi_ether`, book `keep_ledger`). |
| E. The Court Room | x 14 to 26, y 12 to 24 | The Barrister's arena (`barrister_trig`, `barrister`), locked door `door_e` (`tide_key`) on the approach, a font room `font_k2b` before it. After the win: the stair down; its trigger sets `keep_f2_done`; a boat door `boat_f2_short` (`if: 'keep_f2_done'`) to F1's Water Gate. One group on the approach. |

- Enemies (5): e4k2_phantoms 2, e4k2_sentinel 1, e4k2_mixed 2, plus the Barrister. Chests: iron (B side room, rolled),
  gold (cache, optional), wood (`tide_key`), wood (`hi_potion` x2). Marks: `arrival`, `stacks`, `scriptorium`,
  `dry_room`, `vex_chair`, `locks`, `coffer`, `arena`, `barrister_spot`, `stairs_down`.

### 4.7 `ep4_keep_f3`: The Court of Witnesses (44 x 32, dark 0.3)

Three wings, three principle stones, one gate. White marble going green at each tide mark.

| Area | Approx. floor | What it does |
|---|---|---|
| Hub | x 16 to 27, y 14 to 22 | Arrival (`keep_f3_arrival`). The Petition Gate `petition_gate` in the north face (a `gate` with `flags: ['principle_voice', 'principle_truth', 'principle_mercy']`, three sockets that light), the principles carved over it (sign). After `keep_f3_arrived` a boat door `boat_f3_short` in the south-east to F1's Water Gate. |
| West: Voice | x 2 to 14, y 4 to 26 | A flooded hall with one wheel and a stone on an island. **Sequence:** basin `v`, 3 levels; low exposes a causeway that reaches a second stair; mid floats a pontoon from that stair to the island; the stone `stone_voice` (object, `script: 'principle_voice'`). Two groups. |
| East: Truth | x 29 to 41, y 4 to 26 | Two papered doors at heights 0 and 1, one wheel: high washes both at once only if the player has first opened the low door's shutter (a heavy block that dams the inflow: Shove it out). The stone `stone_truth` behind them. Two groups. |
| South: Mercy | x 10 to 33, y 24 to 30 | The darkest wing, lit by lanterns on chains that only show at high water (their reflections). Lantern secret: Keeper ink marks under water show a hidden door (`wall_glyph`, reused) to a gold chest `tidewarden_spear` and a Keeper note (`lantern: true`). The stone `stone_mercy`. One group. |
| Witness Antechamber | x 17 to 26, y 5 to 11 | Behind the Petition Gate: `lyra_memory_3` and `witness_book` run at `gate_spot` (chained from the third principle; if the third stone is struck in a wing, the scenes run on the party's next arrival at `gate_spot`), the lectern `witness_lectern`, font `font_k3`, the Sunken Seal Key door `door_throne` (`seal_key`, `door_boss` style) to `ep4_keep_crown`. Wood chest (`lamp_oil` x2). |

- Enemies (5): e4k3_decrees 2, e4k3_watch 2, e4k3_sentinels 1. Chests: gold (`tidewarden_spear`, Lantern), iron x2
  (rolled), wood (`lamp_oil` x2). Marks: `arrival`, `hub`, `gate_spot`, `stone_voice`, `stone_truth`, `stone_mercy`,
  `lectern`, `font`, `throne_door`.

### 4.8 `ep4_keep_crown`: The Drowned Throne (24 x 20)

A round throne room, ankle water on the floor (decor water, collision `none`: shallow). The Paper Regent's map actor
`paper_regent` (sprite `paper_regent_avatar`) on the throne (a 4 x 4 object, frames: occupied, empty). The Witness Book
page on a side table after the fight. Step trigger row `regent_trig` about row 14. After `paper_regent_defeated`: actors
`regent_t`, `hale_t`, `joss_t` (`if: paper_regent_defeated`, `ifNot: vw_restored`), and the boat `boat_crown_out` to
`ep4_valewyn` `keep_landing` (its arrival runs `crown_remembers`). Marks: `throne`, `party_stop`, `table`, `lyra_enter`,
`lyra_sign`, `charter_spot`.

### 4.9 Marks and named events checklist (for `qa/maps`, mirrored in `STAGING_EP4.md`)

| Map | Marks / named events |
|---|---|
| `emberpeak` (patch) | `east_road_trig`, `rope_ladder`, east door; `pk_inn` (patch): `ep4_wake`, `ada_hearth`, `garrick_door` |
| `ep4_flood_road` | as 4.1; enemy `e_e4r_first`; wheel `wh_lane`; pontoon `pt_lane`; objects `ferry_fire`; NPCs `hale`, `nilo` |
| `ep4_valewyn` | as 4.2; NPCs `vance joss sori ada`; objects `statue`, `flood_board`, `switch_shelter`, `switch_records`, `keep_ferry_obj` |
| `ep4_vw_*` | as 4.3; NPCs `regent_e`/`lyra_n`, `dorian`, `linn` |
| `ep4_keep_f1` | as 4.5; basins `a`, `b`; seal `seal_b`; floodgate `tidegate` |
| `ep4_keep_f2` | as 4.6; basins `a`, `b`, `c`; seal `seal_d`; object `coffer_obj` |
| `ep4_keep_f3` | as 4.7; gate `petition_gate`; stones; lectern; heavy block in Truth |
| `ep4_keep_crown` | as 4.8; actor `paper_regent`; boat `boat_crown_out` |

---

## 5. Field systems (E4-world)

### 5.1 Tide locks: the Episode 4 field mechanic

**Why this one.** It is the Keep's own logic (canon's tide sluices and pumps, and `game.js`'s "lower the water twice to
expose its submerged stones"), it reads from the floor art alone (water you can see standing at a striped post, dry
wet-stone where it drained, boats that float or sit on the bottom), it needs no timing (no step timers, no real-time
pressure, phone-safe), it adds no damage tiles and no word grids, and it costs little: the walkability rule is one
comparison per cell, the collision change is the overlay mechanism the field already has, the permanence is Episode 3's
`g.quenched` pattern, the floodgates are ordinary gates with a new source, the dams are W9's heavy blocks. What makes it
play differently from beams and quench: **the same wheel both opens and closes routes**. Raising water closes the
channel floor and opens the floats; lowering it does the reverse. Puzzles become "which level, in which basin, in which
order", with one permanent rule on top (washed forgeries stay washed) so sequences cannot undo themselves.

**Event types** (new, in the existing `{ id, type, x, y, if?, ifNot? }` shape, registered on `EXT` by the pack):

| type | fields | behavior |
|---|---|---|
| `tidewheel` | `basin`, `sprite?` (`tide_wheel`) | A lock wheel on a stand. Confirm while facing (with `lock_crank` held; the road's farm wheel has `crank: false`) cycles its basin's level: low, mid, high, low (or low, mid, low for a 2-level basin). Solid, always faced, never stood on. Plays `tide_wheel`, then the fill or drain. Its frame shows the level (a big pointer at one of three marks). |
| `tidepost` | `basin` | Decor with meaning: a striped post whose drawn water line sits at the basin's level. |
| `pontoon` | `basin`, `rides?` (default `[1, 2]`) | A moored float on a basin cell. At a level in `rides` it floats: the cell is walkable (overrides water) and the sprite bobs 1 px (off under reduceMotion). At level 0 it sits on the floor: solid. At a level above its cell height but not in `rides` it is under the surface: drawn submerged, cell flooded. |
| `forgery` | `h`, `target?`, `sprite?` (`seal_paper`) | A forged paper seal on a door or passage cell. Solid while present. Washed **permanently** the first time its basin's level exceeds `h` (stored in `g.washed[mapId]`, red ink cloud, `seal_wash`, bark `first_wash`). Then the cell is its own tile (a door that opens). |
| `floodgate` | `basin`, `at` (level), `latch?`, `flag?`, `script?` | A gate source: open while its basin's level is at least `at`; with `latch`/`flag` it stays open once opened (Episode 3 basin rules). Use for the Eastern Tidegate and shortcuts. |

**The rule** (`src/data/ep4/field/tide.js`, pure, node-tested):
- `levels(map, state)` returns, for every basin, its current level; `flooded(map, state)` returns the set of cell indices
  that are water now: a basin cell of height h with h < level, minus pontoon cells that float at that level.
- `solid(map, state)` adds grounded pontoons and unwashed forgeries.
- `washes(map, state, washed)` returns the forgeries newly washed at this state (monotone).
- Deterministic, no randomness, no timers. Recompute on load, wheel turn, block move, gate change.

**Collision and drawing.** The field applies the rule through the existing overlay path: flooded cells get collision
`water`, floating pontoons `none`, grounded pontoons and forgeries `solid` (E4-world chooses the cheapest hook: an
overlay set rebuilt per state, as quench swaps crust). Water is drawn as an animated turquoise layer over the floor
(3 frames, autotiled edges with a bright rim and foam against walls); drained cells show pale wet stone with dark weed
lines at each height mark. A level change animates as a 24-frame rise or fall drawn band by band (input locked for
those frames only; instant under reduceMotion), with `water_rise` or `water_drain`.

**Persistence.** Basin levels reset to `start` on map re-entry (as sluices and blocks do), so every arrival sees the
authored state. Washed forgeries (`g.washed[mapId]`) and latched floodgates (`g.opened`, their flag) persist through
the save. `g.washed` is additive: old saves load without it.

**Softlock rules** (asserted by `qa/maps` and `mapcheck`): wheels are faced from height-2 or non-basin cells; no actor
starts on a floodable cell; every arrival point reaches each wheel of its floor at the start levels; the critical path
is reachable in some sequence of level states explored breadth first (all `3^k` states, `k <= 3`, with washes as
one-way unlocks and Shove dams); no state strands the player (from every reachable state the entrance is reachable,
because levels can always cycle back from the wheel's stand); chests on channel floors are reachable at low water.

**Teaching ladder** (one idea per step): road lane (one wheel, two levels: drain to walk, raise to float) -> F1 B (high
water washes a forgery, then drain to walk through) -> F1 C (pontoons bridge at mid) -> F1 E (a pontoon reaches the
gallery at high) -> F1 F (water lifts a floodgate; it stays open) -> F2 B (two heights, one basin) -> F2 D (two basins,
one wheel reachable only when the other is low) -> F3 Voice (a sequence across a hall) -> F3 Truth (a block dam and two
forgeries) -> F3 Mercy (the dark: the high water is the light). First-time barks in the pack's `BARKS`: `first_tide`
(scene 6's line), `first_wash` (Mira: "Forged ink runs. It ran."), `first_float` (Bram: "Boats. Of course. It's a
city."), `first_true_ink` (Mira: "That didn't run. That one's real.").

### 5.2 Small additions

- **Boat doors.** `door` with `kind: 'boat'`: the lift door behavior of Episode 3 with a boat sprite and `water_rise`
  as its sound; no other new logic.
- **Tint and particles.** New tint `flood_grey` (cool grey-green multiply, lower saturation; it must read at least 10%
  darker than `none` on a phone crop, measured as Episode 3 did for `ash_haze`), added to `TINTS` by the pack. Rain uses
  the existing `rain` particle kind, area-limited, under 0.3 ms per frame.
- **Memory vignettes.** Reuse Episode 3's memory tint for the Regent's memories (`regent_m`, `king_m`, `boatman_m`,
  `scribe_m`, `guard_m`).
- **Speaker swap.** The Garrick mechanism (two records, actor swapped under the name flash) for "The Regent" to "Lyra".

### 5.3 Story plumbing (inside the pack, plus the seams of section 13.2)

- The pack's `story.js` hands its scenes, lines and conditions to `registerStory`; a content test asserts ids unique
  across all four episodes and the X1, cave and tier packs.
- The `ep4_complete` handoff: the pack adds `CREDITS_HANDOFF[4] = { cards: CREDITS_EP4, music: 'valewyn', map:
  'ep4_vw_inn', mark: 'inn_bed', counter: 'credits4_rolled', endCard: END_CARD_EP4, flag: 'ep4_complete' }` and, while
  `EP4_LIVE`, replaces `CREDITS_HANDOFF[3].endCard` with `END_CARD_EP3_LIVE` ("Episode 4 begins in the morning.").
  `creditsPending` in `story.js` is generalized to read the table (seam 4).
- `mainQuestFor` switches to the pack's `MAIN_QUEST_EP4` on `ep4_started` through the quest hook (seam 5);
  `epilogue3` Talk and journal point at the east road while `EP4_LIVE`.
- Ledger rows: the pack pushes rows onto `LEDGER` (Lyra on `lyra_named`, Hale on `testimony_hale`, Dorian on
  `testimony_dorian`, Joss on `met_joss`, Ada on `ep4_morning_done`, Nilo on `nilo_done`, Linn, Vance and Sori on
  `vw_restored`) with a `PLACES.valewyn` entry and `REACHED.valewyn = 'vw_arrived'`. The hero's row stays unkept.

### 5.4 Shortcuts

| From | To | Present while |
|---|---|---|
| F2 boat `boat_f2_short` | F1 Water Gate | `keep_f2_done` |
| F3 boat `boat_f3_short` | F1 Water Gate | `keep_f3_arrived` |
| F1 Water Gate boat | Valewyn north landing | `keep_entered` |
| Hale's punt (council shelter only) | F1 landing to Valewyn south landing | `council_shelter` |
| `boat_crown_out` | Valewyn north landing | `paper_regent_defeated` |

### 5.5 W9 abilities and the Lantern in Episode 4

| Ability | Where | Critical? | Fallback |
|---|---|---|---|
| Shove | F3 Truth dam (critical) | yes | the block becomes `push: true` |
| Dash Strike | road boulder (iron chest), F1 D cracked wall (Tidewalker Boots) | no | breakable object |
| Appraise | 7 bestiary entries; the Barrister and the Regent readable in the field (phase 1) | no | in-battle |
| Lantern | F2 coffer (side story), F3 Mercy hidden door (Tidewarden Spear); both only while their basin is high (true ink under water) | no | exists |

---

## 6. Combat (E4-battle)

### 6.1 Level and EXP targets

`expForLevel`: 17 5280, 18 6038, 19 6853, 20 7727, 21 8659 (Fact, `party.js`). Episode 3 finishers arrive at about
5,585 (the simulator's Episode 3 finish, `tools/sim/tier.mjs`).

| Zone | Plan fights | Level in | Level out (all fights) | First-pass EXP |
|---|---|---|---|---|
| ep4_flood_road | 4 | 17 | 18 | +480 |
| ep4_keep_f1 | 6 | 18 | 19 | +720 |
| ep4_keep_f2 | 5 + the Barrister | 19 | 19 (near 20) | +620, +220 for the Barrister |
| ep4_keep_f3 | 5 | 19 | 20 | +650 |
| ep4_keep_crown | 1 | 20 | 21 | +800 |

At 80% of fights the Regent is fought at Lv 20. About 120 EXP an ordinary fight.

### 6.2 Enemy roster

First pass, scaled from Episode 3's F3 band by the 6.8 method of `EPISODE2_PLAN.md`; **the simulator targets are
binding**. Every ordinary foe uses a different `enemies.webp` cell, so each reads as a new being.

| id | Name | Family, size | Lv | HP | ATK / MAG | DEF / SPR | SPD | Sh | Weak | Resist | EXP / Gold | Moves (**telegraph**) | Trait | Art |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `flood_hound` | Floodhound | beast | 17 | 420 | 88 / 16 | 24 / 16 | 18 | 2 | thunder, spear | ice | 95 / 110 | Bite, Undertow (Chill 20%) | evade 0.1 | cell 2, river-grey fur, weed mane |
| `lockjaw_crab` | Lockjaw Crab | beast, shell | 17 | 400 | 90 / 12 | 40 / 18 | 9 | 4 | thunder, axe | ice, sword, bow | 100 / 120 | Claw, Clamp (Stun 15%), Shell Up | basic | cell 3, barnacled shell, rust claws |
| `ink_bloom` | Ink Bloom | ooze | 17 | 360 | 60 / 88 | 14 / 24 | 11 | 2 | fire, light | ice | 96 / 110 | Blot (Blind 25%), Stamp (forced opener), **Runoff** (party mag 110%) | Decree | cell 0, runny blue-black ink, a red seal floating in it |
| `drowned_watch` | Drowned Watch | undead | 18 | 520 | 100 / 30 | 30 / 22 | 12 | 4 | light, thunder | ice | 110 / 140 | Halberd, Cover, Shield Wall | Cover | cell 5, waterlogged guard plate, black-green weed |
| `gutter_phantom` | Gutter Phantom | spirit, flying | 18 | 440 | 60 / 104 | 16 / 30 | 15 | 3 | light, fire | ice | 115 / 130 | Murk (party Blind 15%), Drag Under (Silence 25%), Cold Touch | evade 0.2 | cell 7, murky green, drowned lantern eyes |
| `blank_decree` | Blank Decree | paper, flying | 19 | 480 | 70 / 110 | 18 / 34 | 16 | 3 | fire, bow | thunder | 125 / 150 | Paper Cut, Stamp, **Edict** (single mag 220% + Silence 30%) | Decree | cell 6, cream paper wings, a red seal for an eye |
| `waterlogged_sentinel` | Waterlogged Sentinel | construct, large | 19 | 720 | 120 / 30 | 40 / 22 | 8 | 5 | thunder, axe | sword, spear, ice | 140 / 170 | Slam, Floodfist, **Breach** (party phys 150%, a charge) | charge | cell 4, swollen stone and paper, kelp |

Groups: e4r_first = ink_bloom, flood_hound (scripted, the Bloom forced to Stamp first); e4r_hounds = flood_hound x2;
e4r_crabs = lockjaw_crab x2; e4r_mixed = flood_hound, ink_bloom. e4k1_watch = drowned_watch, lockjaw_crab; e4k1_blooms
= ink_bloom x3; e4k1_crabs = lockjaw_crab x2, ink_bloom; e4k1_mixed = drowned_watch, ink_bloom. e4k2_phantoms =
gutter_phantom x2; e4k2_sentinel = waterlogged_sentinel, gutter_phantom; e4k2_mixed = drowned_watch, blank_decree.
e4k3_decrees = blank_decree x2, ink_bloom; e4k3_watch = drowned_watch x2, gutter_phantom; e4k3_sentinels =
waterlogged_sentinel x2. Elites at the normal rate.

### 6.3 Decrees (the episode's one battle rule, on the Heat counter)

Decrees are Episode 3's Heat counter with a different verb, so the rules, the AI planning, the telegraph and the scene
pips are reused; the new part is data and two seam lines (13.2 seam 6).
- A foe with `heat: { max: 3, step: 0.15, flare: '<skill>', quench: 'fire', verb: 'decree' }` gains 1 Seal each time
  it uses Stamp (the Stoke move with a new name and sfx `seal_stamp`). Each Seal gives +15% ATK and MAG ("its case
  grows stronger").
- On reaching 3 it announces its decree one turn early ("The Ink Bloom reads out a decree...", `decree_unroll`), and
  uses it on its next turn.
- **Void:** any fire damage, Lamp Oil, a Break, or the hero's Answer sets the Seals to 0, cancels a pending decree, and
  plays `decree_void` with a torn-paper puff ("Voided!"). This is the field mechanic's verb in battle: forged ink does
  not hold.
- Seal pips (3 small red wax seals instead of flames) draw where Heat's pips draw, **always visible while a command is
  being chosen**, under the feet or above the head, never across a body (CRITIQUE_4 item 1).
- The Auto policy (`competent`) learns it as it learned Heat: void a foe at 2 Seals or more if it can, Defend against an
  announced decree otherwise; the hero answers a `strike_roll`.

### 6.4 Mini-boss: the Inkbound Barrister (`barrister`)

Boss table, no flee, music `battle`, backdrop `archive_deep`, flag `barrister_defeated`, ai `barrister` (registered by
the pack). Lv 19, HP 2000, ATK 110, MAG 120, DEF 26, SPR 28, SPD 13, 6 shields, weak fire, light, spear; resist ice,
thunder; immune Silence. Decree max 3.
- It **Stamps every turn** (its sleeves are full of paper). At 3 Seals it announces **Objection** (party mag 150%,
  Silence 40%): "The Barrister rises. 'Objection!'..." Answers: void it first (fire, Lamp Oil, Break), or Defend.
- At 50% it "calls a witness": summons `barrister_witness` (a small Blank Decree, HP 300, 2 shields, weak fire) that
  Stamps the Barrister each turn. Kill the witness or keep voiding: one idea, taught twice.
- Targets: careful 7 to 9 rounds, win 85%+; attack-only 60% or less; ignoring the telegraph costs at least 10 points.
- Rewards: EXP 220, gold 800, mastery 18. Drops: unique `barristers_quill`, 1 rare roll (ilvl 18), hi_potion 2.
- Art: `enemies.webp` cell 1 (the spectral wraith) recolored to a drowned advocate (black gown, white collar, ink-blue
  hands, paper in the sleeves), at 1x within the 96 px enemy cell, derived frames via `anim_frames.py`.

### 6.5 Boss: the Paper Regent (`paper_regent`), the hero at the center

Boss table, no flee, music `boss_regent`, backdrop `throne`, flag `paper_regent_defeated`, ai `paper_regent`
(registered by the pack). Lv 20, HP 3800, ATK 180, MAG 175, DEF 26, SPR 24, SPD 13, family construct; immune to Stun,
Poison, Blind. Decree max 3. HP locks so one hit never skips a phase.

1. **Forged Edicts** (100% to 70%). Weak fire, spear; resist ice, thunder; 7 shields; DEF x1.4 (armored, canon).
   Trident Sweep (party phys 100), Wet Seal (single mag 120, Chill 30%), Stamp. At 3 Seals it announces **Flood
   Decree** (party mag 140%, Chill 30%): "The Regent unrolls a decree. The water rises around it..." Voided by fire,
   Lamp Oil, Break or Answer.
2. **Royal Ward** (from 70%). Summons **Forged Writ of Silence** and **Forged Writ of Oblivion** (canon). While either
   stands the ward holds: the Regent takes 25% damage, its shields cannot be chipped, and its HP cannot fall below 31%
   (canon lock).
   - `writ_silence`: Lv 20, HP 420, 2 shields, weak fire; resist ice. **Mend the Seal** (heals the Regent 6% every
     turn) and **Hush** (Silence 35% on one caster) every 2 turns. Kill it first and the healing stops.
   - `writ_oblivion`: Lv 20, HP 460, 3 shields, weak spear (canon: piercing), fire; resist ice. **Stamp the Regent**
     (+1 Seal to the Regent every turn). Kill it first and the Flood Decree slows down.
   - The decision is which writ first. When both are gone the ward breaks: the Regent is Broken one turn and the party
     gains 25 Fury (canon).
3. **The True Charter** (after the ward). Weak fire, spear, light; no resists; 8 shields; Haste; DEF normal. Trident
   Sweep, Flood Decree (at 3 Seals), and **Strike from the Roll** (`strike_roll`) announced every 3rd turn on the hero:
   "The Regent unrolls a decree with {hero}'s name on it..." If it lands, the hero takes single mag 200% and becomes
   **Nameless** (the existing status: Silence and a stat drain, cured by Recall or Silver Salve), and the Regent gains
   +20% ATK and MAG. Answers: the hero uses **Answer** on the Regent before it fires; or Break the Regent; Defend halves
   the damage but does not stop Nameless. Strike from the Roll is a charge, not a Decree: fire does not void it.

**Answer** (`answer`, the hero, 10 MP, one foe; learned in `witness_book` through `learn: { flag: 'hero_signed' }`,
fallback `learn: { level: 19 }`). Voids the target's pending decree or `strike_roll` charge and sets its Seals to 0; if
something was pending, the target is **Broken** ("{hero} answers to their name. The decree will not stand.",
`decree_void`). Until the hero's next turn the hero cannot be made Nameless. With nothing pending it still voids the
Seals (a small light hit, power 60), so it is never a wasted turn. Help text (under 40 characters): "Answer to your name.
Voids a decree."

This is the boss's central decision and it is the hero's: read the telegraph, keep the hero's MP and turn order for it,
and the Regent's biggest move becomes the party's Break window. It answers Bram's "become the target" with the hero's
"answer for yourself": the move names you, and you are the one who must reply.

- **Council bonus:** with `council_records` the party starts with +25 Fury (encounter option `startFury`, as Episode
  3's coolant).
- Targets: careful 10 to 14 rounds, win 85%+; attack-only 60% or less; ignoring telegraphs costs at least 15 points;
  careful play uses Answer on at least half the Strikes.
- Rewards: EXP 800, gold 1100, mastery 28. `BOSS_LOOT.paper_regent`: unique `regents_seal` (The Broken Seal), 2 rare
  rolls (ilvl 20), phoenix_feather 1, hi_ether 2. Lyra's gift is staged in `regent_after`.
- Art: `bosses.webp` cell 3 at 1x in the 160 x 144 boss cell; three looks: Forged Edicts (as painted, a darker
  turquoise, red seals on the robes), Royal Ward (a pale paper halo of floating writs), True Charter (robes unrolled to
  bare vellum, the crown paper, the trident a pen); a field avatar at map scale with a back frame. Writs: a small new
  sprite (a scroll on a brass stand with a wax seal), two recolors.

### 6.6 Simulator

`tools/sim/ep4.mjs` registers the `ep4` pack data (the X1 pattern) and adds `EPISODES[4] = EP4_ZONE_ORDER` through one
line in `simulate.mjs`. Zones, `LOADOUTS` (ep4_flood_road = the `foundry_heart` loadout plus the First Bell Hammer,
the Ember Heart and tier 6 gear; keep_f1 plus two tier 7 pieces; keep_f2 plus Tidewalker Boots; keep_f3 plus two tier
8 pieces; keep_crown plus the Barrister's Quill and mastery up one step), `TARGETS` (ordinary as Episodes 1 to 3, with
Keep F3 the tightest ordinary floor: careful HP lost 18 to 24%, attack-only win 70 to 85%; `barrister` and
`paper_regent` as 6.4 and 6.5; `levels` from 6.1). The policies learn Decrees and Answer. Tune until `--check` prints
"All targets met" for all four episodes; `--cave --check` and `--tier 1 --check` unchanged.

---

## 7. Loot, items and shops

### 7.1 Consumable

| id | Name | Price | Effect |
|---|---|---|---|
| `lamp_oil` | Lamp Oil | 110 | Fire damage (power 130) to one foe and voids its Seals and pending decree. |

### 7.2 Equipment (new bases)

Tier 7 (ilvl 17; Valewyn from arrival): `riverguard_plate` (body, hero/bram, 3600, DEF +27, SPR +4), `scribes_robe`
(body, mira, 3500, DEF +16, SPR +14, MAG +6), `riverguard_helm` (head, hero/bram, 1700, DEF +12, SPR +3), `oilskin_hood`
(head, mira, 1700, DEF +6, SPR +10, MAG +5), `wader_boots` (boots, all, 1500, SPD +3, DEF +3, ice resist 10%),
`ferry_mantle` (mantle, all, 1400, DEF +6, SPR +4, LUK +3), `waxseal_charm` (charm, all, 1300, Silence resist 50%, SPR
+4), `tidemark_charm` (charm, all, 1300, Chill resist 50%, DEF +3).

Tier 8 (ilvl 19; the Crown Guard Forge after `keep_f2_done`): `crownguard_sword` (sword, hero, 4800, ATK +46, crit
+6), `lockwright_axe` (axe, hero/bram, 4900, ATK +52, SPD -1), `riverguard_halberd` (spear, bram, 4850, ATK +48, DEF
+4), `charter_rod` (staff, mira, 4800, ATK +14, MAG +40, SPR +6, MP +12), `reedline_bow` (bow, mira, 4800, ATK +42, SPD
+1, crit +4), `crownguard_mail` (body, hero/bram, 4200, DEF +32, SPR +5), `archivist_robe` (body, mira, 4100, DEF +20,
SPR +16, MAG +7), `crownguard_helm` (head, hero/bram, 2100, DEF +14, SPR +4).

### 7.3 Uniques and the set (placed, never random)

| id | Name | Rarity | Slot | Stats | Source |
|---|---|---|---|---|---|
| `tidewarden_trident` | Tidewarden's Trident | legendary | spear (bram) | ATK +54, crit +6, fire +10%, Fury gain +10% | Lyra in `regent_after`, truth path (`lyra_truth`) |
| `regents_pardon` | The Regent's Pardon | legendary | charm | SPR +8, MAG +6, Silence and Nameless resist 50% | Lyra in `regent_after`, kind path (`lyra_kind`) |
| `tidewarden_spear` | Tidewarden Spear | legendary | spear (bram) | ATK +50, DEF +4, light +15% | F3 Mercy, Lantern secret |
| `regents_seal` | The Broken Seal | legendary | charm | ATK +6, MAG +6, Fury gain +12% | the Paper Regent (guaranteed) |
| `barristers_quill` | Barrister's Quill | legendary | charm | MAG +6, Silence resist 50%, Fury gain +10% | the Barrister (guaranteed) |
| `ferrymans_charm` | Ferryman's Charm | rare (unique) | charm | SPD +2, Chill resist 50%, LUK +4 | Nilo's Bell |
| `tidewalker_boots` | Tidewalker Boots | set | boots | SPD +3, DEF +4, ice resist 10% | F1 Dash secret |
| `tidewalker_mantle` | Tidewalker Mantle | set | mantle | DEF +6, SPR +5, Chill resist 30% | Three Witnesses (either council choice) |

Set `tidewalkers_way` (2 pieces): Chill resist +30%, SPD +1. The two Lyra gifts are a pair: the truth path's trident
against the kind path's charm is a choice of shape, not of power (the H4 rule: small and honest). Names are proposals
(placeholders open to veto, as Episode 3's were).

### 7.4 Affixes and names

Add a sixth tier at ilvl 18 to every affix that has five (about +15% over tier 5; resist suffixes cap at 100).
`RARE_NAME_A` gains Drowned, Sealed, Riverborn, Witnessed, Tidal (each grepped first).

### 7.5 Drop tables

`ZONE_LOOT`: ep4_flood_road ilvl 17, equipChance 0.16; keep_f1 ilvl 18, 0.17; keep_f2 ilvl 19, 0.17; keep_f3 ilvl
20, 0.18. Random tables never roll legendaries.

### 7.6 Shops and the inn

| Shop id | Keeper | Stock |
|---|---|---|
| `ferry_peddler` | Hale | potion, hi_potion, ether, hi_ether, antidote, eye_drops, echo_herb, phoenix_feather, tent, silver_salve, lamp_oil, wader_boots (peddler markup as Episodes 2 and 3) |
| `riverbank` | the Provisioner (Linn helps) | the same consumables at list price plus lamp_oil, waxseal_charm, tidemark_charm, ferry_mantle |
| `vw_forge` | the Crown Guard smith | tier 7 gear and the tier 6 weapons; tier 8 (`ifFlag: keep_f2_done`) |
| `pk_smithy` (restock) | Garrick | after `ep4_complete`, one tier 8 weapon each for Bram and the hero |

Floodwatch Inn: 80 gold. Gold check (Inference; the simulator's gold column settles it): about 2,400 carried in, 500
from the road, 1,100 from F1, 1,500 from F2 with the Barrister, 1,200 from F3, plus chests and sales: two tier 7 pieces
in town and two tier 8 pieces before F3, never everything.

---

## 8. Music and sound

### 8.1 New tracks (E4-audio; composed in code with the in-repo tracker like Episode 3's five; the shared four-note name motif; -16 LUFS; no Suno tonight)

| id | Title | Role | Brief | Key, tempo | Motif | Fallback |
|---|---|---|---|---|---|---|
| `valewyn` | The Drowned Crown | the town, `crown_remembers`, `CREDITS_EP4` | The root region-4 brief, for the tracker: flowing harp, lyrical strings, soft flute, a celesta like water, 90 BPM; minor and rain-soft until the B section lifts. | A minor to C major, 90 BPM, 70 to 90 s | the motif on celesta, its last note held under the bar line like a held breath | `hollowmere` |
| `sunken_keep` | The Sunken Keep | keep_f1, keep_f2 | Dungeon: a slow pulse of plucked low strings and a muffled bell every four bars, water-drop percussion, a clarinet line that plays the motif in long notes. | D Dorian, 80 BPM, 90 s | motif in the clarinet, augmented | `court` |
| `boss_regent` | The Paper Regent | the Regent's battle | 6/8 drive: timpani and low brass on the accents, harp ostinato, choir pads; the B section quotes `valewyn` in minor (the city's own song turned to law); a last major bar before the loop. | F minor, 132 BPM, 6/8, 100 to 120 s | the motif in the brass, the town quote | `boss_warden` |

Reused: `millrace` (the Flood Road: the X1 water-mill track fits a drowned farm valley), `mystery` (keep_f3, the
house rule: the last floor before a boss is the quiet one), `sorrow`, `triumph`, `battle`, `victory`, `gameover`,
`first_bell` and `emberpeak` (Act I). Cut line: if time runs short, `sunken_keep` falls back to `court` and
`boss_regent` to `boss_warden`, and the episode still ships.

### 8.2 Cue sheet by map

| Map | Track |
|---|---|
| pk_inn, emberpeak (Act I) | `first_bell` (Emberpeak restored) |
| ep4_flood_road | `millrace` |
| ep4_valewyn and `ep4_vw_*` | `valewyn` |
| ep4_keep_f1, ep4_keep_f2 | `sunken_keep` |
| ep4_keep_f3 | `mystery` |
| ep4_keep_crown | silence until `paper_regent` |
| ordinary battles, the Barrister | `battle` |
| the Paper Regent | `boss_regent` |

### 8.3 Cue sheet by scene (a scene that leaves its map's track puts it back before it ends)

| Scene | Cue |
|---|---|
| `ep4_morning` | `first_bell`, softer (0.6), `mystery` on "Nobody can.", back |
| `ferry_rest` | the map track, softer (0.6) |
| `vw_view` | `mystery` |
| `regent_hall` | `sorrow` from the truth choice, back to `valewyn` |
| `lyra_memory_1`, `lyra_memory_2` | `sorrow` with a distant `bell_drowned`, back to `sunken_keep` |
| `vex_archive` | silence, then `mystery`, back to `sunken_keep` |
| `barrister` | silence for the intro, then `battle` |
| principles | `bell_drowned` (clear, not muffled); no music change |
| `lyra_memory_3`, `witness_book` | silence, `sorrow`, then on the signature `triumph` (short), back to `mystery` |
| `paper_regent` | silence, title card, `boss_regent` |
| `regent_after` | `sorrow` (the Regent unfolds) -> `triumph` (Lyra) -> `mystery` (the line under the seal) -> `valewyn` (the gift) |
| `crown_remembers` | `bell_drowned` x3, then `valewyn` |
| `ep4_ending` | silence, `bell_drowned` once (soft), `mystery` on "That's a voice.", end cards |
| credits | `valewyn` |

### 8.4 SFX and ambience (E4-audio, synthesized like the Episode 1 to 3 sets)

| id | Use | Brief |
|---|---|---|
| `tide_wheel` | a lock wheel turns | iron ratchet, three clicks and a clunk |
| `water_rise` | a basin fills; boat doors | a deep gulp rising to a swell, about 0.8 s |
| `water_drain` | a basin drains | a falling rush to a trickle, about 0.8 s |
| `seal_wash` | a forged seal washes off | a wet tear and a soft bloom |
| `seal_stamp` | Stamp (a Seal gained) | a heavy wax-stamp thunk |
| `decree_void` | a decree voided; Answer | paper tearing with a bright shimmer |
| `decree_unroll` | a decree telegraph | a scroll unrolling, a low rising tone |
| `bell_drowned` | the Keep's bell, the principle stones | a bronze bell heard through water, muffled, long decay (a clear variant for the stones by pitch and filter) |
| `canal_rain` (ambience) | the road and the town | steady rain on water, a gutter trickle |

All of it reaches the game through the pack's audio fragment (13.3), never through `assets/audio/manifest.json`.

---

## 9. Asset list: what is reused and what is new

### 9.0 Unused painted source cells (checked 2026-11-03 against `tools/art/**` and the atlases)

| Sheet | Cell | Content | Status | Episode 4 use |
|---|---|---|---|---|
| `environments.webp` | 3 | Valewyn, flooded royal keep, crowned statue in turquoise water | never shipped | backdrops, `valewyn_far` decal, `ep4_dialog_keyart` |
| `bosses.webp` | 3 | Paper Regent, drowned royal figure, paper-scroll robes, crown, trident | never shipped | the boss, its looks, avatar, portrait crop |
| `portraits.webp` | 4 | Regent Lyra | built as `noble_lady` (48 and 32), never used | alias `lyra` (zero bytes) |
| `environments.webp` | 4 to 7 | desert, isles, north, First Library | unused | **held** for Episodes 5 to 8 |
| `bosses.webp` | 4 to 7 | Sand Oracle, Storm Scribe, White Phantom, Eraser | unused | **held** |
| `portraits.webp` | 7 | First Keeper (`hooded_sage`, built) | unused | **held** |
| `enemies.webp` | 0 to 7 | all used by Episodes 1 to 3 | used | recolors only (6.2) |

### 9.1 Tiles and tile objects (E4-tiles; new sheet `assets/tiles/ep4.png`, fragment `assets/tiles/ep4_tiles.json`, existing sheets untouched)

| Asset | Reuse | New |
|---|---|---|
| Keep terrains `causeway_floor` (F1 green-veined flagstone), `archive_floor` (F2 drowned tile and plank), `witness_floor` (F3 white marble with gold inlay) | A2 builder, the forge per-floor kit approach | three terrains, one per floor (floors must not look alike) |
| Walls `causeway`, `archive_stacks` (shelving faces), `witness` | wall systems with outer faces | three wall systems with per-room variety and tide marks at heights 1 and 2 |
| `canal_floor` (dry wet stone with weed lines), `canal_stair`, `ledge_face` (solid) | stone floor | palette and frames |
| `tide_water` (A1, 3 frames, collision `water`; drawn over flooded cells), its rim and foam | the A1 water/ink animation | palette, rim |
| Objects: `tide_wheel` (3 pointer states, big and readable), `tide_post` (3 bands), `pontoon` (afloat 2 bob frames, grounded), `book_crate` (pontoon skin for F2), `seal_paper` (a red-sealed notice on a door; washed frame), `floodgate` (closed/open, a counterweight float), `principle_stone` (unstruck/struck, three colors), `petition_gate` (0 to 3 sockets lit, open), `witness_lectern`, `door_seal` (boss door), `boat` (boat-door sprite), `throne_paper` (4x4: occupied, empty), `glass_dome`, `lantern_chain`, `font_tide` | push block, gate, font, door_boss drawing style | all |
| Town kit: marble walks, canal edges and bridges, blue-slate roofs, the faceless coronation statue, the flood board (three states), sandbags, the Regent's Hall facade, `inn_flood`, `shop_river`, `forge_crown`, the great lock wheel, drowned roofs (river quarter overlay), the washout rope ladder (Emberpeak patch), `valewyn_far` decal (environments cell 3, quantized) | Willowmere prefabs, `roof_blue` | the marble and canal palette swap |
| Terrain `flood_grass`, `mud_path` (the road) | grass and dirt autotiles | recolor and texture |

### 9.2 Sprites (E4-sprites; pack atlases `ep4_npcs`, `ep4_enemies_battle`, `ep4_enemies_field`, `ep4_bosses_battle`, `ep4_portraits`, `ep4_heads`)

| Asset | Reuse | New |
|---|---|---|
| NPCs `npc_lyra`, `npc_hale`, `npc_nilo`, `npc_dorian`, `npc_joss`, `npc_vance`, `npc_linn`, `npc_sori`, `npc_king` (memory), `npc_boatman` | paper-doll builder; bodies: robe for Lyra and Dorian, the smith body for Joss, guard for Vance, child for Sori | 10 specs (Lyra to match `noble_lady`: dark skin, braided black hair, gold circlet, sapphire robes) |
| Ada | `npc_courier_v` (exists) | none |
| Enemy battle sprites, the 7 of 6.2 | enemies.webp cells, the recolor and derive pipeline, `anim_frames.py` | recolor recipes; rim light on every dark foe |
| `barrister`, `barrister_witness` | enemies.webp cell 1; the Blank Decree recolor at small size | recolor, collar, paper sleeves, frames |
| `paper_regent` x3 looks, `paper_regent_avatar` | bosses.webp cell 3, `build_bosses.py`, the `cinder_warden` approach (`ep3_warden.py`) | the three looks and the avatar |
| `writ_silence`, `writ_oblivion` | none | a small new sprite (scroll on a brass stand), two recolors (the `ep3_coils.py` approach) |
| Field sprites for every new enemy (rim light) | `enemies_field` layout | frames |
| Portrait `lyra` | `noble_lady` (built, unused) | an alias entry in the pack's data (zero art bytes) |
| Portrait `paper_regent` | bosses cell 3 crop via `build_portraits.py` | crop recipe, readable at 48 (CRITIQUE_4 item 5) |
| Timeline heads `head_<id>` | `build_heads.py` | entries, in `ep4_heads` |

### 9.3 Backdrops and key art (E4-tiles, `tools/art/backdrops`; files `assets/backdrops/ep4_*`)

| id | Source | Use |
|---|---|---|
| `ep4_battle_flood_road` | composed like `compose_valley.py`: drowned fields, hedgerows, rain, the far Keep | ep4_flood_road |
| `ep4_battle_keep` | environments cell 3, brightness about 0.8, cool teal grade | keep_f1 |
| `ep4_battle_archive_deep` | cell 3, brightness about 0.55, deep green-blue grade | keep_f2, the Barrister |
| `ep4_battle_witness` | cell 3, brightness 0.7, pale marble grade, a tighter crop on the arches | keep_f3 |
| `ep4_battle_throne` | cell 3, tight crop on the crowned statue, gold rim | the Paper Regent |
| `ep4_dialog_keyart` | cell 3 with the baked vignette | Episode 4 title cards and `CREDITS_EP4` |

The battle scene finds them through `BACKDROPS` (exported by seam 7) and each zone's `backdrop` key.

### 9.4 What Episode 4 does not need

No new party art, no new UI windows, fonts or cursors, no new jingles, no new engine core modules, no new status (the
Decree is the Heat counter; Nameless is reused), no new ui-atlas icon (the seal pips are drawn in code by the scene).

---

## 10. Save compatibility (E4-pack; read this before touching anything that writes a save)

**The rule carries over from Episode 3, unchanged: no Episode 4 path ever writes a save slot that holds another run.**

1. **Per-run autosave stays.** `g.autosaveSlot` (Episode 3) is honored by everything Episode 4 adds; Episode 4 adds no
   new write path. Nothing in the pack calls `save.write` except through the field's existing autosave and the save
   bell.
2. **The main entry is Continue.** A run that finished Episode 3 continues into Episode 4 from its own save (any slot):
   after the Episode 3 credits it wakes at `pk_inn` and `ep4_morning` runs (only while `EP4_LIVE`); a save made later
   anywhere in Emberpeak starts it on the next enter of `pk_inn` (the pack's wake trigger) or of `emberpeak` (a second
   enter trigger, same guard). That run keeps autosaving where it always has.
3. **The quick start, `newGameEp4(name, { slot })`**, lives in the pack (`src/data/ep4/start.js`) and uses the core
   `pickRunSlot(save)` of `src/game/episodes.js` exactly as Episode 3 does: slot 0 if empty; otherwise the first empty
   manual slot, shown before starting ("This party will save to Record 2."); if every slot is full, it does not start
   and shows the existing refusal with only Back. It never offers Replace and never writes an occupied slot.
4. **`EP4_START`** (in the pack). Lv 17 at 5,600 EXP with the simulator's `ep4_flood_road` loadout; every Episode 1 to
   3 main flag plus `ep3_complete`; counters `credits_rolled`, `credits2_rolled`, `credits3_rolled`; key items
   `name_fragment_1` to `name_fragment_3`, `lantern_of_recall`, `mirror_sigil`; equipment including the First Bell
   Hammer and the Ember Heart; 2,400 gold; potion 6, hi_potion 6, hi_ether 4, phoenix_feather 3, silver_salve 2;
   starts at `pk_inn` `inn_bed` (so `ep4_morning` runs). Exposed as `LQ_DEBUG.newGameEp4(name, { slot })` (registered
   by the pack when it loads).
5. **The episode switch.** `src/game/episodes.js` gains `export const EP4_LIVE = false` (seam 2). While false:
   `ep4_morning` never runs, the washout stays impassable, the Episode 3 end card is unchanged, and the title shows no
   Episode 4 row, **except** with `?ep=4` on the URL once the pack's `EP4_MAPS_LISTED` is true (a developer entry: the
   title hook forces the pack on, loads it, and the pack adds the row). E4-integrate flips `EP4_LIVE` on the branch.
   When live, the title row "Episode 4: new party" shows once any slot has `ep3_complete`, with the help line "A ready
   party at Lv 17. Your own save stays under Continue."
6. **Additive schema.** New flags, `g.washed`, counter `credits4_rolled`. No field is renamed or removed; an Episode 1
   to 3 save loads unchanged. Fine Print runs (`tier_1`) never start Episode 4 tonight (EPISODE4 10.6).
7. **Tests (node, pure, fake storage):** slot 0 occupied + empty slot 2 -> the quick start writes only slot 2 through
   a full simulated map change; all slots full -> no write at all; an old save without `g.washed` loads and autosaves to
   its own slot; `?ep=4` hidden while maps are unlisted; an Episode 3 credits fixture loads and reaches `ep4_morning`
   with `EP4_LIVE` on, and does not with it off; a Fine Print save never reaches it.

---

## 11. Build plan: waves and agent briefs

Every agent: read COMMON.md, DESIGN.md, `docs/story/EPISODE4.md`, this plan and its brief; stay in owned paths; keep
`node qa/run.mjs` green (Episodes 1 to 3 unchanged in meaning); no git; no em dashes; report under 400 words. Where an
agent needs something not yet delivered, it stubs the agreed id and says so.

**Every step leaves the game publishable:** nothing a player can reach changes until E4-integrate flips `EP4_LIVE`;
the pack is not even fetched while the switch is off (`enabled()` false), except with `?ep=4` or `?pack=ep4`.

### 11.1 The waves (up to three agents at once; paths disjoint inside each wave)

| Wave | Agent | Size | Brief | Owned paths (disjoint within the wave) | Closes with |
|---|---|---|---|---|---|
| **4a** | E4-pack | M | `E4-pack.md` | `src/data/ep4/index.js`, `src/data/ep4/live.js`, `src/data/ep4/start.js`, `src/data/ep4/maps.js` (the map registry stub), `src/data/ep4/hooks.js` (credits, quest, title, debug hooks); the core seams of 13.2 in `src/game/packs.js`, `src/game/episodes.js`, `src/game/story.js`, `src/data/quests.js` (`mainQuestFor` only), `src/battle/rules.js` (two lines), `src/battle/ai.js` (two lines), `src/scenes/battle.js` (one word), `src/scenes/title.js` (one line), plus the core-JS comment trims that pay for them; `tools/pwa/build_pwa.py` (`LAZY_PREFIXES`), `qa/pwa/budget_ratchet.json` (`packCapsMB.ep4` only), `qa/pwa/precache.test.mjs` (accept the pack audio fragment), `qa/core/ep4_*`, `qa/saves/ep4_*`, `qa/ui/ep4_*`, `docs/PWA_PACKS.md` (an "ep4 pack" section) | `node qa/run.mjs core saves ui pwa`; tap-prompt bytes not grown |
| 4a | E4-story | M | `E4-story.md` | `src/data/ep4/{flags,npcs,quests,text,story,ledger}.js`, `docs/story/STAGING_EP4.md`, `docs/story/EPISODE4.md` (section 9 only), `qa/content/ep4_*` | `node qa/run.mjs content` |
| 4a | E4-battle | M | `E4-battle.md` | `src/data/ep4/{enemies,encounters,items,loot,shops,skills,ai}.js`, `tools/sim/ep4.mjs`, one line in `tools/sim/simulate.mjs`, `qa/battle/ep4_*`, `docs/BATTLE.md` (an "Episode 4" section) | `node qa/run.mjs battle`; `simulate.mjs --check` all four episodes |
| **4b** | E4-tiles | M | `E4-tiles.md` | `tools/art/tiles/ep4_*.py` (+ one line in `build_tiles.py`), `tools/art/tiles/out/ep4/**`, `assets/tiles/ep4.png`, `assets/tiles/ep4_tiles.json`, `tools/art/backdrops/ep4_*.py` (+ recipes registered from that file, not `build.py`'s table, or one line in `build.py`), `assets/backdrops/ep4_*`, `qa/core/ep4_tiles*` | sheets and mocks viewed; `sync-manifest --pack ep4` |
| 4b | E4-sprites | M | `E4-sprites.md` | `tools/art/sprites/chars/ep4_*`, `tools/art/sprites/ep4_*.py` (+ one line in `build_all.py`), `assets/sprites/ep4_*`, `assets/ui/ep4_heads.*`, `qa/core/ep4_sprites*` | contact sheets viewed; `sync-manifest --pack ep4` |
| 4b | E4-world | M | `E4-world.md` | `src/data/ep4/field/**` (tide.js, events, attach, fx), `src/data/ep4/world.js` (registers EXT types, `TINTS.flood_grey`, test maps), `tools/maps/ep4_check.mjs` (+ one line in `tools/maps/mapcheck.mjs`), `qa/world/ep4_*`, `docs/WORLD_EP4.md` | `node qa/run.mjs world`; fieldlab shots viewed |
| **4c** | E4-maps-a | M | `E4-maps-a.md` | `src/data/maps/ep4_flood_road.js`, `ep4_valewyn.js`, `ep4_vw_inn.js`, `ep4_vw_shop.js`, `ep4_vw_forge.js`, `ep4_vw_palace.js`, `ep4_patches.js`, `qa/maps/ep4_a_*`, `docs/MAPS_EP4_A.md`, `tools/maps/previews/ep4_flood_road*`, `ep4_valewyn*`, `ep4_vw_*`, `emberpeak_ep4*` | `mapcheck check`; previews viewed |
| 4c | E4-maps-b | M to L | `E4-maps-b.md` | `src/data/maps/ep4_keep_f1.js`, `ep4_keep_f2.js`, `ep4_keep_f3.js`, `ep4_keep_crown.js`, `qa/maps/ep4_b_*`, `docs/MAPS_EP4_B.md`, `tools/maps/previews/ep4_keep_*`, the one `EP4_MAPS_LISTED` line in `src/data/ep4/encounters.js` | same; the critical path test |
| 4c | E4-audio | S to M | `E4-audio.md` | `tools/music/songs/ep4_*.py`, `assets/audio/music/ep4_*`, `tools/audio/ep4_*` (+ one line in the generator's recipe list), `assets/audio/sfx/ep4_*`, `assets/audio/ambience/ep4_*`, `src/data/ep4/audio.js` (the manifest fragment), `docs/MUSIC.md` (an Episode 4 section), `qa/audio/ep4_*`, `qa/music/ep4_*` | renders, seams and piano rolls viewed; `node qa/run.mjs music audio` |
| **4d** | E4-scene-ui | M | `E4-scene-ui.md` | `src/battle/scene/**`, `src/battle/fx.js`, `src/scenes/credits.js`, `src/ui/screens/journal.js` (overflow only), `src/data/ep4/title.js` (the pack's title row and picker UI), `qa/battlescene/ep4_*`, `qa/ui/ep4_scene*`, plus the core trims that pay for any core line | `node qa/run.mjs battlescene ui`; phone shots viewed |
| 4d (after scene-ui) | E4-integrate | M | `E4-integrate.md` | `qa/autoplay.py` (an Episode 4 segment), `qa/autoplay_grid.mjs`, `qa/integrate/ep4_*`, `qa/integrate/story_time.py` (Episode 4 input only), `qa/shots.json` (append only), the `EP4_LIVE` line, seam fixes in files whose owner's brief is closed | the full gate list (12) |
| **4e** | critic-6, play-critic-6 | S each | `E4-review.md` | `docs/CRITIQUE_6.md`, `qa/out/review6/critic/**`; `docs/PLAYTEST_REVIEW_6.md`, `qa/out/review6/play/**` | read-only |
| 4e (after both) | E4-fixes | M | written by the orchestrator from the two reviews | per the list | the full gate list again |

Agent count: 11 build agents, 2 read-only reviewers, 1 fix pass: 14 runs, never more than three at once.

### 11.2 Disjointness check, by shared file

| Shared file or folder | Who touches it, in which wave | Why it is safe |
|---|---|---|
| `src/data/ep4/index.js` | E4-pack (4a) only | the entry imports the other modules behind a missing-module guard (the X1 pattern), so E4-story, E4-battle, E4-world and E4-audio plug in by exporting `register()` |
| `src/data/ep4/maps.js` | E4-pack (4a) writes it as a guarded list of all 10 map module names plus the patches; nobody else | 4c's map agents only create files the list already names |
| `src/data/ep4/encounters.js` | E4-battle (4a); E4-maps-b (4c) edits one line (`EP4_MAPS_LISTED`) | different waves |
| `src/data/ep4/title.js` | E4-scene-ui (4d) only; E4-pack's hook (4a) imports it guarded | different waves |
| `src/data/ep4/{flags,npcs,quests,text,story,ledger}.js` | E4-story (4a) only | |
| `src/data/ep4/{enemies,items,loot,shops,skills,ai}.js` | E4-battle (4a) only | |
| `src/data/ep4/field/**`, `world.js` | E4-world (4b) only | |
| `src/data/ep4/audio.js` | E4-audio (4c) only | |
| core seams (`packs.js`, `episodes.js`, `story.js`, `quests.js`, `rules.js`, `ai.js`, `scenes/battle.js`, `title.js`) | E4-pack (4a) only | E4-battle writes data that uses the seams and reruns its sim after E4-pack reports; no other 4a agent opens a core file |
| `src/battle/scene/**`, `credits.js`, `journal.js` | E4-scene-ui (4d) only | |
| `tools/sim/simulate.mjs` | E4-battle (4a), one line | |
| `tools/maps/mapcheck.mjs` | E4-world (4b), one line | 4c map agents run it, do not edit it |
| `assets/tiles/**`, `assets/backdrops/**` | E4-tiles (4b) only (ep4-prefixed files) | fragments, never `tiles.json` |
| `assets/sprites/**`, `assets/ui/ep4_heads.*` | E4-sprites (4b) only (ep4-prefixed files) | pack atlases merge into the base atlases at runtime; base files untouched |
| `assets/ep4_manifest.json` | written by `node qa/core/sync-manifest.mjs --pack ep4`; run by E4-tiles and E4-sprites in 4b | a generated file; the second run includes the first's files; the orchestrator reruns it at wave close |
| `assets/audio/manifest.json` | **nobody** | Episode 4 audio rides the pack fragment (13.3) |
| `docs/MAPS.md`, `docs/WORLD.md` | nobody | Episode 4 writes `MAPS_EP4_A.md`, `MAPS_EP4_B.md`, `WORLD_EP4.md` (the X2 precedent) |
| `qa/shots.json`, `qa/autoplay.py` | E4-integrate (4d) only | |
| `PLAN.md`, `PROGRESS.md` | the orchestrator only | agents send paragraphs in their reports |

Never beside each other: E4-integrate runs alone (it touches seam files of closed briefs); the two reviewers may run
together (read-only, separate output folders), but not beside E4-fixes.

### 11.3 Wave close (orchestrator checklist, each wave)

`node qa/core/sync-manifest.mjs --pack ep4`; `python tools/pwa/build_pwa.py`; `node qa/run.mjs pwa core`; view every
image the wave's reports name; commit on `scott/ep4-build` with the orchestrator's message; push the branch and update
the pull request into `overhaul` (PR only, never a direct push, never `main`).

---

## 12. Acceptance and QA (the full gate list)

- `node qa/run.mjs` green; Episode 1 to 3 suites unchanged in meaning (rerun a flaky timeout alone before treating it
  as real: `x1_gate`, `x1_wild`, `walks`, `abilities_walks`, `qa/battle/sim.test.mjs`).
- `node qa/run-gate.cjs` (the root game) green.
- `node tools/sim/simulate.mjs --check`: "All targets met" for Episode 1, Whisperwood Hollow, Episodes 2, 3 and 4;
  `--cave --check` and `--tier 1 --check` unchanged.
- `node tools/maps/mapcheck.mjs check` clean; previews of the 10 new maps and the two patched maps viewed, in
  `MAPS_EP4_A.md` / `MAPS_EP4_B.md`, including a `_low` and `_high` variant of every keep floor.
- **Autoplay route.** `qa/autoplay.py --episode 4` plays from an Episode 3 credits save and from `newGameEp4`: the
  washout, the drowned lane (wheel to low, walk, back to mid for the punt chest), Hale's landing (rest), the bluff,
  Valewyn (Regent's Hall, Joss, the Keep ferry), F1 (B: high, low, through; C: mid, east; E: high, gallery, key; F:
  high lifts the tidegate; lift), F2 (B; D: b low, c high, b mid; Barrister on Auto), F3 (three wings, any order; the
  Witness Book: "Sign."), the Paper Regent on Auto (Answer used by the competent policy), the ending, credits, the
  wake at the Floodwatch Inn. No softlock, the Regent beaten at Lv 20, zero game overs, desktop and phone, one device
  at a time; the wheel inputs come from the map agents' reported solutions; the quick start never wrote a slot it did
  not own (asserted by reading localStorage back).
- Story timer (`qa/integrate/story_time.py` on the Episode 4 logs): first play 60 to 90 minutes; first fight under 5
  minutes after `ep4_morning`; no main scene over its box budget.
- **Shots** (append to `qa/shots.json`; zero console errors; desktop 1920x1080 and phone 844x390):
  `field_ep4_flood_lane_mid`, `field_ep4_flood_lane_low`, `field_ep4_valewyn_plaza`, `field_ep4_keep_f1_papered_high`,
  `field_ep4_keep_f1_pontoons_mid`, `field_ep4_keep_f2_stacks_high`, `field_ep4_keep_f3_dark`, `story_ep4_morning`,
  `story_regent_hall`, `story_vex_archive`, `story_witness_book`, `battle_decree_pips`, `battle_barrister`,
  `battle_regent_answer`, `story_regent_after`, `story_crown_remembers`, `story_ep4_ending`, `ui_title_ep4`.
- Performance: field logic under 3 ms, a level change under 2 ms of recompute, F2 draw under 1 ms with its lanterns,
  60 fps on the phone profile.
- Text: no em dashes (grep U+2014 over `next/`), every box within 3 x 42, ASCII only, no keyboard glyph on touch.
- Readability: every tide puzzle solvable by a first-time player without Talk; the water line on every post and the
  dry/flooded state of every basin readable on the phone; Talk always names the next step, including after
  `ep4_complete`.
- Saves: section 10's tests; an Episode 4 save made mid-keep reloads with washed seals, latched floodgates and opened
  doors, and with every basin at its start level.
- **Budget** (13): `qa/pwa/precache.test.mjs` green, the tap-prompt bytes at or below tonight's measure, the initial
  download not grown by Episode 4, the `ep4` pack under its cap; `python qa/pwa/pwa.py --only packoffline` with
  `?pack=ep4` brings the pack up offline after one visit.
- Shipping is not part of the gate list: E4-integrate flips `EP4_LIVE` on the branch only; shipping (`overhaul:main`)
  stays Scott's or Stephen's explicit word.

---

## 13. The budget rule and the pack

### 13.1 Why everything is in the pack

The first download's load before the tap prompt is held by `qa/pwa/budget_ratchet.json` (`tapPromptMB` 2.34, never
raised; Scott's cap 2.5) and the initial download by `initialMB` 6.38 (cap 6.5). On 2026-11-02 media-2 left **36 bytes**
of tap-prompt room. Tonight (Fact, measured 2026-11-03 21:40 Eastern with `node qa/integrate/x1_budget.mjs`, the same
wire measure as the precache test): 2,446,541 bytes before the tap prompt against a ratchet of 2,453,667, so **7,126
bytes** of room, and **23,861 bytes** under the initial-download ratchet. Treat it as zero anyway: the rule is that
Episode 4 adds **no net bytes** to the pre-tap load and **no bytes** to the initial download.

- Every file of Episode 4 is a pack file: `src/data/ep4/**` (code and data, including the field code under
  `src/data/ep4/field/`), `src/data/maps/ep4_*.js`, `assets/{tiles,sprites,ui,backdrops}/ep4_*` and `assets/tiles/ep4.png`,
  `assets/ep4_manifest.json`. `build_pwa.py`'s `pack_of` keeps all of these out of the precache and the modulepreload
  block (with prefix `ep4_`, Fact from `tools/pwa/build_pwa.py`).
- The one exception is `src/data/ep4/live.js` (the build tool always precaches a pack's `live.js`): keep it to a
  one-line re-export of `EP4_LIVE` from `episodes.js`, or do not create it.
- Sound files `assets/audio/sfx/ep4_*` are precached by default (the folder is in `FOLDERS`); E4-pack adds
  `'assets/audio/sfx/ep4_'` and `'assets/audio/ambience/ep4_'` to `LAZY_PREFIXES` so they are runtime-cached instead.
  Music is lazy already.
- **Any core-file change must be paid for by trimming core JS in the same pull request** (comments and dead code in
  precached `src/` files, never behavior), and the report gives the gzipped before/after of the pre-tap load.

### 13.2 The core seams (E4-pack owns all of them; budget about 600 gzipped bytes in, at least as many trimmed out)

| # | File | Change | Why |
|---|---|---|---|
| 1 | `src/game/packs.js` | add `ep4: { entry: '../data/ep4/index.js', prefix: 'ep4_', assets: 'assets/ep4_manifest.json', audioPack: 'ep4', hard: true, touches: ['emberpeak', 'pk_inn'], wanted: (f) => !!(f.ep3_complete \|\| f.ep4_started), enabled: () => EP4_LIVE }`; pass the engine to `register(engine)` | the pack itself; the engine lets the pack merge its audio fragment before `audio.loadPack('ep4')` runs |
| 2 | `src/game/episodes.js` | `export const EP4_LIVE = false;` | the switch |
| 3 | `src/scenes/title.js` | one line beside the Fine Print hook: when `EP4_LIVE` and a slot has `ep3_complete`, or `?ep=4`, `forcePack`/`ensurePack('ep4')` then `globalThis.LQ_EP4 && LQ_EP4.title(this)` | the row, picker and name entry live in the pack (`src/data/ep4/title.js`) |
| 4 | `src/game/story.js` | `creditsPending` reads `CREDITS_HANDOFF` entries' `flag` instead of three fixed lines (add `flag` to entries 1 to 3) | the pack adds entry 4 and the live end card for 3 |
| 5 | `src/data/quests.js` | `export const QUEST_EXT = []`; `mainQuestFor` returns the first `[flag, quest]` of it whose flag is set, before its own lines | the pack pushes `['ep4_started', MAIN_QUEST_EP4]` |
| 6 | `src/battle/rules.js` | the Heat unit carries `heatQuench: d.heat.quench \|\| 'ice'` and `heatWord`; the void check reads `types.includes(tgt.heatQuench)`; the message reads `u.heatWord \|\| 'Quenched!'` and the sfx `u.heatSfx \|\| 'quench_hiss'` | Decrees on the Heat counter |
| 7 | `src/battle/ai.js`, `src/scenes/battle.js` | `export const SCRIPTS` (and `export const POLICY_EXT = []`, checked first in `competentPolicy`); `export const BACKDROPS` | the pack registers `barrister` and `paper_regent` scripts, teaches Auto to void and Answer, adds its backdrops |

`registerStory`, `prependTalk`, `FLAG_IDS`, `ALL_SIDE_QUESTS`, `LEDGER`, `PLACES`, `REACHED`, `TINTS`, `EXT`,
`CREDITS_HANDOFF`, `ENEMIES`, `ITEMS`, `SKILLS`, `ENCOUNTERS`, `ZONES`, `ZONE_LOOT`, `SHOPS`, `NPCS`, `BANNERS`,
`BOOKS`, `BARKS`, `BESTIARY`, `SPEAKER_NAMES` and `engine.audio.manifest` are already exported and mutable (Fact,
grepped 2026-11-03); the pack mutates them in `register()` and never edits their files. The field mechanic attaches
itself from inside its own `EXT.tidewheel.create` (idempotent per field), so **`src/scenes/field.js` is not edited**.

### 13.3 Audio through the pack

`src/data/ep4/audio.js` exports `{ music: {...}, sfx: {...}, ambience: {...}, pack: { sfx: [...] } }` in the
`assets/audio/manifest.json` entry shape (srcs `assets/audio/music/ep4_*.mp3`, `assets/audio/sfx/ep4_*.wav`, loop
points, volumes, `pack: 'ep4'`). The pack's `register(engine)` merges it into `engine.audio.manifest` (never
overwriting an id) before `ensurePack` calls `audio.loadPack('ep4')`. `qa/pwa/precache.test.mjs`'s "every sfx id the
code references resolves" test learns to read the fragment for ids referenced under `src/data/ep4/` (E4-pack). The
main audio manifest file is never edited for Episode 4.

### 13.4 Pack cap

`packCapsMB.ep4 = 1.0` (wire) in `budget_ratchet.json`; `qa/pwa/packs.test.mjs` asserts it. Expected: code and data
about 0.25 MB, tiles and backdrops about 0.35, sprites about 0.3.

---

## 14. Risks, assumptions and decisions

**Assumptions.**
1. Lyra's name was struck and Valewyn's forgery is twelve years old (EPISODE4 section 8).
2. The Paper Regent is a Keeper construct, the fragment a charter roll in Keeper ink (EPISODE4 section 8).
3. Three tracker tracks are within the pipeline's proven range (Episode 3 shipped five).
4. The Heat counter generalizes to Decrees with two seam lines; if it does not, E4-battle writes the Decree logic as a
   pack-registered `special` hook in the `paper_regent` and `barrister` scripts and the ordinary paper foes keep a
   plain basic AI with their decree as a `charge` (cost rises from M to M-plus).
5. The field mechanic attaches without editing `field.js` (EXT create hook). If a draw hook is missing, E4-world asks
   for one line in its report, and E4-integrate adds it with a matching trim.

**Risks.**
- **The pack order trap** (3.3): registering `emberpeak`/`pk_inn` before the ep3 pack loses the patch silently. A test
  covers both orders.
- **The pre-tap budget.** Every seam must be paid in the same PR; the orchestrator rejects a report without the
  gzipped numbers.
- Pacing: 20 fights, box budgets, the story timer gate, cut lines.
- Tide locks could feel like Episode 3's quench again (water, again). Mitigation: the two-way rule (one wheel opens and
  closes), floats, washes; play-critic-6 checks it.
- The Regent is the most complex fight yet for the hero, who has never been the center of a boss. Auto must use Answer;
  the reckless and naive policies must still behave.
- Parallel waves: 4a's E4-battle depends on E4-pack's seams 6 and 7 in the same wave. E4-battle writes data first and
  runs its final `--check` after E4-pack reports; if E4-pack slips, E4-battle reports the sim as pending.

**Cut lines, if the budget tightens** (each keeps a complete story):
- Cut 1: drop Nilo's Bell and the ferry shortcut of the shelter choice.
- Cut 2: drop the F2 coffer and the road's Dash chest; `sunken_keep` falls back to `court`.
- Cut 3: merge F2 into F1 (the Barrister moves to F1's Audience Hall; `lyra_memory_2` and `vex_archive` move to F1) for
  a two-floor Keep.

**Open for Scott and Stephen** (none blocks the build; defaults in brackets; full list in EPISODE4.md section 10):
Lyra's name struck [yes]; the hero's episode with Answer [yes]; "Keep this one." [these words]; Vex keeps the list and
signs "V." [yes]; the collision renames [as listed]; Fine Print does not enter Episode 4 tonight [base game only]; the
Episode 5 card wording [placeholder]; shipping [Scott's or Stephen's word].
