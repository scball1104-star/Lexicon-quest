// The Chapel's bell tower, inside, at night: the cold open "The Thirteenth Toll" (H1; story/ep1.js toll_1..toll_12,
// thirteenth_toll; scenes/prologue.js hands a New Game to `stair_foot`; no door in or out). Three switchback flights
// up a dark shaft to the belfry. Each toll step is followed by a plain step so a held direction (which starts one
// more step on the frame a trigger fires) lands off the next trigger. Staging: docs/story/STAGING.md.
import { rows, trigger, light, grid, put } from './_kit.js';

const g = grid(25, 39, '#');
put(g, 8, 2, '|'.repeat(9)); put(g, 8, 3, '|'.repeat(9));                 // belfry faces
for (let y = 4; y <= 6; y++) put(g, 8, y, '.'.repeat(9));                  // belfry floor
for (let y = 7; y <= 14; y++) put(g, 12, y, '.');                          // flight 3
put(g, 8, 13, '||||'); put(g, 8, 14, '||||'); put(g, 8, 15, '.....'); put(g, 8, 16, '.....');   // landing 2
for (let y = 17; y <= 24; y++) put(g, 8, y, '.');                          // flight 2
put(g, 9, 23, '||||'); put(g, 9, 24, '||||'); put(g, 8, 25, '.....'); put(g, 8, 26, '.....');   // landing 1
for (let y = 27; y <= 34; y++) put(g, 12, y, '.');                         // flight 1
for (const y of [33, 34]) { put(g, 9, y, '|||'); put(g, 13, y, '|||'); }   // the foot's back wall
for (let y = 35; y <= 37; y++) put(g, 9, y, '.'.repeat(7));                // the foot

/** The twelve toll steps, bottom to top (ep1.js TOLL_FLAGS order). */
export const TOLL_STEPS = [[12, 34], [12, 32], [12, 30], [12, 28], [8, 24], [8, 22], [8, 20], [8, 18], [12, 14], [12, 12], [12, 10], [12, 8]];
/** The first belfry cell: the thirteenth toll. */
export const TOP_STEP = [12, 6];

const steps = [];
for (let y = 7; y <= 14; y++) steps.push([12, y]);
for (let y = 17; y <= 24; y++) steps.push([8, y]);
for (let y = 27; y <= 34; y++) steps.push([12, y]);
const warm = '#ffb866';
/** H6: the twelve bells, three by two on each belfry wall. */
export const BELLS = [8, 9, 10, 14, 15, 16].flatMap((x) => [[x, 2], [x, 3]]);

export default {
  id: 'bell_tower', name: 'The Bell Tower', area: 'interior',
  music: null, ambience: null, tileset: 'interior',
  lighting: { tint: 'night', dark: 0.8 },
  ambientFx: ['motes'],
  under: 'stone_floor',
  legend: { '#': 'interior_stone_top', '|': 'interior_stone_face', '.': 'stone_floor' },
  ground: rows(g),
  overlays: [
    ...steps.map(([x, y]) => ({ t: 'stairs_stone_m', x, y })), { t: 'step_stone', x: 12, y: 35 },
    { t: 'window_round', x: 12, y: 2 }, { t: 'window_in_night', x: 11, y: 2 }, { t: 'window_in_night', x: 13, y: 2 },
    { t: 'gallery_window', x: 10, y: 13 }, { t: 'gallery_window', x: 11, y: 23 },
    { t: 'window_in_night', x: 10, y: 33 }, { t: 'window_in_night', x: 14, y: 33 },
    { t: 'in_barrel', x: 15, y: 37 }, { t: 'in_crate', x: 9, y: 37 }, { t: 'in_sacks', x: 10, y: 37 },
  ],
  decor: [
    ...BELLS.map(([x, y]) => ({ t: 'prop_ferry_bell', x, y })),
    { t: 'pillar', x: 8, y: 6 }, { t: 'pillar', x: 16, y: 6 },
    { t: 'candelabra', x: 12, y: 25 }, { t: 'candelabra', x: 8, y: 15 },
    { t: 'candelabra', x: 9, y: 35 }, { t: 'candelabra', x: 15, y: 35 },
  ],
  overhead: [],
  events: [
    ...TOLL_STEPS.map(([x, y], i) => trigger(`trig_toll_${i + 1}`, x, y, 1, 1, `toll_${i + 1}`)),
    trigger('trig_thirteenth', TOP_STEP[0], TOP_STEP[1], 1, 1, 'thirteenth_toll'),
    light('l_foot_w', 9, 35, 3, warm), light('l_foot_e', 15, 35, 3, warm), light('l_sconce_1', 13, 31, 3, warm),
    light('l_land_1', 12, 25, 3, warm), light('l_moon_1', 11, 24, 3), light('l_sconce_2', 7, 21, 3, warm),
    light('l_land_2', 8, 15, 3, warm), light('l_moon_2', 10, 14, 3), light('l_sconce_3', 13, 11, 3, warm),
    light('l_moon_top', 12, 4, 5), light('l_moon_top_w', 9, 4, 3), light('l_moon_top_e', 15, 4, 3),
  ],
  exits: [],
  marks: { stair_foot: [12, 36], bells: [12, 4], top: [12, 6] },
  start: { x: 12, y: 36, dir: 'up' },
};
