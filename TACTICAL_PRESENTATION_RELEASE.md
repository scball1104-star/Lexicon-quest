# Lexicon Quest — Tactical Presentation Edition
**Build:** 2026-10-13 · Complete eight-chapter game · Post-campaign polish milestone 1

## Release scope
The campaign is unchanged, including all eight regions, authored dungeons, story chapters, inns, townsfolk, interiors, and original finale. This milestone improves **combat readability and control**, not combat balance or total playtime.

### What's new
- Full encounter interface redesigned for readable encounter intent and a clear, three-step command flow: choose an action, choose a target, confirm.
- A turn-order strip shows the active companion and which companions have already acted.
- A tactical briefing gives context-sensitive advice about charged attacks, guardian protections and summoned copies, Focus readiness, low party HP, elemental weakness, and resistance.
- Enemy cards emphasize HP, weakness, resistance, protection or dangerous intentions. Boss phase number and region are visible.
- The currently selected action displays a contextual preview. The action menu disables Potion / Ether when stock is exhausted.
- A turn-result strip shows HP changes for both sides, Focus changes and reinforcement arrival. The existing battle log is preserved as a detailed chronicle.
- A four-part "How combat works" guide opens from combat without resetting the fight.
- Responsive battle UI reviewed in Chromium at 1320px and 390px widths; keyboard and mouse/touch button actions preserved.
- A dedicated pure `rpg-combat-ui.js` helper contains presentation logic and is cached for offline use; it does not modify battle logic or version 3 saved games.

### Test verification
- 1,061 main campaign checks across all eight regions: passed
- 182 new tactical presentation checks across all eight regions: passed
- Existing original 25 combat + 4 mastery trait checks: passed
- Existing chapters I–VIII, interior, environment, town-life, UI and service-worker suites: passed
- Chromium desktop/mobile visual and behavioral tests: passed; no page errors or horizontal overflow in those two scenarios
- ZIP archive CRC validation: see packaging verification

### Known boundaries
- Gameplay, encounter difficulty, animations beyond existing sprites, and long-term progression balancing are not changed by this release.
- The browser test is Chromium at desktop and phone-sized viewports, not a physical iPhone Safari test.
- Actual live Netlify deployment is not changed. The user must deploy this ZIP's **root files** or push it to the repository connected to Netlify.
- Version 3 browser saves continue working because the underlying game state schema is unchanged. Export valuable saves before deployment as a precaution.

### Deploy
For Netlify drag-and-drop: extract the ZIP and drag the resulting folder containing `index.html` into your existing site's **Deploys** area. For a connected GitHub site, commit/push the updated root files on the production branch; Netlify will run its build and redeploy automatically.

### Next high-value development milestones
1. Battle animation and sound cues (clear actual hits/heals/interrupts, synchronized without delaying user actions).
2. A journal/questline overhaul with milestone tracking, fast-travel guidance, and clear optional/main objectives.
3. Dungeon navigation and visual language consistency, accessibility, difficulty/playtime instrumentation, and actual iPhone Safari QA.
