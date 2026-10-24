# Episode 3 production plan: The Forge of Ash

Owner: ep3-designer (W16), 2026-10-24. Status: **designed, awaiting orchestrator launch** (Scott approved building
Episode 3 on 2026-10-24). Story bible: `docs/story/EPISODE3.md`. This file is the contract the build agents work from.
Every build agent reads `docs/briefs/COMMON.md`, `DESIGN.md`, `docs/story/EPISODE3.md`, this file and its own brief in
`docs/briefs/E3-*.md`, in that order. House rules as always: no em dashes, no git, stay in your owned paths, bound every
command, look at your own output.

**Usage guard (Scott, week of 10/21: "slow and steady").** The build is cut into waves of at most three agents, but
the orchestrator runs **one agent at a time**, in the order of section 11, checking weekly usage before each launch
(under 75%: proceed; 75 to 85%: proceed one at a time with a pause between; over 85%: stop). Scott's scheduled loops
and the teams' schedule generators come first. Each agent is sized to finish in one sitting and to leave the game
publishable.

---

## 0. Summary

**What gets built.** One road (the Old Sand Road, from a new east gate in Hollowmere), one town with four interiors
(Emberpeak), one three-floor dungeon plus a boss room (the Ashen Foundry and the Heartforge), one new field mechanic
(**quench channels**: water routed by sluice paddles that permanently crusts molten slag into walkable rock and cools
hot gates), one battle rule (**Heat**: foes stoke themselves toward a telegraphed flare; ice or Break quenches them),
one new party skill (Bram's **Tempered Oath**), one mini-boss (the Bellows Specter), one three-phase boss with Bram at
its center (the Cinder Warden, with two coils), 7 ordinary enemies, 5 music tracks, about 30 scenes, 3 side stories,
and a save rule that keeps Episode 3 from ever writing over another run's autosave. Target 60 to 90 minutes (planned
at 75), party Lv 13 to 17.

**What is reused (most of it).** The engine, field scene, cutscene API, event vocabulary (doors, gates with AND
logic, switches, push and heavy blocks, fonts, save bells, chests, pots, lights, overlays with `if`/`ifNot`, mirror
doors), Episode 2's beam tracer `src/world/beam.js` (the water flow is the same pure tracer with a medium option),
receptors with latch and flag (the water basins), W9's Dash Strike, Appraise and Shove, the Lantern's hidden ink, the
battle rules (CTB, Break, Fury, combos, telegraphs and `charge`, phases, summons, HP locks, Cover, Taunt, the
`nameless` status and its cures), the simulator, the map kit, `mapcheck`, the preview renderer, the NPC paper-doll
builder, the enemy recolor pipeline, the backdrop builder, the music tracker and SFX generator, every jingle, and the
tracks `mystery`, `sorrow`, `triumph`, `battle`, `victory`, `gameover`, `hollowmere`. Painted source art the game has
never shipped: `environments.webp` cell 2 (Emberpeak), `bosses.webp` cell 2 (the Cinder Warden), `enemies.webp` cell 6
(the storm roc, for the Bellows Specter), the built but unused portrait `goggles_smith` (portraits cell 6, for Ilya).
Garrick's portrait already exists.

**What is genuinely new.** Quench channels (spouts, sluices, troughs, slag and crust, basins, hot gates, permanent
crust), the Heat rule, Tempered Oath, a `forge` tileset and an `ember` town kit, 9 NPC specs, 7 enemy recolors, the
Specter, the coils, the Warden's three looks and avatar, 1 to 2 hand portraits, 5 tracks, 10 SFX, 2 ambiences, `ep3.js`
and its data, the per-run autosave slot and the Episode 3 quick start.

**Waves (section 11; run one agent at a time).**
- **17a** foundations: E3-saves, E3-story, E3-battle.
- **17b** art and sound: E3-tiles, E3-sprites, E3-audio.
- **17c** world: E3-world, E3-maps.
- **17d** assembly and launch: E3-scene-ui, E3-integrate (flips the episode switch, publish).
- **17e** review: critic-5 and play-critic-5 (read-only), then E3-fixes.

**Done means.** A save that finished Episode 2 plays Episode 3 to its credits with no softlock; so does the
`newGameEp3` quick start, without touching any other run's save; the autoplay bot beats the Cinder Warden at Lv 16
with zero game overs on desktop and phone; `node qa/run.mjs` green with Episodes 1 and 2 untouched in meaning;
`simulate.mjs --check` prints "All targets met" for all three episodes; the timed story read lands at 60 to 90
minutes; every new map preview viewed; shots with zero console errors (section 12).

---

## 1. Scope at a glance

| Thing | Count | Reused | New work |
|---|---|---|---|
| Maps | 10 new + 1 edit | interiors copied from Willowmere's and re-dressed; map kit, preview, mapcheck | sand_road, emberpeak, 4 `pk_*` interiors, foundry_f1/f2/f3, foundry_heart; nameless_hollow east gate |
| Field mechanics | 1 new (quench) + 2 small | beam tracer, receptors, gates, blocks, Shove, Dash, Lantern, mirror doors | spout/sluice/basin events, trough/slag/crust tiles, permanent crust, flag-source gates, lifts as doors |
| Story scenes | about 30 + side scenes (under 42 built) | cutscene API, scene guards, Talk, journal, barks, vignette tint | `ep3.js`, `STAGING_EP3.md` |
| NPCs | 8 new + 1 memory actor + returns | paper-doll builder, npcs.js shape | specs, talk tables |
| Enemies | 7 ordinary + mini-boss + boss + 2 adds | rules, ai `basic`/`phased`, Cover, `charge`, HP locks, `nameless` | Heat trait, ai `specter`, ai `cinder_warden` |
| Party skills | 1 | skills.js shape | Tempered Oath (and `learn: { flag }`) |
| Items | 1 consumable, 6 key items, 16 bases, 5 uniques, 1 set | items.js, loot.js, rarity, affixes | tier 5 and 6 gear, affix tier 5 |
| Shops | 3 new + 1 restock | shops.js, shop scene | stock lists |
| Music | 5 new, 7 reused | tracker pipeline, name motif | ash_road, emberpeak, foundry, boss_warden, first_bell |
| SFX / ambience | 10 / 2 | generator | listed in 8.4 |
| Tiles | 2 new sheets | autotile, wall systems, the court kit approach | `forge.png`, `ember.png` |
| Sprites | about 30 frame sets | recolor + derive pipelines | NPCs, 7 recolors, Specter, coils, Warden x3, avatar |
| Portraits | 1 crop + 1 alias + 1 optional hand | portrait pipeline, `goggles_smith`, `garrick` | cinder_warden (crop), ilya (alias), veyra (hand, optional) |
| Backdrops | 5 | backdrop builder | battle_ash_road, battle_foundry, battle_crucible, battle_heartforge, dialog_keyart_ep3 |

Smaller than Episode 2 on purpose: one fewer map, 20 ordinary fights instead of 31, 8 townsfolk instead of 13, one
battle rule instead of four, about 230 main-path boxes.

---

## 2. Id registry (the contract)

