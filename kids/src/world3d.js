// 3D view of a Game: blocky studded terrain, models synced from game state each frame, follow camera.
import { T } from './tilemap.js';
import {
  studTex, sideTex, plastic, makeAvatar, poseAvatar, makePet, makeEnemy, makeProp, makePickup, makeShot,
  makePlatform, makeCrumble, makePage, textSprite, iconSprite, makeCrate, makePlate, makeGate, makeLever, makeBrazier, makeReset, makeWeaponModel, makeStairs, makeEmitter, makeMirror, makeCrystal, makeHookPost, makeValve, makeFan, makeVent, makeSlab, makeRock,
} from './models.js';

const THREE = () => window.THREE;
const P = (v) => v / T; // pixels -> tiles

const THEMES = {
  valley: {
    sky: '#8fd0ff', fog: [26, 60], hemi: ['#dff3ff', '#5d7a45', 0.8], sun: 0.95,
    floor: { grass: '#5cc24a', tallgrass: '#3fa23a', dirt: '#c9935a', moss: '#4f9a52', plaza: '#b9b3a8' },
    wall: { top: '#a3a1b2', side: '#8a8898', h: 1.6, low: 0.5, lines: false }, voidCol: '#2a4a3a', baseplate: '#4bb543',
  },
  archive: {
    sky: '#2a1f45', fog: [16, 38], hemi: ['#d8ccff', '#3a2f55', 0.95], sun: 0.55,
    floor: { archive_floor: '#b9b3c8' },
    wall: { top: '#5d5872', side: '#6e6884', h: 2.6, low: 0.6, lines: true }, voidCol: '#120d20',
  },
  hollow: {
    sky: '#7a6aa8', fog: [24, 56], hemi: ['#e6dcff', '#3d4a5a', 0.85], sun: 0.75,
    floor: { grass: '#5aa58c', tallgrass: '#47917a', dirt: '#a89c8c', plaza: '#a3a6bd', moss: '#4f8a76' },
    wall: { top: '#8a86a4', side: '#6e6a8a', h: 1.8, low: 0.5, lines: true }, voidCol: '#232040', baseplate: '#4a9a80',
  },
  emberpeak: {
    sky: '#6a3420', fog: [22, 52], hemi: ['#ffd8c0', '#4a2a20', 0.85], sun: 0.8,
    floor: { plaza: '#8a7a70', dirt: '#6e5444', moss: '#5e4e44', grass: '#7a6a5e', tallgrass: '#6a5a4e' },
    wall: { top: '#4e3e3a', side: '#5e4844', h: 1.8, low: 0.5, lines: true }, voidCol: '#1a0806', lava: true,
  },
  foundry: {
    sky: '#2a1410', fog: [16, 40], hemi: ['#ffd0b0', '#3a2018', 0.9], sun: 0.55,
    floor: { archive_floor: '#7a7078' },
    wall: { top: '#3e3438', side: '#4e4248', h: 2.6, low: 0.6, lines: true }, voidCol: '#120604', lava: true,
  },
  mirror: {
    sky: '#1c2348', fog: [16, 40], hemi: ['#cfd8f5', '#2a3260', 0.85], sun: 0.5,
    floor: { archive_floor: '#9aa6cc' },
    wall: { top: '#4a5688', side: '#5b67a0', h: 2.6, low: 0.6, lines: true }, voidCol: '#0c1028',
  },
  sanctum: {
    sky: '#140d24', fog: [18, 40], hemi: ['#c9b4ff', '#2a1f45', 0.9], sun: 0.6,
    floor: { archive_floor: '#8f82b0' },
    wall: { top: '#3d3358', side: '#4a3f6a', h: 2.8, low: 0.6, lines: true }, voidCol: '#0a0614',
  },
};

