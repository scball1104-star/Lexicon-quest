// Episode 5 on the battle stage (E5-scene-ui; docs/EPISODE5_PLAN.md 6.3 to 6.5 and 9.3). Pack code: index.js runs register(engine)
// last in its ORDER. No core battle file changes: this module adds to the tables the core exports (BACKDROPS, BOSS_CARD,
// SIGNATURE_TECHS, BattleFx) and wraps prototype methods of Planner, Actor and BattleScene that pass everything else straight on.
// Nothing here runs in a battle without a sky (Episodes 1 to 4, the cave and Fine Print draw exactly as before): every wrapper
// checks for the Turning Sky's events or the scene's `sky5` view first.
//
//   BACKDROPS     ep5_sea, ep5_dunes, ep5_gallery, ep5_well, ep5_oracle (assets/backdrops/ep5_battle_*), each with E5-tiles' Day
//                 grade (the json's grades.day: multiply then screen over the rows above the band) built at runtime into a second
//                 canvas and cross-faded over 20 frames on a Turn; Night is the painting as is
//   BOSS_CARD     THE MIRAGE KNIGHT / Warden of False Horizons, THE SAND ORACLE / Reader of Every Road; the arc line (text.js
//                 EP5_ARC_LINES) is the help window's first line while the card shows
//   SIGNATURE     { unit: 'mira', flag: 'foretold', skill: 'turn_sky' }: while a foretelling is pinned Mira opens on Tech, Turn the
//                 Sky first, in gold
//   The sky       a disc of the sky that is up under the timeline's head, and the Turn as a marker slot IN the timeline where it
//                 falls (the sky it brings: a gold sun or a silver moon on a dark ring, 18 x 18 with a 12 x 12 disc); a pinned
//                 foretelling puts the named member's head on the marker with a red star, and a red star over that member
//   Sides         a sky badge (8 x 8 on a dark tile) at the head of each sided foe's weakness row, after its shield: the side it
//                 is on now; an Exposed foe's shield is pale and cracked (one white flash as it opens), an Ascendant foe has a 1 px
//                 gold (sun) or pale blue (star) glow round its sprite
//   Turn the Sky  a sky ring at Mira's feet; the Turn with its sound (sky_turn_day / sky_turn_night); a broken foretelling scatters
//                 stars off the Oracle with prophecy_break and says "The words change. The Oracle is broken." once (no second
//                 "is BROKEN!" line)
//   The Knight    a mirror glint on Mirror Turn (sfx mirror_turn, which gets a core fallback); its Double steps out of the mirror
//   The Oracle    the three looks by phase with sand and stars; the Futures rise out of the sand; the Mirage Veil, a ring of
//                 drifting sand behind the Oracle, closes and tears
//   Low MP        once per save, Mira under 12 MP in the Oracle's fight: "Keep something back to turn the sky." (flag hint_sky_mp)

import { BACKDROPS, BOSS_CARD, BattleScene } from '../../scenes/battle.js';
import { Planner, FRAMES } from '../../battle/scene/animator.js';
import { Actor, frameOrigin } from '../../battle/scene/actors.js';
import { drawHead } from '../../battle/scene/hud.js';
import { SIGNATURE_TECHS } from '../../battle/scene/menu.js';
import { TL, timelineSlotX } from '../../battle/scene/layout.js';
import { BattleFx, C } from '../../battle/fx.js';
import { ENEMIES } from '../enemies.js';
import { EP5_BOSS_CARDS, EP5_ARC_LINES, EP5_BATTLE_TEXT } from './text.js';
import { audioManifestOf } from './index.js';

export const EP5_BACKDROPS = {
  ep5_sea: { asset: 'ep5_battle_sea', cell: 4, bright: 1.0, tint: null },
  ep5_dunes: { asset: 'ep5_battle_dunes', cell: 4, bright: 1.0, tint: null },
  ep5_gallery: { asset: 'ep5_battle_gallery', cell: 4, bright: 0.8, tint: null },
  ep5_well: { asset: 'ep5_battle_well', cell: 4, bright: 0.6, tint: null },
  ep5_oracle: { asset: 'ep5_battle_oracle', cell: 4, bright: 0.8, tint: null },
};
/** E5-tiles' Day grade (tools/art/backdrops/ep5_build.py DAY); each backdrop json's grades.day overrides it. */
export const DAY_GRADE = { multiply: '#ffcf8a', multiplyAlpha: 0.5, screen: '#ffe2a6', screenAlpha: 0.56 };
export const FADE_FRAMES = 20;
export const MARK_UID = '_sky5_turn';
export const FORETELL = '#foretell';         // the scene's telegraph key for a foretelling: `${source}#foretell`
export const LOW_MP = 12;                    // Turn the Sky's cost
export const HINT_FLAG = 'hint_sky_mp';
/** The Oracle's looks by phase id (E5-sprites' bosses atlas frames). */
export const ORACLE_LOOK = { read_sky: 'oracle', false_futures: 'oracle_futures', true_horizon: 'oracle_true' };
const SAND_ADDS = new Set(['future_hunger', 'future_fear']);
const SKY_REFLECT = 'sky';                   // the knowledge flag that makes the row keep one slot for the sky badge

const other = (s) => (s === 'day' ? 'night' : 'day');
const home = (sky) => (sky === 'day' ? 'sun' : 'star');
/** The side a sided foe stands on now, from the sky and whether it is Exposed (Exposed means its side is not the sky's). */
export const shownSide = (sky, exposed) => (exposed ? home(other(sky)) : home(sky));

// ---------------------------------------------------------------------------------------------------- pixel art
const INK = '#14101e';
const SUN = { r: '#ffcf5a', o: '#e0862a', g: '#f9d77a', h: '#fff4c0' };
const MOON = { n: '#232c66', m: '#e6ecff', s: '#a3afdc', '*': '#ffffff' };
// 12 x 12: the sun disc with eight rays
const SUN12 = ['.....rr.....', '.r...rr...r.', '..r.oooo.r..', '...oggggo...', '..oghhgggo..', 'rrohhggggorr',
  'rroggggggorr', '..oggggggo..', '...oggggo...', '..r.oooo.r..', '.r...rr...r.', '.....rr.....'];
