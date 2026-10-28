// C4-uniques: every property the sixty carry, proved once through the game's own code. Stats properties in a headless battle
// (rules.js createBattle, seeded): the wearer's battle unit carries the number and the rule responds (the same battle with the
// property's own number taken back out is the control). The hooked properties through world.js HOOKS.armBattle inside a reading
// (Inkwell, Standing Grudge, Quick Study) and the reused field hooks on the new pieces; the loot properties through
// world.js openCaveChest on a fake field (the props reach the chest roll).
import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.LQ_CAVE_ON = true;
const { ensurePack } = await import('../../src/game/packs.js');
await ensurePack('cave', { quiet: true, warm: false });
const W = await import('../../src/data/cave/world.js');
const L = await import('../../src/data/cave/loot.js');
const CAVE = await import('../../src/game/cave.js');
const { CAVE_UNIQUES, CAVE_UNIQUE_IDS, BINDER_QUILL_ID, CAVE_PROPS } = await import('../../src/data/cave/items.js');
const { createBattle, createEncounterBattle, makeRng, memberStats } = await import('../../src/battle/rules.js');
const { newMember, PARTY } = await import('../../src/data/party.js');
const { makeUnique } = await import('../../src/battle/loot.js');
const { newGameEp2, addGear } = await import('../../src/game/state.js');
const { equipGear } = await import('../../src/game/inventory.js');
const { ENCOUNTERS } = await import('../../src/data/encounters.js');
const { ENEMIES } = await import('../../src/data/enemies.js');

const ALL = [...CAVE_UNIQUE_IDS, BINDER_QUILL_ID].map((id) => CAVE_UNIQUES[id]);
const keyOf = (u) => (u.slot === 'weapon' ? u.type : u.slot);
/** A member to prove a property on: Mira for the casters' numbers, a fighter for the blows, else the first who may wear it. */
function wearerFor(u, statKey) {
  const can = u.slot === 'weapon' ? ['hero', 'mira', 'bram'].filter((m) => PARTY[m].weapons.includes(u.type)) : u.who;
  const caster = /Dmg$|healPow|mpCostDown/.test(statKey || '');
  const fighter = /poisonOnHit|lifesteal|crit|furyGain/.test(statKey || '') || (u.extraTypes && u.extraTypes.length);
  return (caster && can.includes('mira') && 'mira') || (fighter && can.find((m) => m !== 'mira')) || can[0];
}
function partyWith(uniqueId, memberId, level = 30) {
  const members = ['hero', 'mira', 'bram'].map((id) => newMember(id, { level }));
  const u = CAVE_UNIQUES[uniqueId];
  const m = members.find((x) => x.id === memberId);
  m.equip = { ...m.equip, [keyOf(u)]: makeUnique(uniqueId) };
  if (u.slot === 'weapon') m.weapon = u.type;
  return members;
}
/** A seeded headless battle; `minus` takes the property's own numbers back out of the wearer's battle unit (the control). */
function battle(members, enemies, seed, { wearer, minus } = {}) {
  const b = createBattle({ party: members, enemies, rng: makeRng(seed), deferBegin: true, options: { inventory: {}, bestiary: {} } });
  if (minus) { const u = b.unit(wearer); for (const [k, v] of Object.entries(minus)) u.stats[k] = (u.stats[k] || 0) - v; }
  return b;
}
const STATUS_FOE = { poison: 'briar_wolf', blind: 'ink_slime', silence: 'page_wraith', burn: 'cinder_hound', chill: 'tome_golem' };
const SPELL = { lightDmg: 'lumen', iceDmg: 'frost', thunderDmg: 'spark', fireDmg: 'ember' };
const heal = (b) => { for (const p of b.units()) if (p.side === 'party') { p.hp = p.maxHp; p.alive = true; p.statuses = {}; } };

