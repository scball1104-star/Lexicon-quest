// Episode 4 on the battle stage (E4-scene-ui; docs/EPISODE4_PLAN.md 6.3 to 6.5 and 9.3). Pack code: hooks.js register()
// calls register() here once the data modules are in. Every core battle file stays as it was in meaning; this module adds
// to the tables and classes they export, and wraps a handful of animator handlers that pass every other event straight on.
//
//   BACKDROPS        ep4_flood_road, ep4_keep, ep4_archive_deep, ep4_witness, ep4_throne (assets/backdrops/ep4_battle_*);
//                    the Court of Witnesses (ep4_keep_f3) gets its own stage, ep4_witness
//   BOSS_CARD        THE INKBOUND BARRISTER / Counsel for the Forgery, THE PAPER REGENT / Keeper of the Seal; the arc line
//                    (EPISODE4 3.6) is the help window's first line while the card shows
//   RARE_NAME_EXT    [18, RARE_NAME_A_EP4] (battle/loot.js rareName)
//   GATE.live        on for the `?ep=4` developer entry once the Episode 4 maps are listed (ep4_morning reads it)
//   hud PIPS.fire    three red wax seals where Heat's flames draw (a Decree: heatQuench 'fire'), lit from the left
//   Planner          heat 'stamp'/'coil'/'stoke' on a Decree: the seal stamp; quench with sfx decree_void: "VOIDED" and a
//                    torn-paper puff; a telegraph whose skill has telegraphSfx: the scroll unrolls (decree_unroll), and an
//                    `answerable` one (Strike from the Roll) marks its target (status 'named': a seal over the head and on
//                    the timeline slot); `answer` { actor, target, voided, seals, broke, guarded }: the signature stroke
//                    across the target and the hero's guard (status 'answered') until the hero's next turn; the Regent's
//                    looks by phase (royal_ward, true_charter) with the paper unfolding; the writs' and the witness's
//                    entrance; messages ward (the halo closes), ward_break (it tears), witness, answer, name_struck, name_hold
//   Actor            the Royal Ward halo of floating writs behind the Regent; the marks above
// Pseudo statuses ('named', 'answered') live only on the scene's actors (the scene's `status` op); the rules never see them.

import { BACKDROPS, BOSS_CARD } from '../../scenes/battle.js';
import { Planner, FRAMES } from '../../battle/scene/animator.js';
import { Actor } from '../../battle/scene/actors.js';
import { PIPS } from '../../battle/scene/hud.js';
import { BattleFx, C } from '../../battle/fx.js';
import { RARE_NAME_EXT } from '../../battle/loot.js';
import { ZONES } from '../encounters.js';
import { ENEMIES } from '../enemies.js';
import { SKILLS } from '../skills.js';
import { RARE_NAME_A_EP4 } from './items.js';
import { GATE } from './story.js';
import { mapsListed } from './index.js';

export const EP4_BACKDROPS = {
  ep4_flood_road: { asset: 'ep4_battle_flood_road', cell: 3, bright: 1.0, tint: null },
  ep4_keep: { asset: 'ep4_battle_keep', cell: 3, bright: 0.8, tint: null },
  ep4_archive_deep: { asset: 'ep4_battle_archive_deep', cell: 3, bright: 0.55, tint: null },
  ep4_witness: { asset: 'ep4_battle_witness', cell: 3, bright: 0.7, tint: null },
  ep4_throne: { asset: 'ep4_battle_throne', cell: 3, bright: 0.8, tint: null },
};
export const EP4_BOSS_CARDS = {
  barrister: { name: 'THE INKBOUND BARRISTER', sub: 'Counsel for the Forgery' },
  paper_regent: { name: 'THE PAPER REGENT', sub: 'Keeper of the Seal' },
};
/** EPISODE4 3.6: one line under each card (the help window while the card shows). */
export const EP4_ARC_LINES = {
  barrister: 'It argued the seal for twelve years. Nobody argued back.',
  paper_regent: 'Everyone obeyed the seal. Nobody read it.',
};
/** The Regent's look by phase id (bosses atlas frames, E4-sprites); Forged Edicts is the painted base look. */
export const REGENT_LOOK = { royal_ward: 'paper_regent_ward', true_charter: 'paper_regent_charter' };
const PAPER_ADDS = new Set(['writ_silence', 'writ_oblivion', 'barrister_witness']);

