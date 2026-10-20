# Episode 2: The Town Without a Name

Story bible for Lexicon Quest NEXT, Episode 2: the Fading Road, the Nameless Hollow, the Court of Mirrors and the
Nameless King. Written by ep2-designer (W9), 2026-10-20, for a later build wave. The production side (every id,
map layouts, the new field mechanic, combat numbers, loot, music, assets and the agent briefs) is in
`docs/EPISODE2_PLAN.md`. When built, the script lives in `src/data/story/ep2.js`, NPCs in `src/data/npcs.js`,
quests and party chat in `src/data/quests.js`, lore, books and banners in `src/data/text.js`, and the staging
guide for map authors in `docs/story/STAGING_EP2.md` (written by the story agent, same shape as `STAGING.md`).

**Sources.** `EPISODE1.md` section 6 (the setup), the root game's Chapter II: `rpg-chapter2.js`,
`CHAPTER_II_MILESTONE.md`, `rpg-engine.js` (Mira's three mirror memories, the Nameless King's phases, the Aurel
ending), `rpg-townsfolk.js` (the Hollow's residents), `game.js` (Vex Quill's chapter scenes, the mirror rumors),
`rpg-data.js` (the region record), `ART_PROMPTS.json` (which painted cells exist), and
`../REFORGED_REALMS_VISION.md` (the target loop). Tags used below: **(canon)** comes from those files, **(new)** is
invented here, **(inference)** is a synthesis of canon fragments; every inference is listed in section 8.

**Logline.** The road east has forgotten where it goes. At its end is a town that cannot say its own name, where
nobody has a reflection, and across its still mere stands the Court of Mirrors, where a king with no name keeps
every face the town ever cast. Mira is going home to a place she cannot name, to keep a promise she cannot
remember making.

**Target length.** 60 to 90 minutes first play: Willowmere morning and the crossing 6, the Fading Road 12, the
Nameless Hollow 15, Court F1 12, F2 16 (with the Other Selves), F3 15, the Nameless King 8, Hollowmere and the
ending 6. Optional content adds 15 to 20 (three side stories, the portraits, the road's secrets, the Willowmere
revisit through the mirror).

**Levels.** Episode 1 ends at Lv 9 (the simulator's progression, Fact). Road 9 to 10, Court F1 10 to 11, F2 11 to
12, F3 12 to 13, the Nameless King fought at 13.

**What this episode is about.** Episode 1 asked "who is eating our names?" Episode 2 asks "what would you give to
keep someone?" Every major character answers it: Aurel gave his name for his son, the Court kept every face to
keep the town, Elian keeps a ledger, Tovin keeps rowing, Anwen keeps a register, Mira kept running, Bram keeps
standing at his post. The villain of the episode is not a monster. It is keeping, gone wrong.

---

## 1. Beat sheet

Scene ids for `ep2.js` are in brackets. Flags are the Episode 2 main flags from the plan (section 2 there) unless
noted. Every scene follows the Episode 1 wrapper rules (guarded by `SCENE_CONDITIONS`, input locked for its run).
Key lines are samples in final voice, already inside the box rule (3 lines of 42 characters); the story agent
writes the rest.

### Act I: Willowmere, the morning after

1. **The morning after** [`ep2_morning`, `hero_home`, on enter after the Episode 1 credits; sets
   `ep2_morning_done`]. Dawn. Hazel at the hearth with the kettle. She heard the thirteenth bell too. She gives two
   Hi-Potions and does the boots-and-fingers count again, in advance.
   - Hazel: "You heard it too. Thirteen."
   - Hazel: "Mira's been at the well with Mael since sunrise. Bram packed twice. Once for him, once for you."
   - Choice: `I'll come back.` / `Don't wait up.` Either way: "I'll wait up. That's not a choice. That's what I do."

2. **Mael's letter** [`ep2_mael`, `willowmere`, talk to Mael at the well; gives `mael_letter`; sets
   `ep2_started`]. Mael, Mira and Bram at the well. Mael has written a letter of introduction to whoever keeps the
   names in the town east of the river. He tried to write the town's name on it and the pen would not go: the
   line is blank. He checked the Register before his tea, as promised: the hero's name is still faint. Bram reports
   that Garrick left before dawn with a note on the forge: GONE TO THE FORD.
   - Mael: "Every book I own about the Hollow stops in the same place. As if the writer forgot the next word."
   - Mael: "If anyone in the Hollow can say {hero}'s name better than I can, bring me back how."
   - Mira: "The list had a place scratched out. East. That's where we go."

3. **Optional farewells** (free roam, all short).
   - [`iris_farewell`, `library`] Iris shows Mira her list, THINGS NOT TO FORGET. She has added a first line:
     "Mira. Come home." Mira: "You put me first." Iris: "Alphabetical order was never my strength."
   - [`tess_last_route`, `willowmere` south square; sets `last_route_started`] Tess: her father carried the east
     post before her, and his route book never came home. "If the Hollow has a lost-property shelf, it has his
     satchel. Couriers can feel these things."
   - The smithy is empty; its sign reads GONE TO THE FORD. G. (inspect line). Anvil the dog is waiting at the door.

4. **Garrick's Crossing** [`garrick_crossing`, `valley`, step trigger on the east road before the ford; sets
   `crossing_done`]. The ford that was washed out in Episode 1 is planked. Garrick and Hal are hammering the last
   board. Hal complains that Garrick would not let him carry the heavy end. Garrick carves the toll into the rail.
   - Hal: "Seventy years old and he won't let me carry the heavy end." Garrick: "Seventy-one."
   - Garrick, to Bram: "Toll's one word." Bram: "Garrick." Garrick: "Paid."
   - The rail reads GARRICK'S CROSSING. SAY IT WHEN YOU CROSS. Mira: "Is that a sign or an instruction?" Bram: "In
     this family, both."

