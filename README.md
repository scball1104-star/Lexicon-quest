> **Current direction (October 2026): The Reforged Realms.** The main playable RPG has dropped crossword gameplay. Dungeon seal encounters are now Echo Warden battles, with eight equipable relics, rare equipment drops, companion charm slots, and a restyled interface. Existing version-3 saves are supported. See [REFORGED_REALMS_VISION.md](REFORGED_REALMS_VISION.md) for the creative direction, work completed, next priorities, and quality gates.

**Latest build: Tactical Presentation Edition (2026-10-13).** The eight-chapter campaign now has a redesigned battle interface with turn order, telegraphed threats, affinities, tactical recommendations, ability previews and post-action HP/Focus feedback. See [TACTICAL_PRESENTATION_RELEASE.md](TACTICAL_PRESENTATION_RELEASE.md). All version 3 saves remain compatible.

# The Living Lexicon Edition — Chapter VIII Complete

**Latest release:** The First Library finale, Eraser boss, authored floors, and two persistent ending choices. Full details: [CHAPTER_VIII_MILESTONE.md](CHAPTER_VIII_MILESTONE.md).

**October 13 2026 — Chapter VII: Frostbound Vault Edition.** See `CHAPTER_VII_MILESTONE.md` for the new ice dungeon, town witness story, Keeper Nox memory arc, four-phase White Phantom, QA and deployment. This is the latest build; Chapters I–VII have authored story content, while Chapter VIII remains a scaffold.

**October 13 2026 - Chapter VI: Storm Observatory Edition.** See `CHAPTER_VI_MILESTONE.md` for the authored sky dungeon, Zephyr crew, Aeris memory arc, four-phase boss, and deployment instructions.

> Latest playable release: **Oracle Labyrinth Edition (Chapter V)**. See [CHAPTER_V_MILESTONE.md](CHAPTER_V_MILESTONE.md) for new gameplay, solutions, QA results, and Netlify deployment notes.

> **Current development package:** Eight Towns Art Edition. See [EIGHT_TOWNS_ART_RELEASE.md](EIGHT_TOWNS_ART_RELEASE.md) for new town maps, scenery, QA and deployment details.

**Latest release — Living Citizens (October 13, 2026):** Town residents now walk scripted routes, converse about local stories, and use illustrated animated character art. See `LIVING_CITIZENS_RELEASE.md`.

# Lexicon Quest: The Remembered Realms

## Newest release — Sunken Keep Edition (October 12, 2026)

Chapter IV introduces the authored city of **Valewyn** and a three-floor **Sunken Keep** dungeon, interconnected water sluices and archive pumps, a two-part floodlock requiring the crossword seal, dynamic water drainage, one irreversible town-side civic decision with distinct mechanical consequences, optional historical records, Lyra's three-scene character arc, and a staged Paper Regent battle with two protective Forged Writs. The ending acknowledges the player's civic priority and progresses the First Library plot. See [CHAPTER_IV_MILESTONE.md](CHAPTER_IV_MILESTONE.md) for the full walkthrough and limitations.

The save schema remains v3; existing Chapters I–III and their progression are preserved. This release has **not** been deployed to GitHub or Netlify.

## Previous release — Forge of Ash Edition (October 12, 2026)

Chapter III rebuilds Emberpeak with three authored dungeon floors, pressure-control puzzles, combined crossword-and-ventilation gate, heat hazards, a mine ledger side quest, three Bram memories, and the four-stage Cinder Warden encounter. See [CHAPTER_III_MILESTONE.md](CHAPTER_III_MILESTONE.md) for the full walkthrough and limitations.

This edition preserves the v3 save schema and all Chapter I/II progress. The current GitHub repository / live Netlify site were not changed in the course of creating the release. Export your saves before deploying.


## Previous release — Court of Mirrors Edition (October 12, 2026)

Chapter II now has an authored town and full three-floor **Court of Mirrors** dungeon instead of the reused generic region template. It introduces three rotating lenses, a portrait-sequence secret, the royal vows, three companion flashbacks, and a staged boss encounter with a shield that must be broken by defeating two reflections. See [CHAPTER_II_MILESTONE.md](CHAPTER_II_MILESTONE.md) for the walkthrough, mechanics, test matrix, release limitations and next milestones.

### Core tactical systems from the preceding edition

This release builds on the existing **Willowmere Chapter I** and Tactical Compass builds. It is still an in-progress RPG, **not** a complete Lufia II / Chrono Trigger equivalent. The eight-region campaign, the authored Rootbound Archive, Court of Mirrors, Ashen Foundry and Sunken Keep, traditional three-member turn-based battle, and dungeon-only crossword seals remain intact.

