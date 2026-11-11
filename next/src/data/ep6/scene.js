// Episode 6 on the battle stage (E6-scene-ui; docs/EPISODE6_PLAN.md 6.3 to 6.5, 9.3; docs/BATTLE.md 14.2). Pack code: index.js
// runs register() last in its ORDER. No core file changes: this module adds to the tables the core exports (BACKDROPS, BOSS_CARD,
// SIGNATURE_TECHS, BattleFx, KEY_ITEMS) and wraps prototype methods of Planner, Actor, CommandMenu, BattleScene and Cutscene that
// pass everything else straight on. Nothing here runs in a battle without a Gale or a gated skill (Episodes 1 to 5, the cave and
// Fine Print draw exactly as before): every wrapper checks for the Gale's events or the scene's `gale6` view first.
//
//   BACKDROPS   ep6_airstair, ep6_causeways, ep6_relays, ep6_storm, ep6_eyrie (assets/backdrops/ep6_battle_*). The two storm
//               stages carry E6-tiles' runtime layers from their json: rain over the sky rows and a soft far-wall lightning
//               flash (+0.12 luma at most, once in 4 s at most, off under reduce motion); the Eyrie's clear grade (the json's
//               grades.clear.tone through Episode 5's dayTone, rain off) cross-fades in over 20 frames when the ward tears
//   BOSS_CARD   THE GALE ENGINE / Keeper of the Broken Signals, THE STORM SCRIBE / Writer of Every Course; the arc line
//               (text.js EP6_ARC_LINES) is the help window's first line while the card shows
//   SIGNATURE   { unit: 'bram', flag: 'rewrite', skill: 'anchor_line' }: while a move is pinned to the Gust Bram opens on Tech,
//               Anchor first, in gold (ahead of the Episode 3 Oath row), with its 12 x 12 anchor icon
//   The Gale    the wind gauge under the timeline's head (a pip per action of the Gust's length, 5, or 3 in brass while the
//               Engine's bellows run) and the Gust as a marker slot IN the timeline where it falls (a white spiral disc on a
//               dark ring, 18 x 18 with a 12 x 12 disc); a pinned Rewrite draws a red quill on it (Full Blast: a red star)
//   A Gust      "The wind gusts." with gale_gust, streaks across the stage, and every unit it moved slides along the timeline
//               (its head in flight with a streak: white blown back, pale blue sooner)
//   Aloft       a white feather (8 x 8, 1 px ink outline) at the head of each Aloft foe's weakness row; Grounded (Broken) greys
//               it. An anchor glyph over each Anchored (gold) or Braced (steel) member while the Gust is 2 actions away or less
//   Rewrite     the telegraph names the answer's owner only when it is true ("Bram can anchor."); Anchor breaks it at the Gust
//               with rewrite_break, paper torn off the Scribe and one line ("The course holds. The Scribe is thrown back.")
//   The Engine  bellows puffing while they run (stalled: none), its Gale Sprites riding out of the vents on the wind
//   The Scribe  three looks by phase (scribe, scribe_ward, scribe_chart, forwarded on `phase`), the ward as a ring of false
//               lamplight that tears; the Beacon and the Compass rise in front-row foe slots beside it, rows under their feet
//   Gated       Turn the Sky with no sky / Anchor with no wind back in the Tech list, greyed with the reason (gale.js
//               gateCommands through a view of battle.commands the menu reads; Auto and the rules see the battle itself)
//   Low MP      once per save, Bram under 14 MP in a fight with a pinned move: "Keep something back to anchor us."
//   Field       the cutscene's s.rope(from, to) / s.rope(null) (vex_falls) and the Sky Compass's second description

import { BACKDROPS, BOSS_CARD, BattleScene } from '../../scenes/battle.js';
import { Planner, FRAMES } from '../../battle/scene/animator.js';
import { Actor } from '../../battle/scene/actors.js';
import { drawHead, stillHud, steadyFrame } from '../../battle/scene/hud.js';
import { SIGNATURE_TECHS, CommandMenu } from '../../battle/scene/menu.js';
import { TL, timelineSlotX, HELP_WIN, HELP_LINE, HELP_LINES_MAX, STATUS_WIN, ENEMY_ROW_H, W, H, helpDock, spriteBox, topBlocks,
  cmdWin } from '../../battle/scene/layout.js';
import { BattleFx, C } from '../../battle/fx.js';
import { Cutscene } from '../../world/cutscene.js';
import { TILE } from '../../world/actors.js';
import { SKILLS } from '../skills.js';
import { KEY_ITEMS } from '../items.js';
import { EP6_BOSS_CARDS, EP6_ARC_LINES, EP6_BATTLE_TEXT as T } from './text.js';
import { gateCommands, windOf, GUST_EVERY, ANCHOR } from './gale.js';
import { bramAnswers } from './ai.js';
import { dayTone, drawRedStar } from '../ep5/scene.js';

export const EP6_BACKDROPS = {
  ep6_airstair: { asset: 'ep6_battle_sky', cell: 5, bright: 1.0, tint: null },
  ep6_causeways: { asset: 'ep6_battle_causeway', cell: 5, bright: 1.0, tint: null },
  ep6_relays: { asset: 'ep6_battle_relays', cell: 7, bright: 0.8, tint: 'rgba(60,50,120,0.22)' },
  ep6_storm: { asset: 'ep6_battle_storm', cell: 5, bright: 0.6, tint: 'rgba(30,40,80,0.35)' },
  ep6_eyrie: { asset: 'ep6_battle_eyrie', cell: 5, bright: 0.7, tint: 'rgba(30,40,80,0.3)' },
};
/** The runtime layers of the storm stages (E6-tiles' json `rain`, `lightning`, `grades.clear`; these are its values). */
export const STORM = {
  rain: { color: '#b5c3da', alpha: 0.22, slope: 0.35, spacing: 9, length: 7, speed: 5 },
  lightning: { color: '#e8fffb', peakLumaRise: 0.12, minIntervalMs: 4000, riseFrames: 3, fallFrames: 9 },
  at: { ep6_storm: [300, 100, 120], ep6_eyrie: [70, 60, 110] },
  clear: { lift: 2.3, warm: 0.0, chroma: 1.1, cast: 0.022, hue: 1.2 },
};
export const CLEAR_STAGE = 'ep6_eyrie';      // the stage that opens to the clear grade when the ward tears
export const FADE_FRAMES = 20;
export const MARK_UID = '_gale6_gust';
const GHOST = '_gale6_ghost';                // a timeline slot whose head is in flight (the slide draws it)
export const REWRITE = '#rewrite';           // the scene's telegraph key for a pinned move: `${source}#rewrite`
export const LOW_MP = 14;                    // Anchor's cost
export const HINT_FLAG = 'hint_anchor_mp';
export const ANCHOR_SIG = { unit: 'bram', flag: 'rewrite', skill: ANCHOR };
export const SLIDE_FRAMES = 20;
const ALOFT_REFLECT = 'aloft';               // the knowledge flag that makes a row keep one slot for the Aloft badge
/** Where the ward's lights stand (CRITIQUE_7 item 2): on the foes' side between the Scribe and the party, never over either.
 * The Compass in the front row, its row under its feet; the Beacon (Aloft) rides the wind beside the Scribe's wing, its row
 * beside it in the open air (with the Scribe 147 px wide, two 60 to 75 px rows under two feet cannot both fit in the 94 px
 * left before the party: qa/battlescene/ep6_scene.test.mjs measures every spot). */
export const WARD_SPOTS = { false_beacon: { x: 198, y: 104 }, broken_compass: { x: 228, y: 134 } };
// E6-fixes A2 (CRITIQUE_8 items 1 and 7). The Compass stands 12 px further from Arden (240 to 228). On the phone the Scribe's row
// keeps ONE anchor in all three looks: top-left over its wing (look one's band spot, x = home + dx); while the ward's lights stand
// the help window leaves its dock (the lights' heads are under it) and takes the top-left band, so the row sits under the help at
// its tallest, the same x (a row that never hops as the help text grows). The Beacon's row stands beside its lamp, clear of the
// Compass under it. Ordinary foes keep one rule per encounter: when the core puts one row above a head and another under feet,
// steadyRows() puts them all above or all below if every row fits that way (the two Harriers).
export const SCRIBE_ROW = { dx: -87, y: 2 };
export const LAMP_ROW = { dy: 13 };      // the Beacon's row: right of the sprite, its top this far under the sprite's top
const HELP_TALLEST = HELP_WIN.y + HELP_WIN.h + (HELP_LINES_MAX - 1) * HELP_LINE;
const SCRIBE_LOOK = { wind_script: 'scribe', storm_ward: 'scribe_ward', true_sky_chart: 'scribe_chart' };
const GALE_DELAYS = new Set(['gust', 'anchor', 'rewrite_course', 'full_blast']);
const isRewrite = (id) => !!(SKILLS[id] && SKILLS[id].rewrite);

const hitBox = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
/**
 * E6-fixes A2: steady the enemy rows a Gale battle planned (pure; the scene's planEnemyRows wrap and the test call it). `plan` is
 * the core's Map uid -> { at, rect, place, lift, badges }; `actors` every live actor ({ uid, id, side, x, y, homeX, homeY, w, h });
 * `docked` whether the help window is in its dock. Changes the plan in place and returns it.
 */