### Act II: The Fading Road

5. **The road forgets** [`east_road_arrival`, `east_road`, on enter; sets `east_road_arrived`]. Banner: The
   Fading Road. The paving thins to ruts, the ruts to grass. A signpost with blank arms. This is the first time the
   player sees the third stage of erasure (EPISODE1 lore): the thing itself thinning.
   - Mira: "Stage three. Writing first, then memory, then the thing itself. Roads forget where they go."
   - Bram: "Then we remind it. Right. One foot, then the other."

6. **The first fight** [`east_first_fight`, step trigger across the road a few tiles in; scripted battle
   `road_mixed`, cannot be fled; sets `east_first_fight_done`]. A Mist Wolf and a Glassback Beetle cut the road.
   The beetle always opens with Harden, so its shell glitters (Protect plus the reflect marker) on the first turn
   and a spell aimed at it rebounds. This is the one teaching fight of the episode, like the Episode 1 wolves: it
   teaches Reflect without a tutorial box.
   - Before: Bram: "A wolf, and something wearing a mirror." Mira: "Its shell is glittering. Careful what you
     throw at it."
   - After: Mira: "It threw my spell straight back at me." Bram: "Shiny ones do. Crack the shell, then cast."
     Mira: "Axe first, then magic. Noted."

7. **The old milestone** [`old_milestone`, object; optional]. A worn milestone with one word left: HOLLOW. The
   rest is not faded; it is gone. With the Lantern raised, nothing appears.
   - Mira: "The Lantern shows what was hidden. This wasn't hidden. It was taken."

8. **The cairns** [`fading_stretch`, step trigger at the edge of the mist band; sets `saw_cairns`]. Mist rolls
   over the grass and the road is gone. Stacked stones mark the way. Stepping off the cairn line inside the mist
   walks the party back out of the mist's west edge (a soft white fade; plan section 5.4). The first time it
   happens, a bark [`fog_loop`]: Mira counts the pebbles on the cairn they just passed.
   - Mira: "Cairns. Somebody stacked these so the road would remember where it goes."
   - Bark: Mira: "We've passed this one. Eleven pebbles. I counted." Bram: "Stay on the stones."

9. **The Waystation** [`waystation_rest`, the campfire object; `safe`, `rest`; sets `waystation_rested`]. A
   ruined toll house with a blank toll board, Penny's cart (she travels now: "He worries. I sell. I go where the
   roads still go."), and the Chrono Trigger fireside beat. One choice, then the rest flow:
   - `Mira, that tune?` Mira has been humming since the fork and does not know the song. The music cue is the
     Hollow lullaby on a music box (the `hollow` theme, first heard here). "It's been in my head since the fork. I
     don't know where I learned it."
   - `Bram, how is Garrick?` "He said my name forty times at breakfast. I counted. Mira's catching."
   - `Just rest.` "Bram is asleep before the fire settles. Mira counts stars until she isn't."

10. **The mere** [`mere_view`, step trigger on the rise above the shore; sets `saw_court`]. The road tops a rise.
    Below: a still lake, a town on its shore, and across the water a palace of glass whose reflection lags behind
    it, a heartbeat late. Camera pan to the distant Court; `mystery`.
    - Mira: "...I know this. I don't know how I know this."
    - Bram: "Then we'll find out how."

### Act III: The Nameless Hollow

11. **Welcome home** [`nh_arrival`, `nameless_hollow`, on first enter; sets `nh_arrived`]. Perpetual
    silver-violet dusk. The sign over the gate is blank. A boy, Nico, is chalking a crown on it. Corin the
    watchman greets them the only way the town can. The square is busy and cheerful and every sign is blank.
    - Nico: "Every sign gets a crown. That's the rule. I made the rule."
    - Corin: "Welcome to... Welcome home. That's what we say here. It's easier."

12. **The Fountain of Faces** [`fountain_faces`, step trigger near the fountain; sets `met_elian`]. The party
    sees their reflections in the fountain. The townsfolk standing around it have none (the reflection system, plan
    5.2). Sava gasps; a small crowd gathers to look at faces in the water. The hero's reflection is a smudge, like
    breath on glass. Elian, a young man in a mayor's coat far too big for him, pushes through with a ledger under
    his arm and looks at Mira a moment too long.
    - Sava: "You have faces in the water!"
    - Bram: "{hero}. Yours is... faint." Mira: "Like the name."
    - Elian: "Have we met? You stand like someone I used to wait for." Mira: "I... don't think so."
    - Elian: "Come to the hall. You'll want to hear this sitting down."

13. **The mayor's hall** [`elian_hall`, `nh_hall`, step trigger inside the door; sets `heard_crisis`]. Elian lays
    out the crisis in short boxes:
    - Fifteen years ago the town lost its name overnight. The next morning nobody had a reflection.
    - Across the mere the Court of Mirrors shut its doors. Its king has not been seen since.
    - "We remember each other. We simply cannot remember where we are."
    - He writes every resident's name in his ledger every morning: "If a name is going to go, I want to see it
      leave." Lately the town's mirrors crack, and each crack takes a memory with it.
    - Two nights ago, at midnight, Sister Anwen heard a bell across the water. Thirteen strokes. Mira: "We heard
      it too. The whole valley heard it."
    - The hero hands over Mael's letter. Elian reads the blank line and smiles for the first time: "He couldn't
      write it either. Good. I thought it was only us. I'll answer it when I have a name to sign."
    - He sends them to the chapel.

