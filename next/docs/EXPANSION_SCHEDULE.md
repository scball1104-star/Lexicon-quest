# Expansion build schedule: Episode 1 "The Wider Valley", then Episode 2 "The Mere Country"

Written 2026-10-25 (reconciliation). One ordered list across both episodes. Authority: `docs/EXPANSION_RECONCILIATION.md` (decisions), `docs/EXPANSION1_PLAN.md` and `docs/EXPANSION2_PLAN.md` (contracts), `docs/briefs/XP-packs.md` (the shared pack mechanism), the per-agent briefs in `docs/briefs/`. Episode 3 waits for Scott and is not in this schedule.

## 0. Rules for the orchestrator

1. **Ground the date** before any launch (Eastern; never a file mtime) and put it in every prompt. The prompts below use `<TODAY>`.
2. **Usage guard.** Before each launch run the usage check (HANDOFF). Under 75% weekly: a wave may run its agents together (at most 3). 75 to 85%: one agent at a time. Over 85%: stop. Scott's standing instruction for the week of 10/21 is "slow and steady": **one agent at a time**, in table order. Leave room for his loops and the schedule generators.
3. **At most 3 agents in a wave, and within a wave the owned paths are disjoint** (the tables say so; the proof is the path column). Never start the next wave until the current one is closed (section 3).
4. **Run order is strict**: all of Episode 1 (W1 to W7, including X1-integrate, the publish P1, the review and fixes) before any Episode 2 art, audio, battle, world or shared-data agent. The single exception is X2-story, which writes only new files and may run any time after W3 closes. A hotfix on the live game is cut from `origin/main` (HANDOFF), never from `overhaul`.
5. **Nothing is published between P1 and P2 except through the full gate list**, and nothing between W1 and P1 at all. `overhaul` carries unpublished work: `git push origin overhaul:main` publishes all of it.
6. The orchestrator commits (agents never run git), views every preview image an agent produced before committing its work, and owns `docs/PROGRESS.md` and `docs/PLAN.md`. No em dashes anywhere. Commit trailer per the harness.
7. If an agent reports a conflict with the decision log, stop the wave, fix the doc, relaunch; do not let two agents guess.

## 1. Episode 1 (the Wider Valley)

