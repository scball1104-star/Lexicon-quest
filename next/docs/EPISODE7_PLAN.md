# Episode 7 production plan: The Vanishing World

Owner: ep7-designer, Tuesday 2026-11-10 (Eastern), branch `scott/ep7-design`. Status: **PROPOSAL, docs only, nothing
built.** Story bible: `docs/story/EPISODE7.md`. When Scott and Stephen approve, this file is the contract the build agents
work from. Every build agent reads the repo's `AGENTS.md`, `docs/briefs/COMMON.md`, `DESIGN.md`, `docs/story/EPISODE7.md`,
this file and its own brief in `docs/briefs/E7-*.md`, in that order. House rules as always: no em dashes, no git, stay in
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

**What gets built.** One climb (the White Road, from a frozen lake where the Kestrel lands up to Palehaven's South
Icegate, with the Courier's Waystation on the way), one town with four interiors (Palehaven), one three-floor dungeon
plus a boss floor (the Frostbound Vault and the Stillheart), one new field mechanic (**name stones**: stretches of the map
the North has forgotten are a flat white fade; reading a name stone holds its path, and the party can hold **two** names
at once, so reading a third lets the oldest go; on the middle floor some names freeze doors shut while held, so the way on
is to let go; nothing is global and nothing has a timer), one battle rule (**Rime**: cold foes frost the party's names a
third at a time; at three a member is Frozen and loses a turn; Defend shakes it off), one hero skill (the hero's **Call**),
one mini-boss (the Pale Lantern), one three-phase boss with the hero at its center (the White Phantom, with the Closed Gate
and the Lost Letter), 7 ordinary enemies, 3 new tracker tracks plus reused ones, 8 SFX and 2 ambiences, about 31 beats in
36 registered scenes, 3 side stories, and the save rule carried over: no Episode 7 path ever writes a save slot that holds
another run. Target 60 to 90 minutes (planned at 72), party Lv 28 to 31.

**Everything is in the lazy `ep7` pack**, exactly Episode 6's rule: `src/data/ep7/**`, `src/data/maps/ep7_*.js`,
`assets/*/ep7_*`, `assets/tiles/ep7.png`, `assets/audio/{music,sfx,ambience}/ep7_*`, registered by mutation
(`registerStory`, `prependTalk`, `FLAG_IDS.push`, `ENEMIES`, `ITEMS`, `SKILLS`, `SCRIPTS`, `POLICY_EXT`, `BACKDROPS`,
`SIGNATURE_TECHS`, `PAGE_KINDS`, `RULE_EXT`, `EXT`, `TINTS`). Core changes are four one-line seams (section 13.2), and
every core byte they add is paid for by trimming core JS in the same change.

**What is reused (most of it).** The engine, field scene, cutscene API and `closeup` page inserts (`PAGE_KINDS`), the
event vocabulary (doors, boat doors, gates, flag gates, overlays with `if`/`ifNot`, push blocks, fonts, save bells,
chests, lights, Keeper mirrors), the pack system and its atlas merge, Episode 6's whole pack skeleton (`index.js` order,
`maps.js` order-trap pattern, `hooks.js`, `start.js`, `title.js`, the audio fragment, `scene.js` prototype wrapping, the
field system's attach-from-`EXT.create` pattern and its collision override on `map.base`, the held-key landing rule, the
`reveal()` pan, the timeline marker drawing, `SKILL_GATE`), Episode 3's per-run autosave and `pickRunSlot`, W9's Shove and
Dash Strike, the Lantern, the battle rules (CTB, Break, Fury, combos, telegraphs and `charge`, phases, summons, HP locks,
Defend, `delayUnit` with Episode 6's clamped `push()`), `RULE_EXT` (`start`, `afterAction`), the `{ keep }` bridge (BATTLE
13.8, 14.2), `SCRIPTS`, `POLICY_EXT`, `SIGNATURE_TECHS`, `learn: { flag }`, the simulator, the map kit, `mapcheck`, the
preview renderer, the NPC paper-doll builder, the enemy recolor pipeline, the backdrop builder, the tracker and SFX
generator, every jingle, the core sfx `bell_thirteenth`, `bell_toll`, `ice`, `name_restore`, the ambiences `moor_wind` and
`archive_hush` (fallbacks), the Kestrel prop from `ep6_tiles.json`, and the tracks `mystery`, `high_moor`, `sorrow`,
`triumph`, `battle`, `victory`, `gameover`, `zephyr` (Act I, the ep6 fragment). Painted source art the game has never
shipped: `environments.webp` cell 6 (the Hollow North: frozen cathedral and pine forest, cold aurora and snow),
`bosses.webp` cell 6 (the White Phantom).

**What is genuinely new.** Name stones (the pure `remember.js` hold rule, the fade, frost doors, the ghost trail, the
let-go animation), Rime (`rime.js` on the existing `RULE_EXT`), Call, an `ep7` tile sheet (the White Road kit, the
Palehaven kit, three Vault floor kits, the fade), 10 NPC specs, 7 enemy recolors, the Pale Lantern, the Phantom's three
looks and avatar, the Closed Gate and the Lost Letter, 1 portrait crop, 7 close-up page kinds, 3 tracks, 8 SFX, 2
ambiences, the whole `src/data/ep7/` pack, the Episode 7 quick start and its title row.

**Waves (section 11; up to three at once, disjoint paths).**
- **7a** foundations: E7-pack, E7-story, E7-battle.
- **7b** art and field: E7-tiles, E7-sprites, E7-world.
- **7c** maps and sound: E7-maps-a, E7-maps-b, E7-audio.
- **7d** assembly: E7-scene-ui, then E7-integrate (flips `EP7_LIVE` on the branch after the full gate list).
- **7e** review: E7-review (one read-only reviewer, art and play), then E7-fixes (written from the review by the
  orchestrator; not in this proposal).

**Done means.** A save that finished Episode 6 plays Episode 7 to its credits with no softlock; so does the `newGameEp7`
quick start, without touching any other run's save and with every Episode 7 sound present; the autoplay bot beats the
White Phantom at Lv 30 with zero game overs on desktop and phone; `node qa/run.mjs` green with Episodes 1 to 6 untouched
in meaning; `simulate.mjs --check` prints "All targets met" for all seven episodes (and `--cave --check`, `--tier 1
--check` unchanged), the new gold check included; the timed story read lands at 60 to 90 minutes with no more than 16
stone decisions on the main path; every new map preview viewed; shots with zero console errors; **Call cast with real keys
and a real tap, at a Farewell's target and at a Stilled ally** (section 12); the tap-prompt load does not grow (section
13).

### 0.1 Lessons carried in from Episode 6's reviews (CRITIQUE_8, PLAYTEST_REVIEW_8) and its build

| Episode 6 problem | Where Episode 7 answers it |
|---|---|
| Pacing ran 72 to 108 minutes against 60 to 90; 31 lane decisions, six of them re-rides; F2's duct loop sent the party home (PLAYTEST_REVIEW_8 item 3; re-timed 75 to 102 after the fix, PROGRESS 2026-11-10) | Planned at 72, not 75. 4.10: a decision budget of **16 stone decisions on the main path**, counted per read (a re-read counts), set before any map is drawn; mapcheck asserts no critical-path solution re-reads a stone more than 6 cells behind the party and no solution's walk is over 1.3 times the straight route (no loop home). E7-integrate times with `story_time.py` counting decisions, and a top over 95 minutes takes Cut 1 before anyone is asked to cut story |
| The Gale Engine was blown back by its own bellows Gust and acted twice a fight (item 1) | 6.3: Rime lands on the party only; no foe ever holds Rime, and nothing a foe does to the party slows that foe. The sim asserts no foe holds Rime and that the Pale Lantern and the Phantom each act at least once every two party rounds (6.6) |
| The F2 shortcut lift went down to F1 with no way back up (item 2) | 5.4: every Vault lift is two-way from the first build: F2's lift down to F1's basin has a twin up from the basin to F2's arena, both from `vault_f2_done`; the same for F3's stair back to F2 |
| Gold bought one tier 11 piece in town, not two; the fix was a 1,500 G chest (item 4, PR #55) | 7.6: the two town pieces and the two pre-F3 pieces are named, priced and checked by a new binding sim line `economy7` (battle gold at 100% of the fights plus main-path chests buys both with 300 G to spare); E7-battle tunes chest and foe gold first, prices only if a price leaves its tier |
| Defend was never said to brace (item 5) | 6.3: Mira's first-fight line names the button ("Defend and shake it off"); in Rime battles the Defend row's help reads "Shake off the cold." from day one |
| The Scribe was met at Lv 28, not 27 (item 6) | 6.1: the Phantom's margin is planned at about 620 EXP under Lv 31 at 100% of the fights (Episode 6 planned 27, which elites ate); E7-battle reports the margin with elites counted, and E7-integrate reads the bot's level |
| The chart-room bell spoke Episode 1's Willowmere line (item 7) | 4.3: every save bell in an Episode 7 map names its own text key (`ep7_watch_bell`, `ep7_stove`); a content test asserts no Episode 7 event uses an Episode 1 text key |
| A cold phone waited on the pack chain (item 8) | 3.3: the chain is now ep4, ep5, ep6, ep7 (plus ep3 for Emberpeak). E7-pack starts every fetch at once inside the pack and measures cold and warm; the hot-file fix in `packs.js` stays a named follow-up needing Scott's or Stephen's word |
| The bot never rested on the Observatory floors (item 9) | 12: the bot rests at each floor's font on arrival and at `font_v2b` before the Lantern; E7-maps-b reports each font's cell |
| A bot never opens the battle menu; Turn the Sky shipped uncastable in Episode 5 (PLAYTEST_REVIEW_7 item 1, protected in Episode 6) | 6.3 and 12: Call targets one ally, a menu path Anchor never used; `qa/battlescene/ep7_menu_cast.test.mjs` casts it through `menu.js` at a Farewell's target and at a Stilled ally, and `qa/realplay/ep7battle.py` does both with real keys and a real tap |
| The Scribe's HUD row left the Scribe in its later looks; the Compass crowded the hero (CRITIQUE_8 item 1) | 6.5: the Phantom's row keeps one anchor in all three looks; the Gate and the Letter stand in front-row foe slots with rows under their own feet; all three looks and both adds go in the row-placement test from wave 7a's data |
| Vex "hung over nothing" while standing on stone; the dock catch was narrated at the screen edge (CRITIQUE_8 item 2) | EPISODE7 section 1's camera rule: staged focus marks at least 12 tiles from a map's sides and 7 from its top and bottom, asserted by `qa/maps/ep7_*` against `STAGING_EP7.md`; every "fade" and "freeze" beat is drawn (tint, sprite alpha, HUD), never only narrated |
| Duct chevrons were the weakest read (CRITIQUE_8 item 3) and the contrast rule measured the wrong pair (item 9) | 5.1: the readability pairs are named up front: ghost trail against fade, held path against fade, fade against snow ground, each with its own floor, measured on the 844x390 crop |
| The first page's line reached full strength before its box (CRITIQUE_8 item 5) | 9.4: every close-up step's text fades in only on the box that says it; `ep7_page` `signed` is tested frame by frame |
| Episode 6's `mooring_post` collided with Episode 4's tile object | 2: every new id is grepped against `src/`, **every** `assets/tiles/*.json` fragment and every `assets/*manifest.json`, not only the base files (`waystone`, `kestrel`, `signal_lamp` and `hearth` are taken; 2 lists them) |
| A ride on a lane could surprise; held keys stepped once more on landing | 5.1: a stone read never moves the party; the only forced change is a path fading, which is refused while anyone stands on it. The held-key rule is not needed, and the realplay test proves no step is lost or added after a read |

---

## 1. Scope at a glance

| Thing | Count | Reused | New work |
|---|---|---|---|
| Maps | 11 new + 2 patches | interiors copied from Willowmere's and re-dressed; map kit, preview, mapcheck | `ep7_white_road`, `ep7_waystation`, `ep7_palehaven`, 4 `ep7_ph_*` interiors, `ep7_vault_f1/f2/f3`, `ep7_stillheart`; pack patches of `ep6_zl_inn` (wake trigger) and `ep6_zephyr` (the Kestrel's gangway north) |
| Field mechanics | 1 new (name stones) | overlays, flag gates, Shove, lights, `reveal()`, EXT, the ep6 attach pattern | `namestone` events; a pure `remember.js`; the `remember` map block; the fade and frost doors |
| Story scenes | 36 registered (27 main and chained, 7 side, 2 silent) | cutscene API, guards, Talk, journal, barks, vignette tint, `registerStory`, `closeup`, speaker swap | `src/data/ep7/story.js`, `STAGING_EP7.md` |
| NPCs | 6 new + Nox + memory actors + returns | paper-doll builder, `prependTalk`, speaker swap | specs, talk tables |
| Enemies | 7 ordinary + mini-boss + boss + 2 adds | rules, ai `basic`/`phased`, `charge`, HP locks, summons | the `cold` field on each foe, ai `pale_lantern`, ai `white_phantom` |
| Battle rule | 1 (Rime) | CTB timeline, Defend, Break, telegraphs, `RULE_EXT`, `delayUnit` | `src/data/ep7/rime.js` |
| Party skills | 1 | skills.js shape, `learn: { flag }`, `SIGNATURE_TECHS`, the `keep` bridge | Call |
| Items | 1 consumable, 8 key items, 16 bases, 6 uniques, 1 set | items.js, loot.js, rarity, affixes | tier 13 and 14 gear, affix tier 9 |
| Shops | 3 new | shops.js, shop scene | stock lists |
| Music | 3 new, 8 reused | tracker pipeline, name motif | `palehaven`, `frostbound_vault`, `boss_phantom` |
| SFX / ambience | 8 / 2 | generator | section 8.4 |
| Tiles | 1 new sheet | autotile, wall systems, the ep6 kit approach | `ep7.png` + `ep7_tiles.json` |
| Sprites | about 28 frame sets | recolor and derive pipelines, pack atlas merge | NPCs, 7 recolors, the Lantern, the Gate and the Letter, the Phantom x3, avatar |
| Portraits | 1 crop | portrait pipeline | `phantom` (crop); Nox none by default (9.5) |
| Backdrops | 5 + key art | backdrop builder (environments cell 6), the compose approach | section 9.3 |
| Close-ups | 7 page kinds, 11 modes | `PAGE_KINDS`, the EP6 pages approach | `ep7_chart`, `ep7_carving`, `ep7_tally`, `ep7_tag`, `ep7_seventh`, `ep7_page`, `ep7_letter` |

---

## 2. Id registry (the contract)

Every id below was grepped on 2026-11-10 against `src/`, `assets/manifest.json`, `assets/audio/manifest.json`, **every**
`assets/tiles/*.json` and every `assets/*manifest.json` (the check Episode 6 missed: its `mooring_post` is an object in
`assets/tiles/ep4_tiles.json`). No collisions in the list below. Collisions found and avoided: `call` (a debug key in
`src/core/debug.js`, so the skill is `call_name`), `held` (an input field in `src/core/input.js`, so the map block is
`remember`), `waystone` (an `ep5_tiles.json` object, so the event type is `namestone`), `hearth` (a core tile, so the
Palehaven object is `returning_hearth`), `corin` (Episode 2's watchman, so Nox's brother is Marten), `oren` (Episode 1's
baker), `stone_name` (a core sfx, so the read sound is `stone_hold`), `kestrel` and `signal_lamp` (`ep6_tiles.json`
objects: the Kestrel is reused as is, never redefined). **Prefixes:** maps and zones `ep7_` (the pack rule needs it);
encounters `e7w_` (the White Road), `e7v1_`, `e7v2_`, `e7v3_` (the Vault floors); art `ep7_`; sfx and ambience `ep7_` file
names. Never a bare `palehaven` map id (it is the music id), never `ph_` alone (always `ep7_ph_`), never `vault_` alone as a
map id. E7-battle and E7-story regrep every new id before use (the item, unique and affix names of section 7 above all).

### 2.1 Maps

| id | Banner (title / sub) | area | size | tileset | music | ambience | lighting |
|---|---|---|---|---|---|---|---|
| `ep7_white_road` | The White Road / Up to Palehaven | field | 30 x 56 | town + `ep7` kit | `high_moor` | `snow_wind` | none (overcast day); snowfall particles; tint `whiteout` only in its scene |
| `ep7_waystation` | The Courier's Waystation | interior | 14 x 10 | interior | `high_moor` (0.5) | `snow_wind` (0.4) | none; the stove a light pool once lit |
| `ep7_palehaven` | Palehaven / The Unlit Hearth; after `doors_reopened`: Palehaven / The Returned Names | town | 46 x 36 | town + `ep7` kit | `palehaven` | `snow_wind` | none; scenes set `dusk` and `night` |
| `ep7_ph_inn` | The Thawlight Lodge | interior | as `inn` | interior | town | none | none |
| `ep7_ph_shop` | Northwind Provisions | interior | as `item_shop` | interior | town | none | none |
| `ep7_ph_armory` | The Glass-Ice Armory | interior | as `smithy` | interior | town | none | none |
| `ep7_ph_watch` | The Keeper's Watch | interior | as `chapel` | interior | `mystery` (0.6) | none | dark 0.2, one lamp pool |
| `ep7_vault_f1` | The Frostbound Vault / I. The Vanishing Steps | dungeon | 40 x 30 | `ep7` | `frostbound_vault` | `vault_hush` | none, a cold blue cast |
| `ep7_vault_f2` | The Frostbound Vault / II. The Hall of Borrowed Light | dungeon | 40 x 30 | `ep7` | `frostbound_vault` | `vault_hush` | dark 0.45, a lamp pool over each held stone |
| `ep7_vault_f3` | The Frostbound Vault / III. The Stillheart Sanctum | dungeon | 34 x 40 | `ep7` | `mystery` | `vault_hush` | tint `aurora` (pack), dark 0.3, aurora bands overhead |
| `ep7_stillheart` | The Stillheart | dungeon | 26 x 22 | `ep7` | none until the scene | `vault_hush` (0.5) | tint `aurora`, dark 0.25; after `phantom_defeated` the thaw grade |

