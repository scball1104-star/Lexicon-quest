// Episode 5, "The Last Prophecy": the Ledger of Names rows (plan 5.3), PLACES.saffron and REACHED.saffron. register()
// pushes the rows onto LEDGER (by id, once), adds the place and the shop counter that has no row. Counted only when
// EP5_LIVE (an explicit { ep5Live } option wins, for tests): with the switch off the pack can still load through the
// ?ep=5 developer entry, and the title counter must not change for players.
// The hero's row stays unkept (EPISODE1 beat 21; the chart finds the hero's star, but the Ledger keeps that for later).

import { LEDGER, PLACES, REACHED, EXCLUDED } from '../ledger.js';
import { EP5_LIVE } from '../../game/episodes.js';

const row = (id, flag, o = {}) => ({ id, name: o.name || id[0].toUpperCase() + id.slice(1), place: 'saffron', ep: 5, flag, ...o });

export const EP5_LEDGER = [
  row('sel', 'met_sel', { why: (has) => (has('sel_walked_in') ? 'Walked into the Well she had stayed out of for twenty years.'
    : 'Wrote to you in star ink, and asked you to come before the last night.') }),
  row('yara', 'ep5_morning_done', { why: 'Carried a letter across the sea, and carried you back over it.' }),
  row('kamal', 'testimony_kamal', { why: 'Said the water tells the truth when the wind is still. It did.' }),
  row('nasrin', 'testimony_nasrin', { why: 'Kept the old law, Shelter, Truth, Return, and read the endings aloud anyway.' }),
  row('laleh', 'star_reading_done', { why: 'Kept an empty space in her charts, and taught Mira to turn the rings.' }),
  row('omar', 'tent_rested', { why: 'Set out safe stones every dawn for caravans that never came.' }),
  row('yasmin', 'haven_arrived', { why: 'Told you the waystone had never been wrong. Then it was.' }),
  row('hassan', 'haven_arrived', { why: 'Tunes little bells so caravans can find the way home.' }),
  row('tamir', 'roads_returned', { hide: (has) => !has('roads_returned'), why: "Turned back for one lost stranger, and walked home by his daughter's star." }),
  row('ishra', 'roads_returned', { hide: (has) => !has('sel_memory_3'), why: 'Left a page under the sand: the future is not a single answer.' }),
];

export function register(opts) {
  const live = opts && typeof opts.ep5Live === 'boolean' ? opts.ep5Live : EP5_LIVE;   // the pack entry passes the engine here
  if (!live) return;
  for (const r of EP5_LEDGER) if (!LEDGER.some((x) => x.id === r.id)) LEDGER.push(r);
  if (!PLACES.saffron) PLACES.saffron = 'Saffron Haven';
  if (!REACHED.saffron) REACHED.saffron = 'haven_arrived';
  if (!EXCLUDED.ep5_innkeeper) EXCLUDED.ep5_innkeeper = 'a shop counter';
}

export default register;
