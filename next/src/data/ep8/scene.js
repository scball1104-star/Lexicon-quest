// Episode 8 on the battle stage (E8-scene-ui; docs/EPISODE8_PLAN.md 5.3, 6.3 to 6.5, 9.3, 12; docs/BATTLE.md 17). Pack code: index.js
// runs register() last in its ORDER, after the ep7 pack's scene module (so every wrapper here sits over Episodes 4 to 7's and passes
// everything else straight on). No core file changes: this module adds to the tables the core exports (BACKDROPS, BOSS_CARD, HEAD_BOX,
// SIGNATURE_TECHS, BattleFx) and wraps prototype methods of Planner, Actor, CommandMenu, BattleScene, Cutscene and LoadGameScene.
// Nothing here runs in a battle without Erasure (Episodes 1 to 7, the cave and Fine Print draw exactly as before): every wrapper checks
// for Erasure's own events, its skills or the scene's `er8` view first.
//
//   BACKDROPS   ep8_battle_stair, _library, _palimpsest, _unwritten, _lastword (E8-tiles' art). The Last Word has two grades: the violet
//               one as composed and a gold one (its json grades.gold.tone through Episode 5's dayTone, never a screen over the violet),
//               cross-faded over 30 frames when the Erasure Ward breaks; and a separate white-out overlay (json `whiteout`, alpha capped
//               so no pixel rises more than 0.15 luma, 30 frames in, never a flash) while the Last Silence charges and as phase 4 opens
//   BOSS_CARD   THE UNNAMED SENTRY / Keeper of the Palimpsest, THE ERASER / Once the First Keeper; the arc line (text.js
//               EP8_ARC_LINES) is the help window's first line while the card shows
//   Erasure     a rubbed-out command row drawn smudged (the word at 40% under a pale rubbed band, two pips at its right that empty as
//               the turns pass), its help "Rubbed out. Try something else.", the list's buzzer on confirm; a rubbed Magic row still opens
//               with only Read Aloud lit; an eraser-crumb pip per rubbed command under the member's name in the party window; a smudge
//               on the member's next timeline heads while a row is rubbed; Unwritten: the member greyed on the stage, every row but
//               Defend smudged
//   SIGNATURE   skills.js registerSignatures: Mira's Read Aloud while an Unwrite is pinned (her Magic list opens on it, first, in gold,
//               the cursor on the pin's target; Episode 5's Turn the Sky row yields), the hero's Answer while the Last Silence charges
//               (his Tech list opens on it, first, in gold; Episode 4's Answer rows never match an Episode 8 telegraph); Read Aloud's
//               12 x 12 icon drawn in code
//   The pin     a grey ribbon from its owner to the target on the stage and under the timeline, the target's name smudged there;
//               unwrite_read; "Mira can read him back." only while it is true (ai.js miraReads); Read Aloud breaks it with gold letters
//               and unwrite_break
//   The Silence the whole stage dims toward white (capped), a charge bar over the Eraser's row, the silence_gather jingle under the
//               music; "{hero} can answer it." only while it is true (ai.js heroAnswers); boss_eraser_silence from phase 4
//   The bosses  the Eraser's four looks with its row on ONE anchor over the hood in all four (E8-sprites' hud.hood), Grief and Change
//               in front-row foe slots with their rows under their own feet, at least 12 internal px from any party sprite; the
//               Sentry's row under its feet
//   Field       the cutscene's s.inkBlot(who), s.hudNameFlash(id), s.tollName(text) and s.goto(map, x, y, dir) (E8-story calls each
//               only when present)
//   Load Game   a finished save (ep8_complete) shows a small gold star beside its place name

import { BACKDROPS, BOSS_CARD, BattleScene } from '../../scenes/battle.js';
import { Planner, FRAMES } from '../../battle/scene/animator.js';
import { Actor } from '../../battle/scene/actors.js';
import { steadyFrame } from '../../battle/scene/hud.js';
import { SIGNATURE_TECHS, CommandMenu } from '../../battle/scene/menu.js';
import { TL, timelineSlotX, STATUS_WIN, ENEMY_ROW_H, CMD_WIN_TOUCH, W, H, HEAD_BOX, statusRow, helpDock, HELP_WIN, HELP_LINE,
  HELP_LINES_MAX } from '../../battle/scene/layout.js';
import { drawWindow } from '../../ui/window.js';
import { BattleFx } from '../../battle/fx.js';
import { Cutscene } from '../../world/cutscene.js';
import { LoadGameScene } from '../../scenes/loadGame.js';
import { BANNERS } from '../text.js';
import { fmtTime } from '../../ui/text.js';
import { SKILLS } from '../skills.js';
import { ENEMIES } from '../enemies.js';
import { EP8_BOSS_CARDS, EP8_ARC_LINES, EP8_BATTLE_TEXT as T } from './text.js';
import { miraReads, heroAnswers } from './ai.js';
import { erasureState, READ, HERO, MIRA } from './erasure.js';
import { registerSignatures } from './skills.js';
import { paintClear } from '../ep6/scene.js';

export const EP8_BACKDROPS = {
  ep8_battle_stair: { asset: 'ep8_battle_stair', cell: 7, bright: 1.0, tint: null },
  ep8_battle_library: { asset: 'ep8_battle_library', cell: 7, bright: 0.9, tint: 'rgba(40,30,90,0.18)' },
  ep8_battle_palimpsest: { asset: 'ep8_battle_palimpsest', cell: 7, bright: 0.8, tint: 'rgba(40,30,60,0.25)' },
  ep8_battle_unwritten: { asset: 'ep8_battle_unwritten', cell: 7, bright: 0.9, tint: 'rgba(60,50,110,0.2)' },
  ep8_battle_lastword: { asset: 'ep8_battle_lastword', cell: 7, bright: 0.7, tint: 'rgba(60,30,100,0.3)' },
};
export const GOLD_STAGE = 'ep8_battle_lastword';
/** E8-tiles' json values (the json wins when the art is loaded). */
export const GOLD = { tone: { lift: 1.8, warm: 0.0, chroma: 1.12, cast: 0.045, hue: 1.05 }, rows: [0, 118] };
export const GRADE_FRAMES = 30;
/** The white-out: lerp the stage toward `color` by alpha * k. Capped: alpha <= CAP_LUMA so a black pixel rises at most CAP_LUMA. */
export const CAP_LUMA = 0.15;
export const WHITE = { color: '#fff7d6', alpha: 0.1747, frames: 30, holdFrames: 12 };
export const whiteAlpha = (a = WHITE.alpha) => Math.min(a, CAP_LUMA);
export const UNWRITE = 'unwrite';
export const SILENCE = 'last_silence';
export const ANSWER = 'answer';
export const READ_SIG = { unit: MIRA, flag: UNWRITE, skill: READ, cmd: 'magic' };
export const LOW_MP = 12;                         // Read Aloud's cost
export const ONCE = { ink: 'ep8_ink_noted', mp: 'ep8_read_mp_hint' };   // game.counters: once a save
/** One HUD anchor in all four looks (E8-sprites' ep8_bosses_battle.json hud.hood): 1 px right of the feet, 116 px up. The Eraser's
 * row sits over it, its left edge HOOD_LEFT left of the hood (the top-left of his body), whatever the look's width. */
export const HOOD = { dx: 1, dy: -116 };
export const HOOD_LEFT = 36;
export const ERASER_LOOKS = ['eraser', 'eraser_truths', 'eraser_remembers', 'eraser_silence'];
/** The Rejected Truths in front-row foe slots (CRITIQUE_8 item 1): feet on the front baseline (146), out of the Eraser's covers and
 * clear of the party (the hero's body starts at 278: Change's right edge is 32 px off it); each row in its own feet band. */
export const TRUTH_SPOTS = { truth_grief: { x: 186, y: 146 }, truth_change: { x: 238, y: 146 } };
export const ROW_GAP = 4;
export const CHARGE_W = 34;                       // the Last Silence's charge bar beside the Eraser's row
export const PARTY_LEFT = 278;                    // the hero's body at slot 290 (24 px of body in a 32 px frame)
export const CLEAR_PX = 12;                       // the adds' bodies and rows keep this far off any party sprite (enemies.js HUD_ROWS clearPx)
const HELP_TALLEST = HELP_WIN.y + HELP_WIN.h + (HELP_LINES_MAX - 1) * HELP_LINE;
export const RUBBABLE_ROWS = ['attack', 'tech', 'magic', 'item'];

