# E4-sprites: NPCs, enemies, the Barrister, the Paper Regent, the writs, portraits (wave 4b, beside E4-tiles and E4-world)

Read `docs/briefs/COMMON.md`, `DESIGN.md` 6.3, `docs/story/EPISODE4.md` section 3 (looks), `docs/EPISODE4_PLAN.md`
6.2, 6.4, 6.5, 9.0 and 9.2 (your contract), `docs/PWA_PACKS.md` (pack atlases `<id>_npcs`, `<id>_enemies_battle`,
`<id>_enemies_field`, `<id>_bosses_battle`, `<id>_portraits`, `<id>_heads` merge into the base atlases at runtime),
`docs/CRITIQUE_4.md` items 5, 8, 9 and 15, and the Episode 3 scripts `ep3_enemies.py`, `ep3_warden.py`, `ep3_coils.py`,
`x1_build.py`.

## Items, in order

1. **NPC specs** (10, `chars/ep4_*`): Lyra (match `noble_lady`: dark skin, braided black hair with grey, gold circlet,
   sapphire robes dull at the hem), Hale, Nilo, Dorian, Joss, Vance, Linn, Sori (child), the King (memory), a boatman.
   Ada reuses `npc_courier_v`.
2. **Enemy battle sprites**, the seven of 6.2, each from its listed `enemies.webp` cell, at 1x, rim-lit so dark foes
   read on dark stages; derived frames (idle, attack, hurt, cast where used, die); field sprites with rim light.
3. **The Barrister** (cell 1 recolored: black gown, white collar, ink-blue hands, paper sleeves) and its witness (a
   small Blank Decree); **the writs** (one small new sprite, two recolors).
4. **The Paper Regent**: three looks (Forged Edicts, Royal Ward with a halo of floating writs, True Charter with bare
   vellum robes, a paper crown and a pen for a trident) from `bosses.webp` cell 3 at 1x, plus `paper_regent_avatar`
   (front and back). A readable focal point at phone size. Do not touch bosses cells 4 to 7 (held).
5. **Portraits**: `paper_regent` crop readable at 48 in `ep4_portraits`; Lyra needs none (alias to `noble_lady`).
6. **Timeline heads** for every new foe in `ep4_heads`.

## Rules

- Owned paths: plan 11.1, row E4-sprites. Prefixed files only; never rewrite a base atlas.
- No non-integer scaling of pixel art. No git, no em dashes, bounded commands, targeted renders.
- Verify: `python tools/art/sprites/build_all.py` (your one line); `verify.py`; contact sheets at 4x; the Regent, the
  Barrister and the Waterlogged Sentinel side by side with the Cinder Warden and the Nameless King so all read as
  different beings; phone-scale crops of every field enemy on a wet-stone mock; `node qa/core/sync-manifest.mjs --pack
  ep4`; `node qa/run.mjs core pwa` (initial download unmoved).
- Report under 400 words: ids, frame names the scene uses, preview paths, what fell back.
