// Lexicon Quest NEXT: audio runtime (WebAudio).
//
// Owner: W1-audio. Contract (DESIGN 8, docs/briefs/W1-audio.md):
//
//   import { createAudio } from './audio.js';
//   const audio = createAudio({ basePath: '' });      // basePath is prefixed to every manifest src
//   await audio.init();                                // or init(manifestObject) or init('assets/audio/manifest.json')
//   audio.unlock();                                    // also done automatically on the first pointer/key/touch
//   audio.music('willowmere');                         // crossfade 0.6 s; same id again is a no-op
//   audio.music('willowmere', { fade: 1.2, restart: true });
//   audio.pushMusic('battle');                         // field track fades out and is remembered at its position
//   audio.popMusic(0.6);                               // field track resumes where it was, fading back in
//   audio.stopMusic(1.0);
//   audio.sfx('cursor');                               // returns a handle {stop(fade)} or null
//   audio.sfx('hit_heavy', { volume: 0.8, pitch: 1.1, pan: -0.3 });
//   await audio.jingle('item_get');                    // pauses music (DQ style), resolves when the jingle ends
//   audio.jingle('save', { duckMusic: 0.25 });         // number = duck music to that level instead of pausing
//   audio.ambience('river_birds', { fade: 1.5 });      // null stops ambience
//   audio.setVolumes({ master: 0.8, music: 0.7, sfx: 0.8, ambience: 0.6 });   // linear 0..1 slider values
//   audio.getVolumes();
//   await audio.preload(['battle', 'sfx:sword_slash', 'jingle:victory_fanfare']);
//   audio.meter();                                     // {rms, peak} dBFS of the output (debug overlay / QA)
//
// Design notes
// - Importing this module never touches window/document/AudioContext. Everything is created lazily, so the
//   module imports cleanly in Node and every call is a harmless no-op without WebAudio.
// - The AudioContext is created on the first user gesture (autoplay policy). Requests made before that
//   (music, ambience) are remembered and start on unlock. SFX before unlock are dropped. Jingles before
//   unlock resolve after their manifest duration so cutscene timing is the same with or without sound.
// - Music: decoded AudioBuffers loop sample-accurately between loopStart and loopEnd. If a track is not
//   decoded yet it starts streaming at once through an <audio> element (MediaElementSource) while the
//   buffer decodes; the hand-over to the buffer happens at the next loop point, where a jump already occurs.
//   Decoded music is kept in a small LRU cache (tracks in use or on the push stack are never evicted).
// - SFX: max 12 voices (oldest is stolen with a short fade), same-id cooldown 30 ms, optional per-id
//   maxVoices, optional random pitch variance (`vary`, a fraction: 0.04 = +-4 %), round-robin variants.
// - The context is suspended while the tab is hidden and resumed when it comes back.
// - A soft clipper on the master bus keeps summed peaks from hard clipping.

export const AUDIO_API_VERSION = 1;

export const DEFAULT_VOLUMES = Object.freeze({ master: 0.8, music: 0.7, sfx: 0.8, ambience: 0.6 });

const KINDS = ['sfx', 'jingles', 'ambience', 'music'];
const KIND_ALIASES = { sfx: 'sfx', jingle: 'jingles', jingles: 'jingles', ambience: 'ambience', amb: 'ambience', music: 'music', bgm: 'music' };

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const num = (v, d) => (typeof v === 'number' && Number.isFinite(v) ? v : d);

/** Empty manifest skeleton. */
export function emptyManifest() {
  return { music: {}, sfx: {}, jingles: {}, ambience: {} };
}

/** Normalize a manifest object: guarantees the four sections exist. Pure. */
export function normalizeManifest(m) {
  const out = emptyManifest();
  if (m && typeof m === 'object') {
    for (const k of KINDS) if (m[k] && typeof m[k] === 'object') out[k] = m[k];
    if (m.defaults) out.defaults = m.defaults;
  }
  return out;
}

/**
 * Resolve an sfx / jingle / ambience id, following `alias` links. Pure.
 * Returns { id, entry } or null.
 */
export function resolveEntry(manifest, kind, id) {
  const sec = manifest && manifest[kind];
  if (!sec || !id) return null;
  let cur = id;
  for (let hop = 0; hop < 4; hop++) {
    const e = sec[cur];
    if (!e) return null;
    if (e.alias) { cur = e.alias; continue; }
    if (!e.src) return null;
    return { id: cur, entry: e };
  }
  return null;
}

/**
 * Resolve a music id to the track that will actually play, following `fallback` when `src` is null. Pure.
 * Returns { id, key, entry } where key is the id whose src is used, or null for silence / unknown.
 * `unknown: true` is set when the id is not in the manifest at all.
 */
export function resolveMusic(manifest, id) {
  const sec = manifest && manifest.music;
  if (!sec || !id) return null;
  if (!sec[id]) return { id, key: null, entry: null, unknown: true };
  let cur = id;
  const seen = new Set();
  while (cur && !seen.has(cur)) {
    seen.add(cur);
    const e = sec[cur];
    if (!e) return null;
    if (e.src) return { id, key: cur, entry: e };
    cur = e.fallback || null;
  }
  return null;
}