/** Statuses of `status` added to the wearer over many enemy turns (the party only defends; everyone is topped up each turn). */
function statusRun(members, status, wearer, minus) {
  const b = battle(members, [STATUS_FOE[status], STATUS_FOE[status]], 11, { wearer, minus });
  b.begin();
  let adds = 0, resists = 0;
  for (let i = 0; i < 900 && !b.isOver(); i++) {
    const u = b.current();
    if (!u) break;
    const evs = u.side === 'party' ? b.perform({ type: 'defend' }) : b.runEnemyTurn();
    for (const ev of evs) {
      if (ev.target !== wearer || ev.status !== status) continue;
      if (ev.type === 'status_add') adds++;
      if (ev.type === 'status_resist') resists++;
    }
    heal(b);
  }
  return { adds, resists };
}
/** The wearer attacks (or casts) `n` times at the first foe; foes and party topped up between turns. Returns the events. */
function strikeRun(members, wearer, enemyId, n, action, opts = {}) {
  const b = battle(members, [enemyId], 21, opts);
  b.begin();
  for (const e of b.units()) if (e.side === 'enemy') { e.maxHp = 999999; e.hp = e.maxHp; }   // a blow that kills never poisons: deep HP
  const out = [];
  let done = 0;
  for (let i = 0; i < n * 8 && done < n && !b.isOver(); i++) {
    const u = b.current();
    if (!u) break;
    if (u.uid === wearer) {
      const t = b.units().find((x) => x.side === 'enemy' && x.alive);
      if (opts.lowHp) u.hp = Math.max(1, Math.floor(u.maxHp / 4));
      out.push(...b.perform({ ...action, target: action.target || t.uid }));
      done++;
    } else if (u.side === 'party') b.perform({ type: 'defend' });
    else b.runEnemyTurn();
    for (const e of b.units()) if (e.side === 'enemy') { e.hp = e.maxHp; e.alive = true; e.statuses = {}; }
    for (const p of b.units()) if (p.side === 'party' && p.uid !== wearer) { p.hp = p.maxHp; p.alive = true; }
  }
  return out;
}

