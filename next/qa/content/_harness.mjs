// Shared helpers for the content tests (not a test file itself: run.mjs only runs *.test.mjs).
// A recording mock of the cutscene API (DESIGN 5.4 + the signatures in docs/story/STAGING.md) that
// rejects any method outside the API, plus a branch explorer that replays a scene once per path
// through its choices, flag checks and battle results.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const NEXT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

// The only methods a scene may call. camera is an object with panTo and follow.
export const API = new Set(['say', 'choice', 'walk', 'face', 'jump', 'emote', 'wait', 'camera', 'shake', 'flash',
  'fade', 'tint', 'music', 'sfx', 'spawn', 'despawn', 'setFlag', 'hasFlag', 'give', 'take', 'battle', 'addMember',
  'title', 'lockInput', 'unlockInput']);
export const CAMERA_API = new Set(['panTo', 'follow']);

// Canonical ids from COMMON.md / DESIGN.md.
export const MAP_IDS = ['hero_home', 'willowmere', 'inn', 'item_shop', 'smithy', 'library', 'chapel', 'bakery', 'valley',
  'archive_f1', 'archive_f2', 'archive_f3', 'archive_boss'];
export const NPC_SPRITES = ['npc_elder', 'npc_tess', 'npc_baker', 'npc_ferry', 'npc_innkeeper', 'npc_shopkeeper',
  'npc_smith', 'npc_child_a', 'npc_child_b', 'npc_guard', 'npc_old_woman', 'npc_farmer', 'npc_scholar', 'npc_parent',
  'npc_bellkeeper', 'animal_cat', 'animal_dog', 'animal_chicken', 'animal_duck'];
// Extra sprite ids agreed with W1-sprites for the story (see report): party sprites and npc_dough.
export const EXTRA_SPRITES = ['hero', 'mira', 'bram', 'npc_dough'];
export const PORTRAITS = ['hero', 'mira', 'bram', 'mael', 'tess', 'iris', 'nella', 'pell', 'hazel', 'hob', 'garrick',
  'pip']; // W1-sprites portraits.json (48 and 32 px)
export const MUSIC = ['title', 'willowmere', 'valley', 'archive', 'battle', 'boss_archivore', 'mystery', 'sorrow',
  'triumph', 'victory', 'gameover'];
export const SFX = [
  // DESIGN 8
  'cursor', 'confirm', 'cancel', 'buzzer', 'text_blip', 'door_open', 'door_close', 'stairs', 'chest_open', 'pot_break',
  'footstep_grass', 'footstep_stone', 'footstep_wood', 'block_push', 'switch_on', 'gate_open', 'bridge_appear',
  'lantern_reveal', 'splash', 'encounter', 'flee', 'sword_slash', 'spear_thrust', 'staff_hit', 'axe_chop', 'bow_shot',
  'hit_light', 'hit_heavy', 'crit', 'miss', 'enemy_die', 'boss_die', 'fire', 'ice', 'thunder', 'heal', 'buff',
  'debuff', 'poison', 'break', 'fury_ready', 'fury_art', 'combo_start', 'level_up_sparkle', 'drop_common',
  'drop_magic', 'drop_rare', 'drop_legendary', 'menu_open', 'menu_close', 'equip', 'buy', 'save_chime',
  // Added by W1-audio at W1-content's request
  'bell_toll', 'bell_peal', 'sign_fade', 'name_restore', 'door_rumble', 'ink_gurgle', 'page_flutter',
  // Extra ids W1-audio ships
  'switch_off', 'door_locked', 'door_unlock', 'jump', 'land', 'fall', 'brazier_light', 'shelf_move', 'crystal_hit',
  'emote_pop', 'item_use', 'revive', 'defend', 'stun', 'telegraph', 'summon', 'name_devour', 'coin',
];
export const EMOTES = ['!', '?', '...', 'heart', 'sweat', 'anger', 'music', 'zzz'];
export const DIRS = ['up', 'down', 'left', 'right'];
export const TINTS = ['none', 'dawn', 'day', 'dusk', 'night', 'ink'];
export const ENCOUNTER_IDS_FALLBACK = ['echo_warden', 'archivore'];

/** Walk a directory tree and return file paths matching a predicate. */
export function listFiles(dir, pred = () => true) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) { if (name !== 'out' && name !== 'node_modules') out.push(...listFiles(p, pred)); }
    else if (pred(p)) out.push(p);
  }
  return out;
}

