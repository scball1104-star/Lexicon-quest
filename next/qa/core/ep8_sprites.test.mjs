// Episode 8 sprite atlases (E8-sprites): every frame sits inside its sheet with the loader's default origin (the pack merge copies
// frames, not origins), no frame name clashes with a base atlas or another pack (the base would win the merge silently), every id
// the plan names has its frames (and, once E8-battle and E8-story land, every id their data names), the four Eraser looks share one
// HUD anchor over the hood (CRITIQUE_8 item 1), the under-the-feet rows carry their placement data, and first_keeper is the
// hooded_sage cell copied unchanged.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath, pathToFileURL } from 'node:url';

const NEXT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (p) => JSON.parse(fs.readFileSync(path.join(NEXT, p), 'utf8'));
const exists = (p) => fs.existsSync(path.join(NEXT, p));
const pngSize = (p) => { const b = fs.readFileSync(path.join(NEXT, p)); return [b.readUInt32BE(16), b.readUInt32BE(20)]; };

const ATLASES = {
  ep8_npcs: ['assets/sprites/ep8_npcs.json', 'assets/sprites/npcs.json'],
  ep8_enemies_battle: ['assets/sprites/ep8_enemies_battle.json', 'assets/sprites/enemies_battle.json'],
  ep8_bosses_battle: ['assets/sprites/ep8_bosses_battle.json', 'assets/sprites/bosses_battle.json'],
  ep8_enemies_field: ['assets/sprites/ep8_enemies_field.json', 'assets/sprites/enemies_field.json'],
  ep8_portraits: ['assets/sprites/ep8_portraits.json', 'assets/sprites/portraits.json'],
  ep8_heads: ['assets/ui/ep8_heads.json', 'assets/ui/heads.json'],
};
const OTHER = ['ep7', 'ep6', 'ep5', 'ep4', 'ep3', 'x1', 'x2', 'cave', 'tier', 'worldmap'];
const DERIVED = ['idle_1', 'attack', 'hurt', 'die_0', 'die_1', 'die_2'];
const LOOKS = ['eraser', 'eraser_truths', 'eraser_remembers', 'eraser_silence'];
// plan 2.4 / 6.2: every Episode 8 foe, and the Sentry's 50% look
const FOES = ['index_hound', 'margin_imp', 'paper_crane', 'gnawing_bookworm', 'catalog_wraith', 'inkbound_librarian', 'struck_page',
  'unnamed_sentry', 'truth_grief', 'truth_change'];
const CASTERS = ['margin_imp', 'paper_crane', 'catalog_wraith', 'inkbound_librarian', 'struck_page', 'unnamed_sentry', 'truth_grief',
  'truth_change'];
const FIELD = ['index_hound', 'margin_imp', 'paper_crane', 'gnawing_bookworm', 'catalog_wraith', 'inkbound_librarian', 'struck_page',
  'unnamed_sentry', 'eraser_avatar', 'eraser_avatar_back'];
// plan 9.2 (12 specs), the two counter recolours, and the carried-bundle variant
const NPCS = ['npc_librarian', 'npc_first_keeper', 'npc_first_keeper_m', 'npc_first_keeper_m_bundle', 'npc_elowen', 'npc_elowen_m',
  'npc_nurse_m', 'npc_ione', 'npc_fen', 'npc_quinn', 'npc_sorel', 'npc_arun', 'npc_meya', 'npc_rootbound_keeper_m',
  'npc_ep8_innkeeper', 'npc_ep8_shopkeeper'];

test('every frame is inside its sheet and no name clashes with the base or another pack', () => {
  const seen = new Map();
  for (const [id, [p, base]] of Object.entries(ATLASES)) {
    const j = read(p), b = read(base);
    const others = OTHER.map((k) => path.join(path.dirname(base), `${k}_${path.basename(base)}`)).filter(exists).map(read);
    const [W, H] = pngSize(path.join(path.dirname(p), j.image));
    for (const [n, [x, y, w, h]] of Object.entries(j.frames)) {
      assert.ok(x >= 0 && y >= 0 && x + w <= W && y + h <= H, `${id} ${n} out of bounds`);
      assert.ok(!(n in b.frames), `${id} ${n} clashes with ${base}`);
      for (const o of others) assert.ok(!(n in o.frames), `${id} ${n} clashes with another pack`);
      const key = `${path.basename(base)}:${n}`;
      assert.ok(!seen.has(key), `${n} twice`);
      seen.set(key, id);
    }
    for (const [an, a] of Object.entries(j.anims || {})) for (const f of a.frames) assert.ok(f in j.frames, `${id} anim ${an} -> ${f}`);
  }
});

test('battle frames use the default bottom-centre origin; the Eraser looks fit the 160 x 144 boss cell', () => {
  for (const id of ['ep8_enemies_battle', 'ep8_bosses_battle']) {
    const j = read(ATLASES[id][0]);
    for (const [n, r] of Object.entries(j.frames)) assert.deepEqual(j.origin[n], [Math.floor(r[2] / 2), r[3] - 1], n);
  }
  const bb = read(ATLASES.ep8_bosses_battle[0]);
  for (const l of LOOKS) assert.ok(bb.frames[l][2] <= 160 && bb.frames[l][3] <= 144, `${l} fits the boss cell`);
});

