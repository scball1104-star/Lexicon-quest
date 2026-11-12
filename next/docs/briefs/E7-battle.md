# E7-battle: Rime, Call, the roster, items, balance, as pack modules (wave 7a, beside E7-pack and E7-story)

## Inputs (read first, in this order)

The repo's `AGENTS.md`, `docs/briefs/COMMON.md`, `DESIGN.md` section 7, `docs/story/EPISODE7.md` (Acts II, IV and V and
section 3), `docs/EPISODE7_PLAN.md` sections 0.1, 6, 7 and 13.2 (your contract), `docs/BATTLE.md` (sections 13 and 14
above all: 13.8 and 14.2 for the `keep` bridge, `push()` and `SKILL_GATE`; 14.6 for the house rule that attack-only wins 0%
against every main boss), `docs/PLAYTEST_REVIEW_8.md` items 1, 4, 5, 6 and 10, `docs/EPISODE2_PLAN.md` 6.8 (calibration),
`src/battle/rules.js` (`RULE_EXT` and its `start` and `afterAction` call points, `delayUnit`, `defending`, the charge
rule), `src/battle/ai.js` (`SCRIPTS`, `POLICY_EXT`, `special()`), and the Episode 6 pack data and sim you are copying
(`src/data/ep6/gale.js`, `enemies.js`, `encounters.js`, `items.js`, `skills.js`, `ai.js`, `tools/sim/ep6.mjs`).

## Owned paths

