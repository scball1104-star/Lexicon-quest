// Episode 7 on the battle stage (E7-scene-ui; docs/EPISODE7_PLAN.md 5.2, 6.3 to 6.5, 9.3; docs/BATTLE.md 16). Pack code: index.js
// runs register() last in its ORDER. No core file changes: this module adds to the tables the core exports (BACKDROPS, BOSS_CARD,
// SIGNATURE_TECHS, HEAD_BOX, BattleFx) and wraps prototype methods of Planner, Actor, CommandMenu, BattleScene and Cutscene that pass
// everything else straight on. Nothing here runs in a battle without Rime (Episodes 1 to 6, the cave and Fine Print draw exactly as
// before): every wrapper checks for Rime's own events or the scene's `rime7` view first.
//
//   BACKDROPS   ep7_battle_road, ep7_battle_vault, ep7_battle_hall, ep7_battle_sanctum, ep7_battle_stillheart (E7-tiles' art). The
//               Sanctum and the Stillheart carry the slow aurora layer from their json (3 frames, one every 30, under +0.05 luma a
//               step, off under reduce motion); the Stillheart's thaw grade (its json grades.thaw.tone through Episode 5's dayTone)
//               cross-fades in over 30 frames when the Frozen Ward thaws
//   BOSS_CARD   THE PALE LANTERN / Keeper of Borrowed Light, THE WHITE PHANTOM / Keeper of the Stillheart; the arc line (text.js
//               EP7_ARC_LINES) is the help window's first line while the card shows
//   Rime        three snowflake pips (7 x 7, 1 px ink outline) left of each name in the party window, the name frosting a third at a
//               time (drawRimeName, exported: the field's whiteout draws the same picture), Frozen: a crack across the name, the word
//               FROZEN floats off the member, the member's timeline heads frost over; the pip sound by the pips reached (rime_bite,
//               rime_bite_2, rime_bite_3); the Defend row's help "Shake off the cold."
//   SIGNATURE   { unit: 'hero', flag: 'farewell', skill: 'call_name' }: while a Farewell or Borrowed Light is pinned the hero opens on
//               Tech, Call first, in gold (ahead of Episode 4's Answer row), with its 12 x 12 icon; the ally cursor opens on the pin's
//               target, and reaches a Stilled ally (rules.js lists them for a canTargetKept skill)
//   The pin     a pale ribbon from its owner to the target on the stage and under the timeline, the target's name in frost there,
//               farewell_read; "{hero} can call her." only while it is true (ai.js heroAnswers); Call breaks it with ice cracking
//               off the target, farewell_break and one line, the action name printed once
//   Stilled     the member in a pale ice shell at their place, a snowflake on their timeline heads, their skipped turn worded as
//               Episode 7's ("Mira is Stilled."), the shell shattering when they come back
//   The bosses  the Lantern's cold lamp glow and its Wisps drifting out of the light; the Phantom's three looks (forwarded on
//               `phase`) with its row on ONE anchor over the crown in all three, the frozen doors of the Ward behind it that thaw,
//               the Closed Gate and the Lost Letter rising in front-row foe slots with their rows under their own feet
//   Low MP      once per save, the hero under Call's 12 MP against a pin boss: "Keep something back to call us."
//   Field       the cutscene's s.frostBlot(who), s.frostNames(ids, level) and s.actorAlpha(id, alpha, frames) (E7-story's whiteout and
//               memories call them only when present)
//   Items       the White Road letter's second description (ep7/items.js descAfter) through Episode 6's descAfter reader

import { BACKDROPS, BOSS_CARD, BattleScene } from '../../scenes/battle.js';
import { Planner, FRAMES } from '../../battle/scene/animator.js';
import { Actor } from '../../battle/scene/actors.js';
import { stillHud, steadyFrame } from '../../battle/scene/hud.js';
import { SIGNATURE_TECHS, CommandMenu } from '../../battle/scene/menu.js';
import { TL, timelineSlotX, HELP_WIN, HELP_LINE, HELP_LINES_MAX, STATUS_WIN, ENEMY_ROW_H, CMD_WIN_TOUCH, W, H, HEAD_BOX, statusRow,
  helpDock } from '../../battle/scene/layout.js';
import { drawWindow } from '../../ui/window.js';
import { BattleFx, C } from '../../battle/fx.js';
import { Cutscene } from '../../world/cutscene.js';
import { SKILLS } from '../skills.js';
import { EP7_BOSS_CARDS, EP7_ARC_LINES, EP7_BATTLE_TEXT as T } from './text.js';
import { heroAnswers } from './ai.js';
import { RIME_MAX, CALL, HERO } from './rime.js';
import { paintClear, register as registerEp6Scene } from '../ep6/scene.js';

export const EP7_BACKDROPS = {
  ep7_battle_road: { asset: 'ep7_battle_road', cell: 6, bright: 1.0, tint: null },
  ep7_battle_vault: { asset: 'ep7_battle_vault', cell: 6, bright: 0.9, tint: 'rgba(40,50,100,0.18)' },
  ep7_battle_hall: { asset: 'ep7_battle_hall', cell: 6, bright: 0.6, tint: 'rgba(20,24,60,0.4)' },
  ep7_battle_sanctum: { asset: 'ep7_battle_sanctum', cell: 6, bright: 0.7, tint: 'rgba(40,30,90,0.3)' },
  ep7_battle_stillheart: { asset: 'ep7_battle_stillheart', cell: 6, bright: 0.7, tint: 'rgba(40,30,90,0.3)' },
};
/** The aurora layer and the thaw grade (E7-tiles' json `aurora` and `grades.thaw`; these are its values, the json wins). */
export const AURORA = { color: '#5fd3a2', color2: '#9062c3', alpha: 0.16, frames: 3, everyFrames: 30, y: 34, amp: 9, period: 46, phase: 0.45,
  width: 14, rows: [0, 118] };
export const AURORA_STAGES = new Set(['ep7_battle_sanctum', 'ep7_battle_stillheart']);
export const THAW_STAGE = 'ep7_battle_stillheart';
export const THAW = { tone: { lift: 1.9, warm: 0.0, chroma: 1.15, cast: 0.03, hue: 0.95 }, rows: [0, 118] };
export const THAW_FRAMES = 30;
export const PIN_KEY = '#farewell';            // the scene's telegraph key for a pin: `${source}#farewell`
export const LOW_MP = 12;                      // Call's cost
export const HINT_FLAG = 'hint_call_mp';
export const CALL_SIG = { unit: HERO, flag: 'farewell', skill: CALL };
export const PIN_SKILLS = new Set(['farewell', 'borrowed_light']);
export const PHANTOM_LOOK = { outer_frost: 'white_phantom', frozen_ward: 'white_phantom_ward', thawlight: 'white_phantom_thaw' };
/** One HUD anchor in all three looks (E7-sprites' ep7_bosses_battle.json `hud`): the crown, 10 px right of the bottom-centre,
 * 126 px up. The Phantom's row sits over it, its left edge ROW_HALF left of the crown, whatever the look's width. */
export const CROWN = { dx: 10, dy: -126 };
export const ROW_HALF = 37;
/** The Ward's two adds in front-row foe slots (CRITIQUE_8 item 1): feet on the front baseline (146), so each stands in front of the
 * Phantom's cloak and its head stays under the help dock (y 85) so the dock holds; each row in its own feet band, the core's
 * desktop rule for a grounded foe (the party window starts at 152), the two rows ROW_GAP apart; the Letter 27 px from the hero. */
export const WARD_SPOTS = { closed_gate: { x: 162, y: 146 }, lost_letter: { x: 228, y: 146 } };
/** The Lantern's two Snow Wisps, out of its light into the open stage (never against the party: CRITIQUE_8 item 1's Compass):
 * one up the hall behind, one on the front line, so their rows (each under its feet) never share a line. */
export const WISP_SPOTS = [{ x: 170, y: 118 }, { x: 236, y: 146 }];
export const ROW_GAP = 6;
const HELP_TALLEST = HELP_WIN.y + HELP_WIN.h + (HELP_LINES_MAX - 1) * HELP_LINE;
const PARTY_LEFT = 274;                        // the hero's sprite at slot 290 (32 px wide frames, 24 px of body)
const PIP_X = STATUS_WIN.x + 5, PIP_PITCH = 7, NAME_X = STATUS_WIN.x + 28;   // pips at 137, 144, 151 (7 x 7 each, touching); the name at 160

// ---------------------------------------------------------------------------------------------------- pixel art
const INK = '#14101e';
// 5 x 5 snowflake (the pip's body; blitOutlined adds the 1 px ink outline: 7 x 7 in all)
const FLAKE5 = ['s.s.s', '.scs.', 'scccs', '.scs.', 's.s.s'];
export const PIP_LIT = { s: '#cfeaff', c: '#ffffff' };
export const PIP_OFF = { s: '#3c4a72', c: '#56669a' };
const PIP_FROZEN = { s: '#9fd8ff', c: '#ffffff' };
export const FROST = '#a8dcff';                // a frosted letter: ice blue (luma 0.81 over a box near 0.1), apart from white
export const FROST_STILL = '#b8dcff';
// 12 x 12: Call's menu icon, a small open mouth of light with the sound leaving it
const CALL_ICON = ['............', '.......g....', '..ggg...g...', '.gwwwg...g..', 'gwwyywg..g..', 'gwy..yg..g..',
  'gwy..yg..g..', 'gwwyywg..g..', '.gwwwg...g..', '..ggg...g...', '.......g....', '............'];
