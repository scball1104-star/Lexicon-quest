// The Deep Stacks: the Archivist and every scene of the Stacks (docs/DEEP_STACKS_PLAN.md 2, 3, 9, 12; docs/briefs/C2-story-ui.md).
// Written by C2-story-ui. A pack file: index.js register() calls register() here BEFORE world.js's (ORDER items, loot, foes,
// story, text, world), so these scenes and lines win over world.js's one-line fallbacks (registerStory never overwrites an id).
// world.register() on its own (without index.js) imports this file but does not call register(): then the hall has no Hollis
// and world.js's fallback scenes answer. The pack entry is the contract.
//
// Scenes use ONLY the cutscene API (DESIGN 5.4, docs/story/STAGING.md), the ep1.js shape: raw functions wrapped by `cut` with
// SCENE_CONDITIONS. Two seams reach past the API, both guarded: the reading itself (world.js beginReading through SEAM.world,
// a dynamic import, so a missing or older world.js only sets a flag) and the plaque screen (the engine through PROBE.engine;
// absent in node, the scene says its line and returns). Every line is in text.js (LINES); nothing here spells one out.
//
//   stacks_locked   the library's trapdoor before ep1_complete (the object's script): one line
//   stacks_talk     the desk trigger (the party talks across the long table): the intro the first time, else the offer
//   stacks_intro    Hollis's first talk: a greeting, the three rules, deep_stacks_open, then the offer
//   stacks_enter    the offer: Begin / The record / Not yet; Begin asks once more, reminds of the vault once, then begins
//   stacks_vault    the one-box vault reminder (the first reading that starts with a vault); also chained from the offer
//   stacks_return   back in the hall after endReading: by game.cave.lastExit.how (bank, die, quit, clear), one or two boxes
//   stacks_record   the record line, then the plaque screen (the lectern, and "The record" in the offer)
//   stacks_no_save  the refusal line (the Stacks keep their own pages)
//   binder_intro    B100: the card names what was avoided (H5 style) and one box; the retry teaches the weakness (W7)
//   binder_cleared  B100 won: one line (the Quill is in the vault by game/cave.js clear; the mark is on the title)
//
// install(mod): the hall module gets Hollis at `archivist` (an npc event; the record goes into NPCS at register, the X1 way),
// the desk trigger on the row between `archivist` and `party_stop` (the long table is solid, not a counter, so a trigger on
// its cells carries the talk across it), the plaque sign on the face above `plaque`, the record trigger on the lectern above
// `record`. Idempotent by event id and cell; the map file is never edited.
//
// The plaque screen (StacksScene, scene id `stacks`, DEEP_STACKS_PLAN 9) lives at the end of this file and not under
// src/ui/screens/: tools/pwa/build_pwa.py precaches every src/**/*.js that is not under a pack's own folders, and the
// tap-prompt ratchet (qa/pwa/budget_ratchet.json, 2.34 MiB) has no room for a screen only the pack opens. Presentation only:
// the rows come from plaqueData(game), so the class reads nothing but `data`.

import * as STORY from '../../game/story.js';
import { FLAGS, FLAG_IDS } from '../quests.js';
import { NPCS } from '../npcs.js';
import * as CAVE from '../../game/cave.js';
import { onPackReady } from '../../game/packs.js';
import { peekMap } from '../../world/maps.js';
import { npc as npcEv, sign as signEv, trigger as triggerEv } from '../maps/_kit.js';
import { cap, fmtTime } from '../../ui/text.js';
import { List, rowHeightFor, rowsThatFit } from '../../ui/list.js';
import { drawWindow, drawIcon, drawDivider } from '../../ui/window.js';
import { drawHelpBar } from '../../ui/help.js';
import { CAVE_UNIQUES, CAVE_UNIQUE_IDS, BINDER_QUILL_ID, CAVE_PROPS } from './items.js';
import { HOLLIS, HOLLIS_ID, PLAQUES, STACKS_TEXT, LINES as T, STACKS_HELP, BAND_NAMES, countNames, fillLine } from './text.js';