// ---------------------------------------------------------------------------------------------------- pixel art
const INK = '#14101e';
const RUB_BAND = '#d9d2ea';                       // the rubbed band (a pale paper-white)
const CRUMB = { a: '#f0a7b6', b: '#ffd9df' };     // an eraser crumb: rubber pink, a pale top
const GREY = '#a7a3b6';                           // the unwriting: ribbon, the greyed member
const GOLDC = ['#f9d77a', '#fff7d6', '#eba14d', '#ffffff'];
// 12 x 12: Read Aloud's icon, an open book with two sound lines over it
const READ_ICON = ['....g..g....', '.g..g..g..g.', '..g......g..', '............', 'wwwww.wwwww.', 'wpppw.wpppw.',
  'wpllwgwllpw.', 'wpppwgwpppw.', 'wpllwgwllpw.', 'wpppwgwpppw.', 'wwwwwgwwwww.', '.....g......'];
const READ_PAL = { g: '#f9d77a', w: '#fff7d6', p: '#e8dcc0', l: '#8a7a5a' };
const CRUMB_ROWS = ['abba', 'aaaa'];

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
export function drawReadIcon(r, x, y) { blitOutlined(r, READ_ICON, x, y, READ_PAL); }
/** One eraser crumb (4 x 2, 6 x 4 with its outline) at (x, y); `fade`: the last turn of the rub. */
export function drawCrumb(r, x, y, fade = false) { r.withAlpha(fade ? 0.6 : 1, () => blitOutlined(r, CRUMB_ROWS, x + 1, y + 1, CRUMB)); }
/** A rubbed row's two pips (3 x 3 each, the right one empties first): `left` of `max` still to go. */
export function drawRubPips(r, x, y, left, max = 2) {
  for (let i = 0; i < max; i++) {
    const px = x + i * 5, lit = i < left;
    r.rect(px - 1, y - 1, 5, 5, INK);
    r.rect(px, y, 3, 3, lit ? CRUMB.a : '#3a3550');
    if (lit) r.rect(px, y, 2, 1, CRUMB.b);
  }
}
/**
 * A command word rubbed out (the battle menu's rows): the word at 40% under a pale band across its middle, a few rubbed streaks, and the
 * row's two pips at its right edge. Returns the word's width.
 */
export function drawSmudgedWord(r, label, x, y, rowW, rub) {
  const w = r.measure(label);
  r.withAlpha(0.26, () => r.rect(x - 2, y + 2, w + 4, 5, RUB_BAND));
  r.text(label, x, y, { color: 'white', alpha: 0.4 });
  r.withAlpha(0.32, () => { for (let i = 0; i < w + 2; i += 3) r.rect(x - 1 + i, y + 4 + ((i >> 1) % 2), 2, 1, RUB_BAND); });
  if (rub) drawRubPips(r, x - 2 + rowW - 14, y + 2, Math.max(0, Math.min(rub.max || 2, rub.left | 0)), rub.max || 2);
  return w;
}

// ---------------------------------------------------------------------------------------------------- fx (BattleFx)
const RUBC = ['#f0a7b6', '#ffd9df', '#d9d2ea', '#ffffff'];
const INKC = ['#2a2440', '#4a4366', '#8a84a6'];
export const EP8_FX = {
  /** A command rubbed out: crumbs flick off the member, a pale smear across their chest. */
  fx_ep8_rub(o) {
    const { cx, cy } = this.center(o);
    this.particles(cx, cy - 4, 12, { colors: RUBC, dir: -Math.PI / 2, spread: 2.2, speed: 1.4, life: 22, gravity: 0.12, size: 1, radius: 8 });
    this.add(18, (r, t) => {
      const k = t / 18, w = Math.round(6 + k * 20);
      r.withAlpha(0.5 * (1 - k), () => r.rect(cx - Math.round(w / 2), cy - 2, w, 3, RUB_BAND));
    }, 'top');
  },
  /** A Defend: the ink runs off the shield. */
  fx_ep8_slide(o) {
    const { cx, cy } = this.center(o);
    this.particles(cx, cy - 6, 10, { colors: INKC, dir: Math.PI / 2, spread: 0.9, speed: 1.1, life: 22, gravity: 0.1, size: 1, radius: 10 });
  },
  /** Unwritten: the member's lines lift off as grey letters and the colour goes out of them. */
  fx_ep8_unwrite(o) {
    const { cx } = this.center(o);
    const feet = Math.round(o.y || 0), h = (o.h || 36) + 4, hw = Math.max(12, Math.round((o.w || 24) / 2) + 4);
    this.add(28, (r, t) => {
      const k = Math.min(1, t / 20), top = Math.round(feet - h * k);
      r.withAlpha(0.4 * (1 - t / 28), () => r.dither(cx - hw, top, hw * 2, feet - top, '#d9d2ea', 0.5));
    }, 'top');
    this.particles(cx, feet - 20, 14, { colors: ['#d9d2ea', GREY, '#ffffff'], dir: -Math.PI / 2, spread: 0.7, speed: 1.2, life: 30, size: 1, radius: hw });
  },
  /** The lines come back (a read, the turns): warm letters settle on the member. */
  fx_ep8_back(o) {
    const { cx, cy } = this.center(o);
    this.particles(cx, cy - 18, 12, { colors: GOLDC, dir: Math.PI / 2, spread: 1, speed: 0.9, life: 22, size: 1, radius: 10, shrink: true });
    this.bloom(cx, cy, '#fff7d6');
  },
  /** Read Aloud: gold letters leave Mira's book and travel to the one she reads (herself: they circle her). */
  fx_ep8_read(o) {
    const x0 = Math.round(o.x || 0), y0 = Math.round((o.y || 0) - (o.h || 36) * 0.6);
    const self = o.toX == null || (Math.abs(o.toX - x0) < 2);
    const x1 = Math.round(o.toX ?? x0), y1 = Math.round(o.toY ?? y0);
    this.add(32, (r, t) => {
      for (let i = 0; i < 5; i++) {
        const k = Math.min(1, Math.max(0, (t - i * 4) / 18));
        if (k <= 0 || k >= 1) continue;
        let x, y;
        if (self) { const a = k * Math.PI * 2 + i; x = Math.round(x0 + Math.cos(a) * 12); y = Math.round(y0 + Math.sin(a) * 6); }
        else { x = Math.round(x0 + (x1 - x0) * k); y = Math.round(y0 + (y1 - y0) * k - Math.sin(Math.PI * k) * 12); }
        r.withAlpha(1 - k * 0.4, () => { r.rect(x - 1, y - 1, 4, 5, INK); r.rect(x, y, 2, 3, GOLDC[i % 4]); });
      }
    }, 'top');
    this.sparkles(x0, y0, 6, GOLDC, 20, 8);
  },
  /** An unwriting broken by Read Aloud: the grey peels off the target in a ring of gold letters. */
  fx_ep8_break(o) {
    const { cx, cy } = this.center(o);
    const span = Math.max(14, Math.round((o.w || 24) / 2) + 6);
    this.particles(cx, cy, 24, { colors: [...GOLDC, '#d9d2ea'], speed: 2.2, life: 32, gravity: 0.06, size: 2, shrink: true, radius: span, radiusY: Math.round((o.h || 36) / 2) });
    this.fx_ring(o, { color: '#f9d77a', r0: 6, r1: span + 22, frames: 16 });
  },
  /** The hero answers the Last Silence: the white lifts off the Eraser in a ring. */
  fx_ep8_answer(o) {
    const { cx, cy } = this.center(o);
    this.particles(cx, cy, 30, { colors: [...GOLDC, '#ffffff'], speed: 2.4, life: 34, gravity: 0.05, size: 2, shrink: true, radius: Math.round((o.w || 120) / 3), radiusY: Math.round((o.h || 120) / 4) });
    this.fx_ring(o, { color: '#fff7d6', r0: 10, r1: 70, frames: 18 });
  },
  /** A look changes: pages rub away off the Eraser's robes. */
  fx_ep8_look(o) {
    const { cx, cy } = this.center(o);
    this.particles(cx, cy, 36, { colors: ['#fff7d6', '#e8dcc0', '#d9d2ea', '#8a84a6'], speed: 2, life: 36, drift: 0.6, size: 2, shrink: true, radius: Math.round((o.w || 120) / 3), radiusY: Math.round((o.h || 120) / 3) });
  },
  /** Grief and Change step out of the folds. */
  fx_ep8_truth(o) {
    const { cx, cy } = this.center(o);
    this.particles(cx, cy, 18, { colors: ['#e8dcc0', '#d9d2ea', '#5a5280'], speed: 1.4, life: 26, drift: 0.5, size: 2, shrink: true, radius: 10 });
    this.fx_ring({ ...o, h: 0 }, { color: '#d9d2ea', r0: 2, r1: 20, frames: 16, squash: 0.35 });
  },
};

