// Map events on the field (W2-world): every `events[]` entry of a map module becomes an entity (prop, actor, tile footprint, handlers).
// docs/WORLD.md lists the vocabulary. API: buildEntities, refreshEntities (flag changes), interactables, interact, stepOn / stepOff,
// fireTarget (a switch or plate changed), pushBlock / moveBlock, revealInk (the Lantern), breakWall (Dash Strike), appraiseObject.
// `block` + `heavy` is Shove-only; `object` + `breakable` ('roots' | 'rock' | 'glass') is Dash-only; any event + `behind: '<id>'` is
// concealed until that breakable breaks; `object` + `appraise` is an Appraise target; E2 adds `beam`, `mirror` and `receptor`
// (tracing lives in world/silverglass.js). One-shot state lives in engine.game.opened as "<map>:<id>"; puzzles reset on re-entry,
// except a `gate` with `flag` and a `switch` with `stateFlag`, which keep their state in a flag.

import { matches } from '../data/story/dialogue.js';
import { talkTo, NPCS } from '../data/npcs.js';
import { ZONES, ENCOUNTERS } from '../data/encounters.js';
import { give, take, count, isKeyItem, markOpened, isOpened, addGear, heal } from '../game/state.js';
import { rollChest } from '../battle/loot.js';
import { ITEMS } from '../data/items.js';
import { HELP, VOW_TEXT } from '../data/text.js';
import { inspectBoxes, bookBoxes, takeBark } from '../game/story.js';
import { settleVow, offerVows, takeVow } from '../game/vows.js';
import { Actor, EnemyBrain, WALK_FRAMES } from './actors.js';
import { makeNpcActor } from './npc.js';
import { DIRS, OPPOSITE } from './pathfind.js';
import { TILE } from './tilemap.js';

const GATE_SPRITES = { door_locked: ['door_locked_closed', 'door_locked_open'], door_key: ['door_key_closed', 'door_key_open'], door_boss: ['door_boss_closed', 'door_boss_open'],
  // Episode 2 (the Court of Mirrors): receptor gates, glass-key doors, the three-crystal vow door, the throne door
  door_glass: ['door_glass_closed', 'door_glass_open'], door_glass_key: ['door_glass_key_closed', 'door_glass_key_open'],
  door_vow: ['door_vow_closed', 'door_vow_open'], door_throne: ['door_throne_closed', 'door_throne_open'],
  x1_gate_culvert: ['x1_gate_culvert_closed', 'x1_gate_culvert_open'], x1_gate_barrow: ['x1_gate_barrow_closed', 'x1_gate_barrow_open'] };
/** Gates whose closed frame shows how many of their sources are on (the vow door's three crystals). */
const COUNTING_GATES = new Set(['door_vow']);
const INTERACT_TYPES = new Set(['npc', 'sign', 'book', 'object', 'chest', 'switch', 'pot', 'font', 'save', 'ferry', 'locked_door', 'brazier', 'trigger', 'actor', 'mirror', 'receptor', 'beam']);
/** Things a beam reads (a change to any of them asks the silverglass system to trace again). */
const BEAM_RELEVANT = new Set(['beam', 'mirror', 'receptor', 'gate', 'locked_door', 'block', 'pot', 'chest', 'shelf', 'object']);
const MAX_INK_RADIUS = 6;
/** In-game art for breakables (src/world/fieldart.js), with the tiles.json stand-ins if that art is missing. */
const BREAK_ART = { roots: ['ab_root_wall', 'ab_root_wall_broken', 'wall_broken'], rock: ['ab_cliff_crack', 'ab_cliff_grotto', 'wall_broken'],
  // E2: a cracked silverglass pane in a Court wall band (court.png pieces)
  glass: ['glass_pane_cracked_top', 'glass_pane_broken_top', 'wall_broken'] };

export function present(field, ev) {
  if (!ev) return false;
  if (ev.if == null && ev.ifNot == null) return true;
  return matches(ev, field.hasFlag);
}

function cellsOf(ev) {
  const out = [];
  const w = ev.w || 1, h = ev.h || 1;
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) out.push([ev.x + i, ev.y + j]);
  return out;
}

// ---------------------------------------------------------------- build
export function buildEntities(field) {
  field.entities = new Map();
  field.byTile = new Map();
  field.enterTriggers = [];
  const evs = (field.map.mod.events || []).slice();
  for (const ev of evs) {
    if (!ev || !ev.type) continue;
    const ent = { ev, id: ev.id || `${ev.type}_${ev.x},${ev.y}`, type: ev.type, x: ev.x | 0, y: ev.y | 0, cells: cellsOf(ev), prop: null, actor: null, state: null, present: false, data: {} };
    field.entities.set(ent.id, ent);
    for (const [x, y] of ent.cells) {
      const k = `${x},${y}`;
      if (!field.byTile.has(k)) field.byTile.set(k, []);
      field.byTile.get(k).push(ent);
    }
  }
  for (const ent of field.entities.values()) setPresent(field, ent, present(field, ent.ev));
  // W7: a switch with `stateFlag` keeps its place in a save; its targets snap to the on state
  for (const e of field.entities.values()) if (e.present && e.state === 'on' && e.ev.stateFlag) for (const t of targetsOf(e.ev)) fireTarget(field, t, { quiet: true });
}

export function refreshEntities(field) {
  if (!field.entities) return;
  for (const ent of field.entities.values()) {
    const want = present(field, ent.ev) && !ent.data.despawned;   // a despawned actor never comes back mid-map
    if (want !== ent.present) {
      // a scripted actor (the Warden, the Archivore) leaves on its scene's cue, not the instant its flag flips
      if (!want && ent.type === 'actor' && field.cutscene && field.cutscene.running) continue;
      setPresent(field, ent, want);
    }
    else if (ent.present && ent.type === 'npc' && ent.actor) {
      // an NPC may have been hidden by npcs.js show conditions, or its behaviour may change
      const rec = NPCS[ent.id];
      if (rec && rec.show && !matches(rec.show, field.hasFlag)) setPresent(field, ent, false);
    }
  }
}

function setPresent(field, ent, on) {
  if (on) { if (!ent.present) { ent.present = true; create(field, ent); applyConcealed(field, ent); } }
  else if (ent.present) { destroy(field, ent); ent.present = false; }
  if (field.glass && BEAM_RELEVANT.has(ent.type)) field.glass.markDirty();
}

