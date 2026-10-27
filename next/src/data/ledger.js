// The Ledger of Names (H2; the contract and the table in words: docs/LEDGER.md). Every named person in the live game
// and the ONE flag that keeps their name. Pure: no DOM, no engine, no pack file imported.
//   ledgerRows(flags, opts) -> [{ id, name, place, placeName, ep, kept, hidden, why }]   namesKept(flags, opts) -> { kept, total }
//   namesKeptInSaves(save) -> { kept, total, slot } | null                                counterLine(count) -> 'Names kept: 17 of 37'
// `flags` is a save's flags object or hasFlag(id); opts: heroName, x1 (X1_LIVE), ep3 (EP3_LIVE), regions (X1_REGIONS).
// Row r(id, place, ep, flag, { name, why, kept(has), hide(has), x1, region }): see the doc. One row here, one line there.
import { FLAGS } from './quests.js';
import { EP3_LIVE } from '../game/episodes.js';
import { X1_LIVE, X1_REGIONS } from './x1/live.js';

export const PLACES = { party: 'The Party', willowmere: 'Willowmere', valley: 'Willowmere Valley', wider: 'The Wider Valley', hollowmere: 'Hollowmere', emberpeak: 'Emberpeak' };
const NH = 'nh_restored';
const struck = (has) => has('ep3_started') && !has('garrick_named');   // Episode 3 opens with the Smith's name struck
const cap = (s) => s[0].toUpperCase() + s.slice(1);
const r = (id, place, ep, flag, o = {}) => ({ id, name: o.name || cap(id), place, ep, flag, ...o });

/** The table, in Ledger order. The hero's own name has no keep in Episodes 1 to 3 (EPISODE1 beat 21). */
export const LEDGER = [
  r('hero', 'party', 1, null, { kept: () => false }),
  r('mira', 'party', 1, 'archivore_defeated'),
  r('bram', 'party', 1, 'archive_entered'),
  r('hazel', 'willowmere', 1, 'hazel_farewell_done'),
  r('mael', 'willowmere', 1, 'returned_home', { name: 'Elder Mael', why: 'Opened the Register in the square and said what he feared.' }),
  r('oren', 'willowmere', 1, 'yard_fight_done'),
  r('hal', 'willowmere', 1, 'tess_letter_1_delivered'),
  r('tess', 'willowmere', 1, 'tess_quest_done'),
  r('wick', 'willowmere', 1, 'wick_tag_done'),
  r('lark', 'willowmere', 1, 'tess_letter_2_delivered'),
  r('nella', 'willowmere', 1, 'nella_bell_done'),
  r('edda', 'willowmere', 1, 'tess_letter_2_delivered'),
  r('holt', 'willowmere', 1, 'bram_joined', { name: 'Sergeant Holt', why: 'Held a name for Bram at the south gate.' }),
  r('garrick', 'willowmere', 1, 'garrick_farewell_done', { kept: (has) => has('garrick_farewell_done') && !struck(has), hide: struck }),
  r('iris', 'willowmere', 1, 'archivore_defeated'),
  r('pip', 'willowmere', 1, 'found_thirteenth_bell'),
  r('barnaby', 'willowmere', 1, 'ep1_complete', { why: 'Woke up after the credits.' }),
  r('pell', 'willowmere', 1, 'crates_done', { x1: true }),
  r('quill', 'valley', 1, 'hollow_cleared'),
  r('brindle', 'wider', 1, 'rollcall_done', { region: 'west' }),
  r('tamsin', 'wider', 1, 'crate_1_done', { region: 'west' }),
  r('ferrick', 'wider', 1, 'crate_3_done', { region: 'south' }),
  r('hesper', 'wider', 1, 'stars_done', { region: 'north' }),
  r('odo', 'wider', 1, 'list_song', { region: 'wild' }),
  r('yarrow', 'wider', 1, 'crate_2_done', { region: 'wild' }),
  r('corin', 'hollowmere', 2, NH),
  r('nico', 'hollowmere', 2, 'nico_crowns_done'),
  r('sava', 'hollowmere', 2, NH),
  r('lena', 'hollowmere', 2, 'testimony_lena'),
  r('tovin', 'hollowmere', 2, 'court_ferry_open'),
  r('orla', 'hollowmere', 2, 'fountain_done'),
  r('anwen', 'hollowmere', 2, 'testimony_anwen', { name: 'Sister Anwen' }),
  r('elian', 'hollowmere', 2, 'letter_answer_done', { why: 'Signed his reply to Mael as Mayor of Hollowmere.' }),
  r('aurel', 'hollowmere', 2, 'aurel_named', { hide: (has) => !has('aurel_named') }),
  r('wren', 'hollowmere', 2, 'last_route_done', { why: "Her lost-property shelf gave up a courier's satchel." }),
  r('fitch', 'hollowmere', 2, NH),
  r('vessa', 'hollowmere', 2, NH),
  r('veyra', 'emberpeak', 3, 'coolant_done', { name: 'Foreman Veyra', why: 'The coolant station runs again.' }),
  r('ilya', 'emberpeak', 3, 'testimony_ilya'),
  r('sella', 'emberpeak', 3, 'testimony_sella'),
  r('harl', 'emberpeak', 3, 'testimony_harl'),
  r('bess', 'emberpeak', 3, 'pk_restored'),
  r('taro', 'emberpeak', 3, 'pk_restored'),
  r('rusk', 'emberpeak', 3, 'pk_restored'),
  r('mara', 'emberpeak', 3, 'mara_named', { hide: (has) => !has('mara_read') }),
];

