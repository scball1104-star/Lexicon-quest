// audio.js runtime logic (W1-audio): imports cleanly in Node, no-ops without WebAudio, and behaves
// correctly against a fake AudioContext (unlock, loop points, crossfade, push/pop resume position,
// fallbacks, sfx cooldown and voice limit, jingle ducking, ambience widening).
import { test } from 'node:test';
import assert from 'node:assert/strict';

const mod = await import('../../src/core/audio.js');
const { createAudio, resolveMusic, resolveEntry, findKind, loopPosition, normalizeManifest } = mod;

const tick = (n = 6) => new Promise((r) => {
  let k = 0;
  const step = () => (++k >= n ? r() : setTimeout(step, 0));
  setTimeout(step, 0);
});

// ------------------------------------------------------------------ fake WebAudio
class Param {
  constructor(v) { this.value = v; this.log = []; }
  setValueAtTime(v, t) { this.log.push(['set', v, t]); this.value = v; }
  linearRampToValueAtTime(v, t) { this.log.push(['ramp', v, t]); this.target = v; }
  cancelScheduledValues(t) { this.log.push(['cancel', t]); }
  get final() { return this.target !== undefined ? this.target : this.value; }
}
class Node {
  constructor(ctx, kind) { this.ctx = ctx; this.kind = kind; this.out = []; }
  connect(d) { this.out.push(d); return d; }
  disconnect() { this.out = []; }
}
class Source extends Node {
  constructor(ctx) {
    super(ctx, 'source');
    this.playbackRate = new Param(1);
    this.loop = false; this.loopStart = 0; this.loopEnd = 0;
    this.started = null; this.stopped = null; this.onended = null;
    ctx.sources.push(this);
  }
  start(when = 0, offset = 0) { this.started = { when, offset }; }
  stop(when = 0) { this.stopped = { when }; }
  end() { if (this.onended) this.onended(); }
}
class FakeContext {
  constructor() {
    this.state = 'suspended'; this.currentTime = 0; this.sampleRate = 48000;
    this.destination = new Node(this, 'dest'); this.sources = []; this.gains = []; this.panners = [];
  }
  resume() { this.state = 'running'; return Promise.resolve(); }
  suspend() { this.state = 'suspended'; return Promise.resolve(); }
  createGain() { const g = new Node(this, 'gain'); g.gain = new Param(1); this.gains.push(g); return g; }
  createBufferSource() { return new Source(this); }
  createStereoPanner() { const p = new Node(this, 'pan'); p.pan = new Param(0); this.panners.push(p); return p; }
  createWaveShaper() { const w = new Node(this, 'shaper'); w.curve = null; w.oversample = 'none'; return w; }
  createBuffer(ch, len, sr) { return { numberOfChannels: ch, length: len, sampleRate: sr, duration: len / sr }; }
  decodeAudioData(ab) {
    const dur = new Float64Array(ab)[0];
    return Promise.resolve({ duration: dur, sampleRate: 48000, length: Math.round(dur * 48000), numberOfChannels: 2 });
  }
  addEventListener() {}
}

const DUR = { 'a.mp3': 100, 'b.mp3': 60, 'title.mp3': 120, 'cursor.wav': 0.045, 'hit.wav': 0.2, 'j.mp3': 2.0, 'amb.wav': 10 };
globalThis.fetch = async (url) => {
  const name = String(url).split('/').pop();
  if (!(name in DUR)) return { ok: false, status: 404, arrayBuffer: async () => new ArrayBuffer(8) };
  return { ok: true, status: 200, arrayBuffer: async () => new Float64Array([DUR[name]]).buffer };
};

const MANIFEST = {
  music: {
    a: { src: 'a.mp3', volume: 0.8, loopStart: 10, loopEnd: 90 },
    b: { src: 'b.mp3', volume: 1 },
    title: { src: 'title.mp3', volume: 1 },
    triumph: { src: null, fallback: 'title' },
    archive: { src: null, fallback: null },
  },
  sfx: {
    cursor: { src: 'cursor.wav', volume: 1 },
    hit: { src: ['hit.wav'], volume: 1, maxVoices: 3 },
    text_blip: { alias: 'cursor' },
  },
  jingles: { item_get: { src: 'j.mp3', duration: 2.0 } },
  ambience: { river: { src: 'amb.wav', widen: true } },
};

// ------------------------------------------------------------------ pure helpers
test('pure helpers: fallback chain, aliases, kinds, loop position', () => {
  const m = normalizeManifest(MANIFEST);
  assert.equal(resolveMusic(m, 'triumph').key, 'title');
  assert.equal(resolveMusic(m, 'archive'), null);
  assert.equal(resolveMusic(m, 'nope').unknown, true);
  assert.equal(resolveEntry(m, 'sfx', 'text_blip').id, 'cursor');
  assert.equal(resolveEntry(m, 'sfx', 'missing'), null);
  assert.deepEqual(findKind(m, 'jingle:item_get'), { kind: 'jingles', id: 'item_get' });
  assert.deepEqual(findKind(m, 'river'), { kind: 'ambience', id: 'river' });
  assert.equal(loopPosition(0, 95, 10, 90, true), 15);
  assert.equal(loopPosition(50, 10, 10, 90, true), 60);
  assert.equal(loopPosition(0, 95, 10, 90, false), 95);
});

