# Lexicon Quest — The Reforged Realms
## Product vision and quality gates
**Vision revision:** 2026-10-13

### Product promise
Lexicon Quest is an original, fully explorable fantasy RPG about a living world whose names and memories are being erased. Preserve the eight-realm campaign, the companions, and the ending choices. Replace every crossword interaction with combat, exploration, environmental mechanisms, item discovery, or story decisions. The player should never need to know the game's earlier crossword premise.

The benchmark is not a cosmetic imitation of Final Fantasy, Lufia II, Chrono Trigger, Diablo II, Dragon Quest, or Secret of Mana. The goal is to combine their best structural qualities while keeping an original world, characters, art style, combat logic, and soundtrack.

### Six enduring design pillars
1. **Explore like Lufia II and Secret of Mana.** Tile-based traversable maps; recognizable roads, geography and architecture; dungeon machinery you can see and manipulate; side paths, secrets, rewards and shortcuts. The screen itself must explain what is solid, walkable, usable or dangerous.
2. **Strategize like Final Fantasy.** Three companions have meaningful roles, equipment choices and skill growth. Enemies telegraph dangerous actions and have exploitable weaknesses. The player's decisions—not guessing words—determine the result.
3. **Tell stories like Chrono Trigger.** Strong chapter pacing, NPC consequences, companion revelations, town transformations, cinematics at key moments, and endings that respect player choices.
4. **Discover loot like Diablo II.** Normal fights can reward randomized, equipable equipment; guardians guarantee better tiers. Rewards have mechanical affixes and satisfying audiovisual feedback. Favor meaningful upgrades over junk drops.
5. **Make towns memorable like Dragon Quest.** Each town has distinct architecture, inhabitants, businesses, ambient life, signage, local troubles and a clear story objective.
6. **Make every action feel tangible.** Readable character silhouettes; motion and impact feedback; audiovisual telegraphs; responsive mouse, keyboard and touch controls; and saved progress that survives updates.

### Target game loop
1. Arrive in a distinct town, learn the regional crisis, meet allies, purchase supplies and identify nearby mysteries.
2. Explore the nearby overworld paths, collect equipment, fight or avoid visible enemies, discover landmarks and optional secrets.
3. Enter a three-floor authored dungeon. Navigate real rooms, solve environmental puzzles, recover memories, discover treasure, and defeat a unique Echo Warden trial on the second floor.
4. Use tactics to beat the guardian on the third floor; receive a chapter resolution and a newly opened region; equip better loot and progress weapon and skill mastery.
5. Revisit earlier regions with new tools; discover shortcuts, optional stories and rewards; pursue the eight-fragment campaign to its branching finale.

### Release 1: delivered in current source
- The **main RPG UI no longer exposes crossword grids, hints or answer forms**. Former floor-two crossword altars invoke eight thematic Echo Warden encounters.
- Each trial awards a first-clear equipable relic and unlocks the appropriate seal flags. Existing environmental objectives on later floors remain required. Older completed seals migrate to relic unlocks; current version-3 save compatibility remains.
- Four quality bands—Common, Enchanted, Rare, Legendary—exist for randomized combat drops. Equipment uses a separate charm slot on each party member with actual damage, defense, MP, HP or starting-Focus bonuses. Bosses guarantee Rare or better; trial battles guarantee at least Enchanted.
- The player can equip, transfer, unequip and sell charms through **Gear & loot**. The Field menu also exposes **Battle relics**.
- New fantasy HUD/panel CSS and mobile gear layouts accompany the mechanics.
- Chapter regression scripts now exercise Echo Warden battles and loot. Netlify's configured build includes these tests.
- This pass is foundational; **it is not yet a claim of visual or content parity** with the benchmark titles.

### Priority 1 — Rebuild overworld and towns as authored game environments
- Replace placeholder/procedural-feeling structures with consistently art-directed tile atlases. Make walkways, rivers, trees, cliffs, shadows, roofs, thresholds and doors visually unambiguous.
- Give all eight towns landmark silhouettes, unique palettes, lighting states, environmental props, an intentional town-center composition, and useful service interiors.
- Improve player/companion animation (idle, four-way walk, use, hit), sprite shadows, camera movement and interaction indicators. Character identity must read at the native displayed resolution.
- Add approach/exit transitions that connect interior and exterior logic, instead of abruptly changing UI context.
- Make clickable tiles and interactive props visibly distinct without covering the world with labels.

