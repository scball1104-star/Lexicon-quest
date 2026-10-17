# Episode 1 staging guide

For map authors (W2-maps), the cutscene runner (W2-world) and the integrator. It says, for every scripted
scene in `src/data/story/ep1.js`: which map, what starts it, who stands where, which props and marks must
exist, what the camera does and which music plays. Dialogue text is not repeated here; read the scene.

Owner: W1-content. If a map cannot honor something here, change the map and tell the story owner, or
propose a change; do not edit `ep1.js` blind (the content tests in `qa/content/` will catch broken ids).

---

## 1. Cutscene API as used by ep1.js

DESIGN 5.4 lists the primitives. These are the exact signatures and meanings the script relies on.
Everything returns a promise (or a plain value) and every call is awaited.

| Call | Meaning |
|---|---|
| `lockInput()` / `unlockInput()` | Every scene is wrapped in these (the wrapper also releases on error). |
| `say(who, text, opts?)` | One dialogue box. `who`: an actor id (`hero`, `mira`, `bram`, an NPC id from `npcs.js`, a spawned id, or a map actor `echo_warden` / `archivore`), or `null` for narration (no name tag, no portrait). `opts.portrait`: portrait id (`hero`, `mira`, `bram`, `mael`). If no portrait is given, the UI may use `NPCS[who].portrait` when that asset exists. Display names come from `speakerName(who)` in `npcs.js` (spawned actors carry their own `name`). Resolves when the player dismisses the box. Text tokens: `{hero}`, `{c:color}..{/c}`. |
| `choice(options)` | Shows options (max 28 characters each) under the last box. Resolves to the chosen index. Cancel picks the last option. |
| `walk(who, path, opts?)` | `path` is either an array of `'up'|'down'|'left'|'right'` steps, or a **string naming a mark, event or actor**: pathfind to that tile (for an actor: the free tile next to it). `opts.speed`: `'walk'` (default), `'run'`, `'slow'`. When `who` is `hero`, the followers trail as usual. |
| `face(who, dirOrActor)` | A direction, or another actor id to turn toward. |
| `jump(who)` | A small hop in place. |
| `emote(who, kind)` | Balloon over the actor: `! ? ... heart sweat anger music zzz`. |
| `wait(frames)` | 60 frames = 1 second. |
| `camera.panTo(target, frames)` | `target` is a **mark / event / actor name** (string), or tile `x, y` followed by frames. `frames` 0 = cut. |
| `camera.follow(who)` | Return the camera to following an actor (usually `hero`). |
| `shake(intensity, frames)`, `flash(color, frames)` | Skipped under `reduceMotion`. |
| `fade('in'|'out', frames)` | Black fade. |
| `tint(name, frames)` | Screen tint: `none`, `dawn`, `day`, `dusk`, `night`, `ink`, or a hex color. |
| `music(id|null)` | Crossfade to a track; `null` fades to silence. |
| `sfx(id)` | One-shot sound (ids in `assets/audio/manifest.json`; missing ids are silent). |
| `spawn(id, {sprite, name, at, dir})` | Add a temporary actor at a mark (`at`) or at `x, y`. `name` is its speech tag. |
| `despawn(id)` | Remove an actor (spawned, NPC or map actor). |
| `setFlag(flag, value=true)`, `hasFlag(flag)` | Story flags (all declared in `quests.js` FLAGS). `hasFlag` may be sync or async; the script awaits it. |
| `give(itemId, qty=1)`, `take(itemId, qty=1)` | Inventory change with the standard "Received ..." window and jingle (`key_item` for key items). |
| `battle(encounterId, {boss, canFlee})` | Runs an encounter from `encounters.js`. Resolves to `'win'`, `'lose'` or `'flee'`. On a boss loss the engine runs Game Over; the script simply returns. |
| `addMember(id)` | Add `mira` or `bram` to the party (follower chain, `party_join` jingle). The script first walks the NPC to the hero and despawns it, then prints the "joined the party!" line itself. |
| `title(text, {sub, frames})` | A full-screen title card (prologue cards, end cards). |

**Scene guards.** `SCENE_CONDITIONS` in `ep1.js` lists the flags each scene needs. The wrapper checks them
before locking input, so a trigger that fires too early or a second time does nothing. Map triggers can
therefore be simple and do not need `once`.

