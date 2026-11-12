# Episode 7 staging guide

For the world and map owners (E7-world, E7-maps-a, E7-maps-b), the art owners (E7-tiles, E7-sprites), the scene/UI owner
(E7-scene-ui), the battle owner (E7-battle) and the integrator. It says, for every scripted scene in
`src/data/ep7/story.js`: which map, what starts it, who stands where, which props and marks must exist, what the camera
does and which music plays. Dialogue is not repeated here; read the scene. Same shape as `STAGING_EP6.md`. Map layouts:
`docs/EPISODE7_PLAN.md` section 4.

Owner: E7-story. `qa/content/ep7_story.test.mjs` checks that every scene, every mark a scene walks to, pans to or spawns
at, every inspect line id and every stone below appears in this file, so keep it in step with the script.

---

## 1. Cutscene API and the rules of this episode

Exactly the Episode 1 API (`STAGING.md` section 1), plus `closeup` for the pages, `warp` for the opening, and three
optional pack helpers. Details that matter here:

- **Staging (CRITIQUE_6 item 11).** Before the first line of anyone outside the party, the script calls `stage(s, X)`:
  the hero walks to mark `X`, then Mira to `X_m` and Bram to `X_b` together. Put `X` **two tiles below** the speaker (or
  two tiles in front of them, facing them), `X_m` one tile left of `X` and `X_b` one tile right, all walkable, none on a
  speaker's own cell, **none on a stone's path cell, a frost cell or the fade** (plan 4.5). Every `X`, `X_m`, `X_b` the
  script uses is listed per map below. One scene stages the party apart on purpose: `whiteout` (Mira on `mira_fade`, Bram
  on `bram_fade`, a step away from the hero on `whiteout_mid`).
- **Camera rule (EPISODE7 section 1, CRITIQUE_8 item 2).** Every **focus mark** (a mark the camera pans to, a speaker
  stands on, or the party is staged on) sits at least **12 tiles from the map's left and right edges and 7 from its top
  and bottom**, on any axis where the map is larger than the view (24 x 13.5 tiles); an axis the whole map fits on screen
  is exempt (the camera never moves on it). The focus marks are listed per map in section 3 under "Focus marks"; the
  approximate cells are the plan's, the exact ones the map author's (`docs/MAPS_EP7_A.md`, `docs/MAPS_EP7_B.md`), and
  `qa/maps/ep7_*` asserts the distances from those exact cells. Where a map cannot meet it, widen the map (plan 4).
- **Vex.** Vex is spawned as `vex_k` with sprite `npc_vex` (opaque; never `vex`, Episode 2's in-glass id), or
  `npc_vex_kneel` (the ep5 pack's kneeling frames) where he kneels at the Traveler's Wall and sits on the Vault's gate step.
  In `name_under_ice` he kneels at `vex_wall` facing the wall (up) and the party stops on `wall_stop`, **two clear rows
  below him**. He never fights.
- **Showing (CRITIQUE_6 item 3, CRITIQUE_7 item 7, CRITIQUE_8 item 5).** The payoffs open a close-up page only when
  `PAGE_KINDS[kind]` exists (E7-tiles registers the kinds from `src/data/ep7/pages.js` in wave 7b): `ep7_chart` mode
  `fading` in `ep7_morning`; `ep7_carving` modes `fading` in `name_under_ice` and `whole` in `doors_reopen`; `ep7_tally` (one
  mode) in `waystation`; `ep7_tag` in `listening_bell`; `ep7_seventh` and `ep7_page` mode `half` in `phantom_after`;
  `ep7_page` modes `joined`, `mark`, `signed` in `whole_page`, one after the other, each called right before the box that
  says its line, with Mira's "Nox." the **last** line said over the page, under `signed` (the scene waits 56 frames on
  `signed` first so the signature is at full strength when it is read); `ep7_letter` mode `restored` in `doors_reopen`.
  Every page is closed before anything on the field moves. Until the pages land the lines said over them read as narration;
  nothing else changes (the same boxes either way). The page words are plain, short lines (Scott, 2026-11-11).
- **Pack helpers (E7-scene-ui, wave 7d).** Used only when the cutscene has them (`'name' in s`); the boxes are the same
  without. `s.frostBlot(who)`: a box that shows "..." under a frost texture and plays a soft `ice` (the name the ice took
  out of a memory: `keeper_memory_1`, `keeper_memory_3`); the fallback is a plain "..." box from the same speaker and the
  `ice` sfx. `s.frostNames(ids, level)`: the battle's Rime drawer on the field's party row (level 0 to 3: `whiteout` frosts
  Mira and Bram to 3, then back to 0). `s.actorAlpha(id, alpha, frames)`: a sprite's alpha (`whiteout`: Mira and Bram to
  0.3 over 120 frames, back to 1 over 30). The tint `whiteout` (E7-world registers it on `TINTS`; an unknown tint draws
  nothing) fades in over 120 frames and out over 60.