export function steadyRows(plan, { actors, touch, helpBottom = 23, cw = null, docked = false }) {
  const live = actors.filter((a) => a && !a.dead && !a.ko);
  const byUid = new Map(live.map((a) => [a.uid, a]));
  const clampX = (x, w) => Math.max(4, Math.min(W - w - 4, Math.round(x)));
  const off = (a) => ({ dx: Math.round((a.x ?? 0) - (a.homeX ?? a.x ?? 0)), dy: Math.round((a.y ?? 0) - (a.homeY ?? a.y ?? 0)) });
  const set = (p, a, x, y, place) => {
    const o = off(a);
    p.at = { x: x + o.dx, y: y + o.dy }; p.rect = { x: x + o.dx, y: y + o.dy, w: p.rect.w, h: ENEMY_ROW_H }; p.place = place; p.lift = 0;
  };
  const tall = (p, r) => (p.badges ? { x: r.x, y: r.y - 10, w: r.w, h: r.h + 10 } : r);
  for (const [uid, p] of plan) {
    const a = byUid.get(uid);
    if (!a || !p.rect) continue;
    if (touch && a.id === 'scribe') set(p, a, clampX((a.homeX ?? a.x) + SCRIBE_ROW.dx, p.rect.w), docked ? SCRIBE_ROW.y : HELP_TALLEST + 2, 'band');
    else if (a.id === 'false_beacon' && p.place !== 'below') {
      const own = spriteBox(a, true);
      const r = { x: clampX(own.x + own.w + 3, p.rect.w), y: own.y + LAMP_ROW.dy, w: p.rect.w, h: ENEMY_ROW_H };
      if (!live.some((o) => o.uid !== uid && hitBox(r, spriteBox(o, true)))) set(p, a, r.x, r.y, 'right');
    }
  }
  if (!touch) return plan;
  // one rule for the ordinary rows: all above or all below, when every row fits that way
  const ord = [...plan.entries()].filter(([uid, p]) => byUid.get(uid) && (p.place === 'above' || p.place === 'below'));
  const places = new Set(ord.map(([, p]) => p.place));
  if (places.size < 2) return plan;
  const n = (pl) => ord.filter(([, p]) => p.place === pl).length;
  const order = n('above') > n('below') ? ['above', 'below'] : ['below', 'above'];
  const hard = [cw || cmdWin(true), STATUS_WIN, ...topBlocks(helpBottom)];
  const bodies = live.map((a) => ({ uid: a.uid, ...spriteBox(a, true) }));
  const fixed = [...plan.entries()].filter(([uid]) => !ord.some(([u]) => u === uid)).map(([, p]) => tall(p, p.rect));
  for (const rule of order) {
    const spots = [];
    let ok = true;
    for (const [uid, p] of ord) {
      const a = byUid.get(uid), own = spriteBox(a, true);
      const r = { x: clampX((a.homeX ?? a.x) - p.rect.w / 2, p.rect.w), y: rule === 'below' ? own.y + own.h + 3 : own.y - ENEMY_ROW_H - 2, w: p.rect.w, h: ENEMY_ROW_H };
      const t = tall(p, r);
      if (t.y < 0 || r.y + r.h > H || hard.some((b) => hitBox(t, b)) || bodies.some((b) => hitBox(t, b))
        || fixed.some((f) => hitBox(t, f)) || spots.some((q) => hitBox(t, q.t))) { ok = false; break; }
      spots.push({ p, a, r, t });
    }
    if (!ok) continue;
    for (const q of spots) set(q.p, q.a, q.r.x, q.r.y, rule);
    break;
  }
  return plan;
}

// ---------------------------------------------------------------------------------------------------- pixel art
const INK = '#14101e';
const SPIRAL = { w: '#f6f4ee', s: '#3a5a8c' };
// 12 x 12: the Gust, a white disc with a slate wind spiral
const SPIRAL12 = ['....wwww....', '..wwwsssww..', '.wwssswssww.', '.wsswwwwwww.', 'wwswwssswwww', 'wwswwswsswww',
  'wwswwswwswww', 'wwsswwwsswww', '.wwssssswww.', '.wwwwwwwwww.', '..wwwwwwww..', '....wwww....'];
// 8 x 8: the Aloft feather (vane in white, shaft pale blue), drawn with a 1 px ink outline
const FEATHER8 = ['......ww', '.....wwq', '....wwqw', '...wwqww', '..wwqww.', '.wwqww..', '.wqw....', 'q.......'];
const FEATHER = { w: '#ffffff', q: '#9fb4cc' };
const FEATHER_GROUND = { w: '#8e8997', q: '#5a566a' };
// 7 x 8: the anchor over an Anchored (gold) or Braced (steel) member
const ANCHOR7 = ['...a...', '..a.a..', '...a...', 'aaaaaaa', '...a...', 'a..a..a', '.a.a.a.', '..aaa..'];
// 12 x 12: Anchor's menu icon (CRITIQUE_7 item 10), steel with a shaded shank
const ANCHOR_ICON = ['............', '.....ss.....', '....s..s....', '.....ss.....', '..ssssssss..', '.....sd.....',
  '.....sd.....', '.s...sd...s.', '.ss..sd..ss.', '..ss.sd.ss..', '...ssssss...', '............'];
const ANCHOR_ICON_PAL = { s: '#dfe8f4', d: '#8fa2c0' };
// 7 x 8: the red quill of a pinned Rewrite
const QUILL = ['......r', '.....rr', '....rhr', '...rhr.', '..rhr..', '.rhr...', '.rr....', 'k......'];
const QUILL_PAL = { r: '#ff3b3b', h: '#ffd6c8', k: '#f6f4ee' };

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
const ROW14 = [4, 2, 1, 1, 0, 0, 0, 0, 0, 0, 1, 1, 2, 4];   // inset per row of a 14 px circle
/** A round 14 x 14 dark tile with a 1 px coloured ring. */
function ringTile(r, x, y, ring, fill = INK) {
  ROW14.forEach((d, j) => r.rect(x + d, y + j, 14 - d * 2, 1, fill));
  if (!ring) return;
  ROW14.forEach((d, j) => { r.rect(x + d, y + j, 1, 1, ring); r.rect(x + 13 - d, y + j, 1, 1, ring); });
  r.rect(x + 4, y, 6, 1, ring); r.rect(x + 4, y + 13, 6, 1, ring);
}
export function drawGustDisc(r, x, y) { blit(r, SPIRAL12, x, y, SPIRAL); }
/** The Aloft badge on its dark tile (10 x 10 with the outline): white when it rides, grey while Grounded. */
export function drawAloftBadge(r, x, y, grounded = false) { r.rect(x, y, 10, 10, INK); blitOutlined(r, FEATHER8, x + 1, y + 1, grounded ? FEATHER_GROUND : FEATHER); }
export function drawAnchorGlyph(r, x, y, color) { blitOutlined(r, ANCHOR7, x, y, { a: color }); }
export function drawAnchorIcon(r, x, y) { blitOutlined(r, ANCHOR_ICON, x, y, ANCHOR_ICON_PAL); }
export function drawQuill(r, x, y) { blitOutlined(r, QUILL, x, y, QUILL_PAL); }