// ---------------------------------------------------------------------------------------------------- the seal pip
// 5 x 8 like the flame: a round wax seal with its ribbon tails. o rim, a wax, b the stamped mark.
const SEAL = ['.ooo.', 'oaaao', 'oabao', 'oaaao', '.ooo.', '.o.o.', 'o...o', '.....'];
export function drawSealPip(r, x, y, lit, hot, pop, frame) {
  const w = hot && (frame >> 2) % 2;
  const col = lit ? { o: hot ? '#e04848' : '#8a1c2a', a: w || pop ? '#ff6a5a' : '#c42c34', b: hot || pop ? '#fff1d6' : '#ff9a86' }
    : { o: '#5a3440', a: '#2a1c26', b: '#3a2430' };
  SEAL.forEach((row, j) => { for (let i = 0; i < 5; i++) if (row[i] !== '.') r.rect(x + i, y + j, 1, 1, col[row[i]]); });
}

// ---------------------------------------------------------------------------------------------------- drawing helpers
const WAX = ['#8a1c2a', '#c42c34', '#ff6a5a', '#fff1d6'];
const PAPER = [C.paper, C.white, '#c8b896', C.cream];
/** A wax seal disc, radius 3 to 6, at (cx, cy). */
function waxSeal(r, cx, cy, rad = 4, alpha = 1) {
  r.withAlpha(alpha, () => {
    r.ellipse(cx, cy, rad + 1, rad + 1, C.ink, true);
    r.ellipse(cx, cy, rad, rad, WAX[1], true);
    r.ellipse(cx, cy, Math.max(1, rad - 2), Math.max(1, rad - 2), WAX[0], false);
    r.rect(cx - 1, cy - 1, 2, 2, WAX[3]);
    r.rect(cx - rad + 1, cy - rad + 2, 1, 2, WAX[2]);
  });
}
/** "VOIDED" stamped in red ink: a box that slams in (scale), holds, then fades. */
function voidStamp(r, cx, cy, t, frames) {
  const inK = Math.min(1, t / 4), out = t > frames - 10 ? (frames - t) / 10 : 1;
  const w = 46, h = 13, s = inK < 1 ? 1.5 - inK / 2 : 1;
  const bw = Math.round(w * s), bh = Math.round(h * s), x = Math.round(cx - bw / 2), y = Math.round(cy - bh / 2) - (t < 4 ? 0 : 1);
  r.withAlpha(Math.max(0, out), () => {
    r.rect(x - 1, y - 1, bw + 2, bh + 2, C.ink);
    r.rect(x, y, bw, bh, '#2a1018');
    r.strokeRect(x + 1, y + 1, bw - 2, bh - 2, WAX[2]);
    if (inK >= 1) r.text('VOIDED', cx, y + 2, { align: 'center', color: '#ff7a6a', outline: C.ink });
  });
}

