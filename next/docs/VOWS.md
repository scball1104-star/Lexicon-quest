# The Vows

Built 2026-10-26 by H3-vows (`docs/RESPONSIBILITY_ARC.md` 3.2 and Scott's decisions C and D in section 7). The game's one
mechanic that says the harder road chosen on purpose is the better road. Code: `src/data/vows.js` (the table),
`src/game/vows.js` (the state machine), the vow row of the rest flow in `src/world/events.js`, one-line hooks at six
seams, the line in `src/scenes/menu.js` and `src/ui/screens/journal.js`, strings in `src/data/text.js` (`VOW_TEXT`).
Tests: `qa/battle/h3_vows.test.mjs`, `qa/saves/h3_vows.test.mjs`, `qa/ui/h3_vows.test.mjs`; the browser half is
`qa/ui/h3_vows_headless.py`; the pictures are the `ui_vow_*` shots. The post-game mode is a proposal only:
`docs/HARD_ROAD.md`.

## What it is

At every rest (a Keeper's font, the chapel bell, the Pilgrim's Rest campfire, every later landmark that runs the rest
flow) the player may take ONE vow, optional and self-imposed, that lasts until the next rest. Keep it and that rest pays
a small permanent reward and one line from the party. Break it and it simply ends: one toast when it breaks (in battle,
a line in the battle log instead: H6, so it never covers the help line or the timeline), one honest
line at the next rest, nothing else (decision D: small and honest, no punishment screen, no lecture, no second cost).
Nobody in the game says "responsibility". The vow is a thing the player does.

## The five vows (Episode 1)

| id | Name | The offer line | Rule | Breaks on (seam) | Reward to | Offered when |
|---|---|---|---|---|---|---|
| `no_flee` | No fleeing | Stand in every fight until you rest. | Flee once and the vow ends. | the Flee command succeeds (`escape` op, `scenes/battle.js`) | the hero | always |
| `no_heal` | No healing items | No potion, no feather, until you rest. | Use one, in a fight or from the bag, and it ends. | an item that restores HP or revives, in battle (`action_start`, `performParty`) or from the bag (`ui/screens/items.js`); ethers and cures do not count | Bram, else the hero | always |
| `walk` | Walk the road | Walk every step until you rest. | One running step and it ends. | a running step (`tryLeaderStep`, `scenes/field.js`); the walk itself is normal speed | the hero | not while Always Run is on (every step would be a run) |
| `mira_stands` | Mira stands | Mira does not fall until you rest. | If she drops to zero, it ends. | Mira at 0 HP (`ko` op for a party actor, `scenes/battle.js`) | Mira | Mira in the party |
| `no_fury` | No Fury | Spend no Fury until you rest. | One Fury art and it ends. | a Fury art spent (`fury_gain` with reason `spent`, `performParty`) | the hero | always |

Why No Fury and not Buy nothing: Episode 1's only shops are in Willowmere, and a vow taken at an Archive font would
never meet one, so Buy nothing would be kept by default and mean nothing. No Fury costs something in every fight and
most of all at the F3 font, which is the last rest before the Archivore: a player who takes it there fights the boss
without the Fury arts. That is the chosen weight the arc asks for. The purchase seam is still hooked (`vowEvent`
`{ type: 'buy' }` in `scenes/shop.js`) so a later vow can use it with a table row and nothing else.

Auto battle keeps the vow (H6, CRITIQUE_ARC 8): while one is carried its brain sees what the vow forbids switched off
(no healing item under No healing items, no Fury art under No Fury, no Flee under No fleeing; `vowForbids` in
`src/game/vows.js`, `autoAction` in `scenes/battle.js`), and when what it picks would still break the vow it defends.
The player may still break it by hand; the vow just ends. The simulator calls `partyAction` directly and is unchanged.

## The rest flow

`restFlow` in `src/world/events.js`: "Rest here?" (Rest / Not now), the heal and its toast, the landmark's bark, then
the vow row, then "Record your journey here?". The vow row (`vowRow`):

1. `settleVow(game)`. A kept vow pays first: the reward box ("Vow kept: No fleeing." and the mastery line) then one party
   line (Bram or Mira, in character, two boxes in all). H6: beside the boxes the member's card shows the weapon's mastery
   bar filling by the points paid (`field.keptBar`, `drawKeptBar`; the reward carries `before` and `after`). A broken vow says its one line. An untested vow (no battle
   since it was taken) rides on unchanged and nothing is offered, so resting twice at one font neither pays nor eats it.
2. Once per save, before the first offer, one box says why a vow is worth taking (H6, `VOW_INTRO`, `takeVowIntro`,
   counter `vow_intro`): Bram, "Keep it to the next fire, and your weapon hand learns from it", or the narrator alone.
   Then "Take a vow?" with the vow names under **"No vow", first and selected**; cancel also lands on it. One confirm press
   leaves the flow as it was, which is what the autoplay bot does (its generic handler picks index 0 when no preferred
   label matches; `qa/autoplay.py` is unchanged). With "No vow" the flow costs exactly one press more than before H3.
3. A chosen vow shows its offer line and rule in one box and asks once: "Take the vow" / "Not this one" (back to the
   list). Taking it plays a confirm, a sparkle and a short toast ("Vow taken: No fleeing."), then the save prompt follows.

While a vow is carried the menu's info box shows a "Vow" row (desktop: in place of Chapter; touch: in place of Time,
the map title stays) and the Journal's Quests header shows "Vow: No fleeing" at the right of the quest title. After a
break both read "Vow ended" (dim) until the next rest clears it. H6 (CRITIQUE_ARC 25): the H2 Aim line carries
" - Vow: No fleeing" while a vow is active.

