// A save inside a pack map never lands in the test town: field.loadMap lands the party on a real map near the pack's door instead.
const W = ['valley', 1, 28, 'right'], N = ['valley', 21, 10, 'down'], S = ['valley', 23, 34, 'down'];
/** [map, x, y, dir] on a real map for an x1 map, or null. */
export const landing = (id) => (/^x1_(terrace|orrery|cellar)/.test(id) ? N : /^x1_(mill|culvert)/.test(id) ? S : /^x1_/.test(id) ? W : null);
