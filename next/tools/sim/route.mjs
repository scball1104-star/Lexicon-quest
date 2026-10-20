// Route simulator (W10): plays Episode 1's main route as one run, the way a player (or the autoplay bot) meets
// it, instead of one fresh fight at a time. HP and MP carry from fight to fight, EXP levels the party up, elites
// roll at the live rate, field healing spends Mira's MP (Mend) or potions, and the party rests only where the maps
// put a rest point. This is the view that explains live fight lengths: simulate.mjs starts every fight at full
// MP, the field does not.
//
//   node tools/sim/route.mjs                  summary (300 runs)
//   node tools/sim/route.mjs --rests old      the rest points before W10 (no font before the Echo Warden)
//   node tools/sim/route.mjs --bot            the autoplay bot's habits (potions only, chest gear, no field heals)
//   node tools/sim/route.mjs --check          exit 1 if the route misses its targets (ROUTE_TARGETS)
//
// Importable: runRoute(), routeSummary(), REST_PLANS, ROUTE_TARGETS.

import { createBattle, makeRng, memberStats, applyResult } from '../../src/battle/rules.js';
import { partyAction } from '../../src/battle/ai.js';
import { newMember } from '../../src/data/party.js';
import { ENCOUNTERS, ZONES, ZONE_ORDER, rollEncounter } from '../../src/data/encounters.js';
import { ELITE_RATE } from '../../src/data/enemies.js';
import { SKILLS } from '../../src/data/skills.js';
import { LOADOUTS, knownBestiary } from './loadouts.mjs';

// Where the party can rest (full HP and MP) on the main route, as "before the Nth fight of the zone" (0-based,
// in the zone's fight order; the boss is the zone's last fight). The town inn before the valley counts as
// valley 0, the Pilgrim's Rest campfire as valley 4, the F2 stairs-room font as F3 0, F3's font as the boss's 0. 'old' is the build PLAYTEST_REVIEW_2 played; 'current' is the maps as they are now.
export const REST_PLANS = {
  old: { valley: [0, 4], archive_f1: [], archive_f2: [], archive_f3: [0], archive_boss: [0] },
  current: { valley: [0, 4], archive_f1: [], archive_f2: [0], archive_f3: [0], archive_boss: [0] },
};
// Ordinary live fights should average 3 to 5 rounds (DESIGN 7). A careful player (shop gear, field Mends) holds every
// zone to 5; the autoplay bot (potions only, chest gear, no field heals) holds the whole route to 5 and each zone
// to 5.75 (its F3 runs on valley weapons, which no shop tuning can fix).
export const ROUTE_TARGETS = {
  careful: { zoneMin: 3, zoneMax: 5, overallMax: 4.6 },
  bot: { zoneMin: 3, zoneMax: 5.75, overallMax: 5 },
};

function shuffle(arr, R) {
  for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; }
  return arr;
}

function zoneFights(z, R) {
  const ord = [];
  let boss = null;
  for (const [enc, n] of ZONES[z].plan) {
    if (ENCOUNTERS[enc].boss) boss = enc; else for (let i = 0; i < n; i++) ord.push(enc);
  }
  shuffle(ord, R);
  if (boss) ord.push(boss);
  return ord;
}

// The autoplay bot buys potions only and wears what chests give it (valley kit plus the F2 chest pike and shirt):
// the gear-lag half of the live fight lengths.
const V = LOADOUTS.valley;
const BOT_GEAR = {
  valley: V, archive_f1: V,
  archive_f2: { ...V, hero: { ...V.hero, equip: { ...V.hero.equip, body: 'chain_shirt' } }, bram: { ...V.bram, equip: { ...V.bram.equip, spear: 'iron_pike' } } },
};
BOT_GEAR.archive_f3 = { ...BOT_GEAR.archive_f2, mira: { ...V.mira, equip: { ...V.mira.equip, body: 'mirrorguard_mail' } } };
BOT_GEAR.archive_boss = BOT_GEAR.archive_f3;

