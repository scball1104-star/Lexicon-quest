// Engine dev field: the reference implementation of field movement for W2-world.
//  - 48x32 tile map of colored 16 px tiles with solid blocks, cached once into a layer canvas
//  - grid-based 4-direction movement, smoothly interpolated (12 frames walking, 8 running)
//  - steps chain seamlessly while a direction is held (no idle frame between tiles)
//  - two followers trail the leader's exact path (Chrono Trigger / Lufia II caterpillar)
//  - camera follows the leader, clamped to the map bounds, positions rounded to whole pixels
//  - location banner, a sign that opens a typewriter message (scene stack + pushAwait),
//    a door that uses an iris transition, and a pause overlay scene (transparent + onResume)

import { devWindow, DevMenu } from './_devUi.js';
import { hash2d } from '../core/rng.js';
import { ease } from '../core/tween.js';

const TILE = 16;
const MAP_W = 48, MAP_H = 32;
const WALK_FRAMES = 12, RUN_FRAMES = 8;
const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

// Tile kinds: 0 grass, 1 path, 2 water (solid), 3 stone block (solid), 4 sign (solid), 5 door
function buildMap() {
  const m = [];
  for (let y = 0; y < MAP_H; y++) {
    const row = [];
    for (let x = 0; x < MAP_W; x++) {
      let k = 0;
      if (x === 0 || y === 0 || x === MAP_W - 1 || y === MAP_H - 1) k = 3;
      else if (y === 16 || x === 24) k = 1;
      else if (x > 30 && x < 40 && y > 20 && y < 28) k = 2;
      else if (hash2d(x, y, 9) < 0.06 && Math.abs(x - 6) + Math.abs(y - 6) > 3) k = 3;
      row.push(k);
    }
    m.push(row);
  }
  m[8][10] = 4; // sign
  m[4][40] = 5; // door
  m[26][6] = 5; // door back
  for (const [x, y] of [[9, 8], [11, 8], [10, 9], [39, 4], [41, 4], [40, 5], [5, 26], [7, 26], [6, 25]]) m[y][x] = 1;
  return m;
}

const SOLID = new Set([2, 3, 4]);

export class DevFieldScene {
  constructor(engine) {
    this.engine = engine;
    this.map = buildMap();
    this.layer = null;
    this.frame = 0;
    this.banner = { text: 'Dev Field', t: 0 };
    const mk = (id, x, y, color, trim) => ({ id, tx: x, ty: y, px: x * TILE, py: y * TILE, fromX: x * TILE, fromY: y * TILE, toX: x * TILE, toY: y * TILE, t: 0, dur: 0, moving: false, dir: 'down', color, trim, steps: 0 });
    this.leader = mk('hero', 6, 6, '#3d6fd6', '#f2e2b8');
    this.followers = [mk('mira', 6, 5, '#8a4fd0', '#c9b6ff'), mk('bram', 6, 4, '#5a6a80', '#4aa0ff')];
    this.camera = { x: 0, y: 0 };
  }

  enter() {
    const e = this.engine;
    e.audio.music('valley');
    this.layer = this.buildLayer(e.renderer);
    this.updateCamera();
    e.renderer.setBackdrop(null);
    if (window.LQ_DEBUG) {
      LQ_DEBUG.register('devWarp', (x, y) => { this.place(x, y); return [x, y]; });
    }
  }

  exit() { /* layers are garbage-collected with the scene */ }

  onResume(result) {
    if (result === 'title') this.engine.fadeTo(() => this.engine.pop(), { duration: 0.5 });
  }

  // ------------------------------------------------------------- map
  solidAt(x, y) {
    if (x < 0 || y < 0 || x >= MAP_W || y >= MAP_H) return true;
    if (SOLID.has(this.map[y][x])) return true;
    return false;
  }

