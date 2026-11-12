# Episode 7: The Vanishing World

Story bible for Lexicon Quest NEXT, Episode 7: the White Road, Palehaven, the Frostbound Vault, the White Phantom and the
other half of the first page. Written by ep7-designer, Tuesday 2026-11-10 (Eastern), as a design proposal on branch
`scott/ep7-design`. **Status: PROPOSAL. Nothing here is built.** The story is joint between Scott and Stephen: every line,
name and choice below is theirs to change, line by line. The production side (ids, maps, name stones, Rime, loot, music,
assets, save rules, the waves and the agent briefs) is in `docs/EPISODE7_PLAN.md`. When built, everything of Episode 7
lives in the lazy `ep7` pack: the script in `src/data/ep7/story.js`, NPCs in `src/data/ep7/npcs.js`, quests and party chat
in `src/data/ep7/quests.js`, lore, books, banners and inspect lines in `src/data/ep7/text.js`, and the staging guide in
`docs/story/STAGING_EP7.md` (written by E7-story, the shape of `STAGING_EP6.md`). Nothing of it goes into the core files
(plan section 13).

**Decisions, 2026-11-11 (revision 2).** Scott answered the open choices: "just use the defaults", with Tess's father dead
confirmed in so many words (choice 6). On the First Keeper's name (choice 10) he asked that it be taken from Scott's and
Stephen's novel, *The Thirteenth Bell*, Book One; choice 10 is revised toward it (section 8, "Novel canon"). Two directions
from the same answers apply to every episode: bosses are **tougher, not longer** (plan 6.4 to 6.6), and an episode does not
open in the inn room Episodes 3 to 6 opened in (this one opens in the Chart Room: beat 1, plan 3). A third is noted and not
designed here: each episode expands the world map, places stay revisitable and the party travels between them, like Final
Fantasy; a separate world-map proposal is coming, and nothing in this bible should close that door. Every choice in section
10 is marked with its decision. **The story is joint: Stephen may still change any line, name or choice**, and a change of
his wins over a default here.

**Sources.** `EPISODE1.md` sections 3 and 5 (Tess, Hazel, the thirteenth bell), `EPISODE2.md` sections 1, 2 and 5 (the
Last Route, "Then north, by the White Road", the Court's forgotten Keeper), `EPISODE3.md` sections 1 and 5 (Mara, Ilya's
seed "And one down in your valley, once"), `EPISODE4.md` scene 20 (Vex's "There's a name on it I'm not ready to hand
anyone"), `EPISODE5.md` section 5 (the warm hand taught Ishra), `EPISODE6.md` sections 5, 6 and 10 (what was kept for
Episode 7 and what is held for Episode 8), `RESPONSIBILITY_ARC.md`, `CRITIQUE_8.md`, `PLAYTEST_REVIEW_8.md`, and the root
game's Chapter VII: `CHAPTER_VII_MILESTONE.md`, `rpg-chapter7.js` (the Frostbound Vault's three floors and their names,
the Stillheart Crystal Key, the Thawlight Recovery Basin, the Winterwatch Provision Cache, the Keeper Charter, the enemy
names Frostbound Revenant, Hollow Ice Knight and Pale Lantern Shade), `rpg-data.js` line 117 (the region record: "HOLLOW
NORTH", "The Vanishing World", Keeper Nox, "Mountains flicker in and out of being. Villages have become gaps in the
map.", the boss THE WHITE PHANTOM, the reward First Key, the ending "A staircase of written light leads into the First
Library itself."), `rpg-engine.js` (the witnesses Mirael, Oren and Eira and their lines, the Hearth of Returning Names
and its rewards, Nox's three memories and her brother Corin, the White Phantom's four phases with the Closed Gate and the
Lost Letter, the chapter ending "The Doors Reopen", "Palehaven - The Returned Names"), `rpg-regions-ii.js` (Palehaven,
"The Thawing Hearth", the Thawlight Lodge, Northwind Provisions, the Glass-Ice Armory, the Keeper's Watch Notice, the
South Icegate, the Vanishing Mark, the Northward Beacon), `rpg-townsfolk.js` (Bryn, Eira, Sol, Maera, Torr),
`rpg-interiors.js` (the North Watchkeeper, the Ice Provisioner, the Iceglass Smith), `ART_PROMPTS.json` (environments
cell 6, bosses cell 6), `SUNO_TRACKS.json` (the region-7 brief), `RUNWAY_SCENES.md` (chapter-7, boss-7), and the older
layer `game.js` (marked LEGACY where used: Vex's "The Name Under Ice" and its line "Now you understand why I keep
moving.", the Snowrest village record with Asta the Scout, Bo the Lampmaker and Grandmother Nyx, and the Episode 8 scene
"The Last Margin"). Tags: **(canon)** comes from those files, **(new)** is invented here, **(inference)** is a synthesis
of canon fragments; every inference is listed in section 8.

**Logline.** In the Hollow North the map is forgetting itself. Paths go white under the walker's feet, villages are gaps,
and in Palehaven nobody can say the name of anyone who left, not even the name of the Keeper who looks after them. The
Sky Compass sends the party up the White Road to the other half of the hero's first page, and to the woman who wrote it:
a Keeper who stopped the North's bell fifteen years ago so that no one would have to hear another goodbye. The hero, who
has never been heard to say anything, learns to call a name and be answered, and finds out who carried them down the
road.

**Theme question.** Episode 5 asked "what do you do when you are told how it ends?" Episode 6 asked "what do you hold on
to when the wind takes the shortest way?" Episode 7 asks **"what do you keep of someone who is gone?"** The White Phantom
says: all of them, frozen, so nothing ever changes. The Keeper, fifteen years ago, said: nothing you have to hear. Vex
says: half, and keep moving. Tess, far south, has said for years: a road you walk every spring. The episode's answer is
the canon letter from the Keeper's brother: "Do not freeze my life into a single farewell. Open the door for those who
follow." And the hero's answer, without a speech: their name, said out loud.

**Target length.** 60 to 90 minutes first play, planned at about 72, which is under Episode 6's plan on purpose: Episode 6
was planned at 75 and timed at 75 to 102 (PLAYTEST_REVIEW_8 item 3, re-timed in PROGRESS 2026-11-10), most of the overrun
from 31 lane decisions and a loop that sent the party home. Planned minutes: the Chart Room and the flight north 3,
the White Road 14, Palehaven 10, Vault F1 11, F2 with the Pale Lantern 13, F3 10, the White Phantom 7, the page, the doors
and the ending 6. Optional content adds 10 to 14 (three side stories, revisits). Budgets: 15 ordinary fights plus the
scripted first (Episode 6 had 16 plus the first and met its boss a level high), at most 12 boxes per main scene (six set
pieces excepted), about 190 boxes on the main path, and **at most 16 name-stone decisions on the main path** (plan 4.10:
every decision counted, never a step).

**Levels.** Episode 6 ends at Lv 28 (the Storm Scribe met at Lv 27 with 16,670 EXP when every fight is fought, +1,300
after it: about 17,970 at the credits; Fact, `docs/BATTLE.md` 14.6, E6-fixes paragraph). A Continue save that fought
every placed foe, elites included, may arrive at Lv 29 (Inference from PLAYTEST_REVIEW_8 item 6: every Episode 6 bot met
the Scribe at 28). The White Road 28 to 29, Vault F1 29, F2 29 to 30 (the Pale Lantern at 29), F3 30, the White Phantom
fought at 30, Lv 31 after it. (`expForLevel`: 28 16,887, 29 18,314, 30 19,806, 31 21,363; Fact, `src/data/party.js` run
on 2026-11-10.)

**Whose episode.** The hero's, with two guests. Episode 2 was Mira's hometown; Episode 3 was Bram's mother; Episode 4 was
the hero's signature; Episode 5 was Mira's reading; Episode 6 was Bram's hold. The rotation comes back to the hero, and so
does everything Episode 6 kept for this episode: the hero's first page, the warm hand that wrote it, and who carried them
down the White Road. The center character gets the boss's central decision (the skill **Call**, from the canon witness
title "Call the Lost" and the Keeper Charter's "RETURN when a lost voice calls"), the way Episode 4 gave the hero Answer
and Episode 6 gave Bram Anchor. Answer was the hero speaking for themself; Call is the hero speaking for someone else.
Root Chapter VII is driven by **Keeper Nox** (canon); she is a guest who walks beside the story, not a fourth party slot
(the same call Episodes 4 to 6 made for Lyra, Sel and Aeris). Her own beat is the episode's subtext in one person: fifteen
years ago she shut every door so no one would have to say goodbye; in the Sanctum she opens the last one with her own
hand. **Vex** rides north in the fourth seat he booked in Episode 6 and walks the White Road as a scene actor; he never
fights.

---

## 1. Beat sheet

Scene ids for `src/data/ep7/story.js` are in brackets. Flags are from the plan (section 2.2). Every scene follows the
house wrapper rules (guarded by `SCENE_CONDITIONS`, input locked for its run, registered through `registerStory`). Key
lines are samples in final voice, already inside the box rule (3 lines of 42 characters); the story agent writes the
rest and keeps every main scene at 12 boxes or fewer except `name_under_ice` (14), `whiteout` (14), `listening_bell`
(14), `phantom_after` (18), `whole_page` (18) and `doors_reopen` (16). **Staging rule (CRITIQUE_6 item 11, kept):** every
scene walks the party to marks two tiles below and beside the speaker before the first line; nobody is stacked on one
column, nobody stands on a seated or kneeling speaker. **Camera rule (new, from CRITIQUE_8 item 2 and the Episode 6 polish
that widened Zephyr Landing):** every staged scene's focus marks sit at least 12 tiles from a map's left and right edges and
7 from its top and bottom, or the map is wider, so the camera never clamps an actor against the screen edge. **Show, do
not tell (CRITIQUE_6 item 3):** the six payoffs (the fading chart, the carving, the crossed sevens, the frozen half page,
the whole page, the restored address) are close-up inserts through the existing `closeup` page kinds, never narration
over an unchanged map. **Payoffs in stages (CRITIQUE_7 item 7, CRITIQUE_8 item 5):** the whole page opens in three steps,
and the Keeper's name is the third, never the first thing seen; each step's text reaches full strength only when its box
says it.

**Speaker tags.** The White Phantom speaks in capitals (the Archivore, King, Warden, Regent, Oracle and Scribe pattern),
tagged "The Phantom". The Keeper is "The Keeper" until her name is read in `whole_page`, then "Nox" (the speaker-swap
mechanism of Episodes 4 to 6: two records, `keeper` and `nox_t`). Her brother in memory is "A Courier" until `whole_page`,
then "Marten" (two records, `courier_m` and `marten_m`). The Keeper's mother in memory is "The Keeper's Mother" (she has no
name in canon and gets none here).

### Act I: Zephyr Landing, the chart that forgets

The first five minutes (RESPONSIBILITY_ARC section 2: control in 20 seconds, a question in 60, a choice with a cost in
3 minutes, a fight in 5), exactly as the player sees them:

| Time | What the player sees and does |
|---|---|
| 0:00 | Fade in on the Chart Room at the top of the Signal Beacon tower, at dawn (not the Cloudhouse Inn: the save wakes there, and the scene moves before the fade). The Sky Compass on the brass skychart table, needle north, humming. Frost on the inside of the north window, and only that one. Three boxes. |
| 0:20 | Aeris at the table with a chart. The close-up: the realm, and the north of it going pale while you look, one valley's name lifting off the paper. Aeris: "That was a valley last night." |
| 0:35 | Mira: "Then we go now." Control. |
| 0:40 to 1:20 | Down the tower and out through Zephyr Landing (Pippa, Liora, Bennet say one line each if spoken to) to the north dock, where the Kestrel waits with Vex in the fourth seat. |
| 1:20 | The flight north as one cut: clouds, white mountains, a valley that flickers out under the hull. The Kestrel sets down on a frozen lake at the foot of a pale road. Banner. Control. |
| 2:00 | Twenty steps up, a wall of ice carved with travelers' names. Vex kneels and carves his own. Half the letters go while he watches. |
| 2:40 | Vex: "Read it to me. What's left?" The choice: `Half of it.` / `All of it.` |
| 3:30 | Wolves out of the snow: two Rime Wolves. The first fight; each bite frosts a name on the party's row. |
| 4:30 | Bram's name frosts over and he misses a turn; Mira Defends and shakes hers off. Win. The road goes on up. |

