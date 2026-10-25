// Battle HUD: help/telegraph window (top left), the CTB timeline (top right), the party status window
// (bottom right), the enemy shield + weakness row, reticle, turn marker, telegraph marker, elite tags and
// the big banners (combo names, boss phases). All positions come from layout.js; art from assets/ui.

import { drawWindow, drawSelBar, drawGauge, drawLabel, drawIcon, uiAtlas } from '../../ui/window.js';
import { animFrameAt } from '../../core/assets.js';
import { HELP_WIN, STATUS_WIN, TL, timelineSlotX, statusRow, enemyRowAnchor, PORTRAIT_FACE, enemyFaceRect, BANNER_Y, W, H,
  HELP_LINE, HELP_LINES_MAX, helpDock, helpOrigin, headBox } from './layout.js';
import { frameOrigin } from './actors.js';

const PARTY_STATUS_ORDER = ['kept', 'poison', 'burn', 'chill', 'stun', 'silence', 'blind', 'nameless', 'regen', 'protect', 'haste', 'focus', 'taunt'];
const WEAK_TYPES = ['sword', 'spear', 'staff', 'axe', 'bow', 'fire', 'ice', 'thunder', 'light'];

export const HELP_LINE_H = HELP_LINE;
export const HELP_MAX_LINES = HELP_LINES_MAX;
/** Help lines: one beside the toggles, else the window grows (later lines full width, max 3, last ellipsized). */
export function helpLines(r, text, color, opts = {}) {
  if (!text) return [];
  const hw = HELP_WIN;
  const t = color ? `{c:${color}}${text}{/c}` : String(text);
  const first = hw.w - 12 - (opts.rightW || 0), full = hw.w - 12;
  if (r.measure(t) <= first) return [t];
  const maxLines = Math.max(1, opts.maxLines ?? HELP_MAX_LINES);
  const out = [];
  let rest = t;
  while (rest && out.length < maxLines) {
    const ls = r.wrap(rest, out.length ? full : first);
    if (!ls.length) break;
    const more = ls.length > 1;
    if (more && out.length === maxLines - 1) { out.push(ls[0] + '…'); break; }
    out.push(ls[0]);
    rest = more ? ls.slice(1).join(' ') : '';
  }
  return out;
}
/**
 * How far the help window reaches down the top-left band, below its 4 px margin: its height, or 0 while it is docked
 * under the timeline (W13, layout.helpDock), when the band holds no window. The scene adds the margin for the bottom
 * that the "!", the rows and the name tag keep clear of.
 */
export function helpHeight(r, text, color, opts = {}) {
  if (helpDock()) return 0;
  return HELP_WIN.h + Math.max(0, helpLines(r, text, color, opts).length - 1) * HELP_LINE_H;
}
/** Draw the help window where it stands this battle (HELP_WIN, or the W13 dock under the timeline). */
export function drawHelp(r, text, color, opts = {}) {
  const hw = { ...HELP_WIN, ...helpOrigin() };
  const lines = helpLines(r, text, color, opts);
  const h = hw.h + Math.max(0, lines.length - 1) * HELP_LINE_H;
  drawWindow(r, hw.x, hw.y, hw.w, h, { kind: 'thin', alpha: opts.alpha ?? 0.96 });
  lines.forEach((line, i) => r.text(line, hw.x + 6, hw.y + 4 + i * HELP_LINE_H));
  if (opts.right) r.text(opts.right, hw.x + hw.w - 6, hw.y + 4, { align: 'right', color: opts.rightColor || 'gold' });
  return h;
}

/** 14x14 face crop for a unit (legacy fallback): portrait crop for the party, a head crop of the battle frame for enemies. */
export function faceRect(r, actor) {
  const assets = r.assets;
  if (actor.side === 'party') {
    const atlas = assets.has('portraits') ? assets.atlas('portraits') : null;
    const f = atlas && atlas.frames[`${actor.id}_32`];
    if (!f) return null;
    const off = PORTRAIT_FACE[actor.id] || PORTRAIT_FACE.default;
    return { image: atlas.image, x: f.x + off[0], y: f.y + off[1] };
  }
  const atlas = actor.atlas;
  const f = atlas && (atlas.frames[actor.id] || (actor.anim && atlas.frames[actor.anim.frames[0]]));
  if (!f) return null;
  const rect = enemyFaceRect(f, actor.id);
  return { image: atlas.image, x: rect.x, y: rect.y, tint: actor.tint };
}

function drawFace(r, face, x, y, alpha = 1) {
  if (!face) { r.rect(x, y, 14, 14, '#2a2440'); return; }
  r.image(face.image, x, y, { sx: face.x, sy: face.y, sw: 14, sh: 14, alpha, tint: face.tint || null, tintAmount: face.tint ? 0.35 : 0 });
}

