# The Deep Stacks: balance proof (C3-sim-bot, 2026-10-27)

The plan's section 11 asks for proof before publish: a scripted descent with death-rate targets per band, arrival levels that
hold the plan's curve, the Binder winnable with care, and a bot that goes down from the library. This file is the record of
that pass: how it is measured, what was wrong, every number changed (before and after), what the bot saw, and what is left.

Tags (R6): **Fact** = measured here and reproducible with the command given; **Reported** = another agent's file or report;
**Inference** = my reading of the numbers.

## 1. How to run it

| What | Command | Time |
|---|---|---|
| The check (50 seeds, B1 to B100) | `node tools/sim/simulate.mjs --cave --check` | about 25 s on 6 worker threads |
| The same, written down | `node tools/sim/simulate.mjs --cave --check --md --json` (qa/cave/out/sim_cave.md, tools/sim/out/cave_sim.json) | |
| Other policies (printed, never checked) | `--policy naive` (attack only) / `--policy reckless` (ignores telegraphs) / `--all-policies` | |
| More seeds | `--seeds 300 --seed0 101` | about 2.5 min |
| A what-if without editing | `--patch '{"band":{"5":{"speed":1.2}}}'` (keys: tuning, ease, early, band, cons, extra, landing, field, binder, equip) | |
| The bot's habits in the sim | `--chests cheap` (only short detours), `--patch '{"equip":"prompt"}'` (the prompt's first answer), `--patch '{"field":{"ambush":0.3}}'` | printed, never checked |
| The base game (unchanged) | `node tools/sim/simulate.mjs --check` | about 4 min |
| The bot | `python qa/autoplay.py --cave 30 --seeds 10 --jobs 4 --speed 3` (desktop), `--device phone --seeds 3`, `--cave-resume` | see 6 |
| The Binder's three looks | `python qa/cave/bot_binder_phases.py [--device phone]` | 1 min |

## 2. What the descent measures (tools/sim/cave.mjs)

Everything runs through the game's own code; nothing is averaged. Per seed: `newGameEp2` (Episode 1 done), `cave.enter`
(level 1, nothing worn, empty bag), then floor by floor `world.js buildFloor` (the generator with the floor's encounters and the
pity rule's blue chest, the module the game registers). Every placed foe is fought (`createEncounterBattle`, the scene's
`armBattle` hook, `ai.js partyAction`), every chest opened (`rollRedChest` / `rollBlueChest` on the chest's own rng, as
`world.js openCaveChest` rolls it), rewards applied by `rewards.js applyBattleOutcome` (EXP by the real curve, mastery, drops).
Gear: the equip prompt (`equipOffers`) answered for the member who really gains (an empty weapon hand first). Between fights, no
rests (plan 3): a Feather for a fallen member, Mira's Mend above a quarter of her MP, Potions under 45% (70% while the bag holds
more than six), an Ether under 30% MP. A wipe ends the seed. A seed that reaches B100 fights the Binder three times from its B100
state, also attack-only and ignoring the telegraphs.

Targets (`CAVE_TARGETS`, pinned in qa/cave/sim_targets.test.mjs): death rate (of the seeds that reach a band, the share that wipe
in it) under 5% B1 to B9, 15% B10 to B29, 30% B30 to B59, 45% B60 to B99; mean arrival level within 4 of 12 (B10), 25 (B30), 40
(B60), 55 (B90); the Binder won within 20 rounds in at least 80% of careful fights.

Time per floor is the one modelled number (Inference): walk = the greedy tour arrival, chests, stairs on the floor's walk model at
run speed plus a quarter; a fight 14 s plus 7 s a round at battle speed 1x; a chest 3 s; the stairs 4 s.

## 3. Before and after

### Death rate per band (competent policy, 50 seeds 1 to 50)

