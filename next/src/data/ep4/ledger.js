// Episode 4, "The Sunken Keep": the Ledger of Names rows (plan 5.3), PLACES.valewyn and REACHED.valewyn. register()
// pushes the rows onto LEDGER (by id, once), adds the place, the alias of the Regent's two records and the shop counters
// that have no row. Counted only when EP4_LIVE (an explicit { ep4Live } option wins, for tests): with the switch off the
// pack can still load through the ?ep=4 developer entry, and the title counter must not change for players.
// The hero's row stays unkept (EPISODE1 beat 21; Episode 4 signs it, but the Ledger keeps that for later).

import { LEDGER, PLACES, REACHED, ALIASES, EXCLUDED } from '../ledger.js';
import { EP4_LIVE } from '../../game/episodes.js';

const row = (id, flag, o = {}) => ({ id, name: o.name || id[0].toUpperCase() + id.slice(1), place: 'valewyn', ep: 4, flag, ...o });

export const EP4_LEDGER = [
  row('lyra', 'lyra_named', { name: 'Lyra', hide: (has) => !has('lyra_named'), why: 'Signed under you in the Witness Book, and her ink held.' }),
  row('hale', 'testimony_hale', { name: 'Captain Hale', why: 'Swore the decree bore the seal, not her hand. Then shouted her name.' }),
  row('dorian', 'testimony_dorian', { why: "Knew the old king's hand, and said the sealed copy was not it." }),
  row('joss', 'met_joss', { why: 'Handed over the crank he had kept and not used for twelve years.' }),
  row('ada', 'ep4_morning_done', { why: 'Carried a decree that would not dry three days, to the people who could read it.' }),
  row('nilo', 'nilo_done', { why: 'Got his boat bell back. Now the boats know he is there.' }),
  row('linn', 'vw_restored', { why: 'Carried the records back down from the top shelf.' }),
  row('vance', 'vw_restored', { why: 'Tore the last dry order off the board, and it was blank.' }),
  row('sori', 'vw_restored', { why: 'Jumped every stone in Valewyn the day they all came out of the water.' }),
];

export function register(opts) {
  const live = opts && typeof opts.ep4Live === 'boolean' ? opts.ep4Live : EP4_LIVE;   // the pack entry passes the engine here
  if (!live) return;
  for (const r of EP4_LEDGER) if (!LEDGER.some((x) => x.id === r.id)) LEDGER.push(r);
  if (!PLACES.valewyn) PLACES.valewyn = 'Valewyn';
  if (!REACHED.valewyn) REACHED.valewyn = 'vw_arrived';
  Object.assign(ALIASES, { regent_e: 'lyra', lyra_n: 'lyra' });
  for (const id of ['ep4_innkeeper', 'ep4_smith']) if (!EXCLUDED[id]) EXCLUDED[id] = 'a shop counter';
}

export default register;
