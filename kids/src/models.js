// Blocky, Roblox-style 3D models built from boxes, cylinders and cones (three.js r128, global THREE).
// Units: 1 = one map tile. Feet stand at y = 0.

const T3 = () => window.THREE;

// ------------------------------------------------------------------ palettes
export const SKINS = { Classic: '#f5cd30', Peach: '#f2c49b', Tan: '#d39b6a', Brown: '#a06a42', Deep: '#6b4329' };
export const HAIRS = { Brown: '#6b3f22', Black: '#22202a', Blonde: '#f0c64a', Red: '#c8452f', Blue: '#3a8bd8', Pink: '#f27fb5', Green: '#5fae3e', Silver: '#d9d6e0' };
export const OUTFITS = { Blue: '#2f6fe0', Red: '#e0352b', Green: '#2fa34a', Purple: '#8a4fd8', Gold: '#f5b82e', Teal: '#1fb5a8', Pink: '#f26fae', Black: '#2b2b36' };
export const PET_COLORS = { Blue: '#3aa0ff', Pink: '#ff6fb0', Green: '#4fd36a', Gold: '#ffc83a', Purple: '#9a62ff', Red: '#ff4a3a', Paper: '#f4efe2' };

// ------------------------------------------------------------------ texture helpers
const texCache = new Map();
function canvasTex(key, w, h, paint, repeat) {
  if (texCache.has(key)) return texCache.get(key);
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  paint(c.getContext('2d'), w, h);
  const t = new (T3().CanvasTexture)(c);
  t.anisotropy = 4;
  if (repeat) { t.wrapS = t.wrapT = T3().RepeatWrapping; }
  texCache.set(key, t);
  return t;
}
function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  if (k > 0) { r += (255 - r) * k; g += (255 - g) * k; b += (255 - b) * k; } else { r *= 1 + k; g *= 1 + k; b *= 1 + k; }
  return `rgb(${r | 0},${g | 0},${b | 0})`;
}

/** Top face with 2x2 classic studs. */
export function studTex(color) {
  return canvasTex('stud' + color, 64, 64, (g, w) => {
    g.fillStyle = color; g.fillRect(0, 0, w, w);
    g.fillStyle = shade(color, -0.12); g.fillRect(0, 60, 64, 4); g.fillRect(60, 0, 4, 64);
    g.fillStyle = shade(color, 0.1); g.fillRect(0, 0, 64, 3); g.fillRect(0, 0, 3, 64);
    for (const [x, y] of [[16, 16], [48, 16], [16, 48], [48, 48]]) {
      g.fillStyle = shade(color, -0.2); g.beginPath(); g.arc(x + 1.5, y + 2, 9, 0, 7); g.fill();
      g.fillStyle = shade(color, 0.08); g.beginPath(); g.arc(x, y, 9, 0, 7); g.fill();
      g.fillStyle = shade(color, 0.22); g.beginPath(); g.arc(x - 2, y - 2.5, 4.5, 0, 7); g.fill();
    }
  });
}
/** Side face: plain plastic with a soft bevel and an inlet line. */
export function sideTex(color, lines = false) {
  return canvasTex('side' + color + lines, 64, 64, (g, w) => {
    g.fillStyle = color; g.fillRect(0, 0, w, w);
    g.fillStyle = shade(color, 0.12); g.fillRect(0, 0, 64, 4);
    g.fillStyle = shade(color, -0.14); g.fillRect(0, 60, 64, 4); g.fillRect(0, 0, 2, 64); g.fillRect(62, 0, 2, 64);
    if (lines) { g.fillStyle = shade(color, -0.1); g.fillRect(0, 31, 64, 2); g.fillRect(31, 0, 2, 31); g.fillRect(15, 33, 2, 31); g.fillRect(47, 33, 2, 31); }
  }, true);
}
function faceTex(skin, paint = 'None') {
  return canvasTex('face' + skin + paint, 256, 64, (g) => {
    g.fillStyle = skin; g.fillRect(0, 0, 256, 64);
    // face paint sits under the eyes and smile
    if (paint === 'Blush' || paint === 'Freckles') {
      g.fillStyle = paint === 'Blush' ? 'rgba(255,90,120,.45)' : 'rgba(150,80,40,.7)';
      for (const cx of [104, 152]) {
        if (paint === 'Blush') { g.beginPath(); g.ellipse(cx, 38, 9, 5, 0, 0, 7); g.fill(); }
        else for (const [dx, dy] of [[-4, 0], [3, -3], [4, 4], [-2, 5]]) { g.beginPath(); g.arc(cx + dx, 36 + dy, 1.6, 0, 7); g.fill(); }
      }
    }
    if (paint === 'Whiskers') {
      g.strokeStyle = '#1a1a1a'; g.lineWidth = 1.6;
      for (const sx of [-1, 1]) for (const dy of [-3, 1, 5]) { g.beginPath(); g.moveTo(128 + sx * 16, 36 + dy * 0.4); g.lineTo(128 + sx * 34, 33 + dy); g.stroke(); }
      g.fillStyle = '#ff8aa8'; g.beginPath(); g.arc(128, 31, 3, 0, 7); g.fill();
    }
    if (paint === 'Star') {
      g.fillStyle = '#ffd23a'; g.beginPath();
      for (let i = 0; i < 10; i++) { const r = i % 2 ? 4 : 9, a = -Math.PI / 2 + i * Math.PI / 5; g.lineTo(152 + Math.cos(a) * r, 22 + Math.sin(a) * r); }
      g.fill();
    }
    // face centred at u = 0.5 (front of the head)
    g.fillStyle = '#1a1a1a';
    g.beginPath(); g.ellipse(116, 26, 4.5, 7, 0, 0, 7); g.fill();
    g.beginPath(); g.ellipse(140, 26, 4.5, 7, 0, 0, 7); g.fill();
    g.strokeStyle = '#1a1a1a'; g.lineWidth = 4; g.lineCap = 'round';
    g.beginPath(); g.arc(128, 34, 13, 0.35, Math.PI - 0.35); g.stroke();
  });
}
/** Shirt with a pattern on it (Runway). */
function patternTex(base, pattern) {
  return canvasTex('pat' + base + pattern, 64, 64, (g) => {
    g.fillStyle = base; g.fillRect(0, 0, 64, 64);
    const lum = parseInt(base.slice(1, 3), 16) * 0.3 + parseInt(base.slice(3, 5), 16) * 0.59 + parseInt(base.slice(5, 7), 16) * 0.11;
    g.fillStyle = lum > 150 ? 'rgba(30,30,50,.55)' : 'rgba(255,255,255,.8)';
    if (pattern === 'Stripes') for (let y = 0; y < 64; y += 16) g.fillRect(0, y, 64, 7);
    if (pattern === 'Dots') for (let y = 8; y < 64; y += 16) for (let x = (y / 16 % 2) * 8 + 4; x < 64; x += 16) { g.beginPath(); g.arc(x, y, 3.5, 0, 7); g.fill(); }
    const shape = (cx, cy, kind) => {
      g.beginPath();
      if (kind === 'star') for (let i = 0; i < 10; i++) { const r = i % 2 ? 2.6 : 6, a = -Math.PI / 2 + i * Math.PI / 5; g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); }
      else { g.moveTo(cx, cy + 5); g.bezierCurveTo(cx - 9, cy - 2, cx - 4, cy - 8, cx, cy - 3); g.bezierCurveTo(cx + 4, cy - 8, cx + 9, cy - 2, cx, cy + 5); }
      g.fill();
    };
    if (pattern === 'Stars' || pattern === 'Hearts') for (const [x, y] of [[14, 14], [46, 22], [24, 44], [54, 52]]) shape(x, y, pattern === 'Stars' ? 'star' : 'heart');
  }, true);
}

export function letterTex(ch) {
  return canvasTex('letter' + ch, 128, 128, (g) => {
    g.fillStyle = '#ffd23a'; g.fillRect(0, 0, 128, 128);
    g.fillStyle = '#f0a020'; g.fillRect(0, 112, 128, 16); g.fillRect(112, 0, 16, 128);
    g.fillStyle = '#fff3b0'; g.fillRect(0, 0, 128, 8); g.fillRect(0, 0, 8, 128);
    g.fillStyle = '#3a2410'; g.font = 'bold 92px Fredoka, Arial Black, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(ch, 62, 66);
  });
}
function booksTex() {
  return canvasTex('books', 128, 128, (g) => {
    g.fillStyle = '#6b3f22'; g.fillRect(0, 0, 128, 128);
    const cols = ['#e0352b', '#2f6fe0', '#2fa34a', '#f5b82e', '#8a4fd8', '#1fb5a8', '#f26fae'];
    for (let shelf = 0; shelf < 3; shelf++) {
      let x = 8; const y = 8 + shelf * 40;
      g.fillStyle = '#4a2a16'; g.fillRect(4, y + 32, 120, 6);
      while (x < 118) { const w = 7 + ((x * 7 + shelf * 13) % 6); g.fillStyle = cols[(x + shelf * 3) % cols.length]; g.fillRect(x, y + 4 + (x % 5), w - 1, 28 - (x % 5)); x += w; }
    }
  });
}
function crackTex() {
  return canvasTex('crack', 64, 64, (g) => {
    g.fillStyle = '#9a98a8'; g.fillRect(0, 0, 64, 64);
    g.fillStyle = '#7d7b8c'; g.fillRect(0, 60, 64, 4); g.fillRect(60, 0, 4, 64);
    g.strokeStyle = '#3c3a48'; g.lineWidth = 3;
    g.beginPath(); g.moveTo(8, 14); g.lineTo(24, 26); g.lineTo(20, 40); g.lineTo(34, 50); g.lineTo(56, 46); g.moveTo(24, 26); g.lineTo(44, 18); g.lineTo(52, 6); g.stroke();
  });
}
export function textSprite(text, color = '#ffd23a', size = 1) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 64;
  const g = c.getContext('2d');
  g.font = 'bold 44px Fredoka, Arial Black, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.lineWidth = 9; g.strokeStyle = '#1b1430'; g.strokeText(text, 128, 34);
  g.fillStyle = color; g.fillText(text, 128, 34);
  const t = new (T3().CanvasTexture)(c);
  const s = new (T3().Sprite)(new (T3().SpriteMaterial)({ map: t, depthTest: false, transparent: true }));
  s.scale.set(2.4 * size, 0.6 * size, 1); s.renderOrder = 10;
  return s;
}
export function iconSprite(url, bg = '#f0a020') {
  const c = document.createElement('canvas'); c.width = 64; c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = '#1b1430'; roundRect(g, 2, 2, 60, 60, 14); g.fill();
  g.fillStyle = bg; roundRect(g, 6, 6, 52, 52, 11); g.fill();
  const t = new (T3().CanvasTexture)(c);
  const im = new Image(); im.onload = () => { g.imageSmoothingEnabled = false; g.drawImage(im, 12, 12, 40, 40); t.needsUpdate = true; }; im.src = url;
  const s = new (T3().Sprite)(new (T3().SpriteMaterial)({ map: t, depthTest: false, transparent: true }));
  s.scale.set(0.55, 0.55, 1); s.renderOrder = 9;
  return s;
}
function roundRect(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }

// ------------------------------------------------------------------ material + mesh helpers
const matCache = new Map();
export function plastic(color, opts = {}) {
  const key = color + JSON.stringify(opts);
  if (!opts.unique && matCache.has(key)) return matCache.get(key);
  const m = new (T3().MeshPhongMaterial)({ color, shininess: 28, specular: 0x222222, ...opts.mat });
  if (opts.transparent) { m.transparent = true; m.opacity = opts.opacity ?? 0.8; }
  if (opts.emissive) m.emissive = new (T3().Color)(opts.emissive);
  if (!opts.unique) matCache.set(key, m);
  return m;
}
function box(w, h, d, mat, x = 0, y = 0, z = 0) {
  const m = new (T3().Mesh)(new (T3().BoxGeometry)(w, h, d), mat);
  m.position.set(x, y, z); m.castShadow = true; return m;
}
function cyl(rt, rb, h, seg, mat, x = 0, y = 0, z = 0) {
  const m = new (T3().Mesh)(new (T3().CylinderGeometry)(rt, rb, h, seg), mat);
  m.position.set(x, y, z); m.castShadow = true; return m;
}
function cone(r, h, seg, mat, x = 0, y = 0, z = 0) {
  const m = new (T3().Mesh)(new (T3().ConeGeometry)(r, h, seg), mat);
  m.position.set(x, y, z); m.castShadow = true; return m;
}
function sphere(r, mat, x = 0, y = 0, z = 0, seg = 12) {
  const m = new (T3().Mesh)(new (T3().SphereGeometry)(r, seg, Math.max(6, seg * 0.7 | 0)), mat);
  m.position.set(x, y, z); m.castShadow = true; return m;
}
/** Each enemy/avatar keeps its own materials so it can flash on its own. */
function uniq(color, extra = {}) { return plastic(color, { ...extra, unique: true }); }

// ------------------------------------------------------------------ avatar (R6-style)
const S = 0.3; // one Roblox "stud" in tile units
export function makeAvatar(cfg) {
  const THREE = T3();
  const skin = SKINS[cfg.skin] || cfg.skinHex || SKINS.Classic;
  const shirt = OUTFITS[cfg.outfit] || cfg.outfitHex || OUTFITS.Blue;
  const pantsCol = cfg.pantsHex || '#2c3550';
  const hairCol = HAIRS[cfg.hair] || cfg.hairHex || HAIRS.Brown;
  const mats = [];
  const M = (c) => { const m = uniq(c); mats.push(m); return m; };
  const root = new THREE.Group();
  const body = new THREE.Group(); root.add(body);
  const legH = 2 * S, torsoH = 2 * S;
  // legs (pivot at hip)
  const mkLimb = (col, x, y, len) => {
    const piv = new THREE.Group(); piv.position.set(x, y, 0);
    piv.add(box(S * 0.98, len, S * 0.98, M(col), 0, -len / 2, 0));
    body.add(piv); return piv;
  };
  const legL = mkLimb(pantsCol, -S / 2, legH, legH);
  const legR = mkLimb(pantsCol, S / 2, legH, legH);
  // torso
  const shirtMat = M(shirt);
  if (cfg.pattern && cfg.pattern !== 'Plain') { shirtMat.color.set('#ffffff'); shirtMat.map = patternTex(shirt, cfg.pattern); }
  const torso = box(2 * S, torsoH, S, shirtMat, 0, legH + torsoH / 2, 0); body.add(torso);
  if (cfg.shoesHex) for (const leg of [legL, legR]) leg.add(box(S * 1.04, S * 0.34, S * 1.16, M(cfg.shoesHex), 0, -legH + S * 0.17, S * 0.06));
  // belt detail
  body.add(box(2 * S + 0.01, 0.05, S + 0.01, M(shade(shirt, -0.3)), 0, legH + 0.05, 0));
  const armL = mkLimb(cfg.sleeves === false ? skin : shirt, -1.5 * S, legH + torsoH - 0.02, torsoH);
  const armR = mkLimb(cfg.sleeves === false ? skin : shirt, 1.5 * S, legH + torsoH - 0.02, torsoH);
  // hands
  armL.add(box(S * 0.9, S * 0.5, S * 0.9, M(skin), 0, -torsoH + 0.05, 0));
  armR.add(box(S * 0.9, S * 0.5, S * 0.9, M(skin), 0, -torsoH + 0.05, 0));
  // head
  const headY = legH + torsoH + S * 0.62;
  const headGeo = new THREE.CylinderGeometry(S * 0.62, S * 0.62, S * 1.2, 20, 1, false, Math.PI, Math.PI * 2);
  const headSide = uniq('#ffffff'); headSide.map = faceTex(skin, cfg.face); mats.push(headSide);
  const headCap = M(skin);
  const head = new THREE.Mesh(headGeo, [headSide, headCap, headCap]); head.castShadow = true;
  head.position.y = headY; body.add(head);
  body.add(cyl(S * 0.3, S * 0.3, S * 0.2, 10, M(skin), 0, legH + torsoH + 0.02, 0));
  // hair
  if (cfg.hat !== 'Hood') {
    const hm = M(hairCol);
    body.add(box(S * 1.32, S * 0.32, S * 1.32, hm, 0, headY + S * 0.56, -0.01));
    body.add(box(S * 1.3, S * 0.75, S * 0.3, hm, 0, headY + S * 0.2, -S * 0.52));
    body.add(box(S * 0.25, S * 0.5, S * 1.0, hm, -S * 0.6, headY + S * 0.28, -0.05));
    body.add(box(S * 0.25, S * 0.5, S * 1.0, hm, S * 0.6, headY + S * 0.28, -0.05));
  }
  const hatTop = headY + S * 0.72;
  addHat(body, cfg.hat, hatTop, M, hairCol);
  if (cfg.acc && cfg.acc !== 'None') addAcc(body, cfg.acc, { legH, torsoH, headY }, M);
  // held item
  const held = new THREE.Group(); held.position.set(0, -torsoH + 0.02, S * 0.15); armR.add(held);
  const items = { Sword: makeSword(M), Staff: makeStaff(M), Hammer: makeHammer(M), Boomerang: makeBoomerang(M), Hook: makeHook(M) };
  for (const [k, g] of Object.entries(items)) { g.visible = false; held.add(g); }
  const api = {
    root, body, mats, legL, legR, armL, armR, head, items, height: headY + S,
    setItem(name) { for (const [k, g] of Object.entries(items)) g.visible = k === name; },
    flash(color) { for (const m of mats) m.emissive.set(color || 0x000000); },
  };
  api.setItem(cfg.item || null);
  return api;
}

/** Runway accessories, attached to the body. */
function addAcc(body, acc, { legH, torsoH, headY }, M) {
  const THREE = T3();
  const topY = legH + torsoH;
  switch (acc) {
    case 'Cape': { const c = box(2.1 * S, torsoH * 1.15, S * 0.12, M('#c8243a'), 0, legH + torsoH * 0.5, -S * 0.62); c.rotation.x = 0.12; body.add(c); body.add(box(2.1 * S, S * 0.2, S * 1.1, M('#ffc83a'), 0, topY - S * 0.05, -S * 0.05)); break; }
    case 'Wings': {
      for (const sx of [-1, 1]) {
        const w = new THREE.Group(); w.position.set(sx * S * 0.4, topY - S * 0.6, -S * 0.6); w.rotation.y = sx * 0.5;
        w.add(box(S * 1.5, S * 1.2, S * 0.06, M('#e8f4ff'), sx * S * 0.75, S * 0.2, 0));
        w.add(box(S * 1.0, S * 0.7, S * 0.07, M('#bfe0ff'), sx * S * 0.6, -S * 0.5, 0));
        body.add(w);
      }
      break;
    }
    case 'Scarf': {
      body.add(box(S * 1.5, S * 0.32, S * 1.2, M('#e0352b'), 0, topY + S * 0.08, 0));
      body.add(box(S * 0.36, S * 1.0, S * 0.12, M('#e0352b'), S * 0.4, topY - S * 0.45, S * 0.56));
      for (const y of [0.15, -0.1]) body.add(box(S * 1.52, S * 0.06, S * 1.22, M('#ffffff'), 0, topY + S * y, 0));
      break;
    }
    case 'Backpack': {
      body.add(box(S * 1.4, S * 1.5, S * 0.6, M('#3a7bff'), 0, legH + torsoH * 0.55, -S * 0.78));
      body.add(box(S * 1.0, S * 0.5, S * 0.18, M('#ffc83a'), 0, legH + torsoH * 0.35, -S * 1.12));
      break;
    }
    case 'Glasses': {
      const fr = M('#2b2b36');
      for (const sx of [-1, 1]) { const r = new THREE.Mesh(new THREE.TorusGeometry(S * 0.17, S * 0.04, 6, 14), fr); r.position.set(sx * S * 0.24, headY + S * 0.1, S * 0.64); body.add(r); }
      body.add(box(S * 0.14, S * 0.04, S * 0.04, fr, 0, headY + S * 0.12, S * 0.64));
      break;
    }
    case 'Necklace': {
      const n = new THREE.Mesh(new THREE.TorusGeometry(S * 0.52, S * 0.05, 6, 20), M('#ffd23a')); n.rotation.x = Math.PI / 2 - 0.3; n.position.set(0, topY - S * 0.12, S * 0.1); body.add(n);
      body.add(sphere(S * 0.12, M('#ff6fb0'), 0, topY - S * 0.5, S * 0.55, 8));
      break;
    }
    default: break;
  }
}

