# Battle scene (W2-battle-scene, polished by W4-battle-polish)

The presentation layer over the pure rules in `src/battle/rules.js` (docs/BATTLE.md section 7). FF6 / Chrono
Trigger staging, Octopath-style shields and weaknesses, Sea of Stars snappiness. Everything the scene shows
comes from the rules' event array; the scene never computes damage or decides turns.

W4 (CRITIQUE_1 C3, C4, C5, C11; PLAYTEST 7) added: a real stage (palette backdrop, indigo band, one baseline per
side, width-scaled shadows, enemy breathe and hurt squash), head icons on the timeline, an axis-aligned slice
intro, a heavier impact language (2 px arcs, impact star, hit-stop, camera kick, motion lines, wedge, trail,
bloom) and a sharper Auto brain. Section 9 lists the contracts.

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
  seed: 'any',                            // optional: a seeded battle replays identically whatever the engine seed
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
enter  -> intro (SliceTransition: the field snapshot mosaics 2 px then 4 px under a white flash for 8 frames,
          then 12 vertical slices slide out alternately up and down over 18 frames; 26 frames, no rotation;
          reduceMotion = mosaic + plain white fade)
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
auto-advance after 150 frames while Auto is on). **W5:** while the command menu waits at its root with no
telegraph pending and Auto off, the help window's right side reads `{i:btn_start} Auto {i:btn_pageR} Speed`
(device glyphs; `x2` in gold when fast), so the command help lines are kept to 111 px (`CMD_HELP`). Touch
layouts instead draw two tap buttons `AUTO` and `x1 / x2` inside the help window (`layout.HELP_TOUCH_BTNS`,
`touchButtons()`), lit when on, throughout the fight. `reduceMotion` disables shake, flash, slow motion, the camera kick and the
slice intro (plain white fade instead); hit-stop stays (it is a pause, not motion).

## 3. Ops (the animator's vocabulary)

