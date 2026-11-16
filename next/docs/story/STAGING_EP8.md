# Episode 8 staging guide

For the world and map owners (E8-world, E8-maps-a, E8-maps-b), the art owners (E8-tiles, E8-sprites), the scene/UI owner
(E8-scene-ui), the battle owner (E8-battle), the pack owner (E8-pack) and the integrator. It says, for every scripted scene
in `src/data/ep8/story.js`: which map, what starts it, who stands where, which props and marks must exist, what the camera
does and which music plays. Dialogue is not repeated here; read the scene. Same shape as `STAGING_EP7.md`. Map layouts:
`docs/EPISODE8_PLAN.md` section 4.

Owner: E8-story. `qa/content/ep8_story.test.mjs` checks that every scene, every mark a scene walks to, pans to or spawns
at, every inspect line id, every realm book and every witness flag below appears in this file, so keep it in step with the
script.

---

## 1. Cutscene API and the rules of this episode

Exactly the Episode 1 API (`STAGING.md` section 1), plus `closeup` for the pages, `warp` for the two map changes a scene
owns (the roof to the Stair, home to the bell night), and four optional pack helpers.

- **Staging (CRITIQUE_6 item 11).** Before the first line of anyone outside the party, the script calls `stage(s, X)`: the
  hero walks to mark `X`, then Mira to `X_m` and Bram to `X_b` together. Put `X` **two tiles below** the speaker (or two
  tiles in front of them, facing them), `X_m` one tile left and `X_b` one tile right, all walkable, none on a speaker's own
  cell, **none on a page cell, a book, the void or a trigger** (plan 4.4). Every `X`, `X_m`, `X_b` is listed per map below.
- **Camera rule (EPISODE8 section 1, CRITIQUE_8 item 2).** Every **focus mark** (a mark the camera pans to, a speaker
  stands on, or the party is staged on) sits at least **12 tiles from the map's left and right edges and 7 from its top and
  bottom**, on any axis where the map is larger than the view (24 x 13.5 tiles); an axis the whole map fits on screen is
  exempt (interiors). The focus marks are listed per map in section 3 under "Focus marks" with the allowed band and the
  planned cell and its distances (left, right, top, bottom); the exact cells are the map author's (`docs/MAPS_EP8_A.md`,
  `docs/MAPS_EP8_B.md`) and `qa/maps/ep8_*` asserts the distances from them. Where a map cannot meet it, widen the map.
- **Nox, Vex, Aeris.** Nox is Episode 7's record `nox_t` ("Nox", sprite `npc_keeper`, no portrait), spawned at a mark by
  every scene that needs her (plan 5.2: no follower code); a spawn replaces the last one, and a map change clears her.
  Vex is spawned as `vex_k` (sprite `npc_vex`, or `npc_vex_kneel` on the bindery step), never `vex` (Episode 2's in-glass
  id), as Episodes 5 to 7 do; portrait `silver_rogue`. Aeris is the spawn `aeris_t` (sprite `npc_aeris`). None of them
  fights.
- **One man, three records.** "The Librarian" (`ep8_librarian`, sprite `npc_librarian`, hood up, no portrait: the Index
  record at `librarian_desk`, and the Last Word spawn at `lectern`); "The Eraser" (`eraser_v`, sprite `eraser_avatar`,
  portrait `eraser`: the stair figure in `rubbed_steps`, named "A Tall Figure" there and never a speaker, and the Last Word
  from the hood); "The First Keeper" (`first_keeper`, sprite `npc_first_keeper`, portrait `first_keeper`, the held
  `hooded_sage` cell: from `eraser_after`, then the Index resident). Each swap is a despawn and a spawn **on the same mark**
  (`lectern`), on one beat. In memories he is `first_keeper_m` ("The First Keeper", sprite `npc_first_keeper_m`, younger,
  hood back). Elowen in memory is `elowen_m` ("A Young Keeper"), the nurse `nurse_m` ("A Nurse"), the Rootbound Archive's
  last Keeper `rootbound_keeper_m` ("The Keeper with the Lantern", nameless by design). His own name is never written:
  on the sworn page it is a smudge only he reads (EPISODE8 choice 26).
- **Showing (CRITIQUE_6 item 3, CRITIQUE_8 item 5).** The seven payoffs open a close-up page only when `PAGE_KINDS[kind]`
  exists (E8-tiles registers the kinds from `src/data/ep8/pages.js` in wave 8b), each mode right before the box that says
  it: `ep8_note` (one mode) in `ep8_morning`; `ep8_first_word` `rubbed` then `read` in `first_word`; `ep8_card` `card` in
  `meet_librarian` and `beside` in `keeper_memory_b`; `ep8_seal` `tag`, `match`, `run` in `elowen_scriptorium`;
  `ep8_could_not` `run` then `note` in `keeper_memory_c`; `ep8_shelf` `shelved`, then `run` with `{ step: 1 }`, `{ step: 2 }`,
  `{ step: 3 }` (the birth line, the eleven names, the cause and his name: each step at full strength only on its box),
  then `star` in `last_page`; `ep8_last_page` (one mode) in `last_page`. The options object is `{ mode, step }`. Every page is
  closed before anything on the field walks, spawns or despawns. Until the pages land the lines said over them read as
  narration; nothing else changes (the same boxes either way).
- **Pack helpers (E8-scene-ui, wave 8d).** Used only when the cutscene has them (`'name' in s`); the boxes are the same
  without. `s.inkBlot(who)`: a box that shows "..." under an ink blot (the name the run took out of the infirmary memory in
  `keeper_memory_c`); the fallback is a plain "..." box from `elowen_m` and the `ink_gurgle` sfx. `s.hudNameFlash(id)`: the
  `name_restore` flash on a party member's HUD name (`last_page`, the hero; fallback a soft flash). `s.tollName(text)`: the
  bell night's caption, the cold open's style (scenes/prologue.js): each toll's name, and `{hero}` (filled) at the
  thirteenth; without it the toll steps show nothing and the thirteenth shows one gold narration box. `s.goto(map, x, y,
  dir)`: an awaited map change that keeps the scene running (`home`: `hero_home` at `HOME_DOOR` (12, 9), facing up); without
  it the door is one narration box on black.