| Wave | Agent (brief) | Owned paths (disjoint within the wave) | Closes with |
|---|---|---|---|
| **W1** | **XP-packs** (`XP-packs.md`), first | `src/game/packs.js`, `src/data/x1/index.js`, `src/data/x2/index.js`, `src/data/x1/live.js`, `src/data/x2/live.js`, `src/core/assets.js`, `src/world/maps.js`, `src/game/story.js`, registry seams in `src/data/quests.js` / `npcs.js` / `text.js`, `src/main.js` and title/load scenes, `tools/pwa/**`, `qa/pwa/**`, `qa/core/pack_*`, `qa/core/sync-manifest.mjs`, `docs/PWA_PACKS.md` | `node qa/run.mjs pwa core`; budget line at most 6.33 MB |
| W1 | X1-story (`X1-story.md`) | `src/data/x1/{flags,quests,npcs,text,story}.js`, `docs/story/STAGING_X1.md`, `qa/content/x1_*` | `node qa/run.mjs content` |
| W1 | X1-battle (`X1-battle.md`) | `src/data/expcurve.js`, `src/data/x1/{enemies,encounters,loot,items,shops}.js`, battle-data seams in `src/data/{encounters,enemies,items,loot-tables,shops}.js`, `src/battle/rules.js`, `src/scenes/battle.js` (zone option only), `tools/sim/**`, `qa/battle/**`, `docs/BATTLE_X1.md` | `node qa/run.mjs battle`; `simulate.mjs --check` all targets met, caps pass |
| **W2** | X1-world (`X1-world.md`) | `src/world/abilities.js`, `events.js`, `cutscene.js` (give exp), `tools/maps/mapcheck.mjs`, `tools/maps/x1_links.json`, `qa/world/x1_*`, `docs/WORLD.md` | `node qa/run.mjs world maps`; fieldlab shot viewed |
| W2 | X1-tiles (`X1-tiles.md`) | `tools/art/tiles/x1_*` (+ one line in `build_tiles.py`), `tools/art/tiles/out/x1/**`, `assets/tiles/x1.png`, `assets/tiles/x1_tiles.json`, `tools/art/backdrops/x1_*`, `assets/backdrops/x1_*` | sheets and mocks viewed; `sync-manifest --pack x1` |
| W2 | X1-sprites (`X1-sprites.md`) | `tools/art/sprites/x1_*`, `chars/x1_*` (+ one line in `build_all.py`), `assets/sprites/x1_*`, `assets/ui/x1_heads.*` | contact sheets viewed; `sync-manifest --pack x1` |
| **W3** | X1-maps-west | `src/data/maps/x1_downs.js`, `x1_loomhouse.js`, `x1_barrow.js`, `tools/maps/previews/x1_downs*`, `x1_loomhouse*`, `x1_barrow*`, `qa/maps/x1_west.test.mjs`, `docs/maps/X1_WEST.md` | `mapcheck check`; previews viewed |
| W3 | X1-maps-south | `src/data/maps/x1_millrace.js`, `x1_mill.js`, `x1_culvert.js`, previews `x1_millrace*`, `x1_mill*`, `x1_culvert*`, `qa/maps/x1_south.test.mjs`, `docs/maps/X1_SOUTH.md` | same |
| W3 | X1-maps-north | `src/data/maps/x1_terrace.js`, `x1_orrery.js`, `x1_cellar.js`, previews `x1_terrace*`, `x1_orrery*`, `x1_cellar*`, `qa/maps/x1_north.test.mjs`, `docs/maps/X1_NORTH.md` | same |
| **W4** | X1-maps-wild | `src/data/maps/x1_highmoor.js`, `x1_larchhill.js`, previews `x1_highmoor*`, `x1_larchhill*`, `qa/maps/x1_wild.test.mjs`, `docs/maps/X1_WILD.md` | `mapcheck check`; frame-time numbers |
| W4 | X1-audio | `tools/music/**`, `tools/audio/**`, `assets/audio/**` (music, sfx, ambience; the manifest only through `build.py`), `docs/MUSIC.md`, `docs/SUNO_PROMPTS.md`, `qa/audio/**`, `qa/music/**` | `node qa/run.mjs music audio pwa`; precache numbers unchanged |
| **W5** | X1-maps-hub | `src/data/maps/valley.js`, `willowmere.js`, `archive_f1.js`, `archive_f2.js`, `archive_f3.js`, `qa/maps/x1_hub.test.mjs`, `qa/maps/x1_baseline/**`, `docs/maps/X1_HUB.md`, `docs/MAPS.md` (pointer), `X1_MAPS_LISTED` | `node qa/run.mjs maps world content`; baseline diff clean |
| *floating* | X2-story (`X2-story.md`), any time after W3 closes, before XA | `src/data/x2/{story,quests,npcs,text}.js`, `docs/story/STAGING_X2.md`, `qa/content/x2_*` | `node qa/run.mjs content` |
| **W6** | X1-integrate | the flips in `src/data/x1/live.js`, `qa/pwa/budget_ratchet.json` (to 6.38), `qa/autoplay.py`, `qa/autoplay_grid.mjs`, `qa/integrate/**`, `qa/saves/x1_*`, `qa/shots.json`, seam fixes in closed files | full gate list (section 2), then **P1** |
| **W7** | X1 critic, then X1 play-critic (`X1-review.md`), one at a time | `docs/CRITIQUE_X1.md`, `docs/PLAYTEST_REVIEW_X1.md`, `qa/out/reviewx1/` | reports read |
| W7 | X1-fixes (brief written by the orchestrator from the two reviews; paths named in it, each owned by no running agent) | per fix list | full gate list, then **P1b** (only if anything changed) |

## 2. Episode 2 (the Mere Country): starts only after P1b

