# Playtest Review 4: a brand-new player, phone first, both episodes

Read-only fresh-eyes review, Friday 2026-10-23 (Eastern), branch `overhaul` (identical to live main per the brief).
The reviewer plays as someone who has never seen the game, on a phone held both ways. Sources: the phone, portrait and
desktop shots in `qa/out` (10-22 01:55 set), the six autoplay reports and dialogue logs in `qa/out/autoplay`
(Episode 1 phone and desktop, Episode 2 from a save and fresh, 10-21), `qa/integrate/story_time.py` re-run on all
six, `tools/sim/simulate.mjs --check` (All targets met, 64,700 battles), and the code and data named below.
New evidence: eight short headless sessions on the local build in the phone profile (844x390 at 3x, `is_mobile`,
real touch events on the DOM controls and the canvas), one in portrait (390x844), nothing played by keyboard:
session 1 the gate to the wake-up, 2 the first town walk and menu, 3 the three ability barks, 4 a returning Episode 1
finisher at the title, 5 portrait and landscape scale, 6 the first fight. Scratch output stayed in the scratchpad;
every check below can be re-run from the steps given. Claims are tagged **Fact** (seen in a render, a log or the
code), **Reported** (from PLAN, HANDOFF or an earlier review) or **Inference**.

Not repeated here: anything in CRITIQUE_4 or PLAYTEST_REVIEW_3, or fixed in W11 to W13 (fog road, Hollow dusk,
fountain close-up, Other Selves placement, King HUD, Ep2 pacing and the level fix).

---

## 0. Verdict

A newcomer on a phone in landscape can play from the title to the Episode 2 credits without a softlock or an
unreadable screen, and the opening teaches by doing (Fact: 0 game overs, 0 errors and 0 warnings in all six autoplay
runs; every touch path I drove worked). The problems a first-timer will actually hit are seams between systems, not
content, and the worst four are all S: the title's "Episode 2" entry overwrites a finished Episode 1 at the first
door; every phone prompt that names a field button shows a keyboard key (E or Q), including the Lantern lesson
Episode 1 is built on; Episode 2 ends by pointing the party at a road that does not exist; and nothing in the game
ever tells the player that Talk, the hint system everything else leans on, is there.

---

## 1. The first ten minutes on a phone

Main path only, a first-timer reading at story_time.py's 15 characters a second (86 pages, 7.2 minutes of reading
to Bram's wolf line: Fact from the phone log) plus walking at 1.5x the bot. Clock is Inference.

| Clock | What happens | What a newcomer feels |
|---|---|---|
| 0:00 | Gate: "Tap or press any key" over the logo | Clear. In portrait the whole screen is 384 css px wide and the prompt is tiny (fix 5) |
| 0:10 | Title: one tap on "New Game" starts it | Good: a tap on the highlighted row confirms (Fact, session 1) |
| 0:15 | Name entry, "Hero" prefilled, A pick / B erase / check | Tapping a letter appends: one tap on A made "HeroA" (Fact, session 1); you must erase four letters first (fix 10) |
| 0:30 | Prologue, 6 cards, "2 / 6" | A tap advances one card. No skip by touch: only `start` skips and no touch control sends it (Fact, `prologue.js` line 45) |
| 1:00 | `wake_up`: 6 boxes, Hazel, one choice, two Potions | Tap anywhere advances text. At the choice, 25 taps on the text window did nothing (Fact, session 1); the first tap on the other row only moves the glove (fix 9) |
| 2:00 | Out the door: the bakery sign fades (Oren, a choice) | The best first image in either episode. The well Hazel named is on screen; Mael stands one tile off the right edge |
| 3:00 | First free roam and first menu (MENU pill) | Clean two-column grid with a help line. "Talk" sits there with no introduction anywhere (fix 4) |
| 3:30 | `mael_intro`: 13 boxes, one choice | Clear goal: Mira at the library, east; then the south gate |
| 5:00 | Library, Mira joins (22 boxes) | Strong scene: the name Iris cannot finish lands without a word of explanation |
| 7:00 | South gate, Bram joins (16 boxes) | Strong scene. Bram's grey-bearded portrait stands beside a young brown-haired sprite (Also seen) |
| 9:00 | Leave town, valley arrival, first fight | First blow at about 10 to 11 minutes main path, 15 or more with the town errands (Inference). Bram teaches Lunge and Mira teaches weak points, but no shield or weakness row is on screen until you pick a target (fix 6) |

