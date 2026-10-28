# NEXT build plan (living backlog)

Orchestrator: the main Claude session. Agents pick work only from their brief; the orchestrator updates this file.
Status keys: [ ] todo, [~] in progress, [x] done (merged), [!] blocked.

## Wave 1: foundations (parallel, separate folders)
- [x] W1-core: engine loop, renderer/scaling, input (kbd/pad/touch), assets, save, font renderer, scene stack, debug API, qa harness (`src/core`, `src/main.js`, `index.html`, `qa/run.mjs`, `qa/shots.py`)
- [x] W1-tiles: palette.json + terrain/structure tilesets for town, valley, archive, interiors (`tools/art/tiles`, `assets/tiles`)
- [x] W1-sprites: party field+battle sprites, townsfolk, props, enemies, bosses, portraits, field enemy sprites (`tools/art/sprites`, `assets/sprites`)
- [x] W1-ui-art: bitmap fonts, window skins, cursor, icons, battle UI bits (`tools/art/ui`, `assets/ui`)
- [x] W1-audio: SFX + jingles + ambience generators and files, audio manifest (`tools/audio`, `assets/audio/sfx|jingles|ambience`)
- [x] W1-content: Episode 1 story script, NPCs, quests, items, enemies, encounters, shops, loot tables (`src/data`, `docs/story`)
- [x] W1-battle-rules: pure battle logic: CTB, damage, weakness/break, statuses, fury, combos, AI, loot rolls + tests (`src/battle/*.js` pure, `qa/battle`)
- [x] W1-music: composed tracks archive/mystery/sorrow/triumph via tracker (Suno blocked in-app; prompts in docs/SUNO_PROMPTS.md)

## Wave 2: systems on top of foundations
- [x] W2-world: tilemap + autotile renderer, actors, followers, NPC behaviors, events, cutscene runner, camera, lighting, particles, transitions, field scene
- [x] W2-ui: dialogue (typewriter, portraits, blips, choices), main menu (items/equip/tech/status/journal/bestiary/config/save), shop, name entry, title, save/load, options
- [x] W2-battle-scene: battle presentation over the pure rules: layout, timeline, commands, targeting, animations, fx, rewards, level-up
- [x] W2-maps: author Willowmere (+ interiors), Willowmere Valley, Archive F1-F3 + boss room, with a map preview tool

## Wave 3: integration
- [x] W3-integrate: full flow title -> prologue -> town -> valley -> archive -> boss -> ending -> credits; autoplay test; publish /next

## Wave 4+: polish loops (repeat all week)
- [ ] critic passes (art, UX, combat feel, story) on qa/out screenshots -> issue lists here
- [ ] fix passes per issue list
- [ ] balance simulation, mobile/touch pass, performance pass, accessibility/options pass

## Polish backlog (found in review)
- [ ] Battle timeline face crops (14x14) read as orange squares; use 12x12 head icons drawn for the purpose, plus enemy silhouettes
- [ ] Enemies have a single battle frame; add a 2-frame idle breathe and a hurt squash in code
- [ ] Long telegraph sentences get cut with an ellipsis in the help window; wrap to two lines

## Wave 4 polish backlog from docs/CRITIQUE_1.md (ranked)
- [x] C1 Quantize painted backdrops (title, battle, dialogue key art) to palette.json with ordered dither so every scene has one pixel density
- [x] C2 Bram and Mira sprites match their portraits (done before the critique ran)
- [x] C3 Battle stage: indigo lower band, ellipse shadows under units, one baseline so the party does not float
- [x] C4 Timeline icons: chibi head icons in the timeline: chibi head icons with side-colored frames (replaces eyebrow crops)
- [x] C5 Battle-start shatter: axis-aligned slices over mosaic, no free-angle rotation of pixel art; remove the stray glyph
- [x] C6 Archive void: flat #14101e instead of the loud hatched brown; wall faces and pillars for depth; confirm F3 pit and valley navy rectangle are intended art
- [x] C7 Lantern/brazier light: dithered radial falloff with max blend instead of overlapping alpha discs
- [x] C8 Enemy battle sprites: remove downscale speckle, add selective outlines
- [x] C9 Plaza cobble contrast lower than actors
- [ ] C10 Victory window overlaps help bar and timeline (integrator)
- [x] C11 Slash fx: thicker arc, impact star, visible hit-stop
- [x] C12 Touch: menu rows too small on phone, add tap-to-select; tablet A/B buttons bigger
- [ ] C13 Battle shows "Hero" while menus show the chosen name (integrator, bug)
- [x] C14 Game over asymmetric black top band
- [x] C15 Followers spawn stacked on the leader (integrator)
- [x] C16 Library rug reads as a tile grid
- [x] C17 Ambient particles missing from field shots
- [x] W4b-ui-polish: title and prologue use assets/backdrops/title.png and dialog_keyart.png; game over band (C14); any leftover UI items

