# W3-integrate: make Episode 1 playable end to end

**Owned paths:** everything under `next/` EXCEPT art/audio generators (`next/tools/**`) and the generated asset
sheets (`next/assets/tiles/*.png`, `next/assets/sprites/*.png`, `next/assets/ui/*.png`, `next/assets/audio/**`).
You may edit any JS/JSON/MD under `next/src`, `next/qa`, `next/docs`, `next/assets/*.json`, `next/index.html`.
You are the only agent writing code now, so cross-module fixes are yours to make; keep each fix small and
in the style of the module you touch, and keep every existing test green (`node next/qa/run.mjs`).

## Goal
A new player opens `next/index.html`, presses New Game, names the hero, watches the prologue, wakes up in
`hero_home`, and can play all the way through Willowmere, the valley, the three Archive floors, the Echo
Warden, the Lantern puzzles, the Archivore, the return to town, the ending hook and the credits, with saves,
menus, shops, inns, side quests, visible enemies and every scripted scene working, on keyboard, gamepad and
touch, with zero console errors. Nothing may strand the player.

## Steps
1. Read `DESIGN.md`, `docs/ENGINE_API.md`, `docs/UI.md`, `docs/WORLD.md`, `docs/BATTLE_SCENE.md`, `docs/MAPS.md`,
   `docs/story/STAGING.md`, `src/game/state.js`, `src/scenes/registry.js`. Run `node qa/run.mjs` and
   `python qa/shots.py` to see the current state; read `qa/out/shots-report.json`.
2. Wire the seams: title -> nameEntry -> prologue -> field(hero_home) -> `wake_up`; every map transfer; every
   `trigger`, `sign`, `book`, `object`, `npc` talk, `door`, `chest`, `pot`, `ferry`, mechanism; shops/inns from NPC
   services; menu from the field; battles from map enemies and from scripted `battle()`; game over -> retry at
   `lastSafe`; `ep1_complete` -> credits -> post-credits return. Fix mismatches between what scripts call and
   what the runner implements (STAGING.md section 1 is the contract; if a primitive is missing, add it).
3. Build `qa/autoplay.py`: a headless Chromium bot that plays the whole episode using `LQ_DEBUG` for
   observation and real inputs for action: it reads `state()`, pathfinds with the maps' walk model (reuse
   `tools/maps/mapcheck.mjs` via node) to reach the next objective from `quests.js currentStep`, talks, fights
   with Auto mode at 2x, opens chests, solves the puzzles by their documented solutions (`docs/MAPS.md`), buys
   gear when gold allows, rests at the inn when HP is low, and reaches the credits. It records a screenshot every
   30 s and on every map change to `qa/out/autoplay/`, logs every dialog line, and fails on any console error,
   any softlock (no progress for 90 s) or any crash. Run it until it passes on desktop and phone profiles.
   Also run a "wrong order" pass: visit every map and talk to every NPC before and after each main flag to
   catch broken conditionals.
4. Save/load round trip at three points (town, F2 after the lantern, before the boss) and a game-over retry.
5. Performance: `LQ_DEBUG.perf()` on `willowmere` and `valley`: logic < 1 ms, draw < 3 ms at 1x; fix hot spots.
6. Update `qa/shots.json` with a `story_*` set (one per major scene) and make `python qa/shots.py` pass with no
   console errors for every shot (remove or fix stale shots from earlier waves).
7. `docs/PLAYTEST.md`: what you played, what you fixed, what still feels off (honest list for the polish wave),
   with a timing table (minutes per segment from the autoplay).

## Rules
No new assets (ask the orchestrator in your report if something is missing and use a placeholder frame
meanwhile). No em dashes. Keep `node qa/run.mjs` green at every step and add tests for every seam you fix.
Do not touch the repo root game. No git.