// Timeline heads (CRITIQUE C4): 12x12 `head_<id>` icons from assets/ui/heads.json (the art agent's atlas, listed in
// the manifest as "heads"). Fallback when the atlas is missing: the party's portrait face crop, and for enemies a
// smooth 12x12 thumbnail of the whole battle sprite (a colored silhouette reads better than an eyebrow crop).
const thumbs = new Map();
function headsAtlas(r) { const a = r && r.assets; return a && a.has('heads') ? a.atlas('heads') : null; }
function thumbnail(actor) {
  const atlas = actor.atlas;
  const f = atlas && (atlas.frames[actor.id] || (actor.anim && atlas.frames[actor.anim.frames[0]]));
  if (!f || !atlas.image || typeof document === 'undefined') return null;
  const key = `${atlas.id}|${f.name}|${actor.tint || ''}`;
  let c = thumbs.get(key);
  if (c) return c;
  c = document.createElement('canvas'); c.width = 12; c.height = 12;
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
  const k = Math.min(12 / f.w, 12 / f.h);
  const w = Math.max(1, Math.round(f.w * k)), h = Math.max(1, Math.round(f.h * k));
  g.drawImage(atlas.image, f.x, f.y, f.w, f.h, Math.floor((12 - w) / 2), 12 - h, w, h);
  if (actor.tint) { g.globalCompositeOperation = 'source-atop'; g.globalAlpha = 0.35; g.fillStyle = actor.tint; g.fillRect(0, 0, 12, 12); }
  thumbs.set(key, c);
  return c;
}
// A reflection's timeline head: its owner's head in the reflections' glass ramp, white eyes, the hero's face blank.
export const REFL_RAMP = ['#522a84', '#7040aa', '#9062c3', '#bc94e2'];
const REFL_WHITE = '#f6f4ee';
const REFL_KEEP = new Set(['#14101e', '#251d34']);
const REFL_EYES = new Set(['#1d2a67', '#3e88ca', '#292657', '#f9d77a']);
const REFL_SKIN = { '#e8b585': 3, '#cc875b': 2, '#a66142': 1 };
export function reflectionColor(hex, owner) {
  const h = String(hex).toLowerCase();
  if (REFL_KEEP.has(h)) return null;
  const blank = owner === 'hero';
  if (REFL_EYES.has(h)) return blank ? REFL_RAMP[3] : REFL_WHITE;
  if (h in REFL_SKIN) return blank ? REFL_RAMP[3] : REFL_RAMP[REFL_SKIN[h]];
  const n = parseInt(h.slice(1), 16);
  const y = (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  return REFL_RAMP[y < 0.22 ? 0 : y < 0.38 ? 1 : y < 0.55 ? 2 : 3];
}
const reflHeads = new Map();
function reflectionHead(heads, id) {
  if (reflHeads.has(id)) return reflHeads.get(id);
  let out = null;
  const owner = String(id).replace(/^refl_/, '');
  const f = heads && heads.frames[`head_${owner}`];
  if (f && heads.image && typeof document !== 'undefined') {
    try {
      const c = document.createElement('canvas'); c.width = f.w; c.height = f.h;
      const g = c.getContext('2d');
      g.drawImage(heads.image, f.x, f.y, f.w, f.h, 0, 0, f.w, f.h);
      const img = g.getImageData(0, 0, f.w, f.h), d = img.data;
      for (let i = 0; i < d.length; i += 4) {
        if (d[i + 3] === 0) continue;
        const hex = '#' + [d[i], d[i + 1], d[i + 2]].map((v) => v.toString(16).padStart(2, '0')).join('');
        const col = reflectionColor(hex, owner);
        if (!col) continue;
        const n = parseInt(col.slice(1), 16);
        d[i] = (n >> 16) & 255; d[i + 1] = (n >> 8) & 255; d[i + 2] = n & 255;
      }
      g.putImageData(img, 0, 0);
      out = c;
    } catch (e) { out = null; }
  }
  reflHeads.set(id, out);
  return out;
}
/** Draw a unit's 12x12 head at (x, y); `alpha` is a number or { alpha, tint, tintAmount }. False when nothing drew. */
export function drawHead(r, actor, x, y, alpha = 1) {
  if (!actor) { r.rect(x, y, 12, 12, '#2a2440'); return false; }
  const o = typeof alpha === 'object' && alpha ? alpha : { alpha };
  const look = { alpha: o.alpha ?? 1, tint: o.tint || null, tintAmount: o.tint ? (o.tintAmount ?? 0.5) : 0 };
  const heads = headsAtlas(r);
  // W11 (CRITIQUE_4 item 9): the atlas now carries the reflections' own glass heads with their owners' signatures
  // (build_heads.py GLASS4 / SIGNATURE); the runtime recolour stays as the fallback for an atlas without them.
  if (heads && /^refl_/.test(String(actor.id)) && !heads.frames[`head_${actor.id}`]) {
    const c = reflectionHead(heads, actor.id);
    if (c) { r.image(c, x, y, look); return true; }
  }
  const hf = heads && (heads.frames[`head_${actor.id}`] || (actor.side === 'enemy' && heads.frames[`head_${String(actor.id).replace(/_\d+$/, '')}`]));
  if (hf) { r.sprite(heads, hf, x, y, { topLeft: true, ...look }); return true; }
  alpha = look.alpha;
  if (actor.side === 'party') {
    const face = faceRect(r, actor);
    if (face) { r.image(face.image, x, y, { sx: face.x + 1, sy: face.y + 1, sw: 12, sh: 12, alpha }); return true; }
  } else {
    const c = thumbnail(actor);
    if (c) { r.image(c, x, y, { alpha }); return true; }
  }
  r.rect(x, y, 12, 12, '#2a2440');
  return false;
}
function dashedRect(r, x, y, w, h, color, phase = 0) {
  // 2 px dashes, 2 px gaps, marching with `phase` (the dash pattern wraps around the corners).
  const pts = [];
  for (let i = 0; i < w; i++) pts.push([x + i, y]);
  for (let i = 1; i < h; i++) pts.push([x + w - 1, y + i]);
  for (let i = w - 2; i >= 0; i--) pts.push([x + i, y + h - 1]);
  for (let i = h - 2; i >= 1; i--) pts.push([x, y + i]);
  pts.forEach(([px, py], i) => { if ((((i + phase) >> 1) & 1) === 0) r.pixel(px, py, color); });
}

/**
 * Timeline: order = [{uid, at, skip?, charging?}], actors map, preview = { landing, uid } | null.
 * Party slots blue, enemy slots red (elite/boss gold-orange), the current slot gold with a pulse, the preview
 * landing slot dashed. The next 8 actors are shown; the preview slot sits below the rail.
 */
export function drawTimeline(r, order, actors, preview, frame) {
  const ui = uiAtlas(r);
  if (!ui) return;
  const rail = ui.frames.tl_rail;
  if (rail) r.nineSlice(ui.image, [rail.x, rail.y, rail.w, rail.h], [2, 0, 2, 0], TL.x, TL.y + 7, TL.railW, rail.h);
  const glowName = animFrameAt(ui.anims.tl_glow, frame / 60);
  const pulse = Math.floor(frame / 10) % 2 === 0;
  for (let i = 0; i < Math.min(TL.slots, order.length); i++) {
    const row = order[i];
    const a = actors.get(row.uid);
    const sx = timelineSlotX(i), sy = TL.y;
    const kind = i === 0 ? 'tl_current' : a && a.side === 'enemy' ? (a.elite || a.boss ? 'tl_elite' : 'tl_enemy') : 'tl_party';
    if (i === 0 && ui.frames[glowName]) r.sprite(ui, ui.frames[glowName], sx - 2, sy - 2, { topLeft: true });
    const f = ui.frames[kind];
    r.rect(sx + 2, sy + 2, 14, 14, '#14101e');       // ink backing: heads have transparent corners, the rail must not show through
    if (f) r.sprite(ui, f, sx, sy, { topLeft: true, tint: i === 0 && pulse ? '#fff7d6' : null, tintAmount: i === 0 && pulse ? 0.35 : 0 });
    drawHead(r, a, sx + 3, sy + 3, row.skip === 'kept' ? { alpha: 0.95, tint: '#b8c2e8', tintAmount: 0.5 } : row.skip ? 0.45 : 1);
    if (i === 0 && pulse) r.strokeRect(sx - 1, sy - 1, 20, 20, '#f9d77a');
    if (row.skip) {
      // Kept turns (the Nameless King) grey the head and carry the icon_kept shard marker; stun / break keep theirs.
      const mk = row.skip === 'kept' ? (ui.frames.icon_kept || ui.frames.st8_silence || ui.frames.shield_broken)
        : row.skip === 'stun' ? ui.frames.st8_stun : ui.frames.shield_broken;
      if (mk && row.skip === 'kept' && mk.w > 8) r.sprite(ui, mk, sx + 19 - mk.w, sy + 19 - mk.h, { topLeft: true });
      else if (mk) r.sprite(ui, mk, sx + 18 - Math.min(10, mk.w), sy + 18 - Math.min(10, mk.h), { topLeft: true });
    } else if (row.charging) {
      r.rect(sx + 11, sy + 1, 6, 8, '#14101e');
      r.text('!', sx + 12, sy - 1, { color: 'orange', shadow: false });
    }
  }
  if (preview && preview.landing != null) {
    const i = preview.landing;
    const a = preview.uid ? actors.get(preview.uid) : null;
    const f = ui.frames.tl_preview;
    const beyond = i < 0 || i >= TL.slots;
    const px = beyond ? timelineSlotX(TL.slots - 1) + 10 : timelineSlotX(i) - 9;
    const py = TL.y + 10;
    r.rect(px + 2, py + 2, 14, 14, '#14101e');
    if (f) r.sprite(ui, f, px, py, { topLeft: true, alpha: 0.85 });
    drawHead(r, a, px + 3, py + 3, 0.75);
    dashedRect(r, px, py, 18, 18, '#f9d77a', Math.floor(frame / 4));
    const arrow = ui.frames[beyond ? 'arrow_right' : 'arrow_up'];
    if (arrow) r.sprite(ui, arrow, px + (beyond ? 20 : 4), py + (beyond ? 5 : 19) + (Math.floor(frame / 12) % 2 ? 1 : 0), { topLeft: true });
  }
}

/** Party status window rows: name, HP numbers + gauge, MP, Fury (READY glow), status badges. */
export function drawPartyStatus(r, party, activeUid, frame, opts = {}) {
  const sw = STATUS_WIN;
  drawWindow(r, sw.x, sw.y, sw.w, sw.h, { alpha: opts.alpha ?? 1 });
  const ui = uiAtlas(r);
  party.forEach((a, i) => {
    if (i >= 3) return;
    const L = statusRow(i);
    const active = a.uid === activeUid;
    if (active) {
      // Whose turn: a bright pulsing bar, a gold frame and a pointer in the left margin, and a gold name.
      const pulse = Math.floor(frame / 20) % 2;
      drawSelBar(r, L.bar[0], L.bar[1], L.bar[2], { alpha: pulse ? 0.9 : 1 });
      r.strokeRect(L.bar[0] - 1, L.bar[1] - 1, L.bar[2] + 2, 14, pulse ? '#fff7d6' : '#f9d77a');
      r.text('▶', L.bar[0] - 9, L.name[1], { color: 'gold' });
    }
    const pct = a.maxHp ? a.hp / a.maxHp : 0;
    const ko = a.ko || a.hp <= 0;
    const kept = !!a.statuses.kept;
    const nameCol = ko ? 'dim' : active ? 'gold' : kept ? 'cyan' : pct <= 0.25 ? 'red' : 'white';
    r.text(a.name, L.name[0], L.name[1], { color: nameCol });
    const hpText = String(Math.max(0, Math.round(a.shownHp)));
    r.text(hpText, L.hp[0], L.hp[1], { align: 'right', color: nameCol });
    r.text(`/${a.maxHp}`, L.hp[0] + 2, L.hp[1], { color: 'gray' });
    drawGauge(r, L.hpGauge[0], L.hpGauge[1], L.hpGauge[2], a.maxHp ? a.shownHp / a.maxHp : 0, 'hp', { thin: true, lag: a.maxHp ? a.lagHp / a.maxHp : 0 });
    drawLabel(r, 'mp', L.mpLbl[0], L.mpLbl[1]);
    r.text(String(Math.round(a.shownMp)), L.mp[0], L.mp[1], { align: 'right', color: 'blue' });
    drawGauge(r, L.mpGauge[0], L.mpGauge[1], L.mpGauge[2], a.maxMp ? a.shownMp / a.maxMp : 0, 'mp', { thin: true });
    drawLabel(r, ko ? 'ko' : 'fury', L.furyLbl[0], L.furyLbl[1]);
    const full = a.fury >= 100 && !ko;
    // READY sits beside the gauge on the gauge line (D11): the gauge gives up 25 px for the 21 px label.
    const furyW = L.furyGauge[2] - (full ? 25 : 0);
    drawGauge(r, L.furyGauge[0], L.furyGauge[1], furyW, Math.min(1, a.shownFury / 100), 'fury', { thin: true, glow: full, frame });
    if (full && (a.furyFlash === 0 || Math.floor(frame / 4) % 2 === 0)) drawLabel(r, 'ready', L.furyGauge[0] + furyW + 4, L.furyGauge[1] - 1);
    let ix = L.status[0];
    const ids = PARTY_STATUS_ORDER.filter((s) => a.statuses[s]);
    for (const s of ids.slice(0, 5)) {
      // Kept has no 8 px timeline badge; use the icon_kept shard (or st8_silence as a stand-in) so the row still marks it.
      const bf = ui && (ui.frames[`st8_${s}`] || (s === 'kept' ? (ui.frames.icon_kept || ui.frames.st8_silence) : null));
      if (bf) r.sprite(ui, bf, ix, L.status[1] - (bf.h > 8 ? Math.floor((bf.h - 8) / 2) : 0), { topLeft: true });
      ix += bf && bf.w > 8 ? bf.w + 1 : 9;
    }
    // Defending: the shield follows the badges, inside the window.
    if (a.defending && ui && ui.frames.icon_shield) { const f = ui.frames.icon_shield; r.sprite(ui, f, Math.min(ix + 1, STATUS_WIN.x + STATUS_WIN.w - 6 - f.w), L.status[1] - 2, { topLeft: true, alpha: 0.9 }); }
  });
}

/**
 * Enemy row under a foe: shield badge (count, or broken) + weakness slots (known icons, '?' for unknown,
 * resist frames) + status badges. know = b.knowledge(uid), unit = live rules unit.
 */
export function drawEnemyRow(r, actor, know, unit, frame, touch = false, opts = {}) {
  const ui = uiAtlas(r);
  if (!ui) return null;
  // opts.at: the spot the scene planned (touch layout: layout.touchRowSpot); else the W5 anchor under the feet.
  const anchor = opts.at || enemyRowAnchor(actor, touch, opts.cw || null);
  const x = anchor.x, y = anchor.y - (opts.lift || 0);
  const badge = ui.frames[unit && unit.broken ? 'shield_badge_broken' : 'shield_badge'];
  if (badge) {
    r.sprite(ui, badge, x, y, { topLeft: true });
    if (!(unit && unit.broken)) {
      const n = String(unit ? unit.shields : actor.shields);
      const flash = actor.shieldFlash > 0 && Math.floor(frame / 3) % 2 === 0;
      r.text(n, x + 6, y + 1, { align: 'center', color: flash ? 'gold' : 'white', shadow: false });
    }
  }
  let ex = x + 15;
  // Reflect marker (the Glassback under Protect) leads the row; know.reflect is 'magic' | 'phys' | null.
  if (know && know.reflect) {
    const fr = ui.frames.weak_frame;
    if (fr) r.sprite(ui, fr, ex, y - 1, { topLeft: true });
    const ic = ui.frames.icon_reflect || ui.frames.st8_protect || ui.frames.icon_shield;
    if (ic) r.sprite(ui, ic, ex + 1, y, { topLeft: true });
    else { r.strokeRect(ex + 1, y, 12, 12, '#8af0e8'); r.line(ex + 2, y + 11, ex + 12, y + 1, '#f6f4ee'); }
    ex += 15;
  }
  const weak = (know && know.weak) || [];
  const resist = (know && know.resist) || [];
  const unknown = know ? know.unknown : 0;
  const slots = [];
  for (const t of weak) slots.push({ icon: `icon_${t}`, frame: actor.rowFlash > 0 && Math.floor(frame / 4) % 2 === 0 ? 'weak_frame_hit' : 'weak_frame' });
  for (let i = 0; i < unknown; i++) slots.push({ icon: 'weak_unknown', frame: 'weak_frame' });
  for (const t of resist.slice(0, 4 - slots.length)) if (WEAK_TYPES.includes(t)) slots.push({ icon: `icon_${t}`, frame: 'weak_frame_resist', nullified: true });
  for (const s of slots.slice(0, 4)) {
    const fr = ui.frames[s.frame] || ui.frames.weak_frame;
    if (fr) r.sprite(ui, fr, ex, y - 1, { topLeft: true });
    const ic = ui.frames[s.icon];
    if (ic) r.sprite(ui, ic, ex + 1, y, { topLeft: true });
    if (s.nullified && ui.frames.weak_null) r.sprite(ui, ui.frames.weak_null, ex + 1, y, { topLeft: true });
    ex += 15;
  }
  // Status badges above the row (W11: below it when the row is tucked under the help window, opts.top, as the King's
  // row on the phone is, so the window never hides them).
  const by = opts.top != null && y - 10 < opts.top ? y + 15 : y - 10;
  let sx = x;
  for (const s of Object.keys(actor.statuses)) {
    const f = ui.frames[`st8_${s}`];
    if (f) { r.sprite(ui, f, sx, by, { topLeft: true }); sx += 9; }
  }
  // W11 (PLAYTEST_REVIEW_3 fixes 6 and 8): the Episode 2 snowballs on screen. After the status badges, one red Fury
  // badge per stack the foe holds for the rest of the fight: each Kept for the Nameless King, each landed Mirrored
  // Combo for the reflections.
  const grown = Math.min(empowerStacks(unit), EMPOWER_SHOWN);
  const fb = grown && ui.frames.st8_fury;
  if (fb) for (let i = 0; i < grown; i++) { r.sprite(ui, fb, sx, by, { topLeft: true }); sx += 9; }
  return { x, y, w: ex - x };
}
/** Stacks of a lasting Episode 2 buff on a foe: the King's Kept (`keep<n>`) and the reflections' combos (`mirror<n>`). */
export const EMPOWER_SHOWN = 4;
export function empowerStacks(unit) {
  if (!unit || !unit.mods) return 0;
  return unit.mods.filter((m) => m.stat === 'atk' && m.mult > 1 && /^(keep|mirror)\d+$/.test(String(m.source))).length;
}
/** Lift (px) for an enemy row that would touch one already drawn this frame (three foes in a line). */
export function rowLift(anchor, w, placed) {
  const LIFT = 16;
  for (let lift = 0; lift <= LIFT * 2; lift += LIFT) {
    const y = anchor.y - lift;
    const hit = placed.some((p) => anchor.x < p.x + p.w + 3 && anchor.x + w + 3 > p.x && Math.abs(p.y - y) < 14);
    if (!hit) return lift;
  }
  return 0;
}
export function enemyRowWidth(know) {
  const weak = (know && know.weak) || [], resist = ((know && know.resist) || []).filter((t) => WEAK_TYPES.includes(t));
  const slots = Math.min(4, weak.length + ((know && know.unknown) || 0) + resist.length);
  return 15 + (know && know.reflect ? 15 : 0) + slots * 15;
}

/** Name tab near the reticle: enemy name (gold + crown for elites), HP when appraised. */
export function drawNameTag(r, actor, know, unit, opts = {}) {
  const ui = uiAtlas(r);
  let name = actor.name;
  const appraised = know && know.appraised && unit;
  const hpText = appraised ? `  ${unit.hp}/${unit.maxHp}` : '';
  const w = r.measure(name) + r.measure(hpText) + 14 + (actor.elite ? 14 : 0);
  // The help window's bottom (26), or the screen's top margin when the help window is docked (W13)
  const floor = helpDock() ? 4 : 26;
  let x = Math.max(4, Math.min(W - w - 4, Math.round(actor.x - w / 2)));
  let y = Math.max(floor, actor.top - 26);
  // A row above the head (touch layout, opts.row): the tag stands on the row, or beside it when the top band
  // leaves no room, so it never covers the row or the foe.
  const row = opts.row;
  if (row) {
    const minY = Math.max(floor, opts.minY || floor);
    y = Math.max(minY, y);
    const hits = x < row.x + row.w + 2 && x + w + 2 > row.x && y < row.y + row.h + 2 && y + 19 > row.y;
    if (row.y - 19 >= minY && row.y < actor.top + 4) { y = row.y - 19; x = Math.max(4, Math.min(W - w - 4, row.x + Math.round((row.w - w) / 2))); }
    else if (hits || row.y < actor.top + 4) { y = Math.max(minY, row.y - 2); x = row.x + row.w + 3 + w <= W - 4 ? row.x + row.w + 3 : Math.max(4, row.x - 3 - w); }
  }
  // W13: never on the face. A tag that would cover the foe's head (a tall boss under a grown help window, where
  // nothing above is free) hangs just under the head instead.
  const head = headBox(actor, false);
  const onHead = Math.min(x + w, head.x + head.w) - Math.max(x, head.x) > 0 && Math.min(y + 17, head.y + head.h) - Math.max(y, head.y) > 2;
  if (onHead) { y = Math.min(STATUS_WIN.y - 19, head.y + head.h + 2); x = Math.max(4, Math.min(W - w - 4, Math.round(head.x + head.w / 2 - w / 2))); }
  drawWindow(r, x, y, w, 17, { kind: 'thin' });
  let tx = x + 7;
  if (actor.elite && ui && ui.frames.elite_mark) { r.sprite(ui, ui.frames.elite_mark, tx, y + 3, { topLeft: true }); tx += 14; }
  r.text(name, tx, y + 3, { color: actor.elite ? 'gold' : actor.boss ? 'orange' : 'white' });
  if (hpText) r.text(hpText, tx + r.measure(name), y + 3, { color: 'gray' });
}

export function drawReticle(r, actor, frame, opts = {}) {
  const ui = uiAtlas(r);
  const name = ui && animFrameAt(ui.anims.reticle, frame / 60);
  const f = name && ui.frames[name];
  const cx = actor.cx, cy = actor.cy;
  if (f) r.sprite(ui, f, cx, cy, { alpha: opts.alpha });
  else r.strokeRect(cx - 12, cy - 12, 25, 25, '#f9d77a');
}
export function drawTargetArrow(r, actor, frame) {
  const ui = uiAtlas(r);
  const name = ui && animFrameAt(ui.anims.target_arrow, frame / 60);
  const f = name && ui.frames[name];
  if (f) r.sprite(ui, f, actor.cx, actor.top - 4);
}
export function drawTurnMarker(r, actor, frame) {
  const ui = uiAtlas(r);
  // A pulsing gold ring on the floor under the active character's feet, beside the arrow over the head.
  const rw = 9 + (Math.floor(frame / 20) % 2);
  r.withAlpha(0.8, () => { r.rect(actor.cx - rw, Math.round(actor.y) - 1, rw * 2, 1, '#f9d77a'); r.rect(actor.cx - rw + 2, Math.round(actor.y), rw * 2 - 4, 1, '#f9d77a'); });
  const name = ui && animFrameAt(ui.anims.turn_marker, frame / 60);
  const f = name && ui.frames[name];
  if (f) r.sprite(ui, f, actor.cx, actor.top - 6);
  else r.text('▼', actor.cx, actor.top - 14, { align: 'center', color: 'gold' });
}
/** Pulsing danger marker over a charging enemy (telegraph), with the turns-until count. */
export function drawTelegraphMarker(r, actor, frame, nextTurn, minY = 28, row = null) {
  const ui = uiAtlas(r);
  const bob = Math.floor(frame / 8) % 2;
  // row (touch layout): the foe's weakness row (with its status badges). The "!" stands on a row above the head,
  // and moves beside a row it would otherwise cover.
  const top = row && row.y < actor.top + 4 ? Math.min(actor.top, row.y - 1) : actor.top;
  let y = Math.max(minY, top - 14) - bob;
  let x = actor.cx + 4;
  // W13: never on the face. The bubble (16 px, its tail at the bottom-left: x - 4 .. x + 12) may touch the head by
  // the 2 px of its tail; when the help window or a row above leaves no room over the head (the Nameless King, the
  // Echo Warden under a two-line help), it stands beside the head on the party's side, its tail toward the head.
  const head = headBox(actor, false);
  const over = (bx, by) => Math.min(bx + 12, head.x + head.w) - Math.max(bx - 4, head.x) > 0 && Math.min(by + 16, head.y + head.h) - Math.max(by, head.y) > 2;
  if (over(x, y)) {
    x = head.x + head.w + 6;
    if (x + 12 > W - 4) x = head.x - 14;
    y = Math.max(minY, head.y) - bob;
  }
  if (row && y + 15 > row.y && y < row.y + row.h && x + 8 > row.x && x - 8 < row.x + row.w) x = row.x + row.w + 9 <= W - 4 ? row.x + row.w + 9 : row.x - 9;
  const name = ui && animFrameAt(ui.anims.emote_exclaim, frame / 60);
  const f = name && ui.frames[name];
  const on = Math.floor(frame / 6) % 3 !== 2;
  if (f) r.sprite(ui, f, x, y + 15, { tint: on ? '#ff8a2a' : '#e06b39', tintAmount: 0.6 });
  else r.text('!', x - 4, y - 4, { align: 'center', color: 'orange', outline: '#14101e' });
  void nextTurn;
}

/** Elite gold name over the sprite's head (shown on the elite intro and while targeted). */
export function drawEliteTag(r, actor) {
  const ui = uiAtlas(r);
  const w = r.measure(actor.name) + 16;
  const x = Math.round(actor.x - w / 2), y = actor.top - 12;
  if (ui && ui.frames.elite_mark) r.sprite(ui, ui.frames.elite_mark, x, y, { topLeft: true });
  r.text(actor.name, x + 14, y, { color: 'gold' });
}

/** Big centered banner (combo name, boss phase, stance). k = 0..1 progress for slide/fade. */
export function drawBigBanner(r, text, style, k) {
  const inK = Math.min(1, k * 4), outK = k > 0.75 ? (k - 0.75) * 4 : 0;
  const alpha = Math.min(inK, 1 - outK);
  if (alpha <= 0) return;
  const w = Math.min(W - 20, r.measure(text, 'large') + 48);
  const x = Math.round((W - w) / 2), y = BANNER_Y - Math.round((1 - inK) * 6);
  const color = style === 'combo' ? 'gold' : style === 'phase' ? 'orange' : 'cyan';
  r.withAlpha(alpha, () => {
    r.rect(x, y + 1, w, 22, '#14101e');
    r.rect(x, y, w, 1, color === 'gold' ? '#f9d77a' : color === 'orange' ? '#eba14d' : '#8af0e8');
    r.rect(x, y + 23, w, 1, color === 'gold' ? '#f9d77a' : color === 'orange' ? '#eba14d' : '#8af0e8');
    r.text(text, W / 2, y + 4, { font: 'large', align: 'center', color });
  });
}

/** A Kept member sealed in a mirror shard: a faceted glass prism over the sprite with a travelling gleam. */
export function drawKeptShard(r, actor, frame) {
  const cx = actor.cx;
  const h = actor.h || 40, w = Math.max(18, actor.w || 28);
  const top = Math.round(actor.y - h - 3), bot = Math.round(actor.y + 1);
  const mid = top + Math.round((bot - top) * 0.4);
  const hw = Math.round(w / 2 + 4);
  const pts = [[cx, top], [cx + hw, mid], [cx + hw - 2, bot], [cx - hw + 2, bot], [cx - hw, mid]];
  // A faint glassy wash inside the prism (dithered so it does not flatten the sprite).
  r.withAlpha(0.14, () => r.ditherEllipse(cx, Math.round((top + bot) / 2), hw - 1, Math.round((bot - top) / 2), '#8af0e8', 0.6));
  // Facet outline and inner creases.
  r.withAlpha(0.8, () => { for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; r.line(a[0], a[1], b[0], b[1], '#cfefff'); } });
  r.withAlpha(0.45, () => { r.line(cx, top, cx - hw + 2, bot, '#8af0e8'); r.line(cx, top, cx + hw - 2, bot, '#8af0e8'); });
  // A gleam travelling down the glass.
  const span = Math.max(1, bot - top);
  const gy = top + ((frame * 2) % span);
  r.withAlpha(0.7, () => r.line(cx - hw + 3, gy, cx + hw - 3, gy - 2, '#ffffff'));
}