test('every planned foe, look, field sprite, npc, head and portrait has its frames', () => {
  const eb = read(ATLASES.ep8_enemies_battle[0]), bb = read(ATLASES.ep8_bosses_battle[0]);
  const ef = read(ATLASES.ep8_enemies_field[0]), hd = read(ATLASES.ep8_heads[0]), np = read(ATLASES.ep8_npcs[0]);
  for (const id of [...FOES, 'unnamed_sentry_cracked']) {
    assert.ok(eb.frames[id], `battle ${id}`);
    for (const s of DERIVED) assert.ok(eb.frames[`${id}_${s}`], `${id}_${s}`);
  }
  for (const id of CASTERS) assert.ok(eb.frames[`${id}_cast`], `${id}_cast`);
  for (const l of LOOKS) {
    assert.ok(bb.frames[l], l);
    assert.equal(eb.external[l], 'bosses_battle');
    for (const s of [...DERIVED, 'cast']) assert.ok(bb.frames[`${l}_${s}`], `${l}_${s}`);
  }
  for (const id of [...FOES, 'eraser']) assert.ok(hd.frames[`head_${id}`], `head ${id}`);
  for (const id of FIELD) assert.ok(ef.frames[`${id}_0`] && ef.frames[`${id}_1`] && ef.sprites[id], `field ${id}`);
  for (const id of NPCS) {
    for (const d of ['down', 'left', 'right', 'up']) for (const k of ['0', '1', '2', 'blink']) assert.ok(np.frames[`${id}_${d}_${k}`], `${id}_${d}_${k}`);
    assert.ok(np.anims[`${id}_walk_down`] && np.anims[`${id}_idle_down`], `${id} anims`);
  }
  for (const id of ['prop_ep8_bundle', 'prop_ep8_blanket']) assert.deepEqual(np.frames[id].slice(2), [16, 16], id);
  const po = read(ATLASES.ep8_portraits[0]);
  for (const id of ['first_keeper', 'eraser']) {
    assert.deepEqual(po.frames[`${id}_48`].slice(2), [48, 48]);
    assert.deepEqual(po.frames[`${id}_32`].slice(2), [32, 32]);
    assert.deepEqual(po.portraits[id], { 48: `${id}_48`, 32: `${id}_32` });
  }
});

test('the four Eraser looks share one HUD anchor over the hood', () => {
  const bb = read(ATLASES.ep8_bosses_battle[0]);
  const first = bb.hud[LOOKS[0]];
  for (const l of LOOKS) {
    const h = bb.hud[l];
    assert.ok(h && Array.isArray(h.hood) && Array.isArray(h.head) && Array.isArray(h.headPx), `hud ${l}`);
    assert.deepEqual(h.hood, first.hood, `${l} hood anchor matches Closed Book`);
    assert.deepEqual(h.headPx, first.headPx, `${l} head box matches Closed Book`);
    const [, , w, fh] = bb.frames[l];
    const [dx, dy] = h.hood;
    assert.ok(Math.abs(dx) <= w / 2 && -dy <= fh - 1 && -dy >= fh * 0.7, `${l} anchor in the top of the frame`);
    assert.ok(dx >= h.headPx[0] && dx <= h.headPx[1] && dy >= h.headPx[2] && dy <= h.headPx[3], `${l} anchor inside the head box`);
    for (const f of h.head) assert.ok(f >= 0 && f <= 1, `${l} head fractions`);
  }
});

test('the under-the-feet rows carry their placement data', () => {
  const eb = read(ATLASES.ep8_enemies_battle[0]);
  for (const id of ['unnamed_sentry', 'unnamed_sentry_cracked', 'truth_grief', 'truth_change']) {
    const r = eb.rows[id];
    assert.ok(r, `rows ${id}`);
    assert.deepEqual(r.feet, [0, 0]);
    const [x0, x1, y0, y1] = r.bodyPx;
    const [, , w, h] = eb.frames[id];
    assert.ok(x0 < 0 && x1 > 0 && y0 < 0 && y1 <= 1 && x1 - x0 <= w && y1 - y0 <= h, `${id} body box`);
  }
});

