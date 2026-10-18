# Playtest: Episode 1 end to end (W3-integrate)

What the integrator played, what broke, what was fixed, and what still feels off. Numbers come from
`qa/autoplay.py` runs on 2026-10-17 (desktop 1920x1080 and phone 844x390@3); every run records
`qa/out/autoplay/<device>-report.json`, `<device>-dialog.log` (every line of dialogue the bot read) and a
screenshot every 30 s and on every map change.

## 1. How it was played

- By hand through `LQ_DEBUG` probes for every seam (title, name entry, prologue, each cutscene, each door,
  the three puzzles, the boss door, the credits hand-off).
- By the bot, `python next/qa/autoplay.py`, which plays as a player would: it reads state through
  `LQ_DEBUG`, moves and talks through the input layer (`LQ_DEBUG.press`, or real keys with `--keys`),
  pathfinds on the maps' walk model (`qa/autoplay_grid.mjs` over `tools/maps/mapcheck.mjs`) with the live
  field overlaid, fights every visible enemy on its way with Auto battle at 2x, buys at the shops, rests at
  the inn when hurt, saves and reloads at three points through the real menus, solves the push blocks, the
  hub switch, the crystals and the Lantern bridges, and reaches the credits.
- `python next/qa/autoplay.py --wrong-order`: a fresh game for every prefix of the main flags, every map,
  every NPC, sign, book and object talked to, with the safe choice taken everywhere.

## 2. Seams fixed (each with a test in `qa/integrate/seams.test.mjs` where the logic is pure)

