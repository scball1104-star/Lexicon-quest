# E6-scene-ui: the battle stage, the Gale, Anchor's menu path, the title row and credits for Episode 6 (wave 6d, alone, before E6-integrate)

## Inputs (read first, in this order)

The repo's `AGENTS.md`, `docs/briefs/COMMON.md`, `DESIGN.md` 6.4 and 7, `docs/EPISODE6_PLAN.md` 0.1, 6.3 to 6.5, 9.3, 10
and 13 (your contract), `docs/CRITIQUE_7.md` items 1, 2 and 10, `docs/PLAYTEST_REVIEW_7.md` items 1, 2 and 9,
`src/data/ep5/scene.js` (how a pack wraps `Planner` and `Actor`, adds `BACKDROPS` and `BOSS_CARD`, draws the timeline
marker and `PIPS`, pushes `SIGNATURE_TECHS`, draws a Tech icon), `src/battle/scene/menu.js` (`startTarget`, the sub-menu
confirm for `mode === 'none'`, `SIGNATURE_TECHS`), `qa/realplay/ep5battle.py` and the `ep5_menu_cast` scene test (your
models), and the E6-pack, E6-battle, E6-tiles, E6-sprites and E6-story reports.

## Owned paths

`src/data/ep6/scene.js` (prototype wrapping, the ep5 pattern), `src/data/ep6/title.js`, `qa/battlescene/ep6_*`,
`qa/ui/ep6_scene*`, `qa/realplay/ep6battle.py`; a core line in `src/battle/scene/**` (`menu.js` above all) or
`src/scenes/battle.js` only if no wrap can reach it, paid by a trim in the same change.

## Outputs (items, in order)

1. **Backdrops** per zone through `BACKDROPS` and each zone's `backdrop` key; the Eyrie's storm and clear grades from
   E6-tiles, cross-faded when the ward tears; the soft lightning layer within plan 5.2's limits.
2. **The Gale on the timeline:** the wind gauge at the timeline's head and the Gust marker (a white spiral disc, at least 12
   x 12 on the phone, dark ring) at the slot where the Gust falls, moving as the timeline changes; "The wind gusts." with
   `gale_gust` and streaks across the stage; every push animated as the unit's head sliding with a streak. A pinned rewrite
   draws a red quill on the marker. While the Gale Engine's bellows run, the gauge shows the shorter count.
3. **Aloft and anchored:** the Aloft badge (a white feather, 8 x 8, 1 px dark outline) at the head of each Aloft foe's
   weakness row; a small anchor glyph over each Anchored or Braced party member when the Gust is 2 actions away or less.
   Measure on the 844x390 crop: badge and marker at least 0.15 luma above their box. Rows under the feet for the Engine, the
   Scribe, the False Beacon and the Broken Compass, never across a body; the Beacon and the Compass in front-row foe slots
   beside the Scribe (CRITIQUE_7 item 2): add all four to the row-placement test.
4. **Anchor and the rewrite:** push `{ unit: 'bram', flag: 'rewrite', skill: 'anchor_line' }` onto `SIGNATURE_TECHS` (Bram
   already has the Episode 3 Oath entry: make sure the right one floats when a rewrite is pinned) so his Tech list opens on
   Anchor, first, in gold; the telegraph line names the answer's owner and is conditional ("Bram can anchor." only when he
   can act before it lands: PLAYTEST_REVIEW_7 item 2); the break plays `rewrite_break` with paper tearing away and one clean
   message ("The course holds. The Scribe is thrown back."), the action name printed once; the low-MP hint from E6-story's
   text; Anchor's 12 x 12 icon on its Tech row (CRITIQUE_7 item 10).
5. **The menu path, proved with real input.** Anchor is `target: 'none'`. Confirm it from the Tech list must cast at once,
   with keys and with a tap (E5-fixes A1 made `menu.js` do this for `none`; keep it so). **`menu.js startTarget` must accept
   every target kind Episode 6 adds** (the plan adds none; if E6-battle's report names one, make `startTarget` take it and
   pay the bytes). Add `qa/battlescene/ep6_menu_cast.test.mjs` (casts Anchor through `menu.js`, never through
   `LQ_DEBUG.battleAct`, which closes the menu itself and so cannot see a menu bug) and `qa/realplay/ep6battle.py` (one cast
   with real keys and one with a real touch tap, a rewrite pinned, the `rewrite_break` event read back).
6. **The bosses:** the Engine's bellows animation and its sprites' entrance; the Scribe's three looks swapped at phase
   changes (sprite forwarded in `enterPhase`), the Beacon's and the Compass's entrance, the ward (a ring of false lamplight
   that tears); boss intro cards THE GALE ENGINE / Keeper of the Broken Signals and THE STORM SCRIBE / Writer of Every Course
   with the arc lines.
7. **Title**: `src/data/ep6/title.js`, the pack's `LQ_EP6.title(scene)`: the "Episode 6: new party" row and help line, the
   slot picker through `pickRunSlot` (notice, refusal with only Back), name entry, `newGameEp6`; the folded title keeps the
   episode rows together on the phone with five episode rows (check 375x812 and 844x390). Credits accept `CREDITS_EP6`; the
   end cards; the journal and bestiary hold Episode 6 content without overflow on the phone. If `vex_falls` needs the rope
   helper E6-story asked for, add it to the pack (a cutscene draw, not a field system).

## Done when

Everything above draws on desktop and on the phone profile, the contrast numbers are measured, `ep6_menu_cast` passes and
the realplay cast passes with both keys and touch, and the pre-tap bytes did not grow.

## Tests to run

`node qa/run.mjs battlescene ui pwa`; `python qa/battlescene/autobattle.py` on `e6a_first`, `e6o1_mixed`, `gale_engine`
and `scribe` (with `?pack=ep5,ep6`); `python qa/realplay/ep6battle.py`; shots of the marker and a Gust, Aloft against
grounded foes in one group, a rewrite pinned and broken, each Scribe look, the Beacon and the Compass in their slots, the
title with and without a free slot, desktop and phone.

## Traps

- **Menu-path bugs are invisible to bots** (Episode 5's blocker): `LQ_DEBUG.battleAct` closes the menu itself. Only the
  scene test through `menu.js` and the realplay run prove Anchor can be cast.
- **Runway-painted pack stages leave `backdropLayer.painted` false**: wait on `usedAsset` in any stage test.
- **Boss phase changes forward `sprite` in `ai.js` `enterPhase`** (E6-battle's); your scene must draw what it forwards.
- **The pre-tap budget.** Wrap before you edit; a core line only when no wrap can reach it, paid by a trim; report the
  gzipped pre-tap bytes before and after (`LQ_RELEASE=1 node qa/run.mjs pwa`).
- **Hot file `menu.js`** is yours alone in 6d, and only for item 5.
- The phone is the bar. House rules: no git; LF endings (count CR bytes before and after: zero); no em dashes; stay in owned
  paths; bound every command; one browser job at a time.

## Report (under 400 words)

What draws where, the contrast numbers, shot paths, test counts (including the menu-cast and realplay results), bytes,
anything the integrator must wire.
