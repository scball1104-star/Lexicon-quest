# Lexicon Quest NEXT: session handoff (updated 2026-11-04, 05:00 ET)

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
- **Shared with Stephen Ball since 2026-10-28.** Read the root `AGENTS.md` first: it is the rulebook both Claudes
  follow. `overhaul` is on GitHub and protected (pull requests only, no force pushes). The orchestrator commits agent
  work on a `scott/<wave>` branch from the latest `origin/overhaul`, opens a pull request, and merges it when the
  NEXT gate check is green. Pull `overhaul` before every session; Stephen's merges land there too.
- Agents never run git and stay in their brief's owned paths.
- Publish ("ship"; Scott or Stephen may call it) = `git push origin overhaul:main` from an up-to-date overhaul, ONLY
  after all of: `python next/tools/pwa/build_pwa.py` (commit sw.js and
  index.html if changed), `LQ_RELEASE=1 node next/qa/run.mjs pwa`, root `node qa/run-gate.cjs`, `node next/qa/run.mjs`,
  `python next/qa/shots.py` (212 shots, zero errors). Then verify live: wait ~2 min and load the page headless
  (desktop + phone profiles, no console errors). Then comment on the pinned Ship log issue.
- View agents' preview images before committing their work. No em dashes anywhere. Commit trailer:
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` (or the current model).
- Usage guard (Scott): check `mcp__ccd_session_mgmt__get_usage`. Weekly (all models) under 75% = up to 3 agents at
  once; 75 to 85% = one at a time; over 85% = none. Weekly resets Tuesdays 9am ET. Fable may be capped; use Opus or
  Sonnet. Leave room for Scott's scheduled loops and the teams' schedule generators.
- Flaky-test note: `qa/world/walks.test.mjs`, `labs_walks` and `abilities_walks` run Chromium; if one fails in the full run, rerun
  it alone before treating it as real.

## Status at handoff
- **Shipped 2026-11-09 on Scott's word ("Finish episode 5 and ship 4 and 5 together"): live main = d93eef5 (sw a70984db134f).**
  Episode 5 "The Last Prophecy" (PR #51, issue #50; `EP5_LIVE` on, lazy `ep5` pack; design `docs/EPISODE5_PLAN.md`, story
  `docs/story/EPISODE5.md`, reviews `docs/CRITIQUE_7.md` and `docs/PLAYTEST_REVIEW_7.md`) plus the Episode 4 polish held since
  11/5 (#46 to #49). TRAPS from the build: (1) a bot never opens the battle menu, so a no-target skill (Turn the Sky) buzzed for
  players while every bot passed; `qa/battlescene/ep5_menu_cast.test.mjs` and `qa/realplay/ep5battle.py` now cast it through
  the menu; (2) generated pack manifests (`assets/ep5_manifest.json`) must be committed at each wave close; (3) the main
  checkout D:\LexiconQuest held 395 files CRLF in the working tree against LF in the index, so build `sw.js` in an LF worktree
  (D:\lq-lf2, detached with `-c core.autocrlf=false`); (4) `qa/world/ep5_shade.test.mjs` hour-change timing and `x1_wild` fail
  under full-suite load and pass alone; `field_aim` shot likewise.
- **Episode 4 "The Sunken Keep": BUILT 2026-11-04 overnight on `scott/ep4-build`, PR #37 into overhaul. NOT shipped.** All of it
  is in the lazy `ep4` pack (`src/data/ep4/`), behind `EP4_LIVE` in `src/game/episodes.js` (true on the branch; it rides to
  overhaul on). Waves: pack, story, battle, tiles, sprites, world, maps A and B, audio, scene-ui, integrate, critique 6 and
  playtest review 6 (`docs/CRITIQUE_6.md`, `docs/PLAYTEST_REVIEW_6.md`), fixes A and B (brief `docs/briefs/E4-fixes.md`).
  Autoplay clears it (desktop and phone, from an Episode 3 save and the quick start, 0 game overs). Open for Scott and
  Stephen: the story cuts and the Witness Book wording (STAGING_EP4.md section 4, PENDING), the three close-up inserts
  (C3), new keep battle backdrops (C5), party staging over Vex (C11), the Barrister look (C12), the off-screen seal wash
  pan (P6). TRAPS: `qa/integrate/out/` scratch got committed in 1360c02 (harmless; removal was declined); agents flip line
  endings, so diff each file against HEAD's style before committing; `build_pwa.py` lives in `tools/pwa/`.
- **Shipped 2026-11-02 14:38 ET on Scott's word: live main = 9c1b2de (sw ded590e0379d).** The five painted story cards and the SFX dozen (#21), sw.js rebuilt from an LF checkout (#23). TRAP: this Windows checkout has core.autocrlf on, so `build_pwa.py` hashes a different sw.js version and the pwa load-budget test over-measures; before a ship, rebuild and run `LQ_RELEASE=1 node next/qa/run.mjs pwa` in an LF checkout (`git worktree add`, then inside it `git -c core.autocrlf=false rm --cached -r -q . && git -c core.autocrlf=false reset --hard`). `shots.py` needs `--timeout 3000` here (212 shots take about 950 s). Stephen shipped 0bca403 on 10/29 (the Kids Edition under /kids/). Open on #9: Scott's answers on the video test and the trailer brief, a bells retake, November's nine Suno themes.
- **Shipped 2026-10-28 15:58 ET on Scott's word: live main = d77f904 (sw ebb3d0b4b07b).** What went out, all of it through pull
  request #11 (merged into overhaul, then `push overhaul:main`): the responsibility arc (cold open "The Thirteenth Toll", vows,
  the Ledger), the Deep Stacks with `CAVE_LIVE` on (100 floors, sixty uniques in three grades, the critic's fix pass), Fine Print
  (the post-credits tier, `tier_1`), all twelve battle stages as paintings, twenty Suno Pro themes. Verified live on desktop and
  phone sizes with no console errors, the cave pack loading from the network; the note is on Ship log issue #4. Open: Scott's calls
  (Fine Print gold x1.5 and shop 1.25x, six legendary names, 44 placeholder unique names, the plaque's "n of 61" wording), two
  art gaps (the Binder's page-burst fx and sound, Hollis's 48 px head), the media leftovers under issue #9 (story cards, SFX,
  the video test, the trailer, nine themes in November), Episode 3 (waits for Scott).
- **Episode 1: complete and live** (last publish 2026-10-20 11:33, sw version d45f8019607a). Includes the optional
  Whisperwood Hollow, battle animation, distinct Archive floors, field abilities (Dash Strike, Appraise, Shove),
  PWA install, phone UX, two playtest-review fix passes. Autoplay bot (`next/qa/autoplay.py`) clears it with 0 game
  overs.
- **Episode 2 "The Town Without a Name": PUBLISHED to /next 2026-10-21 ~20:20 ET (main 35cf470, sw b5ccac10a979).**
  Players see "Episode 2" on the title once any save has ep1_complete, or with `?ep=2` on the URL.
  - Wave 10a done and committed: E2-story (`src/data/story/ep2.js`, 48 scenes), E2-battle (enemies, Other Selves,
    Nameless King, Kept; simulator targets met), E2-tiles (court and hollow kits, five backdrops).
  - Wave 10b complete and committed (E2-world, E2-maps, E2-sprites, E2-audio). Full `node next/qa/run.mjs`:
    485 green on 2026-10-21 after the Appraise latch fix.
  - Wave 10c (9fa5caa) and 10d (5f09ee5) committed: Episode 2 plays to credits (autoplay, desktop and phone, from an
    Episode 1 save and from newGameEp2, 0 game overs); 505 tests green. Load budget cap now 6.5 MB.
  - W10c, W10d, critic-4, play-critic-3 and the W11 fix pass (Parts A and B) all committed and published.
  - W12 art pass and W13 backlog published (live main b04d6f7, sw 34b003adde62). W14 review and W15 fixes published (live main
    11bdafd, sw f9f5ee9c0a9f). QUEUE DONE; heartbeat cron stopped. Everything further waits for Scott. Episode 3 waits for Scott.
  - Live main = 35cf470 (Episode 2), after two hotfixes earlier today (Load page finger 8a1084a, shop stock 6ae4f00).
  - E2-world delivered the ep2 merge, `give('gold', n)` and story flags into battles. E2-maps set `EP2_MAPS_LISTED = true`.
    Known map nits (docs/MAPS.md section 6): Dash-broken F1 pane reads as a floor stripe; feather uses a stand-in sprite.
  - Then Wave 10c and 10d per the plan, then a critique + design playtest of Episode 2, a fix pass, the full gate list,
    and publish. Episode 2 shows on the title screen only after `ep1_complete` (or `?ep=2`).
- Small backlog: drawn Episode 2 portraits are simpler than the painted Episode 1 ones; a 2x Briar Alpha avatar.
  Done 2026-11-03 (scott/polish-nov3): the reflection timeline heads (build_heads.py glass_head, by role in the owner's
  grid); the Stacks art gaps (the Binder's page burst, src/data/cave/fx.js; Hollis's portrait, cave_portraits.py).
  The Hollow was already in autoplay: `python next/qa/autoplay.py --hollow` (W13).

## Hotfixing the live /next while overhaul carries unpublished work
Whenever `overhaul` is ahead of `main` with unfinished work, `push overhaul:main` would publish it. For a bug Scott reports on the
live build: commit the fix on overhaul, `git worktree add -b hotfix/<name> ../LexiconQuest-hotfix origin/main`,
cherry-pick, run the full gate list there (build_pwa first, commit sw.js), `git push origin hotfix/<name>:main`,
verify live, then bring main back into overhaul by pull request (branch `scott/sync-main` from origin/overhaul,
`git merge origin/main`); sw.js conflicts every time, so take ours and rerun build_pwa.py. Done this way 2026-10-21 for the Load page finger (8a1084a).

## Heartbeat
The 3-hourly heartbeat cron was STOPPED 2026-10-23 when the queue emptied. If Scott restarts work, recreate it (CronCreate) with a
prompt like: "Lexicon Quest NEXT heartbeat with the usage guard: ground the date, check get_usage, read
next/PLAN.md and next/docs/HANDOFF.md, integrate finished agent work after viewing images, launch the next
Episode 2 wave within the guard, publish only after the full gate list, update PLAN.md and PROGRESS.md, no em dashes."