// 12 x 12: a night-blue disc, a silver crescent lit on the left, two small stars
const MOON12 = ['....nnnn....', '..nnnnnnnn..', '.nnnmmnnn*n.', '.nnmmsnnnnn.', 'nnmmsnnnnnnn', 'nnmmsnnnnn*n',
  'nnmmsnnnnnnn', 'nnmmmsnnnnnn', '.nnmmmssnnn.', '.nnnmmmmnnn.', '..nnnnnnnn..', '....nnnn....'];
// 8 x 8 side badges: a sun (a sun foe) and a four-point star (a star foe)
const SUN8 = ['r..rr..r', '..oooo..', '.oggggo.', 'roghggor', 'roggggor', '.oggggo.', '..oooo..', 'r..rr..r'];
const STAR8 = ['...ss...', '...bb...', '..bbbb..', 'sbbwwbbs', 'sbbwwbbs', '..bbbb..', '...bb...', '...ss...'];
const STARC = { s: '#7fb6f0', b: '#cfe6ff', w: '#ffffff' };
// 7 x 7 red star (the foretelling), outlined in ink when drawn
const RED7 = ['...r...', '...r...', 'rrrrrrr', '.rrhrr.', '..rrr..', '.rr.rr.', '.r...r.'];
const REDC = { r: '#ff3b3b', h: '#ffd6c8' };

function blit(r, rows, x, y, pal) {
  for (let j = 0; j < rows.length; j++) for (let i = 0; i < rows[j].length; i++) { const c = pal[rows[j][i]]; if (c) r.rect(x + i, y + j, 1, 1, c); }
}
/** The pixels of a map, outlined 1 px in ink (8-neighbours), then the map. */
function blitOutlined(r, rows, x, y, pal, ink = INK) {
  for (let j = 0; j < rows.length; j++) for (let i = 0; i < rows[j].length; i++) {
    if (!pal[rows[j][i]]) continue;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const jj = j + dy, ii = i + dx;
      if (!(rows[jj] && pal[rows[jj][ii]])) r.rect(x + ii, y + jj, 1, 1, ink);
    }
  }
  blit(r, rows, x, y, pal);
}
/** A round 14 x 14 dark tile with a 1 px coloured ring (the sky discs sit on it). */
function ringTile(r, x, y, ring) {
  const ROW = [4, 2, 1, 1, 0, 0, 0, 0, 0, 0, 1, 1, 2, 4];   // inset per row of a 14 px circle
  ROW.forEach((d, j) => r.rect(x + d, y + j, 14 - d * 2, 1, INK));
  if (!ring) return;
  ROW.forEach((d, j) => { r.rect(x + d, y + j, 1, 1, ring); r.rect(x + 13 - d, y + j, 1, 1, ring); });
  r.rect(x + 4, y, 6, 1, ring); r.rect(x + 4, y + 13, 6, 1, ring);
}
/** The disc of a sky (12 x 12) at its top-left (x, y). */
export function drawSkyDisc(r, sky, x, y) { if (sky === 'day') blit(r, SUN12, x, y, SUN); else blit(r, MOON12, x, y, MOON); }
/** A sky disc on its ring tile (14 x 14). */
export function drawSkyMedallion(r, sky, x, y) { ringTile(r, x, y, sky === 'day' ? '#ffcf5a' : '#c8d2f4'); drawSkyDisc(r, sky, x + 1, y + 1); }
/** The side badge of a foe (10 x 10 with its outline): the sun or the star. */
export function drawSideBadge(r, side, x, y) {
  r.rect(x, y, 10, 10, INK);
  if (side === 'sun') blit(r, SUN8, x + 1, y + 1, SUN); else blit(r, STAR8, x + 1, y + 1, STARC);
}
export function drawRedStar(r, x, y) { blitOutlined(r, RED7, x, y, REDC); }