/**
 * X1: what hides an entity. `behind: '<id>'` is a breakable (opened when Dash Strike breaks it); `behind:
 * 'appraise:<object id>'` is an Appraise object (opened when Mira reads it). Both are saved per map in
 * engine.game.opened under the target's own id. Pure.
 */
export function behindTarget(behind) {
  if (!behind) return null;
  return String(behind).startsWith('appraise:') ? String(behind).slice('appraise:'.length) : String(behind);
}
/** W9: is the breakable (or X1: the Appraise object) that hides this entity (`behind`) still unopened? Saved per map. */
function concealedBy(field, ent) {
  const id = behindTarget(ent.ev.behind);
  if (!id) return false;
  return !isOpened(field.game, field.map.id, id);
}
function applyConcealed(field, ent) {
  if (!ent.present || !ent.ev.behind) return;
  ent.data.concealed = concealedBy(field, ent);
  if (ent.prop) field.map.setPropVisible(ent.prop, !ent.data.concealed);
  if (ent.actor) ent.actor.visible = !ent.data.concealed;
}

/** W9: a breakable `object` (thin root wall, cracked rock): solid art until Dash Strike breaks it, then the open art. */
function createBreakable(field, ent, broken) {
  const ev = ent.ev, map = field.map;
  const [whole, open, fallback] = BREAK_ART[ev.breakable] || [ev.sprite, 'wall_broken', 'wall_broken'];
  const has = (id) => !!(map.db.tiles && map.db.tiles[id]);
  ent.state = broken ? 'broken' : 'whole';
  if (broken) {
    setTall(map, ent.x, ent.y, has(open) ? open : fallback);
    carveOpenings(field, ent);
  } else setTall(map, ent.x, ent.y, has(whole) ? whole : ev.sprite);
}

/** Put a (16x32) tile on a cell as its only overlay; the tile's code also lands on the cell below it. */
function setTall(map, x, y, id) {
  if (!id) return;
  map.setTile(x, y, id);
  if (map.inBounds(x, y + 1) && map.recomputeCell) {
    map.recomputeCell(x, y + 1); map.applyTallTiles(x, y);
    map.repaint(x, y, x, y + 1);     // setTile repaints one row; a 16x32 tile also covers the row below
  }
}

/** Carve `opens` wall cells to the map's floor (the '.' legend terrain) so a broken root wall leads somewhere. */
function carveOpenings(field, ent) {
  const map = field.map, mod = map.mod || {};
  const floor = (mod.legend && mod.legend['.']) || mod.under;
  for (const [x, y] of ent.ev.opens || []) {
    if (!map.inBounds(x, y) || !map.walls || !map.db.terrains[floor]) continue;
    map.walls[y][x] = null;
    map.tiles[y][x] = null;
    map.ids[y][x] = floor;
    map.terrain[y][x] = floor;
    map.recomputeCell(x, y);
    map.repaint(x - 1, y - 1, x + 1, y + 1);
  }
}

/**
 * Dash Strike broke a breakable: the open art, the carved passage, saved for good (engine.game.opened), and
 * whatever hid behind it (`behind`) appears with a sparkle. Returns true when it broke now.
 */
export function breakWall(field, ent) {
  if (!ent || ent.type !== 'object' || !ent.ev.breakable || ent.state === 'broken') return false;
  markOpened(field.game, field.map.id, ent.id);
  createBreakable(field, ent, true);
  revealBehind(field, e => e.ev.behind === ent.id);
  return true;
}

/** Everything `match`ed that was hiding now appears (applyConcealed) with the existing gold sparkle. Returns the ids. */
function revealBehind(field, match) {
  const out = [];
  for (const e of field.entities.values()) {
    if (!e.present || !e.ev.behind || !match(e) || !(e.data && e.data.concealed)) continue;
    applyConcealed(field, e);
    out.push(e.id);
    if (field.particles) field.particles.sparkle(e.x * TILE + 8, e.y * TILE + 4, 6, '#ffd34d');
  }
  return out;
}

/** X1: an `object` with `appraise: true` (+ `appraiseText`) is an Appraise target; reading it saves it as opened and shows its `behind: 'appraise:<id>'` events. */
export function isAppraiseObject(ent) {
  return !!(ent && ent.type === 'object' && ent.ev && ent.ev.appraise && ent.present && !(ent.data && ent.data.concealed));
}
/** The Appraise object standing on a cell, or null. */
export function appraiseObjectAt(field, x, y) {
  for (const ent of entitiesAt(field, x, y)) if (isAppraiseObject(ent)) return ent;
  return null;
}
/** The window lines of an Appraise object: its `appraiseText`, else its `text`. */
export function appraiseBoxes(ent, hasFlag) {
  const id = ent.ev.appraiseText || ent.ev.text;
  return id ? inspectBoxes(id, hasFlag) : [];
}
/** Mira read the object: saved per save (game.opened), the hidden things appear. Returns { first, revealed: [ids] }. */
export function appraiseObject(field, ent) {
  if (!isAppraiseObject(ent)) return { first: false, revealed: [] };
  const first = !isOpened(field.game, field.map.id, ent.id);
  markOpened(field.game, field.map.id, ent.id);
  const revealed = revealBehind(field, (e) => e.ev.behind === `appraise:${ent.id}`);
  return { first, revealed };
}

function addProp(field, ent, t, state, extra = {}) {
  if (!t) return null;
  const map = field.map;
  if (!map.db.objects[t] && !map.propsDb[t] && map.db.tiles[t]) {
    // a plain tile used as an event sprite (plates, floor switches) lives in the ground layer
    map.setTile(ent.x, ent.y, t);
    ent.tileSprite = t;
    return null;
  }
  const p = map.addProp({ t, x: ent.x, y: ent.y, state: state || 0, id: ent.id, kind: 'event', ...extra });
  if (!p.draw) { map.removeProp(p); return null; }
  ent.prop = p;
  // the prop's footprint may reach beyond the event's cells (a fountain two rows tall): make those cells
  // part of the entity so facing any of them counts as facing the entity
  for (const [x, y] of p.cells) {
    if (ent.cells.some((c) => c[0] === x && c[1] === y)) continue;
    ent.cells.push([x, y]);
    const k = `${x},${y}`;
    if (!field.byTile.has(k)) field.byTile.set(k, []);
    if (!field.byTile.get(k).includes(ent)) field.byTile.get(k).push(ent);
  }
  return p;
}

/** The floor tile currently showing at an entity's cell (for ink switches). */
function tileAt(field, ent) { return field.map.idsAt(ent.x, ent.y); }

