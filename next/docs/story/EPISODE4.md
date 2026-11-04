# Episode 4: The Sunken Keep

Story bible for Lexicon Quest NEXT, Episode 4: the Flood Road, Valewyn, the Sunken Keep and the Paper Regent.
Written by ep4-designer, 2026-11-03 (Tuesday night, Eastern), the evening Episode 3 shipped. The production side (ids,
maps, the tide mechanic, combat, loot, music, assets, save rules, the waves and the agent briefs) is in
`docs/EPISODE4_PLAN.md`. When built, everything of Episode 4 lives in the lazy `ep4` pack: the script in
`src/data/ep4/story.js`, NPCs in `src/data/ep4/npcs.js`, quests and party chat in `src/data/ep4/quests.js`, lore, books,
banners and inspect lines in `src/data/ep4/text.js`, and the staging guide in `docs/story/STAGING_EP4.md` (written by
E4-story, same shape as `STAGING_EP3.md`). Nothing of it goes into the core files (plan section 13, the budget rule).

**Sources.** `EPISODE1.md` sections 3 to 6, `EPISODE2.md` sections 5 and 6, `EPISODE3.md` sections 5, 6 and 8,
`RESPONSIBILITY_ARC.md`, and the root game's Chapter IV: `CHAPTER_IV_MILESTONE.md`, `rpg-chapter4.js` (the Drowned
Crown Plaza, the witnesses, the council switches, the three keep floors, the empty coronation inscription, the three
principles, the Sunken Seal Key, Lyra's three memories), `rpg-engine.js` (`lyraMemory`, the Paper Regent's phases and
its two Forged Writs), `rpg-townsfolk.js` (Nilo, Ada, Vance, Linn, Sori), `rpg-data.js` (the region record: "The Empty
Throne", "The kingdom's history returns. A desert oracle calls your names across the sea."), `game.js` (the Valewyn
Sunken Keep room names, the Tidemark people Hale the Ferryman, the water-level pumphouse trial "Lower the water twice to
expose its submerged stones"), `ART_PROMPTS.json` (environments cell 3 Valewyn, bosses cell 3 Paper Regent, portraits
cell 4 Regent Lyra) and `SUNO_TRACKS.json` (region-4 brief). Tags: **(canon)** comes from those files, **(new)** is
invented here, **(inference)** is a synthesis of canon fragments; every inference is listed in section 8.

**Logline.** Downriver, a kingdom forgets who rules it. The Regent of Valewyn has lost her name, and her seal goes on
ruling without her: decrees arrive stamped and dry while the streets drown. Twelve years ago one word of the old king's
flood charter was forged, OPEN into CLOSE, and she enforced it because the seal said so. A month ago she began to doubt
it, and her name was struck from the Book before she could testify. The party goes down into the Sunken Keep to find
the true charter, and the hero learns what it costs, and what it is worth, to put your own name under the truth.

**Theme question.** Episode 1 asked "who is eating our names?" Episode 2 asked "what would you give to keep someone?"
Episode 3 asked "what survives a fire?" Episode 4 asks **"what holds when the water rises?"** The Paper Regent says
the seal: "THE SEAL IS THE LAW." Hale says the boats. Joss says a good lock. Dorian says the record. The Regent, at
first, says the seal too, and that is her wound. Bram says: "People who stand where they said they'd stand." The
episode's answer is the lore turn: **true ink holds; forged ink runs.** And the hero's answer, without a word: a
signature.

**Target length.** 60 to 90 minutes first play, planned at about 75 (Episode 3 ran close to plan with its box budgets):
Emberpeak morning 5, the Flood Road 9, Valewyn 11, Keep F1 12, F2 13 (with the Barrister), F3 13, the Paper Regent 8,
the Crown Remembers and the ending 6. Optional content adds 12 to 15 (three side stories, the council choice, revisits).
Budgets: 20 ordinary fights, at most 12 boxes per main scene (three set pieces excepted), about 220 boxes on the main
path.

**Levels.** Episode 3 ends at Lv 17 (the simulator's Episode 3 finish is about 5,585 EXP). Road 17 to 18, Keep F1 18 to
19, F2 19 (near 20), F3 20, the Paper Regent fought at 20, Lv 21 after it. (`expForLevel`: 18 6038, 19 6853, 20 7727,
21 8659; Fact, `party.js`.)

**Whose episode.** The hero's. Episode 2 was Mira's (her hometown), Episode 3 was Bram's (his mother, his father).
Every episode so far has ended on the hero's name turning up again: on the golden page (1), written twice (2), stamped
under a counter-seal with one line (3). Episode 4 is where the silent hero acts on it: by choice, on the record, with
their own name. A new companion was considered (Lyra as a guest) and rejected: a fourth party slot is engine work the
budget cannot pay tonight, and the Regent is stronger as the person the party is working for than as a fourth sword.

---

## 1. Beat sheet

Scene ids for `src/data/ep4/story.js` are in brackets. Flags are from the plan (section 2.2). Every scene follows the
house wrapper rules (guarded by `SCENE_CONDITIONS`, input locked for its run, registered through `registerStory`). Key
lines are samples in final voice, already inside the box rule (3 lines of 42 characters); the story agent writes the
rest and keeps every main scene at 12 boxes or fewer except `ep4_morning` (13), `regent_after` (24) and
`crown_remembers` (14).

**Speaker tags while a name is gone.** Until `lyra_named`, the Regent's tag is "The Regent" (the Garrick pattern of
Episode 3: two NPC records, `regent_e` tagged "The Regent" and `lyra_n` tagged "Lyra"; the actor is swapped under the
name flash). In her memories she is also "The Regent". The old king is "The King" throughout (his name is not what was
taken; nobody needs it).

### Act I: Emberpeak, the morning after

