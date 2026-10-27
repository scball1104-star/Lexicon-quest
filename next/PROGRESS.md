# Lexicon Quest NEXT: progress log for Scott

Play the new build (when the first playable milestone is up): https://scball1104-star.github.io/Lexicon-quest/next/
The original game stays at https://scball1104-star.github.io/Lexicon-quest/ until you say to swap.

## 2026-10-17 (Sat)
- Audited the live build. It plays like a web page with a game inside it (header, cards, side panels, buttons),
  and battles are HTML cards. That is the ceiling on "professional".
- Started NEXT: a ground-up rebuild as a real full-screen pixel game (384x216, SNES-style), built on the strong
  painted art already in the repo plus new tiles, sprites, UI, sound and music. Episode 1 first.
- Design bible written (`next/DESIGN.md`): what we take from Lufia II, Chrono Trigger, Final Fantasy, Diablo II,
  Dragon Quest and Secret of Mana, and how each shows up in the game.
- Wave 1 launched: 7 parallel agents (engine, tiles, sprites, UI art, sound effects, story/content, battle rules).
- Music: Suno cannot be driven from the app's built-in browser (Cloudflare's human check fails there even
  when you tick it), so a composer agent is writing the missing tracks in code, SNES tracker style, with a shared
  four-note "name" motif. The existing Suno tracks (title, town, battle, boss, valley) stay in use. If you get a
  minute with Suno on your phone, `next/docs/SUNO_PROMPTS.md` has drop-in prompts and filenames.

### Evening: Wave 1 complete (all eight foundations in)
- Engine: one crisp pixel canvas at 384x216, keyboard, gamepad and touch (d-pad and A/B buttons on phones,
  portrait and landscape), fades and transitions, saves, bitmap fonts. 60 fps on every size tested.
- Art: a master palette; tile sets for the town, valley cliffs, Archive dungeon and interiors (previews look like
  a real SNES town); party, townsfolk, animal, prop, enemy, boss and portrait sprites; Final Fantasy style
  windows, icons, battle gauges, a proper "Lexicon Quest" logo.
- Sound: 81 effects, 9 jingles (item, level up, inn, save, victory fanfare), 3 ambience loops, and four new
  music tracks sharing one motif. The Suno tracks you already had stay in use.
- Story: Episode 1 fully scripted (35 scenes, 29 named townsfolk with their own voices, 4 side quests, a
  bestiary, books, credits). Companions tell you where to go next from the menu, so no quest arrows.
- Combat: the whole rule set is built and balance-tested over 25,000 simulated fights: timeline turns,
  weaknesses and Break, Fury, combo techs, weapon mastery, elite enemies, Diablo-style loot, a three-phase
  Archivore. Ordinary fights 3 to 5 rounds; the boss punishes ignoring its warnings.
- Wave 2 started: menus and dialogue, the battle screen, the field (walking, NPCs, puzzles, cutscenes) and the
  maps themselves. Nothing is playable end to end yet; that is Wave 3.

### Night: Wave 2 complete
- Menus, dialogue, shops, inn, name entry, title, save/load, config, game over and credits are built in the
  Final Fantasy style (every screen checked on desktop and phone).
- The battle screen is in: transition swirl, enemies left and party right over the painted backdrops, timeline,
  weakness and Break icons, telegraph warnings, damage numbers, victory and level-up windows.
- The field is in: walking with the party following you, townsfolk with routines, visible enemies that move
  only when you move in dungeons, chests, doors, switches, push blocks, pits, the Lantern of Recall reveal,
  lighting in the Archive, rain in the valley, and a cutscene runner that plays the written scenes.
- All 13 Episode 1 maps are authored and validated (every chest and story point reachable, puzzles gated).
- Wave 3 started: one integrator wires it all into a single playable Episode 1 and plays it end to end with a
  bot before anything goes live. A separate critic reviewed every screenshot for the polish backlog.