- **Two names arrive late.** The Keeper is "The Keeper" (the square record `keeper`, the spawn `keeper_t`, the memory
  spawn `keeper_mid_m`) until Mira reads the signature in `whole_page` and says "Nox."; the page closes, `keeper_t` is
  despawned and `nox_t` ("Nox") spawned **on the same mark** (`hearth_n`), and `nox_named` is set. Her brother is "A
  Courier" (`courier_m`) in memory and is named on the page's `joined` line ("Carried down the White Road by Marten..."),
  then `marten_named`. `SPEAKER_NAMES` (npcs.js `EP7_SPEAKERS`) holds `white_phantom`, `phantom_v`, `keeper_t`,
  `keeper_mid_m`, `keeper_young_m`, `keeper_mother_m`, `courier_m`, `marten_m`, `aeris_t` and `vex_k`. After `nox_named`
  the record `nox_t` stands in the Keeper's Watch (`keeper_chair`) and the square's `keeper` record is gone (from
  `keeper_came` on; she walks with the party from there).
- **The hero never speaks.** Choices, emotes (`!`, `...`), walks. The hero is heard twice, never in a box: the whiteout
  (narration, `call_cast`, the HUD names thawing) and the battle (Call).
- **Speakers without an actor.** `white_phantom` is the map actor over the heart in `ep7_stillheart` (sprite
  `phantom_avatar`, portrait `phantom`, E7-maps-b and E7-sprites). The Phantom speaks in capitals. `phantom_v` is
  registered for the memory's voice but memory 3 shows the Phantom without a line.
- **Aeris.** On `ep6_zephyr` she is the record `aeris`, moved for `ep7_board` (`spawn('aeris', ...)` replaces the map actor;
  a reload puts her back). Everywhere else she is the spawn `aeris_t` (`ep7_morning`, `ep7_landing`, `doors_reopen`,
  `ep7_ending`).
- **Scene guards.** `SCENE_CONDITIONS` in `story.js`. `ep7_morning` says `live: true`, `if: ep6_complete` and `ifNot:
  ep7_morning_done, tier_1`: it does nothing while `EP7_LIVE` is false (`src/game/episodes.js`, read through a namespace so
  a missing export reads false) or on a Fine Print run. `GATE.live` in `story.js` is what the guard reads; the `?ep=7`
  developer entry (E7-pack) may set `GATE.live = true` after loading the pack. Every other scene needs a flag only an
  Episode 7 scene sets, so with the switch off nothing in Episode 7 is reachable.
- **Counter check.** `ep7_morning` should only start while counter `credits6_rolled` is set; the scene guard sees only
  flags, so the pack patch's enter triggers check the counter (`ep7_wake` on `ep6_zl_inn`, `ep7_wake_charts` on
  `ep6_zl_charts`).
- **The opening (Scott, 2026-11-11: not the inn room).** `ep7_morning` plays only on `ep6_zl_charts` with the leader on
  `CHARTS_STAGE` (story.js, the cell of `charts_dawn`). Anywhere else its first step fades out and warps the party to
  `ep6_zl_charts` at `CHARTS_STAGE` facing up, and ends; the room's own enter trigger then runs it there. So
  **`withEp7Charts` adds an enter trigger `ep7_wake_charts` (script `ep7_morning`, `on: 'enter'`)** and the ep3 pack's
  `opening_stage` event (`STAGE` from `src/data/maps/ep3/_opening.js`) beside the plan's marks, exactly as Episode 6's
  `withObsWake` did (plan 3 named only the marks; this is the one patch event the warp needs). The inn's `ep7_wake` stays.
- **Bosses.** A retry after a loss plays the pan, Mira's tip and the card only (`lantern_tried`, `phantom_tried`). A loss
  sets nothing.
- **Credits.** `ep7_ending` sets `ep7_complete`; E7-pack's hooks roll `CREDITS_EP7` over `palehaven` (counter
  `credits7_rolled`), show `END_CARD_EP7` and wake the party in the Keeper's Watch on `watch_cot` (plan 5.3; Episode 8 opens
  there). While `EP7_LIVE`, the Episode 6 end card is `END_CARD_EP6_LIVE` ("Episode 7 begins in the morning.").

## 2. Map conventions the story needs

### Flag-driven presence and visuals the script relies on

