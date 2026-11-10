# E6-fixes: the Episode 6 fix pass (from CRITIQUE_8 and PLAYTEST_REVIEW_8)

**A template.** The orchestrator fills the items from the review (as E5-fixes was written from CRITIQUE_7 and
PLAYTEST_REVIEW_7) and dates it. The shape, the owned paths and the traps below stand; the item lists are placeholders
until then. Two agents run at once with DISJOINT paths: **A** (battle and play) and **B** (field art and maps).

## Inputs (read first, in this order)

The repo's `AGENTS.md`, `docs/briefs/COMMON.md`, `docs/CRITIQUE_8.md`, `docs/PLAYTEST_REVIEW_8.md` (both in full: each item
names its file and its smallest fix), `docs/EPISODE6_PLAN.md` sections 6 and 12, and the docs of the files you touch
(`docs/BATTLE.md` Episode 6 section, `docs/WORLD_EP6.md`, `docs/MAPS_EP6_A.md`, `_B.md`).

## Owned paths

**A: battle and play.** `src/battle/scene/menu.js` (core, a menu-path item only, if the review finds one),
`src/data/ep6/{ai,gale,scene,story,quests,skills,text}.js`, `qa/battlescene/**`, `qa/realplay/**`, `qa/battle/ep6_*`,
`qa/content/ep6_*`, `qa/autoplay.py`, `tools/sim/ep6.mjs`, `docs/BATTLE.md`.

**B: field art and maps.** `src/data/ep6/field/**`, `src/data/ep6/pages.js`, `src/data/maps/ep6_*.js`,
`tools/art/tiles/ep6*.py`, `assets/tiles/ep6*`, `assets/backdrops/ep6_*`, `qa/world/ep6_*`, `qa/maps/ep6_*`,
`qa/core/ep6_tiles*`, `qa/core/ep6_pages*`, `docs/WORLD_EP6.md`, `docs/MAPS_EP6_*.md`.

Where an item needs both (a page mode called from a scene, a mark moved for a staging change), A wires the call in
`story.js` behind a guard and B builds the asset or moves the mark; each says so in the report.

## Outputs

- **A1 to An** and **B1 to Bn**: the review's items, each with its file, its smallest fix and its size, in the review's
  rank order (blockers first).
- **A, always:** after any battle change, re-run `simulate.mjs --check` and one Continue bot run with `--all-fights`, and
  confirm the Scribe at its level is in band.
- **B, always:** after any map change, `node tools/maps/ep6_check.mjs`, the critical path and reload-home tests.

## Done when

Every item is fixed, partly fixed with a reason, or not fixed with a reason; the orchestrator's full gate list (plan 12) is
green again after both report.

## Tests to run

A: `node qa/run.mjs battle battlescene content`, `node tools/sim/simulate.mjs --check`, `python qa/realplay/ep6battle.py`.
B: `node qa/run.mjs maps world ep6`, `node tools/maps/mapcheck.mjs check`, `python qa/realplay/ep6field.py`, previews
viewed.

## Traps (every trap of the E6 briefs, the ones that bit Episode 5's fix pass first)

- **Keep every edited file's line endings** (LF in this worktree; count CR bytes before and after: zero). `qa/shots.json`
  above all.
- **A menu-path fix needs a menu-path test**: a scene test through `menu.js` (never `LQ_DEBUG.battleAct`) and one realplay
  cast with real keys and a tap. Check every other `none`-target party skill in every episode the same way.
- **A core byte is paid by a trim** in the same change; report the gzipped pre-tap bytes before and after (`LQ_RELEASE=1
  node qa/run.mjs pwa`).
- **Lines in the bible are final voice**: trim to a budget by cutting, not rewriting.
- **A new encounter field goes in both `encounters.js` `rollEncounter` and `rules.js`**; boss phases forward `sprite` in
  `enterPhase`; reload-revived floor foes inflate bot levels (`--all-fights`).
- **`assets/ep6_manifest.json`** is regenerated if B touches art: the orchestrator `git add`s it.
- `EP6_LIVE` stays on (on the branch); Episodes 1 to 5 unchanged in meaning; never run beside E6-review.
- House rules: no git; no em dashes; bound every command; look at your own output (phone 844x390 and 375x812, desktop).

## Report (under 400 words)

Each item's outcome (fixed / partly / not, with why), tests with counts, files touched (exact list), shots to view.
