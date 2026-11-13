// The ep7 pack's audio fragment (docs/EPISODE7_PLAN.md 2.7, 8 and 13.3), in the assets/audio/manifest.json entry shape. Written
// by E7-audio; nobody else edits it. index.js merges it into engine.audio.manifest (never overwriting an id) before
// audio.loadPack('ep7') runs, on every path that brings the pack up (the quick start included), so assets/audio/manifest.json,
// whose bytes count before the tap prompt, is never edited. Music is runtime-cached (lazy); the sfx and ambience files are named
// ep7_* so build_pwa.py's LAZY_PREFIXES keep them out of the precache. Every sfx is pack 'ep7' and names a core `fallback` the
// engine plays until the pack has arrived. Regenerate: python tools/music/render.py ep7_palehaven ep7_frostbound_vault
// ep7_boss_phantom; python tools/audio/ep7_sfx.py --review; python tools/audio/ep7_review.py (measuredLufs and volume, from the
// MP3). `volume` brings each track's decoded loop to -16 LUFS.
//
// Reused, not redefined here: music mystery, high_moor, sorrow, triumph, battle, victory, gameover (core) and zephyr (the ep6
// fragment); sfx bell_thirteenth (the Listening Bell thawed: it is tuned to the thirteenth bell), bell_toll, ice, name_restore
// (core); the core ambience moor_wind and archive_hush are only the fallbacks of snow_wind and vault_hush.
//
// rime_bite is one pip; rime_bite_2 and rime_bite_3 are the same crackle a whole step and two steps higher, so a scene that
// knows the pip count plays `rime_bite_${n}` for n 2 and 3 (or rime_bite with { pitch: 2 ** (2 * (n - 1) / 12) }).

export const music = {
  palehaven: { src: 'assets/audio/music/ep7_palehaven.mp3', volume: 1.052, loopStart: 0.06, loopEnd: 93.393333,
    fallback: 'hollowmere', bpm: 72, key: 'D dorian', measuredLufs: -16.44, duration: 93.493333 },
  frostbound_vault: { src: 'assets/audio/music/ep7_frostbound_vault.mp3', volume: 1.052, loopStart: 0.06, loopEnd: 87.332744,
    fallback: 'hollow', bpm: 66, key: 'A aeolian', measuredLufs: -16.44, duration: 87.432744 },
  boss_phantom: { src: 'assets/audio/music/ep7_boss_phantom.mp3', volume: 1.052, loopStart: 0.06, loopEnd: 109.150907,
    fallback: 'boss_king', bpm: 132, key: 'F minor', measuredLufs: -16.44, duration: 109.250907 },
};

const S = (file, duration, group, fallback) => ({ src: `assets/audio/sfx/ep7_${file}.wav`, volume: 1.0, duration, group, pack: 'ep7', fallback });

export const sfx = {
  stone_hold: { ...S('stone_hold', 1.071, 'field', 'crystal_hit'), maxVoices: 2 },
  stone_letgo: S('stone_letgo', 0.89, 'field', 'debuff'),
  frost_seal: S('frost_seal', 1.653, 'field', 'ice'),
  frost_melt: S('frost_melt', 1.888, 'field', 'ice'),   // frost_seal's own render backwards: a door thawing (E7-fixes)
  rime_bite: { ...S('rime_bite', 0.285, 'magic', 'debuff'), maxVoices: 3 },
  rime_bite_2: { ...S('rime_bite_2', 0.295, 'magic', 'debuff'), maxVoices: 3 },
  rime_bite_3: { ...S('rime_bite_3', 0.279, 'magic', 'debuff'), maxVoices: 3 },
  rime_freeze: S('rime_freeze', 0.634, 'magic', 'ice'),
  call_cast: S('call_cast', 1.708, 'magic', 'buff'),
  farewell_read: S('farewell_read', 2.128, 'big', 'telegraph'),
  farewell_break: S('farewell_break', 1.85, 'magic', 'glass_break'),
};

export const ambience = {
  snow_wind: { src: 'assets/audio/ambience/ep7_snow_wind.wav', volume: 1.0, duration: 10.0, widen: true, fallback: 'moor_wind' },
  vault_hush: { src: 'assets/audio/ambience/ep7_vault_hush.wav', volume: 1.0, duration: 10.0, widen: true, fallback: 'archive_hush' },
};

export const pack = { sfx: Object.keys(sfx).filter((id) => sfx[id].src).sort() };

export const AUDIO = { music, sfx, ambience, pack };