## Wave 5: second critique and design playtest (read-only reviews, then fix passes)
- [x] critic-2: art/UX critique on fresh shots -> docs/CRITIQUE_2.md
- [x] play-critic: pacing, clarity, difficulty, fun review from the autoplay frames and dialogue log -> docs/PLAYTEST_REVIEW_1.md
- [x] battle touch rows + Auto/Speed hint in the battle help window (W4b proposal)
- [x] fix passes from both reviews (W5 story/maps, W5 systems, W5 art); W5b-ui in progress

## Wave 5 visual backlog from docs/CRITIQUE_2.md (ranked; Bram item was stale, asset is correct)
- [x] D1 Key-art screens (title, prologue, name entry, credits) still show 10k+ colors: dither the vignette/overlays instead of alpha-blending, draw the quantized atlas 1:1 (ui, W5b)
- [x] D2 Valley battles use the dusk town painting: build a daytime valley backdrop from the tiles/map vista (W5-art)
- [x] D3 Bookmites and the Archivore base go near-black on the dark Archive stage: rim light on dark sprites or a lighter stage band (W5-art + battle)
- [x] D4 Hidden-ink pits and bridges are flat navy rectangles: real ink art with edges, ripples, and revealed-bridge planks (W5-art)
- [x] D5 Valley terrain is blocky (rectangular tall grass, straight road): shape patches and curve the road (W5-story-maps)
- [x] D6 Text runs to the window edge in places: enforce 8 px padding in dialog/menus (W5b)
- [x] D7 Cursor glove clipped at x=0 in Shop and Journal (W5b)
- [x] D8 Touch chrome RUN/MENU pills about 14 css px: enlarge (W5b, core/touch)
- [x] D9 Push block reads as a cabinet: redraw as a carved stone block with a handle groove (W5-art)
- [x] D10 Inconsistent confirm glyphs between screens (W5b)
- [x] D11 Empty Victory window on no-drop fights; Fury READY label overlaps the gauge (W5b)
- [x] D12 qa/shots.py: wait for typewriter completion before capturing story shots; re-render stale map previews (W5b)

## Usage guard (Scott 2026-10-19 / 10-20): up to 3 agents under 75% weekly, 1 to 85%, none above
- [x] Scott playtest: bridges blinking, weakness row under command window on phone, hero Swap greyed, gear bonuses on Status

## Wave 6: depth and polish (PARKED on wip/w5b-w6-partial, finish one at a time)
- [x] W6-pwa: loading screen, installable PWA with its own service worker, lazy music, size budget
- [x] W6-anim: enemy/boss attack, hurt, cast, death and stance frames; party breathe, crit, combo, level-up frames
- [x] W6-content: Whisperwood Hollow optional dungeon with the Briar Alpha mini-boss and the Thornwake unique
- [x] critic-3 on the current build (docs/CRITIQUE_3.md); then publish W6

## Backlog from W6 review and CRITIQUE_3 (not yet assigned)
- [x] Briar Alpha and other borrowed-art enemies scale by 1.3x (non-integer, blurs pixels): give them their own recolored frames at 1x, or 2x for bosses
- [x] Whisperwood Hollow battles use the daytime meadow backdrop: compose a root-cave backdrop (or reuse battle_archive with a green tint)
- [x] fx.js death dissolve ignores sprite scale
- [x] CRITIQUE_3 #3 Archive floors look alike and float in black (art + maps)
- [x] CRITIQUE_3 #4 ink pits still read as flat rectangles at a distance (art)
- [x] CRITIQUE_3 #8 Bram's gate sprite is not Bram (data: use the party sprite before he joins)
- [x] CRITIQUE_3 #10 field Archivore avatar does not match the battle boss (art)
- [x] CRITIQUE_3 #12 music reuse: mystery/sorrow cues in story scenes, a distinct F3 or boss-door cue (content + audio)
- [ ] Next big steps (CRITIQUE_3): party field abilities; Lantern upgrade; Episode 2 vertical slice

