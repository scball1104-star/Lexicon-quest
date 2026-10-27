# C2-story-ui: the Archivist, the words, the title rows, the plaque screen

You are **C2-story-ui**, wave C2 of the Deep Stacks (`docs/DEEP_STACKS_PLAN.md` sections 2, 3, 9, 12). Other
agents run beside you: C2-world (the wiring: `src/data/cave/world.js`, `events.js`, `field.js`, `menu.js`,
`items.js`, `save.js`, `gameover.js`, `battle.js`), C2-sprites-boss (art and the hand-made maps) and H4-story
(story scripts, `quests.js`, `npcs.js`, `ledger.js`). Stay in your owned paths; code to the contracts below.

## Read, in this order
1. `docs/briefs/COMMON.md`, `DESIGN.md` (dialogue, menu, title, phone UX); the writing rules in `src/data/story/ep1.js`'s
   header (one idea per box, at most 3 lines of 42 characters, no em dashes, `{hero}`).
2. `docs/DEEP_STACKS_PLAN.md`, then `docs/briefs/C2-world.md` (its "Contracts" section names what you export).
3. `src/game/cave.js` (`resumeInfo`, `recordOf`, `vaultIds`, `inRun`, `game.cave.lastExit` as C2-world sets it),
   `src/data/cave/items.js` (the uniques' names and flavour: the plaque screen shows them), `src/data/x1/story.js`
   (how a pack's scenes register), `src/data/story/ep1.js` and `docs/story/STAGING.md` (the cutscene API),
   `src/scenes/title.js` (the Episode 2 row on `ep1_complete` and the stats line H2 added), `src/ui/screens/journal.js`
   (H2's Ledger tab and H3's vow line: match their style), `src/ui/screens/common.js`.
4. `qa/content/*.test.mjs` and `qa/ui/*.test.mjs` for harness style.

## Owned paths (create or modify nothing else)
`src/data/cave/story.js`, `src/data/cave/text.js` (new), `src/scenes/title.js` (the two rows), `src/ui/screens/journal.js`
(one Deep Stacks line under the main quest), `src/ui/screens/stacks.js` (new: the plaque screen), `src/data/text.js`
only if a shared banner must live there, `qa/cave/story_*.test.mjs`, `qa/cave/ui_*.test.mjs`, `qa/cave/out/story_*`,
up to three entries in `qa/shots.json`, `docs/story/DEEP_STACKS.md` (new: the Archivist, every line, the plaques).
Not owned: everything C2-world and C2-sprites-boss own, the ledger, the story scripts, `qa/autoplay.py`.

## Deliverables
1. **The Archivist, Hollis** ("the one Keeper who stayed down"). Sprite: `npc_scholar` unless C2-sprites-boss's report
   names another; portrait: none. Placed at `cave_landing0`'s `archivist` mark through your story module's
   `install` (the X1 way), not by editing the map. Voice: dry, kind, never explains more than asked; never says
   "responsibility".
2. **Scenes** (`story.js`, the `ep1.js` shape with `SCENE_CONDITIONS`, exported for C2-world's `register()`):
   `stacks_locked` (the trapdoor before `ep1_complete`: one inspect line); `stacks_intro` (first talk: the three
   rules in three boxes: level 1 and empty hands; red lends, blue gives; the Bookmark is the way out, and sets
   `deep_stacks_open`); `stacks_enter` (the offer: "Begin a reading?" yes or no; on yes, call
   `world.beginReading(engine, game, {})` through the seam C2-world exposes, with a fallback that only sets a flag
   when `world.js` is absent); `stacks_return` (plays on arrival from `endReading`; reads `game.cave.lastExit.how`:
   bank with blues ("Three names kept. The Stacks noticed."), bank with none, die ("The Stacks close. You woke
   here."), quit, clear; one or two boxes each); `stacks_no_save` (the refusal: "The Stacks keep their own
   pages."); `stacks_record` (talk again: the record line, then the plaque screen); `binder_intro` (one card line
   naming what was avoided, in the H5 style, plus one box) and `binder_cleared` (the Quill, the mark, one line).
   The vault's uniques at B1: a one-box reminder the first time a reading starts with a non-empty vault.
3. **Text** (`text.js`): `PLAQUES` (`plaque_hall`, `plaque_b10` to `plaque_b90`: ten lines, one each, the Stacks'
   own voice, each a small truth about names and keeping, no sermon), `STACKS_TEXT` (`close`, `bank`, `quit_ask`,
   `save_refused`, `floor_tag` with `{n}`), the title rows' labels.
4. **Title** (`title.js`): "Resume the Deep Stacks (B23)" under Continue when `save.exists('cave')` and
   `resumeInfo` says so (calls C2-world's `resumeReading`); the B100 mark once any slot has `deep_stacks_cleared`
   (a small glyph by the version line or under the Names counter; do not move the existing rows). Both hidden
   when the pack is not enabled or forced.
5. **Journal**: one line under the main quest once `deep_stacks_open`: "The Deep Stacks: deepest B23, 4 names in
   the vault" (from `recordOf` and `vaultIds`).
6. **The plaque screen** (`src/ui/screens/stacks.js`): record (deepest floor, readings, clears, time), the vault
   list (every cave unique, bright when held, faded when not, name only for unheld ones, flavour for held), the
   Binder's Quill last. Phone-readable, the house window style, help bar text.
7. **Tests**: every box obeys the rule; every scene's conditions reference flags that exist or that you define in
   your module; `PLAQUES` has all eleven keys; the title rows show and hide by the save and flag states (headless
   or harness); the Journal line format; no em dash. Shots: the plaque screen (desktop and phone), the title with
   the resume row.
8. **Docs**: `docs/story/DEEP_STACKS.md` with every line and where it plays.

## Verify before you report
`node qa/run.mjs cave content ui` (a `world_*` or `art_*` failure is another agent's file; say so); `python
qa/shots.py` zero errors; a headless load on desktop and phone with no console errors; gzipped bytes measured
(your title and journal lines count against the 2.34 MiB ratchet: keep them under 1.5 KB; the rest is pack).
No em dash. Bound every command.

## Report (last message, under 450 words)
The scenes and their conditions, the text keys, the title and Journal changes, the plaque screen, files touched,
bytes, shot paths, test counts, known gaps, and the exact seam names you expect from C2-world.
