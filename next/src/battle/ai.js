// Battle AI: enemy behavior scripts (telegraphs one turn ahead, targeting rules, boss phases) and
// party policies (the competent policy doubles as the Auto-battle brain). Pure and deterministic:
// randomness only through ctx.R (the battle's injected rng).
//
// rules.js calls the hooks below with `ctx`, its internal API (see rules.js "the context AI uses").
// Party policies use only the public battle API (commands, targets, estimate, timeline, unit).

import { ENEMIES, LOST_PAGE_VARIANTS } from '../data/enemies.js';
import { SKILLS, FURY_ARTS } from '../data/skills.js';
import { CONSUMABLES } from '../data/items.js';

const PAGE_ARMOR = 0.8;          // Archivore damage taken while Lost Pages live
const DEVOUR_GUARDED = 0.5;      // extra cut when Devour Name hits a defender
const DEVOUR_DRAIN = 0.08;       // Archivore heals 6% max HP from a devoured name
const FEAST_HEAL = 0.07;         // per page eaten
const MAX_PAGE_WAVES = 2;        // the Book can be torn open twice
const DEVOUR_EMPOWER = 0.2;      // ATK and MAG gained per name devoured

// =============================================================================== targeting
function pickTarget(ctx, u, rule = 'random') {
  const foes = ctx.living('party').filter((p) => !ctx.has(p, 'kept'));
  if (!foes.length) return null;
  const R = ctx.R;
  switch (rule) {
    case 'lowestHp': return foes.reduce((a, b) => (b.hp < a.hp ? b : a)).uid;
    case 'lowestHpPct': {
      // mostly the weakest, sometimes anyone (keeps it from feeling robotic)
      if (R() < 0.35) return foes[Math.floor(R() * foes.length)].uid;
      return foes.reduce((a, b) => (b.hp / b.maxHp < a.hp / a.maxHp ? b : a)).uid;
    }
    case 'healer': {
      const m = foes.find((f) => f.id === 'mira');
      if (m && R() < 0.6) return m.uid;
      return foes[Math.floor(R() * foes.length)].uid;
    }
    case 'highestAtk': return foes.reduce((a, b) => (ctx.eff(b, 'atk') > ctx.eff(a, 'atk') ? b : a)).uid;
    default: return foes[Math.floor(R() * foes.length)].uid;
  }
}

function moveOk(ctx, u, m) {
  if (m.once && u.ai.used[m.skill]) return false;
  switch (m.if) {
    case 'notHasted': return !ctx.has(u, 'haste');
    case 'notProtected': return !ctx.has(u, 'protect');
    case 'allyHurt': return ctx.living('enemy').some((e) => e.hp < e.maxHp * 0.7);
    case 'bossHurt': return ctx.living('enemy').some((e) => e.boss && e.hp < e.maxHp * 0.97);
    case 'hasAlly': return ctx.living('enemy').some((e) => e.uid !== u.uid);
    case 'notTaunting': return !ctx.has(u, 'taunt');
    case 'notFocused': return !ctx.has(u, 'focus');
    default: return true;
  }
}

function weightedMove(ctx, u, moves) {
  const ok = moves.filter((m) => moveOk(ctx, u, m));
  if (!ok.length) return null;
  const total = ok.reduce((s, m) => s + m.weight, 0);
  let r = ctx.R() * total;
  for (const m of ok) { r -= m.weight; if (r < 0) return m; }
  return ok[ok.length - 1];
}

function planFromMove(ctx, u, m) {
  if (!m) return null;
  u.ai.used[m.skill] = true;
  const sk = SKILLS[m.skill];
  let target = sk.target === 'enemy' ? pickTarget(ctx, u, m.target) : null;
  if (sk.target === 'ally') {
    // enemy support moves (a reflection's Mend): the most hurt ally, itself included
    const pool = ctx.living(u.side);
    target = pool.length ? pool.reduce((a, b) => (b.hp / b.maxHp < a.hp / a.maxHp ? b : a)).uid : null;
  }
  return { skill: m.skill, target };
}

// =============================================================================== scripts
const basic = {
  decide(ctx, u, d) {
    // `opener`: a forced first move (the Glassback opens with Harden so its reflect is taught at once)
    if (d.opener && u.ai.turns <= 1 && !u.ai.used[d.opener]) { u.ai.used[d.opener] = true; return { skill: d.opener, target: null }; }
    return planFromMove(ctx, u, weightedMove(ctx, u, d.moves));
  },
  afterTurn(ctx, u, d) {
    if (!d.charge || u.charging || u.broken) return;
    const at = u.ai.chargeAt ?? d.charge.first;
    if (u.ai.turns >= at) {
      const sk = SKILLS[d.charge.skill];
      ctx.planCharge(u, d.charge.skill, sk.target === 'enemy' ? pickTarget(ctx, u, d.charge.target) : null);
    }
  },
  onChargeFired(ctx, u, d) { if (d.charge) u.ai.chargeAt = u.ai.turns + d.charge.cooldown; },
  onChargeCancelled(ctx, u, d) { if (d.charge) u.ai.chargeAt = u.ai.turns + d.charge.cooldown; },
};

const lostPage = {
  decide(ctx, u, d) {
    const moves = d.moves.map((m) => (m.skill === 'recite' ? { ...m, if: 'bossHurt' } : m));
    return planFromMove(ctx, u, weightedMove(ctx, u, moves));
  },
  afterTurn() {},
};

// --- Echo Warden: alternating stances, Reverberate telegraph ------------------------------------
function setStance(ctx, u, stance, announce = true) {
  const d = ENEMIES[u.id];
  const s = d.stances[stance];
  u.ai.stance = stance;
  u.ai.stanceTurns = 0;
  ctx.setWeak(u, s.weak, [], `${u.id}:${stance}`);
  if (announce) ctx.emit({ type: 'stance', actor: u.uid, stance, name: s.name, text: s.text, reflect: s.reflect });
}
const echoWarden = {
  start(ctx, u) { setStance(ctx, u, 'mirror'); },
  decide: basic.decide,
  afterTurn(ctx, u, d) {
    u.ai.stanceTurns = (u.ai.stanceTurns || 0) + 1;
    if (u.ai.stanceTurns >= d.stanceEvery && !u.broken) setStance(ctx, u, u.ai.stance === 'mirror' ? 'bulwark' : 'mirror');
    basic.afterTurn(ctx, u, d);
  },
  onRecover(ctx, u) { setStance(ctx, u, u.ai.stance === 'mirror' ? 'bulwark' : 'mirror'); },
  onChargeFired: basic.onChargeFired,
  onChargeCancelled: basic.onChargeCancelled,
  reflect(ctx, tgt, part) {
    if (tgt.broken) return null;
    const s = ENEMIES[tgt.id].stances[tgt.ai.stance];
    if (!s) return null;
    if (s.reflect === 'magic' && part.formula === 'mag') return 'magic';
    if (s.reflect === 'phys' && part.formula === 'phys') return 'phys';
    return null;
  },
};

// --- The Archivore: three phases, Lost Pages, Devour Name, Ink Storm, Feast ---------------------
function pages(ctx) { return ctx.living('enemy').filter((e) => e.id === 'lost_page'); }

function summonPages(ctx, boss, n = 2) {
  const used = boss.ai.lastVariants || [];
  let pool = LOST_PAGE_VARIANTS.filter((v) => !used.includes(v.id));
  if (pool.length < n) pool = LOST_PAGE_VARIANTS.slice();
  const chosen = [];
  for (let i = 0; i < n && pool.length; i++) {
    const v = pool.splice(Math.floor(ctx.R() * pool.length), 1)[0];
    chosen.push(v.id);
    ctx.summon('lost_page', { variant: v.id, by: boss, summoned: true, firstTurn: 0.5 + 0.25 * i });
  }
  boss.ai.lastVariants = chosen;
  boss.ai.summons = (boss.ai.summons || 0) + 1;
  boss.ai.feastAt = boss.ai.turns + 2;
  boss.ai.resummonAt = null;
}

