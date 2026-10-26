# Episode 2 expansion plan: The Mere Country (X2)

Owner: x2-expander (designer, no code changes), 2026-10-25, revised the same day after Scott's answers (section 20). Status:
**designed, awaiting orchestrator launch**; nothing here is built. Scope: Episode 2 only (The Fading Road, Nameless Hollow and
its interiors, the Court floors 1 to 3 and the throne, the Episode 2 story "The Town Without a Name"), plus the **EXP budget** of its optional
content (section 9.6): today's EXP is unchanged (Scott withdrew the lower-EXP policy on 2026-10-25) and the optional content pays in gold, named gear and items with a small, capped EXP bonus.
**Where this file disagrees with `docs/EXPANSION_RECONCILIATION.md` (the decision log) or `docs/EXPANSION_SCHEDULE.md`, those win.** It is built **after** the Episode 1 expansion is published, on the shared pack mechanism
`docs/briefs/XP-packs.md`. A sibling designer plans Episode 1 (prefix `x1_`); this plan never touches an Episode 1 map. Episode 3
(`docs/EPISODE3_PLAN.md`) starts after the Episode 2 credits at Nameless Hollow and is kept whole (section 14).

Every build agent reads `docs/briefs/COMMON.md`, `DESIGN.md`, `docs/story/EPISODE2.md`, `docs/EPISODE2_PLAN.md` (the template and
the ids this plan must not collide with), this file and its own brief `docs/briefs/X2-*.md`, in that order. House rules as always:
no em dashes, no git, stay in owned paths, bound every command, look at your own output. Evidence tags: **[Fact]** read in code or
run today, **[Reported]** from a plan or review, **[Inference]** my estimate; every Inference a decision rests on names its check.

---

## 0. Summary

Scott played Episodes 1 and 2 and says they felt short. He decided to build **all** of: a larger overworld with real route
choice, optional mini-dungeons, side-quest chains that send the player back and forth, and exploration rewards (hidden chests behind
Dash Strike, Appraise, Shove, beam and mirror puzzles, secret rooms, optional bosses with named loot). He added: new music, earlier access
to the Isle and the Cistern, and a **much bigger map**. (He first asked for a lower-EXP policy and withdrew it: today's EXP stays everywhere.) Nothing is held back: the cut lines of section 16 exist and are **unused**.

**What gets built (Episode 2 only).**
- **12 new maps**: five outdoor maps, all 48 to 84 tiles wide (Cairnwatch Heights 80 x 40, Heronwade 72 x 44, the Silverbirch
  Weald 76 x 44, Southmere Shore 84 x 36, Lamplight Isle 48 x 32), three interiors, and four dungeon maps in three mini-dungeons (the
  Cairnmakers' Quarry, the Merewarden Light in two floors, the Reflecting Cistern).
- **6 edited maps**: `east_road` (the Waystation becomes a five-way junction), `nameless_hollow` (a north-west gate, a south gate, a
  second ferry post, a second Keeper mirror), `nh_chapel` (the hatch), and one secret each in `court_f1`, `court_f2`, `court_f3`.
- **Two loops and real route choice** (section 2): Hollow, Weald, Cairnwatch, Waystation, Hollow; and Hollow, Southmere, Heronwade,
  Waystation, Hollow. Far-off destinations are visible from the routes (the Court, the unlit Light, the watchtower).
- **4 optional bosses** (Waymarker, Mother Glassback, the Last Lamplighter, the Mercury Mother), **7 ordinary foes**, 3 zero-EXP
  adds, **20 placed ordinary groups**, 17 named items (4 boss drops, 7 chest finds, 6 quest rewards), 14 key items.
- **6 side quests** (about 42 new scenes, about 330 boxes) whose legs cross Willowmere, the road, the Hollow, the south bank,
  the heights, the Weald, the Isle and the Court.
- **38 hidden or ability-gated chests and routes** in 15 maps (section 6): every field ability and every beam verb is used.
- **9 new music tracks (the Weald and Southmere each have their own), 8 new SFX and 2 ambiences** (an `ep2` pack), and **the shared expansion pack `x2`** (maps, data, scenes and art load lazily and are
  runtime-cached, built on `XP-packs.md`, outside the 6.5 MB initial budget) so the load budget does not rise.
- **An EXP budget, not a policy**: every scale is 1.0 (`src/data/expcurve.js`, created in the Episode 1 build), the main route and its levels are today's, and the new optional foes pay a tenth of their raw EXP
  (`expMul` 0.1) plus a 34-point quest bonus, about 81 EXP in all, so a completionist stays within one level of today's plan at every main boss (section 9.6).

**What does not change.** The Episode 2 critical path (no forced fight, puzzle or scene is added); Episode 2's zone plans and per-fight
sim targets; existing ids, flags, maps and marks; the Hollowmere gate that Episode 3 keeps chained.

**Added playtime** [Inference, itemized in section 16]: about **3.0 hours** for a completionist (range 2.3 to 3.6), plus under 3
minutes on the critical path. Existing optional content is about half an hour, so this is about six times it.

**Waves** (after the Episode 1 expansion has been published; `docs/EXPANSION_SCHEDULE.md` is the ordered list). XA: X2-battle, X2-story (it may run earlier), X2-world. XB: X2-tiles, X2-sprites, X2-audio. XC: X2-maps-a,
X2-maps-b. XD: X2-maps-c. XE: X2-integrate (then the publish P2). XF: review (read-only), then fixes. At most 3 agents at once; the orchestrator may run them one at a time under the usage guard. The pack agent of the
first draft (X2-packs) is retired: `XP-packs.md` was built in the Episode 1 build.

---

## 1. Design rules (what every agent holds to)

1. **Critical path untouched.** No new required step, scene or fight. A new test, `qa/integrate/x2_critical_path`, walks the
   main-path route (no optional step) before and after.
2. **Optional means optional and legible.** Every new area is entered by a visible, readable branch (a stair, a bridge, a gate, a boat
   post, a hatch); nothing is entered by accident. Signs, Penny, Tovin and Talk name each branch once.
3. **Fields follow the loosened rules** [Fact: `src/world/actors.js` line 99, `CHASE_RANGE = 3`, `CHASE_PACE = 10`]: a field foe
   notices at 3 tiles and closes in slower than the party walks. Placements: no foe home within 4 tiles of an arrival tile,
   door, font, campfire or NPC; at most one `chase` per zone (the rest `guard`, `wander` radius 2 or less, or a `patrol` of 6 steps
   or fewer); every lane past a group is 3 wide or has a way round; a Dash from behind gives the free first turn (docs/WORLD.md 1b).
   Field maps set `respawn: 'reentry'` as the Fading Road does (PLAYTEST_REVIEW_3 fix 2).
4. **Levels.** Today's EXP and today's levels. The optional content is never required and its EXP is capped: a completionist is at most about one level over today's plan at every main boss (section 9.6).
5. **Every secret is fair.** Each hidden thing has a tell inside 6 tiles (a sparkle, a crack, a faint line, a lens that glints) and Talk
   or a sign names the verb once. Lantern ink stays within two tiles of the dead end it explains (PLAYTEST_REVIEW_4).
6. **Phone first** [Reported: CRITIQUE_4 items 7 and 8]: every bridge, plank and receptor state reads at phone scale (lit or dry
   against dim); field foes get a rim light.
7. **Big maps stay cheap.** Per-map cost rules: only the Light, the Cistern and the Quarry are dark maps; no field map has `fog` (it stays
   a Fading Stretch feature); mist `ambientFx` is area-limited with at most 14 blobs; no more than 12 light sources per map outside the
   dark dungeons (lamp posts and fires only); a field module is at most 26 KB raw (gzip 8 KB); ground variety comes from `scatter`
   overlays at 6 percent density or less, not from per-cell decor; far-off landmarks are single overhead decals.
8. **Tone.** The episode's question is "what would you give to keep someone?" Every new quest is a small answer: Maren keeps a promise to strangers,
   Dunn keeps debts, Ines keeps a wick, Marit keeps a notebook, Harn keeps a trail, the Cistern keeps the town's water. People in the
   Mere Country remember names; what the Court took was faces and places. No word puzzles anywhere (DESIGN 2.2).

### 1.1 Scott's decisions, mapped

| Decision | Delivered by |
|---|---|
| Larger overworld, branching routes, 3 to 4 reachable locations | five outdoor maps, two loops, a five-way junction, section 2 |
| 2 to 3 optional mini-dungeons, one reward each | Quarry (Waymark Pike), Merewarden Light (Lamplighter's Lens, Surcoat), Cistern (Mirrorpool Rod), section 4 |
| Side-quest chains that send the player back and forth (4 to 6) | 6 quests, section 7 |
| Hidden chests (Dash, Appraise, Shove, beam, mirror), secret rooms, optional bosses with named loot | section 6 (38 secrets) and 4 bosses, section 9.3 |
| New foes optional, loosened field rules | rule 3 above, zone plans in 9.2 |
| Build all, no cuts | section 16 (cuts unused) |
| New music for the heights, marsh, Isle, the Weald and Southmere (one track each), three dungeon types, optional bosses | section 11 and `X2-audio` (nine tracks) |
| ~~Global lower EXP~~ (withdrawn 2026-10-25): today's EXP stays; optional content pays in gold, gear and items plus a capped EXP bonus | section 9.6, 10.1, 13 |
| Isle and Cistern earlier | gates in 2.2 |
| Nico's chalk quest only after the crown or restoration | Q5 |
| Extra post-Sigil mirror pair | 5 (`mirror_overlook` and `mirror_warp_sq2`) |
| A more expansive map; at least two more sizable outdoor maps (60+ wide) | the Weald and Southmere, plus enlarged Cairnwatch and Heronwade, 4.1 to 4.12 |

---

## 2. World layout

The existing chain is Willowmere - valley - Fading Road - Nameless Hollow - (ferry) - Court. The Fading Road is 64 x 36 on paper
[Fact: `east_road.js`] but its walkable band is about 64 x 11 (rows 11 to 21; the mist and fog cover a 20 x 13 area of it; for the record the neighbouring valley is 60 x 40, its 60 x 19 being only its weather zone), with a rock
plateau north and an unreachable pine bank south: the thinnest part of the game. Widening that one map would move every mark, trigger and fog
checkpoint the saves and scenes rely on, so the road stays as it is and the **world grows around it**: the Waystation and the Hollow's
two new gates become junctions, and four large outdoor maps hang off them.

### 2.1 The map graph

| Location | id | Size | Kind | Connects to | Gate | Level band | Status |
|---|---|---|---|---|---|---|---|
| The Fading Road | `east_road` | 64 x 36 | field | valley (W exit); `nameless_hollow` (E exit); `x2_cairnwatch` by the west stair (approx. (19,6)) and the east stair (approx. (45,8)); `x2_heronwade` by the toll bridge (x 45, rows 21 to 25) and a south exit (approx. (45,35)) | west stair `saw_court`; east stair none; toll bridge: Lantern | main 9 to 10 | edit |
| Cairnwatch Heights | `x2_cairnwatch` | 80 x 40 | field | `east_road` W and E stairs; `x2_hut_maren`; `x2_quarry`; **east exit to `x2_weald`**; Keeper mirror to the Hollow | Quarry door: Shove | 9 to 10 | new |
| Maren's Hut | `x2_hut_maren` | 14 x 11 | interior | Cairnwatch | none | - | new |
| The Cairnmakers' Quarry | `x2_quarry` | 34 x 24 | dungeon (dark 0.45) | Cairnwatch `quarry_mouth` | Shove | 10 | new |
| The Silverbirch Weald | `x2_weald` | 76 x 44 | field | `x2_cairnwatch` east exit (W edge); **`nameless_hollow` north-west gate (E edge)** | none | 10 to 11 | new |
| Heronwade | `x2_heronwade` | 72 x 44 | field | `east_road` south exit; `x2_reed_lodge`; **east exit to `x2_southmere`** | Lantern (the bridge); boardwalk gaps: Lantern; sluice plug: Shove | 10 | new |
| The Reedcutters' Lodge | `x2_reed_lodge` | 18 x 13 | interior (shop, inn bed) | Heronwade | none | - | new |
| Southmere Shore | `x2_southmere` | 84 x 36 | field | `x2_heronwade` east exit (W edge); **`nameless_hollow` south gate (N edge)**; the drowned causeway toward the Isle | causeway: Lantern | 10 to 11 | new |
| Nameless Hollow | `nameless_hollow` | 44 x 34 | town | `east_road` (W exit, unchanged); ferry post 1 to `court_f1` (unchanged); **ferry post 2 to `x2_isle`**; **north-west gate to `x2_weald`**; **south gate to `x2_southmere`**; `nh_chapel` crypt hatch to `x2_cistern`; Keeper mirrors to the Court and (new) to Cairnwatch | ferry 2: `court_ferry_open`; hatch: `x2_cistern_open` | - | edit |
| Lamplight Isle | `x2_isle` | 48 x 32 | field | Hollow ferry post 2 (return post on the Isle pier); `x2_keeper_cottage`; `x2_light_f1` | ferry `rideIf: court_ferry_open` | 10 to 11 | new |
| The Keeper's Cottage | `x2_keeper_cottage` | 14 x 11 | interior | Isle | none | - | new |
| Merewarden Light, ground | `x2_light_f1` | 28 x 20 | dungeon (dark 0.3) | Isle door; stairs to F2 | beam gate (puzzle) | 10 to 11 | new |
| Merewarden Light, lamp gallery | `x2_light_f2` | 26 x 18 | dungeon (dark 0.3) | F1 stairs | boss, then mirrors | 11 | new |
| The Reflecting Cistern | `x2_cistern` | 40 x 28 | dungeon (dark 0.35) | `nh_chapel` hatch; **the Court landing (`court_f1`) by the Silver Stair** | hatch: `x2_cistern_open` (Q6); loop door: opened from inside | 11 to 12 | new |
| Court F1 to F3, throne | `court_f1`..`court_throne` | as built | dungeon | as built; F1 gains one door (the Silver Stair), F1 to F3 one secret each | - | 10 to 13 | edit |

```
 Willowmere - valley -(58,16)- [ Bank Road ]--- stair W (after the fog) ---+
                                     |                                     |
                              [ Fading Stretch ] (fog, unchanged)   [ x2_cairnwatch 80x40 ] --- Quarry
                                     |                                     |   |  \__ Keeper mirror (after the Sigil) __
                               [ Waystation ] ------ stair E ---------------+   |                                       \
                                  |       \                                east exit                                      |
                    toll bridge (Lantern)   Mere Shore --- nameless_hollow ---- NW gate ---- [ x2_weald 76x44 ] ----------+
                                  |                          |  |  \ pier ferry 1 --- Court F1 ... throne
                           [ x2_heronwade 72x44 ]            |  |   \ ferry 2 ---- [ x2_isle ] - Light F1 - F2
                                  |  Lodge                   |  chapel crypt hatch - [ x2_cistern ] - Silver Stair - Court F1 landing
                              east exit                      |
                                  |                      south gate
                        [ x2_southmere 84x36 ] -------------+     (the drowned causeway points at the Isle)
```

**Loops** (the route choice): Hollow, NW gate, Weald, Cairnwatch, east stair, Waystation, Mere Shore, Hollow (loop A, four maps); Hollow,
south gate, Southmere, Heronwade, toll bridge, Waystation, Mere Shore, Hollow (loop B, four maps). From the Waystation a player now picks
among **five ways**: west into the fog, up to the heights, south over the bridge, east to the Hollow, or back.

**Far-off destinations** (single overhead decals, visible from the route that leads to them): the Court's glass (as `court_far`, from
the Weald, Southmere and the Mere Shore), the Merewarden Light's tower (`light_far`, from Southmere, the Weald's watchtower hill and the Hollow
pier; its beam sweeps after `x2_light_lit`), the Weald's **Watchtower** (visible from Cairnwatch's east spur), Heronwade's heron colony
smoke (from the toll bridge), Maren's great cairn (from the Bank Road's west stair).

### 2.2 Why these gates

