# Episode 2 production plan: The Town Without a Name

Owner: ep2-designer (W9), 2026-10-20. Status: **proposal for a later build wave**; nothing here is built yet.
Story bible: `docs/story/EPISODE2.md` (beat sheet, cast, lore, canon reconciliation). This file is the contract the
build agents work from: ids, maps, the new field mechanic, combat, loot, music, assets, and the agent briefs.
Every build agent reads `docs/briefs/COMMON.md`, `DESIGN.md`, `docs/story/EPISODE2.md` and this file, in that
order. House rules as always: no em dashes, no git, stay in your owned paths, bound every command, look at your
own output. Pacing rule (Scott, 2026-10-19/20): at most 3 agents at once, so the build runs in waves of 3.

---

## 0. Summary

**What gets built.** One overworld link (Garrick's Crossing on the valley's washed-out ford), one field map (the
Fading Road), one town with five interiors (the Nameless Hollow, which becomes Hollowmere), one three-floor dungeon
plus a boss room (the Court of Mirrors), one new field mechanic (**silverglass beams**: turnable mirrors, beam
receptors and light bridges), one mini-boss (the Other Selves, the party's own reflections), one three-phase boss
(the Nameless King, with two adds and the new Kept status), 9 ordinary enemies, 5 new music tracks, about 33 story
scenes and 4 side stories. Target 60 to 90 minutes, party Lv 9 to 13.

**What is reused (most of it).** The engine, field scene, cutscene API, event vocabulary (doors, ferries, fonts,
save bells, gates with AND logic, push blocks, switches, pits, hidden ink), W9's field abilities (Dash Strike,
field Appraise, Shove), the battle rules (CTB, Break, Fury, combos, telegraphs, phases, summons, the Splitting and
reflect code paths), the simulator, the map kit, `mapcheck` and the preview renderer, the NPC paper-doll builder,
the enemy recolor pipeline (`hollow_enemies.py`), the backdrop builder, the music tracker and SFX generator, every
existing jingle, `mystery`, `sorrow`, `triumph`, `battle`, `victory`, `gameover`. Painted source art already in the
repo that Episode 1 never used: `environments.webp` cell 1 (the Nameless Hollow mirror palace), `bosses.webp`
cell 1 (the Nameless King), `enemies.webp` cells 2, 5 and 7 in their original colors, `portraits.webp` cell 5
(`silver_rogue`, Vex Quill). The root game's `SUNO_TRACKS.json` already holds a "region-2" brief for the Hollow.

**What is genuinely new.** The beam system, mirror reflections drawn on glass and water, mirror warps, a fog loop
door kind, flag-gated overlays; a `court` tileset and a `hollow` town kit; about 13 NPC specs, 5 hand-pixeled
portraits, 15 enemy battle sprites (mostly recolors), the King's boss frames; 5 music tracks, 10 SFX, 2 ambiences;
`ep2.js` and the Episode 2 data.

**Waves.**
- **10a** (foundations, parallel): E2-story, E2-battle, E2-tiles.
- **10b** (systems and art): E2-world, E2-sprites, E2-audio.
- **10c** (assembly): E2-maps, E2-scene-ui.
- **10d** (integration and review): E2-integrate, then critic-4 and play-critic-3 (read-only).

**Done means.** A save that finished Episode 1 plays Episode 2 to its credits with no softlock; the autoplay bot
reaches and beats the Nameless King at Lv 13; `node qa/run.mjs` is green (Episode 1 tests untouched and green);
`node tools/sim/simulate.mjs --check` prints "All targets met" for both episodes; every new map preview was viewed;
the shots run on desktop and phone with zero console errors (section 11).

---

## 1. Scope at a glance

| Thing | Count | Reused | New work |
|---|---|---|---|
| Maps | 11 new + 2 edits | interiors copied from Willowmere's and re-dressed; map kit, preview, mapcheck | east_road, nameless_hollow, 5 interiors, court_f1/f2/f3, court_throne; valley and Willowmere chapel edits |
| Field mechanics | 1 new (beams) + 4 small | every Episode 1 mechanism, W9 abilities, Lantern | beam/mirror/receptor/bridge events, reflections, mirror doors, fog doors, gated overlays |
| Story scenes | about 33 + side scenes | cutscene API, scene guard wrapper, dialogue shapes, Talk, journal, barks | `ep2.js`, `STAGING_EP2.md` |
| NPCs | 13 new + Willowmere returns | paper-doll NPC builder, npcs.js shape | specs, talk tables |
| Enemies | 9 ordinary + 1 split child + 3 reflections + boss + 2 adds | rules, ai `basic`/`phased`, Splitting, reflect, Taunt, Guard | traits (reflect while protected, innate split, mimic, cover), ai `reflections`, ai `nameless_king`, status Kept |
| Party skills | 3 | skills.js shape | Recall, Shatter, True Strike |
| Items | 2 consumables, 7 key items, 20 bases, 7 uniques, 1 set | items.js, loot.js, rarity, affixes | tier 3 armor, tier 4 gear, affix tier 4 |
| Shops | 3 new + 1 restock | shops.js shape, shop scene | stock lists |
| Music | 5 new tracks, 6 reused | tracker pipeline, the name motif, loop tooling | hollow, hollowmere, fading_road, court, boss_king |
| SFX / ambience | 10 / 2 new | 81 SFX, jingles, generator | mirror_turn, beam_hit, glass_bridge, glass_break, mirror_step, ferry_oars, clock_chime, reflection_out, kept, kept_break; mere_still, court_hush |
| Tiles | 2 new sheets | autotile, wall systems, archive floor kit approach | `court.png`, `hollow.png` |
| Sprites | about 40 new frames sets | recolor + derive pipelines | NPC specs, enemy recolors, reflections, King, avatar |
| Portraits | 5 hand-pixeled + 2 from paint | portrait framing pipeline, `silver_rogue` | elian, anwen, tovin, lena, aurel (hand); nameless_king (crop), vex alias |
| Backdrops | 5 | backdrop builder, valley composer | battle_east_road, battle_court, battle_court_deep, battle_throne, dialog_keyart_ep2 |

---

## 2. Id registry (the contract)

Rename nothing here without telling every owner. Prefixes: town `nh_`, dungeon `court_`/`c1_`/`c2_`/`c3_`, road
`road_`. **Never** a bare `hollow_` prefix (Episode 1's Whisperwood Hollow owns `hollow_found`, `hollow_cleared`,
`hollow_wolves`, `hollow_blot`, `hollow_entry`, `hollow_alpha`, `hollow_after`).

### 2.1 Maps

| id | Banner (title / sub) | area | size | tileset | music | ambience | lighting |
|---|---|---|---|---|---|---|---|
| `east_road` | The Fading Road / East of the Fork | field | 64 x 36 | town (+ hollow kit) | `fading_road` | `wind_valley` | tint none; mist band |
| `nameless_hollow` | Nameless Hollow / The Unwritten Square; after `nh_restored`: Hollowmere / The Remembered Square | town | 44 x 34 | town (+ hollow kit) | `hollow`, then `hollowmere` | `mere_still` | tint `hollow_dusk`, then none |
| `nh_hall` | Mayor's Hall | interior | as `library` | interior | `hollow` / `hollowmere` | none | none |
| `nh_chapel` | Chapel of the Candles | interior | as `chapel` | interior | `hollow` / `hollowmere` | none | none |
| `nh_inn` | The Signless Inn | interior | as `inn` | interior | `hollow` / `hollowmere` | none | none |
| `nh_shop` | Hollow Provisioner | interior | as `item_shop` | interior | `hollow` / `hollowmere` | none | none |
| `nh_smithy` | Silverglass Smithy | interior | as `smithy` | interior | `hollow` / `hollowmere` | none | none |
| `court_f1` | Court of Mirrors / I. The Silverglass Antechamber | dungeon | 40 x 30 | court | `court` | `court_hush` | dark 0 (moonlit) |
| `court_f2` | Court of Mirrors / II. The Hall of Other Selves | dungeon | 40 x 30 | court | `court` | `court_hush` | dark 0.25 |
| `court_f3` | Court of Mirrors / III. The Unnamed Throne | dungeon | 44 x 32 | court | `mystery` | `court_hush` | dark 0.6 |
| `court_throne` | The King's Mirror | dungeon | 24 x 20 | court | none until the scene | `court_hush` | dark 0.3 |

### 2.2 Story flags (all declared in `quests.js FLAGS` with a one-line meaning)

Main (the Episode 2 equivalent of the COMMON.md list): `ep2_started`, `crossing_done`, `east_road_arrived`,
`east_first_fight_done`, `nh_arrived`, `met_elian`, `heard_crisis`, `met_anwen`, `court_ferry_open`,
`court_entered`, `court_f1_done`, `vex_met`, `other_selves_defeated` (encounter flag), `court_f2_done`,
`vow_door_open`, `nameless_king_defeated` (encounter flag), `aurel_named`, `nh_restored`, `ep2_complete`.

Beats and world state: `ep2_morning_done`, `saw_cairns`, `fog_looped`, `waystation_rested`, `saw_court`,
`court_f1_arrived`, `court_f2_arrived`, `court_f3_arrived`, `silverglass_lock_lit` (latched receptor),
`mira_memory_1`, `mira_memory_2`, `mira_memory_3`, `vow_belonging`, `vow_mercy`, `vow_courage` (latched receptors),
`portrait_child_seen`, `portrait_keeper_seen`, `portrait_king_seen`, `remembrance_open`, `mirror_sigil_get`,
`black_feather_found`.

Side: Fountain `fountain_started`, `testimony_lena`, `testimony_tovin` (set by `tovin_ferry`), `testimony_anwen`,
`fountain_done` (also the King-fight Fury bonus); Last Route `last_route_started`, `satchel_found`,
`last_route_done`; Letter `letter_answer_started`, `letter_answer_done`; Nico `nico_crowns_started`,
`paper_crown_found` (chest flag), `nico_crowns_done`. Counter (not a flag): `credits2_rolled`.

Map-local chest flags (owned by the maps): `glass_key_f1`, `glass_key_f2` and the map's `opened` set as Episode 1.

### 2.3 Key items (`items.js KEY_ITEMS`)

| id | name | icon | desc |
|---|---|---|---|
| `mael_letter` | Letter to the Hollow | letter | A letter of introduction. The town's name is a blank line. |
| `glass_key` | Glass Key (counted, consumed) | key | A key of cold glass. Opens one door in the Court. |
| `name_fragment_2` | Second Name Fragment | book | The second fragment of the Book of Names. |
| `mirror_sigil` | Mirror Sigil | sigil (new icon) | Aurel's sigil. Keeper mirrors open for whoever carries it. |
| `courier_satchel` | Courier's Satchel | letter | Willowmere post marks. A route book inside. |
| `elian_reply` | Elian's Reply | letter | Signed: Elian, Mayor of Hollowmere. For Mael. |
| `black_feather` | Black Feather | feather (new icon) | Left where a list used to be. |

### 2.4 Enemies, encounters, zones (section 6)

Enemies: `mist_wolf`, `glassback`, `quicksilver`, `quicksilver_bead`, `glint_wisp`, `glass_sentinel`,
`borrowed_shadow`, `faceless_knight`, `shard_swarm`, `refl_hero`, `refl_mira`, `refl_bram`, `nameless_king`,
`false_sorrow`, `false_pride`. Encounters: `road_wolves`, `road_beetles`, `road_quick`, `road_mixed`, `road_pack`,
`c1_quick`, `c1_wisps`, `c1_sentinel`, `c1_mixed`, `c2_shadows`, `c2_knight`, `c2_sentinel`, `c2_mixed`,
`other_selves`, `c3_shards`, `c3_knights`, `c3_shadow`, `c3_mixed`, `nameless_king`. Zones: `east_road`, `court_f1`,
`court_f2`, `court_f3`, `court_throne` in a new `EP2_ZONE_ORDER`.

### 2.5 Scenes (`ep2.js`; map and trigger)

| Scene | Map | Trigger |
|---|---|---|
| `ep2_morning` | hero_home | on enter (`if: ep1_complete`, `ifNot: ep2_morning_done`) |
| `ep2_mael` | willowmere | Mael's talk entry while `ep1_complete` and not `ep2_started` |
| `iris_farewell`, `tess_last_route` | library, willowmere | NPC talk entries |
| `garrick_crossing` | valley | step trigger `crossing_trig` on the east road |
| `east_road_arrival` | east_road | on enter |
| `east_first_fight` | east_road | step trigger column `first_fight_trig` |
| `old_milestone` | east_road | object |
| `fading_stretch`, `fog_loop` | east_road | step trigger at `fog_start`; step trigger at `fog_return` |
| `waystation_rest` | east_road | campfire object (`safe`, `rest`) |
| `mere_view` | east_road | step trigger on the rise |
| `nh_arrival`, `hollowmere_restored` | nameless_hollow | on enter (each guards itself) |
| `fountain_faces` | nameless_hollow | step ring around the fountain |
| `fountain_check` | nameless_hollow | fountain object (Fountain quest) |
| `elian_hall` | nh_hall | step trigger inside the door |
| `anwen_register` | nh_chapel | step trigger |
| `tovin_ferry` | nameless_hollow | Tovin's talk entry |
| `satchel_found` | nh_inn | lost-property object |
| `court_crossing` | court_f1 | on enter (first time) |
| `court_f1_arrival` | court_f1 | step trigger at the great door |
| `mira_memory_1` | court_f1 | step trigger at the stairs hall window |
| `silverglass_lock` | court_f1 | receptor `rec_lock` script (first light) |
| `court_f2_arrival`, `portrait_child`, `portrait_keeper`, `portrait_king` | court_f2 | on enter; objects |
| `mira_memory_2`, `vex_mirror`, `other_selves` | court_f2 | step triggers |
| `court_f3_arrival` | court_f3 | on enter |
| `vow_belonging`, `vow_mercy`, `vow_courage` | court_f3 | vow receptor scripts (first light) |
| `vow_door`, `black_feather` | court_f3 | step trigger at the opened vow door; object |
| `nameless_king`, `king_after` | court_throne | step trigger row; after the battle |
| `ep2_ending` | nameless_hollow | chained from `hollowmere_restored` |
| `nico_crowns`, `letter_answer` | nameless_hollow, willowmere | NPC talk entries |