/** The Mirrored Combo telegraph: a silver bracket under the two reflections' timeline slots. */
export function drawMirrorBracket(r, order, aUid, bUid, frame) {
  if (!aUid || !bUid) return;
  const ia = order.findIndex((o) => o.uid === aUid);
  const ib = order.findIndex((o) => o.uid === bUid);
  if (ia < 0 || ib < 0) return;
  const lo = Math.min(ia, ib), hi = Math.max(ia, ib);
  if (hi >= TL.slots) return;
  // 2 px, ink-outlined, legs into the slots, a glass gem mid-bar; breathes silver to white.
  const x0 = timelineSlotX(lo) + 4, x1 = timelineSlotX(hi) + 14;
  const top = TL.y + 18, bar = TL.y + 23;
  const pulse = Math.floor(frame / 10) % 2 === 0;
  const ink = '#14101e', col = pulse ? '#e8ecff' : '#b8c2e8', shade = '#7880b0', hi1 = '#ffffff';
  r.rect(x0 - 1, top, 4, bar - top + 3, ink);
  r.rect(x1 - 2, top, 4, bar - top + 3, ink);
  r.rect(x0 - 1, bar - 1, x1 - x0 + 2, 4, ink);
  r.rect(x0, top, 2, bar - top + 2, col);
  r.rect(x1 - 1, top, 2, bar - top + 2, col);
  r.rect(x0, bar, x1 - x0 + 1, 2, col);
  r.rect(x0 + 2, bar + 1, x1 - x0 - 3, 1, shade);
  const mx = Math.round((x0 + x1) / 2);
  const gem = [[0, -3, 1], [-1, -2, 3], [-2, -1, 5], [-3, 0, 7], [-2, 1, 5], [-1, 2, 3], [0, 3, 1]];
  for (const [dx, dy, w] of gem) r.rect(mx + dx - 1, bar + dy, w + 2, 1, ink);
  r.rect(mx, bar - 4, 1, 1, ink); r.rect(mx, bar + 4, 1, 1, ink);
  for (const [dx, dy, w] of gem) r.rect(mx + dx, bar + dy, w, 1, dy < 0 ? hi1 : dy === 0 ? (pulse ? hi1 : '#cfefff') : '#8af0e8');
}

