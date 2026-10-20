// Battle HUD: help/telegraph window (top left), the CTB timeline (top right), the party status window
// (bottom right), the enemy shield + weakness row, reticle, turn marker, telegraph marker, elite tags and
// the big banners (combo names, boss phases). All positions come from layout.js; art from assets/ui.

import { drawWindow, drawSelBar, drawGauge, drawLabel, drawIcon, uiAtlas } from '../../ui/window.js';
import { animFrameAt } from '../../core/assets.js';
import { HELP_WIN, STATUS_WIN, TL, timelineSlotX, statusRow, enemyRowAnchor, PORTRAIT_FACE, enemyFaceRect, BANNER_Y, W } from './layout.js';
import { frameOrigin } from './actors.js';

const PARTY_STATUS_ORDER = ['poison', 'burn', 'chill', 'stun', 'silence', 'blind', 'nameless', 'regen', 'protect', 'haste', 'focus', 'taunt'];
const WEAK_TYPES = ['sword', 'spear', 'staff', 'axe', 'bow', 'fire', 'ice', 'thunder', 'light'];

export function drawHelp(r, text, color, opts = {}) {
  const hw = HELP_WIN;
  drawWindow(r, hw.x, hw.y, hw.w, hw.h, { kind: 'thin', alpha: opts.alpha ?? 0.96 });
  if (!text) return;
  let t = text;
  if (color) t = `{c:${color}}${text}{/c}`;
  const maxW = hw.w - 12 - (opts.rightW || 0);
  if (r.measure(t) > maxW) {
    // Keep the start of the line; the tail is the least important part of a telegraph sentence.
    const lines = r.wrap(t, maxW);
    t = lines[0] + (lines.length > 1 ? '…' : '');
  }
  r.text(t, hw.x + 6, hw.y + 4);
  if (opts.right) r.text(opts.right, hw.x + hw.w - 6, hw.y + 4, { align: 'right', color: opts.rightColor || 'gold' });
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
/** Draw a unit's 12x12 head at (x, y) (top-left). Returns false when nothing could be drawn. */
export function drawHead(r, actor, x, y, alpha = 1) {
  if (!actor) { r.rect(x, y, 12, 12, '#2a2440'); return false; }
  const heads = headsAtlas(r);
  const hf = heads && (heads.frames[`head_${actor.id}`] || (actor.side === 'enemy' && heads.frames[`head_${String(actor.id).replace(/_\d+$/, '')}`]));
  if (hf) { r.sprite(heads, hf, x, y, { topLeft: true, alpha }); return true; }
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
    drawHead(r, a, sx + 3, sy + 3, row.skip ? 0.45 : 1);
    if (i === 0 && pulse) r.strokeRect(sx - 1, sy - 1, 20, 20, '#f9d77a');
    if (row.skip) {
      const m = ui.frames[row.skip === 'stun' ? 'st8_stun' : 'shield_broken'];
      if (m) r.sprite(ui, m, sx + 9, sy + 9, { topLeft: true });
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
    if (active) drawSelBar(r, L.bar[0], L.bar[1], L.bar[2], { alpha: 0.6 });
    const pct = a.maxHp ? a.hp / a.maxHp : 0;
    const ko = a.ko || a.hp <= 0;
    const nameCol = ko ? 'dim' : pct <= 0.25 ? 'red' : 'white';
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
      if (ui && ui.frames[`st8_${s}`]) r.sprite(ui, ui.frames[`st8_${s}`], ix, L.status[1], { topLeft: true });
      ix += 9;
    }
    if (a.defending && ui && ui.frames.icon_shield) r.sprite(ui, ui.frames.icon_shield, L.status[0] + 46, L.status[1] - 2, { topLeft: true, alpha: 0.9 });
  });
}

/**
 * Enemy row under a foe: shield badge (count, or broken) + weakness slots (known icons, '?' for unknown,
 * resist frames) + status badges. know = b.knowledge(uid), unit = live rules unit.
 */
export function drawEnemyRow(r, actor, know, unit, frame, touch = false) {
  const ui = uiAtlas(r);
  if (!ui) return;
  const { x, y } = enemyRowAnchor(actor, touch);
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
  // Status badges above the row.
  let sx = x;
  for (const s of Object.keys(actor.statuses)) {
    const f = ui.frames[`st8_${s}`];
    if (f) { r.sprite(ui, f, sx, y - 10, { topLeft: true }); sx += 9; }
  }
}

/** Name tab near the reticle: enemy name (gold + crown for elites), HP when appraised. */
export function drawNameTag(r, actor, know, unit) {
  const ui = uiAtlas(r);
  let name = actor.name;
  const appraised = know && know.appraised && unit;
  const hpText = appraised ? `  ${unit.hp}/${unit.maxHp}` : '';
  const w = r.measure(name) + r.measure(hpText) + 14 + (actor.elite ? 14 : 0);
  const x = Math.max(4, Math.min(W - w - 4, Math.round(actor.x - w / 2)));
  const y = Math.max(26, actor.top - 26);
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
  const name = ui && animFrameAt(ui.anims.turn_marker, frame / 60);
  const f = name && ui.frames[name];
  if (f) r.sprite(ui, f, actor.cx, actor.top - 6);
  else r.text('▼', actor.cx, actor.top - 14, { align: 'center', color: 'gold' });
}
/** Pulsing danger marker over a charging enemy (telegraph), with the turns-until count. */
export function drawTelegraphMarker(r, actor, frame, nextTurn) {
  const ui = uiAtlas(r);
  const bob = Math.floor(frame / 8) % 2;
  const y = Math.max(28, actor.top - 14) - bob;
  const name = ui && animFrameAt(ui.anims.emote_exclaim, frame / 60);
  const f = name && ui.frames[name];
  const on = Math.floor(frame / 6) % 3 !== 2;
  if (f) r.sprite(ui, f, actor.cx + 4, y + 15, { tint: on ? '#ff8a2a' : '#e06b39', tintAmount: 0.6 });
  else r.text('!', actor.cx, y - 4, { align: 'center', color: 'orange', outline: '#14101e' });
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
