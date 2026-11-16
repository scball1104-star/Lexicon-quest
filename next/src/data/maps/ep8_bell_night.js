// The bell tower at night (EPISODE8_PLAN 4.9): Episode 1's cold-open map (bell_tower.js), imported read-only and returned
// under its own id. bell_tower.js exports its whole module as the default (and TOLL_STEPS, TOP_STEP, BELLS), so nothing is
// copied by hand: the ground, overlays, decor, lights and marks are the cold open's own objects, and only the events change.
// The cold open's map and its scenes are never touched (the toll_*/thirteenth_toll triggers are dropped here, not edited).
//
//   trig_toll_1 .. trig_toll_12 on TOLL_STEPS (bottom to top) run the pack's ep8_toll_1 .. ep8_toll_12 (each guards itself:
//     step n only after step n-1); trig_thirteenth on TOP_STEP (12,6) and the enter trigger bell_night_enter both run
//     thirteenth_name (the arrival: Mira and Bram spawned on the beam, no box; the thirteenth after the twelfth toll).
//   marks: the cold open's stair_foot (12,36) = story.js BELL_FOOT, bells (12,4), top (12,6); plus mira_beam (10,4) and
//     bram_beam (14,4) on the bell beam (the belfry floor under the bells), and keep_one (12,4), the beam's carved words.
//   keep_one (12,4): the bell beam's decal KEEP ONE, an inspect (ep8_keep_one) between the two of them.
//   party: 'solo' (map contract, STAGING_EP8 section 2): the followers do not climb, the cold open's solo climb. The field has
//     no such switch yet; E8-scene-ui or E8-world owns honoring it (a stub field until then).
import BELL from './bell_tower.js';
import { TOLL_STEPS, TOP_STEP } from './bell_tower.js';
import { trigger, enter, sign } from './_kit.js';

const keep = (BELL.events || []).filter((e) => e.type !== 'trigger');
const events = [
  enter('bell_night_enter', 'thirteenth_name'),
  ...TOLL_STEPS.map(([x, y], i) => trigger(`trig_toll_${i + 1}`, x, y, 1, 1, `ep8_toll_${i + 1}`)),
  trigger('trig_thirteenth', TOP_STEP[0], TOP_STEP[1], 1, 1, 'thirteenth_name'),
  sign('keep_one', 12, 4, 'ep8_keep_one', { solid: false, dir: 'up' }),
  ...keep,
];

export default {
  ...BELL,
  id: 'ep8_bell_night', name: 'The Bell Tower',
  music: null, ambience: null,
  lighting: { ...BELL.lighting, tint: 'night' },
  party: 'solo',
  events,
  marks: { ...BELL.marks, mira_beam: [10, 4], bram_beam: [14, 4], keep_one: [12, 4] },
};