const CALL_PAL = { g: '#f9d77a', w: '#fff7d6', y: '#eba14d' };

function blit(r, rows, x, y, pal) {
  for (let j = 0; j < rows.length; j++) for (let i = 0; i < rows[j].length; i++) { const c = pal[rows[j][i]]; if (c) r.rect(x + i, y + j, 1, 1, c); }
}
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
/** One Rime pip at (x, y), 7 x 7 with its outline: lit (frosted), dark, or the Frozen blue. */
export function drawPip(r, x, y, lit, frozen = false) { blitOutlined(r, FLAKE5, x + 1, y + 1, frozen ? PIP_FROZEN : lit ? PIP_LIT : PIP_OFF); }
/** The three pips of a member with `rime` (0 to 3) left to right from (x, y); `pop`: the newest lit pip flashes white. */
export function drawRimePips(r, x, y, rime, { frozen = false, pop = false } = {}) {
  for (let i = 0; i < RIME_MAX; i++) {
    const lit = frozen || i < rime;
    drawPip(r, x + i * PIP_PITCH, y, lit, frozen);
    if (pop && i === rime - 1) r.rect(x + i * PIP_PITCH + 3, y + 3, 1, 1, '#ffffff');
  }
}
export function drawCallIcon(r, x, y) { blitOutlined(r, CALL_ICON, x, y, CALL_PAL); }
/** How many of `name`'s letters a Rime of `rime` frosts (a third at a time, at least one letter per pip). */
export function frostedLetters(name, rime) { const n = String(name || '').length; return rime >= RIME_MAX ? n : Math.min(n, Math.ceil((n * Math.max(0, rime)) / RIME_MAX)); }
/**
 * A party name in Rime (the battle's party window and the field's whiteout draw the same picture): the name in `color`, its first
 * third / two thirds / all of its letters in frost (FROST, with a few white crystals on their top edge), and when `frozen` a crack
 * across it; `stilled` draws the whole name in a deeper ice. Returns the name's width. opts.frame: the crystals' glint.
 */
export function drawRimeName(r, x, y, name, rime, opts = {}) {
  const s = String(name || '');
  const color = opts.color || 'white';
  r.text(s, x, y, { color: opts.stilled ? FROST_STILL : color });
  const w = r.measure(s);
  const n = opts.stilled || opts.frozen ? s.length : frostedLetters(s, rime);
  if (n > 0 && !opts.stilled) {
    // the frosted letters in ice, a crust of rime under them (a pale line with white glints; never a mark over a letter)
    const pre = s.slice(0, n);
    r.text(pre, x, y, { color: FROST });
    const pw = r.measure(pre);
    r.rect(x, y + 9, pw, 1, '#5a7ab0');
    const f = steadyFrame(r, opts.frame || 0);
    for (let i = 0; i < pw; i++) if (((i + (f >> 5)) % 4) === 0) r.rect(x + i, y + 9, 1, 1, '#ffffff');
  }
  if (opts.frozen) {
    // the crack: a thin white zigzag along the top of the lower-case letters with breaks in it (through the capitals' tops only, so
    // the name stays readable at phone scale)
    const zig = [0, -1, -1, 0, 1, 1];
    for (let i = 0; i < w; i++) if (i % 7 !== 6) r.rect(x + i, y + 2 + zig[i % 6], 1, 1, '#ffffff');
  }
  return w;
}

// ---------------------------------------------------------------------------------------------------- fx (BattleFx)
const SNOW = ['#ffffff', '#e6f6ff', '#cfeaff', '#9fd8ff'];
const PALE = ['#e8f4ff', '#cfe8ff', '#ffffff'];
const LAMPC = ['#9fd8ff', '#cfeaff', '#6ab3e4', '#ffffff'];
const WARM = ['#f9d77a', '#fff7d6', '#eba14d', '#ffffff'];
export const EP7_FX = {
  /** A cold move frosts a name: snow drifts down round the member, a pale ring at the feet. */
  fx_rime7_frost(o) {
    const { cx, cy } = this.center(o);
    this.particles(cx, cy - 10, 10, { colors: SNOW, dir: Math.PI / 2, spread: 1.4, speed: 0.6, life: 26, drift: 0.5, size: 1, radius: 12, radiusY: 6 });
    this.fx_ring({ ...o, h: 0 }, { color: '#cfeaff', r0: 4, r1: 14, frames: 12, squash: 0.35, layer: 'under' });
  },
  /** Rime shed (Defend, Call, the tea): flakes leave upward, a warm glint. */
  fx_rime7_shed(o) {
    const { cx, cy } = this.center(o);
    this.particles(cx, cy, 10, { colors: [...SNOW, '#fff7d6'], dir: -Math.PI / 2, spread: 1.2, speed: 1.3, life: 20, size: 1, radius: 8, shrink: true });
  },
  /** Frozen: ice plates close over the member with a crack of light, and FROZEN floats off. */
  fx_rime7_frozen(o) {
    const { cx, cy } = this.center(o);
    const hw = Math.max(10, Math.round((o.w || 24) / 2) + 2), hh = Math.round((o.h || 36) / 2) + 2;
    this.add(26, (r, t) => {
      const k = Math.min(1, t / 8), a = t < 18 ? 1 : (26 - t) / 8;
      r.withAlpha(0.45 * a, () => r.ditherEllipse(cx, cy, Math.round(hw * k), Math.round(hh * k), '#cfeaff', 0.5));
      r.withAlpha(a, () => { r.line(cx - hw, cy - 4, cx - 2, cy + 2, '#ffffff'); r.line(cx - 2, cy + 2, cx + 6, cy - 6, '#ffffff'); r.line(cx + 6, cy - 6, cx + hw, cy - 1, '#ffffff'); });
    }, 'top');
    this.add(44, (r, t) => {
      const y = Math.round((o.y || 0) - (o.h || 36) - 6 - (this.reduce ? 0 : t * 0.35));
      r.withAlpha(t < 30 ? 1 : (44 - t) / 14, () => r.text('FROZEN', cx, y, { align: 'center', color: '#dff4ff', outline: INK }));
    }, 'top');
    this.particles(cx, cy, 14, { colors: SNOW, speed: 1.6, life: 22, size: 2, shrink: true, radius: 6 });
  },
  /** Call: warm rings leave the hero's mouth and travel to the one named. */
  fx_rime7_call(o) {
    const x0 = Math.round(o.x || 0), y0 = Math.round((o.y || 0) - (o.h || 36) * 0.75);
    const x1 = Math.round(o.toX ?? x0 - 30), y1 = Math.round(o.toY ?? y0);
    this.add(28, (r, t) => {
      for (let i = 0; i < 3; i++) {
        const k = Math.min(1, Math.max(0, (t - i * 5) / 16));
        if (k <= 0 || k >= 1) continue;
        const x = Math.round(x0 + (x1 - x0) * k), y = Math.round(y0 + (y1 - y0) * k - Math.sin(Math.PI * k) * 10), rad = 3 + Math.round(k * 4);
        r.withAlpha(1 - k * 0.5, () => { r.ellipse(x, y, rad + 1, rad + 1, INK, false); r.ellipse(x, y, rad, rad, WARM[i % 4], false); });
      }
    }, 'top');
    this.sparkles(x0, y0, 5, WARM, 18, 8);
  },
  /** The farewell breaks: ice cracks off the one it held, pale rays, a ring. */
  fx_rime7_crack_off(o) {
    const { cx, cy } = this.center(o);
    const span = Math.max(14, Math.round((o.w || 24) / 2) + 6);
    this.particles(cx, cy, 28, { colors: [...PALE, '#9fd8ff'], speed: 2.4, life: 34, gravity: 0.08, size: 2, shrink: true, radius: span, radiusY: Math.round((o.h || 36) / 2) });
    this.add(16, (r, t) => {
      const k = t / 16;
      r.withAlpha(1 - k, () => {
        for (let i = 0; i < 6; i++) {
          const a = i * Math.PI / 3 + 0.4, d = Math.round(6 + k * 18);
          const x = Math.round(cx + Math.cos(a) * d), y = Math.round(cy + Math.sin(a) * d * 0.8);
          r.rect(x - 2, y - 2, 4, 3, INK); r.rect(x - 1, y - 1, 3, 2, '#e8f4ff');
        }
      });
    }, 'top');
    this.fx_ring(o, { color: '#ffffff', r0: 6, r1: span + 24, frames: 14 });
    this.fx_rays(o, { color: '#cfe8ff', n: 10, len: span + 18, frames: 16 });
  },
  /** A Stilled member's shell shatters: they come back. */
  fx_rime7_unstill(o) {
    const { cx, cy } = this.center(o);
    this.particles(cx, cy, 22, { colors: PALE, speed: 2, life: 28, gravity: 0.1, size: 2, shrink: true, radius: 12, radiusY: 16 });
    this.fx_ring(o, { color: '#cfe8ff', r0: 4, r1: 26, frames: 12 });
    this.bloom(cx, cy, '#fff7d6');
  },
  /** A farewell lands: the ribbon pulls tight and ice closes over the member from the feet up. */
  fx_rime7_still(o) {
    const { cx } = this.center(o);
    const feet = Math.round(o.y || 0), h = (o.h || 36) + 4, hw = Math.max(12, Math.round((o.w || 24) / 2) + 4);
    this.add(24, (r, t) => {
      const k = Math.min(1, t / 18), top = Math.round(feet - h * k);
      r.withAlpha(0.5, () => r.dither(cx - hw, top, hw * 2, feet - top, '#cfe8ff', 0.5));
      r.rect(cx - hw, top, hw * 2, 1, '#ffffff');
    }, 'top');
    this.particles(cx, feet - 4, 12, { colors: PALE, dir: -Math.PI / 2, spread: 0.6, speed: 1.4, life: 22, size: 1, radius: hw });
  },
  /** The Lantern opens its hood: cold light spills, the Wisps drift out of it. */
  fx_rime7_hood(o) {
    const { cx } = this.center(o);
    const ly = Math.round((o.y || 0) - (o.h || 90) * 0.72);
    this.add(30, (r, t) => {
      const k = t / 30;
      r.withAlpha(0.5 * (1 - k), () => r.ditherEllipse(cx, ly, Math.round(16 + k * 30), Math.round(12 + k * 20), '#9fd8ff', 0.5));
    }, 'over');
    this.particles(cx, ly, 24, { colors: LAMPC, speed: 1.4, life: 30, drift: 0.6, size: 1, radius: 6 });
    this.bloom(cx, ly, '#9fd8ff', true);
  },
  /** A Snow Wisp drifts out of the lantern's light into its place. */
  fx_rime7_wisp(o) {
    const { cx, cy } = this.center(o);
    const fx0 = Math.round(o.fromX ?? cx - 40), fy0 = Math.round((o.fromY ?? cy) - (o.fromH || 90) * 0.72);
    this.add(26, (r, t) => {
      const k = Math.min(1, t / 20);
      for (let i = 0; i < 8; i++) {
        const u = Math.max(0, k - i * 0.05), x = Math.round(fx0 + (cx - fx0) * u + Math.sin(u * 6 + i) * 4), y = Math.round(fy0 + (cy - fy0) * u + Math.cos(u * 5 + i) * 3);
        r.withAlpha(1 - u * 0.5, () => r.rect(x, y, 2, 2, SNOW[i % 4]));
      }
    }, 'over');
    this.bloom(cx, cy, '#cfeaff');
  },
  /** The Closed Gate rises: ice shards gather upward into the gate, a frost ring at its post. */
  fx_rime7_gate(o) {
    const cx = Math.round(o.x || 0), y = Math.round(o.y || 0), h = o.h || 56;
    this.add(26, (r, t) => {
      const k = t / 26, top = Math.round(y - h * Math.min(1, k * 1.5));
      r.withAlpha(0.55 * (1 - k), () => r.ditherEllipse(cx, Math.round((y + top) / 2), 14, Math.max(4, Math.round((y - top) / 2)), '#cfe8ff', 0.5));
    }, 'under');
    this.particles(cx, y - 4, 20, { colors: [...PALE, '#8fa2c0'], dir: -Math.PI / 2, spread: 0.5, speed: 1.9, life: 26, size: 2, shrink: true, radius: 10 });
    this.fx_ring({ ...o, h: 0 }, { color: '#cfe8ff', r0: 2, r1: 22, frames: 18, squash: 0.35 });
  },
  /** The Lost Letter drifts down in a fall of snow and settles in its shell. */
  fx_rime7_letter(o) {
    const { cx, cy } = this.center(o);
    this.add(24, (r, t) => {
      const k = 1 - t / 24, y = Math.round(cy - 30 * k), sway = Math.round(Math.sin(t / 4) * 4 * k);
      r.withAlpha(k, () => { r.rect(cx - 7 + sway, y - 4, 14, 9, INK); r.rect(cx - 6 + sway, y - 3, 12, 7, C.paper); r.line(cx - 6 + sway, y - 3, cx + sway, y + 1, '#8a7a5a'); r.line(cx + sway, y + 1, cx + 5 + sway, y - 3, '#8a7a5a'); });
    }, 'over');
    this.particles(cx, cy - 26, 16, { colors: SNOW, dir: Math.PI / 2, spread: 1, speed: 0.8, life: 28, drift: 0.6, size: 1, radius: 14 });
    this.bloom(cx, cy, '#cfeaff');
  },
  /** The ward closes: frost runs up the doors behind the Phantom. */
  fx_rime7_ward(o) {
    const { cx, cy } = this.center(o), hw = Math.round((o.w || 130) / 2) + 10;
    this.add(30, (r, t) => {
      const k = t / 30;
      for (let i = 0; i < 18; i++) {
        const side = i % 2 ? 1 : -1, yy = Math.round(cy + (o.h || 120) * 0.45 - k * (o.h || 120) * ((i % 9) / 9 + 0.2));
        r.withAlpha(0.8 * (1 - k * 0.4), () => r.rect(cx + side * (hw - (i % 5) * 3), yy, 2, 2, PALE[i % 3]));
      }
    }, 'top');
    this.bloom(cx, cy, '#cfe8ff', true);
  },
  /** The ward thaws: the doors crack, warm light, drips. */
  fx_rime7_thaw(o) {
    const { cx, cy } = this.center(o);
    this.particles(cx, cy, 40, { colors: [...PALE, '#fff7d6', '#f9d77a'], speed: 2.6, life: 36, gravity: 0.06, size: 2, shrink: true, radius: Math.round((o.w || 130) / 3), radiusY: Math.round((o.h || 130) / 4) });
    this.fx_ring(o, { color: '#fff7d6', r0: 12, r1: 80, frames: 18 });
    this.fx_rays(o, { color: C.gold, n: 12, len: 64, frames: 18 });
  },
};

