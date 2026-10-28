# Fine Print: the post-credits tier (tier_1)

Built 2026-10-28 by H7-hard-road from `docs/HARD_ROAD.md` and Scott's answers (2026-10-27): carry the character, one tier,
the name **Fine Print** ("For the name question: I think I like Fine Print"). Unpublished: it ships with the overhaul only on
Scott's yes. Evidence tags: **Fact** read in code or run on 10/28, **Inference** a judgment (the check is named).

## For the player

- **Unlock.** Once any save holds a finished Episode 2 (`ep2_complete`; `ep3_complete` once Episode 3 ships), the title shows
  a row **Fine Print** under Continue, with a note: "Episode 1 again with a finished party. Stronger foes, better pay. Your
  record stays safe."
- **The ask.** "Carry which record into Fine Print?" lists every finished record (name, level, place), newest first, and Back.
  The terms follow: the hero starts Episode 1 again with levels, gear, the bag and gold; the story and chests start over; foes
  are stronger and pay more; and where the run saves. **Back** is the default and the cancel answer; **Begin** starts it.
  The run never replaces a save: it takes the autosave if that is empty, else the first free record, else it refuses
  (the Episode 3 quick start's rule, `episodes.js pickRunSlot`).
- **What carries** (Fact, `src/data/tier/tier.js carryRecord`): the hero, Mira and Bram with their levels, EXP, mastery and
  worn gear; the gear in the bag; the bag's consumables; gold; the bestiary; the vows kept (marked as kept before the tier,
  so this lap's vows pay again). **What starts over:** every story flag (the cold open plays again), key items, opened chests,
  counters, a vow in progress. Mira and Bram wait in `reserve` and join at their own scenes, as they always do.
- **The first fight.** The yard slime in the bakery yard, against a Lv 13 hero alone: it is lifted to the hero (below) and
  takes a few honest rounds instead of one swing.
- **The Deep Stacks ignore Fine Print.** A cave battle is the base game's, with the Stacks' own curve, on a tier save too.
- **Fine Print never ends.** A finished Fine Print run is a finished record and can be carried into Fine Print again.

## The five levers (Fact: the numbers in `TIER_TABLE[1]`, pinned by `qa/tier/levers.test.mjs`)

| Lever | Off the tier | On Fine Print |
|---|---|---|
| Foes (every foe, boss and add) | the base record | lifted to the carried party (below), then **HP x1.6, ATK and MAG x1.35, SPD +1** |
| EXP | x1 | **x1.5** (battle gold x1.5 with it) |
| Drop item level | the zone's | **+6, capped at 16** (elite and boss drops too) |
| Rarity | normal 70/25/5, elite 70/30 magic/rare, boss rare 100; no legendaries | **normal 50/35/15**, **elite magic 35 / rare 60 / legendary 5**, **boss rare 85 / legendary 15** |
| Shops | the base stock | **tier 4 and 5 at the Willowmere Forge, tier 5 and 6 at the Silverglass Smithy**, at 1.25x list |

**Why the lift** (Fact, `tools/sim`, 10/28). HARD_ROAD's table was written as if the party met each foe at the foe's own
level. A carried party is Lv 13 with tier 4 gear, and at HP x1.6 alone Episode 1 lasts 1.4 to 3.9 rounds a fight (the
Archivore 6.9). So each foe is first raised to the party that meets it: a foe of level L is met at
`levelForExp(3,335 + 1.5 x expForLevel(L))` (Lv 14 in the valley, Lv 16 at the Archivore, Lv 19 at the King), and its stats are
multiplied along lines fitted to the game's own foes: HP to five levels under that (so the x1.6 lands the fights in DESIGN 7's
bands), the hit at that level, and the tempo (SPD) along the party's own speed growth so foes keep the base game's pace. DEF,
SPR, shields and weaknesses stay the foe's own. Then the x1.6, x1.35 and +1. Twenty-seven encounters carry a small correction
(`TIER_TABLE[1].terms`, HP or hit x0.66 to x1.57) the way `encounters.js` tunes a group with `hp` and `power`.

