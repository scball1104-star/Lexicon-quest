# Episode 3 staging guide

For the world and map owners (E3-world, E3-maps), the scene/UI owner (E3-scene-ui) and the integrator. It says, for
every scripted scene in `src/data/story/ep3.js`: which map, what starts it, who stands where, which props and marks must
exist, what the camera does and which music plays. Dialogue is not repeated here; read the scene. Same shape as
`STAGING.md` (Episode 1) and `STAGING_EP2.md`. Map layouts: `docs/EPISODE3_PLAN.md` section 4.

Owner: E3-story. `qa/content/ep3.test.mjs` checks that every scene, every mark a scene walks to, pans to or spawns at,
and every inspect line id below appears in this file, so keep it in step with the script.

---

## 1. Cutscene API and the rules of this episode

Exactly the Episode 1 API (`STAGING.md` section 1) plus the W11 `closeup` (unused here). Details that matter more here:

- **Two names are missing until late.** Nobody says the founder's name before `bram_memory_3` (`mara_read`) and nobody
  says Garrick's name before the Smith is renamed in `warden_after`. Bram's father is "the Smith" on the speaker tag
  (spawned actors `smith`, `smith_t`, named "The Smith"; the NPC record `garrick_e`) until `garrick_named`. The swap is
  the Aurel pattern: under a `name_restore` flash the `smith_t` actor is despawned and `garrick_t` ("Garrick") spawned on
  the same tile. After it the NPC record `garrick_n` takes over at the forge. The founder speaks only as the speaker id
  `voice` (tag "A Voice", `SPEAKER_NAMES`), and once as `mara_voice` (tag "Mara") in `warden_after`.
- **Speakers without an actor.** `say('voice', ...)` shows "A Voice" and no portrait. `cinder_warden` is a map actor in
  `foundry_heart` and needs its display name from `SPEAKER_NAMES` (added).
- **Scene guards.** `SCENE_CONDITIONS` in `ep3.js`. `ep3_morning` and `sand_gate` also say `live: true`: they do nothing
  while `EP3_LIVE` is false (`src/game/episodes.js`). Every other scene needs a flag only an Episode 3 scene sets, so with
  the switch off nothing in Episode 3 is reachable. The `GATE.live` object in `ep3.js` is what the guard reads (tests flip it).
- **Counter check.** `ep3_morning` should also be launched only while counter `credits2_rolled` is set; the scene guard
  can only see flags (`ep2_complete`, `ep3_morning_done`), so the field trigger on enter of `nh_inn` and of
  `nameless_hollow` checks the counter before it starts the scene.
- **Chains.** `cinder_warden` calls `warden_after` after the win (also a scene on its own for a reload). `first_bell`
  calls `ep3_ending` after setting `first_bell_rung` and `pk_restored`. The integrator rolls `CREDITS_EP3` after
  `ep3_complete`, sets counter `credits3_rolled`, shows `END_CARD_EP3`, and wakes the party at `pk_inn` `inn_bed`.
- **Tints.** Memories use `dawn` (a warm cast; a dedicated sepia `memory` tint from E3-world would replace it in one
  word). `ash_haze` is the Emberpeak and sand road map tint; `first_bell` lifts it with `tint('none')`; `ep3_ending`
  goes to `night`.
- **Retries.** `bellows_specter` and `cinder_warden` set `*_tried` on the first start; after a loss the intro is only the
  arrival, Mira's tip and the card.

## 2. Map conventions the story needs

Everything in `STAGING.md` section 2 holds: `marks: { name: [x, y] }`, NPC events whose id equals the NPC id,
`{ type: 'trigger', script }`, `{ type: 'object', script }`, `{ type: 'sign', text: '<lineId>' }` reading `lines`
(Episode 3 ids live in `ep3.js`; `story.js` must merge them), books from `BOOKS`, banners from `BANNERS`.

