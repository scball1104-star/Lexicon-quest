# Chapter III — The Forge of Ash (October 12, 2026)

## What's actually implemented

Emberpeak (region 2) is no longer a mirrored generic dungeon. The game now contains an original mining-town map, three handcrafted dungeon levels, required environmental and sequence puzzles, a Bram-centered story arc, and a multi-phase Cinder Warden encounter. Chapters I and II and six remaining generated regions have not been replaced.

### Act I: The miners and their silenced bell

1. Finish Chapter II and travel east to **Emberpeak · Bellows Square**. Ask **Foreman Veyra** about the silent Heartforge.
2. Optional: interview **Ilya**, **Rook**, and **Sella** to understand the mine's history and who ordered the records erased. Return to the **Emergency Coolant Station** to collect **two Potions and one Ether**, reduce damage from nonlethal heat seams from **7 HP to 2 HP**, and begin the Warden battle with **+20 Focus**.

### Act II: The Cinder Liftworks

3. Enter the **Ashen Foundry** northeast of Emberpeak. On the **Cinder Liftworks** floor, study the furnace flow diagram.
4. Turn three pressure valves clockwise: **West → East (1 turn)**, **North → South (2 turns)**, **South → West (3 turns)**. This physically opens the blast gate. Heat-seam tiles deal nonlethal damage once per distinct tile until the pressure is restored.
5. Take the **Crucible Hook Key** on the north balcony and use the east ore lift. The key will be needed on floor three.

### Act III: The Ventilation Galleries

6. Read the ventilation blueprint. Set **West Fan → Intake (1)**, **Core Fan → Exhaust (2)**, **South Fan → Intake (1)**. Modes cycle Still → Intake → Exhaust → Still.
7. Solve the full **Smelter-Word Crossword**. **Both** the crossword and all three fans are required to open the ventilation pressure door; either puzzle can be completed first.
8. Optional: restore the foundry ledger in order **First Bell → Second Bell → Last Bell**, and claim **160 gold and two Ethers** from the apprentice's cache.

### Act IV: The Heartforge Crucible

9. Strike the three hammer vows in sequence **The Hand → The Heart → The Home**. A mistake resets progress instead of granting a free opening. The Bell Gate is a physical chokepoint; a second **Crucible Hook Keyhole** protects the Warden.
10. Speak with **Bram's memory** on each floor. His three episodes reveal **Mara of the First Bell**, his mother, and the original worker-safety alarm. Completing his story awards an opening two-turn Aegis ward, **+35 Focus**, and **one automatic interruption** of the Warden's charged hammer attack.
11. Fight **The Cinder Warden**. **Phase I** starts with heavily armored Tempered Iron (weak to Ice, resistant to Fire). At 70% HP, **Phase II** opens the Molten Shell with two dangerous Furnace Coils. Direct damage and Triad Resonance cannot push the Warden below 31% HP while the coils live. Defeat both to break the shield. **Phase III** exposes the Quenched Core, weak to Ice. Below 30% HP, **Phase IV** starts with a warned Last Hammer attack, faster charges, and stronger hits. Piercing Thrust interrupts charging if available.
12. The final battle triggers an in-game **First Bell Rings** conclusion, frees the foundry, credits Bram and Mara, records the First Library conspiracy, and unlocks **Valewyn / Sunken Keep**.

### Release integrity

- All new flags live under existing v3 save objects (`flags`, `journal`) and preserve the v3 save schema. The combat state is still not persisted in saves; export important slots before deploying.
- Distinct ash, metal, and ember tile visuals, valve/fan orientation badges, chapter-specific progress panels and more specific quest compass targets appear in the main web client.
- Existing sound and art atlases were reused. New, independently commissioned artwork, bespoke animations, and additional music are not included in this milestone.
- Tests: `node verify-rpg.cjs`, `node verify-ui.cjs`, `node qa/willowmere-test.cjs`, `node qa/tactical-combat-test.cjs`, `node qa/court-of-mirrors-test.cjs`, `node qa/forge-of-ash-test.cjs`, and `node qa/sw-test.cjs`.
- Isolated Chromium screenshots are available under `previews/`. The browser environment prevented local URL navigation so these use inlined scripts/assets, not the full hosted website. Player testing on iOS Safari and the production Netlify site remains necessary.

## Next milestone: Chapter IV — Valewyn / The Sunken Keep

Replace generated town and floors with an authored flooded fortress, water-gate puzzles, political stakes and companion decisions, and a distinctive Paper Regent battle. Separately, devote an entire polish milestone to map readability, cutscene direction, battle animation, music transitions, save-state resilience and repeated mobile playtests. The project is still far from Chrono Trigger / Lufia II production depth; this is a substantial content milestone, not a commercial-quality completion claim.