export const HALL_ID = 'cave_landing0';
export const SCREEN_ID = 'stacks';
/** The event ids install() adds to the hall. */
export const HALL_EVENT_IDS = [HOLLIS_ID, 'stacks_desk', 'plaque', 'stacks_lectern'];
/** The vault's order on the plaque screen: the sixteen blues in band order, the Binder's Quill last. */
export const VAULT_IDS = [...CAVE_UNIQUE_IDS, BINDER_QUILL_ID];
export const VAULT_TOTAL = VAULT_IDS.length;

/** The flags this module sets or reads that nothing else declares (FLAGS gets them at register, the x1 flags.js way). */
export const CAVE_FLAGS = {
  deep_stacks_open: 'Hollis has said the three rules (stacks_intro). The offer, the stair and the Journal line follow.',
  deep_stacks_cleared: 'The Binder is beaten on B100 (game/cave.js clear, the encounter flag). The title shows the mark.',
  stacks_vault_reminded: 'Hollis has said once that the vault waits in the pack at the first page (stacks_vault).',
  binder_met: 'The Binder was approached once (binder_intro); a retry hears the short line with the weakness.',
  stacks_reading_requested: 'Fallback only: Begin was chosen while world.js had no beginReading (nothing else happened).',
};

// ---------------------------------------------------------------- the two seams (tests inject both)
/** Where the scenes find the engine and the game outside the cutscene API. */
export const PROBE = {
  engine: () => (typeof globalThis !== 'undefined' ? globalThis.LQ_ENGINE || null : null),
  game: () => { const e = PROBE.engine(); return e && e.game ? e.game : null; },
};
/** world.js, loaded on first use: undefined = not tried, null = absent. Tests set SEAM.world themselves. */
export const SEAM = { world: undefined };
async function worldModule() {
  if (SEAM.world !== undefined) return SEAM.world;
  try { SEAM.world = await import('./world.js'); } catch (err) { SEAM.world = null; }
  return SEAM.world;
}

// ---------------------------------------------------------------- the ep1.js wrapper
const toList = (v) => (v == null ? [] : Array.isArray(v) ? v : [v]);
async function allowed(s, cond) {
  if (!cond) return true;
  for (const f of toList(cond.if)) if (!(await s.hasFlag(f))) return false;
  for (const f of toList(cond.ifNot)) if (await s.hasFlag(f)) return false;
  return true;
}
const cut = (fn, cond) => async (s) => {
  if (!(await allowed(s, cond))) return;
  await s.lockInput();
  try { await fn(s); } finally { await s.unlockInput(); }
};
const say = (s, text) => s.say(HOLLIS_ID, text);
const narrate = (s, text) => s.say(null, text);

// ---------------------------------------------------------------- the scenes
// library, the trapdoor object before ep1_complete. 1 box.
async function stacks_locked(s) {
  await narrate(s, T.locked);
}

// cave_landing0, the desk trigger: the first talk, else the offer. Chains.
async function stacks_talk(s) {
  await s.face(HOLLIS_ID, 'hero');
  if (!(await s.hasFlag('deep_stacks_open'))) await stacks_intro(s);
  else await stacks_enter(s);
}

// cave_landing0, Hollis's first talk: a greeting, the three rules (one each), deep_stacks_open, then the offer. 4 boxes + offer.
async function stacks_intro(s) {
  await say(s, T.greet);
  await say(s, T.rule_1);
  await say(s, T.rule_2);
  await say(s, T.rule_3);
  await s.setFlag('deep_stacks_open');
  await offer(s);
}

// cave_landing0, every later talk (and the hall's stair, through world.js beforeDoor). 1 box + the offer.
async function stacks_enter(s) {
  await offer(s);
}

