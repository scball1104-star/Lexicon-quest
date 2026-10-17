# Battle scene (W2-battle-scene)

The presentation layer over the pure rules in `src/battle/rules.js` (docs/BATTLE.md section 7). FF6 / Chrono
Trigger staging, Octopath-style shields and weaknesses, Sea of Stars snappiness. Everything the scene shows
comes from the rules' event array; the scene never computes damage or decides turns.

| File | What |
|---|---|
| `src/scenes/battle.js` | the scene: intro, CTB loop, op runner, victory / defeat / flee, rewards windows, `install()` debug commands |
| `src/battle/scene/animator.js` | **pure**: events -> frame-timed ops (`planEvents`), the `FRAMES` timing table |
| `src/battle/scene/layout.js` | **pure**: every rect and slot (windows, timeline, party / enemy / summon slots, face crops) |
| `src/battle/scene/rewards.js` | **pure**: outcome -> `engine.game` (`applyBattleOutcome`, bestiary contract) |
| `src/battle/scene/actors.js` | unit views: pose, move, flash, dissolve, bob, shadow; atlas-driven by frame names |
| `src/battle/scene/hud.js` | help window, timeline, party status, enemy shield + weakness row, reticle, markers, banners, preview tag |
| `src/battle/scene/menu.js` | command menu, sub-lists, targeting (built on `src/ui/list.js`) |
| `src/battle/fx.js` | weapon arcs, projectiles, magic circles, bursts, statuses, ink, BREAK burst, pixel dissolve, shard intro |
| `qa/battlescene/*.test.mjs` | node tests: animator coverage, rewards into game state, layout invariants |
| `qa/battlescene/autobattle.py` | headless end-to-end scenarios, filmstrips, Auto-win timing, scripted defeat, every encounter |

## 1. Interface

```js
const result = await engine.pushAwait('battle', {
  encounterId: 'valley_wolves',          // data/encounters.js id
  start: 'normal' | 'preemptive' | 'ambush',
  canFlee: true,                          // optional override (bosses never flee)
  gameover: true,                         // false: a scripted loss, the scene will not push 'gameover'
  seed: 'any',                            // optional: mixes into the battle rng fork
  forceElite, noElite, eliteRate,         // optional: passed to createEncounterBattle
});
// result === 'win' | 'lose' | 'flee'
```

What the scene does on its own:
- takes `r.snapshot()` of the frame underneath at push time (the field), so push it from a drawn field;
- `audio.sfx('encounter')`, `audio.pushMusic(encounter.music)` ('battle' or 'boss_archivore');
- builds the battle from `engine.game`: `party` (member records), `items` (inventory copy), `bestiary`
  (`bestiaryForBattle(game)`), `engine.rng.fork('battle:<n>:<seed>')` with `game.counters.battles` bumped;
- when the rules end the battle it calls `applyBattleOutcome(game, result, encounter)` **before** the rewards
  windows, so a closed tab never loses loot (section 5);
- win / flee: `audio.popMusic(0.8)` (the field track resumes), dither fade, `pop(result)`;
- lose: `stopMusic`, `gameover_sting` jingle, fade to black, `pop('lose')`, then `push('gameover')` unless
  `{ gameover: false }` or `{ scripted: true }` was passed. It never changes `game.map / pos / lastSafe`.

## 2. Flow

```
enter  -> intro (shard shatter of the field snapshot, 30 frames, mosaic + white flash first)
       -> enter (party slides in from the right, 22 frames)
       -> play: loop { ops pending? run them : battle over? (end op switches phase)
                        : enemy turn? plan(runEnemyTurn()) : party turn? Auto ? plan(perform(partyAction))
                                                                       : open the command menu -> plan(perform(action)) }
       -> victory (poses, fanfare, 54 frames) -> rewards (drop beams 46 frames if gear dropped, main page,
          one level-up page per member, one mastery page) -> leave('win')
       -> defeat (100 frames, sting) -> leave('lose')
       -> flee (party dashes right 44 frames) -> leave('flee')
```

