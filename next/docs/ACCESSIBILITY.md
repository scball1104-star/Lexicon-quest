# ACCESSIBILITY: the first accessibility review of Lexicon Quest NEXT

Read-only review, Tuesday 2026-11-10 (Eastern, late night), worktree `D:\lq-art` on branch `scott/a11y-review` (from overhaul
e589417), Episodes 1 to 6 live. Scope: what a player with low vision, colour blindness, motion sensitivity, reading
difficulty, hearing loss or limited fine motor control meets. Whole-game craft and pacing are in `CRITIQUE_9.md`, not here.

Sources: the code named in each item; 26 phone shots and 2 portrait shots I took with `python next/qa/shots.py --only ...
--device phone|portrait --timeout 3000` (in `next/qa/out/phone-*.png`, `portrait-*.png`, not committed); contrast measured
two ways, from the palette in code (`src/core/font.js` `NAMED_COLORS`, `src/ui/window.js` `DEFAULT_COLORS`) and from pixels of
the phone shots sampled back to game pixels (most frequent fill colour against the most frequent background colour in the
named box), WCAG 2 relative luminance; colour blindness simulated with the Machado 2009 matrices (protanopia,
deuteranopia, tritanopia, severity 1.0) on the phone shots, in a scratch script that is not committed.

Phone profile (844 x 390 css at 3x, landscape, touch): the canvas is drawn at 5 device px per game px, so **1 game px =
1.67 css px** (Fact, measured: the canvas spans 1920 x 1080 device px of the 2532 x 1170 shot). Portrait (390 x 844 css):
3 device px per game px, **1 game px = 1 css px** (Fact, `portrait-battle_command.png`).

Tags: **Fact** (measured, seen, or read in the named code), **Reported** (from a doc or another review), **Inference** (my
reading, with the check that would settle it). Sizes: **S** hours, **M** about a day, **L** several days or new art.
"Hot" means one of the hot files in the repo root `AGENTS.md`. "Budget" means the 2.34 MiB before-the-tap-prompt load
(`next/qa/pwa/budget_ratchet.json`); every S fix below is a few dozen gzipped bytes of code in a startup module, which still
has to be reported in its pull request.