| What | Flag | Map owner |
|---|---|---|
| The Chart Room's north window frosted on the inside (`north_frost`) | while `ep6_complete` and not `ep7_started` | E7-maps-a |
| The gangway `north_gangway` (`script: 'ep7_board'`) | `if: ep7_started`, `ifNot: ep7_boarded` | E7-maps-a |
| The berth door `berth_white_road` to `ep7_white_road` `lake_landing` | `if: ep7_boarded` | E7-maps-a |
| `kestrel_back` boat door to `ep6_zephyr` `north_dock` | `if: road_arrived` | E7-maps-a |
| `fight_row` (`road_fight`) | `if: vex_carved` | E7-maps-a |
| `whiteout_trig` (`whiteout`) | `if: first_stone_read` | E7-maps-a |
| The Waystation stove lit, a rest and save (`ep7_stove`) | `saw_sevens` | E7-maps-a |
| The Palehaven banner's second state | `doors_reopened` | E7-story (text.js) |
| The hearth lit, a rest and save | `hearth_lit` (or lit by `doors_reopened`) | E7-maps-a |
| Iced doors open with names, the Vanishing Mark filled | `doors_reopened` | E7-maps-a |
| `watch_trig` (`keeper_and_vex`) | `if: met_keeper` | E7-maps-a |
| `vault_trig` at the north gate (`vault_gate`) | `if: keeper_told` | E7-maps-a |
| The north gate open, the Vault door reachable | `vault_open` | E7-maps-a |
| The Watch: letters face up, shutter open, `watch_cots` | `doors_reopened` | E7-maps-a |
| The `nave_door` from the square to `ep7_stillheart` `roof` (`ep7_ending` on enter) | `doors_reopened` | E7-maps-a |
| The lift triggers `vault_f1_lift`, `vault_f2_lift` | the lift cells (F2's after `lantern_defeated`) | E7-maps-b |
| The Reliquary gold chest | `reliquary_open` | E7-maps-b |
| The round door open | `stillheart_open` | E7-maps-b |
| `phantom_trig` row | `if: stillheart_open` | E7-maps-b |
| An enter trigger that runs `phantom_after` (a reload after the win) | `if: phantom_defeated`, `ifNot: stillheart_restored` | E7-maps-b |
| `square_return` door to `ep7_palehaven` `vault_door`, whose arrival runs `whole_page` | `phantom_defeated` | E7-maps-b / E7-maps-a |
| An enter trigger on `ep7_palehaven` that runs `doors_reopen` (a reload between the two) | `if: page_whole`, `ifNot: doors_reopened` | E7-maps-a |
| The Stillheart thawed, the list decal and the opened `page_block` | `stillheart_restored` | E7-maps-b |
| Night, the `star_stair` prop | `doors_reopened` | E7-maps-b |

## 3. Scenes, map by map

### `ep6_zl_charts` (patch `withEp7Charts`: enter trigger `ep7_wake_charts`; marks `charts_dawn`, `charts_dawn_m`, `charts_dawn_b`, `aeris_table7`, `compass_table`, `north_window`; overlay `north_frost`)

- `ep7_morning`: plays here only with the leader on `CHARTS_STAGE` = `charts_dawn` (proposed (6, 6), two tiles below
  `aeris_table7` (6, 4); `charts_dawn_m` (5, 6), `charts_dawn_b` (7, 6); `compass_table` (4, 5) is the skychart object's
  cell; `north_window` a cell on the north wall face, (6, 1)). If E7-maps-a moves `charts_dawn`, `CHARTS_STAGE` in
  `story.js` moves with it (one line, E7-story's file: say so in the report). The scene sets the opening tint `dawn` (or
  `s.openingTint('dawn')` under the ep3 `opening_stage` event), spawns Aeris (`aeris_t`) at the table, stages the party,
  pans to the window, fades in, then pans to the table. The chart close-up opens on Aeris's second box; music `zephyr`
  goes silent on the chart and comes back after it. Gives `white_road_letter` only without `white_road_letter_get`. The
  room fits one screen across (18 wide): exempt on that axis.
- The inn (`ep6_zl_inn`, patch `withEp7Wake`: trigger `ep7_wake`) only fires the scene; the scene's first step leaves on black.

### `ep6_zephyr` (patch `withNorthBerth`: `north_gangway`, `berth_white_road`; marks `gangway7`, `gangway7_m`, `gangway7_b`, `aeris_gangway7`, `vex_seat`, existing `north_dock`)

- `ep7_board`: the gangway object. Aeris (the record) is moved to `aeris_gangway7`; Vex (`vex_k`) is already in his seat on
  the Kestrel at `vex_seat`; the party stages on `gangway7`, two tiles from both. Two boxes. Sets `ep7_boarded`; the berth's
  boat door does the flight. Music: the map's `zephyr`, unchanged.

### `ep7_white_road` (marks `lake_landing`, `landing_stage`, `landing_stage_m`, `landing_stage_b`, `aeris_landing`, `vex_landing`, `vex_ahead_l`, `vex_wall`, `wall_stop`, `wall_stop_m`, `wall_stop_b`, `vex_ahead`, `fight_row`, `foes_drop`, `foes_drop_b`, `sol_twine`, `stone_stage`, `stone_stage_m`, `stone_stage_b`, `gap_a`, `gap_b`, `ledge_b`, `whiteout_mid`, `mira_fade`, `bram_fade`, `gap_c`, `waystation_door`, `icegate`, `palehaven_far`, `north_exit`)

- `ep7_landing`: on enter by the berth door (if `ep7_boarded`). Aeris spawns at `aeris_landing` by the Kestrel, Vex at
  `vex_landing`; the party stages on `landing_stage`. The flight is the first box (narration); Vex walks to `vex_ahead_l`
  (a cell up the road, off screen is fine) and is despawned; the camera pans up to `gap_a` (the first stretch of white).
  4 boxes. Sets `road_arrived`.
- `name_under_ice`: step trigger `wall_trig` (about (13, 45)). Vex kneels at `vex_wall` facing up (`npc_vex_kneel`); the
  party stops on `wall_stop` two rows below him. Silence from the knife (`ice`), the carving close-up, `mystery` under the
  choice, `high_moor` back at the end. He stands (`npc_vex`, facing down) to hand over the list, then walks to
  `vex_ahead` and is despawned. 12 boxes. Gives `valewyn_list`.
- `road_fight`: the `fight_row` step row. Pan to `foes_drop`; two `rime_wolf` field sprites spawn at `foes_drop` and
  `foes_drop_b`; `rime_bite` sfx; one narration, Mira's line (names Defend), battle `e7w_first` (no flee). 3 boxes.
- `first_stone`: step trigger `first_trig` as the party nears Gap A. Sol is the record `sol` at `sol_twine`; the party
  stages on `stone_stage` two tiles from him; pan to `gap_a`. 3 boxes. Sets `first_stone_read` (the stone lesson was
  given; the read itself is E7-world's `ns_asta` with bark `first_held`).
- `whiteout`: step trigger `whiteout_trig` (about (15, 20)) after `first_stone_read`. The party walks apart to
  `whiteout_mid`, `mira_fade`, `bram_fade`; the map track goes silent, the tint `whiteout` fades in over 120 frames, the
  helpers fade Mira and Bram (section 1); the hero emotes `!`; `call_cast`; the fade lifts; `high_moor` returns. 8 boxes.
  Sets `call_learned` (Call's `learn: { flag }`).
- `palehaven_view`: step trigger `icegate_trig` (about (15, 4)). `mystery`, a pan to the `palehaven_far` decal (the
  cathedral flickering, never faster than once in 3 s), the hero emotes `...`, `high_moor` back. 4 boxes.
- Focus marks, `ep7_white_road` (30 x 56: x 12 to 17, y 7 to 48): `landing_stage`, `aeris_landing`, `gap_a`, `wall_stop`,
  `vex_wall`, `foes_drop`, `foes_drop_b`, `stone_stage`, `sol_twine`, `whiteout_mid`, `mira_fade`, `bram_fade`. (The plan's
  lake at y 48 to 55 puts `lake_landing` (15, 52) and `aeris_landing` under 7 from the bottom: stage `landing_stage` at
  y 48 or above, and keep `aeris_landing` at y 48 or above, or lengthen the map. `palehaven_far` is an overhead decal at
  the top of the map; the pan to it clamps by design, the decal is the picture.)

### `ep7_waystation` (marks `party_stop`, `party_stop_m`, `party_stop_b`, `tally`, `stove`, `sol_counter`)

- `waystation`: on first enter (`tally_trig` two tiles in). The party stages on `party_stop`; pan to `tally` (the
  doorframe); the tally close-up with the music silent; `high_moor` back; pan to `stove` (`brazier_light`, the stove lights:
  a rest and save from `saw_sevens`, text `ep7_stove`). Sol is `sol_waystation` at `sol_counter` (shop `waystation_pack`).
  6 boxes. The room fits one screen (14 x 10): exempt.

### `ep7_palehaven` (marks `south_gate`, `bryn_gate`, `gate_stage`, `gate_stage_m`, `gate_stage_b`, `hearth`, `hearth_n`, `hearth_s`, `hearth_s_m`, `hearth_s_b`, `hearth_w`, `hearth_e`, `iced_a`, `keeper_lamp`, `keeper_stage`, `keeper_stage_m`, `keeper_stage_b`, `watch_door`, `vault_gate`, `gate_keeper`, `gate_keeper_back`, `north_gate_stage`, `north_gate_stage_m`, `north_gate_stage_b`, `vex_step`, `vault_door`, `nave_door`, `torr_steps`, `mirael_door`, `aeris_square`, `vex_run`, `vex_square`, `inn_door`, `shop_door`, `armory_door`, `crowd_a` to `crowd_f`, `cathedral_far`)

- `palehaven_arrival`: on first enter by the south gate (if `road_arrived`). Silence; the party stages on `gate_stage`
  two tiles from Bryn (`bryn_gate`); pan to `hearth`; `palehaven` starts on Bryn's first line; pan to `iced_a` for Mira's
  question. 5 boxes.
- `meet_keeper`: the `keeper` record's talk entry at `keeper_lamp` (first time). The party stages on `keeper_stage`; she
  walks to `watch_door` and is despawned (a reload puts the record back at her lamp); pan to `watch_door` (the notice:
  text `ep7_keeper_notice`). 8 boxes.
- `vault_gate`: step trigger `vault_trig` at the north gate (if `keeper_told`). The Keeper spawns at `gate_keeper`; the
  party stages on `north_gate_stage`; pan to `vault_gate`; `gate_open`; `vault_open` is set **before** the Keeper's line, so
  the gate object is open while she speaks. Vex spawns sitting at `vex_step` (`npc_vex_kneel`); the Keeper walks to
  `gate_keeper_back` and is despawned. 5 boxes.
- `whole_page`: on arrival in the square by `square_return` (if `stillheart_restored`), at dusk (`tint dusk`). The Keeper
  spawns at `hearth_n` and Vex at `hearth_e`; the party stages on `hearth_s`; pan to `hearth`. The page in three steps
  (section 1); the swap `keeper_t` to `nox_t` on `hearth_n`; `name_restore` and a warm flash; `palehaven` on Nox's first
  line. 15 boxes (budget 18). Chains `doors_reopen`.
- `doors_reopen`: straight after (or on its own after a reload). Fade out, dawn; Nox (`nox_t`) at `hearth_n`, Aeris
  (`aeris_t`) at `aeris_square`, the party on `hearth_s`; pan to `iced_a` (the doors run: `frost_seal`), `palehaven` from
  the first open door, pan to `hearth` (Nox reads the letter; `brazier_light`, the hearth catches, or flares if lit). The
  letter close-up; Vex runs in from `vex_run` to `vex_square`; the carving close-up (`whole`); Nox's gift (`open_gate` on
  `told_nox`, else `kept_lamp`). 14 boxes (budget 16). Takes `white_road_letter`.
- `hearth_light`: the hearth object (if `hearth_started`). Before the three witnesses one box; once lit one box; the
  lighting itself stages the party on `hearth_s` (3 boxes).
- The side talk scenes `hearth_start` (Eira at `hearth_w`, chains her own witness, `testimony_eira`), `testimony_mirael`
  (Mirael at `mirael_door`), `streets_start` and `streets_done` (Torr at `torr_steps`) stage nobody: one NPC, two or three
  boxes. `testimony_sol` runs from either of Sol's records (`sol` on the road, `sol_waystation` at the counter).
- Focus marks, `ep7_palehaven` (46 x 36: x 12 to 33, y 7 to 28): `gate_stage`, `bryn_gate`, `hearth`, `hearth_n`,
  `hearth_s`, `hearth_e`, `hearth_w`, `iced_a`, `aeris_square`, `vex_square`, `keeper_lamp`, `keeper_stage`, `watch_door`,
  `vault_gate`, `gate_keeper`, `north_gate_stage`, `vex_step`. (The south gate itself may sit on the bottom edge: stage
  `gate_stage` and `bryn_gate` 7 or more rows up from it, inside the walls.)

### `ep7_ph_watch` (marks `watch_stage`, `watch_stage_m`, `watch_stage_b`, `keeper_chair`, `vex_door`, `vex_door_out`, `frame`, `watch_cot`)

- `keeper_and_vex`: step trigger `watch_trig` two tiles inside the door (if `met_keeper`). The Keeper spawns in her chair
  (`keeper_chair`, facing down), the party stages on `watch_stage` two tiles below her, Vex comes in behind at `vex_door`
  (facing up). Pan to `frame` (the empty frame) for Mira's question and back. No music change (the Watch's track is
  `mystery`). Vex leaves by `vex_door_out`. 12 boxes. The room is copied from `chapel`; if it fits one screen it is exempt,
  otherwise its focus marks are `watch_stage`, `keeper_chair`, `vex_door`, `frame`.
- After `nox_named` the record `nox_t` stands at `keeper_chair`; the credits wake the party on `watch_cot`.

### `ep7_vault_f1` (marks `basin`, `font`, `by_reach`, `frozen_gate`, `memory1_stage`, `memory1_stage_m`, `memory1_stage_b`, `mother_gate`, `girl_gate`, `keep_near`, `side_gallery`, `balcony`, `lift_up`, `lift_f1_up`)

- `vault_f1_arrival`: on enter. Pan to `by_reach`. 3 boxes.
- `keeper_memory_1`: step trigger `memory1_trig` at the frozen gate. The party stages on `memory1_stage`; pan to
  `frozen_gate`; `sorrow`, `bell_toll`, a cold flash; the mother (`keeper_mother_m`, `npc_keeper_mother`) at `mother_gate`
  facing down, the girl (`keeper_young_m`, `npc_keeper_young`) at `girl_gate` facing up; the blot; flash out, despawn,
  `frostbound_vault`. 5 boxes.
- `vault_f1_lift`: the silent lift trigger (sets `vault_f1_done`).
- Focus marks, `ep7_vault_f1` (40 x 30: x 12 to 27, y 7 to 22): `by_reach`, `frozen_gate`, `memory1_stage`, `mother_gate`,
  `girl_gate`.

### `ep7_vault_f2` (marks `arrival`, `grip`, `letter_wall`, `memory2_stage`, `memory2_stage_m`, `memory2_stage_b`, `keeper_gate_m2`, `courier_snow`, `courier_stop`, `bell_bay`, `bell_stop`, `bell_stop_m`, `bell_stop_b`, `side_galleries`, `reliquary`, `arena`, `lantern_spot`, `arena_stage`, `arena_stage_m`, `arena_stage_b`, `lift_up`, `lift_f2_down`)

- `vault_f2_arrival`: on enter. No pan (the dark hall is the picture). 3 boxes.
- `keeper_memory_2`: step trigger `memory2_trig` at the letter wall. The party stages on `memory2_stage`; pan to
  `letter_wall`; the Keeper in memory (`keeper_mid_m`, `npc_keeper_mid`) at `keeper_gate_m2`, the courier (`courier_m`,
  `npc_courier_m`, the Willowmere post badge) walks from `courier_snow` to `courier_stop`. 6 boxes.
- `listening_bell`: step trigger `bell_trig`, placed so the party stops on `bell_stop` two rows below the tag. Silence;
  pan to `bell_bay`; Bram emotes `...`; `mystery` under the tag close-up; `frostbound_vault` back. 11 boxes (budget 14).
- `pale_lantern`: arena trigger `lantern_trig`. Silence, pan to `lantern_spot`, the party stages on `arena_stage`, two
  narration boxes (the second is the arc line), Mira's tip, the card, `battle`. After the win two boxes and
  `frostbound_vault`.
- `ep7_reliquary`: the object `reliquary_obj` (`script: 'ep7_reliquary'`: the plan said `reliquary`, an Episode 5 scene id) behind frost door `R`. Without all three pages (`page_door_found`,
  `page_flame_found`, `page_lost_found`) it says two boxes and stays shut; with them it takes the three `witness_page`
  and sets `reliquary_open` (the gold chest beside it appears).
- `vault_f2_lift`: the silent lift trigger (sets `vault_f2_done`; the lift appears after `lantern_defeated`).
- Focus marks, `ep7_vault_f2` (40 x 30: x 12 to 27, y 7 to 22): `letter_wall`, `memory2_stage`, `keeper_gate_m2`,
  `courier_stop`, `bell_bay`, `bell_stop`, `lantern_spot`, `arena_stage`.

### `ep7_vault_f3` (marks `arrival`, `font`, `memory3_spot`, `memory3_stage`, `memory3_stage_m`, `memory3_stage_b`, `memory3_run`, `memory3_bell`, `nave_dark`, `shelter`, `remember`, `remember_stage`, `remember_stage_m`, `remember_stage_b`, `keeper_stair`, `keeper_wait_1`, `keeper_wait_2`, `keeper_wait_3`, `return`, `round_door`, `party_stop_door`, `grate`)

- `vault_f3_arrival`: on enter. Pan to `round_door` (the still light at the top) and back. 3 boxes.
- `keeper_memory_3`: step trigger `memory3_trig` on the first landing. The party stages on `memory3_stage`; pan to
  `memory3_spot`; the younger Keeper (`keeper_mid_m`) runs from `memory3_run` to `memory3_bell`; `bell_thirteenth` and the
  blot; pan to `nave_dark` (something lifts its head: no actor needed, the dark is enough); `mystery` back. 7 boxes.
- `keeper_comes`: step trigger `keeper_trig` at the top of the Remember landing (if `keeper_memory_3`). Footsteps; the
  Keeper (`keeper_t`) spawns at `keeper_stair` and walks to `keeper_wait_1`; the party stages on `remember_stage`. The
  main truth choice. She then stands at `keeper_wait_3` by the round door (a spawn), the camera pans to `round_door`,
  `frost_seal` plays (the door opening) and `stillheart_open` is set. 9 to 10 boxes.
- Focus marks, `ep7_vault_f3` (34 x 40: x 12 to 21, y 7 to 32): `memory3_spot`, `memory3_stage`, `memory3_bell`,
  `nave_dark`, `remember_stage`, `keeper_wait_1`, `round_door`, `keeper_wait_3`. (`round_door` at y 1 to 5 in the plan
  is under 7 from the top: give the door its landing at y 7 or below, or the pans to it clamp.)

### `ep7_stillheart` (marks `entry`, `heart`, `party_stop`, `party_stop_m`, `party_stop_b`, `nox_enter`, `list_spot`, `page_block`, `roof`, `roof_m`, `roof_b`, `stair_foot`, `nox_roof`, `vex_rail`, `aeris_rail`)

- `phantom`: step trigger row `phantom_trig`. Silence; the Keeper spawns at `nox_enter` (behind the party); pan to
  `heart`; the party stages on `party_stop`; three narration boxes (the third is the arc line), the Phantom (map actor
  `white_phantom`) speaks to all three, the choice, one answer, Mira's tip, the card, `boss_phantom`. A win chains
  `phantom_after`.
- `phantom_after`: pan to `heart`, then `list_spot` (the seventh list close-up), then `page_block` (the half page). Music
  `sorrow`, `triumph`, `mystery`, silence; `bell_thirteenth` three times, a pause, once alone. 16 boxes (budget 18).
- `ep7_ending`: on enter by the `nave_door` (if `doors_reopened`), at night. Nox (`nox_t`) at `nox_roof`, Vex at
  `vex_rail`, Aeris at `aeris_rail`; the party stages on `roof`; pan to `heart`, then `stair_foot` as the `star_stair`
  prop rises; `mystery`; the end cards. 10 boxes. Kept for Episode 8: `stair_foot`, `star_stair`, `nave_door`.
- Focus marks, `ep7_stillheart` (26 x 22: x 12 to 13, y 7 to 14): `heart`, `party_stop`, `list_spot`, `page_block`,
  `roof`, `stair_foot`. (26 wide leaves a two-column band: widen the map to 30 or more if `page_block` and `list_spot`
  must sit beside the heart.)

## 4. The name stones (plan 4.11; text keys in `text.js` `EP7_STONES`)

A `namestone` event's id is `ns_<name>` and its `name` field is the text key. The float line on a read is the key's text
("BO. The road remembers him."), shown once, never needed to solve anything (EPISODE7 choice 13). Plan 4.7's `ns_hob`
and 4.8's `ns_ansel` are renamed: Hob is Willowmere's innkeeper and Ansel one of Episode 1's lost pilgrims.

| Map | Event, text key |
|---|---|
| `ep7_white_road` | `ns_asta` `stone_asta` (Gap A), `ns_bo` `stone_bo`, `ns_nyx` `stone_nyx` (Gap B), `ns_ilka` `stone_ilka` (the ledge, optional), `ns_senna` `stone_senna` (Gap C) |
| `ep7_vault_f1` | `ns_arvo` `stone_arvo`, `ns_liesl` `stone_liesl` (By Reach), `ns_sigrid` `stone_sigrid`, `ns_vidar` `stone_vidar` (Keep the Near One), `ns_oskar` `stone_oskar` (the side gallery) |
| `ep7_vault_f2` | `ns_dagny` `stone_dagny` (held on arrival), `ns_hakon` `stone_hakon`, `ns_runa` `stone_runa` (the Grip), `ns_tuva` `stone_tuva`, `ns_kell` `stone_kell` (the Reliquary pair) |
| `ep7_vault_f3` | `ns_ylva` `stone_ylva` (Shelter), `ns_greta` `stone_greta`, `ns_lars` `stone_lars` (Remember), `ns_anders` `stone_anders`, `ns_ida` `stone_ida` (Return), `ns_solveig` `stone_solveig` (the hidden stone in Keeper ink) |

The Bell Bay's single stone (F2 C) is any of the F2 names the map author picks; F3 has six names for at most five stones
plus the hidden one, so one may go unused. Talk names them (`quests.js`): Asta, Bo, Nyx, Senna, Arvo, Liesl, Oskar,
Dagny, Hakon, Runa, Tuva, Kell, Ylva, Anders, Ida. If a map author renames a stone, tell E7-story (the Talk line moves too).

## 5. Inspect lines (registered from `text.js`)

| Map | Line ids |
|---|---|
| `ep6_zl_charts` (patch) | `ep7_north_window` |
| `ep7_white_road` | `ep7_frozen_lake`, `ep7_kestrel_lake`, `ep7_snowpine`, `ep7_travelers_wall` (three states), `ep7_fade`, `ep7_ghost_trail`, `ep7_stone_dim`, `ep7_stone_lit`, `ep7_sol_twine`, `ep7_icegate`, `ep7_palehaven_far`, `ep7_strongbox` |
| `ep7_waystation` | `ep7_tally`, `ep7_post_box`, `ep7_stove` (**its own save-bell key**), `ep7_bench`, `ep7_woodpile` |
| `ep7_palehaven` | `ep7_vanishing_mark`, `ep7_iced_door`, `ep7_hearth_cold`, `ep7_beacon_north`, `ep7_keeper_notice`, `ep7_vault_gate`, `ep7_cathedral_far`, `ep7_aurora_crystal`, `sign_ep7_inn`, `sign_ep7_shop`, `sign_ep7_armory`, `sign_ep7_watch` |
| `ep7_ph_watch` | `ep7_letters_face`, `ep7_empty_frame`, `ep7_cold_lamp`, `ep7_watch_oath` (over the inner door), `ep7_watch_bell` (**its own save-bell key**), `ep7_watch_cots` |
| `ep7_vault_f1` | `ep7_frost_brick`, `ep7_ice_glass`, `ep7_thawlight_basin` (the font), `ep7_frozen_gate`, `ep7_dash_ice`, `ep7_winterwatch_cache` |
| `ep7_vault_f2` | `ep7_borrowed_lamp`, `ep7_frost_door`, `ep7_letter_wall`, `ep7_listening_bell`, `ep7_mara_tag`, `ep7_reliquary_door` |
| `ep7_vault_f3` | `ep7_charter_shelter`, `ep7_charter_remember`, `ep7_charter_return` (one over each landing's stair), `ep7_ice_pillar`, `ep7_keeper_ink`, `ep7_round_door`, `ep7_inner_grate` |
| `ep7_stillheart` | `ep7_stillheart_heart`, `ep7_seventh_floor`, `ep7_page_block`, `ep7_broken_roof`, `ep7_star_stair` |
| `court_f2` (Hollowmere) | `ep7_court_portrait` (see section 6) |

No Episode 7 event may name an Episode 1 text key (PLAYTEST_REVIEW_8 item 7); `qa/content/ep7_story.test.mjs` reads every
`src/data/maps/ep7_*.js` event once the maps exist. Books: `keeper_book` (the Reliquary chest, F2), `missing_streets`
(Torr's, a book object on the Watch steps), `keeper_charter` (by the round door, F3).

## 6. NPCs

| Record | Map, mark | Shown | Notes |
|---|---|---|---|
| `keeper` ("The Keeper") | `ep7_palehaven` `keeper_lamp` | `palehaven_arrived`, not `keeper_came` | talk entry `meet_keeper`; sprite `npc_keeper` |
| `nox_t` ("Nox") | `ep7_ph_watch` `keeper_chair` | `nox_named` | also the scene spawn in `whole_page`, `doors_reopen`, `ep7_ending` |
| `bryn` | `ep7_palehaven` `bryn_gate` | always | two line sets by `nox_named` |
| `eira` | `ep7_palehaven` `hearth_w` | always | talk entry `hearth_start`; two line sets |
| `eira_forge` | `ep7_ph_armory` `forge` | always | shop `glassice_armory`; Ledger alias of `eira` |
| `sol` | `ep7_white_road` `sol_twine` | always | talk entry `testimony_sol` |
| `sol_waystation` | `ep7_waystation` `sol_counter` | always | shop `waystation_pack`; talk entry `testimony_sol`; alias of `sol` |
| `maera` | `ep7_ph_shop` `counter` | always | shop `northwind` |
| `torr` | `ep7_palehaven` `torr_steps` | always | talk entries `streets_start`, `streets_done`; two line sets |
| `mirael` | `ep7_palehaven` `mirael_door` | always | talk entry `testimony_mirael`; two line sets |
| `ep7_innkeeper` | `ep7_ph_inn` `counter` | always | inn, 140 gold; sprite `npc_north_watchkeeper` (the `npc_innkeeper` recolor, plan 9.2) |

Two handoffs nobody's brief owns yet (for the orchestrator): **the Court's empty portrait** (EPISODE7 choice 5) needs a
pack patch of `court_f2` that points the `portrait_keeper` frame at `ep7_court_portrait` once `nox_named` is set (an object
on the same cell, `if: nox_named`, text `ep7_court_portrait`; the Episode 2 scene stays as it is before); and **Piri's
Dead Letters** still gives a `white_road_letter` if a player finishes it after `ep7_morning` gave one (harmless: the
letter is a key item taken once in `doors_reopen`).

## 7. Contracts for the other agents

- **E7-pack.** `src/data/ep7/{flags,npcs,quests,text,story,ledger}.js` each export `register()` (and it as the default).
  Order in `ORDER`: `flags` first; `npcs`, `quests`, `text`, `story`, `ledger` after the battle modules, as Episode 6.
  `quests.register({ ep7Live })` and `ledger.register({ ep7Live })` read `EPISODES.EP7_LIVE` when no option is given (an
  engine object passed by the pack entry has no such key). `quests.js` puts `['ep7_started', MAIN_QUEST_EP7]` at the front
  of `QUEST_EXT` (skip yours if it is there). `text.js` exports `CREDITS_EP7`, `END_CARD_EP7`, `END_CARD_EP6_LIVE`,
  `END_TITLE_EP7`, `EPISODE8_CARD` for `CREDITS_HANDOFF[7]` (map `ep7_ph_watch`, mark `watch_cot`, counter
  `credits7_rolled`). `story.js` exports `GATE` (set `GATE.live = true` on the `?ep=7` entry) and `CHARTS_STAGE`.
- **E7-maps-a.** The patch events above (`ep7_wake`, `ep7_wake_charts` with the ep3 `opening_stage`, `north_gangway`,
  `berth_white_road`), every mark in section 3, the stone events and keys of section 4, the inspect ids of section 5, and the
  NPC marks of section 6. `CHARTS_STAGE` (story.js) is the cell of `charts_dawn`.
- **E7-maps-b.** The Vault and Stillheart marks of section 3, the triggers (`memory1_trig`, `memory2_trig`, `bell_trig`,
  `lantern_trig`, `memory3_trig`, `keeper_trig`, `phantom_trig`), the map actor `white_phantom`, the two lift triggers, the
  `phantom_after` reload trigger, `square_return`.
- **E7-battle.** Encounters `e7w_first` (no flee), `pale_lantern` and `white_phantom` (boss, no flee). Mira's tips are a
  contract (`TIPS` in story.js): `borrowed_light` and `farewell` carry the `farewell` flag; `call_name` is the hero's
  "Call", `target: 'ally'`, `learn: { flag: 'call_learned' }`. The Hearth's +20 Fury reads `hearth_lit`. Every Rime,
  Farewell, Borrowed Light and phase message is in `text.js` `EP7_BATTLE_TEXT` (the `_by` tables hold the bible's
  per-member wording).
- **E7-scene-ui.** `EP7_BOSS_CARDS`, `EP7_ARC_LINES`, `EP7_BATTLE_TEXT` (Defend help "Shake off the cold.", Call help, the
  low-MP hint `low_mp` and its bark `call_low_mp`); the cutscene helpers `s.frostBlot`, `s.frostNames`, `s.actorAlpha`.
- **E7-tiles.** The page kinds and modes of section 1; the words over each page are the narration boxes of the scene.
- **E7-sprites.** Spawned sprites: `npc_keeper`, `npc_keeper_young`, `npc_keeper_mid`, `npc_keeper_mother`,
  `npc_courier_m`, `npc_aeris`, `npc_vex`, `npc_vex_kneel` (ep5), `rime_wolf` (field); records: `npc_bryn`, `npc_eira`,
  `npc_sol`, `npc_maera`, `npc_torr`, `npc_mirael`, `npc_north_watchkeeper`; the map actor `phantom_avatar`; portrait
  `phantom`.
- **E7-audio.** Cues used: `zephyr`, `high_moor`, `palehaven`, `frostbound_vault`, `mystery`, `sorrow`, `triumph`,
  `battle`, `boss_phantom`; sfx `ice`, `rime_bite`, `call_cast`, `brazier_light`, `gate_open`, `bell_toll`,
  `bell_thirteenth`, `name_restore`, `frost_seal`, `footstep_stone`, `boss_die`, `chest_open`, `level_up_sparkle`.
