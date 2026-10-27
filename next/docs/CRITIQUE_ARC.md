# CRITIQUE ARC: the responsibility arc, played

Read-only play review by H6-critic, Tuesday 2026-10-27 before dawn (Eastern), branch `overhaul`, `X1_LIVE = true` and `CAVE_LIVE = false`
on disk. The library trapdoor and every `cave_*` file were ignored. The brief is `docs/briefs/H6-critic.md`.

Method (Fact): I ran headless Chromium on the phone profile (844x390 at 3x, touch layout shown) and then on desktop (1920x1080), using the
real game with `?debug=1`. A "new player" layer on `qa/autoplay.py` kept the default settings (text speed 2, manual battle, 1x), walked
instead of running, paused on every page to read it (3.5 words a second, at least 0.75 s), took 2 s on every choice and 1.25 s on every
battle command, and let title cards play out. Time is counted in logic frames, so it is game time at 1x.

What I played: New Game to Mael and Hazel's farewell, twice. The bell tower with a player who hesitates. A pre-H1 credits save. The
Ledger and the Aim at three points. All five vows, each taken at the Pilgrim's Rest and broken on purpose; No fleeing and No Fury kept
through Archive F1. Six Name Truth pairs, both answers each: Oren, Mael and Hazel in the real opening (phone gave the lie, desktop the
truth), and Garrick, Quill and the Archive door from LQ_DEBUG states. Two floor endings, two boss intros, and the door's memory after a
won Archivore. Every shot and log is in `qa/arc/out/`, phone first: the phone file is `phone-arc-*`, its desktop twin `desktop-arc-*`.

Tags: **Fact** means I saw it in a shot, a run log or a source line. **Reported** means it comes from another log. **Inference** means
my judgment.

## Verdict

**Five minutes (Fact for the clock, Inference for the feel):** a Lufia or Chrono Trigger player keeps going. Control comes at 0:06, the
thirteenth toll at 0:47, the first choice with a cost at 2:09 and the first fight at 2:39. Oren's sign and the Archive door are the
best-written beats in the build.

**One hour (Inference):** probably, but the arc's long pull is weakest exactly where it should hold. The Ledger reads like a flag log,
it lists Episode 2 strangers from minute five, and it keeps Oren's name for hitting a slime. Every true answer pays an item and no lie
does, so by the third choice the truth looks like the right answer to a quiz.

**Fix first (Fact):** one blocker. Old saves, and the "Episode 2: new party" start, replay the H1 yard slime. Then the Aim line, which
says "Get out of bed" on the night tower.

## Ranked issues

B = blocker, M = major, P = polish. "Known" marks a gap PLAN.md Wave H already lists, ranked here and not re-reported.

