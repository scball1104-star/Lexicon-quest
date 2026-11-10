# Playtest Review 8: Episode 6 on a phone, from an Episode 5 save and from the quick start

Read-only fresh-eyes review, Tuesday 2026-11-10 (Eastern), worktree `D:\lq-ep6` on branch `scott/ep6-design` (HEAD 8ec837d)
with `EP6_LIVE` true. Art and UX are in `docs/CRITIQUE_8.md` (same sitting); this file is play, pacing, puzzles, balance,
story beats, saves and sound.

Sources: the five E6-integrate autoplay runs (`qa/out/autoplay/{desktop,phone}-ep6{,-new}-report.json`,
`desktop-ep6-all-report.json` and their `-dialog.log`), `qa/integrate/story_time.py` re-run on the four main runs
(`qa/out/review8/play/timer_2026-11-10.txt`), the simulator from a scratch script (`qa/out/review8/play/sim_bosses.mjs`, 60
seeded fights per row) and `simulate.mjs --trace` (read-only, no `--json`), the code, and my own short headless sessions on
the phone profile (844x390 at 3x), every one under a hard timeout, one browser at a time, scripts and output in
`qa/out/review8/play/`:

- rp: `qa/realplay/ep6battle.py` and `ep6field.py` run through `rp_ep6.py`, which moves their screenshots into
  `qa/out/review8/play/rp/` (real keys, the on-screen d-pad and A, canvas taps; the driver's guard counts any `LQ_DEBUG.press`,
  `battleAct` or `battleUntil` and fails the sequence);
- s1 the opening from the Episode 5 credits save at 1x with the bot's inputs as real keys (the clock marks survived; the run
  went on past the first ride and hit my 500 s ceiling in F2, so its page log was lost);
- s6 and s6b try to lose a save: a save made by the real menu on a lane cell, Continue by keys, the menu key mid-ride, and
  Continue with every `ep6` file blocked;
- s8 the `vex_falls` scene page by page by real Z presses (the rope).