/** Find which manifest section an id belongs to. Accepts 'kind:id' prefixes. Pure. */
export function findKind(manifest, ref) {
  if (typeof ref !== 'string' || !ref) return null;
  const i = ref.indexOf(':');
  if (i > 0) {
    const kind = KIND_ALIASES[ref.slice(0, i)];
    if (kind) return { kind, id: ref.slice(i + 1) };
  }
  for (const k of KINDS) if (manifest && manifest[k] && manifest[k][ref]) return { kind: k, id: ref };
  return null;
}

/** Position inside a looping track after `elapsed` seconds from `offset`. Pure (used by tests). */
export function loopPosition(offset, elapsed, loopStart, loopEnd, loop) {
  let p = offset + elapsed;
  if (loop && loopEnd > loopStart && p >= loopEnd) p = loopStart + ((p - loopEnd) % (loopEnd - loopStart));
  return p;
}

/**
 * createAudio(options)
 *   basePath        prefix for manifest src paths (paths in the manifest are relative to next/)
 *   manifestUrl     default 'assets/audio/manifest.json' (relative to basePath)
 *   maxVoices       simultaneous sfx voices (12)
 *   cooldown        same-id sfx cooldown in seconds (0.03)
 *   musicCacheSize  decoded music tracks kept in memory (3)
 *   timeScale       multiplier for silent-jingle timing (tests pass 0)
 *   autoUnlock      install first-gesture listeners (true)
 *   autoSuspend     suspend while the tab is hidden (true)
 *   contextFactory  () => AudioContext-like (tests)
 *   log             (level, ...args) => void
 */
