# E6-battle: the Gale, Anchor, the roster, items, balance, as pack modules (wave 6a, beside E6-pack and E6-story)

## Inputs (read first, in this order)

The repo's `AGENTS.md`, `docs/briefs/COMMON.md`, `DESIGN.md` section 7, `docs/story/EPISODE6.md` (Acts II, IV and V and
section 3), `docs/EPISODE6_PLAN.md` sections 0.1, 6, 7 and 13.2 (your contract), `docs/BATTLE.md` (sections 12 and 13 above
all, 13.8 for the `keep` bridge), `docs/EPISODE2_PLAN.md` 6.8 (calibration), `src/battle/rules.js` (`RULE_EXT` and its
`start` and `afterAction` call points, `delayUnit`, `defending`, `cover`, the charge rule), `src/battle/ai.js` (`SCRIPTS`,
`POLICY_EXT`, `special()`), and the Episode 5 pack data and sim you are copying (`src/data/ep5/sky.js`, `enemies.js`,
`encounters.js`, `items.js`, `skills.js`, `ai.js`, `tools/sim/ep5.mjs`).

## Owned paths

`src/data/ep6/{enemies,encounters,items,loot,shops,skills,ai,gale}.js`, `tools/sim/ep6.mjs`, one line in
`tools/sim/simulate.mjs` (the `EP6` attach line beside `EP5`'s), `qa/battle/ep6_*`, `docs/BATTLE.md` (an "Episode 6"
section). Not the core files, not the battle scene, story text or maps.

## Outputs (items, in order)

1. **Enemies, encounters, zones** of plan 6.1 and 6.2 in `enemies.js` and `encounters.js`: every foe with its `wind` field
   (`aloft` | `ground`), `EP6_ZONE_ORDER`, `EP6_MAPS_LISTED = false` (E6-maps-b flips it), zones kept out of
   `Object.keys(ZONES)` with the non-enumerable pattern, and `GALE_START` (`e6a_first`: Gust in 3). Episodes 1 to 5
   untouched.
2. **The Gale** in `gale.js` (pure, never draws from `ctx.R`), pushed onto `RULE_EXT` (`start`, `afterAction`): the Gust
   every `GUST_EVERY` (5) actions, Aloft foes riding it (`delayUnit(u, -GUST_PUSH)`), every other unit blown back unless
   Braced (`u.defending`, a Ballast brace) or Anchored (who catch it instead), Broken Aloft foes Grounded, the pinned
   rewrite and `holdForBram` (the Gust holds until Bram has had a turn after a pin: the `holdForMira` pattern). Events the
   scene draws: `gale` { gustIn, every, reason }, `gust` { pushed: [{ target, amount }] }, `aloft` { target, on },
   `anchored` { targets, on }, `rewrite` { source, pinned, gustIn }, `rewrite_broken` { source, reason: 'anchor' | 'break' |
   'gone' }, `rewrite_land` { source }. **First** check `delayUnit` with a negative fraction against CTB's invariants (a
   unit's `next` never before now; the timeline order stable): if it breaks one, use the fallback of plan 6.3 and say so.