// ---------------------------------------------------------------------------------------------------- fx (BattleFx)
export const EP4_FX = {
  /** A Seal gained: a wax seal drops onto the foe's chest and squashes, red flecks. */
  fx_seal_stamp(o) {
    const { cx, cy } = this.center(o);
    this.add(22, (r, t) => {
      const fall = t < 6 ? (6 - t) * 4 : 0, sq = t >= 6 && t < 9 ? 2 : 0, a = t > 14 ? 1 - (t - 14) / 8 : 1;
      r.withAlpha(a, () => {
        r.ellipse(cx, cy - fall, 5 + sq, 5 - Math.floor(sq / 2), C.ink, true);
        r.ellipse(cx, cy - fall, 4 + sq, 4 - Math.floor(sq / 2), WAX[1], true);
        r.rect(cx - 1, cy - fall - 1, 2, 2, WAX[3]);
      });
    }, 'top');
    this.add(10, (r, t) => { if (t > 5) r.withAlpha(1 - (t - 5) / 5, () => r.ellipse(cx, cy, 8 + t, 6 + t, WAX[2], false)); }, 'top');
    this.particles(cx, cy, 6, { colors: [WAX[1], WAX[2]], speed: 1.2, life: 12, gravity: 0.12, delay: 6, size: 1 });
  },
  /** A decree voided: torn paper scraps fly off the foe and "VOIDED" stamps over it (bigger when a decree was pending). */
  fx_decree_void(o) {
    const { cx, cy } = this.center(o);
    const n = o.big ? 22 : 14;
    this.particles(cx, cy, n, { colors: PAPER, speed: o.big ? 2.4 : 1.8, life: 30, gravity: 0.07, drift: 0.6, size: 2, radius: 6 });
    this.particles(cx, cy, 8, { colors: [WAX[1], WAX[0]], speed: 1.4, life: 18, gravity: 0.1, size: 2, shrink: true });
    this.fx_ring(o, { color: C.cream, r0: 4, r1: o.big ? 30 : 22, frames: 14 });
    this.add(40, (r, t) => voidStamp(r, cx, Math.min(cy + 10, Math.round(o.y) - 8), t, 40), 'top');   // over the body: the numbers pop above
  },
  /** A decree announced: a scroll unrolls above the foe, its red seal in the middle, lines of ink appearing. */
  fx_decree_unroll(o) {
    const cx = Math.round(o.x || 0), top = Math.max(26, Math.round((o.y || 0) - (o.h || 32) - 12));
    this.add(40, (r, t) => {
      const k = Math.min(1, t / 14), half = Math.round(4 + 22 * k), a = t > 30 ? 1 - (t - 30) / 10 : 1;
      r.withAlpha(a, () => {
        r.rect(cx - half - 2, top - 1, half * 2 + 4, 12, C.ink);
        r.rect(cx - half, top, half * 2, 10, C.paper);
        r.rect(cx - half, top, half * 2, 1, C.white);
        for (let i = 0; i < 3; i++) { const lw = Math.round((half * 2 - 8) * Math.min(1, Math.max(0, (t - 6 - i * 3) / 8))); if (lw > 0) r.rect(cx - half + 3, top + 2 + i * 3, lw, 1, '#4a3a5a'); }
        r.rect(cx - half - 3, top - 2, 3, 14, '#a07848'); r.rect(cx + half, top - 2, 3, 14, '#a07848');
        if (k >= 1) waxSeal(r, cx, top + 10, 3);
      });
    }, 'top');
    this.fx_ring(o, { color: WAX[2], r0: 32, r1: 6, frames: 20 });
  },
  /** Strike from the Roll on the hero: a red seal drops toward the named one, a red ring closes. */
  fx_named(o) {
    const { cx, cy } = this.center(o);
    this.fx_ring(o, { color: WAX[2], r0: 26, r1: 4, frames: 18 });
    this.add(18, (r, t) => { const k = Math.min(1, t / 8); waxSeal(r, cx, Math.round(cy - 30 + 24 * k), 4, t > 12 ? 1 - (t - 12) / 6 : 1); }, 'top');
  },
  /** Answer: the hero's signature written across the target in gold, then a bright flash along it. */
  fx_answer_stroke(o) {
    const { cx, cy } = this.center(o);
    const span = Math.max(30, Math.round((o.w || 32) * 0.9)), x0 = cx - Math.round(span / 2), n = 28, amp = Math.max(6, Math.round((o.h || 32) * 0.14));
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const u = i / n;
      // a signature: a rising loop, a dip, a long tail with a flick
      const x = x0 + span * u + Math.round(Math.sin(u * 9.4) * 3);
      const y = cy + Math.round(Math.sin(u * 6.3 + 0.6) * amp * (1 - u * 0.5) - u * amp * 0.6);
      pts.push([Math.round(x), y]);
    }
    this.add(44, (r, t) => {
      const k = Math.min(1, t / 14), m = Math.round(n * k), a = t > 34 ? 1 - (t - 34) / 10 : 1;
      r.withAlpha(a, () => {
        // each step joins the last with a 3 px nib (ink rim, gold ink, a cream core)
        for (let i = 1; i <= m; i++) { const [x0p, y0p] = pts[i - 1], [x, y] = pts[i]; r.line(x0p, y0p - 1, x, y - 1, C.ink); r.line(x0p, y0p + 2, x, y + 2, C.ink); }
        for (let i = 1; i <= m; i++) { const [x0p, y0p] = pts[i - 1], [x, y] = pts[i]; r.line(x0p, y0p, x, y, C.gold); r.line(x0p, y0p + 1, x, y + 1, i === m && k < 1 ? C.white : C.cream); }
        if (k >= 1 && t < 20) for (let i = 0; i <= n; i += 2) r.rect(pts[i][0], pts[i][1], 1, 1, C.white);
      });
    }, 'top');
    if (o.big) this.fx_rays(o, { color: C.gold, n: 10, len: 30, frames: 18 });
    this.sparkles(cx, cy, 6, [C.gold, C.cream, C.white], 26, span / 2);
  },
  /** A writ or a witness takes the stand: a scroll on its stand unrolls in a puff of paper. */
  fx_writ_rise(o) {
    this.fx_ring({ ...o, h: 0 }, { color: C.paper, r0: 2, r1: 22, frames: 18, squash: 0.35 });
    this.particles(o.x, o.y - 6, 14, { colors: PAPER, dir: -Math.PI / 2, spread: 1.2, speed: 1.5, life: 24, radius: 8, radiusY: 2, size: 2, drift: 0.4 });
    this.bloom(o.x, Math.round(o.y - (o.h || 32) / 2), C.cream);
  },
  /** The Royal Ward closes: paper scraps sweep in and a pale ring settles round the Regent. */
  fx_ward_close(o) {
    const { cx, cy } = this.center(o), hw = Math.round((o.w || 80) / 2) + 10;
    this.add(28, (r, t) => {
      const k = t / 28;
      for (let i = 0; i < 10; i++) {
        const a = i * TAU10 + k * 2, rad = Math.round(hw * (1.6 - 0.6 * k));
        r.withAlpha(0.4 + 0.6 * k, () => r.rect(Math.round(cx + Math.cos(a) * rad), Math.round(cy + Math.sin(a) * rad * 0.7), 3, 2, i % 2 ? C.paper : C.white));
      }
    }, 'top');
    this.fx_ring(o, { color: C.cream, r0: hw + 20, r1: hw, frames: 24, squash: 0.7 });
  },
  /** The Royal Ward tears: the halo rips outward in scraps, a white ring, cream rays. */
  fx_ward_tear(o) {
    const { cx, cy } = this.center(o);
    this.particles(cx, cy, 30, { colors: PAPER, speed: 2.8, life: 34, gravity: 0.06, drift: 0.7, size: 2, radius: Math.round((o.w || 80) / 3) });
    this.fx_ring(o, { color: C.white, r0: 10, r1: 60, frames: 18 });
    this.fx_rays(o, { color: C.cream, n: 12, len: 44, frames: 18 });
  },
  /** The Regent changes look: pages peel off and fly, a cream bloom and rays (the swap comes mid-flash). */
  fx_paper_unfold(o) {
    const { cx, cy } = this.center(o);
    this.particles(cx, cy, 36, { colors: PAPER, speed: 2.2, life: 40, gravity: 0.05, drift: 0.8, size: 2, radius: Math.round((o.w || 80) / 3), radiusY: Math.round((o.h || 80) / 3) });
    this.fx_rays(o, { color: C.cream, n: 10, len: 50, frames: 22 });
    this.bloom(cx, cy, C.cream, true);
  },
};
const TAU10 = Math.PI / 5;

