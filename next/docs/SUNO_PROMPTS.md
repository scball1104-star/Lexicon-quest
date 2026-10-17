# Suno prompts for Episode 1 (optional upgrade)

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

Already in place and fine to keep: `title.mp3` (The Dawn of Aethelgard), `town.mp3`, `battle.mp3`, `boss.mp3`,
`region-1.mp3` in the root `assets/audio/` folder.
