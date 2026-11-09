# Episode 5: The Last Prophecy

Story bible for Lexicon Quest NEXT, Episode 5: the crossing on the Saffron Wind, the Caravan Road, Saffron Haven, the
Oracle Labyrinth and the Sand Oracle. Written by ep5-designer, Sunday 2026-11-08 (evening, Eastern), as a design
proposal for GitHub issue #50 on branch `scott/ep5-design`. **Status: PROPOSAL. Nothing here is built.** The production
side (ids, maps, the shade mechanic, the Turning Sky, loot, music, assets, save rules, the waves and the agent briefs) is
in `docs/EPISODE5_PLAN.md`. When built, everything of Episode 5 lives in the lazy `ep5` pack: the script in
`src/data/ep5/story.js`, NPCs in `src/data/ep5/npcs.js`, quests and party chat in `src/data/ep5/quests.js`, lore,
books, banners and inspect lines in `src/data/ep5/text.js`, and the staging guide in `docs/story/STAGING_EP5.md`
(written by E5-story, the shape of `STAGING_EP4.md`). Nothing of it goes into the core files (plan section 13).

**Sources.** `EPISODE1.md` section 5, `EPISODE2.md` sections 3 and 5, `EPISODE3.md` section 5, `EPISODE4.md` sections
1 (Act VI), 5, 6 and 8, `RESPONSIBILITY_ARC.md`, `CRITIQUE_6.md`, `PLAYTEST_REVIEW_6.md`, and the root game's Chapter V:
`CHAPTER_V_MILESTONE.md`, `rpg-chapter5.js` (the Oracle Labyrinth's three floors and their names, the oases, the
traveler caches, the three memories), `rpg-data.js` line 115 (the region record: "WHISPERING DESERT", "The Last
Prophecy", Nomad Sel, "Ancient inscriptions change every night", "The Oracle is trapped in a storm of unsaid words. Free
her before the last prophecy vanishes.", the reward Prophecy Shard, and the ending "The prophecy tells of a library above
the clouds. You need a sky compass to reach it."), `rpg-engine.js` (the Sand Oracle's phases, the two False Futures, the
Mirage Veil, the True Horizon, the Unbound Sandstorm, Sel's three memories, "Every Road Remembers", the First Library's
order to hide paths), `rpg-regions-ii.js` (Saffron Haven, the Moonwell Caravanserai, the Dune Lantern Rest, Saffron
Caravan Supplies, the Copperwind Smithy, the Sandstone Bulletin, the Moonwell of Unspoken Names, the mural of seven
wandering stars, the witnesses Yara, Kamal and Nasrin and the three vows Shelter, Truth, Return), `rpg-townsfolk.js`
(Nadir, Yasmin, Omar, Laleh, Hassan), `ART_PROMPTS.json` (environments cell 4, bosses cell 4), `SUNO_TRACKS.json`
(region-5 brief), and the older layer `game.js` (marked LEGACY where used: Vex rearranging star markers, "A lie that saves
lives is still a lie"). Tags: **(canon)** comes from those files, **(new)** is invented here, **(inference)** is a
synthesis of canon fragments; every inference is listed in section 8.

**Logline.** Across the sea, a desert reads the future in its stars, and has stopped walking. For twenty years the
Oracle of Saffron Haven has foretold how every caravan ends, so the caravans stay home, and the travelers already out
there cannot find the stars that would steer them back. A week ago the Oracle began a new prophecy, and it names one
star: the hero's. "When the last night turns, the Kept One's star goes out." The party walks into the Oracle Labyrinth
anyway, and Mira, who has spent four episodes reading what is written, learns that a prophecy is a reading, and a
reading can be turned.

**Theme question.** Episode 1 asked "who is eating our names?" Episode 2 asked "what would you give to keep someone?"
Episode 3 asked "what survives a fire?" Episode 4 asked "what holds when the water rises?" Episode 5 asks **"what do you
do when you are told how it ends?"** The Oracle says: accept it. Saffron Haven says: stay home. Vex says: hide. Sel, for
twenty years, said: believe it. Bram says: "Ask who told them." Mira, at first, says nothing, and that is her wound. The
episode's answer is Sel's mother's, in the canon line: "The future is not a single answer." And the party's answer,
without a speech: they walk the road, and turn the sky.

**Target length.** 60 to 90 minutes first play, planned at about 73 (Episode 4 ran long on the repo's own timer, so the
fights and boxes are cut harder here: plan section 6.1): Valewyn morning and the harbor 3, the Saffron Wind and the first
fight 4, the Caravan Road 8, Saffron Haven 11, Labyrinth F1 11, F2 12 (with the Mirage Knight), F3 10, the Sand Oracle 8,
Every Road Remembers and the ending 6. Optional content adds 12 to 15 (three side stories, revisits). Budgets: 18
ordinary fights (Episode 4 had 20 and met its boss a level high), at most 12 boxes per main scene (four set pieces
excepted), about 200 boxes on the main path (Episode 4 shipped 223 against 220 and ran over).

**Levels.** Episode 4 ends at Lv 21 (the Paper Regent at Lv 20, +800 EXP after it; Fact, `EPISODE4_PLAN.md` 6.1; an
Episode 4 save may arrive higher, PLAYTEST_REVIEW_6 section 1). The crossing and the road 21 to 22, Labyrinth F1 22 to 23,
F2 23 (near 24), F3 24, the Sand Oracle fought at 24, Lv 25 after it. (`expForLevel`: 22 9650, 23 10702, 24 11814, 25
12989; Fact, `party.js` run on 2026-11-08.)

**Whose episode.** Mira's, with a guest. Episode 2 was Mira's hometown; Episode 3 was Bram's mother; Episode 4 was the
hero's signature. Episode 5 returns to Mira as the reader, and gives her the boss's central decision (the skill **Turn the
Sky**), the way Episode 3 gave Bram his Oath and Episode 4 gave the hero Answer. Root Chapter V is "a companion-driven
prophecy story" driven by **Nomad Sel** (canon); Sel is a guest who walks beside the story, not a fourth party slot (a
fourth slot is engine work the budget cannot pay, the same call Episode 4 made for Lyra). Sel's own beat is the
episode's subtext in one person: she believed a prophecy about herself for twenty years, and in the Well of Tomorrow she
walks in anyway.

---

## 1. Beat sheet