// ---------------------------------------------------------------------------------------------------- actor marks
/** A unit on the Decree counter (heat quench 'fire'). */
export const isDecree = (id) => !!(ENEMIES[id] && ENEMIES[id].heat && ENEMIES[id].heat.quench === 'fire');

/** The Royal Ward: six writs float in a slow ellipse round the Regent, a pale dithered glow behind. */
export function drawWardHalo(r, a, frame) {
  const cx = a.cx, cy = a.cy, hw = Math.round(a.w / 2) + 8, hh = Math.round(a.h / 2) + 4, p = (frame >> 4) % 2;
  r.withAlpha(0.18 + p * 0.06, () => r.ditherEllipse(cx, cy, hw + 6, hh + 4, C.cream, 0.5));
  r.withAlpha(0.45, () => r.ellipse(cx, cy, hw + 2, hh, C.paper, false));
  for (let i = 0; i < 6; i++) {
    const ang = i * Math.PI / 3 + frame / 90, x = Math.round(cx + Math.cos(ang) * (hw + 2)), y = Math.round(cy + Math.sin(ang) * hh);
    r.rect(x - 3, y - 4, 7, 9, C.ink); r.rect(x - 2, y - 3, 5, 7, C.paper); r.rect(x - 2, y - 3, 5, 1, C.white);
    r.rect(x - 1, y - 1, 3, 1, '#6a5a6a'); r.rect(x, y + 2, 1, 1, WAX[1]);
  }
}
/** The hero's guard after Answer: a gold ring of script at the feet, motes rising. */
export function drawAnswered(r, a, frame) {
  const rw = Math.round(a.w / 2) + 6, y = Math.round(a.y), k = (frame >> 3) % 8;
  r.withAlpha(0.9, () => r.ellipse(a.cx, y, rw, 4, C.gold, false));
  for (let i = 0; i < 8; i++) if ((i + k) % 3) { const ang = i * Math.PI / 4 + frame / 40; r.rect(Math.round(a.cx + Math.cos(ang) * rw), Math.round(y + Math.sin(ang) * 4), 2, 1, C.cream); }
  for (let i = 0; i < 3; i++) { const t = (frame + i * 20) % 60; r.withAlpha(1 - t / 60, () => r.rect(a.cx - rw + 4 + ((i * 13) % (rw * 2 - 8)), y - 4 - Math.round(t / 2), 1, 2, C.gold)); }
}
/** The name a Strike from the Roll is aimed at: a red seal over the head, pulsing. */
export function drawNamed(r, a, frame) {
  const bob = (frame >> 3) % 2;
  waxSeal(r, a.cx - 11, a.top - 2 - bob, 4);
  if ((frame >> 2) % 3 !== 2) r.rect(a.cx - 12, a.top + 5 - bob, 3, 1, WAX[2]);
}

