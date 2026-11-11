# Episode 4 staging guide

For the world and map owners (E4-world, E4-maps-a, E4-maps-b), the scene/UI owner (E4-scene-ui), the battle owner
(E4-battle) and the integrator. It says, for every scripted scene in `src/data/ep4/story.js`: which map, what starts it,
who stands where, which props and marks must exist, what the camera does and which music plays. Dialogue is not repeated
here; read the scene. Same shape as `STAGING_EP3.md`. Map layouts: `docs/EPISODE4_PLAN.md` section 4.

Owner: E4-story. `qa/content/ep4_story.test.mjs` checks that every scene, every mark a scene walks to, pans to or spawns
at, and every inspect line id below appears in this file, so keep it in step with the script.

---

## 1. Cutscene API and the rules of this episode

Exactly the Episode 1 API (`STAGING.md` section 1), plus `s.mapId` (read once, by `ep4_morning`). Details that matter here:

- **One name is missing until late.** Nobody says the Regent's name before `regent_after`. Her speaker tag is "The
  Regent": the NPC record `regent_e` in the Hall, the memory spawn `regent_m`, the throne spawn `regent_t`. The swap is
  the Garrick pattern: under the name flash `regent_t` is despawned and `lyra_t` ("Lyra") spawned on the same mark
  (`lyra_sign`). From `lyra_named` the NPC record `lyra_n` takes over at `regent_spot`. Every tag of hers speaks with the
  `noble_lady` portrait (the plan's `lyra` alias is this table, in `story.js` `PORTRAIT` and the two NPC records).
- **The hero never speaks.** Choices, emotes (`zzz`, `...`), walks. Others say the hero's name.
- **Speakers without an actor.** `king_v` (tag "The King", `SPEAKER_NAMES`, no portrait) at the principle stones.
  `paper_regent` is the map actor on the throne in `ep4_keep_crown`, tag "The Paper Regent", portrait `paper_regent`.
- **Scene guards.** `SCENE_CONDITIONS` in `story.js`. `ep4_morning` says `live: true` and `ifNot: tier_1`: it does
  nothing while `EP4_LIVE` is false (`src/game/episodes.js`) or on a Fine Print run. `GATE.live` in `story.js` is what
  the guard reads; the `?ep=4` developer entry (E4-pack) may set `GATE.live = true` after loading the pack. Every other
  scene needs a flag only an Episode 4 scene sets, so with the switch off nothing in Episode 4 is reachable.
- **Counter check.** `ep4_morning` should only start while counter `credits3_rolled` is set; the scene guard sees only
  flags (`ep3_complete`, `ep4_morning_done`, `tier_1`), so the pack's enter trigger `ep4_wake` on `pk_inn` (and its
  twin on `emberpeak`) checks the counter.
