// Episode 8 music (E8-audio, docs/EPISODE8_PLAN.md 8.1): the four tracker pieces exist as ep8_*.mp3 with a gapless LAME tag,
// their sidecars agree with the decoded length, they loop on the 60 ms guard in whole bars, and the pack fragment
// (src/data/ep8/audio.js) carries the same loop points, the plan's fallback (a playable core track) and a volume that brings the
// decoded loop to its loudness. boss_eraser's file holds two loops: the battle and the Last Silence (phase 4), which is the
// second music id boss_eraser_silence on the same src, starting at its own loop. The plan's lengths: scriptorium_town 90 to
// 100 s, first_library about 90 s, boss_eraser 110 to 120 s (the battle loop), the_last_word 240 to 300 s, and two passes of
// it cover the credits at the credits scene's scroll speed (CREDITS_EP8, once E8-story writes it). The songs carry the name
// motif where the plan puts it (checked on the song sources).
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { music } from '../../src/data/ep8/audio.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const NEXT = path.resolve(here, '..', '..');
const core = JSON.parse(fs.readFileSync(path.join(NEXT, 'assets', 'audio', 'manifest.json'), 'utf8'));

const TRACKS = {
  scriptorium_town: { file: 'ep8_scriptorium_town', minSec: 90, maxSec: 100, bpm: 88, fallback: 'willowmere', key: 'G lydian' },
  first_library: { file: 'ep8_first_library', minSec: 85, maxSec: 100, bpm: 76, fallback: 'archive', key: 'D dorian' },
  boss_eraser: { file: 'ep8_boss_eraser', minSec: 110, maxSec: 120, bpm: 136, fallback: 'boss_king', key: 'C minor', two: true },
  the_last_word: { file: 'ep8_the_last_word', minSec: 240, maxSec: 300, bpm: 80, fallback: 'title', key: 'E major' },
};
const SR = 44100;

function parseMp3(buf) {
  let pos = 0, frames = 0, info = null;
  while (pos + 4 <= buf.length) {
    const h = buf.readUInt32BE(pos);
    assert.equal((h >>> 21) & 0x7ff, 0x7ff, `lost MP3 sync at byte ${pos}`);
    assert.equal((h >>> 12) & 15, 10, '160 kbps expected');
    assert.equal((h >>> 10) & 3, 0, '44.1 kHz expected');
    const flen = Math.floor((144 * 160000) / SR) + ((h >>> 9) & 1);
    if (frames === 0) {
      const tag = buf.subarray(pos + 36, pos + 40).toString('latin1');
      if (tag === 'Info' || tag === 'Xing') {
        const v = buf.readUIntBE(pos + 177, 3);
        info = { lame: buf.subarray(pos + 156, pos + 165).toString('latin1'), delay: v >>> 12, padding: v & 0xfff };
      }
    }
    frames += 1;
    pos += flen;
  }
  return { frames, info };
}

const wholeBars = (id, a, b, bpm) => {
  const beats = (b - a) * bpm / 60;
  assert.ok(Math.abs(beats / 4 - Math.round(beats / 4)) < 1e-3, `${id}: loop body is ${beats.toFixed(3)} beats, not whole bars`);
  return Math.round(beats / 4);
};