**Proposed DESIGN additions** (also in the W1-content report): string targets for `walk` / `camera.panTo` /
`spawn({at})`, and a `marks: { name: [x, y] }` table in each map module.

---

## 2. Map conventions the story needs

- **Marks.** Each map module exports `marks: { name: [x, y] }`. Scenes refer to marks, event ids and actor ids
  by name. Every mark listed below must exist on its map.
- **NPC events.** Place `{ id: '<npcId>', type: 'npc', x, y }`; sprite, movement, presence and talk come from
  `NPCS[npcId]` (`npcs.js`: use `isPresent`, `moveFor`, `talkTo`). The event id must equal the NPC id, because
  scenes address actors by that id.
- **Triggers.** `{ type: 'trigger', script: '<sceneId>' }` with either a tile area (step trigger) or
  `on: 'enter'` (runs once the map has faded in). No flags needed: the scene guards itself.
- **Inspect text.** `{ type: 'sign', text: '<lineId>' }` reads `lines[lineId]` from `ep1.js` (a string, a list of
  boxes, or a first-match conditional list). Books: `{ type: 'book', book: '<bookId>' }` reads `BOOKS` in
  `text.js` (title, then pages).
- **Scripted objects.** An inspectable object that runs a scene: `{ type: 'object', script: '<sceneId>', sprite? }`.
- **Location banners.** `BANNERS[mapId]` in `text.js`.

### Visual state driven by flags

| Flag | What changes |
|---|---|
| `signs_fading` (set in `fading_sign`) | Shop signs, the inn sign and the square sign draw blank or half-faded. |
| `left_town` | The WILLOWMERE sign over the gate draws half-faded. |
| `archivore_defeated` | Every sign is restored. Hal appears in the bakery. The root passage in `archive_boss` opens. The town is back to normal colors. |
| `ep1_complete` | Post-game state (NPC lines change). After the credits, load `hero_home` at `bed` in day lighting: Hazel's last line pays off there. |
| `nella_bell_done` | The valley north landing bell post becomes an exit to the Willowmere ferry landing (ferry shortcut). |
| `starter_quest_started` and not `starter_found` | `starter_dough` sits by the smithy forge. |
| `nella_quest_started` and not `ferry_bell_found` | The bell (`prop_ferry_bell`) glints in the valley shallows. |

---

## 3. Geography the dialogue depends on

Party chat ("Talk"), journal text and NPC directions name these places. Keep the relative layout.

**Willowmere** (town on the west bank of the river, at the south end of the valley)
- Center: **Lantern Square** with the **well** (Elder Mael stands beside it) and the great lantern post.
- North of the square: the **chapel** and its **bell tower**, the tallest building in town.
- East side of the square: the **library**. Behind it: **Cobb's chicken run**.
- West of the square: the **hero's home** on a short lane, with **Oren's bakery** across the lane from its door
  (the bakery's hanging sign must be visible from the hero's doorstep). A narrow side alley by the bakery
  holds **Loaf** the cat (never on a required path).
- The **river** runs along the north and east edges. Northeast: the **Lantern Inn** with the **ferry landing**
  beside it (Nella). Along the river road: **Edda's twelve flowerbeds** plus a thirteenth bed with no stake,
  and the **Duke's nest** in the reeds.
- South: the main road from the square down to the **south square** (notice board, Tess) and the **south
  gate** (Bram at the left post, Holt at the right, the WILLOWMERE sign above the arch).
- **Item shop** (Willowmere Goods) southwest of the square; **smithy** (Mossforge Smithy) southeast.