14. **The white line** [`anwen_register`, `nh_chapel`, step trigger; sets `met_anwen`]. Sister Anwen at the
    register lectern among her candles. One line in the chapel register went white at the thirteenth stroke.
    `sorrow` enters on the white line.
    - Anwen: "Fifteen years ago I wrote one name on this line and swore to keep it. At the thirteenth bell, it
      went white."
    - Anwen: "I don't know whose it was. That is what frightens me."
    - Anwen: "My grandmother said the thirteenth bell only rings when the town remembers who it rings for."
      Mira: "Pip says that. In Willowmere. Word for word."
    - Mira, without meaning to: "Forty-one." Anwen goes still: "A little girl counted my candles every night.
      Forty-one. She was never wrong."
    - Mira: "I don't remember. I just counted." Anwen: "Then your hands remember. That's a start."
    - Anwen: "Tovin rows the only boat on the mere. He won't go to the Court. Ask him anyway."

15. **A second crossing** [`tovin_ferry`, `nameless_hollow` ferry landing, talk to Tovin; sets
    `court_ferry_open`]. Tovin mends a net and refuses: the Court keeps what it takes. Then he sees Mira. Fifteen
    years ago a girl begged him to row her to the Court because her friend had gone in after his reflection. She
    came out alone at dawn and would not look at the water. Mira kneels on the pier and looks: her reflection, and
    for one breath beside it, the reflection of a small boy. Then only hers.
    - Tovin: "Nobody rows to the Court. The Court keeps what it takes."
    - Tovin: "She called herself Mira. She came out alone at dawn and wouldn't look at the water."
    - Mira: "...Then watch me look." (beat, the boy's reflection, gone) Mira: "There was a boy."
    - Tovin: "Get in the boat. I owe that girl a second crossing."

### Act IV: The Court of Mirrors

16. **The crossing** [`court_crossing`, `court_f1`, on the first arrival by ferry; sets `court_entered`]. The mere is so
    still the boat seems to row across the sky. The Court's reflection lags behind the Court. Tovin will wait at
    the landing and row them home whenever they ask.
    - Narration: "The mere is so still the boat seems to row across the sky."
    - Tovin: "I'll wait at the landing. I've waited longer for worse."

17. **The Silverglass Antechamber** [`court_f1_arrival`, `court_f1`, step trigger at the great door; sets
    `court_f1_arrived`].
    Tall mirrors line the hall. Mira and Bram reflect. The hero's reflection has no face. Then the room shows its
    machinery: a beam of moonlight bending off a mirror. No instruction follows; the first room teaches the beam
    (plan 4.4 and 5.1).
    - Bram: "Your reflection's smudged. Like breath on glass."
    - Mira: "Mirrors here keep faces. Yours is faint, so they can't hold it." Choice: `It's fine.` / `...` Mira, to
      either: "It isn't. But it's ours to fix."

18. **The Child in the Window** [`mira_memory_1`, `court_f1`, step trigger at the tall window of the stairs hall;
    sets `mira_memory_1`]. (canon text) The window glass shows a small girl. Music box `hollow`, then back to
    `court`.
    - Mira: "I came here when I was little. The king showed me someone brave enough to rescue everyone."
    - Mira: "She was not me. I ran away instead."
    - Bram: "You were a child." Mira: "I was seven, and I ran."

19. **The Silverglass Lock** [`silverglass_lock`, runs when the stairs receptor first lights; the stairs trigger
    sets `court_f1_done`]. The three-lens beam crosses three chambers and lights the crystal beside the stairs
    gate (canon: "A silver beam crosses three chambers"). A short pan along the beam, `beam_hit`, the gate opens.

20. **The Hall of Other Selves** [`court_f2_arrival`, `court_f2`, on enter; sets `court_f2_arrived`]. Portraits
    with blank faces line the gallery.
    - Narration (canon): "Every portrait resembles someone you once knew. None of you can remember the sitter."
    - Bram: "That one has Holt's ears." Mira: "They're the town. Before."

21. **The three portraits** (optional objects [`portrait_child`, `portrait_keeper`, `portrait_king`]; the third one
    seen, in any order, sets `remembrance_open` and the Remembrance Cache appears). (canon titles)
    - A Child at the River: a small boy at the edge of the mere, a ferryman's hand reaching for him.
    - A Keeper in the Court: the frame is empty. "Whoever built this place is gone from it entirely."
    - A King Without a Crown: a man in a long coat, his crown in his hand, a boy on his shoulders.
    - Mira, after the third: "A child, a keeper, a king. The Court kept them in order."

22. **The Forgotten Promise** [`mira_memory_2`, `court_f2`, step trigger at the reflection pool on the island;
    sets `mira_memory_2`]. (canon text) The pool shows young Mira reaching toward a smaller child. `sorrow`.
    - Mira: "I promised I would come back for him."
    - Mira: "The mirrors made me forget the promise. Not the person."
    - Mira: "I still can't see his face."

23. **Vex Quill** [`vex_mirror`, `court_f2`, step trigger in the corridor before the arena; sets `vex_met`]. A
    great mirror shows the party, and among their reflections a silver-haired man who is not in the room. The
    music drops to silence, then `mystery`. Vex's first appearance in NEXT; his lines merge his root-canon Chapter I
    and Chapter II lines.
    - Vex: "Reflections are honest only when they disagree with you."
    - Bram: "Who are you?" Vex: "Vex Quill. I collect things nobody is using."
    - Vex, to the hero's blur: "Yours has no face. Do you know why?" Choice: `Do you?` / `Get out of the mirror.`
    - Vex: "If a name can be stolen, perhaps it never belonged to you."
    - Vex: "You're missing a page, {hero}. Not that one. The first one."
    - Mira: "What does that mean?" Vex: "That someone is reading your story out of order."
    - Vex taps the glass: "Your reflections are restless. I'd hurry." He is gone.

24. **The Other Selves** [`other_selves`, `court_f2` arena trigger; boss intro in the W5 style; battle
    `other_selves`; after it sets `other_selves_defeated`; the stairs trigger sets `court_f2_done`]. The party's
    reflections step out of the great mirror (`reflection_out`). Mira's says what Mira fears. Bram's says what Bram
    was trained to be. The hero's has no face and says nothing. Name card: THE OTHER SELVES / Hall of Reflections.
    - Mira's Reflection: "I ran. You'll run too."
    - Bram's Reflection: "Stand still. Guards stand still."
    - Nameless Reflection: "..."
    - Mira, the one combat tip: "They're us, backwards. Hit each one with what its owner doesn't carry."
    - After: the reflections crack and fall as glass. Mira: "I'm not running." Bram: "Never thought you were."
      The great mirror is now a doorway down. The Twinfold Charm drops in the Victory window (legendary beam).

25. **The Unnamed Throne** [`court_f3_arrival`, `court_f3`, on enter; sets `court_f3_arrived`]. Dark. The floor is
    a black mirror. Far ahead behind glass stands an empty throne, and in the floor's reflection a crowned shape
    sits on it. `mystery`.
    - Bram: "There's someone on that throne. Down there. Not up here."
    - Mira: "Three doors, three vows. The Keepers loved a set of three."

26. **The three vows** [`vow_belonging`, `vow_mercy`, `vow_courage`; each runs the first time its wing's vow
    receptor lights; each sets its flag]. The vow mirror plays a memory of the King, in reflection only, with the
    lullaby (`hollow`). (canon vow names; the scenes are new)
    - **Belonging** (west wing): festival day in the square. The King hands paper crowns to the children. The
      smallest boy will not take one. Boy: "I want yours." King: "Then you shall have it, when you are grown."
      The King's own paper crown sits in a side alcove of this wing (Nico's quest).
    - **Mercy** (east wing): Tovin wades out of the mere carrying a soaked little boy. Tovin: "I looked away for
      one breath." King: "You brought him back. That is all I will remember of today."
    - **Courage** (south wing): the King before the great mirror with a sheet of cheap paper. The top line is a
      child's name; under it, the town's. King: "Take mine instead." His mouth keeps moving after that, and no
      sound comes out.