- **Tints.** `rubout` (E8-world, plan 5.2: a violet dim, in over 120 frames, out over 60) in `rubbed_steps` and `first_word`;
  `violet` is the Last Word's own lighting (no scene sets it); `dawn` in `ep8_morning`, `dusk` in `scriptorium_open` and at
  Hazel's door, `night` on the bell night.
- **The hero never speaks in a box**, not even at the bell. Choices, emotes (`!`, `...`), walks and turns: Mira says
  "{hero}." and the hero turns (`face`) in `eraser_after`; Elowen says it and the hero turns in `scriptorium_open`; the
  thirteenth bell shows it as a caption.
- **Scene guards.** `SCENE_CONDITIONS` in `story.js`. `ep8_morning` says `live: true`, `if: ep7_complete`, `ifNot:
  ep8_morning_done, tier_1`: it does nothing while `EP8_LIVE` is false (`src/game/episodes.js`, read through a namespace so
  a missing export reads false) or on a Fine Print run. `GATE.live` in `story.js` is what the guard reads; the `?ep=8`
  developer entry (E8-pack) may set `GATE.live = true` after loading the pack. Every other scene needs a flag only an
  Episode 8 scene sets.
- **Counter check.** `ep8_morning` should only start while counter `credits7_rolled` is set; the scene guard sees only
  flags, so the pack patch's enter trigger `ep8_wake` on `ep7_ph_watch` checks the counter.
- **Bosses.** A retry after a loss plays the pan, Mira's tip and the card only (`sentry_tried`, `eraser_tried`). A loss sets
  nothing. The Eraser's retry spawns `eraser_v` on `lectern` (and Vex on `vex_stop` once `vex_arrived`).
- **The final choice** (`last_choice`): the First Keeper asks; the two canon labels; then a confirm, "This cannot be
  changed." with `Yes.` / `No.` (the cancel answer of a choice is its last option, so a cancel is always No, never a
  commit). No goes back to the question; asked at most twice in one run, then nothing is set and the scene ends: **the map
  needs a step trigger by the lectern that runs `last_choice` again** (and an enter trigger for a reload). Once an ending
  flag is set it never runs again and nothing offers the other.
- **Credits.** `thirteenth_name` sets `ep8_complete`; E8-pack's hooks roll the credits over `the_last_word` (counter
  `credits8_rolled`; `creditsEp8(hasFlag, namesKept(...))` from `credits.js` fills the ending card and "Names kept: N of
  M"), show `END_CARD_EP8` and wake the party at `hero_home` `bed` (plan 5.3). While `EP8_LIVE`, the Episode 7 end card is
  `END_CARD_EP7_LIVE` ("Episode 8 begins in the morning.").

## 2. Map conventions the story needs

### Flag-driven presence and visuals the script relies on

| What | Flag | Map owner |
|---|---|---|
| `ep8_wake` enter trigger on `ep7_ph_watch` (script `ep8_morning`; checks counter `credits7_rolled`) | `ep7_complete` | E8-maps-a (`ep8_patches.js`) |
| An enter trigger on `ep7_stillheart` that runs `ep8_roof` (entering by the nave door) | `if: ep8_started`, `ifNot: ep8_roofed` | E8-maps-a |
| The stair door `stair_up` at `stair_foot` to `ep8_stair` `stair_bottom` | `ep8_roofed` | E8-maps-a |
| `ep8_stair` enter trigger (`stair_arrival`); `rub_row` (`first_rub`); `first_trig` (`first_book`) | `ep8_roofed`; `stair_arrived`; `first_rub_done` | E8-maps-a |
| `rubbed_trig` by the reading desk (`rubbed_steps`); `margin_trig` at the top gate (`south_margin`) | `first_book_read`; `stair_arrived` | E8-maps-a |
| The steps' blank frames as the figure passes (`rubbed_steps`): the scene owns the walk, the map the frames | `eraser_seen` (the lines stay blank) | E8-maps-a / E8-world |
| `ep8_scriptorium` first enter (`scriptorium_arrival`), `word_trig` in the square (`first_word`) | `stair_arrived`; `scriptorium_arrived` | E8-maps-a |
| `gate_trig` at the Library door (`library_door`) | `card_read` and `elowen_met` | E8-maps-a |
| The half-signs finished, pens dripping, candles lit, the register's line plain | `scriptorium_open` | E8-maps-a |
| The Scriptorium banner's second state | `scriptorium_open` | E8-story (text.js) |
| The folio lit, a rest and save (`ep8_folio`) | `concordance_lit` | E8-maps-a |
| `index_trig` two tiles into `ep8_sc_index` (`meet_librarian`) | `read_learned` | E8-maps-a |
| The Librarian record at the desk; the First Keeper record there | `ifNot: librarian_met`; `keeper_named` | E8-maps-a |
| `library_gate` to `ep8_library_f1` `arrival` open; `lexicon_door` to `ep8_last_word` `dais` | `library_open`; `page_shelved` | E8-maps-a |
| An enter trigger on `ep8_scriptorium` at the `library_gate` arrival that runs `scriptorium_open` | `if: page_shelved`, `ifNot: scriptorium_open` | E8-maps-a |
| `home_trig` at the South Margin gate (`home`) | `scriptorium_open` | E8-maps-a |
| `ep8_bell_night`: an enter trigger and `trig_thirteenth` both run `thirteenth_name`; `trig_toll_1` to `_12` run `ep8_toll_1` to `ep8_toll_12`; the party followers hidden (the cold open's solo climb); the bell beam decal KEEP ONE with inspect `ep8_keep_one` | always (each guards itself) | E8-maps-a |
| F1 enter (`catalog_arrival`), `memory_a_trig` (`keeper_memory_a`), the lift trigger (`library_f1_lift`) | `library_open`; `lib_f1_arrived`; `lib_f1_arrived` | E8-maps-b |
| F2 enter (`palimpsest_arrival`), `memory_b_trig` (`keeper_memory_b`), `sentry_trig` (`unnamed_sentry`), the lift (`library_f2_lift`), `archive_obj` (`uncensored_archive`) | `library_f1_done`; `lib_f2_arrived`; `lib_f2_arrived`; `sentry_defeated`; `lib_f2_arrived` | E8-maps-b |
| The Archive's gold chest (500 gold, 3 Hi-Ethers, book `keeper_hid`) | `archive_open` | E8-maps-b |
| F3 enter (`unwritten_arrival`), `memory_c_trig` (`keeper_memory_c`), `name_trig` (`the_name`) | `library_f2_done`; `lib_f3_arrived`; `keeper_memory_c` and `ink_key_found` | E8-maps-b |
| The `ink_door` open | `name_told` | E8-maps-b |
| `eraser_trig` row at the Last Word's entry (`eraser`); an enter trigger for a reload: `eraser_after`, `last_choice`, `last_page` each guard themselves | `name_told` | E8-maps-b |
| A step trigger by the lectern that runs `last_choice` (asked again after two Nos) | `keeper_named`, no ending flag | E8-maps-b |
| The gold grade, `word_down`, `square_return` to `ep8_scriptorium` `library_gate` | `eraser_defeated` | E8-maps-b |
| The great book's three states, the first shelf filled, the dome's eighth star lit | `lexicon_restored`; `page_shelved`; `eighth_star` | E8-maps-b / E8-tiles |

## 3. Scenes, map by map

### `ep7_ph_watch` (patch: enter trigger `ep8_wake`; Episode 7's marks `keeper_chair`, `watch_stage`, `watch_stage_m`, `watch_stage_b`, `watch_cot`)

- `ep8_morning`: Episode 7's credits wake the party on `watch_cot`. Dawn tint; Nox spawns at her table chair
  (`keeper_chair`, (5, 5)); the party walks to `watch_stage` (5, 7), `watch_stage_m` (4, 7), `watch_stage_b` (6, 7), two
  tiles below her; the camera holds on `keeper_chair`; fade in. Nox's canon line in two boxes, the note close-up on the
  third (silence under it), Bram, Mira, Nox. Six boxes; gives `vex_note`. Music `palehaven`, silence, `palehaven`. **The
  plan's `nox_table8` is not needed** (Episode 7's chair is her table); the patch adds only `ep8_wake`. The Watch is an
  interior that fits the screen across: exempt.

