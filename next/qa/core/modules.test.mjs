// Every core module must import cleanly in node (no DOM access at module top level), so pure modules
// and tests can import anything from src/core without a browser.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const NEXT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const CORE = path.join(NEXT, 'src', 'core');

test('all src/core modules import in node', async () => {
  for (const f of fs.readdirSync(CORE).filter((x) => x.endsWith('.js'))) {
    await assert.doesNotReject(import(new URL(`../../src/core/${f}`, import.meta.url).href), `import ${f}`);
  }
});

test('engine exports the documented API surface', async () => {
  const m = await import('../../src/core/engine.js');
  assert.equal(typeof m.Engine, 'function');
  assert.equal(m.STEP, 1 / 60);
  for (const k of ['fade', 'dither', 'iris', 'mosaic', 'wipe']) assert.equal(typeof m.TRANSITIONS[k], 'function', k);
  const proto = m.Engine.prototype;
  for (const k of ['push', 'pop', 'replace', 'reset', 'pushAwait', 'fadeTo', 'registerScene', 'waitFrames', 'wait', 'after', 'setSetting', 'on', 'off', 'emit', 'step', 'render', 'advance', 'boot', 'perfStats']) {
    assert.equal(typeof proto[k], 'function', `Engine#${k}`);
  }
});

test('safeAudio: missing or throwing audio never breaks the game', async () => {
  const { safeAudio } = await import('../../src/core/engine.js');
  const stub = safeAudio(null);
  assert.equal(stub.sfx('cursor'), null);
  assert.ok(stub.jingle('item_get') instanceof Promise);
  const bad = safeAudio({ sfx() { throw new Error('boom'); }, jingle() { return Promise.reject(new Error('x')); } });
  const warn = console.warn; console.warn = () => {};
  try {
    assert.equal(bad.sfx('x'), null);
    assert.equal(await bad.jingle('y'), null);
  } finally { console.warn = warn; }
});

test('index.html: one canvas, module entry, no extra UI markup', () => {
  const html = fs.readFileSync(path.join(NEXT, 'index.html'), 'utf8');
  assert.match(html, /<canvas id="game"/);
  assert.match(html, /<script type="module" src="src\/main\.js"><\/script>/);
  assert.match(html, /viewport-fit=cover/);
  assert.match(html, /touch-action:\s*none/);
  assert.equal((html.match(/<(button|input|select|header|nav|section|article|aside|footer)\b/g) || []).length, 0);
  assert.ok(!/https?:\/\//.test(html.replace(/<meta[^>]*>/g, '')), 'no external URLs');
});

test('no em dashes in engine code, dev scenes, QA or docs', () => {
  const files = [];
  const walk = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) { if (e.name !== 'out') walk(p); } else files.push(p); } };
  walk(CORE); walk(path.join(NEXT, 'qa', 'core'));
  for (const f of ['index.html', 'src/main.js', 'qa/run.mjs', 'qa/shots.py', 'qa/shots.json', 'docs/ENGINE_API.md']) if (fs.existsSync(path.join(NEXT, f))) files.push(path.join(NEXT, f));
  for (const f of fs.readdirSync(path.join(NEXT, 'src', 'scenes'))) if (f.startsWith('_dev')) files.push(path.join(NEXT, 'src', 'scenes', f));
  for (const f of files) {
    if (path.basename(f) === 'audio.js') continue; // owned by W1-audio
    assert.ok(!fs.readFileSync(f, 'utf8').includes(String.fromCharCode(0x2014)), `em dash in ${path.relative(NEXT, f)}`);
  }
});
