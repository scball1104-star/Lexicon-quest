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
| `walk(who, path, opts?)` | `path` is either an array of `'up'|'down'|'left'|'right'` steps, or a **string naming a mark, event or actor**: pathfind to that tile (for an actor: the free tile next to it). `opts.speed`: `'walk'` (default), `'run'`, `'slow'`. When `who` is `hero`, the followers trail as usual. `who` may also be a map enemy's event id (`first_fight` drives `e_wolves_a`). |
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
  With `rest: true` (the valley campfire) the field runs the Keeper's font flow after the scene returns: "Rest
  here?", full heal, the save prompt. Such objects also carry `safe: true`.
- **Location banners.** `BANNERS[mapId]` in `text.js`.

### Visual state driven by flags

| Flag | What changes |
|---|---|
| `signs_fading` (set in `fading_sign`) | Shop signs, the inn sign and the square sign draw blank or half-faded. |
| `left_town` | The WILLOWMERE sign over the gate draws half-faded. |
| `archivore_defeated` | Every sign is restored. Hal appears in the bakery. The root passage in `archive_boss` opens. The town is back to normal colors. |
| `ep1_complete` | Post-game state (NPC lines change). After the credits, load `hero_home` at `bed` in day lighting: Hazel's last line pays off there. |
| `nella_bell_done` | The valley north landing bell post becomes an exit to the Willowmere ferry landing (ferry shortcut). |
| `briar_alpha_defeated` | The Briar Alpha map actor in Whisperwood Hollow is gone (its den is open; the stone and the gold chest stay). |
| `archive_f1_done` | The Keepers' back-stair appears on F1: `stairs_up` objects and doors `shortcut_b` (stairs landing J) and `shortcut_j` (antechamber B), both ways. |
| `first_fight_done` | The wolf pack `e_wolves_a` at the valley road bend stays a normal `chase` enemy; the scene only despawns it for the current visit. |
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
- Placed uniques (battle-rules): `pilgrim_reach` (the Pilgrim's Reach spear) in the Whisperwood pool secret (needs
  the Lantern, so it is found on the way home), `thornwake` (axe) from the Briar Alpha in Whisperwood Hollow; `wayfarer_mantle` in an Archive F1 secret chest; `first_quill` in an F3 Lantern-revealed chest.
- North end: the **Rootbound Archive**, a library grown into an enormous willow. Near it, the **north landing**
  with an empty bell post. The **shallows** just downstream (south) of the landing hold Nella's bell.
- East edge: the **Whisperwood** treeline (secret: `pilgrim_reach`, needs the Lantern). A root arch at the pool's
  north-west edge (mark `hollow_mouth`) leads down into **Whisperwood Hollow**, the optional dungeon (W6). West meadow: the **hollow
  tree** cache (secret). Visible enemies: briar wolves, moss scarabs, ink slimes.

**Whisperwood Hollow** (optional): a sunken root hollow under the pines. Stairs land on a small shore; a black
pool cuts it off from the hollow proper, and the pilgrims' lost bridge across it is hidden ink (Lantern). The
hollow holds wolves, an elite ink blot by an iron chest, a push block and plate for the barred door north, and
behind it the Briar Alpha's den with the pilgrims' stone (three names) and a gold chest.

**Rootbound Archive**: F1 Catalog Halls (card-catalog walls, keys, push blocks), F2 Reading Galleries (reading
desks with ghostly ink readers, the Echo Warden, hidden-ink bridges), F3 Rootbound Stacks (roots, moving
shelves, dark rooms with braziers, the thirteenth bell, the great door), then the **Heart of the Archive**.

---

## 4. Scene by scene

Music: each map plays its own track (`willowmere`, `valley`, `archive` on F1 and F2, `mystery` on F3) unless the
scene says otherwise. `music()` does not restore the map track by itself: a scene that leaves the map's track
must put it back before it ends (checked by the "music cues" test in `qa/content/story.test.mjs`).

