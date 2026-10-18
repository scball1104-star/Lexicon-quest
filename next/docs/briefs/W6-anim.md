# W6-anim: real animation frames for enemies and richer party battle motion

**Owned paths:** `next/tools/art/sprites/**`, `next/assets/sprites/enemies_battle.*`, `next/assets/sprites/
bosses_battle.*`, `next/assets/sprites/party_battle.*`, `next/src/battle/scene/actors.js`, `next/src/battle/scene/
animator.js` (frame selection only), `next/qa/battlescene/**`, `next/docs/BATTLE_SCENE.md` (animation section).
Keep every existing frame name and rect; ADD frames and anims.

Read `docs/BATTLE_SCENE.md`, `src/battle/scene/actors.js`, `assets/sprites/README.md`, and the enemy/boss
generators. Benchmarks: Chrono Trigger and FF6 enemies that breathe, flinch and lunge; Sea of Stars readability.

## Deliverables
1. **Enemy frames** (generator-made, deterministic, from each enemy's base frame): `idle_1` (breathe: 1 px body
   rise, limbs still), `attack` (lunge pose: 2 px forward lean, limbs extended, head lowered), `hurt` (2 px squash
   + recoil, eyes closed/brighter outline), `cast` for casters (page_wraith, ink_wraith, echo_warden: raised
   arms or glow), `die_0/1/2` (dissolve progression: 3 steps of pixel drop-out from the top, used before the
   existing white flash). Field sprites unchanged.
2. **Boss frames:** archivore `idle_1` (wings breathe), `attack` (wings flare, eye wide), `hurt`, `cast` (ink
   inhale: body contracts, eye glows), `devour` (eye enlarges, tendrils reach); lost_page already flutters;
   echo_warden gets stance frames `mirror` and `bulwark` (shield angle changes) plus attack/hurt.
3. **Party battle extras:** `hero/mira/bram`: `idle_1` breathing for each weapon idle, `crit` (bigger wind-up),
   `combo` (shared dramatic pose), `levelup` (small jump frame). Keep the existing poses.
4. **Scene:** `actors.js` plays the new anims when present (fallback to the code-driven bob/squash when a frame
   is missing): idle 2-frame breathe at 36 frames, attack frame during `move_to`/`action_start`, hurt on
   `damage`, cast on magic/telegraphs, die_0..2 before the flash, stance frames on `stance` events, combo pose on
   combo actions, levelup frame in the level-up window. Elites keep their tint.
5. **Verify:** `qa/battlescene/autobattle.py` filmstrips for an attack, a hurt, a cast, a death, the Archivore's
   devour, the Warden's stance swap; contact sheets at 4x for every new frame; view them all. `node next/qa/run.mjs`
   green; `python next/qa/shots.py --only battle_*` green. Report image paths.
