# Episode 5 staging guide

For the world and map owners (E5-world, E5-maps-a, E5-maps-b), the art owners (E5-tiles, E5-sprites), the scene/UI owner
(E5-scene-ui), the battle owner (E5-battle) and the integrator. It says, for every scripted scene in
`src/data/ep5/story.js`: which map, what starts it, who stands where, which props and marks must exist, what the camera
does and which music plays. Dialogue is not repeated here; read the scene. Same shape as `STAGING_EP4.md`. Map layouts:
`docs/EPISODE5_PLAN.md` section 4.

Owner: E5-story. `qa/content/ep5_story.test.mjs` checks that every scene, every mark a scene walks to, pans to or spawns
at, and every inspect line id below appears in this file, so keep it in step with the script.

---

## 1. Cutscene API and the rules of this episode

Exactly the Episode 1 API (`STAGING.md` section 1), plus `closeup` for the pages. Details that matter here:

- **Staging (CRITIQUE_6 item 11).** Before the first line of anyone outside the party, the script calls `stage(s, X)`:
  the hero walks to mark `X`, then Mira to `X_m` and Bram to `X_b` together. Put `X` **two tiles below** the speaker (or
  two tiles in front of them, facing them), `X_m` one tile left of `X` and `X_b` one tile right, all walkable, none on a
  speaker's own cell, none on running sand. Every `X`, `X_m`, `X_b` the script uses is listed per map below. The one
  scene staged across a gap is `road_shade` (Omar calls over the Glass Flat from the obelisk's shade).
- **Showing (CRITIQUE_6 item 3).** The payoffs open a close-up page only when `PAGE_KINDS[kind]` exists (E5-tiles registers
  the kinds from `src/data/ep5/pages.js` in wave 5b): `ep5_letter` mode `blank` in `ep5_morning`; `ep5_chart` modes
  `prophecy` in `star_reading`, `restored` in `oracle_after`, `road` in `ep5_ending`; `ep5_page` (one mode) in
  `sel_memory_3`. Every page is closed before anything on the field moves. Until the pages land the lines said over them
  read as narration; nothing else changes (the same boxes either way).
- **Two names arrive late.** Sel's mother is "The First Student" (speaker `student_m`: the memory spawn in
  `sel_memory_1` and `sel_memory_2`, and the voice at the three springs) until Sel reads her page and says "Ishra" in
  `sel_memory_3`; from then the record is `ishra_m` ("Ishra"). Yara's father is "A Traveler" (`tamir_m` in the memories,
  the spawn `tamir_t` walking in at `every_road`) until Yara says "...Father?"; on that beat `tamir_t` is despawned and
  `tamir_n` ("Tamir") spawned on the same mark (`gather_tamir`), the Episode 4 swap. The NPC record `tamir` shows from
  `ep5_complete`. `SPEAKER_NAMES` (npcs.js `EP5_SPEAKERS`) holds `student_m`, `ishra_m`, `tamir_m`, `sel_t`, `yara_t`,
  `oracle` and `oracle_v`.
- **The hero never speaks.** Choices, emotes (`...`), walks. Others say the hero's name.
- **Speakers without an actor.** `oracle_v` ("The Oracle", portrait `oracle`) is the voice in the memories; `student_m` at
  the springs is a voice. `oracle` is the map actor coiled on the ring in `ep5_lab_oracle` (sprite `oracle_avatar`,
  portrait `oracle`, E5-maps-b and E5-sprites).
