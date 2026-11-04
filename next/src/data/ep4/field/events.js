// Episode 4's field event types and the tide system's attachment (E4-world, docs/EPISODE4_PLAN.md 5.1 and 5.2).
// Imported by ../world.js when the ep4 pack registers; never in the first download.
//
//   tidewheel  { basin?, sprite? ('tide_wheel'), crank? (true: needs lock_crank), text?, lockedText? }   confirm: turn
//   tidepost   { basin?, sprite? ('tide_post'), text? ('ep4_tide_post') }                              its frame = the level
//   pontoon    { basin?, rides? ([1, 2]), sprite? ('pontoon' | 'book_crate'), text? }                    floats, grounds, sinks
//   forgery    { basin?, h?, target?, sprite? ('seal_paper'), text? ('ep4_papered_door') }               washed for good
//   floodgate  { basin?, at?, latch?, flag?, script?, to?, w? (2), sprite? ('floodgate'), target?, text? }  opens on water
//   door       { kind: 'boat', sprite? ('boat'), to }                                                    a ferry crossing
//
// attach(field) is idempotent per field instance: it adds field.tide and wraps this field's glass.reset / update /
// markDirty / drawBeams / drawFlares, collectLights, useDoor, hasFlag and debugState, the way Episode 3's quench attaches
// (src/world/ep3/index.js). Every create() of the types above attaches first, and ../world.js attaches every field the
// engine enters, so boat doors work on maps without a wheel.

import { EXT, INTERACT_TYPES, GATE_SPRITES, COUNTING_GATES } from '../../../world/events.js';
import { FIELD_LOOK } from '../../../world/actors.js';
import { TINTS } from '../../../world/lighting.js';
import { inspectBoxes } from '../../../game/story.js';
import { Tide, closedSprite, openSprite } from './system.js';
import { tideFlag, isTideFlag, levelsOf } from './tide.js';

// E4-tiles' door pairs (assets/tiles/ep4_tiles.json): the canal door a seal covers, the floodgate as an ordinary gate,
// the Sunken Seal door to the Drowned Throne, the Petition Gate with its three sockets (frames 0 to 3).
Object.assign(GATE_SPRITES, {
  door_canal: ['door_canal_closed', 'door_canal_open'],
  floodgate: ['floodgate_closed', 'floodgate_open'],
  door_seal: ['door_seal_closed', 'door_seal_open'],
  petition_gate: ['petition_gate_closed', 'petition_gate_open'],
});
COUNTING_GATES.add('petition_gate');
for (const t of ['tidewheel', 'tidepost', 'forgery', 'floodgate']) INTERACT_TYPES.add(t);

// plan 4 (phone rule): field foes never camouflage on wet stone. A dark outline and a pale water rim along the top.
const RIM = '#bfeaff';
Object.assign(FIELD_LOOK, {
  flood_hound: { outline: '#0e1216', rim: RIM },
  lockjaw_crab: { outline: '#1a0a08', rim: RIM },
  ink_bloom: { outline: '#0c0a18', rim: RIM },
  drowned_watch: { outline: '#0a1014', rim: RIM },
  gutter_phantom: { outline: '#08060e', rim: RIM },
  blank_decree: { outline: '#2a2018', rim: RIM },
  waterlogged_sentinel: { outline: '#0a1012', rim: RIM },
  barrister: { outline: '#0c0a10', rim: RIM },
});

/**
 * Valewyn's rain grey (E4-tiles' measure, tools/art/tiles/out/ep4/flood_grey_check.json: 23% darker than no tint on the
 * plaza phone crop, saturation 0.31 to 0.24). A cool grey-green multiply; lamps drawn as lights stay warm.
 */
export const FLOOD_GREY = { color: '#93a5a2', alpha: 0.62, desat: 0.38 };
if (!TINTS.flood_grey) TINTS.flood_grey = FLOOD_GREY;

const prop = (field, ent, t, state, solid) => {
  const map = field.map;
  if (!t || !map.db.objects || !map.db.objects[t]) { field.warnOnce('ep4prop:' + t, `unknown object "${t}" (${ent.id})`); return null; }
  const p = map.addProp({ t, x: ent.x, y: ent.y, state: state || 0, id: ent.id, kind: 'event', solid });
  if (!p.draw) { map.removeProp(p); return null; }
  ent.prop = p;
  return p;
};
const levelHere = (field, ent) => {
  const t = field.tide;
  const lv = t && t.active ? t.levels : levelsOf(field.map.mod, {});
  const b = ent.ev.basin || (t && t.m && t.m.basinOfCell(ent.y * t.m.W + ent.x));
  return b != null && lv[b] != null ? lv[b] : 0;
};
const readText = async (field, id) => { if (id) await field.showBoxes(inspectBoxes(id, field.hasFlag)); };

