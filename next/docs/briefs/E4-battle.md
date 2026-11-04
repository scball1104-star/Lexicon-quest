# E4-battle: Decrees, Answer, the roster, items, balance, as pack modules (wave 4a, beside E4-pack and E4-story)

Read `docs/briefs/COMMON.md`, `DESIGN.md`, `docs/story/EPISODE4.md` (Act V and section 3), `docs/EPISODE4_PLAN.md`
sections 6, 7 and 13.2 seams 6 and 7 (your contract), `docs/BATTLE.md`, `docs/EPISODE2_PLAN.md` 6.8 (calibration),
the Heat code in `src/battle/rules.js` and the Cinder Warden script in `src/battle/ai.js`, and `src/data/x1/enemies.js`,
`encounters.js`, `items.js` with `tools/sim/x1.mjs` (pack data and the sim registering a pack).

## Items, in order

1. **Enemies, encounters, zones** of plan 6.1 and 6.2 in `src/data/ep4/enemies.js` and `encounters.js`:
   `EP4_ZONE_ORDER`, `EP4_MAPS_LISTED = false` (E4-maps-b flips it), zones kept out of `Object.keys(ZONES)` with the
   non-enumerable pattern. Episodes 1 to 3 orders and targets untouched.
2. **Decrees** (plan 6.3) as data on the Heat counter: `heat: { max, step, flare, quench: 'fire', word: 'Voided!',
   sfx: 'decree_void' }`, Stamp as the Stoke move renamed. E4-pack adds the two `rules.js` lines (seam 6) in the same
   wave: write your data against them, and if they are not in yet, stub your tests and rerun when E4-pack reports.
3. **Answer** (`answer`, plan 6.5) in `skills.js` (merged into `SKILLS`), `learn: { flag: 'hero_signed' }`, fallback
   level 19; the void, the Break when something was pending, the Nameless guard to the hero's next turn, the light hit
   otherwise. Use the exported `quench` and break helpers; if a rules hook is truly missing, say exactly which line in
   your report (E4-pack or E4-integrate adds it with a trim).
4. **AI** in `src/data/ep4/ai.js`, registered onto the exported `SCRIPTS`: `barrister` (6.4: Stamp every turn,
   Objection at 3, the witness at 50%) and `paper_regent` (6.5: three phases, the writs, the ward, HP locks at 70% and
   31%, Flood Decree at 3 Seals, Strike from the Roll every 3rd turn in phase 3 on the hero). `POLICY_EXT` entries so
   Auto voids at 2 Seals and the hero Answers a pending Strike.
5. **Items** (plan 7): `lamp_oil`, the six key items, tier 7 and 8 bases, uniques (both Lyra gifts), the Tidewalker
   set, affix tier 6, rare names, `ZONE_LOOT`, `BOSS_LOOT.barrister` and `.paper_regent`, the shops, `startFury` from
   `council_records`. Grep every new id against `src/` first (plan 2: `countersign`, `witness_seal` and `last_decree`
   are taken).
6. **Simulator** `tools/sim/ep4.mjs` and one line in `simulate.mjs` (`EPISODES[4]`): zones, `LOADOUTS`, `TARGETS`
   (Keep F3 the tightest ordinary floor), policies that void and Answer. Tune until `--check` prints "All targets met"
   for all four episodes; `--cave --check` and `--tier 1 --check` unchanged. Record the table in BATTLE.md.

## Rules

- Owned paths: plan 11.1, row E4-battle. Not the core data files, not the battle scene, story text or maps.
- Pure modules stay pure. No git, no em dashes, bounded commands (the sim gets a timeout; prefer `--zones` while tuning,
  one full `--check` at the end).
- Verify: `node qa/run.mjs battle`; `node tools/sim/simulate.mjs --check`; `--trace barrister` and `--trace
  paper_regent` read once by eye for phase flow, telegraph texts and Answer outcomes.
- Report under 400 words: numbers that moved from the plan and why, events the scene must draw (names and payloads:
  the seal pips, the void, the Strike telegraph, Answer), Auto behavior, test counts, the sim table.