/** Boss card band cy: the W5 spot (0.4 H) unless it covers a foe ({ y0, y1 } rects) and cy 40 would not. */
export function bossCardY(rects, sub = true) {
  const bh = sub ? 40 : 28;
  const spots = [Math.round(H * 0.4), 40];
  for (const cy of spots) {
    const y0 = cy - 2, y1 = cy - 2 + bh;
    if (!rects.some((e) => e.y0 < y1 && e.y1 > y0)) return cy;
  }
  return spots[0];
}

/**
 * In-battle boss name card (the W5 cutscene title card, laid on the battlefield as the party enters): the boss
 * name in the large font over a darkened gold-ruled band, with its subtitle. card = { name, sub, t, frames }.
 */
export function drawBossCard(r, card) {
  if (!card) return;
  const { name, sub, t, frames } = card;
  const inK = Math.min(1, t / 14), outK = t > frames - 16 ? Math.max(0, (frames - t) / 16) : 1;
  const a = Math.max(0, Math.min(inK, outK));
  if (a <= 0) return;
  const cy = Number.isFinite(card.cy) ? card.cy : Math.round(H * 0.4);
  const bh = sub ? 40 : 28;
  r.withAlpha(a * 0.72, () => r.rect(0, cy - 2, W, bh, '#14101e'));
  r.withAlpha(a, () => {
    r.rect(0, cy - 2, W, 1, '#f9d77a');
    r.rect(0, cy + bh - 3, W, 1, '#f9d77a');
    r.text(name, W / 2, cy + 3, { font: 'large', align: 'center', color: 'cream' });
    if (sub) r.text(sub, W / 2, cy + 23, { align: 'center', color: 'gray' });
  });
}

