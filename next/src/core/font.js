// Bitmap font renderer for the COMMON.md font format:
//   {"image":"font.png","lineHeight":11,"baseline":8,"spaceAdvance":3,
//    "glyphs":{"A":[x,y,w,h,xoff,yoff,advance]},"kerning":{"AV":-1}}
// Glyphs are white on transparent; colors are produced by tinting (one cached sheet per color).
//
// Inline codes inside strings:
//   {c:gold}Text{/c}     color (named color or #hex), nestable
//   {i:potion}           inline icon (needs fonts.setIconResolver), counts as one character
// Anything else in braces (for example {hero}) is drawn literally: substitute variables before drawing.
//
// The parsing, measuring and wrapping half of this module is pure (node tests import it).
// Drawing needs a 2D context and lazily creates tint canvases.

import { buildFallbackFont } from './fallbackFont.js';

// Text colors for {c:name}. Base names match assets/ui/ui.json "textColors" (palette.json values, from
// W1-ui-art); the engine re-applies ui.json's table at boot via setNamedColors so art stays the source.
export const NAMED_COLORS = {
  white: '#f6f4ee', text: '#f6f4ee', gray: '#b3b6c4', grey: '#b3b6c4', dim: '#8e8997', dark: '#4a4560',
  ink: '#14101e', black: '#14101e', shadow: '#14101e',
  gold: '#f9d77a', cream: '#fff7d6', yellow: '#fff27a', orange: '#eba14d', red: '#e06b39', pink: '#fcc4dc',
  green: '#b6cc58', teal: '#5fd6c0', cyan: '#8af0e8', blue: '#6ab3e4', violet: '#bc94e2', purple: '#a77bff',
  brown: '#c8915a',
  hp: '#8fe07a', mp: '#6ab3e4', fury: '#eba14d', heal: '#8fe07a', damage: '#f6f4ee', crit: '#f9d77a',
  // Diablo rarity colors (DESIGN 6.4)
  common: '#e8e8e8', magic: '#6f8cff', rare: '#ffd34d', legendary: '#ff8a2a', set: '#3cdc6a',
};

/** Merge named colors (e.g. ui.json textColors + rarity). Existing tint caches stay valid per hex value. */
export function setNamedColors(map) {
  for (const [k, v] of Object.entries(map || {})) if (typeof v === 'string') NAMED_COLORS[k] = v;
}

export function resolveColor(c) {
  if (!c) return NAMED_COLORS.white;
  return NAMED_COLORS[c] || c;
}

// ---------------------------------------------------------------- parsing (pure)

const CODE_RE = /\{(c:([^}]+)|\/c|i:([^}]+))\}/g;
const tokenCache = new Map();

/**
 * Tokenize a string. Token kinds: {k:'ch', ch} {k:'nl'} {k:'open', color} {k:'close'} {k:'icon', id}.
 * Results are cached (strings in a game repeat a lot).
 */
export function parseText(text) {
  text = text == null ? '' : String(text);
  const hit = tokenCache.get(text);
  if (hit) return hit;
  const out = [];
  let last = 0;
  CODE_RE.lastIndex = 0;
  let m;
  const pushChars = (s) => {
    for (const ch of s) out.push(ch === '\n' ? { k: 'nl' } : { k: 'ch', ch });
  };
  while ((m = CODE_RE.exec(text))) {
    pushChars(text.slice(last, m.index));
    if (m[2] !== undefined) out.push({ k: 'open', color: m[2].trim() });
    else if (m[3] !== undefined) out.push({ k: 'icon', id: m[3].trim() });
    else out.push({ k: 'close' });
    last = m.index + m[0].length;
  }
  pushChars(text.slice(last));
  if (tokenCache.size > 2000) tokenCache.clear();
  tokenCache.set(text, out);
  return out;
}

/** Remove color/icon codes, leaving plain text. */
export function stripCodes(text) {
  return String(text == null ? '' : text).replace(CODE_RE, '');
}

