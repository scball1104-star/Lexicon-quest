# Episode 1: The Missing Name

Story bible for Lexicon Quest NEXT, Episode 1 (Willowmere, the valley, the Rootbound Archive, the Archivore).
Script: `src/data/story/ep1.js`. NPCs: `src/data/npcs.js`. Quests and party chat: `src/data/quests.js`.
Lore text, books, credits: `src/data/text.js`. Staging for map authors: `STAGING.md`.

**Logline.** The names in a small river town are fading off its signs and out of its people's mouths. A young
villager, a bookish apprentice and a stubborn guard follow the sound of a bell that should not exist down into
an archive grown inside a willow, and find something eating names from a list. Every name comes home but one:
the hero's own.

**Target length.** 60 to 90 minutes first play (DESIGN 9): town 15, valley 10, Archive F1 12, F2 15, F3 15,
boss 8, return and ending 6, plus 15 to 20 of optional side stories.

---

## 1. Beat sheet

Scene ids from `ep1.js` are in brackets. Flags are the COMMON.md main flags unless noted.

### Act I: The night before, and Willowmere, morning
The first five minutes follow `docs/RESPONSIBILITY_ARC.md` section 2 (Scott, 2026-10-26, decision B: the six-card
prologue is replaced, not flag-gated): control in seconds, a question by the first minute, a choice with a cost by
the third, a taste of a fight by the fifth.
1. **The Thirteenth Toll** [`toll_1` to `toll_12`, `thirteenth_toll`, sets `cold_open_done`]. Playable cold open on
   the bell tower stair at night (map `bell_tower`): the hero alone, a lantern pool, no box, one line that fades on
   its own ("Willowmere. Last night."). Every step up tolls a bell and shows a name from the town, no press needed:
   Hazel, Mael, Oren, Pip, Tess, Iris, Holt, Garrick, Nella, Wick, Edda, Bram. Stop, and the bells wait. At the top
   the thirteenth toll sounds, the alarm bell, louder, and no name shows: a gap the player hears. The hero's "!",
   the bells hanging still, a held silence, black, and the one card: "In Aethelgard, every name is a promise."
   The question the whole episode answers is asked without a word: whose name was the thirteenth?