## 2026-10-18 (Sun), after midnight: first playable build published
**Play it:** https://scball1104-star.github.io/Lexicon-quest/next/ (phone or PC; on a phone, landscape is best).
- Episode 1 is playable from New Game to the credits: Willowmere, the valley, the three Archive floors, the Echo
  Warden, the Lantern of Recall puzzles, the Archivore, the return home and the ending hook. A bot played the whole
  thing on desktop and phone with no errors (about 35 in-game minutes at bot speed; a person will take 60 to 90).
- Saves, menus, shops, the inn, side quests (Tess's letters, Oren's starter, Wick's name-tag, Nella's bell) all work.
- Known rough edges going into the polish week: the Archive's third floor is a notch hard on Auto; night still
  reads like evening; pits need a visible rim; the Whisperwood secret has no hint; nothing is affordable at the
  smithy before the Archive; a game-over retry puts you at the floor entrance.
- Next: polish passes from the critic's ranked list (painted backdrops matched to the pixel palette, a proper
  battle stage with shadows, better timeline icons, Archive depth, lighting, hit effects, touch sizing).

### Sunday small hours: first polish round done (Wave 4)
- The painted backdrops (title, battles) now sit at the same pixel density as the tiles, so scenes read as one
  piece of pixel art instead of a photo behind sprites.
- Battles have a real stage: shadows under everyone, one ground line, a dark band for the windows, chibi head
  icons on the turn timeline, a clean slice transition in, thicker slashes with impact stars and a hit pause.
  The Auto brain heals earlier in big fights and revives first.
- Enemies were cleaned up (speckle removed, outlines added). The Archive has depth now (flat dark void, two-tone
  walls, pillars), pits have rims, the plaza is calmer, carpets look like cloth.
- Night is night: deeper indigo, lamps and windows lit, fireflies; leaves, smoke, birds and ink drips bring the
  field to life. Dungeon light pools are dithered and warm.
- A game-over retry now returns you to the last bell, stairs or landmark instead of the floor entrance; the
  Whisperwood secret has a hint; the smithy sells an affordable hood before the Archive.
- Published to /next at 01:14 (verified live: no errors on desktop or phone).

### Sunday early morning: second polish round (Wave 5), from two reviews
- A game designer reviewed pacing, clarity and difficulty; an art director reviewed every screen again.
- Pacing: the first fight now happens within five minutes of leaving town (a wolf pack cuts the road; Bram and
  Mira each give one tip, no tutorial boxes). Side quests open after the party is together, so the town does not
  front-load four errands.
- Clarity: the party now says where the Archive key is and which door it fits; the three-crystal door has a
  plaque; the Lantern tells you its button; Quill hints at the Whisperwood secret.
- Fairness: a healing font and save before the Echo Warden, a campfire scene at the Pilgrim's Rest, a back-stair
  shortcut after floor one, a fairer enemy mix on floor three, and the game now asks "Equip the Iron Pike on
  Bram?" when you find better gear. The test bot used to die one to three times on floor three because it never
  equipped anything; it now clears the whole episode with zero game overs, Lv 8 at the boss.
- Spectacle: boss intros (camera, silence, title card, shake) for the Echo Warden and the Archivore; the
  legendary sword is revealed in a staged scene with a golden beam; battles in the valley now happen on a
  daytime meadow stage built from the game's own art instead of the dusk town painting; dark enemies have rim
  light; ink pools ripple; the push block looks like a carved stone block; the valley terrain is organic.
- Phones: battle commands and targets work by tap, with Auto and speed buttons.
- Published to /next at 03:31 (verified live: no errors on desktop or phone).

## 2026-10-19 (Mon) evening: fixes from your playtest
- Bridges no longer flash. The map's water/ink animation repainted bare terrain over anything sitting on it in
  two of its three frames, so bridges and the faint ink traces blinked. Every frame is now painted in full.
- The leftmost enemy's shield and weakness icons now sit above the command window on phones (the phone command
  window is taller than the desktop one, and the icons were drawn under it).
- Weapon swap: it worked for Mira and Bram, but the hero starts with only a sword, so his Swap was greyed out and
  looked broken. Swap now appears only for someone carrying a second weapon (the hero gets one from Garrick, the
  smithy, or the valley cliff chest). On phones, the little arrows under a long list are now tappable, so Swap
  and Flee at the bottom of the command list are reachable without knowing to drag.
