# Lexicon Quest — Eight Towns Art Edition

**Build date:** October 13, 2026  
**Build target:** Unchanged Netlify static root  
**Foundation:** Living Citizens Edition

## What is included

- Four handcrafted replacement town maps for Regions V–VIII. These are no longer copies of the same green crossroad:
  - Region V: **Saffron Haven — Moonwell Caravanserai**, with oasis pools, copper domes, shaded markets, palms, mosaic square and carved obelisk.
  - Region VI: **Zephyr Landing — Windward Docks**, with floating-cloud boundaries, sky walks, airship mooring, wind vanes, and cloud gardens.
  - Region VII: **Palehaven — Thawing Hearth**, with ice brickwork, aurora crystals, snow pines and beacon watch.
  - Region VIII: **The Scriptorium — First Library Enclave**, with vellum walkways, ink canals, book towers and manuscript mosaics.
- New deterministic pixel-art rendering layer (`rpg-environment-art.js`) with **eight regional material palettes**, house/roof textures, animated small environmental effects, special buildings and regional scenery props. Applied to towns across all eight regions. No additional downloaded image assets required.
- **20 new town-specific residents** across Regions V–VIII, with three original dialogue branches apiece, local patrol routes, and all previous citizen collision protections.
- **12 additional region-specific service interior themes** (3 for each Region V–VIII), plus new service attendants and matching text. The original 12 walkable interiors remain available.
- New walkable-collision barriers for oasis water, ink canals, cloudbanks, snowpines, icewalls and desert dunes, applied consistently to player and ambient NPC movement.
- **Autosave is still version 3** and old slots are preserved. No save migration. Existing equipment, combat, crossword mechanics and Chapters I–IV are unchanged.

## Verification performed

- `node verify-rpg.cjs`: eight-region campaign simulation and 1,020 checks.
- `node verify-ui.cjs`: UI smoke checks.
- `node qa/environment-town-test.cjs`: town map bounds, reachable services, field landmarks, tiles, citizen spawns, extended interiors and artwork rendering.
- `node qa/townsfolk-test.cjs`: character movement and no collisions.
- `node qa/interiors-test.cjs`: interior movement, service interaction and save invariants.
- `node qa/sw-test.cjs`: offline cache resources and media range logic.
- Other preexisting chapter/regression suites run with `netlify.toml` build command.
- Chromium synthetic screenshots of eight towns on desktop (regions 0–6, plus Library checked separately) and focused mobile viewports; no horizontal overflow or JavaScript errors in completed checks.

**Important:** A synthetic-browser screenshot is not a live Netlify or on-device acceptance test. Graphics are still a custom procedural pixel-art layer, not hand-animated, film-quality JRPG backgrounds. The original Chapters V–VIII dungeons remain generic and need authored exploration/puzzles in the next milestone.

## Deployment

Extract the full ZIP. Deploy the **contents of its root** (the directory containing `index.html`, `rpg-ui.js`, `rpg-environment-art.js`, `rpg-regions-ii.js`, `sw.js` and `assets`) to the existing Netlify site.

The service worker has a new cache version, so users may need to reload if an older tab was open during deployment. Save data is stored separately in the browser and is not included in the ZIP. Export a save from the Field menu for backups.

## Next priorities

1. Authored Chapter V desert labyrinth with moving sand, mirage routing and real navigation constraints.
2. More cohesive high-resolution handcrafted scenery and overlaid depth sorting; directional hero and NPC animation.
3. Town-linked quests and meaningful recurring NPC schedules, including later-region side stories.
4. Refined HUD density and mobile exploration viewport scaling.