function addHat(body, hat, y, M, hairCol) {
  const THREE = T3();
  const g = new THREE.Group(); g.position.y = y; body.add(g);
  switch (hat) {
    case 'Cap': {
      g.add(cyl(S * 0.68, S * 0.7, S * 0.36, 16, M('#e0352b'), 0, 0, 0));
      g.add(box(S * 1.1, S * 0.07, S * 0.7, M('#b8241c'), 0, -S * 0.14, S * 0.6));
      g.add(sphere(S * 0.1, M('#ffffff'), 0, S * 0.2, 0, 8));
      break;
    }
    case 'Crown': {
      const gold = M('#ffc83a');
      g.add(cyl(S * 0.62, S * 0.62, S * 0.3, 14, gold, 0, S * 0.06, 0));
      for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; g.add(cone(S * 0.14, S * 0.34, 4, gold, Math.sin(a) * S * 0.55, S * 0.36, Math.cos(a) * S * 0.55)); }
      g.add(sphere(S * 0.1, M('#e0352b'), 0, S * 0.08, S * 0.62, 8));
      break;
    }
    case 'Wizard': {
      g.add(cyl(S * 1.05, S * 1.05, S * 0.08, 18, M('#5b2fa8'), 0, -S * 0.02, 0));
      const c = cone(S * 0.6, S * 1.7, 14, M('#7a45d0'), 0, S * 0.85, 0); c.rotation.z = 0.12; g.add(c);
      g.add(box(S * 0.2, S * 0.2, S * 0.05, M('#ffd23a'), S * 0.1, S * 0.55, S * 0.45));
      break;
    }
    case 'Flower': {
      const f = new THREE.Group(); f.position.set(S * 0.45, S * 0.05, S * 0.25);
      for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; f.add(sphere(S * 0.16, M('#ff6fb0'), Math.cos(a) * S * 0.2, Math.sin(a) * S * 0.2, 0, 8)); }
      f.add(sphere(S * 0.13, M('#ffd23a'), 0, 0, S * 0.05, 8));
      g.add(f);
      break;
    }
    case 'Bunny': {
      for (const sx of [-1, 1]) {
        const ear = new THREE.Group(); ear.position.set(sx * S * 0.32, 0, 0); ear.rotation.z = -sx * 0.12;
        ear.add(box(S * 0.3, S * 1.1, S * 0.16, M('#ffffff'), 0, S * 0.5, 0));
        ear.add(box(S * 0.16, S * 0.8, S * 0.02, M('#ffb0d0'), 0, S * 0.5, S * 0.09));
        g.add(ear);
      }
      break;
    }
    case 'Horns': {
      const helm = sphere(S * 0.7, M('#9aa0b0'), 0, -S * 0.18, 0, 14); helm.scale.y = 0.6; g.add(helm);
      for (const sx of [-1, 1]) { const h = cone(S * 0.14, S * 0.7, 8, M('#f4efe2'), sx * S * 0.75, S * 0.2, 0); h.rotation.z = -sx * 0.9; g.add(h); }
      break;
    }
    case 'Bow': {
      for (const sx of [-1, 1]) { const b = box(S * 0.36, S * 0.3, S * 0.12, M('#ff6fb0'), sx * S * 0.2, S * 0.05, -S * 0.2); b.rotation.z = sx * 0.4; g.add(b); }
      g.add(box(S * 0.14, S * 0.16, S * 0.14, M('#d64a8a'), 0, S * 0.05, -S * 0.2));
      break;
    }
    case 'Captain': {
      const blk = M('#1f1d2a'), gold = M('#ffc83a');
      g.add(cyl(S * 0.7, S * 0.72, S * 0.35, 16, blk, 0, S * 0.02, 0));
      g.add(box(S * 1.9, S * 0.12, S * 0.9, blk, 0, -S * 0.12, 0));
      g.add(box(S * 1.92, S * 0.05, S * 0.92, gold, 0, -S * 0.04, 0));
      const f = box(S * 0.12, S * 0.8, S * 0.08, M('#ffffff'), S * 0.4, S * 0.4, -S * 0.2); f.rotation.z = -0.5; g.add(f);
      break;
    }
    case 'Miner': {
      const helm = sphere(S * 0.72, M('#f5c82e'), 0, -S * 0.18, 0, 14); helm.scale.y = 0.7; g.add(helm);
      g.add(cyl(S * 0.78, S * 0.78, S * 0.08, 16, M('#e0a820'), 0, -S * 0.3, 0));
      g.add(cyl(S * 0.18, S * 0.18, S * 0.14, 10, M('#3a3a44'), 0, -S * 0.05, S * 0.66));
      const lamp = sphere(S * 0.13, uniq('#fff3b0', { emissive: '#ffcc33' }), 0, -S * 0.05, S * 0.75, 8); g.add(lamp);
      break;
    }
    case 'Laurel': {
      const leaf = M('#e8b330');
      for (let i = 0; i < 14; i++) {
        const a = i / 14 * Math.PI * 2; if (Math.abs(Math.sin(a)) > 0.95 && Math.cos(a) > 0) continue;
        const l = box(S * 0.22, S * 0.1, S * 0.36, leaf, Math.sin(a) * S * 0.66, -S * 0.12, Math.cos(a) * S * 0.66); l.rotation.y = a + 0.6; g.add(l);
      }
      break;
    }
    case 'Pirate': {
      const blk = M('#1f1d2a');
      g.add(cyl(S * 0.66, S * 0.7, S * 0.3, 14, blk, 0, 0, 0));
      const brim = box(S * 1.9, S * 0.46, S * 0.3, blk, 0, S * 0.2, 0); g.add(brim);
      g.add(box(S * 0.36, S * 0.3, S * 0.05, M('#ffffff'), 0, S * 0.25, S * 0.17));
      break;
    }
    case 'Astro': {
      const helm = new THREE.Mesh(new THREE.SphereGeometry(S * 0.98, 18, 14), uniq('#dfe8ff', { transparent: true, opacity: 0.35, mat: { shininess: 120 } }));
      helm.position.y = -S * 0.62; g.add(helm);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(S * 0.8, S * 0.12, 8, 20), M('#c9d3ec')); ring.rotation.x = Math.PI / 2; ring.position.y = -S * 1.42; g.add(ring);
      g.add(box(S * 0.1, S * 0.5, S * 0.1, M('#9aa0b0'), S * 0.6, S * 0.4, 0)); g.add(sphere(S * 0.12, M('#ff4a4a'), S * 0.6, S * 0.68, 0, 8));
      break;
    }
    case 'Tiara': {
      const gold = M('#ffd23a');
      g.add(box(S * 1.1, S * 0.12, S * 0.12, gold, 0, -S * 0.12, S * 0.42));
      for (const [x, h] of [[-0.36, 0.2], [0, 0.36], [0.36, 0.2]]) g.add(cone(S * 0.1, S * h, 4, gold, S * x, S * (0.0 + h / 2 - 0.06), S * 0.42));
      g.add(sphere(S * 0.08, M('#7ad0ff'), 0, S * 0.02, S * 0.5, 8));
      break;
    }
    case 'Witch': {
      g.add(cyl(S * 1.15, S * 1.15, S * 0.08, 18, M('#2a2040'), 0, -S * 0.02, 0));
      const c = cone(S * 0.62, S * 1.6, 14, M('#3a2f5a'), 0, S * 0.8, 0); c.rotation.z = -0.2; g.add(c);
      g.add(cyl(S * 0.64, S * 0.64, S * 0.16, 14, M('#4fd36a'), 0, S * 0.08, 0));
      break;
    }
    case 'Beanie': {
      const h = sphere(S * 0.7, M('#3a8bd8'), 0, -S * 0.15, 0, 14); h.scale.y = 0.75; g.add(h);
      g.add(cyl(S * 0.72, S * 0.72, S * 0.22, 16, M('#ffffff'), 0, -S * 0.32, 0));
      g.add(sphere(S * 0.2, M('#ffffff'), 0, S * 0.42, 0, 10));
      break;
    }
    case 'Sunhat': {
      g.add(cyl(S * 1.35, S * 1.35, S * 0.06, 20, M('#f5d48a'), 0, -S * 0.1, 0));
      g.add(cyl(S * 0.62, S * 0.68, S * 0.4, 16, M('#f5d48a'), 0, S * 0.1, 0));
      g.add(cyl(S * 0.69, S * 0.69, S * 0.12, 16, M('#ff6fb0'), 0, 0, 0));
      break;
    }
    case 'Chef': {
      g.add(cyl(S * 0.62, S * 0.62, S * 0.36, 16, M('#ffffff'), 0, 0, 0));
      for (const [x, z] of [[-0.25, 0], [0.25, 0], [0, 0.22], [0, -0.22], [0, 0]]) g.add(sphere(S * 0.4, M('#ffffff'), S * x, S * 0.45, S * z, 10));
      break;
    }
    case 'Shades': {
      const blk = M('#15151c');
      for (const sx of [-1, 1]) g.add(box(S * 0.42, S * 0.24, S * 0.05, blk, sx * S * 0.25, -S * 0.62, S * 0.64));
      g.add(box(S * 1.1, S * 0.07, S * 0.05, blk, 0, -S * 0.56, S * 0.64));
      g.add(box(S * 0.12, S * 0.05, S * 0.02, M('#ffffff'), -S * 0.3, -S * 0.56, S * 0.67));
      break;
    }
    case 'Halo': {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(S * 0.55, S * 0.09, 8, 24), uniq('#ffd23a', { emissive: '#aa7a00', mat: { shininess: 90 } }));
      ring.rotation.x = Math.PI / 2; ring.position.y = S * 0.55; ring.name = 'halo'; g.add(ring);
      break;
    }
    case 'Hood': {
      const h = sphere(S * 0.78, M(hairCol), 0, -S * 0.28, -S * 0.08, 14); h.scale.set(1, 1.05, 1.05); g.add(h);
      break;
    }
    default: break;
  }
}