  buildLayer(r) {
    const L = r.createLayer(MAP_W * TILE, MAP_H * TILE);
    const g = L.ctx;
    for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) {
      const k = this.map[y][x];
      const px = x * TILE, py = y * TILE;
      const h = hash2d(x, y, 1);
      if (k === 0 || k === 5) {
        g.fillStyle = (x + y) % 2 ? '#4f9a46' : '#56a34b'; g.fillRect(px, py, TILE, TILE);
        g.fillStyle = '#6dbb58';
        if (h < 0.5) { g.fillRect(px + 3, py + 4, 1, 2); g.fillRect(px + 10, py + 9, 1, 2); }
        else { g.fillRect(px + 7, py + 3, 1, 2); g.fillRect(px + 12, py + 12, 1, 2); }
      } else if (k === 1) {
        g.fillStyle = (x + y) % 2 ? '#c9a46a' : '#c29c62'; g.fillRect(px, py, TILE, TILE);
        g.fillStyle = '#a8834e'; g.fillRect(px + (h * 12 | 0), py + 5, 2, 1); g.fillRect(px + 4, py + 12, 1, 1);
      } else if (k === 2) {
        g.fillStyle = '#2f6fb3'; g.fillRect(px, py, TILE, TILE);
        g.fillStyle = '#4b8fd0'; g.fillRect(px + 2, py + 4 + (h * 6 | 0), 6, 1);
      } else if (k === 3 || k === 4) {
        g.fillStyle = '#56a34b'; g.fillRect(px, py, TILE, TILE);
        // Block with outline, top highlight and a 1 px drop shadow.
        g.fillStyle = '#14101e'; g.fillRect(px + 1, py + 1, 14, 14);
        g.fillStyle = k === 4 ? '#a0703c' : '#7d7f96'; g.fillRect(px + 2, py + 2, 12, 12);
        g.fillStyle = k === 4 ? '#d09a5c' : '#a7a9c0'; g.fillRect(px + 2, py + 2, 12, 2);
        g.fillStyle = k === 4 ? '#6e4a26' : '#5a5c72'; g.fillRect(px + 2, py + 12, 12, 2);
        if (k === 4) { g.fillStyle = '#f2e2b8'; g.fillRect(px + 4, py + 6, 8, 1); g.fillRect(px + 4, py + 8, 6, 1); }
      }
      if (k === 5) {
        g.fillStyle = '#14101e'; g.fillRect(px + 2, py + 2, 12, 12);
        g.fillStyle = '#6fe3f0'; g.fillRect(px + 4, py + 4, 8, 8);
        g.fillStyle = '#2b8fa0'; g.fillRect(px + 6, py + 6, 4, 4);
      }
    }
    return L;
  }

  // ------------------------------------------------------------- movement
  place(x, y) {
    for (const a of [this.leader, ...this.followers]) {
      Object.assign(a, { tx: x, ty: y, px: x * TILE, py: y * TILE, moving: false, t: 0 });
    }
    this.updateCamera();
  }

  startStep(a, tx, ty, dur) {
    a.fromX = a.tx * TILE; a.fromY = a.ty * TILE;
    if (tx !== a.tx || ty !== a.ty) a.dir = tx > a.tx ? 'right' : tx < a.tx ? 'left' : ty > a.ty ? 'down' : 'up';
    a.tx = tx; a.ty = ty;
    a.toX = tx * TILE; a.toY = ty * TILE;
    a.t = 0; a.dur = dur; a.moving = true; a.steps++;
  }

  tryStep(dir, dur) {
    const L = this.leader;
    L.dir = dir;
    const [dx, dy] = DIRS[dir];
    const nx = L.tx + dx, ny = L.ty + dy;
    if (this.solidAt(nx, ny)) return false;
    // Caterpillar: each follower moves into the tile the actor ahead of it is leaving.
    let prevX = L.tx, prevY = L.ty;
    for (const f of this.followers) {
      const fx = f.tx, fy = f.ty;
      if (fx !== prevX || fy !== prevY) this.startStep(f, prevX, prevY, dur);
      prevX = fx; prevY = fy;
    }
    this.startStep(L, nx, ny, dur);
    return true;
  }

  advance(a) {
    if (!a.moving) return false;
    a.t++;
    const k = Math.min(1, a.t / a.dur);
    a.px = a.fromX + (a.toX - a.fromX) * k;
    a.py = a.fromY + (a.toY - a.fromY) * k;
    if (k >= 1) { a.moving = false; return true; }
    return false;
  }

  update(dt) {
    const e = this.engine;
    const { input } = e;
    this.frame++;
    this.banner.t += dt;

    const running = input.held('run') !== !!e.settings.alwaysRun;
    const dur = running ? RUN_FRAMES : WALK_FRAMES;
    const actors = [this.leader, ...this.followers];
    let arrived = false;
    for (const a of actors) arrived = this.advance(a) || arrived;

    if (!this.leader.moving) {
      if (arrived && this.map[this.leader.ty][this.leader.tx] === 5) { this.useDoor(); return; }
      const dir = input.heldDir();
      if (dir) {
        // Chain into the next step on the frame the last one ended, so every frame moves exactly
        // 16/dur px (no idle frame, no double step). From rest, move on the same frame as the input.
        if (this.tryStep(dir, dur) && !arrived) for (const a of actors) this.advance(a);
      } else if (input.pressed('confirm')) this.interact();
      else if (input.pressed('menu')) { e.audio.sfx('menu_open'); e.push(new DevPauseScene(e)); }
    }
    this.updateCamera();
  }

  interact() {
    const L = this.leader;
    const [dx, dy] = DIRS[L.dir];
    const k = this.map[L.ty + dy] && this.map[L.ty + dy][L.tx + dx];
    if (k === 4) {
      this.engine.audio.sfx('confirm');
      this.engine.pushAwait(new DevMessageScene(this.engine), {
        text: 'Every name is a promise that something will not be forgotten.\n{c:gold}Dev sign:{/c} the field is 48 x 32 tiles; hold {c:cyan}run{/c} to dash.',
      });
    }
  }

  useDoor() {
    const e = this.engine;
    const L = this.leader;
    const dest = L.tx === 40 ? [6, 27] : [40, 5];
    const sx = Math.round(L.px + 8 - this.camera.x), sy = Math.round(L.py + 4 - this.camera.y);
    e.audio.sfx('door_open');
    e.fadeTo(() => { this.place(dest[0], dest[1]); this.leader.dir = 'down'; this.banner = { text: dest[0] === 6 ? 'South Clearing' : 'North Door', t: 0 }; }, { style: 'iris', x: sx, y: sy, duration: 0.8, hold: 0.1 });
  }

  updateCamera() {
    const r = this.engine.renderer;
    const L = this.leader;
    const maxX = MAP_W * TILE - r.W, maxY = MAP_H * TILE - r.H;
    this.camera.x = Math.max(0, Math.min(maxX, Math.round(L.px + TILE / 2 - r.W / 2)));
    this.camera.y = Math.max(0, Math.min(maxY, Math.round(L.py + TILE / 2 - r.H / 2)));
  }

  // ------------------------------------------------------------- draw
  draw(r) {
    r.clear('#14101e');
    r.pushCamera(this.camera.x, this.camera.y);
    r.drawLayer(this.layer, this.camera.x, this.camera.y, r.W, r.H, this.camera.x, this.camera.y);
    // Y-sort; on ties (party stacked on one tile after a warp) the leader draws on top.
    const actors = [...this.followers.slice().reverse(), this.leader].sort((a, b) => a.py - b.py);
    for (const a of actors) this.drawActor(r, a);
    r.popCamera();
    this.drawBanner(r);
  }

  drawActor(r, a) {
    const x = Math.round(a.px), y = Math.round(a.py);
    // A 16x24 "sprite" box standing on its tile: feet at the tile's bottom row.
    const bob = a.moving && Math.floor(a.t / Math.max(1, a.dur / 2)) % 2 === 0 ? 1 : 0;
    r.withAlpha(0.35, () => r.ellipse(x + 8, y + 15, 7, 2, '#14101e')); // soft ground shadow around the feet
    const bx = x, by = y + TILE - 24 - bob;
    r.rect(bx, by, 16, 24, '#14101e');
    r.rect(bx + 1, by + 1, 14, 22, a.color);
    r.rect(bx + 1, by + 1, 14, 6, '#f0c8a0');            // face
    r.rect(bx + 1, by + 7, 14, 2, a.trim);                // collar / scarf
    // Facing marker (eyes / back of head) so direction reads at a glance.
    if (a.dir === 'down') { r.rect(bx + 4, by + 3, 2, 2, '#14101e'); r.rect(bx + 10, by + 3, 2, 2, '#14101e'); }
    else if (a.dir === 'left') r.rect(bx + 3, by + 3, 2, 2, '#14101e');
    else if (a.dir === 'right') r.rect(bx + 11, by + 3, 2, 2, '#14101e');
    else r.rect(bx + 1, by + 1, 14, 5, '#6a4a2a');
    // Step: alternate feet.
    const step = a.moving ? (Math.floor(a.t / (a.dur / 2)) + a.steps) % 2 : -1;
    r.rect(bx + 3, by + 21, 4, 2, step === 0 ? '#2a1e14' : '#3a2a1a');
    r.rect(bx + 9, by + 21, 4, 2, step === 1 ? '#2a1e14' : '#3a2a1a');
  }

  drawBanner(r) {
    const t = this.banner.t;
    if (t > 2.6) return;
    const inK = ease.outCubic(Math.min(1, t / 0.35));
    const outK = t > 2.1 ? ease.inCubic(Math.min(1, (t - 2.1) / 0.4)) : 0;
    const w = Math.max(96, r.measure(this.banner.text, 'large') + 32), h = 20;
    const x = Math.round((r.W - w) / 2);
    const y = Math.round(-h + (h + 10) * inK - (h + 10) * outK);
    devWindow(r, x, y, w, h, { alpha: 0.92 });
    r.text(this.banner.text, r.W / 2, y + 5, { font: 'large', align: 'center' });
  }

  debugState() {
    const p = (a) => ({ x: a.tx, y: a.ty, px: Math.round(a.px), py: Math.round(a.py), dir: a.dir, moving: a.moving });
    return { leader: p(this.leader), followers: this.followers.map(p), camera: { ...this.camera } };
  }
}

