# Lexicon Quest — Chapter VIII: The First Library

## Release: The Living Lexicon Edition (October 13, 2026)

This build contains all eight regions, including the authored Chapter I–VIII dungeon campaign, original assets, audio, town and interior systems, and all test suites. Deploy the **contents** of the ZIP to the same Netlify site (`forgotten-words.netlify.app`) to retain the URL. This package has not itself been pushed to GitHub or deployed.

## New story and mechanics

### The Scriptorium: Concordance of Living Witnesses
Speak to **Ione** (Archivist of True Names), **Tamsin** (Bookbinder), and **Fen** (Apprentice Keeper). Each shares evidence of the original suppression order. Their combined testimony activates the **Living Concordance** in the town square: +3 Potions, +2 Ethers, redaction-ink damage reduced from 10 to 2 HP per party member per unique tile, and +25 starting Focus for the Eraser battle. The support can be earned only once.

### Floor 1 — Catalog of Lost Lives
Three Index Engines, cycling VOID → NAME → MEMORY → CHOICE, must align **WEST=NAME (1)**, **NORTH=MEMORY (2)**, **SOUTH=CHOICE (3)**. Completing all three opens an impassable east gate and visibly cleans redaction ink from the floor. The **Original Ink Key** (northern shelf) is needed at the final keyhole. A Keeper memory is available here.

### Floor 2 — Palimpsest Galleries
Three printing plates cycle BLANK → WITNESS → RESTORE. Set **WEST=WITNESS (1), CROWN=RESTORE (2), SOUTH=WITNESS (1)**. The complete **DESTINY** crossword must *also* be restored, across and down. Puzzle operations may be completed in either order, but neither alone opens the gallery gate. Optional document trail: **The Names → The Order → The Correction**, which unlocks an archive containing 300 gold and 3 Ethers. All optional rewards are single-use.

### Floor 3 — The Unwritten Page
Read the final promises in order: **SEE (Mira) → SHELTER (Bram) → CHOOSE (hero)** to unlock the passage. Recover all three First Keeper memory scenes for a two-turn opening Aegis ward, +40 Focus, and one automatic interruption of the Eraser's charged attack. Use the original key at the final lock.

### Final guardian — The Eraser
1. **Closed Book:** Weak to Pierce, resists Ice, armored.
2. **Rejected Truths:** Two summoned foes (Grief and Change) impose an Erasure Ward. The Eraser cannot be defeated while the ward holds, even using Triad Resonance.
3. **The Keeper Remembers:** Ward breaks; armor weakens, vulnerability changes to Fire; +30 Focus.
4. **The Last Silence:** Charged erasure attacks accelerate; use Pierce to interrupt or Aegis/Defend. The memory bond cancels one charged deletion.

### Player-selected final epilogue
Defeating the Eraser completes the eight-realm campaign and opens a **permanent choice** for that save:
- **Return every stolen name:** Restore public records, while allowing individuals to amend or withdraw them.
- **Let each person choose:** Return pasts privately, without compulsory publication.

Both restore the world's freedom; the epilogue differs. The chosen outcome and relevant prior side-quest support are saved in the Journal. If the final-choice window is dismissed before selection, open **Field Menu → Finish the Last Page** to resume. The v3 save structure remains unchanged.

## QA and limits

- `node verify-rpg.cjs`: all eight-region campaign, 1,061 checks.
- `node qa/first-library-test.cjs`: 132 checks of town, 3 floors, locked gates, hazards, both puzzle orders, optional caches, boss wards/phases, epilogues, and save invariants.
- Full `netlify.toml` build test suite passed, including all seven earlier authored chapters and town systems.
- `python qa/chapter8-browser.py`: five *in-memory* Chromium view states (town desktop, first floor desktop, second and third floors mobile-size, final choice mobile-size). No JS page errors or horizontal overflow in these view states.
- ZIP integrity and file-root layout to be verified during packaging.

**Still to validate:** end-to-end navigation on live Netlify hosting, audio loading, iPhone Safari touch/audio/save behavior, manual adventure pacing, and visual/art production quality. This is a complete authored campaign structure, not a claim that the game has reached the animation fidelity, content density or 15–20 hour duration of the classics that inspired it.

## Deploy

Unzip the file; deploy the root containing `index.html`, `netlify.toml`, `rpg-chapter8.js`, `rpg-engine.js`, `rpg-ui.js`, `sw.js`, and all assets. Existing v3 save slots are preserved by the code, but export important saves as a precaution before updating. The service worker cache is bumped to `lexicon-quest-first-library-v42`.