27. **What She Finally Remembers** [`vow_door`, `court_f3`, runs when the third vow is lit and the party
    reaches the door; sets `vow_door_open`, `mira_memory_3`]. (canon memory text, then new lines) The vow door's
    three crystals blaze and it opens. Mira touches the throne's reflection in the door glass. `sorrow`, then
    `mystery`.
    - Mira: "I did come back. The child was the king's son."
    - Mira: "The king protected this town because he couldn't bear to lose him again."
    - Mira: "He carried the boy out himself, before he shut the doors."
    - Bram: "Guardians are taught to stand still. I was good at it." Bram: "He's a guard at a post nobody came to
      relieve." Mira: "Then we relieve him."

28. **A black feather** [`black_feather`, optional object in the throne antechamber; gives `black_feather`]. On
    the arm of a glass bench, a black feather.
    - Mira: "Black. Our friend from the mirror." Bram: "Not my friend."

### Act V: The Nameless King

29. **The King** [`nameless_king`, `court_throne`, trigger at the entry; boss intro; battle `nameless_king`].
    The King sits with his back to them before a great mirror in which the whole town is reflected: people,
    roofs, the fountain, a festival. He speaks without turning, in capitals like the Archivore, then turns: his
    face is a veil of glass. Name card: THE NAMELESS KING / Keeper of the Court. `boss_king`.
    - King: "NOTHING MORE WILL BE TAKEN. I KEEP IT ALL."
    - King, to Mira and Bram: "YOU HAVE FACES. I WILL KEEP THEM SAFE."
    - King, to the hero: "...YOU. YOU HAVE NO REFLECTION TO KEEP."
    - Choice: `Let them go.` / `We're taking them home.`
    - Mira: "He isn't eating them. He's hiding them." Bram: "From what?" Mira: "From the list."
    - Battle tips live in Talk at the font outside and in one line here. Mira: "When his mirror turns to one of
      us, defend. Break him and the glass cracks."
    - Phase 3 battle message (the veil shatters): "Under the glass is a tired man's face."

30. **Aurel** [`king_after`, `court_throne`, after the win; sets `aurel_named`, `mirror_sigil_get`; the encounter
    sets `nameless_king_defeated`]. The order matters; the story agent keeps it:
    1. The King kneels and the glass veil falls away. In the last unbroken mirror he sees a father holding his
       young son (canon). King: "I traded my name for theirs." (canon)
    2. Mira (canon): "You were never forgotten. I remember your son, and I remember you."
    3. King: "My son. Is he...?" Running footsteps: Elian, rowed over by Tovin. Elian: "I couldn't wait in the
       hall. I've been waiting fifteen years."
    4. The King sees the coat. "That coat. It was always too big for you."
    5. Cracks race across the great mirror; reflections pour out of it like birds and stream back over the mere
       (`glass_break`, particles). Elian's memory returns with them: "...Father." Then, with weight: "Aurel. Your
       name is Aurel." (`name_restore`, flash). Aurel: "Elian." Both: heart emotes. `triumph`.
    6. A golden page rises from the empty frame: the second fragment of the Book of Names. The Hollow's names, and
       at the top, the town's own. Gives `name_fragment_2`. Mira, reading: "Hollowmere."
    7. Mira, further down: "{hero}. Your name is on this page too." Bram: "It was on the other one." Mira: "A
       name is written once in the Book. Once." Bram: "Then someone wrote it twice." `mystery`.
    8. Aurel's warning (canon): "There was a list. Cheap paper, a cold hand, and a seal: an open book with nothing
       written in it." "It was written in the First Library. I kept it, to know my enemy." "A man with silver hair
       took it from my hand while I slept, and left a feather." Bram: "Vex."
    9. Aurel gives the Mirror Sigil (canon reward): "Any mirror the Keepers made will open for whoever carries
       this." Gives `mirror_sigil`.
    10. Elian gives Mira a small bow, the Kept Promise: his father made it for him, and it was wrapped in the coat
        on the chapel step. "You came back. That was the whole promise." Mira: "Fifteen years late." Elian: "You
        came back." Gives `kept_promise` (legendary beam, equip prompt). `hollowmere`.
    11. The great mirror's frame now shows the square. Aurel: "Go through. The town should see you come home."