First save: the menu saves anywhere and every map change autosaves (Fact). A newcomer never needs to find a save
point, which is right for a phone, but the single shared autosave is what fix 1 is about.

---

## 2. The Episode 1 to Episode 2 handoff

What a continuing player sees (Fact, `ep1.js` lines 791 to 817, `field.js` lines 945 to 960): the bells, "...Thirteen.",
"End of Episode 1", then "Episode 2: The Town Without a Name / The road east is waiting.", then the Episode 1 credits
(last card "Thank you for playing / The road east is waiting."), then the party wakes in bed and Hazel says "You heard it
too. Thirteen." The continuity is good and the levels meet (a finished save arrives at Lv 9 to 10; the fresh start is Lv 9
at 1433 EXP since W11; both credits saves in `qa/out/autoplay` are Lv 10). Three seams:

1. **The title trap** (fix 1). The next day the title offers Continue and Episode 2. Episode 2 looks like "go on", even
   pre-fills your hero's name, and gives you a stock party whose first door overwrites the save that holds your
   finished Episode 1.
2. The Episode 2 card plays before the Episode 1 credits, so the credits read as an ending after a beginning, and the
   continuing player gets no card when Episode 2 actually starts (the title path does: `title.js` line 164). Small.
3. The far end has the same shape with no Episode 3 behind it (fix 3).

---

## 3. Difficulty across both episodes

Sim, ordinary fights averaged per floor (Fact, `simulate.mjs --check` today; "attack only" is the sim's naive policy:
no weaknesses, no heals):

| Floor | Lv | Careful rounds | Careful HP lost | Attack-only win |
|---|---|---|---|---|
| Valley | 2 to 3 | 3.7 to 4.2 | 15 to 19% | 96 to 100% |
| Archive F1 | 4 | 3.5 | 17% | 99 to 100% |
| Archive F2 | 5 to 6 | 3.6 to 4.0 | 14 to 17% | 99 to 100% |
| **Archive F3** | 7 | 4.2 | **24%** | **71%** |
| Fading Road | 9 to 10 | 3.9 to 4.1 | 15 to 16% | 99 to 100% |
| Court F1 | 10 to 11 | 3.5 to 3.9 | 18 to 21% | 76 to 96% |
| Court F2 | 11 to 12 | 3.4 to 3.5 | 12 to 13% | 100% |
| **Court F3** | 12 to 13 | 3.5 to 3.7 | **11 to 13%** | **90 to 97%** |

Bosses (careful): Echo Warden 100% (7.2 to 8.2 rounds), Archivore Lv 8 100% (10.4), Other Selves 88 / 96 / 100% at
Lv 10 / 11 / 12, Nameless King 96% at Lv 12 (12.2 rounds) and 99% at Lv 13 (11.4). Live on Auto (Fact, the six
reports): Episode 1 floors average 5.1 to 6.0 rounds and the Archivore 12; Episode 2 floors 3.9 to 7.1 and the King 10 to
19; 0 game overs anywhere.

Reading: Episode 1 climbs to its last floor and its boss, as it should. Episode 2 opens gently (right after a boss),
peaks at Court F1 and the Other Selves, then gets easier floor by floor until the King: its last floor is the softest
ordinary floor in the game (fix 8). No spike remains that would stop a newcomer; the risk is the reverse, an hour of
ordinary fights that never ask for the systems before the King's telegraphs do.

---

## 4. Ten to fix, ranked by player impact

Sizes: **S** = hours, data or one file. **M** = about a day for one agent. **L** = several days.

