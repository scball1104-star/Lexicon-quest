# Episode 6 staging guide

For the world and map owners (E6-world, E6-maps-a, E6-maps-b), the art owners (E6-tiles, E6-sprites), the scene/UI owner
(E6-scene-ui), the battle owner (E6-battle) and the integrator. It says, for every scripted scene in
`src/data/ep6/story.js`: which map, what starts it, who stands where, which props and marks must exist, what the camera
does and which music plays. Dialogue is not repeated here; read the scene. Same shape as `STAGING_EP5.md`. Map layouts:
`docs/EPISODE6_PLAN.md` section 4.

Owner: E6-story. `qa/content/ep6_story.test.mjs` checks that every scene, every mark a scene walks to, pans to or spawns
at, and every inspect line id below appears in this file, so keep it in step with the script.

---

## 1. Cutscene API and the rules of this episode

Exactly the Episode 1 API (`STAGING.md` section 1), plus `closeup` for the pages and one optional helper for the rope.
Details that matter here:

- **Staging (CRITIQUE_6 item 11).** Before the first line of anyone outside the party, the script calls `stage(s, X)`:
  the hero walks to mark `X`, then Mira to `X_m` and Bram to `X_b` together. Put `X` **two tiles below** the speaker (or
  two tiles in front of them, facing them), `X_m` one tile left of `X` and `X_b` one tile right, all walkable, none on a
  speaker's own cell, **none on a lane cell, a calm cell or cloudbank**. Every `X`, `X_m`, `X_b` the script uses is listed
  per map below. Two scenes stage the party apart on purpose: `mira_asks` (Bram a landing below at `bram_rope`) and
  `anchor_lesson` (Mira thrown to `mira_lift`, Bram to `bram_spear`).
- **Vex (CRITIQUE_7 item 8).** Vex is spawned as `vex_k` with sprite `npc_vex` (opaque; never `vex`, Episode 2's in-glass
  id). In `vex_relay` he works at the crown relay with his back to the party (`vex_spot`, facing up) and the party stops on
  `party_stop`, **two clear rows below him**; in `vex_falls` the party stops on `party_stop_fall`, two rows below
  `vex_edge`. No foe path crosses either staging block.
- **Showing (CRITIQUE_6 item 3, CRITIQUE_7 item 7).** The payoffs open a close-up page only when `PAGE_KINDS[kind]` exists
  (E6-tiles registers the kinds from `src/data/ep6/pages.js` in wave 6b): `ep6_slip` mode `burned` in `ep6_morning`;
  `ep6_manifest` modes `struck` in `chart_room` and `restored` in `scribe_after`; `ep6_letter` (one mode) in `vex_falls`;
  `ep6_page` modes `name`, `seal`, `torn` in `cloud_library`, one after the other, with "Keep this one." the **last** line
  said over the page, under `torn`. Every page is closed before anything on the field moves. Until the pages land the lines
  said over them read as narration; nothing else changes (the same boxes either way).
- **The rope (`s.rope`, plan 5.2).** `vex_falls` calls `s.rope('bram_line', 'vex_hang')` to draw a 1 px line from Bram's
  mark to Vex's hanging mark, and `s.rope(null)` to clear it before Vex is pulled up, **only when the cutscene has it**
  (`'rope' in s`). E6-scene-ui adds it as a pack cutscene draw (not a field system). Without it the narration already says
  "The line holds."; the boxes are the same.
- **One name arrives late.** The apprentice is "The Signal Apprentice" (speaker `apprentice_v`: the memory spawn in
  `aeris_memory_1`, the voice on the wind at the three lamps, and the spawn at `pippa_spot` in `fifth_voice`) until Mira
  reads Liora's letter under the lamp and says "Pippa. Pippa Voss."; on that beat `apprentice_v` is despawned and `pippa_t`
  ("Pippa") spawned on the same mark, the Episode 4 and 5 swap. The record `pippa` shows from `pippa_home`. `SPEAKER_NAMES`
  (npcs.js `EP6_SPEAKERS`) holds `scribe`, `scribe_v`, `apprentice_v`, `pippa_t`, `aeris_m`, `aeris_t`, `deckhand_m`,
  `liora_t` and `ilex_t`.
- **The hero never speaks.** Choices, emotes (`...`), walks. Others say the hero's name.
- **Speakers without an actor.** `scribe_v` ("The Scribe", portrait `scribe`) is the voice in the relay memories;
  `apprentice_v` at the lamps is a voice from the top of the spire. `scribe` is the map actor coiled over the desk in
  `ep6_obs_eyrie` (sprite `scribe_avatar`, portrait `scribe`, E6-maps-b and E6-sprites). The Scribe speaks in capitals.