### Act VI: Hollowmere

31. **Hollowmere** [`hollowmere_restored`, `nameless_hollow`, on enter through the fountain (the party steps out
    of the fountain's reflection); sets `nh_restored`]. Silver letters fill the blank signs one by one. People
    find their faces in the fountain and laugh or cry. The dusk tint lifts to the first real morning in fifteen
    years. `hollowmere`, `bell_peal` from the chapel.
    - Corin: "Hollowmere! The watch of Hollowmere! I've wanted to say that for a year I couldn't name."
    - Lena: the clocktower has hands again. "Ten past four! I have never been so happy to be late."
    - Nico: "My crowns are on real signs now!"
    - Anwen, with the register: the white line reads AUREL. "It rang for him. And now we remember who it rang for."
    - Mira at the fountain, looking at her reflection: "Hollowmere. I'm from Hollowmere."
    - Bram: "Took you long enough to say it." Mira: "Fifteen years. I counted."

32. **The ending hook** [`ep2_ending`, `nameless_hollow` at night, straight after; sets `ep2_complete`]. Lanterns
    on the water. The hero looks into the fountain: the reflection is there now, but faint, like writing seen
    through water (the Episode 1 image, kept on purpose). A red glow on the mountains to the north-east. From far
    to the west, across the water, a single toll.
    - Mira: "It's there. That's more than yesterday."
    - Mira: "...Thirteen."
    - Bram goes very still. "That glow. That's Emberpeak. That's my mountain."
    - Mira: "Then that's where we go next." (Bram's Episode 1 line, given back to him.) Bram: "All three of us."
    - End cards: `End of Episode 2` / sub `The Town Without a Name`; then `Episode 3: The Forge of Ash` / sub
      `Far away, the mountains begin to smolder.` (canon line)

33. **Credits** (`CREDITS_EP2` in `text.js`, `hollowmere` music), then the next morning in the Signless Inn
    (`nh_inn`, mark `inn_bed`). Every Hollowmere resident has new lines; the mirror warps to Willowmere and the
    Court are open; Willowmere residents have Episode 2 lines.

---

## 2. Side stories

| Quest | Giver | What happens | Reward |
|---|---|---|---|
| **The Fountain of Faces** (canon) | Orla's hint at the landing shrine; opens with `court_ferry_open` | Hear the three witnesses: Lena (the clock with no hands and the king's bargain), Tovin (already heard in `tovin_ferry`, counts automatically) and Anwen (the king gave up his name to keep the town alive, and cannot remember why). Then inspect the fountain: for one breath it shows the townsfolk's faces and whispers half a word, "Hollow..." | 90 gold, 2 Hi-Ethers (canon gold, ether upgraded), the Merewarden Mantle (set piece), and `fountain_blessing`: the party starts the Nameless King fight with +25 Fury (canon's opening bonus, re-expressed in NEXT terms) |
| **The Last Route** (new) | Tess (Willowmere, Act I) | The Signless Inn's lost-property shelf holds a courier's satchel with Willowmere post marks. The route book's last page: "The Hollow (the name smudged). Then north, by the White Road." Give it to Tess (walk home, or use the mirror warp after the Sigil). | Courier's Knot (rare charm). Tess: "North. He went north. That's further than nobody." Keeps her thread alive toward the Hollow North. |
| **A Letter Answered** (new) | Elian, after `nh_restored` | Elian writes his reply to Mael and signs it "Elian, Mayor of Hollowmere". Deliver it to Mael. | Mael writes HOLLOWMERE into the Willowmere Register in his best hand; 2 Phoenix Feathers. Mael: "There. Now two towns remember it." |
| **Nico's Crowns** (canon seed, new quest) | Nico (after `court_entered`) | Nico chalks crowns on every blank sign because he dreams of a crown. The King's own paper crown waits in the Belonging wing of F3. Show it to Nico: he remembers festival day, when the king gave every child a paper crown. | Nico insists {hero} keeps it: the Paper Crown (head, unique). Nico gets a line in `hollowmere_restored`. |
| **The Three Portraits** (canon, now optional) | Orla's line about the empty middle frame | View all three portraits on F2, in any order. | The Remembrance Cache: 140 gold, 2 Ethers (canon), plus the lore book `court_ledger`. |

Side quests open only once the town has been introduced (`met_anwen`), so the Hollow does not front-load errands
(PLAYTEST_REVIEW_1 fix 1). Every quest has a journal entry and a Talk reminder.

---

## 3. Character bible

Sprite and portrait ids in brackets (plan section 9). Voice samples are from the beat sheet.

### The party in Episode 2

**{hero}** [`hero`]. Still silent, still speaking through choices and through what others say. This episode turns
the faint name into something visible: the hero's reflection is a smudge in every mirror of the Court, the King
says the hero has no reflection to keep, Vex says a page is missing ("the first one"), and the second fragment
holds the hero's name a second time. The hero ends with a reflection that is there but faint. Arc beat: the
question moves from "why is my name fading?" to "where did my name come from?"

**Mira** [`mira`]. This is her episode (canon). She is going home without knowing it. Her counting, a quirk in
Episode 1, becomes a memory tool: she counts Anwen's forty-one candles before she knows why, counts the cairn's
pebbles, counts the fifteen years. Her three canon memories are now the main path, one per floor. Her fear in
Episode 1 was being the thing nobody keeps; in Episode 2 she learns she is the one who left someone. Payoff: she
says the name of her hometown at the fountain, and she gets Elian's bow, the Kept Promise. Voice stays dry and
precise, with the joke arriving a beat later than in Episode 1.

**Bram** [`bram`]. The steady one, and the comic relief that keeps the silver gloom human ("That one has Holt's
ears"). His canon arc line lands here: "Guardians are taught to stand still. I was good at it." He recognizes the
King as a guard at a post nobody relieved. His Episode 1 line ("Then that's where we go next") is handed back to
him at the end, when the mountain burning is his. Garrick's toll ("Say it when you cross") is his running warmth.

### The Nameless Hollow (Hollowmere)

**Mayor Elian** [`npc_elian`, portrait `elian`] (canon name; age and parentage are inference). About twenty.
Slight, sandy hair, a mayor's coat several sizes too big, a ledger always under his arm. Earnest, formal, tired,
kind; says "we" when he means the town. The town made him mayor because he was the only one who kept a ledger. He
writes every resident's name every morning. He was found on the chapel step at four years old, wrapped in the
coat, and Anwen raised him. Hidden: he is Aurel's son, the boy Mira promised to come back for. He has always felt
he was waiting for someone. Payoff: he says his father's name, and the name comes back. Voice: "We remember each
other. We simply cannot remember where we are."

**Sister Anwen** [`npc_anwen`, portrait `anwen`] (canon). Sixties, grey habit stitched with silver thread, keeper
of the chapel register and of forty-one candles. Raised the town's foundlings, Elian among them. Calm, liturgical,
warm, with a dry edge. Canon line for her: "A name is a promise, not a title." Payoff: the white line comes back
as AUREL, and her grandmother's saying comes true in front of her.

**Tovin the Ferryman** [`npc_tovin`, portrait `tovin`] (canon). Old, weathered, rows the only boat on the mere.
Refuses the Court. Carries two guilts: he looked away for one breath the day the king's son fell in the mere (the
Mercy vow), and he rowed a seven-year-old girl to the Court. Gruff, short sentences, softer than he sounds. Canon
line: "I ferried a child to the Court years ago. She called herself Mira. She would not look in the water."

**Lena the Watchmaker** [`npc_lena`, portrait `lena` if budget allows] (canon). Fifties, spectacles, an apron of
tiny tools. Her clocks strike midnight; the clocktower has no hands. Precise and wry, Mira's mirror in temperament.
Canon line: "Our clocks strike at midnight, but the tower has no hands." Fountain witness. Payoff: "Ten past four!"

**Vessa the Glassblower** [`npc_vessa`] (canon). Runs the Silverglass Smithy, glass and steel. Blunt artisan,
burn scars, goggles up. Canon line: "Sometimes the glass reflects a place before I enter it." Her shop's top tier
unlocks when the Court's glass "starts remembering" (`court_f2_done`): "Glass that remembers. Finally I can work
it again." Small Episode 3 seed: "Emberpeak sand made the best silverglass. Made."

**Nico** [`npc_nico`] (canon). Errand boy, eight or so, chalk on his hands. Draws a crown on every blank sign.
Canon line: "I drew a crown on every blank sign. The grownups hated it." Nico's Crowns.

**Sava the Weaver** [`npc_sava`] (canon). Embroiders coats with an empty space where the name should go. Gentle.
Canon line: "We leave the name-space empty in every embroidered coat." First to see the party's faces in the water.

**Corin the Watchman** [`npc_corin`] (canon). The gate watch. "I have stood this watch for a year I cannot name."
Says "Welcome home" because the town has no other greeting. Payoff: the first to shout Hollowmere.

**Orla** [`npc_orla`] (canon, role adjusted). Old, Keeper-born, tends a small shrine at the ferry landing. Hints at
the portraits (canon: "There are three portraits in the Court, but the middle frame is empty") and the fountain
("The fountain listens when all three witnesses have spoken").

**Wren** [`npc_wren`] (new). Innkeeper of the Signless Inn. Cheerful; after the restoration decides to keep the
name: "Signless Inn. It's grown on me." Keeps the lost-property shelf (the Last Route).

**Fitch** [`npc_fitch`] (new). The Hollow Provisioner. Talks to his stock to remember what it is ("You are
salve. You are rope."). Pell's eastern cousin in spirit, not in blood.

### The Court of Mirrors

**The Nameless King / Aurel** [boss `nameless_king`, field avatar `nameless_king_avatar`, portraits
`nameless_king` (veiled) and `aurel` (unmasked); after the fight `npc_aurel`] (canon). Lord of the Court; the
town called him their king. Fifteen years ago the list came with his son's name at the top. He gave the great
mirror his own name instead; the Court took the price, and the town's name with it, and kept every reflection in
the Hollow to keep its people out of the list's reach. Nameless, he forgot why, and kept keeping. Not evil: a
father turned jailer by grief and an old bargain. Speaks in capitals while veiled. Unmasked he is a tired,
grey-bearded man who looks like Elian grown old. Voice unmasked: "I traded my name for theirs."

**The Other Selves** (mini-boss, new). The party's reflections, stepped out of the great mirror of F2. Each is
everything its owner is not: weak to the weapons its owner does not carry. Mira's speaks her fear, Bram's his
training, the hero's nothing at all.

**The False Reflections, Sorrow and Pride** (canon). The King's adds in phase 2, the two feelings that hold the
bargain shut. Sorrow mends and weeps; Pride stands in the way.

**The Court's Keeper** (offstage, new). The Keeper who built the Court is gone from it so completely that their
portrait frame is empty. A thread for later episodes; nobody in Episode 2 explains it.

### The rival

**Vex Quill** [`npc_vex`, portrait `silver_rogue`] (canon recurring rival, first NEXT appearance). Silver hair,
crimson scarf, dark leather coat, a knowing smile. A collector of "things nobody is using": pages, lists, names.
Ambiguous: he takes the Hollow's list from the King, and he warns the party about their reflections. Leaves black
feathers. Root canon has him keeping the hero's "beginning" from the Eraser at the very end; Episode 2 plants it
("You're missing a page. The first one."). He never fights the party in Episode 2.

### Returning Willowmere cast (Act I and the revisit)

Hazel, Mael, Iris, Tess, Garrick and Hal (at the ford), Anvil the dog. Each gets one Episode 2 morning line and one
post-`ep2_complete` line. Mael's arc closes a notch: he writes HOLLOWMERE in the Register.

---

## 4. Tone guide (what changes from EPISODE1 section 4)

Everything in Episode 1's tone guide stands: warm first, then the chill; show forgetting, never explain it; names
spoken with weight; short boxes; character humor; no em dashes, ASCII only, `{hero}`.

- **Silver and still.** Episode 1 was green and gold and rain. Episode 2 is silver, violet and quiet water. Let
  silence work more than in Episode 1: the mere, the crossing, the throne room before the King turns.
- **Faces, not words.** The Hollow lost faces, not speech. Show it with water and glass: who has a reflection, who
  does not, whose is faint. Nobody explains "the mirrors stole our reflections"; Sava gasps at faces in a fountain.
- **Keeping.** Every character keeps something. Use the verb on purpose: kept, keeper, keep safe, Kept Promise.
  The King's capitals are about keeping, as the Archivore's were about eating.
- **Humor carriers.** Bram, Nico, Lena, Wren, Fitch. Never at the King's expense, never during a memory.
- **Mira's restraint cracks once.** Her one unguarded line is "I was seven, and I ran." Keep the rest dry.
- **Names with weight in this episode.** Garrick (the toll), Mira (Tovin, Anwen), Hollowmere (Mira, Corin, Anwen),
  and above all Aurel, said by his son.

---

## 5. The lore added in Episode 2

**The Court of Mirrors.** A Keeper archive of faces. The Keepers kept names in the Book and faces in the glass,
because a reflection is a name's shadow: while someone keeps your reflection, your name has somewhere to rest.
The Court held the second fragment of the Book of Names in the frame of its great mirror. Its Keeper is forgotten
(the empty portrait).

**The bargain.** Fifteen years ago a list came to the Hollow: cheap paper, a cold hand, a seal of an open book with
nothing written in it. At the top, a child's name; under it, the town's. The lord of the Court, Aurel, gave the
great mirror his own name in place of his son's. The Court took the price and closed. To keep the town out of the
list's reach it kept every reflection in the Hollow, and the town's own name went into the glass with them. The
people kept each other's names but lost their faces in water and glass, and the name of their home. Aurel carried
his son to the chapel step in his own coat before the doors shut. Nameless, he forgot why he had done it, and kept
keeping.

**The cracks.** The Court's glass is old. Since the list-writer stirred again (Moth's list, a month before
Episode 1), the town's mirrors have been cracking, and each crack spills a memory into nothing. On the night of the
Episode 1 ending, the last written trace of Aurel's name (Anwen's register) went white. That is who the thirteenth
bell tolled for.

