# W5-art: a valley battle stage, readable dark sprites, real ink, a block that reads as a block

**Owned paths:** `next/tools/art/**`, `next/assets/tiles/**`, `next/assets/sprites/**`, `next/assets/backdrops/**`.
No `src/` edits (two coding agents are running). Keep every existing id, frame name, origin and rect unchanged;
add new ids where needed and report them.

Read `next/docs/CRITIQUE_2.md` (items about the valley battle backdrop, near-black sprites on the Archive
stage, hidden-ink pits and bridges, the push block), `assets/backdrops/README.md`, `assets/tiles/README.md`.

## Deliverables
1. **Daytime valley battle backdrop** `assets/backdrops/battle_valley.png` (replace; same id and json shape):
   there is no painted valley, so compose one from the game's own tiles and props at 384x216: a wide meadow
   with the river and the stone bridge in the middle distance, Whisperwood pines on the left, cliffs on the right,
   soft sky with 2 to 3 cloud bands, all in the master palette, with a gentle atmospheric lightening toward the
   horizon (dithered). It must look like a Secret of Mana field, not a map screenshot: use larger-scale silhouettes
   for distant trees (draw them, do not just tile), and leave the lower 40% calm so sprites read. Keep
   `bandY`/`bandAlpha` in the json. Also produce `battle_valley_dusk.png` (same scene, evening palette) as an
   optional id for late-day fights.
2. **Dark sprites on the dark stage:** give `bookmite`, `ink_wraith`, `page_wraith` and the Archivore's lower body a
   1 px rim light (a lighter ramp step on the upper-left edges) and lift their darkest fill one ramp step, so they
   separate from the Archive stage; keep frame rects. Check against `assets/backdrops/battle_archive.png` and
   `battle_boss.png` in a 3x mock you render.
3. **Ink art:** replace the flat navy for `ink` (the animated pool), `*_faint` hidden-ink tiles and the revealed
   bridge: the pool gets a dark violet-indigo body with slow highlight ripples (3 frames) and a lighter meniscus
   edge; faint tiles show a barely-there dotted outline of planks (so the Lantern reveal has something to
   reveal); revealed bridge tiles are weathered planks with an ink sheen. Pit rims stay.
4. **Push block:** redraw as a carved stone block (rounded top, a handle groove on the front, a soft shadow
   underneath) that cannot be mistaken for furniture; keep the id and rect.
5. Rebuild deterministically with the existing build scripts, run `node next/qa/run.mjs` (assets and maps suites),
   view everything at 3x, and update the READMEs. Report new ids and image paths.
