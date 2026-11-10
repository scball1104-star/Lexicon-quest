# E6-fixes: the Episode 6 fix pass (from CRITIQUE_8 and PLAYTEST_REVIEW_8)

**Filled 2026-11-10** from CRITIQUE_8 (C) and PLAYTEST_REVIEW_8 (P); no blocker was found, so this is a tuning pass. Two agents run at once with DISJOINT paths: **A** (battle and play) and **B** (field art and maps).

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

Items in rank order. "C n" and "P n" point at the review's top-ten rows, which give the smallest fix.

**A (battle and play).** Owned paths above, plus `src/data/ep6/{items,encounters}.js` for A4 and A5.
- **A1 (P1, S)** The Gale Engine braces against its own Gusts; re-tune so attack-only wins 20 to 40% and careful play 85%
  or more. `gale.js`, `ai.js`, `tools/sim/ep6.mjs` targets.
- **A2 (C1 + C7, S)** The Scribe's HUD row stays over it in all three looks, clear of the Gust pips; the Beacon's row under
  its lamp; the Compass 12 px left of Arden; one row rule per encounter (both Harriers alike). `scene.js`; both looks in
  `qa/battlescene/ep6_scene.test.mjs`.
- **A3 (P5, S)** Say that Defend braces: Mira's first-fight line (`story.js` about line 181, cut or swap within the bible's
  voice, never invent a new beat) and the Defend help text in Gale fights.
- **A4 (P4, S)** Tier 11 prices down about 30% so two pieces are affordable on arrival (about 4,600 G). `items.js`.
- **A5 (P6, S)** About 150 EXP off one F3 group so the bots meet the Scribe at Lv 27. `encounters.js`, then the sim.
- **A6 (C2, S to M)** Show Vex hanging over the cloud on a visible rope in `vex_falls`; frame the `anchor_lesson` dock
  catch with Mira and Bram centred. `story.js`. If the rope needs an asset, ask B in the report rather than drawing one.
- **A7 (C5, S)** In `cloud_library`, the first page's line reaches full alpha only when "in full" is said, and the party's
  mark is in frame. Wire the call in `story.js`; B owns `pages.js` if the page art itself changes.
- **A8 (P9, S)** The bot rests at each floor's font and at `font_w2b`. `qa/autoplay.py` `Episode6`.
- **A9 (P7, text half)** Add an Episode 6 line for the chart-room bell in `text.js` (key `ep6_charts_bell`); B points the
  map at it.
- **A10 (P10, optional)** The Scribe's first Rewrite on its second turn. `ai.js`. Only if A1 to A9 leave the fight in band.

**B (field art and maps).** Owned paths above, plus `tools/art/backdrops/ep6*` and `src/data/maps/ep6_*.js` (all).
- **B1 (P2, S)** A lift from F1's alcove up to F2's Bellows Hall once `obs_f2_done`. `ep6_obs_f1.js` (and F2's landing).
- **B2 (P3, S to M)** One pass through F2's duct loop, not two. `ep6_obs_f2.js`. Report the new lane-decision count; the
  orchestrator re-times with `story_time.py` and decides on the plan's Cut 1 if still over 95 minutes.
- **B3 (C3, S)** Duct chevrons in white with the trailing edge, a blue bed under live ducts. `field/art.js`.
- **B4 (C4, S)** The board in Zephyr's arrival frame; the storm on the plaza's skyline. `ep6_zephyr.js`.
- **B5 (C6, S)** Unlit F3 stone one value step darker; the party's floor stays at luma 0.22 or more. `field/storm.js` or
  the F3 tiles.
- **B6 (C8, S)** Re-cut the painted islands with hard alpha and an outline. `tools/art/backdrops`, `assets/backdrops/ep6_*`.
- **B7 (C9, S)** Measure chevron against band and band against cloud, not chevron against plain cloud. `docs/WORLD_EP6.md`
  section 4 and the `ep6_lab.py contrast` check. Do not change the lane art (protected).
- **B8 (P7, map half)** Point the chart-room bell (`ep6_zl_charts.js` about line 63) at `ep6_charts_bell`.
- **B9 (C10, optional)** A pale ring at a post's foot. `field/art.js`.

**Not in this pass:** P8 (fetch every pack at once on a resume) touches the hot core file `src/game/packs.js`; it stays a
follow-up for Scott's word. **Protect** both reviews' protect lists, above all the lane look, Anchor's menu path, the ride
safety and save rules, and the first five minutes.
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