// ---------------------------------------------------------------------------------------------------- fx (BattleFx)
const SAND = ['#f9d77a', '#e0b060', '#c8904a', '#fff1c8'];
const STARS = ['#ffffff', '#cfe6ff', '#9fd4ff', '#f9d77a'];
const skyOf = (fx) => { const s = fx.engine && fx.engine.scene; return (s && s.sky5 && s.sky5.sky) || 'day'; };
export const EP5_FX = {
  /** Turn the Sky: a ring of sun and star pips closes round Mira's feet, and rises. */
  fx_sky_cast(o) {
    const cx = Math.round(o.x || 0), cy = Math.round(o.y || 0), next = other(skyOf(this));
    const col = next === 'day' ? [C.gold, '#ffcf5a', C.cream] : ['#cfe6ff', '#9fd4ff', C.white];
    this.add(30, (r, t) => {
      const k = t / 30, rad = Math.round(26 - 16 * k);
      for (let i = 0; i < 10; i++) {
        const a = i * Math.PI / 5 + k * 3;
        const x = Math.round(cx + Math.cos(a) * rad), y = Math.round(cy - 4 + Math.sin(a) * rad * 0.35 - k * 8);
        r.withAlpha(1 - k * 0.6, () => { r.rect(x - 1, y - 1, 3, 3, INK); r.rect(x, y, 1, 1, col[i % 3]); if (i % 2) r.rect(x - 1, y, 3, 1, col[i % 3]); });
      }
    }, 'over');
    this.fx_ring({ x: cx, y: cy, h: 0 }, { color: col[0], r0: 30, r1: 6, frames: 22, squash: 0.35 });
    this.sparkles(cx, cy - 20, 6, col, 26, 12);
  },
  /** A foretelling breaks: stars scatter off the reader, a white ring, pale rays. */
  fx_sky_stars(o) {
    const { cx, cy } = this.center(o);
    const span = Math.max(20, Math.round((o.w || 60) / 3));
    this.particles(cx, cy, 34, { colors: STARS, speed: 2.6, life: 38, gravity: 0.04, drift: 0.5, size: 2, shrink: true, radius: span });
    this.particles(cx, cy, 14, { colors: [REDC.r, '#ff8a6a'], speed: 1.8, life: 24, gravity: 0.08, size: 2, shrink: true });
    this.sparkles(cx, cy, 12, STARS, 30, span + 10);
    this.fx_ring(o, { color: C.white, r0: 6, r1: span + 30, frames: 16 });
    this.fx_rays(o, { color: '#cfe6ff', n: 12, len: span + 26, frames: 18 });
  },
  /** A star is read: a red star drops onto the named member's head and a red ring closes. */
  fx_sky_read(o) {
    const { cx, cy } = this.center(o);
    const top = Math.round((o.y || 0) - (o.h || 40));
    this.fx_ring(o, { color: REDC.r, r0: 28, r1: 4, frames: 20 });
    this.add(24, (r, t) => { const k = Math.min(1, t / 12); drawRedStar(r, cx - 3, Math.round(top - 40 + 28 * k)); }, 'top');
    this.sparkles(cx, cy, 5, [REDC.r, C.white], 24, 10);
  },
  /** The reading falls: a red-white streak from the sky onto the named member, then a burst of stars. */
  fx_sky_fall(o) {
    const { cx, cy } = this.center(o);
    this.add(18, (r, t) => {
      const k = Math.min(1, t / 8), y = Math.round(-10 + (cy + 10) * k);
      if (t < 10) { r.line(cx - 6 + 2, y - 40, cx + 2, y, REDC.r); r.line(cx - 6, y - 40, cx, y, C.white); drawRedStar(r, cx - 3, y - 4); }
    }, 'top');
    this.particles(cx, cy, 20, { colors: [REDC.r, C.white, '#ffb0a0'], speed: 2.2, life: 26, gravity: 0.1, size: 2, shrink: true, delay: 8 });
  },
  /** Mirror Turn: a white glint runs down the Knight's mirror, a gold bloom and short rays. */
  fx_mirror_glint(o) {
    const { cx, cy } = this.center(o);
    const hw = Math.round((o.w || 60) / 2), hh = Math.round((o.h || 80) / 2);
    this.add(20, (r, t) => {
      const k = t / 20, y = Math.round(cy - hh + hh * 2 * k);
      r.withAlpha(1 - k * 0.5, () => { r.line(cx - hw, y + 6, cx + hw, y - 6, C.white); r.line(cx - hw, y + 7, cx + hw, y - 5, C.cream); });
    }, 'top');
    this.bloom(cx, cy, C.gold, true);
    this.fx_rays(o, { color: C.gold, n: 8, len: hw + 18, frames: 14 });
  },
  /** The Double steps out of the mirror: an indigo shimmer settles into the figure. */
  fx_mirror_step(o) {
    const { cx, cy } = this.center(o);
    const h = o.h || 60, hw = Math.max(16, Math.round((o.w || 40) / 2) + 2);
    this.add(26, (r, t) => {
      const k = t / 26;
      r.withAlpha(0.7 * (1 - k), () => {
        for (let y = Math.round(cy - h / 2); y < Math.round(o.y || cy); y += 2) {
          const off = Math.round(Math.sin((y + t * 3) * 0.3) * 6 * (1 - k));
          r.rect(cx - hw + off, y, hw * 2, 1, (t + y) % 4 < 2 ? '#6a54b0' : '#cfe6ff');
        }
      });
    }, 'top');
    this.sparkles(cx, cy, 8, ['#cfe6ff', C.white, '#9a86d8'], 24, hw);
  },
  /** A False Future rises out of the sand: a column of grains and a ring at its feet. */
  fx_sand_rise(o) {
    this.fx_ring({ ...o, h: 0 }, { color: SAND[0], r0: 2, r1: 24, frames: 18, squash: 0.35 });
    this.particles(o.x, o.y - 4, 24, { colors: SAND, dir: -Math.PI / 2, spread: 0.9, speed: 1.6, life: 30, radius: 10, radiusY: 2, size: 1, drift: 0.5, gravity: 0.02 });
    this.bloom(o.x, Math.round(o.y - (o.h || 40) / 2), SAND[1]);
  },
  /** The Mirage Veil closes: sand sweeps in to a ring round the Oracle. */
  fx_veil_close(o) {
    const { cx, cy } = this.center(o), hw = Math.round((o.w || 120) / 2) + 6;
    this.add(30, (r, t) => {
      const k = t / 30;
      for (let i = 0; i < 18; i++) {
        const a = i * Math.PI / 9 + k * 2.4, rad = Math.round(hw * (1.7 - 0.7 * k));
        r.withAlpha(0.4 + 0.6 * k, () => r.rect(Math.round(cx + Math.cos(a) * rad), Math.round(cy + Math.sin(a) * rad * 0.55), 2, 1, SAND[i % 4]));
      }
    }, 'top');
  },
  /** The Mirage Veil tears: the ring of sand bursts outward, a white ring, gold rays. */
  fx_veil_tear(o) {
    const { cx, cy } = this.center(o);
    this.particles(cx, cy, 40, { colors: SAND, speed: 3, life: 36, gravity: 0.05, drift: 0.6, size: 2, shrink: true, radius: Math.round((o.w || 120) / 3), radiusY: Math.round((o.h || 120) / 4) });
    this.fx_ring(o, { color: C.white, r0: 12, r1: 76, frames: 18 });
    this.fx_rays(o, { color: C.gold, n: 12, len: 60, frames: 18 });
  },
  /** False Futures: the mask cracks, sand pours off the shell. */
  fx_oracle_crack(o) {
    const { cx, cy } = this.center(o);
    const fy = Math.round(cy - (o.h || 140) * 0.22);
    this.add(18, (r, t) => {
      const k = Math.min(1, t / 8);
      for (let i = 0; i < 6; i++) {
        const a = i * Math.PI / 3 + 0.4, len = Math.round(18 * k * (0.6 + (i % 3) * 0.2));
        r.withAlpha(1 - t / 18, () => { r.line(cx + 1, fy + 1, Math.round(cx + Math.cos(a) * len) + 1, Math.round(fy + Math.sin(a) * len) + 1, INK); r.line(cx, fy, Math.round(cx + Math.cos(a) * len), Math.round(fy + Math.sin(a) * len), C.white); });
      }
    }, 'top');
    this.particles(cx, cy, 36, { colors: SAND, speed: 1.4, life: 40, gravity: 0.12, size: 2, shrink: true, radius: Math.round((o.w || 140) / 3), radiusY: Math.round((o.h || 140) / 4), delay: 6 });
    this.bloom(cx, fy, SAND[0], true);
  },
  /** The True Horizon: the shell opens on a face of stars, a burst of stars and pale rays. */
  fx_oracle_stars(o) {
    const { cx, cy } = this.center(o);
    this.particles(cx, cy, 44, { colors: STARS, speed: 2.4, life: 44, gravity: 0, drift: 0.7, size: 2, shrink: true, radius: Math.round((o.w || 140) / 4), radiusY: Math.round((o.h || 140) / 4) });
    this.sparkles(cx, cy, 16, STARS, 40, Math.round((o.w || 140) / 2));
    this.fx_rays(o, { color: '#cfe6ff', n: 14, len: 70, frames: 24 });
    this.bloom(cx, cy, '#9fd4ff', true);
  },
};