`src/data/ep7/{enemies,encounters,items,loot,shops,skills,ai,rime}.js`, `tools/sim/ep7.mjs`, one line in
`tools/sim/simulate.mjs` (the `EP7` attach line beside `EP6`'s; that file is CRLF and kept so), `qa/battle/ep7_*`,
`docs/BATTLE.md` (an "Episode 7" section). Not the core files, not the battle scene, story text or maps.

## Outputs (items, in order)

1. **Enemies, encounters, zones** of plan 6.1 and 6.2 in `enemies.js` and `encounters.js`: every foe with `cold: true` and
   its cold moves' Rime, `EP7_ZONE_ORDER`, `EP7_MAPS_LISTED = false` (E7-maps-b flips it), zones kept out of
   `Object.keys(ZONES)` with the non-enumerable pattern. Episodes 1 to 6 untouched.
2. **Rime** in `rime.js` (pure, never draws from `ctx.R`), pushed onto `RULE_EXT` (`start`, `afterAction`): Rime on party
   members only (0 to 3), cold moves adding their Rime to each member hit, Frozen at 3 (`push(u, 1.0)`, x1.4 damage taken
   until it acts, Rime to 0), Defend shedding all and Warm until its next turn, Ember Tea shedding 1 from every ally, the
   pinned Farewell and Borrowed Light (`holdForHero`: the owner's turn held until the hero has acted after the pin, the
   `holdForBram` pattern), Stilled (no turn, untargetable by foes, targetable by allies; back after 2 party turns, on Call,
   or when its source is Broken). Events the scene draws: `rime` { reason: start }, `rime_add` { target, rime }, `frozen` {
   target }, `warm` { target, on }, `farewell` { source, target, pinned, skill } plus a `telegraph` with `farewell: true`,
   `farewell_broken` { source, target, reason: 'call' | 'break' | 'gone' }, `farewell_land` { source, target },
   `stilled` { target, on }, `stilled_end` { target, reason: 'call' | 'time' | 'break' }. **First** check how a cold move's
   targets reach the rule: the move's effect `{ keep: 'rime', rime: n }` on the bridge, or `afterAction` if it sees the
   targets; use whichever does and say which. If Stilled cannot be built from `push()` and an existing untargetable rule,
   use plan 14 assumption 3's fallback and say so.
3. **Call** (`call_name`, display "Call", the hero, 12 MP, `target: 'ally'`: one party member other than the hero, standing
   or Stilled; rank 80) in `skills.js` (merged into `SKILLS` and the hero's `CHARACTER_SKILLS`), `learn: { flag:
   'call_learned' }`, fallback level 29, reaching `rime.js` through `{ keep: 'rime', rime: 'call' }`: sheds all Rime, Warm,
   `push(u, -0.25)` clamped, breaks a pin on that ally (its owner `push(owner, 1.0)`), returns a Stilled ally at once.
   **Ember Tea** (`ember_tea`). The `farewell` flag on `farewell` and `borrowed_light` (the `SIGNATURE_TECHS` entry is
   E7-scene-ui's). Call gated in battles with no cold foe ("No cold to call through.") through Episode 6's `SKILL_GATE`; confirm
   Turn the Sky's and Anchor's gates hold in every Rime battle.
4. **AI** in `ai.js`, registered onto `SCRIPTS`: `pale_lantern` (6.4: Pale Flame, Lamplight Chill, Borrowed Light pinned on
   the non-hero member with the most Rime, the 8% heal on landing, two Snow Wisps at 50%) and `white_phantom` (6.5: three
   phases, HP locks at 68% and 33%, Farewell pinned in every phase and never on the hero, the Closed Gate's Shut on the hero
   and the Lost Letter's Mend and Cold Ink, the ward at 20% with its floor, the thaw with Broken and +25 Fury, Thawlight's
   Haste and Stillheart Blizzard). `enterPhase` must forward `sprite` per phase (the three looks). Answer on a pin's owner is
   a plain hit and says "A farewell is not a decree." `POLICY_EXT` entries per 6.3's Auto rules.
5. **The boss is never slowed by its own rule** (PLAYTEST_REVIEW_8 item 1): no foe ever holds Rime; assert it, and assert
   the Lantern and the Phantom act at least once every two party rounds.
   **Tougher, not longer (Scott, 2026-11-11; plan 6.4 to 6.6):** the Lantern's careful rounds no higher than the Gale
   Engine's 8.88 and the Phantom's no higher than the Storm Scribe's 14.55, each losing more HP than its Episode 6
   counterpart (13%, 17%), careful win 85%+; harder by what a boss does each round, never by more HP. Add the
   `toughNotLong` check and report its three numbers per boss.
6. **Items** (plan 7): `ember_tea`, the key items of 2.3, `white_road_letter`'s second desc (`descAfter`, by flag, from this
   pack: never an `ep6` file), tier 13 and 14 bases, the six uniques (both Nox gifts), the Winterwatch set, affix tier 9,
   rare names through `RARE_NAME_EXT`, `ZONE_LOOT`, `BOSS_LOOT.pale_lantern` and `.white_phantom`, the three shops,
   `startFury` from `hearth_lit`. Grep every new id against `src/`, every `assets/tiles/*.json` and every
   `assets/*manifest.json` first (plan 2 lists the taken ones), and check every stat a unique names exists as a party stat.
7. **Simulator** `tools/sim/ep7.mjs` and one line in `simulate.mjs` (`EPISODES[7]`): zones, `LOADOUTS`, `TARGETS` (F3 the
   tightest ordinary floor; attack-only 0% for the Lantern and the Phantom: the house rule), `SUITE_LEVELS_EP7`,
   `BOSS_LEVELS_EP7` (the Phantom at 30 and 31), Rime in every Episode 7 battle, policies that Call, Defend for Rime and use
   Tea. The new checks of plan 6.6: **`economy7`** (the gold line of 7.6, binding: tune chest and foe gold first, prices only
   if a price leaves its tier), `rimeless`, `noFoeRime`, `callShare`, and the EXP margin under Lv 31 with elites counted.
   Tune with plan 6.6's knobs in order until `--check` prints "All targets met" for all seven episodes; `--cave --check` and
   `--tier 1 --check` unchanged. Record the table in BATTLE.md.

## Done when

`node qa/run.mjs battle` is green; `simulate.mjs --check` prints "All targets met" for all seven episodes with the four new
checks passing; `--trace pale_lantern` and `--trace white_phantom` read once by eye show Rime building and shed, a Frozen
turn, a pinned Farewell, a Call answer, a Stilled ally Called back, the ward and phase 3's Blizzard; the BATTLE.md section is
written.

## Tests to run

`node qa/run.mjs battle`; `node tools/sim/simulate.mjs --check` (timeout it; prefer `--zones` while tuning, one full
`--check` at the end); `--cave --check`; `--tier 1 --check`. Tests you add (`qa/battle/ep7_*`): Rime is absent in every
battle with no cold foe (Episodes 1 to 6 bit-identical: replay one Episode 5 and one Episode 6 boss); a cold move adds the
right Rime; Frozen at 3; Defend and Ember Tea shed; Call sheds, hastens and breaks a pin; a pin lands without Call and fails
with it; `holdForHero`; Stilled and its three ends; the Farewell never targets the hero; no foe holds Rime; the gold line;
`rime.js` never calls `ctx.R`.

## Traps

- **A new encounter field goes in BOTH `src/data/encounters.js` `rollEncounter` AND `src/battle/rules.js`**, or it is
  silently dropped. The plan adds none: Rime reads foe data. Keep it that way, or touch both (and those are hot files: ask
  first).
- **Boss phase changes forward `sprite` in `ai.js` `enterPhase`**; drop it and the Phantom never changes look.
- **Mira's tips are a contract.** If tuning needs a different lever, keep the lever and report a story question.
- **The Engine lesson.** A foe that owns the battle rule must not be its main victim; here no foe is touched by Rime at all.
- **The gold lesson.** Gold that does not buy the plan's two pieces is a fail of `economy7`, not a note (PLAYTEST_REVIEW_8
  item 4).
- **The level lesson.** Count elites at their real rate when you report the margin (PLAYTEST_REVIEW_8 item 6). Use
  `--all-fights` readings when comparing with any autoplay level (BATTLE 13.7).
- **A party skill aimed at an ally must confirm from the menu.** Bots never see a menu bug (`LQ_DEBUG.battleAct` closes the
  menu itself). You do not own `menu.js`; name Call's target kind and the Stilled case in your report so E7-scene-ui's
  real-key tests cover both.
- Pure modules stay pure. House rules: no git; LF endings (count CR bytes before and after: zero; `simulate.mjs` stays CRLF
  as it is); no em dashes; stay in owned paths; bound every command; rerun a flaky `qa/battle/sim.test.mjs` alone before
  treating it as real.

## Report (under 400 words)

Numbers that moved from the plan and why, how cold moves reach the rule and how Stilled is built, the events and payloads
the scene must draw, Auto behavior (how often the competent policy breaks a Farewell with Call), the sim table, the gold
line's two margins and the EXP margin under Lv 31, test counts.
