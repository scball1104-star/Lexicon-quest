# NEXT build plan (living backlog)

Orchestrator: the main Claude session. Agents pick work only from their brief; the orchestrator updates this file.
Status keys: [ ] todo, [~] in progress, [x] done (merged), [!] blocked.

## Wave 1: foundations (parallel, separate folders)
- [x] W1-core: engine loop, renderer/scaling, input (kbd/pad/touch), assets, save, font renderer, scene stack, debug API, qa harness (`src/core`, `src/main.js`, `index.html`, `qa/run.mjs`, `qa/shots.py`)
- [~] W1-tiles: palette.json + terrain/structure tilesets for town, valley, archive, interiors (`tools/art/tiles`, `assets/tiles`)
- [~] W1-sprites: party field+battle sprites, townsfolk, props, enemies, bosses, portraits, field enemy sprites (`tools/art/sprites`, `assets/sprites`)
- [x] W1-ui-art: bitmap fonts, window skins, cursor, icons, battle UI bits (`tools/art/ui`, `assets/ui`)
- [~] W1-audio: SFX + jingles + ambience generators and files, audio manifest (`tools/audio`, `assets/audio/sfx|jingles|ambience`)
- [x] W1-content: Episode 1 story script, NPCs, quests, items, enemies, encounters, shops, loot tables (`src/data`, `docs/story`)
- [~] W1-battle-rules: pure battle logic: CTB, damage, weakness/break, statuses, fury, combos, AI, loot rolls + tests (`src/battle/*.js` pure, `qa/battle`)
- [x] W1-music: composed tracks archive/mystery/sorrow/triumph via tracker (Suno blocked in-app; prompts in docs/SUNO_PROMPTS.md)

## Wave 2: systems on top of foundations
- [ ] W2-world: tilemap + autotile renderer, actors, followers, NPC behaviors, events, cutscene runner, camera, lighting, particles, transitions, field scene
- [ ] W2-ui: dialogue (typewriter, portraits, blips, choices), main menu (items/equip/tech/status/journal/bestiary/config/save), shop, name entry, title, save/load, options
- [ ] W2-battle-scene: battle presentation over the pure rules: layout, timeline, commands, targeting, animations, fx, rewards, level-up
- [ ] W2-maps: author Willowmere (+ interiors), Willowmere Valley, Archive F1-F3 + boss room, with a map preview tool

## Wave 3: integration
- [ ] W3-integrate: full flow title -> prologue -> town -> valley -> archive -> boss -> ending -> credits; autoplay test; publish /next

## Wave 4+: polish loops (repeat all week)
- [ ] critic passes (art, UX, combat feel, story) on qa/out screenshots -> issue lists here
- [ ] fix passes per issue list
- [ ] balance simulation, mobile/touch pass, performance pass, accessibility/options pass