// ---------------------------------------------------------------------------------------------------- the planner
const partyUids = (P) => Object.values(P.units).filter((u) => u.side === 'party').map((u) => u.uid);
function unpin(P) { P.push({ op: 'sky5Unpin' }); for (const uid of partyUids(P)) P.push({ op: 'status', uid, status: 'foretold', on: false }); }
const SKY_EVENTS = new Set(['exposed', 'ascendant']);

function wrapPlanner(P) {
  const base = { battle_start: P.ev_battle_start, telegraph: P.ev_telegraph, message: P.ev_message, phase: P.ev_phase, summon: P.ev_summon,
    brk: P.ev_break, segment: P.segment, castOpen: P.castOpen, enemyOpen: P.enemyOpen };
  P.ev_battle_start = function (e) {
    base.battle_start.call(this, e);
    const boss = (e.units || []).find((u) => u.side === 'enemy' && EP5_ARC_LINES[u.id]);
    if (!boss) return;
    for (let i = this.ops.length - 1; i >= 0; i--) if (this.ops[i].op === 'help') { this.ops[i].text = EP5_ARC_LINES[boss.id]; this.ops[i].color = 'cream'; break; }
  };
  // ---- the sky's own events (sky.js); every one is new to the core planner
  P.ev_sky = function (e) { this.push({ op: 'sky5', sky: e.sky, turnIn: e.turnIn, reason: e.reason || null }); };
  P.ev_sky_turn = function (e) {
    this.skyNow = e.sky;
    this.push({ op: 'sky5Turn', sky: e.sky, natural: !!e.natural });
    this.push({ op: 'sfx', id: `sky_turn_${e.sky}` });
    this.push({ op: 'screenFlash', color: e.sky === 'day' ? '#fff1c8' : '#3a3c8a', frames: 12, alpha: 0.35 });
  };
  P.ev_exposed = function (e) { this.push({ op: 'sky5Exposed', uid: e.target, on: !!e.on }); };
  P.ev_ascendant = function () { /* Ascendant is "sided and not Exposed": the scene draws it from sky5Exposed */ };
  P.ev_foretell = function (e) { this.push({ op: 'sky5Pin', source: e.source, target: e.target, turnIn: e.turnIn }); };
  P.ev_foretell_broken = function (e) {
    unpin(this);
    this.push({ op: 'telegraphCancel', actor: `${e.source}${FORETELL}` });
    if (e.reason === 'turned') {
      this.push({ op: 'fx', kind: 'sky_stars', uid: e.source });
      this.push({ op: 'sfx', id: 'prophecy_break' });
      this.push({ op: 'screenFlash', color: '#ffffff', frames: 10, alpha: 0.5 });
      this.push({ op: 'shake', mag: 3, frames: 12 });
      this.wait(12);
    } else if (e.reason === 'break') {
      this.push({ op: 'fx', kind: 'sky_stars', uid: e.source });
      this.help('{c:cyan}The reading fails.{/c}');
      this.wait(FRAMES.statusQuiet);
    }
  };
  P.ev_foretell_fall = function () { unpin(this); };
  // ---- the foretelling's announcement: pinned to the Turn, not to the reader's next turn
  P.ev_telegraph = function (e) {
    if (!e.foretell) return base.telegraph.call(this, e);
    this.pose(e.actor, 'cast');
    this.push({ op: 'telegraph', actor: `${e.actor}${FORETELL}`, skill: e.skill, name: e.name, text: e.text, target: e.target,
      targets: e.targets || [], nextTurn: e.nextTurn, foretell: true });
    this.push({ op: 'sfx', id: e.sfx || 'prophecy_read' });
    this.push({ op: 'fx', kind: 'enemy_cast', uid: e.actor });
    if (e.target && this.side(e.target) === 'party') {
      this.push({ op: 'status', uid: e.target, status: 'foretold', on: true });
      this.push({ op: 'fx', kind: 'sky_read', uid: e.target });
    }
    this.push({ op: 'screenFlash', color: '#2a1030', frames: 10, alpha: 0.4 });
    this.push({ op: 'help', text: `{c:orange}${e.text}{/c}`, color: null, foretell: true });
    this.wait(FRAMES.telegraph + 12);
  };
  P.ev_break = function (e) {
    if (!this.quietBreak) return base.brk.call(this, e);
    this.quietBreak = false;
    const help = this.help;
    this.help = () => {};
    try { base.brk.call(this, e); } finally { this.help = help; }
  };
  P.ev_message = function (e) {
    const k = e.kind;
    const T = EP5_BATTLE_TEXT;
    if (k === 'sky') { this.help(e.text, this.skyNow === 'night' ? 'cyan' : 'gold'); this.wait(FRAMES.message); return; }
    if (k === 'mirror_turn') {
      this.push({ op: 'fx', kind: 'mirror_glint', uid: e.target });
      this.push({ op: 'sfx', id: 'mirror_turn' });
      this.push({ op: 'flash', uid: e.target, color: '#fff7d6', frames: 10, soft: true });
      this.help(this.units[e.target] && this.units[e.target].id === 'mirage_knight' ? T.knight_mirror : e.text, 'gold');
      this.wait(FRAMES.message);
      return;
    }
    if (k === 'foretell_broken') { this.quietBreak = true; this.help(T.prophecy_broken, 'gold'); this.wait(FRAMES.message + 12); return; }
    if (k === 'starless') { this.help(e.text, 'violet'); this.wait(FRAMES.message); return; }
    if (k === 'sky_hold') { this.help(e.text, 'cyan'); this.wait(FRAMES.message); return; }
    if (k === 'foretell_answer') { this.help(e.text, 'cyan'); this.wait(FRAMES.message); return; }
    if (k === 'double') { this.help(e.text, 'violet'); this.wait(FRAMES.statusQuiet); return; }
    if (k === 'devour_road') { if (e.target) this.push({ op: 'fx', kind: 'status_bad', uid: e.target }); this.help(e.text, 'violet'); this.wait(FRAMES.message); return; }
    if ((k === 'veil' || k === 'veil_break') && e.target && this.units[e.target] && this.units[e.target].id === 'oracle') {
      const on = k === 'veil';
      this.push({ op: 'sky5Veil', uid: e.target, on });
      this.push({ op: 'fx', kind: on ? 'veil_close' : 'veil_tear', uid: e.target });
      this.push({ op: 'sfx', id: on ? 'summon' : 'glass_break' });
      if (!on) { this.push({ op: 'shake', mag: 4, frames: 18 }); this.push({ op: 'screenFlash', color: '#fff1c8', frames: 8, alpha: 0.5 }); }
      this.help(on ? e.text : T.veil_tears, 'orange');
      this.wait(on ? FRAMES.summon : FRAMES.message + 12);
      return;
    }
    base.message.call(this, e);
  };
  P.ev_phase = function (e) {
    const look = ORACLE_LOOK[e.id];
    if (!look) return base.phase.call(this, e);
    this.push({ op: 'banner', text: e.name || `Phase ${e.phase}`, style: 'phase' });
    if (e.phase <= 1) { this.help(e.text, 'orange'); this.wait(FRAMES.message); return; }   // the opening look: no change to show
    const last = e.phase >= 3;
    this.push({ op: 'fx', kind: last ? 'oracle_stars' : 'oracle_crack', uid: e.actor });
    this.push({ op: 'sfx', id: last ? 'prophecy_break' : 'prophecy_read' });
    this.push({ op: 'shake', mag: 4, frames: 20 });
    this.wait(14);
    this.push({ op: 'screenFlash', color: last ? '#e6f2ff' : '#fff1c8', frames: 10, alpha: 0.65 });
    this.push({ op: 'swapSprite', uid: e.actor, sprite: e.sprite || look });
    this.push({ op: 'reveal', uid: e.actor, reset: true });
    this.help(e.text || `${this.name(e.actor)} changes.`, 'orange');
    this.wait(FRAMES.phase);
  };
  P.ev_summon = function (e) {
    const sand = SAND_ADDS.has(e.id), dbl = e.id === 'mirage_double';
    if (!sand && !dbl) return base.summon.call(this, e);
    this.push({ op: 'summon', uid: e.enemy, id: e.id, name: e.name, variant: e.variant, tint: e.tint, hp: e.hp, by: e.by, split: false });
    this.push({ op: 'fx', kind: dbl ? 'mirror_step' : 'sand_rise', uid: e.enemy });
    this.push({ op: 'sfx', id: dbl ? 'mirror_turn' : 'summon', volume: 0.8 });
    if (sand) this.help(`${e.name} rises out of the sand!`, 'violet');   // the Double's entrance has its own line ('double')
    this.wait(FRAMES.summon);
  };
  // Turn the Sky: a sky ring at Mira's feet (the Turn's own sound follows), not the default light burst and heal chime
  P.castOpen = function (actor, start, targets) {
    if (!(start.action && start.action.skill === 'turn_sky')) return base.castOpen.call(this, actor, start, targets);
    this.pose(actor, 'cast');
    this.push({ op: 'fx', kind: 'sky_cast', uid: actor });
    this.push({ op: 'sfx', id: 'buff', volume: 0.5 });
    this.wait(FRAMES.castWindup);
  };
  // The reading falls: the charge it ends is the foretelling's, never a charge the reader also holds (the Sandstorm)
  P.enemyOpen = function (actor, start, rest, targets) {
    if (!(start.action && start.action.skill === 'last_prophecy')) return base.enemyOpen.call(this, actor, start, rest, targets);
    this.pose(actor, 'cast');
    this.push({ op: 'telegraphCancel', actor: `${actor}${FORETELL}`, fired: true });
    this.push({ op: 'screenFlash', color: '#2a1030', frames: 10, alpha: 0.55 });
    this.push({ op: 'fx', kind: 'enemy_cast', uid: actor });
    this.push({ op: 'sfx', id: start.sfx || 'prophecy_read' });
    this.wait(FRAMES.enemySpell);
    for (const t of targets) this.push({ op: 'fx', kind: 'sky_fall', uid: t });
    this.push({ op: 'sfx', id: 'name_devour' });
    this.wait(FRAMES.enemyRelease + 4);
  };
  P.segment = function (start, rest) {
    // at a Turn, the sides change with the sky: Exposed and Ascendant play with the Turn, before its line
    const list = (rest || []).slice();
    const at = list.findIndex((x) => x && x.type === 'sky_turn');
    if (at >= 0) {
      let end = list.findIndex((x, i) => i > at && x && x.type === 'sky');
      if (end < 0) end = list.length;
      const moved = list.slice(at + 1, end).filter((x) => x && SKY_EVENTS.has(x.type));
      if (moved.length) {
        const keep = list.slice(at + 1, end).filter((x) => !(x && SKY_EVENTS.has(x.type)));
        list.splice(at + 1, end - at - 1, ...moved, ...keep);
      }
    }
    try { return base.segment.call(this, start, list); } finally { this.quietBreak = false; }
  };
}