### Flag-driven presence and visuals the script relies on

| Flag | What changes (owner) |
|---|---|
| `ep3_started` | Willowmere's Garrick (smithy) is hidden (`npcs.js` `show`, done). A note on the smithy door, `{ type: 'sign', text: 'smithy_gone_east', if: 'ep3_started' }` (E3-maps). Penny on the east road is hidden from `sand_gate_open` (done); Penny reappears as `penny_s` on the sand road. |
| `sand_gate_open` | The chain on the Hollowmere arch is gone (`sand_chain`, `ifNot`), the east exit works (E3-maps). |
| `pk_arrived` | The memorial and the coolant station answer to their scripts. |
| `met_ilya` | `garrick_e` appears in `pk_smithy` (done, `show`); the foundry gate answers to `lift_key`; side errands open. |
| `forge_relit` | `forge_lit` frames and chimney smoke at `pk_smithy`; the tier 6 stock (shops.js). |
| `foundry_entered` | The lift door to `foundry_f1` `start` stands open (E3-maps). |
| `lift_wheel_lit` | The ore lift gate in the Wheelhouse opens (basin latch flag). |
| `foundry_f2_done` | The lift shortcut `lift_f2_short` to the F1 landing (plan 5.4). |
| `oath_hand`, `oath_heart`, `oath_home` | The Bell Gate's three sockets light; the gate's flag source is the AND of all three. |
| `bell_gate_open` | The scene `cinder_warden` becomes startable; the Bell Gate is open. |
| `garrick_named` | `garrick_e` is replaced by `garrick_n` (done). The smithy note text changes (`smithy_gone_east`). |
| `pk_restored` | Ash particles stop, tint `ash_haze` lifts, music `emberpeak` to `first_bell`, banner state "The First Bell", memorial plates lettered, the furnace glow decal dims. |
| `ledger_found` | The apprentice's cache chest appears in the F2 records cage (map). |
| `sand_started` | The sand hopper chest appears in F1's dead end (map chest flag `glass_sand_found`). |

### NPC placement (events, id = NPC id; `spot` in `npcs.js` says where)

| Map | NPCs |
|---|---|
| `sand_road` | `penny_s` at `penny_cart` (shop `sand_peddler`) |
| `emberpeak` | `rusk` (south gate, `gate_in`), `veyra` (`coolant`), `harl` (`memorial`) |
| `pk_inn` | `bess` (inn, 60 gold) |
| `pk_shop` | `taro` (shop `ventworks`) |
| `pk_smithy` | `sella` at `anvil` (shop `pk_smithy`), `garrick_e` then `garrick_n` at `forge` (two records, same spot, mutually exclusive) |
| `pk_bellhouse` | `ilya` at `ilya_spot` |
| `nh_inn` | `wren` walks to `wren_wake` in `ep3_morning` |

---

## 3. Scenes

Music: a scene that changes the track puts the map's track back before it ends (checked by the test), except the
chains `warden_after` and `first_bell` and the ending.

### Act I: Hollowmere

**`ep3_morning`** (`nh_inn`, on enter; also on enter of `nameless_hollow` for saves that left the inn; needs
`ep2_complete`, not `ep3_morning_done`, and `EP3_LIVE`). The hero wakes in bed at `inn_bed`, Mira and Bram are
followers in the room, Wren behind the counter. The Smith is spawned at `smith_seat` by the hearth (facing left); Wren
walks to `wren_wake` and wakes the hero; the camera pans to `smith_seat`; Bram walks up to the Smith. One choice; the
hero's answer box is always "...". At the end the Smith walks out through `inn_door` and is despawned. Music: `sorrow`
when Bram cannot say the name, `hollowmere` at the end. 14 boxes. Sets `ep3_morning_done` and `ep3_started`.

