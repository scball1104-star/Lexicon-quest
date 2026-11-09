# Episode 5 production plan: The Last Prophecy

Owner: ep5-designer, Sunday 2026-11-08 (evening, Eastern), GitHub issue #50, branch `scott/ep5-design`. Status:
**PROPOSAL, docs only, nothing built.** Story bible: `docs/story/EPISODE5.md`. When Scott and Stephen approve, this file
is the contract the build agents work from. Every build agent reads `docs/briefs/COMMON.md`, `DESIGN.md`,
`docs/story/EPISODE5.md`, this file and its own brief in `docs/briefs/E5-*.md`, in that order. House rules as always: no
em dashes, no git, stay in your owned paths, bound every command, look at your own output.

**Usage guard.** The push runs up to three agents at once, in the waves of section 11, with disjoint owned paths inside
every wave. The orchestrator checks weekly usage before each wave: under 75%, launch the wave; 75 to 85%, run its agents
one at a time; over 85%, stop and leave the branch publishable (Scott's standing guard; his business loops and the
schedule generators come first). Each agent is sized to finish in one sitting: 11 build sittings and 1 review sitting,
about 12 overnight, with a fix pass the next day.

**Resource rule.** Art is made in code or cut from painted source sheets the game owns and has not used (section 9),
through the existing pipelines in `tools/art/**`. Music comes from the in-repo tracker (`tools/music`) or reuses existing
tracks; SFX from the existing generator (`tools/audio`). **No new Suno or Runway generations** in the build: section 9.5
lists the optional paid items with their cost, for Scott to approve separately.

---

## 0. Summary

**What gets built.** One crossing (a ship's deck at night, from Valewyn's south landing), one road (the Caravan Road),
one town with four interiors (Saffron Haven), one three-floor dungeon plus a boss room (the Oracle Labyrinth and the Eye
of the Oracle), one new field mechanic (**sun and shade**: running sand flows wherever light falls and holds in shade;
sundials set the hour, which swings every shadow on the floor at once; obelisks and standing stones cast the shade,
and some can be Shoved along grooves; indoors the light comes only through horizon windows, and in the Well only from
sun-lamps on rails), one battle rule (**the Turning Sky**: every desert battle has a Day or Night sky that turns every
6 actions at a marker on the timeline; sun foes are Exposed at night and star foes by day, and every hit cracks an
Exposed foe's shield), one new party skill (Mira's **Turn the Sky**), one mini-boss (the Mirage Knight), one three-phase
boss with Mira at its center (the Sand Oracle, with two False Futures), 7 ordinary enemies, 3 new tracker tracks plus
reused ones, 8 SFX and 1 ambience, about 32 scenes, 3 side stories, and the save rule carried over: no Episode 5 path
ever writes a save slot that holds another run. Target 60 to 90 minutes (planned at 73), party Lv 21 to 25.

**Everything is in the lazy `ep5` pack**, exactly Episode 4's rule: `src/data/ep5/**`, `src/data/maps/ep5_*.js`,
`assets/*/ep5_*`, `assets/tiles/ep5.png`, `assets/audio/{sfx,ambience}/ep5_*`, registered by mutation (`registerStory`,
`prependTalk`, `FLAG_IDS.push`, `ENEMIES`, `ITEMS`, `SKILLS`, `SCRIPTS`, `POLICY_EXT`, `BACKDROPS`, `SIGNATURE_TECHS`,
`PAGE_KINDS`, `RULE_EXT`). Core changes are five one-line seams (section 13.2), and every core byte they add is paid for
by trimming core JS in the same pull request.

**What is reused (most of it).** The engine, field scene, cutscene API and `closeup` page inserts (`PAGE_KINDS`), the
event vocabulary (doors, boat doors, gates with AND logic, flag gates, overlays with `if`/`ifNot`, push and heavy blocks,
fonts, save bells, chests, lights, Keeper mirrors), the pack system and its atlas merge, Episode 4's whole pack skeleton
(`index.js` order, `maps.js` order-trap pattern, `hooks.js`, `start.js`, `title.js`, the audio fragment, `scene.js`
prototype wrapping), Episode 3's per-run autosave and `pickRunSlot`, the `EXT` event hook, Episode 4's `reveal()` camera
pan, W9's Shove and Dash Strike, the Lantern, the battle rules (CTB, Break, Fury, combos, telegraphs and `charge`,
phases, summons, HP locks, the `nameless` status and its cures), `SCRIPTS`, `POLICY_EXT`, `SIGNATURE_TECHS` (Episode 4's
generalized signature-Tech float), `learn: { flag }`, the simulator, the map kit, `mapcheck`, the preview renderer, the
NPC paper-doll builder, the enemy recolor pipeline, the backdrop builder, the tracker and SFX generator, every jingle,
the tints `dawn`, `dusk`, `night`, and the tracks `mystery`, `orrery`, `ash_road`, `sorrow`, `triumph`, `battle`,
`victory`, `gameover`, `valewyn`. Painted source art the game has never shipped: `environments.webp` cell 4 (the desert
observatory under a purple star sky), `bosses.webp` cell 4 (the Sand Oracle, a golden scorpion with a starfield body).

**What is genuinely new.** Sun and shade (the pure `shade.js` light rule, sundials, standing stones, sun plates,
windows, lamp carts, the running-sand drawing and the hour sweep), the Turning Sky (`sky.js` on one rules seam), Turn the
Sky, an `ep5` tile sheet (a ship deck kit, the Saffron Haven kit, three Labyrinth floor kits, running sand), 10 NPC specs,
7 enemy recolors, the Mirage Knight and its double, the Oracle's three looks and avatar, the False Futures, 1 portrait
crop, 3 close-up page kinds, 3 tracks, 8 SFX, 1 ambience, the whole `src/data/ep5/` pack, the Episode 5 quick start and
its title row.

**Waves (section 11; up to three at once, disjoint paths).**
- **5a** foundations: E5-pack, E5-story, E5-battle.
- **5b** art and field: E5-tiles, E5-sprites, E5-world.
- **5c** maps and sound: E5-maps-a, E5-maps-b, E5-audio.
- **5d** assembly: E5-scene-ui, then E5-integrate (flips `EP5_LIVE` on the branch after the full gate list).
- **5e** review: E5-review (one read-only reviewer, art and play), then E5-fixes (written from the review).

**Done means.** A save that finished Episode 4 plays Episode 5 to its credits with no softlock; so does the
`newGameEp5` quick start, without touching any other run's save and with every Episode 5 sound present; the autoplay bot
beats the Sand Oracle at Lv 24 with zero game overs on desktop and phone; `node qa/run.mjs` green with Episodes 1 to 4
untouched in meaning; `simulate.mjs --check` prints "All targets met" for all five episodes (and `--cave --check`,
`--tier 1 --check` unchanged); the timed story read lands at 60 to 90 minutes; every new map preview viewed; shots with
zero console errors; the tap-prompt load does not grow (section 13).

### 0.1 Lessons carried in from Episode 4's reviews (CRITIQUE_6, PLAYTEST_REVIEW_6)

| Episode 4 problem | Where Episode 5 answers it |
|---|---|
| Decree seals unreadable on a phone (C1) | 5.1 and 6.3: the sky disc, the sky badges and the Exposed shields carry a measured contrast floor (at least 0.15 luma above their box), checked on the 844x390 crop |
| Tall foe's HUD row across its chest (C2) | 6.4, 6.5: the Knight and the Oracle are in the row-placement test from the first wave; rows under the feet |
| Payoffs told, never shown (C3) | 9.4: four close-up page modes for the letter, the prophecy, Ishra's page and the restored chart |
| Wheel marks and post lines too small (C4) | 5.1: the sundial shows the hour by three coloured notches with the lit one large, drawn on the tile above the stand; and the hour is chosen by name, not cycled |
| Four backdrops from one painting, all outdoors (C5) | 9.3: two code-composed interiors (Gallery, Well), one sea, one dunes crop, one boss crop; day and night grades |
| Last floor the brightest (C6) | 2.1 and 4.7: F3 is a night well at dark 0.55; the gate measures F3 luma at or below F2's |
| First floor reuses Episode 3's lilac (C7) | 9.1: three floor palettes, none violet: ochre courts, lapis and gold gallery, basalt and star-glass |
| Field foes rimmed in their own colour (C8) | 9.2: a dark outline plus a side-coded rim (gold for sun foes, pale blue for star foes), checked on each floor |
| Party stacked over the speaker (C11) | EPISODE5 section 1 staging rule; E5-story walks the party to marks |
| A save lost when the pack fails (P1) | 10.6: the `ep5_` landing seam and the never-autosave-on-Test-Town test |
| The signature Tech below the fold (P2) | 6.3: Turn the Sky registers in `SIGNATURE_TECHS` (gold, first) whenever a foretelling is pinned |
| Quick start silent (P3) | 10.4 and 12: the quick start awaits both the ep4 and ep5 fragments; autoplay asserts zero "unknown ... id" warnings |
| Pacing over the target (P5, P7) | 6.1: 18 ordinary fights, about 200 boxes, the timer counts one decision per hour choice |
| The wash happened off screen (P6) | 5.1: an hour change pans to any changed sand more than 6 tiles off (reuse `reveal()`) |
| One-way wheel cycling (P8 below the line) | 5.1: the sundial asks for the hour by name |
| Barrister tip vs data (P8) | 6.6: a test asserts each of Mira's boss tips names a lever the boss's data actually has |
| "Learned Answer" said nothing (P9) | EPISODE5 scene 14: the learn line says what Turn the Sky does |

---

## 1. Scope at a glance

| Thing | Count | Reused | New work |
|---|---|---|---|
| Maps | 11 new + 2 patches | interiors copied from Willowmere's and re-dressed; map kit, preview, mapcheck | `ep5_ship`, `ep5_caravan_road`, `ep5_saffron`, 4 `ep5_sh_*` interiors, `ep5_lab_f1/f2/f3`, `ep5_lab_oracle`; pack patches of `ep4_vw_inn` (wake trigger) and `ep4_valewyn` (ship berth) |
| Field mechanics | 1 new (sun and shade) | overlays, gates, flag gates, Shove, lights, `reveal()`, EXT, tints | sundial, standing stone, sun plate, window, lamp cart events; a pure `shade.js`; the `shade` map block |
| Story scenes | about 32 + side scenes (under 40 built) | cutscene API, guards, Talk, journal, barks, vignette tint, `registerStory`, `closeup` | `src/data/ep5/story.js`, `STAGING_EP5.md` |
| NPCs | 8 new + Tamir + memory actors + returns | paper-doll builder, `prependTalk`, speaker swap | specs, talk tables |
| Enemies | 7 ordinary + mini-boss + double + boss + 2 adds | rules, ai `basic`/`phased`, `charge`, HP locks, `nameless` | the `sky` side on each foe, ai `mirage_knight`, ai `oracle` |
| Battle rule | 1 (the Turning Sky) | CTB timeline, Break, telegraphs | `src/data/ep5/sky.js` on the `RULE_EXT` seam |
| Party skills | 1 | skills.js shape, `learn: { flag }`, `SIGNATURE_TECHS` | Turn the Sky |
| Items | 1 consumable, 8 key items, 16 bases, 7 uniques, 1 set | items.js, loot.js, rarity, affixes | tier 9 and 10 gear, affix tier 7 |
| Shops | 3 new | shops.js, shop scene | stock lists |
| Music | 3 new, 9 reused | tracker pipeline, name motif | `saffron`, `labyrinth`, `boss_oracle` |
| SFX / ambience | 8 / 1 | generator | section 8.4 |
| Tiles | 1 new sheet | autotile, wall systems, the ep4 kit approach | `ep5.png` + `ep5_tiles.json` |
| Sprites | about 32 frame sets | recolor and derive pipelines, pack atlas merge | NPCs, 7 recolors, Knight and double, Futures, Oracle x3, avatar |
| Portraits | 1 crop | portrait pipeline | `oracle` (crop); Sel none by default (9.5) |
| Backdrops | 5 + key art | backdrop builder (environments cell 4), the compose approach | section 9.3 |
| Close-ups | 3 page kinds, 6 modes | `PAGE_KINDS`, the EP4_PAGES approach | `ep5_letter`, `ep5_chart`, `ep5_page` |

---

## 2. Id registry (the contract)

Every id below was grepped against `src/`, `assets/manifest.json`, `assets/audio/manifest.json` and
`assets/tiles/tiles.json` on 2026-11-08: no collisions. Collisions found and avoided: `caster` (a battle word in
`src/battle/` and `src/data/ep4/`, so the shade event is `standstone`), `star_chart` (an X1 quest id; the page kind is
`ep5_chart`), `star_1_read` to `star_3_read`, `star_chime`, `orrery*` (X1), `vow_*` (Episode 2; the Well's landings are
`landing_*`), every `sand_` id (Episode 3, so "Sand Stalker" is `dune_stalker`), `testimony_*` of Episodes 2 to 4,
`answer`, `strike_roll`, `principle_*`, `regent_*`, `lyra_*` (Episode 4). **Prefixes:** maps and zones `ep5_` (the pack
rule needs it); encounters `e5s_` (ship), `e5r_` (road), `e5l1_`, `e5l2_`, `e5l3_` (Labyrinth floors); art `ep5_`; sfx
`ep5_` file names. Never a bare `saffron` map id (it is the music id), never `sh_` alone (always `ep5_sh_`), never `lab_`
alone as a map id.

### 2.1 Maps

| id | Banner (title / sub) | area | size | tileset | music | ambience | lighting |
|---|---|---|---|---|---|---|---|
| `ep5_ship` | The Saffron Wind / South across the Sea | field | 28 x 14 | town + `ep5` kit | `mystery` (0.6) | `mere_still` | tint `night`, lanterns |
| `ep5_caravan_road` | The Caravan Road / South to Saffron Haven | field | 52 x 28 | town + `ep5` kit | `ash_road` | `desert_wind` | the hour's tint (start `noon`: none) |
| `ep5_saffron` | Saffron Haven / The Moonwell Caravanserai; after `haven_restored`: Saffron Haven / Every Road Remembers | town | 44 x 34 | town + `ep5` kit | `saffron` | `desert_wind` | tint `dusk` until `haven_restored`, then none; scenes set `night` |
| `ep5_sh_inn` | The Dune Lantern Rest | interior | as `inn` | interior | town | none | none |
| `ep5_sh_shop` | Saffron Caravan Supplies | interior | as `item_shop` | interior | town | none | none |
| `ep5_sh_smithy` | The Copperwind Smithy | interior | as `smithy` | interior | town | none | none |
| `ep5_sh_observatory` | The Armillary Tower | interior | as `chapel` | interior | `orrery` | none | tint `night` |
| `ep5_lab_f1` | The Oracle Labyrinth / I. The Shifting Dunes | dungeon | 40 x 30 | `ep5` | `labyrinth` | `desert_wind` | the hour's tint (start `noon`), dark 0 |
| `ep5_lab_f2` | The Oracle Labyrinth / II. Gallery of False Horizons | dungeon | 40 x 30 | `ep5` | `labyrinth` | `well_hush` (alias of `archive_hush`) | dark 0.4, window shafts (start `dawn`) |
| `ep5_lab_f3` | The Oracle Labyrinth / III. The Well of Tomorrow | dungeon | 32 x 40 | `ep5` | `mystery` | same | dark 0.55, hour `night`, lamp pools |
| `ep5_lab_oracle` | The Eye of the Oracle | dungeon | 24 x 20 | `ep5` | none until the scene | same | dark 0.3, starlight from the shaft |