## Rules

- One vow at a time. It lasts until the next rest the player takes (declining "Rest here?" keeps it going).
- A vow is tested when at least one battle has been fought since it was taken (`counters.battles`). Only a tested vow
  pays; an untested one carries.
- At most `VOW_PAID_CAP` (5) kept vows pay points per chapter; the sixth and later keep their line and the record but
  pay nothing ("Five vows have paid this chapter. This one is its own reward."). This bounds the reward whatever the
  player does, including resting back and forth between two fonts.
- Breaking changes exactly one thing in the save: `game.vow.state` (and `brokenBy`). No counter, no gold, no stat.

## The reward and its bound

A kept vow pays **mastery points on the current weapon** of the member the vow concerns (the first of the table's
`to` list who is in the party, else the leader): `VOW_REWARD = { 1: 4, 2: 8, 3: 12 }` points by chapter, `grantMastery`
from `data/party.js`, so a tech the points unlock is learned and named in the box ("Cleave learned!").

Why mastery and not a stat point or max HP: the engine has no permanent per-member stat field. `memberStats` (rules.js)
is the level table plus equipment and set bonuses, and the brief limits `rules.js` to one-line event calls, so a
stat or HP reward would have been inert. Mastery is permanent, per member, from a table, visible on the Status screen,
and it already feeds damage (+3 percent per mastery level) and the tech unlocks. If Scott prefers HP, the upgrade is one
line in `memberStats` after the equipment adds, `add(member.bonus || {});`, and a table of `{ hp: 2 }` rows written to
`member.bonus` by `settleVow`; its bound at the same cap is 10 HP per chapter per member, under the smallest Lv 8 to 9
gain (hero +14, Mira +11, Bram +17).

The bound, checked by `qa/battle/h3_vows.test.mjs`:

| Chapter | Points per kept vow | Cap | Most a chapter pays | Mastery level width the party plays in | Less than one level |
|---|---|---|---|---|---|
| 1 (Episode 1) | 4 | 5 | 20 | level 1 to 2 is 25 wide (`MASTERY_XP` 0, 25, 70, 140, 240, 380, 560, 800) | 20 < 25: no vow run alone earns a tech |
| 2 | 8 | 5 | 40 | the quick start's lowest main weapon (Mira's staff 160) sits in level 4, 100 wide | 40 < 100 |
| 3 | 12 | 5 | 60 | the quick start's lowest main weapon (staff 350) sits in level 5, 140 wide | 60 < 140 |

For scale: an ordinary Episode 1 victory pays 2 to 6 mastery points split across the weapons used, so a kept vow is
worth about one fight, and five kept vows about one floor's worth of practice. No stat, HP, EXP or gold moves.

## Save fields

