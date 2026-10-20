// Battle scene layout: every rectangle and anchor the battle draws, as pure data and pure functions
// (node tests import this). Internal resolution 384x216 (DESIGN 3). Positions follow the mocks in
// tools/art/ui/out/mock_battle_*.png: enemies left in a diagonal, party right in a diagonal, command
// window bottom-left, party status bottom-right, help window top-left, timeline top-right.

export const W = 384;
export const H = 216;

// Windows (x, y, w, h).
export const HELP_WIN = { x: 4, y: 4, w: 218, h: 19 };
export const CMD_WIN = { x: 4, y: 152, w: 92, h: 60 };
export const STATUS_WIN = { x: 98, y: 152, w: 282, h: 60 };
export const CMD_ROWS = 4;            // visible command rows
export const CMD_ROW_H = 11;
export const STATUS_ROW_H = 17;
// Touch layouts (W5, DESIGN 3): rows grow to List's TOUCH_ROW_H (15 px = 25 css px on the phone), so the command
// window grows upward to keep four rows and the sub-list window moves up with it (both still above / beside the
// bottom band; the enemy row anchor is clamped above STATUS_WIN either way).
export const CMD_WIN_TOUCH = { x: 4, y: 140, w: 92, h: 72 };
export const SUB_WIN_TOUCH = { x: 4, y: 66, w: 188, h: 72 };
/** Command window rect for a layout. */
export function cmdWin(touch) { return touch ? CMD_WIN_TOUCH : CMD_WIN; }
/** Sub-list (Tech / Magic / Item / Fury / Combo) window rect for a layout. */
export function subWin(touch) { return touch ? SUB_WIN_TOUCH : SUB_WIN; }
/** Rows of `rowH` that fit a command-style window (6 px padding top and bottom). */
export function cmdRowsFor(win, rowH) { return Math.max(1, Math.floor((win.h - 12) / rowH)); }
/** The touch layout's AUTO and x2 buttons inside the help window (tap targets; the desktop shows glyphs). */
export const HELP_TOUCH_BTNS = { auto: { x: 158, y: 6, w: 30, h: 15 }, speed: { x: 190, y: 6, w: 28, h: 15 } };

// Timeline (top right): 8 slots of 18 px, the first (current) gets one extra px of air.
export const TL = { x: 226, y: 6, slots: 8, slot: 18, railW: 154 };
export function timelineSlotX(i) { return TL.x + 2 + (i === 0 ? 0 : 19 + (i - 1) * TL.slot); }

// The stage (W4-battle-polish, CRITIQUE C3): one ground plane. An indigo band darkens the lower part of
// the backdrop (bandY..216, drawn under the sprites, top edge dithered 2 px); every unit's feet sit on ONE
// baseline per side inside that band, with an ellipse shadow scaled to the sprite's width. The backdrop
// json (assets/backdrops/<id>.json {bandY, bandAlpha}) overrides BAND when present.
export const FLOOR_Y = 146;
export const BASELINE = { party: 146, enemy: 146 };   // 6 px of floor between the feet and the bottom windows for the shadows
export const BAND = { y: 120, alpha: 0.55, color: '#292657', edge: 2 };

// Party slots: feet on the party baseline, the leader nearest the foes, 28 px apart (32 px sprites).
const PARTY_X_3 = [290, 318, 346];
const PARTY_X_2 = [300, 336];
const PARTY_X_1 = [318];
/** Feet positions for n party members. Index 0 = leader. */
export function partySlots(n) {
  const xs = n >= 3 ? PARTY_X_3 : n === 2 ? PARTY_X_2 : PARTY_X_1;
  return xs.slice(0, Math.max(1, n)).map((x) => ({ x, y: BASELINE.party }));
}
/** Where a party member stands while striking a melee target (just right of the target's box). */
export function meleeSpot(target, attacker) {
  const half = Math.max(12, Math.round((target.w || 32) / 2));
  return { x: Math.min(attacker.homeX - 8, target.x + half + 14), y: attacker.homeY };
}
/** Where an enemy stands while striking a party member (just left of them). */
export function enemyMeleeSpot(target, attacker) {
  const half = Math.max(12, Math.round((attacker.w || 48) / 2));
  return { x: Math.max(attacker.homeX + 8, target.x - 18 - half), y: attacker.homeY };
}

// Enemy slots by group size: feet on the enemy baseline, spread across the left two thirds of the stage.
// Big groups overlap a little (drawn left to right, so the rightmost foe is in front). Bosses use BOSS_SLOT.
const ENEMY_X = {
  1: [118],
  2: [78, 164],
  3: [52, 124, 196],
  4: [40, 98, 156, 214],
  5: [36, 86, 136, 186, 236],
};
export function enemySlots(n) {
  const xs = ENEMY_X[Math.min(5, Math.max(1, n))];
  return xs.map((x) => ({ x, y: BASELINE.enemy }));
}
export const BOSS_SLOT = { x: 98, y: BASELINE.enemy };
/** Slots for summoned adds (Lost Pages) around the boss: they float, so y is their hover feet line. */
const SUMMON_SLOTS = [[200, 70], [214, 118], [184, 44], [232, 92]];
export function summonSlot(i) { const [x, y] = SUMMON_SLOTS[i % SUMMON_SLOTS.length]; return { x, y }; }