1. **"Episode 2" on the title overwrites a finished Episode 1.** (S; M for the clean version)
   - Where: `scenes/title.js` line 96 (the `ep2` row) and `startEpisode2` line 157; `scenes/field.js` line 46
     (`AUTOSAVE_SLOT = 0`, shared by every playthrough) and line 205 (every map load after the first autosaves).
   - What (Fact, reproduced in session 4): slot 0 seeded with `qa/out/autoplay/phone-ep1-credits-save.json`
     (Arden Lv 10, 2840 G, Wayfarer Boots, 24 minutes, in bed at the Episode 2 morning). The title showed New Game /
     Continue / Episode 2 / Config. Episode 2 -> name entry pre-filled "Arden" -> the Episode 2 card -> the same bed
     and the same morning scene. Walking out the door rewrote slot 0 as Lv 9, 900 G, no boots, 18 seconds of play.
     No prompt at any point. New Game does the same to the autosave at its first door (Fact from the code, the
     same path; not run).
   - Why: the Episode 1 credits state lives only in the autosave unless the player saves again after waking, and few
     will. The quick start looks identical to continuing, so a returning player loses their run without knowing it,
     on the screen they see first.
   - Fix: (a) label the row "Episode 2: new party" and add a one-line help ("A ready party at Lv 9. Your own save stays
     under Continue."); (b) when any slot is occupied, New Game and the quick start ask once: "Starting fresh will
     replace your autosave (Arden Lv 10, Willowmere). Start anyway?" M alternative: give each playthrough its own
     autosave key (a run id in the save) so a new game never writes another run's autosave. Check: the repro above
     leaves slot 0 untouched unless the player confirms.

2. **Phone prompts name keys the phone does not have (E, Q).** (S)
   - Where: `core/engine.js` boot, line 741 (`await sceneTask`: the registry runs `title.js` `install`, which calls
     `bindGlyphs`) then line 751 (`_installUiArt` calls `fonts.setIconResolver` again and replaces it). The device-aware
     resolver in `ui/glyphs.js` never runs, so on touch `{i:btn_pageR}` falls back to the keyboard table (`btn_key_e`)
     and `{i:btn_pageL}` to `btn_key_q`.
   - What (Fact, rendered on the phone profile in session 3): Bram "let me shove it: [E]", Mira "Hit it at a run,
     Hero: [E]", Mira "[Q] to my lens, then [E]" (`text.js` lines 329 to 337). The same glyph sits in the Lantern lesson
     "raise the Lantern with {i:btn_pageR}" (`ep1.js` line 537, the moment the Lantern is given), the Whisperwood
     bridge (line 1028) and Talk on Archive F2 (`quests.js` line 280). The on-screen touch button itself is right: it
     reads "Dash" at the valley crack (session 3) and "Shove" or "Lantern" by the same code (`abilities.js` line 46).
   - Why: the Lantern is Episode 1's one field tool and the Shove bark is how Episode 2's Courage vow names its
     button (PLAYTEST_REVIEW_3). A phone player is told to press a key that does not exist.
   - Fix: install `bindGlyphs` after `_installUiArt` (or have `_installUiArt` wrap the existing resolver), then make the
     touch word follow the context instead of the fixed `TOUCH_WORDS.pageR = 'LANTERN'` (`glyphs.js` line 17): the cap
     should show what the touch button shows (SHOVE, DASH, LANTERN), and pageL on touch should draw the swap-tab icon.
     Add a node test: after boot with device `touch`, `{i:btn_pageR}` never resolves to a `btn_key_*` frame.

3. **Episode 2 ends by sending the party toward a road that does not exist.** (S; the words are Scott's)
   - Where: `game/story.js` lines 132 to 135 (wake at `nh_inn`), `quests.js` lines 729 to 742 (`epilogue2`), `ep2.js`
     lines 1083 to 1084 (the "Episode 3: The Forge of Ash" card), `maps/nameless_hollow.js` line 176 (one exit, west).
   - What (Fact): after the Episode 2 credits the party wakes in the inn; the journal says "Far to the north-east,
     Emberpeak is burning"; Talk says "Emberpeak is north-east, past the mountains. When you're ready, {hero}. Not
     before."; the Hollow has no road north or east, and nothing anywhere says Episode 3 is not playable yet.
   - Why: the last instruction the game gives is one the player cannot follow. A newcomer will walk the map looking
     for it, then wonder whether something broke.
   - Fix: one closing card after the credits (proposal, pending Scott's wording: "Episode 3 is still being written.
     Your journey is saved."), and epilogue Talk and journal lines that say the road is not open yet and point at what
     is left (open errands, the bestiary, Whisperwood). Check: Talk after `ep2_complete` names something the player
     can do.

4. **Nothing tells a new player that Talk exists.** (S)
   - Where: `scenes/menu.js` line 35 (Talk, help line "Ask your companions what comes next."); no line in `ep1.js`,
     `ep2.js`, `npcs.js` or `text.js` mentions it (Fact, grep).
   - What: every "where do I go" answer in both episodes lives in Talk (`quests.js` line 561: "Talk always names the
     next step"), and the earlier reviews' clarity fixes lean on it. A player who never opens the menu, or opens it and
     does not try an unexplained word, never finds it (Inference for how many will).
   - Why: on a phone a stuck player closes the tab; Chrono Trigger and FF6 rarely need a hint system, but this game
     made one its safety net and then hid it.
   - Fix: one line when Mira joins, after "I'll be the one taking notes": Mira "If you lose the thread, ask me.
     MENU, then Talk." (button word per device, after fix 2). Optional: the first time the field sits idle 60 s with no
     progress, a one-time toast "MENU > Talk: ask the party what's next". Check: the line appears once in the
     dialogue log.

5. **Held upright, the game is a 384-pixel strip with 7-pixel text, and nothing says to turn it.** (S)
   - Where: `core/renderer.js` lines 44 to 49 (portrait -> `touchMode: 'below'`); shots `portrait-story_mira_joins.png`,
     `portrait-ui_title.png`.
   - What (Fact, `LQ_DEBUG.view()` in session 5): portrait 390x844 gives `cssScale` 1.0 (the game is 384x216 css
     px in the top quarter of the screen); landscape 844x390 gives 1.67 (640x360). Body caps are about 7 css px
     tall upright against about 12 sideways, smaller than the phone's own system text. No rotate hint exists (Fact, grep).
   - Why: a link opened on a phone usually opens upright, and the owner plays on his phone (Inference). The first
     impression is a small picture and smaller text above a large empty control area.
   - Fix: in portrait, a one-time card over the gate and title: "Turn your phone sideways for a bigger picture." with
     a small rotate icon; any tap dismisses it, a setting remembers it, landscape never shows it. Keep the portrait
     layout for players who choose it.

6. **Shields and weak points are hidden while you choose a command.** (S)
   - Where: `scenes/battle.js` lines 762 to 764 (rows drawn only for the targeted foe, the acting foe and a foe hit in
     the last 1 to 3 seconds); shots `phone-battle_command.png` (one row, the wolf just hit) and the first fight in
     session 6 (no row on either wolf at the first command, still none 9 seconds later).
   - What (Fact): the first fight opens on Bram's "a Lunge breaks a charging foe" and Mira's "It shows a foe's weak
     points", then shows neither shields nor "?" slots until the player picks Attack and a target.
   - Why: Break is the planning layer (Octopath keeps shields and weakness slots under every foe at all times); a
     newcomer learns the system exists only by targeting, after deciding.
   - Fix: while the command menu is open for a party member, draw every living foe's row through `planEnemyRows`
     (it already places several rows clear of the windows and of each other on touch); keep today's rule during
     animations. Check: `phone-battle_command` shows both wolves' rows and no row crosses a body (CRITIQUE_4 item 1).

7. **The floor's name is hidden under the arrival scene's first line.** (S)
   - Where: `scenes/field.js` lines 203 to 204 (banner), line 780 (the banner keeps timing under a dialog), lines 208 to
     210 (enter scenes start 8 to 20 frames after the load); shots `phone-story_f1_arrival.png` and
     `desktop-story_f1_arrival.png`.
   - What (Fact): Mira's top-placed window covers "Rootbound Archive" and cuts "I. The Catalog Halls" in half; by the
     time the box closes the banner has gone.
   - Why: the floor names are the dungeon's chapter titles and a newcomer's map of where they are.
   - Fix: hold enter-trigger scenes until `!this.banner.active`, as the barks already do (line 726), or pause the banner
     while a dialog is on top. Check: every arrival shot shows the full banner before the first box.

8. **Episode 2's last floor is the easiest floor in the game.** (S)
   - Where: `encounters.js` `court_f3` plan, the `c3_*` groups in `enemies.js`.
   - What (Fact, sim): careful HP lost 11 to 13% on Court F3 against 24% on Archive F3 and 18 to 21% on Court F1;
     attack only wins 90 to 97% there against 71% on Archive F3. Live F3 fights run 4.2 to 5.0 rounds on Auto.
   - Why: the floor before the final boss should be the tightest; today it trains the player to leave the systems
     alone right before the King asks for them.
   - Fix: raise `c3_*` ATK and MAG about 12% (or one more shield on the knights), no new fights. Target: careful HP
     lost 18 to 22% at Lv 12, attack-only win 70 to 85%, rounds unchanged. Re-run `simulate.mjs --check`.

9. **Choices on touch: the window ignores taps and the first tap only moves the glove.** (S)
   - Where: `ui/dialog.js` lines 217 to 221 (an open choice box takes all input; the "tap anywhere" advance on line 208
     stops working), `ui/choice.js` line 41 (its List uses the default `tapMode: 'double'`, `ui/list.js` lines 250 to
     252); shot `phone-ui_dialog_choice.png`.
   - What (Fact, session 1; the two-tap rule from the code): after six prologue cards and Hazel's first box, all
     advanced by tapping anywhere, the game's first choice (Hazel's) ignored 25 taps on the text window; a tap on the
     other row moves the glove and a second tap confirms it.
   - Why: the player has just learned that tapping advances; the first choice teaches that it sometimes does not.
   - Fix: `tapMode: 'single'` for choice boxes (two or three 45 css px rows, so a misfire is rare), and a tap on the
     text window while a choice is open bobs the glove with the cursor sound.

10. **Typing a name appends to the default "Hero".** (S)
    - Where: `scenes/nameEntry.js` line 25 (`value` starts as "Hero").
    - What (Fact, session 1): one tap on A gave "HeroA"; "Arden" typed straight in would become "HeroArde" (the
      8-letter cap).
    - Why: it is the first thing the player does with their hands, and it goes wrong before they see why.
    - Fix: show "Hero" as a dim placeholder that the first typed letter replaces; confirming with nothing typed keeps
      "Hero". Keep the pre-filled name in the Episode 2 entry, where it is the player's own.

---

## 5. Protect these

- **One tap starts the game** (the highlighted title row confirms on tap) and the name grid types on a single tap.
- **The touch ability button names the ability in context** ("Dash" with its swap tab beside it), shown only when
  there is something to use it on. Only the dialogue glyphs are wrong (fix 2).
- **Battle on touch**: FLEE, AUTO and the speed button in the help bar, the two-column command grid, tap targeting
  with the damage preview and the timeline drop marker.
- **Save anywhere plus an autosave on every map**, and Retry after a loss returning to the last safe spot at full HP with
  progress kept (`gameover.js`). Keep the autosave; only isolate it (fix 1).
- **The opening's directions**: Hazel's "by the well" with the well on screen as you step out; Mael's two named
  stops; Talk's step-by-step lines in Mira's and Bram's voices (once players can find them).
- **The fading bakery sign** as the first image, and the first fight's two teaching lines (make their subject
  visible, fix 6).
- **The Load and Save pages** (gold frame, finger centred) and the main menu's help line.
- **The episode seam**: "...Thirteen." at night, the credits, then "You heard it too. Thirteen." in the morning.

---

## 6. Also seen, below the line

- Bram is still two people: the grey-bearded portrait (`phone-ui_menu.png`, `phone-story_south_gate.png`) against a
  young brown-haired field and battle sprite (`phone-battle_command.png`). Raised by CRITIQUE_2 item 1 and CRITIQUE_3
  item 8; PLAN marks it stale ("asset is correct"), but the 10-22 shots still show both. Scott's call which Bram is canon.
- The font kerns `y.` (and `r. f. T. P. V. F. Y. 1.`) by -1, so an ellipsis after those letters shows two dots:
  "Halt! Nobody.. Mira?" (`phone-story_south_gate.png`; `assets/ui/font.json` kerning). Drop the kerning when the next
  character is also a period (S).
- Items, "Use Antidote on...": the target window's glove sits over the item list and reads as pointing at
  "Hi-Poti" (`phone-ui_items.png`). Put the glove inside the target window on touch (S).
- The prologue cannot be skipped by touch; send `start` from a long press on A or the MENU pill there (S).
- The hero stands over his own bed at the wake, so the bed is hidden in the first field frame (`phone-story_wake.png`).
- On touch the ability button appears only near a target, so a phone player cannot raise the Lantern at will to
  probe a dead end the way E can. Fine for today's puzzles; keep ink within two tiles of every dead end it explains.
- Move the "Episode 2" card from before the Episode 1 credits to the wake-up, so it marks the start (S).

## 7. Not checked

- A real phone: touch feel, haptics, iOS Safari (no Fullscreen API on iPhone, the address bar, notch safe areas),
  audio unlock, frame rate on a mid phone. All sessions were headless Chromium with emulated touch.
- The live URL itself: the sessions ran the local `overhaul` build, which the brief states is identical to live.
- A timed human run; every minute figure is an estimate on story_time.py's rules.
- The Episode 2 post-credits wake (fix 3) is read from code, not played; Whisperwood Hollow on the phone; no new
  autoplay run (the six 10-21 runs were used).
- Whether fix 8's +12% lands in the target band: one sim run after the edit settles it.