Scene ids for `src/data/ep5/story.js` are in brackets. Flags are from the plan (section 2.2). Every scene follows the
house wrapper rules (guarded by `SCENE_CONDITIONS`, input locked for its run, registered through `registerStory`). Key
lines are samples in final voice, already inside the box rule (3 lines of 42 characters); the story agent writes the
rest and keeps every main scene at 12 boxes or fewer except `star_reading` (16), `oracle_after` (22), `every_road` (14)
and `ep5_ending` (13). **Staging rule (CRITIQUE_6 item 11):** every scene walks the party to marks two tiles below and
beside the speaker before the first line; nobody is stacked on one column, nobody stands on top of a seated speaker.
**Show, do not tell (CRITIQUE_6 item 3):** the four payoffs (the letter losing a name, the prophecy in the sky, Ishra's
page, the chart with the hero's star back) are close-up inserts through the existing `closeup` page kinds, never
narration over an unchanged map.

**Speaker tags.** The Sand Oracle speaks in capitals (the Archivore, the King, the Warden and the Paper Regent pattern),
tagged "The Oracle". Sel's mother speaks only in memory, tagged "The First Student" until `sel_memory_3`, then "Ishra"
(the speaker-swap mechanism of Episode 4: two records, `student_m` and `ishra_m`). Yara's father is "A Traveler" until he
gives his name in `every_road`, then "Tamir".

### Act I: Valewyn, the letter that lost a name

The first five minutes (RESPONSIBILITY_ARC section 2: control in 20 seconds, a question in 60, a choice with a cost in
3 minutes, a fight in 5), exactly as the player sees them:

| Time | What the player sees and does |
|---|---|
| 0:00 | Fade in on the Floodwatch Inn at morning. Mira at the window, the letter in her hands. Five boxes. |
| 0:20 | The close-up: the star-ink letter. Last night it held three names in star ink; now the top line is blank, a faint smudge where a name was. Mira: "Last night it had three names. This morning, two." |
| 0:35 | Bram: "Whose is gone?" Mira looks at the hero, and does not answer. Control. |
| 0:40 to 2:00 | Walk out through Valewyn (open gates, dry streets, Lyra, Hale and Ada say one line each if spoken to) to the south landing, where a desert ship waits. Yara: "Evening tide waits for nobody. Up you come." |
| 2:00 | The Saffron Wind, night, at sea. Banner. Control on a lit deck under stars. |
| 2:40 | Bram at the bow, alone: "Mira won't tell me whose name went. You saw it." The choice: `Mine.` / `Nobody's. Go to sleep.` |
| 3:30 | Sand blows across the water out of the dark: two desert things drop onto the deck. The first fight, under a night sky, with the sky's Turn marker on the timeline. |
| 5:00 | Dawn breaks mid-fight (the sky turns); the foes glow and hit harder. Win. The desert coast rises out of the morning. |

1. **The letter** [`ep5_morning`, `ep4_vw_inn`, on enter with `ep4_complete`, counter `credits4_rolled`, `EP5_LIVE`,
   not `ep5_morning_done`, not `tier_1`; sets `ep5_morning_done`, `ep5_started`; gives `star_letter`]. Yara, the captain
   who carried the letter north, eats at the long table. (new; canon Yara the Caravan Keeper, section 8)
   - Mira, at the window: "Star ink. It only reads in the dark." (the close-up `star_letter`, `blank` mode)
   - Mira: "Last night it had three names. This morning, two."
   - Bram: "Whose is gone?" (Mira looks at the hero; the hero emotes `...`; Mira folds the letter.)
   - Yara: "Sel wrote it. She reads names in the sky. She said come before the last night." (a beat) "We sail at dusk."
   - Bram: "Before the last night of what?" Yara: "She didn't say. Sel never says the end of things."

2. **Valewyn farewells** (talk entries, one box each, optional): Lyra: "The gates are open. Keep them that way, wherever
   you go." Hale: "Ships. Big ferries with opinions." Ada: "If anything comes back addressed to you, I'll carry it."
   Joss: "Sand gets in locks. Mind your crank." (Bram: "We gave it back." Joss: "Mind it anyway.")

3. **Boarding** [`ep5_board`, `ep4_valewyn`, the ship berth object at the south landing (pack patch, plan section 3);
   sets `ship_boarded`]. Two boxes, then a fade through dusk to night (the time skip is the scene's, so the player can
   board whenever they like). Yara: "Evening tide waits for nobody. Up you come."

### Act II: The Saffron Wind

4. **Night at sea** [`ship_night`, `ep5_ship`, on enter; sets `ship_arrived`]. Banner: The Saffron Wind / South across
   the Sea. A copper-trimmed ship under a sky full of stars, lanterns on the rails, crates of cloth lashed down. `mystery`,
   softer. Two boxes.
   - Mira, looking up: "More stars than at home." Yara: "Same stars. Fewer roofs."

5. **Bram's question** [`ship_bram`, `ep5_ship`, step trigger by the bow; sets `bram_asked` and `bram_told` or
   `bram_spared`]. The first
   **truth choice** (the H4 pattern: small and honest, never a locked route).
   - Bram: "Mira won't tell me whose name went. You saw it."
   - Choice: `Mine.` / `Nobody's. Go to sleep.`
   - Truth (`bram_told`): Bram is quiet a long time. "...Okay. Then I'm awake." (a beat) "Thanks for telling me. I'd
     rather be scared on purpose."
   - Kind (`bram_spared`): Bram: "...Okay." He does not go to sleep. (Changes one line in `star_reading` and one bark
     on the road; plan 7.3.)