- Your question about seeing equipment boosts: Menu > Status now shows a green "+N" next to every stat for what
  your gear adds (red if an item lowers it). Menu > Equip still compares items with green/red arrows.
- Pace change at your request: one agent at a time from here, check-ins every 6 hours, so the scheduled loops and
  the teams' schedule generators keep their usage. Unfinished work from the four agents the limit cut off is
  parked on branch `wip/w5b-w6-partial` (a loading screen and installable app, enemy animation frames, a secret
  Whisperwood dungeon, and the last UI items) and will be finished one piece at a time.

## 2026-10-20 (Tue) overnight: the parked menu fixes are finished and live
- Title, prologue, name entry and credits now sit at the same pixel density as the rest of the game.
- Text never crowds a window edge; the journal and bestiary scroll instead of overflowing; the pointing glove is
  no longer clipped in the shop and journal; the RUN and MENU buttons are bigger on phones; button hints use the
  same glyphs everywhere; the Victory window fits its contents; Fury READY sits beside its gauge.
- Still parked (one at a time, as usage allows): loading screen and installable app, enemy animation frames, the
  Whisperwood Hollow secret dungeon.

## 2026-10-20 (Tue) morning: secret dungeon, battle animation, phone fixes (pace back up)
- Whisperwood Hollow: an optional dungeon off the valley (follow Quill's hint about the pool past the pines; you
  need the Lantern). An ink crossing, a block puzzle, and the Briar Alpha, a wolf boss that calls its pack and
  speeds up when hurt. It drops Thornwake, a unique axe that poisons. "The Lost Bridge" shows in the journal.
- Battles move now: enemies breathe, lunge, flinch, cast and crumble before they vanish; the Archivore's Devour
  Name has its own wind-up; the Echo Warden visibly changes stance; the party has critical, combo and level-up
  poses.
- Phone fixes from the third critique: dialogue boxes size to their text and move to the top when they would hide
  the speaker; every battle command is on screen at once (two columns, with Flee as a button); the empty window in
  battle is now a short battle log; the bestiary shows each monster's picture (a silhouette until you meet it);
  touch screens show A and B button hints instead of keyboard keys.

## 2026-10-20 (Tue) midday: Archive floors with their own look, proper Hollow monsters, story music
- Each Archive floor is now its own place: the Catalog Halls are warm oak and card drawers around a Great Catalog;
  the Reading Galleries are cool slate and glass under a rose window; the Rootbound Stacks are dark wood swallowed
  by roots above the great door. Rooms have real walls instead of floating in black, and ink pits look like pits.
- The Archivore on the field now looks like the Archivore you fight. The Hollow's monsters have their own art (no
  more stretched wolves), with a root-cave battle backdrop.
- The music follows the story: an uneasy theme when names fade and the thirteenth bell rings, the sad theme when
  Bram loses his father's name and when your own name stays faint, and a triumphant one for the homecoming.

## 2026-10-20 (Tue) late morning: field abilities, and Episode 2 is designed
- Each party member has a field ability (switch with the left page button, use with the right; on phones the
  ability button sits where the Lantern button was): the hero's Dash Strike breaks cracked rock and root walls
  and gets a free first turn when it hits an enemy from behind; Mira's Appraise reads a visible enemy's weaknesses
  from a distance and records them; Bram's Shove moves heavy blocks. Each opens one optional secret (a valley grotto,
  an Archive storeroom niche, a root shortcut on floor three).