**`sand_gate`** (`nameless_hollow`, step trigger two tiles west of the chain; needs `ep3_started`, not
`sand_gate_open`, `EP3_LIVE`). Spawns Vessa (`vessa_gate`), Penny's cart with Penny and the Smith (`penny_cart_h`); the
camera pans to the arch (`sand_gate`); Vessa walks to the chain, `door_unlock`, the chain drops. Gives 3 Quench Flasks.
The Smith climbs onto the cart. Everyone despawns. Map music (`hollowmere`). 9 boxes. Sets `sand_gate_open`.

### Act II: The Old Sand Road

**`sand_road_arrival`** (`sand_road`, on enter). Banner "The Old Sand Road / Into the Ash Hills". No marks. 4 boxes.
Sets `sand_road_arrived`.

**`sand_first_fight`** (`sand_road`, step column `first_fight_trig`). The group `e_sr_first` (a Cinder Hound and a Cinder
Beetle; a chase enemy at the bend) runs at the hero. Battle `sr_first`, no flee. The beetle's first move is always
Stoke (E3-battle). No tutorial box. A loss sets nothing. Camera: pan to the enemy 40 frames, then follow the hero.
5 boxes. Sets `sand_first_fight_done`.

**`slag_crossing`** (`sand_road`, step trigger `slag_trig` at the tongue of slag). Camera pans to `slag` (the slag, the
trough, the paddle `sl_road` all in frame). 3 boxes. The first crust plays the bark `first_quench`. Sets `saw_slag`.

