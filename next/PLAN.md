# NEXT build plan (living backlog)

Orchestrator: the main Claude session. Agents pick work only from their brief; the orchestrator updates this file.
Status keys: [ ] todo, [~] in progress, [x] done (merged), [!] blocked.

## Wave 1: foundations (parallel, separate folders)
- [x] W1-core: engine loop, renderer/scaling, input (kbd/pad/touch), assets, save, font renderer, scene stack, debug API, qa harness (`src/core`, `src/main.js`, `index.html`, `qa/run.mjs`, `qa/shots.py`)
- [x] W1-tiles: palette.json + terrain/structure tilesets for town, valley, archive, interiors (`tools/art/tiles`, `assets/tiles`)
- [x] W1-sprites: party field+battle sprites, townsfolk, props, enemies, bosses, portraits, field enemy sprites (`tools/art/sprites`, `assets/sprites`)
- [x] W1-ui-art: bitmap fonts, window skins, cursor, icons, battle UI bits (`tools/art/ui`, `assets/ui`)
- [x] W1-audio: SFX + jingles + ambience generators and files, audio manifest (`tools/audio`, `assets/audio/sfx|jingles|ambience`)
- [x] W1-content: Episode 1 story script, NPCs, quests, items, enemies, encounters, shops, loot tables (`src/data`, `docs/story`)
- [x] W1-battle-rules: pure battle logic: CTB, damage, weakness/break, statuses, fury, combos, AI, loot rolls + tests (`src/battle/*.js` pure, `qa/battle`)
- [x] W1-music: composed tracks archive/mystery/sorrow/triumph via tracker (Suno blocked in-app; prompts in docs/SUNO_PROMPTS.md)

## Wave 2: systems on top of foundations
- [x] W2-world: tilemap + autotile renderer, actors, followers, NPC behaviors, events, cutscene runner, camera, lighting, particles, transitions, field scene
- [x] W2-ui: dialogue (typewriter, portraits, blips, choices), main menu (items/equip/tech/status/journal/bestiary/config/save), shop, name entry, title, save/load, options
- [x] W2-battle-scene: battle presentation over the pure rules: layout, timeline, commands, targeting, animations, fx, rewards, level-up
- [x] W2-maps: author Willowmere (+ interiors), Willowmere Valley, Archive F1-F3 + boss room, with a map preview tool

## Wave 3: integration
- [x] W3-integrate: full flow title -> prologue -> town -> valley -> archive -> boss -> ending -> credits; autoplay test; publish /next

## Wave 4+: polish loops (repeat all week)
- [ ] critic passes (art, UX, combat feel, story) on qa/out screenshots -> issue lists here
- [ ] fix passes per issue list
- [ ] balance simulation, mobile/touch pass, performance pass, accessibility/options pass

## Polish backlog (found in review)
- [ ] Battle timeline face crops (14x14) read as orange squares; use 12x12 head icons drawn for the purpose, plus enemy silhouettes
- [ ] Enemies have a single battle frame; add a 2-frame idle breathe and a hurt squash in code
- [ ] Long telegraph sentences get cut with an ellipsis in the help window; wrap to two lines

## Wave 4 polish backlog from docs/CRITIQUE_1.md (ranked)
- [x] C1 Quantize painted backdrops (title, battle, dialogue key art) to palette.json with ordered dither so every scene has one pixel density
- [x] C2 Bram and Mira sprites match their portraits (done before the critique ran)
- [x] C3 Battle stage: indigo lower band, ellipse shadows under units, one baseline so the party does not float
- [x] C4 Timeline icons: chibi head icons in the timeline: chibi head icons with side-colored frames (replaces eyebrow crops)
- [x] C5 Battle-start shatter: axis-aligned slices over mosaic, no free-angle rotation of pixel art; remove the stray glyph
- [x] C6 Archive void: flat #14101e instead of the loud hatched brown; wall faces and pillars for depth; confirm F3 pit and valley navy rectangle are intended art
- [x] C7 Lantern/brazier light: dithered radial falloff with max blend instead of overlapping alpha discs
- [x] C8 Enemy battle sprites: remove downscale speckle, add selective outlines
- [x] C9 Plaza cobble contrast lower than actors
- [ ] C10 Victory window overlaps help bar and timeline (integrator)
- [x] C11 Slash fx: thicker arc, impact star, visible hit-stop
- [x] C12 Touch: menu rows too small on phone, add tap-to-select; tablet A/B buttons bigger
- [ ] C13 Battle shows "Hero" while menus show the chosen name (integrator, bug)
- [x] C14 Game over asymmetric black top band
- [x] C15 Followers spawn stacked on the leader (integrator)
- [x] C16 Library rug reads as a tile grid
- [x] C17 Ambient particles missing from field shots
- [x] W4b-ui-polish: title and prologue use assets/backdrops/title.png and dialog_keyart.png; game over band (C14); any leftover UI items

