// The update flow (src/core/swUpdate.js and the handler build_pwa.py writes into sw.js). Fakes here; qa/pwa/pwa.py --only update
// drives the same flow in a real browser with two versions of the worker.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { NEXT, read } from './_lib.mjs';
import { ASK, REFUSED, KEY, KEEP_OUT, UPDATE_READY, UPDATE_TABS, UPDATE_DONE, quiet, makeUpdater } from '../../src/core/swUpdate.js';

function rig({ scene = 'title', storage = {}, noStorage = false } = {}) {
  const posted = [], flashes = [], listeners = {};
  let reloads = 0;
  const bootScene = { name: '_boot' };
  const title = { name: 'title', busy: false, guard: null, idle: 5 };
  const field = { name: 'field' };
  const engine = {
    bootScene, stack: [], flashes,
    toasts: { flash: (text) => flashes.push(text) },
    get scene() { return this.stack[this.stack.length - 1] || null; },
  };
  engine.stack = [{ boot: bootScene, title, field, none: null }[scene]].filter(Boolean);
  const timers = [];
  const env = {
    navigator: { serviceWorker: { controller: {}, addEventListener: (k, f) => { listeners[k] = f; } } },
    get sessionStorage() {
      if (noStorage) throw new Error('blocked');
      return { getItem: (k) => storage[k] ?? null, setItem: (k, v) => { storage[k] = v; } };
    },
    location: { reload: () => { reloads++; } },
    setInterval: (f) => { timers.push(f); return timers.length; },
    clearInterval: (id) => { timers[id - 1] = null; },
    setTimeout: (f) => { timers.push(f); return timers.length; },
    clearTimeout: (id) => { if (id) timers[id - 1] = null; },
  };
  const waiting = { postMessage: (m) => posted.push(m) };
  const reg = { waiting };
  const track = makeUpdater(engine, env);
  const tick = () => { if (timers[0]) timers[0](); };
  return { engine, env, title, field, reg, track, tick, posted, flashes, storage, timers, fire: (k, e) => listeners[k](e), reloads: () => reloads };
}

test('quiet: only the loading screen or an idle title with nothing open', () => {
  const t = (o) => ({ name: 'title', idle: 2, ...o });
  assert.equal(quiet({ scene: null, stack: [] }), true);
  const boot = {};
  assert.equal(quiet({ scene: boot, bootScene: boot, stack: [boot] }), true);
  assert.equal(quiet({ scene: t(), stack: [1] }), true);
  assert.equal(quiet({ scene: t({ busy: true }), stack: [1] }), false, 'a fade or the Continue page in progress');
  assert.equal(quiet({ scene: t({ guard: {} }), stack: [1] }), false, 'the save guard is asking');
  assert.equal(quiet({ scene: t({ idle: 0.2 }), stack: [1] }), false, 'the player is using the menu');
  assert.equal(quiet({ scene: t(), stack: [1, 2] }), false, 'anything under the title');
  for (const name of ['field', 'battle', 'menu', 'prologue', 'loadGame', 'config', 'nameEntry']) assert.equal(quiet({ scene: { name, idle: 9 }, stack: [1] }), false, name);
});

test('idle title: asks once, locks the menu, reloads once on controllerchange, stamps the loop guard', () => {
  const r = rig();
  r.track(r.reg);
  assert.deepEqual(r.posted, [ASK]);
  assert.equal(r.title.busy, true, 'no press lands between the ask and the reload');
  r.tick();
  assert.equal(r.posted.length, 1, 'one ask at a time');
  r.fire('controllerchange');
  r.fire('controllerchange');
  assert.equal(r.reloads(), 1);
  assert.ok(Number(r.storage[KEY]) > 0);
});

test('mid-game: never asks, never reloads, says when it will land, once; the title then applies it', () => {
  const r = rig({ scene: 'field' });
  r.track(r.reg);
  r.tick(); r.tick();
  assert.deepEqual(r.posted, []);
  assert.deepEqual(r.flashes, [UPDATE_READY]);
  r.engine.stack = [r.title];
  r.tick();
  assert.deepEqual(r.posted, [ASK]);
  r.fire('controllerchange');
  assert.equal(r.reloads(), 1);
});

test('a controllerchange this tab did not ask for never reloads it', () => {
  const r = rig({ scene: 'field' });
  r.track(r.reg);
  r.fire('controllerchange');
  assert.equal(r.reloads(), 0);
  const fresh = rig();
  fresh.fire('controllerchange');   // the first install's clients.claim, nothing tracked
  assert.equal(fresh.reloads(), 0);
});

test('another tab open: the worker refuses, the title is freed, the toast says why, no reload', () => {
  const r = rig();
  r.track(r.reg);
  r.fire('message', { data: REFUSED });
  assert.equal(r.title.busy, false);
  assert.deepEqual(r.flashes, [UPDATE_TABS]);
  r.tick();
  assert.equal(r.posted.length, 2, 'asks again: closing the other tab lets it through');
  r.fire('message', { data: REFUSED });
  assert.deepEqual(r.flashes, [UPDATE_TABS], 'said once');
  assert.equal(r.reloads(), 0);
});