6. **The first fight** [`ship_fight`, step trigger row amidships (`if: bram_asked`); scripted battle `e5s_first`, no flee;
   sets `ship_first_fight_done`]. Sand comes across the water out of the dark like rain blowing sideways. A Dust Harrier
   and a Dune Scarab drop onto the deck. The battle opens under a **Night** sky with the Turn marker 4 actions away: both
   foes are sun-things, so they are **Exposed** (every hit cracks a shield) until the sky turns. The teaching fight for
   the Turning Sky. No tutorial box.
   - Before: Mira: "Sun-things, at night. Hit them now, before the sky turns."
   - Mid-battle (the battle's message when the marker passes): "The sky turns. Day." The foes glow gold.
   - After: Bram: "Sand. On a ship. In the middle of the sea." Mira: "We're close." The coast rises in the dawn tint.

### Act III: The Caravan Road

7. **The landing** [`road_landing`, `ep5_caravan_road`, on enter; sets `road_landed`]. Banner: The Caravan Road / South
   to Saffron Haven. A stone jetty, a dead caravan camp, sun on dunes. Yara stays with the ship ("I'll bring her round
   to the Haven's water stairs"). Two boxes.
   - Bram: "It's so quiet." Yara: "Caravans used to sing on this road. Nobody's left on it to sing."

8. **The Glass Flat** [`road_shade`, step trigger where the road runs into a flat of running sand; sets `saw_glass_flat`].
   The field mechanic's first lesson (plan 5.1). A white flat of sand that runs like water in the sun, a tall waymark
   obelisk at its edge, and an old caravan sundial on a stone stand. Omar the Pathkeeper sits in the shade of the obelisk.
   One line points at the dial; the shadow does the rest.
   - Omar: "Sand runs in the sun and holds in the shade. Pick your hour, then walk the shadow." (canon Omar marks safe
     stones before dawn)
   - Bark after the first hour change (`first_shade`): Mira: "A bridge made of shade. Of course it is."

9. **The shade tent** [`tent_rest`, the campfire object at Omar's shade tent; `safe`, `rest`; sets `tent_rested`].
   Omar keeps a water jar and a fire under a striped awning. The fireside beat. One choice, then the rest flow:
   - `Why is the road empty?` Omar: "Twenty years ago the Oracle started telling caravans how they'd end. Not one wanted
     to hear it twice."
   - `Who is Sel?` Omar: "Walks the deep desert. Reads the sky. Hasn't gone near the Labyrinth in twenty years. Ask her
     why. I never dared."
   - `Just rest.` "Omar sets out safe stones for a caravan that has not left in twenty years. Nobody asks him why."
     (seeds the Return)

10. **The Haven at dusk** [`haven_view`, step trigger on the last dune; sets `saw_haven`]. Saffron Haven below: copper
    domes, an oasis, aqueduct arches, and above it all a great golden armillary of rings turning slowly against a purple
    sky (environments cell 4). `mystery`.
    - Mira: "An observatory. A whole town that reads the sky." Bram: "And nobody's leaving it."
    - The hero emotes `...`. (the hero looks longest at the empty space beside the brightest ring)

### Act IV: Saffron Haven

11. **The Moonwell Caravanserai** [`haven_arrival`, `ep5_saffron`, on first enter; sets `haven_arrived`]. Banner:
    Saffron Haven / The Moonwell Caravanserai (canon). Dusk, then lamps. Camels stabled, loads packed and never lifted.
    The Sandstone Bulletin (canon board) covered in caravan routes, every route struck through with the same sand-red
    line. At the gate a waystone carved with the names of travelers on the road; as night falls the carved names blur
    and settle into other names. (No reading game: the stone is a picture that changes; Mira says what it means.)
    - Mira, at the waystone: "The names changed. While I watched." Yasmin, packing cloth: "Every night. The stone
      writes who the Oracle says won't come home." (canon: "Ancient inscriptions change every night")
    - Bram: "And you believe it?" Yasmin: "It hasn't been wrong. Nobody's gone out to make it wrong."

12. **Nomad Sel** [`meet_sel`, `ep5_saffron`, Sel's talk entry in the northern market court (canon place); sets
    `met_sel`]. Sel (canon) sits on a saddle under a copper awning, a staff with a brass sun on it across her knees.
    - Sel: "You came. Good. The sky said three, then two. I hoped the sky was wrong about the walking."
    - Sel: "The Oracle reads every road to its end. For twenty years it has read only the bad ends."
    - Sel: "A week ago it started a new one. One star. It reads it every night." (She looks at the hero.)
    - Mira: "Whose star?" Sel: "Come up to the rings tonight. Laleh will show you. I'm tired of being the one who says."

13. **The Moonwell** [`moonwell`, object at the Moonwell of Unspoken Names (canon shrine); sets `moonwell_seen`]. Kamal
    the Water Bearer draws water that holds the night sky. Two boxes.
    - Kamal: "The water tells the truth when the wind is still." (canon) Mira: "It's showing a road." Kamal: "It used to
      show three."

14. **The reading** [`star_reading`, `ep5_sh_observatory` (the armillary tower), on enter at night after `met_sel`; sets
    `star_reading_done`, `sky_learned`; teaches `turn_sky`]. The set piece of Act IV. Laleh the Stargazer (canon) and
    Nasrin the Star Reader (canon) at the great armillary. Sel at the door, not coming in.
    - Laleh: "The constellation has one star too few. I've kept an empty space in my charts for months." (canon line,
      the months new)
    - The prophecy rises in the sky (the close-up `star_chart`, `prophecy` mode: the chart's stars, one faint star
      beside an empty space, the words forming in starlight). Nasrin reads it aloud: "WHEN THE LAST NIGHT TURNS, THE
      KEPT ONE'S STAR GOES OUT."
    - Bram: "The Kept One." (a beat) "'Keep this one.'" Mira: "...Yes."
    - Mira, to the hero and Bram: "I read it on the letter. On the ship. I didn't say it." (a beat) "That's the first
      time I've read something and not said it."
    - (truth path) Bram: "You did say it. You just took the long way." (kind path) Bram: "So we both knew, and neither
      of us said. Great team."
    - Laleh, setting Mira's hands on the rings: "Readers don't only read. When the sky reads wrong, we turn the rings."
      The armillary swings, the stars wheel, the faint star brightens for a breath. Learns **Turn the Sky**
      (`skill_learn`, "Mira learned Turn the Sky. It turns the sky now, and breaks a foretelling.").
    - Sel, at the door: "My mother turned rings like that. Then she went into the Labyrinth and didn't come out."

15. **The north gate** [`sel_gate`, `ep5_saffron`, step trigger at the north gate after `star_reading_done`; sets
    `gnomon_get`]. The nomad path north to the Labyrinth (canon). Sel gives the Nomad's Gnomon, the brass pin that sets
    the Labyrinth's sundials.
    - Sel: "The Oracle told me my road ends in its Well. I was nine. I've stayed out of the Labyrinth ever since."
    - Bram: "Who told it?" Sel: "...Nobody ever asked me that."
    - Sel: "The dials inside want this. Set the hour, walk the shade. And don't argue with the Oracle. My mother did."

### Act V: The Oracle Labyrinth

16. **The Shifting Dunes** [`lab_f1_arrival`, `ep5_lab_f1`, on enter; sets `lab_entered`, `lab_f1_arrived`]. Banner:
    The Oracle Labyrinth / I. The Shifting Dunes (canon). Roofless sandstone courts half drowned in running sand,
    obelisks, sundials on stands, an oasis spring (the font). Floor question (arc 3.5): who carved names on these
    obelisks and then scraped them flat?
    - Mira: "Every obelisk had names on it. Somebody took them off with a chisel." Bram: "Then let's find out who."

17. **The Unfinished Caravan** [`sel_memory_1`, `ep5_lab_f1`, step trigger in the camp court; sets `sel_memory_1`].
    (canon memory, staged as a tinted vignette like Lyra's; the sand keeps impressions of the people who crossed it.)
    Twenty years ago: a caravan under an old sail, a child waiting (young Sel), the First Student among the travelers.
    The caravan turns back to find one missing stranger. A voice from everywhere at once.
    - A Traveler (memory, later Tamir): "We're one short. We go back."
    - The Oracle (memory, canon): "AN INEFFICIENT JOURNEY."
    - The First Student (memory): "Every journey home is inefficient. That is what home is for."
    - Bram, now: "I like her."

18. **The Nomad Sun Key** [the gold chest in the far court, flag `sun_key_found`]. (canon key; reached at dawn, plan
    4.5.) The stair to F2 sets `lab_f1_done`.

19. **Gallery of False Horizons** [`lab_f2_arrival`, `ep5_lab_f2`, on enter; sets `lab_f2_arrived`]. Banner: II. Gallery
    of False Horizons (canon). A long roofed gallery; light only through tall horizon windows east and west; the walls
    are painted with horizons, each one wrong (a sea in the desert, a city that is not there). Two boxes.

20. **The Map That Lied** [`sel_memory_2`, `ep5_lab_f2`, step trigger at the map table; sets `sel_memory_2`]. (canon) The
    Oracle offers the caravan masters a perfect map to every destination. The First Student holds it to the window and
    sees names missing from it.
    - The Oracle (memory): "EVERY ROAD, AND ITS END. YOU NEED NOTHING ELSE."
    - The First Student (memory, canon): "A map without those names could never guide anyone home."
    - Mira, now: "You steer by the star of whoever's waiting for you. Take the star off the map..." Bram: "...and nobody
      gets home."

21. **The star in the wrong sky** [`vex_gallery`, `ep5_lab_f2`, step trigger at the Gallery's star floor; sets
    `vex_gallery_met`, `fifth_list_get`, and `star_restored` or `star_hidden`]. (new, with the LEGACY Vex desert scene
    as root) A floor of dark star-glass, the Oracle's copy of the sky. Vex Quill kneels at it, lifting one small glass star
    out of its socket and setting it into a painted horizon on the wall, where the Oracle does not read. The black
    feather lies on the glass.
    - Vex: "Every night it looks for you. Every night I move you. Months now. My knees hate this floor."
    - Mira: "You hid {hero}'s star." Vex: "From a machine that reads endings. Yes."
    - Vex: "A lie that saves lives is still a lie. Decide whether that matters." (LEGACY line, kept)
    - He holds out a list: cheap paper, the cold hand, the seal of the empty book, twenty years of star readers' names,
      and at the bottom one line in fresh ink: the hero's. "Five lists. This one's old. Somebody added a line last week.
      I don't keep lists with your name on them." Gives `fifth_list`.
    - Mira: "Why do you care?" Vex: "Somebody asked me to keep you. In writing." (He does not say who.)
    - **Truth choice** (the episode's main one): `Put it back.` / `Leave it hidden.` Truth (`star_restored`): the hero
      sets the star back in its socket; it lights. Vex: "...On the record again. You're very consistent." Hidden
      (`star_hidden`): Vex: "For now, then." He leaves it on the wall. Either way the episode goes on; the Oracle finds
      the star at the Well regardless (the chart reads whoever stands in it). The choice changes one line in
      `oracle_after` and Sel's gift (plan 7.3).
    - He is gone; the feather stays on the glass, and does not reflect. (Vex's arc warms a fourth notch: E2 took a list,
      E3 gave a corner, E4 signed as a witness, E5 has been protecting the hero and gives the list away.)

22. **The Mirage Knight** [`mirage_knight`, `ep5_lab_f2` gallery's end hall, arena trigger; boss intro card; battle
    `mirage_knight`; sets `knight_defeated`; the stair trigger sets `lab_f2_done`]. A tall knight of sun-bronze with a
    mirror for a shield; the mirror shows whichever sky it is not. Name card: THE MIRAGE KNIGHT / Warden of False
    Horizons. Intro line (arc 3.6): "It showed every caravan a better horizon. They walked toward it." (new; replaces
    canon's Mirage Serpent, section 8)
    - Mira, the one tip: "It turns its shield to the sky. Turn the sky on it."
    - After: Bram: "I saw myself in that shield. I looked taller." Mira: "It lies, Bram."

23. **The Lost Traveler Reliquary** [optional, `reliquary`, F2, side story 2]. Canon reliquary, now a Lantern secret at
    dusk (plan 4.6). Mira: "Names, scratched under the sand. Somebody wanted them found."

24. **The Well of Tomorrow** [`lab_f3_arrival`, `ep5_lab_f3`, on enter; sets `lab_f3_arrived`]. Banner: III. The Well of
    Tomorrow (canon). Night inside the earth: a great round shaft going down in landings, dark basalt and star-glass,
    sun-lamps on rails, and far below a circle of real sky reflected in still water. The darkest map of the episode
    (CRITIQUE_6 item 6).
    - Bram: "It's night down here." Mira: "It's always night in a well."

25. **Sel walks in** [`sel_walks_in`, `ep5_lab_f3`, chained after `lab_f3_arrival` on the first landing; sets
    `sel_walked_in`]. Footsteps on the stair above. Sel, with her sun staff, out of breath.
    - Sel: "Twenty years I believed it. Then three people walked in here off a list that says one of them is ending."
      (a beat) "So."
    - Bram: "So?" Sel: "So I'm a fool, or the Oracle is. I came to find out which." (She walks with the party as a scene
      actor from here; she does not fight. At each landing's oasis she waits.)

26. **The three landings** [`landing_shelter`, `landing_truth`, `landing_return`; each runs when the party reaches the
    landing's spring, after its lamp puzzle; in descending order (the Well is a descent, not wings); each sets its
    flag]. Each landing has a dry spring and a carved vow (canon: the old caravan law, "Shelter, Truth, Return"); as the
    party arrives the spring fills from below with a sound like a bell under sand. One line from the First Student's
    memory at each, then one from Sel. (canon names, lines new)
    - **Shelter:** The First Student: "Nobody crosses alone. Make room under the sail." Sel: "She used to say that to the
      camels."
    - **Truth:** The First Student: "Tell the caravan where the water is, even when it's far." Sel: "She never lied
      about distance. It made her very unpopular."
    - **Return:** The First Student: "Without a return, a journey is only exile." (canon, Nasrin's law) Sel: "...She
      didn't come back."

27. **The Name Under the Sand** [`sel_memory_3`, `ep5_lab_f3`, at the bottom landing after `landing_return`; sets
    `sel_memory_3`, `oracle_door_open`]. (canon memory, then Sel's beat) Under the last spring, a page sealed in glass,
    in a hand Sel knows. The close-up `ishra_page`: the canon words in a careful, warm hand.
    - Sel reads it (canon): "The future is not a single answer. Carry the names of people who might still choose
      another road." (a beat) "Ishra. Her name was Ishra." Speaker swap: "The First Student" becomes "Ishra".
    - Mira, looking at the page's letters, then at the fragment in her satchel: "Not the same hand as 'Keep this one.'
      But she learned her letters from whoever wrote it. Look at the k." (section 10.4)
    - Sel: "She went in to argue with it. She never came out. I believed that meant I shouldn't either."
    - The Sun Keyhole door (canon "Nomad Sun Keyhole") turns with the Nomad Sun Key.

### Act VI: The Sand Oracle

28. **The Eye of the Oracle** [`oracle`, `ep5_lab_oracle`, trigger row at the entry; boss intro; battle `oracle`]. The
    Well's floor: a round chamber of star-glass open to the sky above by the shaft, the night stars wheeling slowly in a
    golden ring. Coiled around the ring, a gigantic golden scorpion whose body is full of stars, wearing a mask (bosses
    cell 4, canon). Name card: THE SAND ORACLE / Reader of Every Road. Intro line (arc 3.6): "It told them how it ended.
    They stopped walking."
    - The Oracle: "THE KEPT ONE. I HAVE READ YOUR END EVERY NIGHT FOR A WEEK."
    - The Oracle: "SEVERAL FUTURES. ONLY ONE IS TRUE." (canon opening)
    - Sel, from the stair: "Who told you to read only the ends?" The Oracle: "A LIST. IT IS WRITTEN." Bram: "Written's not
      the same as true. Ask a Regent."
    - Choice: `Read us a road.` / `Turn the sky.` (either way, the battle)
    - Mira, the one tip: "When it reads a star, I turn the sky before it does. Keep me standing."
    - Phase 3 battle message: "The mask falls. Under it, a face made of stars."

29. **Every road** [`oracle_after`, `ep5_lab_oracle`, after the win; sets `chart_restored`, `fragment5_get`; the
    encounter sets `oracle_defeated`]. The order matters; the story agent keeps it:
    1. The Oracle sinks onto the glass. The mask cracks. The Oracle: "I SAW HOW EVERY ROAD ENDS. I NEVER SAW ANYONE
       CHOOSE ONE." (a beat) "I WAS TOLD NOT TO LOOK."
    2. Its starry body opens like the sky opening: the desert's share of the Book, the Star Chart, every name of the
       realm a star. Twenty years of struck stars light back in (`name_restore` flash). The close-up `star_chart`,
       `restored` mode.
    3. The hero's star, in its place beside Laleh's empty space, no longer empty. (truth path) Mira: "You put it back
       yourself. It's brighter than the ones around it." (hidden path) Mira: "Vex hid it. The chart found it anyway.
       You were standing in it."
    4. Under the hero's star, a tiny constellation: an open book with one line (the counter-seal), drawn in stars. Under
       it, in starlight, the line: "Keep this one." A fifth fragment, a fifth time. Gives `name_fragment_5`.
       - Bram: "Five times." Mira: "Five places. Fire, water, glass, steel, sky. Somebody really wants you kept."
    5. The Oracle, quieter, in plain capitals: "A ROAD." (it shows one: north and west, a line of caravan stars
       pointing home to Saffron Haven) "SEVERAL. THEY ARE WALKING."
    6. Sel, at the chart, finds a small star and touches it: Ishra's, back in the sky. She does not cry. "There you are.
       Late, as usual."
    7. The black feather lies on the glass by the chart. It does not reflect the stars. Bram: "He was here." Mira: "He's
       always here. He just doesn't stand where the light is."

### Act VII: Every Road Remembers

30. **Every road** [`every_road`, `ep5_saffron`, on arrival at the gate after `oracle_after` (the shaft's lift returns the
    party to the north gate); sets `roads_returned`, `haven_restored`]. (canon "Every Road Remembers") Dawn. The waystone
    at the gate shows names that do not change. The Moonwell is full. Hassan's bells ring on the dunes (if found).
    - Out of the deep desert, a caravan walks in: thin camels, sun-blacked faces, a man at the front with Yara's nose.
      Yara drops a coil of rope. "...Father?" Tamir: "We followed a star that came back last night. Mine was yours."
    - Sel, at the Moonwell, reads the names of the caravans the Oracle had written out of its visions, one by one (canon).
      Nasrin: "Shelter. Truth. Return. The old law. It works." (truth path) Sel: "You put your own star back where it
      could be read. My mother would have liked you." (hidden path) Sel: "You'd have stayed hidden. I understand that.
      I did it twenty years."
    - Sel gives the hero the gift (plan 7.3: the Caravan Compass for the truth path, the Veiled Star for the hidden
      path; legendary beam, equip prompt). Sel: "Steer by it. Someone is waiting somewhere for each of you."
    - Bram: "Ask who told them. That's my whole idea and I'm keeping it." Mira: "Write it down."

31. **The ending hook** [`ep5_ending`, `ep5_saffron` at night, straight after; sets `ep5_complete`]. The town on its
    roofs, watching the sky. The freed Oracle's first night: the armillary turns by itself and the stars write a new
    reading over the Haven (the close-up `star_chart`, `road` mode), and it is a road, not an end.
    - Laleh reads it: "A LIBRARY ABOVE THE CLOUDS KEEPS THE FIRST PAGE. A SKY COMPASS FINDS IT." (canon: "a library above
      the clouds", "a sky compass")
    - Mira: "The first page." Bram: "Vex's first page." Mira: "{hero}'s first page."
    - Yara, coiling the rope: "There's a skyport at Zephyr Landing. The old caravan charts point there." (canon) Sel: "I'll
      walk you to the coast. I've got twenty years of walking to catch up on."
    - The hero looks up. Their star is bright, and beside it, faint, a little open book of stars with one line. Far off,
      the wind turns over the dunes with a sound like pages. Mira: "Something up there just turned a page."
    - End cards: `End of Episode 5` / sub `The Last Prophecy`; then `Episode 6: The Skybound Isles` / sub (placeholder,
      section 10) `Above the clouds, a library keeps the first page.`

32. **Credits** (`CREDITS_EP5` in the pack's `text.js`, `saffron` music), then the next morning at the Dune Lantern
    Rest (`ep5_sh_inn`, mark `inn_bed`). Every Saffron Haven resident has new lines; caravans pack to leave; Omar's road
    is busy; Valewyn, Emberpeak, Hollowmere and Willowmere residents have Episode 5 lines; the end card says Episode 6 is
    not playable yet.

---

## 2. Side stories

| Quest | Giver | What happens | Reward |
|---|---|---|---|
| **Three Roads Home** (canon witnesses and Moonwell) | Kamal at the Moonwell, after `met_sel` | Hear Yara (her father left his route to find the missing; canon), Kamal (the water tells the truth when the wind is still; canon) and Nasrin (the three vows, Shelter, Truth, Return; canon). Then draw water at the Moonwell at night: it shows three safe roads (canon "The Moonwell Wakes"). No order; any sequence; one talk each. | 2 Hi-Ethers and 300 gold (canon 100 gold and two Ethers, scaled), the Moonwell becomes a rest and save point, and +20 Fury at the start of the Sand Oracle fight (`moonwell_woken`; canon's Moonwell +20 Focus). The Nomad Mantle (set piece). |
| **The Lost Traveler Reliquary** (canon reliquary, now a Lantern secret) | Talk hint on F2 | In a west-window alcove of the Gallery, at dusk, the low sun lights the floor and the Lantern shows travelers' names scratched under the sand (true marks the Oracle could not strike) pointing to a hidden door. No order puzzle. | 300 gold, 2 Hi-Ethers (canon 200 gold and two Ethers, scaled), book `travelers_log` |
| **Hassan's Bells** (new, from canon Hassan who "tunes little bells so caravans can find the way home") | Hassan at the Copperwind Smithy, after `haven_arrived` | Three caravan bells lost when the last caravans turned back: one on the Caravan Road (a sand island reached at noon), two in Labyrinth F1 (a dead-end court at dusk; a chest behind a Dash-cracked obelisk base). Bring them back. Hassan hangs them on the waymark at the gate; they ring in `every_road` as the caravan comes in. Bram, the first time he hears one: "That's my mother's tuning." Hassan: "My master learned it from a bell-founder from the mountains. She tuned bells for half the world, once." (a seed, section 10.6) | Copperwind Bell (rare unique charm) |

Side quests open once Saffron Haven is introduced (`haven_arrived`; Three Roads Home from `met_sel`). Every quest has a
journal entry and a Talk reminder. Cut line: Hassan's Bells goes first if the budget tightens (the Mara seed moves to one
line of Hassan's talk).

---

## 3. Character bible

Sprite and portrait ids in brackets (plan section 9).

### The party in Episode 5

**{hero}** [`hero`]. Silent, through choices, emotes and what others say. The hero signed their name in Valewyn; a week
later a desert began reading the end of them. The beat is small and pointed: the hero chooses to put their own star back
where it can be read (or to leave it hidden, and be found anyway). Arc beat: from "I will put my own name to this"
(Episode 4) to "I will be where I can be seen, even when I'm told how it ends". The subtext is the responsibility arc's
third row: voluntary adventure beats being dragged.

**Mira** [`mira`]. This is her episode. The reader, who for the first time reads something and does not say it (she
protects the hero and Bram from the prophecy for a day), then says so plainly at the observatory. She learns the episode's
central skill, **Turn the Sky**, and in the boss fight she is the one who must act before the reading lands. Her arc
beat: from "reading is naming what is there" to "a reading is not the thing; you can turn it". Dry, precise, and warmer
than ever; her one unguarded line: "That's the first time I've read something and not said it."

**Bram** [`bram`]. Carries his mother's hammer and, now, a sailor's distrust of sand. His question is the episode's
sharpest: "Ask who told them." He jokes when it is grim ("Sand. On a ship."). He hears his mother's tuning in a desert
bell, and does not make a speech about it.

### The guest

**Nomad Sel** [`sel`, sprite `npc_sel`, no portrait by default; plan 9.0] (canon name and role, canon "Find Nomad Sel
beside the northern market court"). Thirty, wind-dark skin, a long dust-colored wrap and a saffron headscarf, a staff
topped with a brass sun, a walker's stride. Reads the sky and walks the deep desert alone. Her mother was the Oracle's
first student (canon); at nine the Oracle told Sel her road ends in its Well, and she has stayed out of the Labyrinth
ever since. Dry, tired of being the one who says things, quick to laugh once she starts. She does not fight: she is a
scene actor who meets the party at the market, the gate and, from `sel_walks_in`, at each landing in the Well. Her beat
is walking in. New lines: "I'm tired of being the one who says." "So I'm a fool, or the Oracle is."

### Saffron Haven

**Yara** [`yara`] (canon Yara the Caravan Keeper; captain of the Saffron Wind, new). Forties, a sailor's squint, a coil of
rope always on one shoulder. Carried Sel's letter north. Her father left his route to find the missing (canon) and did
not come back. Canon line: "The Sand Oracle once promised to see all journeys. Now it only sees the end of them. My
father left his route to protect the missing."

**Tamir** [`tamir`, "A Traveler" in memory] (new name for canon's unnamed father). Yara's father: in the memory, the
caravan master who turns back for one missing stranger; in the ending, the man at the front of the caravan that walks
home. One line, the episode's last of the Return.

**Kamal the Water Bearer** [`kamal`] (canon; carries canon Nadir's lines too, section 8). Keeps the Moonwell. Slow,
gentle. Canon lines: "The oasis water tells the truth when the wind grows still." "Moonwell water tastes different every
dusk."

**Nasrin the Star Reader** [`nasrin`] (canon). Sixties, keeper of the old caravan law. Reads the nightly prophecy aloud
because someone must. Canon line: "There are three vows in the old caravan law: Shelter, Truth, Return. Without a
return, a journey is only exile."

**Laleh the Stargazer** [`laleh`] (canon). Twenties, ink to the elbows, runs the armillary. Teaches Mira to turn the
rings. Canon lines: "The constellation has one star too few; I have kept an empty space in my charts." "I measure the
changes in the night inscriptions."

**Omar the Pathkeeper** [`omar`] (canon). Sixties, sun-creased, keeps the shade tent on the Caravan Road and marks safe
stones for caravans that never leave. Canon line: "I mark safe stones before every caravan leaves at dawn."

**Yasmin the Cloth Merchant** [`yasmin`] (canon). Keeps Saffron Caravan Supplies (the shop); her copper awnings shade the
market. Canon lines: "My copper awnings keep the sun off travelers and their stories." "Saffron cloth is valuable
because it holds color after a hundred storms."

**Hassan the Copperwright** [`hassan`] (canon). Keeps the Copperwind Smithy (the forge) and tunes caravan bells. Canon
lines: "The smiths can hear a sandstorm coming through their anvils." "I tune little bells so caravans can find the way
home."

**The Dune Host** [`ep5_innkeeper`, Ledger-excluded] (canon title) keeps the Dune Lantern Rest.

**Ishra, the First Student** [memory actors `student_m` then `ishra_m`, sprite `npc_ishra`, no portrait] (canon role "the
Oracle first student", Sel's mother; the name is new). Seen only in the three memories and on her page. Forties in the
memories, a sun staff like Sel's, kind and stubborn. Canon line, her page: "The future is not a single answer. Carry the
names of people who might still choose another road."

### The Labyrinth

**The Sand Oracle** [boss `oracle`, field avatar `oracle_avatar`, portrait `oracle` crop] (canon name and look: bosses
cell 4, "gigantic golden celestial scorpion with star-filled abdomen and mysterious mask"; nature inference). The Keepers'
Reader of Roads: a Keeper construct made to keep the desert's share of the Book, which the Keepers wrote as a star chart
(every name of the realm a star, because travelers steer home by the stars of the people waiting for them), and to read
the roads in it for the caravans. Twenty years ago a list in the cold hand ordered it to hide the roads that led to the
people on it, "people who remember too much" (canon: "the First Library ordered the Oracle to hide paths that led to people who
remembered too much"); it struck their stars, and then, because a road with its end removed is only an end, it began
reading only the ends. A week ago one line was added to the bottom of that list, in fresh ink: one name. Not evil: a tool given a bad order, like Moth,
the Warden and the Clerk. The town calls it "she" (canon "Free her"); the party says "it". Speaks in capitals. Last words:
"I SAW HOW EVERY ROAD ENDS. I NEVER SAW ANYONE CHOOSE ONE."

**The Mirage Knight** (mini-boss, new; replaces canon's Mirage Serpent, which no unused painted cell can carry). The
Gallery's guardian: a sun-bronze knight whose mirror shield shows whatever sky it is not, and every caravan a better
horizon to walk toward.

**The False Futures** (canon: False Future, Hunger; False Future, Fear). The Oracle's phase 2: Hunger eats the road (the
party's Fury) and feeds the Oracle; Fear holds the party back (it pushes them down the timeline) and hushes the reader.

### The rival

**Vex Quill** [`vex`, portrait `silver_rogue`] (canon recurring rival). Fourth NEXT appearance, kneeling on the Gallery's
star floor. For months he has moved the hero's star out of the Oracle's sight every night (the LEGACY desert scene, Vex
rearranging star markers to save a village, re-aimed). He gives the party the fifth list, twenty years old with the hero's name added last week,
and says the truest thing he has said yet: "Somebody asked me to keep you. In writing." He never fights the party.

### Returning cast

Valewyn: Lyra, Hale, Joss, Ada (one line each in Act I, one after `ep5_complete`). Emberpeak, Hollowmere and Willowmere
residents (by the Keeper mirrors): one Episode 5 line each after `ep5_started` and after `ep5_complete`. Holt carries the
Willowmere side again: after `ep5_started` "Bram's letter says he's on a ship. Bram. On a ship. I've seen him in a
bathtub." After `ep5_complete`: "Letter from Bram. Sandy. Says the sky in the south has a star for everyone. Even me."

---

## 4. Tone guide (what changes from EPISODE4 section 4)

Everything in Episodes 1 to 4 stands: warm first, then the chill; show forgetting, never explain it; names with weight;
short boxes; character humor; no em dashes, ASCII only, `{hero}`.

- **Gold by day, indigo by night.** Episode 4 was grey rain on turquoise water. Episode 5 is white sun on gold sand and
  violet shade, then indigo night with copper lamps and too many stars. The day and the night must look like two
  places; the shade is the color of night lying on the sand.
- **Endings, not people.** Saffron Haven's sickness is fatalism: a town that has been told how it ends and has stopped
  walking. Show it with stillness: packed loads never lifted, a struck-through bulletin, a pathkeeper marking stones for
  nobody. Nobody explains "the Oracle reads only endings"; the waystone changes its names while you watch.
- **Readings and records.** Use the verbs on purpose: read, foretell, turn, walk, return, steer, keep. The Oracle's
  capitals are about endings and what is written, as the Regent's were about seals.
- **Mira's silence is the crack.** Mira always says what she reads. For one day she does not, and that is what the
  player should feel as wrong before she names it. Keep the rest of her dry and exact.
- **Humor carriers.** Bram (sand, ships, being taller in a mirror), Yara, Sel (once she starts), Vex. Never during a
  memory, never at Ishra's expense, never at the bottom of the Well.
- **Sel's restraint cracks once.** "There you are. Late, as usual." Keep the rest light and tired.
- **Names with weight in this episode.** Ishra (Sel, at the bottom of the Well), Tamir (to his daughter), and the hero's,
  read out by a machine as an ending, then found by the chart anyway.
- **The responsibility arc, as subtext only.** Nobody says "choose your own fate". Sel walks in. Mira says what she hid.
  The hero puts the star back. Bram asks who told them. The game names no real person and credits no teacher or author
  (RESPONSIBILITY_ARC section 0, decision A).

---

## 5. The lore added in Episode 5

**The Star Chart.** The Keepers divided the Book of Names "so that no single fire could take it all" (Episode 1). The
desert's share was written in the sky: every name of the realm as a star, charted in star-glass and kept by a Keeper
construct, the Reader of Roads (the Sand Oracle), which read the roads between the stars for the caravans. The chart is
the fifth fragment.

**Steer by whoever waits.** A traveler in the deep desert steers by the star of someone waiting for them at home. Strike
the star and the traveler cannot find the way back, though nothing has touched the traveler at all. That is how the
Oracle's first list worked: it hid the stars of "people who remember too much", and the caravans going home to them were
lost on roads that only went outward.

**A reading is not a record.** Episode 4 taught that true ink holds and forged ink runs: records hold. Episode 5 turns it:
a prophecy is a reading, and readings change ("the words change every night"). The Oracle's prophecies were readings of a
sky it had been told to edit. Turn the sky and the reading is wrong. **Records hold; readings turn.**

**The waystones.** Every caravan road out of Saffron Haven starts at a waystone carved with the names of travelers on
it. Since the Oracle began reading only ends, each night the stones rewrite themselves with the names it says will not
come home (canon: "Ancient inscriptions change every night").

**Sun and shade.** The Labyrinth was built for star readers who walked by day: its floors are laid over running sand that
flows in the light and sets in the shade. The Keepers set obelisks and sundials so a reader could choose the hour and walk
the shadows. In the Well of Tomorrow, where there is no sun, the old sun-lamps do the same work.

**The five lists.** Vex now counts five, in one hand under one seal (an open book with nothing written in it):
Emberpeak's (twenty-five years ago), the desert's (twenty), the Hollow's (fifteen), Valewyn's (twelve, renewed a month
before Episode 4) and Willowmere's (a month before Episode 1). The desert's is the oldest still being kept, and a week ago
someone added one line to its bottom in fresh ink: the hero's name. The list-writer answered the hero's signature in
Valewyn within a week, without writing a new list.

**The counter-seal, a fifth time.** In the chart, beside the hero's star, the counter-seal (an open book with one line)
drawn in stars, and the line "Keep this one." Ishra's page is not in that hand, but she learned her letters from it.

### What the player knows by the credits
Lists in one hand have been fed to Keeper machines for at least twenty-five years; a week after the signature, the
hero's name was added to the bottom of the desert's. A prophecy is a reading, and Mira can turn it. The hero's star is in the sky
chart, with the counter-seal beside it, in five fragments now. Vex has hidden the hero's star for months because someone
asked him to, in writing. The warm hand that writes "Keep this one" taught a desert star reader her letters. A library
above the clouds keeps the hero's first page, and a sky compass finds it.

### Held back for later episodes (consistent with the root game)
Who wrote "Keep this one" (a Keeper's hand, still writing; inference toward the Court's forgotten Keeper, never said).
Who asked Vex, in writing, to keep the hero. What the first page is (root canon: "I kept one thing from the Eraser: your
beginning"). Whose name Vex would not hand over in Valewyn. Who writes the lists (root canon: the Eraser, once the First
Keeper, the First Library). The mural's eighth star with no symbol (inference: the First Library, the empty seal). Why
Mara tuned "one bell down in your valley, once" (seeded by Hassan, not answered). Tess's father and the White Road. The
Skybound Isles and the Storm Observatory (Episode 6).

---

## 6. What Episode 5 sets up for Episode 6

- **The destination.** The freed Oracle's first reading: "A LIBRARY ABOVE THE CLOUDS KEEPS THE FIRST PAGE. A SKY COMPASS
  FINDS IT." and Yara's skyport at Zephyr Landing (root region 6, the Skybound Isles: Zephyr Landing, the Storm
  Observatory, a sky compass; bosses cell 5 the Storm Scribe, environments cell 5).
- **The hero's stake.** Five fragments, a star that holds, a counter-seal drawn in the sky, and a page somebody kept above
  the clouds: the hero's beginning.
- **The rival.** Vex has given a list away for the first time and admitted someone asked him to keep the hero. Episode 6
  is the fair place for "who asked".
- **The party.** Unchanged: three, each now with a center behind them, Mira twice. Sel walks them to the coast; whether she
  goes further is Scott's and Stephen's call then.

---

## 7. Episode 5 by the numbers (for the writers)

About 32 scenes (keep Episode 5 under 40 built), 8 new named townsfolk (Sel, Yara, Kamal, Nasrin, Laleh, Omar, Yasmin,
Hassan) plus Tamir and the memory actor Ishra (and memory extras: travelers, young Sel), one shop counter (the Dune
Host), 3 side stories, 3 books (`haven_charts`, `travelers_log`, `well_vows`), 11 banners (Saffron Haven's has two
states, before and after `haven_restored`), about 35 inspect lines (the waystone in its night and restored states, the
Sandstone Bulletin in two states, the Moonwell, the armillary, the mural of seven wandering stars, sundials, obelisks,
running sand, the sun plates, the lamps, the star floor, the painted horizons, the springs and their vows, Ishra's page,
the Sun Keyhole, the feather). Party chat (Talk) needs a hint for each main step on each map, in the house style, naming
the next action ("Set the dial to dawn and walk the long shadow"), and must name something doable after `ep5_complete`
(the reliquary, the bells, the Moonwell, Omar's road). Four close-up page modes (plan 9.4).

---

## 8. Canon reconciliation (root game to NEXT)

**Kept from the root game.** The Whispering Desert and the title The Last Prophecy; Nomad Sel, found by the northern
market court, the companion the chapter turns on; Saffron Haven and the Moonwell Caravanserai; the Dune Lantern Rest,
Saffron Caravan Supplies, the Copperwind Smithy, the Sandstone Bulletin, the Moonwell of Unspoken Names, the nomad path
north to the Oracle Labyrinth; the mural of seven wandering stars returning to an eighth with no symbol; the witnesses
Yara (Caravan Keeper), Kamal (Water Bearer) and Nasrin (Star Reader) and their lines; the three vows of the old caravan
law, Shelter, Truth, Return; the Moonwell waking and its rewards (gold, ethers, +20 Focus as +20 Fury); the townsfolk
Yasmin, Omar, Laleh and Hassan and their lines; "Ancient inscriptions change every night"; the Labyrinth's three floors
and their names (I The Shifting Dunes, II Gallery of False Horizons, III The Well of Tomorrow), an oasis spring on each
floor (the fonts), the Nomad Sun Key and the Nomad Sun Keyhole; the three memories (The Unfinished Caravan, The Map That
Lied, The Name Under the Sand) and their substance and lines ("AN INEFFICIENT JOURNEY", "A map without those names could
never guide anyone home", the page from Sel's mother, the Oracle's first student); the Lost Traveler Reliquary; the Sand
Oracle (name, look from bosses cell 4: a golden celestial scorpion with a star-filled body and a mask), "several futures,
only one is true", weak to ice and resisting fire, the two False Futures (Hunger, weak ice; Fear, weak piercing) behind a
Mirage Veil that cuts damage to 15% with an HP floor while they stand, the True Horizon (armor down, +25 Focus as +25
Fury), the Unbound Sandstorm's charged attacks; "Every Road Remembers" (Sel reads the caravans' names aloud, travelers
return to the map, the Haven regains its road); "the First Library ordered the Oracle to hide paths that led to people who
remembered too much"; the ending's "library above the clouds", "sky compass", Zephyr Landing and the skyport as the hook;
environments cell 4 (a sandstone observatory among dunes under a purple star sky, celestial rings, golden lamps) for the
town and its key art; the region-5 Suno brief (plucked oud-like strings, hand percussion, breathy woodwinds, spacious
strings, 92 BPM) as the town theme's brief for the in-repo tracker; the LEGACY Vex line "A lie that saves lives is still a
lie. Decide whether that matters." and his rearranged star markers; the root enemy names Silt Reaver, Horizon Shade,
Tomorrow Husk, Dune Stalker (from "Sand Stalker", see below), Dust Wolf's role as the road's beast.

**Changed, with reasons.**
- **Word and order puzzles are gone** (DESIGN hard rule 2; Episodes 3 and 4 did the same). F1's three wind vanes with a
  printed answer chart, F2's lens triple (Blank, True, False) and its word-grid puzzle (anchor ORACLE), the
  ordered chronicles (Departure, Crossing, Arrival) and the ordered vows (Shelter, Truth, Return, wrong order resets) are
  all replaced: the floors open by sun and shade (plan 5.1), the reliquary is a Lantern secret, and the vows are the Well's
  three landings in the order of the descent, never an answer to get right.
- **Quicksand damage is gone** (no damage tiles: phone players). Running sand is simply impassable in the light and solid
  in the shade. The Moonwell's canon reward "shifting sand now deals only 2 HP" becomes a rest point and the Fury bonus.
- **The Mirage Serpent becomes the Mirage Knight.** Every `enemies.webp` cell is in use, and no cell is a serpent; cell 5
  (the mirror-shield knight) fits "false horizons" exactly. The name "Mirage" is kept.
- **Nadir the Waterbearer** and **Kamal the Water Bearer** hold the same job; Kamal (a witness) keeps both sets of lines.
- **"Sand Stalker"** becomes **Dune Stalker** (the LEGACY spelling): Episode 3 owns every `sand_` id (EPISODE4 section 8).
- **The Prophecy Shard** becomes the fifth fragment of the Book, the Star Chart (the NEXT pattern: every boss guards a
  fragment). The canon reward name survives as a book title in the Haven's charts.
- **Sel's bond** (Caravan Compass: an opening ward, +35 Focus, one automatic interrupt) is not a bond here: Episode 5 has
  no bond system. The Caravan Compass is Sel's gift on the truth path (plan 7.3), and the episode's battle answer is
  Mira's Turn the Sky.
- **The Oracle's pronoun.** Canon says both "Free her" and "it". Here the town says "she" and the party says "it"; the
  Oracle is a construct (the Clerk and Warden pattern).
- **Phases.** Canon has four (opening, False Futures, True Horizon, Unbound Sandstorm at 30%). They become three: the
  Sandstorm folds into the True Horizon as its charged move, with Haste (Episode 4 did the same with the Flood Decree).
- **The region index.** The root code calls this region index 4 (`const region=4`), its Suno brief "region-5". NEXT
  calls it Episode 5; nothing in NEXT depends on the root index.
- **LEGACY names dropped:** the town Starfall, the Desert Star Observatory, the Star Eater, Adira, Rafi and Numa (the
  older `game.js` layer, superseded by `rpg-regions-ii.js` and `rpg-data.js`). The LEGACY hero name and Mira's LEGACY
  class "Oracle" are ignored (the hero is player-named; the Oracle is the boss). LEGACY Yara the Glasskeeper of the Mirror
  Court is not in NEXT (Episode 2's cast is different), so Yara the Caravan Keeper keeps the name.
- **Inference:** the Oracle is a Keeper construct (the Reader of Roads) and the fifth fragment is a star chart. Basis:
  bosses cell 4 (a scorpion whose body is a starfield), canon "The Sand Oracle once promised to see all journeys", Episode
  1's division of the Book, and the Moth, Court, Warden and Clerk pattern.
- **Inference:** the desert list is twenty years old and the hero's name was added to it a week ago. Basis: canon's "the First
  Library ordered the Oracle to hide paths"; canon Sel's mother as the Oracle's first student (a generation back); Episode
  4's "Now they know where you are" and its lists getting faster.
- **Inference:** travelers steer by the stars of those who wait for them. Basis: canon "A map without those names could
  never guide anyone home" and "The caravans remember their lost companions".
- **New:** the crossing on the Saffron Wind and Yara as its captain; the star letter that loses a name; the Kept One and
  the hero's star; Mira's silence; the Turning Sky battle rule and Turn the Sky; sun and shade; Vex hiding the star and
  giving the fifth list; Sel's childhood prophecy and her walk into the Well; Ishra's name; Tamir; Hassan's Bells and the
  Mara seed; the freed Oracle's road reading.

**Name collisions to respect.** Episode 2 owns `vow_*` (so the Well's landings are `landing_*`), `testimony_*` for the
Hollow witnesses, `vex_mirror`, `black_feather*`, `rook`; Episode 3 owns the map prefix `pk_`, every `foundry_` and `sand_`
id, `oath_*`; Episode 4 owns every `ep4_` id, `principle_*`, `answer`, `strike_roll`, `flood_decree`, `regent_*`,
`lyra_*`; X1 owns `star_1_read` to `star_3_read`, `star_chart` (a quest id: Episode 5's chart is `name_fragment_5` and the
page kind `ep5_chart`), `star_chime`, `orrery*`; Fine Print owns `countersign`, `witness_seal`, `codicil`, `errata`,
`marginalia`, `strikethrough`. The word "caster" is a battle term in `src/battle/` (the shade event is `standstone`).
Episode 5 uses: map ids `ep5_*`, encounter prefixes `e5s_`, `e5r_`, `e5l1_`, `e5l2_`, `e5l3_`, `testimony_yara`,
`testimony_kamal`, `testimony_nasrin`, `landing_*`, `sel_memory_*`, `vex_gallery`, the skill `turn_sky`, the boss move
`last_prophecy`. Full registry: plan section 2 (grepped 2026-11-08).

---

## 9. Build notes

Reserved for E5-story (wave 5a): what the built script does beyond the beat sheet (deltas only, as EPISODE4 section 9).

---

## 10. Choices made tonight that are Scott's or Stephen's (open for Scott and Stephen)

None of these blocks the build; the default is what the build agents use. Each is one line of why.

1. **Whose episode: Mira's, with Sel as a non-fighting guest.** [default: yes] Mira's second center continues the
   rotation (Mira, Bram, hero, Mira), and a guest avoids the fourth party slot the engine cannot pay for.
2. **The prophecy names the hero: a line added to the desert's twenty-year-old list a week after the signature.**
   [default: yes] It pays off Episode 4's "Now they know where you are" and raises the stakes without a new villain.
3. **Vex hid the hero's star for months, gives the fifth list away, and says "Somebody asked me to keep you. In
   writing."** [default: yes, the asker unnamed] It moves Vex one notch warmer and plants Episode 6's question without
   answering Episode 4's.
4. **The warm hand of "Keep this one." is a Keeper's: Ishra learned her letters from it ("Look at the k").** [default: this
   one line, nothing more] It narrows the mystery a notch without naming anyone, so later episodes stay free.
5. **Ishra does not come back; Tamir does.** [default: as written] The Return lands on a living reunion, and Sel's loss
   stays gentle (her mother's star returns, not her mother).
6. **Hassan's bells carry Mara's tuning ("a bell-founder from the mountains").** [default: yes, one line] It keeps Mara's
   "one bell down in your valley" thread alive without answering it.
7. **Renames and drops for canon conflicts:** the Mirage Serpent to the Mirage Knight, Nadir into Kamal, Sand Stalker to
   Dune Stalker, the Prophecy Shard to the fifth fragment, four phases to three, no quicksand damage, no vanes, lenses,
   word grid or ordered vows. [default: as listed] Each follows a hard rule or an asset fact (section 8).
8. **Truth choices:** two, Bram on the ship (one line) and the star in the Gallery (one line and Sel's gift). [default:
   two, small and honest] RESPONSIBILITY_ARC decision D; Episode 4 had one and Review 6 found it landed.
9. **The Episode 5 card wording** stays as Episode 4 shipped it: "Episode 5: The Last Prophecy / In the desert, the words
   change at night." [default: keep] The episode is built to make that line literally true (the letter, the waystones).
10. **The Episode 6 card:** "Episode 6: The Skybound Isles / Above the clouds, a library keeps the first page." [default:
    placeholder] It fits 42 characters and names only canon places.
11. **Fine Print and Episode 5.** A Fine Print run does not enter Episode 5 (`ep5_morning` needs `not tier_1`). [default:
    base game only] The same call as Episode 4 decision 6.
12. **Sel has no portrait** unless Scott approves one Runway still (plan 9.5). [default: no portrait, like Hale] No unused
    painted portrait fits a desert nomad; a code-drawn portrait would clash with the painted ones.
13. **Optional paid art and music** (plan 9.5: up to 3 Runway stills, 12 credits; up to 2 Suno tracks). [default: none;
    the build ships without them] Scott's accounts need his go, and November's Suno downloads are spoken for.
14. **Shipping.** Episode 5 is built behind `EP5_LIVE` on a build branch; E5-integrate flips it on the branch only after
    the full gate list. Shipping to players stays Scott's or Stephen's explicit word.
