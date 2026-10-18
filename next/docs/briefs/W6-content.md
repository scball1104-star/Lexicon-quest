# W6-content: the Whisperwood Hollow, an optional secret dungeon with a mini-boss

**Owned paths:** `next/src/data/maps/whisperwood_hollow.js` (new) and small edits to `next/src/data/maps/valley.js`,
`next/src/data/story/**`, `next/src/data/npcs.js`, `next/src/data/quests.js`, `next/src/data/text.js`,
`next/src/data/enemies.js`, `next/src/data/encounters.js`, `next/src/data/loot-tables.js`, `next/src/data/items.js`
(one new unique), `next/qa/content/**`, `next/qa/maps/**`, `next/qa/battle/data.test.mjs` (only if a data shape
changes), `next/docs/story/**`, `next/docs/MAPS.md`, `next/docs/BATTLE.md` (section 6 table row).

Context: Lufia II and Diablo II reward curiosity with optional places. Episode 1 has one secret chest in the
Whisperwood pool area (`chest_whisperwood`, Quill's hint). Turn that corner of the valley into a short optional
dungeon with a mini-boss and a unique, reachable after the Lantern (the pool's lost bridge is hidden ink).

## Deliverables
1. **Map** `whisperwood_hollow` (about 28 x 20, one floor): a sunken root hollow under the pines (archive tileset
   roots + cliffs + ink pools + the forest props), dark (`lighting.dark` 0.5) with braziers, a hidden-ink bridge
   across the pool at the entrance (needs the Lantern), one push-block puzzle, 3 visible enemies (briar wolves and
   an ink slime elite), 2 chests (one iron with a rare, one gold behind the boss), and the mini-boss room. Entry:
   from `valley` at the Whisperwood pool edge (new `door` events both ways; the valley side shows a cave mouth
   prop or a root arch; keep `chest_whisperwood` where it is). `marks` for the scenes.
2. **Mini-boss** `briar_alpha` (new enemy in `enemies.js`: a large briar wolf, elite-tinted, 2 phases: calls one
   wolf at 50%, gains Haste at 25%; weak to fire and axe; shields 3), using the existing `briar_wolf` battle sprite
   at 1.3x scale or a recolor (document which; the sprites agent is not available, so no new art), encounter
   `whisperwood_alpha` (boss table, no flee), drops the new unique **Thornwake** (axe, rare-tier stats + bleed-style
   poison on hit; add to `items.js UNIQUES` and the boss loot rule). Balance with `node tools/sim/simulate.mjs`
   (add a `whisperwood` zone row expected at Lv 6 to 7; competent policy 6 to 9 rounds; naive loses often).
3. **Story:** scenes `hollow_entry` (the party finds the lost bridge, two boxes), `hollow_alpha` (boss intro in the
   W5 style: pan, silence, title card "BRIAR ALPHA / Warden of the Lost Bridge", shake, flash, battle),
   `hollow_after` (the pilgrims' lost bridge story resolved: a plaque with three names that come back, Mira notes
   the Archive is not the only place names are kept; set `hollow_cleared`). Quill and the Pilgrim's Rest bench get
   post-clear lines. Journal side quest "The Lost Bridge" from Quill's hint to the clear.
4. **Tests:** map validity and reachability (needs `lantern_get`), enemy counts, scene ids and flags, the unique
   and the loot rule, sim target for the zone. `node next/qa/run.mjs` green.
5. `docs/MAPS.md` and `docs/BATTLE.md` rows, preview rendered and viewed (`tools/maps/preview.py`).

Voice and rules as always: no em dashes, 3 lines of 42 chars, ASCII only. The W6-anim agent is editing the
battle actors and sprite generators and the W6-pwa agent the boot files; do not touch those.