| Wave | Agent (brief) | Owned paths (disjoint within the wave) | Closes with |
|---|---|---|---|
| **XA** | X2-battle (`X2-battle.md`) | `src/data/x2/{enemies,encounters,items,loot,shops}.js`, `tools/sim/x2.mjs`, one line in `tools/sim/simulate.mjs`, `qa/battle/x2_*`, `docs/BATTLE_X2.md` | `node qa/run.mjs battle`; `simulate.mjs --check`; caps pass |
| XA | X2-story (skip if already done) | as above | `node qa/run.mjs content` |
| XA | X2-world (`X2-world.md`) | `src/world/x2_*.js`, `tools/maps/x2_check.mjs`, one line in `tools/maps/mapcheck.mjs`, `qa/world/x2_*`, `docs/WORLD_X2.md` (and `events.js` only if a check fails) | `node qa/run.mjs world` |
| **XB** | X2-tiles | `tools/art/tiles/x2_*.py` (+ one line in `build_tiles.py`), `tools/art/tiles/out/x2/**`, `assets/tiles/x2.png`, `assets/tiles/x2_tiles.json` | sheets and mocks viewed; `sync-manifest --pack x2` |
| XB | X2-sprites | `tools/art/sprites/chars/x2_*`, `tools/art/sprites/x2_*.py` (+ one line in `build_all.py`), `assets/sprites/x2_*`, `assets/ui/x2_heads.*` | contact sheets viewed |
| XB | X2-audio (nine tracks) | `tools/music/songs/x2_*`, `assets/audio/music/x2_*`, `tools/audio/x2_*`, `assets/audio/sfx/x2_*`, `assets/audio/ambience/x2_*`, `assets/audio/manifest.json` (via `build.py`), `docs/MUSIC_X2.md`, `docs/SUNO_PROMPTS.md`, `qa/audio/x2_*`, `qa/music/x2_*` | `node qa/run.mjs music audio pwa` |
| **XC** | X2-maps-a | `src/data/maps/x2_cairnwatch.js`, `x2_hut_maren.js`, `x2_weald.js`, `x2_southmere.js`, `east_road.js`, `qa/maps/x2_a_*.test.mjs`, `docs/MAPS_X2_A.md`, previews of these | `mapcheck check`; previews viewed |
| XC | X2-maps-b | `src/data/maps/x2_heronwade.js`, `x2_reed_lodge.js`, `x2_isle.js`, `x2_keeper_cottage.js`, `nameless_hollow.js`, `nh_chapel.js`, `qa/maps/x2_b_*.test.mjs`, `docs/MAPS_X2_B.md`, previews of these | same |
| **XD** | X2-maps-c | `src/data/maps/x2_quarry.js`, `x2_light_f1.js`, `x2_light_f2.js`, `x2_cistern.js`, `court_f1.js`, `court_f2.js`, `court_f3.js`, `qa/maps/x2_c_*.test.mjs`, `qa/maps/x2_regression.test.mjs`, `docs/MAPS_X2_C.md`, previews of these | `mapcheck check` and `beams`; regression green |
| **XE** | X2-integrate | `src/data/x2/live.js` flip, `X2_MAPS_LISTED`, `qa/pwa/budget_ratchet.json` (to 6.45), `qa/autoplay_x2.py`, `qa/integrate/x2_*`, `qa/shots_x2.json`, seam fixes | full gate list, then **P2** |
| **XF** | X2 review (`X2-review.md`), then X2-fixes (orchestrator-written) | `docs/REVIEW_X2.md`; fixes per list | full gate list, then **P2b** (only if anything changed) |

Disjointness check, by shared file: `tools/sim/**` X1-battle (W1) then X2-battle (XA); `src/world/*` and `mapcheck.mjs` X1-world (W2) then X2-world (XA); the audio manifest X1-audio (W4) then X2-audio (XB); `tiles.json` and shared atlases nobody (fragments); `rules.js`, `encounters.js`, `expcurve.js` X1-battle only; `valley.js`
and `willowmere.js` X1-maps-hub only; `east_road.js` X2-maps-a only; `nameless_hollow.js` and `nh_chapel.js` X2-maps-b only; `court_f*.js` X2-maps-c only; `src/main.js`, `packs.js`, `maps.js`, `assets.js` XP-packs only.

## 3. Closing a wave (orchestrator checklist)

View every preview, contact sheet and shot the agents report; run `node qa/core/sync-manifest.mjs --pack x1` (or `x2`) and `python tools/pwa/build_pwa.py --check` once; run the area tests named in the table; read the reports for "stubbed" ids and make sure the owner of that id fixes it in the next wave; update `PLAN.md`; commit the wave (one commit per agent where possible).

## 4. The publish gate list (P1, P1b, P2, P2b; `docs/HANDOFF.md`)

