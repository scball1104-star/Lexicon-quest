# Chapter I — Willowmere Vertical Slice

**Milestone:** Handcrafted environments, authored side story, exploratory dungeon mechanics, and improved presentation.
**Version:** October 9, 2026 / Willowmere Chapter Build.
**Status:** Playable development milestone. NOT a finished Lufia II-caliber game or a certified 60–90-minute vertical slice.

## New in this release

1. **Willowmere Valley:** The first overworld region now has hand-placed roads, an Archive approach, a southward creek and bridge, old milestone, direction sign, a discoverable hollow-tree cache, forest and meadow terrain. The other seven regions remain as in the prior rebuilt campaign.
2. **Willowmere Town:** A custom riverside Lantern Square map with a canal bridge, stone plaza, Moonwell Garden, shopping streets, three named witnesses, the town bell, and inspectable environmental storytelling. Inns, shops, forge and South Gate still work.
3. **The Thirteenth Bell:** Gather testimony from Pip, Edda, and Iris, then interact with the bell. Permanently gain +2 maximum MP for all three companions, 85 gold and one Ether. Testimony and reward are saved, with no repeat farming.
4. **Rootbound Archive:** Three distinctive authored floors: Catalog Halls, Gallery of Unspoken Words, and the Reliquary. Different material palettes and narrative inscriptions replace the repeated Chapter I layouts. Existing key/lever, push-block, guardian-door, recovery, combat, and Across/Down crossword systems remain in place.
5. **Prism puzzle:** The Gallery contains two rotatable prisms. The Keeper's Diagram tells players how to align them. Unlocking the optional reliquary grants 130 gold and two Ethers. The crossword is still the required main gate, not a combat mechanic.
6. **Keeper Oaths:** Three optional monuments in the Reliquary grant a protective Aegis barrier in the guardian battle when all three are awakened.
7. **Archivore boss phase II:** At half health the Archivore summons two Lost Pages. Target selection now automatically recovers when a defeated enemy was selected, preventing soft locks as groups change.
8. **Presentation & usability:** Added distinct forest, meadow, flowerbed, garden, plaza, stone, rune, moss, wood, carpet and bridge treatments; player and NPC sprites from the existing party art atlas; detailed building, chest, fountain, lantern and relic sprites from the world atlas; contextual floor titles, atmosphere text, quest counter, and clearer objectives.

## How to play

Unzip the release. Upload `lexicon_quest_web` as the **site root** on a static HTTPS host, or use a local development HTTP server. Open `index.html` on a desktop browser or phone.

- WASD / arrow keys: move (touch: onscreen D-pad).
- E / Space / Interact button: interact with nearby labeled objects.
- M / Open world map: see connected regions.
- Walk north in town and talk to **Elder Mael**. Explore the optional Thirteenth Bell quest: Pip is in the square, Edda is near the inn, and Iris is at Moonwell Garden. Ring the bell after obtaining all three testimonies.
- Leave through the south gate, follow the east road then north toward the Rootbound Archive.
- Floor I: find the key and western lever, push the catalog stone onto its bronze plate for a bonus, reach the east stairs.
- Floor II: solve the eight-entry Across/Down crossword tablet to open the main gate. Rotate the two optional prisms (West points South; East points East) and collect the starlight cache.
- Floor III: awaken the three Keeper Oaths, lower the bridge, pass the Guardian Keyhole, defeat the Archivore.

## Saves and publishing

- The rebuilt game continues using save keys `lexicon-realms-v3-0`, `lexicon-realms-v3-1`, `lexicon-realms-v3-2` and schema version 3; additions live in `flags` and `journal`.
- This milestone does not intentionally reset existing v3 games. If an old save places the hero on a newly obstructed authored tile, the game relocates the hero to a nearby safe tile.
- The classic word-battle edition remains in `classic.html` with its separate saves.
- The service worker cache key is new and includes `rpg-chapter1.js` as well as the art atlases.
- **This package has not been uploaded to Netlify.** Deploy it to the existing production site only after backing up the previous release and exporting important user saves.

## Tests

- `node verify-rpg.cjs`: 984 rules/campaign checks, including eight-guardian completion.
- `node verify-ui.cjs`: startup, menu, battle, dungeon, puzzle and save-interface smoke checks.
- `node qa/willowmere-test.cjs`: 89 Chapter I-specific checks including map reachability, testimony, non-farmable rewards, prisms, Keeper Oaths, phase II, and save serialization.
- `node qa/sw-test.cjs`: precache assets, migration cleanup and video range/offline fallback.
- Chromium inline-document render check: title, new game, desktop town, floor II, 390 px mobile width, no runtime exceptions or horizontal overflow in the test viewport. This harness cannot validate persistent storage on a hosted origin.

## Remaining priorities to reach the user's target

1. Test with actual human play, record all dead ends, balance boss difficulty and dungeon traversal time, and tune controller feel.
2. Broaden hand-authored exploration: interiors, dense architecture, branching town routes, more shortcuts, environmental loops, and secrets.
3. Replace temporary small-room mechanics with truly interlocking multi-floor dungeons: movable environmental tools, timed plates, enemy-as-puzzle design, optional routes, keys and shortcuts that are spatially coherent.
4. Introduce deeper weapon-technique trees, equipment properties, skill synergies, status effects, job-style progression, and unique enemy behavior, then tune level-by-level campaign economy.
5. Extend the chapter's character scenes, companion banter, boss cinematics, event scripting and narrative choices.
6. Implement full QA on actual iPhone/PC hardware and deploy only after a release candidate passes playtests.

The other seven regions and chapters currently keep the pre-existing reconstructed systems. This is a concrete first vertical-slice milestone, **not** completion of the overall major overhaul.
