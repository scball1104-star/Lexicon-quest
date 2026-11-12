# E8-battle: Erasure, Read Aloud, Answer's last job, the Sentry, the Eraser, loot and the sim (wave 8a)

Build Episode 8's fights as pack data and one pure rule, and prove them in the simulator.

## Inputs (read first, in this order)

The repo's `AGENTS.md`, `docs/briefs/COMMON.md`, `DESIGN.md` section 7, plan `docs/EPISODE8_PLAN.md` sections 0.1, 2.4, 2.8, 6
and 7 (your contract), `docs/story/EPISODE8.md` sections 1 (Acts II and V) and 11 (choices 16 to 18), `docs/BATTLE.md`
(sections 13.8, 14, and the Episode 7 section), the built `src/data/ep7/{enemies,skills,ai,rime}.js` and `tools/sim/ep7.mjs`
(your models), `src/data/ep4/ai.js` and `src/data/ep4/scene.js` (what `answerable` and `decree` trigger: you must know before you
flag `last_silence`), `src/data/ep5/scene.js` (`holdForMira`), `src/battle/rules.js` (the commands builder and E8-pack's
`RULE_EXT.commands` seam), `src/battle/ai.js` (`enterPhase` forwards `sprite`), CRITIQUE_9 / PLAYTEST_REVIEW_9 if they exist.

## Owned paths

`src/data/ep8/{enemies,encounters,items,loot,shops,skills,ai,erasure}.js`, `tools/sim/ep8.mjs`, one line in
`tools/sim/simulate.mjs` (CRLF, keep it so), `qa/battle/ep8_*`, `docs/BATTLE.md` (an "Episode 8" section only).

## Outputs (items, in order)

1. **Regrep** every id of plan 2.4, 2.8 and 7 against `src/`, `assets/` and `tools/sim/` (plan 2 lists the collisions already
   avoided: `smudge`, `strikethrough`, `nameplate`). Report any new hit and its rename.