| | B1-B9 | B10-B29 | B30-B59 | B60-B99 | reached B100 |
|---|---|---|---|---|---|
| target | under 5% | under 15% | under 30% | under 45% | |
| C1-data's tuning as handed over (Fact) | **94%** (47 of 50) | 100% (3 of 3) | no seed | no seed | 0 |
| C1-data's numbers with this pass's two loot code fixes (Fact) | **92%** (46 of 50) | 100% (4 of 4) | no seed | no seed | 0 |
| After (Fact) | **2.0%** (1 of 50) | **10.2%** (5 of 49) | **6.8%** (3 of 44) | **17.1%** (7 of 41) | 34 |
| After, 300 seeds from 101 (Fact) | 1.0% (3 of 300) | 8.4% (25 of 296) | 9.6% (26 of 271) | 27.8% (68 of 245) | 177 |

### Arrival level (mean of the three, seeds that got there)

| | B10 | B30 | B60 | B90 |
|---|---|---|---|---|
| plan | 12 | 25 | 40 | 55 |
| before (Fact) | 10.9 (3 seeds) | no seed | no seed | no seed |
| after (Fact) | 11.3 | 24.8 | 40.6 | 56.1 |

### Per decade, after (Fact, 50 seeds)

| decade | wiped | rounds a fight | HP lost a fight | KOs a fight | min / floor (model) | feathers held |
|---|---|---|---|---|---|---|
| B1-B9 | 1 of 50 | 3.05 | 6% | 0.00 | 2.9 | 1.4 |
| B10-B19 | 2 of 49 | 3.17 | 8% | 0.02 | 3.2 | 5.8 |
| B20-B29 | 3 of 47 | 3.75 | 8% | 0.03 | 4.1 | 10.7 |
| B30-B39 | 0 of 44 | 3.93 | 8% | 0.03 | 4.9 | 15.1 |
| B40-B49 | 2 of 44 | 3.71 | 8% | 0.03 | 5.3 | 16.5 |
| B50-B59 | 1 of 42 | 3.61 | 7% | 0.02 | 5.8 | 17.1 |
| B60-B69 | 1 of 41 | 3.90 | 9% | 0.03 | 6.7 | 18.5 |
| B70-B79 | 2 of 40 | 3.85 | 8% | 0.05 | 7.3 | 18.8 |
| B80-B89 | 2 of 38 | 3.96 | 7% | 0.04 | 8.0 | 19.2 |
| B90-B99 | 2 of 36 | 4.01 | 7% | 0.06 | 8.1 | 20.4 |

Bookmarks (Fact): first held on B8 (median), 26 found per run (spares are lost on exit, plan 2.6), no run without one by B10.
Blue chests: 10.3 uniques per run that goes deep.

### 3.4 The same tuning on other seeds and policies

