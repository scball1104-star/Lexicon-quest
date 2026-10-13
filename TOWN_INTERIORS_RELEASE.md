# Lexicon Quest — Living Towns: Walkable Interiors Edition
Release candidate: October 13, 2026

## Gameplay changes
- All four authored towns now offer real, walkable interiors for their inn, supply shop, and forge (12 unique room/theme combinations).
- Rooms contain collision-tested furnishings and visible attendants. Use keyboard arrows/WASD, on-screen D-pad, or tap/click a floor tile to auto-walk.
- Approach the service counter to open the existing inn rest, shop purchase, or forge upgrade menus; inspect two local environmental lore points per interior.
- Leave through the marked south door or the Return to town button. Overworld position and v3 game save remain unchanged.
- Region-specific colors, furniture, service descriptions, and modest lamp/furnace animation make interiors easier to read.
- UI improvements: visible objective hotspots and interior party/gold inventory, responsive mobile layout, reduced DOM work during auto-walk.
- Town notice boards and field focus from prior release remain available.

## Regression fixes carried into this build
- Restored the missing Chapter I `add` map helper, which could prevent new campaigns from opening Willowmere.
- Restored the missing Chapter III `line` helper, which could prevent Emberpeak's town map from loading.
- Added a safe gradient check in the town renderer to support synthetic browser/DOM test contexts.

## Verified tests
- `node verify-rpg.cjs` — 1,020 campaign checks; eight-region playthrough simulation.
- `node verify-ui.cjs` — title, start/continue, menus, puzzle, combat, saves and controls.
- `node qa/willowmere-test.cjs` — 89 checks.
- `node qa/tactical-combat-test.cjs` — 25 combat + 4 mastery checks.
- `node qa/court-of-mirrors-test.cjs` — 120 checks.
- `node qa/forge-of-ash-test.cjs` — 129 checks.
- `node qa/sunken-keep-test.cjs` — 135 checks.
- `node qa/interiors-test.cjs` — 531 room/path/collision/interaction/save checks.
- `node qa/sw-test.cjs` — offline caching checks.
- Synthetic Chromium: Willowmere inn on desktop and Emberpeak forge on iPhone-sized mobile viewport, including service menus and return to town, without JS errors/overflow.

## Deployment
Unzip the release, then deploy the **contents of the ZIP root** to the existing Netlify site, keeping the current production URL. This release does not alter your live deployment until you publish it. Old autosaves remain under `lexicon-realms-v3-*` keys. The service-worker cache version was bumped to `lexicon-quest-living-interiors-v36` to activate the new JS offline.

## Scope limits
The service interiors are temporary exploration scenes, not additional saved locations. Their NPC attendants are staged (not schedule-driven pedestrians). The current pixel-art presentation is substantially more navigable but not at the graphical, animated, or content-production quality of Chrono Trigger or Lufia II. All tests above were local/synthetic, not live Netlify or actual device acceptance tests.
