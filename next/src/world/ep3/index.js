// Episode 3 on the field (E3-world, EPISODE3_PLAN 5): the one entry the field imports, lazily, the first time a map
// whose id matches field.js EP3_MAP loads. Kept out of the first download (docs/WORLD.md section 1f).
//
//   attach(field)   idempotent: registers the new event types and gate sprites, adds field.quench and field.ep3fx,
//                   and wraps this field's glass.reset / update / markDirty / drawBeams / drawFlares, collectLights,
//                   useDoor and lighting.draw so the systems run in the same places as Episode 2's silverglass.

import { EXT, GATE_SPRITES, COUNTING_GATES, INTERACT_TYPES } from '../events.js';
import { inspectBoxes } from '../../game/story.js';
import { registerMap } from '../maps.js';
import { FIELD_LOOK } from '../actors.js';
import { TILE } from '../tilemap.js';
import { Quench, basinFrame } from './quench.js';
import { Ep3Fx } from './fx.js';
import { TEST_FORGE, TEST_FORGE_DARK } from './_testforge.js';

Object.assign(GATE_SPRITES, {
  hot_grate: ['hot_grate_closed', 'hot_grate_open'],
  ore_lift: ['ore_lift_closed', 'ore_lift_open'],
  bell_gate: ['bell_gate_closed', 'bell_gate_open'],
});
COUNTING_GATES.add('bell_gate');
// CRITIQUE_5 #2 (EPISODE3_PLAN 4, phone rule): Episode 3's field foes never camouflage on ash, steel or copper. A 1 px
// outline in each material's darkest tone, lit warm along the top edge (the forge glow), on top of the ground shadow.
const WARM = '#ffc477', HOT = '#ffe2a8';
Object.assign(FIELD_LOOK, {
  cinder_hound: { outline: '#0e0a12', rim: HOT },
  cinder_beetle: { outline: '#1a0804', rim: WARM },
  slag_slime: { outline: '#1e0a04', rim: HOT },
  ashbound_miner: { outline: '#0c0a14', rim: HOT },
  furnace_construct: { outline: '#1a0c04', rim: HOT },
  soot_phantom: { outline: '#08060e', rim: HOT },
  forge_defender: { outline: '#160a04', rim: HOT },
});
INTERACT_TYPES.add('sluice');
registerMap(TEST_FORGE);
registerMap(TEST_FORGE_DARK);

const prop = (field, ent, t, state) => {
  const map = field.map;
  if (!t || !map.db.objects[t]) { field.warnOnce('ep3prop:' + t, `unknown object "${t}" (${ent.id})`); return null; }
  const p = map.addProp({ t, x: ent.x, y: ent.y, state: state || 0, id: ent.id, kind: 'event', solid: true });
  if (!p.draw) { map.removeProp(p); return null; }
  ent.prop = p;
  return p;
};

EXT.spout = { create(field, ent) { prop(field, ent, ent.ev.sprite || 'spout_wall', 0); } };
EXT.sluice = {
  create(field, ent) { ent.state = ent.ev.state ? 1 : 0; prop(field, ent, ent.ev.sprite || 'sluice', ent.state); },
  interact: (field, ent) => turnSluice(field, ent),
};
EXT.basin = {
  create(field, ent) {
    const ev = ent.ev, g = field.game;
    const latched = !!(ev.flag && g.flags[ev.flag]) || !!(ev.latch && g.opened[`${field.map.id}:${ent.id}`]);
    ent.state = latched ? 'on' : 'off';
    ent.data.latched = latched; ent.data.everFull = latched;
    const p = prop(field, ent, ev.sprite || 'basin', 0);
    if (p) basinFrame(field.map, p, latched, field.engine.settings && field.engine.settings.reduceMotion);
  },
};

/**
 * Confirm on a sluice: a fixed one only reads its text; a turnable one flips '/' and the backslash (sluice_turn), lifts a
 * pixel, and the water is traced again at once. Its `text` is read the first time that line is met in the save.
 */
