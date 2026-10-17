# W1-content: Episode 1 story, dialogue, NPCs, quests, lore

**Owned paths:** `next/src/data/story/**`, `next/src/data/npcs.js`, `next/src/data/quests.js`,
`next/src/data/text.js`, `next/docs/story/**`, `next/qa/content/**`.

You are the narrative designer and writer. Benchmarks: Chrono Trigger's pacing and character moments, Dragon
Quest's towns full of memorable people, Final Fantasy's event staging. Short, vivid lines. Warmth, wit, and a
growing unease about names disappearing.

## Read first
`next/DESIGN.md` (section 9 is the outline), then the existing story in the repo root: `rpg-chapter1.js`,
`rpg-chapter1-director.js`, `rpg-cinematic-director.js`, `rpg-townsfolk.js`, `rpg-adventure-chronicle.js`,
`REFORGED_REALMS_VISION.md`, `CHAPTER_I_MILESTONE.md`, `EPISODE_ONE_REFINEMENT.md`, and chapter-1 text inside
`rpg-engine.js` (Tess and the letters, Oren, Nella, Elder Mael, the Thirteenth Bell, the Archivore, Lost Pages).
Keep what is good and consistent. Improve the writing. The hero is named by the player: write `{hero}`.

## Deliverables
1. `docs/story/EPISODE1.md`: beat sheet scene by scene (prologue to credits), character bible (hero, Mira, Bram,
   Elder Mael, Tess, Oren, Nella, the hero's guardian, the bellkeeper, others), tone guide, lore of names in
   Aethelgard, what Episode 1 sets up for Episode 2.
2. `docs/story/STAGING.md`: for every scripted scene: map id, where each actor starts and moves, props needed,
   camera moves, music cue. Map authors will place things from this.
3. `src/data/story/ep1.js`: `export const scenes = { id: async (s) => { ... } }` using ONLY the cutscene API in
   DESIGN 5.4 (`say, choice, walk, face, jump, emote, wait, camera.panTo, camera.follow, shake, flash, fade, tint,
   music, sfx, spawn, despawn, setFlag, hasFlag, give, take, battle, addMember, title`). Include the prologue,
   waking up, the fading sign, meeting Mael, Mira joining, Bram joining (the moment he cannot recall his father's
   name), leaving town, the milestone, entering the Archive, each floor's discovery beat, the Echo Warden,
   getting the Lantern of Recall, the boss door, the Archivore before and after, the return to Willowmere,
   the ending hook, and credits text. Also `export const lines = {...}` for signs, books, plaques, inspect text.
4. `src/data/npcs.js`: every NPC (ids and sprite ids from COMMON.md) with name, sprite, map, movement style, and
   dialogue as `talk:[{if:'flag', ifNot:'flag', lines:[...]}, ..., {lines:[...]}]` (first match wins). Each
   townsperson must be a person: a name, a want or worry, a voice, and lines that change after major flags.
   Include small touches: kids playing tag, the cat that will not move, the inn's guest who snores.
5. `src/data/quests.js`: `export const FLAGS` (all flags you use, including COMMON.md main flags), the main quest
   steps with journal text, and **party chat hints** for every step (Chrono Trigger style: the menu has "Talk",
   a companion says in character what to do next, so the player is never lost without a quest marker).
   Side quests: Tess's three letters (one per Archive floor, reward Wayfarer Boots), plus 2 or 3 more small,
   charming ones (for example Oren's runaway starter dough, Nella's ferry bell, a child's lost name-tag) with
   clear rewards (item ids may be placeholders like `reward:'accessory_rare'`; list them in your report).
6. `src/data/text.js`: bestiary lore for every enemy id in COMMON.md, book texts in the library and Archive,
   the location banner names, tutorial-free help lines for menus, and the credits.
7. `qa/content/*.test.mjs`: every referenced scene id exists, all flags used are declared in FLAGS, no em dashes
   anywhere, dialogue boxes fit (wrap each line at 42 characters, max 3 lines per box), no crossword or word-puzzle
   mechanics mentioned.

## Writing rules
No em dashes. Max 3 lines of about 42 characters per text box. One idea per box. Let silence work (use "..."
sparingly). Every companion has a distinct voice: Mira precise and curious with dry humor, Bram warm, blunt and
protective, Mael gentle with a hidden fear. No crosswords or letter puzzles ever. Names matter: signs fade,
people forget each other mid-sentence, the Thirteenth Bell rings for something that should not be remembered.
