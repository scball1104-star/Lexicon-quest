# H6-fixes: the arc critique's fix pass

You are **H6-fixes**. You work the ranked table in `docs/CRITIQUE_ARC.md` (H6-critic, 2026-10-27), items 2 to 25,
in rank order. Item 1 (the yard slime replaying on old saves and the Episode 2 start) is already fixed by the
orchestrator: `yard_slime` now needs `ifNot: ['yard_fight_done', 'met_mael']` and `EP1_DONE_FLAGS` carries
`cold_open_done` and `yard_fight_done`; do not redo it. One other agent runs beside you, C3-sim-bot, which owns
`src/data/cave/foes.js`, `loot.js`, `tools/sim/**`, `qa/autoplay.py`; never touch those or any `cave_*` file.

## Read, in this order
1. `docs/briefs/COMMON.md`, `DESIGN.md` sections 2, 7 and 10, the writing rules in `src/data/story/ep1.js`'s header.
2. `docs/CRITIQUE_ARC.md` in full, including "Five things that work and must not be touched": those are law.
3. `docs/RESPONSIBILITY_ARC.md` section 7 (Scott's words; decision D: small and honest, never a quiz).
4. The code each item names: `src/data/story/ep1.js`, `ep2.js`, `src/data/npcs.js`, `src/data/quests.js`,
   `src/data/ledger.js` and `docs/LEDGER.md`, `src/data/vows.js`, `src/game/vows.js`, `src/scenes/field.js`
   (Aim line, menu button), `src/scenes/menu.js`, `src/scenes/prologue.js` (the cold open captions and banner),
   `src/data/maps/bell_tower.js`, `src/data/encounters.js` (`yard_slime` zone and backdrop), `src/scenes/battle.js`
   (Auto battle policy, equip prompts, the toast), `src/ui/screens/journal.js` (Ledger groups and the hero row),
   `src/world/events.js` (the rest flow and the kept box), `assets/audio/manifest.json` and `tools/audio/**` (the
   SFX generators) for the thirteenth bell.
5. The tests that pin each area: `qa/content/h1_opening.test.mjs`, `h4_truth.test.mjs`, `story.test.mjs`,
   `qa/ui/h2_ledger.test.mjs`, `h2_ledger_headless.py`, `qa/battle/h3_vows.test.mjs`, `qa/ui/h3_vows.test.mjs`,
   `h3_vows_headless.py`, `qa/saves/*`. Update a test only when the change is the intended one, and say so.

## Owned paths
Everything item 2 to 25 names, listed above, plus their tests, `qa/shots.json` (retarget, do not add), `qa/arc/fixes_out/**`
for your previews, and `docs/CRITIQUE_ARC.md` only to append a "Fixed" column or section at the end. Not owned:
anything cave, `DESIGN.md`, `qa/autoplay.py`, the ratchet file and precache tests, `rules.js` unless an item cannot be
done elsewhere (then one line, named in the report).

## Rules for the pass
- Rank order. A "minutes" item is never skipped. An "hour" item is done unless it needs art you cannot make with
  the existing sheets and generators; then write exactly what is missing in the report.
- Item 6 (rewards): keep the gift only where the fiction hands something over (about half the truths), give a lie
  side something small where the fiction allows (an easier moment, a line), cut Mael's ethers and "I collect honest
  answers". Decision D: the truth is never the right answer to a quiz.
- Item 7 (Mael's ask): make it about the night, as the critique proposes; keep the flags `mael_truth` / `mael_lie`.
- Item 8 (Auto under a vow): Auto never takes an action the active vow forbids (no healing item under No healing
  items, no Fury under No Fury, no Flee under No fleeing); when nothing else is possible it defends.
- Item 10 (the thirteenth bell): first try moving `bell_first` into the core set and run `node qa/run.mjs pwa`; if the
  initial-download ratchet refuses, generate a short core alarm bell with the existing generator (a distinct pitch,
  under 40 KB), name it `bell_thirteenth`, and use it; never a doubled `bell_toll`.
- Items 3, 4, 5, 22 (the Ledger): write a `why` for every Episode 1 and Episode 2 row in the voice the critique
  quotes from Holt's and Mael's lines; group and count a place only once its region is reached (the Hollow on
  `crossing_done`, the Wider Valley on its gate flag, Episode 3 on `ep3_started`); Oren kept on `saw_fading_sign`
  with a `why` that differs by `oren_truth` / `oren_lie`; the hero's row reads "Not yet kept." Update `docs/LEDGER.md`.
- Item 2 and 11 (the tower): no Aim line, no menu, no location banner on `bell_tower` before `cold_open_done`; the
  caption drawn above the hero.
- Item 21: the yard fight on a Willowmere stage (a zone or backdrop that exists; if none fits, say which is closest).
- Item 23: twelve small bells in the belfry from existing props if the sheet has a bell; else leave and report.
- Every box keeps the rule (3 lines of 42). No em dashes anywhere.
- Budget: measure your gzipped delta on precached files; the tap-prompt ratchet has about 2.4 KB of room; if your
  text would cross it, trim prose elsewhere in the same files first and report the numbers.

## Verify before you report
`node qa/run.mjs content ui battle saves pwa core` green (a `cave`, `world` or `sim` failure is the other agent's);
`python qa/autoplay.py` (desktop, Episode 1) and `python qa/autoplay.py --episode 2 --start new` still clear with the
main flags in order; `python qa/shots.py` zero errors; the H2 and H3 headless rigs green; `node tools/sim/simulate.mjs
--check` still "All targets met" (item 6 changes rewards, item 8 changes Auto). Previews viewed for every visual item.

## Report (last message, under 450 words)
A table: item number, done or not, what changed (one line), the test touched if any. Then the bell solution and
its bytes, the Ledger counts at three points (after Mael, after the Archive door, after the credits), the bytes
delta, log and preview paths, and anything left for Scott (an art gap, a design call).
