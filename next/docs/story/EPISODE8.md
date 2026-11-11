# Episode 8: The Last Word

Story bible for Lexicon Quest NEXT, Episode 8: the Stair of Written Light, the Scriptorium, the First Library, the Eraser,
and the end of the main story. Written by ep8-designer, Tuesday 2026-11-10, late night (Eastern), as a design proposal on
branch `scott/ep8-design` (issue #68). **Status: PROPOSAL. Nothing here is built.** The story is joint between Scott and
Stephen: every line, name and choice below is theirs to change, line by line. The production side (ids, maps, pop-up books,
Erasure, loot, music, assets, save rules, the waves and the agent briefs) is in `docs/EPISODE8_PLAN.md`. When built,
everything of Episode 8 lives in the lazy `ep8` pack: the script in `src/data/ep8/story.js`, NPCs in `src/data/ep8/npcs.js`,
quests and party chat in `src/data/ep8/quests.js`, lore, books, banners and inspect lines in `src/data/ep8/text.js`, and the
staging guide in `docs/story/STAGING_EP8.md` (written by E8-story, the shape of `STAGING_EP7.md`). Nothing of it goes into
the core files except the five seams of plan section 13.2.

**Read this first: Episode 8 stands on a proposal.** Episode 7 is itself only a proposal (PR #65: 21 open choices with
defaults, not yet agreed by Scott and Stephen, nothing built). Episode 8 assumes **every Episode 7 default**. Section 0 says
which ones it leans on, what changes in Episode 8 if Scott and Stephen pick an alternative, and what Episode 8 asks of
Episode 7. The two that matter most are Episode 7 choice 6 (Tess's father, Marten, is dead) and choice 10 (the seventh list
names "the First Keeper's name", and Nox holds it for the Library). Episode 8 builds only after Episode 7 is built and
merged into `overhaul` (it patches two Episode 7 maps and awaits the `ep7` pack).

**Sources.** `EPISODE1.md` sections 1, 3 and 5 (the cold open, Hazel, the blanket, the century-old order, the last Keeper who
refused), `EPISODE2.md` section 5 (the seal of the empty book, the name written twice), `EPISODE3.md` section 5 (the
counter-seal), `EPISODE5.md` sections 5 and 9 (the mural of seven wandering stars and an eighth with no sign), `EPISODE6.md`
sections 5 and 6 (the sky's list, THE FIRST PAGE. LET NOTHING REACH THE SHELF.), `EPISODE7.md` sections 5, 6 and 10
(everything kept for Episode 8), `RESPONSIBILITY_ARC.md`, `LEDGER.md` (the hero's row, "Not yet kept."), `VOWS.md`,
`TIER.md`, `story/DEEP_STACKS.md`, `CRITIQUE_8.md`, `PLAYTEST_REVIEW_8.md`, and the root game's Chapter VIII:
`CHAPTER_VIII_MILESTONE.md`, `rpg-chapter8.js` (the three floors and their names and flavor text, the Original Ink Key on the
northern shelf, the Restoring Fountain of Names, the Forgotten Traveler Satchel, the Archive of Uncensored Lives, the
evidence pages The Names, The Order and The Correction, the Charter of the Living Lexicon, the promises SEE, SHELTER and
CHOOSE, the enemy names Catalog Wraith, The Unnamed Sentry and Inkbound Librarian, the Original Ink Keyhole),
`rpg-data.js` line 118 (the region record: "FIRST LIBRARY", "The Last Word", "The First Keeper", "At the center of existence
stands a library whose pages contain every possible name.", "The Eraser was once the First Keeper. He believes forgetting is
mercy. Show him why the world deserves to remember.", the boss THE ERASER, the reward Living Lexicon, the ending), and
`rpg-engine.js` (the witnesses Ione, Tamsin and Fen and their lines, the Living Concordance and its rewards, the First
Keeper's three memories, the Eraser's four phases with the Rejected Truths Grief and Change, the permanent final choice and
its epilogue, the First Keeper's after-clear line, Nox's after-clear line), `rpg-regions-ii.js` (the Scriptorium, "The
final inhabited street is built of marble pages and ink-dark canals. Book towers stand where houses should be.", the Keeper's
Quiet Rooms, Bibliotheca Supplies, the Glyphsmith Atelier, the First Library Index, the South Margin, the Living Codex),
`rpg-townsfolk.js` (Iona, Quinn, Sorel, Arun, Meya), `rpg-interiors.js` (the Scriptorium Host, the Archive Keeper, the
Glyphsmith), `ART_PROMPTS.json` (environments cell 7, bosses cell 7, portraits cell 7), `SUNO_TRACKS.json` (the region-8
brief), `RUNWAY_SCENES.md` (chapter-8, boss-8), and the older layer `game.js` (marked LEGACY where used: Vex's "The Last
Margin", the Eraser's BOSS_SCENES record, the final camp lines, Mira's and Bram's last companion lines, the Indexhaven
record with Sable the Binder, the Forbidden Appendix). Tags: **(canon)** comes from those files, **(new)** is invented here,
**(inference)** is a synthesis of canon fragments; every inference is listed in section 8. Where canon text holds an em dash
or a middle dot, this file renders it with a comma or a colon (the house rule) and says so.

**Logline.** At the top of a staircase of written light stands the First Library, and under it the Scriptorium, a street
where nothing new can be finished. The party climbs it with Nox to find who writes the lists, and finds a kind old librarian
who has given up his name, a bookbinder who once carried a baby to be written and never got it back, and a Keeper's
promise that the name the lists have hunted for a century is the hero's own. The hero, who has never said a word, answers
to it.

**Theme question.** Episode 6 asked "what do you hold on to?" Episode 7 asked "what do you keep of someone who is gone?"
Episode 8 asks **"what do you do with a name that hurts?"** The Eraser says: rub it out, and the hurt goes with it; an
empty page is a peaceful page. Nox, sixteen years ago, said: give it to a child, and let someone say it kindly every day.
Sable says: give a child a name even if it costs you the child. The game's answer is the canon sentence on the oldest page,
"No life can be stored without letting it change.", and the hero's answer, without a speech: they answer to it.

**Is this the finale?** Yes, by default (open choice 1, section 11 has the case): the root game has exactly eight regions,
and the eighth closes the campaign. Episode 8 ends the main story, rolls the whole game's credits, and leaves every road,
Fine Print, the Deep Stacks, the Ledger and the Vows open after the end.

**Target length.** First play **70 to 100 minutes, planned at 84** (the episodes before were 60 to 90, planned at 72 to 75).
The finale earns the extra twelve minutes in one place only: its ending (section 1, Act VI, about 11 minutes of scenes that
pay eight episodes). The playable part keeps Episode 7's density: 16 pop-up decisions on the main path (plan 4.10), 17
ordinary fights plus the scripted first, at most 12 boxes per main scene (eight set pieces excepted), about 215 boxes on the
main path. Planned minutes: Palehaven and the roof 4, the Stair 13, the Scriptorium 12, Library F1 11, F2 with the Sentry 13,
F3 with the name 11, the Eraser 9, the ending (the Library restored, the choice, the last page, the open street, home,
Hazel, the bell) 11. The credits (about 5 minutes) are not counted. Optional content adds 10 to 14. A timed top over 105
minutes takes Cut 1 (plan 14) before anyone is asked to cut story.

**Levels.** Episode 7 ends at Lv 31: the White Phantom met at Lv 30 with about 20,740 EXP when every fight is fought, +1,500
after it, about 22,240 at the credits (Inference from EPISODE7_PLAN 6.1, a plan, not yet built; E8-integrate records the
real arrival from an Episode 7 credits save). The Stair 31, the Scriptorium 31, Library F1 31 to 32, F2 32 to 33 (the
Unnamed Sentry at 32), F3 33, the Eraser fought at 33, Lv 34 after it. (`expForLevel`: 31 21,363, 32 22,986, 33 24,675, 34
26,431, 35 28,254; Fact, `src/data/party.js` run on 2026-11-10.)

**Whose episode.** **Mira's**, by the rotation (Episode 2 Mira, 3 Bram, 4 the hero, 5 Mira, 6 Bram, 7 the hero), with the
hero at the heart of its twist. Mira is the reader, and the finale turns on reading: she knows the cold hand on a kind old
man's reader's card, reads a child's rubbed-out page back in the square, and in the last fight reads her friends back
whenever the Eraser tries to unwrite them. She gets the episode's skill, **Read Aloud** (root canon's last promise for her is
SEE), and the boss's central decision. The hero gets the last two beats: answering to their name in the Eraser's last phase
(the hero's Episode 4 skill, Answer, comes back: root F3 "the Eraser has been waiting to hear an answer"), and turning the
final page. Bram gets SHELTER (his canon promise): the boy who knows Hazel's blanket on sight, and the one who stands in
front of Mira so her reading holds. **Nox** climbs with them as a non-fighting guest, as Episode 7 promised ("Ask me at the
top."), and says the name. **Vex** goes up ahead alone and arrives at the end with the page (LEGACY "The Last Margin"); he
never fights.

---

## 0. What Episode 8 depends on in Episode 7, and what it asks of it

### 0.1 Episode 7 defaults Episode 8 depends on

| Episode 7 open choice (its default) | How Episode 8 uses the default | If Scott and Stephen pick the alternative |
|---|---|---|
| **6. Tess's father is Marten, Nox's brother; he carried the hero down the White Road and died on the road, never shown** | Light use only. Memory 3 (`keeper_memory_c`) shows who carried the hero first, the First Keeper, down the stair to Nox; Mira's line "Before Nox. Before Marten." joins the chain; Tess's and Hazel's post-game lines say Marten's name as Episode 7 gave it; the credits' Willowmere card shows Tess at the doors of her route. | **He is alive** (frozen in the Vault, freed in Episode 7): Mira's line is unchanged; Marten stands beside Tess in the Willowmere post-game and at Hazel's door in `home` (one actor, two lines: "I carried you to that step. You came back up it on your own feet."); the credits card shows them together. No Episode 8 scene depends on his death. |
| **10. The seventh list is the first list and names "the First Keeper's name"; Nox can say it and holds it until the Library** | Load-bearing. `the_name` pays it: Nox says the First Keeper's name at the top of F3, and it is the hero's own. Nox lost her name twenty-six years ago because she could say it, and gave it to the child ten years later. | **The list reads LET THE NORTH FORGET THE HAND THAT WROTE THE FIRST PAGE** (the words "First Keeper" kept out of Episode 7): then Nox does not know the name. The Archivist **Ione** (canon "Archivist of True Names") reads it from the Index's first drawer in `the_name` (the scene's speaker moves to her; +2 boxes); Nox's line becomes "I named you for the hand that left you. I never knew whose name I was giving."; the First Keeper is introduced by Ione's testimony (root region talk, "The Eraser was once the First Keeper.") in Act III instead of by Nox in F1. The twist and every other scene stand. |
| 4. The warm hand is Nox's, and she wrote the hero's first page | Load-bearing: Nox named the hero, gave them the First Keeper's name on purpose, and wrote "Keep this one." in every fragment. | The naming lines of `keeper_memory_c` and `the_name` move to whoever the warm hand is. |
| 11. The first page is whole and Vex keeps it; the hero's Ledger row stays unkept | Load-bearing: Vex arrives at the Last Word carrying the whole page (LEGACY "The Last Margin", word for word), and the hero's row is kept here (`hero_kept`). | **The hero keeps the page in Episode 7**: Vex's LEGACY line moves into Episode 7's `whole_page` (he says it as he hands his half over), and in Episode 8 he arrives with nothing in his hands ("I gave it back already. I came to see what you'd do with it."). |
| 14. Vex: "I know where that goes. I mended bindings there." | Vex worked for the Index as a boy: "Mended your bindings for two years. You never said your name." | Cut: Episode 6's "I mended bindings for the people who write the lists" carries the line alone. |
| 1, 3. Nox and Vex are non-fighting guests | Kept: no fourth party slot. | Unaffected unless one of them fights in Episode 7; then they fight here on the same rule. |
| 2. Aeris flies them | Aeris waits on the Stillheart roof and flies them home. | The home cut becomes a walk down the White Road (one narration box). |
| 16. The Episode 8 card | Episode 8 retitles the card (0.2, ask 1). | |
| 17. Fine Print does not enter Episode 7 | Same here (open choice 19). | |
| 19. The root's Nox after-clear line is held | Episode 8 opens with it, word for word (ask 2). | |
| 5, 8, 9, 12, 13, 15, 21 | No dependency beyond tone (the hero heard, never in a box; two or three small truth choices). | |

### 0.2 Asks of Episode 7 (Episode 7's files are not edited here)

1. **Retitle the Episode 8 card** in `ep7_ending` and EPISODE7 choice 16 from "Episode 8: The First Library" to **"Episode 8:
   The Last Word"** (the root region title, the pattern Episodes 2 to 7 follow: Episode 7's card is its region title "The
   Vanishing World"). The sub line "The lists were written here." stays.
2. **Do not use the root's Nox after-clear line** ("I kept every door closed because I could not endure another farewell.
   Palehaven has opened the gates. The last truth lies in the First Library.") in Episode 7's post-credits Talk (EPISODE7
   choice 19): Episode 8's first scene says it.
3. **Keep the Stillheart roof's `stair_foot` mark** and the `star_stair` prop (EPISODE7_PLAN 4.9); Episode 8's pack patch adds
   its door there. Keep the `nave_door` from Palehaven's square to the roof open from `doors_reopened`.
4. **Keep the credits wake at `ep7_ph_inn` mark `inn_bed`** and the counter `credits7_rolled` (Episode 8's first trigger reads
   both).
5. **Keep Nox's record ids `keeper` / `nox_t` and sprite `npc_keeper`** and Vex's `vex`; Episode 8 spawns them.
6. **Keep Nox's three held lines word for word**: "Where you came from is not mine to tell. It's written somewhere I can't
   go." (`whole_page`), "I'll say the name you'll need up there. Up there." and "...Ask me at the top." (`ep7_ending`).
   Episode 8 pays all three.
7. **Keep `hooded_sage` (portraits cell 7) unused**, and environments cell 7 and bosses cell 7 unused (EPISODE7_PLAN 9.0
   already holds them for Episode 8).
8. **Leave the hero's Ledger row unkept** (EPISODE7 choice 11) so Episode 8 keeps it.
9. **Note the blanket.** `keeper_comes` has Nox say she wrote the name on the blanket "in case the page got lost". Episode 8
   adds that the blanket's cloth was woven in the Scriptorium; no Episode 7 line changes, but Nox should not say where the
   blanket came from.

---

## 1. Beat sheet

Scene ids for `src/data/ep8/story.js` are in brackets. Flags are from the plan (section 2.2). Every scene follows the house
wrapper rules (guarded by `SCENE_CONDITIONS`, input locked for its run, registered through `registerStory`). Key lines are
samples in final voice, inside the box rule (3 lines of 42 characters); the story agent writes the rest and keeps every main
scene at 12 boxes or fewer except the eight set pieces: `sable_bindery` (14), `keeper_memory_c` (14), `the_name` (16),
`eraser` (16), `eraser_after` (18), `last_page` (14), `scriptorium_open` (16) and `home` (14). **Staging rule (CRITIQUE_6
item 11, kept):** every scene walks the party to marks two tiles below and beside the speaker first. **Camera rule
(CRITIQUE_8 item 2, kept from Episode 7):** every staged focus mark sits at least 12 tiles from a map's left and right edges
and 7 from its top and bottom, or the map is widened. **Show, do not tell (CRITIQUE_6 item 3):** the seven payoffs (Vex's
note, the reader's card, the cloth, Meya's word, the note "I could not.", the shelved page and its star, the last page) are
close-up inserts through `closeup` page kinds. **Payoffs in stages (CRITIQUE_7 item 7, CRITIQUE_8 item 5):** each close-up
step's text reaches full strength only on the box that says it.

**Speaker tags.** The Eraser speaks in capitals (the Archivore to Phantom pattern), tagged "The Eraser". One man has three
records, the speaker-swap mechanism of Episodes 4 to 7: **"The Librarian"** (`ep8_librarian`, Acts III to V, hood up, no
portrait), **"The Eraser"** (`eraser_v`, from the boss intro to the fall), **"The First Keeper"** (`first_keeper`, after
`eraser_after`, portrait `first_keeper`, the held `hooded_sage` cell). In memories he is "The First Keeper" (`first_keeper_m`,
younger). Nox is "Nox" (`nox_t`, Episode 7's record). Sable in memory is "A Young Binder" (`sable_m`); the name is not needed
there.

### Act I: Palehaven, the stair in daylight

The first five minutes (RESPONSIBILITY_ARC section 2: control in 20 seconds, a question in 60, a choice with a cost in 3
minutes, a fight in 5), exactly as the player sees them:

| Time | What the player sees and does |
|---|---|
| 0:00 | Fade in on the Thawlight Lodge at dawn. Through the frost on the window, a line of light runs straight up into the sky. Nox at the door with her lamp lit. |
| 0:15 | Nox's canon line, two boxes: "I kept every door closed because I could not endure another farewell. Palehaven has opened the gates. The last truth lies in the First Library." |
| 0:30 | The close-up: Vex's note, in his slanting hand: "Gone up first. Somebody has to knock. - V" Bram: "He left without breakfast." |
| 0:45 | Mira: "Then we're second." Control. |
| 0:50 to 1:40 | Out through Palehaven (Bryn, Eira, Torr: one line each if spoken to) to the nave door in the square. |
| 1:40 | The Stillheart roof by day: the stair of written light rising into a violet sky, Aeris beside the Kestrel. |
| 2:20 | Nox, at the first step: "Are you frightened?" The choice: `Yes.` / `No.` (Hazel's Episode 1 question, on purpose) |
| 3:00 | The first steps. Banner. Every step is a line of handwriting; between them, violet nothing. Control. |
| 3:40 | Two Index Hounds come bounding down the stair. The first fight; each bite rubs out the command the bitten member last used. |
| 4:30 | Bram's Attack is rubbed out; he Techs instead. A bite on the hero: "The ink will not take on {hero}." Win. Bram: "Why never yours?" |

1. **The last truth** [`ep8_morning`, `ep7_ph_inn`, on enter with `ep7_complete`, counter `credits7_rolled`, `EP8_LIVE`, not
   `ep8_morning_done`, not `tier_1`; sets `ep8_morning_done`, `ep8_started`]. (canon line; new staging)
   - Narration: "Dawn. Through the frost on the window, a line of light runs straight up into the sky."
   - Nox, at the door, her lamp lit: "I kept every door closed because I could not endure another farewell." (a beat)
     "Palehaven has opened the gates. The last truth lies in the First Library." (canon, the root's after-clear line, word
     for word; EPISODE7 choice 19, ask 2)
   - She holds out a folded scrap. The close-up `ep8_note`: "Gone up first. Somebody has to knock. - V" (new)
   - Bram: "He left without breakfast. That's how you know it's serious." Mira: "Then we're second."
   - Nox: "You asked me at the top. I'm coming to the top." (pays EPISODE7 `ep7_ending`, "...Ask me at the top.")

2. **Palehaven farewells** (talk entries, one box each, optional): Bryn: "The watchfires are gold this morning. Never seen
   gold." Eira: "Bring the Keeper back. We've only just got her name." Torr: "Write down the streets up there. Somebody
   should."

3. **The stair in daylight** [`ep8_roof`, `ep7_stillheart` (the roof, entered by the nave door after `ep8_started`); sets
   `ep8_roofed`, and `afraid_yes` or `afraid_no`]. The broken roof by day; the stair of written light (Episode 7's
   `star_stair`) rising out of it into a violet sky; the Kestrel moored on the roof's edge.
   - Aeris: "That stair doesn't need a ship. I'll be here when you come down."
   - Nox, at the first step, not looking at it: "Are you frightened?" Choice: `Yes.` / `No.` (EPISODE1's Hazel asks the
     same question in `hazel_farewell`; the echo is on purpose and nobody remarks on it)
   - Truth (`afraid_yes`): Nox: "Good. So am I. We'll both look where we're going." Brave (`afraid_no`): Nox: "Then hold my
     lamp. My hands shake." (Changes one line in `the_name`; plan 7.3.)
   - The party steps onto the first line; the scene owns the map change to `ep8_stair` `stair_bottom`.

### Act II: The Stair of Written Light

4. **Every first line** [`stair_arrival`, `ep8_stair`, on enter; sets `stair_arrived`]. Banner: The Stair of Written Light /
   Up to the Library (new; canon "A staircase of written light leads into the First Library itself."). Wide steps of
   golden handwriting climbing through the last of the aurora into a violet sky; between them, and wherever a line has been
   rubbed out, nothing: a violet void with gold motes drifting up through it like dust in a sunbeam. Two boxes.
   - Bram: "We're walking on somebody's handwriting." Nox: "On everybody's. Every first line the Library ever wrote."
   - Mira, at a gap: "And somebody's been rubbing them out."

5. **The first rub** [`first_rub`, step row above the landing (`if: stair_arrived`); scripted battle `e8s_first`, no flee;
   sets `first_rub_done`]. Two Index Hounds come down the steps with scraps of rubbed-out paper in their jaws. The teaching
   fight for Erasure (plan 6.3): each bite rubs out the command the bitten member used last; a rubbed-out command is gone
   for that member's next two turns. No tutorial box.
   - Before: Mira: "If it rubs something out, use something else." (the line names the answer, the E6-fixes A3 lesson)
   - Battle message at the first rub: "Bram's Attack is rubbed out." At the first bite on the hero: "The ink will not take
     on {hero}."
   - After: Bram: "It rubbed out my swing. Not yours." (a beat) "Why never yours?" The hero emotes `...`. (the twist's first
     seed; nobody answers)

6. **A book opens away from its reader** [`first_book`, step trigger at the first gap; sets `first_book_read` on the first
   open]. The field mechanic's first lesson (plan 5.1). A great closed book lies at the edge of a gap, as long as a cart,
   with a ribbon on each long side.
   - Nox: "Open it from this side. A book opens away from its reader." (new)
   - Bark after the first open (`first_open`): Mira: "It's a bridge. A paper Mother Willow." (the book's pages stand up over
     the void as a paper model of Willowmere's willow: the first of the seven realm books, plan 4.11)
   - Bark at the first page that lands on floor (`first_wall`): Bram: "Pages on the floor are walls. Pages over nothing are
     bridges."
   - Bark on a refused read (`would_fold`): Mira: "Not while we're standing on it."

7. **The one who rubs them out** [`rubbed_steps`, step trigger high on the stair, after `first_book_read`; sets
   `eraser_seen`]. The set piece of Act II. The light dims. Far up the stair, a tall shape in black robes walks down a few
   steps, and every line it passes goes blank behind its trailing sleeve. Its face is smooth and white, with nothing on it.
   It stops, as if it heard something, does not see them, and climbs back up into the light. (Staged as an actor, the pack
   tint `rubout` and the steps' frames; the scene owns every move.)
   - Nox, very quietly: "That's what he does now." Mira: "Who?" Nox: "Up there. I said I'd say it up there."
   - Bram: "It didn't have a face." Mira: "It had a face. Somebody rubbed it out."

8. **The South Margin** [`south_margin`, step trigger at the top gate; sets `saw_scriptorium`]. (canon "South Margin, World
   Road", the dot rendered as a comma) The top of the stair. Below the party, the Scriptorium: "The final inhabited street is
   built of marble pages and ink-dark canals. Book towers stand where houses should be." (canon flavor, shown, never read
   out: environments cell 7's foreground). Above it, filling the sky, the First Library: shelves taller than mountains, books
   and glyphs circling one vast open book that glows like a lamp in the violet (environments cell 7, canon).
   - Bram: "That's not a library. That's a mountain that reads." Mira: "That's where the lists come from."
   - The hero emotes `...`.

### Act III: The Scriptorium

9. **The unfinished street** [`scriptorium_arrival`, `ep8_scriptorium`, on first enter; sets `scriptorium_arrived`]. Banner:
   The Scriptorium / The Unfinished Street (new; after `scriptorium_open`: The Scriptorium / An Open Library, canon). Every
   sign in the street stops halfway through its word; every book in every window ends mid-sentence; the pens in the ink
   canal's railings are dry. Quinn the Page Runner (canon) at the gate with an armful of loose pages.
   - Quinn: "Pages drift out of the stacks when nobody is looking." (canon)
   - Mira, at a sign: "Every sign stops halfway." Quinn: "Nothing new gets finished here. Not since the Index shut."
   - Bram: "Shut by who?" Quinn: "...By the Index." (he has no name to give)

10. **The first word** [`first_word`, step trigger in the square after `scriptorium_arrived`; sets `read_learned`; teaches
    `read_aloud`]. The set piece of Act III and Mira's first beat. A girl on the school steps with a book open on her knees:
    Meya the First Student (canon). One word on the first page.
    - Meya: "I found a book with only the first word written. The rest was waiting for me." (canon)
    - The light dims (`rubout` tint over two seconds). Every half-word on every sign round the square lifts off, letter by
      letter, and Meya's one word goes with them. The close-up `ep8_first_word`, mode `rubbed`.
    - Meya: "...It's gone. My word's gone."
    - Mira kneels and holds the Lantern of Recall over the page. Mira: "Ink remembers, even when paper forgets." (Episode 1's
      Lantern line) Narration: "Mira reads the page aloud, slowly, the way you read to someone small."
    - The word comes back, and then the half-words on the signs, from the square outward (close-up mode `read`).
    - Meya: "You read it back." Mira: "Out loud. Words like being said."
    - Bram: "Do that in a fight." Learns **Read Aloud** (`skill_learn`, "Mira learned Read Aloud. Read an ally's lines back:
      what was rubbed out returns, and an unwriting breaks.").

11. **The Librarian** [`meet_librarian`, `ep8_sc_index`, step trigger two tiles in, after `read_learned`; sets
    `librarian_met`, `card_read`]. (new; the root's "The First Keeper" service in the First Library Index, unrecognized) A
    long hall of card drawers to the ceiling. At a high desk, an old man in a violet robe with the hood up, writing. He does
    not look up until the party is close; then he looks at the hero, and his pen stops. (Nox waits outside by the Living
    Codex: "I haven't stood in a street that reads in twenty-six years.")
    - The Librarian: "Readers. You'll want cards." (a beat, to the hero, softly) "{hero}. A good name. Look after it."
    - Mira: "How do you know it?" The Librarian: "A librarian knows every name. It's the job."
    - Bram: "And yours?" The Librarian: "I gave mine up. A librarian should be a shelf, not a book."
    - He turns his back to write three reader's cards, hands them over, and takes up his lamp. "The Library is closed to new
      names. I have a last page to see to." He goes up through the door behind the desk.
    - Mira reads her card. The close-up `ep8_card`: "Welcome, readers. Please return what you borrow." in a cold, careful hand.
    - Mira: "...That's the hand. Every list." Bram: "The nice old man?" Mira: "Seven lists. I know that hand."
    - The hero emotes `!`. (Act III's question: why would a kind man write the lists?)

12. **The blanket's cloth** [`sable_bindery`, Sable's stall in the square, her talk entry the first time, after `read_learned`;
    sets `sable_met`, and `told_sable` or `spared_sable`]. The set piece of Act III's second half. An awning of book-cloth,
    bolts of it in every colour, a woman sewing a spine with a curved needle: Sable the Bookbinder (canon Tamsin's role and
    testimony, renamed: section 8).
    - Bram stops at one bolt: soft blue-green cloth with a small woven pattern. The close-up `ep8_cloth`, mode `bolt`; then mode
      `match`: beside it, the corner of the blanket from Hazel's chest (EPISODE1's inspect: "worn soft", the name in "thread
      the color of river water"), the same weave.
    - Bram: "{hero}. That's your blanket. Hazel's chest. I've seen it a hundred times."
    - Sable, looking up: "I wove that pattern for one blanket. For a baby I carried to the Index to be written." (a beat)
      "They never wrote it. They never brought it back."
    - Nox, who has come over from the codex: "The child came down the stair in that cloth. I wrote the name on it."
    - Sable puts the needle down and looks at the hero a long time. "...You're tall."
    - Sable: "Did you ever wonder who left you?" The **truth choice**: `Not really.` / `Every day.` Truth (`told_sable`, the
      hero had Hazel): Sable: "...Good. Then somebody loved you enough not to." Kind (`spared_sable`): Sable: "You're kind.
      Somebody down there taught you that." (Changes Sable's gift in `scriptorium_open`; plan 7.3.)
    - Sable: "I'm not going to ask for you back. You've a home." (a beat) "I wanted you to have a name. That's all."
    - Mira, quietly: "They have one." Sable: "...Then I can finish this binding." She picks up the needle.

13. **The empty book on the door** [`library_door`, `ep8_scriptorium`, step trigger at the Library door after `card_read`;
    sets `library_open`]. The First Library's great door at the north end of the street: a seal as tall as a house, an open
    book with nothing written in it, the seal on every list since Episode 1.
    - Mira: "The empty book. On every list." Bram: "On his door."
    - Nox: "I couldn't go in, before. A Keeper with no name can't. I have mine back." She opens it.

### Act IV: The First Library

14. **The Catalog of Lost Lives** [`catalog_arrival`, `ep8_library_f1`, on enter; sets `library_entered`, `f1_arrived`].
    Banner: The First Library / I. The Catalog of Lost Lives (canon). Walls of card drawers rising into the dark, galleries
    over the violet void, great books lying shut on every landing. Floor question (arc 3.5): who filed all these away?
    - Bram: "Drawers. Thousands." Mira: "Every one a name somebody put away so it wouldn't hurt."

15. **The First Duty** [`keeper_memory_a`, `ep8_library_f1`, step trigger at the doorway alcove; sets `keeper_memory_a`].
    (canon memory title and words; staged as a tinted vignette: the Library replays what it holds, the Episode 7 memory
    mechanism) A doorway into the Library, long ago, standing open; travelers coming in out of the void with their books; a
    Keeper in a violet robe with the hood back, a kind lined face with gold eyes (younger than the Librarian), holding the door.
    - The First Keeper (memory): "Names are windows. Not chains." (canon: "Names are windows," he said, "not chains.")
    - The doorway darkens: a long line of travelers with no faces, a war's worth (canon "the war of the nameless made him
      afraid"), and the Keeper's hand on the door, shaking.
    - Mira, now: "That's the Librarian. Younger." Nox: "That's the First Keeper."
    - Nox: "The Eraser was once the First Keeper. He believes forgetting is mercy." (canon, the root's region talk, word for
      word) Bram: "The faceless thing on the stair. And the old man at the desk." Nox: "And him. One man."

16. **The Original Ink Key** [the gold chest on the northern shelf (canon "The Original Ink Key (northern shelf) is needed at
    the final keyhole"), flag `ink_key_found`]. The lift up sets `library_f1_done`.

17. **The Palimpsest Galleries** [`palimpsest_arrival`, `ep8_library_f2`, on enter; sets `f2_arrived`]. Banner: II. The
    Palimpsest Galleries (canon). Pages written over pages; old writing showing faintly through the new; pairs of great books
    with the same ribbon. Two boxes.
    - Mira: "He writes over things. You can still see what was there." Bram: "Then it isn't gone. It's just underneath."

18. **The Order That Changed Everything** [`keeper_memory_b`, `ep8_library_f2`, step trigger in the printing room; sets
    `keeper_memory_b`]. (canon memory title; canon "The Keeper tried to save the world from grief by commanding his Scribes to
    delete every name that might bring an old loss back.") The memory: the First Keeper at a great desk, his Scribes in a row,
    writing in a cold, careful hand.
    - The First Keeper (memory): "No more losses. Take every name that hurts to hear."
    - A Keeper with a green-bronze lantern stands up from the row (the Rootbound Archive's last Keeper, EPISODE1, nameless by
      design). The Keeper with the Lantern (memory): "No. Not without a living witness." (EPISODE1's hidden ink: "A Keeper
      pledged that no name could be erased without a living witness.") She walks out. He keeps writing.
    - Mira takes out the reader's card and holds it beside the memory's page. The close-up `ep8_card`, mode `beside`: the
      same hand. Mira: "Same hand. He wrote the order. And every list after it."
    - Bram: "Why the North first?" Nox: "Because we could still say his name. I was one of them."

19. **The Unnamed Sentry** [`unnamed_sentry`, `ep8_library_f2` arena, arena trigger; boss intro card; battle
    `unnamed_sentry`; sets `sentry_defeated`; the lift trigger sets `library_f2_done`]. A tall armored shape of ink and gilt
    with a smooth blank plate where its face should be: the thing that guards the galleries' seal. Name card: THE UNNAMED
    SENTRY / Keeper of the Palimpsest. Intro line (arc 3.6): "It guarded every page. Nobody told it whose." (canon foe name
    "The Unnamed Sentry", grown into the floor's keeper: section 8)
    - Mira, the one tip: "When it starts to unwrite one of us, I'll read them back. Keep me standing."
    - After: Bram: "It had no name either." Mira: "Nobody up here does. That was the point of up here."

20. **The Archive of Uncensored Lives** [optional, `uncensored_archive`, F2, side story 2]. (canon archive and evidence pages,
    now any order.) Bram: "Three pages and a locked shelf. Somebody hid the truth and labelled it."

21. **The Unwritten Page** [`unwritten_arrival`, `ep8_library_f3`, on enter; sets `f3_arrived`]. Banner: III. The Unwritten
    Page (canon). Floors of blank white page; three landings climbing a round of shelves, each cut with one word in gold:
    SEE, SHELTER, CHOOSE (the canon promises, as inscriptions, never an order to get right); far up, a door with a keyhole of
    old ink. The quietest map of the episode. Two boxes.
    - Bram: "Blank." Mira: "Not blank. Waiting."

22. **The Last Unwritten Name** [`keeper_memory_c`, `ep8_library_f3`, step trigger on the first landing; sets
    `keeper_memory_c`, `beginning_seen`]. (canon memory title; re-aimed: section 8) The set piece of Act IV. The Index, years
    ago, at night. A young woman gives a baby in a blanket of blue-green book-cloth to the First Keeper at his high desk, and
    goes out. He dips his pen. His hand will not write. He takes up the long eraser. His hand will not rub. He sits a long
    time with the baby.
    - The First Keeper (memory), to the baby: "I can't write you. I can't rub you out."
    - He writes a note and tucks it into the blanket. The close-up `ep8_could_not`: two words in the cold hand, "I could
      not." He carries the baby out of the Index and down the stair of light, toward the North.
    - On the desk behind him, the oldest page in the Library, empty except for one sentence: "No life can be stored without
      letting it change." (canon, shown on the page and read by nobody; the camera holds on it)
    - Mira, now: "He carried you down. Before Nox. Before Marten."
    - Nox: "I found you on my step with that note. I knew the hand. I'd been on its list for ten years."
    - Mira: "Memories can hurt and still be worth keeping." Bram: "The forge shelters the living. Not a silence." (canon:
      "Mira says that memories can hurt and still be worth keeping. Bram promises the forge will shelter the living, not
      preserve a silence.", given to them as speech)

23. **The name** [`the_name`, `ep8_library_f3`, step trigger at the top landing, by the keyhole; sets `name_told`]. The set
    piece of Act IV's end and Nox's beat. The Charter of the Living Lexicon is cut in the wall beside the keyhole (canon,
    inscription and book, plan 4.8). Nox stops.
    - Nox: "I said I'd give you the name up here. It's a door. This is where it was written."
    - (`afraid_yes`) Nox: "I'm frightened. You said you were. Good." (`afraid_no`) Nox: "Give me back my lamp. I'll need
      both hands for this."
    - Nox: "The First Keeper's name." (a beat) "{hero}."
    - Everyone looks at the hero. The hero emotes `!`.
    - Nox: "He left you on my step with no name and that note. I knew whose hand it was. So I gave you his."
    - Nox: "I wanted somebody to say it every day. Kindly. So he could never quite be gone."
    - Mira: "Every list. Your name at the bottom. Never crossed out." Bram: "He couldn't cross out his own name."
    - Mira: "And the first page. He wants it so he can." (the sky's list: THE FIRST PAGE. LET NOTHING REACH THE SHELF.)
    - Nox: "If that page reaches his shelf, his name is written back where it began. He'd have to answer to it."
    - Mira: "We have brought the names this far." Bram: "Whatever waits, it does not face you alone." (LEGACY camp lines,
      kept; the LEGACY hero line is not used: the hero never speaks in a box)
    - The Original Ink Key turns in the Original Ink Keyhole (canon). The door opens on gold light.

### Act V: The Last Word

24. **The last margin** [`eraser`, `ep8_last_word`, trigger row at the entry; boss intro; battle `eraser`; sets `vex_arrived`,
    and `answered_yes` or `answered_page`]. The heart of the Library: shelves rising out of sight on every side, books and
    glyphs circling a vast open book on a dais, glowing like a lamp (environments cell 7, canon). Overhead, a dome of seven
    stars turning slowly back toward an eighth with no sign (Episode 5's mural, the same picture). The Librarian stands at the
    lectern before the book, hood up.
    - The Librarian: "You read the card." (a beat) "Mira. You always read everything."
    - The Librarian: "Give me the page, {hero}. Then it can be quiet."
    - Footsteps on the gallery stair. Vex, out of breath. (LEGACY "The Last Margin": "Vex arrives at the First Library
      carrying the first page he stole in Willowmere." NEXT's page was given, not stolen: section 8)
    - Vex: "Mended your bindings for two years. You never said your name. Now I know why."
    - Vex takes the first page out of his coat, whole, and puts it in the hero's hands. Vex: "I kept one thing from the
      Eraser: your beginning. You keep the ending." (LEGACY line, word for word)
    - The Librarian draws his hood forward, and under it his face goes smooth and white, every line rubbed out (bosses cell
      7). Speaker swap: "The Librarian" becomes "The Eraser".
    - The Eraser: "AN EMPTY PAGE IS A PEACEFUL PAGE." (canon Living Codex: "The Eraser believes an empty page is a peaceful
      page.")
    - The Eraser: "I TOOK EVERY NAME THAT HURT. ONE IS LEFT. IT IS MINE."
    - Choice: `It's my name too.` / `Then come and take it.` (either way, the battle; the Eraser answers each with one line:
      "THEN I WILL TAKE IT FROM BOTH OF US." / "I HAVE BEEN TAKING IT FOR A HUNDRED YEARS.")
    - Mira, the one tip: "When it unwrites one of us, I read them back. When it goes quiet, {hero}, answer it."
    - Name card: THE ERASER / Once the First Keeper. Intro line (arc 3.6): "He filed away every loss. Nobody asked about his."
    - Phase 4 battle message: "The Eraser reveals its final form: a space where no name can survive." (LEGACY BOSS_SCENES,
      word for word)

25. **He lays down his pen** [`eraser_after`, `ep8_last_word`, after the win; sets `lexicon_restored`, `fragment8_get`,
    `keeper_named`; the encounter sets `eraser_defeated`]. The order matters; the story agent keeps it:
    1. The Eraser goes down on one knee before the great book. The white face cracks like old paint, and under it is the old
       man's face, lined, gold-eyed, very tired. Speaker swap: "The Eraser" becomes "The First Keeper" (portrait
       `first_keeper`: the held `hooded_sage` cell, its first use).
    2. The First Keeper: "...Say it again."
    3. Mira: "{hero}." The hero turns at their name. So does he. (said out loud, kindly: the Lantern line's "Words like
       being said" paid)
    4. The First Keeper lays down his pen (canon: "The Eraser lays down his pen."). "I wanted it quiet. I only made it empty."
    5. The great book opens by itself. Narration: "The First Lexicon opens. Each rescued word takes its rightful place."
       (LEGACY BOSS_SCENES victory line, word for word) The names of seven realms fly home onto its pages (`name_restore`
       flash), a wave of them out through the shelves and down the stair. Gives `name_fragment_8` (the First Lexicon). Bram:
       "Eight." Mira: "Eight. And the first."
    6. In the First Lexicon, under the hero's line, the counter-seal and "Keep this one.", in the warm hand, an eighth time.
       Nox, at the book: "I wrote that one before I ever wrote yours. I just never knew I would."
    7. The First Keeper, to the hero: "It's your name now. You wear it better."
    8. Nox: "You took mine for twenty-six years." The First Keeper: "...I know. I'm sorry." (a beat) "Nox." Nox: "Again
       tomorrow. And the day after."

26. **How the names go back** [`last_choice`, chained; sets `ending_return` or `ending_choose` (permanent on this save)].
    (canon final choice, word for word where canon has words)
    - The First Keeper: "The names are theirs again. How do they go back?"
    - Choice: `Return every stolen name` / `Let each person choose` (canon labels).
    - Return (`ending_return`), canon: "You restore every lost name to the public pages, with a new rule that anyone may
      amend their story or withdraw their name. The world remembers; the Library can no longer imprison a life in a single
      version." Banner: "Ending: Every Name Returned" (canon title, its middle dot rendered as a colon).
    - Choose (`ending_choose`), canon: "You give the last word to the living. The Library offers each person their recovered
      past privately, but no one is forced to bear or publish a name. Blank pages become a right, not an erasure imposed by a
      Keeper." Banner: "Ending: The Right to Choose".
    - The First Keeper: "I cannot repair what I erased, but I can help return the keys to those whose names were stolen.
      The Library belongs to them now." (canon after-clear line, its first two sentences; the third, "Your closing chapter is
      written in the Journal.", becomes the Journal's last entry)

27. **The last page** [`last_page`, chained; sets `page_shelved`, `eighth_star`, `hero_kept`]. Under the dome, at the foot of
    the dais, the first shelf of the Library: every place on it full but one, the width of a single page.
    - Nox: "That's your place. It's been empty a long time."
    - The hero puts the first page on the shelf. The close-up `ep8_shelf`, mode `shelved`: the page in its place, the warm
      hand, the counter-seal, Marten's mark, "Nox." (THE FIRST PAGE. LET NOTHING REACH THE SHELF.: something has.)
    - Overhead, the eighth star lights, and takes a sign: an open book with one line written in it, the counter-seal (mode
      `star`). Mira: "The eighth star. It has a sign." Bram: "Yours." (pays EPISODE5's mural)
    - The Ledger's last row fills (a `name_restore` flash on the hero's own name on the party HUD): the hero is kept.
    - The great book's last page. The hero turns it. The close-up `ep8_last_page`: empty. Narration (canon): "{hero} turns
      the final page. It is empty, ready for the next story."
    - The witness line (canon, plan 5.3): with five or more of the eight witness quests done, "Across the realms, the people
      you helped bring their own records and memories to an open council. They refuse to let any future Keeper decide their
      fate alone."; with fewer, "The recovered fragments are entrusted to seven independent town councils, so the Library
      can never command forgetting again."

### Act VI: Home

28. **An Open Library** [`scriptorium_open`, `ep8_scriptorium`, on arrival through the Library door after `page_shelved`; sets
    `scriptorium_open`]. Every half-word on every sign finishes itself; the pens in the canal railings drip ink; Arun's
    candles light along the script-road.
    - Arun: "A new flame appears whenever someone tells the truth." (canon)
    - Meya writes her own name on her book's second page and holds it up. Mira, on the school steps beside her: "Questions
      first. Then spells." (LEGACY companion arc: "When this is over, I want to teach. Not spells first. Questions first.")
      Mira: "I'll come back. Somebody should teach up here."
    - Sable at the stall, the binding finished. She gives the hero the gift (plan 7.3: the Binder's Awl for the truth path,
      Riverwater Thread for the kind path; equip prompt). Sable: "For the road home. Write to me."
    - Vex on the bindery step, a needle and a split spine across his knees. "Somebody has to mend all this. I'm done
      moving." (pays LEGACY "Now you understand why I keep moving.")
    - The First Keeper at the Index door with every drawer open. Nox, beside him: "I'll stay a while. Somebody should keep him
      honest."
    - Banner: The Scriptorium / An Open Library (canon after-clear title).

29. **Home** [`home`, chained (the scene owns the time and place: the stair down, the roof, the Kestrel, the valley, the door
    of `hero_home`); sets `home_reached`, and `told_hazel` or `spared_hazel`].
    - On the Stillheart roof, Aeris: "Told you I'd be here."
    - One cut: the Kestrel south over the realms at sunset, every one of them on the map again; it sets down in Willowmere
      Valley in the dusk.
    - Hazel at the door of the house, a dish towel over her shoulder. "There you are."
    - Hazel: "Did you find them? Where you came from?" The **truth choice**: `I did.` / `No.` Truth (`told_hazel`): Hazel:
      "...Good. Then you know you came home on purpose." Kind (`spared_hazel`): Hazel: "You never could lie to me. Come in
      anyway." (Changes Hazel's post-game line.)
    - Hazel: "The bells have been ringing all day. Every one of them. Go and listen."

30. **The thirteenth name** [`thirteenth_name`, `ep8_bell_night` (a pack copy of the bell tower at night: plan 4.9), on enter;
    playable; sets `ep8_complete`]. The bookend of the whole game: EPISODE1 scene 1, "The Thirteenth Toll", played again.
    Night; the bell tower stair; the lantern pool; no box. The hero climbs, and each step tolls a bell and shows a name, no
    press needed: Hazel, Mael, Oren, Pip, Tess, Iris, Holt, Garrick, Nella, Wick, Edda, Bram (the cold open's twelve, in its
    order). Stop, and the bells wait. At the top Mira and Bram are sitting on the bell beam, waiting. The thirteenth toll
    sounds, the alarm bell, louder, and this time a name shows: **{hero}**. The bells hang still. A held quiet. Black. The
    cold open's card, "In Aethelgard, every name is a promise.", and under it, a new line: "This one was kept." Then the end
    title: "Lexicon Quest" / "The End".

31. **Credits** (`CREDITS_EP8` in the pack's `text.js`, music `the_last_word`; section 10), then the next morning at
    `hero_home` (mark `bed`): the blanket folded at the foot of the bed (its inspect line gains a third line: "You know who
    wove the cloth now, and who wrote the name."), Hazel downstairs, and every road open (section 10).

---

## 2. Side stories

| Quest | Giver | What happens | Reward |
|---|---|---|---|
| **The Living Concordance** (canon witnesses, folio and rewards) | Ione at the Living Codex, after `scriptorium_arrived` | Hear Ione (canon: "We were ordered to file grief as a mistake. I witnessed seven regions change despite the Library. An honest archive must record both joy and loss."), Fen (canon: "There was once a list of names no one was allowed to forget. The Eraser destroyed it because he could not bear the people he had lost.") and Sable (canon Tamsin's words: "Each binding hides one witness page. The oldest pages were amended by the First Keeper, not written by fate. Even he was afraid."). Then open the Concordance folio in the square (canon "the Living Concordance in the town square"). Any order; one talk each. Sable's witness opens only after `sable_met`. | 3 Hi-Potions, 2 Hi-Ethers and 500 gold (canon three Potions and two Ethers, scaled), the folio becomes a rest and save point, and +25 Fury at the start of the Eraser fight (`concordance_lit`; canon +25 Focus). The Bookcloth Coat (set piece). |
| **The Archive of Uncensored Lives** (canon archive and evidence pages, now any order) | Talk hint on F2 | Three evidence pages (The Names, The Order, The Correction; canon titles) lie on F2's side galleries, found in any order. The Archive sits behind a palimpsest pair the main route never needs (plan 4.7). No order puzzle; a wrong order resets nothing. | 500 gold, 3 Hi-Ethers (canon 300 gold and three Ethers, scaled), book `keeper_hid` ("The Book the Keeper Hid", the root's floor-3 memory label used as the book's title) |
| **Quinn's Drifting Pages** (new, from canon Quinn, "Pages drift out of the stacks when nobody is looking.") | Quinn at the South Margin gate, after `scriptorium_arrived` | Three pages drifted out of the stacks: one on the Stair (a ledge reached by a side book), two on F1 (an alcove behind a book wall; a cache behind a Dash-cracked drawer stack). Quinn binds them back; on the last one he reads out the oldest line he has found: "The original record was deliberately left unfinished so its ending could be chosen." (LEGACY Indexhaven) | The Runner's Ribbon (rare unique charm) |

Side quests open once the Scriptorium is introduced (`scriptorium_arrived`). Every quest has a journal entry and a Talk
reminder. Cut line: Quinn's Drifting Pages goes first if the budget tightens (Quinn keeps his canon lines; his LEGACY line
moves to an inspect on the Index's first drawer).

---

## 3. Character bible

Sprite and portrait ids in brackets (plan section 9).

### The party in Episode 8

**{hero}** [`hero`]. Silent, through choices, emotes and what others say. Seven episodes of their name turning up, faint,
twice, stamped, signed, starred, paged, kept; in the Library the player learns why: it was never only theirs. It is the name
of the man who wrote the lists, given to them by the Keeper he wronged, so that someone would say it kindly every day. The
ink will not take on them in a fight, because the Eraser cannot rub out his own name. Their beats are two answers: in the
Eraser's last phase they answer to the name (Answer, Episode 4's skill, comes back), and at the end they put their own first
page on the shelf it was kept from and turn the final page. Arc beat: from "I will call back whoever is fading" (Episode 7)
to "I will answer to my name, whatever it carries". Their Ledger row, "Not yet kept." since Episode 1, is kept last.

**Mira** [`mira`]. The center. Dry, exact, the one who reads. She knows the cold hand on a reader's card after seven lists,
reads a child's rubbed-out page back in the square, and in the Eraser fight reads her friends back faster than he can rub
them out. Her line of the episode is the smallest she has had and the one the whole game has been about: "Out loud. Words
like being said." She ends it teaching a girl to write her own name, as her LEGACY self wanted ("Questions first."). Root
canon's last promise for her is SEE; the plan's skill is the verb she has been doing since Episode 1.

**Bram** [`bram`]. SHELTER (root canon's promise for him). He is the one who notices the ink never takes the hero ("Why
never yours?"), who knows Hazel's blanket on sight because he grew up down the lane, and who stands in front of Mira so her
reading holds. Humor: breakfast, mountains that read, the Librarian being "the nice old man". Root's epilogue gives him
Mara's forge bell one last time (credits) and LEGACY gives him his retirement plan (post-game Talk, word for word: "After the
First Library, I am finding a kitchen with strong walls and weak soup. That is my retirement plan.").

### The guests

**Nox, the Keeper of the Hollow North** [`nox_t`, sprite `npc_keeper`, Episode 7's records; no portrait] (canon name and
role). She climbs because she said she would. In the Scriptorium she stands in a street that reads for the first time in
twenty-six years; in the Library she names the First Keeper, explains nothing she does not have to, and says the name. Her
beat: saying "{hero}" at the keyhole, and then telling the man who took her name for twenty-six years to say hers again
tomorrow. She stays in the Scriptorium after, "to keep him honest". She never fights. New lines: "You asked me at the top.
I'm coming to the top." "I wanted somebody to say it every day. Kindly." "Again tomorrow. And the day after."

**Vex Quill** [`vex`, portrait `silver_rogue`] (canon recurring rival). Seventh NEXT appearance and the last of the arc: E2
took a list, E3 gave a corner, E4 signed as a witness, E5 gave a list away, E6 booked the seats and answered, E7 handed over
his own name, E8 hands over the page he kept for sixteen years, word for word as the LEGACY game wrote it, and stops moving.
He goes up the stair ahead of the party (his note), is not seen again until the Last Word, and ends on the bindery step with
a needle. He never fights.

**Captain Aeris** [`aeris_t`, sprite `npc_aeris`] (canon). Bookends only: she waits on the Stillheart roof and flies the party
home. Root's epilogue gives her the missing pilots (credits).

### The Scriptorium

**Sable the Bookbinder** [`sable`; memory record `sable_m`] (canon Tamsin's role, title and testimony; renamed for X1's
Tamsin the weaver, with LEGACY Indexhaven's "Sable the Binder": section 8). Forties, a binder's apron, a curved needle always
in her hand, grey coming in at the temples. Weaves her own book-cloth; wove one blanket's worth of a blue-green pattern once.
Carried her baby to the Index to be written, the Scriptorium's custom, and never got the baby back. She does not ask for the
hero back. Her line: "I wanted you to have a name. That's all." She is the Concordance's third witness. (Open choice 5: the
hero's mother; open choice 6: alive and does not ask.)

**Ione, Archivist of True Names** [`ione`] (canon witness; carries canon Iona the Indexer's townsfolk lines too: section 8).
Sixties, ink to the wrists, a ring of drawer keys. Keeps the Living Codex in the square and gives the Concordance. Canon
lines: "Every new book creates another shelf. The final hall is growing again." "I keep the living catalogue by author, place
and vow." Held until `eraser_defeated`: "The First Keeper knows what the Eraser believed forgetting would accomplish." (canon;
it would name two men as two before the player knows they are one).

**Fen, Apprentice Keeper** [`fen`] (canon witness). Late teens, a Keeper's grey with the hood down, too-long sleeves. The
Library's last apprentice; has never been let past the Index door.

**Quinn the Page Runner** [`quinn`] (canon). Twenties, a runner's satchel, loose pages under both arms. Gives the Drifting
Pages. Canon lines: "Pages drift out of the stacks when nobody is looking." "I carry fresh ink and binding cord between the
library wings." His third canon line ("The marble letters on the road spell a warning when read backwards.") is **not used**:
it invites a word puzzle (DESIGN hard rule 2).

**Sorel the Restorer** [`sorel`] (canon). Fifties, a magnifying lens on a cord. Keeps the Glyphsmith Atelier (shop
`glyphsmith`). Canon lines: "A broken binding can be repaired. A lost name needs a friend." "I restore torn volumes at the
Glyphsmith Atelier." "The Eraser was not always the enemy; read the oldest histories."

**Arun the Candlekeeper** [`arun`] (canon). Seventies, a taper on a long pole. Canon lines: "These candles burn with the light
of remembered kindness." "I watch the lamps along the script-road as the sun sets." "A new flame appears whenever someone
tells the truth." (the last held for `scriptorium_open`)

**Meya the First Student** [`meya`] (canon). About nine, ink on her nose, a book on her knees. Canon lines: "I found a book
with only the first word written. The rest was waiting for me." "I practise reading the old glyphs before class." "The First
Keeper sometimes leaves a blank page for visitors to fill." (the last held for `scriptorium_open`) No age is said on screen.

**The Scriptorium Host** [`ep8_innkeeper`, Ledger-excluded] keeps the Keeper's Quiet Rooms (canon inn and interior title).
**The Archive Keeper** [`ep8_shopkeeper`, Ledger-excluded] keeps Bibliotheca Supplies (canon shop and interior title).

### The Library

**The Librarian, the Eraser, the First Keeper** [records `ep8_librarian`, `eraser_v`, `first_keeper`, `first_keeper_m`;
sprites `npc_librarian` (hood up), `npc_first_keeper` (hood back), boss `eraser`; portrait `first_keeper` (`hooded_sage`,
portraits cell 7: "mysterious elderly hooded librarian with violet robe, pale face, luminous gold eyes, book clasp", canon)]
(canon: "The Eraser was once the First Keeper. He believes forgetting is mercy."; one man in three looks: inference, section
8). Very old (the order of Episode 1 is "a century ago"; his age is never said), straight-backed, a violet robe, a book clasp
at the throat, ink on his right hand that is not the warm ink but the cold. He kept the doorway of the Library open for a long
life ("Names are windows. Not chains."), lost too many people in "the war of the nameless" (canon), and ordered his Scribes to
take every name that might bring an old loss back. When the last Keeper of the Rootbound Archive refused, he gave the order
to Moth. He took his own name off everything he could, and then he wrote the North's list, to make the world forget everyone
who could still say it. Since then he has worn two faces: the Librarian at the Index, gentle, exact, nameless, who closed the
Library to new names; and, at work on the stair, the Eraser, black-robed, white-faced, rubbing out first lines from the top
down. Sixteen years ago a binder brought him a baby to be written. He could not write a new name against his own order and
could not rub out a child, so he carried the child down the stair to the one Keeper still writing new names, with a note
that said "I could not." Not evil: the last and saddest of the house's tools given a bad order, except that he gave the
order to himself. Speaks quietly as the Librarian, in capitals as the Eraser, and as the First Keeper like a man who has
not talked to anyone in a hundred years. Last line: "It's your name now. You wear it better."

**The Unnamed Sentry** (mini-boss, canon foe name grown into the floor's keeper). Gilt armor over ink, a blank faceplate. Made
to guard the Palimpsest Galleries' seal; given no name so it could never be talked out of its post.

**Grief and Change, the Rejected Truths** (canon: "Rejected Truth: Grief", "Rejected Truth: Change", the dot rendered as a
colon). The Eraser's phase 2: the two things he refused. Grief is a small hooded figure made of wet pages that weeps, and
while it weeps the Eraser mends (canon role "mender"; the same idea as Episode 2's reflection of grief, on purpose). Change
is a turning page with a door cut in it that stands in front of the Eraser and takes the blows meant for him (canon role
"warder").

### Returning cast

Palehaven (Bryn, Eira, Torr, Maera, Sol, Mirael): one line each in Act I, one after `ep8_complete` naming the gold
watchfires. Willowmere: Hazel (`home` and post-game), **Tess** (post-game: "Bram says the bells rang every name today. Even
yours. Especially yours."), Holt, Mael ("Sixty years I've counted thirteen. Tonight I heard who the thirteenth was for."),
Garrick, Oren, Pip. Hollowmere, Emberpeak, Valewyn, Saffron Haven, Zephyr Landing: one post-game line each through
`prependTalk`, and each one's canon epilogue sentence in the credits (section 10). Saffron Haven's mural gains its eighth sign
(an inspect state). The Deep Stacks' Hollis: one line ("Finished up there, are we. Down here it never is."). X1's Hesper, if
the Wider Valley is live: one line at the Orrery ("There's a light in the eighth ring that was never there before.").

---

## 4. Tone guide (what changes from EPISODE7 section 4)

Everything in Episodes 1 to 7 stands: warm first, then the chill; show forgetting, never explain it; names with weight; short
boxes; character humor; no em dashes, ASCII only, `{hero}`.

- **Violet, gold and paper.** Episode 7 was snow white, ice blue and one warm light. Episode 8 is a violet void, warm gold
  lamplight and cream paper, with black ink as the only dark. The void (rubbed-out stair and gaps) is violet with slow gold
  motes, never white, so it can never be mistaken for Episode 7's fade. Pages that stand up are cream with a dark ink edge.
- **Quiet, not cold.** The Scriptorium's sickness is unfinished things: half-words on signs, books that stop mid-sentence,
  dry pens. Show it: a sign that says BOOKB, a girl with one word, a binder finishing a spine. Nobody explains "the Index
  writes no new names"; a sign finishes its word after `scriptorium_open` that it did not finish before.
- **The villain is a sad old man.** No gloating, no cackling, no threat to a child. The Librarian is kind; the Eraser is what
  his kindness turned into. The fight is the party refusing to let him disappear. He is forgiven by being named, not by a
  speech. Nobody says "forgive".
- **The hero's voice, never the hero's words.** The hero answers to their name twice (the battle, the bell). Both are shown:
  a turn of the head, a HUD flash, a toll, a name in light. Never a speech box from the hero.
- **The twist is shown in three pictures, then said once.** The ink not taking on the hero (Act II), the Librarian saying
  their name and his pen stopping (Act III), the baby and "I could not." (Act IV), and only then Nox says it. A player who
  guesses early should feel clever, not cheated.
- **Humor carriers.** Bram (breakfast, mountains, "the nice old man?"), Quinn, Meya, Vex (dry, last time). Never during a
  memory, never at Sable's expense, never in the Last Word before the Eraser falls.
- **Sable's restraint.** She cries off-screen if at all. "...You're tall." is the whole of it.
- **The ending is small.** A shelf, a star, an empty page, a dish towel, a bell. No speeches about what it all meant. The
  last image is a name in light on a bell tower and a card.
- **Names with weight in this episode.** {hero}, said by Nox at the keyhole and by Mira over the fallen Eraser, and tolled by
  the thirteenth bell; Nox, said by the man who took it; Sable, never said to the hero by herself (others say it); Meya,
  written by her own hand.
- **The responsibility arc, as subtext only.** Nobody says "answer for", "own it" or "take responsibility". The hero answers
  to a name that carries a hundred years of harm and keeps it. A mother gives up a child so the child can be named. A
  rival stops running. The game names no real person and credits no teacher or author (RESPONSIBILITY_ARC section 0,
  decision A).
- **Motes are slow.** The void's gold motes drift up; they never flash. The `rubout` tint fades in over two seconds (a phone
  and photosensitivity rule, plan 5.2).

---

## 5. The lore added in Episode 8

**The First Library.** "At the center of existence stands a library whose pages contain every possible name." (canon) The
Keepers wrote the Book of Names here first, and divided copies of it among their seven realms "so that no single fire could
take it all" (Episode 1). The Library keeps the Book's own first copy, the First Lexicon, and on its first shelf, every life's
first page. "Every written life makes the First Library larger." (canon Living Codex) It is the eighth fragment.

**The Scriptorium.** The last inhabited street, at the Library's foot: binders, restorers, candlekeepers, page runners. Its
custom: a newborn is carried to the Index for the Keeper to write their first line. Since the Index shut to new names,
nothing new is finished there: signs stop halfway, books end mid-sentence, children are named by mouth and never written.

**The First Keeper.** The title of the order's head, held by one man for longer than anyone alive can remember (inference:
"First Keeper" is a title; root never says he was the first Keeper ever). He kept the Library's door open ("Names are
windows. Not chains."), lost too much in "the war of the nameless" (canon, never explained), and about a century ago gave
the order Episode 1 found: take out every name that might bring an old loss back. One Keeper refused, the Rootbound
Archive's last, "Not without a living witness."; he gave the order to Moth. Then he took his own name off everything he
could. **The Eraser** is what he does now: rub out, from the top down.

**Why the lists hunt the hero.** Twenty-six years ago he wrote the North's list, to make the world forget everyone who could
still say his name; it took Nox's. Sixteen years ago a binder brought him her baby to be written. He could not write it and
could not rub it out, so he carried it down the stair to Nox with a note, "I could not." Nox knew the hand. She named the
child with his name, on purpose, so that someone would say it every day, kindly, and he could never quite be gone; and she
wrote that name into every fragment of the Book with "Keep this one." under it, so no single list could take it. Every list
since has the hero's name at the bottom, never crossed out: he wrote his own name down to be taken and could never cross it
out. The sky's list, THE FIRST PAGE. LET NOTHING REACH THE SHELF., was his last try: if the child's first page ever reached
the Library's first shelf, his name would be written back where it began, and he would have to answer to it.

**Read it back; answer to it.** Episode 4 taught that true ink holds; Episode 5, that a reading is not a record; Episode 6,
that a hand can hold; Episode 7, that a frozen name is not a lost one. Episode 8 adds: a rubbed-out word is not gone, it is
underneath; read it aloud and it comes back. And a name is not only yours: answer to it anyway. **Read it back, then
answer.**

**The eighth star.** Episode 5's mural: seven wandering stars, each with its sign, turning back toward an eighth with no
sign. The seven are the seven realms and their fragments; the eighth is the First Library, whose seal was an open book with
nothing written in it (the empty seal on every list). When the hero's first page reaches the shelf, the eighth star takes a
sign: the open book with one line in it, the counter-seal Nox drew under the hero's name from the first. The empty book was
always one line from being the counter-seal.

**The counter-seal, an eighth time.** In the First Lexicon, under the hero's line, "Keep this one." in the warm hand.

**The Living Lexicon.** The eight fragments together, the Book whole and changing (canon "Charter of the Living Lexicon":
"First SEE the truth of a person. Then SHELTER their right to exist. Finally let them CHOOSE the name and future that they
carry. A name is never a chain."). How the names go back is the hero's choice (canon, permanent on the save).

### What the player knows by the credits
The lists were written by the First Keeper, who became the Eraser because he believed forgetting is mercy, and who had
taken his own name off the world. The hero's name is his: Nox gave it to the child he could not write or rub out, so it
would be said kindly every day. The hero was born in the Scriptorium to Sable the Bookbinder, who gave them up to be named.
Vex kept the first page from the Eraser for sixteen years; the hero put it on the shelf, the First Keeper said Nox's name,
the names went home the way the hero chose, and the thirteenth bell finally said whose name it rang for.

### What stays open on purpose
The hero's father (never mentioned, never implied). The war of the nameless (a canon phrase, never explained). The three
dark-star Keepers of X1 (lore names). The Rootbound Archive's last Keeper (nameless by design, EPISODE1, LEDGER). How old the
First Keeper is, and how old the hero is (never said). The Deep Stacks' hundredth floor. And the empty last page itself: "ready
for the next story" (canon) is an ending, not a sequel hook (open choice 1).

---

## 6. Is Episode 8 the finale? What the ending pays, the credits, the post-game

### 6.1 The finale (open choice 1, default: yes)

**Default: Episode 8 ends the main story.** Reasons, all Fact from the root game (grepped 2026-11-10):
1. `rpg-data.js` `REGIONS` has **exactly eight** records; the eighth is "FIRST LIBRARY", "The Last Word", and its ending is
   "You restore the First Lexicon. The world remembers its stories, and begins writing new ones." (canon; its em dash rendered
   as a comma).
2. `CHAPTER_VIII_MILESTONE.md`: "This build contains all eight regions" and "Defeating the Eraser completes the eight-realm
   campaign and opens a permanent choice for that save".
3. `rpg-engine.js` marks the save `complete` after region 8 and ends with "every town remains open for exploration".
4. There is **no** `rpg-chapter9.js`, no `CHAPTER_IX_MILESTONE.md`, and no ninth region or chapter anywhere in the root's
   `*.js`, `*.md` or `*.json` (grep for "chapter ix", "ninth region", "region 9", "chapter 9": no hits).
5. The LEGACY layer agrees: `RIVAL_SCENES` has eight scenes, the eighth "The Last Margin" at the First Library; "Two
   alternating layouts support eight chapters."
6. NEXT's own threads converge here (section 7): every list traced, the hero's name explained, the Ledger's last row.

**Alternatives** (none blocks the build): (a) split the finale into Episode 8 (to the Eraser) and a short Episode 9 (the
ending and home), which would leave Episode 8 a cliffhanger at the Last Word; (b) end the main story here but write the empty
last page as a hook for a sequel. The default does neither: "ready for the next story" is the player's, not a promise.

### 6.2 What the ending pays (in order on screen)

1. The Eraser lays down his pen and is named (Episodes 1 to 7: who writes the lists).
2. The First Lexicon, the eighth fragment, and "Keep this one." an eighth time.
3. The First Keeper gives the hero the name; says Nox's (Episode 7: her name taken).
4. The canon final choice, its two canon endings, permanent on the save (root canon).
5. The first page on the shelf (Episode 6: LET NOTHING REACH THE SHELF), the eighth star's sign (Episode 5), the hero's
   Ledger row kept (Episode 1's "Not yet kept."), the last page turned (root canon).
6. The witness line, five or more witness quests or fewer (root canon, NEXT's quests: plan 5.3).
7. The Scriptorium finished: Meya's name, Mira the teacher (LEGACY), Sable's gift, Vex stops moving (LEGACY), Nox stays.
8. Home: Hazel's question (Episode 1's blanket and "Someone loved you enough to choose it."; she was right about who).
9. The thirteenth name (Episode 1's cold open: "whose name was the thirteenth?").

### 6.3 The credits (`CREDITS_EP8`, music `the_last_word`)

The whole game's credits, once, in place of an episode's. Order: the end title; the cast by place, in the order the player
met them (Willowmere to the First Library, every named person in the Ledger's order, the party last); between the places,
the root's epilogue sentences, word for word, one card each over that realm's existing key art (no new art): "Mira opens the
mirrors and shows the names she recovered." (Hollowmere), "Bram rings Mara's forge bell one last time." (Emberpeak), "Regent
Lyra reads the amended charter to her city." (Valewyn), "Sel sends caravans home." (Saffron Haven), "Aeris signals the missing
pilots." (Zephyr Landing), "Nox opens the northward gates." (Palehaven), with the curly apostrophe of "Mara's" made
straight; then the chosen ending's banner; then the makers, "From the playtesters" (AGENTS.md: no kids' names), every art and
music source as the repo's provenance files state them; the last card: "Names kept: N of M" from this save. No real person
is named or thanked (decision A). About 5 minutes; confirm skips to the end title after the first play-through of it.

### 6.4 After the end: the post-game

- **The save.** It wakes at `hero_home` the next morning and carries on as an ordinary save (plan 10.8): every map open, the
  Stair two-way from the Stillheart roof, the Library's floors open with their fonts (no boss returns), the Scriptorium "An
  Open Library", every resident with a post-game line. The final choice stays as chosen; the Journal's last page shows it.
- **Fine Print** stays exactly as shipped (TIER.md): it unlocks on `ep3_complete` (old saves keep it), plays Episode 1 again
  with a carried party, and never enters Episodes 4 to 8 (open choice 19). A finished Episode 8 record is a finished record:
  it can be carried into Fine Print, which never touches its slot. Scott's decision C ("difficulty settings that unlock after
  successfully completing the game") is now literally possible; whether Fine Print should reach later episodes is a separate
  issue, not this episode's (open choice 19).
- **The Deep Stacks** stay as shipped (the trapdoor from `ep1_complete`, a hundred floors, the base game's curve); Hollis
  gains one line. A finished party is strong for the early floors; the Stacks' own curve already handles that.
- **The Ledger.** The hero's row is kept by `hero_kept`; the eight Scriptorium and Library rows join (plan 5.3); the title
  counter can now read "Names kept: N of N" for a save that kept everyone.
- **Vows** keep working at every rest, the Episode 8 fonts included; nothing new.
- **The X1 and X2 expansions.** X1 (the Wider Valley, Episode 1's expansion) is live and stays fully open after the end;
  Hesper gains one Orrery line about the eighth ring. X2 (the Mere Country, Episode 2's expansion) is not live (`X2_LIVE =
  false`, Fact); Episode 8 adds nothing to it, and if it ships later its writer adds one post-game line per Mere Country
  resident.
- **What the post-game does not add:** no New Game+, no boss rush, no replayed ending. The bell can be heard again: the bell
  tower's top step gains an inspect, "Listen", that replays the thirteenth toll and the name with no flag and no save.

---

## 7. Every open thread, Episodes 1 to 7, and where it is paid

Grepped 2026-11-10 across `docs/story/EPISODE1.md` to `EPISODE7.md` for "held", "kept for", "Episode 8", "later episode",
plus the Ledger's open rows and the cold open's question.

| Thread | Opened | Paid | How |
|---|---|---|---|
| Who writes the lists | E1, every episode's "Held back" | **E8** `keeper_memory_b`, `the_name`, `eraser` | The First Keeper, as the Librarian and the Eraser (root canon) |
| Why the hero's name is on the list, never crossed out | E1 section 5 | **E8** `the_name` | It is his name; he could not cross it out |
| Whose name the thirteenth toll rang for (the cold open) | E1 scene 1 | **E8** `thirteenth_name` | The hero's, tolled at last (E2 paid the Episode 1 ending's toll for Aurel; the cold open's silent thirteenth was never said: inference) |
| Tess's father | E1 | E7 (Marten) | Episode 8 touches it in one line and the post-game |
| Bram's mother, Mara | E1 | E3 | Credits card: "Bram rings Mara's forge bell one last time." |
| Mira's promise at the Court | E1 | E2 | |
| The century-old order and the Keeper who refused | E1 section 5 | **E8** `keeper_memory_b` | Shown; the refusing Keeper stays nameless |
| "A Keeper pledged that no name could be erased without a living witness." | E1 hidden ink | **E8** `keeper_memory_b`, the Concordance | Her line in the memory; the living witnesses' quest |
| The blanket, "Someone loved you enough to choose it." | E1 | **E8** `sable_bindery`, `home`, post-game | Sable wove the cloth; Nox chose the name |
| Why the hero's name was written twice (in every fragment) | E2 | **E8** lore, `the_name` | Nox wrote it into each fragment so no single list could take it |
| The seal of the empty book | E2 | **E8** `library_door`, `last_page` | The First Library's seal; it becomes the counter-seal |
| The Court's forgotten Keeper | E2 | E7 (choice 5) | |
| What Vex wants | E2, E3 | **E8** `eraser`, `scriptorium_open` | To set the page down and stop moving |
| Who stamps the hero's name (the one-line seal) | E3 | E7 | |
| Mara's valley bell | E3 | E7 | |
| Who wrote "Keep this one." | E4 | E7 | E8 shows it an eighth time |
| Whose name Vex would not hand over | E4 | E7 | |
| Who asked Vex | E5 | E6 | |
| The mural's eighth star with no symbol | E5 | **E8** `last_page` | The First Library's star takes the counter-seal's sign |
| The Cloud Library is not the First Library | E6 | **E8** | The real one |
| THE FIRST PAGE. LET NOTHING REACH THE SHELF. | E6 | **E8** `the_name`, `last_page` | The shelf, and the page on it |
| The First Keeper's name | E7 (choice 10) | **E8** `the_name` | The hero's |
| Why the hero; where they came from before Nox; what the list-writer wants with their beginning | E6, E7 | **E8** `keeper_memory_c`, `sable_bindery`, `the_name` | Born to Sable; carried by the First Keeper; he wants the page so his name can end |
| Vex's "I kept one thing from the Eraser: your beginning. You keep the ending." | LEGACY, E6, E7 | **E8** `eraser` | Word for word |
| Nox: "Where you came from is not mine to tell. It's written somewhere I can't go." | E7 | **E8** `keeper_memory_c` | The Index's memory; she could not enter without her name |
| Nox: "I'll say the name you'll need up there." / "Ask me at the top." | E7 | **E8** `ep8_morning`, `the_name` | |
| Nox's root after-clear line | E7 choice 19 | **E8** `ep8_morning` | Word for word |
| The First Key (root reward, dropped in E7: "Episode 8 may use a key") | E7 | **E8** | The canon Original Ink Key is the key; the "First Key" stays dropped |
| The hero's Ledger row, "Not yet kept." | E1 (Ledger) | **E8** `last_page` | `hero_kept` |
| Mira wants to teach (LEGACY) | LEGACY | **E8** `scriptorium_open` | "Questions first." |
| Bram's kitchen (LEGACY) | LEGACY | **E8** post-game Talk | Word for word |
| The hero's father | never opened | **stays open** | Never mentioned |
| The war of the nameless | root canon | **stays open** | A canon phrase only |
| The three dark-star Keepers | X1 | **stays open** | Lore names; Hesper's eighth-ring line only |
| The Rootbound Archive's last Keeper's name | E1 | **stays open** | Nameless by design |
| The hero's and the First Keeper's ages | E7 section 8 | **stays open** | Never said on screen |
| The Deep Stacks' depths | Deep Stacks | **stays open** | Post-game, unchanged |
| X2, the Mere Country | X2 plan | **stays open** | Not live; nothing added |

---

## 8. Canon reconciliation (root game to NEXT)

**Kept from the root game.** The First Library and "The Last Word"; the region intro ("At the center of existence stands a
library whose pages contain every possible name.") and talk ("The Eraser was once the First Keeper. He believes forgetting
is mercy.", said by Nox; its third sentence, "Show him why the world deserves to remember.", is what the episode does, not a
line); the First Keeper (npc), the Eraser (boss) and the Living Lexicon (reward, as the eighth fragment, the First Lexicon);
the region ending (as the canon sentence on the end and the shape of `last_page`); the Scriptorium, "First Library
Enclave", its flavor ("The final inhabited street is built of marble pages and ink-dark canals. Book towers stand where
houses should be.") and its after-clear title "An Open Library"; the services Keeper's Quiet Rooms, Bibliotheca Supplies,
Glyphsmith Atelier, First Library Index, The First Keeper (as the Librarian at the Index) and South Margin (the Stair's top
gate); the Living Codex and its words; the interior titles Scriptorium Host, Archive Keeper and Glyphsmith; the townsfolk Iona
(through Ione), Quinn, Sorel, Arun and Meya and their lines (one of Quinn's dropped); the witnesses Ione, Tamsin (as Sable)
and Fen and their lines; the Living Concordance in the town square and its rewards (potions, ethers, +25 Focus as +25 Fury);
the three floors and their names (I The Catalog of Lost Lives, II The Palimpsest Galleries, III The Unwritten Page) and their
flavor in spirit ("Every erased name is stored in a separate alcove.", "The Library revises its own pages.", "the Eraser has
been waiting to hear an answer"); the Original Ink Key on the northern shelf and the Original Ink Keyhole; the Restoring
Fountain of Names (the fonts), the Forgotten Traveler Satchel (a chest's name); the Archive of Uncensored Lives and its three
evidence pages (The Names, The Order, The Correction); the Charter of the Living Lexicon, word for word, and the promises SEE,
SHELTER, CHOOSE (as F3's three landings and the three party roles); the tile vocabulary `inkwall`, `parchment`, `letterpath`,
`vellum`, `scriptmosaic`, `goldscript` and decor `booktower`, `quill`, `pagefountain`, `goldscroll`; the enemy names Catalog
Wraith, The Unnamed Sentry and Inkbound Librarian; two of the First Keeper's memories by title and words ("The First Duty":
"Names are windows, not chains." and "the war of the nameless made him afraid"; "The Order That Changed Everything") and
the third's title and sentence ("The Last Unwritten Name": "No life can be stored without letting it change.", with Mira's
and Bram's canon replies); the Eraser (name; look from bosses cell 7: "looming violet void entity surrounded by floating
erased book pages, an ominous empty white face and black robes"), **all four canon phases** (Closed Book: weak to pierce,
resists ice, armored; Rejected Truths: Grief and Change, the Erasure Ward, the boss undefeatable while it holds; The Keeper
Remembers: the ward breaks, armor weakens, weak to fire, +30 Focus as +30 Fury; The Last Silence: charged erasures
accelerate, interrupt or guard), the canon thresholds (70%, the 32% floor, 26%) and the Rejected Truths' weaknesses (Grief
weak fire, resists ice; Change weak pierce, resists fire) and roles (mender, warder); the permanent final choice, its two
labels, its two conclusion texts, its two titles and the witness-count lines, word for word (the save keeps the choice:
"Your final decision is permanent on this save."); the epilogue sentences for Mira, Bram, Sel, Aeris, Nox and Lyra (as the
credits' cards); "{hero} turns the final page. It is empty, ready for the next story."; the First Keeper's after-clear line;
Nox's after-clear line (Episode 7 held it for here); portraits cell 7 (the First Keeper), bosses cell 7 (the Eraser),
environments cell 7 (the Library: "colossal impossibly tall library, books and glyphs circling a central luminous open book,
violet void and warm golden light") for the backdrops, decals and key art; the Runway briefs chapter-8 ("Rise slowly toward
the suspended open book. Pages and golden glyphs orbit at an unhurried pace while violet light illuminates the monumental
shelves.") and boss-8 ("Violet void folds into black robes, empty pages orbit, and a silent white face becomes visible.") as
staging briefs for the code-drawn scenes; the region-8 Suno brief (celesta, harpsichord, solo violin, deep luminous pads and
gentle orchestral pulse, immense magical library and recovered wisdom, 88 BPM) as the town theme's brief for the in-repo
tracker; LEGACY: "The Last Margin" and its line word for word, the BOSS_SCENES Eraser record's mid and victory lines, the
camp lines of Mira and Bram, Mira's and Bram's last companion lines, Indexhaven's "Sable the Binder" (the name) and its
secret ("The original record was deliberately left unfinished so its ending could be chosen."), and the Forbidden Appendix's
"The Eraser is forced to remember its own name." (the shape of `eraser_after`, not a line).

**Changed, with reasons.**
- **Word and order puzzles are gone** (DESIGN hard rule 2; Episodes 3 to 7 did the same). F1's three Index Engines cycling
  VOID, NAME, MEMORY, CHOICE with a printed rule, F2's printing plates cycling BLANK, WITNESS, RESTORE, the DESTINY
  crossword, the evidence pages read in order, and F3's promises read in order are all replaced: the floors open by pop-up
  books (plan 5.1), the evidence pages are found in any order, and SEE, SHELTER, CHOOSE are inscriptions, never an order to
  get right. Quinn's "read backwards" line is dropped.
- **Redaction-ink damage is gone** (no damage tiles: phone players). The void is never a hurting floor. The Concordance's
  canon "redaction-ink damage reduced from 10 to 2 HP" becomes a rest point and the Fury bonus.
- **Tamsin becomes Sable.** NEXT already ships a Tamsin (X1's weaver at the Loom House, `src/data/maps/x1_loomhouse.js`,
  Ledger row `tamsin`). Two Tamsins would read as one woman. The LEGACY Indexhaven record names a binder of the First Library,
  "Sable the Binder"; Sable is grepped free. Canon Tamsin's title (Bookbinder) and testimony are kept word for word.
- **Iona and Ione are one.** Canon has Ione the Archivist of True Names (a witness) and Iona the Indexer (townsfolk) in the
  same street: one woman here, both sets of lines hers (the Episode 7 Eira precedent).
- **The Librarian, the Eraser and the First Keeper are one man in three records** (inference, open choice 4). Root has a
  town npc "The First Keeper" at the Index and a boss "The Eraser" labelled "The Eraser, First Keeper", and says the Eraser
  "was once the First Keeper"; its after-clear npc speaks of "what I erased". NEXT keeps one man and shows the three as looks:
  the nameless Librarian (hood up), the Eraser (the white face), the First Keeper (the face come back). The root's pre-fight
  instruction to "speak to the First Keeper ... learn why the Library tried to erase the seven realms" becomes the Librarian
  scene, unrecognized.
- **The First Keeper's name is the hero's** (new; inference from root's "the North forget every soul who could still speak the
  First Keeper's true name", LEGACY "The Eraser is forced to remember its own name", Episode 1's "at the bottom the hero's,
  not crossed out", and EPISODE7's held name). Root never gives the name; NEXT's hero name is the player's, so the name is
  never a word anyone must spell or guess (DESIGN hard rule 2 holds).
- **Memory 3 is re-aimed.** Canon "The Last Unwritten Name" is the oldest page with one sentence. Here the sentence stays on
  the page, and the memory shows the last name he could not write: the baby. The dungeon's three memory labels ("The First
  Keeper's Impossible Order", "The First Alteration", "The Book the Keeper Hid") give way to the engine's three scene titles;
  the third label becomes the Archive's book title.
- **The Living Lexicon Oath** (an opening two-turn Aegis, +40 Focus, one automatic cancel of the charged deletion) is not a
  bond: NEXT has no bond system. The three memories are main-path scenes, and the cancel is the hero's Answer, which the
  player casts.
- **The Last Silence's answer is the hero's Answer** (inference from root F3: "Read Mira, Bram and your own witness lines;
  the Eraser has been waiting to hear an answer.") and the old "Pierce to interrupt" is Break, the charge rule.
- **Four phases, not three.** Episodes 4 to 7 folded root's fourth phase into the third. The finale keeps all four (open
  choice 17): it is the last boss, and the third phase's name, "The Keeper Remembers", is the story's turn.
- **The reward "Living Lexicon"** becomes the eighth fragment, `name_fragment_8`, "The First Lexicon" (the root ending's own
  words); the Living Lexicon is the eight together.
- **The final choice is kept, permanent.** NEXT's truth choices are "small and honest, never a locked route" (decision D); the
  final choice is not a truth choice and locks no route: both endings are the same game with a different epilogue, as root.
  It cannot be dismissed (no cancel), so root's "Field Menu, Finish the Last Page" fallback is not needed.
- **"Carrying the first page he stole in Willowmere"** (LEGACY): NEXT's page was given to Vex by a Keeper's letter (Episode 6),
  so the LEGACY line keeps its words and the scene drops "stole".
- **The LEGACY hero line "Then let us write the ending together."** is dropped (the hero never speaks in a box); Mira's and
  Bram's camp lines are kept.
- **The hero's mother** (new, open choice 5). Root never says where the hero came from; EPISODE7 promised it was written in
  the Library. Sable is the smallest answer that pays Hazel's blanket, Nox's "not mine to tell", and the Scriptorium's custom.
- **The Unnamed Sentry is the mini-boss.** Root Chapter VIII has no mini-boss; NEXT episodes have one on the middle floor. It
  grows from the canon ordinary foe on F2's floor, as Episode 7 grew the Pale Lantern.
- **The region index.** The root code calls this region index 7 (`r===7`); its Suno brief "region-8". NEXT calls it Episode 8;
  nothing depends on the root index.
- **New:** Vex's note; the Stair of Written Light as a map (root has the ending sentence only); the Index Hounds and the other
  new foes; Erasure and Read Aloud; pop-up books and the seven realm books; the rubbed-out signs; Meya's word; the reader's
  card; Sable's cloth; the faceless figure on the stair; the Rootbound Keeper in memory 2; the baby and "I could not."; the
  name; the shelf; the eighth star's sign; "This one was kept."; the bell bookend; Quinn's Drifting Pages; the post-game lines.

**Root canon this bible could not reconcile, and leaves open.**
- **The region record's Episode 7 talk**, "The Eraser has nearly reached the First Library. Only the names you recovered can
  hold reality together.", says the Eraser is travelling toward the Library; in NEXT he has lived in it for a century. Not
  used (Episode 7 also left it).
- **Iona's third line**, "The First Keeper knows what the Eraser believed forgetting would accomplish.", treats them as two
  people. Held until after the fight, where it reads true of a man who knows his own mind.
- **The two sets of memory titles** (the dungeon's labels and the engine's scenes) disagree; the engine's are used.
- **The witness count.** Root counts eight specific side quests (`lq:bell:done` to `lq:first:concordance`); NEXT's
  equivalents are each episode's witness quest (plan 5.3; mapping is inference, E8-story names the flags).
- **The root cinematics `assets/cinematics/chapter-8.mp4` and `boss-8.mp4` exist** (Fact) but neither is named in
  `RUNWAY_PROVENANCE.json` (Fact: grepped 2026-11-10). The build does not use them; their use in a game that may be sold is
  Scott's call (plan 9.5).
- **Timeline.** Canon never dates the order, the lists, or the hero's birth. The century, the twenty-six, sixteen and ten
  years are fitted to Episodes 1 to 7; none but Vex's "sixteen" (Episode 7) and Nox's "twenty-six" and "ten" is said.

**Name collisions to respect** (grepped 2026-11-10 against `src/`, `assets/` and `docs/`). Taken and avoided: `tamsin` (X1),
`smudge` (an Episode 6 skill), `strikethrough` (Fine Print), `keeper_note` (an Episode 4 sign), `nameplate`, `popup` and
`popups` (the number popups in `src/ui/numberPopup.js`), the Ep7 proposal's ids (`call_name`, `remember`, `namestone`, every
`ep7_` id), `grief` (Episode 2's reflection of grief is its own id: Episode 8's are `truth_grief` and `truth_change`), the
word `scriptorium` (an Episode 4 map mark and text key: the music id is `scriptorium_town`, the map `ep8_scriptorium`).
Episode 8 uses: map ids `ep8_*`; encounter prefixes `e8s_` (the Stair), `e8l1_`, `e8l2_`, `e8l3_` (the Library floors); NPCs
`ep8_librarian`, `eraser_v`, `first_keeper`, `first_keeper_m`, `sable`, `sable_m`, `ione`, `fen`, `quinn`, `sorel`, `arun`,
`meya`, `ep8_innkeeper`, `ep8_shopkeeper`; testimonies `testimony_ione`, `testimony_fen`, `testimony_sable`; memories
`keeper_memory_a` to `_c`; the skill `read_aloud`; the event type `popbook` and map block `popbooks`; the battle rule module
`erasure.js`; the boss moves `unwrite`, `last_silence`, `rub_out`, `weep_ink`, `stand_in`. Full registry: plan section 2.

---

## 9. Build notes

Reserved for E8-story (wave 8a): what the built script does beyond the beat sheet (deltas only, as EPISODE6 section 9).

---

## 10. Episode 8 by the numbers (for the writers)

About 31 beats and 37 registered scenes (27 main and chained, 8 side, 2 silent; under 40 built), 8 new named residents (Sable,
Ione, Fen, Quinn, Sorel, Arun, Meya, and the Librarian in three records) plus the First Keeper and a young binder in memory and
the Rootbound Keeper (nameless), two counter NPCs (the Scriptorium Host, the Archive Keeper), 3 side stories, 3 books
(`keeper_hid`, `living_charter`, `concordance_folio`), 9 banners (the Scriptorium's has two states), about 32 inspect lines
(the stair's lines, the void, books closed and open, the realm pop-ups, the half-signs before and after, the dry pens, the
Living Codex, the Concordance folio, the bindery bolts, the card drawers, the Index desk, the empty seal before and after,
alcoves, overwritten pages, the printing room, the evidence pages, SEE, SHELTER and CHOOSE, the Charter, the keyhole, the
great book, the first shelf, the dome and its stars, the Lexicon, the blanket's third line, the bell tower's Listen), seven
close-up page kinds (plan 9.4), and the credits. Party chat (Talk) needs a hint for each main step on each map, in the house
style, naming the next action ("Open the willow book from this side; its pages fall away from you"), and must name something
doable after `ep8_complete` (the Deep Stacks, Fine Print, the Concordance if missed, the Ledger's faded names).

---

## 11. Choices that are Scott's or Stephen's

None of these blocks the build; the default is what the build agents use. Each has one line of why. Either Scott or Stephen
may change any of them; the story is joint.

1. **Episode 8 is the finale of the main story** (credits for the whole game, a post-game, no sequel hook). [default: yes]
   The root has exactly eight regions and its eighth closes the campaign (section 6.1); the alternatives are a short Episode 9
   or a sequel hook on the empty page.
2. **Whose episode: Mira's, with the hero at the heart of the twist; Nox and Vex as non-fighting guests.** [default: yes] The
   rotation comes to Mira, root's last promise for her is SEE, and the hero's name is the twist either way.
3. **The First Keeper's name is the hero's own name, given by Nox on purpose.** [default: yes] It answers why the hero, why
   the lists never cross it out and what the sky's list wanted, with no new word to spell; the alternative (a new name, e.g.
   one Nox says and nobody shares) keeps the hero only as the child he carried.
4. **The Librarian, the Eraser and the First Keeper are one man** (three records, three looks). [default: yes] Root says the
   Eraser "was once the First Keeper" and has the npc speak of "what I erased"; the alternative is a Keeper construct called
   the Eraser (the house pattern) beside a penitent First Keeper.
5. **The hero was born in the Scriptorium to Sable the Bookbinder, carried to the Index to be written, and taken down the
   stair by the First Keeper.** [default: yes] It pays the blanket, "not mine to tell" and the Scriptorium's custom; the
   alternatives are no parent shown (the cloth and the note only) or a parent who is not alive.
6. **Sable is alive, knows the hero by the cloth, and does not ask for them back; Hazel stays home.** [default: yes] A
   reunion that keeps Hazel as the hero's home; cut the line "I'm not going to ask for you back" only if Sable should stay in
   the hero's life.
7. **Tamsin becomes Sable** (X1 owns Tamsin), with LEGACY's binder name. [default: Sable] Any free name works.
8. **Iona and Ione are one woman, Ione.** [default: yes] Two near-identical names in one street read as a typo.
9. **Nox climbs, says the name at the keyhole, and stays in the Scriptorium after.** [default: yes] Episode 7 promised it
   ("Ask me at the top."); if Episode 7 choice 10 takes its alternative, Ione says the name (section 0.1).
10. **Vex goes up ahead, arrives at the Last Word with the whole page and says the LEGACY line, then stays to mend
    bindings.** [default: yes] The LEGACY scene, word for word, and an end to "why I keep moving".
11. **Truth choices: three** (Nox, "Are you frightened?"; Sable, "Did you ever wonder who left you?"; Hazel, "Did you find
    them?"). [default: three, small and honest] RESPONSIBILITY_ARC decision D; each changes one line or one gift.
12. **The canon final choice, permanent on the save, both canon endings word for word.** [default: kept] Root canon; the
    alternative is one ending, which drops the hero's CHOOSE.
13. **The eighth star takes the counter-seal's sign** when the page reaches the shelf; Saffron Haven's mural shows it after.
    [default: yes] It pays Episode 5 with a picture and joins the empty seal to the counter-seal.
14. **The bookend: the cold open played again, the thirteenth toll showing the hero's name; the card "This one was kept."**
    [default: yes] The game's first question, answered by the same staging.
15. **The witness line counts each episode's witness quest** (five or more of eight). [default: yes] Root's rule over NEXT's
    quests (plan 5.3).
16. **Erasure is called "rubbed out" in player text.** [default: "rubbed out"] Plainer for kids than "erased" or "redacted".
17. **The Eraser keeps all four canon phases** (the first NEXT boss to do so). [default: four] The finale, and "The Keeper
    Remembers" is the story's turn; the alternative folds phase 4 into 3 as Episodes 4 to 7 did.
18. **Answer returns for the Last Silence; no earlier battle rule returns.** [default: yes] Two rules at once break the
    phone read; one returning skill with one named job keeps it (plan 6.5). The alternative is Read Aloud answering every
    telegraph.
19. **Fine Print and Episode 8.** Fine Print does not enter Episode 8 (`ep8_morning` needs `not tier_1`) and its unlock stays
    `ep3_complete`. [default: base game only] The same call as Episodes 4 to 7; whether Fine Print should later reach every
    episode is a separate issue.
20. **The pacing number: 70 to 100 minutes, planned at 84.** [default: 84] The finale's extra minutes are the ending's; the
    playable part keeps Episode 7's density.
21. **Cards.** Episode 8's title card "Episode 8: The Last Word / The lists were written here." (Episode 7 ask 1); the end
    title "Lexicon Quest / The End"; the cold open's card plus "This one was kept." [default: as written] All within 42
    characters and naming only canon places.
22. **The First Keeper's portrait is the held `hooded_sage` cell, shown only after his face comes back; no paid art or music.**
    [default: yes, no paid items] The cell was held four episodes for him; plan 9.5 lists the optional paid items for
    Scott's own go.
23. **Renames and drops for canon conflicts:** Tamsin to Sable, Iona into Ione, Quinn's backwards line dropped, Iona's third
    line held, the memory labels to the engine titles, the Oath bond into Answer, no ink damage, no engines, plates,
    crossword or ordered pages and promises, "stole" dropped from the LEGACY scene, the LEGACY hero line dropped, the root's
    Episode 7 Eraser line unused. [default: as listed] Each follows a hard rule, an id collision or the silent hero.
24. **Shipping.** Episode 8 is built behind `EP8_LIVE` on a build branch after Episode 7 is merged; E8-integrate flips it on
    the branch only after the full gate list. Shipping to players stays Scott's or Stephen's explicit word.