function create(field, ent) {
  const ev = ent.ev, g = field.game, map = field.map;
  const opened = isOpened(g, map.id, ent.id);
  switch (ent.type) {
    case 'npc': {
      const a = makeNpcActor(field, ev);
      if (!a) { ent.present = false; return; }
      ent.actor = a; field.addActor(a);
      break;
    }
    case 'actor': {
      const ghost = !!ev.ghost;
      const a = new Actor(field, { id: ent.id, kind: 'actor', sprite: ev.sprite, x: ev.x, y: ev.y, dir: ev.dir || 'down',
        solid: ghost ? false : ev.solid !== false, name: ev.name || null,
        alpha: ghost ? 0.55 : 1, tint: ghost ? { color: '#5a4a9c', amount: 0.55 } : null });
      if (ghost) { a.spr.shadow = null; a.ghost = true; }
      ent.actor = a; field.addActor(a);
      break;
    }
    case 'enemy': {
      if (field.enemyGone(ent.id)) { ent.present = false; return; }
      const a = new Actor(field, { id: ent.id, kind: 'enemy', sprite: ev.sprite, x: ev.x, y: ev.y, dir: ev.dir || 'left', solid: true });
      a.brain = new EnemyBrain(a, ev, field.map.mod.area === 'dungeon' ? 'player' : 'free');
      ent.actor = a; field.addActor(a);
      break;
    }
    case 'door': {
      // a mirror door (kind 'mirror', sprite mirror_tall) shows its active frame while it exists; the Stacks' trapdoor its open one
      if (ev.sprite) addProp(field, ent, ev.sprite, ev.kind === 'mirror' ? 1 : (ev.state || 0));
      // a flag-gated door that just appeared opens its painted doors (door_double_closed -> door_double_open)
      if (ev.if != null) {
        for (const [cx, cy] of [...ent.cells, ...ent.cells.map(([x, y]) => [x, y - 1])]) {
          for (const id of map.idsAt(cx, cy)) {
            if (/_closed$/.test(id) && map.db.tiles[id.replace(/_closed$/, '_open')]) map.replaceTile(cx, cy, id, id.replace(/_closed$/, '_open'));
          }
        }
      }
      break;
    }
    case 'chest': {
      const tier = ev.tier || 'wood';
      ent.state = opened ? 'open' : 'closed';
      addProp(field, ent, `chest_${tier}`, opened ? 1 : 0);
      break;
    }
    case 'sign': if (ev.sprite) addProp(field, ent, ev.sprite, ev.state || 0); break;
    case 'object': {
      if (ev.breakable) { createBreakable(field, ent, opened); break; }
      if (ev.sprite) addProp(field, ent, ev.sprite, ev.state || 0, { solid: ev.solid });
      break;
    }
    case 'switch': {
      ent.state = ev.state === 'on' || (ev.stateFlag && g.flags[ev.stateFlag]) ? 'on' : 'off';
      if (ev.kind === 'crystal') {
        ent.data.color = ev.color || (ev.sprite === 'crystal_switch_gold' ? 'gold' : 'blue');
        addProp(field, ent, crystalSprite(ent), 0);
      } else if (ev.hidden || (ev.sprite && ev.sprite.startsWith('switch_ink'))) {
        // hidden-ink switch: stays faint until the Lantern reveals it; the map's own overlay may already hold it
        ent.data.ink = true;
        const ids = tileAt(field, ent);
        if (!ids.some((id) => id.startsWith('switch_ink'))) map.setTile(ent.x, ent.y, 'switch_ink_faint');
      } else map.setTile(ent.x, ent.y, ent.state === 'on' ? 'switch_on' : 'switch_off');
      break;
    }
    case 'plate': { ent.state = 'up'; map.setTile(ent.x, ent.y, 'plate_up'); break; }
    case 'block': {
      const heavy = !!ev.heavy && !!(map.db.objects && map.db.objects.heavy_block);
      const skin = heavy && ev.sprite && ev.sprite !== 'push_block' && map.db.objects[ev.sprite] ? ev.sprite : null;
      addProp(field, ent, skin || (heavy ? 'heavy_block' : (ev.sprite || 'push_block')), 0, { solid: true });
      if (ev.heavy && !heavy && ent.prop) ent.prop.tint = { color: '#2e2b4c', amount: 0.45 };   // no art: a darker push block
      break;
    }
    case 'gate': {
      ent.state = (ev.flag && g.flags[ev.flag]) || opened ? 'open' : (ev.state === 'open' ? 'open' : 'closed');
      applyGate(field, ent, false);
      break;
    }
    case 'locked_door': {
      ent.state = opened ? 'open' : 'closed';
      const pair = GATE_SPRITES[ev.sprite || 'door_key'] || GATE_SPRITES.door_key;
      addProp(field, ent, ent.state === 'open' ? pair[1] : pair[0], 0);
      break;
    }
    case 'shelf': {
      ent.state = ev.state || 0;
      const pos = (ev.positions && ev.positions[ent.state]) || [ev.x, ev.y];
      const p = addProp(field, ent, ev.sprite || 'shelf_moving', 0, { solid: true });
      if (p) map.moveProp(p, pos[0], pos[1]);
      break;
    }
    case 'brazier': {
      ent.state = (ev.lit || opened) ? 'lit' : 'unlit';
      addProp(field, ent, ent.state === 'lit' ? 'brazier_lit' : 'brazier_unlit', 0);
      break;
    }
    case 'font': if (ev.sprite) addProp(field, ent, ev.sprite, 0); break;
    case 'save': if (ev.sprite) addProp(field, ent, ev.sprite, 0); break;
    case 'ferry': if (ev.sprite) addProp(field, ent, ev.sprite, 0); break;
    case 'pot': {
      if (field.sessionGone.has(`${map.id}:${ent.id}`)) { ent.state = 'broken'; addProp(field, ent, 'pot_broken', 0); }
      else { ent.state = 'whole'; addProp(field, ent, ev.sprite || 'pot', 0, { solid: true }); }
      break;
    }
    case 'beam': {
      // a silverglass source: a moon window in a north face (beam_window) or a lens on a pedestal (beam_lens)
      addProp(field, ent, ev.sprite || 'beam_window', 0);
      break;
    }
    case 'mirror': {
      ent.state = ev.state ? 1 : 0;
      addProp(field, ent, ev.sprite || (ev.heavy ? 'mirror_heavy' : 'mirror_stand'), ent.state, { solid: true });
      break;
    }
    case 'receptor': {
      // a latched receptor whose flag is set starts lit (its gate opens on load: silverglass.reset)
      const latched = !!(ev.flag && g.flags[ev.flag]);
      ent.state = latched ? 'lit' : 'dark';
      ent.data.latched = latched; ent.data.everLit = latched;
      addProp(field, ent, ev.sprite || 'receptor', latched ? 1 : 0, { solid: true });
      break;
    }
    case 'light': {
      // `r` under 16 is in tiles (the F3 room lights say 4 to 7), otherwise world pixels
      const r = ev.r == null ? 48 : ev.r < 16 ? ev.r * TILE : ev.r;
      map.lights.push({ x: ent.x * TILE + 8, y: ent.y * TILE + 8, r, color: ev.color || null, id: ent.id });
      break;
    }
    case 'trigger': if (ev.on === 'enter') field.enterTriggers.push(ent); break;
    case 'pit': case 'book': case 'exit': break;
    default: field.warnOnce('ev:' + ent.type, `unknown event type "${ent.type}" (${ent.id})`);
  }
}

