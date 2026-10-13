# Expanded Exploration Edition

This edition moves the overworld and towns from compact icon grids to scrolling, layered pixel maps. It takes its exploration cues from classic party RPGs: roads link landmarks, rivers require bridges, towns contain usable buildings, residents offer local stories, and services prepare the party for adventure.

## What changed

- Eight 44×30 overworlds with roads, rivers, bridges, forests, village architecture, shrines, ruins, seals, guardians, merchants, and treasure.
- Eight 30×24 town centers with a fountain square, street lanterns, flower beds, residents on step-based patrols, and distinct building signs/roofs.
- Enterable inns, archives, workshops, provisioners, and Willowmere's Moonwell Garden. The inn restores the whole party for 15G. Shops and the Runic Forge return to their building.
- Scrolling camera, smooth tile movement, walk/run controls, moving party companions, foreground trees, depth-sorted roofs/characters, and daylight/dusk tint.
- Minimap and Area Map destination buttons. Click a landmark or map destination to follow a walkable path; press a direction to cancel.
- Existing crossword seals, combat, town testimony, discoveries, restoration choices, aftermath landmarks, timed events, and one-shot secret caches use the original campaign rules.
- Hero naming, portraits, dialogue history, and all 16 cinematic clips from the previous edition remain available.

## Controls

WASD/arrows move. Hold Shift to run, or toggle WALK/RUN. E or Space interacts with nearby objects. G opens the Area Map. Escape closes that map. Tab navigates buttons. Click the terrain to walk to a destination; clicking a person or landmark walks within interaction range. Phones offer a directional pad and Interact button. MENU opens the Chronicle from the overworld.

## Saves and offline play

Existing saves do not need resetting. Expanded-map coordinates are stored separately from the original campaign coordinates. Imported older saves enter each expanded area at a safe spawn. Exploration positions, building visits, and caches are saved with the same chronicle. The service worker includes both new exploration files and retains cinematic byte-range playback offline.

## Verification and limits

377 destination/navigation checks passed across all eight overworlds and town centers, all main interiors, service interiors, and the garden. Simulated-DOM checks cover collisions, destination routing, inns, shop/forge returns, testimony and evidence, seven regional restoration choices, one-shot caches, save export/import, map movement blocking, and narrow-screen canvas dimensions. Existing game/presentation checks and offline service-worker checks also pass.

The images in `previews/` replay the actual canvas drawing commands for visual inspection. They are renderer previews, not browser screenshots. A real browser and physical phone were unavailable for this pass; touch feel, frame rate, keyboard focus, and long campaign play still need device testing. This is a substantial exploration upgrade, not a claim of commercial Final Fantasy or Dragon Quest production parity.

## Local checks

From this folder, run `node qa/exploration-test.cjs` and `node qa/sw-test.cjs`. To play, serve the folder over HTTP, then open index.html. Publish the folder to the existing deployment when ready; this packaged update does not change the live site.
