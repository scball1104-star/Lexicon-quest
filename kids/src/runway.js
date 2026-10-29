// Runway: a styling contest. A theme is called, you have 90 seconds to dress, then everyone walks the runway
// and three NPC judges hold up 1-5 stars. Solo version: you against three NPC models.
import { makeAvatar, poseAvatar, studTex, plastic } from './models.js';
import { ADJ, NOUN } from './avatar.js';

const THREE = () => window.THREE;

export const COLORS = {
  Red: '#e0352b', Orange: '#f08a24', Yellow: '#f5c82e', Green: '#2fa34a', Teal: '#1fb5a8', Blue: '#2f6fe0', Purple: '#8a4fd8',
  Pink: '#f26fae', White: '#f4f4f4', Black: '#2b2b36', Brown: '#7a4a26', Silver: '#b8bcc8', Gold: '#e8b330',
};
// every non-colour item carries the tags a theme can ask for
export const CATALOG = {
  hat: {
    None: [], Cap: ['sporty'], Bow: ['cute', 'fancy'], Flower: ['spring', 'beach', 'cute'], Bunny: ['cute', 'spring', 'animal'], Horns: ['spooky', 'monster'],
    Wizard: ['magic', 'school'], Crown: ['royal', 'fancy'], Pirate: ['pirate'], Astro: ['space', 'explorer'], Tiara: ['royal', 'fancy', 'fairy'],
    Witch: ['spooky', 'magic'], Beanie: ['snow', 'cozy'], Sunhat: ['beach', 'summer', 'spring'], Chef: ['food'], Captain: ['pirate', 'sea'],
  },
  acc: {
    None: [], Cape: ['royal', 'hero', 'spooky'], Wings: ['fairy', 'magic', 'cute'], Scarf: ['snow', 'cozy'], Backpack: ['explorer', 'space', 'school'],
    Glasses: ['school', 'food'], Necklace: ['fancy', 'royal', 'party'],
  },
  pattern: { Plain: [], Stripes: ['pirate', 'sea', 'sporty'], Dots: ['cute', 'party', 'food'], Stars: ['space', 'magic', 'party', 'hero'], Hearts: ['cute', 'fairy'] },
  face: { None: [], Whiskers: ['animal', 'monster', 'cute'], Star: ['party', 'magic', 'hero'], Blush: ['cute', 'fancy', 'fairy'], Freckles: ['summer', 'cozy', 'explorer'] },
  pose: { Wave: [], Peace: [], Hero: [], Twirl: [], Bow: [] },
};
export const RUNWAY_HATS = ['Pirate', 'Astro', 'Tiara', 'Witch', 'Beanie', 'Sunhat', 'Chef'];

export const THEMES = [
  { name: 'Pirate Party', tags: ['pirate', 'sea'], colors: ['Red', 'Black', 'White', 'Gold'] },
  { name: 'Space Explorer', tags: ['space', 'explorer'], colors: ['White', 'Silver', 'Blue', 'Black'] },
  { name: 'Royal Ball', tags: ['royal', 'fancy'], colors: ['Purple', 'Gold', 'Pink', 'White'] },
  { name: 'Snow Day', tags: ['snow', 'cozy'], colors: ['White', 'Blue', 'Red', 'Silver'] },
  { name: 'Monster Mash', tags: ['monster', 'spooky', 'animal'], colors: ['Green', 'Purple', 'Black', 'Orange'] },
  { name: 'Beach Day', tags: ['beach', 'summer'], colors: ['Yellow', 'Teal', 'Orange', 'Pink'] },
  { name: 'Superhero', tags: ['hero', 'sporty'], colors: ['Red', 'Blue', 'Yellow', 'Gold'] },
  { name: 'Magic School', tags: ['magic', 'school'], colors: ['Purple', 'Blue', 'Black', 'Gold'] },
  { name: 'Sports Day', tags: ['sporty', 'party'], colors: ['Red', 'Blue', 'White', 'Green'] },
  { name: 'Garden Party', tags: ['spring', 'cute'], colors: ['Pink', 'Green', 'Yellow', 'White'] },
  { name: 'Bake-Off', tags: ['food', 'cozy'], colors: ['White', 'Pink', 'Brown', 'Yellow'] },
  { name: 'Fairy Tale', tags: ['fairy', 'magic', 'royal'], colors: ['Pink', 'Purple', 'Teal', 'Silver'] },
  { name: 'Jungle Explorer', tags: ['explorer', 'animal'], colors: ['Green', 'Brown', 'Yellow', 'Orange'] },
  { name: 'Rock Star', tags: ['party', 'fancy'], colors: ['Black', 'Red', 'Purple', 'Silver'] },
  { name: 'Cozy Pajamas', tags: ['cozy', 'cute'], colors: ['Blue', 'Pink', 'White', 'Purple'] },
  { name: 'Under the Sea', tags: ['sea', 'beach'], colors: ['Teal', 'Blue', 'Orange', 'Silver'] },
];

const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

export function defaultLook(hero) {
  return { top: 'Blue', pattern: 'Plain', bottoms: 'Black', shoes: 'White', hat: hero.hat in CATALOG.hat ? hero.hat : 'None', acc: 'None', face: 'None', pose: 'Wave' };
}

/** Avatar config for a look: the hero's skin and hair, the look's clothes. */
export function lookCfg(hero, look) {
  return {
    ...hero, outfit: null, outfitHex: COLORS[look.top], pantsHex: COLORS[look.bottoms], shoesHex: COLORS[look.shoes],
    pattern: look.pattern, hat: look.hat, acc: look.acc, face: look.face, item: null,
  };
}

