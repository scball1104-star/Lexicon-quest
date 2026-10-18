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
