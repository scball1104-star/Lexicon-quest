# Expansion reconciliation: decision log (Episode 1 "The Wider Valley" and Episode 2 "The Mere Country")

Written 2026-10-25 by the expansion reconciler; revised the same day when Scott withdrew the lower-EXP policy. **Docs only.** Where `docs/EXPANSION1_PLAN.md`, `docs/EXPANSION2_PLAN.md` or any `docs/briefs/X1-*`, `X2-*`, `XP-packs.md`
disagrees with this file, this file wins, and the other file is stale. The ordered build is `docs/EXPANSION_SCHEDULE.md`. Evidence tags: **Fact** read in code or run today, **Inference** my arithmetic or estimate (the check is named).

## 0. The decisions at a glance

| # | Decision | Where it is written |
|---|---|---|
| 1 | **EXP stays exactly as today** (Scott, revised): every scale 1.0 in the one file `src/data/expcurve.js`; no Config toggle; the story-only versus completionist gap is not a goal; optional content pays gold, gear, items and a capped EXP bonus; a completionist is at most about one level over today's plan at each main boss | section 1 |
| 2 | The barrow and the counting of names stay in Episode 1 as written; Episode 2's barrow became the Cairnmakers' Quarry and its Cairn Count became Strangers' Stores | section 2 |
| 3 | Strict run order and single-writer files; disjoint paths in every wave | section 3 and the schedule |
| 4 | The 6.5 MB cap is not raised; one pack mechanism (`XP-packs.md`), first job of the build, used by both episodes | section 4 |
| 5 | The Weald and Southmere each get their own track: Episode 2 audio has nine tracks | section 5 |
| 6 | Defaults: no old-curve toggle; names are placeholders in one table | section 8 |
| 7 | Factual slips: the valley is 60 x 40, `east_road` is 64 x 36 | section 6 |

## 1. EXP (decision 1, revised after Scott's message)

**History.** The first reconciliation instruction was a 0.6 / 0.7 / 1 policy (`EP1_EXP_SCALE` 0.6, `EP2_EXP_SCALE` 0.7), with story-only and completionist profiles. Scott withdrew it. Everything that spoke of a story-only profile, `story80`, `complete+gear`, `--profile`, 0.6, 0.7, the 1,433 to
1,435 window, the 860-EXP story-only start, `EXP_SCALE = { 1: 0.70 ... }` or an "Experience: Standard / Story" toggle is gone from both plans and every brief.

**The mechanism (kept, one owner, one file).** `src/data/expcurve.js` is created by **X1-battle** (X1 wave W1) and is the single place the constants live:

| Constant | Value | Meaning |
|---|---|---|
| `EP1_EXP_SCALE`, `EP2_EXP_SCALE`, `EP3_EXP_SCALE` | 1 | every episode pays today's EXP |
| `OPTIONAL_FOE_EXP_MUL` | 1 | the default `expMul` of every optional zone that sets none (Whisperwood Hollow keeps today's pay) |
| `EXPANSION_FOE_EXP_MUL` | 0.1 (**1.0 in the code since W2**, Scott; see `docs/BATTLE_X1.md`) | the `expMul` each NEW optional group and optional boss of either expansion carries (first pass; 0.05 to 0.15) |

`rules.js` `makeEnemyUnit` multiplies a unit's EXP by `expScale(options.zone) x expMul` once, after the elite multiplier, rounded per unit; `encounterExp()` sums the same values; `give('exp', n)` (cutscene) is never scaled. Because every scale is 1.0 and no existing encounter sets `expMul`,
**every existing reward is byte-identical** (a test pins it), so no `X1_LIVE` conditional is needed: the first draft's `EP1_EXP_SCALE = X1_LIVE ? 0.6 : 1` is dropped because the scale no longer exists. X1-battle is the only agent that edits `rules.js` or the EXP block of `encounters.js`; X2-battle edits **none** of
`expcurve.js`, `rules.js`, `encounters.js` (it writes `expMul: EXPANSION_FOE_EXP_MUL` into its own data).

**A flag for Scott.** The message said "the optional-foe multiplier is 1.0". The constants honour that for everything that exists (default 1.0, the Hollow unchanged). The arithmetic below shows the **new** optional foes cannot also pay full EXP without breaking your own cap, so they carry 0.1. If you want them at 1.0
instead, the cap cannot hold (Archivore would be Lv 11+, three over); the alternative is to keep 0.1 and call it "a few EXP". This is the one place I read your instruction through its stated goal rather than its letter.

**The math (Fact for today's route, Inference for the supply).** Main route, `progression()`: Episode 1 cumulative after each zone 141, 335, 621, 1,033, 1,433 (the Echo Warden is met at about 448, the Archivore at 1,033); Episode 2 road 1,595, F1 1,901, F2 2,327, F3 2,835, throne 3,335 (the King is met at 2,835). Thresholds (`EXP_TABLE`):
Lv 6 424, 7 623, 8 867, 9 1,156, 10 1,493, 11 1,878, 12 2,314, 13 2,800, 14 3,339, 15 3,931. "At most one level over today's plan" means the EXP at the boss stays below the threshold of today's level plus 2. The existing Whisperwood Hollow (258 raw, full pay, opens at the Lantern) counts, because it is part of today's game.

| Main boss | Today | One level over ends at | Extra EXP allowed (cumulative) |
|---|---|---|---|
| Echo Warden | about 448, Lv 6 | 866 (Lv 7) | 418 |
| Archivore | 1,033, Lv 8 | 1,492 (Lv 9) | 459 |
| Episode 1 end | 1,433, Lv 9 | 1,877 (Lv 10) | 444 |
| Other Selves | about 2,180, Lv 11 | 2,799 (Lv 12) | about 620 |
| The King | 2,835, Lv 13 | 3,930 (Lv 14) | 1,095 |

Why full pay fails: the new Episode 1 foes are 752 raw EXP, all available before the Archivore, and the Hollow already uses 258 of the 459 allowed there. At full pay the Archivore is met at 1,033 + 752 + 258 + quests, Lv 11 or more.

| Supply, worst order (everything optional first) | Raw | Effective |
|---|---|---|
| Episode 1 new fights (18 groups, 2 bosses) at `expMul` 0.1 | 752 | about 75 |
| Episode 1 quests (Strays 8, Thirteenth Stone 12, Dark Stars 8; Pell 6, Four Rolls 12, Things Not To Forget 8) | | 28 before the Archivore + 26 after = 54 |
| Whisperwood Hollow (existing) | 258 | 258 |
| Episode 2 new fights (20 groups, 4 bosses) at `expMul` 0.1 | 474 | about 47 |
| Episode 2 quests (Q1 6, Q2 4, Q3 8, Q4 4, Q5 4, Q6 8) | | 34 |

| Where | Extra over the regular route | EXP | Level (today) | Cap |
|---|---|---|---|---|
| Echo Warden | 83 | 531 | 6 (6) | 418 |
| Archivore | 361 | 1,394 | 9 (8) | 459, margin 98 |
| Episode 1 end | 387 | 1,820 | 10 (9) | 444, margin 57 |
| Court F1 entry | 387 + 60 | 2,042 | 11 (10) | +1 level |
| Court F2 entry | 387 + 77 | 2,365 | 12 (11) | +1 level |
| Other Selves | 387 + 77 | about 2,644 | 12 (11) | 2,799, margin about 155 |
| The King | 387 + 81 | 3,303 | 13 (13) | 3,930 |
| After the King | 468 | 3,803 | 14 (13) | |

The checks are `optional_exp.mjs` `checkOptionalCaps()` (X1-battle writes it for both episodes; X2-battle adds its rows via `x2.mjs`) and they run in `simulate.mjs --check`. The two named levers if a cap breaks are quest EXP, then the group `expMul` (0.05 to 0.15); never a main-route foe, a scale, `TARGETS.levels` or a main-route number.
Rewards: gold, named gear and items are unchanged and are the optional content's point. Elites add at most about 14 across both episodes. **Check for the Other Selves moment** (the reflections' pay is read from the sim; the 2,180 is my estimate).

**Quest EXP.** One primitive for both plans: `await s.give('exp', n)` (built by X1-world, X1 wave W2). X2's draft `s.exp(n, opts)` is retired. Amounts: Episode 1 Strays 8, Thirteenth Stone 12, Dark Stars 8, Pell's Crates 6, Four Rolls 12, Things Not To Forget 8; Episode 2 Q1 6, Q2 4, Q3 8, Q4 4, Q5 4, Q6 8.

**sim, simplified.** `tools/sim` changes are additions only: X1-battle owns `tools/sim/**` during the Episode 1 build and adds `x1.mjs` (zones, bosses, loadouts for the new content), `optional_exp.mjs` (the ledger and the cap check, both episodes) and a registry list; X2-battle, after P1b, adds `x2.mjs` and one registration line. `progression()`, `TARGETS`, `TARGETS.levels`,
`BOSS_LEVELS`, `route.mjs` and `loadouts.mjs` keep their meaning. No profiles, no `--profile`.

**Episode 3.** It assumes a **regular-route start**: the quick start (2,900 EXP, Lv 13) is about what today's data gives at the King (2,835) and just under the end of Episode 2 (3,335, Lv 13). It is not a completionist start (a completionist can reach 3,803, Lv 14). The old line "E3 assumes a completionist Lv 13 start" is replaced by this. `EP3_EXP_SCALE` is 1 and E3-battle may revise it later.

## 2. The overlap (decision 2)

Kept in Episode 1 as written: the Wethers' Barrow (`x1_barrow`, `barrow_reeve`, `barrow_shade`, `bw_shades`, `bw_mixed`, music `wethers_barrow`, `boss_reeve`) and The Thirteenth Stone (`rollcall`, twelve stones whose names return, the Reeve who counts a flock one short).

Changed in Episode 2:

| Was | Is |
|---|---|
| The Cairnmaker's Barrow (a burial mound) | **The Cairnmakers' Quarry** (a worked-out stone cut under the heights: timbered galleries, sledge rails, cut-stone bays; the Waymarker is a mason-construct still setting stones for a road that is gone) |
| `x2_barrow` (map, zone, music), `barrow_mouth`, `barrow_fire`, `barrow_note`, `x2_barrow_entry`, `x2_barrow_short` | `x2_quarry`, `quarry_mouth`, `quarry_fire`, `quarry_note`, `x2_quarry_entry`, `x2_quarry_short` |
| `barrow_shade` (ordinary foe; collided with Episode 1's) | `delver_shade` (Delver's Shade, grey-green, cell 7) |
| encounters `bw_shades`, `bw_wisps`, `bw_golems` (two collided) | `qy_shades`, `qy_wisps`, `qy_golems` |
| `barrowguard_cap` (Barrowguard Cap), source Cairnmaker's Cell | `quarrymans_cap` (Quarryman's Cap, same stats), source Foreman's Office |
| terrain `peat`, wall system `barrow`, objects `barrow_door_*`, `waymark_pedestal` empty and filled | `quarry_rock`, `quarry`, `quarry_door_*`, `waymark_pedestal` (one state) and new `cache_cairn` (empty and stocked) |
| Q1 **The Cairn Count** (`cairn_count`): Maren counts twelve cairns, nine stand; three Waystones from two gold chests and a scene; reward Waymark Mantle, EXP 20 | **Q1 Strangers' Stores** (`strangers_stores`): Maren stocks the old travellers' cairns; she gives three `cache_tin`; one is set in a hollow cairn behind each of the three bosses (Quarry setting floor, the Nest, the Light's gallery); reward **Cairnwalker's Mantle** (`cairnwalker_mantle`, the old mantle's stats), EXP 6 |
| flags `x2_cairn_started`, `x2_waystone_barrow`, `x2_waystone_heron`, `x2_waystone_light`, `x2_cairn_done` | `x2_stores_started`, `x2_cache_quarry`, `x2_cache_heron`, `x2_cache_light`, `x2_stores_done` |
| key items `waystone_barrow`, `waystone_heron`, `waystone_light` (3 rows; 16 key items) | `cache_tin` (one counted item; **14** key items) |
| scenes `x2_maren_tally`, `x2_maren_stones`; book `maren_tally` | `x2_maren_stores`, `x2_cache_set` (one scene, parameterized by the cairn), `x2_maren_thanks`; book `maren_ledger` |
| ring of twelve plinths, nine with cairns and three empty | twelve plinths, all with cairns |
| the two gold chests holding Waystones (`chest_waystone`, `chest_nest`) | removed (the hollow cairns replace them; the loot budget goes down by two gold chests; the named boss drops are unchanged) |
| the Weald's Wishing Birches (nine carved first names, lettered ink) | the Blazed Birches (nine trail signs: a hare, a key, a bell, a heron; no names) |
| `x2_barrow` music brief "a slow count of twelve; the motif counted out" | `x2_quarry`: pick-and-sledge work, no counting figure |
| a Lodge slate rumor "Maren counts the cairns and comes up short" | "Maren is stocking the old travellers' cairns" (see the plan, 4.6; the slate row text follows Q1) |

Still alike, flagged for the critics, not changed: Pell's Crates (Episode 1) and the Courier's Parcels (Episode 2) are both deliveries; they differ in giver, route, items and tone.

## 3. Run order and single-writer files (decision 3)

**Order.** XP-packs, X1-story, X1-battle (W1); X1-world, X1-tiles, X1-sprites (W2); X1-maps-west, -south, -north (W3); X1-maps-wild, X1-audio (W4); X1-maps-hub (W5); X1-integrate (W6) then **publish P1**; the X1 reviewers and X1-fixes (W7) then **P1b** (a second gate-listed publish only if fixes changed anything).
**Only then** do any Episode 2 art, audio, battle, world or shared-data agents start: X2-battle, X2-world (XA); X2-tiles, X2-sprites, X2-audio (XB); X2-maps-a, -b (XC); X2-maps-c (XD); X2-integrate (XE) then **publish P2**; the X2 reviewers and fixes (XF), then P2b if needed.
**One exception:** X2-story writes only new files (`src/data/x2/{story,quests,npcs,text}.js`, its staging doc, `qa/content/x2_*`) and may run at any time after X1 wave W3 has closed and before XA. Nothing else of Episode 2 is design-neutral enough to start early (X2-battle needs `tools/sim` and `expcurve.js` from the Episode 1 build; X2-world needs X1-world's work in the same files).

| File family | The one writer, in order |
|---|---|
| `src/game/packs.js`, `src/data/x{1,2}/index.js`, `src/data/x{1,2}/live.js` (creation), `src/core/assets.js`, `src/world/maps.js`, `src/game/story.js`, registry seams in `quests.js` / `npcs.js` / `text.js`, `src/main.js` and the title and load scenes, `tools/pwa/**`, `qa/pwa/**`, `qa/core/sync-manifest.mjs` | XP-packs (W1); afterwards X1-integrate then X2-integrate for a documented seam fix, never together |
| `src/battle/rules.js`, `src/data/encounters.js`, registry seams of `enemies.js` / `items.js` / `loot-tables.js` / `shops.js`, `src/data/expcurve.js` | X1-battle (W1). X2-battle edits none of them |
| `tools/sim/**` | X1-battle (W1); X2-battle later adds `x2.mjs` and one registration line |
| `src/world/abilities.js`, `events.js`, `cutscene.js`, `tools/maps/mapcheck.mjs` | X1-world (W2); X2-world later, small (block art, ink over water verified; `x2_check.mjs` and one seam line) |
| `src/data/maps/valley.js`, `willowmere.js`, `archive_f1..3.js` | X1-maps-hub (W5) |
| `src/data/maps/east_road.js` | X2-maps-a; `nameless_hollow.js`, `nh_chapel.js` X2-maps-b; `court_f1..3.js` X2-maps-c |
| `assets/audio/manifest.json`, `tools/audio/build.py`, `docs/MUSIC.md`, `docs/SUNO_PROMPTS.md` | X1-audio (W4), then X2-audio |
| `assets/tiles/tiles.json`, shared sprite atlases, `assets/ui/heads.*`, `assets/manifest.json` | nobody; packs add `x1_` and `x2_` fragments and new atlases instead |
| `assets/x1_manifest.json`, `assets/x2_manifest.json`, `assets/pack_files.json` | generated (`sync-manifest --pack`, `build_pwa.py`); the orchestrator runs them at each wave close |
| `qa/shots.json`, `qa/autoplay.py` | X1-integrate; X2 uses `qa/shots_x2.json`, `qa/autoplay_x2.py` |
| `src/data/x1/live.js`, `src/data/x2/live.js` | created by XP-packs; flipped by X1-integrate and X2-integrate, last |
| `docs/PROGRESS.md`, `docs/PLAN.md`, git | the orchestrator |

**Disjointness audit.** Every wave table in `EXPANSION_SCHEDULE.md` lists each agent's owned paths and the paths were checked pairwise. Changes made to get there: X1-story no longer creates `live.js` (XP-packs does); X1-battle took the `export` seams in the battle data files and `tools/sim/**` for both episodes (X2-battle's earlier claim on `rules.js`,
`encounters.js` and `tools/sim/**` is withdrawn); X1-world took Appraise-on-object and `give('exp')` for both plans (X2-world lost N1 and N8); X1-tiles and X1-sprites lost their appends to shared sheets and atlases; XP-packs took atlas resolution (X2-world lost N10) and every call-site and PWA edit (X2-packs is retired);
X1 wave W2 moved X1-world out of W1 (max three agents per wave) and X1-audio moved from W2 to W4 beside X1-maps-wild. Two agents in one wave each edit a different one-line entry in two different build scripts (`build_tiles.py`, `build_all.py`); nothing else is shared.

## 4. Load budget and packs (decision 4)

The 6.5 MB initial cap and the 2.5 MB tap-prompt cap are **not** raised. Fact (run 2026-10-25): 6.30 MB and 2.30 MB. One mechanism, defined once in **`docs/briefs/XP-packs.md`**, owned by the XP-packs agent, **the first job of X1 wave W1** (beside X1-story and X1-battle): a `PACKS` table in `src/game/packs.js`; a data entry module
per pack that registers by mutation; `ensurePack(id)` (idempotent, lazy, never blocking boot, failing quietly with a toast and a retry); pack asset fragments (`x1_tiles.json`, `x1_*` atlases, `assets/x1_manifest.json`) instead of edits to shared sheets; atlas resolution across atlases; a `touches` list so the edited existing maps rebuild after a late pack load; the service
worker's runtime cache and an idle warm for offline play; and a **ratchet**: initial download at most 6.33 MB after XP-packs, 6.38 MB after X1-integrate, 6.45 MB after X2-integrate (cap unchanged at 6.5), tap prompt at most 2.32 MB, `x1` pack at most 1.0 MB wire, `x2` pack at most 0.8 MB wire. X1 and X2 both depend on it; X2-packs is retired and its items moved
(N9 and N10 to XP-packs). Fallbacks inside it (a lazy group in `assets/manifest.json` if the engine cannot load a second manifest; the exact map-rebuild rule) are named in the brief and the agent reports which one it used.

## 5. Music (decision 5)

The Weald and Southmere Shore each get their own track: `x2_wayfaring` is split into **`x2_weald`** (fiddle and plucked guitar over a hand drum, E minor turning to G, 100 BPM, 4/4, 90 s) and **`x2_shore`** (slack-key guitar and concertina over a cello pad with a tidal swell, F# Dorian, 84 BPM, 4/4, 90 s). Episode 2 audio is **nine tracks** (`x2_heights`, `x2_marsh`, `x2_isle`,
`x2_weald`, `x2_shore`, `x2_quarry`, `x2_lamp`, `x2_cistern`, `x2_boss`), 8 SFX, 2 ambiences. Fallbacks: `x2_heights` to `fading_road`; `x2_marsh`, `x2_isle`, `x2_weald`, `x2_shore` to `valley`; `x2_quarry` to `mystery`; `x2_lamp`, `x2_cistern` to `court`; `x2_boss` to `boss_king`. `docs/MUSIC_X2.md` gets nine sections and `docs/SUNO_PROMPTS.md` nine appended rows (the Weald and Southmere separate).
Episode 1 stays at eight tracks, ten SFX, two ambiences. Also fixed: Episode 1's SFX id was `wheel_groan` in 2.7 and `mill_start` in 10.4 (and `mill_start` is a scene id); it is `wheel_groan`.

## 6. Factual slips (decision 7)

Fact (code): `valley.js` is `W = 60, H = 40`; `east_road.js` is `W = 64, H = 36`; the valley's `weatherZone` is 60 x 19 and `east_road`'s fog and mist area is 20 x 13 at (20, 9). I searched both plans, all briefs and docs for "60 x 19" and for 20 x 13 used as a map size: **the plans already said 60 x 40 (X1 4.10) and 64 x 36 (X2 2)**; the "20 x 13" appeared only as the fog
area. I added an explicit note in the X2 plan (section 2) so the numbers cannot be misread again; no other text repeated either slip. Also kept: the walkable band of the road is about 64 x 11 (rows 11 to 21).

## 7. Other conflicts found and fixed while reconciling

- Id collisions: `barrow_shade`, `bw_shades`, `bw_mixed`/`bw_*` (section 2).
- Two Appraise contracts (range 5 versus 3; `x2_reveal.js` versus `abilities.js`): one, X1-world's, at the existing Appraise range; the engine constant is read and reported, neither plan's number is assumed.
- Two EXP primitives (`give('exp')` versus `s.exp`): one.
- Two pack designs, two registries (`expansions.js`, the pack index) and two manifest strategies: one (XP-packs).
- Two sim designs (X1 `exp_ep1.mjs` with profiles, X2 `progression(share, episode, profile)`): replaced by additions only (`x1.mjs`, `optional_exp.mjs`, `x2.mjs`).
- Scenes path: Episode 1 scenes live in `src/data/x1/story.js` (inside the pack), not `src/data/story/x1.js` (which is precached).
- Episode 2's draft assumed a 0.70 scale on Episode 1 and its own Episode 1 story targets (Archivore 0.65 at Lv 7): withdrawn with the policy.
- Quest EXP, journal "+n EXP" text and the sim ledger now use the small amounts of section 1.

## 8. Names to confirm (decision 6)

All are placeholders chosen by the designers, none approved by Scott. They live in **one exported constant**, `X1_NAMES_TO_CONFIRM` in `src/data/x1/text.js` (X1-story), and in a "Names to confirm" section of `docs/story/STAGING_X1.md`, so the real names are a one-place edit. Rules for any replacement: ASCII, no collision with a named person in Episodes 1 to 3, no alphabetical pattern, no word game.

| Item | Placeholder now | Where used | Who supplies the final |
|---|---|---|---|
| The Reeve's name | Wystan, Reeve of the Fold (sample from the plan) | `reeve_after`, `rollcall_stones`, the Reeve's bestiary entry | Scott; X1-story writes the placeholder |
| The twelve standing-stone names | to be written by X1-story (a sample set) | `rollcall_stones`, the sampler in the loom house, the stones' three states | Scott |
| The three Keepers' station names (milestone, Archive door, Watchtower) | to be written by X1-story | `star_read`, `orrery_align`, the Dark Stars quest | Scott |
| Odo's chime song (title and first line) | to be written by X1-story | `list_song`, Things Not To Forget | Scott |
| The nine chime-post words (the ninth reads KEPT) | to be written by X1-story (ninth fixed) | the High Moor's chime posts | Scott |

Other proper names introduced by the designers and open to a veto (not placeholders, but not approved): Episode 1 Brindle, Tamsin, Ferrick, Hesper, Odo, Yarrow, Patch the scarecrow; Episode 2 Maren, Dunn, Bett, Marit, Ines, Harn, and Tam (the Last Lamplighter's name, told on the Isle). Defaults Scott accepted: no old-curve toggle; story-only pressure is moot after the withdrawal.

## 9. Unresolved or watch items

1. **The 0.1 `expMul`** (section 1): needed to hold your cap; flagged above. Per-unit rounding of very small values is an Inference (check: `checkOptionalCaps()` at 400 runs).
2. **The Other Selves moment** (about 2,180) is my estimate; the cap there has a margin of about 155 on it and 472 even on the conservative F2-end reading.
3. **Appraise range** is read from code by X1-world; if it turns out the touch button needs a field change, the brief says ask (field.js is not in X1-world's paths).
4. **XP-packs feasibility** of the late-ready map rebuild and a second manifest file is checked against `world/maps.js` and `core/assets.js` as its first step; its fallbacks are named.
5. **Regular-route balance of the Episode 1 optional content**: the plan's recommended levels are completionist-style levels; a regular-route player is at today's levels. Optional areas are fleeable and never required.
6. Two delivery quests alike in shape (section 2) and two map-edit-heavy hub/Court steps remain risks the critics are told to check.

## 10. Files changed by this reconciliation

New: `docs/EXPANSION_RECONCILIATION.md`, `docs/EXPANSION_SCHEDULE.md`, `docs/briefs/XP-packs.md`. Rewritten or edited: `docs/EXPANSION1_PLAN.md`, `docs/EXPANSION2_PLAN.md`, `docs/briefs/COMMON.md` (one appended section), the X1 briefs (`X1-story`, `X1-battle`, `X1-world`, `X1-tiles`, `X1-sprites`, `X1-audio`, `X1-maps-west`, `X1-maps-south`, `X1-maps-north`,
`X1-maps-wild`, `X1-maps-hub`, `X1-integrate`, `X1-review`) and the X2 briefs (`X2-packs` retired to a redirect, `X2-battle`, `X2-story`, `X2-audio`, `X2-world`, `X2-tiles`, `X2-sprites`, `X2-maps-a`, `X2-maps-b`, `X2-maps-c`, `X2-integrate`, `X2-review`). No source, asset or test file was touched; no git command was run.
