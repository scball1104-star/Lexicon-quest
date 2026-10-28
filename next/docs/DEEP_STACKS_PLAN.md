# The Deep Stacks: a 100-floor Ancient Cave for Lexicon Quest

Written 2026-10-26 (late). Status: DESIGN, decided by the orchestrator under Scott's "you build the details";
his open calls are in section 13 with defaults chosen so work proceeds. Built in waves (section 12) with up to
three agents at once under the usage guard (Scott, 2026-10-26: "You can use multiple agents to get this work
done"). Lives on `overhaul`, unpublished until Scott's explicit yes. Working name: **the Deep Stacks**
(alternatives in 13.1).

## 0. Scott's words (2026-10-26)

> I want an extra dungeon akin to the Ancient Cave in Lufia 2 also. Where only for the dungeon, your levels start
> at 1, you start with no gear. You level up as you fight and gain gear from drops and chests. The dungeon has
> 100 floors with progressively harder enemies. When you leave the dungeon, with the special item, your next
> visit into the dungeon starts the same at level 1 and no gear except for special unique gear that you can find
> only in the dungeon. That gear can be used at the start of the dungeon and in the rest of game. You build the
> details.

Every rule below that is not his sentence is my design (Inference) and he may change it.

## 1. The pitch

Under Willowmere's library, past a trapdoor the Keepers sealed, the Deep Stacks go down a hundred floors: the
shelves nobody catalogued, where the Book of Names kept what it could not file. Every descent is a fresh reading:
the party goes in at level 1 with empty hands, grows floor by floor on what the Stacks give, and leaves only with
what the Stacks let them keep. Red chests are the Stacks lending; blue chests are the Stacks giving. The one way
out alive is the Keeper's Bookmark.

What we take from Lufia II's Ancient Cave: level 1, no gear, random floors, red chests lost on exit, blue chests
kept, Providence as the escape item, a boss at the bottom, the deepest-floor record. What we change: a suspend
save so a phone session can stop (resume only, never a manual save); landings every ten floors; a pity rule so a
blue chest is never more than ten floors away; the Bookmark is the only way to bank this run's blue gear, so a
death costs you this run's finds (Diablo tension, Lufia frame).

## 2. Rules of a run (the contract)

1. **Entry.** The trapdoor in the library opens once `ep1_complete` is set (the Archivist, a new NPC, sits by
   it from then on; before that the trapdoor is a locked inspect line). Talk to the Archivist: three boxes of
   rules in character, a yes or no, a confirm. Only the full current party enters (hero, Mira, Bram once joined;
   Episode 2 and 3 members as they exist).
2. **The reading starts.** `cave.enter(game)` snapshots the overworld party (levels, EXP, HP/MP, skills,
   mastery, worn gear, `gear`, `items`, `gold`, `map`, `pos`, `lastSafe`) into `game.cave.snapshot`, then sets
   every member to level 1 with level-1 stats and skills, mastery 0, nothing worn, `gear` = the banked cave
   uniques (`game.cave.vault`, instances), `items` = empty, `gold` = 0. Flags, the Ledger, Vows and quests are
   untouched. `game.cave.run = { seed, floor: 1, blues: [], chests: 0, kills: 0, started: playtime }`.
3. **Floors.** B1 to B99 are generated from the run seed and the floor number (section 4). B100 is a fixed
   boss floor (section 5.4). Each floor: one way down (stairs, never adjacent to the arrival), red chests, a blue
   chest when the pity rule says so, visible foes that chase (Lufia), no fonts, no shops, no NPCs. Every tenth
   floor (B10, B20, ...) is a **landing**: no foes, one red chest, one guaranteed Keeper's Bookmark if the
   party holds none, the floor's name on a plaque, and the suspend save.
4. **Growing.** EXP inside the Stacks pays 1.5x the base curve, so a party reaches about level 12 by B10,
   25 by B30, 40 by B60, 55 by B90 if it fights what it meets (the sim proves the curve, section 11). Gear comes
   from foe drops and red chests, rolled at the floor's item level (section 6). Gold drops; there is nothing to
   buy; gold is lost on exit (it was the Stacks' gold).
5. **Chests.** Red chest: a normal loot roll at the floor's item level, plus consumables, plus the Bookmark
   when rolled. Lost on exit, like everything else from the run. Blue chest: one cave unique (section 6.2)
   not yet in the vault, kept if the run is banked. At most one blue chest per floor.
6. **The Keeper's Bookmark.** A key item, consumable, found in red chests (chance rises with depth: 4% per
   chest on B1 to B9, 8% on B10 to B29, 12% deeper) and guaranteed on every landing when the party has none.
   Using it from the menu (any floor, any time out of battle) **banks the run**: this run's blues join
   `game.cave.vault`, the record updates, the party is restored from the snapshot, and the party stands by the
   trapdoor with the Archivist's one line. The Bookmark is consumed.
7. **Death.** A party wipe inside the Stacks is not a Game Over. The screen reads "The Stacks close." and the
   party wakes by the trapdoor, restored from the snapshot. **This run's blue finds are lost** (the ones in
   `run.blues`); the vault from earlier runs is untouched; the record keeps the floor reached.