Patches (pack-side, never edits to `src/data/maps/ep6_*.js`): `ep6_zl_inn` gains the `ep7_morning` enter trigger;
`ep6_zephyr` gains the Kestrel's gangway north at the north dock (section 3).

### 2.2 Story flags (all pushed onto `FLAG_IDS` and declared in the pack's `flags.js` with a one-line meaning)

Main: `ep7_started`, `ep7_boarded`, `road_arrived`, `vex_carved`, `road_fight_done`, `call_learned`, `saw_sevens`,
`saw_palehaven`, `palehaven_arrived`, `met_keeper`, `keeper_told`, `vault_open`, `vault_entered`, `stillheart_key_found`
(chest flag), `vault_f1_done`, `bell_found`, `lantern_defeated` (encounter flag), `vault_f2_done`, `keeper_came`,
`stillheart_open`, `phantom_defeated` (encounter flag), `stillheart_restored`, `fragment7_get`, `seventh_list_get`,
`page_whole`, `nox_named`, `marten_named`, `doors_reopened`, `letter_sent`, `vex_name_whole`, `ep7_complete`.

Beats and world state: `ep7_morning_done`, `told_vex`, `spared_vex`, `valewyn_list_get`, `first_stone_read`,
`vault_f1_arrived`, `vault_f2_arrived`, `vault_f3_arrived`, `keeper_memory_1`, `keeper_memory_2`, `keeper_memory_3`,
`told_nox`, `spared_nox`.

Side: the Hearth `hearth_started`, `testimony_mirael`, `testimony_sol`, `testimony_eira`, `hearth_lit`, `hearth_done`; the
Reliquary `page_door_found`, `page_flame_found`, `page_lost_found` (chest flags), `reliquary_open`; Torr's streets
`streets_started`, `street_1_found`, `street_2_found`, `street_3_found` (chest flags), `streets_done`. Counter (not a
flag): `credits7_rolled`. Stones and frost doors carry no flag (they reset on every arrival: 5.1).

### 2.3 Key items (the pack's `items.js`, merged into `KEY_ITEMS`)

