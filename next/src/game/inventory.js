// Inventory helpers for the field UI (W2-ui): equip / unequip / optimize / sell, item and skill use on a
// party member. Pure (no DOM); node tests import it. Mutates the game object it is given.
//
//   equipKeys(member) -> ['sword', 'axe', 'body', 'head', 'charm', 'boots', 'mantle']   (weapon types first)
//   equipped(member, key) -> instance | null      candidates(g, member, key) -> [{ uid, item }]
//   equipGear(g, member, key, uid) -> { ok, reason }   unequip(g, member, key)   removeAll(g, member)
//   optimize(g, member) -> number of changes       equipScore(member, key, item)
//   sellConsumable(g, id, qty) -> gold gained      sellGear(g, uid) -> gold gained
//   buyItem(g, id, qty, price) -> { ok, reason }   buyGear(g, baseId, price) -> { ok, reason, uid }
//   useItemOnMember(g, itemId, member) -> { ok, reason, hp, mp, revived }
//   fieldSkills(member) -> [{ id, skill, mp, usable }]   useSkillOnMember(g, caster, skillId, target) -> { ok, reason, healed }
//   itemLine(instance) -> '+6 ATK, +12% Fire'

import { EQUIPMENT, UNIQUES, CONSUMABLES, ARMOR_SLOTS, canEquip, sellPrice, ITEMS } from '../data/items.js';
import { PARTY, knownSkills } from '../data/party.js';
import { SKILLS } from '../data/skills.js';
import { memberStats, equipDelta } from '../battle/rules.js';
import { toInstance, baseOf, itemStats, itemValue, describeItem } from '../battle/loot.js';
import { count, take, give, addGear, removeGear, findGear } from './state.js';

export function weaponTypes(member) { return (PARTY[member.id] || { weapons: [] }).weapons; }
export function equipKeys(member) { return [...weaponTypes(member), ...ARMOR_SLOTS]; }
export function isWeaponKey(member, key) { return weaponTypes(member).includes(key); }

export function equipped(member, key) {
  const v = member.equip ? member.equip[key] : null;
  return v ? toInstance(v) : null;
}

/** Can this member wear `item` (instance or base id) in equip key `key`? */
export function fits(member, key, item) {
  const base = baseOf(item);
  if (!base) return false;
  if (base.slot === 'weapon') return isWeaponKey(member, key) && base.type === key;
  if (base.slot !== key) return false;
  return canEquip(member.id, weaponTypes(member), base);
}

/** Unworn gear instances in g.gear that fit the key, best score first. */
export function candidates(g, member, key) {
  return g.gear.filter((it) => fits(member, key, it))
    .map((it) => ({ uid: it.uid, item: it, score: equipScore(member, key, it) }))
    .sort((a, b) => b.score - a.score);
}

const ROLE_WEIGHTS = {
  hero: { atk: 3, def: 1.6, mag: 0.6, spr: 0.8, spd: 2.5, luk: 0.5, maxHp: 0.08, maxMp: 0.1, crit: 0.8 },
  mira: { atk: 0.8, def: 1.4, mag: 3, spr: 1.4, spd: 2, luk: 0.5, maxHp: 0.08, maxMp: 0.3, crit: 0.3, healPow: 0.5 },
  bram: { atk: 2.6, def: 2.2, mag: 0.2, spr: 1, spd: 2, luk: 0.4, maxHp: 0.1, maxMp: 0.05, crit: 0.5 },
};
/** Score of putting `item` into `key` for this member (higher = better). Relative to what is worn now. */
export function equipScore(member, key, item) {
  const w = ROLE_WEIGHTS[member.id] || ROLE_WEIGHTS.hero;
  const d = equipDelta(member, key, item);
  let s = 0;
  for (const [k, v] of Object.entries(d)) s += (w[k] ?? 0.3) * v;
  const base = baseOf(item);
  if (base && base.ilvl) s += base.ilvl * 0.01;   // tie-break toward newer gear
  return s;
}

/** Move gear `uid` from the bag into equip key `key`; the old piece goes back to the bag. */
export function equipGear(g, member, key, uid) {
  const it = findGear(g, uid);
  if (!it) return { ok: false, reason: 'No such item' };
  if (!fits(member, key, it)) return { ok: false, reason: 'Cannot equip' };
  const old = equipped(member, key);
  removeGear(g, uid);
  const inst = { ...it }; delete inst.uid;
  member.equip = member.equip || {};
  member.equip[key] = inst;
  if (old) addGear(g, old);
  clampVitals(member);
  return { ok: true };
}