1. **The chart that forgets** [`ep7_morning`, triggered on enter of `ep6_zl_inn` (where the Episode 6 credits wake the
   save) with `ep6_complete`, counter `credits6_rolled`, `EP7_LIVE`, not `ep7_morning_done`, not `tier_1`; staged in
   `ep6_zl_charts`, the Chart Room: the scene's first step, still on black, moves the party there, so the player never sees
   the inn room again; sets `ep7_morning_done`, `ep7_started`; gives `white_road_letter` if the party does not hold it].
   (new; canon "Mountains flicker in and out of being. Villages have become gaps in the map.") **Opening room (Scott,
   2026-11-11: "open them in a different room").** Episodes 3 to 6 each opened in an inn room; Episode 7 opens in the
   Chart Room Episode 6 already built (plan 3), re-dressed by a pack patch for the North: the north window frosted from
   the inside, the skychart table's north edge gone pale, a draught that lifts the pinned manifests. No new map; the art
   needs are listed in plan 9.6 for a later visual brief.
   - Narration: Dawn in the Chart Room. The compass on the skychart table, needle north, humming. Frost on the inside of
     the north window, and on no other.
   - Aeris, at the table: "Couldn't sleep. Look at this. Look fast." The close-up `ep7_chart`, mode `fading`: the realm's
     chart, the north pale, and one valley's name lifting off the paper as the camera holds.
   - Aeris: "That was a valley last night. A road, two farms, a mill. Now it's paper."
   - Mira: "Then we go now." Bram: "Before breakfast. Of course before breakfast."
   - (only without `white_road_letter_get`) Aeris: "And Piri sent this up. Said it's going the right way at last." She
     hands the hero the White Road letter (a seed from Episode 6's side story; every player now carries it).

2. **Zephyr farewells** (talk entries, one box each, optional): Pippa: "Every ship answers the lights now. Even yours."
   Liora: "Dock four. If you come back, I'll be at the right one." Bennet: "Wrap your hands. Rope freezes. So do fingers."

3. **The fourth seat** [`ep7_board`, `ep6_zephyr`, the Kestrel's gangway at the north dock (pack patch, plan section 3);
   sets `ep7_boarded`]. Vex is already aboard. Two boxes, then the flight as one cut (the scene owns the time and place).
   - Vex: "I booked four seats. I meant to use mine twice."
   - Aeris: "North. Hold on to something. Bram knows how."

### Act II: The White Road

4. **The last place on the map** [`road_landing`, `ep7_white_road`, on enter; sets `road_arrived`]. Banner: The White Road
   / Up to Palehaven. A frozen lake in a ring of black pines, the Kestrel on the ice, and a pale road climbing north into
   the mountains, with stretches of it simply not there: white, like paper with nothing written on it (environments cell
   6). Two boxes.
   - Aeris: "I don't land where the chart says nothing. This is the last place it says something. I'll wait."
   - Bram: "The road has holes in it." Mira: "Not holes. Gaps. Somebody forgot those parts."

5. **The Name Under Ice** [`name_under_ice`, step trigger at the Traveler's Wall twenty steps up; sets `vex_carved`,
   `valewyn_list_get`, and `told_vex` or `spared_vex`; gives `valewyn_list`]. (LEGACY scene "The Name Under Ice", kept and
   staged) A wall of clear ice beside the road, cut with hundreds of names: every traveler who walked the White Road
   carved one going up (new; canon "Each returning traveler adds one shard of glass" re-aimed to a name). Most are pale
   and half gone. Vex kneels with a knife.
   - Vex: "Travelers carve their names here going up. So the road knows to bring them back down."
   - He carves. The close-up `ep7_carving`, mode `fading`: VEX QUILL in fresh cut ice, and half the letters going white,
     one by one, while the camera holds.
   - Vex: "Now you understand why I keep moving." (LEGACY line, kept)
   - Vex, not looking up: "Read it to me. What's left?"
   - Choice: `Half of it.` / `All of it.`
   - Truth (`told_vex`): Vex: "...Thanks. Nobody's ever said it straight." Kind (`spared_vex`): Vex: "Liar. Kind one."
     (Changes one line in `doors_reopen` and one Talk line; plan 7.3.)
   - He takes a folded list from his coat: cheap paper, the cold hand, the seal of the empty book. "Valewyn's. I told you
     there was a name on it I wasn't ready to hand anyone." He holds it out. His own name is at the top, as half gone as
     the carving. "Mine. Take it. I'm tired of carrying it." Gives `valewyn_list`. (Pays EPISODE4 scene 20.)
   - Mira: "When did they write you down?" Vex: "Twelve years ago. A while after I said yes to a letter." (the letter of
     EPISODE6 scene 26)

6. **The first bite** [`road_fight`, step trigger row above the wall (`if: vex_carved`); scripted battle `e7w_first`, no
   flee; sets `road_fight_done`]. Two Rime Wolves come out of the snow. The teaching fight for Rime (plan 6.3): each bite
   frosts a third of the bitten member's name on the party row; at three the member is Frozen and misses a turn; Defend
   shakes it off. No tutorial box.
   - Before: Mira: "Cold bites. If your name starts to frost, Defend and shake it off." (the E6-fixes A3 lesson: the line
     names the button)
   - Mid-battle (the battle's message at the first Frozen): "Bram's name frosts over. He misses his turn."
   - After: Bram: "My name was cold. My NAME. Is that a thing now?"

7. **Read the stone** [`first_stone`, step trigger at the first gap, where the road goes white for eight cells and a
   low cairn stands at the near edge with a name cut in its face; sets `first_stone_read` on the first read]. The field
   mechanic's first lesson (plan 5.1). Sol the Trail Scout (canon) sits on his pack tying twine to a stake.
   - Sol: "Read the name on the stone. The road remembers who walked it." (new line; canon Sol "Some paths disappear while
     I am walking them. I leave twine markers now.")
   - Bark after the first read (`first_held`): Mira: "ASTA. And there's the road she walked." (the name is a legacy
     Snowrest name, plan 5.1; never an answer to anything)
   - Bark at the third stone, the first time a path lets go (`first_letgo`): Mira: "Two at a time. The road can't
     remember more than we can."

8. **Whiteout** [`whiteout`, step trigger on the high stretch after the stone lessons; sets `call_learned`; teaches
   `call_name`]. The set piece of Act II and the hero's first beat. The snow comes sideways and white; the screen goes
   pale (the pack tint `whiteout`, plan 5.2), and Mira and Bram fade: their sprites pale to nearly nothing, and on the
   party row their names frost letter by letter. (Staged as actors, a tint and the HUD; the scene owns every move.)
   - Mira (faint): "{hero}? I can't see you. I can't... what's my..."
   - Bram (faint): "There's someone I'm walking with. I had their name a second ago."
   - The hero emotes `!`. Narration: "{hero} calls their names into the white. Loud enough to carry."
   - Mira and Bram come back into colour, mid-step, as if they had never stopped.
   - Mira: "You said my name." (a beat) "Out loud. I heard it."
   - Bram: "Do that again sometime. When it's not snowing." Learns **Call** (`skill_learn`, "{hero} learned Call. Say an
     ally's name: the cold lets go of them, and they come back sooner.").

9. **The crossed sevens** [`waystation`, the Courier's Waystation on the road (a one-room hut, plan 4.1), on first enter;
   sets `saw_sevens`]. A cold stove, a bench, a post box with a slot, and on the doorframe a courier's tally of runs cut
   with a knife: rows of strokes, and every seventh one crossed. (new) Rest and save here (the stove lights).
   - Mira, touching the frame: "Tess said her father crossed his sevens." (EPISODE1: "He crossed his sevens.")
   - Bram: "Tess's dad carried the post north. Up here?" Mira: "Up here. A lot of times."
   - The close-up `ep7_tally`: the tally, the crossed sevens, and at the top, where a courier would carve his name, a
     smooth white patch in the wood.

10. **Palehaven from the Icegate** [`palehaven_view`, step trigger at the South Icegate at the top of the road; sets
    `saw_palehaven`]. Blue-ice ramparts, a little town round a square, aurora crystals glowing on poles, and beyond the town
    a frozen cathedral among pines that is there, and then for a breath is not, and then is (environments cell 6, canon
    "Mountains flicker in and out of being"). `mystery`, softer.
    - Bram: "That building's blinking." Mira: "That's where the compass points."
    - The hero emotes `...`. (the hero looks longest at the cathedral)

### Act III: Palehaven

11. **The town that does not say goodbye** [`palehaven_arrival`, `ep7_palehaven`, on first enter; sets
    `palehaven_arrived`]. Banner: Palehaven / The Unlit Hearth (new; after `doors_reopened`: Palehaven / The Returned Names,
    canon). Snow over an old watch road, the cold hearth in the square, and half the doors in town iced shut, with no name
    on the lintel. In the square, the Vanishing Mark (canon): a carved band of runes with a hollow growing in it.
    - Bryn the Frost Keeper (canon), at the gate: "Travelers. Up the White Road. We don't get those." (canon Bryn "I tend
      the north gate and keep the pathways clear of ice.")
    - Mira, at an iced door: "Who lived here?" Bryn: "...Someone. They left. We don't talk about who left. It's kinder."
    - Bram: "Is it?" Bryn has nothing to say to that.

12. **The Keeper** [`meet_keeper`, the Keeper's talk entry at the north end of the square, first time; sets `met_keeper`].
    (canon "Meet Keeper Nox at the north end of Palehaven", her name withheld) An old woman in a long blue Keeper's coat,
    lighting a lamp by hand at the foot of the Keeper's Watch. She turns, sees the hero, and the match burns down to her
    fingers before she notices.
    - The Keeper: "...You came up the road. Nobody comes up the road."
    - Mira: "We're looking for something the compass says is here." The Keeper: "Then the compass is wrong. Go home."
    - Bram: "Who are you?" The Keeper: "The Keeper. That's what there is." (She has no other answer: her name is gone.)
    - She goes inside. On the door, her notice (the canon Keeper's Watch Notice): THE VAULT IS SHUT. IT STAYS SHUT.
      Mira looks at it a long moment. "Look at the k." (the warm hand's k: Ishra's, EPISODE5; the letter's, EPISODE6)

13. **The boy who mended bindings** [`keeper_and_vex`, `ep7_ph_watch`, on enter after `met_keeper`; sets `keeper_told`].
    The Keeper's Watch inside: a room of letters, every one face down, a cold lamp, a chair by a shuttered window. Vex has
    come in behind the party. The Keeper looks at him the way she looked at the hero.
    - Vex: "You wrote me a letter. Fourteen years old, and a Keeper wrote to me." The Keeper: "I asked a boy who mended
      bindings, in a house I won't name here. You grew."
    - Vex: "You signed it. The name came off." The Keeper: "I signed it. The ink would not stay. It hasn't stayed in
      sixteen years."
    - Mira, at an empty frame on the wall: "Whose was this?" The Keeper: "Mine. I kept a house of mirrors once. I left
      my face there." (Episode 2's empty portrait; open choice 5, one line only)
    - The hero holds out the compass; the needle points past her, north, at the cathedral. The Keeper: "Half a page. It's in
      the Vault, with everything else I couldn't bear. I shut it in."
    - Mira: "Then open it." The Keeper: "I can open the door. I cannot walk through it."
    - The Keeper sees the White Road letter in the hero's bag (every player carries it from `ep7_morning`), the crossed seven on its seal, and puts her
      hand flat on the table. "Not yet. Please. Not that one yet."

14. **The Vault gate** [`vault_gate`, `ep7_palehaven`, step trigger at the north gate after `keeper_told`; sets
    `vault_open`]. The Keeper unlocks the cathedral gate with a key from round her neck and steps back from it.
    - The Keeper: "The Vault is past the pines. Mind the floors. They forget too."
    - Vex sits down on the gate step. "I don't go where names are kept in ice. Mine's had enough of it." Bram: "Then
      keep the step warm." Vex: "...I'll be here."

### Act IV: The Frostbound Vault

15. **The Vanishing Steps** [`vault_f1_arrival`, `ep7_vault_f1`, on enter; sets `vault_entered`, `vault_f1_arrived`].
    Banner: The Frostbound Vault / I. The Vanishing Steps (canon). Galleries of frost brick and ice glass, stairs that end in
    white, name stones on every landing. Floor question (arc 3.5): whose names are cut into the Vault's stones?
    - Mira: "Every stone has a name. Every one of them went somewhere." Bram: "And somebody kept the list."

16. **A Gate Kept Open** [`keeper_memory_1`, `ep7_vault_f1`, step trigger at the frozen gate on the first landing; sets
    `keeper_memory_1`]. (canon memory, title kept; staged as a tinted vignette: the Vault's ice replays what it holds.) A
    blizzard over a little town gate, long ago. A woman with a lamp in the open gate; a girl in a blue coat beside her.
    - The Keeper's Mother (memory): "We don't shut the gate. Not while anyone's out there."
    - The Keeper's Mother (memory): "The light exists so others can return." (canon line)
    - She says the girl's name. The memory's sound drops out on it, a frost blot where the word was. Mira, now: "Her
      mother said her name. The ice took it out of the memory too."

17. **The Stillheart Crystal Key** [the gold chest on the northern balcony (canon "Recover the Stillheart Crystal Key from
    the northern balcony"), flag `stillheart_key_found`]. The lift up sets `vault_f1_done`.

18. **The Hall of Borrowed Light** [`vault_f2_arrival`, `ep7_vault_f2`, on enter; sets `vault_f2_arrived`]. Banner: II.
    The Hall of Borrowed Light (canon). A long dark hall where the only light is borrowed: a lamp burns over each stone
    whose name the party holds, and goes out when they let it go. Doors of solid ice where the Phantom still grips a name.
    Two boxes.
    - Bram: "It's dark until we remember something." Mira: "Then let's remember carefully."

19. **The Name Left Outside** [`keeper_memory_2`, `ep7_vault_f2`, step trigger at the letter wall; sets `keeper_memory_2`].
    (canon memory, title kept, re-aimed: section 8) The ice replays the same gate in another winter. The girl is grown, the
    Keeper's coat on her now. A man comes up out of the snow in a courier's coat with a brass post badge, snow to his
    knees.
    - A Courier (memory): "Told you I'd come back up. The little one's with Hazel. Safe as bread." (Hazel: EPISODE1, the
      hero's guardian; "Bring the little ones home": EPISODE1's letter, the echo is on purpose)
    - The Keeper (memory): "You carried them all that way." A Courier (memory): "Down the White Road. Every step."
    - Bram, now, at the badge: "That's a Willowmere post badge. Bell and letter." Mira: "Tess's father." (his satchel
      stayed on the Hollow's lost-property shelf: EPISODE2, the Last Route)
    - The hero emotes `...`. (they do not yet know the rest; the player does)

20. **The bell that was stopped** [`listening_bell`, `ep7_vault_f2`, step trigger in the bell bay; sets `bell_found`].
    The set piece of Act IV and Bram's beat. A bronze bell the size of a cart, frozen solid inside a block of clear ice,
    its clapper held mid-swing. On the waist of the bell, a maker's stamp: an anvil and a bell (EPISODE3, Mara's stamp on the
    Bell Gate). A tag on a cord, frozen to the bronze.
    - Bram stops walking. "...That's her mark." (a beat) "That's my mother's bell."
    - The close-up `ep7_tag`: the tag in a strong square hand: "Tuned to the one down in the valley, as you asked. When it
      rings there, this rings here. Good hands. Mara of the First Bell." (new text; "Good hands." is Mara's line from the
      Episode 3 build, EPISODE3 section 9)
    - Mira: "The thirteenth bell. In Willowmere. She tuned it to this one." (EPISODE1: "It rings whenever a name is taken.")
    - Bram: "So somebody up here would hear when a name went missing down there." (a beat) "She tuned it the year before
      the fire." Nobody says anything else about the fire. (Pays EPISODE3's "And one down in your valley, once.")
    - Bram: "Somebody stopped it. You don't freeze a bell by accident."

21. **The Pale Lantern** [`pale_lantern`, `ep7_vault_f2` lamp gallery, arena trigger; boss intro card; battle
    `pale_lantern`; sets `lantern_defeated`; the lift trigger sets `vault_f2_done`]. A tall pale shape like a hooded keeper
    with a great lantern for a head, its light cold and blue: the thing that keeps the hall's borrowed light. Name card: THE
    PALE LANTERN / Keeper of Borrowed Light. Intro line (arc 3.6): "It lit the hall with names it would not give back."
    (new; canon "Pale Lantern Shade" grown into the floor's keeper, section 8)
    - Mira, the one tip: "When it borrows one of us, call them back, {hero}. Before its turn."
    - After: Bram: "It was holding the light for somebody." Mira: "It forgot who."

22. **The Keeper Emergency Reliquary** [optional, `reliquary`, F2, side story 2]. (canon reliquary, now a stone route and
    three witness pages in any order.) Bram: "Three pages and a locked box. Keepers plan for bad winters."

23. **The Stillheart Sanctum** [`vault_f3_arrival`, `ep7_vault_f3`, on enter; sets `vault_f3_arrived`]. Banner: III. The
    Stillheart Sanctum (canon). The cathedral's nave from below: pillars of ice, three landings climbing toward a high round
    door, the aurora through a broken roof, and far up, a white light that does not move. The quietest map of the episode.
    Two boxes.
    - Bram: "It's quiet." Mira: "It's still. That's not the same."

24. **The Winter She Could Not End** [`keeper_memory_3`, `ep7_vault_f3`, step trigger on the first landing; sets
    `keeper_memory_3`]. (canon memory "The Winter Nox Could Not End", retitled so her name is not spoken before its payoff:
    section 8) The bell bay, years ago. The bell rings by itself, a long note, and the Keeper, younger, comes running. It
    rings a name. The memory keeps the sound of the bell and drops the name.
    - The Keeper (memory), to the bell: "No. Not him. Not on the road. He was nearly home."
    - She puts both hands on the bronze and holds it until it stops. Frost spreads from her hands over the whole bell.
    - The Keeper (memory): "If no one hears it, no one has to say goodbye."
    - Behind her, in the dark of the nave, something tall and white lifts its head. (the Phantom, taking her stillness as its
      order: section 5)
    - Mira, now, very quietly: "She stopped the bell. And then everything up here stopped with it."

25. **The last door** [`keeper_comes`, `ep7_vault_f3`, chained after `keeper_memory_3` once the party reaches the second
    landing; sets `keeper_came`, `stillheart_open`, and `told_nox` or `spared_nox`]. Footsteps behind them. The Keeper comes
    up the stair with her lamp lit, out of breath, and stops where the memory stood. (She walks with the party as a scene
    actor from here; she does not fight. At each landing she waits by the stone.)
    - The Keeper: "I closed every door in this place. I'll open the last one."
    - She looks at the hero. "You were this big. Wrapped in a blanket with your name on it. I wrote it on the blanket too, in
      case the page got lost." (EPISODE1: "their name came already stitched on their baby blanket")
    - The Keeper: "Do you remember any of it? The road. The cold. Me." The **truth choice** (the episode's main one): `No.`
      / `I remember.` Truth (`told_nox`): The Keeper: "Good. You were meant to forget the cold. That was the point of the
      road." Kind (`spared_nox`): The Keeper smiles, and does not believe it, and is glad anyway. "...You were too small to.
      But thank you." Either way the episode goes on. The choice changes one line in `whole_page` and the Keeper's gift
      (plan 7.3).
    - At the high round door she puts her bare hand on the ice. It has no keyhole and needs none; it knows her hand, though
      not her name, and it opens. The Stillheart Crystal Key opens the inner grate behind it (canon keyhole).

### Act V: The White Phantom

26. **The Stillheart** [`phantom`, `ep7_stillheart`, trigger row at the entry; boss intro; battle `white_phantom`]. The top
    of the nave: a round floor under the broken roof, the aurora moving overhead, and in the middle a heart of clear ice as
    tall as a door with names moving inside it like fish under a frozen pond. Standing over it, a tall skeletal shape of ice
    with an antler crown and a ragged frozen cloak (bosses cell 6, canon). Name card: THE WHITE PHANTOM / Keeper of the
    Stillheart. Intro line (arc 3.6): "It kept them safe the only way it knew. It kept them still."
    - The Phantom: "NO ONE LEAVES. NO ONE IS LOST. I KEEP THEM STILL."
    - The Phantom, to the Keeper: "YOU ASKED FOR QUIET. I HAVE KEPT IT FIFTEEN YEARS."
    - The Phantom, to the hero: "YOU I CANNOT SAY GOODBYE TO. YOU WERE KEPT." (the counter-seal's "Keep this one.": the
      Phantom's Farewell never targets the hero, plan 6.5)
    - The Keeper: "I asked for quiet. I never asked for this." Bram: "Then we'll un-ask it."
    - Choice: `Let them go.` / `Bring them back.` (either way, the battle; the Phantom answers each with one line)
    - Mira, the one tip: "When it says goodbye to one of us, call them, {hero}. Before it lands."
    - Phase 3 battle message: "The ward thaws. Fire cracks the Phantom's frost." (canon "Fire cracks its outer frost.")

27. **Every name, moving** [`phantom_after`, `ep7_stillheart`, after the win; sets `stillheart_restored`, `fragment7_get`,
    `seventh_list_get`; the encounter sets `phantom_defeated`]. The order matters; the story agent keeps it:
    1. The Phantom goes down on one knee over the heart. Its crown cracks. The Phantom: "I KEPT THEM SAFE. I NEVER LET THEM
       GO." (a beat) "I WAS TOLD TO KEEP THE NORTH FROM READING A PAGE."
    2. The heart of ice thaws from the inside: the North's share of the Book, the Stillheart, every name of the realm
       pressed into ice, running clear and bright. The frozen names in the nave write themselves back (`name_restore`
       flash), a wave of them out through the broken roof and down the mountain.
    3. Under the hero's line, the counter-seal and "Keep this one." A seventh fragment, a seventh time. Gives
       `name_fragment_7`. Bram: "Seven." Mira: "Seven. And this time we know whose hand."
    4. Where the Phantom knelt, a list frozen into the floor: cheap paper, the cold hand, the empty-book seal. The
       close-up `ep7_seventh`: THE NORTH. LET IT FORGET EVERY SOUL WHO CAN STILL READ THE FIRST ERASED PAGE. (root canon's
       "the North forget every soul who could still speak the First Keeper's true name", re-aimed toward the novel: what
       the North was made to forget is whoever could still read the first page ever erased. Section 8, choice 10.) Gives
       `seventh_list`.
    5. Mira: "Every other list names people. This one names a page." The Keeper: "Sixteen years. It came up the road the
       spring you did. I could read that page. So they took my name." Bram: "Read it, then." The Keeper: "Not here. A page
       like that is a door. We open it where it was written." (Episode 8 keeps the page, what is on it, and why the
       spring. Nobody in Episode 7 says "fire", "Concordance" or whose page it is.)
    6. Beside the heart, frozen into a block of ice by her own hands years ago, half a page. The close-up `ep7_page`, mode
       `half`: a torn top edge, a few lines in the warm hand, all of them frosted white and unreadable.
    7. Far below, the bell. The Listening Bell rings, thawed, a long note for every name it was stopped from ringing: the
       thirteenth bell's sound (core `bell_thirteenth`), many times, then once more alone. The Keeper closes her eyes on the
       last one.

### Act VI: The Doors Reopen

28. **The first page, whole** [`whole_page`, `ep7_palehaven`, on arrival in the square after `phantom_after` (the party
    comes down through the gate at dusk; Vex is still on the step); sets `page_whole`, `nox_named`, `marten_named`]. The
    hearth in the square. The Keeper, Vex and the party. Vex takes the top half of the page out of his coat, still in the
    oilcloth he kept it in above the clouds.
    - Vex: "Sixteen years. Here's your half back."
    - The halves meet over the hearth, and the frost comes off the bottom half in the warmth. The close-up `ep7_page` in
      three steps (CRITIQUE_7 item 7): `joined` (the torn line runs on at last: "Carried down the White Road by Marten,
      courier of Willowmere, at his sister's asking."); `mark` (under it, in a second, rougher hand, a carrier's mark and
      the date, and the seven in the date crossed); `signed` (the signature, there for the first time since it was
      written, in the warm hand: "Nox.").
    - Mira, at `mark`: "He crossed his sevens." Bram: "Marten. Tess's dad is Marten." (Speaker swap in memory records: "A
      Courier" becomes "Marten".)
    - Mira, at `signed`, reading it aloud: "Nox." Speaker swap: "The Keeper" becomes "Nox". (canon name)
    - Nox: "...Nox. It's been a long time since it stayed on the paper."
    - Nox: "I wrote your name the night you came to me. Where you came from is not mine to tell. It's written somewhere I
      can't go." (Episode 8 keeps it.)
    - (truth path of `keeper_comes`) Nox: "You said you didn't remember. I'm glad. You remember us now." (kind path) Nox:
      "You said you remembered. You were being kind. So was he, always."
    - Nox gives the whole page to Vex. "You kept the top for sixteen years. Keep it whole. I'll know where it is." (open
      choice 11) Vex: "...I'm used to being followed." He folds it into his coat.

29. **The Doors Reopen** [`doors_reopen`, `ep7_palehaven`, the next dawn, straight after; sets `doors_reopened`,
    `letter_sent`, `vex_name_whole`]. (canon "Chapter VII Complete - The Doors Reopen") The iced doors are wet and
    running; names come back onto the lintels. People come out into the square and say names to each other.
    - Nox stands at the hearth with a letter from the Vault, her brother's, and reads it to the town (canon "Nox reads
      Corin's letter publicly"): "Do not freeze my life into a single farewell. Open the door for those who follow." (canon
      words, in Marten's letter)
    - The hearth catches by itself. (If the side story lit it already, it flares.)
    - The hero holds out the White Road letter. Its address has come back: the close-up `ep7_letter`, mode `restored`:
      TESS, AT WILLOWMERE, and in the corner, MARTEN, with a crossed seven in the date. Nox: "He wrote to her the winter he
      came back up. It went south on the wrong ship." Aeris, come up from the landing: "I'll carry it. And yours." Nox hands
      her a second letter: "To my niece. Fifteen years late." The hero gives Aeris the White Road letter (`letter_sent`).
    - Vex comes up the road at a run, snow on his coat. "Went down to the wall." The close-up `ep7_carving`, mode `whole`:
      VEX QUILL, every letter there, cut deep. (truth path of `name_under_ice`) Vex: "You said half. Read it again." (kind
      path) Vex: "You said all of it, back then. Now you're not lying."
    - Nox gives the hero the gift (plan 7.3: the Open Gate for the truth path, the Kept Lamp for the kind path; legendary
      beam, equip prompt). Nox: "Keep the door open behind you. Someone's always following."

30. **The ending hook** [`ep7_ending`, `ep7_stillheart`, the broken roof at night; on enter by the square's nave door
    after `doors_reopened` (Talk names it); sets `ep7_complete`].
    Nox, Vex, Aeris and the party at the top of the nave, the thawed heart running bright behind them.
    - Mira, to the compass: "Where do the lists come from?" The needle swings straight up.
    - Out of the broken roof, up through the aurora, a staircase of written light unrolls into the sky, step by step, and
      each step is a line of handwriting (canon "A staircase of written light leads into the First Library itself.").
    - Vex: "I know where that goes. I mended bindings there." (open choice 14) Mira: "The First Library." Vex: "Don't say it
      loud. It listens."
    - Nox: "I'll say the name you'll need up there. Up there." Bram: "Then you're coming." Nox: "...Ask me at the top."
    - End cards: `End of Episode 7` / sub `The Vanishing World`; then `Episode 8: The Last Word` / sub `The lists were
      written here.` (the root region title, EPISODE8 ask 1; section 10 choice 16)

31. **Credits** (`CREDITS_EP7` in the pack's `text.js`, `palehaven` music), then the next morning in the Keeper's Watch
    (`ep7_ph_watch`, mark `watch_cot`: Nox has given the party the cots by her stove; the letters on every wall now face
    up). Not the Thawlight Lodge: Episode 8 opens where this wakes, and it must not open in an inn room (Scott,
    2026-11-11; EPISODE8 ask 4, the room declined, the counter kept). The Lodge stays an inn to rest at. Every Palehaven resident has new lines with the Keeper's name in them (canon lines
    restored: section 3); the iced doors are open; Snowrest is back on Aeris's chart; Zephyr Landing, Saffron Haven,
    Valewyn, Emberpeak, Hollowmere and Willowmere residents have Episode 7 lines; the end card says Episode 8 is not
    playable yet.

---

## 2. Side stories

| Quest | Giver | What happens | Reward |
|---|---|---|---|
| **The Hearth of Returning Names** (canon witnesses and hearth) | Eira at the cold hearth, after `met_keeper` | Hear Mirael (the Keeper hid every loss to spare them grief; canon), Sol (the beacons were built for returning travelers, not as locks; canon, Oren's line, section 8) and Eira (her sister's last letter, frozen; canon). Then light the Hearth of Returning Names in the square (canon). No order; any sequence; one talk each. | 2 Hi-Potions, 2 Hi-Ethers and 400 gold (canon two Potions and two Ethers, scaled), the hearth becomes a rest and save point, and +20 Fury at the start of the White Phantom fight (`hearth_lit`; canon +20 Focus). The Winterwatch Coat (set piece). |
| **The Keeper Emergency Reliquary** (canon reliquary and witness pages, now a stone route) | Talk hint on F2 | Three witness pages (Open the Door, Share the Flame, Call the Lost; canon titles) lie on F2's side galleries, found in any order. The Reliquary sits behind a frost door that opens only when the party holds a side gallery's two names at once, a pair the main route never needs. No order puzzle, no recital. | 450 gold, 2 Hi-Ethers (canon 240 gold and two Ethers, scaled), book `keeper_book` |
| **Torr's Missing Streets** (new, from canon Torr, who "write[s] the missing streets in a book so they remain in memory") | Torr at the Keeper's Watch steps, after `palehaven_arrived` | Three street plaques blown off their walls and half forgotten: one on the White Road (a ledge reached by holding two stones), two on F1 (a dead-end gallery behind a stone pair; a cache behind a Dash-cracked ice crate). Bring them back; Torr writes the streets into his book and the town's map gets three names back. On the last page of his book Torr shows the oldest line: "Our oldest page names the White Phantom, then stops mid-sentence." (canon) | Snowrest Scarf (rare unique charm; LEGACY Snowrest's Warm Wool Scrap re-aimed) |

Side quests open once Palehaven is introduced (`palehaven_arrived`; the Hearth from `met_keeper`). Every quest has a
journal entry and a Talk reminder. Cut line: Torr's Missing Streets goes first if the budget tightens (Torr keeps his
canon lines and the book becomes an inspect).

---

## 3. Character bible

Sprite and portrait ids in brackets (plan section 9).

### The party in Episode 7

**{hero}** [`hero`]. Silent, through choices, emotes and what others say. The hero signed their name in Valewyn, put their
star back in the desert and owned what followed them in the isles; in the North they find who wrote them down, who carried
them, and that they were carried at all. Their beat is a sound: in the whiteout they call Mira and Bram back by name, and
in the Stillheart they call back whoever the Phantom is saying goodbye to. The Phantom cannot say goodbye to them ("YOU
WERE KEPT"), which is the first time the counter-seal has done something the player can see in a fight. Arc beat: from "I
will own what follows me" (Episode 6) to "I will call back whoever is fading". They see their whole first page and let Vex
keep it.

**Mira** [`mira`]. Dry, exact, the one who reads what will not hold: the k on the Keeper's notice, the crossed sevens on a
doorframe, the signature on the page, which she reads aloud. She fades in the whiteout and is called back, and her line of
the episode is the smallest she has had: "You said my name. Out loud. I heard it."

**Bram** [`bram`]. Two centers behind him and a small, heavy beat here: his mother's maker's stamp on a frozen bell at the
top of the world, and the date he works out without anyone saying it. "She tuned it the year before the fire." He is the
one who knows a Willowmere post badge when he sees it, and the one who says "Tess's dad is Marten" out loud first, because
he grew up with her. Humor: snow, breakfast, his name being cold.

### The guests

**Nox, the Keeper of the Hollow North** [`keeper`, then `nox_t`; sprite `npc_keeper`; no portrait by default; plan 9.5]
(canon name, title and role: "Keeper Nox"; canon "Keeper Nox sealed the Frostbound Vault to suppress the memories that
caused her grief"). Seventies, small and straight-backed, a long blue Keeper's coat with frost on the hem, white hair
pinned up, ink on her right hand that never quite washes off. She writes in the warm hand that has written "Keep this one."
under the hero's name in every fragment since Episode 1, taught Ishra her letters (Episode 5), asked a fourteen-year-old
binding-mender to hide a page (Episode 6), and wrote the hero's first page. Sixteen years ago, the spring a child came to her
step, a list came north and took her name, because she could still read a page the list-writer wants forgotten (what page,
and how she read it, is Episode 8's). Fifteen years ago her brother
died on the White Road going home; the bell rang his name, she stopped it with her hands and shut the Vault, and the
Phantom took her quiet for an order. Dry, kind, tired, exact about small things, unable to say goodbye. She does not fight:
a scene actor who meets the party in the square and the Watch, opens the gate, and from `keeper_comes` walks the Sanctum
with them. Her beat is opening the door. New lines: "I can open the door. I cannot walk through it." "Nox. It's been a long
time since it stayed on the paper." "Keep the door open behind you. Someone's always following."

**Vex Quill** [`vex`, portrait `silver_rogue`] (canon recurring rival). Sixth NEXT appearance, and the first in which he
travels with the party. He rides the fourth seat he booked, carves his own name into the White Road's ice and watches half
of it go, hands over the Valewyn list with his own name at the top (the name he would not hand anyone in Episode 4), meets
the Keeper who wrote to him at fourteen, waits on the Vault's step because "I don't go where names are kept in ice", and
gives the top half of the page back so the two halves can meet. He leaves with the whole page. He never fights. His arc
warms a sixth notch: E2 took a list, E3 gave a corner, E4 signed as a witness, E5 gave a list away, E6 booked the seats and
answered, E7 hands over his own name.

**Captain Aeris** [`aeris`, sprite `npc_aeris`] (canon, Episode 6's guest). Bookends only: she brings the fading chart to
the inn, flies the party north, waits at the landing ("I don't land where the chart says nothing"), and carries the
letters south at the end.

### Palehaven

**Bryn the Frost Keeper** [`bryn`] (canon). Forties, a guard's fur hood, a staff with a lantern hook. Tends the south and
north gates. Canon lines: "The watchfires turn pale blue when a page vanishes from the map." "I tend the north gate and keep
the pathways clear of ice." His third canon line is held until `nox_named`: "Keeper Nox can explain why the snow hides gaps
in the world." (before: "The Keeper can explain...")

**Eira the Glassblower** [`eira`, and `eira_forge` at the Armory] (canon; carries both of canon's Eiras, section 8). Thirties,
leather apron, glass-cut fingers, a lens on a cord. Keeps the Glass-Ice Armory (shop `glassice_armory`) and the last lantern;
gives the Hearth quest. Canon lines: "My iceglass never breaks in cold, only when the story inside is forgotten." "I make
lantern lenses from aurora crystals." Her testimony (canon, one word changed until `nox_named`): "The Keeper promised to
keep my sister safe. The White Phantom froze her last letter rather than let me read that she had come home."

**Sol the Trail Scout** [`sol`, and `sol_waystation` at the Courier's Waystation] (canon; carries canon Oren the Crystal
Surveyor's testimony, section 8). Twenties, twine round both wrists, a pack of stakes. Met on the White Road; keeps a
peddler's stall at the Waystation (shop `waystation_pack`). Canon lines: "Some paths disappear while I am walking them. I
leave twine markers now." "I carry bundles to the watch tower before dark." Testimony (canon, the first sentence of Oren's;
the second was a puzzle answer and is dropped): "The northern beacons were built for returning travelers, not as locks."

**Maera the Herbalist** [`maera`] (canon). Fifties, a basket of winter moss. Keeps Northwind Provisions (shop
`northwind`) and sells Ember Tea. Canon lines: "Even the winter moss can tell whether a traveler will return." "I keep warm
infusions for the south-bound patrols."

**Torr the Northern Scribe** [`torr`] (canon). Sixties, ink-blue fingers, a ledger under his arm. Gives Torr's Missing
Streets. Canon lines: "I write the missing streets in a book so they remain in memory." "Our oldest page names the White
Phantom, then stops mid-sentence." His third canon line is held until `nox_named`: "Keeper Nox taught me to press names
into iceglass."

**Mirael the Winter Physician** [`mirael`] (canon witness). Forties, a physician's bag, frost-grey scarf. Her testimony
(canon, one word changed until `nox_named`): "The vault held our names in ice, but the dead never asked us to lock the
doors. The Keeper tried to spare us grief by hiding every loss."

**The North Watchkeeper** [`ep7_innkeeper`, Ledger-excluded] keeps the Thawlight Lodge (canon inn; canon interior title
"North Watchkeeper").

**Marten, the Courier** [memory records `courier_m` then `marten_m`, sprite `npc_courier_m`; no portrait] (canon role: the
Keeper's brother, root "Corin", renamed: section 8; Tess's father, EPISODE1). Fifties in memory, a courier's coat with the Willowmere post badge, snow
to the knees, a laugh he does not lose even in a blizzard. Carried the hero down the White Road as a baby at his sister's
asking, to Hazel's door, came back up the next winter to tell her the child was safe, and died on the road going home
(never shown). Seen only
in the Vault's memories; his letter is read by Nox in `doors_reopen`, his name read on the page in `whole_page`.

**The Keeper's Mother** [memory record `keeper_mother_m`, sprite `npc_keeper_young` recolor] (canon role, memory 1: "Nox
remembers her mother waiting through a blizzard, refusing to close the town gate until every traveler was safe.").

### The Vault

**The White Phantom** [boss `white_phantom`, field avatar `phantom_avatar`, portrait `phantom` crop] (canon name and look:
bosses cell 6, "skeletal icy spectral sentinel with antler crown and ragged frozen cloak"; nature inference). The Keepers'
Warden of the Stillheart: a Keeper construct made to keep the North's share of the Book (the Stillheart, every name of the
realm pressed into one heart of ice) safe through the long northern winters, and to copy names from it onto every doorway
and waystone so the North would always know who lived where. Sixteen years ago a list in the cold hand came up the White
Road with one order: THE NORTH. LET IT FORGET EVERY SOUL WHO CAN STILL READ THE FIRST ERASED PAGE. The Phantom began
freezing the names of those who could, the Keeper's first. Fifteen years ago the Keeper stopped the Listening Bell and shut the Vault so
no one would grieve, and the Phantom took her stillness for a second order: keep everyone safe by keeping them still. Since
then it freezes the names of anyone who leaves, and then the paths they walked, and then the places they lived. The fading
of the North is the Phantom being kind too hard. Not evil: a tool given a bad order, and then a sad one, like Moth, the
Warden, the Clerk, the Oracle and the Scribe. Speaks in capitals. Last words: "I KEPT THEM SAFE. I NEVER LET THEM GO."

**The Pale Lantern** (mini-boss, new; canon "Pale Lantern Shade" grown into the floor's keeper). The keeper of the Hall of
Borrowed Light: a tall hooded shape with a lantern for a head, made to light the Vault's records for readers. Since the
Vault was shut it borrows the light of whatever name it can catch and will not give it back.

**The Closed Gate and the Lost Letter** (canon: "Memory Shadow - Closed Gate", "Memory Shadow - Lost Letter"). The
Phantom's phase 2: two memory shadows out of the Keeper's own grief. The Gate shuts: it closes the hero's mouth so they
cannot call. The Letter mends the Phantom with cold ink and frosts the party.

### Returning cast

Zephyr Landing: Aeris, Pippa, Liora, Bennet (one line each in Act I, one after `ep7_complete`). Saffron Haven, Valewyn,
Emberpeak, Hollowmere and Willowmere residents (by the Keeper mirrors and the roads): one Episode 7 line each after
`ep7_started` and after `ep7_complete`. Holt carries the Willowmere side again, and **Tess** gets the episode's last word
south: after `ep7_started` "Bram's letter says they're going up the White Road. Dad's road. Tell them to mind the
holes." After `ep7_complete` (once Aeris has flown the letters): "A letter came on an airship. In his hand. It says Marten
at the bottom. Marten. I'm going to say it at every door on my route." Hazel, after `ep7_complete`: "A courier left you
on my step with a blanket and a laugh. I knew him. I couldn't say who, until today. Marten. Thank you, Marten." Hollowmere's Court: the
empty portrait in the Court of Mirrors has a face again after `nox_named` (an inspect line; open choice 5).

---

## 4. Tone guide (what changes from EPISODE6 section 4)

Everything in Episodes 1 to 6 stands: warm first, then the chill; show forgetting, never explain it; names with weight;
short boxes; character humor; no em dashes, ASCII only, `{hero}`.

- **White, blue and one warm light.** Episode 6 was peach sky and slate storm. Episode 7 is snow white, ice blue and black
  pine, with aurora green and violet overhead at night, and one warm colour that means a person: a lamp, a hearth, a
  stove, a lit window. The fade (paths the map has forgotten) is a flat paper white with no texture, so it never reads
  as snow you could walk on. The town and the Vault must look like two cold places, one of which still has people in it.
- **Stillness, not storms.** The Hollow North's sickness is not misdirection (Episode 6) but a refusal: a town that will
  not say who left. Show it with stillness: iced doors with no names, a woman lighting a lamp by hand and not looking at
  the cathedral, a bell frozen mid-swing, a hearth nobody lights. Nobody explains "the Phantom freezes the names of the
  absent"; a door has a name on it after the thaw that it did not have before.
- **Goodbyes and doors.** Use the verbs on purpose: keep, call, carry, open, shut, freeze, thaw, remember, let go. The
  Phantom's capitals are about stillness and safety, as the Scribe's were about courses.
- **The hero's voice, never the hero's words.** The hero calls names twice in the episode (the whiteout, the battle). Both
  are shown (narration, a HUD name thawing, a sound), never a speech box from the hero. Keep it that way.
- **Humor carriers.** Bram (snow, breakfast, his name being cold), Vex (dry, once he is warm), Sol, Maera. Never during a
  memory, never at Marten's or Mara's expense, never in the Sanctum before the Phantom falls.
- **Nox's restraint cracks once.** "...Nox. It's been a long time since it stayed on the paper." Keep the rest dry and
  careful.
- **Grief is shown small.** Marten's death and Mara's are never shown and never described. A bell rings and a woman puts
  her hands on it; a son reads a date. That is enough for a child and enough for an adult.
- **Names with weight in this episode.** Nox (read off the page by Mira at the hearth), Marten (said by Bram, then by Tess
  at every door), Mara (on a tag, by her son), Vex Quill (whole, in ice), and the hero's, which the Phantom cannot say
  goodbye to.
- **The responsibility arc, as subtext only.** Nobody says "let go" or "take responsibility". Nox opens a door. The hero
  calls someone back. Vex hands over his own name. Bram reads a date and says nothing about it. The game names no real
  person and credits no teacher or author (RESPONSIBILITY_ARC section 0, decision A).
- **The aurora is slow.** Aurora bands drift; they never flash or strobe, and the whiteout tint fades in over two seconds,
  never at once (a phone and photosensitivity rule, plan 5.2).

---

## 5. The lore added in Episode 7

**The Stillheart.** The Keepers divided the Book of Names "so that no single fire could take it all" (Episode 1). The
North's share was pressed into ice: every name of the realm in one heart of clear ice in the cathedral the Keepers built at
the top of the White Road, copied onto the iceglass of every doorway and waystone in the North (canon Torr: "Keeper Nox
taught me to press names into iceglass"). A Keeper construct, the Warden of the Stillheart (the White Phantom), kept it.
The Stillheart is the seventh fragment.

**The road remembers who walked it.** In the North a path is held by the names of the people who walk it; a name carved
going up tells the road to bring its owner back down. Freeze a name and the road it walked goes white, then the house it
lived in, then the village (canon "Villages have become gaps in the map"; LEGACY Snowrest: "The White Phantom is removing
the footpaths and the names of those who walked them."). That is how the North fades: not by a storm or a fire, but by
nobody saying who left.

**Readings turn; courses can be rewritten; a name can be called back.** Episode 4 taught that true ink holds. Episode 5,
that a reading is not a record. Episode 6, that a course is only ink but a hand can hold. Episode 7 adds: a frozen name is
not a lost one. Say it, and it comes back. **Call, then open the door.**

**The Listening Bell and the thirteenth bell.** Twenty-six years ago, the winter she was made Keeper, the Keeper asked
Mara of the First Bell to tune Willowmere's thirteenth bell (the Keepers' oldest alarm, which "rings whenever a name is
taken": Episode 1) to a twin she hung in the cathedral, so that when a name went missing in the valley the North would
hear it. Mara did, once (Episode 3's "And one down in your valley, once"). The next year Emberpeak burned. Fifteen years
ago the Listening Bell rang Marten's name; the Keeper stopped it with her hands and it froze. Since then the North has
heard nothing, and has said nothing.

**The seven lists.** Vex now counts seven, in one hand under one seal: Emberpeak's (twenty-five years ago), the desert's
(twenty), the North's (sixteen), the Hollow's (fifteen), Valewyn's (twelve, renewed a month before Episode 4, with Vex's
name on it), Willowmere's (a month before Episode 1), and the sky's (a month before Episode 6). The North's is not the
oldest; it is the odd one. Every other list names people or a place. The North's names a page: THE NORTH. LET IT FORGET
EVERY SOUL WHO CAN STILL READ THE FIRST ERASED PAGE. It came the spring the hero came north, and after it the lists come
faster (Episode 4's "It's getting faster."). The list-writer's fear here was not a name said out loud. It was someone
reading what had been rubbed out. (Episode 8 says what the page is.)

**The first page, whole.** The hero's name in the warm hand, the counter-seal, "Keep this one.", and the line the Episode 6
half broke off: "Carried down the White Road by Marten, courier of Willowmere, at his sister's asking." Under it, Marten's
mark and the date with a crossed seven, and the signature, Nox. Vex keeps it.

**Who asked Vex, who carried the hero, who wrote the name.** One family. Nox, the Keeper of the Hollow North, wrote the
hero's name the night a child was brought to her (from where, she will not say: Episode 8), tore the page, sent the top half
above the clouds with a fourteen-year-old binding-mender, and sent the child down the White Road with her brother, the
Willowmere courier, to Hazel's door. The next winter Marten came back up to tell her the child was safe, and died on the
road going home.

**The counter-seal, a seventh time.** In the Stillheart, under the hero's line, the counter-seal and "Keep this one." It is
also, for the first time, a rule the player can see: the Phantom cannot bid the hero farewell.

### What the player knows by the credits
The warm hand is Nox, the Keeper of the Hollow North, whose name was taken sixteen years ago, the spring the hero came to
her, by a list against anyone who could still read "the first erased page". She wrote the hero into the Book the first time, and her brother Marten,
Tess's father, carried the hero down the White Road to Hazel. He died on that road the next winter. The first page is whole and
Vex keeps it. Mara tuned the North's bell to Willowmere's so the North could hear when a name was taken. The lists come from
a place up a staircase of written light, and Vex once mended bindings there.

### Held back for later episodes (consistent with the root game)
**Kept for Episode 8:** who writes the lists (root canon: the Eraser, once the First Keeper, the First Library; Episode 7
never says whose hand writes the lists, and the words "First Keeper" do not appear in it); what "the first erased page" is,
what was on it, and how Nox could still read it (Nox: "Not here."); why the list came "the spring you did"; why the hero,
where the child came from before Nox, and what the list-writer wants with their beginning (Nox: "It's written somewhere I
can't go."); the mural's eighth star with no symbol; Vex's "I kept one thing from the Eraser: your beginning. You keep the
ending." (LEGACY "The Last Margin", Episode 8; Episode 7 keeps it possible word for word: Vex leaves with the whole first
page). The First Library itself (Episode 8). Everything of the novel's that Episode 8 pays (the fire, the Concordance, the
cracked-key seal, the hero's mother) is absent from Episode 7 on purpose (section 8, "Novel canon").

---

## 6. What Episode 7 sets up for Episode 8

- **The destination.** The staircase of written light from the Stillheart's broken roof into the sky (root canon: "A
  staircase of written light leads into the First Library itself."; root region 8, the First Library: the Eraser, the
  Scriptorium; bosses cell 7, environments cell 7). The compass named "where the lists come from" points up it.
- **The hero's stake.** Seven fragments, the whole first page, a name written by Nox, a road walked by Marten, and a
  beginning before either of them that nobody will say.
- **The rival.** Vex has handed over his own name, has it back whole, and carries the whole page toward the house where he
  mended bindings. The LEGACY Episode 8 scene ("Vex arrives at the First Library carrying the first page") needs only that.
- **The guide.** Nox can still read the first erased page, and has promised to say "the name you'll need up there". Episode
  8 (proposal) has her climb the stair with them.
- **The party.** Unchanged: three, each with a center behind them, the hero twice now.
- **What Episode 8 must still pay.** The Eraser and the First Keeper, the first erased page and the name Nox will say, the
  First Library, why the hero and what came before Nox, why "the spring you did", the eighth star, and Vex's last margin.

### Episode 8's nine asks of Episode 7 (EPISODE8 section 0.2), as applied 2026-11-11
1. Retitle the Episode 8 card to "Episode 8: The Last Word": **applied** (beat 30, choice 16).
2. Do not use the root's Nox after-clear line in Episode 7: **applied** (choice 19; section 8).
3. Keep the roof's `stair_foot` mark, the `star_stair` prop, and the `nave_door` open from `doors_reopened`: **applied**
   (plan 4.9 and 5.4, unchanged and now marked as kept).
4. Keep the credits wake at `ep7_ph_inn` mark `inn_bed` and the counter `credits7_rolled`: **the counter applied, the room
   declined.** Scott's 2026-11-11 direction is that an episode does not open in the inn room, and Episode 8 opens where this
   wakes, so the wake moves to the Keeper's Watch (`ep7_ph_watch`, mark `watch_cot`: beat 31, plan 5.3, choice 23).
   EPISODE8 is updated to match on its own branch.
5. Keep Nox's record ids `keeper` / `nox_t`, sprite `npc_keeper`, and Vex's `vex`: **applied** (unchanged).
6. Keep Nox's three held lines word for word: **applied** ("Where you came from is not mine to tell. It's written somewhere I
   can't go.", "I'll say the name you'll need up there. Up there.", "...Ask me at the top." are unchanged; only the
   unrelated "A name like that is a door" became "A page like that is a door" with choice 10).
7. Keep `hooded_sage`, environments cell 7 and bosses cell 7 unused: **applied** (plan 9.0, unchanged).
8. Leave the hero's Ledger row unkept: **applied** (choice 11, unchanged).
9. Nox never says where the blanket came from: **applied, with new content.** The first ask said the cloth was Scriptorium
   book-cloth; with the novel it is the First Library's infirmary wool with a sealed linen tag (EPISODE8). No Episode 7 line
   changes and none mentions the tag.

---

## 7. Episode 7 by the numbers (for the writers)

About 31 beats and 36 registered scenes (27 main and chained, 7 side, 2 silent; keep Episode 7 under 40 built), 6 new
named townsfolk (Bryn, Eira, Sol, Maera, Torr, Mirael) plus Nox, Marten and the Keeper's mother in memory, one inn counter
(the North Watchkeeper), 3 side stories, 3 books (`keeper_book`, `missing_streets`, `keeper_charter`), 10 banners
(Palehaven's has two states, before and after `doors_reopened`), about 34 inspect lines (the Traveler's Wall, the gaps,
name stones held and not held, Sol's twine, the Waystation tally and post box, the Icegate, the Vanishing Mark before and
after, iced doors and open ones, the hearth cold and lit, the Keeper's notice, the face-down letters, the Northward Beacon,
the cathedral gate, frost brick, ice glass, frost doors, borrowed lamps, the letter wall, the Listening Bell frozen and
thawed, Mara's tag, the Keeper Charter, the round door, the Stillheart, the seventh list, the broken roof, the stair of
light). Party chat (Talk) needs a hint for each main step on each map, in the house style, naming the next action ("Read
Bo's stone, then Nyx's; the first path you held goes when you take a third"), and must name something doable after
`ep7_complete` (the Hearth, the Reliquary, Torr's streets, Snowrest on the chart). Seven close-up page kinds (plan 9.4).

---

## 8. Canon reconciliation (root game to NEXT)

**Kept from the root game.** The Hollow North and "The Vanishing World"; Keeper Nox, the companion the chapter turns on,
her grief and her sealing of the Vault; Palehaven, "The Thawing Hearth" (as the restored inn sign and the hearth's line),
"Blue-ice ramparts shelter a little settlement. Aurora crystals warm the square as snow drifts over an ancient watch
road." (the town's look), the Thawlight Lodge, Northwind Provisions, the Glass-Ice Armory, the Keeper's Watch Notice (as
the Keeper's notice and her house), the South Icegate (the White Road's top), the Vanishing Mark ("A hollow space between
carved runes grows whenever a person's name is forgotten.") and the Northward Beacon ("This beacon stood before snow had a
name. Each returning traveler adds one shard of glass."), and the after-clear title "Palehaven - The Returned Names"; the
witnesses Mirael (Winter Physician), Oren's testimony (through Sol, below) and Eira (Last Lantern Keeper) and their lines;
the Hearth of Returning Names, its three testimonies and its rewards (potions, ethers, +20 Focus as +20 Fury); the
townsfolk Bryn, Eira, Sol, Maera and Torr and their lines; the Frostbound Vault's three floors and their names (I The
Vanishing Steps, II The Hall of Borrowed Light, III The Stillheart Sanctum); the Stillheart Crystal Key on F1's northern
balcony and the Stillheart Crystal Keyhole; the Thawlight Recovery Basin (the fonts) and the Winterwatch Provision Cache (a
chest's name); the Keeper Emergency Reliquary and its three witness pages (Open the Door, Share the Flame, Call the Lost);
the Keeper Charter's words ("The true keeper must SHELTER the living, REMEMBER the absent, and RETURN when a lost voice
calls.") as an inscription and a book; the winter tile vocabulary (`icewall`, `frostbrick`, `icepath`, `iceglass`,
`icebridge`, `permafrost`, `icebrick`, `frostmosaic`) and decor (`crystal`, `auroraobelisk`, `frostfire`, `snowpine`); two of
Nox's three memories by title ("A Gate Kept Open", "The Name Left Outside") and her mother's canon line "The light exists so
others can return."; the White Phantom (name, look from bosses cell 6), armored and weak to fire in its first phase ("Fire
cracks its outer frost."), the Frozen Ward under 68% with the two memory shadows, the Closed Gate and the Lost Letter (the
Letter weak to piercing and resisting ice, canon), reduced damage and a 33% floor, Thawlight (the ward drops, armor falls,
fire exposed, +25 Focus as +25 Fury) and the Stillheart Blizzard's charged attacks; the brother's final letter, word for
word: "Do not freeze my life into a single farewell. Open the door for those who follow."; the chapter ending "The Doors
Reopen" (Nox reads her brother's letter aloud, the roads return) and the region ending "A staircase of written light leads
into the First Library itself."; the First Library's demand "that the North forget every soul who could still speak the
First Keeper's true name" (as the seventh list, re-aimed from a name to a page: "Changed" below); the root enemy names Frostbound
Revenant, Hollow Ice Knight and Pale Lantern Shade; environments cell 6 (frozen cathedral and pine forest, cold aurora and
snow, luminous icy pale blue) for the Vault, the backdrops and the key art; the Runway scene briefs chapter-7 and boss-7
(the frozen cathedral, sparse snow, a soft aurora; the Phantom's antler crown and ragged cloak in the snowfall) as staging
briefs for the code-drawn scenes; the region-7 Suno brief (warm solo cello, sparse piano, glass bells, airy sustained
strings, quiet snow and aurora with melancholy hope, 72 BPM) as the town theme's brief for the in-repo tracker; the root
interior titles North Watchkeeper, Ice Provisioner and Iceglass Smith; the LEGACY Vex scene "The Name Under Ice" and its
line "Now you understand why I keep moving."; the LEGACY Snowrest record (Asta the Scout, Bo the Lampmaker, Grandmother
Nyx, "The families remembered one another through the long silent winter.") as the names on the White Road's stones and
the village that comes back on the chart.

**Changed, with reasons.**
- **Word and order puzzles are gone** (DESIGN hard rule 2; Episodes 3 to 6 did the same). F1's three sun beacons cycling
  OFF, SUNRISE, NOON, DUSK with a printed answer diagram, Oren's testimony that names the settings, F2's light lenses
  cycling DARK, RECEIVE, REFLECT with a refraction record, the Frostbound Names Crossword, the witness pages read in order
  (a wrong one resets), and F3's three promises spoken in order are all replaced: the floors open by name stones (plan
  5.1), the witness pages are found in any order, and the promises are an inscription the Keeper says at the round door,
  never an answer to get right.
- **Black frost damage is gone** (no damage tiles: phone players). The fade (forgotten paths) is void, never a hurting
  floor. The Hearth's canon reward "black frost damage from 9 HP to 2 HP" becomes a rest point and the Fury bonus.
- **Corin becomes Marten.** Canon Nox's brother is Corin; NEXT already ships a Corin (the Hollowmere watchman at the west
  gate, `src/data/npcs.js`, Ledger row `corin`, Episode 2). Two Corins would read as one man. Marten is new and grepped
  free. Everything canon says about the brother is kept: he came home, the Phantom locked his name away to spare her, and
  his final letter's words.
- **The brother is Tess's father** (inference). Canon Nox's brother "did come home" up a winter road; NEXT's Tess's father
  was Willowmere's courier, "carried the post north", went "north, by the White Road", and "never came back", and his
  signature was "eaten through years before any of this" (EPISODE1, EPISODE2). One man, told twice; here, one family, the
  way Episode 6 joined Liora and Pippa.
- **Oren the Crystal Surveyor's testimony goes to Sol.** NEXT ships Oren the Willowmere baker (Episode 1, Ledger row
  `oren`). The first sentence of canon Oren's testimony is kept, spoken by canon Sol the Trail Scout; the second sentence
  ("Their true light follows Sunrise, Noon, Dusk.") was a puzzle answer and is dropped with the beacons.
- **The two Eiras are one.** Canon has Eira the Last Lantern Keeper (a witness) and Eira the Glassblower (townsfolk). Here
  she is one person: she blows the lantern glass and keeps the last lantern. Both sets of lines are hers.
- **"Nox" is held out of canon lines until `nox_named`.** Mirael's, Eira's, Bryn's and Torr's canon lines name Nox. In NEXT
  the Keeper's name is the episode's payoff, so before `whole_page` those lines read "the Keeper" (one word changed each) and
  after it they read word for word as canon. The town getting her name back is part of what the player sees.
- **"The Winter Nox Could Not End" becomes "The Winter She Could Not End".** The memory title would say her name two scenes
  before its payoff. The memory itself is re-aimed: canon has Corin's final letter read here; NEXT shows the bell ringing
  his name and Nox stopping it (the root's "refusal to acknowledge people who have left or died" made into a picture), and
  the letter is read in `doors_reopen`, where canon reads it.
- **Memory 2 is re-aimed.** Canon "The Name Left Outside" has Nox find a letter showing Corin "did come home". Here the ice
  replays him coming home, on the road he carried the hero down, so the player sees who carried the hero before anyone
  reads his name.
- **The Phantom's phases become three.** Canon has four (Outer Frost, Frozen Ward, Thawlight, Stillheart Blizzard below
  28%). The Blizzard folds into Thawlight as its charged move, with Haste (Episodes 4 to 6 did the same).
- **The Nox Thawlight Oath** (an opening two-turn Aegis, +35 Focus, one automatic interruption of a blizzard charge) is not
  a bond: NEXT has no bond system and the guest does not fight. Nox's gift is the truth path's Open Gate or the kind path's
  Kept Lamp (plan 7.3), and the boss's answer is the hero's Call (from the canon witness title "Call the Lost").
- **The reward "First Key" is dropped.** Root's region record gives a First Key; NEXT's pattern is that every boss guards a
  fragment and the way on is shown, not unlocked (the staircase of light opens by itself in `ep7_ending`). Episode 8 may
  use a key if it wants one.
- **The witness records and the keeper promises keep their words, not their order.** "Open the Door", "Share the Flame",
  "Call the Lost" are page titles found in any order; "Shelter, Remember, Return" are the Keeper Charter, said once.
- **The Pale Lantern is new.** Root Chapter VII has no mini-boss; NEXT episodes have one on the middle floor. It grows from
  the canon ordinary foe "Pale Lantern Shade" and the canon floor name "The Hall of Borrowed Light", so the floor's keeper
  is the floor's own idea.
- **The seventh list names a page, not a name** (revised 2026-11-11, choice 10: Scott asked for the novel's answer).
  Root canon's ending says the memory crystals hold "the oldest order yet: the First Library demanded that the North forget
  every soul who could still speak the First Keeper's true name". The first proposal kept those words. The novel (section
  "Novel canon" below) puts the beginning of all the erasing on one night and one page, so the list now reads THE NORTH.
  LET IT FORGET EVERY SOUL WHO CAN STILL READ THE FIRST ERASED PAGE, and is dated sixteen years ago, the spring the hero came
  north. It is no longer the oldest list (Emberpeak's and the desert's are older, Episodes 3 and 5), so root's "oldest
  order yet" and Mira's old "older than Emberpeak's" are dropped; the list is the odd one instead, the only one that names
  a page. The words "First Keeper" no longer appear in Episode 7. The player already knows the lists come from the First
  Library (Episode 2 section 5), so nothing is lost, and who writes them, and what the page is, stay Episode 8's.
- **Vex's withheld name is his own** (inference, LEGACY). Episode 4's "There's a name on it I'm not ready to hand anyone"
  (Mira: "Yours?" Vex smiles.) and LEGACY "Vex carves his own name into the frozen road, then watches half the letters
  disappear." are one beat: his name is on Valewyn's list and has been half taken for twelve years. No new name is invented
  for him: the name that comes back whole is the one he has always used.
- **Mara and the bell** (inference). Episode 3 seeded "She tuned every bell on this mountain. And one down in your valley,
  once." Here the valley bell is Willowmere's thirteenth (Episode 1) and its twin is in the North. Basis: the thirteenth
  bell "rings whenever a name is taken" (Episode 1), canon Palehaven's watchfires "turn pale blue when a page vanishes from
  the map", and Nox's canon refusal to hear of loss. The date ("the year before the fire") is said; the link to the fire is
  not.
- **Nox is the warm hand** (inference). Basis: six episodes in which nobody can name the hand; Episode 6's "The other half
  went north with whoever wrote it"; canon Torr's "Keeper Nox taught me to press names into iceglass" (she teaches
  letters, as the warm hand taught Ishra); the seventh list against anyone who "can still read the first erased page"
  (why her own name would be taken: she could; Episode 8 says how); canon Nox's grief and her sealing (why the page half is in the Vault).
- **Nox was the Court's forgotten Keeper** (inference, open choice 5). Episode 2's empty portrait and Episodes 2 to 6's
  "the Court's forgotten Keeper" point at a Keeper whose name is gone; a Keeper with no name is what Nox is. One line only
  ("I kept a house of mirrors once. I left my face there.") in `keeper_and_vex`, cut if Scott or Stephen prefer the Court's
  Keeper to stay someone else.
- **The Snowrest names** (LEGACY) are the names on the White Road's stones and Snowrest the village that comes back onto
  Aeris's chart. The LEGACY quest structure (light every road beacon, keep the final lantern burning) is not used.
- **The White Road** is NEXT's (Episode 2's "Then north, by the White Road"); the root has an "ancient watch road" and the
  "South Icegate · World Road". Here the White Road is the watch road, and the Icegate is its top.
- **Courses held, names called.** Episode 6's Anchor holds the party through a Gust; Episode 7's Call is aimed at one ally.
  The two signature skills differ in their menu path (Anchor `target: 'none'`, Call one ally, including a Stilled one),
  which is why the plan's real-menu test matters (plan 12).
- **The region index.** The root code calls this region index 6 (`s.region===6`), its Suno brief "region-7". NEXT calls it
  Episode 7; nothing in NEXT depends on the root index.
- **Inference:** the White Phantom is a Keeper construct (the Warden of the Stillheart) and the seventh fragment is pressed
  into ice. Basis: bosses cell 6 (a spectral sentinel), canon "The White Phantom guards the forgotten names", canon "Keeper
  Nox taught me to press names into iceglass", Episode 1's division of the Book, and the Moth to Scribe pattern.
- **New:** the fading chart; the Traveler's Wall; the Rime battle rule and Call; name stones and the fade; the whiteout;
  the Courier's Waystation and its crossed sevens; the Listening Bell and Mara's tag; the Pale Lantern; the Keeper's turn
  in the Sanctum; the Phantom that cannot bid the hero farewell; the seventh list as the first; the whole page and its three
  steps; the restored address; Torr's Missing Streets; the stair of written light as the Episode 8 hook.

**Novel canon (The Thirteenth Bell, Book One).** Added 2026-11-11 at Scott's asking. The novel is Scott's and Stephen's and
is unpublished; this repo is public. So these are used as facts and motifs only: no line of the game quotes the book, and no
book wording appears beyond a few short terms. Episode 7 uses only what it needs to point at Episode 8, and pays none of it:
- **A name is a promise, and a Keeper never erases a soul** (the Keepers' oath in the novel). The game already says the
  first half on its cold-open card ("In Aethelgard, every name is a promise."). Episode 7 adds the oath in the game's own
  words as an inscription over Nox's door in the Keeper's Watch (an inspect line, `ep7_watch_oath`: "A NAME IS A PROMISE.
  A KEEPER ERASES NO SOUL."), which Nox has broken in spirit by freezing the North's grief. Stephen may reword it.
- **There was a first erased page, and what it began has spread from book to book** (the novel's stain, which keeps spreading
  from one book into others). Episode 7 names only the page, on the seventh list, and lets Nox say she can
  still read it. It never says where the page is, what was on it, or what spread.
- **The foundling came in spring.** The novel's hero is found in spring. Here the North's list comes "the spring you did".
- **Held for Episode 8, and absent from Episode 7 on purpose:** the fire in the First Library's lantern-oil vaults on the
  night of the hero's birth; the Concordance (the book every entry in the Library passes through) and the old Keeper who
  held its key; the three warnings and the cause rewritten as "nobody's doing"; the ink that would not lie still and ran
  from the sworn page into a birth entry; the infirmary blanket of fine grey Library wool and its linen tag with the
  cracked-key seal (EPISODE8 ask 9: Nox still never says where the blanket came from); the hero's mother, Elowen, Keeper of
  the Scriptorium; and the bell's oldest rule, "Keep one."
- **Where the novel and the shipped game differ** (listed, not changed: Episodes 1 to 6 stand as shipped): EPISODE8 section
  8, "Novel canon", keeps the full list, since most of the differences land there.

**Root canon this bible could not reconcile, and leaves open.**
- **The root's after-clear dialogue** has Nox say "I kept every door closed because I could not endure another farewell.
  Palehaven has opened the gates. The last truth lies in the First Library." and the region record's `talk` says "The Eraser
  has nearly reached the First Library. Only the names you recovered can hold reality together." The first is kept in
  spirit across `doors_reopen`; the second names the Eraser, which Episode 8 holds, and is not used. Nox's canon line is
  said word for word by Episode 8's first scene (EPISODE8 ask 2), so Episode 7's post-credits Talk does not use it (choice
  19).
- **The root cinematics `assets/cinematics/chapter-7.mp4` and `boss-7.mp4` exist** (Fact: both files are in the repo root's
  `assets/cinematics/`) but neither is named in `RUNWAY_PROVENANCE.json` (Fact: grepped 2026-11-10). The build does not use
  them; whether they may be used in a game that may be sold is Scott's call (plan 9.5).
- **Timeline.** Root canon never dates the North's lists or the hero's birth. The dates here are fitted to Episodes 2 to 6's
  dates and Vex's "fourteen": Nox made Keeper and the Listening Bell tuned twenty-six years ago, the North's list and the
  hero's coming sixteen, Marten's death fifteen, Valewyn's list twelve. They make Vex about thirty and the hero about
  sixteen, neither of which is ever said on screen (the novel's hero is seventeen; the novel canon note below).

**Name collisions to respect.** Episode 1 owns `oren`, `tess`, `hazel`; Episode 2 owns `corin`, `vow_*`, `testimony_*` for
the Hollow witnesses, `vex_mirror`, `black_feather*`, `rook`; Episode 3 owns the map prefix `pk_`, every `foundry_` and
`sand_` id, `oath_*`, `mara_*`, `bell_gate*`; Episode 4 owns every `ep4_` id, `principle_*`, `answer`, `mooring_post` (an
`ep4_tiles.json` object, which Episode 6 collided with), `regent_*`; Episode 5 owns every `ep5_` id, `sky_*`, `landing_*`,
`sel_memory_*`, `waystone` (an `ep5_tiles.json` object); Episode 6 owns every `ep6_` id, `kestrel` and `signal_lamp`
(`ep6_tiles.json` objects, reused here, never redefined), `pledge_*`, `aeris_memory_*`, `anchor_line`, `gale*`,
`rewrite_*`; X1 owns `star_*`, `orrery*`; Fine Print owns `countersign`, `witness_seal`, `codicil`, `errata`, `marginalia`,
`strikethrough`. Core sfx `bell_thirteenth`, `bell_toll`, `ice`, `stone_name` and the core tile `hearth` exist (reuse
`bell_thirteenth` for the Listening Bell, never redefine any). Episode 7 uses: map ids `ep7_*`, encounter prefixes `e7w_`,
`e7v1_`, `e7v2_`, `e7v3_`, `testimony_mirael`, `testimony_sol`, `testimony_eira`, `keeper_memory_*`, `name_under_ice`, the
skill `call_name` (never bare `call`: a debug key in `src/core/debug.js`), the map block `remember` (never `held`: an input
field in `src/core/input.js`), the event type `namestone` (never `waystone`), the boss moves `farewell`, `borrowed_light`,
`stillheart_blizzard`, `shut`, `mend`. Full registry: plan section 2 (grepped 2026-11-10 against `src/`, every
`assets/tiles/*.json` and every `assets/*manifest.json`).

---

## 9. Build notes

Reserved for E7-story (wave 7a): what the built script does beyond the beat sheet (deltas only, as EPISODE6 section 9).

Built by E7-story, 2026-11-12 (`src/data/ep7/{flags,npcs,quests,text,story,ledger}.js`, staging in
`docs/story/STAGING_EP7.md`, tests `qa/content/ep7_story.test.mjs` and `ep7_data.test.mjs`). 36 scenes registered (27 main
and chained, 7 side, 2 silent), main path 194 boxes (`ep7_morning` 6, `name_under_ice` 12, `whiteout` 8, `listening_bell`
11, `phantom_after` 16, `whole_page` 15, `doors_reopen` 14). Deltas from section 1:

- **Two scene ids renamed.** Plan 2.5's `road_landing` and `reliquary` are Episode 5 scenes; Episode 7's are `ep7_landing`
  and `ep7_reliquary` (the Reliquary object's script is `ep7_reliquary`).
- **Two stone names changed.** Plan 4.7's `ns_hob` and 4.8's `ns_ansel` are `ns_hakon` and `ns_anders`: Hob is
  Willowmere's innkeeper and Ansel one of Episode 1's lost pilgrims. F1 C's two stones are `ns_sigrid` and `ns_vidar`; F3's
  are `ns_ylva`, `ns_greta`, `ns_lars`, `ns_anders`, `ns_ida` and the hidden `ns_solveig`. Every float line is "NAME. The
  road (or Vault) remembers her (or him)."
- **The opening warps.** `ep7_morning` plays only in the Chart Room on `charts_dawn`; from the inn it fades out and warps
  there, and the room's own enter trigger (`ep7_wake_charts`, asked of E7-maps-a's patch) runs it, as Episode 6's tower
  opening does. Five boxes, six when it gives the White Road letter. The chart opens on Aeris's "Look fast."
- **The flight** is the first box of `ep7_landing`; `ep7_board` is the bible's two lines and does not move the party.
- **Vex** is the spawn `vex_k` (Episode 2 owns `vex` for the in-glass image), kneeling (`npc_vex_kneel`) at the wall and
  on the gate step. He walks on ahead after the wall and comes back in at the Watch, the gate, the hearth and the roof.
- **The Keeper's square record** goes into the Watch at the end of `meet_keeper` and is back by her lamp on a reload; it
  stands down from `keeper_came`. From `nox_named` she is the record `nox_t` in the Watch, by her stove, where the credits
  wake the party. In scenes she is the spawn `keeper_t` until the swap.
- **`keeper_and_vex`** opens on the room (no narration box) to stay at 12; every bible line is kept.
- **`keeper_comes`** opens the round door from the second landing: she goes on ahead and waits by it, the camera pans up,
  and the door opens (`stillheart_open`), so the party still crosses the Return landing to reach it.
- **The Phantom answers each choice** with one new line ("WHAT IS LET GO IS LOST. I LOSE NO ONE." / "NOTHING COMES BACK.
  THAT IS WHY I KEEP IT."). The Lantern's and the Phantom's intros say their arc lines.
- **`whole_page`**: Marten is named by the `joined` line itself, then Bram says it; Mira's "Nox." is the last line over the
  page (`signed`); the page closes and `keeper_t` becomes `nox_t` on the same mark.
- **`doors_reopen`**: Vex runs in (`vex_run` to `vex_square`) for the carving; the gift is given before Nox's last line.
- **The Reliquary** opens with the three witness pages (it takes them); without them, Bram's line and nothing else.
- **New flags** `lantern_tried`, `phantom_tried` (a retried boss intro is the pan, Mira's tip and the card).
- **Pack helpers** asked of E7-scene-ui: `s.frostBlot(who)`, `s.frostNames(ids, level)`, `s.actorAlpha(id, alpha,
  frames)`; without them the blot is a plain "..." box and the whiteout is the tint alone. Same boxes either way.
- **Talk.** While `EP7_LIVE`, an Episode 6 finisher hears "the Chart Room, then the north dock", every older hint on
  Zephyr Landing's maps waits until the party boards, and Episode 6's last journal step names the inn and the dock. The
  wall choice changes one banter line on the White Road. Returning-cast guards drop variants that need an Episode 1 to 6
  flag unset (no Episode 7 save lacks them), which keeps Tess's six old scenes in front of her new lines.
- **Ledger.** Nox's and Marten's rows are hidden until their names are read; Vex's row (choice 21) is place "The Road",
  reached at `vex_carved`. No Episode 7 line uses the word "ledger" (Scott, 2026-11-11: one meaning).
- **Handoffs nobody owns yet:** the Court's empty portrait needs a `court_f2` pack patch to show `ep7_court_portrait` after
  `nox_named`; the Banner list has 10 (the Stillheart has none: its scenes open on the boss card and the night roof).

---

## 10. Choices that are Scott's or Stephen's

None of these blocks the build; the default is what the build agents use. Each is one line of why. **Scott answered on
2026-11-11: "just use the defaults."** Each choice below carries that decision. Choice 10 is revised toward the novel at his
asking ("take a look at the 13th Bell book and see what you want to use"); choices 16, 19 and 22 to 24 record what this
revision changed or added, and are defaults pending Stephen. **The story is joint: Stephen may still change any of them**, and
his change wins over a default.

1. **Whose episode: the hero's, with Nox as a non-fighting guest in the Sanctum and Vex as a non-fighting guest on the
   road.** [default: yes] **[Scott 2026-11-11: default]** The rotation (Mira, Bram, hero, Mira, Bram) comes back to the
   hero, Episode 6 kept the hero's beginning for here, and guests avoid the fourth party slot the engine cannot pay for.
2. **Aeris flies them north on the Kestrel, waits at the landing, and carries the letters south.** [default: yes]
   **[Scott 2026-11-11: default]** It is one cut, no new airship art, and it gives the ending a way to reach Tess without a
   trip to Willowmere.
3. **Vex rides the fourth seat and walks the White Road with them; he waits on the Vault's step and never fights.**
   [default: yes] **[Scott 2026-11-11: default]** The LEGACY "Name Under Ice" needs him on the road, and Episode 6 ended
   with him in the fourth seat.
4. **The warm hand is the Keeper of the Hollow North, and her lost name, restored at the hearth, is Nox.** [default: yes]
   **[Scott 2026-11-11: default]** It pays six episodes of "who wrote Keep this one", keeps root canon's name exactly, and
   makes the name itself the payoff.
5. **Nox was the Court's forgotten Keeper (one line; the empty portrait fills after the credits).** [default: yes, one
   line] **[Scott 2026-11-11: default]** It closes Episode 2's thread with almost no cost; cut the line to keep the Court's
   Keeper a separate person.
6. **Tess's father is Nox's brother, the courier who carried the hero down the White Road; he died on the road years ago,
   never shown.** [default: as written] **[Scott 2026-11-11: default, confirmed in words: "Tessa's father being dead is
   fine."]** It joins three canon threads into one family and gives Tess a name, not a reunion; the alternative (he is
   alive, frozen in the Vault) repeats Episode 6's Pippa.
7. **The brother's name is Marten** (root Corin, renamed for the Hollowmere Corin). [default: Marten] **[Scott 2026-11-11:
   default]** Any free name works; "Marten" is short, northern and grepped free.
8. **Mara tuned the North's Listening Bell to Willowmere's thirteenth bell at the Keeper's asking, the year before the
   fire; the link to the fire is never said.** [default: yes] **[Scott 2026-11-11: default]** It answers "one down in your
   valley, once" with a picture and gives Bram a beat without a third center. ("The fire" here is Emberpeak's, as in
   Episodes 1 and 3; the novel's fire is another one, and Episode 8 never calls it plain "the fire": EPISODE8 section 8.)
9. **Vex's withheld name is his own: he carves it in the first minutes, hands over the Valewyn list with it on top, and the
   road gives it back whole at the end. No new name is invented.** [default: yes] **[Scott 2026-11-11: default]** It pays
   Episode 4 and the LEGACY scene with what the player already knows.
10. **The seventh list names a page: THE NORTH. LET IT FORGET EVERY SOUL WHO CAN STILL READ THE FIRST ERASED PAGE. It is
    sixteen years old, it came "the spring you did", and Nox can still read the page and will not until the Library.**
    [revised 2026-11-11; was: the seventh list is the first list, twenty-six years old, and names "the First Keeper's
    name"] **[Scott 2026-11-11: "Maybe you take a look at the 13th Bell book and see what you want to use for that
    there."]** The novel starts the erasing on one night and one page, so what the North was made to forget is whoever could
    still read that page. It keeps every other default: Nox is still the warm hand who lost her name for what she knows,
    still holds it for "up there", and her three held lines stand word for word. It pays nothing early: no fire, no
    Concordance, no seal, no mother, and the words "First Keeper" are out of Episode 7. Episode 8 (proposal, section 0.1) is
    written against this version. The old alternative (THE HAND THAT WROTE THE FIRST PAGE) is retired.
11. **The first page is whole and Nox gives it to Vex to keep; the hero's Ledger row stays unkept.** [default: as written]
    **[Scott 2026-11-11: default]** The LEGACY Episode 8 scene stays possible word for word and the hero's own keep is still
    saved for the last episode (EPISODE8 ask 8).
12. **Truth choices: two, Vex at the wall ("What's left?", one line later) and Nox in the Sanctum ("Do you remember?", one
    line and her gift).** [default: two, small and honest] **[Scott 2026-11-11: default]** RESPONSIBILITY_ARC decision D;
    Episode 6's two landed.
13. **The name stones carry real names (the LEGACY Snowrest names) as flavor, never as answers.** [default: names, flavor
    only] **[Scott 2026-11-11: default]** DESIGN hard rule 2 bans name puzzles; a stone is read by confirm and the puzzle is
    which two paths, seen on the floor. If Scott or Stephen read the rule more strictly, the stones become plain lamp cairns
    with no names.
14. **Vex's line at the stair: "I know where that goes. I mended bindings there."** [default: this line] **[Scott
    2026-11-11: default]** It points Vex at the First Library for Episode 8 without saying who writes the lists; cut it to
    keep his past wholly for Episode 8.
15. **The hero is heard twice (the whiteout, the battle), always shown, never a speech box.** [default: yes] **[Scott
    2026-11-11: default]** The hero stays silent in every box; Call is a sound and a picture.
16. **Cards.** Episode 7's title card stays as Episode 6 shipped it ("Episode 7: The Vanishing World / The other half of
    the page lies north."); the end title is "End of Episode 7 / The Vanishing World" (the root title); the Episode 8 card is
    **"Episode 8: The Last Word / The lists were written here."** [default: placeholder, now filled] **[Scott 2026-11-11:
    default; the Episode 8 title is EPISODE8 ask 1, the root region title, pending Stephen]** All within 42 characters and
    naming only canon places.
17. **Fine Print and Episode 7.** A Fine Print run does not enter Episode 7 (`ep7_morning` needs `not tier_1`). [default:
    base game only] **[Scott 2026-11-11: default]** The same call as Episode 4 decision 6, Episode 5 decision 11 and
    Episode 6 decision 13.
18. **Nox has no portrait, and there is no paid art or music** unless Scott approves the optional items (plan 9.5: one
    Runway still for Nox, one for a painted Stillheart, one Suno track; the root cinematics only with their provenance).
    [default: none; the build ships without them] **[Scott 2026-11-11: default]** Scott's accounts need his own go, and he
    makes those generations himself.
19. **Renames and drops for canon conflicts:** Corin to Marten, Oren's testimony to Sol, the two Eiras as one, "Nox" held out
    of canon lines until her name returns, "The Winter Nox Could Not End" retitled, four phases to three, no frost damage, no
    beacons, lenses, crossword, ordered pages or recited promises, the Thawlight Oath bond into a gift and Call, the First
    Key dropped, the root's Eraser line unused, and the root's Nox after-clear line not used anywhere in Episode 7 (Episode
    8's first scene says it word for word: EPISODE8 ask 2). [default: as listed] **[Scott 2026-11-11: default]** Each follows
    a hard rule, an id collision or a payoff's order (section 8).
20. **Shipping.** Episode 7 is built behind `EP7_LIVE` on a build branch; E7-integrate flips it on the branch only after the
    full gate list. Shipping to players stays Scott's or Stephen's explicit word. **[Scott 2026-11-11: default]**
21. **A Ledger row for Vex** (place "The Road", kept on `vex_name_whole`: "His own name, whole in the ice."). [default:
    yes] **[Scott 2026-11-11: default]** The Ledger has no Vex row today (Fact, `src/data/ledger.js` and the pack ledgers);
    if he was kept out on purpose, drop it.
22. **The opening room is the Chart Room, not the inn** (new 2026-11-11, from Scott's "open them in a different room"). The
    Episode 6 save still wakes in the Cloudhouse Inn (shipped, unchanged); `ep7_morning` moves the party to the Chart Room
    before its first fade-in, re-dressed for the North by a pack patch. [default: the Chart Room; pending Stephen] It reuses a
    shipped map, fits a scene about a chart, and costs only a patch. The alternative, the Kestrel's cabin already in flight,
    needs a new interior and cuts the walk to the dock.
23. **The credits wake in the Keeper's Watch, not the Thawlight Lodge** (new 2026-11-11), so Episode 8 opens in a room no
    episode has opened in. [default: the Watch, mark `watch_cot`; pending Stephen] The Lodge stays an inn.
24. **Bosses are tougher, not longer** (new 2026-11-11, Scott: "tougher, not necessarily longer"). The Lantern and the
    Phantom keep Episode 6's rounds bands at most and take more of the party's HP doing it (plan 6.4 to 6.6). [default: as
    the plan; pending Stephen] The win line stays careful 85%+, so it is harder without being a wall.

**A direction to keep open, not a choice here.** Scott, 2026-11-11: "Each episode really just expands the world map",
places revisitable, travel around, "like Final Fantasy". A separate world-map proposal is coming. Episode 7 already keeps its
places reachable after the credits (the Kestrel's berth, the White Road both ways, Palehaven's gates, the Vault's two-way
lifts: plan 3 and 5.4) and adds nothing that would need undoing for an overworld.
