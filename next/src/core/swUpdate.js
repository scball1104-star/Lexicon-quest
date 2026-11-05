// Applying a waiting service worker without touching a game in progress (docs/PWA.md, "Updates").
//
// A new build installs beside the old one and waits. `makeUpdater(engine)` returns `track(reg)`: from then on, every two seconds,
// if the loading screen or an idle title is up (`quiet`), the page asks the waiting worker to take over; the worker agrees only
// when this is the one tab open (the handler build_pwa.py writes into sw.js), and the page reloads once on controllerchange.
// Anywhere else the toast says when the update will land, and nothing else happens: no reload, no save touched.
// Loop guard: one reload per KEEP_OUT per tab, held in sessionStorage. No sessionStorage, no reload (next launch applies it).

export const ASK = 'lq-apply-update';
export const REFUSED = 'lq-update-refused';
export const UPDATE_READY = 'Update ready. It applies at the title screen or next launch.';
export const UPDATE_TABS = 'Update ready. Close other game tabs to apply it.';
export const UPDATE_DONE = 'Game updated.';
export const KEY = 'lq-update-reload';
export const KEEP_OUT = 600000;   // 10 minutes
const EVERY = 2000, NO_ANSWER = 4000;

/** True only where a reload costs nothing: before or during the loading screen, or the title alone on the stack, idle, no dialog. */
export function quiet(engine) {
  const s = engine.scene;
  if (!s || s === engine.bootScene) return true;
  return s.name === 'title' && engine.stack.length === 1 && !s.busy && !s.guard && s.idle >= 1;
}

export function makeUpdater(engine, env = window) {
  const sw = env.navigator.serviceWorker;
  const said = new Set();
  let reg = null, timer = 0, asked = false, lock = null, wait = 0;
  /** Milliseconds since this tab last reloaded for an update; 0 when that cannot be known (which blocks the reload). */
  const since = () => { try { return Date.now() - Number(env.sessionStorage.getItem(KEY)); } catch (e) { return 0; } };
  const tell = (text, frames = 240) => {
    if (said.has(text) || !engine.toasts || !engine.scene || engine.scene === engine.bootScene) return;
    said.add(text);
    engine.toasts.flash(text, { frames });
  };
  const release = () => {
    env.clearTimeout(wait);
    asked = false;
    if (lock) lock.busy = false;
    lock = null;
  };
  const stop = () => { env.clearInterval(timer); timer = 0; };
  const tick = () => {
    if (asked || !reg) return;
    if (!reg.waiting) { stop(); return; }
    if (!sw.controller) return;
    if (!quiet(engine) || since() < KEEP_OUT) { tell(UPDATE_READY); return; }
    asked = true;
    if (engine.scene && engine.scene !== engine.bootScene) { lock = engine.scene; lock.busy = true; }   // the title takes no press now
    reg.waiting.postMessage(ASK);
    wait = env.setTimeout(() => { release(); stop(); tell(UPDATE_READY); }, NO_ANSWER);   // a worker with no handler: next launch
  };
  sw.addEventListener('message', (ev) => { if (ev.data === REFUSED) { release(); tell(UPDATE_TABS); } });
  sw.addEventListener('controllerchange', () => {
    if (!asked) return;                                        // only the tab that asked ever reloads
    env.clearTimeout(wait);
    asked = false;
    env.sessionStorage.setItem(KEY, String(Date.now()));
    env.location.reload();
  });
  const track = (r) => { reg = r; if (!timer) timer = env.setInterval(tick, EVERY); tick(); };
  /** Once the game is up: say so if this load is the reload of an update. */
  track.greet = () => { const s = since(); if (s > 0 && s < 60000) tell(UPDATE_DONE, 120); };
  return track;
}