// ---------------------------------------------------------------------------------------------------- fx (BattleFx)
const WIND = ['#ffffff', '#e6f0ff', '#cfe0f2'];
const SOONER = ['#bfe8ff', '#8fd0ff', '#ffffff'];
const LAMP = ['#ffcf5a', '#f9d77a', '#eba14d', '#fff1c8'];
const PAPER = ['#e8dcb8', '#fff7d6', '#c8b890', '#f6f4ee'];
const BRASS = ['#e0a040', '#f9d77a', '#a8702a', '#fff1c8'];
/** Short horizontal streaks over a box, travelling `dir` (1 right, -1 left). */
function streaks(fx, cx, cy, w, h, dir, colors, frames = 16, n = 6, layer = 'over') {
  const seed = fx.seed++;
  fx.add(frames, (r, t) => {
    const k = t / frames;
    for (let i = 0; i < n; i++) {
      const j = ((seed * 7 + i * 13) % 17) / 17, q = ((seed * 3 + i * 29) % 23) / 23;
      const y = Math.round(cy - h / 2 + h * j), len = 8 + Math.round(10 * q);
      const x = Math.round(cx - dir * (w / 2 + 12) + dir * (w + 24) * Math.min(1, k * 1.3 + q * 0.2));
      r.withAlpha(Math.max(0, 1 - k), () => r.rect(dir > 0 ? x - len : x, y, len, 1, colors[i % colors.length]));
    }
  }, layer);
}
export const EP6_FX = {
  /** The Gust crosses the stage: white streaks blow left to right for 20 frames, under and over the units. */
  fx_gale6_gust() {
    const seed = this.seed++;
    for (const [layer, n, a] of [['under', 14, 0.55], ['over', 9, 0.8]]) {
      this.add(20, (r, t) => {
        const k = t / 20;
        for (let i = 0; i < n; i++) {
          const j = ((seed * 11 + i * 37 + (layer === 'over' ? 5 : 0)) % 41) / 41, q = ((seed * 5 + i * 19) % 29) / 29;
          const y = 28 + Math.round(j * 116), len = 18 + Math.round(q * 26);
          const x = Math.round(-60 + (384 + 120) * Math.min(1, k * (1.1 + q * 0.5)) - q * 80);
          r.withAlpha(a * (1 - k * 0.6), () => { r.rect(x - len, y, len, 1, WIND[i % 3]); if (i % 3 === 0) r.rect(x - len + 6, y + 1, len - 10, 1, '#9fb4cc'); });
        }
      }, layer);
    }
  },
  /** One unit the Gust moved: streaks across its body (white blown back, pale blue sooner, gold caught by the anchor). */
  fx_gale6_push(o) {
    const { cx, cy } = this.center(o);
    const back = o.dir > 0, col = o.anchor ? [C.gold, '#fff1a8', C.white] : back ? WIND : SOONER;
    streaks(this, cx, cy, Math.max(24, o.w || 32), Math.max(20, (o.h || 32) * 0.8), 1, col, 16, 6);
    if (!back) this.particles(cx, cy - 4, 6, { colors: col, dir: -Math.PI / 2, spread: 0.8, speed: 1.2, life: 18, size: 1, radius: 8 });
  },
  /** Anchor: an anchor drops to Bram's feet and a gold line closes round the party. */
  fx_gale6_anchor(o) {
    const cx = Math.round(o.x || 0), cy = Math.round(o.y || 0);
    this.add(24, (r, t) => {
      const k = Math.min(1, t / 10), y = Math.round(cy - 46 + 40 * k * k);
      r.withAlpha(t < 18 ? 1 : (24 - t) / 6, () => { r.line(cx, cy - 70, cx, y - 2, '#d8b878'); drawAnchorGlyph(r, cx - 3, y, C.gold); });
    }, 'top');
    this.fx_ring({ x: 318, y: cy, h: 0 }, { color: C.gold, r0: 70, r1: 30, frames: 24, squash: 0.25, dy: -2, layer: 'under' });
    this.sparkles(cx, cy - 6, 6, [C.gold, '#fff1a8', C.white], 22, 12);
  },
  /** A Ballast Stone braces: a steel band settles at the member's feet. */
  fx_gale6_brace(o) {
    this.fx_ring({ ...o, h: 0 }, { color: '#cfe0f0', r0: 18, r1: 8, frames: 16, squash: 0.35, layer: 'under' });
    this.sparkles(o.x, (o.y || 0) - 8, 4, ['#cfe0f0', C.white], 16, 8);
  },
  /** The Scribe writes the course: a red-ink stroke runs from it up to the Gust's slot on the timeline. */
  fx_gale6_quill(o) {
    const { cx, cy } = this.center(o);
    const tx = o.toX ?? 300, ty = o.toY ?? 16;
    this.add(18, (r, t) => {
      const k = Math.min(1, t / 10);
      const x = Math.round(cx + (tx - cx) * k), y = Math.round(cy + (ty - cy) * k);
      r.withAlpha(t < 12 ? 1 : (18 - t) / 6, () => { r.line(cx + 1, cy + 1, x + 1, y + 1, INK); r.line(cx, cy, x, y, '#ff3b3b'); drawQuill(r, x - 3, y - 7); });
    }, 'top');
    this.sparkles(cx, cy, 5, ['#ff3b3b', '#ffd6c8'], 20, 14);
  },
  /** A pinned move breaks: paper tears off its owner and blows away, a white ring and pale rays. */
  fx_gale6_tear(o) {
    const { cx, cy } = this.center(o);
    const span = Math.max(20, Math.round((o.w || 60) / 3));
    this.particles(cx, cy, 30, { colors: PAPER, speed: 2.4, life: 40, gravity: 0.02, drift: 0.9, size: 2, shrink: true, radius: span, vx: -0.6 });
    this.particles(cx, cy, 10, { colors: ['#ff3b3b', '#2a2258'], speed: 1.6, life: 24, gravity: 0.08, size: 1 });
    this.add(22, (r, t) => {   // two halves of a page torn apart
      const k = t / 22, d = Math.round(k * 26), lift = Math.round(k * 14);
      r.withAlpha(1 - k, () => {
        r.rect(cx - 9 - d, cy - 8 - lift, 9, 14, C.paper); r.rect(cx - 9 - d, cy - 8 - lift, 9, 1, C.white);
        r.rect(cx + 1 + d, cy - 6 - lift, 9, 14, C.paper); r.rect(cx + 1 + d, cy - 6 - lift, 9, 1, C.white);
        for (let i = 0; i < 6; i++) { r.rect(cx - d, cy - 8 - lift + i * 2, 1, 1, INK); r.rect(cx + 1 + d, cy - 6 - lift + i * 2 + 1, 1, 1, INK); }
      });
    }, 'top');
    this.fx_ring(o, { color: C.white, r0: 6, r1: span + 30, frames: 16 });
    this.fx_rays(o, { color: '#cfe0f2', n: 10, len: span + 24, frames: 18 });
  },
  /** The course is written: lines of storm ink sweep over a member and push it back. */
  fx_gale6_written(o) {
    const { cx, cy } = this.center(o);
    streaks(this, cx, cy, Math.max(24, o.w || 32), Math.max(20, o.h || 32), 1, ['#2a2258', '#4a3888', '#ff3b3b'], 18, 7, 'top');
    this.particles(cx, cy, 10, { colors: ['#2a2258', '#6a54b0'], speed: 1.4, life: 20, size: 2, shrink: true, vx: 1 });
  },
  /** The Engine's vents open: a burst of air off its back. */
  fx_gale6_vents(o) {
    const { cx, cy } = this.center(o);
    this.particles(cx - Math.round((o.w || 100) * 0.3), cy - 10, 26, { colors: WIND, dir: -Math.PI * 0.75, spread: 1.4, speed: 2.4, life: 30, size: 2, shrink: true, radius: 10 });
    streaks(this, cx, cy - 10, (o.w || 100) + 40, 50, 1, WIND, 18, 8);
  },
  /** A Gale Sprite rides out on the wind: a spiral of streaks that settles into it. */
  fx_gale6_ride(o) {
    const { cx, cy } = this.center(o);
    this.add(24, (r, t) => {
      const k = t / 24;
      for (let i = 0; i < 10; i++) {
        const a = i * Math.PI / 5 + k * 5, rad = Math.round(26 * (1 - k) + 4);
        r.withAlpha(1 - k * 0.7, () => r.rect(Math.round(cx + Math.cos(a) * rad), Math.round(cy + Math.sin(a) * rad * 0.6), 3, 1, WIND[i % 3]));
      }
    }, 'over');
    this.bloom(cx, cy, '#cfe0f2');
  },
  /** The ward closes: false lamplight sweeps in to a ring round the Scribe. */
  fx_gale6_ward(o) {
    const { cx, cy } = this.center(o), hw = Math.round((o.w || 130) / 2) + 8;
    this.add(30, (r, t) => {
      const k = t / 30;
      for (let i = 0; i < 16; i++) {
        const a = i * Math.PI / 8 + k * 2, rad = hw * (1.8 - 0.8 * k);
        r.withAlpha(0.4 + 0.6 * k, () => r.rect(Math.round(cx + Math.cos(a) * rad), Math.round(cy + Math.sin(a) * rad * 0.6), 2, 2, LAMP[i % 4]));
      }
    }, 'top');
    this.bloom(cx, cy, LAMP[0], true);
  },
  /** The ward tears: the lamps burst outward as sparks, a white ring, gold rays. */
  fx_gale6_ward_tear(o) {
    const { cx, cy } = this.center(o);
    this.particles(cx, cy, 44, { colors: LAMP, speed: 3, life: 36, gravity: 0.05, drift: 0.4, size: 2, shrink: true, radius: Math.round((o.w || 130) / 3), radiusY: Math.round((o.h || 130) / 4) });
    this.fx_ring(o, { color: C.white, r0: 12, r1: 80, frames: 18 });
    this.fx_rays(o, { color: C.gold, n: 12, len: 64, frames: 18 });
  },
  /** The True Sky Chart: the wings open like sails, the Wind Script's lines blow off them, lightning in the tips. */
  fx_gale6_sails(o) {
    const { cx, cy } = this.center(o);
    this.particles(cx, cy, 36, { colors: ['#cfe6ff', '#9fd4ff', '#ffffff', '#f9d77a'], speed: 2.2, life: 40, drift: 0.6, size: 2, shrink: true, radius: Math.round((o.w || 140) / 3), radiusY: Math.round((o.h || 140) / 4) });
    streaks(this, cx, cy, (o.w || 140) + 30, (o.h || 140) * 0.7, 1, ['#cfe6ff', '#ffffff'], 24, 10, 'top');
    this.fx_rays(o, { color: '#cfe6ff', n: 14, len: 72, frames: 24 });
    this.bloom(cx, cy, '#9fd4ff', true);
  },
  /** The False Beacon rises: a column of false light, then the lamp lit. */
  fx_gale6_beacon(o) {
    const cx = Math.round(o.x || 0), y = Math.round(o.y || 0), h = o.h || 60;
    this.add(26, (r, t) => {
      const k = t / 26, top = Math.round(y - h * Math.min(1, k * 1.6));
      r.withAlpha(0.5 * (1 - k), () => r.ditherEllipse(cx, Math.round((y + top) / 2), 10, Math.max(4, Math.round((y - top) / 2)), LAMP[0], 0.5));
    }, 'under');
    this.particles(cx, y - 4, 18, { colors: LAMP, dir: -Math.PI / 2, spread: 0.5, speed: 1.8, life: 28, size: 1, radius: 6 });
    this.bloom(cx, Math.round(y - h * 0.8), LAMP[1], true);
  },
  /** The Broken Compass rises: a brass ring spins in round it. */
  fx_gale6_compass(o) {
    const { cx, cy } = this.center(o);
    this.add(26, (r, t) => {
      const k = t / 26;
      for (let i = 0; i < 12; i++) {
        const a = i * Math.PI / 6 - k * 6, rad = Math.round(30 * (1 - k) + 12);
        r.withAlpha(1 - k * 0.6, () => r.rect(Math.round(cx + Math.cos(a) * rad), Math.round(cy + Math.sin(a) * rad * 0.7), 2, 1, BRASS[i % 4]));
      }
    }, 'over');
    this.fx_ring({ ...o, h: 0 }, { color: BRASS[0], r0: 2, r1: 22, frames: 18, squash: 0.35 });
  },
  /** The bellows stall: a grey cough of smoke. */
  fx_gale6_stall(o) {
    const { cx, cy } = this.center(o);
    this.particles(cx - Math.round((o.w || 100) * 0.3), cy - 14, 14, { colors: ['#8e8997', '#5a566a', '#bdb8c6'], dir: -Math.PI / 2, spread: 1, speed: 0.8, life: 34, size: 3, shrink: true, radius: 8 });
  },
};