**Reflections in Aethelgard.** People without reflections are not harmed, but they are harder to remember, which
is why Elian keeps a ledger. A faint name casts a faint reflection: the hero's.

**The thirteenth bell, again.** It rings for every name the world forgets, anywhere; the Hollow heard it on still
nights across the mere, because the Mother Willow's roots run under the water. Pip's grandmother's saying is also
Anwen's grandmother's: the Keepers founded both towns. In Episode 2 the saying comes true: the bell rang for
Aurel, and at the end the town remembers who it rang for.

**Keeper mirrors.** With a Keeper's sigil, a Keeper mirror is a door. Aurel's Mirror Sigil opens the mirrors in
the Court, in Hollowmere's square and, it turns out, behind the altar of Willowmere's chapel, which nobody had
looked at closely for a century.

**The Fading Road.** The third stage of erasure, seen at last. Travelers stacked cairns so the road would remember
its way. "A road is harder to lose while someone walks it."

**The second fragment.** The Hollow's names, the town's name at the top, and, faint, the hero's name, a second
time. A name is written once in the Book. This one was written twice, in the same hand.

### What the player knows by the credits
The Hollow was the place scratched out on Moth's list: erased fifteen years ago by an earlier list in the same
hand. The lists come from the First Library and carry the seal of an open, empty book. The hero's name is in two
fragments of the Book, faint in both. Vex Quill is ahead of the party, holds the Hollow's list, and says the hero
is missing "the first page." Emberpeak is burning and someone there was just forgotten.