8. **Leaving any other way** is impossible: the stairs only go down; the menu's Quit from inside the Stacks
   asks once and counts as a death (section 2.7), so nobody loses a run by accident.
9. **Suspend save.** On every floor arrival the game writes one suspend save (slot `cave`), separate from the
   four slots. The title's Continue offers "Resume the Deep Stacks (B23)" when it exists. Loading it resumes at
   the floor's arrival point with the same seed; it is deleted on bank, death or Quit. Manual saves are refused
   inside with the Archivist's line ("The Stacks keep their own pages.").
10. **The next reading.** Entering again starts at B1, level 1, nothing but the vault's uniques in `gear`
    (equip them at once from the menu, the Archivist reminds you once). The record (deepest floor, readings,
    time) shows on the Archivist's plaque and in the Journal.
11. **Uniques outside.** Vault uniques are ordinary items in the overworld inventory too (one instance, shared):
    when the party leaves the Stacks they come out worn or in `gear` exactly as they were; entering again brings
    them in. They never drop, never sell, never lose on death outside.
12. **B100.** The Binder (section 5.4). Beating it banks the run on the spot (no Bookmark needed), gives the one
    prize unique that only it holds, sets `deep_stacks_cleared`, and adds the mark to the title screen. The
    Stacks stay open afterwards for records and the remaining uniques.

## 3. Entrance and framing (story data, no lecture)

- Map `library`: a trapdoor event at the back wall (`stairs('stacks_down', ...)` into `cave_landing0`, the
  entrance hall under the library, a small hand-made map with the Archivist, the plaque, and the first stair).
- **The Archivist** (`npc_scholar` sprite, portrait `iris` is wrong; the sprites agent in C2 sources a new 48 px
  head or reuses `npc_old_woman` with a grey wash; named **Edda's sister, Wren of the Stacks**? No: Wren exists
  in Episode 2. Name: **Hollis**, "the one Keeper who stayed down"). Lines: rules in three boxes, the record,
  the send-off, the return, the refusal of a save, the death line. All in `src/data/cave/story.js`.
- The plaque text per landing (ten lines, one per landing) and the B100 approach text: `src/data/cave/text.js`.
- Journal: a "Deep Stacks" line under the main quest once opened: record and vault count.

## 4. Floor generation (`src/data/cave/gen.js`, pure, seeded)

- Input `(seed, floor)`, output a map module object the engine already accepts (`registerMap(mod)` in
  `src/world/maps.js`): `id: cave_bNN`, `ground` rows, `legend`, `overlays`, `decor`, `events`, `music`,
  `lighting`, `tileset`, `backdrop`.
- Grid 40x30 to 56x40 (grows with depth). Rooms from a prefab library (`src/data/cave/prefabs.js`): 8 to 12
  rooms per floor from 30 to 40 hand-authored room templates per tileset family (each template is ASCII rows
  with mark points for chests, foes, stairs; the author keeps the house map style, DESIGN section 5), joined by
  corridors on a spanning tree plus one or two loops. Dead-end rooms hold chests. The stair is placed in the
  room farthest (by walk distance) from the arrival room.
