// Tech / Magic screen: a member's known skills with MP costs and help; field heals are castable.

import { List } from '../list.js';
import { drawWindow, drawIcon, drawGauge, drawLabel } from '../window.js';
import { drawHelpBar } from '../help.js';
import { MemberPicker, drawMemberHeader } from './common.js';
import { knownSkills, masteryLevel, masteryUnlocks, MAX_MASTERY, PARTY } from '../../data/party.js';
import { SKILLS, FURY_ARTS } from '../../data/skills.js';
import { memberInfo, WEAPON_ICON } from '../party.js';
import { useSkillOnMember } from '../../game/inventory.js';
import { cap } from '../text.js';

const KIND_ICON = { tech: 'scroll', magic: 'magic', fury: 'fury', combo: 'combo' };

export class SkillsScreen {
  constructor(menu, kind = 'tech') { this.menu = menu; this.engine = menu.engine; this.g = menu.g; this.kind = kind; }
  enter(member) {
    this.member = member;
    this.picker = null;
    this.list = new List({ x: 174, y: 10, w: 200, rowH: 12, rows: 13, items: [], textX: 19 });
    this.refresh(false);
  }
  get title() { return this.kind === 'magic' ? 'Magic' : 'Tech'; }
  refresh(keep = true) {
    const m = this.member;
    const known = knownSkills(m);
    const list = [];
    for (const id of known) {
      const s = SKILLS[id];
      if (!s) continue;
      const isMagic = s.kind === 'magic';
      if (this.kind === 'magic' ? !isMagic : isMagic) continue;
      const fieldUse = s.formula === 'heal' || (s.effects || []).some((e) => e.heal || e.partyHeal);
      const fury = s.kind === 'fury';
      list.push({ id, label: s.name, icon: KIND_ICON[s.kind] || 'scroll', right: fury ? 'Fury' : s.mp ? `${s.mp} MP` : '', rightColor: fury ? 'orange' : 'mp',
        help: s.help, disabled: !fieldUse || (m.mp || 0) < (s.mp || 0), fieldUse, weapon: s.weapon || null });
    }
    // Combos the member takes part in (information only).
    for (const s of Object.values(SKILLS)) {
      if (s.kind !== 'combo' || this.kind === 'magic' || !s.members.includes(m.id)) continue;
      if (s.learn && s.learn.level && m.level < s.learn.level) continue;
      list.push({ id: s.id, label: s.name, icon: 'combo', right: `${s.cost[m.id]} MP`, rightColor: 'mp', help: s.help, disabled: true, fieldUse: false, combo: true });
    }
    this.list.setItems(list, keep);
  }
  nextMember(d) {
    const party = this.g.party;
    const i = (party.indexOf(this.member) + d + party.length) % party.length;
    this.member = party[i];
    this.menu.memberIndex = i;
    this.list.index = 0; this.list.scroll = 0;
    this.refresh(false);
    this.engine.audio.sfx('cursor');
  }
  get help() {
    if (this.note) return this.note;
    const it = this.list.item;
    if (!it) return this.kind === 'magic' ? 'No spells known yet.' : 'No techs known yet. Mastery teaches them.';
    if (it.combo) return `${it.help} (battle only)`;
    return it.help || '';
  }
  say(text) { this.note = text; this.noteT = 90; }
  update() {
    const { input, audio } = this.engine;
    if (this.note && --this.noteT <= 0) this.note = null;
    if (this.picker) {
      const res = this.picker.update();
      if (res === -1) { this.picker = null; return null; }
      if (res != null) {
        const sk = SKILLS[this.list.item.id];
        const targets = sk.target === 'allies' ? this.g.party : this.picker.members[res];
        const out = useSkillOnMember(this.g, this.member, this.list.item.id, targets);
        if (!out.ok) { audio.sfx('buzzer'); this.say(out.reason); return null; }
        audio.sfx(sk.sfx || 'heal');
        this.picker.showNumber(res, String(out.healed), 'heal');
        this.refresh(true);
        if (this.list.item && this.list.item.disabled) this.picker = null;
      }
      return null;
    }
    const act = this.list.update(input, audio);
    if (act === 'cancel') return 'back';
    if (act === 'pageL') { this.nextMember(-1); return null; }
    if (act === 'pageR') { this.nextMember(1); return null; }
    if (act === 'confirm') {
      const it = this.list.item;
      if (!it) return null;
      const sk = SKILLS[it.id];
      this.picker = new MemberPicker(this.engine, this.g.party, { title: `${sk.name} on...`, w: 220 });
    }
    return null;
  }
  draw(r) {
    const m = this.member;
    const info = memberInfo(m);
    drawMemberHeader(r, m, 4, 4, 164, 44, { line2: `${PARTY[m.id].role}` });
    drawLabel(r, 'mp', 48, 34);
    r.text(`${info.mp}/${info.maxMp}`, 128, 31, { align: 'right' });
    drawGauge(r, 48, 40, 110, info.mpFrac, 'mp', { thin: true });
    // Mastery panel: each weapon type with level, gauge and the next unlock.
    drawWindow(r, 4, 50, 164, 130);
    r.text('Mastery', 12, 56, { color: 'gold' });
    const types = PARTY[m.id].weapons;
    types.forEach((t, i) => {
      const y = 70 + i * 50;
      const pts = (m.mastery || {})[t] || 0;
      const lv = masteryLevel(pts);
      drawIcon(r, WEAPON_ICON[t], 12, y - 1);
      r.text(cap(t), 27, y, { color: m.weapon === t ? 'white' : 'gray' });
      drawLabel(r, 'lv', 76, y + 3);
      r.text(String(lv), 87, y);
      const XP = [0, 25, 70, 140, 240, 380, 560, 800];
      const lo = XP[lv - 1] || 0, hi = XP[lv] ?? lo;
      drawGauge(r, 100, y + 2, 60, lv >= MAX_MASTERY ? 1 : (pts - lo) / Math.max(1, hi - lo), 'exp', { thin: true });
      let next = null;
      for (let L = lv + 1; L <= MAX_MASTERY && !next; L++) { const u = masteryUnlocks(t, L); if (u.length) next = { L, id: u[0] }; }
      if (next) {
        const s = SKILLS[next.id];
        r.text(`Next: ${s ? s.name : next.id}`, 27, y + 12, { color: 'dim' });
        r.text(`at Lv ${next.L}`, 160, y + 12, { align: 'right', color: 'dim' });
      } else r.text(FURY_ARTS[t] && lv >= 2 ? 'All techs learned.' : 'Mastered.', 27, y + 12, { color: 'dim' });
      const art = FURY_ARTS[t];
      if (art && SKILLS[art]) r.text(`Fury: ${SKILLS[art].name}`, 27, y + 23, { color: lv >= 2 ? 'orange' : 'dim' });
    });
    drawWindow(r, 168, 4, 212, 176);
    this.list.draw(r, { frame: r.frame, cursor: !this.picker, bar: true });
    if (!this.list.items.length) r.text('Nothing to show.', 274, 90, { align: 'center', color: 'dim' });
    drawHelpBar(r, this.help, { right: this.title });
    if (this.picker) this.picker.draw(r);
  }
  debugState() { return { screen: this.kind, member: this.member.id, index: this.list.index, picker: !!this.picker }; }
}