// ---------------------------------------------------------------------------------------------------- the planner
const partyUids = (P) => Object.values(P.units).filter((u) => u.side === 'party').map((u) => u.uid);
const unitId = (P, uid) => (P.units[uid] && P.units[uid].id) || null;

function wrapPlanner(P) {
  const base = { battle_start: P.ev_battle_start, telegraph: P.ev_telegraph, telegraph_cancel: P.ev_telegraph_cancel, message: P.ev_message,
    phase: P.ev_phase, summon: P.ev_summon, delay: P.ev_delay, castOpen: P.castOpen, enemyOpen: P.enemyOpen };
  P.ev_battle_start = function (e) {
    base.battle_start.call(this, e);
    const boss = (e.units || []).find((u) => u.side === 'enemy' && EP6_ARC_LINES[u.id]);
    if (!boss) return;
    for (let i = this.ops.length - 1; i >= 0; i--) if (this.ops[i].op === 'help') { this.ops[i].text = EP6_ARC_LINES[boss.id]; this.ops[i].color = 'cream'; break; }
  };
  // ---- the Gale's own events (gale.js); every one is new to the core planner
  P.ev_gale = function (e) { this.push({ op: 'gale6', gustIn: e.gustIn, every: e.every, reason: e.reason || null }); };
  P.ev_aloft = function (e) { this.push({ op: 'gale6Aloft', uid: e.target, on: !!e.on }); };
  P.ev_anchored = function (e) {
    this.push({ op: 'gale6Anchor', uids: e.targets || partyUids(this), on: !!e.on });
    if (e.on) for (const uid of e.targets || []) this.push({ op: 'flash', uid, color: '#f9d77a', frames: 10, soft: true });
  };
  P.ev_braced = function (e) {
    this.push({ op: 'gale6Brace', uid: e.target, on: !!e.on });
    if (e.on) this.push({ op: 'fx', kind: 'gale6_brace', uid: e.target });
  };
  P.ev_gust = function (e) {
    this.push({ op: 'gale6Gust', pushed: e.pushed || [] });
    this.wait(SLIDE_FRAMES - 4);
  };
  P.ev_rewrite = function (e) { this.push({ op: 'gale6Pin', source: e.source, skill: e.skill, gustIn: e.gustIn }); };
  P.ev_rewrite_broken = function (e) {
    this.push({ op: 'gale6Unpin' });
    this.push({ op: 'telegraphCancel', actor: `${e.source}${REWRITE}` });
    if (e.reason === 'anchor') {
      this.push({ op: 'fx', kind: 'gale6_tear', uid: e.source });
      this.push({ op: 'sfx', id: e.sfx || 'rewrite_break' });
      this.push({ op: 'screenFlash', color: '#ffffff', frames: 10, alpha: 0.5 });
      this.push({ op: 'shake', mag: 3, frames: 12 });
      this.wait(10);
    } else if (e.reason === 'break') {
      this.push({ op: 'fx', kind: 'gale6_tear', uid: e.source });
      this.help(`{c:cyan}${e.skill === 'full_blast' ? 'The blast fizzles.' : 'The rewrite fails.'}{/c}`);
      this.wait(FRAMES.statusQuiet);
    }
  };
  P.ev_rewrite_land = function () { this.push({ op: 'gale6Unpin' }); };
  // a pinned move is under its own key, so its cancel never takes a charge its owner also holds (the Scribe's Thunderhead)
  P.ev_telegraph = function (e) {
    if (!e.rewrite) return base.telegraph.call(this, e);
    this.pose(e.actor, 'cast');
    this.push({ op: 'telegraph', actor: `${e.actor}${REWRITE}`, skill: e.skill, name: e.name, text: e.text, target: null,
      targets: e.targets || [], nextTurn: e.nextTurn, rewrite: true });
    this.push({ op: 'sfx', id: e.sfx || 'rewrite_read' });
    this.push({ op: 'gale6Quill', uid: e.actor, skill: e.skill });
    this.push({ op: 'screenFlash', color: '#2a1030', frames: 10, alpha: 0.4 });
    this.push({ op: 'help', text: `{c:orange}${e.text}{/c}`, color: null, rewrite: true });
    this.wait(FRAMES.telegraph + 12);
  };
  P.ev_telegraph_cancel = function (e) {
    if (!isRewrite(e.skill)) return base.telegraph_cancel.call(this, e);
    this.push({ op: 'telegraphCancel', actor: `${e.actor}${REWRITE}` });   // the line was said by rewrite_broken
  };
  // the Gale's pushes show as slides on the timeline (gale6Gust), never as a "knocked back in line!" line each
  P.ev_delay = function (e) {
    if (!GALE_DELAYS.has(e.reason)) return base.delay.call(this, e);
    this.push({ op: 'gale6Push', uid: e.target, amount: e.amount, reason: e.reason });
  };
  P.ev_message = function (e) {
    const k = e.kind;
    if (k === 'gust') {
      this.push({ op: 'fx', kind: 'gale6_gust', uid: null });
      this.push({ op: 'sfx', id: e.sfx || 'gale_gust' });
      this.push({ op: 'shake', mag: 1, frames: 10 });
      this.help(T.gust, 'cyan');
      this.wait(12);
      return;
    }
    if (k === 'anchor' || k === 'blessing') { this.help(e.text, 'gold'); this.wait(FRAMES.message); return; }
    if (k === 'ballast' || k === 'rewrite_answer' || k === 'rewrite_sky' || k === 'no_sky') { this.help(e.text, 'cyan'); this.wait(FRAMES.message); return; }
    if (k === 'rewrite_broken') {
      const id = unitId(this, e.target);
      this.help(id === 'scribe' ? T.rewrite_broken : id === 'gale_engine' ? T.blast_broken : e.text, 'gold');
      this.wait(FRAMES.message + 12);
      return;
    }
    if (k === 'rewrite_land') {
      this.help(unitId(this, e.target) === 'scribe' ? T.rewrite_land : e.text, 'orange');
      this.wait(FRAMES.message);
      return;
    }
    if (k === 'bellows') {
      const on = !/stall/i.test(e.text || '');
      this.push({ op: 'gale6Bellows', uid: e.target, on });
      if (!on) { this.push({ op: 'fx', kind: 'gale6_stall', uid: e.target }); this.push({ op: 'sfx', id: 'door_rumble', volume: 0.6 }); }
      this.help(on ? T.bellows_on : T.bellows_off, 'orange');
      this.wait(FRAMES.message);
      return;
    }
    if (k === 'vents') {
      this.push({ op: 'fx', kind: 'gale6_vents', uid: e.target });
      this.push({ op: 'sfx', id: 'gale_gust' });
      this.help(e.text, 'violet');
      this.wait(FRAMES.message);
      return;
    }
    if ((k === 'ward' || k === 'ward_break') && unitId(this, e.target) === 'scribe') {
      const on = k === 'ward';
      this.push({ op: 'fx', kind: on ? 'gale6_ward' : 'gale6_ward_tear', uid: e.target });
      this.push({ op: 'sfx', id: on ? 'summon' : 'glass_break' });
      if (!on) {
        this.push({ op: 'shake', mag: 4, frames: 18 });
        this.push({ op: 'screenFlash', color: '#fff1c8', frames: 8, alpha: 0.5 });
        this.push({ op: 'gale6Clear' });
        this.push({ op: 'ward', uid: e.target, on: false });
        this.help(T.ward_tears, 'orange');
        this.wait(FRAMES.message + 12);
        return;
      }
    }
    base.message.call(this, e);
  };
  P.ev_phase = function (e) {
    const look = SCRIBE_LOOK[e.id];
    if (!look) return base.phase.call(this, e);
    if (e.phase <= 1) { this.help(e.text, 'orange'); this.wait(FRAMES.message); return; }   // the opening look: no change to show
    const last = e.phase >= 3;
    this.push({ op: 'banner', text: e.name || `Phase ${e.phase}`, style: 'phase' });
    this.push({ op: 'fx', kind: last ? 'gale6_sails' : 'gale6_ward', uid: e.actor });
    this.push({ op: 'sfx', id: last ? 'thunder' : 'summon' });
    this.push({ op: 'shake', mag: 4, frames: 20 });
    this.wait(14);
    this.push({ op: 'screenFlash', color: last ? '#e6f2ff' : '#fff1c8', frames: 10, alpha: 0.65 });
    this.push({ op: 'swapSprite', uid: e.actor, sprite: e.sprite || look });
    this.push({ op: 'reveal', uid: e.actor, reset: true });
    this.help(e.text || `${this.name(e.actor)} changes.`, 'orange');
    this.wait(FRAMES.phase);
  };
  P.ev_summon = function (e) {
    const kind = e.id === 'false_beacon' ? 'gale6_beacon' : e.id === 'broken_compass' ? 'gale6_compass' : e.id === 'gale_sprite' && e.by && unitId(this, e.by) === 'gale_engine' ? 'gale6_ride' : null;
    if (!kind) return base.summon.call(this, e);
    this.push({ op: 'summon', uid: e.enemy, id: e.id, name: e.name, variant: e.variant, tint: e.tint, hp: e.hp, by: e.by, split: false });
    this.push({ op: 'fx', kind, uid: e.enemy });
    this.push({ op: 'sfx', id: kind === 'gale6_ride' ? 'gale_gust' : 'summon', volume: 0.8 });
    if (kind !== 'gale6_ride') this.help(`${e.name} rises beside the Scribe!`, 'violet');   // the Engine's vents line says the sprites
    this.wait(FRAMES.summon);
  };
  // Anchor: an anchor at Bram's feet and a line round the party (anchor_set), not the default light burst and heal chime
  P.castOpen = function (actor, start, targets) {
    if (!(start.action && start.action.skill === ANCHOR)) return base.castOpen.call(this, actor, start, targets);
    this.pose(actor, 'cast');
    this.push({ op: 'fx', kind: 'gale6_anchor', uid: actor });
    this.push({ op: 'sfx', id: start.sfx || 'anchor_set' });
    this.wait(FRAMES.castWindup);
  };
  // A pinned move lands: the charge it ends is its own, never a charge its owner also holds
  P.enemyOpen = function (actor, start, rest, targets) {
    const id = start.action && start.action.skill;
    if (!(start.charged && isRewrite(id))) return base.enemyOpen.call(this, actor, start, rest, targets);
    this.pose(actor, id === 'full_blast' ? 'attack' : 'cast');
    this.push({ op: 'telegraphCancel', actor: `${actor}${REWRITE}`, fired: true });
    this.push({ op: 'screenFlash', color: '#2a1030', frames: 10, alpha: 0.55 });
    this.push({ op: 'fx', kind: 'enemy_cast', uid: actor });
    this.push({ op: 'sfx', id: start.sfx || 'rewrite_read' });
    this.wait(FRAMES.enemySpell);
    for (const t of targets) this.push({ op: 'fx', kind: id === 'full_blast' ? 'gale6_push' : 'gale6_written', uid: t, dir: 1 });
    if (id === 'full_blast') { this.push({ op: 'fx', kind: 'quake', uid: targets[0] }); this.push({ op: 'shake', mag: 5, frames: 18 }); }
    this.wait(FRAMES.enemyRelease + 4);
  };
}

