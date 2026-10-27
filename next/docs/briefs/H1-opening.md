# H1-opening: the first five minutes

You are **H1-opening**, step H1 of the Responsibility and Adventure arc (`docs/RESPONSIBILITY_ARC.md`, decided by
Scott on 2026-10-26, section 7). You are the only agent running. Nobody will answer questions: use your judgment
and write assumptions in your report.

**Goal.** A New Game captures the player in its first five minutes: control in 20 seconds, a question in 60, a
choice with a cost by minute 3, a taste of a fight by minute 5. Scott's decision B: **replace** the opening. No
flag, no old path kept. Every existing save, the Episode 2 title entry (`newGameEp2`, `?ep=2`) and the main route
after the hero leaves home are untouched.

## Read, in this order
1. `docs/briefs/COMMON.md`, `DESIGN.md` (sections on scenes, saves, the cutscene runner, phone UX).
2. `docs/RESPONSIBILITY_ARC.md` sections 0, 2, 6 and 7. Section 7 (Scott's words) wins any conflict.
3. `docs/story/EPISODE1.md` beats 1 to 5 and 9a; `docs/story/STAGING.md` ("Cutscene API as used by ep1.js").
4. `src/data/story/ep1.js`: `PROLOGUE`, `prologue`, `wake_up`, `fading_sign`, `first_fight`, `SCENE_CONDITIONS`,
   the export list. `src/scenes/prologue.js`, `src/scenes/nameEntry.js` (hands off to the prologue),
   `src/scenes/title.js` (attract mode pushes `prologue` after 20 s idle; `LQ_DEBUG.newGame`).
5. `src/data/maps/hero_home.js`, `src/data/maps/_kit.js`, `docs/MAPS.md`, `src/data/maps/chapel.js` (the tower
   belongs to the chapel; `npc_bellkeeper` exists).
6. `qa/autoplay.py`: `title_to_bed`, `town_morning`, `MAIN_FLAGS`. `qa/content/_harness.mjs`, `_boxes.mjs`,
   `story.test.mjs`. `qa/shots.py` and `qa/shots.json` (how a shot is specified).
7. `assets/audio/manifest.json` ids `bell_toll`, `bell_first`, `bell_peal`, `sign_fade`, music `title`,
   `mystery`, `willowmere`, `first_bell`. Use existing ids only.

## Owned paths (create or modify nothing else)
- `src/data/story/ep1.js`: only the prologue block, `wake_up`, `fading_sign`, the two new scenes, their
  `SCENE_CONDITIONS` rows and export entries, and the ONE later Oren line named in deliverable 3.
- `src/data/maps/bell_tower.js` (new).
- `src/scenes/prologue.js`: becomes the hand-off into the cold open, or is reduced to the attract-mode loop.
  Attract mode must still return to the title on any input and after it ends.
- `src/data/encounters.js`: add ONE encounter, `yard_slime`. Change no other line.
- `src/game/state.js` only if the New Game start position must point at the tower (keep `START_POS` for
  `hero_home`; add a separate constant for the cold open if needed).
- `qa/content/h1_*.test.mjs`, `qa/content/out/**`.
- `qa/autoplay.py`: only `title_to_bed`, `town_morning` and `MAIN_FLAGS`.
- `qa/shots.json`: add at most three shots (see deliverable 6).
- `docs/story/EPISODE1.md` beats 1 to 4 and the matching `docs/story/STAGING.md` staging entries.
Not owned: the audio manifest and audio files, battle code, UI code, tiles and sprites. If a tile or prop you
need does not exist, use the closest one and list the gap in the report.

## Deliverables

### 1. Cold open: "The Thirteenth Toll" (scene `thirteenth_toll`, map `bell_tower`)
New Game -> name entry -> fade in on the bell tower stair at night. The hero is alone with a lantern. No party.
- **Control within 20 seconds** of the fade. No dialogue box before the player can move. At most one line of
  narration, under 42 characters, that does not wait for a press.
- The stair climbs **twelve distinct steps** (twelve cells upward, straight or switchback, your staging).
  Each step the hero climbs tolls one bell (`bell_toll`) and shows one name as a **caption that needs no confirm
  press** (it fades on its own; never twelve dialogue boxes). Names in this order, all existing cast:
  Hazel, Mael, Oren, Pip, Tess, Iris, Holt, Garrick, Nella, Wick, Edda, Bram. The toll is tied to the step: if
  the player stops, the bells wait.
- At the top the **thirteenth toll** sounds (`bell_first`, the alarm bell, louder) and **no name shows**. The
  hero's `!` emote. Hold the silence 90 to 120 frames. Fade to black.
- **One card at most** after the black ("In Aethelgard, every name is a promise." or the game's title line; your
  pick, one card). Scott replaced the six-card prologue: `PROLOGUE` shrinks to that one line or goes.
- Then `hero_home` and the wake-up. Sets `cold_open_done`. Total cold open: 60 to 90 seconds at walking pace.
- Existing saves have `intro_done`, so the cold open must never run for them, and never for `newGameEp2`.
- Lighting: dark map, a lantern pool that follows the hero; music silent at first (footsteps and bells), a low
  `mystery` bed may enter after the sixth toll. Phone: the captions must be readable at the phone profile.
- The tower is the chapel's. Use interior, chapel or archive tiles; a hanging bell prop if one exists.

### 2. Wake-up shortened by half
`wake_up` keeps: Hazel waking the hero, her "thirteen" line (rewrite it so it confirms what the player just
heard instead of explaining the bells as news), Mael waiting by the well, the two Potions, `intro_done`. At most
four boxes plus the existing choice. The doorframe clue (inspect) stays.

### 3. The first choice with a cost (`fading_sign`, by minute 3)
The scene stays as the first choice. Make it remembered: the true answer sets `oren_truth`, the kind lie sets
`oren_lie`. Wire exactly **one** later Oren line that differs by that flag (his talk line after the starter quest
or his farewell, your pick). Nothing on the main route changes. H4 does the wider set; you do one, as the proof.

### 4. A taste of a fight by minute 5 (scene `yard_slime`, encounter `yard_slime`)
Right after `fading_sign`, as Oren goes for paint, an ink slime loose behind the bakery blocks the lane to
Lantern Square (a scripted trigger on the lane; the player cannot reach Mael without it). Hero alone, level 1,
**one** `ink_slime`, `canFlee: false`. It must be winnable with Attack only in two to four rounds and the hero
must never die from full HP: prove it with the sim or twenty headless runs with zero losses. It teaches Attack
and the weakness row only. The valley wolf fight (9a) stays the game's teaching fight for Lunge and Appraise: do
not touch it. Reward: the slime's normal EXP, one Oren line, and the flag `yard_fight_done` (H2's Ledger reads
it). `node tools/sim/simulate.mjs --check` must still say all targets met.