// ---------------------------------------------------------------------------------------------------- actor marks
const GLOW = { sun: '#ffd34d', star: '#9fd4ff' };
/** A 1 px glow round an Ascendant foe: its frame drawn four times in the glow colour, one pixel off each way, under it. */
function drawGlow(a, r, frame, side) {
  if (!a.atlas || a.dissolve || a.flash || (a.hurtT > a.hurtMax - 4)) return;
  const f = a.enemyFrame();
  if (!f) return;
  const o = frameOrigin(a.atlas, f.name, f);
  const fr = { ...f, ox: o.ox, oy: o.oy };
  const bob = (a.pose === 'idle' || a.pose === 'kneel') && !a.move ? a.bob() : 0;
  const x = a.cx, y = Math.round(a.y) + bob, sc = a.scale || 1;
  // a breathing shine: the 1 px ring pulses, and on the bright beat a soft second ring stands 2 px out (the foes' art already
  // carries a thin side-coloured rim, so the Ascendant glow has to move to read as more than the rim)
  const beat = (frame >> 4) % 2;
  const look = { tint: GLOW[side] || GLOW.sun, tintAmount: 1, alpha: beat ? 1 : 0.6 };
  const br = a.breath();
  const dirs = beat ? [[-1, 0], [1, 0], [0, -1], [0, 1], [-2, 0], [2, 0], [0, -2], [-1, -1], [1, -1]] : [[-1, 0], [1, 0], [0, -1], [0, 1]];
  if (br > 0) {
    const split = Math.max(1, Math.round(fr.h * 0.55));
    const dx0 = x - Math.round(fr.ox * sc), dy0 = y - Math.round(fr.oy * sc);
    for (const [dx, dy] of dirs) {
      r.image(a.atlas.image, dx0 + dx, dy0 + Math.round(split * sc) + dy, { sx: fr.x, sy: fr.y + split, sw: fr.w, sh: fr.h - split, w: Math.round(fr.w * sc), h: Math.round((fr.h - split) * sc), ...look });
      r.image(a.atlas.image, dx0 + dx, dy0 + br + dy, { sx: fr.x, sy: fr.y, sw: fr.w, sh: split, w: Math.round(fr.w * sc), h: Math.round(split * sc), ...look });
    }
    return;
  }
  for (const [dx, dy] of dirs) r.sprite(a.atlas, fr, x + dx, y + dy, sc !== 1 ? { ...look, scale: sc } : look);
}
/** The Mirage Veil: a slow ring of drifting sand behind the Oracle, a faint dithered haze inside it. */
export function drawVeil(r, a, frame) {
  const cx = a.cx, cy = a.cy, hw = Math.round(a.w / 2) + 4, hh = Math.round(a.h / 2) - 6;
  r.withAlpha(0.16 + ((frame >> 4) % 2) * 0.05, () => r.ditherEllipse(cx, cy, hw + 4, hh + 2, SAND[1], 0.4));
  for (let i = 0; i < 28; i++) {
    const ang = i * Math.PI * 2 / 28 + frame / 70, wob = Math.sin(frame / 20 + i) * 2;
    const x = Math.round(cx + Math.cos(ang) * (hw + wob)), y = Math.round(cy + Math.sin(ang) * (hh + wob));
    r.rect(x, y, 2, 1, SAND[i % 4]);
    if (i % 3 === 0) r.rect(x + 1, y + 1, 1, 1, INK);
  }
}
/** The member a foretelling names: a red star over the head, bobbing. */
export function drawForetold(r, a, frame) { drawRedStar(r, a.cx - 3, a.top - 4 - ((frame >> 3) % 2)); }

