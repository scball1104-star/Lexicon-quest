// Save slots and settings in localStorage. Every storage call is wrapped: private mode, quota errors
// and corrupt JSON never throw into the game. Pure enough for node tests (inject a fake storage).
//
// Keys:   lq-next-slot-1 .. lq-next-slot-3   manual save slots (player-facing numbers 1..3)
//         lq-next-slot-0                     autosave / resume slot (optional use)
//         lq-next-settings                   settings object
// Format: { v: SAVE_VERSION, savedAt: ISO string, meta: {...summary for the load screen}, data: {...} }

export const SAVE_VERSION = 1;
export const SLOT_COUNT = 3;
export const AUTO_SLOT = 0;

export const DEFAULT_SETTINGS = Object.freeze({
  master: 0.8, music: 0.7, sfx: 0.8, ambience: 0.6,
  windowColor: 'blue',        // blue | crimson | forest | violet | slate | ember
  textSpeed: 2,               // 1 slow, 2 normal, 3 fast, 4 instant
  battleSpeed: 1,             // 1 or 2
  autoBattle: false,
  equipPrompts: true,         // offer to equip better gear when it is found (W5)
  alwaysRun: false,           // when true, holding run walks instead
  reduceMotion: false,        // no screen shake, softer flashes (defaults to the OS preference)
  scaleMode: 'integer',       // integer | fit | sharp
  backdrop: 'ambient',        // ambient | plain
  touchControls: 'auto',      // auto | on | off
  touchOpacity: 0.75,
  showFps: false,
});

function memoryStorage() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => { m.set(k, String(v)); },
    removeItem: (k) => { m.delete(k); },
    key: (i) => [...m.keys()][i] ?? null,
    get length() { return m.size; },
  };
}

function defaultStorage() {
  try {
    const s = globalThis.localStorage;
    if (!s) return memoryStorage();
    const probe = '__lq_probe__';
    s.setItem(probe, '1'); s.removeItem(probe);
    return s;
  } catch {
    return memoryStorage();
  }
}

/**
 * createSave({ storage, prefix, now, log })
 *   storage: localStorage-like object (defaults to window.localStorage, falls back to memory)
 *   prefix:  key prefix, default 'lq-next'
 */
export function createSave(opts = {}) {
  const storage = opts.storage || defaultStorage();
  const prefix = opts.prefix || 'lq-next';
  const now = opts.now || (() => new Date().toISOString());
  const log = opts.log || ((...a) => { if (globalThis.console) console.warn('[save]', ...a); });
  const migrations = new Map(); // fromVersion -> fn(envelope) => envelope at fromVersion + 1

  const slotKey = (n) => `${prefix}-slot-${n}`;
  const settingsKey = `${prefix}-settings`;

  function read(key) {
    try { return storage.getItem(key); } catch (e) { log('read failed', key, e && e.message); return null; }
  }
  function write(key, value) {
    try { storage.setItem(key, value); return true; } catch (e) { log('write failed', key, e && e.message); return false; }
  }
  function remove(key) {
    try { storage.removeItem(key); return true; } catch (e) { log('remove failed', key, e && e.message); return false; }
  }
  function parse(raw, key) {
    if (raw == null) return null;
    try { return JSON.parse(raw); } catch { log('corrupt JSON in', key); return null; }
  }
  function checkSlot(n) {
    if (!Number.isInteger(n) || n < 0 || n > SLOT_COUNT) throw new RangeError(`save slot must be 0..${SLOT_COUNT}, got ${n}`);
  }
  function migrate(env) {
    let e = env;
    let guard = 0;
    while (e && typeof e.v === 'number' && e.v < SAVE_VERSION && guard++ < 100) {
      const fn = migrations.get(e.v);
      if (!fn) { log(`no migration from v${e.v}`); return null; }
      e = fn(e);
    }
    if (!e || e.v > SAVE_VERSION) { if (e) log(`save is from a newer version (v${e.v})`); return null; }
    return e;
  }

  const api = {
    version: SAVE_VERSION,
    slots: SLOT_COUNT,
    /** Register a migration from version `from` to `from + 1`: fn(envelope) => envelope. */
    registerMigration(from, fn) { migrations.set(from, fn); },

    /** Write data to slot n (0..3). meta is a small summary for the load screen. Returns true on success. */
    save(n, data, meta = {}) {
      checkSlot(n);
      let raw;
      try { raw = JSON.stringify({ v: SAVE_VERSION, savedAt: now(), meta, data }); }
      catch (e) { log('data is not serializable', e && e.message); return false; }
      return write(slotKey(n), raw);
    },
    /** Returns the stored data object, or null (missing, corrupt or unmigratable). */
    load(n) {
      const env = api.loadEnvelope(n);
      return env ? env.data : null;
    },
    /** Returns { v, savedAt, meta, data } or null. */
    loadEnvelope(n) {
      checkSlot(n);
      const env = parse(read(slotKey(n)), slotKey(n));
      if (!env || typeof env !== 'object' || !('data' in env)) return null;
      return migrate(env);
    },
    exists(n) { checkSlot(n); return read(slotKey(n)) != null; },
    remove(n) { checkSlot(n); return remove(slotKey(n)); },
    /** Summaries for slots 1..3 (pass includeAuto to prepend slot 0). */
    list(includeAuto = false) {
      const out = [];
      for (let n = includeAuto ? 0 : 1; n <= SLOT_COUNT; n++) {
        const env = api.loadEnvelope(n);
        out.push({ slot: n, exists: !!env, savedAt: env ? env.savedAt : null, meta: env ? env.meta || {} : null });
      }
      return out;
    },
    /** Raw JSON string for backup/export, or null. */
    exportSlot(n) { checkSlot(n); return read(slotKey(n)); },
    /** Import a string produced by exportSlot. Validates before writing. */
    importSlot(n, raw) {
      checkSlot(n);
      const env = parse(raw, 'import');
      if (!env || typeof env !== 'object' || !('data' in env) || !migrate(env)) return false;
      return write(slotKey(n), raw);
    },

    /** Settings merged over DEFAULT_SETTINGS (unknown keys kept, so newer builds can add fields). */
    loadSettings(defaults = DEFAULT_SETTINGS) {
      const s = parse(read(settingsKey), settingsKey);
      return { ...defaults, ...(s && typeof s === 'object' ? s : {}) };
    },
    saveSettings(settings) {
      try { return write(settingsKey, JSON.stringify(settings)); } catch { return false; }
    },
  };
  return api;
}