function enterPhase(ctx, u, idx) {
  const d = ENEMIES[u.id];
  const p = d.phases[idx];
  u.ai.phase = idx;
  ctx.cancelCharge(u, 'phase');
  ctx.emit({ type: 'phase', actor: u.uid, phase: idx + 1, id: p.id, name: p.name, text: p.text });
  ctx.setWeak(u, p.weak, p.resist, `${u.id}:${p.id}`);
  if (idx > 0) ctx.setShields(u, p.shields);
  if (p.summon) summonPages(ctx, u, p.summon);
  if (idx === 2) {
    for (const pg of pages(ctx)) ctx.kill(pg, 'burned');
    ctx.addStatus(u, 'haste', 99, u);
    u.ai.lastCharge = 'ink_storm'; // the Maw opens with Devour Name
    u.ai.nextChargeAt = u.ai.turns + 1;
  }
  if (idx === 1) {
    u.ai.devourAt = Math.max(u.ai.devourAt ?? 0, u.ai.turns + 3);
    u.ai.stormAt = u.ai.turns + 4;
  }
}

const archivore = {
  start(ctx, u) {
    u.ai.phase = 0;
    u.ai.devourAt = 2;
    u.ai.stormAt = 99;
    enterPhase(ctx, u, 0);
  },
  decide(ctx, u, d) {
    if (u.ai.phase === 1 && !pages(ctx).length && (u.ai.summons || 0) < MAX_PAGE_WAVES && u.ai.resummonAt !== null
      && u.ai.turns >= (u.ai.resummonAt ?? 99)) {
      return { skill: 'summon_pages', special: true };
    }
    return basic.decide(ctx, u, d);
  },
  afterTurn(ctx, u) {
    if (u.charging || u.broken) return;
    const t = u.ai.turns;
    const ph = u.ai.phase;
    if (t < (u.ai.nextChargeAt ?? 0)) return; // breathing room between big moves
    const devourTarget = () => {
      const foes = ctx.living('party').filter((p) => !ctx.has(p, 'kept'));
      const fresh = foes.filter((f) => !ctx.has(f, 'nameless'));
      const pool = fresh.length ? fresh : foes;
      const mira = pool.find((f) => f.id === 'mira');
      if (mira && ctx.R() < 0.45) return mira.uid;
      return pool[Math.floor(ctx.R() * pool.length)].uid;
    };
    if (ph === 2) {
      // Nameless Maw: alternate Devour Name and Ink Storm
      const next = u.ai.lastCharge === 'devour_name' ? 'ink_storm' : 'devour_name';
      ctx.planCharge(u, next, next === 'devour_name' ? devourTarget() : null);
      return;
    }
    if (ph === 1 && pages(ctx).length && t >= (u.ai.feastAt ?? 99)) { ctx.planCharge(u, 'feast'); return; }
    if (t >= (u.ai.devourAt ?? 99)) { ctx.planCharge(u, 'devour_name', devourTarget()); return; }
    if (ph >= 1 && t >= (u.ai.stormAt ?? 99)) { ctx.planCharge(u, 'ink_storm'); }
  },
  onChargeFired(ctx, u, sk) { archivore.onChargeCancelled(ctx, u, null, sk.id); },
  onChargeCancelled(ctx, u, reason, skillId) {
    const id = skillId || u.ai.lastCharge;
    const t = u.ai.turns;
    u.ai.lastCharge = id;
    if (id === 'devour_name') u.ai.devourAt = t + 4;
    if (id === 'ink_storm') u.ai.stormAt = t + 4;
    if (id === 'feast') u.ai.feastAt = t + 4;
    u.ai.nextChargeAt = t + 2; // at least one ordinary turn between telegraphed moves
  },
  clampDamage(ctx, u, amt) {
    const d = ENEMIES[u.id];
    const nextP = d.phases[(u.ai.phase ?? 0) + 1];
    if (!nextP) return amt;
    const floorHp = Math.floor(u.maxHp * nextP.at);
    if (u.hp - amt < floorHp) return Math.max(0, u.hp - floorHp);
    return amt;
  },
  onDamaged(ctx, u) {
    const d = ENEMIES[u.id];
    const nextP = d.phases[(u.ai.phase ?? 0) + 1];
    if (nextP && u.hp <= Math.floor(u.maxHp * nextP.at)) enterPhase(ctx, u, u.ai.phase + 1);
  },
  damageTakenMult(ctx, u) { return u.ai.phase === 1 && pages(ctx).length ? PAGE_ARMOR : 1; },
  special(ctx, u, sk, e, targets) {
    if (e.summon) {
      ctx.emit({ type: 'message', text: 'The Archivore rips fresh pages from the Book!' });
      summonPages(ctx, u, 2);
      return;
    }
    if (e.feast) {
      const ps = pages(ctx);
      if (!ps.length) {
        ctx.emit({ type: 'feast', actor: u.uid, pages: [], healed: 0 });
        ctx.emit({ type: 'message', text: 'The Archivore snaps at empty air. Its pages are gone!' });
        return;
      }
      for (const p of ps) ctx.kill(p, 'devoured');
      const healed = ctx.heal(u, u.maxHp * FEAST_HEAL * ps.length, u, { feast: true });
      ctx.emit({ type: 'feast', actor: u.uid, pages: ps.map((p) => p.uid), healed });
      ctx.addStatus(u, 'haste', 3, u);
      u.ai.resummonAt = u.ai.turns + 2;
      return;
    }
    if (e.devour) {
      for (const t of targets) {
        if (!t || !t.alive) continue;
        if (t.defending) {
          ctx.emit({ type: 'devour', actor: u.uid, target: t.uid, success: false });
          ctx.emit({ type: 'message', text: `${t.name} holds fast to their name!` });
          continue;
        }
        ctx.emit({ type: 'devour', actor: u.uid, target: t.uid, success: true });
        ctx.emit({ type: 'message', text: `The Archivore devours ${t.name}'s name!` });
        ctx.addStatus(t, 'silence', 3, u);
        ctx.addStatus(t, 'nameless', 99, u);
        ctx.heal(u, u.maxHp * DEVOUR_DRAIN, u, { drain: true });
        // every name it swallows makes it stronger for the rest of the fight
        u.ai.namesEaten = (u.ai.namesEaten || 0) + 1;
        ctx.addMod(u, 'atk', 1 + DEVOUR_EMPOWER, 99, `devour${u.ai.namesEaten}`);
        ctx.addMod(u, 'mag', 1 + DEVOUR_EMPOWER, 99, `devour${u.ai.namesEaten}`);
      }
    }
  },
  onDeath(ctx, u) {
    if (u.id !== 'lost_page') return;
    const boss = ctx.living('enemy').find((e) => e.id === 'archivore');
    if (boss && !pages(ctx).length && boss.ai.phase === 1) {
      boss.ai.resummonAt = boss.ai.turns + 3;
      if (boss.charging && boss.charging.skill === 'feast') {
        ctx.emit({ type: 'message', text: 'The pages are free! The Archivore has nothing left to feast on.' });
      }
    }
  },
};

// --- Data-driven phases (the Briar Alpha, W6-content) ---------------------------------------------
// `phases` past the first fire when HP falls to their `at` fraction (damage stops at the threshold, so no
// phase is skipped). A phase may set weak/resist and shields, `summon` one enemy by id and grant `haste`.
// Weakness knowledge carries over (same weakKey): only the Archivore makes the player relearn per phase.
function enterDataPhase(ctx, u, idx) {
  const p = ENEMIES[u.id].phases[idx];
  u.ai.phase = idx;
  ctx.cancelCharge(u, 'phase');
  ctx.emit({ type: 'phase', actor: u.uid, phase: idx + 1, id: p.id, name: p.name, text: p.text });
  if (p.weak) ctx.setWeak(u, p.weak, p.resist, u.weakKey);
  if (idx > 0 && p.shields) ctx.setShields(u, p.shields);
  if (p.summon) ctx.summon(p.summon, { by: u, summoned: true, firstTurn: 0.5 });
  if (p.haste) ctx.addStatus(u, 'haste', 99, u);
}
const phased = {
  start(ctx, u) { u.ai.phase = 0; },
  decide: basic.decide,
  afterTurn: basic.afterTurn,
  onChargeFired: basic.onChargeFired,
  onChargeCancelled: basic.onChargeCancelled,
  clampDamage(ctx, u, amt) {
    const nextP = ENEMIES[u.id].phases[(u.ai.phase ?? 0) + 1];
    if (!nextP) return amt;
    const floorHp = Math.floor(u.maxHp * nextP.at);
    return u.hp - amt < floorHp ? Math.max(0, u.hp - floorHp) : amt;
  },
  onDamaged(ctx, u) {
    const nextP = ENEMIES[u.id].phases[(u.ai.phase ?? 0) + 1];
    if (nextP && u.hp <= Math.floor(u.maxHp * nextP.at)) enterDataPhase(ctx, u, (u.ai.phase ?? 0) + 1);
  },
};