// ------------------------------------------------------------------ no WebAudio
test('without WebAudio every call is a harmless no-op; jingles keep their timing', async () => {
  const a = createAudio({ timeScale: 0, autoUnlock: false });
  await a.init(MANIFEST);
  a.music('a'); a.pushMusic('b'); a.popMusic(); a.stopMusic();
  assert.equal(a.sfx('cursor'), null);
  a.ambience('river'); a.ambience(null);
  await a.jingle('item_get');
  await a.jingle('nope');
  await a.preload(['a', 'sfx:cursor', 'missing']);
  assert.deepEqual(a.setVolumes({ music: 2, sfx: -1 }), { master: 0.8, music: 1, sfx: 0, ambience: 0.6 });
  assert.equal(await a.unlock(), false);
  assert.equal(a.debugState().unlocked, false);
});

test('init without a manifest and without fetch does not throw', async () => {
  const saved = globalThis.fetch;
  globalThis.fetch = undefined;
  const a = createAudio({ autoUnlock: false, log: () => {} });
  await a.init();
  assert.deepEqual(Object.keys(a.manifest).sort(), ['ambience', 'jingles', 'music', 'sfx']);
  globalThis.fetch = saved;
});

// ------------------------------------------------------------------ fake WebAudio
async function setup() {
  let ctx;
  const a = createAudio({ autoUnlock: false, contextFactory: () => (ctx = new FakeContext()), log: () => {} });
  await a.init(MANIFEST);
  return { a, get ctx() { return ctx; } };
}
const playing = (ctx, name) => ctx.sources.filter((s) => s.buffer && s.buffer.duration === DUR[name] && s.started && !s.stopped);

test('music requested before unlock starts on unlock, with manifest loop points and volume', async () => {
  const h = await setup();
  h.a.music('a');
  assert.equal(h.ctx, undefined, 'no context before a gesture');
  await h.a.unlock();
  await tick();
  const [s] = playing(h.ctx, 'a.mp3');
  assert.ok(s, 'track a started');
  assert.equal(s.loop, true);
  assert.equal(s.loopStart, 10);
  assert.equal(s.loopEnd, 90);
  assert.equal(s.out[0].gain.final, 0.8, 'fades to manifest volume');
  h.a.music('a');
  await tick();
  assert.equal(playing(h.ctx, 'a.mp3').length, 1, 'same id again is a no-op');
});

test('crossfade, push/pop resume position, fallback and silence', async () => {
  const h = await setup();
  await h.a.unlock();
  h.a.music('a');
  await tick();
  const sa = playing(h.ctx, 'a.mp3')[0];
  h.ctx.currentTime = 95; // played 95 s from 0: inside the loop, position 10 + 5 = 15
  h.a.pushMusic('b', { fade: 0.3 });
  await tick();
  assert.ok(sa.stopped && Math.abs(sa.stopped.when - 95.32) < 0.01, 'field track stops after its fade');
  const sb = playing(h.ctx, 'b.mp3')[0];
  assert.ok(sb, 'battle track started');
  assert.equal(sb.out[0].gain.final, 1);
  assert.deepEqual(h.a.debugState().stack, ['a']);
  h.ctx.currentTime = 120;
  h.a.popMusic(0.6);
  await tick();
  assert.ok(sb.stopped, 'battle track stopped');
  const resumed = playing(h.ctx, 'a.mp3').filter((s) => s !== sa)[0];
  assert.ok(resumed, 'field track resumed');
  assert.ok(Math.abs(resumed.started.offset - 15.3) < 0.02, `resumed at saved position (${resumed.started.offset})`);
  assert.equal(h.a.currentMusic(), 'a');
  h.a.music('triumph');
  await tick();
  assert.equal(h.a.debugState().musicKey, 'title', 'null src falls back');
  h.a.music('archive');
  await tick();
  assert.equal(h.a.debugState().musicKey, null, 'null fallback is silence');
  assert.equal(h.a.currentMusic(), 'archive');
  h.a.music('does_not_exist');
  await tick();
});

test('sfx: alias, cooldown, per-id cap, global voice limit, pitch variance', async () => {
  let ctx;
  const a = createAudio({ autoUnlock: false, maxVoices: 4, contextFactory: () => (ctx = new FakeContext()), log: () => {} });
  await a.init(MANIFEST);
  await a.unlock();
  await a.preload(['sfx:cursor', 'sfx:hit']);
  await tick();
  assert.ok(a.sfx('text_blip'), 'alias plays');
  assert.equal(a.sfx('text_blip'), null, 'same id within 30 ms is skipped');
  ctx.currentTime += 0.05;
  assert.ok(a.sfx('cursor', { pitch: 1.5 }));
  const hits = [];
  for (let i = 0; i < 4; i++) { ctx.currentTime += 0.05; hits.push(a.sfx('hit', { vary: 0.1 })); }
  assert.ok(hits.every(Boolean));
  assert.ok(a.debugState().voices <= 4, 'global voice limit');
  const hitSources = ctx.sources.filter((s) => s.buffer && s.buffer.duration === 0.2);
  assert.ok(hitSources[0].stopped, 'oldest hit was stolen when the per-id cap (3) was reached');
  for (const s of hitSources) {
    const r = s.playbackRate.value;
    assert.ok(r >= 0.9 && r <= 1.1, `pitch variance within +-10% (${r})`);
  }
  assert.equal(a.sfx('missing'), null);
});

