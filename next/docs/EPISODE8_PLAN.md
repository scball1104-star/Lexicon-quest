# Episode 8 production plan: The Last Word

Owner: ep8-designer, written the night of Tuesday 2026-11-10 (Eastern), branch `scott/ep8-design`, issue #68. Status:
**PROPOSAL, docs only, nothing built.** Story bible: `docs/story/EPISODE8.md`. When Scott and Stephen approve, this file is
the contract the build agents work from. Every build agent reads the repo's `AGENTS.md`, `docs/briefs/COMMON.md`,
`DESIGN.md`, `docs/story/EPISODE8.md`, this file and its own brief in `docs/briefs/E8-*.md`, in that order. House rules as
always: no em dashes, no git, stay in your owned paths, bound every command, keep every file's line endings (LF in this
worktree, `core.autocrlf=false`), look at your own output.

**Precondition.** Episode 7 is a proposal too (PR #65). Episode 8 builds **only after Episode 7 is built and merged into
`overhaul`**: it awaits the `ep7` pack, patches two Episode 7 maps, reuses Nox's and Vex's records, and continues Episode 7's
levels, tiers and gold. Every Episode 7 number below is a plan number (EPISODE7_PLAN), not a measure, and is marked so;
E8-pack, E8-battle and E8-integrate re-read them from the built Episode 7 before tuning. Bible section 0 lists the Episode 7
defaults Episode 8 depends on and its asks of Episode 7.

**Usage guard.** Up to three agents at once, in the waves of section 11, with disjoint owned paths inside every wave. The
orchestrator checks weekly usage before each wave: under 75%, launch the wave; 75 to 85%, one agent at a time; over 85%,
stop and leave the branch publishable (Scott's standing guard). Each agent is sized to finish in one sitting: 11 build
sittings and 1 review sitting, about 12 overnight, with a fix pass the next day.

**Resource rule.** Art is made in code or cut from painted source cells the game owns and has held for this episode
(section 9): environments cell 7, bosses cell 7, portraits cell 7 (`hooded_sage`, already built). Music from the in-repo
tracker (`tools/music`) or reused tracks; SFX from `tools/audio`. **No new Suno or Runway generations** in the build: 9.5
lists the optional paid items for Scott to approve and make himself.

---

## 0. Summary

**What gets built.** One climb (the Stair of Written Light, from the Stillheart roof to the South Margin), one town with four
interiors (the Scriptorium), one three-floor dungeon plus a boss floor (the First Library and the Last Word), one ending map
(the bell tower at night, a pack copy), one new field mechanic (**pop-up books**: a great book lying shut on the floor opens
away from whoever reads it, and its pages stand up as a bridge where they span the void and as a wall where they land on
floor; on the middle floor some books are written over each other, so opening one shuts its pair; nothing is global, there
is no capacity and no timer), one battle rule (**Erasure**: erasing foes rub out the command a party member used last, for
that member's next two turns; the hero is never rubbed out), one skill for the episode's center (Mira's **Read Aloud**), one
returning skill with one job (the hero's **Answer**, Episode 4's, for the Eraser's last phase), one mini-boss (the Unnamed
Sentry), one four-phase final boss (the Eraser, with Grief and Change), 7 ordinary enemies, 4 new tracker tracks plus reused
ones, 8 SFX and 1 ambience, about 31 beats in 37 registered scenes, 3 side stories, the whole game's credits, a post-game, and
the save rule carried over: no Episode 8 path ever writes a save slot that holds another run. Target 70 to 100 minutes
(planned at 84), party Lv 31 to 34.

**Everything is in the lazy `ep8` pack**, Episode 7's rule: `src/data/ep8/**`, `src/data/maps/ep8_*.js`, `assets/*/ep8_*`,
`assets/tiles/ep8.png`, `assets/audio/{music,sfx,ambience}/ep8_*`, registered by mutation (`registerStory`, `prependTalk`,
`FLAG_IDS.push`, `ENEMIES`, `ITEMS`, `SKILLS`, `SCRIPTS`, `POLICY_EXT`, `BACKDROPS`, `SIGNATURE_TECHS`, `PAGE_KINDS`,
`RULE_EXT`, `EXT`, `TINTS`, `CREDITS_HANDOFF`, `LEDGER`). Core changes are five one-line seams (13.2), and every core byte
they add is paid for by trimming core JS in the same change.

**What is reused (most of it).** The engine, field scene, cutscene API and `closeup` inserts, the event vocabulary, the pack
system and its atlas merge, Episode 7's whole pack skeleton (`index.js` order, the `maps.js` order-trap pattern, `hooks.js`,
`start.js`, `title.js`, the audio fragment, `scene.js` prototype wrapping, the field system's attach-from-`EXT.create`
pattern and its collision override on `map.base`, `reveal()`, `SKILL_GATE`), Episode 3's per-run autosave and
`pickRunSlot`, W9's Shove and Dash Strike, the Lantern, the battle rules (CTB, Break, Fury, combos, telegraphs and `charge`,
phases, summons, HP locks, Defend, `delayUnit` with Episode 6's clamped `push()`), `RULE_EXT`, the `{ keep }` bridge,
`SIGNATURE_TECHS` and Episode 4's Answer entry, the memory tint and speaker swap, the simulator, the map kit, `mapcheck`,
the preview renderer, the NPC paper-doll builder, the enemy recolor pipeline, the backdrop builder, the tracker and SFX
generator, every jingle, the core sfx `bell_toll`, `bell_thirteenth`, `name_restore`, `kept`, the cold open's staging
(`bell_tower`), the existing key art of every realm (the credits' epilogue cards), the tracks `orrery` (X1, the Stair),
`mystery`, `sorrow`, `triumph`, `battle`, `victory`, `gameover`, `willowmere`, `title`, `palehaven` (Act I, the ep7
fragment), and the ambience `sky_wind` (the ep6 fragment, the Stair).

**What is genuinely new.** Pop-up books (the pure `popbooks.js` rule, the void, page walls and bridges, the ghost outline,
palimpsest pairs, seven realm pop-up models), Erasure (`erasure.js` on `RULE_EXT` plus one new `commands` call point), Read
Aloud, an `ep8` tile sheet (the Stair kit, the Scriptorium kit, three Library floor kits, the Last Word), 12 NPC specs, 7
enemy recolors, the Unnamed Sentry, the Eraser's four looks and avatar, Grief and Change, 1 portrait crop plus the held
portrait's first use, 7 close-up page kinds, 4 tracks (one a song-local solo violin), 8 SFX, 1 ambience, the whole
`src/data/ep8/` pack, the Episode 8 quick start and its title row, `CREDITS_EP8`.

**Waves (section 11; up to three at once, disjoint paths).**
- **8a** foundations: E8-pack, E8-story, E8-battle.
- **8b** art and field: E8-tiles, E8-sprites, E8-world.
- **8c** maps and sound: E8-maps-a, E8-maps-b, E8-audio.
- **8d** assembly: E8-scene-ui, then E8-integrate (flips `EP8_LIVE` on the branch after the full gate list).
- **8e** review: E8-review (read-only, art and play), then E8-fixes (written by the orchestrator from the review).

**Done means.** A save that finished Episode 7 plays Episode 8 to the end title with no softlock; so does `newGameEp8`,
without touching any other run's save and with every Episode 8 sound present; the post-credits save wakes at home and walks
everywhere; the autoplay bot beats the Eraser at Lv 33 with zero game overs on desktop and phone; `node qa/run.mjs` green with
Episodes 1 to 7 untouched in meaning; `simulate.mjs --check` prints "All targets met" for all eight episodes (and `--cave
--check`, `--tier 1 --check` unchanged), `economy8` included; the timed story read lands at 70 to 100 minutes with no more
than 16 book decisions on the main path; every new map preview viewed; shots with zero console errors; **Read Aloud cast
with real keys and a real tap at an Unwrite's target, at Mira herself and with Mira's Magic row rubbed out; Answer cast the
same way at the Last Silence** (section 12); the tap-prompt load does not grow (section 13).

### 0.1 Lessons carried in

Episode 7 is not built, so its reviews (CRITIQUE_9, PLAYTEST_REVIEW_9) do not exist yet. Episode 8 carries Episode 6's
reviews (CRITIQUE_8, PLAYTEST_REVIEW_8) and Episode 7's plan answers to them; **E8-pack and E8-battle re-read CRITIQUE_9 and
PLAYTEST_REVIEW_9 before building**, and the orchestrator adds any new row here.

| Problem seen | Where Episode 8 answers it |
|---|---|
| Pacing ran over by decisions (PLAYTEST_REVIEW_8 item 3: 31 lane decisions, a loop home) | 4.10: **16 book decisions on the main path**, counted per read (a close counts), set before any map is drawn; mapcheck asserts no critical-path solution re-reads a book more than 6 cells behind the party and no walk over 1.3 times the straight route. A top over 105 minutes takes Cut 1 first |
| The Gale Engine was pushed by its own rule and acted twice (item 1) | 6.3: Erasure lands on the party only; no foe is ever rubbed out; nothing a foe does to the party slows that foe. Read Aloud's and Answer's throwbacks are the party's windows, and the sim asserts the Sentry and the Eraser each act at least once every two party rounds |
| A one-way shortcut lift (item 2) | 5.4: every Library lift is two-way from the first build |
| Gold bought one piece in town, not two (item 4) | 7.6: the two town pieces and the two pre-F3 pieces are named, priced and checked by a binding sim line `economy8` (300 G to spare at 100% of the fights) |
| Defend never said how to brace (item 5) | 6.3: Mira's first-fight line names the answer ("If it rubs something out, use something else."); a rubbed-out row's help reads "Rubbed out. Try something else." |
| A boss met a level high (item 6) | 6.1: the Eraser's margin is about 850 EXP under Lv 34 at 100% of the fights; E8-battle reports it with elites counted |
| A save bell spoke another episode's text (item 7) | 4.3: every save point names its own key (`ep8_desk`, `ep8_fountain`, `ep8_index_bell`, `ep8_folio`); a content test asserts no Episode 8 event uses an Episode 1 to 7 text key |
| A cold phone waits on the pack chain (item 8) | 3.3: the chain is now ep4, ep5, ep6, ep7, ep8 (plus ep3). E8-pack starts every fetch at once and measures; **the `packs.js` fetch-all fix is now a precondition the orchestrator raises with Scott and Stephen before wave 8a** (13.5) |
| The bot never rested on the floors (item 9) | 12: the bot rests at each floor's fountain on arrival and before the Sentry |
| The boss's rule came once or twice in a short fight (item 10) | 6.6: the sim asserts at least three Unwrites in a careful Eraser fight and at least two Last Silences |
| Turn the Sky shipped uncastable; bots never open the menu (PLAYTEST_REVIEW_7 item 1) | 12: Read Aloud and Answer are cast through `menu.js` in a scene test and with real keys and a tap; Read Aloud's self-target and its rubbed-Magic row are menu paths no skill has used |
| A HUD row left its boss (CRITIQUE_8 item 1) | 6.5: the Eraser's row keeps one anchor in all four looks; Grief and Change stand in front-row slots with rows under their own feet; all four looks in the row-placement test from wave 8a's data |
| Beats told over still sprites; staging at the screen edge (CRITIQUE_8 item 2) | Bible camera rule (12 tiles from the sides, 7 from top and bottom), asserted by `qa/maps/ep8_*` against `STAGING_EP8.md`; every rub-out, fade and lamp is drawn (tint, frames, HUD), never only narrated |
| Weak chevrons; a contrast rule measured the wrong pair (CRITIQUE_8 items 3, 9) | 5.1: the readability pairs are named up front (page against void, ghost outline against void and against floor, void against floor, rubbed row against its box), each measured on the 844x390 crop |
| A payoff's text reached full strength early (CRITIQUE_8 item 5) | 9.4: every close-up step fades in only on its box; `ep8_shelf` `star` and `ep8_last_page` tested frame by frame |
| Id collisions with earlier packs (`mooring_post`) | 2: every id grepped against `src/`, every `assets/tiles/*.json`, every `assets/*manifest.json` and the Episode 7 proposal's registry |
| The camera clamps at map edges | 4: every staged map is sized so its focus marks clear the camera rule; mapcheck reports the margin per mark |

---

## 1. Scope at a glance

| Thing | Count | Reused | New work |
|---|---|---|---|
| Maps | 11 new + 2 patches | interiors copied from Willowmere's and re-dressed; `bell_tower` copied by import | `ep8_stair`, `ep8_scriptorium`, 4 `ep8_sc_*` interiors, `ep8_library_f1/f2/f3`, `ep8_last_word`, `ep8_bell_night`; pack patches of `ep7_ph_inn` (wake) and `ep7_stillheart` (the stair door) |
| Field mechanics | 1 new (pop-up books) | overlays, flag gates, Shove, Dash, Lantern, `reveal()`, EXT, the ep6/ep7 attach pattern | `popbook` events; a pure `popbooks.js`; the `popbooks` map block; the void, page walls and bridges, pairs |
| Story scenes | 37 registered (27 main and chained, 8 side, 2 silent) | cutscene API, guards, Talk, journal, barks, memory tint, speaker swap, `closeup` | `src/data/ep8/story.js`, `STAGING_EP8.md` |
| NPCs | 8 new + 3 records of one man + memory actors + returns | paper-doll builder, `prependTalk`, speaker swap | specs, talk tables, post-game lines for every town |
| Enemies | 7 ordinary + mini-boss + boss + 2 adds | rules, ai `basic`/`phased`, `charge`, HP locks, summons | the `erasing` field on each foe, ai `unnamed_sentry`, ai `eraser` |
| Battle rule | 1 (Erasure) | CTB, Defend, Break, telegraphs, `RULE_EXT`, `delayUnit` | `src/data/ep8/erasure.js`; one `commands` call point (seam 5) |
| Party skills | 1 new + 1 returning | `learn: { flag }`, `SIGNATURE_TECHS`, Episode 4's Answer entry | Read Aloud; Answer's Last Silence job |
| Items | 1 consumable, 6 key items, 16 bases, 6 uniques, 1 set | items.js, loot.js, rarity, affixes | tier 15 and 16 gear, affix tier 10 |
| Shops | 3 new | shops.js, shop scene | stock lists |
| Music | 4 new, 10 reused | tracker pipeline, name motif | `scriptorium_town`, `first_library`, `boss_eraser`, `the_last_word` |
| SFX / ambience | 8 / 1 | generator | 8.4 |
| Tiles | 1 new sheet | autotile, wall systems, the ep7 kit approach | `ep8.png` + `ep8_tiles.json` |
| Sprites | about 30 frame sets | recolor and derive pipelines, pack atlas merge | NPCs, 7 recolors, the Sentry, Grief and Change, the Eraser x4, avatar, a baby bundle prop |
| Portraits | 1 crop + 1 held cell | portrait pipeline | `eraser` (crop); `first_keeper` = `hooded_sage` (built, first use) |
| Backdrops | 5 + key art | backdrop builder (environments cell 7) | 9.3 |
| Close-ups | 7 kinds, 12 modes | `PAGE_KINDS`, the ep7 pages approach | `ep8_note`, `ep8_card`, `ep8_cloth`, `ep8_first_word`, `ep8_could_not`, `ep8_shelf`, `ep8_last_page` |
| Credits | the whole game's | `CREDITS_HANDOFF`, the credits scene, every realm's key art | `CREDITS_EP8`, `END_TITLE_EP8` |

---

## 2. Id registry (the contract)

Every id below was grepped on 2026-11-10 against `src/`, `assets/` (every `tiles/*.json` and every `*manifest.json`),
`tools/sim/` and `docs/` (the Episode 7 proposal's ids included). No collisions in the list below. Collisions found and
avoided: `tamsin` (X1's weaver: canon Tamsin is Sable), `smudge` (an Episode 6 skill), `strikethrough` (Fine Print; the Page's
charge is `struck_line`), `keeper_note` (an Episode 4 sign; the note is `could_not`), `nameplate` (taken; the Sentry's unique
is `blank_faceplate`), `popup`/`popups` (`src/ui/numberPopup.js`; the event is `popbook`, the block `popbooks`), `grief`
(Episode 2's add; Episode 8's are `truth_grief`, `truth_change`), the word `scriptorium` (an Episode 4 map mark and text key:
music `scriptorium_town`, map `ep8_scriptorium`, never a bare `scriptorium` id), `librarian` (text only, but the record is
`ep8_librarian` to be safe), and every Episode 7 proposal id (`call_name`, `remember`, `namestone`, `ep7_*`, `e7*_`,
`keeper_memory_1` to `_3`: Episode 8's memories are `keeper_memory_a` to `_c`). **Prefixes:** maps and zones `ep8_`;
encounters `e8s_` (the Stair), `e8l1_`, `e8l2_`, `e8l3_` (the Library floors); art `ep8_`; sfx and ambience `ep8_` file
names. E8-battle and E8-story regrep every new id before use.

### 2.1 Maps

| id | Banner (title / sub) | area | size | tileset | music | ambience | lighting |
|---|---|---|---|---|---|---|---|
| `ep8_stair` | The Stair of Written Light / Up to the Library | field | 30 x 60 | `ep8` | `orrery` | `sky_wind` (ep6 fragment) | none; tint `rubout` only in its scene; gold motes |
| `ep8_scriptorium` | The Scriptorium / The Unfinished Street; after `scriptorium_open`: The Scriptorium / An Open Library | town | 46 x 36 | town + `ep8` kit | `scriptorium_town` | `library_hush` (0.4) | none; scenes set `dusk` |
| `ep8_sc_inn` | The Keeper's Quiet Rooms | interior | as `inn` | interior | town | none | none |
| `ep8_sc_shop` | Bibliotheca Supplies | interior | as `item_shop` | interior | town | none | none |
| `ep8_sc_atelier` | The Glyphsmith Atelier | interior | as `smithy` | interior | town | none | none |
| `ep8_sc_index` | The First Library Index | interior | as `chapel` | interior | `mystery` (0.6) | `library_hush` | dark 0.15, a lamp pool on the desk |
| `ep8_library_f1` | The First Library / I. The Catalog of Lost Lives | dungeon | 40 x 30 | `ep8` | `first_library` | `library_hush` | none, a warm gold cast |
| `ep8_library_f2` | The First Library / II. The Palimpsest Galleries | dungeon | 40 x 30 | `ep8` | `first_library` | `library_hush` | dark 0.3, lamp pools |
| `ep8_library_f3` | The First Library / III. The Unwritten Page | dungeon | 34 x 40 | `ep8` | `mystery` | `library_hush` | none; bright white pages, the void below |
| `ep8_last_word` | The Last Word | dungeon | 28 x 24 | `ep8` | none until the scene | `library_hush` (0.5) | tint `violet` (pack), dark 0.2; after `eraser_defeated` the gold grade |
| `ep8_bell_night` | (no banner) | town interior | as `bell_tower` | as `bell_tower` | none | none | the cold open's night and lantern pool |

Patches (pack-side, never edits to `src/data/maps/ep7_*.js`): `ep7_ph_inn` gains the `ep8_morning` enter trigger;
`ep7_stillheart` gains the stair door at mark `stair_foot` (section 3). `ep8_bell_night` is a new map module that imports
`src/data/maps/bell_tower.js` read-only and returns a copy with its own id, night lighting, marks for Mira and Bram on the
bell beam, and the `thirteenth_name` enter trigger: no core map is patched, so no core map ever waits on the ep8 pack.

### 2.2 Story flags (all pushed onto `FLAG_IDS` and declared in the pack's `flags.js` with a one-line meaning)

Main: `ep8_started`, `ep8_roofed`, `stair_arrived`, `first_rub_done`, `eraser_seen`, `saw_scriptorium`,
`scriptorium_arrived`, `read_learned`, `librarian_met`, `card_read`, `sable_met`, `library_open`, `library_entered`,
`ink_key_found` (chest flag), `library_f1_done`, `sentry_defeated` (encounter flag), `library_f2_done`, `beginning_seen`,
`name_told`, `vex_arrived`, `eraser_defeated` (encounter flag), `lexicon_restored`, `fragment8_get`, `keeper_named`,
`ending_return` or `ending_choose` (permanent), `page_shelved`, `eighth_star`, `hero_kept`, `scriptorium_open`,
`home_reached`, `ep8_complete`.

Beats and world state: `ep8_morning_done`, `afraid_yes`, `afraid_no`, `first_book_read`, `f1_arrived`, `f2_arrived`,
`f3_arrived`, `keeper_memory_a`, `keeper_memory_b`, `keeper_memory_c`, `told_sable`, `spared_sable`, `answered_yes`,
`answered_page`, `told_hazel`, `spared_hazel`.

Side: the Concordance `concordance_started`, `testimony_ione`, `testimony_fen`, `testimony_sable`, `concordance_lit`,
`concordance_done`; the Archive `page_names_found`, `page_order_found`, `page_correction_found` (chest flags),
`archive_open`; Quinn's pages `drift_started`, `drift_1_found`, `drift_2_found`, `drift_3_found` (chest flags),
`drift_done`. Counter (not a flag): `credits8_rolled`. Books carry no flag (they reset on every arrival: 5.1).

### 2.3 Key items (the pack's `items.js`, merged into `KEY_ITEMS`)

| id | name | icon | desc |
|---|---|---|---|
| `vex_note` | Vex's Note | letter | "Gone up first. Somebody has to knock. - V" |
| `reader_card` | A Reader's Card | letter | "Welcome, readers. Please return what you borrow." A cold, careful hand. |
| `ink_key` | Original Ink Key | key | A key of hard black ink. Fits the oldest keyhole in the Library. |
| `name_fragment_8` | The First Lexicon | book | The Book's own first copy. With the seven, the Living Lexicon. |
| `evidence_page` | Evidence Page (counted, 3) | letter (reuse) | A page the Library labelled and hid. |
| `drift_page` | Drifting Page (counted, 3) | letter (reuse) | A page that wandered out of the stacks. Quinn wants it back. |

The first page is story state (Vex holds it until `eraser`, then it is shelved: `page_shelved`), never an inventory item.

### 2.4 Enemies, encounters, zones (section 6)

Enemies: `index_hound`, `margin_imp`, `paper_crane`, `gnawing_bookworm`, `catalog_wraith`, `inkbound_librarian`,
`struck_page`, `unnamed_sentry`, `eraser`, `truth_grief`, `truth_change`. Encounters: `e8s_first`, `e8s_hounds`,
`e8s_cranes`, `e8l1_wraiths`, `e8l1_worms`, `e8l1_mixed`, `e8l2_librarian`, `e8l2_cranes`, `e8l2_mixed`, `unnamed_sentry`,
`e8l3_pages`, `e8l3_librarian`, `e8l3_mixed`, `eraser`. Zones: `ep8_stair`, `ep8_library_f1`, `ep8_library_f2`,
`ep8_library_f3`, `ep8_last_word` in `EP8_ZONE_ORDER` (exported by the pack's `encounters.js`), kept out of
`Object.keys(ZONES)` behind `EP8_MAPS_LISTED` with the non-enumerable `defineProperty` pattern of earlier packs.

### 2.5 Scenes (`src/data/ep8/story.js`; map and trigger)

| Scene | Map | Trigger |
|---|---|---|
| `ep8_morning` | ep7_ph_inn | enter trigger from the pack patch (`if: ep7_complete`, counter `credits7_rolled`, `EP8_LIVE`, not `ep8_morning_done`, not `tier_1`) |
| `ep8_roof` | ep7_stillheart | on enter by the nave door (`if: ep8_started`, `ifNot: ep8_roofed`); owns the map change to the stair |
| `stair_arrival`, `first_rub`, `first_book`, `rubbed_steps`, `south_margin` | ep8_stair | on enter; step row above the landing; step trigger at the first gap; step trigger high on the stair (after `first_book_read`); step trigger at the top gate |
| `scriptorium_arrival`, `first_word`, `sable_bindery`, `library_door`, `scriptorium_open` | ep8_scriptorium | on first enter; step trigger in the square; Sable's talk entry (first time, after `read_learned`); step trigger at the Library door (after `card_read`); on arrival through the Library door after `page_shelved` |
| `meet_librarian` | ep8_sc_index | step trigger two tiles in (after `read_learned`) |
| `catalog_arrival`, `keeper_memory_a` | ep8_library_f1 | on enter; step trigger at the doorway alcove |
| `palimpsest_arrival`, `keeper_memory_b`, `unnamed_sentry`, `uncensored_archive` | ep8_library_f2 | on enter; step trigger in the printing room; arena trigger; the Archive object |
| `unwritten_arrival`, `keeper_memory_c`, `the_name` | ep8_library_f3 | on enter; step trigger on the first landing; step trigger at the top landing by the keyhole |
| `eraser`, `eraser_after`, `last_choice`, `last_page` | ep8_last_word | trigger row at the entry; after the battle; chained; chained |
| `home` | (the scene owns time and place: roof, flight, `hero_home`) | chained from `scriptorium_open` once the party walks to the South Margin (Talk names it) |
| `thirteenth_name` | ep8_bell_night | on enter (from `home`) |
| `concordance_start` (chains `testimony_ione`), `testimony_fen`, `testimony_sable`, `concordance_light`, `drift_start`, `drift_done` | ep8_scriptorium | NPC talk entries and the folio object |
| silent: `library_f1_lift`, `library_f2_lift` | F1, F2 | step triggers that set `library_f1_done`, `library_f2_done` |

Count: 27 main and chained registered (the bible's 30 numbered beats less the optional farewells, the key chest and the
credits; `uncensored_archive` counted with the side), 8 side (`concordance_start`, `testimony_fen`, `testimony_sable`,
`concordance_light`, `uncensored_archive`, `drift_start`, `drift_done`, and `testimony_ione` chained but registered for its
Talk replay), 2 silent: 37. Under 40.

### 2.6 NPC ids (the pack's `npcs.js`, merged into `NPCS`)

New: `sable` (the stall), `ione` (the Living Codex), `fen`, `quinn`, `sorel` (shop `glyphsmith`), `arun`, `meya`,
`ep8_innkeeper` (the Scriptorium Host, Ledger-excluded), `ep8_shopkeeper` (the Archive Keeper, shop `bibliotheca`,
Ledger-excluded), `ep8_librarian` (the Index; present until `library_open`). Scene spawns: `eraser_v` (the stair figure, the
Last Word), `first_keeper` (after `keeper_named`: the Last Word, then the Index door as a resident with post-game lines),
`first_keeper_m`, `sable_m`, `rootbound_keeper_m` (memory tint), `nox_t` and `vex` and `aeris_t` (Episode 7's and earlier
records, reused, never redefined), `hazel` (core record, spawned by `home`). Returning NPCs keep their ids and get Episode 8
entries through `prependTalk`.

### 2.7 Audio ids

Music: `scriptorium_town`, `first_library`, `boss_eraser`, `the_last_word` (new); `orrery`, `mystery`, `sorrow`, `triumph`,
`battle`, `victory`, `gameover`, `willowmere`, `title` (core, reused), `palehaven` (the ep7 fragment, Act I). SFX:
`page_open`, `page_fold`, `rub_out`, `ink_slide`, `read_cast`, `unwrite_read`, `unwrite_break`, `silence_gather` (new);
`bell_toll`, `bell_thirteenth`, `name_restore`, `kept` and Episode 4's Answer sounds (reused, never redefined). Ambience:
`library_hush` (new, fallback `archive_hush`); `sky_wind` (the ep6 fragment).

### 2.8 Skills, battle state, tints, particles

Skill `read_aloud` (Mira, display name "Read Aloud"). Returning: `answer` (Episode 4's, the hero), unchanged in data; Episode
8 gives it one job through a new `SIGNATURE_TECHS` entry (6.5). Enemy skills: `rub_out`, `margin_sweep`, `unwrite`,
`last_silence`, `weep_ink`, `stand_in`, `turn_page`, `file_away`, `fetch`, `fold_dive`, `crease`, `gnaw`, `scribble`,
`overdue`, `return_stamp`, `struck_line`, `strike_out`, `cancel_line` (each grepped by E8-battle). Battle state (not
statuses): each member's rubbed-out commands with their turn counters, Unwritten, the pinned Unwrite, the charging Last
Silence. No new status. Tints: `rubout` (the stair and the square scenes: a violet dim, 2 s in), `violet` (the Last Word,
low and warm, the party's floor kept readable). Particles: the existing sparkle and dust kinds (gold motes up through the
void, page flutter in the Library, ink drips after `scriptorium_open`).

---

## 3. The world link: the Thawlight Lodge and the Stillheart roof

Episode 7 ends with the party waking at the Thawlight Lodge (`ep7_ph_inn`, mark `inn_bed`; Episode 7 plan). Episode 8 patches
the **registered** Episode 7 maps from inside the `ep8` pack (`src/data/maps/ep8_patches.js`, the `ep7_patches.js` pattern),
never the files `src/data/maps/ep7_*.js`:

1. **`withEp8Wake(ep7_ph_inn)`**: an enter trigger `ep8_wake` at (0, 0), `script: 'ep8_morning'`, `on: 'enter'`, and a mark
   `nox_door8` beside the existing `inn_bed`.
2. **`withStairDoor(ep7_stillheart)`**: at Episode 7's mark `stair_foot`, a door `stair_up` to `ep8_stair` `stair_bottom`
   (`if: ep8_roofed`; `ep8_roof` itself owns the first crossing), and a mark `aeris_roof` beside the Kestrel's mooring (if
   Episode 7's map has no Kestrel there, the patch places the ep6 `kestrel` prop, reused, never redefined). Every Episode 7
   mark, event and walk result unchanged; `ep7_ending` is untouched (it needs `doors_reopened` and has long run).
3. **Order trap (must not miss).** `registerMap` overwrites by id and the `ep7` pack registers both maps itself. The ep8
   pack's `maps.js` **awaits the ep7 pack first** (`await ensurePack('ep7')`), then `peekMap(id)` and registers the patched
   one. `packs.js` `ep8.touches` lists `ep7_ph_inn` and `ep7_stillheart`. The chain is now ep4, ep5, ep6, ep7, ep8 (and ep3 for
   Emberpeak): E8-pack starts every fetch at once, orders only registration, and measures the worst-case entry time to the
   lodge on the phone profile (target: under 3 s warm, under 8 s cold). Over 8 s cold: 13.5.
4. Tests: both maps load unpatched with ep7 only and patched with both; with `EP8_LIVE` off no trigger fires and no stair door
   exists; the stair door lands on a walkable cell.
5. **The return route.** `ep8_stair`'s bottom holds a door back to the roof; the roof's nave door leads to Palehaven; the
   Kestrel (Aeris, from `home_reached`) flies to Willowmere's valley and back (a boat-kind door pair: `ep8_stair` is never
   needed to go home after the end). The South Margin connects the Stair and the Scriptorium both ways.
6. **The home side.** `home` moves the party with `s.goto('hero_home', 'door_in')` and spawns Hazel by her core record; no
   core map is patched. After `thirteenth_name`, `CREDITS_HANDOFF[8]` wakes the party at `hero_home` `bed` (Episode 1's
   handoff shape).

The Keeper mirror network gains no new pair (cut line 1 can add one at the Living Codex).

---

## 4. Maps

General rules: DESIGN 5.1 format and MAPS.md conventions; every scene mark exists and is reachable; enemy counts match
`ZONES[zone].plan`; every puzzle reads on screen without text; lit paths lead forward, dead ends hold chests; render previews
with `tools/maps/preview.py` and view them. Coordinates are approximate; the map authors record exact cells in
`docs/MAPS_EP8_A.md` / `docs/MAPS_EP8_B.md`.

**Phone rule.** At 844x390: the void must never read as floor (violet, at most slow gold motes, no texture, no edge
highlight); floor beside it must read as floor (marble, parchment, vellum, each textured); a closed book must read as a solid
object you can face from two sides (ribbons on both long sides, a gilt edge); an open book's pages must read as cream paper
with a dark ink edge and a drop shadow onto the void, a bridge where they span void and a standing wall where they land on
floor; facing a closed book shows a dotted gold ghost of where its pages will go, visible on void and on floor; palimpsest
pairs share one ribbon colour and a faint ghost of each other's writing on their covers. Field foes carry a dark outline and
a warm rim so they never vanish on parchment or the void.

**Camera rule** (bible section 1). Every staged scene's focus marks are at least 12 tiles from the map's left and right edges
and 7 from its top and bottom, or the map is widened. `qa/maps/ep8_*` asserts it for every mark in `STAGING_EP8.md`.

### 4.1 `ep8_stair`: The Stair of Written Light (30 x 60, field, tall)

Broad steps of golden handwriting climbing from the Stillheart's roof through the last of the aurora into a violet sky, with
gaps where lines have been rubbed out. Bottom (south) to top (north). `popbooks` block: 4 books.
- **The foot (y 52 to 59).** `stair_bottom` (15, 57, 'up') from the roof door; the door `stair_down` back (`if:
  stair_arrived`); `stair_arrival` on enter. A wood chest (`hi_potion` x2).
- **The first rub (y 46 to 51).** `rub_row` across x 8 to 22 at y 49 (`if: stair_arrived`): `first_rub`, scripted
  `e8s_first`. One placed group after (`e8s_hounds`).
- **Gap A (y 40 to 45): Lesson A (open, cross).** A 3-cell gap; book `pb_willow` (the Willowmere realm book) at the near edge,
  read from the south, pops north over the gap. `first_trig` runs `first_book` on approach. 1 decision.
- **Gap B (y 32 to 39): Lesson B (read from the far side).** A book on a side ledge whose near side would pop its pages back
  over the stair; walk round by a narrow ledge to read it from its other side so its pages fall the right way. 1 decision.
  An iron chest on a side ledge reached by `pb_ledge` (optional: Quinn's page #1, `drift_1_found`, present `if:
  drift_started`, else `hi_ether`; 1 optional decision). One group (`e8s_cranes`) on the far side.
- **The reading desk (y 26 to 31).** A lectern with a lamp, a rest and save point (`font` type, text key `ep8_desk`); the
  gold chest "Forgotten Traveler Satchel" (canon name, 1,700 gold: the gold line of 7.6). `rubbed_trig` at about (15, 27):
  `rubbed_steps` (the Eraser figure at `eraser_far` far up the stair, 12+ tiles from the sides).
- **Gap C (y 12 to 25): Lesson C (pages are walls too).** A book whose pages bridge the gap but land on the stair beyond as a
  wall: open, cross, then close it from the far side to clear the stair (bark `first_wall`). 2 decisions.
- **The South Margin (y 1 to 11).** The gate arch (canon "South Margin"), `margin_trig` at about (15, 5) with the decal
  `library_far` (environments cell 7, quantized) in the overhead layer: `south_margin`. The exit north to `ep8_scriptorium`
  `south_gate`.
- Main-path decisions: 4 (A 1, B 1, C 2). Enemies (2 placed + the scripted one). Chests: wood (foot), iron (ledge: page or
  ether), gold (satchel, 1,700). Marks: `stair_bottom`, `rub_row`, `foes_drop`, `gap_a`, `gap_b`, `ledge_b`, `desk`,
  `eraser_far`, `gap_c`, `margin`, `library_far`, `north_exit`.

### 4.2 `ep8_scriptorium`: The Scriptorium (46 x 36, town)

A Dragon Quest town built around one image: a square of marble page-stones round the Living Codex, an ink canal in a ring
round the square with little bridges, book towers for houses with lit windows high up, and the First Library's great door at
the north end under the cliff of shelves (the `library_cliff` decal in the overhead layer, environments cell 7). The Codex
sits at about (23, 18), at least 12 tiles from each side.
- **South Margin gate** (from the Stair; mark `south_gate`; Quinn at `quinn_gate`). **The square:** the Living Codex
  `codex` (inscription, canon words), the Concordance folio `folio` (object `concordance`, 2 states: closed; open and lit
  after `concordance_lit`, then a rest and save with key `ep8_folio`), Sable's bindery stall `stall` (awning, bolts; Sable at
  `sable_stall`), the school steps (Meya at `meya_steps`), six half-signs `sign_a` to `sign_f` (two states: the word stops
  halfway; finished after `scriptorium_open`), Arun's candle posts along the script-road (two states).
- **The north end:** the First Library Index (door to `ep8_sc_index`), the Library's great door `library_gate` (the empty
  seal; open from `library_open`; after `page_shelved` its seal shows one line) to `ep8_library_f1` `arrival`, and from
  `page_shelved` a second door `lexicon_door` straight to `ep8_last_word` `dais` (the post-game way).
- **West:** the Keeper's Quiet Rooms. **East:** Bibliotheca Supplies. **South-east:** the Glyphsmith Atelier (Sorel).
  **South-west:** Ione at the Codex's west side, Fen by the Index steps.
- Marks: `south_gate`, `quinn_gate`, `codex`, `codex_n`, `codex_s`, `codex_w`, `codex_e`, `stall`, `sable_stall`,
  `meya_steps`, `index_door`, `library_gate`, `lexicon_door`, `inn_door`, `shop_door`, `atelier_door`, `ione_spot`,
  `fen_spot`, `crowd_a` to `crowd_f`, `nox_codex`, `vex_step`, `library_cliff`.

### 4.3 Interiors (copy the Willowmere counterpart's layout and exits, then re-dress)

| id | from | contents |
|---|---|---|
| `ep8_sc_inn` | `inn` | the Scriptorium Host (inn, 160 gold), beds under book-lined walls, a reading lamp, mark `inn_bed`. |
| `ep8_sc_shop` | `item_shop` | the Archive Keeper (shop `bibliotheca`), shelves of ink and binding cord. |
| `ep8_sc_atelier` | `smithy` | Sorel at the bench (shop `glyphsmith`), a press, gilt tools. |
| `ep8_sc_index` | `chapel` | card drawers to the ceiling (inspect), the high desk (inspect; after `keeper_named`, the First Keeper sits there as a resident), the door behind the desk (locked; flavor), the save bell with **its own** key `ep8_index_bell`, `index_trig` two tiles in. Marks `index_stage`, `desk`, `librarian_desk`, `party_stop`, `back_door`. |

### 4.4 The `popbooks` block (how a map declares pop-up books)

A map with the mechanic adds a `popbooks` block (E8-world reads it; mapcheck models it):
```js
popbooks: {
  books: {
    a: { x: 14, y: 42, axis: 'ns', length: 3, realm: 'willowmere' },  // a 2 x 1 book; opens north or south, 3 cells long
    b: { x: 20, y: 30, axis: 'ew', length: 4, pair: 'c' },           // a 1 x 2 book; opens east or west; palimpsest pair c
  },
  start: { b: 'w' },                                                 // optional: open on arrival (F2's overwritten pages)
}
```
Each book is a `popbook` event on ground (`book: 'a'`, `sprite?`, `lantern?`) whose footprint matches the block. **The rule
(one for the whole episode):**
- **Reading.** Confirm while facing a book from one of its two long sides (from ground). A closed book opens **away from the
  reader**: its pages fill the book's width for `length` cells beyond its far edge. An open book, read from either side,
  closes. (To turn a book the other way, close it, then read it from the other side: two decisions.)
- **Pages.** A page cell over void is walkable (a bridge). A page cell over floor is solid (a wall of standing paper). No page
  cell may ever lie over a wall, water or a door (mapcheck).
- **Pairs (F2 on).** Opening a book whose `pair` is open closes the pair first (one written over the other: only one
  stands).
- **Refusal.** A read is refused (`buzzer`, bark `would_fold` once, then a float line), and nothing changes, if it would put
  a page wall on any party cell, close a bridge (its own or its pair's) under any party cell (leader, followers, a cell being
  stepped from), or open pages onto an NPC, foe or trigger.
- **Ghost.** Facing a closed book shows a dotted gold outline of its pages-to-be; facing an open book shows a dotted outline
  of the cells that will clear.
- **No cell belongs to two books' pages** (mapcheck), so every cell has one owner.
- Deterministic, no randomness, no timers. Recompute on load and on every read. States reset to `start` on every entry.

Authoring rules mapcheck enforces: every book and every reading cell is walkable ground; at most 6 books per map (3^6 = 729
states, searchable with the party's cell); every page cell is visible within one phone screen of the reader, or the read pans
(5.1); no enemy, NPC or trigger stands on a page cell.

### 4.5 `ep8_library_f1`: I. The Catalog of Lost Lives (40 x 30)

The teaching floor. Galleries of card-drawer walls over the violet void; great books on every landing; alcoves of drawers
labelled with no names. Realm books: the Hollow (a paper mirror), Emberpeak (a paper forge with its bell).

| Area | Approx. floor | What it does |
|---|---|---|
| A. The Restoring Fountain | x 17 to 23, y 24 to 28 | Arrival (`arrival` 20, 27, 'up') from the Library gate; the Restoring Fountain of Names (canon) font `font_l1` (rest and save, key `ep8_fountain`); `catalog_arrival` on enter; the lift `lift_l1_up` to F2's arena (`if: library_f2_done`: two-way, 5.4). No enemies. |
| B. Crossing Pages | x 4 to 30, y 15 to 23 | **Puzzle B (one at a time):** two books whose pages would cross the same corridor: open the first, cross, close it, open the second. 2 decisions. The doorway alcove with `memory_a_trig` (`keeper_memory_a`). Two groups. |
| C. The Wall Behind | x 26 to 38, y 4 to 18 | **Puzzle C (a wall that keeps you):** the Emberpeak book bridges a gap and walls the corridor back; close it from the far side once across. 1 decision. One group. |
| D. The Side Alcove | x 2 to 14, y 4 to 14 | Optional: an alcove behind a book wall (1 optional decision): an iron chest (Quinn's page #2, `if: drift_started`, else `hi_ether`). A Dash-cracked drawer stack to a gold chest (`margin_boots_set`, the set piece). One group. |
| E. The Northern Shelf | x 12 to 28, y 1 to 6 | The gold chest `ink_key` (canon "northern shelf", flag `ink_key_found`), reached by the Hollow book (1 decision). An iron chest (1,500 gold, main path: the gold line). The lift up; its trigger sets `library_f1_done`. A Dash stack (Quinn's page #3 cache, optional). |

- Main-path decisions: 4 (B 2, C 1, E 1). Enemies (5): e8l1_wraiths 2, e8l1_worms 1, e8l1_mixed 2. Chests: wood (B,
  `hi_potion` x2), iron (D, page or ether), gold (set boots, Dash), gold (`ink_key`), iron (1,500), wood (A, `fresh_ink` x2).
  Marks: `arrival`, `font`, `crossing`, `doorway_alcove`, `wall_behind`, `side_alcove`, `north_shelf`, `lift_up`, `lift_l1_up`.

### 4.6 `ep8_library_f2`: II. The Palimpsest Galleries (40 x 30, dark 0.3)

Galleries whose walls are pages written over pages, the old writing faint underneath. **The inversion:** books come in
palimpsest pairs (one ribbon colour): open one and its pair shuts. On this floor having both versions is not allowed, so the
way on is to choose which stands, and when. One pair starts with the wrong book open (`start`). Realm books: Valewyn (a paper
keep), the desert (a paper armillary).

| Area | Approx. floor | What it does |
|---|---|---|
| A. The Overwritten Stair | x 2 to 10, y 22 to 28 | Arrival; `palimpsest_arrival`; font `font_l2`. The lift `lift_l2_down` to F1's fountain (`if: library_f2_done`). |
| B. The Pair | x 2 to 22, y 10 to 21 | **Puzzle B (swap the pair mid-way):** the Valewyn book bridges gap 1; its pair bridges gap 2 but would shut the first. Open the first, cross, open the second from the island (the first folds behind you, harmlessly). 2 decisions. Bark `first_pair` (Bram: "Two books, one page. Only one of them gets to stand."). The printing room with `memory_b_trig` (`keeper_memory_b`). Two groups. |
| C. The Wrong Version | x 16 to 28, y 2 to 10 | **Puzzle C (shut the version that's open):** a pair starts with its blocking book open (a wall across the gallery door); open its pair (the desert book) to fold it and bridge on. 2 decisions (close-by-swap and one more read to reach the arena stair). |
| D. The Side Galleries | x 26 to 38, y 2 to 18 | Three evidence pages (wood chests `page_names`, `page_order`, `page_correction`), any order. **The Archive of Uncensored Lives:** behind a page wall that folds only while a side-gallery pair stands the other way (a pair the main route never needs; 2 optional decisions); `archive_obj` (`script: 'uncensored_archive'`) opens it (gold chest present `if: archive_open`: 500 gold, 3 `hi_ether`, book `keeper_hid`). A wood chest (`hi_potion` x2). One group. |
| E. The Seal Gallery | x 14 to 26, y 12 to 24 | The Unnamed Sentry's arena (`sentry_trig`, `unnamed_sentry`), a font `font_l2b` before it. An iron chest by the arena door (1,500 gold, main path). After the win: the lift up; its trigger sets `library_f2_done`. One group on the approach. |

- Main-path decisions: 4 (B 2, C 2). Enemies (4): e8l2_librarian 1, e8l2_cranes 1, e8l2_mixed 2, plus the Sentry. Marks:
  `arrival`, `pair`, `printing_room`, `wrong_version`, `side_galleries`, `archive`, `arena`, `sentry_spot`, `lift_up`,
  `lift_l2_down`.

### 4.7 `ep8_library_f3`: III. The Unwritten Page (34 x 40)

A round of white-page landings climbing a shaft of shelves, the void far below, the keyhole door at the top. Not the darkest
map: the brightest and quietest (gate: F3 mean luma above F1's, the party's floor at least 0.12 luma from the page white on
the phone so sprites never wash out). Realm books: the isles (a paper Kestrel), the North (a paper Stillheart).

| Area | Approx. floor | What it does |
|---|---|---|
| The first landing | x 8 to 26, y 32 to 38 | Arrival (`unwritten_arrival`), font `font_l3` (Talk names the F2 lift back), `memory_c_trig` (`keeper_memory_c`, staged at `memory_c_spot`). |
| SEE | x 4 to 30, y 25 to 31 | The word SEE cut in gold over the stair (inspect). **A book hidden behind a pillar**: its ghost shows only when faced, from the side you reach by walking round. 1 decision. One group. A hidden book in Keeper ink (`lantern: true`, the Episode 1 hidden-ink rule) off the west pillar bridges to a gold chest `quill_of_return` (optional). |
| SHELTER | x 4 to 30, y 16 to 24 | SHELTER over the stair. **A wall and a bridge from one book, then a pair**: the isles book bridges and walls; its pair (the North book) then folds it once you're across. 2 decisions. One group. |
| CHOOSE | x 4 to 30, y 6 to 15 | CHOOSE over the stair. **Two ways up, both right**: a pair whose two books each bridge a different route to the keyhole landing; either works, the choice is the player's (canon CHOOSE). 1 decision. One group. |
| The keyhole | x 12 to 22, y 1 to 5 | The Charter of the Living Lexicon (inscription and book `living_charter`), `name_trig` (`the_name`), the Original Ink Keyhole door `ink_door` (`ink_key`, `door_boss` style) to `ep8_last_word` `entry`. A wood chest (`fresh_ink` x2). 0 decisions. |

- Main-path decisions: 4. Enemies (5): e8l3_pages 2, e8l3_librarian 1, e8l3_mixed 2. F3 is **the tightest ordinary floor**
  (6.6). Marks: `arrival`, `font`, `memory_c_spot`, `see`, `shelter`, `choose`, `keyhole`, `nox_key`, `party_stop_door`.

### 4.8 `ep8_last_word`: The Last Word (28 x 24)

The heart of the Library: a round dais under a dome, the great open book (`great_lexicon`, a 4 x 3 object: glowing shut;
open with names flying; open at the last page), the lectern before it, shelves rising out of sight on every side, the first
shelf at the dais's foot (`first_shelf`, with one empty place), and overhead the star dome (`star_dome`, an overhead prop: seven
lit stars with signs turning slowly toward an eighth with none; after `eighth_star`, the eighth lit with the counter-seal).
The Eraser's map actor stands at the lectern as the Librarian (`npc_librarian`) until the boss intro. Step trigger row
`eraser_trig` about row 17. After `eraser_defeated`: the gold grade (tint off, warm lift), the stair down `word_down` to F3's
keyhole landing, and the door `square_return` to `ep8_scriptorium` `library_gate` (its arrival runs `scriptorium_open`).
Marks: `entry`, `party_stop`, `lectern`, `dais`, `vex_gallery`, `vex_stop`, `nox_spot`, `shelf`, `book_front`, `dome`.

### 4.9 `ep8_bell_night`: the bell tower at night (a copy of `bell_tower`)

The module imports `src/data/maps/bell_tower.js` (read only) and returns its layout under the id `ep8_bell_night`: the cold
open's stair, its twelve toll steps (`toll_1` to `toll_12` triggers re-pointed to the pack's `ep8_toll_*` scripts), the
thirteenth at the top, night, the lantern pool, plus marks `mira_beam`, `bram_beam`. The cold open's own map and scenes are
never touched. If `bell_tower.js` exports no reusable layout, E8-maps-a copies it as a new module and says so.

### 4.10 The decision budget (counted before any map is drawn; E8-integrate times against it)

| Map | Main-path decisions | Optional |
|---|---|---|
| `ep8_stair` | 4 (A 1, B 1, C 2) | 1 (the ledge) |
| `ep8_library_f1` | 4 (B 2, C 1, E 1) | 1 (the side alcove) |
| `ep8_library_f2` | 4 (B 2, C 2) | 2 (the Archive pair) |
| `ep8_library_f3` | 4 (SEE 1, SHELTER 2, CHOOSE 1) | 1 (the Lantern book) |
| **Total** | **16** | 5 |

A decision is one read (open or close; a pair swap is one read). At 0.5 to 1 minute each the main path spends 8 to 16 minutes
on books. A map author who needs more takes them from another map in this table and says so.

### 4.11 Marks, named events and the seven realm books (for `qa/maps`, mirrored in `STAGING_EP8.md`)

| Map | Marks / named events |
|---|---|
| `ep7_ph_inn` (patch) | `ep8_wake`, `nox_door8`; `ep7_stillheart` (patch): `stair_up`, `aeris_roof` |
| `ep8_stair` | as 4.1; triggers `rub_row`, `first_trig`, `rubbed_trig`, `margin_trig`; books `pb_willow`, `pb_ledge`, `pb_b`, `pb_c` |
| `ep8_scriptorium` | as 4.2; NPCs `sable ione fen quinn arun meya`; objects `codex`, `folio`, `stall`, `sign_a` to `sign_f`, `library_gate` |
| `ep8_sc_*` | as 4.3; NPCs `sorel`, `ep8_innkeeper`, `ep8_shopkeeper`, `ep8_librarian` |
| `ep8_library_f1` | as 4.5; books incl. `pb_hollow`, `pb_ember`; chest `ink_key`; lift `lift_l1_up` |
| `ep8_library_f2` | as 4.6; books incl. `pb_valewyn`, `pb_desert` and their pairs; object `archive_obj`; trigger `sentry_trig` |
| `ep8_library_f3` | as 4.7; books incl. `pb_isles`, `pb_north`; door `ink_door` |
| `ep8_last_word` | as 4.8; objects `great_lexicon`, `first_shelf`, `star_dome`; doors `word_down`, `square_return` |
| `ep8_bell_night` | as 4.9 |

**The seven realm books** are one per realm, in episode order on the main path: Willowmere (the Mother Willow, Stair A), the
Hollow (the Court's mirror, F1 E), Emberpeak (the Heartforge and its bell, F1 C), Valewyn (the Sunken Keep, F2 B), the desert
(the observatory's armillary, F2 C), the isles (the Kestrel, F3 SHELTER), the North (the Stillheart, F3 SHELTER's pair). Each
is a pop-up paper model drawn on its pages when open, and a float line names it once ("WILLOWMERE. The willow stands up out
of the page."). Flavor only: the bridge geometry is the same as any book's, and nothing is solved by a name (DESIGN hard rule
2). This is the finale's field callback: the seven realms in paper, without bringing any earlier field system back.

---

## 5. Field systems (E8-world)

### 5.1 Pop-up books: the Episode 8 field mechanic

**Why this one.** It is the Library's own logic (canon "Every written life makes the First Library larger"; the books are
lives, and a life opened makes a way), it reads from the floor art alone (a closed book with two ribbons; face it and a gold
ghost shows where its pages will stand; read it and they do), it needs no timing, adds no damage tiles and no word grids, and
it costs little: one pure rule, the collision override path Episodes 5 to 7 use, one event type.

**Why it plays differently from tide locks, sun and shade, gust lanes and name stones.** Tide locks were levels set at a
wheel; sun and shade one hour for the floor; gust lanes rides the player commits to; name stones a memory budget of two.
Pop-up books are **geometry chosen by where you stand**: no capacity, no global state, no dial (a book has three states, and
which open state you get depends only on which side you read from). The one rule does two things at once, a bridge over void
and a wall on floor, so opening a book can make a way and shut one; the puzzle is reading from the right side and in the
right order. The episode inverts its own rule once: on F2 pairs cannot both stand, so the player must choose a version, the
Palimpsest's subtext (the Library revising itself) in a mechanic. F3 ends on CHOOSE, where both ways are right.

**Event types** (new, in the existing `{ id, type, x, y, if?, ifNot? }` shape, registered on `EXT` by the pack):

| type | fields | behavior |
|---|---|---|
| `popbook` | `book` (a letter of the map's `popbooks.books`), `sprite?` (`popbook` or `popbook_realm`), `lantern?` (hidden until the Lantern is lit) | Solid, on ground, faced from ground on a long side. Confirm reads it (4.4 rule). Drawn shut (two ribbons, gilt edge), opening over 16 frames (pages rising from the spine outward), open (pages standing, the realm model if any), folding over 12 frames; instant under reduceMotion. Plays `page_open` / `page_fold`; a refusal plays `buzzer` and the bark. |

**The rule** (`src/data/ep8/field/popbooks.js`, pure, node-tested):
- `compile(mod)` returns the model (each book's two candidate page sets, pairs, start) or null.
- `pages(model, state, book)` returns the cells a book's current state covers.
- `read(model, state, book, side, partyCells, blockers)` returns `{ ok, state, opened?, closed: [book] | [], refused?:
  'wall_on_party' | 'bridge_under_party' | 'onto_actor' }`.
- `walkable(model, state, base, x, y)` returns `true | false | null` (null: not a page cell; the base map decides; a page over
  void is true, a page over floor is false).
- Deterministic, no randomness, no timers. Budget: under 1 ms for a 40 x 40 map with 6 books.

**Collision, the read and drawing.** Episode 7's override path on `map.base`: every page cell over void is walkable while
its book stands that way; every page cell over floor is solid. A read locks input only for its animation, then unlocks;
nothing moves the party (the realplay test proves a held direction neither drops nor adds a step across a read). The void
is a flat violet A1 terrain with a slow 3-frame mote layer (at most +0.03 luma change between frames); pages are drawn by the
system from a 9-slice paper tile with a 1 px ink edge and a 2 px drop shadow onto void. **The pairs measured separately** on
the 844x390 crop: page against void (at least 0.35 luma above), void against floor (at least 0.12 luma below every floor
terrain), ghost outline against void and against floor (at least 0.15 each), a standing page wall against the floor beside
it (at least 0.15). **Off-screen change:** a read that changes cells more than 6 tiles away pans with `reveal()` (confirm
skips).

**Persistence.** Books reset to the map's `start` on every entry. **No new save field.** A save made on a bridge loads with
the authored states: if that cell is void then, the party wakes on the nearest ground (Episode 6's lane-cell precedent).

**Softlock rules** (asserted by `qa/maps` and `mapcheck`): every book and reading cell reachable ground; no actor starts on a
page cell; the critical path reachable in some sequence of reads explored breadth first (book states x the party's cell);
**no state strands the player** (from every reachable state the entrance is reachable); every chest reachable in some state;
**no loop home** (no critical-path solution re-reads a book more than 6 cells behind the party; walk at most 1.3 times the
straight route).

**Teaching ladder** (one idea per step; decisions in brackets): Stair A (read, cross) [1] -> Stair B (the side decides the
way) [1] -> Stair C (pages on floor are walls: close behind you) [2] -> F1 B (one at a time) [2] -> F1 C, E (walls that keep
you; reach the key) [2] -> F2 B (a pair: only one stands) [2] -> F2 C (shut the wrong version) [2] -> F3 SEE, SHELTER,
CHOOSE (all of it, then two right answers) [4]. First-time barks in the pack's `BARKS`: `first_open` (Mira: "It's a bridge. A
paper Mother Willow."), `first_wall` (Bram: "Pages on the floor are walls. Pages over nothing are bridges."), `first_side`
(Mira: "It opens away from whoever reads it. Go round."), `first_pair` (Bram: "Two books, one page. Only one of them gets to
stand."), `would_fold` (Mira: "Not while we're standing on it.").

### 5.2 Small additions

- **Tints.** `rubout` (a violet dim with the gold motes paused, for `rubbed_steps` and `first_word`: in over 2 s, out over 1
  s) and `violet` (the Last Word: low and warm), registered on `TINTS` and the night-tint sets so lamps light. The party's
  floor at or above luma 0.22 under both.
- **The rub-out.** Signs and stair lines have a second frame (blank); the scene steps letters off with a tiny dust puff
  (existing particle), never a flash.
- **The Eraser on the stair.** An actor (`eraser_v`, the avatar) with a trailing sleeve; the steps it passes swap to blank
  frames as it walks; it never enters the party's half of the screen.
- **Memory vignettes.** The memory tint for the three memories; the baby is a bundle prop carried by `first_keeper_m`.
- **Speaker swaps.** "The Librarian" to "The Eraser" to "The First Keeper" (three records), the Episodes 4 to 7 mechanism.
- **Nox in the Library.** `nox_t` is a scene actor spawned at marks by the floor scenes (no follower code).
- **The Codex, the folio, the half-signs, the candles, the seal on the great door, the dome.** Two-state objects drawn by
  their frames, no text.
- **The Listen inspect** on `bell_tower`'s top step after `ep8_complete`: a pure scene replay (no flags, no save). It is the
  one Episode 8 event on a core map, added through the pack's `INTERACT_TYPES` hook on a mark the core map already has; if
  that cannot be done without editing `bell_tower.js`, it is dropped (open item for E8-world).

### 5.3 Story plumbing (inside the pack, plus the seams of 13.2)

- The pack's `story.js` hands its scenes to `registerStory`; a content test asserts ids unique across all eight episodes and
  the X1, cave and tier packs.
- **The ending handoff:** `CREDITS_HANDOFF[8] = { cards: CREDITS_EP8, music: 'the_last_word', map: 'hero_home', mark: 'bed',
  counter: 'credits8_rolled', endCard: END_CARD_EP8, flag: 'ep8_complete' }`; while `EP8_LIVE`, `CREDITS_HANDOFF[7].endCard`
  becomes `END_CARD_EP7_LIVE` ("Episode 8 begins in the morning."). `END_CARD_EP8`: "The End" / "Every road is open. The
  Deep Stacks wait under the library."
- `mainQuestFor` switches to `MAIN_QUEST_EP8` on `ep8_started` through `QUEST_EXT`; after `ep8_complete` the journal shows a
  finished quest with the chosen ending's title and the canon line "Your closing chapter is written in the Journal." as its
  last entry (root canon), and Talk names post-game things to do.
- **The witness line** (`last_page`): count of the eight witness quests done (Episode 1 to 3's equivalents named by E8-story
  from the core quests; Episode 4 `witnesses_done`-equivalent, Episode 5 roads, Episode 6 `beacon_lit`, Episode 7
  `hearth_lit`, Episode 8 `concordance_lit`; Inference: E8-story confirms each flag and lists them in STAGING_EP8). Five or more:
  canon's council line; fewer: canon's seven councils line.
- **Ledger rows:** the hero's existing row gains its keep on `hero_kept` (why: "Answered to their own name, and kept it.");
  new rows `first_keeper` (place `first_library`, kept on `keeper_named`: "Said a name he took, and meant it."), `sable` (on
  `concordance_lit` or `scriptorium_open`), `ione` (`testimony_ione` or `scriptorium_open`), `fen`
  (`testimony_fen` or `scriptorium_open`), `quinn` (`drift_done` or `scriptorium_open`), `sorel`, `arun`, `meya` (on
  `scriptorium_open`); `PLACES.scriptorium` and `PLACES.first_library`, `REACHED.scriptorium = 'scriptorium_arrived'`,
  `REACHED.first_library = 'library_entered'`. Excluded: `ep8_innkeeper`, `ep8_shopkeeper`. The First Keeper's row shows "The
  First Keeper" (the name is the hero's).
- **Rows whose canon line names a person before their payoff:** Ione's third line, Arun's third and Meya's third are held to
  their flags (bible section 3); a content test asserts no Scriptorium line before `keeper_named` names the Librarian as the
  First Keeper.
- **The ending choice is permanent:** once `ending_return` or `ending_choose` is set, `last_choice` never runs again and no
  scene offers the other (a content test).
- **The title row.** "Episode 8: new party" shows once any slot has `ep7_complete`, with the help line "A ready party at Lv
  31. Your own save stays under Continue." With seven episode rows on the phone, E8-scene-ui checks the folded title fits at
  375x812 and 844x390. A finished save's slot row shows a small gold star beside the place name (pack title wrap; dropped if
  it needs a core edit).

### 5.4 Shortcuts

| From | To | Present while |
|---|---|---|
| F1 fountain lift `lift_l1_up` | F2's Seal Gallery | `library_f2_done` |
| F2 lift `lift_l2_down` | F1's fountain | `library_f2_done` |
| F3 first landing stair | F2's Seal Gallery | `library_f2_done` |
| `square_return` (the Last Word) | the Scriptorium's Library gate | `eraser_defeated` |
| `lexicon_door` (the Scriptorium) | the Last Word's dais | `page_shelved` |
| The Stair's foot | the Stillheart roof | `stair_arrived` |
| The Kestrel (the roof) | Willowmere Valley and back | `home_reached` |
| The Concordance folio (rest and save) | (a rest point in town) | `concordance_lit` |
| The reading desk (rest and save) | (a rest point on the Stair) | always |

Every lift is two-way from the first build. Books reset on arrival, but no shortcut route needs a book: each lands on ground
next to a font.

### 5.5 W9 abilities and the Lantern in Episode 8

| Ability | Where | Critical? | Fallback |
|---|---|---|---|
| Shove | the Atelier's crate (optional, a wood chest behind it) | no | `push: true` |
| Dash Strike | F1 D drawer stack (set boots), F1 E stack (Quinn's page #3) | no | breakable object |
| Appraise | 7 bestiary entries; the Sentry and the Eraser readable in the field, each naming its erasing moves | no | in-battle |
| Lantern | F3 SEE: the hidden book in Keeper ink to the Quill of Return; Mira holds it in `first_word` (scripted, no input) | no | exists |

---

## 6. Combat (E8-battle)

### 6.1 Level and EXP targets

`expForLevel`: 31 21,363, 32 22,986, 33 24,675, 34 26,431, 35 28,254 (Fact, `src/data/party.js`, run 2026-11-10). Episode 7
finishers arrive at about 22,240 (Inference: EPISODE7_PLAN 6.1's plan, the Phantom at about 20,740 with every fight, +1,500;
not built). The quick start uses 22,200. E8-integrate records the real arrival from an Episode 7 credits save and E8-battle
re-tunes if it differs by more than 300.

| Zone | Plan fights | Level in | Level out (all fights) | First-pass EXP |
|---|---|---|---|---|
| ep8_stair | 1 (scripted) + 2 | 31 | 31 (about 250 under 32) | +180, +360 |
| ep8_library_f1 | 5 | 31 | 32 | +900 |
| ep8_library_f2 | 4 + the Sentry | 32 | 33 (just) | +720, +320 for the Sentry |
| ep8_library_f3 | 5 | 33 | 33 | +900 |
| ep8_last_word | 1 | 33 | 34 | +2,000 |

17 ordinary fights including the scripted first (Episode 7 planned 16). About 180 EXP an ordinary fight (heads of about 90,
three-foe groups under an `expMul`). From 22,200: the Eraser at about 25,580 with every fight (Lv 33, about 850 under 34),
about 24,970 at 80% (Lv 33, about 290 over 33). After it, about 27,580 (Lv 34; 35 is 28,254). E8-battle counts elites at their
real rate and trims a fight's EXP before it moves a boss target.

### 6.2 Enemy roster

First pass, scaled from Episode 7's planned numbers (EPISODE7_PLAN 6.2) by the 6.8 method of `EPISODE2_PLAN.md`; **the
simulator targets are binding**. Every ordinary foe uses an `enemies.webp` cell (or the Lost Page sprite), recolored to ink
black, violet, cream paper and gold so none reads as its Episode 7 cousin. Every foe has `erasing: true` (6.3) and names its
erasing moves ([E]).

| id | Name | Family, size | Lv | HP | ATK / MAG | DEF / SPR | SPD | Sh | Weak | Resist | EXP / Gold | Moves (**telegraph**; [E] = erasing) | Trait | Art |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `index_hound` | Index Hound | beast | 31 | 880 | 205 / 20 | 34 / 24 | 21 | 2 | fire, spear | ice | 90 / 250 | Bite, Fetch (single phys 120%) [E] | evade 0.1 | cell 2, ink-black hound with card-drawer ribs |
| `margin_imp` | Margin Imp | spirit, small | 32 | 700 | 100 / 200 | 22 / 40 | 19 | 2 | fire, light | thunder | 90 / 260 | Scribble (single mag 120%) [E], Smear (Blind 20%) | basic | cell 0, an ink jelly with gold flecks |
| `paper_crane` | Folded Crane | beast, flying | 31 | 720 | 190 / 120 | 26 / 30 | 23 | 3 | fire, bow | ice | 90 / 250 | Fold Dive (single phys 160%), Crease (party mag 70%) [E each] | evade 0.15 | cell 6, a white folded-paper crane |
| `gnawing_bookworm` | Bookworm | beast, shell | 31 | 760 | 195 / 20 | 50 / 28 | 9 | 4 | fire, axe | sword, bow | 95 / 260 | Gnaw (single phys 110%) [E], Curl (Protect self), Paper Spray (party phys 60%) | basic | cell 3, a parchment grub with a gold head |
| `catalog_wraith` | Catalog Wraith | spirit | 32 | 900 | 100 / 210 | 26 / 42 | 16 | 3 | fire, light | ice, thunder | 95 / 270 | File Away (single mag 140%) [E], Chill Index (party mag 60%) | basic | cell 1, violet wraith trailing index cards (canon name) |
| `inkbound_librarian` | Inkbound Librarian | construct | 33 | 980 | 215 / 60 | 48 / 30 | 12 | 4 | fire, axe | sword, ice | 100 / 280 | Shush (Silence 25%), Overdue (single phys 150%) [E], **Return Stamp** (single phys 210%, a charge) [E] | charge | cell 5, ink and gilt armor, a stamp for a hand (canon name) |
| `struck_page` | Struck-Out Page | construct, small | 33 | 760 | 110 / 215 | 22 / 44 | 17 | 3 | fire, light | thunder, ice | 95 / 280 | Margin Line (single mag 120%) [E], **Struck Line** (single mag 210%, a charge) | charge | the Lost Page sprite, violet ink with a bar through it |

Groups: e8s_first = index_hound x2 (scripted, the lesson); e8s_hounds = index_hound, margin_imp; e8s_cranes = paper_crane x2.
e8l1_wraiths = catalog_wraith x2; e8l1_worms = gnawing_bookworm x2; e8l1_mixed = index_hound, catalog_wraith, margin_imp
(`expMul` 0.65). e8l2_librarian = inkbound_librarian, margin_imp; e8l2_cranes = paper_crane x2, catalog_wraith (`expMul`
0.65); e8l2_mixed = inkbound_librarian, gnawing_bookworm. e8l3_pages = struck_page x2; e8l3_librarian = inkbound_librarian,
struck_page; e8l3_mixed = catalog_wraith, struck_page, paper_crane (`expMul` 0.6). Elites at the normal rate.

### 6.3 Erasure (the episode's one battle rule) and Read Aloud

Distinct from Heat (a counter on a foe), Decrees (seals on foes), the Turning Sky (a battle-wide state), the Gale (a shared
tempo) and Rime (per member frost triage): Erasure is **per command**. The player's decision is variety: what you just did is
what goes, so keep something you'll need next turn unused, or change.

- **Erasure.** Every battle in which any foe has `erasing: true` has Erasure (`state.erasure`). No encounter field is added
  (the rule reads the foes' own data). **If a later change needs a per-encounter field, it goes in BOTH
  `src/data/encounters.js` `rollEncounter` AND `src/battle/rules.js`, or it is silently dropped.**
- **Party only.** No foe is ever rubbed out; nothing a foe does to the party slows that foe (the Gale Engine lesson). The sim
  asserts it.
- **Rubbing out.** An erasing move ([E]) that hits a member rubs out **the command that member used last** (Attack, Tech,
  Magic or Item; never Defend, Fury, Combo or Flee; if their last command was one of those, or none yet, nothing). A
  rubbed-out command cannot be chosen for that member's **next two turns**; a second rub on it resets the count to two. A
  member can have at most two commands rubbed out at once (a third rub replaces the oldest). Message: "Bram's Attack is
  rubbed out." (`rub_out`).
- **Defend.** An erasing hit on a defending member rubs out nothing ("The ink slides off.", `ink_slide`).
- **The hero is never rubbed out and never Unwritten.** Message, the first time in a save: "The ink will not take on
  {hero}." (the bible's foreshadow; never explained in battle).
- **Read Aloud** is never rubbed out: a rubbed-out Magic row still opens, with every spell but Read Aloud greyed.
- **Shedding.** Turns passing; **Fresh Ink** (7.1): every ally's rub-out counts fall by one (party-wide: no item-target seam,
  BATTLE 14.8); **Read Aloud**.
- **Readability (the phone is the bar).** A rubbed-out row is drawn smudged (the word at 40% with a pale rubbed band across it)
  with two small pips at its right that empty as the turns pass; the help line reads "Rubbed out. Try something else."; on
  the HUD, a small eraser-crumb pip per rubbed command under the member's name; the timeline head shows a smudge on the member
  whose next turn has a rubbed row. The smudged row at least 0.15 luma from its box and still legible. Measured on 844x390.
- **The command seam.** `rules.js` builds each member's commands with `enabled` and `reason`; Erasure needs to mark rows
  disabled with reason "Rubbed out". That needs **one new call point**, `RULE_EXT.commands(state, unit, out)` at the end of
  the commands builder (seam 5, 13.2; BATTLE 14.8 already wished for it). Everything else is pack-side.
- **Auto (`competent`).** 1. An Unwrite is pinned and Mira acts before it lands: Mira Reads Aloud its target. 2. The Last
  Silence is charging and the hero acts before it lands: the hero Answers. 3. An ally is Unwritten: Mira Reads them back on
  her next turn unless 1 applies. 4. A member with an erasing foe acting before them: they avoid repeating the command they
  most need next (heal: keep Magic; Bram: keep Tech for Guard), else Defend. 5. Two or more members with a rub-out and Fresh
  Ink in the bag: one Ink. 6. Against the Sentry and the Eraser, Mira keeps 12 MP. Reckless and naive policies never Read
  Aloud, Answer, Defend for Erasure or use Ink; **attack-only** uses Attack, or Defend when Attack is rubbed out.

**Read Aloud** (`read_aloud`, display name "Read Aloud", Mira, 12 MP, kind magic, `target: 'ally'` (any party member,
**Mira herself included**, standing or Unwritten), rank 80; learned in `first_word` through `learn: { flag: 'read_learned'
}`, fallback `learn: { level: 31 }`). Mira reads the member's lines back: every rubbed-out command returns, Unwritten ends at
once, and the member acts sooner (`push(u, -0.25)`, clamped as Episode 6 clamps a negative push). If an Unwrite is pinned on
that member, it breaks ("Mira reads Bram's name aloud. It stays.", `unwrite_break`) and its owner is thrown back a full turn
(`push(u, 1.0)`): the party's window. Registered in `SIGNATURE_TECHS` (`{ unit: 'mira', flag: 'unwrite', skill:
'read_aloud' }`), so while an Unwrite is pinned Mira's Magic list opens on Read Aloud, first, in gold, and the target cursor
opens on the pin's target (Mira already has Episode 5's Turn the Sky entry on `foretold`: E8-scene-ui makes the right one
float). It reaches `erasure.js` through `{ keep: 'erasure', erasure: 'read' }`. Help (under 40 characters): "Read an ally back.
Breaks an unwriting." A 12 x 12 icon (an open book with sound lines, drawn in code). **The menu path is part of the skill:**
it is the first signature skill that may target its own caster, and it must open from a rubbed-out Magic row; the scene test
and the realplay test prove both (12).

**What the other signature skills do here.** Answer is a plain light hit except on the Last Silence (6.5). Turn the Sky,
Anchor and Call are gated in battles with no sky, wind or cold (`SKILL_GATE`); E8-battle confirms the gates hold in every
Erasure battle (Call's needs Episode 7's gate, built), and that Read Aloud is gated in battles with no erasing foe ("Nothing
to read back.").

### 6.4 Mini-boss: the Unnamed Sentry (`unnamed_sentry`)

Boss table, no flee, music `battle`, backdrop `ep8_battle_palimpsest`, flag `sentry_defeated`, ai `unnamed_sentry`
(registered by the pack). Lv 32, HP 2,300, ATK 330, MAG 780, DEF 34, SPR 40, SPD 15, 7 shields, weak fire, spear; resist ice,
thunder; immune Silence. `erasing: true`.
- **Strike Out** (`strike_out`, single mag 130%) [E]; **Cancel** (`cancel_line`, party mag 60%) [E each].
- **Unwrite** (`unwrite`, flag `unwrite`): pinned on the non-hero member with the most rubbed-out commands (ties: lowest HP),
  Mira included, whenever nothing is pinned, and **never before Mira's next turn** (`holdForMira`, Episode 5's pattern): "The
  Sentry begins to unwrite Bram." (`unwrite_read`), a grey ribbon from the Sentry to the target on the stage and timeline,
  and "Mira can read him back." only when Mira will act before it lands. If it lands, the target is **Unwritten**: every
  command but Defend rubbed out for their next two turns (Read Aloud included, if the target is Mira) and they take x1.3
  damage until Read back or the two turns pass. Answers: Mira's **Read Aloud** on the target before it lands (breaks; the
  Sentry is thrown back a full turn); **Break** (cancels, the charge rule). It never unwrites the hero ("It cannot find that
  name to unwrite.").
- At 50% its faceplate cracks and it calls two **Struck-Out Pages** (adds, 2 shields each).
- Targets: careful 7 to 9 rounds, win 85%+; attack-only 0%; ignoring the pin costs at least 10 points; at least two Unwrites
  in a careful fight.
- Rewards: EXP 320, gold 1,700, mastery 26. Drops: unique `blank_faceplate`, 1 rare roll (ilvl 32), hi_potion 2.
- Art: `enemies.webp` cell 5 recolored to ink and gilt with a blank faceplate drawn in; under-the-feet HUD row from day one.

### 6.5 Boss: the Eraser (`eraser`), Mira at the center, the hero at the end

Boss table, no flee, music `boss_eraser`, backdrop `ep8_battle_lastword`, flag `eraser_defeated`, ai `eraser` (registered by
the pack). Lv 33, HP 5,600, ATK 600, MAG 640, DEF 36, SPR 34, SPD 16, family construct (the house's family for Keeper-made
bosses; he is a man, but the family only drives Appraise and immunities); immune Stun, Poison, Blind, Silence. HP locks at
70% and 26% (canon thresholds) so one hit never skips a phase. `erasing: true`.

1. **Closed Book** (100% to 70%; canon). Armored: DEF x1.4. Weak spear, bow (canon "Pierce"); resist ice (canon); 8 shields.
   **Rub Out** (`rub_out`, single mag 150%) [E]; **Margin Sweep** (`margin_sweep`, party mag 110%) [E each]; **Unwrite** (as
   6.4, "The Eraser begins to unwrite Mira."). The Eraser never unwrites the hero.
2. **The Rejected Truths** (from 70%; canon). Summons **Grief** and **Change** (canon). While either stands, the **Erasure
   Ward** holds (canon): the Eraser takes 12% damage, its shields cannot be chipped, its HP cannot fall below 32% (canon
   floor). Unwrite continues.
   - `truth_grief`: Lv 33, HP 640, 3 shields, weak fire, resist ice (canon). **Weep Ink** (`weep_ink`): heals the Eraser 5%
     each turn it stands (never above the 70% lock) (canon role "mender"); **Rub Out** [E].
   - `truth_change`: Lv 33, HP 600, 3 shields, weak spear (canon pierce), resist fire (canon). **Stand In** (`stand_in`): while
     it stands, single-target party moves aimed at the Eraser strike Change instead ("Change stands in the way.") (canon
     role "warder"); **Turn the Page** (`turn_page`, party mag 80%) [E each].
   - Both gone: the ward breaks (phase 3).
3. **The Keeper Remembers** (canon). Armor down (DEF normal; canon "armor weakens"), weak fire (canon), resist ice (canon); 8
   shields; the party gains 30 Fury (canon +30 Focus); the Eraser Broken one turn. Its look shows the old face half drawn in
   gold through the white. Unwrite continues; Margin Sweep slows (every 3rd turn).
4. **The Last Silence** (below 26%; canon "charged erasure attacks accelerate"). Haste. **The Last Silence**
   (`last_silence`, flag `last_silence`): a charge every 3rd Eraser turn: "The Eraser draws a breath. The page goes quiet."
   (`silence_gather`), the whole stage dimming toward white. If it lands: party mag 180%, and every non-hero member's last
   command rubbed out. Answers: the hero's **Answer** before it lands ("{hero} answers to the name. The silence breaks."):
   the charge fails, the Eraser is thrown back a full turn and Broken one turn; **Break** (cancels, the charge rule); Defend
   halves the damage and slides the ink as always. **While the Last Silence charges, nothing is pinned**, and no Unwrite is
   pinned in the turn after one breaks: one telegraph at a time. The phase message is LEGACY: "The Eraser reveals its final
   form: a space where no name can survive."

**Answer's job.** Episode 4's skill is unchanged in data. The pack pushes `{ unit: 'hero', flag: 'last_silence', skill:
'answer', usable: true }` onto `SIGNATURE_TECHS`, so while the Last Silence charges the hero's Tech list opens on Answer, in
gold. Episode 4's ai and scene wraps react to skills flagged `answerable` or `decree` (Fact: `src/data/ep4/ai.js`,
`src/data/ep4/scene.js`); `last_silence` carries **neither**, so Episode 4's seal drawing never fires on it (Inference: check
that no Episode 4 wrap keys on the charge kind; E8-battle reads both files first and says what it found). The break is
handled in the pack's own `eraser` ai.

This is the boss's central decision and it is Mira's: read who the Eraser is unwriting, keep Mira's Read Aloud for it (Bram's
Guard and Taunt keep erasing hits off her: SHELTER, existing skills), and the cruelest move becomes the party's double turn.
Then the hero's: answer the silence. The three canon promises in one fight: Mira sees and reads, Bram shelters, the hero
answers (CHOOSE comes after, in `last_choice`).

**Phone readability with two telegraphs.** Unwrite is a grey ribbon to one member; the Last Silence is a whole-stage dim with
a charge bar on the Eraser's HUD row. They are never up together. Each names its answerer in the battle text ("Mira can read
him back." / "{hero} can answer it."). No earlier battle rule (Heat, Decrees, Turning Sky, Gale, Rime) runs in this fight.

- **Concordance bonus:** with `concordance_lit` the party starts with +25 Fury (`startFury`).
- Targets: careful 14 to 18 rounds, win 85%+; attack-only 0%; ignoring telegraphs costs at least 15 points; careful play
  breaks at least half the Unwrites with Read Aloud and at least half the Last Silences with Answer; at least three Unwrites
  and two Last Silences in a careful fight; the Eraser acts at least once every two party rounds.
- Rewards: EXP 2,000, gold 2,500, mastery 40. `BOSS_LOOT.eraser`: unique `last_word_pen`, 2 rare rolls (ilvl 33),
  phoenix_feather 1, hi_ether 2.
- **HUD rows (CRITIQUE_8 item 1).** The Eraser's row keeps one anchor (over its hood, top-left of its body) in all four looks;
  Grief's and Change's rows sit under their own feet in front-row slots, at least 12 internal px from any party sprite.
- Art: `bosses.webp` cell 7 at 1x in the 160 x 144 boss cell; four looks: Closed Book (as painted: violet void, black robes,
  the empty white face, pages orbiting), the Rejected Truths (the robes spread like two covers, Grief and Change in the folds),
  The Keeper Remembers (the face half drawn in gold lines), The Last Silence (robes torn to blank pages, the face gone to a
  white glare, the pages stopped); a field avatar at map scale with a back frame (the stair figure). Grief and Change: one
  small new sprite each (a hooded figure of wet pages, about 40 x 48; a standing page with a door cut in it, about 40 x 56).

### 6.6 Simulator and tests

`tools/sim/ep8.mjs` registers the `ep8` pack data (the ep7 pattern; `registerData()` registers ep4 to ep8) and adds
`EPISODES[8] = EP8_ZONE_ORDER` through one line in `simulate.mjs` (the `EP7` attach line's twin; that file is CRLF and kept so).
Erasure lives in `src/data/ep8/erasure.js` (pure) and runs in the sim as in the game through `RULE_EXT` (including the new
`commands` call point, which the sim's party policies read to choose legal commands). `LOADOUTS`: ep8_stair = the
`ep7_stillheart` loadout plus the Stillheart Shard and one Nox gift; F1 plus two tier 15 pieces (Vellum Plate on the hero,
Glyphweave Robe on Mira) and `read_learned`; F2 plus the Margin set boots (Bram); F3 plus two tier 16 pieces (Quillsteel Sword,
Lexicon Staff); the Eraser plus the Blank Faceplate and mastery up one step; 2 to 4 Fresh Inks. `TARGETS`: ordinary as
Episodes 1 to 7, with **F3 the tightest ordinary floor: careful HP lost 18 to 24%, attack-only win 70 to 85%**; the Sentry and
the Eraser as 6.4 and 6.5; `levels` from 6.1. `SUITE_LEVELS_EP8` and `BOSS_LEVELS_EP8` (the Sentry 32 and 33, the Eraser 33
and 34). Tune until `--check` prints "All targets met" for all eight episodes; `--cave --check` and `--tier 1 --check`
unchanged. Knobs, in this order: the rub-out length (2 turns), the share of erasing moves in each foe's table, the Unwritten
damage (x1.3), then HP.

New checks in `ep8.mjs check()`:
- **`economy8`**: from `EP8_START.gold`, battle gold at 100% of the fights plus the main-path chests of 7.6 buys the two town
  pieces on arrival and the two tier 16 pieces before F3, each with at least 300 G to spare; at 80% with every chest. Prints
  both margins.
- **`erasureOn`**: every Episode 8 encounter opens with Erasure; no Episode 1 to 7 encounter does.
- **`noFoeErased`**: no foe is ever rubbed out in any trace; the hero is never rubbed out or Unwritten; the Sentry and the
  Eraser act at least once every two party rounds (mean over 400 fights).
- **`readShare`**: careful play breaks at least half the Unwrites with Read Aloud; **`answerShare`**: at least half the Last
  Silences with Answer; both with counts (pins seen, broken, landed).
- **`telegraphCount`**: at least two Unwrites per careful Sentry fight; at least three Unwrites and two Last Silences per
  careful Eraser fight (PLAYTEST_REVIEW_8 item 10).
- **The EXP margin**: every fight before the Eraser stays under Lv 34's 26,431, elites at their real rate; report it.

A content test reads Mira's two boss tips and asserts each lever exists in the data ("When it starts to unwrite one of us,
I'll read them back": `unwrite` carries the `unwrite` flag and Read Aloud breaks it; "When it goes quiet, {hero}, answer it":
`last_silence` carries the `last_silence` flag and the `SIGNATURE_TECHS` entry exists).

---

## 7. Loot, items and shops

### 7.1 Consumable

| id | Name | Price | Effect |
|---|---|---|---|
| `fresh_ink` | Fresh Ink | 180 | Every ally's rub-outs lose one turn (an unwriting too). (Party-wide by design.) |

### 7.2 Equipment (new bases)

Tier 15 (ilvl 32; the Glyphsmith Atelier from arrival): `vellum_plate` (body, hero/bram, 3,600, DEF +60, SPR +10),
`glyphweave_robe` (body, mira, 3,500, DEF +37, SPR +31, MAG +12), `folio_helm` (head, hero/bram, 1,850, DEF +25, SPR +7),
`reading_hood` (head, mira, 1,850, DEF +13, SPR +20, MAG +9), `margin_boots` (boots, all, 1,650, SPD +5, DEF +8),
`bookcloth_mantle` (mantle, all, 1,600, DEF +12, SPR +8, LUK +3), `fixative_charm` (charm, all, 1,400, Silence resist 50%, MAG
+5), `bookmark_charm` (charm, all, 1,400, Blind resist 50%, DEF +5).

Tier 16 (ilvl 33; the Atelier after `library_f2_done`): `quillsteel_sword` (sword, hero, 5,000, ATK +92, crit +6),
`folio_axe` (axe, hero/bram, 5,100, ATK +100, SPD -1), `index_spear` (spear, bram, 5,050, ATK +95, DEF +5), `lexicon_staff`
(staff, mira, 4,900, ATK +24, MAG +79, SPR +10, MP +22), `crane_bow` (bow, mira, 4,900, ATK +84, SPD +1, crit +4),
`gilt_mail` (body, hero/bram, 4,600, DEF +66, SPR +11), `gilt_robe` (body, mira, 4,500, DEF +40, SPR +33, MAG +13), `gilt_helm`
(head, hero/bram, 2,050, DEF +27, SPR +8).

Prices follow the gold, not the tier number (the Episode 7 rule): two pieces at each buy-point (7.6). Stats rise as usual.

### 7.3 Uniques and the set (placed, never random)

| id | Name | Rarity | Slot | Stats | Source |
|---|---|---|---|---|---|
| `binders_awl` | The Binder's Awl | legendary | charm | SPD +4, SPR +6, Fury gain +12%, Blind resist 30% | Sable in `scriptorium_open`, truth path (`told_sable`) |
| `riverwater_thread` | Riverwater Thread | legendary | charm | MAG +8, DEF +5, Silence resist 50% | Sable, kind path (`spared_sable`) |
| `last_word_pen` | The Last Word | legendary | charm | MAG +11, SPR +7, Fury gain +12% | the Eraser (guaranteed) |
| `blank_faceplate` | The Blank Faceplate | legendary | charm | ATK +8, DEF +7, Silence resist 50% | the Unnamed Sentry (guaranteed) |
| `quill_of_return` | Quill of Return | legendary | sword (hero) | ATK +96, crit +8, light +15% | F3 SEE, Lantern secret |
| `runners_ribbon` | The Runner's Ribbon | rare (unique) | charm | SPD +3, Blind resist 50%, LUK +5 | Quinn's Drifting Pages |
| `margin_boots_set` | Margin-Walker Boots | set | boots | SPD +5, DEF +8, Stun resist 10% | F1 D, Dash secret |
| `bookcloth_coat` | Bookcloth Coat | set | mantle | DEF +11, SPR +8, Silence resist 30% | the Living Concordance |

Set `margin_walker` (2 pieces): MAG +4, SPD +1. Sable's two gifts are a pair of shape, not power (decision D). Nox's and
Hazel's choices change lines only. Names are proposals. E8-battle greps every id first and checks every stat named exists
("light +15%" follows Episode 6's "thunder +15%").

### 7.4 Affixes and names

Add a tenth tier at ilvl 32 to every affix with nine (about +15% over tier 9; resist suffixes cap at 100). `RARE_NAME_A` gains
Inkbound, Gilt, Margined, Lettered, Firstwritten (each grepped first), through `RARE_NAME_EXT`.

### 7.5 Drop tables

`ZONE_LOOT`: ep8_stair ilvl 31, equipChance 0.18; library_f1 ilvl 32, 0.18; library_f2 ilvl 32, 0.19; library_f3 ilvl 33,
0.19. Random tables never roll legendaries.

### 7.6 Shops, the inn and the gold line

| Shop id | Keeper | Stock |
|---|---|---|
| `bibliotheca` | the Archive Keeper (Bibliotheca Supplies) | potion, hi_potion, ether, hi_ether, antidote, eye_drops, echo_herb, phoenix_feather, tent, silver_salve, fresh_ink, fixative_charm, bookmark_charm, bookcloth_mantle |
| `glyphsmith` | Sorel (the Glyphsmith Atelier) | tier 15 gear and the tier 14 weapons; tier 16 (`ifFlag: library_f2_done`) |
| `quinn_satchel` | Quinn at the South Margin (peddler markup) | hi_potion, hi_ether, phoenix_feather, fresh_ink, margin_boots |

The Keeper's Quiet Rooms: 160 gold. **The gold line** (first pass; `economy8` is binding; E8-battle tunes chest and foe gold
before prices):

| Point | Gold in | Spent | Left |
|---|---|---|---|
| Carried in (`EP8_START.gold`; Inference from EPISODE7_PLAN 7.6: 520 before F3, F3 about 2,000, the Phantom 1,800; E8-integrate records the real number) | 4,300 | | 4,300 |
| The Stair: battle gold about 1,560 (three fights), the Forgotten Traveler Satchel 1,700 | +3,260 | | 7,560 |
| The Scriptorium: **Vellum Plate 3,600 + Glyphweave Robe 3,500** | | 7,100 | 460 |
| F1: battle about 2,700, the shelf chest 1,500 | +4,200 | | 4,660 |
| F2: battle about 2,200, the Seal Gallery chest 1,500, the Sentry 1,700 | +5,400 | | 10,060 |
| Before F3: **Quillsteel Sword 5,000 + Lexicon Staff 4,900** | | 9,900 | 160 |

The last margin is under the 300 G floor in this first pass on purpose, to show the tuning order: E8-battle raises the F2
arena chest to 1,700 (or F2's foe gold) until both margins clear 300, and moves no price unless a price leaves its tier. Never
everything: a third piece needs sales, the optional chests or the Archive.

---

## 8. Music and sound

### 8.1 New tracks (E8-audio; composed in code with the in-repo tracker like Episodes 3 to 7; the shared four-note name motif; -16 LUFS; no Suno in the build)

The motif is the house's (`docs/MUSIC.md`: a rising perfect fifth, a whole-step lift, a falling major third; `0, +7, +9,
+5`). Each episode states it on a new instrument: Episode 5's oud, Episode 6's wind harp, Episode 7's iceglass bell (planned).
**Episode 8's is a solo violin**, a song-local instrument (like Episode 6's wind harp in `ep6_theme.py`; `synth.py`
untouched): a bowed string with a slow bow-pressure swell, light vibrato that arrives after the note starts, and a soft rosin
noise on the attack, so it sounds like someone reading aloud. The canon region-8 brief names it.

| id | Title | Role | Brief | Key, tempo | Motif | Fallback |
|---|---|---|---|---|---|---|
| `scriptorium_town` | The Unfinished Street | the town, `first_word`, `scriptorium_open` | The root region-8 brief for the tracker: celesta, harpsichord, solo violin, deep luminous pads and a gentle orchestral pulse; an immense library and recovered wisdom; 88 BPM. The A section's phrases stop a beat early (the unfinished signs); the B section lets the violin finish them. | G Lydian, 88 BPM, 90 to 100 s | the motif on the violin, G D E C, the C held over the harpsichord | `willowmere` |
| `first_library` | The Catalog of Lost Lives | library_f1, library_f2 | Dungeon: harpsichord ostinato like pages turning, low pads, the motif on the violin in long notes answered by the celesta two beats late; every 8 bars one instrument drops out for a bar and comes back (filed away, read back). | D Dorian, 76 BPM, 90 s | violin, augmented; celesta echo | `archive` |
| `boss_eraser` | The Eraser | the Eraser's battle | 4/4 drive: low strings, timpani, choir, harpsichord running; the B section quotes `scriptorium_town` with its phrases cut off; phase 4 cue (a loop point) thins to the violin alone over a pedal, the motif played whole on the last bar. | C minor, 136 BPM, 110 to 120 s | strings, the town quote, the violin | `boss_king` |
| `the_last_word` | Every Name | `CREDITS_EP8`, the end title | The credits: the motif on every instrument the series gave it, one after another as the cast's places pass (E8-audio reads MUSIC.md for each episode's instrument), joined in the last minute by the full ensemble, ending on the violin alone. | E major, 80 BPM, 240 to 300 s (two loops cover a long credits) | every instrument, then all | `title` |

Reused: `orrery` (the Stair: X1's star music, for the stars overhead), `mystery` (F3 and the Index), `sorrow`, `triumph`,
`battle`, `victory`, `gameover`, `willowmere` (`home`), `title`, `palehaven` (Act I, the ep7 fragment). Cut line: if time runs
short, `first_library` falls back to `archive`, `boss_eraser` to `boss_king`, `the_last_word` to `title`, and the episode
still ships.

### 8.2 Cue sheet by map

| Map | Track |
|---|---|
| ep7_ph_inn, ep7_stillheart roof (Act I) | `palehaven` |
| ep8_stair | `orrery` |
| ep8_scriptorium and `ep8_sc_*` (the Index: `mystery` 0.6) | `scriptorium_town` |
| ep8_library_f1, ep8_library_f2 | `first_library` |
| ep8_library_f3 | `mystery` |
| ep8_last_word | silence until its scenes |
| ordinary battles, the Sentry | `battle` |
| the Eraser | `boss_eraser` |
| ep8_bell_night | none (the bells) |

### 8.3 Cue sheet by scene (a scene that leaves its map's track puts it back before it ends)

| Scene | Cue |
|---|---|
| `ep8_morning` | `palehaven`, softer (0.6); silence on the note close-up; back |
| `ep8_roof` | `palehaven` (0.5); silence under the choice; `orrery` begins as they step on |
| `first_rub` | `battle` |
| `rubbed_steps` | the map track fades out with the tint; silence; back as the light returns |
| `south_margin` | `mystery`, softer |
| `first_word` | silence on the rub-out; `read_cast` as Mira reads; `scriptorium_town` back as the word returns |
| `meet_librarian` | `mystery` (0.6); silence on the card close-up |
| `sable_bindery` | `scriptorium_town` (0.5); silence under the choice |
| `keeper_memory_a` to `_c` | `sorrow` with a distant `bell_toll`; back to the map track |
| `the_name` | silence; one `bell_thirteenth` on the name; `mystery` (0.5) after |
| `unnamed_sentry` | silence for the intro, then `battle` |
| `eraser` | silence; Vex's footsteps; title card, `boss_eraser` |
| `eraser_after` | `sorrow` (the face) -> `triumph` (the Lexicon opens) -> `mystery` (the counter-seal) |
| `last_choice` | `mystery` (0.5) |
| `last_page` | silence on the shelf; the eighth star's chime (`kept`, reused); `scriptorium_town` on the last page |
| `scriptorium_open` | `scriptorium_town` from the first finished sign |
| `home` | the Kestrel's flight on `triumph` (0.6); `willowmere` at Hazel's door |
| `thirteenth_name` | no music: the twelve `bell_toll`s, the thirteenth `bell_thirteenth`, silence, then `the_last_word` under the end title |
| credits | `the_last_word` |

### 8.4 SFX and ambience (E8-audio, synthesized like the Episode 1 to 7 sets)

| id | Use | Brief |
|---|---|---|
| `page_open` | a book opens | a heavy cover lifting, a rising flutter of pages, a soft paper thump as they stand, about 0.8 s |
| `page_fold` | a book closes | the flutter reversed, a cover's soft clap |
| `rub_out` | a command rubbed out | a short dry rubbing scratch and a puff; distinct from core `ice` and Episode 6's `smudge` |
| `ink_slide` | a Defend slides the ink off | a soft wet slide, a little bright tick |
| `read_cast` | Read Aloud cast | a clear warm rising phrase like a voice reading, no words, no vowel formant; distinct from core `kept` and Episode 7's `call_cast` |
| `unwrite_read` | the Unwrite telegraph | a long low erasing hush with a faint high whine that does not resolve |
| `unwrite_break` | an Unwrite broken | paper snapping taut and a warm major chord; distinct from `decree_void`, `prophecy_break`, `rewrite_break`, `farewell_break` |
| `silence_gather` | the Last Silence charging | every sound in the mix ducked by the music system for its length, a thin rising white tone |
| `library_hush` (ambience) | the Index, the Library, the Last Word | a vast room's hush, pages turning far off, a slow creak of shelves, a candle gutter now and then |

Reused, never redefined: `bell_toll`, `bell_thirteenth`, `name_restore`, `kept`, Episode 4's Answer sounds. All of it reaches
the game through the pack's audio fragment (13.3), never `assets/audio/manifest.json`. E8-audio draws a pairs sheet
(`tools/audio/out/ep8/pairs.png`) proving `read_cast` against `kept` and `call_cast`, `unwrite_break` against the four break
sounds, `rub_out` against `ice` and `smudge`'s sound, and `page_open` against core door sounds are told apart.

---

## 9. Asset list: what is reused and what is new

### 9.0 Held painted source cells (checked 2026-11-10 against EPISODE7_PLAN 9.0 and `tools/art/**`)

| Sheet | Cell | Content | Status | Episode 8 use |
|---|---|---|---|---|
| `environments.webp` | 7 | First Library: colossal library, books and glyphs circling a luminous open book, violet void and warm golden light | held for Episode 8, never shipped | the Stair, Library and Last Word backdrops, the `library_far` and `library_cliff` decals, `ep8_dialog_keyart`, the palette |
| `bosses.webp` | 7 | Eraser: violet void entity, floating erased pages, empty white face, black robes | held, never shipped | the boss, its four looks, avatar, portrait crop |
| `portraits.webp` | 7 | `hooded_sage` (First Keeper: elderly hooded librarian, violet robe, pale face, gold eyes, book clasp) | built, held four episodes | `first_keeper`, shown from `eraser_after` on |
| `enemies.webp` | 0 to 7 | used by Episodes 1 to 7 | used | recolors only |

After Episode 8, every painted source cell has shipped (Inference: true if Episode 7 ships cells 6 as planned).

### 9.1 Tiles and tile objects (E8-tiles; new sheet `assets/tiles/ep8.png`, fragment `assets/tiles/ep8_tiles.json`)

| Asset | Reuse | New |
|---|---|---|
| Terrains: `void_violet` (the void: flat violet, A1, motes as a separate layer, never looks walkable), `script_step` (a stair line of gold handwriting, glyph bars never legible), `marble_page`, `ink_canal` (water), `parchment`, `letterpath`, `vellum`, `scriptmosaic`, `goldscript` (canon), `blank_page` (F3 white) | A2 builder, the ep7 per-floor kit approach | all; the three Library floors must not look alike: drawers and gold on F1, overwritten grey pages and lamp pools on F2, white pages over the void on F3 |
| Walls: `inkwall` (canon), `drawer_wall` (F1), `palimpsest_wall` (F2), `shelf_shaft` (F3), `book_tower` (the town) | wall systems with outer faces | five wall systems |
| Objects: `popbook` (shut, opening 2 frames, open; two ribbons; 2 x 1 and 1 x 2), `popbook_realm` x7 (the open pages drawn as a paper model: willow, mirror, forge and bell, keep, armillary, Kestrel, Stillheart), the page 9-slice, `living_codex`, `concordance` (closed, open lit 3 frames), `bindery_stall`, `half_sign` x6 (half, finished), `candle_post` (dark, lit), `reading_desk` (lamp lit), `restoring_fountain` (font, canon), `library_gate` (the empty seal; one line), `great_lexicon` (4 x 3: shut glowing, open with names, last page), `first_shelf` (one gap; filled), `star_dome` (overhead, 3 frames; with the eighth sign), `ink_door`, `drawer_stack_dash`, `booktower`, `quill`, `pagefountain`, `goldscroll` (canon decor) | push block, gate, font, the `door_boss` style, the ep6 `kestrel` prop | all |
| Town kit: marble page-stones, ink canal edges and bridges, book-tower facades, the `library_cliff` decal | Willowmere prefabs | the violet, gold and paper palette swap |
| Stair kit: script steps, the void edge, the South Margin arch, the `library_far` decal | the ep6 sky edge | all |

### 9.2 Sprites (E8-sprites; pack atlases `ep8_npcs`, `ep8_enemies_battle`, `ep8_enemies_field`, `ep8_bosses_battle`, `ep8_portraits`, `ep8_heads`)

| Asset | Reuse | New |
|---|---|---|
| NPCs `npc_librarian` (hood up), `npc_first_keeper` (hood back), `npc_first_keeper_m` (younger), `npc_sable`, `npc_sable_m` (younger), `npc_ione`, `npc_fen`, `npc_quinn`, `npc_sorel`, `npc_arun`, `npc_meya`, `npc_rootbound_keeper_m` (a green-bronze lantern) | paper-doll builder; bodies: robe for the Librarian and Ione; apron for Sable and Sorel; courier for Quinn; child for Meya; scholar for Fen; elder for Arun | 12 specs (the First Keeper: very old, straight, violet robe, book clasp, gold eyes; Sable: forties, apron, curved needle; ages must read, CRITIQUE_6 item 10) |
| The Scriptorium Host, the Archive Keeper | `npc_innkeeper`, `npc_shopkeeper` recolors | palettes |
| A baby bundle prop (blue-green blanket) | none | one small sprite, carried by `first_keeper_m` and `sable_m` |
| Enemy battle sprites, the 7 of 6.2 | enemies.webp cells, the Lost Page sprite, the recolor and derive pipeline | recipes; a dark outline and a warm rim on every foe |
| `unnamed_sentry` | enemies.webp cell 5 | ink and gilt recolor, the blank faceplate, a cracked frame |
| `eraser` x4 looks, `eraser_avatar` | bosses.webp cell 7, `build_bosses.py`, the `scribe`/`phantom` approach | the four looks and the avatar |
| `truth_grief`, `truth_change` | none | two small new sprites with ground shadows |
| Field sprites for every new enemy | `enemies_field` layout | frames; checked on parchment, marble, white page and over the void at phone scale |
| Portraits | `first_keeper` = `hooded_sage` (built); `eraser` a crop of bosses cell 7 via `build_portraits.py` | the crop recipe, readable at 48 (the white face, the hood edge, a page) |
| Timeline heads `head_<id>` | `build_heads.py` | entries in `ep8_heads`; the smudge on a head is drawn by the scene |

### 9.3 Backdrops and key art (E8-tiles, `tools/art/backdrops`; files `assets/backdrops/ep8_*`)

| id | Source | Use |
|---|---|---|
| `ep8_battle_stair` | environments cell 7, a sky crop with script steps composed over it | ep8_stair |
| `ep8_battle_library` | environments cell 7, a crop on the shelves | ep8_library_f1 |
| `ep8_battle_palimpsest` | composed in code: overwritten pages, lamp pools | ep8_library_f2, the Sentry |
| `ep8_battle_unwritten` | composed in code: white pages over the void | ep8_library_f3 |
| `ep8_battle_lastword` | environments cell 7, the central book | the Eraser |
| `ep8_dialog_keyart` | cell 7 with the baked vignette | Episode 8 title cards and the end title |

**Two grades at runtime, no extra bytes.** The Last Word stage has a **violet grade** (as composed) and a **gold grade** (a
warm lift) it cross-fades to when the ward breaks (phase 3), its own OKLab recipe, never a screen over the violet one; each
grade's mean luma measured (gold at least 0.10 above violet on the phone crop). The phase 4 white-out is a separate overlay
capped at +0.15 luma and 30 frames (photosensitivity). Pack stages are tested by waiting on `usedAsset`.

**The credits' epilogue cards reuse every realm's existing key art** (`dialog_keyart` and the `ep4_` to `ep7_` key art): no
new images.

### 9.4 Close-up pages (E8-tiles, `src/data/ep8/pages.js`, the ep7 pages approach: code-drawn, on `PAGE_KINDS`)

| kind | modes | Used in |
|---|---|---|
| `ep8_note` | one (Vex's slanting hand) | `ep8_morning` |
| `ep8_card` | `card` (the reader's card in the cold hand), `beside` (the card beside a page of the order, the same hand) | `meet_librarian`, `keeper_memory_b` |
| `ep8_cloth` | `bolt` (the blue-green weave), `match` (beside the blanket's corner with the name in river-water thread) | `sable_bindery` |
| `ep8_first_word` | `rubbed` (the word lifting off), `read` (it returning) | `first_word` |
| `ep8_could_not` | one ("I could not." in the cold hand, tucked in the blanket) | `keeper_memory_c` |
| `ep8_shelf` | `shelved` (the first page in its place), `star` (the eighth star taking the counter-seal) | `last_page` |
| `ep8_last_page` | one (the final page, empty, turning) | `last_page` |

The cold hand is drawn as Episodes 1 to 7 drew the lists (Fact: the list pages in earlier packs); the warm hand's "k" as
`ep5_page` to `ep7_page` drew it; Vex's hand slanting; the name on the blanket in river-water blue. Pictures, never puzzles.
The eighth star's sign reaches full alpha only on the box that says it.

### 9.5 Optional paid items (for Scott to approve and make himself; the build does not wait for them)

| Item | Service | Cost | What it lifts |
|---|---|---|---|
| A painted Scriptorium street (marble pages, ink canals, book towers) | Runway still | 4 credits | the town's one image as key art; the build composes it from cell 7 |
| Sable's portrait (forties, binder's apron, curved needle) | Runway still | 4 credits | the episode's emotional scene has no face without it |
| `the_last_word` credits theme from the region-8 brief | Suno Pro | 1 monthly download | a real recording for the game's only full credits |
| The root's `assets/cinematics/chapter-8.mp4` and `boss-8.mp4` (frames as stills) | none (already made) | 0 | only if Scott confirms their source: neither is named in `RUNWAY_PROVENANCE.json` (Fact, grepped 2026-11-10), and the game may be sold |

Default: none; the episode ships without them. Scott's Runway and Suno accounts stay with Scott: an agent never routes around
a denied or gated generation path, and asks in an issue instead.

### 9.6 What Episode 8 does not need

No new party art, UI windows, fonts or cursors, no new jingles, no new engine core modules, no new status (rubbed-out rows and
Unwritten are battle state), no new ui-atlas icon (pips, smudges, ribbons and Read Aloud's icon are drawn in code).

---

## 10. Save compatibility (E8-pack; read before touching anything that writes a save)

**The rule carries over from Episodes 3 to 7, unchanged: no Episode 8 path ever writes a save slot that holds another run.**

1. **Per-run autosave stays.** `g.autosaveSlot` is honored by everything Episode 8 adds; Episode 8 adds no new write path.
2. **The main entry is Continue.** A run that finished Episode 7 continues from its own save: after the Episode 7 credits it
   wakes at `ep7_ph_inn` and `ep8_morning` runs (only while `EP8_LIVE`); a save made later in Palehaven starts it on the next
   enter of the lodge. A save from before Episode 7's credits is untouched in every way.
3. **The quick start, `newGameEp8(name, { slot })`**, lives in the pack (`src/data/ep8/start.js`) and uses `pickRunSlot(save)`
   exactly as Episodes 3 to 7: slot 0 if empty; otherwise the first empty manual slot, shown before starting; if every slot is
   full it does not start and shows the existing refusal with only Back. Never Replace; never an occupied slot.
4. **`EP8_START`** (in the pack). Lv 31 at 22,200 EXP with the simulator's `ep8_stair` loadout; every Episode 1 to 7 main flag
   plus `ep7_complete`, `nox_named`, `doors_reopened`, `vex_name_whole`, `page_whole`; counters `credits_rolled` to
   `credits7_rolled`; key items `name_fragment_1` to `name_fragment_7`, `lantern_of_recall`, `mirror_sigil`, `sky_compass`;
   the skills `answer` and `read_aloud` not yet (`read_learned` unset), `answer` learned; 4,300 gold; potion 6, hi_potion 8,
   hi_ether 6, phoenix_feather 3, silver_salve 3, fresh_ink 2; starts at `ep7_ph_inn` `inn_bed`. One truth-choice flag of each
   Episode 7 pair is set to its truth side (stated in the start file). The quick start **awaits ep4 to ep7, then ep8, and merges
   every audio fragment it needs (ep6 for `sky_wind`, ep7 for `palehaven`, ep8), before the fade in** (PLAYTEST_REVIEW_6 fix 3).
   Exposed as `LQ_DEBUG.newGameEp8(name, { slot })`.
5. **The episode switch.** `src/game/episodes.js` gains `export const EP8_LIVE = false` (seam 2). While false: `ep8_morning`
   never runs, no stair door, the Episode 7 end card unchanged, no title row, except with `?ep=8` once `EP8_MAPS_LISTED` is true.
6. **A save never lost when the pack fails.** `src/game/packFallback.js` `landing()` learns `ep8_` (seam 4: the `ep[4567]_`
   regex widened to `ep[45678]_`); the field never autosaves on `_testtown` or while a `packReturn` is pending (E8-pack's test:
   an `ep8_library_f2` save with `src/data/ep8/**` unreachable keeps its slot's map after a map change).
7. **Additive schema.** New flags, the counter `credits8_rolled`, the ending flags. No field renamed or removed. **Fine Print
   rule:** a Fine Print run never starts Episode 8 (`ep8_morning` needs `not tier_1`).
8. **What an ended game's save does.**
   - After `thirteenth_name` sets `ep8_complete` and the credits roll, `CREDITS_HANDOFF[8]` wakes the party at `hero_home`
     `bed` the next morning and the field autosaves **to the slot this run was already writing** (its own autosave slot, or
     the manual slot the player last saved to by hand: unchanged house behavior). Nothing else is written.
   - The save goes on as an ordinary save: every map open; the Stair two-way; the Library's floors open with their fonts
     (book states reset on entry as always); `lexicon_door` from the square; no boss returns (`sentry_defeated`,
     `eraser_defeated` gate them off); every resident's post-game line; the Kestrel between the roof and Willowmere.
   - The final choice is permanent (`ending_return` or `ending_choose`): no scene offers the other; the Journal shows the
     chosen ending as its last page.
   - A save made anywhere after the end reloads into the post-game, never into an ending scene (every ending scene is guarded
     by its own done flag).
   - A save made **between** `eraser_defeated` and `ep8_complete` (only the bell tower copy and the scenes between are
     reachable, and none of them offers the save bell; the field autosave may fire on `ep8_scriptorium` after
     `scriptorium_open`) reloads at its map and Talk names the next step (the South Margin, then home): the ending can always
     finish.
   - The title shows the slot with its place, its Ledger count and (if the pack title wrap allows it) a gold star; the
     "Names kept: N of M" counter can reach M with the hero kept.
   - **Fine Print:** a finished Episode 8 record is a finished record (TIER.md `carryRecord`); carrying it never touches its
     slot (Fine Print's own `pickRunSlot` rule).
   - **The Deep Stacks:** unchanged; a Stacks run writes only as the Stacks already do.
   - The quick-start party's ended save behaves the same.
9. **Tests (node, pure, fake storage):** slot 0 occupied + empty slot 2 -> the quick start writes only slot 2 through a full
   simulated map change; all slots full -> no write; an Episode 7 credits fixture reaches `ep8_morning` with `EP8_LIVE` on and
   not with it off; a Fine Print save never reaches it; an Episode 6 save (no `ep7_complete`) never wants the pack; `?ep=8`
   hidden while maps are unlisted; the pack-failure landing case; a save on a bridge cell reloads on ground; **an `ep8_complete`
   fixture wakes at `hero_home` `bed`, writes only its own slot, and never runs `last_choice` again**; a fixture saved after
   `eraser_defeated` and before `ep8_complete` reaches `ep8_complete` by Talk's steps; a finished Episode 8 fixture is listed
   by Fine Print's carry picker and carrying it leaves its slot byte-identical.

---

## 11. Build plan: waves and agent briefs

Every agent: read `AGENTS.md`, COMMON.md, DESIGN.md, `docs/story/EPISODE8.md`, this plan and its brief; stay in owned paths;
keep `node qa/run.mjs` green (Episodes 1 to 7 unchanged in meaning); no git; no em dashes; LF endings; report under 400 words.
Where an agent needs something not yet delivered, it stubs the agreed id and says so.

**Every step leaves the game publishable:** nothing a player can reach changes until E8-integrate flips `EP8_LIVE`; the pack is
not even fetched while the switch is off, except with `?ep=8` or `?pack=ep8`.

### 11.1 The waves (up to three agents at once; paths disjoint inside each wave)

| Wave | Agent | Size | Brief | Owned paths (disjoint within the wave) | Closes with |
|---|---|---|---|---|---|
| **8a** | E8-pack | M | `E8-pack.md` | `src/data/ep8/index.js`, `start.js`, `maps.js`, `hooks.js`; the core seams of 13.2 in `src/game/packs.js`, `src/game/episodes.js`, `src/scenes/title.js` (one line), `src/game/packFallback.js` (one regex), `src/battle/rules.js` (the one `commands` call point), plus the core-JS trims that pay for them; `tools/pwa/build_pwa.py` (`LAZY_PREFIXES`), `qa/pwa/budget_ratchet.json` (`packCapsMB.ep8` only), `qa/pwa/packs.test.mjs` (the caps line), `qa/pwa/precache.test.mjs` (the ep8 fragment), `qa/core/ep8_*`, `qa/saves/ep8_*`, `qa/ui/ep8_*`, `docs/PWA_PACKS.md` (an "ep8 pack" section) | `node qa/run.mjs core saves ui pwa battle`; tap-prompt bytes not grown |
| 8a | E8-story | M to L | `E8-story.md` | `src/data/ep8/{flags,npcs,quests,text,story,ledger,credits}.js`, `docs/story/STAGING_EP8.md`, `docs/story/EPISODE8.md` (section 9 only), `qa/content/ep8_*` | `node qa/run.mjs content` |
| 8a | E8-battle | M | `E8-battle.md` | `src/data/ep8/{enemies,encounters,items,loot,shops,skills,ai,erasure}.js`, `tools/sim/ep8.mjs`, one line in `tools/sim/simulate.mjs`, `qa/battle/ep8_*`, `docs/BATTLE.md` (an "Episode 8" section) | `node qa/run.mjs battle`; `simulate.mjs --check` all eight episodes |
| **8b** | E8-tiles | M | `E8-tiles.md` | `tools/art/tiles/ep8_*.py` (+ one line in `build_tiles.py`), `tools/art/tiles/out/ep8/**`, `assets/tiles/ep8.png`, `assets/tiles/ep8_tiles.json`, `tools/art/backdrops/ep8_*.py`, `assets/backdrops/ep8_*`, `src/data/ep8/pages.js`, `qa/core/ep8_tiles*`, `qa/core/ep8_pages*` | sheets, mocks and pages viewed; `sync-manifest --pack ep8` |
| 8b | E8-sprites | M | `E8-sprites.md` | `tools/art/sprites/chars/ep8_*`, `tools/art/sprites/ep8_*.py` (+ one line in `build_all.py`), `assets/sprites/ep8_*`, `assets/ui/ep8_heads.*`, `qa/core/ep8_sprites*` | contact sheets viewed; `sync-manifest --pack ep8` |
| 8b | E8-world | M | `E8-world.md` | `src/data/ep8/field/**` (popbooks.js, events, system, art), `src/data/ep8/world.js` (the EXT type, the tints, the mote layer, the test map), `tools/maps/ep8_check.mjs` (+ one line in `tools/maps/mapcheck.mjs`), `qa/world/ep8_*`, `docs/WORLD_EP8.md` | `node qa/run.mjs world`; fieldlab shots viewed |
| **8c** | E8-maps-a | M to L | `E8-maps-a.md` | `src/data/maps/ep8_stair.js`, `ep8_scriptorium.js`, `ep8_sc_inn.js`, `ep8_sc_shop.js`, `ep8_sc_atelier.js`, `ep8_sc_index.js`, `ep8_bell_night.js`, `ep8_patches.js`, `qa/maps/ep8_a_*`, `docs/MAPS_EP8_A.md`, `tools/maps/previews/ep8_stair*`, `ep8_scriptorium*`, `ep8_sc_*`, `ep8_bell_night*`, `ep7_ph_inn_ep8*`, `ep7_stillheart_ep8*` | `mapcheck check`; previews viewed |
| 8c | E8-maps-b | M to L | `E8-maps-b.md` | `src/data/maps/ep8_library_f1.js`, `ep8_library_f2.js`, `ep8_library_f3.js`, `ep8_last_word.js`, `qa/maps/ep8_b_*`, `docs/MAPS_EP8_B.md`, `tools/maps/previews/ep8_library_*`, `ep8_last_word*`, the one `EP8_MAPS_LISTED` line in `src/data/ep8/encounters.js` | same; the critical path test |
| 8c | E8-audio | M | `E8-audio.md` | `tools/music/songs/ep8_*.py`, `assets/audio/music/ep8_*`, `tools/audio/ep8_*`, `assets/audio/sfx/ep8_*`, `assets/audio/ambience/ep8_*`, `src/data/ep8/audio.js`, `docs/MUSIC.md` (an Episode 8 section), `qa/audio/ep8_*`, `qa/music/ep8_*` | renders, seams and piano rolls viewed; `node qa/run.mjs music audio` |
| **8d** | E8-scene-ui | M | `E8-scene-ui.md` | `src/data/ep8/scene.js` (prototype wrapping), `src/data/ep8/title.js`, `qa/battlescene/ep8_*`, `qa/ui/ep8_scene*`, `qa/realplay/ep8battle.py`; a core line in `src/battle/scene/**` (`menu.js` above all) only if no wrap can reach it, paid by a trim in the same change | `node qa/run.mjs battlescene ui pwa`; phone shots viewed; the realplay casts |
| 8d (after scene-ui) | E8-integrate | M | `E8-integrate.md` | `qa/autoplay.py` (an Episode 8 segment), `qa/autoplay_grid.mjs`, `qa/integrate/ep8_*`, `qa/integrate/story_time.py` (Episode 8 input and the book weighting), `qa/shots.json` (append only, LF), `qa/realplay/ep8field.py` and its entry in `qa/realplay/run.py`, the `EP8_LIVE` line, seam fixes in files whose owner's brief is closed | the full gate list (12) |
| **8e** | E8-review | S to M | `E8-review.md` | `docs/CRITIQUE_10.md`, `docs/PLAYTEST_REVIEW_10.md`, `qa/out/review10/**` | read-only |
| 8e (after) | E8-fixes | M | written by the orchestrator from the review | per the list | the full gate list again |

Agent count: 11 build agents and 1 read-only reviewer, then 1 fix pass. Never more than three at once.

### 11.2 Disjointness check, by shared file

| Shared file or folder | Who touches it, in which wave | Why it is safe |
|---|---|---|
| `src/data/ep8/index.js` | E8-pack (8a) only | the entry imports the others behind a missing-module guard |
| `src/data/ep8/maps.js` | E8-pack (8a) writes the guarded list of all 11 map modules plus the patches | 8c's map agents only create files the list names |
| `src/data/ep8/encounters.js` | E8-battle (8a); E8-maps-b (8c) edits one line (`EP8_MAPS_LISTED`) | different waves |
| `src/data/ep8/erasure.js` | E8-battle (8a) only | `RULE_EXT` exists; the `commands` call point is E8-pack's seam in the same wave, stubbed until it lands |
| `src/battle/rules.js` | E8-pack (8a), one line | E8-battle never opens it; it tests through the call point |
| `src/data/ep8/pages.js` | E8-tiles (8b) only | E8-story calls kinds by name behind a `PAGE_KINDS[kind]` guard |
| `src/data/ep8/{scene,title}.js` | E8-scene-ui (8d) only; E8-pack's hook imports `title.js` guarded | different waves |
| `src/data/ep8/{flags,npcs,quests,text,story,ledger,credits}.js` | E8-story (8a) only | |
| `src/data/ep8/field/**`, `world.js` | E8-world (8b) only | |
| `src/data/ep8/audio.js` | E8-audio (8c) only | |
| core seams (`packs.js`, `episodes.js`, `title.js`, `packFallback.js`, `rules.js`) | E8-pack (8a) only | no other 8a agent opens a core file |
| `src/battle/scene/**` (`menu.js`), `src/scenes/battle.js` | E8-scene-ui (8d) only, only if a wrap cannot reach | |
| `tools/sim/simulate.mjs` | E8-battle (8a), one line | |
| `tools/maps/mapcheck.mjs` | E8-world (8b), one line | 8c runs it, never edits it |
| `assets/tiles/**`, `assets/backdrops/**` | E8-tiles (8b) only (ep8-prefixed files) | fragments, never `tiles.json` |
| `assets/sprites/**`, `assets/ui/ep8_heads.*` | E8-sprites (8b) only | pack atlases merge at runtime |
| `assets/ep8_manifest.json` | generated by `sync-manifest --pack ep8` (8b) | the orchestrator reruns it **and `git add`s it** at every wave close |
| `assets/audio/manifest.json` | **nobody** | the pack fragment (13.3) |
| `src/data/maps/ep7_*.js`, `src/data/ep7/**`, `src/data/maps/bell_tower.js`, `hero_home.js` | **nobody** | Episode 8 patches registered ep7 maps from `ep8_patches.js`, copies the bell tower by import, and only `goto`s into `hero_home` |
| `docs/MAPS.md`, `docs/WORLD.md` | nobody | Episode 8 writes its own `_EP8` files |
| `qa/shots.json`, `qa/autoplay.py` | E8-integrate (8d) only | |
| `qa/realplay/**` | E8-scene-ui then E8-integrate (8d, in order) | sequential |
| `PLAN.md`, `PROGRESS.md` | the orchestrator only | |

E8-integrate runs alone; E8-review never runs beside E8-fixes.

### 11.3 Wave close (orchestrator checklist, each wave)

`node qa/core/sync-manifest.mjs --pack ep8`; **`git add next/assets/ep8_manifest.json`**; `python tools/pwa/build_pwa.py`
(from the LF worktree only); `node qa/run.mjs pwa core`; restore `next/qa/world/out` (never commit it); add `next/qa/cave/out`
files only by name; count CR bytes in `next/qa/shots.json` (zero); view every image the wave's reports name; commit on the
build branch; push the branch and update the pull request into `overhaul` (PR only, never `main`; one pull request, never a
duplicate on retry).

---

## 12. Acceptance and QA (the full gate list)

- `node qa/run.mjs` green; Episode 1 to 7 suites unchanged in meaning (rerun a flaky timeout alone first: `x1_gate`,
  `x1_wild`, `walks`, `abilities_walks`, `qa/battle/sim.test.mjs`).
- `node qa/run-gate.cjs` (the root game) green.
- `node tools/sim/simulate.mjs --check`: "All targets met" for Episode 1, Whisperwood Hollow, Episodes 2 to 8, with
  `economy8`, `erasureOn`, `noFoeErased`, `readShare`, `answerShare` and `telegraphCount` passing; `--cave --check` and `--tier
  1 --check` unchanged.
- `node tools/maps/mapcheck.mjs check` clean; previews of the 11 new maps and two patched maps viewed, in `MAPS_EP8_A.md` /
  `MAPS_EP8_B.md`, including each book state that matters and every ghost outline drawn.
- **The menu paths, with real input.** `qa/battlescene/ep8_menu_cast.test.mjs` opens Mira's Magic list through `menu.js`,
  picks Read Aloud, moves the cursor to an Unwrite's target and confirms (never `LQ_DEBUG.battleAct`); a second case targets
  Mira herself; a third opens a **rubbed-out** Magic row and casts Read Aloud from it (every other spell greyed); a fourth
  checks the cursor opens on the pin's target; a fifth opens the hero's Tech list with the Last Silence charging and finds
  Answer first, in gold, and casts it. `python qa/realplay/ep8battle.py` casts Read Aloud with real keys and with a real tap
  (pin target, self, rubbed row), reading back `unwrite_broken` with reason `read`, and Answer with keys and a tap at the Last
  Silence, reading back `silence_broken` with reason `answer`. If Episode 8 adds a target kind, `menu.js startTarget` accepts
  it and these tests cover it.
- **The books, with real input.** `python qa/realplay/ep8field.py` reads `pb_willow` with real keys from its south side and
  walks the bridge with the direction held; goes round Gap B and reads from the far side; opens Gap C's book, crosses, closes
  it from the far side; tries a read that would wall the party's own cell and asserts the refusal and that nothing changed;
  then one read by a touch tap. A held direction neither drops nor adds a step across any read.
- **Autoplay route.** `qa/autoplay.py --episode 8` plays from an Episode 7 credits save and from `newGameEp8`: the lodge, the
  roof and its choice, the Stair (the first rub, A, B, the desk, the figure, C, the Margin), the town (the first word, the
  Librarian, Sable and her choice, the door), F1 (B, C, the key), F2 (the pair, the wrong version; the Sentry on Auto), F3
  (memory 3, SEE, SHELTER, CHOOSE both ways in two runs, the name), the Eraser on Auto (Read Aloud and Answer used by the
  competent policy; each Unwrite and Silence recorded with how it was answered), both endings in two runs, the last page, the
  open street, home and Hazel's choice, the bell (the walk up, all twelve tolls, the thirteenth), the credits, the wake at home.
  No softlock, the Eraser beaten at Lv 33, zero game overs, desktop and phone, one device at a time; book inputs from the map
  agents' reported solutions; the bot rests at each floor's fountain on arrival and at `font_l2b`; the quick start never wrote
  a slot it did not own (read back from localStorage); **zero "unknown ... id" warnings**. `--all-fights` hunts each placed foe
  once; its arrival gold in town and before F3 is logged against 7.6. **The post-game:** after the wake, the bot walks to the
  Scriptorium by the Kestrel and the Stair, through `lexicon_door`, and into the Deep Stacks' first floor, then saves and
  reloads; the ending scenes never run again.
- **Story timer** (`qa/integrate/story_time.py` on the Episode 8 logs, books counted by decisions): first play 70 to 100
  minutes, the credits excluded; first fight under 5 minutes after `ep8_morning`; no main scene over its box budget; the main
  path at 16 decisions or fewer. A top over 105 minutes takes Cut 1 and is re-timed before anyone is asked about story.
- **Shots** (append to `qa/shots.json`, LF, zero CR bytes; zero console errors; desktop 1920x1080 and phone 844x390):
  `story_ep8_morning_note`, `story_ep8_roof`, `battle_stair_first_rub`, `battle_rubbed_row`, `field_ep8_gap_a`,
  `field_ep8_gap_c_wall`, `story_rubbed_steps`, `story_south_margin`, `story_first_word`, `story_meet_librarian_card`,
  `story_sable_cloth`, `field_ep8_library_f1_crossing`, `field_ep8_library_f2_pair`, `battle_sentry_unwrite`,
  `field_ep8_library_f3_choose`, `story_keeper_memory_c`, `story_the_name`, `story_last_margin`, `battle_eraser_unwrite`,
  `battle_eraser_ward`, `battle_eraser_remembers`, `battle_eraser_silence`, `story_eraser_after`, `story_last_choice`,
  `story_last_page_star`, `story_scriptorium_open`, `story_home_hazel`, `story_thirteenth_name`, `ui_credits_ep8`,
  `ui_title_ep8`.
- Performance: field logic under 3 ms, a book read under 1 ms of recompute, 60 fps on the phone profile; the mote layer under
  0.5 ms.
- Text: no em dashes (grep U+2014 over `next/`), every box within 3 x 42, ASCII only (canon quotes' curly apostrophes made
  straight), no keyboard glyph on touch; no Scriptorium line before `keeper_named` names the Librarian as the First Keeper; no
  Episode 8 event uses an earlier episode's text key; the hero never has a speech box.
- Readability: every book puzzle solvable by a first-time player without Talk; the void never read as floor; every pair of
  5.1 at its floor; every book's state readable at rest on the phone; smudged rows at least 0.15 luma from their box and
  legible; pips, ribbons and the Silence dim readable on the phone; F3 brighter than F1 with the party's sprites at least 0.12
  luma off the page white; no mote frame change over +0.03 luma; the white-out under its cap; Talk always names the next step,
  including after `ep8_complete`.
- Saves: section 10's tests; an Episode 8 save made mid-Library reloads with every book in its authored state and every opened
  door open.
- **Budget** (13): `qa/pwa/precache.test.mjs` green, the tap-prompt bytes at or below E8-pack's first measure, the initial
  download not grown, the `ep8` pack under its cap; `python qa/pwa/pwa.py --only packoffline` with `?pack=ep7,ep8` brings both
  up offline after one visit.
- Shipping is not part of the gate list: E8-integrate flips `EP8_LIVE` on the branch only; shipping stays Scott's or Stephen's
  explicit word.

---

## 13. The budget rule and the pack

### 13.1 Why everything is in the pack

The load before the tap prompt is held by `qa/pwa/budget_ratchet.json` (`tapPromptMB` 2.34, never raised; Scott's cap 2.5)
and the initial download by `initialMB` (6.38, cap 6.5). The last measure on record is EPISODE7_PLAN 13.1's (Fact there, run
2026-11-10 on `origin/overhaul` at abd2b5b: 2,443,421 pre-tap of 2,453,667; 6,662,933 initial of 6,689,914). Episode 7's build
will move both; **E8-pack measures first** and treats whatever room it finds as zero. Episode 8 adds **no net bytes** to the
pre-tap load and **no bytes** to the initial download.

- Every file of Episode 8 is a pack file: `src/data/ep8/**`, `src/data/maps/ep8_*.js`, `assets/{tiles,sprites,ui,backdrops}/
  ep8_*`, `assets/tiles/ep8.png`, `assets/ep8_manifest.json`; `build_pwa.py`'s `pack_of` keeps them out of the precache with
  prefix `ep8_`.
- No `src/data/ep8/live.js`: the switch lives in `episodes.js`.
- Sound files `assets/audio/sfx/ep8_*` and `assets/audio/ambience/ep8_*` go in `LAZY_PREFIXES`. Music is lazy already. The
  credits track (about 4 to 5 minutes) is the largest single file Episode 8 adds; it is runtime-cached and never precached.
- **Any core-file change is paid for by trimming core JS in the same change**, with the gzipped before/after.

### 13.2 The core seams (E8-pack owns all of them; about 350 gzipped bytes in, at least as many trimmed out)

| # | File | Change | Why |
|---|---|---|---|
| 1 | `src/game/packs.js` | `ep8: { entry: '../data/ep8/index.js', prefix: 'ep8_', assets: 'assets/ep8_manifest.json', audioPack: 'ep8', hard: true, touches: ['ep7_ph_inn', 'ep7_stillheart'], wanted: (f) => !!(f.ep7_complete \|\| f.ep8_started), enabled: () => EP8_LIVE }` and the import | the pack |
| 2 | `src/game/episodes.js` | `export const EP8_LIVE = false;` | the switch |
| 3 | `src/scenes/title.js` | the Episode 7 hook line generalized to 7 and 8 (or one line beside it): when `EP8_LIVE` and a slot has `ep7_complete`, or `?ep=8`, `ensurePack('ep7')` then `ensurePack('ep8')`, then `globalThis.LQ_EP8 && LQ_EP8.title(this)` | the row lives in the pack |
| 4 | `src/game/packFallback.js` | `ep[4567]_` becomes `ep[45678]_` | an Episode 8 save never lands on Test Town |
| 5 | `src/battle/rules.js` | one line at the end of the commands builder: `if (RULE_EXT.commands) RULE_EXT.commands(state, u, out);` | Erasure marks rows disabled with a reason; BATTLE 14.8 wished for it. **A hot file: the issue says so before the edit** (AGENTS.md) |

Not seams: Read Aloud reaches `erasure.js` through the `{ keep }` bridge; `delayUnit` and the clamped `push()` are on the rule
context; `SIGNATURE_TECHS`, `SKILL_GATE`, `CREDITS_HANDOFF`, `QUEST_EXT`, `LEDGER`, `PLACES`, `REACHED`, `TINTS`,
`INTERACT_TYPES`, `PAGE_KINDS`, `BACKDROPS`, `BOSS_CARD` and the rest of Episode 7 plan 13.2's list are already exported and
mutable (Fact for Episodes 4 to 6's packs; Episode 7 relies on the same). The field mechanic attaches itself from
`EXT.popbook.create` and from `world.js` on every map with a `popbooks` block, so **`src/scenes/field.js` is not edited**.

### 13.3 Audio through the pack

`src/data/ep8/audio.js` exports `{ music, sfx, ambience, jingles, pack }` in the manifest entry shape (`pack: 'ep8'`). The entry
merges it into `engine.audio.manifest` (never overwriting an id) before `ensurePack` calls `audio.loadPack('ep8')`, **on every
path that brings the pack up, the quick start included** (a test asserts the ids resolve after `newGameEp8`, the ep6 and ep7
fragments' `sky_wind` and `palehaven` too).

### 13.4 Pack cap

`packCapsMB.ep8 = 1.0` (wire); `qa/pwa/packs.test.mjs` asserts it. Expected: code and data about 0.32 MB (the credits text and
the post-game lines are the extra), tiles, backdrops and pages about 0.32, sprites about 0.28. Music sits outside the cap
(lazy, per track).

### 13.5 The pack chain (raise before wave 8a)

Six chained packs (ep3, ep4, ep5, ep6, ep7, ep8) sit between an Episode 8 save and its first frame. PLAYTEST_REVIEW_8 item 8's
fix (fetch every pack at once on a resume, in the hot file `src/game/packs.js`) waits for Scott's or Stephen's word. The
orchestrator asks for that word in issue #68 **before wave 8a**, with E8-pack's cold and warm measure of the Episode 7 entry
as evidence. Without it, E8-pack still starts every fetch at once inside the pack and reports the number; a cold entry over 8 s
is a known risk, not a blocker.

---

## 14. Risks, assumptions and decisions

**Assumptions.**
1. Episode 7 is built and merged with its defaults (bible section 0.1), its plan numbers close to its built ones (levels,
   gold, the roof's marks), and its asks honored (bible 0.2).
2. One man in three records (the speaker-swap mechanism handles three as it handled two); the name twist works with any
   player-typed name, including long ones (a content test feeds the longest name the name entry allows through every box that
   holds `{hero}` and asserts the 3 x 42 rule).
3. Erasure fits on `RULE_EXT` plus the one `commands` call point; if a rubbed-out row cannot be drawn by a pack wrap of
   `menu.js`, E8-scene-ui takes one paid core line there (11.1 allows it) and says so.
4. Pop-up books attach without editing `field.js` (an `EXT.create` hook and the collision override, as tide locks, gust lanes
   and name stones did).
5. `bell_tower.js` can be imported and copied under a new id; if not, E8-maps-a copies the layout into a new module.
6. Episode 4's Answer data and `SIGNATURE_TECHS` entry are unchanged since Episode 4 shipped (Fact on 2026-11-10).

**Risks.**
- **Building on a proposal.** If Scott and Stephen change Episode 7 materially, parts of this plan move. Mitigation: bible 0.1
  says what moves for each load-bearing choice; E8 waits for Episode 7's merge.
- **Six chained packs.** 13.5.
- **The order trap** (3.3). A test covers both orders.
- **The pre-tap budget.** Five seams, every byte paid in the same change; the orchestrator rejects a report without gzipped
  numbers.
- **The hot file `rules.js`.** Seam 5 is one line, said in the issue first; no other agent opens it.
- **Erasure could frustrate** (a player loses Attack and does not know why). Mitigation: Mira's first-fight line names the
  answer; the smudged row's help says "Try something else."; Defend always slides the ink; rub-outs last two turns, never
  more; at most two per member; the sim's knobs.
- **Two telegraphs in the last fight.** Never up together; each names its answerer; no earlier battle rule runs.
- **The menu paths** (self-target, a rubbed row that still offers one spell, Answer floating on a new flag). The scene test and
  realplay casts are gate items.
- **The twist could land wrong** (a player feels the name was taken from them). Mitigation: the First Keeper gives it back
  explicitly ("It's your name now. You wear it better."); the hero's Ledger row is kept; the bell tolls it as the hero's. Open
  choice 3 offers the alternative.
- **A parent in a kids' game.** Sable is alive, kind, and does not take the hero from Hazel; no father is mentioned; no death
  is added. Open choices 5 and 6 offer the alternatives.
- **A villain who is a sad old man.** No threat to a child on screen; memory 3 is tender, not frightening; the fight is the
  party refusing to let him vanish.
- **The finale's length.** Planned at 84 with the ending's 11 minutes; the timer gate and the cut lines.
- **The credits.** A long scroll on a phone: confirm skips after the first full play; text at the game's box size.
- **The permanent choice.** A misclick is permanent (canon). Mitigation: the choice asks once more ("Return every stolen
  name? This cannot be changed." / Yes, No) with No as the cancel answer.
- **The EXP margin under Lv 34** (planned about 850). E8-battle reports it with elites counted.

**Cut lines, if the budget tightens** (each keeps a complete story; the name, the Last Margin, the final choice, the last
page, the hero's Ledger keep and the bell bookend are never cut):
- Cut 1: drop Quinn's Drifting Pages (Quinn keeps his canon lines; his LEGACY line becomes an inspect) and F1's side alcove
  (the set boots move to the F1 fountain as a plain chest); the credits' epilogue cards shrink to one card with all six
  sentences.
- Cut 2: drop the Archive of Uncensored Lives and F2's side galleries; `first_library` falls back to `archive`,
  `the_last_word` to `title`; the Listen inspect is dropped.
- Cut 3: merge F2 into F1 (the pair, the wrong version, `keeper_memory_b` and the Sentry move to F1's upper galleries) for a
  two-floor Library plus the Unwritten Page; the Glyphsmith Atelier becomes a stall in the square (Sorel's shop unchanged);
  `rubbed_steps` folds into `south_margin`.

**Open for Scott and Stephen** (none blocks the build; full list with reasons in EPISODE8.md section 11): the finale [yes];
Mira's episode with the hero at the twist [yes]; the First Keeper's name is the hero's [yes]; one man in three records [yes];
born to Sable, carried by the First Keeper [yes]; Sable alive and does not ask [yes]; Tamsin to Sable [Sable]; Iona into Ione
[yes]; Nox climbs and says the name [yes]; Vex's Last Margin and he stays [yes]; three truth choices [yes]; the canon final
choice, permanent [kept]; the eighth star's sign [yes]; the bell bookend [yes]; the witness count [yes]; "rubbed out" [yes];
four phases [four]; Answer returns, no earlier rule does [yes]; Fine Print base game only [yes]; 84 minutes [84]; the cards
[as written]; the held portrait, no paid media [yes]; the canon renames and drops [as listed]; shipping [Scott's or Stephen's
word].