/** NPC record ids that are a row above under another map or a struck name. */
export const ALIASES = { garrick_e: 'garrick', garrick_n: 'garrick' };

/** NPC record ids with no row, and why (docs/LEDGER.md names the candidates for H4 and H5). */
export const EXCLUDED = { hob: 'no beat of his own (H4 candidate)', cobb: 'no beat', rook: 'a shop counter', penny: 'no beat in any episode', penny_e: 'see penny', penny_s: 'see penny' };
for (const id of ['henrietta', 'bertha', 'the_duke', 'loaf', 'anvil', 'starter_dough', 'stray_1', 'stray_2', 'stray_3', 'stray_4', 'stray_5', 'fold_sheep_a', 'fold_sheep_b']) EXCLUDED[id] = 'not a person';

const toHas = (flags) => (typeof flags === 'function' ? flags : (id) => !!(flags && flags[id]));

/** The group label: the Hollow has no name until Episode 2 gives it back. */
export function placeName(place, flags) {
  return place === 'hollowmere' && !toHas(flags)(NH) ? 'The Nameless Hollow' : (PLACES[place] || place);
}

/** A flag's FLAGS meaning as a player line: no scene ids or dev tails, "the hero" is "you", at most two short sentences. */
export function keepLine(flag) {
  const t = FLAGS[flag];
  if (!t) return null;
  const parts = String(t).replace(/\s*\([^)]*\)/g, '').split(/(?<=\.)\s+/);
  let s = parts[0];
  if (s.length < 24 && parts[1] && !/^(Set by|Opens|Enables|The \w+ event)/.test(parts[1])) s += ' ' + parts[1];
  s = s.replace(/;\s*[^;]*\b(EXP|given|Ledger)\b[^;]*$/, '').replace(/\bthe hero\b/g, 'you').trim();
  return s.replace(/\.?$/, '.');
}

/** Rows of the live game with their state. Pure. */
export function ledgerRows(flags, opts = {}) {
  const has = toHas(flags);
  const x1 = opts.x1 != null ? !!opts.x1 : X1_LIVE;
  const ep3 = opts.ep3 != null ? !!opts.ep3 : EP3_LIVE;
  const regions = opts.regions || X1_REGIONS;
  const out = [];
  for (const d of LEDGER) {
    if (d.ep === 3 && !ep3) continue;
    if ((d.x1 || d.region) && !x1) continue;
    if (d.region && regions[d.region] === false) continue;
    const kept = d.kept ? !!d.kept(has) : !!(d.flag && has(d.flag));
    const hidden = !!(d.hide && d.hide(has));
    const name = d.id === 'hero' ? String(opts.heroName || 'Hero') : d.name;
    out.push({ id: d.id, name: hidden ? '???' : name, place: d.place, placeName: placeName(d.place, has), ep: d.ep, kept, hidden,
      why: kept ? (d.why || keepLine(d.flag) || 'Kept.') : null });
  }
  return out;
}

/** { kept, total } over the live rows. Pure. */
export function namesKept(flags, opts = {}) {
  const rows = ledgerRows(flags, opts);
  return { kept: rows.filter((x) => x.kept).length, total: rows.length };
}

/** The best count over every slot (0 is the autosave): { kept, total, slot }, or null when no slot holds a game. */
export function namesKeptInSaves(save, opts = {}) {
  let best = null;
  const last = save && Number.isFinite(save.slots) ? save.slots : 3;
  for (let n = 0; save && n <= last; n++) {
    let env = null;
    try { env = save.loadEnvelope(n); } catch (err) { env = null; }
    const d = env && env.data;
    if (!d || !d.flags) continue;
    const c = namesKept(d.flags, opts);
    if (!best || c.kept > best.kept) best = { ...c, slot: n };
  }
  return best;
}

/** The title screen's line. */
export function counterLine(c) { return `Names kept: ${c.kept} of ${c.total}`; }

export default LEDGER;