- **Bands and look** (tilesets exist today; no new sheets in wave 1):
  B1 to B19 the Catalogue (archive sheet, warm lamps), B20 to B39 the Root Cellars (hollow sheet, roots and
  water), B40 to B59 the Court Below (court sheet, cold stone), B60 to B79 the Ember Shelves (ember sheet),
  B80 to B99 the Forge of Names (forge sheet). Backdrops and lighting per band; the band's music from the
  existing tracks (archive, mystery, court, ember, forge families). Landings reuse one hand-made landing
  template per band with the plaque.
- Foes per floor: 4 + floor/10 (max 12), from the band's pool (section 5), each a field enemy with a chase or
  wander behaviour and an encounter id the generator registers at run time (`ENCOUNTERS[id] = {...}`).
- Chests per floor: red 2 to 4 (more in dead ends), blue by the pity rule: a blue chest appears on a floor when
  `floor - lastBlueFloor >= 10` or on a 7% roll per floor, never two in a row, never on a landing, and only
  while the vault is incomplete (otherwise a red chest with a rare roll).
- Determinism: the same `(seed, floor)` gives the same floor on every machine (tests depend on it). The
  generator never calls `Math.random`; it takes a PRNG from `src/core/rng.js` (exists? C1-gen checks, else adds
  a tiny xorshift in its own folder).
- Walkability is proven by the generator itself (arrival to stairs reachable, every chest reachable) and by
  `qa/maps/mapcheck` on 200 seeds in tests.

## 5. Foes and difficulty (`src/data/cave/foes.js`, data)

1. **Pools by band**, drawn from foes that exist (39 in `enemies.js`, plus X1's and Episode 3's when live), in
   the order the base game meets them: the Catalogue = valley and Archive F1 foes; Root Cellars = Archive F2,
   F3 and Hollow foes; Court Below = Episode 2 court foes; Ember Shelves = Episode 3 cinder foes; Forge of
   Names = forge foes plus every earlier pool's elites. A pool is a list of encounter templates (2 to 4 foes,
   a leader) the generator picks from.
2. **Scaling per floor**: every cave encounter carries `hp`, `power`, `speed`, `expMul` multipliers from a
   curve in `foes.js` (`scale(floor)`), tuned so that a party that fights what it meets and wears what it finds
   is at about the foe's level all the way down (section 11 proves it). Elites (existing `ELITE_MODS`) appear
   from B20, two mods from B50.