export function unequip(g, member, key) {
  const old = equipped(member, key);
  if (!old) return { ok: false, reason: 'Nothing equipped' };
  if (isWeaponKey(member, key) && !weaponTypes(member).some((w) => w !== key && member.equip[w])) {
    return { ok: false, reason: 'Keep one weapon' };
  }
  member.equip[key] = null;
  addGear(g, old);
  if (member.weapon === key) member.weapon = weaponTypes(member).find((w) => member.equip[w]) || member.weapon;
  clampVitals(member);
  return { ok: true };
}

export function removeAll(g, member) {
  let n = 0;
  for (const key of equipKeys(member)) {
    const keepWeapon = isWeaponKey(member, key) && !weaponTypes(member).some((w) => w !== key && member.equip[w]);
    if (keepWeapon) continue;
    if (unequip(g, member, key).ok) n++;
  }
  return n;
}

/** Equip the best candidate in every key (never leaves a slot empty that was filled). Returns changes. */
export function optimize(g, member) {
  let changes = 0;
  for (const key of equipKeys(member)) {
    const list = candidates(g, member, key);
    const best = list[0];
    if (!best) continue;
    const cur = equipped(member, key);
    const curScore = cur ? equipScore(member, key, cur) : -Infinity;
    if (best.score > curScore + 1e-6) { if (equipGear(g, member, key, best.uid).ok) changes++; }
  }
  return changes;
}

export function clampVitals(member) {
  const s = memberStats(member);
  if (member.hp > s.maxHp) member.hp = s.maxHp;
  if (member.mp > s.maxMp) member.mp = s.maxMp;
}

// ---------------------------------------------------------------- receiving things on the field
/**
 * Put a found or given item where it belongs: equipment becomes a gear instance in the bag (so it can be
 * equipped), consumables and key items count in `items`. Returns { kind: 'gear'|'item'|'key', id, uid?, qty }
 * (`uid` of the last instance for gear; `qty` as given). Unknown ids are stored as items and flagged.
 */
export function grant(g, id, qty = 1) {
  const def = ITEMS[id];
  if (def && def.kind === 'equipment') {
    let uid = null;
    for (let i = 0; i < Math.max(1, qty | 0); i++) uid = addGear(g, id);
    return { kind: 'gear', id, uid, qty: Math.max(1, qty | 0) };
  }
  give(g, id, qty);
  return { kind: def && def.kind === 'key' ? 'key' : 'item', id, qty, unknown: !def };
}

// ---------------------------------------------------------------- buying and selling
export function sellConsumable(g, id, qty = 1) {
  const def = CONSUMABLES[id];
  if (!def) return 0;
  qty = Math.min(qty, count(g, id));
  if (qty <= 0) return 0;
  take(g, id, qty);
  const gold = sellPrice(def) * qty;
  g.gold += gold;
  return gold;
}
export function sellGear(g, uid) {
  const it = removeGear(g, uid);
  if (!it) return 0;
  const gold = itemValue(it);
  g.gold += gold;
  return gold;
}
export function buyItem(g, id, qty = 1, price) {
  const def = ITEMS[id];
  if (!def) return { ok: false, reason: 'No such item' };
  const unit = price ?? def.price ?? 0;
  const cost = unit * qty;
  if (g.gold < cost) return { ok: false, reason: 'Not enough gold' };
  if (def.kind === 'consumable') {
    if (count(g, id) + qty > 99) return { ok: false, reason: 'You cannot carry more' };
    give(g, id, qty);
  } else {
    for (let i = 0; i < qty; i++) addGear(g, id);
  }
  g.gold -= cost;
  return { ok: true, cost };
}

/** Everything sellable: consumables with qty and unworn gear. */
export function sellables(g) {
  const out = [];
  for (const [id, q] of Object.entries(g.items)) {
    const def = CONSUMABLES[id];
    if (def && q > 0) out.push({ kind: 'consumable', id, qty: q, name: def.name, icon: def.icon, price: sellPrice(def) });
  }
  for (const it of g.gear) {
    const base = baseOf(it);
    out.push({ kind: 'gear', uid: it.uid, item: it, name: it.name || (base && base.name) || '???', icon: base ? base.icon : 'bag', price: itemValue(it), rarity: it.rarity });
  }
  return out;
}

