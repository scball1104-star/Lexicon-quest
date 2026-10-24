# E3-sprites: NPCs, enemies, the Specter, the Warden, portraits, icons (wave 17b, run 5 of 10)

Read `docs/briefs/COMMON.md`, `DESIGN.md` 6.3, `docs/story/EPISODE3.md` section 3 (looks), `docs/EPISODE3_PLAN.md`
6.2, 6.4, 6.5 and 9.2 (your contract), `docs/CRITIQUE_4.md` items 5, 8, 9 and 15, and the W12 report's notes on
portrait quality.

## Items, in order

1. **NPC specs** (9 in `chars/npc_specs.py`): Veyra, Ilya (match the `goggles_smith` portrait), Sella, Harl, Bess,
   Taro, Rusk, Mara (memory actor), the Valewyn courier.
2. **Enemy battle sprites**, the seven of 6.2, each from a different `enemies.webp` cell, at 1x, with rim light so ash
   and soot foes read on dark stages; derived frames (idle, attack, hurt, cast where used, die); field sprites with rim
   light (CRITIQUE_4 item 8).
3. **The Bellows Specter** (cell 6 recolored to smoke and ember) and **the coils** (a small new sprite, two recolors).
4. **The Cinder Warden**: three looks (Tempered Iron, Molten Shell, Quenched Core with the clapper hammer-head) from
   `bosses.webp` cell 2 at 1x, plus `cinder_warden_avatar` (front and back). A readable focal point at phone size
   (CRITIQUE_4 item 15).
5. **Portraits**: `ilya` alias to `goggles_smith`; `cinder_warden` crop readable at 48; `veyra` only if it matches the
   Episode 1 painted tier side by side (else none, and say so).
6. **Icons** `icon_heat`, `icon_oath`, `icon_leaf`; timeline heads for every new foe.
7. **Bram's grey** (plan 9.2, Scott decision 2): a recolor of the existing field and battle frames adding grey to
   beard and temples. Render before and after next to the `bram` portrait; keep it behind a single flag in the build
   script so the orchestrator can ship it or not.

## Rules

- Owned paths: `tools/art/sprites/**`, `assets/sprites/**`, `assets/ui/heads.*`, `tools/art/ui/**` (icons only),
  `assets/ui/ui.*` (icons only). Run `node qa/core/sync-manifest.mjs` after adding atlases.
- No non-integer scaling of pixel art. No git, no em dashes, bounded commands, targeted renders.
- Verify: `python tools/art/sprites/build_all.py`; `verify.py`; contact sheets at 4x; the Warden, the Specter and the
  Forge Defender side by side with the Echo Warden and the Nameless King so all read as different beings; phone-scale
  crops of every field enemy on an ash floor mock.
- Report under 400 words: ids, frame names the scene uses, preview paths, Bram before/after paths, what fell back.
