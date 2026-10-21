# W11: Episode 2 fix pass (before publish)

Source reviews: `docs/CRITIQUE_4.md` (art and UX) and `docs/PLAYTEST_REVIEW_3.md` (pacing, puzzles, difficulty).
Read both in full first; each item below names its review section, which holds the evidence and the suggested fix.
Read `docs/briefs/COMMON.md` and `DESIGN.md` too. Both reviews end with a "protect these" list: nothing on those
lists may get worse.

The pass runs as TWO agents, one after the other (the owner asked for one helper at a time this week).

## Part A: art and UX (run first)

From CRITIQUE_4 section 3, in this order:
1. Phone: the mini-boss you cannot see (S). Touch-layout enemy positions clear of the command window; weakness rows
   never on a sprite. Check every Episode 1 and Episode 2 formation with three foes on the phone, not only the Selves.
2. The faces in the water do not read; the ending shows nothing (M). The framed close-up of the basin the critic
   proposes, for the three fountain scenes.
3. The Hollow's dusk is daylight (S tint; the M palette work only if the tint alone cannot make "silver dusk" read,
   and the restored state must clearly brighten).
4. The Fading Road has no fog (M). Real mist that hides the true path's edges, a map tint, and a path that is not the
   only dirt road. The road must stay solvable without Talk (PLAYTEST_REVIEW_3 item 9: a miss must not cost 20 tiles).
5. King portrait re-crop only (S). The five portrait repaints (L) are OUT of this pass.
6. to 14. Items 6, 7, 8, 10, 11, 12, 13, 14 (all S or S to M).
Items 9 and 15 (M) only if time and quality allow; say so in the report if skipped.

## Part B: pacing, balance, script (run second, after Part A is committed)

From PLAYTEST_REVIEW_3 section 7: items 1 to 8 and 10 (all S, item 3's M alternative not needed), plus the trim list
in section 4 (target: about 97 to 117 minutes on `qa/integrate/story_time.py`, the same yardstick). Item 9 only if
Part A's fog made it necessary. Keep Episode 1's balance and script unchanged in meaning.

## Both parts

- Owned paths: whatever the items need under `next/src/**`, `next/assets/**` (art only), `next/tools/**`,
  `next/qa/**` (tests and labs; `qa/shots.json` append only), `next/docs/MAPS.md`, `WORLD.md`, `story/STAGING_EP2.md`.
  Not: PLAN.md, PROGRESS.md, HANDOFF.md (orchestrator's), the two review docs.
- No git. No em dashes. Phone (844x390 touch) is the bar. Every subprocess gets a timeout; one browser job at a time.
- Verify: `node next/qa/run.mjs` green; `python next/qa/shots.py --only <affected shots> --device all` zero console
  errors; for Part B also `node next/tools/sim/simulate.mjs --check` and the Episode 2 autoplay (fresh start and from
  an Episode 1 save, desktop and phone, 0 game overs) and `python next/qa/integrate/story_time.py`. LOOK at every
  before/after shot. Episode 1 autoplay must still finish with 0 game overs.
- Report under 450 words: each item done or skipped with why, files touched, before/after shot paths, test counts,
  and a paragraph for the owner in plain words.