// =============================================================================== Episode 2 scripts (E2-battle)
const partyFoes = (ctx) => ctx.living('party').filter((p) => !ctx.has(p, 'kept'));
const cap1 = (t) => t.charAt(0).toUpperCase() + t.slice(1);

// --- Borrowed Shadow (ai 'mimic'): borrows the type that last hit it -------------------------------------------
// A hit of a type it is not weak to becomes its borrowed type: it takes half damage from that type until a hit of
// another type lands, and on its turn it throws a shadow copy of it back at whoever hit it last. A weakness hit
// (light, bow) clears the borrowed type. Party healing in front of it gets copied too (Shadow Mend on itself).
const SHADOW_COPY = { sword: 'shadow_strike', axe: 'shadow_strike', spear: 'shadow_strike', staff: 'shadow_strike',
  bow: 'shadow_strike', fire: 'shadow_ember', ice: 'shadow_frost', thunder: 'shadow_spark' };
export const MIMIC_MULT = 0.5;
const mimic = {
  decide(ctx, u, d) {
    const sawHeal = u.ai.sawHeal;
    u.ai.sawHeal = false;
    if (sawHeal && u.hp < u.maxHp * 0.8) { u.ai.used.shadow_mend = true; return { skill: 'shadow_mend', target: null }; }
    const copy = u.ai.adapt && SHADOW_COPY[u.ai.adapt];
    if (copy) {
      const foes = partyFoes(ctx);
      const att = foes.find((f) => f.uid === u.ai.lastAttacker);
      return { skill: copy, target: att ? att.uid : pickTarget(ctx, u) };
    }
    return basic.decide(ctx, u, d);
  },
  afterTurn: (ctx, u, d) => basic.afterTurn(ctx, u, d),
  onChargeFired: (ctx, u, d) => basic.onChargeFired(ctx, u, d),
  onChargeCancelled: (ctx, u, d) => basic.onChargeCancelled(ctx, u, d),
  onHit(ctx, u, src, types, weakHit) {
    if (src && src.side === 'party') u.ai.lastAttacker = src.uid;
    if (!weakHit && u.ai.adapt && types.includes(u.ai.adapt)) return;
    const prev = u.ai.adapt || null;
    u.ai.adapt = weakHit ? null : (types.find((t) => SHADOW_COPY[t] && !u.weak.includes(t)) || null);
    if (u.ai.adapt && u.ai.adapt !== prev) {
      ctx.emit({ type: 'message', text: `${u.name} borrows the shape of your ${u.ai.adapt}. (${cap1(u.ai.adapt)} is halved.)`,
        kind: 'adapt', target: u.uid, adapted: u.ai.adapt });
    }
  },
  damageTakenMult(ctx, u, part, types) {
    if (!u.ai.adapt || !types || !types.includes(u.ai.adapt) || types.some((t) => u.weak.includes(t))) return 1;
    return MIMIC_MULT;
  },
};

// --- The Other Selves (ai 'reflections'): the Mirrored Combo --------------------------------------------------
// At the end of a reflection's turn, if its next slot on the timeline is immediately followed by another living
// reflection's (no party member between) and a party member acts first, it announces the reversed party combo of
// that pair. On its next turn the combo fires (both spend their turn) unless since the announcement either member
// was pushed back on the timeline or the partner lost or spent its turn (Break, Stun, KO): then "they fall out of
// step" and it takes an ordinary turn. Answers: Pin Shot, Lunge, Break or Stun either one, Defend, or kill one.
export const MIRROR_COMBOS = [
  ['refl_hero', 'refl_mira', 'mirror_cinder_edge'],
  ['refl_hero', 'refl_bram', 'mirror_cross_shatter'],
  ['refl_mira', 'refl_bram', 'mirror_glass_bulwark'],
];
const COMBO_REST = 1;   // each member's own turns before it can start another Mirrored Combo
// W11 (PLAYTEST_REVIEW_3 fixes 1 and 8): 0.20 (was 0.15). The reflections' own ATK and MAG are 10% lower, so a careful
// party at Lv 10 wins about 88% (was 81%); a landed combo costs more, now that the telegraph names the answer ("Break
// their rhythm!"), Mira's tip says push one back, and the HUD badges each stack: ignoring it costs 13 points at Lv 11.
export const MIRROR_EMPOWER = 0.20;   // ATK and MAG the reflections gain per Mirrored Combo that lands
function mirrorComboFor(a, b) {
  const row = MIRROR_COMBOS.find(([x, y]) => (x === a && y === b) || (x === b && y === a));
  return row ? row[2] : null;
}
const isReflection = (e) => e && e.side === 'enemy' && ENEMIES[e.id] && ENEMIES[e.id].ai === 'reflections';
const reflections = {
  decide: (ctx, u, d) => basic.decide(ctx, u, d),
  afterTurn(ctx, u) {
    if ((u.ai.comboRest || 0) > 0) u.ai.comboRest--;
    if (u.broken) return;
    const refls = ctx.living('enemy').filter(isReflection);
    if (refls.some((r) => r.charging && SKILLS[r.charging.skill].mirrorCombo)) return;
    // Two consecutive slots held by reflections, one of them this reflection's next turn, each the first turn that
    // reflection has on the timeline, with a party turn before them: the first of the pair carries the combo.
    const order = ctx.timeline(10).map((r) => r.uid);
    const i = order.indexOf(u.uid);
    if (i < 0) return;
    const firstAt = (uid) => order.indexOf(uid);
    let pair = null;
    for (const [j, k] of [[i, i + 1], [i - 1, i]]) {
      if (j < 1 || k >= order.length) continue;
      const x = ctx.U(order[j]), y = ctx.U(order[k]);
      if (!isReflection(x) || !isReflection(y) || x.uid === y.uid) continue;
      if (firstAt(x.uid) !== j || firstAt(y.uid) !== k) continue;
      if (x.charging || y.charging || (x.ai.comboRest || 0) > 0 || (y.ai.comboRest || 0) > 0) continue;
      if (!order.slice(0, j).some((id) => { const p = ctx.U(id); return p.side === 'party' && !ctx.has(p, 'kept'); })) continue;
      if (!mirrorComboFor(x.id, y.id)) continue;
      pair = [x, y];
      break;
    }
    if (!pair) return;
    const [a, b] = pair;
    const skillId = mirrorComboFor(a.id, b.id);
    const sk = SKILLS[skillId];
    const target = sk.target === 'enemy' ? pickTarget(ctx, a, 'lowestHpPct') : null;
    a.ai.comboPartner = b.uid;
    // what must still hold when it fires: neither member pushed back, the partner's turn not yet spent
    const data = { partner: b.uid, partnerActed: b.acted || 0, partnerDelayed: b.delayed || 0, selfDelayed: a.delayed || 0 };
    ctx.planCharge(a, skillId, target, { data, vars: { partner: b.name }, event: { partner: b.uid, mirrorCombo: true } });
  },
  onChargeEnd(ctx, u) {
    const p = u.ai.comboPartner ? ctx.U(u.ai.comboPartner) : null;
    u.ai.comboRest = COMBO_REST;
    if (p) p.ai.comboRest = COMBO_REST;
  },
  special(ctx, u, sk, e) {
    if (!e.mirrorCombo) return null;
    const c = e.charge || {};
    const b = c.partner ? ctx.U(c.partner) : null;
    u.ai.comboRest = COMBO_REST;
    if (b) b.ai.comboRest = COMBO_REST;
    const ready = b && b.alive && !b.broken && !ctx.has(b, 'stun') && (b.acted || 0) === c.partnerActed
      && (b.delayed || 0) === c.partnerDelayed && (u.delayed || 0) === c.selfDelayed;
    if (!ready) {
      ctx.emit({ type: 'telegraph_cancel', actor: u.uid, skill: sk.id, reason: 'split' });
      ctx.emit({ type: 'message', text: `${u.name} and ${b ? b.name : 'its partner'} fall out of step!`, kind: 'interrupt' });
      const plan = basic.decide(ctx, u, ENEMIES[u.id]);
      if (!plan || !plan.skill) return 100;
      ctx.useSkill(u, SKILLS[plan.skill], plan.target);
      return SKILLS[plan.skill].rank;
    }
    const mc = sk.mirrorCombo;
    let target = null;
    if (sk.target === 'enemy') {
      target = c.target ? ctx.U(c.target) : null;
      if (!target || !target.alive || ctx.has(target, 'kept')) target = ctx.U(pickTarget(ctx, u));
      if (target) target = ctx.redirect(target, sk);
    }
    ctx.emit({ type: 'action_start', actor: u.uid, action: { type: 'enemy', skill: sk.id, name: sk.name, members: [u.uid, b.uid] },
      targets: target ? [target.uid] : ctx.living('enemy').filter(isReflection).map((r) => r.uid), fx: sk.fx || null,
      sfx: sk.sfx || null, charged: true, weapon: null });
    for (const part of mc.parts) {
      if (!target || !target.alive) break;
      const by = [u, b].find((x) => x.id === part.by) || u;
      if (part.formula === 'phys') ctx.emit({ type: 'move_to', actor: by.uid, target: target.uid });
      ctx.strike(by, target, { id: sk.id, ...part }, null);
    }
    if (mc.buff) for (const r of ctx.living('enemy').filter(isReflection)) for (const [st, turns] of mc.buff) ctx.addStatus(r, st, turns, u);
    // every combo that lands teaches them your rhythm: the reflections grow stronger for the rest of the fight (the
    // Devour Name rule: ignoring the telegraph snowballs)
    u.ai.combosLanded = (u.ai.combosLanded || 0) + 1;
    const n = ctx.living('enemy').filter(isReflection).reduce((m, r) => Math.max(m, r.ai.combosLanded || 0), 0);
    ctx.emit({ type: 'message', text: 'The reflections learn your rhythm. They grow stronger!', kind: 'mirror_combo' });
    for (const r of ctx.living('enemy').filter(isReflection)) {
      r.ai.combosLanded = n;
      ctx.addMod(r, 'atk', 1 + MIRROR_EMPOWER, 99, `mirror${n}`);
      ctx.addMod(r, 'mag', 1 + MIRROR_EMPOWER, 99, `mirror${n}`);
    }
    if (b.alive) ctx.endTurnOf(b, sk.rank);   // the partner's turn went into the combo
    return sk.rank;
  },
};