### 2.6 NPC ids (`npcs.js`)

New: `elian`, `anwen`, `tovin`, `lena`, `vessa`, `nico`, `sava`, `corin`, `orla`, `wren`, `fitch`, `penny_e`
(Penny at the Waystation; same sprite and name as `penny`), `aurel` (after `aurel_named`). An NPC record lives on
one map: `elian` in `nh_hall`, `tovin` on the Hollow pier, `aurel` by the fountain after `nh_restored`; elsewhere
they are scene spawns or map actors (`tovin_c`, `elian_t`, `aurel_t`). Vex Quill is a scene spawn (`vex`, sprite
`npc_vex`, portrait `silver_rogue`). Willowmere NPCs keep their ids and get Episode 2 entries.

### 2.7 Audio ids

Music: `hollow`, `hollowmere`, `fading_road`, `court`, `boss_king` (new); `willowmere`, `valley`, `mystery`,
`sorrow`, `triumph`, `battle`, `victory`, `gameover` (reused). SFX: `mirror_turn`, `beam_hit`, `glass_bridge`,
`glass_break`, `mirror_step`, `ferry_oars`, `clock_chime`, `reflection_out`, `kept`, `kept_break`. Ambience:
`mere_still`, `court_hush`.

---

## 3. The world link: the valley's east road and Garrick's Crossing

Episode 1's valley already promises this road: the fork's east branch ends at "the washed-out ford of a tributary"
(STAGING.md 3). Edits to `src/data/maps/valley.js` (E2-maps), keeping every Episode 1 mark, event and walk result:

1. **The washout (visible in Episode 1 too).** A small solid object `ford_wrack` (new prop `floodwrack`: driftwood
   and a sheared post) on the tributary's north bank where a path would leave the fork road, `ifNot: 'ep2_started'`,
   with inspect text `ford_wrack` ("Floodwrack and a sheared post. The east road is washed out."). It must be the
   only way east (pines and water elsewhere).
2. **The bank road.** Dirt cells along the tributary's north bank (rows 16 to 17 from the ford at about (46,19) to
   the east edge; keep pines off them) and a new exit on the east edge (x 59, rows 16 to 17) to `east_road`
   (1, 16, 'right').
