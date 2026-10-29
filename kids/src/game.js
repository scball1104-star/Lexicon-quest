// The level scene: real-time top-down play. Player, buddy, pet, enemies, hazards, pickups, boss.
import { PROPS, sfx, music } from './assets.js';
import { TileMap, T } from './tilemap.js';
import { MAPS } from './maps.js';
import { input } from './input.js';


export const UPGRADES = {
  heart1: { name: 'Heart Container', desc: '+1 heart, forever!' },
  heart2: { name: 'Heart Container', desc: '+1 heart, forever!' },
  boots: { name: 'Spring Boots', desc: 'You jump higher and farther now!' },
  gem: { name: 'Power Gem', desc: 'Every hit does +1 damage!' },
  magnet: { name: 'Coin Magnet', desc: 'Your pet grabs coins from much farther away!' },
  halo: { name: 'Golden Halo', desc: 'A secret hat! Wear it from the Wardrobe.' },
  heart3: { name: 'Heart Container', desc: '+1 heart, forever!' },
  heart4: { name: 'Heart Container', desc: '+1 heart, forever!' },
  swift: { name: 'Swift Shoes', desc: 'You run faster now!' },
  charge: { name: 'Super Charger', desc: 'Your SUPER fills up twice as fast!' },
  lucky: { name: 'Lucky Coin', desc: 'Every coin is worth 2 now!' },
  captain: { name: "Captain's Hat", desc: 'A secret hat! Wear it from the Wardrobe.' },
  heart5: { name: 'Heart Container', desc: 'One more heart, for good!' },
  heart6: { name: 'Heart Container', desc: 'One more heart, for good!' },
  rangplus: { name: 'Long Throw', desc: 'Your Boomerang flies much farther!' },
  gem2: { name: 'Mirror Gem', desc: 'Every weapon hits even harder!' },
  heart7: { name: 'Heart Container', desc: 'One more heart, for good!' },
  heart8: { name: 'Heart Container', desc: 'One more heart, for good!' },
  shades: { name: 'Cool Shades', desc: 'A secret look! Wear them from the Wardrobe.' },
  twin: { name: 'Twin Sparks', desc: 'Your Staff shoots two sparks at once!' },
  heart9: { name: 'Heart Container', desc: 'One more heart, for good!' },
  heart10: { name: 'Heart Container', desc: 'One more heart, for good!' },
  miner: { name: "Miner's Helmet", desc: 'A secret hat with a real lamp! Wear it from the Wardrobe.' },
  hookplus: { name: 'Long Chain', desc: 'Your Hook reaches much farther!' },
  frost: { name: 'Frost Charm', desc: 'Falling in lava no longer costs a heart!' },
  quick: { name: 'Spark Plug', desc: 'Your SUPER starts full on every floor!' },
};

export const LEVELS = {
  valley: {
    id: 'valley', title: 'Willow Fields', theme: 'valley', music: 'valley', map: 'valley', word: 'BELL',
    stars: ['Ring the bell', 'Find the hidden scroll', 'Spell the word BELL'],
    prize: "Oren's Ovens", prizeText: 'The bakery sign has its name back!',
  },
  obby: {
    id: 'obby', title: 'Bookshelf Run', theme: 'archive', music: 'archive', map: 'obby', word: 'BOOK', timeStar: 180,
    stars: ['Reach the chest', 'Find the hidden scroll', 'Finish in under 3 minutes'],
    prize: "Mira's name page", prizeText: 'Now Iris can remember Mira!',
  },
  archive: {
    id: 'archive', title: 'Rootbound Archive', theme: 'archive', music: 'archive', map: 'archive', word: 'NAME',
    stars: ['Reach the last chest', 'Find the hidden scroll', 'Spell the word NAME'],
    prize: "Iris's name", prizeText: "Mira's teacher remembers her own name!",
  },
  race: {
    id: 'race', title: 'Ferry Race', theme: 'valley', music: 'valley', map: 'race', word: 'BOAT', rival: true, bell: true,
    stars: ['Ring the ferry bell', 'Find the hidden scroll', 'Beat Pip to the bell'],
    prize: "Nella's ferry bell", prizeText: 'The ferry can cross the river again!',
  },
  boss: {
    id: 'boss', title: 'The Archivore', theme: 'sanctum', music: 'boss', map: 'boss', word: 'HOME', heartsStar: 6,
    stars: ['Defeat the Archivore', 'Find the hidden scroll', 'Finish with 3 or more hearts'],
    prize: 'Every name in Willowmere', prizeText: 'World 1 complete! All the names are home.',
  },
  hollow: {
    id: 'hollow', title: 'Hollow Lanes', theme: 'hollow', music: 'town', map: 'hollow', word: 'TOWN', bell: true,
    stars: ['Ring the town bell', 'Find the hidden scroll', 'Spell the word TOWN'],
    prize: 'The street signs', prizeText: 'The Hollow remembers its street names!',
  },
  glassway: {
    id: 'glassway', title: 'Glassway Run', theme: 'mirror', music: 'archive', map: 'glassway', word: 'BEAM', timeStar: 200,
    stars: ['Reach the chest', 'Find the hidden scroll', 'Finish in under 3:20'],
    prize: 'The Glass Bridge', prizeText: 'The tower bridge shines again!',
  },
  reflection: {
    id: 'reflection', title: 'Reflection Race', theme: 'hollow', music: 'valley', map: 'reflection', word: 'FACE', rival: true, bell: true,
    stars: ['Ring the tower bell', 'Find the hidden scroll', 'Beat your reflection'],
    prize: "The Hollow's own name", prizeText: 'The town remembers: it is called Hollowmere!',
  },
  king: {
    id: 'king', title: 'The Nameless King', theme: 'mirror', music: 'boss', map: 'king', word: 'KING', heartsStar: 6, bossFloor: true,
    stars: ['Defeat the Nameless King', 'Find the hidden scroll', 'Finish with 3 or more hearts'],
    prize: 'King Aurel', prizeText: 'The King remembers his name: Aurel! Nameless Hollow is free.',
  },
  bellows: {
    id: 'bellows', title: 'Bellows Square', theme: 'emberpeak', music: 'town', map: 'bellows', word: 'FIRE', bell: true,
    stars: ['Ring the mine bell', 'Find the hidden scroll', 'Spell the word FIRE'],
    prize: "Veyra's forge sign", prizeText: 'The miners remember their forge!',
  },
  ashfall: {
    id: 'ashfall', title: 'Ashfall Climb', theme: 'foundry', music: 'archive', map: 'ashfall', word: 'COAL', timeStar: 200,
    stars: ['Reach the chest', 'Find the hidden scroll', 'Finish in under 3:20'],
    prize: 'The lift chain', prizeText: 'The ore lift rattles back to life!',
  },
  liftworks: {
    id: 'liftworks', title: 'Cinder Liftworks', theme: 'foundry', music: 'archive', map: 'liftworks', word: 'COOL',
    stars: ['Reach the last chest', 'Find the hidden scroll', 'Spell the word COOL'],
    prize: "Bram's lamp", prizeText: 'Bram remembers his own name!',
  },
  minecart: {
    id: 'minecart', title: 'Minecart Rush', theme: 'emberpeak', music: 'valley', map: 'minecart', word: 'MINE', rival: true, bell: true,
    stars: ['Ring the summit bell', 'Find the hidden scroll', 'Beat Bram to the bell'],
    prize: 'The First Bell', prizeText: 'The First Bell rings over Emberpeak!',
  },
  warden: {
    id: 'warden', title: 'The Cinder Warden', theme: 'foundry', music: 'boss', map: 'warden', word: 'HEAT', heartsStar: 6, bossFloor: true,
    stars: ['Defeat the Cinder Warden', 'Find the hidden scroll', 'Finish with 3 or more hearts'],
    prize: 'The Heartforge', prizeText: 'The Heartforge burns warm and kind again. Emberpeak is free!',
  },
  arena: {
    id: 'arena', title: 'Battle Arena', theme: 'hollow', music: 'boss', map: 'arena', word: '', waves: 10, minigame: true,
    stars: [], prize: '', prizeText: '',
  },
  silverglass: {
    id: 'silverglass', title: 'Silverglass Hall', theme: 'mirror', music: 'archive', map: 'silverglass', word: 'GLOW',
    stars: ['Reach the mirror chest', 'Find the hidden scroll', 'Spell the word GLOW'],
    prize: 'The Mirror Key', prizeText: 'The way up the Court of Mirrors is open!',
  },
};

import { PET_SHOP, lvl } from './shop.js';

export const ITEMS = ['Sword', 'Staff', 'Hammer', 'Boomerang', 'Hook'];
export const WEAPON_INFO = {
  Sword: { desc: 'Slash nearby enemies and bushes.' },
  Staff: { desc: 'Shoots sparks! Zaps far levers and lights lanterns.' },
  Hammer: { desc: 'Big and slow. Smashes cracked boulders!' },
  Boomerang: { desc: 'Throw it and it comes back! Turns far mirrors, stuns enemies, grabs coins.' },
  Hook: { desc: 'Aim at a hook post to zip across lava! It also tugs enemies to you.' },
};
const rnd = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

export class Game {
  constructor(levelId, save, hooks) {
    this.L = LEVELS[levelId];
    this.save = save;
    this.hooks = hooks;           // { hint(text), result(data), bossBar(v), hud() }
    const m = MAPS[this.L.map];
    this.map = new TileMap(m.rows, this.L.theme);
    this.time = 0; this.clock = 0;
    this.assist = !!save.assist;
    this.shake = 0; this.hitstop = 0;
    this.enemies = []; this.pickups = []; this.props = []; this.fx = []; this.shots = []; this.hazards = []; this.platforms = [];
    this.crumbles = new Map(); this.checkpoints = []; this.letters = []; this.lettersGot = [];
    this.coins = 0; this.gotScroll = false; this.done = false; this.hintsShown = new Set();
    this.upgrades = save.upgrades || (save.upgrades = {});
    this.secretChests = []; this.secretsThisRun = [];
    this.emitters = []; this.mirrors = []; this.crystals = [];
    this.posts = []; this.valves = []; this.coolZones = []; this.slabs = []; this.fans = []; this.vents = []; this.rings = [];
    this.blocks = []; this.resets = []; this.plates = []; this.gates = []; this.levers = []; this.braziers = []; this.groupState = {};
    this.weapons = save.weapons || (save.weapons = { Sword: true });
    this.weapons.Sword = true;
    this.pedestals = [];
    this.petPower = (PET_SHOP[save.hero.pet] || PET_SHOP.Slime).power;
    this.petShield = { ready: true, t: 0 };
    this.stairs = null; this.finished = false;
    this.item = ITEMS.indexOf(save.hero.item);
    if (this.item < 0 || !this.weapons[ITEMS[this.item]]) this.item = 0;
    this.goal = null; this.boss = null; this.bossGate = [];
    this.pageZones = (m.pageZones || []).map(([a, b]) => [a * T, b * T]);
    this.arena = m.arena || null;
    this.hints = m.hints || [];
    this.pageTimer = 1;
    for (const [c, tx, ty, ...extra] of m.ents) this.spawn(c, tx, ty, extra);
    if (m.race) this.rival = { path: m.race.path.map(([x, y]) => ({ x: x * T + 8, y: y * T + 9 })), i: 1, x: m.race.path[0][0] * T + 8, y: m.race.path[0][1] * T + 9, z: 0, wait: 3.2, speed: m.race.speed, done: false, walk: 0, face: 0, kind: m.race.kind || 'pip', name: { mirror: 'YOUR REFLECTION', bram: 'BRAM' }[m.race.kind] || 'PIP' };
    if (this.rival) this.rival.started = false;
    for (let y = 0; y < this.map.h; y++) for (let x = 0; x < this.map.w; x++) if (this.map.charAt(x, y) === 'x') this.crumbles.set(x + ',' + y, { tx: x, ty: y, t: 0, state: 'ok' });
    music(this.L.music);
  }

