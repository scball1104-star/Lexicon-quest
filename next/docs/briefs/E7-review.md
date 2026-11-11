# E7-review: critic-9 and play-critic-9 in one sitting (wave 7e, read-only)

One read-only review of Episode 7 on the build branch (with `EP7_LIVE` on there, or `?pack=ep6,ep7&ep=7`), art and play
together; then the orchestrator writes the E7-fixes items from it. Episodes 5 and 6 used one reviewer for both and it
worked.

## Inputs (read first, in this order)

The repo's `AGENTS.md`, `docs/briefs/COMMON.md`, `DESIGN.md` sections 1 and 10, `docs/story/EPISODE7.md`,
`docs/EPISODE7_PLAN.md` 0.1, 4.10, 12 and 14, and the format of `docs/CRITIQUE_8.md` and `docs/PLAYTEST_REVIEW_8.md`. Tag
claims Fact, Reported or Inference.

## Owned paths

`docs/CRITIQUE_9.md`, `docs/PLAYTEST_REVIEW_9.md`, and scratch output in `qa/out/review9/**` only. Read anything; change
nothing else.

## Outputs

**Part 1: art and UX (`docs/CRITIQUE_9.md`).** On the E7-integrate shots against Chrono Trigger, Lufia II and FF6, the
phone as the bar: does the fade read as nothing (never as snow), does a ghost trail say where a stone would put a road, does
a held path read as a road, does each stone's state read at rest (dim, lit, the oldest flickering), do frost doors read as
doors, do the three Vault floors look different, is F3 the quiet floor while the party still reads, is the aurora gentle,
are field foes visible on snow and the fade, do the Rime pips and the frosted names read on the phone and stay legible, do
the Farewell ribbon and the Stilled shell read, is the Phantom a readable shape in all three looks with its HUD row on its
crown and the Gate's and the Letter's rows under their own feet, do the frozen and thaw grades read as two rooms, does
Palehaven read at a glance, do the seven close-ups show what the story says (the whole page in three steps, the signature
last, each step's text full only on its box), does the camera ever clamp a staged beat to the screen edge. Ten findings
ranked by player impact with sizes, and a protect list. Check every item of plan 0.1 that is art or UX and say fixed or not.

**Part 2: play (`docs/PLAYTEST_REVIEW_9.md`).** A new player on a phone, from an Episode 6 save and from the quick start:
the first five minutes against EPISODE7 section 1's table (time each beat); pacing against 60 to 90 and the decision count
against plan 4.10's 16; clarity of every stone puzzle without text; whether a let-go ever surprises or strands; whether
anything sends the party home the long way (a loop); **whether name stones feel different from tide locks, sun and shade and
gust lanes** (the "another dial" test) and whether two-at-a-time reads as a choice or a chore; whether Rime is understood by
the second ordinary fight and whether the screen says Defend shakes it off; difficulty of the Pale Lantern and the Phantom
(and whether either is ever slowed by its own rule); **whether Call is found and cast from the menu with real keys and with
touch when a Farewell is pinned, and on a Stilled ally** (never through `LQ_DEBUG.battleAct`); whether the gold buys the two
town pieces and the two pre-F3 pieces; whether the whiteout, the bell, the Keeper's door and the whole page land; whether
the two deaths are handled small enough for a child; the save rule (try to lose a save, including with the ep7 pack
unreachable and with a save made on a held path cell; you should not be able to); Episode 7 sound on the quick start. Ten
to fix, ten to protect.

## Done when

Both files are written, every claim is tagged, every plan 0.1 row is answered, and the top-ten tables name a file and a
size for each item.

## Tests to run

Read-only checks only: the shots, `python qa/realplay/run.py` (local, under 10 minutes, real keys and touch), short headless
sessions you script in `qa/out/review9/`, the simulator from a scratch script (read-only, no `--json` writes), and the
autoplay logs. Run nothing that writes outside your paths.

## Traps

- **Bots cannot see menu-path bugs**: use real input for every skill you judge castable, Call at an ally and at a Stilled
  ally above all.
- **Reload-revived foes inflate level readings**: when you judge difficulty from a level, say how the level was reached.
- **A decision is a stone read**, not a step: count reads (a re-read counts) when you judge pacing, as the timer does.
- **`qa/world/out` and `qa/cave/out`** may be rewritten by any suite you run: do not run suites that write there; if one
  did, say so.
- House rules: no git; no em dashes; bounded commands; one browser job at a time; short headless sessions.

## Report (under 400 words)

The verdict, the top five items across both parts with sizes, and what not to touch.