/** A weapon model on its own (for pedestals), scaled up and standing upright. */
export function makeWeaponModel(name) {
  const M = (c) => uniq(c);
  const g = { Sword: makeSword, Staff: makeStaff, Hammer: makeHammer, Boomerang: makeBoomerang, Hook: makeHook }[name](M);
  g.rotation.set(name === 'Boomerang' ? Math.PI / 2 : 0, 0, 0);
  const wrap = new (T3().Group)(); wrap.add(g); wrap.scale.setScalar(name === 'Sword' ? 2.2 : 1.6);
  wrap.traverse((c) => { if (c.isMesh) c.castShadow = true; });
  return wrap;
}

function makeSword(M) {
  const g = new (T3().Group)();
  g.add(box(S * 0.14, S * 0.34, S * 0.14, M('#6b3f22'), 0, 0, 0));
  g.add(box(S * 0.6, S * 0.1, S * 0.16, M('#ffc83a'), 0, 0.07, 0));
  g.add(box(S * 0.2, S * 1.9, S * 0.08, M('#d8dde8'), 0, 0.07 + S * 0.98, 0));
  g.rotation.x = Math.PI / 2; g.position.z = 0.02;
  return g;
}
function makeStaff(M) {
  const g = new (T3().Group)();
  g.add(cyl(0.035, 0.035, 1.1, 6, M('#8a5a2b'), 0, 0.2, 0));
  const orb = sphere(0.1, uniq('#7ad0ff', { emissive: '#2a7ab8' }), 0, 0.78, 0, 10);
  g.add(orb);
  g.rotation.x = Math.PI / 2; return g;
}
function makeBoomerang(M) {
  const g = new (T3().Group)();
  const a = box(0.34, 0.05, 0.1, M('#e8a33a'), 0.12, 0.25, 0); a.rotation.y = 0.5; g.add(a);
  const b = box(0.34, 0.05, 0.1, M('#e8a33a'), -0.02, 0.25, 0.16); b.rotation.y = -1.07; g.add(b);
  g.add(box(0.08, 0.06, 0.08, M('#ff6a3a'), 0.27, 0.25, -0.06));
  g.rotation.x = Math.PI / 2; return g;
}
function makeHook(M) {
  const g = new (T3().Group)();
  g.add(cyl(0.03, 0.03, 0.55, 6, M('#5a4a48'), 0, 0.2, 0));
  const hook = new (T3().Group)(); hook.position.y = 0.5; g.add(hook);
  hook.add(box(0.06, 0.24, 0.06, M('#c9ccd6'), 0, 0.08, 0));
  for (const sx of [-1, 1]) { const t = box(0.18, 0.05, 0.05, M('#c9ccd6'), sx * 0.08, 0.2, 0); t.rotation.z = sx * 0.6; hook.add(t); }
  g.add(cyl(0.05, 0.05, 0.12, 8, M('#ff7a1a'), 0, -0.05, 0));
  g.rotation.x = Math.PI / 2; return g;
}
function makeHammer(M) {
  const g = new (T3().Group)();
  g.add(cyl(0.035, 0.035, 0.75, 6, M('#8a5a2b'), 0, 0.2, 0));
  g.add(box(0.36, 0.22, 0.22, M('#9aa0b0'), 0, 0.58, 0));
  g.add(box(0.38, 0.05, 0.24, M('#c8ccd6'), 0, 0.7, 0));
  g.rotation.x = Math.PI / 2; return g;
}

/** Animate an avatar: walk cycle, jump tuck, attacks. */
export function poseAvatar(a, st) {
  const t = st.time;
  const walk = st.moving ? Math.sin(t * 11) : 0;
  a.legL.rotation.x = walk * 0.7; a.legR.rotation.x = -walk * 0.7;
  a.armL.rotation.x = -walk * 0.6; a.armR.rotation.x = walk * 0.6;
  a.armR.rotation.z = 0; a.body.rotation.y = 0; a.body.position.y = st.moving ? Math.abs(Math.sin(t * 11)) * 0.04 : 0;
  if (st.air) { a.legL.rotation.x = -0.5; a.legR.rotation.x = 0.3; a.armL.rotation.z = -0.5; a.armR.rotation.z = 0.5; }
  else a.armL.rotation.z = 0;
  if (st.pose) {
    const k = st.poseT || 1;
    if (st.pose === 'Wave') { a.armR.rotation.z = 2.6 * k; a.armR.rotation.x = Math.sin(t * 9) * 0.35 * k; }
    if (st.pose === 'Peace') { a.armR.rotation.x = -2.2 * k; a.armR.rotation.z = 0.3 * k; }
    if (st.pose === 'Hero') { a.armL.rotation.z = -0.7 * k; a.armR.rotation.z = 0.7 * k; a.armL.rotation.x = 0.4 * k; a.armR.rotation.x = 0.4 * k; }
    if (st.pose === 'Twirl') { a.body.rotation.y = k * Math.PI * 2; a.armL.rotation.z = -1.2 * k; a.armR.rotation.z = 1.2 * k; }
    if (st.pose === 'Bow') { a.body.rotation.x = 0.5 * k; a.armR.rotation.x = 0.8 * k; }
    return;
  }
  a.body.rotation.x = 0;
  const atk = st.atk;
  if (atk) {
    const k = Math.min(1, atk.t / atk.dur);
    if (atk.kind === 'sword') { a.armR.rotation.x = -2.6 + k * 3.2; a.body.rotation.y = 0.5 - k * 1.0; }
    if (atk.kind === 'spin') { a.body.rotation.y = k * Math.PI * 4; a.armR.rotation.x = -1.57; a.armR.rotation.z = 0.4; }
    if (atk.kind === 'staff' || atk.kind === 'burst') { a.armR.rotation.x = -1.6; }
    if (atk.kind === 'hammer' || atk.kind === 'quake') {
      const up = atk.kind === 'quake' ? 0.25 : 0.2;
      a.armR.rotation.x = k < up / atk.dur ? -2.9 : -0.6; a.armL.rotation.x = a.armR.rotation.x;
    }
  } else if (st.holding) a.armR.rotation.x = Math.min(a.armR.rotation.x, -0.35);
}

// ------------------------------------------------------------------ pets
export function makePet(cfg) {
  const THREE = T3();
  const col = PET_COLORS[cfg.petColor] || PET_COLORS.Blue;
  const g = new THREE.Group();
  const eye = plastic('#1a1a1a');
  if (cfg.pet === 'Beetle') {
    const shell = sphere(0.22, plastic(col), 0, 0.17, 0, 12); shell.scale.set(1, 0.7, 1.25); g.add(shell);
    g.add(box(0.02, 0.1, 0.5, plastic(shade(col, -0.35)), 0, 0.3, 0));
    const head = sphere(0.12, plastic('#2b2b36'), 0, 0.14, 0.27, 10); g.add(head);
    g.add(box(0.04, 0.04, 0.02, plastic('#ffffff'), -0.05, 0.18, 0.37)); g.add(box(0.04, 0.04, 0.02, plastic('#ffffff'), 0.05, 0.18, 0.37));
    for (const sx of [-1, 1]) for (const z of [-0.12, 0, 0.12]) { const l = box(0.18, 0.03, 0.03, plastic('#2b2b36'), sx * 0.24, 0.06, z); l.rotation.z = sx * -0.5; g.add(l); }
  } else if (cfg.pet === 'Pup') {
    const fur = plastic(col), dark = plastic(shade(col, -0.35));
    g.add(box(0.26, 0.2, 0.42, fur, 0, 0.2, -0.02));
    for (const [x, z] of [[-0.09, 0.13], [0.09, 0.13], [-0.09, -0.15], [0.09, -0.15]]) g.add(box(0.08, 0.12, 0.08, dark, x, 0.06, z));
    g.add(box(0.28, 0.24, 0.24, fur, 0, 0.36, 0.22));
    g.add(box(0.12, 0.08, 0.1, plastic('#f4efe2'), 0, 0.3, 0.37));
    g.add(box(0.05, 0.04, 0.02, eye, 0, 0.33, 0.43));
    for (const sx of [-1, 1]) { g.add(box(0.07, 0.14, 0.06, dark, sx * 0.14, 0.42, 0.18)); g.add(box(0.05, 0.06, 0.02, eye, sx * 0.07, 0.41, 0.345)); }
    const tail = box(0.05, 0.05, 0.18, dark, 0, 0.3, -0.27); tail.rotation.x = 0.6; tail.name = 'tail'; g.add(tail);
  } else if (cfg.pet === 'Page') {
    const p = box(0.4, 0.5, 0.05, plastic(col), 0, 0.36, 0); g.add(p);
    g.add(box(0.26, 0.03, 0.06, plastic('#b8b0a0'), 0, 0.42, 0)); g.add(box(0.2, 0.03, 0.06, plastic('#b8b0a0'), 0, 0.34, 0));
    g.add(box(0.06, 0.08, 0.02, eye, -0.08, 0.52, 0.03)); g.add(box(0.06, 0.08, 0.02, eye, 0.08, 0.52, 0.03));
  } else {
    const b = box(0.42, 0.34, 0.42, plastic(col, { transparent: true, opacity: 0.82 }), 0, 0.17, 0); g.add(b);
    g.add(box(0.24, 0.18, 0.24, plastic(shade(col, -0.25)), 0, 0.14, 0));
    g.add(box(0.07, 0.1, 0.02, eye, -0.09, 0.22, 0.215)); g.add(box(0.07, 0.1, 0.02, eye, 0.09, 0.22, 0.215));
    g.add(box(0.03, 0.03, 0.02, plastic('#ffffff'), -0.075, 0.25, 0.225));
  }
  return g;
}