- Episode 2 is designed and ready to build: "The Town Without a Name". The road east from the valley leads through
  a misty pass to a town where no one has a reflection, and across the lake to the Court of Mirrors (light-and-mirror
  puzzles, your party's own reflections as a mini-boss, the three-phase Nameless King). Plan:
  `next/docs/EPISODE2_PLAN.md`. I will start building it after the weekly usage reset so your loops keep room.

## 2026-10-20 (Tue) afternoon: Episode 1 fix pass from the second playtest review
- Fights ran long because the party kept running out of MP between the campfire and the Echo Warden. There is now a
  healing font in the Reading Galleries' entry hall before the Warden, and Auto battle uses Mira's free MP-restoring
  strike. A new full-route simulator confirms fights are back to about 4 to 5 rounds.
- Whisperwood Hollow has a shrine rest point before the Briar Alpha; if you come back after the Archivore, an Elder
  Alpha waits so it is still a fight. After you get the Lantern, Bram and the Talk menu point you back to the pool.
- Gold has a use again: Rook the peddler by the floor-three font, and the smithy stocks better gear after floor two.
- The start is quicker: 16 fewer text boxes before the first fight, with every favourite moment kept.

## 2026-10-21 (Wed) morning: your Load Game bug, fixed and live
- The Load and Save pages now make the choice obvious: the record the finger points at glows with a gold frame
  and the others dim, and the finger sits halfway down that record instead of on the line between two of them.
- With the autosave plus three records, the bottom record used to slide under the help bar and hide the finger.
  All four now fit on screen, so the finger can never disappear. The title menu's own finger no longer shows
  through behind the page either.
- This went out on its own (the half-built Episode 2 stays unpublished). On your phone, close and reopen the game
  once to pick up the update.
- Also fixed on the Episode 2 branch: Mira's Appraise window could ignore a quick tap to close it on a busy frame.
- Episode 2 continues this week at a steady pace, one helper at a time, watching the usage meter so the loops and
  the schedule generators keep their room.

## 2026-10-21 (Wed) late morning: Episode 2's battles and title screen
- Once you have finished Episode 1, the title screen offers "Episode 2": it picks up your hero's name, shows an
  "Episode 2: The Town Without a Name" card, and starts you at home.
- Boss fights got their big moments: intro cards for The Other Selves and The Nameless King, a full-screen
  "the mirror cracks" effect, the King's unmasking, a party member sealed in glass (Kept), and a silver bracket on
  the turn order when two reflections are about to strike together.
- Long battle warnings no longer get cut off (this also fixes the Archivore's warning in Episode 1).
- Next: stitching Episode 2 into one run from start to credits, with the test bot playing it on desktop and phone.
  Still not published; it goes live after two reviews and a fix pass.

## 2026-10-21 (Wed) afternoon: Episode 2 plays start to finish; a shop fix for Episode 1 is live
- Episode 2 now plays from beginning to end without getting stuck. The test player finished it four times (computer
  and phone, continuing from a finished Episode 1 save and starting fresh from the title's Episode 2 option) and never
  lost a fight. A first play looks like about two hours, longer than the 60 to 90 minutes planned; the reviews will
  say whether to trim it.
- Fixed along the way: a freeze right after the Episode 1 credits, a fog shortcut that skipped a scene, Mira walking
  into a fountain, and a dog that could block the smithy door.
- Live now in Episode 1: the shops never showed the items meant to unlock as the story goes on, so the better
  weapons and armor after you enter the Archive (and the floor-two upgrades) were missing. They appear now: the
  smithy grows from 10 items to as many as 27. Close and reopen the game once to pick it up.
- Next: two reviews of Episode 2 (art and phone usability first, then pacing and puzzles), a fix pass, then it goes live.

## 2026-10-21 (Wed) late afternoon: both Episode 2 reviews are in; the fix pass has started
- The art and phone review says Episode 2 is not yet at Episode 1's level on a phone. Its three key images do not
  come through: no real fog on the Fading Road, the Hollow sits in daylight, and the faces in the fountain are blobs.
  On the phone, one fight hides a monster behind the battle menu. A few Episode 2 screens beat Episode 1 and are
  marked to keep.
- The play review says it is well built: every light-beam puzzle can be solved from the screen alone, and the boss
  fights give real choices. The fixes are pacing (49 text boxes before the first fight, road monsters that keep
  coming back) and a difficulty spike for players a level behind. Trimming about 12 minutes brings it to about
  Episode 1's length.
- The fix pass runs in two parts, one helper at a time: art and phone first (now), then pacing and balance. The
  five new character portraits that look flatter than Episode 1's wait for a later pass.

## 2026-10-21 (Wed) evening: Episode 2's look is fixed; pacing next
- On a phone, every monster in a fight is now visible, including the one that used to hide behind the battle menu.
  This also improves Episode 1's three-monster fights on the phone.
- The fountain scenes cut to a close-up of the water, so you see the townsfolk's faces, and the ending shows your
  own reflection, faint, among lantern lights.
- The nameless town is a grey, colourless evening that turns warm gold when its name returns.
- The Fading Road has real fog now: follow the glowing cairns; a wrong turn sends you back only to the last cairn.
- The mirror palace is moonlit instead of a flat grey grid, its monsters stand out, the King's crown is no longer
  cut off, and he has a proper unmasked portrait.
- Still to come in a later art pass: repainting the five new character portraits and the reflection monsters.
- Now running: the pacing and balance half (a shorter opening, road monsters that stop coming back every minute,
  a smoother difficulty curve).

## 2026-10-21 (Wed) night: Episode 2 is live
- Episode 2, "The Town Without a Name", is on the /next link. Finish Episode 1 and the title screen offers
  "Episode 2"; to jump straight in, open https://scball1104-star.github.io/Lexicon-quest/next/?ep=2 . Close and reopen
  the game once if your phone still shows the old version.
- The pacing half of the fix pass: about 11 fewer fights and 45 fewer lines of dialogue, the first fight now comes in
  under five minutes, road monsters no longer come back every minute, and the reflection mini-boss is no longer harder
  than the final boss. A first play is about one and a half to two hours.
- Episode 1 also gets the improvements to shared parts: every monster visible on the phone, the speaker kept in view
  during dialogue, and the shop fix from this afternoon.
- Next, at the same steady pace: an art pass to bring the five new character portraits and the reflection monsters up
  to Episode 1's painted look. I will not start Episode 3 until you say what you want it to be.

## 2026-10-21 (Wed) late night: Episode 2 art pass is live
- The five new Episode 2 faces (Elian, Sister Anwen, Tovin, Lena, Aurel) are redrawn turned three-quarters and lit
  from the upper left, like Episode 1's. They are a clear step up, though still smoother than Episode 1's painted
  portraits; tell me if any of them bothers you.
- The reflection monsters now look like glass statues of your own party, each with its owner's mark (the hero's
  scarf, Mira's staff gem, Bram's shield cross).
- The Nameless King has a clear crown and a glowing veil, and his face reads when he is unmasked.
- Each room of the mirror palace has its own wall: tapestries, broken mirrors, black glass, crimson banners.

## 2026-10-22 (Thu) overnight: small cleanup is live
- In the final boss fight, the message box and warning markers now stay off the King's crown and face.
- The test bot can now play the optional forest dungeon (Whisperwood Hollow) and win it, so it gets checked too.
- Next: one fresh-eyes review of the live game, played as a brand-new player from the title to the Episode 2
  credits, then a last fix pass. After that I stop and wait for you on what Episode 3 should be.

## 2026-10-23 (Fri) afternoon: a fresh-eyes review found a save trap; fixing it now
- A network outage stopped work from early Thursday until this afternoon; nothing was lost.
- A review played the live game as a brand-new phone player from the title to the Episode 2 credits. No dead ends
  and no crashes. But it found one real trap: on the title screen, "Episode 2" (and New Game) start a fresh party,
  and the first door it walks through overwrites the autosave, so a finished Episode 1 kept only in the autosave
  is lost. Until the fix is live: if you have finished Episode 1, use Continue, not Episode 2, or save to a
  Record first.
- Also being fixed: phones being told to press keyboard keys (E, Q) in a few hints, Episode 2 ending by pointing at a
  road that does not exist yet, the Talk command never being introduced, and a hint to turn the phone sideways.

## 2026-10-23 (Fri) evening: the save trap is fixed and live; the week's queue is done
- Starting "Episode 2" or New Game from the title can no longer wipe a finished game. If your autosave holds
  another run, the game names it (for example "Arden, Lv 10, Home") and asks: Keep my save (the default), Copy it,
  then start, or Replace it.
- Phones now show the right button names (SHOVE, DASH, APPRAISE, LANTERN) instead of keyboard keys.
- Mira tells new players about Talk; holding the phone upright shows a hint to turn it sideways; choices take one
  tap; monsters' weak points show while you pick a command.
- The last floor before the King (Court floor 3) was the easiest in the game; its monsters now hit about twice as
  hard there. Tell me if it feels too much.
- Episode 2 now ends with a "To be continued" card. Placeholder words, yours to change:
  - Card: "To be continued" / "Episode 3 is not playable yet."
  - Journal: "Hollowmere has its name. Yours is in the Book twice. Emberpeak is burning, but the road there is not
    open yet."
  - Bram (Talk): "The road to Emberpeak isn't open yet, {hero}. When it is, we go."
- That finishes everything queued. I have stopped the check-ins and will not start Episode 3 until you say what
  you want it to be.


## 2026-10-26 (Mon): the Wider Valley, first fix pass (not published)
- Tapping FLEE twice on a phone froze the battle (the command menu stayed open). Fixed with one line; the bug is older than the expansion, so the published game most likely has it too.
- A save made inside the Barrow's Ewe Chamber no longer reloads you into a sealed room, and the Culvert gate stays open once opened.
- The west gates now look like a way once the first fight is won (a worn lane and an arrow post), and Mira says so once.
- Talk now speaks about the map you are standing on, and no longer sends you to Mael's well from the Downs.
- A save inside the expansion can never load into the developer test town: the game waits a few seconds for the new
  places, otherwise puts you on the valley road and brings you back when they load.
- The four puzzle weapons are real prizes now (Reeve's Crook 24 ATK beats the Winged Lance's 22; Orchard Axe 21, Drover's Bow 17,
  Chime Staff MAG 15). The main route is unchanged.
- Smaller: the pine over the first cleft bridge cell is gone, the mill wheel and Hesper and the Culvert have the right words,
  barks wait while a monster is chasing you, a chasing monster walks round a tree, "Five roads" at the five-arm sign.
- The plan docs now say what the code does: optional fights pay full EXP (a completionist ends about three levels over).

## 2026-10-26 (Mon) evening: your answers on the responsibility and adventure arc
- Read back from your reply: A no credit or nod to Dr. Peterson anywhere in the game. B the new opening replaces
  the old one outright, no switch to keep both. C Vows at campfires and a harder mode that opens after you finish
  the game, like Diablo's higher difficulties. D a true answer costs a little and never locks a route.
- Started now, one agent at a time: the first five minutes (the bell tower cold open, a shorter wake-up, Oren's
  choice remembered, a one-slime fight in the bakery lane before you meet Mael). Your saves are not touched; only
  a New Game sees it. The ledger, the Vows, the post-game mode and the truth choices follow in that order.
- Nothing is published until you say so. The post-game mode's exact shape comes to you for a read before it is
  built.

## 2026-10-26 (Mon) night: the first five minutes are built (not published)
- A New Game now starts you on the bell tower stair at night, alone with a lantern, within about five seconds.
  Each of the twelve steps up tolls a bell and shows a name from the town. The thirteenth toll shows no name.
  Black, one card, and you wake up at home. The old six title cards are gone; the attract loop on the title still
  shows one.
- Hazel's wake-up is half as long. Oren's sign scene remembers whether you told him the truth, and he says one
  different line later. Before you reach Mael, a runaway ink slime blocks the bakery lane: one small fight, three
  hits, no fleeing. Mira and Bram's wolf fight on the road still teaches Lunge and Appraise.
- Measured on a phone: control at 5 seconds, the first choice at about 1 minute 45, the slime fight at about
  2 minutes, which beats the "choice by minute 3, fight by minute 5" rule.
- Your saves are untouched; only a New Game sees any of this. The Episode 2 start is unchanged. The bot plays
  both Episode 1 routes and the Episode 2 start to the credits.
- Housekeeping: the developer-only screens no longer download with the game (about 12 KB saved on first load),
  which keeps the first-load budget line where it was.
- Next, now running: the Ledger of Names (every named person, faded or bright), the "Names kept" count on the
  title, and a quiet one-line Aim on the field.

## 2026-10-26 (Mon) late: the Ledger of Names is in (not published)
- The Journal has a third tab, Ledger: every named person in the game by place, bright when you have kept their
  name and faded when you have not, with the count in the header. Pick a name to read what kept it. 37 names
  count today (Episode 1, Episode 2 and the Wider Valley); the Episode 3 cast joins when that episode goes live.
  A full Episode 1 run keeps 17.
- The title screen shows "Names kept: N of M" under the menu, from your best save.
- A quiet Aim line shows the current main step at the top of the field for four seconds when it changes, when
  you close the menu, and when you stand still for ten seconds. Nothing else was added to the screen.
- Your saves load unchanged; the count is read from what you have already done.
- Budget note: the first-load line I keep for the game (what downloads before the tap prompt) moves from 2.32 to 2.34 MB for
  the Vows and the truth choices, still 160 KB under your 2.5 MB cap. The expansions keep paying their own way.
- Next, now running: Vows at every rest (optional, one at a time, a small reward for keeping one, one honest line
  for breaking one), and a one-page proposal for the post-game Hard Road mode for you to read before anything
  is built.
- Late correction from you, taken: the post-game mode is difficulty tiers that unlock after completing the game,
  Diablo-style, where harder pays better XP, better loot and better shop equipment. The proposal page will answer
  whether that works for us, with the levers the game already has. Still proposal only.

## 2026-10-27 (Tue) small hours: Vows in, the Deep Stacks under way (not published)
- Vows: at every rest the game asks "Take a vow?" with No vow first, so nothing changes unless you pick one. Five to
  choose from: No fleeing, No healing items, Walk the road, Mira stands, No Fury. Keep it to the next rest and
  the member concerned gains a few weapon mastery points (all of Episode 1's vows together add less than one
  level). Break it and you get one short toast and one line from the party at the next rest, nothing else.
- The Hard Road proposal (difficulty tiers after the credits) is in your inbox with three questions only you can
  answer. Nothing of it is built.
- The Deep Stacks: the floor generator makes a hundred floors from hand-made room pieces and proves every floor
  walkable on hundreds of seeds; the data tables (foe bands, scaling, loot by depth, seventeen uniques, the
  Bookmark, the Binder) are done and tested. Running now: the run state (level 1 in, your real party kept aside
  and restored), the chest and boss art with the hand-made B100 and entrance hall, and the story pass for the
  responsibility arc (true-or-kind-lie choices that are remembered, one question at the end of every floor, one
  line on every boss, and a plain aim line on the field).
- Housekeeping: a bug of mine from last night (the yard slime was still 74 HP) is fixed; the cave code is a pack
  that downloads only when you first go in, so the first load does not grow.

## 2026-10-27 (Tue) before dawn: the critic's read of the arc, and the Stacks wired (not published)
- A fresh-eyes critic played the new opening on a phone: control in 6 seconds, the thirteenth toll at 47 seconds,
  the first real choice at 2:09, the first fight at 2:39. Its verdict: a Lufia or Chrono Trigger player keeps
  going after five minutes. Its best lines: Oren's sign and the Archive door, which it says must not be touched.
- It found one blocker, now fixed: your old saves and the Episode 2 start could meet the bakery-lane slime a
  second time. It also found the long pull soft: the Ledger's kept lines read like notes to a programmer, it lists
  Episode 2's people from minute five, and every true answer pays an item so the choices start to feel like a quiz.
  A fix pass is working through its 25 items in order.
- The Deep Stacks are playable end to end behind a test switch: trapdoor, Hollis, a hundred generated floors,
  red and blue chests, the Bookmark, the close on a wipe, the resume row on the title. The balance run and the bot
  descent are in progress; the switch stays off until they pass and a critic has played it.
- Usage note: the account is at 74 percent of its weekly allowance, so from here the agents run one at a time and
  stop above 85 until the Wednesday morning reset.

## 2026-10-27 (Tue) morning: the critic's 24 notes worked through (not published)
- The bell tower is clean now: no aim line, no menu, no place banner, the one caption up in the dark above you,
  and twelve small bells in the belfry so the thirteenth has something to be the thirteenth of. The thirteenth
  toll is its own cracked bell, and every later "thirteen" in the game rings the same one.
- The Ledger reads like the game, not like a flag list: every name has a line in Holt's and Mael's plain voice,
  a place only appears once you have reached it (so the Hollow's people stay out of sight until you cross), Oren
  is kept the morning you stand at his sign, and your own row says "Not yet kept." The counts: 1 of 18 after Mael,
  3 of 25 at the Archive door, 17 of 25 after the credits.
- The true answer is no longer the quiz answer. A gift comes only where the fiction hands one over (six truths,
  two kind lies), and nothing comes from Oren, Mael, Elian or Nico either way. Mael's well question is now about
  the night you both just had ("Did you sleep at all?"), and his Episode 2 memory of it follows.
- Vows: a line from Bram explains them once before the first offer; Auto battle never takes an action the vow
  forbids; the aim line carries " - Vow: No fleeing" while one is held; a kept vow shows the mastery bar filling.
- One thing for you: the bakery-lane slime now fights in front of the town's key art, which shows Willowmere at
  dusk, while the fight happens in the morning. A daytime stage needs new art and bytes. Say the word if it bothers you.
- The Deep Stacks balance agent is still running; nothing is published.

## 2026-10-27 (Tue) 8 AM: the Deep Stacks balance is proved, three bugs fixed, agents paused until Wednesday (not published)
- The balance pass is done and it was needed: as handed over, 94 of 100 readings died before B10, because the Stacks have
  no rests (Mira's magic points were the only healing and they ran dry) and the first floors lent nothing but Short
  Swords. Now, on 50 simulated readings through the game's own floors and fights, 2 in 100 die in B1 to B9, 10 in 100 in
  B10 to B29, 7 in 100 in B30 to B59 and 17 in 100 in B60 to B99, inside the plan's targets with room to spare, and the
  party arrives at every landing within a level of the plan. The Binder at B100 is beaten by careful play 93 times in
  100 inside 20 rounds, and never by attack-only play. The larder is the difficulty: a bot that skipped the far chests
  died twice as often.
- The bot went down thirty floors on ten readings (plus three on a phone), banked with a Bookmark at B30 every time,
  came back in wearing its vault finds, and resumed a suspended run on B7. No errors, no stuck screens.
- Three bugs found by the pass and fixed by me: a second descent in the same sitting found the cleared floors empty
  (level 1 into B20 with nothing to fight); the Binder kept its first look through all three phases; two floors in about
  fifty thousand refused to build. All three are fixed and every other floor is unchanged.
- Usage is at 82 percent of the weekly allowance, so no more agents run until the Wednesday 9 AM reset. The fresh-eyes
  critic for the Stacks is written and waits for that; after it, one fix pass, the switch on, the full publish check on a
  quiet machine, and your yes. Nothing is published.

## 2026-10-27 (Tue) 9 AM: your three answers, and the Runway and Suno question
- Deep Stacks uniques (your call E): recorded word for word. The build is sixty uniques in three grades, twenty per
  grade across every slot, with the odds turning over with depth (a shallow blue chest is 85 percent a weak unique and
  1 percent a strong one; at B99 it is 3 and 80), so the party can be fitted out in uniques three times over. It runs
  after the Stacks critic, under the usage guard.
- Hard Road (your three answers): the character is carried, one tier, and the name stays open. Approved to build;
  queued behind the Stacks work. Name candidates for you: Second Edition, The Unabridged, Red Ink, Fine Print, The
  Second Toll, The Long Way.
- Runway and Suno: the assessment is in your inbox. Short form: Runway yes, for painted stages and story cards (three
  test stills made for 12 credits, on one sheet in the chat); Suno yes for music, but that account is on the Free plan
  with no commercial rights and no downloads, so it needs Pro or Premier first, or we use the Eleven Music model inside
  your Runway plan instead. Nothing is built until you answer.

