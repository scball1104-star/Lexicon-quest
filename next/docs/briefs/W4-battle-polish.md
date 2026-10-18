# W4-battle-polish: a real stage, readable timeline, clean transition, impact

**Owned paths:** `next/src/scenes/battle.js`, `next/src/battle/scene/**`, `next/src/battle/fx.js`,
`next/src/battle/ai.js` (the Auto brain only), `next/qa/battlescene/**`, `next/docs/BATTLE_SCENE.md`.

Read `next/docs/CRITIQUE_1.md` (C3, C4, C5, C11, C13 check), `next/docs/PLAYTEST.md` section 7 (Auto loses on
F3 ink-wraith groups), then `docs/BATTLE_SCENE.md` and the scene code. The art agent is producing, in
parallel, `assets/backdrops/battle_*.png` (384x216, palette-quantized, with `<id>.json {bandY, bandAlpha}`)
and `assets/ui/heads.png/json` (`head_<id>` 12x12 icons). Code against those ids with a fallback to today's
behavior when the asset is missing, so your work lands whether or not theirs is done first.

## Deliverables
1. **Stage (C3):** draw the backdrop, then an indigo lower band (from the backdrop json, else y 150..216 at 55%
   alpha with a 2 px dithered top edge), a single baseline per side, ellipse shadows (misc atlas) under every
   unit scaled by sprite width, and place feet on the baseline so nobody floats. Enemies get a 2-frame breathe
   (1 px vertical scale wobble) and a hurt squash.
2. **Timeline (C4):** use `head_<id>` icons; party frames blue, enemy frames red, current slot gold with a
   pulse, preview slot dashed; keep the "next 8" order and the preview behavior.
3. **Transition (C5):** replace the free-angle shard rotation with axis-aligned slices (12 vertical strips that
   slide out alternately up/down over 18 frames) over a mosaic step, then the backdrop reveal; remove the stray
   glyph the critique saw at battle start (find it in the transition drawing code).
4. **Impact (C11):** slash arc 2 px with a trailing fade, a 4-frame impact star at the hit point, hit-stop 4 frames
   on crits and Break, 2 frames on normal hits, 1 px camera kick toward the target; thrust gets a motion line,
   chop a wedge, arrows a trail, magic a brief bloom. Keep reduceMotion respected.
5. **Auto brain (PLAYTEST 7):** heal at 55% in groups of 3 or more enemies, revive before attacking, prefer
   Break when a telegraph is pending, and use Defend when a party member is below 35% and the healer is not
   ready. Re-run `node next/tools/sim/simulate.mjs --check` and keep all targets met (adjust only the policy, not
   enemy stats; if F3 still fails with the better policy, report it rather than nerfing).
6. **Victory window** must not overlap the help bar or timeline (verify the integrator's fix holds with the
   new timeline).

Verify with `python next/qa/shots.py --only battle_*` on desktop and phone, the filmstrips in
`qa/battlescene/`, and `python next/qa/battlescene/autobattle.py`. Keep `node next/qa/run.mjs` green. Report with
before/after image paths.