/** Emberpeak parts. */
export function makeHookPost() {
  const THREE = T3();
  const g = new THREE.Group();
  g.add(box(0.7, 0.3, 0.7, plastic('#4a4450'), 0, 0.15, 0));
  g.add(cyl(0.16, 0.2, 1.5, 10, plastic('#8a7a70'), 0, 1.0, 0));
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.07, 8, 18), plastic('#ffd23a', { emissive: '#664400' })); ring.position.y = 1.85; ring.name = 'ring'; g.add(ring);
  g.traverse((c) => { if (c.isMesh) c.castShadow = true; });
  return g;
}
export function makeValve() {
  const THREE = T3();
  const g = new THREE.Group();
  g.add(box(0.6, 0.6, 0.6, plastic('#4a4450'), 0, 0.3, 0));
  g.add(cyl(0.12, 0.12, 0.5, 8, plastic('#8a8494'), 0, 0.85, 0));
  const wheel = new THREE.Group(); wheel.position.y = 1.12; wheel.name = 'wheel'; g.add(wheel);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.06, 8, 20), uniq('#e0352b')); rim.rotation.x = Math.PI / 2; rim.name = 'rim'; wheel.add(rim);
  for (let i = 0; i < 2; i++) { const sp = box(0.66, 0.05, 0.05, plastic('#c9ccd6'), 0, 0, 0); sp.rotation.y = i * Math.PI / 2; wheel.add(sp); }
  g.traverse((c) => { if (c.isMesh) c.castShadow = true; });
  return g;
}
export function makeFan(dir) {
  const THREE = T3();
  const g = new THREE.Group();
  g.add(box(0.9, 0.9, 0.5, plastic('#5a525e'), 0, 0.45, -0.15));
  const blades = new THREE.Group(); blades.position.set(0, 0.5, 0.14); blades.name = 'blades'; g.add(blades);
  for (let i = 0; i < 3; i++) { const b = box(0.12, 0.38, 0.03, plastic('#c9ccd6'), 0, 0.18, 0); const piv = new THREE.Group(); piv.rotation.z = i * Math.PI * 2 / 3; piv.add(b); blades.add(piv); }
  const hub = cyl(0.08, 0.08, 0.06, 8, plastic('#ff7a1a'), 0, 0, 0); hub.rotation.x = Math.PI / 2; blades.add(hub);
  const light = sphere(0.07, uniq('#4fd36a', { emissive: '#1a6a2a' }), 0.32, 0.85, 0.12, 6); light.name = 'light'; g.add(light);
  g.rotation.y = { S: 0, E: Math.PI / 2, N: Math.PI, W: -Math.PI / 2 }[dir] || 0;
  g.traverse((c) => { if (c.isMesh) c.castShadow = true; });
  return g;
}
export function makeVent() {
  const THREE = T3();
  const g = new THREE.Group();
  g.add(box(0.8, 0.08, 0.8, plastic('#3a3440'), 0, 0.04, 0));
  for (const x of [-0.2, 0, 0.2]) g.add(box(0.08, 0.1, 0.6, plastic('#1a1418'), x, 0.06, 0));
  const glow = box(0.62, 0.02, 0.62, new THREE.MeshBasicMaterial({ color: '#ff7a1a', transparent: true, opacity: 0 }), 0, 0.1, 0); glow.name = 'glow'; g.add(glow);
  const steam = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.42, 2.2, 12, 1, true), new THREE.MeshBasicMaterial({ color: '#f4f4f4', transparent: true, opacity: 0.55, depthWrite: false, side: THREE.DoubleSide }));
  steam.position.y = 1.1; steam.name = 'steam'; steam.visible = false; g.add(steam);
  return g;
}
export function makeSlab() {
  const THREE = T3();
  const m = new THREE.MeshPhongMaterial({ color: '#ffffff', map: studTex('#6a6470'), shininess: 10 });
  const g = new THREE.Group();
  const b = new THREE.Mesh(new THREE.BoxGeometry(1, 0.6, 1), m); b.position.y = -0.3; b.receiveShadow = true; g.add(b);
  return g;
}
export function makeRock() {
  const THREE = T3();
  const r = new THREE.Mesh(new THREE.DodecahedronGeometry(0.32, 0), plastic('#4a4044', { emissive: '#3a1000' }));
  r.castShadow = true;
  return r;
}

/** Golden staircase that rises when a floor is cleared. Steps climb toward the camera's back (north). */
export function makeStairs() {
  const THREE = T3();
  const g = new THREE.Group();
  const step = new THREE.MeshPhongMaterial({ color: '#ffffff', map: studTex('#ffc83a'), shininess: 30, emissive: '#3a2400' });
  const side = plastic('#b07a1a');
  for (let i = 0; i < 4; i++) g.add(box(1.0, 0.25 * (i + 1), 0.3, i % 2 ? side : step, 0, 0.125 * (i + 1), 0.45 - i * 0.3));
  const arch = plastic('#7a45d0', { emissive: '#2a0f5a' });
  g.add(box(0.14, 1.9, 0.14, arch, -0.55, 0.95, -0.5)); g.add(box(0.14, 1.9, 0.14, arch, 0.55, 0.95, -0.5)); g.add(box(1.24, 0.18, 0.18, arch, 0, 1.9, -0.5));
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(0.96, 1.7), new THREE.MeshBasicMaterial({ color: '#fff3b0', transparent: true, opacity: 0.55, depthWrite: false, side: THREE.DoubleSide }));
  glow.position.set(0, 0.95, -0.52); glow.name = 'glow'; g.add(glow);
  g.traverse((c) => { if (c.isMesh) c.castShadow = true; });
  return g;
}

