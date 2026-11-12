// E7-scene-ui (EPISODE7_PLAN 5.2): the cutscene helpers E7-story's scenes call only when present (`name in s`): s.frostBlot(who),
// s.frostNames(ids, level) and s.actorAlpha(id, alpha, frames). Pure node tests over a field-shaped shell and the real Cutscene: the
// helpers are on the API while a scene runs; the frost row climbs a pip at a time with the pip sound and goes when every name thaws;
// a sprite's alpha eases and is put back when the scene ends; the blot says "..." with a soft `ice` and frosts the dialog box.
import test from 'node:test';
import assert from 'node:assert/strict';
import { Cutscene } from '../../src/world/cutscene.js';
import { registerStory } from '../../src/game/story.js';

const scene = await import('../../src/data/ep7/scene.js');
scene.register();

/** A renderer that records every call (drawWindow and the pips need only that the calls go through). */
function fakeR(calls) {
  const ctx = new Proxy({}, { get: (t, k) => (k in t ? t[k] : () => {}), set: (t, k, v) => { t[k] = v; return true; } });
  return new Proxy({ ctx, assets: { has: () => false }, settings: {}, measure: (t) => String(t).length * 5, withAlpha: (a, fn) => fn(), wrap: (t) => [String(t)] },
    { get: (t, k) => (k in t ? t[k] : (...a) => { calls.push(k); return { width: 0 }; }) });
}
function shell() {
  const sfx = [], said = [];
  let frame = 0;
  const actors = [{ id: 'mira', kind: 'party', alpha: 1 }, { id: 'bram', kind: 'party', alpha: 1 }];
  const dlg = { name: 'dialog', rect: { x: 8, y: 150, w: 368, h: 58 }, draw() {} };
  const tick = () => new Promise((ok) => setImmediate(ok));
  const engine = { audio: { sfx: (id, o) => sfx.push([id, o && o.volume]) }, waitFrames: async (n) => { frame += n; await tick(); }, stack: [] };
  const field = { engine, actors, game: { party: [{ id: 'hero', name: 'Arden' }, { id: 'mira', name: 'Mira' }, { id: 'bram', name: 'Bram' }], flags: {} },
    map: { id: 'test', mark: () => null }, actorById: (id) => actors.find((a) => a.id === id) || null,
    async dialog(o) { said.push(o.text); engine.stack.push(dlg); for (let i = 0; i < 10; i++) await tick(); dlg.draw(fakeR([])); engine.stack.pop(); return 0; },
    drawKeptBar() {}, lockInput() {}, unlockInput() {} };
  return { engine, field, sfx, said, actors, dlg, frames: () => frame };
}

test('the helpers are on the cutscene API while a scene runs; the frost row climbs a pip at a time and leaves when every name thaws', async () => {
  const S = shell();
  const seen = {};
  registerStory({ scenes: { _ep7_helpers_a: async (s) => {
    seen.has = ['frostBlot', 'frostNames', 'actorAlpha'].map((k) => k in s);
    await s.actorAlpha('mira', 0.3, 12);
    seen.alpha = S.actors[0].alpha;
    await s.frostNames(['mira', 'bram'], 3);
    seen.shown = { ...S.field.frost7.shown };
    // the strip draws through the field's last screen pass with the battle's Rime drawer
    const calls = [];
    const r = fakeR(calls);
    try { S.field.drawKeptBar(r); } catch (e) { seen.drawErr = String(e); }
    seen.drew = calls.length;
    await s.frostNames(['mira', 'bram'], 0);
    seen.after = S.field.frost7;
  } } });
  await new Cutscene(S.field).run('_ep7_helpers_a');
  assert.deepEqual(seen.has, [true, true, true]);
  assert.ok(Math.abs(seen.alpha - 0.3) < 1e-9, 'Mira faded to 0.3');
  assert.deepEqual(seen.shown, { mira: 3, bram: 3 });
  const pips = S.sfx.map(([id]) => id).filter((id) => /^rime_bite/.test(id));
  assert.deepEqual(pips, ['rime_bite', 'rime_bite_2', 'rime_bite_3'], 'the pip sound a step up each pip');
  assert.ok(seen.drew > 20, `the strip drew (${seen.drew} calls${seen.drawErr ? ', ' + seen.drawErr : ''})`);
  assert.equal(seen.after, null, 'the row goes when every name thaws');
  assert.equal(S.actors[0].alpha, 1, 'a faded sprite is put back when the scene ends');
});

test('frostBlot: "..." under a frost texture with a soft ice, on the box the dialog opened', async () => {
  const S = shell();
  registerStory({ scenes: { _ep7_helpers_b: async (s) => { await s.frostBlot('keeper_mother_m'); } } });
  await new Cutscene(S.field).run('_ep7_helpers_b');
  assert.deepEqual(S.said, ['...']);
  assert.deepEqual(S.sfx[0], ['ice', 0.5]);
  assert.equal(S.dlg.__blot7, true, 'the dialog box drew the frost');
});
