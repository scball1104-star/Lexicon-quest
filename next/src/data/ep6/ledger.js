// Episode 6, "The Skybound Isles": the Ledger of Names rows (plan 5.3), PLACES.zephyr and REACHED.zephyr. register()
// pushes the rows onto LEDGER (by id, once), adds the place and the counters that have no row. Counted only when EP6_LIVE
// (an explicit { ep6Live } option wins, for tests): with the switch off the pack can still load through the ?ep=6
// developer entry, and the title counter must not change for players.
// The hero's row stays unkept (EPISODE6 choice 5: the first page is found and read, half of it, and Vex keeps it).

import { LEDGER, PLACES, REACHED, EXCLUDED } from '../ledger.js';
import * as EPISODES from '../../game/episodes.js';

const row = (id, flag, o = {}) => ({ id, name: o.name || id[0].toUpperCase() + id.slice(1), place: 'zephyr', ep: 6, flag, ...o });

export const EP6_LEDGER = [
  row('aeris', 'met_aeris', { why: (has) => (has('isles_restored') ? 'Turned back for the one she left, and read every name at dawn.'
    : 'Followed the chart home once, and kept the chart room so nobody would forget.') }),
  row('liora', 'testimony_liora', { kept: (has) => has('testimony_liora') || has('isles_restored'),
    why: 'Met every arrival at dock four, until the right one came.' }),
  row('bennet', 'testimony_bennet', { why: 'Kept the old rule: an honest captain turns back when a beacon calls.' }),
  row('suri', 'testimony_suri', { why: 'Drew every chart in the chart room, and said so when they lied.' }),
  row('ilex', 'zephyr_arrived', { why: 'Mends skybridge joints, and checks every brass pin twice.' }),
  row('nova', 'zephyr_arrived', { why: 'Checks the cargo nets when the afternoon winds build.' }),
  row('piri', 'zephyr_arrived', { why: 'Sorts the letters at the landing, and sent a grey bird to your shutter.' }),
  row('thea', 'zephyr_arrived', { why: 'Tends the gardens that float where the rain catches under the wind rails.' }),
  row('pippa', 'pippa_home', { name: 'Pippa Voss', hide: (has) => !has('pippa_found'),
    why: 'Held the light in the storm for a month, and came home to the right dock.' }),
];

export function register(opts) {
  const live = opts && typeof opts.ep6Live === 'boolean' ? opts.ep6Live : EPISODES.EP6_LIVE === true;
  if (!live) return;
  for (const r of EP6_LEDGER) if (!LEDGER.some((x) => x.id === r.id)) LEDGER.push(r);
  if (!PLACES.zephyr) PLACES.zephyr = 'Zephyr Landing';
  if (!REACHED.zephyr) REACHED.zephyr = 'zephyr_arrived';
  if (!EXCLUDED.ep6_innkeeper) EXCLUDED.ep6_innkeeper = 'a shop counter';
  if (!EXCLUDED.bennet_winch) EXCLUDED.bennet_winch = 'see bennet';
}

export default register;
