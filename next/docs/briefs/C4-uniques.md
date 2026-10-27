# C4-uniques: sixty uniques in three grades, with the odds turning over with depth

You are **C4-uniques**, wave C4 of the Deep Stacks (`docs/DEEP_STACKS_PLAN.md`). Scott answered open call E on
2026-10-27. His words, verbatim (section 13 E of the plan carries them too):

> E. More uniques. Vary the quality of each so that lower levels are more likely to produce a low strength unique and
> less likely to produce high strength unique, and the probability reversing the deeper you go into the cave so that
> lower levels have a higher probability of producing a high strength unique instead of a low strength one. There
> should be enough uniques available to find to full equip the players with uniques from different measures of
> strength, and different special qualities, multiple times over.

Reading: "lower levels" means shallower floors in the first sentence and deeper floors in the second (the plan calls
depth "floors"; B1 is shallow, B99 is deep). The rule is: shallow floors mostly give weak uniques and rarely strong
ones; deep floors mostly give strong ones and rarely weak ones; there are enough uniques, in several strengths and
with different special qualities, to equip the whole party in uniques several times over.

## Read, in this order
1. `docs/briefs/COMMON.md`, `DESIGN.md` section 7, `docs/DEEP_STACKS_PLAN.md` sections 2, 6, 7, 13 (E) and
   `docs/DEEP_STACKS_BALANCE.md` (the proof you must keep green; section 7 lists the gaps that are not yours).
2. `src/data/cave/items.js` (`ROWS`, `CAVE_PROPS`, `buildUnique`, `wornProps`), `loot.js` (`rollBlueChest`,
   `blueWeight`, the pity rule in `gen.js` / `world.js`: a blue chest on floors ending in 5), `src/game/cave.js`
   (`second_life`, the vault, `reconcileVault`), `src/data/cave/world.js` (`openCaveChest`, the Archivist's lines,
   `first_blow_true`, `cave_move_plus`, `stairs_sense` hooks), `src/battle/rules.js` and `src/scenes/battle.js` only
   where a prop hooks in today (read, do not widen), `qa/cave/data_items.test.mjs`, `data_loot.test.mjs`,
   `qa/cave/sim_*.test.mjs`, `tools/sim/cave.mjs` (how the descent counts blue chests and equips uniques).
3. `src/data/items.js` and `loot-tables.js` for the affix ids and tiers a unique may carry, and the x1 pack's
   `register()` pattern for adding uniques without editing the shared `UNIQUES` table.

## Owned paths
`src/data/cave/items.js`, `src/data/cave/loot.js` (the blue roll, its weights, the second-blue rule), `qa/cave/data_items.test.mjs`,
`qa/cave/data_loot.test.mjs`, new `qa/cave/uniques_*.test.mjs`, `docs/DEEP_STACKS_PLAN.md` sections 6.2, 6.3 and 13 E only,
`docs/DEEP_STACKS_BALANCE.md` section 8 (new, your numbers), `qa/cave/out/uniques_*`. A new prop that needs a hook outside
these files gets ONE guarded line at the hook point that already exists for a sibling prop (name every such line in the
report, file and line); no new hook points, no edits to `rules.js` beyond that. The Archivist's "kept" count text in
`world.js` or `story.js` may change its number source only.

## The design (defaults; Scott's words above are the law, the numbers are yours to tune)
1. **Three grades** ("measures of strength"): Lesser (grade 1, item level 5), Greater (grade 2, item level 10), Named
   (grade 3, item level 16). The grade shows in the item's lore and the Archivist's plaque, never as a number in the name.
2. **Sixty uniques plus the Quill.** Twenty per grade: four weapons (sword, staff, spear, axe), four body (one Mira-only,
   one hero-or-Bram, two for anyone), three head, three boots, three mantle, three charm. The party is three readers with
   six slots each, so each grade fills every slot with two to spare, and the three grades are three full party sets of
   rising strength. The existing sixteen fold in with a grade each (band 1 rows become Lesser, bands 2 and 3 Greater,
   bands 4 and 5 Named; adjust their item levels to the grade's), so forty-four rows are new. Names from the Stacks' lore,
   in the voice of the sixteen; two lore lines each; no em dashes.
3. **Special qualities.** Every unique has one prop. Spread them so the grades feel different: Lesser leans to field
   conveniences and status proofs (the proofs, `stairs_sense`, a chest sense, `cave_move_plus`, a small MP trickle per
   floor); Greater to battle edges (`first_blow_true`, `haste_at_start`, `venom_edge`, strikes as an element, `thrift`, a
   counter, a crit lean); Named to run-changing (`second_life`, `bookmark_twice`, `red_rarity_up`, `gold_double`, an EXP
   lean, `leeching`). A prop may appear at two grades with a bigger number at the higher grade. At most eight new props
   that need code, each hooked at an existing sibling's hook point; the rest are stats or reuse.
4. **The odds turn over with depth.** A blue chest first rolls a grade by floor, then an unheld unique of that grade
   weighted toward the current band as today. Grade weights by floor, linear between these knots (tune, keep the shape):

   | floor | Lesser | Greater | Named |
   |---|---|---|---|
   | B1 | 85 | 14 | 1 |
   | B20 | 60 | 33 | 7 |
   | B40 | 35 | 45 | 20 |
   | B60 | 18 | 42 | 40 |
   | B80 | 7 | 28 | 65 |
   | B99 | 3 | 17 | 80 |

   An empty grade pool (all held) falls to the nearest grade with something left. The Quill stays B100 only.
5. **How often.** Today one blue chest per decade (floors ending in 5), about ten uniques in a run that goes deep. Add
   a seeded second blue chest on some floors (the plan's pity rule stays) so a careful deep run finds twelve to fifteen,
   and all sixty are seen in about five deep runs. Then re-run `node tools/sim/simulate.mjs --cave --check`: it must stay
   green (the extra uniques make runs easier; if a band's death rate drops under half its target, say so rather than
   re-tuning foes, which are not yours).
6. **Shown to the player.** The Archivist's plaque and the Journal line count "n of 60"; the vault lists by grade.

## Verify before you report
`node qa/run.mjs cave battle saves` green; `node tools/sim/simulate.mjs --cave --check` green with the blue-chest and
unique counts in its table; every new prop proved once in a headless battle or on the field (`qa/cave/uniques_*`); no row
with an unknown affix or prop (`buildUnique` throws); the pack stays under its 0.8 MB cap (`node qa/run.mjs pwa`); no
em dash; every command bounded.

## Report (last message, under 450 words)
The sixty in a table by grade and slot with their prop; the grade-odds table you shipped; blue chests and uniques per
run before and after (the sim); every hook line outside your paths; the death-rate table after; anything left for Scott
(a name he should pick, a prop that wants art).
