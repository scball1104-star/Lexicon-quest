# E6-sprites: NPCs, enemies, the Gale Engine, the Storm Scribe, the Beacon and the Compass, portraits (wave 6b, beside E6-tiles and E6-world)

## Inputs (read first, in this order)

The repo's `AGENTS.md`, `docs/briefs/COMMON.md`, `DESIGN.md` 6.3, `docs/story/EPISODE6.md` section 3 (looks),
`docs/EPISODE6_PLAN.md` 0.1, 6.2, 6.4, 6.5, 9.0 and 9.2 (your contract), `docs/PWA_PACKS.md` (pack atlases `<id>_npcs`,
`<id>_enemies_battle`, `<id>_enemies_field`, `<id>_bosses_battle`, `<id>_portraits`, `<id>_heads` merge into the base
atlases at runtime), `docs/CRITIQUE_6.md` items 8, 9, 10, 12 and 15, `docs/CRITIQUE_7.md` item 2, and the Episode 5
scripts `tools/art/sprites/ep5_*.py` (the recolor recipes, the Oracle's looks, the Futures).

## Owned paths

`tools/art/sprites/chars/ep6_*`, `tools/art/sprites/ep6_*.py` (+ one line in `build_all.py`), `assets/sprites/ep6_*`,
`assets/ui/ep6_heads.*`, `qa/core/ep6_sprites*`. Prefixed files only; never rewrite a base atlas.

## Outputs (items, in order)

1. **NPC specs** (`chars/ep6_*`): Aeris (fifties, aviator coat with brass buttons, goggles in grey-streaked hair, the
   compass on a chain), Liora (thirties, navigator's sash of knotted cords, a letter), Bennet (sixties, grey, rope-burned
   hands), Suri (twenties, ink to the wrists, dividers in her braid), Ilex (smith body, brass apron), Nova (deckhand), Piri
   (courier with a satchel), Thea (gardener), Pippa (about twenty, signal-jacket with brass tabs, a hand lamp), a younger
   Aeris for the memories, two deckhand recolors; the Cloudhouse Host as an innkeeper recolor. Ages must read (CRITIQUE_6
   item 10).
2. **Enemy battle sprites**, the seven of 6.2, each from its listed `enemies.webp` cell (or the Lost Page sprite),
   recolored to storm slate, cloud white, cobalt and brass so none reads as its Episode 5 cousin; a dark outline on every
   foe and a side-coded rim (white for Aloft, brass for grounded); derived frames (idle, attack, hurt, cast where used,
   die); field sprites with the same outline and rim, **checked on each floor at phone scale, on cloud and on plank**, not
   on the sheet background (CRITIQUE_6 item 8).
3. **The Gale Engine** (cell 4: brass and cobalt, fan blades drawn into the core, bellows on its back).
4. **The Storm Scribe**: three looks (The Wind Script as painted; The Ward with a ring of false lamplight and a spinning
   compass rose behind it, quills scattered; The True Sky Chart with the wings opened like sails showing the Wind Script's
   lines, lightning in the wingtips) from `bosses.webp` cell 5 at 1x, plus `scribe_avatar` (front and back, perched). A
   readable focal point at phone size. Do not touch bosses cells 6 and 7 (held).
5. **The False Beacon and the Broken Compass**: one small new sprite each (a lamp on a broken mast about 40 x 60; a brass
   compass rose about 48 x 48 with a cracked needle), each with a ground shadow, sized to stand in front-row foe slots
   beside the Scribe with their HUD rows under their own feet (CRITIQUE_7 item 2).
6. **Portraits**: `scribe` crop readable at 48 in `ep6_portraits` (the head, one blue wing, a quill). Aeris has none (plan
   9.5).
7. **Timeline heads** for every new foe in `ep6_heads` (the scene draws the Aloft badge; do not bake it).

## Done when

Every id is in its pack atlas; contact sheets at 4x are viewed; the side-by-side check (the Scribe, the Engine and the
Lightning Manta beside the Sand Oracle, the Paper Regent and the Cinder Warden) shows six different beings; phone-scale
crops of every field enemy on each floor's mock are viewed; `node qa/run.mjs core pwa` is green with the initial download
unmoved.

## Tests to run

`python tools/art/sprites/build_all.py` (your one line); `verify.py`; `node qa/core/sync-manifest.mjs --pack ep6`; `node
qa/run.mjs core pwa`. Tests you add: every frame name the scene and the field ask for exists; every look id the boss's
phases name exists (so `enterPhase` can forward it).

## Traps

- **Boss phase changes forward `sprite` in `ai.js` `enterPhase`**: name your three look ids exactly as E6-battle's phases
  do, or the Scribe never changes look.
- **`assets/ep6_manifest.json` is generated**; the orchestrator must `git add` it at wave close: say so.
- Field foes camouflage: the rim and outline are not optional; check them on the real floor art, not the sheet.
- No non-integer scaling of pixel art.
- House rules: no git; LF endings (count CR bytes before and after: zero); no em dashes; stay in owned paths; bound every
  command; targeted renders; no paid generation.

## Report (under 400 words)

Ids, frame names the scene uses, look ids per phase, preview paths, what fell back, and the manifest note.
