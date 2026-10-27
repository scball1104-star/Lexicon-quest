// H3: the Vow state machine. Rules, seams, contracts and the reward bound: docs/VOWS.md. Pure over `game`; the engine
// is passed in only for the toast. Save shape: game.vow = null | { id, chapter, battles, state, brokenBy },
// game.vowsKept = [{ id, chapter, paid }] (both default in state.js createGame).

import { VOWS, VOW_BY_ID, VOW_REWARD, VOW_PAID_CAP, VOW_INTRO } from '../data/vows.js';
import { CONSUMABLES } from '../data/items.js';
import { grantMastery } from '../data/party.js';
import { SKILLS } from '../data/skills.js';
import { VOW_TEXT } from '../data/text.js';

const fill = (s, vars) => String(s).replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? String(vars[k]) : m));
const battlesOf = (g) => (g.counters && g.counters.battles) || 0;

/** The active vow's definition, or null. */
export function activeVow(g) {
  if (!g || !g.vow || g.vow.state !== 'active') return null;
  return VOW_BY_ID[g.vow.id] || null;
}

/** The vows that may be offered now. ctx: { alwaysRun } (engine settings the pure layer cannot see). */
export function offerVows(g, ctx = {}) {
  if (!g) return [];
  return VOWS.filter((v) => { try { return !!v.offerIf(g, ctx); } catch (e) { return false; } });
}

/** Take a vow (only one at a time, only one that is offered now). Returns the vow or null. */
export function takeVow(g, id, ctx = {}) {
  const v = offerVows(g, ctx).find((x) => x.id === id);
  if (!v || (g.vow && g.vow.state === 'active')) return null;
  g.vow = { id: v.id, chapter: g.chapter || 1, battles: battlesOf(g), state: 'active', brokenBy: null };
  return v;
}

/** An item that restores HP or revives (potions, salves, feathers); ethers and cures are not healing. */
export function isHealingItem(id) {
  const d = CONSUMABLES[id];
  if (!d || !d.effect) return false;
  const e = d.effect;
  return !!(e.heal || e.healPct || e.revive);
}

/** The seams' single entry: { type: 'flee'|'item'|'run'|'fell'|'fury'|'buy', item?, member?, qty? }. True when the active vow broke. */
export function vowEvent(g, evt, engine = null) {
  const def = activeVow(g);
  if (!def || !evt || !def.breaksOn.includes(evt.type)) return false;
  if (evt.type === 'item' && !isHealingItem(evt.item)) return false;
  if (evt.type === 'fell' && def.member && evt.member !== def.member) return false;
  g.vow.state = 'broken';
  g.vow.brokenBy = evt.type;
  const text = fill(VOW_TEXT.ended, { name: def.name });
  const battle = engine && engine.scene && engine.scene.name === 'battle' && typeof engine.scene.logLine === 'function' ? engine.scene : null;
  if (battle) battle.logLine(text, 'orange');   // H6: in battle, the log
  else if (engine && engine.toasts && typeof engine.toasts.flash === 'function') {
    try { engine.toasts.flash(text, { frames: 90 }); } catch (e) { /* the toast is optional */ }
  }
  return true;
}

/** H6: would this action (or command entry) end the active vow? Auto never takes one that would. */
export function vowForbids(g, a) {
  const def = activeVow(g), on = (t) => !!def && def.breaksOn.includes(t), k = a && (a.type || a.id);
  if (!a) return false;
  if (a.item) return on('item') && isHealingItem(a.item);
  return k === 'flee' ? on('flee') : on('fury') && (k === 'fury' || !!(SKILLS[a.skill] && SKILLS[a.skill].kind === 'fury'));
}

/** H6: the box before the first vow offer, once per save. */
export function takeVowIntro(g) {
  const c = g && (g.counters = g.counters || {});
  if (!c || c.vow_intro) return null;
  c.vow_intro = 1;
  return pickLine(g, VOW_INTRO);
}

/** Battle seam: one party action's events (rules.js perform): a healing item (action_start) or a spent Fury art (fury_gain). */
export function vowBattleEvents(g, events, engine = null) {
  if (!activeVow(g) || !Array.isArray(events)) return false;
  let broke = false;
  for (const ev of events) {
    if (!ev) continue;
    if (ev.type === 'action_start' && ev.action && ev.action.type === 'item') broke = vowEvent(g, { type: 'item', item: ev.action.item }, engine) || broke;
    else if (ev.type === 'fury_gain' && ev.reason === 'spent') broke = vowEvent(g, { type: 'fury' }, engine) || broke;
  }
  return broke;
}

