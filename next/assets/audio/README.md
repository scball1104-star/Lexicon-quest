# Lexicon Quest NEXT: sound effects, jingles and ambience

Everything in `sfx/`, `jingles/` and `ambience/` is synthesized in code by `next/tools/audio/` (Python +
numpy/scipy). Nothing here is sampled or downloaded, and every melody is original. This file is generated
by `python next/tools/audio/build.py`; edit the generators, not the WAVs.

**How to audit by ear.** Each row says what the sound is meant to be. Play the file and ask: does it read
as that, at a glance, in the classic SNES / Dragon Quest / Final Fantasy idiom, without harshness? If not,
note the id and the one change you want ("cursor: a little lower and softer"). The designs live in
`tools/audio/sfx_defs.py` (SFX), `jingles.py` (note-by-note scores) and `ambience.py`.

## Formats and levels

| Kind | Format | Level target |
|---|---|---|
| SFX | WAV 16-bit mono 22050 Hz | per group, max 200 ms K-weighted loudness: UI -19 (cursor -21), text -25, footsteps -27, field -18, story -17, weapons -15, impacts -14, magic -15.5, status -16.5, big moments -14, loot -16 |
| Jingles | MP3 stereo 32 kHz 160 kbps (WAV masters in `tools/audio/out/jingles_wav/`) | about -17 LUFS integrated, just under the music |
| Ambience | WAV 16-bit mono, seamless loop (river 22050 Hz; archive, wind, mere and court 16000 Hz, nothing above 8 kHz) | -22 LUFS integrated (about 11 dB under the music at default sliders); the runtime plays two copies half a loop apart panned left/right for a wide stereo bed |
| Music | MP3 (Suno or code-composed) | manifest `volume` brings each track to about -16 LUFS |

Every file: true peak <= -1 dBFS, DC removed, 2 ms fade-in / 5 ms fade-out (loops excepted), TPDF dither.
Runtime sliders (master, music, sfx, ambience) multiply on top; jingles follow the music slider.
Jingles are MP3 because they never loop (encoder padding is harmless) and it saves about 2.7 MB; SFX stay
WAV for sample-accurate timing, ambience stays WAV so the loops are gapless.

## Runtime

`next/src/core/audio.js`, `createAudio({basePath})`. See the header comment there for the API. Ids below
are the exact ids to pass to `audio.sfx(id)`, `audio.jingle(id)` and `audio.ambience(id)`. Unknown ids are
silent no-ops. `text_blip` is an alias of `text_blip_mid`. Ids with several files pick a random variant
(never the same twice in a row); `vary` adds random pitch variance (fraction).

## Cue guide (where each sound belongs)