// ------------------------------------------------------------------ enemies
export function makeEnemy(type) {
  const THREE = T3();
  const g = new THREE.Group(); const body = new THREE.Group(); g.add(body);
  const mats = [];
  const M = (c, o) => { const m = uniq(c, o); mats.push(m); return m; };
  const eyes = (y, z, x = 0.1, s = 0.08, col = '#1a1a1a') => { body.add(box(s, s * 1.4, 0.02, M(col), -x, y, z)); body.add(box(s, s * 1.4, 0.02, M(col), x, y, z)); };
  let badge = null;
  switch (type) {
    case 'slime': {
      body.add(box(0.62, 0.5, 0.62, M('#4fd36a', { transparent: true, opacity: 0.85 }), 0, 0.25, 0));
      body.add(box(0.36, 0.26, 0.36, M('#2a8a3e'), 0, 0.2, 0));
      eyes(0.33, 0.32, 0.12, 0.09);
      body.add(box(0.2, 0.04, 0.02, M('#1a1a1a'), 0, 0.2, 0.32));
      break;
    }
    case 'scarab': {
      const sh = sphere(0.33, M('#2e8a6e'), 0, 0.22, -0.02, 12); sh.scale.set(1, 0.62, 1.2); body.add(sh);
      body.add(box(0.03, 0.12, 0.7, M('#1d5c4a'), 0, 0.42, -0.02));
      body.add(box(0.3, 0.2, 0.2, M('#2b2b36'), 0, 0.18, 0.4));
      eyes(0.22, 0.51, 0.08, 0.06, '#ffd23a');
      for (const sx of [-1, 1]) for (const z of [-0.2, 0, 0.2]) { const l = box(0.26, 0.05, 0.05, M('#2b2b36'), sx * 0.34, 0.08, z); l.rotation.z = sx * -0.4; body.add(l); }
      { const horn = cone(0.05, 0.25, 4, M('#ffd23a'), 0, 0.3, 0.55); horn.rotation.x = Math.PI / 2; body.add(horn); }
      break;
    }
    case 'wolf':
    case 'alpha': {
      const fur = type === 'alpha' ? '#8a4a32' : '#7d7f8f', dark = type === 'alpha' ? '#5e2e1e' : '#555766';
      body.add(box(0.5, 0.42, 0.95, M(fur), 0, 0.5, 0));
      const head = new THREE.Group(); head.position.set(0, 0.72, 0.55); body.add(head);
      head.add(box(0.42, 0.38, 0.38, M(fur), 0, 0, 0));
      head.add(box(0.24, 0.2, 0.26, M(dark), 0, -0.07, 0.28));
      head.add(box(0.08, 0.06, 0.04, M('#1a1a1a'), 0, -0.01, 0.42));
      head.add(box(0.07, 0.07, 0.02, M('#ff3a2a', { emissive: '#aa1100' }), -0.11, 0.07, 0.2));
      head.add(box(0.07, 0.07, 0.02, M('#ff3a2a', { emissive: '#aa1100' }), 0.11, 0.07, 0.2));
      for (const sx of [-1, 1]) head.add(cone(0.08, 0.2, 4, M(dark), sx * 0.13, 0.27, -0.05));
      for (const sx of [-1, 1]) for (const z of [-0.33, 0.33]) body.add(box(0.14, 0.32, 0.14, M(dark), sx * 0.17, 0.16, z));
      const tail = box(0.1, 0.1, 0.4, M(fur), 0, 0.62, -0.62); tail.rotation.x = -0.6; body.add(tail);
      if (type === 'alpha') for (let i = 0; i < 5; i++) body.add(cone(0.08, 0.3, 5, M('#4fd36a'), (i % 2 ? 0.12 : -0.12), 0.8, -0.36 + i * 0.16));
      else for (let i = 0; i < 3; i++) body.add(cone(0.05, 0.16, 5, M('#5fae3e'), 0, 0.75, -0.25 + i * 0.2));
      break;
    }
    case 'golem': {
      body.add(box(0.36, 0.34, 0.36, M('#7c7a8a'), -0.18, 0.17, 0)); body.add(box(0.36, 0.34, 0.36, M('#7c7a8a'), 0.18, 0.17, 0));
      body.add(box(0.85, 0.65, 0.6, M('#8e8c9c'), 0, 0.66, 0));
      body.add(box(0.46, 0.38, 0.42, M('#8e8c9c'), 0, 1.18, 0.03));
      body.add(box(0.3, 0.06, 0.02, M('#7ad0ff', { emissive: '#2a8ac8' }), 0, 1.2, 0.25));
      for (const sx of [-1, 1]) body.add(box(0.26, 0.62, 0.3, M('#7c7a8a'), sx * 0.56, 0.58, 0));
      const shell = new THREE.Group(); shell.name = 'shell'; body.add(shell);
      for (const [x, y, z, w, h] of [[0, 0.8, 0.31, 0.6, 0.3], [0.3, 0.55, 0.31, 0.24, 0.26], [-0.28, 0.5, 0.31, 0.26, 0.22], [0, 1.4, 0.04, 0.5, 0.1], [0, 0.66, -0.31, 0.7, 0.5]]) shell.add(box(w, h, 0.08, M('#5a5868'), x, y, z));
      badge = 'hammer';
      break;
    }
    case 'mite': {
      body.add(box(0.5, 0.18, 0.4, M('#8a3b2b'), 0, 0.22, 0));
      body.add(box(0.46, 0.12, 0.36, M('#f4efe2'), 0, 0.12, 0.01));
      body.add(box(0.5, 0.06, 0.4, M('#8a3b2b'), 0, 0.04, 0));
      eyes(0.27, 0.205, 0.08, 0.06, '#ffd23a');
      for (const sx of [-1, 1]) for (const z of [-0.12, 0.12]) { const l = box(0.18, 0.04, 0.04, M('#3a2410'), sx * 0.3, 0.06, z); l.rotation.z = sx * -0.5; body.add(l); }
      break;
    }
    case 'cinder': {
      const lava = M('#ff6a1a', { emissive: '#7a2000' });
      const b = box(0.46, 0.34, 0.46, lava, 0, 0.17, 0); body.add(b);
      body.add(box(0.5, 0.12, 0.5, M('#3a2a2a'), 0, 0.36, 0));
      for (const [x, z] of [[-0.12, 0.1], [0.14, -0.08], [0, 0.18]]) body.add(box(0.1, 0.1, 0.1, M('#ffd23a', { emissive: '#aa6600' }), x, 0.46, z));
      eyes(0.22, 0.235, 0.1, 0.07);
      break;
    }
    case 'bat': {
      const ash = M('#4a3a44');
      body.add(box(0.3, 0.26, 0.26, ash, 0, 0, 0));
      for (const sx of [-1, 1]) { const w = box(0.4, 0.04, 0.26, M('#6a4a58'), sx * 0.32, 0.04, 0); w.name = sx < 0 ? 'wingL' : 'wingR'; body.add(w); }
      for (const sx of [-1, 1]) body.add(cone(0.05, 0.12, 4, ash, sx * 0.08, 0.18, 0));
      body.add(box(0.05, 0.05, 0.02, M('#ff7a1a', { emissive: '#aa3300' }), -0.06, 0.03, 0.14)); body.add(box(0.05, 0.05, 0.02, M('#ff7a1a', { emissive: '#aa3300' }), 0.06, 0.03, 0.14));
      break;
    }
    case 'coil': {
      const iron = M('#4a4450');
      body.add(cyl(0.38, 0.44, 0.3, 10, iron, 0, 0.15, 0));
      for (let i = 0; i < 4; i++) body.add(cyl(0.3, 0.3, 0.1, 12, M('#ff7a1a', { emissive: '#aa3300' }), 0, 0.42 + i * 0.22, 0));
      body.add(cyl(0.12, 0.12, 0.95, 8, iron, 0, 0.75, 0));
      const top = sphere(0.2, M('#ffd23a', { emissive: '#ff8800' }), 0, 1.35, 0, 10); top.name = 'core'; body.add(top);
      break;
    }
    case 'warden': {
      // The Cinder Warden: a hulking iron furnace with glowing seams
      const iron = M('#5a525e'), glow = M('#ff7a1a', { emissive: '#aa3300' });
      for (const sx of [-1, 1]) body.add(box(0.36, 0.5, 0.4, iron, sx * 0.3, 0.25, 0));
      body.add(box(1.1, 0.9, 0.8, iron, 0, 0.95, 0));
      body.add(box(1.12, 0.08, 0.82, glow, 0, 0.78, 0)); body.add(box(1.12, 0.08, 0.82, glow, 0, 1.15, 0));
      body.add(box(0.5, 0.3, 0.05, glow, 0, 1.0, 0.41));
      for (const sx of [-1, 1]) body.add(box(0.32, 0.8, 0.32, iron, sx * 0.72, 0.95, 0));
      body.add(box(0.6, 0.45, 0.55, iron, 0, 1.62, 0));
      body.add(box(0.36, 0.08, 0.02, glow, 0, 1.66, 0.28));
      const shell = box(1.3, 1.1, 1.0, M('#8a8494', { transparent: true, opacity: 0.55 }), 0, 1.0, 0); shell.name = 'shell'; body.add(shell);
      for (const sx of [-1, 1]) body.add(cyl(0.1, 0.12, 0.4, 8, M('#3a3440'), sx * 0.2, 2.0, -0.1));
      break;
    }
    case 'knight': {
      // Mirror Knight: silver armour, a mirror shield
      const steel = M('#c9d3ec'), dark = M('#6a7aaa');
      body.add(box(0.46, 0.46, 0.34, steel, 0, 0.5, 0));
      body.add(box(0.36, 0.34, 0.34, steel, 0, 0.92, 0));
      body.add(box(0.38, 0.08, 0.06, M('#2a3260'), 0, 0.94, 0.17));
      body.add(box(0.06, 0.2, 0.06, dark, 0, 1.18, 0));
      for (const sx of [-1, 1]) body.add(box(0.14, 0.28, 0.16, dark, sx * 0.12, 0.14, 0));
      const sh = box(0.06, 0.5, 0.4, M('#e8f4ff', { emissive: '#3a5a8a' }), -0.3, 0.55, 0.05); body.add(sh);
      body.add(box(0.04, 0.5, 0.05, M('#d8dde8'), 0.3, 0.6, 0.12));
      break;
    }
    case 'king': {
      // The Nameless King: a tall robed figure with a mirror for a face
      const robe = M('#3a2f6a'), trim = M('#ffc83a'), glass = M('#e8f4ff', { emissive: '#4a6a9a' });
      body.add(box(0.8, 0.9, 0.6, robe, 0, 0.45, 0));
      body.add(box(0.84, 0.08, 0.64, trim, 0, 0.06, 0));
      body.add(box(0.64, 0.6, 0.5, M('#4a3f8a'), 0, 1.2, 0));
      for (const sx of [-1, 1]) body.add(box(0.22, 0.6, 0.22, robe, sx * 0.44, 1.1, 0));
      body.add(box(0.46, 0.5, 0.4, M('#2a2050'), 0, 1.75, 0));
      const face = box(0.36, 0.4, 0.04, glass, 0, 1.75, 0.21); face.name = 'face'; body.add(face);
      const crown = new THREE.Group(); crown.position.y = 2.05; body.add(crown);
      crown.add(box(0.5, 0.12, 0.44, trim, 0, 0, 0));
      for (const [x, z] of [[-0.2, 0.2], [0.2, 0.2], [0, 0.2], [-0.2, -0.2], [0.2, -0.2]]) crown.add(box(0.08, 0.16, 0.06, trim, x, 0.13, z));
      const cape = box(0.86, 1.3, 0.06, M('#5a2a8a'), 0, 1.0, -0.33); cape.rotation.x = 0.12; body.add(cape);
      break;
    }
    case 'imp': {
      // Mirror Imp: a silver crystal shard with a cheeky face
      const glass = M('#dfe8ff', { emissive: '#2a3a6a' });
      const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.3, 0), glass); core.scale.set(1, 1.25, 0.8); core.position.y = 0.42; core.name = 'core'; body.add(core);
      body.add(box(0.5, 0.05, 0.05, M('#9fb4e8'), 0, 0.42, 0));
      eyes(0.48, 0.2, 0.08, 0.07, '#2a1f45');
      for (const sx of [-1, 1]) { const f = box(0.05, 0.18, 0.05, M('#9fb4e8'), sx * 0.12, 0.1, 0); f.rotation.z = sx * 0.3; body.add(f); }
      break;
    }
    case 'page': {
      const pg = box(0.55, 0.04, 0.7, M('#f4efe2'), 0, 0, 0); body.add(pg);
      for (const z of [-0.15, 0.05]) body.add(box(0.36, 0.05, 0.04, M('#9a93a8'), 0, 0.01, z));
      body.add(box(0.08, 0.06, 0.1, M('#7a45d0'), -0.1, 0.04, 0.25)); body.add(box(0.08, 0.06, 0.1, M('#7a45d0'), 0.1, 0.04, 0.25));
      body.rotation.x = -0.5;
      break;
    }
    case 'archivore': {
      const cover = M('#4a2a7a'), trim = M('#ffc83a'), dark = M('#2a1440');
      body.add(box(1.7, 1.2, 0.9, cover, 0, 1.0, 0));
      body.add(box(1.72, 0.1, 0.92, trim, 0, 1.6, 0)); body.add(box(1.72, 0.1, 0.92, trim, 0, 0.4, 0));
      body.add(box(1.5, 1.0, 0.1, M('#f4efe2'), 0, 1.0, -0.46));
      const eye = new THREE.Group(); eye.position.set(0, 1.05, 0.46); body.add(eye);
      eye.add(sphere(0.38, M('#ffffff'), 0, 0, 0, 16));
      eye.add(sphere(0.22, M('#ffc83a', { emissive: '#aa6600' }), 0, 0, 0.22, 12));
      eye.add(sphere(0.11, M('#140a20'), 0, 0, 0.36, 10));
      for (const sx of [-1, 1]) {
        const wing = new THREE.Group(); wing.position.set(sx * 0.85, 1.2, 0); wing.name = sx < 0 ? 'wingL' : 'wingR'; body.add(wing);
        for (let i = 0; i < 4; i++) { const pg = box(0.9, 0.05, 0.5, M(i % 2 ? '#f4efe2' : '#e6dcc4'), sx * 0.45, i * 0.12, 0); pg.rotation.z = sx * (0.3 + i * 0.18); wing.add(pg); }
      }
      for (let i = 0; i < 5; i++) { const tnt = cyl(0.07, 0.03, 0.8, 6, dark, -0.6 + i * 0.3, 0.2, 0.1); tnt.rotation.z = Math.sin(i) * 0.3; body.add(tnt); }
      for (const sx of [-1, 1]) body.add(cone(0.12, 0.5, 5, trim, sx * 0.7, 1.85, 0));
      break;
    }
    default: body.add(box(0.5, 0.5, 0.5, M('#ff00ff'), 0, 0.25, 0));
  }
  return { root: g, body, mats, badge, flash(c) { for (const m of mats) m.emissive.set(c || 0x000000); } };
}

