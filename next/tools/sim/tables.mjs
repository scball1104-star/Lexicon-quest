// Prints the markdown reference tables used in docs/BATTLE.md, straight from the data files.
//   node tools/sim/tables.mjs
import { ENEMIES } from '../../src/data/enemies.js';
import { SKILLS } from '../../src/data/skills.js';
import { PARTY, LEVEL_TABLE, EXP_TABLE } from '../../src/data/party.js';
import { EQUIPMENT, UNIQUES } from '../../src/data/items.js';

const out = [];
out.push('| Enemy | Lv | HP | ATK/MAG | DEF/SPR | SPD | Shields | Weak | Resist | EXP / Gold | Moves (telegraph in bold) |');
out.push('|---|---|---|---|---|---|---|---|---|---|---|');
for (const e of Object.values(ENEMIES)) {
  const moves = e.moves.map((m) => SKILLS[m.skill].name);
  if (e.charge) moves.push(`**${SKILLS[e.charge.skill].name}**`);
  const weak = e.stances ? 'by stance' : e.phases ? 'by phase' : e.id === 'lost_page' ? 'by ink color' : e.weak.join(', ');
  out.push(`| ${e.name} | ${e.level} | ${e.hp} | ${e.atk}/${e.mag} | ${e.def}/${e.spr} | ${e.spd} | ${e.shields} | ${weak} | ${e.resist.join(', ') || '-'} | ${e.exp} / ${e.gold} | ${moves.join(', ')} |`);
}
out.push('');
out.push('| Skill | Who | Learn | MP | Target | Power | Types | Rank | Help |');
out.push('|---|---|---|---|---|---|---|---|---|');
for (const s of Object.values(SKILLS)) {
  if (s.kind === 'enemy' || s.kind === 'attack') continue;
  const who = s.kind === 'combo' ? s.members.join('+') : s.user || s.weapon;
  const learn = s.learn ? (s.learn.flag ? `flag ${s.learn.flag}` : s.learn.level ? `Lv ${s.learn.level}` : `M${s.learn.mastery}`) : '-';
  const mp = s.kind === 'combo' ? Object.values(s.cost).join('/') : s.kind === 'fury' ? 'Fury' : s.mp;
  const power = s.kind === 'combo' ? s.parts.map((p) => p.power).join('+') || '-' : s.power ? `${s.power}${s.hits > 1 ? 'x' + s.hits : ''}` : '-';
  const types = s.kind === 'combo' ? [...new Set(s.parts.flatMap((p) => p.types))].join('/') : s.types.join('/');
  out.push(`| ${s.name} | ${who} | ${learn} | ${mp} | ${s.target} | ${power} | ${types || '-'} | ${s.rank} | ${s.help} |`);
}
out.push('');
out.push('| Lv | EXP | Hero HP/MP/ATK/DEF/MAG/SPR/SPD | Mira | Bram |');
out.push('|---|---|---|---|---|');
for (let L = 1; L <= 10; L++) {
  const r = (id) => LEVEL_TABLE[id][L - 1].slice(0, 7).join('/');
  out.push(`| ${L} | ${EXP_TABLE[L - 1]} | ${r('hero')} | ${r('mira')} | ${r('bram')} |`);
}
out.push('');
out.push('| Weapon | Type | Tier | Price | Stats |');
out.push('|---|---|---|---|---|');
for (const e of Object.values(EQUIPMENT).filter((x) => x.slot === 'weapon')) {
  out.push(`| ${e.name} | ${e.type} | ${e.tier} | ${e.price} | ${Object.entries(e.stats).map(([k, v]) => `${k} ${v > 0 ? '+' : ''}${v}`).join(', ')} |`);
}
for (const u of Object.values(UNIQUES)) {
  out.push(`| **${u.name}** (${u.rarity}) | ${u.type || u.slot} | - | - | ${Object.entries(u.stats).map(([k, v]) => `${k} +${v}`).join(', ')}; source: ${u.source} |`);
}
console.log(out.join('\n'));
