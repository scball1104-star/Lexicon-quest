// Episode 8, "The Last Word": the Ledger of Names rows (plan 5.3), the hero's own keep, PLACES.scriptorium and
// PLACES.first_library, REACHED for both, and the aliases and exclusions for the second records. register() pushes the
// rows onto LEDGER (by id, once) and gives the hero's row its keep on hero_kept (the row is Episode 1's: its `kept` and
// `why` are swapped, and the shipped values kept for unregister()). Counted only when EP8_LIVE (an explicit { ep8Live }
// option wins, for tests): with the switch off the pack can still load through the ?ep=8 developer entry, and the title
// counter must not change for players.
// The First Keeper's row shows "The First Keeper" (his own name is never shown: EPISODE8 choice 26) and is hidden until he
// is named again (a row the Ledger shows early would name the Librarian as him).

import { LEDGER, PLACES, REACHED, ALIASES, EXCLUDED } from '../ledger.js';
import * as EPISODES from '../../game/episodes.js';

const row = (id, flag, o = {}) => ({ id, name: o.name || id[0].toUpperCase() + id.slice(1), place: 'scriptorium', ep: 8, flag, ...o });
const either = (a, b) => (has) => has(a) || has(b);
const OPEN = 'scriptorium_open';

export const HERO_KEEP = { kept: (has) => has('hero_kept'), why: 'Answered to their own name, and kept it.' };

export const EP8_LEDGER = [
  row('first_keeper', 'night_read', { name: 'The First Keeper', place: 'first_library', hide: (has) => !has('keeper_named'),
    why: 'Read his own line, and said it was his.' }),
  row('elowen', 'concordance_lit', { kept: either('concordance_lit', OPEN), why: 'Remembered a name she gave.' }),
  row('ione', 'testimony_ione', { kept: either('testimony_ione', OPEN), why: 'Kept the living catalogue, and recorded both joy and loss.' }),
  row('fen', 'testimony_fen', { kept: either('testimony_fen', OPEN), why: 'Said out loud there was a list no one was allowed to forget.' }),
  row('quinn', 'drift_done', { kept: either('drift_done', OPEN), why: 'Ran the loose pages home, and read out the oldest line.' }),
  row('sorel', OPEN, { why: 'Restored torn volumes, and said to read the oldest histories.' }),
  row('arun', OPEN, { why: 'Lit a candle every time somebody told the truth.' }),
  row('meya', OPEN, { why: 'Wrote her own name on the second page.' }),
];

const heroWas = {};   // the hero row's shipped kept/why
export function register(opts) {
  const live = opts && typeof opts.ep8Live === 'boolean' ? opts.ep8Live : EPISODES.EP8_LIVE === true;
  if (!live) return;
  for (const r of EP8_LEDGER) if (!LEDGER.some((x) => x.id === r.id)) LEDGER.push(r);
  const hero = LEDGER.find((x) => x.id === 'hero');
  if (hero && hero.kept !== HERO_KEEP.kept) {
    Object.assign(heroWas, { kept: hero.kept, why: hero.why });
    hero.kept = HERO_KEEP.kept;
    hero.why = HERO_KEEP.why;
  }
  if (!PLACES.scriptorium) PLACES.scriptorium = 'The Scriptorium';
  if (!PLACES.first_library) PLACES.first_library = 'The First Library';
  if (!REACHED.scriptorium) REACHED.scriptorium = 'scriptorium_arrived';
  if (!REACHED.first_library) REACHED.first_library = 'library_entered';
  for (const [a, to] of [['ep8_librarian', 'first_keeper'], ['eraser_v', 'first_keeper'], ['first_keeper_m', 'first_keeper'],
    ['elowen_m', 'elowen'], ['vex8', 'vex']]) if (!ALIASES[a]) ALIASES[a] = to;
  if (!EXCLUDED.ep8_innkeeper) EXCLUDED.ep8_innkeeper = 'a shop counter';
  if (!EXCLUDED.ep8_shopkeeper) EXCLUDED.ep8_shopkeeper = 'a shop counter';
}

/** Put the hero's row and the tables back (tests). */
export function unregister() {
  for (const r of EP8_LEDGER) { const i = LEDGER.indexOf(r); if (i >= 0) LEDGER.splice(i, 1); }
  const hero = LEDGER.find((x) => x.id === 'hero');
  if (hero && 'kept' in heroWas) { hero.kept = heroWas.kept; hero.why = heroWas.why; }
}

export default register;
