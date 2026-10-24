# E3-tiles: the forge tileset, the Emberpeak kit, backdrops (wave 17b, run 4 of 10)

Read `docs/briefs/COMMON.md`, `DESIGN.md` 6.1 to 6.2, `docs/EPISODE3_PLAN.md` sections 4 (what the maps need), 5.1
(tile keys `flow`, the trough, slag and crust frames, hot grates) and 9.1 and 9.3 (your contract), and
`docs/CRITIQUE_4.md` items 3, 6, 7 and 13 (dusk read as daylight; grey grids in black; resting machine states
unreadable on the phone; one floor pasted into the next).

## Items, in order

1. **`forge.png`**: three foundry terrains and three wall systems (one per floor, visibly different, with per-room
   variety), `slag` (A1, 3 frames, `flow: 'slag'`), `slag_crust`, trough tiles dry and wet (`flow: 'channel'`), and the
   objects of 9.1 with exact ids and collision codes. The sluice's two states and every trough's wet/dry state must read
   at phone scale (render the phone crop and check).
2. **`ember.png`**: the Emberpeak town kit (prefabs with `doorAt`, the bell tower with silent and ringing frames, the
   memorial plate overlays: flat, soft, lettered), `ash_ground`, `cinder_path`, the road props, `emberpeak_far`.
3. **Backdrops** of 9.3 with `bandY` / `bandAlpha`; mock stages via `mock_stage.py`.
4. **Tint check** for `ash_haze` (the tint itself is E3-world's): give E3-world a target by rendering a mock town crop
   with a warm grey multiply and measuring mean luminance against `none` (at least 12% darker).
5. A contact sheet and a mock F1 Slag Hall (spout, sluice, two pools, one crusted) at 3x for the critics.

## Rules

- Owned paths: `tools/art/tiles/**`, `assets/tiles/**` (new sheets; append to `tiles.json` without moving any existing
  rect), `tools/art/backdrops/**`, `assets/backdrops/**`, `qa/core/**` only for manifest tests.
- Palette discipline: new colors only where `palette.json` cannot carry slag and brass (report each). No git, no em
  dashes, bounded commands, one browser job at a time.
- Verify: `python tools/art/tiles/build_tiles.py`; view every sheet and mock at 3x or 4x; `node qa/run.mjs core`;
  `node qa/core/sync-manifest.mjs`; precache stays under the budget (`qa/pwa/precache.test.mjs`).
- Report under 400 words: ids delivered, collision and `flow` keys, new colors, preview paths, anything the plan asked
  for that you changed.
