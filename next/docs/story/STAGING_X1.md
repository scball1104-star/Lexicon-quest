# Episode 1 expansion staging guide: The Wider Valley

For the map owners (X1-maps-west, -south, -north, -wild, -hub), the world owner (X1-world), the audio owner and the
integrator. For every scripted scene in `src/data/x1/story.js` it says: which map, what starts it, who stands where, the
marks it needs, what the camera does and which music plays. Dialogue is not repeated here; read the scene. Same shape as
`STAGING.md` (Episode 1), `STAGING_EP2.md` and `STAGING_EP3.md`. Map layouts and the marks checklist: `docs/EXPANSION1_PLAN.md`
section 4 (4.11 is mirrored in section 4 below).

Owner: X1-story. `qa/content/x1_story.test.mjs` checks that every scene, every mark a scene walks to, pans to or spawns at, and
every Names-to-confirm entry appears in this file, and that every mark named here is in the plan's checklist. Keep it in
step with the script.

---

## 1. Cutscene API and the rules of this expansion

Exactly the Episode 1 API (`STAGING.md` section 1). What matters more here:

- **Registration, not edits.** Every X1 module exports `register()`; nothing edits `quests.js`, `npcs.js`, `text.js`,
  `story.js` of `src/data/` or `src/game/`. The pack entry (`src/data/x1/index.js`) calls them in the order
  flags, enemies, items, loot, encounters, shops, npcs, quests, text, story.
- **One function, several ids.** A scene cannot be told which event started it, so the three scenes the plan calls
  `stray_found`, `star_read` and `crate_delivered` are registered once per sheep, mark and receiver:
  `stray_found_1` to `stray_found_5`, `star_read_1` to `star_read_3`, `crate_delivered_1` to `crate_delivered_3`. That is
  42 designs and 50 scene ids. The numbers match the flags (`stray_N_found`, `star_N_read`, `crate_N_done`).
