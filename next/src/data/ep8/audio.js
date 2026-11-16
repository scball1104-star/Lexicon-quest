// The ep8 pack's audio fragment (docs/EPISODE8_PLAN.md 2.7, 8 and 13.3), in the assets/audio/manifest.json entry shape. Written
// by E8-audio; nobody else edits it. The pack's index.js merges it into engine.audio.manifest (never overwriting an id) before
// audio.loadPack('ep8') runs, on every path that brings the pack up (the quick start included), so assets/audio/manifest.json,
// whose bytes count before the tap prompt, is never edited. Music is runtime-cached (lazy); the sfx and ambience files are named
// ep8_* so build_pwa.py's LAZY_PREFIXES keep them out of the precache. Every sfx is pack 'ep8' and names a core `fallback` the
// engine plays until the pack has arrived. Regenerate: python tools/music/render.py ep8_scriptorium_town ep8_first_library
// ep8_boss_eraser ep8_the_last_word; python tools/audio/ep8_sfx.py --review; python tools/audio/ep8_review.py (measuredLufs and
// volume, from the MP3). `volume` brings each decoded loop to its target (-16 LUFS; the Last Silence -18).
//
// boss_eraser's file holds two loops: the battle (boss_eraser) and phase 4, The Last Silence (boss_eraser_silence: the same
// src, `start` = `loopStart` = the second loop). At phase 4 the scene calls audio.music('boss_eraser_silence', { fade: 1.2 }):
// the buffer is shared, so the switch never waits on a fetch. silence_gather is also a jingle on the same file, so the Last
// Silence's charge plays as audio.jingle('silence_gather', { duckMusic: 0.3 }): the music system ducks the mix for its length
// and brings it back over half a second (the audio twin of the photosensitivity rule: never a sudden loud return).
//
// Reused, not redefined here: music orrery, mystery, sorrow, triumph, battle, victory, gameover, willowmere, title (core) and
// palehaven (the ep7 fragment); sfx bell_toll, bell_thirteenth, name_restore, kept and Episode 4's Answer sounds (core and the
// ep4 fragment); ambience sky_wind (the ep6 fragment); the core archive_hush is only library_hush's fallback.

export const music = {
  scriptorium_town: { src: 'assets/audio/music/ep8_scriptorium_town.mp3', volume: 1.052, loopStart: 0.06, loopEnd: 92.787256,
    fallback: 'willowmere', bpm: 88, key: 'G lydian', measuredLufs: -16.44, duration: 92.887256 },
  first_library: { src: 'assets/audio/music/ep8_first_library.mp3', volume: 1.052, loopStart: 0.06, loopEnd: 88.481066,
    fallback: 'archive', bpm: 76, key: 'D dorian', measuredLufs: -16.44, duration: 88.581066 },
  boss_eraser: { src: 'assets/audio/music/ep8_boss_eraser.mp3', volume: 1.052, loopStart: 0.06, loopEnd: 113.001179,
    fallback: 'boss_king', bpm: 136, key: 'C minor', measuredLufs: -16.44, duration: 141.496485 },
  boss_eraser_silence: { src: 'assets/audio/music/ep8_boss_eraser.mp3', volume: 1.052, start: 113.161179,
    loopStart: 113.161179, loopEnd: 141.396485, fallback: 'boss_eraser', bpm: 136, key: 'C minor', measuredLufs: -18.44,
    targetLufs: -18, duration: 141.496485 },
  the_last_word: { src: 'assets/audio/music/ep8_the_last_word.mp3', volume: 1.052, loopStart: 0.06, loopEnd: 264.06,
    fallback: 'title', bpm: 80, key: 'E major', measuredLufs: -16.44, duration: 264.16 },
};

const S = (file, duration, group, fallback) => ({ src: `assets/audio/sfx/ep8_${file}.wav`, volume: 1.0, duration, group, pack: 'ep8', fallback });

export const sfx = {
  page_open: { ...S('page_open', 0.977, 'field', 'page_flutter'), maxVoices: 2 },
  page_fold: { ...S('page_fold', 0.71, 'field', 'page_flutter'), maxVoices: 2 },   // page_open's flutter rendered backwards, a clap
  rub_out: { ...S('rub_out', 0.565, 'magic', 'debuff'), maxVoices: 3 },
  ink_slide: S('ink_slide', 0.511, 'magic', 'defend'),
  read_cast: S('read_cast', 1.708, 'magic', 'buff'),
  unwrite_read: S('unwrite_read', 2.128, 'big', 'telegraph'),
  unwrite_break: S('unwrite_break', 1.499, 'magic', 'glass_break'),
  silence_gather: S('silence_gather', 3.15, 'big', 'telegraph'),
};

export const jingles = {
  silence_gather: { src: 'assets/audio/sfx/ep8_silence_gather.wav', volume: 1.0, duration: 3.15 },
};

export const ambience = {
  library_hush: { src: 'assets/audio/ambience/ep8_library_hush.wav', volume: 1.0, duration: 10.0, widen: true, fallback: 'archive_hush' },
};

export const pack = { sfx: Object.keys(sfx).filter((id) => sfx[id].src).sort() };

export const AUDIO = { music, sfx, ambience, jingles, pack };