### 5. Autoplay
`title_to_bed` plays the cold open (twelve steps up, waits through the black and the card, lands in `hero_home`).
`town_morning` handles `yard_slime` (the generic battle handler with autoBattle is enough). Prove: Episode 1
desktop and phone routes clear to the credits; `python qa/autoplay.py --episode 2 --start new` still clears
(unchanged path, run once). Keep the logs for the report.

### 6. Shots and previews
Up to three shots in `qa/shots.json`: the first step, the seventh toll with its caption, the thirteenth silence.
`python qa/shots.py` must finish with zero errors. Render 3x previews of the tower on desktop and phone and view
them with the Read tool; iterate until it looks like the opening of a professional SNES RPG.

### 7. Tests (`qa/content/h1_opening.test.mjs`)
Flow sets `cold_open_done` then `intro_done`; the twelve names in order and each exists in the cast; the
thirteenth shows none; `yard_slime` is one `ink_slime`, no flee, solo; a save with `intro_done` never runs the
cold open; `newGameEp2` never runs it; every new box obeys the rule (at most 3 lines of 42 characters,
`_boxes.mjs`); no em dash in any new text.

### 8. Docs
Rewrite EPISODE1.md beats 1 to 4 and add staging for the two scenes. `DESIGN.md` line "Prologue (skippable):
title card text over animated key art" is now wrong: propose its exact replacement in the report (do not edit).

## Verify before you report
`node qa/run.mjs content battle ui saves` (rerun a flaky `walks` test alone); the autoplay runs in deliverable 5;
`node tools/sim/simulate.mjs --check`; `python qa/shots.py`; a headless load of `index.html` on desktop and phone
profiles with no console errors; `node qa/core/sync-manifest.mjs --check` if it exists.

## Report (last message, under 450 words)
Scenes, flags and ids added; files touched; **measured timings** on desktop and phone (seconds to control, to the
first caption, to the Oren choice, to the yard fight, to `intro_done`); the autoplay log paths; preview image
paths; known gaps; the exact contracts H2 and H4 need (`cold_open_done`, `yard_fight_done`, `oren_truth`,
`oren_lie`); the DESIGN.md replacement line. No git. No em dashes. Bound every command.