function destroy(field, ent) {
  if (ent.prop) { field.map.removeProp(ent.prop); ent.prop = null; }
  if (ent.actor) { field.removeActor(ent.actor); ent.actor = null; }
  if (ent.type === 'light') field.map.lights = field.map.lights.filter((l) => l.id !== ent.id);
  if (ent.type === 'switch' && ent.ev.kind !== 'crystal') field.map.setTile(ent.x, ent.y, 'plate_up');
}

function applyGate(field, ent, animate) {
  const ev = ent.ev, map = field.map;
  const open = ent.state === 'open';
  if (ev.cells) {
    for (const [x, y] of ev.cells) map.setTile(x, y, open ? ev.open : ev.closed);
  } else {
    const pair = GATE_SPRITES[ev.sprite || 'door_locked'] || GATE_SPRITES.door_locked;
    const frame = !open && COUNTING_GATES.has(ev.sprite) ? Math.min(3, sourceCount(field, ent.id).on) : 0;
    if (ent.prop) map.setPropSprite(ent.prop, open ? pair[1] : pair[0], frame);
    else addProp(field, ent, open ? pair[1] : pair[0], frame);
  }
  if (animate) {
    field.engine.audio.sfx(open ? 'gate_open' : 'door_close');
    if (open) field.engine.renderer.shake(1, 10);
  }
}

// ---------------------------------------------------------------- queries
export function entitiesAt(field, x, y) { return (field.byTile && field.byTile.get(`${x},${y}`)) || []; }

/**
 * Where a pit TILE at (x, y) drops the party: the `to` of a present `pit` area event covering the tile, else
 * the map's `pitTo`. The area event never swallows floor tiles inside it (the walk model in
 * tools/maps/mapcheck.mjs reads it the same way).
 */
export function pitDropAt(field, x, y) {
  for (const ent of entitiesAt(field, x, y)) if (ent.present && ent.type === 'pit' && ent.ev.to) return ent.ev.to;
  return (field.map && field.map.mod && field.map.mod.pitTo) || null;
}

/** Does this entity answer to confirm at all (type, state, text) regardless of where it stands? */
function respondsToConfirm(field, ent) {
  if (!ent.present || !INTERACT_TYPES.has(ent.type)) return false;
  if (ent.data && ent.data.concealed) return false;
  if (ent.type === 'object' && ent.ev.breakable && ent.state === 'broken') return false;
  if (ent.type === 'trigger' && ent.ev.on !== 'interact') return false;
  if (ent.type === 'actor' && !ent.ev.text && !ent.ev.script) return false;
  if (ent.type === 'object' && !ent.ev.text && !ent.ev.script) return false;
  if ((ent.type === 'receptor' || ent.type === 'beam') && !ent.ev.text && !ent.ev.script) return false;
  if (ent.type === 'mirror' && ent.ev.fixed && !ent.ev.text) return false;
  if (ent.type === 'chest' && ent.state === 'open') return false;
  if (ent.type === 'pot' && ent.state === 'broken') return false;
  if (ent.type === 'sign' && ent.ev.dir && field.leader && ent.ev.dir !== field.leader.dir) return false;
  return true;
}

/** Where a walking entity really is: its actor's tile (the one it is stepping into counts). */
function actorOn(ent, x, y) {
  const a = ent.actor;
  if (!a) return false;
  if (a.tx === x && a.ty === y) return true;
  return !!(a.moving && a.fromX / TILE === x && a.fromY / TILE === y);
}

/**
 * Entities on a tile that respond to confirm while faced. NPCs and scripted actors are looked up where they
 * STAND (they wander), not where their event was placed: you talk to Tess wherever she is, and an empty
 * home tile is just floor.
 */
export function interactables(field, x, y) {
  const out = [];
  for (const ent of entitiesAt(field, x, y)) {
    if (!respondsToConfirm(field, ent)) continue;
    if ((ent.type === 'npc' || ent.type === 'actor') && ent.actor && !actorOn(ent, x, y)) continue;
    out.push(ent);
  }
  if (field.actors) {
    for (const a of field.actors) {
      if ((a.kind !== 'npc' && a.kind !== 'actor') || !actorOn({ actor: a }, x, y)) continue;
      const ent = field.entities && field.entities.get(a.id);
      if (!ent || ent.actor !== a || out.includes(ent) || !respondsToConfirm(field, ent)) continue;
      out.push(ent);
    }
  }
  return out;
}

/** Prompt glyph kind for an entity: 'talk' | 'check' | null. */
export function promptKind(ent) {
  if (ent.type === 'npc') return 'talk';
  return 'check';
}

/** Does an entity on this tile block NPC wandering (doors, triggers, chests...)? */
export function tileHasEvent(field, x, y) {
  for (const ent of entitiesAt(field, x, y)) if (ent.present && ent.type !== 'light' && ent.type !== 'npc' && ent.type !== 'enemy') return true;
  return false;
}