/** Enemy size class -> ground shadow frame in misc.json (legacy; shadowFor() picks by sprite width). */
export const SHADOW_BY_SIZE = { small: 'shadow_medium', medium: 'shadow_large', large: 'shadow_large', boss: 'shadow_huge' };
/** misc.json shadow frames by width (an ellipse about half the sprite's width reads as its footprint). */
export const SHADOW_FRAMES = [['shadow_small', 12], ['shadow_medium', 18], ['shadow_large', 28], ['shadow_huge', 48]];
export function shadowFor(spriteW) {
  const want = Math.max(10, (spriteW || 32) * 0.5);
  let best = SHADOW_FRAMES[0];
  for (const f of SHADOW_FRAMES) if (Math.abs(f[1] - want) < Math.abs(best[1] - want)) best = f;
  return best[0];
}

// 14x14 face crops for the timeline (offsets inside the 32x32 portrait frame, per mocks).
export const PORTRAIT_FACE = { default: [9, 9] };
// Enemy face crops: offset of the 14x14 window inside the battle frame, as a fraction of the frame
// (x: center, y: where the "head" is). Tuned per enemy; unknown ids use the default.
export const ENEMY_FACE = {
  default: [0.5, 0.3],
  ink_slime: [0.52, 0.36], page_wraith: [0.6, 0.3], briar_wolf: [0.78, 0.45], moss_scarab: [0.8, 0.5],
  bookmite: [0.5, 0.5], tome_golem: [0.5, 0.2], ink_wraith: [0.6, 0.18], echo_warden: [0.6, 0.15],
  archivore: [0.49, 0.43], lost_page: [0.5, 0.5], lost_page_0: [0.5, 0.5], lost_page_1: [0.5, 0.5], lost_page_2: [0.5, 0.5],
};
export function enemyFaceRect(frame, id) {
  const f = ENEMY_FACE[id] || ENEMY_FACE.default;
  const x = Math.round(frame.x + frame.w * f[0] - 7), y = Math.round(frame.y + frame.h * f[1] - 7);
  return { x: Math.max(frame.x, Math.min(frame.x + frame.w - 14, x)), y: Math.max(frame.y, Math.min(frame.y + frame.h - 14, y)) };
}

/** Shield badge + weakness row anchor under an enemy (kept above the bottom windows). The command window
 *  (taller on touch) covers the bottom-left, so a row that would sit over it is lifted clear of it. */
export const ENEMY_ROW_H = 14;
export function enemyRowAnchor(unit, touch = false) {
  const w = 12 + 15 * 4;
  const x = Math.max(4, Math.min(W - w - 4, Math.round(unit.x - w / 2)));
  let y = Math.min(STATUS_WIN.y - 16, Math.round(unit.y + 2));
  const cw = cmdWin(touch);
  if (x < cw.x + cw.w && x + w > cw.x) y = Math.min(y, cw.y - ENEMY_ROW_H - 2);
  return { x, y };
}

/** Bounding box of a unit on screen for tap targeting. */
export function unitBox(u) {
  const w = Math.max(24, u.w || 32), h = Math.max(32, u.h || 40);
  return { x: Math.round(u.x - w / 2), y: Math.round(u.y - h), w, h };
}

/** Status window row rect and the x anchors inside it (mock_battle_command). */
export function statusRow(i) {
  const ry = STATUS_WIN.y + 5 + i * STATUS_ROW_H;
  const x0 = STATUS_WIN.x + 8;
  return { y: ry, x0, name: [x0, ry + 3], hp: [x0 + 92, ry + 1], hpGauge: [x0 + 44, ry + 11, 75],
    mpLbl: [x0 + 126, ry + 2], mp: [x0 + 156, ry + 1], mpGauge: [x0 + 126, ry + 11, 31],
    furyLbl: [x0 + 164, ry + 2], furyGauge: [x0 + 164, ry + 11, 52], ready: [x0 + 190, ry + 2], status: [x0 + 224, ry + 4],
    bar: [STATUS_WIN.x + 4, ry, STATUS_WIN.w - 8, STATUS_ROW_H] };
}

/** Rewards window and level-up window rects. */
export const REWARD_WIN = { x: 40, y: 14, w: 236, h: 102 };
export const LEVEL_WIN = { x: 58, y: 34, w: 206, h: 106 };
export const SUB_WIN = { x: 4, y: 90, w: 188, h: 60 };
export const BANNER_Y = 84;