// ------------------------------------------------------------------ props
export function makeProp(id) {
  const THREE = T3();
  const g = new THREE.Group();
  const studGreen = (c) => new THREE.MeshPhongMaterial({ color: '#ffffff', map: studTex(c), shininess: 20, specular: 0x111111 });
  switch (id) {
    case 'tree_willow': {
      g.add(box(0.5, 1.6, 0.5, plastic('#7a4a26'), 0, 0.8, 0));
      const leaf = studGreen('#5cc24a');
      for (const [x, y, z, s] of [[0, 2.0, 0, 1.9], [0.7, 1.6, 0.3, 1.0], [-0.7, 1.7, -0.2, 1.1], [0.2, 2.7, 0.1, 1.1]]) g.add(box(s, s * 0.7, s, leaf, x, y, z));
      g.position.x = 0.5;
      break;
    }
    case 'tree_pine': {
      g.add(box(0.3, 0.7, 0.3, plastic('#7a4a26'), 0, 0.35, 0));
      const leaf = plastic('#2f8f45');
      g.add(cone(0.8, 1.0, 6, leaf, 0, 1.1, 0)); g.add(cone(0.62, 0.9, 6, leaf, 0, 1.6, 0)); g.add(cone(0.42, 0.8, 6, leaf, 0, 2.1, 0));
      break;
    }
    case 'bush': {
      const b = box(0.9, 0.7, 0.9, studGreen('#4bb543'), 0, 0.35, 0); g.add(b);
      g.add(box(0.5, 0.25, 0.5, studGreen('#5cc24a'), 0.1, 0.8, 0.05));
      break;
    }
    case 'pot': {
      g.add(cyl(0.26, 0.2, 0.45, 8, plastic('#b0702a'), 0, 0.23, 0));
      g.add(cyl(0.2, 0.26, 0.1, 8, plastic('#8a5320'), 0, 0.5, 0));
      break;
    }
    case 'bookshelf': {
      const side = plastic('#6b3f22');
      const front = new THREE.MeshPhongMaterial({ color: '#ffffff', map: booksTex(), shininess: 10 });
      const m = new THREE.Mesh(new THREE.BoxGeometry(1.9, 2.2, 0.6), [side, side, side, side, front, side]);
      m.position.set(0.5, 1.1, -0.2); m.castShadow = true; g.add(m);
      break;
    }
    case 'lamp_post': {
      g.add(cyl(0.08, 0.1, 1.7, 6, plastic('#2b2b36'), 0, 0.85, 0));
      g.add(box(0.5, 0.06, 0.06, plastic('#2b2b36'), 0.18, 1.62, 0));
      const lamp = box(0.26, 0.34, 0.26, uniq('#ffe08a', { emissive: '#222222' }), 0.38, 1.4, 0); lamp.name = 'lamp'; g.add(lamp);
      g.add(box(0.32, 0.06, 0.32, plastic('#2b2b36'), 0.38, 1.6, 0));
      break;
    }
    case 'prop_thirteenth_bell': {
      const wood = plastic('#7a4a26');
      g.add(box(0.2, 2.2, 0.2, wood, -0.9, 1.1, 0)); g.add(box(0.2, 2.2, 0.2, wood, 0.9, 1.1, 0)); g.add(box(2.1, 0.22, 0.26, wood, 0, 2.2, 0));
      const pts = []; for (let i = 0; i <= 10; i++) { const k = i / 10; pts.push(new THREE.Vector2(0.12 + Math.pow(k, 2.2) * 0.55, 1.95 - k * 0.95)); }
      const bell = new THREE.Mesh(new THREE.LatheGeometry(pts, 16), plastic('#ffc83a', { mat: { side: THREE.DoubleSide, shininess: 80, specular: 0x886622 } }));
      bell.castShadow = true; bell.name = 'bell'; g.add(bell);
      g.add(sphere(0.1, plastic('#b0702a'), 0, 0.95, 0, 8));
      break;
    }
    case 'chest_gold': {
      g.add(box(0.8, 0.45, 0.55, plastic('#8a5320'), 0, 0.23, 0));
      const lid = new THREE.Group(); lid.position.set(0, 0.45, -0.27); lid.name = 'lid'; g.add(lid);
      lid.add(box(0.82, 0.22, 0.57, plastic('#9a6028'), 0, 0.11, 0.27));
      for (const x of [-0.3, 0.3]) g.add(box(0.08, 0.5, 0.58, plastic('#ffc83a'), x, 0.25, 0));
      g.add(box(0.14, 0.16, 0.04, plastic('#ffc83a'), 0, 0.4, 0.29));
      break;
    }
    case 'boulder': {
      const rock = new THREE.Mesh(new THREE.IcosahedronGeometry(0.62, 0), new THREE.MeshPhongMaterial({ color: '#8e8c9c', flatShading: true, shininess: 10 }));
      rock.position.y = 0.5; rock.scale.set(1, 0.85, 1); rock.castShadow = true; g.add(rock);
      const crack = plastic('#3c3a48');
      for (const [x, y, z, rz] of [[0.05, 0.62, 0.5, 0.6], [-0.12, 0.45, 0.52, -0.5], [0.18, 0.35, 0.48, 0.2]]) { const c = box(0.3, 0.05, 0.05, crack, x, y, z); c.rotation.z = rz; g.add(c); }
      break;
    }
    case 'gate_block': {
      g.add(box(0.96, 2.4, 0.96, plastic('#5d5872'), 0, 1.2, 0));
      for (const y of [0.6, 1.4, 2.2]) g.add(box(0.98, 0.08, 0.98, plastic('#7a45d0', { emissive: '#2a0f5a' }), 0, y, 0));
      break;
    }
    case 'weapon_pedestal': {
      const stone = plastic('#8d8aa0'), dark = plastic('#5d5872'), gold = plastic('#ffc83a', { emissive: '#553300' });
      g.add(box(0.9, 0.18, 0.9, dark, 0, 0.09, 0));
      g.add(box(0.6, 0.5, 0.6, stone, 0, 0.43, 0));
      g.add(box(0.82, 0.12, 0.82, gold, 0, 0.74, 0));
      const glow = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 1.4, 16, 1, true), new THREE.MeshBasicMaterial({ color: '#ffe27a', transparent: true, opacity: 0.25, depthWrite: false, side: THREE.DoubleSide }));
      glow.position.y = 1.5; glow.name = 'glow'; g.add(glow);
      break;
    }
    case 'secret_chest': {
      const purple = plastic('#7a45d0'), gold = plastic('#ffc83a', { emissive: '#553300' });
      g.add(box(0.8, 0.45, 0.55, purple, 0, 0.23, 0));
      const lid = new THREE.Group(); lid.position.set(0, 0.45, -0.27); lid.name = 'lid'; g.add(lid);
      lid.add(box(0.82, 0.22, 0.57, plastic('#8a55e0'), 0, 0.11, 0.27));
      lid.add(box(0.84, 0.06, 0.06, gold, 0, 0.0, 0.55));
      for (const x of [-0.3, 0.3]) g.add(box(0.08, 0.5, 0.58, gold, x, 0.25, 0));
      const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.16, 0), uniq('#7ad0ff', { emissive: '#2a8ac8' }));
      gem.position.y = 1.0; gem.name = 'gem'; gem.castShadow = true; g.add(gem);
      break;
    }
    default: g.add(box(0.8, 0.8, 0.8, plastic('#ff00ff'), 0, 0.4, 0));
  }
  return g;
}

// ------------------------------------------------------------------ pickups and bits
export function makePickup(k) {
  const THREE = T3();
  const g = new THREE.Group();
  if (k.kind === 'coin') {
    const c = cyl(0.2, 0.2, 0.06, 16, plastic('#ffc83a', { emissive: '#553300', mat: { shininess: 90, specular: 0xaa8833 } }), 0, 0, 0);
    c.rotation.x = Math.PI / 2; g.add(c);
    g.add(box(0.06, 0.2, 0.08, plastic('#f0a020'), 0, 0, 0));
  } else if (k.kind === 'heart') {
    const sh = new THREE.Shape();
    sh.moveTo(0, -0.22); sh.bezierCurveTo(-0.32, 0, -0.26, 0.24, 0, 0.12); sh.bezierCurveTo(0.26, 0.24, 0.32, 0, 0, -0.22);
    const m = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: 0.12, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 2 }), plastic('#ff3a4a', { emissive: '#440000' }));
    m.position.z = -0.06; m.castShadow = true; g.add(m);
  } else if (k.kind === 'scroll') {
    const r = cyl(0.12, 0.12, 0.5, 12, plastic('#f4efe2', { emissive: '#333322' }), 0, 0, 0); r.rotation.z = Math.PI / 2; g.add(r);
    for (const x of [-0.27, 0.27]) { const e = cyl(0.06, 0.06, 0.08, 8, plastic('#8a5a2b'), x, 0, 0); e.rotation.z = Math.PI / 2; g.add(e); }
    g.add(box(0.06, 0.26, 0.26, plastic('#e0352b'), 0, 0, 0));
  } else if (k.kind === 'letter') {
    const mat = new THREE.MeshPhongMaterial({ color: '#ffffff', map: letterTex(k.ch), emissive: '#332200', shininess: 40 });
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.62, 0.62), mat); b.castShadow = true; g.add(b);
  }
  return g;
}

