# Suno prompts for Episodes 1 to 3 (optional upgrade)

Suno cannot be driven from the Claude app's built-in browser (Cloudflare's human check fails there), so the
game ships with code-composed music for these cues. If you get a few minutes with Suno on your phone or laptop,
generate these as instrumentals (leave lyrics empty) and download the MP3s. Drop them into
`next/assets/audio/music/` with the exact filenames below and they replace the fallback automatically.

Shared style line (put at the start of every Styles box):
"Original SNES-era JRPG soundtrack, instrumental, no vocals, orchestral with light chiptune color, warm,
melodic, loopable, clean balanced mix, about 90 seconds."

| File | Title | Styles (after the shared line) |
|---|---|---|
| `archive.mp3` | The Rootbound Archive | hushed mysterious ancient library, low strings, music-box motif, soft harp, distant choir pad, slow 72 BPM, tension undercurrent, dust and candlelight |
| `mystery.mp3` | The Thirteenth Bell | uneasy story cue, sparse piano and celesta, sustained strings, a single tolling bell, slow, unresolved, quietly ominous |
| `sorrow.mp3` | A Name Forgotten | tender sad theme, solo oboe over soft strings and harp, slow 64 BPM, wistful, gentle swell then fade |
| `triumph.mp3` | Names Returned | warm uplifting resolution theme, strings and horns with harp and glockenspiel, 100 BPM, hopeful, bright major key, builds to a glowing finish |
| `valley.mp3` | Willowmere Valley | pastoral overworld travel theme, flute and strings, light hand percussion, 110 BPM, open skies and rivers, adventurous and warm |
| `boss_archivore.mp3` | The Archivore | dramatic boss battle, driving 140 BPM, brass and low strings, pounding timpani, choir stabs, a memorable urgent hook, builds to a frantic final section |

## Episode 2 (same shared style line)

All five ship as code-composed tracks (`docs/MUSIC.md`, Episode 2). A Suno file dropped at the same name replaces
the composed one after `python tools/audio/build.py --manifest`; keep the lullaby's character (the hollow,
hollowmere and boss_king cues are one tune in three guises), and remember a Suno file has no designed loop points
(`tools/audio/music_scan.py` finds or trims one).

| File | Title | Styles (after the shared line) |
|---|---|---|
| `hollow.mp3` | The Unwritten Square | a lullaby waltz, music box and celesta over muted piano, glasslike bells, reflected melody answered by its inversion, 84 BPM, wistful, quiet |
| `hollowmere.mp3` | Hollowmere | the same lullaby waltz brought into the light, full strings, warm horn and glockenspiel, harp arpeggios, 84 BPM, D major, tender and hopeful |
| `fading_road.mp3` | The Fading Road | pastoral travel theme turning misty, flute and pizzicato, glass bells, 96 BPM |
| `court.mp3` | The Court of Mirrors | mysterious palace of mirrors, celesta and harp in canon, low string pedal, 76 BPM, cold and beautiful |
| `boss_king.mp3` | The Nameless King | tragic boss battle in 6/8, harpsichord ostinato, brass and choir, a lullaby turned into a march, 132 BPM |

## Episode 3 (same shared style line)

All five ship as code-composed tracks (`docs/MUSIC.md`, Episode 3). A Suno file dropped at the same name replaces the
composed one after `python tools/audio/build.py --manifest`. The cues share the First Bell theme (the name motif, the
fourth note on a bell in `first_bell`, a rest in `emberpeak`), so if you generate them keep that bell in
`first_bell` and the rest where the bell belongs in `emberpeak`. `emberpeak.mp3` uses the root region-3 prompt
(`SUNO_TRACKS.json`, id `region-3`).

| File | Title | Styles (after the shared line) |
|---|---|---|
| `emberpeak.mp3` | Bellows Square | the root region-3 prompt, muted: low strings, hammered dulcimer, measured anvil percussion, brass held back, a toll on the downbeat that never comes, D minor, 104 BPM |
| `first_bell.mp3` | The First Bell | triumphant town theme, brass and choir with a great bell on every downbeat, 104 BPM |
| `ash_road.mp3` | The Old Sand Road | travel theme, fiddle and low whistle over a cart-wheel rhythm, ash-grey harmony warming to amber, A minor to C major, 100 BPM |
| `foundry.mp3` | The Ashen Foundry | industrial fantasy dungeon, anvil and steam percussion, low brass, cold flute, 88 BPM |
| `boss_warden.mp3` | The Cinder Warden | boss battle in 7/8, anvil strikes, brass, timpani, choir, a bell motif in minor, 144 BPM |

Already in place and fine to keep: `title.mp3` (The Dawn of Aethelgard), `town.mp3`, `battle.mp3`, `boss.mp3`,
`region-1.mp3` in the root `assets/audio/` folder.
