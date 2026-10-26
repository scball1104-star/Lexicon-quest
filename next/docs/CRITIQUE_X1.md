# CRITIQUE X1: the Wider Valley, art, UX and play flow

Read-only review, 2026-10-26, branch `overhaul`, `X1_LIVE = true` on disk, unpublished. Bar: Chrono Trigger, Lufia II, FF6, with the phone as the bar.
Method: the integrator's 15 X1 shots (`qa/out/phone-*` and `desktop-*`), the map previews in `tools/maps/previews/x1_*`, and my own headless
Chromium runs of the real game (phone 844x390 at 3x, one browser job at a time): loads from the Episode 1 credits save, a Lv 8 save in the
Downs, a Lv 3 save in the Barrow, a pre-first-fight save, the three Episode 2 saves, a save with the x1 pack blocked, warps to every new
map with shots on the wide maps, Talk text read from the live game, the Lantern at the cleft, Appraise on Patch, a chase-pace test, and
an audio decode of all 8 tracks. My shots and scripts are in `qa/out/reviewx1/` (`phone-rv-*.png`, `sheet_*.png`, `t*.py`).
Claims are **Fact** (seen in a shot, a run or a source line, named), **Reported** (from a plan, brief or log) or **Inference** (with the check
that would settle it). Sizes: **S** = hours, one file or a data change. **M** = about a day. **L** = several days or a new art set.

## 1. Verdict

The expansion looks and reads like the same game, and in places better than the valley it hangs off. The three dungeons are three different
rooms (green moss and turf in the Barrow, a starry library floor in the Cellar, wet red brick and iron in the Culvert), the Loom House, the
Orrery and the Mill are as warm as Willowmere's interiors, the moor and Larchhill read as places with their own colour (heather and gorse; stone
terraces and orchards), and the new text is the best writing in the project: short, odd, kind, no em dashes in any `src/data/x1` file (Fact,
scanned), no explained forgetting, no invented offers. Optional foes follow the loosened rules: a chase foe 3 tiles away started closing only
after about 20 frames and took about 100 frames to reach a party standing still (Fact, run).

What holds it back is not art, it is **finding and keeping the way**. The two doors into the west close to nothing once they open, the only
"where next" channel (Talk) is crowded out by older lines, a failed pack load can strand a save in a developer test map, and the loot at the end of the
longest puzzles is no better than a shop. None needs a new system. Zero blockers, four majors, eleven minors.

## 2. Findings, ranked by player impact (four-field fixes)

### Major

**1. The way west is a bare map edge once it opens.** (S)
- Where: `valley` cells (0, 28..29) (`x1_downs_door`), `willowmere` (0, 16..17) (`x1_west_gate`); `qa/out/reviewx1/phone-rv-v_west.png`,
  `phone-rv-w_gate.png`, `phone-rv-pre_valley_gate.png`, `phone-rv-pre_willow_gate.png`.
