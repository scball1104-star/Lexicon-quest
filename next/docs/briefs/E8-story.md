# E8-story: the Episode 8 script, cast, quests, credits and post-game, as pack modules (wave 8a)

Write Episode 8's words, the whole game's credits, and every town's post-game line.

## Inputs (read first, in this order)

The repo's `AGENTS.md`, `docs/briefs/COMMON.md`, `DESIGN.md`, `docs/story/EPISODE8.md` (your contract: all of it), plan
`docs/EPISODE8_PLAN.md` sections 0.1, 2, 3, 4.11, 5.1 (barks), 5.2, 5.3, 8.3 (cues), 9.4 (close-up kinds) and 10.8; for voice
`docs/story/EPISODE1.md` sections 1, 3 and 4 (the cold open, Hazel, the blanket, the truth choices), `EPISODE7.md` sections 3
and 4 (Nox, Vex), `STAGING_EP7.md` (your staging file's model), `RESPONSIBILITY_ARC.md` section 0, `LEDGER.md`. Model the code
on `src/data/ep7/story.js`, `npcs.js`, `quests.js`, `text.js`, `ledger.js` (registration by mutation).

## Owned paths

`src/data/ep8/{flags,npcs,quests,text,story,ledger,credits}.js`, `docs/story/STAGING_EP8.md`, `docs/story/EPISODE8.md`
(section 9 only), `qa/content/ep8_*`. Never a core data file and never an `ep7` file.

## Outputs (items, in order)

1. **`flags.js`**: every flag of plan 2.2 with a one-line meaning, pushed onto `FLAG_IDS`.
2. **`story.js`**: every scene of the bible's section 1 and plan 2.5: 37 registered (27 main and chained, 8 side, 2 silent).
   `ep8_morning` also requires `EP8_LIVE`, counter `credits7_rolled` and not `tier_1`; every other scene needs a flag only an
   Episode 8 scene sets. The speaker swap across **three** records ("The Librarian" `ep8_librarian`, "The Eraser" `eraser_v`,
   "The First Keeper" `first_keeper`). The three truth choices set `afraid_yes`/`afraid_no` (one line in `the_name`),
   `told_elowen`/`spared_elowen` (Elowen's gift), `told_hazel`/`spared_hazel` (Hazel's post-game line). `last_choice` sets
   `ending_return` or `ending_choose`, asks once more before it commits (plan 14), and never runs again.
3. **The first five minutes** (the bible's table) are the spec: control by about 0:45, the note by 0:30, Nox's choice by 2:20,
   the fight by 4:00. Keep `ep8_morning` to 6 boxes.
4. **Staging, camera, showing:** marks two tiles from the speaker first; focus marks at least 12 tiles from a map's sides and 7
   from top and bottom (list them in STAGING_EP8 with their distances); the seven payoffs call `s.closeup('ep8_note' |
   'ep8_card' | 'ep8_seal' | 'ep8_first_word' | 'ep8_could_not' | 'ep8_shelf' | 'ep8_last_page', { mode })` behind a
   `PAGE_KINDS[kind]` guard (narration fallback until E8-tiles lands them), each mode on the box that says it.
   `thirteenth_name` reuses the cold open's toll scripts' shape (`src/data/story/ep1.js`) as new `ep8_toll_*` scripts on
   `ep8_bell_night`: no box, the twelve names in the cold open's order, the hero's name at the thirteenth, the two cards.
5. **Box budgets**: at most 12 per main scene, except `elowen_scriptorium` 14, `keeper_memory_c` 16, `the_name` 16, `eraser` 16,
   `eraser_after` 18, `last_page` 16, `scriptorium_open` 16, `home` 14; about 215 on the main path. Count them in a test.
6. **`npcs.js`**: the Scriptorium cast (`elowen`, `ione`, `fen`, `quinn`, `sorel`, `arun`, `meya`, `ep8_innkeeper`,
   `ep8_shopkeeper`, `ep8_librarian`) with stages (`scriptorium_arrived`, `read_learned`, `library_open`, `keeper_named`,
   `scriptorium_open`, `ep8_complete`); the held canon lines of bible section 3 (Ione's, Arun's, Meya's thirds) on their flags;
   Quinn's backwards line never used. Episode 8 and post-game lines for every earlier town through `prependTalk` (Palehaven,
   Zephyr Landing, Saffron Haven, Valewyn, Emberpeak, Hollowmere, Willowmere: Hazel's two lines by `told_hazel`, Tess's, Mael's;
   Bram's LEGACY kitchen line word for word as his post-game Talk; Hollis's line in the Deep Stacks; Hesper's only when X1 is
   live). The First Keeper as a post-game resident at the Index with the canon after-clear line.
7. **`quests.js`**: `MAIN_QUEST_EP8` (steps `up` (the Watch, the roof), `stair`, `scriptorium` (the word, the Librarian, the
   door), `library_f1`, `library_f2`, `library_f3`, `eraser`, `ending`, `home`, `epilogue8`), map-aware Talk in Mira's and Bram's
   voices that **names the action** ("Open the willow book from this side; its pages fall away from you"), the three side quests
   with plan 7 rewards, `epilogue8` naming post-game things (the Deep Stacks, Fine Print, missed quests, the Ledger's faded
   names); while `EP8_LIVE`, `epilogue7` Talk points at the Watch's door and the nave door only. The finished journal's last
   entry: "Your closing chapter is written in the Journal." with the chosen ending's title.
8. **`text.js`**: 9 banners (the Scriptorium's conditional), books `keeper_hid`, `living_charter` (the canon Charter, word for
   word), `concordance_folio`, barks of plan 5.1, bestiary for the 11 new foes (each names its erasing moves), the boss cards
   and arc lines (`EP8_BOSS_CARDS`, `EP8_ARC_LINES`, `EP8_BATTLE_TEXT` for E8-scene-ui: "Bram's Attack is rubbed out.", "The
   ink slides off.", "The ink will not take on {hero}.", "Rubbed out. Try something else.", the Unwrite and Last Silence lines,
   the LEGACY phase 4 line), every inspect line of the plan and bible section 10, the realm books' float lines, and **every save
   point's own key** (`ep8_desk`, `ep8_fountain`, `ep8_index_bell`, `ep8_folio`).
9. **`credits.js`**: `CREDITS_EP8` (bible 6.3: the cast by place in Ledger order, the six canon epilogue cards over each realm's
   existing key art id, the chosen ending's banner, the makers, "From the playtesters", sources as the provenance files state
   them, the closing "Names kept" card), `END_TITLE_EP8`, `END_CARD_EP8`, `END_CARD_EP7_LIVE`, `EPISODE8_CARD` ("Episode 8: The
   Last Word" / "The lists were written here."). No real person named or thanked; no kids' names.
10. **`ledger.js`**: the hero's keep on `hero_kept`, the eight new rows, `PLACES`, `REACHED` (plan 5.3), counted only when
    `EP8_LIVE`.
11. **`docs/story/STAGING_EP8.md`**, the witness-quest flags of plan 5.3 confirmed and listed, and EPISODE8 section 9 (deltas
    only).

## Done when

Every scene of the beat sheet and plan 2.5 is registered, inside its budget, staged to listed marks, guarded so nothing is
reachable with `EP8_LIVE` false; `node qa/run.mjs content` is green; the preview reads of "Tests" are done.

## Tests to run

`node qa/run.mjs content`; `python qa/content/preview_dialogue.py` on `ep8_morning`, `elowen_scriptorium`, `keeper_memory_c`,
`the_name`, `eraser`, `eraser_after`, `last_page`, `home`; read them aloud against the tone guide. Tests you add: ids unique
across eight episodes and the X1, cave and tier packs; flags declared; every box within 3 x 42 **with the longest hero name
the name entry allows**; music cues return to the map track; inspect ids resolve; STAGING marks and edge distances; budgets;
nothing reachable with `EP8_LIVE` false or `tier_1`; registers twice without duplicates; **no Scriptorium line before
`keeper_named` calls the Librarian the First Keeper**; **no Episode 8 event uses an earlier episode's text key**; **the hero
never has a speech box**; **`last_choice` cannot run twice**; Mira's two boss tips name levers the data has (pending until
E8-battle lands).

## Traps

- **Collisions** (plan 2): X1 owns `tamsin` (yours is `elowen`); Episode 7 owns `keeper_memory_1` to `_3`, `nox_t`, `vex`
  records (spawn them, never redefine); Episode 1 owns `hazel`, `tess`, `oren`, `mael` (lines through `prependTalk`).
- **The name is the player's.** The name the lists hunt is the hero's own birth name; it is `{hero}` everywhere. Never make
  it an answer, a riddle or a spelling (DESIGN hard rule 2). The First Keeper's own name is never written: on the sworn page
  it is a smudge only he reads (EPISODE8 choice 26).
- **The novel (revision 2, 2026-11-11).** The twist follows Scott's and Stephen's unpublished novel (EPISODE8 section 8,
  "Novel canon"). Use its facts; never quote it; its wording appears only as the few short terms that section names. The
  vault fire is always "the vault fire" or "the fire in the east wing", never plain "the fire" (Emberpeak's since Episode 1).
  The birth line reads "A child", never a son. Elowen is "Keeper of the Scriptorium", never a bookbinder.
- **The hero never speaks in a box**, not even at the bell.
- **Canon lines are word for word** (bible section 8 lists them): the root's region talk, Nox's after-clear line, the final
  choice's labels and conclusions, the witness lines, the canon townsfolk and witness lines, "{hero} turns the final page...",
  the LEGACY Vex line, the BOSS_SCENES lines, the camp lines. Curly apostrophes become straight; em dashes and middle dots
  become commas or colons.
- **Elowen and grief are small.** No tears described, no father, no death added on screen; the vault fire's dead are never
  counted, named or shown; humor never in a memory, at her desk, or near the fire.
- House rules: no git; LF endings; no em dashes; owned paths only; bound every command; never edit `src/data/text.js` or any
  `ep7` file.

## Report (under 400 words)

Scene count and box totals, beat-sheet changes and why, the contracts for maps (marks, spawn ids, sign, book and inspect ids),
battle (encounter ids, `concordance_lit` Fury, `read_learned`, the battle texts), scene-ui (the helpers you need) and the
witness-quest flag list.
