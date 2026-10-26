# Episode 1 expansion plan: The Wider Valley

Owner: ep1-expander (designer), 2026-10-25. Status: **designed and reconciled with the Episode 2 plan, awaiting orchestrator launch**.
**Where this file disagrees with `docs/EXPANSION_RECONCILIATION.md` (the decision log) or `docs/EXPANSION_SCHEDULE.md` (the build order), those win.** The pack
mechanism that carries every map, scene and art file of this plan is `docs/briefs/XP-packs.md`. Scott played Episodes 1
and 2, found them short, and asked for a bigger, more explorable world before Episode 3: a real overworld with branching
routes and reachable places, 2 to 3 optional mini-dungeons, side-quest chains that send the player back and forth,
hidden things that need Dash Strike, Appraise, Shove or the Lantern, and optional bosses with named loot, all of it
optional and gentle (field foes follow the loosened rules: aggro 3 tiles, slow chase). This file is the contract the
build agents work from. Every build agent reads `docs/briefs/COMMON.md`, `DESIGN.md`, this file and its own brief in
`docs/briefs/X1-*.md`, in that order. House rules as always: no em dashes, no git, stay in your owned paths, bound every
command, look at your own output.

Scope: **Episode 1 only** (Willowmere, the valley, the Archive, Whisperwood Hollow, interiors). A sibling designer
plans the Episode 2 expansion; section 11 lists what the two plans share so the orchestrator can merge them.

**Usage guard (Scott, week of 10/21: "slow and steady").** Same rule as Episode 3: the build is cut into waves of at
most three agents, and the orchestrator runs **one agent at a time**, in the order of section 14, checking weekly usage
before each launch (under 75%: proceed; 75 to 85%: proceed one at a time with a pause; over 85%: stop). Scott's loops
and the teams' schedule generators come first. Each agent is sized to finish in one sitting and to leave the game
publishable.


---

## 0. Summary

**Decisions folded in (Scott, 2026-10-25).** (1) **Build all of it**: no region is held back; the cut lines of section 16 stay
as written and are marked unused. (2) **New music and new SFX** for the new areas and both optional bosses, in a pack that
respects the load budget (section 10.4). (3) **Today's EXP stays** (Scott, revised 2026-10-25: no EXP cut in Episodes 1 and 2): every scale is 1.0, the main route, its sim targets and its levels are exactly as today, and the story-only versus
completionist level gap is **not** a design goal. Optional content pays in gold, named gear, items and a small EXP bonus (quest `give('exp', n)` and a per-fight `expMul`), is never required, and its EXP is
capped so a completionist is at most about one level over today's plan at each main boss (section 7, with the math). (4) **Optional areas open earlier** (section 3.3).
(5) **A more expansive map**: two more large outdoor maps (the High Moor, 72 x 36, and Larchhill, 68 x 38) with real
route choice, landmarks, hidden paths and far-off visible destinations (sections 3.4, 4.12 and 4.13). (6) Existing saves
keep working (section 12); this is all before Episode 3. (7) **The 6.5 MB initial download is not raised** (headroom is about 0.2 MB): every map, scene, data
module and art file of this plan is an expansion pack, `x1`, fetched lazily on first need and runtime-cached, built once for both expansions (`XP-packs.md`; section 11.6).

**What gets built.** Eleven new maps in five regions branching off the valley and the town, all optional:

- **West: Shepherd's Downs** (field), the hamlet of **Thornfold** (a loom house, a sheep fold, a shop and a hearth to
  rest at), the **Standing Stones** and the **Wethers' Barrow** (mini-dungeon one, with the optional boss **the Barrow
  Reeve**). Entered from a new west gate in Willowmere and from the valley's west edge, once the first fight is won.
- **The High Moor** (field, 72 x 36), north of the Downs: three ways across (a long chime road, a steep ridgeline, a hidden
  fold across the tarn), the Keepers' **Watchtower** on the skyline and Odo's hut beneath it; it also leads to the Terrace.
- **North: the Keepers' Terrace** (field), the **Orrery** (interior) and the **Keepers' Cellar** (mini-dungeon two, a
  quiet hidden-ink puzzle). Entered by a Keepers' stair in the valley's north cliff across a black cleft that only the
  Lantern bridges, or on foot from the moor.
- **South: the Lower Millrace** (field), **Hal's Mill** (interior) and the **Weir Culvert** (mini-dungeon three, with the
  optional boss **the Millstone Golem**). The road opens when the bell below the Archive tolls (`archive_f1_done`); the mill
  door stays barred from inside until the Archivore falls, and Hal asks for help.
- **Larchhill** (field, 68 x 38), the terraced orchards between the Downs and the Millrace: switchbacks, terrace stairs and an old
  aqueduct walk, Yarrow's hives and a windmill on the hilltop.