export function makeShot(s) {
  const THREE = T3();
  const g = new THREE.Group();
  if (s.kind === 'spark') {
    g.add(sphere(s.big ? 0.16 : 0.12, plastic('#9ae0ff', { emissive: '#3aa0ff' }), 0, 0, 0, 8));
    const halo = sphere(s.big ? 0.28 : 0.22, plastic('#7ad0ff', { transparent: true, opacity: 0.35, emissive: '#3aa0ff' }), 0, 0, 0, 8); halo.castShadow = false; g.add(halo);
  } else if (s.kind === 'rang') {
    const wood = plastic('#e8a33a', { emissive: '#3a2400' }), tip = plastic('#ff6a3a');
    const spin = new THREE.Group(); spin.name = 'spin';
    const a = box(0.42, 0.06, 0.12, wood, 0.16, 0, 0); a.rotation.y = 0.5; spin.add(a);
    const b = box(0.42, 0.06, 0.12, wood, -0.04, 0, 0.2); b.rotation.y = -1.07; spin.add(b);
    spin.add(box(0.1, 0.07, 0.1, tip, 0.33, 0, -0.08));
    if (s.big) spin.scale.setScalar(1.3);
    g.add(spin);
  } else if (s.kind === 'hook') {
    const h = new THREE.Group(); h.name = 'spin';
    h.add(box(0.07, 0.07, 0.24, plastic('#c9ccd6'), 0, 0, 0));
    for (const sx of [-1, 1]) { const t = box(0.16, 0.05, 0.05, plastic('#c9ccd6'), sx * 0.07, 0, 0.1); t.rotation.y = sx * 0.6; h.add(t); }
    g.add(h);
  } else if (s.kind === 'fire') {
    g.add(sphere(0.16, plastic('#ffb020', { emissive: '#ff6a00' }), 0, 0, 0, 10));
    const halo = sphere(0.27, plastic('#ff6a1a', { transparent: true, opacity: 0.35, emissive: '#aa3300' }), 0, 0, 0, 8); halo.castShadow = false; g.add(halo);
  } else if (s.kind === 'shard') {
    const c = new THREE.Mesh(new THREE.OctahedronGeometry(0.15, 0), plastic('#e8f4ff', { emissive: '#4a7ac8' })); c.scale.set(0.7, 1.4, 0.7); c.name = 'spin';
    g.add(c);
    const halo = sphere(0.24, plastic('#9fc4ff', { transparent: true, opacity: 0.3, emissive: '#3a6ab8' }), 0, 0, 0, 8); halo.castShadow = false; g.add(halo);
  } else if (s.kind === 'ink') {
    g.add(sphere(0.17, plastic('#5a2a9a', { emissive: '#2a0f5a' }), 0, 0, 0, 10));
    const halo = sphere(0.27, plastic('#9a62ff', { transparent: true, opacity: 0.3, emissive: '#5a2a9a' }), 0, 0, 0, 8); halo.castShadow = false; g.add(halo);
  } else {
    const c = cone(0.1, 0.32, 5, plastic('#4fd36a', { emissive: '#113300' }), 0, 0, 0); c.rotation.x = Math.PI / 2; g.add(c);
  }
  return g;
}

export function makePlatform(w = 2, d = 1, raft = false, style = '') {
  const THREE = T3();
  const g = new THREE.Group();
  if (style === 'cart') {
    // a mine cart on rails
    const iron = plastic('#5a525e'), rim = plastic('#8a8494');
    g.add(box(w - 0.1, 0.5, d - 0.1, iron, w / 2, -0.05, d / 2));
    g.add(box(w, 0.1, d, rim, w / 2, 0.22, d / 2));
    for (const x of [0.35, w - 0.35]) for (const z of [0.05, d - 0.05]) { const wh = cyl(0.18, 0.18, 0.08, 10, plastic('#2b2b36'), x, -0.32, z); wh.rotation.x = Math.PI / 2; g.add(wh); }
    g.add(box(w - 0.4, 0.06, d - 0.4, plastic('#3a3440'), w / 2, 0.2, d / 2));
    g.traverse((c) => { if (c.isMesh) c.castShadow = true; });
    return g;
  }
  const side = plastic(raft ? '#7a4a26' : '#9a6028');
  const top = new THREE.MeshPhongMaterial({ color: '#ffffff', map: studTex(raft ? '#a8743a' : '#c48a3e'), shininess: 20 });
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, raft ? 0.35 : 0.5, d), [side, side, top, side, side, side]);
  m.position.set(w / 2, raft ? -0.17 : -0.25, d / 2); m.castShadow = true; m.receiveShadow = true; g.add(m);
  if (raft) {
    for (const x of [0.15, w - 0.15]) g.add(box(0.12, 0.7, 0.12, plastic('#5a3418'), x, 0.3, d / 2));
    g.add(box(w - 0.2, 0.08, 0.08, plastic('#d9c08a'), w / 2, 0.6, d / 2));
  }
  return g;
}

// ------------------------------------------------------------------ puzzle pieces
export function makeCrate() {
  const THREE = T3();
  const side = new THREE.MeshPhongMaterial({ color: '#ffffff', map: sideTex('#b07436', true), shininess: 10 });
  const top = new THREE.MeshPhongMaterial({ color: '#ffffff', map: studTex('#c48a3e'), shininess: 10 });
  const m = new THREE.Mesh(new THREE.BoxGeometry(0.94, 0.94, 0.94), [side, side, top, side, side, side]);
  m.castShadow = true; m.receiveShadow = true;
  return m;
}
export function makePlate() {
  const g = new (T3().Group)();
  g.add(cyl(0.44, 0.46, 0.08, 20, plastic('#5d5872'), 0, 0.04, 0));
  const top = cyl(0.36, 0.36, 0.08, 20, uniq('#ffc83a', { emissive: '#664400' }), 0, 0.1, 0); top.name = 'top'; g.add(top);
  return g;
}
export function makeGate() {
  const g = new (T3().Group)();
  const iron = plastic('#3d3358'), gold = plastic('#ffc83a');
  for (const x of [-0.32, -0.1, 0.12, 0.34]) g.add(cyl(0.06, 0.06, 2.2, 8, iron, x, 1.1, 0));
  g.add(box(0.96, 0.12, 0.16, gold, 0, 2.15, 0)); g.add(box(0.96, 0.1, 0.16, iron, 0, 0.9, 0));
  return g;
}
export function makeLever() {
  const g = new (T3().Group)();
  g.add(box(0.6, 0.3, 0.5, plastic('#5d5872'), 0, 0.15, 0));
  const arm = new (T3().Group)(); arm.position.y = 0.3; arm.name = 'arm'; g.add(arm);
  arm.add(cyl(0.05, 0.05, 0.7, 6, plastic('#8a5a2b'), 0, 0.35, 0));
  const knob = sphere(0.13, uniq('#ff4a4a', { emissive: '#330000' }), 0, 0.72, 0, 10); knob.name = 'knob'; arm.add(knob);
  arm.rotation.z = 0.6;
  return g;
}
export function makeBrazier() {
  const g = new (T3().Group)();
  g.add(box(0.5, 0.7, 0.5, plastic('#5d5872'), 0, 0.35, 0));
  g.add(cyl(0.42, 0.26, 0.3, 10, plastic('#3d3358'), 0, 0.85, 0));
  const fire = new (T3().Group)(); fire.position.y = 1.0; fire.name = 'fire'; g.add(fire);
  fire.add(cone(0.26, 0.6, 6, plastic('#ff8a1a', { emissive: '#ff5a00' }), 0, 0.25, 0));
  fire.add(cone(0.14, 0.4, 6, plastic('#ffe08a', { emissive: '#ffb020' }), 0, 0.22, 0));
  fire.visible = false;
  return g;
}
export function makeReset() {
  const tex = canvasTex('swirl', 128, 128, (g) => {
    g.fillStyle = '#3aa0ff'; g.beginPath(); g.arc(64, 64, 62, 0, 7); g.fill();
    g.strokeStyle = '#d6f0ff'; g.lineWidth = 9; g.lineCap = 'round';
    g.beginPath(); for (let a = 0; a < 9; a += 0.1) { const r = 6 + a * 5.6; g.lineTo(64 + Math.cos(a) * r, 64 + Math.sin(a) * r); } g.stroke();
  });
  const m = new (T3().Mesh)(new (T3().CircleGeometry)(0.45, 24), new (T3().MeshBasicMaterial)({ map: tex, transparent: true }));
  m.rotation.x = -Math.PI / 2; m.position.y = 0.03;
  return m;
}

/** Light-beam puzzle parts: a lamp that shines one way, a turnable mirror, a crystal that catches light. */
export function makeEmitter(dir) {
  const THREE = T3();
  const g = new THREE.Group();
  g.add(box(0.8, 0.5, 0.8, plastic('#4a5a8a'), 0, 0.25, 0));
  g.add(box(0.6, 0.35, 0.6, plastic('#6a7aaa'), 0, 0.67, 0));
  const lens = cyl(0.17, 0.17, 0.2, 12, plastic('#fff3b0', { emissive: '#ffcc33' }), 0, 0.67, 0.36); lens.rotation.x = Math.PI / 2; g.add(lens);
  g.rotation.y = { S: 0, E: Math.PI / 2, N: Math.PI, W: -Math.PI / 2 }[dir] || 0;
  return g;
}
export function makeMirror(fixed) {
  const THREE = T3();
  const g = new THREE.Group();
  g.add(cyl(0.32, 0.38, 0.16, 12, plastic(fixed ? '#5d5872' : '#ffc83a'), 0, 0.08, 0));
  const pivot = new THREE.Group(); pivot.name = 'pivot'; g.add(pivot);
  pivot.add(box(1.0, 1.0, 0.1, plastic('#8a90b0'), 0, 0.68, -0.03));
  const glass = box(0.88, 0.88, 0.04, new THREE.MeshPhongMaterial({ color: '#e8f4ff', emissive: '#4a6a9a', shininess: 120, specular: 0xffffff }), 0, 0.68, 0.04); pivot.add(glass);
  return g;
}
export function makeCrystal() {
  const THREE = T3();
  const g = new THREE.Group();
  g.add(box(0.7, 0.3, 0.7, plastic('#5d5872'), 0, 0.15, 0));
  const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.34, 0), uniq('#7ad0ff', { emissive: '#103050' }));
  gem.scale.set(1, 1.5, 1); gem.position.y = 0.85; gem.name = 'gem'; gem.castShadow = true; g.add(gem);
  return g;
}

export function makeCrumble() {
  const THREE = T3();
  const side = new THREE.MeshPhongMaterial({ color: '#ffffff', map: sideTex('#8e8c9c'), shininess: 10 });
  const top = new THREE.MeshPhongMaterial({ color: '#ffffff', map: crackTex(), shininess: 10 });
  const m = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), [side, side, top, side, side, side]);
  m.receiveShadow = true;
  return m;
}

export function makePage() {
  const g = new (T3().Group)();
  const p = box(0.55, 0.05, 0.7, plastic('#f4efe2'), 0, 0, 0); g.add(p);
  for (const z of [-0.18, 0, 0.18]) g.add(box(0.36, 0.06, 0.04, plastic('#9a93a8'), 0, 0.01, z));
  return g;
}
