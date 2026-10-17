// Small text helpers shared by the UI scenes (pure: node tests import them).

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

/** Split wrapped lines into pages of `rows` lines. */
export function paginate(lines, rows = 3) {
  const pages = [];
  for (let i = 0; i < lines.length; i += rows) pages.push(lines.slice(i, i + rows));
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
