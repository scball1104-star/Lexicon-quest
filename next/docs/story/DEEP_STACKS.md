# The Deep Stacks: the Archivist, every line, the plaques

Story and UI bible for the Deep Stacks (`docs/DEEP_STACKS_PLAN.md`), written by C2-story-ui, 2026-10-27.
Scenes and the plaque screen: `src/data/cave/story.js`. Words: `src/data/cave/text.js`.
The title rows: `src/scenes/title.js`. The Journal line: `src/ui/screens/journal.js`. Tests: `qa/cave/story_*.test.mjs`,
`qa/cave/ui_stacks.test.mjs`. Shots: `ui_stacks_plaque`, `ui_title_stacks`, `ui_stacks_hall` in `qa/shots.json`.

Every quoted line below is the line in the code (the text test reads this file and checks). No em dashes anywhere.

---

## 1. Hollis, the Archivist

**Who.** "The one Keeper who stayed down." When the Archive went quiet the other Keepers went up; Hollis stayed to mind the
desk at the top of the Stacks. Sprite `npc_scholar`, no portrait, never moves (`move: 'stand'`). NPC id `hollis`, record
`HOLLIS` in `text.js`, assigned into `NPCS` at register (the X1 way; `npcs.js` is not edited).

**Voice.** Dry, kind. Says what is asked and nothing past it. Short sentences. Never explains the forgetting, never sermonizes,
never uses the word the brief bans. He calls a run "a reading", the dungeon "the Stacks", the vault "your vault", a death "the
book closing on you". He does not say "level" twice in a row.

**Where he stands.** The Entrance Hall under the library (`cave_landing0`), at mark `archivist` (10, 8), behind the long
reading table, facing the party at `party_stop` (10, 10). The table is solid (not a counter), so `install()` lays an
interact trigger across its three cells (`stacks_desk`, 9..11 x 9, script `stacks_talk`): a confirm from `party_stop`
talks across the desk. Walking round to his side and talking to him directly reaches the same two talk entries.

**What else install() adds to the hall** (idempotent by event id and cell; the map file is never edited):

| Event | Cell | Does |
|---|---|---|
| `hollis` (npc) | `archivist` (10, 8) | the talk entries: `stacks_intro` until `deep_stacks_open`, then `stacks_enter` |
| `stacks_desk` (trigger, interact, 3 x 1) | (9..11, 9) | runs `stacks_talk` (the intro the first time, else the offer) |
| `plaque` (sign) | the face above `plaque`, (10, 4) | reads `plaque_hall` |
| `stacks_lectern` (trigger, interact) | the lectern above `record`, (13, 9) | runs `stacks_record` (the record line, the plaque screen) |

---

## 2. The scenes and where they play

All in `story.js`, the `ep1.js` shape (raw function, `cut` wrapper, `SCENE_CONDITIONS`). The pack entry calls
`story.register()` before `world.register()`, so these ids win over `world.js`'s one-line fallbacks.