  // ------------------------------------------------------------------ spawning
  spawn(c, tx, ty, extra = []) {
    const cx = tx * T + 8, cy = ty * T + 12;
    const prop = (id, solid = true, extra = {}) => {
      const p = PROPS[id] || { footprint: [1, 1] };
      const o = { kind: 'prop', id, tx, ty, x: tx * T + p.footprint[0] * 8, y: ty * T + 15, ...extra };
      this.props.push(o);
      if (solid) for (let i = 0; i < Math.max(1, p.footprint[0]); i++) this.map.setColl(tx + i, ty, 'solid');
      return o;
    };
    switch (c) {
      case 'S': this.player = this.makePlayer(cx, cy); this.spawnPt = { x: cx, y: cy }; break;
      case 'T': prop('tree_willow'); break;
      case 'p': prop('tree_pine'); break;
      case 'b': prop('bush', true, { cut: true }); break;
      case 'o': prop('pot', true, { breakable: true }); break;
      case 'r': prop('bookshelf'); break;
      case 'B': prop('boulder', true, { breakable: true, hammerOnly: true }); break;
      case 'E':
        // an 'optional' pedestal is a spare for players who skipped ahead: it only appears if you still need it
        if (extra[1] === 'optional' && this.weapons[extra[0]]) break;
        this.pedestals.push(prop('weapon_pedestal', false, { weapon: extra[0], taken: !!this.weapons[extra[0]] })); break;
      case 'U': this.secretChests.push(prop('secret_chest', false, { secret: extra[0], opened: !!this.upgrades[extra[0]] })); break;
      case 'K': this.checkpoints.push(prop('lamp_post', true, { lit: false, cpx: cx, cpy: cy + 16 })); break;
      case 'G':
        if (this.L.id === 'valley' || this.L.bell) this.goal = prop('prop_thirteenth_bell', false, { hidden: this.L.id === 'valley', gx: cx, gy: cy });
        else this.goal = prop('chest_gold', false, { gx: cx, gy: cy, hidden: this.L.id === 'boss' || !!this.L.bossFloor });
        break;
      case 'c': this.pickups.push({ kind: 'coin', x: cx, y: cy, z: 0, bob: Math.random() * 6 }); break;
      case 'h': this.pickups.push({ kind: 'heart', x: cx, y: cy, z: 0, bob: Math.random() * 6 }); break;
      case '*': this.pickups.push({ kind: 'scroll', x: cx, y: cy, z: 0, bob: 0 }); break;
      case '1': case '2': case '3': case '4': {
        const i = +c - 1;
        this.pickups.push({ kind: 'letter', ch: this.L.word[i], i, x: cx, y: cy, z: 0, bob: i });
        break;
      }
      case '=': {
        // ['=', x, y, fromX, toX]: a 2-tile shelf sliding between two tile columns
        const [fx, toX] = extra.length ? extra : [tx, tx + 4];
        this.platforms.push({ x0: fx * T, x1: toX * T, y: ty * T, w: 32, h: 16, x: fx * T, dx: 0, period: 2 + Math.abs(toX - fx) * 0.45 });
        break;
      }
      case '|': {
        // ['|', x, y, fromY, toY]: a 2x2 ferry raft gliding up and down a river
        const [fy, toY] = extra.length ? extra : [ty, ty + 4];
        this.platforms.push({ axis: 'y', y0: fy * T, y1: toY * T, x: tx * T, y: fy * T, w: 32, h: 32, dx: 0, dy: 0, period: 2.4 + Math.abs(toY - fy) * 0.5, raft: true });
        break;
      }
      case 'P': { const b = { tx, ty, px: tx, py: ty, sx: tx, sy: ty, group: extra[0] }; this.blocks.push(b); this.map.setColl(tx, ty, 'solid'); break; }
      case 'Q': this.resets.push({ tx, ty, group: extra[0], cool: 0 }); break;
      case '>': {
        // ['>', x, y, fromX, toX]: a 2x2 ferry raft gliding across a river
        const [fx, toX] = extra;
        this.platforms.push({ x0: fx * T, x1: toX * T, x: fx * T, y: ty * T, w: 32, h: 32, dx: 0, dy: 0, period: 2.6 + Math.abs(toX - fx) * 0.55, raft: true });
        break;
      }
      case '_': this.plates.push({ tx, ty, group: extra[0], pressed: false }); break;
      case 'D': this.gates.push({ tx, ty, group: extra[0], open: false }); this.map.setColl(tx, ty, 'solid'); break;
      case 'L': this.levers.push({ tx, ty, group: extra[0], on: false }); this.map.setColl(tx, ty, 'solid'); break;
      case 'Y': this.braziers.push({ tx, ty, group: extra[0], lit: false }); this.map.setColl(tx, ty, 'solid'); break;
      case 'M': this.enemies.push(this.makeEnemy('mite', cx, cy)); break;
      case 'I': this.enemies.push(this.makeEnemy('imp', cx, cy)); break;
      // Emberpeak: q hook post, v valve [group], n cool zone [group, x0, y0, x1, y1], f fan [dir, len, on?], e steam vent [period, offset, boss?]
      case 'q': this.posts.push({ tx, ty }); this.map.setColl(tx, ty, 'solid'); break;
      case 'v': this.valves.push({ tx, ty, group: extra[0], on: false, spin: 0 }); this.map.setColl(tx, ty, 'solid'); break;
      case 'n': this.coolZones.push({ group: extra[0], x0: extra[1], y0: extra[2], x1: extra[3], y1: extra[4], done: false }); break;
      case 'f': this.fans.push({ tx, ty, dir: extra[0] || 'E', len: extra[1] || 6, on: extra[2] !== false, cool: 0, crateT: 0, spin: 0 }); this.map.setColl(tx, ty, 'solid'); break;
      case 'e': this.vents.push({ tx, ty, period: (extra[0] || 3), offset: extra[1] || 0, boss: !!extra[2], active: !extra[2], state: 'idle' }); break;
      case 'y': this.enemies.push(this.makeEnemy('cinder', cx, cy)); break;
      case 'a': this.enemies.push(this.makeEnemy('bat', cx, cy)); break;
      case 'u': this.enemies.push(this.makeEnemy('coil', cx, cy)); break;
      case 'W': { const b = this.makeEnemy('warden', cx, cy); b.sleeping = true; this.boss = b; this.enemies.push(b); break; }
      // mirror puzzles: J emitter [group, dir NESW], N mirror [orient 0='/' 1='\\', 'fixed'?], C crystal [group]
      // J opts: { hazard, cycle: [onSeconds, offSeconds], offset, boss (only shines in the boss's last phase) }
      case 'J': { const o = extra[2] || {}; this.emitters.push({ tx, ty, group: extra[0], dir: extra[1] || 'E', path: [], hazard: !!o.hazard, cycle: o.cycle || null, offset: o.offset || 0, boss: !!o.boss, active: !o.boss, on: true, warn: false }); this.map.setColl(tx, ty, 'solid'); break; }
      // N: [orient, 'fixed' | 'auto', autoPeriod]
      case 'N': this.mirrors.push({ tx, ty, orient: extra[0] || 0, fixed: extra[1] === 'fixed' || extra[1] === 'auto', auto: extra[1] === 'auto' ? (extra[2] || 2.5) : 0, at: extra[2] || 2.5, warn: false, cool: 0, turn: 0 }); this.map.setColl(tx, ty, 'solid'); break;
      case 'C': this.crystals.push({ tx, ty, group: extra[0], lit: false }); this.map.setColl(tx, ty, 'solid'); break;
      case 'Z': { const b = this.makeEnemy('archivore', cx, cy); b.sleeping = true; this.boss = b; this.enemies.push(b); break; }
      case 's': this.enemies.push(this.makeEnemy('slime', cx, cy)); break;
      case 'm': this.enemies.push(this.makeEnemy('scarab', cx, cy)); break;
      case 'w': this.enemies.push(this.makeEnemy('wolf', cx, cy)); break;
      case 'g': this.enemies.push(this.makeEnemy('golem', cx, cy)); break;
      case 'A': { const b = this.makeEnemy('alpha', cx, cy); b.sleeping = true; this.boss = b; this.enemies.push(b); break; }
      case 'X': { const b = this.makeEnemy('king', cx, cy); b.sleeping = true; this.boss = b; this.enemies.push(b); break; }
      case 'k': this.enemies.push(this.makeEnemy('knight', cx, cy)); break;
      default: break;
    }
  }

  // damage bonus for the weapon in hand: the Mighty Gem secret plus shop levels for that weapon
  get dmgBonus() { return (this.upgrades.gem ? 1 : 0) + (this.upgrades.gem2 ? 1 : 0) + lvl(this.save, this.itemName.toLowerCase()); }
  get superRate() { return (this.upgrades.charge ? 2 : 1) * (lvl(this.save, 'super') ? 1.5 : 1); }
  get magnetR() { return this.petPower === 'magnet' ? (this.upgrades.magnet ? 140 : 96) : (this.upgrades.magnet ? 72 : 40); }

  makePlayer(x, y) {
    const up = this.upgrades;
    const maxHp = (this.assist ? 12 : 8) + ['heart1', 'heart2', 'heart3', 'heart4', 'heart5', 'heart6', 'heart7', 'heart8', 'heart9', 'heart10'].filter((h) => up[h]).length * 2 + lvl(this.save, 'hearts') * 2;
    return { x, y, z: 0, vz: 0, vx: 0, vy: 0, dir: 0, aimX: 1, aimY: 0, walk: 0, hp: maxHp, maxHp, inv: 0, atk: null, cd: 0, special: up.quick ? 100 : 0, fall: 0, safe: { x, y }, knx: 0, kny: 0, trail: [], revive: true };
  }

  makeEnemy(type, x, y) {
    const base = {
      slime: { hp: 2, frames: 'ink_slime', r: 6, speed: 34, dmg: 1 },
      scarab: { hp: 2, frames: 'moss_scarab', r: 6, speed: 22, dmg: 1 },
      wolf: { hp: 3, frames: 'briar_wolf', r: 8, speed: 46, dmg: 1 },
      golem: { hp: 3, frames: 'tome_golem', r: 9, speed: 16, dmg: 1, shell: true },
      alpha: { hp: 16, frames: 'briar_alpha', r: 16, speed: 52, dmg: 2, scale: 2, boss: true, bossName: 'Briar Alpha' },
      mite: { hp: 1, frames: 'bookmite', r: 6, speed: 40, dmg: 1 },
      page: { hp: 1, frames: 'lost_page', r: 6, speed: 42, dmg: 1, fly: true },
      imp: { hp: 2, frames: 'mirror_imp', r: 7, speed: 44, dmg: 1 },
      knight: { hp: 3, frames: 'mirror_knight', r: 8, speed: 36, dmg: 1 },
      cinder: { hp: 2, frames: 'cinderling', r: 6, speed: 40, dmg: 1 },
      bat: { hp: 1, frames: 'ash_bat', r: 6, speed: 48, dmg: 1, fly: true },
      coil: { hp: 4, frames: 'furnace_coil', r: 9, speed: 0, dmg: 1, still: true },
      warden: { hp: 32, frames: 'cinder_warden', r: 16, speed: 30, dmg: 2, boss: true, bossName: 'The Cinder Warden', tall: true },
      king: { hp: 30, frames: 'nameless_king', r: 14, speed: 55, dmg: 2, boss: true, bossName: 'The Nameless King', tall: true },
      archivore: { hp: 26, frames: 'archivore', r: 18, speed: 46, dmg: 2, boss: true, bossName: 'The Archivore', fly: true },
    }[type];
    return { type, x, y, z: 0, vz: 0, hx: x, hy: y, vx: 0, vy: 0, state: 'idle', t: rnd(0.2, 1.2), flash: 0, face: -1, knx: 0, kny: 0, stun: 0, maxHp: base.hp, ...base };
  }