- **Aeris.** On `ep6_zephyr` she is the record `aeris` (sprite `npc_aeris`, no portrait). Scenes on that map move the
  record itself for one scene (`spawn('aeris', ...)` replaces the map actor; a reload puts her back on `aeris_net`), so
  there is never a twin: `anchor_lesson` (`aeris_east`), `east_gate` (`aeris_gate`), `isles_return` (`kestrel_rail`, then she
  walks to `gift_aeris`), `ep6_ending` (`roof_aeris`). Everywhere else she is the spawn `aeris_t`. From `aeris_came` until
  `library_reached` the record stands down (`AERIS_AWAY` = `all:aeris_came,!library_reached`, the ep4 pack's compound flag).
- **Scene guards.** `SCENE_CONDITIONS` in `story.js`. `ep6_morning` says `live: true`, `if: ep5_complete` and `ifNot:
  tier_1`: it does nothing while `EP6_LIVE` is false (`src/game/episodes.js`, read through a namespace so a missing export
  reads false) or on a Fine Print run. `GATE.live` in `story.js` is what the guard reads; the `?ep=6` developer entry
  (E6-pack) may set `GATE.live = true` after loading the pack. Every other scene needs a flag only an Episode 6 scene sets,
  so with the switch off nothing in Episode 6 is reachable.
- **Counter check.** `ep6_morning` should only start while counter `credits5_rolled` is set; the scene guard sees only
  flags (`ep5_complete`, `ep6_morning_done`, `tier_1`), so the pack patch's enter trigger `ep6_wake` on `ep5_sh_inn`
  checks the counter.
- **Chains.** `obs_f3_arrival` calls `aeris_turns` (not a registered scene: no map event starts it; a reload between the
  two replays only the Kestrel). `beacon_start` calls `testimony_suri` (Suri is her own witness; not a registered scene).
  `scribe` calls `scribe_after` after the win (also a scene on its own, for an enter trigger after a reload). `isles_return`
  calls `ep6_ending` after setting `isles_restored`. The hooks roll `CREDITS_EP6` after `ep6_complete`, set counter
  `credits6_rolled`, show `END_CARD_EP6` and wake the party at `ep6_zl_inn` `inn_bed`. While `EP6_LIVE`, the Episode 5 end
  card is `END_CARD_EP5_LIVE`.
- **Tints.** The Airstair is a day map: `airstair_foot` starts at `dawn` and lifts to `none`. `ep6_board` goes to `dusk`
  (the evening sailing). F3 and the Eyrie own their pack tint `storm` (E6-world); `scribe_after` lifts it to `none` as the
  storm opens. `isles_return` is `dawn`, then `none`; `ep6_ending` is `night`. The memories do not change the tint: a cold
  flash in and out, `sorrow` and a distant `signal_lamp`.
- **Music.** The scene cues of plan 8.3. `s.music` has no volume, so the plan's "softer" cues play the track as is.
- **Retries.** `gale_engine` and `scribe` set `engine_tried` / `scribe_tried` on the first start; after a loss the intro is
  only the pan, Bram's tip and the card.
- **Decisions.** `mira_asks` (the first truth choice: `mira_told` or `mira_spared`; Mira's exchange in `cloud_library` and
  one Talk line on F1), `fifth_voice` (the main truth choice: `told_aeris` or `kept_from_aeris`; one Aeris line in
  `cloud_library` and her gift in `isles_return`), `scribe` (flavor only). With no spire choice made the hidden path's line
  and gift play.

## 2. Map conventions the story needs

Everything in `STAGING.md` section 2 holds: `marks: { name: [x, y] }`, NPC events whose id equals the NPC id,
`{ type: 'trigger', script }`, `{ type: 'object', script }`, `{ type: 'sign', text: '<lineId>' }` reading the pack's
`lines` (registered from `src/data/ep6/text.js`), books from `BOOKS` (`{ type: 'book', book: '<id>' }`).

### Flag-driven presence and visuals the script relies on

| Flag | What changes (owner) |
|---|---|
| `ep6_started` | `ep5_saffron`: Yara's ship moored at the water stairs (sign `ep6_ship_berth`) and the berth object `sky_berth` (`script: 'ep6_board'`, `ifNot: ep6_boarded`) (E6-maps-a patch). |
| `ep6_boarded` | The boat door `berth_north` on the berth cell to `ep6_airstair` `stack_foot`. |
| `airstair_arrived` | The boat door `stack_boat` at the stack's foot back to the water stairs. |
| `mira_asked` | The step row `fight_row` on the second landing runs `airstair_fight`. |
| `zephyr_arrived` | Liora, Aeris and Piri answer with their scenes; the side stories open. |
| `met_aeris` | `charts_trig` in `ep6_zl_charts` runs `chart_room`. |
| `charts_seen` | `anchor_trig` on the east dock runs `anchor_lesson`; Suri starts the Beacon on talk. |
| `anchor_learned` | `east_trig` at the east airstair runs `east_gate`. |
| `windward_pass` | The gate at the east airstair to `ep6_obs_f1` `alcove`. |
| `letters_started` | The three letter chests (`letter_1_found` Airstair post ledge, `letter_2_found` F1 dead-end deck, `letter_3_found` F1 Dash crate); before it those cells hold `hi_ether`. |
| `obs_f1_done` | The F1 lift is taken (its step trigger runs `obs_f1_lift`). |
| `engine_defeated` | The F2 lift up (its step trigger runs `obs_f2_lift`) and `lift_f2_short` down to the alcove. |
| `aeris_came` | The record `aeris` stands down (`AERIS_AWAY`); the Kestrel moored at `kestrel_berth` on F3 (prop). |
| `pledge_return` | `beacon_trig` on the beacon platform runs `fifth_voice`. |
| `pippa_found` | The beacon platform becomes a rest and save point (`beacon_font`). |
| `scribe_door_open` | The Sky Compass Keyhole `door_scribe` turns with `compass_key`. |
| `scribe_defeated` | The Wind Script banners, the storm lid open, `kestrel_up` to `ep6_library` (its arrival runs `cloud_library`). |
| `library_reached` | `kestrel_down` from the library to `ep6_zephyr` `north_dock` (its arrival runs `isles_return`). |
| `beacon_lit` | The Signal Beacon lit (rest and save object `beacon_rest`); +20 Fury at the Storm Scribe (E6-battle `startFury`). |
| `locker_found` | The locker's gold chest on the F2 ledge (400 gold, 2 `hi_ether`, book `flight_logs`). |
| `isles_restored` | Banner sub "The Sky Remembers", the board's second state (LANDED, DOCK FOUR), the chimes ring. |
| `pippa_home` | `pippa` at `pippa_tower`. |
| `ep6_complete` | Every resident's last lines. |

## 3. Scenes, map by map

### `ep5_sh_observatory` (issue #99 patch `withObsWake`: enter trigger `ep6_wake_obs`; marks `obs_stage6`, `obs_mira6`, `obs_bram6`, `bird_window`, `bird_perch`)

- `ep6_morning`, the Armillary Tower at night, where Laleh read the sky (issue #99, `docs/WORLD_MAP_PLAN.md` section 4). The
  Episode 5 credits and the quick start put the party at `obs_stage6` (7,8) and `ep6_wake_obs` runs the scene; from the inn
  (an old save's wake room, `ep6_wake` below) or any other tile it fades out and moves the party to `obs_stage6` first
  (`s.leaderAt`, `s.openingTint` from the ep3 pack's `opening_stage`). Tint `night`. Fades in; Mira walks to `obs_mira6`,
  Bram to `obs_bram6`. The grey bird (`npc_grey_bird`, a scene spawn, not solid) appears at `bird_window` under the high
  window and flies down to `bird_perch` on top of the great rings (`page_flutter`); the camera pans to `bird_perch`. Opens
  `ep6_slip` (`burned`). The bird flies back to `bird_window` and is despawned after the slip goes in the bag. Music: the
  tower's track `orrery`, silence on "Four seats.", `orrery` again before Mira's last line. 5 boxes (budget 6). Gives
  `boarding_slip`.

### `ep5_sh_inn` (patch: trigger `ep6_wake`; marks `bird_sill`, `mira_window6`, `inn_stage6`, `inn_stage6_b`, existing `inn_bed`)

- The old wake room (until issue #99 the morning played here, the bird narration at the sill). `ep6_wake` stays for a save
  made here after the Episode 5 credits: `ep6_morning` moves the party to the tower. The marks stay unused.

### `ep5_saffron` (patch: `ship_moored`, `sky_berth`, `berth_north`; marks `berth_stage6`, `berth_stage6_m`, `berth_stage6_b`, existing `water_stairs`)

- `ep6_board`, the berth object `sky_berth`. Yara is the record `yara` at `water_stairs` (no twin). Stages at
  `berth_stage6`. 2 boxes; tint `dusk` over 90 frames. The boat door `berth_north` does the crossing. The plan's
  `berth_yara6` mark is not used.
- Farewells (EPISODE6 scene 2) are talk entries on `sel`, `laleh`, `kamal` and `yara` (`npcs.js`), not scenes.

### `ep6_airstair` (marks `stack_foot`, `yara_boat`, `foot_stage`, `foot_stage_m`, `foot_stage_b`, `chain_foot`, `mira_rope`, `mira_stage`, `bram_rope`, `fight_row`, `foes_drop`, `foes_drop_b`, `ilex_rope`, `gust_stage`, `gust_stage_m`, `gust_stage_b`, `lane_a`, `post_b`, `isles_far`, `storm_far`, `bennet_winch`, `north_exit`)

- `airstair_foot`, on enter from the berth. Tint `dawn`; spawns `yara_t` at `yara_boat` (on her ship's deck; she stays);
  stages at `foot_stage`; pans to `chain_foot` (the chain's foot). 3 boxes; tint `none`.
- `mira_asks`, step trigger `mira_trig` on landing 1. Bram to `bram_rope` (a landing below), Mira to `mira_rope`, the hero
  to `mira_stage` (two tiles from Mira). 4 boxes on the truth path, 2 on the other.
- `airstair_fight`, step row `fight_row` on landing 2 (`if: mira_asked`). Pans to `foes_drop`, `gale_gust`; spawns
  `foe_harrier` and `foe_harrier_b` (field sprite `storm_harrier`) at `foes_drop` and `foes_drop_b`; battle `e6a_first`, no
  flee (Gust in 3: E6-battle's `GALE_START`). After a win: both despawned, 1 box. A loss sets nothing.
- `first_gust`, step trigger `first_trig` on landing 3. Spawns `ilex_t` (sprite `npc_ilex`) in his harness at `ilex_rope`;
  stages at `gust_stage`; pans to `lane_a`. 2 boxes. The bark `first_ride` plays after the first ride (E6-world).
- `isles_view`, step trigger `isles_trig` at the top. `mystery`; pans to `isles_far` (the decal), then `storm_far`; back to
  `high_moor`. 4 boxes.

### `ep6_zephyr` (marks `south_stair`, `board`, `board_stage`, `board_stage_m`, `board_stage_b`, `bennet_spot`, `post_rack`, `piri_spot`, `dock_four`, `liora_spot`, `dock_stage`, `dock_stage_m`, `dock_stage_b`, `north_dock`, `aeris_net`, `net_stage`, `net_stage_m`, `net_stage_b`, `east_dock`, `aeris_east`, `anchor_stage`, `anchor_stage_m`, `anchor_stage_b`, `mira_lift`, `bram_spear`, `east_gate`, `aeris_gate`, `gate_stage`, `gate_stage_m`, `gate_stage_b`, `inn_door`, `shop_door`, `workshop_door`, `tower_door`, `beacon_stage6`, `beacon_stage6_m`, `beacon_stage6_b`, `gardens`, `pippa_tower`, `gangway`, `pippa_down`, `kestrel_rail`, `gift_aeris`, `home_stage`, `home_stage_m`, `home_stage_b`, `tower_roof`, `roof_view`, `roof_vex`, `roof_aeris`, `roof_stage`, `roof_stage_m`, `roof_stage_b`, `north_far`, `storm_far`)

- `zephyr_arrival`, on first enter by the south stair. Silence; stages at `board_stage` (Bennet, the record, at
  `bennet_spot` by the board); pans to `board` (the board clacks: its own frames), `zephyr` from the clack; pans to
  `dock_four` (Liora). 7 boxes.
- `liora_dock`, Liora's talk entry (record `liora` at `liora_spot` on dock four). Stages at `dock_stage`. 3 boxes.
- `meet_aeris`, Aeris's talk entry (record `aeris` on the cargo net at `aeris_net`, beside the Kestrel). Stages at
  `net_stage`. 6 boxes.
- `anchor_lesson`, step trigger `anchor_trig` on the east dock (`if: charts_seen`). Moves the record `aeris` to
  `aeris_east`; stages at `anchor_stage`. Silence, `gale_gust`, a shake; Mira runs to `mira_lift` (the dock edge), Bram to
  `bram_spear` (beside her), `anchor_set`; Mira walks back to `anchor_stage_m`. `zephyr` on the learn line. 9 boxes (budget
  14). Nobody stands off the dock: `mira_lift` is a walkable edge cell.
- `east_gate`, step trigger `east_trig` at the east airstair (`if: anchor_learned`). Moves `aeris` to `aeris_gate`; stages
  at `gate_stage`. 4 boxes. Gives `windward_pass` and `sky_compass` (spinning).
- `isles_return`, on arrival at `north_dock` by `kestrel_down` (after `cloud_library`). Silence, tint `dawn`; moves `aeris`
  to `kestrel_rail`; stages at `home_stage`; pans to `board`, three `signal_lamp` (the chimes); pans to `dock_four`; spawns
  `pippa_t` at `gangway` and walks her to `pippa_down` (beside Liora at `liora_spot`); `zephyr`; pans to `kestrel_rail`;
  Aeris walks to `gift_aeris` (two tiles from the hero) and gives the gift. 8 boxes (budget 14); chains `ep6_ending`.
- `ep6_ending`, chained. Fade out, `pippa_t` despawned, then `pippa_home`; tint `night`; spawns `vex_k` at `roof_vex`, moves
  `aeris` to `roof_aeris`; stages at `roof_stage` (the chart tower roof, `tower_roof`); pans to `roof_view`; fade in.
  `mystery` on the needle; pans to `north_far` (the north, the White Road flickering: E6-tiles' decal). 10 boxes. Cards
  `END_TITLE_EP6`, `EPISODE7_CARD`.
- `beacon_light`, the beacon object `beacon_ring` at the Signal Beacon tower (`if: beacon_started`). Before the three
  witnesses: 1 box. With them: stages at `beacon_stage6`, `signal_lamp`, a flash, 3 boxes, the rewards. Lit: 1 box.
- `testimony_liora`, Liora's talk entry (`if: beacon_started, liora_met`). `testimony_bennet`, Bennet's. 2 boxes each.
- `letters_start` and `letters_done`, Piri's talk entries at `piri_spot`. 3 and 5 boxes.

### `ep6_zl_charts` (marks `charts_stage`, `charts_stage_m`, `charts_stage_b`, `aeris_table`, `liora_door`, `suri_spot`)

- `chart_room`, step trigger `charts_trig` two tiles inside the door (`if: met_aeris`). Spawns `aeris_t` at `aeris_table`;
  stages at `charts_stage`; pans to `aeris_table`. Silence; `ep6_manifest` (`struck`); `mystery` after; spawns `liora_t`
  (sprite `npc_liora`) at `liora_door`. 8 boxes. Gives `liora_letter`.
- `beacon_start` (with `testimony_suri` chained), Suri's talk entry (record `suri` at `suri_spot`). 5 boxes.

### `ep6_zl_inn`, `ep6_zl_shop`, `ep6_zl_workshop` (marks `counter`, `forge`, `inn_bed`)

- No scenes. `ep6_innkeeper` at `counter` (inn 120), `nova` at `counter` (shop `aeris_provisions`), `ilex` at `forge`
  (shop `galewing`). `inn_bed` is the post-credits wake point.

### `ep6_obs_f1` (marks `alcove`, `font`, `ways_in`, `vane_c`, `relay_old`, `relay_stage`, `relay_stage_m`, `relay_stage_b`, `relay_aeris`, `relay_lamp`, `post_d`, `upper_deck`, `lift_up`)

- `obs_f1_arrival`, on enter. Pans to `ways_in`. 3 boxes.
- `aeris_memory_1`, step trigger `memory1_trig` at the old relay. Stages at `relay_stage`; pans to `relay_old`; `sorrow`,
  `signal_lamp`, a cold flash; spawns `aeris_m` (sprite `npc_aeris`) at `relay_aeris` and `apprentice_v` (sprite
  `npc_pippa`, "The Signal Apprentice") at `relay_lamp`; both despawned with a flash; back to `storm_observatory`. 6 boxes.
- `obs_f1_lift`, the lift's step trigger at `lift_up`. Silent.

### `ep6_obs_f2` (marks `arrival`, `fans`, `relay_manifest`, `manifest_stage`, `manifest_stage_m`, `manifest_stage_b`, `manifest_aeris`, `manifest_deck`, `crown`, `vex_spot`, `party_stop`, `party_stop_m`, `party_stop_b`, `side_decks`, `locker`, `arena`, `engine_spot`, `arena_stage`, `arena_stage_m`, `arena_stage_b`, `lift_up`)

- `obs_f2_arrival`, on enter. 2 boxes.
- `aeris_memory_2`, step trigger `memory2_trig` at the manifest relay. Stages at `manifest_stage`; pans to
  `relay_manifest`; the vignette as F1's, with `aeris_m` at `manifest_aeris` and `deckhand_m` (sprite `npc_deckhand`, "A
  Deckhand") at `manifest_deck`. 5 boxes.
- `vex_relay`, step trigger `vex_trig` at the crown relay. Silence; pans to `crown`; spawns `vex_k` at `vex_spot` (facing up,
  arms in the relay); stages at `party_stop`; `mystery`; gives `sixth_list`; `gust_carry` and Vex despawned (the duct takes
  him; E6-maps-b may draw it as a lane into the wall); back to `storm_observatory`. 12 boxes (budget 12).
- `gale_engine`, arena trigger `engine_trig`. Silence; pans to `engine_spot` (the Engine is a battle foe; the map may show
  a still prop there); stages at `arena_stage`; the arc line; Bram's tip; card "THE GALE ENGINE / Keeper of the Broken
  Signals"; `battle`; battle `gale_engine` (boss, no flee). After a win: `storm_observatory`, 2 boxes. A retry: the pan,
  Bram's tip, the card.
- `obs_f2_lift`, the lift's step trigger at `lift_up` (`if: engine_defeated`). Silent.
- `locker`, the locker object `locker_obj` at `locker` on the side ledge. First time: 2 boxes, `chest_open`, sets
  `locker_found` (the gold chest beside it then holds the reward). Later: 1 box.

### `ep6_obs_f3` (marks `arrival`, `spire_top`, `kestrel_berth`, `aeris_top`, `kestrel_stage`, `kestrel_stage_m`, `kestrel_stage_b`, `anchor`, `anchor_stage`, `anchor_stage_m`, `anchor_stage_b`, `listen`, `listen_stage`, `listen_stage_m`, `listen_stage_b`, `return`, `return_stage`, `return_stage_m`, `return_stage_b`, `aeris_wait_1`, `aeris_wait_2`, `aeris_wait_3`, `vex_edge`, `vex_hang`, `vex_ahead`, `bram_line`, `party_stop_fall`, `party_stop_fall_m`, `party_stop_fall_b`, `pippa_spot`, `aeris_beacon`, `beacon_stage`, `beacon_stage_m`, `beacon_stage_b`, `keyhole`)

- `obs_f3_arrival`, on enter (`if: obs_f2_done`, `ifNot: aeris_came`). First time: pans to `spire_top`, 3 boxes. Then
  `aeris_turns` (chained): `lift_rumble` (engines), pans to `kestrel_berth`; spawns `aeris_t` at `aeris_top` (the Kestrel's
  rail), she jumps down; stages at `kestrel_stage`; 4 boxes; Aeris walks to `aeris_wait_1`.
- `pledge_anchor`, `pledge_listen`, `pledge_return`: the lamp objects `lamp_anchor`, `lamp_listen`, `lamp_return` on each
  landing, in climbing order. Each spawns `aeris_t` at `aeris_wait_1` / `_2` / `_3`, stages at `anchor_stage` /
  `listen_stage` / `return_stage`, pans to the lamp (`anchor`, `listen`, `return`), `signal_lamp`, 3 boxes (the carved
  charter line, the voice on the wind, Aeris).
- `vex_falls`, step trigger `fall_trig` on the broken causeway north of the Listen lamp (`if: pledge_listen`). Spawns
  `vex_k` at `vex_edge` (facing up, ahead of the party); stages at `party_stop_fall` (two rows below `vex_edge`); pans to
  `vex_edge`. Silence, `gale_gust`, a shake; `vex_k` re-spawned at `vex_hang` (hanging below the edge: a void cell beside
  the causeway that can show an actor); Bram runs to `bram_line` (the causeway's edge cell above `vex_hang`), `anchor_set`,
  the rope; `vex_k` back at `vex_edge` (pulled up); `mystery`; `ep6_letter`. Vex walks to `vex_ahead` (up the spire) and is
  despawned. 15 boxes (budget 16). The hero and Mira never leave `party_stop_fall`.
- `fifth_voice`, trigger `beacon_trig` on the beacon platform (`if: pledge_return`). Silence; pans to `pippa_spot`; spawns
  `apprentice_v` at `pippa_spot` (seated with the lamp among the crates) and `aeris_t` at `aeris_beacon`; stages at
  `beacon_stage`. The swap to `pippa_t` on Mira's line; `sorrow`, `name_restore`, a warm flash; `mystery` before the choice;
  pans to `keyhole` (the Sky Compass Keyhole `door_scribe`). 10 boxes (budget 14). Pippa stays as `pippa_t` until the map
  reloads (she flies home in the Kestrel).

### `ep6_obs_eyrie` (marks `desk`, `party_stop`, `party_stop_m`, `party_stop_b`, `aeris_enter`, `chart_spot`, `chart_spot_m`, `chart_spot_b`, `feather_spot`, `kestrel_rim`)

- `scribe`, step trigger row `scribe_trig`. Silence; spawns `aeris_t` at `aeris_enter` (the top of the stair); pans to
  `desk` (the map actor `scribe`); stages at `party_stop`. 10 boxes. Card "THE STORM SCRIBE / Writer of Every Course",
  `boss_scribe`, battle `scribe` (boss, no flee). A retry: pan, Bram's tip, the card.
- `scribe_after`, chained (and an enter trigger with `if: scribe_defeated, ifNot: compass_restored` after a reload).
  `sorrow`; pans to `desk`; then `chart_spot` (the cell in front of the Wind Script) and stages there; `triumph` on the
  Wind Script, opens `ep6_manifest` (`restored`); `mystery` on the counter-seal; silence and tint `none` as the lid lifts;
  pans to `feather_spot` (the feather prop, sign `ep6_feather_desk`). 16 boxes (budget 18). Gives `name_fragment_6`.

### `ep6_library` (marks `arrival`, `shelf`, `party_stop`, `party_stop_m`, `party_stop_b`, `vex_shelf`, `aeris_door`, `seat_four`)

- `cloud_library`, on enter by `kestrel_up` from the Eyrie. Silence; spawns `vex_k` at `vex_shelf` (beside the shelf) and
  `aeris_t` at `aeris_door`; stages at `party_stop`; pans to `shelf` (the `first_shelf` object; its lifted frame is the
  map's from `first_page_read`). `mystery` under the page, `sorrow` on the torn line, silence after. 16 boxes (budget 18).

## 4. Inspect lines (registered from `text.js`)

The water stairs: `ep6_ship_berth` (two states).
Airstair: `ep6_sea_stack`, `ep6_great_chain`, `ep6_rope_stair`, `ep6_isles_far`, `ep6_winch`.
Gust lane kit (any map with wind): `ep6_gust_lane`, `ep6_cloudbank`, `ep6_mooring_post`, `ep6_vane`, `ep6_fan_vane` (the F2
fans), `ep6_breeze_font` (the fonts), `ep6_dash_crate` (the Dash crates), `ep6_chimes_tied` (two states: the post chimes).
Zephyr Landing: `ep6_board` (two states), `ep6_chimes` (two states), `ep6_post_rack` (three states), `ep6_beacon` (two
states), `ep6_kestrel` (two states), `ep6_dock_four` (two states), `ep6_cloud_garden`, `ep6_storm_far`, `sign_ep6_inn`,
`sign_ep6_shop`, `sign_ep6_workshop`, `sign_ep6_tower`, `sign_ep6_east_airstair` (two states).
The Chart Room: `ep6_skychart` (two states), `ep6_manifest_wall` (two states), `ep6_charts_bell` (the save bell); book
`flight_manifests`.
Hall of Broken Signals: `ep6_relay`, `ep6_speaking_tube`, `ep6_grille`, `ep6_feather_grille`, `ep6_locker_ledge` (two
states).
The Eye: `ep6_spire`, `ep6_lamp_anchor`, `ep6_lamp_listen`, `ep6_lamp_return` (each dark, then lit with the charter's
line), `ep6_crates` (two states), `ep6_sky_keyhole` (two states), `ep6_broken_causeway`.
The Eyrie: `ep6_scribe_desk` (two states), `ep6_quills` (two states), `ep6_wind_script`, `ep6_feather_desk`.
The Cloud Library: `ep6_library_shelves`, `ep6_first_shelf` (two states), `ep6_reading_desk`.
Books: `flight_manifests` (the chart room), `flight_logs` (the locker's chest, F2), `pilot_charter` (F3 by the first lamp,
or the chart room).

## 5. NPCs

On `ep6_zephyr`: `aeris` (`aeris_net`, hidden while `AERIS_AWAY`), `liora` (`liora_spot`), `bennet` (`bennet_spot`), `piri`
(`piri_spot`), `thea` (`gardens`, wanders), `pippa` (`pippa_tower`, from `pippa_home`). On `ep6_airstair`: `bennet_winch`
(`bennet_winch`, shop `winch`; the same Bennet). In `ep6_zl_charts`: `suri` (`suri_spot`). In `ep6_zl_workshop`: `ilex`
(`forge`, shop `galewing`). In `ep6_zl_shop`: `nova` (`counter`, shop `aeris_provisions`). In `ep6_zl_inn`:
`ep6_innkeeper` (the Cloudhouse Host, `counter`, inn 120). Sprites `npc_aeris`, `npc_liora`, `npc_bennet`, `npc_suri`,
`npc_ilex`, `npc_nova`, `npc_piri`, `npc_thea`, `npc_pippa`, `npc_deckhand` (E6-sprites); the Cloudhouse Host is
`npc_cloud_host` (the `npc_innkeeper` recolor; until E6-sprites ships it, alias it to `npc_innkeeper`). Scene-only:
`npc_vex` (`vex_k`), `npc_yara` (`yara_t`), and the field sprite `storm_harrier` (the first fight). No portraits for Aeris,
Pippa or the town (plan 9.5); `vex_k` speaks with `silver_rogue`, the Scribe with `scribe`.

## 6. Contracts for the other agents

- **Maps (E6-maps-a, E6-maps-b).** Every mark in section 3, walkable, off every lane and calm cell, with the staging
  triples laid out as section 1 says. Triggers: `ep6_wake` (patch), `mira_trig`, `fight_row`, `first_trig`, `isles_trig`,
  `anchor_trig`, `east_trig`, `charts_trig`, `memory1_trig`, `memory2_trig`, `vex_trig`, `engine_trig`, `fall_trig`,
  `beacon_trig`, `scribe_trig`, and the lift triggers with `script: 'obs_f1_lift'` / `'obs_f2_lift'`; arrival scenes on
  enter (`airstair_foot`, `zephyr_arrival`, `obs_f1_arrival`, `obs_f2_arrival`, `obs_f3_arrival`, `cloud_library`,
  `isles_return` at `north_dock` from `kestrel_down`, and `scribe_after` as a reload trigger). Objects: `sky_berth`
  (`ep6_board`), `locker_obj` (`locker`), `lamp_anchor`, `lamp_listen`, `lamp_return` (`pledge_*`), `beacon_ring`
  (`beacon_light`). Chest flags: `compass_key_found`, `log_1_found` to `log_3_found`, `letter_1_found` to `letter_3_found`.
  NPC talk drives `meet_aeris`, `liora_dock`, `testimony_liora`, `testimony_bennet`, `beacon_start`, `letters_start`,
  `letters_done`. Signs read the line ids of section 4.
- **Battle (E6-battle).** Encounters `e6a_first`, `gale_engine`, `scribe` (flags `engine_defeated`, `scribe_defeated`);
  `startFury` from `beacon_lit` (+20) on `scribe`; `anchor_line` learned on `anchor_learned`; `GALE_START.e6a_first` Gust in
  3. Bram's tips are `TIPS` in `story.js`: the Engine's lever is `full_blast` (a `rewrite` move pinned to the Gust), the
  Scribe's `rewrite_course` (`rewrite`). Battle lines (`EP6_BATTLE_TEXT`, with `low_mp` "Keep something back to anchor
  us."), boss cards (`EP6_BOSS_CARDS`) and arc lines (`EP6_ARC_LINES`) are in `text.js`; the bark `anchor_low_mp` is the
  once-per-save field copy.
- **Pages (E6-tiles).** `PAGE_KINDS.ep6_slip` (`burned`), `ep6_manifest` (`struck`, `restored`), `ep6_letter` (one mode),
  `ep6_page` (`name`, `seal`, `torn`).
- **Scene/UI (E6-scene-ui).** The rope helper `s.rope(fromMark, toMark)` / `s.rope(null)` on the cutscene object
  (section 1); the boss cards, arc lines and battle text above; `END_CARD_EP6`, `END_CARD_EP5_LIVE`, `CREDITS_EP6` for the
  hooks (E6-pack's `handoff6` reads them from `text.js`).
- **Sprites (E6-sprites).** Every sprite in section 5, plus `scribe_avatar` and the portrait `scribe`.