function serialize(tokens) {
  let s = '';
  for (const t of tokens) {
    if (t.k === 'ch') s += t.ch;
    else if (t.k === 'nl') s += '\n';
    else if (t.k === 'open') s += `{c:${t.color}}`;
    else if (t.k === 'close') s += '{/c}';
    else if (t.k === 'icon') s += `{i:${t.id}}`;
  }
  return s;
}

// ---------------------------------------------------------------- the font

let makeCanvas = (w, h) => {
  if (typeof OffscreenCanvas !== 'undefined' && typeof document === 'undefined') return new OffscreenCanvas(w, h);
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
};
/** Override canvas creation (tests, workers). */
export function setCanvasFactory(fn) { makeCanvas = fn; }

export class BitmapFont {
  /**
   * @param {object} def    font JSON (COMMON.md format)
   * @param {CanvasImageSource|null} source  white glyph sheet (null for measure-only use)
   * @param {object} [opts] { id, fallback: BitmapFont used for glyphs this font lacks, iconSize }
   */
  constructor(def, source = null, opts = {}) {
    this.id = opts.id || 'font';
    this.def = def;
    this.source = source;
    this.fallback = opts.fallback || null;
    this.lineHeight = def.lineHeight || 11;
    this.baseline = def.baseline || 8;
    this.spaceAdvance = def.spaceAdvance ?? 3;
    this.letterSpacing = def.letterSpacing || 0;
    this.glyphs = def.glyphs || {};
    this.kerning = def.kerning || {};
    this.missing = def.missing && this.glyphs[def.missing] ? def.missing : (this.glyphs['?'] ? '?' : null);
    this.iconResolver = opts.iconResolver || null;
    // Pre-colored fonts (battle numbers with a built-in outline) are drawn untinted. Their "color" picks
    // a variant row: glyph y + variants[name] (font_num.json: white, crit, heal, mp, poison, gray).
    this.variants = def.variants || null;
    this.precolored = !!(def.variants || def.tint === false || def.colored);
    this.defaultShadow = def.shadow !== false && !this.precolored;
    this.words = def.words || {};
    this._tints = new Map();
  }

  /** Variant y offset for a pre-colored font (color name -> row offset), else 0. */
  variantOffset(color) {
    if (!this.variants) return 0;
    if (color != null && this.variants[color] != null) return this.variants[color];
    return this.variants.white ?? 0;
  }

  /**
   * Draw pre-drawn word art from the font sheet (font_num: MISS, CRITICAL, WEAK, BREAK, RESIST, IMMUNE,
   * GUARD, DODGE). opts: { align: 'left'|'center'|'right', alpha }. Returns the drawn width (0 if missing).
   */
  drawWord(ctx, word, x, y, opts = {}) {
    const r = this.words[word];
    if (!r || !this.source) return 0;
    let dx = Math.round(x);
    if (opts.align === 'center') dx -= Math.floor(r[2] / 2);
    else if (opts.align === 'right') dx -= r[2];
    const prev = ctx.globalAlpha;
    if (opts.alpha != null) ctx.globalAlpha = prev * opts.alpha;
    ctx.drawImage(this.source, r[0], r[1], r[2], r[3], dx, Math.round(y), r[2], r[3]);
    ctx.globalAlpha = prev;
    return r[2];
  }

  /** Returns [glyphArray, ownerFont] for a character (falls back to the fallback font, then '?'). */
  lookup(ch) {
    const g = this.glyphs[ch];
    if (g) return [g, this];
    if (this.fallback) {
      const fg = this.fallback.glyphs[ch];
      if (fg) return [fg, this.fallback];
    }
    if (this.missing) return [this.glyphs[this.missing], this];
    return [null, this];
  }

  /** Pen advance for ch followed by next (kerning applied). */
  advance(ch, next) {
    if (ch === ' ') return this.spaceAdvance + this.letterSpacing;
    const [g] = this.lookup(ch);
    let a = g ? g[6] : this.spaceAdvance;
    if (next && this.kerning[ch + next]) a += this.kerning[ch + next];
    return a + this.letterSpacing;
  }