// ---------------------------------------------------------------------------------------------------- actor marks
/** The ward: a slow ring of false lamplight behind the Scribe, a faint warm haze inside it, the lamps flickering. */
// Reduce motion (#82): the ward and the bellows draw at steadyFrame (no orbit, drift or flicker), every lamp lit.
export function drawWard(r, a, frame) {
  const still = stillHud(r);
  frame = steadyFrame(r, frame);
  const cx = a.cx, cy = a.cy, hw = Math.round(a.w / 2) + 6, hh = Math.round(a.h / 2) - 4;
  r.withAlpha(0.14 + ((frame >> 4) % 2) * 0.05, () => r.ditherEllipse(cx, cy, hw + 4, hh + 2, LAMP[0], 0.4));
  for (let i = 0; i < 14; i++) {
    const ang = i * Math.PI * 2 / 14 + frame / 90, wob = Math.sin(frame / 18 + i) * 2;
    const x = Math.round(cx + Math.cos(ang) * (hw + wob)), y = Math.round(cy + Math.sin(ang) * (hh + wob));
    const lit = still || ((frame >> 3) + i * 5) % 7 !== 0;
    r.rect(x - 1, y - 1, 4, 4, INK);
    r.rect(x, y, 2, 2, lit ? LAMP[i % 4] : '#8a5a2a');
  }
}
/** The bellows while they run: three puffs drifting up off the Engine's back, one every 16 frames. */
export function drawBellows(r, a, frame) {
  frame = steadyFrame(r, frame);
  const bx = a.cx - Math.round(a.w * 0.32), by = a.top + Math.round(a.h * 0.32);
  for (let i = 0; i < 3; i++) {
    const p = ((frame + i * 16) % 48) / 48, rad = 2 + Math.round(p * 5);
    const x = Math.round(bx - p * 14), y = Math.round(by - p * 22);
    r.withAlpha(0.7 * (1 - p), () => r.ditherEllipse(x, y, rad, Math.max(2, rad - 1), '#e6f0ff', 0.6));
  }
}
/** Over a head: the pinned Rewrite's quill (Full Blast: a red star) on its source, the anchor on a braced member near a Gust. */
export function drawHeadMarks(r, a, gv, frame) {
  const bob = (steadyFrame(r, frame) >> 3) % 2;   // Reduce motion (#82): the marks hold still
  if (gv.pinned && gv.pinned.source === a.uid) {
    if (gv.pinned.skill === 'full_blast') drawRedStar(r, a.cx - 3, a.top - 12 - bob);
    else drawQuill(r, a.cx - 3, a.top - 13 - bob);
  }
  if (a.side === 'party' && gv.gustIn <= 2 && (a.anchor6 || a.brace6 || a.defending)) {
    drawAnchorGlyph(r, a.cx - 3, a.top - 11 - bob, a.anchor6 ? C.gold : '#cfe0f0');
  }
}
function wrapActor(A) {
  const draw = A.draw;
  A.draw = function (r, opts) {
    const s = this.engine.scene, gv = s && s.gale6;
    if (!gv || this.dead) return draw.call(this, r, opts);
    const f = this.engine.frame || 0;
    if (this.side === 'enemy' && this.alive) {
      if (this.ward && this.id === 'scribe') drawWard(r, this, f);
      if (this.id === 'gale_engine' && this.bellows6 && !this.ko && !this.dissolve) drawBellows(r, this, f);
    }
    draw.call(this, r, opts);
    if (!this.alive || this.ko) return;
    drawHeadMarks(r, this, gv, f);
  };
}

// ---------------------------------------------------------------------------------------------------- the timeline
/** The displayed index of the Gust's slot (1 = after the actor on turn) and whether it falls beyond the rail. */
function markAt(scene) {
  const gv = scene.gale6, order = scene.timeline || [];
  let at = Math.max(1, gv.gustIn | 0), beyond = false;
  if (at >= TL.slots) { at = TL.slots - 1; beyond = true; }
  return { at: Math.min(at, order.length), beyond };
}
const slotX = (i, at) => timelineSlotX(i >= at ? i + 1 : i);
/** The timeline with the Gust's marker slot in it (and a flying head's slot left empty), while the help and the timeline draw. */
function swapTimeline(scene) {
  const gv = scene.gale6, { at, beyond } = markAt(scene);
  const flying = new Set(gv.slides.filter((s) => s.t < s.frames).map((s) => `${s.uid}@${s.to}`));
  const tl = (scene.timeline || []).map((row, i) => (flying.has(`${row.uid}@${i}`) ? { ...row, uid: GHOST } : row));
  tl.splice(at, 0, { uid: MARK_UID });
  const marker = { uid: MARK_UID, id: MARK_UID, side: 'marker', alive: true, statuses: {}, tlMark: (r, x, y, f) => drawMarker(scene, r, x, y, f, beyond) };
  const saved = { timeline: scene.timeline, actors: scene.actors, preview: null, at };
  const pv = scene.menu && scene.menu.preview;
  if (pv && Number.isFinite(pv.landing) && pv.landing >= at && pv.landing < TL.slots) { saved.preview = [pv, pv.landing]; pv.landing += 1; }
  scene.timeline = tl;
  scene.actors = new Map(scene.actors);
  scene.actors.set(MARK_UID, marker);
  scene._gale6Swap = saved;
}
function unswap(scene, r) {
  const s = scene._gale6Swap;
  if (!s) return;
  scene._gale6Swap = null;
  scene.timeline = s.timeline;
  scene.actors = s.actors;
  if (s.preview) s.preview[0].landing = s.preview[1];
  if (r && scene.gale6) { drawGauge(scene, r, s.at); drawSlides(scene, r, s.at); }
}
/** The Gust's slot: the white spiral on a dark ring; a pinned Rewrite puts a red quill on it (Full Blast: a red star). */
export function drawMarker(scene, r, sx, sy, frame, beyond) {
  const gv = scene.gale6;
  if (!gv) return;
  const pin = gv.pinned;
  const back = pin ? '#3a0c14' : INK;
  r.rect(sx + 1, sy, 16, 18, back); r.rect(sx, sy + 1, 18, 16, back);
  if (pin) { r.strokeRect(sx, sy, 18, 18, '#ff3b3b'); r.strokeRect(sx + 1, sy + 1, 16, 16, '#b81e2a'); }
  ringTile(r, sx + 2, sy + 2, pin ? '#ff8a7a' : '#cfe8ff');
  drawGustDisc(r, sx + 3, sy + 3);
  if (pin) {
    const on = stillHud(r) || (frame >> 3) % 3 !== 2;
    if (pin.skill === 'full_blast') drawRedStar(r, sx + 11, sy - 3 + (on ? 0 : 1));
    else drawQuill(r, sx + 11, sy - 4 + (on ? 0 : 1));
  }
  if (beyond) { r.rect(sx + 14, sy + 12, 5, 7, INK); r.text('+', sx + 15, sy + 10, { color: 'gold', shadow: false }); }
}
/** The wind gauge under the timeline's head: a pip per action of the Gust's length, the spent ones lit; brass while the
 * bellows run (the shorter count). A thin line joins it to the Gust's slot. */