## Wave 9 (running)
- [x] W9-abilities: Hero Dash Strike, Mira field Appraise + Lantern, Bram Shove; optional uses placed in existing maps
- [x] play-critic-2: docs/PLAYTEST_REVIEW_2.md
- [x] ep2-designer: docs/story/EPISODE2.md + docs/EPISODE2_PLAN.md (build briefs for the second realm)

## Done: Episode 1 fix pass (W10). Next: Episode 2 build (docs/EPISODE2_PLAN.md, after the weekly usage reset)

## Episode 2 build (docs/EPISODE2_PLAN.md section 10)
- [x] Wave 10a: E2-story, E2-battle, E2-tiles (committed)
- [x] Wave 10b: E2-sprites (committed edcbfbe); E2-world + E2-maps committed 3862a6d (world systems and
      all 11 maps + valley/chapel edits; 484 qa tests green; every map preview viewed)
- [x] E2-audio: five composed tracks, 10 SFX, 2 ambiences, precached (committed b032407, 2706037)
- [x] Wave 10c: E2-scene-ui committed 9fa5caa (title Episode 2 entry + card, credits, mirror cracks, unmask, bracket,
      Kept slot, 3-line telegraphs; 498 tests green; phone and desktop shots viewed). Load budget 6 -> 6.5 MB (b157fd0).
      Fix-pass backlog: on the phone the taller touch command window hides the lower half of the middle foe in
      three-foe fights (predates Episode 2, obvious with Mira's Reflection); assets/ui/heads.png reflection blobs
      are now unused (runtime glass heads).
- [x] Wave 10d: E2-integrate committed 5f09ee5: autoplay finishes Episode 2 from an Episode 1 save and from
      newGameEp2, desktop and phone, 0 game overs, King at Lv 13 (save) and Lv 12 (new); 505 tests; 12 shots x 7 devices.
      Story timer: first play 110 to 153 min (plan said 60 to 90; Episode 1 measures 96 to 113 the same way).
      Live Episode 1 bug found: shops never offered story-unlocked stock (1cfe993); hotfix to main in progress.
- [x] Reviews: critic-4 (1d6fa2a, docs/CRITIQUE_4.md) and play-critic-3 (4cda434, docs/PLAYTEST_REVIEW_3.md: well
      built, every beam puzzle readable from the screen; fixes are pacing and a level-curve spike; trim ~11 to 13 min)
- [x] W11 fix pass: Part A 0f49e22 (art and UX), Part B 2f33648 (pacing and balance: story timer 98 to 136 min,
      first fight ~4.5 min, Other Selves Lv 10 win 88%, King Lv 12 96%; 509 tests).
- [x] PUBLISHED Episode 2 to /next 2026-10-21 ~20:20 ET: main 35cf470, sw b5ccac10a979. Gates: release pwa 16/16,
      root gate, 509 tests, 159/159 shots; live headless check desktop + phone (plain and ?ep=2) zero console errors.

## Next (slow and steady, one agent at a time)
- [x] W12 Episode 2 art pass committed cf76f31, PUBLISHED 2026-10-21 ~23:35 ET (main ccd8717, sw 1517c9e646df):
      five portraits three-quarter and lit (closer to Episode 1, still smoother and less textured than its painted
      ones), Other Selves as glass party, King crown and unmasked face, per-room Court walls. 514 tests, 159/159 shots.
      Left over: the "!" telegraph bubble covers the King's veil and a two-line help box hides the crown's top
      (battle hud placement); tools/maps previews still show the old Court walls.
- [x] W13 small backlog committed 2accd81, PUBLISHED 2026-10-22 ~02:05 ET (main b04d6f7, sw 34b003adde62): King fight
      HUD clear of crown and face, Echo Warden bubble, Court map previews, autoplay --hollow (0 game overs),
      DESIGN.md closeup() and respawn: 'reentry'. Briar Alpha avatar skipped (nothing stretched). 519 tests.
- [x] W14 fresh-eyes review done (docs/PLAYTEST_REVIEW_4.md): no softlocks; top issue is a LIVE save trap (the title's
      Episode 2 quick start or New Game overwrites the shared autosave holding a finished Episode 1, no prompt);
      then phone hints showing keyboard keys, Episode 2 ending toward a road that does not exist, Talk never
      introduced, no portrait-orientation hint, and five smaller items.
- [x] W15 fix pass committed 06ee810, PUBLISHED 2026-10-23 ~18:25 ET (main 11bdafd, sw f9f5ee9c0a9f): save trap
      closed (confirm before replacing another run's autosave, Keep my save default), touch glyphs, To be continued
      card (placeholder wording), Talk introduced, portrait hint, battle rows while choosing, banner wait, Court F3
      foes ATK/MAG x1.9 to x2.1 on that floor only (careful play loses 18% HP a fight at Lv 12), one-tap choices,
      name placeholder. 529 tests, 159/159 shots.
- QUEUE DONE 2026-10-23. Heartbeat cron stopped. Waiting for Scott on: Episode 3 (scope and story), the final
      wording of the Episode 2 ending lines (PROGRESS.md 10/23 evening), and whether Court F3 now feels right.
- Later, if wanted: per-run autosaves (M; the confirm prompt already prevents the loss).
- [ ] Episode 3: NOT started. Needs Scott's go (scope and story direction) before any design work.

- 2026-10-21: Scott: "slow and steady" this week, watching the usage monitor. One background agent at a time;
  get_usage is connected again (weekly 2% at 11:00 after the Tuesday reset).
- 2026-10-21 fixes: Load/Save page finger and highlight (Scott's report; hotfix published alone to main 8a1084a,
  merged back); Appraise window latches its closing press each logic step (abilities_walks was timing out).

## Episode 3: The Forge of Ash (status: designed, awaiting orchestrator launch)
Scott approved building Episode 3 on 2026-10-24. Design by ep3-designer (W16): `docs/story/EPISODE3.md` (story bible:
Bram's episode, Garrick's name taken by the thirteenth toll, Mara of the First Bell, the Cinder Warden, the hero's
third fragment) and `docs/EPISODE3_PLAN.md` (the contract). New field mechanic: quench channels (sluice-routed water
permanently crusts slag; reuses the beam tracer). One battle rule: Heat. Lv 13 to 17, planned at 75 minutes.
Run ONE agent at a time, in order, checking usage before each launch; each step leaves the game publishable
(everything stays behind `EP3_LIVE = false` until E3-integrate).
- [ ] Wave 17a: E3-saves (per-run autosave, `newGameEp3`, the switch) -> E3-story -> E3-battle
- [ ] Wave 17b: E3-tiles -> E3-sprites -> E3-audio
- [ ] Wave 17c: E3-world -> E3-maps
- [ ] Wave 17d: E3-scene-ui -> E3-integrate (flips `EP3_LIVE`; publish after the full gate list)
- [ ] Wave 17e: critic-5 -> play-critic-5 (`docs/briefs/E3-review.md`, read-only) -> E3-fixes
- Decisions for Scott (defaults in EPISODE3_PLAN 13): Garrick as the toll [yes]; grey Bram sprites [yes, shown first];
  quick-start free-slot rule for Episode 3 only [yes]; Episode 4 card wording [placeholder].

## Wave H: Responsibility and adventure arc (decided by Scott 2026-10-26; `docs/RESPONSIBILITY_ARC.md`)
- [x] H1-opening: cold open "The Thirteenth Toll", shorter wake-up, Oren choice remembered, yard slime fight, autoplay updated (`docs/briefs/H1-opening.md`); 10/26
  - H1 polish for H6: the "Willowmere. Last night." caption stays up for the whole climb (fade it after the first toll); the thirteenth bell plays `bell_toll` twice because `bell_first` lives in the ep3 sfx pack (a short core alarm bell, or move the id, inside the initial budget); the lantern pool is the party's cool light, a warm lantern would read better; the yard slime is 3 hits at 55% HP (encounter `hp`), check it feels right on a phone
- [x] H2-ledger: Ledger of Names (Journal tab, 45 rows, 37 live), title counter, Aim line (`docs/briefs/H2-ledger.md`); 10/26
  - H2 polish for H6: the Aim line shows the main step's title ("The Apprentice"); it should read as the present aim ("Find Mira at the library"): give each main step a short `aim` string in quests.js and draw that; on tablet overlay layouts the title counter can sit under the Menu pill; expansion kept lines fall back to "Kept." until the x1 pack registers
- [x] H3-vows: five Vows at rests, No vow default, seams, mastery reward, save fields; docs/VOWS.md; docs/HARD_ROAD.md emailed to Scott 10/27 (`docs/briefs/H3-vows.md`); 10/27 01:10
  - H3 gaps for H6: the Aim line carries no vow suffix; Auto battle can break a vow (consider pausing auto when a vow is active or warning once); the break toast overlaps the battle help bar for 1.5 s
- [~] H7-hard-road: LAUNCHED 10/28 10:50 on Opus beside C4-uniques; H3b PROPOSAL emailed 10/27; Scott answered 10/27 (verbatim in docs/HARD_ROAD.md): carry the character, one tier, named Fine Print (Scott 10/27: "For the name question: I think I like Fine Print"); APPROVED TO BUILD as H7-hard-road (`docs/briefs/H7-hard-road.md`), queued below
- [x] H4-story (H4 + H5 merged): 12 Name Truth choices (7 in Episode 1, 5 in Episode 2) with one remembered line and one small reward each, seven floor-ending questions, four boss card lines plus Mira's line for the Briar Alpha, aim strings on all 30 main steps; 11 tests; both bot routes clear (`docs/briefs/H4-story.md`); 10/27 04:00
  - H4 gaps for H6: no new ledger keeps (every scene id must be staged in STAGING.md and STAGING_EP2.md, which H4 did not own: one staging row each unlocks Hob, Cobb and Penny beats); the bot never opens Tess's quest, so her choice is proven by the test only; H4's one field.js line lands with C2-world's commit (same file in flight)
- [x] H6: critic and fix pass done (below); C3-critic and C4-fixes next, then the publish gate list and Scott's explicit yes

## Launch queue after the Wednesday 10/28 9 AM ET usage reset (one agent at a time from 75% weekly, none above 85%; check get_usage before each)
1. C3-critic (read-only, `docs/briefs/C3-critic.md`)
2. C4-uniques (`docs/briefs/C4-uniques.md`, Scott's call E)
3. C4-fixes (write the brief from the critic's table, DEEP_STACKS_BALANCE 7 items 4 to 10, the arc notes in Wave H)
4. H7-hard-road (`docs/briefs/H7-hard-road.md`, Scott's three answers; the tier is named Fine Print)
5. Media (orchestrator work, not an agent; APPROVED by Scott 10/27 9:40 AM, his words in `docs/MEDIA_BUILD.md`: "Stills approved.Suno Pro subscribed now.Story cards and title trailer in scope.If it would upgrade or improve the game to include video sequences from Runway, then let's do that too."): painted stages, story cards, Suno Pro music (20 downloads a month), a dozen SFX, one video test under the brief rule, the trailer. Paused 10/27 9:45 AM at 86% weekly usage (the guard); resumes after the reset, interleaved with the agents above.
Then: flip CAVE_LIVE, the full publish gate list (EXPANSION_SCHEDULE 4) on a quiet machine, Scott's explicit yes.

### 2026-10-28 (Wed) 9:30 AM, orchestrator notes
- Scott's other Claude set up the shared workflow this morning (root AGENTS.md, COLLABORATING.md, the NEXT gate workflow) on branch `scott/collab-setup`: overhaul becomes PULL-REQUEST ONLY, one `scott/<topic>` branch per task from origin/overhaul, issues claimed before building. Facts at 9:10: `origin` has only `main` (overhaul is not on GitHub yet), `gh` is not installed here, so neither issues nor pull requests can be opened from this machine today. My work therefore sits on local branches from overhaul (`scott/media-stages` first) and is pushed as pull requests once overhaul exists on origin; agent commits go the same way.
- C3-critic launched 9:09 on Opus (weekly 1%). Media: the three approved stages plus the dusk valley are in the game as lazy painted backdrops (first download unchanged); Suno Pro verified on the account page; the new title theme (Suno v6, 2:48) is in the manifest; the battle theme's download did not complete. Browser driving paused at 9:25: Scott is at the PC.
- 12:15: music: 7 of 20 Suno Pro themes are in the game (title, battle, willowmere, hollow, hollowmere, fading_road, court); Scott downloads the rest by hand (Suno's save picker is a native window; `tools/audio/add_track.py` then `finish_tracks.py` land a Desktop file; a replacement under the same file name MUST carry measured loop points in its sidecar or build.py keeps the old piece's loop). Tests: manifest.test and music.test accept Suno replacements (112 kbps, measured loops).
- 10:35: Scott said resume. All twelve stages of MEDIA_BUILD 1 are paintings in the game (branch scott/media-stages, commits 1ad20f0, 0e4e2c7, 7a6d9de, 60afeb6): four core ones lazy as paint_*, five x1 pack stages replaced in place, three new cave band stages; suites green. Suno: 20 themes created (v6, two takes each); only the title theme downloaded, the rest blocked by Chrome's automatic-download rule for suno.com (needs Scott's allow). Two Gen-4.5 videos made by mistake (about 192 credits); the Downs clip kept for the video test.

## Wave C: the Deep Stacks, a 100-floor Ancient Cave (Scott 2026-10-26; `docs/DEEP_STACKS_PLAN.md`; up to 3 agents at once under the usage guard)
- [x] C1-gen: seeded floor generator (aligned-door room accretion), 35 + 36 prefabs, landings, preview and lint tools, 37 tests (`docs/briefs/C1-gen.md`); 10/27 01:30
  - C1-gen notes for C2: hollow.png has no dungeon walls, the Cellars use the stacks kit over dirt and water; bands 3 to 5 borrow it until registerBand; corridors have no face rows; the validator is shimmed in tests (chest tiers red/blue, stub encounters); C2-world must registerMap floor N and N+1 at every stair, register encounter ids from C1-data's pools, teach events.js and mapcheck the red/blue chest tiers, clear game.opened cave_b* keys per run, pass opts.plaque and opts.nextArrival(99)
- [x] cave pack registered by the orchestrator 10/27 (packs.js entry, cap 0.8 MB, CAVE_LIVE off, live.js precached as the switch)
- [x] C1-data: bands, pools, scale(floor), loot zones, 17 uniques, the Bookmark, the Binder, pack index with register() (`docs/briefs/C1-data.md`); 10/27 00:30; 34 tests
  - C1-data gaps for C2/C3: bands 4 and 5 use court fallback pools until EP3_LIVE (buildBands(true) swaps in cinder/forge foes); ai.js prints "The Archivore" in three Binder messages; props needing hooks: cave_move_plus and stairs_sense (field), first_blow_true (battle), second_life (state); noSell needs an inventory hook; battle drops use the engine's normal table (depth rarity applies to chests only); bands 4 and 5 use existing backdrops
  - Fixed by the orchestrator 10/27: encounters.js rollEncounter dropped `hp`, so H1's yard slime was still 74 HP; now carried (41 HP, three hits)
- [x] C1-state: src/game/cave.js (enter, descend, bank, die, quit, clear, resume, reconcileVault, second_life rise), 35 tests (`docs/briefs/C1-state.md`); 10/27 02:00
  - C1-state calls: spare Bookmarks are run inventory and are lost on exit; clear spends none; reserve members are snapshotted, not reset; suspend slot 'cave' needs SUSPEND_SLOTS in core/save.js (C2-world)
- [x] C2-world: world.js glue (beginReading, endReading, prepareFloor, resumeReading, LQ_DEBUG cave surface), library trapdoor patched at register, red and blue chests with (seed, floor, chest) rng, Bookmark use, death card, Quit, suspend slot, floor tag and stairs arrow, second_life and first_blow_true hooks, cave_move_plus; seams +543 B gz (2,463 B under the ratchet), pack 198 KB gz; rig 107 checks on two devices; Episode 1 bot clean with the pack off (`docs/briefs/C2-world.md`); 10/27 05:00
  - C2-world gaps for C3/C4: Bookmark and Quit exercised through dialog confirms only; the B100 clear flow is proven in Node only; story's binder_cleared must not call endReading (afterBattle does)
- [x] C3-sim-bot: `node tools/sim/simulate.mjs --cave --check` (tools/sim/cave.mjs: 50 seeds B1 to B100 through the game's own floors, fights, chests and equip prompt, no rests; 23 s) passes with margin: death rates 2% / 10% / 7% / 17% against under 5 / 15 / 30 / 45, arrival Lv 11.3 / 24.8 / 40.6 / 56.1 against 12 / 25 / 40 / 55, the Binder won within 20 rounds 93%; 300 seeds agree. Before: 94% of seeds died in B1 to B9 (no rests, so Mira's MP was the healing budget; item level 1 has no bases, so every early weapon was a Short Sword). Tuned foes.js (TUNING, EARLY_EASE, BAND_ADJUST, SPEED_CAP 4, the Binder 4000 / 2200 / 3200 with the three looks) and loot.js (the larder, extra rolls, LANDING_SUPPLY, EARLY_WEAPON_TYPES, BASE_ILVL_MIN); fixed registerFloorEncounters keeping a stale spec across readings. Bot: `python qa/autoplay.py --cave 30`: desktop 10 of 10 seeds ok (351 floors, 1,427 fights, 2 wipes, every seed banked at B30 and wore its vault uniques on B5 of the next reading), phone 3 of 3 (0 wipes), `--cave-resume` lands on B7 on both; 0 console errors, 0 softlocks. Binder phase proof on both devices. 371 cave and battle tests green (`docs/briefs/C3-sim-bot.md`, `docs/DEEP_STACKS_BALANCE.md`); 10/27 07:40
  - Fixed by the orchestrator 10/27 (C3's gap items 1 to 3): a second reading in one sitting found its cleared floors empty (field.js keeps defeated foes per map id for its life; world.js beginReading now forgets the cave_b* entries); ai.js enterPhase forwards `sprite: p.sprite || null`, so the Binder's three looks swap in the real game; gen.js re-rolls a failed dressing from a derived sub-seed (DRESS_ATTEMPTS 8; seeds 318 B18 and 503 B3 build; the first dressing's seed is unchanged, so every other floor is identical)
  - C3-sim-bot gaps for C4 (docs/DEEP_STACKS_BALANCE.md 7, items 4 to 10): battle drops on B1 to B5 are always the lowest base (item level 1 has no bases: start the plan's item level at 2, or rollBase keeps slot and type on an empty pool; an elite's drop rolls at its home zone's item level); Auto battle Defends to death when nobody can heal (competentPolicy); deep floors run about 8 minutes at 1x from B80 (12 foes a floor: a cap of 8 holds 5 minutes, refit the EXP pace); bag hoards by B90 (about 20 Feathers, 25 spare Bookmarks, dozens of cures); bands 4 and 5 must be re-tuned when EP3_LIVE flips; qa/cave/out/cave_sanity.md is stale; the B100 Quill chest and plaque (C2-story-ui's)
- [x] C2-story-ui: Hollis placed by install(), the Stacks scenes, eleven plaques, Stacks text, the Resume row and the B100 ribbon on the title, the Journal line, the plaque screen in pack code; 22 tests (`docs/briefs/C2-story-ui.md`); 10/27 04:30
  - C2-story-ui gaps for C3/C4: plaque_b100 has no sign on the B100 map; the Quill chest on B100 is unreachable once clear() warps out (clear already puts the Quill in the vault: drop the chest or delay the warp); no headless rig of its own
- [x] H6-critic: docs/CRITIQUE_ARC.md, 25 ranked issues, verdict: the first five minutes hold (control 0:06, thirteenth toll 0:47, choice 2:09, fight 2:39); the long pull is weak (Ledger reads as a flag log, lists Episode 2 names early, every truth pays an item); 10/27 05:35
  - Blocker 1 fixed by the orchestrator 10/27 05:45: yard_slime never fires after met_mael; EP1_DONE_FLAGS carries cold_open_done and yard_fight_done
- [x] H6-fixes: items 2 to 25 done in rank order: no Aim, menu or banner on the tower; every Ledger row has a player-facing line and a place counts once reached; Oren kept on saw_fading_sign; gifts only where the fiction hands one over (6 truths, 2 kind lies); Mael asks about the night; Auto never breaks a vow; one box before the first vow offer; `bell_thirteenth` (a 0.79 s cracked D#3, 34.8 KB, core set); kept bar beside the rest box; aimIf for the great door; vow suffix on the Aim line; twelve belfry bells; tucked hero; gear from a scene's battle offered after the scene; yard fight on the Willowmere key art. +1,589 B gz before the tap prompt (771 B of room left), initial +36 KB (8.3 KB left). 600 Node tests, both rigs, both bots, sim green; shots phone 106/106, desktop clean once then timing failures under the balance agent's CPU load (`docs/briefs/H6-fixes.md`, `docs/CRITIQUE_ARC.md` Fixed); 10/27 06:50
  - H6-fixes open for Scott: the yard fight's stage is the town at dusk (the only Willowmere art) in a morning fight; a daytime stage needs new art and bytes
  - H6-fixes notes for C4: the tap-prompt room is 771 B, the initial-download room 8.3 KB; the next prose must pay for itself; desktop shots need a quiet machine (seven boot timeouts under load)
- [x] C2-sprites-boss: cave_props (chest_red, chest_blue, plaque, trapdoor), the Binder's three looks on the Archivore kit with every boss frame, binder_avatar field sprite, cave_b100.js and cave_landing0.js with marks, 36 prefabs each for court, ember and forge plus landings (bands345.js); 18 tests (`docs/briefs/C2-sprites-boss.md`); 10/27 02:50
  - C2-sprites-boss handoffs: foes.js BINDER needs sprite.frame 'binder' and phase sprites 'binder_loose', 'binder_binding' (C3 may set it; foes.js is C3-sim-bot's then); chest tiers red/blue map to chest_red/chest_blue; hall stairs_down must be rewritten from arrivalOf(seed, 1) (placeholder fails mapcheck on purpose); npc hollis at [10,8] and the plaque at [10,4] (C2-story-ui); no timeline head for the Binder (assets/ui not owned, hud falls back); gen.js strews roots down bands 3 to 5 corridors (propose a band corridorDecals field); the builders are standalone, not in build_all.py
- [~] C2-story-ui launched 10/27 02:55 (weekly usage 68%: from 75% the guard drops to one agent at a time, above 85% none until the Wednesday 9 AM reset)
- [x] C3-critic: docs/CRITIQUE_STACKS.md, 25 ranked issues; verdict: five minutes hold (hall 0:11, B1 1:15, first fight 1:23), after B30 probably not (B1 to B30 by hand 124 game minutes, Root Cellars fights 7 rounds, deep floors 10 to 20 minutes, the same six Court foes for sixty floors, the victory loop stuck on the field), a second reading is earned by the machinery but thinly pulled; the 10/27 fixes confirmed except two more generator refusals (612 B54, 687 B58). Five things not to touch: Hollis and the rules, the blue chest and the bank, the hand-made look, Resume, the Binder's phases; 10/28 10:45
  - Fixed by the orchestrator 10/28 11:00: gen.js `layout()` accepts only a layout some dressing proves (612 B54 and 687 B58 build, unchanged floors identical, `tools/cave/scan_floors.mjs` scans a seed range); battle.js `beginVictory` plays the victory loop only while the battle is on top (issue 2, a base-game bug)
  - C4-fixes brief written (`docs/briefs/C4-fixes.md`: issues 1 world half, 3 to 9, 11 to 25, Known 4, 5, 7, 9, 10); launches after C4-uniques reports (loot.js collides)
- [x] C4-uniques: sixty uniques in three grades (Lesser ilvl 5, Greater 10, Named 16; twenty a grade across every slot; the sixteen folded in; 44 new names, placeholders open to veto; props spread by grade, three guarded hook lines in world.js armBattle); every unique beats the 90th-percentile rolled rare of its grade's level in its slot and every Lesser beats the Episode 2 start piece; grade odds by floor as briefed (B1 85/14/1 to B99 3/17/80); a second blue FLOOR per decade (the generator places one blue chest a floor), so about 14 blue chests a deep run, the first by B9, all sixty seen in a median of 5 deep runs; worn at B95: 33 of 46 Named; --cave --check green but B10 to B99 death rates now under half their targets and the Binder 12.6 rounds (flagged, not retuned: C4-fixes); pack 0.213 MB; tests qa/cave/uniques_*; three old test pins patched (data_pack, story_scenes, ui_stacks); plaque says "n of 61"; BALANCE section 8. 10/28 11:45
  - Fixed by the orchestrator 10/28 11:50 (its gap 5, seed 311 B92): gen.js dressing now skips a chest spot that would cut the stair off and places foes on the walk WITH the chests in it, so the proof cannot fail on either; unchanged floors identical
  - C4-uniques leftovers for C4-fixes: resist stacking past 100 in inventory.js scoring (deep Named heads and charms lose to rolled rares), the Journal line's missing total, the "n of 61" plaque wording; Scott's answer to open call E (10/27, verbatim in DEEP_STACKS_PLAN 13): sixty uniques in three grades with the odds turning over with depth, enough to equip the party in uniques several times over (`docs/briefs/C4-uniques.md`); launch after the Wednesday 10/28 reset, after C3-critic, one agent at a time
- [ ] C4-fixes: the critic's issue list plus DEEP_STACKS_BALANCE 7 items 4 to 10, then flip CAVE_LIVE, the publish gate list on a quiet machine, Scott's explicit yes