  // ------------------------------------------------------------------ helpers
  solidAt(px, py, air) {
    const tx = Math.floor(px / T), ty = Math.floor(py / T);
    const c = this.map.collAt(tx, ty);
    if (c === 'solid') return true;
    if (c === 'water' && !air) return true;
    return false;
  }
  boxBlocked(x, y, air, hw = 5, hh = 3) {
    return this.solidAt(x - hw, y - hh, air) || this.solidAt(x + hw, y - hh, air) || this.solidAt(x - hw, y + hh, air) || this.solidAt(x + hw, y + hh, air);
  }
  moveActor(a, dx, dy, air = false, hw = 5, hh = 3) {
    // never trap an actor that is already overlapping something solid: let it walk out
    if (this.boxBlocked(a.x, a.y, air, hw, hh)) { a.x += dx; a.y += dy; return false; }
    let hitX = false, hitY = false;
    if (dx) { if (!this.boxBlocked(a.x + dx, a.y, air, hw, hh)) a.x += dx; else hitX = true; }
    if (dy) { if (!this.boxBlocked(a.x, a.y + dy, air, hw, hh)) a.y += dy; else hitY = true; }
    // corner slide (player only): walking into a narrow opening a little off-centre nudges you into it
    if (a === this.player && (hitX || hitY) && !(dx && dy && hitX && hitY)) {
      const step = Math.max(Math.abs(dx), Math.abs(dy));
      for (let off = 1; off <= 7; off++) {
        for (const sgn of [1, -1]) {
          if (hitY && dy && !dx && !this.boxBlocked(a.x + sgn * off, a.y + dy, air, hw, hh) && !this.boxBlocked(a.x + sgn * Math.min(off, step), a.y, air, hw, hh)) { a.x += sgn * Math.min(off, step); return true; }
          if (hitX && dx && !dy && !this.boxBlocked(a.x + dx, a.y + sgn * off, air, hw, hh) && !this.boxBlocked(a.x, a.y + sgn * Math.min(off, step), air, hw, hh)) { a.y += sgn * Math.min(off, step); return true; }
        }
      }
    }
    return hitX || hitY;
  }
  groundAt(x, y) { return this.map.collAt(Math.floor(x / T), Math.floor(y / T)); }
  onPlatform(x, y) {
    return this.platforms.find((p) => x >= p.x - 6 && x <= p.x + p.w + 6 && y >= p.y - 5 && y <= p.y + p.h + 6);
  }
  // Wiggle room: you only drop when every foot point is over a hole, so standing near an edge is safe.
  footHole(x, y) {
    const pts = [[0, 0], [-5, 0], [5, 0], [0, -4], [0, 4], [-4, -3], [4, -3], [-4, 3], [4, 3]];
    let hole = null;
    for (const [dx, dy] of pts) {
      const g = this.groundAt(x + dx, y + dy);
      if (g !== 'pit' && g !== 'water') return null;
      if (!hole) hole = g;
    }
    return hole;
  }
  particles(x, y, color, n = 6, spd = 60, z = 6) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, s = rnd(spd * 0.4, spd);
      this.fx.push({ kind: 'dot', x, y, z, vx: Math.cos(a) * s, vy: Math.sin(a) * s * 0.6, vz: rnd(30, 90), life: rnd(0.3, 0.6), color });
    }
  }
  popText(x, y, text, color = '#fff') { this.fx = this.fx.filter((f) => !(f.kind === 'text' && Math.abs(f.x - x) < 40 && Math.abs(f.y - y) < 30)); this.fx.push({ kind: 'text', x, y, z: 14, text, color, life: 0.9, vz: 26 }); }

  get itemName() { return ITEMS[this.item]; }

  /** Equip weapon slot i (0-based) if it has been found. Returns true on change. */
  equip(i) {
    if (i === this.item || !this.weapons[ITEMS[i]] || !this.player) return false;
    this.item = i;
    this.save.hero.item = ITEMS[i];
    const p = this.player;
    sfx('cursor'); this.popText(p.x, p.y - 26, this.itemName.toUpperCase(), '#f9d77a');
    this.hooks.hud();
    return true;
  }

  // ------------------------------------------------------------------ update
  update(dt) {
    if (this.done) { this.time += dt; this.updateFx(dt); return; }
    if (this.hitstop > 0) { this.hitstop -= dt; return; }
    this.time += dt; this.clock += dt;
    this.shake = Math.max(0, this.shake - dt * 30);
    this.updatePlatforms(dt);
    this.updatePlayer(dt);
    this.updateBuddyPet(dt);
    for (const e of this.enemies) this.updateEnemy(e, dt);
    this.enemies = this.enemies.filter((e) => !e.dead);
    this.updateShots(dt);
    this.updateHazards(dt);
    this.updateCrumbles(dt);
    this.updatePuzzles(dt);
    this.updateRival(dt);
    if (this.L.waves) this.updateWaves(dt);
    this.updatePickups(dt);
    this.updateFx(dt);
    this.updateTriggers();
  }

  updatePlatforms(dt) {
    for (const p of this.platforms) {
      const s = (1 - Math.cos(this.time * Math.PI * 2 / p.period)) / 2;
      if (p.axis === 'y') { const ny = p.y0 + (p.y1 - p.y0) * s; p.dy = ny - p.y; p.y = ny; p.dx = 0; }
      else { const nx = p.x0 + (p.x1 - p.x0) * s; p.dx = nx - p.x; p.x = nx; p.dy = 0; }
    }
  }

  updatePlayer(dt) {
    const p = this.player;
    p.inv = Math.max(0, p.inv - dt);
    p.cd = Math.max(0, p.cd - dt);
    p.special = Math.min(100, p.special + dt * 4 * this.superRate);
    if (p.fall > 0) {
      p.fall -= dt;
      if (p.fall <= 0) {
        p.x = p.safe.x; p.y = p.safe.y; p.z = 0; p.vz = 0; p.inv = 1.2;
        if (!(p.lavaFall && this.upgrades.frost)) this.damagePlayer(1, null, true);
      }
      return;
    }
    // swap item
    if (input.pressed.swap) {
      for (let k = 1; k < ITEMS.length; k++) { const i = (this.item + k) % ITEMS.length; if (this.weapons[ITEMS[i]]) { this.equip(i); break; } }
    }
    ITEMS.forEach((_, i) => { if (input.pressed['w' + (i + 1)]) this.equip(i); });
    // grapple zip: fly to the hook post, over lava and gaps
    if (p.zip) {
      const z = p.zip, dx = z.x - p.x, dy = z.y - p.y, d = Math.hypot(dx, dy);
      const step = 300 * dt;
      p.z = Math.max(p.z, 8); p.atk = null;
      if (d <= step) { p.x = z.x; p.y = z.y; p.zip = null; p.vz = 40; sfx('land', 0.5); }
      else { p.x += dx / d * step; p.y += dy / d * step; }
      return;
    }
    // movement
    const air = p.z > 0.5;
    let mx = input.x, my = input.y;
    const busy = p.atk && p.atk.lock;
    const speed = busy ? 22 : (this.upgrades.swift ? 94 : 80);
    if (Math.hypot(mx, my) > 0.1) {
      p.aimX = mx; p.aimY = my;
      const n = Math.hypot(mx, my); p.aimX /= n; p.aimY /= n;
      if (!busy) {
        if (Math.abs(mx) > Math.abs(my) * 1.05) p.dir = mx < 0 ? 1 : 2; else p.dir = my < 0 ? 3 : 0;
      }
      p.walk += dt * (6 + 4 * Math.hypot(mx, my));
    } else p.walk = 0;
    p.vx = mx * speed + p.knx; p.vy = my * speed + p.kny;
    p.knx *= Math.pow(0.001, dt); p.kny *= Math.pow(0.001, dt);
    // carried by platform
    const plat = !air ? this.onPlatform(p.x, p.y) : null;
    if (plat) { p.x += plat.dx; p.y += plat.dy || 0; }
    const blockedMove = this.moveActor(p, p.vx * dt, p.vy * dt, air);
    this.tryPush(mx, my, blockedMove, dt);
    // jump
    if (input.pressed.jump && !air) {
      p.vz = this.upgrades.boots ? 178 : 150; p.z = 0.6; sfx('jump', 0.7);
    }
    if (p.z > 0 || p.vz > 0) {
      p.vz -= 600 * dt; p.z += p.vz * dt;
      if (p.z <= 0) { p.z = 0; p.vz = 0; sfx('land', 0.35); this.particles(p.x, p.y, '#cfb89c', 4, 30, 0); }
    }
    // ground checks
    if (p.z === 0) {
      const g = this.footHole(p.x, p.y);
      const onPlat = this.onPlatform(p.x, p.y);
      p.edge = (!onPlat && g) ? (p.edge || 0) + dt : 0;   // short grace time before the drop
      if (!onPlat && g && p.edge > 0.04) {
        p.fall = 0.55; p.atk = null;
        sfx('fall', 0.8);
        if (g === 'water') this.particles(p.x, p.y, '#7ac3ef', 10, 70, 2);
        p.lavaFall = this.map.terrainAt(Math.floor(p.x / T), Math.floor(p.y / T)) === 'lava';
        if (p.lavaFall) { this.particles(p.x, p.y, '#ff7a1a', 14, 80, 2); sfx('fire', 0.8); }
        return;
      }
      // remember a safe spot: the centre of the last solid, non-crumbling tile we stood on
      const tx = Math.floor(p.x / T), ty = Math.floor(p.y / T);
      if (!onPlat && !this.crumbles.has(tx + ',' + ty) && this.map.collAt(tx, ty) === 'none') p.safe = { x: tx * T + 8, y: ty * T + 9 };
    }
    // attacks
    if (p.atk) {
      p.atk.t += dt;
      this.runAttack(p.atk, dt);
      if (p.atk.t >= p.atk.dur) p.atk = null;
    } else if (input.pressed.special && p.special >= 100) {
      this.startSpecial();
    } else if ((input.pressed.attack || (input.held.attack && this.itemName === 'Staff')) && p.cd <= 0) {
      this.startAttack();
    }
    // trail for buddy
    p.trail.push({ x: p.x, y: p.y });
    if (p.trail.length > 40) p.trail.shift();
  }

  startAttack() {
    const p = this.player, it = this.itemName;
    const ax = p.aimX, ay = p.aimY;
    if (it === 'Sword') { p.atk = { kind: 'sword', t: 0, dur: 0.26, ax, ay, hit: new Set() }; p.cd = 0.3; sfx(Math.random() < 0.5 ? 'sword_slash_1' : 'sword_slash_2', 0.7); }
    if (it === 'Staff') {
      p.cd = 0.34; sfx('staff_hit_1', 0.5, 1.4);
      const spread = this.upgrades.twin ? [-0.14, 0.14] : [0];
      for (const off of spread) {
        const a = Math.atan2(ay, ax) + off;
        this.shots.push({ kind: 'spark', x: p.x + ax * 8, y: p.y + ay * 6, z: 9, vx: Math.cos(a) * 175, vy: Math.sin(a) * 175, life: 0.6, dmg: 1 + this.dmgBonus, friendly: true });
      }
      p.atk = { kind: 'staff', t: 0, dur: 0.15, ax, ay };
    }
    if (it === 'Hammer') { p.atk = { kind: 'hammer', t: 0, dur: 0.5, ax, ay, lock: true, hit: new Set(), smashed: false }; p.cd = 0.6; sfx('hammer_charge', 0.5); }
    if (it === 'Hook') {
      if (this.shots.some((s) => s.kind === 'hook')) return;
      const post = this.hookTarget(ax, ay);
      p.cd = 0.35; p.atk = { kind: 'throw', t: 0, dur: 0.2, ax, ay };
      sfx('sword_slash_1', 0.5, 0.8);
      if (post) {
        const px = post.tx * T + 8, py = post.ty * T + 8, d = Math.hypot(px - p.x, py - p.y) || 1;
        const ux = (px - p.x) / d, uy = (py - p.y) / d;
        this.shots.push({ kind: 'hook', x: p.x, y: p.y - 6, z: 9, vx: ux * 360, vy: uy * 360, life: d / 360 + 0.05, post, land: { x: px - ux * 15, y: py - uy * 13 + 1 }, friendly: true, hit: new Set() });
      } else {
        this.shots.push({ kind: 'hook', x: p.x + ax * 8, y: p.y - 6 + ay * 6, z: 9, vx: ax * 300, vy: ay * 300, life: (this.upgrades.hookplus ? 150 : 100) / 300, friendly: true, hit: new Set() });
      }
      return;
    }
    if (it === 'Boomerang') {
      if (this.shots.some((s) => s.kind === 'rang')) return;   // one in the air at a time
      this.throwRang(ax, ay, false); p.cd = 0.2;
      p.atk = { kind: 'throw', t: 0, dur: 0.18, ax, ay };
    }
  }

  /** The hook post the player is aiming roughly at, if one is in reach with a clear line. */
  hookTarget(ax, ay) {
    const p = this.player, reach = this.upgrades.hookplus ? 9.5 * T : 7.5 * T;
    let best = null, bestScore = 1e9;
    for (const q of this.posts) {
      const px = q.tx * T + 8, py = q.ty * T + 8, dx = px - p.x, dy = py - p.y, d = Math.hypot(dx, dy);
      if (d > reach || d < 18) continue;
      const ang = Math.acos(clamp((dx * ax + dy * ay) / d, -1, 1));
      if (ang > 0.75) continue;
      let clear = true;
      for (let k = 1; k < 20 && clear; k++) {
        const sx = p.x + dx * k / 20, sy = p.y + dy * k / 20, tx = Math.floor(sx / T), ty = Math.floor(sy / T);
        if ((tx !== q.tx || ty !== q.ty) && this.map.collAt(tx, ty) === 'solid' && !this.posts.some((o) => o.tx === tx && o.ty === ty)) clear = false;
      }
      if (!clear) continue;
      const score = d + ang * 120;
      if (score < bestScore) { bestScore = score; best = q; }
    }
    return best;
  }

  updateHook(s, dt) {
    const p = this.player;
    s.life -= dt; s.x += s.vx * dt; s.y += s.vy * dt;
    if (s.post) {
      if (s.life <= 0) { p.zip = { x: s.land.x, y: s.land.y }; p.z = Math.max(p.z, 1); sfx('switch_on', 0.6, 0.7); this.particles(s.x, s.y, '#ffd84a', 6, 50, 9); }
      return;
    }
    // no post: it tugs the first enemy it meets toward you, and grabs pickups
    for (const e of this.enemies) {
      if (e.dead || e.sleeping || s.hit.has(e) || e.boss) continue;
      if (Math.hypot(e.x - s.x, (e.y - 6) - s.y) < e.r + 6) {
        s.hit.add(e);
        const d = dist(e, p) || 1;
        this.hitEnemy(e, 1 + this.dmgBonus, -(e.x - p.x) / d, -(e.y - p.y) / d, e.still ? 0 : 180);
        e.stun = Math.max(e.stun, 0.8); s.life = 0;
        this.popText(e.x, e.y - 22, 'YOINK!', '#ffd84a');
      }
    }
    for (const k of this.pickups) if (!k.got && Math.hypot(k.x - s.x, k.y - s.y) < 11) this.collect(k);
    if (this.map.collAt(Math.floor(s.x / T), Math.floor(s.y / T)) === 'solid') { this.hitSwitches(s.x, s.y, 8, 'hook'); s.life = 0; }
  }

  throwRang(ax, ay, big) {
    const p = this.player;
    this.shots.push({ kind: 'rang', x: p.x + ax * 8, y: p.y - 6 + ay * 6, z: 9, vx: ax * 210, vy: ay * 210, out: true, dist: 0,
      max: this.upgrades.rangplus ? 160 : 112, life: 4, dmg: (big ? 2 : 1) + this.dmgBonus, friendly: true, hit: new Set(), big });
    sfx('sword_slash_2', 0.5, 1.5);
  }

  updateRang(s, dt) {
    const p = this.player;
    s.life -= dt;
    if (s.out) {
      s.x += s.vx * dt; s.y += s.vy * dt; s.dist += Math.hypot(s.vx, s.vy) * dt;
      const tx = Math.floor(s.x / T), ty = Math.floor(s.y / T);
      if (this.map.collAt(tx, ty) === 'solid') {
        this.hitSwitches(s.x, s.y, 8, 'rang'); this.hitBreakables(s.x, s.y, 6, false);
        this.particles(s.x, s.y, '#ffd84a', 4, 40, s.z); sfx('miss', 0.4, 1.6);
        s.out = false;
      } else if (s.dist >= s.max) s.out = false;
    } else {
      const dx = p.x - s.x, dy = (p.y - 6) - s.y, d = Math.hypot(dx, dy) || 1;
      s.x += dx / d * 250 * dt; s.y += dy / d * 250 * dt;
      if (d < 10) s.life = 0;
    }
    if (s.life <= 0) return;
    this.hitSwitches(s.x, s.y, 3, 'rang');
    this.hitBreakables(s.x, s.y, 2, false);
    for (const e of this.enemies) {
      if (e.dead || e.sleeping || s.hit.has(e)) continue;
      if (Math.hypot(e.x - s.x, (e.y - 6) - s.y) < e.r + 6) {
        s.hit.add(e);
        const n = Math.hypot(s.vx, s.vy) || 1;
        this.hitEnemy(e, s.dmg, s.vx / n, s.vy / n, 60);
        if (!e.boss) e.stun = Math.max(e.stun, 0.9);
      }
    }
    // it scoops up coins, hearts and letters on the way
    for (const k of this.pickups) if (!k.got && Math.hypot(k.x - s.x, k.y - s.y) < 11) this.collect(k);
  }

  startSpecial() {
    const p = this.player, it = this.itemName;
    p.special = 0; this.hooks.hud();
    sfx('fury_ready', 0.8);
    if (it === 'Sword') p.atk = { kind: 'spin', t: 0, dur: 0.45, hit: new Set() };
    if (it === 'Staff') {
      for (let i = 0; i < 12; i++) {
        const a = i / 12 * Math.PI * 2;
        this.shots.push({ kind: 'spark', x: p.x, y: p.y, z: 9, vx: Math.cos(a) * 150, vy: Math.sin(a) * 150, life: 0.7, dmg: 2 + this.dmgBonus, friendly: true, big: true });
      }
      p.atk = { kind: 'burst', t: 0, dur: 0.3 };
    }
    if (it === 'Hammer') p.atk = { kind: 'quake', t: 0, dur: 0.55, lock: true, hit: new Set(), smashed: false };
    if (it === 'Boomerang') {
      this.shots = this.shots.filter((x) => x.kind !== 'rang');
      const a = Math.atan2(p.aimY, p.aimX);
      for (const off of [-0.5, 0, 0.5]) this.throwRang(Math.cos(a + off), Math.sin(a + off), true);
      p.atk = { kind: 'throw', t: 0, dur: 0.3 };
    }
  }

  runAttack(a, dt) {
    const p = this.player;
    const hitArc = (range, cone, dmg, knock, opts = {}) => {
      for (const e of this.enemies) {
        if (a.hit.has(e) || e.dead || e.sleeping) continue;
        const dx = e.x - p.x, dy = (e.y - (e.scale ? 10 : 4)) - (p.y - 6);
        const d = Math.hypot(dx, dy);
        if (d > range + e.r) continue;
        if (cone < Math.PI) {
          const ang = Math.acos(clamp((dx * a.ax + dy * a.ay) / (d || 1), -1, 1));
          if (ang > cone && d > e.r) continue;
        }
        a.hit.add(e);
        this.hitEnemy(e, dmg, dx / (d || 1), dy / (d || 1), knock, opts);
      }
      this.hitBreakables(p.x + (a.ax || 0) * range * 0.6, p.y + (a.ay || 0) * range * 0.6, cone < Math.PI ? range * 0.8 : range, false);
      this.hitSwitches(p.x + (a.ax || 0) * range * 0.6, p.y + (a.ay || 0) * range * 0.6, range, 'melee');
    };
    if (a.kind === 'sword' && a.t > 0.04 && a.t < 0.18) hitArc(20, 1.25, 1 + this.dmgBonus, 140);
    if (a.kind === 'spin' && a.t < 0.4) hitArc(30, Math.PI, 2 + this.dmgBonus, 180);
    if (a.kind === 'hammer' && !a.smashed && a.t > 0.2) {
      a.smashed = true;
      const hx = p.x + a.ax * 16, hy = p.y + a.ay * 12;
      this.shake = 4; sfx('hit_heavy_1', 0.8);
      this.fx.push({ kind: 'ring', x: hx, y: hy, r: 4, max: 22, life: 0.3, color: '#f9d77a' });
      this.particles(hx, hy, '#cfb89c', 8, 70, 0);
      for (const e of this.enemies) {
        if (e.dead || e.sleeping) continue;
        const d = Math.hypot(e.x - hx, e.y - hy);
        if (d < 20 + e.r) this.hitEnemy(e, 2 + this.dmgBonus, (e.x - p.x) / (dist(e, p) || 1), (e.y - p.y) / (dist(e, p) || 1), 220, { hammer: true });
      }
      this.hitBreakables(hx, hy, 18, true);
    }
    if (a.kind === 'quake' && !a.smashed && a.t > 0.25) {
      a.smashed = true; this.shake = 9; sfx('hit_heavy_1', 1, 0.7);
      this.fx.push({ kind: 'ring', x: p.x, y: p.y, r: 6, max: 50, life: 0.45, color: '#f9d77a' });
      this.particles(p.x, p.y, '#cfb89c', 16, 100, 0);
      for (const e of this.enemies) {
        if (e.dead || e.sleeping) continue;
        const d = dist(e, p);
        if (d < 48 + e.r) { this.hitEnemy(e, 2 + this.dmgBonus, (e.x - p.x) / (d || 1), (e.y - p.y) / (d || 1), 200, { hammer: true }); e.stun = Math.max(e.stun, 1.5); }
      }
      this.hitBreakables(p.x, p.y, 44, true);
    }
  }

  hitBreakables(x, y, r, hammer = false) {
    for (const o of this.props) {
      if (!(o.cut || o.breakable) || o.gone) continue;
      const ox = o.tx * T + 8, oy = o.ty * T + 8;
      if (Math.hypot(ox - x, oy - y) < r + 8) {
        if (o.hammerOnly && !hammer) {
          if (!(o.tink > this.time)) {
            o.tink = this.time + 0.6; sfx('miss', 0.7, 1.3);
            this.popText(ox, oy - 18, this.weapons.Hammer ? 'USE HAMMER!' : 'NEED A HAMMER', '#eba14d');
            if (!this.weapons.Hammer && !this.hintsShown.has('needHammer')) { this.hintsShown.add('needHammer'); this.hooks.hint('Cracked! You need a Hammer. You can find one later, then come back.', 'mira'); }
          }
          continue;
        }
        if (o.hammerOnly) { this.shake = 6; sfx('break', 0.9); this.particles(ox, oy + 4, '#9aa0b0', 18, 90, 8); }
        o.gone = true; this.map.setColl(o.tx, o.ty, 'none');
        sfx(o.cut ? 'axe_chop_1' : 'pot_break', 0.6);
        this.particles(ox, oy + 4, o.cut ? '#62a845' : '#b0702a', 8, 60, 6);
        const roll = Math.random();
        if (roll < 0.45) this.pickups.push({ kind: 'coin', x: ox, y: oy + 4, z: 6, vz: 60, bob: 0 });
        else if (roll < 0.62 && this.player.hp < this.player.maxHp) this.pickups.push({ kind: 'heart', x: ox, y: oy + 4, z: 6, vz: 60, bob: 0 });
      }
    }
  }

  hitEnemy(e, dmg, nx, ny, knock, opts = {}) {
    if (e.dead) return;
    if (e.ward) {
      if (!(e.tink > this.time)) { e.tink = this.time + 0.5; sfx('miss', 0.7, 1.6); this.popText(e.x, e.y - 50, 'BEAT HIS KNIGHTS!', '#dfe8ff'); }
      return;
    }
    if (e.shell && !opts.hammer) {
      // no hammer yet? chip the shell away: three hits crack it. The Hammer cracks it in one.
      e.chips = (e.chips || 0) + 1;
      this.fx.push({ kind: 'spark', x: e.x - nx * 6, y: e.y - 6, life: 0.15 });
      if (e.chips < 3) {
        sfx('miss', 0.7, 1.3); e.flash = 0.1;
        this.popText(e.x, e.y - 26, e.chips === 1 ? 'CHIP!' : 'CHIP! CHIP!', '#eba14d');
        e.knx = nx * knock * 0.5; e.kny = ny * knock * 0.5;
        return;
      }
      opts = { ...opts, hammer: true };
    }
    if (e.shell && opts.hammer) {
      e.shell = false; e.stun = 2.2; sfx('break', 0.9);
      this.popText(e.x, e.y - 28, 'CRACK!', '#f9d77a');
      this.particles(e.x, e.y - 6, '#b3b6c4', 14, 90, 8);
      dmg = 1;
    }
    if (e.boss && e.state !== 'dizzy' && e.state !== 'rest') dmg = Math.max(1, Math.floor(dmg / 2));
    e.hp -= dmg; e.flash = 0.14;
    this.player.special = Math.min(100, this.player.special + 9 * Math.min(2, this.superRate * 0.85));
    this.hooks.hud();
    e.knx = nx * knock * (e.boss ? 0.25 : 1); e.kny = ny * knock * (e.boss ? 0.25 : 1);
    this.hitstop = 0.05;
    sfx(dmg >= 2 ? 'hit_heavy_1' : (Math.random() < 0.5 ? 'hit_light_1' : 'hit_light_2'), 0.7);
    this.particles(e.x, e.y - 6, '#fff', 5, 60, 8);
    if (e.boss) this.hooks.bossBar(Math.max(0, e.hp) / e.maxHp, true);
    if (e.hp <= 0) this.killEnemy(e);
    else if (e.state === 'windup' && !e.boss) { e.state = 'idle'; e.t = 0.6; }
  }

  killEnemy(e) {
    e.dead = true;
    sfx(e.boss ? 'boss_die' : 'enemy_die', 0.8);
    this.particles(e.x, e.y - 6, '#9a6ad0', e.boss ? 30 : 10, e.boss ? 120 : 70, 8);
    this.fx.push({ kind: 'poof', x: e.x, y: e.y, life: 0.35 });
    const n = e.boss ? 10 : (e.type === 'golem' ? 4 : 2);
    for (let i = 0; i < n; i++) this.pickups.push({ kind: 'coin', x: e.x + rnd(-6, 6), y: e.y + rnd(-4, 4), z: 4, vz: rnd(50, 110), vx: rnd(-40, 40), vy: rnd(-30, 30), bob: 0 });
    if (Math.random() < 0.3 && !e.boss) this.pickups.push({ kind: 'heart', x: e.x, y: e.y, z: 4, vz: 80, bob: 0 });
    if (e.boss && !this.L.waves) this.bossDefeated();
    else if (e.boss) this.hooks.bossBar(0, false);
  }

  bossDefeated() {
    this.hooks.bossBar(0, false);
    this.shake = 10;
    for (const g of this.bossGate) { g.gone = true; this.map.setColl(g.tx, g.ty, 'none'); }
    for (const e of this.enemies) if (!e.dead) { e.dead = true; this.particles(e.x, e.y, '#9a6ad0', 6); }
    if (this.goal) { this.goal.hidden = false; this.particles(this.goal.gx, this.goal.gy, '#f9d77a', 24, 100, 10); }
    setTimeout(() => this.hooks.hint(this.L.id === 'boss' ? 'You beat the Archivore! Open the chest!' : this.L.id === 'king' ? 'The King is free! Open the chest!' : this.L.id === 'warden' ? 'The Warden cooled down! Open the chest!' : 'You did it! Ring the bell!', 'mira'), 600);
    for (const em of this.emitters) if (em.boss) em.active = false;
    for (const v of this.vents) if (v.boss) v.active = false;
    music(this.L.music === 'boss' ? 'archive' : this.L.music);
  }

  damagePlayer(n, from, fallDmg = false) {
    const p = this.player;
    if (!fallDmg && (p.inv > 0 || p.z > 4)) return;
    if (!fallDmg && this.petPower === 'shield' && this.petShield.ready) {
      this.petShield.ready = false; this.petShield.t = 10; p.inv = 0.9;
      sfx('crit', 0.7, 1.3); this.shake = 2;
      this.fx.push({ kind: 'ring', x: p.x, y: p.y, r: 4, max: 26, life: 0.35, color: '#7ad0ff' });
      this.popText(p.x, p.y - 30, 'BLOCKED!', '#7ad0ff');
      if (from) { const d = dist(from, p) || 1; p.knx = (p.x - from.x) / d * 90; p.kny = (p.y - from.y) / d * 90; }
      return;
    }
    p.hp -= n; p.inv = 1.1;
    this.hooks.hud();
    sfx('hit_heavy_1', 0.6, 1.2);
    this.shake = 4;
    if (from) { const d = dist(from, p) || 1; p.knx = (p.x - from.x) / d * 170; p.kny = (p.y - from.y) / d * 170; }
    if (p.hp <= 0) this.playerDown();
  }

  playerDown() {
    const p = this.player;
    if (p.revive) {
      p.revive = false; p.hp = Math.ceil(p.maxHp / 2); p.inv = 2;
      sfx('revive', 0.9);
      this.particles(p.x, p.y, '#7ac3ef', 20, 80, 10);
      this.hooks.hint("I've got you!", 'mira');
    } else if (this.L.waves) {
      p.hp = 0; this.endArena(false); return;
    } else {
      const cp = this.lastCheckpoint || this.spawnPt;
      p.x = cp.x; p.y = cp.y; p.hp = p.maxHp; p.inv = 2; p.knx = p.kny = 0; p.atk = null;
      p.safe = { x: cp.x, y: cp.y };
      sfx('revive', 0.7, 0.8);
      this.hooks.hint('Try again from the lantern!', 'mira');
    }
    this.hooks.hud();
  }

  // ------------------------------------------------------------------ enemies
  updateEnemy(e, dt) {
    const p = this.player;
    e.flash = Math.max(0, e.flash - dt);
    e.t -= dt;
    if (e.sleeping) {
      if (p.x > this.arena.wake * T) this.wakeBoss(e);
      return;
    }
    const sp = this.assist ? 0.75 : 1;
    // knockback
    if (!e.still && Math.abs(e.knx) + Math.abs(e.kny) > 2) {
      this.moveActor(e, e.knx * dt, e.kny * dt, false, Math.min(6, e.r), 3);
      e.knx *= Math.pow(0.002, dt); e.kny *= Math.pow(0.002, dt);
    }
    if (e.stun > 0) { e.stun -= dt; return; }
    const dx = p.x - e.x, dy = p.y - e.y, d = Math.hypot(dx, dy) || 1;
    const near = d < 120;
    if (!e.fly && (e.z > 0 || e.vz)) { e.vz -= 500 * dt; e.z += e.vz * dt; if (e.z <= 0) { e.z = 0; e.vz = 0; } }
    const move = (vx, vy) => { const hit = this.moveActor(e, vx * dt * sp, vy * dt * sp, false, Math.min(6, e.r), 3); if (vx) e.face = vx < 0 ? -1 : 1; return hit; };
    switch (e.type) {
      case 'slime':
        if (e.state === 'hop') { move(e.vx, e.vy); if (e.t <= 0) { e.state = 'idle'; e.t = rnd(0.7, 1.2); } }
        else if (e.t <= 0) {
          if (near) { e.vx = dx / d * 70; e.vy = dy / d * 70; } else { const a = Math.random() * 6.28; e.vx = Math.cos(a) * 30; e.vy = Math.sin(a) * 30; }
          e.state = 'hop'; e.t = 0.35; e.vz = 90; e.z = 0.5;
        }
        break;
      case 'scarab':
        if (e.state === 'idle') {
          if (e.t <= 0) { const a = Math.random() * 6.28; e.vx = Math.cos(a) * e.speed; e.vy = Math.sin(a) * e.speed; e.t = rnd(0.8, 1.6); }
          move(e.vx, e.vy);
          if (d < 85 && e.t < 0.5) { e.state = 'windup'; e.t = 0.65; e.cx = dx / d; e.cy = dy / d; e.face = dx < 0 ? -1 : 1; sfx('telegraph', 0.5); }
        } else if (e.state === 'windup') {
          if (e.t <= 0) { e.state = 'charge'; e.t = 0.6; }
        } else if (e.state === 'charge') {
          if (move(e.cx * 150, e.cy * 150)) { e.state = 'idle'; e.stun = 0.8; this.particles(e.x, e.y, '#cfb89c', 6); sfx('stun', 0.5); }
          if (e.t <= 0) { e.state = 'idle'; e.t = 1.2; }
        }
        break;
      case 'wolf':
        if (e.state === 'idle') {
          if (near) {
            const ang = Math.atan2(e.y - p.y, e.x - p.x) + dt * 0.9;
            const tx = p.x + Math.cos(ang) * 52, ty = p.y + Math.sin(ang) * 40;
            const mx = tx - e.x, my = ty - e.y, md = Math.hypot(mx, my) || 1;
            move(mx / md * e.speed, my / md * e.speed);
            e.face = dx < 0 ? -1 : 1;
            if (e.t <= 0) { e.state = 'windup'; e.t = 0.55; e.cx = dx / d; e.cy = dy / d; sfx('telegraph', 0.5); }
          } else if (e.t <= 0) { e.t = 1; }
        } else if (e.state === 'windup') { if (e.t <= 0) { e.state = 'charge'; e.t = 0.38; } }
        else if (e.state === 'charge') {
          if (move(e.cx * 175, e.cy * 175) || e.t <= 0) { e.state = 'idle'; e.t = rnd(1.4, 2.2); }
        }
        break;
      case 'golem':
        if (near) move(dx / d * e.speed, dy / d * e.speed);
        break;
      case 'alpha': this.updateBoss(e, dt, dx, dy, d, move); break;
      case 'mite':
        if (e.state === 'hop') { move(e.vx, e.vy); if (e.t <= 0) { e.state = 'idle'; e.t = rnd(0.4, 0.8); } }
        else if (e.t <= 0) { if (near) { e.vx = dx / d * 85; e.vy = dy / d * 85; } else { const a = Math.random() * 6.28; e.vx = Math.cos(a) * 30; e.vy = Math.sin(a) * 30; } e.state = 'hop'; e.t = 0.25; e.vz = 60; e.z = 0.5; }
        break;
      case 'page':
        e.z = 12 + Math.sin(this.time * 4 + e.hx) * 3;
        e.x += (dx / d) * e.speed * dt * sp; e.y += (dy / d) * e.speed * dt * sp; e.face = dx < 0 ? -1 : 1;
        break;
      case 'archivore': this.updateArchivore(e, dt, dx, dy, d, move); break;
      case 'cinder':
        // Cinderling: a hot little hopper, faster than a slime
        if (e.state === 'hop') { move(e.vx, e.vy); if (e.t <= 0) { e.state = 'idle'; e.t = rnd(0.5, 0.9); } }
        else if (e.t <= 0) {
          if (near) { e.vx = dx / d * 85; e.vy = dy / d * 85; } else { const a = Math.random() * 6.28; e.vx = Math.cos(a) * 30; e.vy = Math.sin(a) * 30; }
          e.state = 'hop'; e.t = 0.32; e.vz = 100; e.z = 0.5;
        }
        break;
      case 'bat':
        // Ash Bat: swoops in a wobbly line, high enough to fly over lava
        e.z = 14 + Math.sin(this.time * 6 + e.hx) * 4;
        if (near) { const w = Math.sin(this.time * 3 + e.hx) * 0.7; e.x += (dx / d + -dy / d * w) * e.speed * dt * sp; e.y += (dy / d + dx / d * w) * e.speed * dt * sp; e.face = dx < 0 ? -1 : 1; }
        break;
      case 'coil':
        // Furnace Coil: stands still and lobs fireballs
        e.face = dx < 0 ? -1 : 1;
        if (near && e.t <= 0) {
          e.t = this.boss && this.boss.phase2 ? 1.8 : 2.6;
          const a = Math.atan2(dy, dx);
          this.shots.push({ kind: 'fire', x: e.x, y: e.y - 8, z: 12, vx: Math.cos(a) * 80, vy: Math.sin(a) * 80, life: 2.4, dmg: 1, friendly: false });
          sfx('fire', 0.4, 1.3);
        }
        break;
      case 'warden': this.updateWarden(e, dt, dx, dy, d, move); break;
      case 'king': this.updateKing(e, dt, dx, dy, d, move); break;
      case 'knight':
        // Mirror Knight: marches at you behind its shield, then lunges
        if (e.state === 'idle') {
          if (near) move(dx / d * e.speed, dy / d * e.speed);
          if (near && d < 60 && e.t <= 0) { e.state = 'windup'; e.t = 0.55; e.cx = dx / d; e.cy = dy / d; sfx('telegraph', 0.4, 1.2); }
        } else if (e.state === 'windup') { if (e.t <= 0) { e.state = 'charge'; e.t = 0.3; } }
        else if (e.state === 'charge') { if (move(e.cx * 160, e.cy * 160) || e.t <= 0) { e.state = 'idle'; e.t = rnd(1.4, 2); } }
        break;
      case 'imp':
        // Mirror Imp: scurries at you, and now and then flickers and blinks to a new spot
        if (e.state === 'blink') {
          if (e.t <= 0) {
            for (let k = 0; k < 8; k++) {
              const a = Math.random() * 6.28, r = rnd(34, 50), nx = p.x + Math.cos(a) * r, ny = p.y + Math.sin(a) * r * 0.8;
              if (!this.boxBlocked(nx, ny, false, 6, 3) && !this.footHole(nx, ny)) { this.particles(e.x, e.y, '#dfe8ff', 8, 60, 6); e.x = nx; e.y = ny; break; }
            }
            this.particles(e.x, e.y, '#dfe8ff', 8, 60, 6); sfx('emote_pop', 0.4, 1.6);
            e.state = 'idle'; e.t = rnd(2.2, 3.2);
          }
        } else if (near) {
          move(dx / d * e.speed, dy / d * e.speed);
          if (e.t <= 0) { e.state = 'blink'; e.t = 0.45; sfx('telegraph', 0.3, 1.8); }
        } else if (e.t <= 0) { e.t = 1; }
        break;
      default: break;
    }
    // contact damage
    if (!e.dead && (e.z < 6 || e.type === 'page') && p.fall <= 0 && d < e.r + 6 && Math.abs(dy) < e.r + 6) {
      if (e.state !== 'dizzy' && e.state !== 'rest') this.damagePlayer(e.dmg, e);
    }
  }

  wakeBoss(e) {
    e.sleeping = false; e.state = 'roar'; e.t = 1.2;
    this.shake = 6; sfx('summon', 0.8);
    music('boss');
    this.hooks.bossBar(1, true, e.bossName);
    // close the arena with thorny bushes
    for (let ty = 1; ty < this.map.h - 1; ty++) {
      const gx = this.arena.gate;
      if (this.map.collAt(gx, ty) === 'none') {
        const o = { kind: 'prop', id: this.L.theme === 'valley' ? 'bush' : 'gate_block', tx: gx, ty, x: gx * T + 8, y: ty * T + 15, gate: true };
        this.props.push(o); this.bossGate.push(o); this.map.setColl(gx, ty, 'solid');
      }
    }
  }

  updateBoss(e, dt, dx, dy, d, move) {
    const phase2 = e.hp <= e.maxHp / 2;
    if (phase2 && !e.p2) {
      e.p2 = true; e.state = 'roar'; e.t = 1.0; this.shake = 6; sfx('summon', 0.9);
      this.enemies.push(this.makeEnemy('slime', e.x - 30, e.y + 10), this.makeEnemy('slime', e.x + 30, e.y - 10));
      this.popText(e.x, e.y - 52, 'AWOOO!', '#e8473e');
      return;
    }
    switch (e.state) {
      case 'roar': if (e.t <= 0) { e.state = 'stalk'; e.t = 1.2; e.combo = phase2 ? 3 : 2; } break;
      case 'stalk': {
        const ang = Math.atan2(e.y - this.player.y, e.x - this.player.x) + dt * 0.6;
        const tx = this.player.x + Math.cos(ang) * 80, ty = this.player.y + Math.sin(ang) * 56;
        const mx = tx - e.x, my = ty - e.y, md = Math.hypot(mx, my) || 1;
        if (md > 4) move(mx / md * e.speed, my / md * e.speed);
        e.face = dx < 0 ? -1 : 1;
        if (e.t <= 0) { e.state = 'windup'; e.t = phase2 ? 0.6 : 0.8; e.cx = dx / d; e.cy = dy / d; sfx('telegraph', 0.8); }
        break;
      }
      case 'windup':
        e.cx = e.cx * 0.9 + (dx / d) * 0.1; e.cy = e.cy * 0.9 + (dy / d) * 0.1;
        { const n = Math.hypot(e.cx, e.cy) || 1; e.cx /= n; e.cy /= n; }
        if (e.t <= 0) { e.state = 'charge'; e.t = 0.55; sfx('sword_slash_2', 0.6, 0.6); }
        break;
      case 'charge': {
        const hit = move(e.cx * 210, e.cy * 210);
        if (hit || e.t <= 0) {
          if (phase2) this.thornBurst(e);
          e.combo--;
          if (hit) { this.shake = 5; this.particles(e.x, e.y, '#cfb89c', 10, 80); }
          if (e.combo > 0) { e.state = 'windup'; e.t = phase2 ? 0.5 : 0.7; e.cx = dx / d; e.cy = dy / d; sfx('telegraph', 0.8); }
          else { e.state = 'dizzy'; e.t = phase2 ? 2.2 : 2.8; sfx('stun', 0.8); }
        }
        break;
      }
      case 'dizzy': if (e.t <= 0) { e.state = 'stalk'; e.t = rnd(1.2, 1.8); e.combo = phase2 ? 3 : 2; } break;
      default: e.state = 'stalk'; break;
    }
  }

  // ------------------------------------------------------------------ the Archivore (final boss of World 1)
  /** The Cinder Warden: armoured while his Furnace Coils burn. Stomps send fire rings (jump them!).
   *  Break both coils and his shell cracks; at half health new coils light and the floor vents wake. */
  updateWarden(e, dt, dx, dy, d, move) {
    const p = this.player;
    if (e.phase === undefined) { e.phase = 1; e.ward = true; }
    if (!e.phase2 && e.hp <= e.maxHp / 2) {
      e.phase2 = true; e.state = 'roar'; e.t = 1.4; this.shake = 8; sfx('summon', 1);
      this.popText(e.x, e.y - 64, 'STOKE THE FURNACE!', '#ff9a3a');
      for (const sx of [-1, 1]) { const c = this.makeEnemy('coil', e.x + sx * 80, e.y - 20 * sx); c.t = 1.5; this.enemies.push(c); this.particles(c.x, c.y, '#ff7a1a', 14, 80, 8); }
      e.ward = true;
      for (const v of this.vents) if (v.boss) v.active = true;
    }
    if (e.ward && e.state !== 'roar' && !this.enemies.some((c) => c.type === 'coil' && !c.dead)) {
      e.ward = false; e.state = 'dizzy'; e.t = 4; this.shake = 6; sfx('break', 1);
      this.popText(e.x, e.y - 64, 'SHELL CRACKED!', '#f9d77a'); this.particles(e.x, e.y - 12, '#b3b6c4', 24, 110, 12);
    }
    const fast = e.phase2 ? 1.3 : 1;
    switch (e.state) {
      case 'roar': if (e.t <= 0) { e.state = 'walk'; e.t = 1.6; } break;
      case 'walk':
        if (d > 40) move(dx / d * e.speed * fast, dy / d * e.speed * fast);
        e.face = dx < 0 ? -1 : 1;
        if (e.t <= 0) { e.state = 'windup'; e.t = 0.9 / fast; sfx('telegraph', 0.9, 0.7); }
        break;
      case 'windup': e.z = Math.min(10, e.z + dt * 30); if (e.t <= 0) { e.state = 'stomp'; e.t = 0.25; } break;
      case 'stomp':
        e.z = Math.max(0, e.z - dt * 80);
        if (e.t <= 0) {
          this.rings.push({ x: e.x, y: e.y, r: 10, life: 0.9, hit: false });
          if (e.phase2) setTimeout(() => { if (!e.dead) this.rings.push({ x: e.x, y: e.y, r: 10, life: 0.9, hit: false }); }, 450);
          this.shake = 7; sfx('hit_heavy_1', 1, 0.6); this.particles(e.x, e.y, '#ff7a1a', 16, 110, 2);
          e.state = 'rest'; e.t = 1.3;
        }
        break;
      case 'rest': if (e.t <= 0) { e.state = 'walk'; e.t = rnd(1.4, 2.2) / fast; } break;
      case 'dizzy': e.z = 0; if (e.t <= 0) { e.state = 'walk'; e.t = 1.2; } break;
      default: e.state = 'walk'; break;
    }
  }

  /** The Nameless King: shard volleys and dashes. At 2/3 and 1/3 health two Mirror Knights ward him;
   *  beat both and he falls dizzy. In his last phase the hall's red beams start to sweep. */
  updateKing(e, dt, dx, dy, d, move) {
    const p = this.player, frac = e.hp / e.maxHp;
    const phase = frac > 0.66 ? 1 : frac > 0.33 ? 2 : 3;
    if (phase > (e.phase || 1)) {
      e.phase = phase; e.state = 'roar'; e.t = 1.3; this.shake = 8; sfx('summon', 1);
      this.popText(e.x, e.y - 60, 'REFLECTIONS, GUARD ME!', '#dfe8ff');
      for (const sx of [-1, 1]) {
        const k = this.makeEnemy('knight', e.x + sx * 46, e.y + 8); k.t = 1.2; this.enemies.push(k);
        this.particles(k.x, k.y, '#dfe8ff', 12, 70, 8);
      }
      e.ward = true;
      if (phase === 3) for (const em of this.emitters) if (em.boss) em.active = true;
    }
    if (e.ward && e.state !== 'roar' && !this.enemies.some((k) => k.type === 'knight' && !k.dead)) {
      e.ward = false; e.state = 'dizzy'; e.t = 3.6; sfx('stun', 1); this.shake = 6;
      this.popText(e.x, e.y - 60, 'WARD BROKEN!', '#f9d77a'); this.particles(e.x, e.y - 10, '#dfe8ff', 24, 110, 10);
    }
    const fast = phase === 3 ? 1.3 : 1;
    switch (e.state) {
      case 'roar': if (e.t <= 0) { e.state = 'float'; e.t = 1.4; e.volleys = 0; } break;
      case 'float': {
        const ang = this.time * 0.6 * fast;
        const tx = p.x + Math.cos(ang) * 80, ty = p.y + Math.sin(ang) * 50;
        const mx = tx - e.x, my = ty - e.y, md = Math.hypot(mx, my) || 1;
        if (md > 6) move(mx / md * e.speed * fast, my / md * e.speed * fast);
        e.face = dx < 0 ? -1 : 1;
        if (e.t <= 0) {
          if (e.volleys >= 2) { e.state = 'windup'; e.t = 0.85 / fast; e.cx = dx / d; e.cy = dy / d; sfx('telegraph', 0.9); }
          else { e.state = 'aim'; e.t = 0.6; sfx('telegraph', 0.5, 1.5); }
        }
        break;
      }
      case 'aim':
        if (e.t <= 0) {
          const n = phase === 3 ? 8 : phase === 2 ? 5 : 3;
          const base = Math.atan2(dy, dx);
          for (let i = 0; i < n; i++) {
            const a = phase === 3 ? base + i / n * Math.PI * 2 : base + (i - (n - 1) / 2) * 0.3;
            this.shots.push({ kind: 'shard', x: e.x, y: e.y - 6, z: 12, vx: Math.cos(a) * 88, vy: Math.sin(a) * 88, life: 2.4, dmg: 1, friendly: false });
          }
          sfx('summon', 0.5, 1.8); e.volleys++; e.state = 'float'; e.t = 1.4 / fast;
        }
        break;
      case 'windup':
        e.cx = e.cx * 0.9 + (dx / d) * 0.1; e.cy = e.cy * 0.9 + (dy / d) * 0.1;
        { const n = Math.hypot(e.cx, e.cy) || 1; e.cx /= n; e.cy /= n; }
        if (e.t <= 0) { e.state = 'charge'; e.t = 0.6; sfx('sword_slash_2', 0.7, 0.6); }
        break;
      case 'charge': {
        const hit = move(e.cx * 220, e.cy * 220);
        if (hit || e.t <= 0) { e.state = 'dizzy'; e.t = 2.4; e.volleys = 0; this.shake = hit ? 6 : 2; sfx('stun', 0.9); this.particles(e.x, e.y, '#dfe8ff', 12, 90); }
        break;
      }
      case 'dizzy': if (e.t <= 0) { e.state = 'float'; e.t = 1.2; e.volleys = 0; } break;
      default: e.state = 'float'; break;
    }
  }

  updateArchivore(e, dt, dx, dy, d, move) {
    const p = this.player, frac = e.hp / e.maxHp;
    const phase = frac > 0.66 ? 1 : frac > 0.33 ? 2 : 3;
    if (phase > (e.phase || 1)) {
      e.phase = phase; e.state = 'roar'; e.t = 1.2; this.shake = 8; sfx('summon', 1);
      this.popText(e.x, e.y - 60, phase === 2 ? 'PAGES, ATTACK!' : 'RAAAWR!', '#c9a0ff');
      for (let i = 0; i < (phase === 2 ? 3 : 4); i++) { const a = i / 3 * Math.PI * 2; this.enemies.push(Object.assign(this.makeEnemy('page', e.x + Math.cos(a) * 50, e.y + Math.sin(a) * 30), { fly: true, z: 12 })); }
      if (phase === 3) this.pageZones.push([this.arena.gate * T, this.map.pw]);
    }
    const hover = 22 + Math.sin(this.time * 2) * 4;
    const fast = phase === 3 ? 1.35 : 1;
    switch (e.state) {
      case 'roar': e.z += (hover - e.z) * Math.min(1, dt * 4); if (e.t <= 0) { e.state = 'float'; e.t = 1.6; e.volleys = 0; } break;
      case 'float': {
        e.z += (hover - e.z) * Math.min(1, dt * 4);
        const ang = this.time * 0.7 * fast;
        const tx = p.x + Math.cos(ang) * 90, ty = p.y - 30 + Math.sin(ang) * 40;
        const mx = tx - e.x, my = ty - e.y, md = Math.hypot(mx, my) || 1;
        if (md > 6) { e.x += mx / md * e.speed * fast * dt; e.y += my / md * e.speed * fast * dt; }
        e.face = dx < 0 ? -1 : 1;
        if (e.t <= 0) {
          if (e.volleys >= 2) { e.state = 'windup'; e.t = 0.9 / fast; e.cx = dx / d; e.cy = dy / d; sfx('telegraph', 0.9); }
          else { e.state = 'aim'; e.t = 0.6; sfx('telegraph', 0.5, 1.4); }
        }
        break;
      }
      case 'aim':
        if (e.t <= 0) {
          const n = phase === 3 ? 10 : phase === 2 ? 5 : 3;
          const base = Math.atan2(dy, dx);
          for (let i = 0; i < n; i++) {
            const a = phase === 3 ? i / n * Math.PI * 2 : base + (i - (n - 1) / 2) * 0.32;
            this.shots.push({ kind: 'ink', x: e.x, y: e.y - 4, z: 14, vx: Math.cos(a) * 82, vy: Math.sin(a) * 82, life: 2.6, dmg: 1, friendly: false });
          }
          sfx('summon', 0.5, 1.6); e.volleys++; e.state = 'float'; e.t = 1.5 / fast;
        }
        break;
      case 'windup':
        e.cx = e.cx * 0.92 + (dx / d) * 0.08; e.cy = e.cy * 0.92 + (dy / d) * 0.08;
        { const n = Math.hypot(e.cx, e.cy) || 1; e.cx /= n; e.cy /= n; }
        e.z += (6 - e.z) * Math.min(1, dt * 5);
        if (e.t <= 0) { e.state = 'charge'; e.t = 0.6; sfx('sword_slash_2', 0.7, 0.5); }
        break;
      case 'charge': {
        e.z = 2;
        const hit = move(e.cx * 230, e.cy * 230);
        if (hit || e.t <= 0) { e.state = 'dizzy'; e.t = phase === 3 ? 2.2 : 2.8; e.z = 0; this.shake = 6; sfx('stun', 0.9); this.particles(e.x, e.y, '#c9a0ff', 14, 90); }
        break;
      }
      case 'dizzy': e.z = 0; if (e.t <= 0) { e.state = 'float'; e.t = 1.2; e.volleys = 0; } break;
      default: e.state = 'float'; break;
    }
  }

  // ------------------------------------------------------------------ puzzles: push blocks, plates, levers, braziers, gates
  blockAt(tx, ty) { return this.blocks.find((b) => !b.sunk && b.tx === tx && b.ty === ty); }

  tryPush(mx, my, blocked, dt) {
    const p = this.player;
    const card = Math.abs(mx) > 0.6 && Math.abs(my) < 0.4 ? [Math.sign(mx), 0] : Math.abs(my) > 0.6 && Math.abs(mx) < 0.4 ? [0, Math.sign(my)] : null;
    if (!card || !blocked || p.z > 0) { this.pushT = 0; return; }
    const ftx = Math.floor((p.x + card[0] * 10) / T), fty = Math.floor((p.y + card[1] * 7) / T);
    const b = this.blockAt(ftx, fty);
    if (!b || b.moving) { this.pushT = 0; return; }
    this.pushT = (this.pushT || 0) + dt;
    if (this.pushT < 0.22) return;
    this.pushT = 0;
    const nx = b.tx + card[0], ny = b.ty + card[1];
    const c = this.map.collAt(nx, ny);
    const occupied = this.blockAt(nx, ny) || this.props.some((o) => !o.gone && o.tx === nx && o.ty === ny && o.id !== 'secret_chest');
    if (occupied || (c !== 'none' && c !== 'pit')) { sfx('miss', 0.3, 0.7); return; }
    this.map.setColl(b.tx, b.ty, 'none');
    b.tx = nx; b.ty = ny; b.moving = 0.18;
    sfx('land', 0.6, 0.6);
    if (c === 'pit') { b.sunk = true; this.map.setColl(nx, ny, 'none'); this.popText(nx * T + 8, ny * T, 'BRIDGE!', '#f9d77a'); sfx('door_unlock', 0.6); }
    else this.map.setColl(nx, ny, 'solid');
  }

  hitSwitches(x, y, r, kind) {
    const near = (o) => Math.hypot(o.tx * T + 8 - x, o.ty * T + 8 - y) < r + 9;
    for (const l of this.levers) if (!l.on && near(l)) { l.on = true; sfx('switch_on', 0.8); this.popText(l.tx * T + 8, l.ty * T - 10, 'CLICK!', '#f9d77a'); }
    for (const v of this.valves) if (!v.on && near(v)) { v.on = true; sfx('door_unlock', 0.7, 1.2); this.popText(v.tx * T + 8, v.ty * T - 12, 'TURN!', '#7ad0ff'); this.particles(v.tx * T + 8, v.ty * T + 2, '#dfe8ff', 10, 60, 10); }
    for (const f of this.fans) {
      if (!near(f) || f.cool > this.time) continue;
      f.on = !f.on; f.cool = this.time + 0.45; sfx('switch_on', 0.6, f.on ? 1.3 : 0.8);
      this.popText(f.tx * T + 8, f.ty * T - 12, f.on ? 'FAN ON' : 'FAN OFF', '#dfe8ff');
    }
    for (const m of this.mirrors) {
      if (m.fixed || !near(m) || m.cool > this.time) continue;
      m.orient ^= 1; m.cool = this.time + 0.4; m.turn = 1;
      sfx('switch_on', 0.6, 1.6); this.particles(m.tx * T + 8, m.ty * T + 4, '#dfe8ff', 6, 50, 12);
    }
    for (const b of this.braziers) {
      if (b.lit || !near(b)) continue;
      if (kind === 'spark') { b.lit = true; sfx('fire', 0.7); this.particles(b.tx * T + 8, b.ty * T + 4, '#ffb020', 12, 60, 12); }
      else if (!(b.tink > this.time)) { b.tink = this.time + 0.8; this.popText(b.tx * T + 8, b.ty * T - 10, 'USE THE STAFF!', '#7ac3ef'); }
    }
  }

  /** Follow each light beam tile by tile: mirrors turn it, crystals catch it, anything solid stops it. */
  traceBeams() {
    const at = (list, x, y) => list.find((o) => o.tx === x && o.ty === y);
    const D = { N: [0, -1], E: [1, 0], S: [0, 1], W: [-1, 0] };
    for (const em of this.emitters) {
      em.on = em.active; em.warn = false;
      if (em.active && em.cycle) {
        const per = em.cycle[0] + em.cycle[1], ph = (this.time + em.offset) % per;
        em.on = ph < em.cycle[0]; em.warn = !em.on && ph > per - 0.7;
      }
      if (!em.on && !em.warn) { em.path = []; continue; }
      let [dx, dy] = D[em.dir]; let x = em.tx, y = em.ty;
      const path = [[x + 0.5, y + 0.5]];
      for (let step = 0; step < 160; step++) {
        const nx = x + dx, ny = y + dy;
        const m = at(this.mirrors, nx, ny);
        if (m) { path.push([nx + 0.5, ny + 0.5]); [dx, dy] = m.orient === 0 ? [-dy, -dx] : [dy, dx]; x = nx; y = ny; continue; }
        const c = !em.hazard && em.on && at(this.crystals, nx, ny);
        if (c) {
          path.push([nx + 0.5, ny + 0.5]);
          if (!c.lit) { c.lit = true; sfx('lantern_reveal', 0.8); this.popText(nx * T + 8, ny * T - 12, 'SHINE!', '#9fe0ff'); this.particles(nx * T + 8, ny * T + 4, '#9fe0ff', 16, 80, 12); }
          break;
        }
        if (this.map.collAt(nx, ny) === 'solid' || !this.map.inside(nx, ny)) { path.push([x + 0.5 + dx * 0.5, y + 0.5 + dy * 0.5]); break; }
        x = nx; y = ny;
      }
      em.path = path;
    }
  }

  /** Emberpeak: valves cool lava into stone, fans blow, vents puff steam, the Warden's fire rings spread. */
  updateEmber(dt) {
    const p = this.player;
    for (const z of this.coolZones) {
      if (z.done || !this.valves.filter((v) => v.group === z.group).every((v) => v.on) || !this.valves.some((v) => v.group === z.group)) continue;
      z.done = true; sfx('fire', 0.6, 0.6);
      for (let x = z.x0; x <= z.x1; x++) for (let y = z.y0; y <= z.y1; y++) {
        if (this.map.terrainAt(x, y) !== 'lava') continue;
        this.map.setColl(x, y, 'none'); this.slabs.push({ tx: x, ty: y, rise: 0, delay: (Math.abs(x - z.x0) + Math.abs(y - z.y0)) * 0.05 });
        this.particles(x * T + 8, y * T + 8, '#dfe8ff', 2, 40, 2);
      }
      this.popText(p.x, p.y - 40, 'THE LAVA COOLED!', '#7ad0ff');
    }
    for (const sl of this.slabs) { if (sl.delay > 0) sl.delay -= dt; else sl.rise = Math.min(1, sl.rise + dt * 3); }
    // fans push the player and crates along their lane
    const D = { N: [0, -1], E: [1, 0], S: [0, 1], W: [-1, 0] };
    for (const f of this.fans) {
      f.spin += dt * (f.on ? 20 : 0);
      if (!f.on) continue;
      const [dx, dy] = D[f.dir];
      let lane = 0;
      for (let k = 1; k <= f.len; k++) { const c = this.map.collAt(f.tx + dx * k, f.ty + dy * k); if (c === 'solid' && !this.blockAt(f.tx + dx * k, f.ty + dy * k)) break; lane = k; }
      f.lane = lane;
      const ptx = Math.floor(p.x / T), pty = Math.floor(p.y / T);
      const along = dx ? (ptx - f.tx) * dx : (pty - f.ty) * dy, side = dx ? pty - f.ty : ptx - f.tx;
      if (along >= 1 && along <= lane && side === 0 && p.z < 12 && !p.zip) this.moveActor(p, dx * 70 * dt, dy * 70 * dt, p.z > 0.5);
      f.crateT -= dt;
      if (f.crateT <= 0) {
        f.crateT = 0.45;
        for (let k = lane; k >= 1; k--) {
          const b = this.blockAt(f.tx + dx * k, f.ty + dy * k);
          if (!b || b.moving) continue;
          const nx = b.tx + dx, ny = b.ty + dy, c = this.map.collAt(nx, ny);
          if (this.blockAt(nx, ny) || (c !== 'none' && c !== 'pit')) continue;
          this.map.setColl(b.tx, b.ty, 'none'); b.tx = nx; b.ty = ny; b.moving = 0.18; sfx('land', 0.4, 0.7);
          if (c === 'pit') { b.sunk = true; this.map.setColl(nx, ny, 'none'); this.popText(nx * T + 8, ny * T, 'BRIDGE!', '#f9d77a'); }
          else this.map.setColl(nx, ny, 'solid');
        }
      }
    }
    // steam vents: glow, then puff
    for (const v of this.vents) {
      if (!v.active) { v.state = 'idle'; continue; }
      const ph = (this.time + v.offset) % v.period;
      const was = v.state;
      v.state = ph > v.period - 0.7 ? 'puff' : ph > v.period - 1.5 ? 'warn' : 'idle';
      if (v.state === 'puff' && was !== 'puff') sfx('fire', 0.25, 1.6);
      if (v.state === 'puff' && p.z < 8 && p.inv <= 0 && Math.abs(p.x - (v.tx * T + 8)) < 10 && Math.abs(p.y - 3 - (v.ty * T + 8)) < 10) this.damagePlayer(1, { x: v.tx * T + 8, y: v.ty * T + 8 });
    }
    // fire rings from the Warden's stomp: jump over them
    for (const r of this.rings) {
      r.r += dt * 110; r.life -= dt;
      const d = Math.hypot(p.x - r.x, p.y - r.y);
      if (!r.hit && Math.abs(d - r.r) < 7 && p.z < 4) { r.hit = true; this.damagePlayer(1, r); }
    }
    this.rings = this.rings.filter((r) => r.life > 0);
  }

  /** Red light beams hurt: jump over them (or wait for them to blink off). */
  beamHurts() {
    const p = this.player;
    if (p.z > 2 || p.fall > 0 || p.inv > 0) return;
    const px = p.x / T, py = (p.y - 3) / T;
    for (const em of this.emitters) {
      if (!em.hazard || !em.on) continue;
      for (let i = 1; i < em.path.length; i++) {
        const [ax, ay] = em.path[i - 1], [bx, by] = em.path[i];
        const vx = bx - ax, vy = by - ay, L2 = vx * vx + vy * vy || 1;
        const t = clamp(((px - ax) * vx + (py - ay) * vy) / L2, 0, 1);
        const qx = ax + vx * t, qy = ay + vy * t;
        if (Math.hypot(px - qx, py - qy) < 0.3) { this.damagePlayer(1, { x: qx * T, y: qy * T }); this.particles(p.x, p.y - 6, '#ff6a5a', 8, 60, 6); return; }
      }
    }
  }

  updatePuzzles(dt) {
    this.updateEmber(dt);
    for (const m of this.mirrors) {
      if (!m.auto) continue;
      m.at -= dt; m.warn = m.at < 0.6;
      if (m.at <= 0) { m.orient ^= 1; m.turn = 1; m.at = m.auto; sfx('switch_on', 0.25, 1.8); }
    }
    if (this.emitters.length) { this.traceBeams(); this.beamHurts(); }
    for (const m of this.mirrors) m.turn = Math.max(0, m.turn - dt * 4);
    if (!this.gates.length && !this.blocks.length) return;
    const p = this.player;
    const ptx = Math.floor(p.x / T), pty = Math.floor(p.y / T);
    for (const v of this.valves) v.spin = Math.max(0, v.spin - dt);
    for (const b of this.blocks) {
      if (b.moving) { b.moving = Math.max(0, b.moving - dt); const k = 1 - b.moving / 0.18; b.px += (b.tx - b.px) * Math.min(1, k + 0.2); b.py += (b.ty - b.py) * Math.min(1, k + 0.2); if (!b.moving) { b.px = b.tx; b.py = b.ty; } }
    }
    for (const r of this.resets) {
      r.cool = Math.max(0, r.cool - dt);
      if (r.cool || ptx !== r.tx || pty !== r.ty || p.z > 1) continue;
      r.cool = 2;
      let moved = false;
      for (const b of this.blocks) {
        if (b.group !== r.group || b.sunk || (b.tx === b.sx && b.ty === b.sy)) continue;
        if (this.blockAt(b.sx, b.sy) || this.map.collAt(b.sx, b.sy) !== 'none') continue;
        this.map.setColl(b.tx, b.ty, 'none'); b.tx = b.px = b.sx; b.ty = b.py = b.sy; this.map.setColl(b.tx, b.ty, 'solid'); moved = true;
        this.particles(b.tx * T + 8, b.ty * T + 8, '#7ad0ff', 10, 60, 6);
      }
      if (moved) { sfx('revive', 0.6, 1.3); this.popText(r.tx * T + 8, r.ty * T - 8, 'RESET!', '#7ad0ff'); }
    }
    for (const pl of this.plates) {
      const was = pl.pressed;
      pl.pressed = !!this.blockAt(pl.tx, pl.ty) || (ptx === pl.tx && pty === pl.ty && p.z < 2 && p.fall <= 0);
      if (pl.pressed && !was) sfx('switch_on', 0.5, 1.3);
    }
    const groups = new Set(this.gates.map((g) => g.group));
    for (const grp of groups) {
      const trig = [...this.plates.filter((x) => x.group === grp).map((x) => x.pressed), ...this.levers.filter((x) => x.group === grp).map((x) => x.on), ...this.braziers.filter((x) => x.group === grp).map((x) => x.lit), ...this.crystals.filter((x) => x.group === grp).map((x) => x.lit), ...this.valves.filter((x) => x.group === grp).map((x) => x.on)];
      const open = trig.length > 0 && trig.every(Boolean);
      if (open && !this.groupState[grp]) sfx('door_unlock', 0.8);
      this.groupState[grp] = open;
      for (const g of this.gates.filter((x) => x.group === grp)) {
        const inside = Math.abs(p.x - (g.tx * T + 8)) < 13 && Math.abs(p.y - (g.ty * T + 8)) < 12;
        if (open && !g.open) { g.open = true; this.map.setColl(g.tx, g.ty, 'none'); }
        else if (!open && g.open && !inside) { g.open = false; this.map.setColl(g.tx, g.ty, 'solid'); }
      }
    }
  }

  // ------------------------------------------------------------------ the Ferry Race rival
  updateRival(dt) {
    const r = this.rival;
    if (!r || r.done) return;
    if (!r.started) { r.wait -= dt; if (r.wait > 0) return; r.started = true; this.popText(this.player.x, this.player.y - 40, 'GO!', '#4fd36a'); sfx('bell_toll', 0.6); }
    const t = r.path[r.i];
    const dx = t.x - r.x, dy = t.y - r.y, d = Math.hypot(dx, dy);
    const step = r.speed * dt * (this.assist ? 0.85 : 1);
    if (d <= step) { r.x = t.x; r.y = t.y; r.i++; if (r.i >= r.path.length) { r.done = true; if (!this.finished) { this.popText(r.x, r.y - 30, r.name + ' WINS!', '#ff6fb0'); this.hooks.hint(r.kind === 'mirror' ? 'Your reflection got there first! Ring the bell anyway, and try again.' : r.kind === 'bram' ? 'Bram got there first! Ring the bell anyway, and try again.' : "Pip got there first! Ring the bell anyway, and try again to beat him.", 'mira'); } } }
    else { r.x += dx / d * step; r.y += dy / d * step; }
    if (Math.abs(dx) > Math.abs(dy)) r.face = dx < 0 ? 1 : 2; else r.face = dy < 0 ? 3 : 0;
    r.walk += dt * 9;
    // Pip hops anything wet
    const g = this.groundAt(r.x, r.y);
    r.z = g === 'pit' || g === 'water' ? 10 + Math.abs(Math.sin(this.time * 6)) * 8 : Math.max(0, r.z - dt * 60);
  }

  thornBurst(e) {
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * Math.PI * 2 + this.time;
      this.shots.push({ kind: 'thorn', x: e.x, y: e.y - 4, z: 6, vx: Math.cos(a) * 70, vy: Math.sin(a) * 70, life: 1.6, dmg: 1, friendly: false });
    }
    sfx('summon', 0.4, 1.4);
  }

  // ------------------------------------------------------------------ shots, hazards, crumble
  updateShots(dt) {
    for (const s of this.shots) {
      if (s.kind === 'rang') { this.updateRang(s, dt); continue; }
      if (s.kind === 'hook') { this.updateHook(s, dt); continue; }
      s.life -= dt; s.x += s.vx * dt; s.y += s.vy * dt;
      if (this.solidAt(s.x, s.y, true) && this.map.collAt(Math.floor(s.x / T), Math.floor(s.y / T)) === 'solid') {
        this.hitBreakables(s.x, s.y, 6, false);
        if (s.friendly) this.hitSwitches(s.x, s.y, 10, 'spark');
        s.life = 0; this.particles(s.x, s.y, s.friendly ? '#7ac3ef' : '#62a845', 4, 40, s.z);
      }
      if (s.life <= 0) continue;
      if (s.friendly) {
        for (const e of this.enemies) {
          if (e.dead || e.sleeping) continue;
          if (Math.hypot(e.x - s.x, (e.y - 6) - s.y) < e.r + 5) {
            const n = Math.hypot(s.vx, s.vy) || 1;
            this.hitEnemy(e, s.dmg, s.vx / n, s.vy / n, 90); s.life = 0; break;
          }
        }
        this.hitBreakables(s.x, s.y, 2, false);
      } else {
        const p = this.player;
        if (Math.hypot(p.x - s.x, (p.y - 6) - s.y) < 8 && p.z < 8) { this.damagePlayer(s.dmg, s); s.life = 0; }
      }
    }
    this.shots = this.shots.filter((s) => s.life > 0);
  }

  updateHazards(dt) {
    const p = this.player;
    if (p.fall <= 0 && this.pageZones.some(([a, b]) => p.x > a && p.x < b)) {
      this.pageTimer -= dt;
      if (this.pageTimer <= 0) {
        this.pageTimer = rnd(0.7, 1.1);
        const tx = p.x + p.vx * 0.5 + rnd(-14, 14), ty = p.y + p.vy * 0.5 + rnd(-10, 10);
        if (this.groundAt(tx, ty) === 'none') { this.hazards.push({ kind: 'page', x: tx, y: ty, t: 0, warn: 0.95 }); sfx('page_flutter', 0.4); }
      }
    }
    for (const h of this.hazards) {
      h.t += dt;
      if (!h.landed && h.t >= h.warn) {
        h.landed = true; h.life = 0.35;
        this.particles(h.x, h.y, '#ebdfc8', 8, 60, 2);
        sfx('land', 0.6, 0.8);
        if (Math.hypot(p.x - h.x, p.y - h.y) < 13 && p.z < 7) this.damagePlayer(1, h);
      }
      if (h.landed) h.life -= dt;
    }
    this.hazards = this.hazards.filter((h) => !h.landed || h.life > 0);
  }

  updateCrumbles(dt) {
    // Kid-friendly crumble: a tile cracks when you step on it, holds while you stand there (up to 4 s),
    // and drops 0.9 s after you step off. It comes back 2.5 s later.
    const p = this.player;
    const feet = [[0, 0], [-6, 0], [6, 0], [0, -5], [0, 5]].map(([dx, dy]) => Math.floor((p.x + dx) / T) + ',' + Math.floor((p.y + dy) / T));
    for (const c of this.crumbles.values()) {
      const onIt = p.fall <= 0 && feet.includes(c.tx + ',' + c.ty);
      if (c.state === 'ok') {
        if (onIt && p.z === 0) { c.state = 'crack'; c.t = 4; sfx('land', 0.4, 1.6); }
      } else if (c.state === 'crack') {
        c.t -= dt;
        if (!onIt) c.t = Math.min(c.t, 0.9);
        if (c.t <= 0) { c.state = 'gone'; c.t = 2.5; this.map.setColl(c.tx, c.ty, 'pit'); this.particles(c.tx * T + 8, c.ty * T + 8, '#8e8997', 8, 40, 0); }
      } else if (c.state === 'gone') {
        c.t -= dt;
        if (c.t <= 0 && !onIt) { c.state = 'ok'; this.map.setColl(c.tx, c.ty, 'none'); this.particles(c.tx * T + 8, c.ty * T + 8, '#f9d77a', 4, 20, 0); }
      }
    }
  }

  // ------------------------------------------------------------------ pickups, buddy, triggers
  updatePickups(dt) {
    const p = this.player;
    for (const k of this.pickups) {
      if (k.vz !== undefined && (k.z > 0 || k.vz > 0)) {
        k.vz -= 400 * dt; k.z += k.vz * dt;
        if (k.vx) { k.x += k.vx * dt; k.y += k.vy * dt; k.vx *= 0.94; k.vy *= 0.94; }
        if (k.z <= 0) { k.z = 0; k.vz = undefined; }
      }
      // pet magnet: the pet gathers coins near the player
      if (k.kind === 'coin' && this.pet && Math.hypot(k.x - p.x, k.y - p.y) < this.magnetR) {
        const dx = this.pet.x - k.x, dy = this.pet.y - k.y, d = Math.hypot(dx, dy) || 1;
        if (d < 40) { k.x += dx / d * 90 * dt; k.y += dy / d * 90 * dt; }
      }
      const reach = k.kind === 'letter' ? 18 : 12;
      const byPlayer = Math.hypot(k.x - p.x, k.y - (p.y - p.z * 0.5)) < reach && p.fall <= 0;
      const byPet = k.kind === 'coin' && this.pet && Math.hypot(k.x - this.pet.x, k.y - this.pet.y) < 8;
      if (byPlayer || byPet) this.collect(k);
    }
    this.pickups = this.pickups.filter((k) => !k.got);
  }

  collect(k) {
    const p = this.player;
    k.got = true;
    if (k.kind === 'coin') { this.coins += this.upgrades.lucky ? 2 : 1; sfx('coin', 0.5, rnd(0.95, 1.1)); }
    if (k.kind === 'heart') { p.hp = Math.min(p.maxHp, p.hp + 2); sfx('heal', 0.6); }
    if (k.kind === 'scroll') {
      this.gotScroll = true; sfx('name_restore', 0.9);
      this.popText(k.x, k.y - 20, 'SECRET SCROLL!', '#f9d77a');
      this.hooks.hint('Secret scroll! That\'s a star!', 'mira');
    }
    if (k.kind === 'letter') {
      this.lettersGot[k.i] = true; sfx('item_use', 0.7, 1.2);
      this.popText(k.x, k.y - 20, k.ch, '#f9d77a');
      if (this.L.word.split('').every((_, i) => this.lettersGot[i])) {
        this.coins += 10; sfx('level_up_sparkle', 0.9);
        this.popText(p.x, p.y - 36, this.L.word + '! +10', '#f9d77a');
      }
    }
    this.hooks.hud();
  }

  updateBuddyPet(dt) {
    const p = this.player;
    if (!this.pet) this.pet = { x: p.x + 10, y: p.y + 6, z: 0, vz: 0, face: 1, f: 0, cd: 0, sniff: 0 };
    const pt = this.pet;
    pt.cd = Math.max(0, pt.cd - dt);
    if (this.petPower === 'shield' && !this.petShield.ready) {
      this.petShield.t -= dt;
      if (this.petShield.t <= 0) { this.petShield.ready = true; this.popText(pt.x, pt.y - 18, 'SHIELD READY', '#7ad0ff'); sfx('item_use', 0.4, 1.4); }
    }
    // default: hop just in front of the hero, on the camera side, so it stays in view
    let tx = p.x + (p.dir === 1 ? 10 : -10), ty = p.y + 12, fast = false;
    const coin = this.pickups.find((k) => k.kind === 'coin' && Math.hypot(k.x - p.x, k.y - p.y) < this.magnetR);
    if (coin) { tx = coin.x; ty = coin.y; fast = true; }
    if (this.petPower === 'helper') {
      // Helper Pup: dash at an enemy near the hero and nip it
      const foe = this.enemies.find((e) => !e.dead && !e.sleeping && !e.boss && dist(e, p) < 70);
      if (foe) { tx = foe.x; ty = foe.y; fast = true;
        if (pt.cd <= 0 && Math.hypot(foe.x - pt.x, foe.y - pt.y) < 12) {
          pt.cd = 1.2; const d = dist(foe, pt) || 1;
          this.hitEnemy(foe, 1, (foe.x - pt.x) / d, (foe.y - pt.y) / d, 90, { pet: true });
          this.popText(foe.x, foe.y - 24, 'NIP!', '#ffd84a'); sfx('hit_light_1', 0.5, 1.4);
        }
      }
    }
    if (this.petPower === 'seeker' && !coin) {
      // Seeker Page: lean toward the closest secret it can smell, and sparkle
      const p16 = (o) => ({ x: o.tx * T + 8, y: o.ty * T + 8 });
      const targets = [...this.secretChests.filter((o) => !o.opened).map(p16), ...this.pickups.filter((k) => k.kind === 'scroll').map((k) => ({ x: k.x, y: k.y }))];
      let best = null, bd = 150;
      for (const t of targets) { const d = Math.hypot(t.x - p.x, t.y - p.y); if (d < bd) { bd = d; best = t; } }
      this.seekTarget = best;
      if (best) {
        const d = bd || 1, lean = Math.min(44, d * 0.6);
        tx = p.x + (best.x - p.x) / d * lean; ty = p.y + (best.y - p.y) / d * lean;
        pt.sniff -= dt;
        if (pt.sniff <= 0) {
          pt.sniff = 0.35; this.particles(pt.x, pt.y - 4, '#c9a0ff', 2, 30, 10);
          if (!this.sniffed || this.sniffed !== best.x + ',' + best.y) { this.sniffed = best.x + ',' + best.y; this.popText(pt.x, pt.y - 22, 'SNIFF SNIFF!', '#c9a0ff'); }
        }
      }
    }
    const pdx = tx - pt.x, pdy = ty - pt.y, pd = Math.hypot(pdx, pdy);
    if (pd > 160) { pt.x = p.x; pt.y = p.y; }
    else if (pd > 3) { const s = Math.min(pd * 5, fast ? 140 : 100); pt.x += pdx / pd * s * dt; pt.y += pdy / pd * s * dt; if (Math.abs(pdx) > 1) pt.face = pdx < 0 ? -1 : 1; if (pt.z === 0 && pd > 10) pt.vz = 60; }
    if (pt.z > 0 || pt.vz > 0) { pt.vz -= 400 * dt; pt.z = Math.max(0, pt.z + pt.vz * dt); if (pt.z === 0) pt.vz = 0; }
  }

  updateTriggers() {
    const p = this.player;
    const tx = p.x / T;
    for (const h of this.hints) {
      if (!this.hintsShown.has(h.id) && tx >= h.x) {
        if (ITEMS.some((w) => w.toLowerCase() === h.id && this.weapons[w])) { this.hintsShown.add(h.id); continue; }
        this.hintsShown.add(h.id);
        this.hooks.hint(h.text, 'mira');
      }
    }
    for (const c of this.checkpoints) {
      if (!c.lit && Math.hypot(c.cpx - p.x, c.cpy - 16 - p.y) < 22) {
        c.lit = true; this.lastCheckpoint = { x: c.cpx, y: c.cpy };
        sfx('lantern_reveal', 0.7); this.particles(c.cpx, c.cpy - 30, '#f9d77a', 10, 50, 10);
        this.popText(c.cpx, c.cpy - 40, 'CHECKPOINT', '#f9d77a');
      }
    }
    for (const o of this.pedestals) {
      if (!o.taken && p.fall <= 0 && Math.hypot(o.tx * T + 8 - p.x, o.ty * T + 8 - p.y) < 22) this.takeWeapon(o);
    }
    for (const o of this.secretChests) {
      if (!o.opened && p.fall <= 0 && Math.hypot(o.tx * T + 8 - p.x, o.ty * T + 8 - p.y) < 26) this.openSecret(o);
    }
    const g = this.goal;
    if (g && !g.hidden && !this.finished && Math.hypot(g.gx - p.x, g.gy - p.y) < 22) this.finish();
    const st = this.stairs;
    if (st && st.open && !st.used && p.fall <= 0 && Math.hypot(st.tx * T + 8 - p.x, st.ty * T + 8 - p.y) < 16) {
      st.used = true; sfx('confirm', 0.8); this.hooks.climb();
    }
  }

  takeWeapon(o) {
    o.taken = true; o.takenNow = true;
    this.weapons[o.weapon] = true;
    this.shake = 4;
    this.particles(o.tx * T + 8, o.ty * T + 6, '#f9d77a', 30, 120, 14);
    this.particles(o.tx * T + 8, o.ty * T + 6, '#7ad0ff', 16, 90, 14);
    this.equip(ITEMS.indexOf(o.weapon));
    this.hooks.weapon(o.weapon);
    this.hooks.hud();
  }

  openSecret(o) {
    o.opened = true; o.openedNow = true;
    const id = o.secret, p = this.player;
    this.upgrades[id] = true;
    if (id.startsWith('heart')) { p.maxHp += 2; p.hp = p.maxHp; }
    this.secretsThisRun.push(id);
    this.shake = 4;
    this.particles(o.tx * T + 8, o.ty * T + 6, '#f9d77a', 26, 110, 10);
    this.particles(o.tx * T + 8, o.ty * T + 6, '#c9a0ff', 16, 90, 10);
    this.popText(o.tx * T + 8, o.ty * T - 10, 'SECRET!', '#f9d77a');
    this.hooks.secret(id);
    this.hooks.hud();
  }

  finish() {
    if (this.done || this.finished) return;
    this.done = true; this.finished = true;
    const g = this.goal;
    if (g.id === 'prop_thirteenth_bell') sfx('bell_peal', 1); else sfx('chest_open', 0.9);
    if (g.id === 'chest_gold') g.open = true;
    this.particles(g.gx, g.gy - 16, '#f9d77a', 30, 110, 14);
    music(null);
    const stars = [true, this.gotScroll];
    if (this.L.timeStar) stars.push(this.clock <= this.L.timeStar);
    else if (this.L.rival) stars.push(!!this.rival && !this.rival.done);
    else if (this.L.heartsStar) stars.push(this.player.hp >= this.L.heartsStar);
    else stars.push(this.L.word.split('').every((_, i) => this.lettersGot[i]));
    setTimeout(() => this.hooks.result({ level: this.L, stars, coins: this.coins, time: this.clock, letters: this.lettersGot.filter(Boolean).length, secretIds: this.secretChests.map((o) => o.secret) }), 1400);
  }

  // ------------------------------------------------------------------ Battle Arena: waves
  static WAVES = [
    [['slime', 3]],
    [['slime', 3], ['scarab', 2]],
    [['wolf', 2], ['slime', 3]],
    [['imp', 4], ['mite', 2]],
    [['alpha', 1, { hp: 10, maxHp: 10, bossName: 'Arena Alpha' }], ['slime', 2]],
    [['golem', 2], ['mite', 3]],
    [['wolf', 3], ['imp', 2]],
    [['imp', 4], ['scarab', 2], ['slime', 2]],
    [['golem', 2], ['wolf', 3], ['knight', 1]],
    [['alpha', 1, { hp: 16, maxHp: 16, bossName: 'Arena Champion' }], ['knight', 2]],
  ];
  updateWaves(dt) {
    if (this.done || this.arenaOver) return;
    if (this.wave === undefined) { this.wave = 0; this.waveState = 'break'; this.waveT = 2.2; this.kills = 0; }
    const alive = this.enemies.filter((e) => !e.dead).length;
    if (this.waveState === 'fight' && alive === 0) {
      if (this.wave >= this.L.waves) { this.endArena(true); return; }
      this.waveState = 'break'; this.waveT = 4;
      sfx('level_up_sparkle', 0.8); this.popText(this.player.x, this.player.y - 40, 'WAVE CLEAR!', '#4fd36a');
      const c = this.map.pw / 2, m = this.map.ph / 2;
      this.pickups.push({ kind: 'heart', x: c - 30, y: m, z: 10, vz: 60, bob: 0 }, { kind: 'heart', x: c + 30, y: m, z: 10, vz: 60, bob: 0 });
      this.hooks.hud();
    }
    if (this.waveState === 'break') {
      this.waveT -= dt;
      if (this.waveT <= 0) this.spawnWave();
    }
  }
  spawnWave() {
    this.wave++; this.waveState = 'fight';
    const list = Game.WAVES[Math.min(this.wave, Game.WAVES.length) - 1];
    const p = this.player;
    this.popText(p.x, p.y - 44, 'WAVE ' + this.wave + '!', '#f9d77a'); sfx('bell_toll', 0.6);
    for (const [type, n, extra] of list) {
      const count = this.assist ? Math.max(1, n - 1) : n;
      for (let i = 0; i < count; i++) {
        let x = 0, y = 0;
        for (let k = 0; k < 30; k++) {
          x = rnd(2 * T, this.map.pw - 2 * T); y = rnd(3 * T, this.map.ph - 2 * T);
          if (Math.hypot(x - p.x, y - p.y) > 90 && !this.boxBlocked(x, y, false, 7, 4) && !this.footHole(x, y)) break;
        }
        const e = this.makeEnemy(type, x, y);
        if (extra) Object.assign(e, extra);
        if (e.boss) { e.state = 'roar'; e.t = 1; this.hooks.bossBar(1, true, e.bossName); }
        this.enemies.push(e);
        this.particles(x, y, '#c9a0ff', 10, 70, 6);
      }
    }
    this.hooks.hud();
  }
  endArena(won) {
    if (this.arenaOver) return;
    this.arenaOver = true; this.done = true;
    music(null); sfx(won ? 'bell_peal' : 'fall', 0.9);
    const reached = won ? this.L.waves : Math.max(0, this.wave - 1);
    setTimeout(() => this.hooks.arenaOver({ won, wave: reached, coins: this.coins }), 1200);
  }

  /** After a floor is cleared: a staircase rises near the goal and play resumes until you climb it. */
  openStairs(label) {
    const g = this.goal, gx = Math.floor(g.gx / T), gy = Math.floor(g.gy / T);
    const ok = (x, y) => {
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (this.map.collAt(x + dx, y + dy) !== 'none') return false;
      return !this.props.some((o) => !o.gone && o.tx === x && o.ty === y);
    };
    let spot = null;
    for (let r = 2; r <= 8 && !spot; r++) {
      for (const [dx, dy] of [[r, 0], [-r, 0], [0, r], [0, -r], [r, r], [-r, r], [r, -r], [-r, -r], [r, 1], [r, -1], [-r, 1], [-r, -1]]) {
        if (ok(gx + dx, gy + dy)) { spot = [gx + dx, gy + dy]; break; }
      }
    }
    if (!spot) spot = [gx + 1, gy];
    this.stairs = { tx: spot[0], ty: spot[1], open: true, used: false, label, rise: 0 };
    this.particles(spot[0] * T + 8, spot[1] * T + 8, '#f9d77a', 30, 120, 6);
    sfx('lantern_reveal', 0.9);
    this.done = false;
    this.enemies.forEach((e) => { if (!e.boss) e.dead = true; });
    music(this.L.music);
  }

  updateFx(dt) {
    for (const f of this.fx) {
      f.life -= dt;
      if (f.kind === 'dot') { f.x += f.vx * dt; f.y += f.vy * dt; f.vz -= 300 * dt; f.z = Math.max(0, f.z + f.vz * dt); }
      if (f.kind === 'text') { f.z += f.vz * dt; f.vz *= 0.92; }
      if (f.kind === 'ring') f.r += (f.max - f.r) * Math.min(1, dt * 14);
    }
    this.fx = this.fx.filter((f) => f.life > 0);
  }


}
