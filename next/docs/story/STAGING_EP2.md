# Episode 2 staging guide

For map authors (E2-maps), the world/cutscene owner (E2-world), the scene/UI owner (E2-scene-ui) and the
integrator. It says, for every scripted scene in `src/data/story/ep2.js`: which map, what starts it, who stands
where, which props and marks must exist, what the camera does and which music plays. Dialogue is not repeated
here; read the scene. Same shape as `STAGING.md` (Episode 1). Map layouts: `docs/EPISODE2_PLAN.md` section 4.

Owner: E2-story. `qa/content/ep2.test.mjs` checks that every scene, every mark a scene walks to, pans to or spawns
at, and every inspect line id below appears in this file, so keep it in step with the script.

---

## 1. Cutscene API

Exactly the Episode 1 API (`STAGING.md` section 1), plus one W11 primitive. Details that matter more here:

- **`closeup('fountain', opts)` / `closeup(null)`** (W11, `world/closeup.js`). A framed close-up of the Fountain of
  Faces over the field: the water, the sky in it, and whole upright faces (the 48 px portraits) left to right in
  `opts.faces` (default Mira, the hero, Bram). The hero is a blank smudge before `nh_restored` and faint after.
  `opts.strangers` fills the water with the town's faces (`fountain_check`); night (the `night` tint) lays the
  lanterns on the water. It resolves when open or closed; the dialogue window stays at the bottom while it is open,
  and a scene that ends with it open closes it. Close it before anyone walks or the camera pans.

- **Speakers without an actor.** `say(who, ...)` with a `who` that has no actor on the map shows the name from
  `SPEAKER_NAMES` in `npcs.js` and no portrait. The vow memories use this: `king_memory` (The King), `boy_memory`
  (Small Boy), `tovin_memory` (Tovin). Map actors also need a display name there: `nameless_king`, `tovin_c`,
  `elian_t`, `aurel_t` (added).
- **`setFlag(flag, false)`** clears a flag (`garrick_crossing` clears `garrick_at_ford`).
- **Scene guards.** `SCENE_CONDITIONS` in `ep2.js`. Triggers need no `once`; a scene that should not run does nothing.
- **Receptor scripts.** A latched receptor (`rec_lock`, `rec_belonging`, `rec_mercy`, `rec_courage`) runs its
  `script` on first light. The scenes guard on their own `*_seen` flags, so it does not matter whether the receptor
  sets its latch flag before or after the script runs; the scenes also set the latch flag themselves.

## 2. Map conventions the story needs

Everything in `STAGING.md` section 2 holds: `marks: { name: [x, y] }`, NPC events whose id equals the NPC id,
`{ type: 'trigger', script }` with a tile area or `on: 'enter'`, `{ type: 'sign', text: '<lineId>' }` reading
`lines` (Episode 2 ids live in `ep2.js`; `story.js` must merge them), `{ type: 'object', script }`, books from
`BOOKS`, banners from `BANNERS`.

### Flag-driven presence and visuals the script relies on