- **Chains.** `lyra_memory_3` calls `witness_book`. `paper_regent` calls `regent_after` after the win (also a scene on
  its own, for an enter trigger after a reload). `crown_remembers` calls `ep4_ending` after setting `tide_bell_rung` and
  `vw_restored`. The hooks roll `CREDITS_EP4` after `ep4_complete`, set counter `credits4_rolled`, show `END_CARD_EP4`
  and wake the party at `ep4_vw_inn` `inn_bed` (while Episode 5 is live, aboard `ep5_ship` at `deck_start` instead: the ep5
  pack points it, issue #99). While `EP4_LIVE`, the Episode 3 end card is `END_CARD_EP3_LIVE` and the Episode 3 credits wake
  the party at `emberpeak` `dawn_stage`.
- **Tints.** Memories use `dawn` and return to `none` (the keep floors' own tint). `crown_remembers` lifts Valewyn's
  `flood_grey` with `tint('none', 120)`; `ep4_ending` goes to `night`.
- **Retries.** `barrister` and `paper_regent` set `barrister_tried` / `paper_regent_tried` on the first start; after a
  loss the intro is only the pan, Mira's tip and the card.
- **Decisions.** `ferry_rest` (three questions), `regent_hall` (the truth choice: `lyra_truth` or `lyra_kind`),
  `ep4_morning`, `paper_regent` (flavor only), `witness_book` ("Sign." / "Not yet." twice, then the book stays open and
  the lectern asks again), `council_choice` (Shelter, Records or Not yet).

## 2. Map conventions the story needs

Everything in `STAGING.md` section 2 holds: `marks: { name: [x, y] }`, NPC events whose id equals the NPC id,
`{ type: 'trigger', script }`, `{ type: 'object', script }`, `{ type: 'sign', text: '<lineId>' }` reading the pack's
`lines` (registered from `src/data/ep4/text.js`), books from `BOOKS` (`{ type: 'book', book: '<id>' }`).

### Flag-driven presence and visuals the script relies on

| Flag | What changes (owner) |
|---|---|
| `ep4_started` | The Emberpeak sign `east_road_sign` points at `east_road_sign_ep4` (E4-maps-a patch). `east_road_trig` is live. |
| `east_road_open` | The rope ladder prop (`ep4_rope_ladder`) and the door down the washout to `ep4_flood_road` (E4-maps-a). |
| `saw_valewyn` | The ferry door `ferry_vw` at the landing to `ep4_valewyn` `ferry_in` (E4-maps-a). |
| `vw_arrived` | `regent_e` and `ada` appear (done, `show`). |
| `met_joss` | `keep_ferry_obj` answers (the scene); Dorian starts Three Witnesses on talk. |
| `keep_ferry_open` | The boat door at the north landing to `ep4_keep_f1` `start` (E4-maps-a). |
| `witnesses_started` | The council switches `switch_shelter`, `switch_records` appear (objects, `script: 'council_choice'`). |
| `council_records` | Book `vw_records` on Dorian's shelf in `ep4_vw_palace` (`if: council_records`, E4-maps-a); +25 Fury at the Regent (E4-battle encounter `startFury: { flag: 'council_records', amount: 25 }`). |
| `council_shelter` | A dry shelter with a rest point in the plaza and Hale's punt at the F1 landing (E4-maps-a, E4-maps-b). |
| `nilo_started` | Nilo's bell chest on F1's pontoon channel floor (flag `nilo_bell_found`, E4-maps-b). |
| `principle_voice`, `principle_truth`, `principle_mercy` | The Petition Gate's sockets light; the gate opens on all three. |
| `petition_gate_open` | The lectern `witness_lectern` answers (`script: 'witness_book'` until `hero_signed`, then sign `ep4_witness_lectern`). |
| `paper_regent_defeated` | `boat_crown_out` to `ep4_valewyn` `keep_landing` (its arrival runs `crown_remembers`). |
| `lyra_named` | `regent_e` is replaced by `lyra_n` (done). The Hall sign changes (`sign_ep4_palace`). |
| `vw_restored` | Valewyn: rain off, tint `none`, the river quarter overlay drains, the flood board's third state, banner sub "The Crown Remembers". |

## 3. Scenes, map by map

### Emberpeak and the inn (Act I; ep3 maps patched by the ep4 pack)

- `ep4_morning`, `emberpeak`, the east-road washout at first light (issue #99, `docs/WORLD_MAP_PLAN.md` section 4): the
  Episode 3 credits and the quick start put the party at `dawn_stage` (35,15), one step west of `east_road_trig`, and the
  enter trigger `ep4_wake_pk` runs the scene. From `pk_inn` (an old save's wake room, `ep4_wake`) or any other tile in town it
  fades out and moves the party to `dawn_stage` first (`s.leaderAt` and `s.openingTint` from the ep3 pack's `opening_stage`
  event). Tint `dawn`, back to `none` at the end. Spawns `ada_t` at `ada_rope` on the drop; Mira and Bram walk to
  `dawn_mira` and `dawn_bram`; the camera pans to `east_road`; Ada comes up the rope to `ada_brink`. Later `garrick_t` comes
  out at `inn_door` and walks to `garrick_dawn`. Music `first_bell` (the map track), `mystery` on "Nobody can.", back to
  `first_bell`. 12 boxes. Gives `running_decree`. The next step east runs `east_road_gate`. (Until issue #99: the inn hearth,
  `ada_hearth` and `garrick_door`, or the street, `inn_door` and `gather_garrick`; the inn marks stay for old saves.)
- `east_road_gate`, `emberpeak`, step trigger `east_road_trig` two tiles west of the drop. Spawns `rusk_t` at
  `east_road`, pans there. 2 boxes. The rope ladder and the door appear after it.
- Farewells (EPISODE4 scene 3) are talk entries on Garrick, Ilya, Sella, Veyra, Rusk, Bess (`npcs.js`), not scenes.

### `ep4_flood_road` (marks `entry`, `lane`, `fire`, `hale_spot`, `nilo_spot`, `bluff`, `valewyn_far`, `ferry`)

- `flood_road_arrival`, on enter. 3 boxes.
- `flood_first_fight`, step column `first_fight_trig`. Map enemy `e_e4r_first` (encounter `e4r_first`) runs at the
  hero; battle `e4r_first`, no flee. The Bloom's forced opener is E4-battle's. A loss sets nothing.
- `flood_lane`, step trigger `lane_trig`. Pans to `lane`. The bark `first_tide` plays after the first turn of `wh_lane`.
- `ferry_rest`, campfire object `ferry_fire` (`safe`, `rest`). Pans to `fire`; Hale (NPC `hale`) faces the hero.
- `vw_view`, step trigger on the bluff. `mystery`, pans to `valewyn_far` (the decal), back to `millrace`.
- Side: `testimony_hale` (Hale's talk entry), `nilo_bell` (Nilo's talk entry).

### `ep4_valewyn` (marks `ferry_in`, `plaza`, `statue`, `board`, `palace_door`, `canal_works`, `keep_landing`, `crowd_a`, `crowd_b`, `crowd_c`, `crowd_d`, `gather_lyra`, `gather_hale`, `gather_joss`, `gather_vance`, `night_view`)

- `vw_arrival`, on first enter by the ferry. Pans to `board`; Vance (NPC `vance`, at `board`) faces the hero.
- `vw_statue`, object `statue`. First look reads the inscription (`ep4_inscription` is the same words as a sign).
- `joss_locks`, Joss's talk entry once `met_regent`. Gives `lock_crank`.
- `keep_ferry`, object `keep_ferry_obj` at the north landing. Spawns `hale_t` at `keep_landing`. 2 boxes.
- `crown_remembers`, on enter by `boat_crown_out` (the arrival at `keep_landing`). Spawns `lyra_t` at `gather_lyra`,
  `joss_t` at `gather_joss`, `hale_t` at `gather_hale`, crowd `vw_crowd_a` to `vw_crowd_d` at `crowd_a` to `crowd_d`.
  Joss walks to `canal_works` (the great lock); the hero walks to `keep_landing` and rings the bell (`bell_drowned` x3);
  pans to `statue`; Vance walks to `board`. Music: silence, then `valewyn`. 14 boxes at most.
- `ep4_ending`, chained. Night. Spawns `lyra_t` at `canal_works`, `joss_t` at `gather_joss`, `ada_t` at `ferry_in`;
  pans to `night_view`; Ada runs to `statue`. Silence, `bell_drowned` once, `mystery`, the two title cards
  (`EPISODE5_CARD`), then `ep4_complete`.
- Side: `witnesses_start`, `testimony_joss` (talk entries), `council_choice` (both switch objects).

### `ep4_vw_palace` (marks `regent_spot`, `table`, `dorian_spot`)

- `regent_hall`, step trigger `regent_trig` two tiles in. Pans to `regent_spot`; `regent_e` faces the hero. `sorrow`
  from the truth choice, back to `valewyn`.
- Side: `witnesses_start`, `testimony_dorian` (Dorian's talk entry at `dorian_spot`).

### `ep4_keep_f1` (marks `start`, `font`, `papered`, `pontoons`, `audience`, `gallery`, `tidegate`, `lift_down`, plus `audience_regent`, `audience_boatman`, `audience_guard`)

- `keep_f1_arrival`, on enter. Pans to `papered` (the forged seal `seal_b`).
- `lyra_memory_1`, step trigger `memory1_trig` in the Audience Hall. Pans to `audience`; `dawn` tint; spawns `regent_m`
  at `audience_regent`, `boatman_m` at `audience_boatman`, `guard_m` at `audience_guard` (the guard walks to
  `audience_boatman`). `sorrow` with `bell_drowned`, back to `sunken_keep`.
- `keep_f1_lift`, silent step trigger on the lift behind the Tidegate.
- Barks: `first_wash` (seal washed), `first_float` (first floating pontoon), `first_true_ink` (a Keeper mark under water).

### `ep4_keep_f2` (marks `arrival`, `stacks`, `scriptorium`, `dry_room`, `vex_chair`, `locks`, `coffer`, `arena`, `barrister_spot`, `stairs_down`, plus `scriptorium_regent`, `scriptorium_scribe`)

- `keep_f2_arrival`, on enter. 3 boxes.
- `lyra_memory_2`, step trigger `memory2_trig` at the scriptorium rail. Pans to `scriptorium`; spawns `regent_m` at
  `scriptorium_regent`, `scribe_m` at `scriptorium_scribe`. `sorrow`, back to `sunken_keep`.
- `vex_archive`, step trigger `vex_trig` at the dome. Silence, pans to `dry_room`, spawns `vex` at `vex_chair`,
  `mystery`, a pale flash and `vex` is gone; the feather prop `feather_dry` (sign `ep4_vex_feather`) stays. Back to
  `sunken_keep`.
- `barrister`, arena trigger `barrister_trig`. Silence, pans to `barrister_spot`, card "THE INKBOUND BARRISTER /
  Counsel for the Forgery", `battle`, battle `barrister` (boss, no flee). After: back to `sunken_keep`.
- `keep_f2_stair`, silent step trigger on the stair (`stairs_down`).
- `coffer_records`, object `coffer_obj` (`lantern: true`, present while basin `c` is high). Opens the cache.

### `ep4_keep_f3` (marks `arrival`, `hub`, `gate_spot`, `stone_voice`, `stone_truth`, `stone_mercy`, `lectern`, `font`, `throne_door`, plus `memory3_regent`)

- `keep_f3_arrival`, on enter. Pans to `hub`.
- `principle_voice`, `principle_truth`, `principle_mercy`: the stone objects `stone_voice`, `stone_truth`,
  `stone_mercy` (`script` each). `bell_drowned`, one line from `king_v`. No music change. The third says the gate woke.
- `lyra_memory_3`, step trigger at `gate_spot` once all three have rung. Silence, pan, `bell_drowned`, shake, `sorrow`,
  `dawn`; spawns `regent_m` at `memory3_regent`. Then `witness_book`.
- `witness_book`, chained, and the lectern object `witness_lectern` afterwards. Pans to `lectern` (the cell in front
  of it); the hero walks to `lectern` and signs. Silence, `triumph` on the signature, back to `mystery`.

### `ep4_keep_crown` (marks `throne`, `party_stop`, `table`, `lyra_enter`, `lyra_sign`, `charter_spot`)

- `paper_regent`, step trigger row `regent_trig`. Silence, pans to `throne` (the map actor `paper_regent`), card "THE
  PAPER REGENT / Keeper of the Seal", `boss_regent`, battle `paper_regent` (boss, no flee).
- `regent_after`, chained (and an enter trigger with `if: paper_regent_defeated, ifNot: lyra_named` after a reload).
  Pans to `throne`, the hero walks to `charter_spot`; spawns `regent_t`, `hale_t`, `joss_t` at `lyra_enter`, who walk
  to `party_stop`; `regent_t` walks to `lyra_sign` and becomes `lyra_t` under the flash; pans to `charter_spot`, then
  `table` (the feather and the page: sign `ep4_witness_page`). Music `sorrow` -> `triumph` -> `mystery` -> `valewyn`.
  Gives `name_fragment_4` and Lyra's gift (`tidewarden_trident` if `lyra_truth`, else `regents_pardon`).

## 4. Inspect lines (registered from `text.js`)

Emberpeak: `east_road_sign_ep4` (four states, the Episode 3 ones underneath), `ep4_rope_ladder`.
Flood Road: `ep4_broken_cart`, `ep4_farm_roof`, `ep4_valewyn_far`, `ep4_ferry_post`, `ep4_lane_sign`, `ep4_farm_wheel`.
Tide kit (any map): `ep4_tide_post`, `ep4_lock_wheel`, `ep4_pontoon`, `ep4_book_crate`, `ep4_papered_door`,
`ep4_washed_door`, `ep4_floodgate`, `ep4_font_tide`, `ep4_lantern_chain`, `ep4_keeper_marks`.
Valewyn: `ep4_statue`, `ep4_inscription`, `ep4_flood_board` (three states), `ep4_sandbags`, `ep4_great_lock`,
`ep4_drowned_roofs`, `ep4_canal`, `ep4_drowned_bell`, `ep4_council_switches`, `ep4_shelter`, `sign_ep4_inn`, `sign_ep4_shop`,
`sign_ep4_forge`, `sign_ep4_palace`. The Hall: `ep4_decree_table`, `ep4_archive_shelf`.
Keep: `ep4_glass_dome`, `ep4_vex_feather`, `ep4_scriptorium`, `ep4_court_bench`, `ep4_principles`, `ep4_petition_gate`,
`ep4_stone_voice`, `ep4_stone_truth`, `ep4_stone_mercy`, `ep4_keeper_note` (the Mercy wing's Lantern note),
`ep4_witness_lectern`, `ep4_throne`, `ep4_witness_page`.
Books: `vw_records`, `keep_ledger`, `tide_log` (the Water Gate on F1).

**APPLIED 2026-11-04 on Scott's word ("Follow your recommendations"): Mira now says "It held. Down here. Yours held." Trims in the same pass: `vex_archive` drops the closing feather narration and Bram's "thank him and hit him" (an Episode 3 echo); `crown_remembers` joins Lyra's two opening lines into one box and drops Vance's board line (the narration already dries the notices). The learn-line option below was not taken. Original note (E4-fixes-A, PLAYTEST_REVIEW_6 fix 9):** In `witness_book`
(`src/data/ep4/story.js`) Mira says "It held. Under water. Yours held." while the antechamber around the lectern is a dry
marble room, so "under water" is told, not shown. Smallest wording fix, same rhythm: "It held. Down here. Yours held."
(the alternative is map art: a shallow basin under the lectern, E4-fixes-B's side). Optional, same scene: the learn line
"{hero} learned Answer." could say what it is for: "{hero} learned Answer. It voids a decree." (the battle help line
already says "Answer to your name. Voids a decree.").

## 5. NPCs

`regent_e` / `lyra_n`, `dorian` (`ep4_vw_palace`), `hale`, `nilo` (`ep4_flood_road`), `joss`, `ada`, `vance`, `sori`
(`ep4_valewyn`), `linn` (`ep4_vw_shop`, shop `riverbank`), `ep4_innkeeper` (`ep4_vw_inn`, inn 80), `ep4_smith`
(`ep4_vw_forge`, shop `vw_forge`). Hale holds shop `ferry_peddler`. Sprites `npc_lyra`, `npc_hale`, `npc_nilo`,
`npc_dorian`, `npc_joss`, `npc_vance`, `npc_linn`, `npc_sori` (E4-sprites); Ada is `npc_courier_v`, the innkeeper
`npc_innkeeper`, the smith `npc_smith`. Scene-only: `npc_boatman`, `npc_scholar` (the scribe), `npc_guard`, `npc_vex`.