/** How well a look fits the theme: 0..1. */
export function lookFit(look, theme) {
  const hit = (slot) => CATALOG[slot][look[slot]].some((t) => theme.tags.includes(t));
  const tags = ['hat', 'acc', 'pattern', 'face'].filter(hit).length;
  const colors = ['top', 'bottoms', 'shoes'].filter((k) => theme.colors.includes(look[k])).length;
  const effort = (look.hat !== 'None' ? 0.5 : 0) + (look.acc !== 'None' ? 0.5 : 0);
  return (tags * 1.2 + colors * 0.8 + effort) / 8.2;
}

/** Three judges: each gives 1-5 stars around the look's fit. */
export function judge(look, theme) {
  const f = lookFit(look, theme);
  return [0, 1, 2].map(() => Math.max(1, Math.min(5, Math.round(1 + f * 4 + rnd(-0.7, 0.7)))));
}

/** An NPC model: picks theme items with some skill, the rest at random. */
export function npcModel(theme) {
  const skill = rnd(0.25, 0.85);
  const want = (slot) => {
    const good = Object.entries(CATALOG[slot]).filter(([, t]) => t.some((x) => theme.tags.includes(x))).map(([k]) => k);
    return good.length && Math.random() < skill ? pick(good) : pick(Object.keys(CATALOG[slot]));
  };
  const col = () => (Math.random() < skill ? pick(theme.colors) : pick(Object.keys(COLORS)));
  const look = { top: col(), pattern: want('pattern'), bottoms: col(), shoes: col(), hat: want('hat'), acc: want('acc'), face: want('face'), pose: pick(Object.keys(CATALOG.pose)) };
  const hero = {
    name: pick(ADJ) + ' ' + pick(NOUN), skin: pick(['Classic', 'Peach', 'Tan', 'Brown', 'Deep']), hair: pick(['Brown', 'Black', 'Blonde', 'Red', 'Pink', 'Blue']),
  };
  return { hero, look };
}

/** The 3D stage: a podium for dressing, a runway for the show. */
export class RunwayStage {
  constructor(canvas) {
    const T3 = THREE();
    this.renderer = new T3.WebGLRenderer({ canvas, antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.scene = new T3.Scene();
    this.scene.background = new T3.Color('#2a1f45');
    this.scene.add(new T3.HemisphereLight('#ffffff', '#4a3a6a', 0.9));
    const d = new T3.DirectionalLight('#ffffff', 0.7); d.position.set(3, 8, 6); this.scene.add(d);
    this.camera = new T3.PerspectiveCamera(34, 1, 0.1, 80);
    // runway: a long glossy strip with lights down both sides
    const strip = new T3.Mesh(new T3.BoxGeometry(2.4, 0.3, 14), new T3.MeshPhongMaterial({ color: '#ffffff', map: studTex('#ff6fb0'), shininess: 40 }));
    strip.position.set(0, -0.15, -4); this.scene.add(strip);
    for (let z = -10; z <= 2; z += 1.5) for (const x of [-1.35, 1.35]) {
      const b = new T3.Mesh(new T3.SphereGeometry(0.09, 8, 6), new T3.MeshBasicMaterial({ color: '#ffd23a' })); b.position.set(x, 0.05, z); this.scene.add(b);
    }
    const floor = new T3.Mesh(new T3.PlaneGeometry(40, 40), new T3.MeshLambertMaterial({ color: '#1c1530' })); floor.rotation.x = -Math.PI / 2; floor.position.y = -0.3; this.scene.add(floor);
    const back = new T3.Mesh(new T3.BoxGeometry(6, 4, 0.3), plastic('#7a45d0', { emissive: '#2a0f5a' })); back.position.set(0, 1.7, -11.2); this.scene.add(back);
    this.models = [];
    this.t = 0; this.mode = 'dress';
  }
  size(w, h) { this.renderer.setSize(w, h, false); this.camera.aspect = w / h; this.camera.updateProjectionMatrix(); }
  clear() { for (const m of this.models) this.scene.remove(m.av.root); this.models = []; }
  /** Dressing: one model turning slowly at the front of the runway. */
  dress(cfg) {
    this.clear(); this.mode = 'dress';
    const av = makeAvatar(cfg); av.root.position.set(0, 0, 1); this.scene.add(av.root);
    this.models.push({ av });
  }
  /** Show: one model walks from the back to the front, strikes a pose, then walks off. */
  walk(cfg, pose) {
    this.clear(); this.mode = 'walk'; this.walkT = 0; this.pose = pose;
    const av = makeAvatar(cfg); av.root.position.set(0, 0, -10); this.scene.add(av.root);
    this.models.push({ av });
  }
  frame(dt) {
    this.t += dt;
    const m = this.models[0];
    if (m) {
      const a = m.av;
      if (this.mode === 'dress') {
        a.root.rotation.y = Math.sin(this.t * 0.7) * 0.8;
        poseAvatar(a, { time: this.t, moving: false });
        // the option panel covers the right half, so frame the model on the left
        const off = this.camera.aspect > 1.2 ? 1.25 : 0;
        this.camera.position.set(off, 1.3, 6.6); this.camera.lookAt(off, 0.9, 1);
      } else {
        this.walkT += dt;
        const k = Math.min(1, this.walkT / 2.2);
        a.root.position.z = -10 + k * 10.6;
        a.root.rotation.y = 0;
        if (k < 1) poseAvatar(a, { time: this.t, moving: true });
        else poseAvatar(a, { time: this.t, pose: this.pose, poseT: Math.min(1, (this.walkT - 2.2) / 0.4) });
        this.camera.position.set(1.6, 2.2, 5.6); this.camera.lookAt(0, 0.9, a.root.position.z * 0.4);
      }
    }
    this.renderer.render(this.scene, this.camera);
  }
}