**`carters_rest`** (`sand_road`, campfire object `carters_fire`, `safe`, `rest`). First visit spawns the Smith at
`smith_crate` (seated), one choice of three, despawns him; later visits are one box. The field runs the rest flow
afterwards. Music: the map track, softer (volume 0.6, the field's rest handling). Sets `carters_rested`.

**`ash_view`** (`sand_road`, step trigger on the last rise). Spawns the Smith at `rise_smith`; the camera pans to
`emberpeak_far` (the silhouette decal) 60 frames; music `mystery`, then back to `ash_road`; the Smith walks to
`town_gate` and despawns. 4 boxes. Sets `saw_emberpeak`.

### Act III: Emberpeak

**`pk_arrival`** (`emberpeak`, on first enter). Banner "Emberpeak / Bellows Square". Spawns the Smith at `gate_smith`;
camera 30 frames to `gate_in`; Rusk (NPC, at the gate) faces the hero, then the Smith; at the end the Smith walks ahead
to `memorial` and despawns. 7 boxes. Sets `pk_arrived`.

**`veyra_square`** (`emberpeak`, step trigger `veyra_trig` beside the coolant station). Camera pans to `coolant`; Veyra
(NPC) faces the hero, then Bram. 9 boxes. Sets `met_veyra`.

**`memorial_wall`** (`emberpeak`, object `memorial`). First look: the Smith is spawned at `memorial_smith`, music
`sorrow`, camera pans to `memorial`, he walks to the wall; at the end music back to `emberpeak` and he walks to
`bellhouse_door` and despawns. Later looks are one box by state (`memorial` has three states). 7 boxes the first time.
Sets `saw_memorial`.

**`ilya_bellhouse`** (`pk_bellhouse`, step trigger `ilya_trig` two tiles inside the door). The Smith is spawned at
`bellhouse_in`; Ilya (NPC) faces the hero; camera pans to `ilya_spot`; at the end he walks to `bellhouse_door` and
despawns. Gives `lift_key` (display name must not carry the founder's name). 10 boxes. Sets `met_ilya`, `foundry_open`.

**`garrick_forge`** (`pk_smithy`, `garrick_e` talk entry). Sella (NPC at `anvil`) faces `garrick_e`. 8 boxes. Sets `forge_relit`.

### Act IV: The Ashen Foundry

**`foundry_gate`** (`emberpeak`, gate object `foundry_door`, needs `lift_key`). `door_unlock`, `lift_rumble`. 2 boxes.
Sets `foundry_entered`.

**`foundry_f1_arrival`** (`foundry_f1`, on enter). Banner "The Ashen Foundry / I. The Cinder Liftworks". 5 boxes. Sets
`foundry_f1_arrived`.

**`bram_memory_1`** (`foundry_f1`, step trigger `shaft_trig`). Camera pans to `shaft`; music `sorrow`, `bell_first`, tint
`dawn`; spawns `bram_m` (the `bram` sprite, "Bram") at `shaft_bram` and `foreman_m` (the guard sprite, "Foreman") at
`shaft_foreman`; despawned before the party speaks again; tint `none`; music back to `foundry`. 8 boxes. Sets `bram_memory_1`.

**`liftworks_lift`** (`foundry_f1`, basin `bs_wheel`'s script, first fill). `water_flow`, camera pans to `wheel`,
`wheel_turn`, `lift_rumble`, shake, camera pans to `lift_down`. 2 boxes. Sets `lift_wheel_lit` and `lift_wheel_seen`.

**`foundry_f1_lift`** (`foundry_f1`, step trigger on the lift gate once the wheel turns). Silent. Sets `foundry_f1_done`.

**`foundry_f2_arrival`** (`foundry_f2`, on enter). Banner "II. The Ventilation Galleries". 3 boxes. Sets `foundry_f2_arrived`.

**`bram_memory_2`** (`foundry_f2`, step trigger `bell_trig2` under the unstruck bell). Camera pans to `bell`; music
`sorrow`, `bell_first`, back to `foundry`. 5 boxes. Sets `bram_memory_2`.

**`bellows_specter`** (`foundry_f2`, arena trigger `specter_trig`). Music silence, camera pans to `specter_spot` 40
frames, two boxes, Mira's tip, card THE BELLOWS SPECTER / Breath of the Foundry, shake, flash, `battle`, battle
`bellows_specter` (boss, no flee), then the fans wind down, one line, music back to `foundry`. A retry plays only Mira's
tip and the card. 5 boxes first time. Sets `bellows_specter_tried`, `bellows_specter_defeated`.

**`foundry_f2_shaft`** (`foundry_f2`, step trigger on the stair under the great fan). Silent. Sets `foundry_f2_done`.

**`ledger_ash`** (`foundry_f2`, object `ledger_obj`, `lantern: true`; side quest What the Ash Kept). `lantern_reveal`,
the cache chest appears. 6 boxes. Sets `ledger_found`.

**`foundry_f3_arrival`** (`foundry_f3`, on enter). Banner "III. The Heartforge Crucible". Camera pans to `hub` 40
frames. Music: the map track `mystery`. 3 boxes. Sets `foundry_f3_arrived`.

**`vex_furnace`** (`foundry_f3`, step trigger `vex_trig` at the hottest furnace mouth). Music silence, `furnace_roar`,
camera pans to `furnace_mouth`, Vex is spawned on the ledge inside the furnace (`vex_ledge`, an alcove above the fire,
visible through the flames), music `mystery`; the feather prop (`vex_feather`) lies at his feet. He turns to Bram, then
to the hero. Gives `struck_list`. He vanishes in a flash; the feather stays. 11 boxes. Sets `vex_furnace_met`.

**`oath_hand`**, **`oath_heart`**, **`oath_home`** (`foundry_f3`, anvil objects `anvil_hand`, `anvil_heart`, `anvil_home`).
`anvil_strike`, `bell_first`, one narration, one line from A Voice (home also Bram). The third one adds a box: the
Bell Gate has woken. Each sets its own flag. No music change. 3, 3 and 4 boxes.

**`bram_memory_3`** (`foundry_f3`, step trigger at `gate_spot` once all three oaths are struck; if the third oath was
struck in a wing, it runs on the party's next arrival at `gate_spot`). Music silence, `bell_first`, shake, Bram walks to
`gate_spot` and faces up, music `sorrow`, he reads the stamp on the inner face of the Bell Gate. Learns Tempered Oath.
Music `mystery` at the end. 9 boxes. Sets `bram_memory_3`, `mara_read`, `bell_gate_open`.

### Act V: The Cinder Warden

**`cinder_warden`** (`foundry_heart`, step trigger row `warden_trig`). The Warden is the map actor `cinder_warden`. Music
silence, camera pans to `warden` 40 frames, narration, three capital lines, one choice, Bram's answer, Mira's tip, card
THE CINDER WARDEN / Keeper of the Heartforge, shake, flash, `boss_warden`, battle `cinder_warden` (boss, no flee). A win
calls `warden_after`. A retry plays only the stirring, Mira's tip and the card. 7 boxes. Sets `cinder_warden_tried`.

**`warden_after`** (`foundry_heart`, after the win; also runnable on its own from an enter trigger after a reload).
The Warden kneels (`boss_die`, shake, flash, music `sorrow`). The Smith, Ilya and Sella arrive: spawned at
`garrick_enter` as `smith_t`, `ilya_t`, `sella_t`, they walk to `party_stop`; the camera pans to `leaf_spot`. The Smith
walks to `garrick_anvil` and Bram to `bram_anvil`; three `anvil_strike`, a long white flash, music `triumph`, the
letters rise (`name_restore`). Under a second `name_restore` flash `smith_t` becomes `garrick_t` ("Garrick") on the same
tile. Music `mystery` for the hero's stamp, then `first_bell` for the hammer. 22 boxes. Gives `name_fragment_3` and
`first_bell_hammer`. Sets `clapper_get`, `leaf_get`, `mara_named`, `garrick_named`, `cinder_warden_defeated`.

### Act VI: The First Bell

**`first_bell`** (`emberpeak`, on enter by the lift `lift_heart_up` after `warden_after`). Music silence. Spawns Garrick
at `gather_garrick`, Ilya at `gather_ilya`, Bess at `crowd_d`, four townsfolk at `crowd_a` to `crowd_d`. Camera pans
to `bell_tower`; Bram walks to `bell_rope`; `bell_first` three times; music `first_bell`; the tint lifts; the camera
pans to `memorial` (the plates fill); Veyra, Rusk and Bess walk to `gather_veyra`, `gather_rusk`, `gather_bess`. 13 boxes.
Sets `first_bell_rung` and `pk_restored`, then chains `ep3_ending`.

**`ep3_ending`** (`emberpeak` at night, straight after). Fade out, tint `night`, music silence, camera on `night_view`.
The courier is spawned at `east_road` and walks to `bell_tower`. Garrick is spawned at `gather_garrick`. `bell_first`
once, softly; music `mystery` on "Under water."; fade out; two title cards (`END_CARD_EP3` and the Episode 4 card text
`EPISODE4_CARD`). 11 boxes. Sets `ep3_complete`.

### Side quests

**`coolant_start`** (`emberpeak`, Veyra's talk entry once `met_ilya`). 4 boxes. Sets `coolant_started`.
**`testimony_ilya`** (`pk_bellhouse`, Ilya's talk entry), **`testimony_harl`** (`emberpeak`, Harl), **`testimony_sella`**
(`pk_smithy`, Sella; she faces Bram): 3, 3 and 4 boxes. Set `testimony_ilya`, `testimony_harl`, `testimony_sella`.
**`coolant_check`** (`emberpeak`, object `coolant_obj`, step trigger beside it is `veyra_trig`). Before the three
testimonies: a hint. After: `quench_hiss`, 3 Quench Flasks and the Ashwalker Mantle. Sets `coolant_done` (+25 Fury at
the start of the Warden fight, encounter option `startFury`).
**`vessa_sand`** (`nh_smithy`, Vessa's talk entry once `sand_gate_open`). Three states: ask,
remind, deliver (takes `glass_sand`, gives `emberglass_charm`). Sets `sand_started`, then `sand_done`.

---

## 4. Marks and named events checklist (mirrors `docs/EPISODE3_PLAN.md` 4.8, plus the marks this script added)

| Map | Marks the script uses |
|---|---|
| `nh_inn` | `inn_bed` (exists), `smith_seat` (new, by the hearth), `wren_wake` (new, beside the bed), `inn_door` (new, the door) |
| `nameless_hollow` | `sand_gate`, `vessa_gate`, `penny_cart_h` |
| `sand_road` | `slag`, `emberpeak_far`, `town_gate`, `smith_crate` (new, a crate at the shelter), `rise_smith` (new, a tile on the last rise); enemy `e_sr_first` |
| `emberpeak` | `gate_in`, `gate_smith` (new, one tile inside the gate), `coolant`, `memorial`, `memorial_smith` (new, beside the wall), `bellhouse_door`, `bell_tower`, `bell_rope`, `east_road`, `night_view`, `crowd_a`, `crowd_b`, `crowd_c`, `crowd_d`, `gather_veyra`, `gather_ilya`, `gather_rusk`, `gather_bess`, `gather_garrick` (new) |
| `pk_bellhouse` | `ilya_spot`, `bellhouse_in` (new, two tiles inside the door) |
| `foundry_f1` | `shaft`, `shaft_bram` (new), `shaft_foreman` (new), `wheel`, `lift_down` |
| `foundry_f2` | `bell`, `specter_spot` |
| `foundry_f3` | `hub`, `gate_spot`, `furnace_mouth`, `vex_ledge` |
| `foundry_heart` | `warden`, `party_stop`, `garrick_enter`, `garrick_anvil`, `bram_anvil`, `leaf_spot` |

Map-local events named by the script: triggers `first_fight_trig`, `slag_trig`, `veyra_trig`, `ilya_trig`, `shaft_trig`,
`bell_trig2`, `specter_trig`, `vex_trig`, `warden_trig`, `sand_gate_trig`; objects `carters_fire`, `memorial`,
`coolant_obj`, `foundry_door`, `ledger_obj`, `anvil_hand`, `anvil_heart`, `anvil_home`; basin `bs_wheel`.

## 5. Inspect line ids (all in `ep3.js` `lines`)

Hollowmere and Willowmere: `sand_chain`, `smithy_gone_east`, `pk_mirror`. Sand road: `sand_milestone`,
`sand_milestone_ink`, `sand_hopper`, `east_road_sign`, `emberpeak_far`. The quench kit: `trough_dry`, `trough_wet`,
`sluice_paddle`, `spout_wall`, `spout_cistern`, `basin_empty`, `basin_full`, `waterwheel`, `slag_pool`, `slag_crust`,
`hot_grate_shut`, `hot_grate_open`, `ore_crate`, `font_cistern`. Emberpeak: `memorial` (three states), `smelter_proclamation` (the board in the square),
`silent_bell`, `coolant_station`, `safety_board`, `fire_pit`, `sign_pk_inn`, `sign_pk_shop`, `sign_pk_smithy`,
`sign_pk_bellhouse`, `foundry_door`, `stew_pots`, `bell_molds`, `practice_bell`, `founder_bench`, `forge_cold`,
`forge_lit`. Foundry F1 and F2: `records_cage`, `ledger_burned`, `fan_great`, `bellows_decor`, `bell_unstruck`,
`ore_lift`. Foundry F3 and the Heartforge: `proclamation_gate`, `bell_gate`, `anvil_hand`, `anvil_heart`, `anvil_home`,
`heart_anvil`, `vex_feather`, `steel_leaf`, `heartforge`, `tool_rack`.

Event ids and line ids may coincide (`memorial`, `foundry_door`, `anvil_*`, `emberpeak_far`): the event shows the line of
the same id unless the map gives it `text`.