function gearUp(members, zone, bot = false) {
  const L = LOADOUTS[zone];
  const G = bot ? BOT_GEAR[zone] : L;
  for (const m of members) {
    const hpF = m.hp / memberStats(m).maxHp, mpF = m.mp / Math.max(1, memberStats(m).maxMp);
    m.weapon = G[m.id].weapon;
    m.equip = { ...Object.fromEntries(Object.keys(m.equip).map((k) => [k, null])), ...G[m.id].equip };
    for (const [w, pts] of Object.entries(L[m.id].mastery)) m.mastery[w] = Math.max(m.mastery[w] || 0, pts);
    const s = memberStats(m);
    m.hp = m.hp > 0 ? Math.max(1, Math.round(s.maxHp * hpF)) : 0;
    m.mp = Math.round(s.maxMp * mpF);
  }
}

function rest(members) { for (const m of members) { const s = memberStats(m); m.hp = s.maxHp; m.mp = s.maxMp; } }

/** Between fights: what a careful player does from the menu (feathers, Mend, potions, an Ether for Mira). */
function fieldCare(members, inv, stats, bot = false) {
  for (const m of members) if (m.hp <= 0) {
    if (inv.phoenix_feather > 0) { inv.phoenix_feather--; m.hp = Math.round(memberStats(m).maxHp * 0.25); stats.feathers++; }
    else m.hp = 1; // walked back to a heal; counted as a scare
  }
  const mira = members.find((m) => m.id === 'mira');
  const mend = SKILLS.mend;
  if (bot) {
    // the bot only drinks Ethers (under 30% MP); HP waits for a font
    for (const m of members) if (inv.ether > 0 && m.mp < memberStats(m).maxMp * 0.3) { inv.ether--; m.mp = Math.min(memberStats(m).maxMp, m.mp + 30); stats.fieldEthers++; }
    return;
  }
  for (let guard = 0; guard < 12; guard++) {
    const low = members.map((m) => ({ m, f: m.hp / memberStats(m).maxHp })).sort((a, b) => a.f - b.f)[0];
    if (low.f >= 0.6) break;
    if (mira && mira.hp > 0 && mira.mp >= mend.mp + 4) {
      const ms = memberStats(mira);
      mira.mp -= mend.mp;
      low.m.hp = Math.min(memberStats(low.m).maxHp, low.m.hp + Math.round(ms.mag * mend.power / 100 * (1 + (ms.healPow || 0) / 100)));
      stats.fieldMends++;
    } else if (inv.potion > 0) { inv.potion--; low.m.hp = Math.min(memberStats(low.m).maxHp, low.m.hp + 60); stats.fieldPotions++; }
    else break;
  }
  if (mira && inv.ether > 0 && mira.mp < memberStats(mira).maxMp * 0.2) { inv.ether--; mira.mp = Math.min(memberStats(mira).maxMp, mira.mp + 30); stats.fieldEthers++; }
}