// --- The Nameless King (ai 'nameless_king') --------------------------------------------------------------------
// 1 The Veiled King (100 to 66%): Keeping from his 2nd turn, then every 4. 2 The Shattered Court (from 66%): Sorrow
// and Pride and the Mirror Ward (25% damage, shields locked, HP stops at 34%); Mirror Rain every 3, Keeping every 5.
// Both adds down: the ward shatters, he is Broken for a turn (every Kept member is freed) and 3 Aurel Unmasked
// begins (Haste; Keeping and Last Decree alternate with ordinary turns between).
// W11 (PLAYTEST_REVIEW_3 fix 6): +20% per Kept (was +25%), Devour Name's figure. The plan's +10% was tried: careful
// play was unchanged, but ignoring telegraphs at the plan's Lv 13 then cost only 4 points of win rate (the King could
// not be lost that way); at +20% it costs 16 there and 34 at Lv 12, where ignoring telegraphs still wins 62% (was 49%).
// The battle HUD shows each stack as a badge over the King's weakness row, so the cost of a missed Defend is on screen.
export const KEEP_EMPOWER = 0.20;    // ATK and MAG gained per member kept
export const KEEP_MIRA_BIAS = 0.2;   // chance the King names Mira before the even pick (was 0.4: Mira about 60% of the time)
export const WARD_MULT = 0.25;       // damage taken under the Mirror Ward
export const KEEP_TURNS = 2;
const KING_ADDS = ['false_sorrow', 'false_pride'];
const KEEP_EVERY = [4, 5, 3];
const kingAdds = (ctx) => ctx.living('enemy').filter((e) => KING_ADDS.includes(e.id));
function enterKingPhase(ctx, u, idx) {
  const p = ENEMIES[u.id].phases[idx];
  u.ai.phase = idx;
  // a Keeping already announced survives the court's arrival (the mirror stays turned); anything else is dropped
  if (!(idx === 1 && u.charging && u.charging.skill === 'keeping')) ctx.cancelCharge(u, 'phase');
  ctx.emit({ type: 'phase', actor: u.uid, phase: idx + 1, id: p.id, name: p.name, text: p.text, sprite: p.sprite || null });
  ctx.setWeak(u, p.weak, p.resist, idx < 2 ? `${u.id}:veiled` : `${u.id}:${p.id}`);
  if (idx > 0) ctx.setShields(u, p.shields);
  if (p.summon) p.summon.forEach((id, i) => ctx.summon(id, { by: u, summoned: true, firstTurn: 0.4 + 0.3 * i }));
  if (p.ward) {
    u.ai.ward = true;
    ctx.emit({ type: 'message', text: 'A Mirror Ward rises around the King. While his court stands, little reaches him.', kind: 'ward', target: u.uid });
  }
  if (p.haste) ctx.addStatus(u, 'haste', 99, u);
  const t = u.ai.turns;
  if (idx === 1) { u.ai.rainAt = t + 2; u.ai.keepAt = Math.max(u.ai.keepAt ?? 0, t + 4); u.ai.nextChargeAt = t + 1; }
  if (idx === 2) { u.ai.lastCharge = 'keeping'; u.ai.nextChargeAt = t + 1; }   // the unmasked King opens with Last Decree
}
function shatterWard(ctx, u) {
  u.ai.ward = false;
  ctx.emit({ type: 'message', text: 'The Mirror Ward shatters!', kind: 'ward_break', target: u.uid });
  enterKingPhase(ctx, u, 2);
  ctx.breakUnit(u);
}
function keepTarget(ctx) {
  const pool = partyFoes(ctx);
  if (!pool.length) return null;
  // a light lean toward Mira (the King knows the girl who ran), not a lock on the one member who carries Recall
  const mira = pool.find((f) => f.id === 'mira');
  if (mira && ctx.R() < KEEP_MIRA_BIAS) return mira.uid;
  return pool[Math.floor(ctx.R() * pool.length)].uid;
}
const namelessKing = {
  start(ctx, u) {
    u.ai.phase = 0;
    u.ai.keepAt = 1;     // announced at the end of his first turn: the first Keeping lands on his 2nd turn
    u.ai.rainAt = 99;
    const p = ENEMIES[u.id].phases[0];
    ctx.emit({ type: 'phase', actor: u.uid, phase: 1, id: p.id, name: p.name, text: p.text, sprite: null });
    ctx.setWeak(u, p.weak, p.resist, `${u.id}:veiled`);
  },
  decide(ctx, u, d) {
    const p = d.phases[u.ai.phase ?? 0];
    return planFromMove(ctx, u, weightedMove(ctx, u, (p && p.moves) || d.moves));
  },
  afterTurn(ctx, u) {
    if (u.charging || u.broken) return;
    const t = u.ai.turns;
    const ph = u.ai.phase ?? 0;
    if (t < (u.ai.nextChargeAt ?? 0)) return;
    if (ph === 2) {
      const next = u.ai.lastCharge === 'keeping' ? 'last_decree' : 'keeping';
      ctx.planCharge(u, next, next === 'keeping' ? keepTarget(ctx) : null);
      return;
    }
    if (ph === 1 && t >= (u.ai.rainAt ?? 99)) { ctx.planCharge(u, 'mirror_rain'); return; }
    if (t >= (u.ai.keepAt ?? 99)) { const tg = keepTarget(ctx); if (tg) ctx.planCharge(u, 'keeping', tg); }
  },
  onChargeEnd(ctx, u, reason, skillId) {
    const t = u.ai.turns;
    const ph = u.ai.phase ?? 0;
    u.ai.lastCharge = skillId;
    if (skillId === 'keeping') u.ai.keepAt = t + KEEP_EVERY[ph];
    if (skillId === 'mirror_rain') u.ai.rainAt = t + 3;
    // at least one ordinary turn between telegraphed moves (the unmasked King: exactly one)
    u.ai.nextChargeAt = t + (ph === 2 ? 1 : 2);
  },
  clampDamage(ctx, u, amt) {
    const d = ENEMIES[u.id];
    const ph = u.ai.phase ?? 0;
    let floorHp = null;
    if (ph === 0) floorHp = Math.floor(u.maxHp * d.phases[1].at);
    else if (ph === 1 && u.ai.ward) floorHp = Math.floor(u.maxHp * d.phases[1].floor);
    if (floorHp === null) return amt;
    return u.hp - amt < floorHp ? Math.max(0, u.hp - floorHp) : amt;
  },
  onDamaged(ctx, u) {
    if ((u.ai.phase ?? 0) === 0 && u.hp <= Math.floor(u.maxHp * ENEMIES[u.id].phases[1].at)) enterKingPhase(ctx, u, 1);
  },
  damageTakenMult(ctx, u) { return u.ai.ward ? WARD_MULT : 1; },
  shieldLocked(ctx, u) { return !!u.ai.ward; },
  onBreak(ctx, u) {
    const held = ctx.living('party').filter((p) => ctx.has(p, 'kept'));
    if (!held.length) return;
    ctx.emit({ type: 'message', text: 'The mirror cracks!', kind: 'kept_break', target: u.uid });
    for (const p of held) ctx.removeStatus(p, 'kept', 'freed');
  },
  onDeath(ctx, dead) {
    if (!KING_ADDS.includes(dead.id)) return;
    const king = ctx.living('enemy').find((e) => e.id === 'nameless_king');
    if (king && king.ai.ward && !kingAdds(ctx).length) shatterWard(ctx, king);
  },
  special(ctx, u, sk, e, targets) {
    if (!e.keep) return null;
    for (const t of targets) {
      if (!t || !t.alive || ctx.has(t, 'kept')) continue;
      if (t.defending) {
        ctx.emit({ type: 'message', text: `${t.name} looks away from the mirror!`, kind: 'kept_hold', target: t.uid });
        continue;
      }
      if (!ctx.addStatus(t, 'kept', KEEP_TURNS, u)) continue;
      ctx.emit({ type: 'message', text: `${t.name} is kept in the mirror!`, kind: 'kept', target: t.uid });
      u.ai.keptCount = (u.ai.keptCount || 0) + 1;
      ctx.addMod(u, 'atk', 1 + KEEP_EMPOWER, 99, `keep${u.ai.keptCount}`);
      ctx.addMod(u, 'mag', 1 + KEEP_EMPOWER, 99, `keep${u.ai.keptCount}`);
    }
    return null;
  },
};