- **The west stair needs `saw_court`** (set at the mere, after the fog is crossed once): the high road never replaces the fog the first
  time; afterwards it is the fast way west.
- **The toll bridge is hidden ink** (the Lantern): the old milestone taught "the Lantern shows what was hidden; this was taken"; the toll
  bridge is the answer.
- **The Quarry door is a heavy cairn** (Shove): Bram's tool finally has a reason to wander.
- **The Isle ferry opens with `court_ferry_open`** (Scott: earlier): the moment Tovin agrees to row, a second post on his pier rows to the
  Isle. The Light's foes are tuned for Lv 10 to 11, the level a regular-route party has by the time the Hollow is reached.
- **The Cistern opens with Q6**, which Orla offers after `court_f1_done` (Scott: earlier than `court_f2_done`); its foes are Lv 11 to 12.
- **The Weald and Southmere are not gated**: both are walkways from the Hollow's new gates, marked by a signpost.

### 2.3 Travel and the shortcuts

| Trip | Route | Time [Inference] |
|---|---|---|
| Waystation to Cairnwatch | east stair, then the heights | 30 s |
| Cairnwatch to the Bank Road | high road west, west stair | 80 s (vs 150 s through the fog) |
| Hollow to the Waystation, by choice | Mere Shore (as built), or the Weald and the heights, or Southmere and Heronwade | 60 s / 190 s / 230 s |
| Hollow to the Isle | pier post 2 (ferry fade) | 20 s |
| Cairnwatch overlook and the Hollow square | **Keeper mirror pair** after `mirror_sigil_get` | 5 s |
| Willowmere errands after the Sigil | the chapel and square mirrors (as built) | 30 s |
| Hollow to the Court landing | ferry 1 (as built) or the Silver Stair from the Cistern | 25 s / 70 s |

Rest points: Cairnwatch campfire, Quarry hearth, the Lodge fire and bed, Harn's fire in the Weald, the beach fire on Southmere, the
Cottage hearth, a silver font on Light F1, two silver fonts in the Cistern (section 4).

---

## 3. Id registry (the contract)

Prefix `x2_` for maps, flags, scenes, lines and key items where a collision is plausible; encounter ids and boss ids keep plain
names (checked against `src/`, `assets/`, `qa/`, `tools/`, `docs/` on 2026-10-25: no collisions [Fact]). Never `hollow_` (Episode 1's
Whisperwood Hollow), `vow_`, `oath_`, `pk_`, `sand_`, `foundry_` (Episode 3) or `x1_` (the sibling).

### 3.1 Maps (sizes in 2.1)

`x2_cairnwatch`, `x2_hut_maren`, `x2_quarry`, `x2_weald`, `x2_heronwade`, `x2_reed_lodge`, `x2_southmere`, `x2_isle`,
`x2_keeper_cottage`, `x2_light_f1`, `x2_light_f2`, `x2_cistern`. Banners (`BANNERS`): "Cairnwatch Heights / Above the Fading Road";
"The Cairnmakers' Quarry / Under Cairnwatch"; "The Silverbirch Weald / Between the Heights and the Hollow"; "Heronwade / The South Bank";
"Southmere Shore / The Long Beach"; "The Reedcutters' Lodge"; "Lamplight Isle / The Merewarden Light"; "The Keeper's Cottage"; "The
Merewarden Light / I. The Ground Floors"; "The Merewarden Light / II. The Lamp Gallery"; "The Reflecting Cistern / Under the Square";
"Maren's Hut".

### 3.2 Flags (all declared in `X2_FLAGS`, registered into `FLAGS` and `FLAG_IDS`)

World and arrival: `x2_cairnwatch_seen`, `x2_weald_seen`, `x2_heronwade_seen`, `x2_southmere_seen`, `x2_isle_seen`, `x2_cistern_seen`,
`x2_high_view_seen`, `x2_watchtower_seen`, `x2_toll_bridge_found`, `x2_cistern_open`, `x2_cistern_through`, `x2_tide_restored` (latch),
`x2_lens_set`, `x2_light_lit` (set by the second lamp receptor), `x2_lamp_a`, `x2_lamp_b` (receptor latches), `x2_nest_cleared`.
Encounter flags (set by the encounter, like `other_selves_defeated`): `waymarker_defeated`, `mother_glassback_defeated`,
`last_lamplighter_defeated`, `mercury_mother_defeated`.
Quests (section 7): `x2_stores_started`, `x2_cache_quarry`, `x2_cache_heron`, `x2_cache_light`, `x2_stores_done`;
`x2_order_started`, `x2_order_delivered`, `x2_bundles_taken`, `x2_order_done`; `x2_lamp_started`, `x2_lens_core_found`,
`x2_lens_ground`, `x2_lamp_gear_found`, `x2_lamp_clock`, `x2_lamp_oil`, `x2_lamp_done`; `x2_parcels_started`, `x2_parcels_found`,
`x2_parcel_dunn`, `x2_parcel_ines`, `x2_parcel_maren`, `x2_parcel_harn`, `x2_parcels_done`; `x2_chalk_started`, `x2_chalk_road`,
`x2_chalk_toll`, `x2_chalk_cairn`, `x2_chalk_heron`, `x2_chalk_isle`, `x2_chalk_weald`, `x2_chalk_south`, `x2_chalk_done`;
`x2_cistern_started`, `x2_crypt_key`, `x2_cistern_done`.
Map-local chest flags where the story needs one: `x2_cache_*` and `x2_lens_core_found`; others use `game.opened`.
Counters (not flags): `x2_chalk_n`.

### 3.3 Key items (`KEY_ITEMS`; 14)

| id | Name | Icon | Use |
|---|---|---|---|
| `cache_tin` | Stranger's Tin | book (reuse) | Q1, one counted item: Maren gives three, one is set in each of three hollow cairns |
| `fitch_slip` | Fitch's Order Slip | letter | Q2 |
| `reed_bundles` | Cut Reed Bundles | book (reuse) | Q2 |
| `lens_core` | Cracked Lens Core | key | Q3 |
| `lens_ground` | Reground Lens | key | Q3 |
| `lamp_gear` | Lamp Clockwork | key | Q3 |
| `lamp_clock` | Tuned Lamp Clock | key | Q3 |
| `lamp_oil` | Flask of Lamp Oil | potion icon, key | Q3 |
| `parcel_dunn`, `parcel_ines`, `parcel_maren`, `parcel_harn` | Courier's Parcels | letter | Q4, four of them |
| `chalk_stub` | Nico's Chalk | key | Q5 |
| `crypt_key` | Crypt Key | key | Q6 |

### 3.4 Enemies, encounters and zones

Enemies (14 records): `fen_wolf`, `mire_slime`, `reed_wisp`, `cairn_golem`, `delver_shade`, `lantern_moth`, `drowned_watchman`;
adds `cairn_stone`, `glassback_pup`, `gutter_moth`; bosses `waymarker`, `mother_glassback`, `last_lamplighter`, `mercury_mother`.
Existing, reused as they are: `quicksilver`, `glint_wisp`, `quicksilver_bead`.
Encounters (24): `cw_wolves`, `cw_stones`; `qy_shades`, `qy_wisps`, `qy_golems`, `waymarker`; `wl_wolves`, `wl_wisps`, `wl_moths`;
`hw_slimes`, `hw_wolves`, `hw_wisps`, `mother_glassback`; `sm_slimes`, `sm_wolves`, `sm_moths`; `is_moths`; `lt_moths`, `lt_watch`,
`lt_pair`, `last_lamplighter`; `cs_beads`, `cs_wisp`, `mercury_mother`.
Zones (9): `x2_cairnwatch`, `x2_quarry`, `x2_weald`, `x2_heronwade`, `x2_southmere`, `x2_isle`, `x2_light_f1`, `x2_light_f2`, `x2_cistern`
(`episode: 2`, `optional: true`), outside `ZONE_ORDER`, `EP2_ZONE_ORDER` and `progression()`, enumerable in `ZONES` once the pack has
registered them (so `qa/maps` needs a map for each only when the pack is loaded).

### 3.5 Scenes (`src/data/x2/story.js`; map and trigger)

| Scene | Where | Trigger |
|---|---|---|
| `x2_cairnwatch_arrival`, `x2_high_view`, `x2_watchtower` | cairnwatch, weald | on enter (`ifNot x2_cairnwatch_seen`); step trigger on the high road; the watchtower telescope |
| `x2_maren_stores`, `x2_cache_set`, `x2_maren_thanks` | cairnwatch, quarry, heronwade, light_f2 | Maren's talk (start); the hollow cairn at each of the three sites (one scene, parameterized by the object id); Maren's talk (end) |
| `x2_quarry_entry`, `x2_waymarker`, `x2_waymarker_after` | quarry | on enter; step trigger on the dais row; after the battle (a pan to the hollow cairn) |
| `x2_toll_bridge` | east_road | the bridge sign (`lantern: true`) |
| `x2_weald_arrival`, `x2_harn_talk` | weald | on enter; Harn's talk |
| `x2_heronwade_arrival`, `x2_dunn_order`, `x2_marit_hide`, `x2_hide_scope` | heronwade | on enter; Dunn's talk; Marit's talk; the scope (Appraise) |
| `x2_mother_glassback`, `x2_reed_bundles`, `x2_glassback_after` | heronwade | trigger at the nest; the bundles object; after the battle |
| `x2_southmere_arrival`, `x2_far_light` | southmere | on enter; the first view of the unlit Light (a bark-sized scene) |
| `x2_fitch_order` | nh_shop | Fitch's talk (start and end) |
| `x2_isle_arrival`, `x2_ines_start`, `x2_ines_lens`, `x2_ines_done` | isle, cottage | on enter; Ines's talk (three stages) |
| `x2_vessa_lens`, `x2_lena_clock`, `x2_fitch_oil` | nh_smithy, nameless_hollow, nh_shop | Q3 relays, NPC talk entries |
| `x2_lamplighter`, `x2_lamplighter_after`, `x2_light_lit` | light_f2 | trigger; after the battle; the second receptor |
| `x2_tess_parcels`, `x2_toll_box`, `x2_parcel_dunn`, `x2_parcel_ines`, `x2_parcel_maren`, `x2_parcel_harn` | willowmere, east_road, four maps | Tess's talk (start, end); the toll box object; the four recipients |
| `x2_nico_chalk`, `x2_chalk_mark` | nameless_hollow, seven maps | Nico's talk; the chalk objects (one scene, parameterized by the object id) |
| `x2_orla_cistern`, `x2_anwen_crypt`, `x2_cistern_arrival`, `x2_mercury_mother`, `x2_cistern_after`, `x2_orla_done` | hollow, chapel, cistern | NPC talks; on enter; trigger; after the battle |

About 42 scenes; box budgets in X2-story (at most 10 boxes per side scene, 14 for the four boss intros and `x2_light_lit`; about 330 in
all). Quest scenes that pay EXP call the cutscene primitive `await s.give('exp', n)` (built once, by X1-world, in the Episode 1 build; section 15).

### 3.6 NPCs (`src/data/x2/npcs.js`)