- Observed (Fact): before `first_fight_done` two stand-in signposts mark each edge ("A drovers' gate, tied shut", Holt's notice). When the gate opens
  they are removed and nothing replaces them. Willowmere's edge at least has a dirt lane running into it; the valley's is tall grass at the screen edge, with
  no path, post or lamp, identical to any impassable border. The marking is stronger while the exit is closed than while it is open. The first region
  of the expansion is found only by Talk or Mira's banter line (finding 2), or by luck.
- Change: when the gate opens, draw a permanent open-gate prop (an open drovers' gate or a signpost reading THE DOWNS) on the two cells beside the arrival
  cell, and lay a worn dirt strip into the valley edge (x 0..3, y 27..30).
- Must stay fixed: arrival cells (1, 28) and (1, 16) free and walkable, the first-fight trigger column, and byte-for-byte equality of both maps when the switch
  or the region is off (`qa/maps/x1_baseline`).

**2. Talk, the only "where next" hint, shows the old line first and hides most new ones.** (S)
- Where: `src/data/quests.js` `partyChat` (maxSide = 1, picks sorted only by `nudge`), `src/data/x1/quests.js`.
- Observed (Fact, `partyChat` evaluated inside the running game on the Episode 1 credits save): on every X1 map Talk opens with the Episode 2 line "Mael wanted us at
  the well in Willowmere before we go anywhere." Then ONE side line, and it is the first active quest in `ALL_SIDE_QUESTS` order, not the one for this map: on
  `x1_downs` with Strays started the side line was Quill's pool from Episode 1 ("A root arch beside black water..."), not Brindle's. The new hint shows third, as banter.
  With two or three X1 quests live (Strays, Thirteenth Stone and Crates are routinely live together) only the earliest in the list can ever speak.
  This undercuts the plan's promise that "every quest step names its next step in Talk" (EXPANSION1_PLAN 13).
- Change: in `partyChat`, sort side picks so an entry whose `map` equals the current map comes before one with no map filter (then `nudge`, then list order).
- Must stay fixed: the main hint first, `maxSide` = 1, the Episode 2 and 3 line priority, and every existing Talk result on an old map (regression test with the
  five Episode 1 side quests).

**3. A save inside an x1 map can land in the developer test town if the pack is slow or missing.** (M)
- Where: `src/scenes/field.js` `loadMap` (line 147: "map not found; using the test town"), `src/scenes/loadGame.js` (1.5 s `awaitPacks` guard), `src/world/_testmap.js`.
- Observed (Fact, run): saved in `x1_downs` at (30, 16), with `src/data/x1/index.js` blocked, Continue put the party on `_testtown` at the same coordinates, the Willowmere "name burns
  bright" scene played in it, `game.map` became `_testtown`, and the 5 s auto-retry ("[packs] x1: Failed to fetch") never moved the party. With the pack loadable the same save loads
  correctly (`x1_downs`). `_testtown` has doors only to `_testhome` and `_testdungeon`, no exit to the valley; the safe point is set there too (`lastSafe`), so Retry after a defeat and a manual
  save both keep the party in the sandbox (Inference from `setPosition` and `setSafePoint` in `loadMap`; check: save once in `_testtown`, reload, leave the title).
  No data is lost (flags, items, levels intact) while the old slot survives; saving over it makes the way back a hand edit. Cause is plausible on a phone: 1.5 s is short for a 1 MB first fetch on a weak link,
  and iOS can evict the runtime cache (Inference).
- Change: when the missing map belongs to a pack (`packForMap`), never use the test town: wait up to about 8 s behind the existing fade (retry once inside it), then fall back to the pack's
  town door (Willowmere (1, 16) for x1) with the existing one-time toast, leaving `game.map` and `lastSafe` on a main-game map.
- Must stay fixed: no fetch at all while `X1_LIVE` is false, the toast text and its once-per-session rule, boot never blocked, and saves that need no pack loading as fast as today.

**4. The three puzzle-gated weapons pay like shop stock.** (S, data)
- Where: `src/data/x1/items.js` (`orchard_axe`, `drovers_bow`, `reeves_crook`, `chime_staff`); numbers read from `ITEMS` after `register()`.
- Observed (Fact): Orchard Axe (the Larchhill aqueduct: a hidden path, a Shoved barrel, a gold chest) is ATK 14 crit 4; the shop's Battle Axe (ilvl 5) is ATK 16 SPD -1, the Bearded Axe (ilvl 8) 25.
  Drover's Bow (Barrow Shove niche) is ATK 14 against Hunter's Bow 12 for 370 gold. Chime Staff (tarn islet, Lantern) is MAG 13 against Crystal Rod 11. Reeve's Crook (a boss with a
  puzzle gate) is ATK 17, the same as the existing Valley secret spear Pilgrim's Reach (17) and below the Winged Lance (22). Only the Millwright's Apron (DEF 11, HP 30, poison 50%) feels like a prize.
  Scott's goal is exploration rewards; four of the five unique weapons are sidegrades at the point the player gets them (Inference; check: equip each on the Lv 8 save and compare damage in the sim).
- Change: raise the four weapons about one tier step inside the existing budget test (for example Orchard Axe 20, Drover's Bow 17, Chime Staff MAG 15, Reeve's Crook 21), keeping their riders.
- Must stay fixed: no piece reaches Episode 2's ilvl 9 pieces, the set stays below Wayfarer's Promise, the placed (never rolled) rule, and `qa/battle/x1_items.test.mjs` plus the optional-EXP cap.

### Minor

**5. A pine crown covers the first bridge cell at the cleft.** (S)
- Where: `valley` cleft (21, 6..9), `phone-rv-cleft_lit.png`, `phone-field_valley_cleft.png`.
- Observed (Fact): with the Lantern raised the ink bridge shows as two brown planks poking out from behind a pine, and the leader walks behind its crown to cross. The one visual promise the
  Terrace rests on is half hidden. The cleft also reads as a dark pond, with a river of true water beside it.
- Change: drop the pine at about (21..22, 9..10) (the hub already drops five pines for the notch) and draw the faint bridge with a lantern-yellow edge so it reads from the lip.
- Must stay fixed: the cell the party starts the bridge from (21, 9 to 10), `x1_cleft_fall` landing, and the cleft sign.

**6. The wheel says the pin is missing while the pin is in the pack.** (S)
- Where: `src/data/x1/story.js` `pin_place` (guard `pin_found && mill_started`).
- Observed (Fact, run, `phone-rv-dialog.log`): with `pin_found` and `millstone_pin` held but Hal not yet spoken to, the wheel reads "Whatever fits it is not in your pack yet." The plan allows the Culvert first.
- Change: when the pin is held and `mill_started` is not set, say "The pin would fit. Hal ought to be here for this." (and Talk names Hal).
- Must stay fixed: the one-shot chain into `mill_done`, and the `x1_mill_wheel` inspect line.

**7. The optional bosses are walls for a button-masher, and the weakness is told late.** (S)
- Where: `docs/BATTLE_X1.md`, `qa/out/sim_check.log` lines 139-198; `src/data/x1/story.js` `reeve_intro`, `golem_intro`.
- Observed (Reported, sim): at the recommended levels a competent player wins 100% losing about 23% HP; a naive one wins 2% (Reeve Lv 5), 55% (Lv 6), 3% (Golem Lv 6). Neither boss can be fled.
  The weakness (bow and light; thunder and axe) is named only in a conditional Talk line and the bestiary. Inference; check: lose the Reeve at Lv 5 on the phone and read what the retry teaches.
- Change: one box in each intro where Mira names the weakness (the Reeve: bow and light; the Golem: thunder and axe), in her existing voice, no stat change.
- Must stay fixed: the fonts before both fights, `canFlee: false`, the EXP multiplier and the optional cap.

**8. The Reeve is the quietest boss shape in the game.** (M)
- Where: `phone-battle_barrow_reeve.png` against `phone-battle_boss.png` and `phone-battle_millstone_golem.png`; the field figure in `phone-rv-reeve_lost.png`.
- Observed (Fact): the Reeve is olive and tan on a green-grey brick backdrop, no bright focal point; the Archivore has the yellow eye and the Golem the cream millwheel. In the field the Reeve at the end of his
  table is a villager-sized grey figure.
- Change: add one bright accent (the crook head catching light, or two pale eyes in the hood) and a cold backlight behind him on `battle_barrow`.
- Must stay fixed: the silhouette, the `barrow_reeve` frame ids, the 3-shield row and its position clear of the touch command window.

**9. The hives read as little faces.** (S)
- Where: `x1_larchhill` hives, `phone-field_larchhill_windmill.png`, `phone-rv-l3.png` (sheet_lt.png).
- Observed (Fact): a white box with two dark slits under a brown cap reads as a small robot or ghost at phone scale; 40 of them crowd the apiary.
- Change: redraw the hive entrance as one dark arch, add a band of straw or wood grain, and vary two of the three heights.
- Must stay fixed: the 16 x 16 footprint, the hum SFX hook (`hive_buzz`) and the solid collision.

**10. The Appraise bark never names the action.** (S)
- Where: `src/data/x1/text.js` `first_appraise_object`; `src/world/abilities.js` (pageL cycles, pageR uses).
- Observed (Fact, run): Mira's "something wrong with that scarecrow's pockets" fires only when the leader faces Patch within 4 tiles, interrupts input (my first pageR was swallowed by it), and does
  not say to use Appraise. After pageL the "!" and lens over Patch are clear and good (`phone-rv-sheet_appraise2`). Episode 1 taught Appraise on foes, so many players will connect it; a returning player may not.
- Change: add a second box, Mira: "Let me have a proper look." (no button instruction in the text; the pill already shows it).
- Must stay fixed: the "!" marker, the range of 4, one bark per save.

**11. The culvert arch and the weir read as a fence.** (S)
- Where: `x1_millrace` (43, 22), `phone-field_millrace_mill.png`, `tools/maps/previews/x1_millrace.png`.
- Observed (Fact): the arch is a 1-cell dark gap in a hatched grey wall that looks like trellis; the only mark is a tiny red lintel. The Culvert is the Four Rolls quest's second leg.
- Change: widen the arch to two cells with a lit lamp on each side and put the Drovers' chain colour on the lintel.
- Must stay fixed: the door cell and the return arrival (3, 14).

**12. The tarn is a starfield, not water.** (S)
- Where: `x1_highmoor` tarn, `phone-rv-m2.png`, `phone-rv-m3.png` (sheet_moor1.png).
- Observed (Fact): the "black water" uses the dark-with-specks void of the Cellar, so the Hidden Fold bridge reads as walking over space, and the bench "facing the black water" has no water.
- Change: a two-tone navy with a pale reflection stripe, keeping the Lantern ink route as is.
- Must stay fixed: the tarn's collision (a pit when no ink), the islet chest.

**13. The Terrace's east half is a long empty walk, and the drop is a black square.** (M)
- Where: `x1_terrace` (36..58, 8..18), `tools/maps/previews/x1_terrace.png`, `phone-rv-t1.png`, `phone-rv-t2.png`.
- Observed (Fact): lamps and cairns repeat at even spacing along an unbroken strip to a one-way drop drawn as a dark hole beside a sign reading THE QUICK WAY DOWN. Compared with the moor, no place to look at.
- Change: one landmark (a collapsed arch or a second armillary on a plinth) and a short parapet around the drop.
- Must stay fixed: the roots chest (47, 9), the one-way drop target (valley (36, 8)), the safe lane from the west door.

**14. Watch item: the two main bosses at the accepted completionist levels.** (S, no change asked)
- Where: `qa/out/sim_check.log` ("Optional EXP" table).
- Observed (Reported): Echo Warden at Lv 9, competent: 5.7 rounds against a 6-round target minimum, 12% HP lost; Archivore at Lv 11: 7.5 rounds against 8, 22% HP lost. Both under the design minimum, neither a pushover on the
  naive profile (not tabled). Scott accepted +3 levels. The plan's "one level over" is not what ships (Reported, plan 0 against the log).
- Change: none now; if a playtest calls either fight a pushover, add 1 shield to the Echo Warden first, not HP.
- Must stay fixed: the main route's today levels (6 and 8 on the regular route), the sim "All targets met".

**15. The far Watchtower in the valley hides behind the title banner.** (S)
- Where: `valley` decal `x1_far_tower` at (9, -2), `phone-rv-v_farwatch.png`.
- Observed (Fact): a grey broken tower at the very top, partly under the "Willowmere Valley" banner on entry; the Downs-side one and the Windmill decal in the Downs (`phone-rv-dn_se.png`) read well as promises.
- Change: lower the valley decal by 2 cells and add the thin chime wires so it reads as the moor's tower.
- Must stay fixed: no fog or lighting cost (plan 3.4), the decal as overhead only.

## 3. Text quality (checked, no ranked fix needed)

- Tone against EPISODE1 section 4: held. Nobody explains the forgetting; Hal, Brindle, Pell, Hesper and Odo count things that will not come out. Fact (story.js, text.js, quests.js read end to end).
- The one line to watch is the Cellar's first page, "An order reached us. We did not obey it.", which names an unseen order. It sits near the edge of what plan 5.5 allows ("does not explain the list-writer"). Inference; settled by Scott.
- Placeholder names are still pending Scott (Wystan, Reeve of the Fold; the twelve stone names; Calder Wynn, Isaura Pike, Brannoch Teal; the moor song) per `X1_NAMES_TO_CONFIRM`; they are one place to edit.
- No invented offers or wages anywhere (Pell's "tenth off" is a shop discount, not a policy).
- The nine chime-post words end on KEPT; it reads as story, not a puzzle.

## 4. Sound (decoded in the browser, not listened to)

Fact (decode of the eight tracks): all sit at RMS -17.7 to -20.2 dB beside the old tracks at -18.9 to -20.9, so the level is consistent. Loop seams: no click (sample jump 0.001 to 0.048; `millrace` 0.048 equals the old `valley` 0.049),
and the energy dips at the loop point are the same shape as the old tracks (`millrace` -26 to -25 dB, `wethers_barrow` -22 to -20, `orrery` -25 to -20). `boss_millstone` ends 5.4 dB hotter than it starts (-15.7 to -21.1 dB over the last second):
deliberate per the brief, audible as a drop at the loop. Loops are 78 to 100 s against the valley's 149 s, so the field music repeats sooner (Inference; 1 minute of play on the Downs is the check). I did not listen: whether the eight sit in the game's voice is **not checked**.

## 5. Protect these

- The three dungeon identities (`phone-dungeon_barrow_slabs`, `_cellar_route`, `_culvert_plates`): mossy turf, starry library floor, red brick and iron. Do not unify the palettes.
- The Reeve's Hall room: the long table, thirteen niches, the blue font a step from the boss (`phone-rv-reeve_lost.png`).
- The Orrery and Mill interiors (`tools/maps/previews/x1_orrery.png`, `x1_mill.png`) and the Loom House.
- The moor's heather-and-gorse palette, the chime posts and the three-route layout (`tools/maps/previews/x1_highmoor_routes.png`); Larchhill's terrace stairs and aqueduct.
- Thornfold as a hamlet (Willowmere's kit in warm dirt), the Stones lettered scene, the Windmill and Watchtower decals as promises.
- The Appraise "!" and lens marker over Patch, the Lantern prompt pill at the cleft and the tarn, the cracked-wall and root tells (a dark slot with branches).
- The chase pace and aggro radius: a 3-tile notice, a slow start, a flee is possible.
- Boss intro cards (THE BARROW REEVE / Keeper of the Count; MILLSTONE GOLEM) and the font-before-boss rule.
- The writing: voice, counts that never come out, no em dashes, no explained forgetting.
- Episode 2 saves (court_f1, court_f2, nh_inn) load clean with X1 on (no errors or warnings), and a missing pack does not crash, lose flags or levels.

## 6. Not checked

Whether the eight tracks sit in the game's voice (not listened); real touch feel on a device; the typical, casual and completionist times (plan 13: about 97 minutes; I did not time a run);
losing to each boss and retrying (my Lv 3 Barrow run stood at the Reeve's door with no game-over scene and no win line in the dialog log, so the retry path is unconfirmed); a mid-Archive Episode 1 save (none was on disk;
the Episode 2 saves were used); the Culvert and Barrow puzzles beyond the shots; the Hidden Fold and every route end to end; desktop shots beyond the integrator's; the pack download time on a slow network
(only a blocked-pack test); night and lighting variants; the play-critic's pacing and EXP questions (the next review).