test('every stats property is carried by its piece and read by the battle rules (the control battle without the number answers differently)', () => {
  const proved = new Set();
  for (const p of Object.values(CAVE_PROPS).filter((x) => x.kind === 'stats')) {
    const u = ALL.find((x) => x.prop === p.id);
    assert.ok(u, `${p.id} is carried`);
    const keys = Object.keys(p.stats || {});
    for (const k of keys.length ? keys : ['extraTypes']) {
      const who = wearerFor(u, k);
      const members = partyWith(u.id, who);
      const m = members.find((x) => x.id === who);
      const ms = memberStats(m);
      const v = p.stats ? p.stats[k] : 0;
      if (k !== 'extraTypes') assert.ok(ms[k] >= v, `${u.id} on ${who}: ${k} ${ms[k]} carries the property's ${v}`);
      const minus = k === 'extraTypes' ? null : { [k]: v };
      const label = `${p.id} (${u.id} on ${who})`;
      if (/^res[A-Z]/.test(k)) {
        const status = k.slice(3).toLowerCase();
        const off = statusRun(members, status, who, minus), on = statusRun(members, status, who, null);
        assert.ok(off.adds >= 1, `${label}: the control takes ${status} (${off.adds})`);
        assert.equal(on.adds, 0, `${label}: never ${status}`);
        assert.ok(on.resists >= 1, `${label}: ${status} resisted (${on.resists})`);
      } else if (k === 'poisonOnHit') {
        const count = (evs) => evs.filter((e) => e.type === 'status_add' && e.status === 'poison' && e.source === who).length;
        const on = count(strikeRun(members, who, 'moss_scarab', 40, { type: 'attack' }));
        const off = count(strikeRun(members, who, 'moss_scarab', 40, { type: 'attack' }, { wearer: who, minus }));
        assert.ok(on >= 8 && on > off + 5, `${label}: poisons ${on} of 40 blows against ${off}`);
      } else if (k === 'lifesteal') {
        const count = (evs) => evs.filter((e) => e.type === 'heal' && e.target === who && e.lifesteal).length;
        const on = count(strikeRun(members, who, 'moss_scarab', 10, { type: 'attack' }, { lowHp: true }));
        const off = count(strikeRun(members, who, 'moss_scarab', 10, { type: 'attack' }, { lowHp: true, wearer: who, minus }));
        assert.ok(on >= 8, `${label}: heals on ${on} of 10 blows`);
        assert.ok(off < on, `${label}: the control heals less (${off})`);
      } else if (k === 'crit') {
        const est = (b) => { b.begin(); return b.estimate(b.unit(who), { type: 'attack', target: b.units().find((x) => x.side === 'enemy').uid })[0].crit; };
        const d = est(battle(members, ['moss_scarab'], 3)) - est(battle(members, ['moss_scarab'], 3, { wearer: who, minus }));
        assert.ok(Math.abs(d - v / 100) < 1e-9, `${label}: critical chance +${v}% (${d})`);
      } else if (k === 'furyGain') {
        const gain = (evs) => evs.filter((e) => e.type === 'fury_gain' && e.target === who).reduce((s, e) => s + e.amount, 0);
        const on = gain(strikeRun(members, who, 'moss_scarab', 6, { type: 'attack' }));
        const off = gain(strikeRun(members, who, 'moss_scarab', 6, { type: 'attack' }, { wearer: who, minus }));
        assert.ok(on > off * 1.1, `${label}: Fury ${on} against ${off}`);
      } else if (k === 'healPow') {
        const amt = (evs) => evs.filter((e) => e.type === 'heal' && e.target === 'hero' && e.source === who).reduce((s, e) => s + e.amount, 0);
        const run = (o) => { const b = battle(members, ['moss_scarab'], 5, o); b.begin(); b.unit('hero').hp = 1;
          for (let i = 0; i < 20 && !b.isOver(); i++) { const c = b.current(); if (c.uid === who) return amt(b.perform({ type: 'skill', skill: 'mend', target: 'hero' })); if (c.side === 'party') b.perform({ type: 'defend' }); else b.runEnemyTurn(); b.unit('hero').hp = 1; } return 0; };
        const on = run({}), off = run({ wearer: who, minus });
        const H = memberStats(m).healPow;
        assert.ok(on > 0 && Math.abs(on / off - (1 + H / 100) / (1 + (H - v) / 100)) < 0.05, `${label}: Mend ${on} against ${off}`);
      } else if (/Dmg$/.test(k)) {
        const est = (b) => { b.begin(); return b.estimate(b.unit(who), { type: 'skill', skill: SPELL[k], target: b.units().find((x) => x.side === 'enemy').uid })[0].avg; };
        const on = est(battle(members, ['moss_scarab'], 3)), off = est(battle(members, ['moss_scarab'], 3, { wearer: who, minus }));
        const X = memberStats(m)[k];
        assert.ok(Math.abs(on / off - (1 + X / 100) / (1 + (X - v) / 100)) < 1e-6, `${label}: ${SPELL[k]} ${on} against ${off}`);
      } else if (k === 'inkRes' || k === 'fireRes') {
        const foe = k === 'inkRes' ? 'ink_slime' : 'cinder_hound', skill = k === 'inkRes' ? 'ink_spit' : 'ember_snap';
        const est = (b) => { b.begin(); return b.estimate(b.units().find((x) => x.side === 'enemy'), { type: 'skill', skill, target: who })[0].avg; };
        const on = est(battle(members, [foe], 3)), off = est(battle(members, [foe], 3, { wearer: who, minus }));
        const R = memberStats(m)[k];
        const want = (1 - Math.min(80, R) / 100) / (1 - Math.min(80, R - v) / 100);
        assert.ok(on < off && Math.abs(on / off - want) < 1e-6, `${label}: ${skill} ${on} against ${off}`);
      } else if (k === 'mpCostDown') {
        const costs = (b) => { b.begin(); const mg = b.commands(b.unit(who)).find((c) => c.id === 'magic'); return Object.fromEntries(mg.list.map((s) => [s.skill, s.mp])); };
        const on = costs(battle(members, ['moss_scarab'], 3)), off = costs(battle(members, ['moss_scarab'], 3, { wearer: who, minus }));
        assert.ok(Object.keys(on).length, `${label}: Mira has spells`);
        for (const s of Object.keys(on)) assert.equal(on[s], off[s] ? Math.max(1, off[s] - v) : 0, `${label}: ${s} costs ${on[s]} against ${off[s]}`);
        assert.ok(Object.keys(on).some((s) => off[s] - on[s] === v), `${label}: a spell costs ${v} less`);
      } else if (k === 'startHaste') {
        const ev = battle(members, ['moss_scarab'], 3).begin().find((e) => e.type === 'status_add' && e.status === 'haste' && e.target === who);
        assert.ok(ev && ev.turns === memberStats(m).startHaste && ev.turns >= v, `${label}: Hasted ${ev && ev.turns} turns`);
        const ctl = battle(members, ['moss_scarab'], 3, { wearer: who, minus }).begin().find((e) => e.type === 'status_add' && e.status === 'haste' && e.target === who);
        assert.ok(!ctl, `${label}: the control starts without Haste`);
      } else if (k === 'extraTypes') {
        const el = p.extraTypes[0];
        const evs = strikeRun(members, who, 'moss_scarab', 2, { type: 'attack' });
        const dmg = evs.find((e) => e.type === 'damage' && e.source === who);
        assert.ok(dmg && dmg.types.includes(el) && dmg.types.includes(u.type), `${label}: the blow counts as ${el} (${dmg && dmg.types})`);
      } else assert.fail(`${label}: no proof for stat ${k}`);
      proved.add(p.id);
    }
  }
  const stats = Object.values(CAVE_PROPS).filter((x) => x.kind === 'stats').map((x) => x.id);
  assert.deepEqual([...proved].sort(), stats.sort(), 'every stats property proved');
});