Publish = `git push origin overhaul:main`, only after **all** of: `python next/tools/pwa/build_pwa.py` (commit `sw.js`, `index.html`, `assets/pack_files.json` if changed); `LQ_RELEASE=1 node next/qa/run.mjs pwa`; root `node qa/run-gate.cjs`; `node next/qa/run.mjs` (a flaky `walks` or `abilities_walks` test is rerun alone first);
`python next/qa/shots.py` with zero errors (the count grows: 125 today, plus the 15 Episode 1 expansion shots, plus the 14 Episode 2 ones). Expansion extras: `node tools/sim/simulate.mjs --check` "All targets met" with the optional-EXP caps; the budget line inside the ratchet (6.38 MB at P1, 6.45 MB at P2, cap 6.5, tap prompt 2.32); the pack-forced-failure run; the
autoplay logs of both routes. Then verify live: wait about 2 minutes and load the page headless (desktop and phone profiles, no console errors) and walk through one gate of the new content so the pack loads from the network, then reload offline. Update `HANDOFF.md` and `PROGRESS.md` (a plain paragraph from the integrate report).

## 5. Launch prompts (one line per agent; replace `<TODAY>` with the grounded Eastern date; the orchestrator adds nothing else)

Common head used by every line: `Lexicon Quest, repo D:\LexiconQuest, branch overhaul, work only in next/. Today is <TODAY> (Eastern). Read next/docs/briefs/COMMON.md, next/DESIGN.md, next/docs/EXPANSION_RECONCILIATION.md (it wins any conflict), the plan named below and your brief, in that order. No git, no em dashes, bound every command, stay in your owned paths, report as the brief says.`

**Episode 1**
- XP-packs: `You are XP-packs, job 1 of X1 wave W1. Plans: next/docs/EXPANSION1_PLAN.md section 11.6 and next/docs/EXPANSION2_PLAN.md section 15. Brief: next/docs/briefs/XP-packs.md. Build the one pack mechanism, the budget ratchet and the seams; you are the only agent allowed to edit src/main.js, src/game/packs.js, src/world/maps.js, src/core/assets.js, tools/pwa and qa/pwa.`
- X1-story: `You are X1-story, X1 wave W1. Plan: next/docs/EXPANSION1_PLAN.md. Brief: next/docs/briefs/X1-story.md. Write the scenes, cast, quests (quest EXP 8, 12, 8, 6, 12, 8), text and the single X1_NAMES_TO_CONFIRM constant; register by register(), edit no shared data file.`
- X1-battle: `You are X1-battle, X1 wave W1. Plan: next/docs/EXPANSION1_PLAN.md section 7. Brief: next/docs/briefs/X1-battle.md. Create src/data/expcurve.js (every scale 1.0, EXPANSION_FOE_EXP_MUL 0.1), the expMul mechanism, the three foes, encounters, loot, items, shops, and the sim additions with checkOptionalCaps(); no existing reward may change.`
- X1-world: `You are X1-world, X1 wave W2. Plan: next/docs/EXPANSION1_PLAN.md section 11. Brief: next/docs/briefs/X1-world.md. Build Appraise on objects (existing range), give('exp', n), the mapcheck unlocker and the link allowlist for both expansions.`
- X1-tiles: `You are X1-tiles, X1 wave W2. Plan: next/docs/EXPANSION1_PLAN.md section 10. Brief: next/docs/briefs/X1-tiles.md. Write only x1_ files (assets/tiles/x1.png and x1_tiles.json, x1_ backdrops); touch no shared sheet or manifest.`
- X1-sprites: `You are X1-sprites, X1 wave W2. Plan: next/docs/EXPANSION1_PLAN.md section 10.2. Brief: next/docs/briefs/X1-sprites.md. New x1_ atlases only; no shared atlas, heads file or manifest.`
- X1-maps-west: `You are X1-maps-west, X1 wave W3. Plan: next/docs/EXPANSION1_PLAN.md sections 3, 4.1 to 4.3. Brief: next/docs/briefs/X1-maps-west.md.`
- X1-maps-south: `You are X1-maps-south, X1 wave W3. Plan: next/docs/EXPANSION1_PLAN.md sections 3, 4.7 to 4.9. Brief: next/docs/briefs/X1-maps-south.md.`
- X1-maps-north: `You are X1-maps-north, X1 wave W3. Plan: next/docs/EXPANSION1_PLAN.md sections 3, 4.4 to 4.6. Brief: next/docs/briefs/X1-maps-north.md.`
- X1-maps-wild: `You are X1-maps-wild, X1 wave W4 (beside X1-audio). Plan: next/docs/EXPANSION1_PLAN.md sections 3, 4.12, 4.13. Brief: next/docs/briefs/X1-maps-wild.md.`
- X1-audio: `You are X1-audio, X1 wave W4 (beside X1-maps-wild). Plan: next/docs/EXPANSION1_PLAN.md section 10.4. Brief: next/docs/briefs/X1-audio.md. Eight tracks, ten SFX in pack x1, two ambiences; you are the only writer of the audio manifest.`
- X1-maps-hub: `You are X1-maps-hub, X1 wave W5, alone. Plan: next/docs/EXPANSION1_PLAN.md sections 4.10 and 12. Brief: next/docs/briefs/X1-maps-hub.md. Baseline first; edit only valley, willowmere and archive_f1 to f3, gated by x1On().`
- X1-integrate: `You are X1-integrate, X1 wave W6, alone. Plan: next/docs/EXPANSION1_PLAN.md sections 12 to 15. Brief: next/docs/briefs/X1-integrate.md. No data merges; two autoplay routes; budget ratchet to 6.38 MB; flip X1_LIVE last; do not publish.`
- X1-critic: `You are the X1 critic, wave W7, read-only. Brief: next/docs/briefs/X1-review.md (critic section). Write docs/CRITIQUE_X1.md only.`
- X1-play-critic: `You are the X1 play-critic, wave W7, read-only, after the critic. Brief: next/docs/briefs/X1-review.md (play-critic section). Write docs/PLAYTEST_REVIEW_X1.md only.`

