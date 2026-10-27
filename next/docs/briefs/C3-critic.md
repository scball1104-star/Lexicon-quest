# C3-critic: fresh eyes on the Deep Stacks (read-only)

You are **C3-critic**, the play-critic for the Deep Stacks (`docs/DEEP_STACKS_PLAN.md`), the 100-floor Ancient Cave under
the library. You judge; you do not fix. Nobody else is building while you run. The pack is off for players
(`CAVE_LIVE=false` in `src/data/cave/live.js`); `?cave=1` forces it on in any page you open.

## Read, in this order
1. `docs/briefs/COMMON.md`, `DESIGN.md` sections 0 to 2, 7 and 10 (the quality bar), `docs/DEEP_STACKS_PLAN.md` (section 0
   is Scott's own words: a Lufia II Ancient Cave; section 13 his open calls A to F with the defaults taken).
2. `docs/DEEP_STACKS_BALANCE.md` (what was measured and what is known to be left; section 7 is the gap list: do not
   re-report those, rank them against what you find, and say whether each still shows). Items 1 to 3 there were fixed by the
   orchestrator on 10/27 (a second reading has its foes again; the Binder's three looks swap; the generator re-rolls a
   failed dressing): confirm each or report it still broken.
3. `PLAN.md` Wave C (every C1, C2 and C3 report's notes and handoffs).
4. The earlier critiques for form: `docs/CRITIQUE_ARC.md` (the latest, with its Fixed section), `docs/CRITIQUE_X1.md`.
5. How to drive it: `qa/autoplay.py` (`--cave N`, `--cave-resume`, `--cave-chests cheap`), `qa/cave/world_headless.py`,
   `qa/cave/bot_binder_phases.py`, the `LQ_DEBUG` cave surface (`caveBegin`, `caveEnd`, `caveResume`, `caveDescend`,
   `caveStairs`, `caveChests`, `caveWipe`, `caveArt`, `state().cave`), `qa/autoplay_grid.mjs <id> --cave=<seed>` for a
   floor's walk grid, `node tools/sim/simulate.mjs --cave --check` for the numbers.

## Owned paths
`docs/CRITIQUE_STACKS.md` (new), `qa/cave/critic_out/**` (your screenshots and logs; create the folder). Nothing else. You
read any file; you run the game headless (Playwright, desktop and phone profiles, `?debug=1&cave=1`); you never edit source,
data, tests or docs besides your own.

## What to do
1. **The first five minutes of the Stacks as a player who loved the Ancient Cave**, phone first, then desktop, from a save
   with `ep1_complete` (the bot's `newGameEp2` flags): the library, the trapdoor, Hollis's offer and his words, the hall, B1
   to B5. Time each beat. Does the level-1-and-empty-hands opening read as a rule or a bug; is the first red chest a relief;
   does the floor tag and the stairs arrow tell enough; do the generated floors look hand-made beside Archive F2; does
   anything explain too much; is the music and ambience a change from the Archive.
2. **B7 to B21 by hand** (the balance doc's tightest band; the bot wiped on B7 and B16 in 2 of 10 careful readings and in
   4 of 8 when it skipped the far chests): fight with the real menu, open what you would open, skip what a tired player
   skips. Is the larder legible (does a player know the chests are the healing); does a fight of 3 to 4 rounds feel right;
   does the equip prompt arrive at the right moment; do Mira's MP and the Feathers become the game; is a wipe fair, and
   is the death card honest. Play at 1x battle speed at least once per decade and note the minutes.
3. **The Bookmark, the vault and the second reading**: bank at B10 and at B30 (the landing's chest, the Bookmark from Key
   Items, "Close it"); check the hall, the Archivist, the title's Resume row and the Journal line; start the second reading
   and confirm the vault's uniques are offered at the start and worn, and that B1's foes are there again. Then a Quit and a
   wipe: what each keeps, and whether the text says so before the player loses it.
4. **Suspend and resume**: stop at B7 (`--cave-resume` shows the path), reload the title, resume, and say whether a player
   would trust it with a long run.
5. **Deep floors and the Binder**: via `LQ_DEBUG.caveDescend` to B45, B75 and B95: how long a floor takes at 1x (the model
   says 8 minutes at B80 with 12 foes; is that a chore), what the bag looks like (the doc says about 20 Feathers and dozens of
   cures by B90), whether the bands' art and pools feel like depth. Then the Binder from a B100 state: its three looks, the
   phase lines, the telegraphs, whether the swap's glass-shatter fx suits paper, the clear flow, the Quill, the plaque and the
   B100 ribbon on the title.
6. **Phone first, always**: every screenshot pair is phone then desktop. Any text under 11 px, any overlap with the touch
   controls, any box over three lines, any chest or stair a thumb cannot reach cleanly.

## The write-up (`docs/CRITIQUE_STACKS.md`)
Under 1,200 words plus the table. A verdict in three sentences (would a Lufia II player keep going after five minutes, after
B30, and would they come back for a second reading). Then a ranked table of at most 25 issues: rank, where (floor or screen,
phone or desktop), what you saw (one sentence, Fact), why it matters (one sentence), the smallest fix (one sentence,
Inference), the owner (gen, data, state, world, story-ui, art, balance), and a cost (minutes, hour, day). Severity first: a
blocker (would make Scott stop playing) before a polish note. Then five things that work and must not be touched in the fix
pass. Then your timings table (the first five minutes, and minutes per floor at B5, B15, B45, B75, B95 at 1x). Then one
short section: which of Scott's open calls A to F your play would change, and why, in two lines each. Every claim tagged Fact
(you saw it) or Inference. No em dashes.

## Verify before you report
Every screenshot you cite exists under `qa/cave/critic_out/`. You changed no file outside your owned paths (keep a list of
files you wrote and put it in the report). Bound every command you run (`timeout=`); a floor that hangs is a finding, not a
wait.

## Report (last message, under 300 words)
The verdict, the top five issues with owners, the path of the critique, the screenshot folder, which of the three 10/27
fixes you confirmed, and anything you could not test (and why).