  iconWidth(id) {
    const r = this.iconResolver && this.iconResolver(id);
    return r ? r.w + 1 : 13;
  }

  /** Width in pixels of a token run (one line, no newlines). Ink extent: no trailing glyph gap. */
  _runWidth(tokens) {
    let w = 0, lastGap = 0;
    for (let i = 0; i < tokens.length; i++) {
      const t = tokens[i];
      if (t.k === 'ch') {
        let next = null;
        for (let j = i + 1; j < tokens.length; j++) { if (tokens[j].k === 'ch') { next = tokens[j].ch; break; } if (tokens[j].k === 'icon') break; }
        const a = this.advance(t.ch, next);
        w += a;
        if (t.ch === ' ') lastGap = 0;
        else { const [g] = this.lookup(t.ch); lastGap = g ? Math.max(0, a - (g[4] + g[2])) : 0; }
      } else if (t.k === 'icon') { const iw = this.iconWidth(t.id); w += iw; lastGap = 1; }
    }
    return Math.max(0, w - lastGap);
  }

  _lines(text) {
    const lines = [[]];
    for (const t of parseText(text)) {
      if (t.k === 'nl') lines.push([]);
      else lines[lines.length - 1].push(t);
    }
    return lines;
  }

  /** Width of the widest line (codes ignored). */
  measure(text) {
    let w = 0;
    for (const line of this._lines(text)) w = Math.max(w, this._runWidth(line));
    return w;
  }

  /** { width, height, lines } for a (possibly multi-line) string. */
  measureBlock(text, lineHeight = this.lineHeight) {
    const lines = this._lines(text);
    return { width: Math.max(0, ...lines.map((l) => this._runWidth(l))), height: lines.length * lineHeight, lines: lines.length };
  }

  /** Number of visible characters (what typewriter counts). Codes and newlines do not count. */
  length(text) {
    let n = 0;
    for (const t of parseText(text)) if (t.k === 'ch' || t.k === 'icon') n++;
    return n;
  }

  /**
   * Word-wrap to maxWidth. Returns an array of line strings. Explicit newlines are kept.
   * Color codes stay balanced on every line (an open color is closed at the break and reopened after).
   */
  wrap(text, maxWidth) {
    const tokens = parseText(text);
    const result = [];
    const stack = []; // open colors at the current point
    let line = [];       // tokens of current line
    let lineHasInk = false;
    let word = [];       // tokens of the pending word (may include codes)
    let pendingSpaces = [];

    const width = (toks) => this._runWidth(toks);
    const reopen = () => stack.map((c) => ({ k: 'open', color: c }));
    const closeAll = (toks, depth) => { for (let i = 0; i < depth; i++) toks.push({ k: 'close' }); };

    // Color depth at the end of `toks` given starting depth.
    const depthAfter = (toks, start) => {
      let d = start;
      for (const t of toks) { if (t.k === 'open') d++; else if (t.k === 'close') d = Math.max(0, d - 1); }
      return d;
    };

    const flushLine = () => {
      // Drop trailing spaces.
      while (line.length && line[line.length - 1].k === 'ch' && line[line.length - 1].ch === ' ') line.pop();
      const out = line.slice();
      closeAll(out, stack.length);
      result.push(serialize(out));
      line = reopen();
      lineHasInk = false;
    };

    const applyCodes = (toks) => {
      for (const t of toks) {
        if (t.k === 'open') stack.push(t.color);
        else if (t.k === 'close') stack.pop();
      }
    };

    const placeWord = () => {
      if (!word.length) { return; }
      const candidate = lineHasInk ? line.concat(pendingSpaces, word) : line.concat(word);
      if (!lineHasInk || width(candidate) <= maxWidth) {
        if (!lineHasInk && width(line.concat(word)) > maxWidth) {
          // Word longer than a whole line: hard-break it by characters.
          for (const t of word) {
            if (t.k === 'ch' || t.k === 'icon') {
              if (lineHasInk && width(line.concat([t])) > maxWidth) flushLine();
              line.push(t); lineHasInk = true;
            } else { line.push(t); applyCodes([t]); }
          }
        } else {
          line = candidate; lineHasInk = true; applyCodes(word);
        }
      } else {
        flushLine();
        line = line.concat(word); lineHasInk = true; applyCodes(word);
      }
      word = []; pendingSpaces = [];
    };

    for (const t of tokens) {
      if (t.k === 'nl') {
        placeWord();
        flushLine();
        pendingSpaces = [];
      } else if (t.k === 'ch' && t.ch === ' ') {
        if (word.length) placeWord();
        if (lineHasInk) pendingSpaces.push(t);
      } else {
        // Codes between words attach to the next word; codes right after a word attach to it.
        word.push(t);
      }
    }
    placeWord();
    // Final line: no trailing close needed beyond balancing.
    while (line.length && line[line.length - 1].k === 'ch' && line[line.length - 1].ch === ' ') line.pop();
    const out = line.slice();
    closeAll(out, depthAfter([], stack.length));
    result.push(serialize(out));
    // Remove purely-code empty last line produced by trailing newline? Keep: an explicit trailing \n is a blank line.
    return result;
  }