Patches (pack-side, never edits to `src/data/maps/ep4_*.js`): `ep4_vw_inn` gains the `ep5_morning` enter trigger;
`ep4_valewyn` gains the ship berth at the south landing (section 3).

### 2.2 Story flags (all pushed onto `FLAG_IDS` and declared in the pack's `flags.js` with a one-line meaning)

Main: `ep5_started`, `ship_boarded`, `ship_first_fight_done`, `road_landed`, `haven_arrived`, `met_sel`,
`star_reading_done`, `sky_learned`, `gnomon_get`, `lab_entered`, `lab_f1_done`, `knight_defeated` (encounter flag),
`lab_f2_done`, `vex_gallery_met`, `sel_walked_in`, `oracle_door_open`, `oracle_defeated` (encounter flag),
`chart_restored`, `fragment5_get`, `roads_returned`, `haven_restored`, `ep5_complete`.

Beats and world state: `ep5_morning_done`, `ship_arrived`, `bram_told`, `bram_spared`, `saw_glass_flat`, `tent_rested`,
`bram_asked` (set by `ship_bram` on either answer), `saw_haven`, `moonwell_seen`, `lab_f1_arrived`, `lab_f2_arrived`, `lab_f3_arrived`, `sel_memory_1`, `sel_memory_2`,
`sel_memory_3`, `landing_shelter`, `landing_truth`, `landing_return`, `sun_key_found` (chest flag), `fifth_list_get`,
`star_restored`, `star_hidden`, `plate_f1_open` (latched sun gate on F1).

Side: Three Roads Home `roads_started`, `testimony_yara`, `testimony_kamal`, `testimony_nasrin`, `moonwell_woken`,
`roads_done`; Reliquary `reliquary_found`; Hassan's Bells `bells_started`, `bell_1_found`, `bell_2_found`,
`bell_3_found` (chest flags), `bells_done`. Counter (not a flag): `credits5_rolled`. Map-local chest flags:
`dune_key_f1`, `dune_key_f2`.

### 2.3 Key items (the pack's `items.js`, merged into `KEY_ITEMS`)

| id | name | icon | desc |
|---|---|---|---|
| `star_letter` | The Star Letter | letter | Sel's letter in star ink. It reads only in the dark, and it had three names once. |
| `gnomon` | Nomad's Gnomon | key | A brass pin. Sets the Labyrinth's sundials. |
| `dune_key` | Dune Key (counted, consumed) | key | A sandstone key. Opens one door in the Labyrinth. |
| `sun_key` | Nomad Sun Key | key | A key with a sun for a bow. Opens the Sun Keyhole. |
| `fifth_list` | The Fifth List | letter | Twenty years of star readers' names, in the cold hand. One line at the bottom is new. |
| `ishra_page` | Ishra's Page | letter | "The future is not a single answer." |
| `caravan_bell` | Caravan Bell (counted, 3) | letter (reuse) | A small copper bell, tuned to find the way home. |
| `name_fragment_5` | Fifth Name Fragment | book | The Star Chart: every name of the realm as a star. |

The chart itself is story state (`chart_restored`), not an inventory item.

### 2.4 Enemies, encounters, zones (section 6)

