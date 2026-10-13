# Chapter VI - Storm Observatory Edition

Development release: October 13, 2026. Builds directly on the complete Oracle Labyrinth / Eight Towns Art Edition. All earlier chapters, audio, sprite assets, character progression, saves, townsfolk, and 24 interiors are retained.

## Narrative and playable chapter

Zephyr Landing is a floating skyport whose recorded flight paths have been altered by the Storm Scribe. Captain Aeris discovers that a rescue apprentice named Pippa Voss was deleted from the manifests while attempting to keep a fleet's emergency beacon alive. The crew's testimony and three memories reframe the captain's dilemma: the right course is not always the shortest flight.

**Optional town story:** Speak with Liora (wind navigator), Bennet (rigging master), and Suri (sky cartographer). Activate the Signal Beacon after all three testimonies are recorded. Rewards: two Potions, two Ethers, reduction in one-time gust-lane damage from 9 to 2 HP per party member, and +20 Focus against the boss. Rewards do not repeat.

**Floor 1, The Windward Causeways:** An interconnected set of western balconies feeds a single eastern locked skybridge. The three wind rudders rotate North (0), East (1), South (2), West (3). Correct positions: WEST -> SOUTH (2), NORTH -> EAST (1), SOUTH -> WEST (3). Unlock the Suspension Bridge Lock, collect the **Sky Compass Key** from the upper balcony, and ascend the eastern lift. Before the lock is stabilized, gust lanes deal nonlethal damage once per tile; stabilized lanes visibly become solid decking.

**Floor 2, Orrery of Broken Signals:** Cycle WEST relay to RECEIVE (1), CROWN relay to AMPLIFY (2), SOUTH relay to RECEIVE (1). Also solve the complete intersecting Across/Down crossword at the northern tablet. Neither task alone unlocks the east gate; they may be completed in either order. Optional flight-log puzzle: Departure (1), Distress (2), Rescue (3), then open the emergency locker for **220 gold and two Ethers**; it cannot be farmed.

**Floor 3, The Eye of the Storm:** Recite the pilot oaths in the prescribed order: **ANCHOR, LISTEN, RETURN**. A physical stormbridge opens; the Sky Compass Key is needed at the guardian keyhole. Three Captain Aeris memories—one on each floor—unlock an opening two-turn Aegis ward, 35 Focus, and a one-time automatic charged-lightning interruption.

**The Storm Scribe:** A four-phase tactical guardian:
1. Wind Script: armored boss; weak to Piercing Thrust.
2. Storm Script Ward: begins below 68% HP and creates a False Beacon and Broken Compass. The two storm copies absorb most damage and prevent the boss dropping below 33% HP. Both must be eliminated.
3. True Sky Chart: the ward drops, armor falls, the boss becomes weak to fire and the party gains 25 Focus.
4. Thunderhead Finale: below 28% HP the boss enters charged lightning. Aegis, Defend, and Piercing Thrust interrupt are key counters; the recovered Aeris memory can intercept one charged strike.

The chapter ending reads Pippa's name and the other erased flight records aloud, reopens the skyport's honest navigation signals, and points to **Keeper Nox / Hollow North / Frostbound Vault**.

## Graphics and usability

- New sky-dungeon canvas tile vocabulary: `skyplank`, `skywalk`, `stormglass`, `skybridge`, `gustlane`, `cloudbank` (blocking void tile).
- Custom cloudbank cloud layers, skyglass seams and sparkles, timber skywalks, railings, animated gust streaks, and existing skyport scenery props.
- Explicit console-state overlays, authored floor titles, chapter objective meters, quest compass targets, town guide / focus labels for witnesses and the beacon, Storm Scribe phase/weakness text.
- Keyboard, mouse, auto-path, touch directional controls, and mobile-responsive UI remain supported; real-phone visual testing is still outstanding.

## Verification

- `node verify-rpg.cjs`: **1,042** checks passed, including the entire eight-region campaign, all dungeon gates, crosswords, combat, progression and save safety.
- `node qa/storm-observatory-test.cjs`: **127** Chapter VI-specific checks passed, including reachable objects, physical locks, both puzzle completion orders, one-time rewards/hazards, Aeris memory, all four boss phases and save format compatibility.
- All earlier authored chapter, tactical combat, interior, living-town, environmental, UI smoke and offline service-worker checks pass in the Netlify build command.
- Chromium desktop/mobile visual smoke scripts were prepared but could not be completed in this runtime because the local Playwright/Chromium startup stalled; do not treat the package as validated on a real iPhone or production Netlify.

## Deployment and save compatibility

This is the complete website root, not a patch. Unzip and deploy the **contents** to the existing Netlify site so `index.html` is at the web root. When connected to GitHub, push all changed files; Netlify's `netlify.toml` runs the full test command before publishing. This release is **not automatically deployed** and the existing public URL remains untouched by the packaging step.

The save format remains version **3** (`lexicon-realms-v3-*` localStorage keys) and prior playthroughs are preserved. The service-worker cache key is `lexicon-quest-storm-observatory-v40`. Hard-refresh/clear site data *only if needed*, with care to export your save before deleting site data.

## Next milestone

Chapter VII — Hollow North and Frostbound Vault: vanishing pathways and directional light, three genuinely authored floors, Keeper Nox's story, White Phantom boss, and stronger bespoke scenery. The art and overall game still have a substantial quality gap relative to Lufia II / Chrono Trigger; this release is a meaningful functional milestone rather than a claim of equivalent production polish.