### Held back for later episodes (consistent with the root game)
Who writes the lists (root canon: the Eraser, once the First Keeper). Why the hero's name was written twice, and
what Vex's "first page" is (root canon: he keeps the hero's beginning from the Eraser). Tess's father, now known to
have gone north from the Hollow by the White Road (the Hollow North). Bram's mother, Mara of the First Bell
(Emberpeak, Episode 3). The Court's forgotten Keeper. What Vex wants.

---

## 6. What Episode 2 sets up for Episode 3

- **The destination.** The red glow on the mountains, the thirteenth toll, and Bram: "That's my mountain."
- **Bram's stake.** His mother's name went with the Emberpeak fire (Episode 1 canon). Episode 3 is his episode, as
  Episode 2 was Mira's. Vessa's "Emberpeak sand made the best silverglass. Made." is the first sign the forge town
  is in trouble.
- **The hero's stake.** Two fragments, two copies of one faint name. Vex has a page.
- **The rival.** Vex Quill has the Hollow's list and a head start.
- **Small threads.** Tess's father and the White Road; the empty portrait; the seal of the empty book.

---

## 7. Episode 2 by the numbers (for the writers)

About 33 scenes (Episode 1 had 35), 11 new named townsfolk plus Vex and Aurel, 4 side stories plus the portraits,
3 new books (`nh_ledger`, `court_ledger`, `nh_register_page`), 11 banners (the town's has two states), about 30 inspect lines (blank signs, the fountain,
the milestone, cairns, the toll board, Garrick's rail, mirrors, portraits, the throne, the feather). Party chat
(Talk) needs a hint for each main step on each map, written like Episode 1's (the plan lists the steps).

---

## 8. Canon reconciliation (root game to NEXT)

**Kept from the root game.** Nameless Hollow restored as Hollowmere; Mayor Elian; Lena the Watchmaker, Tovin the
Ferryman and Sister Anwen as the three witnesses, and their lines; the Fountain of Faces and its three-witness
reward; the Court of Mirrors with its three floors (the Silverglass Antechamber, the Hall of Other Selves, the
Unnamed Throne); the three lenses and the beam that crosses three chambers; the three portraits (a Child at the
River, a Keeper in the Court, a King Without a Crown) and Orla's empty middle frame; the three vows (Belonging,
Mercy, Courage); Mira's three memory echoes, with their text; the Nameless King's veiled, shattered-court and
unmasked phases, the False Reflections Sorrow (mender) and Pride (warder), the Mirror Ward that makes the adds come
first, the fire weakness in the last phase and a spear thrust that interrupts his charge; "I traded my name for
theirs"; "You were never forgotten. I remember your son, and I remember you."; the name Aurel; the Mirror Sigil;
the warning that the lists come from the First Library; Emberpeak next and "Far away, the mountains begin to
smolder."; Vessa, Nico's crowns, Sava's empty name-spaces, Corin's nameless year; Vex Quill and his Chapter I and
Chapter II lines; the Signless Inn, the Hollow Provisioner and the Silverglass Smithy; the "region-2" Suno prompt
(glasslike bells, muted piano, reflected melody) as the town theme's brief.

