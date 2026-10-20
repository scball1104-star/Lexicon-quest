// Audio manifest + file integrity (W1-audio). Pure Node, no browser.
// Every file the manifest references must exist (a 404 is a console error in qa/shots.py),
// WAV headers must be valid PCM 16-bit, levels within spec, durations within bounds.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, statSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const NEXT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const man = JSON.parse(readFileSync(join(NEXT, 'assets/audio/manifest.json'), 'utf8'));
const abs = (src) => resolve(NEXT, src);
const srcs = (e) => (Array.isArray(e.src) ? e.src : [e.src]);

const DESIGN_SFX = `cursor confirm cancel buzzer text_blip door_open door_close stairs chest_open pot_break
  footstep_grass footstep_stone footstep_wood block_push switch_on gate_open bridge_appear lantern_reveal splash
  encounter flee sword_slash spear_thrust staff_hit axe_chop bow_shot hit_light hit_heavy crit miss enemy_die
  boss_die fire ice thunder heal buff debuff poison break fury_ready fury_art combo_start level_up_sparkle
  drop_common drop_magic drop_rare drop_legendary menu_open menu_close equip buy save_chime
  text_blip_low text_blip_mid text_blip_high`.split(/\s+/).filter(Boolean);
const STORY_SFX = 'bell_toll bell_peal sign_fade name_restore door_rumble ink_gurgle page_flutter'.split(' ');
// Episode 2 (EPISODE2_PLAN.md 2.7 / 8.4)
const EP2_SFX = 'mirror_turn beam_hit glass_bridge glass_break mirror_step ferry_oars clock_chime reflection_out kept kept_break'.split(' ');
const JINGLES = 'item_get key_item level_up inn_rest save quest_done party_join victory_fanfare gameover_sting'.split(' ');
const AMBIENCE = 'river_birds archive_hush wind_valley mere_still court_hush'.split(' ');
const MUSIC = 'title willowmere valley archive battle boss_archivore mystery sorrow triumph victory gameover hollow hollowmere fading_road court boss_king'.split(' ');

function parseWav(path) {
  const b = readFileSync(path);
  assert.equal(b.toString('ascii', 0, 4), 'RIFF', `${path}: RIFF`);
  assert.equal(b.toString('ascii', 8, 12), 'WAVE', `${path}: WAVE`);
  let p = 12;
  let fmt = null;
  let data = null;
  while (p + 8 <= b.length) {
    const id = b.toString('ascii', p, p + 4);
    const size = b.readUInt32LE(p + 4);
    if (id === 'fmt ') {
      fmt = { format: b.readUInt16LE(p + 8), channels: b.readUInt16LE(p + 10), rate: b.readUInt32LE(p + 12), bits: b.readUInt16LE(p + 22) };
    } else if (id === 'data') {
      data = { offset: p + 8, size };
    }
    p += 8 + size + (size & 1);
  }
  assert.ok(fmt, `${path}: fmt chunk`);
  assert.ok(data, `${path}: data chunk`);
  assert.ok(data.offset + data.size <= b.length, `${path}: data chunk fits in file`);
  assert.equal(fmt.format, 1, `${path}: PCM`);
  assert.equal(fmt.bits, 16, `${path}: 16-bit`);
  const frames = data.size / (2 * fmt.channels);
  const samples = new Int16Array(b.buffer.slice(b.byteOffset + data.offset, b.byteOffset + data.offset + data.size));
  return { ...fmt, frames, duration: frames / fmt.rate, samples };
}

function levels(w) {
  let peak = 0;
  let sum = 0;
  for (let i = 0; i < w.samples.length; i++) {
    const v = w.samples[i];
    const a = v < 0 ? -v : v;
    if (a > peak) peak = a;
    sum += v;
  }
  return { peak: peak / 32768, mean: sum / w.samples.length / 32768 };
}

const PEAK_MAX = 10 ** (-1 / 20) + 2 / 32768; // -1 dBFS (+ dither LSBs)

test('manifest has the four sections and version', () => {
  for (const k of ['music', 'sfx', 'jingles', 'ambience']) assert.equal(typeof man[k], 'object', k);
  assert.equal(man.version, 1);
});

test('every id the design and the story need is present', () => {
  for (const id of [...DESIGN_SFX, ...STORY_SFX, ...EP2_SFX]) assert.ok(man.sfx[id], `sfx ${id}`);
  for (const id of JINGLES) assert.ok(man.jingles[id], `jingle ${id}`);
  for (const id of AMBIENCE) assert.ok(man.ambience[id], `ambience ${id}`);
  for (const id of MUSIC) assert.ok(man.music[id], `music ${id}`);
});

test('aliases point at real entries', () => {
  for (const [id, e] of Object.entries(man.sfx)) {
    if (e.alias) assert.ok(man.sfx[e.alias] && man.sfx[e.alias].src, `${id} -> ${e.alias}`);
  }
});