// ---------------------------------------------------------------- interact
export async function interact(field, ent) {
  const ev = ent.ev, g = field.game, engine = field.engine, map = field.map;
  switch (ent.type) {
    case 'npc': return talkNpc(field, ent);
    case 'actor': case 'object': case 'trigger': {
      if (ev.script) await field.runScene(ev.script);
      else if (ev.text) await field.showBoxes(inspectBoxes(ev.text, field.hasFlag));
      // a `safe: true` landmark (the Lantern pedestal): game over returns the party here
      if (ev.safe && field.markSafe && !field.dead) field.markSafe();
      // `rest: true` (the Pilgrim's Rest campfire): the font's rest flow after the scene, without the font bark
      if (ev.rest && !field.dead) await restFlow(field, { bark: null, sparkle: '#ffd080' });
      return;
    }
    case 'sign': {
      if ((ev.hiddenInk || ev.lantern) && !inkRevealedNear(field, ent.x, ent.y)) {
        return field.showBoxes([{ who: null, text: 'Faint marks on the wall. The ink is too pale to read.' }]);
      }
      return field.showBoxes(inspectBoxes(ev.text, field.hasFlag));
    }
    case 'book': return field.showBoxes(bookBoxes(ev.book));
    case 'chest': return openChest(field, ent);
    case 'switch': {
      if (ent.data.ink && !tileAt(field, ent).some((id) => id.endsWith('_revealed') || id === 'switch_on')) {
        return field.showBoxes([{ who: null, text: 'Faint marks on the floor. The ink is too pale to make out.' }]);
      }
      ent.state = ent.state === 'on' ? 'off' : 'on';
      const on = ent.state === 'on';
      if (ev.stateFlag) field.setFlag(ev.stateFlag, on);
      if (ev.kind === 'crystal') {
        engine.audio.sfx('crystal_hit');
        if (ent.prop) map.setPropSprite(ent.prop, crystalSprite(ent), 0);
        field.particles.sparkle(ent.x * TILE + 8, ent.y * TILE - 6, 5, on ? '#ffd34d' : '#8af0e8');
      } else {
        engine.audio.sfx(on ? 'switch_on' : 'switch_off');
        map.setTile(ent.x, ent.y, on ? 'switch_on' : (ent.data.ink ? 'switch_ink_revealed' : 'switch_off'));
      }
      for (const t of targetsOf(ev)) fireTarget(field, t);
      await field.bark('first_switch');
      return;
    }
    case 'pot': return breakPot(field, ent);
    case 'font': {
      await field.showBoxes(inspectBoxes(ev.text || 'keeper_font', field.hasFlag));
      await restFlow(field, { bark: 'first_font', sparkle: '#9fffd0' });
      return;
    }
    case 'save': {
      await field.showBoxes(inspectBoxes(ev.text || 'save_bell', field.hasFlag));
      await restFlow(field, { bark: null, sparkle: '#fff7d6', jingle: 'save' });
      return;
    }
    case 'ferry': {
      const canRide = ev.rideIf ? field.hasFlag(ev.rideIf) : true;
      if (ev.text) await field.showBoxes(inspectBoxes(ev.text, field.hasFlag));
      if (!canRide || !ev.to) return;
      const c = await field.choice(['Ring for the ferry', 'Not now']);
      if (c !== 0) return;
      engine.audio.sfx('save_chime');
      await field.warpTo(ev.to[0], ev.to[1], ev.to[2], ev.to[3], 'ferry');
      return;
    }
    case 'locked_door': return unlockDoor(field, ent);
    case 'mirror': return turnMirror(field, ent);
    case 'receptor': case 'beam': {
      if (ev.text) await field.showBoxes(inspectBoxes(ev.text, field.hasFlag));
      return;
    }
    case 'brazier': {
      if (ent.state === 'lit') return;
      ent.state = 'lit';
      engine.audio.sfx('brazier_light');
      if (ent.prop) map.setPropSprite(ent.prop, 'brazier_lit', 0);
      if (ev.flag) field.setFlag(ev.flag);
      if (ev.persist) markOpened(g, map.id, ent.id);
      field.particles.burst('ember', ent.x * TILE + 8, ent.y * TILE + 2, 6, '#ffb060');
      for (const t of targetsOf(ev)) fireTarget(field, t);
      return;
    }
    default: return;
  }
}

/** The rest flow of every landmark (fonts, the bell, campfire): "Rest here?" (full heal, return point, sparkle, optional bark), then "Record your journey here?". True when rested. */
export async function restFlow(field, o = {}) {
  const { engine, game: g } = field;
  const c = await field.dialog({ who: null, text: 'Rest here?', choices: ['Rest', 'Not now'], cancel: 1 });
  if (c !== 0 || field.dead) return false;
  if (o.jingle) engine.audio.jingle(o.jingle); else engine.audio.sfx('heal');
  heal(g, { full: true });
  if (field.markSafe) field.markSafe();
  field.particles.sparkle(field.leader.feetX, field.leader.feetY - 16, 8, o.sparkle || '#9fffd0');
  if (engine.toasts) await engine.toasts.flash('{c:green}HP{/c} and {c:blue}MP{/c} restored.', { frames: 70 });
  else await engine.waitFrames(30);
  if (o.bark) await field.bark(o.bark);
  if (field.dead) return true;
  await vowRow(field);
  if (field.dead) return true;
  if (engine.cave && await engine.cave.refuseSave(engine, g)) return true;   // the Deep Stacks keep their own pages
  const s = await field.dialog({ who: null, text: HELP.save.prompt, choices: ['Save', 'Not now'], cancel: 1 });
  if (s === 0 && engine.hasScene('menu') && !field.dead) await engine.pushAwait('menu', { page: 'save' });
  return true;
}

/**
 * H3 (docs/VOWS.md): the vow row between the heal and the save prompt. A kept vow pays first, a broken one says its line, an
 * untested one rides on unoffered. Then "Take a vow?" with "No vow" first and selected (one confirm leaves the flow as it was).
 */
async function vowRow(field) {
  const { engine, game: g } = field;
  const settled = settleVow(g);
  if (settled && settled.kind === 'carried') return;
  if (settled && settled.kind === 'kept') {
    engine.audio.sfx(settled.reward ? 'buff' : 'confirm');
    await field.showBoxes([{ who: null, text: settled.text }, settled.line].filter(Boolean));
  } else if (settled && settled.kind === 'broken' && settled.line) {
    await field.showBoxes([settled.line]);
  }
  if (field.dead) return;
  const ctx = { alwaysRun: !!(engine.settings && engine.settings.alwaysRun) };
  const offered = offerVows(g, ctx);
  if (!offered.length) return;
  for (;;) {
    const pick = await field.dialog({ who: null, text: VOW_TEXT.offer, choices: [VOW_TEXT.none, ...offered.map((v) => v.name)], cancel: 0 });
    if (!pick || field.dead) return;
    const v = offered[pick - 1];
    const yes = await field.dialog({ who: null, text: `${v.line}\n${v.rule}`, choices: [VOW_TEXT.take, VOW_TEXT.back], cancel: 1 });
    if (field.dead) return;
    if (yes !== 0) continue;
    if (!takeVow(g, v.id, ctx)) return;
    engine.audio.sfx('confirm');
    field.particles.sparkle(field.leader.feetX, field.leader.feetY - 20, 6, '#fff7d6');
    if (engine.toasts) await engine.toasts.flash(VOW_TEXT.taken.replace('{name}', v.name), { frames: 70 });
    return;
  }
}