// ---------------------------------------------------------------------------------------------------- the planner
const unitId = (P, uid) => (P.units[uid] && P.units[uid].id) || null;
const isPin = (id) => PIN_SKILLS.has(id);
/** The highest Rime a member reached from a cold hit in this action (the pip sound), or 0. */
export function rimeReached(rest) {
  let n = 0;
  for (const e of rest || []) if (e && e.type === 'rime_add' && e.reason === 'cold' && e.delta > 0) n = Math.max(n, e.rime | 0);
  return n;
}
export const pipSfx = (n) => (n >= 3 ? 'rime_bite_3' : n === 2 ? 'rime_bite_2' : 'rime_bite');
const wordBy = (table, id, fallback, vars) => {
  let s = (table && table[id]) || fallback;
  for (const [k, v] of Object.entries(vars || {})) s = s.split(`{${k}}`).join(v);
  return s;
};

function wrapPlanner(P) {
  const base = { battle_start: P.ev_battle_start, telegraph: P.ev_telegraph, telegraph_cancel: P.ev_telegraph_cancel, message: P.ev_message,
    phase: P.ev_phase, summon: P.ev_summon, delay: P.ev_delay, skip: P.ev_skip, segment: P.segment, castOpen: P.castOpen, enemyOpen: P.enemyOpen };
  P.ev_battle_start = function (e) {
    base.battle_start.call(this, e);
    const boss = (e.units || []).find((u) => u.side === 'enemy' && EP7_ARC_LINES[u.id]);
    if (!boss) return;
    for (let i = this.ops.length - 1; i >= 0; i--) if (this.ops[i].op === 'help') { this.ops[i].text = EP7_ARC_LINES[boss.id]; this.ops[i].color = 'cream'; break; }
  };
  // ---- Rime's own events (rime.js); every one is new to the core planner
  P.ev_rime = function (e) { this.push({ op: 'rime7Init', rime: e.rime || {} }); };
  P.ev_rime_add = function (e) {
    this.push({ op: 'rime7', uid: e.target, rime: e.rime, delta: e.delta, reason: e.reason });
    if (e.reason === 'cold' && e.delta > 0) this.push({ op: 'fx', kind: 'rime7_frost', uid: e.target });
    else if (e.delta < 0 && e.reason !== 'frozen') this.push({ op: 'fx', kind: 'rime7_shed', uid: e.target });
  };
  P.ev_frozen = function (e) {
    this.push({ op: 'rime7Frozen', uid: e.target, on: true });
    this.push({ op: 'fx', kind: 'rime7_frozen', uid: e.target });
    this.push({ op: 'sfx', id: e.sfx || 'rime_freeze' });
    this.push({ op: 'flash', uid: e.target, color: '#cfeaff', frames: 14, soft: true });
    this.push({ op: 'shake', mag: 2, frames: 8 });
  };
  P.ev_warm = function (e) { this.push({ op: 'rime7Warm', uid: e.target, on: !!e.on }); };
  P.ev_farewell = function (e) {
    this.push({ op: 'rime7Pin', source: e.source, target: e.target, skill: e.skill, moved: !!e.moved });
  };
  P.ev_farewell_broken = function (e) {
    this.push({ op: 'rime7Unpin' });
    this.push({ op: 'telegraphCancel', actor: `${e.source}${PIN_KEY}` });
    if (e.reason === 'call') {
      this.push({ op: 'fx', kind: 'rime7_crack_off', uid: e.target });
      this.push({ op: 'sfx', id: e.sfx || 'farewell_break' });
      this.push({ op: 'screenFlash', color: '#ffffff', frames: 10, alpha: 0.45 });
      this.push({ op: 'shake', mag: 3, frames: 10 });
      this.wait(8);
    } else if (e.reason === 'break') {
      this.help(e.skill === 'borrowed_light' ? 'The borrowed light slips back.' : 'The farewell fizzles.', 'cyan');
      this.wait(FRAMES.statusQuiet);
    }
  };
  P.ev_farewell_land = function (e) {
    this.push({ op: 'rime7Unpin' });
    this.push({ op: 'telegraphCancel', actor: `${e.source}${PIN_KEY}`, fired: true });
  };
  P.ev_stilled = function (e) {
    this.push({ op: 'rime7Still', uid: e.target, on: !!e.on });
    if (e.on) { this.push({ op: 'fx', kind: 'rime7_still', uid: e.target }); this.wait(10); }
  };
  P.ev_stilled_end = function (e) {
    this.push({ op: 'fx', kind: 'rime7_unstill', uid: e.target });
    this.push({ op: 'sfx', id: e.reason === 'call' ? 'farewell_break' : 'glass_break', volume: e.reason === 'call' ? 0.7 : 0.5 });
  };
  P.ev_stilled_hold = function (e) { this.push({ op: 'fx', kind: 'rime7_still', uid: e.target }); };
  // a Stilled member's skipped turn: the core says "kept in the mirror"; the scene re-words it while the member is Stilled
  P.ev_skip = function (e) {
    if (e.reason !== 'kept') return base.skip.call(this, e);
    this.push({ op: 'turn', actor: null });
    this.push({ op: 'help', text: `${this.name(e.actor)} is kept in the mirror.`, color: 'violet', still7: e.actor, name7: this.name(e.actor) });
    this.wait(FRAMES.statusQuiet);
  };
  // a pin is under its own key, so its cancel never takes a charge its owner also holds
  P.ev_telegraph = function (e) {
    if (!e.farewell) return base.telegraph.call(this, e);
    this.pose(e.actor, 'cast');
    this.push({ op: 'telegraph', actor: `${e.actor}${PIN_KEY}`, skill: e.skill, name: e.name, text: e.text, target: e.target, targets: e.targets || [],
      nextTurn: e.nextTurn, farewell: true });
    this.push({ op: 'sfx', id: e.sfx || 'farewell_read' });
    this.push({ op: 'fx', kind: 'rime7_frost', uid: e.target });
    this.push({ op: 'screenFlash', color: '#dff0ff', frames: 10, alpha: 0.3 });
    this.push({ op: 'help', text: `{c:orange}${e.text}{/c}`, color: null, pin7: true });
    this.wait(FRAMES.telegraph + 12);
  };
  P.ev_telegraph_cancel = function (e) {
    if (!isPin(e.skill)) return base.telegraph_cancel.call(this, e);
    this.push({ op: 'telegraphCancel', actor: `${e.actor}${PIN_KEY}` });   // the line was said by farewell_broken / the land
  };
  // Rime's pushes: Frozen says its own line; Call's sooner push on the ally is the Warm glint; the pin's owner thrown back says so
  P.ev_delay = function (e) {
    if (e.reason !== 'frozen' && e.reason !== 'call') return base.delay.call(this, e);
    if (e.reason === 'call' && e.amount > 0 && this.side(e.target) === 'enemy') {
      this.push({ op: 'fx', kind: 'knockback', uid: e.target });
      this.help(`${this.name(e.target)} is thrown back.`, 'gold');
      this.wait(FRAMES.delay);
    }
  };
  P.ev_message = function (e) {
    const k = e.kind;
    const id = unitId(this, e.target);
    if (k === 'rime_frozen') { this.help(e.text, 'cyan'); this.wait(FRAMES.message); return; }
    if (k === 'call') { this.wait(4); return; }   // the action name ("Arden: Call") already said it: printed once
    if (k === 'rime_warm' || k === 'rime_tea' || k === 'no_cold' || k === 'kept_light') { this.help(e.text, 'cyan'); this.wait(FRAMES.message); return; }
    if (k === 'farewell_broken') { this.help(e.text, 'gold'); this.wait(FRAMES.message + 12); return; }
    if (k === 'farewell_land') { this.help(e.text, 'orange'); this.wait(FRAMES.message); return; }
    if (k === 'stilled' || k === 'stilled_hold') { this.help(e.text, 'cyan'); this.wait(FRAMES.message); return; }
    if (k === 'farewell_answer') { this.help(e.text, 'cyan'); this.wait(FRAMES.message); return; }
    if (k === 'shut' || k === 'mend') { this.help(e.text, 'violet'); this.wait(FRAMES.message); return; }
    if (k === 'hood' && id === 'pale_lantern') {
      this.push({ op: 'fx', kind: 'rime7_hood', uid: e.target });
      this.push({ op: 'sfx', id: 'summon', volume: 0.8 });
      this.help(e.text, 'violet');
      this.wait(FRAMES.message);
      return;
    }
    if ((k === 'ward' || k === 'ward_break') && id === 'white_phantom') {
      const on = k === 'ward';
      this.push({ op: 'ward', uid: e.target, on });
      this.push({ op: 'fx', kind: on ? 'rime7_ward' : 'rime7_thaw', uid: e.target });
      this.push({ op: 'sfx', id: on ? 'summon' : 'glass_break' });
      if (!on) {
        this.push({ op: 'shake', mag: 4, frames: 18 });
        this.push({ op: 'screenFlash', color: '#fff1c8', frames: 8, alpha: 0.5 });
        this.push({ op: 'rime7Thaw' });
      }
      this.help(e.text, 'orange');
      this.wait(FRAMES.message + (on ? 0 : 12));
      return;
    }
    base.message.call(this, e);
  };
  P.ev_phase = function (e) {
    const look = PHANTOM_LOOK[e.id];
    if (!look) return base.phase.call(this, e);
    if (e.phase <= 1) { this.help(e.text, 'orange'); this.wait(FRAMES.message); return; }   // the opening look: no change to show
    const last = e.phase >= 3;
    this.push({ op: 'banner', text: e.name || `Phase ${e.phase}`, style: 'phase' });
    this.push({ op: 'fx', kind: last ? 'rime7_thaw' : 'rime7_ward', uid: e.actor });
    this.push({ op: 'sfx', id: last ? 'glass_break' : 'summon' });
    this.push({ op: 'shake', mag: 4, frames: 20 });
    this.wait(14);
    this.push({ op: 'screenFlash', color: last ? '#fff1c8' : '#e6f2ff', frames: 10, alpha: 0.6 });
    this.push({ op: 'swapSprite', uid: e.actor, sprite: e.sprite || look });
    this.push({ op: 'reveal', uid: e.actor, reset: true });
    if (last) this.push({ op: 'rime7Thaw' });
    this.help(e.text || `${this.name(e.actor)} changes.`, 'orange');
    this.wait(FRAMES.phase);
  };
  P.ev_summon = function (e) {
    const by = e.by && unitId(this, e.by);
    const kind = e.id === 'closed_gate' ? 'rime7_gate' : e.id === 'lost_letter' ? 'rime7_letter' : e.id === 'snow_wisp' && by === 'pale_lantern' ? 'rime7_wisp' : null;
    if (!kind) return base.summon.call(this, e);
    this.push({ op: 'summon', uid: e.enemy, id: e.id, name: e.name, variant: e.variant, tint: e.tint, hp: e.hp, by: e.by, split: false });
    this.push({ op: 'fx', kind, uid: e.enemy, from: e.by });
    this.push({ op: 'sfx', id: kind === 'rime7_wisp' ? 'rime_bite' : 'summon', volume: 0.8 });
    if (kind !== 'rime7_wisp') this.help(`${e.name} rises beside the Phantom!`, 'violet');   // the hood's line says the wisps
    this.wait(FRAMES.summon);
  };
  // a cold move's sound by the pips it reached (rime_bite, rime_bite_2, rime_bite_3: a whole step up a pip)
  P.segment = function (start, rest) {
    if (start && start.sfx === 'rime_bite') { const n = rimeReached(rest); if (n > 1) start = { ...start, sfx: pipSfx(n) }; }
    return base.segment.call(this, start, rest);
  };
  // Call: warm rings from the hero to the one named
  P.castOpen = function (actor, start, targets) {
    if (!(start.action && start.action.skill === CALL)) return base.castOpen.call(this, actor, start, targets);
    this.pose(actor, 'cast');
    this.push({ op: 'fx', kind: 'rime7_call', uid: actor, to: (targets || [])[0] || null });
    this.push({ op: 'sfx', id: start.sfx || 'call_cast' });
    this.wait(FRAMES.castWindup + 6);
  };
  // a pin lands: its ribbon pulls tight (the land's events say the rest)
  P.enemyOpen = function (actor, start, rest, targets) {
    const id = start.action && start.action.skill;
    if (!isPin(id)) return base.enemyOpen.call(this, actor, start, rest, targets);
    this.pose(actor, 'cast');
    this.push({ op: 'telegraphCancel', actor: `${actor}${PIN_KEY}`, fired: true });
    this.push({ op: 'screenFlash', color: '#dff0ff', frames: 10, alpha: 0.45 });
    this.push({ op: 'fx', kind: 'enemy_cast', uid: actor });
    this.push({ op: 'sfx', id: start.sfx || 'farewell_read', volume: 0.7 });
    this.wait(FRAMES.enemySpell);
  };
}