3. **Garrick's Crossing.** Wood bridge overlays over the ford cells, flag-gated `if: 'ep2_started'` (needs the
   gated overlays of 5.5), the rail sign `garrick_rail` (`if: 'crossing_done'`, text "GARRICK'S CROSSING. SAY IT
   WHEN YOU CROSS."), and the step trigger `crossing_trig` (`garrick_crossing`) two tiles west of the ford. Garrick
   and Hal are spawned by the scene at marks `crossing_garrick` and `crossing_hal`.
4. Marks: `ford`, `crossing_garrick`, `crossing_hal`, `east_exit`.
5. Walk tests: with Episode 1 flags the east exit is unreachable; with `ep2_started` it is reachable.

Also in Episode 1 maps: the Willowmere **chapel** gets a tall Keeper mirror behind the altar (`mirror_tall`
decor always; a mirror door to `nh_chapel` only `if: 'mirror_sigil_get'`). The smithy's sign text switches to GONE
TO THE FORD. G. while `ep2_started` and not `crossing_done` (story agent: a conditional `lines` entry; Garrick's NPC
`show` hides him in that window).

---

## 4. Maps

General rules for every new map: DESIGN 5.1 format plus MAPS.md conventions (3/4 walls with face rows, notch
doors, overlays, marks); every scene mark exists and is reachable; enemy counts match `ZONES[zone].plan`; every
puzzle reads on screen without text; lit paths lead forward, dead ends hold chests; render previews with
`tools/maps/preview.py` and view them. Coordinates below are approximate unless marked exact; the map author
places exact cells and records them in MAPS.md.

### 4.1 `east_road`: The Fading Road (64 x 36, field)

The tributary runs along the south edge (rows about 20 to 24, ragged banks) from the mere in the east down to the
valley in the west, so the road follows it upstream: geography that explains itself.

- **The Bank Road (x 0 to 19).** Enter at (0, 16 to 17). Meadow north, river south, silver birches
  (`tree_birch_silver`) and a few pines. A blank signpost `east_signpost` at about (3,15). The first-fight step
  trigger `first_fight_trig` covers the whole passable height of column x 6 (as Episode 1's column 7) and the
  `road_mixed` group (`e_road_mixed`, Mist Wolf leader, `chase`) waits at the bend about (12,16), two tiles outside
  its chase radius. The old milestone object `old_milestone` at about (16,14). North, behind a cracked boulder wall
  (W9 Dash Strike), a small clearing with a wood chest (`hi_ether` x1) and one wandering group.
- **The Fading Stretch (x 20 to 39).** The dirt road ends at x 20. A mist band (`ambientFx` `mist` over the area)
  bounded by a rock line north and the river south. The true path zigzags (example: right 4, up 3, right 4, down 5,
  right 4, up 3, right 3). A `cairn` prop (solid, 1 x 1) stands beside the true path every 3 to 4 tiles, each
  visible from the last. Loop doors (5.4) sit two tiles off the path on both sides, so the path is a three-wide
  forgiving corridor and only a real wander loops; they land on `fog_return` (19,18), not on the normal path, and
  a step trigger there runs the `fog_loop` bark once. `fading_stretch` trigger at `fog_start` (19,16). One guard
  group stands on the path halfway (fight it or Dash past it from behind for a free turn).
- **The Waystation (x 40 to 51).** A ruined toll house (prefab `toll_ruin`), the campfire object `waystation_fire`
  (sprite `brazier_lit`, `script: 'waystation_rest'`, `safe`, `rest`), a log bench, the blank toll board sign
  `toll_board`, Penny (`penny_e`) with her cart (`market_stall_cloth`, shop `east_peddler`). Two groups nearby.
- **The Mere Shore (x 52 to 63).** Reeds (`reeds_*` overlays) and the still `mere_water` along the north-east.
  `mere_view` trigger on a rise at about (54,14); the `court_far` silhouette decal over the water at about
  (56 to 63, 1 to 7), drawn in the overhead layer so it reads as distant. A stone ledge above the shallows holds a
  **heavy block** (W9 Shove): shoved east it drops into the shallows and becomes a stepping stone to a reed island
  with an iron chest (`chest_reeds`, rolled, ilvl 9). The deepest group (`road_pack`) guards the shore path. Exit
  east (63, 16 to 17) to `nameless_hollow` (1, 22, 'right').
- Enemies (7, `ZONES.east_road.plan`): road_wolves 2, road_beetles 2, road_quick 1, road_mixed 1, road_pack 1.
- Chests: wood (Dash clearing, `hi_ether` x1), wood (inside the toll house, rolled), iron (reed island, rolled).
- Marks: `entry` (1,16), `fog_start` (19,16), `fog_return` (19,18), `fog_end` (40,16), `waystation_fire`,
  `penny_cart`, `mere_view`, `court_far`, `town_gate` (62,16).

### 4.2 `nameless_hollow`: the Nameless Hollow / Hollowmere (44 x 34, town)

A Dragon Quest town that reads on a phone at a glance, built around one image: a fountain where only strangers
have faces.

- **West gate** (x 0, rows 22 to 23): a low stone arch with the blank `gate_sign` (Nico's chalk crown is an overlay
  until `nh_restored`), Corin at the post.
- **The Unwritten Square** (center, a round plaza about 12 x 10 around (22,18)): the Fountain of Faces (`fountain`
  prop, reflective water) with `fountain_obj` (object, `script: 'fountain_check'`) and the step ring
  `fountain_trig` (`fountain_faces`); the blank proclamation board `proclamation` (canon: "Where our name once
  stood, a child drew a looking glass. Beneath it: WE ARE MORE THAN OUR REFLECTIONS."); the empty plinth `plinth`
  (canon: "The plinth is empty. Three signatures remain: the Watchmaker, the Ferryman, and the Sister." This is the
  Fountain quest's hint); benches; lamp posts (lit under `hollow_dusk`).
- **North:** the Mayor's Hall (prefab `hall_hollow`) with a blank sign, door to `nh_hall`.
- **North-east:** Lena's clocktower (prefab `clocktower`; overlay `clock_hands` `if: 'nh_restored'`), Lena at its
  door.
- **West:** the Signless Inn (`inn_hollow`), Sava at a loom bench on its porch.
- **East:** the Hollow Provisioner (`shop_hollow`).
- **South-west:** the Silverglass Smithy (`smithy_hollow`, a glass furnace glow).
- **South-east:** the chapel (`chapel_hollow`, an empty bell frame in its tower).
- **North shore:** the mere along the north edge (rows 0 to 3) and down the east edge; Tovin's pier (wood bridge
  tiles) at about x 12 to 14, rows 1 to 4, with the `ferry` event `ferry_court` (`rideIf: 'court_ferry_open'`,
  `to: ['court_f1', landing]`); Tovin at `tovin_spot` (12,5); Orla at a `rune_shrine` beside the pier. The
  `court_far` silhouette over the mere in the north-east (overhead).
- Three private homes (not enterable), gardens with silver-blue flowers, a few pots and barrels with small items.
- After `mirror_sigil_get`: `mirror_warp_sq` (`mirror_tall` beside the fountain, door kind `mirror`) to the Court
  landing. After `aurel_named`: the throne room's mirror lands the party at `fountain_out`, beside the fountain.
- Signs: every shop and the gate have a blank tile; the lettered tile is a flag-gated overlay
  (`if: 'nh_restored'`). Text variants via the usual conditional `lines`.
- Reflections: the mere and the fountain are reflective (5.2); every Hollow NPC has `noReflection` until
  `nh_restored`.
- Marks: `gate_in` (1,22), `gate_sign`, `fountain`, `fountain_view` (stand point south of the fountain),
  `fountain_out`, `meet_elian`, `elian_from`, `hall_door`, `chapel_door`, `inn_door`, `ferry_landing`,
  `tovin_spot`, `pier_end`, `plinth`, `clocktower`, `nico_spot`, `crowd_a`, `crowd_b`, `crowd_c`, `crowd_d`,
  `gather_anwen`, `gather_lena`, `gather_corin`, `gather_nico`, `restored_spot`, `night_view`, `mirror_warp_sq`.

### 4.3 Interiors (copy the Willowmere counterpart's layout and exits, then re-dress)

| id | from | contents |
|---|---|---|
| `nh_hall` | `library` | Elian's desk and the ledger (book `nh_ledger`), benches, a cracked wall mirror (inspect), the town notice with a blank title; step trigger `hall_trig` (`elian_hall`) two tiles inside; `elian` after `met_elian`. Marks `elian_desk`, `hall_entry`. |
| `nh_chapel` | `chapel` | pews, the register lectern (object `register`: the white line; reads AUREL after `nh_restored`), 41 candles (candelabras; inspect "Forty-one candles."), a bell rope hanging from an empty frame, the save bell (`save` event, "a small silver hand-bell"), Anwen; after `mirror_sigil_get` a `mirror_tall` door to the Willowmere chapel. Marks `anwen_spot`, `register`. |
| `nh_inn` | `inn` | Wren behind the counter (inn service, price 40), the lost-property shelf (object `lost_property`, `script: 'satchel_found'`), the guest beds with mark `inn_bed` (the post-credits wake point). |
| `nh_shop` | `item_shop` | Fitch, shop `hollow_items`. |
| `nh_smithy` | `smithy` | Vessa at a glass furnace, shop `hollow_smithy`. |

### 4.4 `court_f1`: The Silverglass Antechamber (40 x 30, dungeon, moonlit)

The teaching floor for the beam (5.1). Six areas; approximate floor rectangles:

| Area | Approx. floor | What it does |
|---|---|---|
| A. The Landing | x 15 to 24, y 24 to 28 | Pier on the mere (row 29), `ferry_home` (ferry back to the Hollow pier, always rideable), Tovin by the boat (map `actor` `tovin_c`, sprite `npc_tovin`, text `tovin_landing`), the silver font `font_f1` (rest and save, `safe`), the open great door north. `start` (19,27,'up'). Later the mirror shortcuts land here. |
| B. The Antechamber | x 12 to 27, y 14 to 21 | `court_f1_arrival` trigger at the door. Tall wall mirrors (reflective). **Puzzle B (teach):** a skylight beam source in the north face shines south down one column; mirror `mir_b` on that column starts turned so the beam runs **west and splashes on B's west wall, beside the passage to the west wing's locked glass door** (the player sees the beam point the way they will go later); turned once, the beam runs east into receptor `rec_b` set in B's east wall, and a silver floor inlay leads from `rec_b` to gate `gate_b`, the north-east doorway, which opens. No enemies here. |
| D. The East Wing | x 29 to 38, y 3 to 18 | Through `gate_b`. D1 "the Fitting Rooms": two groups among fixed decorative mirrors, the wood chest `chest_key1` (`glass_key`, flag `glass_key_f1`) at the far end, an iron chest (rolled). A **cracked glass pane** in D1's south wall (W9 Dash Strike) opens the secret alcove D2 (about x 31 to 36, y 20 to 22) with the gold chest `chest_helm` (`merewarden_helm`). |
| C. The Lens Hall | x 2 to 10, y 3 to 21 | Behind the locked glass door (`door_c`, `glass_key`). The great moon window in C's north face is the beam source `beam_c`, shining south. **Lens 1** `lens_1`, on the source's column at the height of the north corridor, turns the beam east through a **glass slot** (a wall cell the beam passes and walkers cannot) into the north corridor. A doorway beside the slot lets the party follow. Two groups; a wood chest (`hi_potion` x2). |
| N. The North Corridor | x 11 to 26, y 10 to 12 | The beam enters from C's slot. **Push block** `block_n` sits on the beam line: one push north moves it into a one-cell niche, out of the line (the niche is a dead end, so it can never be pushed back in; it resets on re-entry). **Lens 2** `lens_2` turns the beam north through a glass slot in E's south wall. One group. |
| E. The Stairs Hall | x 13 to 26, y 2 to 8 | **Lens 3** `lens_3` turns the beam east into receptor `rec_lock` (`latch`, `flag: 'silverglass_lock_lit'`, `script: 'silverglass_lock'`) set in E's east wall; a silver inlay runs from it up to the stairs gate `gate_lock` in E's north face. Mira's window (tall window-mirror on E's west face) with the step trigger `mira_window_trig` (`mira_memory_1`) at E's entrance from N. A floor switch in E opens `gate_short` from N's east end into B's north face, after the stairs are reached (the shortcut home). Stairs down to `court_f2`; the stairs trigger sets `court_f1_done`. One group. |

Beam route for the Silverglass Lock (canon "a silver beam crosses three chambers"): `beam_c` (C, south) -> `lens_1`
(east) -> glass slot -> N corridor (past the pushed block) -> `lens_2` (north) -> glass slot -> E -> `lens_3`
(east, into `rec_lock`). Each lens has exactly one correct state; every wrong state splashes the beam on
a wall where the player can see it. The start state lights nothing critical.

- Enemies (8): c1_quick 2, c1_wisps 2, c1_sentinel 2, c1_mixed 2 (D1 2, D corridor 1, C 2, N 1, E 1, B approach 1).
- Chests: wood (`glass_key`), iron (rolled), gold (Merewarden Helm, Dash secret), wood (`hi_potion` x2), iron
  (E, rolled).
- Marks: `landing`, `pier`, `start`, `great_door`, `b_center`, `mira_window`, `lock_gate`, `stairs_down`,
  `shortcut_gate`.

### 4.5 `court_f2`: The Hall of Other Selves (40 x 30, dungeon, dark 0.25)

The beam lays bridges. A ring of galleries around a central void, the Well of Reflections.

| Area | Approx. floor | What it does |
|---|---|---|
| P. The Portrait Hall | x 2 to 13, y 2 to 8 | Stairs from F1 land here; `court_f2_arrival` on enter; blank-faced portraits along the north face (decor); `portrait_child` in a west alcove. |
| The Well | x 14 to 25, y 10 to 19 | Void (`pit`); `pitTo` lands back in the Portrait Hall (a walk, never a dead end, and never a way around the bridges). |
| North Gallery | x 14 to 30, y 2 to 8 | **Puzzle 1 (teach bridges):** a source in the north face shines south; mirror `m_n1` turned once sends the beam east along a dim glass rail over a 3-cell moat into the East Gallery; the rail lights and becomes a bridge. One group. |
| East Gallery | x 31 to 38, y 2 to 22 | A side room with two groups and the wood chest (`glass_key`, flag `glass_key_f2`). **Puzzle 2 (one beam, two bridges):** a fixed mirror where the first bridge lands turns the beam south down the gallery to mirror `m_e1`, which sends it either east ('\') along bridge A to the Keeper portrait alcove (optional, `portrait_keeper`) or west ('/') along bridge B across the middle of the Well to the Island. Lighting one bridge darkens the other, so the optional alcove is a deliberate detour. One group. |
| The Island | x 18 to 21, y 13 to 16 | The reflection pool (step trigger `pool_trig`, `mira_memory_2`). Mirror `m_i1` at bridge B's end: turned ('/'), it sends the beam south along bridge C to the South Gallery. Bridge B is upstream of `m_i1`, so it stays lit and the island is never a trap. Iron chest at the island's south tip (`hi_ether` x2). |
| South Gallery | x 2 to 37, y 21 to 27 | Two groups; `portrait_king` in an alcove; the gold chest `chest_remembrance` (present only `if: 'remembrance_open'`: 140 gold, 2 Ethers, book `court_ledger`); the locked glass door `door_w` (`glass_key`) at its west end. |
| West Wing | x 2 to 12, y 10 to 19 | The font room (`font_f2`, rest and save, `safe`), then the corridor with the great mirror (step trigger `vex_trig`, `vex_mirror`), then the round Arena (about 10 x 8) with the step trigger `selves_trig` (`other_selves`). Two groups on the way. After `other_selves_defeated` the arena's great mirror is a stairs door down to `court_f3` (its trigger sets `court_f2_done`), and beside it `mirror_f2_short` (`if: 'court_f2_done'`) leads to the F1 landing. |

- Enemies (8): c2_shadows 2, c2_knight 2, c2_sentinel 2, c2_mixed 2 + the Other Selves (arena).
- Chests: wood (`glass_key`), iron (rolled), iron (`hi_ether` x2, island), gold (Remembrance Cache, optional),
  wood (P alcove, `silver_salve` x2).
- Marks: `arrival`, `portrait_child`, `portrait_keeper`, `portrait_king`, `pool`, `vex_mirror`, `arena`,
  `selves_spot`, `stairs_down`, `well_return` (the Portrait Hall tile the Well's `pitTo` uses).

### 4.6 `court_f3`: The Unnamed Throne (44 x 32, dungeon, dark 0.6)

Three wings, three vows, one door. The beam is also a light source here (5.1).

| Area | Approx. floor | What it does |
|---|---|---|
| The Hall of Vows (hub) | x 16 to 27, y 14 to 22 | Arrival from F2 (`court_f3_arrival` on enter). Black mirror floor (reflective; the crowned reflection on the empty throne is a reflection-only decal). The vow door `door_vow` (a 3-source gate, three crystals in its face) in the north face at about (21 to 22, 13). Corridors west, east and south. After `court_f3_arrived` a mirror shortcut `mirror_f3_short` in the south-east corner to the F1 landing. |
| Throne Antechamber | x 17 to 26, y 5 to 11 | Behind the vow door: the silver font `font_f3` (rest and save, `safe`), the black feather on a glass bench (object `feather_obj`, `script: 'black_feather'`), the throne door `door_throne` (glass `door_boss` style) to `court_throne`. Wood chest (`silver_salve` x2). |
| West wing: Belonging | x 2 to 14, y 4 to 26 | The darkest wing: the beam is the only light. Three mirrors around a ring of pillars route the beam to the vow mirror and receptor `rec_belonging` (`latch`, `flag: 'vow_belonging'`, `script: 'vow_belonging'`, `target: 'door_vow'`). A side alcove, seen only by the beam's glow, holds the gold chest `chest_crown` (`paper_crown`, flag `paper_crown_found`). Two groups (shard swarms). |
| East wing: Mercy | x 29 to 41, y 4 to 26 | Light bridges over a chasm (pits drop to a lower ledge in the same wing; a one-way ledge path climbs back), two mirrors, a Faceless Knight patrol that walks across the beam (enemies never block beams). Receptor `rec_mercy` (`vow_mercy`). Two groups. |
| South wing: Courage | x 10 to 33, y 24 to 30 | **Shove puzzle (critical):** the heavy mirror `mirh_c` sits two tiles off the beam line; a floor socket inlay marks where it belongs; Bram's Shove moves it twice onto the line, then it is turned (heavy mirrors still rotate) and sends the beam along a long bridge over a chasm to receptor `rec_courage` (`vow_courage`). **Lantern secret:** a hidden ink bridge (`ink_bridge_*_faint`, reused) from the wing's east end to a sealed cache: gold chest `chest_hollowcrown` (`hollowcrown`) and a Keeper's note (`court_note`, `lantern: true`). Two groups. |

- Enemies (8): c3_shards 2, c3_knights 2, c3_shadow 2, c3_mixed 2.
- Chests: gold (Paper Crown), gold (Hollowcrown, Lantern secret), iron x2 (rolled), wood (`silver_salve` x2).
- Marks: `arrival`, `hub_center`, `vow_door`, `vow_belonging`, `vow_mercy`, `vow_courage` (camera targets at
  each vow mirror), `feather`, `font`, `throne_door`.

### 4.7 `court_throne`: The King's Mirror (24 x 20, dungeon)

A long hall with a black mirror floor. The King's map actor `nameless_king` (sprite `nameless_king_avatar`, facing
up, back to the party) on a dais at about (12,6); the great mirror `mirror_great` (a 6 x 5 object in the north face,
frames: whole showing the town, shattered, empty frame) behind him. Step trigger row `king_trig` about row 15. After
`aurel_named`: `mirror_exit` (door kind `mirror` on the great mirror) to `nameless_hollow` `fountain_out`; map
actors `aurel_t` and `elian_t` stand by the dais (`if: 'aurel_named'`, `ifNot: 'nh_restored'`). Marks: `king`, `kneel`, `fragment_spot`, `party_stop`,
`elian_enter` (south door), `elian_meet`, `great_mirror`.

### 4.8 Marks and named events checklist (for `qa/maps`, mirrored in `STAGING_EP2.md`)

| Map | Marks / named events |
|---|---|
| `valley` (edit) | `ford`, `crossing_garrick`, `crossing_hal`, `east_exit`; objects `ford_wrack`, sign `garrick_rail`; trigger `crossing_trig` |
| `willowmere` (unchanged) | `well`, `meet_mael` (existing) |
| `chapel` (edit) | door `mirror_wm` (mirror kind) |
| `east_road` | `entry`, `fog_start`, `fog_return`, `fog_end`, `waystation_fire`, `penny_cart`, `mere_view`, `court_far`, `town_gate`; enemy `e_road_mixed`; objects `old_milestone`, `waystation_fire`; NPC `penny_e` |
| `nameless_hollow` | as listed in 4.2; NPCs `corin nico sava lena tovin orla elian aurel`; object `fountain_obj`; ferry `ferry_court` |
| `nh_hall`, `nh_chapel`, `nh_inn`, `nh_shop`, `nh_smithy` | as listed in 4.3; NPCs `elian anwen wren fitch vessa`; objects `register`, `lost_property` |
| `court_f1` | `landing`, `start`, `great_door`, `mira_window`, `lock_gate`, `stairs_down`, `shortcut_gate`; receptor `rec_lock` |
| `court_f2` | `arrival`, `portrait_child`, `portrait_keeper`, `portrait_king`, `pool`, `vex_mirror`, `arena`, `selves_spot`, `stairs_down` |
| `court_f3` | `arrival`, `hub_center`, `vow_door`, `vow_belonging`, `vow_mercy`, `vow_courage`, `feather`, `font`, `throne_door`; receptors `rec_belonging`, `rec_mercy`, `rec_courage` |
| `court_throne` | actor `nameless_king`, `kneel`, `fragment_spot`, `party_stop`, `elian_enter`, `elian_meet`, `great_mirror`, door `mirror_exit` |

---

## 5. Field systems (E2-world)

### 5.1 Silverglass beams: the Episode 2 field mechanic

The Lufia II rule: machinery you can see and read. A beam of pale light travels in a straight line from a source,
bends 90 degrees off a mirror, lights a crystal receptor, and (on F2 and F3) solidifies glass bridges it runs along.
The player turns mirrors (confirm), pushes blocks and mirrors, and watches the result immediately.

**Event types** (new, in the existing `{ id, type, x, y, if?, ifNot? }` shape):

| type | fields | behavior |
|---|---|---|
| `beam` | `dir` ('up', 'down', 'left', 'right'), `sprite?` (`beam_window` in a wall face, `beam_lens` on a pedestal) | Emits from its cell in `dir`. Always on while present. |
| `mirror` | `state` (0 = '/', 1 = '\'), `fixed?`, `heavy?`, `push?`, `sprite?` (`mirror_stand`, `mirror_heavy`) | Solid. Confirm while facing toggles the state (`mirror_turn`) unless `fixed`. `push: true` slides like a push block when walked into; `heavy: true` moves only by Bram's Shove (W9), one tile per shove. Moving keeps the state. |
| `receptor` | `target` (one id or a list), `latch?`, `flag?`, `script?`, `face?` | Lit while a beam enters its cell (from the `face` side only, if given). Counts as a gate source while lit (`sourcesOn` gains `receptor` = lit). `latch` keeps it lit once lit; `flag` persists the latch per save; `script` runs a scene the first time it lights. `beam_hit` on lighting. |

**Tiles** (tiles.json): `glass_bridge_h_dim`, `glass_bridge_v_dim` (collision `pit`), `glass_bridge_h_lit`,
`glass_bridge_v_lit` (collision `none`); a lit bridge tile swaps in while the beam passes over the cell
(`glass_bridge`). **Grace rule:** a bridge cell with an actor on it stays walkable until vacated. Blocks and
pushable mirrors never enter bridge cells. `glass_slot`: a wall tile, solid to walkers, that beams pass through
(tiles.json gets an optional `beam: 'pass'` key). Silver inlay decals `inlay_h`, `inlay_v`, `inlay_corner_*`,
`inlay_socket` connect receptors to the gates they open and mark heavy-mirror sockets.

**Tracing rules** (a pure module `src/world/beam.js`, unit-tested in node):
- Input: the map's collision grid and tile beam flags, and the present events (sources; mirrors with position and
  state; receptors; gates and locked doors with state; blocks; pots; chests). Output: beam segments (cells with
  direction), the lit cell set, lit receptors, and splash points.
- A beam moves cell by cell. It passes over any cell whose collision is not `solid` (floor, pits, water, ink,
  ledges, bridges dim or lit) and over `beam: 'pass'` tiles. It stops at solid cells (walls, decor, closed gates and
  locked doors, blocks, pots, chests) and leaves a splash there.
- Mirrors: '/' turns right to up, up to right, left to down, down to left. '\' turns right to down, down to right,
  left to up, up to left.
- Receptors light and stop the beam. Actors (party, NPCs, enemies) never block a beam (decided: blocking would make
  puzzles fussy on a phone).
- Maximum length 256 cells; a beam that re-enters a cell in the same direction stops (loop guard). Several sources
  are traced independently; lit cells are their union.
- Recompute on map load, mirror turn or move, block move, gate change, receptor latch. Deterministic.

**Drawing.** A 2 px core (`#eef6ff`) with a 1 px dithered `magic_cyan` halo along tile centers; a bright pixel
travels along the beam (4-frame shimmer; off under `reduceMotion`); `sparkle` particles at each bounce; a small star
splash where it stops; receptors switch to their lit frame with a glow halo. In dark maps the beam is a light
source (a neutral light of radius 1 tile on every second lit cell, at most 24 per map).

**Persistence.** Mirror states and positions reset on re-entry (like blocks). Latched receptors persist through
their flag, and a gate whose sources are latched stays open.

**Softlock rules** (asserted by `qa/maps`): every mirror that controls a bridge is reachable from both ends of that
bridge or from the island it serves; no push block or pushable mirror can be parked on a beam line with no way
around it until re-entry; heavy mirrors only have sockets that keep a path open.

**Teaching ladder** (each step adds one idea): F1 B (one mirror, one receptor, the beam visible from the door) ->
F1 C/N/E (three mirrors in three rooms, a block in the line) -> F2 north (the beam lays a bridge) -> F2 east and
island (one beam, two bridges, commit to a side) -> F3 west (darkness: the beam is the light) -> F3 east (bridges
with a patrol) -> F3 south (Shove a heavy mirror into the line). First-time barks in `BARKS` (the field fires them
the first time the party faces a mirror, lights a bridge, or sees a receptor): `first_mirror` (Mira:
"It turns. The light goes where the glass points."), `first_glass_bridge` (Bram: "Light you can stand on. I hate
it. Walk."), `first_receptor` (Mira: "The crystal by the door. That's what it wants.").

### 5.2 Reflections

Reflective terrain and tiles carry `reflect: true` in tiles.json: `glass_floor`, `gallery_floor`, `throne_floor`,
`mere_water`, and the fountain's water. For each actor standing on or just above a reflective cell, draw its current
frame flipped vertically under its feet, clipped to reflective cells, at alpha 0.35 with a slight tint toward the
surface. Actors with `noReflection` draw none: every Hollow NPC until `nh_restored`, and the King. **The hero's
reflection is faint**: until `nh_restored` a smudge (alpha 0.12, a flat pale silhouette with no face pixels); after
it, a whole but faint reflection (alpha 0.2, face visible, desaturated), which is what the ending's "That's more
than yesterday" points at. Cache flipped frames; at most 8 reflections per frame. This one effect carries the
episode's central image (who has a face in the water) without a word of text.

### 5.3 Mirror doors and the Mirror Sigil

`door` events with `kind: 'mirror'` and `sprite: 'mirror_tall'` transfer with a white dither fade and
`mirror_step` instead of door sounds; they exist only while their `if` holds. Pairs:

| From | To | Present while |
|---|---|---|
| Hollowmere square (`mirror_warp_sq`) | Court F1 landing | `mirror_sigil_get` |
| Hollowmere chapel | Willowmere chapel (behind the altar) | `mirror_sigil_get` |
| Court F2 stairs room (`mirror_f2_short`) | Court F1 landing | `court_f2_done` |
| Court F3 hub (`mirror_f3_short`) | Court F1 landing | `court_f3_arrived` |
| Throne room great mirror (`mirror_exit`) | Hollowmere `fountain_out` | `aurel_named` |

Each pair has its return mirror. Mirror transfers set the game over return point like map-to-map doors.

### 5.4 The fog loop (east road)

`door` with `kind: 'fog'` and no sprite: invisible, a soft white dither fade, no door sounds (a short wind gust),
same-map transfer to `fog_return`. No new walk-model logic: same-map door transfers are already modeled.

### 5.5 Flag-gated overlays, conditional map fields, tints and mist

- `overlays[]` entries accept `if` / `ifNot`. The cached ground layer re-renders the affected cells when a flag
  changes; an overlay's collision applies only while it is present. (Garrick's Crossing, the Hollow's lettered
  signs, Nico's chalk crowns, the clock hands.)
- A map's `music` and `lighting.tint` may be conditional lists, first match wins:
  `[{ if: 'nh_restored', id: 'hollowmere' }, { id: 'hollow' }]`.
- `BANNERS` entries in `text.js` may be conditional lists (`bannerFor` in `story.js`).
- New tint `hollow_dusk`: a silver-violet multiply, lighter and less saturated than `dusk`, lamps lit, no
  fireflies. The Hollow lives in it until `nh_restored`, then `hollowmere_restored` fades to `none`.
- New particle kind `mist`: slow, soft, dithered blobs (area-limited through `ambientFx` with an `area`), for the
  Fading Stretch and the mere at night. Under 0.3 ms per frame.

### 5.6 Story plumbing (`src/game/**`)

- `story.js` merges `ep2.js` scenes and lines with Episode 1's (`sceneById`, `inspectBoxes`); a content test
  asserts scene and line ids are unique across episodes.
- The `ep2_complete` handoff mirrors Episode 1's: push `credits` with `CREDITS_EP2`, set the counter
  `credits2_rolled`, reload at `nh_inn` `inn_bed` in day light.
- **Episode 2 quick start** (`game/state.js`): `newGameEp2(name)` builds a Lv 9 party with the simulator's
  `east_road` loadout, every Episode 1 main flag plus `ep1_complete` and the `credits_rolled` counter, key items
  `name_fragment_1` and `lantern_of_recall`, 900 gold, potion 6, hi_potion 3, ether 4, phoenix_feather 1, and
  starts at `hero_home` `bed` (so `ep2_morning` runs). Exposed as `LQ_DEBUG.newGameEp2(name)` and used by the title
  (E2-scene-ui) and the autoplay.
- Saves stay additive: an Episode 1 save that has seen the credits loads straight into Episode 2.

### 5.7 W9 field abilities in Episode 2

W9-abilities is building Dash Strike, field Appraise and Shove now. Episode 2 places them as below; the E2-maps
agent uses the event types W9 ships (read W9's report and `docs/WORLD.md`).

| Ability | Where | Critical? | Fallback if W9 is not merged |
|---|---|---|---|
| Dash Strike | east road cracked boulder (clearing chest); F1 cracked glass pane (Merewarden Helm); a free first turn on any visible enemy hit from behind | no | the crack becomes a breakable object like a pot |
| Field Appraise | 9 new bestiary entries; the Other Selves and the King can be read in the field before their fights (phase 1 weaknesses only) | no | in-battle Appraise |
| Shove | east road heavy block (reed island chest); F3 Courage heavy mirror | **yes** (F3) | `mirh_c` becomes `push: true` |
| Lantern of Recall | east road milestone (reveals nothing: the hidden-versus-taken lesson); F3 Courage hidden ink bridge and the Keeper's note | no | (exists since Episode 1) |

---

## 6. Combat (E2-battle)

### 6.1 Level and EXP targets

Episode 1's progression ends at 1433 EXP (Lv 9) with every fight and 1239 at 80% (Fact, `progression()`).

| Zone | Plan fights | Level in | Level out (all fights) | At 80% of fights |
|---|---|---|---|---|
| east_road | 7 | 9 | 10 | 9 to 10 |
| court_f1 | 8 | 10 | 11 | 10 to 11 |
| court_f2 | 8 + the Other Selves | 11 | 12 | 11 to 12 |
| court_f3 | 8 | 12 | 13 | 12 to 13 |
| court_throne | 1 | 13 | 13 to 14 | 12 to 13 |

First-pass EXP below hits these: road about +170, F1 +310, F2 +350 and +120 for the mini-boss, F3 +460, the King
+500 (checked against `expForLevel`: Lv 10 1493, 11 1878, 12 2314, 13 2800, 14 3339).

### 6.2 Enemy roster

First-pass numbers come from a calibration (6.8): each foe takes about as many party hits to kill, and takes about
the same share of a party member's HP per hit, as its Episode 1 counterpart did at its zone's level and loadout.
**The simulator targets are binding; these numbers are a starting point.** Family `glass` matters for Shatter.

| id | Name | Family, size | Lv | HP | ATK / MAG | DEF / SPR | SPD | Sh | Weak | Resist | EXP / Gold | Moves (**telegraph**) | AI, trait | Battle art |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `mist_wolf` | Mist Wolf | beast | 9 | 185 | 31 / 7 | 12 / 8 | 16 | 2 | fire, spear | | 11 / 30 | Bite (lowest HP%), Mist Bite (Blind 20%), Howl (once) | basic, evade 0.1 | enemies.webp cell 2 in its original silver-grey |
| `glassback` | Glassback Beetle | insect, glass | 9 | 180 | 34 / 7 | 22 / 14 | 8 | 3 | axe, thunder | sword, bow, ice | 14 / 36 | Harden (forced opener), Shell Bash, **Glass Ram** (single 200%) | basic; reflects magic while Protected | cell 3 recolored silver-blue |
| `quicksilver` | Quicksilver | ooze | 9 | 150 | 30 / 40 | 8 / 10 | 10 | 2 | thunder, ice | fire | 8 / 22 | Tackle, Mercury Spit (Poison 25%) | basic; splits once into 2 beads | cell 0 recolored mercury |
| `quicksilver_bead` | Quicksilver Bead | ooze, small | 9 | 35% of parent | as parent | 8 / 10 | 12 | 1 | thunder, ice | fire | 0 / 0 | Tackle | split child | its own small 1x frame (no scaling) |
| `glint_wisp` | Glint Wisp | spirit, flying | 10 | 205 | 26 / 51 | 9 / 18 | 14 | 2 | bow, thunder | fire, light | 20 / 44 | Glint (Blind 30%), Mirror Dust (party, Blind 15%), **Prism Burst** (party mag 120%) | basic, evade 0.2 | cell 1 recolored pale silver-lilac |
| `glass_sentinel` | Glass Sentinel | construct, glass, large | 10 | 330 | 55 / 13 | 22 / 10 | 7 | 4 | thunder, axe | sword, spear | 26 / 60 | Shard Fist, Glass Guard (Protect self), **Shatter Quake** (party 125%, Stun 20%) | basic | cell 4 recolored slate with a silverglass core |
| `borrowed_shadow` | Borrowed Shadow | spirit | 11 | 235 | 44 / 62 | 12 / 20 | 13 | 3 | light, bow | adaptive | 20 / 56 | copies of whatever last hit it (Shadow Strike, Ember, Frost, Spark, Mend), Dusk Touch (Blind 20%) | ai `mimic` | cell 1 recolored violet-black, silver eyes |
| `faceless_knight` | Faceless Knight | construct, large | 11 | 320 | 66 / 26 | 24 / 14 | 10 | 5 | axe, thunder, light | sword, spear | 26 / 70 | Blank Blade, Cover (guards the lowest-HP ally), **Judgement** (single 220%) | basic + cover | cell 5 recolored slate and black, blank visor |
| `shard_swarm` | Shard Swarm | glass, small, flying | 12 | 220 | 42 / 51 | 10 / 12 | 17 | 2 | thunder, axe, light | spear, bow | 26 / 62 | Shard Rain (3 random hits at 45%), Glitter (Blind 25%), **Shard Storm** (party 140%) | basic, evade 0.25 vs melee | new small sprite (5 to 7 glass shards), lost_page frames as a base |

Archetypes stay distinct from Episode 1's recolors: Mist Wolf (silver) vs Briar Wolf (brown) vs Thornback (violet);
Borrowed Shadow (violet-black) vs Page Wraith (sepia) vs Ink Wraith (black); Faceless Knight (slate) vs Echo Warden
(silver) vs Pride (gold).

### 6.3 New traits and statuses

- **Reflect while Protected** (`glassback`): while it has Protect, a spell aimed at it rebounds onto a random party
  member (the Echo Warden's `reflect` event and code path). The weakness row shows a mirror marker `icon_reflect`
  while it is active. The teaching fight forces Harden as its first move (`opener: 'harden'`).
- **Innate split** (`quicksilver`): the Splitting elite path as an enemy trait (into `quicksilver_bead` x2 at 35%
  HP, once).
- **Mimic** (`borrowed_shadow`, ai `mimic`): remembers the damage type (weapon type or element) that last hit it,
  takes half damage from that type until a different type hits it, and on its turn uses its shadow copy of that
  type against the attacker (physical hits: Shadow Strike; healing nearby: Shadow Mend on itself). With nothing to
  copy it uses Dusk Touch. The adapted resist shows in the weakness row. Lesson: vary your attacks.
- **Cover** (`faceless_knight`): until its next turn, single-target hits on the lowest-HP ally go to the knight.
  Answers: party-wide and random-target skills, True Strike, or kill the knight.
- **Kept** (the King's signature status; 6.5).
- Taunt (Pride) and Guard (Bram's Reflection) already exist as party mechanics; the enemy versions reuse them.

### 6.4 Mini-boss: The Other Selves (`other_selves`)

Boss table, no flee, music `battle`, backdrop `court`, flag `other_selves_defeated`, ai `reflections`.

| id | Name | Lv | HP | ATK / MAG | DEF / SPR | SPD | Sh | Weak | Resist | Kit |
|---|---|---|---|---|---|---|---|---|---|---|
| `refl_hero` | Nameless Reflection | 11 | 365 | 86 / 24 | 18 / 14 | 16 | 4 | spear, staff, bow | sword, axe | Mirror Slash (110), Risen Slash (160), Steady (Focus self) |
| `refl_mira` | Mira's Reflection | 11 | 285 | 40 / 87 | 12 / 22 | 15 | 3 | sword, axe, spear | staff, bow | Ember (140 fire), Frost (140 ice), Mend (heals the lowest-HP reflection 22%) |
| `refl_bram` | Bram's Reflection | 11 | 375 | 75 / 19 | 26 / 16 | 12 | 5 | sword, staff, bow | spear, axe | Guard (covers an ally), Lunge (145), Taunt (2 turns) |

Rewards: EXP 40 each (120 for the group), gold 400 for the group, mastery 14.

- **The rule, "everything you are not":** each reflection is weak to every weapon type its owner does not carry and
  resists its owner's own. No elemental weakness, so the lesson is weapons. Mira's one tip says it; Appraise shows it.
- **Mirrored Combo** (signature telegraph): when two living reflections hold consecutive timeline slots with no
  party member between, the first announces at the end of its turn ("{a} and {b} move as one..."), and on the
  second's turn they perform the reflected copy of the party combo for that pair: hero and Mira **Cinder Edge**
  (single, phys 130 + fire 150), hero and Bram **Cross Shatter** (single, phys 135 x 2), Mira and Bram **Glass
  Bulwark** (reflections gain Protect and Regen, 3 turns). Answers: push one of them back on the timeline (Pin Shot,
  Break, Stun, Lunge), Defend, or kill one. It is the party's own combo rule (BATTLE.md 1.5) seen from the other
  side.
- Targets: careful 7 to 9 rounds, win 85%+; attack-only win 60% or less; ignoring the telegraph costs at least 10
  points of win rate.
- Drops (`BOSS_LOOT.other_selves`): unique `twinfold_charm`, 1 rare roll (ilvl 11), hi_potion 2, hi_ether 1.
- Presentation: `party_battle` frames flipped to face right and recolored to a silver-violet glass ramp with white
  eyes; the hero's has a blank face. The name never shows the player's chosen name: "Nameless Reflection".

### 6.5 Boss: The Nameless King (`nameless_king`)

Boss table, no flee, music `boss_king`, backdrop `throne`, flag `nameless_king_defeated`, ai `nameless_king`.
Lv 13, HP 1600, ATK 158, MAG 149, DEF 16, SPR 18, SPD 13, LUK 10, family glass; immune to Stun, Silence, Poison,
Blind, Chill. HP locks so one hit never skips a phase (the Archivore's rule).

1. **The Veiled King** (100% to 66%). Weak thunder, spear; resist ice; 6 shields. Glass Sword (phys 110), Cold
   Mirror (mag ice 105, Chill 30%). **Keeping**, telegraphed from his 2nd turn and every 4th after: "{name} turns his
   mirror toward {target}. He means to keep them." On the named target, unless it is Defending or Guarded by a
   defending Bram, the target becomes **Kept** for 2 of its turns, and the King gains +10% ATK and MAG for the fight
   (a smaller snowball than Devour Name's +20%, because Kept already costs turns).
2. **The Shattered Court** (from 66%). Summons **Sorrow** and **Pride**. While either stands, the **Mirror Ward**:
   the King takes 25% damage, his shields cannot be chipped, and his HP cannot fall below 34%. He uses Glass Sword,
   **Mirror Rain** (party mag 120%, every 3 turns: "Every shard in the hall turns toward you..."), and Keeping
   every 5. When both adds are gone the ward shatters: the King is Broken for one turn (the reward window) and phase
   3 begins.
   - `false_sorrow` (mender): Lv 13, HP 300, ATK 40, MAG 74, DEF 10, SPR 22, SPD 12, 2 shields, weak fire, bow;
     resist ice. Weep (heals the King 5%, Chill 30% on a party member), **Lament** (every 3 turns: heals the King
     15% and cleanses him). Art: enemies.webp cell 7 in its original icy white-blue (the weeping phantom).
   - `false_pride` (warder): Lv 13, HP 340, ATK 86, MAG 25, DEF 26, SPR 12, SPD 11, 4 shields, weak spear, thunder;
     resist fire, sword. Proud Stance (Taunt, 2 turns), Glass Lance (phys 120). Art: cell 5 recolored gold and
     white, crowned.
   - The decision: Pride's Taunt shields Sorrow, so the player routes damage to Sorrow with party-wide or
     random-target skills (Crescent Sweep, Whirlwind, Volley, Skewer, Starfall Volley, Earthsunder) or True Strike,
     or kills Pride first while Lament heals the King.
3. **Aurel Unmasked** (after the ward). The glass veil shatters (sprite swap to `nameless_king_unmasked`; message
   "Under the glass is a tired man's face."). Weak fire, light, spear (canon: fire); no resists; 8 shields;
   permanent Haste. Glass Sword, Keeping (every 3), **Last Decree** (party phys 230%: "The King raises his glass
   sword. NOTHING MORE WILL BE TAKEN."), with one ordinary turn between telegraphs. Lunge knocks him back 35% of a
   turn (canon: the spear interrupts his charge).

**Kept** (status `kept`, icon `icon_kept`): the member is sealed in a mirror shard on the stage. It skips its turns
(`skip` reason `kept`), cannot be targeted, ignores party-wide hits, keeps its HP. Ends after 2 of its turns, or at
once by Mira's **Recall**, a **Silver Salve**, or when the King is **Broken** ("The mirror cracks!" frees everyone,
`kept_break`). If every living member is Kept or KO, the battle is lost ("THE KING KEEPS YOU ALL."). It is the
Archivore's Devour Name answered by the same verbs (Defend, Guard, Break, Stun) plus two new tools.

- **Fountain blessing:** with `fountain_done` the party starts this fight with +25 Fury (encounter option
  `startFury`).
- Targets: careful 9 to 13 rounds, win 85%+; attack-only 60% or less; ignoring telegraphs costs at least 15 points;
  careful play averages one Kept or fewer per fight.
- Rewards: EXP 500, gold 800, mastery 24. `BOSS_LOOT.nameless_king`: no battle unique (the Kept Promise is staged in
  `king_after`, as Lanternheart was), 2 rare rolls (ilvl 13), phoenix_feather 1, hi_ether 2.
- Art: bosses.webp cell 1 (pale-blue mirrored armor, fractured crown, glass sword) at 1x within the 160 x 144 boss
  cell, derived frames via `anim_frames.py`; the unmasked variant repaints the face (grey-bearded, Elian's features
  aged) and drops the veil; a field avatar at map scale like `archivore_avatar`, with a back-facing frame.

### 6.6 New party skills

| id | Name | Who | Learn | MP | Target | Power | Rank | Help (40 chars) |
|---|---|---|---|---|---|---|---|---|
| `recall` | Recall | mira | Lv 9 | 5 | ally, including Kept | heal 15% | 80 | Speak an ally's name. Frees the Kept. (cures Kept, Nameless, Silence) |
| `shatter` | Shatter | bram | Lv 10 | 6 | enemy | phys 150 | 110 | Heavy blow. Cracks glass: 2 shields. (2 shields on `glass`; 1 on any weakness hit) |
| `true_strike` | True Strike | hero | Lv 11 | 5 | enemy | phys 170 | 100 | A strike that goes where it is aimed. (ignores Taunt, Cover and Reflect) |

The Auto policy (`competent`) learns: Recall or Silver Salve on a Kept ally, party-wide skills into a Taunt, varied
types against the Borrowed Shadow, no spells at a Protected Glassback, and splitting a Mirrored Combo pair.

### 6.7 Encounters and zone plans

| Zone | Name | level | backdrop | music | plan |
|---|---|---|---|---|---|
| `east_road` | The Fading Road | [9, 10] | `east_road` | battle | road_wolves 2, road_beetles 2, road_quick 1, road_mixed 1 (the scripted first fight), road_pack 1 |
| `court_f1` | The Silverglass Antechamber | [10, 11] | `court` | battle | c1_quick 2, c1_wisps 2, c1_sentinel 2, c1_mixed 2 |
| `court_f2` | The Hall of Other Selves | [11, 12] | `court` | battle | c2_shadows 2, c2_knight 2, c2_sentinel 2, c2_mixed 2, other_selves 1 |
| `court_f3` | The Unnamed Throne | [12, 13] | `court_deep` | battle | c3_shards 2, c3_knights 2, c3_shadow 2, c3_mixed 2 |
| `court_throne` | The King's Mirror | [13, 13] | `throne` | boss_king | nameless_king 1 |

Groups: road_wolves = mist_wolf x2; road_beetles = glassback, quicksilver; road_quick = quicksilver x3;
road_mixed = mist_wolf, glassback; road_pack = mist_wolf x3. c1_quick = quicksilver x2, glint_wisp;
c1_wisps = glint_wisp x2; c1_sentinel = glass_sentinel, quicksilver; c1_mixed = glass_sentinel, glint_wisp.
c2_shadows = borrowed_shadow x2; c2_knight = faceless_knight, glint_wisp; c2_sentinel = glass_sentinel,
borrowed_shadow; c2_mixed = faceless_knight, borrowed_shadow. c3_shards = shard_swarm x2; c3_knights =
faceless_knight x2; c3_shadow = borrowed_shadow, shard_swarm; c3_mixed = faceless_knight, glass_sentinel,
shard_swarm. Elites at the normal rate; no fixed elites. `EP2_ZONE_ORDER` continues `progression()` from Episode
1's last EXP; Episode 1's `ZONE_ORDER`, `TARGETS` and the Whisperwood row stay as they are.

### 6.8 Calibration and the simulator

**Method** (so the battle agent can redo it with the real items): party stats from `memberStats` at the zone's
level and loadout; enemy HP = target hits to kill x the average of the hero's attack, Bram's attack and Mira's
140-power spell against the enemy's DEF / SPR; ATK and MAG solve "share of HP lost per hit" against the hero's DEF
and Mira's SPR. Episode 1 references measured the same way: ordinary foes 3 to 9 hits to kill and 5 to 16% per hit,
the Echo Warden 19 hits and about 20%, the Archivore 27 hits and 22 to 33%.

Party stats this produced (tier 3 and 4 items not yet in `items.js` were added by hand):

| Zone | Lv | Hero ATK / DEF / HP | Mira MAG / SPR / HP | Bram ATK / DEF / HP |
|---|---|---|---|---|
| east_road | 9 | 54 / 33 / 144 | 46 / 38 / 141 | 42 / 45 / 179 |
| court_f1 | 10 | 56 / 37 / 168 | 60 / 49 / 140 | 53 / 54 / 197 |
| court_f2 | 11 | 59 / 42 / 183 | 63 / 53 / 151 | 55 / 58 / 225 |
| court_f3 | 12 | 62 / 49 / 198 | 73 / 59 / 163 | 66 / 64 / 244 |
| court_throne | 13 | 64 / 50 / 214 | 76 / 61 / 175 | 68 / 66 / 263 |

**Loadouts for the simulator** (`LOADOUTS`): `east_road` = the `archive_boss` loadout with Lanternheart on the hero
(mastery +10%, inventory plus 1 hi_ether); `court_f1` = plus bearded_axe (hero), archivist_staff and hunters_bow
(Mira), winged_lance and bronze_plate (Bram), silver_circlet, owl_charm, traveler_boots; `court_f2` = plus a tier 3
helm and body each (steel_helm, steel_cuirass, moon_circlet); `court_f3` = plus mere_pike (Bram), mirror_rod (Mira),
silver_mail (hero); `court_throne` = court_f3 plus twinfold_charm (hero) and mastery up one step. Mastery climbs from
about M5 to M6 across the episode.

**TARGETS:** ordinary as Episode 1; `other_selves` rounds 7 to 9, win 0.85, naiveWinMax 0.6; `nameless_king`
rounds 9 to 13, win 0.85, naiveWinMax 0.6, recklessWorse 0.15; `levels` per zone from 6.1.

---

## 7. Loot, items and shops

### 7.1 Consumables

| id | Name | Price | Effect |
|---|---|---|---|
| `hi_ether` | Hi-Ether | 200 | Restores 40 MP. |
| `silver_salve` | Silver Salve | 120 | Cures Kept, Nameless and Silence. |

### 7.2 Equipment (new bases)

Tier 3 armor and charms (ilvl 8; sold in the Hollow from arrival):

| id | Name | Slot | Who | Price | Stats |
|---|---|---|---|---|---|
| `steel_cuirass` | Steel Cuirass | body | hero, bram | 700 | DEF +13 |
| `sage_robe` | Sage's Robe | body | mira | 680 | DEF +8, SPR +7, MAG +3 |
| `steel_helm` | Steel Helm | head | hero, bram | 420 | DEF +6, SPR +1 |
| `moon_circlet` | Moon Circlet | head | mira | 450 | DEF +3, SPR +5, MAG +3 |
| `strider_boots` | Strider Boots | boots | all | 480 | SPD +2, DEF +1 |
| `ranger_mantle` | Ranger's Mantle | mantle | all | 420 | DEF +3, SPR +2, LUK +3 |
| `lantern_charm` | Lantern Charm | charm | all | 380 | SPR +3, ink resist 15% |
| `mirror_charm` | Mirror Charm | charm | all | 400 | MAG +3, Silence resist 50% |
| `clock_charm` | Clock Charm | charm | all | 360 | SPD +1, LUK +4 |

Tier 4 (ilvl 11; the Silverglass Smithy after `court_f2_done`):

| id | Name | Slot / type | Who | Price | Stats |
|---|---|---|---|---|---|
| `silverglass_blade` | Silverglass Blade | sword | hero | 1500 | ATK +29, crit +6 |
| `moonsteel_axe` | Moonsteel Axe | axe | hero, bram | 1550 | ATK +34, SPD -1 |
| `mere_pike` | Mere Pike | spear | bram | 1520 | ATK +30, DEF +3 |
| `mirror_rod` | Mirror Rod | staff | mira | 1500 | ATK +9, MAG +25, SPR +4, MP +8 |
| `glasswing_bow` | Glasswing Bow | bow | mira | 1500 | ATK +26, SPD +1, crit +3 |
| `silver_mail` | Silver Mail | body | hero, bram | 1300 | DEF +18, SPR +3 |
| `mirrorweave_robe` | Mirrorweave Robe | body | mira | 1250 | DEF +11, SPR +10, MAG +4 |
| `glass_helm` | Glass Helm | head | hero, bram | 650 | DEF +8, SPR +2 |
| `mirror_circlet` | Mirror Circlet | head | mira | 700 | DEF +4, SPR +7, MAG +4 |
| `mere_boots` | Mere Boots | boots | all | 700 | SPD +2, DEF +2, HP +15 |
| `veil_mantle` | Veil Mantle | mantle | all | 650 | DEF +4, SPR +4, ink resist 10% |

The Silverglass Blade (ATK +29, crit) against Lanternheart (ATK +24, strikes as light) is a real choice, not an
automatic upgrade: light still matters against the King's last phase and the Borrowed Shadow.

### 7.3 Uniques and the set (placed, never random)

| id | Name | Rarity | Slot | Stats | Source |
|---|---|---|---|---|---|
| `twinfold_charm` | Twinfold Charm | legendary | charm | ATK +4, MAG +4, SPD +1, Fury gain +20% | The Other Selves (guaranteed) |
| `kept_promise` | Kept Promise | legendary | bow (Mira) | ATK +28, SPD +1, crit +6, light +15% | Elian, in `king_after` (staged give with the beam) |
| `hollowcrown` | Hollowcrown | legendary | axe | ATK +33, SPD -1, crit +5, Fury gain +15% | F3 Courage wing, Lantern secret |
| `merewarden_helm` | Merewarden Helm | set | head | DEF +7, SPR +4, HP +15 | F1 Dash Strike secret |
| `merewarden_mantle` | Merewarden Mantle | set | mantle | DEF +4, SPR +4, ink resist 10% | The Fountain of Faces reward |
| `paper_crown` | Paper Crown | rare (unique) | head | SPR +5, LUK +8 | F3 Belonging alcove; Nico's quest |
| `courier_knot` | Courier's Knot | rare (unique) | charm | SPD +1, LUK +4, Blind resist 30% | The Last Route (Tess) |

Set `merewardens_watch` (2 pieces): SPR +3, DEF +2, healing +10%.

### 7.4 Affixes and names

Add a fourth tier at ilvl 10 to every affix that has three (examples: Gleaming ATK 10 to 12, Keen crit 13 to 16,
Runed MAG 10 to 12, Sturdy DEF 8 to 10, Vital HP 40 to 52, Fleet SPD 3, Furious 31 to 38, Lucky 9 to 11, of Embers
/ Frost / Storms 26 to 32, of Dawn 23 to 28, of the Bear 40 to 52, of Warding 8 to 10, of Echoes 15 to 19, of
Leeching 10 to 12, of Mending 26 to 32, of the Lantern 19 to 24, of Haste 3; the resist suffixes cap at 100).
`RARE_NAME_A` gains Silver, Glass, Mere, Mirror, Veiled, Still.

### 7.5 Drop tables and chests

`ZONE_LOOT`: east_road ilvl 9 equipChance 0.15; court_f1 ilvl 10, 0.15; court_f2 ilvl 11, 0.16; court_f3 ilvl 12,
0.18. Random tables still never roll legendaries. Chests per map are listed with each map in section 4.

### 7.6 Shops and the inn

| Shop id | Keeper | Stock |
|---|---|---|
| `east_peddler` | Penny (`penny_e`) | potion 24, hi_potion 100, ether 70, hi_ether 230, antidote 12, eye_drops 14, echo_herb 30, phoenix_feather 170, tent 90, strider_boots 520 |
| `hollow_items` | Fitch | potion, hi_potion, ether, hi_ether, antidote, eye_drops, echo_herb, phoenix_feather, tent, silver_salve (`ifFlag: court_entered`), lantern_charm, mirror_charm, clock_charm |
| `hollow_smithy` | Vessa | runed_saber, bearded_axe, winged_lance, archivist_staff, yew_longbow, steel_cuirass, sage_robe, steel_helm, moon_circlet, ranger_mantle, strider_boots, bronze_plate; tier 4 list (`ifFlag: court_f2_done`) |
| `willowmere_smithy` (restock) | Garrick | the tier 3 weapons (`ifFlag: ep1_complete`) |

Signless Inn: 40 gold. Gold check (Inference; the simulator's gold column settles it): about 1300 gold carried out
of Episode 1, about 700 from the road, 1100 from F1, 1700 from F2 with the mini-boss and 1500 from F3, plus chests
and sales: enough for two tier 3 pieces at the Hollow and two tier 4 pieces before F3, never everything.

---

## 8. Music and sound

### 8.1 New tracks (E2-audio; composed in code like `archive`, `mystery`, `sorrow`, `triumph`)

All use the shared four-note name motif (`NAME_MOTIF`, docs/MUSIC.md) and land at -16 LUFS with seamless loops.

| id | Title | Role | Brief | Key, tempo | Motif | Fallback |
|---|---|---|---|---|---|---|
| `hollow` | The Unwritten Square | the Hollow (town and interiors), memory scenes, Mira's hum at the Waystation, vow vignettes | A lullaby in 3/4: music box and celesta over muted piano and soft strings, a glassy pad; a "reflected melody" (each phrase answered by its inversion, from the root game's region-2 brief). The motif always stops after its third note. | A Dorian, 84 BPM, 3/4, 60 to 80 s loop | 0, +7, +9 then a rest where +5 belongs | willowmere |
| `hollowmere` | Hollowmere | the town after `nh_restored`, the end of `king_after`, `CREDITS_EP2` | The same lullaby, bright, with full strings, horn and glockenspiel; the fourth note finally lands. | D major, 84 BPM, 3/4, 60 to 80 s loop | complete | hollow |
| `fading_road` | The Fading Road | east_road | Travel theme: flute and pizzicato over a walking bass, glass bell glints; every eight bars one instrument drops out and comes back (the road forgetting and remembering). | E minor to G major, 96 BPM, 90 s loop | the flute's opening | valley |
| `court` | The Court of Mirrors | court_f1, court_f2 | Dungeon: a melody in strict canon with its own mirror inversion (celesta and harp, half a bar apart), a low string pedal, sparse glass percussion; cold, beautiful, uneasy. | D Phrygian, 76 BPM, 90 s loop | motif and inversion in counterpoint | archive |
| `boss_king` | The Nameless King | the King's battle | 6/8 at 132 BPM: harpsichord ostinato, low strings, brass stabs, choir. The B section turns the lullaby into a minor-key march (the father's song as a weapon); a short major statement before the loop (the man under the glass). | C minor, 132 BPM, 6/8, 120 s loop | lullaby fragments, motif in the brass | boss_archivore |

Optional Suno upgrades for `docs/SUNO_PROMPTS.md` (same shared style line as Episode 1): `hollow.mp3` "a lullaby
waltz, music box and celesta over muted piano, glasslike bells, reflected melody answered by its inversion, 84 BPM,
wistful, quiet"; `fading_road.mp3` "pastoral travel theme turning misty, flute and pizzicato, glass bells, 96 BPM";
`court.mp3` "mysterious palace of mirrors, celesta and harp in canon, low string pedal, 76 BPM, cold and
beautiful"; `boss_king.mp3` "tragic boss battle in 6/8, harpsichord ostinato, brass and choir, a lullaby turned
into a march, 132 BPM".

### 8.2 Cue sheet by map

| Map | Track |
|---|---|
| hero_home, willowmere (Episode 2 morning) | `willowmere` |
| valley | `valley` |
| east_road | `fading_road` |
| nameless_hollow and the `nh_*` interiors | `hollow`; `hollowmere` after `nh_restored` |
| court_f1, court_f2 | `court` |
| court_f3 | `mystery` (as Episode 1's F3: the approach to a boss in the dark) |
| court_throne | silence until `nameless_king` |
| ordinary battles, the Other Selves | `battle` |
| the Nameless King | `boss_king` |

### 8.3 Cue sheet by scene (a scene that leaves its map's track puts it back before it ends)

| Scene | Cue |
|---|---|
| `ep2_morning`, `ep2_mael` | `willowmere` |
| `garrick_crossing` | `valley` (no change; the warmth is in the lines) |
| `waystation_rest` (Mira's tune) | `hollow` on the music box, back to `fading_road` |
| `mere_view` | `mystery` |
| `nh_arrival` | `hollow` |
| `fountain_faces` | `mystery` on the hero's faint reflection, back to `hollow` for Elian |
| `anwen_register` | `sorrow` from the white line, back to `hollow` |
| `tovin_ferry` | `sorrow` when Mira looks into the water, `hollow` on "Get in the boat." |
| `court_crossing` | `mystery`, then the map's `court` |
| `mira_memory_1` | `hollow`, back to `court` |
| `mira_memory_2` | `sorrow`, back to `court` |
| `vex_mirror` | silence, then `mystery`, back to `court` |
| `other_selves` | silence for the intro, then `battle` |
| `court_f3_arrival` | `mystery` (map track) |
| vow vignettes | `hollow`, back to `mystery` |
| `vow_door` | `sorrow`, then `mystery` |
| `nameless_king` | silence, title card, `boss_king` |
| `king_after` | `sorrow` (the unmasking) -> `triumph` (Aurel's name) -> `mystery` (the hero's name twice) -> `hollowmere` (the Sigil and the bow) |
| `hollowmere_restored` | `hollowmere`, `bell_peal` |
| `ep2_ending` | silence, `bell_toll`, `mystery` on "Thirteen.", end cards |
| credits | `hollowmere` |

### 8.4 SFX and ambience (E2-audio, synthesized like the Episode 1 set)

| id | Use | Brief |
|---|---|---|
| `mirror_turn` | a mirror rotates | a glassy quarter-turn: soft stone grind plus a high ring |
| `beam_hit` | a receptor first lights | a bright crystal chime with a rising shimmer |
| `glass_bridge` | bridge cells light | a sustained glassy swell, about 0.6 s |
| `glass_break` | Dash breaks a pane; the great mirror cracks | a sharp shatter with a tinkling tail |
| `mirror_step` | a mirror door | a whoosh through a shimmering filter |
| `ferry_oars` | the ferry | two oar strokes and water |
| `clock_chime` | Lena's clocktower | a small tower chime, two notes |
| `reflection_out` | the Other Selves step out | a reversed shimmer with a low thud |
| `kept` | a member is Kept | glass freezing over: a crackle that seals |
| `kept_break` | Kept ends | a bright shatter and a breath |
| `mere_still` (ambience) | the Hollow | water lapping, distant wind chimes, a rare bird |
| `court_hush` (ambience) | the Court | a faint glass hum and slow drips |

---

## 9. Asset list: what is reused and what is new

### 9.1 Tiles and tile objects (E2-tiles; new sheets `court.png` and `hollow.png`, existing sheets untouched)

| Asset | Reuse | New |
|---|---|---|
| Court terrains `glass_floor` (F1 silver flagstone), `gallery_floor` (F2 violet marquetry), `throne_floor` (F3 black mirror) | A2 autotile builder, the W8 per-floor kit approach | the three terrains, `reflect: true` |
| Court walls `court` (F1 silver-white cap, pale blue face with tall mirror panels), `court_gallery` (F2 violet with portrait frames), `court_throne` (F3 slate with crack lines and crown motifs) | wall systems and outer faces like `catalog_out` etc. | three wall systems with outer faces |
| `mere_water` (still water, slow 3-frame shimmer, `reflect: true`) | the A1 water animation | the palette and slower timing |
| Mechanism objects: `mirror_stand` (frames '/' and '\'), `mirror_heavy` (on a stone base, both frames), `beam_window` (in a face), `beam_lens` (pedestal), `receptor` and `receptor_wall` (dark, lit), `glass_pane_cracked` / `glass_pane_broken` | push block, crystal switch and lantern pedestal drawing style | all |
| Tiles: `glass_bridge_h_dim` / `_lit`, `glass_bridge_v_dim` / `_lit`, `glass_slot`, `inlay_h`, `inlay_v`, `inlay_corner_ne/nw/se/sw`, `inlay_socket` | the ink bridge faint/revealed pattern | all |
| Doors and furniture: `door_glass_key_closed` / `_open` (locked), `door_glass_closed` / `_open` (gate), `door_vow` (frames: 0 to 3 crystals lit, open), `door_throne` (boss door in glass), `stairs_glass_down` / `_up`, `font_silver`, `throne_glass`, `mirror_tall` (dull, active), `mirror_great` (whole with the town, shattered, empty frame; 6 x 5), `portrait_blank`, `portrait_child`, `portrait_keeper_empty`, `portrait_king`, `glass_bench`, `mirror_wall` (decor) | the Archive kit's doors, fonts and frames as the template | all |
| Hollow town kit: prefab recolors `hall_hollow` (from `library`), `inn_hollow`, `shop_hollow`, `smithy_hollow`, `chapel_hollow` (empty bell frame), `house_hollow_s` / `_m`, slate and silver roofs | every Willowmere prefab, `roof_blue` | the silverglass and slate palette swap, the clocktower |
| `clocktower` (from `chapel_bell_tower`, a clock face without hands) and overlay `clock_hands` | the bell tower prefab | face and hands |
| Signs: `sign_blank`, lettered restored versions for the gate, inn, shop, smithy, chapel, hall; `chalk_crown` overlay | sign tiles | the blank and lettered versions |
| Road and shore: `cairn` (prop), `signpost_blank`, `toll_ruin` (prefab), `floodwrack` (prop, for the valley), `reeds_0` to `reeds_2` (overlays), `tree_birch_silver` (recolored `tree_willow`), `court_far` (distant palace silhouette decal about 8 x 6 tiles, from environments.webp cell 1, quantized) | trees, signposts, `arch_ruin`, the backdrop quantizer | all of these |
| Fountain of Faces | props `fountain` | reflective water region (code), nothing new to draw |
| Hidden ink in F3 | `ink_bridge_*_faint` / `_revealed`, `wall_glyph_*` | none |

### 9.2 Sprites (E2-sprites)

| Asset | Reuse | New |
|---|---|---|
| NPCs `npc_elian`, `npc_anwen`, `npc_tovin`, `npc_lena`, `npc_vessa`, `npc_nico`, `npc_sava`, `npc_corin`, `npc_orla`, `npc_wren`, `npc_fitch`, `npc_vex`, `npc_aurel` | the paper-doll builder (`build_npcs.py`, `npc_parts.py`, `npc_bodies.py`); bodies: child for Nico, guard for Corin, old woman for Orla, robe for Anwen and Aurel | 13 specs in `chars/npc_specs.py` (Elian: sandy hair, coat several sizes too big, ledger; Anwen: grey habit with silver thread; Tovin: oilskin, grey stubble, oar; Lena: spectacles, tool apron; Vessa: goggles up, leather apron, glass glow; Sava: shawl, thread spools; Vex: silver hair, crimson scarf, dark coat; Aurel: silver robe, grey beard, no crown) |
| Enemy battle sprites `mist_wolf`, `glassback`, `quicksilver`, `quicksilver_bead`, `glint_wisp`, `glass_sentinel`, `borrowed_shadow`, `faceless_knight`, `false_sorrow`, `false_pride` | enemies.webp cells 0 to 7 (cells 2 and 7 in their ORIGINAL colors, which Episode 1 never shipped), the `hollow_enemies.py` recolor and derive pipeline, `anim_frames.py` | recolor recipes, `shard_swarm` as a small new sprite |
| Reflections `refl_hero`, `refl_mira`, `refl_bram` (battle) and their field frames | `party_battle` and `party_field` frames | a flip-and-recolor script (silver-violet glass ramp, white eyes, the hero's face blanked), packed into `enemies_battle` / `enemies_field` |
| Boss `nameless_king`, `nameless_king_unmasked` (battle), `nameless_king_avatar` (field, front and back frames) | bosses.webp cell 1, `build_bosses.py`, the `archivore_avatar` approach | the unmasked face edit and the avatar |
| Field sprites for every new enemy | `enemies_field` layout | frames |
| Portraits `elian`, `anwen`, `tovin`, `lena`, `aurel` (48 and 32) | the portrait frame and bevel, `mael` as the lighting and palette reference | hand-pixeled in a new `chars/portraits_ep2.py`; minimum `elian`, `anwen`, `aurel`; `tovin` and `lena` fall back to no portrait if time runs out (the Episode 1 rule for Oren, Edda, Holt) |
| Portrait `nameless_king` | bosses.webp cell 1 crop through `build_portraits.py` | the crop recipe |
| Portrait for Vex | `silver_rogue` (portraits.webp cell 5, already built) | an alias entry only |
| Timeline heads `head_<id>` for every new enemy and reflection | `build_heads.py` | entries |
| UI icons `icon_kept`, `icon_reflect`, `icon_sigil`, `icon_feather` | `tools/art/ui/art_icons.py` | four icons |

### 9.3 Backdrops and key art (E2-tiles, `tools/art/backdrops`)

| id | Source | Use |
|---|---|---|
| `battle_court` | environments.webp cell 1 (the Nameless Hollow mirror palace), brightness about 0.85, cool grade | court_f1, court_f2 |
| `battle_court_deep` | cell 1, brightness about 0.6, violet grade | court_f3 |
| `battle_throne` | cell 1, a tighter crop on the glass towers, violet grade | the Nameless King |
| `battle_east_road` | composed like `compose_valley.py`: a misty lowland at dusk, silver birches, the mere and a far glint of glass | east_road |
| `dialog_keyart_ep2` | cell 1 with the baked vignette | Episode 2 title cards and `CREDITS_EP2` |

### 9.4 What Episode 2 does not need

No new party art (the party sprites, portraits, battle frames and Fury/combo poses all carry over), no new UI
windows, fonts, cursors or touch skins, no new jingles, no new engine core modules.

---

## 10. Build plan: waves and agent briefs

Every agent: read COMMON.md, DESIGN.md, `docs/story/EPISODE2.md`, this plan; stay in owned paths; keep
`node qa/run.mjs` green (Episode 1 tests must not change meaning); no git; no em dashes; final report under 450
words with the contracts other agents need. Where an agent needs something another agent has not delivered yet, it
uses a stub with the agreed id and says so in its report.

### Wave 10a (parallel)

#### E2-story: the Episode 2 script, cast and quests

**Owned paths:** `src/data/story/ep2.js` (new), `src/data/npcs.js` (append Episode 2 entries and add Episode 2
talk entries to Willowmere NPCs), `src/data/quests.js` (Episode 2 flags, main steps, side quests, party chat),
`src/data/text.js` (BANNERS, BOOKS, BARKS, BESTIARY entries for the new enemies, `CREDITS_EP2`, HELP lines),
`docs/story/EPISODE2.md` (keep current), `docs/story/STAGING_EP2.md` (new), `qa/content/**`.

1. `ep2.js` with every scene in EPISODE2.md section 1 and the side scenes in 2.5 of this plan, written with the
   cutscene API only, wrapped and guarded like `ep1.js` (`SCENE_CONDITIONS`), plus `lines` for every inspect id
   (signs, the fountain, the plinth, the proclamation, the milestone, cairns, the toll board, Garrick's rail, the
   floodwrack, mirrors, portraits, the throne, the feather, the register, the ledger, the lost-property shelf).
2. `npcs.js`: the 13 Hollow and Court entries with flag stages (arrival, `court_entered`, `nh_restored`,
   `ep2_complete`), `noReflection` noted in `about` for the world agent, and the Episode 2 lines for Hazel, Mael,
   Iris, Tess, Garrick, Hal, Holt, Pip, Oren, Nella, Edda. Mael's talk entry runs `ep2_mael`; Tess's runs
   `tess_last_route`; Garrick hidden between `ep2_started` and `crossing_done`.
3. `quests.js`: the flags of section 2.2 with meanings; the Episode 2 main quest (steps `road_east`, `fading_road`,
   `nameless_hollow` (Elian, then Anwen, then Tovin), `court_f1`, `court_f2`, `court_f3`, `king`, `hollowmere`,
   `epilogue2` toward Emberpeak), each with journal text and map-aware Talk hints in Episode 1's style; the four
   side quests with rewards from section 7.
4. `text.js`: banners for the 11 maps (conditional for `nameless_hollow`), books `nh_ledger`, `court_ledger`,
   `nh_register_page`, barks `first_mirror`, `first_glass_bridge`, `first_receptor`, `fog_loop`, bestiary entries
   for the 15 new foes, `CREDITS_EP2`.
5. `STAGING_EP2.md`: who stands where, marks, props, camera and music for every scene (the shape of STAGING.md),
   the marks checklist (this plan's 4.8, extended with every spawn and gather mark the scenes use).
6. Tests: scene ids unique across episodes, every flag declared, every `say` box within 3 x 42, music cues return to
   the map track, every inspect id resolvable, every scene's marks listed in STAGING_EP2.md, no em dashes.

**Verify:** `node qa/run.mjs content`; `python qa/content/preview_dialogue.py` on the key scenes; read the result
aloud for voice against EPISODE1 section 4.

#### E2-battle: rules, data, balance

**Owned paths:** `src/data/enemies.js`, `src/data/encounters.js`, `src/data/skills.js`, `src/data/items.js`,
`src/data/loot-tables.js`, `src/data/shops.js`, `src/battle/rules.js`,
`src/battle/ai.js`, `src/battle/status.js`, `src/battle/loot.js`, `tools/sim/**`, `qa/battle/**`, `docs/BATTLE.md`
(a new "Episode 2" section).

1. The enemies, encounters and zones of section 6 (`EP2_ZONE_ORDER`; Episode 1's order and targets untouched).
2. Traits: reflect while Protected (+ forced opener), innate split, mimic (ai), cover; ai `reflections` with the
   Mirrored Combo telegraph; ai `nameless_king` with the three phases, the ward, the adds and the HP locks.
3. Status `kept` (rules in 6.5: skip, untargetable, ignored by party-wide hits, ends on Recall / Silver Salve /
   King Broken / duration; all-Kept-or-KO loses), with events (`status_add` / `status_remove` reason `freed`, a
   `skip` reason `kept`, a `message` for "The mirror cracks!").
4. Skills `recall`, `shatter`, `true_strike` and the enemy skills named in 6.2 to 6.5 (with telegraph texts).
5. Items of section 7 (consumables, key items, tier 3 and 4 bases, uniques, set, affix tier 4, rare names), drop
   tables, `BOSS_LOOT.other_selves` and `.nameless_king`, the shops, and the encounter option `startFury` read from a
   flag (`fountain_done`) through the battle config (document how the scene passes it).
6. Simulator: zones, `LOADOUTS`, `TARGETS` (6.8); the competent policy's new habits (6.6). Tune until `--check`
   prints "All targets met" for both episodes. Record the final table in BATTLE.md.

**Verify:** `node qa/run.mjs battle`; `node tools/sim/simulate.mjs --check`; `--trace other_selves` and
`--trace nameless_king` read once by eye for the phase flow and messages.

#### E2-tiles: the Court tileset, the Hollow kit, backdrops

**Owned paths:** `tools/art/tiles/**`, `assets/tiles/**` (new sheets `court.png`, `hollow.png`; append to
`tiles.json` without moving any existing rect), `tools/art/backdrops/**`, `assets/backdrops/**`.

1. Everything in 9.1 with ids exactly as listed, collision codes, `reflect: true` and `beam: 'pass'` keys, and the
   prefab footprints (`doorAt`) for the town buildings.
2. The backdrops of 9.3 with `bandY` / `bandAlpha` like the others; mock stages via `mock_stage.py`.
3. A contact sheet and a mock F1 room (the beam teaching room drawn with the real tiles) at 3x for the critics.
4. Palette discipline: new colors only where `palette.json` cannot carry silverglass (report each one).

**Verify:** `python tools/art/tiles/build_tiles.py`; view every sheet and mock at 3x or 4x; `node qa/run.mjs core`
(manifest and asset tests); a professional pixel artist would sign off against Chrono Trigger and Lufia II.

### Wave 10b (parallel; starts when 10a's ids are in the files, stubs allowed)

#### E2-world: beams, reflections, mirror doors, plumbing

**Owned paths:** `src/world/**`, `src/scenes/field.js`, `src/game/**`, `qa/world/**`, `docs/WORLD.md`.

1. The beam system of 5.1: `src/world/beam.js` (pure, node-tested), the `beam` / `mirror` / `receptor` events in
   `events.js` (receptors as gate sources, latch and flag persistence, scripts on first light), bridge tile
   swapping with the grace rule, drawing and audio, light sources in dark maps, Shove and push for mirrors (with
   W9's Shove contract).
2. Reflections (5.2), including `noReflection` from `npcs.js` and the hero's faint constant.
3. Mirror doors and fog doors (5.3, 5.4); flag-gated overlays, conditional `music` / `tint` / banners, the
   `hollow_dusk` tint and the `mist` particle kind (5.5).
4. Story plumbing (5.6): Episode 2 scenes in `story.js`, the `ep2_complete` credits handoff, `newGameEp2` and
   `LQ_DEBUG.newGameEp2`.
5. Tests: beam tracing cases (each mirror orientation, slots, splash, loops, multiple sources, bridges, grace),
   receptor AND gates and latches, reflection draw budget, fog and mirror transfers, gated overlay collision, a
   headless walk of every new map with zero console errors.

**Verify:** `node qa/run.mjs world`; `python qa/world/fieldlab.py` shots of the F1 teaching room before and after
turning the mirror, a lit bridge, the fountain with and without NPC reflections, the fog band; draw time under 1 ms
on F3 with the beam lit.

#### E2-sprites: NPCs, enemies, reflections, the King, portraits, icons

**Owned paths:** `tools/art/sprites/**`, `assets/sprites/**`, `assets/ui/heads.*`, `tools/art/ui/**` (icons only),
`assets/ui/ui.*` (icons only).

1. Everything in 9.2 with ids exactly as listed; battle sprites at 1x (no non-integer scaling); derived frames
   (idle, attack, hurt, cast where it applies, die) for every enemy, the reflections and the King (both faces).
2. Run `node qa/core/sync-manifest.mjs` after adding atlases.
3. Mock stages with the new backdrops (borrow `mock_stage.py` outputs from E2-tiles if ready, else the existing
   Archive stage).

**Verify:** `python tools/art/sprites/build_all.py`; `verify.py`; view every contact sheet at 4x; the King, the
Other Selves and the Faceless Knight side by side with the Echo Warden so the three read as different beings.

#### E2-audio: five tracks, SFX, ambience

**Owned paths:** `tools/music/**`, `assets/audio/music/**`, `tools/audio/**`, `assets/audio/sfx/**`,
`assets/audio/ambience/**`, `assets/audio/manifest.json` (through `tools/audio/build.py`), `docs/MUSIC.md`,
`docs/SUNO_PROMPTS.md`, `qa/audio/**`, `qa/music/**`.

1. The five tracks of 8.1 as songs in `tools/music/songs/`, rendered with the existing pipeline, loop metadata,
   -16 LUFS, review images; the motif usage as specified (the lullaby's missing fourth note, completed in
   `hollowmere`; the canon with its inversion in `court`).
2. The 10 SFX and 2 ambiences of 8.4 in the SFX generator; manifest ids exactly as listed; fallbacks set.
3. MUSIC.md section per track; SUNO_PROMPTS.md rows.

**Verify:** `python tools/music/render.py <id>` for each, `verify_decode.py`, `node qa/run.mjs music audio`; listen
to every loop seam; view the piano rolls for the motif.

### Wave 10c (parallel; needs 10a and 10b merged)

#### E2-maps: the eleven maps and the valley link

**Owned paths:** `src/data/maps/**` (new maps; edits to `valley.js` and `chapel.js`), `tools/maps/**`,
`qa/maps/**`, `docs/MAPS.md`.

1. The maps of section 4 (and the valley / chapel edits of section 3) with every mark, event, enemy count, chest
   and puzzle; signs and inspect ids from `ep2.js`; NPC events for every `npcs.js` Episode 2 entry.
2. `mapcheck.mjs`: model beams (enumerate mirror states per beam system, reachable pushes and shoves, bridges as
   walkable under the assignment used), flag-gated events and overlays (walk once with Episode 1 flags and once with
   Episode 2 progress flags), mirror and fog doors.
3. `qa/maps` tests: the Episode 2 critical path from the valley to `court_throne` and back through the mirror; every
   chest reachable; each puzzle's start state lights no critical receptor and the intended solution lights it; the
   softlock rules of 5.1; STAGING_EP2 marks present and walkable.
4. Previews for every new and edited map in `tools/maps/previews/`, viewed; MAPS.md sections in the Episode 1 style.

**Verify:** `node tools/maps/mapcheck.mjs check`; `python tools/maps/preview.py --all --scale=2`; view each map
until it reads like a shipped SNES map (landmarks, varied edges, paths that lead the eye, machinery you can read).

#### E2-scene-ui: the battle scene and UI for Episode 2

**Owned paths:** `src/battle/scene/**`, `src/scenes/battle.js`, `src/battle/fx.js`, `src/ui/**`,
`src/scenes/title.js`, `src/scenes/credits.js`, `src/scenes/menu.js`, `qa/battlescene/**`, `qa/ui/**`.

1. Backdrops per zone (`east_road`, `court`, `court_deep`, `throne`) in `BACKDROP_ASSETS` and `backdropKey`.
2. Kept presentation: the unit sealed in a glass shard on the stage, greyed on the timeline with `icon_kept`, absent
   from target lists; the "mirror cracks" moment; the reflect marker in the weakness row; the Mirrored Combo
   telegraph shown as a silver bracket linking two timeline icons; the King's unmask swap with a shatter fx; the
   Other Selves' entrance.
3. Boss intro cards for THE OTHER SELVES and THE NAMELESS KING (the W5 style).
4. Title: an "Episode 2" entry when any save slot has `ep1_complete` (or `?ep=2`), calling `newGameEp2`; credits
   accept `CREDITS_EP2`; journal and bestiary pages hold Episode 2 content (data-driven, check overflow).

**Verify:** `node qa/run.mjs battlescene ui`; `python qa/battlescene/autobattle.py` on `other_selves` and
`nameless_king`; shots of Kept, the bracket, the unmask, desktop and phone.

### Wave 10d

#### E2-integrate: one playable Episode 2

**Owned paths:** `qa/autoplay.py` (Episode 2 path), `qa/autoplay_grid.mjs`, `qa/integrate/**`, `qa/shots.json`
(append only), and small seam fixes in any file only when its owner's brief is closed (list every touched file in
the report).

1. Play from an Episode 1 credits save and from `newGameEp2` to the Episode 2 credits; fix seams.
2. Extend the autoplay bot to Episode 2 (beam puzzles solved by scripted inputs from the maps' solutions; fights on
   Auto); it must beat the Nameless King at Lv 13 with zero game overs on desktop and phone.
3. Shots: `field_fading_road_mist`, `field_hollow_fountain_faces`, `field_court_f1_beam_teach`,
   `field_court_f2_bridge`, `field_court_f3_dark_beam`, `story_vex_mirror`, `battle_other_selves`,
   `battle_kept`, `battle_king_unmasked`, `story_aurel`, `story_hollowmere_restored`, `story_ep2_ending`, on desktop
   and phone.
4. PROGRESS.md is the orchestrator's; send it a paragraph instead.

**Verify:** `node qa/run.mjs` (everything), `python qa/shots.py --only <the new shots> --device all` with zero
console errors, the autoplay log, a timed read of the story at normal text speed (expect 60 to 90 minutes).

#### Reviews (read-only)

- **critic-4** (`docs/CRITIQUE_4.md`): art and UX on the new shots against Chrono Trigger, Lufia II and FF6, with
  the phone as the bar.
- **play-critic-3** (`docs/PLAYTEST_REVIEW_3.md`): pacing (is there a fight in the first five minutes of Episode 2?),
  clarity of every beam puzzle without text, difficulty of the Other Selves and the King, ten moments to protect
  and ten to fix.

---

## 11. Acceptance and QA

- `node qa/run.mjs` green; Episode 1 suites unchanged in meaning.
- `node tools/sim/simulate.mjs --check`: "All targets met" for Episode 1, Whisperwood Hollow and Episode 2.
- `node tools/maps/mapcheck.mjs check` clean; previews of the 11 new maps and 2 edits viewed and in MAPS.md.
- The autoplay bot finishes Episode 2 from an Episode 1 save and from `newGameEp2`: no softlock, the King beaten at
  Lv 13, zero game overs (desktop and phone).
- Shots with zero console errors; performance: field logic under 3 ms per frame, F3 draw under 1 ms with the beam
  lit, 60 fps on the phone profile.
- Text rules: no em dashes anywhere (`grep` for U+2014 over `next/`), every box within 3 x 42, ASCII only.
- Readability: every beam puzzle solvable by a first-time player without Talk (play-critic-3 checks); Talk always
  names the next step.
- Saves: an Episode 1 save loads into Episode 2; an Episode 2 save written mid-dungeon reloads with latched
  receptors and opened doors intact.

---

## 12. Risks, assumptions and decisions for Scott

**Assumptions (written down because nobody can be asked this week).**
1. W9's Shove lands before wave 10c. If not, the F3 Courage heavy mirror falls back to a pushable mirror (5.7) and
   nothing else changes.
2. Elian as the King's son, Tovin rowing Mira to the Court and back, and Anwen raising Elian are syntheses of canon
   fragments (EPISODE2.md section 8). They make the canon ending ("I remember your son, and I remember you") land on
   a character the player has met.
3. Vex Quill is introduced in Episode 2 because Episode 1 skipped his canon cameo; he is the rival thread for the
   hero's "first page".
4. Five composed tracks are within the music pipeline's proven range (Episode 1 shipped four the same way). Suno
   drop-ins replace them by filename if Scott generates them.
5. Five hand-pixeled portraits is the largest new art risk; the fallback (no portrait for Tovin and Lena) follows
   the Episode 1 rule.

**Risks.**
- The fog band could frustrate on a phone. Mitigations: a three-wide forgiving corridor, cairns always in view,
  Mira's bark, and Talk. If play-critic-3 still flags it, shrink the band to 10 tiles.
- Beam puzzles and the 2^n solver: keep each beam system to 10 mirrors or fewer (F3 wings are separate systems).
- The King's three phases plus Kept is the most complex fight in the game; the simulator's reckless and naive
  policies must still behave, and Auto must free Kept members.
- Reflections on every reflective tile could cost draw time on F3; the budget caps them at 8 per frame.

**Cut lines, if the budget tightens** (each keeps a complete story):
- Cut 1: drop A Letter Answered and Nico's Crowns (the Paper Crown becomes a plain F3 chest).
- Cut 2: drop the F2 portraits' cache and the east road's two secret chests.
- Cut 3 (a vertical slice, CRITIQUE_3 option C): road, town, F1 and the throne room only; Mira's memories 2 and 3
  move to F1 and the throne; the Other Selves and F2/F3 wait for a later wave.

**Decisions for Scott (none block the build; defaults in brackets).**
1. Should the Episode 2 entry on the title screen be visible to players who have not finished Episode 1? [only after
   `ep1_complete` in any slot, or with `?ep=2`]
2. Is it all right that Vex Quill takes the Hollow's list and the party never sees its text? [yes; it keeps the
   list-writer hidden until the First Library]
3. Keep Elian young (about twenty)? [yes; canon gives no age, and it lets the promise be a childhood one]