// The offer: Begin / The record / Not yet (cancel). Begin asks once more; "Stay" gets one dry line. Up to 4 boxes.
async function offer(s) {
  await say(s, T.offer);
  const pick = await s.choice([T.offer_yes, T.offer_record, T.offer_no]);
  if (pick === 1) { await record(s); return; }
  if (pick !== 0) return;
  await say(s, T.confirm);
  const go = await s.choice([T.confirm_yes, T.confirm_no]);
  if (go !== 0) { await say(s, T.stay); return; }
  await stacks_vault(s);
  await begin(s);
}

// cave_landing0, once: the first reading that starts with something in the vault. 1 box. Sets stacks_vault_reminded.
async function stacks_vault(s) {
  if (await s.hasFlag('stacks_vault_reminded')) return;
  const g = PROBE.game();
  if (!g || !CAVE.vaultIds(g).length) return;
  await say(s, T.vault);
  await s.setFlag('stacks_vault_reminded');
}

/** The reading begins through world.js; without it only a flag is set. Returns world.js's result. */
async function begin(s) {
  const w = await worldModule();
  if (w && typeof w.beginReading === 'function') {
    const r = await w.beginReading(PROBE.engine(), PROBE.game(), {});
    if (!r || !r.ok) await say(s, T.refused);
    return r || { ok: false, why: 'refused' };
  }
  await s.setFlag('stacks_reading_requested');
  return { ok: false, why: 'no_world' };
}

function lastExit() {
  const g = PROBE.game();
  return g && g.cave && g.cave.lastExit ? g.cave.lastExit : null;
}

// cave_landing0, run by world.js endReading on arrival: by lastExit.how. 1 or 2 boxes.
async function stacks_return(s) {
  const x = lastExit();
  const how = x ? x.how : 'bank';
  const floor = x && x.floor ? x.floor : 0;
  const blues = x && Array.isArray(x.blues) ? x.blues.length : 0;
  const lost = x && Array.isArray(x.lost) ? x.lost.length : 0;
  await s.face(HOLLIS_ID, 'hero');
  if (how === 'clear') { await say(s, T.clear); await say(s, T.clear_2); return; }
  if (how === 'die') { await say(s, T.die); await say(s, fillLine(lost ? T.die_lost : T.die_safe, { floor })); return; }
  if (how === 'quit') { await say(s, T.quit); await say(s, T.quit_2); return; }
  if (blues) { await say(s, fillLine(T.bank_kept, { n: countNames(blues) })); await say(s, T.bank_kept_2); return; }
  await say(s, fillLine(T.bank_none, { floor }));
}

/** The record line, then the plaque screen (when an engine is there). 1 box. */
async function record(s) {
  const g = PROBE.game();
  const rec = g ? CAVE.recordOf(g) : { floor: 0 };
  const vault = g ? CAVE.vaultIds(g).length : 0;
  if (!rec.floor) await say(s, T.record_none);
  else await say(s, fillLine(vault ? T.record : T.record_empty, { floor: rec.floor, vault, total: VAULT_TOTAL }));
  await openPlaqueScreen(PROBE.engine());
}

// cave_landing0, the lectern (and "The record" in the offer). 1 box, then the screen.
async function stacks_record(s) {
  await s.face(HOLLIS_ID, 'hero');
  await record(s);
}

// any floor: a manual save refused (world.js saveRefused says the same line on its own; this is the scene form). 1 box.
async function stacks_no_save(s) {
  await narrate(s, STACKS_TEXT.save_refused);
}

// cave_b100, the step row before the dais (world.js's cave_binder runs it, then the fight). 1 box + the card. Sets binder_met.
async function binder_intro(s) {
  const met = await s.hasFlag('binder_met');
  await s.camera.panTo('binder', 40);
  await s.wait(20);
  await narrate(s, met ? T.binder_retry : T.binder_intro);
  await s.setFlag('binder_met');
  await s.title(T.binder_card, { sub: T.binder_sub, frames: 100 });
  await s.shake(2, 20);
  await s.flash('#ffffff', 8);
  await s.camera.follow('hero');
}