EXT.tidewheel = {
  create(field, ent) { attach(field); prop(field, ent, ent.ev.sprite || 'tide_wheel', levelHere(field, ent)); },
  interact: (field, ent) => (field.tide ? field.tide.turn(ent) : null),
};
EXT.tidepost = {
  create(field, ent) { attach(field); prop(field, ent, ent.ev.sprite || 'tide_post', levelHere(field, ent)); },
  interact: (field, ent) => readText(field, ent.ev.text || 'ep4_tide_post'),
};
EXT.pontoon = {
  // collision comes from the tide's override (float none, ground solid, sunk water), never the prop
  create(field, ent) { attach(field); ent.state = null; prop(field, ent, ent.ev.sprite || 'pontoon', 0, false); },
};
EXT.forgery = {
  create(field, ent) {
    attach(field);
    const g = field.game, washed = !!(g.washed && g.washed[field.map.id] && g.washed[field.map.id].includes(ent.id));
    ent.state = washed ? 'on' : 'off';
    ent.data.concealed = washed;
    prop(field, ent, ent.ev.sprite || 'seal_paper', washed ? 2 : 0, false);
  },
  interact: (field, ent) => readText(field, ent.ev.text || 'ep4_papered_door'),
};
EXT.floodgate = {
  create(field, ent) {
    attach(field);
    ent.state = 'off';
    ent.data.concealed = false;
    prop(field, ent, closedSprite(ent.ev), 0, false);
  },
  interact: (field, ent) => readText(field, ent.ev.text || 'ep4_floodgate'),
};

/** A boat door (plan 5.2): Episode 3's lift with a boat and the sound of water, then a plain fade to the other side. */
async function boatDoor(field, ent) {
  const e = field.engine, to = ent.ev.to;
  field.lockInput();
  try {
    e.audio.sfx('water_rise');
    if (ent.prop) { ent.prop.offY = 1; e.after(6, () => { if (ent.prop) ent.prop.offY = 0; }); }
    await e.waitFrames(20);
  } finally { field.unlockInput(); }
  if (field.dead) return;
  await field.warpTo(to[0], to[1], to[2], to[3] || field.leader.dir, 'door');
}

/** Boats without a sprite get the boat; boats bob (the field's own props do not animate frames). */
function dressBoats(field) {
  for (const ent of field.entities.values()) {
    if (ent.type !== 'door' || ent.ev.kind !== 'boat' || !ent.present) continue;
    if (!ent.prop && field.map.db.objects && field.map.db.objects.boat) prop(field, ent, 'boat', 0, false);
  }
}
function bobBoats(field) {
  if (field.frame % 30 !== 0 || (field.engine.settings && field.engine.settings.reduceMotion)) return;
  const k = (field.frame / 30) & 1;
  for (const ent of field.entities.values()) if (ent.type === 'door' && ent.ev.kind === 'boat' && ent.prop && ent.prop.t === 'boat') field.map.setPropState(ent.prop, k);
}

export function attach(field) {
  if (!field || field.tide) return field && field.tide;
  const t = field.tide = new Tide(field);
  const wrap = (obj, name, fn) => {
    if (!obj || typeof obj[name] !== 'function' || obj[name].ep4) return;
    const orig = obj[name].bind(obj);
    const w = function (...a) { return fn(orig, ...a); };
    w.ep4 = true;
    obj[name] = w;
  };
  wrap(field.glass, 'reset', (o) => { o(); t.reset(); if (field.map && field.entities) dressBoats(field); });
  wrap(field.glass, 'update', (o) => { o(); t.update(); bobBoats(field); });
  wrap(field.glass, 'markDirty', (o) => { o(); t.markDirty(); });
  wrap(field.glass, 'drawBeams', (o, r, tm) => { t.drawLow(r, tm); o(r, tm); });
  wrap(field.glass, 'drawFlares', (o, r, tm) => { o(r, tm); t.drawHigh(r, tm); });
  wrap(field, 'collectLights', (o) => { const out = o(); if (field.lighting && field.lighting.dark > 0.01) out.push(...t.lights()); return out; });
  wrap(field, 'useDoor', (o, ent) => (ent && ent.ev.kind === 'boat' && ent.ev.to ? boatDoor(field, ent) : o(ent)));
  wrap(field, 'debugState', (o) => ({ ...o(), tide: t.debugState() }));
  // the virtual tide flags: `if: 'tide:c>=2'` follows basin c (start levels until this map's tide has reset)
  wrap(field, 'hasFlag', (o, k) => {
    if (!isTideFlag(k)) return o(k);
    const mod = field.map && field.map.mod;
    const lv = t.active && t.m && mod && t.m.src === mod.tide ? t.levels : levelsOf(mod, {});
    const v = tideFlag(k, lv);
    return v === undefined ? false : v;
  });
  if (field.map && field.map.hasFlag) field.map.hasFlag = field.hasFlag;
  const D = typeof window !== 'undefined' ? window.LQ_DEBUG : null;
  if (D && D.commands && !D.commands().includes('tide')) {
    const cur = () => { const s = field.engine.scene; return s && s.name === 'field' && s.tide ? s : null; };
    D.register('tide', () => { const f = cur(); return f ? f.tide.debugState() : null; });
    D.register('turnWheel', async (id) => {
      const f = cur(); const ent = f && f.entities.get(id);
      if (!ent || ent.type !== 'tidewheel') return null;
      f.lockInput();
      try { await f.tide.turn(ent); } finally { f.unlockInput(); }
      return f.tide.debugState();
    });
  }
  return t;
}