/** Preview tooltip next to the target: expected damage range, WEAK/?/RESIST, shields after, KO. */
export function drawPreviewTag(r, actor, eff, opts = {}) {
  if (!eff) return;
  const parts = [];
  if (eff.min != null && eff.max != null && (eff.min || eff.max)) parts.push(eff.min === eff.max ? `${eff.min}` : `${eff.min}-${eff.max}`);
  if (eff.heal) parts.push(`{c:green}+${eff.min != null ? `${eff.min}-${eff.max}` : eff.heal}{/c}`);
  if (eff.mp) parts.push(`{c:blue}+${eff.mp} MP{/c}`);
  if (eff.revive) parts.push('{c:green}Revive{/c}');
  if (eff.weak === true) parts.push('{c:gold}WEAK{/c}');
  else if (eff.weak === '?') parts.push('{i:weak_unknown}');   // the same "?" box the enemy row uses (not a multiply sign)
  else if (eff.resist === true) parts.push('{c:dim}RESIST{/c}');
  if (eff.breaks) parts.push('{c:orange}BREAK{/c}');
  else if (eff.shieldsAfter != null && actor.side === 'enemy' && eff.shieldsAfter !== actor.shields && !actor.broken) parts.push(`{i:icon_shield}{c:cyan}${eff.shieldsAfter}{/c}`);
  if (eff.kills) parts.push('{c:red}KO{/c}');
  if (eff.hit != null && eff.hit < 0.9) parts.push(`{c:gray}${Math.round(eff.hit * 100)}%{/c}`);
  if (!parts.length) return;
  const text = parts.join(' ');
  const w = r.measure(text) + 12;
  let x = Math.round(actor.x + (actor.side === 'enemy' ? actor.w / 2 + 6 : -actor.w / 2 - 6 - w));
  x = Math.max(4, Math.min(W - w - 4, x));
  const y = Math.max(26, actor.cy - 8);
  drawWindow(r, x, y, w, 17, { kind: 'thin', alpha: 0.95 });
  r.text(text, x + 6, y + 3);
  void opts;
}

export { drawIcon, frameOrigin };