// cave_b100, after the win (world.js clearFlow, before endReading('clear')). 1 box.
async function binder_cleared(s) {
  await s.camera.panTo('binder', 20);
  await s.sfx('name_restore');
  await narrate(s, T.binder_cleared);
  await s.camera.follow('hero');
}

// ---------------------------------------------------------------- registry (the ep1.js / x1 shape)
export const SCENE_CONDITIONS = {
  stacks_locked: { ifNot: 'ep1_complete' },
  stacks_talk: {},
  stacks_intro: { ifNot: 'deep_stacks_open' },
  stacks_enter: { if: 'deep_stacks_open' },
  stacks_vault: { if: 'deep_stacks_open', ifNot: 'stacks_vault_reminded' },
  stacks_return: {},
  stacks_record: {},
  stacks_no_save: {},
  binder_intro: { ifNot: 'deep_stacks_cleared' },
  binder_cleared: { if: 'deep_stacks_cleared' },
};
/** The raw scene functions (no guard, no input lock), for the tests and the chains. */
export const rawScenes = { stacks_locked, stacks_talk, stacks_intro, stacks_enter, stacks_vault, stacks_return, stacks_record, stacks_no_save, binder_intro, binder_cleared };
/** Scene id -> the map it plays on ('cave_b*' = any generated floor). */
export const SCENE_MAP = {
  stacks_locked: 'library', stacks_talk: HALL_ID, stacks_intro: HALL_ID, stacks_enter: HALL_ID, stacks_vault: HALL_ID,
  stacks_return: HALL_ID, stacks_record: HALL_ID, stacks_no_save: 'cave_b*', binder_intro: 'cave_b100', binder_cleared: 'cave_b100',
};
/** Box budgets, chains counted together (stacks_talk and stacks_intro carry the offer). */
export const BOX_BUDGET = {
  stacks_locked: 1, stacks_talk: 8, stacks_intro: 8, stacks_enter: 4, stacks_vault: 1, stacks_return: 2, stacks_record: 1,
  stacks_no_save: 1, binder_intro: 1, binder_cleared: 1,
};
export const scenes = Object.fromEntries(Object.entries(rawScenes).map(([id, fn]) => [id, cut(fn, SCENE_CONDITIONS[id])]));

// ---------------------------------------------------------------- the hall (install, the X1 way: the map file is not edited)
function hallEvents(marks) {
  const [ax, ay] = marks.archivist;
  const out = [npcEv(HOLLIS_ID, ax, ay, 'down')];
  const ps = marks.party_stop;
  // the long table between the two marks: a trigger across its cells carries the talk over it
  if (Array.isArray(ps) && ps[0] === ax && ps[1] - ay === 2) out.push(triggerEv('stacks_desk', ax - 1, ay + 1, 3, 1, 'stacks_talk', { on: 'interact' }));
  if (Array.isArray(marks.plaque)) out.push(signEv('plaque', marks.plaque[0], marks.plaque[1] - 1, 'plaque_hall', { solid: false }));
  if (Array.isArray(marks.record)) out.push(triggerEv('stacks_lectern', marks.record[0], marks.record[1] - 1, 1, 1, 'stacks_record', { on: 'interact' }));
  return out;
}
/** Put Hollis, the desk, the plaque and the lectern into a hall module. Returns the ids added (none on a second call). */
export function install(mod) {
  if (!mod || !mod.marks || !Array.isArray(mod.marks.archivist) || !Array.isArray(mod.events)) return [];
  const added = [];
  for (const ev of hallEvents(mod.marks)) {
    if (mod.events.some((e) => e && e.id === ev.id)) continue;
    if (mod.events.some((e) => e && e.type === ev.type && e.x === ev.x && e.y === ev.y)) continue;
    mod.events.push(ev);
    added.push(ev.id);
  }
  return added;
}
function missing(err, name) {
  const m = String((err && err.message) || err);
  if (err && err.code === 'ERR_MODULE_NOT_FOUND') {
    const gone = /Cannot find module '([^']+)'/.exec(m);
    return !!gone && /[\\/]cave[\\/]/.test(gone[1]) && gone[1].endsWith(`${name}.js`);
  }
  return /Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed|Failed to load module script/i.test(m);
}
/** The hall module: the registered one (world.js may have been first), else the file; then install(). */
export async function installHall() {
  let mod = peekMap(HALL_ID);
  if (!mod) {
    try { const m = await import('./maps/cave_landing0.js'); mod = m && (m.default || m.map); }
    catch (err) { if (!missing(err, 'cave_landing0')) throw err; mod = null; }
  }
  return mod ? install(mod) : [];
}