| Flag | What changes (owner) |
|---|---|
| `garrick_at_ford` | Garrick (smithy) and Hal (bakery) are hidden (`npcs.js` `show`, done). A note event on the smithy door, `{ type: 'sign', text: 'smithy_ford_note', if: 'garrick_at_ford' }` (E2-maps). |
| `crossing_done` | The ford bridge overlays and the `garrick_rail` sign (valley, E2-maps; plan 3). `ford_wrack` becomes passable only via the bridge. |
| `met_elian` | Elian appears at his desk in `nh_hall` (`npcs.js`). Before it the desk shows `elian_desk_note`. |
| `court_ferry_open` | `ferry_court` on the Hollow pier becomes rideable (`rideIf`). |
| `remembrance_open` | The gold chest `chest_remembrance` appears in the F2 south gallery. |
| `black_feather_found` | The object `feather_obj` is gone (`ifNot`). |
| `paper_crown_found` | Chest flag of `chest_crown` (F3 Belonging alcove). |
| `glass_key_f1`, `glass_key_f2` | Chest flags of the two glass-key chests; Talk uses them. |
| `nameless_king_defeated` | The map actor `nameless_king` is gone on reload (`ifNot`). |
| `aurel_named` | Throne room: `mirror_exit` (mirror door to `nameless_hollow` `fountain_out`), map actors `aurel_t` at `kneel` and `elian_t` at `elian_meet` (`ifNot: 'nh_restored'`). On a reload before the restoration they replace the scene spawns `aurel_k` / `elian_k`, standing where those stood. |
| `nh_restored` | The Hollow's lettered sign overlays, clock hands, tint `hollow_dusk` -> none, music `hollow` -> `hollowmere`, banner state "Hollowmere", Aurel by the fountain (`npcs.js`), reflections for every Hollow NPC. The scene sets it mid-way, so overlays must re-render on a flag change (plan 5.5). |
| `mirror_sigil_get` | Keeper mirror doors (plan 5.3), including the Willowmere chapel mirror (`wm_chapel_mirror` text changes too). |
| `ep2_complete` | The integrator rolls `CREDITS_EP2` (text.js) over `hollowmere`, sets counter `credits2_rolled`, wakes the party at `nh_inn` `inn_bed` in day light. |

### NPC placement (events, id = NPC id; `spot` in `npcs.js` says where)

| Map | NPCs |
|---|---|
| `east_road` | `penny_e` at `penny_cart` (shop `east_peddler`) |
| `nameless_hollow` | `corin` (gate), `nico` at `nico_spot`, `sava` (inn porch), `lena` at `clocktower`, `tovin` at `tovin_spot`, `orla` (rune shrine by the pier), `aurel` at `restored_aurel` (only after `nh_restored`) |
| `nh_hall` | `elian` at `elian_desk` |
| `nh_chapel` | `anwen` at `anwen_spot` |
| `nh_inn` | `wren` (inn, 40 gold) |
| `nh_shop` | `fitch` (shop `hollow_items`) |
| `nh_smithy` | `vessa` (shop `hollow_smithy`) |
| `court_f1` | map actor `tovin_c` (sprite `npc_tovin`) at `landing`, `text: 'tovin_landing'` |

Every NPC record on a Hollow map carries `noReflection: true` (read it until `nh_restored`; plan 5.2). Penny and
Aurel have reflections.

---

## 3. Scenes

Music: a scene that changes the track puts the map's track back before it ends (plan 8.3; checked by the test),
except the throne room chain and the ending.

### Act I: Willowmere

**`ep2_morning`** (hero_home, `on: 'enter'`; runs once after `ep1_complete`). The hero in bed, Hazel at
`hazel_start`, Mira and Bram are followers in the room. Hazel walks to `bedside`; the hero steps down. Gives
2 Hi-Potions. One choice. No music change (map track `willowmere`). Sets `ep2_morning_done`.

