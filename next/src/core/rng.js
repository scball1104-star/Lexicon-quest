// Seeded random numbers (mulberry32). Pure: safe to import from node tests and pure modules.
//
//   const rng = createRng(1234);
//   rng.next()          float in [0, 1)
//   rng.int(1, 6)       integer, both ends inclusive
//   rng.range(0.5, 2)   float in [a, b)
//   rng.pick(array)     one element (undefined for an empty array)
//   rng.chance(0.25)    true with probability p
//   rng.weighted(items, w => w.weight)   weighted pick
//   rng.shuffle(array)  in-place Fisher-Yates, returns the array
//   rng.fork('loot')    independent child stream derived from this seed and a label
//   rng.state / rng.state = n   save and restore the exact position in the stream

/** Raw mulberry32 step function. Returns a function producing floats in [0, 1). */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Hash a string (or number) to a 32-bit unsigned seed (FNV-1a + avalanche). */
export function hashSeed(value) {
  const s = String(value);
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

/**
 * Stateless 2D hash in [0, 1). Use for per-tile variation that must not depend on draw order
 * (grass variants, flower placement): hash2d(x, y, seed).
 */
export function hash2d(x, y, seed = 0) {
  let h = (Math.imul(x | 0, 0x27d4eb2d) ^ Math.imul(y | 0, 0x165667b1) ^ Math.imul(seed | 0, 0x9e3779b1)) >>> 0;
  h ^= h >>> 15; h = Math.imul(h, 0x2c1b3c6d);
  h ^= h >>> 12; h = Math.imul(h, 0x297a2d39);
  h ^= h >>> 15;
  return (h >>> 0) / 4294967296;
}

export function createRng(seed = 1) {
  let s = (typeof seed === 'number' ? seed : hashSeed(seed)) >>> 0;
  const initialSeed = s;

  const rng = {
    get seed() { return initialSeed; },
    /** Current internal state (a uint32). Assign it back to resume the exact sequence. */
    get state() { return s; },
    set state(v) { s = v >>> 0; },

    next() {
      s = (s + 0x6d2b79f5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
    /** Integer in [a, b] inclusive. int(n) means [0, n - 1]. */
    int(a, b) {
      if (b === undefined) { b = a - 1; a = 0; }
      if (b < a) [a, b] = [b, a];
      return a + Math.floor(rng.next() * (b - a + 1));
    },
    /** Float in [a, b). */
    range(a, b) { return a + rng.next() * (b - a); },
    chance(p) { return rng.next() < p; },
    pick(arr) { return arr.length ? arr[Math.floor(rng.next() * arr.length)] : undefined; },
    /**
     * Weighted pick. weights may be an array of numbers (parallel to items), a function item => weight,
     * or omitted when items are {weight} objects.
     */
    weighted(items, weights) {
      if (!items.length) return undefined;
      const w = items.map((it, i) => Math.max(0, Array.isArray(weights) ? weights[i]
        : typeof weights === 'function' ? weights(it, i) : (it && it.weight) || 0));
      const total = w.reduce((a, b) => a + b, 0);
      if (total <= 0) return items[Math.floor(rng.next() * items.length)];
      let r = rng.next() * total;
      for (let i = 0; i < items.length; i++) { r -= w[i]; if (r < 0) return items[i]; }
      return items[items.length - 1];
    },
    shuffle(arr) {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(rng.next() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    },
    /** Gaussian-ish value (sum of 3 uniforms), mean 0, roughly in [-1, 1]. Good for jitter. */
    jitter() { return (rng.next() + rng.next() + rng.next()) / 1.5 - 1; },
    /** Independent child stream. Same parent seed + label always yields the same child. */
    fork(label = '') { return createRng(hashSeed(`${initialSeed}:${label}`)); },
  };
  return rng;
}
