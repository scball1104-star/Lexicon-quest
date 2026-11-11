# CRITIQUE 9: the whole game, Episodes 1 to 6, as a new player on a phone meets it

Read-only fresh-eyes review, Tuesday 2026-11-10, late night (Eastern), worktree `D:\lq-fv` on branch `scott/critique-9`
(overhaul e589417). Earlier reviews looked at one episode each; this one looks across all six: the first ten minutes, the
seams between episodes, consistency, the story arc, and phone ergonomics. No game code, data, art or test was changed.

Sources (all scratch output in the git-ignored `next/qa/out/`):

- **Shots:** `python next/qa/shots.py --device phone --timeout 1400 --only <51 shots>` (51 of 51 ok in 221 s), PNGs in
  `next/qa/out/phone-*.png` (844x390 at 3x). Contact sheets in `next/qa/out/review9/s_first.png` (title to town),
  `s_morn.png` (episode mornings and endings), `s_battle.png` (one battle per episode), `s_ui.png` (menus).
- **Sim:** `node next/tools/sim/simulate.mjs --n 100` (242 s, "All targets met"), output `next/qa/out/review9/sim100.txt`.
- **Autoplay:** one new run, `python next/qa/autoplay.py --episode 1 --device phone` (bounded 1800 s), report and log in
  `next/qa/out/autoplay/phone-*`. For Episodes 2 to 6 I read the latest phone runs already on disk (copied, not re-run):
  `D:\LexiconQuest\next\qa\out\autoplay\phone-ep{2..5}{,-new}-report.json` (10-21 to 11-09) and
  `D:\lq-ep6\next\qa\out\autoplay\phone-ep6{,-new}-report.json` (11-10). Tables: `review9/seams.py`, `review9/terms.py`.
- **Timer:** `next/qa/integrate/story_time.py` on the phone runs, output `next/qa/out/review9/story_time.txt`.
- The code and the six story bibles (`docs/story/EPISODE1.md` to `EPISODE6.md`, "What the player knows by the credits").

Tags: **Fact** (seen in a render, a log, a measure or the code), **Reported** (from a plan, a report or an older run),
**Inference** (my reading, with the check that would settle it). Sizes: **S** hours, **M** about a day, **L** several days
or new art. "Hot" = touches a hot file named in `AGENTS.md`.

---

## 1. Verdict

Played straight through on a phone, Lexicon Quest holds together better than most six-part games: the battle screen is
the same readable FF6 grid in Episode 6 as in Episode 1, each episode's twist (Heat, Decrees, Turn the Sky, the Gale)
retires with its episode instead of piling up, levels and gold carry across every seam within one level of the quick
starts, the game autosaves on every map change and saves anywhere, and every episode reaches its first fight 3 to 6
minutes after its morning scene (Fact). What a straight-through player meets that the per-episode reviews could not
see: **the game forgets which chapter they are in** (a real bug: "Chapter I" on the save card in Episode 6, and vows that
pay the Episode 1 rate under one shared cap), **the very first fifteen minutes have one fight and about 118 pages of
town talk**, **the story's Episode 6 payoff, the first page, is set up by a single line before Episode 5**, **boss
fights get longer every episode without getting harder**, and **four episodes in a row open in the same inn room with
a document arriving at breakfast**. Item 1 is an agent fix today; items 2, 3 and 5 are Scott's and Stephen's calls.

---

## 2. Ranked list

### Agent can just do / Scott and Stephen decide (summary)

| # | What | Size | Who decides | Hot / art / music / story |
|---|---|---|---|---|
| 1 | Chapter never advances for a straight-through player (save card, menu, vow pay and cap) | S | Agent | state.js if fixed on load (hot); none if fixed in the morning scenes |
| 2 | First fifteen minutes: one fight, then ~118 pages before the valley | M | Scott and Stephen (cuts), agent (a fight) | story text; maybe `willowmere` map |
| 3 | The first page is set up by one line before Episode 5; the hero's own name fades from the script | M | Scott and Stephen (words), agent (Journal page) | story text |
| 4 | Main bosses get longer every episode (10.5 to 14.7 rounds), not harder | S | Scott and Stephen (target), agent (tune) | data only |
| 5 | Four mornings in one inn layout, three opening on a document at breakfast | M to L | Scott and Stephen | art (inn maps), story structure for Episode 7 |
| 6 | Episode 6 F3 is the longest dialogue run in the game (52 pages, 3.7 min) | S | Scott and Stephen (trim) | story text |
| 7 | Title after Episode 5: nine rows, five of them quick starts | S | Agent (Scott OK on the rule) | none |
| 8 | Battle FLEE / AUTO / x1 are about 50 x 25 css px, a few px apart | S | Agent | none |
| 9 | Fury and Combo are never taught in words; Lunge and Appraise are | S | Agent (Scott OK on two lines) | story text (two barks) |
| 10 | "Ledger" means seven things; the player's Ledger is never mentioned after Episode 3 | S | Scott and Stephen | story text / one label |