const SCRIPTS = { basic, echo_warden: echoWarden, archivore, lost_page: lostPage, phased, mimic, reflections,
  nameless_king: namelessKing };
function scriptOf(u) {
  const d = ENEMIES[u.id];
  return (d && SCRIPTS[d.ai]) || basic;
}

// =============================================================================== hooks for rules.js
export function onStart(ctx) {
  for (const u of ctx.living('enemy')) { const s = scriptOf(u); if (s.start) s.start(ctx, u); }
}
export function decide(ctx, u) { return scriptOf(u).decide(ctx, u, ENEMIES[u.id]); }
export function afterTurn(ctx, u) { const s = scriptOf(u); if (s.afterTurn) s.afterTurn(ctx, u, ENEMIES[u.id]); }
export function onChargeFired(ctx, u, sk) {
  u.ai.lastCharge = sk.id;
  const s = scriptOf(u);
  if (s.onChargeEnd) s.onChargeEnd(ctx, u, null, sk.id);
  else if (s.onChargeFired) s.onChargeFired(ctx, u, s === archivore ? sk : ENEMIES[u.id]);
}
export function onChargeCancelled(ctx, u, reason, skillId) {
  if (u.side !== 'enemy') return;
  const s = scriptOf(u);
  if (s.onChargeEnd) s.onChargeEnd(ctx, u, reason, skillId);
  else if (s === archivore) archivore.onChargeCancelled(ctx, u, reason, skillId);
  else if (s.onChargeCancelled) s.onChargeCancelled(ctx, u, ENEMIES[u.id]);
}
export function onBreak(ctx, u) { const s = scriptOf(u); if (s.onBreak) s.onBreak(ctx, u); }
export function onRecover(ctx, u) { const s = scriptOf(u); if (s.onRecover) s.onRecover(ctx, u); }
/** A unit died: every script that watches deaths hears it (the Archivore's pages, the Nameless King's court). */
export function onDeath(ctx, u) {
  for (const s of [archivore, namelessKing]) s.onDeath(ctx, u);
}
/** An enemy was hit (after the damage): the Borrowed Shadow learns the type. */
export function onHit(ctx, u, src, types, weakHit) {
  if (u.side !== 'enemy') return;
  const s = scriptOf(u);
  if (s.onHit) s.onHit(ctx, u, src, types, weakHit);
}
/** A party member was healed by a party skill or item: every Borrowed Shadow saw it. */
export function onPartyHeal(ctx) {
  for (const e of ctx.living('enemy')) if (scriptOf(e) === mimic) e.ai.sawHeal = true;
}
/** Shields that cannot be chipped right now (the Nameless King under the Mirror Ward). */
export function shieldLocked(ctx, u) {
  if (!u || u.side !== 'enemy') return false;
  const s = scriptOf(u);
  return !!(s.shieldLocked && s.shieldLocked(ctx, u));
}
/** The reflect a foe has up right now, for the weakness row: 'magic' | 'phys' | null. */
export function reflectState(ctx, u) {
  if (!u || u.side !== 'enemy' || u.broken) return null;
  const d = ENEMIES[u.id];
  if (d && d.reflectWhileProtected && ctx.has(u, 'protect')) return d.reflectWhileProtected;
  if (d && d.stances && u.ai && u.ai.stance && d.stances[u.ai.stance]) return d.stances[u.ai.stance].reflect || null;
  return null;
}
/** The Borrowed Shadow's borrowed type (half damage from it), or null. */
export function adaptedType(ctx, u) {
  return u && u.side === 'enemy' && scriptOf(u) === mimic ? u.ai.adapt || null : null;
}
export function onDamaged(ctx, u) { const s = scriptOf(u); if (u.side === 'enemy' && s.onDamaged) s.onDamaged(ctx, u); }
export function clampDamage(ctx, u, amt) {
  if (u.side !== 'enemy') return amt;
  const s = scriptOf(u);
  return s.clampDamage ? s.clampDamage(ctx, u, amt) : amt;
}
export function damageTakenMult(ctx, u, part, types) {
  let m = 1;
  if (u.side === 'enemy') { const s = scriptOf(u); if (s.damageTakenMult) m *= s.damageTakenMult(ctx, u, part, types); }
  if (part && part.id === 'devour_name' && u.defending) m *= DEVOUR_GUARDED;
  return m;
}
export function reflect(ctx, tgt, part) {
  if (tgt.side !== 'enemy') return null;
  // trait `reflectWhileProtected` (the Glassback): while it has Protect and is not Broken, spells rebound
  const d = ENEMIES[tgt.id];
  if (d && d.reflectWhileProtected === 'magic' && !tgt.broken && ctx.has(tgt, 'protect') && part.formula === 'mag') return 'magic';
  const s = scriptOf(tgt);
  return s.reflect ? s.reflect(ctx, tgt, part) : null;
}
/** Script specials (Devour Name, Feast, Keeping, the Mirrored Combo). May return a timeline rank. */
export function special(ctx, u, sk, e, targets) {
  const s = scriptOf(u);
  return s.special ? s.special(ctx, u, sk, e, targets) : null;
}

// =============================================================================== party policies
// A policy gets the public battle object and returns an action for the current party unit.

function cmdEntry(cmds, group, key, id) {
  const c = cmds.find((x) => x.id === group);
  if (!c || !c.list) return null;
  return c.list.find((x) => x[key] === id) || null;
}

/** Reflection known to the player (the Warden's stance, the Glassback's Protect: both are on screen). */
function reflectsAgainst(foe, formula) {
  if (!foe || foe.broken) return false;
  const d = ENEMIES[foe.id];
  if (d && d.reflectWhileProtected === 'magic' && formula === 'mag' && foe.statuses && foe.statuses.protect
    && foe.statuses.protect.turns > 0) return true;
  if (foe.id !== 'echo_warden' || !foe.ai || !foe.ai.stance) return false;
  const s = ENEMIES.echo_warden.stances[foe.ai.stance];
  return (s.reflect === 'magic' && formula === 'mag') || (s.reflect === 'phys' && formula === 'phys');
}

function chargingThreats(b, me) {
  const out = [];
  const order = b.timeline(14).map((r) => r.uid);
  for (const f of b.living('enemy')) {
    if (!f.charging) continue;
    const sk = SKILLS[f.charging.skill];
    const idx = order.indexOf(f.uid);
    const victims = sk.target === 'enemies' ? b.living('party').map((p) => p.uid) : f.charging.target ? [f.charging.target] : [];
    out.push({ foe: f, skill: sk, idx, victims });
  }
  return out;
}