### `ep7_stillheart` (patch: the stair door `stair_up`, mark `aeris_roof`; new marks `stair_stage`, `stair_stage_m`, `stair_stage_b`; Episode 7's `stair_foot`)

- `ep8_roof`: on enter by the nave door. No tint (day); Aeris spawns at `aeris_roof` facing left (by the Kestrel's
  mooring), Nox at the first step `stair_foot` (20, 9); the party stages on `stair_stage` (20, 11), `stair_stage_m`
  (19, 11), `stair_stage_b` (21, 11); pan to `stair_foot`. One narration, Aeris, then silence and Nox's question; the
  choice; one answer; `orrery` begins; fade out; the scene warps to `ep8_stair` at `STAIR_FOOT` (15, 57) facing up.
- Focus marks, `ep7_stillheart` (34 x 22: x 12 to 21, y 7 to 14): `stair_foot` (20, 9: 20, 13, 9, 12), `stair_stage`
  (20, 11: 20, 13, 11, 10), `aeris_roof` (proposed (15, 12): 15, 18, 12, 9).

### `ep8_stair` (marks `stair_bottom`, `nox_foot`, `foot_stage`, `foot_stage_m`, `foot_stage_b`, `rub_row`, `foes_drop`, `foes_drop_b`, `gap_a`, `nox_gap_a`, `gap_a_stage`, `gap_a_stage_m`, `gap_a_stage_b`, `gap_b`, `ledge_b`, `desk`, `nox_desk`, `desk_stage`, `desk_stage_m`, `desk_stage_b`, `eraser_far`, `eraser_low`, `gap_c`, `margin`, `library_far`, `north_exit`)

- `stair_arrival`: on enter at `stair_bottom` (15, 57). Nox spawns at `nox_foot` (16, 50), the party stages on
  `foot_stage` (15, 52); pan to `gap_a`. Three boxes. The banner shows on arrival (text.js).