Every id below was grepped against `src/`, `assets/tiles/tiles.json`, `assets/manifest.json`,
`assets/audio/manifest.json` and `qa/` on 2026-10-24: no collisions. Prefixes: road `sand_`/`sr_`, town `pk_` (map
`emberpeak`), dungeon `foundry_` with encounters `fo1_`/`fo2_`/`fo3_`. **Never** `ember_` (the Ember spell, `ember_edge`
combo, `of_embers` affix and the `emberpeak_glow` mark own it), never bare `garrick` (Episode 1's Willowmere NPC; the
Emberpeak record is `garrick_e`), never `vow_` (Episode 2's Court; Episode 3 says `oath_`), never `f1_`/`f2_`/`f3_`
(Archive encounters), never `rook` (Archive F3 salvager).

### 2.1 Maps

| id | Banner (title / sub) | area | size | tileset | music | ambience | lighting |
|---|---|---|---|---|---|---|---|
| `sand_road` | The Old Sand Road / Into the Ash Hills | field | 52 x 30 | town (+ ember kit) | `ash_road` | `ash_wind` | tint `ash_haze` |
| `emberpeak` | Emberpeak / Bellows Square; after `pk_restored`: Emberpeak / The First Bell | town | 40 x 32 | town (+ ember kit) | `emberpeak`, then `first_bell` | `ash_wind` | tint `ash_haze`, then none |
| `pk_inn` | The Coal Lantern Inn | interior | as `inn` | interior | map town track | none | none |
| `pk_shop` | Ventworks Supplies | interior | as `item_shop` | interior | town | none | none |
| `pk_smithy` | Emberpeak Weaponsmith | interior | as `smithy` | interior | town | none | none |
| `pk_bellhouse` | The Bell House | interior | as `chapel` | interior | town | none | none |
| `foundry_f1` | The Ashen Foundry / I. The Cinder Liftworks | dungeon | 40 x 30 | forge | `foundry` | `forge_rumble` | dark 0.2, slag lights |
| `foundry_f2` | The Ashen Foundry / II. The Ventilation Galleries | dungeon | 40 x 30 | forge | `foundry` | `forge_rumble` | dark 0.35 |
| `foundry_f3` | The Ashen Foundry / III. The Heartforge Crucible | dungeon | 44 x 32 | forge | `mystery` | `forge_rumble` | dark 0.5 (slag is the light) |
| `foundry_heart` | The Heartforge | dungeon | 24 x 20 | forge | none until the scene | `forge_rumble` | dark 0.2 |

### 2.2 Story flags (all declared in `quests.js FLAGS` with a one-line meaning)

Main: `ep3_started`, `sand_gate_open`, `sand_road_arrived`, `sand_first_fight_done`, `pk_arrived`, `met_veyra`,
`met_ilya`, `foundry_open`, `foundry_entered`, `foundry_f1_done`, `bellows_specter_defeated` (encounter flag),
`foundry_f2_done`, `vex_furnace_met`, `bell_gate_open`, `cinder_warden_defeated` (encounter flag), `garrick_named`,
`mara_named`, `first_bell_rung`, `pk_restored`, `ep3_complete`.

Beats and world state: `ep3_morning_done`, `saw_slag`, `carters_rested`, `saw_emberpeak`, `saw_memorial`,
`forge_relit`, `foundry_f1_arrived`, `foundry_f2_arrived`, `foundry_f3_arrived`, `lift_wheel_lit` (latched basin),
`bram_memory_1`, `bram_memory_2`, `bram_memory_3`, `mara_read`, `oath_hand`, `oath_heart`, `oath_home`, `clapper_get`,
`leaf_get`, `crucible_hook_found` (chest flag).

Side: Coolant `coolant_started`, `testimony_ilya`, `testimony_harl`, `testimony_sella`, `coolant_done` (also the
Warden-fight Fury bonus); Ledger `ledger_found`; Sand `sand_started`, `glass_sand_found` (chest flag), `sand_done`.
Counter (not a flag): `credits3_rolled`. Map-local chest flags: `ash_key_f1`, `ash_key_f2` and the maps' `opened` sets.

### 2.3 Key items (`items.js KEY_ITEMS`)

| id | name | icon | desc |
|---|---|---|---|
| `lift_key` | Mara's Lift Key | key | An old brass key, kept oiled for twenty-five years. Opens the foundry lift. |
| `ash_key` | Ash Key (counted, consumed) | key | A soot-black key. Opens one door in the foundry. |
| `crucible_hook` | Crucible Hook | key | A smith's hook of black iron. Opens the Heartforge. |
| `struck_list` | Corner of a List | letter | Cheap paper the fire would not take. The seal of an empty book. |
| `name_fragment_3` | Third Name Fragment | book | The Steel Leaf: the Book's names stamped in steel. |
| `glass_sand` | Sack of Glass Sand | bag (reuse the `letter` icon if no bag) | Emberpeak sand, for Vessa. |

The First Bell's clapper is story state (`clapper_get`), not an inventory item.

### 2.4 Enemies, encounters, zones (section 6)

Enemies: `cinder_hound`, `cinder_beetle`, `slag_slime`, `ashbound_miner`, `furnace_construct`, `soot_phantom`,
`forge_defender`, `bellows_specter`, `cinder_warden`, `bellows_coil`, `smelter_coil`. Encounters: `sr_first`,
`sr_hounds`, `sr_beetles`, `sr_mixed`, `fo1_beetles`, `fo1_slimes`, `fo1_miners`, `fo1_mixed`, `fo2_phantoms`,
`fo2_constructs`, `fo2_mixed`, `bellows_specter`, `fo3_defenders`, `fo3_mixed`, `fo3_furnace`, `cinder_warden`.
Zones: `sand_road`, `foundry_f1`, `foundry_f2`, `foundry_f3`, `foundry_heart` in a new `EP3_ZONE_ORDER`, kept out of
`Object.keys(ZONES)` behind `EP3_MAPS_LISTED` exactly as Episode 2 did.

### 2.5 Scenes (`ep3.js`; map and trigger)

| Scene | Map | Trigger |
|---|---|---|
| `ep3_morning` | nh_inn | on enter (`if: ep2_complete`, counter `credits2_rolled`, `EP3_LIVE`, `ifNot: ep3_morning_done`); also on enter of `nameless_hollow` for saves that left the inn (same guard) |
| `sand_gate` | nameless_hollow | step trigger `sand_gate_trig` at the new east gate (`if: ep3_started`) |
| `sand_road_arrival`, `sand_first_fight`, `slag_crossing` | sand_road | on enter; step column `first_fight_trig`; step trigger `slag_trig` |
| `carters_rest`, `ash_view` | sand_road | campfire object (`safe`, `rest`); step trigger on the rise |
| `pk_arrival`, `veyra_square`, `memorial_wall` | emberpeak | on enter; step trigger at the coolant station; memorial object |
| `ilya_bellhouse` | pk_bellhouse | step trigger inside the door |
| `garrick_forge` | pk_smithy | `garrick_e` talk entry |
| `foundry_gate` | emberpeak | gate object (`lift_key`) |
| `foundry_f1_arrival`, `bram_memory_1`, `liftworks_lift` | foundry_f1 | on enter; step trigger at the shaft; wheel basin script (first fill) |
| `foundry_f2_arrival`, `bram_memory_2`, `bellows_specter`, `ledger_ash` | foundry_f2 | on enter; step trigger under the bell; arena trigger; records object (`lantern: true`) |
| `foundry_f3_arrival`, `vex_furnace` | foundry_f3 | on enter; step trigger at the furnace mouth |
| `oath_hand`, `oath_heart`, `oath_home`, `bram_memory_3` | foundry_f3 | anvil objects; chained from the third oath |
| `cinder_warden`, `warden_after` | foundry_heart | step trigger row; after the battle |
| `first_bell`, `ep3_ending` | emberpeak | on enter after `warden_after`; chained |
| `coolant_start`, `testimony_ilya`, `testimony_harl`, `testimony_sella`, `coolant_check`, `vessa_sand` | emberpeak, pk_bellhouse, nameless_hollow | NPC talk entries and the station object |

### 2.6 NPC ids (`npcs.js`)

New: `veyra`, `ilya`, `sella`, `harl`, `bess`, `taro`, `rusk`, `garrick_e` (the Emberpeak Garrick record; tag "The
Smith" until `garrick_named`), `penny_s` (Penny on the Sand Road, same sprite and name as `penny`). Scene spawns:
`mara_m` (sprite `npc_mara`, memory tint), `bram_m` (Bram's sprite with the memory tint), `foreman_m`, `courier_v`,
`vex` (as Episode 2), `garrick_t`/`ilya_t`/`sella_t` (Heartforge actors). Hollowmere and Willowmere NPCs keep their ids
and get Episode 3 entries.

### 2.7 Audio ids

Music: `ash_road`, `emberpeak`, `foundry`, `boss_warden`, `first_bell` (new); `hollowmere`, `mystery`, `sorrow`,
`triumph`, `battle`, `victory`, `gameover` (reused). SFX: `quench_hiss`, `sluice_turn`, `water_flow`, `wheel_turn`,
`anvil_strike`, `bell_first`, `furnace_roar`, `hammer_charge`, `oath_ring`, `lift_rumble`. Ambience: `forge_rumble`,
`ash_wind`.

---

## 3. The world link: Hollowmere's east gate

Episode 2's Hollowmere has one exit (west) and a mark `emberpeak_glow` (41, 1). Edits to
`src/data/maps/nameless_hollow.js` (E3-maps), keeping every Episode 2 mark, event and walk result:

1. **The sand road gate.** A short dirt spur from the square's south-east to the east edge south of the mere (about
   x 36 to 43, rows 26 to 27), ending in a low stone arch with an iron chain (`sand_chain`, solid object,
   `ifNot: 'sand_gate_open'`, inspect "The old sand road. Chained since the carts stopped."). It must be visible in
   Episode 2 (a promise) and impassable until `sand_gate_open`.
2. The step trigger `sand_gate_trig` (`sand_gate`, `if: 'ep3_started'`) two tiles west of the chain; marks
   `sand_gate`, `vessa_gate`, `penny_cart_h`.
3. Exit on the east edge (x 43, rows 26 to 27) to `sand_road` (1, 22, 'right'), reachable only while `sand_gate_open`.
4. Walk tests: with Episode 2 complete flags the exit is unreachable; with `sand_gate_open` it is reachable.

Also: Willowmere's smithy sign reads GONE EAST. G. while `ep3_started` and not `garrick_named` (story agent:
conditional `lines`; Garrick's Willowmere `npc` record `show` hides him from `ep3_started`). The Bell House gets a
Keeper mirror (`mirror_tall`, door kind `mirror`, `if: 'mirror_sigil_get'`) paired with Hollowmere's square mirror
(5.4).

---

## 4. Maps

General rules: DESIGN 5.1 format and MAPS.md conventions; every scene mark exists and is reachable; enemy counts match
`ZONES[zone].plan`; every puzzle reads on screen without text; lit paths lead forward, dead ends hold chests; render
previews with `tools/maps/preview.py` and view them. Coordinates are approximate; the map author records exact cells
in MAPS.md. **Phone rule (CRITIQUE_4 items 7 and 8):** every sluice's state and every trough's wet/dry state must read
at phone scale (running water is animated and bright, dry troughs are dull grey); field enemies get a rim light so they
never camouflage on ash floors.

### 4.1 `sand_road`: The Old Sand Road (52 x 30, field)

The road climbs from Hollowmere's shore (south-west) to Emberpeak's south gate (north-east) through hills that go from
grey grass to ash. Enter at (0, 22 to 23).
- **The shore climb (x 0 to 14).** Grey grass, a few charred pines, the stream in its old stone trough beside the
  road. `first_fight_trig` covers the passable height of column x 6; the `sr_first` group waits at the bend about
  (11, 20). A carters' milestone `sand_milestone` (Lantern: "EMBERPEAK 3 MI. SAND FOR THE HOLLOW.", hidden ink).
- **The slag tongue (x 15 to 22).** A tongue of slag (`slag`) crosses the road between rock walls; the stream's trough
  runs alongside with sluice `sl_road` at a T. Start state sends the water away (it splashes visibly into a gully);
  turned, it runs across the slag, which crusts (`slag_trig` runs `slag_crossing` as you approach). North, behind a
  Dash-cracked boulder: iron chest (rolled).
- **The carters' shelter (x 23 to 34).** A roofless stone shelter (prefab `shelter_ruin`), the campfire
  `carters_fire` (`script: 'carters_rest'`, `safe`, `rest`), Penny's cart (`penny_s`, shop `sand_peddler`). Two
  groups nearby.
- **The rise (x 35 to 51).** Ash ground, the `ash_view` trigger at about (44, 9) with the Emberpeak silhouette decal
  `emberpeak_far` in the overhead layer. One group on the switchback. Exit north-east (51, 6 to 7) to `emberpeak`
  (19, 30, 'up').
- Enemies (4, `ZONES.sand_road.plan`): sr_first 1, sr_hounds 1, sr_beetles 1, sr_mixed 1. Chests: wood (`hi_potion`
  x2), iron (Dash, rolled). Marks: `entry`, `slag`, `fire`, `penny_cart`, `rise`, `emberpeak_far`, `town_gate`.

### 4.2 `emberpeak`: Emberpeak (40 x 32, town)

A Dragon Quest town that reads at a glance on a phone, built around one image: a silent bell over a square of ash.
- **South gate** (x 19 to 20, row 31) with Rusk. **Bellows Square** in the middle (about 14 x 10): the coolant
  station (`coolant_obj`, object, `script: 'coolant_check'`; step trigger `veyra_trig` beside it), the memorial
  "Names Etched in Iron" (`memorial`, object, `script: 'memorial_wall'`; overlay plates: one flat, one soft, both
  lettered after `pk_restored`), the Smelter Proclamation board (sign), ember pits with grates, benches.
- **North-west:** the bell tower (prefab `bell_tower_ember`, the First Bell visible; frames silent / ringing).
  **West:** the Bell House (door to `pk_bellhouse`). **East:** the Coal Lantern Inn. **South-east:** Ventworks
  Supplies. **South-west:** the Emberpeak Weaponsmith (Garrick's old forge; chimney smoke after `forge_relit`).
- **North:** a ramp up to the foundry gate in the mountain face (`foundry_door`, gate object `script: 'foundry_gate'`,
  needs `lift_key`; after `foundry_entered` an open lift door to `foundry_f1` `start`). The furnace glow above it is a
  decal that dims after `pk_restored`.
- **East road** (x 39, rows 14 to 15): decor only, a washed-out drop with a sign (inspect "The east road. Flooded past
  the ridge.", Episode 4's promise); the courier enters from here in `ep3_ending`.
- Two private homes, slag-brick walls, ash drifts. Ash particles fall until `pk_restored` (new particle kind `ash`).
- Marks: `gate_in`, `square`, `coolant`, `memorial`, `bell_tower`, `bell_rope`, `bellhouse_door`, `inn_door`,
  `smithy_door`, `foundry_door`, `east_road`, `crowd_a` to `crowd_d`, `gather_veyra`, `gather_ilya`, `gather_rusk`,
  `gather_bess`, `restored_spot`, `night_view`.

### 4.3 Interiors (copy the Willowmere counterpart's layout and exits, then re-dress)

| id | from | contents |
|---|---|---|
| `pk_inn` | `inn` | Bess at the counter (inn, 60 gold), stew pots, mark `inn_bed` (the post-credits wake point). |
| `pk_shop` | `item_shop` | Taro, shop `ventworks`, pipes and gauges. |
| `pk_smithy` | `smithy` | Sella (shop `pk_smithy`), the old forge (`forge_cold` / `forge_lit` after `forge_relit`), `garrick_e` after `ep3_started`. Marks `forge`, `anvil`. |
| `pk_bellhouse` | `chapel` | Ilya, Mara's workbench and bell molds, a hanging practice bell (inspect), the save bell (`save` event), `ilya_trig` (`ilya_bellhouse`) two tiles in, the Keeper mirror (5.4). Marks `ilya_spot`, `workbench`, `mirror`. |

### 4.4 `foundry_f1`: The Cinder Liftworks (40 x 30)

The teaching floor for quench (5.1). Areas:

| Area | Approx. floor | What it does |
|---|---|---|
| A. Lift Landing | x 16 to 23, y 24 to 28 | Arrival lift (`start` 19,27,'up'), the cistern font `font_fo1` (rest and save, `safe`), the lift home. |
| B. The Slag Hall | x 12 to 27, y 14 to 21 | **Puzzle B (permanence):** one spout in the north face, one sluice `sl_b`, two slag pools. Start state runs the water into pool 1, which crusts at once (the player sees it happen from the door) and opens a dead-end ledge with a wood chest; turned, the water runs to pool 2, the path north. The lesson: crust stays. `foundry_f1_arrival` on enter. No enemies here. |
| C. The Ore Lines | x 29 to 38, y 4 to 20 | Two groups. **Puzzle C (dam):** a heavy ore block (`heavy: true`, sprite `ore_crate`) sits in a trough and dams it; Bram's Shove moves it out, the water reaches basin `bs_c`, which opens the hot gate `hg_c`. Wood chest `ash_key` (flag `ash_key_f1`). Dead end: the sand hopper chest `glass_sand` (flag `glass_sand_found`, present only `if: 'sand_started'`). |
| D. The Shaft | x 2 to 10, y 6 to 20 | Behind the locked door `door_d` (`ash_key`). The old shaft mouth with the step trigger `shaft_trig` (`bram_memory_1`). Two groups. A Dash-cracked wall to a gold chest (`ashwalker_boots`). |
| E. North Balcony | x 12 to 26, y 2 to 7 | Reached over a crust bridge from D (a second spout and sluice; one state crusts the balcony span). Gold chest `crucible_hook` (flag `crucible_hook_found`). One group. |
| F. The Wheelhouse | x 28 to 38, y 22 to 28 | **Puzzle F (power):** route E's spout down a long trough through two sluices to the waterwheel basin `bs_wheel` (`latch`, `flag: 'lift_wheel_lit'`, `script: 'liftworks_lift'`, target the lift gate `gate_lift`). The lift down to `foundry_f2` sets `foundry_f1_done`. One group. |

- Enemies (6): fo1_beetles 2, fo1_slimes 1, fo1_miners 2, fo1_mixed 1. Chests: wood (ledge, `quench_flask` x2), wood
  (`ash_key`), wood (`glass_sand`, conditional), gold (`ashwalker_boots`, Dash), gold (`crucible_hook`), iron (F,
  rolled). Marks: `start`, `font`, `slag_hall`, `shaft`, `balcony`, `wheel`, `lift_down`.

### 4.5 `foundry_f2`: The Ventilation Galleries (40 x 30, dark 0.35)

Fans and soot; water opens things. A ring of galleries around the great fan shaft (a pit void that drops to F1's
Slag Hall, never a dead end).

| Area | Approx. floor | What it does |
|---|---|---|
| A. Lift Foot | x 2 to 10, y 22 to 28 | Arrival; `foundry_f2_arrival` on enter; font `font_fo2`. |
| B. The Bell Gallery | x 2 to 12, y 4 to 18 | The unstruck bell hanging over the walk (step trigger `bell_trig2`, `bram_memory_2`). **Puzzle B (hot gates):** a spout, a sluice, two basins each cooling one hot gate; one gate leads on, the other to a side room (iron chest). Basins latch, so both can be opened in turn. Two groups. |
| C. The Records Cage | x 14 to 22, y 2 to 8 | Three burned ledger pages (object `ledger_obj`, `lantern: true`, `script: 'ledger_ash'`); the apprentice's cache (gold chest, present `if: 'ledger_found'`: 160 gold, 2 `hi_ether`, book `foundry_ledger`). |
| D. The Long Channel | x 24 to 38, y 2 to 18 | **Puzzle D (series):** one spout, two sluices in series, three outlets; the wrong outlets splash on a floor the player stands beside (visible failure, nothing lost). The right one crusts a slag moat to the Fan Hall approach and fills basin `bs_d` (latch) for the locked door's side gate. Wood chest (`ash_key`, flag `ash_key_f2`). Two groups. |
| E. The Fan Hall | x 14 to 26, y 12 to 24 | The arena around the great fan (`specter_trig`, `bellows_specter`). Locked door `door_e` (`ash_key`) on the approach; a font room `font_fo2b` before it. After the win: the fans stop (overlay frames), the shaft stairs open; the stairs trigger sets `foundry_f2_done`; a lift door `lift_f2_short` (`if: 'foundry_f2_done'`) to F1's landing. One group on the approach. |

- Enemies (5): fo2_phantoms 2, fo2_constructs 1, fo2_mixed 2, plus the Specter. Chests: iron (B side room, rolled),
  gold (cache, optional), wood (`ash_key`), wood (`hi_potion` x2). Marks: `arrival`, `bell`, `records`, `channel`,
  `arena`, `specter_spot`, `stairs_down`, `shaft_return`.

### 4.6 `foundry_f3`: The Heartforge Crucible (44 x 32, dark 0.5)

Three wings, three anvils, one gate. The slag is the light (a `light` every few slag cells; crust is dark, so cooling a
pool changes the lighting, which is part of the read).

| Area | Approx. floor | What it does |
|---|---|---|
| Hub | x 16 to 27, y 14 to 22 | Arrival (`foundry_f3_arrival`). The Bell Gate `bell_gate` in the north face (a `gate` with `flags: ['oath_hand', 'oath_heart', 'oath_home']`, three bell sockets that light), the Smelter Proclamation cast over it (sign). After `foundry_f3_arrived` a lift door `lift_f3_short` in the south-east to F1's landing. |
| West: The Hand | x 2 to 14, y 4 to 26 | A slag lake. **Sequence puzzle:** one spout, two sluices, three pools; each crusted pool is a stepping area that reaches the next sluice; order is forced by reach, never by a wrong answer (crust is permanent). The anvil `anvil_hand` (object, `script: 'oath_hand'`) on the far shore. Two groups. |
| East: The Heart | x 29 to 41, y 4 to 26 | The darkest wing, lit by its slag. Hot gates cooled by basins; the hottest furnace's mouth on the east wall with the step trigger `vex_trig` (`vex_furnace`) and the feather prop. The anvil `anvil_heart`. Two groups. |
| South: The Home | x 10 to 33, y 24 to 30 | **Dam puzzle:** the water's short branch runs to a pool that does nothing; Shove the heavy ore block into that branch so the water takes the long way to the anvil basin. Lantern secret: Keeper ink marks on the wall show a hidden door (`wall_glyph`, reused) to a gold chest `tempered_blade` and a Keeper note (`lantern: true`). The anvil `anvil_home`. One group. |
| Gate Antechamber | x 17 to 26, y 5 to 11 | Behind the Bell Gate: `bram_memory_3` runs at the gate (chained from the third oath; if the third oath is struck in a wing, the scene runs on the party's next arrival at `gate_spot`), font `font_fo3`, the Crucible Hook door `door_heart` (`crucible_hook`, `door_boss` style) to `foundry_heart`. Wood chest (`quench_flask` x2). |

- Enemies (5): fo3_defenders 2, fo3_mixed 2, fo3_furnace 1. Chests: gold (`tempered_blade`, Lantern), iron x2
  (rolled), wood (`quench_flask` x2). Marks: `arrival`, `hub`, `gate_spot`, `anvil_hand`, `anvil_heart`,
  `anvil_home`, `furnace_mouth`, `vex_ledge`, `font`, `heart_door`.

### 4.7 `foundry_heart`: The Heartforge (24 x 20)

A round crucible hall. The Warden's map actor `cinder_warden` (sprite `cinder_warden_avatar`) before the Heartforge
furnace (a 6 x 5 object in the north face, frames: roaring, banked). An anvil `heart_anvil` and a tool rack (decor) by
the dais. Step trigger row `warden_trig` about row 14. After `cinder_warden_defeated`: actors `garrick_t`, `ilya_t`,
`sella_t` (`if: cinder_warden_defeated`, `ifNot: pk_restored`), and the lift `lift_heart_up` to `emberpeak`
`foundry_door` (its arrival runs `first_bell`). Marks: `warden`, `forge`, `anvil`, `party_stop`, `garrick_enter`,
`garrick_anvil`, `bram_anvil`, `leaf_spot`.

### 4.8 Marks and named events checklist (for `qa/maps`, mirrored in `STAGING_EP3.md`)

| Map | Marks / named events |
|---|---|
| `nameless_hollow` (edit) | `sand_gate`, `vessa_gate`, `penny_cart_h`; object `sand_chain`; trigger `sand_gate_trig`; exit east |
| `sand_road` | as 4.1; enemy `e_sr_first`; objects `sand_milestone`, `carters_fire`; sluice `sl_road`; NPC `penny_s` |
| `emberpeak` | as 4.2; NPCs `veyra rusk harl bess taro`; objects `coolant_obj`, `memorial`, `foundry_door` |
| `pk_*` | as 4.3; NPCs `ilya sella garrick_e bess taro`; mirror door in `pk_bellhouse` |
| `foundry_f1` | as 4.4; basins `bs_c`, `bs_wheel`; heavy block in C |
| `foundry_f2` | as 4.5; basins `bs_b1`, `bs_b2`, `bs_d`; object `ledger_obj` |
| `foundry_f3` | as 4.6; gate `bell_gate`; anvils; trigger `vex_trig`; heavy block in Home |
| `foundry_heart` | as 4.7; actor `cinder_warden`; lift `lift_heart_up` |

---

## 5. Field systems (E3-world)

### 5.1 Quench channels: the Episode 3 field mechanic

**Why this one.** It is the forge's own logic (heat, then a water quench: the root game's Emberpeak Tempering trial),
it reads from the floor art alone (water you can see running in a stone trough, slag that glows, crust that does not),
it needs no timing (no step timers, no real-time pressure: phone-safe), and it costs little: the tracing is Episode 2's
pure `beam.js` with a medium option, the basins are Episode 2's latched receptors, the hot gates are ordinary gates,
the dams are W9's heavy blocks. What makes it play differently from the beams is one rule: **cooled slag stays
cooled**. Beam bridges exist only while the beam passes, so Episode 2's puzzles were "commit to one side"; quench
puzzles are "cool this, then redirect to that", sequences that never undo themselves. Estimated cost: one M agent
(E3-world), about half of Episode 2's beam work.

**Event types** (new, in the existing `{ id, type, x, y, if?, ifNot? }` shape):

| type | fields | behavior |
|---|---|---|
| `spout` | `dir`, `sprite?` (`spout_wall` in a face, `spout_cistern` on the floor) | Water source; emits from its cell in `dir` along flow cells. Always on while present. |
| `sluice` | `state` (0 = '/', 1 = '\'), `fixed?`, `sprite?` (`sluice`) | A paddle at a trough junction. Turns water exactly like a mirror turns a beam (`beam.js` rules). Confirm while facing toggles (`sluice_turn`) unless `fixed`. Solid (one cell, like a mirror), so it is always faced, never stood on. |
| `basin` | `target`, `latch?`, `flag?`, `script?`, `face?` | The water's receptor: a stone basin or a waterwheel (`sprite: 'waterwheel'`). Filled while water enters; gate source while filled; `latch`/`flag`/`script` exactly as Episode 2 receptors. `wheel_turn` or a splash on first fill. |

**Tiles** (tiles.json gains an optional `flow` key): trough tiles `trough_h`, `trough_v`, `trough_ne/nw/se/sw`,
`trough_t_*` (`flow: 'channel'`, collision `none`: walkable, shallow), each with dry and wet frames (wet = animated);
`slag` (A1 animated 3 frames, `flow: 'slag'`, collision `water`, gives light); `slag_crust` (`flow: 'channel'`,
collision `none`, dark rock with dim red cracks). Hot gates: `hot_grate_closed` (glowing, solid) / `hot_grate_open`
(cooled, steam wisps) as a `GATE_SPRITES` pair.

**Tracing rules** (extend `src/world/beam.js` with `medium: 'water'`; keep it pure and node-tested):
- Water moves cell by cell from a spout, **only over cells whose tile has `flow`** (troughs, slag, crust). At any
  other cell it stops and leaves a splash (a puddle decal, no collision).
- Sluices turn it as mirrors turn beams. Basins fill and stop it. Solid things on a flow cell (heavy or push blocks,
  closed gates) stop it (a dam). Actors never block it.
- A slag cell the water reaches becomes `slag_crust` **permanently** for that save (stored in `g.quenched[mapId]` as
  cell indices; `steam` particles and `quench_hiss` the first time). Water keeps flowing along crust.
- Loop guard and 256-cell cap as beams. One medium per map in Episode 3 (no map mixes beams and water).
- Recompute on load, sluice turn, block move, gate change, basin latch. Deterministic.

**Drawing.** Wet trough frames animate (3 frames, bright `water` ramp with a white glint that travels); dry ones are
dull grey stone. Slag glows (`fire` ramp) and lights its neighborhood in dark maps (budget: a neutral light every
second slag cell, at most 24 per map); crust is dark with faint red cracks for two seconds after cooling, then still.
Steam puffs at the cooling front. Under `reduceMotion` the glint and steam are off; the wet/dry frames stay.

**Persistence.** Sluice states and block positions reset on re-entry (as mirrors and blocks). Crust and latched basins
persist through the save.

**Softlock rules** (asserted by `qa/maps`): water only ever adds walkable cells and opens latched gates; troughs are
walkable, so a block parked in one can never wall the party in; every sluice is reachable from the cells its water
serves; each puzzle's start state crusts nothing critical and the intended solution does; the map's critical path is
reachable with every reachable sluice assignment explored (mapcheck enumerates sluice states per spout system, as it
does mirrors; keep each system at 6 sluices or fewer).

**Teaching ladder** (one idea per step): road (one paddle, one slag tongue) -> F1 B (crust stays: two pools, in turn)
-> F1 C (a block dams a trough: Shove it) -> F1 F (water powers a wheel) -> F2 B (water cools hot gates) -> F2 D (two
sluices in series, visible wrong outlets) -> F3 Hand (a sequence across a lake) -> F3 Heart (the dark: slag is the
light) -> F3 Home (use a block as a dam on purpose). First-time barks in `BARKS` (fired the first time the party faces
a sluice, cools slag, fills a basin): `first_sluice` (Bram: "Paddle. Turns the water. Carters used these."),
`first_quench` (scene 6's line), `first_basin` (Mira: "Full basin, cooled grate. Water opens things here.").

### 5.2 Small additions

- **Flag-source gates.** `gate` events accept `flags: [...]` (AND of story flags) as a source, re-checked on
  `setFlag`. The Bell Gate's three sockets light as each flag lands.
- **Lifts.** `door` with `kind: 'lift'` and a lift sprite: a short rumble (`lift_rumble`), a fade, transfer; no other
  new logic.
- **Tint and particles.** New tint `ash_haze` (warm grey multiply, lower saturation, slight orange in the highlights);
  it must read clearly darker and dustier than `none` on a phone (CRITIQUE_4 item 3 measured Episode 2's dusk as
  daylight: measure mean luminance and keep `ash_haze` at least 12% below `none`). New particle kind `ash` (slow grey
  flakes, area-limited, under 0.3 ms per frame) and `steam` (short white puffs).
- **Memory vignettes.** Reuse Episode 2's vow-vignette tint for Bram's memories (`bram_m`, `mara_m`, `foreman_m`
  spawned in a warm sepia tint, a soft vignette edge).
- **Speaker swap.** The Aurel mechanism (actor swapped under a name flash so the tag changes) for "The Smith" to
  "Garrick".

### 5.3 Story plumbing (`src/game/**`)

- `story.js` merges `ep3.js` scenes and lines; a content test asserts ids unique across all three episodes.
- The `ep3_complete` handoff mirrors Episode 2's: push `credits` with `CREDITS_EP3`, set counter `credits3_rolled`,
  then the end card (`END_CARD_EP3`: "To be continued" / "Episode 4 is not playable yet."), then wake at `pk_inn`
  `inn_bed` in day light.
- When the episode switch is on, `END_CARD_EP2`'s sub becomes "Episode 3 begins in the morning." and `epilogue2`
  Talk and journal point at the sand road gate.
- `newGameEp3` and the episode switch: section 10.

### 5.4 Keeper mirror and shortcuts

| From | To | Present while |
|---|---|---|
| Bell House mirror | Hollowmere square mirror (`mirror_warp_sq`) and back | `mirror_sigil_get` and `pk_arrived` |
| F2 lift `lift_f2_short` | F1 landing | `foundry_f2_done` |
| F3 lift `lift_f3_short` | F1 landing | `foundry_f3_arrived` |
| `lift_heart_up` | Emberpeak foundry door | `cinder_warden_defeated` |

Hollowmere's square mirror already links to the Court and (through the chapel) to Willowmere, so the Bell House
mirror joins the network with one pair.

### 5.5 W9 abilities and the Lantern in Episode 3

| Ability | Where | Critical? | Fallback |
|---|---|---|---|
| Shove | F1 C dam (critical), F3 Home dam (critical) | yes | the ore block becomes `push: true` |
| Dash Strike | road boulder (iron chest), F1 D cracked wall (Ashwalker Boots), a free first turn from behind | no | breakable object |
| Appraise | 7 bestiary entries; the Specter and the Warden can be read in the field (phase 1) | no | in-battle |
| Lantern | road milestone, F2 ledger (side story), F3 Home hidden door (Tempered Lexicon Blade) | no | exists |

---

## 6. Combat (E3-battle)

### 6.1 Level and EXP targets

`expForLevel`: Lv 13 2800, 14 3339, 15 3931, 16 4578, 17 5280 (Fact, `party.js`). Episode 2 finishers arrive at about
2850 to 3100.

| Zone | Plan fights | Level in | Level out (all fights) | First-pass EXP |
|---|---|---|---|---|
| sand_road | 4 | 13 | 14 | +450 |
| foundry_f1 | 6 | 14 | 15 | +600 |
| foundry_f2 | 5 + the Specter | 15 | 16 | +500, +160 for the Specter |
| foundry_f3 | 5 | 16 | 16 (near 17) | +460 |
| foundry_heart | 1 | 16 | 17 | +620 |

At 80% of fights the Warden is fought at Lv 16 (a level lower than "all fights" only at the very end). Fewer fights
than Episode 2 means each one pays more (about 85 EXP an ordinary fight).

### 6.2 Enemy roster

First pass, scaled from Episode 2's F3 band by the 6.8 method of `EPISODE2_PLAN.md`; **the simulator targets are
binding**. Every ordinary foe uses a different `enemies.webp` cell, so each reads as a new being.

| id | Name | Family, size | Lv | HP | ATK / MAG | DEF / SPR | SPD | Sh | Weak | Resist | EXP / Gold | Moves (**telegraph**) | Trait | Art |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `cinder_hound` | Cinder Hound | beast | 13 | 300 | 60 / 12 | 18 / 12 | 17 | 2 | ice, spear | fire | 60 / 70 | Bite, Ember Snap (Burn 20%) | evade 0.1 | cell 2, charcoal fur, ember mane |
| `cinder_beetle` | Cinder Beetle | insect | 13 | 290 | 62 / 10 | 30 / 16 | 9 | 3 | ice, axe | fire, sword, bow | 66 / 80 | Stoke (forced opener), Shell Ram, **Flare Ram** (single 200%) | Heat | cell 3, black carapace, glowing seams |
| `slag_slime` | Slag Slime | ooze | 14 | 260 | 50 / 64 | 12 / 18 | 10 | 2 | ice, thunder | fire | 62 / 70 | Splash (Burn 25%), Stoke, **Slag Burst** (party mag fire 110%) | Heat | cell 0, molten orange with a dark crust |
| `ashbound_miner` | Ashbound Miner | spirit | 14 | 330 | 70 / 30 | 16 / 22 | 12 | 3 | light, bow | ice | 72 / 90 | Pick Swing, Lamp Flash (Blind 25%) | basic | cell 1, soot shade carrying a lamp |
| `furnace_construct` | Furnace Construct | construct, large | 15 | 480 | 82 / 30 | 30 / 18 | 7 | 5 | ice, thunder | fire, sword, spear | 90 / 120 | Iron Fist, Stoke, **Overheat** (party 140%) | Heat | cell 4, bronze golem, furnace core |
| `soot_phantom` | Soot Phantom | spirit, flying | 15 | 340 | 50 / 80 | 14 / 26 | 14 | 3 | light, bow | fire | 80 / 100 | Soot Cloud (party Blind 15%), Choke (Silence 25%), Cinder Touch | evade 0.2 | cell 7, soot black, ember eyes |
| `forge_defender` | Forge Defender | construct, large | 16 | 520 | 92 / 30 | 34 / 20 | 10 | 5 | ice, axe, light | sword, spear, fire | 100 / 140 | Tempered Blow, Cover, Stoke, **Brand** (single 220%) | Heat + Cover | cell 5, bronze knight, molten visor |

Groups: sr_first = cinder_beetle, cinder_hound (scripted, beetle forced to Stoke first); sr_hounds = cinder_hound x2;
sr_beetles = cinder_beetle x2; sr_mixed = cinder_hound, slag_slime. fo1_beetles = cinder_beetle x2, slag_slime;
fo1_slimes = slag_slime x3; fo1_miners = ashbound_miner x2; fo1_mixed = ashbound_miner, cinder_beetle.
fo2_phantoms = soot_phantom x2; fo2_constructs = furnace_construct, soot_phantom; fo2_mixed = furnace_construct,
ashbound_miner. fo3_defenders = forge_defender, soot_phantom; fo3_mixed = forge_defender, slag_slime x2;
fo3_furnace = furnace_construct x2. Elites at the normal rate.

### 6.3 The Heat rule (the episode's one new battle rule)

- A foe with `heat: { max: 3, step: 0.15, flare: '<skill>' }` gains 1 Heat each time it uses Stoke (and some foes on
  being hit by fire). Each Heat level gives +15% ATK and MAG.
- On reaching 3, it announces its flare one turn early ("The beetle glows white..."), and uses it on its next turn.
- **Quench:** any ice damage, a Quench Flask, or a Break sets Heat to 0, cancels a pending flare, and plays
  `quench_hiss` with a steam puff ("Quenched!"). This is the field mechanic's verb in battle.
- Heat pips (3 small flames) draw beside the foe's weakness row, **always visible while a command is being chosen**
  (PLAYTEST_REVIEW_4 fix 6) and placed under the feet or above the head, never across a body (CRITIQUE_4 item 1).
- The Auto policy (`competent`) learns: quench a foe at Heat 2 or more if it can, Defend against an announced flare
  otherwise.

### 6.4 Mini-boss: the Bellows Specter (`bellows_specter`)

Boss table, no flee, music `battle`, backdrop `foundry`, flag `bellows_specter_defeated`, ai `specter`. Lv 15, HP 1400,
ATK 90, MAG 96, DEF 20, SPR 20, SPD 14, 6 shields, weak ice, bow, spear; resist fire; immune Blind. Heat max 3.
- It **Stokes every turn** (the fans feed it). At Heat 3 it announces **Furnace Breath** (party fire mag 160%, Burn
  30%): "The Specter draws the whole draft into its chest..." Answers: quench it first (ice, a flask, Break), or
  Defend.
- At 50% "the fans reverse": it gains Haste and from then on Stokes twice per turn when it is not hit by ice that
  round, so the quench pressure doubles. One idea, taught twice.
- Targets: careful 7 to 9 rounds, win 85%+; attack-only 60% or less; ignoring the telegraph costs at least 10 points.
- Rewards: EXP 160, gold 600, mastery 16. Drops: unique `updraft_charm`, 1 rare roll (ilvl 15), hi_potion 2.
- Art: `enemies.webp` cell 6 (the storm roc) recolored to smoke and ember with soot-trail wings, at 1x within the
  96 px enemy cell (no non-integer scaling), derived frames via `anim_frames.py`.

### 6.5 Boss: the Cinder Warden (`cinder_warden`), Bram at the center

Boss table, no flee, music `boss_warden`, backdrop `heartforge`, flag `cinder_warden_defeated`, ai `cinder_warden`.
Lv 16, HP 3000, ATK 170, MAG 150, DEF 22, SPR 18, SPD 12, family construct; immune to Stun, Silence, Poison, Blind.
Heat max 3. HP locks so one hit never skips a phase.

1. **Tempered Iron** (100% to 70%). Weak ice, spear; resist fire, sword; 7 shields. Hammerfall (phys 115), Ember
   Spray (party fire 90, Burn 20%), Stoke. At Heat 3 it announces **Strike the Name** on one party member: "The
   Warden raises its hammer over {target}..." Unless the target Defends or Bram's Tempered Oath covers it, the target
   becomes **Nameless** (the existing status: Silence and a stat drain, cured by Recall or Silver Salve) and Heat
   resets.
2. **Molten Shell** (from 70%). Summons **Bellows Coil** and **Smelter Coil** (canon). While either stands the shell
   holds: the Warden takes 25% damage, its shields cannot be chipped, and its HP cannot fall below 31% (canon lock).
   - `bellows_coil`: Lv 16, HP 380, 2 shields, weak ice, spear; resist fire. **Stoke the Warden** (+1 Heat to the
     Warden every turn). Kill it first and Strike the Name slows down.
   - `smelter_coil`: Lv 16, HP 420, 3 shields, weak ice, axe; resist fire. **Slag Spray** (party fire 100, Burn 30%)
     every 2 turns. Kill it first and the damage stops.
   - The decision is which coil first. When both are gone the shell cracks: the Warden is Broken one turn.
3. **Quenched Core** (after the shell). Weak ice, spear, light; no resists; 8 shields; Haste. Hammerfall, Strike the
   Name (at Heat 3), and **Last Hammer** (party phys 230%) announced every 3rd turn: "The Warden raises the Last
   Hammer. The whole forge holds its breath..." Answers: everyone Defends; Break it; Lunge knocks it back 35% of a
   turn (canon: the spear interrupts its charge); or **Tempered Oath**.

**Tempered Oath** (`tempered_oath`, Bram, 8 MP, self; learned in `bram_memory_3` through a new `learn: { flag:
'bram_memory_3' }`, fallback `learn: { level: 15 }`). Until Bram's next turn: Taunt and Protect on Bram; single-target
attacks on allies go to Bram; Bram cannot be made Nameless ("Bram is saying her name"). If the Last Hammer lands while
the Oath holds, **Bram takes it alone at 50%** and the Warden is **Broken**: "The hammer rings on Bram like a bell."
(`oath_ring`). Help text (40 chars): "Stand in front. Turns a hammer blow."

This is the boss's central decision and it is Bram's: read the telegraph, put Bram in front a turn early, and the
Warden's biggest move becomes the party's Break window. It answers the Archivore's Devour Name and the King's Keeping
with the opposite verb: not "protect the target" but "become the target".

- **Coolant bonus:** with `coolant_done` the party starts with +25 Fury (encounter option `startFury`, as Episode 2).
- Targets: careful 9 to 13 rounds, win 85%+; attack-only 60% or less; ignoring telegraphs costs at least 15 points;
  careful play uses Tempered Oath on at least half the Last Hammers.
- Rewards: EXP 620, gold 900, mastery 26. `BOSS_LOOT.cinder_warden`: unique `warden_heart` (the Ember Heart), 2 rare
  rolls (ilvl 16), phoenix_feather 1, hi_ether 2. The First Bell Hammer is staged in `warden_after`.
- Art: `bosses.webp` cell 2 at 1x in the 160 x 144 boss cell; three looks: Tempered Iron (as painted, darker bronze),
  Molten Shell (glowing seams, a heat halo), Quenched Core (shell cracked away, a white-hot core, the hammer-head a
  bell's clapper); a field avatar at map scale with a back frame. Coils: a small new sprite (a coil of glowing pipe on
  a bronze stand), two recolors.

### 6.6 Simulator

Zones, `LOADOUTS` (sand_road = the `court_throne` loadout plus the Kept Promise and tier 4 gear; foundry_f1 plus two
tier 5 pieces; foundry_f2 plus Ashwalker Boots; foundry_f3 plus two tier 6 pieces; foundry_heart plus the Updraft
Charm and mastery up one step), `TARGETS` (ordinary as Episodes 1 and 2, with Foundry F3 the tightest ordinary floor:
careful HP lost 18 to 24%, attack-only win 70 to 85%, the PLAYTEST_REVIEW_4 fix 8 lesson; `bellows_specter` and
`cinder_warden` as 6.4 and 6.5; `levels` from 6.1). The policies learn Heat and Tempered Oath (6.3, 6.5). Tune until
`--check` prints "All targets met" for all three episodes.

---

## 7. Loot, items and shops

### 7.1 Consumable

| id | Name | Price | Effect |
|---|---|---|---|
| `quench_flask` | Quench Flask | 90 | Ice damage (power 120) to one foe and quenches its Heat. |

### 7.2 Equipment (new bases)

Tier 5 (ilvl 14; Emberpeak from arrival): `ashsteel_cuirass` (body, hero/bram, 1900, DEF +17), `founders_robe` (body,
mira, 1850, DEF +11, SPR +9, MAG +4), `ashsteel_helm` (head, hero/bram, 900, DEF +8, SPR +2), `soot_hood` (head, mira,
950, DEF +4, SPR +7, MAG +4), `cinder_boots` (boots, all, 900, SPD +2, DEF +2, fire resist 10%), `carter_mantle`
(mantle, all, 850, DEF +4, SPR +3, LUK +3), `coalheart_charm` (charm, all, 800, fire resist 25%, DEF +2),
`bellchime_charm` (charm, all, 850, SPR +4, Silence resist 50%).

Tier 6 (ilvl 16; the family forge after `foundry_f2_done` and `forge_relit`, sold by Garrick): `tempered_sword`
(sword, hero, 3200, ATK +36, crit +6), `forge_axe` (axe, hero/bram, 3300, ATK +42, SPD -1), `heartforge_pike` (spear,
bram, 3250, ATK +38, DEF +3), `founders_rod` (staff, mira, 3200, ATK +11, MAG +31, SPR +5, MP +10), `bellwire_bow`
(bow, mira, 3200, ATK +33, SPD +1, crit +3), `tempered_mail` (body, hero/bram, 2800, DEF +23, SPR +4), `ashweave_robe`
(body, mira, 2700, DEF +14, SPR +12, MAG +5), `forge_helm` (head, hero/bram, 1400, DEF +10, SPR +3).

The Tempered Lexicon Blade against the Silverglass Blade and Lanternheart stays a choice (ice versus light), not an
automatic upgrade.

### 7.3 Uniques and the set (placed, never random)

| id | Name | Rarity | Slot | Stats | Source |
|---|---|---|---|---|---|
| `first_bell_hammer` | First Bell Hammer | legendary | axe (bram, hero) | ATK +46, crit +6, Fury gain +15%, light +10% | Garrick, in `warden_after` (staged give with the beam) |
| `tempered_blade` | Tempered Lexicon Blade | legendary | sword (hero) | ATK +40, crit +8, ice +15% | F3 Home, Lantern secret (canon name) |
| `warden_heart` | Ember Heart | legendary | charm | ATK +5, MAG +5, fire resist 30%, Fury gain +10% | the Cinder Warden (guaranteed; canon reward name) |
| `updraft_charm` | Updraft Charm | legendary | charm | SPD +2, Fury gain +15% | the Bellows Specter (guaranteed) |
| `emberglass_charm` | Emberglass Charm | rare (unique) | charm | MAG +4, fire resist 15%, Burn resist 50% | Vessa's Sand |
| `ashwalker_boots` | Ashwalker Boots | set | boots | SPD +2, DEF +3, fire resist 10% | F1 Dash secret |
| `ashwalker_mantle` | Ashwalker Mantle | set | mantle | DEF +5, SPR +4, Burn resist 30% | the Coolant Station |

Set `ashwalkers_road` (2 pieces): fire resist +20%, SPD +1.

### 7.4 Affixes and names

Add a fifth tier at ilvl 14 to every affix that has four (about +15% over tier 4; resist suffixes cap at 100).
`RARE_NAME_A` gains Ashen, Tempered, Forged, Banked, Cinder.

### 7.5 Drop tables

`ZONE_LOOT`: sand_road ilvl 13, equipChance 0.16; foundry_f1 ilvl 14, 0.16; foundry_f2 ilvl 15, 0.17; foundry_f3
ilvl 16, 0.18. Random tables never roll legendaries.

### 7.6 Shops and the inn

| Shop id | Keeper | Stock |
|---|---|---|
| `sand_peddler` | Penny (`penny_s`) | potion, hi_potion, ether, hi_ether, antidote, eye_drops, echo_herb, phoenix_feather, tent, silver_salve, quench_flask, cinder_boots (peddler markup as Episode 2) |
| `ventworks` | Taro | the same consumables at list price plus quench_flask, coalheart_charm, bellchime_charm, carter_mantle |
| `pk_smithy` | Sella, then Garrick | tier 5 gear and the tier 4 weapons; tier 6 (`ifFlag: foundry_f2_done`, `forge_relit`) |
| `hollow_smithy` (restock) | Vessa | `emberglass_charm` copies are not sold; after `sand_done` she sells tier 5 Mira gear |

Coal Lantern Inn: 60 gold. Gold check (Inference; the simulator's gold column settles it): about 1500 carried in,
about 400 from the road, 900 from F1, 1300 from F2 with the Specter, 1000 from F3, plus chests and sales: two tier 5
pieces in town and two tier 6 pieces before F3, never everything.

---

## 8. Music and sound

### 8.1 New tracks (E3-audio; composed in code like Episode 2's five; the shared four-note name motif; -16 LUFS)

| id | Title | Role | Brief | Key, tempo | Motif | Fallback |
|---|---|---|---|---|---|---|
| `emberpeak` | Bellows Square | the town before the bell | The root region-3 brief, muted: low strings, hammered dulcimer, measured anvil percussion, brass held back; a toll on the downbeat that never comes (a rest where the bell should be). | D minor, 104 BPM, 4/4, 70 to 90 s | the motif on dulcimer, the fourth note replaced by a rest | `hollow` |
| `first_bell` | The First Bell | the town after `pk_restored`, the end of `warden_after`, `CREDITS_EP3` | The same theme, full: brass and choir, a real bell on every downbeat of the A section, the fourth note landing on the bell. | D major, 104 BPM, 70 to 90 s | complete, on the bell | `hollowmere` |
| `ash_road` | The Old Sand Road | sand_road | Travel theme: fiddle and low whistle over a cart-wheel rhythm, ash-grey harmony warming to amber by the B section. | A minor to C major, 100 BPM, 90 s | the whistle's opening | `fading_road` |
| `foundry` | The Ashen Foundry | foundry_f1, foundry_f2 | Dungeon: an ostinato built from hammer and anvil hits and a steam-valve hiss, low brass pedal, a cold flute line that plays the motif in long notes over the heat. | E Phrygian, 88 BPM, 90 s | motif in the flute, augmented | `court` |
| `boss_warden` | The Cinder Warden | the Warden's battle | 7/8 drive: anvil strikes on the accents, low brass and timpani, choir; the B section quotes `first_bell` in minor (the bell as the weapon's head); a last major bar before the loop. | C minor, 144 BPM, 7/8, 110 to 120 s | the motif in the brass, the bell quote | `boss_king` |

Suno rows for `docs/SUNO_PROMPTS.md` with the shared style line: `emberpeak.mp3` uses the root region-3 prompt;
`foundry.mp3` "industrial fantasy dungeon, anvil and steam percussion, low brass, cold flute, 88 BPM";
`boss_warden.mp3` "boss battle in 7/8, anvil strikes, brass, timpani, choir, a bell motif in minor, 144 BPM";
`first_bell.mp3` "triumphant town theme, brass and choir with a great bell on every downbeat, 104 BPM".

### 8.2 Cue sheet by map

| Map | Track |
|---|---|
| nh_inn, nameless_hollow (Act I) | `hollowmere` |
| sand_road | `ash_road` |
| emberpeak and `pk_*` | `emberpeak`; `first_bell` after `pk_restored` |
| foundry_f1, foundry_f2 | `foundry` |
| foundry_f3 | `mystery` (house rule: the last floor before a boss is the quiet one) |
| foundry_heart | silence until `cinder_warden` |
| ordinary battles, the Bellows Specter | `battle` |
| the Cinder Warden | `boss_warden` |

### 8.3 Cue sheet by scene (a scene that leaves its map's track puts it back before it ends)

| Scene | Cue |
|---|---|
| `ep3_morning` | `hollowmere` until Bram cannot say the name, then `sorrow`, back to `hollowmere` |
| `carters_rest` | the map track, softer (volume 0.6) |
| `ash_view` | `mystery` |
| `memorial_wall` | `sorrow`, back to `emberpeak` |
| `ilya_bellhouse` | `emberpeak` |
| `bram_memory_1`, `bram_memory_2` | `sorrow` with a distant `bell_first`, back to `foundry` |
| `bellows_specter` | silence for the intro, then `battle` |
| `vex_furnace` | silence, then `mystery`, back to `mystery` |
| oaths | `anvil_strike`, `bell_first`; no music change |
| `bram_memory_3` | silence, `bell_first`, then `sorrow`, back to `mystery` |
| `cinder_warden` | silence, title card, `boss_warden` |
| `warden_after` | `sorrow` (the Warden kneels) -> `triumph` (the names rise) -> `mystery` (the hero's stamp) -> `first_bell` (the hammer) |
| `first_bell` | `bell_first` x3, then `first_bell` |
| `ep3_ending` | silence, `bell_first` once (soft), `mystery` on "Under water.", end cards |
| credits | `first_bell` |

### 8.4 SFX and ambience (E3-audio, synthesized like the Episode 1 and 2 sets)

| id | Use | Brief |
|---|---|---|
| `quench_hiss` | slag cools; a foe is quenched | a sharp hiss with a crackle, about 0.7 s |
| `sluice_turn` | a sluice paddle turns | wooden clunk plus a water slosh |
| `water_flow` | water starts running in a trough | a short rush settling to a trickle |
| `wheel_turn` | the waterwheel starts | creak, two slow clacks |
| `anvil_strike` | an oath anvil; the reforging | a clean ringing anvil hit |
| `bell_first` | the First Bell | a deep bronze bell, long decay, slightly flat |
| `furnace_roar` | the Heartforge, the hottest furnace | a low roar swell |
| `hammer_charge` | the Last Hammer telegraph | a rising metallic whine |
| `oath_ring` | Tempered Oath turns the hammer | a bell-like clang with a shimmer |
| `lift_rumble` | ore lifts | chain rattle and a low rumble |
| `forge_rumble` (ambience) | the foundry | distant hammering, steam, a low furnace drone |
| `ash_wind` (ambience) | the road and the town | dry wind with a faint crackle |

---

## 9. Asset list: what is reused and what is new

### 9.1 Tiles and tile objects (E3-tiles; new sheets `forge.png` and `ember.png`, existing sheets untouched)

| Asset | Reuse | New |
|---|---|---|
| Foundry terrains `foundry_floor` (F1 riveted iron plate), `ash_floor` (F2 soot stone), `crucible_floor` (F3 dark basalt with bronze inlay) | A2 builder, the court per-floor kit approach | three terrains, one per floor (CRITIQUE_3/4: floors must not look alike) |
| Walls `foundry` (F1 brick and iron), `galleries` (F2 soot stone with vent grilles), `crucible` (F3 basalt with bronze ribs) | wall systems with outer faces | three wall systems, with per-room variety from the start (CRITIQUE_4 item 6: no grey grid floating in black) |
| `slag` (A1, 3 frames, `flow: 'slag'`), `slag_crust` | the A1 water/ink pool animation | palette and frames |
| Troughs `trough_*` dry and wet frames (`flow: 'channel'`) | the inlay line tiles | all |
| Objects: `spout_wall`, `spout_cistern`, `sluice` (two states, big readable paddle), `basin` (empty, full), `waterwheel` (still, turning), `hot_grate_closed` / `_open`, `ore_crate` (heavy block skin), `anvil_oath` (cold, struck), `bell_gate` (0 to 3 sockets lit, open), `door_crucible` (boss door), `ore_lift` (door), `font_cistern`, `heartforge` (6 x 5: roaring, banked), `furnace_mouth`, `fan_great` (2 frames, stopped), `bellows_decor`, `pipes_*`, `ledger_burned`, `tool_rack` | push block, receptor, gate, font, door_boss drawing style | all |
| Town kit: `bell_tower_ember` (First Bell, silent/ringing), `bellhouse`, `inn_coal`, `shop_vent`, `smithy_ember` (chimney smoke frames), iron roofs, slag-brick walls, ember pits, the memorial (plates: flat, soft, lettered), the coolant station, the proclamation board, `shelter_ruin`, charred pines, ash drifts, `emberpeak_far` decal (from environments cell 2, quantized) | every Willowmere prefab, `roof_blue` recolors | the iron and ash palette swap |
| Terrain `ash_ground` (outdoor), `cinder_path` | grass/dirt autotiles | recolor and texture |

### 9.2 Sprites (E3-sprites)

| Asset | Reuse | New |
|---|---|---|
| NPCs `npc_veyra`, `npc_ilya`, `npc_sella`, `npc_harl`, `npc_bess`, `npc_taro`, `npc_rusk`, `npc_mara` (memory), `npc_courier_v` | paper-doll builder; bodies: guard for Rusk, the smith body for Ilya, Sella and Taro, robe for Veyra's coat | 9 specs (Veyra: soot-streaked, rolled sleeves, whistle; Ilya: copper beard, brass goggles, apron, to match `goggles_smith`; Mara: auburn hair tied back, founder's apron, a bell hammer) |
| Garrick | `npc_smith` and the `garrick` portrait (exist) | none |
| Enemy battle sprites, the 7 of 6.2 | enemies.webp cells 0 to 7, the recolor and derive pipeline, `anim_frames.py` | recolor recipes; rim light on every ash-colored foe (CRITIQUE_2 D3 lesson) |
| `bellows_specter` | enemies.webp cell 6 | recolor, smoke wings, frames |
| `cinder_warden` x3 looks, `cinder_warden_avatar` | bosses.webp cell 2, `build_bosses.py`, the `archivore_avatar` approach | the three looks and the avatar |
| `bellows_coil`, `smelter_coil` | none | a small new sprite, two recolors |
| Field sprites for every new enemy (with rim light) | `enemies_field` layout | frames |
| Portraits: `ilya` | `goggles_smith` (built, unused) | an alias entry |
| Portrait `cinder_warden` | bosses cell 2 crop via `build_portraits.py` | crop recipe, readable at 48 (CRITIQUE_4 item 5: the King's crop was a blob) |
| Portrait `veyra` (optional) | the Episode 1 painted set as the quality bar | hand-pixeled only if it matches Episode 1's tier; otherwise none (house rule) |
| Timeline heads `head_<id>` | `build_heads.py` | entries |
| UI icons `icon_heat`, `icon_oath`, `icon_leaf` | `art_icons.py` | three icons |

**Bram's look (decision for Scott, 12).** The portrait is grey-bearded, the field and battle sprites young and
brown-haired (PLAYTEST_REVIEW_4 "Also seen"). Episode 3 makes his age story-load-bearing ("I was twenty", twenty-five
years ago). Default: E3-sprites adds grey to Bram's beard and temples in the existing field and battle frames (a
recolor, no redraw), shown side by side before it is kept.

### 9.3 Backdrops and key art (E3-tiles, `tools/art/backdrops`)

| id | Source | Use |
|---|---|---|
| `battle_ash_road` | composed like `compose_valley.py`: ash hills, charred pines, the mountain glow | sand_road |
| `battle_foundry` | environments.webp cell 2 (Emberpeak), brightness about 0.8, warm grade | foundry_f1, foundry_f2 |
| `battle_crucible` | cell 2, brightness about 0.55, deep red grade | foundry_f3 |
| `battle_heartforge` | cell 2, a tighter crop on the forge, hot grade | the Cinder Warden |
| `dialog_keyart_ep3` | cell 2 with the baked vignette | Episode 3 title cards and `CREDITS_EP3` |

### 9.4 What Episode 3 does not need

No new party art beyond Bram's recolor, no new UI windows, fonts or cursors, no new jingles, no new engine core
modules, no new status (Heat is a counter on the foe; Nameless is reused).

---

## 10. Save compatibility (E3-saves; read this before touching anything that writes a save)

**The lesson (W14, 2026-10-23).** A fresh start shared slot 0 with every run, so Episode 2's quick start silently
overwrote a finished Episode 1 at the first door. W15 added a confirm. Episode 3 goes further: **no Episode 3 path
ever writes a save slot that holds another run.**

1. **Per-run autosave slot.** The game state gains `autosaveSlot` (default 0; serialized; old saves without it load
   as 0). `field.js` autosaves to `g.autosaveSlot` instead of the constant. Nothing else about saving changes.
2. **The main entry is Continue.** A run that finished Episode 2 continues into Episode 3 from its own save (any
   slot): after the Episode 2 credits it wakes at `nh_inn` and `ep3_morning` runs; a save made later anywhere in
   Hollowmere also starts it on the next map enter. That run keeps autosaving where it always has.
3. **The quick start, `newGameEp3(name)`** (for players without an Episode 2 save, and for QA): it picks the run's
   autosave slot itself: slot 0 if slot 0 is empty; otherwise the first empty manual slot (1 to 3), shown before
   starting ("This party will save to slot 2."); if every slot is full, it does not start and says "Every save slot
   holds a game. Free one on the Load page first." with one option, Back. It never offers Replace and never writes
   slot 0 when slot 0 is occupied. The W15 guard for New Game and the Episode 2 start stays as it is.
4. **`EP3_START`.** Lv 13 at 2900 EXP with the simulator's `sand_road` loadout; every Episode 1 and Episode 2 main
   flag plus `ep2_complete`; counters `credits_rolled` and `credits2_rolled`; key items `name_fragment_1`,
   `name_fragment_2`, `lantern_of_recall`, `mirror_sigil`; 1500 gold; potion 6, hi_potion 4, hi_ether 3,
   phoenix_feather 2, silver_salve 2; starts at `nh_inn` `inn_bed` (so `ep3_morning` runs). Exposed as
   `LQ_DEBUG.newGameEp3(name, { slot })`.
5. **The episode switch.** `src/game/episodes.js` (new, E3-saves) exports `EP3_LIVE = false` and a pure
   `episodeOffers(save, search)` that generalizes `ep2Offer`. While `EP3_LIVE` is false: `ep3_morning` never runs,
   the sand gate stays chained, and the title shows no Episode 3 row, **except** with `?ep=3` on the URL once
   `EP3_MAPS_LISTED` is true (a developer entry; before the maps exist `?ep=3` shows nothing). E3-integrate flips
   `EP3_LIVE` in the launch wave. When live, the title row "Episode 3: new party" shows once any slot has
   `ep2_complete`, with the help line "A ready party at Lv 13. Your own save stays under Continue."
6. **Additive schema.** New flags, `g.quenched`, `g.autosaveSlot`, counter `credits3_rolled`. No field is renamed or
   removed; an Episode 1 or Episode 2 save loads unchanged.
7. **Tests (node, pure, fake storage):** slot 0 occupied + empty slot 2 -> the quick start writes only slot 2 through
   a full simulated map change; all slots full -> no write at all; an old save without `autosaveSlot` autosaves to 0;
   `?ep=3` hidden while maps are unlisted; the Episode 2 credits fixture (`qa/out/autoplay/*ep2*credits*` if present,
   else a built one) loads and reaches `ep3_morning` with `EP3_LIVE` on, and does not with it off.

---

## 11. Build plan: waves and agent briefs

Every agent: read COMMON.md, DESIGN.md, `docs/story/EPISODE3.md`, this plan and its brief; stay in owned paths; keep
`node qa/run.mjs` green (Episodes 1 and 2 unchanged in meaning); no git; no em dashes; report under 400 words. Where an
agent needs something not yet delivered, it stubs the agreed id and says so.

**One agent at a time.** The waves group work that could run together; the orchestrator launches them one by one in
the order below and commits each after viewing its images. **Every step leaves the game publishable:** nothing a
player can reach changes until E3-integrate flips `EP3_LIVE`, and E3-saves' per-run autosave is a safe improvement on
its own.

| Order | Wave | Agent | Size | Brief | Leaves publishable because |
|---|---|---|---|---|---|
| 1 | 17a | E3-saves | S to M | `docs/briefs/E3-saves.md` | per-run autosave is invisible to existing runs; the switch is off |
| 2 | 17a | E3-story | M | `docs/briefs/E3-story.md` | scenes guarded by `EP3_LIVE` / `ep3_started`; no map references them |
| 3 | 17a | E3-battle | M | `docs/briefs/E3-battle.md` | Episode 3 zones unlisted; Heat only on new foes; Episodes 1 and 2 sim targets unchanged |
| 4 | 17b | E3-tiles | M | `docs/briefs/E3-tiles.md` | new sheets only; existing rects untouched |
| 5 | 17b | E3-sprites | M | `docs/briefs/E3-sprites.md` | new atlases only (Bram's recolor is the one visible change and is gated by Scott's call) |
| 6 | 17b | E3-audio | S to M | `docs/briefs/E3-audio.md` | new ids only, lazy music |
| 7 | 17c | E3-world | M | `docs/briefs/E3-world.md` | new event types unused by live maps |
| 8 | 17c | E3-maps | M to L | `docs/briefs/E3-maps.md` | the Hollowmere gate stays chained; `?ep=3` is the only way in |
| 9 | 17d | E3-scene-ui | M | `docs/briefs/E3-scene-ui.md` | battle and title changes are data-driven by Episode 3 content |
| 10 | 17d | E3-integrate | M | `docs/briefs/E3-integrate.md` | flips `EP3_LIVE` only after the full gate list; publishes |
| 11 | 17e | critic-5, play-critic-5 | S each | `docs/briefs/E3-review.md` | read-only |
| 12 | 17e | E3-fixes | M | written by the orchestrator from the two reviews | fix pass, then publish |

Agent count: 10 build agents, 2 read-only reviewers, 1 fix pass: 13 runs, never more than one at once.

---

## 12. Acceptance and QA

- `node qa/run.mjs` green; Episode 1 and Episode 2 suites unchanged in meaning.
- `node tools/sim/simulate.mjs --check`: "All targets met" for Episode 1, Whisperwood Hollow, Episode 2 and Episode 3.
- `node tools/maps/mapcheck.mjs check` clean; previews of the 10 new maps and the Hollowmere edit viewed, in MAPS.md.
- Autoplay finishes Episode 3 from an Episode 2 credits save and from `newGameEp3`: no softlock, the Warden beaten at
  Lv 16, zero game overs, desktop and phone; the quick start never wrote a slot it did not own (asserted).
- Story timer (`qa/integrate/story_time.py`): first play 60 to 90 minutes; first fight under 5 minutes after the
  morning scene; no main scene over its box budget.
- Shots with zero console errors (section 9 of the integrate brief); field logic under 3 ms, F3 draw under 1 ms with
  slag lights, 60 fps on the phone profile.
- Text: no em dashes (grep U+2014 over `next/`), every box within 3 x 42, ASCII only, no keyboard glyph on touch.
- Readability: every quench puzzle solvable by a first-time player without Talk; Talk always names the next step,
  including after `ep3_complete`.
- Saves: section 10's tests; an Episode 3 save made mid-foundry reloads with crust, latched basins and opened doors.

---

## 13. Risks, assumptions and decisions for Scott

**Assumptions.**
1. The thirteenth toll of Episode 2 was for Garrick (EPISODE3 section 8). It turns Bram's Episode 1 vow ("I am not
   losing his") into the episode's first scene.
2. The Warden is a Keeper construct, the fragment a Steel Leaf, the fire twenty-five years ago (EPISODE3 section 8).
3. Five composed tracks are within the pipeline's proven range (Episode 2 shipped five).
4. Episode 2's beam tracer generalizes to water with a medium option and a `flow` tile key; if it does not, E3-world
   writes a sibling `flow.js` with the same tests (cost rises from M to M-plus).

**Risks.**
- Pacing ran 1.5x the plan in Episode 2. Mitigations: 20 fights, box budgets per scene, the story timer as a gate in
  E3-integrate, and cut lines below.
- Quench could feel like the beams again. Mitigations: permanence (sequence puzzles), troughs on the floor, slag as
  light, dams; play-critic-5 checks it.
- Heat adds a counter to every foe's row on a phone. Mitigation: three tiny pips, drawn only for foes with Heat, never
  across a body.
- The Warden is the most complex fight yet (Heat, coils, Oath, Last Hammer). Auto must use Tempered Oath and quench;
  the reckless and naive policies must still behave.

**Cut lines, if the budget tightens** (each keeps a complete story):
- Cut 1: drop Vessa's Sand and the Bell House mirror.
- Cut 2: drop the F2 records cage (ledger) and the road's Dash chest.
- Cut 3: merge F2 into F1 (the Specter moves to F1's Wheelhouse; `bram_memory_2` moves to F1) for a two-floor foundry.

**Decisions for Scott (none block the build; defaults in brackets).**
1. Is the thirteenth toll for Garrick, with Bram unable to say his father's name from the first scene? [yes]
2. Bram's sprites: add grey to match his portrait and his age in this story? [yes, a recolor shown side by side first]
3. The Episode 3 quick start saves to a free slot and never to an occupied one; should New Game and the Episode 2
   start get the same rule? [Episode 3 only for now; the W15 confirm stays for the others]
4. The Episode 4 card wording. [placeholder "Episode 4: The Sunken Keep / Downriver, a kingdom forgets who rules it."]