### New in this build

- **Party Resonance:** attacks, defense, and elemental weaknesses build a tactical Focus gauge (0–100). At 100 Focus, three living companions unlock **Triad Resonance**, an armor-piercing coordinated strike against all enemies. The gauge resets each encounter.
- **Enemy intent previews:** hunter mana siphons, warder armor buffs, mender healing, charged attacks and standard strikes are telegraphed, giving combat meaningful counterplay.
- **Weapon mastery evolution:** each of the four weapon schools gains unique passives at mastery ranks 4 and 6, in addition to technique unlocks at mastery 2 and existing skill ranks. Sword builds extra Focus; Spear strikes harder; Axe weakens armor; Staff replenishes mana.
- **Quest compass:** contextual, readable next-landmark directions in the sidebar and a gold marker on the visible map. Directions show an approximate Manhattan distance; dungeon corridors and gates may require detours.
- **Keyboard combat:** 1–9 selects commands, Left/Right changes valid targets, Enter confirms, G defends, R retreats from normal encounters. Touch commands remain available. Combat has an in-battle guide.
- **Release safeguards:** no change to v3 browser save schema or Classic Edition; new tactical regression tests added to Netlify build checks; updated service-worker cache key.

### Important deployment note

This package was **not** pushed to GitHub or deployed to Netlify. To update `forgotten-words.netlify.app`, upload the extracted site folder to the **existing** Netlify site or first push its complete contents to `scball1104-star/Lexicon-quest` and connect that repository to the existing Netlify project. Preserve the same domain to preserve existing browser-origin saves. Export important saves first.

### Tests

```sh
node verify-rpg.cjs
node verify-ui.cjs
node qa/willowmere-test.cjs
node qa/tactical-combat-test.cjs
node qa/court-of-mirrors-test.cjs
node qa/forge-of-ash-test.cjs
node qa/sunken-keep-test.cjs
node qa/sw-test.cjs
```

This set validates campaign rules, 24 dungeon gates, crossword geometry, navigation, Willowmere story, the combat Focus meter and its unlock conditions, weapon mastery traits, and save format. Automated Chromium checks on synthetic desktop/mobile pages found no uncaught script exceptions or horizontal overflow, but rendered asset delivery, real-device Safari, and hosted save persistence still need real-world verification.

---

### Highlights

- Reconstructed **Willowmere Valley** and **Willowmere Lantern Square**, with river crossings, painted terrain families, enterable services, named residents, custom landmarks, and more visual richness from the existing character and building sprite atlases.
- Optional **Thirteenth Bell** narrative quest and persistent party reward.
- A redesigned three-floor **Rootbound Archive** with inscriptions, physical puzzles, crossed-word gate, **optional two-prism puzzle**, Keeper Oaths, and a second-stage Archivore guardian.
- The new story and discovery state use the existing v3 save data structure without resetting existing v3 saves; the original version and its own saves remain in `classic.html`.
- Still includes three-character turn-based combat, visible enemies, weapon mastery, leveled magic skills, equipment upgrades, three save slots, the eight-region campaign and eight dungeons. Crosswords are **dungeon puzzles only**, not battle attacks.

### Play it

Deploy **the extracted folder contents (with `index.html` at root)** to a static HTTPS host such as your existing Netlify site, preserving `index.html` at the site root. The package can also be served with a development HTTP server. iPhone file preview may not run web-game scripts correctly.

WASD/arrow keys move, E/Space interacts, M opens the map, and touch devices have an on-screen directional pad. Speak to Elder Mael in Willowmere, follow the road to the Rootbound Archive, and investigate the optional Thirteenth Bell quest in town.

See [CHAPTER_I_MILESTONE.md](CHAPTER_I_MILESTONE.md) for detailed walkthrough, verified features, test status, save compatibility, and upcoming tasks.

### Verify

```sh
node verify-rpg.cjs
node verify-ui.cjs
node qa/willowmere-test.cjs
node qa/sw-test.cjs
```

**Status:** Playable development milestone, not yet comparable in overall content and polish to Lufia II. The full eight-region game requires extensive authored content, systemic progression improvements, QA and real-device playtesting. The screenshots used for browser checks were generated from a synthetic in-memory test document because direct local-host browsing is restricted in the automated environment. Hosted HTTPS save persistence and physical-device interaction are still unverified for this milestone.
