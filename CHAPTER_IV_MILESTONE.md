# Chapter IV — Valewyn: The Sunken Keep

## Release: Sunken Keep Edition (October 12, 2026)

A complete chapter-level implementation inside the existing eight-region Lexicon Quest campaign. Chapters I–III retain their authored storylines and progress. Regions V–VIII are still generated from the generic template and need a comparable authoring pass.

## Act I — Valewyn, the Drowned Crown Plaza

1. Defeat the Cinder Warden in Emberpeak and take the road east to **Valewyn**. Speak to **Regent Lyra** near the top of the plaza. She describes forged flood decrees and the Paper Regent's control of the Sunken Keep.
2. Optional but recommended: interview **Nessa (ferry captain)**, **Dorian (royal scribe)** and **Orel (canal engineer)**. Their accounts reveal a forged royal charter. Witness testimony is added to the persistent journal.
3. Once all three witnesses have spoken, choose exactly one first civic power allocation at the two council switches: **Shelter the River Quarter** (three Potions and flooded-tile damage reduced from 8 HP to 2 HP) or **Protect the Public Records** (two Ethers and +25 opening Focus versus the Paper Regent). The alternate district must wait until the main quest is resolved. The choice cannot be changed or exploited for extra rewards. The ending acknowledges your decision.

## Act II — Tidegate Causeway (Dungeon floor I)

4. Enter the **Sunken Keep** on the northeastern world path. Study the **Tidal Engineer's Plan**: the states cycle Calm (0) → Low (1) → High (2) → Release (3). Set the **west intake to High (2)**, the **north drain to Low (1)** and the **south overflow to Release (3)**. Until then, flood tiles each inflict nonlethal party-wide damage once per unique tile. They become visibly dry when the gates align.
5. The locked Eastern Tidegate is a real corridor chokepoint. After balancing the gates, retrieve the **Sunken Seal Key** from the north gallery before proceeding east to the archive stair.
6. Lyra's first memory appears in the central hall. It reveals that the Paper Regent, not the king, ordered refugees denied entry.

## Act III — Archives Below Water (Dungeon floor II)

7. Restore the pumps as follows: **West = Intake (1)**, **Core = Purge (2)**, **South = Intake (1)**. Pump states cycle Stopped (0) → Intake (1) → Purge (2) → Stopped.
8. Restore the complete **Drowned Charter Crossword** (both Across and Down). **Pumps and crossword are both required** to unlock the Archive Floodlock. Both completion orders work, and partially solved crossword entries are saved. The archive visibly drains when both conditions have been fulfilled.
9. Optional: activate the royal record imprints in order **Petition → Forgery → Crown** to open the public coffer containing **190 gold and two Ethers**. Incorrect order resets the imprint sequence. The reward is one-time only.
10. Lyra's second memory reveals that the true royal order read OPEN, but a single word was forged into CLOSE.

## Act IV — Chamber of the Last Decree (Dungeon floor III)

11. Read the inscription and recite the three principles **Voice → Truth → Mercy** using the stones on the west, north and south wings. Wrong choices reset the sequence. The physical Petition Hall gate then opens, followed by a keyhole requiring the Sunken Seal Key.
12. Lyra's final memory restores her Witness Seal. Finding all three memories gives the party **Aegis for two enemy turns**, **+30 opening Focus**, and **one automatic interruption** against the Paper Regent's charged attack.
13. Fight **THE PAPER REGENT**:
    - Phase I — Forged Edicts: armor-heavy boss vulnerable to Fire.
    - Phase II — Royal Ward: at about 70% HP, the Regent summons **Forged Writ · Silence** (a healing-type enemy, weak to Fire) and **Forged Writ · Oblivion** (a warder, weak to Piercing Thrust). Both writs protect the boss. Basic attacks and Triad Resonance cannot bypass the HP threshold while they survive.
    - Phase III — True Charter: when both writs fall, the Royal Ward breaks, the Regent loses armor and the party earns 25 Focus.
    - Phase IV — Flood Decree: below about 30% HP, the Regent begins faster heavy attacks. Guard, Aegis, Piercing Thrust and Lyra's Witness Seal offer counterplay.
14. Defeat the Regent to trigger the **Crown Remembers** conclusion. The forged CLOSE changes to OPEN; Lyra publicly restores the real charter and acknowledges the district priority chosen earlier. A clue points to the First Library and the Whispering Desert, unlocking the next region.

## Technical integration and verification

- Added `rpg-chapter4.js` for the authored city and three dungeon floors and integrated it with the existing engine, UI, quest compass, battle renderer, terrain palette, and offline cache.
- All new state is stored in the existing v3 `flags` and `journal` objects. Save-slot format was not changed. Browser autosave still does not persist an ongoing battle, so export important saves before replacing a hosted deployment.
- Command-line tests: `node verify-rpg.cjs`, `node verify-ui.cjs`, `node qa/willowmere-test.cjs`, `node qa/court-of-mirrors-test.cjs`, `node qa/forge-of-ash-test.cjs`, `node qa/sunken-keep-test.cjs`, `node qa/tactical-combat-test.cjs`, `node qa/sw-test.cjs`.
- The dedicated Sunken Keep test validates authored map reachability, physical gate and keydoor blockers, both council branches and rewards, nonfarming hazards, dynamic drying, two-way puzzle order, optional records, Lyra's memory, staged boss shielding, and v3 saves.
- Isolated desktop and mobile Chromium renders show town, causeway and boss with existing art assets inlined (`python qa/chapter4-browser.py`). The browser environment blocked local HTTP navigation; synthetic browser checks therefore do **not** establish live-site behavior.
- Existing art, soundtrack and chapter cinematics are included and reused. A bespoke Valewyn art direction pass, dedicated new music, original Regent boss animation, iPhone Safari testing, and full human playthrough remain outstanding.

## Next production work

1. Chapter V: Whispering Desert and Oracle Labyrinth, with a desert-traversal mechanic, nonlinear underground chambers and a companion-driven prophecy story.
2. A dedicated presentation and usability pass across all four authored chapters (collision clarity, animation, custom enemy telegraphs, cinematics, unique music cues, menu discoverability and real device testing).
3. Replace Chapters VI–VIII's generic maps with authored, distinct adventures; then perform production balancing and multi-hour human playtesting before claiming parity with Lufia II or Chrono Trigger.

**Release status:** Playable development milestone, not a claim of AAA or SNES-classic equivalent quality. The game has not been deployed to Netlify or pushed to GitHub as part of this release.