// ---------------------------------------------------------------- using things on the field
export function useItemOnMember(g, itemId, member) {
  const def = CONSUMABLES[itemId];
  if (!def) return { ok: false, reason: 'No such item' };
  if (!def.field) return { ok: false, reason: 'Not usable here' };
  if (count(g, itemId) <= 0) return { ok: false, reason: 'None left' };
  const s = memberStats(member);
  const e = def.effect || {};
  const ko = (member.hp ?? s.maxHp) <= 0;
  const out = { ok: false, hp: 0, mp: 0, revived: false };
  if (e.revive) {
    if (!ko) return { ok: false, reason: 'Not fallen' };
    member.hp = Math.max(1, Math.round(s.maxHp * e.revive));
    out.ok = true; out.revived = true; out.hp = member.hp;
  } else if (ko) return { ok: false, reason: 'Fallen' };
  if (e.heal) {
    const before = member.hp;
    if (before >= s.maxHp) return { ok: false, reason: 'HP is full' };
    member.hp = Math.min(s.maxHp, before + e.heal); out.hp = member.hp - before; out.ok = true;
  }
  if (e.healPct) {
    const before = member.hp;
    member.hp = Math.min(s.maxHp, before + Math.round(s.maxHp * e.healPct)); out.hp += member.hp - before; out.ok = out.ok || member.hp > before;
  }
  if (e.mp) {
    const before = member.mp;
    if (before >= s.maxMp && !out.ok) return { ok: false, reason: 'MP is full' };
    member.mp = Math.min(s.maxMp, before + e.mp); out.mp = member.mp - before; out.ok = out.ok || out.mp > 0;
  }
  if (e.mpPct) { const before = member.mp; member.mp = Math.min(s.maxMp, before + Math.round(s.maxMp * e.mpPct)); out.mp += member.mp - before; out.ok = out.ok || out.mp > 0; }
  if (e.cure) {
    // Field members carry no battle statuses in Episode 1; cures outside battle do nothing.
    if (!out.ok) return { ok: false, reason: 'Nothing to cure' };
  }
  if (!out.ok) return { ok: false, reason: 'No effect' };
  take(g, itemId, 1);
  return out;
}

/** Skills a member can use on the field (heals and cures), with MP cost and whether MP allows it. */
export function fieldSkills(member) {
  const out = [];
  for (const id of knownSkills(member)) {
    const sk = SKILLS[id];
    if (!sk || sk.kind === 'fury' || sk.kind === 'combo') continue;
    const heals = sk.formula === 'heal' || (sk.effects || []).some((e) => e.heal || e.partyHeal);
    if (!heals) continue;
    out.push({ id, skill: sk, mp: sk.mp || 0, usable: (member.mp || 0) >= (sk.mp || 0) });
  }
  return out;
}

/** Use a field-usable skill: single ally, all allies (party) or self. targets: member or array. */
export function useSkillOnMember(g, caster, skillId, target) {
  const sk = SKILLS[skillId];
  if (!sk) return { ok: false, reason: 'No such skill' };
  const cost = sk.mp || 0;
  if ((caster.mp || 0) < cost) return { ok: false, reason: 'Not enough MP' };
  const cs = memberStats(caster);
  const targets = Array.isArray(target) ? target : [target || caster];
  let healed = 0, any = false;
  for (const t of targets) {
    if (!t) continue;
    const ts = memberStats(t);
    if ((t.hp ?? ts.maxHp) <= 0) continue;
    const before = t.hp;
    if (sk.formula === 'heal') {
      const amt = Math.round(cs.mag * (sk.power / 100) * (1 + (cs.healPow || 0) / 100));
      t.hp = Math.min(ts.maxHp, before + amt);
    }
    for (const e of sk.effects || []) {
      if (e.heal) t.hp = Math.min(ts.maxHp, t.hp + Math.round(ts.maxHp * e.heal));
      if (e.partyHeal) t.hp = Math.min(ts.maxHp, t.hp + Math.round(ts.maxHp * e.partyHeal));
    }
    if (t.hp > before) { healed += t.hp - before; any = true; }
  }
  if (!any) return { ok: false, reason: 'HP is full' };
  caster.mp -= cost;
  return { ok: true, healed, cost };
}

/** '+6 ATK, +12% Fire' for an instance or base id. */
export function itemLine(item) {
  return describeItem(item).join(', ');
}

export function gearName(item) {
  const base = baseOf(item);
  return (item && item.name) || (base && base.name) || '???';
}

export { itemStats, baseOf, toInstance, EQUIPMENT, UNIQUES };