/** The first line whose speaker is in the party (a `who: null` entry is the narrator fallback). */
function pickLine(g, list) {
  const here = new Set((g.party || []).map((m) => m.id));
  return (list || []).find((l) => l.who == null || here.has(l.who)) || null;
}

/** Kept vows that have paid in a chapter. */
export function vowsPaid(g, chapter = g.chapter || 1) {
  return (g.vowsKept || []).filter((k) => k.chapter === chapter && k.paid).length;
}

/** Mastery points one kept vow pays in a chapter (the last row of the table for later chapters). */
export function rewardPoints(chapter = 1) {
  const keys = Object.keys(VOW_REWARD).map(Number).sort((a, b) => a - b);
  const c = Math.max(keys[0], Math.min(keys[keys.length - 1], Number(chapter) || 1));
  return VOW_REWARD[c];
}

/**
 * At a rest: a kept vow pays once (mastery points on the current weapon of the first `to` member here, else the leader; at
 * most VOW_PAID_CAP paid per chapter), a broken one says its line, an untested one (no battle since) is carried unchanged.
 * Returns { kind: 'kept'|'broken'|'carried', vow, reward, text, line } or null.
 */
export function settleVow(g) {
  if (!g || !g.vow) return null;
  g.vowsKept = g.vowsKept || [];
  const v = g.vow;
  const def = VOW_BY_ID[v.id];
  if (!def) { g.vow = null; return null; }
  if (v.state === 'broken') {
    g.vow = null;
    return { kind: 'broken', vow: def, reward: null, text: null, line: pickLine(g, def.brokenLine) };
  }
  if (battlesOf(g) <= (v.battles || 0)) return { kind: 'carried', vow: def, reward: null, text: null, line: null };
  const chapter = v.chapter || g.chapter || 1;
  const member = def.to.map((id) => (g.party || []).find((m) => m.id === id)).find(Boolean) || (g.party || [])[0] || null;
  let reward = null;
  if (member && vowsPaid(g, chapter) < VOW_PAID_CAP) {
    const weapon = member.weapon || Object.keys(member.mastery || {})[0] || null;
    if (weapon) {
      const points = rewardPoints(chapter), before = (member.mastery || {})[weapon] || 0;
      const out = grantMastery(member, weapon, points);
      reward = { to: member.id, name: member.name, weapon, points, before, after: member.mastery[weapon], level: { from: out.from, to: out.to }, unlocked: out.unlocked };
    }
  }
  g.vowsKept.push({ id: def.id, chapter, paid: !!reward });
  g.vow = null;
  const lines = [fill(VOW_TEXT.kept, { name: def.name })];
  if (reward) {
    lines.push(fill(VOW_TEXT.paid, { member: reward.name, weapon: reward.weapon, n: reward.points }));
    const learned = reward.unlocked.map((id) => (SKILLS[id] ? SKILLS[id].name : id));
    if (learned.length) lines.push(fill(VOW_TEXT.learned, { skill: learned.join(', ') }));
  } else lines.push(VOW_TEXT.capped);
  return { kind: 'kept', vow: def, reward, text: lines.join('\n'), line: pickLine(g, def.keptLine) };
}

/** What the menu and the Journal show: { name, active } while a vow is carried (active) or ended and unsettled, else null. */
export function vowStatus(g) {
  if (!g || !g.vow) return null;
  const def = VOW_BY_ID[g.vow.id];
  if (!def) return null;
  return { name: def.name, active: g.vow.state === 'active' };
}

/** The one line the menu's info box and the Journal's Quests header show ('Vow: No fleeing' | 'Vow ended'), or null. */
export function vowLine(g) {
  const s = vowStatus(g);
  if (!s) return null;
  return s.active ? fill(VOW_TEXT.active, { name: s.name }) : VOW_TEXT.endedShort;
}

export default { offerVows, takeVow, vowEvent, vowBattleEvents, settleVow, vowLine, vowStatus, activeVow, isHealingItem, vowForbids, takeVowIntro };
