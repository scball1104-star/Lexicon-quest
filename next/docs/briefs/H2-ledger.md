# H2-ledger: the Ledger of Names, the title counter and the Aim line

You are **H2-ledger**, step H2 of the Responsibility and Adventure arc (`docs/RESPONSIBILITY_ARC.md` sections 3.1,
3.3 and 7). You are the only agent running. Nobody will answer questions: use your judgment and write assumptions
in your report.

**Goal.** Give the game its clearest long-term pull: a single screen that shows every named person in the game,
faded or bright, with a count the player sees on the title screen ("Names kept: 17 of 63"), and one quiet line of
guidance (the Aim) so the player always knows what they are doing. On-theme, no new save fields, no change to any
route, no lecture.

## Read, in this order
1. `docs/briefs/COMMON.md`, `DESIGN.md` (HUD, menu, saves, phone UX).
2. `docs/RESPONSIBILITY_ARC.md` sections 0, 3.1, 3.3, 6 and 7 (Scott's words win).
3. `docs/story/EPISODE1.md`, `EPISODE2.md`, `EPISODE3.md` (casts and who loses or keeps a name),
   `docs/EXPANSION1_PLAN.md` (the X1 cast), `src/data/npcs.js`, `src/data/x1/npcs.js`, `src/data/quests.js`
   (`FLAGS`: every story flag and what it means), `src/game/episodes.js` (`EP3_LIVE`), `src/data/x1/live.js`.
4. `src/scenes/menu.js` (COMMANDS, PANEL, TOUCH_LAYOUT: the touch command grid is 5 rows by 2 columns and is
   full), `src/ui/screens/journal.js` (main step, side quests, Bestiary tab) and `common.js`,
   `src/scenes/title.js` (menu entries, how it reads the save slots for the Episode 2 entry), `src/game/save*.js`
   or wherever slots are read, `src/scenes/field.js` (`drawPrompt`, `drawLanternHint`: the HUD draw order).
5. `qa/ui/*.test.mjs` (harness style), `qa/shots.json` and `qa/shots.py`, `qa/pwa/precache.test.mjs` (the load
   budget), `qa/autoplay.py` (do not change it; your work must not disturb it).
6. H1's contracts, already in the code: flags `cold_open_done`, `yard_fight_done` (the hero's first fight, the
   bakery lane), `oren_truth` / `oren_lie`, `toll_1` to `toll_12`; `TOLL_NAMES` exported from `src/data/story/ep1.js`.

## Owned paths (create or modify nothing else)
- `src/data/ledger.js` (new): the data table and pure helpers.
- `src/ui/screens/journal.js`: a new **Ledger** tab (recommended; it needs no change to the full touch command
  grid). If you decide a separate menu command is better, you own `src/scenes/menu.js` COMMANDS and
  `src/ui/screens/ledger.js` and you must prove the phone grid still fits (shots at the phone profile).
- `src/scenes/title.js`: the counter only.
- `src/scenes/field.js`: the Aim line only (one draw method, its call, its timer).
- `src/data/text.js`: only if a banner or label string belongs there.
- `qa/ui/h2_*.test.mjs`, `qa/ui/out/**`, up to three entries in `qa/shots.json`.
- `docs/LEDGER.md` (new): the table of names and keep conditions, for H4 and H5 to extend.
Not owned: story scripts, maps, battle, audio, saves format, `qa/autoplay.py`, `qa/pwa/budget_ratchet.json`,
`qa/pwa/precache.test.mjs`.

## Deliverables

### 1. The data table (`src/data/ledger.js`)
Every **named person** in the live game (Episode 1 and 2 casts, the X1 cast when `x1` is live, the Episode 3 cast
only when `EP3_LIVE`), one row each: `{ id, name, home (map id or area), episode, kept }` where `kept` is a flag
name or a small predicate over flags. Animals, unnamed roles ("Guard") and foes are not people. Rules:
- **One keep condition per name**, drawn from what the player actually does: a side story completed, a boss beaten
  (the names it took come home), a true answer given. Use the flags that exist in `FLAGS`; invent none. Where a
  cast member has no story beat that could keep their name, list them under `EXCLUDED` with a one-line reason
  (the report lists them; H4 and H5 add beats for the ones worth it).