**`ep2_mael`** (willowmere, Mael's talk entry once `ep1_complete` and not `ep2_started`). Mael at the well. Gives
`mael_letter`. Optional question. Sets `ep2_started` and `garrick_at_ford`.

**`iris_farewell`** (library, Iris's talk entry). Iris at her desk. Sets `iris_farewell_done`.

**`tess_last_route`** (willowmere, Tess's talk entry). Starts The Last Route, and later takes `courier_satchel`
and gives `courier_knot`. Sets `last_route_started`, then `last_route_done`.

**`garrick_crossing`** (valley, step trigger `crossing_trig` two tiles west of the ford). Spawns `garrick_x`
(`npc_smith`) at `crossing_garrick` and `hal_x` (`npc_farmer`) at `crossing_hal`, on the planks. Camera pans to
`ford` (40), follows the hero, who walks up to Garrick; pans to the rail sign event `garrick_rail` (30). Garrick
and Hal walk three tiles west and despawn. Valley music unchanged. Clears `garrick_at_ford`, sets `crossing_done`.

### Act II: The Fading Road (`east_road`)

**`east_road_arrival`** (`on: 'enter'`). Pans to the blank signpost event `east_signpost` (40). Sets `east_road_arrived`.

**`east_first_fight`** (step trigger column `first_fight_trig`, x 6). The chase group `e_road_mixed` (Mist Wolf
leader) runs at the hero; battle `road_mixed`, cannot be fled; despawns on a win. Sets `east_first_fight_done`.

**`old_milestone`** (object `old_milestone`, script). Narration, then once: Mira raises the Lantern
(`lantern_reveal`), nothing appears. Sets `saw_old_milestone`.

**`fading_stretch`** (step trigger at `fog_start`). Pans to the first cairn, mark `cairn_first` (the first `cairn`
prop east of the dirt road). Sets `saw_cairns`.

**`fog_loop`** (step trigger at `fog_return`, where the fog doors land). Once. Sets `fog_looped`. (The same
exchange is `BARKS.fog_loop` if the world system prefers a bark there.)

**`waystation_rest`** (object `waystation_fire`, `safe`, `rest`). One choice of three on the first visit; the
"tune" answer plays `hollow` then returns to `fading_road`. Sets `waystation_rested`.

**`mere_view`** (step trigger on the rise, mark `mere_view`). `mystery`, a slow pan to `court_far` (60), back to
`fading_road`. Sets `saw_court`.

### Act III: The Nameless Hollow

**`nh_arrival`** (nameless_hollow, `on: 'enter'`). `hollow`. Pans to `gate_sign` (40) with Nico chalking at
`nico_spot`; Corin walks from his post to the hero. Sets `nh_arrived`.

**`fountain_faces`** (step ring `fountain_trig` around the fountain). The hero walks to `fountain_view` and faces
up (the fountain is north of it); Mira and Bram step to the basin's sides, `rim_w` and `rim_e`, facing the water.
Close-up on the water for the first narration, and again from Bram's "Yours is... faint" to "Like the name." Sava walks to `crowd_a`. Spawns `nh_crowd_a` (`npc_old_woman`) at `crowd_b`,
`nh_crowd_b` (`npc_farmer`) at `crowd_c`, `nh_crowd_c` (`npc_child_b`) at `crowd_d`, all facing up at the water.
`mystery` on the hero's faint reflection, `hollow` for Elian. Spawns `elian_f` (`npc_elian`) at `elian_from`, who
walks to `meet_elian`, then to `hall_door` and despawns; the crowd despawns. Sets `met_elian`.

**`elian_hall`** (nh_hall, step trigger `hall_trig` two tiles inside the door). The hero walks up to `elian` (at
`elian_desk`). One choice. Takes `mael_letter`. Sets `heard_crisis`.

**`anwen_register`** (nh_chapel, step trigger inside the door). The hero walks to `anwen`. Pans to the lectern
mark `register` (30). `sorrow` from the white line, `hollow` before Anwen sends them to Tovin. Sets `met_anwen`.

**`tovin_ferry`** (nameless_hollow, Tovin's talk entry after `met_anwen`). Mira walks to `pier_end` and faces up
(the mere). `sorrow` as she looks, `hollow` on "Get in the boat." Sets `testimony_tovin`, `court_ferry_open`.

**`satchel_found`** (nh_inn, object `lost_property`, script). Wren speaks from the counter. Gives
`courier_satchel` once; afterwards the shelf narration only. Sets `satchel_found`, `last_route_started`.

**`orla_fountain`**, **`lena_testimony`**, **`anwen_testimony`** (talk entries of Orla, Lena, Anwen). Short;
no movement. Set `fountain_started`, `testimony_lena`, `testimony_anwen`.

**`fountain_check`** (nameless_hollow, object `fountain_obj` on the fountain, script). Plain narration until the
three witnesses have spoken; then the vision (`mystery`, back to `hollow`), gives `merewarden_mantle` and 2
`hi_ether`. Every look is a close-up of the water; the vision fills it with the town's faces (`strangers`). Sets `fountain_done` (the King fight's +25 Fury).

**`nico_crowns`** (Nico's talk entry after `court_entered`). Start, reminder, and the crown scene once
`paper_crown_found`. Sets `nico_crowns_started`, `nico_crowns_done`.

**`elian_letter`** (nh_hall, Elian's talk entry after `nh_restored`). Gives `elian_reply`. Sets `letter_answer_started`.

**`letter_answer`** (willowmere, Mael's talk entry). Takes `elian_reply`, gives 2 Phoenix Feathers. Sets
`letter_answer_done`.

### Act IV: The Court of Mirrors

**`court_crossing`** (court_f1, `on: 'enter'`, first ferry arrival at `start`). `mystery`, `ferry_oars`, pan to
`great_door` (40), Tovin (`tovin_c` at `landing`) faces the hero; `court` at the end. Sets `court_entered`.

**`court_f1_arrival`** (step trigger at the great door). One choice (both answers lead to the same line). Pans to
`b_center` (the skylight beam on `mir_b`; 40). No instruction. Sets `court_f1_arrived`.

**`mira_memory_1`** (step trigger `mira_window_trig` at E's entrance). Pans to `mira_window` (40), `hollow`, back
to `court`. Sets `mira_memory_1`.

**`silverglass_lock`** (receptor `rec_lock` script). `beam_hit`, pans along the beam: `lens_1`, `lens_2`,
`rec_lock` (30 each), `gate_open` and a pan to the stairs gate `lock_gate`. Sets `silverglass_lock_lit`,
`silverglass_lock_seen`.

**`court_f1_stairs`** (step trigger on the tiles before `stairs_down`). Sets `court_f1_done`.

**`court_f2_arrival`** (court_f2, `on: 'enter'`). Sets `court_f2_arrived`.

**`portrait_child`**, **`portrait_keeper`**, **`portrait_king`** (objects at the marks of the same names, script).
Any order; the third one seen plays `gate_open` and sets `remembrance_open` (the cache chest appears). Each sets
`portraits_started` and `portrait_*_seen`.

**`mira_memory_2`** (step trigger `pool_trig`). Pans to `pool` (30), `sorrow`, back to `court`. Sets `mira_memory_2`.

**`vex_mirror`** (step trigger `vex_trig` at the corridor's foot, (2..3,18): W11 moved it from row 13 so the font
sits between Vex and the arena). Silence, pan to `vex_frame` (40, W11: between the corridor's great mirror `vex_mirror`
at its head and the party at its foot, so both are framed above the dialogue window; it replaces `vex_scene`), spawn `vex` (`npc_vex`, name Vex Quill) at `vex_glass`: a tile drawn in front of the mirror
glass (E2-world: draw him as a reflection-only actor if possible, plan 5.2). `mystery`, one choice, flash, despawn,
`court`. Sets `vex_met`.

**`other_selves`** (step trigger `selves_trig` in the arena). Silence, pan to `selves_spot` (40), `reflection_out`;
spawns `refl_mira_f` at `selves_mira`, `refl_bram_f` at `selves_bram`, `refl_hero_f` at `selves_hero` (field
sprites `refl_mira`, `refl_bram`, `refl_hero`), Mira's two tips (the weapon rule and, W11, the Mirrored Combo: push
one back), title card THE OTHER SELVES / Hall of Reflections, battle `other_selves` (boss, no flee). On a win:
`glass_break`, the three despawn, `court`. Sets `other_selves_defeated`. W11: the scene sets `other_selves_tried`
before the card; after a loss the retry skips the reflections' lines and plays only the spawn, Mira's tips and the
card. `nameless_king` does the same with `nameless_king_tried` (he turns, Mira's tip, the card).

**`court_f2_stairs`** (step trigger on the arena's mirror stair). Sets `court_f2_done`.

**`court_f3_arrival`** (court_f3, `on: 'enter'`). `mystery`, pan to `vow_door` (60). Sets `court_f3_arrived`.

**`vow_belonging`**, **`vow_mercy`**, **`vow_courage`** (receptor scripts of `rec_belonging`, `rec_mercy`,
`rec_courage`). `beam_hit`, pan (40) to the vow mirror marks `vow_belonging`, `vow_mercy`, `vow_courage`,
`hollow`, the memory, back to `mystery`. Set the vow flag and `vow_*_seen`.

**`vow_door`** (step trigger on the tile south of the vow door, active once all three vows are lit). Pan to
`vow_door` (40), `crystal_hit`, `gate_open`, `sorrow`, then `mystery`. Sets `mira_memory_3`, `vow_door_open`.
(The door itself opens through the 3-source gate logic; the scene only narrates it.)

**`black_feather`** (object `feather_obj` on the glass bench, script; `ifNot: 'black_feather_found'`). Gives
`black_feather`. Sets `black_feather_found`.

### Act V: The Nameless King (`court_throne`)

**`nameless_king`** (step trigger row `king_trig`). Silence, pan to the map actor `nameless_king` (40), then to
`great_mirror` (40), back (20); the King faces down; one choice; title card THE NAMELESS KING / Keeper of the
Court; `boss_king`; battle `nameless_king` (boss, no flee). A win runs `king_after` inline.

**`king_after`** (inline after the win; also safe as an `on: 'enter'` trigger, it only runs while
`nameless_king_defeated` and not `aurel_named`). Pans to `kneel`; `sorrow`; despawns `nameless_king` and spawns
`aurel_k` (`npc_aurel`, name "The King") at `kneel`. Mira walks to `aurel_k`. Spawns `elian_k` (`npc_elian`) at
`elian_enter` (the south door), who runs to `elian_meet`. Pans to `great_mirror` for the shattering, to
`elian_meet` for "Aurel"; under the name flash `aurel_k` is despawned and `aurel` (`npc_aurel`, name Aurel) spawned on the same `kneel` tile, so the speaker tag changes with the name; `triumph`; to `fragment_spot` for the page (gives `name_fragment_2`); `mystery` for
the hero's name twice; back to `kneel` for the warning (gives `mirror_sigil`); `hollowmere` for the bow (gives
`kept_promise`); a last pan to `great_mirror`. Sets `nameless_king_defeated`, `aurel_named`, `mirror_sigil_get`.

### Act VI: Hollowmere

**`hollowmere_restored`** (nameless_hollow, `on: 'enter'` when arriving through `mirror_exit` at `fountain_out`).
`mirror_step`, flash. Spawns `aurel_g` at `restored_aurel` and `elian_g` at `restored_elian`; the hero walks to
`restored_spot`. `hollowmere`; sets `nh_restored`; tint to `hollow_dawn` (warm gold, W11) over 120 frames. Pans to `gate_sign` (40) and
`fountain` (30), `bell_peal`. Corin runs to `gather_corin`, Lena walks to `gather_lena` (`clock_chime`), Nico runs
to `gather_nico`; spawns `anwen_g` (`npc_anwen`) at `gather_anwen`. Mira walks to `fountain_rim` (the north rim; the
`fountain` mark is inside the basin) and faces down at the water; close-up on her face alone for the narration.
Chains `ep2_ending`.

**`ep2_ending`** (straight after). Fade out; despawns `aurel_g`, `elian_g`, `anwen_g`; tint `night`; silence; camera
cut to `night_view` (lanterns on the mere); fade in. The hero walks to `fountain_view` and faces up, Mira and Bram
to `rim_w` and `rim_e`; close-up (night, lanterns, the hero's face faint) for the reflection line and Mira's reply. Pan to
`emberpeak_glow` (60, the north-east mountains; a red glow decal there at night is welcome). `bell_toll`, "Thirteen",
`mystery`. Title cards "End of Episode 2" and "Episode 3: The Forge of Ash". Sets `ep2_complete`.

---

## 4. Marks and named events checklist (plan 4.8, extended)

| Map | Marks and named events the script uses |
|---|---|
| `hero_home` | `bedside`, `hazel_start` (Episode 1, unchanged) |
| `willowmere` | Mael at the well, Tess, Iris (unchanged); door note event `smithy_ford_note` |
| `chapel` (Willowmere) | the mirror decor with text `wm_chapel_mirror` |
| `valley` | `ford`, `crossing_garrick`, `crossing_hal`, `east_exit`; trigger `crossing_trig`; signs `ford_wrack`, `garrick_rail` |
| `east_road` | `entry`, `fog_start`, `fog_return`, `fog_end`, `cairn_first`, `waystation_fire`, `penny_cart`, `mere_view`, `court_far`, `town_gate`; sign `east_signpost`; enemy `e_road_mixed`; trigger `first_fight_trig`; object `old_milestone` |
| `nameless_hollow` | `gate_in`, `gate_sign`, `fountain`, `fountain_view`, `fountain_rim`, `rim_w`, `rim_e`, `fountain_out`, `meet_elian`, `elian_from`, `hall_door`, `chapel_door`, `inn_door`, `ferry_landing`, `tovin_spot`, `pier_end`, `plinth`, `clocktower`, `nico_spot`, `crowd_a`, `crowd_b`, `crowd_c`, `crowd_d`, `gather_anwen`, `gather_lena`, `gather_corin`, `gather_nico`, `restored_spot`, `restored_aurel`, `restored_elian`, `night_view`, `emberpeak_glow`, `mirror_warp_sq`; trigger `fountain_trig`; object `fountain_obj` |
| `nh_hall` | `elian_desk`, `hall_entry`; trigger `hall_trig` |
| `nh_chapel` | `anwen_spot`, `register` |
| `nh_inn` | `inn_bed`; object `lost_property` |
| `court_f1` | `landing`, `pier`, `start`, `great_door`, `b_center`, `mira_window`, `lens_1`, `lens_2`, `rec_lock`, `lock_gate`, `stairs_down`, `shortcut_gate`; actor `tovin_c`; trigger `mira_window_trig` |
| `court_f2` | `arrival`, `portrait_child`, `portrait_keeper`, `portrait_king`, `pool`, `vex_mirror`, `vex_glass`, `vex_frame`, `arena`, `selves_spot`, `selves_hero`, `selves_mira`, `selves_bram`, `stairs_down`, `well_return`; triggers `pool_trig`, `vex_trig`, `selves_trig` |
| `court_f3` | `arrival`, `hub_center`, `vow_door`, `vow_belonging`, `vow_mercy`, `vow_courage`, `feather`, `font`, `throne_door`; receptors `rec_belonging`, `rec_mercy`, `rec_courage`; object `feather_obj` |
| `court_throne` | actor `nameless_king`, `king`, `kneel`, `fragment_spot`, `party_stop`, `elian_enter`, `elian_meet`, `great_mirror`; trigger `king_trig`; door `mirror_exit` |

New beyond plan 4.8: `cairn_first`, `vex_glass`, `selves_hero`, `selves_mira`, `selves_bram`, `restored_aurel`,
`restored_elian`, `emberpeak_glow`; the scenes `court_f1_stairs` and `court_f2_stairs` need step triggers by the
stairs (they set `court_f1_done` / `court_f2_done`, which plan 4.4 and 4.5 assign to "the stairs trigger").

---

## 5. Inspect line ids (`lines` in `ep2.js`)

Every one is a string, a list of boxes, or a conditional list whose last entry is the fallback.

| Map | Line ids |
|---|---|
| `valley` | `ford_wrack`, `garrick_rail` |
| `willowmere`, `chapel` | `smithy_ford_note`, `wm_chapel_mirror` |
| `east_road` | `east_signpost`, `cairn`, `toll_board`, `toll_house`, `waystation_bench`, `mere_shore` |
| `nameless_hollow` | `gate_sign`, `proclamation`, `plinth`, `fountain`, `sign_nh_inn`, `sign_nh_shop`, `sign_nh_smithy`, `sign_nh_hall`, `sign_nh_chapel`, `clocktower`, `rune_shrine`, `nh_pier`, `nh_house` (the three private homes), `nh_flowers` |
| `nh_hall` | `elian_desk_note`, `hall_mirror`, `hall_notice`; book `nh_ledger` |
| `nh_chapel` | `register` (the lectern; inspect text, no script), `nh_candles`, `nh_bell_frame`, `nh_save_bell`, `nh_chapel_mirror`; book `nh_register_page` |
| `nh_inn` | `lost_property` (fallback text; the object runs `satchel_found`), `nh_guestbook` |
| `nh_shop`, `nh_smithy` | `fitch_shelves`, `glass_furnace` |
| `court_f1` | `tovin_landing` (actor text, spoken by `tovin_c`), `great_door_court`, `court_wall_mirror`, `court_lens` (every turnable mirror), `court_receptor`, `glass_slot`, `court_glass_door`, `cracked_pane`, `moon_window`, `silver_font` (all three fonts) |
| `court_f2` | `portrait_blank` (the blank decor portraits), `well_edge`, `glass_rail`, `reflection_pool`, `great_mirror_f2`; book `court_ledger` (the Remembrance Cache) |
| `court_f3` | `black_floor`, `vow_door_face`, `vow_mirror`, `heavy_mirror`, `floor_socket`, `glass_bench`, `court_note` (`lantern: true`, the Courage cache) |
| `court_throne` | `throne_glass`, `great_mirror_throne` |

---

## 6. Contracts for the other wave-10 agents

- **E2-world (`story.js`).** Merge `ep2.js` `scenes` and `lines` with Episode 1's (ids never collide; tested).
  `bannerFor`: `BANNERS[id].states` is a first-match list of `{ if, ifNot, title, sub }` checked before the base
  `title` / `sub` (kept as an object so `menu.js` and `loadGame.js`, which read `.title`, keep working).
  `HELP.save.bell_hollow` and `HELP.inn.poor_wren` are the Hollow's save-bell and inn lines. Credits handoff on
  `ep2_complete` with `CREDITS_EP2`. Read `noReflection` from the NPC record.
- **E2-battle.** Encounters `road_mixed` (the Glassback opens with Harden), `other_selves`, `nameless_king`; the
  Fury bonus reads `fountain_done`. Items the scenes give: `mael_letter`, `name_fragment_2`, `mirror_sigil`,
  `courier_satchel`, `elian_reply`, `black_feather`, `kept_promise`, `merewarden_mantle`, `courier_knot`,
  `hi_ether`; `paper_crown` comes from a chest. Bestiary names and first lore lines were sent to E2-battle; text.test
  checks they match `enemies.js`.
- **E2-scene-ui.** The fountain's +25 Fury (`fountain_done`) only applies when the battle scene passes the save's
  `flags` to `createEncounterBattle` (E2-battle's encounter option `startFury`).
- **E2-sprites.** Spawned sprites: `npc_elian`, `npc_aurel`, `npc_anwen`, `npc_vex`, `refl_hero`, `refl_mira`,
  `refl_bram` (field), plus the 13 NPC sprites. Portraits used: `elian`, `anwen`, `tovin`, `lena`, `aurel`,
  `nameless_king`, and `silver_rogue` for Vex.
- **E2-audio.** Music `hollow`, `hollowmere`, `fading_road`, `court`, `boss_king`; SFX `ferry_oars`, `beam_hit`,
  `glass_break`, `mirror_step`, `reflection_out`, `clock_chime` (plus Episode 1's).
- **Open gap.** The Fountain of Faces' canon 90 gold is not paid: the cutscene API has no gold give. Proposal:
  `give('gold', n)` adds gold with a "Received 90 gold." window; then `fountain_check` adds
  `await s.give('gold', REWARDS_EP2.fountain.gold)`.