/** Rough expected damage of an enemy skill against a party unit (for defend decisions). */
function threatDamage(foe, sk, target) {
  if (!sk.power) return 0;
  const phys = sk.formula === 'phys';
  const A = phys ? foe.stats.atk : foe.stats.mag;
  const D = phys ? target.stats.def : target.stats.spr;
  return A * sk.power / 100 * 24 / (24 + D) * (sk.hits || 1);
}

function nextTurnIndex(b, me, action) {
  const p = b.previewTimeline(me, action);
  const after = p.order.findIndex((r, i) => i > 0 && r.uid === me.uid);
  const idx = p.order.findIndex((r) => r.uid === me.uid);
  return idx >= 0 ? idx : after;
}

/** Party turns that come before `uid` on the visible timeline (how many swings the party gets at a charging foe). */
function partyTurnsBefore(b, uid) {
  let n = 0;
  for (const r of b.timeline(14)) {
    if (r.uid === uid) return n;
    const u = b.unit(r.uid);
    if (u && u.side === 'party' && u.alive && !r.skip) n++;
  }
  return n;
}

/** The healer (Mira) can act usefully within the next three slots: alive, not silenced, has MP for a Mend. */
function healerReady(b, order) {
  const m = b.unit('mira');
  if (!m || !m.alive || (m.statuses && (m.statuses.silence || m.statuses.kept)) || m.mp < 4) return false;
  const idx = order.indexOf('mira');
  return idx >= 0 && idx <= 3;
}

/** A plain attack from `me` would end the fight this turn. */
function finishingBlow(b, me, foes) {
  if (foes.length !== 1) return false;
  const est = b.estimate(me, { type: 'attack', target: foes[0].uid })[0];
  return !!(est && est.kills && (est.hit ?? 1) >= 0.85);
}

/**
 * Auto-battle brain (PLAYTEST 7): heals at 55% when three or more foes are up (40% otherwise, 50% in boss
 * fights), revives before attacking, prefers a Break (or a shield chip toward one) while a telegraph is pending,
 * and Defends when a member is under 35% with no potion in hand and the healer not ready.
 */
