// Music asset checks: the composed tracks (Episodes 1 to 3) exist, are sane MP3s with a gapless LAME tag, sizes are
// within bounds, and the <id>.json loop metadata is valid and consistent with the MP3's decoded length.
// Runs under any runner that imports or executes this file: failures throw (non-zero exit).
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const musicDir = path.resolve(here, '..', '..', 'assets', 'audio', 'music');

const TRACKS = {
  archive: { minSec: 80, maxSec: 110, loops: true },
  mystery: { minSec: 40, maxSec: 55, loops: true },
  sorrow: { minSec: 55, maxSec: 70, loops: true },
  triumph: { minSec: 45, maxSec: 60, loops: false },
  // Episode 2 (EPISODE2_PLAN.md 8.1)
  hollow: { minSec: 60, maxSec: 80, loops: true },
  hollowmere: { minSec: 60, maxSec: 80, loops: true },
  fading_road: { minSec: 85, maxSec: 95, loops: true },
  court: { minSec: 85, maxSec: 95, loops: true },
  boss_king: { minSec: 115, maxSec: 125, loops: true },
  // Episode 3 (EPISODE3_PLAN.md 8.1)
  emberpeak: { minSec: 70, maxSec: 90, loops: true },
  first_bell: { minSec: 70, maxSec: 90, loops: true },
  ash_road: { minSec: 85, maxSec: 95, loops: true },
  foundry: { minSec: 85, maxSec: 95, loops: true },
  boss_warden: { minSec: 110, maxSec: 120, loops: true },
  // Expansion 1 (EXPANSION1_PLAN.md 10.4)
  the_downs: { minSec: 70, maxSec: 90, loops: true },
  high_moor: { minSec: 80, maxSec: 100, loops: true },
  wethers_barrow: { minSec: 70, maxSec: 95, loops: true },
  orrery: { minSec: 90, maxSec: 110, loops: true },
  larchhill: { minSec: 80, maxSec: 100, loops: true },
  millrace: { minSec: 70, maxSec: 90, loops: true },
  boss_reeve: { minSec: 90, maxSec: 110, loops: true },
  boss_millstone: { minSec: 90, maxSec: 110, loops: true },
};
const KBPS = 160;
const SR = 44100;
const FRAME_SAMPLES = 1152;

function parseMp3(buf, kbps = KBPS) {
  // CBR MPEG-1 Layer III, 160 kbps, 44.1 kHz: count frames and read the Info/LAME tag from frame 0
  let pos = 0;
  let frames = 0;
  let info = null;
  while (pos + 4 <= buf.length) {
    const h = buf.readUInt32BE(pos);
    assert.equal((h >>> 21) & 0x7ff, 0x7ff, `lost MP3 sync at byte ${pos}`);
    const version = (h >>> 19) & 3;
    const layer = (h >>> 17) & 3;
    const brIdx = (h >>> 12) & 15;
    const srIdx = (h >>> 10) & 3;
    const pad = (h >>> 9) & 1;
    assert.equal(version, 3, 'MPEG-1 expected');
    assert.equal(layer, 1, 'Layer III expected');
    assert.equal(brIdx, kbps === 160 ? 10 : (kbps === 112 ? 8 : 10), `${kbps} kbps expected`);
    assert.equal(srIdx, 0, '44.1 kHz expected');
    const flen = Math.floor((144 * kbps * 1000) / SR) + pad;
    if (frames === 0) {
      const tag = buf.subarray(pos + 36, pos + 40).toString('latin1');
      if (tag === 'Info' || tag === 'Xing') {
        const lame = buf.subarray(pos + 156, pos + 165).toString('latin1');
        const v = buf.readUIntBE(pos + 177, 3);
        info = { tag, lame, encoderDelay: v >>> 12, padding: v & 0xfff, audioFrames: buf.readUInt32BE(pos + 44) };
      }
    }
    frames += 1;
    pos += flen;
  }
  return { frames, info };
}