// ---------------------------------------------------------------------------------------------------- the planner
const sealed = (P, uid) => { const u = P.units[uid]; return !!(u && isDecree(u.id)); };
const partyUids = (P) => Object.values(P.units).filter((u) => u.side === 'party').map((u) => u.uid);
function unname(P) { for (const uid of partyUids(P)) P.push({ op: 'status', uid, status: 'named', on: false }); }
const VOID_WHY = { quench: 'its decree is voided!', answer: 'its decree will not stand.', break: 'is broken: the decree falls apart!' };

function wrapPlanner(P) {
  const base = { battle_start: P.ev_battle_start, heat: P.ev_heat, quench: P.ev_quench, telegraph: P.ev_telegraph,
    telegraph_cancel: P.ev_telegraph_cancel, phase: P.ev_phase, summon: P.ev_summon, message: P.ev_message, turn_start: P.ev_turn_start,
    segment: P.segment };
  P.ev_battle_start = function (e) {
    base.battle_start.call(this, e);
    const boss = (e.units || []).find((u) => u.side === 'enemy' && EP4_ARC_LINES[u.id]);
    if (!boss) return;
    for (let i = this.ops.length - 1; i >= 0; i--) if (this.ops[i].op === 'help') { this.ops[i].text = EP4_ARC_LINES[boss.id]; this.ops[i].color = 'cream'; break; }
  };
  P.ev_heat = function (e) {
    if (!sealed(this, e.target)) return base.heat.call(this, e);
    this.push({ op: 'heat', uid: e.target, heat: e.heat, max: e.max, delta: e.delta });
    if (e.delta > 0) {
      this.push({ op: 'fx', kind: 'seal_stamp', uid: e.target });
      if (e.reason === 'stamp') this.push({ op: 'sfx', id: 'seal_stamp' });   // the Barrister's sleeves (no skill sound)
      this.wait(FRAMES.statusQuiet);
    }
  };
  P.ev_quench = function (e) {
    if (e.sfx !== 'decree_void' && !sealed(this, e.target)) return base.quench.call(this, e);
    this.push({ op: 'fx', kind: 'decree_void', uid: e.target, big: !!e.cancelled });
    if (!this.answered) this.push({ op: 'sfx', id: 'decree_void' });
    this.push({ op: 'flash', uid: e.target, color: '#fff1d6', frames: 12, soft: true });
    this.wait(FRAMES.status);
  };
  P.ev_telegraph = function (e) {
    const sk = SKILLS[e.skill];
    if (!sk || !sk.telegraphSfx) return base.telegraph.call(this, e);
    const n = this.ops.length;
    base.telegraph.call(this, e);
    const mine = this.ops.slice(n);
    let first = true;
    for (const op of mine) {
      if (op.op === 'sfx' && (op.id === 'telegraph' || op.id === 'furnace_roar')) { if (first) { op.id = sk.telegraphSfx; op.volume = 1; first = false; } else op.volume = 0; }
      if (op.op === 'fx' && (op.kind === 'flare' || op.kind === 'telegraph')) op.kind = 'decree_unroll';
      if (op.op === 'screenFlash') op.color = '#fff1d6';
    }
    const wait = mine.find((op) => op.op === 'wait');
    const at = wait ? this.ops.indexOf(wait) : this.ops.length;
    if (sk.answerable && e.target && this.side(e.target) === 'party') {
      this.ops.splice(at, 0, { op: 'status', uid: e.target, status: 'named', on: true }, { op: 'fx', kind: 'named', uid: e.target });
    }
  };
  P.ev_telegraph_cancel = function (e) {
    if (SKILLS[e.skill] && SKILLS[e.skill].answerable) unname(this);
    const why = VOID_WHY[e.reason];
    if (!why || !(sealed(this, e.actor) || e.reason === 'answer')) return base.telegraph_cancel.call(this, e);
    this.push({ op: 'telegraphCancel', actor: e.actor, reason: e.reason });
    this.help(`{c:cyan}${this.name(e.actor)}: ${why}{/c}`);
    this.wait(FRAMES.telegraphCancel);
  };
  P.ev_phase = function (e) {
    const look = REGENT_LOOK[e.id];
    if (!look) return base.phase.call(this, e);
    this.push({ op: 'banner', text: e.name || `Phase ${e.phase}`, style: 'phase' });
    this.push({ op: 'fx', kind: 'paper_unfold', uid: e.actor });
    this.push({ op: 'sfx', id: 'decree_unroll' });
    this.push({ op: 'sfx', id: 'page_flutter' });
    this.push({ op: 'shake', mag: 3, frames: 18 });
    this.wait(14);
    this.push({ op: 'screenFlash', color: '#fff7e0', frames: 10, alpha: 0.6 });
    this.push({ op: 'swapSprite', uid: e.actor, sprite: look });
    this.push({ op: 'reveal', uid: e.actor, reset: true });
    this.help(e.text || `${this.name(e.actor)} changes.`, 'orange');
    this.wait(FRAMES.phase);
  };
  P.ev_summon = function (e) {
    if (!PAPER_ADDS.has(e.id)) return base.summon.call(this, e);
    this.push({ op: 'summon', uid: e.enemy, id: e.id, name: e.name, variant: e.variant, tint: e.tint, hp: e.hp, by: e.by, split: false });
    this.push({ op: 'fx', kind: 'writ_rise', uid: e.enemy });
    this.push({ op: 'sfx', id: 'decree_unroll', volume: 0.7 });
    this.help(`${e.name} takes the stand!`, 'violet');
    this.wait(FRAMES.summon);
  };
  P.ev_message = function (e) {
    const k = e.kind;
    if ((k === 'name_struck' || k === 'name_hold') && e.target) this.push({ op: 'status', uid: e.target, status: 'named', on: false });
    if (k === 'ward' || k === 'ward_break') {
      if (!e.target || this.units[e.target]?.id !== 'paper_regent') return base.message.call(this, e);
      this.push({ op: 'ward', uid: e.target, on: k === 'ward' });
      this.push({ op: 'fx', kind: k === 'ward' ? 'ward_close' : 'ward_tear', uid: e.target });
      this.push({ op: 'sfx', id: k === 'ward' ? 'page_flutter' : 'decree_void' });
      if (k === 'ward_break') { this.push({ op: 'shake', mag: 4, frames: 18 }); this.push({ op: 'screenFlash', color: '#ffffff', frames: 8, alpha: 0.5 }); }
      this.help(e.text, 'orange');
      this.wait(k === 'ward' ? FRAMES.summon : FRAMES.message + 12);
      return;
    }
    if (k === 'witness' || k === 'answer') { this.help(e.text, k === 'answer' ? 'gold' : 'violet'); this.wait(FRAMES.message); return; }
    base.message.call(this, e);
  };
  P.ev_answer = function (e) {
    this.answered = true;   // the void that follows plays no second tear
    this.push({ op: 'fx', kind: 'answer_stroke', uid: e.target, from: e.actor, big: !!e.voided });
    this.push({ op: 'sfx', id: 'decree_void' });
    this.push({ op: 'screenFlash', color: '#fff7d6', frames: 8, alpha: e.voided ? 0.55 : 0.3 });
    if (e.voided) this.push({ op: 'shake', mag: 2, frames: 10 });
    if (e.guarded && e.actor) this.push({ op: 'status', uid: e.actor, status: 'answered', on: true });
    unname(this);
    this.wait(e.voided ? 30 : 18);
  };
  P.ev_turn_start = function (e) {
    base.turn_start.call(this, e);
    if (e.actor === 'hero') this.push({ op: 'status', uid: 'hero', status: 'answered', on: false });
  };
  P.segment = function (start, rest) {
    const a = (start && start.action) || {};
    if (start && start.charged && SKILLS[a.skill] && SKILLS[a.skill].answerable) unname(this);
    this.answered = false;
    // the rules emit Answer's void before its own `answer` event: show the stroke first, then what it voided
    const i = (rest || []).findIndex((x) => x && x.type === 'answer');
    if (i > 0) rest = [rest[i], ...rest.slice(0, i), ...rest.slice(i + 1)];
    return base.segment.call(this, start, rest);
  };
}

