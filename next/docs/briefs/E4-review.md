# E4-review: critic-6 and play-critic-6 (wave 4e, read-only, may run together)

Two read-only reviews of Episode 4 on the branch (with `EP4_LIVE` on there, or `?pack=ep4&ep=4`), then the orchestrator
writes the E4-fixes brief from them. Read `docs/briefs/COMMON.md`, `DESIGN.md` sections 1 and 10,
`docs/story/EPISODE4.md`, `docs/EPISODE4_PLAN.md` 12 and 14, and the format of `docs/CRITIQUE_5.md` and
`docs/PLAYTEST_REVIEW_5.md`. Tag claims Fact, Reported or Inference.

## critic-6 (`docs/CRITIQUE_6.md`)

Art and UX on the E4-integrate shots against Chrono Trigger, Lufia II and FF6, the phone as the bar: does rain read as
rain (the tint), do the three keep floors look different, does every wheel's mark and every post's water line read at
rest, does a grounded pontoon look different from a floating one, are field foes visible on wet stone, do the seal pips
and the Answer read in battle, is the Paper Regent a readable shape in all three looks, does Valewyn read at a glance.
Fifteen findings ranked by player impact with sizes, and a protect list.

## play-critic-6 (`docs/PLAYTEST_REVIEW_6.md`)

A new player on a phone, from an Episode 3 save and from the quick start: pacing (the first fight within five minutes;
the timer against 60 to 90), clarity of every tide puzzle without text, whether tide locks feel different from Episode
3's quench, difficulty of the Barrister and the Regent, whether the Answer decision is discovered, whether the Witness
Book scene lands, the save rule (try to lose a save; you should not be able to). Ten to fix, ten to protect.

## Rules

- Owned paths: your review file and scratch output in `qa/out/review6/critic/` or `qa/out/review6/play/` only. Read
  anything; change nothing else.
- No git, no em dashes, bounded commands, one browser job at a time, short headless sessions.
- Report under 400 words: the verdict, the top five items with sizes, and what not to touch.