`planEvents(events, { units: unitInfo(b.units()) })` returns a flat list. Blocking ops carry `frames` (at 1x):
`wait`, `move {uid, to:'target'|'home'|'cover', target}`, `dissolve {uid}`, `fall {uid}`, `hitstop {frames, uid,
crit}` (freezes actors, fx and numbers; 2 frames on a hit, 4 on a crit or a Break; the scene also kicks the
camera 1 px toward `uid` for the pause, 1 px down as well on a crit). Instant ops: `help {text,color}`, `pose
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
| hit hold (single) / multi-target stagger / random-hit stagger | 14 / 5 / 9 | hit-stop normal / crit and Break | 2 / 4 |
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
- counters `battles_won / battles_lost / battles_fled / bosses_defeated`;
- `SCENE_GRANTED_UNIQUES` (`{ archivore: ['lanternheart'] }`): uniques a story scene gives itself right after
  the fight are dropped from the outcome (the rules still roll them), so the player gets exactly one;
- on `leave('win')` the scene stores the dropped gear uids in `engine.lastBattleDrops` for the field's equip
  prompt (docs/UI.md, W5).
Returns the summary the rewards windows draw: `{ exp, gold, levelUps, mastery, masteryPoints, items, consumables, used, flag }`.

## 6. Layout (384 x 216, `layout.js`)

Help window (4,4,218,19) thin; timeline rail at x 226 to 380, slots 18 px (first slot has 1 px extra); command
window (4,152,92,60); sub-list window (4,90,188,60) above it; party status (98,152,282,60) with rows every 17 px.
**Touch (W5):** rows are `rowHeightFor(engine, CMD_ROW_H)` = 15 px, so the command window grows upward to
`CMD_WIN_TOUCH` (4,140,92,72) and the sub-list to `SUB_WIN_TOUCH` (4,66,188,72), both still showing 4 rows
(`cmdWin(touch)`, `subWin(touch)`, `cmdRowsFor(win, rowH)`; `menu.cmdRect / subRect`). Tap a row to select it,
tap it again to confirm (List's tap model); tap a unit to target it, tap it again to confirm; a tap on the
command window cancels targeting.
(name, HP numbers + 75 px gauge with a white damage trail, MP, Fury with READY glow, up to 5 status badges).

**Stage (C3).** `buildBackdrop()` draws the zone backdrop (section 9) and then the indigo band `BAND.color`
(#292657) from `bandY` (the backdrop's json, default `BAND.y` 120) to the bottom at `bandAlpha` (default 0.55),
with the 2 rows above it Bayer-dithered at 50% and 25%. Every unit stands on one baseline per side,
`BASELINE.party` = `BASELINE.enemy` = 146 (6 px of floor above the bottom windows): party feet at x 290, 318,
346 (leader nearest the foes), enemies at `enemySlots(n)` spread over x 36 to 236 on the same y, the boss at
(98,146), summons at the four float slots around it. Draw order is feet y, then the moving unit, then x
(rightmost in front). Under every unit an ellipse shadow from the misc atlas chosen by `shadowFor(width)`
(about 0.8 of the sprite's width; 0.6 for flyers), centred 2 px below the feet, two passes for grounded units.
Grounded enemies breathe (the top 55% of the sprite settles 1 px on alternate 36-frame beats, `Actor.breath()`);
a hit squashes an enemy 2 px wider and shorter for its first hurt frames. Enemy row (shield badge + weakness
slots + status badges) sits under the foe, clamped above the windows. Rewards window (40,14,236,102) keeps the
party visible and hides the help bar and timeline; drop beams rise at x 150 on the enemies' side.

**Timeline (C4).** Each slot is an 18 px frame (`tl_party` blue, `tl_enemy` red, `tl_elite` for elites and
bosses, `tl_current` gold with the `tl_glow` pulse and a gold ring every 10 frames) over an ink backing with the
unit's 12x12 head from the `heads` atlas (`head_<id>`, `HUD.drawHead`). The preview landing slot is drawn
below the rail with a marching gold dashed border. Fallback when `heads` is not loaded: the party's portrait
face crop and a smooth 12x12 thumbnail of the enemy sprite.

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
- `python next/qa/battlescene/autobattle.py` (scenarios: start stage strip_intro strip_impact breathe
  reduce_motion command target_preview break boss victory levelup flee strip_attack strip_enemy strip_death
  boss_phase party_ko combo boss_death e2e_win e2e_lose e2e_all); PNGs, filmstrips and `_zoom_*.png` crops in
  `qa/battlescene/out/`. `stage` shoots the four backdrops with feet zooms and reports asset-or-fallback plus
  bandY; `strip_intro` films the slice transition at 2-frame steps; `strip_impact` films slash, thrust, Ember,
  chop and arrow at 1-frame steps zoomed on the target and asserts the camera kick; `breathe` asserts enemies
  move between beats while their feet do not; `reduce_motion` asserts no kick under reduceMotion. `e2e_win` is
  Auto at 2x from push to 'win' under 60 s wall clock; `e2e_all` plays every encounter (with an elite every
  fourth) to an outcome with no engine errors. `qa/battlescene/out/before/` keeps the pre-W4 shots.
- `node next/qa/run.mjs battlescene`.

## 8. Known gaps

- Enemies have one frame each (DESIGN 6.3): attacks are a lunge plus procedural fx, hurt is a 2 px recoil plus
  the squash, idle is the 1 px breathe.
- No touch "tap to confirm" hint glyph in the help window (the AUTO / x2 buttons and the row model cover touch).
- No name on hover over a timeline slot (CRITIQUE C4 suggested one); the heads carry identity on their own.
- The help window is one line; long telegraph sentences are cut with an ellipsis (the marker, timeline '!' and
  the orange color carry the warning).
- The battle_start QA shot still takes its snapshot from whatever scene is under the debug push (the title in
  shots.json), so its slices carry logo letters; in play the snapshot is always the field.

## 9. Contracts with the art (W4-art)

- Backdrops: `assets/backdrops/battle_valley|battle_archive|battle_boss.png` (384x216) with a json of the same
  stem carrying `"image"`, `bandY` and `bandAlpha`. The manifest lists them as **atlases**, so the scene reads
  `assets.atlas(id).image` and `.meta.bandY / .meta.bandAlpha`; when an id is not in the manifest the scene
  path-loads the png and json itself (`preloadBattleArt`, a plain image plus `<id>_band` json), and when the
  file is missing it falls back to the old environments.webp crop. Zone -> asset: valley -> battle_valley,
  archive and archive_deep (F3, darkened 22% more by code) -> battle_archive, boss -> battle_boss. The band is
  never baked into the png.
- Heads: `assets/ui/heads.json` atlas id `heads`, frames `head_<id>` 12x12 (1 px frame included, origin
  top-left) for hero, mira, bram and every enemy and boss id; `lost_page_<n>` variants fall back to `head_lost_page`.
- Shadows: misc atlas `shadow_small|medium|large|huge` with their centre origins in misc.json's `origin` table
  (resolved with `frameOrigin`, since `normalizeAtlas` only reads array origins).

## 10. Auto brain (src/battle/ai.js competentPolicy, PLAYTEST 7)

Heals at 55% when three or more foes are up and at least one is Archive-grade (level 4+), 40% otherwise, 50% in
boss fights; potions only under 40%. Revives with a Phoenix Feather before anything else unless a plain attack
would end the fight. While a telegraph is pending it takes any one-hit Break, else a known-weakness chip on the
charging foe when the party's turns before it can finish the Break. A member under 35% with no potion and the
healer not ready (Mira dead, silenced, out of MP or more than three slots away) Defends; Bram with Guard covers
a teammate in that spot instead. `node tools/sim/simulate.mjs --check` meets every target with this policy (the
55% rule is gated to Archive groups because an early Mend in valley_pack pushed it to 5.5 rounds, past the 3 to 5
target).