function wrapActor(A) {
  const draw = A.draw;
  A.draw = function (r, opts) {
    const f = this.engine.frame || 0;
    if (this.ward && this.alive && this.id === 'paper_regent') drawWardHalo(r, this, f);
    draw.call(this, r, opts);
    if (this.dead || this.ko || !this.statuses) return;
    if (this.statuses.answered) drawAnswered(r, this, f);
    if (this.statuses.named) drawNamed(r, this, f);
  };
  /** hud.drawTimeline: a red seal on the named one's slot. */
  A.tlMark = function (r, x, y, frame) {
    if (!this.statuses || !this.statuses.named || this.ko) return;
    r.rect(x + 10, y - 1, 9, 9, C.ink);
    waxSeal(r, x + 14, y + 3, 3, (frame >> 3) % 2 ? 1 : 0.8);
  };
}

let done = false;
/** Install everything above. Safe to call twice. Returns the list of what went in. */
export function register() {
  if (done) return ['already'];
  for (const [k, v] of Object.entries(EP4_BACKDROPS)) if (!BACKDROPS[k]) BACKDROPS[k] = v;
  for (const [k, v] of Object.entries(EP4_BOSS_CARDS)) if (!BOSS_CARD[k]) BOSS_CARD[k] = v;
  // the Court of Witnesses has its own stage (EPISODE4_PLAN 9.3); the zone row (E4-battle) names the F1 stage until told
  const f3 = ZONES.ep4_keep_f3;
  if (f3 && f3.backdrop === 'ep4_keep') f3.backdrop = 'ep4_witness';
  if (!RARE_NAME_EXT.some(([, w]) => w === RARE_NAME_A_EP4)) RARE_NAME_EXT.push([18, RARE_NAME_A_EP4]);
  PIPS.fire = drawSealPip;
  for (const [k, fn] of Object.entries(EP4_FX)) if (!BattleFx.prototype[k]) BattleFx.prototype[k] = fn;
  wrapPlanner(Planner.prototype);
  wrapActor(Actor.prototype);
  if (typeof location !== 'undefined' && /[?&]ep=4(&|$)/.test(location.search || '') && mapsListed()) GATE.live = true;
  done = true;
  return ['backdrops', 'cards', 'rare_names', 'pips', 'fx', 'planner', 'actor'];
}
export default register;
