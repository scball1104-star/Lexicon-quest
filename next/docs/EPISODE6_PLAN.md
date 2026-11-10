# Episode 6 production plan: The Skybound Isles

Owner: ep6-designer, Monday 2026-11-09 (Eastern), branch `scott/ep6-design`. Status: **PROPOSAL, docs only, nothing
built.** Story bible: `docs/story/EPISODE6.md`. When Scott and Stephen approve, this file is the contract the build agents
work from. Every build agent reads the repo's `AGENTS.md`, `docs/briefs/COMMON.md`, `DESIGN.md`, `docs/story/EPISODE6.md`,
this file and its own brief in `docs/briefs/E6-*.md`, in that order. House rules as always: no em dashes, no git, stay in
your owned paths, bound every command, keep every file's line endings (LF in this worktree, `core.autocrlf=false`), look at
your own output.

**Usage guard.** The push runs up to three agents at once, in the waves of section 11, with disjoint owned paths inside
every wave. The orchestrator checks weekly usage before each wave: under 75%, launch the wave; 75 to 85%, run its agents
one at a time; over 85%, stop and leave the branch publishable (Scott's standing guard: one agent at a time is the
default when usage is tight, his business loops come first). Each agent is sized to finish in one sitting: 11 build
sittings and 1 review sitting, about 12 overnight, with a fix pass the next day.

**Resource rule.** Art is made in code or cut from painted source sheets the game owns and has not used (section 9),
through the existing pipelines in `tools/art/**`. Music comes from the in-repo tracker (`tools/music`) or reuses existing
tracks; SFX from the existing generator (`tools/audio`). **No new Suno or Runway generations** in the build: section 9.5
lists the optional paid items with their cost, for Scott to approve and make himself.

---

## 0. Summary

**What gets built.** One climb (the Airstair, a sea stack under the skyport, from Saffron Haven's water stairs by Yara's
ship), one town with four interiors (Zephyr Landing), one three-floor dungeon plus a boss deck (the Storm Observatory and
the Scribe's Eyrie), one small ending map (the Cloud Library), one new field mechanic (**gust lanes**: streams of wind
between islands that carry the party along their arrows until something stops them; mooring posts stop a ride on the
lane; weathervanes turn one group of lanes; nothing is global and nothing has a timer), one battle rule (**the Gale**:
every isle battle has a Gust that falls every 5 actions at a marker on the timeline; Aloft foes ride it and come round
sooner, and every unit that did not brace is blown back), one new party skill (Bram's **Anchor**), one mini-boss (the Gale
Engine), one three-phase boss with Bram at its center (the Storm Scribe, with the False Beacon and the Broken Compass), 7
ordinary enemies, 3 new tracker tracks plus reused ones, 9 SFX and 2 ambiences, about 32 scenes, 3 side stories, and the
save rule carried over: no Episode 6 path ever writes a save slot that holds another run. Target 60 to 90 minutes
(planned at 75), party Lv 25 to 28.

**Everything is in the lazy `ep6` pack**, exactly Episode 5's rule: `src/data/ep6/**`, `src/data/maps/ep6_*.js`,
`assets/*/ep6_*`, `assets/tiles/ep6.png`, `assets/audio/{music,sfx,ambience}/ep6_*`, registered by mutation
(`registerStory`, `prependTalk`, `FLAG_IDS.push`, `ENEMIES`, `ITEMS`, `SKILLS`, `SCRIPTS`, `POLICY_EXT`, `BACKDROPS`,
`SIGNATURE_TECHS`, `PAGE_KINDS`, `RULE_EXT`, `EXT`, `TINTS`). Core changes are four one-line seams (section 13.2), and
every core byte they add is paid for by trimming core JS in the same change.