export function competentPolicy(b, me, opts = {}) {
  const cmds = b.commands(me);
  const foes = b.living('enemy');
  const isKept = (u) => !!(u.statuses && u.statuses.kept && u.statuses.kept.turns > 0);
  const keptAllies = b.living('party').filter(isKept);
  const allies = b.living('party').filter((u) => !isKept(u));   // a Kept member cannot be healed or guarded
  const st = b.state;
  const isBossFight = foes.some((f) => f.boss) || st.options.boss;
  const can = (group, key, id) => { const e = cmdEntry(cmds, group, key, id); return !!(e && e.enabled); };
  const canSkill = (id) => {
    const sk = SKILLS[id];
    if (!sk) return false;
    const group = sk.kind === 'magic' ? 'magic' : sk.kind === 'fury' ? 'fury' : sk.kind === 'combo' ? 'combo' : 'tech';
    return can(group, 'skill', id);
  };
  const inv = st.inventory;
  const hasItem = (id) => (inv[id] || 0) > 0 && can('item', 'item', id);
  const pct = (u) => u.hp / u.maxHp;

  // ---------------------------------------------------------------- 1. telegraphed threats
  const threats = opts.ignoreTelegraphs ? [] : chargingThreats(b, me);
  const order = b.timeline(14).map((r) => r.uid);
  for (const t of threats) {
    // can we break or interrupt it right now?
    const breakAct = bestBreakAction(b, me, t.foe, canSkill);
    if (breakAct) return breakAct;
    if (!t.foe.boss && canSkill('lunge') && me.weapon === 'spear') return { type: 'skill', skill: 'lunge', target: t.foe.uid };
    // a Mirrored Combo falls apart when either reflection is pushed back: Lunge knocks even a boss back
    if (t.skill.mirrorCombo && me.weapon === 'spear' && canSkill('lunge')) return { type: 'skill', skill: 'lunge', target: t.foe.uid };
    if (t.skill.mirrorCombo && me.weapon === 'bow' && canSkill('pin_shot')) return { type: 'skill', skill: 'pin_shot', target: t.foe.uid };
    // No break in one hit: chip its shields with a known weakness when the party has enough turns to finish the
    // Break before the charge fires (a Break cancels the telegraph).
    const chip = bestChipAction(b, me, t.foe, canSkill);
    if (chip && !t.foe.broken && t.foe.shields <= partyTurnsBefore(b, t.foe.uid)) return chip;
  }
  for (const t of threats) {
    const mineIdx = nextTurnIndex(b, me, { type: 'defend' });
    const foeIdx = (() => { const p = b.previewTimeline(me, { type: 'defend' }); return p.order.findIndex((r) => r.uid === t.foe.uid); })();
    const hitsBeforeMyTurn = foeIdx >= 0 && (mineIdx < 0 || foeIdx < mineIdx);
    if (t.victims.includes(me.uid) && hitsBeforeMyTurn) {
      const dmg = threatDamage(t.foe, t.skill, me);
      // Defend halves it; when even half would finish me, a potion that keeps me standing is the better answer
      if (dmg / 2 >= me.hp && t.skill.id !== 'keeping' && t.skill.id !== 'devour_name') {
        const missing = me.maxHp - me.hp;
        if (hasItem('hi_potion') && me.hp + Math.min(180, missing) > dmg) return { type: 'item', item: 'hi_potion', target: me.uid };
        if (hasItem('potion') && me.hp + Math.min(60, missing) > dmg) return { type: 'item', item: 'potion', target: me.uid };
      }
      if (t.skill.id === 'devour_name' || t.skill.id === 'keeping' || dmg > me.hp * 0.3 || t.skill.target === 'enemy') return { type: 'defend' };
    }
    // Bram guards a single-target victim who cannot defend in time
    if (me.id === 'bram' && t.skill.target === 'enemy' && t.victims[0] && t.victims[0] !== me.uid && canSkill('guard')) {
      const v = b.unit(t.victims[0]);
      const vIdx = order.indexOf(v.uid);
      const fIdx = order.indexOf(t.foe.uid);
      if (v && v.alive && (vIdx < 0 || vIdx > fIdx || v.id === 'mira' || t.skill.id === 'devour_name' || t.skill.id === 'keeping')) {
        // Guard lasts until Bram's next turn: make sure that comes after the foe acts
        const p = b.previewTimeline(me, { type: 'skill', skill: 'guard', target: v.uid });
        const bIdx = p.order.findIndex((r) => r.uid === me.uid);
        const fI = p.order.findIndex((r) => r.uid === t.foe.uid);
        if (fI >= 0 && (bIdx < 0 || fI < bIdx)) return { type: 'skill', skill: 'guard', target: v.uid };
      }
    }
  }

  // ---------------------------------------------------------------- 2. revive, heal, cure
  // Revive before attacking: a fallen member is the biggest loss of tempo there is. The only exception is a
  // fight this very swing would end.
  const down = st.order.map((id) => st.units[id]).filter((u) => u.side === 'party' && !u.alive);
  if (down.length && foes.length && hasItem('phoenix_feather') && !finishingBlow(b, me, foes)) {
    return { type: 'item', item: 'phoenix_feather', target: down[0].uid };
  }
  // Free a Kept member (Episode 2): Mira's Recall, or a Silver Salve when she cannot (Kept, silenced, out of MP or far).
  if (keptAllies.length && foes.length && !finishingBlow(b, me, foes)) {
    const k = keptAllies.slice().sort((a, c) => c.statuses.kept.turns - a.statuses.kept.turns)[0];
    if (me.id === 'mira' && canSkill('recall')) return { type: 'skill', skill: 'recall', target: k.uid };
    const m = b.unit('mira');
    const miraFree = m && m.alive && !isKept(m) && !(m.statuses && m.statuses.silence) && m.mp >= 5 && order.indexOf('mira') >= 0
      && order.indexOf('mira') <= 2;
    if (!miraFree && hasItem('silver_salve')) return { type: 'item', item: 'silver_salve', target: k.uid };
  }
  // Groups of three or more Archive-grade foes (level 4+) wear the party down between Mira's turns: heal at 55%
  // there. Valley packs are not that dangerous and an early Mend only drags the fight past the 5-round target.
  const bigGroup = foes.length >= 3 && foes.some((f) => ((ENEMIES[f.id] || {}).level || 0) >= 4);
  const healAt = isBossFight ? 0.5 : bigGroup ? 0.55 : 0.4;
  const hurt = allies.filter((a) => pct(a) < healAt).sort((a, c) => pct(a) - pct(c));
  const aoeIncoming = threats.some((t) => t.skill.target === 'enemies');
  if (hurt.length || (aoeIncoming && allies.some((a) => pct(a) < 0.6))) {
    const low = hurt[0] || allies.slice().sort((a, c) => pct(a) - pct(c))[0];
    if (me.id === 'mira') {
      const many = allies.filter((a) => pct(a) < 0.55).length;
      if (many >= 2 && canSkill('mending_rain')) return { type: 'skill', skill: 'mending_rain' };
      if (me.fury >= 100 && me.weapon === 'staff' && canSkill('fury_wellspring') && many >= 2) return { type: 'skill', skill: 'fury_wellspring' };
      if (canSkill('mend')) return { type: 'skill', skill: 'mend', target: low.uid };
    }
    if (me.id === 'hero' && low.uid === me.uid && canSkill('second_wind') && pct(me) < 0.4) return { type: 'skill', skill: 'second_wind' };
    const mira = b.unit('mira');
    const miraCanHeal = mira && mira.alive && !(mira.statuses && mira.statuses.silence) && mira.mp >= 4;
    const miraIdx = order.indexOf('mira');
    // Potions are for real trouble (under 40%): the earlier 55% line in big groups is Mira's cue, not everyone's.
    if (pct(low) < 0.4 && (pct(low) < 0.3 || !miraCanHeal || miraIdx > 3)) {
      if (low.maxHp - low.hp > 120 && hasItem('hi_potion')) return { type: 'item', item: 'hi_potion', target: low.uid };
      if (hasItem('potion')) return { type: 'item', item: 'potion', target: low.uid };
      if (hasItem('hi_potion')) return { type: 'item', item: 'hi_potion', target: low.uid };
    }
  }
  // Under 35% with no potion and no healer coming: Defend (halves the next hit) instead of trading blows.
  // Bram with Guard covers a teammate in that spot instead.
  if (!finishingBlow(b, me, foes)) {
    const healer = healerReady(b, order);
    const lowOther = allies.find((a) => a.uid !== me.uid && pct(a) < 0.35);
    if (pct(me) < 0.35 && me.id !== 'mira' && !healer && !hasItem('potion') && !hasItem('hi_potion')) return { type: 'defend' };
    if (lowOther && me.id === 'bram' && !healer && !hasItem('potion') && !hasItem('hi_potion') && canSkill('guard') && foes.length > 1) {
      return { type: 'skill', skill: 'guard', target: lowOther.uid };
    }
  }
  // Mira silenced in a long fight: an Echo Herb gets the healer back
  const mira = b.unit('mira');
  if (mira && mira.alive && !isKept(mira) && mira.statuses.silence && mira.statuses.silence.turns > 1 && (isBossFight || foes.length > 1)
    && me.uid !== 'mira' && hasItem('echo_herb')) return { type: 'item', item: 'echo_herb', target: 'mira' };
  if (me.id === 'mira' && me.mp < 6 && hasItem('ether') && isBossFight) return { type: 'item', item: 'ether', target: me.uid };

  // ---------------------------------------------------------------- 3. Fury and combos
  const art = FURY_ARTS[me.weapon];
  if (art && canSkill(art)) {
    const sk = SKILLS[art];
    if (sk.formula === 'heal') {
      if (allies.filter((a) => pct(a) < 0.65).length >= 2 || allies.some((a) => a.statuses.silence)) return { type: 'skill', skill: art };
    } else {
      const tgt = bestTarget(b, me, { type: 'skill', skill: art });
      if (tgt && !reflectsAgainst(tgt.foe, sk.formula)) {
        const worth = tgt.foe.broken || tgt.foe.boss || tgt.foe.elite || sk.target !== 'enemy' || tgt.est.kills || foes.length === 1;
        if (worth) return { type: 'skill', skill: art, target: tgt.foe.uid };
      }
    }
  }
  const comboCmd = cmds.find((c) => c.id === 'combo');
  const comboBudgetOk = (sk) => isBossFight || sk.members.every((m) => {
    const u = b.unit(m);
    return u && u.maxMp && ((u.startMp ?? u.maxMp) - u.mp + (sk.cost[m] || 0)) / u.maxMp <= 0.4;
  });
  if (comboCmd && comboCmd.enabled) {
    for (const c of comboCmd.list.filter((x) => x.enabled)) {
      const sk = SKILLS[c.skill];
      if (!comboBudgetOk(sk)) continue;
      if (c.skill === 'thorn_bulwark') {
        if (isBossFight && (allies.some((a) => pct(a) < 0.7) || aoeIncoming) && !allies.every((a) => a.statuses.protect)) {
          return { type: 'combo', skill: c.skill };
        }
        continue;
      }
      if (sk.target === 'enemies') {
        if (foes.some((f) => sk.parts.some((p) => reflectsAgainst(f, p.formula)))) continue;
        if (foes.length >= 2 || isBossFight) return { type: 'combo', skill: c.skill };
        continue;
      }
      const tgt = bestTarget(b, me, { type: 'combo', skill: c.skill });
      if (tgt && !sk.parts.some((p) => reflectsAgainst(tgt.foe, p.formula))) {
        const enemyHp = foes.reduce((s, f) => s + f.hp, 0);
        if (enemyHp > tgt.est.avg * 0.8 || tgt.foe.boss) return { type: 'combo', skill: c.skill, target: tgt.foe.uid };
      }
    }
  }

  // ---------------------------------------------------------------- 4. scouting and setup
  if (me.id === 'mira' && canSkill('appraise')) {
    const unknown = foes.find((f) => {
      const k = b.knowledge(f.uid);
      return k && k.unknown > 0 && !k.appraised && (f.boss || f.elite || f.maxHp >= 150);
    });
    if (unknown) return { type: 'skill', skill: 'appraise', target: unknown.uid };
  }
  const broken = foes.filter((f) => f.broken);
  if (me.id === 'bram' && canSkill('rally') && isBossFight && broken.length && allies.filter((a) => a.uid !== me.uid && !a.statuses.focus).length >= 2) {
    return { type: 'skill', skill: 'rally' };
  }
  if (me.id === 'hero' && canSkill('steady') && !me.statuses.focus) {
    const soon = foes.find((f) => (f.boss || f.maxHp >= 150) && !f.broken && f.shields <= 1);
    if (soon) return { type: 'skill', skill: 'steady' };
  }

  // ---------------------------------------------------------------- 5. best damage, maybe after a swap
  const options = damageOptions(b, me, cmds, canSkill);
  let best = null;
  for (const o of options) if (!best || o.score > best.score) best = o;
  const other = me.weapons.find((w) => w !== me.weapon);
  const swapCmd = cmds.find((c) => c.id === 'swap');
  if (other && swapCmd && swapCmd.enabled) {
    const swapGain = swapValue(b, me, other);
    if (swapGain && (!best || swapGain > best.score * 1.25)) return { type: 'swap' };
  }
  if (best && best.score > 0) return best.action;
  // Stance trouble (Echo Warden in Bulwark): melee hands prepare instead of hitting a wall
  if (me.id === 'hero' && canSkill('steady') && !me.statuses.focus) return { type: 'skill', skill: 'steady' };
  if (me.id === 'bram' && canSkill('rally') && allies.some((a) => a.uid !== me.uid && !a.statuses.focus)) return { type: 'skill', skill: 'rally' };
  return { type: 'defend' };
}

