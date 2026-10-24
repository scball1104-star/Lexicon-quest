# Episode 3: The Forge of Ash

Story bible for Lexicon Quest NEXT, Episode 3: the Old Sand Road, Emberpeak, the Ashen Foundry and the Cinder Warden.
Written by ep3-designer (W16), 2026-10-24, after Scott approved building the episode. The production side (ids, maps,
the new field mechanic, combat, loot, music, assets, save rules and the agent briefs) is in `docs/EPISODE3_PLAN.md`.
When built, the script lives in `src/data/story/ep3.js`, NPCs in `src/data/npcs.js`, quests and party chat in
`src/data/quests.js`, lore, books and banners in `src/data/text.js`, and the staging guide in
`docs/story/STAGING_EP3.md` (written by the story agent, same shape as `STAGING_EP2.md`).

**Sources.** `EPISODE1.md` sections 3 to 5 (Bram, Garrick, the lore of names), `EPISODE2.md` sections 1 (acts V and
VI), 5, 6 and 8, the root game's Chapter III: `CHAPTER_III_MILESTONE.md`, `rpg-chapter3.js` (Bellows Square, the
Ashen Foundry floors, Veyra, Ilya, Rook, Sella, the Smelter Proclamation, the memorial), `rpg-engine.js` (Bram's three
memories, the Cinder Warden's phases and coils), `rpg-townsfolk.js` (Taro, Bess, Harl, Rusk), `rpg-data.js` (the
region record and its ending line), `game.js` (Vex Quill's ASH SIGNATURE scene, the Emberpeak Crucible room names, the
tempering trial), `ART_PROMPTS.json` (environments cell 2 Emberpeak, bosses cell 2 Cinder Warden, enemies cell 6,
portraits cell 6) and `SUNO_TRACKS.json` (region-3 brief). Tags: **(canon)** comes from those files, **(new)** is
invented here, **(inference)** is a synthesis of canon fragments; every inference is listed in section 8.

**Logline.** The thirteenth bell tolled for Bram's father. Garrick walks all night to Hollowmere and nobody, not even
his son, can say his name. He knows what is taking it: the Cinder Warden, the bronze guardian of the Heartforge, which
hammered his wife's name flat twenty-five years ago and has started striking again. Bram goes home to a mountain town
buried in ash to get two names back: the one he lost as a young man, and the one he swore in Episode 1 he would never
lose.

**Theme question.** Episode 1 asked "who is eating our names?" Episode 2 asked "what would you give to keep someone?"
Episode 3 asks **"what survives a fire?"** Every major character answers it. The Warden says nothing should: "ASH IS
CLEAN." Garrick says whatever you carried out. Ilya says the tone of a bell. Veyra says the people who got out. Mira
learns that what was hidden survives (the ash hid Mara's maker's stamp). Bram's answer is the episode's: "I counted
the people." And the craft answer, Garrick's: "You can file off the letters. You can't file off the press." What was
pressed deep enough survives, which is how a struck name comes back.

**Target length.** 60 to 90 minutes first play, planned at about 75 because Episode 2 ran about 1.5 times its plan:
Hollowmere morning 6, the Old Sand Road 9, Emberpeak 11, Foundry F1 12, F2 13 (with the Bellows Specter), F3 12, the
Cinder Warden 8, the First Bell and the ending 6. Optional content adds 12 to 15 (three side stories, the Lantern
ledger, the forge restock, revisits through the Keeper mirror). Budgets that hold this: 20 ordinary fights (Episode 2
had 31), at most 12 boxes per main scene (three set pieces excepted), about 230 boxes on the main path.

**Levels.** Episode 2 ends at Lv 13 (the King fought at 13; autoplay saves arrive at 13). Road 13 to 14, Foundry F1
14 to 15, F2 15 to 16, F3 at 16, the Cinder Warden fought at 16, Lv 17 after it.

**Whose episode.** Bram's, as Episode 2 was Mira's (canon). Mira is the steady reader this time; the hero is the
witness whose own name turns up a third time.

---

## 1. Beat sheet

Scene ids for `ep3.js` are in brackets. Flags are from the plan (section 2.2). Every scene follows the house wrapper
rules (guarded by `SCENE_CONDITIONS`, input locked for its run). Key lines are samples in final voice, already inside
the box rule (3 lines of 42 characters); the story agent writes the rest and keeps every main scene at 12 boxes or
fewer except `ep3_morning` (14), `warden_after` (24) and `first_bell` (14).

**Speaker tags while a name is gone.** Until `garrick_named`, Garrick's tag is "The Smith" (Episode 2 did this for
Aurel); the actor is swapped under the name flash. Mara speaks only in memory, tagged "A Voice" until `mara_read`,
then "Mara".

### Act I: Hollowmere, one name short

1. **Thirteen, for him** [`ep3_morning`, `nh_inn`, on enter with `ep2_complete`, `credits2_rolled` and the
   episode switch on; sets `ep3_morning_done`, `ep3_started`]. Wren wakes the party: an old man walked in at dawn,
   covered in road dust, asking for Bram. It is Garrick, at the hearth. Bram reaches for the name and it is not
   there. (new)
   - Wren: "Old fellow walked in at sunrise. Asked for Bram by name. Couldn't give me his."
   - Bram: "...Dad." (a beat) "Dad, I can't. It's right there." The Smith: "I know. Mine's gone off too."
   - The Smith: "Heard it at the ford last night. Thirteen. I knew it was for me."
   - Choice: `Say his name.` / `Who did this?` Either way the hero's box is "..." and Mira's answer follows.
   - Mira: "I can see his face. I can't find the word for him."
   - The Smith: "It went like this with her. First the sign on the forge. Then the word in your mouth."
   - The Smith: "It's the Warden. It's striking again. I'm going home." Bram: "Not alone." The Smith: "Never said
     alone."

