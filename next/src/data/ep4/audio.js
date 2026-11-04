// The ep4 pack's audio fragment (docs/EPISODE4_PLAN.md 8 and 13.3), in the assets/audio/manifest.json entry shape. Written by
// E4-audio; nobody else edits it. index.js merges it into engine.audio.manifest (never overwriting an id) before
// audio.loadPack('ep4') runs, so assets/audio/manifest.json, whose bytes count before the tap prompt, is never edited.
// Music is runtime-cached (lazy); the sfx and ambience files are named ep4_* so build_pwa.py's LAZY_PREFIXES keep them out
// of the precache. Every sfx is pack 'ep4' and names a core `fallback` the engine plays until the pack has arrived.
// Regenerate: python tools/music/render.py ep4_valewyn ep4_sunken_keep ep4_boss_regent; python tools/audio/ep4_sfx.py.
// `volume` brings each track's decoded loop to -16 LUFS (measured from the MP3, `measuredLufs`).

export const music = {
  valewyn: { src: 'assets/audio/music/ep4_valewyn.mp3', volume: 1.052, loopStart: 0.06, loopEnd: 85.393333, fallback: 'hollowmere',
    bpm: 90, key: 'A minor', measuredLufs: -16.44, duration: 85.493333 },
  sunken_keep: { src: 'assets/audio/music/ep4_sunken_keep.mp3', volume: 1.058, loopStart: 0.06, loopEnd: 96.06, fallback: 'court',
    bpm: 80, key: 'D dorian', measuredLufs: -16.49, duration: 96.16 },
  boss_regent: { src: 'assets/audio/music/ep4_boss_regent.mp3', volume: 1.052, loopStart: 0.06, loopEnd: 109.150907,
    fallback: 'boss_warden', bpm: 132, key: 'F minor', measuredLufs: -16.44, duration: 109.250907 },
};

const S = (file, duration, group, fallback) => ({ src: `assets/audio/sfx/ep4_${file}.wav`, volume: 1.0, duration, group, pack: 'ep4', fallback });

export const sfx = {
  tide_wheel: S('tide_wheel', 0.891, 'field', 'block_push'),
  water_rise: S('water_rise', 1.018, 'field', 'splash'),
  water_drain: S('water_drain', 0.926, 'field', 'splash'),
  seal_wash: S('seal_wash', 1.237, 'field', 'ink_gurgle'),
  seal_stamp: { ...S('seal_stamp', 0.301, 'impact', 'hit_heavy'), maxVoices: 2 },
  decree_void: S('decree_void', 1.027, 'magic', 'page_flutter'),
  decree_unroll: S('decree_unroll', 1.482, 'magic', 'telegraph'),
  bell_drowned: S('bell_drowned', 4.403, 'big', 'bell_toll'),
  // the clear variant (plan 8.4): the principle stones and the bell once the water is gone; an extra id, unused until a script names it
  bell_clear: S('bell_clear', 4.78, 'big', 'bell_toll'),
};

export const ambience = {
  canal_rain: { src: 'assets/audio/ambience/ep4_canal_rain.wav', volume: 1.0, duration: 10.0, widen: true, fallback: 'river_birds' },
  keep_drip: { src: 'assets/audio/ambience/ep4_keep_drip.wav', volume: 1.0, duration: 10.0, widen: true, fallback: 'archive_hush' },
};

export const pack = { sfx: Object.keys(sfx).sort() };

export const AUDIO = { music, sfx, ambience, pack };