**Willowmere Valley** (river runs north to south through the middle)
- Willowmere's gate opens onto the valley's southwest corner.
- The road runs east to the **bridge** (Penny's cart at the far end), then north along the east bank as the
  **pilgrim road**.
- At the **fork**: the **milestone**, the fork signpost, and the **Pilgrim's Rest** campfire (Quill). Roads go
  north (Archive), west (Willowmere) and east (toward the Hollow lands; blocked in Episode 1 by deep forest or a
  washed-out ford).
- Placed uniques (battle-rules): `thornwake` in a Whisperwood secret (needs the Lantern, so it is found on the
  way home); `wayfarer_mantle` in an Archive F1 secret chest; `first_quill` in an F3 Lantern-revealed chest.
- North end: the **Rootbound Archive**, a library grown into an enormous willow. Near it, the **north landing**
  with an empty bell post. The **shallows** just downstream (south) of the landing hold Nella's bell.
- East edge: the **Whisperwood** treeline (secret: `thornwake`, needs the Lantern). West meadow: the **hollow
  tree** cache (secret). Visible enemies: briar wolves, moss scarabs, ink slimes.

**Rootbound Archive**: F1 Catalog Halls (card-catalog walls, keys, push blocks), F2 Reading Galleries (reading
desks with ghostly ink readers, the Echo Warden, hidden-ink bridges), F3 Rootbound Stacks (roots, moving
shelves, dark rooms with braziers, the thirteenth bell, the great door), then the **Heart of the Archive**.

---

## 4. Scene by scene

Music: each map plays its own track (`willowmere`, `valley`, `archive`) unless the scene says otherwise.

### prologue
- Where: before `hero_home`, over the title key art (`scenes/prologue.js` may also read `PROLOGUE` directly).
- Order: Title, New Game, name entry, prologue, `hero_home`. Skippable.
- Music: `title`. Six `title()` cards, about 4 s each.

### wake_up
- Map: `hero_home`. Trigger: `on: 'enter'` (scene needs `intro_done` unset, so it only plays once).
- Start: hero on mark **`bed`** facing down (sleep pose if available). The tile **below `bed` must be floor**.
- Hazel (NPC `hazel`) at her spot by the hearth, at least two open tiles from the bed. Mark **`bedside`**: the
  floor tile next to the bed where she stops.
- Lighting `dawn`. Hero emotes zzz, Hazel calls, walks to `bedside`, hero hops awake and steps down.
- Gives `potion` x2. Sets `intro_done`.

### hazel_farewell (optional)
- Map: `hero_home`. Talk to Hazel after `met_mael`, before the Archivore. Gives `wool_mantle`.

### fading_sign
- Map: `willowmere`. Step trigger on the tile(s) just outside the hero's front door (mark **`home_door`**).
- Marks: **`bakery_sign`** (the bakery's hanging sign; camera pans there), **`bakery_door`** (the tile in front
  of the bakery door; the tile below it must be open).
- Oren is spawned at `bakery_door` as `oren_out` (sprite `npc_baker`), steps down, talks, steps back, despawns.
- SFX `sign_fade` as `signs_fading` is set: the sign must visibly go blank at that moment (swap frame).
- Camera: pan to `bakery_sign` (40 frames), then follow hero.

### mael_intro
- Map: `willowmere`. Talk to Mael (NPC `mael` by the well). Needs `intro_done`.
- Mark **`bell_tower`**: a tile at the foot or top of the bell tower; camera pans there mid-scene and back.
- Ends with Mael turning away to read the Town Register (prop: he holds a ledger; an emote is enough).
- Sets `met_mael`.

### mira_joins
- Map: `library`. Trigger: `on: 'enter'` (needs `met_mael`, not `mira_joined`). Talking to Mira also starts it.
- Mira (NPC `mira`, party sprite) at a reading table piled with books, facing a shelf. Iris (NPC `iris`) at her
  desk, able to see both Mira and the door.
- Mark **`mira_meet`**: an open tile about two tiles in front of the entrance, between Mira and the door.
- Camera: pan to Mira, then follow hero. Mira walks to `mira_meet`, later to the hero, despawns, joins.
- Sets `mira_joined`.

### south_gate (Bram joins)
- Map: `willowmere`. Step trigger across the road two tiles north of the gate (mark **`gate_inner`**). Talking
  to Bram also runs it. Before Mira joins it is a short "nobody leaves alone" stop and pushes the hero one
  tile back north (that tile must be open). With Mira, it is the full scene.
- Bram (NPC `bram`, party sprite) at the left gate post; Sergeant Holt (NPC `holt`) at the right post.
- Bram walks to the hero, despawns, joins. Sets `bram_joined`.

### garrick_farewell (optional)
- Map: `smithy`. Talk to Garrick with Bram in the party, before the Archivore. Gives the hero a `hatchet`.

### leave_town
- Map: `willowmere`. Step trigger on the row directly in front of the gate exit (after `gate_inner`).
- Mark **`town_sign`**: the WILLOWMERE sign over the gate arch. Camera pans there; SFX `sign_fade`, a 4-frame
  flash. Sets `left_town` (gate sign now draws half-faded).

### valley_arrival
- Map: `valley`. Trigger `on: 'enter'` (plays the first time the full party arrives). Sets `valley_arrived`.

### milestone
- Map: `valley`. The milestone is an object (`prop_milestone`) with `script: 'milestone'`. First read with the
  party adds Mira and Bram's lines and sets `saw_milestone`; later reads only show the inscription.

### archive_door
- Map: `valley`, north end. Step trigger on mark **`door_step`** (the tile directly in front of the great door).
- Mark **`archive_door`**: the door itself (camera pans there, 60 frames). **The tiles directly left and right of
  `door_step` must be open**: Bram steps left, Mira steps right, the hero takes the step.
- The door event (exit to `archive_f1`) stays shut until `archive_entered`. SFX `name_restore` per name,
  `door_rumble` on opening. Sets `archive_entered`.

### archive_f1_arrival
- Map: `archive_f1`. Trigger `on: 'enter'`. Music `archive`.
- Mark **`catalog_drawer`**: a floor tile facing a wall of card drawers, a few tiles from the entrance. Mira
  walks there and faces up. Sets `f1_arrived`.

### find_letter_1
- Map: `archive_f1`. Object `prop_letter` with `script: 'find_letter_1'` in an optional side room (the moss
  alcove). Gives `tess_letter_1`. Hide the object once `tess_letter_1_found` is set.

### archive_f1_bell
- Map: `archive_f1`. Step trigger on the landing in front of the stairs down (behind the locked gate).
- SFX `bell_toll`, shake. Sets `archive_f1_done`.

### archive_f2_arrival
- Map: `archive_f2`. Trigger `on: 'enter'`. Decor: two or three faint ink "readers" at desks (a translucent,
  ink-tinted `npc_scholar`, non-solid, or just a shimmering prop). Sets `f2_arrived`.

### find_letter_2
- Map: `archive_f2`. `prop_letter` with `script: 'find_letter_2'` in the southeast reading room.

### echo_warden
- Map: `archive_f2`. A long gallery. Map actor **`echo_warden`** (field sprite of the Echo Warden, facing
  down) stands in front of the lantern pedestal. Step trigger across the gallery 2 to 3 tiles in front of it.
- Music: silence, then the encounter's own music. Battle `echo_warden` (boss, no flee).
- After the win: flash, `page_flutter`, the Warden despawns. Music back to `archive`. Sets `echo_warden_defeated`.
- If the battle is lost the engine runs Game Over; on reload the trigger plays the scene again.

### lantern_get
- Map: `archive_f2`. Object **`lantern_pedestal`** (lantern pedestal tile) with `script: 'lantern_get'`, one or two
  tiles behind where the Warden stood. Gives `lantern_of_recall`. SFX `lantern_reveal`, green flash.
- The wall beside the pedestal shows hidden ink after this (sign `hidden_ink_1`). Sets `lantern_get`.

### archive_f2_exit
- Map: `archive_f2`. Step trigger in front of the stairs down, past the first hidden-ink bridge.
  Sets `archive_f2_done`. Sign `hidden_ink_2` on a wall near that bridge.

### archive_f3_arrival
- Map: `archive_f3`. Trigger `on: 'enter'`. SFX `shelf_move` (a shelf visibly slides if possible).

### find_letter_3
- Map: `archive_f3`. `prop_letter` with `script: 'find_letter_3'` wedged between roots in the western stacks.

### thirteenth_bell
- Map: `archive_f3`. A root hollow **on the main path** between the stacks and the great door, holding
  `prop_thirteenth_bell` at mark **`thirteenth_bell`**. Step trigger at the hollow's entrance.
- Camera pans to the bell (60 frames). SFX `bell_toll`, shake. Sets `found_thirteenth_bell`.
- The bell is also inspectable (sign `thirteenth_bell`).

### boss_door
- Map: `archive_f3`. The great door event **`boss_door`** with `script: 'boss_door'`.
- The Stacks Key chest elsewhere on the floor: `{ type: 'chest', item: 'stacks_key', flag: 'stacks_key_found' }`.
- Without the key: two lines. With it: a choice; "Not yet" leaves it shut. "Let's go" takes the key, plays
  `door_rumble`, and sets `boss_door_open` (the door then opens to `archive_boss`).
- Place a **Keeper's font** (heal) and the **shortcut** back to the F1 entrance within a short walk of the door.
  Sign `boss_door_plate` on the door, `hidden_ink_3` beside it (Lantern).

### archivore (before and after)
- Map: `archive_boss` (the Heart of the Archive: a hollow inside the willow, pages drifting). Trigger
  `on: 'enter'`. The party enters from the south.
- Map actor **`archivore`** (the boss's field sprite, large) at mark **`archivore`**, north center, facing up
  (it is eating), then turns down. Mark **`fragment_spot`**: two or three tiles south of it.
- Music: silence, then `boss_archivore`. Battle `archivore` (boss, no flee).
- After: shake, flash, the Archivore despawns into pages, camera to `fragment_spot`, gives `name_fragment_1`,
  music `triumph`. Sets `archivore_defeated`; a root passage opens (exit to the valley, mark `root_exit` near
  the Archive door).

### return_to_willowmere and ending_hook
- Map: `willowmere`. Trigger `on: 'enter'` (needs `archivore_defeated`, not `returned_home`), so it works whether
  the party walks in through the gate or rides Nella's ferry.
- Camera pans to `town_sign`, then the party walks to mark **`return_spot`** (Lantern Square, south of the well).
- Holt runs from his post to **`meet_holt`**. Then spawned townsfolk walk in from offscreen marks to their
  places around the party: `gather_garrick` to **`meet_garrick`**, `gather_iris` to **`meet_iris`**,
  `gather_oren` to **`meet_oren`** (running), `gather_hazel` to **`meet_hazel`**. Mael is the real NPC: he walks
  from his well spot to **`meet_mael`** (slow), so nothing spawns for him. The `gather_*` marks are 6 to 10 tiles
  away up the side streets; the `meet_*` marks form a loose semicircle around `return_spot`.
- Ending: fade out, the spawned townsfolk despawn, tint `night`, camera cuts to `bell_tower`, fade in, SFX
  `bell_peal` (the twelve bells), a pause, then `bell_toll` (the thirteenth). Music `mystery`. Two end cards.
- Sets `returned_home`, then `ep1_complete`. **Integrator:** when `ep1_complete` is set, push the credits scene
  (`CREDITS` in `text.js`, music `triumph`), then load `hero_home` at `bed` in daylight.

### Side quest scenes
| Scene | Map | Started by | Notes |
|---|---|---|---|
| `tess_letters` | willowmere | talk to Tess | Starts the quest, delivers any letters carried, gives `wayfarer_boots` on the third. |
| `oren_starter` | bakery | talk to Oren | Starts the quest, then completes it once `starter_found`. Gives `hi_potion` x2. |
| `starter_found` | smithy | talk to `starter_dough` | The dough sits on the warm bricks by the forge. |
| `wick_tag` | willowmere | talk to Wick | Starts, then completes once `wick_tag_found`. Gives `bronze_charm`. |
| `duck_nest` | willowmere | object at the Duke's nest | Takes the tag. Place the Duke (NPC `the_duke`) wandering beside it. |
| `nella_bell` | willowmere | talk to Nella | Starts, then completes once `ferry_bell_found`. Gives `river_charm`, opens the ferry. |
| `ferry_bell_found` | valley | object `prop_ferry_bell` in the shallows below the north landing | Needs `nella_quest_started`. |
| `hal_returns` | bakery | talk to Hal | Hal (NPC `hal`, sprite `npc_farmer`) only exists after the Archivore. |

---

## 5. Marks checklist

| Map | Marks / named events |
|---|---|
| `hero_home` | `bed`, `bedside`; NPC `hazel` |
| `willowmere` | `home_door`, `bakery_sign`, `bakery_door`, `well`, `bell_tower`, `gate_inner`, `town_sign`, `return_spot`, `meet_holt`, `gather_garrick`, `meet_garrick`, `gather_iris`, `meet_iris`, `gather_oren`, `meet_oren`, `gather_hazel`, `meet_hazel`, `meet_mael`; object `duck_nest`; NPCs `mael tess nella edda holt bram cobb henrietta bertha wick lark the_duke loaf` |
| `library` | `mira_meet`; NPCs `mira iris` |
| `smithy` | NPCs `garrick anvil starter_dough` |
| `bakery` | NPCs `oren hal` |
| `inn` | NPCs `hob barnaby` |
| `item_shop` | NPC `pell` |
| `chapel` | NPC `pip`; save bell object |
| `valley` | `archive_door`, `door_step` (+ open tiles left and right), `root_exit`; objects `milestone`, `prop_ferry_bell`; NPCs `quill penny` |
| `archive_f1` | `catalog_drawer`; object `prop_letter` (letter 1) |
| `archive_f2` | actor `echo_warden`; object `lantern_pedestal`; object `prop_letter` (letter 2) |
| `archive_f3` | `thirteenth_bell`; object `boss_door`; object `prop_letter` (letter 3); chest with flag `stacks_key_found` |
| `archive_boss` | actor `archivore`, `fragment_spot`, root passage exit |

## 6. Inspect text and books by map

| Map | `lines` ids (signs, props) | `BOOKS` ids |
|---|---|---|
| `hero_home` | `home_doorframe`, `home_blanket`, `home_loom`, `home_hearth`, `home_window`, `home_bookshelf` | |
| `willowmere` | `sign_bakery`, `sign_inn`, `sign_shop`, `sign_smithy`, `sign_library`, `sign_chapel`, `sign_square`, `town_sign`, `notice_board`, `well`, `flowerbeds`, `garden_plaque`, `ferry_landing` | |
| `chapel` | `chapel_plaque`, `chapel_ropes`, `save_bell` (then the save menu), `chapel_pews` | |
| `library` | `library_desk`, `library_globe`, `library_returns`, `mira_desk` | `tales_of_the_keepers`, `archive_visitors_guide`, `keeper_beasts`, `on_bells`, `riverwise`, `childs_map`, `willowmere_history` |
| `inn` | `inn_guestbook` | |
| `bakery` | `bakery_crock`, `flour_bin` | |
| `smithy` | `forge` | |
| `valley` | `valley_fork_sign`, `milestone` (object runs the scene), `hollow_tree`, `pilgrim_rest`, `bridge_plaque`, `ferry_post_valley`, `whisperwood_edge` | |
| `archive_f1` | `archive_door_carving` (valley side), `catalog_promise`, `catalog_drawers`, `marginalia`, `reading_desk` | `catalog_ledger`, `keeper_journal_1` |
| `archive_f2` | `reading_desk`, `hidden_ink_1`, `hidden_ink_2` | `readers_oath`, `keeper_journal_2` |
| `archive_f3` | `broken_chronicle`, `keeper_font`, `thirteenth_bell`, `boss_door_plate`, `hidden_ink_3` | `keeper_journal_3` |

`hidden_ink_*` texts only become readable once the Lantern reveals them.

## 7. Field remarks

`BARKS` in `text.js`: one companion line the first time something happens (first chest, first visible enemy,
first locked door, first pushed block, first switch, first dark room, first hidden-ink reveal, first font,
first elite, first rare and legendary drop, fleeing, the Pilgrim's Rest). Show each once per save, as a small
non-blocking line or a single box. Each entry is a first-match conditional list (the speaker must have joined).

## 8. The Talk command (party chat)

`partyChat(hasFlag, mapId)` in `quests.js` returns `{ step, lines, side, banter }`. Show `lines` (the hint for
the current main step, written for the current map), then `side` (at most one reminder for an active side
quest), then `banter` (one optional exchange about the current map) as ordinary dialogue boxes with the
speakers' portraits. Before Mira joins, the hint is the hero's own thought in parentheses and there is no banter.
`journal(hasFlag)` returns the main step text plus every started side quest (with the letter counter).