export const read = (p) => readFileSync(p, 'utf8');

/**
 * Run a scene once along one path. `decisions` is the prefix of answers to replay; past the prefix every
 * decision takes option 0 (choice 0, flag unset, battle won). Returns the op log and the decision points.
 */
export async function runOnce(sceneFn, { decisions = [], flags = [], branchFlags = true, set: shared = null } = {}) {
  const log = [];
  const points = []; // number of options at each decision point, in order
  const set = shared || new Set(flags);
  const asked = new Map(); // flag -> answer, for flags decided on this path
  let di = 0;
  const decide = (n) => { const v = di < decisions.length ? decisions[di] : 0; points.push(n); di++; return v; };
  const rec = (op, ...args) => { log.push({ op, args }); };
  const fn = (name) => async (...args) => { rec(name, ...args); };
  const target = {
    say: fn('say'), walk: fn('walk'), face: fn('face'), jump: fn('jump'), emote: fn('emote'), wait: fn('wait'),
    shake: fn('shake'), flash: fn('flash'), fade: fn('fade'), tint: fn('tint'), music: fn('music'), sfx: fn('sfx'),
    spawn: fn('spawn'), despawn: fn('despawn'), give: fn('give'), take: fn('take'), addMember: fn('addMember'),
    title: fn('title'), lockInput: fn('lockInput'), unlockInput: fn('unlockInput'),
    camera: new Proxy({ panTo: fn('camera.panTo'), follow: fn('camera.follow') }, {
      get(t, k) { if (!CAMERA_API.has(k)) throw new Error(`camera.${String(k)} is not part of the cutscene API`); return t[k]; },
    }),
    choice: async (options, opts) => { const i = decide(options.length); rec('choice', options, i, opts); return i; },
    setFlag: async (f, v = true) => { rec('setFlag', f, v); if (v) set.add(f); else set.delete(f); asked.set(f, !!v); },
    hasFlag: (f) => {
      let v;
      if (set.has(f)) v = true;
      else if (asked.has(f)) v = asked.get(f);
      else if (!branchFlags) v = false;
      else { v = decide(2) === 1; asked.set(f, v); }
      rec('hasFlag', f, v);
      return v;
    },
    battle: async (id, opts) => { const r = decide(2) === 0 ? 'win' : 'lose'; rec('battle', id, opts, r); return r; },
  };
  const s = new Proxy(target, {
    get(t, k) {
      if (typeof k === 'symbol' || k === 'then') return undefined;
      if (!API.has(k)) throw new Error(`s.${String(k)} is not part of the cutscene API`);
      return t[k];
    },
  });
  await sceneFn(s);
  return { log, points };
}

/**
 * Play scenes in order against one shared flag set, like a real playthrough: unset flags read false,
 * choices take `choice` (default 0), battles are won. Returns { set, logs: { sceneId: log } }.
 */
export async function playthrough(scenes, order, { flags = [], choices = {} } = {}) {
  const set = new Set(flags);
  const logs = {};
  for (const step of order) {
    if (typeof step === 'function') { step(set); continue; }
    const [id, pick] = Array.isArray(step) ? step : [step, choices[step] || []];
    if (!scenes[id]) throw new Error(`no scene ${id}`);
    const { log } = await runOnce(scenes[id], { decisions: pick, branchFlags: false, set });
    (logs[id] ||= []).push(log);
  }
  return { set, logs };
}

/** Every path through a scene (bounded). Returns [{ log, decisions }]. */
export async function explore(sceneFn, { flags = [], maxRuns = 4096 } = {}) {
  const runs = [];
  const stack = [[]];
  while (stack.length) {
    if (runs.length >= maxRuns) throw new Error(`scene has more than ${maxRuns} paths`);
    const prefix = stack.pop();
    const { log, points } = await runOnce(sceneFn, { decisions: prefix, flags });
    runs.push({ log, decisions: prefix });
    // Schedule siblings for every decision point at or after the end of the prefix.
    for (let i = points.length - 1; i >= prefix.length; i--) {
      for (let opt = 1; opt < points[i]; opt++) {
        const next = points.slice(0, i).map((_, j) => (j < prefix.length ? prefix[j] : 0));
        next.push(opt);
        stack.push(next);
      }
    }
  }
  return runs;
}
