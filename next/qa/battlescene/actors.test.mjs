// W6-anim: the battle actors pick the generator-made frames from the real atlases (idle breathe, attack, hurt,
// cast, devour, die steps, Echo Warden stances, party crit / combo / level-up), fall back cleanly when a frame is
// missing, and keep every pre-W6 frame name and rect in the atlases.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizeAtlas } from '../../src/core/assets.js';
import { Actor, BREATHE, DIE_STEP, LEVELUP_FRAMES, STANCE_FLASH } from '../../src/battle/scene/actors.js';

const NEXT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const load = (id) => normalizeAtlas(JSON.parse(fs.readFileSync(path.join(NEXT, 'assets', 'sprites', `${id}.json`), 'utf8')), null, id);
const ATLASES = { enemies_battle: load('enemies_battle'), bosses_battle: load('bosses_battle'), party_battle: load('party_battle') };

function engine(atlases = ATLASES) {
  return { frame: 0, assets: { has: (id) => !!atlases[id], atlas: (id) => atlases[id] } };
}
const slot = { x: 100, y: 150 };
const enemy = (eng, id, extra = {}) => new Actor(eng, { uid: 'e0', side: 'enemy', id, name: id, hp: 50, maxHp: 50, mp: 0, maxMp: 0, ...extra }, slot);
const member = (eng, id, weapon) => new Actor(eng, { uid: id, side: 'party', id, name: id, weapon, hp: 50, maxHp: 50, mp: 5, maxMp: 5 }, slot);
const tick = (a, n) => { for (let i = 0; i < n; i++) { a.engine.frame++; a.update(); } };

// The pre-W6 frames (names and rects) that other code and old saves of screenshots rely on.
const KEPT = {
  enemies_battle: { ink_slime: [0, 0, 51, 50], page_wraith: [53, 0, 70, 74], briar_wolf: [125, 0, 66, 62], moss_scarab: [193, 0, 57, 52],
    bookmite: [0, 76, 44, 40], tome_golem: [46, 76, 91, 90], ink_wraith: [139, 76, 85, 86] },
  bosses_battle: { archivore: [0, 0, 148, 139], echo_warden: [150, 0, 96, 98], lost_page_0: [0, 141, 26, 24], lost_page_1: [28, 141, 26, 24],
    lost_page_2: [56, 141, 26, 24], lost_page: [28, 141, 26, 24] },
};

test('every pre-W6 frame keeps its name and rect; party cells stay on the 32x40 grid', () => {
  for (const [id, frames] of Object.entries(KEPT)) {
    const j = ATLASES[id].meta;
    for (const [n, r] of Object.entries(frames)) assert.deepEqual(j.frames[n], r, `${id}:${n}`);
  }
  const p = ATLASES.party_battle.meta.frames;
  assert.deepEqual(p.hero_sword_idle_0, [0, 0, 32, 40]);
  assert.deepEqual(p.bram_ko, [64, 240, 32, 40]);
  for (const [n, r] of Object.entries(p)) assert.ok(r[0] % 32 === 0 && r[1] % 40 === 0 && r[2] === 32 && r[3] === 40, n);
});

test('the atlases carry the derived frames the scene asks for', () => {
  const en = ATLASES.enemies_battle.frames, bo = ATLASES.bosses_battle.frames, pa = ATLASES.party_battle.frames;
  for (const id of ['ink_slime', 'page_wraith', 'briar_wolf', 'moss_scarab', 'bookmite', 'tome_golem', 'ink_wraith']) {
    for (const s of ['idle_1', 'attack', 'hurt', 'die_0', 'die_1', 'die_2']) assert.ok(en[`${id}_${s}`], `${id}_${s}`);
  }
  for (const id of ['page_wraith', 'ink_wraith']) assert.ok(en[`${id}_cast`], `${id}_cast`);
  for (const s of ['idle_1', 'attack', 'hurt', 'cast', 'devour', 'die_0', 'die_2']) assert.ok(bo[`archivore_${s}`], `archivore_${s}`);
  for (const st of ['', '_mirror', '_bulwark']) for (const s of ['idle_1', 'attack', 'hurt', 'cast']) assert.ok(bo[`echo_warden${st}_${s}`], `echo_warden${st}_${s}`);
  assert.ok(bo.echo_warden_mirror && bo.echo_warden_bulwark && bo.lost_page_die_2);
  for (const c of ['hero', 'mira', 'bram']) {
    assert.ok(pa[`${c}_combo`] && pa[`${c}_levelup`], `${c} shared combo / levelup`);
    for (const w of ATLASES.party_battle.meta.weapons[c]) for (const s of ['crit', 'combo', 'levelup']) assert.ok(pa[`${c}_${w}_${s}`], `${c}_${w}_${s}`);
  }
  // every derived enemy frame has its own origin, and it sits inside the frame
  for (const atlas of [ATLASES.enemies_battle, ATLASES.bosses_battle]) {
    for (const [n, r] of Object.entries(atlas.meta.frames)) {
      const o = atlas.meta.origin[n];
      assert.ok(o && o[0] >= 0 && o[1] >= 0 && o[0] < r[2] && o[1] < r[3], `${n} origin`);
    }
  }
});