/** All damaging options with a score. */
function damageOptions(b, me, cmds, canSkill) {
  const out = [];
  const foes = b.living('enemy');
  const candidates = [{ type: 'attack' }];
  for (const g of ['tech', 'magic']) {
    const c = cmds.find((x) => x.id === g);
    if (!c || !c.list) continue;
    for (const e of c.list) {
      const sk = SKILLS[e.skill];
      if (!e.enabled || !(sk.formula === 'phys' || sk.formula === 'mag')) continue;
      candidates.push({ type: 'skill', skill: e.skill });
    }
  }
  const mpFrac = me.maxMp ? me.mp / me.maxMp : 0;
  const boss = foes.some((f) => f.boss);
  // A real player rations MP across a dungeon floor: in ordinary fights spend about a third of
  // the bar, then mostly attack. Bosses get everything.
  const spent = me.maxMp ? ((me.startMp ?? me.maxMp) - me.mp) / me.maxMp : 1;
  const overBudget = !boss && spent >= 0.34;
  for (const a of candidates) {
    const sk = a.type === 'attack' ? SKILLS.attack : SKILLS[a.skill];
    const rank = (sk.kind === 'attack' ? 100 : sk.rank) / 100;
    const cost = sk.mp || 0;
    if (cost && overBudget) continue;
    // Mira keeps MP for healing; everyone saves a little in long fights
    const mpWeight = me.id === 'mira' ? (mpFrac < 0.35 ? 6 : 2.2) : (mpFrac < 0.25 ? 3 : 1.2);
    // W10: MP the action gives back (Mira's Channel) is worth what the same MP costs. The field has no MP
    // regeneration, so an Auto party that never Channels walks into the next fight dry (PLAYTEST_REVIEW_2 3, the
    // route simulator tools/sim/route.mjs). Boss fights spend everything anyway (and keep their tuning).
    const gain = !boss && me.maxMp ? Math.min(mpGainOf(sk), me.maxMp - me.mp) * mpWeight : 0;
    if (sk.target === 'enemy') {
      for (const f of foes) {
        if (!sk.trueStrike && reflectsAgainst(f, sk.formula)) continue;
        const est = b.estimate(me, { ...a, target: f.uid })[0];
        if (!est || est.redirect) continue;   // a Taunt or Cover sends it to another foe: that foe's own option counts
        out.push({ action: { ...a, target: f.uid }, score: scoreHit(b, me, f, est, sk) / rank - cost * mpWeight + gain });
      }
    } else {
      const ests = b.estimate(me, a);
      let s = 0;
      for (const est of ests) {
        const f = b.unit(est.target);
        if (reflectsAgainst(f, sk.formula)) { s -= est.avg * 0.5; continue; }
        s += scoreHit(b, me, f, est, sk) * (sk.target === 'random' ? (sk.hits / Math.max(1, ests.length)) : 1);
      }
      out.push({ action: a, score: s / rank - cost * mpWeight });
    }
  }
  return out;
}

/** MP a skill returns to its user (Channel). */
function mpGainOf(sk) {
  let n = 0;
  for (const e of sk.effects || []) if (e.mpGain) n += e.mpGain;
  return n;
}

/** Value of a hit: damage that matters + shields + breaking a dangerous foe. */
function scoreHit(b, me, f, est, sk) {
  const hitP = est.hit ?? 1;
  let dmg = Math.min(est.avg, f.hp) * hitP;
  if (est.kills) dmg += 18 + f.maxHp * 0.1;
  let s = dmg;
  const hits = sk.target === 'random' ? 1 : (sk.hits || 1);
  if (est.weak === true && !f.broken) {
    s += Math.min(hits, f.shields) * (8 + f.maxHp * 0.04);
    if (est.breaks) s += 20 + f.maxHp * 0.12 + (f.charging ? 60 : 0);
  } else if (est.weak === '?' && !f.broken) {
    s += 4; // curiosity: unknown types are worth testing
  }
  // Shatter's extra glass chips (Episode 2)
  if (est.weak !== true && est.chip && !f.broken) {
    s += Math.min(est.chip, f.shields) * (8 + f.maxHp * 0.04);
    if (est.breaks) s += 20 + f.maxHp * 0.12 + (f.charging ? 60 : 0);
  }
  if (f.charging) s *= 1.25;
  if (f.broken) s *= 1.1;
  if (f.id === 'lost_page') s *= 1.6;
  if (f.id === 'false_sorrow') s *= 1.5;   // she heals the King: the court's first target
  if (f.charging && f.charging.skill === 'feast') s *= 1.5;
  if (f.elite) s *= 1.1;
  return s;
}

function bestTarget(b, me, action) {
  let best = null;
  for (const f of b.living('enemy')) {
    const est = b.estimate(me, { ...action, target: f.uid }).find((e) => e.target === f.uid);
    if (!est || est.redirect) continue;
    const sc = scoreHit(b, me, f, est, SKILLS[action.skill] || SKILLS.attack);
    if (!best || sc > best.score) best = { foe: f, est, score: sc };
  }
  return best;
}

function bestBreakAction(b, me, foe, canSkill) {
  if (foe.broken) return null;
  const cmds = b.commands(me);
  const tries = [{ type: 'attack' }];
  for (const g of ['tech', 'magic', 'fury', 'combo']) {
    const c = cmds.find((x) => x.id === g);
    if (c && c.list) for (const e of c.list) if (e.enabled) tries.push({ type: g === 'combo' ? 'combo' : 'skill', skill: e.skill });
  }
  for (const a of tries) {
    const sk = a.type === 'attack' ? SKILLS.attack : SKILLS[a.skill];
    if (!(sk.formula === 'phys' || sk.formula === 'mag' || sk.kind === 'combo')) continue;
    if (sk.target === 'random') continue;
    if (reflectsAgainst(foe, sk.formula) || (sk.parts && sk.parts.some((p) => reflectsAgainst(foe, p.formula)))) continue;
    const est = b.estimate(me, { ...a, target: foe.uid }).find((e) => e.target === foe.uid);
    if (est && !est.redirect && est.breaks && est.weak !== '?') return { ...a, target: foe.uid };
  }
  return null;
}

/** The best known-weakness hit on `foe` (removes a shield), when no single action breaks it. */
function bestChipAction(b, me, foe, canSkill) {
  if (foe.broken || foe.shields <= 0) return null;
  const cmds = b.commands(me);
  const tries = [{ type: 'attack' }];
  for (const g of ['tech', 'magic']) {
    const c = cmds.find((x) => x.id === g);
    if (c && c.list) for (const e of c.list) if (e.enabled && !(SKILLS[e.skill].mp > me.mp * 0.5)) tries.push({ type: 'skill', skill: e.skill });
  }
  let best = null;
  for (const a of tries) {
    const sk = a.type === 'attack' ? SKILLS.attack : SKILLS[a.skill];
    if (!(sk.formula === 'phys' || sk.formula === 'mag') || sk.target === 'random') continue;
    if (reflectsAgainst(foe, sk.formula)) continue;
    const est = b.estimate(me, { ...a, target: foe.uid }).find((e) => e.target === foe.uid);
    if (!est || est.redirect || est.weak !== true) continue;
    const score = Math.min(est.hits || sk.hits || 1, foe.shields) * 10 + est.avg * 0.1 - (sk.mp || 0) * 0.5;
    if (!best || score > best.score) best = { action: { ...a, target: foe.uid }, score };
  }
  void canSkill;
  return best ? best.action : null;
}

function swapValue(b, me, other) {
  // Swap only when the current weapon exploits no known weakness at all and the other one does
  // (otherwise mixed groups make a character flip-flop between weapons).
  let nowAny = false;
  let gain = 0;
  for (const f of b.living('enemy')) {
    const k = b.knowledge(f.uid);
    if (!k || f.broken) continue;
    if (k.weak.includes(me.weapon) && !reflectsAgainst(f, 'phys')) nowAny = true;
    if (k.weak.includes(other) && !reflectsAgainst(f, 'phys')) gain = Math.max(gain, 25 + f.shields * 8 + Math.min(f.hp, 80) * 0.2);
  }
  if (nowAny) return 0;
  // Mira's magic does not care which weapon she holds; she swaps only if the bow is the better weapon
  if (me.id === 'mira' && me.weapon === 'staff') return 0;
  return gain;
}

export function naivePolicy(b, me) {
  const foes = b.living('enemy');
  return { type: 'attack', target: foes[0] ? foes[0].uid : undefined };
}

/** Competent play that never reacts to telegraphs (for measuring how much they matter). */
export function recklessPolicy(b, me) { return competentPolicy(b, me, { ignoreTelegraphs: true }); }

export const PARTY_POLICIES = { competent: competentPolicy, naive: naivePolicy, reckless: recklessPolicy };

/** Auto-battle / simulator entry: an action for the current party unit. */
export function partyAction(b, policy = 'competent') {
  const me = b.current();
  if (!me || me.side !== 'party') return null;
  const fn = typeof policy === 'function' ? policy : PARTY_POLICIES[policy] || competentPolicy;
  return fn(b, me);
}