### Priority 2 — Deepen tactical encounters
- Make enemies behave differently, with real attack patterns, interruption windows, guard-break mechanics, healing behavior and phase changes, rather than merely changing sprite and HP.
- Add companion-specific skill trees and synergy; active party loadout decisions; clearer tooltips and damage previews; ability unlock decisions beyond linear levels.
- Deliver battle animations, damage timing, elemental effects, authentic hit reactions, distinct boss entrances and rewards.
- Test difficulty curves from Chapter I through VIII on new characters and veteran builds; no forced grinding.

### Priority 3 — Extend loot, forging and secrets
- Expand charm affixes into real weapons, armor, accessory slots, and carefully balanced build tradeoffs.
- Add iconic hand-authored rewards in secret rooms and guardian caches, with randomized drops as support rather than replacing crafted treasures.
- Add unique side-dungeon puzzles, shortcut unlocks, optional minibosses, and stronger revisitation rewards from existing field tools.
- Design a merchant economy with stable gold sinks and nonpunishing inventory management.

### Priority 4 — Cinematic narrative and sound
- Polish scripted prologue, reveal sequences, companion flashbacks, guardian confrontations and chapter endings.
- Reuse the original Suno music files already bundled in the project; layer contextual SFX for footfalls, menus, weapon hits, magic, treasure, doors and weather.
- Keep complete voice-free readability, skippable cutscenes, adjustable audio and subtitle pacing.

### Priority 5 — Formal quality and playtesting
- Verify a full clean playthrough from Willowmere to both endings with no unavailable objectives or softlocks.
- Confirm all eight floor-two trials and their combined puzzle gates work with new and migrated saves.
- Check Chrome, Firefox, Safari, iPhone portrait/landscape, desktop keyboard/mouse, touch pathfinding, offline service worker and audio permissions.
- Benchmark consistent camera redraw performance, memory use, scene-transition pauses and download sizes.
- Collect objective clarity, combat readability, rewards per hour, loss/recovery fairness and difficulty spike feedback during real player sessions.

### Non-negotiable release checks
- Zero required crosswords or word-answer gates in the main game.
- Existing version-3 saves load successfully; failed imports never destroy a valid current save.
- All boss regions, major quests and final endings remain accessible.
- Text, affordances and controls stay readable on an iPhone-sized screen without horizontal scrolling.
- Source assets must be owned/licensed for the project. Reference games guide quality and mechanics, **not copying their copyrighted artwork, music, maps, distinctive characters, or branded presentation**.

### Technical approach
Continue shipping incremental modules on the existing static HTML/JavaScript game so GitHub → Netlify deployment and old browser-origin saves remain intact. Keep save fields additive until a tested migration to a later format is justified. Keep every mechanical expansion covered by node QA and browser/smartphone testing before considering it production-quality.

The next most valuable milestone after this release is a **hand-authored visual rebuild of the first explorable town, Willowmere, and Rootbound Archive Floor I**, establishing the art, movement, camera and interaction standards to propagate across the rest of the game.


## Milestone update — 2026-10-13: Willowmere scene + mobile-native play
- A dedicated first-region renderer now paints Willowmere's paths, hedgerows, flowers, river, cottage walls and roofs, lantern posts, and service façades as coherent 48-pixel scenery. Rootbound Archive Floor I uses a consistent stone, wood, carpet, shelf, brazier, pillar and interactable-object language. Renderer is deterministic and does not change collision data.
- Phone portrait layouts enlarge the map camera to roughly 10–12 visible horizontal tiles, rather than shrinking all 17 desktop columns to fit, while keeping a three-person HP strip and current destination above the map.
- Fixed, safe-area-aware touch controls include a directional pad with touch-and-hold repeat, contextual Interact, Quest, Map, and Menu. Mobile battles include a fixed Attack/Defend/Skills & Items quick-action bar and retain all advanced combat options.
- Tap-to-move now routes to an accessible tile adjacent to interactive landmarks, automatically triggering their action upon arrival. Taps on visually large service façades target the service, rather than empty terrain.
- New-game entry goes directly into Willowmere with concise contextual guidance; the full optional help guide is still available from the title and Field menu.
- Responsive styles account for shorter phones, landscape orientation, dialogs above fixed controls, and reduced-motion preferences.
- The milestone adds test coverage for touch repeat/cancel behavior, path-to-NPC arrival, one-tap combat, art determinism and mobile/offline assets.
- This is the **first art and mobile UX pass**. Before claiming reference-game visual parity, implement animated four-direction sprites, scene transitions, deeper architectural atlases, environmental sound, all-region art consistency, and actual iPhone Safari/Android browser playtesting.

