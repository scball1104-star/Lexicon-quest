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
  const foes = ctx.living('party');
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
  const target = sk.target === 'enemy' ? pickTarget(ctx, u, m.target) : null;
  return { skill: m.skill, target };
}

// =============================================================================== scripts
const basic = {
  decide(ctx, u, d) { return planFromMove(ctx, u, weightedMove(ctx, u, d.moves)); },
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
      const foes = ctx.living('party');
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

const SCRIPTS = { basic, echo_warden: echoWarden, archivore, lost_page: lostPage };
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
  if (s.onChargeFired) s.onChargeFired(ctx, u, s === archivore ? sk : ENEMIES[u.id]);
}
export function onChargeCancelled(ctx, u, reason, skillId) {
  if (u.side !== 'enemy') return;
  const s = scriptOf(u);
  if (s === archivore) archivore.onChargeCancelled(ctx, u, reason, skillId);
  else if (s.onChargeCancelled) s.onChargeCancelled(ctx, u, ENEMIES[u.id]);
}
export function onBreak(ctx, u) { const s = scriptOf(u); if (s.onBreak) s.onBreak(ctx, u); }
export function onRecover(ctx, u) { const s = scriptOf(u); if (s.onRecover) s.onRecover(ctx, u); }
export function onDeath(ctx, u) {
  for (const s of [archivore]) s.onDeath(ctx, u);
}
export function onDamaged(ctx, u) { const s = scriptOf(u); if (u.side === 'enemy' && s.onDamaged) s.onDamaged(ctx, u); }
export function clampDamage(ctx, u, amt) {
  if (u.side !== 'enemy') return amt;
  const s = scriptOf(u);
  return s.clampDamage ? s.clampDamage(ctx, u, amt) : amt;
}
export function damageTakenMult(ctx, u, part) {
  let m = 1;
  if (u.side === 'enemy') { const s = scriptOf(u); if (s.damageTakenMult) m *= s.damageTakenMult(ctx, u, part); }
  if (part && part.id === 'devour_name' && u.defending) m *= DEVOUR_GUARDED;
  return m;
}
export function reflect(ctx, tgt, part) {
  if (tgt.side !== 'enemy') return null;
  const s = scriptOf(tgt);
  return s.reflect ? s.reflect(ctx, tgt, part) : null;
}
export function special(ctx, u, sk, e, targets) {
  const s = scriptOf(u);
  if (s.special) s.special(ctx, u, sk, e, targets);
}

// =============================================================================== party policies
// A policy gets the public battle object and returns an action for the current party unit.

function cmdEntry(cmds, group, key, id) {
  const c = cmds.find((x) => x.id === group);
  if (!c || !c.list) return null;
  return c.list.find((x) => x[key] === id) || null;
}

/** Stance reflection known to the player (the stance is shown on screen). */
function reflectsAgainst(foe, formula) {
  if (foe.id !== 'echo_warden' || foe.broken || !foe.ai || !foe.ai.stance) return false;
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

export function competentPolicy(b, me, opts = {}) {
  const cmds = b.commands(me);
  const foes = b.living('enemy');
  const allies = b.living('party');
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
  }
  for (const t of threats) {
    const mineIdx = nextTurnIndex(b, me, { type: 'defend' });
    const foeIdx = (() => { const p = b.previewTimeline(me, { type: 'defend' }); return p.order.findIndex((r) => r.uid === t.foe.uid); })();
    const hitsBeforeMyTurn = foeIdx >= 0 && (mineIdx < 0 || foeIdx < mineIdx);
    if (t.victims.includes(me.uid) && hitsBeforeMyTurn) {
      const dmg = threatDamage(t.foe, t.skill, me);
      if (t.skill.id === 'devour_name' || dmg > me.hp * 0.3 || t.skill.target === 'enemy') return { type: 'defend' };
    }
    // Bram guards a single-target victim who cannot defend in time
    if (me.id === 'bram' && t.skill.target === 'enemy' && t.victims[0] && t.victims[0] !== me.uid && canSkill('guard')) {
      const v = b.unit(t.victims[0]);
      const vIdx = order.indexOf(v.uid);
      const fIdx = order.indexOf(t.foe.uid);
      if (v && v.alive && (vIdx < 0 || vIdx > fIdx || v.id === 'mira' || t.skill.id === 'devour_name')) {
        // Guard lasts until Bram's next turn: make sure that comes after the foe acts
        const p = b.previewTimeline(me, { type: 'skill', skill: 'guard', target: v.uid });
        const bIdx = p.order.findIndex((r) => r.uid === me.uid);
        const fI = p.order.findIndex((r) => r.uid === t.foe.uid);
        if (fI >= 0 && (bIdx < 0 || fI < bIdx)) return { type: 'skill', skill: 'guard', target: v.uid };
      }
    }
  }

  // ---------------------------------------------------------------- 2. revive, heal, cure
  const down = st.order.map((id) => st.units[id]).filter((u) => u.side === 'party' && !u.alive);
  if (down.length && foes.length && hasItem('phoenix_feather')) {
    const enemyHp = foes.reduce((s, f) => s + f.hp, 0);
    if (isBossFight || enemyHp > 60) return { type: 'item', item: 'phoenix_feather', target: down[0].uid };
  }
  const hurt = allies.filter((a) => pct(a) < (isBossFight ? 0.5 : 0.4)).sort((a, c) => pct(a) - pct(c));
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
    if (pct(low) < 0.3 || !miraCanHeal || miraIdx > 3) {
      if (low.maxHp - low.hp > 120 && hasItem('hi_potion')) return { type: 'item', item: 'hi_potion', target: low.uid };
      if (hasItem('potion')) return { type: 'item', item: 'potion', target: low.uid };
      if (hasItem('hi_potion')) return { type: 'item', item: 'hi_potion', target: low.uid };
    }
  }
  // Mira silenced in a long fight: an Echo Herb gets the healer back
  const mira = b.unit('mira');
  if (mira && mira.alive && mira.statuses.silence && mira.statuses.silence.turns > 1 && (isBossFight || foes.length > 1)
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
    if (sk.target === 'enemy') {
      for (const f of foes) {
        if (reflectsAgainst(f, sk.formula)) continue;
        const est = b.estimate(me, { ...a, target: f.uid })[0];
        if (!est) continue;
        out.push({ action: { ...a, target: f.uid }, score: scoreHit(b, me, f, est, sk) / rank - cost * mpWeight });
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
  if (f.charging) s *= 1.25;
  if (f.broken) s *= 1.1;
  if (f.id === 'lost_page') s *= 1.6;
  if (f.charging && f.charging.skill === 'feast') s *= 1.5;
  if (f.elite) s *= 1.1;
  return s;
}

function bestTarget(b, me, action) {
  let best = null;
  for (const f of b.living('enemy')) {
    const est = b.estimate(me, { ...action, target: f.uid }).find((e) => e.target === f.uid);
    if (!est) continue;
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
    if (est && est.breaks && est.weak !== '?') return { ...a, target: foe.uid };
  }
  return null;
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
