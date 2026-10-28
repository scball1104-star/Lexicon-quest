# AGENTS.md: the shared rulebook for every Claude working on Lexicon Quest

Two people build this game together, Scott Ball and Stephen Ball, each with his own Claude. This file is how
those Claudes stay in step. **Read it at the start of every session.** If this file and a linked doc disagree,
the linked doc wins and this file is stale: fix it in your pull request.

There is no direct line between the two Claudes. **GitHub is the line**: Issues are the shared to-do list and
claim board, pull requests are where code is discussed. Write everything the other side needs to know there,
in plain words, so a Claude that has never seen your session can pick it up.

---

## What is where

- **`next/`** is the game: Lexicon Quest NEXT, a SNES-style JRPG (vanilla ES modules, one 384x216 canvas).
  Live at https://scball1104-star.github.io/Lexicon-quest/next/
- **The repo root** is the old game, kept as is until Scott and Stephen agree to swap. Do not edit it unless the
  issue says so, but its gate (`node qa/run-gate.cjs`) must still pass.
- `next/DESIGN.md` is the design contract. `next/PLAN.md` is the backlog and build history. `next/PROGRESS.md`
  is the plain-language log. `next/docs/` holds the plans, critiques and agent briefs (`docs/briefs/COMMON.md`
  lists the canonical ids: party, enemies, maps, flags, music).
- Play it locally: from the repo root, `python -m http.server 8777`, open http://localhost:8777/next/ . The
  service worker caches hard: add `?dev=2`, `?dev=3`... to see fresh code.

## The branches

| Branch | What it is | Who changes it, and how |
|---|---|---|
| `main` | What players see. GitHub Pages publishes it on every push. | Scott or Stephen, by "shipping" (below). Never force-pushed. |
| `overhaul` | The shared work line. Everything finished but not yet shipped. | **Pull requests only.** GitHub blocks direct and force pushes. |
| `scott/<topic>`, `stephen/<topic>` | One branch per task, named for whose Claude made it. | Its owner. Deleted after merge. |

## The flow for every change

1. **Issue first.** Every task has an issue. Labels: `idea` (a suggestion, not yet agreed), `approved` (agreed,
   free to build), `bug`, `from-playtesters` (came from the kids' play sessions), `needs-decision` (Scott and
   Stephen must agree before anyone builds).
2. **Claim before you build.** Check the issue has no `claimed:*` label and no open pull request. Then add
   `claimed:scott` or `claimed:stephen` and comment which files you expect to touch. If it is already claimed,
   pick something else or ask in the issue.
3. **Branch from the latest `overhaul`:** `git fetch origin && git switch -c stephen/<topic> origin/overhaul`.
4. **Build, run the tests (below), look at your own work** (screenshots for anything visual).
5. **Open a pull request into `overhaul`** using the template: the issue number, what changed and why, files
   touched, the tests you ran with their results, screenshots, and how much the first download grew.
6. **The other side's Claude reviews it** in comments, in its next session. Review for bugs, for clashes with
   work in flight, and against the decisions below. Say "looks good" or list what must change.
7. **Merge** when the checks are green, the review is done, and the author's human says OK. Either Scott or
   Stephen may merge. Use "Create a merge commit" (keeps every commit identical on both sides). Delete the branch.
8. **If `overhaul` moved while you worked**, merge `origin/overhaul` into your branch, rerun the tests, push.
   Never rebase or force-push a branch someone else may have pulled.

**Keep pull requests small and short-lived** (merged within a day or two). Long-lived branches are where
conflicts come from.

## Shipping (publishing to players)

Scott or Stephen says "ship". Then, from an up-to-date `overhaul`:

1. `python next/tools/pwa/build_pwa.py` (commit `next/sw.js`, `next/index.html`, `next/assets/pack_files.json`
   if they changed, by pull request).
2. All green: `LQ_RELEASE=1 node next/qa/run.mjs pwa`, `node qa/run-gate.cjs`, `node next/qa/run.mjs`,
   `python next/qa/shots.py` (zero errors), `node next/tools/sim/simulate.mjs --check`.
3. `git push origin overhaul:main` (a plain fast-forward; never force).
4. Wait about 2 minutes, load the live page on desktop and phone sizes, no console errors.
5. Comment on the pinned **Ship log** issue: what went out and the commit.

## Tests

