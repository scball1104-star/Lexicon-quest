# Media build: painted stages, story cards, music, sound, video (approved by Scott 2026-10-27)

Scott's words, verbatim, 2026-10-27 about 9:40 AM Eastern, after the assessment in
`reports/lexicon_quest_media_upgrade/assessment.md` (PKA repo) and the three stills:

> Stills approved.Suno Pro subscribed now.Story cards and title trailer in scope.If it would upgrade or improve the game
> to include video sequences from Runway, then let's do that too.

Earlier the same morning: "Would using RunwayML upgrade our graphics/animation/visuals? If so, use it. I have a
subscription. Would using Suno upgrade our audio/sound track / sound effects? If so, use it."

This is orchestrator work (browser driving of Scott's Runway and Suno in his Chrome, plus scripts), not agent work.
It does not compete with the agent queue in `PLAN.md`. It started 10/27 (three stills, the quantizer, one Eleven Music
test) and paused the same morning at 86 percent of the weekly usage allowance (the guard says stop above 85); it resumes
after the Wednesday 2026-10-28 9 AM Eastern reset. Everything lands on `overhaul`, unpublished, through the usual gates.

## 1. Painted stages (Runway, Nano Banana 2.1, 1K, 16:9, count 1 = 4 credits each)

Pipeline, proven on 10/27: prompt in the stage's own words (the recipes below) -> generate -> download the PNG (saves to
`C:\Users\scbal\Desktop`) -> `python tools/art/backdrops/quantize_still.py <png> assets/backdrops/<id>.png --x3 tools/art/backdrops/out/<id>_3x.png`
-> write the sidecar json by hand from the composed stage's (`bandY`, `bandAlpha`, `cell: null`, `source: 'runway'`,
`colors`) -> mock with `python tools/art/backdrops/mock_stage.py` -> view. Keep the first take unless it breaks a rule
(a figure, text, a horizon in the wrong third, light from two sides).

Prompt head for every stage: "Hand-painted 16-bit JRPG battle background, Chrono Trigger and Lufia II era concept
painting, rich color, soft painterly brushwork, no characters, no creatures, no text, no watermark." Then the scene,
ending "open flat ground across the whole foreground third."

