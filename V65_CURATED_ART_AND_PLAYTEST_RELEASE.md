# Lexicon Quest v65 — Curated Art Direction & Campaign Quality Audit

**Release class:** visual consolidation and expanded acceptance testing

**Branch:** `feature/v65-art-direction-and-playtest` (continues v60–v64); **Netlify production remains on main.**

## What actually changed

1. Added an original **eight-region curated scene art director** (`v65-scene-art.js`). Its art program provides unique regional motifs, quest destination markers, entrances, grounded architecture embellishments, and battle scenery silhouettes that complement the art from v60–v64. It is additive rather than a replacement of all legacy art.
2. Added distinctive foreground environmental features tied to actual game objects: open/closed threshold treatments, memorial plinths, service façades, and small destination markers.
3. Added canvas-drawn contextual battle scenery for all eight regions, using specific skyline motifs rather than a single generic wash. Artwork remains behind enemy cards and does not intercept clicks.
4. Added responsive and low-motion presentation styling (`v65-scene-art.css`) and integrated the scene director into both the exploration canvas and tactical battle stage.
5. Added `qa/v65-curation-test.cjs` (eight-region art coverage, objective honesty, scene budget, save safety, integration).
6. Added `qa/v65-browser-smoke.py` and `qa/v65-campaign-browser.py`. The latter opens **32 real Chromium game states**: eight regions × town/dungeon × desktop/mobile. It checks scene loading, objective UI, JavaScript exceptions and horizontal overflow; four regions receive town and dungeon comparison screenshots at both viewport sizes. Together with the existing combat smoke checks, this covers more than a single encounter.

## Architecture and compatibility guardrails

- No edits to save schemas, game `act()`, quest flags or collision maps.
- New decoration is a presentation layer: it never spawns fake interactive objects or changes pathways.
- Battle scene canvases use pointer-events:none and sit below interactive enemies.
- Extra low-motion support and constrained viewports for the smaller mobile combat layout.
- Offline caches include new files and use a new cache key.

## QA evidence

GitHub Actions runs the exact production regression command from `netlify.toml`, plus desktop/mobile gameplay and the extended 32-scene campaign audit. Check the **latest branch commit**, not a previous successful run, before shipping.

The browser tests use an ephemeral local HTTP server on the CI runner. They are not tests of the live Netlify website. They do not certify visual quality by human reviewers or all interactions of all eight dungeons.

## Remaining work for commercial-quality parity

The curated layer is a meaningful in-game improvement but not a full replacement of source artwork. The next studio milestone should include frame-by-frame artist-approved sprites, authored service-building exteriors, high-contrast tile set variants and systematic screenshot-by-screenshot human art direction. Test a full campaign save progression and physical mobile devices before claiming release-grade polish.

**Deployment policy:** no push or merge to production `main` and no Netlify site deployment are included in v65.