function wrapActor(A) {
  const draw = A.draw;
  A.draw = function (r, opts) {
    const f = this.engine.frame || 0;
    const sv = this.engine.scene && this.engine.scene.sky5;
    if (sv && this.side === 'enemy' && !this.dead && this.alive) {
      if (this.veil5) drawVeil(r, this, f);
      if (this.skySide && !this.skyExposed) drawGlow(this, r, f, shownSide(sv.sky, false));
    }
    draw.call(this, r, opts);
    if (this.side === 'party' && this.statuses && this.statuses.foretold && this.alive) drawForetold(r, this, f);
  };
}

// ---------------------------------------------------------------------------------------------------- the scene
/** The sky view of a battle (presentation; it follows the ops, a beat behind the rules). */
function initSky(scene) {
  const S = scene.b && scene.b.state && scene.b.state.sky;
  scene.sky5 = null;
  if (!S) return;
  scene.sky5 = { sky: S.sky, turnIn: S.turnIn, pinned: null, k: S.sky === 'day' ? 1 : 0, goal: S.sky === 'day' ? 1 : 0, base: null, night: null, day: null, hinted: false };
  for (const u of scene.b.units()) {
    const a = scene.actor(u.uid);
    if (a && u.side === 'enemy') { a.skySide = !!(u.skySide || (ENEMIES[u.id] && ENEMIES[u.id].sky)); a.skyExposed = !!u.exposed; }
  }
}
/** The Day grade of a backdrop: its json's grades.day, else E5-tiles' recipe. */
function gradeOf(engine, key) {
  const rec = BACKDROPS[key];
  const assets = engine.assets;
  let meta = null;
  try { if (rec && assets.has(rec.asset)) { const a = assets.atlas(rec.asset); meta = a && a.meta; } } catch (e) { meta = null; }
  const d = meta && meta.grades && meta.grades.day;
  return d && d.multiply ? d : DAY_GRADE;
}
/** Night and Day copies of the stage layer (built once per layer: the core rebuilds it when its art arrives). */
function gradeLayers(scene) {
  const sv = scene.sky5, bl = scene.backdropLayer, r = scene.engine.renderer;
  if (!sv || !bl || sv.base === bl || typeof r.createLayer !== 'function') return;
  sv.base = bl;
  const night = r.createLayer(bl.w, bl.h), day = r.createLayer(bl.w, bl.h);
  night.ctx.drawImage(bl.canvas, 0, 0);
  day.ctx.drawImage(bl.canvas, 0, 0);
  const g = day.ctx, d = gradeOf(scene.engine, bl.key);
  const y1 = Math.max(1, Math.min(bl.h, (bl.band && Number.isFinite(bl.band.y) ? bl.band.y : 118), (d.rows && d.rows[1]) || bl.h));
  g.save();
  g.globalCompositeOperation = 'multiply'; g.globalAlpha = d.multiplyAlpha; g.fillStyle = d.multiply; g.fillRect(0, 0, bl.w, y1);
  g.globalCompositeOperation = 'screen'; g.globalAlpha = d.screenAlpha; g.fillStyle = d.screen; g.fillRect(0, 0, bl.w, y1);
  g.restore();
  sv.night = night; sv.day = day; sv.painted = -1;
  paintSky(scene);
}
function paintSky(scene) {
  const sv = scene.sky5, bl = scene.backdropLayer;
  if (!sv || !bl || !sv.night || sv.painted === sv.k) return;
  const g = bl.ctx;
  g.save();
  g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
  g.drawImage(sv.night.canvas, 0, 0);
  if (sv.k > 0) { g.globalAlpha = sv.k; g.drawImage(sv.day.canvas, 0, 0); }
  g.restore();
  sv.painted = sv.k;
  if ((sv.k === 0 || sv.k === 1) && scene.engine.renderer.setBackdrop) scene.engine.renderer.setBackdrop(bl.canvas);
}
function setSky(scene, sky, fade) {
  const sv = scene.sky5;
  sv.sky = sky;
  sv.goal = sky === 'day' ? 1 : 0;
  if (!fade || scene.fast) sv.k = sv.goal;
  paintSky(scene);
}
/** "The Oracle reads Arden's star. It falls when the sky turns." and who can answer it, while that member can. */
function answerLine(scene) {
  const m = scene.b && scene.b.unit('mira');
  return m && m.alive && Array.isArray(m.skills) && m.skills.includes('turn_sky') ? ` {c:gold}${m.name} can turn the sky.{/c}` : '';
}
/** Once per save: Mira under Turn the Sky's MP in a fight where a star can be read (the Oracle). */
function lowMpHint(scene, op) {
  const sv = scene.sky5, g = scene.engine.game;
  if (!sv || sv.hinted || op.uid !== 'mira' || !(op.mp < LOW_MP)) return;
  const mira = scene.b.unit('mira');
  if (!mira || !mira.alive || !(mira.skills || []).includes('turn_sky')) return;
  if (!scene.b.units().some((u) => u.id === 'oracle')) return;
  if (g && g.flags && g.flags[HINT_FLAG]) return;
  sv.hinted = true;
  const st = scene.b.state;
  if (st && !st.hint) st.hint = HINT_FLAG;   // rewards.js sets the flag from the battle's result (the Oath's once-per-save hint)
  else if (g && g.flags) g.flags[HINT_FLAG] = true;
  // at the end of this action (before its closing op), so the cast and the Turn play first
  const at = scene.ops.length && scene.ops[scene.ops.length - 1].op === 'end' ? scene.ops.length - 1 : scene.ops.length;
  scene.ops.splice(Math.max(scene.opIndex, at), 0, { op: 'help', text: EP5_BATTLE_TEXT.low_mp, color: 'cyan' }, { op: 'wait', frames: 48 });
}

