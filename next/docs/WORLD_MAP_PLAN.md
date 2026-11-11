# One growing world map: a design proposal (issue #93)

Status: **APPROVED by Scott 2026-11-11 ("Approve, use defaults": the plan, the brief and the three stills, every choice of
section 8 at its default).** Written 2026-11-11 by Scott's Claude. Wave 2 built on `scott/wm-wave2-map` (issue #97): the
`worldmap` pack, `docs/PWA_PACKS.md` has it as built. Wave 3 (travel, issue #103) built on `scott/wm-wave3-travel`:
`src/data/worldmap/travel.js`, as built in `docs/PWA_PACKS.md` (the worldmap pack, "Travel").

Mock-up stills (not game art, not in the repo): `G:\My Drive\Personal Knowledge Assistant\reports\lexicon_quest_world_map\`
(`wm_contact_sheet.png` plus the three stills at x1 and x4, and the two scripts that composed them from `next/assets`).

**Scott's brief, his own words (2026-11-11):** "let's get some art and maybe open them in a different room. Not sure why it
needs to be a whole separate episode site, so to speak. Why not just an extension of the game or another place that they go
to explore? I think we could look at those transitions a little differently. Each episode really just expands the world map,
and why couldn't it reply or reference future places or past places that they visited or been to as well, where they travel
around? I'm thinking of like Final Fantasy perhaps in that regard."

---

## 1. The idea in one page

**The game is one journey across one world, and the world map is how the player sees it grow.**

- There is a single world map, drawn as a painted SNES-style overworld (still 1). Willowmere and the valley sit in the west,
  the Hollow and its mere east of the river, Emberpeak in the ash hills north-east, Valewyn downriver on the coast, Saffron
  Haven south across the sea, the Skybound Isles out on the water, and the white North beyond the mountains.
- **Each episode opens one new region on that same map.** The map is never replaced and never resets. An episode is a chapter
  of the journey, not a separate game you start from a menu.
- **The map remembers what the player knows.** Places you have been are inked in full colour. Places you have only *heard of*
  are sketched in brown ink on blank paper with a "?" (still 1: "A ship from the south"). Places nobody has mentioned yet are
  blank paper. This fits the story directly: the Hollow is "a town no map remembers" (EPISODE1.md section 6), Aeris arrives
  in Episode 7 with a fading chart, and Episode 8 ends with "every one of them on the map again". The map stops being a menu
  and becomes part of the mystery of the disappearing names.
- **Travel grows with the story.** Walk the roads that already exist (they stay the real, walkable field maps). Ferries
  (Tovin, Hale) and the Keeper's mirrors stay as they are. Yara's ship opens the sea lane south in Episode 5. From Episode 6
  on, Aeris's airship, the Kestrel, can fly the party between any towns they know; after the finale it can fly freely.
- **Every town and dungeon stays visitable.** From the map you can go back to any town you have been to. Old regions get new
  reasons to visit: errands that need an item from a later region, a travelling merchant, shops that restock, and post-game
  marks on finished dungeons (still 2).
- **Each episode opens somewhere that fits it** instead of in the previous episode's inn (section 4).

In Final Fantasy terms: the field maps we already have are the towns, roads and dungeons, and the new world map is the
overworld you see between them, which fills in as you play and which the airship eventually lets you cross at will.

---

## 2. What exists today, and the smallest path to one map

### 2.1 How episodes start now (facts, from the code)

| Seam | Where | What it does |
|---|---|---|
| Live switches | `src/game/episodes.js` (`EP3_LIVE`..`EP6_LIVE`, all true) | Gate each episode's pack and title row. |
| Title rows | `episodes.js` `episodeOffers`, `src/scenes/title.js:65-67`, each pack's `LQ_EPn.title()` | One quick-start row per episode once any save has the previous `epN_complete`. After Episode 5 the title has nine rows, five of them quick starts (CRITIQUE_9 item 7). |
| Carry-on | `src/game/story.js` `CREDITS_HANDOFF` and the pack hooks | After the credits the save wakes in the next episode's start room: `hero_home`, then `nh_inn`, `pk_inn`, `ep4_vw_inn`, `ep5_sh_inn`, `ep6_zl_inn`. A trigger there runs `epN_morning`. |
| Quick starts | `newGameEp2/3` in `state.js`, `newGameEp4/5/6` in each pack's `start.js` | A fresh party at Lv 9, 13, 17, 21, 25 with the earlier `*_DONE_FLAGS` set. `pickRunSlot` never overwrites another save. |
| Packs | `src/game/packs.js`, `docs/PWA_PACKS.md` | `ep3`..`ep6` are hard, chained packs (ep6 waits for ep5, which waits for ep4, which waits for ep3). Each pack patches the previous region's maps (its inn, its dock). |
| Links between regions | map edges and doors | The regions are already one physical chain: valley, east road, Hollow, sand road, Emberpeak, Flood Road, Valewyn, ship, caravan road, Saffron, Airstair, Zephyr. Mirrors join Willowmere, the Hollow and Emberpeak. Ferries run valley to Willowmere and Hollow to Court. |
| World map or fast travel | none | No overworld, world map or fast travel exists in `src`. `field.warpTo` and the debug warp exist. The Kestrel is story text, a backdrop and a `kestrel` tile object (`ep6_tiles.json`). |
| Save | `src/core/save.js` `SAVE_VERSION = 1`, no migrations registered | `deserialize` fills any missing key from a fresh game; `flags` is an open map. |

So the game is *already* one connected world in code. What it lacks is a way to **see** that world and **move across it**
without walking every map in order, plus seams that feel like moving on rather than restarting.

`EXPANSION1_PLAN.md` 11.5 rejected "a world-travel map or fast travel" for the Wider Valley because its maps are 20 to 45 s
apart. That reason holds inside one region, and this plan keeps it: you still walk within a region. It does not hold across
eight regions, where going home from Zephyr Landing is a dozen maps and two sea crossings.

### 2.2 Three options

| | What it is | Cost | Fits Scott's FF picture? | Risk |
|---|---|---|---|---|
| **A. Travel map screen** | A painted world map in its own scene. Open it at a waystone by each town gate or dock; pick a town you know; a short route animation; arrive at that town's gate. Fog shows what you know. | **M.** One lazy `world` pack (scene, data, one painting, about 0.15 to 0.3 MB). No change to any field map except one waystone event per town, added by pack patches. | Partly: you see the world grow and you can go back, but you do not walk on it. | Low. Reuses `warpTo`, the pack guard and autosave. |
| **B. Walkable overworld** | A true FF overworld: a tile map of the whole world at overworld scale, walked with a small party sprite, with encounters, ships and the airship as vehicles. | **XL.** A new overworld tile set and party and vehicle sprites at overworld scale, collision for the whole world, encounter tables and balance per zone, and every region's entrances rewired from the existing edges to the overworld. | Fully. | High. It duplicates the roads we already have as field maps (east road, sand road, Flood Road, caravan road), the stories' crossings (Hale's ferry, the ship deck, the Airstair climb) were written as direct links, and it adds walking where playtesters already walk a lot. |
| **C. Hybrid** (recommended) | A now, on a painting drawn so that it can later be *flown over*: from the end of Episode 7 (or post-game, section 8) the Kestrel takes off onto the same painting and the player steers it freely, lands at any landing mark, and finds two or three places that only show from the air. No walking on the map, no encounters on it. | **M now, L later.** The later step adds a steer-and-land mode to the same scene and a few landing marks, not a second world. | Yes, where it matters most: the FF airship moment, the world seen whole, and every place open again. | Low now; the later step is optional and can be cut. |

**Recommendation: C, built as A first.** Option A answers almost all of the brief at a fraction of B's cost and keeps the
field maps as the real walkable world. Drawing the map once, well, in the game's own palette and pixel density means the
Kestrel's free flight later is a mode on the same screen, not a new world. B is the most FF, but it would cost about as much as
a whole episode and would compete with the roads that already work.

### 2.3 The rules of travel (proposal)

1. **Destinations are towns you have visited**, plus their docks: Willowmere, Hollowmere, Emberpeak, Valewyn, Saffron Haven,
   Zephyr Landing, then Palehaven (Episode 7). Never a dungeon floor: dungeons are walked into from their town or road.
2. **A route needs its way.** Road routes are open as soon as both towns are known. The sea lane to Saffron Haven needs
   Episode 5 started; Zephyr needs Episode 6 started; the North needs the Kestrel (Episode 7). A greyed row says why
   ("By ship, Episode 5").
3. **Travel is free and quick**: a 2 to 3 second route animation along the inked road or the dotted sea or air lane, then the
   party appears at the town gate mark. No encounters during travel. Autosave runs on arrival, as on every map change.
4. **The map opens** from a waystone at each town gate and dock, from the ship and Kestrel decks, and (wave 2) from a "Map" row in
   the field menu.
5. **Within a region you still walk.** The map never replaces a road the story needs: the first arrival in each region is always
   on foot or by the story's own vehicle.

---

## 3. Revisiting and cross-references

These are examples to choose from, not a commitment to build them all. Each names the region, what sends you there, and
whether it is new content (all of it is). Names come from the shipped story docs; nothing here changes a shipped story beat.

### 3.1 Errands that send you back (a later item for an earlier person)

| Region | Errand | Needs | Reward idea |
|---|---|---|---|
| Willowmere (Ep 1) | Nella's missing ferry bell (an Episode 1 side story) turns up in Valewyn's flood wreck. Bring it home. | Episode 4 | The valley ferry rings again; a small chime on the map. |
| Willowmere (Ep 1) | Hand Marten's letter to Tess yourself, instead of Aeris carrying it (Episode 7 proposal). | Episode 7 | Her father's line in the credits; a portrait moment. Open choice: it changes an Episode 7 proposal beat. |
| Hollowmere (Ep 2) | Tovin asks what the sea looks like; bring him a shell from Saffron Haven's shore. | Episode 5 | A second ferry stop on the mere (X2 already plans a second ferry post). |
| Emberpeak (Ep 3) | Bess wants desert spice for her stove (still 2). | Episode 5 | The Coal Lantern's breakfast gives a short buff after resting. |
| Valewyn (Ep 4) | Lyra's "Come back through Valewyn" (Episode 4 ending) becomes real: bring her news from the desert. | Episode 5 done | A royal pass that opens one sealed door in the Sunken Keep. |
| Saffron Haven (Ep 5) | Laleh asks for a reading from the Cloud Library. | Episode 6 | A star chart that sketches the White North on the map early. |
| Zephyr Landing (Ep 6) | The charts room keeps Aeris's chart; every finished region inks it. | Each episode | Flavour, and the place the map "lives" in the story. |

### 3.2 Places that mention the future (rumor marks)

When a person names a place the party has not reached, the map gains a "?" sketch there. Most of these lines already exist
in the endings; a few new lines go earlier:

- Episode 2, Hollowmere: a traveller speaks of a city downriver that floods every spring (Valewyn).
- Episode 3, Emberpeak: the smith's copper came "on a ship from a desert port" (Saffron Haven).
- Episode 4 ending (shipped): Ada's sand-dry letter "came on a ship from the south". The map sketches the southern coast.
- Episode 5 ending (shipped): Laleh's "a library above the clouds" and Yara's skyport at Zephyr Landing.
- Episode 6 ending (shipped): the Sky Compass points north to white mountains and the White Road.

### 3.3 People who travel

- **A travelling merchant** (Penny's cart from the Hollow is the natural fit) appears in each new town one episode after the
  party, selling the previous region's goods. She is the visible proof that roads stay open.
- **Familiar faces in new places**: Garrick (Episodes 1 to 4) and Ada the courier (3 to 5) already cross regions; give each a
  standing spot in a later town, with a line about the map.
- **Vex Quill** (Episodes 2 to 8) can be found once per region between episodes, never as an errand-giver.

### 3.4 Shops that restock

Each town's shop gains one stock tier when the *next* episode completes ("the carts run again"). This also answers
CRITIQUE_9's finding that Episode 6 ends with about 10,000 gold and nothing to buy: older towns become places worth spending.

### 3.5 Post-game

The map marks every finished dungeon with a star when its Fine Print tier is open, shows the errands ledger (done and open),
and puts the Wider Valley and the Mere Country areas on the map as their own marks. The Kestrel's free flight (wave 6) finds
two or three landing spots that only show from the air.

---

## 4. Openings: each episode starts somewhere new

Today Episodes 3 to 6 open in the previous episode's inn, and four of those inns share one layout re-dressed (CRITIQUE_9
item 5). The Episode 7 and 8 proposals continue the pattern (`ep6_zl_inn`, `ep7_ph_inn`). Episodes 1 and 2 already open in
their own places (the bell tower cold open, `hero_home`) and stay.

| Ep | Opens in | Why it fits | Art it needs | Size |
|---|---|---|---|---|
| 3 | **Hollowmere's east wall walk at dawn.** Garrick on the wall points at the red glow north-east; Vessa unchains the sand gate below. | Episode 2 ends on that red glow over Emberpeak. | A short wall-walk patch from the shipped hollow tile sheet; a far-glow backdrop strip. | S |
| 4 | **Emberpeak's east-road washout at first light.** Ada has just climbed Rusk's rope with the letter from Valewyn. | Episode 3 ends with the courier riding up the east road; the washout is already on `emberpeak`. | None new (the `rope_ladder` object exists in the ep4 sheet). | S |
| 5 | **On the deck of Yara's ship, at night, mid-crossing.** Mira reads the sand-dry letter under the stars. | The sea is the episode's door; `ep5_ship` and the `night_sea` terrain already exist. | A night dressing of `ep5_ship` (lanterns lit, stars). | S to M |
| 6 | **Saffron Haven's observatory at night.** A messenger bird lands on the armillary with the slip for four seats. | Laleh read the sky there at the end of Episode 5. | A small bird sprite (two or three frames). | S |
| 7 | **Aboard the Kestrel, already flying north** (still 3). Aeris shows the fading chart; Vex in the fourth seat. | The episode is "The Vanishing World" and its flight north is the first time the Kestrel carries the party. | A deck map built from shipped tiles (`skyplank`, `rope_rail`, `cloudbank`, the ep5 ship props). | M |
| 8 | **The Stillheart's broken roof at night**, under the stair of written light; Nox waiting, Vex's note "Gone up first" on the first step. | Episode 7 ends on that roof. | None beyond what Episode 7's ending already needs. | S |

For a carried-on save, the credits hand-off places the party in the new start room instead of an inn bed. For a quick start
the same room is the start. Re-staging Episodes 3 to 6 touches shipped content, so it gets its own wave and a playtest.

---

## 5. Save compatibility and loading

### 5.1 Old saves keep working

- **No `SAVE_VERSION` bump and no migration.** What the map knows is kept in plain flags (`wm_seen_<town>`,
  `wm_heard_<place>`), which every save already holds as an open map.
- **Backfill on load, read-only to the save until the next autosave:** the world pack derives the known towns from the
  episode flags a save already has (for example `ep3_complete` means Hollowmere and Emberpeak were seen). A save from any
  published build opens the map with the right regions inked.
- **Quick-start parties** have the earlier `*_DONE_FLAGS` set, so they see the earlier towns as visited and may travel back.
- Nothing overwrites the autosave or another slot. `pickRunSlot` is untouched.

### 5.2 Packs when a player can roam

Today the chain loads in order and on demand. Roaming changes two things: a save can jump to any known region, and the
destination's pack (and every pack it patches through) must be there when the party lands.

1. **Answer EPISODE8_PLAN 13.5 now: yes, fetch every pack at once on a resume**, register them in order. The world map makes it
   a requirement, not a nice-to-have: a Willowmere save that travels to Zephyr needs ep3 to ep6 together. (PLAYTEST_REVIEW_8 item 8
   measured the ep4 pack alone at 8.4 s cold; PWA_PACKS.md records ep6 cold entry at 11.1 to 11.9 s on the phone profile.)
2. **Warm on open:** opening the map starts `ensurePack` for every inked region at idle priority.
3. **Prefetch on point:** resting the cursor on a destination for about 300 ms starts that region's packs.
4. **The route animation covers the load** (2 to 3 s). If the packs are not ready when it ends, a plain hold card
   ("On the road...") waits up to the hard-pack guard's 8 s.
5. **Offline or failed:** travel is cancelled and the party stays where it was, with one line: "That road is not ready yet. Try
   again with a connection." It never falls through to `packFallback.js`'s landing table, which would drop the party somewhere
   unexpected.

### 5.3 Budget

- The `world` pack is lazy (wanted on `ep1_complete`, when the second region first exists) with a cap of about 0.3 MB: one
  painting (768 x 432, indexed PNG, estimated 60 to 120 KB), the scene code (estimated 10 to 15 KB gzipped) and text.
- **The startup ratchet (2.34 MiB before the tap prompt) takes almost nothing:** one row in the `PACKS` table in `packs.js`
  (about 100 bytes). Waystones are added by pack patches, the way packs already patch inns and docks. The "Map" row in the
  field menu (wave 2) needs a small core seam, which must report its gzipped size; the last recorded room is about 10 KB
  (E6-pack measured 2,442,935 bytes against the 2.34 MiB ratchet).
- The 6.5 MB initial download is untouched: pack files are not precached.
- Episodes 7 and 8 carry their own region of the painting in their own packs, so the `world` pack never has to know a future
  region.

---

## 6. Effect on Episodes 7 and 8 (proposals on `scott/ep8-design`)

| Plan | Today | With the world map |
|---|---|---|
| EP7 opening | `ep7_morning` in `ep6_zl_inn`, then `ep7_board` at the Kestrel gangway; the flight north is one cut. | Opens on the Kestrel deck in flight (section 4). The flight north is shown on the world map: the White Road drawn in pencil, filling in as they land. |
| EP7 travel | Boat-kind door `berth_white_road`; "revisits use the road and the Kestrel". | Palehaven becomes a map destination by Kestrel once landed; the door stays as the first arrival. |
| EP7 ending | "Snowrest is back on Aeris's chart." | Literally: the place inks onto the map. |
| EP7 theme | Places fading. | The map shows it: the North is pencil, not ink, until the episode restores it. |
| EP8 opening | `ep8_morning` in `ep7_ph_inn`. | The Stillheart roof at night (section 4). |
| EP8 return | Plan 3.5: a Kestrel door pair between the Stillheart and Willowmere's valley. | Kept as the story beat; afterwards ordinary map travel covers it. |
| EP8 finale | "One cut: the Kestrel south over the realms at sunset, every one of them on the map again." | The cut **is** the world map: the Kestrel crosses it at sunset and every region inks back in, one by one. The strongest payoff of the whole idea. |
| EP8 13.5 | Fetch-all fix waits for Scott's or Stephen's word. | Answered yes (5.2), built in wave 1. |
| EP8 post-game 6.4 | "Every road open." | The full map, every town a destination, and the Kestrel's free flight (wave 6). |
| Both | Their packs patch the previous inn for the morning trigger. | They patch the new start rooms instead, and each carries its own map region. |

---

## 7. The title screen

Scott: "Not sure why it needs to be a whole separate episode site." Proposed: the title keeps **Continue**, **New Game**,
**Load**, **Config**, and one row, **Start at an episode**, which opens a small picker of the quick starts (CRITIQUE_9 item 7's
fix). The end-of-episode cards stay, because they are good, but after them the game simply continues: the party wakes in the
world, and the map shows the new "?" the ending just named.

---

## 8. Open choices for Scott and Stephen (each with a default)

1. **Which option?** Default: **C, built as A first** (2.2).
2. **Where the map opens.** Default: waystones at town gates and docks, the ship and Kestrel decks, and (wave 2) a "Map" row in
   the field menu.
3. **Destinations.** Default: visited towns and their docks only, never dungeon floors.
4. **Cost of travel.** Default: free, 2 to 3 s, no encounters.
5. **Fog style.** Default: "the map remembers" (blank paper, brown-ink rumors, full colour once visited).
6. **The six openings in section 4.** Default: approve all six; Episodes 7 and 8 get theirs as they are built; Episodes 3 to 6
   are re-staged together in one wave with a playtest.
7. **Fetch every pack at once on a resume (EPISODE8_PLAN 13.5).** Default: **yes**, wave 1.
8. **Title rows.** Default: collapse the quick starts into one "Start at an episode" row.
9. **"Episode" or "Chapter" in player text.** Default: keep "Episode".
10. **Kestrel free flight.** Default: after Episode 8 (post-game), optional, can be cut.
11. **Marten's letter: Aeris carries it, or the player does.** Default: the player does (an errand), if Episode 7's owner agrees.
12. **The map's layout.** Default: the mock-up's layout (stills 1 and 2). The stories fix only directions, so the layout is a
    proposal to adjust.

---

## 9. Build waves

Sizes: **S** is one agent and one pull request; **M** is two to four pull requests or one small multi-agent wave; **L** is a
full wave of several agents, like one episode's maps or sprites.

| Wave | What | Size | Depends on | Touches hot files |
|---|---|---|---|---|
| 0 | Decide section 8 in issue #93. Approve this brief and the three stills. | none | | |
| 1 | Fetch every pack at once on a resume (EP8 13.5), measured warm and cold on the phone profile. | S | choice 7 | `packs.js` |
| 2 | The `world` pack: the painting (Episodes 1 to 6), the map scene (view only, fog, "you are here"), waystones by pack patch, flag backfill, the "Map" menu row. | M | 1 | `packs.js` (one row), the menu seam (to be measured) |
| 3 | Travel: destination list, route animation, prefetch, the offline rule, arrival at the gate mark, autosave. Tests: every destination from every region, old saves from each episode, offline. | M | 2 | none expected (`warpTo` exists) |
| 4 | Openings for Episodes 3 to 6 re-staged (section 4), credit hand-offs pointed at the new rooms, title collapsed to one row. | M | 0 | `story.js` hand-off table |
| 5 | Cross-references: four to six errands, the travelling merchant, shop restock tiers, rumor marks in the earlier episodes. | M | 3 | `text.js` |
| 6 | Episodes 7 and 8 built with their new openings and map regions (part of their own waves); Episode 8's finale played across the world map. | inside EP7 and EP8 | 3 | per their plans |
| 7 | Kestrel free flight: steer and land on the same painting, two or three air-only landing spots. | L | 6 | none expected |

Waves 1 to 3 are the whole of option A. Wave 4 can run beside waves 2 and 3. Wave 7 is optional and is the only L.

---

## 10. Art brief (the house visual brief, filled in)

### 10.1 Goal
- **What it shows:** the world of Lexicon Quest as one map that fills in as you play, and one episode opening in a new place.
- **Who sees it, and where:** players on phone and desktop, inside the game at 384 x 216; for this proposal, Scott and Stephen
  on a phone, as one contact sheet.
- **The one thing to remember:** every episode adds to the same world, and you can always go back.
- **Opening copy:** "World Map". **Closing copy:** "Z: go  X: back".

### 10.2 Delivery and assets
- **Format:** the in-game screen is 384 x 216, nearest-neighbour scaled. The world painting is 768 x 432 (48 x 27 cells of 16 px),
  shown whole at half size on the travel screen and at full size when zoomed to one region.
- **Assets in hand:** terrain autotiles (`assets/tiles/tiles.json` with the `ep4`, `ep5`, `ep6` fragments: grass, dirt, sand,
  water, mere water, ash ground, flood grass, tide water, dune sand, skyplank, cloudbank), UI windows, the banner, cursor, icons
  and both bitmap fonts (`assets/ui`), the party field sprites, `npc_aeris` (`ep6_npcs`), `npc_vex` (`npcs`), and the ship props
  (`ep5_tiles.json`).
- **Assets missing:** overworld-scale glyphs (mountain, forest, town, tower, cave, keep, ship, airship) drawn for the map; a snow
  terrain (the mock re-inks sand in the `ice` ramp); the parchment fog; a bird sprite (Episode 6 opening); a night dressing of
  the ship deck (Episode 5 opening). The mock-up draws rough stand-ins for the glyphs so the layout can be judged; they are not
  meant to ship.
- **Licenses:** all in-house.

### 10.3 Layout
- Travel screen (still 1): the map owns the screen; one window at a time on top: the destination list (right), the info line
  (bottom). Labels sit on a dark plate so they read over any terrain.
- Region view (still 2): the region at full size, a banner with the region's name, a small legend window.
- Opening (still 3): the field map with the episode banner and the dialogue window, as every scene already does.

### 10.4 Copy limits (worst case)
- Destination rows: the longest town name is "Zephyr Landing" or "Saffron Haven" (both fit 96 px with the cursor).
- Info line: two lines of 60 characters at most.
- Label plates: at most 26 characters ("! Bess wants desert spice" is 25).
- Checked at phone size on the contact sheet.

### 10.5 The three stills
1. **The world map travel screen** (`wm_still1_world_map.png`): a save just after Episode 4. Four towns inked, the south a brown
   sketch, the North and the open sea blank paper; the party at Valewyn; Saffron Haven greyed "(Episode 5)".
2. **One region with past and future marked** (`wm_still2_region_flood_country.png`): Valewyn and the Flood Road at full size:
   Hollowmere off the left edge (past, arrow), Bess's errand at Emberpeak (a later item for an earlier person), a Fine Print star
   on the Sunken Keep (post-game), and Saffron Haven "?" off the bottom edge (future, rumor).
3. **One new opening room** (`wm_still3_ep7_opening_kestrel.png`): Episode 7 aboard the Kestrel above the clouds; Aeris at the
   wheel, the party at the bow, Vex apart; built only from shipped tiles and sprites. Aeris's line is mock copy for the
   picture, not proposed dialogue.

### 10.6 Questions that need an answer before any art is built
Section 8, items 1, 5, 6 and 12.

---

## 11. What is fact and what is a guess

- **Fact (read in the code and docs):** the seams, flags, packs, chain order, start rooms, save format and budget figures in
  sections 2 and 5, and the story lines quoted from the endings.
- **Reported:** load times (PLAYTEST_REVIEW_8, PWA_PACKS) are measurements by earlier agents, not re-run here.
- **Inference (check before building):** the `world` pack size (60 to 120 KB painting, 10 to 15 KB code) is an estimate; the
  check is to build the painting and gzip the scene in wave 2. The menu seam's size is unknown until written; the check is the
  ratchet in `qa/pwa/budget_ratchet.json`. The wave sizes are judgement.

---

## 12. Wave 5 as built (issue #100): errands, Penny's cart, restocks

Built 2026-11-11 on `scott/wm-wave5-errands`. All of it lives in the lazy `ep4` pack (`src/data/ep4/errands.js`, the data and the
rules; `src/data/ep4/errands_field.js`, Penny on the field); `src/data/ep5/errands.js` and `src/data/ep6/errands.js` re-export
`register`, so each later pack adds what it made possible (its NPCs, items, shops) and puts the errand talk back in front of its
own lines. `errands` is the last module of each pack's ORDER. No core file, no map module and no save key changes; the startup
bytes do not move.

**Rules.** An errand opens when the episode of its *source* town is complete (the source then has no story scene left to shadow).
It can start at either end: the giver asks (`xr_<id>_started`), or the source hands the item over first (`_started` and `_got`);
delivering takes the key item, pays the reward once and sets `_done`. Each errand is a side quest (journal, Talk hints). Talk
entries sit in front of the NPC's lines but after any leading story scene, so a live story scene always answers first.

| Errand | Giver, place | Source, place | Item | Opens | Reward |
|---|---|---|---|---|---|
| A Rope That Sings | Nella, Willowmere | Hale, Flood Road | Flood Rope | `ep4_complete` | 400 gold, 2 Hi-Potions |
| What the Sea Looks Like | Tovin, Hollowmere | Yara, Saffron Haven | Sea Shell | `ep5_complete` | 600 gold, 2 Hi-Ethers |
| Desert Spice | Bess, Emberpeak | Yasmin, Saffron Haven | Desert Spice | `ep5_complete` | 600 gold, 3 Hi-Potions |
| News from the Desert | Lyra, Valewyn | Nasrin, Saffron Haven | The Road Reading | `ep5_complete` | 800 gold, a Phoenix Feather |
| A Sky from Above | Laleh, Saffron Haven | Suri, Zephyr Landing | Cloud Chart | `ep6_complete` | 1,000 gold, 2 Phoenix Feathers |
| Sky Brass | Sella, Emberpeak | Ilex, Zephyr Landing | Sky Brass | `ep6_complete` | 1,000 gold, 2 Hi-Ethers |
| Glass That Floats | Vessa, Hollowmere | Thea, Zephyr Landing | Cloudglass | `ep6_complete` | 1,000 gold, 3 Hi-Potions |

**Penny's travelling cart** (`penny_t`, shop `travel_cart`, road prices): one town behind the party. Emberpeak from `ep3_complete`
(27,29), Valewyn from `ep4_complete` (14,18), Saffron Haven from `ep5_complete` (13,24), Zephyr Landing from `ep6_complete` (19,20).
Ten road consumables from the start, plus Quench Flask, Lamp Oil, Hourglass Sand and Ballast Stone as she crosses each region
(12, 13, 14, 15 rows); one pair of boots at a time, the newest region's. Her sand road record (`penny_s`) steps aside at
`ep3_complete`, as `penny_e` did at `sand_gate_open`. She joins a map's entities at run time (the field's `glass.reset` seam,
like the worldmap stones), with her stop's flags on the event.

**Restocks** ("the carts run again", list price, each town gains the next tier, never newer than the frontier):

| Opens | Shop | Adds |
|---|---|---|
| `ep3_complete` | Willowmere Goods | Hi-Ether, Silver Salve, Lantern Charm, Mirror Charm |
| `ep3_complete` | Willowmere Forge | tier 4: the five Silverglass weapons, Silver Mail, Mirrorweave Robe, Glass Helm |
| `ep3_complete` | Hollow Provisioner | Quench Flask, Coalheart Charm, Bellchime Charm, Carter Mantle |
| `ep3_complete` | Silverglass Smithy | tier 5: Ashsteel Cuirass, Ashsteel Helm, Cinder Boots |
| `ep4_complete` | Ventworks Supplies | Lamp Oil, Waxseal Charm, Tidemark Charm, Ferry Mantle |
| `ep4_complete` | Emberpeak Weaponsmith | tier 7: Riverguard Plate and Helm, Scribe's Robe, Oilskin Hood, Wader Boots |
| `ep5_complete` | Riverbank Provisioner | Hourglass Sand, Shade Charm, Lodestar Charm, Dune Mantle |
| `ep5_complete` | Crown Guard Forge | tier 9: Dunewalker Mail, Starweave Robe, Copper Helm, Saffron Hood, Sandstrider Boots |
| `ep6_complete` | Saffron Caravan Supplies | Ballast Stone, Ballast Charm, Signal Charm, Sailcloth Mantle |
| `ep6_complete` | Copperwind Smithy | tier 11: Skysteel Mail, Windweave Robe, Aviator Helm, Gale Hood, Cloudstep Boots |

Willowmere and Hollowmere both open at `ep3_complete`, the moment the ep4 pack first loads (Willowmere one step later than the
plan's rule, which keeps the data out of the first download).

**The map hook (for waves 2 and 3).** All pure, reading `game.flags` (or a flag map), writing nothing:

```js
const X = globalThis.LQ_ERRANDS;   // set when the ep4 pack registers; undefined before Episode 3 is done (nothing to show then)
X.errandsFor(game, placeId)   // [{ id, title, state: 'open'|'fetch'|'deliver', mark: '!'|'?', label, npc }] for a data.js place/point id
X.errandLedger(game)          // every unlocked errand, done ones too: [{ id, title, state, giver, source }] (the post-game ledger)
X.merchantAt(game)            // Penny's stop: { place, map, x, y, dir, index } or null
X.errandState(game, id)       // 'locked'|'open'|'fetch'|'deliver'|'done'
```

`'!'` marks the giver's place for an open errand and for one ready to deliver, `'?'` the source's place while fetching. Place ids
are data.js PLACES / layout.js POINTS ids (`willowmere`, `hollowmere`, `emberpeak`, `flood_road`, `valewyn`, `saffron`,
`zephyr`). Labels are at most 26 characters ("! Bess wants desert spice"). The worldmap scene can also `import('../ep4/errands.js')`
for the same functions. Tests: `qa/content/xref_errands.test.mjs`; shots `story_xr_bess_spice`, `field_xr_penny_cart`.

**On the map (branch `scott/wm-errand-marks`).** The map screen reads the hook through `data.js` (`errandMarks`, `markOf`,
`errandLine`, `pennyAt`; never an import of the ep4 pack): a small cream speech bubble with a red "!" or a blue "?" by each
marked point (one bubble per point, "!" wins), placed clear of the label plates, the leader, the banner and the list
(`scene.js` `bubbleSpot`), bobbing a pixel unless Reduce motion is on. The chosen place's info box grows a gold line (the
errand's own label, or "! 2 errands open." / "? 3 things to fetch here.") and a line "Penny's travelling cart is here." where
she stands; at the bottom the box grows upward. No hook: no marks and no error, rechecked twice a second while the map is open.
Tests: `qa/worldmap/errand_marks.test.mjs`; shots `ui_worldmap_errands`, `ui_worldmap_penny`.