// ---------------------------------------------------------------------------------------------------- the stage


/** The json of a stage's art (E7-tiles' aurora and grades), or null. */
function stageMeta(engine, key) {
  const rec = BACKDROPS[key];
  try { if (rec && engine.assets.has(rec.asset)) { const a = engine.assets.atlas(rec.asset); return (a && a.meta) || null; } } catch (e) { return null; }
  return null;
}
/**
 * The aurora's RGBA for frame `f` of `A.frames` (pure: a node test measures it): over rows A.rows, colour (color mixed 70/30 with
 * color2 along x) at alpha A.alpha * exp(-((y - yc(x)) / width)^2), yc(x) = y + amp * sin(x / period + phase * sin(2 pi f / frames)).
 */
export function auroraPixels(f, w = W, A = AURORA) {
  const h = (A.rows && A.rows[1]) || 118;
  const px = new Uint8ClampedArray(w * h * 4);
  const hex = (s) => [1, 3, 5].map((i) => parseInt(s.slice(i, i + 2), 16));
  const c1 = hex(A.color), c2 = hex(A.color2 || A.color);
  const ph = A.phase * Math.sin((2 * Math.PI * f) / Math.max(1, A.frames));
  for (let x = 0; x < w; x++) {
    const yc = A.y + A.amp * Math.sin(x / A.period + ph), m = 0.7 + 0.3 * Math.sin(x / 61);
    const col = [0, 1, 2].map((c) => Math.round(c1[c] * m + c2[c] * (1 - m)));
    for (let y = 0; y < h; y++) {
      const g = Math.exp(-(((y - yc) / A.width) ** 2));
      const a = A.alpha * g;
      if (a < 0.004) continue;
      const i = (y * w + x) * 4;
      px[i] = col[0]; px[i + 1] = col[1]; px[i + 2] = col[2]; px[i + 3] = Math.round(a * 255);
    }
  }
  return px;
}
function initStage(scene) {
  const bl = scene.backdropLayer, key = bl && bl.key;
  scene.st7 = null;
  if (!key || !EP7_BACKDROPS[key]) return;
  const meta = stageMeta(scene.engine, key) || {};
  scene.st7 = { key, aurora: AURORA_STAGES.has(key) ? { ...AURORA, ...(meta.aurora || {}) } : null, layers: null, base: null, frozen: null, thaw: null,
    k: 0, goal: 0, painted: -1, tone: (meta.grades && meta.grades.thaw && meta.grades.thaw.tone) || THAW.tone,
    rows: (meta.grades && meta.grades.thaw && meta.grades.thaw.rows) || THAW.rows };
}
function auroraLayers(scene) {
  const st = scene.st7, r = scene.engine.renderer;
  if (!st || !st.aurora || st.layers || typeof r.createLayer !== 'function') return;
  st.layers = [];
  const A = st.aurora, h = (A.rows && A.rows[1]) || 118;
  for (let f = 0; f < A.frames; f++) {
    const L = r.createLayer(W, h);
    try { const id = L.ctx.createImageData(W, h); id.data.set(auroraPixels(f, W, A)); L.ctx.putImageData(id, 0, 0); } catch (e) { /* no pixels: no aurora */ }
    st.layers.push(L);
  }
}
/** The Stillheart's frozen and thaw copies (once per stage layer). */
function gradeLayers(scene) {
  const st = scene.st7, bl = scene.backdropLayer, r = scene.engine.renderer;
  if (!st || st.key !== THAW_STAGE || !bl || st.base === bl || typeof r.createLayer !== 'function') return;
  st.base = bl;
  const frozen = r.createLayer(bl.w, bl.h), thaw = r.createLayer(bl.w, bl.h);
  frozen.ctx.drawImage(bl.canvas, 0, 0);
  thaw.ctx.drawImage(bl.canvas, 0, 0);
  const y1 = Math.max(1, Math.min(bl.h, (st.rows && st.rows[1]) || (bl.band && bl.band.y) || 118));
  try {
    const id = thaw.ctx.getImageData(0, 0, bl.w, bl.h);
    paintClear(id.data, bl.w, bl.h, y1, st.tone);
    thaw.ctx.putImageData(id, 0, 0);
  } catch (e) {   // a tainted canvas (file://): a warm lift instead
    thaw.ctx.save(); thaw.ctx.globalCompositeOperation = 'screen'; thaw.ctx.globalAlpha = 0.35; thaw.ctx.fillStyle = '#fff1d8';
    thaw.ctx.fillRect(0, 0, bl.w, y1); thaw.ctx.restore();
  }
  st.frozen = frozen; st.thaw = thaw; st.painted = -1;
  paintGrade(scene);
}
function paintGrade(scene) {
  const st = scene.st7, bl = scene.backdropLayer;
  if (!st || !bl || !st.frozen || st.painted === st.k) return;
  const g = bl.ctx;
  g.save();
  g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
  g.drawImage(st.frozen.canvas, 0, 0);
  if (st.k > 0) { g.globalAlpha = st.k; g.drawImage(st.thaw.canvas, 0, 0); }
  g.restore();
  st.painted = st.k;
  if ((st.k === 0 || st.k === 1) && scene.engine.renderer.setBackdrop) scene.engine.renderer.setBackdrop(bl.canvas);
}
/** The aurora frame shown now: one every everyFrames game frames; frame 0 under reduce motion. */
export function auroraFrame(frame, A = AURORA, still = false) { return still ? 0 : Math.floor(frame / Math.max(1, A.everyFrames)) % Math.max(1, A.frames); }
function drawAurora(scene, r) {
  const st = scene.st7;
  if (!st || !st.aurora) return;
  auroraLayers(scene);
  const L = st.layers && st.layers[auroraFrame(scene.frame, st.aurora, !!scene.engine.settings.reduceMotion)];
  const g = r.ctx;
  if (!L || !g) return;
  g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = Math.min(1, 1 + st.k * 0.4);
  g.drawImage(L.canvas, 0, 0);
  g.restore();
}
function tickStage(scene) {
  const st = scene.st7;
  if (!st) return;
  gradeLayers(scene);
  if (st.k !== st.goal) {
    const step = Math.max(1, scene.speed || 1) / THAW_FRAMES;
    st.k = st.k < st.goal ? Math.min(st.goal, st.k + step) : Math.max(st.goal, st.k - step);
    paintGrade(scene);
  }
}

