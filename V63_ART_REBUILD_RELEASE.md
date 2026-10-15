# Lexicon Quest v63 — Original Art Rebuild

**Status:** Implemented on the isolated `feature/v63-art-rebuild` development branch, building on v60, v61, and v62. **Not deployed to Netlify.**

## Delivered

- **Original playable character art:** Adds a six-pose rendering layer to the existing three-party-member atlas across the four directions, with distinct cloth/armor/weapon embellishments. The map renderer uses the new art with the previous atlas as a fallback.
- **New original enemy visual families:** Eight biome-specific silhouettes and palettes, three enemy variants per realm and a separate guardian variation. Six frames per variant yield 288 enemy/guardian frame combinations. Enemy sprites are rendered in battle by canvas, animated at a restrained cadence, and do not require new external asset downloads.
- **Distinct fantasy regions:** Verdant, Silverglass, Ashforge, Tidebound, Sundune, Stormwing, Winterbound, and Scriptborn visual motifs match the eight-campaign structure.
- **World detail renderer:** Connected road borders, masonry wear, tile-aware water edges and shimmer, grass/flower clusters, town flower beds, lanterns, roof eaves, windows, and dungeon etchings, all painted on top of the existing map. Existing tile collision and map generation are untouched.
- **Mobile and accessibility:** Pixel rendering retains mobile footprint. Reduced motion stops the active sprite animation and leaves readable static poses.
- **Preserves the game:** No changes to battle math, saves, item stats, quests, movement collision or story flags. The prior original and imported art remains in the project as fallback.

## Implementation

`v63-animated-atlas.js`, `v63-world-detail.js`, `v63-art.css`, `rpg-ui.js`, `index.html`, and `sw.js`. The existing Netlify-equivalent test suite gains `qa/v63-art-test.cjs`. Dedicated `qa/v63-browser-smoke.py` exercises the actual new sprites in desktop and mobile combat.

## What v63 is and is not

This is a **substantive original procedural pixel-art integration** with visible gameplay changes, rather than a mere concept sheet. It is not a claim that every tile, portrait, enemy, and animation frame has been replaced with individually hand-illustrated AAA-quality production assets. The generated design boards from earlier rounds remain art direction references, not imported sprite sheets.

## Release policy

The live Netlify site is tied to `main`, which remains unchanged. The branch can be reviewed and merged when requested, conserving Netlify build credits. Always confirm GitHub Actions passes at the newest branch SHA before release.