/** One full run of the main route. Returns per-fight rows. */
export function runRoute({ seed = 1, rests = REST_PLANS.current, policy = 'competent', eliteRate = ELITE_RATE, zones = ZONE_ORDER, bot = false, track = null } = {}) {
  const rng = makeRng(seed * 104729 + 7);
  const R = () => rng.next();
  const members = ['hero', 'mira', 'bram'].map((id) => newMember(id, { level: 1 }));
  for (const m of members) { m.exp = 0; m.mastery = {}; m.equip = {}; }
  const rows = [];
  let carry = {};
  const stats = { fieldMends: 0, fieldPotions: 0, fieldEthers: 0, feathers: 0, losses: 0 };
  for (const z of zones) {
    gearUp(members, z, bot);
    const inv = bot ? { ...(z === 'valley' ? { potion: 5 } : {}), ...carry } : { ...LOADOUTS[z].inventory };
    const plan = zoneFights(z, R);
    plan.forEach((enc, i) => {
      if ((rests[z] || []).includes(i)) rest(members);
      else fieldCare(members, inv, stats, bot);
      const e = ENCOUNTERS[enc];
      const hpStart = members.reduce((s, m) => s + Math.max(0, m.hp), 0) / members.reduce((s, m) => s + memberStats(m).maxHp, 0);
      const mpStart = members.reduce((s, m) => s + m.mp, 0) / members.reduce((s, m) => s + memberStats(m).maxMp, 0);
      const spec = rollEncounter(enc, rng, { eliteRate });
      const b = createBattle({ party: members.map((m) => ({ ...m })), enemies: spec.enemies, rng,
        options: { inventory: inv, boss: e.boss, canFlee: false, zone: e.zone, encounter: enc, bestiary: knownBestiary() } });
      let steps = 0;
      while (!b.isOver() && steps++ < 1500) {
        const u = b.current();
        if (u.side === 'party') {
          const act = partyAction(b, policy);
          if (track) {
            const mpBefore = u.mp;
            const key = `${z}:${u.id}:${act.type === 'skill' || act.type === 'combo' ? act.skill : act.type}`;
            track[key] = track[key] || { n: 0, mp: 0 };
            track[key].n++;
            const evs0 = b.perform(act);
            track[key].mp += Math.max(0, mpBefore - b.unit(u.uid).mp);
            if (evs0.length === 1 && evs0[0].type === 'invalid') b.perform({ type: 'defend' });
            continue;
          }
          let evs = b.perform(act);
          if (evs.length === 1 && evs[0].type === 'invalid') b.perform({ type: 'defend' });
        } else b.runEnemyTurn();
      }
      const res = b.result() || { outcome: 'timeout', party: [], rounds: 99 };
      if (res.inventory) { for (const k of Object.keys(inv)) delete inv[k]; Object.assign(inv, res.inventory); }
      const elite = spec.enemies.some((x) => x.elite);
      if (res.outcome !== 'victory') { stats.losses++; rest(members); }
      else applyResult(members, res);
      rows.push({ zone: z, i, encounter: enc, boss: !!e.boss, elite, rounds: res.rounds, win: res.outcome === 'victory',
        level: members[0].level, mpStart, hpStart, mpEnd: members.reduce((s, m) => s + m.mp, 0) / members.reduce((s, m) => s + memberStats(m).maxMp, 0) });
    });
    carry = { ...inv };
  }
  return { rows, stats };
}

const avg = (a) => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : 0);

/** Many runs: average rounds of ordinary fights per zone, split by MP band and elite flag. */
export function routeSummary({ n = 300, rests = REST_PLANS.current, policy = 'competent', eliteRate = ELITE_RATE, bot = false } = {}) {
  const all = [];
  const tot = { fieldMends: 0, fieldPotions: 0, fieldEthers: 0, feathers: 0, losses: 0 };
  for (let s = 1; s <= n; s++) {
    const r = runRoute({ seed: s, rests, policy, eliteRate, bot });
    all.push(...r.rows);
    for (const k of Object.keys(tot)) tot[k] += r.stats[k];
  }
  const ord = all.filter((r) => !r.boss);
  const zones = {};
  for (const z of ZONE_ORDER) {
    const rs = ord.filter((r) => r.zone === z);
    if (!rs.length) continue;
    zones[z] = {
      fights: rs.length / n, rounds: avg(rs.map((r) => r.rounds)),
      plain: avg(rs.filter((r) => !r.elite).map((r) => r.rounds)), elite: avg(rs.filter((r) => r.elite).map((r) => r.rounds)),
      highMp: avg(rs.filter((r) => r.mpStart >= 0.5).map((r) => r.rounds)), lowMp: avg(rs.filter((r) => r.mpStart < 0.5).map((r) => r.rounds)),
      hpStart: avg(rs.map((r) => r.hpStart)),
      lowShare: rs.filter((r) => r.mpStart < 0.5).length / rs.length, mpStart: avg(rs.map((r) => r.mpStart)),
      level: avg(rs.map((r) => r.level)), winRate: rs.filter((r) => r.win).length / rs.length,
    };
  }
  const bosses = {};
  for (const enc of ['echo_warden', 'archivore']) {
    const rs = all.filter((r) => r.encounter === enc);
    bosses[enc] = { rounds: avg(rs.map((r) => r.rounds)), win: rs.filter((r) => r.win).length / Math.max(1, rs.length), mpStart: avg(rs.map((r) => r.mpStart)), level: avg(rs.map((r) => r.level)) };
  }
  for (const k of Object.keys(tot)) tot[k] /= n;
  return { n, zones, bosses, overall: avg(ord.map((r) => r.rounds)), care: tot };
}