// ---------------------------------------------------------------------------------------------------- actor marks
/** The Pale Lantern's cold lamp: a slow blue glow in its hood (steady under reduce motion). */
export function drawLanternGlow(r, a, frame) {
  const f = steadyFrame(r, frame), p = (f >> 4) % 4;
  const lx = a.cx + 2, ly = a.top + Math.round(a.h * 0.28);
  r.withAlpha(0.24 + (p === 1 || p === 2 ? 0.06 : 0), () => r.ditherEllipse(lx, ly, 24, 18, '#9fd8ff', 0.5));
  r.withAlpha(0.45, () => r.ditherEllipse(lx, ly, 9, 7, '#e6f6ff', 0.6));
}
/** The Frozen Ward: two frozen doors behind the Phantom, frost lines on them; `thaw` (0..1) melts them away with drips. */
export function drawWardDoors(r, a, frame, thaw = 0) {
  const f = steadyFrame(r, frame);
  const alpha = 1 - thaw;
  if (alpha <= 0) return;
  const top = a.top + 18, bot = Math.round(a.y) - 2, hgt = bot - top, half = Math.round(a.w / 2), w = 24;
  for (const side of [-1, 1]) {
    const x0 = side < 0 ? a.cx - half - 14 : a.cx + half - 10;
    r.withAlpha(0.75 * alpha, () => {
      // an arched leaf of frozen planks: ink edge, ice body, frost lines, the iron of the lock
      for (let j = 0; j < hgt; j++) {
        const inset = j < 6 ? [6, 3, 2, 1, 1, 0][j] : 0;
        r.rect(x0 + inset - 1, top + j, w - inset * 2 + 2, 1, INK);
        r.rect(x0 + inset, top + j, w - inset * 2, 1, j % 9 === 4 ? '#cfe8ff' : j < hgt * 0.5 ? '#7fa6d4' : '#5a78a8');
      }
      r.rect(x0 + (side < 0 ? w - 6 : 3), top + Math.round(hgt * 0.5), 3, 6, '#2a3458');
    });
    r.withAlpha(0.45 * alpha, () => r.dither(x0 + 2, top + 3, w - 4, hgt - 4, '#e8f4ff', 0.25));
    if (thaw > 0) for (let i = 0; i < 4; i++) { const d = ((f + i * 13) % 30) / 30; r.withAlpha(alpha, () => r.rect(x0 + 3 + i * 5, Math.round(bot - hgt * 0.2 + d * 14), 1, 2, '#cfe8ff')); }
  }
}
/** A Stilled member in a pale ice shell at their place, a snowflake over their head. */
export function drawIceShell(r, a, frame) {
  const f = steadyFrame(r, frame);
  const hw = Math.max(12, Math.round((a.w || 24) / 2) + 3), top = a.top - 3, bot = Math.round(a.y) + 1, cx = a.cx;
  r.withAlpha(0.38, () => r.dither(cx - hw, top, hw * 2, bot - top, '#cfe8ff', 0.5));
  r.withAlpha(0.9, () => {
    r.rect(cx - hw, bot - 1, hw * 2, 1, '#ffffff');
    r.line(cx - hw, bot, cx - hw, top + 6, '#e8f4ff'); r.line(cx + hw - 1, bot, cx + hw - 1, top + 4, '#e8f4ff');
    r.line(cx - hw, top + 6, cx - 3, top, '#ffffff'); r.line(cx - 3, top, cx + 4, top + 3, '#ffffff'); r.line(cx + 4, top + 3, cx + hw - 1, top + 4, '#ffffff');
  });
  const span = Math.max(1, bot - top), gy = top + ((f * 2) % span);
  r.withAlpha(0.55, () => r.line(cx - hw + 2, gy, cx + hw - 3, gy - 2, '#ffffff'));
  drawPip(r, cx - 3, top - 10 - ((f >> 4) % 2), true);
}
/** The pin's ribbon on the stage: a pale line from its owner to the target, sagging up, a glint running along it. */
export function drawRibbon(r, from, to, frame, k = 1) {
  const f = steadyFrame(r, frame);
  // from the owner's chest to the top of the target's head: over the heads between them, under the docked help window
  const x0 = from.cx, y0 = from.top + Math.round(from.h * 0.35), x1 = to.cx, y1 = to.top + 3;
  const n = Math.max(8, Math.round(Math.hypot(x1 - x0, y1 - y0)));
  const lift = Math.min(6, Math.abs(x1 - x0) * 0.03);
  const glint = (f % 60) / 60;
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    if (u > k) break;
    const wave = Math.sin(u * 9 + f / 12) * 1.5;
    pts.push([Math.round(x0 + (x1 - x0) * u), Math.round(y0 + (y1 - y0) * u - Math.sin(Math.PI * u) * lift + wave), u]);
  }
  for (const [x, y] of pts) r.rect(x, y + 1, 2, 1, INK);
  r.withAlpha(0.8, () => { for (const [x, y] of pts) r.rect(x, y, 2, 1, '#e8f4ff'); });
  for (const [x, y, u] of pts) if (Math.abs(u - glint) < 0.04) r.rect(x - 1, y - 1, 3, 2, '#ffffff');
}
function wrapActor(A) {
  const draw = A.draw;
  A.draw = function (r, opts) {
    const s = this.engine.scene, rv = s && s.rime7;
    if (!rv || this.dead) return draw.call(this, r, opts);
    const f = this.engine.frame || 0;
    if (this.side === 'enemy' && this.id === 'white_phantom' && !this.dissolve) {
      if (this.ward) drawWardDoors(r, this, f, 0);
      else if (rv.thawT != null && rv.thawT < 40) drawWardDoors(r, this, f, rv.thawT / 40);
    }
    // a Stilled or Frozen member is drawn cold (a pale tint over the frame)
    const cold = this.side === 'party' && this.alive && (rv.stilled[this.uid] || rv.frozen[this.uid]);
    const flash = this.flash;
    if (cold && !flash) this.flash = { color: rv.stilled[this.uid] ? '#e8f4ff' : '#bfe0ff', frames: 1, total: rv.stilled[this.uid] ? 1 : 3, hold: false, soft: true };
    try { draw.call(this, r, opts); } finally { if (cold && !flash) this.flash = null; }
    if (this.side === 'enemy' && this.id === 'pale_lantern' && this.alive && !this.dissolve) drawLanternGlow(r, this, f);
  };
}