**Episode 2 (only after P1b)**
- X2-story: `You are X2-story, floating slot after X1 W3. Plan: next/docs/EXPANSION2_PLAN.md sections 3, 7, 8, 13. Brief: next/docs/briefs/X2-story.md. New files only; Q1 is Strangers' Stores; quest EXP 6, 4, 8, 4, 4, 8.`
- X2-battle: `You are X2-battle, X2 wave XA. Plan: next/docs/EXPANSION2_PLAN.md sections 9 and 10. Brief: next/docs/briefs/X2-battle.md. Edit no shared EXP file; ordinary Quarry foe is delver_shade, groups qy_*; every new optional group carries EXPANSION_FOE_EXP_MUL; add x2.mjs to the sim.`
- X2-world: `You are X2-world, X2 wave XA. Plan: next/docs/EXPANSION2_PLAN.md sections 6 and 15. Brief: next/docs/briefs/X2-world.md. Block art by id, ink over water, x2_check.mjs only; Appraise and give('exp') already exist.`
- X2-tiles: `You are X2-tiles, X2 wave XB. Plan: next/docs/EXPANSION2_PLAN.md sections 4 and 12.1. Brief: next/docs/briefs/X2-tiles.md. x2_ files only; the quarry is not the barrow (different floor, walls, mood).`
- X2-sprites: `You are X2-sprites, X2 wave XB. Plan: next/docs/EXPANSION2_PLAN.md sections 8, 9, 12.2. Brief: next/docs/briefs/X2-sprites.md. New x2_ atlases only; delver_shade, not barrow_shade.`
- X2-audio: `You are X2-audio, X2 wave XB. Plan: next/docs/EXPANSION2_PLAN.md section 11. Brief: next/docs/briefs/X2-audio.md. Nine tracks: the Weald (x2_weald) and Southmere (x2_shore) are two different tunes.`
- X2-maps-a: `You are X2-maps-a, X2 wave XC. Plan: next/docs/EXPANSION2_PLAN.md sections 2, 4.1, 4.2, 4.4, 4.7, 5, 6. Brief: next/docs/briefs/X2-maps-a.md.`
- X2-maps-b: `You are X2-maps-b, X2 wave XC. Plan: next/docs/EXPANSION2_PLAN.md sections 2, 4.5, 4.6, 4.8, 4.9, 5, 6. Brief: next/docs/briefs/X2-maps-b.md.`
- X2-maps-c: `You are X2-maps-c, X2 wave XD, alone. Plan: next/docs/EXPANSION2_PLAN.md sections 4.3, 4.10 to 4.12, 5, 6, 13. Brief: next/docs/briefs/X2-maps-c.md. The dungeon is x2_quarry.`
- X2-integrate: `You are X2-integrate, X2 wave XE, alone. Plan: next/docs/EXPANSION2_PLAN.md sections 9.6, 13, 15 to 18. Brief: next/docs/briefs/X2-integrate.md. Two autoplay routes; ratchet to 6.45 MB; flip X2_LIVE last; do not publish.`
- X2-review: `You are the X2 reviewer, wave XF, read-only. Brief: next/docs/briefs/X2-review.md. Write docs/REVIEW_X2.md only.`