// ---------------------------------------------------------------- the plaque screen's data and opener
function whoLabel(who) {
  if (!Array.isArray(who) || who.length >= 3) return 'anyone';
  return who.map((id) => (id === 'hero' ? 'the hero' : cap(id))).join(' and ');
}
/** The plaque screen's rows: every cave unique in band order, the Quill last, held or not. */
export function vaultRows(g) {
  const held = new Set(g ? CAVE.vaultIds(g) : []);
  return VAULT_IDS.map((id) => {
    const u = CAVE_UNIQUES[id], p = CAVE_PROPS[u.prop];
    return { id, name: u.name, held: held.has(id), icon: u.icon || null, band: u.band, where: BAND_NAMES[u.band] || '',
      wear: u.slot === 'weapon' ? cap(u.type) : `${cap(u.slot)}, ${whoLabel(u.who)}`,
      prop: p ? { name: p.name, text: p.text } : null, lore: (u.lore || []).slice() };
  });
}
export function plaqueData(g) {
  return { record: CAVE.recordOf(g), rows: vaultRows(g), total: VAULT_TOTAL,
    text: { title: STACKS_HELP.title, help: STACKS_HELP.screen, vault: STACKS_HELP.vault, unfound: STACKS_HELP.unfound, record: STACKS_HELP.record } };
}
export function ensureScene(engine) {
  if (!engine || typeof engine.registerScene !== 'function' || typeof engine.hasScene !== 'function') return false;
  if (!engine.hasScene(SCREEN_ID)) engine.registerScene(SCREEN_ID, StacksScene);
  return true;
}
/** Push the plaque screen over whatever is up; resolves when it closes. False without an engine or a game. */
export async function openPlaqueScreen(engine, o = {}) {
  const e = engine || PROBE.engine();
  const g = (e && e.game) || PROBE.game();
  if (!e || !g || typeof e.pushAwait !== 'function') return false;
  ensureScene(e);
  await e.pushAwait(SCREEN_ID, { ...plaqueData(g), ...o });
  return true;
}

/** The engine side: the screen scene and the LQ_DEBUG commands (caveStacks, caveHall). Idempotent. */
export function bind(engine) {
  const e = engine || PROBE.engine();
  if (!e) return false;
  ensureScene(e);
  const D = typeof globalThis !== 'undefined' ? globalThis.LQ_DEBUG : null;
  if (D && typeof D.register === 'function' && !(D.commands && D.commands().includes('caveStacks'))) {
    D.register('caveStacks', (o = {}) => openPlaqueScreen(e, o));
    D.register('caveHall', () => {
      const m = peekMap(HALL_ID);
      return { hollis: !!NPCS[HOLLIS_ID], fallback: !!(m && m.fallback),
        events: m ? m.events.filter((ev) => HALL_EVENT_IDS.includes(ev.id)).map((ev) => ({ id: ev.id, type: ev.type, x: ev.x, y: ev.y })) : [] };
    });
  }
  return true;
}