Enemies: `dune_stalker`, `dune_scarab`, `dust_harrier`, `silt_reaver`, `starsilt`, `horizon_shade`, `tomorrow_husk`,
`mirage_knight`, `mirage_double` (its summoned add), `oracle`, `future_hunger`, `future_fear`. Encounters: `e5s_first`,
`e5r_stalkers`, `e5r_scarabs`, `e5r_mixed`, `e5l1_stalkers`, `e5l1_reavers`, `e5l1_mixed`, `e5l1_harriers`,
`e5l2_shades`, `e5l2_husk`, `e5l2_mixed`, `mirage_knight`, `e5l3_husks`, `e5l3_shades`, `e5l3_mixed`, `oracle`. Zones:
`ep5_ship`, `ep5_caravan_road`, `ep5_lab_f1`, `ep5_lab_f2`, `ep5_lab_f3`, `ep5_lab_oracle` in `EP5_ZONE_ORDER` (exported
by the pack's `encounters.js`), kept out of `Object.keys(ZONES)` behind `EP5_MAPS_LISTED` with the non-enumerable
`defineProperty` pattern the X1 and ep4 packs use.

### 2.5 Scenes (`src/data/ep5/story.js`; map and trigger)

| Scene | Map | Trigger |
|---|---|---|
| `ep5_morning` | ep4_vw_inn | enter trigger from the pack patch (`if: ep4_complete`, counter `credits4_rolled`, `EP5_LIVE`, not `ep5_morning_done`, not `tier_1`) |
| `ep5_board` | ep4_valewyn | the berth object at the south landing (`if: ep5_started`) |
| `ship_night`, `ship_bram`, `ship_fight` | ep5_ship | on enter; step trigger by the bow; step row amidships (after `ship_bram`) |
| `road_landing`, `road_shade`, `tent_rest`, `haven_view` | ep5_caravan_road | on enter; step trigger at the Glass Flat; campfire object (`safe`, `rest`); step trigger on the last dune |
| `haven_arrival`, `meet_sel`, `moonwell`, `sel_gate` | ep5_saffron | on enter; `sel` talk entry; Moonwell object; step trigger at the north gate (after `star_reading_done`) |
| `star_reading` | ep5_sh_observatory | step trigger inside the door (after `met_sel`) |
| `lab_f1_arrival`, `sel_memory_1` | ep5_lab_f1 | on enter; step trigger in the camp court |
| `lab_f2_arrival`, `sel_memory_2`, `vex_gallery`, `mirage_knight`, `reliquary` | ep5_lab_f2 | on enter; step triggers; arena trigger; reliquary object (`lantern: true`) |
| `lab_f3_arrival`, `sel_walks_in`, `landing_shelter`, `landing_truth`, `landing_return`, `sel_memory_3` | ep5_lab_f3 | on enter (chained); spring objects at each landing; chained from the last landing |
| `oracle`, `oracle_after` | ep5_lab_oracle | step trigger row; after the battle |
| `every_road`, `ep5_ending` | ep5_saffron | on enter by the north gate after `oracle_after`; chained |
| `roads_start`, `testimony_yara`, `testimony_kamal`, `testimony_nasrin`, `moonwell_wake`, `bells_start`, `bells_done` | ep5_saffron, ep5_sh_smithy | NPC talk entries and the Moonwell object |
| silent: `lab_f1_stair`, `lab_f2_stair` | F1, F2 | step triggers that set `lab_f1_done`, `lab_f2_done` |

### 2.6 NPC ids (the pack's `npcs.js`, merged into `NPCS`)

New: `sel`, `yara`, `kamal`, `nasrin`, `laleh`, `omar`, `yasmin` (shop `saffron_supplies`), `hassan` (shop `copperwind`),
`ep5_innkeeper` (the Dune Host, Ledger-excluded), `tamir` (from `roads_returned`). Scene spawns: `student_m` /
`ishra_m` (memory tints, speaker swap), `tamir_m` ("A Traveler"), `young_sel_m`, `traveler_m` (memory extras),
`sel_t` (the Well and the Eye), `vex` (as Episodes 2 to 4), `oracle_v` (the Oracle's voice in memories, no actor),
`traveler_a` to `traveler_c` (the returning caravan). Valewyn, Emberpeak, Hollowmere and Willowmere NPCs keep their ids and
get Episode 5 entries through `prependTalk`. No portrait aliases (no unused painted portrait fits; 9.5).

### 2.7 Audio ids

Music: `saffron`, `labyrinth`, `boss_oracle` (new); `mystery`, `orrery`, `ash_road`, `sorrow`, `triumph`, `battle`,
`victory`, `gameover`, `valewyn` (reused; `valewyn` rides the ep4 fragment). SFX: `sun_dial`, `sand_run`, `sand_hold`,
`sky_turn`, `prophecy_read`, `prophecy_break`, `lamp_roll`, `caravan_bell`. Ambience: `desert_wind` (new, fallback
`ash_wind`), `well_hush` (alias of `archive_hush`).

### 2.8 Skills, battle state, tints, particles

Skill `turn_sky` (Mira). Enemy skills: `last_prophecy`, `sandfall`, `stinger`, `devour_road`, `dread`, `hush_reader`,
`sandstorm`, `horizon_cleave`, `mirror_turn`, `eclipse`, `hour_crush`, plus ordinary moves named in 6.2 (each id grepped
by E5-battle before use). Battle state (not statuses): the sky (`day` / `night`), the Turn counter, Exposed and Ascendant
on each sided foe. No new status: "Starless" is the existing `nameless` with a message. Tints: the existing `dawn`,
`dusk`, `night` (the hours) plus one pack tint `desert_noon` (a pale warm screen so noon reads as hot, not as plain day;
optional, E5-world measures it). Particles: the existing dust and sparkle kinds (blowing sand on the road, star motes in
the Well).

---

## 3. The world link: Valewyn's inn and the south landing

Episode 4 ends with the party waking at the Floodwatch Inn (`ep4_vw_inn`, mark `inn_bed`). Episode 5 patches the
**registered** Episode 4 maps from inside the `ep5` pack (`src/data/maps/ep5_patches.js`, the `ep4_patches.js` pattern),
never the files `src/data/maps/ep4_*.js`:

1. **`withEp5Wake(ep4_vw_inn)`**: an enter trigger `ep5_wake` at (0, 0) with `script: 'ep5_morning'`, `on: 'enter'`, and
   marks `yara_table`, `mira_window` beside the existing `inn_bed`.
2. **`withShipBerth(ep4_valewyn)`**: at the south landing (`ferry_in`), a moored ship prop (`ship_moored`, `if:
   ep5_started`), the berth object `ship_berth` (`script: 'ep5_board'`, `if: ep5_started`, `ifNot: ship_boarded`), and two
   boat doors on the same cell: `berth_sail` to `ep5_ship` `deck_start` (`if: ship_boarded`, `ifNot: road_landed`) and
   `berth_south` to `ep5_saffron` `water_stairs` (`if: road_landed`), so a return trip skips the deck. Every Episode 4
   mark, event and walk result unchanged.
3. **Order trap (must not miss).** `registerMap` overwrites by id and the `ep4` pack registers both maps itself (after
   awaiting ep3 for its own patches). The ep5 pack's `maps.js` therefore **awaits the ep4 pack first** (`await
   ensurePack('ep4')`, or imports `../ep4/maps.js` and awaits its `register()`), then reads each registered module with
   `peekMap(id)` and registers the patched one. `packs.js` `ep5.touches` lists `ep4_vw_inn` and `ep4_valewyn` so
   `world/maps.js` waits on both packs (`packsForMap`). The chain is now ep3, ep4, ep5: E5-pack makes the waits run in
   parallel where they can (each pack's own fetch starts at once; only registration is ordered) and measures the
   worst-case entry time to the inn on the phone profile (target: under 3 s warm, under 8 s cold).
4. Tests: the two maps load unpatched with the ep4 pack only and patched with both; with `EP5_LIVE` off no trigger fires
   and no ship is drawn; the berth's doors land on walkable cells.
5. The return route: `ep5_saffron`'s water stairs hold a boat door back to Valewyn's south landing (present from
   `road_landed`). Revisits never use the deck map.

The Keeper mirror network gains no new pair (cut line 1 can restore one at the Moonwell).

---

## 4. Maps

General rules: DESIGN 5.1 format and MAPS.md conventions; every scene mark exists and is reachable; enemy counts match
`ZONES[zone].plan`; every puzzle reads on screen without text; lit paths lead forward, dead ends hold chests; render
previews with `tools/maps/preview.py` and view them. Coordinates are approximate; the map author records exact cells in
`docs/MAPS_EP5_A.md` / `docs/MAPS_EP5_B.md`. **Phone rule:** running sand (gold, animated, bright highlight streaks)
against shaded sand (still, darker ochre under a dithered violet shade) must read across the screen at 844x390; every
dial's current hour must read at rest from two tiles away; every sun plate's lit or shaded state reads at a glance; field
foes carry a dark outline and a side-coded rim (gold sun, pale blue star) so they never camouflage on sand.

### 4.1 `ep5_ship`: The Saffron Wind (28 x 14, field)

A copper-trimmed deck at night, bow to the east, stars and a moon-path on black water at the edges (decor water, no
collision change). Mast, two lanterns, lashed cloth crates, a hatch (decor), the gangway (west).
- `deck_start` (4, 7, 'right') from Valewyn's berth; `ship_night` on enter.
- `bow_trig` at about (22, 6): `ship_bram` (Bram already at the bow as an actor, mark `bram_bow`).
- `fight_row` column at x 15, rows 4 to 10, `if: bram_asked`: `ship_fight`, the scripted `e5s_first`.
- After `ship_first_fight_done`: the dawn tint and the gangway door at the bow to `ep5_caravan_road` `jetty`.
- Marks: `deck_start`, `mira_rail`, `bram_bow`, `yara_wheel`, `foes_drop`, `gangway`. No chest, no other enemy.

### 4.2 `ep5_caravan_road`: The Caravan Road (52 x 28, field)

The road runs from a stone jetty (west) across dunes to the last dune above Saffron Haven (east). Shade block: start
hour `noon`; open sky everywhere.
- **The jetty (x 0 to 10).** Arrival (`road_landing`), a dead caravan camp, a wood chest (`hi_potion` x2). One group
  nearby on the firm dunes.
- **The Glass Flat (x 11 to 24).** **Lesson A (one dial, one shadow):** a band of running sand 5 wide (x 17 to 21) across
  the whole road, a tall obelisk `ob_flat` (h 3) on pavement at its east edge at about (22, 13), the road ending at the
  flat on the west. The sundial `dial_road` on a paved stand west of the flat (faced from pavement); `road_trig` runs
  `road_shade` as the player approaches; Omar sits in the obelisk's noon shade. Noon (start): the obelisk's shadow falls
  north 3 cells onto pavement; the flat runs. Dawn: the shadow falls west 6 cells across the flat at row 13: a one-tile
  firm path. Walk it. **Lesson B (the second hour):** a sand island north of the flat with a standing stone `ss_isle`
  (h 2) and a wood chest (`caravan_bell` #1, `bell_1_found`, present `if: bells_started`, else `hi_ether`): at noon the
  stone's short north shadow and the obelisk's make a two-step path to it. Dusk shows nothing new here (the player learns
  the hours are a choice, not a sequence).
- **Omar's shade tent (x 25 to 36).** A striped awning, the campfire `tent_fire` (`script: 'tent_rest'`, `safe`,
  `rest`), Omar (`omar`, shop `pathkeeper`). Two groups on the firm dunes nearby.
- **The last dune (x 37 to 51).** The `haven_view` trigger at about (44, 7) with the decal `haven_far` (environments cell
  4, quantized) in the overhead layer, and the exit east to `ep5_saffron` `south_gate`.
- Enemies (3): e5r_stalkers 1, e5r_scarabs 1, e5r_mixed 1. Chests: wood (jetty), wood (island: bell or ether), iron (Dash
  boulder, rolled). Marks: `jetty`, `flat`, `dial`, `omar_spot`, `fire`, `isle`, `last_dune`, `haven_far`, `east_exit`.

### 4.3 `ep5_saffron`: Saffron Haven (44 x 34, town)

A Dragon Quest town that reads at a glance on a phone, built around one image: the great golden armillary over an oasis
of copper domes (environments cell 4).
- **South gate** (from the road; mark `south_gate`), the waystone `waystone` (object with two drawn states: shifting
  glyph rows before `haven_restored`, still rows after; the glyphs are never legible text), the Sandstone Bulletin
  `bulletin` (sign, two states: every route struck, routes open).
- **The caravanserai (centre):** stabled camels (decor), packed loads, the Moonwell `moonwell` (object, `script:
  'moonwell'`, then `moonwell_wake` for the side story; after `moonwell_woken` also a rest and save point), Kamal.
- **The northern market court (north-west):** Sel under a copper awning (`sel`), Yasmin's stall outside her shop, Nasrin
  on a bench.
- **West:** the Dune Lantern Rest. **East:** Saffron Caravan Supplies. **South-east:** the Copperwind Smithy with
  Hassan's bell rack outside (`bell_rack`, three hooks that fill). **North-east:** the Armillary Tower (door to
  `ep5_sh_observatory`; the big armillary prop on its roof, 4 x 4, overhead layer).
- **North gate:** the nomad path; `gate_trig` runs `sel_gate` after `star_reading_done`; then a door to `ep5_lab_f1`
  `start` (present from `gnomon_get`). **Water stairs (south-west):** Yara's ship moored (decor) and the boat door to
  Valewyn (present from `road_landed`).
- The mural of seven wandering stars on the caravanserai wall (inspect). Lamps lit (dusk tint) until `haven_restored`.
- Marks: `south_gate`, `waystone`, `bulletin`, `moonwell`, `market`, `sel_spot`, `inn_door`, `shop_door`, `smithy_door`,
  `tower_door`, `north_gate`, `water_stairs`, `crowd_a` to `crowd_d`, `gather_sel`, `gather_yara`, `gather_tamir`,
  `caravan_in` (where the returning caravan enters), `roof_view` (the ending).

### 4.4 Interiors (copy the Willowmere counterpart's layout and exits, then re-dress)

| id | from | contents |
|---|---|---|
| `ep5_sh_inn` | `inn` | the Dune Host (inn, 100 gold), hanging lanterns, rugs, mark `inn_bed` (the post-credits wake point). |
| `ep5_sh_shop` | `item_shop` | Yasmin (shop `saffron_supplies`), bolts of saffron cloth, water jars. |
| `ep5_sh_smithy` | `smithy` | Hassan (shop `copperwind`), a copper forge, bells on a rack; `bells_start` / `bells_done` talk. |
| `ep5_sh_observatory` | `chapel` | the Armillary Tower: Laleh at the great rings (a 3 x 3 object), Nasrin, the save bell (`save` event), star charts on the walls, `reading_trig` two tiles in. Marks `laleh_spot`, `rings`, `nasrin_spot`, `door_sel`. |

### 4.5 The shade block (how a map declares sun and shade)

A map with the mechanic adds a `shade` block (E5-world reads it; mapcheck models it):
```js
shade: {
  hour: 'noon',                    // the hour on entry: 'dawn' | 'noon' | 'dusk' | 'night' ('night': no sun at all)
  sand: [ '....ssss....', ... ],   // 's' = running-sand cell (same size as ground); '.' = not sand
  roof: [ '############', ... ],   // optional: '#' = roofed, the sun never reaches it ('.' or missing = open sky)
}
```
Light reaches a cell from three kinds of source, and **sand that light reaches runs; sand in shade or in the dark
holds** (one rule for the whole episode):
- **Sun** (open-sky cells, at `dawn`, `noon`, `dusk`): every open cell is lit except cells in a caster's shadow. A
  caster of height h casts its shadow **west** for 2h cells at dawn, **north** for h cells at noon, **east** for 2h
  cells at dusk; a shadow stops at the first solid cell (a wall, a closed gate, another caster).
- **Windows** (`window` events on a wall, roofed maps): at the window's `hours`, light enters along the window's row (or
  column) in its facing direction for `reach` cells (default 12) and stops at the first solid cell; a caster in the beam
  shades every cell behind it to the beam's end.
- **Lamps** (`lampcart` events, any map, the only light at `night`): light every cell within `r` (default 3, Chebyshev)
  of the lamp, except cells on the lamp's own row or column that lie behind a caster or a solid cell (shadows fall only
  along the four lines, so they read on a grid; diagonal cells in the radius are lit).

Authoring rules mapcheck enforces: dials, plates' approach cells, grooves and every actor's start cell are **pavement**,
never sand; a Shove-able caster or lamp moves only along `groove` cells; at most 3 movable casters or lamps per map, each
groove at most 6 cells (so every state can be searched); no enemy, NPC or trigger stands on a sand cell.

### 4.6 `ep5_lab_f1`: The Shifting Dunes (40 x 30, open sky, start `noon`)

The teaching floor. Roofless sandstone courts with sand drifts, obelisks whose names were chiselled off, two sundials
(any dial sets the floor's one hour).

| Area | Approx. floor | What it does |
|---|---|---|
| A. The Oasis Gate | x 16 to 24, y 24 to 28 | Arrival (`start` 20,27,'up'), the oasis spring font `font_l1` (rest and save, `safe`), the dial `dial_a`. `lab_f1_arrival` on enter. No enemies. |
| B. Two Shadows | x 8 to 30, y 15 to 22 | **Puzzle B (which hour):** two obelisks on either side of a sand court: at dawn the east obelisk's shadow crosses west to a wood chest (`dune_key`, flag `dune_key_f1`); at dusk the west obelisk's shadow crosses east to the way north. Two groups on firm pavement. |
| C. The Groove | x 28 to 38, y 4 to 18 | **Puzzle C (Shove the shade):** a standing stone `ss_c` (h 2) on a 5-cell groove beside a sand channel; at dawn its shadow (4 cells west) falls on pavement unless it is Shoved two cells north to the channel's mouth. The first Shove (critical; fallback `push: true`). The camp court with `memory1_trig` (`sel_memory_1`). One group. |
| D. The Sun Plate | x 2 to 12, y 6 to 20 | Behind the locked door `door_d` (`dune_key`). **Puzzle D (lit, then shaded):** a sun gate `gate_d` whose plate `plate_d` (`when: 'lit'`, `latch`, flag `plate_f1_open`) sits in an obelisk's noon shadow; at dawn the plate is lit and the gate latches open, but the path to the gate crosses sand that runs at dawn; at noon that path is shaded. So: set dawn (the gate latches), then noon (walk). Order by reach, never by a wrong answer. One group. A Dash-cracked obelisk base to a gold chest (`nomad_wraps`). |
| E. The Far Court | x 12 to 26, y 2 to 8 | At dusk a dead-end shadow reaches a wood chest (`caravan_bell` #2, `if: bells_started`, else `hi_potion` x2). At dawn the long shadow of the tallest obelisk reaches the gold chest `sun_key` (flag `sun_key_found`) on a sand island. The stair down; its trigger sets `lab_f1_done`. One group. |

- Enemies (6): e5l1_stalkers 2, e5l1_reavers 1, e5l1_mixed 2, e5l1_harriers 1. Chests: wood (`dune_key`), wood (bell or
  potions), gold (`nomad_wraps`, Dash), gold (`sun_key`), iron x1 (B, rolled), wood (A, `hourglass_sand` x2). Marks:
  `start`, `font`, `dial_a`, `dial_b`, `camp`, `groove_c`, `plate_d`, `far_court`, `stair_down`.

### 4.7 `ep5_lab_f2`: Gallery of False Horizons (40 x 30, roofed, dark 0.4, start `dawn`)

A long roofed gallery: lapis and gold tile, pillars, painted horizons on every wall, and tall horizon windows in the east
and west walls. Indoors, **the dark holds the sand and the light runs it**: at dawn the east windows throw long shafts
west, at dusk the west windows throw them east, at noon only the high oculi light single cells. Pillars (h 2) cast
shade inside a shaft.

| Area | Approx. floor | What it does |
|---|---|---|
| A. Stair Foot | x 2 to 10, y 22 to 28 | Arrival; `lab_f2_arrival`; spring font `font_l2`; a dial. |
| B. The Long Shafts | x 2 to 20, y 4 to 18 | **Puzzle B (the light is the barrier):** at dawn two east shafts cross a sand hall and run it in two bands; a Shove-able pillar `pl_b` (groove of 4) set into the lower shaft shades a crossing; at dusk the shafts come from the other side and the side room (iron chest) opens. The map table and `memory2_trig` (`sel_memory_2`). Two groups. |
| C. The Star Floor | x 14 to 26, y 2 to 10 | Dark star-glass floor, the painted horizon wall, the feather prop (`feather_glass`); `vex_trig` (`vex_gallery`) placed so the party stops two rows below Vex (CRITIQUE_6 item 11). |
| D. Two Windows | x 24 to 38, y 2 to 18 | **Puzzle D (two hours, one order):** a west window at dusk runs a band that blocks the dial alcove; an east window at dawn runs the band that blocks the far door; a pillar on a groove can shade one band at a time. Reach decides the order. Wood chest (`dune_key`, flag `dune_key_f2`). One group. **The Reliquary:** a west-window alcove lit only at dusk where the Lantern shows travelers' names under the sand (`reliquary_obj`, `lantern: true`, `script: 'reliquary'`); opens a hidden door to the cache (gold chest, present `if: 'reliquary_found'`: 300 gold, 2 `hi_ether`, book `travelers_log`). |
| E. The Mirror Hall | x 14 to 26, y 12 to 24 | The Mirage Knight's arena (`knight_trig`, `mirage_knight`), locked door `door_e` (`dune_key`) on the approach, a spring font `font_l2b` before it. After the win: the stair down; its trigger sets `lab_f2_done`; a lift `lift_f2_short` (`if: 'lab_f2_done'`) up to F1's Oasis Gate. One group on the approach. |

- Enemies (4): e5l2_shades 1, e5l2_husk 1, e5l2_mixed 2, plus the Knight. Chests: iron (B side room, rolled), gold (cache,
  optional), wood (`dune_key`), wood (`hi_potion` x2). Marks: `arrival`, `shafts`, `map_table`, `star_floor`, `vex_spot`,
  `party_stop`, `windows`, `reliquary`, `arena`, `knight_spot`, `stairs_down`.

### 4.8 `ep5_lab_f3`: The Well of Tomorrow (32 x 40, hour `night`, dark 0.55)

A great round shaft descending in three landings (top to bottom = north to south), dark basalt with star-glass inlay,
sand on every landing, and sun-lamps on rails: the only light. **The lamplight runs the sand; shade and dark hold it.**
The darkest map of the episode (gate: F3 mean luma at or below F2's).

| Area | Approx. floor | What it does |
|---|---|---|
| Top landing | x 8 to 24, y 2 to 8 | Arrival (`lab_f3_arrival`, then `sel_walks_in`), the spring font `font_l3` (the only rest point before the Eye; Talk names the F2 lift back). |
| Shelter | x 4 to 28, y 10 to 17 | **One lamp on a rail:** a lamp `lamp_s` (r 3) lights the sand around the stair down; Shove it along its groove away from the stair and the dark holds the sand. The spring `spring_shelter` (`script: 'landing_shelter'`). One group. |
| Truth | x 4 to 28, y 19 to 26 | **A lamp and a stone:** a fixed lamp beside the stair, a standing stone on a groove: Shove the stone between the lamp and the stair to cast a shadow along the row. A hidden Lantern door (Keeper marks under the sand, `lantern: true`) to a gold chest `starwright_bow`. The spring `spring_truth`. One group. |
| Return | x 4 to 28, y 28 to 36 | **Two lamps, one stone, one shade plate:** the last spring's sun gate opens only while its plate is in shade (`when: 'shade'`, `latch`), and both lamps reach it; the stone can shadow one lamp's row, and one lamp can be Shoved out of range. The spring `spring_return` (`script: 'landing_return'`), then `sel_memory_3` chains. One group. |
| The Sun Keyhole | x 12 to 20, y 37 to 39 | The boss door `door_oracle` (`sun_key`, `door_boss` style) to `ep5_lab_oracle`; wood chest (`hourglass_sand` x2). |

- Enemies (4): e5l3_husks 1, e5l3_shades 2, e5l3_mixed 1. Chests: gold (`starwright_bow`, Lantern), iron (Truth, rolled),
  wood (`hourglass_sand` x2). Marks: `arrival`, `sel_top`, `shelter`, `truth`, `return`, `sel_wait_1` to `sel_wait_3`,
  `page_spot`, `keyhole`.

### 4.9 `ep5_lab_oracle`: The Eye of the Oracle (24 x 20)

A round chamber of star-glass at the Well's floor, open to the night sky through the shaft (a starlight pool in the
middle). The Oracle's map actor `oracle` (sprite `oracle_avatar`) coiled around the golden ring (a 4 x 4 object, frames:
coiled, gone). The chart's glow after the fight. Step trigger row `oracle_trig` about row 14. After `oracle_defeated`:
actor `sel_t` (`if: oracle_defeated`, `ifNot: roads_returned`) and the shaft lift `lift_out` to `ep5_saffron` `north_gate`
(its arrival runs `every_road`). Marks: `ring`, `party_stop`, `sel_enter`, `chart_spot`, `feather_spot`.

### 4.10 Marks and named events checklist (for `qa/maps`, mirrored in `STAGING_EP5.md`)

| Map | Marks / named events |
|---|---|
| `ep4_vw_inn` (patch) | `ep5_wake`, `yara_table`, `mira_window`; `ep4_valewyn` (patch): `ship_moored`, `ship_berth`, `berth_sail`, `berth_south` |
| `ep5_ship` | as 4.1; triggers `bow_trig`, `fight_row`; door `gangway` |
| `ep5_caravan_road` | as 4.2; dial `dial_road`; casters `ob_flat`, `ss_isle`; object `tent_fire`; NPC `omar` |
| `ep5_saffron` | as 4.3; NPCs `sel yara kamal nasrin yasmin`; objects `waystone`, `bulletin`, `moonwell`, `bell_rack` |
| `ep5_sh_*` | as 4.4; NPCs `laleh`, `hassan`, `ep5_innkeeper` |
| `ep5_lab_f1` | as 4.6; dials `dial_a`, `dial_b`; caster `ss_c` (Shove); plate `plate_d`, gate `gate_d` |
| `ep5_lab_f2` | as 4.7; windows; pillars `pl_b`, `pl_d`; object `reliquary_obj` |
| `ep5_lab_f3` | as 4.8; lamps `lamp_s`, `lamp_t`, `lamp_r1`, `lamp_r2`; stones; plate `plate_r`; springs |
| `ep5_lab_oracle` | as 4.9; actor `oracle`; lift `lift_out` |

---

## 5. Field systems (E5-world)

### 5.1 Sun and shade: the Episode 5 field mechanic

**Why this one.** It is the desert's own logic (root Chapter V's shifting sand and the LEGACY "Buried Sundial" and "Hall
of Shifting Sand"), it reads from the floor art alone (bright running sand you can see flowing, still violet shade you
can see lying across it, the shadow drawn by a stone you can see), it needs no timing (no step timers, phone-safe), it
adds no damage tiles and no word grids, and it costs little: one pure light rule, the collision change through the
overlay path the field already has, W9's Shove for the movable casters, ordinary gates with a new source for the
plates, the existing `dawn` and `dusk` tints for the hours.

**Why it plays differently from tide locks.** Tide locks were a level per basin: a number compared with a height map,
cycled at a wheel. Sun and shade is **geometry**: the state is one hour for the whole floor, but what it does depends on
where every caster stands, so the puzzle is spatial ("where must this stone be so its dawn shadow lands across that
channel?"), and the main verb after F1 is **moving the shade-maker** (Shove a stone, roll a lamp), not turning a wheel.
The hour is chosen by name (no cycling, no counting: Review 6's wheel complaint), every shadow on the floor swings at once
when it changes (the picture is the feedback), and the episode inverts its own rule twice: outdoors the sun is
everywhere and you hunt for shade; indoors the dark is everywhere and you dodge the shafts of light; in the Well you
carry the sun yourself.

**Event types** (new, in the existing `{ id, type, x, y, if?, ifNot? }` shape, registered on `EXT` by the pack):

| type | fields | behavior |
|---|---|---|
| `sundial` | `sprite?` (`sundial`), `free?` | A sundial on a stand. Confirm while facing (with `gnomon` held; the road's dial has `free: true`) opens a three-row choice, **Dawn / Noon / Dusk**, the current hour marked and the cursor on it (Cancel keeps it). Choosing another hour plays `sun_dial`, then the sweep. Solid, faced from pavement. Its face shows the hour with three coloured notches (dawn rose, noon white, dusk violet), the current one large and lit, drawn on the tile above the stand so the party never covers it. Every dial on a map shares the map's hour. |
| `standstone` | `h` (1 low block, 2 standing stone, 3 obelisk), `shove?`, `sprite?` | A caster. Solid. With `shove: true` it moves one cell per Shove along `groove` cells only; a Shove that would leave any party member on running sand is refused (bark `sand_would_run`, the stone does not budge). |
| `window` | `faces` (`'west'` / `'east'` / `'north'` / `'south'`), `hours` (e.g. `['dawn']`), `reach?` (12) | A horizon window on a wall cell; at its hours a shaft of light enters (5.1 rule). Drawn lit or dark. |
| `lampcart` | `r?` (3), `shove?` | A sun-lamp on a rail. A light source (and a `lights` entry for the dark), solid, moves along `groove` cells with Shove (`lamp_roll`). |
| `sunplate` | `when` (`'lit'` / `'shade'`), `latch?`, `flag?`, `script?` | A gate source: open while its cell's light state matches `when`; with `latch`/`flag` it stays open once opened (the floodgate pattern of Episode 4). Drawn as a sun glyph (gold, glowing when lit) or a moon glyph (violet, glowing when shaded); the gate it opens carries the same glyph. |

**The rule** (`src/data/ep5/field/shade.js`, pure, node-tested):
- `lit(map, state)` returns the set of lit cell indices for the map's hour and the current positions of every caster and
  lamp (section 4.5); `running(map, state)` = sand cells that are lit; `firm` = the other sand cells.
- `plates(map, state)` returns each sun plate's lit/shaded state; `latches(...)` the plates newly latched (monotone).
- Deterministic, no randomness, no timers. Recompute on load, hour change and every Shove. Budget: under 1 ms for a
  40 x 40 map with 12 casters and 4 lamps.

**Collision and drawing.** The field applies the rule through the existing overlay path: running sand gets collision
`water` (impassable, never solid-looking), firm sand its own tile's collision (E5-world chooses the cheapest hook, as
E4-world did: an overlay set rebuilt per state). Running sand is drawn as an animated gold layer (3 frames of flowing
highlight streaks and a soft edge glow); shade is drawn in code as a dithered violet layer (DESIGN 6.2's indigo shadow
rule) over every shaded cell, sand or not, so the player sees each shadow's whole shape. Lamps stamp their light pools
through `Lighting`. An hour change animates as a 30-frame sweep: every shadow shrinks to its caster and grows again in
the new direction, the tint cross-fades (`dawn`, none or `desert_noon`, `dusk`), sand switches as the shadow passes it
(`sand_hold`, `sand_run`), input locked only for those frames, instant under reduceMotion. **Off-screen change:** if any
sand cell more than 6 tiles from the party changed state, reuse Episode 4's `reveal()` (pan, hold, back; confirm skips).

**Persistence.** The hour resets to the map's `shade.hour` on every entry, and Shoved stones and lamps go back to their
authored cells (as blocks do), so every arrival sees the authored state. Latched plates persist through the save
(`g.opened` and their flag, the Episode 4 pattern). **No new save field.**

**Softlock rules** (asserted by `qa/maps` and `mapcheck`): every dial, groove and plate approach is pavement; no actor
starts on sand; every arrival point reaches a dial of its floor at the start state (or the floor has no dial); the
critical path is reachable in some sequence of states explored breadth first (hours x groove positions, with latches as
one-way unlocks); no state strands the player (from every reachable state the entrance is reachable, because a dial is
always reachable and every hour is one choice away); chests on sand islands are reachable in some state.

**Teaching ladder** (one idea per step): road A (one dial, one obelisk: dawn's long shadow bridges the flat) -> road B
(the hours are a choice: noon's short shadows reach the island) -> F1 B (two casters, two hours, two destinations) -> F1 C
(Shove a stone to put the shade where you need it) -> F1 D (a sun plate latches in the light; walk in the shade: an
order forced by reach) -> F2 B (indoors the dark holds; light is the barrier; a pillar shades a shaft) -> F2 D (two
windows, two hours, one pillar) -> F3 Shelter (move the light away) -> F3 Truth (put a stone between) -> F3 Return (two
lamps, one stone, a shade plate). First-time barks in the pack's `BARKS`: `first_shade` (Mira: "A bridge made of shade.
Of course it is."), `first_shove_shade` (Bram: "Move the stone, move the shade. I can do that."), `first_window` (Mira:
"Indoors the dark holds. The light's the trouble now."), `first_lamp` (Bram: "So now we're the sun. Fine."),
`sand_would_run` (Mira: "Not there. The sand would run under us.").

### 5.2 Small additions

- **Tints.** The hours use the existing `dawn`, `dusk`, `night` tints. One optional pack tint `desert_noon` (a pale warm
  screen) so noon reads as heat, not as plain day; E5-world measures the phone crop and drops it if it costs contrast.
- **Memory vignettes.** Reuse the memory tint for Sel's three memories (`student_m`, `tamir_m`, `young_sel_m`,
  `traveler_m`).
- **Speaker swap.** The Episode 4 mechanism for "The First Student" to "Ishra" and "A Traveler" to "Tamir".
- **Sel in the Well.** `sel_t` is a scene actor spawned at `sel_wait_1` to `sel_wait_3` by the landing scenes (no
  follower code; the party's two followers are unchanged).
- **The waystone.** A two-state object whose glyph rows animate (blur and resettle) while the tint is `dusk` or `night`
  and `haven_restored` is unset; still after. Drawn by the tile object's frames, no text.

### 5.3 Story plumbing (inside the pack, plus the seams of section 13.2)

- The pack's `story.js` hands its scenes, lines and conditions to `registerStory`; a content test asserts ids unique
  across all five episodes and the X1, cave and tier packs.
- The `ep5_complete` handoff: the pack adds `CREDITS_HANDOFF[5] = { cards: CREDITS_EP5, music: 'saffron', map:
  'ep5_sh_inn', mark: 'inn_bed', counter: 'credits5_rolled', endCard: END_CARD_EP5, flag: 'ep5_complete' }` and, while
  `EP5_LIVE`, replaces `CREDITS_HANDOFF[4].endCard` with `END_CARD_EP4_LIVE` ("Episode 5 begins in the morning.").
  `creditsPending` already reads the table by `flag` (Episode 4's seam 4).
- `mainQuestFor` switches to the pack's `MAIN_QUEST_EP5` on `ep5_started` through `QUEST_EXT` (exists); `epilogue4`
  Talk and journal point at the south landing while `EP5_LIVE`.
- Ledger rows: Sel on `met_sel`, Yara on `ep5_morning_done`, Kamal on `testimony_kamal`, Nasrin on `testimony_nasrin`,
  Laleh on `star_reading_done`, Omar on `tent_rested`, Yasmin and Hassan on `haven_arrived`, Tamir and Ishra on
  `roads_returned`; `PLACES.saffron` and `REACHED.saffron = 'haven_arrived'`. The hero's row stays unkept.

### 5.4 Shortcuts

| From | To | Present while |
|---|---|---|
| F2 lift `lift_f2_short` | F1 Oasis Gate | `lab_f2_done` |
| F1 Oasis Gate path | Saffron Haven north gate | `lab_entered` |
| `lift_out` (the Eye) | Saffron Haven north gate | `oracle_defeated` |
| Saffron Haven water stairs | Valewyn south landing | `road_landed` |
| The Moonwell (rest and save) | (a rest point in town) | `moonwell_woken` |

### 5.5 W9 abilities and the Lantern in Episode 5

| Ability | Where | Critical? | Fallback |
|---|---|---|---|
| Shove | F1 C, F2 B and D pillars, F3 lamps and stones | yes (F1 C, F3) | the caster or lamp becomes `push: true` |
| Dash Strike | road boulder (iron chest), F1 D cracked obelisk base (Nomad Wraps) | no | breakable object |
| Appraise | 7 bestiary entries; the Knight and the Oracle readable in the field (phase 1), each showing its sky side | no | in-battle |
| Lantern | F2 reliquary (side story, dusk only), F3 Truth hidden door (Starwright's Bow) | no | exists |

---

## 6. Combat (E5-battle)

### 6.1 Level and EXP targets

`expForLevel`: 21 8659, 22 9650, 23 10702, 24 11814, 25 12989 (Fact, `party.js`, run 2026-11-08). Episode 4 finishers
arrive at about 8,900 (Inference: the Regent at Lv 20 plus 800; an Episode 4 save may arrive higher, so E5-integrate
records the real arrival level from an Episode 4 credits save and E5-battle re-tunes if it is Lv 22).

| Zone | Plan fights | Level in | Level out (all fights) | First-pass EXP |
|---|---|---|---|---|
| ep5_ship | 1 (scripted) | 21 | 21 | +170 |
| ep5_caravan_road | 3 | 21 | 22 | +570 |
| ep5_lab_f1 | 6 | 22 | 23 | +1,080 |
| ep5_lab_f2 | 4 + the Knight | 23 | 23 (near 24) | +760, +220 for the Knight |
| ep5_lab_f3 | 4 | 23 to 24 | 24 | +800 |
| ep5_lab_oracle | 1 | 24 | 25 | +1,000 |

18 ordinary fights (Episode 4 planned 20, fought 21 to 23, and met its boss a level high). About 180 EXP an ordinary
fight. At 80% of fights the Oracle is fought at Lv 24.

### 6.2 Enemy roster

First pass, scaled from Episode 4's keep band by the 6.8 method of `EPISODE2_PLAN.md`; **the simulator targets are
binding**. Every ordinary foe uses a different `enemies.webp` cell, recolored to desert gold, ochre and indigo so none
reads as its Episode 4 cousin. Every foe has a **sky side** (6.3).

| id | Name | Family, size | Side | Lv | HP | ATK / MAG | DEF / SPR | SPD | Sh | Weak | Resist | EXP / Gold | Moves (**telegraph**) | Trait | Art |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `dune_stalker` | Dune Stalker | beast | sun | 21 | 560 | 112 / 20 | 30 / 20 | 19 | 2 | ice, spear | fire | 125 / 140 | Bite, Sandkick (Blind 20%) | evade 0.1 | cell 2, sand-gold fur, dark stripes |
| `dune_scarab` | Dune Scarab | beast, shell | sun | 21 | 540 | 108 / 16 | 50 / 22 | 9 | 4 | ice, axe | fire, sword, bow | 130 / 150 | Mandible, Burrow (Protect self), Sunshell | basic | cell 3, gold shell with lapis, as painted (it is a beetle) |
| `dust_harrier` | Dust Harrier | beast, flying | sun | 22 | 520 | 118 / 30 | 24 / 24 | 21 | 3 | bow, thunder | fire | 135 / 150 | Talon, Dust Devil (party phys 90, Blind 15%) | evade 0.15 | cell 6, ochre and rust feathers |
| `silt_reaver` | Silt Reaver | spirit | star | 22 | 580 | 80 / 120 | 22 / 34 | 14 | 3 | light, fire | ice | 140 / 160 | Silt Lash, Bury (Silence 25%), Drain | basic | cell 1, dust-coloured robes, sand streaming from the sleeves, star-blue eyes |
| `starsilt` | Starsilt | ooze | star | 22 | 500 | 70 / 115 | 18 / 30 | 11 | 2 | fire, light | ice, thunder | 135 / 150 | Glimmer (Blind 25%), Starfall (single mag 160%) | basic | cell 0, deep indigo jelly with star specks |
| `horizon_shade` | Horizon Shade | spirit, flying | star | 23 | 600 | 76 / 130 | 20 / 38 | 16 | 3 | light, fire | ice | 150 / 170 | Cold Horizon (Chill 25%), Mirage (evade up), **Eclipse** (party mag 130%, a charge) | charge | cell 7, indigo and pale gold, a horizon line across the body |
| `tomorrow_husk` | Tomorrow Husk | construct, large | sun | 24 | 900 | 150 / 40 | 48 / 26 | 8 | 5 | ice, axe | fire, sword, spear | 180 / 200 | Slam, Sandglass (Haste self), **Hour Crush** (party phys 150%, a charge) | charge | cell 4, sandstone husk, an hourglass heart |

Groups: e5s_first = dust_harrier, dune_scarab (scripted, opens at Night with the Turn 4 actions away: both foes Exposed,
then Ascendant at the dawn turn); e5r_stalkers = dune_stalker x2; e5r_scarabs = dune_scarab x2; e5r_mixed = dune_stalker,
starsilt (the first mixed sky: one Exposed at a time). e5l1_stalkers = dune_stalker x2, dust_harrier; e5l1_reavers =
silt_reaver x2; e5l1_mixed = dune_scarab, silt_reaver; e5l1_harriers = dust_harrier x2. e5l2_shades = horizon_shade x2;
e5l2_husk = tomorrow_husk, starsilt; e5l2_mixed = silt_reaver, dune_scarab, starsilt. e5l3_husks = tomorrow_husk x2;
e5l3_shades = horizon_shade x2, starsilt; e5l3_mixed = tomorrow_husk, horizon_shade. Elites at the normal rate.

### 6.3 The Turning Sky (the episode's one battle rule)

Distinct from Episode 3's Heat and Episode 4's Decrees (a counter on one foe climbing to a flare): the Turning Sky is a
**battle-wide state on the timeline** that changes which foes are open, and the player's decision is timing.

- **The sky.** Every battle in which any foe has a `sky` side has a sky, **Day** or **Night**. It starts from the field's
  hour (dawn or noon: Day; dusk or night: Night), read by the pack from its own field state, so no encounter field is
  added (the encounters.js and rules.js double-entry trap is avoided); a scripted encounter may force it through the
  pack's `SKY_START` table (`e5s_first`: Night, Turn in 4). Battles with no sided foe have no sky (Episodes 1 to 4 and
  the cave unchanged).
- **The Turn.** The sky turns after every **6 actions** (any unit's turn counts). The Turn is drawn as a marker slot on
  the timeline (a large gold sun or silver moon disc at the slot where it falls), and a small sky disc sits at the
  timeline's head. When it passes: "The sky turns. Night." (or "Day."), `sky_turn`, the backdrop's grade cross-fades over
  20 frames.
- **Sides.** Each foe is `sun` or `star`, shown as a badge at the head of its weakness row. Under its own sky a foe is
  **Ascendant**: ATK and MAG +20%, and a soft glow. Under the other sky it is **Exposed**: every hit counts as a weakness
  hit for its shields and its damage (never learned into the bestiary as a weakness). A Broken foe stays Broken across a
  Turn.
- **The levers.** Mira's **Turn the Sky** turns it now. The item **Hourglass Sand** holds it: +3 actions before the next
  Turn. Fights that start at dusk start at Night, so a player who wants the sun foes Exposed can choose the hour before
  walking into them (an optional depth; cut line 2 drops the field link and starts every fight in Day).
- **Readability (the phone is the bar).** The marker disc is at least 12 x 12 on the phone, with a dark ring; the sky
  badge 8 x 8 with a 1 px dark outline; Exposed shields are drawn cracked and bright white for one flash on the Turn,
  then stay pale with a crack line; Ascendant foes keep a 1 px gold or pale blue glow. Measure: the badge and the marker
  at least 0.15 luma above their box on the 844x390 crop (CRITIQUE_6 item 1's rule).
- **Auto (`competent`).** Turns the sky to break a pinned foretelling (6.5) when the Turn is 2 actions away or less; turns
  it when more foe HP stands Ascendant than Exposed and the Turn is 4 or more actions away and Mira keeps at least 24 MP;
  uses Hourglass Sand when a foe is Exposed and one hit from Broken with the Turn 1 action away. The reckless and naive
  policies never use either.

**Turn the Sky** (`turn_sky`, Mira, 12 MP, no target, rank 80; learned in `star_reading` through `learn: { flag:
'sky_learned' }`, fallback `learn: { level: 22 }`). Turns the sky at once and resets the Turn to 6 actions. If a
foretelling is pinned to the Turn (the Oracle's Last Prophecy), it fails and its owner is **Broken** ("The words
change.", `prophecy_break`). Registered in `SIGNATURE_TECHS` (`{ unit: 'mira', flag: 'foretold', skill: 'turn_sky' }`), so
while a foretelling is pinned Mira's Tech list opens on it, first, in gold. Help text (under 40 characters): "Turn the
sky now. Breaks a foretelling." Learn line: "Mira learned Turn the Sky. It turns the sky now, and breaks a foretelling."

### 6.4 Mini-boss: the Mirage Knight (`mirage_knight`)

Boss table, no flee, music `battle`, backdrop `ep5_gallery`, flag `knight_defeated`, ai `mirage_knight` (registered by
the pack). Lv 23, HP 2600, ATK 150, MAG 90, DEF 34, SPR 26, SPD 13, 7 shields, weak ice, axe; resist fire, sword; immune
Silence. Side `sun`.
- **Mirror Turn** (`mirror_turn`): on every natural Turn it lifts its mirror and takes the side that matches the new sky,
  so it is always Ascendant, **unless the party turns the sky**: then it is caught on the wrong side and Exposed until the
  next natural Turn. (The boss's phase 3 trick, taught here first: one idea, taught twice.)
- **Horizon Cleave** (`horizon_cleave`): a charge every 4th Knight turn, party phys 150%: "The Knight raises its blade
  to the horizon..." Defend or Break.
- At 50% it calls its **Mirage Double** (`mirage_double`, the opposite side, HP 600, 2 shields, weak ice): it copies the
  Knight's last attack at half power each turn. One is Exposed under each sky: kill the Exposed one, or turn the sky.
- Targets: careful 7 to 9 rounds, win 85%+; attack-only 60% or less; ignoring the Cleave costs at least 10 points.
- Rewards: EXP 220, gold 900, mastery 20. Drops: unique `horizon_glass`, 1 rare roll (ilvl 23), hi_potion 2.
- Art: `enemies.webp` cell 5 (the mirror-shield knight) recolored to sun-bronze and sandstone, the shield's face a
  painted horizon (a sea, for a desert); the double an indigo recolor at 0.9x. Under-the-feet HUD row from day one.

### 6.5 Boss: the Sand Oracle (`oracle`), Mira at the center

Boss table, no flee, music `boss_oracle`, backdrop `ep5_oracle`, flag `oracle_defeated`, ai `oracle` (registered by the
pack). Lv 24, HP 4800, ATK 215, MAG 210, DEF 30, SPR 28, SPD 14, family construct; immune Stun, Poison, Blind. HP locks at
72% and 34% so one hit never skips a phase. Canon: weak ice, resists fire.

1. **The Read Sky** (100% to 72%). Side `sun`. Weak ice, spear; resist fire, thunder; 8 shields. Stinger (single phys
   140), Sandfall (party mag 100, Blind 25%). **The Last Prophecy** (`last_prophecy`): when the Turn is 3 actions away and
   nothing is pinned, it reads a star: "The Oracle reads {hero}'s star. It falls when the sky turns." (`prophecy_read`)
   and the prophecy is **pinned to the Turn marker** (the named member's head drawn on the marker with a red star). If the
   sky turns naturally with it pinned, the named member takes single mag 240% and becomes Starless (the existing
   `nameless` status, message "{name} falls from the chart."; cured by Recall or Silver Salve). Answers: Mira's **Turn the
   Sky** before the marker (the reading is wrong: it fails and the Oracle is Broken); **Hourglass Sand** (pushes the
   marker 3 actions: buys time to Break); **Break** the Oracle (cancels it, the charge rule); Defend halves the damage but
   not the Starless. The hero's Answer does nothing here ("A foretelling is not a decree. Nothing is written yet.": the
   message names the difference so the Episode 4 habit teaches instead of confusing). It targets the hero first, then the
   member with the lowest HP.
2. **False Futures** (from 72%). Summons **False Future: Hunger** and **False Future: Fear** (canon). While either
   stands the **Mirage Veil** holds: the Oracle takes 15% damage (canon), its shields cannot be chipped, and its HP cannot
   fall below 34% (canon floor). The Last Prophecy continues.
   - `future_hunger`: side `sun`, Lv 24, HP 520, 2 shields, weak ice (canon); resist fire. **Devour the Road**: takes 15
     Fury from the party member who has most and heals the Oracle 5%, every turn.
   - `future_fear`: side `star`, Lv 24, HP 560, 3 shields, weak spear (canon: piercing), light; resist ice. **Dread**:
     pushes one party member back half a turn on the timeline every turn; **Hush the Reader** (Silence 40%) on Mira
     every 3rd turn (it targets the one who can turn the sky).
   - One is Exposed under each sky: the decision is which first and whether to turn the sky to reach the other. When
     both are gone the Veil tears: the Oracle is Broken one turn and the party gains 25 Fury (canon: +25 Focus).
3. **The True Horizon** (after the Veil). The mask falls. Weak ice, spear, light; no resists; 9 shields; Haste; DEF
   normal (canon: armor down). **Mirror of the Sky**: on every natural Turn it takes the side that matches the new sky
   (always Ascendant), unless the party turns the sky (then Exposed until the next natural Turn: the Knight's lesson).
   **Unbound Sandstorm** (`sandstorm`, canon): a charge every 4th Oracle turn, party mag 160%, Blind 30%: "The sand rises
   into a storm around the Oracle..." Defend or Break; turning the sky does not stop it. The Last Prophecy continues on
   every natural Turn's approach.

This is the boss's central decision and it is Mira's: read the pinned star, keep Mira standing and her MP for the turn,
and the Oracle's biggest move becomes the party's Break and Exposed window. It answers the hero's Episode 4 "answer for
yourself" with Mira's "turn it": a reading names you, and someone who can read must change it.

- **Moonwell bonus:** with `moonwell_woken` the party starts with +20 Fury (the existing `startFury` option, as Episode
  4's `council_records`).
- Targets: careful 11 to 15 rounds, win 85%+; attack-only 60% or less; ignoring telegraphs costs at least 15 points;
  careful play breaks at least half the prophecies with Turn the Sky.
- Rewards: EXP 1000, gold 1400, mastery 32. `BOSS_LOOT.oracle`: unique `oracle_mask`, 2 rare rolls (ilvl 24),
  phoenix_feather 1, hi_ether 2. Sel's gift is staged in `every_road`.
- Art: `bosses.webp` cell 4 at 1x in the 160 x 144 boss cell; three looks: The Read Sky (as painted: gold shell, starfield
  body, the mask), False Futures (a ring of drifting sand behind it, the mask cracked), True Horizon (the shell split
  open, the starfield body bright, the mask gone and a face of stars where it was); a field avatar at map scale with a back
  frame. The Futures: one small new sprite (a cracked hourglass wearing a mask, about 40 x 58, 1.3x Episode 4's writs, with
  a ground shadow: CRITIQUE_6 item 15) and two recolors (Hunger gold with an open-jawed mask, Fear indigo with hollow eye
  holes).

### 6.6 Simulator and tests

`tools/sim/ep5.mjs` registers the `ep5` pack data (the ep4 pattern) and adds `EPISODES[5] = EP5_ZONE_ORDER` through one
line in `simulate.mjs`. The sky lives in `src/data/ep5/sky.js` (pure) and runs in the sim exactly as in the game through
`RULE_EXT`. Zones; `LOADOUTS` (ep5_ship = the `ep4_keep_crown` loadout plus The Broken Seal, a Lyra gift and two tier 8
pieces; road the same; lab_f1 plus two tier 9 pieces; lab_f2 plus Nomad Wraps; lab_f3 plus two tier 10 pieces; the Oracle
plus Horizon Glass and mastery up one step); `TARGETS` (ordinary as Episodes 1 to 4, with F3 the tightest ordinary floor:
careful HP lost 18 to 24%, attack-only win 70 to 85%; the Knight and the Oracle as 6.4 and 6.5; `levels` from 6.1). The
policies learn the sky and Turn the Sky. Tune until `--check` prints "All targets met" for all five episodes;
`--cave --check` and `--tier 1 --check` unchanged. The tuning knobs, in this order: the Turn length (6), the Ascendant
bonus (+20%), the Exposed rule (every hit a weakness hit; fallback: every hit chips one shield without the damage bonus).

A content test reads Mira's two boss tips and asserts the lever each names exists in the data ("Turn the sky on it": the
Knight has `mirror_turn`; "turn the sky before it does": the Oracle's `last_prophecy` is `foretold`). PLAYTEST_REVIEW_6
item 8 must not recur.

---

## 7. Loot, items and shops

### 7.1 Consumable

| id | Name | Price | Effect |
|---|---|---|---|
| `hourglass_sand` | Hourglass Sand | 140 | Holds the sky: +3 actions before the next Turn. With a foretelling pinned, it moves with the marker. |

### 7.2 Equipment (new bases)

Tier 9 (ilvl 21; Saffron Haven from arrival): `dunewalker_mail` (body, hero/bram, 4600, DEF +34, SPR +6),
`starweave_robe` (body, mira, 4500, DEF +22, SPR +18, MAG +8), `copper_helm` (head, hero/bram, 2300, DEF +15, SPR +4),
`saffron_hood` (head, mira, 2300, DEF +8, SPR +12, MAG +6), `sandstrider_boots` (boots, all, 2000, SPD +4, DEF +4, Blind
resist 20%), `dune_mantle` (mantle, all, 1900, DEF +7, SPR +5, LUK +3), `shade_charm` (charm, all, 1700, Blind resist 50%,
SPR +4), `lodestar_charm` (charm, all, 1700, Silence resist 50%, MAG +3).

Tier 10 (ilvl 23; the Copperwind Smithy after `lab_f2_done`): `copperwind_sword` (sword, hero, 6200, ATK +58, crit +6),
`dune_axe` (axe, hero/bram, 6300, ATK +65, SPD -1), `starpike` (spear, bram, 6250, ATK +60, DEF +4), `armillary_rod`
(staff, mira, 6200, ATK +16, MAG +50, SPR +7, MP +15), `horizon_bow` (bow, mira, 6200, ATK +53, SPD +1, crit +4),
`sunplate_mail` (body, hero/bram, 5400, DEF +40, SPR +6), `nightglass_robe` (body, mira, 5300, DEF +25, SPR +20, MAG +8),
`sunplate_helm` (head, hero/bram, 2700, DEF +17, SPR +5).

### 7.3 Uniques and the set (placed, never random)

| id | Name | Rarity | Slot | Stats | Source |
|---|---|---|---|---|---|
| `caravan_compass` | Sel's Caravan Compass | legendary | charm | SPD +3, LUK +4, Blind resist 50%, Fury gain +12% | Sel in `every_road`, truth path (`star_restored`) |
| `veiled_star` | The Veiled Star | legendary | charm | SPR +8, evade +8%, Nameless resist 50% | Sel in `every_road`, hidden path (`star_hidden`) |
| `oracle_mask` | The Oracle's Mask | legendary | charm | MAG +8, SPR +6, Fury gain +12% | the Sand Oracle (guaranteed) |
| `horizon_glass` | Horizon Glass | legendary | charm | ATK +6, MAG +6, Blind resist 50% | the Mirage Knight (guaranteed) |
| `starwright_bow` | The Starwright's Bow | legendary | bow (mira) | ATK +60, crit +8, light +15% | F3 Truth, Lantern secret |
| `copperwind_bell` | Copperwind Bell | rare (unique) | charm | SPD +2, Silence resist 50%, LUK +4 | Hassan's Bells |
| `nomad_wraps` | Nomad Wraps | set | boots | SPD +4, DEF +5, Blind resist 10% | F1 D, Dash secret |
| `nomad_mantle` | Nomad Mantle | set | mantle | DEF +7, SPR +6, Silence resist 30% | Three Roads Home |

Set `nomads_way` (2 pieces): Blind resist +30%, SPD +1. The two Sel gifts are a pair: the truth path's compass against
the hidden path's star is a choice of shape, not of power (RESPONSIBILITY_ARC decision D). Names are proposals (open to
veto, as Episode 4's were). Every id grepped 2026-11-08.

### 7.4 Affixes and names

Add a seventh tier at ilvl 22 to every affix that has six (about +15% over tier 6; resist suffixes cap at 100).
`RARE_NAME_A` gains Sunlit, Starborn, Shaded, Wayfaring, Foretold (each grepped first), through `RARE_NAME_EXT` (exists).

### 7.5 Drop tables

`ZONE_LOOT`: ep5_ship and ep5_caravan_road ilvl 21, equipChance 0.16; lab_f1 ilvl 22, 0.17; lab_f2 ilvl 23, 0.17; lab_f3
ilvl 24, 0.18. Random tables never roll legendaries.

### 7.6 Shops and the inn

| Shop id | Keeper | Stock |
|---|---|---|
| `pathkeeper` | Omar (the shade tent) | potion, hi_potion, ether, hi_ether, antidote, eye_drops, echo_herb, phoenix_feather, tent, silver_salve, hourglass_sand, sandstrider_boots (peddler markup as Episodes 2 to 4) |
| `saffron_supplies` | Yasmin | the same consumables at list price plus hourglass_sand, shade_charm, lodestar_charm, dune_mantle |
| `copperwind` | Hassan | tier 9 gear and the tier 8 weapons; tier 10 (`ifFlag: lab_f2_done`) |

Dune Lantern Rest: 100 gold. Gold check (Inference; the simulator's gold column settles it): about 3,200 carried in, 600
from the road, 1,300 from F1, 1,700 from F2 with the Knight, 1,100 from F3, plus chests and sales: two tier 9 pieces in
town and two tier 10 pieces before F3, never everything.

---

## 8. Music and sound

### 8.1 New tracks (E5-audio; composed in code with the in-repo tracker like Episodes 3 and 4; the shared four-note name motif; -16 LUFS; no Suno in the build)

| id | Title | Role | Brief | Key, tempo | Motif | Fallback |
|---|---|---|---|---|---|---|
| `saffron` | The Moonwell Caravanserai | the town, `every_road`, `CREDITS_EP5` | The root region-5 brief, for the tracker: plucked strings in an oud-like register, hand percussion, a breathy flute, spacious string pads, 92 BPM; night-quiet A section, a warmer B section for the caravans. | D harmonic minor, 92 BPM, 70 to 90 s | the motif on plucked strings, the last note bent down a half step | `orrery` |
| `labyrinth` | The Shifting Dunes | lab_f1, lab_f2 | Dungeon: a slow frame-drum pulse, a sustained low drone, a breathy flute that plays the motif in long notes, a bright bell tick every 8 bars like a sundial's shadow moving. | E Dorian, 84 BPM, 90 s | motif in the flute, augmented | `court` |
| `boss_oracle` | The Sand Oracle | the Oracle's battle | 12/8 drive: frame drums and low brass on the accents, a plucked ostinato, choir pads; the B section quotes `saffron` in minor (the town's own song read as an ending); a last major bar before the loop. | C minor, 132 BPM, 12/8, 100 to 120 s | the motif in the brass, the town quote | `boss_king` |

Reused: `mystery` (the ship and the Well: the house rule, the last floor before a boss is the quiet one), `orrery` (the
Armillary Tower; the X1 observatory track fits a town of star readers), `ash_road` (the Caravan Road: Episode 3's sand
road), `sorrow`, `triumph`, `battle`, `victory`, `gameover`, and `valewyn` (Act I). Cut line: if time runs short,
`labyrinth` falls back to `court` and `boss_oracle` to `boss_king`, and the episode still ships.

### 8.2 Cue sheet by map

| Map | Track |
|---|---|
| ep4_vw_inn, ep4_valewyn (Act I) | `valewyn` |
| ep5_ship | `mystery` (0.6) |
| ep5_caravan_road | `ash_road` |
| ep5_saffron and `ep5_sh_*` | `saffron` (the tower: `orrery`) |
| ep5_lab_f1, ep5_lab_f2 | `labyrinth` |
| ep5_lab_f3 | `mystery` |
| ep5_lab_oracle | silence until `oracle` |
| ordinary battles, the Knight | `battle` |
| the Sand Oracle | `boss_oracle` |

### 8.3 Cue sheet by scene (a scene that leaves its map's track puts it back before it ends)

| Scene | Cue |
|---|---|
| `ep5_morning` | `valewyn`, softer (0.6), silence on "Whose is gone?", back |
| `ship_bram` | the map track, softer (0.5) |
| `tent_rest` | the map track, softer (0.6) |
| `haven_view` | `mystery` |
| `haven_arrival` | `saffron` from the waystone's change |
| `star_reading` | `orrery`; silence on the prophecy, `prophecy_read`; `orrery` again on the learn |
| `sel_memory_1`, `sel_memory_2` | `sorrow` with a distant `caravan_bell`, back to `labyrinth` |
| `vex_gallery` | silence, then `mystery`, back to `labyrinth` |
| `mirage_knight` | silence for the intro, then `battle` |
| `sel_walks_in`, landings | no music change; each spring fills with `sand_hold` and a soft bell |
| `sel_memory_3` | silence, `sorrow` on Ishra's name, back to `mystery` |
| `oracle` | silence, title card, `boss_oracle` |
| `oracle_after` | `sorrow` (the mask cracks) -> `triumph` (the chart) -> `mystery` (the counter-seal) -> `saffron` (the road) |
| `every_road` | `caravan_bell` x3, then `saffron` |
| `ep5_ending` | silence, `orrery` under the new reading, `mystery` on "turned a page", end cards |
| credits | `saffron` |

### 8.4 SFX and ambience (E5-audio, synthesized like the Episode 1 to 4 sets)

| id | Use | Brief |
|---|---|---|
| `sun_dial` | a sundial set to a new hour | stone grinding a quarter turn, then a small bright chime |
| `sand_run` | sand starts to run | a dry hiss rising to a pour, about 0.6 s |
| `sand_hold` | sand settles in shade | a soft settling crunch to silence, about 0.5 s |
| `sky_turn` | the battle's sky turns | a slow gong swell with a shimmer on top (night) or a warm brass swell (day), by pitch |
| `prophecy_read` | the Last Prophecy telegraph | a high celestial chime and a low drone underneath |
| `prophecy_break` | a foretelling broken (Turn the Sky) | glass stars scattering, a rising sparkle |
| `lamp_roll` | a lamp cart moves | iron wheels on a stone rail, two clunks |
| `caravan_bell` | Hassan's bells, the returning caravan | a small copper bell, bright, a slow beat-free decay |
| `desert_wind` (ambience) | the road, the town, F1 | low steady wind over sand, an occasional grain-hiss gust |

All of it reaches the game through the pack's audio fragment (13.3), never through `assets/audio/manifest.json`.

---

## 9. Asset list: what is reused and what is new

### 9.0 Unused painted source cells (checked 2026-11-08 against `tools/art/**`, the atlases and EPISODE4_PLAN 9.0)

| Sheet | Cell | Content | Status | Episode 5 use |
|---|---|---|---|---|
| `environments.webp` | 4 | the desert observatory: copper domes, a giant golden armillary, aqueduct, palms, mesas, a purple star sky with a crescent moon | never shipped | the Oracle and dunes backdrops, `haven_far` decal, `ep5_dialog_keyart`, the town's palette |
| `bosses.webp` | 4 | the Sand Oracle: a golden scorpion with a starfield body (mask per the canon prompt) | never shipped | the boss, its looks, avatar, portrait crop |
| `portraits.webp` | 0 to 7 | all used or held (7, `hooded_sage`, held for the First Keeper) | no desert face | Sel speaks without a portrait (9.5) |
| `environments.webp` | 5 to 7 | isles, north, First Library | unused | **held** for Episodes 6 to 8 |
| `bosses.webp` | 5 to 7 | Storm Scribe, White Phantom, Eraser | unused | **held** |
| `enemies.webp` | 0 to 7 | all used by Episodes 1 to 4 | used | recolors only (6.2, 6.4) |

### 9.1 Tiles and tile objects (E5-tiles; new sheet `assets/tiles/ep5.png`, fragment `assets/tiles/ep5_tiles.json`, existing sheets untouched)

| Asset | Reuse | New |
|---|---|---|
| Terrains: `dune_sand` (firm sand), `caravan_paving` (sandstone pavement, the only safe ground in a shade puzzle), `running_sand` (A1, 3 frames: gold with flowing highlight streaks), Labyrinth floors `dune_court` (F1 ochre flagstone with drifts), `gallery_tile` (F2 lapis and gold), `well_basalt` (F3 dark basalt with star-glass inlay) | A2 builder, the ep4 per-floor kit approach | four terrains plus the A1 sand; **no violet stone** (CRITIQUE_6 item 7); floors must not look alike |
| Walls: `dune_court`, `gallery` (with window cells, lit and dark), `well` (curved shaft faces) | wall systems with outer faces | three wall systems, per-room variety |
| `groove` (a paved track with a worn rut, readable as "a stone slides here") | stone floor | palette and the rut line |
| Objects: `sundial` (3 hour states, notches dawn rose, noon white, dusk violet; the face on the tile above the stand), `obelisk` (h 3, 1 x 3 tall, chiselled faces), `standing_stone` (h 2), `low_block` (h 1), `pillar_gallery` (h 2), `lamp_cart` (lit), `sun_plate` (sun and moon glyph, lit and dark), `sun_gate` (glyph, closed and open), `window_horizon` (lit, dark), `star_floor`, `painted_horizon` (3 wall mural variants), `spring` (dry, full), `vow_stone` (3 carvings), `sun_keyhole` (boss door), `waystone` (2 states, glyph rows animate in 3 frames), `bulletin` (2 states), `moonwell` (2 states), `armillary` (4 x 4 roof prop; 3 x 3 interior rings with 2 frames), `oracle_ring` (4 x 4: coiled, empty), `feather_glass` | push block, gate, font, door_boss drawing style | all |
| Town kit: copper domes, sandstone walls, market awnings (saffron, indigo), palms, caravan tents, camels and loads (decor), the caravanserai arcade, the mural of seven stars, water stairs, `inn_lantern`, `shop_cloth`, `smithy_copper`, the Armillary Tower facade, `haven_far` decal (environments cell 4, quantized) | Willowmere prefabs | the copper and sandstone palette swap |
| Ship kit: deck planks, rail, mast and furled sail (2 x 6 overhead), lanterns, lashed crates, hatch, gangway, water edge at night; the moored ship prop for Valewyn's berth and the Haven's water stairs (the same sprite) | the ep4 boat and canal edge | all |
| Shade drawing | none (code) | none: shade is a dithered violet layer drawn by E5-world |

### 9.2 Sprites (E5-sprites; pack atlases `ep5_npcs`, `ep5_enemies_battle`, `ep5_enemies_field`, `ep5_bosses_battle`, `ep5_portraits`, `ep5_heads`)

| Asset | Reuse | New |
|---|---|---|
| NPCs `npc_sel`, `npc_yara`, `npc_kamal`, `npc_nasrin`, `npc_laleh`, `npc_omar`, `npc_yasmin`, `npc_hassan`, `npc_ishra` (memory), `npc_tamir`, `npc_young_sel` (memory child), `npc_traveler` (2 recolors) | paper-doll builder; bodies: robe for Sel, Ishra, Nasrin, Laleh; the smith body for Hassan; sailor for Yara | 10 specs plus 2 recolors (Sel: wind-dark skin, dust wrap, saffron headscarf, brass sun staff; Ishra the same staff, older, indigo wrap) |
| Dune Host | `npc_innkeeper` recolor | palette |
| Enemy battle sprites, the 7 of 6.2 | enemies.webp cells, the recolor and derive pipeline, `anim_frames.py` | recolor recipes; a dark outline on every foe and a side-coded rim (gold sun, pale blue star) |
| `mirage_knight`, `mirage_double` | enemies.webp cell 5 | the bronze recolor, the horizon in the shield, the indigo double |
| `oracle` x3 looks, `oracle_avatar` | bosses.webp cell 4, `build_bosses.py`, the `paper_regent` approach | the three looks and the avatar |
| `future_hunger`, `future_fear` | none | one small new sprite (hourglass and mask, about 40 x 58, ground shadow), two recolors |
| Field sprites for every new enemy | `enemies_field` layout | frames; checked on each floor at phone scale, not on the sheet background |
| Portrait `oracle` | bosses cell 4 crop via `build_portraits.py` | crop recipe, readable at 48 (the mask and one golden claw) |
| Timeline heads `head_<id>` | `build_heads.py` | entries in `ep5_heads`, with the sky badge drawn by the scene, not baked |

### 9.3 Backdrops and key art (E5-tiles, `tools/art/backdrops`; files `assets/backdrops/ep5_*`)

CRITIQUE_6 item 5: four Episode 4 stages were one painting, all outdoors. Here only two come from the painting, and the
interiors are composed in code.

| id | Source | Use |
|---|---|---|
| `ep5_battle_sea` | composed in code: night sea, the ship's rail and mast foreground, a moon path | ep5_ship |
| `ep5_battle_dunes` | environments cell 4, right-half crop (dunes, mesas, the aqueduct), no domes | ep5_caravan_road, ep5_lab_f1 |
| `ep5_battle_gallery` | composed in code: a sandstone arcade, painted horizons, two window shafts | ep5_lab_f2, the Mirage Knight |
| `ep5_battle_well` | composed in code: dark basalt shaft walls, star-glass floor, two lamps | ep5_lab_f3 |
| `ep5_battle_oracle` | environments cell 4, tight crop on the armillary rings and the star sky | the Sand Oracle |
| `ep5_dialog_keyart` | cell 4 with the baked vignette | Episode 5 title cards and `CREDITS_EP5` |

**Day and night grades at runtime, no extra bytes.** Each backdrop is one PNG. The scene (the pack's `scene.js`) draws the
Night grade as painted (the painting is a night scene) and the Day grade as a warm lift (a screen of pale gold over a
multiply that dims the stars), cross-faded over 20 frames on a Turn. E5-tiles gives E5-scene-ui the two grade recipes and
the measured mean luma of each (Day at least 0.12 above Night on the phone crop, so the sky is readable from the backdrop
alone).

### 9.4 Close-up pages (E5-tiles, `src/data/ep5/pages.js`, the EP4_PAGES approach: code-drawn, registered on `PAGE_KINDS`)

CRITIQUE_6 item 3: show the payoffs.

| kind | modes | Used in |
|---|---|---|
| `ep5_letter` | `full` (three names in star ink), `blank` (the top name gone to a smudge) | `ep5_morning` |
| `ep5_chart` | `prophecy` (one faint star beside an empty space, the prophecy forming in starlight), `restored` (the hero's star bright, the counter-seal drawn in stars, "Keep this one." in starlight), `road` (a line of caravan stars, the new reading) | `star_reading`, `oracle_after`, `ep5_ending` |
| `ep5_page` | one (Ishra's page in a warm careful hand, the canon line) | `sel_memory_3` |

The words on a page are the story's lines in the game font styled as handwriting: something to look at, never a puzzle.

### 9.5 Optional paid items (for Scott to approve separately; the build does not wait for them)

| Item | Service | Cost | What it lifts |
|---|---|---|---|
| Sel's portrait (a painted bust in the `portraits.webp` style: wind-dark skin, saffron headscarf, brass sun staff) | Runway still | 4 credits | Sel is the episode's guest and speaks without a face; every other lead has one. Highest value of the three. |
| A Labyrinth interior painting (a sandstone gallery with horizon windows and a star-glass floor) | Runway still | 4 credits | replaces the code-composed `ep5_battle_gallery` and `ep5_battle_well` with one painted interior, cropped twice |
| Saffron Haven by day (the same city as cell 4, noon light) | Runway still | 4 credits | a true Day grade for the dunes and Oracle stages and a day key art for `every_road` |
| `saffron` town theme from the region-5 brief | Suno Pro | 1 of 20 monthly downloads | a real oud-like recording over the tracker version |
| `boss_oracle` | Suno Pro | 1 of 20 monthly downloads | a fuller boss track |

Total if all approved: 12 Runway credits and 2 Suno downloads. Suno: November's nine themes are due from 11/27, so these
two wait for December's downloads unless Scott says otherwise. Default: none; the episode ships without them (the plan's
fallbacks in 8.1 and 9.3 are the shipped versions).

### 9.6 What Episode 5 does not need

No new party art, no new UI windows, fonts or cursors, no new jingles, no new engine core modules, no new status
(Starless is `nameless`; Exposed and Ascendant are battle state), no new ui-atlas icon (the sky disc, badge and cracked
shields are drawn in code by the pack's scene module).

---

## 10. Save compatibility (E5-pack; read this before touching anything that writes a save)

**The rule carries over from Episodes 3 and 4, unchanged: no Episode 5 path ever writes a save slot that holds another
run.**

1. **Per-run autosave stays.** `g.autosaveSlot` is honored by everything Episode 5 adds; Episode 5 adds no new write path.
   Nothing in the pack calls `save.write` except through the field's existing autosave and the save bell.
2. **The main entry is Continue.** A run that finished Episode 4 continues into Episode 5 from its own save: after the
   Episode 4 credits it wakes at `ep4_vw_inn` and `ep5_morning` runs (only while `EP5_LIVE`); a save made later anywhere in
   Valewyn starts it on the next enter of `ep4_vw_inn`.
3. **The quick start, `newGameEp5(name, { slot })`**, lives in the pack (`src/data/ep5/start.js`) and uses the core
   `pickRunSlot(save)` exactly as Episodes 3 and 4 do: slot 0 if empty; otherwise the first empty manual slot, shown before
   starting ("This party will save to Record 2."); if every slot is full it does not start and shows the existing refusal
   with only Back. It never offers Replace and never writes an occupied slot.
4. **`EP5_START`** (in the pack). Lv 21 at 8,900 EXP with the simulator's `ep5_ship` loadout; every Episode 1 to 4 main
   flag plus `ep4_complete` and `lyra_named`; counters `credits_rolled` to `credits4_rolled`; key items `name_fragment_1` to
   `name_fragment_4`, `lantern_of_recall`, `mirror_sigil`; equipment including the First Bell Hammer, the Broken Seal and
   the Tidewarden's Trident; 3,200 gold; potion 6, hi_potion 8, hi_ether 5, phoenix_feather 3, silver_salve 3; starts at
   `ep4_vw_inn` `inn_bed`. The quick start **awaits the ep4 pack and then the ep5 pack, and merges both audio fragments,
   before the fade in** (PLAYTEST_REVIEW_6 fix 3: a quick-start party heard no Episode 4 sound). Exposed as
   `LQ_DEBUG.newGameEp5(name, { slot })`.
5. **The episode switch.** `src/game/episodes.js` gains `export const EP5_LIVE = false` (seam 2). While false:
   `ep5_morning` never runs, no ship is moored at Valewyn, the Episode 4 end card is unchanged, and the title shows no
   Episode 5 row, **except** with `?ep=5` once the pack's `EP5_MAPS_LISTED` is true. E5-integrate flips `EP5_LIVE` on the
   branch. When live, the title row "Episode 5: new party" shows once any slot has `ep4_complete`, with the help line "A
   ready party at Lv 21. Your own save stays under Continue." (the folded two-column title, `foldTitleRows`, keeps the
   episode rows together).
6. **A save never lost when the pack fails** (PLAYTEST_REVIEW_6 fix 1). `src/game/packFallback.js` `landing()` learns
   `ep5_` (seam 5: the ep4 rule's regex widened, Emberpeak's east road end); the field never autosaves on `_testtown` or
   while a `packReturn` is pending (E4-fixes' rule; E5-pack's test proves it for an `ep5_lab_f2` save with
   `src/data/ep5/**` unreachable: the slot's map is unchanged after a map change).
7. **Additive schema.** New flags and counter `credits5_rolled`. No field is renamed or removed; an Episode 1 to 4 save
   loads unchanged. Fine Print runs (`tier_1`) never start Episode 5 (EPISODE5 10.11).
8. **Tests (node, pure, fake storage):** slot 0 occupied + empty slot 2 -> the quick start writes only slot 2 through a
   full simulated map change; all slots full -> no write at all; an Episode 4 credits fixture loads and reaches
   `ep5_morning` with `EP5_LIVE` on, and does not with it off; a Fine Print save never reaches it; `?ep=5` hidden while
   maps are unlisted; the pack-failure landing case above.

---

## 11. Build plan: waves and agent briefs

Every agent: read COMMON.md, DESIGN.md, `docs/story/EPISODE5.md`, this plan and its brief; stay in owned paths; keep
`node qa/run.mjs` green (Episodes 1 to 4 unchanged in meaning); no git; no em dashes; report under 400 words. Where an
agent needs something not yet delivered, it stubs the agreed id and says so.

**Every step leaves the game publishable:** nothing a player can reach changes until E5-integrate flips `EP5_LIVE`; the
pack is not even fetched while the switch is off, except with `?ep=5` or `?pack=ep5`.

### 11.1 The waves (up to three agents at once; paths disjoint inside each wave)

| Wave | Agent | Size | Brief | Owned paths (disjoint within the wave) | Closes with |
|---|---|---|---|---|---|
| **5a** | E5-pack | M | `E5-pack.md` | `src/data/ep5/index.js`, `src/data/ep5/start.js`, `src/data/ep5/maps.js` (the map registry), `src/data/ep5/hooks.js` (credits, quest, title, debug hooks); the core seams of 13.2 in `src/game/packs.js`, `src/game/episodes.js`, `src/scenes/title.js` (one line), `src/battle/rules.js` (the `RULE_EXT` seam), `src/game/packFallback.js` (one regex), plus the core-JS comment trims that pay for them; `tools/pwa/build_pwa.py` (`LAZY_PREFIXES`), `qa/pwa/budget_ratchet.json` (`packCapsMB.ep5` only), `qa/pwa/precache.test.mjs` (the ep5 fragment), `qa/core/ep5_*`, `qa/saves/ep5_*`, `qa/ui/ep5_*`, `docs/PWA_PACKS.md` (an "ep5 pack" section) | `node qa/run.mjs core saves ui pwa battle`; tap-prompt bytes not grown |
| 5a | E5-story | M | `E5-story.md` | `src/data/ep5/{flags,npcs,quests,text,story,ledger}.js`, `docs/story/STAGING_EP5.md`, `docs/story/EPISODE5.md` (section 9 only), `qa/content/ep5_*` | `node qa/run.mjs content` |
| 5a | E5-battle | M | `E5-battle.md` | `src/data/ep5/{enemies,encounters,items,loot,shops,skills,ai,sky}.js`, `tools/sim/ep5.mjs`, one line in `tools/sim/simulate.mjs`, `qa/battle/ep5_*`, `docs/BATTLE.md` (an "Episode 5" section) | `node qa/run.mjs battle`; `simulate.mjs --check` all five episodes |
| **5b** | E5-tiles | M | `E5-tiles.md` | `tools/art/tiles/ep5_*.py` (+ one line in `build_tiles.py`), `tools/art/tiles/out/ep5/**`, `assets/tiles/ep5.png`, `assets/tiles/ep5_tiles.json`, `tools/art/backdrops/ep5_*.py`, `assets/backdrops/ep5_*`, `src/data/ep5/pages.js` (the close-up pages), `qa/core/ep5_tiles*`, `qa/core/ep5_pages*` | sheets, mocks and pages viewed; `sync-manifest --pack ep5` |
| 5b | E5-sprites | M | `E5-sprites.md` | `tools/art/sprites/chars/ep5_*`, `tools/art/sprites/ep5_*.py` (+ one line in `build_all.py`), `assets/sprites/ep5_*`, `assets/ui/ep5_heads.*`, `qa/core/ep5_sprites*` | contact sheets viewed; `sync-manifest --pack ep5` |
| 5b | E5-world | M | `E5-world.md` | `src/data/ep5/field/**` (shade.js, events, attach, draw), `src/data/ep5/world.js` (registers the EXT types, the optional `desert_noon` tint, the test map), `tools/maps/ep5_check.mjs` (+ one line in `tools/maps/mapcheck.mjs`), `qa/world/ep5_*`, `docs/WORLD_EP5.md` | `node qa/run.mjs world`; fieldlab shots viewed |
| **5c** | E5-maps-a | M to L | `E5-maps-a.md` | `src/data/maps/ep5_ship.js`, `ep5_caravan_road.js`, `ep5_saffron.js`, `ep5_sh_inn.js`, `ep5_sh_shop.js`, `ep5_sh_smithy.js`, `ep5_sh_observatory.js`, `ep5_patches.js`, `qa/maps/ep5_a_*`, `docs/MAPS_EP5_A.md`, `tools/maps/previews/ep5_ship*`, `ep5_caravan_road*`, `ep5_saffron*`, `ep5_sh_*`, `ep4_valewyn_ep5*`, `ep4_vw_inn_ep5*` | `mapcheck check`; previews viewed |
| 5c | E5-maps-b | M to L | `E5-maps-b.md` | `src/data/maps/ep5_lab_f1.js`, `ep5_lab_f2.js`, `ep5_lab_f3.js`, `ep5_lab_oracle.js`, `qa/maps/ep5_b_*`, `docs/MAPS_EP5_B.md`, `tools/maps/previews/ep5_lab_*`, the one `EP5_MAPS_LISTED` line in `src/data/ep5/encounters.js` | same; the critical path test |
| 5c | E5-audio | S to M | `E5-audio.md` | `tools/music/songs/ep5_*.py`, `assets/audio/music/ep5_*`, `tools/audio/ep5_*` (+ one line in the generator's recipe list), `assets/audio/sfx/ep5_*`, `assets/audio/ambience/ep5_*`, `src/data/ep5/audio.js` (the manifest fragment), `docs/MUSIC.md` (an Episode 5 section), `qa/audio/ep5_*`, `qa/music/ep5_*` | renders, seams and piano rolls viewed; `node qa/run.mjs music audio` |
| **5d** | E5-scene-ui | M | `E5-scene-ui.md` | `src/data/ep5/scene.js` (prototype wrapping, the ep4 pattern), `src/data/ep5/title.js`, `qa/battlescene/ep5_*`, `qa/ui/ep5_scene*`; a core line in `src/battle/scene/**` or `src/scenes/battle.js` only if no wrap can reach it, paid by a trim in the same change | `node qa/run.mjs battlescene ui pwa`; phone shots viewed |
| 5d (after scene-ui) | E5-integrate | M | `E5-integrate.md` | `qa/autoplay.py` (an Episode 5 segment), `qa/autoplay_grid.mjs`, `qa/integrate/ep5_*`, `qa/integrate/story_time.py` (Episode 5 input and the shade weighting), `qa/shots.json` (append only), the `EP5_LIVE` line, seam fixes in files whose owner's brief is closed | the full gate list (12) |
| **5e** | E5-review | S to M | `E5-review.md` | `docs/CRITIQUE_7.md`, `docs/PLAYTEST_REVIEW_7.md`, `qa/out/review7/**` | read-only |
| 5e (after the review) | E5-fixes | M | written by the orchestrator from the review | per the list | the full gate list again |

Agent count: 11 build agents and 1 read-only reviewer (12 overnight sittings), then 1 fix pass. Never more than three at
once. (Episode 4 used two reviewers; one reviewer who covers art and play saves a sitting, and Episode 4's two reviews
overlapped on half their findings.)

### 11.2 Disjointness check, by shared file

| Shared file or folder | Who touches it, in which wave | Why it is safe |
|---|---|---|
| `src/data/ep5/index.js` | E5-pack (5a) only | the entry imports the other modules behind a missing-module guard, so every other agent plugs in by exporting `register()` |
| `src/data/ep5/maps.js` | E5-pack (5a) writes the guarded list of all 11 map module names plus the patches | 5c's map agents only create files the list already names |
| `src/data/ep5/encounters.js` | E5-battle (5a); E5-maps-b (5c) edits one line (`EP5_MAPS_LISTED`) | different waves |
| `src/data/ep5/sky.js` | E5-battle (5a) only | E5-pack's `RULE_EXT` seam calls whatever the pack registers |
| `src/data/ep5/pages.js` | E5-tiles (5b) only | E5-story (5a) calls the kinds by name behind a `PAGE_KINDS[kind]` guard (narration fallback until 5b lands) |
| `src/data/ep5/{scene,title}.js` | E5-scene-ui (5d) only; E5-pack's hook (5a) imports `title.js` guarded | different waves |
| `src/data/ep5/{flags,npcs,quests,text,story,ledger}.js` | E5-story (5a) only | |
| `src/data/ep5/field/**`, `world.js` | E5-world (5b) only | |
| `src/data/ep5/audio.js` | E5-audio (5c) only | |
| core seams (`packs.js`, `episodes.js`, `title.js`, `rules.js`, `packFallback.js`) | E5-pack (5a) only | E5-battle writes `sky.js` against the seam and reruns its sim after E5-pack reports; no other 5a agent opens a core file |
| `src/battle/scene/**`, `src/scenes/battle.js` | E5-scene-ui (5d) only, and only if a wrap cannot reach | |
| `tools/sim/simulate.mjs` | E5-battle (5a), one line | |
| `tools/maps/mapcheck.mjs` | E5-world (5b), one line | 5c map agents run it, do not edit it |
| `assets/tiles/**`, `assets/backdrops/**` | E5-tiles (5b) only (ep5-prefixed files) | fragments, never `tiles.json` |
| `assets/sprites/**`, `assets/ui/ep5_heads.*` | E5-sprites (5b) only (ep5-prefixed files) | pack atlases merge at runtime; base files untouched |
| `assets/ep5_manifest.json` | written by `node qa/core/sync-manifest.mjs --pack ep5`, run by E5-tiles and E5-sprites in 5b | a generated file; the orchestrator reruns it at wave close |
| `assets/audio/manifest.json` | **nobody** | Episode 5 audio rides the pack fragment (13.3) |
| `src/data/maps/ep4_*.js`, `src/data/ep4/**` | **nobody** | Episode 5 patches registered maps from its own `ep5_patches.js` |
| `docs/MAPS.md`, `docs/WORLD.md` | nobody | Episode 5 writes `MAPS_EP5_A.md`, `MAPS_EP5_B.md`, `WORLD_EP5.md` |
| `qa/shots.json`, `qa/autoplay.py` | E5-integrate (5d) only | |
| `PLAN.md`, `PROGRESS.md` | the orchestrator only | agents send paragraphs in their reports |

Never beside each other: E5-integrate runs alone (it touches seam files of closed briefs); E5-review never runs beside
E5-fixes.

### 11.3 Wave close (orchestrator checklist, each wave)

`node qa/core/sync-manifest.mjs --pack ep5`; `python tools/pwa/build_pwa.py`; `node qa/run.mjs pwa core`; view every
image the wave's reports name; commit on the build branch with the orchestrator's message; push the branch and update the
pull request into `overhaul` (PR only, never a direct push, never `main`).

---

## 12. Acceptance and QA (the full gate list)

- `node qa/run.mjs` green; Episode 1 to 4 suites unchanged in meaning (rerun a flaky timeout alone before treating it as
  real: `x1_gate`, `x1_wild`, `walks`, `abilities_walks`, `qa/battle/sim.test.mjs`).
- `node qa/run-gate.cjs` (the root game) green.
- `node tools/sim/simulate.mjs --check`: "All targets met" for Episode 1, Whisperwood Hollow, Episodes 2, 3, 4 and 5;
  `--cave --check` and `--tier 1 --check` unchanged.
- `node tools/maps/mapcheck.mjs check` clean; previews of the 11 new maps and the two patched maps viewed, in
  `MAPS_EP5_A.md` / `MAPS_EP5_B.md`, including a `_dawn`, `_noon` and `_dusk` variant of the road, F1 and F2, and F3 with
  its lamps at start and solved.
- **Autoplay route.** `qa/autoplay.py --episode 5` plays from an Episode 4 credits save and from `newGameEp5`: the inn,
  the berth, the deck (Bram's choice, the first fight), the road (dawn, walk the flat; noon for the island chest; rest),
  the Haven (Sel, the tower at night, the gate), F1 (B: dawn, dusk; C: Shove, dawn; D: dawn, noon; E: dawn for the key),
  F2 (B; D; the Knight on Auto), F3 (three landings; Shove the lamps and stone), the Oracle on Auto (Turn the Sky used by
  the competent policy, and the bot records each prophecy and how it was answered), the ending, credits, the wake at the
  Dune Lantern Rest. No softlock, the Oracle beaten at Lv 24, zero game overs, desktop and phone, one device at a time;
  dial and Shove inputs from the map agents' reported solutions; the quick start never wrote a slot it did not own
  (asserted by reading localStorage back); **zero "unknown ... id" warnings in either run** (asserted).
- Story timer (`qa/integrate/story_time.py` on the Episode 5 logs, a shade puzzle counted by decisions: one per hour
  chosen and one per Shove sequence, never per click): first play 60 to 90 minutes; first fight under 5 minutes after
  `ep5_morning`; no main scene over its box budget.
- **Shots** (append to `qa/shots.json`; zero console errors; desktop 1920x1080 and phone 844x390):
  `story_ep5_morning_letter`, `story_ship_bram`, `battle_ship_first_night`, `battle_sky_turn`,
  `field_ep5_glass_flat_noon`, `field_ep5_glass_flat_dawn`, `field_ep5_saffron_dusk`, `story_star_reading`,
  `field_ep5_lab_f1_shove`, `field_ep5_lab_f2_shafts`, `story_vex_gallery`, `battle_mirage_knight`,
  `field_ep5_lab_f3_lamps`, `story_sel_memory_3_page`, `battle_oracle_prophecy`, `battle_oracle_futures`,
  `story_oracle_after_chart`, `story_every_road`, `story_ep5_ending`, `ui_title_ep5`.
- Performance: field logic under 3 ms, an hour change under 1 ms of recompute, the sweep and the F3 lamp pools under 1 ms
  of draw, 60 fps on the phone profile.
- Text: no em dashes (grep U+2014 over `next/`), every box within 3 x 42, ASCII only, no keyboard glyph on touch.
- Readability: every shade puzzle solvable by a first-time player without Talk; the dial's hour and every plate's state
  readable at rest on the phone; running against firm sand readable across the screen; the sky marker, badges and Exposed
  shields at least 0.15 luma above their box; F3 mean luma at or below F2's; Talk always names the next step, including
  after `ep5_complete`.
- Saves: section 10's tests; an Episode 5 save made mid-Labyrinth reloads with latched plates and opened doors, with every
  floor at its start hour and every stone and lamp at its authored cell.
- **Budget** (13): `qa/pwa/precache.test.mjs` green, the tap-prompt bytes at or below the measure E5-pack records first,
  the initial download not grown by Episode 5, the `ep5` pack under its cap; `python qa/pwa/pwa.py --only packoffline`
  with `?pack=ep4,ep5` brings both packs up offline after one visit.
- Shipping is not part of the gate list: E5-integrate flips `EP5_LIVE` on the branch only; shipping (`overhaul:main`)
  stays Scott's or Stephen's explicit word.

---

## 13. The budget rule and the pack

### 13.1 Why everything is in the pack

The first download's load before the tap prompt is held by `qa/pwa/budget_ratchet.json` (`tapPromptMB` 2.34, never
raised; Scott's cap 2.5) and the initial download by `initialMB` 6.38 (cap 6.5) (Fact, read 2026-11-08). On 2026-11-03
E4-pack left the pre-tap load at 2,446,134 wire bytes (Fact, `docs/PWA_PACKS.md`); later Episode 4 fixes and polish have
moved it since, so **E5-pack measures first** (`node qa/integrate/x1_budget.mjs`, the precache test's wire measure) and
treats whatever room it finds as zero. The rule: Episode 5 adds **no net bytes** to the pre-tap load and **no bytes** to
the initial download.

- Every file of Episode 5 is a pack file: `src/data/ep5/**` (code and data, including the field code under
  `src/data/ep5/field/`), `src/data/maps/ep5_*.js`, `assets/{tiles,sprites,ui,backdrops}/ep5_*` and `assets/tiles/ep5.png`,
  `assets/ep5_manifest.json`. `build_pwa.py`'s `pack_of` keeps them out of the precache and the modulepreload block (with
  prefix `ep5_`).
- No `src/data/ep5/live.js`: the switch lives in `episodes.js` (the ep4 precedent), so nothing of the pack is precached.
- Sound files `assets/audio/sfx/ep5_*` and `assets/audio/ambience/ep5_*` are added to `LAZY_PREFIXES` so they are
  runtime-cached instead of precached. Music is lazy already.
- **Any core-file change must be paid for by trimming core JS in the same pull request** (comments and dead code in
  precached `src/` files, never behavior), and the report gives the gzipped before/after of the pre-tap load.

### 13.2 The core seams (E5-pack owns all of them; budget about 450 gzipped bytes in, at least as many trimmed out)

| # | File | Change | Why |
|---|---|---|---|
| 1 | `src/game/packs.js` | add `ep5: { entry: '../data/ep5/index.js', prefix: 'ep5_', assets: 'assets/ep5_manifest.json', audioPack: 'ep5', hard: true, touches: ['ep4_vw_inn', 'ep4_valewyn'], wanted: (f) => !!(f.ep4_complete \|\| f.ep5_started), enabled: () => EP5_LIVE }` | the pack itself (the engine is already passed to `register(engine)`) |
| 2 | `src/game/episodes.js` | `export const EP5_LIVE = false;` | the switch |
| 3 | `src/scenes/title.js` | the Episode 4 hook line generalized to Episodes 4 and 5 (or one more line beside it): when `EP5_LIVE` and a slot has `ep4_complete`, or `?ep=5`, `ensurePack('ep4')` then `ensurePack('ep5')`, then `globalThis.LQ_EP5 && LQ_EP5.title(this)` | the row, picker and name entry live in the pack (`src/data/ep5/title.js`) |
| 4 | `src/battle/rules.js` | `export const RULE_EXT = []`; three call points: after setup `for (const h of RULE_EXT) h.start && h.start(ctx)`; at the end of each turn (`endTurn`) `h.afterAction && h.afterAction(ctx, actor)`; in the type check, a target with `exposed` set counts every type of the hit as a weakness for that hit only (no `learnTypes`); Ascendant rides the existing `addMod` (if `addMod` cannot be cleared by source, one more call point `h.mod` in the stat read) | the Turning Sky as pack code; generic enough for later episodes |
| 5 | `src/game/packFallback.js` | the `ep4_` landing regex becomes `ep[45]_` | an Episode 5 save never lands on Test Town (PLAYTEST_REVIEW_6 fix 1) |

Already exported and mutable, so not seams (Fact, grepped 2026-11-08): `registerStory`, `prependTalk`, `FLAG_IDS`,
`ALL_SIDE_QUESTS`, `LEDGER`, `PLACES`, `REACHED`, `TINTS`, `EXT`, `CREDITS_HANDOFF`, `QUEST_EXT`, `ENEMIES`, `ITEMS`,
`SKILLS`, `ENCOUNTERS`, `ZONES`, `ZONE_LOOT`, `SHOPS`, `NPCS`, `BANNERS`, `BOOKS`, `BARKS`, `BESTIARY`, `SPEAKER_NAMES`,
`SCRIPTS`, `POLICY_EXT` (`src/battle/ai.js`), `BACKDROPS`, `BOSS_CARD` (`src/scenes/battle.js`), `SIGNATURE_TECHS`
(`src/battle/scene/menu.js`), `PIPS` (`src/battle/scene/hud.js`), `PAGE_KINDS` (`src/world/closeup.js`), `RARE_NAME_EXT`
(`src/battle/loot.js`), the `Planner` and `Actor` classes (prototype wrapping, as `src/data/ep4/scene.js` does) and
`engine.audio.manifest`. The field mechanic attaches itself from inside its own `EXT.sundial.create` (idempotent per
field), so **`src/scenes/field.js` is not edited**.

### 13.3 Audio through the pack

`src/data/ep5/audio.js` exports `{ music, sfx, ambience, jingles, pack }` in the `assets/audio/manifest.json` entry shape
(srcs `assets/audio/music/ep5_*.mp3`, `assets/audio/sfx/ep5_*.wav`, loop points, volumes, `pack: 'ep5'`). The entry
merges it into `engine.audio.manifest` (never overwriting an id) before `ensurePack` calls `audio.loadPack('ep5')`, **on
every path that brings the pack up, the quick start included** (a test asserts the ids resolve after `newGameEp5`).
`qa/pwa/precache.test.mjs` resolves sfx ids named under `src/data/ep5/` against the fragment (E5-pack). The main audio
manifest file is never edited.

### 13.4 Pack cap

`packCapsMB.ep5 = 1.0` (wire) in `budget_ratchet.json`; `qa/pwa/packs.test.mjs` asserts it. Expected: code and data about
0.27 MB, tiles, backdrops and pages about 0.35, sprites about 0.3.

---

## 14. Risks, assumptions and decisions

**Assumptions.**
1. The Oracle is a Keeper construct and the fifth fragment a star chart; the desert list is twenty years old and the
   hero's name was added a week ago (EPISODE5 section 8).
2. Three tracker tracks are within the pipeline's proven range (Episodes 3 and 4 shipped eight).
3. The Turning Sky fits on one `rules.js` seam with three call points. If the type-check hook cannot be made without
   touching the bestiary's learning, E5-battle falls back to "every hit on an Exposed foe chips one shield, no damage
   bonus" (a shield-only hook) and says so.
4. The field mechanic attaches without editing `field.js` (EXT create hook, as tide locks did). If a draw hook is
   missing, E5-world wraps the field method the way `src/world/ep3/index.js` does, and asks for one line only as a last
   resort.
5. Episode 4 is shipped or at least merged in `overhaul` when Episode 5 builds (Episode 5 patches its maps and reuses its
   pack skeleton and fixes).

**Risks.**
- **Three chained packs** (ep3 for Emberpeak, ep4 for Valewyn, ep5): a cold first entry could wait on all three. E5-pack
  starts every fetch at once and orders only registration, and measures the worst case on the phone profile.
- **The order trap** (3.3): registering the patched Valewyn maps before the ep4 pack loses the patch silently. A test
  covers both orders.
- **The pre-tap budget.** Every seam must be paid in the same PR; the orchestrator rejects a report without the gzipped
  numbers.
- **The sky rule could swing fights** (an Exposed foe falls fast; an Ascendant one hits hard). Mitigation: the sim's three
  knobs in 6.6, and every ordinary group but the first mixes sides or is beatable under either sky.
- **"Another dial."** Sun and shade could read as tide locks again. Mitigation: the hour is chosen by name, the puzzles
  are about where casters stand (Shove from F1 C on), the rule inverts indoors and again in the Well; E5-review checks it.
- **Mira's MP economy** in the Oracle fight (the Episode 4 MP trap, PLAYTEST_REVIEW_6 section 4): Turn the Sky costs 12;
  the Fear add hushes Mira. Mitigation: a one-time hint when Mira drops under 12 MP in a fight with a foretelling ("Keep
  something back to turn the sky."), and Auto keeps 24 MP.
- Pacing: 18 fights, about 200 boxes, the timer gate, the cut lines.
- Parallel waves: 5a's E5-battle depends on E5-pack's `RULE_EXT` in the same wave; it writes `sky.js` and its tests
  first and runs its final `--check` after E5-pack reports. If E5-pack slips, E5-battle reports the sim as pending.

**Cut lines, if the budget tightens** (each keeps a complete story):
- Cut 1: drop Hassan's Bells (the Mara seed moves to one line of Hassan's talk) and the road's Dash chest.
- Cut 2: drop the F2 reliquary and the sky's field link (every fight starts in Day); `labyrinth` falls back to `court`.
- Cut 3: merge F2 into F1 (Vex and the Mirage Knight move to F1's far court; `sel_memory_2` with them) for a two-floor
  Labyrinth plus the Well.

**Open for Scott and Stephen** (none blocks the build; defaults in brackets; full list with reasons in EPISODE5.md
section 10): Mira's episode with Sel as a guest [yes]; the prophecy names the hero [yes]; Vex hid the star and gives the
list ["asked me to keep you", asker unnamed]; the warm hand is a Keeper's [one line]; Ishra lost, Tamir returns [yes];
Hassan's Mara seed [one line]; the canon renames [as listed]; two truth choices [yes]; the Episode 5 card [keep]; the
Episode 6 card [placeholder]; Fine Print does not enter Episode 5 [base game only]; Sel without a portrait [yes]; optional
paid items [none]; shipping [Scott's or Stephen's word].
