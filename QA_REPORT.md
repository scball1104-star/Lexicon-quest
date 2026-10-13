# Current QA — Suno-ready Audio

No Suno exports are included yet. The soundtrack catalog and playback/import system are ready, with the existing synthesized music as fallback. Simulated-DOM checks pass for all audio scene types, user-gesture startup, persistent MP3 import/removal, unavailable-storage session fallback, rapid scene changes, crossfade completion, mute and volume controls, effects gain, save/import settings, validation rejection, background pause/resume, and fallback behavior. All 377 exploration checks and offline asset checks continue to pass. No music-generation credits were spent. Actual music decoding, musical loop edits, loudness matching, and browser/phone listening require the exported tracks.

## Previous visual QA

# Current QA — Runway Visual Upgrade

- All 16 Runway movies are approximately ten seconds at 1280×720. All passed full FFmpeg decoding after H.264/yuv420p/fast-start encoding. Intermediate/end frames were visually reviewed.
- Three RGBA atlases provide 16 scenery sprites, 12 directional party sprites, eight resident sprites, and eight interior furnishing sprites. Canvas command replays of overworld, town center, and inn were inspected.
- 377 navigation checks pass across all regions/towns/interiors with the upgraded image assets loaded. Existing progression, shops, forge, inns, restoration choices, caches, import/export, dialogue, settings, and movement blocking pass in a simulated DOM. Animated dialogue startup/stop and motion-off behavior also pass.
- All 36 runtime assets are precached; offline movie byte ranges and old-cache removal pass.
- Real-browser layout, physical-phone performance, and full human campaign play remain pending.

## Earlier QA history (superseded media details)

# Automated QA Report

## Modern pixel RPG & cinematic update — 2026-10-08

- All five JavaScript files passed syntax checks.
- Actual game, presentation, native art, and desktop layers initialized successfully in a simulated DOM.
- Character naming, opening clip and skip callback, progressive dialogue reveal, portrait identity, history, save/export/import, all eight chapter transitions and ending, video failure/reduced-motion fallbacks, modal keyboard movement blocking, gallery unlocks, saved settings, legacy saves, HTML-safe name rendering, and Willowmere/regional dialogue return passed.
- Service-worker tests confirmed all 31 runtime assets exist and are precached; old game caches are removed while unrelated caches remain; full offline fallback, regular/open-ended/suffix MP4 ranges, invalid ranges, and unavailable-asset responses passed.
- All sixteen MP4 clips passed metadata checks and complete FFmpeg decoding. Every clip is six seconds, 960×540, H.264, yuv420p. One incomplete file found during validation was rerendered and the entire set rescanned.
- Generated atlases and a decoded guardian-scene frame were visually inspected.
- Real browser screenshots, autoplay behavior on Safari, responsive layout, and physical-device playtesting remain pending. These checks are not represented by the simulated DOM tests.
- Runway installation was confirmed, but generation tools were not exposed to this session. The bundled clips are FFmpeg-composed motion art; no Runway credits were spent.

Earlier report entries below describe previous editions.


## Character-name update — 2026-10-08

- JavaScript syntax checks passed for game and desktop controls.
- A Node VM ran the actual game code with a simulated DOM: character form, blank-name rejection, input focus, Unicode/whitespace normalization, 20-character limit, opening dialogue, HUD, Chronicle menu, battle party display, stable combat/sprite IDs, independent save slots, save/reload, save export/import, legacy-save fallback, safe HTML text insertion, and cancel without overwriting passed.
- Naming the hero Mira retains independent hero stats and party IDs.
- Service-worker cache bumped to load the changed assets.
- Real browser and physical-device checks were not run: the runtime lacks a browser, and the browser download was unavailable. Enter-key and responsive layout support were inspected in the source.

The following QA entries describe the prior edition and were not rerun for this change.


- Campaign scripted checks: see packaged test metadata; eight chapter boss/transition scenarios and one continuous 8-boss campaign passed.
- Three save slots retained distinct state.
- Save export/import round-trip passed.
- Service worker install, activation, old-cache cleanup, online caching, and offline fallback passed in a simulated worker environment.
- Responsive CSS includes explicit portrait and landscape rules plus viewport-fit safe-area support.
- Touch audit enforces a 44px minimum for buttons, answers, inputs, and text areas.
- Clue editorial audit: 106 unique answers; no duplicate primary/secondary clues, no answer leaked verbatim in its clues, and all audited clue strings met the minimum editorial length.

Physical iPhone low-memory testing is still not represented by this automated report.

## Crossword & balance certification
- 200 generated crossword seals (25 per chapter) passed structural validation. Minimum observed crossings: 6.
- Recommended levels by chapter: 1, 3, 5, 7, 9, 12, 15, 18.
- Story/Standard/Veteran boss HP scales were verified monotonic across all eight chapters.
- Underleveled XP catch-up: 1.25x; substantially overleveled XP: 0.85x.

## Remaining external certification
- Physical low-memory iPhone performance remains unverified.
- 15–20-hour campaign duration remains unverified until complete human playthrough telemetry is collected.

## Desktop Keyboard + Mouse Regression — October 2026

A Chromium interaction harness loaded the production HTML, game script, and desktop-control layer together and exercised the PC input paths.

Passed checks:
- Desktop keyboard guide injected.
- `1` opens New Game and selects a save slot.
- New game reaches the overworld using keyboard dialogue advance.
- Mouse click on an adjacent overworld tile moves the party.
- `M` opens the Chronicle; `Escape` returns to the overworld.
- Mouse can enter regional ruins from the Chronicle.
- WASD moves inside ruins; `Escape` leaves them.
- WASD pathing can reach and interact with the regional guide.
- WASD exploration can open the crossword seal.
- `1` selects a crossword clue and focuses the answer field.
- WASD exploration can enter a monster battle.
- `1` activates the first battle command and selects a multiple-choice answer.
- `?` toggles the desktop controls guide.
- No uncaught JavaScript exceptions were reported during the run.

The touch interface remains present and uses the same underlying gameplay actions.


## Latest update: Expanded Exploration

377 reachability/navigation checks pass across all regions and town/service interiors. Inn healing/payment, shop and forge returns, regional testimony/evidence and restoration choices, secret caches, save import/export, collisions, map-modal blocking, and mobile canvas sizing pass in a simulated DOM. Existing presentation and service-worker/offline-video tests pass. Canvas command replays were visually inspected. Real browser and physical-device layout/performance checks remain pending for this update.