2. **The old sand road** [`sand_gate`, `nameless_hollow`, step trigger at the chained east gate; sets
   `sand_gate_open`, gives `quench_flask` x3]. Vessa unchains the road the sand carts used before the fire; Penny's
   cart is waiting and the Smith rides with her. Vessa gives three Quench Flasks: a glassblower's trick. (new; Vessa's
   Episode 2 seed paid off)
   - Vessa: "Emberpeak sand made the best silverglass. Made. The carts stopped twenty-five years ago."
   - Vessa: "Cold water, hot glass. Throw these at anything that glows."
   - Penny: "I go where the roads still go. This one's coming back." The Smith climbs onto the cart.

3. **Optional farewells** (NPC talk entries, one or two boxes each, no scenes). Aurel: "A father walks all night for
   his son. I know that road." Anwen: "Say his name anyway. Even without it. The shape helps." Elian: "I wrote him in
   my ledger as Bram's father. It's a start."

### Act II: The Old Sand Road

4. **Ash on the wind** [`sand_road_arrival`, `sand_road`, on enter; sets `sand_road_arrived`]. Banner: The Old Sand
   Road / Into the Ash Hills. Grey grass, then ash. The glow ahead.
   - Bram: "I walked this road down once. I was twenty, carrying a sack and a father."
   - Mira: "And now you're carrying him back up." Bram: "He's riding. I'm carrying."

5. **The first fight** [`sand_first_fight`, step trigger column a few tiles in; scripted battle `sr_first`, no flee;
   sets `sand_first_fight_done`]. A Cinder Hound and a Cinder Beetle. The beetle always opens with Stoke, so it glows
   and its Heat pips show; at full Heat it will flare. The episode's one teaching fight: cool it (ice, a Quench
   Flask) or Break it. No tutorial box. (new; Heat is plan 6.3)
   - Before: Mira: "That beetle's heating up. Cool it before it boils over."
   - After: Mira: "Ice, and it went out like a coal in snow." Bram: "Breaking it worked too. Louder."

6. **Slag on the road** [`slag_crossing`, step trigger where a tongue of slag has crossed the road; sets
   `saw_slag`]. Beside the slag, a snowmelt stream runs in an old stone trough with a sluice paddle. The field
   mechanic's first lesson (plan 5.1): turn the paddle, the water runs onto the slag, it hisses and crusts into
   rock you can walk on. One line points at the object; the screen does the rest.
   - Bram: "Sand carters' trick. Turn the paddle. Water takes the heat."
   - Bark after the first crust (`first_quench`): Mira: "It stays cooled. Good. I'd hate to do that twice."

7. **The carters' shelter** [`carters_rest`, campfire object; `safe`, `rest`; sets `carters_rested`]. A roofless
   stone shelter, Penny's cart, the Smith on a crate. The fireside beat. One choice, then the rest flow:
   - `What was she like?` The Smith: "She could hear a crack in a bell before it rang. Heard one in me once." He can
     say everything about her except her name.
   - `Bram, are you all right?` Bram: "No. Ask me after."
   - `Just rest.` "The Smith stays up and watches the glow. Nobody asks him to stop."

8. **The mountain** [`ash_view`, step trigger on the last rise; sets `saw_emberpeak`]. Emberpeak below the
   foundry: iron roofs under ash, a furnace mouth glowing in the mountain, a bell tower. `mystery`.
   - The Smith: "The bell's quiet. It was never quiet. Every shift, it rang."
   - Bram: "Then something's wrong up there." The Smith: "Something's been wrong for twenty-five years."

### Act III: Emberpeak

9. **Nobody comes up the sand road** [`pk_arrival`, `emberpeak`, on first enter; sets `pk_arrived`]. Banner:
   Emberpeak / Bellows Square. Rusk the Watch at the gate. Ash falls like slow snow. (canon town; scene new)
   - Rusk: "Nobody comes up the sand road. Nobody's come up it since I was a boy."
   - Rusk sees the Smith, does not know him, and straightens anyway: "...Smith." The Smith: "Watch."

10. **Bellows Square** [`veyra_square`, step trigger at the coolant station; sets `met_veyra`]. Foreman Veyra
    (canon) lays out the crisis in short boxes:
    - The foundry's furnaces woke a month ago with nobody feeding them. The Warden runs the lifts. The mine gates
      are shut from inside (canon townsfolk line).
    - "Names come off the memorial wall about one a week. We sand the plates and pretend it's soot."
    - The foundry gate answers to one key, and the founder's apprentice keeps it. She sends them to Ilya.
    - Veyra, to Bram: "You've got a guard's back and a smith's hands. Which are you?" Bram: "Today? Both."