function running(seed = 7) {
  const g = newGameEp2('Arden');
  assert.ok(CAVE.enter(g, { seed, playtime: 100 }));
  return g;
}
function wear(g, memberId, uniqueId) {
  const m = g.party.find((x) => x.id === memberId);
  const u = CAVE_UNIQUES[uniqueId];
  const uid = addGear(g, uniqueId);
  const r = equipGear(g, m, keyOf(u), uid);
  assert.ok(r.ok, `${memberId} wears ${uniqueId}: ${r.reason || ''}`);
  if (u.slot === 'weapon') m.weapon = u.type;
  return m;
}
function b1Battle(g, rng = () => 0.5) {
  W.prepareFloor(g, 1);
  const encId = Object.keys(ENCOUNTERS).find((k) => k.startsWith('cave_b1_e'));
  return createEncounterBattle(encId, { party: g.party, rng, inventory: {}, flags: g.flags }).battle;
}

test('Inkwell (ink_well): in a reading the wearer starts every fight with 4 more MP, never over the most; outside a reading nothing', () => {
  assert.equal(CAVE_PROPS.ink_well.value, 4);
  const g = running(5);
  const mira = wear(g, 'mira', 'cave_lamp_rod');
  mira.mp = 0;
  const b = b1Battle(g);
  assert.equal(b.unit('mira').mp, 0);
  W.HOOKS.armBattle(b, g);
  assert.equal(b.unit('mira').mp, 4); assert.equal(b.unit('mira').startMp, 4);
  assert.equal(b.unit('hero').mp, g.party.find((m) => m.id === 'hero').mp, 'only the wearer');
  const start = b.startEvents.find((e) => e.type === 'battle_start');
  assert.equal(start.units.find((x) => x.uid === 'mira').mp, 4, 'the opening snapshot the HUD builds from shows it');
  mira.mp = memberStats(mira).maxMp - 1;
  const b2 = b1Battle(g); W.HOOKS.armBattle(b2, g);
  assert.equal(b2.unit('mira').mp, b2.unit('mira').maxMp, 'capped at the most');
  // the first fight of the reading carries it back out: the member keeps what the battle left
  const g3 = newGameEp2('Arden');
  const m3 = g3.party.find((x) => x.id === 'mira'); m3.equip.staff = makeUnique('cave_lamp_rod'); m3.weapon = 'staff'; m3.mp = 0;
  const b3 = createEncounterBattle(Object.keys(ENCOUNTERS).find((k) => k.startsWith('cave_b1_e')), { party: g3.party, rng: () => 0.5, inventory: {}, flags: g3.flags }).battle;
  assert.equal(W.HOOKS.armBattle(b3, g3), false, 'outside a reading armBattle does nothing');
  assert.equal(b3.unit('mira').mp, 0);
});

