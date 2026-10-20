// Boot: create the engine, load the manifest, register scenes, start the first scene.
//
// URL parameters (all optional):
//   ?debug=1        FPS/frame-time overlay on (F3 toggles). LQ_DEBUG is always installed.
//   &fps=0          keep debug mode but hide the overlay (QA screenshots)
//   &scene=name     start in this registered scene instead of the title
//   &seed=n         fixed RNG seed (deterministic runs)
//   &speed=x        initial time scale
//   &touch=on|off   force the touch controls on or off for this session
//
// Debug runs (?debug=1) skip the "Tap or press any key" gate and the service worker, wait for every lazy
// asset group, and so behave exactly as before the loading screen existed (QA harnesses rely on that).
// Normal runs show the loading screen with the tap gate (it also unlocks audio) and register /next/sw.js
// once the game is playable (docs/PWA.md).

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
  // engine.boot() runs this in parallel with the asset downloads (the loading screen's `scenes` job).
  const manifest = await engine.assets.manifestReady;
  const path = manifest && manifest.scenes;
  if (!path) return false;
  const mod = await import(new URL(path, engine.assets.base).href);
  const list = mod.default || mod.scenes || {};
  for (const [name, factory] of Object.entries(list)) engine.registerScene(name, factory);
  if (typeof mod.install === 'function') await mod.install(engine);
  return true;
}

// ---------------------------------------------------------------- service worker (installable PWA)
function showUpdateToast() {
  // The toast strip is installed by the title scene's install(); wait for it (up to ~60 s), then show once.
  let tries = 0;
  const tick = () => {
    if (engine.toasts && typeof engine.toasts.flash === 'function') {
      engine.toasts.flash('Update ready, restart to apply', { frames: 240 });
    } else if (++tries < 120) setTimeout(tick, 500);
  };
  tick();
}

function registerWorker() {
  if (debug || !('serviceWorker' in navigator) || !window.isSecureContext) return;
  const url = new URL('../sw.js', import.meta.url);
  const scope = new URL('../', import.meta.url).pathname;     // the next/ folder: /Lexicon-quest/next/
  const watch = (reg) => {
    let told = false;
    const tell = () => { if (!told && navigator.serviceWorker.controller) { told = true; showUpdateToast(); } };
    if (reg.waiting) tell();
    reg.addEventListener('updatefound', () => {
      const w = reg.installing;
      if (w) w.addEventListener('statechange', () => { if (w.state === 'installed') tell(); });
    });
  };
  // Register after the game is playable so the precache download never competes with the first frame.
  navigator.serviceWorker.register(url, { scope }).then(watch, (e) => console.warn('[pwa] service worker not registered', e));
}

async function main() {
  if (params.get('touch') === 'on' || params.get('touch') === 'off') {
    engine.settings.touchControls = params.get('touch');
    if (engine.touch) engine.touch.refresh();
  }
  // The engine draws its own loading screen from here on; the HTML line only covers the module download.
  const boot = document.getElementById('boot');
  if (boot) boot.style.display = 'none';
  engine.registryLoaded = false;   // LQ_DEBUG.ready() waits for the registry too (boot race fix)
  // The scene modules load in parallel with the assets (they are part of the bar). Debug runs skip the tap gate.
  await engine.boot({ scenes: loadRegistry, gate: !debug && params.get('gate') !== '0' });
  if (debug && engine.lazyLoad) await engine.lazyLoad;   // deterministic QA: every lazy group is in before ready()
  engine.registryLoaded = true;
  if (boot) boot.remove();
  if (!debug) setTimeout(registerWorker, 2500);
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