// ---------------------------------------------------------------------------------------------------- the scene view
/** The Rime view of a battle (presentation; it follows the ops, a beat behind the rules). */
function initRime(scene) {
  const b = scene.b, S = b && b.state && b.state.rime;
  scene.rime7 = null;
  if (!S) return;
  scene.rime7 = { r: { ...S.r }, frozen: { ...S.frozen }, warm: { ...S.warm }, stilled: Object.fromEntries(Object.keys(S.stilled).map((u) => [u, true])),
    pin: S.pin ? { source: S.pin.source, target: S.pin.target, skill: S.pin.skill, t: 60 } : null, pop: {}, sfx: 0, thawT: null, hinted: false };
}
/** "{hero} can call her." while it is true (the hero acts before the pin lands and can Call: ai.js heroAnswers), else ''. */
export function answerLine(scene) {
  const b = scene.b, S = b && b.state && b.state.rime;
  if (!S || !S.pin || !heroAnswers(b)) return '';
  const t = b.unit(S.pin.target), h = b.unit(HERO);
  const line = wordBy(T.can_call_by, t && t.id, T.can_call, { hero: h ? h.name : 'The hero', name: t ? t.name : '' });
  return ` {c:gold}${line}{/c}`;
}
/** Once per save: the hero under Call's MP in a fight with a pin boss (the Lantern, the Phantom). */
function lowMpHint(scene, op) {
  const rv = scene.rime7, g = scene.engine.game;
  if (!rv || rv.hinted || op.uid !== HERO || !(op.mp < LOW_MP)) return;
  const hero = scene.b.unit(HERO);
  if (!hero || !hero.alive || !(hero.skills || []).includes(CALL)) return;
  if (!scene.b.units().some((u) => u.id === 'white_phantom' || u.id === 'pale_lantern')) return;
  if (g && g.flags && g.flags[HINT_FLAG]) return;
  rv.hinted = true;
  const st = scene.b.state;
  if (st && !st.hint) st.hint = HINT_FLAG;   // rewards.js sets the flag from the battle's result (the Oath's once-per-save hint)
  else if (g && g.flags) g.flags[HINT_FLAG] = true;
  const at = scene.ops.length && scene.ops[scene.ops.length - 1].op === 'end' ? scene.ops.length - 1 : scene.ops.length;
  scene.ops.splice(Math.max(scene.opIndex, at), 0, { op: 'help', text: T.low_mp, color: 'cyan' }, { op: 'wait', frames: 48 });
}

/** The party window's names in Rime (drawn after the core window, its own names blanked for that one call). */
function drawRimeRows(scene, r) {
  const rv = scene.rime7, rows = scene._rime7Names;
  if (!rv || !rows) return;
  scene._rime7Names = null;
  for (const { a, name } of rows) a.name = name;
  const activeUid = scene.menu && scene.menu.state !== 'closed' ? scene.currentUid : null;
  const frame = scene.frame;
  rows.forEach(({ a, name }, i) => {
    if (i >= 3) return;
    const L = statusRow(i);
    const ko = a.ko || a.hp <= 0, pct = a.maxHp ? a.hp / a.maxHp : 0;
    const active = a.uid === activeUid;
    const col = ko ? 'dim' : active ? 'gold' : pct <= 0.25 ? 'red' : 'white';
    const rime = rv.r[a.uid] || 0, frozen = !!rv.frozen[a.uid], stilled = !!rv.stilled[a.uid];
    drawRimePips(r, PIP_X, L.name[1], ko ? 0 : rime, { frozen: (frozen || stilled) && !ko, pop: (rv.pop[a.uid] || 0) > 0 && !stilledHud(r) });
    // the name keeps clear of the HP figure: a long name is cut at the HP number (8 characters never are at 4 digits)
    const nx = NAME_X, hpW = r.measure(String(Math.max(0, Math.round(a.shownHp))));
    const room = L.hp[0] - hpW - 3 - nx;
    const clip = r.measure(name) > room;
    if (clip) r.pushClip(nx, L.name[1] - 2, room, 12);
    try { drawRimeName(r, nx, L.name[1], name, ko ? 0 : rime, { color: col, frozen: frozen && !ko, stilled: stilled && !ko, frame }); }
    finally { if (clip) r.popClip(); }
  });
}
const stilledHud = (r) => stillHud(r);
/** Over the timeline (drawn this frame): the Frozen member's heads frosted, a snowflake on a Stilled member's skipped slots, the
 * pin's ribbon from its owner's slot to its target's and the target's name in frost under it. */
function drawTimelineMarks(scene, r) {
  const rv = scene.rime7, order = scene.timeline || [];
  if (!rv) return;
  const n = Math.min(TL.slots, order.length);
  const at = {};
  for (let i = 0; i < n; i++) {
    const row = order[i], uid = row && row.uid;
    if (!uid) continue;
    if (at[uid] == null) at[uid] = i;
    const sx = timelineSlotX(i), sy = TL.y;
    if (rv.frozen[uid]) {
      r.withAlpha(0.55, () => r.dither(sx + 3, sy + 3, 12, 12, '#dff4ff', 0.5));
      r.rect(sx + 3, sy + 9, 5, 1, '#ffffff'); r.rect(sx + 8, sy + 8, 4, 1, '#ffffff'); r.rect(sx + 12, sy + 9, 3, 1, '#ffffff');
    }
    if (rv.stilled[uid] && row.skip) {
      r.withAlpha(0.45, () => r.dither(sx + 3, sy + 3, 12, 12, '#e8f4ff', 0.5));
      r.rect(sx + 10, sy + 10, 9, 9, INK);
      drawPip(r, sx + 11, sy + 11, true);
    }
    if (rv.pin && uid === rv.pin.target) r.strokeRect(sx, sy, 18, 18, '#cfe8ff');
  }
  const p = rv.pin;
  if (!p || at[p.target] == null) return;
  const xt = timelineSlotX(at[p.target]) + 9;
  const xs = at[p.source] != null ? timelineSlotX(at[p.source]) + 9 : timelineSlotX(TL.slots - 1) + 20;
  const y = TL.y + 20;
  const lo = Math.min(xs, xt), hi = Math.max(xs, xt);
  r.rect(lo - 1, y - 1, hi - lo + 3, 4, INK);
  r.rect(xs - 1, TL.y + 17, 3, 4, INK); r.rect(xt - 1, TL.y + 17, 3, 4, INK);
  r.rect(lo, y, hi - lo + 1, 2, '#e8f4ff'); r.rect(xs, TL.y + 18, 1, 2, '#e8f4ff'); r.rect(xt, TL.y + 18, 1, 2, '#e8f4ff');
  const glint = lo + ((steadyFrame(r, scene.frame) >> 1) % Math.max(1, hi - lo + 1));
  r.rect(glint, y, 2, 1, '#ffffff');
  const t = scene.actor(p.target);
  if (t) {
    const nm = t.name, w = r.measure(nm) + 6;
    const nx = Math.max(TL.x, Math.min(W - 4 - w, xt - Math.round(w / 2)));
    r.rect(nx, y + 3, w, 11, INK);
    drawRimeName(r, nx + 3, y + 4, nm, RIME_MAX, { color: FROST, frame: scene.frame });
  }
}
/** The pin's ribbon on the stage, the Stilled shells, over the units. */
function drawStageMarks(scene, r) {
  const rv = scene.rime7;
  if (!rv) return;
  for (const a of scene.party()) if (rv.stilled[a.uid] && a.alive) drawIceShell(r, a, scene.frame);
  const p = rv.pin;
  if (p) {
    const from = scene.actor(p.source), to = scene.actor(p.target);
    if (from && to && from.alive && to.alive) drawRibbon(r, from, to, scene.frame, Math.min(1, (p.t || 0) / 18));
  }
}