- `first_rub`: the step row `rub_row` (y 48, x 8 to 22: one row above the foot's stage, never under Nox). Pan to
  `foes_drop` (15, 45); two Index Hounds spawn at `foes_drop` and `foes_drop_b` (17, 45) (field sprite `index_hound`); Mira's
  line; battle `e8s_first`, no flee; the hounds despawn; Bram twice; the hero's `...`.
- `first_book`: the step trigger `first_trig` before Gap A. Nox at `nox_gap_a` (13, 44), the party on `gap_a_stage`
  (13, 46); pan to `gap_a` (15, 42), the Willowmere book `pb_willow` at the near edge. Two boxes.
- `rubbed_steps`: `rubbed_trig` (15, 27) by the reading desk `desk`. Nox at `nox_desk` (14, 27), the party on `desk_stage`
  (14, 29). Silence; the `rubout` tint over 120 frames; the figure `eraser_v` (sprite `eraser_avatar`, name "A Tall
  Figure") spawns at `eraser_far` (15, 14) and walks down to `eraser_low` (15, 18), never into the party's half of the
  screen; two narrations; it turns, walks back up, despawns; the tint lifts over 60 frames; `orrery`; five lines.
- `south_margin`: `margin_trig` at the top gate (`margin`, (15, 5)). `mystery`; pan to `library_far` (the decal's focus
  cell); one narration, Bram, Mira, the hero's `...`; back to `orrery`.
- Focus marks, `ep8_stair` (30 x 60: x 12 to 17, y 7 to 52): `foot_stage` (15, 52: 15, 14, 52, 7), `nox_foot` (16, 50: 16,
  13, 50, 9), `foes_drop` (15, 45: 15, 14, 45, 14), `gap_a` (15, 42: 15, 14, 42, 17), `gap_a_stage` (13, 46: 13, 16, 46, 13),
  `nox_gap_a` (13, 44: 13, 16, 44, 15), `desk_stage` (14, 29: 14, 15, 29, 30), `nox_desk` (14, 27: 14, 15, 27, 32),
  `eraser_far` (15, 14: 15, 14, 14, 45), `library_far` (15, 8: 15, 14, 8, 51). (`margin` at y 5 is a trigger, not a focus;
  the pan goes to `library_far` at y 7 or below.)

### `ep8_scriptorium` (marks `south_gate`, `quinn_gate`, `nox_gate_s`, `gate_stage`, `gate_stage_m`, `gate_stage_b`, `sign_a`, `codex`, `codex_n`, `codex_s`, `codex_w`, `codex_e`, `nox_codex`, `meya_steps`, `steps_stage`, `steps_stage_m`, `steps_stage_b`, `stall`, `elowen_stall`, `stall_stage`, `stall_stage_m`, `stall_stage_b`, `nox_stall`, `library_gate`, `nox_gate`, `library_stage`, `library_stage_m`, `library_stage_b`, `index_door`, `nox_index`, `arun_post`, `vex_step`, `folio_stage`, `folio_stage_m`, `folio_stage_b`, `ione_spot`, `fen_spot`, `lexicon_door`, `inn_door`, `shop_door`, `atelier_door`, `crowd_a` to `crowd_f`, `library_cliff`)

- `scriptorium_arrival`: on first enter at `south_gate`. Silence; Nox at `nox_gate_s` (22, 27), the party on `gate_stage`
  (23, 28), two below Quinn at `quinn_gate` (23, 26); pan to `sign_a` (a half-sign by the gate, BOOKB); `scriptorium_town`;
  Quinn's canon line, Mira, Quinn, Bram, Quinn, Nox; Nox walks to `nox_codex` (21, 18).
- `first_word`: `word_trig` in the square. The party on `steps_stage` (26, 23), two below Meya on `meya_steps` (26, 21);
  Meya's canon line; silence, the `rubout` tint, `rub_out`, the page `rubbed`; Mira's Lantern line and `read_cast`; the
  page `read`; the tint lifts, `scriptorium_town`; the learn line in gold.
- `elowen_scriptorium`: Elowen's talk entry. The party on `stall_stage` (18, 23), two below her desk `elowen_stall`
  (18, 21) under the register house awning (`stall`, the line of grey blankets beside it); pan to `stall`; the three
  `ep8_seal` modes; Nox spawns at `nox_codex` and walks to `nox_stall` (20, 22); silence under the choice.
- `library_door`: `gate_trig` before the great door. Nox at `nox_gate` (23, 9), the party on `library_stage` (23, 11);
  pan to `library_gate` (23, 8, the door's focus cell below the seal); `gate_open` as Nox opens it.
- `scriptorium_open`: the arrival by the Library door after `page_shelved` (the party lands on `library_stage`). Dusk;
  Vex (`npc_vex_kneel`) on `vex_step` (29, 20), the First Keeper at `index_door` (17, 10), Nox beside him at `nox_index`
  (18, 11); pans to `codex`, `arun_post` (27, 16), `meya_steps`, `stall`, `vex_step`, `index_door`; the party stages three
  times (`library_stage`, `steps_stage`, `stall_stage`); Elowen's gift by `told_elowen`; the banner as a title card.
- `home`: `home_trig` at the South Margin gate. Fade out; on black: the stair down, Aeris's line (no actor), the flight on
  `triumph`, the valley; then `s.goto('hero_home', 12, 9, 'up')` (or one narration on black); Hazel (`hazel`, sprite
  `npc_parent`) spawns at `hazel_start` (13, 4) and walks up to the hero; `willowmere`; the third choice; fade out; the
  scene warps to `ep8_bell_night` at `BELL_FOOT` (12, 36) facing up. `hero_home` is core: nothing is added to it.
- `concordance_start`, `testimony_ione` (Ione at `ione_spot`), `testimony_fen` (Fen at `fen_spot`), `testimony_elowen`
  (her desk): talk entries, one or two boxes each. `concordance_light`: the folio object by the Codex (`codex_s`); the party
  stages on `folio_stage` (23, 22) once; the gifts; a rest and save from then (key `ep8_folio`).
- `drift_start`, `drift_done`: Quinn's talk entries at `quinn_gate`.
- Focus marks, `ep8_scriptorium` (46 x 36: x 12 to 33, y 7 to 28): `codex` (23, 18: 23, 22, 18, 17), `sign_a` (21, 26: 21,
  24, 26, 9), `gate_stage` (23, 28: 23, 22, 28, 7), `quinn_gate` (23, 26: 23, 22, 26, 9), `meya_steps` (26, 21: 26, 19, 21,
  14), `steps_stage` (26, 23: 26, 19, 23, 12), `stall` (17, 21: 17, 28, 21, 14), `stall_stage` (18, 23: 18, 27, 23, 12),
  `library_gate` (23, 8: 23, 22, 8, 27), `library_stage` (23, 11: 23, 22, 11, 24), `arun_post` (27, 16: 27, 18, 16, 19),
  `vex_step` (29, 20: 29, 16, 20, 15), `index_door` (17, 10: 17, 28, 10, 25), `folio_stage` (23, 22: 23, 22, 22, 13).

### `ep8_sc_index` (marks `party_stop`, `party_stop_m`, `party_stop_b`, `librarian_desk`, `back_door`, `index_stage`, `desk`; trigger `index_trig`)

- `meet_librarian`: `index_trig` two tiles in. The party on `party_stop` (two below the desk); `mystery`; pan to
  `librarian_desk`; the Librarian record (at `librarian_desk`, shown until `librarian_met`) speaks, turns his back (`face`
  up) to write the cards, turns back, gives `reader_card`, walks to `back_door` and despawns; silence on the card close-up;
  `mystery`; the hero's `!`. The Index is an interior (the chapel's layout): exempt. The save bell names its own key
  `ep8_index_bell`.

### `ep8_library_f1` (marks `arrival`, `font`, `crossing`, `doorway_alcove`, `nox_alcove`, `alcove_stage`, `alcove_stage_m`, `alcove_stage_b`, `fk_door_m`, `traveler_in_m`, `traveler_past_m`, `wall_behind`, `side_alcove`, `north_shelf`, `lift_up`, `lift_l1_up`)

- `catalog_arrival`: on enter. Pan to `crossing`; one narration, Bram, Mira.
- `keeper_memory_a`: `memory_a_trig` at the doorway alcove. Nox at `nox_alcove`, the party on `alcove_stage`; the memory
  in (pan to `doorway_alcove`, `sorrow`, `bell_toll`, a warm flash); the young First Keeper (`first_keeper_m`) at
  `fk_door_m` holding the door, a traveler (`traveler_m`, sprite `npc_scholar`) from `traveler_in_m` to `traveler_past_m`;
  the memory out (a flash, despawns, `first_library`).
- `library_f1_lift`: the silent lift trigger. The gold chest `ink_key` (flag `ink_key_found`) on `north_shelf`.
- Focus marks, `ep8_library_f1` (40 x 30: x 12 to 27, y 7 to 22): `crossing` (17, 19: 17, 22, 19, 10), `doorway_alcove`
  (13, 16: 13, 26, 16, 13), `alcove_stage` (14, 18: 14, 25, 18, 11), `nox_alcove` (15, 16: 15, 24, 16, 13), `fk_door_m`
  (13, 15: 13, 26, 15, 14).

### `ep8_library_f2` (marks `arrival`, `pair`, `printing_room`, `nox_printing`, `printing_stage`, `printing_stage_m`, `printing_stage_b`, `fk_desk_m`, `scribe_row_m`, `lantern_keeper_m`, `lantern_exit_m`, `wrong_version`, `side_galleries`, `archive`, `arena`, `sentry_spot`, `arena_stage`, `arena_stage_m`, `arena_stage_b`, `lift_up`, `lift_l2_down`)

- `palimpsest_arrival`: on enter. Pan to `pair`; Mira, Bram.
- `keeper_memory_b`: `memory_b_trig` in the printing room. Nox at `nox_printing`, the party on `printing_stage`; the memory
  in at `printing_room`; the First Keeper (`first_keeper_m`) at `fk_desk_m`, a Scribe (`scribe_m`, sprite `npc_scholar`) at
  `scribe_row_m`, the Keeper with the Lantern (`rootbound_keeper_m`, sprite `npc_rootbound_keeper_m`) at
  `lantern_keeper_m`, who walks out to `lantern_exit_m`; the memory out; the card close-up `beside`.
- `unnamed_sentry`: `sentry_trig` in the Seal Gallery. Silence; pan to `sentry_spot`; the party on `arena_stage`; two
  narrations (the second the arc line), Mira's tip, the card, `battle`; after a win `first_library` and two lines.
- `library_f2_lift`: the silent lift trigger (after `sentry_defeated`). `uncensored_archive`: `archive_obj`.
- Focus marks, `ep8_library_f2` (40 x 30: x 12 to 27, y 7 to 22): `pair` (14, 15: 14, 25, 15, 14), `printing_room` (16, 12:
  16, 23, 12, 17), `printing_stage` (16, 15: 16, 23, 15, 14), `nox_printing` (18, 13: 18, 21, 13, 16), `fk_desk_m` (16, 11:
  16, 23, 11, 18), `sentry_spot` (20, 14: 20, 19, 14, 15), `arena_stage` (20, 18: 20, 19, 18, 11).

### `ep8_library_f3` (marks `arrival`, `font`, `memory_c_spot`, `nox_landing`, `memory_c_stage`, `memory_c_stage_m`, `memory_c_stage_b`, `mc_desk`, `mc_vault`, `mc_stand`, `mc_stand_bundle`, `mc_bed`, `mc_bed_bundle`, `mc_nurse`, `mc_nurse_blanket`, `mc_oldest`, `see`, `shelter`, `choose`, `keyhole`, `nox_key`, `party_stop_door`, `party_stop_door_m`, `party_stop_door_b`, `ink_door`)

- `unwritten_arrival`: on enter. Pan to `shelter`; Bram, Mira.
- `keeper_memory_c`: `memory_c_trig` on the first landing. Nox at `nox_landing`, the party on `memory_c_stage`; the memory
  in at `memory_c_spot`. Four pictures, each a pan: the desk (`first_keeper_m` at `mc_desk`); the vault (`mc_vault`, the
  smoke under a door; he walks to `mc_stand`; the page `run`); the infirmary (`mc_bed`: `elowen_m` and the baby bundle
  `bundle_m`, sprite `prop_ep8_bundle`, at `mc_bed_bundle`; the blot; the nurse `nurse_m` at `mc_nurse` with the empty
  blanket `blanket_m`, sprite `prop_ep8_blanket`, at `mc_nurse_blanket`); the stair (`mc_stand`, the bundle at
  `mc_stand_bundle`; his line; the page `note`); the camera holds on the oldest page (`mc_oldest`) 60 frames before its
  box. The memory out (`mystery`). The vault fire is smoke under a door and a lamp glow, never people in it; nobody in
  the pictures is hurt. 16 boxes.
- `the_name`: `name_trig` by the keyhole (after `keeper_memory_c` and `ink_key_found`). Nox at `nox_key`, the party on
  `party_stop_door`; silence; pan to `keyhole`; one `bell_thirteenth` before her "{hero}."; Mira and Bram turn to the hero;
  `mystery`; pan to `ink_door`, `door_unlock`; 16 boxes.
- Focus marks, `ep8_library_f3` (34 x 40: x 12 to 21, y 7 to 32): `memory_c_spot` (17, 32: 17, 16, 32, 7), `memory_c_stage`
  (16, 32: 16, 17, 32, 7), `nox_landing` (18, 30: 18, 15, 30, 9), `mc_desk` (14, 30: 14, 19, 30, 9), `mc_vault` (20, 31:
  20, 13, 31, 8), `mc_stand` (19, 29: 19, 14, 29, 10), `mc_bed` (13, 28: 13, 20, 28, 11), `mc_nurse` (15, 28: 15, 18, 28,
  11), `mc_oldest` (14, 29: 14, 19, 29, 10), `shelter` (17, 20: 17, 16, 20, 19), `keyhole` (17, 7: 17, 16, 7, 32),
  `party_stop_door` (17, 10: 17, 16, 10, 29), `nox_key` (17, 8: 17, 16, 8, 31), `ink_door` (17, 7). (The plan's keyhole
  landing at y 1 to 5 is under 7 from the top: give the door its landing at y 7 or below, or grow the map by two rows.)
  The memory's pictures are staged on the first landing as vignettes: the four marks are cells of that landing, not the
  real vault or infirmary.

### `ep8_last_word` (marks `entry`, `party_stop`, `party_stop_m`, `party_stop_b`, `lectern`, `dais`, `dome`, `book_front`, `vex_gallery`, `vex_stop`, `nox_spot`, `nox_shelf`, `shelf`, `shelf_stage`, `shelf_stage_m`, `shelf_stage_b`)

- `eraser`: `eraser_trig` at the entry. Silence; Nox at `nox_spot`; the Librarian spawned at `lectern`; the party on
  `party_stop`; pans `dais`, `dome`, `lectern`; Vex from `vex_gallery` runs to `vex_stop`; the swap on `lectern`; the
  choice; Mira's tip; the arc line; the card; `boss_eraser`; a win chains `eraser_after`.
- `eraser_after`: `eraser_v` respawned on `lectern` (a reload), Nox on `nox_spot`, Vex on `vex_stop`; the swap to the First
  Keeper on `lectern`; pan to `book_front` for the First Lexicon; `sorrow`, `triumph`, `mystery`; gives `name_fragment_8`;
  chains `last_choice`.
- `last_choice`: on the same marks; `mystery`; the choice and its confirm; the canon conclusion; the ending's title card;
  his after-clear line; chains `last_page`.
- `last_page`: silence; Nox at `nox_shelf`, the party on `shelf_stage`, two below `shelf` (the first shelf at the dais's
  foot); pans `shelf`, `book_front` (the run), `lectern` ("...My doing."), `shelf`, `dome` (the star), `book_front` (the
  last page); `kept` on the star, `name_restore` and the HUD flash on the hero's name; the witness line; `scriptorium_town`.
- Focus marks, `ep8_last_word` (28 x 24: x 12 to 15, y 7 to 16): `lectern` (14, 9: 14, 13, 9, 14), `dais` (14, 8: 14, 13,
  8, 15), `dome` (14, 7: 14, 13, 7, 16; the overhead prop's focus cell), `book_front` (14, 10: 14, 13, 10, 13), `party_stop`
  (14, 14: 14, 13, 14, 9), `nox_spot` (12, 13: 12, 15, 13, 10), `vex_stop` (15, 13: 15, 12, 13, 10), `shelf` (14, 12: 14,
  13, 12, 11), `shelf_stage` (14, 14: 14, 13, 14, 9), `nox_shelf` (12, 12: 12, 15, 12, 11). (28 wide leaves a four-column
  band: widen to 32 if the gallery stair `vex_gallery` and the dais must sit side by side; `vex_gallery` itself is off the
  focus list, Vex is seen arriving at `vex_stop`.)

### `ep8_bell_night` (a copy of `bell_tower`: marks `stair_foot`, `bells`, `top`, plus `mira_beam`, `bram_beam`)

- `thirteenth_name` on enter (the arrival): night tint, Mira (`mira_beam`, sprite `mira`) and Bram (`bram_beam`, sprite
  `bram`) on the bell beam, waiting; fade in. No box. The followers do not climb (map contract above).
- `ep8_toll_1` to `ep8_toll_12` (`ep8_toll_2`, `ep8_toll_3`, `ep8_toll_4`, `ep8_toll_5`, `ep8_toll_6`, `ep8_toll_7`, `ep8_toll_8`,
  `ep8_toll_9`, `ep8_toll_10`, `ep8_toll_11` between): the toll steps (bell_tower.js `TOLL_STEPS`, bottom to top), each `bell_toll`, its flag,
  the caption (`s.tollName`), 84 frames; step n only after step n-1, the cold open's twelve names in its order: Hazel,
  Mael, Oren, Pip, Tess, Iris, Holt, Garrick, Nella, Wick, Edda, Bram.
- `thirteenth_name` on `trig_thirteenth` (after `ep8_toll_12`): silence, `bell_thirteenth`, a shake, the hero's `!` and the
  pan to `bells`; the name `{hero}`; 90 frames of held quiet; black; the cold open's card with "This one was kept.";
  `the_last_word` under the end title; `ep8_complete`. The bell tower is an interior column: exempt.

## 4. The seven realm books (plan 4.11; text keys in `text.js` `EP8_REALMS`)

A `popbook` event's `text` field is the key; its float line names the realm once on the first open, flavor only.

| Map | Event, text key |
|---|---|
| `ep8_stair` | `pb_willow` `ep8_realm_willowmere` (Gap A) |
| `ep8_library_f1` | `pb_hollow` `ep8_realm_hollow` (E, the northern shelf), `pb_ember` `ep8_realm_ember` (C) |
| `ep8_library_f2` | `pb_valewyn` `ep8_realm_valewyn` (B), `pb_desert` `ep8_realm_desert` (C) |
| `ep8_library_f3` | `pb_isles` `ep8_realm_isles` (SHELTER), `pb_north` `ep8_realm_north` (SHELTER's pair) |

## 5. The witness quests (plan 5.3, EPISODE8 choice 15)

`last_page` counts the eight below (story.js `WITNESS_FLAGS`): five or more, the canon open-council line; fewer, the canon
seven-councils line. Root canon counts its eight side quests (`lq:bell:done` to `lq:first:concordance`); each row is the
NEXT quest closest to the root's (Inference, confirmed in the data on 2026-11-15: every flag exists and is set by its
quest's last step).

| Episode | Root key | NEXT flag | Quest |
|---|---|---|---|
| 1 | `lq:bell:done` (the Thirteenth Bell) | `nella_bell_done` | Nella's Ferry Bell (core quests.js) |
| 2 | `lq:hollow:fountain` | `fountain_done` | The Fountain of Faces |
| 3 | `lq:ember:coolant` | `coolant_done` | The Coolant Station |
| 4 | `lq:vale:plan` | `witnesses_done` | Three Witnesses (ep4) |
| 5 | `lq:oracle:shrine` | `roads_done` | Three Roads Home (ep5) |
| 6 | `lq:sky:beacon` | `beacon_lit` | The Signal Beacon of Lost Flights (ep6) |
| 7 | `lq:frost:hearth` | `hearth_lit` | The Hearth of Returning Names (ep7) |
| 8 | `lq:first:concordance` | `concordance_lit` | The Living Concordance |

## 6. Inspect lines (registered from `text.js`)

| Map | Line ids |
|---|---|
| save points (each its own key) | `ep8_desk` (the Stair's reading desk), `ep8_fountain` (the three Library fonts), `ep8_index_bell` (the Index), `ep8_folio` (the square, once lit) |
| `ep7_stillheart` (patch) | `ep8_stair_door` |
| `ep8_stair` | `ep8_script_step`, `ep8_void`, `ep8_book_shut`, `ep8_book_open`, `ep8_rubbed_line`, `ep8_margin_arch`, `ep8_library_far` |
| `ep8_scriptorium` | `ep8_sign_a` to `ep8_sign_f` (`ep8_sign_b`, `ep8_sign_c`, `ep8_sign_d`, `ep8_sign_e`: two states each), `ep8_book_window`, `ep8_dry_pens`, `ep8_ink_canal`, `ep8_living_codex`, `ep8_candle_post`, `ep8_blankets`, `ep8_register`, `ep8_bindery`, `ep8_infirmary_door`, `ep8_library_gate`, `ep8_lexicon_door`, `sign_ep8_inn`, `sign_ep8_shop`, `sign_ep8_atelier`, `sign_ep8_index` |
| `ep8_sc_index` | `ep8_card_drawers`, `ep8_index_desk`, `ep8_back_door`, `ep8_first_drawer` (Cut 1 only: Quinn's LEGACY line) |
| `ep8_library_f1` | `ep8_drawer_wall`, `ep8_alcove`, `ep8_dash_drawers`, `ep8_north_shelf`, `ep8_doorway` |
| `ep8_library_f2` | `ep8_overwritten`, `ep8_printing_room`, `ep8_page_names`, `ep8_page_order`, `ep8_page_correction`, `ep8_archive_shelf`, `ep8_seal_gallery` |
| `ep8_library_f3` | `ep8_blank_page`, `ep8_see`, `ep8_shelter`, `ep8_choose` (one over each landing's stair: inscriptions, never an order), `ep8_charter`, `ep8_keyhole`, `ep8_hidden_ink` |
| `ep8_last_word` | `ep8_great_lexicon`, `ep8_first_shelf`, `ep8_star_dome`, `ep8_lectern` |
| `ep8_bell_night` | `ep8_keep_one` (the bell beam); `ep8_bell_listen` (the post-game Listen on `bell_tower`'s top step, if E8-world can add it without a core edit) |

Two older lines gain an Episode 8 state (text.js `EP8_LINE_STATES`, the shipped words the fallback): `home_blanket` (core,
Episode 1) gains its third line after `ep8_complete`, and `ep5_mural` (Saffron Haven) shows the eighth sign after
`eighth_star`. No Episode 8 event may name an older episode's text key (PLAYTEST_REVIEW_8 item 7); the story test reads every
`src/data/maps/ep8_*.js` event once the maps exist. Books: `keeper_hid` (the Archive's gold chest, F2), `living_charter`
(by the keyhole, F3; the canon Charter, word for word), `concordance_folio` (the folio, the square).

## 7. NPCs

| Record | Map, mark | Shown | Notes |
|---|---|---|---|
| `elowen` | `ep8_scriptorium` `elowen_stall` | always | talk entries `elowen_scriptorium` (after `read_learned`), `testimony_elowen`; sprite `npc_elowen` |
| `ione` | `ep8_scriptorium` `ione_spot` | always | talk entry `concordance_start`; her canon third line held to `keeper_named` |
| `fen` | `ep8_scriptorium` `fen_spot` | always | talk entry `testimony_fen` |
| `quinn` | `ep8_scriptorium` `quinn_gate` | always | talk entries `drift_start`, `drift_done`; shop `quinn_satchel`; the read-backwards line never used |
| `sorel` | `ep8_sc_atelier` `counter` | always | shop `glyphsmith` |
| `arun` | `ep8_scriptorium` `arun_post` | always | his canon third line held to `scriptorium_open` |
| `meya` | `ep8_scriptorium` `meya_steps` | always | her canon third line held to `scriptorium_open` |
| `ep8_innkeeper` | `ep8_sc_inn` `counter` | always | inn, 160 gold; sprite `npc_innkeeper` (E8-sprites may give it a recolor id) |
| `ep8_shopkeeper` | `ep8_sc_shop` `counter` | always | shop `bibliotheca`; sprite `npc_shopkeeper` |
| `ep8_librarian` | `ep8_sc_index` `librarian_desk` | `ifNot: librarian_met` | **changed from the plan** ("until `library_open`"): he goes up through his door in `meet_librarian` |
| `first_keeper` | `ep8_sc_index` `librarian_desk` | `keeper_named` | the post-game resident; the canon after-clear line |
| `vex8` | `ep8_scriptorium` `vex_step` | `scriptorium_open` | **new**: Vex on the bindery step after the end; Ledger alias of `vex` |

Returning cast through `prependTalk` (npcs.js `EP8_TALK_PREPEND`): Palehaven (`nox_t`, `bryn`, `eira`, `torr` on the
morning; all six and Nox after the end), Zephyr Landing, Saffron Haven, Valewyn, Emberpeak, Hollowmere and Willowmere
(one post-game line each; Hazel two by `told_hazel`; Tess's and Mael's are the bible's), `hollis` in the Deep Stacks, and
`hesper` only while X1 is live. Bram's LEGACY kitchen line is his post-game Talk (quests.js, `BRAM_KITCHEN`).

## 8. Choices left at their defaults pending Stephen, and the scenes that hang on each

Every choice of EPISODE8 section 11 except 1 and 3 (Scott's) is a default pending Stephen. The script is written so each
can change in one place:

| Choice (default) | Scenes and data that change | How cheap |
|---|---|---|
| 2. Mira's episode; Nox and Vex non-fighting guests | `first_word`, the tips, every Nox spawn | Nox's lines are spawns; drop or move a spawn |
| 4. One man in three records | `meet_librarian`, `eraser`, `eraser_after`, the records `ep8_librarian`, `first_keeper` | the swaps are two despawn/spawn pairs on `lectern` |
| 5, 6, 7. Elowen, alive, forgot, remembers, does not ask | `elowen_scriptorium`, `last_page` (the birth line), `scriptorium_open`, `eraser_after` ("Your mother"), her record and Ledger row, `testimony_elowen` | her lines are in two scenes; the birth line is one box |
| 8. Iona and Ione are one | `ione` record (both line sets) | split the talk list |
| 9. Nox climbs, says the name, stays | `the_name`, `scriptorium_open`, her post-game prepend | |
| 10. Vex's Last Margin; he stays | `eraser` (two boxes), `scriptorium_open` (one), `vex8` | |
| 11. Three truth choices | `ep8_roof` (with one line in `the_name`), `elowen_scriptorium` (the gift), `home` (one line and Hazel's post-game pair) | each is one choice and one or two lines |
| 12. The canon final choice, permanent | `last_choice`, `ENDINGS`, the journal's two last steps, the credits' ending card | one ending: drop the choice, keep one entry |
| 13. The eighth star's sign | `last_page` (one box and the `star` page), `ep8_star_dome`, the mural state | |
| 14. The bell bookend, "This one was kept." | `thirteenth_name`, `COLD_OPEN_CARD` | |
| 15. The witness count | `WITNESS_FLAGS` (section 5) | one array |
| 16. "Rubbed out" | `first_rub`, `first_word`, `EP8_BATTLE_TEXT`, the bestiary | text only |
| 17, 18. Four phases; Answer returns | E8-battle; the phase lines in `EP8_BATTLE_TEXT`; Mira's Eraser tip | |
| 19. Fine Print stays out | `ep8_morning`'s `tier_1` guard | |
| 21. The cards | `credits.js` | |
| 22. The held portrait | `PORTRAIT.first_keeper` in story.js | |
| 23. Renames and drops | the records and lines named in EPISODE8 section 8 | |
| 25. The novel's night as the spine | `keeper_memory_c`, `the_name`, `last_page`, `elowen_scriptorium`, the bestiary and inspect lines that name the seal; nothing quotes the book | the night is two scenes; Stephen may keep any fact for the book |
| 26. His own name never shown | `last_page` ("a name"), the Ledger row "The First Keeper" | |
| 27. KEEP ONE on the bell beam | `ep8_keep_one`, the bell night's decal | one inspect line |
| 28. The Watch opening | `ep8_morning`'s marks | |
| 29. Tougher, not longer | E8-battle | |

## 9. Contracts for the other agents

- **E8-pack.** `src/data/ep8/{flags,npcs,quests,text,story,ledger,credits}.js` each export `register()` (and it as the
  default). `quests.register({ ep8Live })`, `ledger.register({ ep8Live })` and `npcs.register({ x1Live })` read the switches
  when no option is given. `quests.js` puts `['ep8_started', MAIN_QUEST_EP8]` at the front of `QUEST_EXT`. `credits.js`
  exports `CREDITS_EP8`, `creditsEp8(hasFlag, count)`, `END_CARD_EP8`, `END_CARD_EP7_LIVE`, `END_TITLE_EP8`, `EPISODE8_CARD`
  for `CREDITS_HANDOFF[8]` (map `hero_home`, mark `bed`, counter `credits8_rolled`, flag `ep8_complete`). `story.js` exports
  `GATE` (set `GATE.live = true` on the `?ep=8` entry), `STAIR_FOOT`, `BELL_FOOT`, `HOME_DOOR`. `text.js` register also
  patches `home_blanket` and `ep5_mural` (`patchLines`; `unpatchLines` for a test).
- **E8-maps-a.** Every patch event and mark of sections 2 and 3 for `ep7_ph_watch`, `ep7_stillheart`, `ep8_stair`,
  `ep8_scriptorium`, the interiors and `ep8_bell_night`; the realm book events of section 4; the inspect ids of section 6;
  the NPC marks of section 7. If a stage mark moves, tell E8-story only when the scene's warps (`STAIR_FOOT`, `BELL_FOOT`)
  must move.
- **E8-maps-b.** The Library and Last Word marks and triggers of sections 2 and 3, the lift triggers, the reload enter
  triggers, the lectern's `last_choice` trigger, `square_return`.
- **E8-battle.** Encounters `e8s_first` (no flee), `unnamed_sentry` and `eraser` (boss, no flee). Mira's tips (`TIPS`):
  `unwrite` carries the `unwrite` flag and Read Aloud breaks it; `last_silence` the `last_silence` flag and its
  `SIGNATURE_TECHS` entry; `read_aloud` is Mira's "Read Aloud", `learn: { flag: 'read_learned' }`. The +25 Fury reads
  `concordance_lit`. Items the story gives or takes: `vex_note`, `reader_card`, `name_fragment_8`, `evidence_page` (3),
  `drift_page` (3), `binders_awl`, `riverwater_thread`, `bookcloth_coat`, `runners_ribbon`, `hi_potion`, `hi_ether`, gold.
  Every Erasure, Read Aloud, Unwrite and phase message is in `text.js` `EP8_BATTLE_TEXT`.
- **E8-scene-ui.** `EP8_BOSS_CARDS`, `EP8_ARC_LINES`, `EP8_BATTLE_TEXT`; the helpers `s.inkBlot`, `s.hudNameFlash`,
  `s.tollName`, `s.goto`; the bell night's captions read the `ep8_toll_*` flags with `EP8_TOLL_NAMES` (flags.js), as
  scenes/prologue.js reads the cold open's; the credits' `art` field per card (each realm's existing key art).
- **E8-tiles.** The page kinds, modes and steps of section 1; the words over each page are the narration boxes of the scene.
- **E8-sprites.** Spawned sprites: `npc_keeper`, `npc_vex`, `npc_vex_kneel`, `npc_aeris`, `npc_parent`, `npc_scholar`,
  `mira`, `bram`, `index_hound` (field), `eraser_avatar`, `npc_librarian`, `npc_first_keeper`, `npc_first_keeper_m`,
  `npc_elowen_m`, `npc_nurse_m`, `npc_rootbound_keeper_m`, `prop_ep8_bundle`, `prop_ep8_blanket` (the two prop ids are
  E8-story's names for plan 9.2's bundle and empty blanket); records: `npc_elowen`, `npc_ione`, `npc_fen`, `npc_quinn`,
  `npc_sorel`, `npc_arun`, `npc_meya`; portraits `first_keeper`, `eraser`.
- **E8-audio.** Cues used: `palehaven`, `orrery`, `mystery`, `scriptorium_town`, `first_library`, `sorrow`, `triumph`,
  `battle`, `boss_eraser`, `willowmere`, `the_last_word`; sfx `rub_out`, `read_cast`, `bell_toll`, `bell_thirteenth`,
  `name_restore`, `kept`, `ink_gurgle`, `gate_open`, `door_unlock`, `footstep_stone`, `boss_die`, `chest_open`,
  `level_up_sparkle`.