`game.vow`: `null` or `{ id, chapter, battles, state: 'active' | 'broken', brokenBy }`. `game.vowsKept`:
`[{ id, chapter, paid }]`. Both default in `createGame`, so `deserialize` fills them into every existing save (`vow:
null`, `vowsKept: []`); `qa/saves/h3_vows.test.mjs` loads every fixture in `qa/saves/fixtures/` and checks it.

## The seams (file and line, 2026-10-26)

| Event | Where | Line |
|---|---|---|
| `flee` | `src/scenes/battle.js` `runOp` `case 'escape'`, inside the success branch | 592 |
| `fell` | `src/scenes/battle.js` `runOp` `case 'ko'`, party actors only (`a.id` is the member id) | 588 |
| `item`, `fury` | `src/scenes/battle.js` `performParty`: `vowBattleEvents(game, evs, engine)` scans the action's events | 477 |
| `run` | `src/scenes/field.js` `tryLeaderStep`, after the accepted step, when `dur === RUN_FRAMES` | 825 |
| `item` | `src/ui/screens/items.js`, after a successful `useItemOnMember` | 67 |
| `buy` | `src/scenes/shop.js` `buy`, after `buyItem` succeeds | 121 |
| the rest flow | `src/world/events.js` `restFlow` -> `vowRow` | 554 |
| the line | `src/scenes/menu.js` `drawInfo` (`vowStatus`), `src/ui/screens/journal.js` `drawQuests` (`vowLine`) | 186, 179 |

`src/battle/rules.js`, `tools/sim/*` and `qa/autoplay.py` are untouched: the seams read the rules' own events
(`action_start` with `action.type === 'item'`, `fury_gain` with `reason === 'spent'`, `escape.success`, `ko`), which
`qa/battle/h3_vows.test.mjs` pins against real battles.

## Contracts for H4 to H6

- `vowEvent(game, evt, engine?)`: `evt.type` is one of `flee | item | run | fell | fury | buy`; `item` carries `item`
  (a consumable id), `fell` carries `member`, `buy` carries `item` and `qty`. Returns `true` when the active vow broke.
  A no-op with no active vow. The engine is used for the toast only.
- `settleVow(game)` returns `null` (no vow) or `{ kind: 'kept' | 'broken' | 'carried', vow, reward, text, line }`:
  `reward` is `{ to, name, weapon, points, level: { from, to }, unlocked }` or `null`; `text` is the kept box (two or
  three lines that fit); `line` is `{ who, text }` for `showBoxes`, chosen by who is in the party.
- `vowLine(game)` -> `'Vow: <name>' | 'Vow ended' | null`; `vowStatus(game)` -> `{ name, active } | null`.
- To add a vow: one row in `VOWS` (`src/data/vows.js`) with `id, name (under 17 chars), line (under 42), rule, breaksOn,
  to, keptLine, brokenLine (each with a who: null fallback), offerIf`. If it needs a new event, add the type to
  `vowEvent`'s list, call `vowEvent` once at the seam, and extend the "each vow breaks on its own event" test. Lines
  obey the box rule (3 lines of 42, ASCII, no em dash); the table test checks them.
- Story scripts may read `game.vowsKept` (a Ledger line, a credits line) but should not write it.

## Verification (2026-10-26)

`node qa/run.mjs battle ui saves content pwa`, `node tools/sim/simulate.mjs --check` (unchanged: no vow in the sim's
world), `python qa/ui/h3_vows_headless.py` (both profiles: the press count, the window, a kept run through three Archive
fights, a broken run), `python qa/shots.py --only "ui_vow_*"`, `python qa/autoplay.py` (desktop, no vow ever taken).
Logs and pictures: `qa/ui/out/`, `qa/battle/out/`, `qa/out/`.

## Load budget

H3 adds **5,942 B gzipped** to the precached sources (`qa/ui/out/h3_bytes.py`: `src/data/vows.js` 1,703 B and
`src/game/vows.js` 2,580 B new; the nine edited files +1,659 B together), under the brief's 8 KB. Measured with the
precache test's own arithmetic after `python tools/pwa/build_pwa.py`, the load before the tap prompt is 2.3240 MiB with
H3 in and `src/data/cave/` out: under the 2.34 ratchet with 16.8 KB to spare. The test itself fails today only because
eight `src/data/cave/*.js` files (46,962 B gz, another agent's unregistered pack, written during this step) are in
`src/` and the build precaches them; `qa/pwa/budget_ratchet.json` and the test were not touched.