// ---------------------------------------------------------------------------------------------------- the planner
const unitId = (P, uid) => (P.units[uid] && P.units[uid].id) || null;
/** Does this plan's battle have an erasing foe (an Episode 8 battle)? Message kinds and delay reasons are read only there. */
const erasingPlan = (P) => Object.values(P.units || {}).some((u) => u && u.side === 'enemy' && ENEMIES[u.id] && ENEMIES[u.id].erasing);
const fill = (s, vars) => { let out = String(s || ''); for (const [k, v] of Object.entries(vars || {})) out = out.split(`{${k}}`).join(v); return out; };
const isPinSkill = (id) => id === UNWRITE;
const isEraserLook = (sprite) => ERASER_LOOKS.includes(sprite);

function wrapPlanner(P) {
  const base = { battle_start: P.ev_battle_start, telegraph: P.ev_telegraph, telegraph_cancel: P.ev_telegraph_cancel, message: P.ev_message,
    phase: P.ev_phase, summon: P.ev_summon, delay: P.ev_delay, castOpen: P.castOpen, enemyOpen: P.enemyOpen };
  P.ev_battle_start = function (e) {
    base.battle_start.call(this, e);
    const boss = (e.units || []).find((u) => u.side === 'enemy' && EP8_ARC_LINES[u.id]);
    if (!boss) return;
    for (let i = this.ops.length - 1; i >= 0; i--) if (this.ops[i].op === 'help') { this.ops[i].text = EP8_ARC_LINES[boss.id]; this.ops[i].color = 'cream'; break; }
  };
  // ---- Erasure's own events (erasure.js, ai.js); every one is new to the core planner
  P.ev_erasure = function () { this.push({ op: 'er8Init' }); };
  P.ev_rub = function (e) {
    this.push({ op: 'er8Rub', uid: e.target, cmd: e.command, left: e.left });
    this.push({ op: 'fx', kind: 'ep8_rub', uid: e.target });
    this.push({ op: 'flash', uid: e.target, color: '#d9d2ea', frames: 10, soft: true });
  };
  P.ev_rub_end = function (e) { this.push({ op: 'er8RubEnd', uid: e.target, cmd: e.command }); };
  P.ev_ink_slide = function (e) { this.push({ op: 'fx', kind: 'ep8_slide', uid: e.target }); this.push({ op: 'sfx', id: e.sfx || 'ink_slide', volume: 0.8 }); };
  P.ev_unwrite_pin = function () { /* the telegraph that follows draws it */ };
  P.ev_unwrite_land = function (e) { this.push({ op: 'telegraphCancel', actor: e.source, fired: true }); };
  P.ev_unwritten = function (e) {
    this.push({ op: 'er8Unw', uid: e.target, on: true });
    this.push({ op: 'fx', kind: 'ep8_unwrite', uid: e.target });
    this.push({ op: 'sfx', id: e.sfx || 'rub_out' });
    this.wait(10);
  };
  P.ev_unwritten_end = function (e) {
    this.push({ op: 'er8Unw', uid: e.target, on: false });
    this.push({ op: 'fx', kind: 'ep8_back', uid: e.target });
  };
  P.ev_unwrite_broken = function (e) {
    this.push({ op: 'telegraphCancel', actor: e.source });
    if (e.reason === 'read') {
      this.push({ op: 'fx', kind: 'ep8_break', uid: e.target });
      this.push({ op: 'sfx', id: e.sfx || 'unwrite_break' });
      this.push({ op: 'shake', mag: 2, frames: 8 });
      this.wait(8);
    }
  };
  P.ev_read = function () { /* castOpen drew the letters; the message says it */ };
  P.ev_silence_broken = function (e) {
    this.push({ op: 'telegraphCancel', actor: e.source });
    if (e.reason === 'answer') {
      this.push({ op: 'fx', kind: 'ep8_answer', uid: e.source });
      this.push({ op: 'sfx', id: e.sfx || 'unwrite_break' });
      this.push({ op: 'shake', mag: 3, frames: 10 });
      this.wait(10);
    }
  };
  // the Unwrite (a pin) and the Last Silence (a charge): their own sound, the line, and the answerer's hint appended while true
  P.ev_telegraph = function (e) {
    const sk = e.skill;
    if (!(e.unwrite || isPinSkill(sk) || sk === SILENCE)) return base.telegraph.call(this, e);
    this.pose(e.actor, 'cast');
    this.push({ op: 'telegraph', actor: e.actor, skill: sk, name: e.name, text: e.text, target: e.target, targets: e.targets || [], nextTurn: e.nextTurn, er8: sk === SILENCE ? 'silence' : 'pin' });
    if (sk === SILENCE) {
      this.push({ op: 'er8Jingle', id: 'silence_gather' });
      this.push({ op: 'fx', kind: 'telegraph', uid: e.actor });
    } else {
      this.push({ op: 'sfx', id: 'unwrite_read' });
      this.push({ op: 'fx', kind: 'ep8_rub', uid: e.target });
    }
    this.push({ op: 'help', text: `{c:orange}${e.text}{/c}`, color: null, hint8: sk === SILENCE ? 'answer' : 'read' });
    this.wait(FRAMES.telegraph + 12);
  };
  P.ev_telegraph_cancel = function (e) {
    const pin = isPinSkill(e.skill), sil = e.skill === SILENCE;
    if (!pin && !sil) return base.telegraph_cancel.call(this, e);
    if (e.reason === 'break' || e.reason === 'phase') return base.telegraph_cancel.call(this, e);
    this.push({ op: 'telegraphCancel', actor: e.actor });   // read / landed / answered: their own events said it
  };
  P.ev_delay = function (e) {
    const r = e.reason;
    if ((r !== 'read' && r !== 'unwritten' && r !== 'answer') || !erasingPlan(this)) return base.delay.call(this, e);
    if ((r === 'read' || r === 'answer') && e.amount > 0 && this.side(e.target) === 'enemy') {
      this.push({ op: 'fx', kind: 'knockback', uid: e.target });
      this.help(fill(T.thrown_back, { foe: String(this.name(e.target)).replace(/^The /, '') }), 'gold');
      this.wait(FRAMES.delay);
    }
  };
  P.ev_message = function (e) {
    if (!erasingPlan(this)) return base.message.call(this, e);
    const k = e.kind;
    const id = unitId(this, e.target);
    const say = (text, color, extra = 0, more = {}) => { this.push({ op: 'help', text, color, ...more }); this.wait(FRAMES.message + extra); };
    switch (k) {
      case 'rub_out': return say(e.text, 'violet');
      case 'ink_slide': return say(T.ink_slides, 'cyan');
      case 'ink_refused': return say(e.text, 'gold', 0, { once8: ONCE.ink });
      case 'unwrite': case 'unwrite_hint': case 'silence_hint': this.wait(2); return undefined;   // the telegraph said it
      case 'unwrite_broken': return say(e.text, 'gold', 12);
      case 'unwritten': return say(e.text, 'orange');
      case 'unwritten_end': return say(e.text, 'cyan');
      case 'read': return say(e.text, 'cyan');
      case 'fresh_ink': return say(T.fresh_ink, 'cyan');
      case 'no_erasure': case 'no_unwrite': return say(e.text, 'cyan');
      case 'faceplate': this.push({ op: 'fx', kind: 'ep8_look', uid: e.target }); this.push({ op: 'sfx', id: 'glass_break', volume: 0.6 }); return say(T.faceplate, 'violet');
      case 'stand_in': return say(T.stand_in, 'violet');
      case 'weep': this.push({ op: 'fx', kind: 'ep8_slide', uid: e.target }); return say(T.mend, 'violet');
      case 'silence': if (e.text === 'The page goes quiet.') { this.wait(2); return undefined; } return say(e.text, 'orange');
      case 'silence_broken': return say(e.text, 'gold', 12);
      default: break;
    }
    if (k === 'ward_break' && id === 'eraser') {
      this.push({ op: 'ward', uid: e.target, on: false });
      this.push({ op: 'fx', kind: 'ep8_look', uid: e.target });
      this.push({ op: 'sfx', id: 'glass_break' });
      this.push({ op: 'shake', mag: 3, frames: 14 });
      this.push({ op: 'er8Gold' });
      return say(T.ward_breaks, 'orange', 12);
    }
    return base.message.call(this, e);
  };
  // the Eraser's looks: pages rub off him and the next look swaps in (no white flash: the finale's photosensitivity rule)
  P.ev_phase = function (e) {
    if (unitId(this, e.actor) !== 'eraser' || !isEraserLook(e.sprite)) return base.phase.call(this, e);
    if (e.phase <= 1) { this.help(e.text, 'orange'); this.wait(FRAMES.message); return; }
    this.push({ op: 'banner', text: e.name || `Phase ${e.phase}`, style: 'phase' });
    this.push({ op: 'fx', kind: 'ep8_look', uid: e.actor });
    this.push({ op: 'sfx', id: e.phase >= 4 ? 'unwrite_read' : 'page_flutter', volume: 0.8 });
    this.push({ op: 'shake', mag: 3, frames: 16 });
    this.wait(14);
    this.push({ op: 'swapSprite', uid: e.actor, sprite: e.sprite });
    this.push({ op: 'reveal', uid: e.actor, reset: true });
    if (e.phase === 3) this.push({ op: 'er8Gold' });
    if (e.phase >= 4) { this.push({ op: 'er8Music', id: 'boss_eraser_silence', fade: 1.2 }); this.push({ op: 'er8Pulse' }); }
    this.help(e.text || `${this.name(e.actor)} changes.`, 'orange');
    this.wait(FRAMES.phase);
  };
  P.ev_summon = function (e) {
    if (e.id !== 'truth_grief' && e.id !== 'truth_change') return base.summon.call(this, e);
    this.push({ op: 'summon', uid: e.enemy, id: e.id, name: e.name, variant: e.variant, tint: e.tint, hp: e.hp, by: e.by, split: false });
    this.push({ op: 'fx', kind: 'ep8_truth', uid: e.enemy });
    this.push({ op: 'sfx', id: 'page_flutter', volume: 0.7 });
    this.wait(FRAMES.summon);
  };
  // Read Aloud: gold letters from Mira's book to the one she reads
  P.castOpen = function (actor, start, targets) {
    if (!(start.action && start.action.skill === READ)) return base.castOpen.call(this, actor, start, targets);
    this.pose(actor, 'cast');
    this.push({ op: 'fx', kind: 'ep8_read', uid: actor, to: (targets || [])[0] || null });
    this.push({ op: 'sfx', id: start.sfx || 'read_cast' });
    this.wait(FRAMES.castWindup + 6);
  };
  // an Unwrite lands (its events say the rest); the Last Silence lands: the page goes white, then back
  P.enemyOpen = function (actor, start, rest, targets) {
    const id = start.action && start.action.skill;
    if (isPinSkill(id)) {
      this.pose(actor, 'cast');
      this.push({ op: 'telegraphCancel', actor, fired: true });
      this.push({ op: 'fx', kind: 'enemy_cast', uid: actor });
      this.push({ op: 'sfx', id: 'unwrite_read', volume: 0.7 });
      this.wait(FRAMES.enemySpell);
      return undefined;
    }
    if (id === SILENCE) { this.push({ op: 'er8Pulse' }); this.push({ op: 'help', text: T.silence_land, color: 'orange' }); }
    return base.enemyOpen.call(this, actor, start, rest, targets);
  };
}