| Scene | Guard | Plays on | What happens |
|---|---|---|---|
| `stacks_locked` | `ifNot ep1_complete` | `library`, the trapdoor object before the credits | one narration box: `locked` |
| `stacks_talk` | none | `cave_landing0`, the desk trigger | Hollis turns to the party; the intro if `deep_stacks_open` is unset, else the offer |
| `stacks_intro` | `ifNot deep_stacks_open` | `cave_landing0`, Hollis / the desk | `greet`, then the three rules (`rule_1`, `rule_2`, `rule_3`, one box each), sets `deep_stacks_open`, then the offer |
| `stacks_enter` | `if deep_stacks_open` | `cave_landing0`, Hollis / the desk / the stair (`world.js` beforeDoor) | the offer: `offer` + choice [`offer_yes`, `offer_record`, `offer_no`]. Begin: `confirm` + choice [`confirm_yes`, `confirm_no`]; Go down: the vault reminder (once), then `world.beginReading`; Stay: `stay`. The record: `stacks_record`'s body. Not yet (and cancel): nothing |
| `stacks_vault` | `if deep_stacks_open, ifNot stacks_vault_reminded` | `cave_landing0` (chained from the offer) | one box, `vault`, only when `game.cave.vault` is not empty; sets `stacks_vault_reminded` |
| `stacks_return` | none | `cave_landing0`, run by `world.js endReading` on arrival | by `game.cave.lastExit.how`: bank with names (`bank_kept` with the count in words, `bank_kept_2`), bank with none (`bank_none`), die (`die`, then `die_lost` when this run's blues were lost else `die_safe`), quit (`quit`, `quit_2`), clear (`clear`, `clear_2`) |
| `stacks_record` | none | `cave_landing0`, the lectern; also "The record" in the offer | `record_none` (no reading yet), `record_empty` (a record, an empty vault) or `record` (the floor, N of 17), then the plaque screen |
| `stacks_no_save` | none | any floor (the scene form of the refusal; `world.js saveRefused` says the same line itself) | one narration box: `save_refused` |
| `binder_intro` | `ifNot deep_stacks_cleared` | `cave_b100`, run by `world.js cave_binder` before the fight | the camera on `binder`; one box (`binder_intro`, or `binder_retry` with the weakness on a retry); sets `binder_met`; the card `binder_card` / `binder_sub` (what was avoided, the H5 style); shake, flash |
| `binder_cleared` | `if deep_stacks_cleared` | `cave_b100`, run by `world.js clearFlow` before `endReading('clear')` | the camera on `binder`, `name_restore`, one box: `binder_cleared` |

Box budgets (`BOX_BUDGET`): locked 1, talk 8, intro 8, enter 4, vault 1, return 2, record 1, no_save 1, binder_intro 1 (+ the card),
binder_cleared 1. Every path of every scene is explored by `qa/cave/story_scenes.test.mjs`.

**Flags this module declares** (`CAVE_FLAGS`, merged into `FLAGS` and `FLAG_IDS` at register): `deep_stacks_open`,
`deep_stacks_cleared` (set by `game/cave.js clear` and the Binder encounter), `stacks_vault_reminded`, `binder_met`,
`stacks_reading_requested` (fallback only: Begin was chosen while `world.js` had no `beginReading`).

**The two seams past the cutscene API.** The reading begins through `SEAM.world` (a guarded dynamic import of `./world.js`;
`beginReading(engine, game, {})`; a refusal gets `refused`; a missing export only sets `stacks_reading_requested`). The plaque
screen opens through `PROBE.engine` (`globalThis.LQ_ENGINE`): `openPlaqueScreen(engine)` registers the `stacks` scene on first
use and `pushAwait`s it with `plaqueData(game)`. In node both are absent and the scenes say their line and return.

---

## 3. Every line

### 3.1 Hollis and the Stacks (`LINES` in `text.js`)

`{n}` is a count in words (`countNames`), `{floor}` a floor, `{vault}` and `{total}` the vault's numbers (`fillLine`).

| Key | Line |
|---|---|
| `locked` | A trapdoor, iron-banded, sealed with the Keepers' glyph. It does not move. |
| `greet` | Hollis. Keeper, once. The others went up when the Archive went quiet. I stayed down to mind the desk. |
| `rule_1` | Under this hall the Stacks go down a hundred floors. Whoever goes down goes as a first page: level one, empty hands. |
| `rule_2` | What you find down there, the Stacks lend. A red chest lends. A blue chest gives, and a gift you may carry out. |
| `rule_3` | One way up alive: the Keeper's Bookmark. Use it, and the book closes where you stand. Fall, and it closes on you. |
| `offer` | Begin a reading? |
| `offer_yes` | Begin |
| `offer_record` | The record |
| `offer_no` | Not yet |
| `confirm` | Level one. Empty hands. The Stacks lend the rest. Down you go? |
| `confirm_yes` | Go down |
| `confirm_no` | Stay |
| `stay` | The desk is not going anywhere. Neither am I. |
| `refused` | The stair is not taking anyone just now. Come back when the hall is quieter. |
| `vault` | Your vault is not empty. What the Stacks gave you before waits in your pack at the first page. Put it on before you walk. |
| `bank_kept` | {n} kept. The Stacks noticed. |
| `bank_kept_2` | They are yours now, up here and down there. Go and wear them in daylight. |
| `bank_none` | The book is closed and nothing new is kept. B{floor} is written down. That is not nothing. |
| `die` | The Stacks close. You woke here. |
| `die_lost` | They took back what they lent, and this time what they gave. The vault from before is untouched. |
| `die_safe` | They took back what they lent. Nothing of yours went with it. B{floor} is written down. |
| `quit` | You left the Stacks. That reading is lost. |
| `quit_2` | The pages you turned are blank again. The next reading starts at the first. |
| `clear` | The Binder is bound. The Stacks stay open for what is left on the shelves. |
| `clear_2` | You read to the last page. Nobody had. I will write that down, and then I will sit for a while. |
| `record_none` | No page has been turned yet. The record is blank, which is the one honest thing a record can be. |
| `record_empty` | B{floor} is the deepest page anyone has read. The vault is empty. The blue chests are waiting. |
| `record` | B{floor} is the deepest page anyone has read. {vault} of {total} names in the vault. The rest are waiting. |
| `binder_card` | THE BINDER |
| `binder_sub` | Keeper of the Spine. Nobody read to the last page. |
| `binder_intro` | The last shelf. Something is bound to it, and it has been reading you since the first page. |
| `binder_retry` | The Binder waits where you left it. Fire and light trouble the spine; keep them coming. |
| `binder_cleared` | The Binder comes apart along its spine. On the dais lies one quill, still wet. The Stacks are read to the last page. |

Worked example, a bank with three blues: "Three names kept. The Stacks noticed." then `bank_kept_2`.

### 3.2 The strings `world.js` shows on its own (`STACKS_TEXT`)

Read through `world.js textOf(key)`; its `FALLBACK_TEXT` has the same keys and loses to these.

| Key | Line | Where |
|---|---|---|
| `close` | The Stacks close. | the black card on a wipe |
| `bank` | The book closes where you stand. | the card after the Bookmark |
| `quit_ask` | Leave the Stacks? This reading ends here. What it gave goes back on the shelf. | the menu's Quit inside a run |
| `quit_yes` | Leave | its first option |
| `quit_no` | Stay | its cancel option |
| `bank_ask` | Close the book here? | the Bookmark from Items |
| `bank_yes` | Close it | its first option |
| `bank_no` | Not yet | its cancel option |
| `save_refused` | The Stacks keep their own pages. | Save, or a font, inside a run |
| `floor_tag` | B{n} | the HUD tag, top centre |
| `bookmark_outside` | The Bookmark marks nothing up here. | the Bookmark used outside a run |
| `stair_wait` | The stair waits. A reading begins at the desk, with Hollis. | the hall's stair before the intro |
| `rise` | {name} rises! | the Rebound prop's toast |

### 3.3 The plaques (`PLAQUES`)

The Stacks' own voice, one box each: the landing's name in gold on the first line, then one small truth. `plaque_hall` is
the hall's wall plaque (the glyph over the desk). `plaque_b10` to `plaque_b90` are the landings' signs (`world.js` wires them
through `plaqueId(floor)`). `plaque_b100` is the approach text for B100's antechamber; it is registered as an inspect line
and waits for a sign event there (C2-sprites-boss owns the map).

| Id | Name line / the truth |
|---|---|
| `plaque_hall` | THE DEEP STACKS / What the Book could not file, it kept. What it kept, it did not forget. |
| `plaque_b10` | B10. THE FIRST LANDING / Nobody wrote the names below this line. They were kept anyway. |
| `plaque_b20` | B20. THE ROOT CELLARS / The roots came up and the Keepers let them. A root remembers where it drank. |
| `plaque_b30` | B30. THE SECOND SHELVING / Every shelf here was shelved twice, by two hands. Neither signed. Both are kept. |
| `plaque_b40` | B40. THE COURT BELOW / A court sat here once and ruled on names. Nobody remembers its own. |
| `plaque_b50` | B50. HALFWAY / The Keepers who read this far stopped signing their work. The work stayed. |
| `plaque_b60` | B60. THE EMBER SHELVES / The shelves are warm. Something below is still reading. It is not at your page yet. |
| `plaque_b70` | B70. THE ASH / Ash on every page, every word under it. Fire takes the paper and leaves the name. |
| `plaque_b80` | B80. THE FORGE OF NAMES / The forge made names, and the forge unmade them. The Stacks kept the shavings. |
| `plaque_b90` | B90. THE LAST LANDING / Below is the one who bound the book. It is binding still. |
| `plaque_b100` | B100. THE BINDING / The last page. What the Stacks kept is bound here, and the binding is awake. |

---

## 4. The title, the Journal, the plaque screen

**Title** (`src/scenes/title.js`). Two things, both hidden while the cave pack is neither live nor forced (`packEnabled('cave')`):

| Key | Text |
|---|---|
| `resume` | Resume the Deep Stacks (B{n}) |
| `resume_help` | Back to your reading, at the floor you left. |
| `resume_failed` | The Stacks could not be reopened. |
| `cleared` | B100 |

- The row sits under Continue when the suspend save (`save.exists('cave')`, `meta.cave.floor` from `suspendMeta`) is readable
  (`stacksOffer(save)`). Confirm: `ensurePack('cave')`, a dynamic import of `src/data/cave/world.js`, then
  `resumeReading(engine)` under a fade; a failure buzzes and toasts `resume_failed`. The help beside the menu is `resume_help`.
- The mark: a small gold bookmark ribbon and "B100" right after the version line, once any slot's flags hold
  `deep_stacks_cleared` (`drawStacksMark`). No existing row moves.
- The label is also `TITLE_ROWS.resume` in `text.js`; `qa/cave/ui_stacks.test.mjs` keeps the two copies equal (the title is
  precached and cannot wait for the pack).

**Journal** (`src/ui/screens/journal.js`, `stacksLine(g)`). One line under the main quest once `deep_stacks_open`, with the
book icon: "The Deep Stacks: deepest B23, 4 names in the vault" (from `recordOf` and `vaultIds`); "The Deep Stacks: no reading
yet" before the first descent. Hidden otherwise.

**The plaque screen** (`StacksScene` at the end of `src/data/cave/story.js`, scene `stacks`; it is pack code on purpose: `src/ui/screens/` is precached and the 2.34 MiB tap-prompt ratchet has no room for a screen only the pack opens). The Ledger tab's layout: the header strip (the title, then
the record: "Deepest B23   4 readings   Read through 1   1:23:45", shortened from the right when it does not fit), the vault
list on the left (seventeen rows in band order, the Quill last, the slot icon beside the name; bright cream when held, faded
ink when not), the detail on the right (the name, its home band, who wears it, and for a held one the prop's name and text and
the two lore lines; for one still on its shelf "..." and "Not yet found. The Stacks still hold it."), the help bar
"Read a name. {i:btn_cancel}: back." with "Vault N of 17" at the right. Touch rows come from `rowHeightFor` (seven visible
on a phone, the list scrolls and its arrows are tappable). Cancel pops with the selected id.

The bands as the screen names a unique's home: 0 The Binder, B100; 1 The Catalogue, B1 to B19; 2 The Root Cellars, B20 to
B39; 3 The Court Below, B40 to B59; 4 The Ember Shelves, B60 to B79; 5 The Forge of Names, B80 to B99.

---

## 5. Staging notes for the hall

- The party arrives from the library at `arrival` (5, 5) facing down, walks the blue runner, and reaches `party_stop` (10, 10)
  south of the long table; Hollis at (10, 8) looks down at them. After any reading ends, `world.js endReading` lands the party
  at `party_stop` (its `landingSpot`) and runs `stacks_return`: Hollis turns to them and says his line or two.
- The record lives twice on purpose: the lectern at (13, 9) east of the desk (`record` mark (13, 10) is the cell to stand on),
  and "The record" in the offer, so nobody has to walk round the desk to read it.
- The wall plaque is the glyph tile at (10, 4), read from (10, 5).
- Nothing in the hall needs the cave_props atlas: Hollis is `npc_scholar`, the plaque is the drawn glyph, the triggers are invisible.
