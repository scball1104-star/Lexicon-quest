// W8-archive (CRITIQUE_3 items 3, 4, 10, 12): each Archive floor has its own kit and landmark, the wall depth
// classification never changes collision, root masses and other wall dressing stay on wall cells, and the
// overhead-only tiles are never used as overlays (their collision is none).
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadAll, loadDb, buildGrid } from '../../tools/maps/mapcheck.mjs';

const db = await loadDb();
const maps = await loadAll();
const KITS = { archive_f1: 'catalog', archive_f2: 'gallery', archive_f3: 'stacks', archive_boss: 'stacks' };
const FLOORS = { catalog: 'catalog_wood', gallery: 'gallery_stone', stacks: 'stacks_wood' };
const OVERHEAD_ONLY = new Set(['hanging_lamp', 'root_arch']);

const wallIds = (kit) => new Set([`${kit}_top`, `${kit}_face`, `${kit}_out_top`, `${kit}_out_face`]);
const cellId = (m, x, y) => m.legend[(m.ground[y] || '')[x]];

test('each floor uses its own floor terrain and wall systems (F1, F2 and F3 differ)', () => {
  for (const [id, kit] of Object.entries(KITS)) {
    const m = maps[id];
    assert.equal(m.legend['#'], `${kit}_top`, `${id} band`);
    assert.equal(m.legend['|'], `${kit}_face`, `${id} face`);
    assert.equal(m.legend.v, `${kit}_out_top`, `${id} deep`);
    assert.equal(m.legend.o, `${kit}_out_face`, `${id} outer face`);
    assert.equal(m.legend['.'], FLOORS[kit]);
    assert.equal(m.under, FLOORS[kit]);
    for (const w of [kit, `${kit}_out`]) assert.ok(db.tiles.walls[w], `wall system ${w} in tiles.json`);
    assert.ok(db.tiles.terrains[FLOORS[kit]], `terrain ${FLOORS[kit]}`);
  }
  assert.equal(new Set(['archive_f1', 'archive_f2', 'archive_f3'].map((id) => maps[id].legend['.'])).size, 3);
});

test('wall depth: rooms have a band of wall all round, the deep and the outer faces are wall too', () => {
  for (const id of Object.keys(KITS)) {
    const m = maps[id];
    const g = buildGrid(m, db);
    const H = m.ground.length, W = m.ground[0].length;
    let band = 0, deep = 0, out = 0;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const ch = m.ground[y][x];
      if (ch === '#') band++;
      if (ch === 'v') deep++;
      if (ch === 'o') out++;
      if ('#vo'.includes(ch)) {
        // overlays may make a wall cell walkable only where a map means it (a broken wall, a door piece)
        const ids = (m.overlays || []).filter((o) => o.x === x && (o.y === y || o.y === y - 1)).map((o) => o.t);
        if (!ids.some((t) => t === 'wall_broken')) assert.notEqual(g.code[y][x], 'none', `${id} ${x},${y} (${ch}) stays solid`);
      }
      // a floor cell never touches the deep directly: there is always a band between
      if (!'#vo|'.includes(ch)) {
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          const c = (m.ground[y + dy] || '')[x + dx];
          assert.notEqual(c, 'v', `${id} floor ${x},${y} touches the deep`);
        }
      }
    }
    assert.ok(band > 0 && deep > 0 && out > 0, `${id}: band ${band}, deep ${deep}, outer ${out}`);
  }
});

test('root masses and overhead-only tiles stay where they belong', () => {
  for (const id of Object.keys(KITS)) {
    const m = maps[id];
    const walls = wallIds(KITS[id]);
    for (const o of m.overlays || []) {
      assert.ok(!OVERHEAD_ONLY.has(o.t), `${id}: ${o.t} is overhead only (collision none), not an overlay`);
      if (!o.t.startsWith('root_mass_')) continue;
      const cells = o.t === 'root_mass_a' ? [[0, 0], [1, 0]] : [[0, 0], [0, 1]];
      for (const [dx, dy] of cells) {
        const t = cellId(m, o.x + dx, o.y + dy);
        assert.ok(walls.has(t) && !t.endsWith('_face') || t === `${KITS[id]}_out_face`, `${id}: ${o.t} at ${o.x},${o.y} covers ${t}`);
      }
    }
    for (const o of m.overhead || []) assert.ok(db.tiles.tiles[o.t], `${id}: overhead tile ${o.t} exists`);
  }
});

test('one landmark per floor, the field Archivore and the music choices', () => {
  const has = (m, t) => (m.overlays || []).some((o) => o.t === t) || (m.overhead || []).some((o) => o.t === t);
  assert.ok(has(maps.archive_f1, 'great_catalog_dial'), 'F1: the Great Catalog wheel');
  assert.ok(has(maps.archive_f2, 'gallery_rose'), 'F2: the rose window');
  assert.ok(has(maps.archive_f3, 'root_arch'), 'F3: the roots over the great door');
  // the rose window sits over the Lantern pedestal; the root arch over the great door
  const rose = maps.archive_f2.overlays.find((o) => o.t === 'gallery_rose');
  assert.ok(rose.x <= maps.archive_f2.marks.lantern_pedestal[0] && maps.archive_f2.marks.lantern_pedestal[0] <= rose.x + 2);
  const arch = maps.archive_f3.overhead.find((o) => o.t === 'root_arch');
  const door = maps.archive_f3.events.find((e) => e.id === 'boss_door');
  assert.deepEqual([arch.x, arch.y], [door.x - 1, door.y - 2]);
  const beast = maps.archive_boss.events.find((e) => e.id === 'archivore');
  assert.equal(beast.sprite, 'archivore_avatar');
  assert.ok(db.enemiesField.sprites.archivore_avatar, 'w8-art field avatar in enemies_field');
  assert.equal(maps.archive_f1.music, 'archive');
  assert.equal(maps.archive_f2.music, 'archive');
  assert.equal(maps.archive_f3.music, 'mystery', 'F3 and the boss-door hall have their own track');
});