// ---------------------------------------------------------------------------------------------------- the stage (grades, white-out)
function stageMeta(engine, key) {
  const rec = BACKDROPS[key];
  try { if (rec && engine.assets.has(rec.asset)) { const a = engine.assets.atlas(rec.asset); return (a && a.meta) || null; } } catch (e) { return null; }
  return null;
}
function initStage(scene) {
  const bl = scene.backdropLayer, key = bl && bl.key;
  scene.st8 = null;
  if (!key || !EP8_BACKDROPS[key]) return;
  const meta = stageMeta(scene.engine, key) || {};
  const g = meta.grades && meta.grades.gold;
  const wo = meta.whiteout || {};
  scene.st8 = { key, base: null, violet: null, gold: null, k: 0, goal: 0, painted: -1, tone: (g && g.tone) || GOLD.tone, rows: (g && g.rows) || GOLD.rows,
    white: { color: wo.color || WHITE.color, alpha: whiteAlpha(wo.alpha || WHITE.alpha), frames: wo.frames || WHITE.frames, hold: wo.holdFrames ?? WHITE.holdFrames },
    wk: 0, pulse: null };
}
/** The Last Word's violet and gold copies (once per stage layer). */
function gradeLayers(scene) {
  const st = scene.st8, bl = scene.backdropLayer, r = scene.engine.renderer;
  if (!st || st.key !== GOLD_STAGE || !bl || st.base === bl || typeof r.createLayer !== 'function') return;
  st.base = bl;
  const violet = r.createLayer(bl.w, bl.h), gold = r.createLayer(bl.w, bl.h);
  violet.ctx.drawImage(bl.canvas, 0, 0);
  gold.ctx.drawImage(bl.canvas, 0, 0);
  const y1 = Math.max(1, Math.min(bl.h, (st.rows && st.rows[1]) || (bl.band && bl.band.y) || 118));
  try {
    const id = gold.ctx.getImageData(0, 0, bl.w, bl.h);
    paintClear(id.data, bl.w, bl.h, y1, st.tone);
    gold.ctx.putImageData(id, 0, 0);
  } catch (e) {   // a tainted canvas (file://): a warm lift instead
    gold.ctx.save(); gold.ctx.globalCompositeOperation = 'screen'; gold.ctx.globalAlpha = 0.3; gold.ctx.fillStyle = '#fff1d8';
    gold.ctx.fillRect(0, 0, bl.w, y1); gold.ctx.restore();
  }
  st.violet = violet; st.gold = gold; st.painted = -1;
  paintGrade(scene);
}
function paintGrade(scene) {
  const st = scene.st8, bl = scene.backdropLayer;
  if (!st || !bl || !st.violet || st.painted === st.k) return;
  const g = bl.ctx;
  g.save();
  g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
  g.drawImage(st.violet.canvas, 0, 0);
  if (st.k > 0) { g.globalAlpha = st.k; g.drawImage(st.gold.canvas, 0, 0); }
  g.restore();
  st.painted = st.k;
  if ((st.k === 0 || st.k === 1) && scene.engine.renderer.setBackdrop) scene.engine.renderer.setBackdrop(bl.canvas);
}
/** Is the Last Silence charging on the stage now (the scene's telegraphs)? */
export function silenceUp(scene) { for (const t of (scene.telegraphs || new Map()).values()) if (t.skill === SILENCE) return true; return false; }
/** The white-out's strength now (0..1): toward 1 while the Silence charges; a pulse (in, hold, out) as phase 4 opens and as it lands. */
export function whiteGoal(st, charging) {
  if (charging) return 1;
  const p = st.pulse;
  if (p == null) return 0;
  return p < st.white.frames + st.white.hold ? 1 : 0;
}
function tickStage(scene) {
  const st = scene.st8;
  if (!st) return;
  gradeLayers(scene);
  const sp = Math.max(1, scene.speed || 1);
  if (st.k !== st.goal) {
    const step = sp / GRADE_FRAMES;
    st.k = st.k < st.goal ? Math.min(st.goal, st.k + step) : Math.max(st.goal, st.k - step);
    paintGrade(scene);
  }
  const goal = whiteGoal(st, silenceUp(scene));
  const step = sp / Math.max(1, st.white.frames);
  st.wk = st.wk < goal ? Math.min(goal, st.wk + step) : Math.max(goal, st.wk - step);
  if (st.pulse != null) { st.pulse += sp; if (st.pulse > st.white.frames * 2 + st.white.hold) st.pulse = null; }
}
/** The white-out over the stage (under the HUD): never above CAP_LUMA of rise for any pixel. */
function drawWhite(scene, r) {
  const st = scene.st8;
  if (!st || st.wk <= 0) return;
  r.withAlpha(Math.min(CAP_LUMA, st.white.alpha * st.wk), () => r.rect(0, 0, W, H, st.white.color));
}

