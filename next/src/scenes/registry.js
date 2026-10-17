// Scene registry (owned by the orchestrator). Each Wave 2 agent creates its own scene module under the
// agreed name; this file imports each one lazily and tolerates the ones that do not exist yet, so agents
// never have to edit a shared file. Registered names are the keys below.
const MODULES = {
  title: './title.js',
  nameEntry: './nameEntry.js',
  prologue: './prologue.js',
  field: './field.js',
  battle: './battle.js',
  menu: './menu.js',
  shop: './shop.js',
  inn: './inn.js',
  dialog: './dialog.js',
  gameover: './gameover.js',
  credits: './credits.js',
  titleCard: './titleCard.js',
  loadGame: './loadGame.js',
  config: './config.js',
};

const scenes = {};
export default scenes;

export async function install(engine) {
  for (const [name, path] of Object.entries(MODULES)) {
    let mod = null;
    try { mod = await import(path); } catch (e) { continue; }   // not written yet
    const Scene = mod.default || mod[Object.keys(mod).find(k => /Scene$/.test(k)) || ''];
    if (!Scene) continue;
    scenes[name] = Scene;
    engine.registerScene(name, Scene);
    if (typeof mod.install === 'function') {
      try { await mod.install(engine); } catch (e) { console.error('scene install failed', name, e); }
    }
  }
}
