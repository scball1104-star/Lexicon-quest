// The ep6 pack's audio fragment (docs/EPISODE6_PLAN.md 2.7, 8 and 13.3), in the assets/audio/manifest.json entry shape. Written
// by E6-audio; nobody else edits it. index.js merges it into engine.audio.manifest (never overwriting an id) before
// audio.loadPack('ep6') runs, on every path that brings the pack up (the quick start included), so assets/audio/manifest.json,
// whose bytes count before the tap prompt, is never edited. Music is runtime-cached (lazy); the sfx and ambience files are named
// ep6_* so build_pwa.py's LAZY_PREFIXES keep them out of the precache. Every sfx is pack 'ep6' and names a core `fallback` the
// engine plays until the pack has arrived. Regenerate: python tools/music/render.py ep6_zephyr ep6_storm_observatory
// ep6_boss_scribe; python tools/audio/ep6_sfx.py; python tools/audio/ep6_review.py (measuredLufs and volume, from the MP3).
// `volume` brings each track's decoded loop to -16 LUFS.
//
// Reused, not redefined here: music mystery, high_moor, sorrow, triumph, battle, victory, gameover (core) and saffron (the ep5
// fragment); the core ambience wind_valley and moor_wind are only the fallbacks of sky_wind and storm_rumble.

export const music = {
  zephyr: { src: 'assets/audio/music/ep6_zephyr.mp3', volume: 1.053, loopStart: 0.06, loopEnd: 85.774286, fallback: 'the_downs',
    bpm: 112, key: 'G major', measuredLufs: -16.45, duration: 85.874286 },
  storm_observatory: { src: 'assets/audio/music/ep6_storm_observatory.mp3', volume: 1.052, loopStart: 0.06, loopEnd: 90.06,
    fallback: 'court', bpm: 96, key: 'D dorian', measuredLufs: -16.44, duration: 90.16 },
  // the intro (bars 1 and 2) plays once: the loop restarts at bar 3 (tools/music/songs/ep6_boss_scribe.py)
  boss_scribe: { src: 'assets/audio/music/ep6_boss_scribe.mp3', volume: 1.052, loopStart: 2.608685, loopEnd: 104.3478,
    fallback: 'boss_king', bpm: 138, key: 'E minor', measuredLufs: -16.44, duration: 104.4478 },
};

const S = (file, duration, group, fallback) => ({ src: `assets/audio/sfx/ep6_${file}.wav`, volume: 1.0, duration, group, pack: 'ep6', fallback });

export const sfx = {
  // gust_carry is one-shot: the rush (0.5 s) then a low hold that thins away by itself
  gust_carry: { ...S('gust_carry', 1.17, 'field', 'jump'), maxVoices: 2 },
  gust_land: { ...S('gust_land', 0.433, 'field', 'land'), maxVoices: 2 },
  vane_turn: S('vane_turn', 1.139, 'field', 'switch_on'),
  mooring_catch: S('mooring_catch', 0.334, 'field', 'door_close'),
  gale_gust: S('gale_gust', 1.583, 'big', 'flee'),
  anchor_set: S('anchor_set', 1.049, 'big', 'spear_thrust'),
  rewrite_read: S('rewrite_read', 2.033, 'big', 'telegraph'),
  rewrite_break: S('rewrite_break', 1.301, 'magic', 'glass_break'),
  signal_lamp: { ...S('signal_lamp', 1.61, 'story', 'crystal_hit'), maxVoices: 3 },
};

export const ambience = {
  sky_wind: { src: 'assets/audio/ambience/ep6_sky_wind.wav', volume: 1.0, duration: 10.0, widen: true, fallback: 'wind_valley' },
  storm_rumble: { src: 'assets/audio/ambience/ep6_storm_rumble.wav', volume: 1.0, duration: 8.0, widen: true, fallback: 'moor_wind' },
};

export const pack = { sfx: Object.keys(sfx).filter((id) => sfx[id].src).sort() };

export const AUDIO = { music, sfx, ambience, pack };