export function drawGauge(scene, r, at) {
  const gv = scene.gale6;
  const every = Math.max(1, gv.every | 0), left = Math.max(0, Math.min(every, gv.gustIn | 0));
  const brass = every < GUST_EVERY;
  const x = timelineSlotX(0) + 2, y = TL.y + 19, w = 16 + every * 5 + 2;
  const still = stillHud(r);   // Reduce motion (#82): a changed gauge's ring is white while it shows, the next pip lit
  const ring = gv.flash > 0 && (still || (gv.flash >> 2) % 2) ? '#ffffff' : brass ? '#e0a040' : '#cfe8ff';
  const markX = timelineSlotX(at) + 9;   // the marker's centre
  if (markX > x + w + 2) { r.rect(x + w, y + 6, markX - x - w, 3, INK); r.rect(x + w, y + 7, markX - x - w, 1, ring); r.rect(markX - 1, TL.y + 18, 3, y + 9 - TL.y - 18, INK); r.rect(markX, TL.y + 18, 1, y + 8 - TL.y - 18, ring); }
  r.rect(x + 1, y, w - 2, 14, INK); r.rect(x, y + 1, w, 12, INK);
  r.strokeRect(x + 1, y + 1, w - 2, 12, ring);
  // a small swirl: the disc's top-left quarter, enough to say "wind"
  blit(r, ['.www..', 'wssww.', 'swwssw', 'swssws', 'swwwsw', '.ssss.'], x + 4, y + 4, SPIRAL);
  const pulse = still || (scene.frame >> 4) % 2 === 0;
  for (let i = 0; i < every; i++) {
    const px = x + 13 + i * 5, spent = i < every - left, next = i === every - left;
    r.rect(px, y + 4, 3, 6, spent ? (brass ? '#f9d77a' : '#cfe8ff') : next && left === 1 && pulse ? '#ffffff' : '#3a3458');
  }
}
/** Each head the Gust moved, in flight from its old slot to its new one with a streak behind it. */
function drawSlides(scene, r, at) {
  const gv = scene.gale6;
  for (const s of gv.slides) {
    if (s.t >= s.frames) continue;
    const a = scene.actor(s.uid);
    if (!a) continue;
    const k = 1 - (1 - s.t / s.frames) ** 2;
    const x0 = s.from >= TL.slots ? timelineSlotX(TL.slots - 1) + 22 : slotX(s.from, at);
    const x1 = s.to >= TL.slots ? timelineSlotX(TL.slots - 1) + 22 : slotX(s.to, at);
    const x = Math.round(x0 + (x1 - x0) * k), y = TL.y;
    const col = s.back ? '#ffffff' : '#8fd0ff';
    const tail = Math.round((x1 - x0) * Math.min(k, 0.6));
    if (tail) {
      const tx = tail > 0 ? x - tail : x + 18;
      r.withAlpha(0.85 * (1 - s.t / s.frames), () => { r.rect(tx, y + 5, Math.abs(tail), 1, col); r.rect(tx, y + 12, Math.abs(tail), 1, col); r.rect(tx + (tail > 0 ? 4 : 0), y + 8, Math.abs(tail) - 4, 1, '#9fb4cc'); });
    }
    const fade = x1 > timelineSlotX(TL.slots - 1) + 18 ? 1 - k : 1;
    r.withAlpha(fade, () => {
      r.rect(x + 1, y + 1, 16, 16, INK);
      r.strokeRect(x, y, 18, 18, col);
      drawHead(r, a, x + 3, y + 3);
    });
  }
}

/** Over each Aloft-wind foe's weakness row (drawn this frame): the feather in its reserved slot, white while it rides. */
function drawAloftRows(scene, r) {
  const gv = scene.gale6, rows = scene._gale6Rows;
  if (!gv || !rows) return;
  for (const [uid, p] of rows) {
    const a = scene.actor(uid);
    if (!a || a.dead || !p || !p.know || p.know.reflect !== ALOFT_REFLECT) continue;
    const ex = p.rect.x + 15, y = p.rect.y;
    r.rect(ex + 1, y, 12, 12, '#2a2346');
    drawAloftBadge(r, ex + 2, y + 1, !a.aloft6);
  }
}

// ---------------------------------------------------------------------------------------------------- the storm stages
const lumaHex = (h) => { const [rr, g, b] = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255); return 0.2126 * rr + 0.7152 * g + 0.0722 * b; };
/** The json of a stage's art (E6-tiles' rain, lightning and grades), or null. */
function stageMeta(engine, key) {
  const rec = BACKDROPS[key];
  try { if (rec && engine.assets.has(rec.asset)) { const a = engine.assets.atlas(rec.asset); return (a && a.meta) || null; } } catch (e) { return null; }
  return null;
}
/** The storm view of a battle on a storm stage: rain, lightning and (the Eyrie) the clear grade to fade to. */
function initWeather(scene) {
  const bl = scene.backdropLayer, key = bl && bl.key;
  scene.wx6 = null;
  if (!STORM.at[key]) return;
  scene.wx6 = { key, base: null, storm: null, clear: null, k: 0, goal: 0, painted: -1, flashT: -1, next: 150, flashes: 0 };
}
/** The clear copy of a stage (pure, on its RGBA pixels): the clear tone over rows 0..y1, the rest as it is. */
export function paintClear(px, w, h, y1, tone = STORM.clear) {
  const o = [0, 0, 0];
  for (let y = 0; y < Math.min(h, y1); y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4;
    dayTone(px[i] / 255, px[i + 1] / 255, px[i + 2] / 255, tone, o);
    for (let c = 0; c < 3; c++) px[i + c] = Math.round(Math.max(0, Math.min(1, o[c])) * 255);
  }
  return px;
}
function gradeLayers(scene) {
  const wx = scene.wx6, bl = scene.backdropLayer, r = scene.engine.renderer;
  if (!wx || !bl || wx.base === bl || typeof r.createLayer !== 'function') return;
  wx.base = bl;
  wx.storm = null; wx.clear = null; wx.painted = -1;
  if (wx.key !== CLEAR_STAGE) return;
  const storm = r.createLayer(bl.w, bl.h), clear = r.createLayer(bl.w, bl.h);
  storm.ctx.drawImage(bl.canvas, 0, 0);
  clear.ctx.drawImage(bl.canvas, 0, 0);
  const meta = stageMeta(scene.engine, wx.key), g = meta && meta.grades && meta.grades.clear;
  const y1 = Math.max(1, Math.min(bl.h, (g && g.rows && g.rows[1]) || (bl.band && bl.band.y) || 118));
  try {
    const id = clear.ctx.getImageData(0, 0, bl.w, bl.h);
    paintClear(id.data, bl.w, bl.h, y1, (g && g.tone) || STORM.clear);
    clear.ctx.putImageData(id, 0, 0);
  } catch (e) {   // a tainted canvas (file://): a warm lift instead
    clear.ctx.save(); clear.ctx.globalCompositeOperation = 'screen'; clear.ctx.globalAlpha = 0.35; clear.ctx.fillStyle = '#fff1d8';
    clear.ctx.fillRect(0, 0, bl.w, y1); clear.ctx.restore();
  }
  wx.storm = storm; wx.clear = clear;
  paintGrade(scene);
}
function paintGrade(scene) {
  const wx = scene.wx6, bl = scene.backdropLayer;
  if (!wx || !bl || !wx.storm || wx.painted === wx.k) return;
  const g = bl.ctx;
  g.save();
  g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
  g.drawImage(wx.storm.canvas, 0, 0);
  if (wx.k > 0) { g.globalAlpha = wx.k; g.drawImage(wx.clear.canvas, 0, 0); }
  g.restore();
  wx.painted = wx.k;
  if ((wx.k === 0 || wx.k === 1) && scene.engine.renderer.setBackdrop) scene.engine.renderer.setBackdrop(bl.canvas);
}
const glows = new Map();
/** The far-wall flash: a radial glow of the lightning colour, (1 - d)^2 falloff, built once per radius. */
function glowCanvas(r, rad, color) {
  const id = `${rad}:${color}`;
  if (glows.has(id)) return glows.get(id);
  const L = r.createLayer(rad * 2, rad * 2), g = L.ctx;
  const gr = g.createRadialGradient(rad, rad, 0, rad, rad, rad);
  for (let i = 0; i <= 8; i++) { const d = i / 8, a = (1 - d) ** 2; gr.addColorStop(d, `rgba(${[1, 3, 5].map((j) => parseInt(color.slice(j, j + 2), 16)).join(',')},${a.toFixed(3)})`); }
  g.fillStyle = gr; g.fillRect(0, 0, rad * 2, rad * 2);
  glows.set(id, L);
  return L;
}
/** The lightning's strength this frame (0 to 1): rise 3 frames, fall 9 (STORM.lightning). */
export function flashLevel(t, L = STORM.lightning) {
  if (t < 0) return 0;
  if (t < L.riseFrames) return (t + 1) / L.riseFrames;
  const f = t - L.riseFrames;
  return f < L.fallFrames ? 1 - (f + 1) / L.fallFrames : 0;
}
/** Rain over the sky rows and the soft lightning, under the units (the stage's runtime layers). */
function drawWeather(scene, r) {
  const wx = scene.wx6, bl = scene.backdropLayer;
  if (!wx || !bl) return;
  const meta = stageMeta(scene.engine, wx.key) || {};
  const rain = { ...STORM.rain, ...(meta.rain || {}) }, L = { ...STORM.lightning, ...(meta.lightning || {}) };
  const still = !!scene.engine.settings.reduceMotion;
  const rows = (bl.band && bl.band.y) || 118, alpha = rain.alpha * (1 - wx.k);
  const g = r.ctx;
  if (alpha > 0.01 && g) {
    const f = still ? 0 : scene.frame, band = 24;
    g.save(); g.globalAlpha = alpha; g.fillStyle = rain.color;
    for (let x0 = 0, i = 0; x0 < 384 + 40; x0 += rain.spacing, i++) {
      for (let b = 0; b * band < rows + band; b++) {
        const hsh = ((i * 73856093) ^ (b * 19349663)) >>> 0;
        const y = ((b * band + (hsh % band) + f * rain.speed) % (rows + band)) - band;
        const x = x0 - 30 + (hsh >> 8) % rain.spacing + Math.round(y * rain.slope);
        for (let d = 0; d < rain.length; d++) { const yy = y + d; if (yy >= 0 && yy < rows) g.fillRect(Math.round(x + d * rain.slope), yy, 1, 1); }
      }
    }
    g.restore();
  }
  // lightning: storm grade only, at most once in minIntervalMs, never under reduce motion
  if (still || wx.k > 0.5 || !g) return;
  const lv = flashLevel(wx.flashT, L);
  if (lv <= 0) return;
  const at = (meta.lightning && meta.lightning.at) || STORM.at[wx.key];
  const [cx, cy, rad] = at;
  const peak = Math.min(1, L.peakLumaRise / Math.max(0.01, lumaHex(L.color)));
  const glow = glowCanvas(r, rad, L.color);
  g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = peak * lv;
  g.drawImage(glow.canvas, cx - rad, cy - rad);
  g.restore();
}
function tickWeather(scene) {
  const wx = scene.wx6;
  if (!wx) return;
  gradeLayers(scene);
  if (wx.k !== wx.goal) {
    const step = Math.max(1, scene.speed || 1) / FADE_FRAMES;
    wx.k = wx.k < wx.goal ? Math.min(wx.goal, wx.k + step) : Math.max(wx.goal, wx.k - step);
    paintGrade(scene);
  }
  if (wx.flashT >= 0) { wx.flashT++; if (wx.flashT > STORM.lightning.riseFrames + STORM.lightning.fallFrames) wx.flashT = -1; }
  if (--wx.next <= 0) {
    // the next flash 4 to 8 seconds on (60 frames a second): never more often than once in 4 s
    wx.flashes++;
    wx.flashT = 0;
    wx.next = Math.round(STORM.lightning.minIntervalMs * 0.06) + ((wx.flashes * 2654435761) >>> 0) % 240;
  }
}

