# E5-sprites: NPCs, enemies, the Mirage Knight, the Sand Oracle, the False Futures, portraits (wave 5b, beside E5-tiles and E5-world)

Read `docs/briefs/COMMON.md`, `DESIGN.md` 6.3, `docs/story/EPISODE5.md` section 3 (looks), `docs/EPISODE5_PLAN.md` 0.1,
6.2, 6.4, 6.5, 9.0 and 9.2 (your contract), `docs/PWA_PACKS.md` (pack atlases `<id>_npcs`, `<id>_enemies_battle`,
`<id>_enemies_field`, `<id>_bosses_battle`, `<id>_portraits`, `<id>_heads` merge into the base atlases at runtime),
`docs/CRITIQUE_6.md` items 8, 9, 10, 12 and 15, and the Episode 4 scripts `tools/art/sprites/ep4_*.py` (the recolor
recipes, the regent looks, the writs).

## Items, in order

1. **NPC specs** (`chars/ep5_*`): Sel (wind-dark skin, dust wrap, saffron headscarf, brass sun staff), Yara (sailor, rope
   coil), Kamal, Nasrin (sixties), Laleh (twenties, ink to the elbows), Omar (sixties), Yasmin, Hassan (smith body),
   Ishra (memory: Sel's staff, older, indigo wrap), Tamir, young Sel (memory child), two traveler recolors; the Dune Host
   as an innkeeper recolor. Ages must read (CRITIQUE_6 item 10): grey where the bible says sixties.
2. **Enemy battle sprites**, the seven of 6.2, each from its listed `enemies.webp` cell, recolored to desert gold, ochre
   and indigo so none reads as its Episode 4 cousin; a dark outline on every foe and a side-coded rim (gold for sun foes,
   pale blue for star foes); derived frames (idle, attack, hurt, cast where used, die); field sprites with the same
   outline and rim, **checked on each Labyrinth floor at phone scale**, not on the sheet background (CRITIQUE_6 item 8).
3. **The Mirage Knight** (cell 5: sun-bronze armor, the shield's face a painted sea horizon) and its double (indigo, 0.9x).
4. **The Sand Oracle**: three looks (The Read Sky as painted with the mask; False Futures with a ring of drifting sand and
   a cracked mask; True Horizon with the shell split, the starfield bright and a face of stars) from `bosses.webp` cell 4
   at 1x, plus `oracle_avatar` (front and back, coiled). A readable focal point at phone size. Do not touch bosses cells
   5 to 7 (held).
5. **The False Futures**: one small new sprite (a cracked hourglass wearing a mask, about 40 x 58, with a ground shadow)
   and two recolors (Hunger gold, open-jawed mask; Fear indigo, hollow eyes), so they read as hazards beside the boss
   (CRITIQUE_6 item 15).
6. **Portraits**: `oracle` crop readable at 48 in `ep5_portraits` (the mask and one golden claw). Sel has none (plan 9.5).
7. **Timeline heads** for every new foe in `ep5_heads` (the scene draws the sky badge; do not bake it).

## Rules

- Owned paths: plan 11.1, row E5-sprites. Prefixed files only; never rewrite a base atlas.
- No non-integer scaling of pixel art. No git, no em dashes, bounded commands, targeted renders.
- Verify: `python tools/art/sprites/build_all.py` (your one line); `verify.py`; contact sheets at 4x; the Oracle, the
  Knight and the Tomorrow Husk side by side with the Paper Regent, the Cinder Warden and the Nameless King so all read as
  different beings; phone-scale crops of every field enemy on each floor's mock; `node qa/core/sync-manifest.mjs --pack
  ep5`; `node qa/run.mjs core pwa` (initial download unmoved).
- Report under 400 words: ids, frame names the scene uses, preview paths, what fell back.