test('jingle pauses the music (DQ style) and resumes it afterwards', async () => {
  const h = await setup();
  await h.a.unlock();
  h.a.music('a');
  await tick();
  const sa = playing(h.ctx, 'a.mp3')[0];
  h.ctx.currentTime = 30;
  let done = false;
  const p = h.a.jingle('item_get').then(() => { done = true; });
  await tick();
  assert.ok(sa.stopped, 'music paused');
  const sj = h.ctx.sources.find((s) => s.buffer && s.buffer.duration === 2.0);
  assert.ok(sj && sj.started, 'jingle started');
  h.ctx.currentTime = 32.2;
  sj.end();
  await p;
  assert.ok(done);
  await tick();
  const resumed = playing(h.ctx, 'a.mp3').filter((s) => s !== sa)[0];
  assert.ok(resumed, 'music resumed after the jingle');
  assert.ok(Math.abs(resumed.started.offset - 30.12) < 0.02, `resumed where it paused (${resumed.started.offset})`);
});

test('ambience: widened loop starts two copies half a loop apart; null fades it out', async () => {
  const h = await setup();
  await h.a.unlock();
  h.a.ambience('river');
  await tick();
  const src = h.ctx.sources.filter((s) => s.buffer && s.buffer.duration === 10);
  assert.equal(src.length, 2);
  assert.ok(src.every((s) => s.loop));
  assert.deepEqual(src.map((s) => s.started.offset).sort((x, y) => x - y), [0, 5]);
  h.a.ambience('river');
  await tick();
  assert.equal(h.ctx.sources.filter((s) => s.buffer && s.buffer.duration === 10).length, 2, 'same id is a no-op');
  h.a.ambience(null, { fade: 1 });
  assert.ok(src.every((s) => s.stopped));
});

test('volumes clamp and apply to the buses', async () => {
  const h = await setup();
  await h.a.unlock();
  const v = h.a.setVolumes({ master: 0.5, music: 1.5, sfx: 0.25, ambience: NaN });
  assert.deepEqual(v, { master: 0.5, music: 1, sfx: 0.25, ambience: 0.6 });
  assert.deepEqual(h.a.getVolumes(), v);
  h.a.setMuted(true);
  h.a.setMuted(false);
  h.a.stopAll();
});

// ------------------------------------------------------------------ per-episode sfx packs
test('sfx packs: boot loads core only; a pack loads on demand; a missing id or pack never throws or logs an error', async () => {
  const fetched = [];
  const savedFetch = globalThis.fetch;
  const errs = [];
  const savedErr = console.error;
  console.error = (...a) => errs.push(a);
  DUR['pk.wav'] = 0.3; DUR['pk2.wav'] = 0.4;
  globalThis.fetch = async (url) => { fetched.push(String(url).split('/').pop()); return savedFetch(url); };
  const man = JSON.parse(JSON.stringify(MANIFEST));
  man.sfx.big = { src: 'pk.wav', volume: 1, pack: 'ep3', fallback: 'cursor' };
  man.sfx.gone = { src: 'missing_pack_file.wav', volume: 1, pack: 'ep2' };
  man.sfx.cursor.pack = 'core';
  man.packs = { ep3: { sfx: ['big'] }, ep2: { sfx: ['gone'] } };
  let ctx;
  const a = createAudio({ autoUnlock: false, contextFactory: () => (ctx = new FakeContext()), log: () => {} });
  await a.init(man);
  await tick();
  assert.ok(!fetched.includes('pk.wav'), 'an ep3 sfx is NOT fetched at boot');
  await a.unlock();
  await tick();
  assert.ok(fetched.includes('cursor.wav'), 'core sfx are decoded at unlock');
  assert.ok(!fetched.includes('pk.wav'), 'an ep3 sfx is not fetched at unlock either');
  // before the pack arrives: no throw, no handle, the fallback plays instead
  assert.doesNotThrow(() => a.sfx('big'));
  await tick();
  assert.ok(fetched.includes('pk.wav'), 'the first sound from an unknown pack requests the whole pack');
  assert.ok(a.sfx('big'), 'once loaded it plays');
  // an explicit pack load, a pack that fails to load, an unknown pack and an unknown id
  await a.preload(['pack:ep2', 'pack:nope']);
  assert.doesNotThrow(() => a.sfx('gone'));
  assert.equal(a.sfx('gone'), null, 'a pack file that 404s is skipped quietly');
  assert.equal(await a.loadPack('core'), undefined);
  assert.equal(a.sfx('not_in_the_manifest'), null);
  assert.equal(errs.length, 0, 'nothing is logged with console.error');
  console.error = savedErr;
  globalThis.fetch = savedFetch;
});