// ---------------------------------------------------------------- register (index.js calls it before world.js's)
let registered = null;
async function run() {
  Object.assign(FLAGS, CAVE_FLAGS);
  for (const id of Object.keys(CAVE_FLAGS)) if (!FLAG_IDS.includes(id)) FLAG_IDS.push(id);
  if (!NPCS[HOLLIS_ID]) NPCS[HOLLIS_ID] = HOLLIS;
  const collided = STORY.registerStory({ scenes, lines: { ...PLAQUES }, conditions: SCENE_CONDITIONS });
  const hall = await installHall();
  bind(PROBE.engine());
  onPackReady('cave', () => { bind(PROBE.engine()); });
  return { id: 'story', scenes: Object.keys(scenes), lines: Object.keys(PLAQUES), hall, collided };
}
/** Idempotent (the same promise after success; a retry after a failure runs again). */
export function register() {
  if (!registered) registered = run().catch((err) => { registered = null; throw err; });
  return registered;
}
export default { scenes, register };

// ================================================================================================
// The plaque screen: the Deep Stacks record and the vault. engine.pushAwait('stacks', { record, rows, total, text? }):
//   record  { floor, readings, clears, time }      game/cave.js recordOf()
//   rows    [{ id, name, held, icon, where, wear, prop: { name, text } | null, lore: [line, line] }]  vaultRows(): the sixteen
//           blues in band order, the Binder's Quill last
// Layout is the Journal's Ledger tab (ui/screens/journal.js): the header strip (the title, the record), the list on the left
// (the slot icon and the name: bright cream when held, faded ink when not), the detail on the right (name, home band, who wears
// it; the prop and the two lore lines when held, "..." and the unfound line when not), the help bar. Touch rows come from
// rowHeightFor (seven visible on a phone); the list scrolls and its arrows are tappable. Cancel pops with the selected id.
// ================================================================================================
/** The faded-ink treatment of a unique not yet found (the Ledger's). */
export const FADED = { color: 'cream', alpha: 0.42, shadow: false };
export const LIST = { x: 24, y: 34, w: 124 };
const DETAIL_X = 166, DETAIL_W = 206, RIGHT_X = 372, LAST_Y = 165;
export const DEFAULT_TEXT = {
  title: STACKS_HELP.title, help: STACKS_HELP.screen, vault: STACKS_HELP.vault, unfound: STACKS_HELP.unfound, none: 'No reading yet',
  record: STACKS_HELP.record,
};

/** Fit a label to maxW: drop a leading "The ", then ellipsize (journal.js fitLine with an ASCII ellipsis). */
export function fitLabel(r, text, maxW) {
  let t = String(text || '');
  if (r.measure(t) <= maxW) return t;
  if (/^The /.test(t) && r.measure(t.slice(4)) <= maxW) return t.slice(4);
  t = t.replace(/^The /, '');
  while (t.length > 1 && r.measure(t + '...') > maxW) t = t.slice(0, -1).trimEnd();
  return t + '...';
}

/** The header's record summary: the longest form that fits `maxW` (the time goes first, then the clears, then the readings). */
export function recordSummary(r, rec, maxW, T = DEFAULT_TEXT) {
  if (!(rec.floor > 0)) return T.none;
  const deepest = `${T.record.deepest} B${rec.floor}`;
  const readings = `${rec.readings} ${rec.readings === 1 ? 'reading' : 'readings'}`;
  const clears = rec.clears > 0 ? `${T.record.clears} ${rec.clears}` : null;
  const time = rec.time > 0 ? fmtTime(rec.time) : null;
  for (const f of [[deepest, readings, clears, time], [deepest, readings, clears], [deepest, readings]]) {
    const s = f.filter(Boolean).join('   ');
    if (r.measure(s) <= maxW) return s;
  }
  return deepest;
}

export class StacksScene {
  constructor(engine) { this.engine = engine; this.name = SCREEN_ID; this.transparent = true; }

