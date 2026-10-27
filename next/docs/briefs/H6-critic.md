# H6-critic: fresh eyes on the responsibility arc (read-only)

You are **H6-critic**, the play-critic for the Responsibility and Adventure arc (`docs/RESPONSIBILITY_ARC.md`):
H1 the cold open and the first five minutes, H2 the Ledger of Names, the title counter and the Aim line, H3 the
Vows, H4 the Name Truth choices, floor questions, boss lines and aims. You judge; you do not fix. Another agent
(C2-world) is still wiring the Deep Stacks; ignore anything behind the library trapdoor and any `cave_*` file.

## Read, in this order
1. `docs/briefs/COMMON.md`, `DESIGN.md` sections 0 to 2, 7 and 10 (the quality bar), `docs/RESPONSIBILITY_ARC.md`
   (what was promised; section 7 is Scott's own words), `PLAN.md` Wave H (what shipped, with each step's known
   gaps: do not re-report those, rank them).
2. The earlier critiques for form: `docs/CRITIQUE_1.md`, `docs/CRITIQUE_X1.md`, `docs/PLAYTEST_REVIEW_X1.md`.
3. `qa/autoplay.py` (how to drive the game headless), `qa/shots.py` and `qa/shots.json`, `qa/ui/h2_ledger_headless.py`,
   `qa/ui/h3_vows_headless.py`, `qa/content/h4_truth.test.mjs` (which scenes hold the choices).

## Owned paths
`docs/CRITIQUE_ARC.md` (new), `qa/arc/out/**` (your screenshots and logs; create the folder). Nothing else. You
read any file; you run the game headless (Playwright, desktop and phone profiles, `?debug=1`); you never edit
source, data, tests or docs besides your own.

## What to do
1. **Play the first five minutes as a new player** on the phone profile and on desktop: New Game, the bell
   tower, the wake-up, Oren's sign, the slime, Mael. Time each beat. Screenshot the moments that matter and the
   moments that look wrong. Ask: does the cold open grip, does the caption persistence ("Willowmere. Last night.")
   help or hurt, is the thirteenth silence felt, is the slime fight a taste or a chore, does the wake-up still
   land Hazel, does anything explain too much.
2. **The Ledger and the Aim**: open the Journal at three points (after Mael, after the Archive door, after the
   credits via a save with the flags set through `LQ_DEBUG`); is the Ledger legible on phone, does the kept
   text read as the game's voice, is "Names kept" on the title a pull or clutter, does the Aim line say the right
   thing at the right time and vanish when it should; catch any step whose aim is wrong or stale.
3. **Vows**: take each vow at the Pilgrim's Rest and through Archive F1; break each one on purpose; keep one.
   Is the offer window clear, is "No vow" obviously the default, is the toast legible over battle, do the kept
   and broken lines sound like Bram and Mira, is the mastery reward felt or invisible, does Auto battle breaking
   a vow feel unfair.
4. **Name Truth choices**: play six of the twelve (both answers each, via two saves): is the true answer harder
   in the moment, is the lie understandable, does the remembered line land later, is any choice a quiz, does any
   reward feel like a bribe. Read the other six in the script.
5. **Floor questions and boss lines**: read all; play two floor endings and two boss intros. Is each question
   one question; does any boss line preach.
6. **Phone first, always**: every screenshot pair is phone then desktop. Note any text under 11 px, any overlap
   with the touch controls, any box over three lines.

## The write-up (`docs/CRITIQUE_ARC.md`)
Under 1,200 words plus the table. A verdict in three sentences (would a Lufia or Chrono Trigger player keep
going after five minutes, after an hour). Then a ranked table of at most 25 issues: rank, where (scene or
screen, phone or desktop), what you saw (one sentence, Fact), why it matters (one sentence), the smallest fix
(one sentence, Inference), the owner (H1 to H4 by area), and a cost (minutes, hour, day). Severity first: a
blocker (would make Scott stop playing) before a polish note. Then five things that work and must not be touched
in the fix pass. Then your timings table for the first five minutes, phone and desktop. Every claim tagged Fact
(you saw it) or Inference. No em dashes.

## Verify before you report
Every screenshot you cite exists under `qa/arc/out/`. You changed no file outside your owned paths
(`git status` is not available to you; keep a list of files you wrote and put it in the report).

## Report (last message, under 300 words)
The verdict, the top five issues with owners, the path of the critique, the screenshot folder, and anything you
could not test (and why).
