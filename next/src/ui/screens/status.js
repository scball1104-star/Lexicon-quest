// Status screen: full stats, EXP, mastery per weapon with the next unlock, equipment summary.

import { drawWindow, drawPortrait, drawLabel, drawGauge, drawIcon, drawDivider } from '../window.js';
import { drawHelpBar } from '../help.js';
import { memberInfo, memberName, WEAPON_ICON, SLOT_ICON, SLOT_NAMES } from '../party.js';
import { PARTY, masteryLevel, masteryUnlocks, MASTERY_XP, MAX_MASTERY, expForLevel } from '../../data/party.js';
import { SKILLS, FURY_ARTS } from '../../data/skills.js';
import { equipKeys, isWeaponKey, equipped, gearName } from '../../game/inventory.js';
import { cap, fmtGold } from '../text.js';

export class StatusScreen {
  constructor(menu) { this.menu = menu; this.engine = menu.engine; this.g = menu.g; }
  enter(member) { this.member = member; }
  nextMember(d) {
    const party = this.g.party;
    const i = (party.indexOf(this.member) + d + party.length) % party.length;
    this.member = party[i]; this.menu.memberIndex = i;
    this.engine.audio.sfx('cursor');
  }
  update() {
    const { input, audio } = this.engine;
    if (input.pressed('cancel') || input.pressed('confirm')) { audio.sfx('cancel'); return 'back'; }
    const d = input.repeatDir();
    if (input.pressed('pageL') || d === 'left') this.nextMember(-1);
    else if (input.pressed('pageR') || d === 'right') this.nextMember(1);
    if (input.pointer.pressed) { audio.sfx('cancel'); return 'back'; }
    return null;
  }
  draw(r) {
    const m = this.member;
    const info = memberInfo(m);
    const s = info.stats;
    // Left: identity + vitals.
    drawWindow(r, 4, 4, 160, 98);
    drawPortrait(r, m.id, 10, 10, 48);
    r.text(memberName(m), 68, 10, { color: 'white' });
    r.text(PARTY[m.id].role, 68, 21, { color: 'gray' });
    drawLabel(r, 'lv', 68, 36); r.text(String(m.level || 1), 80, 33);
    drawLabel(r, 'exp', 104, 36); r.text(fmtGold(m.exp || 0), 158, 33, { align: 'right' });
    drawLabel(r, 'next', 104, 47); r.text(fmtGold(info.toNext), 158, 44, { align: 'right', color: 'gray' });
    drawGauge(r, 68, 56, 90, info.expFrac, 'exp', { thin: true });
    drawLabel(r, 'hp', 10, 68); r.text(`${info.hp}/${info.maxHp}`, 80, 65, { align: 'right', color: info.hpFrac <= 0.25 ? 'red' : 'white' });
    drawGauge(r, 10, 77, 70, info.hpFrac, 'hp');
    drawLabel(r, 'mp', 88, 68); r.text(`${info.mp}/${info.maxMp}`, 158, 65, { align: 'right' });
    drawGauge(r, 88, 77, 70, info.mpFrac, 'mp');
    drawLabel(r, 'fury', 10, 88); drawGauge(r, 34, 89, 46, info.furyFrac, 'fury', { thin: true, glow: info.furyFrac >= 1 });
    r.text(`${Math.round(m.fury || 0)}%`, 158, 86, { align: 'right', color: 'orange' });
    // Left bottom: equipment.
    drawWindow(r, 4, 106, 160, 76);
    r.text('Equipment', 12, 111, { color: 'gold' });
    equipKeys(m).forEach((key, i) => {
      const it = equipped(m, key);
      const col = i % 2, row = Math.floor(i / 2);
      const x = 10 + col * 78, y = 123 + row * 11;
      drawIcon(r, isWeaponKey(m, key) ? WEAPON_ICON[key] : SLOT_ICON[key], x, y - 1, { alpha: it ? 1 : 0.4 });
      const name = it ? gearName(it) : '-';
      r.text(name.length > 11 ? name.slice(0, 10) + '.' : name, x + 14, y, { color: it ? (it.rarity || 'common') : 'dim' });
    });
    // Right top: stats.
    drawWindow(r, 168, 4, 212, 64);
    const rows = [['atk', 'ATK', s.atk], ['def', 'DEF', s.def], ['mag', 'MAG', s.mag], ['spr', 'SPR', s.spr], ['spd', 'SPD', s.spd], ['luk', 'LUK', s.luk]];
    rows.forEach(([id, label, v], i) => {
      const col = i % 2, row = Math.floor(i / 2);
      const x = 178 + col * 100, y = 11 + row * 12;
      if (['atk', 'def', 'mag', 'spd'].includes(id)) drawLabel(r, id, x, y + 3); else r.text(label, x, y, { color: 'gold' });
      r.text(String(v), x + 54, y, { align: 'right' });
    });
    r.text(`Crit ${Math.round(4 + (s.luk || 0) / 5 + (s.crit || 0))}%`, 178, 49, { color: 'gray' });
    r.text(`Fury gain +${s.furyGain || 0}%`, 278, 49, { color: 'gray' });
    // Right bottom: mastery.
    drawWindow(r, 168, 72, 212, 110);
    r.text('Weapon Mastery', 178, 77, { color: 'gold' });
    PARTY[m.id].weapons.forEach((t, i) => {
      const y = 92 + i * 42;
      const pts = (m.mastery || {})[t] || 0;
      const lv = masteryLevel(pts);
      drawIcon(r, WEAPON_ICON[t], 178, y - 1);
      r.text(cap(t), 193, y, { color: m.weapon === t ? 'white' : 'gray' });
      drawLabel(r, 'lv', 240, y + 3); r.text(String(lv), 251, y);
      const lo = MASTERY_XP[lv - 1] || 0, hi = MASTERY_XP[lv] ?? lo;
      drawGauge(r, 270, y + 2, 100, lv >= MAX_MASTERY ? 1 : (pts - lo) / Math.max(1, hi - lo), 'exp', { thin: true });
      r.text(lv >= MAX_MASTERY ? 'MAX' : `${pts}/${hi}`, 372, y + 10, { align: 'right', color: 'dim' });
      let next = null;
      for (let L = lv + 1; L <= MAX_MASTERY && !next; L++) { const u = masteryUnlocks(t, L); if (u.length) next = { L, id: u[0] }; }
      r.text(next ? `Next: ${SKILLS[next.id] ? SKILLS[next.id].name : next.id} at Lv ${next.L}` : 'Every technique learned.', 193, y + 11, { color: 'dim' });
      const art = FURY_ARTS[t];
      if (art && SKILLS[art]) r.text(`Fury art: ${SKILLS[art].name}`, 193, y + 22, { color: lv >= 2 ? 'orange' : 'dim' });
      if (i === 0) drawDivider(r, 174, y + 34, 200);
    });
    drawHelpBar(r, `${btnHint()} other members`, { right: 'Status' });
  }
  debugState() { return { screen: 'status', member: this.member.id }; }
}

function btnHint() { return '{i:btn_pageL} {i:btn_pageR} or Left / Right:'; }
export { expForLevel };
