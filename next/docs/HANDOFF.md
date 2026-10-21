# Lexicon Quest NEXT: session handoff (updated 2026-10-21, 15:37 ET)

## What this is
Scott's SNES-style JRPG, rebuilt from scratch in `D:\LexiconQuest\next\` as a real pixel game. Scott is away
until about 2026-10-24 and asked for continuous multi-agent work to professional quality. Play link (published):
https://scball1104-star.github.io/Lexicon-quest/next/ . The old game at the repo root stays untouched.

## Read first
1. `next/DESIGN.md` (contract), `next/docs/briefs/COMMON.md` (agent rules), `next/PLAN.md` (backlog and status),
   `next/PROGRESS.md` (Scott-facing log).
2. Memory: `project_lexicon_quest.md`, `feedback_lexicon_quest_usage_budget.md` (usage guard),
   `reference_suno_inapp_browser_blocked.md`.
3. `next/docs/EPISODE2_PLAN.md` section 10 (the Episode 2 build waves) and `next/docs/story/EPISODE2.md`.

## Working rules
- Branch `overhaul`. The orchestrator commits; agents never run git and stay in their brief's owned paths.
- Publish = `git push origin overhaul:main`, ONLY after all of: `python next/tools/pwa/build_pwa.py` (commit sw.js and
  index.html if changed), `LQ_RELEASE=1 node next/qa/run.mjs pwa`, root `node qa/run-gate.cjs`, `node next/qa/run.mjs`,
  `python next/qa/shots.py` (125 shots, zero errors). Then verify live: wait ~2 min and load the page headless
  (desktop + phone profiles, no console errors).
- View agents' preview images before committing their work. No em dashes anywhere. Commit trailer:
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` (or the current model).
- Usage guard (Scott): check `mcp__ccd_session_mgmt__get_usage`. Weekly (all models) under 75% = up to 3 agents at
  once; 75 to 85% = one at a time; over 85% = none. Weekly resets Tuesdays 9am ET. Fable may be capped; use Opus or
  Sonnet. Leave room for Scott's scheduled loops and the teams' schedule generators.
- Flaky-test note: `qa/world/walks.test.mjs` and `abilities_walks` run Chromium; if one fails in the full run, rerun
  it alone before treating it as real.

## Status at handoff
- **Episode 1: complete and live** (last publish 2026-10-20 11:33, sw version d45f8019607a). Includes the optional
  Whisperwood Hollow, battle animation, distinct Archive floors, field abilities (Dash Strike, Appraise, Shove),
  PWA install, phone UX, two playtest-review fix passes. Autoplay bot (`next/qa/autoplay.py`) clears it with 0 game
  overs.
- **Episode 2 "The Town Without a Name": in progress, NOT yet published.**
  - Wave 10a done and committed: E2-story (`src/data/story/ep2.js`, 48 scenes), E2-battle (enemies, Other Selves,
    Nameless King, Kept; simulator targets met), E2-tiles (court and hollow kits, five backdrops).
  - Wave 10b complete and committed (E2-world, E2-maps, E2-sprites, E2-audio). Full `node next/qa/run.mjs`:
    485 green on 2026-10-21 after the Appraise latch fix.
  - Wave 10c (9fa5caa) and 10d (5f09ee5) committed: Episode 2 plays to credits (autoplay, desktop and phone, from an
    Episode 1 save and from newGameEp2, 0 game overs); 505 tests green. Load budget cap now 6.5 MB.
  - Reviews ONE at a time: critic-4 done (docs/CRITIQUE_4.md, 1d6fa2a); play-critic-3 launched 15:37 ET (writes
    docs/PLAYTEST_REVIEW_3.md only); then the fix pass (PLAN.md lists the known items), then publish.
  - Live main = 6ae4f00 (two hotfixes today: Load page finger 8a1084a, shop story stock 6ae4f00), sw 4c0ffd33f8a3.
  - E2-world delivered the ep2 merge, `give('gold', n)` and story flags into battles. E2-maps set `EP2_MAPS_LISTED = true`.
    Known map nits (docs/MAPS.md section 6): Dash-broken F1 pane reads as a floor stripe; feather uses a stand-in sprite.
  - Then Wave 10c and 10d per the plan, then a critique + design playtest of Episode 2, a fix pass, the full gate list,
    and publish. Episode 2 shows on the title screen only after `ep1_complete` (or `?ep=2`).
- Small backlog: Episode 2 reflection timeline heads read as blobs; drawn Episode 2 portraits are simpler than the
  painted Episode 1 ones; a 2x Briar Alpha avatar; autoplay does not visit the Hollow.

## Hotfixing the live /next while Episode 2 is unpublished
`overhaul` carries unpublished Episode 2, so `push overhaul:main` would publish it. For a bug Scott reports on the
live build: commit the fix on overhaul, `git worktree add -b hotfix/<name> ../LexiconQuest-hotfix origin/main`,
cherry-pick, run the full gate list there (build_pwa first, commit sw.js), `git push origin hotfix/<name>:main`,
verify live, then `git merge origin/main` into overhaul; sw.js conflicts every time, so take ours and rerun
build_pwa.py. Done this way 2026-10-21 for the Load page finger (8a1084a).

## Heartbeat
Session 2026-10-21 runs a 3-hourly cron (`17 */3 * * *`, session-only, expires 2026-10-28). A new session must recreate it (CronCreate) with a
prompt like: "Lexicon Quest NEXT heartbeat with the usage guard: ground the date, check get_usage, read
next/PLAN.md and next/docs/HANDOFF.md, integrate finished agent work after viewing images, launch the next
Episode 2 wave within the guard, publish only after the full gate list, update PLAN.md and PROGRESS.md, no em dashes."