- **Scene twins (SEL_TWIN, HAVEN_TWIN).** Where a scene spawns a twin of a map NPC on the same map, the record stands
  down with the ep4 pack's compound flag (`all:a,!b`, `src/data/ep4/field/seams.js`): `sel` hides from `sel_walked_in`
  until `ep5_complete` (`SEL_TWIN`; she is `sel_t` in the Well, the Eye and the Haven's last two scenes); `yara` and
  `nasrin` hide from `chart_restored` until `ep5_complete` (`HAVEN_TWIN`; `every_road` and `ep5_ending` spawn `yara_t`
  and `nasrin_t`). Before that, `sel_gate` walks the record `sel` from the market to `gate_sel`, and `tent_rest` walks the
  record `omar` to `fire_omar`.
- **Scene guards.** `SCENE_CONDITIONS` in `story.js`. `ep5_morning` says `live: true` and `ifNot: tier_1`: it does nothing
  while `EP5_LIVE` is false (`src/game/episodes.js`) or on a Fine Print run. `GATE.live` in `story.js` is what the guard
  reads; the `?ep=5` developer entry (E5-pack) may set `GATE.live = true` after loading the pack. Every other scene needs
  a flag only an Episode 5 scene sets, so with the switch off nothing in Episode 5 is reachable.
- **Counter check.** `ep5_morning` should only start while counter `credits4_rolled` is set; the scene guard sees only
  flags (`ep4_complete`, `ep5_morning_done`, `tier_1`), so the pack patch's enter trigger `ep5_wake` on `ep4_vw_inn`
  checks the counter.
- **Chains.** `lab_f3_arrival` calls `sel_walks_in`. `landing_return` calls `sel_memory_3`. `oracle` calls
  `oracle_after` after the win (also a scene on its own, for an enter trigger after a reload). `every_road` calls
  `ep5_ending` after setting `roads_returned` and `haven_restored`. The hooks roll `CREDITS_EP5` after `ep5_complete`, set
  counter `credits5_rolled`, show `END_CARD_EP5` and wake the party at `ep5_sh_inn` `inn_bed`. While `EP5_LIVE`, the
  Episode 4 end card is `END_CARD_EP4_LIVE`.
- **Tints.** The Labyrinth floors' tint belongs to the hour (E5-world), so the memories do **not** change the tint: a
  warm flash in and out, `sorrow` and a distant `caravan_bell`. `ep5_board` goes to `dusk` (the time skip to the evening
  tide); `ship_fight` to `dawn` after the win; `moonwell_wake` to `night` and back to the Haven's own (`dusk`, or `none`
  after `haven_restored`); `every_road` to `dawn` then `none`; `ep5_ending` to `night`.
- **Retries.** `mirage_knight` and `oracle` set `knight_tried` / `oracle_tried` on the first start; after a loss the
  intro is only the pan, Mira's tip and the card.