I did not run the full `qa/realplay/run.py` (E6-integrate reported 97/98, the one failure Episode 4's seal sequence). Nothing
I ran writes to `qa/world/out` or `qa/cave/out` (Fact: no file there, in `qa/out/realplay`, `qa/out/autoplay` or
`tools/sim/out` is newer than my first scratch file).

Tags: **Fact** (seen in a render, a log, a measure or the code), **Reported** (from a plan, a report or the bot),
**Inference** (my reading, with the check that would settle it). Sizes: **S** hours, **M** about a day, **L** more.

---

## 0. Verdict

Episode 6 plays end to end from both starts with no softlock (Reported, five bot runs) and, unlike Episode 5, **a person can
cast the boss's answer**: Anchor opens first and gold in Bram's Tech list with a Rewrite pinned, and it casts by keys, by the
phone's d-pad and A, and by two taps on the canvas, with the Rewrite broken by `anchor` read back (Fact, rp, 3 of 3). The
rides are safe: a held key lands on exactly one cell, a tap rides, the menu cannot open mid-ride, and a save made on a lane
cell reloads where it was with the party free to step off (Fact). The save rule held under a blocked pack (Fact). What is
not right yet: **the Gale Engine acts twice a fight**, because its own bellows gust blows it back every three actions, so the
mini-boss is one telegraphed blast and a wall of HP (Fact, sim trace); **pacing runs over** (72 to 108 minutes against 60 to
90, Fact on the repo timer); **F2's shortcut down has no way back up**, and every vane resets on arrival, so a town trip
after F2 means re-riding F1 (Fact, maps and `field/system.js`); and gold buys one tier 11 piece in town, not two (Fact). All
S except pacing (S to M). With items 1 to 3 done this is ready for Scott's and Stephen's own playthrough.

---

## 1. Ranked findings

### 1. MAJOR: the Gale Engine is blown back by its own gust and acts twice a fight. (S)
- Where: `src/data/ep6/gale.js` lines 10 to 11 and 216 (every grounded foe, the Engine included, is blown back by a Gust
  unless Braced) and `gustEvery` (line 208: the Gust every 3 actions in this fight, Fact from the trace's `every: 3`);
  `src/data/ep6/ai.js`.
- Seen (Fact, `simulate.mjs --trace gale_engine` seeds 1 to 3): 8 to 9 rounds, 6 to 7 Gusts, the Engine (`e0`) acts **2
  times** in each fight (one Fan Blade or Piston, one wind-up of Full Blast) while Mira acts 6 to 8 times. Every Gust pushes
  the Engine 44 ticks, the largest push on the field, because it is grounded and slow.
- Balance (Fact, `sim_bosses.mjs`, 60 fights a row): careful wins 100% at Lv 26, 27 and 28 with 13 to 15% HP lost; attack-only
  wins 0% in about 4 rounds; reckless 43 to 70%. The fight is all-or-nothing on one Full Blast: brace or Anchor and it is
  free, forget and the party falls. Matches the integrate note "the Gale Engine rarely acts" (Reported).
- Why: the mini-boss is the Gale's exam; a foe that owns the wind should not be its main victim.
- Smallest fix: the Engine (or any unit whose skill set the bellows) is Braced against its own Gusts; then re-run the sim and
  lower Full Blast or the Engine's damage until attack-only is 20 to 40% and careful stays at or above 85% with 7 to 9 rounds.

### 2. MAJOR: F2's shortcut lift goes down to F1 with no lift back up. (S)
- Where: `src/data/maps/ep6_obs_f2.js` line 138 (`lift_f2_short` to F1's alcove, `if: obs_f2_done`); `ep6_obs_f1.js`: the
  only way up is `lift_up` at (21,1) on the upper deck (Fact). `src/data/ep6/field/system.js` line 18: "turned groups reset
  to the authored lanes on every arrival" (Fact).
- Seen: after F2 a player who goes down to buy the tier 12 gear the Workshop now sells (`ifFlag: obs_f2_done`, Fact,
  `shops.js`) must ride F1 back to its upper deck from the authored state (the bot's F1 route is 10 decisions, Reported) and
  walk F2 from its stair foot to the Bellows Hall.
- Why: the plan's shortcut table (5.4) exists so the town is one step away; today it is one step down and a floor back up.
- Smallest fix: a lift in F1's Recovery Alcove up to F2's Bellows Hall (25,15) with `if: obs_f2_done`, drawn as the brass
  cage beside the font. One event, no new art.

### 3. MAJOR: pacing is over the target. (S to M)
- Timer (Fact, `timer_2026-11-10.txt`): Episode 5 save 72 to 102 minutes (phone and desktop), quick start 76 to 108. Parts:
  dialogue 17 to 18 min (229 to 238 pages); field x1.5 to 2.0, 24 to 34 min; lane puzzles 15.5 to 31 min (31 decisions at 0.5
  to 1 min); battles 16 to 24 min (18 to 20 fights).
- Where the extra is (Fact, bot notes): 31 lane decisions, of which six are repeats a person would not stop to think about:
  "ride back onto the post" twice, and on F2 "the fan duct east again" and "the shaft again" after the duct loop sends the
  party home. Longest dialogue runs: F3 3.5 min (50 pages), F2 2.1 to 2.4, the Eyrie 2.1. Longest fights: the Scribe 1.9 to
  3.1 min, the Engine 1.3 to 1.7.
- Boxes per scene (Fact, my count of `say` and `narrate` calls in `src/data/ep6/story.js`): `cloud_library` 19 (a choice
  alternative counted twice, so 18 shown: at its budget), `scribe_after` 16 of 18, `vex_falls` 15 of 16, `fifth_voice` 11 of
  14, `vex_relay` 12 of 12. No main scene over its box budget (Inference from the count).
- Fix: rebuild F2's duct loop so one pass reaches the shaft (or the duct home lands next to the fan), count "back onto the
  post" as part of the ride that needs it, and take plan 14's Cut 1 (Piri's Dead Letters, the F1 Shove crate) if the re-timed
  top is still over 95. Re-run `story_time.py`.

### 4. MINOR: gold buys one tier 11 piece in town, not two. (S, data)
- Seen (Fact): arrival at Zephyr Landing with 3,818 G (Episode 5 save, desktop), 4,769 G (quick start, phone); battle gold
  only, the sim's `economy6` arrives at F1 with 4,600 (Fact, `sim_bosses.mjs`). Prices (Fact, `src/data/ep6/items.js`): tier 11
  bodies 6,000 and 6,100, helms 3,000, boots 2,600, mantle 2,500, charms 2,200. The bot bought a Gale Hood and two Ethers and
  two Ballast Stones and left with 759 G (Fact, s1). Tier 12 before F3: 6,900 to 8,100 each against about 8,300 to 9,700 G at
  F2's end (Reported, the bot's gold at `obs_f3`).
- Plan 7.6 says "two tier 11 pieces in town and two tier 12 pieces before F3". Today it is one and one.
- Fix: cut tier 11 prices by about 30% (body 4,200, helm 2,100) or add about 1,500 G in Airstair and F1 chests; re-run the sim's
  economy line.

### 5. MINOR: the screen never says that Defend is how you brace. (S)
- Seen (Fact): the first fight's only teaching line is Mira's "Birds that ride the wind. When it gusts, brace, or it throws us
  back." (`story.js` line 181). The battle menu says Defend, and its help reads "Halve damage this turn." (Fact,
  `h_phone-004-tap-broken.png`). "Defend to brace." appears only on the Engine's Full Blast (`scene.js` line 774). The steel
  anchor over a Defending member shows once the Gust is 2 actions away (Fact), which is feedback after the choice, not before.
- Is the Gale understood by the second fight? The marker and "The wind gusts." with the heads sliding on the timeline read
  well (Fact, `b_phone-e6a_first-gust.png`). That Defend holds you in place is learned only if the player happened to Defend
  (Inference; settle with one child playtest or a frame of fight two).
- Fix: Mira's line "When it gusts, Defend to brace, or it throws us back."; in Gale fights the Defend help adds "Braced: the
  gust does not move you."

### 6. MINOR: the Storm Scribe is met at Lv 28, not 27. (S, data)
- Seen (Fact): `scribeMargin(1)` reaches the Scribe 53 EXP under Lv 28 when every fight is fought, 712 under at 80%. Every bot
  run met it at Lv 28 (Reported); the Episode 5 save arrives at Lv 25 with 13,294 to 13,394 EXP (Reported). The bots hunt
  optional fights to each zone's plan EXP and never re-hunt reload-revived foes (Fact, `autoplay.py` `Episode6.hunt`), so the
  reading is one honest pass; elites pay more and push it over (Inference from the plan's margin note).
- Does it matter? Little (Fact, sim): careful wins 97% at Lv 27 and 93% at Lv 28, reckless 68% and 78%, attack-only 0%; 14 to 15
  rounds against the 11 to 15 band.
- Fix: trim about 150 EXP from one F3 group (or make elites pay base EXP in Episode 6), then confirm the bot meets it at 27.

### 7. MINOR: the save bell in the chart room speaks of Willowmere and a chapel door. (S)
- Where: `src/data/maps/ep6_zl_charts.js` line 63 (`text: 'save_bell'`), which is Episode 1's text in `src/data/story/ep1.js`
  line 1401. Seen (Fact, `phone-ep6-new-dialog.log` line 75): "A small bronze hand-bell by the chapel door. Ring it, and
  Willowmere will remember you were here." inside Aeris's chart room.
- Fix: an Episode 6 bell line in `src/data/ep6/text.js` and the key on the event.

### 8. MINOR: a cold phone waits on the pack chain. (M)
- Reported (E6-integrate): the phone pack-chain load is over target, the ep4 pack alone 8.4 s cold. I did not re-measure.
- Fix: per plan 14, start every pack fetch at once on a resume into Episode 6 and order only registration; measure the worst
  case on the phone profile.

### 9. MINOR: the bot never rests on the Observatory floors. (S, qa)
- Seen (Reported, every run): "font font_w1 / font_w2 / font_w3 unreachable", and the bot spends 3 to 5 Ethers on F1 alone.
  The fonts are at each floor's arrival (Fact, maps: F1 (22,25) by the alcove, F2 (8,24) by the stair foot, F3 (24,33) on the
  first landing, plus `font_w2b` in the Bellows Hall and `beacon_font` once Pippa is found), so a person rests on arrival
  (Inference: the bot's static grid makes every lane cell void, so it cannot route back across one).
- Why it matters: the bot's Ether spend and the "Mira's MP" risk (plan 14) are read from these runs.
- Fix: in `qa/autoplay.py` `Episode6`, rest at the font on arrival and at `font_w2b` before the Engine.

### 10. NIT: in a short Scribe fight the Rewrite comes once or twice. (S)
- Seen: the bot's Lv 28 wins took 11 to 13 rounds with 1 to 2 Rewrites pinned, all broken by Anchor (Reported); the sim's
  careful play sees 2.02 a fight, 79% broken by Anchor, 10% landed (Fact, Lv 28). The `--all-fights` run lost once and won
  the retry with 6 pinned and 1 landed (Reported).
- Inference: the climax's one decision may happen once; fine for a first play, thin for the episode's signature. Settle: the
  Rewrite count in five hand-played fights after items 1 and 6.
- Fix (optional): the Scribe's first Rewrite on its second turn rather than later.

---

## 2. The first five minutes (EPISODE6 section 1), from the Episode 5 save

Bot clock in game seconds (Fact: s1 at 1x from the Episode 5 save, marks `resume` 6228.7, `sky_berth` +25.4, `airstair` +25.9,
`first_fight_done` +48.8, `first_gust` +65.9; the quick start's morning scene took 11.9 s, Reported), plus about 2.5 s a box
for a first reader and x1.5 on walking (Inference). 19 boxes before the fight (Fact, the dialog log).

| Bible | Beat | Measured | Verdict |
|---|---|---|---|
| 0:00 | The bird at the shutter, four boxes | the morning plays on load: narration, then the slip | holds |
| 0:20 | The slip close-up, the burned fourth seat | "Seat 4" a black burn with a spark (Fact, `p_story_ep6_morning_slip.png`) | holds |
| 0:35 | "Four seats. There are three of us." Control | about 0:30 to 0:40 (5 boxes plus 12 s of staging) | holds |
| 0:40 to 1:40 | Saffron Haven to the water stairs | bot 25 s with 4 boxes; a reader about 0:45 to 1:00 more: berth at about 1:15 to 1:40 | holds |
| 1:40 | Night at sea, the stack, banner, control | 3 boxes and the fade: about 1:35 to 1:55 | holds |
| 2:40 | Mira's question, `Yes.` / `No.` | a few steps up: about 2:00 to 2:25 (a chest line comes first) | early, fine |
| 3:30 | Two Harriers, the Gust marker three actions out | 3.3 to 4.2 min after the morning (Fact, timer, four runs) | holds |
| 4:40 | The gust mid-fight, the Harriers act twice, win | the Gust about 10 s into the fight (Fact, filmstrip); win about 4:00 to 4:55 | holds |

Control in 20 seconds is about 30 (the close-up is worth it), a question inside 60, a choice with a cost by 3 minutes, a fight
before 5: the table holds (Fact for the order, Inference for the human seconds). The first ride comes about 20 s of game time
after the fight (Fact, s1).

---

## 3. Gust lanes: clarity without text, rides, and is it another dial

At rest on the phone, no Talk (Fact for what is on screen; Inference for what a newcomer concludes):

| Puzzle | At rest | Verdict |
|---|---|---|
| Airstair lane A (`p_field_ep6_lane_a`) | two blue streams across the gap, chevrons right and left, the chain between | Clear. Ilex's one line, then the ride does the rest |
| Airstair post B (`p_field_ep6_post_b`) | an up stream with a post on it, a chest beside, a down stream | Clear after "Grab the post. The wind lets go." (Fact, log) |
| F1 vanes (`p_field_ep6_obs_f1_vane`, `vane_pair.png`) | lanes left, a vane with its arrow, glass decks | Clear: the vane's arrow and the lanes agree; turned lanes turn gold. The Run west is 17 cells (Reported), inside one phone width of 24 |
| F2 ducts (`p_field_ep6_obs_f2_ducts`) | grates over the void, two vanes | Readable but the weakest (CRITIQUE_8 item 3); the loop home costs a second pass (item 3 above) |
| F3 ring (`p_field_ep6_obs_f3_ring`) | a ring of lanes round the centre block, posts, a vane per half | Clear: "It goes round. Pick a way and hold on." (Fact, log) |

**Does a ride surprise or strand? No, in everything I tried (Fact).** A held key rides lane A and lands on exactly (15,23)
with no extra step after the unlock, on desktop and on the phone d-pad; one tap rides it too (rp, EP6FIELD PASS 3/3). The menu
key pressed mid-ride does nothing: the field stays locked until the landing (s6 `b_mid`, `b_after`). A save made on post B
reloads on (15,12), not riding; left steps off, right steps back, up rides to the top (s6 `a_*`). A save made on a turned lane
is moved to the nearest ground on load (Fact, `field/system.js` line 116; not exercised). The one strand is not a ride: the F2
shortcut (item 2).

**Different from Episode 4's tide locks and Episode 5's sun and shade? Yes (Inference).** Tide locks were one number cycled at
a wheel; sun and shade was one hour chosen by name and the puzzle was where shadows fell. Here the puzzle is your own route:
the wind moves you, a post stops you, a vane flips one named group with a visible result. The vane is the nearest thing to a
dial, but it has two states, one press, and its effect is on screen at once (Fact, `vane_pair.png`). The risk is repetition,
not a dial: six of 31 decisions are re-rides (item 3).

---

## 4. The Gale, the Engine and the Scribe

- **The Gale by the second fight**: the marker, the pips, "The wind gusts." and the heads sliding back read (Fact). Brace means
  Defend only if you guess it (item 5).
- **Anchor found and cast, real input, a Rewrite pinned (Fact, rp)**: the root cursor opens on Tech on Bram's turn; Tech opens
  with Anchor first, gold, with its icon, under the cursor; one confirm casts it (14 MP paid); Defend on to the Gust; the
  Rewrite breaks with reason `anchor`. Desktop keys 4.2 s, phone d-pad and A 6.6 s, phone taps 11.6 s; zero automation calls.
  The box said "Bram can anchor." on Bram's own turn (Fact, `phone-001-pinned-root.png`). The set-up was the quick start at
  Lv 27 with `anchor_learned` and the Scribe started directly; the menu path is the same in the story fight (Inference).
- **The Gale Engine**: item 1.
- **The Storm Scribe**: careful 97% (Lv 27) and 93% (Lv 28), 14 to 15 rounds, 16 to 20% HP lost; reckless 68 to 78%;
  attack-only 0% (Fact, sim). Levels came from the bots' honest single pass (Reported, item 6). Bram entered with 60 MP in
  every bot run (Reported); Anchor is 14.

---

## 5. Story beats (Inference unless marked)

- **Bram's dock** lands in words: "I didn't think. I just held." and "My dad said 'come home after.' Same idea. Fewer ropes."
  (Fact, log). The catch itself is narrated with the party at the screen edge (CRITIQUE_8 item 2).
- **Vex's fall** is the best writing in the episode: the letter with the lifted name, "I was fourteen. I mended bindings for
  the people who write the lists.", Bram's "Somebody should hold on to you." (Fact, log). On screen Vex stands on the stone
  beside Bram while the box says he hangs over nothing (Fact, `s8_02.png`). Fix the staging, keep every line.
- **Pippa's name** lands: the apprentice's "I kept saying my name to stay awake. Then I couldn't find it.", Liora's letter
  under the lamp, Mira: "Pippa. Pippa Voss." (Fact, log). The three pledges lighting the lamps on the way up earn it.
- **The slip and the crew list** set the question in the first minute and pay it in the Eyrie ("The fleet's last crew list,
  with its twelfth line back: Pippa Voss.", Fact).

---

## 6. Saves and sound

- **The save rule held every way I tried (Fact, s6, s6b).** Slot 0 an Episode 5 finish, slot 1 an Episode 6 save in F2 made by
  the real menu. A plain Continue by keys, a walk and the menu: all four slots byte-identical. Reloaded with all 203 `ep6`
  requests blocked: the title lists no Episode 6 row; Continue on slot 1 lands in Emberpeak; I walked, talked, opened and closed
  the menu; all four slots byte-identical afterwards; unblocked, Continue put the party back in F2 at (6,26). In s6, slot 1
  (the run's own slot) changed after the post save while I rode on and warped; slot 0 never did (Fact; Inference: the run's own
  autosave, which the rule allows).
- **The quick start** wrote only its own slot at the morning, F1, F2, the credits and the end (Reported, both quick-start runs).
- **Sound**: zero "unknown ... id" warnings in all five bot runs (Reported). My sessions logged only a headless AudioContext
  device error (Fact; Inference: the headless browser, not the game). Not checked by ear.

---

## 7. Ten to protect

1. Anchor's menu path: Tech first on Bram's pinned turn, Anchor first and gold with its icon, one confirm or one tap.
2. The ride rules: one landing for a held key, the menu locked mid-ride, a lane-cell save that reloads safe.
3. The save rule: the blocked-pack landing that writes nothing, and the quick start's own slot.
4. The first five minutes: the slip, the four seats, a question by 2:30, a fight before 5.
5. The first fight as the Gale's lesson: the Gust three actions out, two Aloft Harriers, the steel anchor over a braced member.
6. Lanes that teach themselves: Ilex's one line, then the ride; Mira's "Grab the post."; "It goes round."
7. Vanes with two states and a visible result, never a cycle.
8. Vex's letter scene lines and Bram's "Somebody should hold on to you." Do not trim them in item 3's pass.
9. Pippa's name under the lamp, and the three pledges that light the stair to it.
10. The difficulty shape of the Scribe: careful 93 to 97%, reckless loses about one in four, Anchor the answer.

---

## 8. Top 10 to fix

| # | Fix | Where | Size |
|---|---|---|---|
| 1 | The Engine Braced against its own Gusts; re-tune its damage so attack-only wins 20 to 40%, careful 85% or more | `src/data/ep6/gale.js`, `src/data/ep6/ai.js`, `tools/sim/ep6.mjs` targets | S |
| 2 | A lift from F1's alcove up to F2's Bellows Hall once `obs_f2_done` | `src/data/maps/ep6_obs_f1.js` | S |
| 3 | One pass through F2's duct loop; re-time; Cut 1 if still over 95 minutes | `src/data/maps/ep6_obs_f2.js`, `qa/integrate/story_time.py` run | S to M |
| 4 | Tier 11 prices down about 30% (or about 1,500 G more in chests) | `src/data/ep6/items.js` (or the Airstair and F1 chests) | S |
| 5 | Say Defend braces: Mira's first-fight line and the Defend help in Gale fights | `src/data/ep6/story.js` line 181, `src/data/ep6/scene.js` | S |
| 6 | About 150 EXP off one F3 group so the Scribe is met at 27 | `src/data/ep6/encounters.js`, then `simulate.mjs --check` | S |
| 7 | An Episode 6 line for the chart-room bell | `src/data/maps/ep6_zl_charts.js` line 63, `src/data/ep6/text.js` | S |
| 8 | Fetch every pack at once on a resume into Episode 6; measure the cold phone | `src/game/packs.js` (hot file, say so first) | M |
| 9 | The bot rests at each floor's font and at `font_w2b` | `qa/autoplay.py` `Episode6` | S |
| 10 | (Optional) the Scribe's first Rewrite on its second turn | `src/data/ep6/ai.js` | S |

**Verdict.** Episode 6 fixes the thing that sank Episode 5 for a human: the signature skill is in the menu, under the cursor,
and it works by key and by finger. The new field rule is the clearest yet and never strands you mid-ride, and the save rule
holds under a broken network. The work left is tuning, not rescue: a mini-boss that is pushed around by its own wind, a
shortcut that only goes one way, about fifteen minutes of pacing, and gold that does not match the shop. Fix items 1 to 3
(all S, a day together), then hand it to Scott and Stephen.