- Two loops (a **Drovers' Road** and a **Larchhill Road** between the Downs and the Millrace) so the region is a network.

Also: **six new side quests** (Strays of Thornfold, The Thirteenth Stone, Pell's Crates, Four Rolls for the Miller, The
Dark Stars, Things Not To Forget), **twenty-two ability-gated chests** (Dash Strike 11, Shove 6, Appraise 2, Lantern 3; one
Shove row is a puzzle step, so twenty-one hold something; section 6), **nine placed items** (two of them one set) and a
new consumable (Honey Roll), three new foe bodies (one ordinary, two optional bosses), six new NPCs and a sheep, **eight new
music tracks, ten new SFX and two ambiences**, and small edits to five existing maps.

**What is reused (almost everything).** The engine, field scene, cutscene API, event vocabulary (doors, signs, chests,
pots, fonts, hand-bell saves, triggers, switches, plates, push and heavy blocks, shelves, gates, locked doors, pits,
ferries, hidden ink, breakables with `behind`), W9's Dash Strike, Appraise and Shove, the Lantern, the `phased` boss AI,
telegraph `charge`, summons and haste, the simulator and its optional-zone machinery, `mapcheck`, the preview renderer,
the NPC paper-doll builder, the enemy recolor pipeline, the backdrop builder, the music tracker and SFX generator.

**What is genuinely new.** One tile sheet (`x1.png` with its fragment `x1_tiles.json`), three recolored foes, six NPC specs and a sheep (new `x1_*` atlases), eight tracks and an
`x1` SFX pack, `src/data/x1/*` data modules (including the scenes, `src/data/x1/story.js`), **three small shared engine pieces** (Appraise on
objects; the constants file `src/data/expcurve.js` (every scale 1.0) with the per-encounter `expMul`; `give('exp', n)` for quest EXP; section 11), the shared
**expansion-pack mechanism** (`XP-packs.md`, which this plan and the Episode 2 plan both use), and an off-by-default switch (`X1_LIVE`) so nothing a player can reach changes until the
last agent flips it (EXP needs no switch: every scale is 1.0, so no existing reward changes; section 7.1).

**The EXP budget (section 7).** Nothing about the main route changes: foes, EXP, levels and sim targets are today's (Echo Warden Lv 6, Archivore Lv 8, Episode 1 end Lv 9). The new optional content pays about **129 EXP in all**
(75 from fights through an `expMul` of 0.1 and 54 from six quests), on top of the existing Hollow's 258. Worst order, everything optional first: the completionist meets the Echo Warden at Lv 6 (today 6), the Archivore at **Lv 9**
(today 8, the +1 the Hollow alone already gives) and ends Episode 1 at Lv 10 (today 9), never more than one level over today's plan. Rewards are gold, named gear and items.

**Playtime, honestly (section 13).** About **+97 minutes for a typical player** (casual 70, completionist 115) on top of
about 35 minutes of optional content today: roughly **3.7 times** as much optional play. The critical path itself is the same
length: nothing new is on it.

**Waves (section 14 and `EXPANSION_SCHEDULE.md`; at most three agents in a wave; the orchestrator may run them one at a time).**
- **W1** foundations: XP-packs (first), X1-story, X1-battle.
- **W2** engine and art: X1-world, X1-tiles, X1-sprites.
- **W3** maps: X1-maps-west, X1-maps-south, X1-maps-north.
- **W4** the wide maps and sound: X1-maps-wild, X1-audio.
- **W5** connection: X1-maps-hub (the valley, town and Archive edits, the link check, the listing switch).
- **W6** assembly and launch: X1-integrate (autoplay on both routes, shots, flips `X1_LIVE`); the orchestrator publishes (P1).
- **W7** review: critic and play-critic (read-only), then X1-fixes, then P1b. Only after this does any Episode 2 art, audio or shared-data agent start.

**Done means (section 15).** A save that finished Episode 1 (and one made mid-Archive, mid-Episode 2 and at the Episode 3
quick start) loads unchanged and walks into every new area its flags allow; the completionist autoplay beats both Archive
bosses at no more than one level over today's with zero game overs and the regular route (the existing bot, unchanged) still clears it;
`node qa/run.mjs` green; `simulate.mjs --check` prints "All targets met" with every main-route number unchanged, the eight new
optional zones and both bosses, and the optional-EXP cap check (7.2) passes; the main path is the same length; every new map preview
viewed; shots with zero console errors on desktop and phone; the precache budget test inside the ratchet of `XP-packs.md` (cap unchanged; the `x1` pack at most 1.0 MB wire).

---

## 1. Scope at a glance

| Thing | Count | Reused | New work |
|---|---|---|---|
| Maps | 11 new + 5 edits | the town tileset and kit, `mapcheck`, previews, interiors copied from Willowmere's | `x1_downs`, `x1_loomhouse`, `x1_barrow`, `x1_terrace`, `x1_orrery`, `x1_cellar`, `x1_millrace`, `x1_mill`, `x1_culvert`, `x1_highmoor`, `x1_larchhill`; edits to `valley`, `willowmere`, `archive_f1`, `archive_f2`, `archive_f3` |
| Overworld routes | 11 new routes + 3 loops | doors, exits, pits | west gate, valley west edge, the Downs' north edge, the moor's stile, Keepers' stair, valley south track, Drovers' Road, Larchhill Road, the hay chute, Terrace edge drop; three routes across each wide map |
| Mini-dungeons | 3 (1 to 2 screens each) | Hollow pattern: landing, puzzle, fight, font, boss | Barrow (sliding slabs, a Shove niche, a plate), Cellar (hidden-ink constellation), Culvert (plates and heavy gates) |
| Optional bosses | 2 | `phased` AI, `charge`, summons, haste | `barrow_reeve`, `millstone_golem` (data rows) |
| Side quests | 6 | quest tables, Talk, journal, counters | `src/data/x1/quests.js` |
| Hidden / gated chests | 22 | breakables, `behind`, heavy blocks, hidden ink | 2 use the new Appraise-on-object |
| Story scenes | 42, about 180 boxes | cutscene API, scene guards | `src/data/x1/story.js`, `STAGING_X1.md` |
| NPCs | 6 named + 7 sheep | npcs.js shape, paper-doll builder | Brindle, Tamsin, Ferrick, Hesper, Odo, Yarrow, `animal_sheep` |
| Enemies | 1 ordinary + 2 bosses | 3 recolor sources, `enemies.webp` cells 1, 4, 5 | `barrow_shade`, `barrow_reeve`, `millstone_golem`; 18 encounter groups reuse existing foes with `expMul` |
| Items | 9 placed (two form a set) + 1 consumable + 4 key items | items.js shape | section 8 |
| Shops | 2 new | shops.js shape | `thornfold_loom`, `millrace_stall` |
| Tiles | 1 new sheet | autotile, wall systems, the court/forge per-floor approach | `x1.png` |
| Sprites | about 14 frame sets | recolor + derive pipelines | section 10.2 |
| Backdrops | 5 (optional) | backdrop builder | `battle_downs`, `battle_moor`, `battle_barrow`, `battle_fen`, `battle_culvert` (fallbacks named) |
| Music / SFX | 8 tracks, 10 SFX (pack `x1`), 2 ambiences | the tracker, the SFX generator, the packs mechanism | section 10.4 |
| Expansion pack | 1 (`x1`): 11 maps, `src/data/x1/**`, `x1_*` art, an asset manifest fragment | `XP-packs.md` (shared with the Episode 2 plan) | section 11.6 |

Smaller than Episode 3 in engine terms on purpose: no new battle rule, no new status, no new field mechanic beyond Appraise on
objects and quest EXP, and one global EXP constant per episode. Bigger in content.

---

## 2. Id registry (the contract)

Every id below was grepped against `src/`, `assets/` json, `qa/` and `tools/` (excluding `out/` and previews) on
2026-10-25: no collisions. Four generic words were renamed after hitting (`crates`, `stars`, `mill`, `list` as quest ids
became `pell_crates`, `dark_stars`, `four_rolls`, `not_to_forget`; `chest_niche` and `ledger_obj` became map-specific).
**Re-run the check before launch** (the orchestrator merges two expansions; the sibling may have used a word):
`grep -rwn "<id>" src qa tools assets --include=*.js --include=*.mjs --include=*.json --include=*.py`.
Prefixes: maps `x1_`; new tile, prop and sprite ids `x1_` except `animal_sheep` and the NPC sprites (`npc_` style);
events added to existing maps `x1_`; everything else is a descriptive id listed here. `game.opened` keys are
`<map>:<event>`, so event ids only need to be unique inside a map.

### 2.1 Maps

| id | Banner (title / sub) | area | size | tileset | music | ambience | lighting |
|---|---|---|---|---|---|---|---|
| `x1_downs` | Shepherd's Downs / West of the Valley | field | 56 x 34 | town + `x1` kit | `the_downs` | `wind_valley` | none; `respawn: 'reentry'` |
| `x1_loomhouse` | The Loom House / Thornfold | interior | 14 x 11 | interior | `the_downs` | none | none |
| `x1_barrow` | The Wethers' Barrow / Under the Standing Stones | dungeon | 28 x 20 | `x1` barrow floor and walls | `wethers_barrow` | `wind_valley` | dark 0.45 |
| `x1_terrace` | The Keepers' Terrace / Above the Valley | field | 60 x 22 | town + `x1` kit | `orrery` | `wind_valley` | none; `respawn: 'reentry'` |
| `x1_orrery` | The Orrery / A Keeper's Observatory | interior | 16 x 14 | interior | `orrery` | none | none |
| `x1_cellar` | The Keepers' Cellar / Below the Orrery | dungeon | 28 x 20 | `x1` cellar floor and walls | `orrery` | none | dark 0.6 |
| `x1_millrace` | The Lower Millrace / Downriver | field | 52 x 32 | town + `x1` kit | `millrace` | `river_birds` | none; `respawn: 'reentry'` |
| `x1_mill` | Hal's Mill / The Lower Millrace | interior | 16 x 12 | interior | `millrace` | none | none |
| `x1_culvert` | The Weir Culvert / Under the Millpond | dungeon | 28 x 20 | `x1` culvert floor and walls | `mystery` | `river_birds` | dark 0.4 |
| `x1_highmoor` | The High Moor / North of the Downs | field | 72 x 36 | town + `x1` kit | `high_moor` | `moor_wind` | none; `respawn: 'reentry'` |
| `x1_larchhill` | Larchhill / The Terraced Orchards | field | 68 x 38 | town + `x1` kit | `larchhill` | `larchhill_hum` | none; `ambientFx: ['motes']`; `respawn: 'reentry'` |

Zones (encounters.js): the eight map ids that hold fights (`x1_downs`, `x1_highmoor`, `x1_barrow`, `x1_terrace`, `x1_cellar`,
`x1_larchhill`, `x1_millrace`, `x1_culvert`), all `optional: true`, in `OPTIONAL_ZONES` (never `ZONE_ORDER`, so `progression()` never
counts them), unlisted behind `X1_MAPS_LISTED` exactly as Episodes 2 and 3 did, until X1-maps-hub flips it.

### 2.2 Story flags (all declared in `src/data/x1/flags.js` with a one-line meaning, registered into `FLAGS` and `FLAG_IDS` by the pack's `register()`)

Arrivals and world state: `downs_arrived`, `thornfold_arrived`, `stones_seen`, `moor_arrived`, `larchhill_arrived`, `terrace_arrived`,
`millrace_arrived`, `barrow_entered`, `cellar_entered`, `culvert_entered`, `cleft_seen`, `odo_met`, `yarrow_met`, `windmill_seen`.

Strays of Thornfold: `strays_started`, `stray_1_found` to `stray_5_found`, `strays_done`.
The Thirteenth Stone: `rollcall_started`, `roll_found`, `copy_found`, `stones_lettered`, `reeve_named`,
`barrow_reeve_defeated` (encounter flag), `rollcall_done`.
Pell's Crates: `crates_started`, `crate_1_done` (Tamsin), `crate_2_done` (Yarrow), `crate_3_done` (Ferrick),
`crates_done`, `pell_stamp` (a 10% price card at Willowmere Goods).
Four Rolls for the Miller: `mill_started`, `ferrick_met`, `pin_found`, `mill_turning`, `millstone_golem_defeated`
(encounter flag), `mill_done`.
The Dark Stars: `stars_started`, `star_1_read`, `star_2_read`, `star_3_read`, `orrery_aligned`, `stars_done`.
Things Not To Forget: `list_started`, `list_rhyme`, `list_ledger`, `list_song`, `list_done`.
Map-local chest flags (`x1_*`) belong to the map files and `game.opened`, not to `FLAGS`.

### 2.3 Key items and items (`src/data/x1/items.js`)

Key items: `burial_roll` (letter icon: "A Torn Roll of the Dead", Iris's copy of the Thornfold burial roll), `quill_copy`
(letter: "Quill's Copy", the stones as Quill copied them), `pell_crate` (counted: three crates, each handed over once),
`millstone_pin` (key: "A Millstone Pin", an iron pin as long as a forearm).

Consumable: `honey_roll` (Honey Roll, price 40, heals 100 HP to one ally; "Hal's. Too sweet. Oren eats three.").

Equipment (stat budgets in section 8): `reeves_crook`, `drovers_bow`, `fold_mantle` + `drover_boots` (set
`drovers_road`), `rollcall_charm`, `star_chart`, `millwright_apron`, `chime_staff`, `orchard_axe`.

### 2.4 Enemies, encounters, zones (section 7)

Enemies: `barrow_shade` (ordinary), `barrow_reeve` (boss), `millstone_golem` (boss). Encounters: `dn_wolves`,
`dn_scarab`, `dn_pack`; `mo_wolves`, `mo_scarabs`, `mo_wraiths`; `bw_shades`, `bw_mixed`, `barrow_reeve`; `lh_beetles`, `lh_wolves`,
`lh_mixed`; `tr_wolves`, `tr_golem`; `cl_wraiths`; `mr_weevils`, `mr_wolves`; `cv_blots`, `cv_wraith`, `millstone_golem`.
Exp ids (one file, `src/data/expcurve.js`): `EP1_EXP_SCALE`, `EP2_EXP_SCALE`, `EP3_EXP_SCALE` (all 1.0), `OPTIONAL_FOE_EXP_MUL` (1.0), `EXPANSION_FOE_EXP_MUL` (0.1), `scaleForEpisode()`, `scaleExp()`, `expScale(zoneId)` (in `encounters.js`), the encounter option `expMul`, the cutscene call `give('exp', n)`.

### 2.5 NPC ids (`src/data/x1/npcs.js`) and sprites

New: `brindle` (Downs, by the fold; sprite `npc_brindle`), `tamsin` (loom house; `npc_tamsin`; shop), `ferrick`
(Millrace, by the weir shed; `npc_ferrick`; shop), `hesper` (Orrery; `npc_hesper`), `odo` (High Moor, Watchtower hut; `npc_odo`), `yarrow` (Larchhill, the apiary; `npc_yarrow`), `stray_1` to `stray_5`
(sheep, `animal_sheep`, shown while `strays_started` and not found), `fold_sheep_a`, `fold_sheep_b` (ambient sheep in the
fold, same sprite). **Talk entries added to existing records** (prepended, always guarded by new flags, so first-match
order for old states is unchanged): `iris`, `quill`, `pell`, `hal`, `oren` (the Four Rolls payoff), `mira`/`bram`
barks come from quests and banter. Names deliberately avoid every named person in the three episodes.

### 2.6 Scenes (`src/data/x1/story.js`; map and trigger; box budget)

| Scene | Map | Trigger | Boxes |
|---|---|---|---|
| `downs_arrival` | x1_downs | on enter (first time) | 3 |
| `thornfold_arrival` | x1_downs | step trigger at the hamlet's edge | 4 |
| `brindle_strays` | x1_downs | Brindle talk entry (starts Strays) | 5 |
| `stray_found` (x5, one function) | the stray's map | stray NPC talk | 1 each |
| `strays_done` | x1_downs | Brindle talk entry | 5 |
| `stones_arrival` | x1_downs | step trigger at the ring | 3 |
| `rollcall_start` | x1_downs | Brindle talk entry (after Strays, or on seeing the stones) | 5 |
| `iris_roll` | library | Iris talk entry | 4 |
| `quill_copy` | valley | Quill talk entry | 3 |
| `rollcall_stones` | x1_downs | stones object, with both papers | 11 |
| `barrow_entry` | x1_barrow | on enter | 3 |
| `reeve_intro`, `reeve_after` | x1_barrow | step row; after the battle | 3, 5 |
| `rollcall_done` | x1_downs | Brindle talk entry | 3 |
| `cleft_hint` | valley | step trigger at the cleft (once, with Lantern) | 2 |
| `terrace_arrival` | x1_terrace | on enter | 3 |
| `hesper_meet` | x1_orrery | on enter (first time) | 6 |
| `star_read` (x3, one function) | valley | the three hidden-ink marks | 2 each |
| `orrery_align` | x1_orrery | Hesper talk entry | 8 |
| `cellar_entry`, `cellar_note` | x1_cellar | on enter; the final note object | 3, 6 |
| `crates_start`, `crate_delivered` (x3: Tamsin, Yarrow, Ferrick), `crates_done` | Willowmere Goods and the three receivers | Pell and receiver talk | 4, 2 each, 4 |
| `mill_start` | bakery | Hal talk entry (after `hal_returned`, post-Archivore) | 6 |
| `millrace_arrival`, `ferrick_meet` | x1_millrace | on enter; Ferrick talk | 3, 6 |
| `culvert_entry`, `golem_intro`, `golem_after` | x1_culvert | on enter; step row; after the battle | 2, 3, 4 |
| `pin_place` then `mill_done` (chained) | x1_millrace | the wheel object with the pin; Hal and Oren walk up the road | 4, 10 |
| `list_start`, `list_rhyme`, `list_ledger`, `list_song`, `list_done` | library and the three places | Iris, Brindle, the mill ledger, Odo | 4, 2, 2, 2, 4 |
| `moor_arrival`, `odo_meet` | x1_highmoor | on enter; Odo talk | 3, 5 |
| `larchhill_arrival`, `yarrow_meet`, `windmill_view` | x1_larchhill | on enter; Yarrow talk; the windmill ladder object | 3, 4, 3 |

Total about 180 boxes; the test caps it at 190 and no scene at more than 12.

### 2.7 Audio ids

Music: `the_downs`, `high_moor`, `wethers_barrow`, `orrery`, `larchhill`, `millrace`, `boss_reeve`, `boss_millstone`. SFX (pack `x1`):
`slab_slide`, `stone_name`, `sheep_baa`, `loom_clack`, `wheel_groan`, `star_chime`, `orrery_hum`, `hive_buzz`, `windmill_creak`,
`chime_post`. Ambience: `moor_wind`, `larchhill_hum`. (Section 10.4.)

---

## 3. World layout: the Wider Valley

### 3.1 The graph

```
                        x1_highmoor 72x36 (field)  --- stile (Dash) --->  x1_terrace 60x22 --door--> x1_orrery 16x14
                         ^   three routes: Chime Road / Ridgeline / Hidden Fold        ^  |  hatch (Dark Stars)
                         |   Watchtower + Odo                                          |  v
                         |                                  Keepers' stair (cleft, Lantern)   x1_cellar 28x20
 x1_downs 56x34 --N edge-+                                   |                         edge drop (one way) -> valley
   | Thornfold: loom door -> x1_loomhouse 14x11              |
   | Stones: barrow door  -> x1_barrow 28x20                 |
   +--- E edges <------------- VALLEY 60x40 (exists; +4 new links) --- S track (oak gone at archive_f1_done) --> x1_millrace 52x32
   |      (valley W edge, Willowmere W gate)                                                                      | mill door (barred, then Hal's)
   +--- S edge (SE): Drovers' Road ----------------------------------------------> x1_millrace NW edge            +-> x1_mill 16x12
   +--- S edge (SW): Larchhill Road --> x1_larchhill 68x38 (switchbacks / terrace stairs / aqueduct walk) --E edge--> x1_millrace W edge
                                        |  hay chute (one way) -------------------------------> Millrace            +-> x1_culvert 28x20
                                        +--> the Windmill on the hill (far-off landmark, visible from the Millrace and the Downs)
 WILLOWMERE 48x32 (exists) --West gate (Orchard Lane)--> x1_downs
```

Three loops: **town, Downs, valley, town** (out the west gate, home by the south gate); **Downs, Drovers' Road, Millrace,
valley, Downs**; **Downs, Larchhill Road, Larchhill, Millrace** (or down the hay chute). Every region has more than one way in
or out; the three dungeons are dead ends by design, with a font before their boss.

### 3.2 Link table (agreed cells; map authors fix exact cells; tests assert each lands on a walkable tile facing away from its door)

| From | Cells | To | Arrival | Present while |
|---|---|---|---|---|
| willowmere | (0, 16..17) | x1_downs | (54, 25, left) | `first_fight_done` |
| x1_downs | (55, 24..25) | willowmere | (1, 16, right) | always |
| valley | (0, 28..29) | x1_downs | (54, 11, left) | `first_fight_done` |
| x1_downs | (55, 10..11) | valley | (1, 28, right) | always |
| x1_downs | north edge (29..32, 0) | x1_highmoor | (35, 34, up) | `first_fight_done` |
| x1_highmoor | south edge (34..37, 35) | x1_downs | (30, 1, down) | always |
| x1_highmoor | east stile (71, 13..14) | x1_terrace | (1, 13, right) | the roots at the stile broken (Dash) |
| x1_terrace | west edge (0, 13..14) | x1_highmoor | (70, 13, left) | always |
| valley | stair top door (21, 3), over the cleft | x1_terrace | (6, 19, up) | the ink bridge revealed (Lantern) |
| x1_terrace | stair foot door (6, 20) | valley | (21, 6, down) | always |
| x1_terrace | pit area (56..57, 10..11), one way | valley | (36, 8, down) | always |
| valley | (22..24, 39) | x1_millrace | (23, 1, down) | `archive_f1_done` |
| x1_millrace | (22..24, 0) | valley | (23, 38, up) | always |
| x1_downs | SE (38..41, 33) | x1_millrace | (4, 1, down) | `archive_f1_done` (Ferrick's chain is down) |
| x1_millrace | NW (3..5, 0) | x1_downs | (40, 32, up) | always |
| x1_downs | SW (10..13, 33) | x1_larchhill | (31, 1, down) | `first_fight_done` |
| x1_larchhill | north edge (30..33, 0) | x1_downs | (11, 32, up) | always |
| x1_larchhill | east edge (67, 18..19) | x1_millrace | (1, 12, right) | always |
| x1_millrace | west edge (0, 12..13) | x1_larchhill | (66, 18, left) | always |
| x1_larchhill | the hay chute, a `pit` area on the mill terrace (60..61, 30..31), one way | x1_millrace | (12, 20, down) | `yarrow_met` (a gate on the chute until then) |
| x1_downs | loom door (36, 20); barrow door (14, 5) | x1_loomhouse (7, 9); x1_barrow (3, 13) | up; down | always |
| x1_terrace | orrery door (32, 9) | x1_orrery | (8, 12, up) | always |
| x1_orrery | hatch (12, 4) | x1_cellar | (3, 14, down) | `orrery_aligned` |
| x1_millrace | mill door (28, 14); culvert arch (43, 22) | x1_mill (8, 11); x1_culvert (3, 14) | up; down | the mill door: `archivore_defeated`; the arch: always |

Every return door lands on the cell in front of its door (tested both ways). The barrow door is **not** blocked by a block:
blocks reset on re-entry, so a door guarded by one would trap a returning party.

### 3.3 What opens when (earlier than the first draft; the critical path never changes)

| Place | Opens when | How the player learns it | Foe level | The journal says |
|---|---|---|---|---|
| Downs, Thornfold, Loom House, Barrow, High Moor, the Larchhill Road into Larchhill | `first_fight_done` (the teaching fight is won) | the west gate sign (Holt's note, gone once open); Mira at the valley's west fence; the Downs signpost; Talk | 3 to 6 | "Recommended Lv 3", "Lv 4" (moor), "Lv 5" (Barrow, Larchhill) |
| Keepers' Terrace | the cleft (the Lantern) **or** the moor's stile (Dash) | the stair is visible from the start; Mira and Bram say what it needs once `lantern_get` is set; the F2 Keeper's note; the moor's far tower | 6 to 7 | "Recommended Lv 6" |
| Orrery; Cellar | Terrace; the Cellar needs `orrery_aligned` | Hesper | 6 to 7 | "Recommended Lv 6" |
| Millrace road, Ferrick's Landing, the Culvert, the Drovers' Road, the valley's south track | `archive_f1_done` (the bell tolled and shook the oak clear) | the toll scene's last line; the signpost; Talk | 5 to 7 | "Recommended Lv 5" |
| Hal's Mill (the door) | `archivore_defeated` | before: the door is barred from inside and a soft sound of someone setting out bowls; after: Hal asks | none | |

A regular-route player is at today's levels, which already meet most of these numbers; the journal does not tell anyone to grind, the gates are generous and every area is walkable and avoidable. A save that finished Episode 1 has every one of these flags
except the quest ones, so it walks into all four regions. The Episode 2 and 3 quick starts carry `first_fight_done`,
`archive_f1_done`, `lantern_get`, `archivore_defeated` and `hal_returned` (`EP1_DONE_FLAGS` in `state.js`), so the doors
are open; those parties out-level the content, which is fine.

### 3.4 Route choice, landmarks, hidden paths and far-off destinations

| Journey | Ways | Notes |
|---|---|---|
| Downs to the Terrace | the Lantern cleft (short, from the valley); the moor: **Chime Road** (long, safe, nine chime posts, one guard group), **Ridgeline** (short, steep ledges, two groups, a view and a chest), **Hidden Fold** (across the tarn on a faint ink route, Lantern, then Dash through the gorse to the stile; shortest, no foes) | the stile at the moor's east edge needs a Dash either way |
| Downs to the Millrace | the **Drovers' Road** (short, on foot); the **Larchhill Road** through Larchhill (long: **switchback road** with two groups, **terrace stairs** with one, or the hidden **aqueduct walk** past a Shoved cider barrel); the one-way **hay chute** down to the Millrace | |
| Valley to the Millrace | the south track | |
| Valley to the Downs | the west edge; or the town's west gate | |

**Far-off visible destinations** (overhead decals at the horizon, the `emberpeak_far` and `court_far` precedent; they
promise a place before the player can reach it): the **Watchtower** (a tall broken silhouette on the moor's skyline)
from the Downs' ridge and the valley's north strip; **the Windmill on Larchhill** (turning sails on a hilltop) from the
Downs' south edge, the Millrace and Larchhill's north gate; the **Orrery's dome** (brass, catching light) from the moor's
east end; the Archive's willow from the Terrace. **Hidden paths**: the moor's Hidden Fold; Larchhill's aqueduct walk and cider
barrel; the Terrace's Long Walk roots; the Downs' ledge hops and Old Fold crack. **Landmarks you can hear and navigate by**:
nine **chime posts** on the moor (wind chimes: you hear the next one before you see it), the Standing Stones, Thornfold's fold
smoke, the mill wheel, the windmill's sails, the hum of Larchhill's hives.

**Fog and lighting cost.** No new `fog` object (the Fading Road's W11 fog bank is the expensive one). Larchhill uses the
cheap `ambientFx: ['motes']` (drifting pollen and bees) over its orchard terraces only; the moor uses a drifting
cloud-shadow overlay (a slow tint pass) or nothing if it costs more than 0.3 ms; both maps are `lighting: none`. Budget (tested
on the phone profile): field logic under 3 ms, field draw under 1 ms extra, 60 fps; the two big maps stream their overlays the
way the valley does (nothing per-frame beyond the visible camera box).

### 3.5 Distances (so back and forth is cheap)

Walking is 12 frames a tile (0.2 s), running 8. Willowmere's square to the west gate is about 22 tiles (5 s); the gate to
Thornfold about 18 (4 s); Thornfold to the Stones about 24 (5 s); the Downs' north edge to the Watchtower about 45 (9 s);
the moor's Chime Road end to end about 90 (18 s) against the Hidden Fold's 40 (8 s); Larchhill's switchbacks about 85 (17 s),
the terrace stairs 55, the aqueduct walk 50; the valley's bridge to the south exit about 14 (3 s); the Millrace road to the
mill about 12 (2.5 s). A quest leg is 20 to 45 seconds including fades; no quest needs more than seven legs. There is no fast
travel and none is needed (section 11.5): the loops, the hay chute, the Terrace's one-way drop and the Hidden Fold are the
shortcuts.

### 3.6 Optional foes follow the loosened field rules

- Visible enemies only, no random fights. `chase` foes notice the leader within **3 tiles** (Manhattan) and close in
  slowly (a pause of 10 frames a step: `CHASE_RANGE` and `CHASE_PACE` in `actors.js`); `guard` foes wait until
  adjacent; `wander` and `patrol` foes stay inside their radius. Dungeon foes step only when the player steps and
  notice within 5.
- **Placement rules (each maps brief carries the test):** no field foe within 6 tiles of an NPC, a door arrival cell, a
  font or a hand-bell; a `chase` foe at least 6 tiles from the centerline of any lane between an entrance and a hamlet,
  mill or observatory; a `guard`, `wander` or `patrol` foe may stand beside a lane but at least 3 tiles off its centerline,
  never on it; no group on a mandatory cell of a quest; every such lane can be walked from entrance to destination without
  passing within 3 tiles of any foe. On the wide maps this is per route: **at least one route across each is foe-free
  within 3 tiles of its centerline** (the moor's Hidden Fold, Larchhill's aqueduct walk), and the others carry the groups.
- Thornfold, the Millrace yard, the moor's Watchtower hut and Yarrow's apiary are safe zones. The Downs, Moor, Terrace,
  Larchhill and Millrace set `respawn: 'reentry'` (PLAYTEST_REVIEW_3 fix 2).
- Ordinary fights can be fled; the two bosses cannot, and each has a font just before its trigger so a lost fight
  retries at the door (PLAYTEST_REVIEW_2 fix 2).

---

## 4. Maps

General rules: DESIGN 5.1 format and MAPS.md conventions; every scene mark exists and is reachable; enemy counts match
`ZONES[zone].plan`; every puzzle reads on screen without text; lit paths lead forward, dead ends hold chests; **floors
and walls differ from room to room and from dungeon to dungeon** (CRITIQUE_3 and 4: no grey grid floating in black, no
floor pasted into the next); render previews with `tools/maps/preview.py` and view them. Coordinates are approximate;
each map author records the exact cells in `docs/maps/X1_<part>.md`. **Phone rules (CRITIQUE_4 items 7 and 8):** a
revealed ink bridge, a pressed plate and an opened slab must read at phone scale; field foes get a rim light so they
never camouflage on grass or stone.

### 4.1 `x1_downs`: Shepherd's Downs (56 x 34, field)

Rolling grass under a high sky, drystone walls, a few stands of hawthorn, gentle ledges. Calm, wide, and a long way from
anywhere.

| Area | Approx. floor | What it does |
|---|---|---|
| Gate lanes | x 44 to 55, y 9 to 12 (from the valley) and y 23 to 26 (from the town) | Two dirt lanes join one N-S lane (x 45 to 46) with the signpost `downs_signpost` (44, 18): THORNFOLD, THE STONES, DROVERS' ROAD. `downs_arrival` on first enter. No foes. |
| Thornfold | x 27 to 43, y 13 to 27 | The hamlet: the **loom house** (door `door_loom` (36, 20)), four cottages (two shuttered), the well (`thornfold_well`, a sign), a stone **sheep fold** (x 39 to 43, y 14 to 19; two ambient sheep) with **Brindle** at its gate, haystacks, a trough, a bench. The sign `thornfold_sign` stays blank until `archivore_defeated` (the town-sign fade). `thornfold_arrival` on the hamlet's edge. Wood chest `chest_well` (fixed, 3 potions). Safe zone. |
| The Stones | x 6 to 24, y 3 to 16 | A low rise with a ring of **twelve standing stones** (`x1_menhir`, blank until `stones_lettered`, then lettered), a thirteenth blank slab apart from the ring (`blank_stone`), and a turf mound in the north (x 12 to 16, y 3 to 5) with the **barrow door** `door_barrow` (14, 5) (arrival when leaving: (14, 6)). `stones_arrival` on stepping into the ring. Guard group `e_dn_wolves` at (19, 14), south-east of the ring and off the lane. |
| The Old Fold | x 10 to 24, y 21 to 30 | A ruined drystone fold with a hawthorn, hay, a trough. `stray_1` hides behind hay at (20, 26). The north wall is cracked at (17, 22) (`x1_crack_fold`, `breakable: 'rock'`, Dash): behind it the iron chest `chest_fold` (rolled) and `stray_5`. `e_dn_scarab` wanders the fold (14, 27). |
| The Ridge | x 26 to 38, y 0 to 9 | A grassy bluff reached by a path from Thornfold's north; at its top a gap in the north cliff (29 to 32, 0) is the way up to the High Moor (the Watchtower stands on the skyline); `stray_3` at (33, 5); **Patch the scarecrow** at (31, 6) (`x1_old_scarecrow`, an `object` with `appraise: true`): Appraise counts eleven pockets and reveals the hatch chest `chest_ridge` (iron, rolled) hidden `behind` it. A one-way ledge hop at (35, 9) drops to the lane. |
| Drovers' Road | x 36 to 45, y 26 to 33 | A cart track south from Thornfold to the south-east edge. A chain across it, `x1_drovers_chain` (solid, `ifNot: archive_f1_done`, inspect: "ROAD CLOSED. THE WEIR BROKE AND NOBODY CAME. - F."). Once the bell has tolled the chain lies in the road: Ferrick took it down. `e_dn_pack` chases from the ford meadow at (47, 28), six tiles east of the road (it notices within 3). Exit (38 to 41, 33) to the Millrace. |
| The Larchhill Road | x 6 to 15, y 27 to 33 | A cart track south-west from the Old Fold to the exit (10 to 13, 33) into Larchhill; the Windmill on the hill shows as a speck on the south-east horizon (overhead decal `x1_far_windmill`). No foes. |

- Enemies (3, `ZONES.x1_downs.plan`): dn_wolves 1, dn_scarab 1, dn_pack 1. Chests: wood (well), iron (fold crack),
  iron (ridge, Appraise). Strays for Strays of Thornfold: `stray_1` (hay), `stray_2` (inside the ring), `stray_3` (ridge),
  `stray_4` (in the valley pasture, 4.10), `stray_5` (behind the fold crack).
- Marks: `valley_gate` (54, 11), `town_gate` (54, 25), `lane` (45, 17), `signpost` (44, 18), `thornfold` (36, 19),
  `loom_door` (36, 20), `fold_gate` (41, 20), `brindle` (40, 21), `well` (31, 21), `stones_center` (14, 10), `ring_n`,
  `ring_e`, `ring_s`, `ring_w`, `blank_stone` (22, 8), `barrow_door` (14, 5), `fold_ruin` (18, 26), `ridge` (31, 7), `moor_gate` (30, 1),
  `larch_gate` (11, 32), `drovers` (40, 31), `drovers_exit` (40, 32). The Watchtower decal `x1_far_tower` stands on the north skyline.

### 4.2 `x1_loomhouse`: The Loom House (14 x 11, interior; copy `inn` or `smithy`'s layout and exit)

**Tamsin** at the great loom (talk opens the shop `thornfold_loom`), a spinning wheel, shelves of wool, a framed sampler
`x1_sampler` (inspect: twelve stitched names, the thread gone pale; dark again after `stones_lettered`), a bed, and **the
hearth** `thornfold_hearth` (a `font`, `safe`: full heal and save; text id `thornfold_hearth`). The exit lands on (36, 21)
facing down. Marks: `tamsin`, `hearth`, `sampler`, `door`.

### 4.3 `x1_barrow`: The Wethers' Barrow (28 x 20, dungeon, dark 0.45, `mystery`)

A long turf-and-flagstone passage under the stones: low roofs, carved niches, lit by two braziers and the party's own
light. The look is **cold green-grey flag with turf at the edges** (its own floor and wall system, CRITIQUE_3). Two bands
like the Hollow: a bottom band (landing, hall, two side chambers) and a top band (counting room, vestibule, Reeve's
hall), joined by a stair at the hall's east end.

| Area | Approx. floor | What it does |
|---|---|---|
| A. The Landing | x 1 to 6, y 13 to 18 | Arrival (3, 13) down, from the stair notch at (3, 12) (the exit door); two lit braziers; the slab `barrow_slab_a` (always readable): "A NAME FOR EACH STONE. A STONE FOR EACH NAME." `barrow_entry` on enter. Wood chest `chest_bw_landing` (fixed: 2 antidotes, an echo herb). |
| B. The Long Hall | x 7 to 26, y 14 to 16 | A corridor east. Two sliding slabs (`shelf` events, the F2 hub pattern): `slab_n` closes the north doorway (12, 13), `slab_s` the south doorway (19, 17). The floor switch `sw_slab` (15, 15) toggles which is open; **start: south open**. `e_bw_shades` patrols the hall (x 9 to 21). Stair up at the east end (26, 14) to the top band. |
| C. The Ewe Chamber (north) | x 8 to 13, y 10 to 12 | Open when the switch is thrown. A heavy block `block_niche` (10, 11) stands before a niche in the north face with the gold chest `chest_bw_bow` (fixed `drovers_bow`): Bram's **Shove** moves it a tile and clears the niche. The hero alone only rocks it. |
| D. The Ossuary (south) | x 15 to 24, y 17 to 18 | Open at the start. `e_bw_mixed` guards it. The east end is a cracked wall (`x1_crack_oss`, rock, Dash) hiding the iron chest `chest_bw_oss` (fixed: hi_potion, phoenix_feather). |
| E. The Counting Room | x 14 to 24, y 4 to 9 | Top band east. A plate puzzle: the light block `block_c` (16, 6) pushed onto `plate_c` (21, 8) (a root column at (18, 6) forces a bend: down two, then east five) opens the barred gate `gate_reeve` (13, 6). Twelve empty niches in the walls (decor). |
| F. The Shepherds' Hearth | x 9 to 12, y 5 to 8 | Behind the gate: the rune hearth `barrow_hearth` (a `font`, `safe`, text `barrow_hearth`), the rest point before the boss. The trigger row `reeve_trig` at x 5 to 8, y 6 is the hall's only way in. |
| G. The Reeve's Hall | x 2 to 8, y 3 to 9 | The **Reeve** (`barrow_reeve`, map actor, `ifNot: barrow_reeve_defeated`) before thirteen niches in the north wall (twelve lettered, one blank). After the battle: the gold chest `chest_bw_reeve` (rolled, in the corner behind him), the hidden-ink sign `barrow_names` (Lantern: the thirteen names) and the way back. |

- Enemies (2 + the boss actor): bw_shades 1, bw_mixed 1, `barrow_reeve`. Chests: wood (landing), gold (unique bow, Shove), iron
  (ossuary, Dash), gold (behind the Reeve, rolled).
- Solution (for the autoplay bot): from the landing east into the hall; leave the switch alone to take the south door
  (ossuary), throw `sw_slab` for the north door (Shove the block west); climb the east stair; push `block_c` down two,
  then east five onto `plate_c`; through the gate to the hearth; rest; step on the trigger row.
- Marks: `entrance` (3, 13), `hall_w` (8, 15), `switch` (15, 15), `niche` (10, 10), `ossuary` (17, 17), `counting` (18, 7),
  `plate` (21, 8), `hearth` (10, 6), `reeve_spot` (4, 5), `names` (4, 3), `reeve_chest` (3, 8).

### 4.4 `x1_terrace`: The Keepers' Terrace (60 x 22, field)

A long, high, windy stone walk the Keepers built along the cliff above the valley: a low parapet on the south, the cliff
rising on the north, carved cairns, a ruined beacon and a domed observatory. Bright, open and a little lonely.

| Area | Approx. floor | What it does |
|---|---|---|
| T0. The West Stile | x 0 to 4, y 11 to 16 | The moor's way in: thin roots on the moor side, a stone stile here; arrival (1, 13) from `x1_highmoor`, exit (0, 13 to 14) back. Nothing else. |
| T1. The Landing | x 2 to 12, y 14 to 20 | Arrival (6, 19) from the valley stair (the door at (6, 20) goes back). A cairn bench; the sign `terrace_sign`: "THE KEEPERS' TERRACE. MIND THE EDGE. THE EDGE DOES NOT MIND YOU." `terrace_arrival` on enter. |
| T2. The Broken Beacon | x 14 to 24, y 10 to 18 | A fallen fire tower. Wood chest `chest_beacon` (rolled). `e_tr_wolves` guards beside the lane at (22, 14), three tiles off its centerline (a thornback and a briar wolf: a tough start, a short fight). |
| T3. The Orrery Court | x 26 to 38, y 4 to 14 | The domed **Orrery** (prefab `x1_orrery_tower`, door (32, 9) to `x1_orrery`), an armillary statue, two benches facing the view, the Keepers' standing stones (decor). `e_tr_golem` (a Tome Golem and two Bookmites: a Keeper gardener construct that never got the order to stop) patrols the court's east half. |
| T4. The Long Walk | x 40 to 55, y 10 to 18 | A narrow ledge east. Thin roots choke a nook at (47, 9) (`x1_roots_terrace`, `breakable: 'roots'`, Dash): the iron chest `chest_terrace` (rolled) behind them. At the east end a low gap in the parapet (pit area (56 to 57, 10 to 11), a `pit` with `to`): **jump down** and land beside the Archive door (valley (36, 8)). The sign `edge_sign`: "THE QUICK WAY DOWN." |

- Enemies (2): tr_wolves 1, tr_golem 1. Chests: wood (beacon), iron (roots).
- Marks: `stair_in` (6, 19), `stair_door` (6, 20), `cairn` (8, 17), `beacon` (18, 13), `court` (32, 11), `orrery_door` (32, 9),
  `walk_east` (48, 14), `roots` (47, 10), `edge` (55, 10), `moor_gate` (1, 13).

### 4.5 `x1_orrery`: The Orrery (16 x 14, interior)

A round room under a brass dome: the great **Orrery** (`x1_armillary`, an `object`, three states: three stars dark, aligned),
a drafting desk, **Hesper** at the telescope, a bookshelf (`keeper_star_ledger`, a `book`), a star-plate wall
(`x1_star_plate`, an `object` with `appraise: true`: Appraise shows a drawer behind the plate; the wood chest `chest_orrery`
(fixed, 3 ethers) is hidden `behind` it), and the trapdoor `x1_hatch` (12, 4), a locked hatch until `orrery_aligned`, then
a stair down to the Cellar. Marks: `hesper`, `orrery`, `plate`, `hatch`, `door`.

### 4.6 `x1_cellar`: The Keepers' Cellar (28 x 20, dungeon, dark 0.6, `mystery`)

Where the Keepers kept their ink and their oil. Dry, cold, nearly silent. The look is **pale blue-grey tile with star
inlay** (its own floor and walls). A quiet puzzle floor, one fight, no boss: the reward is the chart.

| Area | Approx. floor | What it does |
|---|---|---|
| A. The Landing | x 1 to 6, y 14 to 18 | Arrival (3, 14) from the Orrery hatch; the font `cellar_font` (rest, `safe`) at (5, 16); `cellar_entry` on enter. |
| B. The Well Hall | x 8 to 18, y 12 to 18 | A ring path around a dry well (a pit; falling lands back at A). `e_cl_wraiths` patrols the ring. The north door (12, 11) leads up to C. |
| C. The Constellation Floor | x 4 to 25, y 3 to 10 | A dark hall whose floor is a field of pits. A route of **faint ink bridge cells** (about 30 cells, `ink_bridge_h_faint` and `_v_faint`, a zigzag shaped like a kneeling figure of stars) crosses it. The Lantern reveals cells within its radius and they stay revealed; the pit field drops harmlessly to A. One fork ends at a nook (5, 5) with the wood chest `chest_cl_nook` (rolled); the main route reaches the dais (22, 4): the gold chest `chest_cl_chart` (fixed `star_chart`) and the note `cellar_note` (the scene sets `stars_done`). |
| D. The Seed Vault | x 20 to 26, y 13 to 17 | East of the Well Hall. A cracked west wall (`x1_crack_vault`, rock, Dash); the iron chest `chest_cl_vault` (fixed: 3 echo herbs, 2 eye drops). |

- Enemies (1): cl_wraiths 1. Chests: wood (nook), gold (chart, Lantern), iron (vault, Dash). The player can leave at any time
  by the same stair.
- Marks: `entrance` (3, 14), `font` (5, 16), `well` (12, 15), `route_start` (12, 10), `dais` (22, 5), `nook` (5, 5),
  `vault` (22, 15).

### 4.7 `x1_millrace`: The Lower Millrace (52 x 32, field)

The river below the valley, sunlit, a mill on its bank and a dry weir above a millpond that has drained. Warmer and
busier than the Downs: birds, a mill cat, flour on the wind.

| Area | Approx. floor | What it does |
|---|---|---|
| M1. The Millrace Road | x 18 to 30, y 1 to 9 | From the valley (arrival (23, 1); open from `archive_f1_done`: the bell's toll shook the fallen oak off the track). Signpost: HAL'S MILL, THE WEIR, THE DROVERS' ROAD (north-west). `millrace_arrival` on enter. |
| M2. The Drovers' Road | x 2 to 18, y 1 to 8 | A track from the north-west edge (arrival (4, 1)) east to join the road at (18, 6). |
| M3. Hal's Mill | x 22 to 34, y 9 to 17 | The mill (prefab `x1_mill_building`, door `door_mill` (28, 14), **barred from inside until `archivore_defeated`**: before that a `sign` `x1_mill_barred` reads "Barred from inside. Someone is setting out bowls." and the door event has `if: archivore_defeated`) with its **wheel** on the east side (`x1_mill_wheel`, an `object`: still until the pin is set, `script: 'pin_place'`), a yard with flour carts and a cat. A heavy millstone `block_stone` (31, 15) beside the wall (Shove) uncovers a cellar hatch with the iron chest `chest_mr_stone` (fixed: phoenix_feather, 3 honey rolls). `e_mr_weevils` wanders the granary behind the mill at (24, 21). |
| M4. The Weir | x 36 to 48, y 8 to 16 | The drained millpond and the broken weir: a stone wall across the river with a failed sluice gate (scenery; the reason the wheel runs dry). A narrow ledge path across the top. |
| M5. Ferrick's Landing | x 8 to 20, y 14 to 24 | **Ferrick** at the weir-keeper's shed (shop `millrace_stall`), a jetty (where the hay chute from Larchhill lands) and a west exit (0, 12 to 13) to Larchhill's east gate, an orchard (wood chest `chest_mr_orchard`, rolled), benches. Safe zone. |
| M6. The Culvert Mouth | x 40 to 46, y 20 to 25 | The brick arch under the weir, `culvert_door` (43, 22) to `x1_culvert`. A rim-lit `e_mr_wolves` patrol on the east bank (x 34 to 40, y 28), eight tiles from the arch. |
| M7. The East Bank | x 36 to 50, y 24 to 30 | A tall-grass meadow along the dry channel. A cracked river wall (`x1_crack_bank`, rock, Dash) hides the iron chest `chest_mr_bank` (rolled). |

- Enemies (2): mr_weevils 1, mr_wolves 1. Chests: wood (orchard), iron (bank, Dash), iron (millstone, Shove).
- Marks: `valley_gate` (23, 1), `drovers_gate` (4, 1), `signpost` (22, 7), `mill_door` (28, 15), `wheel` (33, 13),
  `pin_socket` (33, 13), `weir` (42, 12), `ferrick` (14, 18), `jetty` (12, 20), `larch_gate` (1, 12), `culvert` (43, 23),
  `bank_crack` (46, 28), `stone` (31, 15). The Windmill on Larchhill shows on the south-west horizon (`x1_far_windmill`).

### 4.8 `x1_mill`: Hal's Mill (16 x 12, interior)

Two millstones (decor), a hopper and a flour bin, a ladder to a loft (decor), **Hal's table** with four bowls and four
sacks set out for a brother he could not name (`x1_flour_table`, inspect), and the **mill ledger** (`mill_ledger_obj`, a
`book`: thirty years of customers' names in Hal's hand; it sets `list_ledger` when `list_started` is on). After `mill_done`
the windowsill carries four rolls. Marks: `door`, `table`, `ledger`, `stones`.

### 4.9 `x1_culvert`: The Weir Culvert (28 x 20, dungeon, dark 0.4, `mystery`)

The brick drain under the weir, dry because the pond has drained: vaults, standing puddles, rusted sluice gear. The look
is **wet red-brown brick and iron grating**. Plates and heavy blocks, no switches to learn, one boss.

| Area | Approx. floor | What it does |
|---|---|---|
| A. The Mouth | x 1 to 6, y 14 to 18 | Arrival (3, 14) from the Millrace arch; `culvert_entry` on enter. |
| B. The Drain Hall | x 7 to 26, y 14 to 17 | A long vault with grated drain pits across row 16. Two plates open the barred gate `gate_drain` (24, 13) (AND): `plate_b1` takes the light block `block_b1` (pushed east along row 15), `plate_b2` takes the heavy block `block_b2` (Shove). `e_cv_blots` guards the hall. A cracked south wall (`x1_crack_drain`, rock, Dash) hides the iron chest `chest_cv_drain` (rolled). |
| C. The Pump Room | x 4 to 14, y 4 to 10 | North through the gate. `e_cv_wraith` guards it. The wood chest `chest_cv_pin` (fixed `millstone_pin`, sets `pin_found`) behind the old pipes. |
| D. The Hearth Landing | x 14 to 17, y 6 to 8 | A rest point: the font `culvert_font` (`safe`, text `culvert_font`) before the boss. The trigger row `golem_trig` at x 18, y 4 to 9. |
| E. The Sluice Chamber | x 18 to 26, y 3 to 10 | The **Millstone Golem** (`millstone_golem`, map actor, `ifNot: millstone_golem_defeated`) on the broken sluice gate. After the battle: the gold chest `chest_cv_golem` (rolled, behind it) and the way back. |

- Enemies (2 + the boss actor): cv_blots 1, cv_wraith 1, `millstone_golem`. Chests: wood (pin), iron (Dash), gold (behind
  the golem).
- Solution: east along row 15 pushing `block_b1` onto `plate_b1`; Shove `block_b2` onto `plate_b2`; the gate opens; north to
  the pump room; take the pin (also required for Four Rolls); rest at the hearth; boss.
- Marks: `entrance` (3, 14), `plate_1`, `plate_2`, `gate` (24, 13), `pump` (8, 7), `pin_chest` (6, 5), `hearth` (15, 7),
  `golem_spot` (22, 6), `golem_chest` (25, 4).

### 4.10 Edits to existing maps (X1-maps-hub; every existing mark, event id and walk result unchanged, tested against a frozen baseline)

**`valley` (60 x 40).** New events carry the `x1_` prefix.
- **West gate to the Downs:** at the west edge, rows 28 to 29, an exit/door to `x1_downs` (54, 11). Until `first_fight_done` a
  drovers' gate stands there (`x1_drovers_gate`, solid object, `ifNot: first_fight_done`, inspect "A drovers' gate, tied
  shut with a shepherd's knot. Not yet."), so the scripted first fight (`first_fight_trig`, the full cut of column 7)
  cannot be bypassed through the Downs. The arrival (1, 28) must be walkable.
- **The Keepers' Cleft and stair:** in the strip under the north cliff face at about x 19 to 23: a black cleft (ink
  terrain, rows 7 to 8, x 19 to 23) with a faint ink bridge (`ink_bridge_v_faint` at (21, 7) and (21, 8), revealed by the
  Lantern, saved per save), then ground at (21, 6) and a cliff stair (`cliff_stairs_bot` (21, 5), `_mid` (21, 4),
  `_top` (21, 3)) cut through the face; the door `x1_terrace_stair` at (21, 3) to `x1_terrace`. The pine filter keeps the
  notch (x 19 to 23, y 0 to 3) clear (the same early-return pattern as Episode 2's gully), and the existing pine at (19, 7)
  is dropped (it stands in the cleft's footprint). The sign `x1_cleft_sign`: "A
  black cleft before an old stair. No bridge." and the once-only trigger `x1_cleft_trig` (`cleft_hint`, `if: lantern_get`).
- **The south track:** extend the road at (22 to 24, 35 to 38) south to the edge; exit (22 to 24, 39) to `x1_millrace`
  (23, 1), with the fallen oak `x1_fallen_oak` (solid object, `ifNot: archive_f1_done`, inspect: "A fallen oak across
  the track. Somebody has been meaning to move it for a month.") and the door `x1_millrace_door` with `if:
  archive_f1_done`. The pine at (23, 37) and its neighbours in the track are dropped.
- **The pasture stray:** `stray_4` (an NPC) inside the fenced pasture (3 to 11, 18 to 23) at (7, 20), `if: strays_started`.
- **Two star marks** (Lantern, `if: stars_started`, `lantern: true`): `x1_star_mark_milestone` (38, 20) and
  `x1_star_mark_door` (beside the Archive door carving); each runs `star_read`. The third mark is on the moor's Watchtower.
- **The far Watchtower:** an overhead decal `x1_far_tower` on the north skyline above the cliff, at about (9, 0 to 2) (the moor lies
  north-west), placed so it reads as distant; `x1_far_light` is not needed here.
- **Two secrets:** Dash roots in the north cliff face at (13, 4 to 5) (`x1_roots_valley`, roots, h 2) with the iron chest
  `x1_chest_roots` (rolled) at (13, 5) `behind` it; a heavy drift log `x1_driftlog` on the south-west sand strip at (26, 37)
  (Shove) uncovering the sandbar chest `x1_chest_sandbar` (fixed: 2 hi_potions) at (26, 38).
- Marks added: `downs_gate` (1, 28), `cleft` (21, 9), `stair_foot` (21, 6), `south_track` (23, 38).
- Unchanged and tested: every existing event, mark, overlay and exit; the Episode 2 gully, crossing and bank road; the
  first-fight cut; the walk reachability of every existing mark with the Episode 1, 2 and 3 flag sets.

**`willowmere` (48 x 32).**
- **The west gate (Orchard Lane):** at (0, 16 to 17) an exit/door `x1_west_gate` to `x1_downs` (54, 25), `if:
  first_fight_done`; before that a closed gate object `x1_orchard_gate` (solid, `ifNot: first_fight_done`, inspect:
  "ORCHARD GATE SHUT TILL THE LAMBING. USE THE SOUTH GATE. - HOLT"). Stone gateposts and a lantern as decor. The arrival
  (1, 16) is already floor. **Everything is built behind `x1On('west')`** (the switch on and the `x1` pack ready) so the town is unchanged until the flip and until the pack has loaded.
- **One secret:** Wick's hole in the south wall (`x1_wall_crack`, `wall_cracked` over `wall_low` at (6, 30), rock, Dash)
  with the wood chest `x1_chest_wall` (fixed: 2 echo herbs, and a button tin that is just a tin) at (6, 31). Inspect when
  broken: "Wick says nobody knows about this hole. Everybody knows."
- Marks added: `west_gate` (1, 16).

**`archive_f1`, `archive_f2`, `archive_f3`: three small return trips (carved into unused wall fill; each adds one chest;
walk results for every existing mark unchanged).**
- F1: a Dash root wall (`x1_f1_roots`) in the entrance hall's west wall, an alcove with the iron chest `x1_chest_f1`
  (rolled). Reachable before the Lantern: the "I wonder what Dash does" reward for exploring the first floor.
- F2: **after the Lantern** a hidden-ink bridge (three `ink_bridge_h_faint` cells, `x1_f2_bridge`) east of the Echo Warden's
  rotunda crosses the moat to a small Reader's Alcove: the gold chest `x1_chest_f2` (rolled) and a Keeper's note
  (`x1_keeper_note_f2`, `lantern: true`): "WE BUILT A STAIR ABOVE THE WEST ROAD, WHERE THE CLIFF REMEMBERS. THE GAP IS
  INK. THE INK IS PATIENT." This note is the diegetic pointer to the Terrace.
- F3: a heavy bookcase `x1_f3_shelf` (`block heavy`, Shove) in a stacks aisle hides a niche: the iron chest `x1_chest_f3`
  (fixed: 2 ethers, 2 antidotes).

### 4.11 Marks and named events checklist (for `qa/maps`, mirrored in `STAGING_X1.md`)

| Map | Marks and named events |
|---|---|
| valley (edit) | marks `downs_gate cleft stair_foot south_track`; events `x1_drovers_gate x1_terrace_stair x1_cleft_trig x1_cleft_sign x1_millrace_door x1_fallen_oak x1_star_mark_milestone x1_star_mark_door x1_far_tower x1_roots_valley x1_chest_roots x1_driftlog x1_chest_sandbar`; NPC `stray_4` |
| willowmere (edit) | mark `west_gate`; events `x1_west_gate x1_orchard_gate x1_wall_crack x1_chest_wall` |
| archive_f1 / f2 / f3 (edit) | `x1_f1_roots x1_chest_f1`; `x1_f2_bridge x1_chest_f2 x1_keeper_note_f2`; `x1_f3_shelf x1_chest_f3` |
| x1_downs | section 4.1 marks; NPCs `brindle stray_1 stray_2 stray_3 stray_5 fold_sheep_a fold_sheep_b`; events `door_loom door_barrow x1_old_scarecrow chest_ridge x1_crack_fold chest_fold chest_well x1_drovers_chain x1_far_tower x1_far_light`; enemies `e_dn_wolves e_dn_scarab e_dn_pack` |
| x1_loomhouse | NPC `tamsin`; `thornfold_hearth x1_sampler` |
| x1_highmoor | section 4.12 marks; NPC `odo`; `x1_roots_stile x1_roots_gorse chest_moor_cairn chest_moor_view chest_moor_islet chest_moor_gorse x1_star_mark_tower moor_bench`; enemies `e_mo_wolves e_mo_scarabs e_mo_wraiths` |
| x1_larchhill | section 4.13 marks; NPC `yarrow`; `x1_cider_barrel x1_crack_press chest_lh_hive chest_lh_press chest_lh_aqueduct x1_mill_ladder x1_hay_chute`; enemies `e_lh_beetles e_lh_wolves e_lh_mixed` |
| x1_barrow | section 4.3 marks; `block_niche block_c plate_c gate_reeve sw_slab slab_n slab_s chest_bw_landing chest_bw_bow chest_bw_oss chest_bw_reeve barrow_hearth reeve_trig barrow_names`; actor `barrow_reeve`; enemies `e_bw_shades e_bw_mixed` |
| x1_terrace | section 4.4 marks; `x1_roots_terrace chest_beacon chest_terrace`; enemies `e_tr_wolves e_tr_golem` |
| x1_orrery | NPC `hesper`; `x1_armillary x1_star_plate chest_orrery x1_hatch keeper_star_ledger` |
| x1_cellar | section 4.6 marks; `cellar_font chest_cl_nook chest_cl_chart chest_cl_vault x1_crack_vault cellar_note`; enemy `e_cl_wraiths` |
| x1_millrace | section 4.7 marks; NPC `ferrick`; `x1_mill_wheel block_stone chest_mr_stone chest_mr_orchard chest_mr_bank x1_crack_bank`; enemies `e_mr_weevils e_mr_wolves` |
| x1_mill | `x1_flour_table mill_ledger_obj` |
| x1_culvert | section 4.9 marks; `block_b1 block_b2 plate_b1 plate_b2 gate_drain chest_cv_pin chest_cv_drain chest_cv_golem x1_crack_drain culvert_font golem_trig`; actor `millstone_golem`; enemies `e_cv_blots e_cv_wraith` |
### 4.12 `x1_highmoor`: The High Moor (72 x 36, field)

A wide heath under a bigger sky than the valley's: gorse, heather, grey rock, a black tarn, and on the skyline, the broken
Watchtower the player has seen from the Downs. Three ways across, a landmark to steer by, and a hermit at the end of the
first spur. Quiet, windy, a little eerie in the afternoon.

| Area | Approx. floor | What it does |
|---|---|---|
| M1. The Ridge Path | x 30 to 42, y 28 to 35 | Arrival (35, 34) from the Downs. The sign `moor_sign`: "THE HIGH MOOR. CHIME POSTS EVERY FIFTY PACES. FOLLOW THEM OR DO NOT." `moor_arrival` on enter. The Watchtower is visible (overhead decal) to the north-east. The first cairn `chime_1` (a `sign`: each cairn has a different carved line; the ninth reads "KEPT"). No foes. |
| Route A: the Chime Road | a loop west and north around the tarn to the spur at (44, 14) and on to the stile, about 90 tiles | A dirt path with nine chime posts, a bench at the Tarn Overlook (`moor_bench`), a cairn cache (`chest_moor_cairn`, wood, fixed: 2 antidotes, 2 eye drops). One group `e_mo_wolves` guards beside the road at (22, 26), three tiles off it. The safe, long way. |
| Route B: the Ridgeline | north from M1 over the heath ridge, about 55 tiles | Steep: one-way ledge hops (down only), a view point with a rolled iron chest (`chest_moor_view`), `e_mo_scarabs` patrol (the hump at (50, 22)) and `e_mo_wraiths` wander the north shore of the tarn (30, 8). The fast, risky way. |
| Route C: the Hidden Fold | straight across the tarn then through the gorse, about 40 tiles | The tarn is black water with faint ink steppingstones (`ink_bridge_h_faint` and `_v_faint`, about 8 cells, Lantern) to the islet (28, 18): the gold chest `chest_moor_islet` (fixed `chime_staff`); a second faint run reaches the east shore. From there thin roots (`x1_roots_gorse`, `breakable: 'roots'`, Dash) choke a gorse tunnel that comes out beside the stile, with the iron chest `chest_moor_gorse` (rolled) halfway. No foes. |
| The Watchtower and Odo's hut | x 40 to 52, y 4 to 14 | A tall ruined Keepers' tower (prefab `x1_watchtower`, a silhouette seen from afar) and a turf hut: **Odo** (chime keeper; talk and the `list_song` remembrance) and the third star mark (`x1_star_mark_tower`, `if: stars_started`, `lantern: true`, runs `star_read`). `odo_meet` on first talk. Safe zone. A spur from Routes A and B reaches it. |
| The Stile | x 64 to 71, y 10 to 17 | A Keepers' stone stile at the east edge: thin roots choke it (`x1_roots_stile`, Dash, persists) and beyond is the Terrace's west end. The Orrery's dome shows on the far horizon (`x1_far_dome`). Exit to the Terrace (1, 13). |

- Enemies (3, `ZONES.x1_highmoor.plan`): mo_wolves 1, mo_scarabs 1, mo_wraiths 1. Chests: wood (cairn), iron (view), gold
  (islet, Lantern, unique), iron (gorse, Dash). The south exit (34 to 37, 35) goes home.
- The three routes are walkable on foot from M1 to the stile; **Route C is foe-free**, and Routes A and B each carry groups
  placed beside, never on, the centerline (plan 3.6).
- Marks: `south_entry` (35, 34), `chime_1`, `chime_9` (66, 12), `tarn` (28, 20), `islet` (28, 18), `tower` (46, 8),
  `odo` (50, 12), `bench` (24, 30), `view` (50, 21), `gorse` (60, 13), `stile` (69, 13), `terrace_west` (70, 13).
- Looks: heath and gorse (tall-grass blobs recolored purple-brown), grey crags (`cliff` systems), the tarn (the `ink`
  terrain recolored to a black-green mere, `water` edge), the chime posts (the `cairn` object with three variants).
  Not a green copy of the valley (CRITIQUE_4): the palette is cooler and sparser, with long shadows from the tower.

### 4.13 `x1_larchhill`: Larchhill, the Terraced Orchards (68 x 38, field)

A hillside of stone terraces climbing to a windmill, orchards in rows, hives in the sun, an old Keepers' aqueduct along the
ridge, and the whole of it humming. The warmest map of the expansion: a late-summer afternoon after the moor's wind. It
reads as a place people work, not a place people fled. (Not a marsh and not a lighthouse: the Episode 2 expansion owns
those.)

| Area | Approx. floor | What it does |
|---|---|---|
| H1. The Lower Gate | x 26 to 38, y 0 to 7 | Arrival (31, 1) from the Downs' Larchhill Road. The sign `hill_sign`: "LARCHHILL. MIND THE BEES. THE BEES MIND YOU." `larchhill_arrival` on enter. The Windmill turns on the hilltop (overhead decal `x1_far_windmill`). A bench and a lamp post. No foes. |
| Route A: the Switchback Road | a long zigzag up the terraces and over to the east exit, about 85 tiles | A cart road cut into the hill with dry-stone walls, one-way ledge hops downhill, a wood chest at a hive stand (`chest_lh_hive`, fixed: 3 honey rolls). `e_lh_beetles` wander the lower terraces (28, 20), `e_lh_wolves` patrol the road's high bend (40, 26). The long, safe way. |
| Route B: the Terrace Stairs | stone stairs straight up through the orchard rows, about 55 tiles | Stairs, lamp posts, orchard rows and hives set well back from the stairs; one group `e_lh_mixed` guards the middle landing (46, 12), beside the stairs. The quick way, one fight. |
| Route C: the Aqueduct Walk | along the old Keepers' aqueduct on the ridge, about 50 tiles | The aqueduct's stair is plugged by a heavy cider barrel (`x1_cider_barrel`, `heavy: true`, Shove) at (34, 16); beyond it a narrow stone walk on arches high above the orchards (a view, wind, no foes), with a cracked cider-press wall (`x1_crack_press`, `breakable: 'rock'`, Dash: the iron chest `chest_lh_press`, rolled) on the way and at the far end the gold chest `chest_lh_aqueduct` (fixed `orchard_axe`); a stair at its end comes down to the east gate. |
| The Apiary and the Windmill | x 52 to 62, y 20 to 33 | **Yarrow** the beekeeper's cottage and hives (a safe zone), a cider press, and the Windmill on the hilltop (prefab `x1_windmill`) with a ladder object `x1_mill_ladder` that runs `windmill_view` (the whole valley from above, a camera pan, 3 boxes). `yarrow_meet` on first talk (the honey Hal puts in his rolls; the hay chute that Yarrow's children use is the one-way shortcut down to the Millrace, `x1_hay_chute`, a `pit` area with `to`). |
| The East Gate | x 62 to 67, y 16 to 21 | The road on to the Millrace (arrival there (1, 12)). |

- Enemies (3, `ZONES.x1_larchhill.plan`): lh_beetles 1, lh_wolves 1, lh_mixed 1. Chests: wood (hive stand), iron (press, Dash),
  gold (aqueduct, Shove, unique). Bees are scenery (ambient motes, not foes).
- Marks: `north_gate` (31, 1), `windmill` (57, 26), `ladder` (58, 24), `apiary` (56, 30), `yarrow` (57, 31), `chute` (60, 30),
  `barrel` (34, 16), `aqueduct_end` (22, 22), `press` (16, 12), `east_gate` (66, 18), `hive_stand` (12, 28).
- Looks: terraced green and gold hillside, rows of fruit trees (pine-less: `tree_willow` and `bush` recolored apple and plum),
  white hives, a whitewashed windmill, honey-coloured aqueduct stone; distinct from the valley's meadow and the Downs' grass in
  palette and shape (CRITIQUE_4: no green copies).

---

## 5. Side quests: six chains that send the player back and forth

All six are optional, none gates the main quest or any other quest, none needs a flag the main path does not set, and
each gives Talk lines (Mira's or Bram's voice, map-aware) for every step so the player is never lost. Quest ids avoid
the five Episode 1 quest ids and every Episode 2 and 3 id (`pell_crates`, `dark_stars`, `four_rolls`, `not_to_forget`,
`strays`, `rollcall`). Reward items are in section 8; flags are in section 2.2.

| # | Quest | Giver | Opens | Steps (done flag) | Legs | Reward | Boxes |
|---|---|---|---|---|---|---|---|
| 1 | **Strays of Thornfold** (`strays`) | Brindle, Thornfold | `thornfold_arrived` | find five strays (`stray_1_found` to `stray_5_found`, a counter); take word back (`strays_done`) | Downs x3 spots, fold crack, valley pasture, Thornfold | `fold_mantle`, 100 gold | 22 |
| 2 | **The Thirteenth Stone** (`rollcall`) | Brindle, then Iris and Quill | `stones_seen` | the papers (`roll_found`, `copy_found`); say the names at the stones (`stones_lettered`); the Reeve (`barrow_reeve_defeated`); Brindle (`rollcall_done`) | Thornfold, library, Pilgrim's Rest, Stones, Barrow, Thornfold | `rollcall_charm` (and `reeves_crook` from the boss) | 34 |
| 3 | **Pell's Crates** (`pell_crates`) | Pell, Willowmere Goods | `archivore_defeated` | three crates handed over (`crate_1_done` Tamsin, `crate_2_done` Yarrow, `crate_3_done` Ferrick); back to Pell (`crates_done`) | town, Thornfold, Larchhill, Millrace, town | `drover_boots`, the price card `pell_stamp` | 14 |
| 4 | **Four Rolls for the Miller** (`four_rolls`) | Hal, the bakery | `archivore_defeated` and `hal_returned` | Ferrick (`ferrick_met`); the pin from the Culvert (`pin_found`); set it at the wheel (`mill_turning`, then `mill_done`) | bakery, Millrace, Culvert, Mill | 8 honey rolls, 200 gold (and `millwright_apron` from the boss) | 36 |
| 5 | **The Dark Stars** (`dark_stars`) | Hesper, the Orrery | the first visit to the Orrery (`hesper_meet` sets `stars_started`) | read three marks (`star_1_read` to `star_3_read`, a counter: the milestone, the Archive door, the moor's Watchtower); Hesper aligns the Orrery (`orrery_aligned`); the Cellar's note (`stars_done`) | Orrery, two valley spots, the moor, Orrery, Cellar | `star_chart` (the Cellar's chest) | 26 |
| 6 | **Things Not To Forget** (`not_to_forget`) | Iris, the library | `archivore_defeated` and `mira_joined` | three remembrances (`list_rhyme` Brindle, `list_ledger` the mill ledger, `list_song` Odo's chime song); Iris (`list_done`) | library, Thornfold, Mill, the moor, library | 200 gold, 3 ethers | 14 |

Where they cross: one trip to Thornfold can progress Strays, The Thirteenth Stone, Pell's Crates and Things Not To
Forget at once; one trip to the Millrace progresses Four Rolls, Crates and Things Not To Forget. That is deliberate:
each leg earns something.

### 5.1 Strays of Thornfold (`strays`) in detail

Brindle (old, patient, counts his flock by whistling, does not need names to love a sheep) has twelve sheep in the fold
and seven in his count. Mira: "Five missing, three places a sheep would hide, and one with a fence." The strays are
`npc` events using `animal_sheep`, each `show: { if: 'strays_started', ifNot: 'stray_N_found' }`; talking to one runs
`stray_found` (a one-box bark: "Baa. It trots off toward Thornfold." and the sheep despawns with a puff), sets the flag and
raises the counter. `stray_4` stands in the valley pasture (the fenced meadow with "the sheep are out"). `stray_5` is behind
the Dash crack in the Old Fold. The journal counter is "Strays found: n of 5". When the fifth is found and Brindle is spoken
to: `strays_done`, twelve whistles, the reward. After `strays_done` the two ambient fold sheep are joined by five more.

### 5.2 The Thirteenth Stone (`rollcall`) in detail

Thornfold's dead are laid in the Wethers' Barrow under twelve stones, one stone for each of the founding families, and
every year the shepherds touched each stone and said its name aloud. Since the names began to fade the stones have gone
blank, and the Reeve, the barrow's keeper, walks the passage counting a flock that is always one short.
1. **Brindle** (`rollcall_start`): the stones are blank; Iris keeps the old rolls; Quill copies everything.
2. **Iris** (`iris_roll`) gives `burial_roll` (a torn roll: Mira reads the first nine names; the rest is gone) and sends the
   party to Quill. **Quill** (`quill_copy`, at the Pilgrim's Rest) gives `quill_copy` ("I copied the Standing Stones ten
   springs ago, because I copy everything. Twice."). With both, `roll_found` and `copy_found` are set (a two-part counter).
3. **The stones** (`rollcall_stones`, 11 boxes): the party walks the ring and says twelve names, the hero last and the
   hero's own line a single beat ("Say it and be kept"); after each name the stone's letters return (overlay swap through
   `stones_lettered`; the sampler in the loom house darkens too). The thirteenth slab stays blank: the Reeve's.
4. **The Reeve** (`reeve_intro`, `reeve_after`): the fight is the same either way, the scenes differ. With the stones
   lettered the Reeve hears twelve names and stops short of thirteen; at the end Mira says his: **Wystan, Reeve of the
   Fold** (sample name; X1-story may change it, keeping ASCII and no collision). Without them the Reeve falls still
   counting and the slab stays blank; speaking the names later at the stones sets `reeve_named` and plays the missing beat.
5. **Brindle** (`rollcall_done`): "Thirteen." The charm.

Writer's rule: nobody in this quest says "the dead are being erased by magic". They say "it was right there".

### 5.3 Pell's Crates (`pell_crates`) in detail

Pell, anxious, labels the labels. He cannot read his own crates' contents any more (the labels have gone pale; he has
relabelled them four times) and asks the party to carry three: spools to **Tamsin**, beeswax moulds to **Yarrow** in
Larchhill, a new bearing to **Ferrick**. (None of the three is in the north region, so the quest survives Cut 1.) Each receiver says what is really in the crate with a joke and a name; each hand-over is one
`crate_delivered` bark (2 boxes). Back at Pell: `crates_done`, the boots, and the `pell_stamp` card (Willowmere Goods
lists every item a tenth cheaper once `pell_stamp` is set: duplicate stock entries with `ifFlag` / `ifNotFlag`, data only).

### 5.4 Four Rolls for the Miller (`four_rolls`) in detail

After the return to Willowmere, Hal bakes honey rolls with Oren, and does not talk about the mill. The mill is a month
quiet. Hal (`mill_start`, 6 boxes): the wheel jammed the night the bell rang; he lived beside it for a month setting out
flour for a brother he could not name, and he cannot walk back in alone. He asks the party to see to it. **Ferrick**
(`ferrick_meet`) keeps the weir and the shop; the pond drained when the sluice failed; the wheel's pin dropped through a
grating into the culvert. The Culvert (3 floors of puzzle in one: plates, a heavy block, the font, the Millstone Golem)
holds `millstone_pin` in a wood chest. At the wheel (`pin_place`, then `mill_done` chained, 14 boxes together) the pin goes
in, the wheel turns, and Hal and Oren (spawned by the scene, walking up the road) stand in the mill's doorway: four
sacks on the table, four rolls on the sill, "Habit is a stubborn kind of love", and for once nobody forgets anything.
Hal's bakery lines and Oren's change after `mill_done`. **Order is free**: the Culvert opens at `archive_f1_done`, so a player may already hold
the pin (`pin_found`) and have beaten the Golem long before Hal asks; Hal's step list then skips what is done, Ferrick's first lines depend on
`mill_started`, and the quest's only forced beats are Hal's request, the pin at the wheel and the brothers' scene. Canon check: Oren's four rolls and Hal's flour are in
EPISODE1.md section 3; this chain only pays them off; it does not contradict "Hal appears after the Archivore".

### 5.5 The Dark Stars (`dark_stars`) in detail

Hesper tends the Keepers' Orrery, nine brass stars, each a Keeper's name, three of them gone dark. The Keepers wrote their
names where they built their stations: the milestone's back and the Archive door's carving in the valley, and the Watchtower on the
moor, written in hidden ink. With the Lantern the party reads each (`star_read`, 2 boxes: a name, a trade, what they
built). Back at the Orrery (`orrery_align`, 8 boxes): the three stars wake, the dome opens, the hatch's seal slides back.
Below, the Cellar's constellation floor and the chart. **The Cellar note** (`cellar_note`, 6 boxes) is a Keeper's last
entry: they did not take the names out; they put them where somebody would have to look up. It is a quiet, hopeful beat;
it does not explain the list-writer.

### 5.6 Things Not To Forget (`not_to_forget`) in detail

Iris keeps a list titled THINGS NOT TO FORGET (EPISODE1 section 3). She asks Mira (and the hero) to bring back three
remembrances from the new places: **Brindle's counting rhyme** (talk to him, 2 boxes), the **oldest name in the mill
ledger** (read it, 2 boxes), and **Odo's chime song** on the High Moor (2 boxes). (None is in the north region.) At the library (`list_done`):
Iris adds them in her best hand; Mira holds the pen for the last line. The reward is small on purpose.

### 5.7 Talk, journal and counters (the contract for X1-story)

Every step has `journal` text and at least two `chat` entries (one map-aware, one fallback) in Mira's, Bram's or the
hero's voice; counters use the existing `counter: { label, flags }` shape (Strays found, Papers, Marks read,
Remembrances, Crates handed over). `epilogue` Talk and the Episode 2 and 3 Talk keep their priority: a side quest shows
only as the one side line `partyChat` allows. Each journal entry names a recommended level. Added to `BANTER` (map ->
conditional lines): the valley (a hint about the stair once `lantern_get` is set and `terrace_arrived` is not; a hint about
the south track once `archivore_defeated`), Willowmere (the west gate once `first_fight_done`).

### 5.8 Quest EXP (a modest bonus, capped by section 7.2)

Each quest ends in `give('exp', n)` (section 11.3), unscaled: **Strays 8, The Thirteenth Stone 12, The Dark Stars 8** (all before the Archivore, 28 in all), **Pell's Crates 6, Four Rolls 12, Things Not To Forget 8**
(after it, 26 in all): **54 in all**. The amounts are small on purpose: the completionist cap of 7.2 leaves room for about 129 new EXP before the Archivore and the end of the episode, and Scott wants optional content to pay
in gold, gear and items first (section 8). The journal shows the number on the completed entry ("+12 EXP"). X1-story calls the primitive in the closing scene of each quest and the content test asserts the six
totals; X1-battle may lower (never raise) an amount if its ledger breaks the cap.

---

## 6. Exploration rewards: hidden things, secret rooms, optional bosses

### 6.1 The twenty-two gated chests (every one has a tell on screen; none is on any critical path)

| # | Where | Needs | Tell | Reward |
|---|---|---|---|---|
| 1 | valley, north cliff (13, 4 to 5) | Dash | thin roots on the face | iron, rolled |
| 2 | valley, south-west sand strip | Shove | a drift log on a narrow sand path | iron, 2 hi_potions |
| 3 | Willowmere, south wall (6, 30) | Dash | a cracked stone, a child-sized gap, "Wick's hole" | wood, 2 echo herbs |
| 4 | Archive F1, entrance hall west wall | Dash | thin roots | iron, rolled |
| 5 | Archive F2, east of the rotunda | Lantern | a faint ink bridge, after the Lantern | gold, rolled, plus the Keeper's note |
| 6 | Archive F3, a stacks aisle | Shove | a heavy bookcase beside an empty niche | iron, 2 ethers and 2 antidotes |
| 7 | Downs, Old Fold north wall (17, 22) | Dash | a cracked wall | iron, rolled (and `stray_5`) |
| 8 | Downs, the scarecrow on the ridge | **Appraise** | "Patch" has eleven pockets | iron, rolled |
| 9 | Barrow, Ewe Chamber niche | Shove (with the slab switch) | a heavy block in front of a niche | **gold, `drovers_bow`** |
| 10 | Barrow, Ossuary east wall | Dash | a cracked wall | iron, hi_potion and phoenix_feather |
| 11 | Terrace, the Long Walk roots (47, 9) | Dash | thin roots | iron, rolled |
| 12 | Orrery, the star-plate wall | **Appraise** | a plate with a keyhole-sized shadow | wood, 3 ethers |
| 13 | Cellar, the dais | Lantern | the ink-bridge route | **gold, `star_chart`** |
| 14 | Cellar, the Seed Vault wall | Dash | a cracked wall | iron, 3 echo herbs and 2 eye drops |
| 15 | Millrace, the east bank wall | Dash | a cracked river wall | iron, rolled |
| 16 | Millrace, the yard millstone | Shove | a heavy millstone beside a cellar hatch | iron, phoenix_feather and 3 honey rolls |
| 17 | Culvert, the south wall of the drain hall | Dash | a cracked wall | iron, rolled |
| 18 | Culvert, the heavy block beside the plates | Shove | the second plate's block | (the puzzle's gate; chest 17 is the optional extra) |
| 19 | High Moor, the gorse tunnel to the stile | Dash | thin roots in the gorse | iron, rolled |
| 20 | High Moor, the tarn's islet | Lantern | a faint ink route across black water | **gold, `chime_staff`** |
| 21 | Larchhill, the cider press | Dash | a cracked wall behind the press | iron, rolled |
| 22 | Larchhill, the aqueduct's far end | Shove | a heavy cider barrel plugging the aqueduct stair | **gold, `orchard_axe`** |

Count by ability: **Dash 11** (1, 3, 4, 7, 10, 11, 14, 15, 17, 19, 21), **Shove 6** (2, 6, 9, 16, 18, 22), **Appraise 2** (8, 12),
**Lantern 3** (5, 13, 20). Rows 9, 13, 20 and 22 carry unique items; row 18 is a puzzle step, so **twenty-one chests hold something**. Plus the
Lantern-gated cleft (the way to the Terrace) and the three Lantern marks of Dark Stars.

### 6.2 Fairness rules

- A hidden chest never holds the only copy of anything a quest needs (`millstone_pin` is in an ordinary chest).
- Every ability has a first-time bark when it first meets one of these in the field (the existing ones fire; the new
  Appraise-on-object bark `first_appraise_object` is Mira's: "There is something wrong with that scarecrow's pockets.").
- Appraise-on-object (section 11.1) has a **fallback**: if it is not shipped, the two Appraise chests become Lantern
  hidden-ink signs at the same cells (text change only). Nothing else in the plan depends on it.
- Heavy blocks are never placed where a block that resets on re-entry could trap the party (a door, an arrival cell, a
  one-tile corridor): each Shove block sits in front of a niche or hatch with open floor on both sides.
- Rolled chests use `rollChest(tier)` at the zone's `ilvl`; fixed chests are listed above; total new chest gold about 900
  (section 8.5).

### 6.3 Optional bosses (named loot; both behind a font; neither on any path)

| Boss | Where | Level band | Drop (guaranteed) | Idea |
|---|---|---|---|---|
| **The Barrow Reeve** (`barrow_reeve`) | Barrow, the Reeve's Hall | Lv 5 to 6 | **Reeve's Crook** (spear, Bram) | counts the flock, always one short; telegraphed hook; calls a shade at half; hastens at a quarter; weak to Mira's bow and light |
| **The Millstone Golem** (`millstone_golem`) | Culvert, the Sluice Chamber | Lv 6 to 7 | **Millwright's Apron** (body) | a grindstone given legs; telegraphed roll; calls weevils at half; the wheel runs away at a quarter; weak to thunder and axe |

Both are the data-only `phased` AI with `charge`, summons and haste, the same machinery as the Briar Alpha. Details in 7.4.

---

## 7. Combat and the EXP budget (X1-battle)

### 7.1 EXP: today's scale everywhere, one constants file, a capped bonus (shared with the Episode 2 plan)

**The rule (Scott, revised 2026-10-25).** Experience in Episodes 1 and 2 is exactly today's. No foe pays less, the main route, its sim targets and its levels do not move, and a story-only versus completionist level
gap is not a design goal. Optional content pays in **gold, named gear, items** and a **modest EXP bonus** (quest `give('exp', n)` and a per-fight `expMul`), and is never required. No Config toggle exists or is planned.

**One file.** `src/data/expcurve.js`, a leaf module with no imports, is **created by X1-battle** (wave 1) as the single place the constants live. Every scale is 1.0:

```js
export const EP1_EXP_SCALE = 1;   // Episode 1 zones (main path, Whisperwood Hollow, every x1_ zone)
export const EP2_EXP_SCALE = 1;   // Episode 2 zones
export const EP3_EXP_SCALE = 1;   // Episode 3 zones (E3-battle may revise; this build never does)
export const OPTIONAL_FOE_EXP_MUL = 1;     // the default per-encounter expMul of every optional zone that sets none (the Hollow keeps today's pay)
export const EXPANSION_FOE_EXP_MUL = 0.1;  // the expMul every NEW optional group and optional boss of either expansion carries (first pass; allowed 0.05 to 0.15; 7.2 shows why it cannot be 1)
export function scaleForEpisode(episode) { /* 1 -> EP1, 2 -> EP2, 3 -> EP3, anything else 1 */ }
export function scaleExp(raw, episode, expMul = 1) { return Math.round(raw * scaleForEpisode(episode) * expMul); }
```

`encounters.js` exports `expScale(zoneId)` = `scaleForEpisode(ZONES[zoneId]?.episode ?? 1)`. **Application point, once:** `src/battle/rules.js` `makeEnemyUnit` (it already reads `options.zone`) computes a unit's EXP as
`raw x elite multiplier x expScale(options.zone) x spec.expMul`, rounded per unit (summoned adds follow the same rule and inherit the summoner's `expMul`); `rollEncounter()` copies `expMul` onto each enemy spec as it copies
`power` and `speed`; `encounterExp(id)` sums exactly the same per-unit rounded values (no elites). Gold and mastery are not scaled; quest EXP (`give('exp', n)`, 11.3) is not scaled. `ENEMIES[id].exp` stays the raw number.
Because every scale is 1.0 and no existing encounter sets `expMul`, **every existing reward is byte-identical**: a test pins it for every existing encounter. There is no `X1_LIVE` conditional and no switch: nothing needs one.
The live battle scene already passes `zone` in its options (the simulator does; X1-battle confirms in `scenes/battle.js` and adds it through the existing options object if absent).

**Who edits what.** X1-battle (wave 1) creates `expcurve.js`, the `expMul` copy in `rollEncounter`, `expScale`, `encounterExp` and the `makeEnemyUnit` line. It is the only agent that ever edits `src/battle/rules.js` or
the EXP block of `src/data/encounters.js` in this build. The Episode 2 expansion's battle agent edits **neither those files nor `expcurve.js`**: it writes `expMul: EXPANSION_FOE_EXP_MUL` into its own encounter data (and may
set an explicit smaller `expMul` on a group if its own ledger needs it).

**Existing saves.** Nothing changes for them: stored EXP, levels, quick starts and flags are untouched, and no reward they can earn today changes.

### 7.2 The math: why the new fights cannot pay full EXP, and the cap

**Main route (Fact, `progression(1)`, unchanged):** 141 after the valley, 335 after F1, 621 after F2, 1,033 before the Archivore, 1,433 at the end; the Echo Warden is met at about 448. EXP thresholds (`EXP_TABLE`): Lv 6 424,
Lv 7 623, Lv 8 867, Lv 9 1,156, Lv 10 1,493, Lv 11 1,878. **The cap (Scott): a completionist is at most about one level over today's plan at each main boss.** "One level over" ends one threshold later; the
completionist ledger includes the existing Whisperwood Hollow (258 raw, full pay, opens at the Lantern) because it is part of today's game.

| Main boss | Today | One level over ends at | Extra EXP allowed (cumulative) |
|---|---|---|---|
| Echo Warden | about 448, Lv 6 | 866 (Lv 7) | 418 |
| Archivore | 1,033, Lv 8 | 1,492 (Lv 9) | 459 |
| Episode 1 end (carried into Episode 2) | 1,433, Lv 9 | 1,877 (Lv 10) | 444 |

**Why full pay is impossible.** The new foes are 752 raw EXP (eighteen groups 612, the two bosses 140); every one of them is available before the Archivore, and the Hollow already uses 258 of the 459 allowed there. Full pay would
put the completionist at 1,033 + 752 + 258 + quests = Lv 11 or more at the Archivore, three levels over. So the new groups and bosses carry `expMul = EXPANSION_FOE_EXP_MUL` (0.1) and quests pay a small bonus.

**The supply (first pass; X1-battle's ledger replaces the estimates and keeps the caps):**

| Source | Raw | Effective | Opens |
|---|---|---|---|
| Downs, 3 groups | 62 | 6 | `first_fight_done` |
| High Moor, 3 groups | 94 | 9 | `first_fight_done` |
| Barrow, 2 groups + the Reeve (row 60) | 62 + 60 | 12 | always |
| Larchhill, 3 groups | 97 | 10 | `first_fight_done` |
| Millrace, 2 groups | 84 | 8 | `archive_f1_done` |
| Culvert, 2 groups + the Golem (row 80) | 98 + 80 | 18 | `archive_f1_done` |
| Terrace, 2 groups | 69 | 7 | Lantern or stile |
| Cellar, 1 group | 46 | 5 | after the Orrery |
| **New fights** | 752 | **about 75** | |
| Quests (5.8): Strays 8, Thirteenth Stone 12, Dark Stars 8 (before the Archivore); Pell's Crates 6, Four Rolls 12, Things Not To Forget 8 (after) | | **28 + 26 = 54** | |
| **New optional EXP, Episode 1** | | **about 129** | |
| Whisperwood Hollow (existing, unchanged) | 258 | 258 | the Lantern |

**Worst-order check (everything optional first, elites ignored; they add at most about 9):**

| At | Extra EXP | EXP | Level (today) | Cap | Margin |
|---|---|---|---|---|---|
| Echo Warden (Downs, Moor, Barrow, Larchhill, Millrace, Culvert 63, Strays and Stone 20) | 83 | 531 | Lv 6 (6) | 418 | 335 |
| Archivore (all new fights 75, quests before it 28, Hollow 258) | 361 | 1,394 | Lv 9 (8) | 459 | 98 |
| Episode 1 end (plus the three late quests 26) | 387 | 1,820 | Lv 10 (9) | 444 | 57 |

So a completionist is at today's level at the Echo Warden, one over at the Archivore (the Hollow alone already gives that) and one over at the end of Episode 1. The Episode 2 plan starts from this ledger (its 9.6):
the Episode 1 completionist arrives at up to 1,820 EXP, 387 over the regular route. Optional gear (section 8) is power on top of these levels and is not counted; X1-battle runs one informational pass of the two bosses with
the uniques equipped (BATTLE_X1.md).

**Levers if the 400-run ledger breaks a cap (in order):** (1) lower quest EXP; (2) lower `EXPANSION_FOE_EXP_MUL` within 0.05 to 0.15; never a main-route foe, a scale, `TARGETS.levels` or a main-route sim number.

### 7.3 Zones (`encounters.js` via `src/data/x1/encounters.js`; levels are the completionist's)

| Zone | `level` | Backdrop (fallback) | Plan | Loadout for the sim | `ZONE_LOOT` (ilvl, chance) |
|---|---|---|---|---|---|
| x1_downs | [3, 4] | `battle_downs` (`valley`) | dn_wolves 1, dn_scarab 1, dn_pack 1 | `valley` at Lv 3, `archive_f1` at Lv 4 | 3, 0.10 |
| x1_highmoor | [4, 5] | `battle_moor` (`valley`) | mo_wolves 1, mo_scarabs 1, mo_wraiths 1 | `archive_f1` | 4, 0.11 |
| x1_barrow | [5, 6] | `battle_barrow` (`archive_deep`) | bw_shades 1, bw_mixed 1, barrow_reeve 1 | `archive_f2` | 5, 0.12 |
| x1_larchhill | [5, 6] | `battle_larchhill` (`valley`) | lh_beetles 1, lh_wolves 1, lh_mixed 1 | `archive_f2` | 5, 0.12 |
| x1_millrace | [5, 6] | `valley` | mr_weevils 1, mr_wolves 1 | `archive_f2` | 5, 0.12 |
| x1_terrace | [6, 7] | `valley` | tr_wolves 1, tr_golem 1 | `archive_f3` | 6, 0.12 |
| x1_cellar | [6, 7] | `archive` | cl_wraiths 1 | `archive_f3` | 6, 0.12 |
| x1_culvert | [6, 7] | `battle_culvert` (`archive_deep`) | cv_blots 1, cv_wraith 1, millstone_golem 1 | `archive_f3` | 6, 0.12 |

All eight `optional: true`, in `OPTIONAL_ZONES` (never `ZONE_ORDER`, so `progression()` never counts them), unlisted behind
`X1_MAPS_LISTED` as Episodes 2 and 3 did, until X1-maps-hub flips it. Random tables never roll legendaries.

### 7.4 Enemies and groups (reuse first; new art only where the fiction needs it)

Reused unchanged: `briar_wolf`, `moss_scarab`, `ink_slime`, `thornback_wolf`, `page_wraith`, `bookmite`, `tome_golem`,
`ink_wraith`, `ink_blot`, at their own stat lines; every new group carries `expMul: EXPANSION_FOE_EXP_MUL` (0.1, section 7.2). No stat multipliers: the
band is Episode 1's own, so the foes already fit (`power` stays available for tuning).

| Encounter | Enemies | Leader (field sprite) | Placed |
|---|---|---|---|
| dn_wolves | briar_wolf x2 | briar_wolf | guard, the Stones' south |
| dn_scarab | moss_scarab, ink_slime | moss_scarab | wander, the Old Fold |
| dn_pack | briar_wolf x2, ink_slime | briar_wolf | chase, the ford meadow |
| mo_wolves | thornback_wolf, briar_wolf | thornback_wolf | guard beside the Chime Road |
| mo_scarabs | moss_scarab x2, ink_slime | moss_scarab | patrol, the Ridgeline |
| mo_wraiths | page_wraith x2 | page_wraith | wander, the tarn's north shore |
| bw_shades | barrow_shade x2 | barrow_shade | patrol, the Long Hall |
| bw_mixed | barrow_shade, page_wraith | barrow_shade | guard, the Ossuary |
| lh_beetles | moss_scarab x2, ink_slime | moss_scarab | wander, the lower terraces |
| lh_wolves | briar_wolf x2, moss_scarab | briar_wolf | patrol, the high bend of the road |
| lh_mixed | ink_blot, ink_slime x2 | ink_blot | guard beside the terrace stairs |
| mr_weevils | moss_scarab x2, bookmite | moss_scarab | wander, the granary |
| mr_wolves | thornback_wolf x2 | thornback_wolf | patrol, the east bank |
| tr_wolves | thornback_wolf, briar_wolf | thornback_wolf | guard, the Beacon |
| tr_golem | tome_golem, bookmite x2 | tome_golem | patrol, the Orrery Court |
| cl_wraiths | ink_wraith, page_wraith | ink_wraith | patrol, the Well Hall |
| cv_blots | ink_blot x2 | ink_blot | the Drain Hall |
| cv_wraith | ink_wraith, ink_blot | ink_wraith | the Pump Room |

(Base EXP: dn 18, 19, 25; mo 35, 31, 28; bw 32, 30; lh 31, 30, 36; mr 32, 52; tr 35, 34; cl 46; cv 44, 54. The ledger of 7.2
uses these.)

**`barrow_shade`** (the one new ordinary foe; recolor of `enemies.webp` cell 1, pale green-white, rim-lit): spirit, Lv 5,
small, HP 140, ATK 14, DEF 5, MAG 24, SPR 14, SPD 14, shields 2, weak fire and light, resists ice, evade 0.1, EXP 16 (raw), gold
22, mastery 3. Moves: a chilling touch (single target, MAG, Chill 20%) 60, `hush` 25, a feeble strike 15. Flavor:
"Somebody's grandmother, grown thin. She is not angry. She is lost."

**The two optional bosses** (rows in `src/data/x1/enemies.js`; AI `phased`; boss encounters, `noFlee`, `noElite`; their `exp` is the raw
row number and the global scale and `expMul` apply like any foe):
- **`barrow_reeve`** (recolor of cell 5, the Echo Warden's body: bone white, moss, a shepherd's crook). Lv 6, large, HP 470,
  ATK 33, MAG 14, DEF 13, SPR 12, SPD 12, shields 3, **weak bow and light**, immune Silence, Poison, Blind. Crook sweep 55,
  hook 45; **charge** a telegraphed hook (the scarab's `burrow_charge` pattern: "The Reeve sets his crook for {target}. He is
  counting."), first on turn 2, cooldown 3. Phases: The Count; Muster at 50% (a `barrow_shade`: "'Where is the thirteenth?' A
  shade rises to be counted."); Short by One at 25% (Haste). EXP 60, gold 160, mastery 12. `BOSS_LOOT.barrow_reeve`:
  `reeves_crook`, 1 rare roll (ilvl 6), hi_potion 1, antidote 2. Targets as the Alpha's (careful 6 to 9 rounds, win 85% or more
  at Lv 5 and 6, attack-only 60% or less).
- **`millstone_golem`** (recolor of cell 4, the Tome Golem's body: granite grey, a cracked grindstone torso, flour dust). Lv 7,
  large, HP 760, ATK 44, MAG 8, DEF 22, SPR 10, SPD 8, shields 4, **weak thunder and axe**, resists sword and bow, immune Poison,
  Stun, Blind. Stone slam 65, a grinding turn (DEF debuff) 35; **charge** "Millstone Roll" (party: "The Golem leans on the
  wheel...") first on turn 2, cooldown 3. Phases: Turning Stone; Weevils in the Grain at 50% (a `moss_scarab`); Runaway Wheel at
  25% (Haste). EXP 80, gold 220, mastery 14. `BOSS_LOOT.millstone_golem`: `millwright_apron`, 1 rare roll (ilvl 7), hi_potion 2,
  phoenix_feather 1. Targets: careful 6 to 9 rounds, win 85% or more at Lv 6 and 7, attack-only 60% or less.

### 7.5 What tools/sim changes, and who owns it

**Nothing in the existing sim changes meaning.** `progression()`, `TARGETS` (including `levels`), the main-route zone suites, the route and economy checks, `BOSS_LEVELS` and every existing target stay exactly as they are.
Additions only, owned by X1-battle (wave 1) for both episodes; the Episode 2 expansion's battle agent, after P1, adds its own files and one registration line. `tools/sim/**` has one writer per stretch of the build.

1. `src/data/expcurve.js`, `src/data/encounters.js` (`expScale`, `encounterExp`) and `src/battle/rules.js` (the reward line): 7.1. X1-battle's alone.
2. **New `tools/sim/x1.mjs`**: loadout map, suite levels, boss levels and targets for the eight new zones and the two bosses (the Alpha's targets), imported by `simulate.mjs` through a small registry list that the Episode 2
   files join with one line (`x2.mjs`). The new zones are run at their listed levels with today's plain loadouts.
3. **New `tools/sim/optional_exp.mjs`** (the one place the optional-EXP math lives, shaped for both episodes): `OPTIONAL_SOURCES` per episode (zone groups via `encounterExp`, the Hollow, the optional bosses, quest EXP),
   `INTENDED_ORDER` (worst order), `completionRows(episode)` returning EXP and level at each main boss, and `checkOptionalCaps()`: the completionist is **at most one level over today's plan** at the Echo Warden, the
   Archivore and the end of Episode 1 (and, from the Episode 2 files, at the Other Selves and the King), with the margins of 7.2 asserted; `--check` runs it.
4. `tools/sim/route.mjs` and the economy checks: unchanged. A gold line for the completionist is reported, with no target.
5. Tests `qa/battle/x1_*.test.mjs`: every existing encounter's reward is byte-identical to the baseline (all scales 1.0, no `expMul`); a new group's reward equals the sum of `ENEMIES` EXP times `expMul` times the elite
   multiplier, rounded per unit, and `encounterExp` agrees; stored EXP and quick starts are untouched; the 7.2 caps hold; every new id resolves; no foe fells a full-HP member with one ordinary action (the W15 test).
6. The autoplay bot (X1-integrate) runs two routes: the **regular route** (the existing bot, unchanged, zero game overs) and the **completionist route** (every optional piece in the intended order; zero game overs; levels
   at no more than one over today's at each boss).

---

## 8. Loot, items and shops (X1-battle; stat budgets against the tier tables)

### 8.1 Consumable and key items

`honey_roll`: Honey Roll, price 40, `target: 'ally'`, `battle` and `field`, heals 100 HP ("Hal's honey roll. Too sweet.
Oren eats three."). It sits between a Potion (60 HP, 20 g) and a Hi-Potion (180 HP, 90 g) and is cheaper per HP than a
Potion, a small thank-you. Key items (section 2.3) have no stats.

### 8.2 Placed equipment (never random; `source` text in each row)

| id | Name | Rarity | Slot, who | Stats | Source | Peers (the check) |
|---|---|---|---|---|---|---|
| `reeves_crook` | Reeve's Crook | legendary | spear, Bram; ilvl 6, price 1500 | ATK +17, DEF +2, crit +4, Fury gain +10% | Barrow Reeve (guaranteed) | Iron Pike T2 ATK 14 DEF 1; Winged Lance T3 ATK 22 DEF 2; Thornwake (the Alpha) ATK 18 crit 4 |
| `drovers_bow` | Drover's Bow | rare (unique) | bow, Mira; ilvl 5, price 600 | ATK +14, SPD +1, crit +3 | Barrow niche chest | Hunter's Bow T2 ATK 12 SPD 1; Yew Longbow T3 ATK 19 crit 5 |
| `fold_mantle` | Fold Mantle | set `drovers_road` | mantle, all; ilvl 3, price 500 | DEF +2, SPR +2, LUK +2 | Strays of Thornfold | Wayfarer Mantle DEF 2 SPR 3 LUK 3 (ilvl 4) |
| `drover_boots` | Drover Boots | set `drovers_road` | boots, all; ilvl 5, price 600 | SPD +1, DEF +2, HP +12 | Pell's Crates | Wayfarer Boots SPD 2 DEF 1 HP 10 (ilvl 6) |
| `rollcall_charm` | Rollcall Charm | rare (unique) | charm, all; ilvl 5, price 450 | SPR +2, LUK +4, Silence resist 30% | The Thirteenth Stone | Courier's Knot SPD 1 LUK 4 Blind resist 30 |
| `star_chart` | Keeper's Star Chart | rare (unique) | charm, all; ilvl 7, price 600 | MAG +2, SPR +3, ink resist 20% | Cellar dais chest | Lantern Charm T3 SPR 3 ink 15 (ilvl 9) |
| `millwright_apron` | Millwright's Apron | legendary | body, all; ilvl 7, price 1500 | DEF +11, SPR +3, HP +30, Poison resist 50% | Millstone Golem (guaranteed) | Steel Cuirass T3 DEF 13; Mirrorguard Mail DEF 11 SPR 9 HP 20 ink 20 (ilvl 6) |
| `chime_staff` | Chime Staff | rare (unique) | staff, Mira; ilvl 6, price 520 | ATK +4, MAG +13, SPR +3, MP +6 | Moor tarn islet chest | Crystal Rod T2 ATK 5 MAG 11 MP 4; Archivist's Staff T3 ATK 7 MAG 18 SPR 4 MP 6 |
| `orchard_axe` | Orchard Axe | rare (unique) | axe, hero and Bram; ilvl 5, price 480 | ATK +14, crit +4 (no SPD penalty) | Larchhill aqueduct chest | Battle Axe T2 ATK 16 SPD -1; Bearded Axe T3 ATK 25 SPD -1 |

Set `drovers_road` (2 pieces): +25 max HP and +2 DEF ("Both pieces: +25 HP and +2 DEF"). It must stay below Wayfarer's
Promise (SPD +1 and a start of Haste); a unit test pins both. Rule for every row: **no new unique beats the best Episode 1
item of its slot by more than one tier step, and none of them reaches Episode 2's tier 3 and 4 pieces.** Together they are about a level's worth of stats for a player who does the quests: the optional content's main reward, since its EXP is capped (7.2). The
sim's loadouts do not equip them (plain bases, as always); the battle agent runs one ad-hoc pass with them on to check
that the Reeve and the Golem do not fall off the targets.

### 8.3 Shops (`src/data/x1/shops.js`)

| Shop id | Keeper | Stock |
|---|---|---|
| `thornfold_loom` | Tamsin | potion, antidote, eye drops, echo herb, honey roll 40, tent; wool mantle, leather hood, river charm (`ifFlag: archive_entered`), scholar's robe (`archive_entered`), hi-potion and traveler's boots and scout's mantle (`archive_f1_done`), phoenix feather (`archive_entered`). List prices; wool goods are the local trade |
| `millrace_stall` | Ferrick | potion, hi-potion, ether, antidote, eye drops, echo herb, phoenix feather, honey roll 40, tent; chain shirt, bronze plate, iron helm (the Episode 1 tier 2 and 3 armor already sold at the Willowmere smithy), at list price |
| `willowmere_items` (restock) | Pell | every item a tenth cheaper once `pell_stamp` is set: duplicated entries with `ifFlag: pell_stamp` and `ifNotFlag: pell_stamp` (data only) |

The shops add choice, not power (nothing here is not already sold in Willowmere or the Archive). The Terrace and the
Millrace give two more places to spend gold sensibly; a larger sink is Episode 2's job (its shops sell tier 3 and 4).

### 8.4 Affixes, names, drops

No new affix tiers. `RARE_NAME_A` is left alone. Random tables never roll legendaries.

### 8.5 Gold check (Inference; the simulator does not track gold, the autoplay gold column settles it)

Added gold: bosses 380 (160 + 220), quests 500 (Strays 100, Four Rolls 200, Things Not To Forget 200), rolled chests
about 1,180 (ten iron 650, three gold 450, three wood 85), the fixed chests carry items and no gold. About **+2,050**, against
2,906 at the end of the bot's Episode 1 (PLAYTEST_REVIEW_2); a regular-route player has none of it. Cap: **+2,300**; if the
completionist autoplay's end-of-Episode-1 gold exceeds 5,300, reduce the three gold-tier rolled chests to wood or iron before shipping.

---

## 9. Story, cast and tone (X1-story)

The expansion is Episode 1's "after the credits, before the east road" and Episode 1's "while the signs were fading". It
adds places that were always there and people who were always there, seen for the first time because the valley was
finally worth a second look. Nothing here changes what the three main characters know or want.

### 9.1 The new cast (records in `src/data/x1/npcs.js`; no portraits unless a hand portrait reaches Episode 1's tier)

| Id | Who | Where | Voice (EPISODE1 section 4 rules apply: short boxes, warm first, names with weight) |
|---|---|---|---|
| `brindle` | An old shepherd. Counts his flock by whistling, does not name his sheep, keeps the hamlet's burial roll in his head and found the stones blank | Thornfold, at the fold gate | Slow, dry, kind: "Twelve in the fold. Twelve is right. Twelve is always right." |
| `tamsin` | The weaver and the hamlet's shopkeeper; stitches a name into every cloth she sells ("so it comes home") | the loom house | Brisk, warm, a little sharp, talks with her hands: "Hold still. Ah. There. That stitch is older than my mother." |
| `ferrick` | The weirkeeper, sixty, gruff, puts up signs nobody reads; kept the chain on the Drovers' Road; does not know why he did | the Millrace, by the shed | Terse, river-wise (as Nella): "Weir broke. Told nobody. Nobody came. That's how I knew." |
| `hesper` | The Orrery's last tender, a Keeper's apprentice's grandchild; lives among brass and talks to the stars as if they were late for dinner | the Orrery | Precise, absent-minded, a little eerie, laughs at her own jokes alone (the north region only) |
| `odo` | The chime keeper of the High Moor, a hermit in a turf hut under the Watchtower; walks the nine chime posts every dawn and says each one's word aloud; never leaves the moor | the Watchtower hut | Slow, plain, a little funny, speaks to the cairns as if they could answer: "Nine. I count them. They count me." |
| `yarrow` | The beekeeper of Larchhill, who keeps hives on every terrace and a windmill's worth of opinions; her honey is what Hal bakes with; her children use the hay chute; talks to bees in a murmur | the apiary cottage | Warm, practical, a little stung: "Forty hives. Forty-one. Sorry. Say it again." |
| `stray_1` to `stray_5`, `fold_sheep_a`, `fold_sheep_b` | Sheep | various | One bark each: "Baa." and what it means |

New lines for existing NPCs (prepended, guarded by new flags; the old first-match order for old states is untouched):
**Iris** (`iris_roll`, `list_start`, `list_done`), **Quill** (`quill_copy`, and one line about the Terrace once `terrace_arrived`),
**Pell** (`crates_start`, `crates_done`; the card), **Hal** (`mill_start`; after `mill_done` a line about the mill), **Oren**
(after `mill_done`: the fifth roll), **Holt** (the note on the west gate), **Mira** and **Bram** (barks and banter at the
Stones, in the Barrow, at the cleft, on the Terrace, at the wheel). **Each new NPC gets one Episode 2 line
(`ep2_complete`) and one Episode 3 line (`ep3_started`), at most two boxes**, so the places do not freeze in time.

### 9.2 Tone and canon guardrails (checked by the reviewers)

1. **Show forgetting, never explain it.** The Reeve counts and comes up one short; Brindle's roll is a hole; Tamsin's thread
   has gone pale. Nobody says "the names are being erased".
2. **Names are spoken with weight.** The twelve-and-one scene is the set piece: each stone gets a name, said aloud, and the
   letters return. The hero says the last, and the thirteenth is the Reeve's.
3. **No word games, ever.** The names are story, never a puzzle (DESIGN hard rule 2). No letter guessing, no ordering by
   alphabet, no riddle gate. The twelve names in the plan are a sample.
4. **Hal and the mill:** the Millrace road opens when the bell below the Archive tolls, but the mill door stays barred until the
   Archivore falls (a sound of bowls behind it), and Hal's lines before that stay the bakery's.
   Pay off "four rolls on the sill" and "flour for a brother he could not name" and do not add to either. The mill's
   inside is lived in, not a shrine.
5. **The hero has no new backstory.** Nobody in the new places recognizes them, claims them, or knows who stitched the
   blanket. Mira's own hometown (the Hollow) is Episode 2's: nobody here mentions the east.
6. **The Keepers (Orrery, Cellar, F2 note).** They built things and wrote their names where someone would have to look; they
   did not take names out (EPISODE1 section 5: the last Keeper refused the order). The Orrery and the Cellar do not name the
   list-writer or explain the order.
7. **No new menace for Episodes 2 and 3.** No foe, relic or line in this plan is used as setup for them.
8. **Warm first, then the chill; humor from character** (Brindle's whistling, Tamsin's stitches, Ferrick's signs, Hesper's
   stars, Pell's labels), no modern slang, no fourth wall. ASCII only, 3 lines of 42 characters per box, `{hero}` for the
   name, no em dashes.
9. **Recommended levels** appear in the journal and nowhere else; no NPC says "you are too weak".

### 9.3 Deliverables

`src/data/x1/story.js` (42 scenes; cutscene API only; registered into `SCENES`, `LINES` and the condition lookup by the pack through `registerStory`, `SCENE_CONDITIONS`-guarded like `ep2.js` and `ep3.js`; all new
doors, NPCs and talk entries also check `x1On(region)`), the quest, flag, NPC and text modules, and
`docs/story/STAGING_X1.md` (who stands where, the marks, camera and music cue per scene, the marks checklist of 4.11).
Music cues: scenes keep the map's track; the Stones scene may go to `sorrow` and back, the Orrery alignment to `mystery`;
no new track.

---

## 10. Assets: reused and new

**Packaging rule (all of section 10; `XP-packs.md` section 5).** Every new file is a pack file and carries the `x1_` prefix: the tile sheet `assets/tiles/x1.png` with its fragment `assets/tiles/x1_tiles.json`, new sprite
atlases (`x1_npcs`, `x1_enemies_battle`, `x1_enemies_field`, `x1_bosses_battle`, `x1_heads`), backdrops `assets/backdrops/x1_*`, and the pack's manifest fragment `assets/x1_manifest.json` (written by
`sync-manifest --pack x1`). **No agent appends to `tiles.json`, a shared sprite atlas, `assets/ui/heads.*` or `assets/manifest.json`**, so nothing here enters the precache or the 6.5 MB initial download. Ids stay as named
below; only file names carry the prefix. The `x1` pack is capped at 1.0 MB wire (code, data, art); audio is budgeted in 10.4.

### 10.1 Tiles and objects (X1-tiles; new sheet `x1.png` plus the fragment `x1_tiles.json`; existing sheets and `tiles.json` untouched)

| Asset | Reuse | New |
|---|---|---|
| Terrains `x1_barrow_floor` (cold green-grey flag with turf edges), `x1_cellar_floor` (pale blue-grey tile with star inlay), `x1_culvert_floor` (wet red-brown brick) | the A2 builder and the court and forge per-floor approach | three terrains, one per dungeon, each visibly different (CRITIQUE_3 and 4) |
| Wall systems `x1_barrow` (turf-capped stone, burial niches), `x1_cellar` (blue-grey ashlar with star bands), `x1_culvert` (brick vaults with iron ribs), each with `_out` faces | wall systems with outer faces | three, with per-room variety from the start |
| The wide-map kits: heath and gorse (tall-grass blobs recolored), grey crags, the black tarn, nine `x1_chimepost` variants (a post with a hanging chime), the Watchtower prefab (`x1_watchtower`), a turf hut, the Keepers' stile; Larchhill's terrace walls and stairs (`wall_stone_*`, `cliff_stairs_*` reuse), orchard trees (recolored `tree_willow` and `bush`), white hives, a cider press, the aqueduct arches, the Windmill prefab (`x1_windmill`, sails in two frames), a hay chute; **far-off decals** `x1_far_tower`, `x1_far_windmill`, `x1_far_dome` for the horizon (the `emberpeak_far` precedent) | `ink`, `cliff`, `cliff_stairs_*`, `wall_stone_*`, `tree_*`, `bush` | the prefabs, the decals and the two palettes |
| Overworld objects: standing stones (`x1_menhir_a`, `_b`, `_lettered`), the blank slab, the turf mound with a barrow door (closed, open), haystacks, a scarecrow (the Appraise target), a stone sheep fold (uses `fence_wood` where possible), troughs, the drovers' chain gate, a fallen oak, a drift log (heavy block skin), a cleft pool edge | tiles.json objects; `fence_wood`, `well`, `signpost*`, `cairn`, `bench`, `crates_barrels` | the stones, mound, hay, scarecrow, oak, log |
| Buildings: the Loom House (prefab with `doorAt`, wool bales and a loom sign), the Mill (prefab with a wheel slot), the Orrery tower (domed prefab), two Thornfold cottages (recolors of `house_*`), the weir-keeper's shed (a recolor of `smithy`) | every Willowmere prefab | the Mill, Orrery and Loom House |
| Mechanisms: the sliding slab (the `shelf` skin), `x1_mill_wheel` (still, turning, 4 frames), `x1_armillary` (dark, aligned), `x1_star_plate`, `x1_hatch` (closed, open), `x1_drain_grate`, `x1_millstone` (heavy block skin), flour sacks and carts, a dry weir with a broken sluice, the culvert arch | `push_block`, `shelf_moving`, `door_locked_*`, `brazier_lit`, the rune shrine, `ink_bridge_*` | all of these |
| Hearth font skins: `thornfold_hearth` (a hearth), `barrow_hearth` and `culvert_font` (reuse `rune_shrine`) | font drawing | a hearth sprite |

Palette discipline: new colors only where `palette.json` cannot carry them (report each). Phone rule: a revealed bridge, a
pressed plate, an opened slab and a turning wheel must read at phone scale (render the crop and check).

### 10.2 Sprites (X1-sprites; new `x1_*` atlases only, no shared atlas appended)

| Asset | Reuse | New |
|---|---|---|
| NPCs `npc_brindle` (old, patient, a long crook), `npc_tamsin` (apron, shawl, hair pinned with a bobbin), `npc_ferrick` (oilskin, weathered, a pipe), `npc_hesper` (a Keeper's coat too big for her, spectacles on a chain), `npc_odo` (a patched grey cloak, a staff cut from a chime post), `npc_yarrow` (an apron, a veiled hat, a smoker) | the paper-doll builder, `npc_farmer`, `npc_old_woman`, `npc_scholar`, `npc_smith` bodies | six specs |
| `animal_sheep` (idle, walk, graze: 3 frames, facing 4 ways; a tufted variant) | `animal_*` layout | one animal |
| `barrow_shade` (battle, field, timeline head) | `enemies.webp` cell 1 (the page wraith's body), the recolor pipeline, `anim_frames.py` | recolor recipe, pale green-white, rim light |
| `barrow_reeve` (battle large, field avatar, frames idle/attack/hurt/die) | `enemies.webp` cell 5 (the Echo Warden's body) | recolor: bone white, moss, a shepherd's crook; readable at phone size |
| `millstone_golem` (same set) | `enemies.webp` cell 4 (the Tome Golem's body) | recolor: granite grey, grindstone torso, flour dust |
| Field sprites for the three new foes with rim light on grass and stone (CRITIQUE_4 item 8) | `enemies_field` layout | frames |
| Portraits | none | none (house rule: hand portraits only if they match Episode 1's painted tier; none is planned) |

### 10.3 Backdrops (X1-tiles, `tools/art/backdrops`; each has a named fallback in 7.2)

`battle_downs` (composed like `compose_valley.py`: grass, a drystone wall, a hawthorn), `battle_moor` (heath, gorse, a tower on the skyline), `battle_larchhill` (terraces, hives, a windmill), `battle_barrow` (a variant of
`archive_deep` with turf and a lit niche), `battle_culvert` (a variant of `archive_deep`: wet brick, a drain mouth).

### 10.4 Music and sound (X1-audio; new, within the load budget)

Scott asked for new music for the new areas and the optional bosses. Rules: **core SFX and jingles stay precached and are not
touched; the 6.5 MB initial budget is not raised** (`qa/pwa/precache.test.mjs` passes unchanged); music is lazy and
runtime-cached, never precached (as every existing track); the new SFX go in a pack `x1` and the two new ambiences are
runtime-cached like the others (the Episode 2 and 3 pattern: the manifest's `pack` key, `audio.loadPack('x1')`, which the
first `x1` sound also triggers on its own). X1-audio reports the pack's size (target: SFX pack 350 KB or less, each track 3.5
MB or less like the existing 0.9 to 4.2 MB tracks, each ambience 600 KB or less) and the precache test's numbers before and
after (identical).

**Tracks** (composed in code with the existing tracker and the shared four-note name motif, -16 LUFS, seamless loops, following
`docs/briefs/E3-audio.md` and `docs/MUSIC.md`; Suno rows in `docs/SUNO_PROMPTS.md` for each):

| id | Title | Where | Brief | Key, tempo | The motif | Fallback |
|---|---|---|---|---|---|---|
| `the_downs` | The Shepherd's Road | x1_downs, x1_loomhouse | tin whistle and fiddle over a drone, light hand drum, a lilting 6/8; open and unhurried | G major, 92, 6/8, 80 s | the whistle plays it as a shepherd's call, the fourth note answered by a second whistle far off | `valley` |
| `high_moor` | The High Moor | x1_highmoor | wide wind: low strings, hammered dulcimer, one distant horn; a long modal theme over a pedal | D Dorian, 76, 4/4, 90 s | dulcimer in long notes; the horn lands the fourth | `valley` |
| `wethers_barrow` | The Count | x1_barrow | sparse: a low choir hum, bone flute, muted frame drum counting twelve and missing the thirteenth | E minor, 66, 12/8, 80 s | the flute keeps the first three notes; the fourth never comes (a rest where the count is one short) | `mystery` |
| `orrery` | The Orrery | x1_terrace, x1_orrery, x1_cellar | glass and harp: a slow arpeggio in three against four, celesta, soft strings; clear, cold, kind | F# Lydian, 72, 100 s | the celesta plays the motif once, high, lit | `mystery` |
| `larchhill` | Larchhill | x1_larchhill | clarinet and accordion over a pizzicato and a hand-pumped drone like a hive; sunny, busy, a little drowsy | C Mixolydian, 84, 3/4, 90 s | clarinet, the fourth note answered by the accordion's drone | `valley` |
| `millrace` | The Millrace | x1_millrace, x1_mill | a waterwheel ostinato, accordion and guitar, warm and busy; a brighter B section after `mill_turning` is not needed, one loop | A major, 100, 6/8, 80 s | accordion, complete (this is the place where a name is kept) | `willowmere` |
| `boss_reeve` | One Short | the Barrow Reeve | a counting battle: bone flutes, frame drum and choir; a 12/8 drive with the last beat of each bar missing; a major bar before the loop | E minor, 132, 12/8, 100 s | the motif in the choir, always one note short, resolved once at the loop | `battle` |
| `boss_millstone` | The Wheel Runs | the Millstone Golem | grinding stone percussion, low brass, timpani, a scraping bowed bass; heavy, steady, then faster at the end of each loop | D minor, 120, 5/4, 100 s | brass, augmented, on the grind | `battle` |

The Culvert uses `mystery` (existing) with the `river_birds` ambience; the Cellar and the Terrace share `orrery` (the Cellar
plays it with the filter down: a data flag if the engine has one, else the same track).

**Cue sheet by map** (a scene that leaves its map's track puts it back before it ends): x1_downs and x1_loomhouse `the_downs`;
x1_highmoor `high_moor`; x1_barrow `wethers_barrow`; x1_terrace, x1_orrery, x1_cellar `orrery`; x1_larchhill `larchhill`; x1_millrace and
x1_mill `millrace`; x1_culvert `mystery`; the Reeve `boss_reeve`; the Golem `boss_millstone`; the Stones scene `sorrow` then
back; `orrery_align` a held chord from `orrery`; `mill_done` stays `millrace`; ordinary fights `battle`.

**SFX (pack `x1`, ten, synthesized like the Episode 1 to 3 sets) and ambience:**

| id | Use | Brief |
|---|---|---|
| `slab_slide` | the Barrow's slabs | a heavy stone scrape, 0.8 s |
| `stone_name` | a standing stone gets its letters back | a low bell-like chime over a soft carving rasp |
| `sheep_baa` | strays and ambient sheep | a mild baa, two variants |
| `loom_clack` | Tamsin's loom | two wooden clacks and a thread whisper |
| `wheel_groan` | the wheel turns (`mill_turning`) | a groan, a drip, then a steady wooden clack settling to a rhythm |
| `star_chime` | each dark star wakes | a three-note glass chime, ascending |
| `orrery_hum` | the Orrery aligned | a soft sustained brass hum with shimmer |
| `hive_buzz` | Yarrow's hives | a warm hum with a few close bees |
| `windmill_creak` | the Windmill's sails | a slow wooden creak and sweep |
| `chime_post` | a chime post struck by the wind or inspected; the stile's roots | a soft wooden wind chime, two variants |
| `moor_wind` (ambience) | the moor | wide dry wind with a faint grass hiss |
| `larchhill_hum` (ambience) | Larchhill | bees, a far windmill creak, leaves |

Existing SFX cover the rest (`block_push`, `bridge_appear`, `chest_open`, `item_get`, `level_up`). Single-writer note: the audio
manifest, `tools/audio/build.py` and the music pipeline are written by one agent at a time across both expansions
(section 11.6).

### 10.5 What this plan does not need

No new jingle, no new UI window, font, cursor or icon, no new status, no new party art, no new fog system (3.4). The new music and
SFX are section 10.4; everything else audible already exists.

---

## 11. Shared engine needs (for the orchestrator to merge with the sibling's list)

Everything above runs on the existing engine except three small pieces, one tool change and the single-writer files. Listed
so each is built once for both expansions.

### 11.1 Appraise on objects (X1-world, wave 2; size S; **fallback exists**; the one contract for both expansions)

`src/world/abilities.js` and `src/world/events.js`. An `object` event with `appraise: true` is a target for the Appraise
ability exactly as a visible enemy is: Mira steps to the front, the lens beam and reticle play, the window shows the
object's text lines (`appraiseText` id) instead of a bestiary entry, `markOpened(game, mapId, id)` is called, and any
event with `behind: 'appraise:<object id>'` appears with the existing sparkle (the breakable's reveal path; saved per save in
`game.opened`). `appraiseTarget(q, ...)` (pure) scans objects as well as enemies, **at the existing Appraise range** (X1-world reads the constant in `abilities.js` and reports it; this plan
assumed 5 tiles, the Episode 2 draft assumed 3: the existing range wins, so neither plan needs its own number), line of sight as for
enemies. A first-time bark `first_appraise_object`. `mapcheck` treats an `appraise` object as an unlocker like a
breakable (reachable when a cell within range in line is). Used twice in Episode 1 (the scarecrow, the star plate) and three times in Episode 2 (the Episode 2 expansion adopts this contract and builds
no second one: its N1 is retired). **Fallback if cut:** the Appraise chests become Lantern hidden-ink signs (section 6.2 here; behind one constant `X2_APPRAISE` in Episode 2).

### 11.2 The constants file and `expMul` per encounter (X1-battle, wave 1; size S; the one mechanism for both episodes)

Section 7.1 is the contract: the one file `src/data/expcurve.js` (every scale 1.0, `EXPANSION_FOE_EXP_MUL` 0.1), `expScale(zoneId)` and `encounterExp()` in `encounters.js`, the single application point in
`src/battle/rules.js` `makeEnemyUnit`, and the per-encounter option `expMul` (default 1; `rollEncounter()` copies it onto each enemy spec as it copies `power` and `speed`). Tests pin that every existing reward is unchanged
and that the new groups pay as 7.2 says. The Episode 2 expansion edits none of these files.

### 11.3 `give('exp', n)`, quest EXP (X1-world, wave 2; size XS; the one primitive for both expansions)

`src/world/cutscene.js` `give(itemId, qty)` already special-cases `'gold'`. `give('exp', n)` grants `n` EXP to every living
party member through `grantExp()` (`party.js`), shows the toast "The party gains n EXP.", and when a member levels up plays the
`level_up` jingle and the existing level-up lines (reuse the battle victory window's helper if it is importable, else one
message box per level-up naming the member and the new level). Never scaled; idempotent only through the caller's own flag guard. The Episode 2 expansion's quest scenes call this same primitive (`await s.give('exp', n)`); its draft `s.exp` is retired.
Pure helper node-tested.
**Fallback:** none needed beyond a one-line message; without it the completionist ledger simply loses its 54 quest EXP (the fights alone stay inside every cap).

### 11.4 `mapcheck` pending-link allowlist (X1-world; tooling; size XS)

`tools/maps/x1_links.json` lists cross-links whose target map does not exist yet when the source map is built (the stair, the
hatch, the loops, the moor and Larchhill links). `mapcheck check` treats a missing target in the list as a warning and any other
missing target as an error; an entry whose target now exists is ignored, so the file is written once (X1-world) and
X1-maps-hub adds the test that every listed target exists. The same file shape can serve the sibling.

### 11.5 Considered and rejected

- **A world-travel map or fast travel.** Maps are 20 to 45 s apart; the loops, the hay chute, the Hidden Fold and one-way drops
  already make backtracking cheap; the Keeper's mirrors do not exist until Episode 2. Rejected.
- **A new item effect that teaches an ability** ("tome" consumables for techs). Gear only; if Scott wants an ability reward it
  needs `learn: { flag }` in `skills.js` (Episode 3 adds it for Tempered Oath).
- **A sidecar map-extension hook** (events appended to a map from another file). Rejected: the hub agent edits the five
  existing maps directly, one agent, one wave.
- **A new fog system.** Rejected: ambientFx mist and nothing heavier (3.4).

### 11.6 Packs, single-writer files and the run order (both expansions; strict)

**The pack mechanism is defined once**, in `docs/briefs/XP-packs.md` (the first job of X1 wave 1): a `PACKS` table, a data entry module per pack (`src/data/x1/index.js`), `ensurePack('x1')`
(lazy, idempotent, runtime-cached by the service worker, never blocking boot, failing quietly with a retry), asset fragments, and the budget ratchet. Both this plan and the Episode 2 plan depend on it and nothing else
for loading. The 6.5 MB initial cap is not raised; growth of the initial download is capped at 0.08 MB for this expansion (ratchet: 6.38 MB after X1-integrate).

**Run order.** The whole of this plan (waves W1 to W7, X1-integrate and its publish P1, review and fixes) completes before **any** Episode 2 art, audio, battle, world or shared-data agent starts. Only the Episode 2
story agent, which writes new files only, may run earlier (after W3 closes). `EXPANSION_SCHEDULE.md` is the ordered list.

| File family | The one writer (in order) |
|---|---|
| `src/game/packs.js`, `src/data/x1/index.js`, `src/data/x2/index.js`, `src/data/x1/live.js` and `x2/live.js` (creation), `src/core/assets.js`, `src/world/maps.js`, `src/game/story.js`, the registry seams of `quests.js` / `npcs.js` / `text.js`, `src/main.js` and the title and load scenes, `tools/pwa/**`, `qa/pwa/**`, `qa/core/sync-manifest.mjs` | XP-packs (W1). Afterwards only X1-integrate and then X2-integrate, for a documented seam fix, never together |
| `src/battle/rules.js`, `src/data/encounters.js`, the registry seams of `enemies.js` / `items.js` / `loot-tables.js` / `shops.js`, `src/data/expcurve.js` (creation) | X1-battle (W1). The Episode 2 battle agent edits none of these files |
| `tools/sim/**` | X1-battle (W1, the framework for both episodes); the Episode 2 battle agent later adds its own files and one registration line |
| `src/world/abilities.js`, `events.js`, `cutscene.js`, `tools/maps/mapcheck.mjs` | X1-world (W2); the Episode 2 world agent later, for its own small items only |
| `src/data/maps/valley.js`, `willowmere.js`, `archive_f1.js`, `archive_f2.js`, `archive_f3.js` | X1-maps-hub (W5) |
| `assets/audio/manifest.json`, `tools/audio/build.py`, `assets/audio/music/*`, `docs/MUSIC.md`, `docs/SUNO_PROMPTS.md` | X1-audio (W4), then the Episode 2 audio agent |
| `assets/tiles/tiles.json`, shared sprite atlases, `assets/ui/heads.*`, `assets/manifest.json` | nobody: the packs add fragments and new atlases instead (`XP-packs.md` section 5) |
| `assets/x1_manifest.json`, `assets/pack_files.json` | generated (`sync-manifest --pack x1`, `build_pwa.py`); the orchestrator runs them once more at each wave close |
| `qa/shots.json`, `qa/autoplay.py`, `qa/autoplay_grid.mjs` | X1-integrate (the Episode 2 integrate agent uses `qa/shots_x2.json` and `qa/autoplay_x2.py`) |
| `docs/PROGRESS.md`, `docs/PLAN.md` | the orchestrator |

Inside a wave the agents own disjoint paths (section 14 and `EXPANSION_SCHEDULE.md` list them); two agents of a wave never share a file.

### 11.7 Shared-file protocol, and where the two plans overlap in content

1. **New content lives in new files**: `src/data/x1/{flags,quests,npcs,text,enemies,encounters,loot,items,shops,story}.js` (each exports `register()`), `src/data/x1/live.js`, `src/data/x1/index.js`. **Registration is by
   mutation when the pack loads** (`XP-packs.md` section 2); the earlier "one-line additive merges" by X1-integrate are gone, and so is any dependence on the Episode 2 draft's `expansions.js` registry (the pack index is that
   registry). X1-integrate's glue is therefore tests, fixtures and the flips, not data edits.
2. **Ids.** Ours are `x1_`-prefixed (maps, tiles, events in existing maps) or descriptive and grepped (section 2). The orchestrator re-runs the grep with the Episode 2 registry before launching either build; the
   2026-10-25 reconciliation already renamed the Episode 2 dungeon, enemy and encounters that collided (`barrow_shade`, `bw_*`; see the decision log).
3. **Talk prepends.** Both plans prepend entries to the same NPCs (Hal, Iris, Quill, Oren are likely): every prepended entry is guarded by flags only its own plan sets, so order does not matter.
4. **The EXP rule is shared** (11.2): the Episode 2 plan publishes its own ledger like section 7.2 and starts from our completionist end (up to 1,820 EXP, 387 over the regular route); its quick start stays 1,433.

---

## 12. Save compatibility (read this before touching anything that writes a map, an NPC or a flag)

**The rule: additive only.** No flag, map id, event id, mark, NPC id, item id, shop id, encounter id, scene id or text id
that exists today is renamed, removed, moved or reinterpreted. New ones only.

### 12.1 What is guaranteed and how it is tested

| Guarantee | Test (X1-maps-hub unless noted) |
|---|---|
| Every existing flag still exists with its meaning | `FLAG_IDS` before is a subset of after (X1-story) |
| Every existing map's marks, event ids, exits and overlays are present and unchanged | a frozen baseline JSON of the five edited maps is generated **before the first edit** (`qa/maps/x1_baseline/`) and diffed; only listed additions may appear |
| Every previously reachable cell stays reachable and every existing mark is reachable with the Episode 1, 2 and 3 flag sets | `mapcheck walk` before and after, for each flag set, per edited map |
| No new solid thing sits on a cell a save can stand on (door arrivals, fonts, bells, `lastSafe` cells, mark cells) | a test collects every arrival, font, save and mark cell of each edited map and asserts it is not solid after the edits |
| With `X1_LIVE` false (or the `x1` pack not loaded) the game is byte-identical in behavior, rewards included | resolved maps, NPC talk lists, shops, quests and journal for a matrix of flag states are deep-equal to baseline (X1-integrate) |
| First-match talk order for old states is unchanged | for every edited NPC, with all new flags false, the resolved talk equals baseline across Episode 1, 2 and 3 flag states |
| Stored EXP, levels and quick starts never change, and no existing reward changes (all scales 1.0) | a test loads each fixture, runs one battle with the scale on, and checks the old EXP and level unchanged and the new EXP equal to the scaled amount (X1-battle) |
| Fixture saves load and play | loads `qa/out/autoplay/*ep1-credits-save.json` (Lv 10), an Archive F2 mid-run save, an Episode 2 mid-Court save and `newGameEp3`; each walks into every new area its flags allow and back out, with no console error (X1-integrate) |
| A dungeon or boss can be left and re-entered without a trap | each dungeon test leaves by the entrance at every checkpoint (X1 maps briefs) |

### 12.2 What a save sees

| Save state | Result |
|---|---|
| In the valley before `first_fight_done` | the two new gates are shut and sign-posted; the first fight trigger is unchanged |
| Mid-Archive, before the Lantern | the Downs, the moor, the Barrow and Larchhill are open (the Archive's own flags do not matter); the Millrace is open once `archive_f1_done` is set and shut before; the cleft's bridge is a pit until the Lantern (the moor's stile is the other way up); the mill door is barred |
| Archive finished, `ep1_complete` | all three regions open; Hal at the bakery asks about the mill; the finished save's position (home bed or wherever) is unchanged |
| Mid-Episode 2 or 3 | the same doors are open; new NPCs have a late line; no scene or flag of Episodes 2 or 3 is touched |
| `newGameEp2` / `newGameEp3` quick starts | `EP1_DONE_FLAGS` already contains `first_fight_done`, `archive_f1_done`, `lantern_get`, `archivore_defeated`, `left_town`, `hal_returned`, so the regions are open; the party out-levels the foes (EXP is tiny) and the rewards are minor |
| A save made inside a new dungeon, then the game updated | not applicable on first release; later releases keep the same ids |

### 12.3 Mechanisms

- **EXP**: every scale in `expcurve.js` is 1.0 and no existing encounter sets `expMul`, so no existing reward changes and nothing needs a conditional (7.1). Only the new optional groups pay at `expMul` 0.1.
- **`X1_LIVE`** (`src/data/x1/live.js`, created by XP-packs) is false until X1-integrate flips it; every new door, NPC, scene entry, shop line
  and talk entry in existing files checks `x1On(region)`, which is true only when the switch is on, the region is on (`X1_REGIONS` lets a region ship off) and the `x1` pack has loaded.
- **The pack** (`XP-packs.md`): the eleven maps, the data modules, the scenes and the art load on first need; a failed load leaves Episode 1 exactly as it was (the edits to the five existing maps are gated by `x1On`).
- New persistent state is flags (in `FLAGS` and `FLAG_IDS`), counters-by-flags, `game.opened` (per map), `game.bestiary` (new foes). Nothing
  new in the save schema; `autosaveSlot` from Episode 3 is unaffected.
- The repo's existing rule that blocks and pots reset on re-entry means no door, arrival or corridor is ever guarded by a
  block (3.2); heavy blocks sit before niches only.

---

## 13. Playtime, honestly (Inference; settled by the story timer and the autoplay clock, section 15)

Existing optional content is about **35 minutes** (EPISODE1 section 1: "15 to 20 of optional side stories", the Hollow at 10 to 15,
secrets 3 to 5). Estimates use 6 seconds a box (Episode 2's first-fight measure), 75 seconds for an ordinary fight, 4 minutes
for a boss, 0.5 minute a hidden chest and 3 to 5 minutes of wandering per field map (more on the two wide maps).

| Slice | Reading | Fights (typical) | Puzzles and exploring | Legs | Typical |
|---|---|---|---|---|---|
| West: Downs, Thornfold, Barrow; Strays, Thirteenth Stone | 6 | 9 | 9 | 3 | **28** |
| The High Moor: three routes, the Watchtower, Odo | 1.5 | 3 | 4.5 | 1 | **10** |
| South: Millrace, Mill, Culvert; Four Rolls | 4 | 8 | 8.5 | 1.5 | **22** |
| Larchhill: three routes, the windmill, Yarrow | 1.5 | 3 | 4 | 0.5 | **9** |
| North: Terrace, Orrery, Cellar; Dark Stars | 3.5 | 2.5 | 9 | 2 | **17** |
| Pell's Crates, Things Not To Forget | 3 | 0 | 0 | 4.5 | **7** |
| Hub: valley, town and Archive secrets | 0 | 0 | 4 | 0 | **4** |
| **Everything** | 20 | 25 | 39 | 12.5 | **about 97** |

Casual (skips half the fights and chests) about 70; completionist (every fight, every chest, slow reading) about 115. Today's
35 minutes of optional play become about **130**: **roughly 3.7 times**. That is what "build all" costs, and each of Scott's four asks
is 15 to 30 minutes on its own. The critical path is **exactly as long as before**: no scene, door or fight is added to it. The timer measures it.

Pacing safeguards: every region opens with a quiet minute (no foe within 6 tiles of the entry; a safe hamlet or jetty before
any fight); every wide map has a foe-free route; the first fight of a region is optional and starts when the player chooses;
ordinary foes are fleeable; every boss is behind a font; every quest step names its next step in Talk; the story timer counts
boxes per scene (cap 12) and in total (cap 190); respawn is `reentry`; no dungeon exceeds two screens; the optional world pays
in gold, gear and items first and in EXP only a little, so it is never a grind and never needed.

---

## 14. Build plan: waves and agent briefs

Every agent: read `docs/briefs/COMMON.md`, `DESIGN.md`, `docs/EXPANSION_RECONCILIATION.md`, this plan and its brief; stay in owned paths; keep `node qa/run.mjs` green
(Episodes 1, 2 and 3 unchanged in meaning); no git; no em dashes; report under 400 words. Where an agent needs
something not yet delivered, it stubs the agreed id and says so (Episode 3's rule). The ordered schedule with launch prompts, gates and publish points is `docs/EXPANSION_SCHEDULE.md`.

**At most three agents in a wave, and within a wave every agent owns paths no other agent of that wave owns** (the tables below are the proof; `EXPANSION_SCHEDULE.md` repeats them). The orchestrator may
run a wave one agent at a time under the usage guard, in table order. **Every step leaves the game publishable**: nothing a player can reach changes until X1-integrate flips `X1_LIVE`; no EXP changes at all (section 7.1). Nothing of Episode 2 starts before P1b (section 11.6), except the Episode 2 story agent after W3.

| Order | Wave | Agent | Size | Brief | Owned paths (disjoint within the wave) |
|---|---|---|---|---|---|
| 1 | W1 | XP-packs | M | `docs/briefs/XP-packs.md` | `src/game/packs.js`, `src/data/x1/index.js`, `src/data/x2/index.js`, `src/data/x1/live.js`, `src/data/x2/live.js`, `src/core/assets.js`, `src/world/maps.js`, `src/game/story.js`, registry seams in `src/data/quests.js` / `npcs.js` / `text.js`, `src/main.js` and the title and load scenes (call sites), `tools/pwa/**`, `qa/pwa/**`, `qa/core/pack_*`, `qa/core/sync-manifest.mjs`, `docs/PWA_PACKS.md` |
| 2 | W1 | X1-story | M | `docs/briefs/X1-story.md` | `src/data/x1/{flags,quests,npcs,text,story}.js`, `docs/story/STAGING_X1.md`, `qa/content/x1_*` |
| 3 | W1 | X1-battle | L | `docs/briefs/X1-battle.md` | `src/data/expcurve.js`, `src/data/x1/{enemies,encounters,loot,items,shops}.js`, the EXP block and registry seams of `src/data/{encounters,enemies,items,loot-tables,shops}.js`, `src/battle/rules.js` (reward line and `expMul`), `src/scenes/battle.js` (the `zone` option, only if absent), `tools/sim/**`, `qa/battle/**`, `docs/BATTLE_X1.md` |
| 4 | W2 | X1-world | S | `docs/briefs/X1-world.md` | `src/world/abilities.js`, `src/world/events.js`, `src/world/cutscene.js` (`give('exp')` only), `tools/maps/mapcheck.mjs`, `tools/maps/x1_links.json`, `qa/world/x1_*`, `docs/WORLD.md` (a section) |
| 5 | W2 | X1-tiles | M | `docs/briefs/X1-tiles.md` | `tools/art/tiles/x1_*`, the one `x1` line in `tools/art/tiles/build_tiles.py`, `tools/art/tiles/out/x1/**`, `assets/tiles/x1.png`, `assets/tiles/x1_tiles.json`, `tools/art/backdrops/x1_*`, `assets/backdrops/x1_*` |
| 6 | W2 | X1-sprites | M | `docs/briefs/X1-sprites.md` | `tools/art/sprites/x1_*`, the one `x1` line in `tools/art/sprites/build_all.py`, `tools/art/sprites/chars/x1_*`, `assets/sprites/x1_*`, `assets/ui/x1_heads.*` |
| 7 | W3 | X1-maps-west | M | `docs/briefs/X1-maps-west.md` | `src/data/maps/x1_downs.js`, `x1_loomhouse.js`, `x1_barrow.js`, `tools/maps/previews/x1_downs*`, `x1_loomhouse*`, `x1_barrow*`, `qa/maps/x1_west.test.mjs`, `docs/maps/X1_WEST.md` |
| 8 | W3 | X1-maps-south | M | `docs/briefs/X1-maps-south.md` | `src/data/maps/x1_millrace.js`, `x1_mill.js`, `x1_culvert.js`, previews `x1_millrace*`, `x1_mill*`, `x1_culvert*`, `qa/maps/x1_south.test.mjs`, `docs/maps/X1_SOUTH.md` |
| 9 | W3 | X1-maps-north | M | `docs/briefs/X1-maps-north.md` | `src/data/maps/x1_terrace.js`, `x1_orrery.js`, `x1_cellar.js`, previews `x1_terrace*`, `x1_orrery*`, `x1_cellar*`, `qa/maps/x1_north.test.mjs`, `docs/maps/X1_NORTH.md` |
| 10 | W4 | X1-maps-wild | M | `docs/briefs/X1-maps-wild.md` | `src/data/maps/x1_highmoor.js`, `x1_larchhill.js`, previews `x1_highmoor*`, `x1_larchhill*`, `qa/maps/x1_wild.test.mjs`, `docs/maps/X1_WILD.md` |
| 11 | W4 | X1-audio | M | `docs/briefs/X1-audio.md` | `tools/music/**`, `tools/audio/**`, `assets/audio/music/**`, `assets/audio/sfx/**`, `assets/audio/ambience/**`, `assets/audio/manifest.json` (only through `tools/audio/build.py`), `docs/MUSIC.md`, `docs/SUNO_PROMPTS.md`, `qa/audio/**`, `qa/music/**` |
| 12 | W5 | X1-maps-hub | M | `docs/briefs/X1-maps-hub.md` | `src/data/maps/valley.js`, `willowmere.js`, `archive_f1.js`, `archive_f2.js`, `archive_f3.js`, `qa/maps/x1_hub.test.mjs`, `qa/maps/x1_baseline/**`, `docs/maps/X1_HUB.md`, `docs/MAPS.md` (a pointer section), `X1_MAPS_LISTED` (one line in `src/data/x1/encounters.js`) |
| 13 | W6 | X1-integrate | M | `docs/briefs/X1-integrate.md` | the flips in `src/data/x1/live.js` and the budget ratchet, `qa/autoplay.py`, `qa/autoplay_grid.mjs`, `qa/integrate/**`, `qa/saves/x1_*`, `qa/shots.json` (append), seam fixes only in files whose owner's brief is closed |
| 14 | W7 | critic, play-critic | S each | `docs/briefs/X1-review.md` | `docs/CRITIQUE_X1.md`, `docs/PLAYTEST_REVIEW_X1.md`, `qa/out/reviewx1/` (read-only otherwise) |
| 15 | W7 | X1-fixes | M | written by the orchestrator from the two reviews | the paths its fix list names, each owned by no other running agent |

Agent count: 13 build agents, 2 read-only reviewers, 1 fix pass: 16 runs. Dependencies: the maps need the story ids, the battle ids, the world contract and the art ids (W1 and W2 first, stubs allowed); the wild maps need the
three W3 maps (their edge cells) or the allowlist; the hub needs all eleven maps; integrate needs everything including the audio manifest. The art agents of W2 write only `x1_`-prefixed files (plus one entry line each in two different build scripts), so they cannot collide with each other
or with the Episode 2 art agents; **even so the Episode 2 art and audio agents wait for P1b** (one writer for the audio manifest, `docs/MUSIC.md` and `docs/SUNO_PROMPTS.md`; one clean publish before the second expansion's seams land).

---

## 15. Acceptance and QA (done means)

- `node qa/run.mjs` green; Episodes 1, 2 and 3 suites unchanged in meaning; the new suites (`qa/content/x1_*`,
  `qa/battle/x1_*`, `qa/world/x1_*`, `qa/maps/x1_*`) green.
- `node tools/sim/simulate.mjs --check`: "All targets met" for Episode 1 (main path numbers unchanged), the Hollow, the eight new
  zones and both bosses; every main-route number and `progression()` unchanged; `checkOptionalCaps()` (7.5) passes, with the margins of 7.2.
- `node tools/maps/mapcheck.mjs check` clean with an empty `x1_links.json`; previews of the nine new maps and the five edited
  maps viewed and listed in `docs/maps/X1_*.md`; every chest in 6.1 reachable by the stated ability and unreachable without it.
- Autoplay, two routes. **Regular route** (the existing bot, main path only): unchanged levels (Echo Warden Lv 6, Archivore Lv 8, end Lv 9), zero game overs. **Completionist** (from a fresh game with the expansion on): the Barrow and
  the Reeve at Lv 5 to 6, the Cellar's chart, the Culvert and the Golem at Lv 6 to 7, the Echo Warden at Lv 6, the Archivore at Lv 8 or 9, Episode 1's end at Lv 9 or 10, zero game overs on desktop and phone, gold at the
  end under 5,300 (8.5); a run from an Episode 1 credits fixture loads and walks into every new area.
- Story timer (`qa/integrate/story_time.py`): the main path's minutes are within one minute of the baseline log; the
  expansion's boxes total 190 or fewer, none over 12; no scene on the main path changed.
- Shots (append to `qa/shots.json`): `field_downs_thornfold`, `field_downs_stones`, `interior_loomhouse`,
  `dungeon_barrow_slabs`, `story_rollcall_stones`, `battle_barrow_reeve`, `field_terrace_orrery`, `dungeon_cellar_route`,
  `field_millrace_mill`, `dungeon_culvert_plates`, `story_mill_done`, `battle_millstone_golem`, `field_valley_cleft`, `field_highmoor_tower`,
  `field_larchhill_windmill`, on
  desktop and phone, zero console errors; field logic under 3 ms and 60 fps on the phone profile.
- Load budget: `qa/pwa/precache.test.mjs` inside the ratchet of `XP-packs.md` (initial at most 6.38 MB after this expansion, cap 6.5 MB unchanged, tap prompt at most 2.32 MB), the `x1` pack at most 1.0 MB wire, no
  `x1` file in `sw.js`, an offline replay after one successful pack load, and a run with the pack forced to fail once (Episode 1 plays unchanged, a one-line notice, a retry).
- Text: no em dashes (grep U+2014 over `next/`), every box within 3 x 42, ASCII only, no keyboard glyph on touch.
- Readability: every puzzle solvable by a first-time player without Talk; Talk always names the next step, before and after
  every step and after `ep1_complete`, `ep2_complete` and `ep3_started`.
- Saves: section 12.1's tests, including the credits fixtures.

---

## 16. Risks, assumptions, cut lines and decisions for Scott

**Assumptions.**
1. Optional content today is about 35 minutes (Inference; check: the timer on the live Episode 1 with all side quests).
2. A 0.1 `expMul` keeps the completionist within one level of today's plan at every main boss (7.2: Fact for the arithmetic, Inference for the rounding of tiny per-unit values; check: `checkOptionalCaps()` at 400 runs).
3. The `phased` AI and the existing telegraph and summon machinery carry the two bosses with no new code (Fact: the Alpha uses
   exactly them).
4. Appraise-on-object and `give('exp')` are small (Inference from `abilities.js` and `cutscene.js`; each has a fallback).
5. The two wide maps fit the engine's per-frame budget without a fog system (Inference; the phone-profile frame test decides).

**Risks.**
- **Volume.** About 97 typical minutes is a lot of optional content; it is built in region slices (sections 13, 14) and the cut
  lines below stay available until the story timer has spoken.
- **Optional EXP is tiny.** The new fights pay about a tenth of their raw EXP and quests a few points, so a player may feel the optional world "does not level me". That is the instruction (rewards are gold, gear, items); the
  alternative of paying more breaks the cap of 7.2 at the Archivore.
- **Gold.** More chests and quests; the autoplay column decides (8.5); the cap is 1,900 more than today.
- **Shared files.** Two expansions touch the same registries, two town maps and the audio manifest. Mitigation: one pack mechanism (`XP-packs.md`), registration by mutation instead of edits, one writer per file in a fixed run order (11.6).
- **Existing-map edits.** The valley has the most tests of any map; the frozen baseline and the walk diff are the guard.
- **Floors that look alike** (CRITIQUE_3 and 4) and **the wide maps looking like green copies of the valley**: each dungeon has its
  own floor and walls and each wide map its own palette (4.12, 4.13); the critic checks.
- **Autoplay.** The old bot (main path only) is unchanged; X1-integrate adds a completionist route.

**Cut lines (Scott chose to build all: every one of these is UNUSED; they remain as the way to shorten if the story timer reports
more than about +110 typical minutes; sizes are typical minutes saved).**
- **Cut 1, the north region** (Terrace, Orrery, Cellar, Dark Stars, the cleft stair, the star marks; the moor's stile then ends
  at a locked gate): -17. Nothing else depends on it (no other quest asks for Hesper; the third star mark is only Dark Stars').
- **Cut 2, the two light quests** (Pell's Crates, Things Not To Forget): -7.
- **Cut 3, the ordinary field groups in the Terrace, Millrace, moor and Larchhill** (keep the maps, bosses and chests): -9.
- **Cut 4, the Culvert and Four Rolls' dungeon half** (Hal asks Ferrick for the pin, Ferrick has it): -13.
- **Cut 5, Larchhill** (the Larchhill Road becomes a dead end; Yarrow and the hay chute go): -9.
- A cut only lowers the EXP supply; no cap in 7.2 can break.

**Decisions for Scott (none blocks the build; defaults in brackets).**
1. ~~The EXP scale.~~ **ANSWERED (Scott, 2026-10-25, revised): keep today's EXP** (every scale 1.0), no Config toggle, no story-only versus completionist gap as a goal; optional EXP is a capped bonus (7.2).
2. The Millrace road opens at `archive_f1_done` and its mill only after the Archivore (the barred door with a sound behind it).
   [yes]
3. Rewards are gear, a charm, a set and Honey Rolls, no new abilities (a tome that teaches a technique needs `learn: { flag }`).
   [gear only]
4. The Reeve's name (Wystan), the twelve stone names, Odo's chime song and the Keepers' station names are placeholders for
   X1-story to settle. [placeholder] **ANSWERED (accepted default): placeholders, listed in one table ("Names to confirm", `EXPANSION_RECONCILIATION.md` section 8) and held in one exported constant so Scott's real names are one edit.**
5. Eight new tracks is a lot of composing; the fallbacks in 10.4 let any of them ship as an existing track if the audio budget
   or the usage guard says so. [compose all eight]

### 16.1 Content overlap with the Episode 2 expansion plan (found 2026-10-25; RESOLVED in `docs/EXPANSION_RECONCILIATION.md` section 3)

| Overlap | Resolution |
|---|---|
| A barrow dungeon with a Shove room and a counting boss | **Kept here as written** (the Wethers' Barrow and the Reeve). The Episode 2 plan's Cairnmaker's Barrow became the **Cairnmakers' Quarry** (a worked-out stone cut under the heights, sledge rails, stone bays; the boss is still the Waymarker, a mason-construct that keeps setting stones). Its enemy `barrow_shade` became `delver_shade` and its encounters `bw_*` became `qy_*` (this plan owns `barrow_shade`, `bw_shades` and `bw_mixed`); its map, zone and music ids moved from `x2_barrow` to `x2_quarry`. |
| Counting names on stones | **Kept here as written** (The Thirteenth Stone). The Episode 2 Q1 "The Cairn Count" (Maren counts cairns, three waystones) was replaced by "Strangers' Stores" (`strangers_stores`): Maren stocks three travellers' caches in remote cairns; no counting, no names, no blank stones. The Weald's Wishing Birches (nine carved first names) became the Blazed Birches (trail signs, no names). |
| A lens or lamp reward | Distinct (our Star Chart charm, their lens core and lamplighter). |
| Appraise-on-object | One contract (11.1), built once by X1-world; the Episode 2 plan adopts it. |
| An expansion registry and a load budget | One pack mechanism (`XP-packs.md`); registration by mutation; the Episode 2 `expansions.js` idea is the pack index. |
| Mirror and ferry use | None here; no conflict. |
| Parcel and crate deliveries | Pell's Crates (three crates: town, Thornfold, Larchhill, Millrace) and the Episode 2 Courier's Parcels (four parcels: Heronwade, the Isle, the heights, the Weald) are both deliveries by design but differ in giver, places, items and tone. Kept; the critics are asked to check they do not read alike. |