- **Guards.** `SCENE_CONDITIONS` in `story.js`; the wrapper also needs `x1On(region)` (live.js: the switch, the region, the
  loaded pack). Regions: `west` (Downs, Thornfold, Loom House, Barrow, the Willowmere gate and the quest scenes in town),
  `north` (cleft, Terrace, Orrery, Cellar, the two valley star marks), `south` (Millrace, Mill, Culvert, Hal's request),
  `wild` (High Moor, Larchhill, the Watchtower mark). `SCENE_REGION` in `story.js` is the table.
- **Object-run scenes never stay silent.** `rollcall_stones`, `cellar_note`, `list_ledger`, `star_read_N` and `pin_place` have a
  one-box fallback when the player is early or has already finished, so an object never does nothing.
- **Chains.** `reeve_intro` plays the intro, the name card and the battle, then calls `reeve_after` on a win (also a scene of
  its own, guarded by `reeve_after_done`, for a reload). `golem_intro` calls `golem_after` the same way (`golem_after_done`).
  `pin_place` calls `mill_done` after setting `mill_turning`. `mill_done` is also a scene of its own for a reload.
- **Boss flags are set by the encounters**, not by a scene: `barrow_reeve_defeated` and `millstone_golem_defeated`.
- **Quest EXP** is `await s.give('exp', n)` in the closing scene, after the done flag is set, once (section 6).
- **No explanations.** Nobody says the names are being erased. Strays, the roll, the sampler and the Reeve show a count that
  will not come out.
- **Tints.** None. **Music**: a scene that changes the track puts the map's track back before it ends (checked by the test).
  `rollcall_stones` goes to `sorrow` and back to `the_downs`; `orrery_align` to `mystery` and back to `orrery`; the two
  boss intros go to `boss_reeve` and `boss_millstone`, and the aftermath returns to `wethers_barrow` and `mystery`.

## 2. Map conventions the story needs

Everything in `STAGING.md` section 2 holds: `marks`, NPC events whose id equals the NPC id, `{ type: 'trigger', script }`,
`{ type: 'object', script }`, `{ type: 'sign', text: '<lineId>' }` (ids in section 5), books from `BOOKS`.

### Flag-driven presence and visuals the script relies on

| Flag | What changes (owner) |
|---|---|
| `strays_started` and not `stray_N_found` | `stray_N` is on its map (`npcs.js` `show`, done). `stray_4` is in the valley pasture (hub). |
| `strays_done` | five more ambient sheep join the two fold sheep (X1-maps-west; plain decor with a flag). |
| `stones_lettered` | the twelve menhirs draw lettered; the sampler in the loom house reads dark; the Barrow's niches stay as they are. |
| `reeve_named` | the thirteenth slab (`blank_stone`) draws lettered. |
| `barrow_reeve_defeated` | the Reeve's map actor is gone; the hall chest and `barrow_names` appear (X1-maps-west). |
| `archivore_defeated` | the Thornfold sign letters return; the mill door opens (it is barred before, `x1_mill_barred`). |
| `archive_f1_done` | the Drovers' chain lies in the road; the south track opens; the fallen oak is gone (hub, west, south). |
| `yarrow_met` | the hay chute gate opens. |
| `mill_turning` | the wheel draws turning. `mill_done`: four rolls on the mill windowsill and the flour table reads settled. |
| `orrery_aligned` | the Orrery draws lit; the hatch becomes a stair to the Cellar. |
| `pell_stamp` | Willowmere Goods lists every item a tenth cheaper (X1-battle shops). |
| `crates_started` | the three receivers answer with `crate_delivered_N`. |

### NPC placement (events, id = NPC id; `spot` in `npcs.js` says where)

| Map | NPCs |
|---|---|
| `x1_downs` | `brindle` (fold gate), `stray_1`, `stray_2`, `stray_3`, `stray_5`, `fold_sheep_a`, `fold_sheep_b` |
| `valley` | `stray_4` (pasture, `if: strays_started`) |
| `x1_loomhouse` | `tamsin` (shop `thornfold_loom`) |
| `x1_orrery` | `hesper` |
| `x1_millrace` | `ferrick` (shop `millrace_stall`) |
| `x1_highmoor` | `odo` |
| `x1_larchhill` | `yarrow` |
| `bakery`, `library`, `item_shop`, `valley` | the existing `hal`, `oren`, `iris`, `pell`, `quill` (talk entries prepended) |

---

## 3. Scenes

Each entry: map and trigger, who stands where, marks, camera, music, boxes, flags. "Boxes" are the most any one path says.

### Shepherd's Downs and Thornfold (west)

### `downs_arrival`
- Map: `x1_downs`, on enter (first time). Needs not `downs_arrived`.
- Marks: `thornfold`. Camera: pan to `thornfold` 50 frames, back to the hero. Music: the map's `the_downs`.
- Boxes: 3. Sets `downs_arrived`.

### `thornfold_arrival`
- Map: `x1_downs`, step trigger at the hamlet's edge. Brindle stands at the fold gate.
- Marks: `fold_gate`. Camera: pan to `fold_gate` 40 frames, back. Music: `the_downs`.
- Boxes: 4. Sets `thornfold_arrived`.

### `brindle_strays`
- Map: `x1_downs`, Brindle's talk entry (not `strays_started`). Brindle faces the hero.
- Marks: none. Camera: none. Music: `the_downs`.
- Boxes: 5. Sets `strays_started`.

### `stray_found_1` to `stray_found_5`
- Map: `x1_downs` for 1, 2, 3, 5; `valley` for 4. A stray sheep's talk entry; the sheep despawns, its flag hides it.
- Marks: none. Camera: none. SFX `sheep_baa`. Music: the map's.
- Boxes: 1 each. Sets `stray_N_found`.

### `strays_done`
- Map: `x1_downs`, Brindle's talk entry with all five found.
- Marks: none. Camera: none. Music: `the_downs`.
- Boxes: 5. Gives `fold_mantle`, 100 gold, 8 EXP. Sets `strays_done`.

### `stones_arrival`
- Map: `x1_downs`, step trigger on stepping into the ring.
- Marks: `stones_center`. Camera: pan to `stones_center` 50 frames, back. Music: `the_downs`.
- Boxes: 3. Sets `stones_seen`.

### `rollcall_start`
- Map: `x1_downs`, Brindle's talk entry (`stones_seen`, not `rollcall_started`).
- Marks: none. Camera: none. Music: `the_downs`.
- Boxes: 5. Sets `rollcall_started`.

### `iris_roll`
- Map: `library`, Iris's talk entry (`rollcall_started`, not `roll_found`). Iris faces the hero.
- Marks: none. Camera: none. Music: the map's.
- Boxes: 4. Gives `burial_roll`. Sets `roll_found`.

### `quill_copy`
- Map: `valley`, Quill's talk entry (`rollcall_started`, not `copy_found`). Quill stands at the Pilgrim's Rest.
- Marks: none. Camera: none. Music: the map's.
- Boxes: 3. Gives `quill_copy`. Sets `copy_found`.

### `rollcall_stones`
- Map: `x1_downs`, the stones object at `stones_center` (an `object` with `script`). The hero walks the ring; Mira holds the roll, Bram the copy.
- Marks: `stones_center`, `ring_n`, `ring_e`, `ring_s`, `ring_w`. Camera: pan to `stones_center` 40 frames, back to the hero at the end.
- Music: `sorrow`, then back to `the_downs`. SFX `stone_name` after each group, `name_restore` at the end.
- Boxes: 11 (the same count when the Reeve is already down: the missing beat plays here and sets `reeve_named`; 1 box when early or finished).
- Sets `stones_lettered`.

### The Wethers' Barrow (west)

### `barrow_entry`
- Map: `x1_barrow`, on enter. Marks: none. Camera: none. Music: the map's `wethers_barrow`. Boxes: 3. Sets `barrow_entered`.

### `reeve_intro`
- Map: `x1_barrow`, the trigger row `reeve_trig`. The Reeve (`barrow_reeve`, map actor) stands at `reeve_spot` before the niches.
- Marks: `reeve_spot`. Camera: pan to `reeve_spot` 40 frames. Music: silence, then `boss_reeve` for the battle.
- Boxes: 4 (2 on a retry; the variant differs on `stones_lettered`; the last is always Mira naming the weakness, bows and light, W7). Then name card THE BARROW REEVE, the battle `barrow_reeve`, and `reeve_after` on a win. 9 boxes with the chain. Sets `reeve_met`.

### `reeve_after`
- Map: `x1_barrow`, chained from `reeve_intro` (also a scene of its own for a reload). The Reeve is despawned.
- Marks: `reeve_spot`. Camera: pan to `reeve_spot` 20 frames, back. Music: silence, then back to `wethers_barrow`.
- Boxes: 5. With the stones lettered Mira says the Reeve's name and the thirteenth niche takes its letters (sets `reeve_named`); without them the Reeve falls still counting and Mira points at the stones. Sets `reeve_after_done`.

### `rollcall_done`
- Map: `x1_downs`, Brindle's talk entry once the Reeve is named (`reeve_named`, not `rollcall_done`).
- Marks: none. Camera: none. Music: `the_downs`.
- Boxes: 3. Gives `rollcall_charm`, 12 EXP. Sets `rollcall_done`.

### The Keepers' Terrace, the Orrery and the Cellar (north)

### `cleft_hint`
- Map: `valley`, the once-only trigger `x1_cleft_trig` at the cleft (needs `lantern_get`).
- Marks: `cleft`. Camera: pan to `cleft` 50 frames, back. Music: the map's.
- Boxes: 2. Sets `cleft_seen`.

### `terrace_arrival`
- Map: `x1_terrace`, on enter.
- Marks: `court`. Camera: pan to `court` 60 frames, back. Music: `orrery`.
- Boxes: 3. Sets `terrace_arrived`.

### `hesper_meet`
- Map: `x1_orrery`, on enter (not `stars_started`). Hesper stands at the telescope.
- Marks: `orrery`. Camera: pan to `orrery` 40 frames, back. Music: `orrery`.
- Boxes: 6. Sets `stars_started`.

### `star_read_1`, `star_read_2`, `star_read_3`
- Maps: `valley` (1 the milestone's back, mark event `x1_star_mark_milestone`; 2 the Archive door's carving, `x1_star_mark_door`),
  `x1_highmoor` (3 the Watchtower base, `x1_star_mark_tower`). Each is a Lantern object with `if: stars_started`.
- Marks: none (the player stands at the mark). Camera: none. SFX `star_chime`, a green flash. Music: the map's.
- Boxes: 2 each (1 when read again). Sets `star_N_read`. The last mark read says "that is all three".

### `orrery_align`
- Map: `x1_orrery`, Hesper's talk entry (all three marks read, not `orrery_aligned`).
- Marks: `orrery`, `hatch`. Camera: pan to `orrery`, then `hatch`, back. Music: `mystery`, then `orrery`.
- Boxes: 8. Sets `orrery_aligned` (the hatch opens).

### `cellar_entry`
- Map: `x1_cellar`, on enter. Marks: none. Music: `orrery`. Boxes: 3. Sets `cellar_entered`.

### `cellar_note`
- Map: `x1_cellar`, the note object on the dais. Marks: none. Camera: none. Music: `orrery`.
- Boxes: 6 (1 when read again). Sets `stars_done`, 8 EXP. The gold chest `chest_cl_chart` (`star_chart`) is a map chest.

### Pell's Crates (Willowmere, Thornfold, Larchhill, the Millrace)

### `crates_start`
- Map: `item_shop`, Pell's talk entry (needs `archivore_defeated`, not `crates_started`).
- Marks: none. Camera: none. Music: the map's.
- Boxes: 4. Gives three `pell_crate`. Sets `crates_started`.

### `crate_delivered_1`, `crate_delivered_2`, `crate_delivered_3`
- Maps: `x1_loomhouse` (Tamsin), `x1_larchhill` (Yarrow), `x1_millrace` (Ferrick). The receiver's talk entry (`crates_started`, not `crate_N_done`).
- Marks: none. Camera: none. Music: the map's.
- Boxes: 2 each. Takes one `pell_crate`. Sets `crate_N_done`.

### `crates_done`
- Map: `item_shop`, Pell's talk entry with all three delivered.
- Marks: none. Camera: none. Music: the map's.
- Boxes: 4. Gives `drover_boots`, sets `pell_stamp`, 6 EXP. Sets `crates_done`.

### Four Rolls for the Miller (the Millrace, the Culvert, the mill)

### `mill_start`
- Map: `bakery`, Hal's talk entry (needs `archivore_defeated`, `hal_returned`, `millrace_arrived`, not `mill_started`). Oren is at the counter.
- Marks: none. Camera: none. Music: the map's. Hal's lines before the Archivore stay the bakery's.
- Boxes: 6. Sets `mill_started`.

### `millrace_arrival`
- Map: `x1_millrace`, on enter.
- Marks: `wheel`. Camera: pan to `wheel` 50 frames, back. Music: `millrace`.
- Boxes: 3. Sets `millrace_arrived`.

### `ferrick_meet`
- Map: `x1_millrace`, Ferrick's talk entry (not `ferrick_met`). Ferrick faces the hero.
- Marks: none. Camera: none. Music: `millrace`.
- Boxes: 6. Sets `ferrick_met`.

### `culvert_entry`
- Map: `x1_culvert`, on enter. Marks: none. Music: `mystery`. Boxes: 2. Sets `culvert_entered`.

### `golem_intro`
- Map: `x1_culvert`, the trigger row `golem_trig`. The Golem (`millstone_golem`, map actor) stands at `golem_spot`.
- Marks: `golem_spot`. Camera: pan to `golem_spot` 40 frames. Music: silence, then `boss_millstone` for the battle.
- Boxes: 4 (2 on a retry; the last is always Mira naming the weakness, thunder and axe, W7). Then name card MILLSTONE GOLEM, the battle `millstone_golem`, and `golem_after` on a win. 8 boxes with the chain. Sets `golem_met`.

### `golem_after`
- Map: `x1_culvert`, chained (also a scene of its own for a reload). The Golem is despawned.
- Marks: `golem_spot`. Camera: pan to `golem_spot` 20 frames, back. Music: silence, then back to `mystery`.
- Boxes: 4 (the last depends on `pin_found`). Sets `golem_after_done`.

### `pin_place`
- Map: `x1_millrace`, the wheel object `x1_mill_wheel` (`script`). Needs `pin_found` and `mill_started`; otherwise one box.
- Marks: `wheel`, `pin_socket`. Camera: pan to `wheel` 40 frames. The hero walks to `pin_socket`. SFX `wheel_groan`, a shake. Music: `millrace`.
- Boxes: 4, then it calls `mill_done` (14 boxes together, the plan's figure). Takes `millstone_pin`. Sets `mill_turning`.

### `mill_done`
- Map: `x1_millrace`, chained from `pin_place` (also a scene of its own for a reload). Hal (`hal_m`, sprite `npc_farmer`) and Oren
  (`oren_m`, sprite `npc_baker`) are spawned at `valley_gate`, walk together to `mill_door`, talk, and go in (despawned).
- Marks: `valley_gate`, `mill_door`. Camera: pan to `valley_gate` 40 frames, then to `mill_door` 30. Music: `millrace`.
- Boxes: 10. Gives 8 `honey_roll`, 200 gold, 12 EXP. Sets `mill_done`. The map then shows four rolls on the mill windowsill.

### Things Not To Forget (the library and three places)

### `list_start`
- Map: `library`, Iris's talk entry (needs `archivore_defeated`, `mira_joined`, `downs_arrived`, not `list_started`).
- Marks: none. Camera: none. Music: the map's.
- Boxes: 4. Sets `list_started`.

### `list_rhyme`
- Map: `x1_downs`, Brindle's talk entry (`list_started`, not `list_rhyme`). Marks: none. Music: `the_downs`. Boxes: 2. Sets `list_rhyme`.

### `list_ledger`
- Map: `x1_mill`, the ledger object `mill_ledger_obj` (a `book` that also runs this scene). Marks: none. Music: `millrace`.
- Boxes: 2 (1 when read again or early). Sets `list_ledger` while `list_started`.

### `list_song`
- Map: `x1_highmoor`, Odo's talk entry (`list_started`, not `list_song`). Marks: none. Music: `high_moor`. Boxes: 2. Sets `list_song`.

### `list_done`
- Map: `library`, Iris's talk entry with all three remembrances.
- Marks: none. Camera: none. Music: the map's.
- Boxes: 4. Gives 3 `ether`, 200 gold, 8 EXP. Sets `list_done`.

### The High Moor and Larchhill (wild)

### `moor_arrival`
- Map: `x1_highmoor`, on enter.
- Marks: `tower`. Camera: pan to `tower` 60 frames, back. Music: `high_moor`.
- Boxes: 3. Sets `moor_arrived`.

### `odo_meet`
- Map: `x1_highmoor`, Odo's talk entry (not `odo_met`). Marks: none. Music: `high_moor`. Boxes: 5. Sets `odo_met`.

### `larchhill_arrival`
- Map: `x1_larchhill`, on enter.
- Marks: `windmill`. Camera: pan to `windmill` 60 frames, back. Music: `larchhill`.
- Boxes: 3. Sets `larchhill_arrived`.

### `yarrow_meet`
- Map: `x1_larchhill`, Yarrow's talk entry (not `yarrow_met`). Marks: none. Music: `larchhill`. Boxes: 4. Sets `yarrow_met` (the hay chute opens).

### `windmill_view`
- Map: `x1_larchhill`, the windmill ladder object `x1_mill_ladder`.
- Marks: `windmill`, `north_gate`, `east_gate`. Camera: pans across the hillside, `windmill` then `north_gate` then `east_gate`, then back. SFX `windmill_creak`. Music: `larchhill`.
- Boxes: 3 the first time, 1 after. Sets `windmill_seen`.

---

## 4. Marks and named events checklist (mirrors plan 4.11; the scenes use only these)

| Map | Marks and named events |
|---|---|
| valley (edit) | marks `downs_gate cleft stair_foot south_track`; events `x1_drovers_gate x1_terrace_stair x1_cleft_trig x1_cleft_sign x1_millrace_door x1_fallen_oak x1_star_mark_milestone x1_star_mark_door x1_far_tower x1_roots_valley x1_chest_roots x1_driftlog x1_chest_sandbar`; NPC `stray_4` |
| willowmere (edit) | mark `west_gate`; events `x1_west_gate x1_orchard_gate x1_wall_crack x1_chest_wall` |
| archive_f1 / f2 / f3 (edit) | `x1_f1_roots x1_chest_f1`; `x1_f2_bridge x1_chest_f2 x1_keeper_note_f2`; `x1_f3_shelf x1_chest_f3` |
| x1_downs | marks `valley_gate town_gate lane signpost thornfold loom_door fold_gate brindle well stones_center ring_n ring_e ring_s ring_w blank_stone barrow_door fold_ruin ridge moor_gate larch_gate drovers drovers_exit`; NPCs `brindle stray_1 stray_2 stray_3 stray_5 fold_sheep_a fold_sheep_b`; events `door_loom door_barrow x1_old_scarecrow chest_ridge x1_crack_fold chest_fold chest_well x1_drovers_chain x1_far_tower x1_far_light`; enemies `e_dn_wolves e_dn_scarab e_dn_pack` |
| x1_loomhouse | marks `tamsin hearth sampler door`; NPC `tamsin`; `thornfold_hearth x1_sampler` |
| x1_highmoor | marks `south_entry chime_1 chime_9 tarn islet tower odo bench view gorse stile terrace_west`; NPC `odo`; `x1_roots_stile x1_roots_gorse chest_moor_cairn chest_moor_view chest_moor_islet chest_moor_gorse x1_star_mark_tower moor_bench`; enemies `e_mo_wolves e_mo_scarabs e_mo_wraiths` |
| x1_larchhill | marks `north_gate windmill ladder apiary yarrow chute barrel aqueduct_end press east_gate hive_stand`; NPC `yarrow`; `x1_cider_barrel x1_crack_press chest_lh_hive chest_lh_press chest_lh_aqueduct x1_mill_ladder x1_hay_chute`; enemies `e_lh_beetles e_lh_wolves e_lh_mixed` |
| x1_barrow | marks `entrance hall_w switch niche ossuary counting plate hearth reeve_spot names reeve_chest`; `block_niche block_c plate_c gate_reeve sw_slab slab_n slab_s chest_bw_landing chest_bw_bow chest_bw_oss chest_bw_reeve barrow_hearth reeve_trig barrow_names`; actor `barrow_reeve`; enemies `e_bw_shades e_bw_mixed` |
| x1_terrace | marks `stair_in stair_door cairn beacon court orrery_door walk_east roots edge moor_gate`; `x1_roots_terrace chest_beacon chest_terrace`; enemies `e_tr_wolves e_tr_golem` |
| x1_orrery | marks `hesper orrery plate hatch door`; NPC `hesper`; `x1_armillary x1_star_plate chest_orrery x1_hatch keeper_star_ledger` |
| x1_cellar | `cellar_font chest_cl_nook chest_cl_chart chest_cl_vault x1_crack_vault cellar_note`; enemy `e_cl_wraiths` |
| x1_millrace | marks `valley_gate drovers_gate signpost mill_door wheel pin_socket weir ferrick jetty larch_gate culvert bank_crack stone`; NPC `ferrick`; `x1_mill_wheel block_stone chest_mr_stone chest_mr_orchard chest_mr_bank x1_crack_bank`; enemies `e_mr_weevils e_mr_wolves` |
| x1_mill | marks `door table ledger stones`; `x1_flour_table mill_ledger_obj` |
| x1_culvert | marks `entrance plate_1 plate_2 gate pump pin_chest hearth golem_spot golem_chest`; `block_b1 block_b2 plate_b1 plate_b2 gate_drain chest_cv_pin chest_cv_drain chest_cv_golem x1_crack_drain culvert_font golem_trig`; actor `millstone_golem`; enemies `e_cv_blots e_cv_wraith` |

### Contracts the maps and the battle agent need from this script

- **Script ids the maps run** (`script:` on a trigger or object, or `scene:` in a talk entry): `downs_arrival`, `thornfold_arrival`,
  `stones_arrival`, `rollcall_stones` (the object at `stones_center`), `barrow_entry`, `reeve_intro` (the row `reeve_trig`),
  `terrace_arrival`, `hesper_meet`, `cellar_entry`, `cellar_note` (the dais object), `culvert_entry`, `golem_intro` (the row `golem_trig`),
  `pin_place` (the wheel `x1_mill_wheel`), `list_ledger` (the ledger `mill_ledger_obj`), `moor_arrival`, `larchhill_arrival`,
  `windmill_view` (the ladder `x1_mill_ladder`), `millrace_arrival`, `cleft_hint` (the trigger `x1_cleft_trig`),
  `star_read_1` (`x1_star_mark_milestone`), `star_read_2` (`x1_star_mark_door`), `star_read_3` (`x1_star_mark_tower`).
  Talk-entry scenes are wired in `src/data/x1/npcs.js` (no map work).
- **Inspect, sign, font and Appraise ids** are in section 5; the event's `text` or `appraiseText` field is that id.
- **Encounter flags** set by the battle: `barrow_reeve_defeated` (encounter `barrow_reeve`) and `millstone_golem_defeated`
  (encounter `millstone_golem`). Boss actors: `barrow_reeve` and `millstone_golem`, speaker names registered by `npcs.js`.
- **Map chest flags the script reads**: `pin_found` (the wood chest `chest_cv_pin` sets it).
- **Spawned actors**: `hal_m`, `oren_m` (sprites `npc_farmer`, `npc_baker`) on `x1_millrace`.

## 5. Inspect, sign, font and Appraise text ids (`src/data/x1/text.js`)

| Id | Used by |
|---|---|
| `x1_drovers_gate`, `x1_cleft_sign`, `x1_fallen_oak` | valley signs and the oak |
| `x1_orchard_gate`, `x1_wall_crack` | Willowmere |
| `downs_signpost`, `thornfold_well`, `thornfold_sign`, `x1_drovers_chain` | Downs signs; the chain (two states) |
| `x1_menhir` | each of the twelve stones, three states (blank, lettered, thirteen) |
| `blank_slab` | the thirteenth slab (`blank_stone`), two states |
| `x1_old_scarecrow`, `appraise_scarecrow` | Patch; the Appraise text |
| `x1_sampler`, `thornfold_hearth` | loom house |
| `barrow_slab_a`, `barrow_hearth`, book `barrow_names` | Barrow |
| `terrace_sign`, `edge_sign` | Terrace |
| `x1_armillary`, `x1_star_plate`, `appraise_star_plate`, `x1_hatch`, book `keeper_star_ledger` | Orrery |
| `cellar_font`, book `cellar_note` | Cellar |
| `millrace_signpost`, `x1_mill_barred`, `x1_mill_wheel`, `x1_weir`, `culvert_font` | Millrace and Culvert |
| `x1_flour_table`, book `mill_ledger` | Mill |
| `moor_sign`, `chime_1` to `chime_9`, `moor_bench`, `x1_watchtower` | High Moor |
| `hill_sign`, `x1_windmill`, `x1_cider_barrel`, `x1_hay_chute` | Larchhill |
| Books `burial_roll`, `x1_keeper_note_f2` | the key item read from the menu; the Archive F2 note |
| Bark `first_appraise_object` | Mira's first Appraise on an object |

## 6. Quest EXP call sites (plan 5.8)

Each quest's closing scene sets the done flag, then calls `await s.give('exp', n)` once. 54 in all.

| Quest | Closing scene | EXP |
|---|---|---|
| Strays of Thornfold | `strays_done` | 8 |
| The Thirteenth Stone | `rollcall_done` | 12 |
| The Dark Stars | `cellar_note` | 8 |
| Pell's Crates | `crates_done` | 6 |
| Four Rolls for the Miller | `mill_done` | 12 |
| Things Not To Forget | `list_done` | 8 |

X1-battle may lower an amount if its ledger breaks the cap of plan 7.2; the amounts live in `REWARDS_X1` (`src/data/x1/quests.js`),
which the scenes read, so a change is one number. The journal's finished entry reads `doneText` ("Complete. +8 EXP.").

## 7. Names to confirm

All placeholders. They live in ONE exported constant, `X1_NAMES_TO_CONFIRM` in `src/data/x1/text.js`; every scene, sign, book
and bestiary line reads it, so Scott's real names are a one-place edit. Rules for a replacement: ASCII, no collision with a named
person of Episodes 1 to 3 or `docs/EXPANSION2_PLAN.md`, no alphabetical pattern, no word game of any kind.

| Item | Placeholder now | Where used |
|---|---|---|
| The Reeve's name | Wystan, Reeve of the Fold | `reeve_after`, `rollcall_stones` (variant), `rollcall_done`, the book `barrow_names`, the bestiary entry |
| Stone 1 | Edric Sallow | `iris_roll`, `rollcall_stones`, `burial_roll`, `barrow_names`, the sampler |
| Stone 2 | Maud Tarrant | same |
| Stone 3 | Gil Penhallow | same |
| Stone 4 | Ysolde Fenn | same |
| Stone 5 | Aubrey Lunt | same |
| Stone 6 | Joss Harrow | same |
| Stone 7 | Perrin Dale | same |
| Stone 8 | Netta Scarth | same |
| Stone 9 | Lowen Locke | same (the last on Iris's roll) |
| Stone 10 | Agnes Brack | `quill_copy`, `rollcall_stones`, `barrow_names` (Quill's copy only) |
| Stone 11 | Ralf Underhill | same |
| Stone 12 | Dorrit Hallam | same (the hero says it) |
| Keeper at the milestone | Calder Wynn, WAY-SETTER | `star_read_1`, `orrery_align` |
| Keeper at the Archive door | Isaura Pike, DOOR-WRIGHT | `star_read_2`, `orrery_align` |
| Keeper at the Watchtower | Brannoch Teal, WATCHER | `star_read_3`, `orrery_align` |
| Odo's chime song | The Nine Posts: "Fifty paces, wind and stone, / nine good words to bring you home." | `list_song`, `list_done` |
| The nine chime-post words | STONE, WIND, WATER, ROAD, HEATH, FIRE, BREAD, NAME, KEPT (the ninth is fixed) | `chime_1` to `chime_9` |

Other proper names introduced by the designer, not placeholders but open to a veto: Brindle, Tamsin, Ferrick, Hesper, Odo,
Yarrow, Patch the scarecrow, Ebba Corley (the oldest name in Hal's ledger), the hamlet Thornfold.