test('Standing Grudge (fury_floor): in a reading the wearer starts every fight at half Fury or more; more is kept', () => {
  assert.equal(CAVE_PROPS.fury_floor.value, 50);
  const g = running(6);
  const hero = wear(g, 'hero', 'cave_contempt_mantle');
  hero.fury = 0;
  const b = b1Battle(g); W.HOOKS.armBattle(b, g);
  assert.equal(b.unit('hero').fury, 50);
  assert.equal(b.unit('mira').fury, 0, 'only the wearer');
  const evs = b.startEvents;
  assert.equal(evs.find((e) => e.type === 'battle_start').units.find((x) => x.uid === 'hero').fury, 50, 'the opening snapshot shows it');
  assert.ok(!evs.some((e) => e.type === 'fury_ready' && e.target === 'hero'), 'half is not full');
  hero.fury = 80;
  const b2 = b1Battle(g); W.HOOKS.armBattle(b2, g);
  assert.equal(b2.unit('hero').fury, 80, 'a floor, not a gift: more is kept');
});

test('Quick Study (exp_lean): in a reading every foe of a fight pays 15% more EXP while anyone wears the Seal', () => {
  assert.equal(CAVE_PROPS.exp_lean.value, 1.15);
  const g = running(8);
  const plain = b1Battle(g);
  const base = plain.units().filter((u) => u.side === 'enemy').map((u) => u.rewards.exp);
  W.HOOKS.armBattle(plain, g);
  assert.deepEqual(plain.units().filter((u) => u.side === 'enemy').map((u) => u.rewards.exp), base, 'no Seal: no change');
  wear(g, 'bram', 'cave_catalogue_seal');
  const b = b1Battle(g);
  W.HOOKS.armBattle(b, g);
  assert.deepEqual(b.units().filter((u) => u.side === 'enemy').map((u) => u.rewards.exp), base.map((e) => Math.round(e * 1.15)));
  // through to the result: the won fight pays the leaned EXP
  for (const u of b.units()) if (u.side === 'enemy') u.hp = 1;
  if (!b.startEvents.length) b.begin();
  for (let i = 0; i < 200 && !b.isOver(); i++) {
    const u = b.current();
    if (!u) break;
    if (u.side === 'party') { const t = b.units().find((x) => x.side === 'enemy' && x.alive); b.perform({ type: 'attack', target: t.uid }); }
    else b.runEnemyTurn();
  }
  const r = b.result();
  assert.equal(r.outcome, 'victory');
  assert.equal(r.exp, base.reduce((s, e) => s + Math.round(e * 1.15), 0));
});

test('the reused hooks reach the new pieces: First Line on the Ladderstep Boots, Downward Sense on the Draught Candle, Rootbound Step on the Forge-Runner\'s Boots', () => {
  const g = running(9);
  const bram = wear(g, 'bram', 'cave_ladder_boots');
  assert.equal(W.HOOKS.firstBlow(bram), true);
  const b = b1Battle(g); W.HOOKS.armBattle(b, g);
  assert.equal(b.unit('bram').firstBlow, true);
  assert.equal(W.HOOKS.moveFrames(g, 12), 12);
  wear(g, 'hero', 'cave_runner_boots');
  assert.equal(W.HOOKS.moveFrames(g, 12), Math.max(3, Math.round(12 / W.MOVE_PLUS)));
  const fakeField = { game: g, map: { mark: (k) => (k === 'stairs' ? [10, 2] : null) }, leader: { tx: 3, ty: 2 } };
  assert.equal(W.HOOKS.stairsDir(fakeField), null, 'no sense worn: no arrow');
  wear(g, 'mira', 'cave_draught_candle');
  assert.equal(W.HOOKS.stairsDir(fakeField), 'right');
});