// ---------------------------------------------------------------------------------------------------- actor marks
/** The unwriting's ribbon on the stage: a grey line from its owner to the target's head, sagging up, a pale glint along it. */
export function drawGreyRibbon(r, from, to, frame, k = 1) {
  const f = steadyFrame(r, frame);
  const x0 = from.cx, y0 = from.top + Math.round(from.h * 0.35), x1 = to.cx, y1 = to.top + 3;
  const n = Math.max(8, Math.round(Math.hypot(x1 - x0, y1 - y0)));
  const lift = Math.min(8, Math.abs(x1 - x0) * 0.04);
  const glint = (f % 60) / 60;
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    if (u > k) break;
    const wave = Math.sin(u * 7 + f / 14) * 1.2;
    pts.push([Math.round(x0 + (x1 - x0) * u), Math.round(y0 + (y1 - y0) * u - Math.sin(Math.PI * u) * lift + wave), u]);
  }
  // a 2 px grey band with an ink edge under it (1 px read as a dark thread on the phone)
  for (const [x, y] of pts) r.rect(x, y - 1, 2, 4, INK);
  for (const [x, y] of pts) r.rect(x, y, 2, 2, GREY);
  for (const [x, y] of pts) r.rect(x, y, 1, 1, '#d9d2ea');
  for (const [x, y, u] of pts) if (Math.abs(u - glint) < 0.04) r.rect(x - 1, y - 1, 3, 3, '#ffffff');
}
function wrapActor(A) {
  const draw = A.draw;
  A.draw = function (r, opts) {
    const s = this.engine.scene, v = s && s.er8;
    if (!v || this.dead || this.side !== 'party' || !this.alive || !v.unw[this.uid] || this.flash) return draw.call(this, r, opts);
    // an Unwritten member is drawn greyed (a pale grey tint over the frame)
    this.flash = { color: GREY, frames: 3, total: 3, hold: false, soft: true };
    try { return draw.call(this, r, opts); } finally { this.flash = null; }
  };
}

// ---------------------------------------------------------------------------------------------------- the scene view
/** The Erasure view of a battle (presentation; it follows the ops, a beat behind the rules, and re-reads the rules once they settle). */
function initView(scene) {
  const S = scene.b && scene.b.state && scene.b.state.erasure;
  scene.er8 = null;
  if (!S) return;
  scene.er8 = { rub: {}, unw: {}, pop: {}, hinted: false };
  syncView(scene);
}
function syncView(scene) {
  const v = scene.er8, S = erasureState(scene.b);
  if (!v || !S) return;
  v.rub = Object.fromEntries(Object.entries(S.rub || {}).map(([u, list]) => [u, list.map((x) => ({ cmd: x.cmd, left: x.left }))]));
  v.unw = Object.fromEntries(Object.entries(S.unwritten || {}).map(([u, w]) => [u, { left: w.left }]));
}
const settled = (scene) => scene.phase === 'play' && (scene.opIndex == null || !scene.ops || scene.opIndex >= scene.ops.length);
/** The pinned Unwrite as the stage shows it (the scene's telegraphs), or null: { source, target, t }. */
export function pinShown(scene) {
  for (const [uid, t] of (scene.telegraphs || new Map())) if (isPinSkill(t.skill) && t.target) return { source: uid, target: t.target, tele: t };
  return null;
}
/** "Mira can read him back." while it is true (Mira acts before the pin lands and can Read Aloud: ai.js miraReads), else ''. */
export function readLine(scene) {
  const b = scene.b, S = erasureState(b);
  if (!S || !S.pin || !miraReads(b)) return '';
  const t = b.unit(S.pin.target);
  const line = (T.can_read_by && t && T.can_read_by[t.id]) || fill(T.can_read, { name: t ? t.name : '' });
  return ` {c:gold}${line}{/c}`;
}
/** "{hero} can answer it." while it is true (the hero acts before the Last Silence lands and can Answer: ai.js heroAnswers), else ''. */
export function answerLine(scene) {
  const b = scene.b;
  if (!erasureState(b) || !heroAnswers(b)) return '';
  const h = b.unit(HERO) || b.living('party').find((u) => u.id === HERO);
  return ` {c:gold}${fill(T.can_answer, { hero: h ? h.name : 'The hero' })}{/c}`;
}
const hintOf = (scene, kind) => (kind === 'answer' ? answerLine(scene) : kind === 'read' ? readLine(scene) : '');
/** Once a save (game.counters): true the first time, false after. */
function onceSave(scene, key) {
  const g = scene.engine.game;
  if (!g) return true;
  g.counters = g.counters || {};
  if (g.counters[key]) return false;
  g.counters[key] = 1;
  return true;
}
/** Once per save: Mira under Read Aloud's MP in a fight with a pin boss. */
function lowMpHint(scene, op) {
  const v = scene.er8;
  if (!v || v.hinted || !(op.mp < LOW_MP)) return;
  const m = scene.b.unit(op.uid);
  if (!m || m.id !== MIRA || !m.alive || !(m.skills || []).includes(READ)) return;
  if (!scene.b.units().some((u) => u.id === 'eraser' || u.id === 'unnamed_sentry')) return;
  v.hinted = true;
  if (!onceSave(scene, ONCE.mp)) return;
  const at = scene.ops.length && scene.ops[scene.ops.length - 1].op === 'end' ? scene.ops.length - 1 : scene.ops.length;
  scene.ops.splice(Math.max(scene.opIndex, at), 0, { op: 'help', text: T.low_mp, color: 'cyan' }, { op: 'wait', frames: 48 });
}

/** The members whose rows are rubbed (or Unwritten), as the HUD shows them: uid -> [{ cmd, left }]. */
export function rubbedRows(v, uid) {
  if (!v) return [];
  if (v.unw[uid]) return RUBBABLE_ROWS.map((cmd) => ({ cmd, left: v.unw[uid].left }));
  return v.rub[uid] || [];
}
/** Eraser crumbs under each member's name in the party window (one per rubbed command; the last turn's fainter). */
function drawCrumbs(scene, r) {
  const v = scene.er8;
  if (!v) return;
  scene.party().forEach((a, i) => {
    if (i >= 3 || a.ko || a.hp <= 0) return;
    const rows = v.unw[a.uid] ? [{ left: v.unw[a.uid].left }, { left: v.unw[a.uid].left }] : (v.rub[a.uid] || []);
    if (!rows.length) return;
    const L = statusRow(i);
    rows.slice(0, 2).forEach((x, k) => drawCrumb(r, L.name[0] + k * 7, L.y + 13, x.left <= 1));
  });
}
/** Over the timeline (drawn this frame): a smudge over a member's next heads while a row of theirs is rubbed, the unwriting's ribbon
 * from its owner's slot to its target's with the target's name smudged under it, and the Last Silence's charge bar over the Eraser's row. */