// ---------------------------------------------------------------------------------------------------- the scene
/** The battle as the menu reads it when a skill is gated: every gated row back in its list, greyed with the reason. Else null. */
export function gatedView(b) {
  return b && b.state && b.state.gated ? Object.create(b, { commands: { value: (u) => gateCommands(b, u, b.commands(u)) } }) : null;
}
/** The Gale view of a battle (presentation; it follows the ops, a beat behind the rules). */
function initGale(scene) {
  const b = scene.b, S = b && b.state && b.state.gale;
  scene.gale6 = null;
  scene.b6view = gatedView(b);
  if (!S) return;
  scene.gale6 = { gustIn: S.gustIn, every: S.every, pinned: S.pinned ? { source: S.pinned.source, skill: S.pinned.skill } : null,
    slides: [], pending: new Map(), flash: 0, hinted: false };
  for (const u of b.units()) {
    const a = scene.actor(u.uid);
    if (!a) continue;
    if (u.side === 'enemy') { a.aloft6 = !!(S.aloft && S.aloft[u.uid]); a.bellows6 = u.id === 'gale_engine' && S.every < GUST_EVERY; }
    else { a.anchor6 = !!S.anchored; a.brace6 = !!(S.ballast && S.ballast[u.uid]); }
  }
}
/** "... When the wind gusts, you go last." and who can answer it: Bram only when his turn comes before the Gust and he can
 * anchor (PLAYTEST_REVIEW_7 item 2), else what still helps (Defend against a blast, a Ballast Stone against a Rewrite). */
export function answerLine(scene) {
  const b = scene.b, S = b && b.state && b.state.gale;
  if (!S || !S.pinned) return '';
  if (bramAnswers(b)) return ` {c:gold}${T.can_anchor}{/c}`;
  if (S.pinned.skill === 'full_blast') return ' {c:cyan}Defend to brace.{/c}';
  return (b.state.inventory || {}).ballast_stone > 0 ? ' {c:cyan}A Ballast Stone braces.{/c}' : '';
}
/** Once per save: Bram under Anchor's MP in a fight with a move to pin (the Engine, the Scribe). */
function lowMpHint(scene, op) {
  const gv = scene.gale6, g = scene.engine.game;
  if (!gv || gv.hinted || op.uid !== 'bram' || !(op.mp < LOW_MP)) return;
  const bram = scene.b.unit('bram');
  if (!bram || !bram.alive || !(bram.skills || []).includes(ANCHOR)) return;
  if (!scene.b.units().some((u) => u.id === 'scribe' || u.id === 'gale_engine')) return;
  if (g && g.flags && g.flags[HINT_FLAG]) return;
  gv.hinted = true;
  const st = scene.b.state;
  if (st && !st.hint) st.hint = HINT_FLAG;   // rewards.js sets the flag from the battle's result (the Oath's once-per-save hint)
  else if (g && g.flags) g.flags[HINT_FLAG] = true;
  const at = scene.ops.length && scene.ops[scene.ops.length - 1].op === 'end' ? scene.ops.length - 1 : scene.ops.length;
  scene.ops.splice(Math.max(scene.opIndex, at), 0, { op: 'help', text: T.low_mp, color: 'cyan' }, { op: 'wait', frames: 48 });
}
const firstAt = (order, uid, from) => { for (let i = from; i < order.length; i++) if (order[i] && order[i].uid === uid) return i; return -1; };
/** The Gust fell: the timeline jumps to its new order, and every unit it moved (and a pinned move's owner) slides there. */
function gustSlides(scene) {
  const gv = scene.gale6, old = scene.timeline || [], next = scene.b.timeline(8);
  const moved = new Set(gv.pending.keys());
  if (gv.pinned) { moved.add(gv.pinned.source); for (const a of scene.party()) moved.add(a.uid); }
  gv.pending = new Map();
  gv.slides = [];
  if (!scene.fast) {
    for (const uid of moved) {
      const from = firstAt(old, uid, 1), to0 = firstAt(next, uid, 0), to = to0 < 0 ? TL.slots : to0;
      if (from < 0 || from === to) continue;
      gv.slides.push({ uid, from, to, back: to > from, t: 0, frames: SLIDE_FRAMES });
    }
  }
  scene.timeline = next;
}

function wrapScene(B) {
  const base = { enter: B.enter, update: B.update, draw: B.draw, runOp: B.runOp, planEnemyRows: B.planEnemyRows, drawHelpWindow: B.drawHelpWindow, party: B.party };
  B.enter = function (data) {
    base.enter.call(this, data);
    initGale(this);
    initWeather(this);
    this._gale6Swap = null;
    if (this.wx6) gradeLayers(this);
    if (this.pops && !this.pops.__gale6) {
      const pd = this.pops.draw.bind(this.pops);
      this.pops.draw = (r) => { if (this.gale6) drawAloftRows(this, r); pd(r); };
      this.pops.__gale6 = true;
    }
    if (this.fx && !this.fx.__gale6) {
      const du = this.fx.drawUnder.bind(this.fx);
      this.fx.drawUnder = (r) => { if (this.wx6) drawWeather(this, r); du(r); };
      this.fx.__gale6 = true;
    }
  };
  B.update = function (dt, below) {
    base.update.call(this, dt, below);
    if (this.wx6) tickWeather(this);
    const gv = this.gale6;
    if (!gv) return;
    const sp = Math.max(1, this.speed || 1);
    for (const s of gv.slides) if (s.t < s.frames) s.t = Math.min(s.frames, s.t + sp);
    if (gv.flash > 0) gv.flash--;
    // the answer is re-read while the pin stands: "Bram can anchor." only while it is still true
    for (const t of this.telegraphs.values()) if (t.rewrite) t.text = t.base + answerLine(this);
  };
  B.draw = function (r) {
    if (!this.gale6) return base.draw.call(this, r);
    this._gale6Rows = null;
    this._gale6R = r;
    try { return base.draw.call(this, r); } finally { unswap(this, null); this._gale6R = null; }
  };
  B.drawHelpWindow = function (r) {
    base.drawHelpWindow.call(this, r);
    if (this.gale6 && this._gale6R === r && !this._gale6Swap) swapTimeline(this);
  };
  // the call that follows the timeline in draw() (the party status window's list): the marker leaves, the gauge and slides draw
  B.party = function () {
    if (this._gale6Swap) unswap(this, this._gale6R);
    return base.party.call(this);
  };
  B.planEnemyRows = function (uids, touch, cwNow, helpBottom, scoreAll) {
    if (!this.gale6) return base.planEnemyRows.call(this, uids, touch, cwNow, helpBottom, scoreAll);
    const b = this.b, know = b.knowledge;
    const aloft = new Set((uids || []).filter((u) => windOf(b.unit(u)) === 'aloft'));
    b.knowledge = (uid) => { const k = know.call(b, uid); return aloft.has(uid) && k && !k.reflect ? { ...k, reflect: ALOFT_REFLECT } : k; };
    try {
      const plan = steadyRows(base.planEnemyRows.call(this, uids, touch, cwNow, helpBottom, scoreAll),
        { actors: [...this.actors.values()], touch, helpBottom, cw: cwNow, docked: !!helpDock() });
      this._gale6Rows = plan;
      return plan;
    } finally { b.knowledge = know; }
  };
  B.runOp = function (op) {
    const gv = this.gale6;
    switch (op.op) {
      case 'gale6': if (gv) { if (gv.every !== op.every) gv.flash = 30; gv.gustIn = op.gustIn; gv.every = op.every; } return false;
      case 'gale6Aloft': { const a = this.actor(op.uid); if (a) { a.aloft6 = !!op.on; this.rowShow.set(op.uid, 120); } return false; }
      case 'gale6Anchor': for (const uid of op.uids || []) { const a = this.actor(uid); if (a) a.anchor6 = !!op.on; } return false;
      case 'gale6Brace': { const a = this.actor(op.uid); if (a) a.brace6 = !!op.on; return false; }
      case 'gale6Push': {
        if (gv) gv.pending.set(op.uid, op.amount);
        const a = this.actor(op.uid);
        if (a && !this.fast && op.reason === 'gust') this.fxAt('gale6_push', op.uid, { dir: op.amount > 0 ? 1 : -1, anchor: a.side === 'party' && op.amount < 0 });
        return false;
      }
      case 'gale6Gust': if (gv) gustSlides(this); return false;
      case 'gale6Pin': if (gv) { gv.pinned = { source: op.source, skill: op.skill }; if (Number.isFinite(op.gustIn)) gv.gustIn = op.gustIn; } return false;
      case 'gale6Unpin': if (gv) gv.pinned = null; return false;
      case 'gale6Bellows': { const a = this.actor(op.uid); if (a) a.bellows6 = !!op.on; return false; }
      case 'gale6Clear': if (this.wx6 && this.wx6.key === CLEAR_STAGE) { this.wx6.goal = 1; if (this.fast) { this.wx6.k = 1; paintGrade(this); } } return false;
      case 'gale6Quill': {
        if (this.fast || !gv) return false;
        const { at } = markAt(this);
        this.fxAt('gale6_quill', op.uid, { toX: timelineSlotX(at) + 9, toY: TL.y + 9 });
        return false;
      }
      default: break;
    }
    if (gv && op.op === 'help' && op.rewrite) op = { ...op, text: op.text + answerLine(this) };
    const res = base.runOp.call(this, op);
    if (gv && op.op === 'telegraph' && op.rewrite) { const t = this.telegraphs.get(op.actor); if (t) { t.rewrite = true; t.base = op.text; t.text = op.text + answerLine(this); } }
    if (gv && op.op === 'summon') {
      const a = this.actor(op.uid), u = this.unit(op.uid);
      // the Engine's sprites ride out into the same two spots as the ward's lights (between the boss and the party, clear of both)
      const n = u && u.id === 'gale_sprite' && this.b.units().some((x) => x.id === 'gale_engine')
        ? [...this.actors.values()].filter((x) => x.id === 'gale_sprite' && x.uid !== op.uid).length : -1;
      const spot = u && (WARD_SPOTS[u.id] || (n >= 0 ? Object.values(WARD_SPOTS)[n % 2] : null));
      if (a && spot) { a.homeX = a.x = spot.x; a.homeY = a.y = spot.y; a.backRow = false; a.rowBeside = spot === WARD_SPOTS.false_beacon; }
      const S = this.b.state.gale;
      if (a && u) a.aloft6 = !!(S && S.aloft && S.aloft[u.uid]) || (windOf(u) === 'aloft' && !u.broken);
    }
    if (gv && op.op === 'mp') lowMpHint(this, op);
    return res;
  };
}

