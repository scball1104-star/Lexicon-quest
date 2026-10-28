# C4-fixes: the Deep Stacks critique's fix pass, plus the balance gaps

You are **C4-fixes**. You work the ranked table in `docs/CRITIQUE_STACKS.md` (C3-critic, 2026-10-28) in rank order, then
the balance gaps in `docs/DEEP_STACKS_BALANCE.md` section 7 that nobody has taken. Already done by the orchestrator on
10/28, do not redo: issue 1's generator half (`gen.js` `layout()` now accepts only a layout some dressing proves; seeds 612
B54 and 687 B58 build; a 9,900-floor scan is clean) and issue 2 (`battle.js` `beginVictory` plays the victory loop only
while the battle is still on top). Issue 10 belongs to C4-uniques (sixty uniques in three grades, `items.js` and the blue
roll in `loot.js`), which may still be running or just landed: read its report in `PLAN.md` Wave C before touching
`loot.js`, and never edit `src/data/cave/items.js`.

## Read, in this order
1. `docs/briefs/COMMON.md`, `DESIGN.md` sections 7 and 10, `docs/DEEP_STACKS_PLAN.md` sections 2, 5, 6, 11, 13.
2. `docs/CRITIQUE_STACKS.md` in full, including "Five things that work and must not be touched": those are law.
3. `docs/DEEP_STACKS_BALANCE.md` (how the descent is measured; section 7 items 4 to 9; your tuning must keep
   `node tools/sim/simulate.mjs --cave --check` green).
4. The code each issue names: `src/data/cave/world.js` (`beforeDoor`, `prepareFloor`, the suspend, `beginReading`, the
   Archivist's lines, the hall rules), `src/game/cave.js` (the suspend fields, the vault, death), `src/data/cave/foes.js`
   (`BAND_ADJUST`, `foesPerFloor`, pools, `BINDER`), `src/data/cave/loot.js` (consumables by band, the pity rule, gold),
   `src/data/cave/gen.js` (`foeCount`), `src/data/cave/story.js` and `text.js` (Hollis, rules, the Bookmark, the plaque
   screen, B100), `src/scenes/title.js` (the Resume row), `src/scenes/field.js` (`maybeEquipPrompt`, `pendingDrops`),
   `src/battle/ai.js` (`competentPolicy`, Known 5), `qa/cave/**` tests, `tools/sim/cave.mjs`.

## Owned paths
Everything the issues name above, their tests under `qa/cave/**`, `qa/cave/fixes_out/**` for previews, `docs/CRITIQUE_STACKS.md`
only to append a "Fixed" section, `docs/DEEP_STACKS_BALANCE.md` section 9 (new, your numbers). Not owned: `items.js`,
`gen.js` beyond `foeCount`, `battle.js` beyond issue 17's drop deferral, `DESIGN.md`, anything outside `next/`.
Hot files (`field.js`, `state.js`, `text.js`) get one guarded line each at most, named in the report.

## Rules for the pass
- Rank order. "Minutes" items are never skipped; "hour" items are done unless they need art you cannot make with the
  existing sheets (then write exactly what is missing). Issue 21 (Hollis's head) and 18 (a page-burst fx) may be reported
  as art gaps.
- Issue 1's world half: `beforeDoor` catches a `CaveGenError` and keeps the party on the floor with one line (never a red
  panel), and the floor tag never reads a floor the party is not on.
- Issue 3: the suspend records `inBattle` (the encounter id) at battle start and clears it at the end; a Resume from a
  suspend with `inBattle` restarts that fight from its start state (full-HP foes, the party as it was on arrival is NOT
  restored: use the party as suspended).
- Issue 4: rule 3 and the Bookmark line say up front that a fall takes back this reading's blue finds (Hollis's voice, two
  lines at most, no em dashes).
- Issues 5, 7, 11 (balance): `foeCount` capped at 6 from B40 with the EXP pace refit; band 2 shorter and sharper fights;
  the Binder decided by care, not patience. Prove each with `--cave --check` (targets unchanged) and write the before and
  after tables in BALANCE section 9.
- Issue 6: until `EP3_LIVE`, bands 4 and 5 draw from all three earlier pools scaled up, elites one group in three.
- Issue 8 with Known 7: no cures from foe drops inside the Stacks; bands 3 to 5 lean to Hi-Ethers and Hi-Potions; the hoard
  stays under a dozen of any one thing by B90 in the sim.
- Issue 9: before the first landing the pity rule fires at `floor - last >= 9`.
- Issue 12: Hollis asks "A reading is open below. Abandon it?" when a suspend exists; "No" keeps it.
- Issue 13 with Known 4: the first red chest of B1 to B3 rolls a weapon for a member whose hands are empty; battle drops on
  B1 to B5 roll a base at item level 2 at least (the `rollBase` empty-pool fallback keeps slot and type).
- Issue 17 with Known 10: drops after `binder_cleared`, the Quill's chest gone (the clear puts the Quill in the vault), the
  B100 plaque sign placed.
- Known 5: Auto Defends only when a heal or a Feather is coming within two turns, else attacks.
- Known 9: regenerate `qa/cave/out/cave_sanity.md`.
- Every box keeps the rule (3 lines of 42). No em dashes anywhere. The pack stays under 0.8 MB (`node qa/run.mjs pwa`).

## Verify before you report
`node qa/run.mjs cave battle battlescene saves ui pwa` green; `node tools/sim/simulate.mjs --cave --check` and `--check`
both green; `python qa/autoplay.py --cave 30 --seeds 3` clean (0 errors, 0 softlocks) and `--cave-resume`; a headless rig
for issues 1, 3, 4, 12 and 17 with phone-first screenshots under `qa/cave/fixes_out/`; `node tools/cave/scan_floors.mjs 1 100`
clean.

## Report (last message, under 450 words)
A table: issue number, done or not, what changed (one line), the test touched. Then the balance tables before and after
(death rates per band, minutes per floor at B45/B75/B95 from the model, the Binder's rounds), the hoard counts at B90, the
pack bytes, every line in a hot file, preview and log paths, and anything left for Scott (an art gap, a design call).