function drawTimelineMarks(scene, r) {
  const v = scene.er8, order = scene.timeline || [];
  if (!v) return;
  const n = Math.min(TL.slots, order.length);
  const at = {}, seen = {};
  for (let i = 0; i < n; i++) {
    const uid = order[i] && order[i].uid;
    if (!uid) continue;
    if (at[uid] == null) at[uid] = i;
    const rows = rubbedRows(v, uid);
    if (!rows.length) continue;
    const turns = Math.max(...rows.map((x) => x.left || 1));
    seen[uid] = (seen[uid] || 0) + 1;
    if (seen[uid] > turns) continue;
    const sx = timelineSlotX(i), sy = TL.y;
    r.withAlpha(0.7, () => r.dither(sx + 3, sy + 9, 12, 6, '#d9d2ea', 0.5));
    r.rect(sx + 4, sy + 12, 10, 1, '#ffffff');
    drawCrumb(r, sx + 12, sy + 13, false);
  }
  const p = pinShown(scene);
  if (!p || at[p.target] == null) return;
  const xt = timelineSlotX(at[p.target]) + 9;
  const xs = at[p.source] != null ? timelineSlotX(at[p.source]) + 9 : timelineSlotX(TL.slots - 1) + 20;
  const y = TL.y + 20;
  const lo = Math.min(xs, xt), hi = Math.max(xs, xt);
  r.rect(lo - 1, y - 1, hi - lo + 3, 4, INK);
  r.rect(xs - 1, TL.y + 17, 3, 4, INK); r.rect(xt - 1, TL.y + 17, 3, 4, INK);
  r.rect(lo, y, hi - lo + 1, 2, GREY); r.rect(xs, TL.y + 18, 1, 2, GREY); r.rect(xt, TL.y + 18, 1, 2, GREY);
  const glint = lo + ((steadyFrame(r, scene.frame) >> 1) % Math.max(1, hi - lo + 1));
  r.rect(glint, y, 2, 1, '#e8e4f2');
  const t = scene.actor(p.target);
  if (t) {
    const nm = t.name, w = r.measure(nm) + 6;
    const nx = Math.max(TL.x, Math.min(W - 4 - w, xt - Math.round(w / 2)));
    r.rect(nx, y + 3, w, 11, INK);
    drawSmudgedWord(r, nm, nx + 3, y + 4, w, null);
  }
}
/** The charge bar over the Eraser's row while the Last Silence gathers: it fills as the Eraser's turn comes round. */
export function chargeFill(order, uid, start) {
  const i = (order || []).findIndex((x) => x && x.uid === uid);
  if (i < 0) return 1;
  return Math.max(0, Math.min(1, 1 - i / Math.max(1, start)));
}
function drawChargeBar(scene, r) {
  const plan = scene._er8Rows;
  if (!plan) return;
  for (const [uid, t] of scene.telegraphs) {
    if (t.skill !== SILENCE) continue;
    const p = plan.get(uid);
    if (!p || !p.rect) continue;
    if (t.start8 == null) { const i = (scene.timeline || []).findIndex((x) => x && x.uid === uid); t.start8 = Math.max(1, i); }
    // beside the row at its middle (over it sit the status badges, under it the hood): a 34 x 4 bar that fills toward the landing
    const k = Math.max(0.12, chargeFill(scene.timeline, uid, t.start8));
    const w = CHARGE_W, x = Math.min(W - w - 4, p.rect.x + p.rect.w + 3), y = p.rect.y + Math.round((p.rect.h - 4) / 2);
    r.rect(x - 1, y - 1, w + 2, 6, INK);
    r.rect(x, y, w, 4, '#5a5280');
    const fw = Math.max(1, Math.round(w * k));
    r.rect(x, y, fw, 4, '#fff7d6');
    r.rect(x, y, fw, 1, '#ffffff');
    const f = steadyFrame(r, scene.frame);
    if (stillOf(r) || !((f >> 4) & 1)) r.rect(x + fw - 1, y - 1, 2, 6, '#f9d77a');
  }
}
const stillOf = (r) => !!(r && r.settings && r.settings.reduceMotion);
/** The unwriting's ribbon on the stage, over the units; the white-out over the whole stage. */
function drawStageMarks(scene, r) {
  const p = pinShown(scene);
  if (p) {
    const from = scene.actor(p.source), to = scene.actor(p.target);
    if (from && to && from.alive && to.alive) {
      if (p.tele.t8 == null) p.tele.t8 = 0;
      drawGreyRibbon(r, from, to, scene.frame, Math.min(1, p.tele.t8 / 18));
    }
  }
  drawWhite(scene, r);
}

/**
 * The rows of the Eraser and the Rejected Truths (CRITIQUE_8 item 1): the Eraser's over its hood, one anchor in all four looks; Grief's
 * and Change's under their own feet (in the feet band above the party window), side by side ROW_GAP apart, clear of the touch command
 * window and of the party; the Sentry's under its own feet. Pure on the plan.
 */
export function steadyRows(plan, { actors, docked = true }) {
  const live = actors.filter((a) => a && !a.dead && !a.ko);
  const byUid = new Map(live.map((a) => [a.uid, a]));
  const clampX = (x, w) => Math.max(4, Math.min(W - w - 4, Math.round(x)));
  const off = (a) => ({ dx: Math.round((a.x ?? 0) - (a.homeX ?? a.x ?? 0)), dy: Math.round((a.y ?? 0) - (a.homeY ?? a.y ?? 0)) });
  const set = (p, a, x, y, place) => {
    const o = off(a);
    p.at = { x: x + o.dx, y: y + o.dy }; p.rect = { x: x + o.dx, y: y + o.dy, w: p.rect.w, h: ENEMY_ROW_H }; p.place = place; p.lift = 0;
  };
  const low = [];
  const entries = [...plan.entries()].filter(([uid]) => byUid.has(uid));
  entries.sort((x, y) => (byUid.get(x[0]).homeX ?? 0) - (byUid.get(y[0]).homeX ?? 0));
  for (const [uid, p] of entries) {
    const a = byUid.get(uid);
    if (!p.rect) continue;
    const hx = a.homeX ?? a.x, hy = a.homeY ?? a.y;
    if (a.id === 'eraser') {
      const y = docked ? Math.max(2, hy + HOOD.dy - ENEMY_ROW_H - 2) : HELP_TALLEST + 8;
      set(p, a, clampX(hx + HOOD.dx - HOOD_LEFT, p.rect.w), y, 'band');
    } else if (a.id === 'truth_grief' || a.id === 'truth_change' || a.id === 'unnamed_sentry') {
      const y = Math.min(hy + 3, STATUS_WIN.y - ENEMY_ROW_H - 2);
      low.push({ p, a, x: Math.round(hx - p.rect.w / 2), y });
    }
  }
  // the feet band rows, left to right: each wants its centre under its feet, all of them between the touch command window and the
  // party, ROW_GAP apart; pushed left when the right one would reach the party; a row that still cannot fit climbs one row
  const minX = CMD_WIN_TOUCH.x + CMD_WIN_TOUCH.w + 2, maxR = PARTY_LEFT - CLEAR_PX;
  for (let i = 0; i < low.length; i++) low[i].x = Math.max(minX, i ? Math.max(low[i].x, low[i - 1].x + low[i - 1].p.rect.w + ROW_GAP) : low[i].x);
  for (let i = low.length - 1; i >= 0; i--) {
    const right = i === low.length - 1 ? maxR : low[i + 1].x - ROW_GAP;
    low[i].x = Math.min(low[i].x, right - low[i].p.rect.w);
    if (low[i].x < minX) { low[i].x = Math.max(minX, Math.min(Math.round(low[i].a.homeX - low[i].p.rect.w / 2), maxR - low[i].p.rect.w)); low[i].y -= ENEMY_ROW_H + 2; }
  }
  for (const L of low) set(L.p, L.a, clampX(L.x, L.p.rect.w), L.y, 'below');
  return plan;
}

function wrapScene(B) {
  const base = { enter: B.enter, update: B.update, runOp: B.runOp, planEnemyRows: B.planEnemyRows, drawHelpWindow: B.drawHelpWindow,
    party: B.party, drawLog: B.drawLog, draw: B.draw };
  B.enter = function (data) {
    base.enter.call(this, data);
    initView(this);
    initStage(this);
    this._er8Tl = false; this._er8Rows = null;
    if (this.st8) gradeLayers(this);
    if (this.fx && !this.fx.__er8) {
      const dov = this.fx.drawOver.bind(this.fx);
      this.fx.drawOver = (r) => { if (this.er8 || this.st8) drawStageMarks(this, r); dov(r); };
      this.fx.__er8 = true;
    }
  };
  B.update = function (dt, below) {
    base.update.call(this, dt, below);
    if (this.st8) tickStage(this);
    const v = this.er8;
    if (!v) return;
    if (settled(this)) syncView(this);
    const sp = Math.max(1, this.speed || 1);
    for (const t of this.telegraphs.values()) {
      if (t.er8 === 'pin' && t.t8 != null && t.t8 < 60) t.t8 += sp;
      // the answer is re-read while the telegraph stands: the hint only while it is still true
      if (t.er8 && t.base8 != null) t.text = t.base8 + hintOf(this, t.er8 === 'silence' ? 'answer' : 'read');
    }
  };
  B.draw = function (r) {
    if (!this.er8) return base.draw.call(this, r);
    this._er8Tl = false;
    try { return base.draw.call(this, r); } finally { this._er8Tl = false; this._er8Rows = null; }
  };
  B.drawHelpWindow = function (r) {
    base.drawHelpWindow.call(this, r);
    if (this.er8) { this._er8Tl = true; this._er8R = r; }
  };
  // the call that follows the timeline in draw() (the party status window's list): the timeline marks and the charge bar draw now
  B.party = function () {
    const list = base.party.call(this);
    if (!this._er8Tl || !this.er8) return list;
    this._er8Tl = false;
    if (this._er8R) { drawTimelineMarks(this, this._er8R); drawChargeBar(this, this._er8R); }
    this._er8Crumbs = true;
    return list;
  };
  B.drawLog = function (r) {
    if (this._er8Crumbs) { this._er8Crumbs = false; drawCrumbs(this, r); }
    return base.drawLog.call(this, r);
  };
  B.planEnemyRows = function (uids, touch, cwNow, helpBottom, scoreAll) {
    const plan = base.planEnemyRows.call(this, uids, touch, cwNow, helpBottom, scoreAll);
    if (!this.er8) return plan;
    const out = steadyRows(plan, { actors: [...this.actors.values()], docked: !!helpDock() });
    this._er8Rows = out;
    return out;
  };
  B.runOp = function (op) {
    const v = this.er8;
    switch (op.op) {
      case 'er8Init': if (!v) initView(this); return false;
      case 'er8Rub': if (v) { const l = (v.rub[op.uid] = (v.rub[op.uid] || []).filter((x) => x.cmd !== op.cmd)); l.push({ cmd: op.cmd, left: op.left }); while (l.length > 2) l.shift(); v.pop[op.uid] = 24; } return false;
      case 'er8RubEnd': if (v && v.rub[op.uid]) { v.rub[op.uid] = v.rub[op.uid].filter((x) => x.cmd !== op.cmd); if (!v.rub[op.uid].length) delete v.rub[op.uid]; } return false;
      case 'er8Unw': if (v) { if (op.on) v.unw[op.uid] = { left: 2 }; else delete v.unw[op.uid]; } return false;
      case 'er8Gold': if (this.st8 && this.st8.key === GOLD_STAGE) { this.st8.goal = 1; if (this.fast) { this.st8.k = 1; paintGrade(this); } } return false;
      case 'er8Pulse': if (this.st8 && !this.fast) this.st8.pulse = 0; return false;
      case 'er8Music': { const a = this.engine.audio; if (a && typeof a.music === 'function') a.music(op.id, { fade: op.fade }); return false; }
      case 'er8Jingle': { const a = this.engine.audio; if (!this.fast && a && typeof a.jingle === 'function') a.jingle(op.id, { duckMusic: 0.3 }); return false; }
      default: break;
    }
    if (v && op.op === 'help' && op.hint8) op = { ...op, text: op.text + hintOf(this, op.hint8) };
    if (v && op.op === 'help' && op.once8 && !onceSave(this, op.once8)) return false;
    const res = base.runOp.call(this, op);
    if (op.op === 'telegraph' && op.er8) { const t = this.telegraphs.get(op.actor); if (t) { t.er8 = op.er8; t.base8 = op.text; t.text = op.text + hintOf(this, op.er8 === 'silence' ? 'answer' : 'read'); if (op.er8 === 'pin') t.t8 = 0; } }
    if (v && op.op === 'summon') {
      const a = this.actor(op.uid), u = this.unit(op.uid);
      const spot = u && TRUTH_SPOTS[u.id];
      if (a && spot) { a.homeX = a.x = spot.x; a.homeY = a.y = spot.y; a.backRow = false; }
    }
    if (v && op.op === 'mp') lowMpHint(this, op);
    return res;
  };
}