### 1. BUG, MAJOR: a straight-through player stays in "Chapter I" for six episodes. (S, agent)

- **Where:** `src/game/state.js` line 39 (`chapter: 1` in a new game); the only writes are the quick starts:
  `state.js` lines 98 (Episode 2) and 155 (Episode 3), `src/data/ep4/start.js` 63, `ep5/start.js` 69, `ep6/start.js` 71.
  Nothing in the credits handoff (`src/scenes/field.js` `rollCredits`, line 1032) or any morning scene sets it (Fact,
  `grep "chapter ="`). Readers: `src/scenes/loadGame.js` 112 (the save card's "Chapter N"), `src/scenes/menu.js` 204 (the
  field menu's Chapter line), `src/game/vows.js` 94 to 130 (vow pay by chapter, and the cap of 5 paid vows per chapter).
- **Seen (Fact):** the bot's straight-through saves at the end of Episode 5 and of Episode 6 both hold `chapter: 1`
  (`D:\LexiconQuest\next\qa\out\autoplay\phone-ep5-last-game.json`, `D:\lq-ep6\next\qa\out\autoplay\phone-ep6-last-game.json`), as does tonight's Episode 1 credits save
  (`next/qa/out/autoplay/phone-last-game.json`).
  The quick-start party for the same episode holds `chapter: 6` (`qa/saves/ep6_saves.test.mjs` line 43 asserts it). So the
  player who played every minute sees "Chapter I" on the save card in the Cloud Library, and the one who took the shortcut
  sees "Chapter VI".
- **The vows (Fact by code, impact Inference):** `VOW_REWARD = { 1: 4, 2: 8, 3: 12 }` mastery points and `VOW_PAID_CAP = 5`
  per chapter (`src/data/vows.js`). With the chapter stuck at 1, a straight-through player is paid 4 points a vow, and
  only five vows pay in the whole game; a quick-start party is paid 12 and gets a fresh five. The faithful player is the
  one penalised. Check: keep a vow in Episode 4 from a chained save and read the reward toast.
- **Why it matters:** the first thing a returning player reads is the save card; a wrong chapter says "your progress was
  lost" (Inference). The vow rule punishes exactly the people the game is for.
- **Smallest fix:** set the chapter where each episode begins for everyone: in each morning scene (`ep2_morning` in
  `story/ep2.js`, `ep3_morning` in `story/ep3.js`, `ep4_morning`, `ep5_morning`, `ep6_morning` in the packs) set
  `chapter = N` if lower. For old saves, derive it on load from the highest `epN_started` flag (that line lives in
  `deserialize`, `state.js`, hot; say so in the issue). Old `vowsKept` entries keep their recorded chapter (no back pay).
  Add one chained-save test: Episode 1 credits save, through each morning, chapter reads 2..6.

### 2. MAJOR: the first fifteen minutes have one fight. (M, Scott and Stephen for cuts; agent for a fight)

- **Where:** Episode 1, Willowmere, between `yard_fight` and `valley`. My phone run's dialogue log
  (`next/qa/out/autoplay/phone-dialog.log`, marks per step) and `review9` page counts.
- **Seen (Fact):** title, name entry and the cold open are quick (the party wakes 56 game s in, 5 pages read). The yard
  slime comes at 85 game s with 18 pages read, so a new player is in a fight inside about 3 minutes, and it teaches the
  weakness row. Then nothing to fight until the valley: **118 pages between the yard slime and the valley** (willowmere 51,
  library 21, smithy 16, bakery 9, hero_home 8, chapel 6, inn 3), and the bot reaches the valley at 6.8 game minutes with
  11.3 minutes of reading on top (typing at normal speed, read at 15 characters a second). The bot talks to every NPC, so
  part of this is optional (Fact: bakery, smithy and inn are errands).
- **Inference:** a first-time phone player reaches their second fight 15 to 20 minutes in (walk time x1.5 to 2 plus
  reading; the repo timer's rule). Settle: one real-touch play of a new game by someone who has not seen it, clock in hand,
  or a main-path-only page count (the timer counts every errand: Episode 1 estimates 108 to 130 minutes in all, section 3).
- **Why it matters:** this is the "would a new player stay?" window. The cold open and the yard fight earn the first three
  minutes; the next twelve are errands in a town whose problem the player already understands.
- **Smallest fix (pick one or both):** (a) a visible foe or a short scripted scrap on the way from the library to the south
  gate (Mira's first spell, or Bram's join as a sparring fight: it would also teach Combo, item 9); (b) a trim pass on the
  main-path Willowmere pages with Scott's words (the Episode 3 and 4 trims are the pattern). (a) is an agent job once the
  beat is agreed; (b) is Scott's text.

### 3. MAJOR: the thread a straight-through player follows thins out, and the Episode 6 payoff is barely set up. (M, Scott and Stephen)

- **Where:** script grep and the six bibles' "What the player knows by the credits".
- **Seen (Fact):** "first page" appears in the script outside Episodes 5 and 6 exactly once: Vex in Episode 3, "Your first
  page isn't in this fire either. I looked." (`src/data/story/ep3.js` line 475). The Episode 2 bible says the player knows
  by the Episode 2 credits that Vex "says the hero is missing the first page" (`EPISODE2.md` line 548), but no Episode 2
  script line contains "first page" or "beginning" (Fact, grep of `story/ep2.js` and `quests.js`). In the Deep Stacks the
  same phrase means "level one, empty hands" (`src/data/cave/text.js` lines 76, 91; `cave/world.js` 380).
- **Mentions per episode, last bot run of each, phone (Fact, `review9/terms.py`):**

  | term | Ep1 | Ep2 | Ep3 | Ep4 | Ep5 | Ep6 |
  |---|---|---|---|---|---|---|
  | dialogue pages | 421* | 405 | 300 | 251 | 229 | 247 |
  | "your name" | 4 | 4 | 1 | 3 | 1 | 1 |
  | "first page" | 0 | 0 | 1 | 0 | 4 | 3 |
  | "Keep this one" | 0 | 0 | 0 | 1 | 3 | 2 |
  | "Vex" | 0 | 10 | 5 | 6 | 9 | 27 |
  | "Tess" | 5 | 5 | 0 | 0 | 0 | 0 |

  (*Ep1 from tonight's full run, title to the epilogue; the others are older runs, see Sources.)
- **The held-back list grows every episode (Fact, the bibles):** Tess's father (seeded Episode 1, still held at 6), Mara's
  one bell (3, still held), the Court's forgotten Keeper (2, still held), the name Vex will not give up (4, still held),
  the warm hand (4, still held), plus the other half of the page (new in 6). Six open questions at the Episode 6 credits,
  one of them (Tess's father) not spoken of since Episode 2.
- **Inference:** a player who plays straight through follows "the hero's name" in Episodes 1 and 2, the lists and seals in
  3 and 4, and meets "the first page" as a new object in Episode 5. The Ledger, the seal, the counter-seal, true ink, the
  star and the first page are one thread to the writers and six nouns to the player. Settle: ask a playtester after
  Episode 5 "what is Vex keeping?" and "what is the first page?".
- **Smallest fix:** (a) put the Episode 2 line the bible already promises into `ep2.js` (Vex, at the Court: one line about
  the first page), Scott's words; (b) a Journal page "What we know" (`ui/screens/journal.js`, a fourth tab or a Quests
  section) that reads five or six one-line facts from flags already set, so a player back after a week can find the
  thread; agent builds, Scott and Stephen write the lines; (c) for Episode 7, answer one held-back question early (Tess's
  father is the cheapest: it reaches back to Episode 1).

### 4. MAJOR (balance): main bosses get longer every episode without getting harder. (S, Scott and Stephen pick the target; agent tunes)

- **Where:** `next/qa/out/review9/sim100.txt` (100 seeds a row), boss rows; foes in `src/data/enemies.js` and
  `src/data/ep4..6/enemies.js` (data, not hot).
- **Seen (Fact), careful policy at the expected level:**

  | Boss | Lv | Rounds (p10 to p90) | HP lost | Reckless win |
  |---|---|---|---|---|
  | Archivore (Ep1) | 8 | 10.5 (7.7 to 13.7) | 22% | 82% |
  | Nameless King (Ep2) | 13 | 11.0 (8.0 to 14.7) | 20% | 80% |
  | Cinder Warden (Ep3) | 16 | 12.7 (9.7 to 16.0) | 22% | 62% |
  | Paper Regent (Ep4) | 20 | 13.3 (10.3 to 17.3) | 18% | 80% |
  | Sand Oracle (Ep5) | 24 | 13.4 (10.3 to 17.0) | 24% | 77% |
  | Storm Scribe (Ep6) | 27 | 14.7 (12.3 to 18.7) | 16% | 62% |

  Careful HP lost stays 16 to 24% across all six; the length grows by 4 rounds. DESIGN 7's only stated boss target is the
  Archivore's 8 to 12. Ordinary fights stay put (bot average 4.8 to 6.3 rounds per episode, Fact, reports).
- **Why it matters (Inference):** on a phone at 1x each round is three commands; a 15-round Scribe is about 45 menu picks.
  Length is not challenge; the late bosses read as HP walls. Settle: the timer's battle minutes for the Scribe vs the
  Archivore in the two reports.
- **Smallest fix:** agree one boss target for every episode (say 9 to 13 rounds careful); then trim HP on the Regent, the
  Oracle and the Scribe about 10 to 15% and re-run `simulate.mjs --check`. If more challenge is wanted, add it through the
  telegraphs, not HP.

### 5. MINOR, structure: four mornings in the same room, three of them a document at breakfast. (M to L, Scott and Stephen)

- **Where:** `s_morn.png` (Fact: `story_ep3_morning`, `story_ep4_morning`, `story_ep5_morning_letter`,
  `story_ep6_morning_slip`); maps `nh_inn.js`, `ep3/pk_inn.js`, `ep4_vw_inn.js`, `ep5_sh_inn.js`, each headed "the Lantern
  Inn's layout and exit (inn.js), re-dressed" (Fact). The Episode 6 credits wake the party in `ep6_zl_inn` for Episode 7.
- **Seen (Fact):** the same two-room plan (taproom left, beds right, the round rug, the long table) opens Episodes 3, 4, 5
  and 6. Episodes 4, 5 and 6 each open on something arriving at the inn: Ada's wet orders, the star letter that lost a name,
  the boarding slip with a burned seat. Each is good on its own; the close-ups are some of the best frames in the game.
- **Why it matters (Inference):** a player who plays straight through sits down in the same room four times running; the
  seam becomes a ritual and stops feeling like a new place.
- **Smallest fix:** nothing to rebuild in 3 to 6. For Episode 7, decide now to open somewhere else (on the road, on the
  dock, mid-climb) and with something other than a delivered page. If one change is wanted in the shipped six, the cheapest
  is the Episode 6 morning: stage it on the Saffron Haven street (the slip handed over at the gate), a map that exists.

### 6. MINOR: Episode 6 F3 is the longest dialogue run in the game. (S, Scott and Stephen)

- **Where:** `next/qa/out/review9/story_time.txt`; `src/data/ep6/story.js`, the F3 scenes (`ep6_obs_f3`).
- **Seen (Fact):** 52 pages, about 3.7 minutes, in one map. The longest earlier runs are 38 pages (Ep3 foundry F3), 36
  (Ep4 keep F2), 37 (Ep5 labyrinth F2). Episode 6's next two are 36 (F2) and 29 (the Eyrie): 117 pages in the last three
  maps.
- **Why:** on a phone every page is a tap on A or the box, and the run sits right before the final boss, when the player
  wants to play (Inference).
- **Smallest fix:** Scott's trim of 10 to 15 pages on F3 (the Episode 3 and 4 trim passes are the model); or split the
  run with a step of play (a lane ride between the two halves).

### 7. MINOR: the title after Episode 5 shows nine rows, five of them quick starts. (S, agent)

- **Where:** `phone-ui_title_ep6.png` (Fact): New Game, Continue, Fine Print, Config, Episode 2..6: new party, in two
  columns; the hand for the right column floats in the middle of the window. `src/scenes/title.js` lines 45 to 67 and each
  pack's `title()` hook.
- **Why:** a player who has finished Episode 5 needs Continue; four of the five quick starts are for someone else
  (Inference). Phone: two columns of small text under a large logo.
- **Smallest fix:** show only the quick start for the newest episode the player has not finished in their own save (plus
  New Game, Continue, Fine Print, Config), or fold all of them into one "Start at an episode" row with a sub-list. Scott
  says which.
- **Status (#88, 2026-11-11):** Scott chose the fold. Two or more quick starts are one "New party…" row that opens them as a
  list (`src/scenes/title.js`; `docs/UI.md`). After Episode 5 the title is New Game, Continue, Fine Print, New party…, Config,
  one column.

### 8. MINOR, phone: the battle toggles are small and touch each other. (S, agent)

- **Where:** `src/battle/scene/layout.js` line 57: FLEE 31 x 15, AUTO 30 x 15, x1 28 x 15 internal px, 2 to 3 px apart, hit
  area equal to the art (Fact, `scenes/battle.js` 400 to 409 `tapIn` on the same rects). On the phone frame that is about
  50 x 25 css px each (Fact, `phone-battle_command.png`: 145 x 70 device px at 3x).
- **Why:** 25 css px is about half a fingertip; AUTO sits between FLEE and the speed toggle. FLEE is safe (two taps); a
  stray AUTO hands the fight to the bot mid-boss (Inference: check a realplay run's misses on this row).
- **Smallest fix:** keep the art, grow each hit rect to the full help-window height and halfway into each gap (the touch
  controls already do this with `pad`, `src/core/touch.js` 202). Add a realplay tap on each.

### 9. MINOR: Fury and Combo are never taught in words. (S, agent with Scott's two lines)

- **Where:** party chat in the valley teaches Lunge and Appraise (Fact: "a Lunge breaks a charging foe", "Appraise one
  before you swing", `phone-dialog.log`). The first-time barks are `bark:first_chest`, `visible_enemy`,
  `appraise_target`, `dash_target`, `heavy_block`, `font`, `elite` (Fact, `state.js` line 97): none for Fury or Combo.
  Their only text is the help line ("This weapon's Fury art.", "Act with a partner.", `battle/scene/menu.js` 20). Fury is
  dim in all seven phone battle shots across the six episodes (Fact, the shots are staged, so this proves nothing alone).
- **Inference:** a phone player on Auto or in a hurry may finish Episode 6 without casting a Combo; DESIGN 7 calls both core.
  Settle: count Fury and Combo actions in one real-input Episode 1 run.
- **Smallest fix:** two first-time barks (the first time a Fury gauge fills; the first time Combo lights), one line each from
  Mira or Bram, in Scott's words.

### 10. MINOR: "Ledger" means seven things, and the player's Ledger drops out of the story. (S, Scott and Stephen)

- **Where:** the menu tab `Ledger` ("Names kept: N of M", `ui/screens/journal.js` 18, `phone-ui_ledger.png`) and in-story
  the Town Register, the Catalog Ledger, Elian's ledger, the Ledger of the Court, the Foundry Ledger, the Keep Ledger (Fact,
  dialog logs and `text.js` 716, `ep4/text.js` 181). "Ledger" in dialogue: Ep1 2, Ep2 5, Ep3 3, Ep4 to Ep6 0 (Fact,
  `terms.py`), while the count grows to 64 names (title shot "33 of 64"). The hero's own row can never be kept
  (`data/ledger.js` line 19, `kept: () => false`).
- **Why (Inference):** the collection that most directly carries the theme reads as a side counter by Episode 4.
- **Smallest fix:** one line per episode end that points at it (Mira reading the new names into it at the credits is the
  natural place), or rename the tab "Names" so the story's ledgers stay story. Scott and Stephen choose.

---

## 3. Also seen, below the line

- **Seams, carry-over (Fact, reports):** levels chain 1 to 9, 10 to 14, 14 to 18, 18 to 21, 21 to 25, 25 to 28; the quick
  starts sit within one level (Lv 9, 13, 17, 21, 25). Gold at each seam: 2,805, 1,820, 2,297, 4,484, 3,339 carried; Episode
  6 ends with 9,714 to 10,333 G and nothing left to buy (Fact): Episode 7's first shop needs a sink.
- **Fights per episode fall** (33, 26, 19, 18, 14, 17 in the bot runs, Fact) while pages fall 411 to about 240: later
  episodes are shorter in both, which suits the phone.
- **First fight after each morning:** Ep3 4.9 to 5.7 min, Ep4 3.5 to 4.0, Ep5 3.6 to 4.2, Ep6 3.3 to 4.0 (Fact, timer; target
  under 5). Ep3 is just over.
- **First-play estimates (Fact, timer, from those runs):** Ep1 108 to 130 min (tonight's run: 31 fights, 401 pages, the
  bot talks to every NPC and runs every side errand), Ep2 97 to 124 min (old 10-21 run), Ep3 77 to 98, Ep4 76 to 99,
  Ep5 61 to 79, Ep6 72 to 98 against 60 to 90.
- **End card to the next episode:** "Episode 6 begins in the morning." exists only once the `ep6` pack has registered
  (`ep6/hooks.js` 160); the pack is wanted from `ep5_complete`, which the credits trigger sets, and the watcher polls every
  3 s (`game/packs.js` `startPackWatch`). On a slow or offline first reach the card can say "Episode 6 is not playable
  yet." and then the morning plays anyway (Inference; settle: the offline reload tool from an Episode 5 credits save).
- **"Names kept" moves:** top right over the art on the two-column title, centred under the menu on the short one (Fact,
  `phone-ui_title_ep6.png`, `phone-ui_title_ledger.png`). Nit.
- **Battle menu:** the left column has an empty cell under Tech for Arden and Bram (no Magic), so the grid looks gapped
  (Fact, `phone-battle_command.png`). Nit; the fixed grid is the right call.
- **Load waits:** live slow-phone entry cold 6.6 to 6.8 s, warm 2.1 to 2.3 s, under the 8 s and 3 s targets (Reported,
  `docs/HANDOFF.md`). Not re-measured tonight.

## 4. Protect these

- **One battle screen for six episodes**: Attack, Combo / Tech, Item / Magic, Defend / Fury, Swap; the party status box;
  the timeline of eight; FLEE, AUTO, x1 in the help bar (Fact, `s_battle.png`, `phone-battle_scribe_rewrite.png`).
- **Each twist retires with its episode** (Turn the Sky leaves skyless fights, Anchor leaves windless ones): the menu stays
  readable in Episode 6 because nothing piles up.
- **Quick starts within one level of the carried party**, with the help "Your own save stays under Continue."
- **Autosave on every map change and Save from the menu anywhere** (`field.js` 216, 299; `menu.js` 107).
- **The yard slime at about 1.5 minutes** and the valley party chat that teaches Lunge and Appraise.
- **The close-ups**: the star letter losing a name, the boarding slip with the burned fourth seat, the crew list, the first
  page.
- **Touch controls** sized for fingers (A/B at least 56 css px, RUN/MENU pills with a minimum height, invisible margins).

## 5. Top 10 to fix

| # | Fix | Where | Size | Who |
|---|---|---|---|---|
| 1 | Set `chapter` at each morning; derive it on load for old saves; chained-save test | morning scenes in `story/ep2.js`, `ep3.js`, `ep4..6/story.js`; `state.js` deserialize (hot) | S | Agent |
| 2 | A fight between the library and the south gate; trim main-path Willowmere pages | `story/ep1.js`, `maps/willowmere.js` | M | Scott and Stephen, then agent |
| 3 | Vex's Episode 2 "first page" line as the bible says; a "What we know" Journal page | `story/ep2.js`, `ui/screens/journal.js` | M | Scott and Stephen (words), agent |
| 4 | One boss length target for all episodes; trim Regent, Oracle, Scribe HP | `ep4..6/enemies.js`, `tools/sim` targets | S | Scott and Stephen, then agent |
| 5 | Episode 7 opens away from an inn and without a delivered page | `docs/EPISODE7` plan | M to L | Scott and Stephen |
| 6 | Trim Episode 6 F3 by 10 to 15 pages | `ep6/story.js` | S | Scott and Stephen |
| 7 | One quick-start row (or a sub-list) on the title | `scenes/title.js`, pack `title()` hooks | S | Agent |
| 8 | Bigger hit rects for FLEE / AUTO / x1 | `battle/scene/layout.js`, `scenes/battle.js` | S | Agent |
| 9 | First-time barks for Fury and Combo | `game/state.js` counters list (hot) or the bark table | S | Agent, Scott's words |
| 10 | Point the story at the Ledger once an episode, or rename the tab | `journal.js`, credits scenes | S | Scott and Stephen |

**Verdict.** The game a phone player meets is consistent and fair across six episodes: the battle screen never grows a
seventh window, the seams carry everything, and every morning gets to a fight within five minutes. Fix the stuck chapter
first (a real bug that shortchanges exactly the players who play straight through), then spend Scott's and Stephen's
attention on the opening fifteen minutes and on making the first page a thread instead of a reveal.