let bytes = 0;
const metas = {};
for (const [id, spec] of Object.entries(TRACKS)) {
  const e = music[id];
  assert.ok(e, `fragment has no music.${id}`);
  assert.ok(!(id in core.music), `${id} must not be in assets/audio/manifest.json (it rides the pack fragment)`);
  assert.equal(e.src, `assets/audio/music/${spec.file}.mp3`);
  const buf = fs.readFileSync(path.join(NEXT, e.src));
  const meta = JSON.parse(fs.readFileSync(path.join(NEXT, 'assets', 'audio', 'music', spec.file + '.json'), 'utf8'));
  metas[id] = meta;
  const { frames, info } = parseMp3(buf);
  assert.ok(info && info.lame.startsWith('LAME'), `${id}: gapless LAME tag missing`);
  const sec = ((frames - 1) * 1152 - info.delay - info.padding) / SR;
  assert.ok(Math.abs(meta.duration - sec) < 0.002, `${id}: sidecar duration ${meta.duration} vs decoded ${sec}`);
  const body = meta.loopEnd - meta.loopStart;
  assert.ok(body >= spec.minSec && body <= spec.maxSec, `${id}: loop ${body.toFixed(1)} s outside ${spec.minSec}..${spec.maxSec}`);
  assert.ok(Math.abs(meta.loopStart - 0.06) < 1e-4, `${id}: loopStart ${meta.loopStart} (the 60 ms guard)`);
  assert.equal(meta.bpm, spec.bpm, `${id}: bpm`);
  assert.equal(meta.key, spec.key, `${id}: key`);
  for (const k of ['loopStart', 'loopEnd', 'duration', 'bpm', 'key']) assert.equal(e[k], meta[k], `${id}: fragment ${k} matches the sidecar`);
  const bars = wholeBars(id, meta.loopStart, meta.loopEnd, spec.bpm);
  if (!spec.two) {
    assert.ok(Math.abs(meta.duration - meta.loopEnd - 0.1) < 0.002, `${id}: 100 ms of loop head after loopEnd (the guard tail)`);
  } else {
    // the Last Silence: the second loop of the same file, whole bars, its own guard, ending 100 ms before the file does
    const s = music.boss_eraser_silence;
    assert.ok(s, 'music.boss_eraser_silence (phase 4)');
    assert.equal(s.src, e.src, 'boss_eraser_silence plays the same file (one fetch, one decode)');
    assert.equal(s.loopStart, meta.silenceStart, 'silence loopStart = sidecar silenceStart');
    assert.equal(s.loopEnd, meta.silenceEnd, 'silence loopEnd = sidecar silenceEnd');
    assert.equal(s.start, s.loopStart, 'boss_eraser_silence starts at its own loop');
    assert.ok(meta.silenceStart > meta.loopEnd + 0.1, 'the silence loop sits after the battle loop and its tail');
    assert.ok(Math.abs(meta.duration - meta.silenceEnd - 0.1) < 0.002, 'the silence loop has its 100 ms guard tail');
    assert.equal(wholeBars('boss_eraser_silence', s.loopStart, s.loopEnd, spec.bpm), 16, 'the Last Silence is 16 bars');
    assert.equal(s.fallback, 'boss_eraser', 'boss_eraser_silence falls back to the battle loop');
    assert.ok(Math.abs(s.measuredLufs - s.targetLufs) < 1.0 && s.targetLufs === -18, 'the Last Silence sits at -18 LUFS');
    assert.ok(Math.abs(20 * Math.log10(s.volume) - (s.targetLufs - s.measuredLufs)) < 0.02, 'silence volume');
    assert.ok(!(s.loop === false), 'the silence loops');
  }
  assert.equal(e.fallback, spec.fallback, `${id}: fallback (plan 8.1)`);
  assert.ok(core.music[e.fallback] && core.music[e.fallback].src, `${id}: fallback ${e.fallback} is a playable core track`);
  assert.ok(e.volume > 0.8 && e.volume < 1.25, `${id}: volume ${e.volume}`);
  assert.ok(Math.abs(e.measuredLufs + 16) < 1.0, `${id}: measured ${e.measuredLufs} LUFS, not near -16`);
  assert.ok(Math.abs(20 * Math.log10(e.volume) - (-16 - e.measuredLufs)) < 0.02, `${id}: volume brings the decoded loop to -16 LUFS`);
  assert.ok(buf.length < (id === 'the_last_word' ? 6.0e6 : 3.5e6), `${id}: ${buf.length} bytes over its cap`);
  bytes += buf.length;
  console.log(`ok - ${id}: ${sec.toFixed(2)} s, ${bars} bars a loop, ${buf.length} bytes, loop ${meta.loopStart}..${meta.loopEnd}, fallback ${e.fallback}`);
}
assert.deepEqual(Object.keys(music).sort(), [...Object.keys(TRACKS), 'boss_eraser_silence'].sort(), 'the fragment has the four tracks and the phase 4 loop');