**Status, 2026-11-11:** the top five (section 5) shipped in PR #81 (issue #74) and the next motion and touch work in PR #83
(issue #82). Section 6 says what each item now stands at; the findings below are the review as written on 2026-11-10.

## 1. Verdict

The game is kinder than most pixel JRPGs to slow, motor-limited and hearing-impaired players: battles are turn based with
no clock, dialogue never advances on its own, every control works by keyboard alone (one hand), touch alone and pad, and the
episode mechanics are drawn with shapes and words, not colour alone. What fails is the option that should protect motion
sensitive players: **the operating system's "reduce motion" request is silently ignored** (a merge-order bug, Fact), and
the in-game Reduce motion row keeps flashes at 30%, keeps every battle particle and 7.5 to 10 Hz HUD blinks, while its help
line promises "Turn off screen shake and flashes". Below that, secondary text colours sit under 3:1 on the window tops in
every window colour, there is no larger text and no high-contrast choice, and a phone held upright shows 7 css px capitals.

## 2. What already works

- **No time pressure in play.** CTB battles wait for the player (`DESIGN.md` 7, Fact); no timed field hazard or quick-time
  input exists in Episodes 1 to 6 (Fact, a search of `src/world`, `src/data/ep*/field` for timers and timed gates finds none).
- **Dialogue waits.** The window never advances by itself; a press completes the page, the next press turns it
  (`src/ui/dialog.js` 227 to 254, Fact). Pages end on word boundaries (`docs/UI.md`, Fact).
- **Every input path is complete.** Keyboard (arrows or WASD, Z/Enter/Space, X/Esc/Backspace, C/Tab, Q/E, Shift), standard
  gamepad, and touch (d-pad, A, B, MENU, RUN, taps on lists and dialogue). The left hand alone reaches everything: WASD,
  Space, X, C, Q, E, Shift (`src/core/input.js` `DEFAULT_KEYS`, Fact). Touch controls can be forced On for mouse play
  (Config, Fact).
- **Big physical touch controls** on the phone: A and B 57 css px plus a 6 px margin, the d-pad 99 css px plus 10, RUN and
  MENU at least 36 css px tall plus 8 (`src/core/touch.js` `layout`, Fact by the code's own arithmetic and the shots). Short
  menus use 27 game px rows (45 css px, `TOUCH_TAP_H`), the touch main menu 30 px rows (50 css px) (Fact).
- **Assists for a struggling player:** Auto battle, 2x battle speed, Always run, Equip prompts, and Retry from the game over
  screen, which heals the party in full and returns to the last safe point (`src/scenes/gameover.js` 40 to 46, Fact).
- **Telegraphs and Break are seen, not only heard.** A charging foe gets an orange "!" over its timeline head
  (`battle/scene/hud.js` 198 to 200), shrinking rings (`battle/fx.js` `fx_telegraph`) and a help line; a Break swaps the
  shield badge for the broken one and pops the word BREAK (Fact, `phone-battle_break.png`).
- **Weakness, resist and element are shapes.** Each element has its own icon (sword, feather, flame); a resist draws the
  `weak_null` slash over its icon; unknowns are a "?" box (`hud.js` 293 to 305, Fact). Under all three simulations the
  enemy rows read the same (Fact, simulated `phone-battle_target_preview.png`, `phone-battle_gale_gust.png`).
- **Episode mechanics survive colour blindness.** Gust lanes are chevrons, the sun band in Episode 5 is a hatched texture,
  Episode 4 water and tide marks are value and shape, Heat pips are filled flames against hollow ones (Fact, simulated
  `phone-field_ep6_lane_a.png`, `phone-field_ep5_glass_flat_noon.png`, `phone-field_ep4_flood_lane_mid.png`,
  `phone-battle_heat_pips.png`).
- **Numbers are double coded.** Damage digits carry a built-in 1 px ink outline (`assets/ui/font_num.json` note), heals
  carry "+" (`battle/scene/animator.js` 369, 376, 431), equip deltas carry signs (Fact).
- **Lightning was built as a photosensitivity rule:** at most one flash per 4 s, at most +0.12 luma on cloud cells only,
  none under Reduce motion (`src/data/ep6/field/storm.js` 4 to 22; battle storm `src/data/ep6/scene.js` 782, Fact).
- **Main text contrast holds.** White body text is 4.7 to 6.4:1 on the lightest (top) band of all six window colours and
  7.5 to 9.4:1 on the middle band; the boot prompt "Tap or press any key" is gold on ink at 13.4:1 (Fact, computed). On the
  phone the body font's capital is 11.7 css px tall, about a 16 px web font (Fact: `font.json` `capHeight` 7, x 1.67).
- **Puzzle refusals show themselves:** a stuck block rocks and Bram sweats (`src/world/abilities.js` 537 to 545), a locked
  door says "Locked. It needs a key." (`src/world/events.js` 727), a vane that would drop the party says so
  (`src/data/ep6/field/system.js` 291 to 294) (Fact).

## 3. What the Options menu does, exactly

The Config scene (`src/scenes/config.js` 25 to 42) has 14 setting rows: Master, Music, Sound effects, Ambience, Text speed, Battle
speed, Auto battle, Battle cursor, Equip prompts, Window color, Always run, Reduce motion, Touch controls, Screen scaling,
plus Reset to defaults. The four the brief names:

| Option | Does | Does not |
|---|---|---|
| **Reduce motion** (`reduceMotion`, default false, meant to follow the OS) | Screen shake off for every caller (`core/renderer.js` 334, 400). Full-screen flashes multiplied by 0.3 (renderer 349). Iris and mosaic transitions become fades (`core/engine.js` 475). Windows open instantly (`ui/window.js` 355). Battle: the attacker's kick and the Break slow motion off (`scenes/battle.js` 509, 565), the entry shatter becomes a white fade (`battle/fx.js` 1017). Field: water shimmer, reflections, silverglass, fog drift, Episode 3 steam and glints, Episode 4 to 6 bobbing and sweeps, rain frozen, lightning off; close-up inserts open and turn pages at once (`world/closeup.js`); key-art video clips are never loaded (`ui/clips/player.js` 188); the rarity beam's flash off (`ui/toast.js` 104); boot motes still. | Honour the OS setting (item 1). Remove flashes (they stay at 30%). Touch battle particles (Break burst, page burst, rays, rings, quake), the white sprite hit flash and the boss death's 70-frame white hold, damage number bounce, hit-stop, the HUD blinks (Fury READY and the weakness frame at 7.5 Hz, the shield count at 10 Hz, Heat pip flicker), a flared foe's whole-sprite flicker at 3.75 Hz (`battle/scene/actors.js` 215), the boot prompt blink, the cursor bob, cutscene camera pans (item 2). |
| **Text speed** (Slow / Normal / Fast / Instant = 30 / 60 / 120 characters a second / all at once, `ui/text.js` 65) | The dialogue typewriter, and the text blips with it. | Toasts (1.5 s), the cold open's toll captions (84 frames), title cards (100 to 240 frames), the credits roll: all on fixed clocks (item 7). |
| **Window color** (Blue, Crimson, Forest, Violet, Slate, Ember) | The gradient of every window drawn by `drawWindow`. | Text colours, the HUD gauges, the touch controls. No dark or high-contrast scheme; the six tops are all mid-tones (item 3). |
| **Screen scaling** (Integer, Sharp, Fit; `core/renderer.js` 37 to 55) | Integer: the largest whole scale, dropping one step on touch so the controls fit beside the game. Sharp: exact fit, sharp-bilinear. Fit: exact fit, nearest. | Make text bigger than the screen allows. On the phone, Fit takes the picture from 1.67 to 1.81 css px per game px (+8%), but the side bars fall to 75 css px, under the 84 the controls need, so the controls move over the picture at 46% opacity (Fact, the layout code). |

Also in settings but not in the menu: `touchOpacity` (0.75) and `haptics` (read in `core/touch.js` 261, no row). The
keyboard can be rebound in code (`Input.setKeyBindings`, `core/input.js` 171) but nothing calls it (Fact).

## 4. Findings, ranked by harm times reach

1. **MAJOR (motion): the OS "reduce motion" preference is never honoured.** (S)
   - Who: motion-sensitive players who set it once in their phone or computer, which is the normal way.
   - Where: `src/core/engine.js` 316 to 319 with `src/core/save.js` 147 to 149.
   - Seen (Fact, run with the real save module and empty storage): `loadSettings()` returns stored settings merged over
     `DEFAULT_SETTINGS`, so `saved.reduceMotion` is always present (false), and the line
     `{ ...DEFAULT_SETTINGS, reduceMotion: osReduce, ...saved }` overwrites the OS value. Fresh storage, OS asking for
     reduce: `settings.reduceMotion` is false. The comment in `save.js` 24 says "defaults to the OS preference".
   - Fix: at boot read the raw stored object (`this.save.loadSettings({})`) so only keys the player set override `osReduce`;
     make Reset to defaults (`scenes/config.js` 91) write the OS value for `reduceMotion`. Add a node test with a fake
     `matchMedia`.
   - Hot: no. Budget: bytes. Design call: no.

2. **MAJOR (motion, photosensitivity): Reduce motion does less than its help line says.** (S for flashes and blinks, M for
   particles)
   - Who: players with vestibular disorders, migraine, photosensitive epilepsy.
   - Where: help text `src/data/text.js` 265 ("Turn off screen shake and flashes."); flashes `core/renderer.js` 349 (x 0.3);
     battle screen flashes `battle/scene/animator.js` (13 call sites, alpha 0.3 to 0.9; the boss death is a 40-frame white
     flash at 0.9 after a 70-frame white sprite hold, 559 to 564), Episode 4 to 6 battle scenes (`data/ep4/scene.js`,
     `ep5/scene.js`, `ep6/scene.js`, 14 more); 62 cutscene `s.flash` calls at alpha 0.85 (`world/cutscene.js` 204);
     blinks `battle/scene/hud.js` 252 (READY, 7.5 Hz), 278 (shield count, 10 Hz), 296 (weakness frame, 7.5 Hz), 332 to 334
     (Heat pips), `battle/scene/actors.js` 215 (flare, 3.75 Hz, whole sprite).
   - Seen (Fact, code): with Reduce motion on, a boss death still shows a full white frame at 27% and the cutscene flashes at
     26%; particles and blinks are unchanged.
   - Flash rate (Inference): every full-screen flash is a single event separated by waits, and the storm is capped, so I
     found no sequence faster than 3 a second; at 2x battle speed a Break, a phase change and a death can land close
     together. Check: log `renderer._flash` starts per 60-frame window through a scripted boss fight at 2x.
   - Fix: under `reduceMotion`, `endFrame` draws flashes at no more than 0.1 alpha (or not at all), the blinks hold steady
     (draw the lit state), the flare tint holds at its mean, the white sprite hold becomes a 4-frame tint. Then the help line
     is true. Particles (M): halve counts and drop rays and rings under the flag in `battle/fx.js` `spawn`.
   - Hot: only if the help line is reworded (`data/text.js`). Budget: bytes. Design call: no for flashes and blinks.

3. **MAJOR (low vision, colour blindness): secondary text colours fail contrast on every window, and there is no
   high-contrast choice.** (S)
   - Who: low-vision players, older players, anyone on a phone outdoors.
   - Where: `src/core/font.js` 18 to 25 against `src/ui/window.js` 29 to 36.
   - Seen (Fact, computed on the top band of the six schemes; pixel measurements on the phone shots in brackets):

     | Text | Used for | Contrast on window tops |
     |---|---|---|
     | `dim` #8e8997 | disabled commands (Fury before it fills), unselected tabs, empty-slot notes | 1.5 to 2.1:1 (tab 3.7 measured on a dark band) |
     | `red` #e06b39 | the party member's name at 25% HP or less (`hud.js` 238) | 1.6 to 2.1:1 |
     | `magic` #6f8cff | magic-rarity item names (equip, shop, drops) | 1.7 to 2.3:1 (blue middle 2.8) |
     | Ledger faded name (cream at low alpha) | names not yet kept (`ui/screens/journal.js` 19) | 2.4:1 measured |
     | `legendary` #ff8a2a | legendary item names | 2.4:1 on blue |
     | `blue` / `mp` #6ab3e4 | MP numbers in the battle HUD | 2.3 to 3.1:1 (3.0 measured) |
     | `gray` #b3b6c4 | unselected Config values, place names, older log lines | 2.6 to 3.5:1 (3.8 measured) |
     | `orange` #eba14d | the FURY label | 2.4 to 3.2:1 (3.1 measured) |
     | `gold` #f9d77a | selected names, MP label, headers | 3.7 to 5.0:1 (4.6 measured) |

     The 1 px ink shadow under every glyph sharpens the edge (Inference: it helps a sighted reader, it does not help a
     reader who needs fill contrast; check with a low-vision tester).
   - Fix: a seventh window colour, **Ink** (top about #24223a, bottom #14101e). Computed against #24223a: white 14:1,
     gray 7.6, dim 4.5, red 4.6, magic 5.0, mp 6.7, orange 7.1, gold 11. One entry in `SCHEMES`, `SCHEME_NAMES`,
     `DEFAULT_COLORS` and `assets/ui/window.json` `colors`; the Config row picks it up from `SCHEMES`.
   - Hot: no. Budget: bytes. Design call: a light one (a new look players can choose).

4. **MAJOR (low vision): text cannot be made bigger, and a phone held upright shows 7 css px capitals.** (L for a size option)
   - Who: low-vision players; any phone player who plays upright.
   - Where: `core/renderer.js` 37 to 55 (scale), `assets/ui/font.json` (`capHeight` 7, `xHeight` 5).
   - Seen (Fact): landscape phone capitals 11.7 css px, x-height 8.3; portrait capitals 7 css px, x-height 5, battle
     commands on 18 css px rows, FLEE / AUTO / x1 31 x 15 css px (`portrait-battle_command.png`). The rotate hint shows once
     (`settings.rotateHintSeen`, `core/engine.js` 259 to 262).
   - Fix: smallest (S): show the rotate hint each time a session starts upright, not once ever. Real fix (L): a Large text
     setting needs a second body font and layouts that allow fewer lines; on a 216 px screen that is a design question.
   - Hot: no for the hint. Budget: the L option adds a font at startup (about 2 to 4 KB, Inference) or goes in a pack.
     Design call: yes for Large text.

5. **MAJOR (colour blindness, low vision): low HP is shown only by the name turning red, the lowest-contrast colour.** (S)
   - Who: protan and deutan players (red reads as olive, simulated `phone-battle_*` grids), low vision (1.6 to 2.1:1).
   - Where: `src/battle/scene/hud.js` 238.
   - Fact: no icon, word or sound marks 25% HP; KO at least changes the FURY label to KO (`hud.js` 247).
   - Fix: keep the colour and add a shape: a 5 px "!" (the telegraph mark's glyph) before the name at 25% or less, or draw the
     HP numbers in the `font_num` red variant, which has its own ink outline.
   - Hot: no. Budget: bytes. Design call: small (which mark).

6. **MAJOR (reading, fine motor): a page can be skipped by accident and never re-read.** (S guard, M backlog)
   - Who: slow readers, players with tremor, children.
   - Where: `src/ui/dialog.js` 205 to 209 and 249 to 254.
   - Seen (Fact): confirm, cancel, a tap on the window and a tap anywhere on the screen all advance; at Instant text the
     page is complete on its first frame, so a double tap turns a page nobody read. There is no backlog or "last line" view
     anywhere (search for backlog, history, re-read: none). The longest runs are 50 pages and 3.5 minutes on Episode 6 F3
     (Reported, `PLAYTEST_REVIEW_8.md` 80) and 2.8 to 3.1 minutes on Episode 5 F2 (Reported, `PLAYTEST_REVIEW_7.md` 123).
   - Fix (S): a read guard, ignore advance presses for 10 frames after a page completes (the typewriter skip stays instant).
     Fix (M): keep the last 30 boxes and show them from the Journal (a fourth tab, "Said").
   - Hot: no. Budget: bytes (guard), about 1 KB (backlog). Design call: no for the guard, yes for the backlog.

7. **MINOR (reading): text on a clock ignores Text speed.** (S)
   - Who: slow readers, dyslexic players.
   - Where: `src/ui/toast.js` 26 (`HOLD = 90`, 1.5 s: item names, "HP and MP restored.", equip deltas); the cold open's
     toll captions (`TOLL_HOLD = 84`, `data/story/ep1.js` 63); 31 title cards at 100 to 240 frames (`s.title`); credits.
   - Fact: confirm can cut a title card short, nothing can hold it longer; Text speed Slow does not change any of these.
   - Fix: multiply these holds by 2 when Text speed is Slow (`{ 1: 2 }[textSpeed] || 1`), and at Slow hold a title card
     until a press.
   - Hot: no (toast.js, prologue.js, titleCard). Budget: bytes. Design call: no.

8. **MINOR (fine motor): touch rows and in-battle buttons are under 44 css px.** (M)
   - Who: players with tremor or large fingers.
   - Where: `src/ui/list.js` 33 (`TOUCH_ROW_H` 20 = 33 css px: items, skills, equip, journal, Config, game over);
     `battle/scene/layout.js` 15 (`TOUCH_CMD_ROW_H` 18 = 30 css px) and 57 (FLEE 31 x 15, AUTO 30 x 15, x1 28 x 15 = about
     50 x 25 css px); the full-screen button 24 css px plus 8 (`core/touch.js` 397).
   - Fact (code and `phone-battle_command.png`). `docs/UI.md` already says why dense lists stop at 33 css px. (UI.md's
     "15 px rows" for Config and game over is stale: both use `rowHeightFor`, 20 px.)
   - Fix: give the three help buttons the full help-window height (about 22 game px, 37 css px) and widen the command rows
     to 20; leave dense lists. Portrait (0.6 times all of this) needs item 4.
   - Hot: no. Budget: bytes. Design call: yes (battle layout is tuned and tested in `qa/ui/phone_ux.py`).

9. **MINOR (fine motor): Flee on touch is a timed double tap.** (S)
   - Where: `docs/UI.md` W7, `scenes/battle.js` help buttons: the first tap arms, a second tap within a second runs.
   - Fact. A player who cannot tap twice in a second cannot flee by touch (keyboard and pad keep Flee in the grid).
   - Fix: keep the arm until any other input, with the "Tap FLEE again to run." line showing.
   - Hot: no. Budget: bytes. Design call: no.

10. **MINOR (fine motor): no remapping.** (M)
    - Where: `core/input.js` 16 to 28 and 170 to 172 (the API exists, nothing calls it); no pad remap.
    - Fact. Mitigated: the left hand alone reaches every action; Always run removes the hold.
    - Fix: a Controls page in Config that writes `keys` to settings and calls `setKeyBindings` at boot.
    - Hot: no. Budget: about 1 to 2 KB at startup unless lazy (Inference). Design call: no.

11. **MINOR (colour blindness): the few cues that are colour or brightness only.** (S each)
    - Ledger: a kept name is cream, a missing one is the same text faded (2.4:1); the star appears only in the detail panel
      (`phone-ui_ledger.png`, Fact). Fix: draw the star (or a hollow star) at the row's right edge.
    - Rarity: the item name's colour is the only rarity cue in equip, shop and drops; no rarity word is drawn (search of
      `RARITIES[].name` use: none in `ui/` or `scenes/`, Fact). Fix: the rarity word on the detail line.
    - Decree pips (Episode 4): the lit pip is red and filled, unlit ones are grey rings; under protanopia the lit pip turns
      darker than the unlit ones, so "more" reads as "less" (Fact, simulated crop of `phone-battle_decree_pips.png`). Shape
      still separates them. Fix: give the lit pip a white core, as the Heat flame has.
    - Timeline sides: party heads sit in blue frames, foes in orange-red; under tritanopia all frames turn red-pink (Fact,
      simulated). The heads themselves (faces against monster heads) still tell the sides (Inference; check with a player).
    - The cyan "Combo" command and the cyan name of a member in the Kept state (`hud.js` 238) carry meaning by colour
      (Fact); low impact.
    - Hot: no. Budget: bytes. Design call: no.

12. **MINOR (hearing): the thirteenth bell is a sound.** (S)
    - Where: `src/data/story/ep1.js` 80 to 92 (`thirteenth_toll`) and the captions in `src/scenes/prologue.js` 35 to 55.
    - Seen (Fact): tolls one to twelve each get a name caption; the thirteenth, the hook of the whole game, is
      `bell_thirteenth`, a 3 px shake (gone under Reduce motion), the hero's "!" and a pan. A deaf player sees a boy start
      at nothing: the card that follows says only "In Aethelgard, every name is a promise." (`PROLOGUE`, ep1.js 45), and
      the first words about a thirteenth bell are Elder Mael's, later in the morning (ep1.js 223) (Fact).
    - Elsewhere sound-only cues are rare: telegraphs, Break, Gust, refusals and level-ups all have text or art (Fact,
      items in section 2). No speech is voiced, so there is nothing to subtitle; the per-speaker text blips carry no
      information (Fact, `dialog.js` 230 to 236).
    - Fix: a caption for the thirteenth in the toll style with no name (for example "THIRTEEN"), or the bells drawn swinging.
      Story wording is Scott's and Stephen's.
    - Hot: no. Budget: bytes. Design call: yes (wording).

13. **NOTE (all): difficulty.** There is no easy mode and no difficulty setting; Fine Print (`tier_1`) is a harder tier
    only (Fact). What a struggling player has: Auto battle, 2x, Retry with a full heal at the last safe point (the same game
    object, so items and EXP gained since are kept, Fact from `gameover.js` 41 to 45), shops and grinding. Field foes chase
    within 5 tiles in real time (`DESIGN.md` 6), which costs a slow mover a fight, never a life (Inference). Whether to add an
    assist (more EXP, lower foe damage) is a design call for Scott and Stephen; I only report it.

## 5. Top five fixes an agent could just do

All five are S, touch no hot file, change the startup budget by bytes only, and need no design call.

1. **Honour the OS reduce-motion setting** (item 1): `loadSettings({})` at boot in `src/core/engine.js`, Reset uses the OS
   value, plus a node test with a fake `matchMedia`.
2. **Make Reduce motion keep its promise** (item 2): flashes at most 0.1 alpha under the flag in `core/renderer.js`
   `endFrame`; steady READY, shield, weakness-frame and Heat-pip states in `battle/scene/hud.js`; a steady flare tint in
   `battle/scene/actors.js`; a short tint instead of the 70-frame white hold.
3. **Add a read guard to dialogue** (item 6): ignore advance presses for 10 frames after a page completes in
   `src/ui/dialog.js`; a `qa/ui` test that a double tap at Instant turns one page, not two.
4. **Let Text speed slow the clocks** (item 7): scale the toast hold, the toll captions and title-card holds by Text speed
   in `ui/toast.js`, `scenes/prologue.js` and the title-card scene.
5. **Untime Flee** (item 9): the FLEE arm lasts until another input in `scenes/battle.js`; update `qa/ui/phone_ux.py`.

Next in line, each with a light design nod: the Ink window colour (item 3), a mark for low HP (item 5), the Ledger star and
the rarity word (item 11).

## 6. Status after #74, #82 and the Reduce motion rest (2026-11-11)

What the fixes changed, by item. "Open" means the review's finding still holds. Fact: each line names the commit or the code.

| Item | Status | What changed, or what is left |
|---|---|---|
| 1. OS reduce motion | **Fixed**, PR #81 | The device setting applies until the player sets Reduce motion (`save.js` `bootSettings`, `reduceMotionSet`); Reset to defaults hands it back to the device. |
| 2. Reduce motion promise | **Fixed** for every looping or travelling mover the review named, PR #81, PR #83, PR #84, `scott/reduce-motion-rest` | PR #81: flashes at most 0.1 alpha, the battle entry dims to ink, READY, the shield count, the weakness frame, Heat pips and the Fury glow steady, the flare tint at its mean, a held white is a 4-frame tint. PR #83: the timeline head, the turn bar and ring, the telegraph "!", the Episode 3 to 6 battle marks, touch FLEE and AUTO (`hud.js` `steadyFrame`). PR #84: the target reticle and arrow, the menu glove (`ui/cursor.js`, every list), the rewards confirm glyph. `scott/reduce-motion-rest`: battle particles keep a third of their count and a third of their travel, with no blink or sway (`battle/fx.js` `particles`, `REDUCED_TRAVEL`; the Binder's page burst leaves too, `data/cave/fx.js`); rings and rays hold their halfway shape and fade in place; the impact star, the Break sprite and the numbers still mark every hit. Damage numbers appear at their resting place, hold and fade (`ui/numberPopup.js` `layout`), same column, same timing. The boot "Tap or press any key" and retry lines stay lit, the ready bar glow holds at its mean, no twinkle (`core/engine.js`). The text box advance mark and the list scroll arrows rest (`ui/window.js`). The field lock-on reticle holds its first frame and size and only fades (`world/abilities.js` `drawReticle`). Cutscene camera pans cut on their first frame and hold for the same frames, so every scene keeps its pacing (`world/camera.js`, the one camera every story and field pan uses). **Kept on purpose:** hit-stop (a 2 to 4 frame pause; nothing on screen moves, and the camera kick that rides it is already off under Reduce motion); the glove's one-shot nudge after a missed tap (`ui/list.js` `nudge`: it answers a tap, it does not loop); weapon arcs and thrown shots (they show who hit whom, once). **Open:** the bobbing field prompts over the leader and over talk and ability targets (`scenes/field.js` 1158 and 1207, a hot file; `world/abilities.js` `drawOverlay` goes with them so the field stays consistent). |
| 3. Contrast, Ink window colour | Open | Needs the light design nod. |
| 4. Bigger text, portrait | Open | The rotate hint still shows once ever (`settings.rotateHintSeen`). |
| 5. Low HP by colour only | Open | Needs the choice of mark. |
| 6. Skipped pages | **Guard fixed**, PR #81; backlog open | `READ_GUARD` (10 frames) in `ui/dialog.js`. The "Said" backlog is a design call. |
| 7. Text on a clock | **Fixed**, PR #81 | `textHold` (`ui/text.js`) doubles toasts, toll captions and title cards at Slow. |
| 8. Touch targets | **Partly fixed**, PR #83 | FLEE / AUTO / x1 are tapped on `HELP_TOUCH_HITS`: 62 / 53 / 55 x 45 css px in phone landscape. **Open:** battle command rows stay 18 px (30 css px), dense lists 20 px (33 css px), portrait help buttons 27 css px tall (a layout call). |
| 9. Timed Flee | **Fixed**, PR #81 | The arm holds until the second tap or another input. |
| 10. Remapping | Open | |
| 11. Colour-only cues | Open | |
| 12. The thirteenth bell | Open | Wording is Scott's and Stephen's. |
| 13. Difficulty | Open | A design call. |
