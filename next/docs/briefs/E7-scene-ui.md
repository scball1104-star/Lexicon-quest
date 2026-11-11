# E7-scene-ui: the battle stage, Rime, Call's menu path, the title row and credits for Episode 7 (wave 7d, alone, before E7-integrate)

## Inputs (read first, in this order)

The repo's `AGENTS.md`, `docs/briefs/COMMON.md`, `DESIGN.md` 6.4 and 7, `docs/EPISODE7_PLAN.md` 0.1, 5.2, 6.3 to 6.5, 9.3,
10 and 13 (your contract), `docs/CRITIQUE_8.md` items 1, 2 and 5, `docs/PLAYTEST_REVIEW_8.md` items 5 and 10 and its protect
list, `src/data/ep6/scene.js` (how a pack wraps `Planner` and `Actor`, adds `BACKDROPS` and `BOSS_CARD`, draws the timeline
marker and `PIPS`, pushes `SIGNATURE_TECHS`, draws a Tech icon, wraps `battle.commands` for `SKILL_GATE` and the Defend help),
`src/battle/scene/menu.js` (`startTarget`, the sub-menu confirm, the ally target cursor, `SIGNATURE_TECHS`),
`qa/realplay/ep6battle.py` and the `ep6_menu_cast` scene test (your models), and the E7-pack, E7-battle, E7-tiles,
E7-sprites and E7-story reports.

## Owned paths

`src/data/ep7/scene.js` (prototype wrapping, the ep6 pattern), `src/data/ep7/title.js`, `qa/battlescene/ep7_*`,
`qa/ui/ep7_scene*`, `qa/realplay/ep7battle.py`; a core line in `src/battle/scene/**` (`menu.js` above all) or
`src/scenes/battle.js` only if no wrap can reach it, paid by a trim in the same change.

## Outputs (items, in order)

1. **Backdrops** per zone through `BACKDROPS` and each zone's `backdrop` key; the Stillheart's frozen and thaw grades from
   E7-tiles, cross-faded when the ward thaws; the slow aurora layer within plan 5.2's limits.
2. **Rime on the HUD:** three snowflake pips (7 x 7, 1 px dark outline) left of each party name; the name frosting a third
   at a time and still at least 0.15 luma above its box when fully frosted; the Frozen crack and float; the timeline head
   frosting. Export the drawer so the field's `whiteout` scene can draw the same frost (plan 5.2; E7-story calls it). "Bram's
   name frosts over. He misses his turn." with `rime_freeze`. The Defend row's help in a Rime battle reads "Shake off the
   cold." (from day one: PLAYTEST_REVIEW_8 item 5).
3. **The Farewell and Borrowed Light:** a pale ribbon from the owner to the target on the stage and on the timeline, the
   target's name drawn in frost on the timeline, `farewell_read`; the telegraph line conditional ("{hero} can call her." only
   when the hero acts before it lands: PLAYTEST_REVIEW_7 item 2); the break with ice cracking off the target and one clean
   message ("Mira hears her name. The farewell does not hold."), the action name printed once, `farewell_break`; Stilled
   drawn as the member in a pale ice shell at their place, skipped by foe targeting; the low-MP hint from E7-story's text.
4. **Call and its menu path, proved with real input.** Push `{ unit: 'hero', flag: 'farewell', skill: 'call_name' }` onto
   `SIGNATURE_TECHS` (the hero already has Episode 4's Answer entry on `decree`: make sure Call floats when a Farewell or
   Borrowed Light is pinned) so the hero's Tech list opens on Call, first, in gold, with its 12 x 12 icon, **and the ally
   target cursor opens on the pin's target**. Call is `target: 'ally'` and must also reach a **Stilled ally** (no turn, not
   on the timeline): make `menu.js startTarget` and the ally cursor accept that case if they do not (a wrap first; a core line
   only if no wrap reaches, paid by a trim). Add `qa/battlescene/ep7_menu_cast.test.mjs` (through `menu.js`, never
   `LQ_DEBUG.battleAct`, which closes the menu itself and so cannot see a menu bug): Call at a Farewell's target, Call at a
   Stilled ally, the cursor's opening position. Add `qa/realplay/ep7battle.py`: one cast with real keys and one with a real
   touch tap with a Farewell pinned (read back `farewell_broken` reason `call`), and one on a Stilled ally (read back
   `stilled_end` reason `call`).
5. **The bosses:** the Lantern's lantern glow and its Wisps' entrance; the Phantom's three looks swapped at phase changes
   (sprite forwarded in `enterPhase`) **with its HUD row on one anchor over the crown in all three** (CRITIQUE_8 item 1), the
   Gate's and the Letter's entrance in front-row foe slots with rows under their own feet and at least 12 internal px from
   any party sprite; the ward (frozen doors behind the Phantom that thaw); boss intro cards THE PALE LANTERN / Keeper of
   Borrowed Light and THE WHITE PHANTOM / Keeper of the Stillheart with the arc lines. Add all three looks and both adds to
   the row-placement test.
6. **Cutscene helpers** E7-story asked for: `s.frostBlot` (a box that shows "..." under a frost texture with a soft `ice`) and
   the HUD frost drawer of item 2, both pack code, not field systems.
7. **Title**: `src/data/ep7/title.js`, the pack's `LQ_EP7.title(scene)`: the "Episode 7: new party" row and help line, the
   slot picker through `pickRunSlot` (notice, refusal with only Back), name entry, `newGameEp7`; the folded title keeps the
   episode rows together on the phone with six episode rows (check 375x812 and 844x390). Credits accept `CREDITS_EP7`; the
   end cards; the journal and bestiary hold Episode 7 content without overflow on the phone.

## Done when

Everything above draws on desktop and on the phone profile, the contrast numbers are measured, `ep7_menu_cast` passes all
three cases and the realplay casts pass with keys, touch and on a Stilled ally, and the pre-tap bytes did not grow.

## Tests to run

`node qa/run.mjs battlescene ui pwa`; `python qa/battlescene/autobattle.py` on `e7w_first`, `e7v2_mixed`, `pale_lantern`
and `white_phantom` (with `?pack=ep6,ep7`); `python qa/realplay/ep7battle.py`; shots of Rime at 1, 2 and 3 pips and a
Frozen turn, a Farewell pinned and broken, a Stilled ally and the Call back, each Phantom look with its row, the Gate and
the Letter in their slots, the thaw grade, the title with and without a free slot, desktop and phone.

## Traps

- **Menu-path bugs are invisible to bots** (Episode 5's blocker): `LQ_DEBUG.battleAct` closes the menu itself. Only the
  scene test through `menu.js` and the realplay run prove Call can be cast, and Call is the first signature skill aimed at
  one ally and at a unit off the timeline.
- **Runway-painted pack stages leave `backdropLayer.painted` false**: wait on `usedAsset` in any stage test.
- **Boss phase changes forward `sprite` in `ai.js` `enterPhase`** (E7-battle's); your scene must draw what it forwards, and
  keep the HUD row on its anchor.
- **The pre-tap budget.** Wrap before you edit; a core line only when no wrap can reach it, paid by a trim; report the
  gzipped pre-tap bytes before and after (`LQ_RELEASE=1 node qa/run.mjs pwa`).
- **Hot file `menu.js`** is yours alone in 7d, and only for item 4.
- The phone is the bar. House rules: no git; LF endings (count CR bytes before and after: zero); no em dashes; stay in owned
  paths; bound every command; one browser job at a time.

## Report (under 400 words)

What draws where, the contrast numbers, shot paths, test counts (the three menu-cast cases and the realplay results),
bytes, the exported helpers, anything the integrator must wire.