**What is reused (most of it).** The engine, field scene, cutscene API and `closeup` page inserts (`PAGE_KINDS`), the
event vocabulary (doors, boat doors, gates, flag gates, overlays with `if`/`ifNot`, push blocks, fonts, save bells,
chests, lights, Keeper mirrors), the pack system and its atlas merge, Episode 5's whole pack skeleton (`index.js` order,
`maps.js` order-trap pattern, `hooks.js`, `start.js`, `title.js`, the audio fragment, `scene.js` prototype wrapping, the
field system's attach-from-`EXT.create` pattern and its collision override on `map.base`, the timeline marker drawing),
Episode 3's per-run autosave and `pickRunSlot`, Episode 4's `reveal()` camera pan, W9's Shove and Dash Strike, the
Lantern, the battle rules (CTB, Break, Fury, combos, telegraphs and `charge`, phases, summons, HP locks, `cover`, Defend,
`delayUnit`), `RULE_EXT` (Episode 5's seam: `start`, `afterAction`), `SCRIPTS`, `POLICY_EXT`, `SIGNATURE_TECHS`, `learn:
{ flag }`, the simulator, the map kit, `mapcheck`, the preview renderer, the NPC paper-doll builder, the enemy recolor
pipeline, the backdrop builder, the tracker and SFX generator, every jingle, the core sfx `thunder` and ambience
`wind_valley`, and the tracks `mystery`, `high_moor`, `sorrow`, `triumph`, `battle`, `victory`, `gameover`, `saffron`
(Act I, the ep5 fragment). Painted source art the game has never shipped: `environments.webp` cell 5 (floating islands, a
small airship, bridges over sunlit clouds), `bosses.webp` cell 5 (the Storm Scribe).

**What is genuinely new.** Gust lanes (the pure `wind.js` carry rule, mooring posts, vanes, the lane drawing and the
carry animation), the Gale (`gale.js` on the existing `RULE_EXT`), Anchor, an `ep6` tile sheet (the Airstair kit, the
Zephyr Landing kit, three Observatory floor kits, the cloudbank and the A1 gust lane), 9 NPC specs, 7 enemy recolors, the
Gale Engine, the Scribe's three looks and avatar, the False Beacon and the Broken Compass, 1 portrait crop, 4 close-up
page kinds, 3 tracks, 9 SFX, 2 ambiences, the whole `src/data/ep6/` pack, the Episode 6 quick start and its title row.

**Waves (section 11; up to three at once, disjoint paths).**
- **6a** foundations: E6-pack, E6-story, E6-battle.
- **6b** art and field: E6-tiles, E6-sprites, E6-world.
- **6c** maps and sound: E6-maps-a, E6-maps-b, E6-audio.
- **6d** assembly: E6-scene-ui, then E6-integrate (flips `EP6_LIVE` on the branch after the full gate list).
- **6e** review: E6-review (one read-only reviewer, art and play), then E6-fixes (written from the review).

**Done means.** A save that finished Episode 5 plays Episode 6 to its credits with no softlock; so does the `newGameEp6`
quick start, without touching any other run's save and with every Episode 6 sound present; the autoplay bot beats the
Storm Scribe at Lv 27 with zero game overs on desktop and phone; `node qa/run.mjs` green with Episodes 1 to 5 untouched in
meaning; `simulate.mjs --check` prints "All targets met" for all six episodes (and `--cave --check`, `--tier 1 --check`
unchanged); the timed story read lands at 60 to 90 minutes; every new map preview viewed; shots with zero console errors;
**Anchor cast with real keys and a real tap** (section 12); the tap-prompt load does not grow (section 13).

### 0.1 Lessons carried in from Episode 5's reviews (CRITIQUE_7, PLAYTEST_REVIEW_7) and its build

| Episode 5 problem | Where Episode 6 answers it |
|---|---|
| Turn the Sky could not be cast from the menu; every bot passed because `LQ_DEBUG.battleAct` closes the menu itself (PLAYTEST_REVIEW_7 item 1, the blocker) | 6.3 and 12: Anchor is `target: 'none'`; a scene test `ep6_menu_cast` casts it through `menu.js` (not `battleAct`), and `qa/realplay/ep6battle.py` casts it with real keys and a touch tap. `menu.js startTarget` must accept every target kind Episode 6 adds (E6-scene-ui checks; E6 adds none by default) |
| A reading could land with no Mira turn before it (item 2) | 6.3: a Rewrite is pinned only at exactly 2 actions out, and the Gust holds until Bram has had a turn after the pin (`holdForBram`, the `holdForMira` pattern); "Bram can anchor." shows only when he can act first |
| The Day stage was the night stage brightened (CRITIQUE_7 item 1) | 9.3: the storm grade and the clear grade are two recipes, measured; lightning is a separate soft layer, never a brightened copy |
| The Futures stood on the party's side; Fear's row over the hero (item 2) | 6.5: the Beacon and the Compass take front-row foe slots beside the Scribe, rows under their own feet, in the row-placement test from wave 6a |
| Shade read as a carpet on paving (item 3) | 5.1: lanes are drawn as moving streaks with chevrons over cloud, never a flat tint; off lanes are plain cloud; contrast measured on the phone crop |
| The deck too dark to read the party (item 4) | 4.1: the Airstair is a day map; F3 is the dark one, and its party floor stays at or above luma 0.22 on the phone |
| The town did not read as itself (item 5) | 4.2: Zephyr Landing is built around one image (the board plaza with the islands and the storm on the skyline) and checked on the 844x390 crop |
| Dawn and noon looked the same (item 6) | 5.1: Episode 6 has no hours; a vane's two states differ by the lane's chevrons and colour, both readable at rest |
| "Keep this one." shown two beats early (item 7) | EPISODE6 scene 30: the first page opens in three page modes, the line last |
| Vex a pale ghost, standing, party one row under him (item 8) | 4.6 and 4.7: `vex_trig` and `vex_falls` stop the party two rows below; Vex opaque; no foe path crosses the staging cells |
| A stair hidden under the stones' sprites (item 9) | 5.1: moorings and vanes draw below the lane chevrons where they overlap; no prop covers a lane's landing cell |
| Turn the Sky had no menu icon (item 10) | 6.3: Anchor gets a 12 x 12 anchor icon on its Tech row from wave 6d |
| The Oracle met at Lv 25 by an Episode 4 save; bot levels inflated by reload-revived floor foes (PLAYTEST_REVIEW_7 item 3, BATTLE 13.7) | 6.1: the arrival band is 25 to 26; the sim checks the Scribe at 27 and 28; `qa/autoplay.py --all-fights` hunts each placed foe once (foes back after a reload are not hunted), and E6-integrate records the real arrival level from an Episode 5 credits save |
| Mira's MP before the Eye depended on Ethers (item 4) | 4.7: F3 has a font on the first landing and the beacon platform is a rest and save point once lit |
| A Talk list showed two old hints under the new step (item 10) | 5.3: `epilogue5` Talk names only the Episode 6 step while `EP6_LIVE` |
| The generated `assets/ep5_manifest.json` was left unstaged at a wave close | 11.3: `git add next/assets/ep6_manifest.json` is a line of the orchestrator's wave-close checklist |
| `ep4_shots.py`-style generators rewrote `qa/shots.json` with CRLF | 12: `qa/integrate/ep6_shots.py` writes LF and E6-integrate counts CR bytes before and after (zero) |
| Runway-painted pack stages leave `backdropLayer.painted` false | 9.3 and the E6-scene-ui brief: a painted stage test waits on `usedAsset`, never on `painted` |

---

## 1. Scope at a glance

| Thing | Count | Reused | New work |
|---|---|---|---|
| Maps | 11 new + 2 patches | interiors copied from Willowmere's and re-dressed; map kit, preview, mapcheck | `ep6_airstair`, `ep6_zephyr`, 4 `ep6_zl_*` interiors, `ep6_obs_f1/f2/f3`, `ep6_obs_eyrie`, `ep6_library`; pack patches of `ep5_sh_inn` (wake trigger) and `ep5_saffron` (Yara's berth) |
| Field mechanics | 1 new (gust lanes) | overlays, flag gates, Shove, lights, `reveal()`, EXT, the ep5 attach pattern | vane and mooring events; a pure `wind.js`; the `wind` map block |
| Story scenes | about 32 + side scenes (under 40 built) | cutscene API, guards, Talk, journal, barks, vignette tint, `registerStory`, `closeup`, speaker swap | `src/data/ep6/story.js`, `STAGING_EP6.md` |
| NPCs | 8 new + Pippa + memory actors + returns | paper-doll builder, `prependTalk`, speaker swap | specs, talk tables |
| Enemies | 7 ordinary + mini-boss + boss + 2 adds | rules, ai `basic`/`phased`, `charge`, HP locks, `cover`, `delayUnit` | the `wind` field on each foe, ai `gale_engine`, ai `scribe` |
| Battle rule | 1 (the Gale) | CTB timeline, Defend, Break, telegraphs, `RULE_EXT` | `src/data/ep6/gale.js` |
| Party skills | 1 | skills.js shape, `learn: { flag }`, `SIGNATURE_TECHS`, the `keep` bridge | Anchor |
| Items | 1 consumable, 9 key items, 16 bases, 8 uniques, 1 set | items.js, loot.js, rarity, affixes | tier 11 and 12 gear, affix tier 8 |
| Shops | 3 new | shops.js, shop scene | stock lists |
| Music | 3 new, 8 reused | tracker pipeline, name motif | `zephyr`, `storm_observatory`, `boss_scribe` |
| SFX / ambience | 9 / 2 | generator | section 8.4 |
| Tiles | 1 new sheet | autotile, wall systems, the ep5 kit approach | `ep6.png` + `ep6_tiles.json` |
| Sprites | about 30 frame sets | recolor and derive pipelines, pack atlas merge | NPCs, 7 recolors, the Engine, the Beacon and the Compass, the Scribe x3, avatar |
| Portraits | 1 crop | portrait pipeline | `scribe` (crop); Aeris none by default (9.5) |
| Backdrops | 5 + key art | backdrop builder (environments cell 5), the compose approach | section 9.3 |
| Close-ups | 4 page kinds, 9 modes | `PAGE_KINDS`, the EP5 pages approach | `ep6_slip`, `ep6_manifest`, `ep6_letter`, `ep6_page` |

---

## 2. Id registry (the contract)

Every id below was grepped against `src/`, `assets/manifest.json`, `assets/audio/manifest.json` and
`assets/tiles/tiles.json` on 2026-11-09: no collisions. Collisions found and avoided: `anchor` (a layout key in
`src/ui/dialog.js`, `src/world/fieldart.js` and three pack title modules, so the skill is `anchor_line`), `updraft` (the
Ash Specter's phase id in `src/data/enemies.js`), `oath_*` (Episode 3; the spire's landings are `pledge_*`), `orrery*`
(X1), `sky_turn*`, `sky_learned`, `turn_sky`, `caravan_compass`, `landing_*` (Episode 5), `testimony_*` of Episodes 2 to 5,
`thunder` (a core sfx: reused, never redefined), `wind_valley` (a core ambience: the fallback). **Prefixes:** maps and
zones `ep6_` (the pack rule needs it); encounters `e6a_` (Airstair), `e6o1_`, `e6o2_`, `e6o3_` (Observatory floors); art
`ep6_`; sfx and ambience `ep6_` file names. Never a bare `zephyr` map id (it is the music id), never `zl_` alone (always
`ep6_zl_`), never `obs_` alone as a map id. E6-battle and E6-story regrep every new id before use (the item, unique and
affix names of section 7 above all).

### 2.1 Maps

| id | Banner (title / sub) | area | size | tileset | music | ambience | lighting |
|---|---|---|---|---|---|---|---|
| `ep6_airstair` | The Airstair / Up to Zephyr Landing | field | 26 x 46 | town + `ep6` kit | `high_moor` | `sky_wind` | none (clear day); sea spray particles at the foot |
| `ep6_zephyr` | Zephyr Landing / The Windward Docks; after `isles_restored`: Zephyr Landing / The Sky Remembers | town | 46 x 34 | town + `ep6` kit | `zephyr` | `sky_wind` | none; scenes set `dusk` and `night` |
| `ep6_zl_inn` | The Cloudhouse Inn | interior | as `inn` | interior | town | none | none |
| `ep6_zl_shop` | Aeris Flight Provisions | interior | as `item_shop` | interior | town | none | none |
| `ep6_zl_workshop` | The Galewing Workshop | interior | as `smithy` | interior | town | none | none |
| `ep6_zl_charts` | The Chart Room | interior | as `chapel` | interior | `mystery` (0.6) | none | none |
| `ep6_obs_f1` | The Storm Observatory / I. The Windward Causeways | dungeon | 42 x 30 | `ep6` | `storm_observatory` | `sky_wind` | none, a pale storm tint at the east edge only |
| `ep6_obs_f2` | The Storm Observatory / II. The Hall of Broken Signals | dungeon | 40 x 30 | `ep6` | `storm_observatory` | `storm_rumble` | dark 0.35, lamp pools on the relays |
| `ep6_obs_f3` | The Storm Observatory / III. The Eye of the Storm | dungeon | 36 x 40 | `ep6` | `mystery` | `storm_rumble` | tint `storm` (pack), dark 0.5, signal lamps as light pools |
| `ep6_obs_eyrie` | The Scribe's Eyrie | dungeon | 24 x 20 | `ep6` | none until the scene | `storm_rumble` | tint `storm`, dark 0.3 |
| `ep6_library` | The Cloud Library / Above the Storm | interior | 20 x 16 | `ep6` | none until the scene | `sky_wind` (0.4) | none (bright) |

Patches (pack-side, never edits to `src/data/maps/ep5_*.js`): `ep5_sh_inn` gains the `ep6_morning` enter trigger;
`ep5_saffron` gains Yara's berth at the water stairs (section 3).

### 2.2 Story flags (all pushed onto `FLAG_IDS` and declared in the pack's `flags.js` with a one-line meaning)

Main: `ep6_started`, `ep6_boarded`, `airstair_arrived`, `airstair_fight_done`, `zephyr_arrived`, `met_aeris`,
`charts_seen`, `anchor_learned`, `windward_pass`, `obs_entered`, `obs_f1_done`, `vex_relay_met`, `engine_defeated`
(encounter flag), `obs_f2_done`, `aeris_came`, `vex_held`, `asker_known`, `pippa_found`, `scribe_door_open`,
`scribe_defeated` (encounter flag), `wind_script_restored`, `fragment6_get`, `compass_restored`, `library_reached`,
`first_page_read`, `isles_restored`, `pippa_home`, `ep6_complete`.

Beats and world state: `ep6_morning_done`, `mira_asked` (set by `mira_asks` on either answer), `mira_told`, `mira_spared`,
`saw_gust`, `saw_isles`, `liora_met`, `obs_f1_arrived`, `obs_f2_arrived`, `obs_f3_arrived`, `aeris_memory_1`,
`aeris_memory_2`, `pledge_anchor`, `pledge_listen`, `pledge_return`, `compass_key_found` (chest flag), `sixth_list_get`,
`told_aeris`, `kept_from_aeris`.

Side: the Beacon `beacon_started`, `testimony_liora`, `testimony_bennet`, `testimony_suri`, `beacon_lit`, `beacon_done`;
the Locker `log_1_found`, `log_2_found`, `log_3_found` (chest flags), `locker_found`; the Dead Letters `letters_started`,
`letter_1_found`, `letter_2_found`, `letter_3_found` (chest flags), `letters_done`, `white_road_letter_get`. Counter (not a
flag): `credits6_rolled`. Vanes, lanes and moorings carry no flag (they reset on every arrival: 5.1).

### 2.3 Key items (the pack's `items.js`, merged into `KEY_ITEMS`)

| id | name | icon | desc |
|---|---|---|---|
| `boarding_slip` | The Boarding Slip | letter | Zephyr Landing to the Storm Observatory. Four seats. The fourth name is a burn. |
| `windward_pass` | Windward Pass | key | A brass token. Opens the Storm Observatory's gate. |
| `sky_compass` | The Sky Compass | key (reuse) | Name a thing and it points to it. Spinning (until `compass_restored`); then steady. One id, two descs by flag. |
| `compass_key` | Sky Compass Key | key | A brass key cut like a compass rose. Opens the Sky Compass Keyhole. |
| `sixth_list` | The Sixth List | letter | Cheap paper, the cold hand, the empty-book seal. No names. THE FIRST PAGE. |
| `liora_letter` | Liora's Letter | letter | A letter to her sister. The name on it barely stays. |
| `dead_letter` | Dead Letter (counted, 3) | letter (reuse) | A letter blown out of Piri's sack. |
| `white_road_letter` | A Letter for Willowmere | letter | Old, northbound, never delivered. Addressed to Willowmere from the White Road. |
| `name_fragment_6` | Sixth Name Fragment | book | The Wind Script: every name of the realm, a line on the wind. |

The first page is story state (`first_page_read`) and stays with Vex (EPISODE6 choice 5): not an inventory item.

### 2.4 Enemies, encounters, zones (section 6)

Enemies: `gale_sprite`, `signal_wraith`, `squall_wolf`, `rigger_beetle`, `storm_harrier`, `lightning_manta`,
`storm_page`, `gale_engine`, `scribe`, `false_beacon`, `broken_compass`. Encounters: `e6a_first`, `e6a_wolves`,
`e6a_mixed`, `e6o1_sprites`, `e6o1_beetles`, `e6o1_mixed`, `e6o1_harriers`, `e6o2_wraiths`, `e6o2_manta`, `e6o2_mixed`,
`gale_engine`, `e6o3_pages`, `e6o3_manta`, `e6o3_mixed`, `scribe`. Zones: `ep6_airstair`, `ep6_obs_f1`, `ep6_obs_f2`,
`ep6_obs_f3`, `ep6_obs_eyrie` in `EP6_ZONE_ORDER` (exported by the pack's `encounters.js`), kept out of
`Object.keys(ZONES)` behind `EP6_MAPS_LISTED` with the non-enumerable `defineProperty` pattern the X1, ep4 and ep5 packs
use.

### 2.5 Scenes (`src/data/ep6/story.js`; map and trigger)

| Scene | Map | Trigger |
|---|---|---|
| `ep6_morning` | ep5_sh_inn | enter trigger from the pack patch (`if: ep5_complete`, counter `credits5_rolled`, `EP6_LIVE`, not `ep6_morning_done`, not `tier_1`) |
| `ep6_board` | ep5_saffron | the berth object at the water stairs (`if: ep6_started`, `ifNot: ep6_boarded`) |
| `airstair_foot`, `mira_asks`, `airstair_fight`, `first_gust`, `isles_view` | ep6_airstair | on enter; step trigger on landing 1; step row on landing 2 (after `mira_asks`); step trigger on landing 3; step trigger at the top |
| `zephyr_arrival`, `liora_dock`, `meet_aeris`, `anchor_lesson`, `east_gate` | ep6_zephyr | on enter; `liora` talk entry (first time); `aeris` talk entry; step trigger on the east dock (after `charts_seen`); step trigger at the east airstair (after `anchor_learned`) |
| `chart_room` | ep6_zl_charts | step trigger inside the door (after `met_aeris`) |
| `obs_f1_arrival`, `aeris_memory_1` | ep6_obs_f1 | on enter; step trigger at the old relay |
| `obs_f2_arrival`, `aeris_memory_2`, `vex_relay`, `gale_engine`, `locker` | ep6_obs_f2 | on enter; step triggers; arena trigger; locker object |
| `obs_f3_arrival`, `aeris_turns`, `pledge_anchor`, `pledge_listen`, `vex_falls`, `pledge_return`, `fifth_voice` | ep6_obs_f3 | on enter (chained); signal lamp objects at each landing; step trigger on the broken causeway; the beacon platform (after `pledge_return`) |
| `scribe`, `scribe_after` | ep6_obs_eyrie | step trigger row; after the battle |
| `cloud_library` | ep6_library | on enter (the Kestrel's door from the Eyrie) |
| `isles_return`, `ep6_ending` | ep6_zephyr | on enter by the north dock after `cloud_library`; chained |
| `beacon_start`, `testimony_liora`, `testimony_bennet`, `testimony_suri`, `beacon_light`, `letters_start`, `letters_done` | ep6_zephyr, ep6_zl_charts | NPC talk entries and the beacon object |
| silent: `obs_f1_lift`, `obs_f2_lift` | F1, F2 | step triggers that set `obs_f1_done`, `obs_f2_done` |

### 2.6 NPC ids (the pack's `npcs.js`, merged into `NPCS`)

New: `aeris`, `liora`, `bennet` (shop `winch` at the Airstair's top, his dock spot in town), `suri`, `ilex` (shop
`galewing`), `nova` (shop `aeris_provisions`), `piri`, `thea`, `ep6_innkeeper` (the Cloudhouse Host, Ledger-excluded),
`pippa` (from `pippa_home`). Scene spawns: `apprentice_v` / `pippa_t` (the voice and the spire actor, speaker swap),
`aeris_m` (memory tint), `deckhand_m` (memory extra), `scribe_v` (the Scribe's voice in memories, no actor), `aeris_t` (the
spire, the Eyrie, the library), `vex` (as Episodes 2 to 5), `yara_t` (the berth), `liora_t` (dock four in
`isles_return`). Saffron Haven, Valewyn, Emberpeak, Hollowmere and Willowmere NPCs keep their ids and get Episode 6
entries through `prependTalk`. No portrait aliases (no unused painted portrait fits; 9.5).

### 2.7 Audio ids

Music: `zephyr`, `storm_observatory`, `boss_scribe` (new); `mystery`, `high_moor`, `sorrow`, `triumph`, `battle`,
`victory`, `gameover` (reused, core), `saffron` (reused, the ep5 fragment, Act I). SFX: `gust_carry`, `gust_land`,
`vane_turn`, `mooring_catch`, `gale_gust`, `anchor_set`, `rewrite_read`, `rewrite_break`, `signal_lamp`. Ambience:
`sky_wind` (new, fallback `wind_valley`), `storm_rumble` (new, fallback `moor_wind`).

### 2.8 Skills, battle state, tints, particles

Skill `anchor_line` (Bram, display name "Anchor"). Enemy skills: `rewrite_course`, `full_blast`, `thunderhead`,
`quillstorm`, `ink_squall`, `false_light`, `compass_spin`, `misdirect`, `bellows`, `thunder_glide`, `overwrite`, plus
ordinary moves named in 6.2 (each id grepped by E6-battle before use). Battle state (not statuses): the Gust counter, each
unit's `aloft` and `anchored`, the pinned Rewrite. No new status. Tints: one pack tint `storm` (slate, low saturation,
F3 and the Eyrie). Particles: the existing dust and sparkle kinds (sea spray at the stack's foot, cloud wisps on the
lanes, rain motes in the storm).

---

## 3. The world link: the Dune Lantern Rest and the water stairs

Episode 5 ends with the party waking at the Dune Lantern Rest (`ep5_sh_inn`, mark `inn_bed`). Episode 6 patches the
**registered** Episode 5 maps from inside the `ep6` pack (`src/data/maps/ep6_patches.js`, the `ep5_patches.js` pattern),
never the files `src/data/maps/ep5_*.js`:

1. **`withEp6Wake(ep5_sh_inn)`**: an enter trigger `ep6_wake` at (0, 0) with `script: 'ep6_morning'`, `on: 'enter'`, and
   marks `bird_sill`, `mira_window6` beside the existing `inn_bed`.
2. **`withSkyBerth(ep5_saffron)`**: at the water stairs (mark `water_stairs`), Yara's ship moored (prop `ship_moored`,
   `if: ep6_started`; the Episode 5 sprite), the berth object `sky_berth` (`script: 'ep6_board'`, `if: ep6_started`,
   `ifNot: ep6_boarded`), and a boat door `berth_north` on the same cell to `ep6_airstair` `stack_foot` (`if:
   ep6_boarded`). The existing `haven_boat` to Valewyn is untouched (it shares the quay, not the cell). Every Episode 5 mark,
   event and walk result unchanged.
3. **Order trap (must not miss).** `registerMap` overwrites by id and the `ep5` pack registers both maps itself (after
   awaiting ep4 for its own patches). The ep6 pack's `maps.js` therefore **awaits the ep5 pack first** (`await
   ensurePack('ep5')`), then reads each registered module with `peekMap(id)` and registers the patched one. `packs.js`
   `ep6.touches` lists `ep5_sh_inn` and `ep5_saffron` so `world/maps.js` waits on both packs (`packsForMap`). The chain is
   now ep3, ep4, ep5, ep6: E6-pack keeps every fetch starting at once and orders only registration, and measures the
   worst-case entry time to the inn on the phone profile (target: under 3 s warm, under 8 s cold; Episode 5 measured its
   own three-pack chain the same way).
4. Tests: the two maps load unpatched with the ep5 pack only and patched with both; with `EP6_LIVE` off no trigger fires
   and no ship is drawn at the water stairs; the berth's door lands on a walkable cell.
5. The return route: `ep6_airstair`'s foot holds a boat door back to Saffron Haven's water stairs (present from
   `airstair_arrived`). Zephyr Landing's south stair leads down to the Airstair; revisits use the stair and the boat.

The Keeper mirror network gains no new pair (cut line 1 can restore one at the Signal Beacon).

---

## 4. Maps

General rules: DESIGN 5.1 format and MAPS.md conventions; every scene mark exists and is reachable; enemy counts match
`ZONES[zone].plan`; every puzzle reads on screen without text; lit paths lead forward, dead ends hold chests; render
previews with `tools/maps/preview.py` and view them. Coordinates are approximate; the map author records exact cells in
`docs/MAPS_EP6_A.md` / `docs/MAPS_EP6_B.md`. **Phone rule:** a live gust lane (white streaks moving along it, a chevron
every other cell pointing its way) against plain cloud must read across the screen at 844x390; every vane's state must
read at rest from two tiles away (the arrow on its head points the way its lanes blow, and the lanes' chevrons agree);
every mooring post must read as "this stops you" (a dark post and a pennant streaming downwind); field foes carry a dark
outline and a side-coded rim (white for Aloft foes, brass for grounded ones) so they never camouflage on cloud or plank.

### 4.1 `ep6_airstair`: The Airstair (26 x 46, field, tall)

A black basalt sea stack under the skyport, bolted plank landings and rope stairs up its face, the great chain (decor, 2
wide, overhead layer) running up the middle into cloud. Bottom (south) to top (north). Clear daylight; sea spray at the
foot. `wind` block: four lanes, no vane.
- **The foot (y 40 to 45).** `stack_foot` (12, 43, 'up') from Saffron's berth; Yara's ship moored (decor); the boat door
  `stack_boat` back to `ep5_saffron` `water_stairs` (`if: airstair_arrived`); `airstair_foot` on enter. A wood chest
  (`hi_potion` x2).
- **Landing 1 (y 34 to 38).** `mira_trig` at about (10, 35): `mira_asks` (Bram as an actor two landings down, mark
  `bram_rope`). No foe.
- **Landing 2 (y 28 to 32).** `fight_row` across x 6 to 18 at y 30, `if: mira_asked`: `airstair_fight`, scripted
  `e6a_first`. One placed group after the fight (`e6a_wolves`).
- **Landing 3 (y 22 to 26): Lesson A (ride).** The stair breaks: a 6-cell gap of cloudbank east of the landing, a live lane
  `>>>>>>` across it at y 24 landing on the next ledge (`first_trig` runs `first_gust` as the player approaches; Ilex in
  a harness on the chain, mark `ilex_rope`). The ride lands on pavement; nothing to solve.
- **Landing 4 (y 12 to 20): Lesson B (a post stops you).** A long lane north up a gap (`^` x 8) with a mooring post `mo_b`
  on its third cell beside a side ledge: the ride stops at the post; step off west onto the ledge, a wood chest
  (`dead_letter` #1, `letter_1_found`, present `if: letters_started`, else `hi_ether`). Ride on from the post to the top
  of the lane. An iron chest behind a Dash-cracked crate (rolled). One group (`e6a_mixed`).
- **The top (y 2 to 8).** `isles_trig` at about (13, 5) with the decal `isles_far` (environments cell 5, quantized) in the
  overhead layer: `isles_view`. Bennet's winch stall (shop `winch`, mark `bennet_winch`). The exit north to `ep6_zephyr`
  `south_stair`.
- Enemies (2 placed + the scripted one): e6a_wolves 1, e6a_mixed 1. Chests: wood (foot), wood (post ledge: letter or
  ether), iron (Dash crate, rolled). Marks: `stack_foot`, `yara_boat`, `mira_rope`, `bram_rope`, `fight_row`, `foes_drop`,
  `ilex_rope`, `lane_a`, `post_b`, `isles_far`, `bennet_winch`, `north_exit`.

### 4.2 `ep6_zephyr`: Zephyr Landing (46 x 34, town)

A Dragon Quest town that reads at a glance on a phone, built around one image: the board plaza on the central island,
rope bridges to four smaller islands, the docks on the north and east rims, the dark storm knot on the north-east
skyline (environments cell 5, the `storm_far` decal in the overhead layer).
- **South stair** (from the Airstair; mark `south_stair`). **The board plaza (centre):** the Skyport Departure Board
  `board` (object with two drawn states: every flight ARRIVED and the docks empty, before `isles_restored`; one line
  LANDED DOCK FOUR after; the rows are drawn glyph bars, never legible text), Piri's post rack `post_rack`, the chimes
  `chimes_a` to `chimes_c` (tied with black thread before `isles_restored`, ringing after).
- **The docks:** dock four on the east rim (Liora, mark `dock_four`); the north dock (the Kestrel moored, a 6 x 3 prop in the
  overhead layer; Aeris on a cargo net, mark `aeris_net`); the east dock (`anchor_trig`: `anchor_lesson`, after
  `charts_seen`; the dock edge marks `mira_lift`, `bram_spear`).
- **West island:** the Cloudhouse Inn. **Centre-east:** Aeris Flight Provisions. **South-east island:** the Galewing
  Workshop (Ilex). **North-west island:** the Signal Beacon tower (door to `ep6_zl_charts`; the beacon on its roof as a 2 x 3
  overhead prop, dark until `beacon_lit`, then a rest and save object `beacon_rest`). **The cloud gardens** (south-west):
  Thea, floating flower beds (decor).
- **The east airstair:** `east_trig` runs `east_gate` after `anchor_learned`; then a gate (Windward Pass) to `ep6_obs_f1`
  `alcove` (present from `windward_pass`).
- **Town lanes:** two one-way lanes, the east dock to the plaza and the north dock to the plaza (comfort shortcuts; a
  plain ride, nothing to solve; the stairs and bridges always walk back).
- Marks: `south_stair`, `board`, `post_rack`, `piri_spot`, `dock_four`, `liora_spot`, `north_dock`, `aeris_net`,
  `east_dock`, `mira_lift`, `bram_spear`, `east_gate`, `inn_door`, `shop_door`, `workshop_door`, `tower_door`,
  `gardens`, `crowd_a` to `crowd_d`, `gangway`, `pippa_down`, `kestrel_rail`, `tower_roof` (the ending), `storm_far`.

### 4.3 Interiors (copy the Willowmere counterpart's layout and exits, then re-dress)

| id | from | contents |
|---|---|---|
| `ep6_zl_inn` | `inn` | the Cloudhouse Host (inn, 120 gold), hammocks, porthole windows with cloud outside, mark `inn_bed` (the post-credits wake point). |
| `ep6_zl_shop` | `item_shop` | Nova (shop `aeris_provisions`), cargo nets, goggles on hooks. |
| `ep6_zl_workshop` | `smithy` | Ilex (shop `galewing`), a brass forge, propellers on the wall. |
| `ep6_zl_charts` | `chapel` | the Chart Room: manifests pinned on every wall (inspect, book `flight_manifests`), the brass skychart table (a 3 x 2 object), Suri, the save bell (`save` event), `charts_trig` two tiles in. Marks `charts_stage`, `aeris_table`, `liora_door`, `suri_spot`. |

### 4.4 The wind block (how a map declares gust lanes)

A map with the mechanic adds a `wind` block (E6-world reads it; mapcheck models it):
```js
wind: {
  lanes: [ '....>>>>v.....', ... ],   // a lane cell and the way it blows: '>' '<' '^' 'v'; '.' = not a lane
  turned: {                          // optional: one grid per vane group, the same size as `lanes`
    a: [ '....<<<<x.....', ... ],    // when vane group 'a' is turned: an arrow sets that cell's way, 'x' = calm (no lane),
  },                                 //   '.' = the cell is not in group a (keeps its `lanes` value)
}
```
Lane cells sit over `cloudbank` (collision `void`) or, indoors, over a duct shaft (also `void`). **The rule (one for the
whole episode):**
- **Entering.** The leader may step from walkable ground onto a **live** lane cell (any direction). The field then carries
  the party: each step follows the arrow of the cell the party is on, one cell every 6 frames (RUN pace), until a stop.
- **Stops.** The ride stops (a) when the next cell along the arrow is walkable ground that is not a lane: the party lands on
  it; (b) when the current cell holds a mooring post: the party stops on that lane cell; (c) when the next cell is solid,
  void and not a live lane, holds a solid prop or an actor: the party stops on the current lane cell. A lane may bend (each
  cell's arrow decides); a ride may pass from one lane into another.
- **Standing on a lane.** A party stopped on a lane cell may step in any direction: onto ground (a walk), onto another live
  lane cell (a new ride), or back the way it came if that is ground. A step in the stopped lane's own direction is refused
  (the cell ahead is what stopped it).
- **Vanes.** A `vane` event toggles its group between `lanes` and `turned[group]`. A calm cell (`x`) is void: nothing
  stands on it. A vane never changes a cell the party stands on: the toggle is refused (bark `vane_would_drop`) if any party
  member is on a cell the toggle would make calm.
- **Loop guard.** A ride stops after 64 cells or on revisiting a cell with the same arrow (mapcheck forbids authoring
  either; the guard only protects a bad map).
Authoring rules mapcheck enforces: every vane, mooring approach and actor start cell is walkable ground or a mooring cell,
never a bare lane cell; at most 3 vanes per map (so every state can be searched: 2^3); every lane path from every entry
terminates within 64 cells in every vane state; no enemy, NPC or trigger stands on a lane cell; every lane's landing cell
is visible within one screen of its entry at the phone frame, or the ride pans (5.1).

### 4.5 `ep6_obs_f1`: The Windward Causeways (42 x 30, open sky, cloudbank around every deck)

The teaching floor. Plank decks and stormglass platforms floating on cloud, lanes streaming between them, mooring posts
with ragged pennants, weathervanes on poles, chimes tied silent on every post.

| Area | Approx. floor | What it does |
|---|---|---|
| A. The Recovery Alcove | x 18 to 24, y 24 to 28 | Arrival (`alcove` 21, 27, 'up') from Zephyr's east airstair, the Breeze-Sheltered Recovery Alcove font `font_w1` (rest and save, `safe`). `obs_f1_arrival` on enter. No enemies. |
| B. Two Ways In | x 6 to 30, y 15 to 22 | **Puzzle B (where you step in decides where you land):** one lane bends round a central deck; stepped into from the west ledge it lands the party on the north deck (the way on); from the south ledge it lands them on an east spur with a wood chest (`hi_potion` x2). Two groups on firm decks. |
| C. The First Vane | x 28 to 40, y 4 to 18 | **Puzzle C (turn a lane):** a lane runs east, away from the deck the party needs; the vane `vane_c` on the near deck turns its group to run west. Ride it. The old signal relay with `memory1_trig` (`aeris_memory_1`). One group. Bark `first_vane` (Mira: "Turn the vane, turn the wind. Then ride it."). |
| D. The Post | x 2 to 14, y 4 to 20 | **Puzzle D (a post on the way past):** the lane from C runs past the key deck without stopping; a mooring post `mo_d` stands on the lane cell beside it, but only on the run in from the west, reached after C's vane is turned back. Order by reach, never by a wrong answer. A Dash-cracked crate to a gold chest (`skyhand_boots`). One group. |
| E. The Upper Deck | x 12 to 28, y 1 to 8 | The gold chest `compass_key` (canon "Sky Compass Key" on the upper balcony, flag `compass_key_found`) reached by a lane from D. A dead-end deck behind a second vane `vane_e` (group b) with a wood chest (`dead_letter` #2, `if: letters_started`, else `hi_ether`). The lift up; its trigger sets `obs_f1_done`. One group. An optional Shove crate on a groove beside the lane (cut line 1). |

- Enemies (6): e6o1_sprites 2, e6o1_beetles 1, e6o1_mixed 2, e6o1_harriers 1. Chests: wood (B, potions), wood (E, letter or
  ether), gold (`skyhand_boots`, Dash), gold (`compass_key`), iron x1 (B, rolled), wood (A, `ballast_stone` x2), the Star-Sail
  Supply Coffer (iron, rolled, D). Marks: `alcove`, `font`, `ways_in`, `vane_c`, `relay_old`, `post_d`, `upper_deck`,
  `lift_up`.

### 4.6 `ep6_obs_f2`: The Hall of Broken Signals (40 x 30, roofed, dark 0.35)

A long roofed hall of brass relays, speaking tubes and floor grilles; the lanes here are **ducts**: wind running along
grilled channels over a dark shaft (void). Lamps on the relays are the light (Lighting pools). Indoors the chevrons ride
on the grilles; the shaft is drawn dark under them.

| Area | Approx. floor | What it does |
|---|---|---|
| A. Stair Foot | x 2 to 10, y 22 to 28 | Arrival; `obs_f2_arrival`; spring font `font_w2`. |
| B. The Two Fans | x 2 to 22, y 4 to 18 | **Puzzle B (two vanes, one order):** fan `vane_b1` (group a) turns the duct that reaches fan `vane_b2` (group b); b2's duct carries the party to the manifest relay. Reach decides the order. The manifest relay and `memory2_trig` (`aeris_memory_2`). Two groups. |
| C. The Crown Relay | x 16 to 26, y 2 to 10 | The crown relay, the feather caught in a grille (`feather_grille`); `vex_trig` (`vex_relay`) placed so the party stops two rows below Vex (CRITIQUE_7 item 8). The duct Vex rides out is a live lane into the wall (decor end: the scene moves him). |
| D. The Side Decks | x 24 to 38, y 2 to 18 | Three flight logs (wood chests `log_1` to `log_3`, flags `log_1_found` to `log_3_found`), any order. **The Locker:** a ledge reached only by riding a duct with the side fan `vane_d` turned the way the main route does not use; `locker_obj` (`script: 'locker'`) opens it (gold chest, present `if: 'locker_found'`: 400 gold, 2 `hi_ether`, book `flight_logs`). A wood chest (`hi_potion` x2). One group. |
| E. The Bellows Hall | x 14 to 26, y 12 to 24 | The Gale Engine's arena (`engine_trig`, `gale_engine`), a spring font `font_w2b` before it. After the win: the lift up; its trigger sets `obs_f2_done`; a lift `lift_f2_short` (`if: 'obs_f2_done'`) down to F1's Recovery Alcove. One group on the approach. |

- Enemies (4): e6o2_wraiths 1, e6o2_manta 1, e6o2_mixed 2, plus the Engine. Chests: iron (B, rolled), gold (the locker,
  optional), wood x3 (logs), wood (D, potions). Marks: `arrival`, `fans`, `relay_manifest`, `crown`, `vex_spot`,
  `party_stop`, `side_decks`, `locker`, `arena`, `engine_spot`, `lift_up`.

### 4.7 `ep6_obs_f3`: The Eye of the Storm (36 x 40, tint `storm`, dark 0.5)

The spire climbing through the inside of the storm, bottom (south) to top (north): three landings round a white stone
spire, each ringed by a **ring lane** (one-way round the spire), mooring posts at the landings' stairs, signal lamps (dark
until the party arrives: light pools), slate cloud and far soft lightning. The darkest map of the episode (gate: F3 mean
luma at or below F2's, with the party's floor at or above 0.22 on the phone so the party reads).

| Area | Approx. floor | What it does |
|---|---|---|
| The first landing | x 8 to 28, y 32 to 38 | Arrival (`obs_f3_arrival`, then `aeris_turns`: the Kestrel noses in at `kestrel_berth`), the spring font `font_w3` (rest and save; Talk names the F2 lift back). |
| Anchor | x 4 to 32, y 24 to 31 | **A ring and a post:** the ring lane runs clockwise round the spire; a post `mo_anchor` at the stair up stops the ride there. Ride it once. The lamp `lamp_anchor` (`script: 'pledge_anchor'`). One group. |
| Listen | x 4 to 32, y 16 to 23 | **A ring that turns:** the ring's only post faces the wrong way round; the vane `vane_listen` flips the ring counter-clockwise. A hidden Keeper lane in Keeper ink (`lantern: true`: the Episode 1 bridges "in hidden ink") off the ring's west side to a gold chest `windborne_spear`. The lamp `lamp_listen`. One group. The broken causeway at the landing's north edge with `fall_trig` (`vex_falls`; party stop two rows below Vex's edge mark `vex_edge`; marks `bram_line`, `vex_hang`). |
| Return | x 4 to 32, y 6 to 15 | **Two vanes, one ring:** the ring has two groups (east half, west half); the far post `mo_return` is reached only by a full circuit with both halves running the same way. The lamp `lamp_return` (`script: 'pledge_return'`). One group. |
| The beacon platform | x 12 to 24, y 1 to 5 | Pippa's platform (crates, the lamp, `pippa_spot`), `fifth_voice` after `pledge_return`; after `pippa_found` a rest and save point (`beacon_font`: PLAYTEST_REVIEW_7 item 4). The Sky Compass Keyhole door `door_scribe` (`compass_key`, `door_boss` style) to `ep6_obs_eyrie`. A wood chest (`ballast_stone` x2). |

- Enemies (4): e6o3_pages 2, e6o3_manta 1, e6o3_mixed 1. Chests: gold (`windborne_spear`, Lantern), iron (Return, rolled),
  wood (`ballast_stone` x2). Marks: `arrival`, `kestrel_berth`, `aeris_top`, `anchor`, `listen`, `return`, `aeris_wait_1`
  to `aeris_wait_3`, `vex_edge`, `vex_hang`, `bram_line`, `party_stop_fall`, `pippa_spot`, `keyhole`.

### 4.8 `ep6_obs_eyrie`: The Scribe's Eyrie (24 x 20)

A round deck at the top of the spire, open to the storm (the storm's wall drawn round the edge), the stormglass desk in the
middle, quills hanging in the air (decor, 3 frames). The Scribe's map actor `scribe` (sprite `scribe_avatar`) coiled over
the desk (a 4 x 4 object, frames: perched, gone). Step trigger row `scribe_trig` about row 14. After `scribe_defeated`:
the Wind Script banners (overhead prop, 3 frames), the storm lid opened (tint off, a sun shaft), the Kestrel at the rim
(`kestrel_rim`, prop), actor `aeris_t` (`if: scribe_defeated`, `ifNot: library_reached`) and the boat-kind door
`kestrel_up` to `ep6_library` `arrival`. Marks: `desk`, `party_stop`, `aeris_enter`, `chart_spot`, `feather_spot`,
`kestrel_rim`.

### 4.9 `ep6_library`: The Cloud Library (20 x 16)

A small round Keeper reading room on the top of the cloud, open to the sun on three sides, shelves of weather logs on the
fourth, a reading desk, the shelf with the page under glass (`first_shelf`, a 2 x 2 object with two frames: covered,
lifted). `cloud_library` on enter. After it: the door `kestrel_down` to `ep6_zephyr` `north_dock` (its arrival runs
`isles_return`). Marks: `arrival`, `shelf`, `party_stop`, `vex_shelf`, `aeris_door`, `seat_four`.

### 4.10 Marks and named events checklist (for `qa/maps`, mirrored in `STAGING_EP6.md`)

| Map | Marks / named events |
|---|---|
| `ep5_sh_inn` (patch) | `ep6_wake`, `bird_sill`, `mira_window6`; `ep5_saffron` (patch): `ship_moored`, `sky_berth`, `berth_north`, mark `berth_yara6` |
| `ep6_airstair` | as 4.1; triggers `mira_trig`, `fight_row`, `first_trig`, `isles_trig`; post `mo_b`; door `stack_boat` |
| `ep6_zephyr` | as 4.2; NPCs `aeris liora bennet nova piri thea`; objects `board`, `post_rack`, `chimes_a` to `chimes_c`, `beacon_rest` |
| `ep6_zl_*` | as 4.3; NPCs `suri`, `ilex`, `ep6_innkeeper` |
| `ep6_obs_f1` | as 4.5; vanes `vane_c`, `vane_e`; post `mo_d`; chest `compass_key` |
| `ep6_obs_f2` | as 4.6; vanes `vane_b1`, `vane_b2`, `vane_d`; object `locker_obj`; prop `feather_grille` |
| `ep6_obs_f3` | as 4.7; posts `mo_anchor`, `mo_return`; vanes `vane_listen`, `vane_r_e`, `vane_r_w`; lamps `lamp_*`; door `door_scribe` |
| `ep6_obs_eyrie` | as 4.8; actor `scribe`; door `kestrel_up` |
| `ep6_library` | as 4.9; object `first_shelf`; door `kestrel_down` |

---

## 5. Field systems (E6-world)

### 5.1 Gust lanes: the Episode 6 field mechanic

**Why this one.** It is the isles' own logic (root Chapter VI's gust lanes, skybridges and "wind chimes mark safe
crossings between islands"), it reads from the floor art alone (white wind you can see streaming one way, a post you can
see in it, a vane whose arrow agrees with the stream), it needs no timing (no step timers, phone-safe: the ride is the
game's, never the thumb's), it adds no damage tiles and no word grids, and it costs little: one pure carry rule, the
collision change through the override path Episode 5's field system already uses, forced steps through the actor's
existing `startStep` and `partyFollow`, and ordinary event types for the posts and vanes.

**Why it plays differently from tide locks and sun and shade.** Tide locks were a level per basin compared with a height
map, set at a wheel. Sun and shade was one hour for the whole floor whose shadows depended on where every caster stood.
Both were **state the player sets, then walks through**. Gust lanes are **movement the player commits to**: the state is
the party's own trajectory, the puzzle is "where must I step in so the wind puts me down where I need to be", and the
switches (vanes) are local, binary and few. There is no global dial anywhere in the episode (Review 7's "another dial"
risk answered), and the episode inverts its own rule twice: outdoors the wind is in the open and you choose where to step
in; indoors it is in the ducts and you choose which fan runs; on the spire it runs in a ring and you choose which way round.

**Event types** (new, in the existing `{ id, type, x, y, if?, ifNot? }` shape, registered on `EXT` by the pack):

| type | fields | behavior |
|---|---|---|
| `vane` | `group` (`'a'` / `'b'` / `'c'`), `sprite?` (`vane`), `free?` | A weathervane on a pole (outdoors) or a fan with a lever (indoors). Confirm while facing toggles its group (`vane_turn`, then the lanes swing: 5.1 drawing). Solid, faced from ground. Its head's arrow shows the way its group blows in the current state, drawn on the tile above the pole so the party never covers it. Every vane of one group on a map moves together. |
| `mooring` | `sprite?` (`mooring_post`) | A post on a lane cell. Not solid: a ride stops on its cell (`mooring_catch`, the party grabs it). Drawn as a dark post with a pennant streaming downwind (3 frames). |

**The rule** (`src/data/ep6/field/wind.js`, pure, node-tested):
- `compile(mod)` returns the lane model (cells, arrows per vane state, groups, posts) or null.
- `live(model, state)` returns the live lane cells and their arrows for a state (`state.turned`: the set of turned groups).
- `ride(model, state, from, dir, blocked)` returns `{ path: [[x, y], ...], stop: 'land' | 'post' | 'blocked' | 'guard' }`
  for a party stepping from `from` onto the next cell in `dir` (`blocked(x, y)` reports solid cells, props and actors).
- `canTurn(model, state, group, partyCells)` refuses a toggle that would make a party member's cell calm.
- Deterministic, no randomness, no timers. Recompute on load and every vane toggle. Budget: under 1 ms for a 42 x 40 map
  with 3 vanes and 300 lane cells.

**Collision, the carry and drawing.** The system applies the rule through Episode 5's override path: every **live** lane
cell's collision on `map.base` stays `void` for every actor except the leader stepping onto it from ground (the system
wraps the field's `canStep` for the leader only: `canStep` returns true onto a live lane cell); enemies and NPC walkers never
enter lanes. On `onLeaderArrived` on a lane cell, the system locks input, plays `gust_carry`, and steps the leader along
the `ride` path with `startStep` at RUN pace, followers through `partyFollow`, then `gust_land` or `mooring_catch` and
unlocks; a direction key held through the ride does not take an extra step on landing (the input is read fresh after the
unlock: a realplay test, 12). Lanes are drawn as an animated A1 layer (3 frames of white streaks moving along the arrow)
with a chevron every other cell at least 6 x 6 px and 0.2 luma above the cloud on the phone crop; calm cells are plain
cloud. A vane toggle animates for 20 frames: the chevrons of the group fade and re-draw pointing the new way, input locked
only for those frames, instant under reduceMotion. **Off-screen change:** if any lane cell more than 6 tiles from the
party changed, reuse Episode 4's `reveal()` (pan, hold, back; confirm skips). **A long ride** whose landing cell is off
screen pans with the party (the camera already follows the leader; the ride is never faster than RUN pace, so it follows).

**Persistence.** Vanes reset to the map's authored state on every entry (as Episode 5's hours did), so every arrival sees
the authored lanes. **No new save field.** A save made standing on a lane cell (possible after a `blocked` stop) loads on
that cell with the lanes in the authored state: the softlock rules below cover it.

**Softlock rules** (asserted by `qa/maps` and `mapcheck`): every vane and every mooring approach is reachable ground; no
actor starts on a lane; every arrival point reaches a vane of its floor at the start state (or the floor has no vane); the
critical path is reachable in some sequence of states explored breadth first (vane states x the party's cell); no state
strands the player (from every reachable state, including any lane cell a `blocked` stop can leave the party on, the
entrance is reachable); every chest is reachable in some state. A party stopped on a lane cell can always step off onto
ground or ride back (mapcheck checks each such cell).

**Teaching ladder** (one idea per step): Airstair A (step in, ride, land) -> Airstair B (a post stops you mid-lane) -> F1 B
(where you step in decides where you land) -> F1 C (a vane turns a lane) -> F1 D (a post you reach only from one side:
an order forced by reach) -> F2 B (indoors the ducts: two fans, one order) -> F2 D (the optional fan the main route leaves
alone) -> F3 Anchor (a ring and a post) -> F3 Listen (turn the ring) -> F3 Return (two halves of one ring). First-time barks
in the pack's `BARKS`: `first_ride` (Bram: "I am never doing that again."), `first_post` (Mira: "Grab the post. The
wind lets go."), `first_vane` (Mira: "Turn the vane, turn the wind. Then ride it."), `first_duct` (Bram: "Wind in the floor
now. Lovely."), `first_ring` (Mira: "It goes round. Pick a way and hold on."), `vane_would_drop` (Mira: "Not while we're
standing on it.").

### 5.2 Small additions

- **Tint.** One pack tint `storm` (slate, low saturation) for F3 and the Eyrie, registered on `TINTS` by the pack and on
  the night-tint sets so lamps light. Measured on the phone crop: the party's floor at or above luma 0.22.
- **Lightning.** A soft far-wall flash drawn by the pack over the storm backdrop and F3's edge cloud: at most one flash in
  any 4 seconds, peak at most +0.12 luma, never a full-screen white, off under reduceMotion (a phone and photosensitivity
  rule).
- **Memory vignettes.** Reuse the memory tint for Aeris's two memories (`aeris_m`, `deckhand_m`, `apprentice_v`).
- **Speaker swap.** The Episodes 4 and 5 mechanism for "The Signal Apprentice" to "Pippa".
- **Aeris on the spire.** `aeris_t` is a scene actor spawned at `aeris_wait_1` to `aeris_wait_3` by the pledge scenes (no
  follower code; the party's two followers are unchanged).
- **The departure board and the chimes.** Two-state objects drawn by the tile object's frames, no text. The board's rows
  clack (3 frames) while `isles_restored` is unset.
- **The line over nothing** (`vex_falls`): the scene draws a 1 px rope from Bram's mark to Vex's hanging mark (a pack
  helper on the cutscene, not a field system); the party never stands off the edge.

### 5.3 Story plumbing (inside the pack, plus the seams of section 13.2)

- The pack's `story.js` hands its scenes, lines and conditions to `registerStory`; a content test asserts ids unique
  across all six episodes and the X1, cave and tier packs.
- The `ep6_complete` handoff: the pack adds `CREDITS_HANDOFF[6] = { cards: CREDITS_EP6, music: 'zephyr', map:
  'ep6_zl_inn', mark: 'inn_bed', counter: 'credits6_rolled', endCard: END_CARD_EP6, flag: 'ep6_complete' }` and, while
  `EP6_LIVE`, replaces `CREDITS_HANDOFF[5].endCard` with `END_CARD_EP5_LIVE` ("Episode 6 begins in the morning.").
- `mainQuestFor` switches to the pack's `MAIN_QUEST_EP6` on `ep6_started` through `QUEST_EXT`; `epilogue5` Talk and journal
  point at the water stairs and Yara while `EP6_LIVE`, and list only that step (PLAYTEST_REVIEW_7 item 10).
- Ledger rows: Aeris on `met_aeris`, Liora on `testimony_liora` (or `isles_restored`), Bennet on `testimony_bennet`, Suri on
  `testimony_suri`, Ilex, Nova, Piri and Thea on `zephyr_arrived`, Pippa on `pippa_home`; `PLACES.zephyr` and
  `REACHED.zephyr = 'zephyr_arrived'`. The hero's row stays unkept (EPISODE6 choice 5).

### 5.4 Shortcuts

| From | To | Present while |
|---|---|---|
| F2 lift `lift_f2_short` | F1 Recovery Alcove | `obs_f2_done` |
| F1 Recovery Alcove path | Zephyr Landing east airstair | `obs_entered` |
| `kestrel_up` (the Eyrie) -> `kestrel_down` (the library) | Zephyr Landing north dock | `scribe_defeated`, then `library_reached` |
| The Airstair's foot | Saffron Haven water stairs | `airstair_arrived` |
| The Signal Beacon (rest and save) | (a rest point in town) | `beacon_lit` |
| F3 beacon platform (rest and save) | (a rest point before the Eyrie) | `pippa_found` |

### 5.5 W9 abilities and the Lantern in Episode 6

| Ability | Where | Critical? | Fallback |
|---|---|---|---|
| Shove | F1 E optional crate on a groove beside a lane | no | `push: true` |
| Dash Strike | Airstair crate (iron chest), F1 D crate (Skyhand Boots), the Dead Letters' F1 crate | no | breakable object |
| Appraise | 7 bestiary entries; the Engine and the Scribe readable in the field (phase 1), each showing Aloft or grounded | no | in-battle |
| Lantern | F3 Listen: the hidden Keeper lane to the Windborne Spear | no | exists |

---

## 6. Combat (E6-battle)

### 6.1 Level and EXP targets

`expForLevel`: 25 12,989, 26 14,225, 27 15,524, 28 16,887 (Fact, `party.js`, run 2026-11-09). Episode 5 finishers arrive at
about 13,000 to 13,700 (Fact, BATTLE 13.6: 11,888 EXP after F2 with every fight, the Oracle met at Lv 24 with 12,008 at
80% of the fights, +1,000 after it);
a Continue save that fought every placed foe arrives near 15,000 (Lv 26; Fact, BATTLE 13.7). The quick start uses 13,300.
E6-integrate records the real arrival level from an Episode 5 credits save and E6-battle re-tunes if it is Lv 26.

| Zone | Plan fights | Level in | Level out (all fights) | First-pass EXP |
|---|---|---|---|---|
| ep6_airstair | 1 (scripted) + 2 | 25 | 25 | +180, +380 |
| ep6_obs_f1 | 6 | 25 | 26 | +1,140 |
| ep6_obs_f2 | 4 + the Engine | 26 | 27 (just) | +800, +260 for the Engine |
| ep6_obs_f3 | 4 | 27 | 27 | +800 |
| ep6_obs_eyrie | 1 | 27 | 28 | +1,300 |

16 ordinary fights plus the scripted first (Episode 5 planned 18 and met its boss on its level). About 190 to 200 EXP an
ordinary fight. From 13,300: the Scribe at 16,860 with every fight (Lv 27, 27 EXP under 28) and about 16,200 at 80% (Lv 27).
The EXP curve is tight at the top of 27: E6-battle keeps every fight at or under its first-pass EXP so that 100% never
crosses 16,887 before the boss, and reports the margin.

### 6.2 Enemy roster

First pass, scaled from Episode 5's keep band by the 6.8 method of `EPISODE2_PLAN.md`; **the simulator targets are
binding**. Every ordinary foe uses an `enemies.webp` cell (or the Lost Page sprite), recolored to storm slate, cloud white,
cobalt and brass so none reads as its Episode 5 cousin. Every foe has a **wind** field (6.3): `aloft` or `ground`.

| id | Name | Family, size | Wind | Lv | HP | ATK / MAG | DEF / SPR | SPD | Sh | Weak | Resist | EXP / Gold | Moves (**telegraph**) | Trait | Art |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `squall_wolf` | Squall Wolf | beast | ground | 25 | 620 | 130 / 20 | 30 / 22 | 20 | 2 | fire, spear | ice | 95 / 160 | Bite, Howl (ATK up, allies) | evade 0.1 | cell 2, storm-grey fur with white wind streaks |
| `gale_sprite` | Gale Sprite | spirit, small | aloft | 25 | 560 | 70 / 120 | 18 / 32 | 18 | 2 | thunder, spear | ice, bow | 90 / 160 | Slap, Whirl (party mag 90) | basic | cell 0, a cloud-white jelly with blue wind eyes |
| `rigger_beetle` | Rigger Beetle | beast, shell | ground | 25 | 680 | 128 / 18 | 54 / 24 | 9 | 4 | thunder, axe | sword, bow | 100 / 170 | Mandible, Clamp (Protect self), Rivet (DEF up) | basic | cell 3, brass shell with rivet rows, rope-coloured legs |
| `signal_wraith` | Signal Wraith | spirit | aloft | 26 | 600 | 78 / 132 | 22 / 36 | 15 | 3 | light, fire | ice, thunder | 100 / 180 | Static (single mag 150), False Signal (Silence 25%), Drain | basic | cell 1, slate robes, a signal-lamp glow in the hood |
| `storm_harrier` | Storm Harrier | beast, flying | aloft | 26 | 600 | 136 / 30 | 26 / 26 | 22 | 3 | bow, ice | thunder | 100 / 180 | Talon, Dive (single phys 160%) | evade 0.15 | cell 6, near as painted: cobalt wings, pale gold talons |
| `lightning_manta` | Lightning Manta | spirit, flying, large | aloft | 26 | 680 | 82 / 140 | 22 / 38 | 16 | 3 | ice, bow | thunder, fire | 110 / 190 | Shock (Stun 15%), **Thunder Glide** (party mag 130%, a charge) | charge | cell 7, the ragged cloak read as a ray's wings, violet with yellow spark lines |
| `storm_page` | Storm-Marked Page | construct, small | aloft | 27 | 640 | 70 / 150 | 20 / 40 | 17 | 3 | fire, light | thunder, ice | 110 / 200 | Margin Cut (single phys), **Overwrite** (single mag 200%, a charge), Smudge (Blind 25%) | charge | the Lost Page sprite, storm-ink recolor with blue runes |

Groups: e6a_first = storm_harrier x2 (scripted, opens with the Gust 3 actions away: both Aloft, they ride it); e6a_wolves =
squall_wolf x2; e6a_mixed = squall_wolf, gale_sprite (the first mixed wind: one rides, one is blown). e6o1_sprites =
gale_sprite x2, storm_harrier (encounter `expMul` 0.7); e6o1_beetles = rigger_beetle x2; e6o1_mixed = squall_wolf,
signal_wraith; e6o1_harriers = storm_harrier x2. e6o2_wraiths = signal_wraith x2; e6o2_manta = lightning_manta,
rigger_beetle; e6o2_mixed = signal_wraith, gale_sprite, rigger_beetle (`expMul` 0.65). e6o3_pages = storm_page x2;
e6o3_manta = lightning_manta, storm_harrier; e6o3_mixed = storm_page, rigger_beetle. Elites at the normal rate. EXP per
foe here is per head before `expMul`; E6-battle tunes to the 6.1 column.

### 6.3 The Gale (the episode's one battle rule)

Distinct from Episode 3's Heat (a counter on one foe climbing to a flare), Episode 4's Decrees (seals on foes) and Episode
5's Turning Sky (a battle-wide state that changes **who is open**): the Gale changes **who acts when**. The player's
decision is tempo: brace and lose an action's damage, or press and be thrown back.

- **The Gale.** Every battle in which any foe has a `wind` field has a Gale. No encounter field is added (the
  `encounters.js` rollEncounter and `rules.js` double-entry trap is avoided): the rule reads the foes' own data, and a
  scripted encounter may set its first Gust through the pack's `GALE_START` table (`e6a_first`: Gust in 3). Battles with no
  wind foe have no Gale (Episodes 1 to 5, the cave and the tier unchanged). **If a later change needs a per-encounter
  field, it goes in BOTH `src/data/encounters.js` `rollEncounter` AND `src/battle/rules.js`, or it is silently dropped.**
- **The Gust.** A Gust falls after every **5 actions** (any unit's ended turn counts; a combo is one). It is drawn as a
  marker slot on the timeline (a white spiral disc, at least 12 x 12 on the phone, dark ring) and a small wind gauge at the
  timeline's head. When it passes: "The wind gusts." `gale_gust`, streaks cross the backdrop for 20 frames.
- **What a Gust does.** Every **Aloft** foe that is not Broken rides it: `delayUnit(u, -GUST_PUSH)` (it comes round
  sooner). Every grounded foe and every party member is **blown back** `delayUnit(u, +GUST_PUSH)` unless **Braced**: a
  unit that Defended since its last turn (`u.defending`), or one holding a Ballast Stone's brace, is not moved. An
  **Anchored** party member (Bram's Anchor) catches the gust instead: `delayUnit(u, -GUST_PUSH)`. `GUST_PUSH` 0.35 of the
  unit's base delay (knob 2). A Broken Aloft foe is **Grounded** until it recovers: blown back like any grounded unit.
  (E6-battle first checks `delayUnit` with a negative fraction against CTB's invariants: a unit's `next` never before the
  current time; if it breaks one, the fallback is "Aloft foes are not moved; everyone else is blown back", the same tempo
  gap, and says so.)
- **Readability (the phone is the bar).** The marker disc as above; an **Aloft** badge (a white feather, 8 x 8, 1 px dark
  outline) at the head of each Aloft foe's weakness row; a small anchor glyph over each Anchored or Braced party member
  while the Gust is 2 actions away or less; every push animates the unit's head sliding along the timeline with a streak.
  Measure: badge and marker at least 0.15 luma above their box on the 844x390 crop (CRITIQUE_6 item 1's rule).
- **Auto (`competent`).** Anchors when a Rewrite (6.5) or Full Blast (6.4) is pinned and the Gust is 2 actions away or less;
  Anchors when the Gust is 1 or 2 actions away and Aloft foes outnumber grounded ones and Bram keeps at least 28 MP after
  it; Defends a member below 35% HP when the Gust is 1 action away; uses a Ballast Stone on Mira when a pin is up and Bram
  is down or Silenced. The reckless and naive policies never Anchor, brace or use Ballast.

**Anchor** (`anchor_line`, display name "Anchor", Bram, 14 MP, `target: 'none'`, rank 80; learned in `anchor_lesson`
through `learn: { flag: 'anchor_learned' }`, fallback `learn: { level: 26 }`). The whole party is Anchored through the next
Gust: no one is blown back, and the wind carries them on (each acts sooner). If a Rewrite or Full Blast is pinned to that
Gust, it fails ("The course holds.", `rewrite_break`) and its owner is blown back a full turn (`delayUnit(u, 1.0)`): the
party gets two turns in a row, a combo window. Registered in `SIGNATURE_TECHS` (`{ unit: 'bram', flag: 'rewrite', skill:
'anchor_line' }`), so while a rewrite is pinned Bram's Tech list opens on it, first, in gold. It reaches `gale.js` through
the `{ keep: 'gale' }` bridge Episode 5 built (`applyEffect` hands `keep` to `ai.js` `special()`; BATTLE 13.8), so no core
change is needed. Help text (under 40 characters): "Hold through the gust. Breaks a rewrite." Learn line: "Bram learned
Anchor. The party holds through the next gust, and the wind carries them on." A 12 x 12 anchor icon on its Tech row.
**The menu path is part of the skill:** `target: 'none'` must confirm straight to its action from the Tech list with keys
and with a tap (E5-fixes A1 made `menu.js` do that for `none`); a scene test and a realplay test prove it (12).

**What the other signature skills do here.** The hero's Answer and Mira's Turn the Sky do nothing to a Rewrite; the
messages say why ("A course is not a decree." / "The wind is not the sky."), so the Episode 4 and 5 habits teach instead of
confusing. E6-battle checks what Turn the Sky does today in a battle with no sky (Episodes 1 to 4 revisits and the cave
already reach it): if it spends Mira's turn and MP for nothing, the pack disables it with the reason "No sky to turn." in
every battle without a sky, and says how.

### 6.4 Mini-boss: the Gale Engine (`gale_engine`)

Boss table, no flee, music `battle`, backdrop `ep6_relays`, flag `engine_defeated`, ai `gale_engine` (registered by the
pack). Lv 26, HP 3000, ATK 165, MAG 80, DEF 42, SPR 24, SPD 11, 7 shields, weak thunder, axe; resist ice, bow; immune
Silence. Wind `ground` (an engine bolted to the floor: it is blown back like the party unless it braces).
- **Bellows** (`bellows`): while its bellows run, the Gust comes every **3** actions, not 5 (a battle-state change the
  scene shows on the gauge). Breaking the Engine stops the bellows for 2 of its turns.
- **Full Blast** (`full_blast`): when the Gust is 2 actions away and nothing is pinned, it winds up: "The Engine winds the
  bellows..." and the blast is **pinned to the Gust**: if it lands, party phys 140% and every member not Anchored is blown
  back a full turn. Answers: Bram's Anchor (fails; the Engine is blown back a full turn); Break (cancels, the charge rule);
  Defend halves the damage and keeps that member from the push. (The boss's phase 1 trick, taught here first: one idea,
  taught twice.)
- At 50% it opens its vents and calls two **Gale Sprites** (Aloft adds, 2 shields each): they ride every Gust. Kill them
  before the next Gust, or Anchor through it.
- Targets: careful 7 to 9 rounds, win 85%+; attack-only 60% or less; ignoring the blast costs at least 10 points.
- Rewards: EXP 260, gold 1,000, mastery 22. Drops: unique `bellows_heart`, 1 rare roll (ilvl 26), hi_potion 2.
- Art: `enemies.webp` cell 4 (the binding golem) recolored to brass and cobalt with fan blades drawn into the golden core
  and bellows on its back; under-the-feet HUD row from day one.

### 6.5 Boss: the Storm Scribe (`scribe`), Bram at the center

Boss table, no flee, music `boss_scribe`, backdrop `ep6_eyrie`, flag `scribe_defeated`, ai `scribe` (registered by the
pack). Lv 27, HP 5,600, ATK 230, MAG 235, DEF 32, SPR 30, SPD 15, family construct; immune Stun, Poison, Blind. HP locks at
68% and 33% so one hit never skips a phase (canon thresholds). Wind `aloft` (it rides every Gust).

1. **The Wind Script** (100% to 68%). Armored (canon): DEF x1.4. Weak spear (canon piercing), bow; resist ice (canon),
   thunder; 8 shields. Quillstorm (party phys 100), Ink Squall (single mag 150, Blind 20%). **Rewrite the Course**
   (`rewrite_course`, flag `rewrite`): when the Gust is exactly 2 actions away and nothing is pinned, it writes: "The Scribe
   rewrites the course. When the wind gusts, you go last." (`rewrite_read`) and the rewrite is **pinned to the Gust marker**
   (the marker drawn with a red quill). If the Gust passes with it pinned, every party member not Anchored is blown back a
   full turn (`delayUnit(u, 1.0)`, Braced members half) and the Scribe takes an extra turn at once. Answers: Bram's
   **Anchor** before the marker (fails, the Scribe is blown back a full turn: two party turns in a row); **Ballast Stone**
   (braces one member: half the push); **Break** the Scribe (cancels it, the charge rule); Defend halves it for that member.
   The Gust holds until Bram has had a turn after the pin (`holdForBram`, the Episode 5 `holdForMira` pattern), and the
   telegraph line says "Bram can anchor." only when he can act before it lands.
2. **The Storm Script Ward** (from 68%). Summons the **False Beacon** and the **Broken Compass** (canon). While either
   stands the ward holds: the Scribe takes 20% damage, its shields cannot be chipped, and its HP cannot fall below 33%
   (canon floor). The Rewrite continues.
   - `false_beacon`: wind `aloft`, Lv 27, HP 720, 2 shields, weak fire, light; resist thunder. **False Light**: it Covers
     the Scribe (the existing `cover` rule: single-target hits aimed at the Scribe land on the Beacon) every turn it stands.
   - `broken_compass`: wind `ground`, Lv 27, HP 660, 3 shields, weak axe, thunder; resist ice. **Spin**: pushes the party
     member who acts soonest back half a turn every turn; **Misdirect** (Silence 40%) on Bram every 3rd turn (it targets
     the one who can anchor).
   - The Beacon rides every Gust and the Compass is blown back by it: the decision is which first, and whether to Anchor
     to reach the Beacon before it comes round again. When both are gone the ward tears: the Scribe is Broken one turn and
     the party gains 25 Fury (canon: +25 Focus).
3. **The True Sky Chart** (after the ward; canon phases 3 and 4). Armor falls (DEF normal, canon), weak fire (canon),
   spear, light; no resists; 9 shields; Haste. **Thunderhead** (`thunderhead`, canon): a charge every 4th Scribe turn, party
   mag 170%, Stun 20%: "Lightning gathers in the Scribe's wings..." Defend or Break; Anchor does not stop it. The Rewrite
   continues on every Gust's approach.

This is the boss's central decision and it is Bram's: read the pinned quill, keep Bram standing and his MP for the anchor,
and the Scribe's biggest move becomes the party's double turn. It answers Mira's Episode 5 "turn it" with Bram's "hold
on": a course writes you last, and someone who holds can keep you in your place.

- **Beacon bonus:** with `beacon_lit` the party starts with +20 Fury (the existing `startFury` option, as Episode 5's
  `moonwell_woken`).
- Targets: careful 11 to 15 rounds, win 85%+; attack-only 60% or less; ignoring telegraphs costs at least 15 points;
  careful play breaks at least half the Rewrites with Anchor.
- Rewards: EXP 1,300, gold 1,600, mastery 34. `BOSS_LOOT.scribe`: unique `scribe_quill`, 2 rare rolls (ilvl 27),
  phoenix_feather 1, hi_ether 2. Aeris's gift is staged in `isles_return`.
- Art: `bosses.webp` cell 5 at 1x in the 160 x 144 boss cell; three looks: The Wind Script (as painted: ink-and-cloud
  wings, electric-blue feathers, quills hovering), The Ward (a ring of false lamplight and a spinning brass compass rose
  behind it, the quills scattered), The True Sky Chart (the wings opened like sails with the Wind Script's lines on them,
  the feathers bright, lightning in the wingtips); a field avatar at map scale with a back frame. The Beacon and the
  Compass: one small new sprite each (a lamp on a broken mast about 40 x 60; a brass compass rose about 48 x 48 with a
  cracked needle), each with a ground shadow, in front-row foe slots beside the Scribe, rows under their own feet
  (CRITIQUE_7 item 2).

### 6.6 Simulator and tests

`tools/sim/ep6.mjs` registers the `ep6` pack data (the ep5 pattern) and adds `EPISODES[6] = EP6_ZONE_ORDER` through one
line in `simulate.mjs` (the `EP5` attach line's twin, chaining onto `EP5`). The Gale lives in `src/data/ep6/gale.js` (pure,
never draws from `ctx.R`) and runs in the sim exactly as in the game through `RULE_EXT`. Zones; `LOADOUTS` (ep6_airstair =
the `ep5_lab_oracle` loadout plus the Oracle's Mask, the Caravan Compass and two tier 10 pieces; F1 plus two tier 11
pieces; F2 plus Skyhand Boots; F3 plus two tier 12 pieces; the Scribe plus Bellows Heart and mastery up one step);
`TARGETS` (ordinary as Episodes 1 to 5, with F3 the tightest ordinary floor: careful HP lost 18 to 24%, attack-only win 70
to 85%; the Engine and the Scribe as 6.4 and 6.5; `levels` from 6.1); `SUITE_LEVELS_EP6` and `BOSS_LEVELS_EP6` (the Engine
26 and 27, the Scribe 27 and 28: the second level is a full clear's and the Continue arrival's). The policies learn the
Gale and Anchor. Tune until `--check` prints "All targets met" for all six episodes; `--cave --check` and `--tier 1
--check` unchanged. The tuning knobs, in this order: the Gust length (5), the push (0.35), the Aloft share of each group.

A content test reads Bram's two boss tips and asserts the lever each names exists in the data ("When it winds the bellows,
I anchor us": the Engine's `full_blast` carries the `rewrite` flag and is pinned to the Gust; "When it rewrites the course,
I anchor us": the Scribe's `rewrite_course` carries `rewrite`). PLAYTEST_REVIEW_6 item 8 must not recur.

---

## 7. Loot, items and shops

### 7.1 Consumable

| id | Name | Price | Effect |
|---|---|---|---|
| `ballast_stone` | Ballast Stone | 150 | One ally is Braced through the next Gust (not blown back; half the push of a pinned Rewrite). |

### 7.2 Equipment (new bases)

Tier 11 (ilvl 25; Zephyr Landing from arrival): `skysteel_mail` (body, hero/bram, 6100, DEF +44, SPR +8),
`windweave_robe` (body, mira, 6000, DEF +28, SPR +22, MAG +10), `aviator_helm` (head, hero/bram, 3000, DEF +19, SPR +5),
`gale_hood` (head, mira, 3000, DEF +10, SPR +15, MAG +7), `cloudstep_boots` (boots, all, 2600, SPD +5, DEF +5),
`sailcloth_mantle` (mantle, all, 2500, DEF +9, SPR +6, LUK +3), `ballast_charm` (charm, all, 2200, Stun resist 50%, DEF
+4), `signal_charm` (charm, all, 2200, Silence resist 50%, MAG +4).

Tier 12 (ilvl 27; the Galewing Workshop after `obs_f2_done`): `galewing_sword` (sword, hero, 8000, ATK +72, crit +6),
`stormsplit_axe` (axe, hero/bram, 8100, ATK +80, SPD -1), `skyhook_spear` (spear, bram, 8050, ATK +75, DEF +5),
`compass_rod` (staff, mira, 8000, ATK +20, MAG +62, SPR +8, MP +18), `gullwing_bow` (bow, mira, 8000, ATK +66, SPD +1, crit
+4), `stormplate_mail` (body, hero/bram, 7000, DEF +50, SPR +8), `cloudglass_robe` (body, mira, 6900, DEF +31, SPR +25, MAG
+10), `stormplate_helm` (head, hero/bram, 3500, DEF +21, SPR +6).

### 7.3 Uniques and the set (placed, never random)

| id | Name | Rarity | Slot | Stats | Source |
|---|---|---|---|---|---|
| `kestrel_wings` | The Kestrel's Wings | legendary | charm | SPD +4, LUK +4, Fury gain +12%, Stun resist 30% | Aeris in `isles_return`, truth path (`told_aeris`) |
| `quiet_chime` | The Quiet Chime | legendary | charm | SPR +8, DEF +5, Silence resist 50% | Aeris in `isles_return`, hidden path (`kept_from_aeris`) |
| `scribe_quill` | The Scribe's Quill | legendary | charm | MAG +9, SPR +6, Fury gain +12% | the Storm Scribe (guaranteed) |
| `bellows_heart` | Bellows Heart | legendary | charm | ATK +7, DEF +6, Stun resist 50% | the Gale Engine (guaranteed) |
| `windborne_spear` | The Windborne Spear | legendary | spear (bram) | ATK +80, crit +8, thunder +15% | F3 Listen, Lantern secret |
| `silver_ribbon` | Silver Ribbon | rare (unique) | charm | SPD +2, Blind resist 50%, LUK +5 | Piri's Dead Letters |
| `skyhand_boots` | Skyhand Boots | set | boots | SPD +5, DEF +6, Stun resist 10% | F1 D, Dash secret |
| `skyhand_coat` | Skyhand Coat | set | mantle | DEF +9, SPR +7, Silence resist 30% | the Signal Beacon |

Set `skyhands` (2 pieces): Stun resist +30%, SPD +1. The two Aeris gifts are a pair: the truth path's wings against the
hidden path's chime is a choice of shape, not of power (RESPONSIBILITY_ARC decision D). Names are proposals (open to veto,
as Episodes 4 and 5's were). E6-battle greps every id first (the Episode 5 Veiled Star found "evade" had no party rule:
check every stat named here exists as a party stat before using it).

### 7.4 Affixes and names

Add an eighth tier at ilvl 26 to every affix that has seven (about +15% over tier 7; resist suffixes cap at 100).
`RARE_NAME_A` gains Windborne, Stormwrit, Anchored, Highflown, Ballasted (each grepped first), through `RARE_NAME_EXT`
(exists).

### 7.5 Drop tables

`ZONE_LOOT`: ep6_airstair ilvl 25, equipChance 0.17; obs_f1 ilvl 25, 0.17; obs_f2 ilvl 26, 0.18; obs_f3 ilvl 27, 0.18.
Random tables never roll legendaries.

### 7.6 Shops and the inn

| Shop id | Keeper | Stock |
|---|---|---|
| `winch` | Bennet (the Airstair's top winch) | potion, hi_potion, ether, hi_ether, antidote, eye_drops, echo_herb, phoenix_feather, tent, silver_salve, ballast_stone, cloudstep_boots (peddler markup as Episodes 2 to 5) |
| `aeris_provisions` | Nova | the same consumables at list price plus ballast_stone, hourglass_sand (Episode 5's, while the ep5 pack is up; else omitted), ballast_charm, signal_charm, sailcloth_mantle |
| `galewing` | Ilex | tier 11 gear and the tier 10 weapons; tier 12 (`ifFlag: obs_f2_done`) |

The Cloudhouse Inn: 120 gold. Gold check (Inference; the simulator's gold column settles it): about 3,600 carried in, 500
from the Airstair, 1,300 from F1, 1,800 from F2 with the Engine, 1,100 from F3, plus chests and sales: two tier 11 pieces
in town and two tier 12 pieces before F3, never everything.

---

## 8. Music and sound

### 8.1 New tracks (E6-audio; composed in code with the in-repo tracker like Episodes 3 to 5; the shared four-note name motif; -16 LUFS; no Suno in the build)

The motif is the house's (`docs/MUSIC.md`: a rising perfect fifth, a whole-step lift, a falling major third; `0, +7, +9,
+5`). Each episode states it on a new instrument: Episode 5's was the oud. **Episode 6's is the wind harp**, a song-local
instrument (like Episode 5's `Oud` in `ep5_theme.py`, `synth.py` untouched): a bank of strings excited by filtered noise
instead of a pluck, so each note swells in as the wind catches it, rings on its harmonics, and fades, with no attack.

| id | Title | Role | Brief | Key, tempo | Motif | Fallback |
|---|---|---|---|---|---|---|
| `zephyr` | The Windward Docks | the town, `isles_return`, `CREDITS_EP6` | The root region-6 brief, for the tracker: a soaring flute, buoyant strings, a bright harp, light cymbals, 112 BPM; an A section of wonder (open fifths, the harp in sixteenths like rigging in wind), a warmer B section for the docks coming home. | G major (Lydian colour on the IV), 112 BPM, 80 to 95 s | the motif on the wind harp, G D E C, the C swelling in late and held over the bar line | `the_downs` |
| `storm_observatory` | The Windward Causeways | obs_f1, obs_f2 | Dungeon: a low pulse of timpani and a rope-creak percussion, a sustained string drone that rises and falls like gusts, the motif on low horn in long notes, the wind harp answering it in harmonics, and a dry chime every 8 bars (the tied chimes, one slipping free). | D Dorian, 96 BPM, 90 s | horn, augmented; wind harp echo two beats late | `court` |
| `boss_scribe` | The Storm Scribe | the Scribe's battle | 6/8 drive: snare and timpani on the gusts, low brass, a running string ostinato like rain on canvas, choir pads; the B section quotes `zephyr` in minor (the town's own song written as a storm); a last major bar on the wind harp before the loop. | E minor, 6/8, dotted quarter 92, 100 to 120 s | brass, the town quote | `boss_king` |

Reused: `mystery` (F3 and the chart room: the house rule, the last floor before a boss is the quiet one), `high_moor` (the
Airstair: X1's high wind on open ground), `sorrow`, `triumph`, `battle`, `victory`, `gameover`, and `saffron` (Act I, the
ep5 fragment). Cut line: if time runs short, `storm_observatory` falls back to `court` and `boss_scribe` to `boss_king`,
and the episode still ships.

### 8.2 Cue sheet by map

| Map | Track |
|---|---|
| ep5_sh_inn, ep5_saffron (Act I) | `saffron` |
| ep6_airstair | `high_moor` |
| ep6_zephyr and `ep6_zl_*` (the chart room: `mystery` 0.6) | `zephyr` |
| ep6_obs_f1, ep6_obs_f2 | `storm_observatory` |
| ep6_obs_f3 | `mystery` |
| ep6_obs_eyrie, ep6_library | silence until their scenes |
| ordinary battles, the Engine | `battle` |
| the Storm Scribe | `boss_scribe` |

### 8.3 Cue sheet by scene (a scene that leaves its map's track puts it back before it ends)

| Scene | Cue |
|---|---|
| `ep6_morning` | `saffron`, softer (0.6), silence on "Four seats.", back |
| `mira_asks` | the map track, softer (0.5) |
| `first_gust` | the map track |
| `isles_view` | `mystery`, softer |
| `zephyr_arrival` | `zephyr` from the board's clack |
| `chart_room` | `mystery` (0.6); silence on the struck line |
| `anchor_lesson` | silence and `gale_gust` on the gust, then `zephyr` again on the learn |
| `aeris_memory_1`, `aeris_memory_2` | `sorrow` with a distant `signal_lamp`, back to `storm_observatory` |
| `vex_relay` | silence, then `mystery`, back to `storm_observatory` |
| `gale_engine` | silence for the intro, then `battle` |
| `aeris_turns`, pledges | no music change; each lamp lights with `signal_lamp` |
| `vex_falls` | silence from the snap; `mystery` under the letter, back |
| `fifth_voice` | silence, `sorrow` on "Pippa. Pippa Voss.", back to `mystery` |
| `scribe` | silence, title card, `boss_scribe` |
| `scribe_after` | `sorrow` (the quills fall) -> `triumph` (the Wind Script) -> `mystery` (the counter-seal) -> silence (the lid lifts) |
| `cloud_library` | silence, `mystery` (0.5) under the page, `sorrow` on the torn line, back to silence |
| `isles_return` | the chimes ring (3 x `signal_lamp`), then `zephyr` |
| `ep6_ending` | silence, `mystery` on the needle swinging north, end cards |
| credits | `zephyr` |

### 8.4 SFX and ambience (E6-audio, synthesized like the Episode 1 to 5 sets)

| id | Use | Brief |
|---|---|---|
| `gust_carry` | a ride on a gust lane starts | a rising rush of air with a cloth flap, about 0.5 s, then a low loopable hold the system fades |
| `gust_land` | a ride lands on ground | a soft boot thump on plank and a falling whoosh, about 0.4 s |
| `vane_turn` | a vane or fan toggled | a brass ratchet a quarter turn and a creak, then the wind changing pitch |
| `mooring_catch` | a ride stops at a post | a rope snap taut and a wooden knock |
| `gale_gust` | the battle's Gust | a broad gust swell left to right with a rattle of rigging; distinct from core `thunder` |
| `anchor_set` | Anchor cast | a spear driven into planks (a deep thunk) and a rope pulled tight |
| `rewrite_read` | the Rewrite telegraph | a dry quill scratch running fast over paper, a low wind under it that does not resolve |
| `rewrite_break` | a Rewrite broken (Anchor) | a quill snapping and paper tearing away on the wind, then a rising clear tone; not Episode 4's `decree_void` or Episode 5's `prophecy_break` |
| `signal_lamp` | the pledge lamps, the beacon, the chimes | a small glass chime and a soft flame catching, bright, beat-free |
| `sky_wind` (ambience) | the Airstair, the town, F1 | high steady wind over open sky, faint rigging hum, an occasional chime far off |
| `storm_rumble` (ambience) | F2, F3, the Eyrie | low rumbling wind, distant soft thunder every 6 to 9 s, rain on canvas |

All of it reaches the game through the pack's audio fragment (13.3), never through `assets/audio/manifest.json`. E6-audio
draws a pairs sheet (`tools/audio/out/ep6/pairs.png`) proving `gale_gust` against `thunder`, `rewrite_break` against
`decree_void` and `prophecy_break`, and `signal_lamp` against `caravan_bell` are told apart.

---

## 9. Asset list: what is reused and what is new

### 9.0 Unused painted source cells (checked 2026-11-09 against `tools/art/**`, the atlases and EPISODE5_PLAN 9.0)

| Sheet | Cell | Content | Status | Episode 6 use |
|---|---|---|---|---|
| `environments.webp` | 5 | the Skybound Isles: floating islands with a small fantasy airship and bridges over sunlit clouds, sky blue and peach light | never shipped | the sky and causeway backdrops, the `isles_far` and `storm_far` decals, `ep6_dialog_keyart`, the town's palette |
| `bosses.webp` | 5 | the Storm Scribe: a winged ink-and-cloud beast, electric-blue feathers, hovering runic quills | never shipped | the boss, its looks, avatar, portrait crop |
| `portraits.webp` | 0 to 7 | all used or held (7, `hooded_sage`, held for the First Keeper) | no aviator face | Aeris speaks without a portrait (9.5) |
| `environments.webp` | 6, 7 | Hollow North, First Library | unused | **held** for Episodes 7 and 8 |
| `bosses.webp` | 6, 7 | White Phantom, Eraser | unused | **held** |
| `enemies.webp` | 0 to 7 | all used by Episodes 1 to 5 | used | recolors only (6.2, 6.4); cell 5 not used this episode |

### 9.1 Tiles and tile objects (E6-tiles; new sheet `assets/tiles/ep6.png`, fragment `assets/tiles/ep6_tiles.json`, existing sheets untouched)

| Asset | Reuse | New |
|---|---|---|
| Terrains: `cloudbank` (the void: soft animated cloud, A1, 3 frames, never looks walkable), `gust_lane` (A1, 3 frames of white streaks; the chevrons are drawn by E6-world in code so they follow each cell's arrow), `skyplank` (deck planks), `skywalk` (rope bridge, 2 frames sway), `stormglass` (pale blue glass floor), `skybridge` (a stone span), `relay_grate` (F2 brass grating), `duct_shaft` (F2's dark shaft under the grilles), `spire_stone` (F3 white stone), canon names | A2 builder, the ep5 per-floor kit approach | all; three Observatory floors must not look alike: sunlit plank and glass, brass and dark grating, white stone in slate cloud |
| Walls: `causeway_rail` (F1 rope rails), `relay_hall` (F2, with speaking tubes and lit and dark relay faces), `spire` (F3 curved faces) | wall systems with outer faces | three wall systems |
| Objects: `vane` (2 states x 4 arrow directions; the arrow on the tile above the pole), `fan_vane` (indoor fan and lever, 2 states), `mooring_post` (pennant, 3 frames), `signal_lamp` (dark, lit), `relay` (3 dial states), `speaking_tube`, `chimes` (tied, ringing 2 frames), `departure_board` (2 states, rows clack 3 frames), `post_rack`, `beacon` (dark, lit), `kestrel` (6 x 3 overhead), `great_chain` (2 x 8 overhead, repeatable), `scribe_desk`, `quills` (3 frames), `wind_script` (overhead banners, 3 frames), `first_shelf` (covered, lifted), `sky_keyhole` (boss door, 3 wide), `feather_grille`, `crate_dash`, `supply_coffer` | push block, gate, font, door_boss drawing style, the ep5 ship prop (Yara's, reused from the ep5 sheet) | all |
| Town kit: rope bridges, brass domes, cloud gardens and floating flower beds, windsocks, rotors, windstones, skyflowers (canon decor), docks with bollards, the Signal Beacon tower facade, `isles_far` and `storm_far` decals (environments cell 5, quantized) | Willowmere prefabs | the brass, rope and sky palette swap |
| Airstair kit: basalt stack faces, plank landings, rope stairs, sea foam at the foot | the ep5 water edge | all |

### 9.2 Sprites (E6-sprites; pack atlases `ep6_npcs`, `ep6_enemies_battle`, `ep6_enemies_field`, `ep6_bosses_battle`, `ep6_portraits`, `ep6_heads`)

| Asset | Reuse | New |
|---|---|---|
| NPCs `npc_aeris`, `npc_liora`, `npc_bennet`, `npc_suri`, `npc_ilex`, `npc_nova`, `npc_piri`, `npc_thea`, `npc_pippa`, `npc_aeris_young` (memory), `npc_deckhand` (2 recolors) | paper-doll builder; bodies: coat for Aeris and Liora; the smith body for Ilex; sailor for Bennet and Nova; courier for Piri | 10 specs plus 2 recolors (Aeris: aviator coat, goggles in grey-streaked hair, a compass on a chain; Pippa: signal-jacket with brass tabs, a hand lamp). Ages must read (CRITIQUE_6 item 10): grey for Bennet (sixties), grey streaks for Aeris (fifties) |
| The Cloudhouse Host | `npc_innkeeper` recolor | palette |
| Enemy battle sprites, the 7 of 6.2 | enemies.webp cells, the Lost Page sprite, the recolor and derive pipeline | recolor recipes; a dark outline on every foe and a side-coded rim (white Aloft, brass grounded) |
| `gale_engine` | enemies.webp cell 4 | brass and cobalt recolor, fan blades in the core, bellows |
| `scribe` x3 looks, `scribe_avatar` | bosses.webp cell 5, `build_bosses.py`, the `oracle` approach | the three looks and the avatar |
| `false_beacon`, `broken_compass` | none | two small new sprites with ground shadows |
| Field sprites for every new enemy | `enemies_field` layout | frames; checked on each floor at phone scale, on cloud and on plank, not on the sheet background |
| Portrait `scribe` | bosses cell 5 crop via `build_portraits.py` | crop recipe, readable at 48 (the head, one blue wing, a quill) |
| Timeline heads `head_<id>` | `build_heads.py` | entries in `ep6_heads`, with the Aloft badge drawn by the scene, not baked |

### 9.3 Backdrops and key art (E6-tiles, `tools/art/backdrops`; files `assets/backdrops/ep6_*`)

| id | Source | Use |
|---|---|---|
| `ep6_battle_sky` | environments cell 5, a crop on open sky, islands and the airship | ep6_airstair |
| `ep6_battle_causeway` | environments cell 5, a crop on the bridges | ep6_obs_f1 |
| `ep6_battle_relays` | composed in code: a brass relay hall, speaking tubes, two lamp pools | ep6_obs_f2, the Gale Engine |
| `ep6_battle_storm` | composed in code: a slate storm wall, the white spire, rain bands, a soft lightning layer | ep6_obs_f3 |
| `ep6_battle_eyrie` | composed in code over a cell 5 sky crop: the storm's ring round an open eye, the desk | the Storm Scribe |
| `ep6_dialog_keyart` | cell 5 with the baked vignette | Episode 6 title cards and `CREDITS_EP6` |

**Two grades at runtime, no extra bytes.** The storm stages (`storm`, `eyrie`) have a **storm grade** (as composed) and a
**clear grade** (the eye open: a warm lift and the rain layer off) the Eyrie cross-fades to after the ward tears, so phase
3 reads as the storm opening. The clear grade is its own recipe in OKLab (Episode 5's `DAY_TONE` approach, not a screen over
the storm: CRITIQUE_7 item 1), and each grade's mean luma is measured (clear at least 0.12 above storm on the phone crop).
Lightning is a separate layer (5.2's rule). A stage whose backdrop is a painted pack file is tested by waiting on
`usedAsset`, never on `backdropLayer.painted` (Episode 5 found it stays false for pack stages).

### 9.4 Close-up pages (E6-tiles, `src/data/ep6/pages.js`, the EP5 pages approach: code-drawn, registered on `PAGE_KINDS`)

CRITIQUE_6 item 3 and CRITIQUE_7 item 7: show the payoffs, in stages.

| kind | modes | Used in |
|---|---|---|
| `ep6_slip` | `burned` (four seat lines, the fourth a lightning burn) | `ep6_morning` |
| `ep6_manifest` | `struck` (twelve lines, one scratched thin on every copy), `restored` (the twelfth line back: Pippa Voss) | `chart_room`, `scribe_after` |
| `ep6_letter` | one (Vex's letter in the warm hand, the blank where a signature was, the counter-seal) | `vex_falls` |
| `ep6_page` | `name` (the hero's name, written for the first time), `seal` (the counter-seal under it), `torn` ("Keep this one." and the torn line "Carried down the White Road by") | `cloud_library` |

The words on a page are the story's lines in the game font styled as handwriting (the warm hand's "k" drawn the way
Episode 5's `ep5_page` drew Ishra's, so the match is seen, not told): something to look at, never a puzzle. The hero's name
on `name` must be the brightest thing on the page.

### 9.5 Optional paid items (for Scott to approve and make himself; the build does not wait for them)

| Item | Service | Cost | What it lifts |
|---|---|---|---|
| Aeris's portrait (a painted bust in the `portraits.webp` style: aviator coat, goggles in grey-streaked hair, compass on a chain) | Runway still | 4 credits | Aeris is the episode's guest and speaks without a face; every other lead has one. Highest value of the three. |
| A painted relay hall interior (brass relays, speaking tubes, wind ducts) | Runway still | 4 credits | replaces the code-composed `ep6_battle_relays` and lifts F2's look |
| `zephyr` town theme from the region-6 brief | Suno Pro | 1 monthly download | a real recording over the tracker version |

Total if all approved: 8 Runway credits and 1 Suno download. Default: none; the episode ships without them (the plan's
fallbacks in 8.1 and 9.3 are the shipped versions). Scott's Runway and Suno accounts stay with Scott: an agent never routes
around a denied or gated generation path, and asks in an issue instead.

### 9.6 What Episode 6 does not need

No new party art, no new UI windows, fonts or cursors, no new jingles, no new engine core modules, no new status (Aloft,
Anchored and Braced are battle state; the Rewrite is a charge with a flag), no new ui-atlas icon (the gust marker, the
badges and Anchor's icon are drawn in code by the pack's scene module).

---

## 10. Save compatibility (E6-pack; read this before touching anything that writes a save)

**The rule carries over from Episodes 3 to 5, unchanged: no Episode 6 path ever writes a save slot that holds another
run.**

1. **Per-run autosave stays.** `g.autosaveSlot` is honored by everything Episode 6 adds; Episode 6 adds no new write path.
   Nothing in the pack calls `save.write` except through the field's existing autosave and the save bell.
2. **The main entry is Continue.** A run that finished Episode 5 continues into Episode 6 from its own save: after the
   Episode 5 credits it wakes at `ep5_sh_inn` and `ep6_morning` runs (only while `EP6_LIVE`); a save made later anywhere in
   Saffron Haven starts it on the next enter of `ep5_sh_inn`. A save from before Episode 5's credits is untouched by
   Episode 6 in every way (nothing of it is reachable without `ep5_complete` and the counter).
3. **The quick start, `newGameEp6(name, { slot })`**, lives in the pack (`src/data/ep6/start.js`) and uses the core
   `pickRunSlot(save)` exactly as Episodes 3 to 5 do: slot 0 if empty; otherwise the first empty manual slot, shown before
   starting ("This party will save to Record 2."); if every slot is full it does not start and shows the existing refusal
   with only Back. It never offers Replace and never writes an occupied slot.
4. **`EP6_START`** (in the pack). Lv 25 at 13,300 EXP with the simulator's `ep6_airstair` loadout; every Episode 1 to 5
   main flag plus `ep5_complete`, `star_restored` and `sel_walked_in`; counters `credits_rolled` to `credits5_rolled`; key
   items `name_fragment_1` to `name_fragment_5`, `lantern_of_recall`, `mirror_sigil`; equipment including the Oracle's
   Mask and the Caravan Compass; 3,600 gold; potion 6, hi_potion 8, hi_ether 6, phoenix_feather 3, silver_salve 3,
   hourglass_sand 2; starts at `ep5_sh_inn` `inn_bed`. The quick start **awaits the ep5 pack (which awaits ep4) and then
   the ep6 pack, and merges every audio fragment it needs (ep5, ep6), before the fade in** (PLAYTEST_REVIEW_6 fix 3).
   Exposed as `LQ_DEBUG.newGameEp6(name, { slot })`.
5. **The episode switch.** `src/game/episodes.js` gains `export const EP6_LIVE = false` (seam 2). While false:
   `ep6_morning` never runs, no ship waits at the water stairs, the Episode 5 end card is unchanged, and the title shows no
   Episode 6 row, **except** with `?ep=6` once the pack's `EP6_MAPS_LISTED` is true. E6-integrate flips `EP6_LIVE` on the
   branch. When live, the title row "Episode 6: new party" shows once any slot has `ep5_complete`, with the help line "A
   ready party at Lv 25. Your own save stays under Continue." (`foldTitleRows` keeps the episode rows together; with
   five episode rows on the phone, E6-scene-ui checks the folded title fits at 375x812 and 844x390).
6. **A save never lost when the pack fails** (PLAYTEST_REVIEW_6 fix 1). `src/game/packFallback.js` `landing()` learns
   `ep6_` (seam 4: the `ep[45]_` regex widened to `ep[456]_`, Emberpeak's east road end); the field never autosaves on
   `_testtown` or while a `packReturn` is pending (E4-fixes' rule; E6-pack's test proves it for an `ep6_obs_f2` save with
   `src/data/ep6/**` unreachable: the slot's map is unchanged after a map change).
7. **Additive schema.** New flags and counter `credits6_rolled`. No field is renamed or removed; an Episode 1 to 5 save
   loads unchanged. **Fine Print rule:** a Fine Print run (`tier_1`) never starts Episode 6 (`ep6_morning` needs `not
   tier_1`); Fine Print stays unlocked where it is today and is not scaled for Episode 6 (EPISODE6 choice 13).
8. **Tests (node, pure, fake storage):** slot 0 occupied + empty slot 2 -> the quick start writes only slot 2 through a
   full simulated map change; all slots full -> no write at all; an Episode 5 credits fixture loads and reaches
   `ep6_morning` with `EP6_LIVE` on, and does not with it off; a Fine Print save never reaches it; an Episode 4 save (no
   `ep5_complete`) never reaches it; `?ep=6` hidden while maps are unlisted; the pack-failure landing case above; a save
   made on a lane cell after a `blocked` stop reloads on that cell with the authored lanes and the party able to step off.

---

## 11. Build plan: waves and agent briefs

Every agent: read `AGENTS.md`, COMMON.md, DESIGN.md, `docs/story/EPISODE6.md`, this plan and its brief; stay in owned paths;
keep `node qa/run.mjs` green (Episodes 1 to 5 unchanged in meaning); no git; no em dashes; LF line endings; report under
400 words. Where an agent needs something not yet delivered, it stubs the agreed id and says so.

**Every step leaves the game publishable:** nothing a player can reach changes until E6-integrate flips `EP6_LIVE`; the
pack is not even fetched while the switch is off, except with `?ep=6` or `?pack=ep6`.

### 11.1 The waves (up to three agents at once; paths disjoint inside each wave)

| Wave | Agent | Size | Brief | Owned paths (disjoint within the wave) | Closes with |
|---|---|---|---|---|---|
| **6a** | E6-pack | M | `E6-pack.md` | `src/data/ep6/index.js`, `src/data/ep6/start.js`, `src/data/ep6/maps.js` (the map registry), `src/data/ep6/hooks.js` (credits, quest, title, debug hooks); the core seams of 13.2 in `src/game/packs.js`, `src/game/episodes.js`, `src/scenes/title.js` (one line), `src/game/packFallback.js` (one regex), plus the core-JS comment trims that pay for them; `tools/pwa/build_pwa.py` (`LAZY_PREFIXES`), `qa/pwa/budget_ratchet.json` (`packCapsMB.ep6` only), `qa/pwa/packs.test.mjs` (the caps line), `qa/pwa/precache.test.mjs` (the ep6 fragment), `qa/core/ep6_*`, `qa/saves/ep6_*`, `qa/ui/ep6_*`, `docs/PWA_PACKS.md` (an "ep6 pack" section) | `node qa/run.mjs core saves ui pwa battle`; tap-prompt bytes not grown |
| 6a | E6-story | M | `E6-story.md` | `src/data/ep6/{flags,npcs,quests,text,story,ledger}.js`, `docs/story/STAGING_EP6.md`, `docs/story/EPISODE6.md` (section 9 only), `qa/content/ep6_*` | `node qa/run.mjs content` |
| 6a | E6-battle | M | `E6-battle.md` | `src/data/ep6/{enemies,encounters,items,loot,shops,skills,ai,gale}.js`, `tools/sim/ep6.mjs`, one line in `tools/sim/simulate.mjs`, `qa/battle/ep6_*`, `docs/BATTLE.md` (an "Episode 6" section) | `node qa/run.mjs battle`; `simulate.mjs --check` all six episodes |
| **6b** | E6-tiles | M | `E6-tiles.md` | `tools/art/tiles/ep6_*.py` (+ one line in `build_tiles.py`), `tools/art/tiles/out/ep6/**`, `assets/tiles/ep6.png`, `assets/tiles/ep6_tiles.json`, `tools/art/backdrops/ep6_*.py`, `assets/backdrops/ep6_*`, `src/data/ep6/pages.js`, `qa/core/ep6_tiles*`, `qa/core/ep6_pages*` | sheets, mocks and pages viewed; `sync-manifest --pack ep6` |
| 6b | E6-sprites | M | `E6-sprites.md` | `tools/art/sprites/chars/ep6_*`, `tools/art/sprites/ep6_*.py` (+ one line in `build_all.py`), `assets/sprites/ep6_*`, `assets/ui/ep6_heads.*`, `qa/core/ep6_sprites*` | contact sheets viewed; `sync-manifest --pack ep6` |
| 6b | E6-world | M | `E6-world.md` | `src/data/ep6/field/**` (wind.js, events, system, art), `src/data/ep6/world.js` (registers the EXT types, the `storm` tint, the test map), `tools/maps/ep6_check.mjs` (+ one line in `tools/maps/mapcheck.mjs`), `qa/world/ep6_*`, `docs/WORLD_EP6.md` | `node qa/run.mjs world`; fieldlab shots viewed |
| **6c** | E6-maps-a | M to L | `E6-maps-a.md` | `src/data/maps/ep6_airstair.js`, `ep6_zephyr.js`, `ep6_zl_inn.js`, `ep6_zl_shop.js`, `ep6_zl_workshop.js`, `ep6_zl_charts.js`, `ep6_patches.js`, `qa/maps/ep6_a_*`, `docs/MAPS_EP6_A.md`, `tools/maps/previews/ep6_airstair*`, `ep6_zephyr*`, `ep6_zl_*`, `ep5_saffron_ep6*`, `ep5_sh_inn_ep6*` | `mapcheck check`; previews viewed |
| 6c | E6-maps-b | M to L | `E6-maps-b.md` | `src/data/maps/ep6_obs_f1.js`, `ep6_obs_f2.js`, `ep6_obs_f3.js`, `ep6_obs_eyrie.js`, `ep6_library.js`, `qa/maps/ep6_b_*`, `docs/MAPS_EP6_B.md`, `tools/maps/previews/ep6_obs_*`, `ep6_library*`, the one `EP6_MAPS_LISTED` line in `src/data/ep6/encounters.js` | same; the critical path test |
| 6c | E6-audio | S to M | `E6-audio.md` | `tools/music/songs/ep6_*.py`, `assets/audio/music/ep6_*`, `tools/audio/ep6_*`, `assets/audio/sfx/ep6_*`, `assets/audio/ambience/ep6_*`, `src/data/ep6/audio.js` (the manifest fragment), `docs/MUSIC.md` (an Episode 6 section), `qa/audio/ep6_*`, `qa/music/ep6_*` | renders, seams and piano rolls viewed; `node qa/run.mjs music audio` |
| **6d** | E6-scene-ui | M | `E6-scene-ui.md` | `src/data/ep6/scene.js` (prototype wrapping, the ep5 pattern), `src/data/ep6/title.js`, `qa/battlescene/ep6_*`, `qa/ui/ep6_scene*`, `qa/realplay/ep6battle.py`; a core line in `src/battle/scene/**` (`menu.js startTarget` above all) or `src/scenes/battle.js` only if no wrap can reach it, paid by a trim in the same change | `node qa/run.mjs battlescene ui pwa`; phone shots viewed; the realplay cast |
| 6d (after scene-ui) | E6-integrate | M | `E6-integrate.md` | `qa/autoplay.py` (an Episode 6 segment), `qa/autoplay_grid.mjs`, `qa/integrate/ep6_*`, `qa/integrate/story_time.py` (Episode 6 input and the lane weighting), `qa/shots.json` (append only, LF), `qa/realplay/ep6field.py`, the `EP6_LIVE` line, seam fixes in files whose owner's brief is closed | the full gate list (12) |
| **6e** | E6-review | S to M | `E6-review.md` | `docs/CRITIQUE_8.md`, `docs/PLAYTEST_REVIEW_8.md`, `qa/out/review8/**` | read-only |
| 6e (after the review) | E6-fixes | M | `E6-fixes.md` (the orchestrator fills its items from the review) | per the list | the full gate list again |

Agent count: 11 build agents and 1 read-only reviewer (12 overnight sittings), then 1 fix pass. Never more than three at
once.

### 11.2 Disjointness check, by shared file

| Shared file or folder | Who touches it, in which wave | Why it is safe |
|---|---|---|
| `src/data/ep6/index.js` | E6-pack (6a) only | the entry imports the other modules behind a missing-module guard, so every other agent plugs in by exporting `register()` |
| `src/data/ep6/maps.js` | E6-pack (6a) writes the guarded list of all 11 map module names plus the patches | 6c's map agents only create files the list already names |
| `src/data/ep6/encounters.js` | E6-battle (6a); E6-maps-b (6c) edits one line (`EP6_MAPS_LISTED`) | different waves |
| `src/data/ep6/gale.js` | E6-battle (6a) only | `RULE_EXT` already exists (Episode 5's seam); no core file |
| `src/data/ep6/pages.js` | E6-tiles (6b) only | E6-story (6a) calls the kinds by name behind a `PAGE_KINDS[kind]` guard (narration fallback until 6b lands) |
| `src/data/ep6/{scene,title}.js` | E6-scene-ui (6d) only; E6-pack's hook (6a) imports `title.js` guarded | different waves |
| `src/data/ep6/{flags,npcs,quests,text,story,ledger}.js` | E6-story (6a) only | |
| `src/data/ep6/field/**`, `world.js` | E6-world (6b) only | |
| `src/data/ep6/audio.js` | E6-audio (6c) only | |
| core seams (`packs.js`, `episodes.js`, `title.js`, `packFallback.js`) | E6-pack (6a) only | no other 6a agent opens a core file |
| `src/battle/scene/**` (`menu.js`), `src/scenes/battle.js` | E6-scene-ui (6d) only, and only if a wrap cannot reach | |
| `tools/sim/simulate.mjs` | E6-battle (6a), one line | |
| `tools/maps/mapcheck.mjs` | E6-world (6b), one line | 6c map agents run it, do not edit it |
| `assets/tiles/**`, `assets/backdrops/**` | E6-tiles (6b) only (ep6-prefixed files) | fragments, never `tiles.json` |
| `assets/sprites/**`, `assets/ui/ep6_heads.*` | E6-sprites (6b) only (ep6-prefixed files) | pack atlases merge at runtime; base files untouched |
| `assets/ep6_manifest.json` | written by `node qa/core/sync-manifest.mjs --pack ep6`, run by E6-tiles and E6-sprites in 6b | a generated file; the orchestrator reruns it **and `git add`s it** at every wave close |
| `assets/audio/manifest.json` | **nobody** | Episode 6 audio rides the pack fragment (13.3) |
| `src/data/maps/ep5_*.js`, `src/data/ep5/**` | **nobody** | Episode 6 patches registered maps from its own `ep6_patches.js` |
| `docs/MAPS.md`, `docs/WORLD.md` | nobody | Episode 6 writes `MAPS_EP6_A.md`, `MAPS_EP6_B.md`, `WORLD_EP6.md` |
| `qa/shots.json`, `qa/autoplay.py` | E6-integrate (6d) only | |
| `qa/realplay/**` | E6-scene-ui (6d) writes `ep6battle.py`; E6-integrate (6d, after) writes `ep6field.py` and the `run.py` entries | sequential in 6d |
| `PLAN.md`, `PROGRESS.md` | the orchestrator only | agents send paragraphs in their reports |

Never beside each other: E6-integrate runs alone (it touches seam files of closed briefs); E6-review never runs beside
E6-fixes.

### 11.3 Wave close (orchestrator checklist, each wave)

`node qa/core/sync-manifest.mjs --pack ep6`; **`git add next/assets/ep6_manifest.json`** (it is generated, and Episode 5
left it unstaged once); `python tools/pwa/build_pwa.py` (from this LF worktree only); `node qa/run.mjs pwa core`; restore
`next/qa/world/out` with `git checkout -- next/qa/world/out` (never commit it); add `next/qa/cave/out` files only by name;
count CR bytes in `next/qa/shots.json` (zero); view every image the wave's reports name; commit on the build branch with the
orchestrator's message; push the branch and update the pull request into `overhaul` (PR only, never a direct push, never
`main`; one pull request, never a duplicate on retry).

---

## 12. Acceptance and QA (the full gate list)

- `node qa/run.mjs` green; Episode 1 to 5 suites unchanged in meaning (rerun a flaky timeout alone before treating it as
  real: `x1_gate`, `x1_wild`, `walks`, `abilities_walks`, `qa/battle/sim.test.mjs`).
- `node qa/run-gate.cjs` (the root game) green.
- `node tools/sim/simulate.mjs --check`: "All targets met" for Episode 1, Whisperwood Hollow, Episodes 2, 3, 4, 5 and 6;
  `--cave --check` and `--tier 1 --check` unchanged.
- `node tools/maps/mapcheck.mjs check` clean; previews of the 11 new maps and the two patched maps viewed, in
  `MAPS_EP6_A.md` / `MAPS_EP6_B.md`, including each vane state of F1, F2 and F3 and every lane drawn with its chevrons.
- **The menu path, with real input.** `qa/battlescene/ep6_menu_cast.test.mjs` opens Bram's Tech list through `menu.js` and
  casts Anchor by confirm (never through `LQ_DEBUG.battleAct`, which closes the menu itself and so cannot see a menu bug);
  `python qa/realplay/ep6battle.py` casts Anchor once with real keys and once with a real touch tap, with a Rewrite pinned,
  and reads back the `rewrite_break` event. If Episode 6 adds any target kind, `menu.js startTarget` accepts it and the
  same tests cover it.
- **The ride, with real input.** `python qa/realplay/ep6field.py` rides the Airstair's lane A with real keys, holding the
  direction through the ride, and asserts exactly one landing cell and no extra step after the unlock; then one ride by a
  touch tap.
- **Autoplay route.** `qa/autoplay.py --episode 6` plays from an Episode 5 credits save and from `newGameEp6`: the inn, the
  berth, the Airstair (Mira's choice, the first fight, lane A, the post), the town (Liora, Aeris, the chart room, the dock,
  the gate), F1 (B, C, D, E), F2 (B; the Engine on Auto), F3 (the ring, the vane, both halves; Vex; Pippa), the Scribe on
  Auto (Anchor used by the competent policy; the bot records each Rewrite and how it was answered), the library, the
  ending, credits, the wake at the Cloudhouse Inn. No softlock, the Scribe beaten at Lv 27, zero game overs, desktop and
  phone, one device at a time; vane and lane inputs from the map agents' reported solutions; the quick start never wrote a
  slot it did not own (asserted by reading localStorage back); **zero "unknown ... id" warnings in either run**
  (asserted). `--all-fights` hunts each placed foe once (foes revived by a reload are not hunted again), so the Continue
  run's level reading is honest.
- Story timer (`qa/integrate/story_time.py` on the Episode 6 logs, a lane puzzle counted by decisions: one per vane toggled
  and one per ride chosen, never per step): first play 60 to 90 minutes; first fight under 5 minutes after `ep6_morning`;
  no main scene over its box budget.
- **Shots** (append to `qa/shots.json`, LF, zero CR bytes; zero console errors; desktop 1920x1080 and phone 844x390):
  `story_ep6_morning_slip`, `story_mira_asks`, `battle_airstair_first_gust`, `battle_gale_gust`, `field_ep6_lane_a`,
  `field_ep6_post_b`, `field_ep6_zephyr_board`, `story_chart_room_manifest`, `story_anchor_lesson`, `field_ep6_obs_f1_vane`,
  `field_ep6_obs_f2_ducts`, `story_vex_relay`, `battle_gale_engine`, `field_ep6_obs_f3_ring`, `story_vex_falls_letter`,
  `story_fifth_voice`, `battle_scribe_rewrite`, `battle_scribe_ward`, `story_scribe_after_script`, `story_cloud_library_page`,
  `story_isles_return`, `story_ep6_ending`, `ui_title_ep6`.
- Performance: field logic under 3 ms, a vane toggle under 1 ms of recompute, a ride's per-frame cost under 1 ms, 60 fps on
  the phone profile; the soft lightning layer under 0.5 ms.
- Text: no em dashes (grep U+2014 over `next/`), every box within 3 x 42, ASCII only, no keyboard glyph on touch.
- Readability: every lane puzzle solvable by a first-time player without Talk; every vane's state readable at rest on the
  phone; a live lane against plain cloud readable across the screen; the gust marker and the Aloft badge at least 0.15 luma
  above their box; F3 mean luma at or below F2's with the party's floor at or above 0.22; no lightning flash brighter than
  +0.12 luma or more often than once in 4 s; Talk always names the next step, including after `ep6_complete`.
- Saves: section 10's tests; an Episode 6 save made mid-Observatory reloads with every vane in its authored state and every
  opened door open.
- **Budget** (13): `qa/pwa/precache.test.mjs` green, the tap-prompt bytes at or below the measure E6-pack records first,
  the initial download not grown by Episode 6, the `ep6` pack under its cap; `python qa/pwa/pwa.py --only packoffline` with
  `?pack=ep5,ep6` brings both packs up offline after one visit.
- Shipping is not part of the gate list: E6-integrate flips `EP6_LIVE` on the branch only; shipping (`overhaul:main`) stays
  Scott's or Stephen's explicit word.

---

## 13. The budget rule and the pack

### 13.1 Why everything is in the pack (measured 2026-11-09 in `D:\lq-ep6`)

The first download's load before the tap prompt is held by `qa/pwa/budget_ratchet.json` (`tapPromptMB` 2.34, never raised;
Scott's cap 2.5) and the initial download by `initialMB` 6.38 (cap 6.5). **Measured today** (Fact, `node
qa/integrate/x1_budget.mjs` and `node qa/pwa/precache.test.mjs`, both green, with Episodes 3 to 5 live):

| Measure | Now | Ratchet | Room |
|---|---|---|---|
| Before the tap prompt (wire) | 2,443,506 bytes (2.33 MiB: modules 0.69 + eager art and data 1.63) | 2,453,667 bytes (2.34 MiB) | **10,161 bytes** |
| Initial download (wire) | 6,663,018 bytes (6.354 MiB) | 6,689,914 bytes (6.38 MiB) | **26,896 bytes** to the ratchet, 152,726 to the 6.5 MiB cap |
| Packs (wire, code, data and art) | ep4 0.587 MB, ep5 0.484 MB (each of 1.0) | | |

The rule does not spend that room: Episode 6 adds **no net bytes** to the pre-tap load and **no bytes** to the initial
download. E6-pack measures again first (the numbers move with every merge into `overhaul`) and treats whatever room it
finds as zero.

- Every file of Episode 6 is a pack file: `src/data/ep6/**` (code and data, including the field code under
  `src/data/ep6/field/`), `src/data/maps/ep6_*.js`, `assets/{tiles,sprites,ui,backdrops}/ep6_*` and `assets/tiles/ep6.png`,
  `assets/ep6_manifest.json`. `build_pwa.py`'s `pack_of` keeps them out of the precache and the modulepreload block (with
  prefix `ep6_`).
- No `src/data/ep6/live.js`: the switch lives in `episodes.js` (the ep4 and ep5 precedent), so nothing of the pack is
  precached.
- Sound files `assets/audio/sfx/ep6_*` and `assets/audio/ambience/ep6_*` are added to `LAZY_PREFIXES` so they are
  runtime-cached instead of precached. Music is lazy already.
- **Any core-file change must be paid for by trimming core JS in the same change** (comments and dead code in precached
  `src/` files, never behavior), and the report gives the gzipped before/after of the pre-tap load.

### 13.2 The core seams (E6-pack owns all of them; budget about 300 gzipped bytes in, at least as many trimmed out)

| # | File | Change | Why |
|---|---|---|---|
| 1 | `src/game/packs.js` | add `ep6: { entry: '../data/ep6/index.js', prefix: 'ep6_', assets: 'assets/ep6_manifest.json', audioPack: 'ep6', hard: true, touches: ['ep5_sh_inn', 'ep5_saffron'], wanted: (f) => !!(f.ep5_complete \|\| f.ep6_started), enabled: () => EP6_LIVE }` and the import | the pack itself |
| 2 | `src/game/episodes.js` | `export const EP6_LIVE = false;` | the switch |
| 3 | `src/scenes/title.js` | the Episode 5 hook line generalized to Episodes 5 and 6 (or one more line beside it): when `EP6_LIVE` and a slot has `ep5_complete`, or `?ep=6`, `ensurePack('ep5')` then `ensurePack('ep6')`, then `globalThis.LQ_EP6 && LQ_EP6.title(this)` | the row, picker and name entry live in the pack (`src/data/ep6/title.js`) |
| 4 | `src/game/packFallback.js` | the `ep[45]_` landing regex becomes `ep[456]_` | an Episode 6 save never lands on Test Town |

Not seams, and why: `RULE_EXT` (`start`, `afterAction`) exists since Episode 5 and is enough for the Gale; Anchor reaches
`gale.js` through the existing `{ keep }` bridge; `delayUnit` is on the rule context. BATTLE 13.8's wished `h.skill` call
point stays a wish (E6-battle uses the bridge). Already exported and mutable (Fact, grepped 2026-11-09): `registerStory`,
`prependTalk`, `FLAG_IDS`, `ALL_SIDE_QUESTS`, `LEDGER`, `PLACES`, `REACHED`, `TINTS`, `NIGHT_TINTS`, `LAMP_TINTS`, `EXT`,
`INTERACT_TYPES`, `CREDITS_HANDOFF`, `QUEST_EXT`, `ENEMIES`, `ITEMS`, `SKILLS`, `ENCOUNTERS`, `ZONES`, `ZONE_LOOT`, `SHOPS`,
`NPCS`, `BANNERS`, `BOOKS`, `BARKS`, `BESTIARY`, `SPEAKER_NAMES`, `SCRIPTS`, `POLICY_EXT`, `BACKDROPS`, `BOSS_CARD`,
`SIGNATURE_TECHS`, `PIPS`, `PAGE_KINDS`, `RARE_NAME_EXT`, the `Planner` and `Actor` classes and `engine.audio.manifest`.
The field mechanic attaches itself from inside its own `EXT.vane.create` and from `world.js` on every map with a `wind`
block (the ep5 pattern), so **`src/scenes/field.js` is not edited**.

### 13.3 Audio through the pack

`src/data/ep6/audio.js` exports `{ music, sfx, ambience, jingles, pack }` in the `assets/audio/manifest.json` entry shape
(srcs `assets/audio/music/ep6_*.mp3`, `assets/audio/sfx/ep6_*.wav`, loop points, volumes, `pack: 'ep6'`). The entry merges
it into `engine.audio.manifest` (never overwriting an id) before `ensurePack` calls `audio.loadPack('ep6')`, **on every path
that brings the pack up, the quick start included** (a test asserts the ids resolve after `newGameEp6`).
`qa/pwa/precache.test.mjs` resolves sfx ids named under `src/data/ep6/` against the fragment (E6-pack). The main audio
manifest file is never edited.

### 13.4 Pack cap

`packCapsMB.ep6 = 1.0` (wire) in `budget_ratchet.json`; `qa/pwa/packs.test.mjs` asserts it (its fixed-caps `deepEqual` line
gains `ep6: 1.0`, E6-pack's one edit there). Expected: code and data about 0.28 MB, tiles, backdrops and pages about 0.32,
sprites about 0.28 (Episode 5 shipped 0.484 MB in all).

---

## 14. Risks, assumptions and decisions

**Assumptions.**
1. The Storm Scribe is a Keeper construct and the sixth fragment the Wind Script; the sky's list is a month old and names a
   page; the warm hand's own name has been taken (EPISODE6 section 8).
2. Three tracker tracks and a song-local instrument are within the pipeline's proven range (Episode 5 shipped three and the
   oud).
3. The Gale fits on the existing `RULE_EXT` with `delayUnit`. If a negative delay breaks the CTB invariants, E6-battle
   falls back to "Aloft foes are not moved; everyone else is blown back" and says so.
4. Gust lanes attach without editing `field.js` (an `EXT.create` hook and method wraps, as tide locks and sun and shade
   did). The forced step reuses `startStep` and `partyFollow`; if the input layer reads a held key as a step on the frame
   the ride unlocks, E6-world clears the held direction once on landing (the realplay test proves it).
5. Episode 5 is merged in `overhaul` when Episode 6 builds (Episode 6 patches its maps and reuses its pack skeleton, its
   `RULE_EXT` seam, its `keep` bridge and its fixes).

**Risks.**
- **Four chained packs** (ep3 for Emberpeak, ep4, ep5, ep6): a cold first entry could wait on all of them. E6-pack starts
  every fetch at once, orders only registration, and measures the worst case on the phone profile.
- **The order trap** (3.3): registering the patched Saffron maps before the ep5 pack loses the patch silently. A test covers
  both orders.
- **The pre-tap budget.** Every seam must be paid in the same change; the orchestrator rejects a report without the gzipped
  numbers.
- **Forced movement on a phone.** A ride takes control for a second; a long or surprising ride reads as a bug. Mitigation:
  rides at RUN pace, landing visible within a screen (mapcheck), every lane's chevrons point where it goes, and a ride
  never ends anywhere the player cannot step off.
- **The Gale could swing fights** (Aloft groups come round fast; a party that never braces falls behind). Mitigation: the
  sim's three knobs in 6.6, every group mixes Aloft and grounded but the first, and Defend is a full answer for one member.
- **Bram's MP economy** in the Scribe fight (the Episode 5 MP trap, PLAYTEST_REVIEW_7 item 4): Anchor costs 14; the
  Compass hushes Bram. Mitigation: a one-time hint when Bram drops under 14 MP with a Rewrite in the fight ("Keep something
  back to anchor us."), Auto keeps 28 MP, Ballast Stone is a second answer, and the beacon platform is a rest point.
- **The EXP ceiling at 27** (6.1): 100% of fights lands 27 EXP under Lv 28 at the Scribe. Mitigation: E6-battle reports the
  margin and trims a fight's EXP before it moves a boss target.
- **Lightning and photosensitivity.** Mitigation: 5.2's limits, measured in a test, off under reduceMotion.
- Pacing: 17 fights, about 200 boxes, the timer gate, the cut lines.
- Parallel waves: 6a's E6-battle needs nothing new from E6-pack (the `RULE_EXT` seam exists), so it can run its sim from
  the first hour; it registers its data through E6-pack's `index.js` once that lands.

**Cut lines, if the budget tightens** (each keeps a complete story):
- Cut 1: drop Piri's Dead Letters (the White Road letter moves to one line of Piri's talk) and the F1 Shove crate.
- Cut 2: drop the Emergency Locker and F2's side fan; `storm_observatory` falls back to `court`.
- Cut 3: merge F2 into F1 (Vex's relay and the Gale Engine move to F1's upper deck; `aeris_memory_2` with them) for a
  two-floor Observatory plus the Eye.

**Open for Scott and Stephen** (none blocks the build; defaults in brackets; full list with reasons in EPISODE6.md section
10): Bram's episode with Aeris as a guest [yes]; Vex booked the seats [yes]; who asked Vex [a Keeper, the name lifted off the
letter]; Vex's binding-mender line [this line]; the first page half, Vex keeps it, the hero's row unkept [as written]; the
sixth list hunts a page [yes]; two truth choices [yes]; Pippa is Liora's sister and lives [yes]; Aeris's memory re-aimed
[yes]; the canon renames [as listed]; Sel stays and the White Road letter [yes, unopened]; the cards [placeholder]; Fine
Print does not enter Episode 6 [base game only]; no portrait and no paid media [none]; shipping [Scott's or Stephen's word].