test('the loot properties reach the chest: Kept Stores, Warm Larder, Owed More, Carried Out, Dog-Eared and Marked Pages ride the worn props into world.js openCaveChest', async () => {
  const g = running(6);
  W.prepareFloor(g, 1);
  const b1 = W.prepareFloor(g, 1)[0];
  const log = [];
  const field = {
    game: g, map: { id: 'cave_b1', mod: b1 }, camera: null, engine: { audio: { sfx() {} }, toasts: { async gold() {}, async received() {} } },
    async giveItem(id, qty) { g.items[id] = (g.items[id] || 0) + qty; }, async giveGear(inst) { return addGear(g, inst); },
    async maybeEquipPrompt() { return false; }, async bark(k) { log.push(k); },
  };
  const red = b1.events.find((e) => e.type === 'chest' && e.tier === 'red');
  const ent = { id: red.id, ev: red, x: red.x, y: red.y };
  for (const [uid, id] of [['bram', 'cave_name_mantle'], ['hero', 'cave_juror_mantle'], ['mira', 'cave_ribbon_mantle'], ['mira', 'cave_binders_mark'],
    ['bram', 'cave_hearth_charm'], ['hero', 'cave_cinder_shoes']]) wear(g, uid, id);
  const props = ['larder', 'larder_1', 'lent_more', 'feather_find', 'bookmark_more', 'bookmark_twice'];
  for (const p of props) assert.ok(W.HOOKS.inRun(g) && (await import('../../src/data/cave/items.js')).wornProps(g.party).includes(p), p);
  const r = await W.openCaveChest(field, ent);
  // B1's first red chest also lends the bare-handed hero a sword (C4-fixes, world.js redChestOpts)
  const want = L.rollRedChest(W.chestRng(g.cave.run.seed, 1, red.id), 1, CAVE.vaultIds(g), { props: (await import('../../src/data/cave/items.js')).wornProps(g.party), landing: false, holdsBookmark: false, bookmarks: 0, lend: 'sword' });
  assert.deepEqual(r.roll, want, 'the chest rolled with the worn props');
  assert.equal(L.bookmarkChance(1, { props }), 0.12, 'Dog-Eared and Marked Pages: three times the Bookmark odds');
  assert.equal(L.redEquipChance(1, { props }), Math.min(0.8, 0.6 + L.LENT_MORE));
});

test('the extra types are weapon things, and a foe weak to the element breaks on them (the Quench Axe against a fire foe that fears ice)', () => {
  const foe = Object.values(ENEMIES).find((e) => !e.boss && e.weak.includes('ice') && !e.weak.includes('axe') && !e.immune.includes('axe') && !e.absorb.includes('ice'));
  assert.ok(foe, 'a foe weak to ice and not to axes');
  const members = partyWith('cave_quench_axe', 'hero');
  const evs = strikeRun(members, 'hero', foe.id, 1, { type: 'attack' });
  const d = evs.find((e) => e.type === 'damage' && e.source === 'hero');
  assert.ok(d && d.weak && d.types.includes('ice'), `${foe.id}: the axe strikes its ice weakness`);
  // the same hero with a plain axe does not
  const plain = ['hero', 'mira', 'bram'].map((id) => newMember(id, { level: 30 }));
  plain[0].equip = { ...plain[0].equip, axe: 'bearded_axe' }; plain[0].weapon = 'axe';
  const d2 = strikeRun(plain, 'hero', foe.id, 1, { type: 'attack' }).find((e) => e.type === 'damage' && e.source === 'hero');
  assert.ok(d2 && !d2.weak && !d2.types.includes('ice'), 'a plain axe is only an axe');
  // armour never carries an extra type (memberStats reads it from the active weapon only)
  for (const u of ALL) if (u.extraTypes) assert.equal(u.slot, 'weapon', u.id);
});