// ---------------------------------------------------------------------------------------------------- the menu
/** Anchor's row draws its icon; the gated rows read the battle through the scene's view; Anchor floats while a move is pinned. */
function wrapMenu(M) {
  const openSub = M.openSub, sig = M.sig, open = M.open;
  // E6-fixes A3: in a Gale battle the Defend row says it braces
  M.open = function (unit) {
    const res = open.call(this, unit);
    const items = this.scene && this.scene.gale6 && this.root ? this.root.items || [] : [];
    const d = items.find((it) => it.id === 'defend' && !it.disabled);
    if (d) { d.help = T.defend_help; this.syncHelp(); }
    return res;
  };
  const own = Object.getOwnPropertyDescriptor(M, 'b');
  Object.defineProperty(M, 'b', { configurable: true, get() { const s = this.scene; return (s && s.b6view) || (own && own.get ? own.get.call(this) : s.b); } });
  M.openSub = function (cmd) {
    const ok = openSub.call(this, cmd);
    const L = this.sub, it = ok && L && L.items.find((x) => x.id === ANCHOR);
    if (it) {
      if (!L.icons) { L.icons = true; L.textX = 15; }
      it.draw = (r, rr, dim, alpha) => r.withAlpha(alpha * (dim ? 0.5 : 1), () => drawAnchorIcon(r, rr.x + L.iconX, rr.y + L.textDy));
    }
    return ok;
  };
  // the Episode 3 Oath row comes first in SIGNATURE_TECHS: while a move is pinned to the Gust, Anchor is Bram's row
  M.sig = function (u) {
    const hit = sig.call(this, u);
    if (!u || u.id !== 'bram' || (hit && hit.skill === ANCHOR)) return hit;
    const t = this.scene && this.scene.telegraphs;
    if (!t || ![...t.values()].some((x) => x.rewrite || isRewrite(x.skill))) return hit;
    const tech = this.b.commands(u).find((c) => c.id === 'tech');
    return tech && (tech.list || []).some((e) => e.skill === ANCHOR) ? ANCHOR_SIG : hit;
  };
}

// ---------------------------------------------------------------------------------------------------- the field
/** vex_falls: s.rope(fromMark, toMark) draws a 2 px pale line (E6-fixes A6: 1 px was lost at phone scale) from Bram's hands to
 * Vex's (paying out over 12 frames; a mark or an [x, y] cell); s.rope(null)
 * clears it. A cutscene draw, not a field system: it rides the field's glass flare pass (world space, over the actors). */
function ropeEnd(F, tile) {
  const a = (F.actors || []).find((x) => x && x.visible !== false && x.tx === tile[0] && x.ty === tile[1]);
  return a ? [a.feetX, a.feetY - 9] : [tile[0] * TILE + 8, tile[1] * TILE + 6];
}
export function drawRope(r, F) {
  const R = F.rope6;
  if (!R) return;
  if (R.t < 12) R.t++;
  const [x0, y0] = ropeEnd(F, R.from), [x1, y1] = ropeEnd(F, R.to);
  const k = R.t / 12, ex = x0 + (x1 - x0) * k, ey = y0 + (y1 - y0) * k;
  const sag = Math.min(6, Math.hypot(x1 - x0, y1 - y0) * 0.18) * k;
  const n = Math.max(2, Math.ceil(Math.hypot(ex - x0, ey - y0)));
  for (let i = 0; i <= n; i++) {
    const s = i / n, x = Math.round(x0 + (ex - x0) * s), y = Math.round(y0 + (ey - y0) * s + sag * 4 * s * (1 - s));
    r.rect(x, y + 2, 2, 1, '#3a2a1a');
    r.rect(x, y, 2, 2, '#f2e2b4');
  }
}
function hookRope(F) {
  const gl = F && F.glass;
  if (!gl || gl.__rope6 || typeof gl.drawFlares !== 'function') return;
  const df = gl.drawFlares;
  gl.drawFlares = function (r, t) { df.call(this, r, t); if (F.rope6) drawRope(r, F); };
  gl.__rope6 = true;
}
function addRope(cs) {
  const api = cs && cs.api;
  if (!api || api.rope) return;
  api.rope = async (from, to) => {
    const F = cs.field;
    if (!F || cs.dead) return;
    if (!from) { F.rope6 = null; return; }
    const a = cs.tileOf(from), b = cs.tileOf(to);
    if (!a || !b) return;
    F.rope6 = { from: a, to: b, t: 0 };
    hookRope(F);
    await cs.frames(12);
  };
}
function wrapCutscene(Cs) {
  const run = Cs.run;
  Cs.run = async function (id) {
    addRope(this);
    try { return await run.call(this, id); } finally { if (this.field) this.field.rope6 = null; }   // a rope never outlives its scene
  };
}
/** Key items with a `descAfter: { flag, desc }` (the Sky Compass) read the second description once the flag is set. */
export function itemDesc(def, flags) { return def && def.descAfter && flags && flags[def.descAfter.flag] ? def.descAfter.desc : def ? def.desc0 ?? def.desc : ''; }
function descAfterItems() {
  for (const def of Object.values(KEY_ITEMS)) {
    if (!def || !def.descAfter || Object.prototype.hasOwnProperty.call(def, 'desc0')) continue;
    def.desc0 = def.desc;
    Object.defineProperty(def, 'desc', { configurable: true, enumerable: true,
      get() { const E = globalThis.LQ_ENGINE, g = E && E.game; return itemDesc(this, g && g.flags); } });
  }
}

let done = false;
/** Install everything above. Safe to call twice. Returns what went in. */
export function register() {
  descAfterItems();
  if (done) return ['already'];
  for (const [k, v] of Object.entries(EP6_BACKDROPS)) if (!BACKDROPS[k]) BACKDROPS[k] = v;
  for (const [k, v] of Object.entries(EP6_BOSS_CARDS)) if (!BOSS_CARD[k]) BOSS_CARD[k] = v;
  if (!SIGNATURE_TECHS.some((t) => t.skill === ANCHOR)) SIGNATURE_TECHS.push(ANCHOR_SIG);
  for (const [k, fn] of Object.entries(EP6_FX)) if (!BattleFx.prototype[k]) BattleFx.prototype[k] = fn;
  wrapPlanner(Planner.prototype);
  wrapActor(Actor.prototype);
  wrapScene(BattleScene.prototype);
  wrapMenu(CommandMenu.prototype);
  wrapCutscene(Cutscene.prototype);
  done = true;
  return ['backdrops', 'cards', 'signature', 'fx', 'planner', 'actor', 'scene', 'menu', 'cutscene', 'items'];
}
export default register;
