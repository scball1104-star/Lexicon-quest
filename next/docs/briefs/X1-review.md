# X1-review: critic and play-critic for the Wider Valley (X1 wave W7, read-only, one at a time)

Two read-only reviews of the expansion once `X1_LIVE` is on and P1 is published, run one after the other; the orchestrator writes the X1-fixes brief from them. Read
`docs/briefs/COMMON.md`, `DESIGN.md` sections 1 and 10, `docs/EXPANSION_RECONCILIATION.md`, `docs/EXPANSION1_PLAN.md` (sections 3, 4, 5, 6, 7, 12, 13 and 16), and the format of
`docs/CRITIQUE_4.md` and `docs/PLAYTEST_REVIEW_4.md`. Tag every claim Fact, Reported or Inference and name the check for each Inference that matters.

## critic (`docs/CRITIQUE_X1.md`)

Art and UX on the X1-integrate shots, against Chrono Trigger, Lufia II and FF6, the phone as the bar. Questions: do the three dungeons look
different from each other and from the Archive and the Hollow (floors and walls, not a grey grid in black); do the fields read as places
(Thornfold, the Stones, the Terrace, the Mill, the moor, Larchhill) and not as rectangles or green copies of the valley; do the far-off decals
(the Watchtower, the Windmill, the dome) read as promises; are the field foes visible on grass, heath, flagstone and brick; do the revealed ink
route, the slabs and plates and the turning wheel read at phone scale; are the two new bosses readable shapes beside the Echo Warden, the Alpha
and the Archivore; are the new buildings consistent with Willowmere's kit; does the Appraise-on-object beat read. Is the sound right: do the eight
tracks sit in the game's voice, and do any loops seam badly. Does the pack load invisibly (no hitch at a gate, a quiet notice if it fails). Fifteen findings ranked by player impact with sizes, and a protect list.

## play-critic (`docs/PLAYTEST_REVIEW_X1.md`)

A new player on a phone, from an Episode 1 credits save, from a mid-Archive save and from a fresh game: pacing (does the expansion lengthen the main
path? time it; the minutes of each slice against plan 13); clarity of every quest step without Talk and with it; does a first-time player discover the
Lantern's job at the cleft, the Shove niche, the Dash cracks, the Appraise scarecrow without being told; do the optional fights feel optional (the
3-tile aggro, the slow chase, fleeing); **EXP and levels**: the main route is unchanged (confirm the Echo Warden, the Archivore and the end at today's levels); does the optional world read as paying in gold, gear and items rather than levels, and does a
completionist feel at most about a level over the story (are the two optional bosses fair at the stated levels); does the loot feel like a reward (the Crook, the bow, the chart, the apron, the set); do the quests send the player back and forth in a way that is a pleasure
or a chore; the route choice on the two wide maps (is the long way worth anything, do the shortcuts feel earned); the tone against EPISODE1 section 4
(no explained forgetting, names with weight, no word games). **Try to break saves**: load an old Episode 1 and Episode 2 save, walk the new gates, leave
and re-enter every dungeon, lose to each boss and retry, save in the hearths and reload, kill the network mid-load; you should not be able to lose progress, lose a level or
soft-lock. Ten to fix, ten to protect.

## Rules

- Owned paths: your review file and scratch output in `qa/out/reviewx1/` only. Read anything; change nothing else.
- No git, no em dashes, bounded commands, one browser job at a time, short headless sessions.
- Report under 400 words: the verdict, the top five items with sizes, and what not to touch.
