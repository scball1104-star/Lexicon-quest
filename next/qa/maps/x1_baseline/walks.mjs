// Shared by capture.mjs and ../x1_hub.test.mjs: the five maps, the flag sets of the walk oracle and the compact encoding of a walk.
import { EP1_DONE_FLAGS } from '../../../src/game/state.js';

export const HUB_MAPS = ['valley', 'willowmere', 'archive_f1', 'archive_f2', 'archive_f3'];

/** The flag sets of the oracle. `[]` is a fresh game (every gate shut); ep1_done is the Episode 1 credits save. */
export const FLAG_SETS = {
  ep1_fresh: [],
  ep1_mid: ['intro_done', 'met_mael', 'mira_joined', 'bram_joined', 'left_town', 'archive_entered', 'first_fight_done'],
  ep1_done: [...EP1_DONE_FLAGS],
  ep2: [...EP1_DONE_FLAGS, 'ep2_started', 'crossing_done'],
  ep3: [...EP1_DONE_FLAGS, 'ep3_started'],
};

/** A walk report reduced to what the oracle compares: reachable cells (row runs), event reach, mark reach, the log. */
export function encodeWalk(r) {
  const rows = new Map();
  for (const c of r.reachable) { const [x, y] = c.split(',').map(Number); if (!rows.has(y)) rows.set(y, []); rows.get(y).push(x); }
  const reach = [...rows.keys()].sort((a, b) => a - b).map((y) => {
    const xs = rows.get(y).sort((a, b) => a - b), runs = [];
    for (let i = 0; i < xs.length;) { let j = i; while (j + 1 < xs.length && xs[j + 1] === xs[j] + 1) j++; runs.push(xs[i] === xs[j] ? `${xs[i]}` : `${xs[i]}-${xs[j]}`); i = j + 1; }
    return `${y}:${runs.join(',')}`;
  });
  return {
    reach, cells: r.reachable.length,
    events: r.events.map((e) => `${e.id}:${e.reached ? 1 : 0}`),
    marks: r.marks.map((m) => `${m.name}@${m.x},${m.y}:${m.walkable ? 1 : 0}${m.reached ? 1 : 0}`),
    unreached: r.unreached, opened: [...r.opened].sort(), log: r.log,
  };
}
