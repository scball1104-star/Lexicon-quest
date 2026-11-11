# E8-scene-ui: the battle scene's Erasure, Read Aloud and Answer menus, the HUD, the title row (wave 8d, first)

Make Episode 8's battle readable on a phone and its two skills castable from the real menu, with pack-side wraps.

## Inputs (read first, in this order)

The repo's `AGENTS.md`, `docs/briefs/COMMON.md`, `DESIGN.md` sections 3 and 7, plan `docs/EPISODE8_PLAN.md` sections 0.1, 6.3 to
6.5, 9.3 (the grades), 12 (the menu-path gate items) and 5.3 (the title row), E8-battle's and E8-story's reports (events,
battle text), the built `src/data/ep7/scene.js` and `title.js` (your models), `src/data/ep4/scene.js` and `src/data/ep5/scene.js`
(the Answer and Turn the Sky entries you must not disturb), `src/battle/scene/menu.js` (`startTarget`, the Tech/Magic lists,
`SIGNATURE_TECHS`), PLAYTEST_REVIEW_7 item 1 (Turn the Sky shipped uncastable), CRITIQUE_8 item 1.

## Owned paths

`src/data/ep8/scene.js` (prototype wrapping), `src/data/ep8/title.js`, `qa/battlescene/ep8_*`, `qa/ui/ep8_scene*`,
`qa/realplay/ep8battle.py`; a core line in `src/battle/scene/**` or `src/scenes/battle.js` only if no wrap can reach it, paid by a
trim in the same change, with the gzipped numbers.

## Outputs (items, in order)

1. **The rubbed-out row:** a disabled command drawn smudged (40% word, a pale rubbed band, two pips that empty), its help "Rubbed
   out. Try something else.", a buzzer on confirm; a Magic row that is rubbed out still opens, listing Read Aloud lit and every
   other spell greyed.
2. **The HUD:** eraser-crumb pips under each member's name; the smudge on a timeline head; the Unwritten look on a member
   (greyed sprite, every row but Defend smudged); the Unwrite's grey ribbon on stage and timeline; the Last Silence's
   whole-stage dim (capped) and charge bar on the Eraser's row; the battle text from E8-story at the moments E8-battle's events
   fire, including "Mira can read him back." / "{hero} can answer it." only when that member acts first.
3. **The signature floats:** while an Unwrite is pinned, Mira's Magic list opens on Read Aloud, first, in gold, with the cursor
   on the pin's target (Mira's Turn the Sky entry yields); while the Last Silence charges, the hero's Tech list opens on Answer,
   first, in gold (Answer's Episode 4 entries yield); Read Aloud's 12 x 12 icon drawn in code.
4. **`menu.js startTarget`** accepts every target kind Episode 8 needs (an ally including the caster); if a wrap cannot reach it,
   take the one paid core line.
5. **The Eraser's stage:** the violet and gold grades cross-fading at the ward's break; the four looks; the row anchors; Grief and
   Change rows under their feet, at least 12 internal px from any party sprite (the row-placement test with all four looks).
6. **`title.js`**: the "Episode 8: new party" row, its help line, the folded rows at 375x812 and 844x390 with seven episode rows;
   the finished slot's gold star if a wrap can draw it (drop it if it needs a core edit, and say so).
7. **Tests:** `qa/battlescene/ep8_menu_cast.test.mjs` with the five cases of plan 12 **through `menu.js`, never
   `LQ_DEBUG.battleAct`**; `qa/realplay/ep8battle.py` (real keys and a real tap: Read Aloud at the pin's target, at Mira, from a
   rubbed row; Answer at the Last Silence; reading back `unwrite_broken`/`read` and `silence_broken`/`answer`); readability
   measures of the smudged row, pips, ribbon and dim on 844x390; phone shots **viewed**.

## Done when

`node qa/run.mjs battlescene ui pwa` is green; the menu-cast test and the realplay casts pass; the phone shots are viewed; the
pre-tap load is unchanged (or the core line paid with numbers).

## Tests to run

`node qa/run.mjs battlescene ui pwa`; `python qa/realplay/ep8battle.py` (local, bounded, one browser job at a time).

## Traps

- **A bot never opens the menu.** That is how Turn the Sky shipped broken. Your test opens it.
- **Two old entries share the hero and Mira:** Answer (Episode 4) and Turn the Sky (Episode 5). Make the right one float; break
  neither in their own episodes (run their suites).
- **One telegraph at a time** is E8-battle's rule; if you ever draw two, it is a bug to report, not to paint over.
- **Photosensitivity:** the Silence dim and the white-out stay under their caps; no flashes.
- House rules: no git; LF endings; no em dashes; owned paths only; bound every command; the hero has no speech box.

## Report (under 400 words)

What you wrapped and where, any core line (with gzipped bytes in and out), the readability numbers, the test and realplay
results, the shots viewed (paths), and anything E8-integrate must know.
