# E5-scene-ui: the battle stage, the sky, the title row and credits for Episode 5 (wave 5d, alone, before E5-integrate)

Read `docs/briefs/COMMON.md`, `DESIGN.md` 6.4 and 7, `docs/EPISODE5_PLAN.md` 0.1, 6.3 to 6.5, 9.3, 10 and 13 (your
contract), `docs/CRITIQUE_6.md` items 1, 2, 13 and 15, `docs/PLAYTEST_REVIEW_6.md` items 2 and 10, `src/data/ep4/scene.js`
(how a pack wraps `Planner` and `Actor`, adds `BACKDROPS` and `BOSS_CARD`, draws `PIPS`, and pushes `SIGNATURE_TECHS`), and
the E5-pack, E5-battle, E5-tiles and E5-sprites reports.

## Items, in order

1. **Backdrops** per zone through `BACKDROPS` and each zone's `backdrop` key, with E5-tiles' Day and Night grade recipes
   applied at runtime and cross-faded over 20 frames on a Turn.
2. **The sky on the timeline:** the sky disc at the timeline's head and the Turn marker (a gold sun or silver moon disc,
   at least 12 x 12 on the phone, dark ring) at the slot where the Turn falls, moving as the timeline changes; "The sky
   turns. Night." with `sky_turn`. A pinned foretelling draws the named member's head on the marker with a red star.
3. **Sides on the foes:** the sky badge at the head of each foe's weakness row (8 x 8, 1 px dark outline); Exposed shields
   cracked and pale with one bright flash on the Turn; Ascendant foes a 1 px gold or pale blue glow. Measure on the
   844x390 crop: badge and marker at least 0.15 luma above their box (CRITIQUE_6 item 1's rule). Rows under the feet for
   the Knight and the Oracle, never across a body (CRITIQUE_6 item 2): add both to the row-placement test.
4. **Turn the Sky and the prophecy:** push `{ unit: 'mira', flag: 'foretold', skill: 'turn_sky' }` onto
   `SIGNATURE_TECHS` so Mira's Tech list opens on it, first, in gold, while a foretelling is pinned; the telegraph line
   names the target and the answer's owner ("The Oracle reads Pia's star. It falls when the sky turns."); the break plays
   `prophecy_break` with stars scattering and one clean message ("The words change. The Oracle is broken."), the action
   name printed once (CRITIQUE_6 item 13; PLAYTEST_REVIEW_6 item 10); the low-MP hint from E5-story's text.
5. **The Knight and the Oracle:** the Knight's mirror flash on Mirror Turn and the double's entrance; the Oracle's three
   looks swapped at phase changes (sprite forwarded in `enterPhase`), the Futures' entrance and the Veil (a ring of sand
   that tears), boss intro cards THE MIRAGE KNIGHT / Warden of False Horizons and THE SAND ORACLE / Reader of Every Road
   with the arc lines.
6. **Title**: `src/data/ep5/title.js`, the pack's `LQ_EP5.title(scene)`: the "Episode 5: new party" row and help line, the
   slot picker through `pickRunSlot` (notice, refusal with only Back), name entry, `newGameEp5`; the folded title keeps
   the episode rows together on the phone. Credits accept `CREDITS_EP5`; the end cards; the journal and bestiary hold
   Episode 5 content without overflow on the phone.

## Rules

- Owned paths: plan 11.1, row E5-scene-ui. Wrap before you edit: a line in a precached core file only when no wrap can
  reach it, paid by a trim in the same change; report the gzipped pre-tap bytes before and after.
- The phone is the bar: every new element checked on the 844x390 profile and in portrait. No git, no em dashes, bounded
  commands, one browser job at a time.
- Verify: `node qa/run.mjs battlescene ui pwa`; `python qa/battlescene/autobattle.py` on `e5s_first`, `e5r_mixed`,
  `mirage_knight` and `oracle` (with `?pack=ep4,ep5`); shots of the marker and a Turn, Exposed against Ascendant foes in
  one group, a prophecy pinned and broken, each Oracle look, the title with and without a free slot, desktop and phone.
- Report under 400 words: what draws where, the contrast numbers, shot paths, test counts, bytes, anything the
  integrator must wire.
