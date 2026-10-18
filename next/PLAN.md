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
- [ ] C1 Quantize painted backdrops (title, battle, dialogue key art) to palette.json with ordered dither so every scene has one pixel density
- [x] C2 Bram and Mira sprites match their portraits (done before the critique ran)
- [ ] C3 Battle stage: indigo lower band, ellipse shadows under units, one baseline so the party does not float
- [ ] C4 Timeline icons: chibi head icons with side-colored frames (replaces eyebrow crops)
- [ ] C5 Battle-start shatter: axis-aligned slices over mosaic, no free-angle rotation of pixel art; remove the stray glyph
- [ ] C6 Archive void: flat #14101e instead of the loud hatched brown; wall faces and pillars for depth; confirm F3 pit and valley navy rectangle are intended art
- [ ] C7 Lantern/brazier light: dithered radial falloff with max blend instead of overlapping alpha discs
- [ ] C8 Enemy battle sprites: remove downscale speckle, add selective outlines
- [ ] C9 Plaza cobble contrast lower than actors
- [ ] C10 Victory window overlaps help bar and timeline (integrator)
- [ ] C11 Slash fx: thicker arc, impact star, visible hit-stop
- [ ] C12 Touch: menu rows too small on phone, add tap-to-select; tablet A/B buttons bigger
- [ ] C13 Battle shows "Hero" while menus show the chosen name (integrator, bug)
- [ ] C14 Game over asymmetric black top band
- [ ] C15 Followers spawn stacked on the leader (integrator)
- [ ] C16 Library rug reads as a tile grid
- [ ] C17 Ambient particles missing from field shots