// ---------------------------------------------------------------------------------------------------- the menu
/** Is this row rubbed (Erasure's commands carry `rubbed: { left, max }`)? */
const rubOf = (c) => (c && c.rubbed) || null;
/** Mira's Magic list opens on Read Aloud while an Unwrite is pinned; rubbed rows draw smudged; Read Aloud's icon; the cursor on the pin. */
function wrapMenu(M) {
  const open = M.open, openSub = M.openSub, sig = M.sig, startTarget = M.startTarget, draw = M.draw;
  M.open = function (unit) {
    const res = open.call(this, unit);
    const items = this.root ? this.root.items || [] : [];
    let changed = false;
    for (const it of items) {
      const rb = rubOf(it.cmd);
      if (!rb) continue;
      it.rub8 = rb;
      if (it.cmd.help) { it.help = it.cmd.help; changed = true; }
    }
    // Mira's signature lives in Magic, not Tech: the root opens there (the core opens a signature on Tech)
    const g = this.sig(unit);
    if (g && g.cmd === 'magic' && this.root) {
      const at = items.findIndex((x) => x.id === 'magic' && !x.disabled);
      if (at >= 0) { this.root.moveTo(at); changed = true; }
    }
    if (changed) this.syncHelp();
    return res;
  };
  M.sig = function (u) {
    const hit = sig.call(this, u);
    if (hit || !u || u.id !== MIRA) return hit;
    const t = this.scene && this.scene.telegraphs;
    if (!t || ![...t.values()].some((x) => x.er8 === 'pin' || isPinSkill(x.skill) || (SKILLS[x.skill] && SKILLS[x.skill].unwrite))) return hit;
    const magic = this.b.commands(u).find((c) => c.id === 'magic');
    const e = magic && (magic.list || []).find((x) => x.skill === READ);
    return e ? READ_SIG : hit;
  };
  M.openSub = function (cmd) {
    const ok = openSub.call(this, cmd);
    const L = this.sub;
    if (!ok || !L) return ok;
    const i = L.items.findIndex((x) => x.id === READ);
    if (i < 0) return ok;
    const g = cmd.id === 'magic' && this.sig(this.unit);
    // a rubbed-out Magic row opens with only Read Aloud lit: it comes first, under the cursor (on the phone a list folds at four rows)
    const rubbed = cmd.id === 'magic' && rubOf(cmd) && !(g && g.skill === READ);
    if (rubbed) { L.items.unshift(...L.items.splice(i, 1)); L.moveTo(0); this.syncHelp(); }
    if (g && g.skill === READ) {
      // first, in gold; Episode 5's Turn the Sky row (Mira's other signature) keeps its place below
      L.items.unshift(...L.items.splice(i, 1));
      for (const it of L.items) if (it.color === 'gold' && it.id !== READ) it.color = 'white';
      L.items[0].color = 'gold';
      L.moveTo(0);
      this.syncHelp();
    }
    const it = L.items.find((x) => x.id === READ);
    if (!L.icons) { L.icons = true; L.textX = 15; }
    it.draw = (r, rr, dim, alpha) => r.withAlpha(alpha * (dim ? 0.5 : 1), () => drawReadIcon(r, rr.x + L.iconX, rr.y + L.textDy));
    return ok;
  };
  // Read Aloud opens on the pin's target (the core opens an ally skill on the lowest HP share)
  M.startTarget = function (b) {
    const ok = startTarget.call(this, b);
    if (!ok || !b || b.skill !== READ || !this.tInfo) return ok;
    const S = erasureState(this.b), pin = S && S.pin;
    const i = pin ? this.tInfo.ids.indexOf(pin.target) : -1;
    if (i >= 0 && i !== this.tIndex) { this.tIndex = i; this.refreshPreview(); this.syncHelp(); }
    return ok;
  };
  // the rubbed rows: the List draws every row; for this one call the rubbed rows' words are left to drawSmudgedWord
  M.draw = function (r, frame) {
    const s = this.scene;
    if (s && s._er8Crumbs) { s._er8Crumbs = false; drawCrumbs(s, r); }
    const items = this.root && this.root.items ? this.root.items.filter((it) => it.rub8 && it.label) : [];
    if (!items.length) return draw.call(this, r, frame);
    const L = this.root;
    const saved = items.map((it) => [it, it.label, it.draw]);
    for (const it of items) {
      const label = it.label;
      it.label = null;
      it.draw = (rr, rect) => drawSmudgedWord(rr, label, rect.x + (L.textX ?? 2), rect.y + 1 + L.textDy, rect.w, it.rub8);
    }
    try { return draw.call(this, r, frame); } finally { for (const [it, label, d] of saved) { it.label = label; it.draw = d; } }
  };
}

