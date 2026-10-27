# H4-story: Name Truth choices, floor-ending questions, boss lines, the Aim strings

You are **H4-story**, steps H4 and H5 of the Responsibility and Adventure arc (`docs/RESPONSIBILITY_ARC.md`
sections 3.4, 3.5, 3.6, 7). Other agents run beside you (the Deep Stacks C1 agents own `src/data/cave/**`,
`src/game/cave.js`, `tools/cave`, `qa/cave`); stay in your owned paths. Nobody will answer questions: use your
judgment and write assumptions in your report. Story data only: no engine code except the one line named below.

**Goal.** Responsibility with a memory, shown and never lectured: a handful of dialogue choices where the true
thing is harder than the kind lie, remembered by one later line and one small reward; every dungeon floor ending
on exactly one new question; every boss intro naming what the town avoided; and a short present-tense Aim for
every main-quest step so the field's Aim line reads as an aim ("Find Mira at the library"), not a title.

## Read, in this order
1. `docs/briefs/COMMON.md`, `DESIGN.md` section 9 (content outline) and the writing rules in `src/data/story/ep1.js`'s
   header (one idea per box, at most 3 lines of 42 characters, no em dashes, `{hero}`).
2. `docs/RESPONSIBILITY_ARC.md` sections 0, 1, 3.4 to 3.6, 7. Scott's decision D: the true answer's cost is small
   and honest, never a locked route, no morality meter.
3. `docs/story/EPISODE1.md`, `EPISODE2.md`, `STAGING.md`; `src/data/story/ep1.js` (H1's `fading_sign` with
   `oren_truth` / `oren_lie` and the one remembered line in `oren_starter` are the model), `ep2.js`, `dialogue.js`
   (the conditional shape `{ if, ifNot, map, lines }`), `src/data/quests.js` (`FLAGS`, the main quest steps and
   their `step` / `text`, party chat), `src/data/npcs.js` (talk lines per NPC, conditional).
4. `src/data/ledger.js` and `docs/LEDGER.md` (H2: how a name is kept; `r(id, place, ep, flag, {...})`),
   `src/scenes/field.js` the Aim line (H2) where it reads `j.main.step`.
5. `qa/content/*.test.mjs` (`_boxes.mjs`, `_harness.mjs`, `story.test.mjs`, `h1_opening.test.mjs`).

## Owned paths (create or modify nothing else)
- `src/data/story/ep1.js`, `src/data/story/ep2.js`: the choices, remembered lines, floor-ending lines, boss intro
  lines. No change to any flag the main route or the autoplay bot depends on; no new scene the bot must clear.
- `src/data/npcs.js`: remembered talk lines only.
- `src/data/quests.js`: new flag entries in `FLAGS`; an `aim` string on every main-quest step (Episodes 1 to 3).
- `src/data/ledger.js` and `docs/LEDGER.md`: new rows for names a true answer keeps (and nothing else).
- `src/scenes/field.js`: **one line**: the Aim line prefers `j.main.aim` over `j.main.step` when present.
- `src/ui/screens/journal.js`: nothing, unless the Journal should show `aim` under the step; if so, one line.
- `qa/content/h4_*.test.mjs`, `qa/content/out/**`. `docs/story/EPISODE1.md` and `EPISODE2.md`: a short "Name
  Truth" subsection listing the choices.
Not owned: everything else, especially `rules.js`, scenes other than the one line, `qa/autoplay.py` (its route
must still clear unchanged), the cave files, the vows files.

## Deliverables

### 1. Name Truth choices (3.4)
Six to eight in Episode 1 (Oren's counts as one), four to six in Episode 2, each inside an existing scene or talk:
the true thing is harder or more awkward than the kind lie, both playable, neither blocks anything. Flags
`<npc>_truth` / `<npc>_lie`, exactly one set per choice, listed in `FLAGS` with their meaning. Each is remembered
by **one** later line (talk or scene) that differs by the flag, and by **one** small reward on the truth side (a
consumable, a few gold, a party line that gives something; never a route, never a key). The lie is understandable
and costs something real but small later (a line, a missing small reward). Rule: the true answer is never
"correct" like a quiz; nobody says "you should have". Where a true answer keeps a name, add the ledger row (H2's
`r(...)`) and the `docs/LEDGER.md` line; aim for three to five new keeps across both episodes.

### 2. Floor-ending questions (3.5)
For every dungeon floor in Episodes 1 and 2 (Archive F1, F2, F3; Court F1, F2, F3; the Hollow), the last scene
of the floor ends on exactly one new question (a line, a sound cue the writer names from existing SFX ids, or an
object seen and not explained). Where a floor already does this, leave it and say so. Never add a box to a scene
the bot must press through unless it is one box.

### 3. Boss intro lines (3.6)
Each boss intro (Echo Warden, Archivore, the Episode 2 bosses, the Briar Alpha and Elder Alpha if they have an
intro) gains **one** line naming what the town avoided, not what the boss is: "Eater of Names. It was fed for a
hundred years." Find where boss intros live (scene text before `s.battle(..., { boss: true })`, or the battle
scene's boss banner data) and add the line in data; if the banner is engine-drawn and has no text slot, put the
line in the scene's last box before the fight and say so.

### 4. Aim strings (H2 polish)
Every main-quest step in `quests.js` gets `aim`: present tense, under 32 characters, what to do now ("Find Mira
at the library", "Take the south gate", "Reach the Archive door"). The one field.js line makes the Aim line use
it. The Journal may keep showing `step`.

### 5. Tests (`qa/content/h4_*.test.mjs`)
Every `_truth` / `_lie` pair exists in `FLAGS` and is set by exactly one choice; every remembered line is
reachable (the conditional matches with the flag and not without); every new box obeys the box rule; every new
ledger row's flag exists; every main step has an `aim` under 32 characters; no em dash; the main route's flag
sequence is unchanged (the existing story tests still pass).

## Verify before you report
`node qa/run.mjs content ui` green (rerun a flaky test alone); `python qa/autoplay.py` (desktop, Episode 1) and
`python qa/autoplay.py --episode 2 --start new` still clear; gzipped bytes added measured (text only; keep the
step under 6 KB); `python tools/pwa/build_pwa.py` then `node qa/run.mjs pwa` green. No em dash. Bound every command.

## Report (last message, under 450 words)
The choices (NPC, scene, the two options, the remembered line, the reward), the floor questions, the boss lines,
the aim strings, new ledger rows, files touched, bytes added, log paths, known gaps.