export class World3D {
  constructor(canvas) {
    const T3 = THREE();
    this.canvas = canvas;
    this.renderer = new T3.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = T3.PCFSoftShadowMap;
    this.camera = new T3.PerspectiveCamera(42, 16 / 9, 0.1, 200);
    this.resize();
  }

  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.canvas.style.width = w + 'px'; this.canvas.style.height = h + 'px';
    this.camera.aspect = w / h;
    // keep about 15 tiles across on wide phones, more height on narrow screens
    this.camera.fov = w / h > 1.6 ? 40 : 52;
    this.camera.updateProjectionMatrix();
  }

  // ------------------------------------------------------------------ building
  load(game, hero) {
    const T3 = THREE();
    this.game = game;
    this.stairsM = null; this.petBubble = null; this.beams = null; this.beamKey = ''; this.heroCfg = hero; this.pip = null; this.lavaTiles = []; this.lavaMat = null; this.chain = null; this.ringMeshes = [];
    const th = this.theme = THEMES[game.L.theme];
    const scene = this.scene = new T3.Scene();
    scene.background = new T3.Color(th.sky);
    scene.fog = new T3.Fog(th.sky, th.fog[0], th.fog[1]);
    const hemi = new T3.HemisphereLight(th.hemi[0], th.hemi[1], th.hemi[2]); scene.add(hemi);
    const sun = this.sun = new T3.DirectionalLight('#fff4dd', th.sun);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    Object.assign(sun.shadow.camera, { left: -16, right: 16, top: 16, bottom: -16, near: 1, far: 60 });
    sun.shadow.bias = -0.0015;
    scene.add(sun); scene.add(sun.target);
    this.buildTerrain();
    this.objs = new Map();
    this.hero = makeAvatar(hero); scene.add(this.hero.root);
    this.pet = makePet(hero); scene.add(this.pet);
    // boss telegraph lane
    this.lane = new T3.Mesh(new T3.PlaneGeometry(1, 1), new T3.MeshBasicMaterial({ color: '#ff3a2a', transparent: true, opacity: 0.35, depthWrite: false }));
    this.lane.rotation.x = -Math.PI / 2; this.lane.visible = false; scene.add(this.lane);
    this.camPos = null;
    this.time = 0;
  }

  buildTerrain() {
    // Merged chunk meshes: only top faces and exposed sides, 16 columns per chunk so the camera culls the rest.
    const T3 = THREE();
    const g = this.game, map = g.map, th = this.theme;
    const BOTTOM = -2.2;
    const kindAt = (x, z) => {
      if (!map.inside(x, z)) return null;
      const i = map.idx(x, z);
      if (map.wall[i] === 'fake') return 'floor_' + map.terrain[i];   // drawn as a floor; the fake wall is its own fading mesh
      if (map.wall[i]) return z > map.h * 0.6 ? 'wallL' : 'wallH';
      if (map.chars[i] === 'x' || map.chars[i] === 'V' || map.terrain[i] === 'pit') return 'hole';
      if (map.terrain[i] === 'water' || map.terrain[i] === 'deepwater') return 'water';
      if (map.terrain[i] === 'lava') return 'lava';
      return 'floor_' + map.terrain[i];
    };
    const topOf = (k) => (k === null ? 99 : k === 'hole' ? BOTTOM : k === 'water' || k === 'lava' ? -0.7 : k === 'wallH' ? th.wall.h : k === 'wallL' ? th.wall.low : 0);
    const colOf = (k) => (k.startsWith('wall') ? [th.wall.top, th.wall.side, th.wall.lines] : k === 'water' ? ['#3a6a8a', '#3a6a8a', false] : k === 'lava' ? ['#3a1a10', '#3a1a10', false] : [th.floor[k.slice(6)] || Object.values(th.floor)[0], th.floor[k.slice(6)] || Object.values(th.floor)[0], false]);
    const mats = new Map();
    const mat = (key, make) => { if (!mats.has(key)) mats.set(key, make()); return mats.get(key); };
    const CH = 16;
    for (let c0 = 0; c0 < map.w; c0 += CH) {
      const bufs = new Map(); // matKey -> {pos, nor, uv, idx}
      const buf = (key) => { if (!bufs.has(key)) bufs.set(key, { pos: [], nor: [], uv: [], idx: [] }); return bufs.get(key); };
      const quad = (key, v, n, uvs) => {
        const b = buf(key), base = b.pos.length / 3;
        for (let i = 0; i < 4; i++) { b.pos.push(...v[i]); b.nor.push(...n); b.uv.push(...uvs[i]); }
        b.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
      };
      const water = [];
      for (let z = 0; z < map.h; z++) for (let x = c0; x < Math.min(map.w, c0 + CH); x++) {
        const k = kindAt(x, z);
        if (k === 'hole') continue;
        const top = topOf(k);
        const [ct, cs, lines] = colOf(k);
        const tk = 'top' + ct, sk = 'side' + cs + lines;
        mat(tk, () => new T3.MeshLambertMaterial({ map: studTex(ct) }));
        mat(sk, () => new T3.MeshLambertMaterial({ map: sideTex(cs, lines) }));
        quad(tk, [[x, top, z + 1], [x + 1, top, z + 1], [x + 1, top, z], [x, top, z]], [0, 1, 0], [[0, 0], [1, 0], [1, 1], [0, 1]]);
        if (k === 'water') water.push([x, z]);
        if (k === 'lava') (this.lavaTiles || (this.lavaTiles = [])).push([x, z]);
        for (const [dx, dz, n] of [[1, 0, [1, 0, 0]], [-1, 0, [-1, 0, 0]], [0, 1, [0, 0, 1]], [0, -1, [0, 0, -1]]]) {
          const nt = topOf(kindAt(x + dx, z + dz));
          if (nt >= top) continue;
          const lo = Math.max(nt, BOTTOM), hgt = top - lo;
          let v;
          if (dx === 1) v = [[x + 1, lo, z + 1], [x + 1, lo, z], [x + 1, top, z], [x + 1, top, z + 1]];
          if (dx === -1) v = [[x, lo, z], [x, lo, z + 1], [x, top, z + 1], [x, top, z]];
          if (dz === 1) v = [[x, lo, z + 1], [x + 1, lo, z + 1], [x + 1, top, z + 1], [x, top, z + 1]];
          if (dz === -1) v = [[x + 1, lo, z], [x, lo, z], [x, top, z], [x + 1, top, z]];
          quad(sk, v, n, [[0, 0], [1, 0], [1, hgt], [0, hgt]]);
        }
      }
      for (const [key, b] of bufs) {
        const geo = new T3.BufferGeometry();
        geo.setAttribute('position', new T3.Float32BufferAttribute(b.pos, 3));
        geo.setAttribute('normal', new T3.Float32BufferAttribute(b.nor, 3));
        geo.setAttribute('uv', new T3.Float32BufferAttribute(b.uv, 2));
        geo.setIndex(b.idx);
        geo.computeBoundingSphere();
        const m = new T3.Mesh(geo, mats.get(key));
        m.receiveShadow = true; m.castShadow = key.startsWith('side') && key.includes(th.wall.side);
        this.scene.add(m);
      }
      if (water.length) {
        const pos = [], idx = [];
        for (const [x, z] of water) { const b = pos.length / 3; pos.push(x, -0.18, z + 1, x + 1, -0.18, z + 1, x + 1, -0.18, z, x, -0.18, z); idx.push(b, b + 1, b + 2, b, b + 2, b + 3); }
        const geo = new T3.BufferGeometry(); geo.setAttribute('position', new T3.Float32BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeVertexNormals(); geo.computeBoundingSphere();
        if (!this.waterMat) this.waterMat = new T3.MeshPhongMaterial({ color: '#46b4ff', transparent: true, opacity: 0.78, shininess: 90, specular: 0x88ccff });
        this.scene.add(new T3.Mesh(geo, this.waterMat));
      }
    }
    if (this.lavaTiles && this.lavaTiles.length) {
      const pos = [], idx = [];
      for (const [x, z] of this.lavaTiles) { const b = pos.length / 3; pos.push(x, -0.25, z + 1, x + 1, -0.25, z + 1, x + 1, -0.25, z, x, -0.25, z); idx.push(b, b + 1, b + 2, b, b + 2, b + 3); }
      const geo = new T3.BufferGeometry(); geo.setAttribute('position', new T3.Float32BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeVertexNormals(); geo.computeBoundingSphere();
      this.lavaMat = new T3.MeshBasicMaterial({ color: '#ff6a1a', map: studTex('#ff7a1a') });
      this.scene.add(new T3.Mesh(geo, this.lavaMat));
    }
    // the deep below pits
    let vmat;
    if (th.baseplate) {
      const tex = studTex(th.baseplate).clone(); tex.needsUpdate = true; tex.wrapS = tex.wrapT = T3.RepeatWrapping; tex.repeat.set(map.w + 60, map.h + 60);
      vmat = new T3.MeshLambertMaterial({ map: tex });
    } else vmat = new T3.MeshBasicMaterial({ color: th.voidCol });
    const voidPlane = new T3.Mesh(new T3.PlaneGeometry(map.w + 60, map.h + 60), vmat);
    voidPlane.rotation.x = -Math.PI / 2; voidPlane.position.set(map.w / 2, th.baseplate ? -2.2 : -2.4, map.h / 2); voidPlane.receiveShadow = true; this.scene.add(voidPlane);
    // crumble tiles
    // secret fake walls (fade when you are inside) and invisible bridges (appear under your feet)
    this.fakes = []; this.glass = [];
    for (let ty = 0; ty < map.h; ty++) for (let tx = 0; tx < map.w; tx++) {
      const i = map.idx(tx, ty);
      if (map.wall[i] === 'fake') {
        const hgt = ty > map.h * 0.6 ? th.wall.low : th.wall.h;
        const side = new T3.MeshLambertMaterial({ map: sideTex(th.wall.side, th.wall.lines), transparent: true });
        const top = new T3.MeshLambertMaterial({ map: studTex(th.wall.top), transparent: true });
        const m = new T3.Mesh(new T3.BoxGeometry(1, hgt, 1), [side, side, top, side, side, side]);
        m.position.set(tx + 0.5, hgt / 2, ty + 0.5); m.castShadow = true; m.receiveShadow = true;
        this.scene.add(m); this.fakes.push({ tx, ty, m, mats: [side, top], op: 1 });
      }
      if (map.chars[i] === 'V') {
        const m = new T3.Mesh(new T3.BoxGeometry(0.96, 0.25, 0.96), new T3.MeshPhongMaterial({ color: '#bfefff', emissive: '#3aa0ff', transparent: true, opacity: 0.05, shininess: 90 }));
        m.position.set(tx + 0.5, -0.125, ty + 0.5); this.scene.add(m); this.glass.push({ tx, ty, m, op: 0.05 });
      }
    }
    this.sparkles = []; this.nextSparkle = 2;
    this.crumbleMeshes = new Map();
    for (const c of g.crumbles.values()) {
      const m = makeCrumble(); m.scale.y = 1.6; m.position.set(c.tx + 0.5, -0.8, c.ty + 0.5);
      this.scene.add(m); this.crumbleMeshes.set(c, m);
    }
  }

  // ------------------------------------------------------------------ syncing
  track(obj, make) {
    let m = this.objs.get(obj);
    if (!m) { m = make(); this.objs.set(obj, m); this.scene.add(m.root || m); m.__seen = true; }
    m.__alive = this.frameId;
    return m;
  }

  sync(dt) {
    const g = this.game, T3 = THREE();
    this.time += dt; this.frameId = (this.frameId || 0) + 1;
    const p = g.player;
    // hero
    const h = this.hero;
    h.root.position.set(P(p.x), P(p.z), P(p.y));
    h.root.rotation.y = Math.atan2(p.aimX, p.aimY);
    h.setItem(g.itemName === 'Boomerang' && g.shots.some((x) => x.kind === 'rang') ? null : g.itemName);
    poseAvatar(h, { time: this.time, moving: p.walk > 0, air: p.z > 1, atk: p.atk, holding: true });
    if (p.fall > 0) { const k = p.fall / 0.55; h.root.scale.setScalar(Math.max(0.05, k)); h.root.position.y = -(1 - k) * 1.5; }
    else h.root.scale.setScalar(1);
    h.root.visible = !(p.inv > 0 && p.inv < 1.05 && Math.floor(p.inv * 14) % 2 === 0);
    if (g.stairs) {
      const st = g.stairs;
      if (!this.stairsM) {
        this.stairsM = makeStairs(); this.stairsM.position.set(st.tx + 0.5, 0, st.ty + 0.5); this.scene.add(this.stairsM);
        const tag = textSprite(st.label || 'UP!', '#ffd23a', 0.55); tag.position.y = 2.25; this.stairsM.add(tag);
      }
      st.rise = Math.min(1, st.rise + dt * 1.6);
      this.stairsM.scale.set(1, Math.max(0.01, st.rise), 1);
      const gl = this.stairsM.getObjectByName('glow'); gl.material.opacity = 0.4 + Math.sin(this.time * 4) * 0.2;
    }
    if (g.pet) {
      const pt = g.pet;
      if (g.petPower === 'shield') {
        if (!this.petBubble) {
          this.petBubble = new T3.Mesh(new T3.SphereGeometry(0.36, 16, 12), new T3.MeshBasicMaterial({ color: '#7ad0ff', transparent: true, opacity: 0.28, depthWrite: false }));
          this.petBubble.position.y = 0.2; this.pet.add(this.petBubble);
        }
        this.petBubble.visible = g.petShield.ready;
        this.petBubble.scale.setScalar(1 + Math.sin(this.time * 3) * 0.05);
      }
      const tail = this.pet.getObjectByName('tail'); if (tail) tail.rotation.y = Math.sin(this.time * 14) * 0.6;
      this.pet.position.set(P(pt.x), P(pt.z), P(pt.y));
      this.pet.rotation.y = pt.face > 0 ? Math.PI / 2 : -Math.PI / 2;
      const sq = 1 + Math.sin(this.time * 8) * 0.06; this.pet.scale.set(1 / sq, sq, 1 / sq);
    }
    // props
    for (const o of g.props) {
      const m = this.track(o, () => {
        const pr = makeProp(o.id);
        pr.position.set(o.tx + 0.5, 0, o.ty + 0.5);
        pr.traverse((c) => { if (c.isMesh) c.castShadow = true; });
        if (o.id === 'tree_willow' || o.id === 'tree_pine' || o.id === 'bookshelf') {
          // own materials so this tree can fade on its own when it hides the hero
          pr.userData.fadeMats = [];
          pr.traverse((c) => {
            if (!c.isMesh) return;
            const own = (mt) => { const k = mt.clone(); k.transparent = true; pr.userData.fadeMats.push(k); return k; };
            c.material = Array.isArray(c.material) ? c.material.map(own) : own(c.material);
          });
          pr.userData.op = 1;
        }
        return pr;
      });
      m.visible = !o.gone && !o.hidden;
      if (m.userData.fadeMats) {
        const dz = o.ty + 0.5 - P(p.y), dx = Math.abs(o.tx + (o.id === 'tree_pine' ? 0.5 : 1) - P(p.x));
        const blocking = dz > 0 && dz < 3.6 && dx < 1.9;
        m.userData.op += ((blocking ? 0.3 : 1) - m.userData.op) * Math.min(1, dt * 8);
        for (const mt of m.userData.fadeMats) { mt.opacity = m.userData.op; mt.depthWrite = m.userData.op > 0.95; }
      }
      if (o.id === 'lamp_post') { const l = m.getObjectByName('lamp'); l.material.emissive.set(o.lit ? '#ffb020' : '#222222'); }
      if (o.id === 'chest_gold' && o.open) { const lid = m.getObjectByName('lid'); lid.rotation.x = Math.max(-1.9, lid.rotation.x - dt * 6); }
      if (o.id === 'boulder') {
        if (!m.badge) { m.badge = iconSprite(window.__icons?.hammer || ''); m.badge.position.y = 1.5; m.add(m.badge); }
        m.badge.visible = Math.hypot(o.tx + 0.5 - P(p.x), o.ty + 0.5 - P(p.y)) < 4.5;
      }
      if (o.id === 'weapon_pedestal') {
        if (!m.weapon) { m.weapon = makeWeaponModel(o.weapon); m.add(m.weapon); }
        const glow = m.getObjectByName('glow');
        if (o.taken && !o.takenNow) { m.weapon.visible = false; glow.visible = false; }
        else if (o.taken) {
          // fly up and vanish once grabbed
          m.weapon.position.y += dt * 3; m.weapon.scale.multiplyScalar(Math.max(0, 1 - dt * 2.5));
          glow.material.opacity = Math.max(0, glow.material.opacity - dt * 0.6);
          if (m.weapon.scale.x < 0.05) o.takenNow = false;
        } else {
          m.weapon.position.y = 1.35 + Math.sin(this.time * 2.5) * 0.12;
          m.weapon.rotation.y = this.time * 1.6;
          glow.material.opacity = 0.18 + Math.sin(this.time * 4) * 0.08;
        }
      }
      if (o.id === 'secret_chest') {
        const lid = m.getObjectByName('lid'), gem = m.getObjectByName('gem');
        if (o.opened) lid.rotation.x = Math.max(-1.9, lid.rotation.x - dt * 6);
        gem.visible = !o.opened || (o.openedNow && lid.rotation.x > -1.85);
        gem.rotation.y = this.time * 2; gem.position.y = 1.0 + Math.sin(this.time * 3) * 0.08;
      }
      if (o.id === 'prop_thirteenth_bell') { const b = m.getObjectByName('bell'); b.rotation.z = g.done ? Math.sin(this.time * 9) * 0.35 : Math.sin(this.time * 1.5) * 0.05; }
    }
    // pickups
    for (const k of g.pickups) {
      const m = this.track(k, () => makePickup(k));
      const bob = k.z > 0 ? P(k.z) : 0.45 + Math.sin(this.time * 3 + k.bob) * 0.08;
      m.position.set(P(k.x), bob + (k.kind === 'letter' ? 0.35 : 0.15), P(k.y));
      m.rotation.y = this.time * (k.kind === 'coin' ? 3 : 1.2) + k.bob;
    }
    // enemies
    for (const e of g.enemies) {
      const m = this.track(e, () => {
        const en = makeEnemy(e.type);
        if (e.scale) en.root.scale.setScalar(1.9);
        if (e.type === 'archivore') en.root.scale.setScalar(1.25);
        if (e.type === 'king') en.root.scale.setScalar(1.35);
        if (e.type === 'warden') en.root.scale.setScalar(1.45);
        if (en.badge) { en.badgeSprite = iconSprite(window.__icons?.hammer || ''); en.badgeSprite.position.y = 1.9; en.root.add(en.badgeSprite); }
        const stars = new T3.Group(); stars.name = 'stars';
        for (let i = 0; i < 3; i++) { const s = new T3.Mesh(new T3.BoxGeometry(0.1, 0.1, 0.1), plastic('#ffd23a', { emissive: '#aa8800' })); stars.add(s); }
        stars.position.y = e.type === 'golem' ? 1.6 : e.type === 'alpha' ? 0.95 : e.type === 'archivore' ? 2.2 : e.type === 'king' ? 2.5 : e.type === 'warden' ? 2.6 : e.type === 'knight' ? 1.4 : e.type === 'coil' ? 1.7 : 0.8; en.root.add(stars); en.stars = stars;
        en.root.traverse((c) => { if (c.isMesh) c.castShadow = true; });
        return en;
      });
      m.root.position.set(P(e.x) + (e.state === 'windup' ? Math.sin(this.time * 60) * 0.03 : 0), P(e.z), P(e.y));
      let ang = e.face > 0 ? Math.PI / 2 : -Math.PI / 2;
      if ((e.state === 'windup' || e.state === 'charge') && e.cx !== undefined) ang = Math.atan2(e.cx, e.cy);
      else if (e.type === 'golem' || e.type === 'slime') ang = Math.atan2(p.x - e.x, p.y - e.y);
      m.root.rotation.y += (ang - m.root.rotation.y) * Math.min(1, dt * 12);
      const blink = e.state === 'windup' && Math.floor(this.time * 14) % 2;
      m.flash(e.flash > 0 ? '#9a9a9a' : blink ? '#aa1100' : null);
      if (e.type === 'archivore') { const f = e.state === 'dizzy' ? 0.1 : Math.sin(this.time * 7) * 0.35; const wl = m.body.getObjectByName('wingL'), wr = m.body.getObjectByName('wingR'); if (wl) wl.rotation.z = f; if (wr) wr.rotation.z = -f; }
      if (e.type === 'warden') {
        const sh = m.body.getObjectByName('shell'); if (sh) sh.visible = !!e.ward;
        m.root.position.y = P(e.z);
      }
      if (e.type === 'coil') { const c = m.body.getObjectByName('core'); c.scale.setScalar(1 + Math.sin(this.time * 6 + e.hx) * 0.15); }
      if (e.type === 'bat') { const f = Math.sin(this.time * 18 + e.hx) * 0.6; const wl = m.body.getObjectByName('wingL'), wr = m.body.getObjectByName('wingR'); if (wl) wl.rotation.z = f; if (wr) wr.rotation.z = -f; }
      if (e.type === 'king') {
        if (!m.wardM) { m.wardM = new T3.Mesh(new T3.SphereGeometry(1.1, 20, 14), new T3.MeshBasicMaterial({ color: '#bfe0ff', transparent: true, opacity: 0.22, depthWrite: false })); m.wardM.position.y = 1.1; m.root.add(m.wardM); }
        m.wardM.visible = !!e.ward; m.wardM.rotation.y = this.time;
        m.root.position.y = P(e.z) + (e.state === 'dizzy' ? 0 : 0.15 + Math.sin(this.time * 2) * 0.08);
      }
      if (e.type === 'imp') { const c = m.body.getObjectByName('core'); c.rotation.y = this.time * 3; m.root.visible = !(e.state === 'blink' && Math.floor(this.time * 20) % 2); }
      if (e.type === 'page') m.body.rotation.z = Math.sin(this.time * 6 + e.hx) * 0.3;
      if (e.type === 'slime') { const sq = e.z > 0 ? 0.85 : 1 + Math.sin(this.time * 6 + e.hx) * 0.06; m.body.scale.set(1 / sq, sq, 1 / sq); }
      if (e.type === 'golem') { const sh = m.body.getObjectByName('shell'); if (sh) sh.visible = !!e.shell; if (m.badgeSprite) { m.badgeSprite.visible = !!e.shell; m.badgeSprite.position.y = 1.9 + Math.sin(this.time * 4) * 0.06; } }
      const dizzy = e.stun > 0 || e.state === 'dizzy';
      m.stars.visible = dizzy && !e.sleeping;
      if (dizzy) m.stars.children.forEach((s, i) => { const a = this.time * 5 + i * 2.1; s.position.set(Math.cos(a) * 0.35, Math.sin(a * 2) * 0.05, Math.sin(a) * 0.35); });
      if (e.sleeping) m.body.rotation.z = 0;
    }
    // boss lane
    const boss = g.boss;
    if (boss && !boss.dead && boss.state === 'windup') {
      const a = Math.atan2(boss.cx, boss.cy), len = 7.2;
      this.lane.visible = true;
      this.lane.material.opacity = Math.floor(this.time * 12) % 2 ? 0.45 : 0.25;
      this.lane.scale.set(1.6, len, 1);
      this.lane.position.set(P(boss.x) + Math.sin(a) * len / 2, 0.03, P(boss.y) + Math.cos(a) * len / 2);
      this.lane.rotation.set(-Math.PI / 2, 0, a);
    } else this.lane.visible = false;
    // shots
    for (const s of g.shots) {
      const m = this.track(s, () => makeShot(s));
      m.position.set(P(s.x), P(s.z) + 0.3, P(s.y));
      if (s.kind === 'thorn') m.rotation.y = Math.atan2(s.vx, s.vy);
      if (s.kind === 'rang') m.getObjectByName('spin').rotation.y = this.time * 22;
      if (s.kind === 'shard') m.getObjectByName('spin').rotation.y = this.time * 8;
      if (s.kind === 'hook') m.getObjectByName('spin').rotation.y = -Math.atan2(s.vy, s.vx) + Math.PI / 2;
    }
    // falling pages + their shadows
    for (const hz of g.hazards) {
      const m = this.track(hz, () => {
        const grp = new T3.Group();
        const page = this.theme.lava ? makeRock() : makePage(); page.name = 'page'; grp.add(page);
        const sh = new T3.Mesh(new T3.CircleGeometry(0.5, 20), new T3.MeshBasicMaterial({ color: '#000000', transparent: true, opacity: 0.35, depthWrite: false }));
        sh.rotation.x = -Math.PI / 2; sh.position.y = 0.02; sh.name = 'shadow'; grp.add(sh);
        const ring = new T3.Mesh(new T3.RingGeometry(0.62, 0.74, 24), new T3.MeshBasicMaterial({ color: '#ff3a2a', transparent: true, opacity: 0.8, depthWrite: false }));
        ring.rotation.x = -Math.PI / 2; ring.position.y = 0.03; ring.name = 'ring'; grp.add(ring);
        return grp;
      });
      m.position.set(P(hz.x), 0, P(hz.y));
      const k = Math.min(1, hz.t / hz.warn);
      const page = m.getObjectByName('page');
      page.position.y = hz.landed ? 0.05 : (1 - k) * 8 + 0.05;
      page.rotation.y = this.time * 3; page.rotation.z = hz.landed ? 0 : Math.sin(this.time * 8) * 0.3;
      m.getObjectByName('shadow').scale.setScalar(0.3 + 0.7 * k);
      m.getObjectByName('ring').visible = !hz.landed && Math.floor(this.time * 10) % 2 === 0;
      if (hz.landed) page.traverse((c) => { if (c.material) { c.material.transparent = true; c.material.opacity = Math.max(0, hz.life / 0.35); } });
    }
    // platforms
    for (const pl of g.platforms) {
      const m = this.track(pl, () => makePlatform(pl.w / T, pl.h / T, !!pl.raft, this.theme.lava && pl.raft ? 'cart' : ''));
      m.position.set(P(pl.x), pl.raft ? Math.sin(this.time * 2 + pl.x0) * 0.03 : 0, P(pl.y));
    }
    // puzzles
    for (const b of g.blocks) {
      const m = this.track(b, () => makeCrate());
      m.position.set(b.px + 0.5, b.sunk ? -0.52 : 0.47, b.py + 0.5);
    }
    for (const pl of g.plates) {
      const m = this.track(pl, () => { const o = makePlate(); o.position.set(pl.tx + 0.5, 0, pl.ty + 0.5); return o; });
      const top = m.getObjectByName('top');
      top.position.y = pl.pressed ? 0.04 : 0.1;
      top.material.color.set(pl.pressed ? '#4fd36a' : '#ffc83a'); top.material.emissive.set(pl.pressed ? '#0a5a20' : '#664400');
    }
    for (const gt of g.gates) {
      const m = this.track(gt, () => { const o = makeGate(); o.position.set(gt.tx + 0.5, 0, gt.ty + 0.5); return o; });
      m.position.y += ((gt.open ? -2.3 : 0) - m.position.y) * Math.min(1, dt * 6);
    }
    for (const lv of g.levers) {
      const m = this.track(lv, () => { const o = makeLever(); o.position.set(lv.tx + 0.5, 0, lv.ty + 0.5); return o; });
      const arm = m.getObjectByName('arm'); arm.rotation.z += ((lv.on ? -0.6 : 0.6) - arm.rotation.z) * Math.min(1, dt * 10);
      m.getObjectByName('knob').material.color.set(lv.on ? '#4fd36a' : '#ff4a4a');
    }
    for (const br of g.braziers) {
      const m = this.track(br, () => { const o = makeBrazier(); o.position.set(br.tx + 0.5, 0, br.ty + 0.5); return o; });
      const f = m.getObjectByName('fire'); f.visible = br.lit;
      if (br.lit) { const k = 1 + Math.sin(this.time * 14 + br.tx) * 0.12; f.scale.set(1, k, 1); }
    }
    // light-beam puzzles
    for (const em of g.emitters) this.track(em, () => { const o = makeEmitter(em.dir); o.position.set(em.tx + 0.5, 0, em.ty + 0.5); o.traverse((c) => { if (c.isMesh) c.castShadow = true; }); return o; });
    for (const mi of g.mirrors) {
      const m = this.track(mi, () => { const o = makeMirror(mi.fixed); o.position.set(mi.tx + 0.5, 0, mi.ty + 0.5); o.traverse((c) => { if (c.isMesh) c.castShadow = true; }); return o; });
      const pv = m.getObjectByName('pivot'), target = mi.orient === 0 ? Math.PI / 4 : -Math.PI / 4;
      pv.rotation.y += (target - pv.rotation.y) * Math.min(1, dt * 12);
      if (mi.auto) { const gl = pv.children[1]; gl.material.emissive.set(mi.warn && Math.floor(this.time * 12) % 2 ? '#c83a2a' : '#4a6a9a'); }
    }
    for (const cr of g.crystals) {
      const m = this.track(cr, () => { const o = makeCrystal(); o.position.set(cr.tx + 0.5, 0, cr.ty + 0.5); return o; });
      const gem = m.getObjectByName('gem');
      gem.rotation.y = this.time * (cr.lit ? 2.5 : 0.6);
      gem.material.emissive.set(cr.lit ? '#3aa0ff' : '#103050'); gem.material.color.set(cr.lit ? '#bff0ff' : '#7ad0ff');
    }
    if (g.emitters.length) {
      const key = g.emitters.map((em) => (em.hazard ? (em.on ? 'H' : 'w') : 'P') + em.path.map((q) => q.join(',')).join(';')).join('|');
      if (key !== this.beamKey) {
        this.beamKey = key;
        if (this.beams) this.scene.remove(this.beams);
        this.beams = new T3.Group();
        const mats = {
          P: [new T3.MeshBasicMaterial({ color: '#fff7c0' }), new T3.MeshBasicMaterial({ color: '#ffd84a', transparent: true, opacity: 0.35, depthWrite: false })],
          H: [new T3.MeshBasicMaterial({ color: '#ffd0c8' }), new T3.MeshBasicMaterial({ color: '#ff3a2a', transparent: true, opacity: 0.45, depthWrite: false })],
          w: [new T3.MeshBasicMaterial({ color: '#ff8a7a', transparent: true, opacity: 0.35, depthWrite: false }), new T3.MeshBasicMaterial({ color: '#ff3a2a', transparent: true, opacity: 0.08, depthWrite: false })],
        };
        for (const em of g.emitters) for (let i = 1; i < em.path.length; i++) {
          const [core, glow] = mats[em.hazard ? (em.on ? 'H' : 'w') : 'P'];
          const [ax, ay] = em.path[i - 1], [bx, by] = em.path[i];
          const len = Math.hypot(bx - ax, by - ay); if (len < 0.01) continue;
          for (const [mat, th] of [[core, 0.08], [glow, 0.22]]) {
            const b = new T3.Mesh(new T3.BoxGeometry(len, th, th), mat);
            b.position.set((ax + bx) / 2, em.hazard ? 0.35 : 0.67, (ay + by) / 2); b.rotation.y = -Math.atan2(by - ay, bx - ax);
            this.beams.add(b);
          }
        }
        this.scene.add(this.beams);
      }
      if (this.beams) this.beams.children.forEach((b, i) => { if (i % 2) b.scale.set(1, 1 + Math.sin(this.time * 10) * 0.2, 1 + Math.sin(this.time * 10) * 0.2); });
    }
    // Emberpeak
    if (this.lavaMat) this.lavaMat.color.setHSL(0.06, 1, 0.5 + Math.sin(this.time * 2) * 0.06);
    for (const q of g.posts) {
      const m = this.track(q, () => { const o = makeHookPost(); o.position.set(q.tx + 0.5, 0, q.ty + 0.5); return o; });
      const near = g.itemName === 'Hook' && Math.hypot(q.tx + 0.5 - P(p.x), q.ty + 0.5 - P(p.y)) < (g.upgrades.hookplus ? 9.5 : 7.5);
      const ring = m.getObjectByName('ring'); ring.rotation.y = this.time * 2; ring.scale.setScalar(near ? 1.2 + Math.sin(this.time * 6) * 0.1 : 1);
    }
    for (const v of g.valves) {
      const m = this.track(v, () => { const o = makeValve(); o.position.set(v.tx + 0.5, 0, v.ty + 0.5); return o; });
      const w = m.getObjectByName('wheel'); if (v.on && w.rotation.y < Math.PI * 2) w.rotation.y += dt * 8;
      m.getObjectByName('rim').material.color.set(v.on ? '#4fd36a' : '#e0352b');
    }
    for (const f of g.fans) {
      const m = this.track(f, () => { const o = makeFan(f.dir); o.position.set(f.tx + 0.5, 0, f.ty + 0.5); return o; });
      m.getObjectByName('blades').rotation.z = f.spin;
      const l = m.getObjectByName('light'); l.material.color.set(f.on ? '#4fd36a' : '#e0352b'); l.material.emissive.set(f.on ? '#1a6a2a' : '#5a1010');
      if (f.on && f.lane && Math.random() < dt * 14) {
        const D = { N: [0, -1], E: [1, 0], S: [0, 1], W: [-1, 0] }[f.dir], k = 1 + Math.random() * f.lane;
        g.fx.push({ kind: 'dot', x: (f.tx + 0.5 + D[0] * k) * T + (Math.random() - 0.5) * 10, y: (f.ty + 0.5 + D[1] * k) * T + (Math.random() - 0.5) * 8, z: 4 + Math.random() * 8, vx: D[0] * 90, vy: D[1] * 90, vz: 0, life: 0.35, color: '#f4f4f4' });
      }
    }
    for (const v of g.vents) {
      const m = this.track(v, () => { const o = makeVent(); o.position.set(v.tx + 0.5, 0, v.ty + 0.5); return o; });
      m.getObjectByName('glow').material.opacity = v.state === 'warn' ? 0.5 + Math.sin(this.time * 20) * 0.3 : v.state === 'puff' ? 0.9 : 0;
      const st = m.getObjectByName('steam'); st.visible = v.state === 'puff'; st.scale.set(1 + Math.sin(this.time * 18) * 0.06, 1, 1 + Math.cos(this.time * 18) * 0.06);
    }
    for (const sl of g.slabs) {
      const m = this.track(sl, () => { const o = makeSlab(); o.position.set(sl.tx + 0.5, 0, sl.ty + 0.5); return o; });
      m.position.y = -0.9 + sl.rise * 0.9;
    }
    // fire rings
    while (this.ringMeshes.length < g.rings.length) {
      const r = new T3.Mesh(new T3.RingGeometry(0.9, 1, 40), new T3.MeshBasicMaterial({ color: '#ff7a1a', transparent: true, opacity: 0.85, depthWrite: false, side: T3.DoubleSide }));
      r.rotation.x = -Math.PI / 2; this.scene.add(r); this.ringMeshes.push(r);
    }
    this.ringMeshes.forEach((r, i) => {
      const ring = g.rings[i]; r.visible = !!ring;
      if (ring) { r.position.set(P(ring.x), 0.15, P(ring.y)); const rr = P(ring.r); r.scale.set(rr, rr, rr); r.material.opacity = Math.min(0.85, ring.life * 1.5); }
    });
    // grapple chain from hand to hook
    const hk = g.shots.find((x) => x.kind === 'hook');
    if (hk || p.zip) {
      if (!this.chain) { this.chain = new T3.Mesh(new T3.BoxGeometry(1, 0.05, 0.05), new T3.MeshBasicMaterial({ color: '#c9ccd6' })); this.scene.add(this.chain); }
      const ax = P(p.x), ay = P(p.z) + 0.7, az = P(p.y);
      const tx = hk ? P(hk.x) : (this.lastHook ? this.lastHook[0] : ax), tz = hk ? P(hk.y) : (this.lastHook ? this.lastHook[1] : az), ty = 0.7;
      if (hk) this.lastHook = [tx, tz];
      const len = Math.hypot(tx - ax, ty - ay, tz - az);
      this.chain.visible = len > 0.1; this.chain.scale.x = len;
      this.chain.position.set((ax + tx) / 2, (ay + ty) / 2, (az + tz) / 2);
      this.chain.rotation.set(0, -Math.atan2(tz - az, tx - ax), Math.atan2(ty - ay, Math.hypot(tx - ax, tz - az)));
    } else if (this.chain) { this.chain.visible = false; this.lastHook = null; }
    for (const r of g.resets) {
      const m = this.track(r, () => { const o = makeReset(); o.position.set(r.tx + 0.5, 0.03, r.ty + 0.5); return o; });
      m.rotation.z = this.time * 2;
    }
    // the Ferry Race rival
    if (g.rival) {
      const r = g.rival;
      if (!this.pip) {
        const cfg = r.kind === 'bram' ? { skinHex: '#c88a5a', hairHex: '#3a2418', outfitHex: '#8a5a2b', pantsHex: '#3a3440', hat: 'Miner', item: null } : r.kind === 'mirror'
          ? { ...this.heroCfg, skin: null, hair: null, outfit: null, skinHex: '#dfe8ff', hairHex: '#9fb4e8', outfitHex: '#c9d3ec', pantsHex: '#8a90b0', item: null }
          : { skinHex: '#f2c49b', hairHex: '#e8822f', outfitHex: '#2fa34a', pantsHex: '#2c3550', hat: 'Cap', item: null };
        this.pip = makeAvatar(cfg); this.scene.add(this.pip.root);
        if (r.kind === 'mirror') this.pip.mats.forEach((mt) => { mt.emissive.set('#2a3a6a'); });
        this.pipTag = textSprite(r.kind === 'mirror' ? 'MIRROR YOU' : r.kind === 'bram' ? 'BRAM' : 'PIP', r.kind === 'mirror' ? '#bfe0ff' : r.kind === 'bram' ? '#ffb070' : '#4fd36a', 0.6); this.pipTag.position.y = 2.2; this.pip.root.add(this.pipTag);
      }
      this.pip.root.position.set(P(r.x), P(r.z), P(r.y));
      this.pip.root.rotation.y = [0, -Math.PI / 2, Math.PI / 2, Math.PI][r.face];
      poseAvatar(this.pip, { time: this.time + 1.1, moving: r.started && !r.done, air: r.z > 2 });
    }
    // crumbles
    for (const [c, m] of this.crumbleMeshes) {
      m.visible = c.state !== 'gone';
      const shake = c.state === 'crack' && c.t < 0.6;
      m.position.x = c.tx + 0.5 + (shake ? Math.sin(this.time * 70) * 0.04 : 0);
      m.position.y = -0.8 + (c.state === 'crack' ? -0.03 : 0);
    }
    // effects
    for (const f of g.fx) {
      const m = this.track(f, () => this.makeFx(f));
      if (f.kind === 'dot') { m.position.set(P(f.x), P(f.z) + 0.2, P(f.y)); m.scale.setScalar(Math.max(0.2, f.life * 2)); }
      if (f.kind === 'text') { m.position.set(P(f.x), 2.1 + P(f.z) * 0.6, P(f.y)); m.material.opacity = Math.min(1, f.life * 3); }
      if (f.kind === 'ring') { m.position.set(P(f.x), 0.05, P(f.y)); m.scale.setScalar(P(f.r) * 1.6); m.material.opacity = Math.max(0, f.life * 3); }
      if (f.kind === 'poof') { m.position.set(P(f.x), 0.4, P(f.y)); m.scale.setScalar(0.4 + (0.35 - f.life) * 4); m.material.opacity = f.life * 2.5; }
      if (f.kind === 'spark') { m.position.set(P(f.x), 0.6, P(f.y)); }
    }
    // remove what left the game
    for (const [obj, m] of this.objs) {
      if (m.__alive !== this.frameId) { this.scene.remove(m.root || m); this.objs.delete(obj); }
    }
    // water shimmer
    if (this.waterMat) this.waterMat.opacity = 0.74 + Math.sin(this.time * 2) * 0.05;
    this.updateSecrets(dt);
    this.updateCamera(dt);
  }

  updateSecrets(dt) {
    const T3 = THREE(), p = this.game.player, px = P(this.game.player.x), pz = P(this.game.player.y);
    for (const f of this.fakes) {
      const near = Math.hypot(f.tx + 0.5 - px, f.ty + 0.5 - pz) < 1.6;
      const want = near ? 0.22 : 1;
      f.op += (want - f.op) * Math.min(1, dt * 8);
      for (const m of f.mats) { m.opacity = f.op; m.depthWrite = f.op > 0.95; }
    }
    for (const g of this.glass) {
      const d = Math.hypot(g.tx + 0.5 - px, g.ty + 0.5 - pz);
      const want = d < 1.4 && p.fall <= 0 ? 0.6 : 0.05;
      g.op += (want - g.op) * Math.min(1, dt * 6);
      g.m.material.opacity = g.op;
    }
    // the only clue: now and then a fake wall near you gives off a tiny sparkle
    this.nextSparkle -= dt;
    if (this.nextSparkle <= 0 && this.fakes.length) {
      this.nextSparkle = 1.6 + Math.random() * 1.6;
      const close = this.fakes.filter((f) => Math.abs(f.tx - px) < 10 && Math.abs(f.ty - pz) < 9);
      if (close.length) {
        const f = close[Math.floor(Math.random() * close.length)];
        const m = new T3.Mesh(new T3.BoxGeometry(0.08, 0.08, 0.08), new T3.MeshBasicMaterial({ color: '#ffffff', transparent: true }));
        m.position.set(f.tx + 0.2 + Math.random() * 0.6, (f.m.geometry.parameters.height || 1) + 0.1, f.ty + 0.8);
        this.scene.add(m); this.sparkles.push({ m, life: 1.2 });
      }
    }
    for (const sp of this.sparkles) { sp.life -= dt; sp.m.position.y += dt * 0.5; sp.m.rotation.y += dt * 4; sp.m.material.opacity = Math.max(0, sp.life / 1.2); }
    this.sparkles = this.sparkles.filter((sp) => { if (sp.life > 0) return true; this.scene.remove(sp.m); return false; });
  }

  makeFx(f) {
    const T3 = THREE();
    if (f.kind === 'dot') return new T3.Mesh(new T3.BoxGeometry(0.1, 0.1, 0.1), plastic(f.color));
    if (f.kind === 'text') return textSprite(f.text, f.color);
    if (f.kind === 'ring') { const m = new T3.Mesh(new T3.RingGeometry(0.8, 1, 32), new T3.MeshBasicMaterial({ color: f.color, transparent: true, depthWrite: false })); m.rotation.x = -Math.PI / 2; return m; }
    if (f.kind === 'poof') return new T3.Mesh(new T3.SphereGeometry(0.5, 10, 8), new T3.MeshBasicMaterial({ color: '#ffffff', transparent: true, depthWrite: false }));
    return new T3.Mesh(new T3.BoxGeometry(0.15, 0.15, 0.15), plastic('#ffffff', { emissive: '#ffffff' }));
  }

  updateCamera(dt) {
    const g = this.game, p = g.player, map = g.map;
    const tx = Math.max(7.5, Math.min(map.w - 7.5, P(p.x) + p.aimX * 1.2));
    const tz = Math.max(4, Math.min(map.h - 3, P(p.y)));
    const wide = this.camera.aspect > 1.6;
    const off = wide ? [0, 7.4, 6.4] : [0, 9.6, 8.2];
    const want = { x: tx + off[0], y: off[1], z: tz + off[2] };
    if (!this.camPos) this.camPos = { ...want, lx: tx, lz: tz };
    const k = 1 - Math.pow(0.002, dt);
    const c = this.camPos;
    c.x += (want.x - c.x) * k; c.y += (want.y - c.y) * k; c.z += (want.z - c.z) * k;
    c.lx += (tx - c.lx) * k; c.lz += (tz - c.lz) * k;
    const shake = g.shake ? (Math.random() - 0.5) * g.shake * 0.04 : 0;
    this.camera.position.set(c.x + shake, c.y + shake, c.z);
    this.camera.lookAt(c.lx, 0.6, c.lz);
    // sun follows the action so shadows stay sharp
    this.sun.position.set(c.lx - 6, 14, c.lz + 6);
    this.sun.target.position.set(c.lx, 0, c.lz);
  }

  render() { if (this.scene) this.renderer.render(this.scene, this.camera); }
}

/** Small separate renderer for menus: the hero creator turntable and snapshot images. */
export class Showcase {
  constructor(canvas) {
    const T3 = THREE();
    this.renderer = new T3.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.scene = new T3.Scene();
    this.scene.add(new T3.HemisphereLight('#ffffff', '#6a7a8a', 0.95));
    const d = new T3.DirectionalLight('#ffffff', 0.7); d.position.set(3, 6, 5); this.scene.add(d);
    this.camera = new T3.PerspectiveCamera(30, 1, 0.1, 50);
    const base = new T3.Mesh(new T3.CylinderGeometry(1.1, 1.1, 0.3, 24), new T3.MeshLambertMaterial({ map: studTex('#5cc24a') }));
    base.position.y = -0.15; this.scene.add(base); this.base = base;
    this.t = 0;
  }
  setHero(cfg) {
    if (this.av) this.scene.remove(this.av.root);
    if (this.petM) this.scene.remove(this.petM);
    this.av = makeAvatar(cfg); this.scene.add(this.av.root);
    this.petM = makePet(cfg); this.petM.position.set(0.68, 0, 0.45); this.petM.rotation.y = -0.5; this.scene.add(this.petM);
  }
  size(w, h) { this.renderer.setSize(w, h, false); this.camera.aspect = w / h; this.camera.updateProjectionMatrix(); }
  frame(dt, spin = true) {
    if (!this.av) return;
    this.t += dt;
    if (spin) this.av.root.rotation.y = Math.sin(this.t * 0.8) * 0.9;
    poseAvatar(this.av, { time: this.t, moving: false, holding: true });
    this.petM.position.y = Math.abs(Math.sin(this.t * 4)) * 0.12;
    // back the camera up on narrow canvases so the hero and pet always fit side to side
    const halfW = 1.35, halfH = 1.25;
    const tanV = Math.tan((this.camera.fov * Math.PI / 180) / 2);
    const dist = Math.max(4.4, halfH / tanV, halfW / (tanV * this.camera.aspect));
    this.camera.position.set(0, 0.95 + dist * 0.06, dist); this.camera.lookAt(0, 0.75, 0);
    this.renderer.render(this.scene, this.camera);
  }
  /** A pet on its own, as a data URL (Pet Shop cards). */
  petPortrait(cfg, size = 128) {
    const T3 = THREE();
    const sc = new T3.Scene();
    sc.add(new T3.HemisphereLight('#ffffff', '#8a8aa0', 1.0));
    const d = new T3.DirectionalLight('#ffffff', 0.6); d.position.set(2, 4, 5); sc.add(d);
    const pet = makePet(cfg); pet.rotation.y = 0.6; sc.add(pet);
    const cam = new T3.PerspectiveCamera(30, 1, 0.1, 20);
    cam.position.set(0, 0.75, 1.45); cam.lookAt(0, 0.24, 0);
    this.renderer.setSize(size, size, false);
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.render(sc, cam);
    const url = this.renderer.domElement.toDataURL();
    this.renderer.domElement._w = 0;
    return url;
  }
  /** Head-and-shoulders portrait as a data URL (hint bubbles, map badge). */
  portrait(cfg, size = 128, full = false) {
    const T3 = THREE();
    const av = makeAvatar(cfg);
    const sc = new T3.Scene();
    sc.add(new T3.HemisphereLight('#ffffff', '#8a8aa0', 1.0));
    const d = new T3.DirectionalLight('#ffffff', 0.6); d.position.set(2, 4, 5); sc.add(d);
    sc.add(av.root); av.root.rotation.y = 0.35;
    poseAvatar(av, { time: 0, moving: false, holding: false });
    const cam = new T3.PerspectiveCamera(full ? 32 : 26, 1, 0.1, 50);
    if (full) { cam.position.set(0, 0.95, 3.6); cam.lookAt(0, 0.85, 0); } else { cam.position.set(0, 1.62, 1.6); cam.lookAt(0, 1.45, 0); }
    this.renderer.setSize(size, size, false);
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.render(sc, cam);
    const url = this.renderer.domElement.toDataURL();
    this.renderer.domElement._w = 0; // the creator preview re-sizes itself next frame
    return url;
  }
}
