# The Ledger of Names

Built 2026-10-26 by H2-ledger (docs/RESPONSIBILITY_ARC.md sections 3.1 and 3.3, Scott's decisions in section 7).
Code: `src/data/ledger.js` (the table and the pure helpers), the Ledger tab in `src/ui/screens/journal.js`, the
counter in `src/scenes/title.js`, the Aim line in `src/scenes/field.js`. Test: `qa/ui/h2_ledger.test.mjs` (it checks
this file against the table, so edit both).

## What it is

One screen in the Journal: every named person in the live game, grouped by place, bright when their name is kept and
faded ink when it is not. Each name has exactly ONE keep condition, drawn from something the player does: a side story
finished, a boss beaten (the names it took come home), a beat the story already gives them. The count is on the
title screen ("Names kept: 17 of 37") and in the tab's header. No save field was added: everything reads flags.

Rules the table follows:
- One keep per name, from flags that exist in `FLAGS` (`quests.js`, H1's flags in `story/ep1.js`, the expansion's in
  `x1/flags.js`). Nothing invented.
- The kept line a player reads is the flag's own meaning in `FLAGS`, cleaned by `keepLine()` (no scene ids, no dev
  tails, "the hero" becomes "you"); a row gives its own `why` only where that text would read badly.
- An unkept name shows "..." and its place only: never a spoiler. A name the story has not said yet shows as `???`
  (Aurel before `aurel_named`, Mara before `mara_read`, Garrick while Episode 3 has his name struck). The Hollow's
  group is "The Nameless Hollow" until `nh_restored`.
- Episode 1 and 2 rows always count. Expansion rows count when `X1_LIVE` and their region is on (the static
  switches in `x1/live.js`, not pack readiness, so the title and the field agree). Episode 3 rows count only when
  `EP3_LIVE`.
- The hero's own name is a row with no keep in Episodes 1 to 3 (EPISODE1 beat 21: "every name brightens but one").
  The Ledger cannot be finished until the story gives it back; that is the point of it.

## The table

Rows in Ledger order. Episode: 1, 2, 3 or X1 (the Episode 1 expansion). Live today (X1 on, Episode 3 off): 37 names.

| id | Name | Place | Keep condition | Episode |
|---|---|---|---|---|
| `hero` | the player's name | The Party | none yet (Episode 4 or later) | 1 |
| `mira` | Mira | The Party | `archivore_defeated`: her name was on Moth's list; it came home with the others | 1 |
| `bram` | Bram | The Party | `archive_entered`: he spoke his name at the door (SPEAK, AND BE KEPT) and it lit | 1 |
| `hazel` | Hazel | Willowmere | `hazel_farewell_done`: her farewell, the knitted mantle | 1 |
| `mael` | Elder Mael | Willowmere | `returned_home`: he opens the Register in the square and confesses | 1 |
| `oren` | Oren | Willowmere | `yard_fight_done`: the yard slime, the first mark (minute 5, every player) | 1 |
| `hal` | Hal | Willowmere | `tess_letter_1_delivered`: his letter reaches Oren, who has a brother again | 1 |
| `tess` | Tess | Willowmere | `tess_quest_done`: all three letters home, her father's among them | 1 |
| `wick` | Wick | Willowmere | `wick_tag_done`: the name-tag back on his collar | 1 |
| `lark` | Lark | Willowmere | `tess_letter_2_delivered`: she gets a grandmother back | 1 |
| `nella` | Nella | Willowmere | `nella_bell_done`: Maudie the call-bell back on her post | 1 |
| `edda` | Edda | Willowmere | `tess_letter_2_delivered`: she and Nella remember each other | 1 |
| `holt` | Sergeant Holt | Willowmere | `bram_joined`: he holds Garrick's name for Bram at the gate | 1 |
| `garrick` | Garrick | Willowmere | `garrick_farewell_done`, dark again while `ep3_started` and not `garrick_named` | 1 (and 3) |
| `iris` | Iris | Willowmere | `archivore_defeated`: Moth murmured her name; it came home | 1 |
| `pip` | Pip | Willowmere | `found_thirteenth_bell`: the bell is real; Pip counted right | 1 |
| `barnaby` | Barnaby | Willowmere | `ep1_complete`: he wakes after the credits | 1 |
| `pell` | Pell | Willowmere | `crates_done` (needs X1): his receipts and the price card | X1 |
| `quill` | Quill | Willowmere Valley | `hollow_cleared`: the pilgrims' stone gives back three names | 1 |
| `brindle` | Brindle | The Wider Valley (west) | `rollcall_done`: he counts thirteen | X1 |
| `tamsin` | Tamsin | The Wider Valley (west) | `crate_1_done`: the spools reach her loom | X1 |
| `ferrick` | Ferrick | The Wider Valley (south) | `crate_3_done`: the bearing reaches the weir | X1 |
| `hesper` | Hesper | The Wider Valley (north) | `stars_done`: the Keeper's last note in the Cellar | X1 |
| `odo` | Odo | The Wider Valley (wild) | `list_song`: his chime song is heard | X1 |
| `yarrow` | Yarrow | The Wider Valley (wild) | `crate_2_done`: the beeswax moulds reach her hives | X1 |
| `corin` | Corin | Hollowmere | `nh_restored`: the first to shout the town's name | 2 |
| `nico` | Nico | Hollowmere | `nico_crowns_done`: the paper crown | 2 |
| `sava` | Sava | Hollowmere | `nh_restored`: the town is named again | 2 |
| `lena` | Lena | Hollowmere | `testimony_lena`: her testimony at the fountain quest | 2 |
| `tovin` | Tovin | Hollowmere | `court_ferry_open`: the second crossing he owed | 2 |
| `orla` | Orla | Hollowmere | `fountain_done`: the fountain listens | 2 |
| `anwen` | Sister Anwen | Hollowmere | `testimony_anwen`: her testimony | 2 |
| `elian` | Elian | Hollowmere | `letter_answer_done`: he signs his reply as Mayor of Hollowmere | 2 |
| `aurel` | Aurel (`???` until named) | Hollowmere | `aurel_named`: Elian says his father's name | 2 |
| `wren` | Wren | Hollowmere | `last_route_done`: her lost-property shelf gives up the satchel | 2 |
| `fitch` | Fitch | Hollowmere | `nh_restored` | 2 |
| `vessa` | Vessa | Hollowmere | `nh_restored` (Vessa's Sand is Episode 3's, not a keep) | 2 |
| `veyra` | Foreman Veyra | Emberpeak | `coolant_done`: the coolant station | 3 |
| `ilya` | Ilya | Emberpeak | `testimony_ilya` | 3 |
| `sella` | Sella | Emberpeak | `testimony_sella` | 3 |
| `harl` | Harl | Emberpeak | `testimony_harl` | 3 |
| `bess` | Bess | Emberpeak | `pk_restored`: the plates are lettered again | 3 |
| `taro` | Taro | Emberpeak | `pk_restored` | 3 |
| `rusk` | Rusk | Emberpeak | `pk_restored`: the first to shout Garrick's name | 3 |
| `mara` | Mara (`???` until `mara_read`) | Emberpeak | `mara_named`: the reforged leaf raises her name | 3 |

