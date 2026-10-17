# W1-audio: sound effects, jingles, ambience, audio runtime

**Owned paths:** `next/tools/audio/**`, `next/assets/audio/**` (the orchestrator will drop Suno music files into
`assets/audio/music/`; you own the manifest), `next/src/core/audio.js`, `next/qa/audio/**`.

The live game had almost no sound. Sound is half of "professional": every cursor move, door, chest, hit and spell
must have a satisfying, consistent sound in the classic SNES/DQ/FF tradition, mixed so nothing is harsh.

## Deliverables
1. **SFX** (DESIGN 8 list, about 50): Python (numpy) synthesis in `tools/audio/`. Build a solid sfxr-style
   generator (documented parameter presets) AND richer layered designs where needed: e.g. sword slash = band-passed
   noise sweep + short metallic partials; spear thrust = quick noise burst + pitched "whoosh"; staff hit = wood
   knock; fire = crackling noise + low rumble; ice = high glassy partials with shimmer; thunder = noise crack +
   rumble tail; heal = rising arpeggio with a soft chorus; break = glass-shatter noise + low thump; drops per
   rarity (legendary gets a bright bell chord). UI sounds short and clean (cursor ~40 ms tick, confirm a two-note
   blip, cancel a descending blip, buzzer a low square). Text blips: 3 pitches (low, mid, high voice).
   Output WAV 16-bit mono 22050 Hz in `assets/audio/sfx/`.
2. **Jingles** in `assets/audio/jingles/` (1.5 to 5 s, stereo 32 kHz ok): `item_get`, `key_item`, `level_up`,
   `inn_rest`, `save`, `quest_done`, `party_join`, plus `victory_fanfare` (FF-flavored, original melody, about
   6 s, ending on a held chord) and `gameover_sting`. Compose them as note sequences (write them in code like a
   tiny tracker: tempo, notes, instruments) using simple instrument models: pulse with PWM, triangle bass,
   Karplus-Strong pluck, soft noise drums, a light stereo delay/reverb. Original melodies only.
3. **Ambience loops** in `assets/audio/ambience/` (seamless, 8 to 20 s): `river_birds`, `archive_hush`
   (paper rustle, distant drips, low room tone), `wind_valley`.
4. **Loudness**: normalize per category (UI quieter than impacts, jingles under music level), peak <= -1 dBFS,
   2 to 5 ms fades, no DC offset, no clipping. Total size under about 4 MB.
5. **`assets/audio/manifest.json`**: `{music:{id:{src,volume,loopStart,loopEnd}}, sfx:{id:{src,volume}},
   jingles:{...}, ambience:{...}}` with `src` paths relative to `next/`. Music ids (COMMON.md); map existing tracks
   now: `title` -> `../assets/audio/title.mp3`, `willowmere` -> `../assets/audio/town.mp3`, `valley` ->
   `../assets/audio/region-1.mp3`, `battle` -> `../assets/audio/battle.mp3`, `boss_archivore` ->
   `../assets/audio/boss.mp3`. Others `src:null` until Suno files arrive (runtime must treat null as "fall back
   to a sensible existing track or silence", documented in the manifest as `fallback`).
6. **`src/core/audio.js`** (WebAudio): `export function createAudio({basePath})` returning
   `{init(manifest), unlock(), music(id,{fade=0.6,restart=false}), stopMusic(fade), pushMusic(id,{fade}),
   popMusic(fade) (resume the previous track at its saved position), sfx(id,{volume=1,pitch=1,pan=0}),
   jingle(id,{duckMusic=true}) -> Promise, ambience(id|null,{fade}), setVolumes({master,music,sfx,ambience}),
   getVolumes(), preload(ids)}`. Decode music lazily (start streaming via HTMLAudio + MediaElementSource if the
   buffer is not ready, then switch or just keep the element). Unlock on first user gesture (autoplay policy),
   suspend when the tab is hidden, voice limiting for sfx (max ~12, same-id cooldown 30 ms), random tiny pitch
   variance option for footsteps/hits. Must import cleanly in Node (no window access at module top level).
7. **Self-review** (you cannot listen): render waveform + spectrogram contact sheets to `tools/audio/out/` and
   inspect envelopes, durations, frequency balance and clipping. Write `assets/audio/README.md` with each sound's
   intent so a human can audit by ear later.
8. `qa/audio/*.test.mjs`: manifest integrity (every referenced file exists, WAV headers valid, durations within
   bounds), audio.js imports in Node without throwing.