test('loop guard: no second reload inside the window, in this tab; it applies again after', () => {
  const r = rig({ storage: { [KEY]: String(Date.now() - 1000) } });
  r.track(r.reg);
  r.tick();
  assert.deepEqual(r.posted, []);
  assert.deepEqual(r.flashes, [UPDATE_READY]);
  r.storage[KEY] = String(Date.now() - KEEP_OUT - 1000);
  r.tick();
  assert.deepEqual(r.posted, [ASK]);
});

test('no sessionStorage, no reload: the guard fails closed and next launch applies it', () => {
  const r = rig({ noStorage: true });
  r.track(r.reg);
  r.tick();
  assert.deepEqual(r.posted, []);
});

test('a worker that never answers: the title is freed, no reload, the flow stops', () => {
  const r = rig();
  r.track(r.reg);
  r.timers[r.timers.length - 1]();   // the no-answer timeout
  assert.equal(r.title.busy, false);
  assert.deepEqual(r.flashes, [UPDATE_READY]);
  assert.equal(r.timers[0], null, 'polling stopped');
  r.fire('controllerchange');
  assert.equal(r.reloads(), 0);
});

test('no controller (a hard reload) does nothing; a waiting worker that has gone stops the poll', () => {
  const r = rig();
  r.env.navigator.serviceWorker.controller = null;
  r.track(r.reg);
  assert.deepEqual(r.posted, []);
  r.reg.waiting = null;
  r.tick();
  assert.equal(r.timers[0], null);
});

test('greet: "Game updated." only on the load right after an update reload', () => {
  const a = rig({ storage: { [KEY]: String(Date.now() - 5000) } });
  a.track.greet();
  assert.deepEqual(a.flashes, [UPDATE_DONE]);
  const b = rig();
  b.track.greet();
  assert.deepEqual(b.flashes, []);
  const c = rig({ noStorage: true });
  c.track.greet();
  assert.deepEqual(c.flashes, []);
});

test('toast copy names what happens, and no build says "restart" any more', () => {
  for (const t of [UPDATE_READY, UPDATE_TABS, UPDATE_DONE]) assert.ok(t.length * 6 < 370, `${t} fits the 384 canvas`);
  assert.doesNotMatch(read('src/main.js'), /restart to apply/);
});

// ---------------------------------------------------------------- the generated worker (temp path; the repo's sw.js is rebuilt at ship)
function generated(t) {
  const out = path.join(os.tmpdir(), `lq-sw-${process.pid}.js`);
  const r = spawnSync('python', [path.join(NEXT, 'tools', 'pwa', 'build_pwa.py'), '--out', out], { encoding: 'utf8', timeout: 60000 });
  if (r.error || r.status !== 0) { t.diagnostic('build_pwa.py could not run; generated worker not checked'); return null; }
  const text = fs.readFileSync(out, 'utf8');
  fs.unlinkSync(out);
  return text;
}

/** Run only the update handler of a generated worker against a fake `self`. */
async function askWorker(text, tabs, data = ASK) {
  const a = text.indexOf("self.addEventListener('message'");
  const code = text.slice(a, text.indexOf('// build_pwa:end'));
  let handler = null, skipped = 0, pending = null;
  const replies = [];
  const self = {
    addEventListener: (k, f) => { if (k === 'message') handler = f; },
    clients: { matchAll: async (o) => { assert.deepEqual(o, { type: 'window', includeUncontrolled: true }); return Array(tabs).fill({}); } },
    skipWaiting: async () => { skipped++; },
  };
  new Function('self', code)(self);
  handler({ data, source: { postMessage: (m) => replies.push(m) }, waitUntil: (p) => { pending = p; } });
  await pending;
  return { skipped, replies };
}

test('generated worker: takes over only for the one tab open, refuses otherwise, ignores anything else', async (t) => {
  const text = generated(t);
  if (!text) return;
  assert.deepEqual(await askWorker(text, 1), { skipped: 1, replies: [] });
  assert.deepEqual(await askWorker(text, 2), { skipped: 0, replies: [REFUSED] });
  assert.deepEqual(await askWorker(text, 3), { skipped: 0, replies: [REFUSED] });
  assert.deepEqual(await askWorker(text, 1, 'something else'), { skipped: 0, replies: [] });
  assert.match(text, /if \(!self\.registration\.active\) self\.skipWaiting\(\);/, 'a later version still waits on its own');
  assert.match(text, /'src\/core\/swUpdate\.js'/, 'the module is in the shell');
});

test('--out leaves the repo alone', (t) => {
  const before = read('sw.js');
  if (!generated(t)) return;
  assert.equal(read('sw.js'), before);
});
