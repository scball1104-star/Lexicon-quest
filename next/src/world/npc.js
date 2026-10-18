// Townsfolk on the field: builds an Actor from an `npc` event plus data/npcs.js and runs its idle behaviour.
//
//   const a = makeNpcActor(field, ev);      // null when the NPC is not present for the current flags
//   updateNpc(field, a);                    // one logic frame of behaviour (stand, turn, wander, patrol, tag, sleep)
//   refreshNpcBehaviour(field, a);          // after a flag changes (moveFor may pick a new mode)
//
// NPCs never step onto doors, triggers, chests, the party or other actors, and keep inside `radius` tiles of
// their spot. While `a.talking` is set (dialogue) they stand still and face the player.

import { NPCS, moveFor, isPresent } from '../data/npcs.js';
import { Actor, WALK_FRAMES } from './actors.js';
import { DIRS, OPPOSITE, dirBetween } from './pathfind.js';

export function makeNpcActor(field, ev) {
  const rec = NPCS[ev.id];
  const hasFlag = field.hasFlag;
  if (rec && !isPresent(ev.id, hasFlag)) return null;
  const sprite = ev.sprite || (rec && rec.sprite) || 'npc_farmer';
  const a = new Actor(field, {
    id: ev.id, kind: 'npc', sprite, x: ev.x, y: ev.y, dir: ev.dir || 'down',
    solid: ev.solid != null ? ev.solid !== false : (rec ? rec.solid !== false : true),
    name: rec ? rec.name : ev.name || ev.id, portrait: rec ? rec.portrait || null : null, ev,
  });
  a.npc = rec || null;
  a.home = [ev.x, ev.y];
  a.homeDir = a.dir;
  refreshNpcBehaviour(field, a);
  return a;
}

export function refreshNpcBehaviour(field, a) {
  const m = a.npc ? moveFor(a.id, field.hasFlag) : { move: a.ev && a.ev.move || 'stand', radius: a.ev && a.ev.radius, path: a.ev && a.ev.path };
  const mode = (m && m.move) || 'stand';
  const prev = a.brain;
  a.brain = {
    mode, radius: m.radius || 2, path: Array.isArray(m.path) ? m.path.slice() : null, partner: m.partner || null,
    pathI: 0, pathDir: 1, timer: 30 + ((a.serial * 41) % 90), tagPhase: 0, tagT: 0,
    returnTimer: 0,
  };
  if (prev && prev.mode === mode) { a.brain.pathI = prev.pathI; a.brain.pathDir = prev.pathDir; }
}

function okTile(field, a, nx, ny, dir) {
  if (field.canStep(a, a.tx, a.ty, nx, ny, dir) !== true) return false;
  if (field.eventBlocksNpc(nx, ny)) return false;
  return true;
}

export function updateNpc(field, a) {
  const b = a.brain;
  if (!b || a.moving || a.busy > 0) return;
  if (a.talking) { a.faceToward(field.leader); return; }
  if (field.inputLocked) return;   // cutscenes: nobody wanders into the shot
  const rng = field.rng;
  switch (b.mode) {
    case 'stand': return;
    case 'turn': {
      if (--b.timer > 0) return;
      b.timer = 90 + rng.int(0, 180);
      a.face(rng.chance(0.5) ? a.homeDir : rng.pick(['up', 'down', 'left', 'right']));
      return;
    }
    case 'sleep': {
      if (--b.timer > 0) return;
      b.timer = 200 + rng.int(0, 120);
      a.showEmote('zzz', 60);
      return;
    }
    case 'wander': {
      if (--b.timer > 0) return;
      b.timer = 40 + rng.int(0, 110);
      if (rng.chance(0.3)) { a.face(rng.pick(['up', 'down', 'left', 'right'])); return; }
      const dirs = ['up', 'down', 'left', 'right'].filter((d) => {
        const nx = a.tx + DIRS[d][0], ny = a.ty + DIRS[d][1];
        return Math.abs(nx - a.home[0]) <= b.radius && Math.abs(ny - a.home[1]) <= b.radius && okTile(field, a, nx, ny, d);
      });
      if (!dirs.length) return;
      const d = rng.pick(dirs);
      a.startStep(a.tx + DIRS[d][0], a.ty + DIRS[d][1], WALK_FRAMES + 2);
      return;
    }
    case 'patrol': {
      if (!b.path || !b.path.length) return;
      if (--b.timer > 0) return;
      b.timer = 14 + rng.int(0, 10);
      const raw = b.path[b.pathI];
      const d = b.pathDir > 0 ? raw : OPPOSITE[raw];
      const nx = a.tx + DIRS[d][0], ny = a.ty + DIRS[d][1];
      if (!okTile(field, a, nx, ny, d)) { a.face(d); return; }
      a.startStep(nx, ny, WALK_FRAMES);
      b.pathI += b.pathDir;
      if (b.pathI >= b.path.length) { b.pathI = b.path.length - 1; b.pathDir = -1; }
      else if (b.pathI < 0) { b.pathI = 0; b.pathDir = 1; }
      return;
    }
    case 'tag': {
      // Quick little dashes: half the time toward the partner, half the time away, inside the play area.
      if (--b.timer > 0) return;
      b.timer = 6 + rng.int(0, 6);
      if (++b.tagT > 90) { b.tagT = 0; b.tagPhase ^= 1; }
      const partner = b.partner ? field.actorById(b.partner) : null;
      let order = ['up', 'down', 'left', 'right'];
      if (partner) {
        const toward = dirBetween([a.tx, a.ty], [partner.tx, partner.ty]);
        if (toward) order = b.tagPhase ? [OPPOSITE[toward], ...order] : [toward, ...order];
      }
      for (const d of (b.tagPhase ? order : rng.shuffle(order.slice()))) {
        const nx = a.tx + DIRS[d][0], ny = a.ty + DIRS[d][1];
        if (Math.abs(nx - a.home[0]) > 4 || Math.abs(ny - a.home[1]) > 4) continue;
        if (!okTile(field, a, nx, ny, d)) continue;
        if (partner && nx === partner.tx && ny === partner.ty) continue;
        a.startStep(nx, ny, 8);
        return;
      }
      return;
    }
    default: return;
  }
}