/**
 * Confirm on a mirror: a fixed one only reads its text; a turnable one flips between '/' and the backslash
 * (mirror_turn) with a small lift, and the beams are traced again at once. Its `text` (the court_lens line) is read
 * the first time that line is met in this save, before the turn, so every later confirm is just a turn.
 */
export async function turnMirror(field, ent) {
  const ev = ent.ev, engine = field.engine, map = field.map, g = field.game;
  if (ev.fixed) { if (ev.text) await field.showBoxes(inspectBoxes(ev.text, field.hasFlag)); return false; }
  if (ev.text && g.counters && !g.counters[`read:${ev.text}`]) {
    g.counters[`read:${ev.text}`] = 1;
    await field.showBoxes(inspectBoxes(ev.text, field.hasFlag));
    if (field.dead) return false;
  }
  if (ent.data.sliding) return false;
  ent.state = ent.state ? 0 : 1;
  engine.audio.sfx('mirror_turn');
  if (ent.prop) {
    map.setPropState(ent.prop, ent.state);
    ent.prop.offY = -1;
    engine.after(4, () => { if (ent.prop) ent.prop.offY = 0; });
  }
  if (field.particles) field.particles.sparkle(ent.x * TILE + 8, ent.y * TILE - 4, 3, '#e8fffb');
  if (field.glass) field.glass.recompute();
  await engine.waitFrames(8);
  return true;
}

function targetsOf(ev) { return ev.target == null ? [] : Array.isArray(ev.target) ? ev.target : [ev.target]; }
function crystalSprite(ent) {
  const base = ent.data.color || 'blue';
  const other = base === 'gold' ? 'blue' : 'gold';
  return `crystal_switch_${ent.state === 'on' ? other : base}`;
}

async function talkNpc(field, ent) {
  const a = ent.actor;
  if (!a) return;
  const result = talkTo(ent.id, field.hasFlag);
  if (!result) return;
  a.talking = true;
  a.faceToward(field.leader);
  try {
    if (result.scene) { await field.runScene(result.scene); return; }
    await field.showBoxes(result.lines.map((l) => ({ who: l.who === ent.id || l.who == null && false ? ent.id : l.who, text: l.text })), ent.id);
    const svc = result.service;
    if (svc && svc.type === 'shop' && field.engine.hasScene('shop')) await field.engine.pushAwait('shop', { shopId: svc.id });
    else if (svc && svc.type === 'inn' && field.engine.hasScene('inn')) await field.engine.pushAwait('inn', { price: svc.price || 10 });
  } finally {
    a.talking = false;
    const back = a;
    field.engine.after(45, () => { if (!back.moving && !back.talking && back.brain && back.brain.mode !== 'stand') back.face(back.homeDir || back.dir); });
  }
}

async function openChest(field, ent) {
  const { engine, game: g, map } = field;
  if (ent.state === 'open') return;
  ent.state = 'open';
  engine.audio.sfx('chest_open');
  if (ent.prop) map.setPropState(ent.prop, 1);
  markOpened(g, map.id, ent.id);
  if (ent.ev.flag) field.setFlag(ent.ev.flag);
  field.particles.sparkle(ent.x * TILE + 8, ent.y * TILE + 4, 6, '#ffd34d');
  await engine.waitFrames(18);
  const ev = ent.ev;
  if (engine.cave && await engine.cave.openChest(field, ent)) { await field.bark('first_chest'); return; }   // the Deep Stacks' red and blue tiers
  if (ev.item || ev.gold) {
    // a placed chest pays its item and its gold (E2: the Remembrance Cache holds both)
    if (ev.item) {
      await field.giveItem(ev.item, ev.qty || 1);
      if (ev.item === 'archive_key') await field.bark('first_archive_key');
    }
    if (ev.gold) {
      g.gold += ev.gold;
      engine.audio.sfx('coin');
      if (engine.toasts) await engine.toasts.gold(ev.gold);
    }
  } else {
    // a random chest: rollChest -> { gold, items: [instances], consumables: [{ item, qty }] } (loot-tables CHEST_TIERS)
    const zone = ZONES[map.id];
    const ilvl = ev.ilvl || (zone ? zone.level[0] : 1);
    const roll = rollChest(field.rng, ev.tier || 'wood', ilvl);
    if (roll && typeof roll === 'object' && (Array.isArray(roll.items) || Array.isArray(roll.consumables))) {
      if (roll.gold > 0) { g.gold += roll.gold; engine.audio.sfx('coin'); if (engine.toasts) await engine.toasts.gold(roll.gold); }
      for (const c of roll.consumables || []) await field.giveItem(c.item, c.qty || 1);
      for (const inst of roll.items || []) {
        const rarity = inst.rarity || 'common';
        await field.giveGear(inst, { at: chestScreenPoint(field, ent) });
        if (rarity === 'rare') await field.bark('first_rare_drop');
        if (rarity === 'legendary' || rarity === 'set') await field.bark('first_legendary_drop');
      }
    } else if (roll && typeof roll === 'object' && roll.base) {
      await field.giveGear(roll, { at: chestScreenPoint(field, ent) });
    } else if (typeof roll === 'string') {
      await field.giveItem(roll, 1);
    }
  }
  await field.bark('first_chest');
}

/** Screen point (bottom center) of a chest for the legendary beam: the tile under the chest's prop. */
function chestScreenPoint(field, ent) {
  if (!field.camera || !field.camera.toScreen) return null;
  const [sx, sy] = field.camera.toScreen(ent.x * TILE + 8, ent.y * TILE + 14);
  return [sx, sy];
}

export async function breakPot(field, ent) {
  const { engine, map, game: g } = field;
  if (ent.state === 'broken') return;
  ent.state = 'broken';
  engine.audio.sfx('pot_break');
  field.sessionGone.add(`${map.id}:${ent.id}`);
  field.particles.burst('shard', ent.x * TILE + 8, ent.y * TILE + 8, 8, '#c8a070');
  // shards are walkable (and a push block slides over them): drop the whole pot's solid override
  if (ent.prop) { ent.prop.solidOverride = false; map.setPropSprite(ent.prop, 'pot_broken', 0); }
  const ev = ent.ev;
  if (ev.item) await field.giveItem(ev.item, ev.qty || 1);
  else if (ev.gold) { g.gold += ev.gold; engine.audio.sfx('coin'); if (engine.toasts) await engine.toasts.gold(ev.gold); }
}