Settings read live: `battleSpeed` (1 or 2, divides every blocking op's frames; `pageL/pageR` toggles it in
battle) and `autoBattle` (`start` toggles it; `cancel` turns it off at the next party turn; the rewards pages
auto-advance after 150 frames while Auto is on). `reduceMotion` disables shake, flash, slow motion and the
shard shatter (plain white fade instead).

## 3. Ops (the animator's vocabulary)

`planEvents(events, { units: unitInfo(b.units()) })` returns a flat list. Blocking ops carry `frames` (at 1x):
`wait`, `move {uid, to:'target'|'home'|'cover', target}`, `dissolve {uid}`, `fall {uid}`, `hitstop` (freezes
actors, fx and numbers; not scaled by speed beyond rounding). Instant ops: `help {text,color}`, `pose
{uid,pose}` (idle ready windup strike cast hurt defend kneel ko victory), `flash {uid,color,frames,hold,soft}`,
`number {uid,text,variant,big}`, `word {uid,word}` (MISS WEAK BREAK RESIST IMMUNE CRITICAL DODGE), `fx
{kind,uid,from,to,big,small,status}`, `sfx {id,volume,pitch}`, `shake`, `screenFlash`, `hp`, `mp`, `fury`,
`shield`, `break`, `shieldRestore`, `status {uid,status,on,clear}`, `defendPose`, `cover`, `swap`, `slow
{factor,frames}`, `banner {text,style}`, `elite`, `knockback`, `turn {actor}`, `timeline {order}`, `telegraph`,
`telegraphCancel`, `reveal`, `summon`, `split`, `ko`, `revive`, `start`, `escape {success}`, `victory`,
`defeat`, `end`. Unknown event types produce nothing (the runner never stalls); every batch ends with `end`.

An `action_start` opens a **segment** (until the next turn_start / action_start / victory / defeat): the planner
looks ahead at the segment to choose the opening (melee step-in, bow draw, cast circle, item, defend, swap,
combo, enemy lunge or enemy cast), then plays the hits in order, then returns everyone home.

## 4. Timing table (frames at 1x, `FRAMES` in animator.js)

| Beat | Frames | Beat | Frames |
|---|---|---|---|
| battle start help | 30 | ready pose | 6 |
| melee step-in / step back | 8 / 8 | wind-up / strike hold | 6 / 3 |
| hit hold (single) / multi-target stagger / random-hit stagger | 14 / 5 / 9 | hit-stop light / heavy | 3 / 4 |
| bow draw / arrow flight | 8 / 8 | cast wind-up / release | 22 / 10 |
| buff wind-up / item / defend / swap | 18 / 24 / 14 / 16 | enemy wind-up / lunge / spell / release | 6 / 8 / 20 / 10 |
| heal / miss / status / status tick | 16 / 14 / 18 / 16 | reveal / knockback / reflect | 22 / 14 / 22 |
| BREAK: slow-motion (x0.5) / hold | 18 / 30 | shield chip | 8 |
| telegraph / cancel | 36 / 16 | enemy death flash / dissolve | 8 / 30 |
| boss death shake / dissolve | 70 / 90 | party KO kneel / fall | 10 / 16 |
| revive / summon / split | 26 / 26 / 22 | devour / feast | 46 / 34 |
| phase banner / stance banner | 72 / 54 | combo banner | 30 |
| message / elite intro / skip | 24 / 40 / 20 | fury ready / escape | 18 / 40 |

A plain attack is about 60 frames; an ordinary 3 to 5 round fight runs 40 to 60 s at 1x, 20 to 30 s at 2x.

## 5. Game-state writes (`rewards.js`)

`applyBattleOutcome(game, result, encounter, { seenKeys, killedKeys })`:
- members: HP / MP / Fury / active weapon on every outcome (`applyResult`); EXP, levels (stat gains, learned
  skills) and mastery levels only on victory;
- `game.items`: consumables used in battle are `take`n on every outcome; found consumables `give`n on victory;
- `game.gold += result.gold`; dropped gear instances through `addGear` (they get `uid`s);
- `game.bestiary[weakKey] = { seen, killed, known: [types], weak: [...], resist: [...], appraised }` keyed by the
  rules' `weakKey` (`'briar_wolf'`, `'lost_page:kindling'`, `'echo_warden:mirror'`); `bestiaryForBattle(game)`
  turns it back into the `{ weakKey: [types] }` the rules want, so a "?" once revealed stays revealed;
