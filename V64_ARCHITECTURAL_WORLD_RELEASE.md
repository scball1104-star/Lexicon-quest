# Lexicon Quest v64 — Architectural World & Character Performance

**Build:** `feature/v64-architectural-world` based on the completed and tested v63 art rebuild.

## Architecture and world identity

v64 adds a dedicated, game-integrated architecture director with eight regional material systems: Willowmere (oak and limestone), Hollowmere (silverglass and slate), Emberpeak (basalt and copper), Valewyn (sea marble and bronze), Saffron Haven (sandstone and glazed tile), Zephyr Landing (skywood and brass), Palehaven (glacial stone and iron), and The Scriptorium (vellum and gilded granite).

The renderer extends existing connected rooftops, window frames, corner seams, signed district crests, wall sconces, motif reliefs, exposed masonry, dungeon floor engraving and local lighting. Architecture is strictly mapped to existing solid structures. No new collision, invisible wall or changed quest coordinate is created.

The same regional motifs now appear inside walkable inns, shops and forges on the current interior maps: wall crests, furniture edging, carpets and workshop decoration.

## Character performance

`v64-character-performance.js` carries forward the original six-pose character atlas to add improved field cadence, individual shoulder/garment accents, role-specific visual treatment, refreshed battle portraits and brief on-stage attack, spell and guard cameos. Combat effects render after an actual game action resolves. Reduced-motion settings omit the cameo and retain the visible portrait and attack descriptions.

## Presentation

`v64-world.css` applies a consistent high-contrast premium fantasy visual design to the town, interior and combat stage layout, with mobile breakpoints. Touch and keyboard interactions remain the game's existing control scheme.

## Quality and release boundaries

- New dedicated architecture, save-safety and integration tests in `qa/v64-architecture-test.cjs` are part of the **exact production verification command**.
- Real Chromium desktop and mobile navigation and battle tests use `qa/v64-browser-smoke.py`.
- Both artwork modules are cached for offline availability, with a fresh service-worker cache key.
- The live Netlify site and main production branch remain unchanged.
- Procedurally rendered pixel artwork is original and integrated, but is not equivalent to a fully hand-illustrated commercial AAA 2D art package. Further focused art review and asset curation are still necessary before claiming parity with the reference games.

## Review

Browse `feature/v64-architectural-world` and its GitHub Actions logs for test evidence before promoting to production.