**The record it is written for** is the simulator's Episode 2 finish (3,335 EXP, Lv 13; `qa/tier` pins the two). A carried
completionist (Lv 14 or 15) finds Fine Print a little softer. **Inference:** when Episode 3 ships and the unlock moves to
`ep3_complete` (a Lv 17 or 18 record), `carryExp` must move to the simulator's Episode 3 finish and the terms re-checked
(`node tools/sim/simulate.mjs --tier 1 --check`).

## Legendaries

The twelve placed legendaries (Lanternheart, The First Quill, Pilgrim's Reach, Thornwake, Mirrorguard Mail, Twinfold Charm,
Kept Promise, Hollowcrown, First Bell Hammer, Tempered Lexicon Blade, Ember Heart, Updraft Charm) become rollable on Fine Print,
each only at or above its own item level, newer ones likelier. Six more exist only here (`src/data/tier/legendaries.js`):

| Name | Slot | Item level | Stats | Lore |
|---|---|---|---|---|
| Codicil | spear | 8 | ATK 25, SPD 1, crit 5, Fury 10 | The line added after the will was sealed. It always has the last word. |
| Marginalia | staff | 10 | ATK 8, MAG 24, SPR 6, MP 14, healing 15 | Every margin is full of small, careful notes. Someone read all of it. |
| Errata | bow | 11 | ATK 28, SPD 1, crit 9, LUK 4 | A list of corrections, strung as a bow. It seldom misses twice. |
| Countersign | sword | 12 | ATK 33, DEF 3, crit 6, life steal 6 | Signed twice, once by the smith and once by you. It keeps both. |
| Strikethrough | axe | 13 | ATK 38, SPD -1, crit 8, Fury 15 | One line through a word, and it is gone. Use it on foes, never on names. |
| Witness Seal | charm | 14 | DEF 4, SPR 6, HP 30, ink resist 20, Silence resist 50 | Pressed into the wax beside your name. It swears you were there. |

The six names are the designer's, open to Scott's veto (one edit each in `legendaries.js`).

## For agents: where it lives

- **The pack** `src/data/tier/` (`PACKS.tier` in `src/game/packs.js`; not precached, runtime-cached like x1, x2 and cave):
  `tier.js` (TIER_TABLE, tierOf, the lift, the foe and drop hooks, carryRecord, tierRecords), `legendaries.js`, `text.js`
  (`TIER`, every player-facing string), `title.js` (the row, the ask, the start), `index.js` (register: legendaries into
  UNIQUES and ITEMS, the tier_1 rows into SHOPS, `globalThis.LQ_TIER = { foe, drops, title }`). `live.js` is the precached
  switch. Wanted by a `tier_1` game; the title loads it when a record holds `ep2_complete`.
- **The shell seams**, one guarded line each, all a no-op without the pack:
  `battle/rules.js makeEnemyUnit` (LQ_TIER.foe), `battle/loot.js rollBattleDrops` (LQ_TIER.drops),
  `scenes/title.js enter` (ensurePack('tier') then LQ_TIER.title), `game/state.js addMember` (a reserve member joins),
  `game/packs.js` (the PACKS row). Offline with the pack never fetched, a tier save plays base numbers (Inference: rare; the
  pack is warmed by the title watcher and runtime-cached).
- **Proof:** `node tools/sim/simulate.mjs --tier 1 --check` (tools/sim/tier.mjs), `python qa/autoplay.py --tier 1
  [--device phone]`, `node qa/run.mjs tier`, `python qa/tier/title_shots.py` (PNGs in qa/out/tier).

## Known gaps

- The Ledger of Names on a Fine Print run counts this lap's names (it reads story flags, which reset). The carried record
  keeps its own Ledger, and the title counter shows the best slot. Carrying it into the run needs a one-line read in
  `ui/screens/journal.js` (not this agent's file).
- Chests keep their base tables and item levels; only battle drops follow the tier.
- Nothing on the field or the load screen marks a save as Fine Print yet.