```
node next/qa/run.mjs                 # the NEXT suites (about 120 files); filter: node next/qa/run.mjs battle
node qa/run-gate.cjs                 # the old game's gate
node next/tools/sim/simulate.mjs --check          # battle balance targets
node next/tools/sim/simulate.mjs --cave --check   # Deep Stacks balance
python next/qa/shots.py              # screenshot sweep (needs: pip install playwright pillow numpy; python -m playwright install chromium)
python next/qa/autoplay.py           # a bot plays Episode 1 start to credits
```

The same checks run automatically on every pull request (`.github/workflows/next-gate.yml`). Under heavy CPU
load a few tests time out or flake (`x1_gate`, `x1_wild`, `walks`, `abilities_walks`, `qa/battle/sim.test.mjs`):
rerun a failing one alone before treating it as real.

## Rules that keep us from tripping over each other

- **Hot files.** Almost everything touches these, so say so in the issue before editing:
  `next/src/game/state.js`, `next/src/scenes/field.js`, `next/src/data/text.js`, `next/src/data/encounters.js`,
  `next/src/battle/rules.js`, `next/src/game/packs.js`, `next/src/main.js`.
- **Generated files.** `next/sw.js` is written by `build_pwa.py`. On a conflict, take either side and rerun the
  script; never hand-merge it. Feature pull requests do not need to rebuild it; shipping does.
- **Art and audio** (png, webp, mp3, wav) cannot be merged. Claim before replacing one.
- **The first download is nearly full.** `next/qa/pwa/budget_ratchet.json`: the load before the tap prompt is
  held at 2.34 MiB (under 1 KB of room on 2026-10-27) and the initial download at 6.5 MB. Anything new that loads
  at startup must report its gzipped size in the pull request. Put big features in a lazy pack
  (`next/src/game/packs.js`, `docs/PWA_PACKS.md`) and behind an off-by-default flag, the way Episode 3
  (`EP3_LIVE` in `src/game/episodes.js`) and the Deep Stacks (`CAVE_LIVE` in `src/data/cave/live.js`) are built.
- **Old saves.** Players have saves from every published build. New early-game content must check old saves
  (a save past the opening must skip it: see `EP1_DONE_FLAGS`), and nothing may overwrite the autosave without
  asking.
- **No em dashes** in player text, docs or comments. Use commas, colons, periods or " - ".
- **No secrets** (passwords, keys, tokens) anywhere in the repo, issues or pull requests.
- **The repo is public.** No kids' full names, ages, photos or school names. "From the playtesters" is enough.
- **Never rewrite someone else's work** to fit yours. If two plans clash, stop and ask in the issue.
- Each Claude works on its own human's plan usage. Scott's account also runs his business automations, so his
  Claude keeps to a usage limit; do not expect it to answer instantly.

## Decisions already made (change them only together, in an issue)

- The game names no real person and carries no credit or nod to any teacher or author (the responsibility arc
  is subtext, `next/docs/RESPONSIBILITY_ARC.md`).
- The post-credits harder tier is called **Fine Print** (id `tier_1`). Never "Hard Road" in player text.
- The cold open "The Thirteenth Toll" replaced the old six-card prologue.
- The Deep Stacks: 100 floors, sixty uniques in three grades whose odds turn over with depth
  (`next/docs/DEEP_STACKS_PLAN.md`).
## Art and music sources

The game may be sold one day. Add only art, music and sound you have the right to use in a sold game: made in
code, made by one of you, CC0, or generated on a paid plan whose terms allow it. Say the source in the pull
request. Scott's Suno and Runway accounts stay with Scott; ask in an issue if you need something from them.

## Traps already found (each cost real time)

- A new encounter field must be added in **both** `src/data/encounters.js` (`rollEncounter`) **and**
  `src/battle/rules.js`, or it is silently dropped.
- `src/scenes/field.js` remembers defeated foes per map id for the scene's whole life. Any map whose ids repeat
  (the generated cave floors) must clear those entries when a new run starts (`world.js` `beginReading`).
- Boss phase changes forward `sprite` in `ai.js` `enterPhase`; drop it and the boss never changes look.
- `next/qa/cave/out` is not git-ignored: add specific files, never the folder. `next/qa/world/out` images are
  rewritten by the world suite: restore them with `git checkout -- next/qa/world/out`, do not commit them.
  `*.log` is ignored everywhere.
- Dev scenes (`src/scenes/_dev*.js`) are lazy-loaded and kept out of the precache. Keep it that way.

## Commits

Plain messages that say what changed and why. End with your model's trailer, e.g.
`Co-Authored-By: Claude <noreply@anthropic.com>`.
