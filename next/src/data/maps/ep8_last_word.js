// The Last Word (28 x 24, dungeon, tint violet and dark 0.2; after eraser_defeated a warm gold lift). EPISODE8_PLAN 4.8;
// exact cells in docs/MAPS_EP8_B.md. The heart of the Library: shelves rising out of sight on every side (the wall band,
// rows 0..6), a round floor of script mosaic, the dais of gold script in the middle.
//
//   The great book great_lexicon (4 x 3 art, 12..15, rows 5..7; its event solid on 12..15,7) under the star dome star_dome
//   (an overhead piece, 11..17, rows 2..5); the lectern (15,8) and the Librarian's place at it, `lectern` (14,9); the first
//   shelf first_shelf (13..15,12) at the dais's foot. Entry (14,20) by the stair word_down (13..15,21) from floor III's
//   keyhole landing, which it also goes back to (it lands at 17,9 there): always present, so a party that lost the fight and
//   woke at the entry can walk out to rest. eraser_trig (row 17) stops the party on party_stop (14,14). Vex comes up the
//   gallery stair on the east (vex_gallery 22,13) to vex_stop (15,13). Enter triggers replay eraser_after, last_choice and
//   last_page on a reload (each guards itself); lectern_trig (13..15,10) asks last_choice again after two Nos. After
//   eraser_defeated, the lift square_return (5,13) down to the Scriptorium's Library gate (its arrival runs
//   scriptorium_open). From page_shelved the Scriptorium's lexicon_door lands on the dais (14,8).
import { door, object, trigger, enter, stoneStairs } from './_kit.js';
import { libGrid, lift, LIBRARY_GATE } from './ep8_library_f1.js';

const W = 28, H = 24;
const S = libGrid(W, H, '#');
const { set, box } = S;

// the round floor: an ellipse round (13.5, 14), the dais in its middle
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const dx = (x - 13.5) / 11.4, dy = (y - 14) / 7.6;
  if (dx * dx + dy * dy <= 1 && y >= 7) set(x, y, 'm');
}
box(9, 7, 18, 11, 'g');                    // the dais of gold script round the great book
box(13, 21, 15, 21, 'm');                  // the stair down (word_down)
const ground = S.rows();

const decor = [
  { t: 'pillar', x: 7, y: 9 }, { t: 'pillar', x: 20, y: 9 }, { t: 'pillar', x: 7, y: 18 }, { t: 'pillar', x: 20, y: 18 },
  { t: 'booktower', x: 4, y: 11 }, { t: 'booktower', x: 23, y: 11 }, { t: 'booktower', x: 4, y: 16 },
  { t: 'booktower', x: 23, y: 16 }, { t: 'goldscroll', x: 10, y: 8 }, { t: 'goldscroll', x: 17, y: 8 },
  { t: 'lift_page', x: 5, y: 13, if: 'eraser_defeated' },
];

const events = [
  enter('lw_after', 'eraser_after'),
  enter('lw_choice', 'last_choice'),
  enter('lw_page', 'last_page'),
  door('word_down', 13, 21, ['ep8_library_f3', 17, 9, 'down'], { w: 3, kind: 'stairs' }),
  trigger('eraser_trig', 3, 17, 22, 1, 'eraser', { if: 'name_told', ifNot: 'eraser_defeated' }),
  trigger('lectern_trig', 13, 10, 3, 1, 'last_choice', { if: 'keeper_named', ifNot: ['ending_return', 'ending_choose'] }),
  object('great_lexicon', 12, 7, 'great_lexicon', { w: 4, state: 0, text: 'ep8_great_lexicon', ifNot: 'lexicon_restored' }),
  object('great_lexicon_open', 12, 7, 'great_lexicon', { w: 4, state: 3, text: 'ep8_great_lexicon', if: 'lexicon_restored', ifNot: 'page_shelved' }),
  object('great_lexicon_last', 12, 7, 'great_lexicon', { w: 4, state: 6, text: 'ep8_great_lexicon', if: 'page_shelved' }),
  // the dome is overhead art on the wall band (11..17, rows 2..5); its cells (w 7, h 2) reach row 6, so the line is read facing up
  // from the dais floor below it (11,7), (16,7), (17,7). The art still stands at (11,5): w and h are the event's cells only
  object('star_dome', 11, 5, 'star_dome', { w: 7, h: 2, solid: false, state: 0, text: 'ep8_star_dome', ifNot: 'eighth_star' }),
  object('star_dome_lit', 11, 5, 'star_dome', { w: 7, h: 2, solid: false, state: 3, text: 'ep8_star_dome', if: 'eighth_star' }),
  object('lectern_obj', 15, 8, 'lectern', { text: 'ep8_lectern' }),
  object('first_shelf', 13, 12, 'ep8_first_shelf', { w: 3, state: 0, text: 'ep8_first_shelf', ifNot: 'page_shelved' }),
  object('first_shelf_full', 13, 12, 'ep8_first_shelf', { w: 3, state: 1, text: 'ep8_first_shelf', if: 'page_shelved' }),
  lift('square_return', 5, 13, LIBRARY_GATE, { if: 'eraser_defeated' }),
];

export default {
  id: 'ep8_last_word', name: 'The Last Word', area: 'dungeon',
  music: null, ambience: 'library_hush', tileset: 'ep8',
  lighting: { tint: [{ if: 'eraser_defeated', id: 'hollow_dawn' }, { id: 'violet' }], dark: 0.2 },
  under: 'void_violet',
  legend: { _: 'void_violet', m: 'scriptmosaic', g: 'goldscript', '#': 'book_tower_top', '|': 'book_tower_face',
    o: 'book_tower_out_face', v: 'book_tower_out_top', '.': 'scriptmosaic' },
  ground,
  overlays: stoneStairs(13, 15, 21),
  decor,
  overhead: [],
  events,
  exits: [],
  marks: {
    start: [14, 20], entry: [14, 20],
    dome: [14, 7], dais: [14, 8], lectern: [14, 9], book_front: [14, 10],
    shelf: [14, 12], nox_shelf: [12, 12], shelf_stage: [14, 14], shelf_stage_m: [13, 14], shelf_stage_b: [15, 14],
    nox_spot: [12, 13], vex_stop: [15, 13], vex_gallery: [22, 13],
    party_stop: [14, 14], party_stop_m: [13, 14], party_stop_b: [15, 14],
    square_door: [6, 13],
  },
  start: { x: 14, y: 20, dir: 'up' },
};