| Where | Observed | The one change |
|---|---|---|
| `src/core/input.js` | Enter on the name entry typed the glyph under the cursor ("ArdenA") instead of finishing; the help bar promised "Enter when done" | Enter in text mode goes to the text buffer (`takeText()` returns `'Enter'`, as documented) |
| `src/world/events.js` `breakPot` | A broken pot kept its `solid: true` override: the shards blocked the floor and the F1 key puzzle could not be solved by anyone (the block cannot slide over them) | The override is cleared when the pot breaks |
| `src/world/events.js` `pushBlock` | A block refused to slide onto a tile holding any present event, including a broken pot | Shards (and plates, triggers, lights) are pushable-onto |
| `src/scenes/field.js` + `events.js` `pitDropAt` | A `pit` area event swallowed the party on every floor tile it covered: the F3 pit room dropped you on entry, and the cache stairs landed inside the area (a fall loop) | Only pit tiles fall; the area event just says where they drop to (same as the walk model) |
| `src/world/events.js` `refreshEntities` + maps | A despawned scripted actor came back on the next flag change (the Echo Warden reappeared on the pedestal as its flag was set; the Archivore stood up again after "Let's go home"), and both stood there again after a reload | Despawned entities stay gone until the map reloads; the two boss actors carry `ifNot` their flag; an actor leaves on its scene's cue, not the instant its flag flips |
| `src/scenes/field.js` `bark` | The dark-room remark fired 40 frames after the F3/boss map loaded, under the arrival scene's own dialogue (two dialog windows stacked, both advancing on one press) | Barks wait for an idle field and play at the next quiet moment |
| `src/scenes/field.js` `rebuildParty` + `pathfind.js` `trailingTiles` | Followers stacked on the leader when the tile behind was a wall (every interior doorway) and when a member joined | Followers fall in beside the trail; a new member takes a free tile next to the leader |
| `src/scenes/battle.js` | "Hero" in the battle HUD while menus and saves said "Arden" (the shots' debug game) | The debug game carries the running hero's name; defaults to the shots' name |
| `src/scenes/battle.js` draw | The Victory window covered the help bar and the timeline | Both hide while the rewards windows are up |
| `src/ui/list.js`, `src/core/touch.js` | Touch rows had no slop (18 css px on a phone); tablet A/B were 52 css px | One row of touch slop around every list (a tap left of the list no longer computes column -1); A/B at least 56 css px, stacked more steeply on narrow bars so both stay on the bar |
| `src/world/lighting.js` | The ending's "night" read as dusk | A deeper night tint |
| `src/world/events.js` `interactables` | NPCs were looked up by the tile their event was placed on, so a wandering NPC (Tess, Edda, Cobb, the hens, Lark, the Duke, Anvil) could only be talked to while standing at home, and facing her empty home tile "talked" to her from afar. The letters side quest could not start | NPCs and scripted actors answer where they stand; a vacated home tile is floor |
| `src/data/maps/archive_f2.js`, `archive_boss.js` | The Echo Warden and the Archivore stood in their rooms again after a reload once beaten | `ifNot` their defeat flag on the actor events |
| `docs/WORLD.md` | Documented `LQ_DEBUG.scene(id)` for running a cutscene, but `scene` is the engine's reserved top-scene query | `LQ_DEBUG.call('scene', id)` |
| `src/scenes/field.js` `giveItem` + `game/inventory.js` `grant` | Equipment from chests and scenes (Hatchet, Iron Pike, Chain Shirt, the Wayfarer set, Thornwake, the First Quill, the charms) was stored as a counted item, never as a gear instance, so it could not be equipped | `grant()` routes equipment to the bag as instances, consumables and key items to the counts; the toast shows the instance |
| `src/scenes/battle.js` | `game.playtime` only advanced while the field updated: no battle counted toward the menu's Time | The battle scene advances the clock too |

## 3. Autoplay results

Desktop (1920x1080), fresh game from the title, engine at 3x, instant text, Auto battle at 2x, running
everywhere, every side quest and secret: **ok** in 11.5 min wall, 48 fights, 3 game overs (every retry
landed at the map entrance with full HP and the plan resumed), 401 dialogue lines read, three save/load
round trips, zero console errors, zero engine errors, zero console warnings. 43 story flags set at the end:
every main flag, all four side quests complete (Wayfarer Boots, Bronze Charm, River Charm, Hi-Potions), Hal
home, Thornwake, the First Quill and the Wayfarer Mantle found.

Phone (844x390 @3, touch overlay on, same plan): **ok** in 10.3 min wall, 40 fights, 1 game over (F3),
three round trips, 401 dialogue lines, zero console errors or warnings. Its in-game clock read 29.1 min
because the battle-time fix had landed by then (the desktop column in section 6 predates it).

Wrong-order sweep (every prefix of the main flags, every map, every NPC, sign, book and object): zero
console errors; the findings that were real bugs are in section 2 (wandering NPCs). The rest are sweep
limits (objects behind puzzles, up stairs or across pits it does not solve).

## 3b. Where to look

- `qa/out/autoplay/desktop-NNNN-<map>.png`: the full desktop run, one frame per map change and every 30 s.
- `qa/out/autoplay/desktop-full-report.json`, `desktop-full-dialog.log`: the run's report and every line read.
- `qa/out/desktop-story_*.png` and `phone-story_*.png`: the 17 `story_*` shots (one per scripted scene) from
  `python next/qa/shots.py`; the whole set (125 shots over desktop and phone) passes with zero console errors.
- `qa/out/autoplay/desktop-wo-report.json`: the wrong-order sweep's findings.

## 4. Save and load

Round trips through the real menus (Save -> slot, Quit -> title, Continue -> slot) compare map, position,
flags, items, gold, party and name: town (chapel), F2 after the Lantern, F3 before the boss door.

## 5. Performance (headless Chromium 1920x1080, 1x)

| Map | update ms | draw ms |
|---|---|---|
| willowmere | 0.08 (max 1.5) | 0.26 |
| valley | 0.07 | 0.61 |
| archive_f3 (dark, lit) | 0.06 | 0.78 |

Well inside the 1 ms / 3 ms budget.

## 6. Timing table (desktop, the clean full run)

Two clocks: the bot's wall time at engine speed 3 (so engine minutes are about three times the wall column),
and the in-game clock `game.playtime`. Before this wave the in-game clock only ran on the field (battles did
not count); it now counts battles too, so the next run's clock will read higher than the column below.

| Segment | In-game clock (field only) | Wall min, speed 3 | Lv after | Gold after |
|---|---|---|---|---|
| Title, name entry, prologue | 0.3 | 0.1 | 1 | 80 |
| Wake-up scene, the fading sign | 0.3 | 0.1 | 1 | 80 |
| Mael, errands (Tess, Wick, the Duke, Nella, Oren, the starter, Hazel), Mira joins | 3.0 | 1.0 | 1 | 80 |
| Bram joins at the gate | 0.7 | 0.2 | 1 | 80 |
| Shops, chapel save, round trip 1, inn, leaving town | 1.6 | 0.8 | 1 | 10 |
| The valley: fights, milestone, peddler, Nella's bell, the Archive door | 1.7 | 1.6 | 4 | 252 |
| F1: letter, pots and block, key, plate room, east wing, the bell | 3.5 | 1.8 | 5 | 562 |
| F2: east wing, hub switch, west wing, the Echo Warden | 1.6 | 1.6 | 7 | 1466 |
| The Lantern of Recall | 0.2 | 0.1 | 7 | 1466 |
| Ink bridges, exit scene, round trip 2 | 0.3 | 0.1 | 7 | 1466 |
| F3: stacks, bell hollow, crystals, key, pit cache, font, round trip 3, boss door | 3.2 | 3.1 | 9 | 2948 |
| The Archivore (12 rounds) | 0.4 | 0.3 | 10 | 3448 |
| Root passage, Whisperwood secret, ferry home, return, ending, credits | 1.3 | 0.6 | 10 | 3482 |
| **Total** | 18.2 | 11.5 (about 35 engine minutes) | | |

A person reading at normal text speed, fighting at 1x with the menu, and exploring without a map should
land in the 60 to 90 minute target; the bot's 35 engine minutes is the floor with every wait removed.

Battles (48): valley 11 (3 to 10 rounds, avg 6.5), F1 7 (5 to 7), F2 11 (3 to 10), F3 18 (3 to 10),
the Archivore 12 rounds. The three game overs were all on F3 (ink wraith pairs and the golem groups) at
Lv 7 to 8 on Auto; the plan re-hunted the floor and went in at Lv 9.

## 7. What still feels off (for the polish wave)

Honest, in the order a player meets them.

1. **Auto battle loses on F3.** Three game overs in one run, all to ink wraith pairs and tome golem groups at
   Lv 7 to 8 with Auto on. A human would Defend and heal; `battle/ai.js partyAction` does not use potions or
   Mira's heal early enough. Either the F3 groups are a notch too strong for the expected level or the party
   AI needs a "heal under 40%" rule. The Archivore itself was fine (12 rounds, no KO).
2. **The in-game clock ran only on the field** (fixed now, see section 2); the menu's Time will read higher
   than before for the same play.
3. **Barks arrive late.** By design now they wait for an idle field, so the first-chest line comes after
   the toast, and the dark-room line after the arrival scene. That is better than stacking, but the remark can
   land a beat late when the player is already walking.
4. **The night ending.** Even with the deeper tint the bell tower scene reads as a blue evening rather than
   night; the town still has its daytime lamps unlit. A proper night palette for Willowmere (lit windows and
   lamps, darker sky band) would sell the "That night..." card.
5. **Pit room readability (F3).** The pits are scattered grey squares; the first fall is a surprise. A rim or
   a darker inner shadow would make them read as holes before you step on one.
6. **The Whisperwood secret** is only findable with the Lantern on the way home, and nothing hints at it; the
   milestone or Quill could mention the clearing.
7. **The shop at the smithy** sells nothing the party can afford before the Archive (80 gold at the start;
   the cheapest armor is 90). Either a 40 to 60 gold piece, or 100 starting gold.
8. **The Whisperwood ink bridge and the F3 cache bridge** reveal with the same green sparkle as a wall glyph;
   bridges deserve a bigger "bridge_appear" moment (the sfx exists, the visual is three tiles swapping).
9. **Talk-to position.** Wandering NPCs now answer where they stand, but their talk-prompt glyph still
   assumes the sprite's home tile for the "faces the player" turn in some cases; worth a look in the polish wave.
10. **Two dialog windows can still stack** if a scene is started by an interact trigger while a bark is
    queued; the queue drains only when the field is idle, so this should be rare, but it is not impossible.
11. **Game over retry puts the party at the map entrance**, not at the last save; on F3 that is the top of the
    stairs, a long walk back to the boss door. A "retry from the last Keeper's font" would be kinder.
12. **Headless performance** is fine; a real mid phone was not measured in this wave.
