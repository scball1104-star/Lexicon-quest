// Small text helpers shared by the UI scenes (pure: node tests import them).

import { stripCodes } from '../core/font.js';

/** Replace {hero} with the player's name (game object, string, or undefined). */
export function fillHero(text, gameOrName) {
  const name = typeof gameOrName === 'string' ? gameOrName : (gameOrName && gameOrName.heroName) || 'Hero';
  return String(text == null ? '' : text).replace(/\{hero\}/g, name);
}

/** 12,480 style thousands separators. */
export function fmtGold(n) {
  n = Math.max(0, Math.floor(Number(n) || 0));
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/** h:mm:ss from seconds. */
export function fmtTime(sec) {
  sec = Math.max(0, Math.floor(Number(sec) || 0));
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
export function roman(n) { return ROMAN[n] || String(n); }

/**
 * For wrapped `lines` of `text`: hard[i] is true when line i ends in the middle of a word (the wrapper had
 * to cut a word longer than the line, so line i+1 continues it). Codes ({c:..}, {i:..}) are ignored.
 */
export function hardBreaks(text, lines) {
  const flat = stripCodes(text);
  const out = [];
  let pos = 0;
  for (let i = 0; i < lines.length; i++) {
    const ln = stripCodes(lines[i]);
    while (pos < flat.length && /\s/.test(flat[pos])) pos++;
    const at = flat.indexOf(ln, pos);
    if (at < 0) { out.push(false); continue; }   // cannot align (unexpected input): treat as a clean break
    pos = at + ln.length;
    const next = flat[pos];
    out.push(i < lines.length - 1 && ln.length > 0 && next != null && !/\s/.test(next));
  }
  return out;
}

/**
 * Split wrapped lines into pages of `rows` lines. With o.hard (from hardBreaks) a page never ends on a line
 * that cuts a word: the page edge moves up a line so both halves of the word share the next page.
 */
export function paginate(lines, rows = 3, o = {}) {
  const hard = o.hard || null;
  const pages = [];
  let i = 0;
  while (i < lines.length) {
    let n = Math.min(rows, lines.length - i);
    if (hard && i + n < lines.length) { let m = n; while (m > 1 && hard[i + m - 1]) m--; n = m; }
    pages.push(lines.slice(i, i + n));
    i += n;
  }
  return pages.length ? pages : [['']];
}

/** Character speed per frame for settings.textSpeed (1 slow .. 4 instant). */
export function charsPerFrame(textSpeed) {
  return { 1: 0.5, 2: 1, 3: 2, 4: 999 }[textSpeed] ?? 1;
}

/** Typewriter voice for a speaker id. */
export function voiceFor(who) {
  if (who == null) return null;
  if (who === 'mira' || who === 'wick' || who === 'lark') return 'high';
  if (who === 'bram' || who === 'garrick' || who === 'holt' || who === 'echo_warden' || who === 'archivore' || who === 'hob') return 'low';
  return 'mid';
}

export function cap(s) { s = String(s || ''); return s.charAt(0).toUpperCase() + s.slice(1); }
