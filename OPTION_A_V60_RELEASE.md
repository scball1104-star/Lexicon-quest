# Lexicon Quest v60 — Option A: Premium RPG Presentation Overhaul

**Status:** Implemented and tested on `feature/v60-premium-rpg-foundation`. No production deployment or save-schema migration.

## What actually changed

1. **Unified art direction and screen styling.** New `v60-premium.css` provides a consistent, subdued fantasy palette, accessible type and controls, modern material treatments, title/field/battle/merchant/equipment/interior/menu styling and responsive layout. It loads after the earlier stylesheets so existing behavior is preserved.
2. **Rebuilt Field Menu.** `v60-premium.js` groups original actions under Party & Progression, Journey, and System. It moves existing clickable controls instead of cloning them, preserving the existing event delegation and save behavior. Future unrecognized actions remain accessible under Other.
3. **Cinematic combat presentation.** Eight realm-specific scenic backdrops reuse the game's original environment artwork. Animated enemy idles, target outlines, attack/heal glints, action previews, guardian styling, and concise threat presentation sit alongside existing authoritative impact numbers and enemy intent. Desktop uses a two-column battlefield and battle-command console; mobile condenses duplicate briefings.
4. **The Living Realms.** `v60-world-art.js` adds authored-material glints, biome-specific atmosphere (fireflies, embers, water shimmer, rain, drifting frost and arcane motes) and lantern/party light drawn over the existing map. It runs before objects and characters, does not modify collision, scripts, saves or RNG, and has a low-motion mode.
5. **Performance and offline caching.** The service worker caches the new styling and scripts. It no longer redownloads all videos and soundtrack files on every cache refresh. Heavy media streams on demand and may not be available offline before first use.
6. **Compatibility.** All eight chapters, relics, loot, companion skill mastery, device controls, existing audio, story sequences and version-3 saves are retained. The current GitHub production branch is unchanged.

## Verification

- `node qa/v60-premium-test.cjs` verifies eight biome identities, scene labeling, menu buttons and action preservation, scripting load order, save safety and responsive/reduced-motion styling.
- `node qa/v60-world-art-test.cjs` checks deterministic rendering, all biome palettes, reduced-motion particle budget, readable world integration and no mutation of map/save state.
- `node qa/sw-test.cjs` checks the offline cache asset set and media behavior.
- The **full existing `netlify.toml` verification command** remains the GitHub Actions regression job.
- `python qa/v60-browser-smoke.py` starts a **local** web server and performs real desktop and mobile Chromium checks: resume a save, render the world, navigate the grouped field menu, initiate battle, check cinematic stage and action results, catch JS exceptions and ensure no horizontal overflow.
- Browser screenshots are retained under the `lexicon-v60-browser-previews` artifact on branch GitHub Actions runs.

## Important boundaries

- **No new externally generated sprite sheets were imported.** The existing authored art and sprites are preserved and presented more cleanly; world lighting/atmosphere are newly implemented canvas effects.
- Browser checks verify functionality and basic responsive layout. Artist-level quality review on real iPhone hardware and long-session performance still benefits from player feedback.
- This work does not pretend that the full RPG has already achieved the production values of commercial releases such as `Chrono Trigger` or `Lufia II`. Additional hand-finished sprite animation, maps, encounter choreography and UI refinements remain valuable future milestones.

## Release / rollback

The live Netlify site is linked to the production `main` branch. Do not merge until ready to spend a production build on this release. The branch is independently tested and can be compared with `main` on GitHub.

When approved for a release, merge `feature/v60-premium-rpg-foundation` into `main`. Netlify can then run the repository's exact build command. Existing `lexicon-realms-v3-*` localStorage save keys do not change. A rollback is possible by reverting the merge commit; backups/exports remain recommended before a major upgrade.

## Follow-on art milestone

Create and audit production animation atlases for heroes/NPCs/enemies, rework structural tilesets across the eight regions, choreograph individual skill/boss animations and validate art consistency in all major scenes. This can be done separately with Runway-generated concepts and reviewed hand-finished assets without changing the v60 save and input systems.