/** The rows of the Phantom and its Ward (CRITIQUE_8 item 1): the Phantom's over its crown, one anchor in all three looks; the Gate's
 * and the Letter's under their own feet, side by side ROW_GAP apart and clear of the touch command window. Pure on the plan. */
export function steadyRows(plan, { actors, docked = true }) {
  const live = actors.filter((a) => a && !a.dead && !a.ko);
  const byUid = new Map(live.map((a) => [a.uid, a]));
  const clampX = (x, w) => Math.max(4, Math.min(W - w - 4, Math.round(x)));
  const off = (a) => ({ dx: Math.round((a.x ?? 0) - (a.homeX ?? a.x ?? 0)), dy: Math.round((a.y ?? 0) - (a.homeY ?? a.y ?? 0)) });
  const set = (p, a, x, y, place) => {
    const o = off(a);
    p.at = { x: x + o.dx, y: y + o.dy }; p.rect = { x: x + o.dx, y: y + o.dy, w: p.rect.w, h: ENEMY_ROW_H }; p.place = place; p.lift = 0;
  };
  let gateRight = null;
  const entries = [...plan.entries()].filter(([uid]) => byUid.has(uid));
  entries.sort((x, y) => (byUid.get(x[0]).homeX ?? 0) - (byUid.get(y[0]).homeX ?? 0));
  for (const [uid, p] of entries) {
    const a = byUid.get(uid);
    if (!p.rect) continue;
    const hx = a.homeX ?? a.x, hy = a.homeY ?? a.y;
    if (a.id === 'white_phantom') {
      const y = docked ? hy + CROWN.dy - ENEMY_ROW_H - 2 : HELP_TALLEST + 2;
      set(p, a, clampX(hx + CROWN.dx - ROW_HALF, p.rect.w), y, 'band');
    } else if (a.id === 'closed_gate' || a.id === 'lost_letter' || (a.id === 'snow_wisp' && a.wisp7 != null)) {
      // under the feet, or in the feet band when the party window is too near (the core's desktop rule for a grounded foe)
      const y = Math.min(hy + 3, STATUS_WIN.y - ENEMY_ROW_H - 2);
      let x = Math.max(CMD_WIN_TOUCH.x + CMD_WIN_TOUCH.w + 2, Math.round(hx - p.rect.w / 2));
      if (gateRight != null && Math.abs(gateRight.y - y) < ENEMY_ROW_H) x = Math.max(x, gateRight.x + ROW_GAP);
      x = Math.min(x, PARTY_LEFT - 4 - p.rect.w);
      set(p, a, clampX(x, p.rect.w), y, 'below');
      gateRight = { x: x + p.rect.w, y };
    }
  }
  return plan;
}

function wrapScene(B) {
  const base = { enter: B.enter, update: B.update, draw: B.draw, runOp: B.runOp, planEnemyRows: B.planEnemyRows, drawHelpWindow: B.drawHelpWindow,
    party: B.party, drawLog: B.drawLog };
  B.enter = function (data) {
    base.enter.call(this, data);
    initRime(this);
    initStage(this);
    this._rime7Tl = false; this._rime7Names = null;
    if (this.st7) gradeLayers(this);
    if (this.fx && !this.fx.__rime7) {
      const du = this.fx.drawUnder.bind(this.fx), dov = this.fx.drawOver.bind(this.fx);
      this.fx.drawUnder = (r) => { if (this.st7) drawAurora(this, r); du(r); };
      this.fx.drawOver = (r) => { if (this.rime7) drawStageMarks(this, r); dov(r); };
      this.fx.__rime7 = true;
    }
  };
  B.update = function (dt, below) {
    base.update.call(this, dt, below);
    if (this.st7) tickStage(this);
    const rv = this.rime7;
    if (!rv) return;
    const sp = Math.max(1, this.speed || 1);
    for (const k of Object.keys(rv.pop)) if ((rv.pop[k] -= sp) <= 0) delete rv.pop[k];
    if (rv.pin && rv.pin.t < 60) rv.pin.t += sp;
    if (rv.thawT != null && rv.thawT < 40) rv.thawT += sp;
    // the answer is re-read while the pin stands: "{hero} can call her." only while it is still true
    for (const t of this.telegraphs.values()) if (t.farewell) t.text = t.base + answerLine(this);
  };
  B.draw = function (r) {
    if (!this.rime7) return base.draw.call(this, r);
    this._rime7Tl = false;
    try { return base.draw.call(this, r); } finally {
      if (this._rime7Names) { for (const { a, name } of this._rime7Names) a.name = name; this._rime7Names = null; }
      this._rime7Tl = false;
    }
  };
  B.drawHelpWindow = function (r) {
    base.drawHelpWindow.call(this, r);
    if (this.rime7) { this._rime7Tl = true; this._rime7R = r; }
  };
  // the call that follows the timeline in draw() (the party status window's list): the timeline marks draw, the names blank
  B.party = function () {
    const list = base.party.call(this);
    if (!this._rime7Tl || !this.rime7) return list;
    this._rime7Tl = false;
    if (this._rime7R) drawTimelineMarks(this, this._rime7R);
    this._rime7Names = list.map((a) => ({ a, name: a.name }));
    for (const a of list) a.name = '';
    return list;
  };
  B.drawLog = function (r) {
    if (this._rime7Names) drawRimeRows(this, r);
    return base.drawLog.call(this, r);
  };
  B.planEnemyRows = function (uids, touch, cwNow, helpBottom, scoreAll) {
    const plan = base.planEnemyRows.call(this, uids, touch, cwNow, helpBottom, scoreAll);
    if (!this.rime7) return plan;
    return steadyRows(plan, { actors: [...this.actors.values()], docked: !!helpDock() });
  };
  B.runOp = function (op) {
    const rv = this.rime7;
    switch (op.op) {
      case 'rime7Init': if (rv) for (const [u, n] of Object.entries(op.rime || {})) rv.r[u] = n; return false;
      case 'rime7': if (rv) { rv.r[op.uid] = op.rime; if (op.delta > 0) rv.pop[op.uid] = 24; } return false;
      case 'rime7Frozen': if (rv) { if (op.on) rv.frozen[op.uid] = true; else delete rv.frozen[op.uid]; } return false;
      case 'rime7Warm': if (rv) { if (op.on) rv.warm[op.uid] = true; else delete rv.warm[op.uid]; } return false;
      case 'rime7Pin': if (rv) rv.pin = { source: op.source, target: op.target, skill: op.skill, t: rv.pin && rv.pin.target === op.target ? rv.pin.t : 0 }; return false;
      case 'rime7Unpin': if (rv) rv.pin = null; return false;
      case 'rime7Still': if (rv) { if (op.on) rv.stilled[op.uid] = true; else delete rv.stilled[op.uid]; } return false;
      case 'rime7Thaw': if (rv) rv.thawT = rv.thawT == null ? 0 : rv.thawT; if (this.st7 && this.st7.key === THAW_STAGE) { this.st7.goal = 1; if (this.fast) { this.st7.k = 1; paintGrade(this); } } return false;
      default: break;
    }
    if (rv && op.op === 'help' && op.pin7) op = { ...op, text: op.text + answerLine(this) };
    if (rv && op.op === 'help' && op.still7 && rv.stilled[op.still7]) op = { ...op, text: wordBy(null, null, T.stilled, { name: op.name7 }), color: 'cyan' };
    if (rv && op.op === 'turn' && op.actor && rv.frozen[op.actor]) delete rv.frozen[op.actor];   // Frozen until it next acts
    if (rv && op.op === 'fx' && (op.kind === 'rime7_call' || op.kind === 'rime7_wisp')) {
      if (this.fast) return false;
      const t = op.kind === 'rime7_call' ? this.actor(op.to) : null;
      this.fxAt(op.kind, op.uid, t ? { toX: t.cx, toY: t.top + Math.round(t.h * 0.4) } : { from: op.from });
      return false;
    }
    const res = base.runOp.call(this, op);
    if (rv && op.op === 'telegraph' && op.farewell) { const t = this.telegraphs.get(op.actor); if (t) { t.farewell = true; t.base = op.text; t.text = op.text + answerLine(this); } }
    if (rv && op.op === 'summon') {
      const a = this.actor(op.uid), u = this.unit(op.uid);
      let spot = u && WARD_SPOTS[u.id];
      if (u && u.id === 'snow_wisp' && this.b.units().some((x) => x.id === 'pale_lantern')) {
        const n = [...this.actors.values()].filter((x) => x.wisp7 != null && x.uid !== op.uid).length;
        spot = WISP_SPOTS[n % WISP_SPOTS.length];
        if (a) a.wisp7 = n;
      }
      if (a && spot) { a.homeX = a.x = spot.x; a.homeY = a.y = spot.y; a.backRow = false; }
    }
    if (rv && op.op === 'mp') lowMpHint(this, op);
    return res;
  };
}

