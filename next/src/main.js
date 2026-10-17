// Boot: create the engine, load the manifest, register scenes, start the first scene.
//
// URL parameters (all optional):
//   ?debug=1        FPS/frame-time overlay on (F3 toggles). LQ_DEBUG is always installed.
//   &fps=0          keep debug mode but hide the overlay (QA screenshots)
//   &scene=name     start in this registered scene instead of the title
//   &seed=n         fixed RNG seed (deterministic runs)
//   &speed=x        initial time scale
//   &touch=on|off   force the touch controls on or off for this session

import { Engine } from './core/engine.js';
import { installDebug } from './core/debug.js';
import { DevTitleScene } from './scenes/_devTitle.js';
import { DevFieldScene } from './scenes/_devField.js';
import { DevGalleryScene } from './scenes/_devGallery.js';

const params = new URLSearchParams(location.search);
const debug = params.get('debug') === '1';
const canvas = document.getElementById('game');

const engine = new Engine({
  canvas,
  debug,
  seed: params.has('seed') ? Number(params.get('seed')) >>> 0 : undefined,
});
installDebug(engine, { debug, overlay: debug && params.get('fps') !== '0' });
window.LQ_ENGINE = engine;

engine.registerScene('_devTitle', DevTitleScene);
engine.registerScene('_devField', DevFieldScene);
engine.registerScene('_devGallery', DevGalleryScene);

async function loadRegistry() {
  // src/scenes/registry.js (owned by the scene agents) exports { name: SceneClassOrFactory, ... } as its
  // default export or as `scenes`, plus an optional install(engine). It is imported only when
  // assets/manifest.json lists it ("scenes": "src/scenes/registry.js"; qa/core/sync-manifest.mjs adds it),
  // so the game never requests a file that does not exist. Until then the dev scenes are the whole game.
  const path = engine.assets.manifest && engine.assets.manifest.scenes;
  if (!path) return false;
  const mod = await import(new URL(path, engine.assets.base).href);
  const list = mod.default || mod.scenes || {};
  for (const [name, factory] of Object.entries(list)) engine.registerScene(name, factory);
  if (typeof mod.install === 'function') await mod.install(engine);
  return true;
}

async function main() {
  if (params.get('touch') === 'on' || params.get('touch') === 'off') {
    engine.settings.touchControls = params.get('touch');
    if (engine.touch) engine.touch.refresh();
  }
  // The engine draws its own loading bar from here on; the HTML line only covers the module download.
  const boot = document.getElementById('boot');
  if (boot) boot.style.display = 'none';
  await engine.boot();
  try { await loadRegistry(); } catch (e) { console.error('[main] scene registry failed to load', e); }
  if (boot) boot.remove();
  if (params.has('speed')) engine.timeScale = Number(params.get('speed')) || 1;
  const wanted = params.get('scene');
  const first = wanted && engine.hasScene(wanted) ? wanted : engine.hasScene('title') ? 'title' : '_devTitle';
  engine.push(first);
  canvas.focus({ preventScroll: true });
}

main().catch((e) => {
  console.error('[main] boot failed', e);
  let boot = document.getElementById('boot');
  if (!boot) { boot = document.createElement('p'); boot.id = 'boot'; document.body.appendChild(boot); }
  boot.style.display = '';
  boot.style.zIndex = '20';
  boot.textContent = 'Lexicon Quest could not start. Please reload.';
});