| # | Where (device) | What I saw (Fact) | Why it matters (Inference) | Smallest fix (Inference) | Owner | Cost |
|---|---|---|---|---|---|---|
| 1 B | Willowmere lane, old saves and the Episode 2 entry (phone, desktop) | I continued the pre-H1 save `qa/saves/fixtures/x1_ep1_credits_phone.json` at Lv 10 and walked to the well: the yard slime dropped and Oren gave his tutorial line (`phone-arc-oldsave-oldsave-slime-narration.png`, `-oldsave-oren.png`, desktop twins); the bot's Episode 2 New Game hit the same at Lv 9 (Reported, `qa/out/autoplay/desktop-ep2-new-dialog.log` line 2344). | Every existing player, and every Episode 2 start, meets a first-fight tutorial after the story has moved past it. | Add `yard_fight_done` and `cold_open_done` to `EP1_DONE_FLAGS` and give `yard_slime` `ifNot: 'met_mael'`. | H1 | minutes |
| 2 M | Bell tower (phone, desktop) | If the player stands still for 10 s, or opens and closes the menu, the Aim line reads "Get out of bed"; the full menu, with Save and Quit, opens on the stair, and its Journal reads "Morning in Willowmere. Someone is calling your name." (`phone-arc-tower-tower-aim-still.png`, `-tower-journal.png`, `desktop-arc-tower-tower-aim-still.png`). | The cold open is a held breath at night, and any player who pauses or reaches for Menu breaks it. | Make `aimDrawable()` false on `bell_tower` and ignore the menu button there. | H2 Aim, H1 menu | minutes |
| 3 M | Ledger detail (phone, desktop) | The kept lines are flag notes: Oren "The yard slime in the bakery lane is beaten.", Bram "The Archive door accepted the party.", Mira and Iris both "The Archivore is beaten; names return, signs restored.", Barnaby "Woke up after the credits." (`phone-arc-open-open-16d-ledger-oren.png`, `phone-arc-ledgerC-C-ledger-mira.png`). | This is the game's long-term reward screen, and it reads like a debug log; Holt's and Mael's written lines show the voice it should have. | Write a `why` for each of the 19 Episode 1 rows in that voice. | H2 | hour |
| 4 M | Ledger count and title (phone, desktop) | After Mael it says 1 of 37 and lists Corin, Nico, Sava, Lena, Tovin, Orla, Anwen, Elian, Wren, Fitch and Vessa under "The Nameless Hollow"; after the Episode 1 credits the title reads "Names kept: 10 of 37" (`phone-arc-open-open-16c-ledger.png`, `phone-arc-ledgerC-C-title.png`, `phone-arc-ledger.json`). | A finished episode reads as 27 failures, and a page of unmet names is noise and spoiler, not a pull. | Show a place group, and count its rows, only once its region is reached (`crossing_done` for the Hollow, the open gate for the Wider Valley). | H2 | hour |
| 5 M | Ledger, Oren | Oren's name is kept by `yard_fight_done`; `oren_truth` and `oren_lie` do nothing to the Ledger (`src/data/ledger.js`). | The first choice is about saying a name, but the Ledger rewards the punch instead of the word, so the theme flips at minute two. | Keep Oren on `saw_fading_sign`, with a `why` that differs by his answer. | H2, H4 | minutes |
| 6 M | Name Truth rewards, both episodes | All 12 truths give a consumable and none of the 12 lies does (Hazel's tent, Garrick's herbs, Quill's drops, the door's potion, Anwen's Phoenix Feather); Mael says "Take these. I collect honest answers." (`src/data/story/ep2.js` line 85, `phone-arc-truth.json`). | The player learns that truth means loot, and that turns each choice into the quiz the arc rules out (3.4). | Keep the gift only where the fiction hands something over, about half the truths, and cut Mael's ethers and that sentence. | H4 | hour |
| 7 M | Mael at the well (phone, desktop) | The player has just climbed the tower through all thirteen tolls; Mael asks "Did you sleep through the bell again?" and "...Maybe." is stored as `mael_truth` (`phone-arc-open-open-12-mael-first.png`, `desktop-arc-open-open-12b-mael-reply.png`). | Neither answer is true to what the player just played, and Episode 2 then pays for a coin flip. | Make the ask about the night ("Did you sleep at all?" / "Not much." / "Like a stone."). | H1, H4 | minutes |
| 8 M | Battle under a vow, Auto (phone) | With No healing items carried, Auto drank a potion at low HP and ended the vow; there was no warning (`phone-arc-vows-v-auto-noheal-toast.png`). Known. | A chosen weight that a convenience setting breaks quietly feels unfair. | While a vow is active, Auto skips the actions that vow forbids. | H3 | hour |
| 9 M | First vow offer, Pilgrim's Rest (phone, desktop) | The window is "Take a vow?" over five names; the confirm box gives the rule but never says that keeping it pays (`phone-arc-vows-v1-offer.png`, `-v-confirm-noflee.png`). | A new player has no reason to pick one, so the row becomes one more press past "No vow". | Show one Bram box before the first offer only, saying that a vow kept to the next fire pays. | H3 | minutes |
| 10 M | The thirteenth toll | `bell_first` and `bell_toll` play on the same frame (`phone-arc-tower.json`); in the manifest `bell_first` sits in the ep3 pack with `bell_toll` as its fallback. Known. | The game's central question is a sound, so the thirteenth bell has to be a different bell. | Move `bell_first` into the core sfx set, or use a short core alarm bell. | H1 | hour |
| 11 M | Tower, first frame (phone, desktop) | At control the banner "The Bell Tower / Willowmere" and the caption "Willowmere. Last night." show together, and the caption box sits on the hero (`phone-arc-open-open-03-tower-control.png`). | The first image of the game is two labels saying the same word, which takes the weight off the line. | Skip the location banner on `bell_tower` and draw the caption above the hero. | H1 | minutes |
| 12 P | Kept vow box (phone, desktop) | The reward is the line "Arden: sword mastery +4."; the same stretch of fights gave +17 on their own (`phone-arc-vows-v7-kept.png`, `phone-arc-vows.json`). | The point that the harder road pays is invisible. | Show the weapon's mastery bar filling in the kept box. | H3 | hour |
| 13 P | Mael's intro (phone, desktop) | It runs 84 s from his first line to `met_mael`, 15 boxes, and retells the thirteen bells after Hazel already has (`phone-arc-open-open-13-mael-saying.png`). | This is the longest hands-off stretch of the first five minutes, and it tells what the cold open showed. | Cut the "rang thirteen times" box and the "old saying" box to one box. | H1 | minutes |
| 14 P | Aim, Archive F3 | The step `stacks` keeps the aim "Find the key to the great door" until `boss_door_open`, although Talk already has a `stacks_key_found` branch (`src/data/quests.js`). | Once the key is in the bag, the Aim is wrong. | Show "Open the great door" when `stacks_key_found` is set. | H2 | minutes |
| 15 P | Walk the road vow | At the Pilgrim's Rest, before the Lantern exists, it reads "Carry the lamp at a walk." and Bram says "The lamp's still lit." (`phone-arc-vows-v-confirm-walk.png`, `-v-broken-walk.png`). | The vow names an object the player does not have. | Change the line to "Walk every step until you rest." and drop the lamp from Bram's line. | H3 | minutes |
| 16 P | Vow toast in battle (phone, desktop) | For about 1.5 s the toast covers the help line and the first timeline slots (`phone-arc-vows-v-break-noflee-toast.png`). Known. | It hides the next actor while it shows. | Draw the toast in the log window during battle. | H3 | minutes |
| 17 P | Name Truth asks | Several asks name the answer: Hazel "Don't say no to please me. I'll know.", Elian "Tell me the true thing.", Lena "Say you would get used to it." (`phone-arc-open-open-17-hazel-ask.png`). | When the prompt points at the truth, the lie has no pull. | Cut the second sentence of Hazel's and Elian's asks. | H4 | minutes |
| 18 P | Boss cards | Three of the four cards end in "Nobody ...", and so does Mira's last box before the Briar Alpha (`phone-arc-truth-boss-warden-card.png`). | By the third, the formula reads as the moral; the Archivore's card is the strongest because it breaks the pattern. | Rephrase two of them so they do not start "Nobody". | H4 | minutes |
| 19 P | F1 ending | After the toll the scene says "The thirteenth bell is down there.", then the back-stair note, then "it's the short way.", then the page turning (`phone-arc-truth-floor-f1-end.png`). | Rule 3.5 asks for one question, and the chore line flattens it. | Drop Bram's shortcut line. | H4 | minutes |
| 20 P | After the Archivore | Two equip prompts ("Echo Shroud", "Ink Crown") come between the win and "The Archivore shudders." (`phone-arc-truth.json`). | The boss's best beat, Moth, arrives after two shop questions. | Defer equip prompts until the scene ends. | H4 | hour |
| 21 P | Yard slime battle (phone, desktop) | The fight in the bakery lane uses the valley backdrop, with its river and stone bridge (`desktop-arc-open-battle-cmd1.png`, `phone-arc-oldsave-battle-cmd1.png`). | The first fight happens somewhere the player is not. | Use the Willowmere stage for this encounter. | H1 | minutes |
| 22 P | Ledger, the hero's row | The glove opens on the player's own name, faded, and its detail reads only "..." (`phone-arc-open-open-16c-ledger.png`). | The best hook in the Ledger looks like a missing string. | Replace the dots with one line, for example "Not yet kept.". | H2 | minutes |
| 23 P | Belfry | The map has two bell props, while Mael says the tower "holds twelve bells" (`phone-arc-open-open-03d-thirteenth-pan.png`). | The count is the mystery, and the art contradicts it. | Draw a row of twelve small bells. | H1 | hour |
| 24 P | Wake-up | The hero stands upright over the bed through "zzz" and "Up, up." (`phone-arc-open-open-05-hazel-wake.png`). | The wake gag does not read. | Use a lying frame or a blanket overlay until the jump. | H1 | hour |
| 25 P | Aim with a vow | The Aim carries no vow suffix. Known. | The arc (3.3) promised the aim and the promise together. | Append " - Vow: name" while a vow is active. | H2, H3 | minutes |

## Five things that work and must not be touched

1. **The Archive door pair.** "It didn't hear me." against "Old door.", and the memory under the golden page ("You said it plain, at the
   door." or "...It wasn't the door."). Fact: both land in one box each (`phone-arc-truth-boss-archivore-truth-memory.png`, `-lie-memory.png`).
2. **The climb's rhythm.** The names come as spaced capitals with no press needed, control at 0:06, the thirteenth at 0:47, one card.
   The H1 caption note is resolved. Fact: the line now fades out by field frame 246 and is gone before the first toll.
3. **Oren's sign and both of its memories.** "You said my name like it was nothing. It wasn't nothing." and "You said you'd forgotten
   too. You hadn't. I could tell." (`phone-arc-truth-oren-mem-truth-memory.png`).
4. **The vow window's grammar.** "No vow" comes first and selected, the line and the rule share one box, and the broken lines are short,
   in voice and carry no penalty (`phone-arc-vows-v-broken-noflee.png`, `-v-broken-mira.png`).
5. **The Aim line's behavior, and the yard slime's length.** The aim was right at all three points ("Find Mira at the library", "Find
   the stairs down", "See Mael, then the east ford") and gone within 5 s. The slime takes 3 commands and 13.6 s. Fact. It is a taste,
   not a chore. Inference.

## Timings: the first five minutes (game time from New Game; phone, desktop)

| Beat | Phone | Desktop |
|---|---|---|
| Name entered (typed in 3 s; a thumb on the grid takes longer) | 0:03.4 | 0:03.1 |
| Control on the stair | 0:06.1 | 0:05.4 |
| First toll (HAZEL) | 0:09.9 | 0:08.9 |
| Twelfth toll (BRAM) | 0:44.5 | 0:43.5 |
| Thirteenth step | 0:47.0 | 0:45.9 |
| Card: "In Aethelgard, every name is a promise." | 0:51.0 | 0:49.9 |
| Home fades in | 0:55.6 | 0:54.4 |
| Hazel's first line | 1:01.8 | 1:00.6 |
| Wake choice shown | 1:18.5 | 1:17.2 |
| Free to move at home | 1:42.4 | 1:40.8 |
| The bakery sign fades | 1:52.0 | 1:49.7 |
| Oren's choice shown | 2:09.0 | 2:06.4 |
| Free in Willowmere | 2:25.8 | 2:22.1 |
| The slime drops | 2:31.6 | 2:27.4 |
| Battle starts / ends | 2:38.7 / 2:52.3 | 2:34.3 / 2:50.4 |
| Mael's first line | 3:06.3 | 3:04.1 |
| Mael done (`met_mael`) | 4:30.4 | 4:25.7 |

Against the arc's rule (Fact): control in 20 s (got 6), a question in 60 (47), a choice with a cost in 3 minutes (2:09), a fight by 5
(2:39), all met. The two long hands-off stretches are the wake-up, 47 s from the fade-in to control, and Mael, 84 s. No page I saw ran
over three lines. The smallest glyph cap on the phone is 7 internal px, which is 11.7 css px, and nothing overlapped the side-bar touch
controls (Fact).

## Not tested

Sound by ear: headless, so I logged the audio calls only. Real finger gestures: I injected actions, with the touch layout shown. The
tablet layout. Tess's choice and the five Episode 2 choices, which I read in script and did not play. Mael's Episode 2 memory scene
(my rig opened the morning instead; read in `ep2.js`). The Hollow and the Briar Alpha, read only. Hard Road, which is a proposal. Auto
never spent a Fury art in three fights at full gauge, so I could not break No Fury that way (Fact); it then paid as kept.

## Fixed (H6-fixes, Tuesday 2026-10-27, Eastern)

Items 2 to 25 in rank order (item 1 was the orchestrator's). The five things that work were left as they were. Previews and
logs: `qa/arc/fixes_out/` (the critic's rigs, copied and retargeted to the fixed text, phone first).

| # | Done | What changed | Test touched |
|---|---|---|---|
| 2 | yes | `field.js` `coldOpen`: on `bell_tower` before `cold_open_done` the Aim line never draws or counts, and Menu does nothing | `h3_vows` (ui) unchanged; rig `arc_tower.py` |
| 3 | yes | `ledger.js`: every Episode 1, expansion and Episode 2 row has its own `why`, verb first, in Holt's and Mael's voice | `h2_ledger` (new test) |
| 4 | yes | `REACHED`: a place shows and counts once reached (valley `left_town`, Wider Valley `first_fight_done`, Hollow `crossing_done`, Emberpeak `ep3_started`) | `h2_ledger` |
| 5 | yes | Oren kept on `saw_fading_sign`; his line differs by `oren_truth` / `oren_lie` | `h2_ledger` |
| 6 | yes | gifts only where the fiction hands one over: six truths (Hazel, Garrick, Tess, the door, Anwen, Lena), two kind lies (Quill's drops, Corin's rations), none for Oren, Mael, Elian, Nico; Mael's ethers and "I collect honest answers" cut | `h4_truth` (rewritten) |
| 7 | yes | "Did you sleep at all?" / "Not much." (truth, now first) / "Like a stone."; the Episode 2 memory follows | `h4_truth` |
| 8 | yes | `autoAction`: Auto never takes what the vow forbids (`vowForbids`), else Defend | `h3_vows` (battle, new test) |
| 9 | yes | one box before the first offer per save (Bram, or the narrator) | `h3_vows`, `h3_vows_headless.py` |
| 10 | yes | `bell_thirteenth`, a core sfx of its own (moving `bell_first` would add 262 KB; 44.6 KB was free) | `h1_opening`, `story`, `_harness` |
| 11 | yes | no location banner on the tower; the opening line moved up into the dark shaft (`LINE_Y` 74) | rig |
| 12 | yes | the member's card beside the kept box, the mastery bar filling, the points just paid lit | `h3_vows` (reward shape) |
| 13 | yes | Mael's two bell boxes are one | `h4_truth` |
| 14 | yes | step `aimIf`: "Open the great door" once `stacks_key_found` | rig `fix_aim.py` |
| 15 | yes | "Walk every step until you rest."; Bram: "You ran. Legs are for that. The vow's done." | `h3_vows` |
| 16 | yes | in battle the ended line goes to the battle log, not a toast | `h3_vows` |
| 17 | yes | Hazel: "Are you frightened?"; Elian: "Does it do that everywhere you sign?" | none |
| 18 | yes | Warden "Its relief never came."; Other Selves "The town turned from the water." | `h4_truth` |
| 19 | yes | Bram's shortcut line cut | `h4_truth` |
| 20 | yes | a scene's battle offers its gear after the scene (`pendingDrops`) | rig `arc_truth.py` |
| 21 | yes | encounter `stage: 'willowmere'`: the town's key art (`title`), darkened a little | rig `fix_stage.py` |
| 22 | yes | the hero's row reads "Not yet kept." | `h2_ledger_headless.py` |
| 23 | yes | twelve small bells (`prop_ferry_bell`), three by two on each belfry wall | `h1_opening` (map validates) |
| 24 | yes | the hero lies in bed under the blanket until the jump (the bed's own sprite over the hero) | shot `story_wake` |
| 25 | yes | " - Vow: name" after the aim while a vow is active | `h3_vows` (ui) |

Open for Scott: the yard fight's stage is the town at dusk (the only Willowmere art), in the morning.