// ---------------------------------------------------------------------------------------------------- the menu
/** Call's row draws its icon; Call floats while a pin stands; the ally cursor opens on the pin's target; Defend says it warms. */
function wrapMenu(M) {
  const openSub = M.openSub, sig = M.sig, open = M.open, startTarget = M.startTarget, draw = M.draw;
  M.open = function (unit) {
    const res = open.call(this, unit);
    const items = this.scene && this.scene.rime7 && this.root ? this.root.items || [] : [];
    const d = items.find((it) => it.id === 'defend' && !it.disabled);
    if (d) { d.help = T.defend_help; this.syncHelp(); }
    return res;
  };
  M.openSub = function (cmd) {
    const ok = openSub.call(this, cmd);
    const L = this.sub, it = ok && L && L.items.find((x) => x.id === CALL);
    if (it) {
      if (!L.icons) { L.icons = true; L.textX = 15; }
      it.draw = (r, rr, dim, alpha) => r.withAlpha(alpha * (dim ? 0.5 : 1), () => drawCallIcon(r, rr.x + L.iconX, rr.y + L.textDy));
    }
    return ok;
  };
  // Episode 4's Answer row comes first in SIGNATURE_TECHS: while a Farewell or Borrowed Light is pinned, Call is the hero's row;
  // also while an ally is Stilled (their only quick way back, and on the phone a Tech list folds below four rows)
  M.sig = function (u) {
    const hit = sig.call(this, u);
    if (!u || u.id !== HERO || (hit && hit.skill === CALL)) return hit;
    const t = this.scene && this.scene.telegraphs, S = this.b && this.b.state && this.b.state.rime;
    const pinned = t && [...t.values()].some((x) => x.farewell || (SKILLS[x.skill] && SKILLS[x.skill].farewell));
    if (!pinned && !(S && Object.keys(S.stilled || {}).length)) return hit;
    const tech = this.b.commands(u).find((c) => c.id === 'tech');
    return tech && (tech.list || []).some((e) => e.skill === CALL) ? CALL_SIG : hit;
  };
  // Call opens on the pin's target (rules.js already opens on a Stilled ally: canTargetKept lists them, off the timeline or not)
  M.startTarget = function (b) {
    const ok = startTarget.call(this, b);
    if (!ok || !b || b.skill !== CALL || !this.tInfo) return ok;
    const S = this.b && this.b.state && this.b.state.rime, pin = S && S.pin;
    const i = pin ? this.tInfo.ids.indexOf(pin.target) : -1;
    if (i >= 0 && i !== this.tIndex) { this.tIndex = i; this.refreshPreview(); this.syncHelp(); }
    return ok;
  };
  M.draw = function (r, frame) {
    const s = this.scene;
    if (s && s._rime7Names) drawRimeRows(s, r);
    return draw.call(this, r, frame);
  };
}

// ---------------------------------------------------------------------------------------------------- the field (cutscene helpers)
/** The whiteout's party row on the field: a thin window at the top right with each member's name in the battle's Rime drawing. */
export function drawFrostStrip(r, members, frost, alphaK = 1) {
  if (!members.length || alphaK <= 0) return;
  const rowH = 12, w = 112, h = members.length * rowH + 8, x = W - 4 - w, y = 4;
  r.withAlpha(alphaK, () => {
    drawWindow(r, x, y, w, h, { kind: 'thin' });
    members.forEach((m, i) => {
      const lv = frost[m.id] || 0, yy = y + 4 + i * rowH;
      drawRimePips(r, x + 5, yy, lv, { frozen: lv >= RIME_MAX });
      drawRimeName(r, x + 28, yy, m.name, lv, { color: 'white', frozen: lv >= RIME_MAX });
    });
  });
}
function hookFrost(F) {
  if (!F || F.__frost7 || typeof F.drawKeptBar !== 'function') return;
  const dk = F.drawKeptBar;
  F.drawKeptBar = function (r) {
    dk.call(this, r);
    const S = this.frost7;
    if (!S) return;
    const members = (this.game && this.game.party || []).map((m) => ({ id: m.id, name: m.name }));
    const k = S.out ? Math.max(0, 1 - S.outT / 30) : Math.min(1, S.inT / 12);
    drawFrostStrip(r, members, S.shown, k);
  };
  F.__frost7 = true;
}
function hookBlot(dlg, frames) {
  if (!dlg || dlg.__blot7 || typeof dlg.draw !== 'function') return;
  const d = dlg.draw;
  let t = 0;
  dlg.draw = function (r) {
    d.call(this, r);
    const R = this.rect;
    if (!R) return;
    t++;
    const k = Math.min(1, t / frames);
    r.withAlpha(0.35 * k, () => r.dither(R.x + 2, R.y + 2, R.w - 4, R.h - 4, '#dff0ff', 0.5));
    r.withAlpha(0.7 * k, () => {
      for (let i = 0; i < 26; i++) {
        const x = R.x + 6 + ((i * 53) % Math.max(1, R.w - 12)), y = R.y + 4 + ((i * 29) % Math.max(1, R.h - 8));
        r.rect(x, y, 1, 1, '#ffffff'); if (i % 3 === 0) { r.rect(x - 1, y, 3, 1, '#e8f4ff'); r.rect(x, y - 1, 1, 3, '#e8f4ff'); }
      }
      r.strokeRect(R.x + 1, R.y + 1, R.w - 2, R.h - 2, '#cfe8ff');
    });
  };
  dlg.__blot7 = true;
}
function addHelpers(cs) {
  const api = cs && cs.api;
  if (!api || api.frostBlot) return;
  const E = cs.engine;
  /** A name the ice took out of a memory: "..." under a frost texture, with a soft `ice`. */
  api.frostBlot = async (who) => {
    if (cs.dead) return;
    E.audio.sfx('ice', { volume: 0.5 });
    const said = api.say(who, '...');
    for (let i = 0; i < 4 && !cs.dead; i++) {
      await cs.frames(1);
      const dlg = (E.stack || []).find((sc) => sc && sc.name === 'dialog');
      if (dlg) { hookBlot(dlg, 18); break; }
    }
    await said;
  };
  /** The battle's Rime drawer on the field: `ids` frost to `level` (0 to 3) a pip at a time; level 0 for all lets the row go. */
  api.frostNames = async (ids, level) => {
    const F = cs.field;
    if (!F || cs.dead) return;
    hookFrost(F);
    const S = F.frost7 || (F.frost7 = { shown: {}, inT: 0, out: false, outT: 0 });
    S.out = false;
    const lv = Math.max(0, Math.min(RIME_MAX, level | 0));
    for (let step = 0; step < RIME_MAX && !cs.dead; step++) {
      let moved = false;
      for (const id of ids || []) { const c = S.shown[id] || 0; if (c !== lv) { S.shown[id] = c + (lv > c ? 1 : -1); moved = true; } }
      if (!moved) break;
      if (lv > 0) E.audio.sfx(pipSfx(Math.max(...(ids || []).map((id) => S.shown[id] || 0))), { volume: 0.6 });
      for (let f = 0; f < 18 && !cs.dead; f++) { S.inT++; await cs.frames(1); }
    }
    if (Object.values(S.shown).every((v) => !v)) {
      S.out = true;
      for (S.outT = 0; S.outT < 30 && !cs.dead; S.outT++) await cs.frames(1);
      F.frost7 = null;
    }
  };
  /** A field sprite's alpha, eased over `frames` (the whiteout's fade). */
  api.actorAlpha = async (id, alpha, frames = 30) => {
    const a = cs.field && cs.field.actorById(id);
    if (!a || cs.dead) return;
    const from = a.alpha == null ? 1 : a.alpha, n = Math.max(1, frames | 0);
    for (let i = 1; i <= n && !cs.dead; i++) { a.alpha = from + (alpha - from) * (i / n); await cs.frames(1); }
    a.alpha = alpha;
  };
}
function wrapCutscene(Cs) {
  const run = Cs.run;
  Cs.run = async function (id) {
    addHelpers(this);
    try { return await run.call(this, id); } finally {
      // the frost row and a faded sprite never outlive their scene
      if (this.field) {
        this.field.frost7 = null;
        for (const a of this.field.actors || []) if (a && a.alpha != null && a.alpha < 1 && (a.id === 'mira' || a.id === 'bram' || a.kind === 'party')) a.alpha = 1;
      }
    }
  };
}

let done = false;
/** Install everything above. Safe to call twice. Returns what went in. */
export function register() {
  // Episode 6's descAfter key items (its scene module reads them): Episode 7's items.js gives the White Road letter a second
  // description, after that module ran, so its idempotent register() wraps the letter now (it returns 'already' otherwise)
  registerEp6Scene();
  if (done) return ['already'];
  for (const [k, v] of Object.entries(EP7_BACKDROPS)) if (!BACKDROPS[k]) BACKDROPS[k] = v;
  for (const [k, v] of Object.entries(EP7_BOSS_CARDS)) if (!BOSS_CARD[k]) BOSS_CARD[k] = v;
  if (!HEAD_BOX.white_phantom) HEAD_BOX.white_phantom = [0.336, 0.792, 0, 0.197];   // ep7_bosses_battle.json hud.head (look one)
  if (!SIGNATURE_TECHS.some((t) => t.skill === CALL)) SIGNATURE_TECHS.push(CALL_SIG);
  for (const [k, fn] of Object.entries(EP7_FX)) if (!BattleFx.prototype[k]) BattleFx.prototype[k] = fn;
  wrapPlanner(Planner.prototype);
  wrapActor(Actor.prototype);
  wrapScene(BattleScene.prototype);
  wrapMenu(CommandMenu.prototype);
  wrapCutscene(Cutscene.prototype);
  done = true;
  return ['backdrops', 'cards', 'heads', 'signature', 'fx', 'planner', 'actor', 'scene', 'menu', 'cutscene'];
}
export default register;