async function unlockDoor(field, ent) {
  const { engine, map, game: g } = field;
  const ev = ent.ev;
  if (ent.state === 'open') return;
  const key = ev.key || 'archive_key';
  if (count(g, key) <= 0) {
    engine.audio.sfx('door_locked');
    await field.showBoxes([{ who: null, text: 'Locked. It needs a key.' }]);
    await field.bark('first_locked_door');
    return;
  }
  engine.audio.sfx('door_unlock');
  if (isKeyItem(key) && ITEMS[key] && ITEMS[key].counted) take(g, key, 1);
  ent.state = 'open';
  markOpened(g, map.id, ent.id);
  const pair = GATE_SPRITES[ev.sprite || 'door_key'] || GATE_SPRITES.door_key;
  if (ent.prop) map.setPropSprite(ent.prop, pair[1], 0);
  await engine.waitFrames(20);
}

// ---------------------------------------------------------------- targets (switches, plates, receptors)
/** A source of `id` changed: open or close a gate, slide a shelf. o.quiet: no sound or shake (map load). */
export function fireTarget(field, id, o = {}) {
  const ent = field.entities.get(id);
  if (!ent || !ent.present) return;
  const on = sourcesOn(field, id);
  if (ent.type === 'gate') {
    const want = on ? 'open' : 'closed';
    if (ent.state === want) {
      // the vow door shows each lit crystal while it stays shut
      if (want === 'closed' && COUNTING_GATES.has(ent.ev.sprite)) applyGate(field, ent, false);
      return;
    }
    ent.state = want;
    applyGate(field, ent, !o.quiet);
    if (ent.ev.flag && on) field.setFlag(ent.ev.flag);
  } else if (ent.type === 'shelf') {
    const want = on ? 1 : 0;
    if (ent.state === want || !ent.prop) return;
    ent.state = want;
    const pos = (ent.ev.positions && ent.ev.positions[want]) || [ent.x, ent.y];
    if (o.quiet) field.map.moveProp(ent.prop, pos[0], pos[1]);      // map load: snap, no slide
    else field.slideProp(ent.prop, pos[0], pos[1], 30, ent.ev.sfx || 'shelf_move');
  } else if (ent.type === 'gate_tiles') {
    // reserved
  } else if (ent.type === 'brazier') {
    if (on && ent.state !== 'lit') { ent.state = 'lit'; if (ent.prop) field.map.setPropSprite(ent.prop, 'brazier_lit', 0); field.engine.audio.sfx('brazier_light'); }
  }
}

const SOURCE_TYPES = new Set(['switch', 'plate', 'brazier', 'receptor']);
function sourceIsOn(ent) {
  if (ent.type === 'plate') return ent.state === 'down';
  if (ent.type === 'brazier' || ent.type === 'receptor') return ent.state === 'lit';
  return ent.state === 'on';
}
/** How many switches / plates / braziers / receptors name `id`, and how many of them are on. */
export function sourceCount(field, id) {
  let n = 0, on = 0;
  if (!field.entities) return { n, on };
  for (const ent of field.entities.values()) {
    if (!ent.present || !SOURCE_TYPES.has(ent.type) || !targetsOf(ent.ev).includes(id)) continue;
    n++;
    if (sourceIsOn(ent)) on++;
  }
  return { n, on };
}
/** AND of every switch/plate/brazier/receptor whose target list names `id`. */
function sourcesOn(field, id) {
  const c = sourceCount(field, id);
  return c.n > 0 && c.on === c.n;
}

// ---------------------------------------------------------------- stepping
/** An actor (party member, NPC, enemy or a moving block) arrived on a tile. */
export function stepOn(field, ent, actor) {
  if (!ent.present) return;
  if (ent.type === 'plate') updatePlate(field, ent);
}
export function stepOff(field, ent, actor) {
  if (!ent.present) return;
  if (ent.type === 'plate') field.engine.after(1, () => updatePlate(field, ent));
}
export function updatePlate(field, ent) {
  if (!ent.present) return;
  const weight = field.actorAt(ent.x, ent.y, null, true) || field.map.propAt(ent.x, ent.y);
  const want = weight ? 'down' : 'up';
  if (ent.state === want) return;
  ent.state = want;
  field.map.setTile(ent.x, ent.y, want === 'down' ? 'plate_down' : 'plate_up');
  field.engine.audio.sfx(want === 'down' ? 'switch_on' : 'switch_off');
  for (const t of targetsOf(ent.ev)) fireTarget(field, t);
}

/**
 * The leader walked into a push block: slide it one tile if the far tile is free. Returns true when pushed.
 * A heavy block (W9) does not move for the leader: it shudders, and Bram's Shove (moveBlock) moves it.
 */
export function pushBlock(field, ent, dir) {
  if (ent.ev.heavy) { nudgeHeavy(field, ent, dir); return false; }
  return !!moveBlock(field, ent, dir);
}

/** Blocks and the mirrors that slide (`push: true`, or `heavy: true` for Bram's Shove). */
export function isPushable(ent) {
  return !!ent && (ent.type === 'block' || (ent.type === 'mirror' && !!(ent.ev.push || ent.ev.heavy)));
}

/**
 * May a block (or a sliding mirror) move from its tile one step in `dir`? Open floor, no actor, only plates /
 * triggers / shards there, and never onto a glass bridge cell (lit or dim: EPISODE2_PLAN 5.1).
 */
export function blockCanMove(field, ent, dir) {
  if (!ent || !ent.prop || ent.data.sliding) return false;
  const [dx, dy] = DIRS[dir];
  const nx = ent.x + dx, ny = ent.y + dy;
  if (field.map.codeAt(nx, ny) !== 'none') return false;
  if (field.glass && field.glass.isBridge(nx, ny)) return false;
  // never onto a door cell, present or not (notches, mirror doors, door pairs): a parked block would seal it
  if (entitiesAt(field, nx, ny).some((e) => e.type === 'door')) return false;
  if (field.actorAt(nx, ny)) return false;
  // a block may slide onto plates, triggers, lights and the shards of a broken pot; nothing else that is there
  const passableEvent = (e) => !e.present || e.type === 'plate' || e.type === 'trigger' || e.type === 'light' || (e.type === 'pot' && e.state === 'broken');
  if (tileHasEvent(field, nx, ny) && !entitiesAt(field, nx, ny).every(passableEvent)) return false;
  return true;
}