// decode an RGBA, 8-bit, non-interlaced or palette PNG into rows of bytes (enough for the atlases this repo writes)
function decode(p) {
  const b = fs.readFileSync(path.join(NEXT, p));
  let o = 8, W = 0, H = 0, ct = 0, plte = null, trns = null; const idat = [];
  while (o < b.length) {
    const len = b.readUInt32BE(o), type = b.toString('ascii', o + 4, o + 8), d = b.subarray(o + 8, o + 8 + len);
    if (type === 'IHDR') { W = d.readUInt32BE(0); H = d.readUInt32BE(4); ct = d[9]; assert.equal(d[8], 8, 'bit depth'); }
    else if (type === 'PLTE') plte = d; else if (type === 'tRNS') trns = d; else if (type === 'IDAT') idat.push(d);
    o += 12 + len;
  }
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const bpp = ct === 6 ? 4 : ct === 2 ? 3 : 1, stride = W * bpp;
  const out = Buffer.alloc(W * H * 4); let prev = Buffer.alloc(stride);
  for (let y = 0; y < H; y++) {
    const f = raw[y * (stride + 1)], line = Buffer.from(raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1)));
    for (let i = 0; i < stride; i++) {
      const a = i >= bpp ? line[i - bpp] : 0, up = prev[i], c = i >= bpp ? prev[i - bpp] : 0;
      const pa = Math.abs(up - c), pb = Math.abs(a - c), pc = Math.abs(a + up - 2 * c);
      line[i] = (line[i] + [0, a, up, (a + up) >> 1, pa <= pb && pa <= pc ? a : pb <= pc ? up : c][f]) & 255;
    }
    for (let x = 0; x < W; x++) {
      const q = (y * W + x) * 4;
      if (ct === 3) { const k = line[x]; out[q] = plte[k * 3]; out[q + 1] = plte[k * 3 + 1]; out[q + 2] = plte[k * 3 + 2]; out[q + 3] = trns && k < trns.length ? trns[k] : 255; }
      else { out[q] = line[x * bpp]; out[q + 1] = line[x * bpp + 1]; out[q + 2] = line[x * bpp + 2]; out[q + 3] = bpp === 4 ? line[x * bpp + 3] : 255; }
    }
    prev = line;
  }
  return { W, H, px: out };
}

test('first_keeper is the hooded_sage cell, pixel for pixel', () => {
  const base = read('assets/sprites/portraits.json'), po = read(ATLASES.ep8_portraits[0]);
  const A = decode(`assets/sprites/${base.image}`), B = decode(`assets/sprites/${po.image}`);
  for (const n of [48, 32]) {
    const [ax, ay, w, h] = base.frames[`hooded_sage_${n}`], [bx, by] = po.frames[`first_keeper_${n}`];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = ((ay + y) * A.W + ax + x) * 4, j = ((by + y) * B.W + bx + x) * 4;
      for (let c = 0; c < 4; c++) assert.equal(A.px[i + c], B.px[j + c], `first_keeper_${n} pixel ${x},${y}`);
    }
  }
});

test('the ids the Episode 8 data names resolve (skipped until E8-battle and E8-story land)', async (t) => {
  const eb = read(ATLASES.ep8_enemies_battle[0]), bb = read(ATLASES.ep8_bosses_battle[0]);
  const ef = read(ATLASES.ep8_enemies_field[0]), hd = read(ATLASES.ep8_heads[0]), np = read(ATLASES.ep8_npcs[0]);
  const npBase = read('assets/sprites/npcs.json');
  const packs = ['ep5', 'ep6', 'ep7'].map((k) => `assets/sprites/${k}_npcs.json`).filter(exists).map(read);
  const efBase = read('assets/sprites/enemies_field.json');
  const party = read('assets/sprites/party_field.json');   // mira, bram: the party walk in scenes
  if (exists('src/data/ep8/enemies.js')) {
    const mod = await import(pathToFileURL(path.join(NEXT, 'src/data/ep8/enemies.js')).href);
    const table = mod.EP8_ENEMIES || mod.ENEMIES || mod.default || {};
    for (const [id, e] of Object.entries(table)) {
      assert.ok(eb.frames[id] || bb.frames[id], `battle frame ${id}`);
      assert.ok(hd.frames[`head_${id}`], `head ${id}`);
      for (const ph of e.phases || []) if (ph.sprite) assert.ok(eb.frames[ph.sprite] || bb.frames[ph.sprite], `phase look ${ph.sprite}`);
    }
  } else t.diagnostic('src/data/ep8/enemies.js not here yet');
  const srcs = ['src/data/ep8/story.js', 'src/data/ep8/npcs.js'].filter(exists);
  if (!srcs.length) { t.diagnostic('src/data/ep8 story and npcs not here yet'); return; }
  const src = srcs.map((p) => fs.readFileSync(path.join(NEXT, p), 'utf8')).join('\n');
  for (const id of new Set([...src.matchAll(/sprite:\s*'([a-z0-9_]+)'/g)].map((m) => m[1]))) {
    const ok = np.frames[`${id}_down_0`] || npBase.frames[`${id}_down_0`] || packs.some((p) => p.frames[`${id}_down_0`]) ||
      ef.frames[`${id}_0`] || efBase.frames[`${id}_0`] || eb.frames[id] || np.frames[id] ||
      Object.keys(party.frames).some((f) => f.startsWith(`${id}_`));
    assert.ok(ok, `sprite ${id}`);
  }
});

test('no em dash in the Episode 8 sprite notes', () => {
  for (const [p] of Object.values(ATLASES)) assert.ok(!fs.readFileSync(path.join(NEXT, p), 'utf8').includes(String.fromCharCode(0x2014)), p);
});