/** Typewriter message box (transparent overlay scene). Pop with no result when dismissed. */
class DevMessageScene {
  constructor(engine) { this.engine = engine; this.transparent = true; this.name = '_devMessage'; }
  enter(data) {
    const r = this.engine.renderer;
    this.lines = r.wrap(data.text, r.W - 48);
    this.text = this.lines.join('\n');
    this.total = r.font().length(this.text);
    this.shown = 0; this.frame = 0;
  }
  update() {
    const { input, audio, settings } = this.engine;
    this.frame++;
    const speed = [0, 0.5, 1, 2, 999][settings.textSpeed] || 1;
    if (this.shown < this.total) {
      const before = Math.floor(this.shown);
      this.shown = Math.min(this.total, this.shown + speed);
      if (Math.floor(this.shown) !== before && before % 3 === 0) audio.sfx('text_blip');
      if (input.pressed('confirm') || input.pressed('cancel')) this.shown = this.total;
    } else if (input.pressed('confirm') || input.pressed('cancel')) {
      audio.sfx('confirm');
      this.engine.pop();
    }
  }
  draw(r) {
    const h = Math.max(3, this.lines.length) * 11 + 14;
    const x = 12, y = r.H - h - 8, w = r.W - 24;
    devWindow(r, x, y, w, h, { alpha: 0.94 });
    r.text(this.text, x + 12, y + 7, { chars: Math.floor(this.shown) });
    if (this.shown >= this.total && Math.floor(this.frame / 16) % 2 === 0) r.text('▼', x + w - 16, y + h - 13, { color: 'white' });
  }
}

/** Pause overlay (transparent): Resume / Back to dev title. Demonstrates pop(result) -> onResume(result). */
class DevPauseScene {
  constructor(engine) {
    this.engine = engine; this.transparent = true; this.name = '_devPause'; this.frame = 0;
    this.menu = new DevMenu([{ label: 'Resume', id: 'resume' }, { label: 'Back to dev title', id: 'title' }]);
  }
  update() {
    const { input, audio } = this.engine;
    this.frame++;
    const it = this.menu.update(input, audio);
    if (it) { audio.sfx('confirm'); this.engine.pop(it.id); }
    else if (input.pressed('cancel') || input.pressed('menu')) { audio.sfx('menu_close'); this.engine.pop('resume'); }
  }
  draw(r) {
    r.withAlpha(0.35, () => r.rect(0, 0, r.W, r.H, '#0b0918'));
    const w = 132, h = 44, x = r.W - w - 12, y = 12;
    devWindow(r, x, y, w, h);
    this.menu.draw(r, x + 20, y + 8, this.frame, 13);
  }
}