## Wave 5: second critique and design playtest (read-only reviews, then fix passes)
- [x] critic-2: art/UX critique on fresh shots -> docs/CRITIQUE_2.md
- [x] play-critic: pacing, clarity, difficulty, fun review from the autoplay frames and dialogue log -> docs/PLAYTEST_REVIEW_1.md
- [x] battle touch rows + Auto/Speed hint in the battle help window (W4b proposal)
- [x] fix passes from both reviews (W5 story/maps, W5 systems, W5 art); W5b-ui in progress

## Wave 5 visual backlog from docs/CRITIQUE_2.md (ranked; Bram item was stale, asset is correct)
- [x] D1 Key-art screens (title, prologue, name entry, credits) still show 10k+ colors: dither the vignette/overlays instead of alpha-blending, draw the quantized atlas 1:1 (ui, W5b)
- [x] D2 Valley battles use the dusk town painting: build a daytime valley backdrop from the tiles/map vista (W5-art)
- [x] D3 Bookmites and the Archivore base go near-black on the dark Archive stage: rim light on dark sprites or a lighter stage band (W5-art + battle)
- [x] D4 Hidden-ink pits and bridges are flat navy rectangles: real ink art with edges, ripples, and revealed-bridge planks (W5-art)
- [x] D5 Valley terrain is blocky (rectangular tall grass, straight road): shape patches and curve the road (W5-story-maps)
- [x] D6 Text runs to the window edge in places: enforce 8 px padding in dialog/menus (W5b)
- [x] D7 Cursor glove clipped at x=0 in Shop and Journal (W5b)
- [x] D8 Touch chrome RUN/MENU pills about 14 css px: enlarge (W5b, core/touch)
- [x] D9 Push block reads as a cabinet: redraw as a carved stone block with a handle groove (W5-art)
- [x] D10 Inconsistent confirm glyphs between screens (W5b)
- [x] D11 Empty Victory window on no-drop fights; Fury READY label overlaps the gauge (W5b)
- [x] D12 qa/shots.py: wait for typewriter completion before capturing story shots; re-render stale map previews (W5b)

## Usage guard (Scott 2026-10-19 / 10-20): up to 3 agents under 75% weekly, 1 to 85%, none above
- [x] Scott playtest: bridges blinking, weakness row under command window on phone, hero Swap greyed, gear bonuses on Status

## Wave 6: depth and polish (PARKED on wip/w5b-w6-partial, finish one at a time)
- [x] W6-pwa: loading screen, installable PWA with its own service worker, lazy music, size budget
- [x] W6-anim: enemy/boss attack, hurt, cast, death and stance frames; party breathe, crit, combo, level-up frames
- [x] W6-content: Whisperwood Hollow optional dungeon with the Briar Alpha mini-boss and the Thornwake unique
- [x] critic-3 on the current build (docs/CRITIQUE_3.md); then publish W6

## Backlog from W6 review and CRITIQUE_3 (not yet assigned)
- [x] Briar Alpha and other borrowed-art enemies scale by 1.3x (non-integer, blurs pixels): give them their own recolored frames at 1x, or 2x for bosses
- [x] Whisperwood Hollow battles use the daytime meadow backdrop: compose a root-cave backdrop (or reuse battle_archive with a green tint)
- [x] fx.js death dissolve ignores sprite scale
- [x] CRITIQUE_3 #3 Archive floors look alike and float in black (art + maps)
- [x] CRITIQUE_3 #4 ink pits still read as flat rectangles at a distance (art)
- [x] CRITIQUE_3 #8 Bram's gate sprite is not Bram (data: use the party sprite before he joins)
- [x] CRITIQUE_3 #10 field Archivore avatar does not match the battle boss (art)
- [x] CRITIQUE_3 #12 music reuse: mystery/sorrow cues in story scenes, a distinct F3 or boss-door cue (content + audio)
- [ ] Next big steps (CRITIQUE_3): party field abilities; Lantern upgrade; Episode 2 vertical slice

## Wave 9 (running)
- [x] W9-abilities: Hero Dash Strike, Mira field Appraise + Lantern, Bram Shove; optional uses placed in existing maps
- [x] play-critic-2: docs/PLAYTEST_REVIEW_2.md
- [x] ep2-designer: docs/story/EPISODE2.md + docs/EPISODE2_PLAN.md (build briefs for the second realm)

## Done: Episode 1 fix pass (W10). Next: Episode 2 build (docs/EPISODE2_PLAN.md, after the weekly usage reset)
