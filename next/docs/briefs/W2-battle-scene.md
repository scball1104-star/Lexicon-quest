# W2-battle-scene: the battle presentation (scene, layout, animation, fx, rewards)

**Owned paths:** `next/src/scenes/battle.js`, `next/src/battle/fx.js`, `next/src/battle/scene/**`,
`next/qa/battlescene/**`, `next/docs/BATTLE_SCENE.md`.

The rules exist and are tested (`docs/BATTLE.md` section 7 is your API; read sections 1 to 5 too). Your job is
to make battles **look and feel** like a top SNES RPG: FF6/Chrono Trigger staging, Octopath-style clarity on
shields and weaknesses, Sea of Stars snappiness. Mocks: `tools/art/ui/out/mock_battle_command_3x.png` and
`mock_battle_break_3x.png` (match them). UI primitives come from W2-ui (`src/ui/*`); until they land use a
local stub and swap when messaged.

## Deliverables
1. **Scene** `battle.js`: `engine.pushAwait('battle', {encounterId, start:'normal'|'preemptive'|'ambush', boss,
   canFlee})` -> `'win'|'lose'|'flee'`. Builds the battle with `createEncounterBattle` using `engine.game`
   (party, items, bestiary, `engine.rng.fork('battle')`), runs the loop, applies `applyResult` and rewards into
   `engine.game` (gold, items via `addGear`/`give`, bestiary merge of `revealed`, consumables), and
   registers `LQ_DEBUG.battle(encId, opts)`.
2. **Entry**: field snapshot (`r.snapshot()`) -> `encounter` sfx -> swirl/shatter transition (mosaic + rotate
   shards or a dither wipe, 30 frames) -> backdrop reveal. Backdrop: `../assets/art/environments.webp` cell 0
   (Willowmere) cropped 384x216 (zone-dependent crop/tint: valley bright, archive floors darker with an ink
   tint, boss room violet) plus a darkened lower band for the windows. Party slides in from the right.
3. **Layout** (DESIGN 7): enemies left (diagonal, size classes small/medium/boss), party right in a diagonal
   with `party_battle` sprites facing left; bottom-left command window; bottom-right party status rows
   (name, HP gauge + numbers, MP, Fury gauge with READY glow, status badges); top-left help window (the current
   actor or the telegraph text); top-right timeline of the next 8 (`b.timeline(8)`) with face crops (14x14 from
   portraits) and enemy mini icons, current slot highlighted, **preview slot** shown while choosing an action.
4. **Commands**: list from `b.commands(u)` with disabled reasons; submenus for Tech/Magic/Item/Combo with MP
   or qty and the help line; Fury command glows when ready; Combo appears only when `visible`. Targeting:
   reticle over the target, left/right cycles, up/down switches side where legal, `all` highlights everyone;
   the preview (`b.previewTimeline`) shows expected damage range, WEAK/`?`, shields after, kills, and where the
   actor lands on the timeline. Touch: tap a command, tap a target, tap again to confirm. Auto toggle (`start`)
   uses `partyAction(b)`; battle speed from settings (1x/2x) scales animation frames.
5. **Event animation** (`battle/scene/animator.js`): consume the event array sequentially with frame-timed
   steps: `move_to` step-in, attack wind-up + strike pose + weapon arc fx (`fx.js`: slash, thrust, chop,
   arrow, staff bonk, magic circles, fire/ice/thunder/light bursts, heal sparkle, poison bubbles, ink splash),
   hit-stop 3 frames, white flash on the target, shake on heavy hits, damage numbers (`font_num`: crit big
   yellow, heal green, mp blue, poison purple, MISS/WEAK/BREAK/RESIST/IMMUNE word art), shield pips chipping,
   BREAK burst + sound + slowdown, status badges, telegraph callout (help window text + a pulsing marker over
   the enemy + `telegraph` sfx), summon/split pop-ins, enemy death = flash then pixel dissolve, boss death =
   long shake + white out, KO = kneel then fall, revive sparkle, Fury READY flash, combo = both actors step in
   with a special fx, phase/stance = banner text. Enemies idle-bob/breathe; elites get a gold name and tint.
6. **Sound** for every event (ids in `assets/audio/README.md`): weapon swings, hits light/heavy/crit, elements,
   heal/buff/debuff, break, fury, combo, summon, devour, ko, victory fanfare, music: `battle` for normal
   fights (`pushMusic` so the field track resumes), `boss_archivore` for the boss (Echo Warden uses `battle`
   with a drum intro if you like).
7. **Victory**: party victory poses, fanfare, rewards window (EXP, gold, mastery gains per weapon, item drops
   with rarity beams + per-rarity drop sounds, "Received" rows), level-up window per member (stat gains,
   learned skills, `level_up` jingle), mastery-up callouts; fade back to the field. **Defeat**: fade to
   `gameover` (unless the encounter is a scripted loss). **Flee**: dash right with `flee` sfx.
8. `docs/BATTLE_SCENE.md`: how the scene is driven, debug entry points, timing table.

## Verify
`qa/shots.json` shots: battle_start, battle_command, battle_target_preview, battle_break, battle_boss,
battle_victory, battle_levelup, at desktop and phone, driven via `LQ_DEBUG.battle('valley_wolves')`,
`LQ_DEBUG.battle('archive_boss')` and `LQ_DEBUG.press`. View them; iterate against the mocks until they look
shipped. Headless end-to-end: Auto mode from start to victory with zero console errors in under 60 s at 2x,
plus a scripted defeat. Unit tests for the animator's event-to-steps mapping (every event type handled; unknown
types do not stall) and for reward application into game state.