test('enemy states pick their frames: breathe, attack, cast fallback, hurt, die steps', () => {
  const eng = engine();
  const w = enemy(eng, 'briar_wolf');
  w.bobPhase = 0;
  eng.frame = 0; assert.equal(w.enemyFrame().name, 'briar_wolf');
  eng.frame = BREATHE; assert.equal(w.enemyFrame().name, 'briar_wolf_idle_1');
  assert.equal(w.breath(), 0, 'the atlas breathes, the code stand-in is off');
  w.setPose('attack'); assert.equal(w.enemyFrame().name, 'briar_wolf_attack');
  w.setPose('cast'); assert.equal(w.enemyFrame().name, 'briar_wolf_attack', 'no cast frame: the lunge stands in');
  w.setPose('hurt'); assert.equal(w.enemyFrame().name, 'briar_wolf_hurt');
  assert.ok(w.hurtT > 10, 'the hurt frame outlasts the white hit flash');
  w.setPose('die');
  assert.equal(w.enemyFrame().name, 'briar_wolf_die_0');
  tick(w, DIE_STEP); assert.equal(w.enemyFrame().name, 'briar_wolf_die_1');
  tick(w, DIE_STEP * 3); assert.equal(w.enemyFrame().name, 'briar_wolf_die_2');
  w.ko = true; w.startDissolve(10); assert.equal(w.enemyFrame().name, 'briar_wolf_die_2', 'the dissolve eats die_2');
  const g = enemy(eng, 'page_wraith');
  g.setPose('cast'); assert.equal(g.enemyFrame().name, 'page_wraith_cast');
});

test('Archivore devour, Echo Warden stances (dropped while broken), Lost Page keeps its flutter', () => {
  const eng = engine();
  const a = enemy(eng, 'archivore', { boss: true });
  a.setPose('devour'); assert.equal(a.enemyFrame().name, 'archivore_devour');
  a.setPose('cast'); assert.equal(a.enemyFrame().name, 'archivore_cast');
  const w = enemy(eng, 'echo_warden');
  w.bobPhase = 0; eng.frame = 0;
  w.setPose('stance_mirror');
  assert.equal(w.pose, 'idle');
  assert.equal(w.enemyFrame().name, 'echo_warden_mirror_cast', 'the swap flashes the charged shield');
  tick(w, STANCE_FLASH); eng.frame = 0;
  assert.equal(w.enemyFrame().name, 'echo_warden_mirror');
  w.setPose('attack'); assert.equal(w.enemyFrame().name, 'echo_warden_mirror_attack');
  w.setPose('stance_bulwark'); w.setPose('hurt'); assert.equal(w.enemyFrame().name, 'echo_warden_bulwark_hurt');
  w.broken = true; assert.equal(w.enemyFrame().name, 'echo_warden_hurt', 'broken: the neutral set');
  const p = enemy(eng, 'lost_page');
  p.bobPhase = 0; eng.frame = BREATHE;
  assert.match(p.enemyFrame().name, /^lost_page_[012]$/);
  p.setPose('die'); assert.equal(p.enemyFrame().name, 'lost_page_die_0');
});

test('borrowed art: ENEMIES[id].sprite.frame, scale and tint (hollow enemies)', async () => {
  const { ENEMIES } = await import('../../src/data/enemies.js');
  const eng = engine();
  const borrowed = Object.keys(ENEMIES).find((id) => ENEMIES[id].sprite && ENEMIES[id].sprite.frame && ENEMIES[id].sprite.frame !== id && !ATLASES.enemies_battle.frames[id]);
  if (!borrowed) return;   // no enemy borrows art in this build
  const def = ENEMIES[borrowed];
  const a = enemy(eng, borrowed);
  assert.equal(a.stem, def.sprite.frame);
  const base = ATLASES[a.atlasId].frames[def.sprite.frame];
  assert.equal(a.w, Math.round(base.w * (def.sprite.scale || 1)));
  if (def.sprite.tint) assert.equal(a.tint, def.sprite.tint);
  a.setPose('attack'); assert.equal(a.enemyFrame().name, `${def.sprite.frame}_attack`);
});

test('party: crit / combo / level-up frames, with fallbacks when an atlas lacks them', () => {
  const eng = engine();
  const h = member(eng, 'hero', 'axe');
  h.setPose('crit'); assert.equal(h.partyFrame().name, 'hero_axe_crit');
  h.setPose('combo'); assert.equal(h.partyFrame().name, 'hero_axe_combo');
  h.setPose('victory'); assert.equal(h.partyFrame().name, 'hero_axe_victory');
  h.setPose('victory');
  assert.equal(h.pose, 'levelup', 'the level-up page re-sends victory: hop');
  assert.equal(h.partyFrame().name, 'hero_axe_levelup');
  tick(h, 4); assert.ok(h.hop() < 0, 'in the air');
  tick(h, LEVELUP_FRAMES); assert.equal(h.pose, 'victory'); assert.equal(h.hop(), 0);
  h.bobPhase = 0; h.setPose('idle');
  eng.frame = 0; assert.equal(h.partyFrame().name, 'hero_axe_idle_0');
  eng.frame = BREATHE; assert.equal(h.partyFrame().name, 'hero_axe_idle_1');
  // an atlas without the W6 frames: crit falls back to windup, combo to ready, levelup to victory
  const old = JSON.parse(JSON.stringify(ATLASES.party_battle.meta));
  for (const n of Object.keys(old.frames)) if (/_(crit|combo|levelup)$/.test(n)) delete old.frames[n];
  const e2 = engine({ ...ATLASES, party_battle: normalizeAtlas(old, null, 'party_battle') });
  const m = member(e2, 'mira', 'bow');
  m.setPose('crit'); assert.equal(m.partyFrame().name, 'mira_bow_windup');
  m.setPose('combo'); assert.equal(m.partyFrame().name, 'mira_bow_ready');
  m.setPose('victory'); m.setPose('victory'); assert.equal(m.partyFrame().name, 'mira_bow_victory');
});