2. **Waking up** [`wake_up`, sets `intro_done`]. Dawn in the hero's home, half as long as it was. Hazel, the hero's
   guardian, calls them up in true Dragon Quest fashion and confirms what the player just heard ("You heard them
   too. Pip counted thirteen, and this once I believe him"); the hero counted thirteen or must have dreamt it. Elder
   Mael came by with his worried face on. She hands over two Potions. The doorframe height marks (inspect) already
   look paler than they should: the first, quiet clue.
3. **The fading sign** [`fading_sign`, sets `oren_truth` or `oren_lie`]. Out the front door, the bakery's
   lantern-sign goes blank before your eyes. Oren steps out and cannot remember what it said. The first choice with
   a cost: answer "Oren's Ovens," and Oren forgets his own name for a breath, then laughs it off; answer "I can't
   remember either," a kind lie that costs nothing now. Both are remembered: when his runaway starter comes home
   (`oren_starter`) he says one line about that morning that differs by the answer. Warmth, then the first chill.
3a. **The yard slime** [`yard_slime`, sets `yard_fight_done`]. As Oren goes in for paint, a runaway ink slime drops
   out of the bakery yard and blocks the lane to Lantern Square (a one-column cut of the town, so nobody reaches
   Mael without it). The hero alone, one soft, slow slime, no flee: a taste of a fight that teaches Attack and the
   weakness row and nothing else (the valley wolves still teach Lunge and Appraise). Reward: the slime's EXP and
   Oren's one line, "Not my starter, then. Mine's paler, and it only ever bit bread."
4. **Meeting Mael** [`mael_intro`, sets `met_mael`]. By the well. "Did you sleep through the bell again?" Mael
   explains the fading signs and the thirteenth toll, the old saying ("when a name is taken, a thirteenth bell
   tolls for it"), and asks the hero to go to the Rootbound Archive, north of the valley, where the Keepers kept
   the first fragment of the Book of Names. Find Mira at the library; then the south gate. The camera lingers as
   Mael opens the Town Register: "Still there. Fainter than yesterday." The player sees his fear; the hero only
   half notices.
5. **Town life** (free). Every resident has a name, a worry and a line about the fading. Side stories open here:
   Tess's lost letters, Oren's runaway starter, Wick's stolen name-tag, Nella's missing ferry bell.
6. **Mira joins** [`mira_joins`, sets `mira_joined`]. In the library Mira is fuming that all forty-one books on the
   Archive have lost the page about the door. She volunteers. Iris, her teacher, refuses, then tries to praise
   her and cannot remember her name. Mira supplies it herself, quietly, then covers with a joke ("I've started
   writing it on my sleeve"). Iris sends her with the party.
7. **Bram joins** [`south_gate`, sets `bram_joined`]. Without Mira, Bram stops the hero: nobody walks that road
   alone. With Mira, Bram decides to come, starts a fond story about his father, and loses Garrick's name mid
   sentence. Sergeant Holt gives it back. Bram: "I lost my mother's name years ago, in the fire at Emberpeak. I
   am not losing his." Holt promises to say Garrick's name every hour until Bram is home.
8. **Leaving town** [`leave_town`, sets `left_town`]. The WILLOWMERE sign over the gate flickers. "Then don't
   squint. Walk."

### Act II: The valley and the door
9. **Willowmere Valley** [`valley_arrival`]. Rain on the way, sheep, visible wildlife (briar wolves, moss scarabs,
   ink slimes). The pilgrim road runs north over the bridge.
9a. **The first fight** [`first_fight`, sets `first_fight_done`]. A few steps out of the gate a wolf pack cuts the
    road. Bram: wolves come to you; a Lunge breaks a charging foe. Mira: Appraise first, it is free. The fight
    cannot be fled. After: "Spear. Wolves hate it. Noted." Four boxes, no signage: the game's one teaching fight.
9b. **The Pilgrim's Rest** [`campfire_rest`, sets `campfire_rested`]. At the fork campfire the party sits. One
    choice: Bram on Emberpeak (the fire, his mother's face kept, her name gone with the smoke), Mira on the
    Archive (sealed a century, three floors, "assume a key or a switch"), or just rest (apples and eleven
    pencils). Then the field's rest flow: full heal and a save. Later visits: a one-box offer.
10. **The milestone** [`milestone`]. "Every name is a promise that something will not be forgotten." The last word,
    "forgotten," is fading faster than the rest. Bram does not find that funny.
11. **The Archive door** [`archive_door`, sets `archive_entered`]. A library grown into a willow. The door reads
    SPEAK, AND BE KEPT. Bram and Mira give their names and the door lights. The hero speaks theirs and the light
    gutters. Bram and Mira say the hero's name for them ("I've known them since they were knee-high and threw a
    mud pie at me"), and the door opens. They agree it is just an old door. Neither believes it.

### Act III: The Rootbound Archive
12. **F1, the Catalog Halls** [`archive_f1_arrival`]. Every index card is blank, its edges nibbled. "Something is
    eating names. The cards were just the plate." Keys, locked gates, push blocks, the first visible-enemy rooms.
    Tess's first letter (Hal to Oren) [`find_letter_1`]: Oren has a brother nobody remembers.
13. **The bell below** [`archive_f1_bell`, sets `archive_f1_done`]. At the stairs down, the thirteenth bell tolls
    from somewhere beneath them. It is the sound from last night. The toll shakes open the Keepers' back-stair
    between the landing and the antechamber by the entrance, so a trip home (and back) skips the floor.
14. **F2, the Reading Galleries** [`archive_f2_arrival`]. Pale ink echoes of readers still turn pages at the desks.
    A voice ahead keeps repeating itself. Tess's second letter (Nella to her mother, addressed to Edda)
    [`find_letter_2`]: the ferrywoman and the old gardener are mother and daughter and have forgotten it.
15. **The Echo Warden** [`echo_warden`, sets `echo_warden_defeated`]. A knight of mirrors repeating its Keeper's
    last order: NONE SHALL READ WHAT WAS NOT WRITTEN FOR THEM. Mira reads its stances for the player; a name card
    (ECHO WARDEN, Knight of the Last Order), a jolt, the battle theme. Defeated, it speaks what lay under the
    order: "...keep... their names...". A Keeper's font in the stairs room is the breather before it.
16. **The Lantern of Recall** [`lantern_get`, sets `lantern_get`]. Hidden ink rises on the wall. Mira explains it as
    a priceless relic; Bram calls it a lamp that finds things; Mira concedes. The Lantern then reveals the
    Keepers' hidden bridges [`archive_f2_exit`, sets `archive_f2_done`]: "What did they want to keep down there?"
    "Or keep in."
17. **F3, the Rootbound Stacks** [`archive_f3_arrival`]. Roots split the shelves and the shelves have learned to
    move. Dark rooms, braziers, the Stacks Key, a shortcut back to the entrance. Tess's third letter, years older
    than the others, from her missing father, signed with a hole where his name should be [`find_letter_3`].
18. **The thirteenth bell** [`thirteenth_bell`]. A cracked bronze bell hangs in the roots: RUNG FOR EVERY NAME THE
    WORLD FORGETS, SO THAT SOMEONE WILL NOTICE. It is not a curse; it is the Keepers' alarm, and its voice runs
    through the roots to Willowmere's tower. It tolls while they watch. "Who did we just lose?" "We'll never know.
    That's what it means to forget someone."
19. **The great door** [`boss_door`, sets `boss_door_open`]. Ink seeps under it; something is chewing. Mira and
    Bram give the player the boss's tells in character. "Our road brought us here. Hold fast."

### Act IV: The Heart of the Archive
20. **The Archivore** [`archivore`]. Inside the willow's heart, pages drift like snow. The Archivore murmurs eaten
    names (Oren, Iris, Garrick), then says the hero's: "ON THE LIST. NEXT ON THE LIST." Mira: "A name is harder to
    eat while someone is holding it." Name card (THE ARCHIVORE, Eater of Names), a jolt, its theme. Three phases
    (Hunger, The Torn Book with Lost Pages, Nameless Maw) and the telegraphed Devour Name are the battle-rules
    agent's.
21. **After** [sets `archivore_defeated`]. The ink pours off and leaves a small, papery keeper-beast. Mira names her
    from the Keeper's journal: Moth. "She was somebody's." Moth crumbles to pages at the sound of her name. The
    party takes the first fragment of the Book of Names. Among the debris is a list, on cheap paper in a cold
    hand: Willowmere's eaten names, all crossed out, Mira's among them. The last name is not crossed out: the
    hero's. On the golden page every name brightens but one. "It'll come back. They all came back." "...Maybe it
    just takes longer." Where Moth lay, the ink draws back from Lanternheart, the archive's one blade; Mira hands
    it over.

### Act V: Home
22. **Return to Willowmere** [`return_to_willowmere`]. The gate sign burns bright; shop signs relight as the party
    walks in. Holt runs up shouting Garrick's name. Garrick: "Took your time." Iris says "Mira" on the first try.
    Oren has a brother and the brother is furious. Hazel counts boots and fingers. Mael, last, opens the Register
    and finally confesses: the hero's name began to fade a month ago, before the signs and the bell. He was afraid
    that saying it would make it true. Mira tells him about the list and the town scratched out below it. Mael:
    east of the river is a town no map remembers, the Nameless Hollow. Mira: she came to Willowmere from the east
    as a child and has never been able to say where from. Bram: "Then that's where we go next."
23. **The ending hook** [`ending_hook`, sets `ep1_complete`]. Night. Willowmere rings its twelve bells for every
    name that came home. The last note fades, and in the quiet after it a thirteenth bell tolls. "...Thirteen."
    Somewhere, someone has just been forgotten. End cards: "End of Episode 1: The Missing Name," then "Episode 2:
    The Town Without a Name."
24. **Credits** (`CREDITS` in `text.js`), Chrono Trigger style, with the cast listed by name. Afterwards the game
    resumes the next morning in the hero's home, where every resident has new lines.

---

## 2. Side stories

| Quest | Giver | What happens | Reward |
|---|---|---|---|
| Letters for the Living | Tess (south square) | Three letters "jumped out of her satchel like startled sparrows" and flew north. One waits on each Archive floor. Each delivery changes someone's life: Oren learns he has a brother; Edda and Nella remember they are mother and daughter; Tess gets her father's last letter. | `wayfarer_boots` (set piece with `wayfarer_mantle`) |
| The Runaway Starter | Oren (bakery) | His sourdough starter crawled out of its crock toward warmth. It is rising happily beside Garrick's forge. Its crock label: "HAL'S. DO NOT TOUCH. THIS MEANS YOU, OREN." A clue to the brother Oren forgot. | `hi_potion` x2 |
| Wick's Name-Tag | Wick (square) | The Duke, a duck of low character, bit off the name-tag Wick's mother sewed on "so I wouldn't get forgot." It is in his nest by the river: "WICK. If found, he belongs to Willowmere." After this, Wick and Lark play tag in the square. | `bronze_charm` ("a lucky coin on a cord") |
| Nella's Ferry Bell | Nella (ferry landing) | The storm tore Maudie, the call-bell, off the north landing post. It is in the valley shallows below the landing. Returning it reopens the ferry: a shortcut home from the Archive end of the valley. | `river_charm` + ferry shortcut |
| Optional farewells | Hazel, Garrick | Hazel's knitted mantle ("archives are only cellars with ambitions"); Garrick's axe for the hero and his goodbye to Bram ("say it again when you are back"). | `wool_mantle`, `hatchet` |

Tess, Wick and Nella open their quests only once Bram has joined (the party is whole and the valley is next); before
that each has a line that hints something is on their mind. Oren's starter opens as soon as the hero is up.

---

## 3. Character bible

Voice samples are lines from the script. Sprite and portrait ids in brackets.

### The party
**{hero}** [`hero`]. Player-named (written for up to 8 letters). Silent protagonist in the Chrono Trigger mold:
speaks through choices, emotes, and what other people say about them. A Willowmere native raised by Hazel since
infancy; their name came already stitched on their baby blanket. Everyone's friend, nobody's hero yet. Known for
always coming back ("You never could leave a locked door alone"). Arc: they go to save other people's names and
learn their own is the one that will not return. Sword and axe.

**Mira** [`mira`]. Archivist apprentice to Iris. Precise, curious, dry. Counts things (forty-one books, eleven
rungs), corrects people, gets genuinely excited by old things, and covers hurt with a joke. Came to Willowmere
from the east as a small child and cannot say where from (her hometown is the Nameless Hollow; root canon has her
childhood promise at the Court of Mirrors in Chapter II). Wants to understand. Fears being the thing nobody keeps.
Her beat: her teacher forgets her name and she says it herself. Voice: "It's a priceless relic of the Keepers'
order that restores concealed text." / "...Yes. Fine. It's a lamp that finds things." Staff and bow.

**Bram** [`bram`]. Town guard, son of Garrick the smith, mid-forties: the party's veteran, with grey in his
beard (matches his painted portrait). Warm, blunt, protective, stubborn; older-brother energy toward the hero, whom
he has known since they were knee-high. Short sentences; jokes when scared; says "Right." to start moving. He and
Garrick came to Willowmere from Emberpeak years ago, after the fire that took his mother and, somehow, her name
(root canon: Mara of the First Bell, recovered in Chapter III).
Wants to keep his people safe. Fears losing the last name he has. His beat: he forgets his father's name mid
sentence and Holt gives it back. Voice: "Somebody has to stop you two from reading the monsters to death." Spear
and axe.

### Willowmere
**Elder Mael** [`npc_elder`, portrait `mael`]. The town elder and keeper of the Town Register, sixty years of
counting the tower's twelve bells. Gentle, measured, wry ("These knees have opinions" energy). Hidden fear: the
hero's name has been fading from the Register for a month. He sends the hero to the Archive half hoping the
answer is there. Payoff: his confession in the square. Voice: "Names are slipping off Willowmere like rain off a
roof."

**Hazel** [`npc_parent`]. The hero's guardian, 40s. Brisk, loving, teasing; hides worry inside chores and food.
Took the hero in as a baby. Believes Pip about the bells "because he'll want somebody to." Voice: "Come home with
both boots and all ten fingers. That's all I ask. Well. That and letters." Post-game: "Someone loved you enough
to choose it."

**Tess** [`npc_tess`]. Willowmere's courier, six years on the job, quick and proud. "Letters. Do. Not. Fly." Her
father carried the post before her and went north years ago; she walks the north road every spring "delivering."
Wants every letter home. Fears what she already knows: her father's name went missing long before this month, and
not because of the Archivore. An open thread.

**Oren** [`npc_baker`]. The baker. Big laugh, floury hands, talks to his dough. Sets out four rolls every morning
for a miller he cannot name: "Habit is a stubborn kind of love." (root canon line). Forgets his own name for a
moment in the first scene. Learns, from a letter, that he has a brother.

**Hal** [`npc_farmer`, appears after the Archivore]. Oren's older brother, the miller. Bakes the honey rolls Oren
says are too sweet. Spent a month at the mill setting out flour for a brother he could not name. Mostly offscreen;
his letter and his crock label build him before we meet him.

**Nella** [`npc_ferry`]. The Ferrymender. Salty, terse, river-wise; names each boat by the sound of its rope (root
canon). Wants her ferry running. Her worry she cannot name: the old woman by the flowerbeds, whom she passes every
day, is her mother. Mother of Lark.

**Edda** [`npc_old_woman`]. Old gardener who keeps twelve flowerbeds by the river, one per founding family, and a
thirteenth "for nobody I can think of." Gentle, wise, forgetful. "There is a woman at the ferry who always waves
at me. I wish I knew why it makes me want to cry." Nella's mother; Lark's grandmother.

**Lark** [`npc_child_b`]. Nella's daughter. Bossy, fast, self-declared tag champion. Makes the rules. Gets a
grandmother back at the end and keeps saying the word.

**Wick** [`npc_child_a`]. A small, brave, worried boy. His mother sewed his name onto his collar after the signs
went funny. The Duke stole it. "It still says me!"

**Iris** [`npc_scholar`]. Head of the Willowmere library, Mira's teacher for years. Dignified, dry (Mira learned
it from her), keeps a list titled THINGS NOT TO FORGET. Her beat: she forgets Mira's name while praising her.
Payoff: "Mira. First try. And every try after, for as long as I live."

**Garrick** [`npc_smith`]. The smith, Bram's father, about seventy, so he must read older than Bram: iron-grey
beard, broad but stooped, leather apron. Few words, all of them load-bearing. "Do not
rush a forge. Do not rush a fight. Respect the rhythm, and come home." (root canon has Bram quoting the first
sentence). Wants Bram at the anvil, respects that he chose the gate. Post-game, he never tells Bram to stop
saying his name.

**Sergeant Holt** [`npc_guard`]. The old gate sergeant. Steady and kind. Holds Garrick's name for Bram and keeps
saying it every hour. "My own wife called me Hector this morning. I'm Holt. Have been for fifty years."

**Pip** [`npc_bellkeeper`]. The bellkeeper, elderly, half bell-deaf, counts everything. Heard thirteen; nobody
believed him; he was right. Keeps the thirteenth hook empty. His grandmother's saying: "the thirteenth bell only
rings when the town remembers who it rings for" (root canon line, kept as folk belief).

**Hob** [`npc_innkeeper`]. Jolly innkeeper of the Lantern Inn. "A bed, a meal, a story. The story is free."
Writes every guest's name twice "in case the first one wanders off." **Barnaby** [`npc_farmer`, inn upstairs]: a
pilgrim asleep since Tuesday. Wakes after the credits: "Did I miss anything?" Bram: "...No."

**Pell** [`npc_shopkeeper`]. Anxious shopkeeper of Willowmere Goods who has started labeling the labels.
**Penny** [`npc_shopkeeper`, valley]: his cheerful sister, the valley peddler. "He worries. I sell."

**Cobb** [`npc_farmer`]. Farmer who named every hen and can no longer tell them apart. **Henrietta** and
**Bertha** [`animal_chicken`]: they know exactly who they are, eventually.

**Loaf** [`animal_cat`]. The bakery cat. The cat that will not move. **Anvil** [`animal_dog`]: Garrick's dog, who
is delighted to meet you every single time. **The Duke** [`animal_duck`]: a duck of low character.

**Quill** [`npc_scholar`, valley]. A traveling scribe at the Pilgrim's Rest who copies the milestone every year,
and this year copies every name twice (root canon line).

### The Archive
**The Echo Warden.** A Keeper's mirror knight, guarding the Lantern for a century on one repeated order. Speaks only
in echoes. Under the order: "keep their names."

**The Archivore (Moth).** Once a keeper-beast: one of the gentle page-eating creatures the Keepers raised to eat
mildew and rot. Left behind when the Archive was sealed, then given an order to eat names. Speaks in stolen
names. Not evil; obedient and starving. Dies small.

**The last Keeper** (offstage, `keeper_journal_1..3`). Stayed behind when the Archive was sealed, refused an order
from the high Keepers to take names out of the Book, hid the Lantern behind the Warden, rang the bell for every
name Moth took. Their own name is the last thing in the journal, and it is gone.

**The list-writer** (offstage). Someone who wrote Willowmere's names, and the hero's, on cheap paper in ink that
does not fade, and fed them to Moth. Seal and identity withheld.

---

## 4. Tone guide

**Warm first, then the chill.** Every uneasy beat is anchored by a human one: Oren forgets his name, then laughs
at himself; Iris forgets Mira, and Mira jokes about her sleeve; the hero's name fails at the door, and Bram tells
the mud-pie story. Players should love the town before they fear for it.

**Show forgetting, never explain it.** A pause (`wait`), a "...", a sentence that stops, someone else supplying the
name. Nobody says "the names are being erased by magic." They say "It's right there, and I can't..."

**Names are spoken with weight.** Characters say each other's names at the key moments: Holt to Bram, Mira to
Iris, Bram and Mira to the door, the whole town in the return scene. Saying a name is how this world holds on.

**Short boxes.** At most 3 lines of 42 characters per box, one idea per box. Long thoughts become two boxes. Let
silence work; use "..." sparingly.

**Humor is character humor.** It comes from who people are (Pip counting, Pell labeling labels, Loaf not moving,
Bram's bluntness against Mira's precision). No modern slang, no winks at the player, no fourth wall.

**Voices.** Mira: precise, curious, dry, numbers, contractions, gentle corrections. Bram: warm, blunt, short
sentences, food and family, "Right." Mael: measured, kind, old sayings, no contractions, deflects with humor
when afraid. Hazel and Oren: brisk and big-hearted, contractions. Iris, Garrick, Edda: formal or terse by nature.
Children: simple words, rules, big feelings ("So I wouldn't get forgot").

**House rules.** No em dashes (commas, colons, periods). Names are story, never a puzzle: no letter guessing, no
spelling gates, no word games of any kind. Player text is plain ASCII (the bitmap font). The hero is `{hero}`.

---

## 5. The lore of names in Aethelgard

**Names are promises.** "Every name is a promise that something will not be forgotten." In Aethelgard a name is
not a label but a hold: as long as someone keeps it, a person, a river or a town keeps its shape.

**The Book of Names.** The Keepers, an old order of archivists, wrote every name in the Book of Names "in an age
before roads." When the Keepers fell silent they divided the Book among their archives so that no single fire
could take it all. The Rootbound Archive, grown into the roots of the Mother Willow at the head of Willowmere
Valley, kept the first fragment.

**What erasure does.** When a name is taken from the Book, the world loosens its grip in stages:
1. Writing fades first: signs, labels, the letters of a milestone, a signature on a letter.
2. Then memory: people lose the word for each other mid sentence, though not the love ("I knew her face every
   day. I only lost the word for her.").
3. Left long enough, the thing itself thins: roads forget where they go, towns drop off maps (the Hollow North of
   later chapters is this stage).

**Holding a name.** A name is harder to take while someone is saying it. That is why Holt repeats Garrick's name,
why Willowmere's children wear name-tags, why Quill copies every name twice, and why Mira tells the party to keep
saying each other's names in the boss fight.

**The thirteenth bell.** The Keepers gave Willowmere its thirteenth bell when the town was founded: an alarm cast to
toll for every name the world forgets, "so that someone will notice." When the Keepers sealed their doors they
took it home to the Archive. Its voice runs down the willow's roots under the whole valley, and Willowmere's twelve
bells hum along. That is what Pip heard. Folk belief (Pip's grandmother) says it rings "when the town remembers who
it rings for."

**Keeper-beasts.** Gentle creatures the Keepers raised to eat mildew, rot and mites and so protect their books.
Well fed and loved, they eat only what is spoiled. Starved, or given bad orders, they become something else.

**The Lantern of Recall.** A Keeper relic of green bronze. Its light shows ink that was written and then hidden:
"Ink remembers, even when paper forgets." The Keepers built their bridges in hidden ink so only those who could see
what was hidden would cross.

**The order and the list.** A century ago an order came down from the high Keepers: certain names were to be taken
out of the Book. The Rootbound Archive's last Keeper refused. The order was given to Moth instead. A month ago
someone gave Moth a new list, on cheap paper in ink that does not fade: Willowmere's names, and at the bottom the
hero's, not crossed out. Below it, a place scratched out so hard the pen tore the paper.

### What the player knows by the credits
Names are fading because a keeper-beast was ordered to eat them from a written list. The list is recent and
deliberate. The thirteenth bell is an alarm. Every Willowmere name came back except the hero's. A town to the east
has lost its own name, and Mira may have been born there.

### Held back for later episodes (consistent with the root game)
Who writes the lists (root canon: the order traces to the First Library; the Eraser was once the First Keeper,
who believed forgetting is mercy). Why the hero's name is on the list. Tess's father, whose name was taken years
before Moth woke. Bram's mother, Mara of the First Bell (Emberpeak, Chapter III). Mira's promise at the Court of
Mirrors (Chapter II).

---

## 6. What Episode 1 sets up for Episode 2

Episode 2 is the Nameless Hollow (root canon: "The Town Without a Name," Mayor Elian, the Court of Mirrors, the
Nameless King, whose name Aurel returns at the end, and the town remembering itself as Hollowmere).

- **The destination.** The list's scratched-out place, Mael's line about a town no map remembers, and the
  library's child's map (a town east of the river whose name has faded to a smudge) all point east.
- **Mira's stake.** She came from the east and cannot name her hometown: because its name is gone. Episode 2 is
  her episode.
- **The hero's stake.** Their name is still faint on the golden page and was the next entry on the list. The
  question "why mine?" drives the whole campaign.
- **The threat.** The thirteenth bell tolls again on the night of the celebration. Someone, somewhere, is still
  being erased; the list-writer walks free (root canon: "Perhaps the one holding the list still walks free").
- **Small threads.** Tess's father; Bram's mother; the high Keepers' order; Moth's Keeper, whose name the journal
  could not hold.

---

## 7. Canon reconciliation (root game to NEXT)

Kept: Elder Mael and his errand to the Rootbound Archive; the Thirteenth Bell; Tess and the three letters (Hal's
recipe letter to Oren, Nella's crossing letter, Tess's father's letter, all text kept) with Wayfarer Boots; Oren's
four rolls and "Habit is a stubborn kind of love"; Nella naming boats by the sound of their ropes and repainting
them with her daughter; Pip the bellringer, Edda the gardener and Iris the archivist; Quill copying names twice;
the milestone, the fork sign, the Pilgrim's Rest, the hollow tree; the Catalog Promise, the beast-below marginalia
and the broken chronicle; the Keeper's oath of a living witness; the Lost Pages; "the Archivore was following a
written list"; Bram's father as a smith and his mother lost at Emberpeak; Mira's eastern childhood.

Changed, with reasons:
- Floor names follow DESIGN 9 (Catalog Halls, Reading Galleries, Rootbound Stacks); the boss room is the Heart of
  the Archive, matching `encounters.js`.
- The old witness quest (testimony from Pip, Edda and Iris to ring the bell) became world texture: Pip's count,
  Edda's thirteenth flowerbed, Iris's library. The bell's true nature is now a main-story discovery.
- Nella's letter to her mother is delivered to Edda, who is now her mother; Nella's "daughter" from the old ending
  line is Lark.
- Every word-based gate and the optional Lanterns of Memory and dial puzzles are gone; the Lantern of Recall is
  the Episode 1 field tool (DESIGN 5.3).
- The hero's guardian is named Hazel (new). The smith is named Garrick (new; the old game never named him).
