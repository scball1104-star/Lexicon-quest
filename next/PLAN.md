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
- [~] H3-vows: Vow table, rest-flow row, battle and field hooks; writes the Hard Road proposal doc, no code (`docs/briefs/H3-vows.md`)
- [ ] H3b-hard-road: post-game mode, shape to Scott first
- [ ] H4-truth: six to eight Name Truth choices and remembered lines
- [ ] H5-floor-hooks: floor-ending questions and boss intro lines
- [ ] H6: critic, play-critic, fixes, publish gate list, Scott's explicit yes