// ---------------------------------------------------------------------------------------------------- the field (cutscene helpers)
const CAPTION_Y = 44;
/** Alpha of a caption `age` frames old (in, hold, out), null once gone (the cold open's curve, scenes/prologue.js). */
export function captionAlpha(age, total, inF = 8, outF = 20) {
  if (age < 0 || age >= total) return null;
  return age < inF ? age / inF : age >= total - outF ? Math.max(0, (total - age) / outF) : 1;
}
/** A toll's caption: the name in spaced capitals, as the cold open says them. */
export const tollCaptionText = (s) => String(s || '').toUpperCase().split('').join(' ');
function drawCaption(r, text, a, gold) {
  const w = (r.measure ? r.measure(text, 'large') : 140) + 24, x = Math.round(W / 2 - w / 2);
  r.withAlpha(0.55 * a, () => r.rect(x, CAPTION_Y - 4, w, 22, INK));
  r.text(text, Math.round(W / 2), CAPTION_Y, { font: 'large', align: 'center', color: gold ? 'gold' : 'cream', alpha: a });
}
/** The name strip of hudNameFlash: the party's names in a thin window at the top right, one of them lit gold (name_restore). */
export function drawNameStrip(r, members, lit, k, glow) {
  if (!members.length || k <= 0) return;
  const rowH = 12, w = 96, h = members.length * rowH + 8, x = W - 4 - w, y = 4;
  r.withAlpha(k, () => {
    drawWindow(r, x, y, w, h, { kind: 'thin' });
    members.forEach((m, i) => {
      const yy = y + 4 + i * rowH, on = m.id === lit;
      if (on && glow > 0) r.withAlpha(0.35 * glow, () => r.rect(x + 4, yy - 1, w - 8, 11, '#f9d77a'));
      r.text(m.name, x + 8, yy, { color: on ? 'gold' : 'white' });
    });
  });
}
function hookField(F) {
  if (!F || F.__er8 || typeof F.drawKeptBar !== 'function') return;
  const dk = F.drawKeptBar;
  F.drawKeptBar = function (r) {
    dk.call(this, r);
    const S = this.er8f;
    if (!S) return;
    const e = this.engine, now = e.frame || 0;
    if (S.cap) {
      const a = captionAlpha(now - S.cap.at, S.cap.total);
      if (a == null) S.cap = null;
      else if (a > 0 && !(this.fadeAlpha > 0.5)) drawCaption(r, S.cap.text, a, S.cap.gold);
    }
    if (S.flash) {
      const t = now - S.flash.at, total = S.flash.total;
      if (t >= total) S.flash = null;
      else {
        const members = (this.game && this.game.party || []).map((m) => ({ id: m.id, name: m.name }));
        const k = Math.min(1, t / 12, (total - t) / 16);
        const glow = stillOf(r) ? 1 : 0.5 + 0.5 * Math.sin(t / 6);
        drawNameStrip(r, members, S.flash.id, k, glow);
      }
    }
  };
  F.__er8 = true;
}
function hookBlot(dlg, frames) {
  if (!dlg || dlg.__blot8 || typeof dlg.draw !== 'function') return;
  const d = dlg.draw;
  let t = 0;
  dlg.draw = function (r) {
    d.call(this, r);
    const R = this.rect;
    if (!R) return;
    t++;
    const k = Math.min(1, t / frames);
    // an ink blot over the box: a dark pool, ragged at its edge, with a few drips (the name it took)
    const cx = R.x + Math.round(R.w * 0.42), cy = R.y + Math.round(R.h / 2);
    r.withAlpha(0.55 * k, () => r.ditherEllipse(cx, cy, Math.round(R.w * 0.22), Math.round(R.h * 0.32), INK, 0.6));
    r.withAlpha(0.8 * k, () => {
      r.ellipse(cx, cy, Math.round(R.w * 0.12), Math.round(R.h * 0.18), '#1e1830');
      for (let i = 0; i < 7; i++) { const x = cx - 30 + ((i * 37) % 60), y = cy + 4 + ((i * 11) % 6); r.rect(x, y, 2, 2 + (i % 3), '#1e1830'); }
    });
  };
  dlg.__blot8 = true;
}
function addHelpers(cs) {
  const api = cs && cs.api;
  if (!api || api.inkBlot) return;
  const E = cs.engine;
  const state = () => { hookField(cs.field); return cs.field ? (cs.field.er8f || (cs.field.er8f = { cap: null, flash: null })) : null; };
  /** A name the run took out of a memory: "..." under an ink blot, with `ink_gurgle`. */
  api.inkBlot = async (who) => {
    if (cs.dead) return;
    E.audio.sfx('ink_gurgle', { volume: 0.6 });
    const said = api.say(who, '...');
    for (let i = 0; i < 4 && !cs.dead; i++) {
      await cs.frames(1);
      const dlg = (E.stack || []).find((sc) => sc && sc.name === 'dialog');
      if (dlg) { hookBlot(dlg, 18); break; }
    }
    await said;
  };
  /** The name_restore flash on a party member's name: the party's names at the top right, `id`'s lit gold, about a second. */
  api.hudNameFlash = async (id) => {
    const S = state();
    if (!S || cs.dead) return;
    S.flash = { id, at: E.frame || 0, total: 72 };
    for (let i = 0; i < 72 && !cs.dead && S.flash; i++) await cs.frames(1);
  };
  /** The bell night's caption: a toll's name (or {hero}, in gold) in the cold open's style; it fades on its own. */
  api.tollName = async (text) => {
    const S = state();
    if (!S || cs.dead) return;
    const g = cs.field && cs.field.game;
    const hero = (g && (g.heroName || (g.party && g.party[0] && g.party[0].name))) || 'Hero';
    const raw = String(text || '');
    const isHero = raw === '{hero}';
    S.cap = { text: tollCaptionText(raw.split('{hero}').join(hero)), at: E.frame || 0, total: isHero ? 150 : 84, gold: isHero };
    await cs.frames(8);
  };
  /** An awaited map change that keeps the scene running (the field's own warp; the scene owns any fade around it). */
  api.goto = async (map, x, y, dir = 'down') => {
    const F = cs.field;
    if (!F || cs.dead) return;
    await F.warpTo(map, x, y, dir, 'warp');
    while (!cs.dead && (F.loading || F.pendingWarp)) await cs.frames(1);
  };
}
function wrapCutscene(Cs) {
  const run = Cs.run;
  Cs.run = async function (id) {
    addHelpers(this);
    try { return await run.call(this, id); } finally {
      if (this.field && this.field.er8f) this.field.er8f.flash = null;   // the name strip never outlives its scene (a caption fades on its own)
    }
  };
}

// ---------------------------------------------------------------------------------------------------- Load Game: the finished star
/** A 7 x 7 gold star (with its outline) left of a finished save's place name. */
const STAR = ['...y...', '..yyy..', 'yyywyyy', '.yyyyy.', '..yyy..', '.yy.yy.', 'y.....y'];
export function drawStar(r, x, y) { blitOutlined(r, STAR, x, y, { y: '#f9d77a', w: '#fff7d6' }); }
/** Did the save in `slot` finish Episode 8? (read once per savedAt) */
export function finishedSlot(save, s, cache = new Map()) {
  if (!s || !s.exists || !save) return false;
  const key = `${s.slot}:${s.savedAt || ''}`;
  if (cache.has(key)) return cache.get(key);
  let ok = false;
  try { const d = save.load(s.slot); ok = !!(d && d.flags && d.flags.ep8_complete); } catch (e) { ok = false; }
  cache.set(key, ok);
  return ok;
}
function wrapLoad(L) {
  const draw = L.draw;
  L.draw = function (r) {
    draw.call(this, r);
    const save = this.engine && this.engine.save;
    if (!save || !this.slots || !this.list) return;
    this.__star8 = this.__star8 || new Map();
    const tight = this.list.rowH < 46, ly0 = tight ? 3 : 5, ly1 = tight ? 14 : 17;
    this.slots.forEach((s, i) => {
      if (!this.list.isVisible(i) || !finishedSlot(save, s, this.__star8)) return;
      const { x, y, w } = this.slotRect(i);
      const m = s.meta || {}, b = BANNERS[m.map];
      const place = b ? b.title : (m.map || '');
      // beside the place name; a long one reaches the play time, and then the star stands beside the record's title instead
      const sx = x + w - 10 - r.measure(place) - 11, timeEnd = x + 180 + r.measure(fmtTime(m.playtime || 0));
      if (sx >= timeEnd + 6) drawStar(r, sx, y + ly1 + 1);
      else drawStar(r, x + 10 + r.measure(s.slot === 0 ? 'Autosave' : `Record ${s.slot}`) + 5, y + ly0 + 1);
    });
  };
}

let done = false;
/** Install everything above. Safe to call twice. Returns what went in. */
export function register() {
  if (done) return ['already'];
  for (const [k, v] of Object.entries(EP8_BACKDROPS)) if (!BACKDROPS[k]) BACKDROPS[k] = v;
  for (const [k, v] of Object.entries(EP8_BOSS_CARDS)) if (!BOSS_CARD[k]) BOSS_CARD[k] = v;
  if (!HEAD_BOX.eraser) HEAD_BOX.eraser = [0.465, 0.598, 0.086, 0.227];   // ep8_bosses_battle.json hud.eraser.head (the same box in all four)
  registerSignatures(SIGNATURE_TECHS);
  for (const [k, fn] of Object.entries(EP8_FX)) if (!BattleFx.prototype[k]) BattleFx.prototype[k] = fn;
  wrapPlanner(Planner.prototype);
  wrapActor(Actor.prototype);
  wrapScene(BattleScene.prototype);
  wrapMenu(CommandMenu.prototype);
  wrapCutscene(Cutscene.prototype);
  wrapLoad(LoadGameScene.prototype);
  done = true;
  return ['backdrops', 'cards', 'heads', 'signature', 'fx', 'planner', 'actor', 'scene', 'menu', 'cutscene', 'load'];
}
export default register;
