# Lexicon Quest — Living Citizens Edition
Release: October 13, 2026 · Development build

## Delivered
- 40 ambient citizens (five per region) appear in the eight town maps, with 20 fully authored characters across the four handcrafted regions.
- Authored characters follow walkable schedules with idle pauses, direction-aware sprite flips, frame animation, collision avoidance around fixed world objects, and safety checks against walking through the player or another resident. Residents are **ambient actors**; quest-critical NPCs do not wander and retain all existing interaction positions.
- Each of the 20 authored town residents has three topic-specific dialogue lines: greeting, occupation, and local rumor. Responses acknowledge a restored realm after its guardian falls. Citizens can be approached via map clicks, Nearby buttons, or the Field Focus panel.
- Sprite frames reuse the project's existing interior-characters illustration sheet, generated into `assets/art/townsfolk-sprites.png` via `qa/make-citizen-atlas.py`; no outside stock art was added.
- Interior service attendants now use animated character-art sprites when loaded. The older vector clerk rendering remains available as a fallback.
- Field Focus remains quest-first when a main-story interactable is nearby. The minimap and town services remain functional. The current v3 save schema, equipment progression, and dungeon campaign are unchanged.
- Added `rpg-townsfolk.js`, offline cache references, `qa/townsfolk-test.cjs`, and desktop/mobile screenshot interaction test `qa/townsfolk-browser.py`.

## How to play
Walk around any town and approach an animated inhabitant. When close, use the **Talk** button in the Nearby strip or click the character on the map. From further away, tap/click to approach first. Ask about their work or listen for local rumors. Quest-critical witnesses and leaders still appear as their usual fixed interaction landmarks.

## Validation
- Full Netlify build checks: campaign simulation, UI, four authored chapter suites, interiors tests, dedicated citizen tests, and service-worker tests.
- 67,532 dedicated citizen checks passed: safe spawns, movement, collision avoidance, dialogue changes and epilogues, save compatibility, and the integrity of 12 interior services.
- Chromium desktop (1440px) and mobile (390px) viewports validated citizen conversations, alternate topics, town render, runtime errors, and horizontal overflow using local synthetic browser setups.
- Netlify production and physical phones were not remotely modified or verified during this release.

## Deployment
Extract the ZIP and deploy **the files and folders at the ZIP root** to the existing Netlify site. Do not deploy the parent folder. Netlify should run `node` tests defined in `netlify.toml`. New service worker cache key `lexicon-quest-living-citizens-v37` ensures updated offline assets are available after reload.

## Scope limitations and subsequent art milestone
Current sprites animate with 3-frame movement and orientation-dependent left/right flipping, but they are not fully independently illustrated four-direction walk cycles. NPCs use scenic idle routes, not complex daily AI or schedules across interiors. Generic town characters have placeholder rumors. Artwork remains well below the consistency, depth, and hand-authored detail of Chrono Trigger, Lufia II, and Secret of Mana. The next major milestone should unify map tiles and richer environmental props with NPC shading and directional hero animation, then redesign the 4 remaining generic towns.
