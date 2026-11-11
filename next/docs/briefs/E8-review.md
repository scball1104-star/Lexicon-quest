# E8-review: one fresh read of the finale, art and play (wave 8e, read-only)

Play Episode 8 the way a player meets it, from an Episode 7 save and on a phone first, and write what is wrong, ranked by
what a player would feel. You change no code.

## Inputs (read first, in this order)

The repo's `AGENTS.md`, `docs/briefs/COMMON.md`, `DESIGN.md` (sections 2 and 10 above all), `docs/story/EPISODE8.md`, plan
`docs/EPISODE8_PLAN.md` sections 0, 0.1 and 12, E8-integrate's report, the earlier reviews `docs/CRITIQUE_8.md`,
`PLAYTEST_REVIEW_8.md`, `CRITIQUE_9.md`, `PLAYTEST_REVIEW_9.md` (their shape is yours), `RESPONSIBILITY_ARC.md`. Do **not** read
the agents' build reports before your own first play: you are the read that is not anchored on theirs.

## Owned paths

`docs/CRITIQUE_10.md`, `docs/PLAYTEST_REVIEW_10.md`, `qa/out/review10/**`. Read-only everywhere else.

## Outputs (items, in order)

1. **Play it**, phone profile first (844x390 and 375x812), then desktop: from an Episode 7 credits save to the end title and the
   wake, then the post-game for ten minutes; then the quick start's first ten minutes. Real keys and taps where the realplay
   tools allow; the bot only to reach a point you then play by hand. Both endings (two saves).
2. **`PLAYTEST_REVIEW_10.md`** (the shape of PLAYTEST_REVIEW_8): verdict; ranked findings with size (S, M, L); the first five
   minutes against the bible's table; pop-up books (clarity without text, is it another dial, did a pair ever strand or confuse);
   Erasure, Read Aloud and Answer (did you understand why a command went away; did the hero's immunity read as a clue; did you
   ever see two telegraphs at once; did the Eraser act often enough); the twist (when did you guess it; did it feel earned or
   cheap; did the name stay yours); Sable, Hazel and the bell (did the ending land, was anything too much for a child); pacing
   (minutes by act, decisions, the ending's length); saves (the ended save, Fine Print carry, reload after the end); sound; ten to
   protect; top ten to fix.
3. **`CRITIQUE_10.md`** (the shape of CRITIQUE_8): the art and UX rows of plan 0.1, fixed or not; ten findings ranked by player
   impact; readability measured on the phone crops (the void against floor, pages against void, the ghost, the smudged row, the
   pips, the Silence dim); the camera rule at every staged mark; the four Eraser looks and their HUD rows; the credits on a phone.
4. **Evidence** in `qa/out/review10/` (shots, measures), every claim tagged Fact, Reported or Inference.

## Done when

Both files exist, every finding has a size and evidence, and the top-ten lists are ranked.

## Tests to run

None that change anything. `python qa/shots.py`, the realplay tools and the bot only as instruments; bounded.

## Traps

- **You are not the doer.** Do not fix, do not suggest code; name the problem, where, what you saw, and what must stay fixed.
- **The responsibility arc is subtext:** flag any line that lectures, names a real person or credits a teacher or author.
- **No kids' names, ages, photos or school names** anywhere (the repo is public).
- House rules: no git; LF endings; no em dashes; owned paths only; bound every command; one browser job at a time.

## Report (under 400 words)

The verdict in two sentences, the five biggest findings with sizes, the five things to protect, and the paths of both files.
