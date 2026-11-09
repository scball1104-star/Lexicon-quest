# E5-review: critic-7 and play-critic-7 in one sitting (wave 5e, read-only)

One read-only review of Episode 5 on the build branch (with `EP5_LIVE` on there, or `?pack=ep4,ep5&ep=5`), art and play
together, then the orchestrator writes the E5-fixes brief from it. Episode 4 used two reviewers; their findings
overlapped by about half, so one reviewer writes both files. Read `docs/briefs/COMMON.md`, `DESIGN.md` sections 1 and 10,
`docs/story/EPISODE5.md`, `docs/EPISODE5_PLAN.md` 0.1, 12 and 14, and the format of `docs/CRITIQUE_6.md` and
`docs/PLAYTEST_REVIEW_6.md`. Tag claims Fact, Reported or Inference.

## Part 1: art and UX (`docs/CRITIQUE_7.md`)

On the E5-integrate shots against Chrono Trigger, Lufia II and FF6, the phone as the bar: does running sand read against
shade at a glance, does a dial's hour read at rest, do the three Labyrinth floors look different (and none violet), is F3
the darkest, are field foes visible on sand and stone, do the sky marker, the badges and the Exposed shields read on the
phone, is the Oracle a readable shape in all three looks with its HUD row under its feet, do the Day and Night stages read
as two skies, does Saffron Haven read at a glance, do the four close-ups show what the story says. Ten findings ranked by
player impact with sizes, and a protect list. Check every item of plan 0.1 that is art or UX and say fixed or not.

## Part 2: play (`docs/PLAYTEST_REVIEW_7.md`)

A new player on a phone, from an Episode 4 save and from the quick start: the first five minutes against EPISODE5
section 1's table (time each beat); pacing against 60 to 90; clarity of every shade puzzle without text; whether sun and
shade feels different from Episode 4's tide locks; whether the Turning Sky is understood by the second ordinary fight;
difficulty of the Mirage Knight and the Oracle; whether Turn the Sky is found when a prophecy is pinned; whether Mira's
silence and Sel's walk land; the save rule (try to lose a save, including with the ep5 pack unreachable; you should not
be able to); Episode 5 sound on the quick start. Ten to fix, ten to protect.

## Rules

- Owned paths: the two review files and scratch output in `qa/out/review7/**` only. Read anything; change nothing else.
- No git, no em dashes, bounded commands, one browser job at a time, short headless sessions.
- Report under 400 words: the verdict, the top five items across both parts with sizes, and what not to touch.