**Changed, with reasons.**
- The old Mirror-Word letter game on F2 is gone (DESIGN hard rule 2). Its gate is now the light-bridge puzzle.
- The lens inscription that printed the answer ("the WEST looks EAST...") is gone: the visible beam is the
  readout (DESIGN 5.3, "readable on screen without text").
- The portrait order (Child, Keeper, King) is no longer a gate or an order puzzle; the portraits are optional story
  in any order (no text-instruction puzzles).
- The vows are beam receptors in three wings, not touch-in-order objects; the Mirror Key and the keyhole become the
  three-crystal vow door (one lock, three wings, Lufia II style).
- Mira's memories move from an optional bonus to the main path (one per floor); the optional battle bonus moves to
  the Fountain of Faces. The canon "+20 Focus" opener becomes +25 Fury, because Focus is a different status in NEXT.
- **Inference:** Mayor Elian is the King's son and the boy of Mira's promise. Basis: canon memory 3 ("The child was
  the king's son") and `game.js` ("Mayor Elian's childhood name shines behind the last door"). Elian is therefore
  young (about twenty); canon gives him no age. Anwen raising him, the oversized coat and the bow are new.
- **Inference:** Tovin rowed child Mira to the Court (canon says "to the Court") and back out again at dawn; she then
  went west with river traders to Willowmere, where Iris took her in (fits Episode 1: she came from the east as a
  small child).
- Vex Quill's Willowmere scene never happened in NEXT Episode 1, so his first appearance merges his Chapter I line
  ("If a name can be stolen...") with his Chapter II scene (inside a mirror that reflects everyone except himself).
  "The first page" is new, pointing at canon's ending ("I kept one thing from the Eraser: your beginning").
- The old `game.js` Willowmere witness event that names ELIAN as a keeper of lanterns is dropped; it contradicts
  NEXT Episode 1.
- The thirteenth bell's Episode 1 toll is given an owner (Aurel); canon never said who it rang for.
- **New:** the Fading Road and its cairns, Garrick's Crossing, the Waystation, the Other Selves mini-boss, the Kept
  status, the second fragment holding the hero's name, the hero's faint reflection, Tess's satchel and the White
  Road, A Letter Answered, Wren and Fitch, the Willowmere chapel mirror.

**Name collision to respect.** Episode 1's optional dungeon is **Whisperwood Hollow** and owns the flags
`hollow_found` and `hollow_cleared` and the encounter ids `hollow_*`. Episode 2 never uses a bare `hollow_` prefix
for new ids or flags: the town is `nameless_hollow` (`nh_*`), the dungeon `court_*`. Player-facing text says
"the Nameless Hollow" or "the Hollow" in Episode 2 context and "Whisperwood Hollow" in full for the old dungeon.
