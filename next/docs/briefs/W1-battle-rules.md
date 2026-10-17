# W1-battle-rules: pure battle logic, game data, balance simulator

**Owned paths:** `next/src/battle/rules.js`, `next/src/battle/ctb.js`, `next/src/battle/ai.js`,
`next/src/battle/loot.js`, `next/src/battle/status.js` (if you want it), `next/src/data/party.js`,
`next/src/data/skills.js`, `next/src/data/items.js`, `next/src/data/enemies.js`, `next/src/data/encounters.js`,
`next/src/data/loot-tables.js`, `next/src/data/shops.js`, `next/qa/battle/**`, `next/tools/sim/**`,
`next/docs/BATTLE.md`.

You design and implement the combat and progression systems. They must create **meaningful decisions every
turn** (Scott's words) and combine: FF's party roles and bosses, Octopath/Sea of Stars weakness+Break, FFX's
CTB timeline, Lufia II's Fury (IP) gauge, Chrono Trigger's combo techs, Secret of Mana's weapon mastery,
Diablo II's affix loot and elites. Read DESIGN.md section 7 closely. Also read the old engine's combat in
`rpg-engine.js` (weapons, skills, Archivore phases, Lost Pages) and keep its good ideas.

## Architecture (pure: no DOM, canvas, audio or timers; deterministic with an injected seeded rng)
- `createBattle({party, enemies, rng, options})` returning an object with: `state` (plain serializable data),
  `current()` (actor whose turn it is), `commands(actor)` (available commands with enabled flags and reasons),
  `targets(actor, action)`, `previewTimeline(actor, action)` (where the actor will land, and a damage/effect
  preview), `perform(action)` -> **events array**, `runEnemyTurn()` -> events, `isOver()`, `result()`.
- **Events** are what the presentation layer animates, in order. Make them rich: `turn_start, telegraph(text,
  actor, nextTurn), action_start(actor, action), move_to(actor,target), damage(target, amount, crit, weak, element,
  shieldLost), heal, mp, miss, status_add/remove/tick, break(target), shield_restore, fury_gain/ready, ko, revive,
  summon(enemy), phase(name,text), message(text), timeline(order), escape, victory, defeat`.
- `ctb.js`: timeline math (speed -> delay, action delay costs, haste/slow/stun/break effects, `peek(n)`).
- `ai.js`: enemy behavior scripts (per enemy id), including telegraphs one turn ahead, targeting rules
  (lowest HP, healer first, random weighted), phase scripts for bosses.
- `loot.js`: item generation with rarity tiers, base items, prefix/suffix affixes with rolled values, elite
  and boss drop rules, gold, chest tiers. Pure functions taking rng.

## Data (Episode 1, canonical ids in COMMON.md)
- `party.js`: base stats and growth for hero, mira, bram (levels 1 to 15 tuned, formula continues to 99),
  weapon types per character, mastery levels (1 to 8) with EXP thresholds and unlocks.
- `skills.js`: techs per weapon type (2 to 3 each for Episode 1), Mira's magic (fire, ice, thunder, heal, Appraise
  scan, a cleanse), Bram's guard/taunt/rally style techs, Fury arts per weapon type, combo techs (Hero+Mira
  "Ember Edge", Hero+Bram "Cross Rend", Mira+Bram "Thorn Bulwark", triple "Dawnname"), statuses. Every skill has a
  short help string (max 40 chars) for the battle help window.
- `items.js`: consumables (potion, hi_potion, ether, antidote, eye_drops, echo_herb, phoenix_feather, tent),
  key items (COMMON.md), equipment bases: weapons for sword, axe, spear, staff, bow at 3 tiers; armor (body, head),
  accessories (charm, boots, mantle slots), 4 or 5 named uniques/legendaries for Episode 1 (one guarded by the
  Archivore, one in a secret). Affix pools with tiers. Rarity colors per DESIGN 6.4.
- `enemies.js`: every enemy id with stats, shields, weaknesses, resistances, EXP, gold, drops, AI id, flavor
  name. Elite modifiers (Swift, Stoneskin, Vampiric, Cursed, Splitting). Echo Warden mini-boss (mirror knight,
  reflects magic in one stance, physical in another: read its stance). **Archivore**: 3 phases, Lost Pages
  summons (each page has a different weakness), a signature telegraphed "Devour Name" (silences and drains one
  ally unless they Defend or the Archivore is Broken first), an Ink Storm AoE, feeds on surviving pages.
- `encounters.js`: encounter groups per zone (valley, archive_f1..f3) incl. which visible field enemy maps to
  which group, and boss encounters. `shops.js`: Willowmere item shop, smithy, and a valley peddler, with prices.

## Balance
Write `tools/sim/simulate.mjs`: plays thousands of battles with a competent policy (uses weaknesses, heals at
40%, defends vs telegraphs) and a naive policy (attack only), at the expected level per zone: valley Lv 2-3,
Archive F1 Lv 4, F2 Lv 5-6, F3 Lv 7, Archivore Lv 8. Tune until: ordinary fights 3 to 5 rounds for the competent
policy with low risk, naive policy noticeably worse; Echo Warden ~6 to 8 rounds; Archivore 8 to 12 rounds and
loses reasonably often to the naive policy. Make the EXP curve land those levels if the player fights most
visible enemies once. Write results and tuning notes to `docs/BATTLE.md`.

## Tests (`qa/battle/*.test.mjs`, node:test)
Determinism (same seed, same events), damage bounds, weakness + Break, timeline order + preview correctness,
statuses tick/expire, Fury fill and use, combo availability rules, Archivore phase transitions, loot affix
validity and rarity distribution, referential integrity of all data ids, and the simulator meets targets.
