// Episode 7, "The Vanishing World": the Ledger of Names rows (plan 5.3), PLACES.palehaven and REACHED.palehaven, and the
// proposed Vex row (EPISODE7 choice 21, place "The Road"). register() pushes the rows onto LEDGER (by id, once), adds the
// places and the aliases and exclusions for the second records. Counted only when EP7_LIVE (an explicit { ep7Live } option
// wins, for tests): with the switch off the pack can still load through the ?ep=7 developer entry, and the title counter
// must not change for players.
// The hero's row stays unkept (EPISODE7 choice 11, EPISODE8 ask 8: the first page is whole, and Vex keeps it).
// Nox's and Marten's rows are hidden until their names are read on the page (a name the Ledger shows early is a spoiler).

import { LEDGER, PLACES, REACHED, ALIASES, EXCLUDED } from '../ledger.js';
import * as EPISODES from '../../game/episodes.js';

const row = (id, flag, o = {}) => ({ id, name: o.name || id[0].toUpperCase() + id.slice(1), place: 'palehaven', ep: 7, flag, ...o });
const either = (a, b) => (has) => has(a) || has(b);

export const EP7_LEDGER = [
  row('nox', 'nox_named', { hide: (has) => !has('nox_named'),
    why: (has) => (has('doors_reopened') ? "Read her brother's letter to the town, and opened every door she had shut."
      : 'Wrote your name the night you came to her. Her own came back on the same page.') }),
  row('marten', 'marten_named', { place: 'willowmere', hide: (has) => !has('marten_named'),
    why: 'Carried you down the White Road at his sister\'s asking. He crossed his sevens.' }),
  row('bryn', 'palehaven_arrived', { why: 'Tends both gates, and watches the fires for the colour of a lost page.' }),
  row('maera', 'palehaven_arrived', { why: 'Keeps warm infusions for the patrols, and the moss that knows who will return.' }),
  row('torr', 'palehaven_arrived', { why: 'Wrote the missing streets in his book so they would stay.' }),
  row('eira', 'testimony_eira', { kept: either('testimony_eira', 'doors_reopened'),
    why: 'Blew the glass for the last lantern, and asked for her sister\'s letter back.' }),
  row('sol', 'testimony_sol', { kept: either('testimony_sol', 'doors_reopened'),
    why: 'Tied twine across the road where it went white, so someone could follow.' }),
  row('mirael', 'testimony_mirael', { kept: either('testimony_mirael', 'doors_reopened'),
    why: 'Said out loud that the dead never asked anyone to lock the doors.' }),
  row('vex', 'vex_name_whole', { name: 'Vex Quill', place: 'the_road',
    why: 'His own name, whole in the ice.' }),
];

export function register(opts) {
  const live = opts && typeof opts.ep7Live === 'boolean' ? opts.ep7Live : EPISODES.EP7_LIVE === true;
  if (!live) return;
  for (const r of EP7_LEDGER) if (!LEDGER.some((x) => x.id === r.id)) LEDGER.push(r);
  if (!PLACES.palehaven) PLACES.palehaven = 'Palehaven';
  if (!PLACES.the_road) PLACES.the_road = 'The Road';
  if (!REACHED.palehaven) REACHED.palehaven = 'palehaven_arrived';
  if (!REACHED.the_road) REACHED.the_road = 'vex_carved';
  for (const [a, to] of [['keeper', 'nox'], ['nox_t', 'nox'], ['eira_forge', 'eira'], ['sol_waystation', 'sol']]) if (!ALIASES[a]) ALIASES[a] = to;
  if (!EXCLUDED.ep7_innkeeper) EXCLUDED.ep7_innkeeper = 'a shop counter';
}

export default register;