- Oren is kept by `yard_fight_done` (the first mark, minute 5, every player earns it). `oren_truth` is not a
  keep: it is H4's remembered line.
- Hazel, Mael, Mira and Bram are kept by the beats the story already gives them (your reading of the story docs
  decides which flag; write it down).
- Helpers: `ledgerRows(flags)` (rows with `kept: true|false`), `namesKept(flags)` returning `{ kept, total }`.
  Pure, no engine, importable by tests and by the title scene.
- Keep the file compact: ids, names and flags only, no prose. **Load budget:** the before-the-tap-prompt ratchet is
  2.32 MiB with about 7 KB of room after H1. Measure your addition (`python tools/pwa/build_pwa.py --sizes`, gzip)
  and keep the whole step under 6 KB gzipped. If it cannot fit, report the exact bytes; do not touch the ratchet
  file or the precache test.

### 2. The Ledger screen
A tab in the Journal (or a screen, see ownership): a list of names grouped by place, bright when kept, faded (the
game's faded-ink treatment) when not, with the count in the header ("Names kept 17 of 63"). Select a name to see
one line: where they are and, when kept, what kept them (from the flag's meaning; no spoilers for unkept names,
show "..." or the place only). Scrolls on phone; readable at the phone profile; the help bar says what the buttons
do. No prose about responsibility anywhere on the screen.

### 3. The title counter
Under the title menu, one small line: "Names kept: N of M", from the save slot (or autosave) with the highest
count. Hidden when no save exists. Uses `namesKept`. Must not slow the title (compute once per title entry) and
must not move the existing entries or the Episode 2 entry.

### 4. The Aim line (field HUD)
One line at the top of the field screen with the journal's current main step (`j.main.step`, the text the
Journal already shows), drawn in the dialogue font with the game's window treatment, small. It is **not**
permanent: it shows for about four seconds when the main step changes, when the field resumes from the menu, and
when the player stands still for ten seconds; otherwise the HUD stays clean (DESIGN's Chrono Trigger rule). Never
over a dialogue box, never during a cutscene, never in battle. Phone: above the touch controls, not under them.

### 5. Shots and previews
Up to three shots: the Ledger tab on desktop, the Ledger tab on phone, the title with the counter. Render 3x
previews and view them with the Read tool; iterate until a professional UI artist would sign off.

### 6. Tests (`qa/ui/h2_ledger.test.mjs`)
Every named NPC in `src/data/npcs.js` and `src/data/x1/npcs.js` is in the ledger exactly once or in `EXCLUDED`
with a reason; every keep flag exists in `FLAGS` (or is listed as a map-local flag with its map); a fresh game
has 0 kept; a save with `yard_fight_done` has Oren kept; an Episode 1 credits save (`ep1_complete` plus every
Episode 1 side-story flag) keeps every Episode 1 name that has a keep; the counter string format; the Aim line is
hidden during a cutscene and in battle (harness or headless check); no em dash in any new text; existing saves
load (no new save fields).

### 7. Docs
`docs/LEDGER.md`: the table (name, place, keep condition, episode) and the EXCLUDED list. One paragraph on how H4
(true answers) and H5 (boss lines) add keeps.

## Verify before you report
`node qa/run.mjs ui content pwa saves` (rerun a flaky `walks` test alone); `python tools/pwa/build_pwa.py` then
`node qa/run.mjs pwa` green (if `sw.js` or `index.html` changed, say so in the report); `python qa/shots.py` with
zero errors; `python qa/autoplay.py --device phone` once, to prove the Aim line never blocks the bot; a headless
load on desktop and phone profiles with no console errors.

## Report (last message, under 450 words)
Rows and totals (kept conditions per episode, the EXCLUDED list), files touched, the gzipped bytes you added and
the budget line after, preview image paths, log paths, known gaps, and the exact contracts H3 to H5 need
(`ledgerRows`, `namesKept`, how to add a row). No git. No em dashes. Bound every command.