| policy (50 seeds 1 to 50) | B1-B9 | B10-B29 | B30-B59 | B60-B99 | reached B100 | the Binder (fights from B100) |
|---|---|---|---|---|---|---|
| careful (competent, checked) | 2.0% | 10.2% | 6.8% | 17.1% | 34 | win 100%, 93% within 20 rounds, 14.5 rounds, 9% HP lost |
| ignoring the telegraphs (reckless) | 2.0% | 8.2% | 20.0% | 38.9% | 22 | win 91%, 73% within 20 rounds, 17.4 rounds, 25% HP lost |
| attack only (naive) | 64.0% | 100% (18 of 18) | no seed | no seed | 0 | (from careful parties' B100 states) win 0% |
| careful, 300 seeds from 101 | 1.0% | 8.4% | 9.6% | 27.8% | 177 | win 100%, 97% within 20 rounds, 14.3 rounds |

Inference: the Stacks get harder the way the plan wants (the per-floor hazard rises from about 0.1 to 0.2% on B1-B9 to about 0.5 to
0.8% on B60-B99), the telegraphs start to matter from the third band, and attack-only play cannot get past the first band (no healing:
the Stacks have no rests). The 300-seed row shows the 50-seed check is not lucky: B10-B29 is the tightest band (10.2% on the
check's seeds, 8.4% on 300, against 15%); every other band keeps 3 points or more on the check and more on 300. One generator refusal (seed 318 B18) is censored there, not counted.

## 4. Why the handed-over numbers failed (Fact unless tagged)

1. **No rests, and MP is the healing budget.** C1-data's sanity harness played every checkpoint fight at full HP and MP with a
   fixed loadout, so it read 100% careful wins. The real descent carries HP and MP from fight to fight with no font. With the
   refill switched on (`runDescent({ refill: true })`, HP and MP topped up on every arrival) nobody died in 10 seeds to B99;
   without it Mira's MP was at 0 to 10% in nearly every fatal fight, the bag held no Potion, and the Auto policy Defends forever
   once the party is low with no healer coming (ai.js, see 7). Mira's MP use per floor at full MP: 30 (B1-B9) to 210 (B90-B99).
2. **Item level 1 has no bases.** Every tier 1 base is item level 2, so on B1 to B5 (item level 1, plan 6.1) `rollBase` found an
   empty pool and fell back to the slot's lowest base whatever the type: every lent weapon was a Short Sword. Mira and Bram fought
   bare-handed to B8 and later (11 of 11 sampled seeds without a staff at B8).
3. **Mira needs a staff.** Channel (staff, 0 MP, +5 MP a hit) is her only MP back between rests that never come. Without a lean
   to the start kinds, 4 of 10 deaths in B10-B19 had Mira staffless.
4. **The larder was cures.** Bands 1 and 2 rolled Antidotes and Eye Drops as often as Ethers, and no Phoenix Feather in band 1: a
   member who fell stayed down for the rest of the reading.
5. **A live bug in foes.js registerFloorEncounters**: the encounter ids carry no seed (`cave_b23_e4`) and an id already
   registered was kept, so the second reading of a session (a new seed) fought the first reading's groups under the new floor's
   sprites. Fixed (a differing cave spec is replaced). The sim found it because 50 seeds run in one process.

## 5. Every change

### src/data/cave/foes.js

| constant | before (C1-data) | after | why |
|---|---|---|---|
| `TUNING.kHp` | 1.25 | 0.75 | fights of 3 to 4 rounds (the sim's 4.7 to 5.6 before), so MP lasts |
| `TUNING.kPower` | 1.5 | 0.85 | less healing a floor; the one-shot cap still binds from B41 (W15 rule kept) |
| `TUNING.hpRamp` | -0.45 | -0.2 | deep fights about 4 rounds, not 2.5 |
| `TUNING.powerRamp` | 1.2 | 2.0 | the Stacks hit harder the deeper they go (capped by the one-shot rule) |
| `TUNING.speedRamp` | (none) | 0 | new knob, unused |
| `OPENING_EASE` | B1 0.8, B2 0.9 | B1 0.9, B2 0.9 | B1 fights at least 2 rounds (C1-data's sanity test) |
| `EARLY_EASE` (new) | | power 0.55 on B1 rising to 1 on B12, hp none | the first floors without a font: a member lost early spirals |
| `BAND_ADJUST` (new) | | band 2 hp 1.0 to 1.2 across the band; band 3 hp 1.12 to 1.15, speed 1.35; band 4 hp 0.95, speed 1.55; band 5 hp 0.85, speed 1.12 | the pools differ in danger at parity; this evens the per-floor hazard and makes it rise with depth (B60-B99 about 3 to 10% a decade); band 2 hp holds C1's "attack-only loses at B30" check and the band 3 start keeps "effective HP never drops 15% at a band edge" |
| `SPEED_CAP` | 3.5 | 4 | room for the band speeds |
| `registerFloorEncounters` | an existing id kept | a differing cave spec replaced (reported as added) | the second-reading bug (4.5) |
| `BINDER` hp / atk / mag | 6500 / 1500 / 2200 | 4000 / 2200 / 3200 | before: careful play won 100% but only about 50% within 20 rounds (20.5 a win) and lost 5% HP; after: 93% within 20 rounds (14.5), attack-only 0%, ignoring the telegraphs 91% in 17.8 rounds losing 22% HP; still the game's biggest numbers (C1's test: hp and atk over the Cinder Warden's) and no ordinary move fells a full-HP member |
| `BINDER.sprite.frame` | 'archivore' | 'binder' | C2-sprites-boss's handoff |
| `BINDER.phases[1].sprite`, `[2].sprite` | none | 'binder_loose', 'binder_binding' | the handoff; see 6.3 for the ai.js line it still needs |

The curve after (Fact, `scale(floor)`): B1 hp 0.38 power 0.30; B10 1.74 / 3.57; B30 2.57 / 10.80; B60 1.91 / 15.72; B90 2.52 /
39.91; B99 2.59 / 45 (the cap). EXP pace (expMul) is C1-data's fit, unchanged: the arrival levels above land on the plan.

### src/data/cave/loot.js

| constant | before | after | why |
|---|---|---|---|
| red chest base | `rollItem` at the floor's item level | the base drawn at item level 2 at least (`BASE_ILVL_MIN`), the instance keeps the plan's item level | 4.2 |
| `EARLY_WEAPON_TYPES` (new) | any weapon base | sword 3, staff 3, spear 3, axe 1, bow 1 on B1 to B19 (`EARLY_WEAPON_FLOORS`), B6 to B19 with the engine's own slot weights | 4.3 |
| `CONSUMABLES_BY_BAND` 1 | potion 50, antidote 15, eye drops 15, echo herb 10, ether 10 | potion 42, ether 32, phoenix feather 14, echo herb 6, antidote 3, eye drops 3 | 4.1, 4.4 |
| band 2 | potion 30, hi-potion 20, ether 25, echo herb 15, feather 10 | potion 18, hi-potion 24, ether 32, hi-ether 10, feather 12, echo herb 4 | |
| band 3 | hi-potion 35, ether 20, hi-ether 10, salve 10, feather 15, echo 10 | hi-potion 40, ether 12, hi-ether 18, feather 5, salve 8, echo 10 | Feathers hoard (about 17 held by B40) |
| band 4 | hi-potion 35, hi-ether 20, feather 15, quench 15, echo 15 | hi-potion 40, hi-ether 18, feather 5, quench 10, echo 12, salve 6 | |
| band 5 | hi-potion 30, hi-ether 25, feather 20, quench 10, salve 15 | hi-potion 40, hi-ether 18, feather 5, quench 10, salve 10, echo 8 | |
| consumable rolls a chest (`CONSUMABLE_EXTRA`) | 1, a second at 35% | 1, a second at 60%, a third at 30% | the chests are the whole larder |
| one row (`CHEST_ROW_MAX`) | uncapped | at most four | C1's test, and a third Potion roll adds nothing |
| `LANDING_SUPPLY` (new) | | B10: 4 Potions, 3 Ethers, 1 Feather; B20-B30: 3 Hi-Potions, 3 Ethers, 2 Feathers; B40 on: 3 Hi-Potions, 2 Hi-Ethers | the landing's red chest is the Keepers' larder (plan 2.3 says one red chest; its contents are this pass's call) |
| `BOOKMARK_CHANCE` | 4 / 8 / 12% | unchanged | the plan's numbers already put a Bookmark in hand by B8 (median) |
| `RARITY_ANCHORS`, `redEquipChance`, gold | | unchanged | |

### Not changed, on purpose
The plan's item level formula and foe count, the EXP pace (C1-data's fit lands the plan's levels), the Bookmark odds, the rarity
anchors, the elite rates and mods. C1-data's tests (qa/cave/data_*) all pass unchanged on the new numbers.

## 6. The bot (qa/autoplay.py --cave, --cave-resume)

### 6.1 The route

`python qa/autoplay.py --cave 30 --seeds 10 --jobs 4 --speed 3` (each seed a child process with its own Chromium; `--device
phone` for the touch profile). Per seed: `LQ_DEBUG.newGameEp2` with the game seed, the library, up the mezzanine stair, onto the
trapdoor, Hollis's desk (Begin, Go down), then per floor with the real walk model (the floor rebuilt in Node from the reading's
seed by `qa/autoplay_grid.mjs --cave=<seed>`): every reachable foe by the generic battle handler (Auto at 2x), every reachable
chest (`--cave-chests cheap` for only short detours), the equip prompt answered Yes, upkeep by the real menu (a Feather, Mira's
Mend above a quarter of her MP, Potions, an Ether for Mira), Optimize every third floor, the stairs walked. At B30 (or the next
floor with a Bookmark) the Bookmark from Items, Key Items, "Close it". Then a second reading: Optimize equips the vault, B5 with
a vault unique worn. A wipe starts a new reading (at most three) on a fresh field (7.1). Reports: qa/cave/out/bot_<device>_s<N>.json
and .log, the table in bot_<device>_summary.md.

### 6.2 What it saw (Fact)

| seed | wipes (floor, reading) | readings | floors | fights | banked | blues kept | worn on B5 of the vault reading | game min / floor | wall s / floor | errors | softlocks |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | - | 2 | 33 | 135 | B30 | 3 | 3 of 3 | 5.76 | 135.0 | 0 | 0 |
| 2 | - | 2 | 33 | 132 | B30 | 3 | 3 of 3 | 4.96 | 116.2 | 0 | 0 |
| 3 | - | 2 | 33 | 135 | B30 | 3 | 3 of 3 | 5.08 | 119.5 | 0 | 0 |
| 4 | - | 2 | 33 | 134 | B30 | 3 | 3 of 3 | 5.93 | 137.3 | 0 | 0 |
| 5 | - | 2 | 33 | 134 | B30 | 2 | 2 of 2 | 2.97 | 66.0 | 0 | 0 |
| 6 | B7 (r1) | 3 | 39 | 158 | B30 | 3 | 3 of 3 | 4.65 | 108.6 | 0 | 0 |
| 7 | - | 2 | 33 | 134 | B30 | 3 | 3 of 3 | 4.54 | 107.0 | 0 | 0 |
| 8 | - | 2 | 33 | 135 | B30 | 4 | 4 of 4 | 4.8 | 112.9 | 0 | 0 |
| 9 | - | 2 | 33 | 135 | B30 | 3 | 3 of 3 | 4.38 | 101.4 | 0 | 0 |
| 10 | B16 (r1) | 3 | 48 | 195 | B30 | 3 | 3 of 3 | 3.9 | 89.8 | 0 | 0 |

Desktop, 10 seeds: all ok, 351 floors, 1427 fights, 2 wipes, 0 console errors, 0 softlocks; every seed banked on B30 and wore a vault unique on B5 of the next reading. Report: qa/cave/out/bot_desktop_summary.md.

Seed 5 is a rerun: its first run stopped on B23 when the bot's own Menu press met a chasing foe's battle (a harness timeout in `open_menu`, not a game error); the route now retries such errands once (`menu_safe`). Seeds 1 to 8 ran before two upkeep refinements (Ethers for Mira only, upkeep after a fight met on the way to a chest); 9 and 10 and the rerun after.

Inference on the numbers: every seed fought every placed foe (132 to 135 fights to B29) and arrived on the plan's curve (Lv 11 to
12 leaving B9, 16 to 17 at B20, 24 to 25 at B29: the simulator's numbers); the same reading seeds in the simulator find the same
blue chests on the same floors (seed 2: B11 Reading Hood, B16 Catalogue's Pen, B25 Rootbound Boots, both), which cross-checks the
floors, the chests and the pity rule end to end. The bot wipes more than the simulator by B30 (2 of 10 first readings against
about 1 in 10 expected from 300 simulated seeds); the sample is small, and starting fights as ambushes or answering the equip prompt with its first offer
change nothing in the simulator, so the open suspect is fights back to back with no upkeep between (two chasers in a row). The
earlier profiles say what matters most: opening only cheap chests (about half the larder) the bot wiped in 4 of 8 first readings
before B30, and without Mira's field heals in 2 of 4. Game minutes per floor (3.9 to 5.9) are engine time while the machine ran
4 to 6 browsers at once, so they include the bot's own pauses; an unloaded earlier run read 2 to 4 game minutes a floor to B10.

| seed | wipes (floor, reading) | readings | floors | fights | banked | blues kept | worn on B5 of the vault reading | game min / floor | wall s / floor | errors | softlocks |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | - | 2 | 33 | 135 | B30 | 3 | 3 of 3 | 2.77 | 61.5 | 0 | 0 |
| 2 | - | 2 | 33 | 135 | B30 | 3 | 3 of 3 | 2.85 | 63.9 | 0 | 0 |
| 3 | - | 2 | 33 | 135 | B30 | 3 | 3 of 3 | 2.82 | 63.0 | 0 | 0 |

Phone, 3 seeds: all ok, 99 floors, 405 fights, 0 wipes, 0 console errors, 0 softlocks; every seed banked on B30 and wore a vault unique on B5 of the next reading. Report: qa/cave/out/bot_phone_summary.md.

The phone seeds share the desktop seeds' readings (same game seeds): the same floors, the same three blue chests each.

`--cave-resume` (Fact): desktop (game seed 11) and phone (12): descend to B7 walking, a new tab on the same storage, the title offers "Resume the Deep Stacks (B7)", picked: B7 again at its arrival ([23, 5] and [30, 18]), the floor tag B7, the reading's seed kept; 0 console errors. Shots: qa/out/autoplay/desktop-cave-resume-s11-*-cave_title_resume.png and phone-cave-resume-s12-0019-cave_title_resume.png, -0020-cave_resumed_b7.png; reports qa/cave/out/bot_desktop_resume.json, bot_phone_resume.json.


### 6.3 The Binder's three looks (qa/cave/bot_binder_phases.py)

Fact: in a real headless battle (`LQ_DEBUG.battle('cave_binder')`, the pack forced on) the Binder draws from `bosses_battle`
(cave_bosses_battle merged in) with frame `binder`. The phase events the rules emit carry **no** `sprite` (`ai.js` archivore
`enterPhase` emits `{ type, actor, phase, id, name, text }`; the Nameless King's script forwards `sprite: p.sprite || null`).
With a page-only shim that adds the phase's `sprite` the way that one line would, the scene swaps to `binder_loose` at 70% and
`binder_binding` at 30% through the normal path (animator `ev_phase` -> `swapSprite` -> `resolveArt`). Shots:
qa/cave/out/bot_binder_desktop_phase1.png, _phase2.png, _phase3.png (and bot_binder_phone_*). The fix for the ai.js owner (C4):
in `src/battle/ai.js` `enterPhase` (the archivore's), emit `sprite: p.sprite || null` in the phase event. Note the swap op plays
the King's glass-shatter fx and sound (animator), which suits glass better than paper; C3-critic may want a page-burst variant.

## 7. Known gaps, for C3-critic and C4

Ordered by what a player meets first. None of these files is C3-sim-bot's; each item names the owner and the exact change.

1. **The second reading of a session finds the floors it already cleared empty** (Fact: `python qa/cave/bot_dungeon_gone.py`,
   qa/cave/out/bot_dungeon_gone.json: B1 of the second reading, 4 foes placed, 0 standing; with the fix below, 4 of 4; and the
   bot's vault readings, 36 floors with "N foes placed, 0 on arrival"). `field.js` keeps `dungeonGone` (map id -> defeated foe ids)
   for the life of the field scene, and the Stacks reuse the ids `cave_bN` / `foe_K` every reading, so after a bank, a wipe or a
   Quit the next reading in the same session has no foes (and no EXP) on those floors: the party stays level 1 into floors it
   cannot survive. Owner C2-world / C4: in `src/data/cave/world.js` `beginReading`, before the warp, drop the floors' entries:
   `const f = fieldOf(e); if (f && f.dungeonGone) for (const k of [...f.dungeonGone.keys()]) if (/^cave_b\d+$/.test(k)) f.dungeonGone.delete(k);`
   (`resumeReading` resets the field and is not affected). The bot starts a fresh field after a wipe to keep measuring; the vault
   reading after a bank keeps the bug visible.
2. **The generator refuses a few (seed, floor) pairs** (Fact): `buildFloor(318, 18)` throws "stair unreachable after dressing" and
   `buildFloor(503, 3)` "foe foe_2 unreachable" (2 in about 48,600 floors scanned: seeds 1 to 400 x 99 floors, 301 to 600 x 30).
   In the game the throw would come out of the stairs (world.js `beforeDoor` -> `prepareFloor`). Owner C1-gen / C4: gen.js
   should re-roll from a derived sub-seed on these two checks the way it does for the others; the sim censors such a run.
3. **The Binder's phase looks need one line in ai.js** (Fact, 6.3): the archivore `enterPhase` must emit `sprite: p.sprite || null`.
4. **Battle drops on B1 to B5 are always the lowest base** (Fact): the engine rolls them at the band zone's item level 1 and
   `rollBase` falls back to the slot's lowest base whatever the type (every weapon drop a Short Sword). Red chests are fixed here
   (`BASE_ILVL_MIN`); for drops, either the plan's item level starts at 2 (`min(16, 2 + floor/6)`, plan 6.1 and C1-data's
   pinned tests change) or `battle/loot.js rollBase` keeps the slot and type when the pool is empty. Also: an elite's drop rolls
   at its home zone's item level (`ZONE_LOOT[k.lootZone]`), not the floor's.
5. **Auto battle Defends until it dies** (Fact, traces): ai.js competentPolicy Defends when under 35% with no potion and no healer
   coming; with Mira down or dry and the bag empty, all three Defend every turn and the fight is lost slowly. Owner: the ai.js
   owner. Suggest: Defend only when a heal or a Feather is coming within two turns, else attack.
6. **Deep floors are long** (Inference, the model): 12 foes a floor from B80 at about 40 s a fight is 8 minutes a floor at 1x
   (plan 11 says 2 to 4). The bot measures 2 to 4 game minutes a floor at 2x battle speed to B30. Owners: the plan and C1-gen
   (`foeCount`, and foes.js `foesPerFloor` with it; the EXP pace refits itself): a cap of 8 would hold the floor near 5 minutes.
7. **Hoards** (Fact, the sim's bag): by B90 a careful party holds about 20 Feathers, 25 spare Bookmarks (lost on exit, plan 2.6),
   and dozens of Eye Drops and Antidotes from foe drops (enemies.js). Harmless; C3-critic should say whether the bag feels cluttered.
8. **Episode 3 switch** (Inference): `BAND_ADJUST` for bands 4 and 5 is tuned to the fallback court pools. When `EP3_LIVE` flips,
   bands 4 and 5 become cinder and forge pools and the curve refits; re-run `node tools/sim/simulate.mjs --cave --check` then.
9. **Stale records**: qa/cave/out/cave_sanity.md (C1-data's) shows the old tuning (`node qa/cave/out/cave_sanity.mjs --n 60
   --binder` rewrites it); the foes.js header now carries the new table.
10. **The B100 Quill chest and the plaque** (Reported, C2-story-ui): unreachable after `clear()` warps out; no plaque sign on B100.

What C3-critic should look at first: item 1 (a player's second reading in one sitting is broken), then B7 to B21 for a human
player (the bot wiped on B7 and B16 in 2 of 10 careful readings, and in 4 of 8 when it skipped the far chests, 6.2: the larder
is the difficulty), then the length of a deep floor.