  enter(data = {}) {
    const e = this.engine;
    this.T = { ...DEFAULT_TEXT, ...(data.text || {}), record: { ...DEFAULT_TEXT.record, ...((data.text && data.text.record) || {}) } };
    this.record = { floor: 0, readings: 0, clears: 0, time: 0, ...(data.record || {}) };
    this.rows = Array.isArray(data.rows) ? data.rows : [];
    this.total = data.total || this.rows.length;
    this.held = this.rows.filter((x) => x.held).length;
    this.frame = 0; this.closing = false;
    const rowH = rowHeightFor(e, 12);
    this.list = new List({ x: LIST.x, y: LIST.y, w: LIST.w, rowH, rows: Math.min(11, rowsThatFit(144, rowH)),
      items: this.rows.map((row) => ({ id: row.id, label: null, row, draw: drawVaultRow })), index: data.index || 0, confirmSfx: false });
    if (!data.silent && e.audio) e.audio.sfx('menu_open');
  }

  update() {
    const { input, audio } = this.engine;
    this.frame++;
    if (this.closing) return;
    const act = this.list.update(input, audio);
    if (act === 'cancel') { this.closing = true; if (audio) audio.sfx('menu_close'); this.engine.pop(this.list.item ? this.list.item.id : null); }
  }

  get row() { return this.list.item ? this.list.item.row : null; }

  draw(r) {
    const T = this.T;
    r.withAlpha(0.6, () => r.rect(0, 0, r.W, r.H, '#0b0918'));
    drawWindow(r, 4, 4, 376, 24);
    r.text(T.title, 12, 10, { color: 'gold' });
    r.text(recordSummary(r, this.record, 376 - 32 - r.measure(T.title), T), RIGHT_X, 10, { align: 'right', color: 'gray' });
    drawWindow(r, 4, 30, 150, 150);
    this.list.draw(r, { frame: r.frame, bar: true });
    drawWindow(r, 158, 30, 222, 150);
    if (this.row) this.drawDetail(r, this.row);
    drawHelpBar(r, T.help, { right: `${T.vault} ${this.held} of ${this.total}` });
  }

  drawDetail(r, row) {
    const T = this.T, x = DETAIL_X;
    const big = r.measure(row.name, 'large') <= DETAIL_W - 14;
    r.text(row.name, x, big ? 35 : 38, row.held ? { font: big ? 'large' : 'main', color: 'cream' } : { ...FADED, font: big ? 'large' : 'main' });
    if (row.held) drawIcon(r, 'star', RIGHT_X - 12, 36);
    r.text(fitLabel(r, row.where, DETAIL_W), x, 54, { color: 'gray' });
    if (row.wear) r.text(fitLabel(r, row.wear, DETAIL_W), x, 65, { color: 'gray' });
    drawDivider(r, 164, 78, 210);
    if (!row.held) {
      r.text('...', x, 84, { color: 'dim' });
      r.wrap(T.unfound, DETAIL_W).slice(0, 2).forEach((line, i) => r.text(line, x, 96 + i * 11, { color: 'dim' }));
      return;
    }
    let y = 84;
    if (row.prop) {
      r.text(row.prop.name, x, y, { color: 'gold' }); y += 11;
      for (const line of r.wrap(row.prop.text || '', DETAIL_W).slice(0, 2)) { r.text(line, x, y, { color: 'white' }); y += 11; }
      y += 3; drawDivider(r, 164, y, 210); y += 5;
    }
    for (const para of row.lore || []) {
      for (const line of r.wrap(para, DETAIL_W)) { if (y > LAST_Y) return; r.text(line, x, y, { color: 'white' }); y += 11; }
    }
  }

  debugState() {
    return { screen: SCREEN_ID, index: this.list.index, id: this.row ? this.row.id : null, held: this.held, total: this.total,
      rows: this.rows.length, scroll: this.list.scroll, rowH: this.list.rowH, record: { ...this.record } };
  }
}

/** A vault row: the slot icon, then the name, bright cream when held and faded ink when not. */
function drawVaultRow(r, rr) {
  const row = this.row, y = rr.y + 1 + Math.max(0, Math.floor((rr.h - 12) / 2));
  if (row.icon) drawIcon(r, row.icon, rr.x + 4, y - 1, { alpha: row.held ? 1 : 0.35 });
  r.text(fitLabel(r, row.name, rr.w - 24), rr.x + 19, y, row.held ? { color: 'cream' } : FADED);
}