/** The timeline with the Turn's marker slot in it, while the help window and the timeline draw (see drawHelpWindow below). */
function swapTimeline(scene) {
  const sv = scene.sky5;
  const order = scene.timeline || [];
  let at = Math.max(1, sv.turnIn | 0), beyond = false;
  if (at >= TL.slots) { at = TL.slots - 1; beyond = true; }
  at = Math.min(at, order.length);
  const tl = order.slice();
  tl.splice(at, 0, { uid: MARK_UID });
  const marker = { uid: MARK_UID, id: MARK_UID, side: 'marker', alive: true, statuses: {}, tlMark: (r, x, y, f) => drawMarker(scene, r, x, y, f, beyond) };
  const saved = { timeline: scene.timeline, actors: scene.actors, preview: null };
  const pv = scene.menu && scene.menu.preview;
  if (pv && Number.isFinite(pv.landing) && pv.landing >= at && pv.landing < TL.slots) { saved.preview = [pv, pv.landing]; pv.landing += 1; }
  scene.timeline = tl;
  scene.actors = new Map(scene.actors);
  scene.actors.set(MARK_UID, marker);
  scene._sky5Swap = saved;
}
function unswap(scene, r) {
  const s = scene._sky5Swap;
  if (!s) return;
  scene._sky5Swap = null;
  scene.timeline = s.timeline;
  scene.actors = s.actors;
  if (s.preview) s.preview[0].landing = s.preview[1];
  if (r && scene.sky5) drawHeadDisc(scene, r);
}
/** The Turn's slot: the sky it brings on a dark ring; with a foretelling pinned, the named member's head and a red star. */
function drawMarker(scene, r, sx, sy, frame, beyond) {
  const sv = scene.sky5;
  if (!sv) return;
  const next = other(sv.sky);
  const pin = sv.pinned;
  const who = pin && scene.actor(pin.target);
  r.rect(sx + 1, sy, 16, 18, who ? '#3a0c14' : INK); r.rect(sx, sy + 1, 18, 16, who ? '#3a0c14' : INK);
  if (who) {
    // the named member's head in a red ring (2 px), the red star on its corner: the reading falls here
    r.strokeRect(sx, sy, 18, 18, REDC.r); r.strokeRect(sx + 1, sy + 1, 16, 16, '#b81e2a');
    drawHead(r, who, sx + 3, sy + 3);
    const on = (frame >> 3) % 3 !== 2;
    drawRedStar(r, sx + 11, sy - 3 + (on ? 0 : 1));
  } else {
    ringTile(r, sx + 2, sy + 2, next === 'day' ? '#ffcf5a' : '#c8d2f4');
    drawSkyDisc(r, next, sx + 3, sy + 3);
  }
  if (beyond) { r.rect(sx + 14, sy + 12, 5, 7, INK); r.text('+', sx + 15, sy + 10, { color: 'gold', shadow: false }); }
}
/** The sky that is up now: a disc under the timeline's head, joined to the Turn's slot by a thin line under the rail. */
function drawHeadDisc(scene, r) {
  const sv = scene.sky5;
  const x = timelineSlotX(0) + 2, y = TL.y + 19;
  const order = scene.timeline || [];
  let at = Math.max(1, sv.turnIn | 0);
  if (at >= TL.slots) at = TL.slots - 1;
  at = Math.min(at, order.length);
  const mx = timelineSlotX(at) + 9, col = sv.sky === 'day' ? '#ffcf5a' : '#c8d2f4';
  if (mx > x + 14) { r.rect(x + 13, y + 6, mx - x - 13, 3, INK); r.rect(x + 13, y + 7, mx - x - 13, 1, col); r.rect(mx - 1, TL.y + 18, 3, y + 9 - TL.y - 18, INK); r.rect(mx, TL.y + 18, 1, y + 8 - TL.y - 18, col); }
  drawSkyMedallion(r, sv.sky, x, y);
}
/** Over each sided foe's weakness row (drawn this frame): the side badge in its slot, and an Exposed shield pale and cracked. */
function drawSkyRows(scene, r) {
  const sv = scene.sky5, rows = scene._sky5Rows;
  if (!sv || !rows) return;
  const ui = r.assets && r.assets.has('ui') ? r.assets.atlas('ui') : null;
  for (const [uid, p] of rows) {
    const a = scene.actor(uid);
    if (!a || a.dead || !a.skySide || !p || !p.know || p.know.reflect !== SKY_REFLECT) continue;
    const x = p.rect.x, y = p.rect.y, u = scene.unit(uid);
    if (a.skyExposed && u && !u.broken) {
      const badge = ui && ui.frames.shield_badge;
      const hot = a.skyShieldFlash > 0 && (a.skyShieldFlash >> 2) % 2 === 0;
      if (badge) r.sprite(ui, badge, x, y, { topLeft: true, tint: hot ? '#ffffff' : '#dfe6f6', tintAmount: 1 });
      // the crack: a dark zig-zag down the left of the face
      for (const [cx, cy] of [[3, 2], [4, 3], [3, 4], [4, 5], [3, 6], [2, 7], [3, 8], [3, 9]]) r.rect(x + cx, y + cy, 1, 1, '#3a3450');
      r.text(String(u.shields), x + 7, y + 1, { align: 'center', color: '#14101e', shadow: false });
    }
    const ex = x + 15;
    r.rect(ex + 1, y, 12, 12, '#2a2346');
    drawSideBadge(r, shownSide(sv.sky, !!a.skyExposed), ex + 2, y + 1);
  }
}