### Next highest-value tasks
1. Audit production Netlify build status and play the latest deployment on real phone devices; correct any touch, layout, save or scene regressions.
2. Deepen Willowmere and Archive sprite animation, camera easing, town building collision/doors and contextual interaction feedback.
3. Make the mobile battle turn chooser more compact without hiding targeting or tactical information.
4. Roll the validated art and touch standards to the remaining seven regions.

## Animation and environmental polish milestone — 2026-10-13
Implemented in the native-browser RPG with no version-3 save changes:
- Four-facing animated playable hero: north/south/east/west appearance, walking stride, cloak/limb movement, idle breathing and ground shadows. NPCs retain their own presentation.
- Visible party following: Mira and Bram follow the hero's recent steps. Trails are temporary and reset on map changes.
- Smooth tile movement: valid steps interpolate between tiles; continued hold-to-walk moves connect without teleporting. Blocked moves never move the hero through obstacles.
- Fractional camera: camera easing now follows the animated hero. World drawing covers partial edge tiles; tap hit-testing accounts for the current fractional camera.
- Ambient environment: deterministic floating motes, landmark signals, visual object interaction pings and collision feedback.
- Area transitions: once-per-entry location reveals/fades on towns, overworld and dungeon floors, plus service-interior entrance effects. Reduced-motion preferences are respected.
- Mobile: existing enlarged map, touch D-pad, tap-to-approach, safe-area dock and one-tap combat actions remain intact.
- Quality coverage: a new qa/motion-stage-test.cjs suite runs as part of the Netlify build. The mobile exploration suite now loads the animation module and exercises actual movement and tapping.

Original procedural visuals only, without copying art from the reference RPGs.

### Next priorities
1. Real iPhone Safari and Android Chrome visual testing, including tap precision and sustained rendering frame rate.
2. Full multi-frame character sprites and individual companion/NPC animation.
3. Animated doors, levers, pushable objects, hit reactions and impact feedback with sound.
4. Roll the validated environmental art and character standards across the remaining realms.

## Pixel-art identity and responsive combat milestone — 2026-10-13

The next visual milestone is implemented on the existing main game, without changing chapter progression or version-3 saves:

- **Original detailed party atlas.** Three distinct 20 x 24 native-resolution character silhouettes (sword-bearing hero, staff-bearing Mira, axe-bearing Bram), each authored in four directions and four frames, for a total of 48 unique cached character frames. The atlas is rendered crisply at a 40 x 48 game-world scale. Canvas caching limits repeated work on phones.
- **Interactive environmental artwork.** Original distinct chest, lever, door, keydoor, worldgate, movable boulder, pressure plate, healing spring, stairs and Echo Warden altar. Visual states derive from existing flags (gate open, lever thrown, trial defeated, spring used). This renderer applies throughout the eight realms.
- **Opened chest persistence.** Once the player collects treasure, an open empty chest stays drawn as scenery but cannot be looted or interacted with again.
- **Battle feedback.** UI shows elemental impact rings, weapon slashes, actual target damage/healing numbers, and hit reactions based on the real before-and-after combat snapshot. Supports frost, fire, arcane, guard, healing and physical attacks. No invented damage and no balance change.
- **Mobile and accessibility.** Effects are CSS-based and lightweight, with resized visuals on phone layouts. Reduced-motion mode removes flashes/movement while retaining short-lived damage labels.
- **Quality controls.** New QA suite validates all character frames and distinct renderings, dungeon state changes, accurate battle HP deltas, runtime load order and offline cache coverage. Added to Netlify's existing build gate. The regular mobile UI smoke tests now load the new art modules.

Developer reminder: this raises visual consistency and feedback, but these are still original programmatic pixel assets, not the fully illustrated character atlases, cinematics or hand-authored town environments needed for Final Fantasy / Chrono Trigger presentation parity. Real iPhone Safari performance and production Netlify deployment remain separate acceptance gates.

### Next meaningful milestone
1. Inspect real-device screenshots and animation timing, correct any issues in phone portrait/landscape and desktop layouts.
2. Create authored, high-quality environmental tile atlases for distinct town/dungeon silhouettes in every realm.
3. Add enemy-specific multi-frame attack animations, readable telegraphs, boss phase presentations and character-specific spell effects.
4. Deepen dungeon object animation (gates sliding, switches turning), audio and tactile feedback. Avoid relying on generic icons to represent exploration objects.
