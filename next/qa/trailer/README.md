# Trailer gameplay recorder

`record_gameplay.py` plays short, scripted stretches of Lexicon Quest NEXT in headless Chromium and saves them as
clean game-frame clips for the trailer (version 2: real moving gameplay instead of stills with pans).

## Run it

From the repo root (needs the same tools as `qa/shots.py`: Playwright for Python with Chromium, Pillow):

```
python next/qa/trailer/record_gameplay.py                       # every clip in clips.json
python next/qa/trailer/record_gameplay.py --only battle_exchange # one clip (comma list or globs)
python next/qa/trailer/record_gameplay.py --list
python next/qa/trailer/record_gameplay.py --probe town_walk      # setup only: out/probe.png + the field state
```

The whole set takes about a minute. One browser at a time; the script has its own overall timeout (`--timeout`, 900 s).
It serves the repo root with `qa/shots.py`'s server and loads `/next/index.html?debug=1&fps=0` (FPS overlay off).

## How a clip is captured

- **Native pixels, no chrome.** Each frame is read from the renderer's own 384x216 offscreen canvas
  (`LQ_ENGINE.renderer.canvas`), not from a page screenshot: no letterbox, no touch controls, no scaling.
  Upscale it with nearest-neighbour in the edit.
- **Deterministic 30 fps.** The game clock is frozen (`LQ_DEBUG.setSpeed(0)`) and stepped one 60 Hz logic frame at a
  time with `LQ_DEBUG.advance(1)`; every second frame is saved, so a busy machine cannot drop or stretch frames. Each clip
  loads with `&seed=11`. The setup (warps, transitions) runs at real speed, so where a wandering NPC stands when the take
  starts can differ slightly between runs (three of the six clips came out bit-identical across two runs).
- **Real input.** Moves and commands are real keyboard events (Playwright `keyboard.down` / `up`: arrows, Z, X). The
  key level holds across the stepped frames, so the game reads them exactly as from a player. Walks follow the game's
  own pathfinder route (`src/world/pathfind.js`) as held arrow keys, one key per straight run.
- A console error, page error or engine error fails the clip.

## Output (`out/`, git-ignored)

| Path | What |
|---|---|
| `out/<clip>/frame_0000.png ...` | the PNG sequence, 384x216, 30 fps |
| `out/<clip>/<clip>.png` | the same frames as one lossless animated PNG (APNG, 30 fps) |
| `out/<clip>/clip.json` | frames, seconds, fps, errors seen |
| `out/contact_sheet.png` | first, middle and last frame of every clip |
| `out/report.json` | the run's results |

To make a video: `ffmpeg -framerate 30 -i out/town_walk/frame_%04d.png -vf scale=1920:1080:flags=neighbor -c:v libx264 -crf 12 -pix_fmt yuv420p town_walk.mp4`
(ffmpeg is not installed on this machine; any editor that imports an image sequence works too).

## The clips (`clips.json`)

| Clip | What it shows |
|---|---|
| `town_walk` | Willowmere, Lantern Square by day: the party of three walks west across the square past the well, Wick and Lark, then turns north. |
| `battle_exchange` | A valley wolf fight: Attack chosen with two Z presses (command, target), Bram's spear lands, WEAK 20, the wolf reels, the next command comes up. |
| `field_chest` | Willowmere Valley, the cliff plateau: the party walks to the iron chest, Z opens it, "Received Hatchet". The plateau's foes are removed first (as if beaten) and `first_fight_done` is set, so no fight or tutorial line cuts in. |
| `archivore_hit` | The Archivore on the painted Heart of the Archive stage: Attack chosen on Z, Arden's CRITICAL 47 with the hit flash, then the boss's Gnash answers. |
| `stacks_descend` | The Deep Stacks (`&cave=1`), reading seed 7: the last nine tiles to the B1 stairs, the iris down, "The Catalogue, B2". The floor's foes are held still (stunned, still on screen) so none starts a fight on the way. |
| `belfry_thirteenth` | The cold open: the hero climbs the last flight into the belfry (tolls 1 to 12 already rung), the thirteenth toll, the "!", the fade to the opening line. |

## Adding a clip

Add an entry to `clips.json`: `name`, `note`, optional `query` (extra URL params such as `&cave=1`), `storage`,
`settings`, `setup` (steps from `qa/shots.py`'s vocabulary, run at normal speed so async calls like `warp` finish) and
`record` (captured with the frozen clock). Record steps are listed at the top of `record_gameplay.py`:
`rec`, `hold` (keys held for `rec` captured frames or `frames` logic frames), `tap`, `walk` (with `face`, `run`,
`tail`), `until`, plus any shots.py step. Use `--probe <clip>` with `--eval "<js>"` to check a spot before recording.
Barks and story triggers on the route will stop a walk: set their flags or counters in the setup (see `field_chest`).
