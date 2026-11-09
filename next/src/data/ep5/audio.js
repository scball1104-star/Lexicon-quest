// The ep5 pack's audio fragment (docs/EPISODE5_PLAN.md 8 and 13.3), in the assets/audio/manifest.json entry shape. Written by
// E5-audio; nobody else edits it. index.js merges it into engine.audio.manifest (never overwriting an id) before
// audio.loadPack('ep5') runs, on every path that brings the pack up, so assets/audio/manifest.json, whose bytes count before the
// tap prompt, is never edited. Music is runtime-cached (lazy); the sfx and ambience files are named ep5_* so build_pwa.py's
// LAZY_PREFIXES keep them out of the precache. Every sfx is pack 'ep5' and names a core `fallback` the engine plays until the
// pack has arrived. Regenerate: python tools/music/render.py ep5_saffron ep5_labyrinth ep5_boss_oracle;
// python tools/audio/ep5_sfx.py. `volume` brings each track's decoded loop to -16 LUFS (measured from the MP3, `measuredLufs`).
//
// sky_turn is the Night sound (a bronze gong swell with a glass shimmer); sky_turn_day is the Day sound (a warm brass swell a
// sixth higher). A caller that knows the new sky plays `sky_turn_${sky}` (sky_turn_night is an alias of sky_turn); one that
// does not plays sky_turn. well_hush (Labyrinth F2 to the Eye) is an alias of the core archive_hush bed (plan 2.7).

export const music = {
  saffron: { src: 'assets/audio/music/ep5_saffron.mp3', volume: 1.063, loopStart: 0.06, loopEnd: 83.538277, fallback: 'orrery',
    bpm: 92, key: 'D minor', measuredLufs: -16.53, duration: 83.638277 },
  labyrinth: { src: 'assets/audio/music/ep5_labyrinth.mp3', volume: 1.052, loopStart: 0.06, loopEnd: 91.488571, fallback: 'court',
    bpm: 84, key: 'E dorian', measuredLufs: -16.44, duration: 91.588571 },
  // the intro (bars 1 and 2) plays once: the loop restarts at bar 3 (tools/music/songs/ep5_boss_oracle.py)
  boss_oracle: { src: 'assets/audio/music/ep5_boss_oracle.mp3', volume: 1.078, loopStart: 5.454535, loopEnd: 114.545442,
    fallback: 'boss_king', bpm: 132, key: 'C minor', measuredLufs: -16.65, duration: 114.645442 },
};

const S = (file, duration, group, fallback) => ({ src: `assets/audio/sfx/ep5_${file}.wav`, volume: 1.0, duration, group, pack: 'ep5', fallback });

export const sfx = {
  sun_dial: S('sun_dial', 1.22, 'field', 'switch_on'),
  sand_run: { ...S('sand_run', 0.747, 'field', 'shelf_move'), maxVoices: 2 },
  sand_hold: { ...S('sand_hold', 0.471, 'field', 'land'), maxVoices: 2 },
  lamp_roll: S('lamp_roll', 0.949, 'field', 'block_push'),
  sky_turn: S('sky_turn', 2.392, 'big', 'combo_start'),
  // the Day half of the pair (plan 8.4: night and day by pitch and timbre); an extra id beside sky_turn
  sky_turn_day: S('sky_turn_day', 1.779, 'big', 'combo_start'),
  sky_turn_night: { alias: 'sky_turn' },
  prophecy_read: S('prophecy_read', 2.271, 'big', 'telegraph'),
  prophecy_break: S('prophecy_break', 1.077, 'magic', 'glass_break'),
  caravan_bell: { ...S('caravan_bell', 3.801, 'story', 'crystal_hit'), maxVoices: 3 },
};

export const ambience = {
  desert_wind: { src: 'assets/audio/ambience/ep5_desert_wind.wav', volume: 1.0, duration: 10.0, widen: true, fallback: 'ash_wind' },
  well_hush: { alias: 'archive_hush' },
};

export const pack = { sfx: Object.keys(sfx).filter((id) => sfx[id].src).sort() };

export const AUDIO = { music, sfx, ambience, pack };