| Moment | Calls |
|---|---|
| Boot | `audio.preload(['jingle:item_get', 'jingle:level_up', 'jingle:victory_fanfare', 'battle'])` so the first chest and battle are instant |
| Menus | `cursor` on move (also on auto-repeat), `confirm`, `cancel`, `buzzer` for an invalid choice, `menu_open` / `menu_close`, `equip`, `buy`, `save_chime` |
| Dialogue | `text_blip_low/mid/high` every 2 to 3 visible characters (skip spaces), one voice per speaker; `emote_pop` with a balloon |
| Chest | `chest_open`, then about 0.35 s later `await audio.jingle('item_get')` (story items: `key_item`; battle loot: `drop_common/magic/rare/legendary` by rarity instead) |
| Doors and stairs | `door_open` when entering, `door_close` after the fade, `stairs` on stair exits, `door_locked` without a key, `door_unlock` with one |
| Dungeon toolkit | `block_push` per tile, `switch_on` / `switch_off`, `gate_open`, `crystal_hit`, `bridge_appear`, `lantern_reveal`, `brazier_light`, `shelf_move`, `jump` + `land` on ledges, `fall` into pits, `splash`, `pot_break` |
| Silverglass (Episode 2) | `mirror_turn` when a mirror rotates, `beam_hit` when a receptor first lights, `glass_bridge` as bridge cells light, `glass_break` for a Dash through a pane or the great mirror cracking, `mirror_step` through a mirror door, `ferry_oars` on Tovin's ferry, `clock_chime` for Lena's clocktower |
| Foundry and Emberpeak (Episode 3, pack `ep3`) | `quench_hiss` slag cools or a foe is quenched, `sluice_turn` / `water_flow` / `wheel_turn` the water puzzle, `anvil_strike` an oath anvil, `bell_first` the First Bell (slightly flat of D), `furnace_roar` the Heartforge, `hammer_charge` the Last Hammer telegraph, `oath_ring` Tempered Oath, `lift_rumble` ore lifts; ambience `forge_rumble` (foundry), `ash_wind` (the road and Emberpeak) |
| The Wider Valley (Expansion 1, pack `x1`) | `slab_slide` the Barrow's slabs, `stone_name` a standing stone's letters return, `sheep_baa` (two variants) strays and ambient sheep, `loom_clack` Tamsin's loom, `wheel_groan` the millrace wheel (`mill_turning`), `star_chime` each dark star wakes, `orrery_hum` the Orrery aligned, `hive_buzz` Yarrow's hives, `windmill_creak` the Windmill's sails, `chime_post` (two variants) a chime post; ambience `moor_wind` (the High Moor), `larchhill_hum` (Larchhill); every one names a core `fallback` |
| Packs | Every sfx has a `pack` in the manifest: `core` (precached, loaded at boot), `ep2`, `ep3` and `x1` (fetched by `audio.preload(['pack:ep3'])`, or `audio.loadPack('x1')` with the Wider Valley pack when that episode is first entered: a title Episode pick, a save in that episode, or its first map; runtime-cached by the service worker). A pack id that has not arrived is skipped quietly or plays its `fallback` (a core sfx) |
| Battle start | `sfx('encounter')` with the swirl, then `pushMusic('battle')` (boss: `pushMusic('boss_archivore')`, the Nameless King: `pushMusic('boss_king')`) |
| Attacks | swing (`sword_slash`, `spear_thrust`, `staff_hit`, `axe_chop`, `bow_shot`) at the wind-up, then `hit_light` / `hit_heavy` / `crit` / `miss` on contact; `defend` for guards and blocked hits |
| Spells and states | `fire`, `ice`, `thunder`, `heal`, `revive`, `item_use`, `buff`, `debuff`, `poison`, `stun`; `break` when shields hit 0; `fury_ready` when the gauge fills, `fury_art` on use; `combo_start`; `telegraph` when a big move is announced |
| Enemy defeated | `enemy_die` (boss: `boss_die`) |
| Victory | `stopMusic(0.2)`, `await jingle('victory_fanfare', { duckMusic: false })`, `music('victory')` (silent until a track exists), level up: `jingle('level_up')` + `sfx('level_up_sparkle')`, then `popMusic(0.8)` back to the field track at its old position |
| Defeat | `stopMusic(0.5)`, `await jingle('gameover_sting', { duckMusic: false })`, `music('gameover')` |
| Inn / save | `await jingle('inn_rest')` across the fade to black (music pauses and resumes); the chapel Bell: `jingle('save')` |
| Party / quests | `party_join` when Mira or Bram joins, `quest_done` for side quests |
| Story | `bell_toll` (a tower bell; the cold open's twelve tolls), `bell_thirteenth` (the Thirteenth Bell, core), `bell_peal`, `sign_fade`, `name_restore`, `door_rumble`, `ink_gurgle`, `page_flutter`, `summon`, `name_devour`; Episode 2: `reflection_out` (the Other Selves step out), `kept` / `kept_break` (the Kept status starts / ends) |
| Ambience | map `ambience:` field: `river_birds` (Willowmere, riverside valley), `wind_valley` (open meadow, pilgrim road), `archive_hush` (all Archive floors), `mere_still` (the Hollow and its interiors), `court_hush` (every Court floor) |

## Sound effects

### Menus and interface

| id | length | files | intent |
|---|---|---|---|
| `cursor` | 45 ms | 1 (max 2 voices) | Menu cursor move. A 45 ms bright tick (B6 pulse, fast decay) with a tiny click on top. Must stay pleasant when held down for repeat. |
| `confirm` | 175 ms | 1 | Menu confirm. Two-note rising blip E6 then B6 (a fifth up), clean pulse with a sine sparkle an octave above the second note. |
| `cancel` | 240 ms | 1 | Menu cancel / back. Descending two-note blip A5 to E5, softer triangle plus thin pulse so it reads as 'back' without scolding. |
| `buzzer` | 195 ms | 1 | Not allowed / invalid choice. Low 'bu-bu' made of two detuned squares (110 and 116 Hz beating) filtered to 2.4 kHz so it is firm, not harsh. |
| `menu_open` | 176 ms | 1 | Main menu opens. Quick rising G5-D6-G6 sparkle with a soft upward air swish. |
| `menu_close` | 176 ms | 1 | Main menu closes. Mirror of menu_open: G6-D6-G5 falling with a downward swish. |
| `equip` | 508 ms | 1 | Equip an item. A short metallic 'shing-clink' (stiff-bar partials at 1.9 kHz) over a small leather/armor thunk. |
| `buy` | 511 ms | 1 | Purchase / gold spent. Coin 'ka-ching': register click, an sfxr coin pickup (B6 jumping up) and a bright metal shimmer. |
| `coin` | 189 ms | 1 | Gold picked up in the field or from a chest. Classic two-step coin blip (sfxr pickup preset). |
| `save_chime` | 1.12 s | 1 | Save confirmed (short, used in the save menu; the chapel uses the 'save' jingle). Two soft FM chimes C6 then G6 with a gentle room. |
| `emote_pop` | 60 ms | 1 | Emote balloon appears (!, ?, heart). Tiny rising 'bwip' with a click. |

### Dialogue text blips

| id | length | files | intent |
|---|---|---|---|
| `text_blip_low` | 32 ms | 1 (vary 0.03, max 2 voices) | Dialogue typewriter blip, low voice (D4, about 294 Hz). 32 ms soft square/triangle; played every 2 to 3 characters. |
| `text_blip_mid` | 32 ms | 1 (vary 0.03, max 2 voices) | Dialogue blip, mid voice (B4). Default for most speakers. |
| `text_blip_high` | 32 ms | 1 (vary 0.03, max 2 voices) | Dialogue blip, high voice (F#5) for children, Mira when excited, small creatures. |

### Footsteps

| id | length | files | intent |
|---|---|---|---|
| `footstep_grass` | 90 ms | 3 (vary 0.06, max 2 voices) | Footstep on grass. Soft crunch of blades (band noise 1.8 to 6 kHz with crackle) over a faint heel thud. Quiet; 3 variants. |
| `footstep_stone` | 67 ms | 3 (vary 0.05, max 2 voices) | Footstep on stone (archive floor, plaza). Hard heel click plus a short mid knock and a low thud. 3 variants. |
| `footstep_wood` | 58 ms | 3 (vary 0.05, max 2 voices) | Footstep on wooden floor (interiors). Hollow knock from resonant board modes (250, 610, 1150 Hz). 3 variants. |

### Field and dungeon

| id | length | files | intent |
|---|---|---|---|
| `door_open` | 400 ms | 1 | Wooden door opens: iron latch click, then a short low hinge creak (stick-slip wood resonance). Friendly, not horror. |
| `door_close` | 345 ms | 1 | Door shuts: a push of air, a solid wooden thud (90 Hz body) and the latch dropping 40 ms later. |
| `stairs` | 508 ms | 1 | Taking stairs (map transition). Four quick footsteps stepping down in pitch and level, with a little room. |
| `chest_open` | 500 ms | 1 | Treasure chest opens: latch clack, short hinge squeak, then the lid thumping back. The item_get jingle follows. |
| `pot_break` | 394 ms | 1 | Breakable pot shatters: ceramic thump, a spray of glassy shards, grit and a couple of debris clunks. |
| `block_push` | 500 ms | 1 | Pushing a stone block one tile: heavy stone scrape (grainy band noise), gravel crackle and a low rumble. |
| `switch_on` | 350 ms | 1 | Floor or wall switch pressed ON: mechanical ka-chunk, then a small rising C6-G6 confirmation chime so the player knows something changed. |
| `switch_off` | 330 ms | 1 | Switch released / OFF: the same mechanism with a falling G5-C5 chime. |
| `gate_open` | 1.47 s | 1 | Heavy gate or portcullis rising: low rumble, stone grinding, a chain rattle (jittered metal clicks) and a final settling thud. |
| `door_locked` | 224 ms | 1 | Locked door: the handle rattles against the lock three times (metal clicks) with a dull thunk. Tells the player a key is needed. |
| `door_unlock` | 613 ms | 1 | Key turns in a lock: metallic scrape, a firm 'ka-clack', and a tiny bright chime. |
| `bridge_appear` | 1.62 s | 1 | Invisible ink bridge materializes: a rising glissando in fifths, gathering sparkles and a soft major chime as it locks in place. |
| `lantern_reveal` | 1.61 s | 1 | Lantern of Recall reveals hidden ink: a low warm swell, then an ascending whole-tone shimmer of bells (C-D-E-F#-G#) and a breath of air. Mysterious, rewarding. |
| `splash` | 451 ms | 1 | Water splash (falling into shallows, a stone into the river): noise burst, a water 'plunk', bubbles and fine spray. |
| `jump` | 160 ms | 1 | Hopping down a one-way ledge: a light rising 'hup' chirp with a puff of air. |
| `land` | 100 ms | 1 | Landing after a ledge hop: soft thud with a scuff of grit. |
| `fall` | 850 ms | 1 | Falling through a pit to the floor below: a descending whistle with rushing air. |
| `brazier_light` | 746 ms | 1 | Brazier or torch ignites in a dark room: a 'fwoomp' (rising air plus low thump) settling into a few crackles. |
| `shelf_move` | 935 ms | 1 | Moving bookshelf slides along the floor: heavy wooden scrape, groaning creaks and a settling knock. |
| `crystal_hit` | 779 ms | 1 | Crystal switch struck by a tool: a bright glassy ping (inharmonic plate partials) and a rising two-note shimmer. |
| `mirror_turn` | 609 ms | 1 | A mirror rotates a quarter turn on its stone base: a soft stone grind with a detent click, then a high glassy ring as the pane settles (C7 over E7). |
| `beam_hit` | 502 ms | 1 | A light receptor lights for the first time: a bright crystal chime (G6 glass plate plus a B6 bell) with a rising shimmer of glints sweeping up to the top. |
| `glass_bridge` | 600 ms | 1 | Glass bridge cells light up: a sustained glassy swell about 0.6 s long (E6, B6, E7 with a shimmering tremolo and a breath of air), rising in and settling out. |
| `glass_break` | 591 ms | 1 | A pane shatters (Dash through a glass pane; the great mirror cracking): a sharp crack, a dense spray of glass shards and a tinkling tail of falling slivers. |
| `mirror_step` | 425 ms | 1 | Stepping through a mirror door: a quick whoosh through a shimmering comb of glassy resonances, a soft swish in and out. |
| `ferry_oars` | 968 ms | 1 | Tovin's ferry: two slow oar strokes (a wooden oarlock knock, the blade pulling through water with a swirl and small bubbles), the second a little softer. |
| `quench_hiss` | 709 ms | 1 | Slag cools / a foe is quenched: a sharp hiss of steam with a crackle of cooling metal, about 0.7 s. |
| `sluice_turn` | 623 ms | 1 | A sluice paddle turns: a wooden clunk of the crank and a water slosh as the gate lifts. |
| `water_flow` | 1.29 s | 1 | Water starts running in a trough: a short rush that settles to a gentle trickle, about 1.3 s. |
| `wheel_turn` | 1.20 s | 1 | The waterwheel starts: a long wooden creak, then two slow clacks of the paddles. |
| `lift_rumble` | 1.62 s | 1 | Ore lifts: a chain rattle (links running over a drum) over a low rumble, about 1.6 s. |
| `slab_slide` | 648 ms | 1 | A Barrow slab slides: a heavy stone scrape that swells, drags, and ends on a dull stone thud, about 0.55 s. |
| `sheep_baa` | 436 ms | 2 (vary 0.04) | A mild baa from a sheep, two variants: a trembling nasal saw through two moving formants, about 0.4 s. |
| `loom_clack` | 342 ms | 1 | Tamsin's loom: two wooden clacks of the beater and a whisper of thread, about 0.5 s. |
| `wheel_groan` | 1.43 s | 1 | The millrace wheel turns again: a long wooden groan, a drip, then a steady wooden clack that settles into a rhythm, about 1.6 s. |
| `hive_buzz` | 606 ms | 1 | Yarrow's hives: a warm low hum with a few bees passing close, about 0.6 s. |
| `windmill_creak` | 730 ms | 1 | The Windmill's sails: a slow wooden creak with a sweep of air as a sail passes, about 0.8 s. |
| `chime_post` | 351 ms | 2 (vary 0.03) | A soft wooden wind chime on a post, two variants: three hollow wooden tubes struck by the wind, ringing briefly, about 0.4 s. |

### Story moments

| id | length | files | intent |
|---|---|---|---|
| `door_rumble` | 1.72 s | 1 | Great stone-and-root door grinding open (Archive seals, the boss door): deep rumble, grinding stone, straining root creaks, falling grit, a final thud. About 1.5 s. |
| `bell_toll` | 3.21 s | 1 | One deep bronze church-bell toll, slightly eerie: the Thirteenth Bell. Nominal about A3, hum an octave below, minor-third tierce, slow beating between detuned partials, about 3.5 s decay in a large stone space. |
| `bell_peal` | 4.25 s | 1 | Willowmere's twelve bells ringing together in celebration: one full round of twelve bells descending a major scale (G6 to C5), then the start of a second round with pairs swapped, as in English change ringing. About 4.5 s. |
| `sign_fade` | 944 ms | 1 | A painted sign's name fades away: a soft downward shimmer in a minor color, high tremolo tones sinking and thinning into dust. 0.8 s. |
| `name_restore` | 947 ms | 1 | A lost name returns: bright upward sparkle on the shared 'name' motif (rising fifth, whole-step lift, falling major third: C6 G6 A6 F6) resolving up to C7, with glitter. 0.9 s. |
| `ink_gurgle` | 600 ms | 1 | Living ink gurgles (ink pools, ink creatures): wet, low, viscous bubbles with a dark slosh. 0.6 s. |
| `page_flutter` | 574 ms | 1 | A burst of paper pages fluttering (Lost Pages, the Archive): rapid crisp page flaps that thin out over 0.6 s. |
| `name_devour` | 1.81 s | 1 | The Archivore devours a party member's name (its signature move): a dark rushing inhale, a crunch of tearing paper and a sinking, distorted moan. |
| `summon` | 1.41 s | 1 | Something is summoned (the Archivore calls Lost Pages): a low swirling portal swell with chorus, rising glitter and a soft 'whoom'. |
| `clock_chime` | 1.08 s | 1 | Lena's clocktower: a small tower chime striking two notes, E5 then C5 (a falling major third), warm and slightly distant. |
| `reflection_out` | 791 ms | 1 | The Other Selves step out of their mirrors: a reversed glass shimmer swelling up into a low thud, with a cold glint on the impact. |
| `stone_name` | 978 ms | 1 | A standing stone gets its letters back: a low bell-like chime over a soft carving rasp, about 0.9 s. |

### Battle: weapon swings

| id | length | files | intent |
|---|---|---|---|
| `sword_slash` | 390 ms | 2 (vary 0.03) | Sword swing: a fast band-passed noise sweep (1.2 to 5.5 kHz 'shwip') with a short metallic edge ring on top. The battle scene layers hit_light / hit_heavy on contact. |
| `spear_thrust` | 180 ms | 2 (vary 0.03) | Spear thrust: a tight noise burst falling 3 kHz to 800 Hz, a pitched 'fwip' glide and a small glint at the tip. |
| `staff_hit` | 183 ms | 2 (vary 0.04) | Staff strike: a hollow wooden 'thock' (resonant modes 420, 1050, 1720 Hz) on a short low body thump. |
| `axe_chop` | 317 ms | 2 (vary 0.03) | Axe chop: a heavy low whoosh into a chunky impact (95 Hz thump, crunchy mid noise, a splinter crackle). |
| `bow_shot` | 301 ms | 2 (vary 0.03) | Bow shot: bowstring twang (Karplus-Strong at A2 with a slight pitch drop), a release snap and the arrow's high whoosh. |

### Battle: impacts

| id | length | files | intent |
|---|---|---|---|
| `hit_light` | 120 ms | 3 (vary 0.05, max 4 voices) | Ordinary hit landing: a punchy band-noise smack (1.2 to 4 kHz) over a quick 200 Hz thump. Short and clean so rapid hits stay readable. |
| `hit_heavy` | 476 ms | 2 (vary 0.04, max 3 voices) | Heavy hit: low boom (90 to 40 Hz) with saturation, a crunchy mid smack and a short room tail. Pairs with 2 to 4 frames of hit-stop. |
| `crit` | 598 ms | 1 (max 2 voices) | Critical hit: a heavy hit core plus a bright metallic 'shing' (2.6 kHz partials), a sharp crack and a quick rising ting. Clearly bigger than hit_heavy. |
| `miss` | 200 ms | 1 | Attack misses: an airy whoosh passing by with a small falling 'fwip'. Deliberately light. |
| `defend` | 396 ms | 1 | Defend command / blocked hit: a shield clank (metal partials around 900 Hz) on a solid thunk. |

### Battle: magic and techs

| id | length | files | intent |
|---|---|---|---|
| `fire` | 950 ms | 1 (vary 0.04) | Fire spell: a rising 'fwoosh', dense crackling (filtered impulse noise) and a low rumbling body. |
| `ice` | 978 ms | 1 (vary 0.04) | Ice spell: a crisp crack as ice forms, then a cluster of high glassy partials with a fast shimmer (tremolo) and a cold hiss. |
| `thunder` | 1.44 s | 1 | Thunder spell: an instant broadband crack with a falling 'zzap', then a rolling low rumble tail. 1.6 s. |
| `heal` | 1.01 s | 1 | Healing: a rising G-major arpeggio (G5 B5 D6 G6 B6) of soft chorused sine/triangle tones with a little sparkle and a warm room. |
| `revive` | 1.38 s | 1 | Revive (Phoenix Feather): a longer majestic rising arpeggio over a swelling fifth, wings of air and a bright bell at the top. |
| `item_use` | 717 ms | 1 | Using a potion or tonic: two quick glugs (bubbly bloops) and a soft rising chime. |
| `fury_ready` | 1.22 s | 1 | Fury gauge full: a charging PWM sweep rising 200 Hz to 1.6 kHz with quickening tremolo, then a bright C7 ding. |
| `combo_start` | 1.02 s | 1 | Combo tech begins (two or three heroes act together): two bright 'ching' pings (E6, B6) that then ring together over a rising swirl. |
| `level_up_sparkle` | 1.05 s | 1 | Sparkles over a hero who levels up (under the level_up jingle): glitter of random 2 to 8 kHz pings thinning out, after a small upward swish. |
| `hammer_charge` | 1.67 s | 1 | The Last Hammer telegraph: a rising metallic whine that tightens to a ringing point, about 1.4 s. |
| `oath_ring` | 1.75 s | 1 | Tempered Oath turns the hammer: a bell-like clang with a shimmer of high partials over a warm low ring. |
| `star_chime` | 719 ms | 1 | A dark star wakes: a three-note glass chime, ascending (D6 F#6 A6), with a little sparkle, about 0.8 s. |
| `orrery_hum` | 873 ms | 1 | The Orrery aligned: a soft sustained brass hum (D3 with its fifth) with a slow shimmer on top, about 0.9 s. |

### Battle: status effects

| id | length | files | intent |
|---|---|---|---|
| `buff` | 956 ms | 1 | Positive status (Protect, Haste, Focus): a rising shimmer of a fifth-and-octave chord into a bright ding. |
| `debuff` | 700 ms | 1 | Negative status (Blind, Silence, stat down): a descending detuned wobble with deepening vibrato into a dull low note. |
| `poison` | 600 ms | 1 | Poison: sickly low bubbles and a sinking detuned tritone. |
| `stun` | 854 ms | 1 | Stun: little stars circling the head, a wobbling three-note high 'tweedle' (fast vibrato sines). |
| `kept` | 704 ms | 1 | A party member is Kept (glassed over): a thin frost crackle spreading and thickening, a rising glassy whine, then a crisp seal as the glass closes. |
| `kept_break` | 639 ms | 1 | Kept ends: the glass bursts in a bright shatter, then a breath of relief (a soft airy exhale) under a small rising two-note chime. |

### Battle: big moments

| id | length | files | intent |
|---|---|---|---|
| `bell_thirteenth` | 787 ms | 1 | The Thirteenth Bell, the cracked bell of the Stacks, as the town hears it (the cold open's thirteenth toll, F1, the Stacks, the credits): one hard strike of a great bronze bell a tritone below the town's twelve (nominal D-sharp 3 against their A3). The crack splits every partial so it beats sour and rattles, and it never sings on: the crack chokes it in under a second, then silence. Core set, under 40 KB (H6, CRITIQUE_ARC 10). |
| `enemy_die` | 750 ms | 1 | Enemy defeated: the classic SNES dissolve. Noise crushed to a falling sample rate (8 kHz to 300 Hz), a short descending pulse arpeggio and a soft low poof. |
| `boss_die` | 2.96 s | 1 | Boss defeated: a chain of growing explosions, then a long collapsing dissolve with phasing and a final deep boom into a big room tail. About 3.2 s. |
| `encounter` | 1.14 s | 1 | Battle starts (screen swirl): a rising swirl (vibrato pulse 200 to 1200 Hz plus a resonant noise sweep) that bursts into a crash and low boom. Urgent, 1 s. |
| `flee` | 500 ms | 1 | Party flees: a quick pitter-patter of six running steps fading away, with a light rising whoosh. |
| `telegraph` | 1.33 s | 1 | Danger telegraph (an enemy readies a big move one turn ahead): an ominous low tritone swell (detuned saws), a reversed-cymbal rush and a heartbeat double-thump. |
| `break` | 632 ms | 1 | Shield BREAK (weakness hits removed every shield): glass-shatter noise with dozens of shards, a falling metallic 'pshing' and a deep thump. Must feel like a reward. |
| `fury_art` | 1.23 s | 1 | Fury art unleashed: sub boom and rising rush into a bright brass-like C major chord stab with a crash and a long room. |
| `anvil_strike` | 1.52 s | 1 | A clean ringing anvil hit: a hard hammer click, the steel ring of the face and a long ring of the horn. |
| `bell_first` | 5.93 s | 1 | The First Bell: a very large bronze bell, struck once, long decay, about 35 cents flat of D so Ilya's line is true. Hum an octave below, minor-third tierce, slow beating. |
| `furnace_roar` | 2.00 s | 1 | The Heartforge, the hottest furnace: a low roar that swells and holds, about 2 s, a rasp of flame on top. |

### Loot drops (rarity)

| id | length | files | intent |
|---|---|---|---|
| `drop_common` | 300 ms | 1 | Common item drop: a single soft plucked 'plink' (E6) and a tiny landing tap. |
| `drop_magic` | 565 ms | 1 | Magic (blue) item drop: two bright chorused plinks E6 then B6 with a cool shimmer. |
| `drop_rare` | 941 ms | 1 | Rare (gold) item drop: a three-note E major arpeggio of bells (E6 G#6 B6) with sparkle. |
| `drop_legendary` | 1.71 s | 1 | Legendary (orange) drop: a deep boom under a bright bell chord (E5 B5 E6 G#6 B6 F#7) struck together, a rising shimmer and a long glittering tail. Unmistakable. |

## Jingles

| id | length | intent |
|---|---|---|
| `item_get` | 2.38 s | Ordinary item received (chest, gift). About 2 s. A quick bright flourish (C-E-G up, F-A) that lands on a held G over a plagal IV-I cadence. Brass and pulse lead, harp sparkle, timpani on the resolution. In D major. |
| `key_item` | 3.82 s | Story key item obtained (Lantern of Recall, keys, letters, the name fragment). About 3.5 s. A shimmering Lydian harp arpeggio (Cmaj7, then D over a C pedal, the 'wonder' chord) under a bell and flute line B-A-F#-G, resolving to a warm horn chord with timpani and a cymbal swell. In Eb major. |
| `level_up` | 3.53 s | Level up. About 3 s, energetic and triumphant. Three rising triplet pickups land on C, D, then a held E: the melody climbs over the heroic bVI-bVII-I cadence (Ab-Bb-C) with octave bass, timpani roll and a crash. In C major. |
| `inn_rest` | 5.65 s | Resting at the inn. About 4.5 s. A gentle 3/4 lullaby: flute sighs C-A-F, Bb-A-G, settling on A over harp arpeggios, then a small celesta 'morning' chime as the screen comes back. In F major. |
| `save` | 4.18 s | Game saved at the chapel Bell. About 3 s. One warm bell strike, a soft organ 'amen' (F, Bb over F, F) and a celesta neighbor-tone line C-D-C, with a harp arpeggio at the close. In F major. |
| `quest_done` | 4.00 s | Side quest completed (Tess's letters, favors). About 3.5 s. A bright tutti statement: D major arpeggio up, G to E over G-A7, resolving to a held D with a snare pickup, crash and harp run. In D major. |
| `party_join` | 4.97 s | Mira or Bram joins the party. About 4 s, warm and hopeful. The flute states the shared name motif G-D-E-C (rising fifth, whole-step lift, falling major third), answers B-C-D and opens onto a held G with harp, strings and a soft horn chord. In G major. |
| `victory_fanfare` | 6.80 s | Battle won. About 6.5 s, FF-flavored but an original melody: a triplet call up to C, a stepwise answer, a dotted-rhythm second phrase climbing to E, then the heroic bVI-bVII-I (Ab-Bb-C, written in C, sounding in Bb) ending on a held chord with a timpani roll, snare fill and crash. |
| `gameover_sting` | 5.29 s | Party defeated. About 5 s, somber, not melodramatic. A low bell tolls twice (an echo of the Thirteenth Bell) while an oboe falls A-G-F-E-D over Dm, Gm, A7, Dm strings. In D minor. |

## Ambience loops

| id | length | intent |
|---|---|---|
| `river_birds` | 10.00 s | Willowmere and the riverside valley: a gentle river (filtered noise with slow surges and a brighter ripple layer), small water plops, and a few songbirds (warbler, whistle, sparrow, a distant dove). Birds are sparse; with the runtime's left/right half-loop offset they answer each other. |
| `archive_hush` | 10.00 s | The Rootbound Archive: a low, still room tone, faint high air, a few distant drips in a large stone space, an occasional soft paper rustle and one far-off creak of roots settling. Quiet and spacious; it should feel ancient, not scary. |
| `wind_valley` | 10.00 s | Open valley wind: a broad breathy bed with slow gusts, a faint whistling resonance that rises with each gust, and dry grass rustling on the strongest gusts. No events, so it never sounds repetitive. |
| `mere_still` | 10.00 s | The Hollow by the still mere: slow water lapping at the stones (soft swells with small wet slaps and plops), a distant cluster of wind chimes once per loop, a faint high air, and one far-off bird. Hushed and a little lonely; nothing moves fast. |
| `court_hush` | 10.00 s | The Court of Mirrors: a cold, still palace of glass. A faint glass hum (a wet-finger-on-a-rim tone around A5 with a slowly beating partner and a fifth), a low room tone, and slow drips falling into a very large space, each one a small glassy ping. Beautiful and uneasy, never loud. |
| `forge_rumble` | 10.00 s | The Ashen Foundry: a low furnace drone (a whole-cycle 55 Hz and fifth), a bed of distant hammering on an anvil far down a stone hall (two strikes then a pause, softened by a big room), and slow steam venting as a breathy hiss. Heavy, warm, never loud. |
| `ash_wind` | 10.00 s | Ash wind over Emberpeak and the old sand road: dry, thin and low, a hollow breath with slow gusts, a faint hiss of grit, and a very sparse crackle of embers far away. No events, so it never sounds repeated. |
| `moor_wind` | 10.00 s | The High Moor: wide dry wind, a broad low breath with slow gusts and a long swell, a faint hiss of grass that rises with each gust, a thin whistle over heather on the strongest ones. No events, so it never sounds repeated. |
| `larchhill_hum` | 10.00 s | Larchhill: a warm hive hum (whole-cycle low tones), a few bees passing close, leaves stirring in a soft breeze, and one far windmill creak in the middle of the loop. |

## Music ids

| id | source now | fallback while src is null |
|---|---|---|
| `title` | assets/audio/music/title.mp3 | silence |
| `willowmere` | assets/audio/music/willowmere.mp3 | silence |
| `valley` | ../assets/audio/region-1.mp3 | willowmere |
| `archive` | assets/audio/music/archive.mp3 | silence |
| `battle` | assets/audio/music/battle.mp3 | silence |
| `boss_archivore` | ../assets/audio/boss.mp3 | battle |
| `mystery` | assets/audio/music/mystery.mp3 | silence |
| `sorrow` | assets/audio/music/sorrow.mp3 | silence |
| `triumph` | assets/audio/music/triumph.mp3 | title |
| `victory` | (none yet) | silence |
| `gameover` | (none yet) | silence |
| `hollow` | assets/audio/music/hollow.mp3 | willowmere |
| `hollowmere` | assets/audio/music/hollowmere.mp3 | hollow |
| `fading_road` | assets/audio/music/fading_road.mp3 | valley |
| `court` | assets/audio/music/court.mp3 | archive |
| `boss_king` | assets/audio/music/boss_king.mp3 | boss_archivore |
| `emberpeak` | assets/audio/music/emberpeak.mp3 | hollow |
| `first_bell` | assets/audio/music/first_bell.mp3 | hollowmere |
| `ash_road` | assets/audio/music/ash_road.mp3 | fading_road |
| `foundry` | assets/audio/music/foundry.mp3 | court |
| `boss_warden` | assets/audio/music/boss_warden.mp3 | boss_king |
| `the_downs` | assets/audio/music/the_downs.mp3 | valley |
| `high_moor` | assets/audio/music/high_moor.mp3 | valley |
| `wethers_barrow` | assets/audio/music/wethers_barrow.mp3 | mystery |
| `orrery` | assets/audio/music/orrery.mp3 | mystery |
| `larchhill` | assets/audio/music/larchhill.mp3 | valley |
| `millrace` | assets/audio/music/millrace.mp3 | willowmere |
| `boss_reeve` | assets/audio/music/boss_reeve.mp3 | battle |
| `boss_millstone` | assets/audio/music/boss_millstone.mp3 | battle |

## Regenerate and check

```bash
python next/tools/audio/build.py            # all sounds + manifest + this README
python next/tools/audio/build.py --manifest # after dropping new music into assets/audio/music/
python next/tools/audio/review.py           # waveform + spectrogram contact sheets in tools/audio/out/
python next/tools/audio/music_scan.py       # measure music loudness, find loop points -> music_levels.json
python next/tools/audio/score_check.py      # jingle piano rolls, chords per beat, clashes, stem balance
python next/tools/audio/browser_check.py    # decode every file in headless Chromium and drive audio.js
node --test next/qa/audio/*.test.mjs        # manifest + WAV integrity, runtime import and logic
```