11. **Names etched in iron** [`memorial_wall`, object on the square's memorial; sets `saw_memorial`]. The iron
    plates of the memorial. One name has been hammered flat (canon). Below it, a newer name whose letters are going
    soft, like wax near a fire. The Smith puts his hand on the flat place.
    - The Smith: "That's hers." Bram: "What was it?" The Smith: "I'd tell you if I had it."
    - Mira, at the soft letters: "And this one's going now. Softly." (it is the Smith's own; nobody can read it)

12. **The Bell House** [`ilya_bellhouse`, `pk_bellhouse`, step trigger inside; sets `met_ilya`, `foundry_open`,
    gives `lift_key`]. Ilya the Bell Founder (canon), the founder's apprentice, copper beard and goggles, keeps her
    workshop as she left it. The First Bell's clapper is missing: she took it into the foundry the night of the fire.
    - Ilya: "She took the clapper in with her. Said a bell that can't ring can't be made to lie."
    - Ilya: "I can't say her name. I can say what she said. Shape shelter before weapons." Bram: "...I know that."
    - Ilya, to the Smith: "You've got her husband's hands. He'd be about your age." The Smith: "About."
    - Ilya gives Mara's Lift Key: "Her key to the ore lift. I've kept it oiled twenty-five years. Don't ask me why."
    - Ilya (seed, held back): "She tuned every bell on this mountain. And one down in your valley, once."

13. **The family forge** [`garrick_forge`, `pk_smithy`, the Smith's talk entry; sets `forge_relit`; optional but
    Talk suggests it]. The Emberpeak Weaponsmith was his forge; Sella the apprentice runs it now. He asks to borrow
    it. Sella watches his hands and does not argue. (new; opens the forge restock in plan 7.6)
    - The Smith: "I'll keep the fire here. The right kind." Sella: "...Your grip's the old grip. Nobody taught me that
      grip." The Smith: "Somebody taught somebody."

### Act IV: The Ashen Foundry

14. **The foundry gate** [`foundry_gate`, `emberpeak`, the gate object with `lift_key`; sets `foundry_entered`].
    The ore lift drops the party into the mountain. Two boxes.

15. **The Cinder Liftworks** [`foundry_f1_arrival`, `foundry_f1`, on enter; sets `foundry_f1_arrived`]. Banner:
    The Ashen Foundry / I. The Cinder Liftworks (canon). Slag rivers, stone troughs, cold spouts from the mountain
    cistern, a great waterwheel that should be turning.
    - Mira: "Water from the snows, fire from the mountain. Someone built this to balance."
    - Bram: "My mother. She drew the cooling lines." (he says "my mother"; the name is the hole in the sentence)

16. **The Collapsed Mine** [`bram_memory_1`, `foundry_f1`, step trigger at the old shaft mouth; sets
    `bram_memory_1`]. (canon text, staged as a tinted vignette like Episode 2's vows.) Young Bram, about twenty,
    pulls miners out of a falling shaft while a foreman shouts to keep the furnaces lit. The First Bell is ringing.
    - Foreman (memory): "Count the ore, boy! The fire doesn't wait!"
    - Bram (memory): "I was ordered to count the ore. I counted the people." (canon)
    - Bram, now: "The bell was ringing. She was ringing it. That's why we got out."

17. **The lift** [`liftworks_lift`, runs when the waterwheel first turns; the lift trigger sets `foundry_f1_done`].
    Water reaches the wheel, the wheel turns, the ore lift groans awake. A short pan along the flow; `lift_rumble`.
    The Crucible Hook (canon boss key) is in this floor's north balcony chest.

18. **The Ventilation Galleries** [`foundry_f2_arrival`, `foundry_f2`, on enter; sets `foundry_f2_arrived`].
    Banner II. The Ventilation Galleries (canon). Great fans, soot, bellows the size of houses. Two boxes.

19. **The Bell-Forging Oath** [`bram_memory_2`, `foundry_f2`, step trigger under an unstruck bell hanging in a
    gallery; sets `bram_memory_2`]. (canon) A voice from a bell nobody struck.
    - A Voice: "A true smith shapes shelter before weapons." (canon)
    - Bram: "My mother said that. I thought the fire took her name." (canon)
    - Mira: "It took the word. It left the voice." Bram: "...Then I'll take the voice. For now."

20. **The Bellows Specter** [`bellows_specter`, `foundry_f2` fan hall, arena trigger; boss intro card in the W5
    style; battle `bellows_specter`; sets `bellows_specter_defeated`; the shaft trigger sets `foundry_f2_done`].
    The foundry's breath given a body: a great smoke bird in the updraft of the fans. Name card: THE BELLOWS SPECTER /
    Breath of the Foundry. (canon enemy name, new role)
    - Mira, the one tip: "It's stoking itself. Cool it before it's white, or it'll breathe the fire at us."
    - After: the fans stop; the soot settles; the shaft down is clear. Bram: "Quiet. That's worse."

21. **What the ash kept** [`ledger_ash`, optional Lantern secret on F2; side story 2]. Three burned ledger pages on
    the floor of the records cage. Raised Lantern: the ink shows in the ash, the last shift's names, and one stamp
    where a name should be (no letters to guess; it is a small bell). Opens the canon apprentice's cache.
    - Mira: "Ink remembers, even when paper burns. That's new. I'm writing that down."

22. **The Heartforge Crucible** [`foundry_f3_arrival`, `foundry_f3`, on enter; sets `foundry_f3_arrived`]. Banner
    III. The Heartforge Crucible (canon). A hub before the Bell Gate, three wings, three great anvils. The Smelter
    Proclamation is cast over the gate (canon text, inspect: "A bell rings for each craft: the one who shapes, the
    one who remembers, and the one who returns. The hearth cannot run without all three.").
    - Mira: "Hand, Heart, Home. Three anvils. The Keepers did love a set of three." Bram: "So did she."

23. **Ash signature** [`vex_furnace`, `foundry_f3`, step trigger at the hottest furnace mouth; sets
    `vex_furnace_met`, gives `struck_list`]. Behind the fire, on a ledge inside the furnace, a silver-haired man stands
    unburned. A black feather lies at his feet and does not burn (canon). Vex has pulled the old list out of the
    Warden's furnace: cheap paper the fire would not take. He tears off its corner and drops it through the grate.
    - Vex: "The Archivore burns records. I burn excuses. We are not the same." (canon)
    - Vex: "Your father was at the top of this, Bram. I've torn him off. It won't stop the hammer. It'll slow it."
    - Mira: "Why help us?" Vex: "I collect things nobody is using. Nobody should use this."
    - Vex: "Your name's on the leaf in there, {hero}. Stamped by a hand I'd very much like to meet."
    - Vex: "Your first page isn't in this fire either. I looked." He is gone; the feather stays.

24. **The three oaths** [`oath_hand`, `oath_heart`, `oath_home`; each runs when the party strikes its wing's anvil,
    which they reach through the wing's quench puzzle; each sets its flag]. Silent but for the strike (`anvil_strike`),
    a deep bell tone answering from the gate, and one line from A Voice. (canon names Hand, Heart, Home; lines new)
    - **The Hand** (west): A Voice: "Hold it like you mean to let go."
    - **The Heart** (east): A Voice: "Ring it for them. Not for you."
    - **The Home** (south): A Voice: "Then come home." (Garrick's Episode 1 line, "Respect the rhythm, and come
      home", was hers first.)

25. **The Name Under Ash** [`bram_memory_3`, `foundry_f3`, runs at the Bell Gate when the third oath is struck;
    sets `bram_memory_3`, `mara_read`, `bell_gate_open`, teaches `tempered_oath`]. (canon text, then new lines) The
    Bell Gate opens. On its inner face, under twenty-five years of ash, a founder's stamp: a small bell, and around
    it letters the ash hid from the Warden's hammer. Bram wipes the ash with his sleeve.
    - Bram: "MARA OF THE FIRST BELL." (canon) (a beat) "Mara. Her name is Mara."
    - Mira: "The ash hid it. Hidden things survive. The Lantern taught us that."
    - Bram: "She made the bell that warned us. It struck her out for ringing it." (canon, trimmed)
    - Bram: "Mara. I'll keep saying it. Somebody has to hold it." Learns **Tempered Oath** (`skill_learn`).

### Act V: The Cinder Warden

26. **The Warden** [`cinder_warden`, `foundry_heart`, trigger at the entry; boss intro; battle `cinder_warden`].
    The Heartforge: a round crucible hall, a furnace the size of a house, and before it a bronze guardian with a
    glowing heart and a molten hammer (bosses cell 2, canon). It speaks in capitals like the Archivore and the King.
    Name card: THE CINDER WARDEN / Keeper of the Heartforge. `boss_warden`.
    - Warden: "THE FIRE MUST NOT GO OUT." Warden: "ASH IS CLEAN. ASH FORGETS."
    - Warden, to Bram: "THE ORE COUNTER. YOU AND THE FOUNDER STOPPED MY FIRE."
    - Choice: `Put it out.` / `We came for two names.`
    - Bram: "Mara. And my father's. I don't have his yet. I'll take it off you."
    - Mira, the one tip: "When it glows white, cool it. When the hammer goes up, put Bram in front."
    - Phase 3 battle message: "The shell cracks. The hammer's head is a bell's clapper."

27. **What survives** [`warden_after`, `foundry_heart`, after the win; sets `clapper_get`, `garrick_named`,
    `mara_named`, `leaf_get`; the encounter sets `cinder_warden_defeated`]. The order matters; the story agent keeps
    it:
    1. The Warden kneels; its fire sinks to embers. Warden: "THE ORDER SAID KEEP THE FIRE. IT NEVER SAID WHAT FOR."
       It opens its chest. Inside, cooling: a leaf of steel stamped with names in rows. The third fragment of the
       Book of Names. Its hammer falls; the head is the First Bell's clapper (`clapper_get`).
    2. Running footsteps: the Smith, with Ilya and Sella, down the lift. The Smith: "Couldn't keep the fire with the
       whole mountain shaking."
    3. The leaf: one place hammered flat (Mara's), one newer place half flat (his). The Smith: "You can file off the
       letters. You can't file off the press." Ilya: "Only a Heartforge hand can raise a struck name. That's why
       they want him gone."
    4. The reforging: the Smith sets the leaf in the Heartforge's last heat. He holds the tongs; Bram takes the
       hammer. Three strokes: Hand, Heart, Home (`anvil_strike` x3, screen flash on the third).
    5. The flattened letters rise out of the steel (`name_restore`): MARA OF THE FIRST BELL. Then, below:
       Bram: "Toll's one word." The Smith: "..." Bram: "Garrick." Garrick: "Paid." (Episode 2's crossing, paid in
       full). Heart emotes. `triumph`.
    6. Mira, reading further down: the hero's name, stamped a third time, under a small mark: an open book with one
       line written in it. `mystery`.
       - Mira: "{hero}. You're here too. Third leaf, third time."
       - Mira: "Their seal is a book with nothing in it. This one has a line." Bram: "Somebody's writing you in."
       - Mira: "Faster than somebody else is crossing you out." Gives `name_fragment_3`.
    7. Mira, on the corner of the list: "Same seal as Aurel's list. The First Library again." Bram: "Then that's a
       road too."
    8. Garrick gives Bram the First Bell Hammer, Mara's founding hammer, kept in the Heartforge's tool rack all
       these years (legendary beam, equip prompt). Garrick: "Hers. I couldn't come in for it. You did."

### Act VI: The First Bell

28. **The First Bell** [`first_bell`, `emberpeak`, on enter by the lift after `warden_after`; sets
    `first_bell_rung`, `pk_restored`]. Ilya hangs the clapper. Bram rings the First Bell (Bram central to the end).
    The town comes out. The memorial plates fill: MARA OF THE FIRST BELL, and GARRICK, firm. The ash stops falling;
    the tint lifts. `first_bell` theme, `bell_first`.
    - Veyra: "The furnaces are banked. For the first time in a month, nothing is feeding them."
    - Rusk: "Garrick! Watch of Emberpeak says: Garrick." Garrick: "Heard you the first time."
    - Ilya: "She'd say the tone's flat by a hair." Garrick: "She'd say it, and then she'd fix it."
    - Bess: "Three stews tonight. Hot, hotter, and Mara's." (canon voice for Bess)
    - Bram: "Mara. Garrick." Garrick: "You going to keep doing that?" Bram: "Forty times at breakfast."

29. **The ending hook** [`ep3_ending`, `emberpeak` at night, straight after; sets `ep3_complete`]. The forge glows
    the right way now. Garrick and Bram at the anvil; the hero and Mira on the bell tower steps. A rider comes up the
    east road soaked to the knees: a royal courier from Valewyn with a decree whose seal is running like wet ink
    (canon ending: "A royal messenger arrives with news from the eastern kingdom.").
    - Courier: "For whoever rang that bell. From the Regent of Valewyn. I think. The seal won't stay dry."
    - Mira: "Ink that won't stay put." Bram: "East, then." Garrick: "Come home after." Bram: "Always."
    - The First Bell hums by itself, once, as if answering something far off. Mira: "That's a bell. Under water."
    - End cards: `End of Episode 3` / sub `The Forge of Ash`; then `Episode 4: The Sunken Keep` / sub (placeholder,
      Scott's wording) `Downriver, a kingdom forgets who rules it.`

30. **Credits** (`CREDITS_EP3` in `text.js`, `first_bell` music), then the next morning at the Coal Lantern Inn
    (`pk_inn`, mark `inn_bed`). Every Emberpeak resident has new lines; the Keeper mirror in the Bell House is open
    (with the Mirror Sigil) to Hollowmere and Willowmere; Willowmere and Hollowmere residents have Episode 3 lines;
    the end card says Episode 4 is not playable yet.

---

## 2. Side stories

| Quest | Giver | What happens | Reward |
|---|---|---|---|
| **The Coolant Station** (canon) | Veyra, after `met_ilya` | Hear the three witnesses: Ilya (the founder tuned the bells; the Warden burned her records), Harl the Surveyor (the cooling lines ran from the snow cistern, "hot to the east, cold to the north"), Sella (who carried the miners: "it was Bram; I was nine and he carried me"). Then check the station. | 3 Quench Flasks, the Ashwalker Mantle (set piece), and `coolant_done`: the party starts the Cinder Warden fight with +25 Fury (canon's opening bonus in NEXT terms, as Episode 2's fountain) |
| **What the Ash Kept** (canon ledger, now a Lantern secret) | Talk hint on F2 | Raise the Lantern over three burned ledger pages in the records cage (scene 21). | The apprentice's cache: 160 gold, 2 Hi-Ethers (canon gold, ethers upgraded), book `foundry_ledger` |
| **Vessa's Sand** (new) | Vessa (Hollowmere), after `sand_gate_open` | Bring a sack of Emberpeak glass sand from the foundry's sand hopper (an F1 dead-end chest) back to Vessa, by the road or the Bell House mirror. | The Emberglass Charm (rare); Vessa's shop gains Emberglass stock; Vessa: "Glass that remembers fire. Finally." |

Side quests open only once Emberpeak has been introduced (`met_ilya`), so the town does not front-load errands.
Every quest has a journal entry and a Talk reminder. Cut line: Vessa's Sand goes first if the budget tightens.

---

## 3. Character bible

Sprite and portrait ids in brackets (plan section 9).

### The party in Episode 3

**Bram** [`bram`]. This is his episode. Mid-forties, grey in his beard (the portrait is canon for his age; plan 12
asks Scott to let the field and battle sprites match). His Episode 1 fear was losing the last name he has, and that is
exactly what happens on the first screen. His arc moves from guard to smith: from "guardians stand still" (Episode 2)
to "shape shelter before weapons" (his mother's line). In the boss fight he does both, standing in front with Tempered
Oath; in the reforging he takes the hammer. Payoffs: he reads his mother's name off the Bell Gate himself, and he pays
Garrick's toll with one word. Voice stays short and warm; the jokes come when he is scared ("Breaking it worked too.
Louder.").

**Mira** [`mira`]. The steady one this time, and the reader: she reads the ash, the leaf and the list's seal. Her
counting becomes kindness (she counts Garrick's steps on the road for him). Her one big line is the lore turn:
"Hidden things survive." Dry, precise, warmer than in Episode 1.

**{hero}** [`hero`]. Silent, through choices and through others. The third fragment holds the hero's name a third
time, under a counter-seal: an open book with one line in it. Vex says someone stamped it "by a hand I'd very much
like to meet". Arc beat: from "where did my name come from?" to "someone is writing me in on purpose."

### Garrick and Mara

**Garrick** [`npc_smith`, portrait `garrick`] (Episode 1 new, Episode 2 new; roots canon). Seventy-one, iron-grey,
stooped, few words. The thirteenth toll at the end of Episode 2 was for him: the Warden struck his name in the Steel
Leaf, so Willowmere lost it overnight, Bram included. He walked the Fading Road all night to Hollowmere ("Followed the
cairns. Somebody stacked them well."). His tie: twenty-five years ago he was a Heartforge smith; on the night of the
fire Mara told him to take the boy home while she held the door, and he did, and never went back. He has carried
"Respect the rhythm, and come home" as her words. Only a Heartforge hand can raise a struck name, which is why the
lists keep coming for him (Moth's list in Episode 1 named him too). Payoff: "Paid."

**Mara of the First Bell** [memory actor `npc_mara`, no portrait] (canon name and title). Bell founder of Emberpeak,
Bram's mother. She tuned every bell on the mountain, drew the foundry's cooling lines, and cast the First Bell, the
foundry's alarm. When the Warden's furnace ran wild on the old list's order, she rang the alarm, stopping the
furnaces for an hour so the miners got out, then took the bell's clapper into the Heartforge so the bell could not
be rung to call the shifts back. She did not come out. The Warden hammered her name flat in the Steel Leaf for
stopping its fire. She is never seen dying; she is a voice in a bell, three tinted memories, and a stamp under ash.
Lines: "Shape shelter before weapons." "Hold it like you mean to let go." "Then come home."

### Emberpeak

**Foreman Veyra** [`npc_veyra`, portrait `veyra` if budget allows] (canon name and role). Fifties, soot-streaked,
sleeves rolled, a whistle on a cord. Runs what is left of the shifts. Practical, dry, protective of her people;
gives orders as questions. Canon line kept as her brief: "The First Bell has fallen silent and the mines carry only
ash."

**Ilya the Bell Founder** [`npc_ilya`, portrait `goggles_smith`] (canon). Fifties, copper beard, brass goggles,
leather apron (the unused painted portrait cell 6 fits him). Mara's apprentice; keeps her Bell House as she left it
and her lift key oiled. Gentle, exact, ear always cocked for a tone. Canon line: "The forge bells were tuned by Bram's
mother."

**Sella** [`npc_sella`] (canon). The apprentice who runs the Emberpeak Weaponsmith (Garrick's old forge). Mid-thirties;
Bram carried her out of the collapse when she was nine (canon: "Bram carried miners out"). Quick, proud, a little in
awe of the Smith's grip.

**Harl the Surveyor** [`npc_harl`] (canon townsfolk; replaces root Chapter III's Rook, see section 8). Writes pressure
readings before the soot erases them. Canon line: "The ground shifts when the furnace exhales."

**Bess the Cook** [`npc_bess`] (canon). Runs the Coal Lantern Inn. Canon lines: "Ash gets into everything, except a
pot with a good lid." "The Coal Lantern serves three stews: hot, hotter, and safe."

**Taro the Riveter** [`npc_taro`] (canon). Keeps Ventworks Supplies (the shop). Canon line: "If the pressure runs high,
the whole rail will sing."

**Rusk the Watch** [`npc_rusk`] (canon). The gate watch. Canon line kept as a hint: "Frost cools hot metal. It can
cool a guardian too." Payoff: the first to shout Garrick's name.

**The courier** [`npc_courier_v`] (canon role, new look). A soaked royal courier from Valewyn. One scene.

### The Foundry

**The Cinder Warden** [boss `cinder_warden`, field avatar `cinder_warden_avatar`, portrait `cinder_warden`] (canon
name, look and phases; nature inference). A Keeper construct of bronze with a furnace for a heart: the Heartforge's
guardian and scribe-smith, made to stamp the Book's names into a leaf of steel, because steel survives fire. Its order
was "keep the fire". Twenty-five years ago a list on cheap paper was fed into its furnace, and it began striking names
instead of stamping them, burning hotter with each one, until the mine furnaces overran and the shaft fell. Since the
list-writer stirred a month before Episode 1, it has burned hot again. Not evil: a tool given a bad order, like Moth.
Speaks in capitals. Last words: "THE ORDER SAID KEEP THE FIRE. IT NEVER SAID WHAT FOR."

**The Bellows Specter** (mini-boss, canon name). The foundry's draft given a body by the Warden's heat: a smoke bird
in the fan hall's updraft.

**The Furnace Coils, Bellows and Smelter** (canon). The Warden's phase 2 adds: one stokes it, one sprays slag.

### The rival

**Vex Quill** [`npc_vex`, portrait `silver_rogue`] (canon recurring rival). Second NEXT appearance, inside the hottest
furnace (canon ASH SIGNATURE). Ambiguous again, a notch warmer: he took the Hollow's list in Episode 2; here he hands
the party a corner of the Emberpeak list with Garrick's name torn off it. He never fights the party.

### Returning cast

Hollowmere: Wren, Vessa, Penny, Elian, Aurel, Anwen (one line each in Act I, one after `ep3_complete`). Willowmere:
Hazel, Mael, Holt, Hal, Anvil the dog (lines only; reached by the Keeper mirror). Holt carries the Willowmere side:
after `ep3_started` "I've been saying a name every hour. I can't remember whose." After `ep3_complete`: "GARRICK. Came
back at noon. Said it fifty times since."

---

## 4. Tone guide (what changes from EPISODE2 section 4)

Everything in Episodes 1 and 2 stands: warm first, then the chill; show forgetting, never explain it; names with
weight; short boxes; character humor; no em dashes, ASCII only, `{hero}`.

- **Ash and ember.** Episode 2 was silver and still. Episode 3 is grey ash over warm iron, orange slag, steam. Let
  sound work: the silent bell, the fans, the hiss of a quench, the first ring.
- **Hands, not faces.** The Hollow lost faces; Emberpeak lost the word but kept the craft. Show it with hands: the
  Smith's old grip, Ilya's oiled key, Bram's sleeve on the ash. Nobody explains "the Warden struck the names".
- **Survive.** Use the verbs on purpose: carried out, kept warm, quenched, pressed, tempered. The Warden's capitals are
  about fire and ash, as the Archivore's were about eating and the King's about keeping.
- **Humor carriers.** Bram (more than ever, because he is scared), Bess, Rusk, Penny, Garrick's one-word answers.
  Never during a memory, never at Mara's expense.
- **Bram's restraint cracks once.** "Dad, I can't. It's right there." Keep the rest short.
- **Names with weight in this episode.** Garrick (the toll, paid), Mara (Bram, first from the gate, then forty times),
  and the hero's, a third time, in steel.

---

## 5. The lore added in Episode 3

**The Steel Leaf.** The Keepers divided the Book of Names "so that no single fire could take it all" (Episode 1).
Emberpeak's share was stamped into steel, because steel survives fire. The Heartforge's Keeper construct, the Cinder
Warden, stamped each name as the Book recorded it. The leaf is the third fragment.

**Striking and pressing.** A stamped name can be struck (hammered flat) but not unpressed: the steel under the letters
remembers the stamp. "You can file off the letters. You can't file off the press." Only a Heartforge hand, reheating
the leaf and striking it in the old rhythm, can raise a struck name. Garrick and Bram are the last of that line.

**Hidden things survive.** Episode 2 taught the difference between hidden and taken ("The Lantern shows what was
hidden. This wasn't hidden. It was taken."). Episode 3 turns it: Mara's maker's stamp on the Bell Gate survived the
Warden's strike because the ash hid it. The burned ledger's ink survives in the ash for the Lantern.

**The old list.** Twenty-five years ago a list came to Emberpeak, in the same cold hand and the same seal (an open
book with nothing written in it) as the Hollow's. Someone fed it to the Warden. Mara's alarm cost it a shift of names;
the Warden struck her for it. Since the list-writer stirred again, the Warden has been working down the rest; Garrick
was next. Vex now holds the list; the party holds its corner.

**The counter-seal.** The hero's name is stamped in the leaf by hand, under a small mark: an open book with one line
written in it. Someone opposed to the list-writer, using the list-writer's own sign with one difference, has written
the hero into three fragments.

**The First Bell.** Emberpeak's alarm, cast by Mara, rung every shift and in danger. Silent twenty-five years because
its clapper became the Warden's hammer-head. Its tone carries far: at the end it hums by itself, answering a bell
somewhere under water.

### What the player knows by the credits
Lists in one hand, under one seal, have been fed to Keeper machines and Keeper bargains for at least twenty-five
years: Moth, the Court, the Warden. The lists target people who can undo them (Garrick). Someone else is writing the
hero into the Book on purpose, under a seal with one line. Vex holds two lists and is looking for the hero's first
page too. Valewyn, to the east, is losing the ink on its own decrees.

### Held back for later episodes (consistent with the root game)
Who stamps the hero's name (the one-line seal). Who writes the lists (root canon: the Eraser, once the First Keeper,
the First Library). Why Mara tuned "one bell down in your valley, once" (Ilya's seed; inference toward the thirteenth
bell). Tess's father and the White Road. The Court's forgotten Keeper. What Vex wants.

---

## 6. What Episode 3 sets up for Episode 4

- **The destination.** The courier's running seal and the bell under water point east to Valewyn and the Sunken Keep
  (root Chapter IV: Regent Lyra, forged flood decrees, the Paper Regent). Portrait `noble_lady` (portraits cell 4,
  unused) is held for Lyra.
- **The hero's stake.** Three fragments, three stamps, one counter-seal.
- **The rival.** Vex has two lists and keeps giving pieces back.
- **The party.** Bram goes on with his mother's hammer and his father's blessing ("Come home after.").

---

## 7. Episode 3 by the numbers (for the writers)

About 30 scenes (Episode 2 had 33, built as 48 with side scenes; keep Episode 3 under 42 built), 8 new named
townsfolk plus the courier and a memory actor, 3 side stories, 2 books (`foundry_ledger`, `pk_records`), 9 banners
(Emberpeak's has two states), about 35 inspect lines (the memorial, the proclamation, the silent bell, the coolant
station, troughs, sluices, spouts, the waterwheel, anvils, the Bell Gate, the feather, the leaf). Party chat (Talk)
needs a hint for each main step on each map, in the house style, and must name something doable after
`ep3_complete`.

---

## 8. Canon reconciliation (root game to NEXT)

**Kept from the root game.** Emberpeak, Bellows Square and the region's title The Forge of Ash; Foreman Veyra; Ilya
the Bell Founder, Sella the Apprentice and their testimony; the Emergency Coolant Station and its three-witness
reward; the Coal Lantern Inn, Ventworks Supplies, the Emberpeak Weaponsmith, the forge safety board; the Smelter
Proclamation and the memorial "Names Etched in Iron" with one inscription hammered flat; the Ashen Foundry and its
three floors (the Cinder Liftworks, the Ventilation Galleries, the Heartforge Crucible); the Crucible Hook key on F1's
north balcony; the three hammer vows Hand, Heart, Home; Bram's three memories (The Collapsed Mine, The Bell-Forging
Oath, The Name Under Ash) and their lines; Mara of the First Bell, Bram's mother, who made the bell that warned the
miners and was erased for sounding the alarm; the Cinder Warden (bronze furnace guardian, glowing heart, molten
hammer), its Tempered Iron, Molten Shell and Quenched Core phases, the two Furnace Coils (Bellows, Smelter), the HP lock
while the coils live, the ice weakness and the spear that interrupts its charge; the foundry ledger and the
apprentice's cache; enemy names Cinder Beetle, Ashbound Miner, Furnace Construct, Soot Phantom, Bellows Specter, Forge
Defender; townsfolk Bess, Taro, Harl and Rusk with their lines; Vex Quill's ASH SIGNATURE scene and line; "the forge
reawakens, a royal messenger arrives"; Valewyn and the Sunken Keep next; the Tempered Lexicon Blade (game.js reward);
the region-3 Suno brief (low strings, brass, hammered dulcimer, measured forge percussion, 104 BPM) as the town theme's
brief; the tempering trial's "heat, then a water quench" as the field mechanic's root.

**Changed, with reasons.**
- The old Smelter-Word word grid is gone (DESIGN hard rule 2). Its gate is now a quench puzzle.
- The valve and fan inscriptions that printed their answers ("WEST EXHAUST to EAST (1)...") are gone: water you can
  see running is the readout (DESIGN 5.3). The valve-and-fan floors become the quench channels.
- The hammer vows are no longer an order puzzle with a reset ("a mistake resets progress"); each anvil sits at the end
  of its wing's puzzle and can be struck in any order. No text-instruction puzzles.
- Heat seams that damage the party are gone (damage tiles punish phone players for imprecise taps). The coolant
  station's reward is re-expressed as Quench Flasks and +25 Fury; the canon Focus bonuses become Fury, as in Episode 2.
- Root Chapter III's "Rook the Mine Surveyor" collides with NEXT's Rook (Rook's Salvage, Archive F3), so the surveyor
  is Harl (root canon's other Emberpeak surveyor). Root "Master Orin" collides with Oren the baker, so his painted
  portrait (cell 6) is used for Ilya instead. Root "Miri the Runner" is dropped (too close to Mira).
- The Warden's four phases become three: phase IV's Last Hammer folds into the Quenched Core as its telegraph. The
  Tempered Oath bond (opening ward, Focus, one automatic interruption) becomes Bram's skill **Tempered Oath**, learned
  in `bram_memory_3`, which the player times against the Last Hammer (the decision stays the player's).
- Root's Bram memory 3 finds the name on "his mother's inscription". Here it is her founder's stamp on the Bell Gate,
  hidden by ash, which is why it survived (ties to the Lantern's lesson).
- **Inference:** the thirteenth toll at the end of Episode 2 was for Garrick. Basis: Episode 2's ending ("a single toll
  from far to the west"; Bram: "That's my mountain"), EPISODE2 section 5 ("Emberpeak is burning and someone there was
  just forgotten"; Garrick is from there), and Episode 1 (Moth's list named Garrick; Bram: "I am not losing his").
- **Inference:** the fire was twenty-five years ago and Bram was about twenty. Basis: Bram is mid-forties (EPISODE1),
  Garrick seventy-one (EPISODE2), and canon has Bram carrying miners out (an adult's act).
- **Inference:** the Cinder Warden is a Keeper construct on an order (like the Echo Warden and Moth), and the third
  fragment is a Steel Leaf. Basis: bosses cell 2 (a furnace guardian, not a person), the root's "The Warden ordered
  every record of her name burned", game.js "The first smith's oath is stamped upon a steel leaf", and Episode 1's "no
  single fire could take it all".
- **Inference:** Mara died in the fire. Basis: EPISODE1 "the fire that took his mother". She is never shown dying.
- **New:** Garrick at Hollowmere and in Emberpeak, his forge and the reforging, "Paid"; the Old Sand Road and Vessa's
  gate; the Heat mechanic in battle; quench channels; Vex's torn corner and the counter-seal on the hero's name; the
  First Bell Hammer; the clapper as the Warden's hammer-head; the courier's running seal and the bell under water;
  Vessa's Sand.

**Name collisions to respect.** Episode 1 owns `garrick` (the Willowmere NPC id, flags `garrick_farewell*`, marks
`meet_garrick`, `gather_garrick`), Episode 2 owns `garrick_crossing`, `garrick_at_ford`, `garrick_rail`, `vex_mirror`,
`black_feather*`, `testimony_*` for the Hollow witnesses, `vow_*` and `rook`. Episode 3 uses `garrick_e` for the
Emberpeak NPC record, `vex_furnace`, `oath_*` for the anvils, `testimony_ilya`, `testimony_harl`, `testimony_sella`,
and the map prefix `pk_` for Emberpeak interiors (never `ember_`, which the Ember skill and combos own).

---

## 9. Build notes (E3-story, wave 17a)

What the script, NPC, quest and text files do beyond the beat sheet. The beat sheet stands; these are the deltas.

**Scenes.** 38 built scenes in `src/data/story/ep3.js` (the plan's cap was 42): the beats and side scenes of sections 1
and 2, plus `foundry_f1_lift` and `foundry_f2_shaft` (silent step-trigger scenes that set `foundry_f1_done` and
`foundry_f2_done`, as Episode 2's `court_f1_stairs` did) and the `oath_*` trio. The main path is 204 boxes (the plan said about 230; Episode 2 ran long, so the shorter script is the safer side)
(`qa/content/ep3.test.mjs` counts it: 190 to 260). Budgets hold: every main scene is at or under 12 boxes except
`ep3_morning` (14), `first_bell` (13, then `ep3_ending` 11) and `warden_after` (22 of 24).

**Changes to the beat sheet, and why.**
- The key item reads "the founder's lift key" everywhere in text. The plan's item table calls it "Mara's Lift Key", which
  would leak the name before `bram_memory_3`. E3-battle (items.js) must name it `The Founder's Lift Key`; the test refuses
  "Mara" in `ITEMS.lift_key.name` as soon as the item exists.
- Garrick's Emberpeak record is two records, `garrick_e` (tag "The Smith", present from `met_ilya` until `garrick_named`)
  and `garrick_n` (tag "Garrick", from `garrick_named`), both at the forge mark in `pk_smithy`. This puts the speaker-tag
  swap in data, not in the engine. Willowmere's Garrick stays hidden for the whole of Episode 3 (his forge is in Emberpeak).
- Penny on the east road (`penny_e`) is hidden from `sand_gate_open`; `penny_s` takes her place on the sand road.
- Mara speaks once with her name tag: "Good hands." (`mara_voice`) as the leaf's first letters rise in `warden_after`.
  Every other voice line is tagged "A Voice".
- Bram's memories use the existing `dawn` tint for their warm cast. A dedicated sepia `memory` tint would replace the one
  word `dawn` in `bram_memory_1` when E3-world adds it.
- `ep3_morning` also needs counter `credits2_rolled` (the field launches it); the scene guard sees only flags.
- Ten banners (the nine in the plan text, plus `foundry_heart`); `pk_records` sits in `pk_bellhouse`.
- `mainQuestFor` switches to the Episode 3 quest on `ep3_started`, which only `ep3_morning` sets.
- `EPILOGUE2_LIVE` (quests.js) is what `epilogue2` says when `EP3_LIVE` is true: the old sand road, from the east gate.
  `END_CARD_EP2_LIVE` (text.js) is the matching end card sub; `story.js` `CREDITS_HANDOFF[2].endCard` must pick it when
  `EP3_LIVE`. `story.js` must merge `ep3.js` scenes, lines and `SCENE_CONDITIONS` (it is not in this agent's owned paths).

**Contracts for the next agents.**
- Maps: every mark in `docs/story/STAGING_EP3.md` section 4 (the new ones: `smith_seat`, `wren_wake`, `inn_door`,
  `smith_crate`, `rise_smith`, `gate_smith`, `memorial_smith`, `gather_garrick`, `bellhouse_in`, `shaft_bram`,
  `shaft_foreman`), the triggers and objects named there, NPC events whose id equals the record id (two at the forge),
  and sign events that read the `lines` ids.
- Battle: encounters `sr_first` (the beetle opens with Stoke), `bellows_specter`, `cinder_warden`; flag `coolant_done`
  gives +25 Fury at the start of the Warden fight; `bellows_specter_defeated` and `cinder_warden_defeated` are the
  encounter flags; Tempered Oath is learned by flag `bram_memory_3` (the scene prints "Bram learned Tempered Oath.").
- Bestiary names (`The Bellows Specter`, `The Cinder Warden`, ...) and `lore[0]` are proposals; E3-battle aligns
  `enemies.js` names and flavor to them, or the other way round (`qa/content/text.test.mjs` fails on a mismatch).