// the credits: two passes of the_last_word cover CREDITS_EP8 at the credits scene's speed (0.55 px a frame at 60 fps, cards
// from H + 10, a card is 20 px of heading + 12 px a line + a 44 px gap, the last card centred then held 4 s). E8-story writes
// CREDITS_EP8 in parallel (wave 8a); until it exists this part reports and passes on the plan's 5 minutes.
const SCENE = fs.readFileSync(path.join(NEXT, 'src', 'scenes', 'credits.js'), 'utf8');
const speed = Number((SCENE.match(/const SPEED = ([0-9.]+)/) || [])[1]);
const gap = Number((SCENE.match(/const GAP = ([0-9.]+)/) || [])[1]);
assert.ok(speed > 0 && gap > 0, 'credits.js SPEED and GAP read');
let cards = null;
for (const f of ['credits.js', 'text.js']) {
  const p = path.join(NEXT, 'src', 'data', 'ep8', f);
  if (!fs.existsSync(p)) continue;
  try { const m = await import(pathToFileURL(p).href); if (Array.isArray(m.CREDITS_EP8)) { cards = m.CREDITS_EP8; break; } } catch { /* not ready */ }
}
const loopSec = metas.the_last_word.loopEnd - metas.the_last_word.loopStart;
let creditsSec = 300;   // the plan's "about 5 minutes"
if (cards) {
  const H = 216, wrapChars = 60;
  let y = H + 10, last = null;
  for (const c of cards) {
    const lines = (c.lines || []).reduce((n, l) => n + Math.max(1, Math.ceil(String(l).length / wrapChars)), 0);
    const h = (c.heading ? 20 : 0) + lines * 12;
    last = { at: y, h };
    y += h + gap;
  }
  creditsSec = (last.at + last.h / 2 - H / 2) / (speed * 60) + 4;
}
assert.ok(2 * loopSec >= creditsSec, `two passes of the_last_word (${(2 * loopSec).toFixed(0)} s) cover the credits (${creditsSec.toFixed(0)} s)`);
console.log(`ok - the credits: ${cards ? `CREDITS_EP8 (${cards.length} cards)` : 'CREDITS_EP8 not written yet, the plan\'s 5 minutes'} ` +
  `scroll ${creditsSec.toFixed(0)} s; the_last_word ${loopSec.toFixed(0)} s a pass (${loopSec >= creditsSec ? 'one pass covers it' : 'it loops once'})`);

// the songs exist where render.py finds them, and are not in its ALL list (Episode 8 never renders into the core manifest)
const renderPy = fs.readFileSync(path.join(NEXT, 'tools', 'music', 'render.py'), 'utf8');
for (const spec of Object.values(TRACKS)) {
  assert.ok(fs.existsSync(path.join(NEXT, 'tools', 'music', 'songs', `${spec.file}.py`)), `${spec.file}.py exists`);
  assert.ok(!renderPy.includes(`'${spec.file}'`), `${spec.file} is not in render.py's ALL`);
}
// the motif, where the plan puts it (8.1)
const src = (f) => fs.readFileSync(path.join(NEXT, 'tools', 'music', 'songs', f), 'utf8');
const theme = src('ep8_theme.py');
assert.match(theme, /class Violin\(synth\.Instrument\)/, 'the violin is a song-local instrument');
const synthPy = fs.readFileSync(path.join(NEXT, 'tools', 'music', 'synth.py'), 'utf8');
assert.ok(!synthPy.includes('class Violin'), 'synth.py is untouched');
assert.match(theme, /\(0, 0\.0, 0, 1\), \(0, 1\.0, 4, 1\), \(0, 2\.0, 5, 1\), \(0, 3\.0, 3, 5\)/, 'the tune opens on the motif 0 4 5 3, the C held');
assert.match(src('ep8_scriptorium_town.py'), /E\.tune\(67, 'major', first, finished=finished\)/, 'scriptorium_town: the tune on G, unfinished then finished');
assert.match(src('ep8_scriptorium_town.py'), /'c#6'/, 'scriptorium_town: the Lydian C# where the C belongs');
assert.match(src('ep8_first_library.py'), /MOTIF_D = \(62, 69, 71, 67\)/, 'first_library: the violin D4 A4 B4 G4');
assert.match(src('ep8_first_library.py'), /echo\.add\(bs\(first \+ i\) \+ 2\.0, p \+ 24/, 'first_library: the celesta two beats late');
assert.match(src('ep8_first_library.py'), /DROP = \{8: /, 'first_library: a dropout every 8 bars');
assert.match(src('ep8_boss_eraser.py'), /motif44\(hi, bs\(bar\), 63/, 'boss_eraser: the strings Eb4 Bb4 C5 Ab4');
assert.match(src('ep8_boss_eraser.py'), /E\.tune\(60, 'aeolian', 1, finished=False, cut=2\)/, 'boss_eraser: the town quote, cut');
assert.match(src('ep8_boss_eraser.py'), /pattern='c5\/1 g5\/1 a5\/1 f5\/1'/, 'boss_eraser: the motif whole on the last bar of the Last Silence');
const lw = src('ep8_the_last_word.py');
for (const inst of ['musicbox', 'horn', 'dulcimer', 'celesta', 'E5.Oud', 'E6.WindHarp', 'E7.IceglassBell', 'E.Violin']) {
  assert.ok(lw.includes(inst), `the_last_word: the ${inst} station`);
}
assert.ok(lw.indexOf("'musicbox'") < lw.indexOf("'horn'") && lw.indexOf("'horn'") < lw.indexOf("'dulcimer'") &&
  lw.indexOf("E5.Oud") < lw.indexOf("E6.WindHarp") && lw.indexOf("E6.WindHarp") < lw.indexOf("E7.IceglassBell"), 'the stations in episode order');
console.log(`ep8 music tests passed (${bytes} bytes of music, lazy)`);
