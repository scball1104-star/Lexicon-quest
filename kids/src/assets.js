// Image, atlas and sound loading. Art and sound come from Lexicon Quest NEXT (Scott Ball), reused as-is.

export const IMG = {};
export const FONT = { glyphs: {}, img: null, lineHeight: 16 };

const IMAGES = ['terrain', 'archive', 'cliffs', 'party_field', 'enemies_field', 'props', 'misc', 'portraits', 'font_large', 'title'];

function loadImage(src) {
  return new Promise((res, rej) => {
    const im = new Image();
    im.onload = () => res(im);
    im.onerror = () => rej(new Error('image ' + src));
    im.src = src;
  });
}

export async function loadAssets(onProgress) {
  let done = 0;
  const total = IMAGES.length + 1;
  await Promise.all(IMAGES.map(async (n) => {
    IMG[n] = await loadImage(`assets/img/${n}.png`);
    onProgress && onProgress(++done / total);
  }));
  const f = await (await fetch('assets/img/font_large.json')).json();
  FONT.img = IMG.font_large;
  FONT.lineHeight = f.lineHeight;
  FONT.baseline = f.baseline;
  FONT.space = f.spaceAdvance;
  for (const [ch, g] of Object.entries(f.glyphs)) FONT.glyphs[ch] = g;
  onProgress && onProgress(1);
}

// ---------- sprite frames (from Scott's atlases, coordinates copied from the json files) ----------
// party_field: 24x32 cells, rows per char: down, left, right, up; columns stand, stepA, stepB, blink
export const DIRS = ['down', 'left', 'right', 'up'];

// enemies_field frames, all facing LEFT
export const ENEMY_FRAMES = {
  ink_slime: [[0, 0, 16, 16], [16, 0, 16, 16]],
  moss_scarab: [[64, 0, 16, 16], [80, 0, 16, 16]],
  lost_page: [[96, 0, 16, 16], [112, 0, 16, 16]],
  briar_wolf: [[0, 32, 24, 24], [24, 32, 24, 24]],
  tome_golem: [[48, 32, 24, 24], [72, 32, 24, 24]],
  briar_alpha: [[0, 112, 24, 24], [24, 112, 24, 24]],
  bookmite: [[32, 0, 16, 16], [48, 0, 16, 16]],
};

export async function fixEnemyFrames() {
  // Read the real rects from the atlas json so the frames are exact.
  try {
    const j = await (await fetch('assets/img/enemies_field.json')).json();
    for (const k of Object.keys(ENEMY_FRAMES)) {
      const a = j.frames[k + '_0'], b = j.frames[k + '_1'];
      if (a && b) ENEMY_FRAMES[k] = [a, b];
    }
  } catch (e) { /* keep defaults */ }
}

export const PROPS = {};
export async function loadPropTable() {
  const j = await (await fetch('assets/img/props.json')).json();
  Object.assign(PROPS, j.objects);
}

export const PORTRAIT = { mira: [48, 0, 48, 48], bram: [96, 0, 48, 48], hero: [0, 0, 48, 48], mael: [144, 0, 48, 48] };

// ---------- bitmap text ----------
const tintCache = new Map();
function tinted(color) {
  if (tintCache.has(color)) return tintCache.get(color);
  const c = document.createElement('canvas');
  c.width = FONT.img.width; c.height = FONT.img.height;
  const g = c.getContext('2d');
  g.drawImage(FONT.img, 0, 0);
  g.globalCompositeOperation = 'source-in';
  g.fillStyle = color;
  g.fillRect(0, 0, c.width, c.height);
  tintCache.set(color, c);
  return c;
}
export function textWidth(s) {
  let w = 0;
  for (const ch of s) { const g = FONT.glyphs[ch]; w += g ? g[6] : FONT.space; }
  return w;
}
export function drawText(ctx, s, x, y, color = '#fff', shadow = '#14101e', align = 'left') {
  if (!FONT.img) return;
  if (align === 'center') x -= Math.round(textWidth(s) / 2);
  const draw = (img, ox, oy) => {
    let cx = Math.round(x + ox);
    for (const ch of s) {
      const g = FONT.glyphs[ch];
      if (!g) { cx += FONT.space; continue; }
      ctx.drawImage(img, g[0], g[1], g[2], g[3], cx + g[4], Math.round(y + oy + g[5]), g[2], g[3]);
      cx += g[6];
    }
  };
  if (shadow) draw(tinted(shadow), 1, 1);
  draw(tinted(color), 0, 0);
}

// ---------- audio ----------
let actx = null, master = null, musicGain = null, sfxGain = null;
const buffers = {};
let musicSrc = null, musicName = null;
export const AUDIO = { muted: false };

export function unlockAudio() {
  if (actx) { if (actx.state === 'suspended') actx.resume(); return; }
  try {
    actx = new (window.AudioContext || window.webkitAudioContext)();
    master = actx.createGain(); master.connect(actx.destination);
    musicGain = actx.createGain(); musicGain.gain.value = 0.45; musicGain.connect(master);
    sfxGain = actx.createGain(); sfxGain.gain.value = 0.8; sfxGain.connect(master);
    master.gain.value = AUDIO.muted ? 0 : 1;
  } catch (e) { actx = null; }
  if (actx && pendingMusic) { const m = pendingMusic; pendingMusic = null; music(m); }
}
export function setMuted(m) { AUDIO.muted = m; if (master) master.gain.value = m ? 0 : 1; }

async function getBuffer(path) {
  if (!actx) return null;
  if (buffers[path]) return buffers[path];
  buffers[path] = (async () => {
    try {
      const ab = await (await fetch(path)).arrayBuffer();
      return await new Promise((res, rej) => actx.decodeAudioData(ab, res, rej));
    } catch (e) { return null; }
  })();
  return buffers[path];
}

export function preloadSfx(names) { names.forEach((n) => getBuffer(`assets/sfx/${n}.wav`)); }

export async function sfx(name, vol = 1, rate = 1) {
  if (!actx) return;
  const b = await getBuffer(`assets/sfx/${name}.wav`);
  if (!b) return;
  const s = actx.createBufferSource(); s.buffer = b; s.playbackRate.value = rate;
  const g = actx.createGain(); g.gain.value = vol;
  s.connect(g); g.connect(sfxGain); s.start();
}

export async function jingle(name, vol = 0.9) {
  if (!actx) return;
  const b = await getBuffer(`assets/music/${name}.mp3`);
  if (!b) return;
  const s = actx.createBufferSource(); s.buffer = b;
  const g = actx.createGain(); g.gain.value = vol;
  s.connect(g); g.connect(sfxGain); s.start();
}

let pendingMusic = null;
export async function music(name) {
  if (!actx) { pendingMusic = name; return; }
  if (musicName === name) return;
  musicName = name;
  if (musicSrc) { try { musicSrc.stop(); } catch (e) { /* ok */ } musicSrc = null; }
  if (!name || !actx) return;
  const b = await getBuffer(`assets/music/${name}.mp3`);
  if (!b || musicName !== name) return;
  const s = actx.createBufferSource(); s.buffer = b; s.loop = true;
  s.connect(musicGain); s.start();
  musicSrc = s;
}
export function currentMusic() { return musicName; }