export async function turnSluice(field, ent) {
  const ev = ent.ev, engine = field.engine, g = field.game;
  if (ev.fixed) { if (ev.text) await field.showBoxes(inspectBoxes(ev.text, field.hasFlag)); return false; }
  if (ev.text && g.counters && !g.counters[`read:${ev.text}`]) {
    g.counters[`read:${ev.text}`] = 1;
    await field.showBoxes(inspectBoxes(ev.text, field.hasFlag));
    if (field.dead) return false;
  }
  ent.state = ent.state ? 0 : 1;
  engine.audio.sfx('sluice_turn');
  if (ent.prop) {
    field.map.setPropState(ent.prop, ent.state);
    ent.prop.offY = -1;
    engine.after(4, () => { if (ent.prop) ent.prop.offY = 0; });
  }
  if (field.particles) field.particles.sparkle(ent.x * TILE + 8, ent.y * TILE + 2, 3, '#bfeaff');
  if (field.quench) { field.quench.recompute(); field.quench.sig = field.quench.signature(); }
  await engine.waitFrames(8);
  return true;
}

/** A lift: the rumble, a short shake, then a plain fade to the other floor (a landmark like any map-to-map door). */
async function liftDoor(field, ent) {
  const e = field.engine, to = ent.ev.to;
  field.lockInput();
  try {
    e.audio.sfx('lift_rumble');
    if (e.renderer.shake) e.renderer.shake(1, 26);
    await e.waitFrames(22);
  } finally { field.unlockInput(); }
  if (field.dead) return;
  await field.warpTo(to[0], to[1], to[2], to[3] || field.leader.dir, 'lift');
}

export function attach(field) {
  if (!field.quench) field.quench = new Quench(field);
  if (!field.ep3fx) field.ep3fx = new Ep3Fx(field);
  const q = field.quench, fx = field.ep3fx;
  const wrap = (obj, name, fn) => {
    if (!obj || (obj[name] && obj[name].ep3)) return;
    const orig = obj[name].bind(obj);
    const w = function (...a) { return fn(orig, ...a); };
    w.ep3 = true;
    obj[name] = w;
  };
  wrap(field.glass, 'reset', (o) => { o(); q.reset(); fx.reset(); });
  wrap(field.glass, 'update', (o) => { o(); q.update(); fx.update(); });
  wrap(field.glass, 'markDirty', (o) => { o(); q.markDirty(); if (field.map && field.map.gated && field.map.gated.length) q.gridDirty = true; });
  wrap(field.glass, 'drawBeams', (o, r, t) => { q.drawLow(r, t); o(r, t); });
  wrap(field.glass, 'drawFlares', (o, r, t) => { o(r, t); q.drawHigh(r, t); fx.draw(r); });
  wrap(field, 'collectLights', (o) => { const out = o(); if (field.lighting.dark > 0.01) out.push(...q.lights()); return out; });
  wrap(field, 'useDoor', (o, ent) => (ent && ent.ev.kind === 'lift' && ent.ev.to ? liftDoor(field, ent) : o(ent)));
  wrap(field.lighting, 'draw', (o, r, ...a) => { o(r, ...a); fx.drawScreen(r); });
  wrap(field, 'debugState', (o) => ({ ...o(), quench: q.debugState() }));
  const D = typeof window !== 'undefined' ? window.LQ_DEBUG : null;
  if (D && !D.commands().includes('quench')) {
    const cur = () => { const s = field.engine.scene; return s && s.name === 'field' && s.quench ? s : null; };
    D.register('quench', () => { const f = cur(); return f ? f.quench.debugState() : null; });
    D.register('turnSluice', async (id) => {
      const f = cur(); const ent = f && f.entities.get(id);
      if (!ent || ent.type !== 'sluice') return null;
      await turnSluice(f, ent);
      return f.quench.debugState();
    });
  }
  return q;
}