2. **`erasure.js`** (pure, never draws from `ctx.R`): plan 6.3 exactly. State per member (rubbed commands with counts, Unwritten),
   the `commands` hook (rubbed rows disabled with reason "Rubbed out"; Magic stays open with only Read Aloud lit), `afterAction`
   (an [E] hit rubs the target's last command; Defend slides it; the hero never), Fresh Ink, Read Aloud through `{ keep:
   'erasure', erasure: 'read' }`, the pin bookkeeping. Events for the scene: `rub` (member, command, reason), `rub_end`,
   `ink_slide`, `unwritten`, `unwritten_end` (reason `read` | `turns` | `break`), `unwrite_broken` (reason `read` | `break`),
   `silence_broken` (reason `answer` | `break`). Party only, always.
3. **`skills.js`**: `read_aloud` (plan 6.3: Mira, 12 MP, `target: 'ally'` including self, `learn: { flag: 'read_learned' }`,
   fallback level 31, `unwrite: true` for `SIGNATURE_TECHS`), Read Aloud's `SKILL_GATE` ("Nothing to read back."), every foe
   move of 6.2 to 6.5 with its [E] marker as data, `unwrite` (flag `unwrite`), `last_silence` (flag `last_silence`, **neither
   `answerable` nor `decree`**: read Episode 4's files and confirm no wrap keys on the charge kind; say what you found), the
   `SIGNATURE_TECHS` entries `{ unit: 'mira', flag: 'unwrite', skill: 'read_aloud' }` and `{ unit: 'hero', flag:
   'last_silence', skill: 'answer', usable: true }` (registered by the pack, idempotent). Confirm Turn the Sky, Anchor and
   Call stay gated in every Erasure battle.
4. **`enemies.js`, `encounters.js`**: the 7 foes, the Sentry, the Eraser, Grief and Change (6.2 to 6.5), the groups, zones and
   `EP8_ZONE_ORDER`, `EP8_MAPS_LISTED = false` with the non-enumerable pattern. No per-encounter field (the double-entry trap).
5. **`ai.js`**: `unnamed_sentry` (Unwrite with `holdForMira`, the 50% adds) and `eraser` (four phases with HP locks at 70% and
   26% and the 32% ward floor, Grief's Weep Ink capped at the 70% lock, Change's Stand In redirect, the Keeper Remembers' +30
   Fury and one-turn Break, the Last Silence every 3rd turn with **one telegraph at a time**, the throwbacks, the look per phase
   forwarded through `enterPhase`), registered on `SCRIPTS` / `POLICY_EXT`. The `competent` policy's six rules of 6.3; the
   attack-only policy: Attack, or Defend when Attack is rubbed out.
6. **`items.js`, `loot.js`, `shops.js`**: Fresh Ink, the 16 bases, the uniques and set of 7.3, affix tier 10, `RARE_NAME_EXT`
   names, `ZONE_LOOT`, `BOSS_LOOT`, the three shops, the key items of plan 2.3.
7. **`tools/sim/ep8.mjs`** and the one `simulate.mjs` line: plan 6.6 (loadouts, targets, suite and boss levels, F3 the tightest
   floor) and the checks `economy8`, `erasureOn`, `noFoeErased`, `readShare`, `answerShare`, `telegraphCount`, `toughNotLong`
   (2026-11-11) and the EXP margin. **Tougher, not longer (Scott, 2026-11-11; plan 6.4 to 6.6):** the Sentry's careful rounds
   no higher than the Gale Engine's 8.88 and the Eraser's, all four phases, no higher than the Storm Scribe's 14.55 (band 11
   to 15, not the first proposal's 14 to 18), each losing more HP than its Episode 6 counterpart (13%, 17%), careful win 85%+;
   harder by what a boss does each round, never by more HP. If four phases cannot fit, report it and take EPISODE8 choice
   17's three-phase fallback. Tune in the order 6.6 names; tune chest and foe gold before any price (7.6's first-pass line is 140 G short on
   purpose).
8. **Tests** `qa/battle/ep8_*`: the rule's every clause (pure), the hero never rubbed, Defend slides, the two-turn count and
   reset, at most two rubs, Read Aloud from a rubbed Magic row, self-target, Unwritten and its three ends, the throwbacks,
   one-telegraph-at-a-time, every phase's look id, the row anchors data for E8-scene-ui's placement test, an Episode 1 to 7
   battle's commands deep-equal with and without the hook.
9. **`docs/BATTLE.md`**: an "Episode 8" section (the rule, the numbers you shipped, the margins, what Episode 4's wraps do).

## Done when

`node qa/run.mjs battle` is green; `node tools/sim/simulate.mjs --check` prints "All targets met" for all eight episodes with
every new check passing; `--cave --check` and `--tier 1 --check` unchanged; the EXP margin under Lv 34 and both gold margins
are reported.

## Tests to run

`node qa/run.mjs battle`; `node tools/sim/simulate.mjs --check`; `--cave --check`; `--tier 1 --check`.

## Traps

- **The boss must not be pushed by its own rule** (PLAYTEST_REVIEW_8 item 1): no foe is ever rubbed out; nothing a foe does
  to the party slows that foe; assert the act rate.
- **A per-encounter field goes in BOTH `rollEncounter` and `rules.js`, or it is silently dropped.** You add none.
- **`enterPhase` must forward `sprite`** or the Eraser never changes look.
- **The `commands` seam is E8-pack's**, landing in the same wave: stub against `RULE_EXT.commands` and test with a fake until
  it exists. Never open `rules.js` yourself.
- **Episode 4's wraps** react to `answerable`/`decree`; do not trip them.
- **Mira's tips are a contract**; the lever each names must exist in your data.
- House rules: no git; LF endings (except `simulate.mjs`, CRLF: keep it); no em dashes; owned paths only; bound every command.

## Report (under 400 words)

The shipped numbers that moved from the plan and why, every check's result with margins, what Episode 4's wraps do with your
flags, the event names and battle-state shape E8-scene-ui needs, and any id renamed.
