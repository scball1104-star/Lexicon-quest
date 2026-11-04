# E4-scene-ui: the battle scene, title row and credits for Episode 4 (wave 4d, alone, before E4-integrate)

Read `docs/briefs/COMMON.md`, `DESIGN.md` 6.4 and 7, `docs/EPISODE4_PLAN.md` 6.3 to 6.5, 9.3, 10 and 13 (your
contract), `docs/CRITIQUE_4.md` items 1, 10 and 11, `docs/CRITIQUE_5.md`, `docs/PLAYTEST_REVIEW_5.md`, and the E4-pack,
E4-battle and E4-sprites reports.

## Items, in order

1. **Backdrops** per zone through the exported `BACKDROPS` (added from the pack) and each zone's `backdrop` key.
2. **Decree presentation**: three small red wax seals drawn in code where Heat's flames draw (a unit with
   `heatQuench === 'fire'` or the battle's `verb: 'decree'`), visible while commands are chosen, under the feet or
   above the head (never across a body, never under the touch command window); the decree announce; "Voided!" with a
   torn-paper puff.
3. **Answer and the Strike**: the Strike telegraph names the hero and marks the hero's timeline icon; Answer plays a
   signature stroke across the target, `decree_void`, and the Break that follows; the hero's guard shows until their
   next turn.
4. **The Regent**: the three looks swapped at phase changes (sprite forwarded in `enterPhase`), the writs' entrance,
   the ward halo, boss intro cards THE INKBOUND BARRISTER / Counsel for the Forgery and THE PAPER REGENT / Keeper of the
   Seal, with the arc 3.6 lines.
5. **Title**: `src/data/ep4/title.js`, the pack's `LQ_EP4.title(scene)`: the "Episode 4: new party" row and help line,
   the slot picker through `pickRunSlot` (notice, refusal with only Back), name entry, `newGameEp4`. Credits accept
   `CREDITS_EP4`; the end cards; the journal and bestiary hold Episode 4 content without overflow on the phone.

## Rules

- Owned paths: plan 11.1, row E4-scene-ui. Any line you add to a precached core file is paid by a trim in the same
  change; report the gzipped pre-tap bytes before and after.
- The phone is the bar: every new element checked on the 844x390 profile and in portrait. No git, no em dashes,
  bounded commands, one browser job at a time.
- Verify: `node qa/run.mjs battlescene ui pwa`; `python qa/battlescene/autobattle.py` on `e4r_first`, `barrister` and
  `paper_regent` (with `?pack=ep4`); shots of seal pips at command time, a Strike answered, each Regent look, the title
  with and without a free slot, desktop and phone.
- Report under 400 words: what draws where, shot paths, test counts, bytes, anything the integrator must wire.