3. **Anchor** (`anchor_line`, display "Anchor", Bram, 14 MP, `target: 'none'`, rank 80) in `skills.js` (merged into
   `SKILLS` and Bram's `CHARACTER_SKILLS`), `learn: { flag: 'anchor_learned' }`, fallback level 26, reaching `gale.js`
   through `{ keep: 'gale' }` (Episode 5's bridge, BATTLE 13.8); **Ballast Stone** (`ballast_stone`). The `rewrite` flag
   on `rewrite_course` and `full_blast` (the `SIGNATURE_TECHS` entry is E6-scene-ui's).
4. **AI** in `ai.js`, registered onto `SCRIPTS`: `gale_engine` (6.4: Bellows shortens the Gust to 3, Full Blast pinned to
   the Gust, the two Gale Sprites at 50%) and `scribe` (6.5: three phases, HP locks at 68% and 33%, the Rewrite pinned at
   exactly 2 actions out, the Beacon's `cover` and the Compass's Spin and Misdirect, the ward at 20% with its floor, the
   tear with +25 Fury, the True Sky Chart's Haste and Thunderhead). `enterPhase` must forward `sprite` per phase (the
   three looks). The Rewrite must not be voided by Answer or Turn the Sky; each message says why. `POLICY_EXT` entries per
   6.3's Auto rules.
5. **Turn the Sky with no sky.** Check what Mira's Turn the Sky does today in a battle with no sky (an Episode 1 to 4
   revisit, the cave, and now Episode 6). If it spends her turn and MP for nothing, disable it in every battle without a sky
   with the reason "No sky to turn." from inside the pack (say exactly how; if it needs a core line, report it, do not add
   it: that is E6-scene-ui's seam to pay).
6. **Items** (plan 7): `ballast_stone`, the nine key items, tier 11 and 12 bases, the eight uniques (both Aeris gifts), the
   Skyhands set, affix tier 8, rare names through `RARE_NAME_EXT`, `ZONE_LOOT`, `BOSS_LOOT.gale_engine` and `.scribe`, the
   three shops, `startFury` from `beacon_lit`. Grep every new id against `src/` first (plan 2 lists the taken ones), and
   check every stat a unique names exists as a party stat (Episode 5's "evade" had no party rule).
7. **Simulator** `tools/sim/ep6.mjs` and one line in `simulate.mjs` (`EPISODES[6]`): zones, `LOADOUTS`, `TARGETS` (F3 the
   tightest ordinary floor), `SUITE_LEVELS_EP6`, `BOSS_LEVELS_EP6` (the Scribe at 27 and 28), the Gale in every Episode 6
   battle, policies that Anchor, brace and use Ballast. Tune with plan 6.6's knobs in order until `--check` prints "All
   targets met" for all six episodes; `--cave --check` and `--tier 1 --check` unchanged. The Scribe must be met at Lv 27 in
   the level table, and 100% of fights must stay under 16,887 EXP before the Scribe: report the margin. Record the table in
   BATTLE.md.

## Done when

`node qa/run.mjs battle` is green; `simulate.mjs --check` prints "All targets met" for all six episodes; `--trace
gale_engine` and `--trace scribe` read once by eye show the Gusts, a pinned rewrite, an Anchor answer, the ward and phase
3's Thunderhead; the BATTLE.md section is written.

## Tests to run

`node qa/run.mjs battle`; `node tools/sim/simulate.mjs --check` (timeout it; prefer `--zones` while tuning, one full
`--check` at the end); `--cave --check`; `--tier 1 --check`. Tests you add (`qa/battle/ep6_*`): the Gale is absent in every
battle with no wind foe (Episodes 1 to 5 bit-identical); a Gust pushes the right units by the right amounts; Defend and
Ballast brace; Anchor catches; a pinned Rewrite lands without Anchor and fails with it; `holdForBram`; Answer and Turn the
Sky do nothing to a Rewrite and say why; `gale.js` never calls `ctx.R`.

## Traps

- **A new encounter field goes in BOTH `src/data/encounters.js` `rollEncounter` AND `src/battle/rules.js`**, or it is
  silently dropped (a slime once lost its `hp` that way). The plan adds none: the Gale reads foe data and the pack's
  `GALE_START` table. Keep it that way, or touch both (and those are hot files: ask first).
- **Boss phase changes forward `sprite` in `ai.js` `enterPhase`**; drop it and the Scribe never changes look.
- **Bram's tips are a contract.** If tuning needs a different lever, keep the lever and report a story question.
- **Reload-revived floor foes make bot levels look easy** (BATTLE 13.7): when you compare with any autoplay reading, use
  `--all-fights`, which hunts each placed foe once.
- **A party skill with `target: 'none'` must confirm straight from the menu.** Bots never see a menu bug
  (`LQ_DEBUG.battleAct` closes the menu itself). You do not own `menu.js`; name the skill's target kind in your report so
  E6-scene-ui's real-key test covers it.
- Pure modules stay pure. House rules: no git; LF endings (count CR bytes before and after: zero); no em dashes; stay in
  owned paths; bound every command; rerun a flaky `qa/battle/sim.test.mjs` alone before treating it as real.

## Report (under 400 words)

Numbers that moved from the plan and why, the negative-delay check's result, the events and payloads the scene must draw,
Auto behavior (how often the competent policy breaks a rewrite with Anchor), what Turn the Sky does with no sky and what you
did, test counts, the sim table and the EXP margin under Lv 28.