- **Decisions.** `ship_bram` (the first truth choice: `bram_told` or `bram_spared`; one line in `star_reading`, Bram's
  half of the bark `first_shade`), `tent_rest` (three questions), `vex_gallery` (the main truth choice: `star_restored`
  or `star_hidden`; one line in `oracle_after`, one in `every_road`, and Sel's gift), `oracle` (flavor only). With no
  Gallery choice made the hidden path's lines and gift play (the chart finds the star anyway).

## 2. Map conventions the story needs

Everything in `STAGING.md` section 2 holds: `marks: { name: [x, y] }`, NPC events whose id equals the NPC id,
`{ type: 'trigger', script }`, `{ type: 'object', script }`, `{ type: 'sign', text: '<lineId>' }` reading the pack's
`lines` (registered from `src/data/ep5/text.js`), books from `BOOKS` (`{ type: 'book', book: '<id>' }`).

### Flag-driven presence and visuals the script relies on

| Flag | What changes (owner) |
|---|---|
| `ep5_started` | `ep4_valewyn`: the moored ship `ship_moored` (sign `ep5_ship_moored`) and the berth object `ship_berth` (`script: 'ep5_board'`, `ifNot: ship_boarded`) at the south landing (E5-maps-a patch). |
| `ship_boarded` | The boat door `berth_sail` on the berth cell to `ep5_ship` `deck_start` (`ifNot: road_landed`). |
| `bram_asked` | The step row `fight_row` amidships runs `ship_fight`. |
| `ship_first_fight_done` | The dawn tint on the deck and the gangway door at the bow to `ep5_caravan_road` `jetty`. |
| `road_landed` | `ep5_saffron` water stairs: the boat door back to Valewyn's south landing; Valewyn's `berth_south`. |
| `haven_arrived` | `yara` at `water_stairs`; Hassan's `bells_start` on talk. |
| `met_sel` | `reading_trig` in `ep5_sh_observatory` runs `star_reading`; Kamal starts Three Roads Home on talk. |
| `star_reading_done` | `gate_trig` at the north gate runs `sel_gate`. |
| `gnomon_get` | The north gate door to `ep5_lab_f1` `start`; the Labyrinth dials accept the hour. |
| `bells_started` | The three bell chests (`bell_1_found` road island, `bell_2_found` F1 dead-end court, `bell_3_found` F1 cracked base). |
| `knight_defeated` | The stair past the mirror hall (its step trigger runs `lab_f2_stair`) and the lift `lift_f2_short`. |
| `sel_walked_in` | `sel` stands down (`SEL_TWIN`). The springs answer (`spring_shelter`, then `spring_truth`, then `spring_return`). |
| `oracle_door_open` | The Sun Keyhole `door_oracle` turns with `sun_key`. |
| `oracle_defeated` | `lift_out` in `ep5_lab_oracle` to `ep5_saffron` `north_gate` (its arrival runs `every_road`); the ring prop's empty frame. |
| `chart_restored` | `yara` and `nasrin` stand down (`HAVEN_TWIN`); the star charts' second state. |
| `reliquary_found` | The F2 cache's gold chest (300 gold, 2 `hi_ether`, book `travelers_log`). |
| `moonwell_woken` | The Moonwell becomes a rest and save point; +20 Fury at the Oracle (E5-battle `startFury`). |
| `haven_restored` | Banner sub "Every Road Remembers", tint `none`, the waystone and bulletin second states, loads gone. |
| `ep5_complete` | `tamir` at `tamir_spot`; `sel`, `yara`, `nasrin` back on their marks; every resident's last lines. |

## 3. Scenes, map by map

### `ep5_ship` (issue #99: enter trigger `ep5_wake` before `ship_enter`; mark `yara_deck`)

- `ep5_morning`, on deck at night mid-crossing (issue #99, `docs/WORLD_MAP_PLAN.md` section 4). The Episode 4 credits and
  the quick start land on `deck_start`; the enter trigger `ep5_wake` runs first. From `ep4_vw_inn` (an old save's wake room:
  the patch's `ep5_wake` below) it fades out and moves the party aboard (`deck_start`), where it plays. Tint `sea_night`
  (`s.openingTint`, the ep3 pack's `opening_stage`). Spawns `yara_t` at `yara_deck` by the rail. Fades in; the hero walks to
  `deck_stage`, Mira to `mira_rail`, Bram to `deck_stage_b`. Pans to `mira_rail`, opens `ep5_letter` (`blank`). Music: the
  deck's track `mystery`, silence on "Whose is gone?", `mystery` again after the hero's `...` and the letter goes in the bag.
  6 boxes. Gives `star_letter`. Yara walks to `yara_wheel` and is despawned (`ship_night` spawns her there). Sets
  `ep5_morning_done`, `ep5_started` and `ship_boarded`, so `ship_night` plays next on the same arrival and `ep5_board` (the
  Valewyn berth) is only for a save made between the old inn morning and the crossing.

### `ep4_vw_inn` (patch: trigger `ep5_wake`; marks `yara_table`, `mira_window`, `inn_stage`, `inn_stage_b`, existing `inn_bed`)

- The old wake room (until issue #99 the morning played here, by the window or in the taproom). `ep5_wake` stays for a save
  made here after the Episode 4 credits: `ep5_morning` moves the party aboard `ep5_ship`. The marks stay unused.

### `ep4_valewyn` (patch: `ship_moored`, `ship_berth`, `berth_sail`, `berth_south`; marks `berth_yara`, `berth_stage`, `berth_stage_m`, `berth_stage_b`)

- `ep5_board`, the berth object `ship_berth`. Spawns `yara_t` at `berth_yara`; stages at `berth_stage`. 2 boxes. Yara
  walks to `ship_berth` and is despawned; tint `dusk` over 90 frames. The boat door does the crossing.
- Farewells (EPISODE5 scene 2) are talk entries on Lyra (`lyra_n`), Hale, Ada and Joss (`npcs.js`), not scenes.

### `ep5_ship` (marks `deck_start`, `deck_stage`, `deck_stage_b`, `mira_rail`, `bram_bow`, `bow_stage`, `yara_wheel`, `foes_drop`, `foes_drop_b`, `gangway`)

- `ship_night`, on enter. Spawns `yara_t` at `yara_wheel` (she stays). Hero to `deck_stage`, Mira to `mira_rail`, Bram to
  `deck_stage_b`; pans to `mira_rail`. 2 boxes. Bram then walks to `bram_bow`. No music change (`mystery`).
- `ship_bram`, step trigger `bow_trig`. Mira to `mira_rail` (aft, out of earshot), Bram to `bram_bow`, the hero to
  `bow_stage` (two tiles from Bram). 3 boxes on each answer. No music change.
- `ship_fight`, step row `fight_row` (`if: bram_asked`). Pans to `foes_drop`, `sand_run`; spawns `foe_harrier` (sprite
  `dust_harrier`) at `foes_drop` and `foe_scarab` (sprite `dune_scarab`) at `foes_drop_b`; battle `e5s_first`, no flee
  (Night, Turn in 4: E5-battle's `SKY_START`). After a win: both despawned, tint `dawn`, 3 boxes. A loss sets nothing.

### `ep5_caravan_road` (marks `jetty`, `yara_jetty`, `jetty_stage`, `jetty_stage_m`, `jetty_stage_b`, `jetty_end`, `flat`, `dial`, `omar_spot`, `fire`, `fire_omar`, `fire_stage`, `fire_stage_m`, `fire_stage_b`, `isle`, `last_dune`, `haven_far`, `east_exit`)

- `road_landing`, on enter. Spawns `yara_t` at `yara_jetty`; stages at `jetty_stage`. 3 boxes; Yara walks to `jetty_end`
  and is despawned.
- `road_shade`, step trigger `road_trig` where the road meets the Glass Flat. Pans to `flat` (Omar, the NPC record, sits
  at `omar_spot` in the obelisk `ob_flat`'s noon shade), then to `dial` (the sundial `dial_road`, `free: true`). 3 boxes.
  The bark `first_shade` plays after the first hour change.
- `tent_rest`, campfire object `tent_fire` (`safe`, `rest`). Pans to `fire`; Omar walks to `fire_omar`; stages at
  `fire_stage`. First visit: one choice of three. Later visits: one box from Omar.
- `haven_view`, step trigger on the last dune. `mystery`, pans to `haven_far` (the decal), back to `ash_road`. 4 boxes.

### `ep5_saffron` (marks `south_gate`, `waystone`, `bulletin`, `yasmin_gate`, `waystone_stage`, `waystone_stage_m`, `waystone_stage_b`, `shop_door`, `market`, `sel_spot`, `sel_stage`, `sel_stage_m`, `sel_stage_b`, `nasrin_bench`, `moonwell`, `moonwell_stage`, `moonwell_stage_m`, `moonwell_stage_b`, `moonwell_sel`, `inn_door`, `smithy_door`, `tower_door`, `north_gate`, `gate_sel`, `gate_stage`, `gate_stage_m`, `gate_stage_b`, `water_stairs`, `tamir_spot`, `gather_sel`, `gather_yara`, `gather_nasrin`, `gather_tamir`, `gather_trav_a`, `gather_trav_b`, `caravan_in`, `caravan_in_b`, `caravan_in_c`, `roof_view`, `roof_stage`, `roof_stage_m`, `roof_stage_b`, `roof_laleh`, `roof_sel`, `roof_yara`, `armillary_view`)

- `haven_arrival`, on first enter by the south gate. Silence; spawns `yasmin_t` at `yasmin_gate`; stages at
  `waystone_stage`; pans to `armillary_view` (the armillary over the town), `bulletin`, then `waystone` (the glyph rows change as the narration says so); `saffron` from
  the change. 6 boxes. Yasmin walks to `shop_door` and is despawned.
- `meet_sel`, Sel's talk entry (NPC `sel` at `sel_spot` under the copper awning). Stages at `sel_stage`. 5 boxes.
- `moonwell`, the Moonwell object `moonwell` (`script: 'moonwell'`). First look: stages at `moonwell_stage`, Kamal (NPC at
  `moonwell`) faces the hero, 3 boxes. Once the three witnesses are heard it runs `moonwell_wake`; otherwise one box.
- `sel_gate`, step trigger `gate_trig` at the north gate (after `star_reading_done`). Pans to `north_gate`; the record
  `sel` runs from the market to `gate_sel`; stages at `gate_stage`. 4 boxes. Gives `gnomon`.
- `every_road`, on arrival at `north_gate` by `lift_out` (after `oracle_after`). Silence, tint `dawn`; spawns `sel_t` at
  `gather_sel`, `yara_t` at `gather_yara`, `nasrin_t` at `gather_nasrin`; stages at `gate_stage`; pans to `waystone`;
  `caravan_bell` three times; pans to `caravan_in`; spawns `tamir_t` ("A Traveler") at `caravan_in`, `traveler_a` at
  `caravan_in_b`, `traveler_b` at `caravan_in_c`, who walk to `gather_tamir`, `gather_trav_a`, `gather_trav_b`; the swap
  to `tamir_n` on "...Father?"; `saffron`; pans to `moonwell`, Sel walks to `moonwell_sel`, then back to `gate_sel`. 11
  boxes (budget 14). Gives `caravan_compass` (`star_restored`) or `veiled_star`. Sets `roads_returned`, tint `none`,
  `haven_restored`; chains `ep5_ending`.
- `ep5_ending`, chained. Fade out; despawns `tamir_n`, `traveler_a`, `traveler_b`, `nasrin_t`; tint `night`; spawns
  `laleh_t` at `roof_laleh`, `sel_t` at `roof_sel`, `yara_t` at `roof_yara`; stages at `roof_stage`; pans to `roof_view`;
  fade in. `orrery` under the new reading (`ep5_chart` `road`), `mystery` on "turned a page", fade out, the two title
  cards (`END_TITLE_EP5`, `EPISODE6_CARD`), then `ep5_complete`. 11 boxes (budget 13).
- Side: `roads_start` (Kamal's talk entry, he is his own witness), `testimony_yara` (Yara's), `testimony_nasrin`
  (Nasrin's), `moonwell_wake` (from the Moonwell object: stages at `moonwell_stage`, tint `night` and back, 4 boxes, 300
  gold, 2 `hi_ether`, `nomad_mantle`).

### `ep5_sh_observatory` (marks `laleh_spot`, `rings`, `nasrin_spot`, `door_sel`, `reading_stage`, `reading_stage_m`, `reading_stage_b`)

- `star_reading`, step trigger `reading_trig` two tiles in (after `met_sel`). Spawns `nasrin_t` at `nasrin_spot` and
  `sel_t` at `door_sel` (she stays at the door); stages at `reading_stage` (two tiles below Laleh, NPC `laleh` at
  `laleh_spot`); pans to `rings`. Music: the map track `orrery`, silence and `prophecy_read` on the prophecy (`ep5_chart`
  `prophecy`), `sky_turn` as Mira turns the rings (she walks to `rings`), `orrery` again on the learn. 13 boxes (budget
  16). Sets `sky_learned` before the learn line (the skill's `learn: { flag: 'sky_learned' }`).

### `ep5_sh_inn`, `ep5_sh_shop`, `ep5_sh_smithy` (marks `counter`, `anvil`, `inn_bed`)

- No scenes. `ep5_innkeeper` (the Dune Host, inn 100) at `counter`; `yasmin` (shop `saffron_supplies`) at `counter`;
  `hassan` (shop `copperwind`) at `anvil`, whose talk runs `bells_start` and `bells_done`. The post-credits wake is
  `ep5_sh_inn` `inn_bed`.

### `ep5_lab_f1` (marks `start`, `font`, `scraped`, `camp`, `camp_stage`, `camp_stage_m`, `camp_stage_b`, `camp_tamir`, `camp_student`, `camp_child`, `camp_traveler`, `camp_out`, `stair_down`)

- `lab_f1_arrival`, on enter. Pans to `scraped` (an obelisk with its names chiselled off). 3 boxes.
- `sel_memory_1`, step trigger `memory1_trig` in the camp court. Stages at `camp_stage`; pans to `camp`; `sorrow`,
  `caravan_bell`, a warm flash; spawns `tamir_m` at `camp_tamir`, `student_m` at `camp_student`, `young_sel_m` (sprite
  `npc_young_sel`) at `camp_child`, `traveler_m` at `camp_traveler`; Tamir walks to `camp_out`; a flash, all four
  despawned, back to `labyrinth`. 6 boxes.
- `lab_f1_stair`, silent step trigger on the stair down (`stair_down`).
- Barks: `first_shade` (the first hour change at any dial), `first_shove_shade` (the first Shove of a caster),
  `sand_would_run` (a refused Shove).

### `ep5_lab_f2` (marks `arrival`, `map_table`, `table_stage`, `table_stage_m`, `table_stage_b`, `table_student`, `table_tamir`, `table_traveler`, `table_window`, `star_floor`, `vex_spot`, `party_stop`, `party_stop_m`, `party_stop_b`, `star_socket`, `reliquary`, `arena`, `knight_spot`, `stairs_down`)

- `lab_f2_arrival`, on enter. 2 boxes. The bark `first_window` plays at the first window shaft.
- `sel_memory_2`, step trigger `memory2_trig` at the map table. Stages at `table_stage`; pans to `map_table`; spawns
  `student_m` at `table_student`, `tamir_m` at `table_tamir`, `traveler_m` at `table_traveler`; the First Student walks
  to `table_window` (the horizon window by the table). Back to `labyrinth`. 6 boxes.
- `vex_gallery`, step trigger `vex_trig` on the star floor, placed so the party stops two rows below Vex. Silence; pans to
  `star_floor`; spawns `vex` at `vex_spot` (kneeling, facing up at the wall); stages at `party_stop`; `mystery`. On "Put it
  back." the hero walks to `star_socket` (the empty socket in the floor). A pale flash and `vex` is gone; the feather prop
  `feather_glass` stays. Back to `labyrinth`. 12 boxes on either path. Gives `fifth_list`.
- `mirage_knight`, arena trigger `knight_trig`. Silence, pans to `knight_spot`, card "THE MIRAGE KNIGHT / Warden of False
  Horizons", `battle`, battle `mirage_knight` (boss, no flee). After: back to `labyrinth`.
- `lab_f2_stair`, silent step trigger on the stair past the mirror hall (`stairs_down`).
- `reliquary`, object `reliquary_obj` (`lantern: true`, lit only at dusk) at `reliquary`. Opens the cache.

### `ep5_lab_f3` (marks `arrival`, `stair_above`, `sel_top`, `top_stage`, `top_stage_m`, `top_stage_b`, `shelter`, `truth`, `return`, `shelter_stage`, `shelter_stage_m`, `shelter_stage_b`, `truth_stage`, `truth_stage_m`, `truth_stage_b`, `return_stage`, `return_stage_m`, `return_stage_b`, `sel_wait_1`, `sel_wait_2`, `sel_wait_3`, `page_spot`, `page_sel`, `page_stage`, `page_stage_m`, `page_stage_b`, `keyhole`)

- `lab_f3_arrival`, on enter. 3 boxes; chains `sel_walks_in`. No music change (`mystery`).
- `sel_walks_in`, chained. `footstep_stone`; spawns `sel_t` at `stair_above` (on the stair, off the landing) who runs to
  `sel_top`; stages at `top_stage`. 5 boxes. The bark `first_lamp` plays at the first lamp rolled.
- `landing_shelter`, `landing_truth`, `landing_return`: the spring objects `spring_shelter`, `spring_truth`,
  `spring_return` (`script` each), in that order. Each re-spawns `sel_t` at its `sel_wait_n` (beside the spring, not on
  it), stages at `<landing>_stage`, pans to the landing mark (`shelter`, `truth`, `return`), `sand_hold`, `caravan_bell`.
  3 boxes each. No music change.
- `sel_memory_3`, chained from `landing_return`. Silence; pans to `page_spot`; Sel walks to `page_sel`; stages at
  `page_stage`; opens `ep5_page`; `sorrow` on Ishra's name with `name_restore`; back to `mystery`; pans to `keyhole` (the
  Sun Keyhole `door_oracle`). 7 boxes. Gives `ishra_page`.

### `ep5_lab_oracle` (marks `ring`, `party_stop`, `party_stop_m`, `party_stop_b`, `sel_enter`, `chart_spot`, `chart_spot_m`, `chart_spot_b`, `chart_sel`, `feather_spot`)

- `oracle`, step trigger row `oracle_trig`. Silence; spawns `sel_t` at `sel_enter` (the foot of the stair); pans to
  `ring` (the map actor `oracle`); stages at `party_stop`. 9 boxes. Card "THE SAND ORACLE / Reader of Every Road",
  `boss_oracle`, battle `oracle` (boss, no flee). A retry: pan, Mira's tip, the card.
- `oracle_after`, chained (and an enter trigger with `if: oracle_defeated, ifNot: chart_restored` after a reload).
  `sorrow`; pans to `chart_spot` and stages there (`chart_spot` is the cell in front of the chart's glow); opens
  `ep5_chart` `restored`; `triumph` on the chart, `mystery` on the counter-seal, `saffron` on the road; Sel walks to
  `chart_sel`; pans to `feather_spot` (the feather prop, sign `ep5_feather_eye`). 18 boxes (budget 22). Gives
  `name_fragment_5`.

## 4. Inspect lines (registered from `text.js`)

Valewyn and the water stairs: `ep5_ship_moored` (two states).
Ship: `ep5_deck_crates`, `ep5_mast`, `ep5_ship_lantern`, `ep5_ship_wheel`, `ep5_night_sea`.
Caravan Road: `ep5_jetty`, `ep5_dead_camp`, `ep5_glass_flat`, `ep5_tent`, `ep5_safe_stones`, `ep5_haven_far`.
Sun and shade kit (any map): `ep5_sundial`, `ep5_obelisk`, `ep5_obelisk_scraped`, `ep5_standstone`, `ep5_low_block`,
`ep5_running_sand`, `ep5_groove`, `ep5_sun_plate`, `ep5_moon_plate`, `ep5_sun_gate` (two states), `ep5_oasis_spring`
(the fonts), `ep5_cracked_base` (the Dash bases), `ep5_camp_court`, `ep5_back_door` and `ep5_back_door_open` (the
one-way sandstone doors, E5-integrate).
Saffron Haven: `ep5_waystone` (two states), `ep5_bulletin` (two states), `ep5_moonwell` (two states), `ep5_mural`,
`ep5_camels`, `ep5_packed_loads`, `ep5_armillary`, `ep5_bell_rack` (three states), `ep5_water_stairs`, `sign_ep5_inn`,
`sign_ep5_shop`, `sign_ep5_smithy`, `sign_ep5_tower`, `sign_ep5_north_gate`.
The Armillary Tower: `ep5_star_charts` (two states), `ep5_rings`.
Gallery: `ep5_painted_horizon`, `ep5_painted_city`, `ep5_window`, `ep5_pillar`, `ep5_map_table`, `ep5_star_floor` (three
states), `ep5_feather_glass`.
Well: `ep5_well_shaft`, `ep5_lamp_cart`, `ep5_spring_shelter`, `ep5_spring_truth`, `ep5_spring_return` (each dry, then
full), `ep5_page_glass`, `ep5_sun_keyhole`.
The Eye: `ep5_oracle_ring`, `ep5_chart_glass`, `ep5_feather_eye`.
Books: `haven_charts` (the Armillary Tower), `travelers_log` (the Reliquary cache, F2), `well_vows` (F3, by the top
font).

## 5. NPCs

`sel` (`sel_spot`), `yara` (`water_stairs`, from `haven_arrived`), `kamal` (`moonwell`), `nasrin` (`nasrin_bench`),
`tamir` (`tamir_spot`, from `ep5_complete`) on `ep5_saffron`; `laleh` (`laleh_spot`) in `ep5_sh_observatory`; `yasmin`
(`counter`, shop `saffron_supplies`) in `ep5_sh_shop`; `hassan` (`anvil`, shop `copperwind`) in `ep5_sh_smithy`;
`ep5_innkeeper` (the Dune Host, `counter`, inn 100) in `ep5_sh_inn`; `omar` (`omar_spot`, shop `pathkeeper`) on
`ep5_caravan_road`. Sprites `npc_sel`, `npc_yara`, `npc_kamal`, `npc_nasrin`, `npc_laleh`, `npc_omar`, `npc_yasmin`,
`npc_hassan`, `npc_tamir` (E5-sprites); the Dune Host is `npc_innkeeper` until E5-sprites names a recolor. Scene-only:
`npc_ishra` (`student_m`), `npc_young_sel` (`young_sel_m`), `npc_traveler` (`traveler_m`, `traveler_a`, `traveler_b`),
`npc_vex`, and the field sprites `dust_harrier` and `dune_scarab` (the deck fight). No portraits for Sel or the Haven
(plan 9.5); `vex` speaks with `silver_rogue`, the Oracle with `oracle`.

## 6. Contracts for the other agents

- **Maps (E5-maps-a, E5-maps-b).** Every mark in section 3, walkable and off running sand, with the staging triples laid
  out as section 1 says. Triggers: `ep5_wake` (patch), `bow_trig`, `fight_row`, `road_trig`, `gate_trig`, `reading_trig`,
  `memory1_trig`, `memory2_trig`, `vex_trig`, `knight_trig`, `oracle_trig`, and the stair triggers with `script:
  'lab_f1_stair'` / `'lab_f2_stair'`; arrival scenes on enter (`ship_night`, `road_landing`, `haven_arrival`,
  `lab_f1_arrival`, `lab_f2_arrival`, `lab_f3_arrival`, `every_road` at `north_gate` from `lift_out`, and `oracle_after`
  as a reload trigger). Objects: `ship_berth` (`ep5_board`), `tent_fire` (`tent_rest`), `moonwell` (`moonwell`),
  `reliquary_obj` (`reliquary`), `spring_shelter`, `spring_truth`, `spring_return`. Chest flags: `sun_key_found`,
  `dune_key_f1`, `dune_key_f2`, `bell_1_found` to `bell_3_found`. Signs read the line ids of section 4.
- **Battle (E5-battle).** Encounters `e5s_first`, `mirage_knight`, `oracle` (flags `knight_defeated`, `oracle_defeated`);
  `startFury` from `moonwell_woken` (+20) on `oracle`; `turn_sky` learned on `sky_learned`; `SKY_START.e5s_first` Night,
  Turn in 4. Mira's tips are `TIPS` in `story.js`: the Knight's lever is `mirror_turn`, the Oracle's `last_prophecy` is
  `foretold`. Battle lines (`EP5_BATTLE_TEXT`), boss cards (`EP5_BOSS_CARDS`) and arc lines (`EP5_ARC_LINES`) are in
  `text.js` for E5-battle and E5-scene-ui.
- **Pages (E5-tiles).** `PAGE_KINDS.ep5_letter` (`blank`; `full` is unused by the script), `ep5_chart` (`prophecy`,
  `restored`, `road`), `ep5_page`.
