# E8-sprites: the Scriptorium cast, the foes, the Sentry, the Eraser's four looks, the portraits (wave 8b)

Make every Episode 8 sprite through the existing pipelines, and use the held First Keeper portrait at last.

## Inputs (read first, in this order)

The repo's `AGENTS.md`, `docs/briefs/COMMON.md`, `DESIGN.md` section 6, plan `docs/EPISODE8_PLAN.md` sections 6.2, 6.4, 6.5
(the looks and HUD anchors) and 9.0 to 9.2 (your contract), `docs/story/EPISODE8.md` section 3 (who everyone is and how old
they must read), `ART_PROMPTS.json` bosses cell 7 and portraits cell 7, the Episode 7 sprite tools (`tools/art/sprites/ep7_*`,
`chars/ep7_*`) as your models, `build_bosses.py`, `build_portraits.py`, `build_heads.py`, CRITIQUE_6 item 10 (ages must read)
and CRITIQUE_8 item 1 (boss rows).

## Owned paths

`tools/art/sprites/chars/ep8_*`, `tools/art/sprites/ep8_*.py` (+ one line in `build_all.py`), `assets/sprites/ep8_*`,
`assets/ui/ep8_heads.*`, `qa/core/ep8_sprites*`.

## Outputs (items, in order)

1. **NPC specs** of plan 9.2 (12) through the paper-doll builder: the Librarian (hood up, face in shadow) and the First Keeper
   (hood back; very old, straight, gold eyes, a book clasp) as one man in two sprites, his younger memory self, Elowen (forties,
   a Keeper's grey, ink to the wrists, a quill behind one ear) and her younger self in an infirmary bed, an infirmary nurse
   (`npc_nurse_m`, a recolor), Ione, Fen, Quinn, Sorel, Arun, Meya (a child, ink on her nose), the Rootbound
   Keeper in memory (a green-bronze lantern); the two counter recolors; the baby bundle prop in fine grey infirmary wool with a pale linen tag, and the nurse's
   empty blanket (2026-11-11, plan 9.2).
2. **Enemy battle and field sprites** for the 7 foes of 6.2 from `enemies.webp` cells and the Lost Page sprite, recolored to ink,
   violet, cream and gold so none reads as an Episode 7 cousin, each with a dark outline and a warm rim; field sprites checked on
   parchment, marble, white page and over the void at phone scale.
3. **The Unnamed Sentry** from cell 5: ink and gilt, a blank faceplate, a cracked-faceplate frame for 50%.
4. **The Eraser** from bosses cell 7 at 1x in the 160 x 144 cell: four looks (Closed Book as painted; the Rejected Truths;
   The Keeper Remembers with the face half drawn in gold; The Last Silence torn to blank pages), **one HUD anchor in all four**;
   the field avatar (the stair figure, with a back frame and a trailing sleeve). **Grief and Change**: two small new sprites with
   ground shadows.
5. **Portraits:** `first_keeper` registered from the built `hooded_sage` cell (no redraw); `eraser` cropped from bosses cell 7,
   readable at 48. Timeline heads for every new foe and NPC who fights or speaks in battle.
6. `node qa/core/sync-manifest.mjs --pack ep8`.
7. **Tests**: every sprite id resolves through the pack atlas merge; no id collides; the four looks share the anchor; row
   placement data for E8-scene-ui.

## Done when

Contact sheets for NPCs, foes, the Sentry, the Eraser's looks, Grief and Change, the avatar and the portraits are rendered and
**viewed** on phone-scale backgrounds of each map; ages read; `sync-manifest --pack ep8` ran.

## Tests to run

`python tools/art/sprites/build_all.py` (ep8 only), `node qa/run.mjs core`, your contact-sheet renders.

## Traps

- **Grief is not Episode 2's reflection of grief:** the same idea on purpose, a different sprite (wet pages, a hood).
- **The Librarian's face stays in shadow** in every frame of `npc_librarian`; the face appears only in `npc_first_keeper` and the
  portrait (the twist is shown in order).
- **No new art beyond the pipelines and the held cells**; no Runway or Suno (plan 9.5 is Scott's).
- The manifest is generated: the orchestrator `git add`s it. House rules: no git; LF endings; no em dashes; owned paths only;
  bound every command; never touch base atlases.

## Report (under 400 words)

What you made and from which cell, the images you viewed (paths), the sprite, look, avatar, portrait and head ids, the HUD
anchor numbers, and any spec you changed and why.