| id | name | icon | desc |
|---|---|---|---|
| `valewyn_list` | The Valewyn List | letter | Cheap paper, the cold hand. At the top, Vex's own name, half gone. |
| `stillheart_key` | Stillheart Crystal Key | key | A key of clear ice that does not melt in the hand. Opens the Stillheart's inner grate. |
| `seventh_list` | The Seventh List | letter | The oldest yet. THE NORTH. LET IT FORGET EVERY SOUL WHO CAN SAY THE FIRST KEEPER'S NAME. |
| `name_fragment_7` | Seventh Name Fragment | book | The Stillheart: every name of the realm, pressed into ice. |
| `witness_page` | Witness Page (counted, 3) | letter (reuse) | A page from the Keeper Book. |
| `street_plaque` | Street Plaque (counted, 3) | key (reuse) | A street name, half frosted. Torr wants it back. |
| `white_road_letter` | A Letter for Willowmere | letter | (Episode 6's item; Episode 7 gives a second desc by flag, the address restored, and takes it in `doors_reopen`) |

`white_road_letter` stays Episode 6's id: Episode 7 adds `descAfter: { flag: 'stillheart_restored', desc: 'TESS, AT
WILLOWMERE. From Marten, with a crossed seven in the date.' }` from its own pack (the Sky Compass precedent, BATTLE 14.5),
and gives it in `ep7_morning` when the party does not hold it. The first page is story state (`page_whole`) and stays with
Vex (EPISODE7 choice 11): not an inventory item. The Sky Compass is Episode 6's and needs no change.

### 2.4 Enemies, encounters, zones (section 6)

Enemies: `rime_wolf`, `snow_wisp`, `hush_owl`, `crystal_crawler`, `frostbound_revenant`, `ice_knight`, `rimed_page`,
`pale_lantern`, `white_phantom`, `closed_gate`, `lost_letter`. Encounters: `e7w_first`, `e7w_wolves`, `e7w_owls`,
`e7v1_wisps`, `e7v1_crawlers`, `e7v1_mixed`, `e7v2_knights`, `e7v2_revenants`, `e7v2_mixed`, `pale_lantern`, `e7v3_pages`,
`e7v3_knight`, `e7v3_mixed`, `white_phantom`. Zones: `ep7_white_road`, `ep7_vault_f1`, `ep7_vault_f2`, `ep7_vault_f3`,
`ep7_stillheart` in `EP7_ZONE_ORDER` (exported by the pack's `encounters.js`), kept out of `Object.keys(ZONES)` behind
`EP7_MAPS_LISTED` with the non-enumerable `defineProperty` pattern the X1, ep4, ep5 and ep6 packs use.

### 2.5 Scenes (`src/data/ep7/story.js`; map and trigger)

| Scene | Map | Trigger |
|---|---|---|
| `ep7_morning` | ep6_zl_inn | enter trigger from the pack patch (`if: ep6_complete`, counter `credits6_rolled`, `EP7_LIVE`, not `ep7_morning_done`, not `tier_1`) |
| `ep7_board` | ep6_zephyr | the gangway object at the north dock (`if: ep7_started`, `ifNot: ep7_boarded`) |
| `road_landing`, `name_under_ice`, `road_fight`, `first_stone`, `whiteout`, `palehaven_view` | ep7_white_road | on enter; step trigger at the Traveler's Wall; step row above it (after `vex_carved`); step trigger at the first gap; step trigger on the high stretch (after `first_stone_read`); step trigger at the Icegate |
| `waystation` | ep7_waystation | on first enter |
| `palehaven_arrival`, `meet_keeper`, `vault_gate`, `whole_page`, `doors_reopen` | ep7_palehaven | on first enter; `keeper` talk entry (first time); step trigger at the north gate (after `keeper_told`); on enter after `phantom_after` (the Vault door's arrival); chained |
| `keeper_and_vex` | ep7_ph_watch | step trigger inside the door (after `met_keeper`) |
| `vault_f1_arrival`, `keeper_memory_1` | ep7_vault_f1 | on enter; step trigger at the frozen gate |
| `vault_f2_arrival`, `keeper_memory_2`, `listening_bell`, `pale_lantern`, `reliquary` | ep7_vault_f2 | on enter; step triggers; arena trigger; the Reliquary object |
| `vault_f3_arrival`, `keeper_memory_3`, `keeper_comes` | ep7_vault_f3 | on enter; step trigger on the first landing; chained when the party reaches the second landing |
| `phantom`, `phantom_after`, `ep7_ending` | ep7_stillheart | step trigger row; after the battle; on enter after `doors_reopened` (the night return, a door from the square) |
| `hearth_start` (chains `testimony_eira`), `testimony_mirael`, `testimony_sol`, `hearth_light`, `streets_start`, `streets_done` | ep7_palehaven, ep7_white_road | NPC talk entries and the hearth object |
| silent: `vault_f1_lift`, `vault_f2_lift` | F1, F2 | step triggers that set `vault_f1_done`, `vault_f2_done` |

Count: 27 main and chained registered (the 30 beats of EPISODE7 section 1 less the optional farewells, the key chest and
the credits), 7 side (`hearth_start`, `testimony_mirael`, `testimony_sol`, `hearth_light`, `reliquary`, `streets_start`,
`streets_done`), 2 silent: 36. `testimony_eira` is chained from `hearth_start` (Eira is her own witness, as Kamal and Suri
were) and is not registered.

### 2.6 NPC ids (the pack's `npcs.js`, merged into `NPCS`)

New: `keeper` (Nox; the record in Palehaven and the Watch), `bryn`, `eira` (the witness and the Hearth), `eira_forge` (shop
`glassice_armory`, Ledger-excluded as "see eira"), `sol` (on the White Road), `sol_waystation` (shop `waystation_pack`,
Ledger-excluded as "see sol"), `maera` (shop `northwind`), `torr`, `mirael`, `ep7_innkeeper` (the North Watchkeeper,
Ledger-excluded). Scene spawns: `nox_t` (the Sanctum, the hearth, the roof; the speaker swap's second record),
`keeper_young_m`, `keeper_mid_m`, `keeper_mother_m` (memory tint), `courier_m` / `marten_m` (memory, speaker swap),
`phantom_v` (the Phantom's voice in memory 3, no actor), `vex` (as Episodes 2 to 6), `aeris_t` (the inn, the landing, the
square, the roof). Zephyr Landing, Saffron Haven, Valewyn, Emberpeak, Hollowmere and Willowmere NPCs keep their ids and get
Episode 7 entries through `prependTalk` (Tess's and Hazel's are in the bible). No portrait aliases (`hooded_sage` is held
for the First Keeper; 9.5).

### 2.7 Audio ids

Music: `palehaven`, `frostbound_vault`, `boss_phantom` (new); `mystery`, `high_moor`, `sorrow`, `triumph`, `battle`,
`victory`, `gameover` (reused, core), `zephyr` (reused, the ep6 fragment, Act I). SFX: `stone_hold`, `stone_letgo`,
`frost_seal`, `rime_bite`, `rime_freeze`, `call_cast`, `farewell_read`, `farewell_break` (new); `bell_thirteenth`,
`bell_toll`, `ice`, `name_restore` (core, reused, never redefined). Ambience: `snow_wind` (new, fallback `moor_wind`),
`vault_hush` (new, fallback `archive_hush`).

### 2.8 Skills, battle state, tints, particles

Skill `call_name` (the hero, display name "Call"). Enemy skills: `farewell`, `borrowed_light`, `stillheart_blizzard`,
`whiteout_breath`, `icicle_lance`, `shut`, `mend`, `cold_ink`, `pale_flame`, `lamplight_chill`, plus ordinary moves named
in 6.2 (each id grepped by E7-battle before use). Battle state (not statuses): each party member's Rime (0 to 3), Frozen,
Warm and Stilled, the pinned Farewell. No new status. Tints: pack tints `whiteout` (the White Road scene: a pale lift, 2 s
fade in) and `aurora` (F3 and the Stillheart: low, cool, the party's floor kept readable). Particles: the existing dust and
sparkle kinds (snowfall on the road and in town, ice motes in the Vault, the thaw's running light).

---

## 3. The world link: the Cloudhouse Inn and the north dock

Episode 6 ends with the party waking at the Cloudhouse Inn (`ep6_zl_inn`, mark `inn_bed`). Episode 7 patches the
**registered** Episode 6 maps from inside the `ep7` pack (`src/data/maps/ep7_patches.js`, the `ep6_patches.js` pattern),
never the files `src/data/maps/ep6_*.js`:

1. **`withEp7Wake(ep6_zl_inn)`**: an enter trigger `ep7_wake` at (0, 0) with `script: 'ep7_morning'`, `on: 'enter'`, and
   marks `compass_sill`, `aeris_door7` beside the existing `inn_bed`.
2. **`withNorthBerth(ep6_zephyr)`**: at the north dock (mark `north_dock`, where the Kestrel is already moored as Episode 6's
   prop), the gangway object `north_gangway` (`script: 'ep7_board'`, `if: ep7_started`, `ifNot: ep7_boarded`) and a
   boat-kind door `berth_white_road` on the same cell to `ep7_white_road` `lake_landing` (`if: ep7_boarded`). Every Episode
   6 mark, event and walk result unchanged; `isles_return`'s arrival at the north dock is untouched (it needs
   `cloud_library` and has long run).
3. **Order trap (must not miss).** `registerMap` overwrites by id and the `ep6` pack registers both maps itself (after
   awaiting ep5). The ep7 pack's `maps.js` therefore **awaits the ep6 pack first** (`await ensurePack('ep6')`), then reads
   each registered module with `peekMap(id)` and registers the patched one. `packs.js` `ep7.touches` lists `ep6_zl_inn`
   and `ep6_zephyr` so `world/maps.js` waits on both packs (`packsForMap`). The chain is now ep4, ep5, ep6, ep7 (and ep3 for
   Emberpeak): E7-pack keeps every fetch starting at once and orders only registration, and measures the worst-case entry
   time to the inn on the phone profile (target: under 3 s warm, under 8 s cold; PR #57 measured 2.1 to 2.3 s warm and 6.6
   to 6.8 s first visit live with Episodes 4 to 6, PROGRESS 2026-11-10). If the cold entry is over 8 s, PLAYTEST_REVIEW_8
   item 8 (fetch every pack at once on a resume, in the hot file `src/game/packs.js`) is the fix, and it waits for Scott's
   or Stephen's word.
4. Tests: the two maps load unpatched with the ep6 pack only and patched with both; with `EP7_LIVE` off no trigger fires
   and no gangway is drawn; the berth's door lands on a walkable cell.
5. The return route: `ep7_white_road`'s landing holds a boat-kind door back to Zephyr Landing's north dock (the Kestrel,
   present from `road_arrived`). Palehaven's south gate leads down the White Road; revisits use the road and the Kestrel.

The Keeper mirror network gains no new pair (cut line 1 can restore one at the hearth).

---

## 4. Maps

General rules: DESIGN 5.1 format and MAPS.md conventions; every scene mark exists and is reachable; enemy counts match
`ZONES[zone].plan`; every puzzle reads on screen without text; lit paths lead forward, dead ends hold chests; render
previews with `tools/maps/preview.py` and view them. Coordinates are approximate; the map author records exact cells in
`docs/MAPS_EP7_A.md` / `docs/MAPS_EP7_B.md`.

**Phone rule.** At 844x390: the fade (forgotten map) must never read as walkable snow (flat white, at most a faint paper
grain, no footprints, no shading); snow ground beside it must read as ground (texture, footprints, small drifts); a held
path must read as a solid road of packed blue-white ice with footprints across the fade; an unheld path must still be
visible as a faint ghost trail of footprints on the fade, so the player sees where a stone would put a road before
reading it; every stone's state must read at rest from two tiles away (dim, lit, or lit with a slow flicker for the oldest
held, which goes next); a frost door must read as clear solid ice with something frozen in it, and as open floor once
melted. Field foes carry a dark outline and a cool rim so they never vanish on snow or the fade.

**Camera rule** (EPISODE7 section 1; CRITIQUE_8 item 2). Every staged scene's focus marks are at least 12 tiles from the
map's left and right edges and 7 from its top and bottom, or the map is widened until they are. `qa/maps/ep7_*` asserts it
for every mark listed in `STAGING_EP7.md`.

### 4.1 `ep7_white_road`: The White Road (30 x 56, field, tall)

A pale road climbing north from a frozen lake through black pines into the mountains, with gaps where the road has been
forgotten. Bottom (south) to top (north). Overcast day; snowfall. `remember` block: 6 stones, 5 paths, no frost door.
- **The lake (y 48 to 55).** `lake_landing` (15, 52, 'up') from Zephyr's gangway; the Kestrel on the ice (the ep6 prop,
  reused); Aeris at `aeris_landing`; the boat-kind door `kestrel_back` to `ep6_zephyr` `north_dock` (`if: road_arrived`);
  `road_landing` on enter. A wood chest (`hi_potion` x2).
- **The Traveler's Wall (y 43 to 47).** The wall (decor, 6 x 3, carved names) on the west side of the road; `wall_trig` at
  about (13, 45): `name_under_ice` (Vex at `vex_wall`, the party stops two rows below). No foe.
- **The first bite (y 39 to 42).** `fight_row` across x 8 to 22 at y 41, `if: vex_carved`: `road_fight`, scripted
  `e7w_first`. One placed group after it (`e7w_wolves`).
- **Gap A (y 33 to 37): Lesson A (read, cross).** The road goes white for 8 cells; stone `ns_asta` at the near edge on
  ground; its path straight across (`first_trig` runs `first_stone` as the party approaches; Sol at `sol_twine`). 1
  decision.
- **Gap B (y 24 to 32): Lesson B (two at once).** A ledge in the middle of a wide gap: stone `ns_bo` holds the path to the
  ledge, stone `ns_nyx` on the ledge holds the path off it; both needed together, and holding both lets Asta's path (behind)
  go. 2 decisions. One group (`e7w_owls`) on the far side. An iron chest on a ledge west of the gap held by `ns_ilka`
  (optional: Torr's plaque #1, `street_1_found`, present `if: streets_started`, else `hi_ether`; 1 optional decision).
- **The high stretch (y 16 to 23).** `whiteout_trig` at about (15, 20): `whiteout`. Then Gap C (Lesson C, let go safely):
  stone `ns_senna` beyond the whiteout; reading it lets Bo's path go (behind, harmless); bark `first_letgo`. 1 decision.
- **The Courier's Waystation (y 10 to 15).** A one-room hut beside the road (prefab with `doorAt`) to `ep7_waystation`.
  A gold chest behind it, "the Courier's Strongbox" (1,500 gold: the town-gold line of 7.6).
- **The Icegate (y 1 to 6).** `icegate_trig` at about (15, 4) with the decal `palehaven_far` (environments cell 6,
  quantized) in the overhead layer: `palehaven_view`. The exit north to `ep7_palehaven` `south_gate`.
- Main-path decisions: 4 (A 1, B 2, C 1). Enemies (2 placed + the scripted one): e7w_wolves 1, e7w_owls 1. Chests: wood
  (lake), iron (Ilka ledge: plaque or ether), gold (strongbox, 1,500). Marks: `lake_landing`, `aeris_landing`, `vex_wall`,
  `wall_stop`, `fight_row`, `foes_drop`, `sol_twine`, `gap_a`, `gap_b`, `ledge_b`, `whiteout_mid`, `mira_fade`, `bram_fade`,
  `gap_c`, `waystation_door`, `icegate`, `palehaven_far`, `north_exit`.

### 4.2 `ep7_waystation`: The Courier's Waystation (14 x 10, interior)

A courier's rest hut: a cold stove (a `font`-type rest and save once lit; its own text key `ep7_stove`), a bench, the post
box (inspect), the tally on the doorframe (`tally_trig` two tiles in, on first enter: `waystation`, close-up `ep7_tally`),
Sol at a counter as `sol_waystation` (shop `waystation_pack`). Marks `stove`, `tally`, `party_stop`, `sol_counter`.

### 4.3 `ep7_palehaven`: Palehaven (46 x 36, town)

A Dragon Quest town that reads at a glance on a phone, built around one image: the square with the cold hearth in the
middle, iced doors all round it, the Keeper's Watch at the north end, and the frozen cathedral beyond the pines on the
north skyline (environments cell 6, the `cathedral_far` decal in the overhead layer, flickering by a 2-frame alpha swap,
never faster than once in 3 s). The hearth sits at about (23, 18), at least 12 tiles from each side (the camera rule).
- **South gate** (from the White Road; mark `south_gate`; Bryn at `bryn_gate`). **The square (centre):** the Returning
  Hearth `hearth` (object `returning_hearth`, 2 x 2: cold before `hearth_lit` or `doors_reopened`, lit after), the Vanishing
  Mark `vanishing_mark` (two states: the hollow growing; filled after `doors_reopened`), six iced doors `iced_a` to `iced_f`
  (two states: iced with no name; open with a name glint after `doors_reopened`), the Northward Beacon `beacon_north`
  (inspect, canon text).
- **The north end:** the Keeper's Watch (door to `ep7_ph_watch`; the Keeper at `keeper_lamp` before `keeper_told`), the
  north gate `vault_gate_obj` (a gate, `if: vault_open` open) and the pine walk to the Vault door `vault_door` (to
  `ep7_vault_f1` `basin`), and from `doors_reopened` a second door `nave_door` to `ep7_stillheart` `roof` (the ending).
- **West:** the Thawlight Lodge. **East:** Northwind Provisions (Maera). **South-east:** the Glass-Ice Armory (Eira at the
  forge). **South-west:** Torr's steps with his ledger (mark `torr_steps`), Mirael's house (`mirael_door`).
- Marks: `south_gate`, `bryn_gate`, `hearth`, `hearth_n`, `hearth_s`, `hearth_w`, `hearth_e`, `keeper_lamp`, `watch_door`,
  `vault_gate`, `vault_door`, `nave_door`, `inn_door`, `shop_door`, `armory_door`, `torr_steps`, `mirael_door`, `crowd_a` to
  `crowd_f`, `aeris_square`, `vex_step`, `cathedral_far`.

### 4.4 Interiors (copy the Willowmere counterpart's layout and exits, then re-dress)

| id | from | contents |
|---|---|---|
| `ep7_ph_inn` | `inn` | the North Watchkeeper (inn, 140 gold), fur bedrolls, a stove, frosted windows, mark `inn_bed` (the post-credits wake point). |
| `ep7_ph_shop` | `item_shop` | Maera (shop `northwind`), drying herbs, a kettle always on. |
| `ep7_ph_armory` | `smithy` | Eira at the forge (`eira_forge`, shop `glassice_armory`), a glass furnace, lenses on cords. |
| `ep7_ph_watch` | `chapel` | the Keeper's Watch: letters face down on every surface (inspect), an empty frame on the wall (inspect; filled after `nox_named`), a cold lamp, the save bell with **its own** text key `ep7_watch_bell` (PLAYTEST_REVIEW_8 item 7), `watch_trig` two tiles in. Marks `watch_stage`, `keeper_chair`, `vex_door`, `frame`. |

### 4.5 The `remember` block (how a map declares name stones)

A map with the mechanic adds a `remember` block (E7-world reads it; mapcheck models it):
```js
remember: {
  capacity: 2,                        // names the party can hold at once (2 on every Episode 7 map)
  paths: [ '....aaaa....', ... ],     // a lowercase letter: a fade cell that is that stone's path; '.' = none. Map-sized.
  frost: [ '......D.....', ... ],     // optional: an uppercase letter: an ice cell, SOLID while that stone is held
  start: ['d'],                       // optional: stones held on arrival, oldest first (F2's grip)
}
```
Path cells sit over `fade` (collision `void`). Frost cells sit over walkable floor. **The rule (one for the whole
episode):**
- **Reading.** A `namestone` event (`stone: 'a'`, `name: '<text key>'`) is confirmed while facing it from ground. If the
  stone is not held, it becomes the newest held stone; if it is held, it becomes the newest (a re-read: this is how the
  player chooses which name goes next). If the held count is now over `capacity`, the oldest held stone lets go.
- **Held.** Every fade cell under a held stone's letter is walkable (drawn as `icepath`). Every frost cell under a held
  stone's uppercase letter is solid ice.
- **Let go.** A stone that lets go: its path cells go back to fade (void) and its frost cells melt (walkable). A read whose
  let-go would put fade under any party member (leader, followers, a cell being stepped from), or whose new hold would put a
  frost cell under one, is **refused** (`buzzer`, bark `would_fade` once, then a float line): nothing changes.
- **No cell belongs to two paths or two frost doors** (mapcheck), so every cell has one owner and the rule reads at a glance.
- Deterministic, no randomness, no timers. Recompute on load and on every read.
Authoring rules mapcheck enforces: every stone and every stone approach is walkable ground, never a path or frost cell; at
most 5 stones per map (so every state can be searched: ordered holds of up to 2 from 5 stones, 26 states); every path cell
is visible within one phone screen of the stone that holds it, or the read pans (5.1); no enemy, NPC or trigger stands on a
path or frost cell.

### 4.6 `ep7_vault_f1`: The Vanishing Steps (40 x 30, galleries over the fade)

The teaching floor. Frost-brick galleries and ice-glass landings with the fade between, stairs that stop in white, a stone
on every landing, the cathedral's undercroft pillars rising out of nothing.

| Area | Approx. floor | What it does |
|---|---|---|
| A. The Thawlight Basin | x 17 to 23, y 24 to 28 | Arrival (`basin` 20, 27, 'up') from Palehaven's Vault door, the Thawlight Recovery Basin font `font_v1` (rest and save, `safe`). `vault_f1_arrival` on enter. The lift `lift_f1_up` to F2's arena (`if: vault_f2_done`: the two-way shortcut, 5.4). No enemies. |
| B. By Reach | x 4 to 30, y 15 to 23 | **Puzzle B (the next path is the one you just read):** stone `ns_arvo` holds a path to a landing with stone `ns_liesl`; Liesl's path goes on west. Read, cross, read, cross; the first lets go behind you. 2 decisions. The frozen gate with `memory1_trig` (`keeper_memory_1`). Two groups on firm galleries. |
| C. Keep the Near One | x 26 to 38, y 4 to 18 | **Puzzle C (re-read to choose who goes):** two paths meet at a landing with a third stone; reading it would let go the path you need next, unless you first re-read that one so the other is oldest. 2 decisions. Bark `first_reread` (Mira: "Say it again and it's the newest. The old one goes first."). One group. |
| D. The Side Gallery | x 2 to 14, y 4 to 14 | Optional: a dead-end gallery behind a stone pair (`ns_oskar` and the held Liesl; 1 optional decision): an iron chest (Torr's plaque #2, `if: streets_started`, else `hi_ether`). A Dash-cracked ice crate to a gold chest (`winterwatch_boots`). One group. |
| E. The Northern Balcony | x 12 to 28, y 1 to 6 | The gold chest `stillheart_key` (canon, flag `stillheart_key_found`) on a balcony reached by the path already held from C (0 decisions). The Winterwatch Provision Cache (iron, 1,500 gold, main path: the gold line of 7.6). The lift up; its trigger sets `vault_f1_done`. A Dash crate (Torr's plaque #3 cache, optional). |

- Main-path decisions: 4. Enemies (5): e7v1_wisps 2, e7v1_crawlers 1, e7v1_mixed 2. Chests: wood (B, `hi_potion` x2), iron
  (D, plaque or ether), gold (`winterwatch_boots`, Dash), gold (`stillheart_key`), iron (the Cache, 1,500), wood (A,
  `ember_tea` x2). Marks: `basin`, `font`, `by_reach`, `frozen_gate`, `keep_near`, `side_gallery`, `balcony`, `lift_up`,
  `lift_f1_up`.

### 4.7 `ep7_vault_f2`: The Hall of Borrowed Light (40 x 30, roofed, dark 0.45)

A long dark hall of letter niches and lamp brackets; the only light is borrowed: a lamp pool burns over every held stone
(drawn by the lighting layer from the system's held set), so the hall's dark itself shows what the party holds. **The
inversion:** the floor starts with a stone held (`start: ['d']`), the Phantom's grip, and that name freezes a door shut.
The way on is to let it go.

| Area | Approx. floor | What it does |
|---|---|---|
| A. Stair Foot | x 2 to 10, y 22 to 28 | Arrival; `vault_f2_arrival`; font `font_v2`. The lift `lift_f2_down` to F1's basin (`if: vault_f2_done`). |
| B. The Grip | x 2 to 22, y 10 to 21 | **Puzzle B (let go to go on):** stone `ns_dagny` is held on arrival and its frost door `D` seals the hall's west arch. Read `ns_hob` and `ns_runa` (their paths lead on past the arch) and Dagny lets go: the door melts. 2 decisions. Bark `first_grip` (Bram: "That door's holding on to somebody."). The letter wall with `memory2_trig` (`keeper_memory_2`). Two groups. |
| C. The Bell Bay | x 16 to 28, y 2 to 10 | **Puzzle C (borrowed light):** the bay is dark; one stone on the near side, its path lit by its own lamp, reaches the bell. 1 decision. The Listening Bell (`bell_trig`, `listening_bell`), placed so the party stops two rows below the tag. |
| D. The Side Galleries | x 26 to 38, y 2 to 18 | Three witness pages (wood chests `page_door`, `page_flame`, `page_lost`, flags as 2.2), any order. **The Reliquary:** behind frost door `R`, which melts only while the party holds the side galleries' two stones `ns_tuva` and `ns_kell` and so lets the main route's stones go (a pair the main route never needs; 2 optional decisions); `reliquary_obj` (`script: 'reliquary'`) opens it (gold chest present `if: 'reliquary_open'`: 450 gold, 2 `hi_ether`, book `keeper_book`). A wood chest (`hi_potion` x2). One group. |
| E. The Lamp Gallery | x 14 to 26, y 12 to 24 | The Pale Lantern's arena (`lantern_trig`, `pale_lantern`), a font `font_v2b` before it. An iron chest by the arena door (1,200 gold, main path: the gold line). After the win: the lift up; its trigger sets `vault_f2_done`. One group on the approach. |

- Main-path decisions: 3 (B 2, C 1). Enemies (4): e7v2_knights 1, e7v2_revenants 1, e7v2_mixed 2, plus the Lantern. Chests:
  iron (B, rolled), gold (the Reliquary, optional), wood x3 (pages), wood (D, potions), iron (E, 1,200). Marks: `arrival`,
  `grip`, `letter_wall`, `bell_bay`, `bell_stop`, `side_galleries`, `reliquary`, `arena`, `lantern_spot`, `lift_up`,
  `lift_f2_down`.

### 4.8 `ep7_vault_f3`: The Stillheart Sanctum (34 x 40, tint `aurora`, dark 0.3)

The cathedral's nave from below, bottom (south) to top (north): three landings round tall ice pillars, the fade between
them, aurora bands drifting across a broken roof far above, and the round door at the top. Not the darkest map (the
Episode 6 F3 rule is not repeated): the quietest. Gate: F3 mean luma between F1's and F2's, with the party's floor at or
above luma 0.22 on the phone.

| Area | Approx. floor | What it does |
|---|---|---|
| The first landing | x 8 to 26, y 32 to 38 | Arrival (`vault_f3_arrival`), the font `font_v3` (rest and save; Talk names the F2 lift back), `memory3_trig` (`keeper_memory_3`). |
| Shelter | x 4 to 30, y 25 to 31 | **One stone, one crossing** with the Keeper Charter's first word cut over the stair (inspect): 1 decision. One group. |
| Remember | x 4 to 30, y 16 to 24 | **Two stones, held together while a frost door stands between them**: reading the second freezes a door on the way back, so the party crosses first, then reads. 2 decisions. `keeper_trig` at the landing's top (`keeper_comes`, chained; the Keeper arrives at `keeper_stair` and waits at `keeper_wait_1` to `keeper_wait_3`). A hidden stone in Keeper ink (`lantern: true`, the Episode 1 hidden-ink rule) off the west pillar holds a short path to a gold chest `road_home`. One group. |
| Return | x 4 to 30, y 6 to 15 | **A frost door and a path from one stone**: holding `ns_ansel` opens his path and seals a door; the other stone on the landing re-reads to let him go once across. 2 decisions. One group. |
| The round door | x 12 to 22, y 1 to 5 | The round door `round_door` (`if: stillheart_open` open; no keyhole: the Keeper's hand, story), the inner grate (`stillheart_key`, `door_boss` style) to `ep7_stillheart` `entry`. A wood chest (`ember_tea` x2). 0 decisions. |

- Main-path decisions: 5. Enemies (4): e7v3_pages 2, e7v3_knight 1, e7v3_mixed 1. Chests: gold (`road_home`, Lantern),
  iron (Return, rolled), wood (`ember_tea` x2). Marks: `arrival`, `font`, `memory3_spot`, `shelter`, `remember`,
  `keeper_stair`, `keeper_wait_1` to `keeper_wait_3`, `return`, `round_door`, `party_stop_door`, `grate`.

### 4.9 `ep7_stillheart`: The Stillheart (26 x 22)

A round floor under the broken roof, the aurora overhead (an animated overhead band, 3 frames, slow), the heart of ice in
the middle (a 3 x 4 object, frames: frozen with names moving, thawed running bright), the Phantom's map actor
`white_phantom` (sprite `phantom_avatar`) standing over it. Step trigger row `phantom_trig` about row 15. After
`phantom_defeated`: the seventh list (a decal frozen into the floor), the ice block with the half page (`page_block`, 2
frames: frozen, opened), the thaw grade (tint off, a warm lift), the door `nave_down` back to `ep7_vault_f3` `round_door`
and the door `square_return` straight to `ep7_palehaven` `vault_door` (its arrival runs `whole_page`). For the ending
(`ep7_ending`, on enter from `nave_door` after `doors_reopened`): night, the staircase of written light as an overhead prop
(`star_stair`, 3 frames, rising out of the roof), actors `nox_t`, `vex`, `aeris_t` at marks. Marks: `entry`, `heart`,
`party_stop`, `nox_enter`, `list_spot`, `page_block`, `roof`, `stair_foot`, `vex_rail`, `aeris_rail`.

### 4.10 The decision budget (counted before any map is drawn; E7-integrate times against it)

| Map | Main-path decisions | Optional |
|---|---|---|
| `ep7_white_road` | 4 (A 1, B 2, C 1) | 1 (Ilka's ledge) |
| `ep7_vault_f1` | 4 (B 2, C 2; E 0) | 1 (the side gallery) |
| `ep7_vault_f2` | 3 (B 2, C 1) | 2 (the Reliquary pair) |
| `ep7_vault_f3` | 5 (Shelter 1, Remember 2, Return 2; the round door 0) | 0 |
| **Total** | **16** | 4 |

A decision is one stone read (a re-read counts). Episode 6 counted 31 (PLAYTEST_REVIEW_8 item 3). At 0.5 to 1 minute each
the main path spends 8 to 16 minutes on stones. A map author who needs more decisions than the table names takes them from
another map of the same table, never adds, and says so.

### 4.11 Marks and named events checklist (for `qa/maps`, mirrored in `STAGING_EP7.md`)

| Map | Marks / named events |
|---|---|
| `ep6_zl_inn` (patch) | `ep7_wake`, `compass_sill`, `aeris_door7`; `ep6_zephyr` (patch): `north_gangway`, `berth_white_road`, mark `vex_seat` |
| `ep7_white_road` | as 4.1; triggers `wall_trig`, `fight_row`, `first_trig`, `whiteout_trig`, `icegate_trig`; stones `ns_asta`, `ns_bo`, `ns_nyx`, `ns_ilka`, `ns_senna`; door `kestrel_back` |
| `ep7_waystation` | as 4.2; NPC `sol_waystation`; trigger `tally_trig`; object `stove` |
| `ep7_palehaven` | as 4.3; NPCs `keeper bryn eira torr mirael`; objects `hearth`, `vanishing_mark`, `iced_a` to `iced_f`, `beacon_north`, `vault_gate_obj` |
| `ep7_ph_*` | as 4.4; NPCs `maera`, `eira_forge`, `ep7_innkeeper` |
| `ep7_vault_f1` | as 4.6; stones `ns_arvo`, `ns_liesl`, `ns_oskar` and C's two; chest `stillheart_key`; lift `lift_f1_up` |
| `ep7_vault_f2` | as 4.7; stones `ns_dagny`, `ns_hob`, `ns_runa`, `ns_tuva`, `ns_kell`; frost doors `D`, `R`; object `reliquary_obj`; trigger `bell_trig` |
| `ep7_vault_f3` | as 4.8; stones per landing (5 at most), the hidden stone; doors `round_door`, `grate` |
| `ep7_stillheart` | as 4.9; actor `white_phantom`; objects `heart`, `page_block`; doors `nave_down`, `square_return` |

The stone names are flavor (EPISODE7 choice 13): the LEGACY Snowrest names Asta, Bo and Nyx on the road, new northern names
elsewhere (each grepped free on 2026-11-10). A name is shown once, in the read's float line ("BO. The road remembers him."),
and is never needed to solve anything.

---

## 5. Field systems (E7-world)

### 5.1 Name stones: the Episode 7 field mechanic

**Why this one.** It is the North's own logic (root "Villages have become gaps in the map", canon Sol's "Some paths
disappear while I am walking them", LEGACY Snowrest's "removing the footpaths and the names of those who walked them",
canon Eira's "The northern beacon still shines if you speak your name beside it"), it reads from the floor art alone (a
white gap, a faint trail of footprints across it, a stone with a dim lamp; read it, the trail becomes a road and the lamp
lights), it needs no timing (no step timers: phone-safe), it adds no damage tiles and no word grids, and it costs little:
one pure hold rule, the collision change through the override path Episodes 5 and 6 already use, and one ordinary event
type.

**Why it plays differently from tide locks, sun and shade, and gust lanes.** Tide locks were one level per basin set at a
wheel; sun and shade was one hour for the floor; both were state the player sets, then walks through. Gust lanes were
movement the player commits to. Name stones are **a memory the player budgets**: any stone is one press and its result is
on screen at once, but the party can only hold two, so the puzzle is which two, in what order, and when to let one go. No
stone has more than two states, there is no dial anywhere, and nothing moves the party. The episode inverts its own rule
once: on the road and F1 a held name makes a way; on F2 a held name can also shut one, and the way on is to let go. That
inversion is the episode's subtext in a mechanic (the Phantom holding names too tightly; Nox opening the door), shown, never
said.

**Event types** (new, in the existing `{ id, type, x, y, if?, ifNot? }` shape, registered on `EXT` by the pack):

| type | fields | behavior |
|---|---|---|
| `namestone` | `stone` (a letter of the map's `remember.paths` or `frost`), `name` (a text key in the pack's `text.js`), `sprite?` (`namestone` outdoors, `name_plate` indoors), `lantern?` (hidden until the Lantern is lit, the Episode 1 hidden-ink rule) | Solid, on ground, faced from ground. Confirm reads it (5.1 rule). Drawn as a cairn or an iceglass plate with a small lamp: dim (not held), lit (held), lit with a slow 2-frame flicker (the oldest held, which goes next). The read shows one float line with the name and plays `stone_hold`; a let-go plays `stone_letgo`; a refused read plays `buzzer` and the bark. |

Frost doors are not events: they are cells of the `remember.frost` grid, drawn by the system (clear ice with a frozen glint
while solid; melted floor after), so they can never be out of step with their stone.

**The rule** (`src/data/ep7/field/remember.js`, pure, node-tested):
- `compile(mod)` returns the model (path cells per stone, frost cells per stone, capacity, start) or null.
- `held(model, state)` returns the ordered held list (oldest first) for a state (`state.order`).
- `read(model, state, stone, partyCells)` returns `{ ok, state, letGo: [stone] | [], refused?: 'fade' | 'frost' }`: the
  rule of 4.5, with the refusal checked against every party cell.
- `walkable(model, state, x, y)` returns `true | false | null` (null: not a path or frost cell; the base map decides).
- Deterministic, no randomness, no timers. Recompute on load and every read. Budget: under 1 ms for a 40 x 40 map with 5
  stones and 200 path cells.

**Collision, the read and drawing.** The system applies the rule through Episode 6's override path: every path cell's
collision on `map.base` is `void` unless its stone is held; every frost cell is solid while its stone is held. A read locks
input only for its animation (a held path draws in over 16 frames from the stone outward; a let-go fades over 16 frames;
instant under reduceMotion), then unlocks; nothing moves the party, so no held-key rule is needed (the realplay test of 12
proves a held direction neither drops nor adds a step across a read). The fade is a flat A1 terrain (2 frames, a slow
paper grain at most); a held path is the `icepath` tile with footprints; an unheld path is the fade with a ghost trail of
footprints drawn by the system in code (every cell, 1 px pale blue-grey prints, at least 0.08 luma below the fade on the
phone crop); a held path at least 0.2 luma below the fade and textured; snow ground at least 0.1 luma below the fade and
textured. **The three pairs are measured separately** (ghost trail against fade, held path against fade, snow against fade)
on the 844x390 crop: CRITIQUE_8 item 9 found Episode 6's rule measuring the wrong pair. **Off-screen change:** if any path
or frost cell more than 6 tiles from the party changed, reuse Episode 4's `reveal()` (pan, hold, back; confirm skips).

**Persistence.** Stones reset to the map's authored `start` on every entry. **No new save field.** A save made standing on
a held path cell loads with the authored holds: if that cell is fade then, the party wakes on the nearest ground (Episode
6's lane-cell precedent, `field/system.js`).

**Softlock rules** (asserted by `qa/maps` and `mapcheck`): every stone and every stone approach is reachable ground; no
actor starts on a path or frost cell; the critical path is reachable in some sequence of reads explored breadth first (held
order x the party's cell); **no state strands the player** (from every reachable state, the entrance is reachable: an
island the party can reach always holds a stone that brings the way back, or the way back is not a path); every chest is
reachable in some state; **no loop home** (the shortest critical-path solution never re-reads a stone more than 6 cells
behind the party, and its walk is at most 1.3 times the straight route: PLAYTEST_REVIEW_8 item 3's duct loop).

**Teaching ladder** (one idea per step; decisions in brackets, 4.10): Road A (read, cross) [1] -> Road B (two at once) [2]
-> Road C (the third lets the first go, behind you, harmless) [1] -> F1 B (the next path is the one you just read) [2] ->
F1 C (re-read to choose who goes) [2] -> F2 B (a held name shuts a door: let go to go on) [2] -> F2 C (the dark shows what
you hold) [1] -> F3 Shelter, Remember, Return (both rules at once, then the Keeper's hand) [5]. First-time barks in the
pack's `BARKS`: `first_held` (Mira: "ASTA. And there's the road she walked."), `first_letgo` (Mira: "Two at a time. The
road can't remember more than we can."), `first_reread` (Mira: "Say it again and it's the newest. The old one goes
first."), `first_grip` (Bram: "That door's holding on to somebody."), `would_fade` (Mira: "Not while we're standing on it.").

### 5.2 Small additions

- **Tints.** Pack tints `whiteout` (a pale lift over the road for `whiteout` only; fades in over 2 s, out over 1 s) and
  `aurora` (low, cool, slightly violet for F3 and the Stillheart), registered on `TINTS` and on the night-tint sets so lamps
  light. Measured on the phone crop: the party's floor at or above luma 0.22 under both.
- **The aurora.** A slow animated overhead band on F3 and the Stillheart (3 frames, a frame every 30 game frames), drawn
  under the roof decals; never a flash, never more than +0.05 luma change between frames, off under reduceMotion.
- **Snowfall.** The existing particle kinds, slow and sparse; never across a speech box.
- **Memory vignettes.** Reuse the memory tint for the Keeper's three memories (`keeper_young_m`, `keeper_mid_m`,
  `keeper_mother_m`, `courier_m`). The frost-blot on a name in a memory is a pack helper on the cutscene (`s.frostBlot`: a
  box that shows "..." with a frost texture over it and plays a soft `ice`), not a field system.
- **The fade in the whiteout** (`whiteout`): Mira's and Bram's sprites alpha down to 0.3 over 2 s and back up over 0.5 s,
  and the party HUD names frost by the battle's own Rime drawing (E7-scene-ui exports the drawer; the field calls it): the
  same picture in the field and the fight, so Call means one thing.
- **Speaker swaps.** The Episodes 4 to 6 mechanism for "The Keeper" to "Nox" and "A Courier" to "Marten".
- **Nox in the Sanctum.** `nox_t` is a scene actor spawned at `keeper_wait_1` to `keeper_wait_3` by the stone scenes (no
  follower code; the party's two followers are unchanged).
- **The hearth, the iced doors and the Vanishing Mark.** Two-state objects drawn by the tile object's frames, no text.
- **The stair of light** (`ep7_ending`): an overhead prop that rises over 60 frames (each step a line of handwriting drawn
  as glyph bars, never legible text).

### 5.3 Story plumbing (inside the pack, plus the seams of section 13.2)

- The pack's `story.js` hands its scenes, lines and conditions to `registerStory`; a content test asserts ids unique across
  all seven episodes and the X1, cave and tier packs.
- The `ep7_complete` handoff: the pack adds `CREDITS_HANDOFF[7] = { cards: CREDITS_EP7, music: 'palehaven', map:
  'ep7_ph_inn', mark: 'inn_bed', counter: 'credits7_rolled', endCard: END_CARD_EP7, flag: 'ep7_complete' }` and, while
  `EP7_LIVE`, replaces `CREDITS_HANDOFF[6].endCard` with `END_CARD_EP6_LIVE` ("Episode 7 begins in the morning.").
- `mainQuestFor` switches to the pack's `MAIN_QUEST_EP7` on `ep7_started` through `QUEST_EXT`; `epilogue6` Talk and journal
  point at the inn's door and the north dock while `EP7_LIVE`, and list only that step (PLAYTEST_REVIEW_7 item 10).
- Ledger rows: Nox on `nox_named` (place `palehaven`), Marten on `marten_named` (place `willowmere`: Willowmere's courier),
  Bryn, Maera and Torr on `palehaven_arrived`, Eira on `testimony_eira` (or `doors_reopened`), Sol on `testimony_sol` (or
  `doors_reopened`), Mirael on `testimony_mirael` (or `doors_reopened`); `PLACES.palehaven` and `REACHED.palehaven =
  'palehaven_arrived'`. Proposal (EPISODE7 choice 21): a `vex` row, place "The Road", kept on `vex_name_whole` ("His own
  name, whole in the ice."); drop it if Vex was kept out of the Ledger on purpose. The hero's row stays unkept (choice 11).
- Rows whose canon line names Nox: Bryn, Eira, Torr and Mirael have two line sets, by `nox_named` (EPISODE7 section 3);
  a content test asserts no Palehaven line before `nox_named` contains "Nox".

### 5.4 Shortcuts

| From | To | Present while |
|---|---|---|
| F1 basin lift `lift_f1_up` | F2's Lamp Gallery (the arena) | `vault_f2_done` |
| F2 lift `lift_f2_down` | F1's Thawlight Basin | `vault_f2_done` |
| F3 first landing stair | F2's Lamp Gallery | `vault_f2_done` (always, being the way up) |
| F1 Thawlight Basin path | Palehaven's Vault door | `vault_entered` |
| `square_return` (the Stillheart) | Palehaven's Vault door | `phantom_defeated` |
| `nave_door` (the square) | the Stillheart roof | `doors_reopened` |
| The White Road's lake | Zephyr Landing's north dock (the Kestrel) | `road_arrived` |
| The Returning Hearth (rest and save) | (a rest point in town) | `hearth_lit` |
| The Waystation stove (rest and save) | (a rest point on the road) | `saw_sevens` |

Every lift is two-way from the first build (PLAYTEST_REVIEW_8 item 2). Stones reset on arrival, but no shortcut route
needs a stone: each lands on ground next to a font.

### 5.5 W9 abilities and the Lantern in Episode 7

| Ability | Where | Critical? | Fallback |
|---|---|---|---|
| Shove | the Waystation's woodpile (optional, a wood chest behind it) | no | `push: true` |
| Dash Strike | F1 D crate (Winterwatch Boots), F1 E crate (Torr's plaque #3) | no | breakable object |
| Appraise | 7 bestiary entries; the Lantern and the Phantom readable in the field (phase 1), each naming its cold moves | no | in-battle |
| Lantern | F3 Remember: the hidden stone in Keeper ink to the Road Home | no | exists |

---

## 6. Combat (E7-battle)

### 6.1 Level and EXP targets

`expForLevel`: 28 16,887, 29 18,314, 30 19,806, 31 21,363 (Fact, `src/data/party.js`, run 2026-11-10). Episode 6 finishers
arrive at about 17,470 to 17,970 (Fact, BATTLE 14.6: the Scribe met with 16,670 EXP at 100% of the fights after E6-fixes,
16,175 at 80%, +1,300 after it); a Continue save that fought every placed foe, elites included, may arrive at Lv 29
(Inference, PLAYTEST_REVIEW_8 item 6). The quick start uses 17,900. E7-integrate records the real arrival level from an
Episode 6 credits save and E7-battle re-tunes if it is Lv 29.

| Zone | Plan fights | Level in | Level out (all fights) | First-pass EXP |
|---|---|---|---|---|
| ep7_white_road | 1 (scripted) + 2 | 28 | 29 (just) | +160, +320 |
| ep7_vault_f1 | 5 | 29 | 29 | +800 |
| ep7_vault_f2 | 4 + the Lantern | 29 | 30 (just) | +640, +280 for the Lantern |
| ep7_vault_f3 | 4 | 30 | 30 | +640 |
| ep7_stillheart | 1 | 30 | 31 | +1,500 |

15 ordinary fights plus the scripted first (Episode 6 planned 16 plus the first). About 160 EXP an ordinary fight (heads of
about 85, the three-foe groups under an `expMul`). From 17,900: the Phantom at about 20,740 with every fight (Lv 30, about
620 under 31) and about 20,260 at 80% (Lv 30, about 450 over 30). The margin is wider than Episode 6's on purpose (that
plan's 27 EXP margin was eaten by elites, item 6): E7-battle counts elites at their real rate when it reports the margin,
and trims a fight's EXP before it moves a boss target.

### 6.2 Enemy roster

First pass, scaled from Episode 6's final numbers (BATTLE 14.1, after E6-battle's +30% ordinary ATK and MAG) by the 6.8
method of `EPISODE2_PLAN.md`; **the simulator targets are binding**. Every ordinary foe uses an `enemies.webp` cell (or the
Lost Page sprite), recolored to snow white, ice blue, pine black and aurora violet so none reads as its Episode 6 cousin;
cell 7 is used **as painted** (it is the icy skeletal phantom the cell was drawn as; Episode 6 recolored it violet).
Every foe has `cold: true` (6.3) and names its cold moves.

| id | Name | Family, size | Lv | HP | ATK / MAG | DEF / SPR | SPD | Sh | Weak | Resist | EXP / Gold | Moves (**telegraph**; Rime in brackets) | Trait | Art |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `rime_wolf` | Rime Wolf | beast | 28 | 820 | 190 / 20 | 32 / 24 | 20 | 2 | fire, spear | ice | 85 / 230 | Bite, Frost Fang (single phys 120%) [1] | evade 0.1 | cell 2, white fur with blue frost at the jaw |
| `snow_wisp` | Snow Wisp | spirit, small | 28 | 690 | 90 / 180 | 20 / 34 | 18 | 2 | fire, light | ice, bow | 80 / 220 | Slap, Flurry (party mag 70%) [1 each] | basic | cell 0, a white jelly with snow inside |
| `hush_owl` | Hush Owl | beast, flying | 28 | 700 | 185 / 60 | 26 / 28 | 22 | 3 | bow, fire | ice | 85 / 230 | Talon, Hush (Silence 25%), Dive (single phys 160%) | evade 0.15 | cell 6, a white-and-grey snow owl, gold eyes |
| `crystal_crawler` | Crystal Crawler | beast, shell | 29 | 680 | 180 / 20 | 48 / 26 | 9 | 4 | fire, axe | sword, bow | 90 / 240 | Mandible, Glaze (Protect self), Shard Spray (party phys 60%) [1 each] | basic | cell 3, a clear crystal shell, aurora green legs |
| `frostbound_revenant` | Frostbound Revenant | spirit | 29 | 720 | 90 / 195 | 24 / 40 | 15 | 3 | fire, light | ice, thunder | 90 / 250 | Chill Touch (single mag 150%) [1], Grave Cold (Blind 20%), Drain | basic | cell 7 as painted (canon name) |
| `ice_knight` | Hollow Ice Knight | construct | 30 | 860 | 200 / 40 | 46 / 30 | 12 | 4 | fire, axe | ice, sword | 95 / 260 | Ice Blade, **Glacier Cleave** (single phys 200%, a charge) [2] | charge | cell 5, recolored to clear ice and steel (canon name) |
| `rimed_page` | Rime-Written Page | construct, small | 30 | 700 | 110 / 200 | 22 / 42 | 17 | 3 | fire, light | thunder, ice | 90 / 260 | Margin Cut, Cold Ink (party mag 90%) [1 each], **Final Line** (single mag 200%, a charge) | charge | the Lost Page sprite, a frost recolor with blue lines |

Groups: e7w_first = rime_wolf x2 (scripted, the Rime lesson); e7w_wolves = rime_wolf, snow_wisp; e7w_owls = hush_owl x2.
e7v1_wisps = snow_wisp x2, hush_owl (`expMul` 0.65); e7v1_crawlers = crystal_crawler x2; e7v1_mixed = rime_wolf,
frostbound_revenant. e7v2_knights = ice_knight, snow_wisp; e7v2_revenants = frostbound_revenant x2; e7v2_mixed =
ice_knight, hush_owl, crystal_crawler (`expMul` 0.6). e7v3_pages = rimed_page x2; e7v3_knight = ice_knight, rimed_page;
e7v3_mixed = frostbound_revenant, rimed_page. Elites at the normal rate. EXP per foe is per head before `expMul`; E7-battle
tunes to the 6.1 column.

### 6.3 Rime (the episode's one battle rule)

Distinct from Episode 3's Heat (a counter on one foe climbing to a flare), Episode 4's Decrees (seals on foes), Episode 5's
Turning Sky (a battle-wide state that changes who is open) and Episode 6's Gale (a shared tempo that changes who acts
when): Rime is **per party member**. The player's decision is triage: whom to warm, and when to spend a turn on it.

- **Rime.** Every battle in which any foe has `cold: true` has Rime (`state.rime`). No encounter field is added (the
  `encounters.js` rollEncounter and `rules.js` double-entry trap is avoided): the rule reads the foes' own data. Battles
  with no cold foe have no Rime (Episodes 1 to 6, the cave and the tier unchanged). **If a later change needs a
  per-encounter field, it goes in BOTH `src/data/encounters.js` `rollEncounter` AND `src/battle/rules.js`, or it is
  silently dropped.**
- **Party only.** Rime lands only on party members; no foe ever holds Rime, and nothing a foe does to the party slows that
  foe (the Gale Engine lesson, PLAYTEST_REVIEW_8 item 1). The sim asserts it.
- **Adding Rime.** A cold foe's cold move adds its bracketed Rime to each member it hits (6.2), up to 3. Plain attacks add
  none. E7-battle first checks how a move's targets reach the rule: through the move's effect `{ keep: 'rime', rime: n }` on
  the Episode 5 and 6 bridge (BATTLE 13.8, 14.2: `applyEffect` hands `keep` to `ai.js` `special()`), or through
  `RULE_EXT.afterAction` if it sees the action's targets; it uses whichever does and says which.
- **Frozen.** At 3 Rime a member is Frozen: `push(u, 1.0)` (Episode 6's clamped `delayUnit`: it loses its next turn) and
  takes x1.4 damage until it next acts; then its Rime is 0. Message: "Bram's name frosts over. He misses his turn."
  (`rime_freeze`).
- **Shedding.** **Defend** sheds all of a member's Rime and keeps it Warm until its next turn (no Rime is added). The Defend
  row's help in a Rime battle reads "Shake off the cold." (E6-fixes A3's lesson, from day one). **Ember Tea** (7.1): every
  ally sheds 1 Rime (party-wide, so it needs no item-target seam: BATTLE 14.8 notes that `rules.js` does not hand an item's
  target to `RULE_EXT`). **Call** (below).
- **Readability (the phone is the bar).** Three snowflake pips (7 x 7, 1 px dark outline) left of each party member's name
  on the HUD row; the name's letters frost a third at a time (a pale blue-white overlay), and a frosted name must still be
  at least 0.15 luma above its box so it stays readable (CRITIQUE_6 item 1's rule); at Frozen a crack draws across the name
  and the timeline head frosts. Measure pips and frosted names on the 844x390 crop.
- **Auto (`competent`).** 1. A Farewell or Borrowed Light is pinned and the hero acts before it lands: the hero Calls its
  target. 2. An ally is Stilled: the hero Calls them on the hero's next turn unless 1 applies to someone else. 3. A member at
  Rime 2 with a cold foe acting before them: that member Defends (the hero only if no pin is up). 4. Two or more members at
  Rime 2 and Ember Tea in the bag: one Tea. 5. Against the Lantern and the Phantom, the hero keeps 12 MP for Call. The
  reckless and naive policies never Call, Defend for Rime or use Tea.

**Call** (`call_name`, display name "Call", the hero, 12 MP, `target: 'ally'` (one party member other than the hero,
standing or Stilled), rank 80; learned in `whiteout` through `learn: { flag: 'call_learned' }`, fallback `learn: { level:
29 }`). The hero says the ally's name: the ally sheds all Rime, is Warm until their next turn, and acts sooner (`push(u,
-0.25)`, clamped as Episode 6 clamps a negative push). If a Farewell or Borrowed Light is pinned on that ally, it breaks
("Mira hears her name. The farewell does not hold.", `farewell_break`) and its owner is thrown back a full turn (`push(u,
1.0)`): the party's window. On a Stilled ally, they return at once. Registered in `SIGNATURE_TECHS` (`{ unit: 'hero', flag:
'farewell', skill: 'call_name' }`), so while a Farewell or Borrowed Light is pinned the hero's Tech list opens on Call,
first, in gold, and the target cursor opens on the pin's target (the hero already has Episode 4's Answer entry on flag
`decree`: E7-scene-ui makes the right one float). It reaches `rime.js` through `{ keep: 'rime', rime: 'call' }`. Help text
(under 40 characters): "Say an ally's name. Breaks a farewell." Learn line: "{hero} learned Call. Say an ally's name:
the cold lets go of them, and they come back sooner." A 12 x 12 icon (a small open mouth of light, drawn in code) on its
Tech row. **The menu path is part of the skill:** Call is the first signature skill aimed at one ally, and it must also
reach a Stilled ally, who is not on the timeline; a scene test and a realplay test prove both (12).

**What the other signature skills do here.** Answer on the owner of a pin is a plain light hit and says "A farewell is not
a decree." Turn the Sky and Anchor are already gated in battles with no sky and no wind (Episode 6's `SKILL_GATE`: "No sky
to turn.", "No wind to hold."); E7-battle confirms both gates hold in every Rime battle and that Call is gated in battles
with no cold foe ("No cold to call through.").

### 6.4 Mini-boss: the Pale Lantern (`pale_lantern`)

Boss table, no flee, music `battle`, backdrop `ep7_hall`, flag `lantern_defeated`, ai `pale_lantern` (registered by the
pack). Lv 29, HP 1,900, ATK 300, MAG 760, DEF 30, SPR 40, SPD 15, 7 shields, weak fire, light; resist ice, thunder; immune
Silence. `cold: true`.
- **Pale Flame** (`pale_flame`, single mag 130%) [1]; **Lamplight Chill** (`lamplight_chill`, party mag 60%) [1 each].
- **Borrowed Light** (`borrowed_light`, flag `farewell`): pinned on the non-hero member with the most Rime (ties: lowest
  HP) whenever nothing is pinned and the hero will act before the Lantern's next turn: "The Lantern borrows Mira's light."
  If it lands on the Lantern's next turn, that member is Frozen at once whatever their Rime, and the Lantern heals 8% of its
  maximum. Answers: the hero's **Call** on the target (breaks; the Lantern is thrown back a full turn); **Break** (cancels,
  the charge rule). It never borrows the hero ("It cannot hold a kept light."). (The boss's Farewell trick, taught here
  first: one idea, taught twice.)
- At 50% it opens its hood and calls two **Snow Wisps** (cold adds, 2 shields each). Kill them or keep Defending; their
  Flurry stacks Rime fast.
- Targets: careful 7 to 9 rounds, win 85%+; attack-only 0% (the house rule for every main boss since Episode 1, BATTLE
  14.6); ignoring the pin costs at least 10 points.
- Rewards: EXP 280, gold 1,600, mastery 24. Drops: unique `borrowed_flame`, 1 rare roll (ilvl 29), hi_potion 2.
- Art: `enemies.webp` cell 1 (the wraith) recolored to frost white and ice blue with a great lantern drawn into the hood
  where the glow was; under-the-feet HUD row from day one.

### 6.5 Boss: the White Phantom (`white_phantom`), the hero at the center

Boss table, no flee, music `boss_phantom`, backdrop `ep7_stillheart`, flag `phantom_defeated`, ai `white_phantom`
(registered by the pack). Lv 30, HP 4,300, ATK 560, MAG 560, DEF 34, SPR 32, SPD 15, family construct; immune Stun,
Poison, Blind. HP locks at 68% and 33% so one hit never skips a phase (canon thresholds). `cold: true`.

1. **Outer Frost** (100% to 68%). Armored (canon): DEF x1.4. Weak fire (canon "Fire cracks its outer frost."), axe; resist
   ice (canon), thunder; 8 shields. **Whiteout Breath** (`whiteout_breath`, party mag 120%) [1 each]; **Icicle Lance**
   (`icicle_lance`, single phys 160%) [1]. **Farewell** (`farewell`, flag `farewell`): pinned on the non-hero member with
   the most Rime (ties: lowest HP) whenever nothing is pinned, never before the hero's next turn (`holdForHero`, Episode 6's
   `holdForBram` pattern: the Phantom's turn is held until the hero has acted after the pin). "The Phantom turns to Mira. It
   is saying goodbye." (`farewell_read`), a pale ribbon from the Phantom to the target on the stage and on the timeline, and
   "{hero} can call her." only when the hero will act before it lands (PLAYTEST_REVIEW_7 item 2). If it lands, the target is
   **Stilled**: they keep their place on the field, have no turn, and foes cannot target them (allies can); they return after
   2 party turns, when Called, or when the Phantom is Broken. Answers: the hero's **Call** before it lands (fails; the
   Phantom is thrown back a full turn: two party turns in a row); **Break** the Phantom (cancels it, the charge rule); Call
   on a Stilled ally (they return at once). The Phantom never bids the hero farewell ("YOU I CANNOT SAY GOODBYE TO. YOU
   WERE KEPT."): if only the hero stands, Farewell is not used.
2. **The Frozen Ward** (from 68%). Summons the **Closed Gate** and the **Lost Letter** (canon). While either stands the ward
   holds: the Phantom takes 20% damage, its shields cannot be chipped, and its HP cannot fall below 33% (canon floor).
   Farewell continues.
   - `closed_gate`: Lv 30, HP 600, 3 shields, weak axe, fire; resist ice. **Shut** (`shut`): every 3rd turn, Silence 50% on
     the hero ("The gate shuts. {hero} cannot call."): it targets the one who can answer the Farewell, so the decision is
     whether to break the Gate first.
   - `lost_letter`: Lv 30, HP 540, 2 shields, weak spear (canon pierce), fire; resist ice (canon). **Mend** (`mend`): heals
     the Phantom 4% each turn it stands (never above the 68% lock); **Cold Ink** (`cold_ink`, single mag 110%) [1].
   - When both are gone the ward thaws: the Phantom is Broken one turn and the party gains 25 Fury (canon +25 Focus).
3. **Thawlight** (after the ward; canon phases 3 and 4). Armor falls (DEF normal, canon), weak fire (canon), spear, light; no
   resists; 9 shields; Haste. **Stillheart Blizzard** (`stillheart_blizzard`, canon): a charge every 4th Phantom turn,
   party mag 170% [2 each]: "The cold gathers in the Phantom's cloak..." Defend halves it and sheds as always; Break
   cancels; Call does not stop it. Farewell continues on every turn nothing is pinned.

This is the boss's central decision and it is the hero's: read who the Phantom is turning to, keep the hero standing and
speaking (break the Gate, keep 12 MP), and the Phantom's cruelest move becomes the party's double turn. It answers Bram's
Episode 6 "hold on" with the hero's "come back": a farewell freezes someone in place, and a name said in time brings them
back.

- **Hearth bonus:** with `hearth_lit` the party starts with +20 Fury (the existing `startFury` option, as Episode 6's
  `beacon_lit`).
- Targets: careful 12 to 16 rounds, win 85%+; attack-only 0%; ignoring telegraphs costs at least 15 points; careful play
  breaks at least half the Farewells with Call; the Phantom acts at least once every two party rounds (the Engine lesson).
- Rewards: EXP 1,500, gold 1,800, mastery 36. `BOSS_LOOT.white_phantom`: unique `stillheart_shard`, 2 rare rolls (ilvl
  30), phoenix_feather 1, hi_ether 2. Nox's gift is staged in `doors_reopen`.
- **HUD rows (CRITIQUE_8 item 1).** The Phantom's row keeps one anchor (over its crown, top-left of its body) in all three
  looks; the Gate's and the Letter's rows sit under their own feet in front-row foe slots beside the Phantom, at least 12
  internal px from any party sprite. All three looks and both adds are in the row-placement test from wave 7a.
- Art: `bosses.webp` cell 6 at 1x in the 160 x 144 boss cell; three looks: Outer Frost (as painted: skeletal ice, antler
  crown, ragged frozen cloak), the Frozen Ward (the cloak spread like a door, letters and a gate frozen into it behind,
  the crown frosted over), Thawlight (frost cracking off in plates, the crown dripping, a warm light in the chest); a field
  avatar at map scale with a back frame. The Gate and the Letter: one small new sprite each (an iron-and-ice gate on a post
  with a frozen lock, about 44 x 56; a folded letter in a shell of ice with a broken seal, about 40 x 36), each with a
  ground shadow.

### 6.6 Simulator and tests

`tools/sim/ep7.mjs` registers the `ep7` pack data (the ep6 pattern; `registerData()` registers ep4, ep5, ep6 and ep7) and
adds `EPISODES[7] = EP7_ZONE_ORDER` through one line in `simulate.mjs` (the `EP6` attach line's twin, chaining onto it;
that file is CRLF and kept so, BATTLE 14.6). Rime lives in `src/data/ep7/rime.js` (pure, never draws from `ctx.R`) and runs
in the sim exactly as in the game through `RULE_EXT`. Zones; `LOADOUTS` (ep7_white_road = the `ep6_obs_eyrie` loadout plus
the Scribe's Quill (Mira), the Kestrel's Wings (hero; the sim uses one of Aeris's pair, the same power) and Stormplate Mail
(Bram); F1 plus two tier 13 pieces (Rimeplate Mail on the hero, Snowveil Robe on Mira) and `call_learned`; F2 plus
Winterwatch Boots (Bram); F3 plus two tier 14 pieces (Iceglass Sword, Aurora Staff); the Phantom plus Borrowed Flame and
mastery up one step; 2 to 4 Ember Teas); `TARGETS` (ordinary as Episodes 1 to 6, with F3 the tightest ordinary floor:
careful HP lost 18 to 24%, attack-only win 70 to 85%; the Lantern and the Phantom as 6.4 and 6.5; `levels` from 6.1);
`SUITE_LEVELS_EP7` and `BOSS_LEVELS_EP7` (the Lantern 29 and 30, the Phantom 30 and 31: the second level is a full clear's
and the Continue arrival's). The policies learn Rime and Call. Tune until `--check` prints "All targets met" for all seven
episodes; `--cave --check` and `--tier 1 --check` unchanged. The tuning knobs, in this order: the Frozen push (1.0) and
damage (x1.4), the Rime per cold move, the cold share of each group.

New checks in `ep7.mjs check()` (each a failure string, as Episode 6's):
- **`economy7`** (PLAYTEST_REVIEW_8 item 4): from `EP7_START.gold`, battle gold at 100% of the fights plus the main-path
  chests of 7.6 buys the two town pieces on arrival at Palehaven and the two tier 14 pieces before F3, each with at least
  300 G to spare; at 80% of the fights, the same with every chest (optional ones included). Prints both margins.
- **`rimeless`**: every Episode 7 encounter opens with Rime (`ev.type === 'rime' && ev.reason === 'start'`), and no
  Episode 1 to 6 encounter does.
- **`noFoeRime`**: no foe ever holds Rime in any trace, and the Lantern and the Phantom act at least once every two party
  rounds (mean over 400 fights).
- **`callShare`**: careful play breaks at least half the Farewells and Borrowed Lights it sees with Call (the Episode 6
  `rewriteShare` twin), reported with how many landed and how many Stilled allies were Called back.
- **The EXP margin**: every fight before the Phantom stays under Lv 31's 21,363 EXP, elites at their real rate; report it.

A content test reads Mira's two boss tips and asserts the lever each names exists in the data ("When it borrows one of us,
call them back": `borrowed_light` carries the `farewell` flag; "When it says goodbye to one of us, call them": `farewell`
carries it). PLAYTEST_REVIEW_6 item 8 must not recur.

---

## 7. Loot, items and shops

### 7.1 Consumable

| id | Name | Price | Effect |
|---|---|---|---|
| `ember_tea` | Ember Tea | 160 | Every ally sheds 1 Rime. (Party-wide by design: no item-target seam, BATTLE 14.8.) |

### 7.2 Equipment (new bases)

Tier 13 (ilvl 29; the Glass-Ice Armory from arrival): `rimeplate_mail` (body, hero/bram, 3300, DEF +55, SPR +9),
`snowveil_robe` (body, mira, 3200, DEF +34, SPR +28, MAG +11), `glassice_helm` (head, hero/bram, 1700, DEF +23, SPR +6),
`aurora_hood` (head, mira, 1700, DEF +12, SPR +18, MAG +8), `drift_boots` (boots, all, 1500, SPD +5, DEF +7),
`hearthwool_mantle` (mantle, all, 1450, DEF +11, SPR +7, LUK +3), `thaw_charm` (charm, all, 1300, Stun resist 50%, DEF +5),
`lantern_charm` (charm, all, 1300, Silence resist 50%, MAG +5).

Tier 14 (ilvl 31; the Glass-Ice Armory after `vault_f2_done`): `iceglass_sword` (sword, hero, 4600, ATK +84, crit +6),
`glacier_axe` (axe, hero/bram, 4700, ATK +92, SPD -1), `frostline_spear` (spear, bram, 4650, ATK +87, DEF +5),
`aurora_staff` (staff, mira, 4500, ATK +22, MAG +72, SPR +9, MP +20), `snowowl_bow` (bow, mira, 4500, ATK +77, SPD +1, crit
+4), `wintersteel_mail` (body, hero/bram, 4200, DEF +60, SPR +10), `glassweave_robe` (body, mira, 4100, DEF +37, SPR +30, MAG
+12), `wintersteel_helm` (head, hero/bram, 1900, DEF +25, SPR +7).

Prices fall below Episode 6's tier 12 (8,000) on purpose: the house rule is that the gold flow buys two pieces at each
buy-point, and price follows the gold (7.6), not the tier number. Stats rise with the tier as usual.

### 7.3 Uniques and the set (placed, never random)

| id | Name | Rarity | Slot | Stats | Source |
|---|---|---|---|---|---|
| `open_gate` | The Open Gate | legendary | charm | SPD +4, SPR +6, Fury gain +12%, Silence resist 30% | Nox in `doors_reopen`, truth path (`told_nox`) |
| `kept_lamp` | The Kept Lamp | legendary | charm | MAG +8, DEF +5, Stun resist 50% | Nox in `doors_reopen`, kind path (`spared_nox`) |
| `stillheart_shard` | Stillheart Shard | legendary | charm | MAG +10, SPR +6, Fury gain +12% | the White Phantom (guaranteed) |
| `borrowed_flame` | Borrowed Flame | legendary | charm | ATK +8, DEF +6, Blind resist 50% | the Pale Lantern (guaranteed) |
| `road_home` | The Road Home | legendary | sword (hero) | ATK +88, crit +8, fire +15% | F3 Remember, Lantern secret |
| `snowrest_scarf` | Snowrest Scarf | rare (unique) | charm | SPR +4, Silence resist 50%, LUK +5 | Torr's Missing Streets |
| `winterwatch_boots` | Winterwatch Boots | set | boots | SPD +5, DEF +7, Stun resist 10% | F1 D, Dash secret |
| `winterwatch_coat` | Winterwatch Coat | set | mantle | DEF +10, SPR +7, Silence resist 30% | the Hearth of Returning Names |

Set `winterwatch` (2 pieces): MAG +4, SPD +1. The two Nox gifts are a pair: the truth path's gate against the kind path's
lamp is a choice of shape, not of power (RESPONSIBILITY_ARC decision D). Vex's truth choice changes lines only (a gift from
Vex would make the rival a shop). Names are proposals (open to veto, as Episodes 4 to 6's were). E7-battle greps every id
first and checks every stat named here exists as a party stat ("fire +15%" follows Episode 6's Windborne Spear "thunder
+15%").

### 7.4 Affixes and names

Add a ninth tier at ilvl 29 to every affix that has eight (about +15% over tier 8; resist suffixes cap at 100).
`RARE_NAME_A` gains Rimebound, Wintered, Hearthlit, Northbright, Thawborn (each grepped first), through `RARE_NAME_EXT`
(exists).

### 7.5 Drop tables

`ZONE_LOOT`: ep7_white_road ilvl 28, equipChance 0.18; vault_f1 ilvl 29, 0.18; vault_f2 ilvl 29, 0.19; vault_f3 ilvl 30,
0.19. Random tables never roll legendaries.

### 7.6 Shops, the inn and the gold line

| Shop id | Keeper | Stock |
|---|---|---|
| `waystation_pack` | Sol (the Courier's Waystation) | potion, hi_potion, ether, hi_ether, antidote, eye_drops, echo_herb, phoenix_feather, tent, silver_salve, ember_tea, drift_boots (peddler markup as Episodes 2 to 6) |
| `northwind` | Maera | the same consumables at list price plus ember_tea, thaw_charm, lantern_charm, hearthwool_mantle |
| `glassice_armory` | Eira | tier 13 gear and the tier 12 weapons; tier 14 (`ifFlag: vault_f2_done`) |

The Thawlight Lodge: 140 gold. **The gold line** (first pass; `economy7` in 6.6 is binding and E7-battle tunes chest and
foe gold before prices):

| Point | Gold in | Spent | Left |
|---|---|---|---|
| Carried in (`EP7_START.gold`; E7-integrate records the real number from an Episode 6 credits save) | 4,000 | | 4,000 |
| The White Road: battle gold about 1,380 (three fights), the Courier's Strongbox 1,500 | +2,880 | | 6,880 |
| Palehaven: **Rimeplate Mail 3,300 + Snowveil Robe 3,200** (the two town pieces) | | 6,500 | 380 |
| F1: battle about 2,640, the Winterwatch Provision Cache 1,500 | +4,140 | | 4,520 |
| F2: battle about 2,300, the Lamp Gallery chest 1,200, the Lantern 1,600 | +5,100 | | 9,620 |
| Before F3: **Iceglass Sword 4,600 + Aurora Staff 4,500** (the two pre-F3 pieces) | | 9,100 | 520 |

Never everything: a third piece needs sales, the optional chests or the Reliquary. Consumables come out of the margins and
from drops; the check's 300 G floor is for them.

---

## 8. Music and sound

### 8.1 New tracks (E7-audio; composed in code with the in-repo tracker like Episodes 3 to 6; the shared four-note name motif; -16 LUFS; no Suno in the build)

The motif is the house's (`docs/MUSIC.md`: a rising perfect fifth, a whole-step lift, a falling major third; `0, +7, +9,
+5`). Each episode states it on a new instrument: Episode 5's was the oud, Episode 6's the wind harp. **Episode 7's is the
iceglass bell**, a song-local instrument (like Episode 6's wind harp in `ep6_theme.py`, `synth.py` untouched): a struck
glass bar with a hard soft-mallet attack, a long inharmonic decay (partials at about 1, 2.76 and 5.4 of the fundamental),
and a slow beating between the top partials, so each note sounds like the Listening Bell heard from very far away. It is
the opposite of the wind harp's attack-less swell, on purpose.

| id | Title | Role | Brief | Key, tempo | Motif | Fallback |
|---|---|---|---|---|---|---|
| `palehaven` | The Thawing Hearth | the town, `doors_reopen`, `CREDITS_EP7` | The root region-7 brief, for the tracker: a warm solo cello, sparse piano, glass bells, airy sustained strings, quiet snow and aurora with melancholy hope, 72 BPM; an A section of stillness (the cello alone over a held string fifth), a warmer B section where the piano and the bells answer each other like doors opening. | D Dorian, 72 BPM, 90 to 100 s | the motif on the iceglass bell, D A B G, the G ringing on under the cello's reply | `hollowmere` |
| `frostbound_vault` | The Vanishing Steps | vault_f1, vault_f2 | Dungeon: a low cello drone that never quite resolves, the motif on the cello in long augmented notes, the iceglass bell answering it two beats late, a slow pulse of a muffled bass drum like footsteps in snow, and every 8 bars a single bell note that is cut off before it decays (the stopped bell). | A Aeolian, 66 BPM, 90 s | cello, augmented; bell echo | `hollow` |
| `boss_phantom` | The White Phantom | the Phantom's battle | 4/4 drive: low strings in ostinato, timpani, a choir pad, a high iceglass figure running like a frozen music box; the B section quotes `palehaven` in minor (the town's own song frozen); a last bar in major on the iceglass bell before the loop. | F minor, 132 BPM, 100 to 120 s | strings, the town quote | `boss_king` |

Reused: `mystery` (F3 and the Keeper's Watch: the house rule, the last floor before a boss is the quiet one), `high_moor`
(the White Road: the house's high open-ground wind), `sorrow`, `triumph`, `battle`, `victory`, `gameover`, and `zephyr`
(Act I, the ep6 fragment). Cut line: if time runs short, `frostbound_vault` falls back to `hollow` and `boss_phantom` to
`boss_king`, and the episode still ships.

### 8.2 Cue sheet by map

| Map | Track |
|---|---|
| ep6_zl_inn, ep6_zephyr (Act I) | `zephyr` |
| ep7_white_road, ep7_waystation (0.5) | `high_moor` |
| ep7_palehaven and `ep7_ph_*` (the Watch: `mystery` 0.6) | `palehaven` |
| ep7_vault_f1, ep7_vault_f2 | `frostbound_vault` |
| ep7_vault_f3 | `mystery` |
| ep7_stillheart | silence until its scenes |
| ordinary battles, the Lantern | `battle` |
| the White Phantom | `boss_phantom` |

### 8.3 Cue sheet by scene (a scene that leaves its map's track puts it back before it ends)

| Scene | Cue |
|---|---|
| `ep7_morning` | `zephyr`, softer (0.6); silence on the chart close-up; back |
| `name_under_ice` | silence from the first cut of the knife; `mystery` (0.5) under the choice; back to `high_moor` |
| `road_fight` | `battle` |
| `whiteout` | the map track fades out with the tint; silence; `call_cast` on the call; the map track back as they return |
| `waystation` | the map track, softer; silence on the close-up |
| `palehaven_view` | `mystery`, softer |
| `palehaven_arrival` | `palehaven` from the gate |
| `meet_keeper`, `keeper_and_vex` | `palehaven` (0.6); `mystery` (0.6) inside the Watch |
| `keeper_memory_1`, `_2`, `_3` | `sorrow` with a distant `bell_toll`; the frost-blot plays `ice`; back to the map track |
| `listening_bell` | silence; `mystery` (0.5) under the tag; back |
| `pale_lantern` | silence for the intro, then `battle` |
| `keeper_comes` | no music change; the round door opens with `frost_seal` reversed |
| `phantom` | silence, title card, `boss_phantom` |
| `phantom_after` | `sorrow` (the crown cracks) -> `triumph` (the Stillheart thaws) -> `mystery` (the seventh list) -> `bell_thirteenth` x many, then once alone, then silence |
| `whole_page` | silence, `mystery` (0.5) under the page, `sorrow` on the signature, `palehaven` on Nox's line |
| `doors_reopen` | `palehaven` from the first open door |
| `ep7_ending` | silence, `mystery` as the stair rises, end cards |
| credits | `palehaven` |

### 8.4 SFX and ambience (E7-audio, synthesized like the Episode 1 to 6 sets)

| id | Use | Brief |
|---|---|---|
| `stone_hold` | a name stone read and held | one iceglass bell note (the motif's root) and a crackle of ice settling outward, about 0.7 s |
| `stone_letgo` | a held path lets go | a soft falling sigh of snow, the bell note reversed under it, about 0.6 s |
| `frost_seal` | a frost door forming (reversed: melting) | a rising crackle of ice locking, a low glass thump at the end |
| `rime_bite` | Rime added to a member | a short dry frost crackle; pitched up a step per pip so 1, 2 and 3 are told apart |
| `rime_freeze` | a member Frozen | a glassy snap and a short ring; distinct from core `ice` |
| `call_cast` | Call cast | a clear rising two-note tone like a name called across snow, warm, no voice, no words; distinct from core `kept` |
| `farewell_read` | the Farewell and Borrowed Light telegraph | a long low hush with a high thin whistle that does not resolve |
| `farewell_break` | a Farewell broken (Call) | ice cracking open and a warm major chord rising out of it; not Episode 4's `decree_void`, Episode 5's `prophecy_break` or Episode 6's `rewrite_break` |
| `snow_wind` (ambience) | the White Road, Palehaven | soft steady wind over snow, a pine creak now and then, a far chime |
| `vault_hush` (ambience) | the Vault, the Stillheart | a deep hush, slow drips freezing, a low hum of ice, a far bell-like groan every 10 to 14 s |

Reused, never redefined: core `bell_thirteenth` (the Listening Bell thawed: it is tuned to the thirteenth bell, so it is the
same sound), `bell_toll` (the memories), `ice` (the frost-blot), `name_restore`. All of it reaches the game through the
pack's audio fragment (13.3), never through `assets/audio/manifest.json`. E7-audio draws a pairs sheet
(`tools/audio/out/ep7/pairs.png`) proving `call_cast` against `kept`, `farewell_break` against `rewrite_break`,
`prophecy_break` and `decree_void`, `rime_freeze` against `ice`, and `stone_hold` against core `stone_name` and `chime_post`
are told apart.

---

## 9. Asset list: what is reused and what is new

### 9.0 Unused painted source cells (checked 2026-11-10 against `tools/art/**`, the atlases and EPISODE6_PLAN 9.0)

| Sheet | Cell | Content | Status | Episode 7 use |
|---|---|---|---|---|
| `environments.webp` | 6 | the Hollow North: frozen cathedral and pine forest, cold aurora and snow, luminous icy pale blue | never shipped | the road, the Vault and the Stillheart backdrops, the `palehaven_far` and `cathedral_far` decals, `ep7_dialog_keyart`, the town's palette |
| `bosses.webp` | 6 | the White Phantom: skeletal icy spectral sentinel with antler crown and ragged frozen cloak | never shipped | the boss, its looks, avatar, portrait crop |
| `portraits.webp` | 7 | `hooded_sage` | **held** for the First Keeper (Episode 8) | not used: Nox speaks without a portrait (9.5) |
| `environments.webp` | 7 | First Library | unused | **held** for Episode 8 |
| `bosses.webp` | 7 | Eraser | unused | **held** |
| `enemies.webp` | 0 to 7 | all used by Episodes 1 to 6 | used | recolors only (6.2, 6.4); cell 7 as painted |

### 9.1 Tiles and tile objects (E7-tiles; new sheet `assets/tiles/ep7.png`, fragment `assets/tiles/ep7_tiles.json`, existing sheets untouched)

| Asset | Reuse | New |
|---|---|---|
| Terrains: `fade` (the void: flat paper white, A1, 2 frames of a slow grain, never looks walkable), `icepath` (canon: a held path, packed blue-white ice with footprints), `snowfield` (textured snow ground with drifts), `frostbrick` (canon, F1 floor), `iceglass` (canon, clear floor with depth, F1 landings), `icebridge` (canon), `letter_stone` (F2's dark flagstone with letter niches), `nave_ice` (F3 white floor with pillar shadows), `permafrost`, `icebrick`, `frostmosaic` (canon, the town) | A2 builder, the ep6 per-floor kit approach | all; three Vault floors must not look alike: frost brick and glass over white; dark stone and lamp pools; white nave under aurora |
| Walls: `icewall` (canon; frost doors draw from it), `vault_wall` (F1 frost-brick faces), `bell_hall` (F2 dark stone with lit and dark niches), `nave` (F3 ice pillars) | wall systems with outer faces | four wall systems |
| Objects: `namestone` (cairn: dim, lit, flicker x 2 frames), `name_plate` (iceglass plate, same states), `returning_hearth` (cold, lit 3 frames), `iced_door` (iced no name, open with a name glint), `vanishing_mark` (2 states), `traveler_wall` (6 x 3 decor, carved names as texture), `listening_bell` (frozen in ice, thawed swinging 3 frames), `stillheart` (3 x 4: frozen with names moving 3 frames, thawed 3 frames), `round_door` (3 wide, closed, open), `page_block` (frozen, opened), `post_box`, `tally_frame`, `courier_stove` (cold, lit), `star_stair` (overhead, 3 frames), `crate_dash_ice`, `winterwatch_cache` | push block, gate, font, door_boss drawing style, the ep6 `kestrel` prop (reused from the ep6 sheet) | all |
| Town kit: blue-ice ramparts, snow roofs, the Keeper's Watch facade, aurora crystals on poles (`crystal`, `auroraobelisk`, canon), `frostfire` braziers, `snowpine` (canon decor), `palehaven_far` and `cathedral_far` decals (environments cell 6, quantized) | Willowmere prefabs | the snow, ice and pine palette swap |
| Road kit: the frozen lake edge, black pines, snow banks, the Traveler's Wall, the Icegate arch | the ep6 water edge | all |

### 9.2 Sprites (E7-sprites; pack atlases `ep7_npcs`, `ep7_enemies_battle`, `ep7_enemies_field`, `ep7_bosses_battle`, `ep7_portraits`, `ep7_heads`)

| Asset | Reuse | New |
|---|---|---|
| NPCs `npc_keeper` (Nox), `npc_keeper_young` (memory 1), `npc_keeper_mid` (memories 2 and 3), `npc_keeper_mother`, `npc_courier_m` (Marten), `npc_bryn`, `npc_eira`, `npc_sol`, `npc_maera`, `npc_torr`, `npc_mirael` | paper-doll builder; bodies: coat for Nox and Mirael; the smith body for Eira; guard for Bryn; courier for Sol and Marten; scholar for Torr; gardener for Maera | 11 specs (Nox: seventies, long blue Keeper's coat with frost on the hem, white hair pinned up, ink on the right hand, a lamp; Marten: fifties, courier's coat with a brass post badge, a ready grin). Ages must read (CRITIQUE_6 item 10): white for Nox, grey for Torr |
| The North Watchkeeper | `npc_innkeeper` recolor | palette |
| Enemy battle sprites, the 7 of 6.2 | enemies.webp cells, the Lost Page sprite, the recolor and derive pipeline | recolor recipes; a dark outline and a cool rim on every foe |
| `pale_lantern` | enemies.webp cell 1 | frost recolor, the lantern drawn into the hood |
| `white_phantom` x3 looks, `phantom_avatar` | bosses.webp cell 6, `build_bosses.py`, the `scribe` approach | the three looks and the avatar |
| `closed_gate`, `lost_letter` | none | two small new sprites with ground shadows |
| Field sprites for every new enemy | `enemies_field` layout | frames; checked on each floor at phone scale, on snow, on the fade and on frost brick, not on the sheet background |
| Portrait `phantom` | bosses cell 6 crop via `build_portraits.py` | crop recipe, readable at 48 (the antler crown, an eye socket, a cloak edge) |
| Timeline heads `head_<id>` | `build_heads.py` | entries in `ep7_heads`; the frost on a party head is drawn by the scene, not baked |

### 9.3 Backdrops and key art (E7-tiles, `tools/art/backdrops`; files `assets/backdrops/ep7_*`)

| id | Source | Use |
|---|---|---|
| `ep7_battle_road` | environments cell 6, a crop on the pines and snow | ep7_white_road |
| `ep7_battle_vault` | environments cell 6, a crop on the cathedral front | ep7_vault_f1 |
| `ep7_battle_hall` | composed in code: a dark hall of letter niches, two lamp pools | ep7_vault_f2, the Pale Lantern |
| `ep7_battle_sanctum` | composed in code: ice pillars, a slow aurora band | ep7_vault_f3 |
| `ep7_battle_stillheart` | composed in code over a cell 6 sky crop: the heart of ice, the broken roof, the aurora | the White Phantom |
| `ep7_dialog_keyart` | cell 6 with the baked vignette | Episode 7 title cards and `CREDITS_EP7` |

**Two grades at runtime, no extra bytes.** The Stillheart stage has a **frozen grade** (as composed) and a **thaw grade**
(a warm lift, the aurora brighter, frost haze off) it cross-fades to when the ward thaws, so phase 3 reads as the cold
breaking. The thaw grade is its own recipe in OKLab (Episode 5's `DAY_TONE` approach, never a screen over the frozen one:
CRITIQUE_7 item 1), and each grade's mean luma is measured (thaw at least 0.10 above frozen on the phone crop). The aurora is
a separate slow layer (5.2's rule). A stage whose backdrop is a painted pack file is tested by waiting on `usedAsset`, never
on `backdropLayer.painted` (Episode 5 found it stays false for pack stages).

### 9.4 Close-up pages (E7-tiles, `src/data/ep7/pages.js`, the EP6 pages approach: code-drawn, registered on `PAGE_KINDS`)

CRITIQUE_6 item 3, CRITIQUE_7 item 7 and CRITIQUE_8 item 5: show the payoffs, in stages, each step's text reaching full
strength only on the box that says it.

| kind | modes | Used in |
|---|---|---|
| `ep7_chart` | `fading` (the realm, the north pale, one valley's name lifting off over 40 frames) | `ep7_morning` |
| `ep7_carving` | `fading` (VEX QUILL cut fresh, half the letters going white one by one), `whole` (every letter, cut deep) | `name_under_ice`, `doors_reopen` |
| `ep7_tally` | one (the doorframe tally, every seventh stroke crossed, a white patch where a name was) | `waystation` |
| `ep7_tag` | one (Mara's tag in a strong square hand, her maker's stamp) | `listening_bell` |
| `ep7_seventh` | one (the oldest list: cheap paper, the cold hand, the empty-book seal) | `phantom_after` |
| `ep7_page` | `half` (the bottom half, frosted white, unreadable), `joined` (the two halves meeting, the torn line running on), `mark` (Marten's mark and the crossed seven), `signed` (the signature, "Nox.") | `phantom_after`, `whole_page` |
| `ep7_letter` | `restored` (TESS, AT WILLOWMERE; MARTEN in the corner, a crossed seven in the date) | `doors_reopen` |

The words on a page are the story's lines in the game font styled as handwriting: the warm hand's "k" drawn as Episode 5's
`ep5_page` and Episode 6's `ep6_page` drew it (seen, not told); Marten's hand rough and square, his sevens crossed with a
bar; Mara's hand on the tag strong and square, unlike either. Something to look at, never a puzzle. Nox's signature on
`signed` is the brightest thing on the page and reaches full alpha only on the box that reads it.

### 9.5 Optional paid items (for Scott to approve and make himself; the build does not wait for them)

| Item | Service | Cost | What it lifts |
|---|---|---|---|
| Nox's portrait (a painted bust in the `portraits.webp` style: seventies, blue Keeper's coat, white hair pinned, a lamp) | Runway still | 4 credits | Nox is the episode's guest and the warm hand of six episodes, and speaks without a face. Highest value of the three. |
| A painted Stillheart interior (the frozen nave, the heart of ice, the aurora through the roof) | Runway still | 4 credits | replaces the code-composed `ep7_battle_stillheart` and lifts the boss stage |
| `palehaven` town theme from the region-7 brief | Suno Pro | 1 monthly download | a real recording over the tracker version |
| The root's `assets/cinematics/chapter-7.mp4` and `boss-7.mp4` (frames as stills) | none (already made) | 0 | only if Scott confirms their source: neither is named in `RUNWAY_PROVENANCE.json` (Fact, grepped 2026-11-10), and the game may be sold (AGENTS.md "Art and music sources") |

Total if all approved: 8 Runway credits and 1 Suno download. Default: none; the episode ships without them (the plan's
fallbacks in 8.1 and 9.3 are the shipped versions). Scott's Runway and Suno accounts stay with Scott: an agent never routes
around a denied or gated generation path, and asks in an issue instead.

### 9.6 What Episode 7 does not need

No new party art, no new UI windows, fonts or cursors, no new jingles, no new engine core modules, no new status (Rime,
Frozen, Warm and Stilled are battle state; Farewell is a pin with a flag), no new ui-atlas icon (the pips, the frost, the
ribbon and Call's icon are drawn in code by the pack's scene module).

---

## 10. Save compatibility (E7-pack; read this before touching anything that writes a save)

**The rule carries over from Episodes 3 to 6, unchanged: no Episode 7 path ever writes a save slot that holds another
run.**

1. **Per-run autosave stays.** `g.autosaveSlot` is honored by everything Episode 7 adds; Episode 7 adds no new write path.
   Nothing in the pack calls `save.write` except through the field's existing autosave and the save bell.
2. **The main entry is Continue.** A run that finished Episode 6 continues into Episode 7 from its own save: after the
   Episode 6 credits it wakes at `ep6_zl_inn` and `ep7_morning` runs (only while `EP7_LIVE`); a save made later anywhere in
   Zephyr Landing starts it on the next enter of `ep6_zl_inn`. A save from before Episode 6's credits is untouched by
   Episode 7 in every way (nothing of it is reachable without `ep6_complete` and the counter).
3. **The quick start, `newGameEp7(name, { slot })`**, lives in the pack (`src/data/ep7/start.js`) and uses the core
   `pickRunSlot(save)` exactly as Episodes 3 to 6 do: slot 0 if empty; otherwise the first empty manual slot, shown before
   starting ("This party will save to Record 2."); if every slot is full it does not start and shows the existing refusal
   with only Back. It never offers Replace and never writes an occupied slot.
4. **`EP7_START`** (in the pack). Lv 28 at 17,900 EXP with the simulator's `ep7_white_road` loadout; every Episode 1 to 6
   main flag plus `ep6_complete`, `compass_restored`, `isles_restored` and `white_road_letter_get`; counters
   `credits_rolled` to `credits6_rolled`; key items `name_fragment_1` to `name_fragment_6`, `lantern_of_recall`,
   `mirror_sigil`, `sky_compass`, `white_road_letter`; equipment including the Scribe's Quill and the Kestrel's Wings; 4,000
   gold; potion 6, hi_potion 8, hi_ether 6, phoenix_feather 3, silver_salve 3, ember_tea 2; starts at `ep6_zl_inn`
   `inn_bed`. The quick start **awaits the ep6 pack (which awaits ep5, which awaits ep4) and then the ep7 pack, and merges
   every audio fragment it needs (ep6 for `zephyr`, ep7), before the fade in** (PLAYTEST_REVIEW_6 fix 3). Exposed as
   `LQ_DEBUG.newGameEp7(name, { slot })`.
5. **The episode switch.** `src/game/episodes.js` gains `export const EP7_LIVE = false` (seam 2). While false:
   `ep7_morning` never runs, no gangway waits at the north dock, the Episode 6 end card is unchanged, and the title shows no
   Episode 7 row, **except** with `?ep=7` once the pack's `EP7_MAPS_LISTED` is true. E7-integrate flips `EP7_LIVE` on the
   branch. When live, the title row "Episode 7: new party" shows once any slot has `ep6_complete`, with the help line "A
   ready party at Lv 28. Your own save stays under Continue." (`foldTitleRows` keeps the episode rows together; with six
   episode rows on the phone, E7-scene-ui checks the folded title fits at 375x812 and 844x390).
6. **A save never lost when the pack fails** (PLAYTEST_REVIEW_6 fix 1). `src/game/packFallback.js` `landing()` learns
   `ep7_` (seam 4: the `ep[456]_` regex widened to `ep[4567]_`); the field never autosaves on `_testtown` or while a
   `packReturn` is pending (E4-fixes' rule; E7-pack's test proves it for an `ep7_vault_f2` save with `src/data/ep7/**`
   unreachable: the slot's map is unchanged after a map change).
7. **Additive schema.** New flags and counter `credits7_rolled`. No field is renamed or removed; an Episode 1 to 6 save
   loads unchanged. **Fine Print rule:** a Fine Print run (`tier_1`) never starts Episode 7 (`ep7_morning` needs `not
   tier_1`); Fine Print stays unlocked where it is today and is not scaled for Episode 7 (EPISODE7 choice 17).
8. **Tests (node, pure, fake storage):** slot 0 occupied + empty slot 2 -> the quick start writes only slot 2 through a
   full simulated map change; all slots full -> no write at all; an Episode 6 credits fixture loads and reaches
   `ep7_morning` with `EP7_LIVE` on, and does not with it off; a Fine Print save never reaches it; an Episode 5 save (no
   `ep6_complete`) never reaches it; `?ep=7` hidden while maps are unlisted; the pack-failure landing case above; a save
   made on a held path cell reloads with the authored holds and the party on ground, able to walk; an Episode 6 save that
   skipped Piri's Dead Letters gets `white_road_letter` in `ep7_morning` and one that did not is not given a second.

---

## 11. Build plan: waves and agent briefs

Every agent: read `AGENTS.md`, COMMON.md, DESIGN.md, `docs/story/EPISODE7.md`, this plan and its brief; stay in owned paths;
keep `node qa/run.mjs` green (Episodes 1 to 6 unchanged in meaning); no git; no em dashes; LF line endings; report under
400 words. Where an agent needs something not yet delivered, it stubs the agreed id and says so.

**Every step leaves the game publishable:** nothing a player can reach changes until E7-integrate flips `EP7_LIVE`; the
pack is not even fetched while the switch is off, except with `?ep=7` or `?pack=ep7`.

### 11.1 The waves (up to three agents at once; paths disjoint inside each wave)

| Wave | Agent | Size | Brief | Owned paths (disjoint within the wave) | Closes with |
|---|---|---|---|---|---|
| **7a** | E7-pack | M | `E7-pack.md` | `src/data/ep7/index.js`, `src/data/ep7/start.js`, `src/data/ep7/maps.js` (the map registry), `src/data/ep7/hooks.js` (credits, quest, title, debug hooks); the core seams of 13.2 in `src/game/packs.js`, `src/game/episodes.js`, `src/scenes/title.js` (one line), `src/game/packFallback.js` (one regex), plus the core-JS comment trims that pay for them; `tools/pwa/build_pwa.py` (`LAZY_PREFIXES`), `qa/pwa/budget_ratchet.json` (`packCapsMB.ep7` only), `qa/pwa/packs.test.mjs` (the caps line), `qa/pwa/precache.test.mjs` (the ep7 fragment), `qa/core/ep7_*`, `qa/saves/ep7_*`, `qa/ui/ep7_*`, `docs/PWA_PACKS.md` (an "ep7 pack" section) | `node qa/run.mjs core saves ui pwa battle`; tap-prompt bytes not grown |
| 7a | E7-story | M | `E7-story.md` | `src/data/ep7/{flags,npcs,quests,text,story,ledger}.js`, `docs/story/STAGING_EP7.md`, `docs/story/EPISODE7.md` (section 9 only), `qa/content/ep7_*` | `node qa/run.mjs content` |
| 7a | E7-battle | M | `E7-battle.md` | `src/data/ep7/{enemies,encounters,items,loot,shops,skills,ai,rime}.js`, `tools/sim/ep7.mjs`, one line in `tools/sim/simulate.mjs`, `qa/battle/ep7_*`, `docs/BATTLE.md` (an "Episode 7" section) | `node qa/run.mjs battle`; `simulate.mjs --check` all seven episodes |
| **7b** | E7-tiles | M | `E7-tiles.md` | `tools/art/tiles/ep7_*.py` (+ one line in `build_tiles.py`), `tools/art/tiles/out/ep7/**`, `assets/tiles/ep7.png`, `assets/tiles/ep7_tiles.json`, `tools/art/backdrops/ep7_*.py`, `assets/backdrops/ep7_*`, `src/data/ep7/pages.js`, `qa/core/ep7_tiles*`, `qa/core/ep7_pages*` | sheets, mocks and pages viewed; `sync-manifest --pack ep7` |
| 7b | E7-sprites | M | `E7-sprites.md` | `tools/art/sprites/chars/ep7_*`, `tools/art/sprites/ep7_*.py` (+ one line in `build_all.py`), `assets/sprites/ep7_*`, `assets/ui/ep7_heads.*`, `qa/core/ep7_sprites*` | contact sheets viewed; `sync-manifest --pack ep7` |
| 7b | E7-world | M | `E7-world.md` | `src/data/ep7/field/**` (remember.js, events, system, art), `src/data/ep7/world.js` (registers the EXT type, the `whiteout` and `aurora` tints, the aurora layer, the test map), `tools/maps/ep7_check.mjs` (+ one line in `tools/maps/mapcheck.mjs`), `qa/world/ep7_*`, `docs/WORLD_EP7.md` | `node qa/run.mjs world`; fieldlab shots viewed |
| **7c** | E7-maps-a | M to L | `E7-maps-a.md` | `src/data/maps/ep7_white_road.js`, `ep7_waystation.js`, `ep7_palehaven.js`, `ep7_ph_inn.js`, `ep7_ph_shop.js`, `ep7_ph_armory.js`, `ep7_ph_watch.js`, `ep7_patches.js`, `qa/maps/ep7_a_*`, `docs/MAPS_EP7_A.md`, `tools/maps/previews/ep7_white_road*`, `ep7_waystation*`, `ep7_palehaven*`, `ep7_ph_*`, `ep6_zephyr_ep7*`, `ep6_zl_inn_ep7*` | `mapcheck check`; previews viewed |
| 7c | E7-maps-b | M to L | `E7-maps-b.md` | `src/data/maps/ep7_vault_f1.js`, `ep7_vault_f2.js`, `ep7_vault_f3.js`, `ep7_stillheart.js`, `qa/maps/ep7_b_*`, `docs/MAPS_EP7_B.md`, `tools/maps/previews/ep7_vault_*`, `ep7_stillheart*`, the one `EP7_MAPS_LISTED` line in `src/data/ep7/encounters.js` | same; the critical path test |
| 7c | E7-audio | S to M | `E7-audio.md` | `tools/music/songs/ep7_*.py`, `assets/audio/music/ep7_*`, `tools/audio/ep7_*`, `assets/audio/sfx/ep7_*`, `assets/audio/ambience/ep7_*`, `src/data/ep7/audio.js` (the manifest fragment), `docs/MUSIC.md` (an Episode 7 section), `qa/audio/ep7_*`, `qa/music/ep7_*` | renders, seams and piano rolls viewed; `node qa/run.mjs music audio` |
| **7d** | E7-scene-ui | M | `E7-scene-ui.md` | `src/data/ep7/scene.js` (prototype wrapping, the ep6 pattern), `src/data/ep7/title.js`, `qa/battlescene/ep7_*`, `qa/ui/ep7_scene*`, `qa/realplay/ep7battle.py`; a core line in `src/battle/scene/**` (`menu.js startTarget` above all) or `src/scenes/battle.js` only if no wrap can reach it, paid by a trim in the same change | `node qa/run.mjs battlescene ui pwa`; phone shots viewed; the realplay casts |
| 7d (after scene-ui) | E7-integrate | M | `E7-integrate.md` | `qa/autoplay.py` (an Episode 7 segment), `qa/autoplay_grid.mjs`, `qa/integrate/ep7_*`, `qa/integrate/story_time.py` (Episode 7 input and the stone weighting), `qa/shots.json` (append only, LF), `qa/realplay/ep7field.py` and its entry in `qa/realplay/run.py`, the `EP7_LIVE` line, seam fixes in files whose owner's brief is closed | the full gate list (12) |
| **7e** | E7-review | S to M | `E7-review.md` | `docs/CRITIQUE_9.md`, `docs/PLAYTEST_REVIEW_9.md`, `qa/out/review9/**` | read-only |
| 7e (after the review) | E7-fixes | M | `E7-fixes.md` (the orchestrator writes it from the review) | per the list | the full gate list again |

Agent count: 11 build agents and 1 read-only reviewer (12 overnight sittings), then 1 fix pass. Never more than three at
once.

### 11.2 Disjointness check, by shared file

| Shared file or folder | Who touches it, in which wave | Why it is safe |
|---|---|---|
| `src/data/ep7/index.js` | E7-pack (7a) only | the entry imports the other modules behind a missing-module guard, so every other agent plugs in by exporting `register()` |
| `src/data/ep7/maps.js` | E7-pack (7a) writes the guarded list of all 11 map module names plus the patches | 7c's map agents only create files the list already names |
| `src/data/ep7/encounters.js` | E7-battle (7a); E7-maps-b (7c) edits one line (`EP7_MAPS_LISTED`) | different waves |
| `src/data/ep7/rime.js` | E7-battle (7a) only | `RULE_EXT` already exists (Episode 5's seam); no core file |
| `src/data/ep7/pages.js` | E7-tiles (7b) only | E7-story (7a) calls the kinds by name behind a `PAGE_KINDS[kind]` guard (narration fallback until 7b lands) |
| `src/data/ep7/{scene,title}.js` | E7-scene-ui (7d) only; E7-pack's hook (7a) imports `title.js` guarded | different waves |
| `src/data/ep7/{flags,npcs,quests,text,story,ledger}.js` | E7-story (7a) only | |
| `src/data/ep7/field/**`, `world.js` | E7-world (7b) only | |
| `src/data/ep7/audio.js` | E7-audio (7c) only | |
| core seams (`packs.js`, `episodes.js`, `title.js`, `packFallback.js`) | E7-pack (7a) only | no other 7a agent opens a core file |
| `src/battle/scene/**` (`menu.js`), `src/scenes/battle.js` | E7-scene-ui (7d) only, and only if a wrap cannot reach | |
| `tools/sim/simulate.mjs` | E7-battle (7a), one line | |
| `tools/maps/mapcheck.mjs` | E7-world (7b), one line | 7c map agents run it, do not edit it |
| `assets/tiles/**`, `assets/backdrops/**` | E7-tiles (7b) only (ep7-prefixed files) | fragments, never `tiles.json` |
| `assets/sprites/**`, `assets/ui/ep7_heads.*` | E7-sprites (7b) only (ep7-prefixed files) | pack atlases merge at runtime; base files untouched |
| `assets/ep7_manifest.json` | written by `node qa/core/sync-manifest.mjs --pack ep7`, run by E7-tiles and E7-sprites in 7b | a generated file; the orchestrator reruns it **and `git add`s it** at every wave close |
| `assets/audio/manifest.json` | **nobody** | Episode 7 audio rides the pack fragment (13.3) |
| `src/data/maps/ep6_*.js`, `src/data/ep6/**` | **nobody** | Episode 7 patches registered maps from its own `ep7_patches.js`, and adds `white_road_letter`'s second desc from its own `items.js` |
| `docs/MAPS.md`, `docs/WORLD.md` | nobody | Episode 7 writes `MAPS_EP7_A.md`, `MAPS_EP7_B.md`, `WORLD_EP7.md` |
| `qa/shots.json`, `qa/autoplay.py` | E7-integrate (7d) only | |
| `qa/realplay/**` | E7-scene-ui (7d) writes `ep7battle.py`; E7-integrate (7d, after) writes `ep7field.py` and the `run.py` entries | sequential in 7d |
| `PLAN.md`, `PROGRESS.md` | the orchestrator only | agents send paragraphs in their reports |

Never beside each other: E7-integrate runs alone (it touches seam files of closed briefs); E7-review never runs beside
E7-fixes.

### 11.3 Wave close (orchestrator checklist, each wave)

`node qa/core/sync-manifest.mjs --pack ep7`; **`git add next/assets/ep7_manifest.json`** (it is generated, and Episode 5
left it unstaged once); `python tools/pwa/build_pwa.py` (from this LF worktree only); `node qa/run.mjs pwa core`; restore
`next/qa/world/out` with `git checkout -- next/qa/world/out` (never commit it); add `next/qa/cave/out` files only by name;
count CR bytes in `next/qa/shots.json` (zero); view every image the wave's reports name; commit on the build branch with the
orchestrator's message; push the branch and update the pull request into `overhaul` (PR only, never a direct push, never
`main`; one pull request, never a duplicate on retry).

---

## 12. Acceptance and QA (the full gate list)

- `node qa/run.mjs` green; Episode 1 to 6 suites unchanged in meaning (rerun a flaky timeout alone before treating it as
  real: `x1_gate`, `x1_wild`, `walks`, `abilities_walks`, `qa/battle/sim.test.mjs`).
- `node qa/run-gate.cjs` (the root game) green.
- `node tools/sim/simulate.mjs --check`: "All targets met" for Episode 1, Whisperwood Hollow, Episodes 2 to 7, with
  `economy7`, `rimeless`, `noFoeRime` and `callShare` passing; `--cave --check` and `--tier 1 --check` unchanged.
- `node tools/maps/mapcheck.mjs check` clean; previews of the 11 new maps and the two patched maps viewed, in
  `MAPS_EP7_A.md` / `MAPS_EP7_B.md`, including each stone state that matters on every map and every ghost trail drawn.
- **The menu path, with real input.** `qa/battlescene/ep7_menu_cast.test.mjs` opens the hero's Tech list through `menu.js`,
  picks Call, moves the target cursor to a Farewell's target and confirms (never through `LQ_DEBUG.battleAct`, which closes
  the menu itself and so cannot see a menu bug); a second case targets a Stilled ally, who is not on the timeline; a third
  checks the cursor opens on the pin's target. `python qa/realplay/ep7battle.py` casts Call once with real keys and once
  with a real touch tap with a Farewell pinned, reading back `farewell_broken` with reason `call`, and once on a Stilled ally,
  reading back `stilled_end` with reason `call`. If Episode 7 adds any target kind, `menu.js startTarget` accepts it and the
  same tests cover it.
- **The stones, with real input.** `python qa/realplay/ep7field.py` reads `ns_asta` with real keys, walks the path with the
  direction held, reads `ns_bo` and `ns_nyx` and asserts Asta's path fades only once the party is off it; tries a read that
  would fade the party's own cell and asserts the refusal (`would_fade`) and that nothing changed; then one read by a touch
  tap. A held direction neither drops nor adds a step across any read.
- **Autoplay route.** `qa/autoplay.py --episode 7` plays from an Episode 6 credits save and from `newGameEp7`: the inn, the
  gangway, the road (the wall and Vex's choice, the first fight, gaps A, B and C, the whiteout, the Waystation), the town (the
  Keeper, the Watch, the gate), F1 (B, C, the key), F2 (the grip, the bell; the Lantern on Auto), F3 (Shelter, Remember with
  the Keeper, Return, the round door), the Phantom on Auto (Call used by the competent policy; the bot records each Farewell
  and how it was answered), the page, the doors, the ending, credits, the wake at the Thawlight Lodge. No softlock, the
  Phantom beaten at Lv 30, zero game overs, desktop and phone, one device at a time; stone inputs from the map agents'
  reported solutions; the bot rests at each floor's font on arrival and at `font_v2b` (PLAYTEST_REVIEW_8 item 9); the quick
  start never wrote a slot it did not own (asserted by reading localStorage back); **zero "unknown ... id" warnings in
  either run** (asserted). `--all-fights` hunts each placed foe once (foes revived by a reload are not hunted again), so the
  Continue run's level reading is honest; its arrival gold at Palehaven and before F3 is logged against 7.6.
- Story timer (`qa/integrate/story_time.py` on the Episode 7 logs, stones counted by decisions: one per read, a re-read
  counting, never per step): first play 60 to 90 minutes; first fight under 5 minutes after `ep7_morning`; no main scene
  over its box budget; the main path at 16 decisions or fewer (4.10). A top over 95 minutes takes Cut 1 (14) and is
  re-timed before anyone is asked about story.
- **Shots** (append to `qa/shots.json`, LF, zero CR bytes; zero console errors; desktop 1920x1080 and phone 844x390):
  `story_ep7_morning_chart`, `story_name_under_ice`, `battle_road_first_rime`, `battle_rime_frozen`, `field_ep7_gap_a`,
  `field_ep7_gap_b_two`, `story_whiteout`, `story_waystation_tally`, `field_ep7_palehaven_hearth`, `story_meet_keeper`,
  `field_ep7_vault_f1_reread`, `field_ep7_vault_f2_grip`, `story_listening_bell`, `battle_pale_lantern_borrow`,
  `field_ep7_vault_f3_remember`, `story_keeper_comes`, `battle_phantom_farewell`, `battle_phantom_ward`,
  `battle_phantom_thaw`, `story_phantom_after_list`, `story_whole_page_signed`, `story_doors_reopen`, `story_ep7_ending`,
  `ui_title_ep7`.
- Performance: field logic under 3 ms, a stone read under 1 ms of recompute, 60 fps on the phone profile; the aurora layer
  under 0.5 ms.
- Text: no em dashes (grep U+2014 over `next/`), every box within 3 x 42, ASCII only, no keyboard glyph on touch; no
  Palehaven line before `nox_named` contains "Nox"; no Episode 7 event uses an Episode 1 text key.
- Readability: every stone puzzle solvable by a first-time player without Talk; the fade never read as snow; the ghost trail,
  the held path and the snow each against the fade at their floors (5.1); every stone's state readable at rest on the phone;
  frosted names at least 0.15 luma above their box; the pips and the Farewell ribbon readable on the phone; F3's mean luma
  between F1's and F2's with the party's floor at or above 0.22; no aurora frame change over +0.05 luma; the whiteout tint
  fading in over 2 s; Talk always names the next step, including after `ep7_complete`.
- Saves: section 10's tests; an Episode 7 save made mid-Vault reloads with every stone in its authored state and every
  opened door open.
- **Budget** (13): `qa/pwa/precache.test.mjs` green, the tap-prompt bytes at or below the measure E7-pack records first,
  the initial download not grown by Episode 7, the `ep7` pack under its cap; `python qa/pwa/pwa.py --only packoffline` with
  `?pack=ep6,ep7` brings both packs up offline after one visit.
- Shipping is not part of the gate list: E7-integrate flips `EP7_LIVE` on the branch only; shipping (`overhaul:main`) stays
  Scott's or Stephen's explicit word.

---

## 13. The budget rule and the pack

### 13.1 Why everything is in the pack (measured 2026-11-10 in `D:\lq-ep7`)

The first download's load before the tap prompt is held by `qa/pwa/budget_ratchet.json` (`tapPromptMB` 2.34, never raised;
Scott's cap 2.5) and the initial download by `initialMB` 6.38 (cap 6.5). **Measured today** (Fact, `node
qa/integrate/x1_budget.mjs`, run 2026-11-10 on `origin/overhaul` at abd2b5b, Episodes 3 to 6 live):

| Measure | Now | Ratchet | Room |
|---|---|---|---|
| Before the tap prompt (wire) | 2,443,421 bytes | 2,453,667 bytes (2.34 MiB) | **10,246 bytes** |
| Initial download (wire) | 6,662,933 bytes (6.354 MiB) | 6,689,914 bytes (6.38 MiB) | **26,981 bytes** to the ratchet |
| Pack caps (wire) | ep4, ep5, ep6 each 1.0 MB (`packCapsMB`) | | |

The rule does not spend that room: Episode 7 adds **no net bytes** to the pre-tap load and **no bytes** to the initial
download. E7-pack measures again first (the numbers move with every merge into `overhaul`) and treats whatever room it
finds as zero.

- Every file of Episode 7 is a pack file: `src/data/ep7/**` (code and data, including the field code under
  `src/data/ep7/field/`), `src/data/maps/ep7_*.js`, `assets/{tiles,sprites,ui,backdrops}/ep7_*` and `assets/tiles/ep7.png`,
  `assets/ep7_manifest.json`. `build_pwa.py`'s `pack_of` keeps them out of the precache and the modulepreload block (with
  prefix `ep7_`).
- No `src/data/ep7/live.js`: the switch lives in `episodes.js` (the ep4 to ep6 precedent), so nothing of the pack is
  precached.
- Sound files `assets/audio/sfx/ep7_*` and `assets/audio/ambience/ep7_*` are added to `LAZY_PREFIXES` so they are
  runtime-cached instead of precached. Music is lazy already.
- **Any core-file change must be paid for by trimming core JS in the same change** (comments and dead code in precached
  `src/` files, never behavior), and the report gives the gzipped before/after of the pre-tap load.

### 13.2 The core seams (E7-pack owns all of them; budget about 300 gzipped bytes in, at least as many trimmed out)

| # | File | Change | Why |
|---|---|---|---|
| 1 | `src/game/packs.js` | add `ep7: { entry: '../data/ep7/index.js', prefix: 'ep7_', assets: 'assets/ep7_manifest.json', audioPack: 'ep7', hard: true, touches: ['ep6_zl_inn', 'ep6_zephyr'], wanted: (f) => !!(f.ep6_complete \|\| f.ep7_started), enabled: () => EP7_LIVE }` and the import | the pack itself |
| 2 | `src/game/episodes.js` | `export const EP7_LIVE = false;` | the switch |
| 3 | `src/scenes/title.js` | the Episode 6 hook line generalized to Episodes 6 and 7 (or one more line beside it): when `EP7_LIVE` and a slot has `ep6_complete`, or `?ep=7`, `ensurePack('ep6')` then `ensurePack('ep7')`, then `globalThis.LQ_EP7 && LQ_EP7.title(this)` | the row, picker and name entry live in the pack (`src/data/ep7/title.js`) |
| 4 | `src/game/packFallback.js` | the `ep[456]_` landing regex becomes `ep[4567]_` | an Episode 7 save never lands on Test Town |

Not seams, and why: `RULE_EXT` (`start`, `afterAction`) exists since Episode 5 and is enough for Rime; Call reaches
`rime.js` through the existing `{ keep }` bridge; `delayUnit` and Episode 6's clamped `push()` are on the rule context;
`SKILL_GATE` exists. BATTLE 14.8's wished `h.item` and `commands` call points stay wishes (Ember Tea is party-wide so it
needs no item target). Already exported and mutable (Fact, grepped for Episode 6 on 2026-11-09 and used by the ep6 pack):
`registerStory`, `prependTalk`, `FLAG_IDS`, `ALL_SIDE_QUESTS`, `LEDGER`, `PLACES`, `REACHED`, `TINTS`, `NIGHT_TINTS`,
`LAMP_TINTS`, `EXT`, `INTERACT_TYPES`, `CREDITS_HANDOFF`, `QUEST_EXT`, `ENEMIES`, `ITEMS`, `SKILLS`, `ENCOUNTERS`, `ZONES`,
`ZONE_LOOT`, `SHOPS`, `NPCS`, `BANNERS`, `BOOKS`, `BARKS`, `BESTIARY`, `SPEAKER_NAMES`, `SCRIPTS`, `POLICY_EXT`,
`BACKDROPS`, `BOSS_CARD`, `SIGNATURE_TECHS`, `PIPS`, `PAGE_KINDS`, `RARE_NAME_EXT`, the `Planner` and `Actor` classes and
`engine.audio.manifest`. The field mechanic attaches itself from inside its own `EXT.namestone.create` and from `world.js`
on every map with a `remember` block (the ep6 pattern), so **`src/scenes/field.js` is not edited**.

### 13.3 Audio through the pack

`src/data/ep7/audio.js` exports `{ music, sfx, ambience, jingles, pack }` in the `assets/audio/manifest.json` entry shape
(srcs `assets/audio/music/ep7_*.mp3`, `assets/audio/sfx/ep7_*.wav`, loop points, volumes, `pack: 'ep7'`). The entry merges
it into `engine.audio.manifest` (never overwriting an id) before `ensurePack` calls `audio.loadPack('ep7')`, **on every path
that brings the pack up, the quick start included** (a test asserts the ids resolve after `newGameEp7`, the ep6 fragment's
`zephyr` too). `qa/pwa/precache.test.mjs` resolves sfx ids named under `src/data/ep7/` against the fragment (E7-pack). The
main audio manifest file is never edited.

### 13.4 Pack cap

`packCapsMB.ep7 = 1.0` (wire) in `budget_ratchet.json`; `qa/pwa/packs.test.mjs` asserts it (its fixed-caps `deepEqual` line
gains `ep7: 1.0`, E7-pack's one edit there). Expected: code and data about 0.28 MB, tiles, backdrops and pages about 0.32,
sprites about 0.26 (Episode 5 shipped 0.484 MB in all; Episode 6 sits under its 1.0 cap).

---

## 14. Risks, assumptions and decisions

**Assumptions.**
1. The White Phantom is a Keeper construct and the seventh fragment the Stillheart; the seventh list is the first list,
   twenty-six years old, and names "the First Keeper's name"; the warm hand is Nox's; Tess's father is her brother
   (EPISODE7 section 8).
2. Three tracker tracks and a song-local instrument are within the pipeline's proven range (Episodes 5 and 6 each shipped
   three and one instrument).
3. Rime fits on the existing `RULE_EXT` and `keep` bridge with Episode 6's clamped `push()`. If neither call point sees a
   move's targets, E7-battle uses a move-level effect through the bridge (the Episode 6 Anchor path) and says so; if Stilled
   (no turn, untargetable by foes) cannot be built from `push()` and an existing untargetable rule, the fallback is "Stilled
   = pushed back two full turns and covered" (foes' single-target moves retarget), the same decision, and says so.
4. Name stones attach without editing `field.js` (an `EXT.create` hook and method wraps, as tide locks, sun and shade and
   gust lanes did). A read never moves the party, so no forced step is needed.
5. Episode 6 is merged in `overhaul` when Episode 7 builds (Episode 7 patches its maps and reuses its pack skeleton, its
   `push()`, `SKILL_GATE` and fixes): Fact today (PR #54 to #58).

**Risks.**
- **Five chained packs** (ep3 for Emberpeak, ep4, ep5, ep6, ep7): a cold first entry could wait on all of them. E7-pack
  starts every fetch at once, orders only registration, and measures the worst case on the phone profile; the hot-file fix
  waits for Scott's or Stephen's word (3.3).
- **The order trap** (3.3): registering the patched Zephyr maps before the ep6 pack loses the patch silently. A test covers
  both orders.
- **The pre-tap budget.** Every seam must be paid in the same change; the orchestrator rejects a report without the gzipped
  numbers.
- **A capacity rule can feel like a chore.** Two at a time is easy to understand and easy to make tedious. Mitigation: the
  decision budget (4.10), the ghost trail (every path is visible before it is held), the oldest stone's flicker (the player
  always knows what goes next), the no-loop-home check, and no puzzle that needs a stone more than 6 cells behind.
- **The "names are not mechanics" rule** (DESIGN hard rule 2). A stone has a name on it. Mitigation: the name is shown once
  as flavor and is never an answer; the puzzle is read from the floor. EPISODE7 choice 13 gives Scott and Stephen the
  stricter reading (lamp cairns with no names) at no cost to the build.
- **Rime could swing fights** (a party that never Defends freezes in turn). Mitigation: the sim's three knobs in 6.6,
  Defend is a full answer for one member and Ember Tea a partial one for all, and every group but the first mixes one cold
  move with plain ones.
- **The hero's MP and voice** in the Phantom fight: Call costs 12; the Closed Gate Silences the hero. Mitigation: a
  one-time hint when the hero drops under 12 MP with a Farewell in the fight ("Keep something back to call us."), Auto keeps
  12 MP, Break is a second answer, a Stilled ally comes back after 2 turns anyway, and the Thawlight is after the Gate.
- **The menu path** (Call is the first ally-target signature skill, and it targets a unit off the timeline). Mitigation:
  the scene test and the realplay casts are gate items, not extras (12).
- **Grief in a kids' game.** Two deaths are named (Mara's, from Episode 3; Marten's, new). Mitigation: neither is shown or
  described (EPISODE7 section 4); the tone guide keeps humor out of those beats; EPISODE7 choice 6 offers the living
  alternative.
- **The EXP margin under Lv 31** (6.1): planned at about 620. Mitigation: E7-battle reports it with elites counted and trims
  a fight's EXP before it moves a boss target.
- Pacing: 16 fights, about 190 boxes, 16 stone decisions, the timer gate, the cut lines.
- Parallel waves: 7a's E7-battle needs nothing new from E7-pack (the `RULE_EXT` seam exists), so it can run its sim from
  the first hour; it registers its data through E7-pack's `index.js` once that lands.

**Cut lines, if the budget tightens** (each keeps a complete story):
- Cut 1: drop Torr's Missing Streets (Torr keeps his canon lines; his book becomes an inspect) and F1's side gallery (the
  Winterwatch Boots move to the F1 basin as a plain chest).
- Cut 2: drop the Keeper Emergency Reliquary and F2's side galleries; `frostbound_vault` falls back to `hollow`.
- Cut 3: merge F2 into F1 (the grip, the bell bay, `keeper_memory_2` and the Pale Lantern move to F1's upper galleries) for a
  two-floor Vault plus the Sanctum; the Waystation interior becomes an outdoor post on the road (the tally close-up stays).

**Open for Scott and Stephen** (none blocks the build; defaults in brackets; full list with reasons in EPISODE7.md section
10): the hero's episode with Nox and Vex as guests [yes]; Aeris flies them and carries the letters [yes]; Vex on the road
[yes]; the warm hand is Nox [yes]; Nox was the Court's Keeper [one line]; Tess's father is her brother and died on the road
[as written]; his name [Marten]; Mara's bell [yes]; Vex's own name, none invented [yes]; the seventh list names the First
Keeper's name [yes]; Vex keeps the whole page, the hero's row unkept [as written]; two truth choices [yes]; names on the
stones as flavor [yes]; Vex's binding-mender line at the stair [this line]; the hero heard, never in a box [yes]; the cards
[placeholder]; Fine Print does not enter Episode 7 [base game only]; no portrait and no paid media [none]; the canon renames
[as listed]; shipping [Scott's or Stephen's word]; a Ledger row for Vex [yes, drop if Vex was kept out on purpose].
