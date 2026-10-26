# X1-sprites: six NPCs, a sheep, three foes (X1 wave W2)

Read `docs/briefs/COMMON.md`, `DESIGN.md` 6.3, `docs/EXPANSION_RECONCILIATION.md`, `docs/briefs/XP-packs.md` section 5 (pack asset fragments, atlas resolution), `docs/EXPANSION1_PLAN.md` sections 2.5, 7.3, 7.4 and 10.2 (your contract),
`docs/CRITIQUE_4.md` items 1, 5, 8 and 15 (rim light on field foes, readable focal points, no blob portraits) and
`assets/sprites/README.md`. Models: `tools/art/sprites/hollow_enemies.py`, `ep3_enemies.py` (recolor and derive), the NPC paper-doll
builder (`chars/npc_specs.py`, `build_npcs.py`) and `anim_frames.py`.

## Items, in order

1. **NPC specs** (`npc_brindle`, `npc_tamsin`, `npc_ferrick`, `npc_hesper`, `npc_odo`, `npc_yarrow`; looks in plan 10.2): six paper-doll specs that read
   as different people from every existing NPC at phone size (Brindle old and stooped with a long crook; Tamsin in an apron and
   shawl with a bobbin in her hair; Ferrick in oilskin with a pipe; Hesper in a coat too big for her, spectacles on a chain; Odo in a patched grey cloak with a staff cut from a chime post; Yarrow in an apron and a veiled hat with a smoker in her hand).
2. **`animal_sheep`**: 3 frames, four facings, plus a tufted variant for the fold; idle, walk, graze. Matches the other `animal_*`
   sprites' size and outline.
3. **`barrow_shade`**: a recolor of `enemies.webp` cell 1 (the page wraith's body) to pale green-white, rim-lit, with idle,
   attack, hurt, die frames (`anim_frames.py`) and a field sprite with rim light on grass and on dark flagstone.
4. **`barrow_reeve`**: a recolor of cell 5 (the Echo Warden's body): bone white, moss, a shepherd's crook; battle frames (idle,
   attack, hurt, die; it summons and hastes, so a clear idle pose and a "counting" tell if cheap), a field sprite and a map
   avatar. A readable focal point at phone size (CRITIQUE_4 item 15); place it beside the Echo Warden and the Briar Alpha to
   prove it reads as a different being.
5. **`millstone_golem`**: a recolor of cell 4 (the Tome Golem's body): granite grey, a cracked grindstone for a torso, flour
   dust; same frame set. Beside the Tome Golem to prove the difference.
6. **Timeline heads** for the three new foes (`build_heads.py` entries). Field sprites for the field-visible groups are the
   leader's: `thornback_wolf`, `tome_golem`, `ink_wraith`, `moss_scarab`, `briar_wolf`, `ink_blot` already exist; check each
   still reads on the new terrains with a rim light mock (grass, flagstone, wet brick).
7. No portraits. If you can hand-pixel `hesper` or `brindle` to Episode 1's painted tier, show it side by side with `mael` and
   keep it only if it matches (house rule); otherwise say none.

## Rules

- Owned paths: `tools/art/sprites/x1_*` and `tools/art/sprites/chars/x1_*` (new scripts and spec entries only, plus the one `x1` entry line in `tools/art/sprites/build_all.py`), `assets/sprites/x1_*` (**new atlases only**: `x1_npcs`, `x1_enemies_battle`, `x1_enemies_field`, `x1_bosses_battle`, `x1_heads`, whichever you need; frame ids are the NPC and enemy ids, found by XP-packs' atlas lookup),
  `assets/ui/x1_heads.*`. **You edit no shared atlas, no `assets/ui/heads.*`, no `assets/manifest.json`.** Register with `node qa/core/sync-manifest.mjs --pack x1` (the orchestrator runs it again at wave close).
- No non-integer scaling of pixel art. No git, no em dashes, bounded commands, targeted renders.
- Verify: `python tools/art/sprites/build_all.py`; `verify.py`; contact sheets at 4x; phone-scale crops of every field foe on grass,
  flagstone and brick mocks; `node qa/run.mjs core`.
- Report under 400 words: ids and frame names the maps and scenes use, preview paths, what fell back.
