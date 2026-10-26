# X2-sprites: six NPCs, six foes, four bosses, two portraits (X2 wave XB)

Read `docs/briefs/COMMON.md`, `DESIGN.md` 6.3, `docs/EXPANSION_RECONCILIATION.md`, `docs/briefs/XP-packs.md` section 5, `docs/EXPANSION2_PLAN.md` sections 8, 9.1, 9.3 and 12.2 (your contract), `docs/story/EPISODE2.md` section 3 (looks), `docs/CRITIQUE_4.md` items 5, 8, 9 and 15, and `docs/briefs/E3-sprites.md` for the pipeline.

## Items, in order

1. **NPC specs** (6, in `chars/x2_npc_specs.py`): Maren (old woman body, spectacles on a string, a stick), Dunn (farmer body, broad, a reed-cutter's apron), Bett (shopkeeper body, flour-white sleeves, a ring of keys), Marit (child body, a notebook, a heron-grey scarf), Ines (robe body, sleeves pushed up, a wick knife on a chain), Harn
   (guard body, a leather coat, a long knife, a trapper's hat). Each reads at 24 x 32 on grass and wood.
2. **Enemy battle and field sprites** (6): `mire_slime`, `reed_wisp`, `cairn_golem`, `delver_shade`, `lantern_moth`, `drowned_watchman` (**not `barrow_shade`: Episode 1's pale green-white shade owns that id; yours is a grey-green quarryman's shade, a different cell**), each from a cell of `enemies.webp` other than its nearest Episode 2 relative where possible, at 1x, with rim light so they never camouflage on moor, marsh, birch floor or flagstone (CRITIQUE_4 item 8);
   derived frames (idle, attack, hurt, die; cast where a cast move exists). Aliases need no art: `fen_wolf`, `cairn_stone`, `glassback_pup`, `gutter_moth` reuse existing frames.
3. **Bosses** (battle and field avatar): `waymarker` (a stacked-stone mason-construct, a pale keystone, a cairn on its shoulders), `mother_glassback` (a huge silverglass beetle, integer 2x), `last_lamplighter` (a tall salt-stained knight, a lantern, a blank visor that is a face for one frame), `mercury_mother` (a swelling pool with a faint crown of
   mercury drops). Each reads at phone size and differs from the Echo Warden, the Faceless Knight and the Nameless King.
4. **Portraits**: `maren` and `ines`, hand-pixeled at 48 and 32 to the E2 tier (side by side with `elian` and `anwen`); the rest none (the Episode 1 rule).
5. **Timeline heads** for every new foe, in `x2_heads`.
6. **Packaging**: **new atlases only** (`x2_npcs`, `x2_enemies_battle`, `x2_enemies_field`, `x2_bosses_battle`, `x2_portraits`, `x2_heads`), registered with `node qa/core/sync-manifest.mjs --pack x2` into `assets/x2_manifest.json`; no shared atlas is appended to. Frame ids as the enemy and NPC ids; the engine finds them through XP-packs' atlas lookup.

## Rules

- Owned paths: the one `x2` entry line in `tools/art/sprites/build_all.py`, `tools/art/sprites/chars/x2_*`, `tools/art/sprites/x2_*.py`, `assets/sprites/x2_*`, `assets/ui/x2_heads.*`. No non-integer scaling of pixel art. The atlases total at most 260 KB. No git, no em dashes, bounded commands, targeted renders.
- Verify: the x2 build entry, `verify.py`, contact sheets at 4x, mock battle stages with the `east_road` and `court` backdrops, the boss lineup beside the Echo Warden and the King; `node qa/run.mjs core pwa`.
- Report under 400 words: ids and frame names, atlas sizes, the contact-sheet and mock paths, any portrait that did not reach the tier (and the fallback).