Totals: 45 rows in the table. Per episode: Episode 1 core 19 (the hero without a keep), X1 7 (Pell included),
Episode 2 12, Episode 3 8. Live today: 37 (Episode 3 off). An Episode 1 credits save with every side story done
keeps 17 of 37 (every Episode 1 name but the hero's and Pell's, whose keep is an expansion quest).

Aliases (the same person under another record): `garrick_e` and `garrick_n` are `garrick`.

## Excluded (NPC records with no row)

| id | Why |
|---|---|
| `hob` | Innkeeper; writes every guest's name twice but has no beat of his own. H4 candidate (a true answer at the inn). |
| `cobb` | Farmer; names his hens, no beat. |
| `rook` | Archive salvager, a shop counter. |
| `penny`, `penny_e`, `penny_s` | The peddler, one person in three records; no beat in any episode. |
| `henrietta`, `bertha`, `the_duke`, `loaf`, `anvil` | Animals. |
| `starter_dough` | A sourdough starter. |
| `stray_1`, `stray_2`, `stray_3`, `stray_4`, `stray_5`, `fold_sheep_a`, `fold_sheep_b` | Sheep. |

Named people with no NPC record and no row: Vex Quill (the rival keeps himself), Moth (a keeper-beast), Wystan the
Reeve (a foe, and the dead), the three dark-star Keepers (lore names), the last Keeper (nameless by design), the
Valewyn courier (a role). H5 may decide the Reeve and the Keepers deserve rows; the shape allows it.

## How H4 and H5 add keeps

A keep is one row in `LEDGER`: `r('id', 'place', episode, 'flag', { name?, why?, kept?, hide?, x1?, region? })`,
plus its line in the table above. H4 (true answers) keeps names from the EXCLUDED list by giving them a beat, for
example Hob kept by a true-answer flag at the inn; it does not change an existing row's keep (one per name). The
Oren truth is already remembered (`oren_truth` / `oren_lie`) and is deliberately not his keep. H5 (floor hooks and
boss lines) may add a boss's line naming what the town avoided, and may give the Reeve and the dark-star Keepers rows
if their names are said in play (`reeve_named`, `star_1_read` to `star_3_read` exist). Any new flag must be in `FLAGS`
first; the test refuses a keep it cannot find.

## The Aim line (section 3.3)

One thin window at the top of the field: the current main step's `aim` (a present-tense line such as "Find Mira at the library", H4-story; the step's title when a step has no aim). It
shows for about four seconds when the step changes, when the menu closes, and after ten seconds standing still,
then the HUD is clean again. It never draws during a scene, under a dialogue box, under the menu or a battle, while
the location banner is up, or during a fade; its timer waits while it cannot be drawn, so a step that changes inside
a scene is shown once the scene lets go. On touch layouts it sits above the controls (the top of the game).
`LQ_DEBUG.state().sceneState.aim` is the title while it is on screen, else null.

## Title counter

"Names kept: N of M" under the title menu, from the slot (autosave included) with the most names kept, computed once
per title entry and again when the Load or Config page closes. Hidden when no save exists. When the touch menu reaches
the bottom edge (four rows), the line moves to the top right corner.
