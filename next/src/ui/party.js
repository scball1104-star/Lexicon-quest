// Party member rows and stat helpers shared by the menu, shops, save slots and the inn.
//
//   drawMemberRow(r, member, x, y, { w: 262, selected, dim, frame, scheme, compact })   FF6 style row (57 tall)
//   memberInfo(member) -> { maxHp, maxMp, stats, hpFrac, mpFrac, expFrac, furyFrac, ko }
//   WEAPON_ICON[type], SLOT_ICON[slot], STAT_ROWS

import { memberStats } from '../battle/rules.js';
import { expForLevel, expToNext, PARTY } from '../data/party.js';
import { drawPortrait, drawGauge, drawLabel, drawIcon, drawDivider } from './window.js';

export const WEAPON_ICON = { sword: 'sword', axe: 'axe', spear: 'spear', staff: 'staff', bow: 'bow' };
export const SLOT_ICON = { weapon: 'sword', body: 'armor', head: 'helm', charm: 'charm', boots: 'boots', mantle: 'mantle' };
export const SLOT_NAMES = { body: 'Body', head: 'Head', charm: 'Charm', boots: 'Boots', mantle: 'Mantle' };
export const STAT_ROWS = [['atk', 'ATK'], ['def', 'DEF'], ['mag', 'MAG'], ['spr', 'SPR'], ['spd', 'SPD'], ['luk', 'LUK']];

export function memberInfo(m) {
  let s;
  try { s = memberStats(m); } catch { s = { maxHp: m.maxHp || m.hp || 1, maxMp: m.maxMp || m.mp || 0, atk: 0, def: 0, mag: 0, spr: 0, spd: 0, luk: 0, weapon: m.weapon }; }
  const maxHp = Math.max(1, s.maxHp), maxMp = Math.max(0, s.maxMp);
  const hp = Math.max(0, Math.min(maxHp, m.hp ?? maxHp)), mp = Math.max(0, Math.min(maxMp, m.mp ?? maxMp));
  const lv = m.level || 1;
  const cur = expForLevel(lv), next = expForLevel(lv + 1);
  const expFrac = next > cur ? Math.max(0, Math.min(1, ((m.exp || 0) - cur) / (next - cur))) : 1;
  return { stats: s, maxHp, maxMp, hp, mp, hpFrac: hp / maxHp, mpFrac: maxMp ? mp / maxMp : 0, expFrac,
    furyFrac: Math.max(0, Math.min(1, (m.fury || 0) / 100)), toNext: expToNext(m), ko: hp <= 0, role: (PARTY[m.id] || {}).role || '' };
}

export function memberName(m) { return m.name || (PARTY[m.id] ? PARTY[m.id].name : m.id); }

/**
 * One party row, 57 px tall by default. Layout mirrors tools/art/ui mock_menu: portrait 32 (framed) at the
 * left, name / weapon icon / Lv, HP and MP numbers over gauges, Fury and NEXT thin gauges.
 */
export function drawMemberRow(r, m, x, y, o = {}) {
  const info = memberInfo(m);
  const alpha = (o.alpha ?? 1) * (o.dim ? 0.55 : 1);
  const x0 = x + 42;
  drawPortrait(r, m.id, x, y + 2, 32, { scheme: o.scheme, alpha });
  const nameCol = info.ko ? 'red' : 'white';
  r.text(memberName(m), x0, y + 1, { color: nameCol, alpha });
  const wIcon = WEAPON_ICON[info.stats.weapon || m.weapon];
  if (wIcon) drawIcon(r, wIcon, x0 + 34, y, { alpha });
  drawLabel(r, 'lv', x0 + 50, y + 4, { alpha });
  r.text(String(m.level || 1), x0 + 61, y + 1, { alpha });
  if (info.ko) drawLabel(r, 'ko', x0 + 78, y + 4, { alpha });
  if (o.badge) r.text(o.badge, x0 + 78, y + 1, { color: 'gold', alpha });
  const gaugeW = o.w ? Math.min(99, o.w - 42 - 118) : 99;
  // HP
  drawLabel(r, 'hp', x0, y + 16, { alpha });
  const hpCol = info.ko ? 'red' : info.hpFrac <= 0.25 ? 'red' : info.hpFrac <= 0.5 ? 'orange' : 'white';
  r.text(`${info.hp}/${info.maxHp}`, x0 + gaugeW - 1, y + 13, { align: 'right', color: hpCol, alpha });
  drawGauge(r, x0, y + 25, gaugeW, info.hpFrac, 'hp');
  // MP
  const mx = x0 + gaugeW + 9;
  drawLabel(r, 'mp', mx, y + 16, { alpha });
  r.text(`${info.mp}/${info.maxMp}`, mx + 62, y + 13, { align: 'right', alpha });
  drawGauge(r, mx, y + 25, 63, info.mpFrac, 'mp');
  // Fury + NEXT
  drawLabel(r, 'fury', x0, y + 34, { alpha });
  const full = info.furyFrac >= 1;
  // READY sits beside the gauge on its own line (D11): the gauge gives up 25 px for the 21 px label.
  const furyW = gaugeW - 22 - (full ? 25 : 0);
  drawGauge(r, x0 + 22, y + 35, furyW, info.furyFrac, 'fury', { thin: true, glow: full, frame: o.frame });
  if (full) drawLabel(r, 'ready', x0 + 22 + furyW + 4, y + 34, { alpha });
  drawLabel(r, 'next', mx, y + 34, { alpha });
  drawGauge(r, mx + 22, y + 35, 41, info.expFrac, 'exp', { thin: true });
  if (o.divider) drawDivider(r, x + 4, y + 52, (o.w || 262) - 8, { scheme: o.scheme });
  return info;
}

/** Compact row (24 px tall): portrait 20? No portrait: name, HP x/y, MP x/y. For target pickers. */
export function drawMemberLine(r, m, x, y, w, o = {}) {
  const info = memberInfo(m);
  const alpha = o.alpha ?? 1;
  r.text(memberName(m), x, y, { color: info.ko ? 'red' : 'white', alpha });
  drawLabel(r, 'hp', x + 60, y + 3, { alpha });
  r.text(`${info.hp}/${info.maxHp}`, x + 128, y, { align: 'right', color: info.hpFrac <= 0.25 ? 'red' : 'white', alpha });
  drawLabel(r, 'mp', x + 138, y + 3, { alpha });
  r.text(`${info.mp}/${info.maxMp}`, x + w - 4, y, { align: 'right', alpha });
  return info;
}