  // ---------------------------------------------------------------- drawing

  /** A canvas holding this font's sheet tinted to `color`. */
  tinted(color) {
    color = resolveColor(color);
    let c = this._tints.get(color);
    if (c) return c;
    const src = this.source;
    if (!src) return null;
    const w = src.width, h = src.height;
    c = makeCanvas(w, h);
    const g = c.getContext('2d');
    g.imageSmoothingEnabled = false;
    g.drawImage(src, 0, 0);
    g.globalCompositeOperation = 'source-in';
    g.fillStyle = color;
    g.fillRect(0, 0, w, h);
    if (this._tints.size > 48) this._tints.clear();
    this._tints.set(color, c);
    return c;
  }

  /**
   * Draw text. (x, y) is the top-left of the first line box (or the anchor for align center/right).
   * opts: { color='white', shadow=true, shadowColor='ink', outline=null (color), align='left'|'center'|'right',
   *         width (align inside a box of this width), lineHeight, chars (typewriter: max visible chars),
   *         alpha }
   * Pre-colored fonts (def.variants, e.g. font_num) ignore tint/shadow/outline; color names a variant.
   * Returns { width, height, drawn } where drawn = visible chars drawn.
   */
  draw(ctx, text, x, y, opts = {}) {
    const lines = this._lines(text);
    const lh = opts.lineHeight || this.lineHeight;
    const align = opts.align || 'left';
    const baseColor = opts.color || 'white';
    const limit = opts.chars == null ? Infinity : opts.chars;
    const shadow = (opts.shadow ?? this.defaultShadow) !== false && !opts.outline && !this.precolored;
    const shadowColor = opts.shadowColor || 'ink';
    const prevAlpha = ctx.globalAlpha;
    if (opts.alpha != null) ctx.globalAlpha = prevAlpha * opts.alpha;
    x = Math.round(x); y = Math.round(y);

    let maxW = 0;
    const layout = lines.map((line) => { const w = this._runWidth(line); maxW = Math.max(maxW, w); return w; });

    const passes = [];
    if (opts.outline && !this.precolored) passes.push({ color: opts.outline, offsets: [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]], fixed: true });
    if (shadow) passes.push({ color: shadowColor, offsets: [[1, 1]], fixed: true });
    passes.push({ color: null, offsets: [[0, 0]], fixed: false });

