# E5-battle: the Turning Sky, Turn the Sky, the roster, items, balance, as pack modules (wave 5a, beside E5-pack and E5-story)

Read `docs/briefs/COMMON.md`, `DESIGN.md` section 7, `docs/story/EPISODE5.md` (Acts II, V and VI and section 3),
`docs/EPISODE5_PLAN.md` sections 0.1, 6, 7 and 13.2 seam 4 (your contract), `docs/BATTLE.md`, `docs/EPISODE2_PLAN.md`
6.8 (calibration), `src/battle/rules.js` (the type check, `addMod`, `endTurn`, the Heat code as a model of a pack-driven
rule), `src/battle/ai.js` (`SCRIPTS`, `POLICY_EXT`, the Paper Regent script), and the Episode 4 pack data and sim
(`src/data/ep4/enemies.js`, `encounters.js`, `items.js`, `skills.js`, `ai.js`, `tools/sim/ep4.mjs`).

## Items, in order

1. **Enemies, encounters, zones** of plan 6.1 and 6.2 in `src/data/ep5/enemies.js` and `encounters.js`: every foe with
   its `sky` side, `EP5_ZONE_ORDER`, `EP5_MAPS_LISTED = false` (E5-maps-b flips it), zones kept out of `Object.keys(ZONES)`
   with the non-enumerable pattern, and `SKY_START` (`e5s_first`: Night, Turn in 4). Episodes 1 to 4 untouched.
2. **The Turning Sky** in `src/data/ep5/sky.js` (pure), registered on E5-pack's `RULE_EXT`: the sky and its start (from
   the field hour: `sky.js` exports `setFieldHour(h)` and keeps the value; E5-world's field code calls it, the sim sets it
   per zone; Day if unset), the Turn every 6 actions,
   Exposed (every hit a weakness hit for shields and damage, never learned) and Ascendant (+20% ATK and MAG through
   `addMod`), the turn and broken carry-over rules, and events the scene draws: `sky` { sky, turnIn }, `sky_turn` { sky },
   `exposed` { target, on }, `foretell` { source, target, pinned }, `foretell_broken` { source }. If E5-pack's seam is not
   in yet, write and unit-test `sky.js` against a fake ctx and rerun when E5-pack reports.
3. **Turn the Sky** (`turn_sky`, plan 6.3) in `skills.js` (merged into `SKILLS`), `learn: { flag: 'sky_learned' }`,
   fallback level 22; **Hourglass Sand** (`hourglass_sand`). The `SIGNATURE_TECHS` entry is E5-scene-ui's; you name the
   flag (`foretold`) on `last_prophecy`.
4. **AI** in `src/data/ep5/ai.js`, registered onto `SCRIPTS`: `mirage_knight` (6.4: Mirror Turn on natural Turns, Horizon
   Cleave every 4th turn, the double at 50%) and `oracle` (6.5: three phases, HP locks at 72% and 34%, the Last Prophecy
   pinned to the Turn, the Futures and the Veil, the Veil's tear with +25 Fury, Mirror of the Sky, the Sandstorm). The
   Last Prophecy must not be voided by Answer; its message says why. `POLICY_EXT` entries per 6.3's Auto rules.
5. **Items** (plan 7): `hourglass_sand`, the eight key items, tier 9 and 10 bases, uniques (both Sel gifts), the Nomad
   set, affix tier 7, rare names through `RARE_NAME_EXT`, `ZONE_LOOT`, `BOSS_LOOT.mirage_knight` and `.oracle`, the three
   shops, `startFury` from `moonwell_woken`. Grep every new id against `src/` first (plan 2 lists the taken ones).
6. **Simulator** `tools/sim/ep5.mjs` and one line in `simulate.mjs` (`EPISODES[5]`): zones, `LOADOUTS`, `TARGETS` (F3 the
   tightest ordinary floor), the sky in every Episode 5 battle, policies that turn the sky and use Hourglass Sand. Tune
   with plan 6.6's knobs in order until `--check` prints "All targets met" for all five episodes; `--cave --check` and
   `--tier 1 --check` unchanged. The Oracle must be met at Lv 24 in the level table. Record the table in BATTLE.md.

## Rules

- Owned paths: plan 11.1, row E5-battle. Not the core files, not the battle scene, story text or maps.
- Pure modules stay pure. No git, no em dashes, bounded commands (the sim gets a timeout; prefer `--zones` while tuning,
  one full `--check` at the end).
- Mira's tips are a contract: "It turns its shield to the sky. Turn the sky on it." and "When it reads a star, I turn the
  sky before it does." If tuning needs a different lever, keep the lever and report a story question; do not change the
  data so the tip lies (PLAYTEST_REVIEW_6 item 8).
- Verify: `node qa/run.mjs battle`; `node tools/sim/simulate.mjs --check`; `--trace mirage_knight` and `--trace oracle`
  read once by eye for the Turns, the pinned prophecy, a Turn the Sky answer, the Veil and phase 3's side changes.
- Report under 400 words: numbers that moved from the plan and why, the events and payloads the scene must draw, Auto
  behavior (how often the competent policy breaks a prophecy), test counts, the sim table.