export function createAudio(options = {}) {
  const opt = {
    basePath: '',
    manifestUrl: 'assets/audio/manifest.json',
    maxVoices: 12,
    cooldown: 0.03,
    musicCacheSize: 3,
    timeScale: 1,
    autoUnlock: true,
    autoSuspend: true,
    contextFactory: null,
    log: null,
    ...options,
  };
  let base = String(opt.basePath || '');
  if (base && !base.endsWith('/')) base += '/';

  const warned = new Set();
  function warnOnce(key, ...args) {
    if (warned.has(key)) return;
    warned.add(key);
    if (opt.log) opt.log('warn', ...args);
    else if (globalThis.console) console.warn('[audio]', ...args);
  }

  let manifest = emptyManifest();
  const vols = { ...DEFAULT_VOLUMES };
  let muted = false;

  // WebAudio state
  let ctx = null;
  let nodes = null;
  let unlocked = false;
  let hiddenSuspended = false;
  let listenersOn = false;
  let readyResolve;
  const ctxReady = new Promise((r) => { readyResolve = r; });

  // Loading caches
  const raw = new Map();        // url -> Promise<ArrayBuffer>
  const buffers = new Map();    // url -> AudioBuffer
  const decoding = new Map();   // url -> Promise<AudioBuffer|null>
  const musicLRU = [];          // urls of decoded music, most recent last
  const failed = new Set();     // urls that failed to load

  // Playback state
  let cur = null;               // current music track
  const stack = [];             // pushed (paused) music tracks, or null markers for silence
  let wantMusic = null;         // { id, fade } requested while locked
  const wantStack = [];         // pushMusic requests made while locked
  let currentId = null;         // last requested music id (even if it resolved to silence)
  let amb = null;               // current ambience { id, gain, srcs }
  let wantAmb = null;           // ambience id requested
  const voices = [];            // active sfx voices
  const lastPlay = new Map();   // sfx id -> ctx time
  const lastVariant = new Map();
  let jingleDepth = 0;
  let jinglePaused = null;      // track paused by a jingle
  let duckLevel = 1;
  let poller = null;

  const hasWindow = () => typeof window !== 'undefined' && typeof document !== 'undefined';
  const running = () => !!ctx && ctx.state === 'running' && unlocked;
  const now = () => (ctx ? ctx.currentTime : 0);
  const urlOf = (src) => (/^(?:[a-z]+:|\/)/i.test(src) ? src : base + src);

  // ---------------------------------------------------------------- context and graph
  function ensureCtx() {
    if (ctx) return ctx;
    let c = null;
    try {
      if (opt.contextFactory) c = opt.contextFactory();
      else {
        const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
        if (!AC) return null;
        try { c = new AC({ latencyHint: 'interactive' }); } catch { c = new AC(); }
      }
    } catch (e) {
      warnOnce('ctx', 'AudioContext unavailable:', e && e.message);
      return null;
    }
    ctx = c;
    buildGraph();
    if (ctx.addEventListener) {
      ctx.addEventListener('statechange', () => {
        if (ctx.state === 'running' && !unlocked && !hiddenSuspended) markUnlocked();
      });
    }
    return ctx;
  }

  function gainNode(v, dest) {
    const g = ctx.createGain();
    g.gain.value = v;
    if (dest) g.connect(dest);
    return g;
  }

  function softClipCurve() {
    // Identity below 0.75, smooth knee to 1.0 above. 2049 points so the linear part is exact.
    const n = 2049;
    const c = new Float32Array(n);
    const knee = 0.75;
    for (let i = 0; i < n; i++) {
      const x = (i / (n - 1)) * 2 - 1;
      const a = Math.abs(x);
      const y = a <= knee ? a : knee + (1 - knee) * Math.tanh((a - knee) / (1 - knee));
      c[i] = Math.sign(x) * y;
    }
    return c;
  }

  function buildGraph() {
    let out = ctx.destination;
    if (ctx.createWaveShaper) {
      try {
        const ws = ctx.createWaveShaper();
        ws.curve = softClipCurve();
        ws.oversample = '2x';
        ws.connect(ctx.destination);
        out = ws;
      } catch { out = ctx.destination; }
    }
    const master = gainNode(muted ? 0 : vols.master, out);
    const music = gainNode(vols.music, master);
    const musicDuck = gainNode(1, music);
    const jingle = gainNode(1, music);
    const sfx = gainNode(vols.sfx, master);
    const ambBus = gainNode(vols.ambience, master);
    const ambDuck = gainNode(1, ambBus);
    nodes = { out, master, music, musicDuck, jingle, sfx, ambBus, ambDuck };
  }

  // Equal-power-ish ramp built from linear segments (robust across browsers: no setValueCurveAtTime overlap errors).
  function ramp(param, to, dur, at) {
    const t0 = at === undefined ? now() : at;
    let from;
    try { from = param.value; } catch { from = to; }
    try {
      param.cancelScheduledValues(t0);
      param.setValueAtTime(from, t0);
      if (!(dur > 0.004)) { param.setValueAtTime(to, t0); return; }
      const N = 8;
      for (let i = 1; i <= N; i++) {
        const t = i / N;
        const k = to < from ? 1 - Math.cos((t * Math.PI) / 2) : Math.sin((t * Math.PI) / 2);
        param.linearRampToValueAtTime(from + (to - from) * k, t0 + dur * t);
      }
    } catch {
      try { param.value = to; } catch { /* ignore */ }
    }
  }

  function applyVolumes(fade = 0.05) {
    if (!nodes) return;
    ramp(nodes.master.gain, muted ? 0 : vols.master, fade);
    ramp(nodes.music.gain, vols.music, fade);
    ramp(nodes.sfx.gain, vols.sfx, fade);
    ramp(nodes.ambBus.gain, vols.ambience, fade);
  }

  // ---------------------------------------------------------------- unlock / visibility
  function onGesture() {
    if (!ctx || ctx.state !== 'running' || !unlocked) unlock();
  }

  function installListeners() {
    if (listenersOn || !hasWindow()) return;
    listenersOn = true;
    const evs = ['pointerdown', 'pointerup', 'touchstart', 'touchend', 'mousedown', 'keydown', 'click'];
    for (const ev of evs) window.addEventListener(ev, onGesture, { capture: true, passive: true });
    if (opt.autoSuspend) {
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) suspendForHidden();
        else resumeFromHidden();
      });
    }
  }

  function unlock() {
    const c = ensureCtx();
    if (!c) return Promise.resolve(false);
    let p;
    try { p = c.state === 'running' ? Promise.resolve() : c.resume(); } catch { p = Promise.resolve(); }
    // iOS needs a sound started inside the gesture.
    try {
      const b = c.createBuffer(1, 1, c.sampleRate || 44100);
      const s = c.createBufferSource();
      s.buffer = b;
      s.connect(c.destination);
      s.start(0);
    } catch { /* ignore */ }
    return Promise.resolve(p).then(
      () => { if (c.state === 'running' && !hiddenSuspended) markUnlocked(); return c.state === 'running'; },
      () => false,
    );
  }

  function markUnlocked() {
    if (unlocked) return;
    unlocked = true;
    readyResolve(ctx);
    // Decode everything small that was prefetched.
    for (const [kind, sec] of [['sfx', manifest.sfx], ['ambience', manifest.ambience]]) {
      if (kind === 'ambience') continue; // ambience decodes on demand
      for (const id of Object.keys(sec)) for (const u of entryUrls(sec[id])) decode(u).catch(() => {});
    }
    // Realize requests made while locked.
    if (wantStack.length) {
      // Only the top of the push stack matters audibly; earlier ones are restored on pop.
      for (const w of wantStack) stack.push(w.prev ? { deferred: w.prev } : null);
      wantStack.length = 0;
    }
    if (wantMusic) { const w = wantMusic; wantMusic = null; startMusicNow(w.id, w.fade, false); }
    if (wantAmb) { const id = wantAmb; wantAmb = null; ambience(id, { fade: 1.0 }); }
  }

  function suspendForHidden() {
    if (!ctx || hiddenSuspended) return;
    hiddenSuspended = true;
    for (const tr of allTracks()) if (tr.el && !tr.el.paused) { tr.elWasPlaying = true; try { tr.el.pause(); } catch { /* */ } }
    try { ctx.suspend(); } catch { /* ignore */ }
  }

  function resumeFromHidden() {
    if (!ctx || !hiddenSuspended) return;
    hiddenSuspended = false;
    let p;
    try { p = ctx.resume(); } catch { p = null; }
    Promise.resolve(p).then(() => {
      if (ctx.state === 'running' && !unlocked) markUnlocked();
      for (const tr of allTracks()) if (tr.el && tr.elWasPlaying) { tr.elWasPlaying = false; tr.el.play().catch(() => {}); }
    }, () => {});
  }

  function allTracks() {
    const list = [];
    if (cur) list.push(cur);
    for (const t of stack) if (t && t.gain) list.push(t);
    if (jinglePaused && !list.includes(jinglePaused)) list.push(jinglePaused);
    return list;
  }

  // ---------------------------------------------------------------- loading
  function entryUrls(e) {
    if (!e || !e.src) return [];
    return (Array.isArray(e.src) ? e.src : [e.src]).filter(Boolean).map(urlOf);
  }

  function fetchRaw(url) {
    if (raw.has(url)) return raw.get(url);
    let p;
    if (typeof fetch !== 'function') p = Promise.reject(new Error('fetch unavailable'));
    else p = fetch(url).then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.arrayBuffer(); });
    p = p.catch((e) => {
      failed.add(url);
      raw.delete(url);
      warnOnce('load:' + url, 'could not load', url, e && e.message);
      throw e;
    });
    raw.set(url, p);
    return p;
  }

  function decodeAB(ab) {
    return new Promise((res, rej) => {
      try {
        const r = ctx.decodeAudioData(ab, res, rej);
        if (r && typeof r.then === 'function') r.then(res, rej);
      } catch (e) { rej(e); }
    });
  }

  function decode(url, { music = false } = {}) {
    if (buffers.has(url)) { if (music) touchLRU(url); return Promise.resolve(buffers.get(url)); }
    if (decoding.has(url)) return decoding.get(url);
    const p = fetchRaw(url)
      .then((ab) => ctxReady.then(() => decodeAB(ab.slice(0))))
      .then((buf) => {
        buffers.set(url, buf);
        raw.delete(url); // free the compressed copy; the browser cache keeps the file
        decoding.delete(url);
        if (music) { touchLRU(url); evictMusic(); }
        return buf;
      })
      .catch((e) => {
        decoding.delete(url);
        failed.add(url);
        warnOnce('decode:' + url, 'could not decode', url, e && e.message);
        throw e;
      });
    decoding.set(url, p);
    return p;
  }

  function touchLRU(url) {
    const i = musicLRU.indexOf(url);
    if (i >= 0) musicLRU.splice(i, 1);
    musicLRU.push(url);
  }

  function evictMusic() {
    const inUse = new Set(allTracks().map((t) => t.url));
    for (const t of stack) if (t && t.deferred) { const r = resolveMusic(manifest, t.deferred); if (r && r.entry) inUse.add(urlOf(r.entry.src)); }
    let i = 0;
    while (musicLRU.length > Math.max(1, opt.musicCacheSize) && i < musicLRU.length) {
      const u = musicLRU[i];
      if (inUse.has(u)) { i++; continue; }
      musicLRU.splice(i, 1);
      buffers.delete(u);
    }
  }

  // ---------------------------------------------------------------- music
  function makeTrack(id, key, entry) {
    const url = urlOf(entry.src);
    return {
      id, key, entry, url,
      gain: gainNode(0, nodes.musicDuck),
      vol: clamp(num(entry.volume, 1), 0, 2),
      loop: entry.loop !== false,
      ls: Math.max(0, num(entry.loopStart, 0)),
      le: Math.max(0, num(entry.loopEnd, 0)),
      mode: null, src: null, el: null, elGain: null, mes: null,
      t0: 0, off0: 0, lsR: 0, leR: 0, dur: 0,
      pos: Math.max(0, num(entry.start, 0)),
      paused: false, dead: false, timers: [], pendingBuffer: null, handingOff: false,
    };
  }

  function clearTimers(tr) { for (const t of tr.timers) clearTimeout(t); tr.timers.length = 0; }
  function later(tr, ms, fn) { tr.timers.push(setTimeout(fn, Math.max(0, ms))); }

  function trackPos(tr, at) {
    if (tr.mode === 'element' && tr.el) return tr.el.currentTime || 0;
    if (tr.mode === 'buffer' && tr.src) {
      const p = loopPosition(tr.off0, Math.max(0, (at === undefined ? now() : at) - tr.t0), tr.lsR, tr.leR, tr.loop);
      return tr.loop ? p : Math.min(p, tr.dur);
    }
    return tr.pos;
  }

  function startBuffer(tr, buf, offset, when) {
    const s = ctx.createBufferSource();
    s.buffer = buf;
    const dur = buf.duration;
    const le = tr.le > 0 && tr.le <= dur ? tr.le : dur;
    const ls = tr.ls < le - 0.05 ? tr.ls : 0;
    s.loop = tr.loop;
    if (tr.loop) { s.loopStart = ls; s.loopEnd = le; }
    let off = offset;
    if (tr.loop && off >= le) off = ls + ((off - le) % Math.max(0.001, le - ls));
    if (!tr.loop && off >= dur) off = 0;
    s.connect(tr.gain);
    const at = when === undefined ? now() : when;
    s.start(at, off);
    tr.src = s; tr.mode = 'buffer'; tr.t0 = at; tr.off0 = off; tr.lsR = ls; tr.leR = le; tr.dur = dur;
    s.onended = () => {
      if (tr.src === s && !tr.loop && !tr.paused && !tr.dead) { tr.pos = 0; tr.ended = true; }
    };
  }

  function startElement(tr, offset) {
    if (typeof Audio === 'undefined' || !ctx.createMediaElementSource) return false;
    let el;
    try {
      el = new Audio();
      el.preload = 'auto';
      el.src = tr.url;
      el.loop = tr.loop && !(tr.le > 0);
      const mes = ctx.createMediaElementSource(el);
      const eg = gainNode(1, tr.gain);
      mes.connect(eg);
      tr.el = el; tr.mes = mes; tr.elGain = eg; tr.mode = 'element';
    } catch (e) {
      warnOnce('el:' + tr.url, 'streaming failed', e && e.message);
      return false;
    }
    const seek = () => { try { if (offset > 0) el.currentTime = offset; } catch { /* */ } };
    if (el.readyState >= 1) seek(); else el.addEventListener('loadedmetadata', seek, { once: true });
    el.play().catch(() => {});
    ensurePoller();
    return true;
  }

  function stopElement(tr) {
    if (!tr.el) return;
    try { tr.el.pause(); } catch { /* */ }
    try { tr.mes.disconnect(); tr.elGain.disconnect(); } catch { /* */ }
    try { tr.el.removeAttribute('src'); tr.el.load(); } catch { /* */ }
    tr.el = null; tr.mes = null; tr.elGain = null;
  }

  // Element-mode loop points and the hand-over to a decoded buffer at the loop boundary.
  function ensurePoller() {
    if (poller) return;
    poller = setInterval(() => {
      let any = false;
      for (const tr of allTracks()) {
        if (tr.mode !== 'element' || !tr.el || tr.dead) continue;
        any = true;
        if (tr.paused || tr.el.paused) continue;
        const t = tr.el.currentTime || 0;
        const end = tr.le > 0 ? tr.le : tr.el.duration || Infinity;
        if (!tr.loop) continue;
        if (tr.pendingBuffer && !tr.handingOff && end - t < 0.12) {
          tr.handingOff = true;
          const remain = Math.max(0, end - t);
          const at = now() + remain;
          const buf = tr.pendingBuffer;
          tr.pendingBuffer = null;
          const old = { el: tr.el, mes: tr.mes, elGain: tr.elGain };
          ramp(old.elGain.gain, 0, 0.03, at);
          tr.el = null; tr.mes = null; tr.elGain = null;
          startBuffer(tr, buf, tr.ls, at);
          setTimeout(() => stopElement(old), (remain + 0.1) * 1000);
          tr.handingOff = false;
        } else if (tr.le > 0 && t >= tr.le) {
          try { tr.el.currentTime = tr.ls + (t - tr.le); } catch { /* */ }
        }
      }
      if (!any) { clearInterval(poller); poller = null; }
    }, 30);
  }

  function playTrack(tr, offset, fadeIn) {
    tr.paused = false;
    tr.dead = false;
    clearTimers(tr);
    const buf = buffers.get(tr.url);
    if (buf) {
      touchLRU(tr.url);
      startBuffer(tr, buf, offset);
    } else {
      const ok = startElement(tr, offset);
      decode(tr.url, { music: true }).then((b) => {
        if (tr.dead) return;
        if (!ok && tr.mode === null && !tr.paused) { startBuffer(tr, b, tr.pos); return; }
        if (tr.mode === 'element') tr.pendingBuffer = b;
      }, () => {});
      if (!ok) tr.pos = offset;
    }
    tr.gain.gain.value = 0;
    ramp(tr.gain.gain, tr.vol, fadeIn);
  }

  // Fade out, stop sources, remember the position. Keeps the track object for a later resume.
  function pauseTrack(tr, fade) {
    if (!tr || tr.paused || tr.dead) return;
    tr.paused = true;
    clearTimers(tr);
    const f = Math.max(0, fade || 0);
    const at = now() + f;
    tr.pos = trackPos(tr, at);
    ramp(tr.gain.gain, 0, f);
    if (tr.mode === 'buffer' && tr.src) {
      const s = tr.src;
      try { s.stop(at + 0.02); } catch { /* */ }
      tr.src = null;
      tr.mode = null;
    } else if (tr.mode === 'element' && tr.el) {
      later(tr, f * 1000 + 20, () => {
        if (!tr.paused || !tr.el) return;
        tr.pos = tr.el.currentTime || tr.pos;
        try { tr.el.pause(); } catch { /* */ }
      });
    }
  }

  function resumeTrack(tr, fade) {
    if (!tr || tr.dead) return;
    clearTimers(tr);
    if (tr.mode === 'element' && tr.el) {
      tr.paused = false;
      tr.el.play().catch(() => {});
      ramp(tr.gain.gain, tr.vol, fade);
      ensurePoller();
      return;
    }
    playTrack(tr, tr.pos, fade);
  }

  function killTrack(tr, fade) {
    if (!tr || tr.dead) return;
    tr.dead = true;
    clearTimers(tr);
    const f = Math.max(0, fade || 0);
    ramp(tr.gain.gain, 0, f);
    const at = now() + f;
    if (tr.src) { try { tr.src.stop(at + 0.02); } catch { /* */ } }
    const el = tr.el ? { el: tr.el, mes: tr.mes, elGain: tr.elGain } : null;
    setTimeout(() => {
      if (el) stopElement(el);
      try { tr.gain.disconnect(); } catch { /* */ }
    }, (f + 0.1) * 1000);
  }

  function startMusicNow(id, fade, restart) {
    const r = resolveMusic(manifest, id);
    if (!r || !r.entry) {
      if (r && r.unknown) warnOnce('music:' + id, 'unknown music id', id);
      if (cur) { killTrack(cur, fade); cur = null; }
      return;
    }
    if (cur && cur.key === r.key && !restart && !cur.dead) {
      cur.id = id;
      if (cur.paused) resumeTrack(cur, fade);
      else ramp(cur.gain.gain, cur.vol, Math.min(fade, 0.3));
      return;
    }
    if (cur) killTrack(cur, fade);
    cur = makeTrack(id, r.key, r.entry);
    playTrack(cur, cur.pos, fade);
  }

  function music(id, { fade = 0.6, restart = false } = {}) {
    if (!id) { stopMusic(fade); return; }
    currentId = id;
    if (!running()) { wantMusic = { id, fade }; return; }
    startMusicNow(id, fade, restart);
  }

  function stopMusic(fade = 0.6) {
    currentId = null;
    wantMusic = null;
    if (cur) { killTrack(cur, fade); cur = null; }
  }

  // pushMusic: the current track fades out over `fade` and is kept paused at its position.
  // The new track starts at full volume immediately (battle intros need their punch) unless fadeIn > 0.
  function pushMusic(id, { fade = 0.3, fadeIn = 0 } = {}) {
    const prevId = currentId;
    currentId = id || null;
    if (!running()) {
      wantStack.push({ prev: wantMusic ? wantMusic.id : prevId });
      wantMusic = id ? { id, fade: fadeIn } : null;
      return;
    }
    if (cur) { pauseTrack(cur, fade); stack.push(cur); } else stack.push(null);
    cur = null;
    if (id) startMusicNow(id, fadeIn, true);
  }

  function popMusic(fade = 0.6) {
    if (!running()) {
      const w = wantStack.pop();
      wantMusic = w && w.prev ? { id: w.prev, fade } : null;
      currentId = w ? w.prev : null;
      return;
    }
    if (cur) { killTrack(cur, Math.min(fade, 0.6)); cur = null; }
    const prev = stack.pop();
    if (!prev) { currentId = null; return; }
    if (prev.deferred) { currentId = prev.deferred; startMusicNow(prev.deferred, fade, true); return; }
    cur = prev;
    currentId = prev.id;
    resumeTrack(prev, fade);
  }

  // ---------------------------------------------------------------- sfx
  function pickUrl(id, e) {
    const urls = entryUrls(e);
    if (urls.length <= 1) return urls[0];
    const last = lastVariant.get(id);
    let i = Math.floor(Math.random() * urls.length);
    if (i === last) i = (i + 1) % urls.length;
    lastVariant.set(id, i);
    return urls[i];
  }

  function stealVoice(v) {
    const i = voices.indexOf(v);
    if (i >= 0) voices.splice(i, 1);
    try {
      ramp(v.gain.gain, 0, 0.008);
      v.src.stop(now() + 0.012);
    } catch { /* */ }
  }

  function sfx(id, { volume = 1, pitch = 1, pan = 0, vary } = {}) {
    if (!running() || muted) return null;
    const r = resolveEntry(manifest, 'sfx', id);
    if (!r) { warnOnce('sfx:' + id, 'unknown sfx id', id); return null; }
    const e = r.entry;
    const t = now();
    const cd = num(e.cooldown, opt.cooldown);
    const last = lastPlay.get(id);
    if (last !== undefined && t - last < cd) return null;
    const url = pickUrl(id, e);
    const buf = url && buffers.get(url);
    if (!buf) { if (url && !failed.has(url)) decode(url).catch(() => {}); return null; }
    lastPlay.set(id, t);

    const cap = num(e.maxVoices, 0);
    if (cap > 0) {
      const same = voices.filter((v) => v.id === id);
      if (same.length >= cap) stealVoice(same[0]);
    }
    while (voices.length >= opt.maxVoices) stealVoice(voices[0]);

    const s = ctx.createBufferSource();
    s.buffer = buf;
    const vr = num(vary, num(e.vary, 0));
    const rate = clamp(num(pitch, 1), 0.25, 4) * (vr > 0 ? 1 + (Math.random() * 2 - 1) * vr : 1);
    s.playbackRate.value = rate;
    const g = gainNode(clamp(num(e.volume, 1) * num(volume, 1), 0, 4));
    s.connect(g);
    let out = g;
    if (pan && ctx.createStereoPanner) {
      const p = ctx.createStereoPanner();
      p.pan.value = clamp(pan, -1, 1);
      g.connect(p);
      out = p;
    }
    out.connect(nodes.sfx);
    const voice = { id, src: s, gain: g, out, t };
    voices.push(voice);
    s.onended = () => {
      const i = voices.indexOf(voice);
      if (i >= 0) voices.splice(i, 1);
      try { out.disconnect(); if (out !== g) g.disconnect(); } catch { /* */ }
    };
    s.start(t);
    return {
      id,
      stop(fade = 0.03) {
        const i = voices.indexOf(voice);
        if (i >= 0) voices.splice(i, 1);
        try { ramp(g.gain, 0, fade); s.stop(now() + fade + 0.01); } catch { /* */ }
      },
    };
  }

  // ---------------------------------------------------------------- jingles
  function sleep(sec) {
    const ms = Math.max(0, sec * 1000 * num(opt.timeScale, 1));
    return new Promise((r) => (ms > 0 ? setTimeout(r, ms) : r()));
  }

  function duckStart(mode) {
    jingleDepth++;
    if (jingleDepth > 1) return;
    if (mode === true) {
      if (cur && !cur.paused) { jinglePaused = cur; pauseTrack(cur, 0.12); }
      duckLevel = 1;
    } else if (typeof mode === 'number') {
      duckLevel = clamp(mode, 0, 1);
      ramp(nodes.musicDuck.gain, duckLevel, 0.15);
    }
    ramp(nodes.ambDuck.gain, 0.5, 0.2);
  }

  function duckEnd() {
    jingleDepth = Math.max(0, jingleDepth - 1);
    if (jingleDepth > 0) return;
    if (jinglePaused) {
      const tr = jinglePaused;
      jinglePaused = null;
      if (tr === cur && tr.paused && !tr.dead) resumeTrack(tr, 0.5);
    }
    if (duckLevel !== 1) { duckLevel = 1; ramp(nodes.musicDuck.gain, 1, 0.5); }
    ramp(nodes.ambDuck.gain, 1, 0.6);
  }

  function jingle(id, { duckMusic = true, volume = 1 } = {}) {
    const r = resolveEntry(manifest, 'jingles', id);
    if (!r) { warnOnce('jingle:' + id, 'unknown jingle id', id); return Promise.resolve(); }
    const dur = num(r.entry.duration, 2);
    if (!running()) return sleep(dur);
    const url = pickUrl(id, r.entry);
    return decode(url).then((buf) => new Promise((res) => {
      let done = false;
      const s = ctx.createBufferSource();
      s.buffer = buf;
      const g = gainNode(clamp(num(r.entry.volume, 1) * num(volume, 1), 0, 4), nodes.jingle);
      s.connect(g);
      const duck = duckMusic === false || duckMusic === 0 ? null : duckMusic;
      if (duck !== null) duckStart(duck === true ? true : duck);
      const finish = () => {
        if (done) return;
        done = true;
        if (duck !== null) duckEnd();
        try { g.disconnect(); } catch { /* */ }
        res();
      };
      s.onended = finish;
      s.start(now() + 0.02);
      // Safety net in case onended never fires (context closed, etc.).
      setTimeout(() => { if (!hiddenSuspended) finish(); }, (buf.duration + 1.5) * 1000);
    }), () => sleep(dur));
  }

  // ---------------------------------------------------------------- ambience
  function ambience(id, { fade = 1.0, volume = 1 } = {}) {
    if (!id) {
      wantAmb = null;
      if (amb) { fadeOutAmb(amb, fade); amb = null; }
      return;
    }
    if (!running()) { wantAmb = id; return; }
    if (amb && amb.id === id) return;
    if (amb) { fadeOutAmb(amb, fade); amb = null; }
    const r = resolveEntry(manifest, 'ambience', id);
    if (!r) { warnOnce('amb:' + id, 'unknown ambience id', id); return; }
    const a = { id, gain: gainNode(0, nodes.ambDuck), srcs: [], vol: clamp(num(r.entry.volume, 1) * num(volume, 1), 0, 4) };
    amb = a;
    decode(urlOf(r.entry.src)).then((buf) => {
      if (amb !== a) return;
      const t = now() + 0.02;
      const widen = r.entry.widen !== false && !!ctx.createStereoPanner;
      const parts = widen ? [[-0.65, 0], [0.65, buf.duration / 2]] : [[0, 0]];
      for (const [pan, off] of parts) {
        const s = ctx.createBufferSource();
        s.buffer = buf;
        s.loop = true;
        let out = s;
        if (pan) { const p = ctx.createStereoPanner(); p.pan.value = pan; s.connect(p); out = p; }
        const g = gainNode(widen ? 0.75 : 1, a.gain);
        out.connect(g);
        s.start(t, off % buf.duration);
        a.srcs.push(s);
      }
      ramp(a.gain.gain, a.vol, fade);
    }, () => {});
  }

  function fadeOutAmb(a, fade) {
    ramp(a.gain.gain, 0, fade);
    const at = now() + Math.max(0, fade);
    for (const s of a.srcs) { try { s.stop(at + 0.02); } catch { /* */ } }
    setTimeout(() => { try { a.gain.disconnect(); } catch { /* */ } }, (fade + 0.2) * 1000);
  }

  // ---------------------------------------------------------------- public API
  async function init(m) {
    let data = m;
    if (data === undefined || data === null || typeof data === 'string') {
      const url = typeof data === 'string' ? urlOf(data) : urlOf(opt.manifestUrl);
      try {
        if (typeof fetch !== 'function') throw new Error('fetch unavailable');
        const r = await fetch(url);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        data = await r.json();
      } catch (e) {
        warnOnce('manifest', 'audio manifest not loaded:', e && e.message);
        data = null;
      }
    }
    manifest = normalizeManifest(data);
    if (opt.autoUnlock) installListeners();
    // Prefetch every sfx file now (they are small) so they decode instantly on unlock.
    if (typeof fetch === 'function' && hasWindow()) {
      for (const id of Object.keys(manifest.sfx)) {
        for (const u of entryUrls(manifest.sfx[id])) fetchRaw(u).catch(() => {});
      }
    }
    return api;
  }

  function preload(ids = []) {
    const list = Array.isArray(ids) ? ids : [ids];
    const jobs = [];
    for (const ref of list) {
      const f = findKind(manifest, ref);
      if (!f) { warnOnce('pre:' + ref, 'preload: unknown id', ref); continue; }
      let urls = [];
      if (f.kind === 'music') {
        const r = resolveMusic(manifest, f.id);
        if (r && r.entry) urls = [urlOf(r.entry.src)];
      } else {
        const r = resolveEntry(manifest, f.kind, f.id);
        if (r) urls = entryUrls(r.entry);
      }
      for (const u of urls) {
        if (failed.has(u)) continue;
        // Before unlock only fetch the bytes; decode needs a running context.
        jobs.push((unlocked ? decode(u, { music: f.kind === 'music' }) : fetchRaw(u)).catch(() => null));
      }
    }
    return Promise.all(jobs).then(() => undefined);
  }

  function setVolumes(v = {}) {
    for (const k of ['master', 'music', 'sfx', 'ambience']) {
      if (typeof v[k] === 'number' && Number.isFinite(v[k])) vols[k] = clamp(v[k], 0, 1);
    }
    applyVolumes();
    return { ...vols };
  }

  function getVolumes() { return { ...vols }; }

  function setMuted(m) { muted = !!m; applyVolumes(0.05); }

  function stopAll({ fade = 0.3 } = {}) {
    stopMusic(fade);
    stack.length = 0;
    wantStack.length = 0;
    ambience(null, { fade });
    for (const v of voices.slice()) stealVoice(v);
  }

  // Output meter (debug overlays, QA): RMS and peak of the final output in dBFS over the last ~43 ms.
  let analyser = null;
  let meterBuf = null;
  function meter() {
    if (!ctx || !nodes || !ctx.createAnalyser) return { rms: -Infinity, peak: -Infinity };
    if (!analyser) {
      try {
        analyser = ctx.createAnalyser();
        analyser.fftSize = 2048;
        (nodes.out === ctx.destination ? nodes.master : nodes.out).connect(analyser);
        meterBuf = new Float32Array(analyser.fftSize);
      } catch { return { rms: -Infinity, peak: -Infinity }; }
    }
    analyser.getFloatTimeDomainData(meterBuf);
    let sum = 0;
    let pk = 0;
    for (let i = 0; i < meterBuf.length; i++) {
      const v = meterBuf[i];
      sum += v * v;
      const a = v < 0 ? -v : v;
      if (a > pk) pk = a;
    }
    const toDb = (x) => (x > 0 ? 20 * Math.log10(x) : -Infinity);
    return { rms: toDb(Math.sqrt(sum / meterBuf.length)), peak: toDb(pk) };
  }

  function debugState() {
    return {
      api: AUDIO_API_VERSION,
      available: !!(ctx || globalThis.AudioContext || globalThis.webkitAudioContext || opt.contextFactory),
      unlocked,
      ctxState: ctx ? ctx.state : 'none',
      sampleRate: ctx ? ctx.sampleRate : 0,
      music: currentId,
      musicKey: cur ? cur.key : null,
      musicMode: cur ? cur.mode : null,
      musicPos: cur ? Math.round(trackPos(cur) * 1000) / 1000 : null,
      stack: stack.map((t) => (t ? t.id || t.deferred : null)),
      ambience: amb ? amb.id : wantAmb,
      voices: voices.length,
      jingles: jingleDepth,
      volumes: { ...vols },
      muted,
      cachedMusic: musicLRU.map((u) => u.split('/').pop()),
      decoded: buffers.size,
      failed: [...failed],
    };
  }

  const api = {
    init,
    unlock,
    music,
    stopMusic,
    pushMusic,
    popMusic,
    sfx,
    jingle,
    ambience,
    setVolumes,
    getVolumes,
    preload,
    // extras
    setMuted,
    stopAll,
    currentMusic: () => currentId,
    isUnlocked: () => unlocked,
    has: (ref) => !!findKind(manifest, ref),
    meter,
    get manifest() { return manifest; },
    get context() { return ctx; },
    debugState,
  };
  return api;
}

export default createAudio;