- `game.flags[encounter.flag] = true` on victory (`echo_warden_defeated`, `archivore_defeated`);
- counters `battles_won / battles_lost / battles_fled / bosses_defeated`.
Returns the summary the rewards windows draw: `{ exp, gold, levelUps, mastery, masteryPoints, items, consumables, used, flag }`.

## 6. Layout (384 x 216, `layout.js`)

Help window (4,4,218,19) thin; timeline rail at x 226 to 380, slots 18 px (first slot has 1 px extra); command
window (4,152,92,60); sub-list window (4,90,188,60) above it; party status (98,152,282,60) with rows every 17 px
(name, HP numbers + 75 px gauge with a white damage trail, MP, Fury with READY glow, up to 5 status badges);
party feet at (298,104) (320,125) (342,146); enemies at `enemySlots(n)` (1 to 5 foes, back row higher and
further left), the boss at (98,146), summons at four float slots around the boss. Enemy row (shield badge +
weakness slots + status badges) sits under the foe, clamped above the windows. Rewards window (40,14,236,102)
keeps the party visible; drop beams rise at x 150 on the enemies' side.

## 7. Debug and QA

- `LQ_DEBUG.battle(encId, { start, level, party, seed, auto, fast, fresh, canFlee, forceElite, noElite,
  settings })` pushes a battle from any scene; without `engine.game` (or with `fresh`) it builds a representative
  party for the encounter's zone (expected level, sim loadout). Returns the id at once.
- `LQ_DEBUG.battleWait()` -> Promise of 'win' | 'lose' | 'flee'; `LQ_DEBUG.battleResult()` -> last result.
- `LQ_DEBUG.battleAct(action)` performs an action for the member whose menu is open (`{type:'attack', target:'e0'}`,
  `{type:'skill', skill:'ember', target:'e0'}`, `{type:'combo', skill:'ember_edge', target:'e0'}`, `{type:'item',
  item:'potion', target:'hero'}`, `{type:'defend'}`, `{type:'swap'}`, `{type:'flee'}`).
- `LQ_DEBUG.battleUntil(cond)` fast-forwards with Auto decisions (no waits, no fx) until: a member id (its
  command menu), `'any'` (next command), `'enemy'` (the next enemy turn animates normally), `'telegraph'`,
  `'phase2' | 'phase3'` (Archivore), `'summoned'`, `'ko'` (a party KO), `'end'` (the battle ends, rewards wait
  for input) or `'over'` (through the rewards too).
- `LQ_DEBUG.state().battle` -> `{ phase, menu, current, fast, telegraphs, timeline, units[], target, preview,
  rewards, round, actions[], commands[] }`.
- `python next/qa/shots.py --only battle_start,battle_command,battle_target_preview,battle_break,battle_boss,battle_victory,battle_levelup`
  (desktop + phone, zero console errors).
- `python next/qa/battlescene/autobattle.py` (scenarios: start command target_preview break boss victory levelup
  flee strip_attack strip_enemy strip_death boss_phase party_ko combo boss_death e2e_win e2e_lose e2e_all);
  PNGs and filmstrips in `qa/battlescene/out/`. `e2e_win` is Auto at 2x from push to 'win' under 60 s wall
  clock; `e2e_all` plays every encounter (with an elite every fourth) to an outcome with no engine errors.
- `node next/qa/run.mjs battlescene`.

## 8. Known gaps

- Enemies have one frame each (DESIGN 6.3): attacks are a lunge plus procedural fx, hurt is a 2 px recoil.
- No touch "tap to confirm" hint glyph in the help window yet (the device button glyphs exist in ui.json).
- Timeline faces are 14x14 crops; a dedicated face strip from W1-sprites would read better for enemies.
- The help window is one line; long telegraph sentences are cut with an ellipsis (the marker, timeline '!' and
  the orange color carry the warning).