export function checkRoute(sum, mode = 'careful') {
  const fails = [];
  const T = ROUTE_TARGETS[mode];
  for (const [z, v] of Object.entries(sum.zones)) {
    if (v.rounds < T.zoneMin || v.rounds > T.zoneMax) fails.push(`route (${mode}) ${z}: ordinary fights average ${v.rounds.toFixed(2)} rounds, want ${T.zoneMin}-${T.zoneMax}`);
  }
  if (sum.overall > T.overallMax) fails.push(`route (${mode}): ordinary fights average ${sum.overall.toFixed(2)} rounds overall, want <= ${T.overallMax}`);
  return fails;
}

export function formatRoute(sum) {
  const p = (v) => `${Math.round(v * 100)}%`;
  const lines = ['zone | fights | rounds | plain | elite | MP>=50% | MP<50% (share) | MP / HP at start | Lv', '---|---|---|---|---|---|---|---|---'];
  for (const [z, v] of Object.entries(sum.zones)) {
    lines.push(`${z} | ${v.fights.toFixed(1)} | ${v.rounds.toFixed(2)} | ${v.plain.toFixed(2)} | ${v.elite.toFixed(2)} | ${v.highMp.toFixed(2)} | ${v.lowMp.toFixed(2)} (${p(v.lowShare)}) | ${p(v.mpStart)} / ${p(v.hpStart)} | ${v.level.toFixed(1)}`);
  }
  for (const [b, v] of Object.entries(sum.bosses)) lines.push(`${b}: ${v.rounds.toFixed(2)} rounds, win ${p(v.win)}, MP at start ${p(v.mpStart)}, Lv ${v.level.toFixed(1)}`);
  lines.push(`overall ordinary: ${sum.overall.toFixed(2)} rounds; per run: ${sum.care.fieldMends.toFixed(1)} field Mends, ${sum.care.fieldPotions.toFixed(1)} field potions, ${sum.care.fieldEthers.toFixed(1)} field ethers, ${sum.care.feathers.toFixed(1)} feathers, ${sum.care.losses.toFixed(2)} losses`);
  return lines.join('\n');
}

const isMain = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop());
if (isMain) {
  const args = process.argv.slice(2);
  const get = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
  const n = Number(get('--n', 300));
  const rests = REST_PLANS[get('--rests', 'current')];
  const t0 = Date.now();
  const sum = routeSummary({ n, rests, policy: get('--policy', 'competent'), eliteRate: Number(get('--elite', ELITE_RATE)), bot: args.includes('--bot') });
  console.log(formatRoute(sum));
  const fails = checkRoute(sum, args.includes('--bot') ? 'bot' : 'careful');
  console.log(fails.length ? 'ROUTE TARGETS MISSED:\n  ' + fails.join('\n  ') : 'Route targets met.');
  console.log(`(${n} runs in ${((Date.now() - t0) / 1000).toFixed(1)} s)`);
  if (args.includes('--check') && fails.length) process.exit(1);
}
