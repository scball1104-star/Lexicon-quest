// Two small seams the core field does not have, kept in the ep4 pack (E4-seamfix, 2026-11-04). ./events.js attach()
// installs both on every field instance; nothing here touches a core file.
//
// 1. Compound flags. `all:<term>,<term>,...` is true when every term holds; a term is a flag id, or `!` and a flag id
//    (not set). It lets one `if` / `ifNot` say what a single conjunction of monotonic flags cannot: "from A until B".
//    The scene-twin NPCs use it: Joss and Ada are hidden while their scene spawns (joss_t, ada_t) can be on screen,
//    `show: { ifNot: 'all:charter_restored,!ep4_complete' }`, and are back once ep4_complete is set. A hasFlag that does
//    not know the key (a tool, the old core) reads false, so the NPC shows: the old behaviour, never a lost NPC.
// 2. weatherIf. A map with `weather: 'rain'` and `weatherIf: { if, ifNot }` rains only while the condition matches
//    (Valewyn: `weatherIf: { ifNot: 'vw_restored' }`). The core field sets rain from `weather` once per load; the pack
//    re-reads the condition every frame (cheap, like the core's weather zone), so the rain eases off the moment the
//    flag is set mid-scene and a later arrival is dry from the first frame. The map's ambience (canal_rain) follows the
//    same condition (E4-integrate).
import { matches } from '../../story/dialogue.js';

const ALL = 'all:';

export function isCompoundFlag(key) { return typeof key === 'string' && key.startsWith(ALL) && key.length > ALL.length; }

/** The terms of `all:a,!b` as [[flag, wantSet], ...], or null for any other key. Pure. */
export function compoundTerms(key) {
  if (!isCompoundFlag(key)) return null;
  const out = [];
  for (const raw of key.slice(ALL.length).split(',')) {
    const t = raw.trim();
    if (!t) continue;
    out.push(t[0] === '!' ? [t.slice(1), false] : [t, true]);
  }
  return out.length ? out : null;
}

/** `all:a,!b` against hasFlag; undefined for any other key. Pure. */
export function compoundFlag(key, hasFlag) {
  const terms = compoundTerms(key);
  if (!terms) return undefined;
  for (const [f, want] of terms) if (!!hasFlag(f) !== want) return false;
  return true;
}

/** A hasFlag that also answers compound keys (tests and tools; the field gets the same through attach()). */
export function withCompound(hasFlag) {
  const h = (k) => (isCompoundFlag(k) ? compoundFlag(k, h) : hasFlag(k));
  return h;
}

/** Should this map rain now? null when the map has no `weatherIf` (the core's `weather` stands). Pure. */
export function weatherWanted(mod, hasFlag) {
  if (!mod || mod.weather !== 'rain' || mod.weatherZone || !mod.weatherIf) return null;
  return matches(mod.weatherIf, hasFlag);
}

/** Every frame, from the wrapped glass.update: rain follows `weatherIf`. On the first frame of a new map, dry is dry at once. */
export function syncWeather(field) {
  const p = field && field.particles;
  if (!p || typeof p.setRain !== 'function') return;
  const map = field.map;
  const want = weatherWanted(map && map.mod, field.hasFlag);
  const fresh = field.ep4WeatherMap !== map;
  field.ep4WeatherMap = map;
  if (want === null) return;
  p.setRain(want);
  if (fresh && !want && typeof p.rainIntensity === 'number') p.rainIntensity = 0;
  // the map's ambience (canal_rain) follows the same condition: it eases out with the rain, and a dry arrival is quiet
  const amb = map.mod.ambience, audio = field.engine && field.engine.audio;
  if (!amb || !audio || typeof audio.ambience !== 'function' || (!fresh && field.ep4AmbWant === want)) return;
  field.ep4AmbWant = want;
  if (want) audio.ambience(amb, { fade: 1.2 });
  else audio.ambience(null, { fade: fresh ? 0.3 : 2.5 });
}