New records: `maren` (cairnkeeper, Cairnwatch), `dunn` (reedcutter foreman, shop `reed_lodge`), `bett` (Dunn's wife, inn, 30 gold),
`marit` (heron-watcher, about fourteen), `ines` (the keeper's widow, Isle), `harn` (woodsman and tracker, the Weald). Boss actors (map
`actor` events, never NPC records): `waymarker`, `mother_glassback`, `last_lamplighter`, `mercury_mother`. Existing records get **prepended
talk entries** (`X2_TALK_PREPEND`): `penny_e` (hints only; she vanishes when E3 opens the sand gate, so she never gives a quest), `tovin`,
`orla`, `anwen`, `nico`, `fitch`, `vessa`, `lena`, `wren`, `tess`, `mael`.

### 3.7 Audio and art ids

Music (new, section 11): `x2_heights`, `x2_marsh`, `x2_isle`, `x2_weald`, `x2_shore` (the Weald and Southmere each have their own), `x2_quarry`, `x2_lamp`,
`x2_cistern`, `x2_boss` (nine in all). SFX (new, pack `ep2`): `cairn_set`, `plank_creak`, `heron_call`, `lamp_ignite`, `lens_turn`, `tide_rise`,
`hatch_open`, `wick_snip`. Ambience: `marsh_reeds`, `isle_surf`. Art ids are in section 12.

---

## 4. The maps (new)

General rules as EPISODE2_PLAN 4 and docs/MAPS.md: 3/4 walls, notch doors, marks for every scene point, every puzzle readable without
text, lit paths lead forward and dead ends hold chests, previews rendered and viewed. Coordinates are approximate unless marked; the
map author records exact cells in MAPS.md. **Phone rule**: dim states are dull grey, active states bright and animated. **Cost rules**: section 1 rule 7. **Landmark rule**: every large map has one tall landmark visible from at least two of its three route choices and one far-off
decal; every route has something worth the detour (a chest, a view, a scene) within 25 tiles.

### 4.1 `x2_cairnwatch`: Cairnwatch Heights (80 x 40, field)

The cairn-builders' high country: a moor on the rock line that hangs over the Fading Stretch, with the fog band seen below as a flat grey
dither (decor and an area-limited mist `ambientFx`; no fog doors here). Music `x2_heights`, tint none, `respawn: 'reentry'`. Zone
`x2_cairnwatch`. Four spurs leave a long high road.

- **West landing (x 1 to 9, y 28 to 35).** Arrival from the west stair (door `stairs_w` approx. (3,37), `entry_w`). Signpost
  `x2_sign_cairn` ("CAIRNWATCH. KEEP TO THE ROAD. THE EDGE IS NOT A ROAD.").
- **The High Road (x 9 to 70, y 29 to 33).** A dirt band along the rim, 60 tiles. `high_view_trig` (x 22, y 29 to 33) runs `x2_high_view`
  (Mira sees the nine cairns from above; one line). The chalk spot `x2_chalk_cairn` on a signpost at x 44. The **Great Cairn**
  (a 3 x 5 landmark at (40,26)) is visible from the stair and the Bank Road.
- **The Wolf Run (x 12 to 30, y 17 to 27).** A rocky bowl north of the road: group `cw_wolves` (`wander`, r2), wood chest `chest_wolfrun`
  (Hi-Potion x2). A faint-ink ravine path (`ink_bridge_h_faint` x6, Lantern) crosses to Maren's yard: the ravine shortcut, secret #38.
- **Maren's yard (x 34 to 52, y 12 to 27).** The hut (door `hut_door` to `x2_hut_maren`, approx. (43,18)); a ring of twelve waymark plinths
  (decor), each with its cairn; the campfire `cairn_fire` (rest, `safe`, mark `fire`);
  Maren stands at the ring. Group `cw_stones` (`guard`) sits 8 tiles east, so the rest point is clear.
- **The North Grove (x 4 to 28, y 3 to 14).** Pines on moss. `quarry_mouth`: the quarry's timbered adit (door to `x2_quarry`, approx. (14,7)),
  blocked by the **heavy cairn** `heavy_cairn` (block, `heavy`, sprite `cairn_block`) at (14,8); Bram's Shove moves it one tile sideways.
  In an alcove at (23,4) the **quiet cairn** `cairn_quiet` (object, `appraise`) hides the **gold chest `chest_quiet`**.
- **The Overlook (x 56 to 74, y 3 to 18).** A spyglass `x2_spyglass` (inspect: the whole mere, the Court's lag, the Hollow's lights, the
  Light's dark tower). A gully with a hidden ink bridge (x 62 to 65, y 9, Lantern) to a ledge with the **gold chest `chest_overlook`**
  (Cairnkeeper's Glass). A rock outcrop with a **Dash crack** (`crack_ledge`) opens a nook with the iron chest `chest_ledge`. The dull Keeper
  mirror `mirror_overlook` (door kind `mirror` to the Hollow square, `if: mirror_sigil_get`).
- **The Cairnmakers' Way, east end (x 70 to 79, y 22 to 33).** The road descends east; exit (79, 27 to 29) to `x2_weald` (1, y). The
  Watchtower is seen far down the Way (an overhead decal, `watchtower_far`). The east stair door `stairs_e` approx. (74,37) to `east_road` (45,9).
- Enemies 2, chests 4 (+ pots), marks: `entry_w`, `entry_e`, `high_view`, `ring`, `fire`, `overlook`, `quarry_mouth`, `quiet_cairn`, `way_east`.

### 4.2 `x2_hut_maren` (14 x 11, interior)

Maren's table with the ledger (book `maren_ledger`: the road's travellers' caches, their stock, and the three that stand empty), a wall map of the road drawn as cairns, a cot, a hearth, one pot.
Door exit in the south wall lands in front of the hut. Interior music `willowmere`.

### 4.3 `x2_quarry`: The Cairnmakers' Quarry (34 x 24, dungeon, dark 0.45)

*(The first draft's Cairnmaker's Barrow, a burial mound with a counting boss, duplicated Episode 1's Wethers' Barrow and the Reeve; reconciled 2026-10-25 into a worked-out quarry. Every id is renamed: map, zone and music `x2_quarry`, hearth `quarry_fire`, note `quarry_note`, groups `qy_*`, enemy `delver_shade`, cap `quarrymans_cap`.)*
The adit and galleries where the stone for every cairn on the road was cut: timbered rock, sledge rails, stone bays, lamp hooks. New `quarry` wall system and `quarry_rock` floor, braziers for light. Music `x2_quarry`, ambience `court_hush`. Zone `x2_quarry`.

- **A. The Adit (x 2 to 9, y 16 to 21).** Arrival from the heights (`entrance` (4,17)). The foreman's hearth `quarry_fire` (rest, `safe`).
  Chalked tallies of loads on the walls (inspect). Group `qy_shades` (`patrol` 6 steps, the zone's one chaser) near the hall mouth, 5 tiles from the hearth.
- **B. The Cutting Hall (x 11 to 24, y 12 to 21).** Twelve cut-stone bays (decor). **Shove puzzle**: two heavy cut blocks on sledges (`heavy_b1`, `heavy_b2`)
  and two sledge stops (`plate_b1`, `plate_b2`) in a three-row lane; both pressed open the barred `gate_hall` to the Office. The lane is three
  rows wide so a block can always be shoved out of a corner (tested). Group `qy_golems` (`guard`) at the lane's far end.
- **C. The Foreman's Office (x 2 to 9, y 4 to 12), behind `gate_hall`.** The Keeper's note `quarry_note` (Lantern-readable) and, over a faint
  ink floor (`ink_bridge_h_faint` x4, Lantern), the iron chest `chest_niche` (Quarryman's Cap). Dead end, safe.
- **D. The Long Gallery (x 12 to 31, y 3 to 10).** Three pillars, a hidden pit row (`pit` drops to the Cutting Hall, with a `page_fall` tell),
  group `qy_wisps` (`guard`), a wood chest and a **Dash crack** (`crack_gallery`) hiding the iron chest `chest_gallery` (rolled, ilvl 10).
- **E. The Setting Floor (x 24 to 32, y 12 to 19).** `waymarker_trig` runs `x2_waymarker` and the battle; the actor `waymarker` (a mason-construct that still sets stones for a road that is gone) stands over the
  hollow cairn `cache_quarry` (Q1, present `if: waymarker_defeated`; the tin goes here). After the fight a one-way stairs door `x2_quarry_short`
  returns to the adit.
- Enemies 3 groups + boss, chests 3, marks: `entrance`, `fire`, `hall`, `office`, `floor`, `cache`.

### 4.4 `x2_weald`: The Silverbirch Weald (76 x 44, field)

A birch forest basin between the heights and the Hollow: white trunks, silver-blue undergrowth, shafts of pale light, a creek. Music
`x2_weald`, ambience `mere_still` (reused), tint none, `respawn: 'reentry'`. Zone `x2_weald`. **Three routes** run from the west edge
(from Cairnwatch) to the east edge (the Hollow's north-west gate), with cross-links, so the player chooses.

- **West gate (x 0 to 6, y 24 to 30).** Arrival from Cairnwatch (`entry_w`); the signpost `x2_sign_weald` names the three routes ("NORTH TRAIL.
  THE OLD ROAD. THE CREEK WAY."). Chalk spot `x2_chalk_weald`.
- **The North Trail (y 6 to 15, x 6 to 70).** Open birch aisles and meadow. **The Blazed Birches** (x 14 to 24, y 7 to 13): nine birches in a
  ring, each blazed with a carved trail sign (a hare, a key, a bell, a heron: Harn's woodsman's marks, no names); in the ring's middle faint ink (Lantern) draws the nine signs as a small map of the three routes, and the **gold chest
  `chest_birches`**. Group `wl_wisps` (`guard`) inside the ring. **The Watchtower hill** (x 34 to 44, y 3 to 12), a ruined Merewarden tower
  (a 3 x 6 prefab, `watchtower_ruin`, a **tall landmark** drawn above the actors); a stair-top platform with the telescope
  `x2_watchtower_scope` (scene `x2_watchtower`: the Light's tower across the mere, the Court glittering) and a **Dash crack** (`crack_tower`)
  in its base with the iron chest `chest_tower`.
- **The Old Road (y 18 to 30, x 6 to 70), the middle.** The forest interior: a dirt trace under old birches. **Harn's camp** (x 28 to 38, y 22 to
  28): Harn at his fire `harn_fire` (rest, `safe`), a skinning rack, a map scratched on a board (inspect: the three routes). A **fallen oak**
  (`heavy_oak`, block, `heavy`, sprite `fallen_oak`) blocks a spur to a hidden clearing (x 50 to 58, y 20 to 26) with the iron chest
  `chest_clearing_w` (Shove). Group `wl_wolves` (`wander`, r2), 8 tiles from the camp.
- **The Creek Way (y 32 to 42, x 6 to 70).** A creek crossed on stepping stones (shallow terrain cells; a wide ford, no gate) and a ruined mill
  (x 44 to 54, y 33 to 40, decor `mill_ruin`) with a **Dash crack** (`crack_mill`) and the wood chest `chest_mill`. Group `wl_moths`
  (`wander`, r2) at the millrace.
- **East gate (x 69 to 75, y 6 to 14)**: exit to the Hollow's north-west gate (`entry_e`). The Hollow side is a path cut through the town's
  north-west shore reeds.
- **Landmarks and far-off**: the Watchtower seen from the whole North Trail and from Cairnwatch's east end; `light_far` seen through a gap on
  the Creek Way; `court_far` over the mere from the east gate.
- Enemies 3 groups, chests 5 (gold, iron x2, wood x2), marks: `entry_w`, `entry_e`, `birches`, `tower`, `scope`, `harn_camp`, `oak`, `mill`.

### 4.5 `x2_heronwade`: Heronwade (72 x 44, field)

A reed marsh on the tributary's south bank: boardwalks over shallow water (`shallow` is walkable; `water` is not), reed beds (`reeds_*`), sand
spits, drying racks. Music `x2_marsh`, ambience `marsh_reeds`, `respawn: 'reentry'`. Zone `x2_heronwade`. Four boardwalk branches leave a landing,
and a fifth road leaves east.

- **The Toll Landing (x 30 to 41, y 0 to 6).** The south end of the toll bridge (arrival `landing` (35,2) from the road's south exit). Sign
  `x2_sign_heron` (blank board; chalk spot `x2_chalk_heron`), wood chest `chest_landing`.
- **West boardwalk to the Reedcutters' Lodge (x 3 to 22, y 8 to 22).** The hamlet: the Lodge (door `lodge_door` to `x2_reed_lodge`, approx. (11,14)),
  three huts (not enterable), racks of drying reed, the fire `lodge_fire` (rest, `safe`), Dunn at (13,16), wood chest `chest_yard`. No foes within 8 tiles.
- **East boardwalk to the Heron Hide (x 46 to 66, y 3 to 18).** Three plank cells are missing at (46 to 48, 10): a faint ink walk (Lantern)
  crosses. The hide: a bird-watcher's hut on stilts, Marit at (58,11), the spotting scope `x2_scope` at (62,11). Appraise on the scope
  (`appraise` object) reveals a **gold chest `chest_island`** (Heron Boots) on a reed island, reached by a three-plank spur that appears with
  it. Group `hw_wisps` (`guard`) on the spur's approach.
- **South boardwalk to the Cutting (x 16 to 56, y 24 to 42).** Reed fields. A heavy **sluice plug** (`sluice_plug`, block, `heavy`) at approx.
  (30,28) shuts a side walk; shoved aside it opens the **iron chest `chest_plug`** (Reedcutter's Hook). An iron chest `chest_boardwalk` (rolled) on a
  spur. Groups `hw_slimes` (`wander`) and `hw_wolves` (`patrol` 6) on the walks. At the end, **the Nest** (x 40 to 52, y 34 to 42): a mound of cut reed
  and silverglass shell, `nest_trig`, the actor `mother_glassback`, the bundle stack `x2_bundles` (Q2, present `if: mother_glassback_defeated`) and the
  hollow cairn `cache_heron` (Q1, present `if: mother_glassback_defeated`; the second tin goes here).
- **East road (x 60 to 71, y 20 to 28).** A sand road leaves the marsh east (exit (71, 22 to 24) to `x2_southmere` (1, y)); a sign `x2_sign_south`
  ("SOUTHMERE. THE LONG BEACH. TIDES: NONE, ONLY HABITS.").
- Enemies 3 groups + boss, chests 5 (gold `chest_island`; iron `chest_plug`, `chest_boardwalk`; wood `chest_landing`, `chest_yard`), quest
  objects `x2_bundles`, `x2_scope`, `cache_heron`. Landmark: the heron colony's stilt towers, visible from the landing and the road.

### 4.6 `x2_reed_lodge` (18 x 13, interior)

As `inn`: a counter with Dunn (shop `reed_lodge`), Bett by the guest bed (inn, 30 gold, mark `inn_bed_heron`), a slate `x2_slate` (inspect: four
rumors, each naming one place: "The Light on the Isle has not been lit in fifteen years", "Maren is stocking the old travellers' cairns", "Something
large has moved into the Cutting", "The quiet cairn on the heights is not quiet"), a hearth, nets.

### 4.7 `x2_southmere`: Southmere Shore (84 x 36, field)

The long south shore of the mere: pale sand, dune grass, tide pools, wrecked timber, the water always still. Music `x2_shore`, ambience `isle_surf`,
`respawn: 'reentry'`. Zone `x2_southmere`. One long beach with three side sites; the mere and the far shore fill the north horizon.

- **West gate (x 0 to 6, y 14 to 20).** Arrival from Heronwade (`entry_w`). Signpost `x2_sign_southmere`; chalk spot `x2_chalk_south`.
- **The Long Beach (x 6 to 78, y 12 to 22).** A 70-tile strand of sand, dunes and driftwood. The Court's glass shows over the water to the north-east
  (`court_far`); the Light's tower (`light_far`, and its beam after `x2_light_lit`) to the north. `far_light_trig` (x 30) runs the bark scene
  `x2_far_light` once. A beach fire `beach_fire` (rest, `safe`) at x 38. Group `sm_wolves` (`patrol` 6 steps) on the strand.
- **The Saltpans (x 6 to 28, y 24 to 34).** A mosaic of shallow pans between sand walks; group `sm_slimes` (`wander`, r2); a **heavy driftwood log**
  (`heavy_drift`, block, `heavy`) over a walk to the iron chest `chest_salt` (Shove).
- **The Wreck of the *Tern* (x 44 to 58, y 24 to 32).** A beached boat with its ribs showing (decor `wreck_tern`), a **Dash crack** (`crack_wreck`)
  in the hull and the iron chest `chest_wreck`, a wood chest on the stern deck. Group `sm_moths` (`wander`, r2).
- **The Drowned Causeway (x 60 to 72, y 4 to 12).** A line of stepping stones into the water toward the Isle, visible only with the Lantern
  (`ink_bridge_h_faint` x9 over `water`), ending in a sandbar with the **gold chest `chest_bar`** (rolled rare, ilvl 10).
- **North gate (x 66 to 72, y 0 to 2)**: exit to the Hollow's south gate (`entry_n`, lands on the road outside the town wall).
- Enemies 3 groups, chests 5, marks: `entry_w`, `entry_n`, `beach_fire`, `pans`, `wreck`, `causeway`.

### 4.8 `x2_isle`: Lamplight Isle (48 x 32, field)

A low island in the mere. Dune grass, sea pinks, a boathouse ruin, the Cottage and the unlit Merewarden Light. Music `x2_isle`, ambience `isle_surf`,
`respawn: 'reentry'`. Zone `x2_isle`.

- **The Pier (x 20 to 28, y 27 to 31).** Arrival `landing` (24,28); the return post `ferry_isle_home` rides to the Hollow pier always. Sign `x2_sign_isle`
  (chalk spot `x2_chalk_isle`).
- **The Cottage (x 6 to 16, y 12 to 23).** The white cottage (door to `x2_keeper_cottage`, approx. (10,19)), a clothesline, a kitchen garden, a rowing boat
  on trestles.
- **The Light (x 19 to 31, y 3 to 13).** A whitewashed tower (prefab `lighthouse`, door to `x2_light_f1`, approx. (25,11)); the causeway path is clear.
- **The Boathouse (x 33 to 45, y 17 to 26).** A ruin with a wood chest `chest_boathouse` and a group `is_moths` (`wander`, r2) at the lantern hooks, 8 tiles
  from the pier.
- **The Sundial Point (x 35 to 46, y 4 to 12).** A **beam and mirror puzzle in the open**: the sundial lens `beam_sun` (a `beam_lens` pedestal at (36,7), dir
  right) -> the turnable mirror `m_sun` (41,7) (start '/', splashes on a rock) -> the receptor `rec_tide` (41,11); lit, it opens `gate_tide` (43,14), a
  glass gate into a tide cave with the **gold chest `chest_sundial`** (Sundial Charm).
- **The West Rocks (x 1 to 6, y 6 to 11).** A **Dash crack** (`crack_seacave`) in a sea cliff with the iron chest `chest_seacave` (rolled, ilvl 10).
- Enemies 1 group, chests 3 (+1 in the Cottage), marks: `landing`, `cottage`, `light`, `sundial`, `boathouse`.

### 4.9 `x2_keeper_cottage` (14 x 11, interior)

Ines at the wick-trimming table by the window that faces the Light; the lens bench `lens_bench` (empty cradle until Q3); a hearth (`safe` rest object
`cottage_hearth`), a bed, one wood chest `chest_cottage` (rolled), a shelf of fifteen trimmed wicks ("Fifteen. One for each year. Not one has been burned.").

### 4.10 `x2_light_f1`: The Merewarden Light, the ground floors (28 x 20, dungeon, dark 0.3)

A lighthouse and its watch quarters in the new `lighthouse` wall system (whitewash, a blue band) with `wood_floor` and `stone_floor`. Music `x2_lamp`,
ambience `court_hush`. Zone `x2_light_f1`.

- **A. The Watch Hall (x 9 to 18, y 13 to 18).** Arrival (`entrance` (13,18)); the silver font `font_light` (`safe`) by the stair; oar racks; group `lt_moths`
  (`wander`, r2). In the alcove behind the oar racks the wood chest **`chest_lenscore`** (key `lens_core`, flag `x2_lens_core_found`, Q3).
- **B. The Oil Store (x 2 to 8, y 11 to 17), west.** Pots (`pot` x4, oil flasks) and the wood chest **`chest_gear`** (key `lamp_gear`, flag
  `x2_lamp_gear_found`, Q3). Plain; the quest never needs a secret.
- **C. The Cellar (x 20 to 26, y 11 to 17), east.** Group `lt_watch` (`guard`). A **Dash glass pane** `pane_cellar` (breakable `glass`, at (23,10)) opens a closet
  with the **gold chest `chest_cellar`** (Wick Charm).
- **D. The Signal Gallery (x 6 to 22, y 3 to 9).** The beam teaching room: the moon window `beam_s1` (7,3, dir down) -> `m_l1` (7,6) -> east -> `m_l2` (15,6) ->
  north into the receptor `rec_stairs` (15,4) beside the barred `gate_stairs` (13,2); the stairs up behind it. Both mirrors start wrong and splash in view.
  Four configurations, no softlock.
- Chests 3, enemies 2 groups, marks: `entrance`, `font`, `oil_store`, `cellar`, `signal`, `stairs_up`.

### 4.11 `x2_light_f2`: The Lamp Gallery (26 x 18, dungeon, dark 0.3)

The top of the Light: a ring gallery round the empty lamp cradle. Music `x2_lamp`, boss `x2_boss`. Zone `x2_light_f2`.

- **Landing (x 10 to 15, y 14 to 17).** Arrival from F1's stairs; group `lt_pair` (`guard`) beside the stair.
- **The Gallery Ring (x 3 to 22, y 3 to 12).** The cradle `lamp_great` at (12,5): before `x2_lens_set` an empty frame ("A cradle for a lens the size of a table. It is
  empty."), after it a lens (an `if` / `ifNot` event pair). The Last Lamplighter (actor `last_lamplighter`, a tall salt-stained figure holding a lantern) stands at
  (8,8) facing the cradle; `lamplighter_trig` crosses the ring's south edge and runs `x2_lamplighter` and the battle.
- **The lamp puzzle (after the battle).** With `x2_lens_set` two beam events (`beam_lamp_w`, `beam_lamp_e`, both `if: x2_lens_set`) leave the cradle west and east. West:
  `m_g1` (7,5) must be '/' to send the beam north into `rec_lamp_a` (7,3, latch, flag `x2_lamp_a`). East: `m_g2` (17,5) backslash into `rec_lamp_b` (17,3, latch, flag
  `x2_lamp_b`, `script: x2_light_lit`). Both start wrong and splash on the gallery wall. Four configurations. When both are lit the lamp swaps to its lit art and
  `x2_light_lit` plays: the roof stair opens, the camera follows the beam across the mere to the Hollow's pier, the Isle bell rings once, Ines is on the pier
  below. The hollow cairn `cache_light` (Q1) stands in the gallery's west alcove, present `if: last_lamplighter_defeated`; the third tin goes here.
- Enemies 1 group + boss, chests 2 (iron rolled ilvl 11 on the ring; wood in the landing). Marks: `landing`, `lamp`, `lamplighter`, `mirror_w`, `mirror_e`, `roof`.

### 4.12 `x2_cistern`: The Reflecting Cistern (40 x 28, dungeon, dark 0.35)

The Keepers' water store under the Unwritten Square: flagstone aisles (`court`'s `glass_floor` and `gallery_floor`), channels of **mercury** (a new reflective
`mercury` terrain, blocks walking like water) and the Court's beam system (glass bridges that light under a beam). Music `x2_cistern`, boss `x2_boss`, ambience
`court_hush`. Zone `x2_cistern`.

- **A. The Intake Steps (x 2 to 9, y 2 to 9).** Arrival from the chapel hatch (`entrance` (4,3)); the silver font `font_cistern_a` (`safe`); the Keeper's tally on the wall.
- **B. The Mercury Channel (x 10 to 30, y 6 to 16).** An east-west channel crossed by three glass bridges: the source `beam_c1` (11,4, dir right) -> the mirror `m_c1` (16,4)
  (backslash sends the beam south laying bridge A across the channel at x 16, y 6 to 10; '/' sends it into a wall) -> the fixed mirror `m_c0` (16,12) -> east along bridge B
  (17 to 24, y 12) to the mirror `m_c2` (25,12) (turn: lays bridge C south (25, y 13 to 16) or north (25, y 8 to 11) to the East Landing). One beam, one commitment, as the Court F2 island.
  Group `cs_beads` (`patrol` 6).
- **C. The West Reservoir (x 2 to 12, y 12 to 24).** A mirrored room fed by `beam_c2` (3,13, dir right). A heavy mirror `mirh_cs` (`heavy`, Shove) two tiles off its socket
  (`inlay_socket`); shoved onto it and turned it lights `rec_res` (latch, map-local) whose `gate_res` opens the Keeper's closet: the iron chest `chest_closet`, the note
  `cistern_note` (Lantern-readable) and, over a faint ink bridge (x 4, Lantern), the **gold chest `chest_tide`** (Tidewatch Mantle). Group `cs_wisp` (`guard`), 6 tiles from the font.
- **D. The Cistern Heart (x 22 to 38, y 14 to 25).** A basin with a central platform: the great tide mirror `tide_mirror` (6 x 5, dull state); `mercury_trig` and the actor
  `mercury_mother` on the platform; the silver font `font_cistern_b` (`safe`) on the near rim so a lost fight retries at the basin's edge. After the fight `x2_cistern_after` sets
  `x2_tide_restored`: the mercury drops, the mirror shows the town's water running, the east channel opens.
- **E. The Silver Stair (x 33 to 38, y 3 to 10).** A stair door `door_cistern_court` (to `court_f1` landing approx. (16,26), dir up) that sets `x2_cistern_through` on first use. The
  Court side (`court_f1` door `x2_court_water`, `if: x2_cistern_through`) is the return door: Hollow, chapel, Cistern, Court landing, no ferry.
- Enemies 2 groups + boss, chests 3 (`chest_closet` iron, `chest_tide` gold, one rolled wood on the East Landing). Marks: `entrance`, `font_a`, `channel`, `reservoir`, `heart`, `silver_stair`.
- **Softlocks**: leaving resets mirrors and blocks; the stair and the hatch are both exits; no block or pushable mirror can sit on a beam line without a way round (tested).

---

## 5. Edits to existing Episode 2 maps

Rules for every edit: **append events and overlays; never change or remove an existing id, cell, door target, mark or enemy**; no new enemy event on `east_road`,
`nameless_hollow` or any `court_*` map (their zone plans and EXP stay as they are); no new solid cell on any previously walkable cell of the critical path (one tile
margin) or on any existing mark, exit, door, trigger or NPC spot; the `mapcheck` walk under the finished-Episode-2 flags and under three mid-episode flag sets must reach exactly
what it reached before, plus the new places.

| Map | Additions |
|---|---|
| `east_road` | **West stair** to `x2_cairnwatch` (a 3 x 3 cliff nub with a stairs door, approx. (19,6), approached from (19,7) on a short dirt path; never within 4 tiles of the `e_bank_wolves` home (17,11); `if: saw_court`). **East stair** (a nub with stairs at approx. (45,8), approached from (45,9), away from `e_way_beetles`' patrol). **The toll bridge**: faint ink bridge cells (`ink_bridge_v_faint`, x 45) across the river rows 21 to 25 (the map author checks every row of the noisy bank), the sign `x2_toll_sign` on the far bank (`lantern: true`, runs `x2_toll_bridge`), and a cleared 3-wide sand lane through the south pines to an exit at approx. (44..46, 35) -> `x2_heronwade` `landing`. `pitTo` for the faint cells is the Waystation yard. **The toll box** `x2_toll_box` (object, `lantern: true`) behind the toll house (Q4). **A Dash crack** `crack_toll` in the toll house's back wall: the iron chest `chest_toll_cellar` (rolled, ilvl 9). Signposts `x2_sign_heights` and `x2_sign_south_road`. The chalk objects `x2_chalk_signpost` (beside `east_signpost`) and `x2_chalk_toll` (beside `toll_board`). Penny's talk entries (data) hint at the branches. |
| `nameless_hollow` | **North-west gate** (an exit at x 0, rows 7 to 8, a short path through the reeds; sign `x2_sign_nw`) to `x2_weald` `entry_e`. **South gate** (an exit on the south edge, x 28 to 30, y 33, onto the road strip outside the wall; sign `x2_sign_south_gate`) to `x2_southmere` `entry_n`. **Ferry post 2** `ferry_isle` on Tovin's pier (approx. (13,3); a second `ferry` event, `to: ['x2_isle', ...]`, `rideIf: court_ferry_open`, text `x2_pier_isle`). **The second Keeper mirror** `mirror_warp_sq2` beside the plinth (a dull `dullMirror` before the Sigil; `if: mirror_sigil_get`) to `x2_cairnwatch` `overlook` (approx. (16,21)). **Lamp beam**: an overhead decal `lamp_beam` across the mere from the north-east `if: x2_light_lit` (cosmetic, both tints). **A Dash crack** `crack_wall` in the south wall at approx. (22,31) with the iron chest `chest_wallnook` on a strip behind the wall. **Lantern ink under the pier** (`ink_bridge_*_faint` x3 at approx. (11,3..5)) to the wood chest `chest_pier`. Keep clear: every cell with x >= 36 and y 22 to 30 (Episode 3's sand gate region) and every existing mark. No new NPC; all Hollow quest givers are existing records. |
| `nh_chapel` | **The crypt hatch** at the bell-tower base (mark `crypt_hatch`): before `x2_cistern_open` an `object` `crypt_locked` (inspect: "A hatch under the empty bell frame, locked. A Keeper's lock, with a keyhole shaped like a bell."); after, the stairs door `crypt_stairs` to `x2_cistern` `entrance`. Existing marks, the mirror door and `anwen_trig` untouched. |
| `court_f1` | **The Silver Stair door** `x2_court_water` (a stairs door in the landing's west wall, 3 or more tiles from the font; `if: x2_cistern_through`) to `x2_cistern` `silver_stair`. **The Keeper's Closet**: an independent beam system (`beam_k` in the north face of the east wing's corridor, `m_k` one turnable mirror, receptor `rec_closet` latch) opening `gate_closet` onto a closet with the gold chest `chest_closet_f1` (rolled rare, ilvl 10). It shares no mirror with any existing system (the walk's configuration count rises from 16 to 32). |
| `court_f2` | **The Mourners' Niche**: a hidden ink bridge (`ink_bridge_h_faint` x3, Lantern) from the Keeper's alcove to a ledge with the gold chest `chest_niche_f2` (rolled rare, ilvl 11). One inspectable cracked frame near the Portrait Hall's west alcove (text only). |
| `court_f3` | **The Glass Alcove**: a Dash pane `pane_f3` (breakable `glass`) in the hub's south-east wall opening an alcove with the gold chest `chest_alcove_f3` (rolled rare, ilvl 12). **The Reflection** (`x2_throne_ref`, an `appraise` object under the glass throne): Appraise reveals the gold chest `chest_ref_f3` (rolled rare, ilvl 12) in the hub's corner (`behind: 'appraise:x2_throne_ref'`, fallback Lantern ink). |

---

## 6. The secrets ledger (every verb is used, none is required)

| # | Where | Verb | Reward | Tell |
|---|---|---|---|---|
| 1 | east_road, toll house back wall | Dash | iron chest (rolled 9) | a crack, `first_dash_target` bark |
| 2 | east_road, south river | Lantern | the toll bridge, Heronwade | the toll board names a bridge; the sign appears |
| 3 | east_road, behind the toll house | Lantern | the toll box (Q4 parcels) | faint line, the sign |
| 4 | cairnwatch, rock outcrop | Dash | iron chest (rolled 9) | crack |
| 5 | cairnwatch, gully | Lantern | gold chest: Cairnkeeper's Glass | the spyglass inspect |
| 6 | cairnwatch, quiet cairn | Appraise | gold chest | the only cairn with no bird on it (inspect) |
| 7 | cairnwatch, the Quarry door | Shove | the Quarry | the blocked lintel, `first_heavy_block` |
| 8 | quarry B | Shove x2 | the Office (iron chest Quarryman's Cap) | two sledge stops in the floor |
| 9 | quarry C | Lantern | the Office's ink floor and note | a faint line |
| 10 | quarry D | Dash | iron chest (rolled 10) | crack |
| 11 | heronwade east boardwalk | Lantern | the Heron Hide | three missing planks |
| 12 | heronwade, the scope | Appraise | gold chest: Heron Boots | the scope is "pointed at nothing" (inspect) |
| 13 | heronwade, the sluice plug | Shove | iron chest: Reedcutter's Hook | a plug in a side walk |
| 14 | isle, west rocks | Dash | iron chest (rolled 10) | crack |
| 15 | isle, the sundial | beam + mirror | gold chest: Sundial Charm | the lens on the pedestal glints |
| 16 | light F1, the cellar | Dash (glass) | gold chest: Wick Charm | a pane |
| 17 | light F1, the signal gallery | beam + mirror | the stair | teaching room |
| 18 | light F2, the lamp | beam + mirror x2 | the Light lit | splashes in view |
| 19 | cistern B | beam + mirror | the east landing, the Silver Stair | the channel |
| 20 | cistern C | Shove (heavy mirror) + beam | the Keeper's closet (iron chest) | a socket inlay |
| 21 | cistern C | Lantern | gold chest: Tidewatch Mantle | the note |
| 22 | court F1 | beam + mirror (independent) | the Keeper's Closet gold chest | a window and one mirror |
| 23 | court F2 | Lantern | the Mourners' Niche gold chest | faint line |
| 24 | court F3 | Dash (glass) | gold chest | a pane |
| 25 | court F3 | Appraise | gold chest | the throne's reflection |
| 26 | hollow, south wall | Dash | iron chest (rolled 10) | crack |
| 27 | hollow, under the pier | Lantern | wood chest | faint line |
| 28 | the Silver Stair | opens from inside | the loop (a route) | - |
| 29 | the four bosses | optional fights | named loot | - |
| 30 | the hatch | quest key | the Cistern | the locked hatch |
| 31 | weald, the Blazed Birches | Lantern | gold chest | the ring of nine blazed birches |
| 32 | weald, the Watchtower | Dash | iron chest | a crack in the tower base |
| 33 | weald, the fallen oak | Shove | the hidden clearing, iron chest | a log across a spur |
| 34 | weald, the ruined mill | Dash | wood chest | a crack in the mill wall |
| 35 | southmere, the wreck | Dash | iron chest | a crack in the hull |
| 36 | southmere, the saltpans | Shove | iron chest | a log over a walk |
| 37 | southmere, the drowned causeway | Lantern | a route to a sandbar, gold chest | stones glint at low tide |
| 38 | cairnwatch ravine | Lantern | a shortcut between the Wolf Run and Maren's yard | a faint line at the ravine's lip |

Ability use: Dash 10, Lantern 11, Shove 7 (a heavy cairn, two sockets, the plug, the cistern mirror, the oak, the log), Appraise 3, beam and mirror 6. If the Appraise item (section 15, N1, built by X1-world) is not
shipped, #6, #12 and #25 fall back to Lantern ink, Lantern ink and a Dash pane; nothing else changes.

---

## 7. Side quests

Six quests, each in the existing `SIDE_QUESTS` shape (`id`, `title`, `giver`, `start`, `done`, `reward`, `counter?`, `steps` with journal text and map-aware Talk lines in Mira's and Bram's voices), appended to
`ALL_SIDE_QUESTS` when the pack registers. None touches the Episode 2 main quest. All stay completable during Episode 3 (no giver is Penny, Garrick or any NPC Episode 3 hides). **Every
quest pays a small EXP bonus** by `await s.give('exp', n)` at its end (the amounts are the quest supply of 9.6, 34 in all), plus its item.

| # | Quest | Giver and start | Legs (the back and forth) | Reward | EXP | Whole chain, minutes [Inference; dungeon time overlaps section 16] |
|---|---|---|---|---|---|---|
| Q1 | **Strangers' Stores** (`strangers_stores`) | Maren, Cairnwatch; rumors from Penny, the toll board and the Lodge slate; `x2_stores_started` | Maren -> Quarry (Waymarker) -> Heronwade (Mother Glassback) -> Isle and Light (Lamplighter) -> Maren | Cairnwalker's Mantle | 6 | 12 |
| Q2 | **A Provisioner's Order** (`provisioners_order`) | Fitch, `nh_shop`, after `nh_arrived`; `x2_order_started` | Fitch -> Dunn (Heronwade, by the toll bridge or Southmere) -> the Cutting (Mother Glassback, the bundles) -> Dunn -> Fitch | Provisioner's Pouch + 3 Hi-Ethers | 4 | 12 |
| Q3 | **Lamps for the Light** (`lamps_light`) | Ines, the Cottage; `x2_lamp_started` | Ines -> Light F1 (lens core, lamp gear) -> Vessa (regrind) -> Lena (clock) -> Fitch (oil) -> Ines (sets the lens) -> Light F2 (Lamplighter, the lamp) -> Ines | Merewarden Surcoat (the third set piece) | 8 | 18 |
| Q4 | **The Courier's Parcels** (`courier_parcels`) | Tess, Willowmere, after `last_route_done`; `x2_parcels_started` | Tess -> the toll box (road) -> Dunn -> Maren -> Harn (Weald) -> Ines -> Tess | Courier's Cloak | 4 | 18 |
| Q5 | **Nico's Chalk Road** (`chalk_road`) | Nico, Hollow, after `nico_crowns_done` or `nh_restored`; `x2_chalk_started` | Nico -> seven blank signs (road, toll, heights, Weald, marsh, Southmere, Isle) -> Nico | Chalk Crown Charm | 4 | 14 |
| Q6 | **The Keepers' Water** (`keepers_water`) | Orla, Hollow, after `court_f1_done`; `x2_cistern_started` | Orla -> Anwen (the Crypt Key) -> the hatch -> Cistern (Mercury Mother, the tide mirror) -> Orla | Orla's Blessing + 3 Silver Salves + 2 Hi-Ethers | 8 | 8 |

### 7.1 Steps, flags and Talk (each step's journal and chat text is written by X2-story)

**Q1 Strangers' Stores.** Maren keeps the old travellers' cairns, hollow stone stacks where a lost stranger finds a tin: bread, a wick, a blanket pin. Three in the far places have stood empty for years. Steps: `brief`
(done `x2_stores_started`; Maren gives three `cache_tin`): "Maren stocks the old travellers' cairns so a stranger who is lost, hungry or in the dark finds something waiting. Three in the far places stand empty." ->
`place` (done: all of `x2_cache_quarry`, `x2_cache_heron`, `x2_cache_light`; counter "Caches stocked", 3): the hollow cairn at each site (the Quarry's setting floor after the Waymarker falls, the Nest after Mother
Glassback, the Light's gallery after the Lamplighter) is an `object` whose `x2_cache_set` scene sets the flag and consumes one tin; before the quest it reads "A cairn with a hollow in its side. Empty." -> `report` (done
`x2_stores_done`): "Tell Maren the caches are stocked." Maren's end scene (`x2_maren_thanks`) is her one warm moment: no counting, no names. The sites sit behind the three bosses so the quest is a reason to go; the
three may be done in any order and before the quest starts (the cairn simply waits). The old draft's three-waystone count is gone.
**Q2 A Provisioner's Order.** Fitch has a standing order (forty bundles of cut reed, for rope) he cannot collect: `x2_order_started` gives `fitch_slip`; Dunn reads it (`x2_order_delivered`), says the bundles are in the
Cutting and "something with a shell has moved in"; the bundles (`x2_bundles`, `x2_bundles_taken`, key `reed_bundles`) are at the Nest, present only `if: mother_glassback_defeated`. Back to Fitch: `x2_order_done`.
**Q3 Lamps for the Light.** Ines: the Light is a family job; fifteen years ago the Court "kept the lamplighter"; the lamp needs three things. `lens_core` from `chest_lenscore` and `lamp_gear` from `chest_gear` (plain wood
chests on Light F1) -> Vessa regrinds the core at once (`x2_lens_ground`) -> Lena winds the clockwork (`x2_lamp_clock`: "it keeps time to the second now; the lamp will not") -> Fitch gives the oil (`x2_lamp_oil`, free, "Fitch
insists on writing a receipt") -> Ines sets the lens (`x2_lens_set`) -> Light F2: the Lamplighter, the two receptors (`x2_light_lit`) -> Ines (`x2_lamp_done`). The boss may be fought before the quest starts; the lamp cannot be lit
before `x2_lens_set`; the key items and the Hollow relays may come in any order.
**Q4 The Courier's Parcels.** Tess (after `last_route_done`): her father's route book lists four parcels he never delivered and a note, "toll box, behind the board". `x2_toll_box` (Lantern, `x2_parcels_found`) holds four
(`parcel_dunn`, `parcel_ines`, `parcel_maren`, `parcel_harn`). Each recipient reads theirs and answers with one memory of the courier; each sets its flag (counter 4). Back to Tess: she keeps the replies, gives the Courier's
Cloak, says "North. I know the first stage now." (a promise, not a quest).
**Q5 Nico's Chalk Road.** Nico gives `chalk_stub`; the seven chalk objects (`x2_chalk_*`, one scene) each put a small chalk crown on a sign (a `chalk_crown` overlay `if` its flag); counter "Signs chalked", 7. At seven Nico's
talk entry finishes the quest and the signs keep their crowns.
**Q6 The Keepers' Water.** Orla: "the fountain drains somewhere; my grandmother said the Keepers kept water under the square". Anwen has the crypt key: `x2_anwen_crypt` (Mira says "forty-one" without being asked,
`x2_crypt_key`; Anwen: "then your hands remember", gives `crypt_key`) -> `x2_cistern_open` on using the hatch -> the Cistern -> `mercury_mother_defeated` and `x2_tide_restored` -> Orla (`x2_cistern_done`).

### 7.2 How the quests tie together without being required

Q1 pulls the party through three optional bosses; Q4 reuses four doors (Cairnwatch, Heronwade, the Weald, the Isle); Q5 touches seven signs on the same routes. A completionist plans a circuit of the world and does Q1, Q4 and Q5
on it, and Q2, Q3 and Q6 as three Hollow-centred loops. The journal's "Errands" list shows them in start order.

---

## 8. Cast (voices; all lines in Episode 2's register: warm, short, wry, one idea per box)

- **Maren** (old, brisk, spectacles on a string, walks with a stick she calls the ruler). "Three tins for three far cairns. A stranger will thank you. Never to your face." / "A cairn is a promise a stranger makes to the next stranger. I audit promises."
- **Dunn** (barrel-chested, mournful humour). "I cut reeds. I owe money. In that order, most days." / "Fitch has a standing order and I have a standing apology."
- **Bett** (Dunn's wife, practical). "Thirty gold. The bed remembers you, which is more than most do."
- **Marit** (about fourteen, notebook, never raises her voice). "Herons stand still because they have already decided. I am trying to learn that." / "The scope points at nothing. I like that it is pointed."
- **Ines** (sharp, kind, hands never still). "Fifteen wicks, trimmed. That is not hope. That is housekeeping." / "Do not tell me he is kept. Tell me where."
- **Harn** (woodsman, few words, never leaves the trail). "Three ways through. Same trees. Pick the one you can bear." / "Wolves keep to the creek. Moths keep to the mill. I keep to my fire."
- **The Last Lamplighter** (the Court's keeping; speaks like the knights, in a quiet voice). "THE LIGHT IS NOT TO BE LEFT." After the fight the lantern is lowered; Ines is told his name on the Isle ("Tam") and
  his face is, for one box, a face. He is a kept man set at a post, as Aurel was; nobody dies.
- **Existing voices** keep their registers: Fitch fusses over receipts, Vessa is exact, Lena is wry about time, Nico is certain, Orla is oblique, Anwen is gentle, Tess is quick and proud, Penny sells.

No new canon is contradicted: the Merewardens are the old mere watch (the set's lore); Ines's husband is a Merewarden; the Court's knights are made of kept faces; the Hollow's people remember names, not places
(EPISODE2.md section 1).

---

## 9. Combat and the EXP budget (X2-battle)

### 9.1 Foes (first-pass numbers [Inference]; the simulator targets are binding)

Calibration as EPISODE2_PLAN 6.8. **Foe EXP below is the raw value in the data; every optional group and boss of this plan carries `expMul: EXPANSION_FOE_EXP_MUL` (0.1, 9.6), so the pay is a tenth of it.** All reuse a source cell of `enemies.webp` (recolors) or an existing frame.

| id | Name | Family, size | Lv | HP | ATK / MAG | DEF / SPR | SPD | Sh | Weak | Resist | EXP / Gold (raw) | Moves | Art |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `fen_wolf` | Fen Wolf | beast | 9 | 250 | 30 / 6 | 11 / 8 | 15 | 2 | fire, spear | | 7 / 28 | Bite (lowest HP%), Thorn Bite (Poison), Howl once | `mist_wolf` frames, no new art |
| `mire_slime` | Mire Slime | ooze, small | 9 | 150 | 28 / 34 | 7 / 9 | 9 | 2 | fire, axe | ice | 5 / 20 | Slime Tackle, Bog Spit (Poison 25%) | cell 0, peat green-brown |
| `reed_wisp` | Reed Wisp | spirit, flying | 10 | 190 | 24 / 48 | 9 / 17 | 14 | 2 | bow, fire | thunder | 8 / 34 | Wisp Lure (Silence 20%), Strike | cell 1, sea green |
| `cairn_golem` | Cairn Golem | construct, large | 10 | 310 | 50 / 10 | 24 / 9 | 7 | 4 | axe, ice | spear, bow | 10 / 46 | Stone Fist, Settle (Protect self), **Cairn Fall** (single 190%) | cell 4, moss grey |
| `delver_shade` | Delver's Shade | spirit | 10 | 215 | 30 / 52 | 12 / 18 | 12 | 3 | light, fire | ice | 9 / 38 | Chill Touch (Chill 25%), **Grave Chill** (party mag 110%) | cell 7, grey-green |
| `lantern_moth` | Lantern Moth | insect, small, flying | 10 | 175 | 26 / 44 | 8 / 14 | 16 | 2 | bow, ice | fire, light | 6 / 30 | Dazzle (Blind 25%), Wing Dust (party Blind 15%) | cell 3 small, pale gold |
| `drowned_watchman` | Drowned Watchman | construct, large | 11 | 300 | 56 / 14 | 22 / 12 | 9 | 4 | thunder, light | ice | 12 / 50 | Salt Blade, Cover (lowest-HP ally), **Tide Verdict** (single 200%) | cell 5, sea teal, a lantern |
| `cairn_stone` | Cairn Stone | construct, small | 10 | 90 | 34 / 0 | 14 / 6 | 8 | 1 | axe | | 0 / 0 | Stone Fist | `cairn_golem` frame (add) |
| `glassback_pup` | Glassback Pup | insect, small | 10 | 70 | 26 / 0 | 10 / 8 | 12 | 1 | axe, thunder | | 0 / 0 | Shell Bash | `glassback` frame (add) |
| `gutter_moth` | Gutter Moth | insect, small | 11 | 60 | 24 / 30 | 6 / 10 | 15 | 1 | bow | | 0 / 0 | Dazzle | `lantern_moth` frame (add) |

Existing foes reused unchanged: `quicksilver` (9), `glint_wisp` (22), `quicksilver_bead` (0). Archetype distinctness: Fen Wolf vs Mist Wolf (silver); Cairn Golem (moss) vs Glass Sentinel (slate) vs Tome Golem; Drowned Watchman
(sea teal) vs Faceless Knight vs Echo Warden vs Pride.

### 9.2 Encounters and zone plans

| Zone | Level | Backdrop | Plan (groups) | Group contents (raw EXP) |
|---|---|---|---|---|
| `x2_cairnwatch` | [9, 10] | `east_road` | `cw_wolves` 1, `cw_stones` 1 | wolves = fen_wolf x2 (14); stones = cairn_golem, fen_wolf (17) |
| `x2_quarry` | [10, 10] | `east_road` | `qy_shades` 1, `qy_wisps` 1, `qy_golems` 1, `waymarker` 1 | shades = delver_shade x2 (18); wisps = reed_wisp x2 (16); golems = cairn_golem, delver_shade (19) |
| `x2_weald` | [10, 11] | `east_road` | `wl_wolves` 1, `wl_wisps` 1, `wl_moths` 1 | wolves = fen_wolf x2 (14); wisps = reed_wisp x2 (16); moths = lantern_moth x2 (12) |
| `x2_heronwade` | [10, 10] | `east_road` | `hw_slimes` 1, `hw_wolves` 1, `hw_wisps` 1, `mother_glassback` 1 | slimes = mire_slime x3 (15); wolves = fen_wolf x2, mire_slime (19); wisps = reed_wisp x2, mire_slime (21) |
| `x2_southmere` | [10, 11] | `east_road` | `sm_slimes` 1, `sm_wolves` 1, `sm_moths` 1 | slimes = mire_slime x3 (15); wolves = fen_wolf x2 (14); moths = lantern_moth x2 (12) |
| `x2_isle` | [10, 11] | `east_road` | `is_moths` 1 | lantern_moth x2 (12) |
| `x2_light_f1` | [10, 11] | `court` | `lt_moths` 1, `lt_watch` 1 | moths = lantern_moth x2, reed_wisp (20); watch = drowned_watchman, lantern_moth (18) |
| `x2_light_f2` | [11, 11] | `court` | `lt_pair` 1, `last_lamplighter` 1 | pair = drowned_watchman, reed_wisp (20) |
| `x2_cistern` | [11, 12] | `court` | `cs_beads` 1, `cs_wisp` 1, `mercury_mother` 1 | beads = quicksilver x3 (27); wisp = glint_wisp, quicksilver (31) |

20 placed ordinary groups at the normal elite rate [Fact: `ELITE_RATE` applies; bosses `noElite`]. Only the Cairnwatch pair, the Weald, Southmere and the Isle group can be met without choosing a dungeon.

### 9.3 The four optional bosses

All use `ai: 'phased'` (data-driven phases, summons, haste: the Briar Alpha's AI [Fact: `ai.js` `phased`]) plus traits that exist (`charge` telegraphs, `reflectWhileProtected`, `opener`, innate `split`, `knight_cover`):
**no `ai.js` change**. Boss table rules: `noFlee`, `noElite`, music `x2_boss`, `flag: <id>_defeated`, backdrop as the zone. Targets at the **plan level** (a completionist): careful 6 to 9 rounds, win 85% or more, attack-only 65% or less, ignoring the
telegraph at least 10 points worse; one level under the plan level (a player who arrives early): careful win 55% or more.

| id | Name | Lv | HP | ATK / MAG | DEF / SPR | SPD | Sh | Weak | Resist | Telegraph (answer) | Phases | EXP raw / Gold / Mastery | Loot |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `waymarker` | The Waymarker | 10 | 700 | 60 / 12 | 26 / 10 | 8 | 6 | axe, thunder | sword, spear | **Fall of Stones** (party 110%; Defend) every 3 from turn 2 | Waymark (100%); Raised Cairns (50%: summons `cairn_stone`, shields to 4) | 28 / 220 / 8 | `waymark_pike`, 1 rare (ilvl 10), Hi-Potion 2 |
| `mother_glassback` | Mother Glassback | 10 | 760 | 56 / 10 | 28 / 14 | 9 | 5 | axe, thunder | sword, bow, ice | **Glass Ram** (single 200%; Defend, or Lunge) every 3; opens with Harden; reflects magic while Protected | Queen (100%); Brood (50%: summons `glassback_pup`, shields 4) | 32 / 240 / 8 | `glassback_carapace`, 1 rare (ilvl 10), Antidote 2, Hi-Potion 2 |
| `last_lamplighter` | The Last Lamplighter | 11 | 800 | 64 / 30 | 24 / 16 | 11 | 5 | thunder, axe, light | ice | **Lamp Verdict** (single 210%; Guard or Defend) every 3; Shutter (Protect self) | The Watch (100%); The Lamp Gutters (50%: summons `gutter_moth` x2, haste, party Blind 20% once) | 32 / 260 / 8 | `lamplighters_lens`, 1 rare (ilvl 11), Phoenix Feather 1 |
| `mercury_mother` | The Mercury Mother | 12 | 820 | 52 / 74 | 10 / 18 | 10 | 4 | thunder, ice | fire | **Mercury Surge** (party mag 125%; Defend) every 4 from turn 3; innate split at 30% into two `quicksilver_bead` | The Pool (100%); The Tide (50%: summons `quicksilver_bead` x2, shields 4) | 32 / 280 / 8 | `mirrorpool_rod`, 1 rare (ilvl 11), Hi-Ether 1 |

Adds pay 0 EXP and 0 gold (the Quicksilver Bead already does [Fact: enemies.js]); the Cairn Stone, Glassback Pup and Gutter Moth reuse existing frames.

### 9.4 Field-fight placement

Per zone `move`: Cairnwatch `wander` r2 and `guard`; Quarry `patrol` 6 (the one chaser), `guard`, `guard`; Weald `wander` r2, `guard`, `wander` r2; Heronwade `wander` r2, `patrol` 6, `guard`; Southmere `wander` r2, `patrol` 6, `wander` r2; Isle
`wander` r2; Light F1 `wander` r2, `guard`; F2 `guard`; Cistern `patrol` 6, `guard`. At most one `chase` per zone, with the 3-tile notice and 10-frame pace [Fact: actors.js].

### 9.5 New skills and statuses

None. The telegraph skills are new `skills.js` entries (`cairn_fall`, `grave_chill`, `fall_of_stones`, `lamp_verdict`, `mercury_surge`, `tide_verdict`, `wisp_lure`, `bog_spit`, `settle`, `dazzle`, `wing_dust`, `chill_touch`, `salt_blade`) with a telegraph line each,
in the style of `glass_ram`; no new status, no new party skill.

### 9.6 EXP: today's, with a capped bonus (Scott withdrew the lower-EXP policy, 2026-10-25)

**Rule.** Nothing about EXP changes in Episode 2: no foe pays less, the main route, its sim targets and its levels are today's, and a story-only versus completionist gap is not a goal. Optional content is never
required and pays in gold, named gear and items plus a small EXP bonus, capped so a completionist is at most about one level over today's plan at each main boss (the Other Selves and the King; Episode 1's Echo Warden and
Archivore are in `EXPANSION1_PLAN.md` 7.2). No Config toggle exists.

**Where it lives.** `src/data/expcurve.js` is created by X1-battle in the Episode 1 build and holds `EP1_EXP_SCALE = EP2_EXP_SCALE = EP3_EXP_SCALE = 1`, `OPTIONAL_FOE_EXP_MUL = 1` and `EXPANSION_FOE_EXP_MUL = 0.1`;
`rules.js` and `encounters.js` already apply `expScale(zone) x expMul` once, per unit. **X2-battle edits none of those files**; it writes `expMul: EXPANSION_FOE_EXP_MUL` into each new optional group and boss in its own
`src/data/x2/encounters.js` (and may set an explicit smaller `expMul` on a group if its ledger needs it). Quest EXP is `await s.give('exp', n)` (one primitive, built by X1-world), never scaled. Gold, mastery and drops are unscaled.

**The math** (Fact: `progression(1, 2)` run 2026-10-25; thresholds `EXP_TABLE`: Lv 10 1,493, Lv 11 1,878, Lv 12 2,314, Lv 13 2,800, Lv 14 3,339, Lv 15 3,931). Today's Episode 2 route, cumulative after each zone: road 1,595,
Court F1 1,901, F2 2,327, F3 2,835, throne 3,335 (so the entries are 1,433, 1,595, 1,901, 2,327 and 2,835; the King is met at 2,835, Lv 13).

| Main boss | Today | One level over ends at | Extra EXP allowed (cumulative, Hollow included) |
|---|---|---|---|
| Other Selves | about 2,180 (F2 end 2,327 less the three reflections' pay), Lv 11 | 2,799 (Lv 12) | about 620 (472 on the conservative reading at F2 end) [Inference; check: `completionRows(2)` reads the reflections' EXP] |
| The King | 2,835, Lv 13 | 3,930 (Lv 14) | 1,095 |

**The supply (first pass; raw EXP times `expMul` 0.1; X2-battle's ledger replaces the estimates and keeps the caps):**

| Source | Raw | Effective | Timing (worst order) |
|---|---|---|---|
| Cairnwatch (2 groups) | 31 | 3 | before F1 |
| Quarry (3 groups + Waymarker 28) | 81 | 8 | before F1 |
| Heronwade (3 groups + Mother Glassback 32) | 87 | 9 | before F1 |
| Weald (3 groups) | 42 | 4 | before F1 |
| Southmere (3 groups) | 41 | 4 | before F1 |
| Isle (1 group) | 12 | 1 | before F1 (opens at `court_ferry_open`) |
| Light F1 and F2 (3 groups + Last Lamplighter 32) | 90 | 9 | before F1 |
| Q1 6, Q2 4, Q3 8, Q4 4 | | 22 | before F1 |
| **Before F1, worst order** | | **60** | |
| Cistern (2 groups + Mercury Mother 32) | 90 | 9 | after F1, before F2 |
| Q6 | | 8 | after F1 |
| Q5 | | 4 | after `nico_crowns_done` or `nh_restored` |
| **Total new optional EXP, Episode 2** | 474 | **47 from foes + 34 from quests = 81** | |

**Worst-order ledger.** The Episode 1 completionist arrives with up to 387 EXP over the regular route (129 new plus the Hollow's 258; `EXPANSION1_PLAN.md` 7.2), so the cap is checked on the sum:

| At | Today | Completionist | Level (today) | Cap and margin |
|---|---|---|---|---|
| Road entry | 1,433, Lv 9 | 1,820 | Lv 10 (9) | +1 level |
| Court F1 entry | 1,595, Lv 10 | 1,595 + 387 + 60 = 2,042 | Lv 11 (10) | +1 level |
| Court F2 entry | 1,901, Lv 11 | 1,901 + 387 + 77 = 2,365 | Lv 12 (11) | +1 level |
| Other Selves, before the fight | about 2,180, Lv 11 | about 2,180 + 387 + 77 = 2,644 | Lv 12 (11) | +1; cap 2,799, margin about 155 |
| Court F3 entry | 2,327, Lv 12 | 2,327 + 468 = 2,795 | Lv 12 (12) | +0 |
| The King | 2,835, Lv 13 | 2,835 + 468 = 3,303 | Lv 13 (13) | +0 (cap 3,930) |
| After the King | 3,335, Lv 13 | 3,803 | Lv 14 | |

A player who comes from the regular route (or the `newGameEp2` quick start, 1,433) and does all of Episode 2's optional content is only 81 EXP over: the same levels as today at every entry. Elites add at most about 5.
**Levers if a cap breaks (in order):** lower quest EXP; lower the group `expMul` (0.05 to 0.15); never a main-route foe, a scale or a main-route sim number.

**tools/sim (additions only; X2-battle, after P1; the existing sim is unchanged):**

| File | Change |
|---|---|
| `tools/sim/x2.mjs` (new) | `X2_OPTIONAL` (the supply above), X2 zone loadouts, X2 boss targets, `economyX2()`, and the Episode 2 rows of `checkOptionalCaps()` (Other Selves, the King), reading `optional_exp.mjs` from the Episode 1 build |
| `tools/sim/simulate.mjs` | one registration line for `x2.mjs`; nothing else (`progression()`, `TARGETS`, `route.mjs`, `loadouts.mjs`, `BOSS_LEVELS` stay as they are) |

**Gold [Inference; check `economyX2()`]**: optional battle gold about 2,200 (20 groups about 60, 4 bosses about 250), chests about 2,800 (9 gold at 100 to 200 less the two retired waystone chests, 14 iron at 40 to 90, wood), quests none. A
completionist is about 4,000 richer than the main route at the King; the Smithy's whole shelf is about 9,000, so "never everything" holds; the Lodge and the Isle are two sinks. `checkEconomy2` is untouched; the new check asserts main
route plus optional gold at the King is below the shelf plus 2,500.

**Loadouts for the per-fight sim [Reuse]:** Cairnwatch, Quarry, Weald, Heronwade, Southmere use the `east_road` loadout at Lv 10; the Isle and the Light's F1 the `court_f1` loadout at Lv 10 to 11; Light F2 `court_f1` at Lv 11; the Cistern the
`court_f2` loadout at Lv 11 to 12. Ordinary targets as Episode 2 (3 to 5 rounds, win 97%, HP lost 50% or less, attack-only noticeably worse). `qa/battle/x2_data.test.mjs` also asserts: every zone's plan sum equals its map's enemy events, raw EXP as the table,
no ordinary group over 21 raw EXP, no add pays EXP, every new group carries the expansion `expMul`, the ledger caps above.

---

## 10. Loot, items and shops

### 10.1 Budgets (what "fits the existing tier tables" means, and how gear bridges)

Tier 3 bases are ilvl 9 (sold in the Hollow from arrival), tier 4 bases ilvl 11 (the Silverglass Smithy after `court_f2_done`) [Fact: items.js]. **Policy (gear is the optional content's main reward, since its EXP is capped):** a named item sits at **tier 4 plus at most 2 points of its primary stat**,
found at the road stage (Lv 9 to 10) when the shops sell tier 3, so it is "tier 4 early"; its secondary stats are resists and utility. Nothing exceeds the Episode 2 legendaries (Lanternheart ATK 24 + light, Kept Promise 28, Hollowcrown 33) in identity or the slot's top stat by more than the 2.

| Slot | Tier 3 base | Tier 4 base | X2 placed cap | Notes |
|---|---|---|---|---|
| Spear / axe ATK | 22 / 25 | 30 / 34 | 31 / 32 | `waymark_pike` 31, `reedcutters_hook` 32 (spd -1) |
| Staff (MAG, MP) | 18, +6 | 25, +8 | 27, +9 | `mirrorpool_rod` |
| Body DEF | 13 (8 + 7 SPR) | 18 (11 + 10) | 19; robe n/a | `glassback_carapace` 19, `merewarden_surcoat` 17 + SPR 6 |
| Head DEF | 6 | 8 | 9 | `quarrymans_cap` |
| Boots | SPD 2, DEF 1 | SPD 2, DEF 2, HP 15 | the same + a resist | `heron_boots` |
| Mantle | DEF 3, SPR 2, LUK 3 | DEF 4, SPR 4, ink 10 | DEF 5, SPR 5 | three mantles |
| Charm | one stat 3 to 4 + one resist | same | two stats + a resist, HP up to 40 | seven charms |

Prices follow the slot's nearest base (within 15%). Rarity: boss weapons and armor are `legendary` with these tier-4-plus numbers (Thornwake precedent); chest finds are `rare`; quest rewards `rare` or `set`.

**Gear and the cap [Inference; check: one informational sim pass of the four bosses with the named kit equipped].** The EXP cap (9.6) keeps a completionist at most about one level over today's plan; the named kit (carapace or surcoat, cap, a mantle,
boots, the pouch and the lens) is worth about +3 DEF, +2 SPR, +70 HP and +5 weapon ATK over the shop's tier-4 kit and arrives two zones earlier. That is the reward, and it is optional. X2-battle checks that the four optional bosses stay inside their targets
at their plan levels with the kit on and the main route stays untouched.

### 10.2 The 17 new placed items (`UNIQUES`, ids final)

| id | Name | Rarity | Slot / who | Stats | Source |
|---|---|---|---|---|---|
| `waymark_pike` | Waymark Pike | legendary | spear (Bram) | ATK 31, DEF 3, Blind resist 40% | Waymarker (guaranteed) |
| `glassback_carapace` | Glassback Carapace | legendary | body (hero, Bram) | DEF 19, SPR 3, HP 20 | Mother Glassback (guaranteed) |
| `lamplighters_lens` | Lamplighter's Lens | legendary | charm (all) | MAG 5, SPR 3, light +15%, Blind resist 50% | Last Lamplighter (guaranteed) |
| `mirrorpool_rod` | Mirrorpool Rod | legendary | staff (Mira) | ATK 9, MAG 27, SPR 4, MP 9, ice +12% | Mercury Mother (guaranteed) |
| `merewarden_surcoat` | Merewarden Surcoat | set | body (all) | DEF 17, SPR 6, HP 25 | Q3 reward (Ines); third piece of `merewardens_watch` |
| `reedcutters_hook` | Reedcutter's Hook | rare | axe (hero, Bram) | ATK 32, crit 4, SPD -1 | Heronwade sluice plug (Shove) |
| `quarrymans_cap` | Quarryman's Cap | rare | head (all) | DEF 9, SPR 3, HP 12 | Quarry Office (Shove + Lantern) |
| `cairnkeepers_glass` | Cairnkeeper's Glass | rare | charm (all) | SPR 4, LUK 3, HP 10, Blind resist 50% | Cairnwatch overlook (Lantern) |
| `heron_boots` | Heron Boots | rare | boots (all) | SPD 2, DEF 2, HP 15, Poison resist 50% | Heronwade island (Appraise) |
| `sundial_charm` | Sundial Charm | rare | charm (all) | SPD 2, MAG 3, LUK 3 | Isle sundial (beam) |
| `wick_charm` | Wick Charm | rare | charm (all) | SPD 1, HP 20, Blind resist 30% | Light F1 cellar (Dash) |
| `tidewatch_mantle` | Tidewatch Mantle | rare | mantle (all) | DEF 4, SPR 5, LUK 2, ink resist 15% | Cistern closet (Lantern) |
| `cairnwalker_mantle` | Cairnwalker's Mantle | rare | mantle (all) | DEF 5, SPR 4, LUK 3, Blind resist 30% | Q1 (Maren) |
| `provisioners_pouch` | Provisioner's Pouch | rare | charm (all) | HP 40, Poison resist 50% | Q2 (Fitch) |
| `courier_cloak` | Courier's Cloak | rare | mantle (all) | DEF 4, SPR 3, SPD 1, LUK 3 | Q4 (Tess) |
| `chalk_crown_charm` | Chalk Crown Charm | rare | charm (all) | SPD 1, LUK 6 | Q5 (Nico) |
| `orlas_blessing` | Orla's Blessing | rare | charm (all) | SPR 5, MP 14 | Q6 (Orla) |

The set `merewardens_watch` gains a third piece (`pieces: [helm, mantle, surcoat]`); its 2-piece bonus (+3 SPR, +2 DEF, +10% healing) stays and a **3-piece bonus** `{ spr: 5, def: 3, healPow: 15 }` is added. The battle agent checks how `setBonus` in `rules.js` resolves counts (highest
satisfied, or additive) and writes the 3-piece line so a full set is +2 SPR, +1 DEF and +5% healing over the pair [Inference: one number to confirm].

### 10.3 Zone loot and chests

`ZONE_LOOT` (random tables never roll legendaries): `x2_cairnwatch` ilvl 9 chance 0.15; `x2_quarry` 10 / 0.15; `x2_weald` 10 / 0.15; `x2_heronwade` 10 / 0.15; `x2_southmere` 10 / 0.15; `x2_isle` 10 / 0.15; `x2_light_f1`, `x2_light_f2` 11 / 0.16; `x2_cistern` 11 / 0.16. Rolled
chests use the zone's ilvl through `rollChest(tier)`. About 38 new chests; named items are `item:` fields on the chest events, as `chest_helm` is today.

### 10.4 Shops and the inn

| Shop id | Keeper | Stock |
|---|---|---|
| `reed_lodge` | Dunn | potion 22, hi_potion 100, ether 70, antidote 12, eye_drops 14, echo_herb 30, tent 90, phoenix_feather 175, hi_ether 230, silver_salve 125 |
| `isle_chandlery` (after `x2_lamp_done`) | Ines | hi_ether 220, silver_salve 115, phoenix_feather 160; at the Cottage counter |

Bett's bed is 30 gold (`inn` service). `hollow_items`, `hollow_smithy`, `east_peddler` are unchanged.

---

## 11. Music and sound (Scott's decision 2; X2-audio)

Nine new tracks, composed in code like `archive`, `mystery`, `ash_road` (`tools/music/`, the pipeline in `docs/MUSIC.md` and `docs/briefs/E3-audio.md`): seamless loops, -16 LUFS, loop metadata, piano-roll review images, the shared four-note name motif
(`NAME_MOTIF`) used as in the other tracks (it stops after its third note in places that are "still forgetting", completes where something is kept). Music stays lazy-loaded (never precached).

| id | Where | Brief | Key, tempo | Motif |
|---|---|---|---|---|
| `x2_heights` | Cairnwatch Heights, the Overlook | a high moor in wind: low whistle and plucked strings over a walking drone, a stone-bell on every eighth bar (a cairn being set) | A Dorian, 92 BPM, 4/4, 80 s | the first three notes in the whistle |
| `x2_marsh` | Heronwade | reeds and water: marimba and flute over soft rain-like shakers, a long heron-call on the clarinet every sixteen bars | G Mixolydian, 78 BPM, 6/8, 80 s | in the flute, resting where the fourth belongs |
| `x2_isle` | Lamplight Isle, the Cottage's yard | a lullaby by the sea: music box and harp over a slow pulse, a distant buoy bell | D major (pale), 66 BPM, 3/4, 70 s | complete, on the buoy bell (the Isle remembers) |
| `x2_weald` | the Silverbirch Weald | a travel theme in birch-clear sunlight: fiddle and plucked guitar over a hand drum, light, dappled and unhurried | E minor turning to G, 100 BPM, 4/4, 90 s | a sketch of the road theme in the fiddle; the fourth note arrives in the major turn |
| `x2_shore` | Southmere Shore | a long beach: slack-key guitar and concertina over a cello pad, a tidal brush-shaker swell every eight bars, a far bell buoy; slower and lonelier than the Weald and sharing no melody with it | F# Dorian, 84 BPM, 4/4, 90 s | the motif on the concertina, the fourth note held and left unanswered |
| `x2_quarry` | the Cairnmakers' Quarry | stone and work: low strings, a bowed stone-gong, slow pick-and-sledge percussion, a sparse choir hum (no counting figure: Episode 1's barrow track owns that idea) | C Phrygian, 60 BPM, 4/4, 90 s | the motif set note by note like stones, each a little louder, completed once at the loop's end |
| `x2_lamp` | the Merewarden Light (F1 and F2) | a lighthouse at dusk: celesta and strings in a rising pattern that climbs the tower (F1 lower, F2 the same line an octave up), a bell on the downbeat | F major, 72 BPM, 3/4, 80 s | the full motif rises on the lamp's top note |
| `x2_cistern` | the Reflecting Cistern | water and glass: harp and glass percussion in canon with its inversion (the Court's idea, wetter), a slow drip | B Dorian, 70 BPM, 4/4, 90 s | motif and inversion in counterpoint |
| `x2_boss` | the four optional bosses | a guardian's fight: ostinato strings and bass drum, brass chords; a B section that quotes the motif in the minor; one track serves all four | D minor, 128 BPM, 4/4, 100 s | the motif in the brass |

Fallbacks (if a track is not ready): `x2_heights` -> `fading_road`; `x2_marsh`, `x2_isle`, `x2_weald`, `x2_shore` -> `valley`; `x2_quarry` -> `mystery`; `x2_lamp`, `x2_cistern` -> `court`; `x2_boss` -> `boss_king`.

**SFX (8) and ambience (2), in the `ep2` pack** (the manifest `packs.ep2`, so they are runtime-cached and **not** in the 6.5 MB initial download [Fact: `qa/pwa/precache.test.mjs` and `assets/audio/manifest.json` today: 83 core, 7 `ep2`, 10 `ep3`]; the pack hook `audio.loadPack('ep2')` is
existing): `cairn_set` (a stone settling on stone), `plank_creak`, `heron_call`, `lamp_ignite` (a warm swell and a small flame), `lens_turn`, `tide_rise`, `hatch_open`, `wick_snip`; ambience `marsh_reeds` and `isle_surf`. Total under 0.35 MB at 22 kHz mono. **The 6.5 MB cap is not raised**; the new pack
is checked by `qa/pwa` (`XP-packs.md`).

Docs: `docs/MUSIC_X2.md` gets nine sections and `docs/SUNO_PROMPTS.md` nine appended rows (one per track, shared style line; the Weald and Southmere rows are separate). Cue sheet: cairnwatch `x2_heights`; quarry `x2_quarry`; weald `x2_weald`; southmere `x2_shore`; heronwade `x2_marsh`; isle `x2_isle`; light F1 and F2 `x2_lamp`; cistern `x2_cistern`; the lodge, the hut and the cottage `willowmere`; the four optional bosses `x2_boss`;
`x2_light_lit` swaps to `triumph` and back, `x2_maren_stones` to `triumph`; the Lamplighter's last box to `sorrow`.

---

## 12. Assets (what is reused, what is new)

**Packaging rule (`XP-packs.md`, shared with the Episode 1 build):** all new art ships as **separate `x2_`-prefixed files** (a sheet with a tile fragment, new atlases), listed in the pack's own manifest fragment `assets/x2_manifest.json`
(`sync-manifest --pack x2`) and merged and loaded by `ensurePack('x2')`; no shared atlas, `tiles.json` or `assets/manifest.json` is appended to, so the initial download is unchanged. The Episode 1 build set the same rule.

### 12.1 Tiles and tile objects (X2-tiles; new sheet `assets/tiles/x2.png`, entries in `x2_tiles.json` merged into `tiles.json` by the pack loader)

| Asset | Reuse | New |
|---|---|---|
| Terrains | `shallow`, `moss`, `sand`, `dirt`, `tallgrass`, `glass_floor`, `gallery_floor`, `mere_water` | `quarry_rock` (quarry floor), `mercury` (silver pool, `water` collision, `reflect: true`, 3-frame shimmer), `birch_floor` (pale leaf litter for the Weald), `saltpan` (white-crusted shallow for Southmere) |
| Wall systems | `cliff`, `court`, `court_gallery`, `interior_stone` | `quarry` (timbered rock and cut stone; top, face, out) and `lighthouse` (whitewash, a blue band; top, face, out) |
| Buildings | `house_small`, `inn`, `toll_ruin` | `reed_lodge` (5 x 4), `reed_hut` (3 x 3), `cairn_hut` (stone hut), `keeper_cottage`, `lighthouse` (3 x 6, unlit and lit frames), `boathouse_ruin`, `watchtower_ruin` (3 x 6, tall), `mill_ruin` (4 x 3), `wreck_tern` (4 x 3) |
| Objects | `cairn`, `push_block`, `beam_lens`, `mirror_stand`, `mirror_heavy`, `receptor`, `font_silver`, `stairs_in_*`, `door_glass_*`, `chest_*`, `brazier_*`, `reeds_*`, `chalk_crown`, `tree_birch_silver` | `cairn_block`, `fallen_oak`, `driftwood_log`, `great_cairn` (3 x 5), `waymark_pedestal`, `cache_cairn` (a cairn with a hollow side; empty and stocked), `quarry_door_closed/open`, `heron_statue`, `hide_hut`, `spotting_scope`, `drying_rack`, `reed_bundle_stack`, `nest_mound`, `sluice_plug`, `boat_moored`, `net_rack`, `lamp_great` (empty, lens, lit), `lens_bench`, `sundial`, `crypt_hatch` (closed, open), `tide_door`, `skinning_rack`, `birch_carved` (the nine Wishing Birches), `tide_mirror` (reuse `mirror_great` if the framing fits) |
| Overlays and overhead | `ink_bridge_*`, `bridge_wood_*`, `glass_bridge_*`, `court_far`, `sign_blank` | `lamp_beam`, `light_far`, `watchtower_far`, `sign_blank_heron`, `sign_blank_isle`, `sign_blank_weald`, `sign_blank_southmere` |
| Backdrops | `east_road`, `court` | none |

### 12.2 Sprites (X2-sprites; new atlases `x2_npcs`, `x2_enemies_battle`, `x2_enemies_field`, `x2_bosses_battle`, `x2_portraits`; heads in `x2_heads`)

| Asset | Reuse | New |
|---|---|---|
| NPCs `npc_maren`, `npc_dunn`, `npc_bett`, `npc_marit`, `npc_ines`, `npc_harn` | the paper-doll builder, bodies: old woman, farmer, shopkeeper, child, robe, guard | 6 specs in `chars/x2_npc_specs.py` |
| Enemy battle and field sprites | cells 0, 1, 3, 4, 5, 7 of `enemies.webp`, the recolor and derive pipeline, rim light | `mire_slime`, `reed_wisp`, `cairn_golem`, `delver_shade`, `lantern_moth`, `drowned_watchman` |
| Bosses | the boss cell crop and `build_bosses.py` | `waymarker`, `mother_glassback`, `last_lamplighter`, `mercury_mother` (battle) and field avatars; integer scaling only |
| Portraits | the E2 tier | `maren` and `ines` hand-pixeled (48 and 32); the rest none |
| Aliases (no art) | | `fen_wolf` -> `mist_wolf`, `cairn_stone` -> `cairn_golem`, `glassback_pup` -> `glassback`, `gutter_moth` -> `lantern_moth` |

---

## 13. Save compatibility (the section that decides whether Scott's saves survive)

1. **New flags only** (3.2). No flag is renamed, removed or redefined; `FLAGS` and `FLAG_IDS` both gain the new keys when the pack registers (the registration pushes onto `FLAG_IDS`, which is computed before the Episode 3 flags today [Fact: quests.js line 167 vs 991]; `XP-packs.md` makes the seam).
2. **New maps, no renamed or removed map ids.** A save standing on any existing map loads as before.
3. **Existing maps change only by appended events and overlays** (section 5), gated by `x2On()` (the switch on and the `x2` pack ready); every existing event id, cell, door target, mark, exit and chest id is unchanged, so `game.opened` still opens the same chests.
4. **No save lands in a solid cell**: the edits never solidify a cell the old map left walkable within one tile of a mark, door, trigger, NPC or the critical path; `qa/maps/x2_regression.test.mjs` flood-fills each edited map before and after (from stored goldens) under four flag
   sets (finished Episode 2; at the Waystation; at Court F1; at the throne) and requires old reachable to be a subset of new.
5. **A save that finished Episode 2 can walk back into every new area**: it has `saw_court`, `court_ferry_open`, `court_f1_done`, `lantern_of_recall`, `crossing_done`, `nh_restored`, so the west stair, the toll bridge, the Isle post, the Hollow's two gates and Orla's quest are all available.
   A save from before a gate meets it when it earns it.
6. **EXP and saves.** Nothing changes: every scale is 1.0, a save keeps its EXP, level and gear, no existing reward changes, and the quick starts (`newGameEp2` Lv 9 / 1433, `newGameEp3` Lv 13 / 2900) keep their parties. Only the new optional groups pay at `expMul` 0.1 and the
   quests a few points (9.6).
7. **Quest state is derived from flags** (`activeSideQuests`), so no new save field exists; `game.counters` gains `x2_chalk_n` only. Quest EXP is granted once, guarded by the quest's own `done` flag.
8. **Mid-quest saves are safe** because every step is a flag set by an event the map keeps: the Lamp quest is resumable at any leg (key items persist, `x2_lens_set` is a flag, latched receptors persist through `x2_lamp_a` and `x2_lamp_b`); Strangers' Stores is resumable
   because each cairn's state is its `x2_cache_*` flag.
9. **The pack loads on need** (`XP-packs.md`): a save that satisfies `wanted` (`ep1_complete` or a quick start) fetches the `x2` pack in the background behind the title and again before Continue enters the field (at most 1.5 s, then on regardless); offline play works after the first
   successful load (runtime cache and the idle warm of every pack file); a failed load shows one single-line notice, retries, and the party plays Episode 2 without the new branches (every new door and the extra events of the six edited maps exist only when the pack is ready).
10. **Episode 3's `EPILOGUE2_LIVE` and the wake at `nh_inn` `inn_bed` are untouched**; no edit moves `inn_bed`. Credits (`CREDITS_EP2`, `creditsPending`, `END_CARD_EP2`) unchanged.

---

## 14. The Episode 3 interface (what Episode 3 should assume)

**What E3 should assume at its start: a regular-route start.** The Episode 3 quick start (`EP3_START_EXP = 2900`, Lv 13) stays exactly as it is. It matches today's data for Episode 2's end (2,835 before the King, 3,335 after it, Lv 13): the regular route, **not** a
completionist start. A completionist arrives a little higher: up to 3,803 EXP (Lv 14) after the worst-order ledger of 9.6, and about 3,416 when only Episode 2's optional content is added to the regular route. Episode 3 takes no change from this plan. [Fact for today's data; Inference for
the ledger, check: `completionRows(2)`.]

| E3 assumption [Reported: EPISODE3_PLAN] | X2 effect | Adjustment |
|---|---|---|
| Starts at Lv 13 / 2,900 EXP | the regular route ends Episode 2 at 3,335 (Lv 13); a completionist up to 3,803 (Lv 14) | none; E3 keeps the regular-route start |
| Episode 3 foes' EXP is raw (`EP3_EXP_SCALE = 1`) | every scale is 1.0 | none |
| Sim `levels` for `sand_road` start [13, 13] | unchanged | none |
| Hollowmere gate chained; `sand_chain` region x >= 36, y 22 to 30 | X2 keeps every cell with x >= 36 and y 22 to 30 clear; the new south gate is at x 28 to 30, y 33 | none |
| `penny_e` hides when `sand_gate_open`; Garrick hides from `ep3_started` | no X2 quest uses either as a giver | none |
| `mainQuestFor` returns the Episode 3 quest once `ep3_started` | X2 side quests continue | none |
| E3 `economy3` starts at 1,500 gold | a completionist arrives about 4,000 gold richer | E3-battle: check `checkEconomy3` with the quick start (unchanged) and note that real saves are richer |
| The Bell House gets a Keeper mirror paired with Hollowmere's square mirror | X2 adds `mirror_warp_sq2` beside the plinth (Cairnwatch pair) | E3-maps: use a different cell for its own pair; keep `mirror_warp_sq` and `mirror_warp_sq2` untouched |
| `EPILOGUE2_LIVE` points at the sand gate | X2 adds side-quest Talk for errands | none required; one free line (below) |

Net: **no Episode 3 plan change is required**. One recommended line for E3-story: after `ep2_complete`, a "Maren, Ines and Dunn have things for you if you have the time" Talk line when any X2 quest is open (data in `x2/quests.js`, free).

---

## 15. Shared engine needs (reconciled 2026-10-25: almost all of it is built once, in the Episode 1 build)

| # | Need | Owner | Status here |
|---|---|---|---|
| N1 | Appraise reveals on objects (`appraise: true`, `appraiseText`, `behind: 'appraise:<id>'`, saved in `game.opened`) | X1-world (Episode 1 build, wave 2) | **Retired here**: built once at the existing Appraise range; this plan's #6, #12 and #25 use it. Fallback: Lantern ink at the same spots (#6, #12) and a Dash pane (#25), behind one constant `X2_APPRAISE` |
| N3 | Block art by id: `block` events accept any tiles.json object id as `sprite` (`cairn_block`, `fallen_oak`, `driftwood_log`, `sluice_plug`); a heavy block satisfies a `plate` | X2-world (verify and test; smallest diff) | kept; fallback `push_block` |
| N4 | Hidden ink over water in a field map (`ink_bridge_*_faint` over `water` with `pitTo` and the Lantern reveal) | X2-world (test) | kept; fallback an `ink` terrain strip under the bridge |
| N6 | `mapcheck` additions in a new `tools/maps/x2_check.mjs` plus one seam line: load `STAGING_X2.md`, a second ferry post and stairs as exits, a Keeper mirror pair as an exit, a `pack` guard as walkable (the Appraise unlocker is X1-world's) | X2-world | kept |
| N8 | Quest EXP primitive | X1-world | **Retired**: quests call the one `await s.give('exp', n)` (never scaled, guarded by the caller's flag) |
| N9 | The expansion pack (`ensurePack`, the data index, PWA exclusion, budget) | XP-packs (Episode 1 build, wave 1) | **Retired here**: `XP-packs.md`; this plan only supplies `src/data/x2/*` modules that export `register()` and `x2_`-prefixed assets |
| N10 | Atlas resolution across atlases | XP-packs | **Retired here** |
| N11 | EXP constants in one place | X1-battle (`src/data/expcurve.js`) | **Retired here**: every scale is 1.0; this plan edits none of `expcurve.js`, `rules.js`, `encounters.js` |

**Not needed (and why):** a world-travel map screen (every new place is an ordinary exit, stair or boat post); new event types (every mechanism here exists: `ferry`, `door` kinds, `block`, `plate`, `beam`, `mirror`, `receptor`, `gate`, `object` with `breakable`
or `lantern`, `font`, `chest`, `trigger`, `actor`, ink-bridge overlays, `behind`); a new field mechanic; a settings toggle for the EXP curve (Scott: no).

---

## 16. Added playtime (honest) and cut lines (unused)

Per feature, first play, fights about 1.5 minutes live, walking at the bot's pace times 1.5 [Inference; method as PLAYTEST_REVIEW_3 section 4]. Check: `qa/integrate/story_time.py` plus a timed autoplay of every optional leg (X2-integrate).

| Piece | Minutes |
|---|---|
| Cairnwatch Heights (80 x 40; 2 fights, 4 secrets, Maren, the ravine and the overlook) | 14 |
| The Quarry (3 fights, the Shove room, the Waymarker) | 14 |
| The Weald (76 x 44; 3 routes, 3 fights, 5 secrets, Harn) | 20 |
| Heronwade (72 x 44; 3 fights, 3 boardwalks, Mother Glassback, the Lodge and the Hide) | 24 |
| Southmere Shore (84 x 36; 3 fights, 5 secrets, the causeway) | 18 |
| Lamplight Isle (1 fight, the sundial, the Cottage) | 7 |
| The Light (3 fights, two beam rooms, the Lamplighter) | 20 |
| The Cistern (2 fights, mirrors, bridges, the Mercury Mother, the loop) | 20 |
| Court secrets (3), road and Hollow secrets (5) | 14 |
| Quest legs and dialogue not counted above (Q1 to Q6) | 24 |
| First-arrival scenes, signposts, far views | 8 |
| **Total** | **183 (3.0 hours; range 2.3 to 3.6)** |

Critical path: +0 forced; +1 to 3 minutes of optional-looking text a player may read. Fights on the main route are exactly as long as today's.

**Cut lines (Scott: build all; none is taken).** Kept so the orchestrator can stop under pressure without waste; every cut leaves a complete game because each map's doors, scenes and quests are flag-gated and modular.

| Cut | Drops | Saves | Left |
|---|---|---|---|
| A (unused) | Q5, the Court secrets, the Hollow secrets | 20 min | 163 |
| B (unused) | A + the Cistern and Q6 (and the Silver Stair loop) | 42 min | 141 |
| C (unused) | B + the Isle, the Light, Q3, the Surcoat | 69 min | 114 |
| D (unused) | C + Southmere and its causeway | 87 min | 96 |
| E (unused) | D + the Weald and Heronwade, Q2, Q4 | 131 min | 52 |

A cut only lowers the EXP supply of 9.6; no cap there can break.

---

## 17. Build plan

**Run order (strict; `docs/EXPANSION_SCHEDULE.md` is the ordered list with launch prompts).** Nothing in this section starts before the Episode 1 expansion is complete, including its integrate agent and its publish P1 and the review fixes (P1b): the shared files below have
one writer at a time, and this plan's art, audio, battle, world and shared-data agents come second. **Exception: X2-story** writes only new files (`src/data/x2/{story,quests,npcs,text}.js`, its staging doc, its tests), so it may run earlier, from the moment the Episode 1 maps wave (W3) has
closed. `XP-packs` (the pack mechanism, the budget ratchet, `expcurve.js` via X1-battle) was built in the Episode 1 build; the first draft's X2-packs is retired.

### 17.1 Waves (at most 3 agents at once; the orchestrator may run one at a time under the usage guard)

| Wave | Agents | Notes |
|---|---|---|
| XA | X2-battle, X2-story (if not already done), X2-world | data and engine bits; disjoint paths below |
| XB | X2-tiles, X2-sprites, X2-audio | new `x2_` files only; the audio manifest has this one writer |
| XC | X2-maps-a, X2-maps-b | maps need XA's ids and XB's tiles (stubs allowed) |
| XD | X2-maps-c | the dungeons and the Court edits; needs `x2_check.mjs` and the east_road, nameless_hollow and nh_chapel edits of XC |
| XE | X2-integrate | `X2_LIVE` flip, autoplay (two routes), shots, the critical-path test, the sim gate, the ratchet to 6.45 MB; the orchestrator publishes (P2) |
| XF | X2-review (read-only), then fixes, then P2b | |

Owned paths (new files carry the `x2` prefix; **no X2 path overlaps another X2 brief running in the same wave, or any X1 brief**):

| Brief | Owns |
|---|---|
| X2-battle | `src/data/x2/{enemies,encounters,items,loot,shops}.js`, `tools/sim/x2.mjs`, one registration line in `tools/sim/simulate.mjs`, `qa/battle/x2_*`, `docs/BATTLE_X2.md`. It does **not** edit `src/data/expcurve.js`, `rules.js`, `encounters.js`, `enemies.js`, `items.js` or any other shared data file |
| X2-story | `src/data/x2/{story,quests,npcs,text}.js`, `docs/story/STAGING_X2.md`, `qa/content/x2_*.test.mjs` (`live.js` and `index.js` already exist from XP-packs) |
| X2-world | `src/world/x2_*.js`, small verified edits for N3 and N4 in `src/world/events.js` only if its checks fail, `tools/maps/x2_check.mjs` and its one seam line in `tools/maps/mapcheck.mjs`, `qa/world/x2_*`, `docs/WORLD_X2.md` |
| X2-tiles | `tools/art/tiles/x2_*.py`, the one `x2` line in `tools/art/tiles/build_tiles.py`, `assets/tiles/x2.png`, `assets/tiles/x2_tiles.json`, `tools/art/tiles/out/x2/**` |
| X2-sprites | the one `x2` line in `tools/art/sprites/build_all.py`, `tools/art/sprites/chars/x2_*`, `tools/art/sprites/x2_*.py`, `assets/sprites/x2_*`, `assets/ui/x2_heads.*` |
| X2-audio | `tools/music/songs/x2_*`, `assets/audio/music/x2_*`, `tools/audio/x2_*` (SFX and ambience definitions), `assets/audio/sfx/x2_*`, `assets/audio/ambience/x2_*`, `assets/audio/manifest.json` (through `tools/audio/build.py`, pack `ep2`), `docs/MUSIC_X2.md`, `docs/SUNO_PROMPTS.md` (nine rows appended), `qa/audio/x2_*`, `qa/music/x2_*` |
| X2-maps-a | `src/data/maps/x2_cairnwatch.js`, `x2_hut_maren.js`, `x2_weald.js`, `x2_southmere.js`; edits to `east_road.js`; `qa/maps/x2_a_*.test.mjs`; `docs/MAPS_X2_A.md`; previews `tools/maps/previews/x2_{cairnwatch,hut_maren,weald,southmere}*.png` |
| X2-maps-b | `src/data/maps/x2_heronwade.js`, `x2_reed_lodge.js`, `x2_isle.js`, `x2_keeper_cottage.js`; edits to `nameless_hollow.js` and `nh_chapel.js`; `qa/maps/x2_b_*.test.mjs`; `docs/MAPS_X2_B.md`; previews of these |
| X2-maps-c | `src/data/maps/x2_quarry.js`, `x2_light_f1.js`, `x2_light_f2.js`, `x2_cistern.js`; edits to `court_f1.js`, `court_f2.js`, `court_f3.js`; `qa/maps/x2_c_*.test.mjs`, `qa/maps/x2_regression.test.mjs`; `docs/MAPS_X2_C.md`; previews of these |
| X2-integrate | `qa/autoplay_x2.py`, `qa/integrate/x2_*`, `qa/shots_x2.json`, the flips in `src/data/x2/live.js` (`X2_LIVE`) and the `X2_MAPS_LISTED` line, the budget ratchet, seam fixes in closed briefs' files |
| X2-review | `docs/REVIEW_X2.md` |

### 17.2 Seams (what is left to edit in shared files)

Almost nothing: the pack index registers everything by mutation (`XP-packs.md`), the battle-data seams (`export enemy`, `eq`, `weapon`, `enc`) and the EXP constants were made by X1-battle, the registry seams by XP-packs. What remains, each one line:

| File | Seam | Agent |
|---|---|---|
| `tools/maps/mapcheck.mjs` | `import './x2_check.mjs'` | X2-world |
| `tools/sim/simulate.mjs` | register `x2.mjs` | X2-battle |
| `src/data/x2/live.js` | `X2_LIVE = true` | X2-integrate (last) |
| `src/data/x2/encounters.js` | `X2_MAPS_LISTED = true` (once `qa/maps` is green with all twelve maps) | X2-integrate |
| `qa/pwa/budget_ratchet.json` | raise to 6.45 MB, no more | X2-integrate |

### 17.3 Run order under the usage guard (one at a time)

X2-battle, X2-story (unless done earlier), X2-world, X2-tiles, X2-sprites, X2-audio, X2-maps-a, X2-maps-b, X2-maps-c, X2-integrate, X2-review. Each is sized for one sitting (battle M, story L, world S, tiles M to L, sprites L, audio M to L, maps-a L, maps-b L, maps-c L, integrate M, review M).

---

## 18. Done means

1. A save that finished Episode 2 (the quick start `newGameEp2` and a real credits save) walks into every new area, completes all six quests and returns to Hollowmere, with no softlock and no console error, on desktop and phone, with the pack loaded and with it forced to fail once.
2. The Episode 2 critical path is unchanged: `qa/integrate/x2_critical_path` plays Valley to the credits with no optional step from an Episode 1 save and from `newGameEp2`, and its scene order and reachable marks equal the pre-X2 golden.
3. `node qa/run.mjs` green, Episode 1, 2 and 3 tests unchanged in meaning; `node tools/sim/simulate.mjs --check` prints "All targets met" with every main-route number unchanged, the X2 zones and bosses, and `checkOptionalCaps()` (9.6) with its margins; optional EXP about 81.
4. **Load budget unchanged**: `qa/pwa` shows initial within the ratchet (at most 6.45 MB after this expansion, cap 6.5 MB) and before-the-prompt at most 2.32 MB; the `x2` pack at most 0.8 MB wire; music stays lazy; the `ep2` sfx pack holds the new SFX.
5. `node tools/maps/mapcheck.mjs check` clean for all 12 new maps and the 6 edited ones; every mirror, block and plate puzzle has a solving walk and no softlock; every scene mark exists; every chest is reachable under its verb; previews of all maps viewed and read like shipped SNES maps (landmarks, varied edges, paths that lead the eye); each large field is within the cost rules (1 rule 7).
6. Every secret in section 6 triggered by a scripted walk (`qa/integrate/x2_secrets`), each tell visible in a shot.
7. Autoplay: a **regular route** (the existing bot, unchanged, from `newGameEp2`) beats the King at today's level with zero game overs; a **completionist** run (all optional content, scripted inputs from the maps' solutions) beats the King at Lv 13 or 14 with zero game overs; both on desktop and phone.
8. Shots with zero console errors on desktop and phone: `field_x2_cairnwatch_heights`, `field_x2_weald_birches`, `field_x2_southmere_beach`, `field_x2_toll_bridge_ink`, `field_x2_heronwade_boardwalk`, `field_x2_isle_pier`, `field_x2_light_f1_signal`, `field_x2_light_f2_lamp`,
   `field_x2_cistern_channel`, `field_x2_quarry_hall`, `story_x2_lamp_lit`, `battle_x2_waymarker`, `battle_x2_mercury_mother`, `ui_x2_journal_errands`.
9. Text rules: no em dashes anywhere (`grep` U+2014 over `next/`), every box within 3 x 42, ASCII only, `{hero}`, no word games; no Talk or box names something the player has not learned.
10. The journal lists the six errands without overflow, Talk always names the next leg, the bestiary lists the 14 new records, music and SFX play on every new map with the right fallbacks (nine tracks), and the timed autoplay of every optional leg lands at 150 to 210 minutes (X2-integrate reports the number).
11. `docs/MAPS_X2_*.md`, `docs/BATTLE_X2.md`, `docs/WORLD_X2.md`, `docs/MUSIC_X2.md` and `docs/PWA_PACKS.md` are current.

---

## 19. Risks, assumptions and remaining questions

**Assumptions.**
1. Every EXP scale is 1.0 and the new optional groups carry `expMul` 0.1, so a completionist stays within one level of today's plan at the Other Selves and the King (9.6; Inference for the Other Selves moment, check: `completionRows(2)`).
2. Four optional bosses with tier-4-plus named gear are welcome; none out-ranks an Episode 2 legendary in identity.
3. Ines's husband as the Court's kept Lamplighter fits canon.
4. The expansion pack is built once for both expansions (`XP-packs.md`) and this plan only plugs in.
5. The Appraise reveal is built once by X1-world; the fallback is cheap.

**Risks.**
- **Scope.** Twelve maps (five of them 48 to 84 tiles wide), six quests and seventeen items is larger than the original Episode 2 build. Mitigation: wave order, modular flags, the (unused) cut lines, the one-at-a-time run order.
- **Optional EXP is tiny.** A player may feel the optional world does not level them. That is the instruction (rewards are gold, gear, items); paying more would break the caps of 9.6.
- **Map size and cost** (80 x 40 fields on a phone). Mitigation: rule 7, a pack budget, previews and shots on the phone profile.
- **Pack failure offline.** Mitigation: runtime cache plus the idle warm; a one-line fallback notice (13.9).
- **Phone readability** of boardwalks, ink bridges, mirror states. Mitigation: the phone rule; phone shots in the done list.
- **Delivery quests that read alike** (Courier's Parcels here, Pell's Crates in Episode 1): different givers, places and tone; the critics check.

**Remaining questions for Scott.** None open. Answered: the old-curve toggle (no, and the whole EXP cut is withdrawn); the Weald and Southmere tracks (separate, nine in all); Episode 3's start (regular route).

---

## 20. Decisions received and what changed (2026-10-25)

1. **Build all, no cuts** -> section 16 keeps the cut lines and marks every one unused.
2. **New music** -> section 11 and the `X2-audio` brief: **nine** tracks (the Weald and Southmere each have their own: `x2_weald`, `x2_shore`), 8 SFX and 2 ambiences in the `ep2` pack; the 6.5 MB cap holds.
3. **Global lower-EXP policy** -> **withdrawn by Scott, 2026-10-25**: today's EXP stays, every scale is 1.0, no Config toggle; optional content pays in gold, gear and items plus a capped EXP bonus (section 9.6 has the math).
4. **Isle and Cistern earlier** -> the Isle ferry opens at `court_ferry_open`; the Cistern at Q6 (after `court_f1_done`).
5. **Nico's chalk quest after the crown or restoration** -> unchanged, and now seven signs.
6. **Extra post-Sigil mirror pair** -> `mirror_overlook` (Cairnwatch) and `mirror_warp_sq2` (the Hollow square), section 5.
7. **A more expansive map** -> section 2 and 4: the Weald (76 x 44) and Southmere (84 x 36) beyond the original ten, Cairnwatch 80 x 40, Heronwade 72 x 44, Isle 48 x 32, two loops, a five-way junction, far-off landmarks, hidden paths; per-map cost rules and the shared expansion pack for the load budget.
8. **Reconciliation with the Episode 1 plan** (`docs/EXPANSION_RECONCILIATION.md`): the Cairnmaker's Barrow became the Cairnmakers' Quarry and the Cairn Count became Strangers' Stores (Episode 1 keeps the barrow and the counting of names); the Wishing Birches became the Blazed Birches; one pack
   mechanism (`XP-packs.md`) replaces N9 and N10; one Appraise, one `give('exp', n)` and one constants file replace N1, N8 and N11; this plan builds after Episode 1 is published.
