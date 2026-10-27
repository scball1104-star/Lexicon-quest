// The Deep Stacks: landing templates (DEEP_STACKS_PLAN 2.3 and 4). Every tenth floor is a landing: no foes, one red
// chest, the plaque with the floor's name on the north face, the stair down. One hand-made template per band; bands
// three to five plug theirs in through gen.js registerBand({ landing }).
//
// A landing is a whole small map, not a prefab: `rows` hold walls ('#'), faces ('|') and floor chars exactly like a
// hand-made map before wallDepth(). Marks: A the arrival cell (stairs_up in the face above), S the stairs cell
// (stairs_down in the face above, the door event on the face cell), P the plaque cell (the glyph sits in the face
// above it), C the one red chest. Dressing lists use the same shapes as prefabs.js, in map coordinates.

const row = (...parts) => parts.join('');
const W = '#';

export const LANDINGS = {
  catalogue: {
    id: 'landing_catalogue',
    rows: [
      row(W.repeat(26)),
      row(W.repeat(26)),
      row(W.repeat(26)),
      row('###', '||||||||||||', '###########'),
      row('###', '||||||||||||', '###', '||||||', '##'),
      row('###', '..A...cc.P..', '###', '||||||', '##'),
      row('###', '......cc....', '###', '..S...', '##'),
      row('###', '......cc....', '...', '......', '##'),
      row('###', '......cc....', '...', '......', '##'),
      row('###', '......cc....', '###', '......', '##'),
      row('###', '......cc..C.', '###########'),
      row(W.repeat(26)),
      row(W.repeat(26)),
      row(W.repeat(26)),
      row(W.repeat(26)),
      row(W.repeat(26)),
    ],
    decor: [['candelabra', 3, 5], ['candelabra', 14, 5], ['pillar_oak', 3, 10], ['pillar_oak', 14, 10], ['reading_table', 4, 8], ['lectern', 12, 7],
      ['book_stack', 14, 9], ['candelabra', 18, 6], ['candelabra', 23, 6], ['book_stack', 23, 9]],
    face: [['wall_drawers_l', 7, 3], ['wall_drawers_m', 8, 3], ['wall_drawers_r', 9, 3], ['wall_glyph_revealed', 12, 3], ['wall_shelf_l', 13, 3], ['wall_shelf_r', 14, 3],
      ['wall_shelf_l', 22, 4], ['wall_shelf_r', 23, 4]],
    decals: [['index_cards', 5, 9], ['index_cards', 11, 6], ['roots_1', 3, 7], ['ink_puddle_0', 19, 9]],
    overhead: [['hanging_lamp', 8, 7]],
    lights: [[8, 8, 3, '#ffd9a0'], [5, 5, 3, '#ffd9a0'], [20, 6, 3, '#ffd9a0']],
  },
  cellars: {
    id: 'landing_cellars',
    rows: [
      row(W.repeat(26)),
      row(W.repeat(26)),
      row(W.repeat(26)),
      row('###', '||||||||||||', '###########'),
      row('###', '||||||||||||', '###', '||||||', '##'),
      row('###', '..A......P..', '###', '||||||', '##'),
      row('###', '............', '###', '..S...', '##'),
      row('###', '....mm......', '...', '......', '##'),
      row('###', '....mmww....', '...', '......', '##'),
      row('###', '......ww....', '###', '......', '##'),
      row('###', '..........C.', '###########'),
      row(W.repeat(26)),
      row(W.repeat(26)),
      row(W.repeat(26)),
      row(W.repeat(26)),
      row(W.repeat(26)),
    ],
    decor: [['brazier_lit', 3, 5], ['brazier_lit', 14, 5], ['root_column', 3, 9], ['cairn', 14, 9], ['brazier_lit', 18, 6], ['brazier_lit', 23, 6], ['crate', 23, 9], ['barrel', 18, 9]],
    face: [['root_drape', 7, 3], ['wall_ink_seep', 8, 3], ['wall_glyph_revealed', 12, 3], ['wall_shelf_l', 13, 3], ['wall_shelf_r', 14, 3], ['root_drape', 22, 4], ['root_drape', 23, 4]],
    decals: [['reeds_0', 8, 7], ['reeds_1', 6, 9], ['roots_0', 11, 6], ['roots_2', 4, 10], ['tuft_0', 9, 9], ['ink_puddle_1', 20, 9]],
    overhead: [],
    lights: [[3, 5, 5, '#ffb070'], [14, 5, 5, '#ffb070'], [18, 6, 5, '#ffb070'], [23, 6, 5, '#ffb070']],
  },
};

const MARKS = { A: 'arrival', S: 'stairs', P: 'plaque', C: 'chest' };

/** Parse a landing template: rows with the marks stripped, and the mark cells. Cached on the template. */
export function parseLanding(t) {
  if (t._parsed) return t._parsed;
  const h = t.rows.length, w = t.rows[0].length;
  const marks = {};
  const rows = [];
  for (let y = 0; y < h; y++) {
    if (t.rows[y].length !== w) throw new Error(`landing ${t.id}: row ${y} is ragged`);
    let out = '';
    for (let x = 0; x < w; x++) {
      const ch = t.rows[y][x];
      if (MARKS[ch]) { marks[MARKS[ch]] = [x, y]; out += '.'; } else out += ch;
    }
    rows.push(out);
  }
  for (const k of Object.values(MARKS)) if (!marks[k]) throw new Error(`landing ${t.id}: no ${k} mark`);
  for (const k of ['arrival', 'stairs', 'plaque']) {
    const [x, y] = marks[k];
    if (rows[y - 1][x] !== '|') throw new Error(`landing ${t.id}: ${k} mark at ${x},${y} is not under a face cell`);
  }
  t._parsed = { id: t.id, w, h, rows, marks, decor: t.decor || [], face: t.face || [], decals: t.decals || [], overhead: t.overhead || [], lights: t.lights || [] };
  return t._parsed;
}
