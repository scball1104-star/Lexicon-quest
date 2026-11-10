# E6-review: critic-8 and play-critic-8 in one sitting (wave 6e, read-only)

One read-only review of Episode 6 on the build branch (with `EP6_LIVE` on there, or `?pack=ep5,ep6&ep=6`), art and play
together; then the orchestrator writes the E6-fixes items from it. Episode 5 used one reviewer for both and it worked.

## Inputs (read first, in this order)

The repo's `AGENTS.md`, `docs/briefs/COMMON.md`, `DESIGN.md` sections 1 and 10, `docs/story/EPISODE6.md`,
`docs/EPISODE6_PLAN.md` 0.1, 12 and 14, and the format of `docs/CRITIQUE_7.md` and `docs/PLAYTEST_REVIEW_7.md`. Tag claims
Fact, Reported or Inference.

## Owned paths

`docs/CRITIQUE_8.md`, `docs/PLAYTEST_REVIEW_8.md`, and scratch output in `qa/out/review8/**` only. Read anything; change
nothing else.

## Outputs

**Part 1: art and UX (`docs/CRITIQUE_8.md`).** On the E6-integrate shots against Chrono Trigger, Lufia II and FF6, the
phone as the bar: does a live gust lane read against cloud at a glance and say which way it blows, does a vane's state read
at rest, does a post read as a stop, do the three Observatory floors look different, is F3 the darkest while the party
still reads, is the lightning gentle, are field foes visible on cloud and plank, do the Gust marker, the Aloft badge and the
anchor glyph read on the phone, is the Scribe a readable shape in all three looks with its HUD row and the Beacon's and the
Compass's under their own feet, do the storm and clear grades read as two skies, does Zephyr Landing read at a glance, do
the five close-ups show what the story says (the page in three steps). Ten findings ranked by player impact with sizes, and
a protect list. Check every item of plan 0.1 that is art or UX and say fixed or not.

**Part 2: play (`docs/PLAYTEST_REVIEW_8.md`).** A new player on a phone, from an Episode 5 save and from the quick start:
the first five minutes against EPISODE6 section 1's table (time each beat); pacing against 60 to 90; clarity of every lane
puzzle without text; whether a ride ever surprises or strands; **whether gust lanes feel different from Episode 4's tide
locks and Episode 5's sun and shade** (the "another dial" test); whether the Gale is understood by the second ordinary
fight; difficulty of the Gale Engine and the Scribe; **whether Anchor is found and cast from the menu with real keys and
with touch when a rewrite is pinned** (never through `LQ_DEBUG.battleAct`); whether Bram's dock, Vex's fall and Pippa's
name land; the save rule (try to lose a save, including with the ep6 pack unreachable and with a save made on a lane cell;
you should not be able to); Episode 6 sound on the quick start. Ten to fix, ten to protect.

## Done when

Both files are written, every claim is tagged, every plan 0.1 row is answered, and the top-ten tables name a file and a
size for each item.

## Tests to run

Read-only checks only: the shots, `python qa/realplay/run.py` (local, under 10 minutes, real keys and touch), short headless
sessions you script in `qa/out/review8/`, and the autoplay logs. Run nothing that writes outside your paths.

## Traps

- **Bots cannot see menu-path bugs**: use real input for every skill you judge castable.
- **Reload-revived foes inflate level readings**: when you judge difficulty from a level, say how the level was reached.
- **`qa/world/out` and `qa/cave/out`** may be rewritten by any suite you run: do not run suites that write there; if one
  did, say so.
- House rules: no git; no em dashes; bounded commands; one browser job at a time; short headless sessions.

## Report (under 400 words)

The verdict, the top five items across both parts with sizes, and what not to touch.
