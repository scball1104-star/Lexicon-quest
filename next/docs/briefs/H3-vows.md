# H3-vows: Vows (adventure as chosen weight) and the Hard Road proposal

You are **H3-vows**, step H3 of the Responsibility and Adventure arc (`docs/RESPONSIBILITY_ARC.md` sections 3.2
and 7). You are the only agent running. Nobody will answer questions: use your judgment and write assumptions in
your report.

**Goal.** The game's one mechanic that says the harder road chosen on purpose is the better road. At every rest
(font, campfire, the bell) the player may take ONE Vow, optional and self-imposed, that lasts until the next
rest. Keep it and the next rest pays a small, permanent reward and a line from the party. Break it and the vow
simply ends with one honest line: no punishment screen, no lecture, no second cost (Scott's decision D). Scott's
decision C is "both": Vows stay opt-in at rests AND a harder mode opens after the player completes the game. You
build the Vows. For the harder mode you write a one-page proposal for Scott and **no code** (section 7 of the arc
doc: its shape goes to him before it is built).

## Read, in this order
1. `docs/briefs/COMMON.md`, `DESIGN.md` (battle rules, field, menu, saves, phone UX).
2. `docs/RESPONSIBILITY_ARC.md` sections 0, 3.2, 3.3, 6 and 7 (Scott's words win).
3. `src/world/events.js` (the rest flow at line ~540: "Rest here?" then "Record your journey here?"; fonts, the
   campfire's `rest: true`), `src/data/maps/_kit.js` (`font`, `silverFont`), `src/data/story/ep1.js`
   `campfire_rest`.
4. `src/battle/rules.js` (`case 'flee'`, `action.type === 'item'`, KO handling, Fury), `src/scenes/battle.js`
   (`result = 'flee'`, rewards phase), `src/scenes/field.js` (running, the Aim line H2 added),
   `src/ui/screens/items.js` (field item use), `src/scenes/shop.js` (purchase), `src/scenes/menu.js` `drawInfo`,
   `src/ui/screens/journal.js` (Quests tab header; H2's Ledger tab).
5. `src/game/state.js` (the save shape; `createGame`, defaults), `qa/saves/*` (round-trip tests and old-save
   fixtures), `src/core/engine.js` toasts (`engine.toasts.flash`).
6. `tools/sim/simulate.mjs` (`--check`, "All targets met"), `qa/autoplay.py` (do not change it: the bot never
   takes a vow, so "No vow" must be the default and the flow must not add a required press).
7. `qa/pwa/precache.test.mjs` and `qa/pwa/budget_ratchet.json` (the load budget; read only).

## Owned paths (create or modify nothing else)
- `src/data/vows.js` (new): the Vow table. `src/game/vows.js` (new): the state machine and event hooks.
- `src/game/state.js`: the save fields only (`vow`, `vowsKept`), with defaults so every existing save loads.
- `src/world/events.js`: the vow row in the rest flow only.
- `src/battle/rules.js`, `src/scenes/battle.js`, `src/scenes/field.js`, `src/ui/screens/items.js`,
  `src/scenes/shop.js`: **one-line event calls** at the seams (flee, item used, party member fell, Fury used,
  running, purchase). No other change in those files.
- `src/scenes/menu.js` `drawInfo` and `src/ui/screens/journal.js` Quests header: the active vow line.
- `src/data/text.js`: strings. `qa/battle/h3_*`, `qa/ui/h3_*`, `qa/saves/h3_*`, their `out/` folders, up to
  three entries in `qa/shots.json`. `docs/VOWS.md` (new), `docs/HARD_ROAD.md` (new, proposal only).
Not owned: story scripts, maps, encounters and enemies, audio, `qa/autoplay.py`, the ratchet file, the precache
test, `src/data/ledger.js`.

## Deliverables

### 1. The Vow table (`src/data/vows.js`)
Five Vows for Episode 1, each `{ id, name, line (the offer, under 42 chars), rule, reward, keptLine, brokenLine,
offerIf }`. Pick five whose breaking is cheap and unambiguous to detect:
- **No fleeing** (break: the Flee command succeeds).
- **No healing items** (break: a healing item used, in battle or from the menu).
- **Walk the road** (the heavy lamp: break: running; the Run button and Shift do nothing but the walk is normal).
- **Mira stands** (offered only with Mira in the party: break: Mira falls to 0 HP).
- **No Fury** (break: a Fury command) or **Buy nothing** (break: a shop purchase). Your pick, say why.
Lines in the game's voice; no "responsibility", no sermon. The reward is small and permanent: one stat point or a
few max HP to one member, from a table, so that the whole of Episode 1's rests kept with a vow add up to **less
than one level's gain**. Write that bound in `docs/VOWS.md` with the arithmetic.

### 2. The rest flow
After "Rest here?" heals and before "Record your journey here?", one more window: "Take a vow?" with the vow
names and **"No vow" first and selected by default** (one confirm press leaves the flow exactly as today, so the
autoplay bot is unchanged). Selecting a vow shows its one line and asks once. An active vow shows as one line in
the menu's info box and in the Journal's Quests header ("Vow: No fleeing"), and the H2 Aim line may carry it as a
suffix for its four seconds; nothing else on the HUD. At the next rest, a kept vow pays out before the offer: the
reward line, then one party line (Bram or Mira, in character, two boxes at most). A broken vow ended at the moment
it broke: a small toast ("Vow ended") and one line from the party the next time a dialogue box opens, or at the
next rest, whichever is first; the player keeps everything else.

### 3. The state machine (`src/game/vows.js`)
`offerVows(game)` (which are offered now), `takeVow(game, id)`, `vowEvent(game, evt)` (the single entry the
seams call: `{ type: 'flee'|'item'|'run'|'fell'|'fury'|'buy', ... }`), `settleVow(game)` at a rest (pays or
clears, returns what to say). Pure over `game`; the engine is passed in only for the toast. Vows persist in the
save (`game.vow`, `game.vowsKept`), default `null` and `[]`.

### 4. Hard Road: proposal only (`docs/HARD_ROAD.md`)
One page for Scott, no code and no flags. Scott clarified on 2026-10-26 (arc doc section 7 C, his words):
difficulty tiers that unlock after completing the game, like Diablo's Nightmare and Hell, where harder means
better XP, better loot and better equipment in shops, and he is "not sure if it works for us or not". The page
answers that question honestly. In it: the unlock (after the credits of the last live episode; the title offers
the next tier for a completed save); two tiers at most, each with an EXP multiplier, a higher item level and
shifted rarity weights on drops, and shop stock gated by tier (point at the existing levers: `loot-tables.js`
rarity weights and affix tiers by item level, equipment base tiers 1 to 6, `shops.js` flag-gated stock; say
which are enough and which need a table); what carries over (Inference default: the character, levels and gear,
and the Ledger, as Diablo carries the character; the alternative is a fresh party at the harder tier); foe scaling
by a flat multiplier per tier with the sim as the proof; how Vows sit beside it (optional at every rest, as in the
base game, not forced); what it costs to build (a day or a week, in agent terms) and the one risk you see (for
example: the story is short, so the replay value rests on the loot depth; say whether the depth is there). End
with the three questions only he can answer (carry the character or not; one tier or two; a name). Mark every
default as Inference. No em dashes.

### 5. Shots and previews
Up to three shots: the vow offer window (desktop), the Journal header with an active vow (phone), the kept-vow
payout line. Render 3x previews and view them with the Read tool; iterate until a professional UI artist would
sign off. Phone first.

### 6. Tests
`qa/battle/h3_vows.test.mjs`: table valid (ids unique, every line obeys the box rule, every reward in bounds);
take and keep pays once and only at a rest; break ends the vow with no payout and no other change to `game`;
`vowEvent` with no active vow is a no-op; Mira's vow is not offered without Mira. `qa/saves/h3_vows.test.mjs`:
round-trip with and without a vow; an old save fixture with no vow fields loads with `vow: null`.
`qa/ui/h3_vows.test.mjs` or a headless script: the rest flow with "No vow" is the same number of presses as
today; the menu and Journal lines render. No em dash in any new text.

### 7. Balance proof
`node tools/sim/simulate.mjs --check` unchanged with no vow (All targets met). A kept-vow run: either a sim
scenario if the sim supports it cheaply, or the arithmetic in `docs/VOWS.md` plus a headless run that takes and
keeps one vow through the Archive's first floor. `python qa/autoplay.py` (desktop) still clears Episode 1 with
zero game overs.

### 8. Load budget
The before-the-tap-prompt ratchet was moved by the orchestrator to 2.34 MiB for this arc, with Scott's 2.5 MiB
cap untouched. Measure your gzipped bytes (`python tools/pwa/build_pwa.py --sizes` and gzip of your files) and keep
the whole step **under 8 KB gzipped**. `python tools/pwa/build_pwa.py` then `node qa/run.mjs pwa` green. Do not
touch `qa/pwa/budget_ratchet.json` or the precache test; report the exact bytes.

## Verify before you report
`node qa/run.mjs battle ui saves content pwa` (rerun a flaky `walks` test alone); the sim check; the autoplay run;
`python qa/shots.py` with zero errors; a headless load on desktop and phone profiles with no console errors.

## Report (last message, under 450 words)
The five vows and their rules, the reward table and the bound, files touched, the seams you hooked (file and
line each), the gzipped bytes added, log paths, preview image paths, known gaps, and the contracts H4 to H6 need
(`vowEvent` types, `settleVow` return, how to add a vow). No git. No em dashes. Bound every command.
