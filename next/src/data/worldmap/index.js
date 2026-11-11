// Entry module of the `worldmap` pack (issue #97, docs/WORLD_MAP_PLAN.md wave 2). ensurePack('worldmap') (src/game/packs.js)
// imports this file and calls register(engine); Node tests import it and call register() themselves. Idempotent.
//
// What it brings: the map screen (scene `worldmap`, ./scene.js, view only until wave 3's travel), the map stones at town
// gates and docks (./field.js, attached to every field the engine enters), and the art (assets/worldmap_manifest.json:
// the painting, the stone and its tile fragment, merged by ensurePack after register). What a save knows is read from its
// flags (./data.js): nothing is written to a save. The field menu's "Map" row (src/scenes/menu.js) asks for this pack.
//
// The pack never patches a map module and never touches another pack: the stones join a map's entities at run time.

import { onPackReady } from '../../game/packs.js';
import { attach, addStones, openMap } from './field.js';
import { mapState } from './data.js';

export const ID = 'worldmap';
let done = false;
let sceneP = null;

/** The scene class (./scene.js), loaded once. */
export function loadScene() {
  if (!sceneP) sceneP = import('./scene.js').then((m) => m.WorldMapScene).catch((e) => { sceneP = null; throw e; });
  return sceneP;
}

function installDebug(engine) {
  const D = typeof window !== 'undefined' ? window.LQ_DEBUG : null;
  if (!D || typeof D.register !== 'function' || D.worldMap) return;
  /** LQ_DEBUG.worldMap(): open the map screen over the current scene. LQ_DEBUG.worldMapState(): what it shows. */
  D.register('worldMap', () => { openMap(engine, { from: 'debug' }); return true; });
  D.register('worldMapState', () => mapState(engine.game || {}));
}

/** Register the scene, attach the stones to every field, install the debug hooks. Resolves { ok, skipped }. */
export async function register(engine) {
  if (engine && !done) {
    const Scene = await loadScene();
    if (typeof engine.registerScene === 'function') engine.registerScene('worldmap', Scene);
    if (typeof engine.on === 'function') engine.on('scene', (s) => { if (s && s.name === 'field') attach(s); });
    for (const s of engine.stack || []) if (s && s.name === 'field') attach(s);
    // the tile fragment is merged after register(): a field already standing on a stone map gets its stones then
    onPackReady(ID, () => { for (const s of engine.stack || []) if (s && s.name === 'field' && !s.loading) addStones(s); });
    installDebug(engine);
    done = true;
  }
  return { ok: true, skipped: [] };
}

export default register;