3. **No new foe art in wave 1.** Recolours later if the critic asks.
4. **B100, the Binder.** A fixed floor (hand-made, `cave_b100.js`): a boss built from the Archivore's art
   (recoloured, or the Nameless King's if the sprites agent prefers), three phases, the game's hardest fight at
   level 55 to 60. Its data in `foes.js`, its scene in `story.js`. Prize: the unique **Binder's Quill** (6.2).

## 6. Loot (`src/data/cave/loot.js`)

1. **Red chests and drops** use the existing loot engine (`battle/loot.js`, `loot-tables.js`): the floor's
   item level = `min(16, 1 + floor/6)`, rarity weights shift with depth (common 70/magic 25/rare 5 on B1,
   30/45/22/3 legendary on B60+), consumables by band. Nothing new in the engine; a `zone` per band with its
   tables.
2. **Cave uniques** (built by C4-uniques on 2026-10-28 from Scott's answer to 13 E; the first sixteen were C1-data's): **sixty in
   three grades**, registered into `UNIQUES` by the pack's `register()` (the X1 pattern, no edit to `items.js`), plus the Binder's
   Quill (B100 only, the best charm in the Stacks). Grades, the "measures of strength": **Lesser** (built at item level 5),
   **Greater** (10), **Named** (16), twenty each: four weapons (sword, staff, spear, axe), four bodies (one for Mira, one for the
   hero or Bram, two for anyone), three heads, three boots, three mantles, three charms, so each grade is a full set for the three
   readers with two to spare, and four of each grade call each band home. Each has a fixed affix set and one property no rolled
   item has; no property twice in a grade, and no property (or numbered family) at more than two grades. Lesser leans to
   conveniences and status proofs (Poison-, Blind-, Silence-, Burn-, Chill-proof, Forge Ward, Downward Sense, Rootbound Step, the
   Inkwell's MP, Owed More, Dog-Eared, Carried Out, Warm Larder) with a few small edges (First Line, two struck elements, three
   scripts at 25%, Thrift 1); Greater to battle edges (striking as ice or thunder, the scripts at 40%, Venom Edge, Thrift 2,
   Already Moving, Hairline, Short Fuse, Mender, Leeching, Ink and Fire Ward); Named to run-changers (Rebound, Better Lent, Kept
   Stores, Marked Pages, Quick Study's EXP, the Standing Grudge's Fury, Unwritten, Clear Voice, Full Index and the bigger
   numbers of the Greater families). The grade is the first lore line ("A Lesser gift: a loose page of the
   Stacks.") and the plaque's, never a number in a name. Strength, by the game's own role weights (`inventory.js weightedGain`,
   status resists counted on neither side): each unique beats the 90th-percentile rolled rare of its grade's item level in its
   slot for its best wearer, every Lesser beats the Episode 2 start's piece in its slot for everyone who can wear it (the Pen
   over Lanternheart), the next depth's rares overtake a grade's stats, and in every slot each reader's best Named beats their
   best Greater, which beats their best Lesser (`qa/cave/uniques_grades.test.mjs`; the table: `node qa/cave/out/uniques_report.mjs`).
   The sixteen keep their ids, slots and properties (band 1 became Lesser, bands 2 and 3 Greater, bands 4 and 5 Named, rebuilt
   at their grade's item level); the Mantle of Kept Names trades doubled gold, which buys nothing in the Stacks, for Kept Stores.
3. **Which blue chest gives which**: a blue chest first rolls a **grade by floor** (`loot.js GRADE_ODDS`, linear between the
   knots below), then a unique of that grade not in the vault (nor found this reading), weighted toward the current band's own
   (4 for the floor's band, 1 for an earlier band, a quarter for a deeper one). A grade with nothing left falls to the nearest grade
   that has something (a tie goes to the grade the floor favours). The Quill is never in a chest.

   | floor | Lesser | Greater | Named |
   |---|---|---|---|
   | B1 | 85 | 14 | 1 |
   | B20 | 60 | 33 | 7 |
   | B40 | 35 | 45 | 20 |
   | B60 | 18 | 42 | 40 |
   | B80 | 7 | 28 | 65 |
   | B99 | 3 | 17 | 80 |

   **How often** (`blueChestDue`): the first blue by B9 (so the first landing's Bookmark always has one to bank), then within ten
   floors of the last; the plan's 7% roll per floor; and a second roll that rises from 0 on B1 to 10% on B99. Never two floors in
   a row, never a landing, at most one blue chest a floor (the generator places one; a literal second chest on a floor would need
   `gen.js` to take `chests.blue: 2`). A deep first reading finds 14 on average (11 to 20), and every banked deep reading finds
   only new ones, so the sixty are all seen in about five (`node qa/cave/out/uniques_runs.mjs`).
4. **The Bookmark**: key item `keepers_bookmark`, consumable, section 2.6.

## 7. What resets and what carries

| | Inside a run | On bank (Bookmark or B100) | On death or Quit |
|---|---|---|---|
| Levels, EXP, skills, mastery | from 1 | restored from the snapshot | restored |
| Worn gear, `gear`, `items`, `gold` | run's finds only | restored; run's blues added to the vault and to `gear` | restored; run's blues lost |
| Vault uniques | available from B1 | kept | kept |
| Flags, Ledger, Vows, quests, Journal | untouched | untouched + record | untouched + record |
| Suspend save | written per floor | deleted | deleted |

## 8. Saves and state (`src/game/cave.js`, pure over `game`)

- `game.cave = { vault: [instances], record: { floor, readings, clears, time }, run: null | {...}, snapshot:
  null | {...} }`, created lazily (old saves load with `cave` undefined and are treated as empty).
- `enter(game)`, `descend(game)`, `bank(game)`, `die(game)`, `resume(game)` are pure; the scenes call them.
- The suspend save is the normal serializer written to slot id `cave`; `saveMeta` shows the floor.
- No change to `state.js` in wave 1; `game.cave` rides on the existing serializer (it clones the whole object).
  If the vows agent's fields and this one land in the same week, the saves tests prove both together.

## 9. UI

- HUD: the floor tag "B23" sits where the Aim line draws (top centre), permanent inside the Stacks (the one
  exception to the clean-HUD rule, because the floor is the aim). Chest sprites: red = the existing wood chest
  tinted; blue = a new blue-tinted chest sprite (C2-sprites, one sprite).
- Menu: the Bookmark is used from Items like any key item ("Close the book here?"). Equip works as usual.
- Title: "Resume the Deep Stacks (B23)" under Continue when a suspend save exists; the B100 mark on the title
  once `deep_stacks_cleared`.
- The Archivist's plaque screen: record, vault (names, found or not as the Ledger does), deepest floor.
- Phone: nothing new to touch; the floor tag is text.

## 10. Audio

Existing tracks by band (section 4); existing SFX: `drop_legendary` for a blue chest, `chest_open`, a stair
descend sound, `bell_toll` on each landing plaque. No new audio in wave 1.

## 11. Balance method (proof before publish)

- `tools/sim/simulate.mjs --cave`: a scripted descent from B1 with the party at level 1 and nothing worn, fighting
  `k` encounters per floor (k from the generator's foe count), equipping the best drop by slot, 50 seeds; prints
  the level curve, deaths per band, time per floor, Bookmark floors, and fails if a band's death rate is outside
  its target (B1 to B9 under 5%, B10 to B29 under 15%, B30 to B59 under 30%, B60 to B99 under 45% for the
  competent policy).
- `qa/autoplay.py --cave N`: the bot enters from the library, descends to floor N (default 30) on 10 seeds, banks
  with a Bookmark, re-enters and reaches B5 with a vault unique worn; zero softlocks, zero console errors.
- A floor should take 2 to 4 minutes to clear at a normal pace; a first run reaches B10 to B20; a full clear is
  several sittings. The critic says whether it feels like Lufia.

## 12. Build waves (owned paths disjoint within a wave; the orchestrator commits)

| Wave | Agent | Builds | Owned paths |
|---|---|---|---|
| C1 (with H3 running: 3 agents) | C1-gen | the floor generator, prefabs for the first two bands, previews, determinism and walkability tests | `src/data/cave/gen.js`, `prefabs*.js`, `rng.js` (if needed), `tools/cave/**`, `qa/cave/gen_*` |
| C1 | C1-data | bands, pools, `scale(floor)`, loot zones, sixteen uniques + the Quill, the Bookmark, the Binder's data, the pack index with `register()` | `src/data/cave/foes.js`, `loot.js`, `items.js`, `index.js`, `live.js`, `qa/cave/data_*` |
| C1 (after H3 closes) | C1-state | `src/game/cave.js` (enter, descend, bank, die, resume, vault, record), suspend save slot, old-save compatibility, pure tests | `src/game/cave.js`, `qa/cave/state_*`, `qa/saves/cave_*` |
| C2 | C2-world | pack entry in `packs.js`, the trapdoor and `cave_landing0`, floor transitions (stairs register the next floor), runtime encounter registration, chest colours, the floor tag, death and bank flows wired to scenes | `src/game/packs.js` (one entry), `src/data/maps/library.js` (one event), `src/data/cave/maps/**`, `src/world/*` seams, `src/scenes/field.js` (floor tag) |
| C2 | C2-story-ui | the Archivist, lines, plaques, Journal line, title entries (resume, the mark), menu Bookmark use, the plaque screen | `src/data/cave/story.js`, `text.js`, `src/scenes/title.js` (two entries), `src/ui/screens/journal.js` (one line), `src/ui/screens/*cave*` |
| C2 | C2-sprites-boss | the blue chest sprite, the Binder's art and B100 map, prefabs for bands three to five | `assets/sprites/cave_*`, `src/data/cave/maps/cave_b100.js`, `prefabs_b3..5.js` |
| C3 | C3-sim-bot | `--cave` sim, `--cave` autoplay route, the balance pass over `foes.js` and `loot.js` (it owns them now) | `tools/sim/*cave*`, `qa/autoplay.py` (cave route), `src/data/cave/foes.js`, `loot.js` |
| C3 | C3-critic | fresh-eyes play-critic on phone and desktop, Lufia feel, issue list | `qa/cave/out/**`, `docs/CRITIQUE_CAVE.md` |
| C4 | C4-fixes | the issue list, then the publish gate list | as the list says |

Launch prompts follow `docs/EXPANSION_SCHEDULE.md` section 5's common head; briefs in `docs/briefs/C*.md`.
Contracts every agent must honour: ids `cave_bNN`, `cave_landing0`, `cave_b100`; flags `deep_stacks_open`
(set when the Archivist first speaks), `deep_stacks_cleared`; key item `keepers_bookmark`; `game.cave` shape in
section 8; the pack id `cave` with prefix `cave_`; EXP inside = 1.5x via `expMul`; item level formula in 6.1.

## 13. Scott's open calls (defaults chosen; say the letter and the answer)

- **A. Name.** Default: the Deep Stacks. Alternatives: the Unwritten, the Margins, the Lost Catalogue.
- **B. When it opens.** Default: after the Episode 1 credits. Alternative: as soon as Mira joins (mid-game, as
  Lufia does), which would pull players off the story early.
- **C. Death.** Default: this run's blue finds are lost; the vault from earlier runs is safe. Alternative: Lufia's
  rule, where death keeps everything blue (then the Bookmark only saves time).
- **D. Suspend save.** Default: one resume-only save per floor. Alternative: none (one sitting per run, Lufia).
- **E. Uniques.** Default: sixteen plus the Binder's Quill. More later if the Stacks are loved.
  **Scott's answer, 2026-10-27, verbatim:** "E. More uniques. Vary the quality of each so that lower levels are more likely to produce a low strength unique and less likely to produce high strength unique, and the probability reversing the deeper you go into the cave so that lower levels have a higher probability of producing a high strength unique instead of a low strength one. There should be enough uniques available to find to full equip the players with uniques from different measures of strength, and different special qualities, multiple times over."
  Build: sixty uniques in three grades (Lesser, Greater, Named), twenty per grade across every slot, the grade odds turning over with depth (85/14/1 at B1 to 3/17/80 at B99), a second blue chest on some floors; `docs/briefs/C4-uniques.md`. Launches after the Wednesday 10/28 reset, after C3-critic.
  **Built 2026-10-28 (C4-uniques)**: sections 6.2 and 6.3 as above. Weak uniques are likely shallow (B1-B29: 65% Lesser, 6% Named)
  and strong ones likely deep (B80-B99: 73% Named, 5% Lesser); each grade is a full party set; the second roll is a second blue
  floor, not a second chest on a floor (one line in `gen.js` if Scott wants the literal version). Numbers: `docs/DEEP_STACKS_BALANCE.md` 8.
- **F. B100 prize.** Default: the Quill and a title-screen mark. Alternative: a new ending line in the credits.

## 14. Risks and how they are held

- **Generated floors look worse than hand maps.** Held by prefabs: every room is hand-authored; the generator
  only chooses and joins. The critic compares a B15 floor to Archive F2 side by side.
- **Balance.** Held by the sim's death-rate targets and the bot's seeds before any publish.
- **Load budget.** All cave code and data live in the `cave` pack, fetched on first entry, so the first-load
  line does not move; the pack cap is 0.8 MB like x2.
- **Save corruption at the snapshot seam.** Held by pure functions with round-trip tests, and the rule that
  `bank` and `die` restore before they touch anything else.
- **Scope creep.** No new art, audio or foes in C1; the critic decides what wave C4 adds.