test('sfx: files exist, WAV 16-bit mono 22050 Hz, durations, levels, fades', () => {
  for (const [id, e] of Object.entries(man.sfx)) {
    if (e.alias) continue;
    let maxDur = 0;
    for (const s of srcs(e)) {
      assert.ok(existsSync(abs(s)), `${id}: ${s} exists`);
      assert.ok(s.endsWith('.wav'), `${id}: wav`);
      const w = parseWav(abs(s));
      assert.equal(w.channels, 1, `${id}: mono`);
      assert.equal(w.rate, 22050, `${id}: 22050 Hz`);
      assert.ok(w.duration >= 0.02 && w.duration <= 6.0, `${id}: duration ${w.duration}`);
      const L = levels(w);
      assert.ok(L.peak <= PEAK_MAX, `${id}: peak ${L.peak.toFixed(4)} <= -1 dBFS`);
      assert.ok(L.peak > 0.05, `${id}: not silent`);
      assert.ok(Math.abs(L.mean) < 0.003, `${id}: DC ${L.mean}`);
      assert.ok(Math.abs(w.samples[0]) / 32768 < 0.02, `${id}: starts near zero (fade-in)`);
      assert.ok(Math.abs(w.samples[w.samples.length - 1]) / 32768 < 0.01, `${id}: ends near zero (fade-out)`);
      maxDur = Math.max(maxDur, w.duration);
    }
    assert.ok(Math.abs(maxDur - e.duration) < 0.01, `${id}: manifest duration ${e.duration} vs ${maxDur}`);
    assert.ok(e.volume > 0 && e.volume <= 2, `${id}: volume`);
  }
});

test('jingles: MP3 files exist with a valid header, durations 1.5 to 8 s', () => {
  for (const [id, e] of Object.entries(man.jingles)) {
    for (const s of srcs(e)) {
      assert.ok(existsSync(abs(s)), `${id}: ${s} exists`);
      const b = readFileSync(abs(s));
      const id3 = b.toString('ascii', 0, 3) === 'ID3';
      const sync = b[0] === 0xff && (b[1] & 0xe0) === 0xe0;
      assert.ok(id3 || sync, `${id}: MP3 header`);
      assert.ok(b.length > 8000, `${id}: size`);
    }
    assert.ok(e.duration >= 1.5 && e.duration <= 8, `${id}: duration ${e.duration}`);
  }
});

test('ambience: seamless mono loops, 8 to 20 s', () => {
  for (const [id, e] of Object.entries(man.ambience)) {
    const w = parseWav(abs(e.src));
    assert.equal(w.channels, 1, `${id}: mono`);
    assert.ok([16000, 22050].includes(w.rate), `${id}: rate ${w.rate}`);
    assert.ok(w.duration >= 8 && w.duration <= 20, `${id}: duration`);
    const L = levels(w);
    assert.ok(L.peak <= PEAK_MAX, `${id}: peak`);
    assert.ok(Math.abs(L.mean) < 0.003, `${id}: DC`);
    // the wrap-around step must look like any other step (no click at the loop point)
    const s = w.samples;
    const steps = [];
    for (let i = 1; i < s.length; i++) steps.push(Math.abs(s[i] - s[i - 1]));
    steps.sort((a, b) => a - b);
    const p99 = steps[Math.floor(steps.length * 0.99)];
    assert.ok(Math.abs(s[0] - s[s.length - 1]) <= p99, `${id}: loop seam step within the 99th percentile`);
  }
});

test('music: files exist, fallbacks valid, loop points sane, new music files are wired in', () => {
  for (const [id, e] of Object.entries(man.music)) {
    if (id.startsWith('_')) continue;
    if (e.src) {
      assert.ok(existsSync(abs(e.src)), `${id}: ${e.src} exists`);
      assert.ok(e.volume > 0 && e.volume <= 2, `${id}: volume`);
      if (e.loopEnd != null) assert.ok(e.loopEnd > (e.loopStart || 0) + 5, `${id}: loop length`);
      if (e.loopEnd != null && e.duration) assert.ok(e.loopEnd <= e.duration + 0.01, `${id}: loopEnd within file`);
    } else {
      assert.ok(e.fallback === null || (man.music[e.fallback] && e.fallback !== id), `${id}: fallback ${e.fallback}`);
    }
  }
  const musicDir = join(NEXT, 'assets/audio/music');
  if (existsSync(musicDir)) {
    for (const f of readdirSync(musicDir)) {
      if (!f.endsWith('.mp3')) continue;
      const id = f.slice(0, -4);
      if (man.music[id]) assert.equal(man.music[id].src, `assets/audio/music/${f}`, `${id}: rerun python tools/audio/build.py --manifest`);
    }
  }
});

test('total synthesized audio stays small', () => {
  // Episode 1 set ~4.7 MB; Episode 2 adds ~0.36 MB of sfx and two 16 kHz ambience loops (~0.64 MB, runtime-cached,
  // not precached), so the cap moved from 5.5 to 6.0 MB. The precached share (sfx + jingles) has its own budget in
  // qa/pwa/precache.test.mjs.
  let total = 0;
  for (const sub of ['sfx', 'jingles', 'ambience']) {
    const d = join(NEXT, 'assets/audio', sub);
    for (const f of readdirSync(d)) total += statSync(join(d, f)).size;
  }
  assert.ok(total < 6.0e6, `total ${(total / 1e6).toFixed(2)} MB`);
});

test('Episode 2 music: the five composed tracks have fallbacks and sidecar loop points', () => {
  const FALLBACK = { hollow: 'willowmere', hollowmere: 'hollow', fading_road: 'valley', court: 'archive', boss_king: 'boss_archivore' };
  for (const [id, fb] of Object.entries(FALLBACK)) {
    const e = man.music[id];
    assert.ok(e, `music ${id}`);
    assert.equal(e.src, `assets/audio/music/${id}.mp3`, `${id}: src`);
    assert.equal(e.fallback, fb, `${id}: fallback`);
    assert.ok(Math.abs(e.loopStart - 0.06) < 1e-6, `${id}: loopStart is the 60 ms guard`);
    assert.ok(e.loopEnd > 60 && e.loopEnd <= e.duration, `${id}: loopEnd`);
    assert.ok(Math.abs(e.measuredLufs + 16.4) < 0.3, `${id}: measured ${e.measuredLufs} LUFS (about -16.4 after MP3)`);
  }
});