/** Slide a block one tile (o.frames, default 14; o.sfx, default block_push). Returns the slide promise or false. */
export function moveBlock(field, ent, dir, o = {}) {
  if (!blockCanMove(field, ent, dir)) return false;
  const p = ent.prop;
  const [dx, dy] = DIRS[dir];
  const nx = ent.x + dx, ny = ent.y + dy;
  ent.data.sliding = true;
  if (o.sfx !== null) field.engine.audio.sfx(o.sfx || 'block_push');
  const ox = ent.x, oy = ent.y;
  ent.x = nx; ent.y = ny;
  ent.cells = [[nx, ny]];
  reindex(field, ent, [[ox, oy]], [[nx, ny]]);
  if (field.glass) field.glass.markDirty();       // the block left the beam line (or entered it) now
  const settle = () => {
    ent.data.sliding = false;
    for (const e of entitiesAt(field, nx, ny)) if (e.type === 'plate') updatePlate(field, e);
    for (const e of entitiesAt(field, ox, oy)) if (e.type === 'plate') updatePlate(field, e);
    if (field.glass) field.glass.markDirty();     // a mirror bends the beam from its new tile once it lands
    if (!ent.ev.heavy && ent.type === 'block') field.bark('first_block_push');
    return true;
  };
  const slide = field.slideProp(p, nx, ny, o.frames || 14, null);
  // a promise that resolves once the block has landed (truthy either way, so callers can test the result)
  return (slide && typeof slide.then === 'function' ? slide.then(settle) : settle()) || true;
}

/** Walking into a heavy block: it rocks a pixel and settles (once per bump), and Bram has a word the first time. */
function nudgeHeavy(field, ent, dir) {
  const p = ent.prop;
  if (!p || ent.data.sliding) return;
  if (ent.data.nudgeAt != null && field.frame - ent.data.nudgeAt < 24) return;
  ent.data.nudgeAt = field.frame;
  const [dx, dy] = DIRS[dir];
  field.engine.audio.sfx('hit_light', { volume: 0.6 });
  p.offX = dx; p.offY = dy;
  field.engine.after(3, () => { p.offX = 0; p.offY = 0; });
  if (field.leader && field.leader.showEmote && !field.leader.emote) field.leader.showEmote('sweat', 36);
  if (field.abilities && field.abilities.has('shove')) field.bark('first_heavy_block');
}

function reindex(field, ent, oldCells, newCells) {
  for (const [x, y] of oldCells) {
    const k = `${x},${y}`;
    const list = field.byTile.get(k);
    if (list) { const i = list.indexOf(ent); if (i >= 0) list.splice(i, 1); }
  }
  for (const [x, y] of newCells) {
    const k = `${x},${y}`;
    if (!field.byTile.has(k)) field.byTile.set(k, []);
    field.byTile.get(k).push(ent);
  }
}

// ---------------------------------------------------------------- the Lantern of Recall
export function inkRevealedNear(field, x, y) {
  for (const [cx, cy] of [[x, y], [x, y - 1], [x, y + 1]]) for (const id of field.map.idsAt(cx, cy)) if (id.endsWith('_revealed')) return true;
  return false;
}

/** Reveal every *_faint tile within `radius` tiles of (cx, cy). Returns the number of cells revealed now. */
export function revealInk(field, cx, cy, radius = MAX_INK_RADIUS) {
  const map = field.map, g = field.game;
  let n = 0, bridge = false;
  for (let y = cy - radius; y <= cy + radius; y++) for (let x = cx - radius; x <= cx + radius; x++) {
    if (!map.inBounds(x, y)) continue;
    if (Math.abs(x - cx) + Math.abs(y - cy) > radius + 1) continue;
    for (const id of map.idsAt(x, y)) {
      if (!id.endsWith('_faint')) continue;
      const to = id.replace(/_faint$/, '_revealed');
      if (!map.replaceTile(x, y, id, to)) continue;
      markOpened(g, map.id, `ink:${x},${y}`);
      field.particles.sparkle(x * TILE + 8, y * TILE + 8, 4, '#9fffd0');
      if (id.includes('bridge')) bridge = true;
      n++;
    }
  }
  if (bridge) field.engine.after(20, () => field.engine.audio.sfx('bridge_appear'));
  return n;
}

/** Re-apply saved reveals after a map loads. */
export function applySavedReveals(field) {
  const map = field.map, g = field.game;
  const prefix = `${map.id}:ink:`;
  for (const key of Object.keys(g.opened)) {
    if (!key.startsWith(prefix)) continue;
    const [x, y] = key.slice(prefix.length).split(',').map(Number);
    for (const id of map.idsAt(x, y)) if (id.endsWith('_faint')) map.replaceTile(x, y, id, id.replace(/_faint$/, '_revealed'));
  }
}

/**
 * Ambient sparkles on things worth noticing: unopened chests, glinting story props (prop_letter,
 * prop_ferry_bell) and objects flagged `glint`. Called once per frame; cheap (one entity every ~2 s).
 */
export function tickGlints(field) {
  const frame = field.frame;
  if (frame % 24 !== 0 || !field.entities) return;
  const list = [...field.entities.values()].filter((e) => e.present && e.prop && !(e.data && e.data.concealed) && (
    (e.type === 'chest' && e.state !== 'open') || e.ev.glint || /^prop_(letter|ferry_bell)$/.test(e.ev.sprite || '')));
  if (!list.length) return;
  const e = list[(frame / 24 | 0) % list.length];
  if (((frame / 24 | 0) % 5) !== 0) return;
  const d = e.prop.draw;
  if (!field.camera.visible(d.dx, d.dy, d.w, d.h, 0)) return;
  if (e.prop.t === 'prop_letter' && e.ev.sprite === 'prop_letter') field.map.setPropState(e.prop, 1), field.engine.after(14, () => { if (e.prop) field.map.setPropState(e.prop, 0); });
  field.particles.sparkle(d.dx + (d.w >> 1) + field.rng.int(-4, 4), d.dy + (d.h >> 1) + field.rng.int(-3, 3), 1, '#fff7d6');
}

/** Visible enemy -> encounter data for the battle call. */
export function encounterFor(ent) {
  const id = ent.ev.encounter;
  const enc = ENCOUNTERS[id];
  return { id, boss: !!(enc && enc.boss), canFlee: !(enc && enc.noFlee) };
}

export { OPPOSITE, WALK_FRAMES, give, isKeyItem, takeBark };