| id | replaces | scene (the composed stage's own notes, README) | status |
|---|---|---|---|
| battle_valley | composed | sunlit meadow at midday, river and old stone bridge mid-distance, pines left, limestone cliffs right, banded sky, haze | in the game 10/28 (paint_battle_valley, lazy) |
| battle_valley_dusk | composed | the same scene at dusk: indigo to orange sky, violet shadows, warm river glints | in the game 10/28 (paint_battle_valley_dusk, lazy) |
| battle_hollow | composed | root cave under pines, indigo to earth back wall, hanging roots, three canopy openings, light shafts right, black ink pool | in the game 10/28 (paint_battle_hollow, lazy) |
| battle_east_road | composed | the Fading Road at dusk, pale moon, violet streaks, the still mere with the Court glinting on the far shore, silver birches, ground mist | in the game 10/28 (paint_battle_east_road, lazy) |
| x1_battle_downs | composed, REPLACED 10/28 | the Downs: rolling sheep pasture, drystone walls, a standing-stone circle on a rise, big sky | |
| x1_battle_moor | composed, REPLACED 10/28 | the High Moor: heather and peat, a tarn, wind-bent larches, low cloud | |
| x1_battle_larchhill | composed, REPLACED 10/28 | Larchhill: a larch wood in autumn gold, a mill race, a wooden wheel | |
| x1_battle_barrow | composed, REPLACED 10/28 | Wether's Barrow: a turf mound with a stone doorway, mist, dusk | |
| x1_battle_culvert | composed, REPLACED 10/28 | the culvert: a brick water channel under the road, lamplight, moss | |
| cave band 2 (root_cellars) | reuses hollow | the Root Cellars: shelves grown through with roots, earth floor, lamplight | in the game 10/28 as `cave_battle_cellars` (BACKDROPS key cave_cellars) |
| cave band 4 (ember_shelves) | reuses archive_deep | the Ember Shelves: scorched shelving, embers in the gaps, red light from below | in the game 10/28 as `cave_battle_ember` (cave_ember) |
| cave band 5 (forge_of_names) | reuses boss | the Forge of Names: a forge hall of iron shelving and molten script | in the game 10/28 as `cave_battle_forge` (cave_forge) |

**Bytes.** Core backdrops are precached (17 today). A painted stage is 78 to 165 KB against 6 to 35 KB composed, and the
initial download has 8 KB of room under Scott's 6.5 MB cap. So the painted core stages are NOT precached: `build_pwa.py`
leaves `assets/backdrops/paint_*` out of the shell list (one exclusion beside the pack prefixes), the painted file is
named `paint_<id>.png`, `BACKDROPS[key].asset` points at it with `fallback: '<id>'` (the composed stage), and
`preloadBattleArt` loads the painted set after the composed set; the scene already rebuilds the layer when art arrives
(`backdropAssetReady`). The x1 and cave stages are pack assets and lazy already. `node qa/run.mjs pwa` proves the
initial download did not move.

### Field notes, 10/28 (orchestrator)
- Painting: 4 credits a stage; first takes kept on all twelve. Two generations ran as Gen-4.5 VIDEO by mistake (the session opened in Video mode; about 192 credits): the Downs clip is kept at reports/lexicon_quest_media_upgrade/video/source/ for the video test.
- Chrome downloads from Runway land on the Desktop as complete `.tmp` files that never get renamed (full bytes; identify by header and hash, `python` harvest). Suno: only the first MP3 download produced a file; later ones fire nothing (Chrome's automatic-downloads block for suno.com, to be allowed by Scott in the address bar).
- quantize_still.py now writes indexed PNGs (27 to 39 KB a stage, half the RGB bytes, identical pixels).
- Suno Pro verified; 20 themes created on v6 (two takes each, 3 of them twice by accident); only the title theme is downloaded and in the game. Suno's list is virtualized: scroll to the top before a find.

## 2. Story cards (Runway, same pipeline, `dialog_keyart`-style sidecar, vignette baked)

In scope per Scott. One painting each: the bell tower at night from the square (the cold open's card and the Episode 1
ending), the twelve bells ringing (the ending), Hollowmere's fountain at dusk (Episode 2 card), the Deep Stacks hall
(the Archivist's plaque screen), the Binder's spine (B100 clear). Each goes behind the same lazy rule.

## 3. Music (Suno Pro, subscribed 10/27 per Scott: verify on suno.com/account before the first download)

Pro: commercial rights, 2,500 credits a month, 20 downloads a month. 29 themes, so two months: the first twenty in
priority order below, the rest from November 27. Driving: Scott's Chrome through the extension (the in-app browser is
blocked by Turnstile; `reference_suno_inapp_browser_blocked`). Create: Custom, Lyrics empty, Styles = the theme's line
+ "instrumental, no vocals, 16-bit JRPG, loopable", model v6 or newer. Two takes; pick by ear is Scott's, so keep both
in the library and download the first unless it breaks a rule. Download -> MP3 -> `<title>.mp3` on the Desktop ->
`assets/audio/music/<id>.mp3` -> `python tools/audio/build.py --manifest` (levels to -16 LUFS, loop points measured into
`<id>.json`; set `loopStart`/`loopEnd` by hand where the track has an intro). Re-encode to 96 kbps if a file passes 3 MB.
A/B page: `tools/audio/review.py` already renders old against new per id.

Priority (first twenty): title (regenerate: the live one is a Free-tier song), battle, boss_archivore, willowmere, valley,
archive, mystery, sorrow, triumph, hollow, hollowmere, fading_road, court, boss_king, first_bell, emberpeak, ash_road,
foundry, boss_warden, the_downs. Then: high_moor, wethers_barrow, orrery, larchhill, millrace, boss_reeve, boss_millstone,
victory, gameover (the last two have no file today).

The Eleven Music test (Runway, 10 credits for 30 s) stays in Scott's Runway library for comparison; Suno Pro is the
plan unless he says otherwise after listening.

## 4. Sound effects (Runway, ElevenLabs Text to SFX, 2 credits each, 1 to 2 s MP3)

A dozen hero sounds, swapped one by one with the synthesized file kept as the fallback id: bell_thirteenth (a cracked
bell), bell_peal, chest_open, chest_blue, level_up, the Binder's three phase stings, stairs_down, bookmark_use, the
death card, the title confirm. Each must stay at or under the file it replaces (the core sfx set is precached).

## 5. Video sequences (Runway Gen-4 Turbo 50 credits per 5 s, Gen-4.5 96 per 8 s): test first, under the brief rule

Honest read (Inference, 10/27): raw video does not belong in a 384 by 216 pixel game; it would read as a different
product. Video run through the same per-frame quantizer can: a painting that moves a little (mist drifting on the
Fading Road, light shafts breathing in the Hollow, clouds crossing the valley), 3 to 5 seconds looped at 12 frames a
second, ordered dither so the noise is stable between frames, encoded as WebM VP9 at 384 by 216 (about 200 to 400 KB
each, lazy, the still as the first frame and the fallback). Where it would improve the game: the title attract loop,
the Episode ending cards, the Deep Stacks B100 clear, and the three most-seen battle stages. Where it would not: inside
gameplay scenes, which are tile and sprite work.

Step 1 (Wednesday): one test. The Fading Road painting -> Runway "Use" -> video (image to video, 5 s, "mist drifts
slowly across the meadow, the moon's reflection trembles on the lake, camera still") -> download -> per-frame quantize
(`quantize_still.py` on each frame, then ffmpeg VP9 at 12 fps) -> sent to Scott. Then the brief with three stills
(opening frame, key moment, closing frame) per `Routines/_visual_brief_template.md`, and his OK before any more credits.

## 6. Title trailer (store page and social, not in the game)

In scope per Scott. 30 to 45 seconds, 1080p, built on the PKA Python plus ffmpeg frame renderer (no Remotion), from
the painted stages, the title art, gameplay captures (`qa/shots.py` frames) and the new title theme; Runway clips for
two or three establishing moves. Brief plus three stills first (opening, key moment, closing card); the brief waits
until the stages and the title theme exist.

## Order of work, after the Wednesday reset
1. Wire the lazy painted backdrops (section 1 bytes rule) and land the three approved paintings; `pwa` and `battle`
   suites; commit.
2. Paint the other nine stages; quantize; mock; commit in threes.
3. Suno Pro: verify the plan on the account page, then the first twenty themes over the week, levels and loops, the A/B
   page for Scott.
4. The video test, then its brief.
5. Story cards.
6. SFX dozen.
7. Trailer brief, then the trailer.
Each step pauses when the weekly guard says so, and nothing is published without Scott's explicit yes.
