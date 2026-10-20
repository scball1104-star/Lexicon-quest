# Lexicon Quest NEXT: session handoff (2026-10-20, about 14:45 ET)

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
  - Wave 10b: E2-sprites done and committed. **Wave 10b is complete and committed: E2-world, E2-maps, E2-sprites and E2-audio** (precache rebuilt, 2706037).
    Nothing was left running in the old session. Their files land uncommitted in the working tree. In the new session: `git status`, wait until no
    files are still changing (or check the old session), run `node next/qa/run.mjs`, view their previews
    (`next/tools/maps/previews/*`, `next/qa/world/out/*`, `next/tools/music/out/*`), then commit each piece.
    Next: run the full gate list once, then start Wave 10c.
  - E2-world delivered the ep2 merge, `give('gold', n)` and story flags into battles. E2-maps set `EP2_MAPS_LISTED = true`.
    Known map nits (docs/MAPS.md section 6): Dash-broken F1 pane reads as a floor stripe; feather uses a stand-in sprite.
  - Then Wave 10c and 10d per the plan, then a critique + design playtest of Episode 2, a fix pass, the full gate list,
    and publish. Episode 2 shows on the title screen only after `ep1_complete` (or `?ep=2`).
- Small backlog: Episode 2 reflection timeline heads read as blobs; drawn Episode 2 portraits are simpler than the
  painted Episode 1 ones; a 2x Briar Alpha avatar; autoplay does not visit the Hollow.

## Heartbeat
The old session's 3-hourly cron dies with it. Recreate it in the new session (CronCreate, e.g. `17 */3 * * *`) with a
prompt like: "Lexicon Quest NEXT heartbeat with the usage guard: ground the date, check get_usage, read
next/PLAN.md and next/docs/HANDOFF.md, integrate finished agent work after viewing images, launch the next
Episode 2 wave within the guard, publish only after the full gate list, update PLAN.md and PROGRESS.md, no em dashes."
