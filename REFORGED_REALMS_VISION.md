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