function wrapScene(B) {
  const base = { enter: B.enter, update: B.update, draw: B.draw, runOp: B.runOp, planEnemyRows: B.planEnemyRows, drawHelpWindow: B.drawHelpWindow, party: B.party };
  B.enter = function (data) {
    base.enter.call(this, data);
    initSky(this);
    this._sky5Swap = null;
    if (this.sky5) gradeLayers(this);
    if (this.pops && !this.pops.__sky5) {
      const pd = this.pops.draw.bind(this.pops);
      this.pops.draw = (r) => { if (this.sky5) drawSkyRows(this, r); pd(r); };
      this.pops.__sky5 = true;
    }
  };
  B.update = function (dt, below) {
    base.update.call(this, dt, below);
    const sv = this.sky5;
    if (!sv) return;
    gradeLayers(this);
    if (sv.k !== sv.goal) {
      const step = Math.max(1, this.speed || 1) / FADE_FRAMES;
      sv.k = sv.k < sv.goal ? Math.min(sv.goal, sv.k + step) : Math.max(sv.goal, sv.k - step);
      paintSky(this);
    }
    for (const a of this.actors.values()) if (a.skyShieldFlash > 0) a.skyShieldFlash--;
  };
  B.draw = function (r) {
    if (!this.sky5) return base.draw.call(this, r);
    this._sky5Rows = null;
    this._sky5R = r;
    try { return base.draw.call(this, r); } finally { unswap(this, null); this._sky5R = null; }
  };
  B.drawHelpWindow = function (r) {
    base.drawHelpWindow.call(this, r);
    if (this.sky5 && this._sky5R === r && !this._sky5Swap) swapTimeline(this);
  };
  // the call that follows the timeline in draw() (the party status window's list): the marker leaves and the head disc draws
  B.party = function () {
    if (this._sky5Swap) unswap(this, this._sky5R);
    return base.party.call(this);
  };
  B.planEnemyRows = function (uids, touch, cwNow, helpBottom, scoreAll) {
    if (!this.sky5) return base.planEnemyRows.call(this, uids, touch, cwNow, helpBottom, scoreAll);
    const b = this.b, know = b.knowledge;
    const sided = new Set((uids || []).filter((u) => { const a = this.actor(u); return a && a.skySide; }));
    b.knowledge = (uid) => { const k = know.call(b, uid); return sided.has(uid) && k && !k.reflect ? { ...k, reflect: SKY_REFLECT } : k; };
    try { const plan = base.planEnemyRows.call(this, uids, touch, cwNow, helpBottom, scoreAll); this._sky5Rows = plan; return plan; }
    finally { b.knowledge = know; }
  };
  B.runOp = function (op) {
    const sv = this.sky5;
    switch (op.op) {
      case 'sky5': if (sv) { sv.turnIn = op.turnIn; if (op.sky && op.sky !== sv.sky) setSky(this, op.sky, true); } return false;
      case 'sky5Turn': if (sv) setSky(this, op.sky, true); return false;
      case 'sky5Exposed': {
        const a = this.actor(op.uid);
        if (a) { a.skyExposed = !!op.on; a.skySide = true; if (op.on) { a.skyShieldFlash = this.fast ? 0 : 28; a.flash = { color: '#ffffff', frames: 8, total: 10, soft: true }; } this.rowShow.set(op.uid, 150); }
        return false;
      }
      case 'sky5Pin': if (sv) { sv.pinned = { source: op.source, target: op.target }; if (Number.isFinite(op.turnIn)) sv.turnIn = op.turnIn; } return false;
      case 'sky5Unpin': if (sv) sv.pinned = null; return false;
      case 'sky5Veil': { const a = this.actor(op.uid); if (a) a.veil5 = !!op.on; return false; }
      default: break;
    }
    if (sv && op.op === 'telegraph' && op.foretell) op = { ...op, text: op.text + answerLine(this) };
    if (sv && op.op === 'help' && op.foretell) op = { ...op, text: op.text + answerLine(this) };
    const res = base.runOp.call(this, op);
    if (sv && op.op === 'summon') { const a = this.actor(op.uid), u = this.unit(op.uid); if (a && u) a.skySide = !!(u.skySide || (ENEMIES[u.id] && ENEMIES[u.id].sky)); }
    if (sv && op.op === 'mp') lowMpHint(this, op);
    return res;
  };
}

// ---------------------------------------------------------------------------------------------------- sound
/** mirror_turn lives in the ep2 sound pack with no fallback: give it a core one, so its first play is never silent. */
export function soundFallbacks(engine) {
  const man = audioManifestOf(engine);
  const e = man && man.sfx && man.sfx.mirror_turn;
  if (e && !e.fallback) e.fallback = 'crystal_hit';
  return !!e;
}

let done = false;
/** Install everything above (and, with an engine, the sound fallback). Safe to call twice. Returns what went in. */
export function register(engine) {
  if (engine) soundFallbacks(engine);
  if (done) return ['already'];
  for (const [k, v] of Object.entries(EP5_BACKDROPS)) if (!BACKDROPS[k]) BACKDROPS[k] = v;
  for (const [k, v] of Object.entries(EP5_BOSS_CARDS)) if (!BOSS_CARD[k]) BOSS_CARD[k] = v;
  if (!SIGNATURE_TECHS.some((t) => t.skill === 'turn_sky')) SIGNATURE_TECHS.push({ unit: 'mira', flag: 'foretold', skill: 'turn_sky' });
  for (const [k, fn] of Object.entries(EP5_FX)) if (!BattleFx.prototype[k]) BattleFx.prototype[k] = fn;
  wrapPlanner(Planner.prototype);
  wrapActor(Actor.prototype);
  wrapScene(BattleScene.prototype);
  done = true;
  return ['backdrops', 'cards', 'signature', 'fx', 'planner', 'actor', 'scene'];
}
export default register;