Cue sheet (W8, CRITIQUE_3 #12), in story order:

| Scene | Cue |
|---|---|
| `fading_sign` | `mystery` as the painted name goes, back to `willowmere` when Oren walks off |
| `south_gate` (Bram joins) | `sorrow` enters in the silence after "tell him... tell...", holds through Holt's promise, `willowmere` before Bram joins |
| `campfire_rest` (Emberpeak answer) | `sorrow` from "The fire took the lower town", back to `valley` |
| `thirteenth_bell` | the F3 track drops to silence for the toll, then `mystery` (F3's own track) comes back in |
| `archivore` after the win | `triumph` at the fragment, `sorrow` when the hero's name stays faint; it carries out the root passage |
| `return_to_willowmere` | `triumph` at the gate, `sorrow` when Mael opens the Register ("Every name but one"), silence, then the bells |
| `ending_hook` | silence, `bell_peal`, `bell_toll`, `mystery` on "Thirteen." |

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
- Bram (NPC `bram`: the party field sprite and the `bram` portrait, so he is the same man in town, in the party and in
  the dungeon; `npcs.test.mjs` locks this) at the left gate post; Sergeant Holt (NPC `holt`) at the right post.
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

### first_fight
- Map: `valley`. Step trigger `first_fight_trig` down the whole of column 7 (rows 6 to 39: every passable cell at
  x 7, so the meadow offers no way round), a few steps out of the gate. Needs `bram_joined`, not `first_fight_done`.
- The wolf pack is the map enemy **`e_wolves_a`** (`valley_wolves`, `chase`, at the bend (14,33)). Camera pans to
  it (40 frames), both companions emote, the pack runs to the hero (`walk('e_wolves_a', 'hero', { speed: 'run' })`),
  camera back to the hero. Bram one box (the valley's first-enemy line and the Lunge tip), Mira one box (Appraise).
- `battle('valley_wolves', { canFlee: false })`. On a win the pack is despawned, two boxes, `first_fight_done`.
  On a loss the engine runs Game Over and the trigger fires again on reload. Four boxes in all, no signage.

### campfire_rest
- Map: `valley`. Object **`campfire`** (sprite `brazier_lit`, the Pilgrim's Rest fire at (39,22)) with
  `script: 'campfire_rest'`, `safe: true` and `rest: true`. Quill stands beside it; the log bench (38,23) carries the
  inspect sign `pilgrim_bench`.
- First visit (needs `bram_joined`): emotes, Bram's one box, a three-way choice (Bram about Emberpeak, Mira about
  the Archive, just rest), three boxes for the answer, sets `campfire_rested`. Later visits: Bram's one-box offer.
- The scene never heals: the field's rest flow (Rest here?, full heal, save prompt) runs after it returns.
  No second font or bell exists on this map.

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
- SFX `bell_toll`, shake. Sets `archive_f1_done`, then SFX `door_rumble`, a small shake and one narration box: the
  Keepers' back-stair (`shortcut_b_stairs` beside the stairs, `shortcut_j_stairs` in the antechamber) appears
  with the flag, so the player sees it open.

### archive_f2_arrival
- Map: `archive_f2`. Trigger `on: 'enter'`. Decor: two or three faint ink "readers" at desks (a translucent,
  ink-tinted `npc_scholar`, non-solid, or just a shimmering prop). Sets `f2_arrived`.

### find_letter_2
- Map: `archive_f2`. `prop_letter` with `script: 'find_letter_2'` in the southeast reading room.

### echo_warden
- Map: `archive_f2`. A long gallery. Map actor **`echo_warden`** (field sprite of the Echo Warden, facing
  down) stands in front of the lantern pedestal. Step trigger across the gallery 2 to 3 tiles in front of it.
- Music: silence, camera pans to the Warden (40 frames), half a second of nothing, then the dialogue. Boss intro
  after Mira's stance line: `title('ECHO WARDEN', { sub: 'Knight of the Last Order', frames: 100 })`, shake, flash,
  `music('battle')`, then battle `echo_warden` (boss, no flee).
- The stairs room (east) holds the floor's Keeper's font `keeper_font_f2` (`safe: true`): the breather before
  the Warden and the last heal before F3's font. There is no other font or bell on the floor.
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
- Music: silence, camera pans to the Archivore (40 frames), half a second of nothing, then the dialogue. Boss
  intro after Mira's last line: `title('THE ARCHIVORE', { sub: 'Eater of Names', frames: 100 })`, shake, flash,
  `music('boss_archivore')`, then battle `archivore` (boss, no flee).
- After: shake, flash, the Archivore despawns into pages, camera to `fragment_spot`, gives `name_fragment_1`,
  music `triumph`, the list. Then the camera returns to where Moth lay: SFX `name_restore`, one narration box,
  `give('lanternheart')` (the legendary; the field shows the received toast) and Mira's one line, camera back to
  `fragment_spot`. Sets `archivore_defeated`; a root passage opens (exit to the valley, mark `root_exit` near
  the Archive door). The battle's own reward roll must not also hand out Lanternheart (see the W5 report).

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

### The Lost Bridge (Whisperwood Hollow, optional; W6-content)
- **`quill_hint`** (valley, talk to Quill the first time; `ifNot: lost_bridge_started`). Quill introduces himself
  and tells of the pilgrims' bridge at the black pool east of the fork ("Lost, mind. Not broken."). With the
  Lantern he points at the root arch. Sets `lost_bridge_started` (the journal side quest "The Lost Bridge").
- **`quill_reminder`** (valley, step trigger `valley_lantern_hint` across row 17 above the fork; `if: lantern_get`,
  `ifNot: [hollow_found, quill_reminded]`; W10). One Mira box on the first valley entry after the Lantern: with
  `lost_bridge_started` it names the black pool east of the fork, without it it names the scribe at the Pilgrim's
  Rest. Sets `quill_reminded`. `lantern_get` adds one Bram box ("A lamp that finds things. Quill's lost bridge,
  then.") when `lost_bridge_started` is set and the hollow is not found yet, and the Talk side reminder for the
  lost bridge carries `nudge: true` so it wins the side slot (quests.js partyChat).
- **`hollow_entry`** (`whisperwood_hollow`, `on: 'enter'`; `ifNot: hollow_found`). Camera pans to mark
  **`bridge_far`** (30 frames) across the black pool. One narration box, then: without the Lantern Bram says the
  bridge is gone (the scene replays on the next visit); with it Mira says to raise the Lantern (names the button).
  Sets `lost_bridge_started` if Quill was skipped, and `hollow_found` (Lantern only). Two boxes either way.
- **`hollow_alpha`** (trigger `alpha_trig` across the boss room's mouth; `ifNot: hollow_cleared`). The W5 boss
  intro: music to silence, pan 40 frames to the map actor **`whisperwood_alpha`** (field sprite `briar_alpha`
  since W10, facing down at mark `alpha_spot`, `ifNot: briar_alpha_defeated`), anger emote, six boxes, title card
  "BRIAR ALPHA / Warden of the Lost Bridge", shake, flash, `music('battle')`, battle (boss, no flee). W10: the
  encounter comes from `alphaEncounter()` (encounters.js `ALPHA_TIERS`): `whisperwood_alpha` on the intended
  route, `whisperwood_alpha_t1` once `boss_door_open`, `whisperwood_alpha_t2` once `archivore_defeated` (the
  "Elder" tiers, one extra narration box: grey muzzle, briar grown into its hide). The trigger sits above the
  shrine vestibule (`hollow_shrine`, a rest point; mark `shrine`), so a lost fight retries from the shrine when
  the party rested there. On a win it runs `hollow_after`. If the flag is already set but the stone was never read (a quit
  mid-scene), the trigger runs `hollow_after` instead.
- **`hollow_after`** (`if: briar_alpha_defeated`, `ifNot: hollow_cleared`). Silence, the Alpha lies down and
  despawns, pan 40 to mark **`plaque`** (the pilgrims' stone, hidden ink on the north face), `lantern_reveal`,
  green flash, the inscription and three names darken (`name_restore`, music `triumph`): SORREL, ANSEL, WREN.
  Mira: the Archive is not the only place names are kept. Music back to `mystery`. Sets `hollow_cleared`.
- After the clear: Quill and the Pilgrim's Rest bench (`pilgrim_bench`) have new lines; the stone
  (`lost_bridge_plaque`) reads the names. The Thornwake axe is the Alpha's guaranteed battle drop
  (`BOSS_LOOT.briar_alpha`), not a scene give; the gold chest `chest_alpha` behind it (mark `gold_chest`) rolls a rare.

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
| `valley` | `archive_door`, `door_step` (+ open tiles left and right), `root_exit`, `campfire`, `hollow_mouth`; objects `milestone`, `prop_ferry_bell`, `campfire`; NPCs `quill penny` |
| `archive_f1` | `catalog_drawer`; object `prop_letter` (letter 1) |
| `archive_f2` | `font`; actor `echo_warden`; object `lantern_pedestal`; object `prop_letter` (letter 2) |
| `archive_f3` | `thirteenth_bell`; object `boss_door`; object `prop_letter` (letter 3); chest with flag `stacks_key_found` |
| `archive_boss` | actor `archivore`, `fragment_spot`, root passage exit |
| `whisperwood_hollow` | `entrance`, `bridge_near`, `bridge_far`, `alpha_spot`, `plaque`, `gold_chest`; actor `whisperwood_alpha` |

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
| `valley` | `valley_fork_sign`, `milestone` (object runs the scene), `hollow_tree`, `pilgrim_rest` (the campfire; `campfire_rest` runs first), `pilgrim_bench`, `pilgrim_note`, `bridge_plaque`, `ferry_post_valley`, `whisperwood_edge` | |
| `archive_f1` | `archive_door_carving` (valley side), `catalog_promise`, `catalog_drawers`, `marginalia`, `reading_desk` | `catalog_ledger`, `keeper_journal_1` |
| `archive_f2` | `reading_desk`, `hidden_ink_1`, `hidden_ink_2`, `keeper_font_galleries` (the font) | `readers_oath`, `keeper_journal_2` |
| `archive_f3` | `broken_chronicle`, `keeper_font`, `crystal_plaque`, `thirteenth_bell`, `boss_door_plate`, `hidden_ink_3` | `keeper_journal_3` |
| `whisperwood_hollow` | `hollow_piles`, `lost_bridge_plaque` (Lantern; the names after `hollow_cleared`) | |

`hidden_ink_*` texts only become readable once the Lantern reveals them.

## 7. Field remarks

`BARKS` in `text.js`: one companion line the first time something happens (first chest, first visible enemy,
first locked door, first pushed block, first switch, first dark room, first hidden-ink reveal, first font,
first elite, first rare and legendary drop, fleeing). Show each once per save, as a small non-blocking line or a
single box. Each entry is a first-match conditional list (the speaker must have joined).
`first_visible_enemy` only matches once `archive_entered` is set: it teaches the dungeon step rule (DESIGN 5.2),
so it fires on the first Archive enemy and a valley touch does not consume the one-shot key. The valley's first
wolves are the scripted `first_fight`; the Pilgrim's Rest line is in `campfire_rest`.

## 8. The Talk command (party chat)

`partyChat(hasFlag, mapId)` in `quests.js` returns `{ step, lines, side, banter }`. Show `lines` (the hint for
the current main step, written for the current map), then `side` (at most one reminder for an active side
quest), then `banter` (one optional exchange about the current map) as ordinary dialogue boxes with the
speakers' portraits. Before Mira joins, the hint is the hero's own thought in parentheses and there is no banter.
`journal(hasFlag)` returns the main step text plus every started side quest (with the letter counter).