1. **The decree that won't dry** [`ep4_morning`, `pk_inn`, on enter with `ep3_complete`, counter `credits3_rolled`,
   `EP4_LIVE`, not `ep4_morning_done`, not `tier_1`; sets `ep4_morning_done`, `ep4_started`, gives `running_decree`].
   Bess's stove. Ada, the courier from the night before, has the decree drying on the hearth rail. It will not dry. The
   ink of the text runs; one line, in a different ink, stays: "The gates. Please." No signature. (new; canon courier
   role, canon townsfolk Ada)
   - Ada: "Three days on the road and it's still wet. Everything the palace sends is wet now. Except the orders."
   - Mira, reading: "The printed part is running. This line isn't. Different ink. Different hand."
   - Bram: "Who sent you?" Ada: "The Regent." (a beat) "The Regent of... I carry her letters every day. I can't say
     her name. Nobody can."
   - Mira: "A month, you said?" Ada: "About a month. The orders kept coming. Stamped. Dry."
   - Choice: `We'll come.` / `Who's ruling, then?` Either way: Ada: "The seal is. That's what scares me."
   - Garrick, at the door: "East road's washed out past the ridge. Rusk has rope." Bram: "Come home after?" Garrick:
     "That's my line." (Episode 3's ending line returned, one more time, then the father lets him go)

2. **The east road** [`east_road_gate`, `emberpeak`, step trigger at the washed-out drop; sets `east_road_open`].
   Rusk has rigged a rope and a ladder down the washout. Two boxes. Rusk: "Frost cools hot metal. Water's a different
   problem. Mind your boots."

3. **Optional farewells** (talk entries, one box each): Ilya: "If you find a bell under that water, listen before you
   ring it." Sella: "Bring back something that floats." Veyra: "Valewyn bought our iron for a hundred years. Pay them
   back." Garrick (only if spoken to twice): "Bram. Say mine before you sleep." Bram: "Every night."

### Act II: The Flood Road

4. **Down to the water** [`flood_road_arrival`, `ep4_flood_road`, on enter; sets `flood_road_arrived`]. Banner: The
   Flood Road / Down to Valewyn. The mountain road drops into a wide green valley gone to water: drowned hedges, a
   farm roof, rain.
   - Bram: "Didn't rain on the mountain in a month. Looks like it all came here."
   - Mira: "The river's not in its bed. Someone closed something."

5. **The first fight** [`flood_first_fight`, step trigger column; scripted battle `e4r_first`, no flee; sets
   `flood_first_fight_done`]. An Ink Bloom (a puddle of runny decree ink with a red seal floating in it) and a
   Floodhound. The Bloom always opens with Stamp: a wax seal pip appears beside it; at three it will read out its
   decree. The teaching fight for Decrees: burn it (fire, Lamp Oil) or Break it. No tutorial box.
   - Before: Mira: "That blot is stamping itself. Burn it before it reads that out."
   - After: Mira: "Paper and wax. Fire ends the argument." Bram: "So does hitting it. Louder." (the Episode 3 joke,
     on purpose: Bram's jokes are a pattern)

6. **The drowned lane** [`flood_lane`, step trigger where the road runs into flooded farmland; sets `saw_flood_lane`].
   The field mechanic's first lesson (plan 5.1). A farm sluice with a big iron wheel, a striped tide post, a lane under
   a hand's depth of water, a moored punt by a ditch. Turn the wheel: the lane drains and the road appears; turn again:
   the water rises, the punt lifts and bridges the ditch to a chest. One line points at the wheel; the water does the
   rest.
   - Bram: "Farm lock. Turn the wheel, the water goes where it's told."
   - Bark after the first change (`first_tide`): Mira: "Down for the road, up for the boat. It's a staircase made of
     water."

7. **Hale's landing** [`ferry_rest`, the campfire object at the ferry landing; `safe`, `rest`; sets `ferry_rested`].
   Captain Hale (canon, Tidemark's ferryman) and his ferryhand Nilo (canon) keep a fire under a tarp; the ferry is the
   only way across the river into the city. The fireside beat. One choice, then the rest flow:
   - `What happened here?` Hale: "Twelve years ago the gates shut on the river quarter in a flood. Twelve years later
     they shut again. Same seal both times."
   - `Who is the Regent?` Hale: "Good woman. I've known her thirty years. Ask me her name." (he cannot) "That's what
     happened."
   - `Just rest.` "Nilo whittles a new pin for a bell he no longer has. Nobody asks him about it." (seeds Nilo's Bell)

8. **The city on the water** [`vw_view`, step trigger on the bluff above the crossing; sets `saw_valewyn`]. Valewyn
   below: canals, marble walks, a crowned statue with no face carved yet, and beyond it the Keep, half under water,
   its bell tower drowned to the belfry. `mystery`.
   - Mira: "There. Your bell under water, Bram." Bram: "Not mine. It's ringing for somebody, though."
   - The hero emotes `...`. (the hero's first beat of the episode: they look longest at the Keep)

### Act III: Valewyn

9. **The Drowned Crown Plaza** [`vw_arrival`, `ep4_valewyn`, on first enter by the ferry; sets `vw_arrived`]. Banner:
   Valewyn / The Drowned Crown Plaza. Sandbags, rain, a flood board covered in notices whose ink runs in streaks, and
   one notice, crisp and dry, with a red seal. Vance the Guard is pasting it up.
   - Vance: "New order from the palace. Gates stay shut. Seal's good." (he looks at it) "Seal's always good."
   - Mira: "Everything on this board is running except the orders." Vance: "It's hard to enforce a law that changes in
     the rain." (canon)

10. **The empty coronation** [`vw_statue`, object at the statue; sets `saw_statue`]. Canon inscription, read aloud by
    Mira: "A crown without a name is a shadow. The law is meant to shelter the people, not to drown them in ink."
    - Bram: "Who carved that?" Mira: "Someone who saw this coming."

11. **The Regent's Hall** [`regent_hall`, `ep4_vw_palace`, step trigger inside; sets `met_regent`]. The Regent
    (canon Lyra, unnamed here; portrait `noble_lady`) at a long table of decrees, trying to sign one. The pen writes,
    and the ink slides off the page. Her own seal is not on the table: it is in the Keep, and decrees in her name come
    out of the water every morning.
    - The Regent: "I write OPEN. It runs. Something writes CLOSE in my hand, and that stays."
    - The Regent: "My seal went into the Keep with the old charter twelve years ago. I thought it was safe there."
    - The Regent: "A month ago I started asking who sealed the first order. The next morning nobody could say my name."
    - Mira: "The list takes the people who can undo it. It took a smith. Now a regent."
    - **Truth choice** (the H4 pattern, small and honest): The Regent: "Twelve years ago I enforced that order. Did I
      do this?" `Yes. You did.` / `The seal did.` Truth (`lyra_truth`): she is silent, then: "Thank you. Nobody here
      will say it." Kind (`lyra_kind`): "...That is what I've been telling myself." Either way the episode goes on; the
      truth changes one line in `crown_remembers` and her farewell gift (plan 7.3).
    - The Regent: "The Keep's locks answer to a crank only the lockwright keeps. Find Joss." (main path)

12. **The lockwright** [`joss_locks`, `ep4_valewyn`, Joss's talk entry by the canal works; sets `met_joss`, gives
    `lock_crank`]. Joss (new; canon role, Orel renamed, section 8) keeps the city's lock wheels and the crank that
    turns the Keep's. He has not turned them since the first decree: "The order said shut. I'm a lockwright, not a
    judge."
    - Joss: "Every lock in the Keep has three marks. Low, middle, high. Water goes where the wheel says."
    - Joss: "I kept the crank. I didn't use it. I've been telling myself that's different."
    - Gives the Lockwright's Crank. Joss: "Hale will take you across. He's been waiting twelve years for somebody to
      ask."

13. **The Keep ferry** [`keep_ferry`, `ep4_valewyn`, the ferry object at the north landing with `lock_crank`; sets
    `keep_ferry_open`]. Hale poles the party across the drowned river quarter to the Tidegate. Two boxes. Hale: "My
    mother's house is under us. Don't look down, it's rude."

### Act IV: The Sunken Keep

14. **The Tidegate Causeway** [`keep_f1_arrival`, `ep4_keep_f1`, on enter; sets `keep_entered`, `keep_f1_arrived`].
    Banner: The Sunken Keep / I. Tidegate Causeway (canon). Canals inside the walls, lock wheels, striped tide posts,
    a door on the canal floor with a paper notice nailed across it: CLOSED BY DECREE, the seal bright red.
    - Mira: "Locks, posts, marks on every wall. Somebody built this to be read."
    - Bram: "Then let's read it." (floor question: who papered over a door under water?)

15. **The first wash** [no scene: the bark `first_wash` when a forged seal is first submerged]. The water rises over
    the papered door; the seal's ink blooms into a red cloud and the notice floats off in pieces. The lesson: high
    water washes a forgery off, and it stays washed. Mira's bark: "Forged ink runs. It ran." Then later, at a true
    Keeper mark under water that does not run (`first_true_ink`): "That didn't run. That one's real."

16. **The Flooded Audience** [`lyra_memory_1`, `ep4_keep_f1`, step trigger in the central hall; sets
    `lyra_memory_1`]. (canon memory, staged as a tinted vignette like Bram's.) Twelve years ago, the audience hall
    above water. Boatmen at the gate begging entry in a flood; the young Regent holding the dry, sealed order; the
    guard turning them back.
    - Boatman (memory): "The river quarter's going under! Open the gate!"
    - The Regent (memory): "The order is sealed. I can't overrule the seal."
    - The Regent (memory, canon): "I believed the seal more than my neighbors."
    - Bram, now: "She was following an order that didn't make sense." (a beat) "I know what that sounds like from the
      inside." (canon's Bram line about Valewyn, re-aimed: he heard a foreman shout "count the ore")

17. **The Sunken Seal Key** [the north gallery's gold chest; flag `seal_key_found`]. (canon key; reached only at high
    water, see plan 4.5.) The lift to F2 sets `keep_f1_done`.

18. **Archives Below Water** [`keep_f2_arrival`, `ep4_keep_f2`, on enter; sets `keep_f2_arrived`]. Banner II.
    Archives Below Water (canon). Stacks rising out of black water; book crates moored to the shelves; the only light
    is lanterns on chains. Two boxes.

19. **The Altered Charter** [`lyra_memory_2`, `ep4_keep_f2`, step trigger at the drowned scriptorium; sets
    `lyra_memory_2`]. (canon) A water-stained witness, a scribe, shows the young Regent two copies of the charter. The
    king's reads OPEN THE RIVER GATES IN FLOOD. The sealed copy reads CLOSE. One word changed. No reading game: the
    party sees it and Mira says it.
    - Scribe (memory): "The king ordered the river gates opened." (canon)
    - The Regent (memory): "The sealed one says close. The seal is the law." (she chooses the seal)
    - Mira, now: "One word. It only ever takes one word."

20. **The dry room** [`vex_archive`, `ep4_keep_f2`, step trigger at the domed vault; sets `vex_archive_met`]. Under
    an old glass dome the water never reached, Vex Quill sits in a dry chair reading. A black feather on the table does
    not get wet. He holds the Valewyn list: cheap paper, cold hand, the seal of the empty book.
    - Vex: "Four lists. One hand. It's getting faster. Twelve years between the first two. A month between the last."
    - Vex: "Her name's at the top. I could tear it off, like your father's, Bram. It won't help. Paper's not the
      problem here. The seal is."
    - Mira: "Then give us the list." Vex: "Not this one. There's a name on it I'm not ready to hand anyone."
    - Mira: "Yours?" Vex smiles. "Read the charter, {hero}. You'll want to sign something. Do."
    - He is gone; the feather stays dry on the table. (Vex's arc warms a third notch: E2 took a list, E3 gave a corner,
      E4 gives advice and keeps a secret.)

21. **The Inkbound Barrister** [`barrister`, `ep4_keep_f2` court room, arena trigger; boss intro card; battle
    `barrister`; sets `barrister_defeated`; the stair trigger sets `keep_f2_done`]. The Keep's clerk of decrees given a
    body: a drowned advocate in a black gown with a white collar, its sleeves full of paper. Name card: THE INKBOUND
    BARRISTER / Counsel for the Forgery. (canon enemy name, new role) Intro line (arc 3.6): "It argued the seal for
    twelve years. Nobody argued back."
    - Mira, the one tip: "Every stamp makes its case stronger. Burn the paper before it objects."
    - After: Bram: "Case dismissed." Mira: "...Did you practice that?" Bram: "Twelve years."

22. **The Public Coffer** [optional, `coffer_records`, F2, side story 2]. Canon's public coffer, now a Lantern secret
    under water (plan 4.6). Mira: "True ink doesn't mind the water. The Keepers knew."

23. **The Court of Witnesses** [`keep_f3_arrival`, `ep4_keep_f3`, on enter; sets `keep_f3_arrived`]. Banner III. The
    Court of Witnesses (canon room name from `game.js`; root's "Chamber of the Last Decree" renamed, section 8). A hub
    before the Petition Gate, three wings, three principle stones (canon: Voice, Truth, Mercy). Over the gate, the
    canon principles, inspectable: "First the Voice: hear the people. Then the Truth: keep the record. Last the Mercy:
    shelter the living."
    - Mira: "Three stones. Three principles. Keepers and their sets of three." Bram: "Garrick would say the same about
      anvils."

24. **The three principles** [`principle_voice`, `principle_truth`, `principle_mercy`; each runs when the party
    strikes its wing's stone, reached through the wing's tide puzzle; any order; each sets its flag]. Each stone is a
    small bell under a dome; the party rings it and a deep note answers from the gate, with one line from the memory of
    the old king (tagged "The King"). (canon names, lines new)
    - **Voice** (west): The King: "Listen to the ones at the gate first."
    - **Truth** (east): The King: "Write it down. Then let them read it."
    - **Mercy** (south): The King: "If the law drowns someone, the law is wrong."

25. **The Oath Remembered and the Witness Book** [`lyra_memory_3` then `witness_book`, `ep4_keep_f3`, runs at the
    Petition Gate when the third principle is struck (or on the next arrival at `gate_spot`); sets `lyra_memory_3`,
    `petition_gate_open`, `hero_signed`; teaches `answer`]. (canon memory, then the hero's beat, new)
    - The vignette (canon): the young Regent kneeling by the true royal seal. The Regent (memory): "I was appointed to
      guard the people, not the paper." (canon) (a beat) "And I guarded the paper."
    - The Petition Gate opens on a lectern: the Witness Book of Valewyn. Mira: "Valewyn law. A decree stands until a
      named witness signs against it. Her name's gone. She can't."
    - Bram: "Then somebody else signs." Mira, looking at the hero: "Somebody whose name the lists keep coming for."
    - Choice: `Sign.` / `Not yet.` (`Not yet.`: Bram: "Take your time. The water won't." Then the choice again; nothing
      is lost, no route closes.)
    - The hero signs. The page is drowned vellum; the ink of every other name on it is crisp. The hero's, which has been
      faint on three fragments, goes on dark and stays. Mira: "It held. Under water. Yours held."
    - Bram: "Now they know where you are." Mira: "They always did. Now it's on the record." Learns **Answer**
      (`skill_learn`, "{hero} learned Answer.").

### Act V: The Paper Regent

26. **The Drowned Throne** [`paper_regent`, `ep4_keep_crown`, trigger row at the entry; boss intro; battle
    `paper_regent`]. A round throne room, water to the ankles of the dais, and on the throne a tall figure of folded
    decrees in turquoise robes, a gold crown, a trident (bosses cell 3, canon). It speaks in capitals like the
    Archivore, the King and the Warden. Name card: THE PAPER REGENT / Keeper of the Seal. Intro line (arc 3.6):
    "Everyone obeyed the seal. Nobody read it."
    - Regent: "THE SEAL IS THE LAW. THE LAW IS DRY."
    - Regent, to the hero: "A NEW NAME IN THE WITNESS BOOK. IT WILL BE STRUCK FROM THE ROLL."
    - Choice: `Read it the charter.` / `Give the seal back.`
    - Mira, the one tip: "When it stamps, burn it. When it unrolls your name, answer it. You. Not us."
    - Phase 3 battle message: "The crown is paper. The trident is a pen."

27. **What holds** [`regent_after`, `ep4_keep_crown`, after the win; sets `lyra_named`, `charter_restored`,
    `fragment4_get`; the encounter sets `paper_regent_defeated`]. The order matters; the story agent keeps it:
    1. The Regent unfolds, page by page, until it is a heap of wet decrees around a chair. Regent: "I KEPT EVERY WORD.
       I NEVER READ ONE." The crown rolls off; inside it, folded small and bone dry, the true charter on vellum.
    2. The hero unfolds it. Keeper ink, every name of Valewyn in rows, and at the top the king's relief charter: one
       word scraped and rewritten. Under the water lapping the dais, the forged CLOSE runs and is gone; the scraped OPEN
       underneath holds (`name_restore` flash). This is the fourth fragment of the Book of Names (`name_fragment_4`).
    3. Running feet: the Regent, Hale and Joss, by the ferry (they followed the lowered water). The Regent sees the
       charter and reaches for the seal on the throne.
    4. The hero holds out the Witness Book page instead. The Regent signs it under the hero's name, and her ink holds.
       The rows of the charter brighten (`triumph`). Mira, reading: "Lyra." Lyra: "...Lyra." (a beat) "Lyra. Regent of
       Valewyn. I closed the gates." Speaker swap under the flash: `regent_t` becomes `lyra_t`.
    5. Mira, reading further down: the hero's name a fourth time, under the counter-seal (the open book with one line).
       Under water, for the first time, the line can be read: three words in a warm, hurried hand. `mystery`.
       - Mira: "{hero}. Fourth fragment, fourth time. And the line under the seal. It reads." (a beat) "'Keep this
         one.'"
       - Bram: "Keep who?" Mira: "You, I think. Somebody wrote you down and asked the Book to keep you."
       - Mira: "Not the list's hand. That one's cold. This one was in a hurry." Gives `name_fragment_4`.
    6. On the table by the throne, a black feather lies on the Witness Book page, dry, beside the two signatures. Under
       them, a third mark: a single "V." Bram: "He signed it." Mira: "He witnessed it. That's new."
    7. Lyra gives the hero the Regent's gift (plan 7.3: the Tidewarden's Trident for the truth path, or the Regent's
       Pardon charm for the kind path; legendary beam, equip prompt). Lyra: "Take it. I've held the wrong thing long
       enough."

### Act VI: The Crown Remembers

28. **The tide bell** [`crown_remembers`, `ep4_valewyn`, on arrival by the ferry after `regent_after`; sets
    `tide_bell_rung`, `vw_restored`]. Joss turns the city's great lock by hand, OPEN, with the crank. The water draws
    back off the river quarter street by street. The hero rings the Keep's drowned bell from the ferry (the hero central
    to the end, as Bram rang the First Bell). The plaza fills. The board's notices dry; the forged ones are blank.
    `bell_drowned` x3, then `valewyn`, tint `none`.
    - Lyra, on the statue's steps: "I am Lyra, Regent of Valewyn. Twelve years ago I closed the river gates. They are
      open. They stay open."
    - (truth path) Lyra: "Somebody told me plainly what I did. It made this easier to say."
      (kind path) Lyra: "I've been telling myself the seal did it. I'm done telling myself that."
    - Hale: "Lyra! Ferry captain Hale says: Lyra." Lyra: "You can stop shouting." Hale: "Thirty years. I'll shout."
    - Vance tears the last dry order off the board. It's blank. "Huh. Seal's gone too."
    - The council's choice is named (side story 1): the shelter or the records "were first, and the other is next".
    - Bram: "Garrick'd like this town. Nobody here wastes water." Mira: "Bram."

29. **The ending hook** [`ep4_ending`, `ep4_valewyn` at night, straight after; sets `ep4_complete`]. Lamps on the
    canals, the right way round now. Lyra and Joss at the lock; the hero, Mira and Bram on the statue's steps. Ada the
    courier comes running with a letter that is the opposite of the decree: bone dry, gritty with sand, the address
    written in stars (root canon: "A desert oracle calls your names across the sea").
    - Ada: "Came on a ship from the south. It's addressed to all three of you. By name." Mira: "By name?" Ada:
      "Including... yours." (she says the hero's name aloud, easily, the first stranger to do so) "{hero}."
    - Mira: "Sand. And the ink is stars." Bram: "South, then." Lyra: "Come back through Valewyn. The gates are open."
    - The hero looks at the Keep. Its bell hums once, by itself, and far away, so faint only Mira hears it, something
      answers that is not a bell: wind over sand. Mira: "That's not a bell. That's a voice."
    - End cards: `End of Episode 4` / sub `The Sunken Keep`; then `Episode 5: The Last Prophecy` / sub (placeholder,
      Scott's wording) `In the desert, the words change every night.`

30. **Credits** (`CREDITS_EP4` in the pack's `text.js`, `valewyn` music), then the next morning at the Floodwatch Inn
    (`ep4_vw_inn`, mark `inn_bed`). Every Valewyn resident has new lines; the council's other district opens (side
    story 1); Emberpeak, Hollowmere and Willowmere residents have Episode 4 lines; the end card says Episode 5 is not
    playable yet.

---

## 2. Side stories

| Quest | Giver | What happens | Reward |
|---|---|---|---|
| **Three Witnesses** (canon) | Dorian, after `met_joss` | Hear Hale (the gates shut while families waited, under the Regent's seal, not her hand), Dorian (the king signed a relief charter, it was copied, altered and hidden below the Keep) and Joss (there is lock power for one district first). Then the council switches in the plaza: choose exactly one, **Shelter the River Quarter** or **Protect the Public Records**. The choice cannot be changed; the other district waits until `ep4_complete` (canon). | Shelter: 3 Hi-Potions, a dry shelter with a rest point opens in the plaza, and Hale's punt waits at the F1 landing as a ferry back (`council_shelter`). Records: 2 Hi-Ethers, book `vw_records`, and +25 Fury at the start of the Paper Regent fight (`council_records`; canon's +25 opening Focus). |
| **The Public Coffer** (canon coffer, now a Lantern secret) | Talk hint on F2 | In a drowned records alcove, raise the water over the wall and lift the Lantern: Keeper tide marks show in true ink under water (forged ink would run) and point to a hidden door. | 190 gold, 2 Hi-Ethers (canon gold, ethers upgraded), book `keep_ledger` |
| **Nilo's Bell** (new) | Nilo (the ferry landing, then Valewyn), after `ferry_rested` | Nilo's boat bell went down with his landing when the gates shut. It lies on the F1 canal floor, in a dead-end reached only at low water. Bring it back. | The Ferryman's Charm (rare unique); Nilo rings it from the landing every evening after; Nilo: "Now the boats know I'm here." |

Side quests open only once Valewyn is introduced (`met_joss`; Nilo's from `ferry_rested`). Every quest has a journal
entry and a Talk reminder. Cut line: Nilo's Bell goes first if the budget tightens.

---

## 3. Character bible

Sprite and portrait ids in brackets (plan section 9).

### The party in Episode 4

**{hero}** [`hero`]. This is their episode. Silent, through choices, emotes and what others say. Three fragments have
carried a faint copy of their name; this one carries it dark. The beat is a choice made on the record: signing the
Witness Book, which puts their name where the list-writer can see it. In the boss fight the hero answers their own
name (the skill **Answer**); in the ending a stranger says it out loud without trying. Arc beat: from "someone is
writing me in on purpose" (Episode 3) to "I will put my own name to this" (Episode 4). The subtext is the
responsibility arc's first row: a name is a promise you answer to.

**Mira** [`mira`]. The reader again, and the one who names what happened: "One word. It only ever takes one word."
She reads Lyra's name, and the line under the counter-seal. Warmer to the hero than ever; she is the one who looks at
them when the Witness Book needs a name, and the one who says "Yours held." Dry, precise.

**Bram** [`bram`]. Carries his mother's hammer (the First Bell Hammer) and his father's blessing. His beat is small and
earned: he recognizes Lyra's failure from the inside ("I know what that sounds like from the inside"), because a
foreman once told him to count the ore. He jokes when it is grim ("Case dismissed.").

### Valewyn

**The Regent, Lyra** [`regent_e` then `lyra_n`; sprite `npc_lyra`; portrait `noble_lady`, the built and unused painted
portrait cell 4] (canon name and role; her name struck, new). Fifties, dark skin, braided black hair with grey in it, a
slender gold circlet, sapphire robes gone dull at the hem from wading. Appointed regent by the old king; twelve years
ago, in her first flood, she enforced a sealed order she did not write, and the river quarter drowned. A month ago she
began asking who sealed it, and the list struck her name so she could not testify; since then the Paper Regent issues
orders under her seal. Proud, exact, ashamed, and done hiding it. Canon lines: "I believed the seal more than my
neighbors." "I was appointed to guard the people, not the paper." New: "Lyra. Regent of Valewyn. I closed the gates."

**Captain Hale** [`hale`] (canon name from `game.js`, Hale the Ferryman; carries root Chapter IV's Nessa the ferry
captain's role and testimony, renamed, section 8). Sixties, oilskin, a voice for shouting across water. Has known Lyra
thirty years. Funny, sad, loud. Canon testimony: "The tide gates were closed while families waited on the banks. The
decree bears the seal, not her hand."

**Nilo the Ferryhand** [`nilo`] (canon). Hale's hand, about twenty, whittles bell pins. Canon line: "The water was
lower yesterday. My landing is still under the tide."

**Dorian the Royal Scribe** [`dorian`] (canon). Seventies, ink-stained, the king's scribe once; he knows the king's
hand. Careful, formal, quietly furious. Canon testimony: "The last true king signed a relief charter for the river
quarter. The charter was copied, altered, and hidden below the Keep."

**Joss the Lockwright** [`joss`] (new name for canon's canal engineer Orel, who collides with Oren the baker). Forties,
big forearms, a ring of keys and the Lockwright's Crank. He did not turn the Keep's locks for twelve years because
"the order said shut", and knows that is not innocence. Canon testimony: "There is power for one district first."

**Ada the Courier** [`ada`, sprite `npc_courier_v`, the Episode 3 courier] (canon townsfolk "Ada the Courier"; the
Episode 3 courier given her canon name). Soaked to the knees in every scene but the last. Canon line: "Royal notices
arrive stamped and dry. The streets do not."

**Vance the Guard** [`vance`] (canon). Pastes up the orders. Canon line: "It is hard to enforce a law that changes in
the rain." Payoff: tears down the last forged order, blank.

**Linn the Archivist** [`linn`] (canon). Carries records to high shelves when the canal rises. Canon line: "The charter
had an open gate drawn over the last line."

**Sori the Apprentice** [`sori`] (canon, a child, Joss's apprentice). Canon lines: "I can jump across the narrow stones
when the tide is low." "The palace has the best echo for a whistle."

**The King** [memory actor `king_m`, sprite `npc_king`, no portrait] (canon role, "the last true king"; never named).
Seen only in memories and heard at the principle stones. Old, crowned, tired, kind.

### The Keep

**The Paper Regent** [boss `paper_regent`, field avatar `paper_regent_avatar`, portrait `paper_regent`] (canon name
and look: bosses cell 3, a ghostly turquoise drowned royal figure with paper-scroll robes, golden crown and trident;
nature inference). The Keepers' Clerk of the Charter: a Keeper construct made to keep Valewyn's share of the Book,
which the Keepers wrote as the kingdom's charter roll, in Keeper ink that water cannot lift, and to seal every decree
that agreed with it. Twelve years ago a list in the cold hand came down with the flood, and one word of the king's
charter was scraped and rewritten in ordinary ink; the Clerk sealed the forgery, because its order was "keep the
seal", and has sealed every order since. When the Regent began to doubt, the list took her name, and the Clerk put on
her crown. Not evil: a tool given a bad order, like Moth and the Warden. Speaks in capitals. Last words: "I KEPT EVERY
WORD. I NEVER READ ONE."

**The Inkbound Barrister** (mini-boss, canon enemy name). The Keep's clerk of argument, given a body by twelve years of
sealed paper: a drowned advocate in a black gown with a white collar.

**The Forged Writs** (canon: Forged Writ of Silence, Forged Writ of Oblivion). The Paper Regent's phase 2 adds: one
heals and silences, one wards and stamps.

### The rival

**Vex Quill** [`vex`, portrait `silver_rogue`] (canon recurring rival). Third NEXT appearance, in the only dry room of
the drowned archive. He holds the Valewyn list and will not give it up ("There's a name on it I'm not ready to hand
anyone"), counts the lists for the party (four, one hand, getting faster), tells the hero to sign, and leaves a "V."
under the hero's signature as a witness. He never fights the party.

### Returning cast

Emberpeak: Garrick, Ilya, Sella, Veyra, Rusk, Bess (one line each in Act I, one after `ep4_complete`). Hollowmere and
Willowmere residents (by the Keeper mirrors): one Episode 4 line each after `ep4_started` and after `ep4_complete`.
Holt carries the Willowmere side again: after `ep4_started` "Got a letter from Bram. Wet. Couldn't read a word but his
name." After `ep4_complete`: "Bram says there's a Regent called Lyra. Said it three times in one letter. Must matter."

---

## 4. Tone guide (what changes from EPISODE3 section 4)

Everything in Episodes 1 to 3 stands: warm first, then the chill; show forgetting, never explain it; names with weight;
short boxes; character humor; no em dashes, ASCII only, `{hero}`.

- **Rain and lamplight.** Episode 3 was ash over iron. Episode 4 is grey rain on turquoise water, white marble going
  green at the waterline, red wax, gold trim. Let sound work: rain on canals, the creak of a lock wheel, the gulp of
  water rising, the drowned bell.
- **Paper, not people.** Valewyn's sickness is obedience to paper. Show it with paper: notices that run, orders that do
  not, a pen that will not write OPEN. Nobody explains "the seal was forged"; the water shows it.
- **On the record.** Use the verbs on purpose: sign, witness, testify, answer, read, keep. The Paper Regent's capitals
  are about seals and dryness, as the Warden's were about fire and the King's about keeping.
- **The hero's silence is the point.** The hero never speaks; the hero signs. Write around them: Mira looks at them,
  Bram says "now they know where you are", a stranger says their name.
- **Humor carriers.** Bram (still scared, still joking), Hale, Sori, Ada. Never during a memory, never at Lyra's
  expense, never in the Witness Book scene.
- **Lyra's restraint cracks once.** "And I guarded the paper." Keep the rest dignified.
- **Names with weight in this episode.** Lyra (Mira first, then Lyra herself, then Hale shouting it), and the hero's,
  a fourth time, held under water, and said aloud by a stranger.
- **The responsibility arc, as subtext only.** Nobody says "take responsibility". Lyra says what she did. Joss admits
  keeping the crank was not innocence. The hero signs. The game names no real person and credits no teacher or author
  (RESPONSIBILITY_ARC section 0, decision A).

---

## 5. The lore added in Episode 4

**The Charter Roll.** The Keepers divided the Book of Names "so that no single fire could take it all" (Episode 1).
Valewyn's share was written as the kingdom's charter roll, every name of the realm in rows, on vellum, in Keeper ink,
because Keeper ink holds under water. The Keepers' Clerk of the Charter (the Paper Regent) kept it and sealed every
decree that agreed with it. The roll is the fourth fragment, the Drowned Charter.

**True ink holds; forged ink runs.** Keeper ink does not lift in water; ordinary ink does. That is why the forged
orders arrive dry and run in the rain while the true lines hold, why a papered door washes clean under high water, and
why the hero's name, faint in three fragments, holds dark on drowned vellum. Episode 2 taught hidden versus taken;
Episode 3 taught that hidden things survive; Episode 4 teaches that **true things hold**.

**The Witness Book.** Valewyn's law: a decree stands until a named witness signs against it. The list struck the one
person whose signature voids decrees on sight, the Regent. Anyone with a name can witness, though; it was never
forbidden, only frightening. The hero signs.

**The forged word.** Twelve years ago the old king, dying in a flood season, signed a relief charter: OPEN THE RIVER
GATES IN FLOOD. A list in the cold hand came down the river; someone scraped one word and wrote CLOSE in ordinary ink.
The Clerk sealed it. The Regent enforced it. The river quarter drowned, and with it the lower Keep.

**The four lists.** Vex counts them: Moth's (Willowmere), the Hollow's (fifteen years ago), Emberpeak's (twenty-five
years ago), Valewyn's (twelve years ago, renewed a month ago). One hand, one seal (an open book with nothing written in
it). The list-writer stirred a month before Episode 1 and has been working faster since.

**The counter-seal's line.** Under water the line under the counter-seal (an open book with one line written in it)
can be read for the first time: "Keep this one." A warm, hurried hand, not the list-writer's. Someone wrote the hero
into the Book and asked it to keep them.

### What the player knows by the credits
Lists in one hand have been fed to Keeper machines and Keeper bargains for at least twenty-five years; they take the
people who could undo them (a smith, a regent). The hero's name is true ink: it holds where forgeries run. Someone in a
hurry wrote "Keep this one" under it. Vex holds four lists, one with a name he will not give up, and has started
witnessing for the hero. A letter written in stars has come from a desert, addressed to the hero by name.

### Held back for later episodes (consistent with the root game)
Who wrote "Keep this one" (inference toward Vex's "first page", root canon: "I kept one thing from the Eraser: your
beginning"). Whose name Vex will not hand over. Who writes the lists (root canon: the Eraser, once the First Keeper,
the First Library). Why Mara tuned "one bell down in your valley, once". Tess's father and the White Road. The Court's
forgotten Keeper. The Oracle and the Whispering Desert (Episode 5).

---

## 6. What Episode 4 sets up for Episode 5

- **The destination.** The sand-dry letter addressed in stars, and the voice over sand: south, across the sea, to the
  Whispering Desert (root Chapter V: Nomad Sel, the Oracle Labyrinth, the Sand Oracle, "The Last Prophecy"; bosses cell
  4, environments cell 4).
- **The hero's stake.** Four fragments, a name that holds, and a line: "Keep this one." Someone is keeping the hero on
  purpose; the next question is who, and from what.
- **The rival.** Vex has four lists and a name he will not give up, and has signed as the hero's witness.
- **The party.** Unchanged: three, each now with an episode of their own behind them. Episode 5 is a fair place for a
  companion-driven story (root Chapter V says "a companion-driven prophecy story"); the party slot question goes to
  Scott and Stephen then.

---

## 7. Episode 4 by the numbers (for the writers)

About 30 scenes (keep Episode 4 under 40 built), 9 new named townsfolk (Lyra, Hale, Nilo, Dorian, Joss, Ada, Vance,
Linn, Sori) plus one memory actor (the King) and memory extras (boatmen, the scribe, a guard), 3 side stories, 3 books
(`vw_records`, `keep_ledger`, `tide_log`), 10 banners (Valewyn's has two states), about 35 inspect lines (the statue,
the flood board in its three states, tide posts, wheels, pontoons, papered doors and washed doors, the drowned bell,
the principle stones, the Petition Gate, the Witness Book, the throne, the Emberpeak washout sign in its two states,
the feather). Party chat (Talk) needs a hint for each main step on each map, in the house style, and must name
something doable after `ep4_complete` (the council's other district, the coffer, Nilo's bell).

---

## 8. Canon reconciliation (root game to NEXT)

**Kept from the root game.** Valewyn, the Drowned Crown Plaza and the region's title (here the episode title The
Sunken Keep; "The Empty Throne" is kept as the statue's subject); Regent Lyra (name, role, look from portraits cell 4);
the forged flood decrees; the Paper Regent (name, look from bosses cell 3: drowned royal figure, paper-scroll robes,
golden crown, trident), its armored first phase vulnerable to fire, the Royal Ward at about 70% with two Forged Writs
(Silence, a healer; Oblivion, a warder weak to piercing), the HP threshold while they live, the ward's break granting
the party 25 Fury (canon Focus), a faster, heavier final phase; the three witnesses' testimony (ferry captain, royal
scribe, canal engineer) and the council switches (Shelter the River Quarter, Protect the Public Records, exactly one,
the other after the episode, acknowledged at the end); the Floodwatch Inn, the Riverbank Provisioner, the Crown Guard
Forge, the flood emergency orders board; the empty coronation statue and its inscription; the Sunken Keep's three
floors (Tidegate Causeway, Archives Below Water) and the Sunken Seal Key in the north gallery of floor I; the Eastern
Tidegate as a real chokepoint; Lyra's three memories (The Flooded Audience, The Altered Charter, The Oath Remembered)
and their lines; one word forged, OPEN into CLOSE; the three principles Voice, Truth, Mercy; the public coffer (190
gold, two ethers); the townsfolk Nilo, Ada, Vance, Linn, Sori and their lines; Hale the Ferryman (`game.js`); the room
name Court of Witnesses (`game.js`); "a desert oracle calls your names across the sea" as the hook; the region-4 Suno
brief (flowing harp, lyrical strings, soft flute, waterlike celesta, 90 BPM) as the town theme's brief for the in-repo
tracker; the pumphouse trial's "lower the water to expose submerged stones" as the field mechanic's root.

**Changed, with reasons.**
- The old Drowned Charter word grid is gone (DESIGN hard rule 2). The Archive Floodlock opens on water level and the
  floor's own puzzle.
- The tidal plan and pump blueprint inscriptions that printed their answers ("WEST INTAKE = HIGH; NORTH DRAIN = LOW")
  are gone: water you can see standing at a striped post is the readout (DESIGN 5.3). The four-state sluices and
  three-state pumps become tide wheels with three visible marks.
- Flood tiles that damage the party are gone (no damage tiles: phone players). The council's Shelter reward is
  re-expressed as healing, a rest point and a ferry shortcut; the Records reward's +25 opening Focus becomes +25 Fury,
  as in Episodes 2 and 3.
- The record-imprint order puzzle (Petition, Forgery, Crown, wrong order resets) and the recited principles order
  (Voice, Truth, Mercy, wrong choices reset) are gone: no order puzzles, no text-instruction puzzles. The coffer is a
  Lantern secret; each principle stone sits at the end of its wing's tide puzzle and can be struck in any order (the
  Episode 3 oath pattern).
- Lyra is not named in plain sight. Root canon names her openly from the first conversation; here the list has struck
  her name (tag "The Regent") until `regent_after`. Reason: "Downriver, a kingdom forgets who rules it" (Episode 3's
  end card) and the episode's whose-name-was-erased spine. (open for Scott and Stephen, section 10)
- Root Chapter IV's "Nessa (ferry captain)" collides with Nella the Ferrymender (Willowmere: same job, near the same
  name). Her role and testimony go to Hale the Ferryman (root `game.js` canon). Root "Orel (canal engineer)" collides
  with Oren the baker; the engineer is Joss the Lockwright (new name). Root "Royal Paper Guard" and "Sluice Specter"
  are dropped (no free enemy cell; "Specter" is the Episode 3 mini-boss's word).
- Root floor III, "Chamber of the Last Decree", is renamed "The Court of Witnesses" (root `game.js` room name): the
  Nameless King already owns a move named Last Decree (`last_decree`, `skills.js`).
- Lyra's Witness Seal bond (Aegis, +30 Focus, one automatic interruption) is not an item or a bond here: the Fine Print
  tier already owns the id and name `witness_seal` ("Witness Seal", a legendary). Its function becomes the hero's skill
  **Answer**, learned in `witness_book`, which the player times against the Strike from the Roll (the decision stays
  the player's).
- The Paper Regent's four phases become three: phase IV's Flood Decree pressure folds into phase 3 with Haste.
- Root `game.js` Bram line "Valewyn fell while I was following an order that no longer made sense" contradicts NEXT
  (Bram was in Emberpeak and Willowmere); it is re-aimed as Bram recognizing Lyra's failure from his own foreman's
  order.
- **Inference:** the forgery was twelve years ago and renewed a month ago. Basis: root canon has a first altered decree
  and later forged flood decrees; NEXT's list-writer stirred a month before Episode 1; Episodes 2 and 3 put earlier
  lists at fifteen and twenty-five years.
- **Inference:** the Paper Regent is a Keeper construct (the Clerk of the Charter) on an order, and the fourth fragment
  is the kingdom's charter roll in Keeper ink. Basis: bosses cell 3 (a drowned figure of paper, not a person), the
  root's "charter was copied, altered and then hidden below the Keep", Episode 1's division of the Book, and the
  Echo Warden, Moth and Cinder Warden pattern.
- **Inference:** the list struck Lyra because she was about to testify. Basis: root canon has her vow to testify
  publicly; Episode 3's lore that the lists take the people who can undo them.
- **New:** the Flood Road; Ada as the Episode 3 courier; the running decree; true ink and forged ink; the Witness Book
  and the hero's signature; the skill Answer and the Strike from the Roll; Vex's dry room, his count of the lists, his
  kept name and his "V."; "Keep this one"; the drowned bell rung by the hero; Nilo's Bell; Joss's crank; the Decrees
  battle rule; tide locks.

**Name collisions to respect.** Episode 1 owns `garrick`, Episode 2 owns `vow_*`, `testimony_*` for the Hollow
witnesses, `vex_mirror`, `black_feather*`, `rook`, Episode 3 owns `garrick_e`, `garrick_n`, `oath_*`, `testimony_ilya`,
`testimony_harl`, `testimony_sella`, `vex_furnace`, `courier_v`, the map prefix `pk_` and every `foundry_` and `sand_`
id. The Nameless King owns `last_decree` and the move name Last Decree. Fine Print owns the ids and names `countersign`,
`witness_seal`, `codicil`, `errata`, `marginalia`, `strikethrough`. Episode 2 owns the name Paper Crown. Episode 4 uses:
map ids `ep4_*` (never bare `valewyn` as a map id), `regent_e` / `lyra_n` for the Regent's records, `testimony_hale`,
`testimony_dorian`, `testimony_joss`, `principle_*` for the stones, `vex_archive`, the skill `answer`, the boss move
`strike_roll`, the flare `flood_decree`, encounter prefixes `e4r_`, `e4k1_`, `e4k2_`, `e4k3_`. Full registry: plan
section 2.

---

## 9. Build notes

Reserved for E4-story (wave 4a): what the built script does beyond the beat sheet (deltas only, as EPISODE3 section 9).

---

## 10. Choices made tonight that are Scott's or Stephen's (open for Scott and Stephen)

None of these blocks the build; the default is what the build agents use.

1. **Lyra's name is struck** (tag "The Regent" until the boss), where root canon names her openly. [default: struck]
   (open for Scott and Stephen)
2. **The hero's episode**: the hero signs the Witness Book and learns Answer; no new companion. [default: yes]
   (open for Scott and Stephen)
3. **"Keep this one."** as the readable line under the counter-seal. It adds a mystery (who wrote it) without answering
   one. [default: these three words] (open for Scott and Stephen)
4. **Vex keeps the Valewyn list** because "there's a name on it I'm not ready to hand anyone", and signs "V." as a
   witness. Mira asks "Yours?" and he does not answer. [default: yes, unanswered] (open for Scott and Stephen)
5. **Renames for collisions:** Nessa to Hale, Orel to Joss, floor III to The Court of Witnesses, the Witness Seal bond
   to the skill Answer. [default: as listed] (open for Scott and Stephen)
6. **Fine Print and Episode 4.** A Fine Print run does not enter Episode 4 tonight (`ep4_morning` needs `not tier_1`);
   Fine Print stays unlocked by `ep3_complete`. Whether the tier moves to `ep4_complete` and scales Episode 4 is a
   later, separate piece of work. [default: Episode 4 is base-game only for now] (open for Scott and Stephen)
7. **The Episode 5 card wording.** [placeholder "Episode 5: The Last Prophecy / In the desert, the words change every
   night."] (open for Scott and Stephen)
8. **Shipping.** Episode 4 is built behind `EP4_LIVE` on the branch; E4-integrate flips it on the branch only after the
   full gate list. Shipping to players stays Scott's or Stephen's explicit word.