    let drawn = 0;
    for (const pass of passes) {
      let count = 0;
      const stack = [baseColor];
      for (let li = 0; li < lines.length; li++) {
        const line = lines[li];
        const lw = layout[li];
        let pen = x;
        if (align === 'center') pen = opts.width != null ? x + Math.floor((opts.width - lw) / 2) : x - Math.floor(lw / 2);
        else if (align === 'right') pen = opts.width != null ? x + opts.width - lw : x - lw;
        const ly = y + li * lh;
        for (let i = 0; i < line.length; i++) {
          const t = line[i];
          if (t.k === 'open') { stack.push(t.color); continue; }
          if (t.k === 'close') { if (stack.length > 1) stack.pop(); continue; }
          if (count >= limit) break;
          if (t.k === 'icon') {
            const r = this.iconResolver && this.iconResolver(t.id);
            if (r && !pass.fixed) {
              ctx.drawImage(r.image, r.x, r.y, r.w, r.h, pen, ly + Math.round((lh - r.h) / 2) - 1, r.w, r.h);
            }
            pen += r ? r.w + 1 : 13;
            count++;
            continue;
          }
          let next = null;
          for (let j = i + 1; j < line.length; j++) { if (line[j].k === 'ch') { next = line[j].ch; break; } if (line[j].k === 'icon') break; }
          const adv = this.advance(t.ch, next);
          if (t.ch !== ' ') {
            const [g, owner] = this.lookup(t.ch);
            if (g) {
              const color = pass.color || stack[stack.length - 1];
              const sheet = owner.precolored ? owner.source : owner.tinted(color);
              const vy = owner.precolored ? owner.variantOffset(color) : 0;
              if (sheet) {
                for (const [ox, oy] of pass.offsets) {
                  ctx.drawImage(sheet, g[0], g[1] + vy, g[2], g[3], pen + g[4] + ox, ly + g[5] + oy, g[2], g[3]);
                }
              }
            }
          }
          pen += adv;
          count++;
        }
        if (count >= limit) break;
      }
      drawn = count;
    }
    ctx.globalAlpha = prevAlpha;
    return { width: maxW, height: lines.length * lh, drawn };
  }

  /** Typewriter helper: draw only the first n visible characters. */
  drawPartial(ctx, text, n, x, y, opts = {}) {
    return this.draw(ctx, text, x, y, { ...opts, chars: n });
  }
}

// ---------------------------------------------------------------- font set

let fallbackCache = null;
function fallbackParts() {
  if (!fallbackCache) fallbackCache = buildFallbackFont();
  return fallbackCache;
}

/** Rasterize the embedded fallback font into a white-on-transparent canvas. */
function rasterizeFallback() {
  const { bitmap } = fallbackParts();
  const c = makeCanvas(bitmap.width, bitmap.height);
  const g = c.getContext('2d');
  const img = g.createImageData(bitmap.width, bitmap.height);
  for (let i = 0; i < bitmap.data.length; i++) {
    if (bitmap.data[i]) { const o = i * 4; img.data[o] = img.data[o + 1] = img.data[o + 2] = 255; img.data[o + 3] = 255; }
  }
  g.putImageData(img, 0, 0);
  return c;
}

/** The fallback font as a measure-only BitmapFont (no canvas needed). Handy for node tests. */
export function fallbackFontForMeasure() {
  return new BitmapFont(fallbackParts().def, null, { id: 'fallback' });
}

/**
 * createFonts({ canvas: true }) -> font registry.
 *   fonts.get('main' | 'large' | 'num' | id)  always returns a font (fallback if not registered)
 *   fonts.register(id, def, image)            install a loaded font
 *   fonts.setIconResolver(fn)                 fn(iconId) -> {image, x, y, w, h} | null
 */
export function createFonts(opts = {}) {
  const raster = opts.canvas === false ? null : rasterizeFallback();
  const fallback = new BitmapFont(fallbackParts().def, raster, { id: 'fallback' });
  const fonts = new Map();
  let iconResolver = null;

  const api = {
    fallback,
    get(id = 'main') {
      return fonts.get(id) || (id === 'large' || id === 'title' ? fonts.get('main') : null) || fallback;
    },
    has(id) { return fonts.has(id); },
    register(id, def, image) {
      const f = new BitmapFont(def, image || null, { id, fallback, iconResolver });
      fonts.set(id, f);
      return f;
    },
    setIconResolver(fn) {
      iconResolver = fn;
      fallback.iconResolver = fn;
      for (const f of fonts.values()) f.iconResolver = fn;
    },
    ids() { return [...fonts.keys()]; },
  };
  return api;
}