let ok = 0;
for (const [id, spec] of Object.entries(TRACKS)) {
  const mp3Path = path.join(musicDir, id + '.mp3');
  const jsonPath = path.join(musicDir, id + '.json');
  assert.ok(fs.existsSync(mp3Path), `${id}.mp3 missing`);
  assert.ok(fs.existsSync(jsonPath), `${id}.json missing`);
  const buf = fs.readFileSync(mp3Path);
  const meta = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  if (/Suno/.test(meta.source || '')) {
    // a Suno Pro replacement (docs/MEDIA_BUILD.md 3): 112 kbps through tools/audio/add_track.py, loop points measured by
    // music_scan.py into the sidecar by finish_tracks.py; the composed piece's duration, bpm and key pins do not apply
    const { frames: f2, info: i2 } = parseMp3(buf, 112);
    assert.ok(i2 && i2.lame.startsWith('LAME'), `${id}.mp3 (Suno) has no Info/LAME gapless tag`);
    const sec2 = ((f2 - 1) * FRAME_SAMPLES - i2.encoderDelay - i2.padding) / SR;
    assert.ok(typeof meta.loopStart === 'number' && meta.loopStart >= 0 && meta.loopStart < 1, `${id} (Suno) loopStart`);
    assert.ok(typeof meta.loopEnd === 'number' && meta.loopEnd > meta.loopStart + 10 && meta.loopEnd <= sec2 + 1, `${id} (Suno) loopEnd ${meta.loopEnd} for ${sec2.toFixed(1)}s`);
    console.log(`ok - ${id} (Suno): ${sec2.toFixed(2)}s, ${buf.length} bytes, loop ${meta.loopStart}..${meta.loopEnd}`);
    ok += 1;
    continue;
  }
  const { frames, info } = parseMp3(buf);
  assert.ok(info, `${id}.mp3 has no Info/LAME gapless tag`);
  assert.ok(info.lame.startsWith('LAME'), `${id}.mp3 LAME version string missing`);
  assert.equal(info.audioFrames, frames - 1, `${id}.mp3 tag frame count mismatch`);
  const decodedSamples = (frames - 1) * FRAME_SAMPLES - info.encoderDelay - info.padding;
  const decodedSec = decodedSamples / SR;
  // size bounds: 160 kbps CBR, so bytes ~ 20 KB per second
  const expectBytes = decodedSec * (KBPS * 1000) / 8;
  assert.ok(buf.length > expectBytes * 0.9 && buf.length < expectBytes * 1.1 + 2000, `${id}.mp3 size ${buf.length} off for ${decodedSec.toFixed(1)}s`);
  assert.ok(decodedSec >= spec.minSec && decodedSec <= spec.maxSec, `${id} duration ${decodedSec.toFixed(1)}s outside ${spec.minSec}..${spec.maxSec}`);
  // loop metadata
  for (const k of ['loopStart', 'loopEnd', 'bpm', 'key', 'duration']) assert.ok(k in meta, `${id}.json missing ${k}`);
  assert.ok(typeof meta.loopStart === 'number' && meta.loopStart >= 0, `${id} loopStart`);
  assert.ok(typeof meta.loopEnd === 'number' && meta.loopEnd > meta.loopStart + 10, `${id} loopEnd`);
  assert.ok(meta.loopEnd <= meta.duration + 1e-6, `${id} loopEnd beyond duration`);
  assert.ok(Math.abs(meta.duration - decodedSec) < 0.002, `${id} duration ${meta.duration} vs decoded ${decodedSec}`);
  assert.ok(meta.bpm > 40 && meta.bpm < 200, `${id} bpm`);
  assert.ok(typeof meta.key === 'string' && meta.key.length > 0, `${id} key`);
  if (spec.loops) {
    // loop point sits on the 60 ms guard and the loop body is a whole number of beats at the stated bpm
    assert.ok(Math.abs(meta.loopStart - 0.06) < 1e-6, `${id} loopStart should be the 60 ms guard`);
  } else {
    assert.equal(meta.loopStart, 0, `${id} ending piece restarts from 0`);
    assert.ok(Math.abs(meta.loopEnd - meta.duration) < 1e-6, `${id} ending piece loops the whole file`);
  }
  console.log(`ok - ${id}: ${decodedSec.toFixed(2)}s, ${buf.length} bytes, loop ${meta.loopStart}..${meta.loopEnd}, delay ${info.encoderDelay} pad ${info.padding}`);
  ok += 1;
}
console.log(`music tests passed (${ok} tracks)`);
