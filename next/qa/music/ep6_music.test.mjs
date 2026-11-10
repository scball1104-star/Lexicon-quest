// Episode 6 music (E6-audio, docs/EPISODE6_PLAN.md 8.1): the three tracker pieces exist as ep6_*.mp3 with a gapless LAME tag,
// their sidecars agree with the decoded length, they loop on the 60 ms guard (boss_scribe after its once-only two-bar intro),
// and the pack fragment (src/data/ep6/audio.js) carries the same loop points, the plan's fallback (a playable core track) and a
// volume near unity. The plan's lengths: zephyr 80 to 95 s, storm_observatory about 90 s, boss_scribe 100 to 120 s. The songs
// carry the name motif where the plan puts it (checked on the song sources: the wind harp, the horn and its echo, the brass).
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { music } from '../../src/data/ep6/audio.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const NEXT = path.resolve(here, '..', '..');
const core = JSON.parse(fs.readFileSync(path.join(NEXT, 'assets', 'audio', 'manifest.json'), 'utf8'));

const TRACKS = {
  zephyr: { file: 'ep6_zephyr', minSec: 80, maxSec: 95, bpm: 112, fallback: 'the_downs', key: 'G major' },
  storm_observatory: { file: 'ep6_storm_observatory', minSec: 85, maxSec: 100, bpm: 96, fallback: 'court', key: 'D dorian' },
  // 6/8 at dotted quarter 92, written as three quarter beats a bar at 138
  boss_scribe: { file: 'ep6_boss_scribe', minSec: 100, maxSec: 120, bpm: 138, fallback: 'boss_king', key: 'E minor',
    introBars: 2, beatsPerBar: 3 },
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

let bytes = 0;
for (const [id, spec] of Object.entries(TRACKS)) {
  const e = music[id];
  assert.ok(e, `fragment has no music.${id}`);
  assert.ok(!(id in core.music), `${id} must not be in assets/audio/manifest.json (it rides the pack fragment)`);
  assert.equal(e.src, `assets/audio/music/${spec.file}.mp3`);
  const buf = fs.readFileSync(path.join(NEXT, e.src));
  const meta = JSON.parse(fs.readFileSync(path.join(NEXT, 'assets', 'audio', 'music', spec.file + '.json'), 'utf8'));
  const { frames, info } = parseMp3(buf);
  assert.ok(info && info.lame.startsWith('LAME'), `${id}: gapless LAME tag missing`);
  const sec = ((frames - 1) * 1152 - info.delay - info.padding) / SR;
  assert.ok(sec >= spec.minSec && sec <= spec.maxSec, `${id}: ${sec.toFixed(1)} s outside ${spec.minSec}..${spec.maxSec}`);
  assert.ok(Math.abs(meta.duration - sec) < 0.002, `${id}: sidecar duration ${meta.duration} vs decoded ${sec}`);
  // boss_scribe plays its two intro bars once: its loop starts on the bar line of bar 3 (2 bars of 3 beats at 138 BPM)
  const loopStart = spec.introBars ? spec.introBars * spec.beatsPerBar * 60 / spec.bpm : 0.06;
  assert.ok(Math.abs(meta.loopStart - loopStart) < 1e-4, `${id}: loopStart ${meta.loopStart} (want ${loopStart.toFixed(6)})`);
  assert.equal(meta.bpm, spec.bpm, `${id}: bpm`);
  assert.equal(meta.key, spec.key, `${id}: key`);
  for (const k of ['loopStart', 'loopEnd', 'duration', 'bpm', 'key']) assert.equal(e[k], meta[k], `${id}: fragment ${k} matches the sidecar`);
  // the loop body is whole bars: loopEnd - loopStart = bars x beats per bar at the tempo, to the sample
  const beats = (meta.loopEnd - meta.loopStart) * spec.bpm / 60;
  const bpb = spec.beatsPerBar || 4;
  assert.ok(Math.abs(beats / bpb - Math.round(beats / bpb)) < 1e-3, `${id}: loop body is ${beats.toFixed(3)} beats, not whole bars`);
  assert.ok(meta.loopEnd < meta.duration && meta.loopEnd - meta.loopStart > 60, `${id}: loop body`);
  assert.ok(Math.abs(meta.duration - meta.loopEnd - 0.1) < 0.002, `${id}: 100 ms of loop head after loopEnd (the tracker's guard tail)`);
  assert.equal(e.fallback, spec.fallback, `${id}: fallback (plan 8.1)`);
  assert.ok(core.music[e.fallback] && core.music[e.fallback].src, `${id}: fallback ${e.fallback} is a playable core track`);
  assert.ok(e.volume > 0.8 && e.volume < 1.25, `${id}: volume ${e.volume}`);
  assert.ok(Math.abs(e.measuredLufs + 16) < 1.0, `${id}: measured ${e.measuredLufs} LUFS, not near -16`);
  assert.ok(Math.abs(20 * Math.log10(e.volume) - (-16 - e.measuredLufs)) < 0.02, `${id}: volume brings the decoded loop to -16 LUFS`);
  assert.ok(buf.length < 3.5e6, `${id}: ${buf.length} bytes over the 3.5 MB cap`);
  bytes += buf.length;
  console.log(`ok - ${id}: ${sec.toFixed(2)} s, ${buf.length} bytes, loop ${meta.loopStart}..${meta.loopEnd}, fallback ${e.fallback}`);
}
// the songs exist where render.py finds them, and are not in its ALL list (Episode 6 never renders into the core manifest)
const renderPy = fs.readFileSync(path.join(NEXT, 'tools', 'music', 'render.py'), 'utf8');
for (const spec of Object.values(TRACKS)) {
  assert.ok(fs.existsSync(path.join(NEXT, 'tools', 'music', 'songs', `${spec.file}.py`)), `${spec.file}.py exists`);
  assert.ok(!renderPy.includes(`'${spec.file}'`), `${spec.file} is not in render.py's ALL`);
}
assert.deepEqual(Object.keys(music).sort(), Object.keys(TRACKS).sort(), 'the fragment has exactly the three new tracks');
// the motif, where the plan puts it (8.1): the wind harp is song-local (synth.py untouched) and states G D E C in zephyr; the
// horn's augmented D A B G with the wind harp's echo two beats late; the brass's G D E C and the Zephyr quote in the boss
const src = (f) => fs.readFileSync(path.join(NEXT, 'tools', 'music', 'songs', f), 'utf8');
const theme = src('ep6_theme.py');
assert.match(theme, /class WindHarp\(synth\.Instrument\)/, 'the wind harp is a song-local instrument');
assert.ok(!fs.readFileSync(path.join(NEXT, 'tools', 'music', 'synth.py'), 'utf8').includes('WindHarp'), 'synth.py is untouched');
assert.match(theme, /\(0, 0\.0, 0, 1\), \(0, 1\.0, 4, 1\), \(0, 2\.0, 5, 1\), \(0, 3\.0, 3, 2\)/, 'the tune opens on the motif 0 4 5 3');
assert.match(src('ep6_zephyr.py'), /MOTIF = \('g4', 'd5', 'e5', 'c5'\)/, 'zephyr: G D E C on the wind harp');
assert.match(src('ep6_storm_observatory.py'), /MOTIF_D = \(50, 57, 59, 55\)/, 'storm_observatory: the horn D3 A3 B3 G3');
assert.match(src('ep6_storm_observatory.py'), /echo\.add\(bs\(bar \+ i\) \+ 2\.0/, 'storm_observatory: the wind harp echo two beats late');
assert.match(src('ep6_boss_scribe.py'), /motif68\(brass, bar, 55/, 'boss_scribe: the brass G3 D4 E4 C4');
assert.match(src('ep6_boss_scribe.py'), /E\.tune68\(64, 'aeolian'/, 'boss_scribe: the Zephyr quote in E minor');
console.log(`ep6 music tests passed (${bytes} bytes of music, lazy)`);
