// PWA: web app manifest, icons and the iOS tags in index.html (W6-pwa).
import test from 'node:test';
import assert from 'node:assert/strict';
import { read, exists, readJson, pngSize } from './_lib.mjs';

const man = readJson('manifest.webmanifest');
const html = read('index.html');
const palette = readJson('assets/palette.json');

test('manifest: identity, display and colors', () => {
  assert.equal(man.name, 'Lexicon Quest');
  assert.equal(man.short_name, 'Lexicon');
  assert.equal(man.display, 'standalone');
  assert.equal(man.orientation, 'any');
  assert.match(man.theme_color, /^#[0-9a-f]{6}$/i);
  assert.match(man.background_color, /^#[0-9a-f]{6}$/i);
  assert.equal(man.theme_color.toLowerCase(), palette.ramps.ink[0].toLowerCase(), 'theme color is the palette ink');
  assert.equal(man.background_color.toLowerCase(), palette.ramps.ink[0].toLowerCase());
  const theme = /<meta name="theme-color" content="(#[0-9a-f]{6})"/i.exec(html);
  assert.ok(theme, 'index.html has a theme-color meta');
  assert.equal(theme[1].toLowerCase(), man.theme_color.toLowerCase(), 'html theme-color matches the manifest');
});

test('manifest: start_url and scope stay inside next/', () => {
  const base = new URL('https://example.test/Lexicon-quest/next/manifest.webmanifest');
  const start = new URL(man.start_url, base), scope = new URL(man.scope, base);
  assert.equal(scope.pathname, '/Lexicon-quest/next/');
  assert.ok(start.pathname.startsWith(scope.pathname), 'start_url is inside the scope');
  assert.ok(exists(start.pathname.slice(scope.pathname.length) || 'index.html'), 'start_url file exists');
});

test('manifest: icons exist, have the declared size, and cover 192/512 any + maskable', () => {
  const seen = new Set();
  for (const ic of man.icons) {
    assert.ok(exists(ic.src), `icon file exists: ${ic.src}`);
    assert.equal(ic.type, 'image/png');
    const [w, h] = ic.sizes.split('x').map(Number);
    const real = pngSize(ic.src);
    assert.ok(real, `${ic.src} is a PNG`);
    assert.deepEqual([real.w, real.h], [w, h], `${ic.src} is really ${ic.sizes}`);
    assert.ok(['any', 'maskable'].includes(ic.purpose), `purpose of ${ic.src}`);
    seen.add(`${ic.purpose}:${ic.sizes}`);
  }
  for (const k of ['any:192x192', 'any:512x512', 'maskable:192x192', 'maskable:512x512']) assert.ok(seen.has(k), `manifest lists ${k}`);
});

test('icons: apple-touch-icon is 180x180 and the favicon 32x32', () => {
  const a = pngSize('assets/icons/apple-touch-icon.png'), f = pngSize('assets/icons/favicon-32.png');
  assert.deepEqual([a.w, a.h], [180, 180]);
  assert.deepEqual([f.w, f.h], [32, 32]);
});

test('index.html: manifest link, iOS full-screen tags, icons', () => {
  assert.match(html, /<link rel="manifest" href="manifest\.webmanifest">/);
  assert.match(html, /<meta name="apple-mobile-web-app-capable" content="yes">/);
  assert.match(html, /<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">/);
  assert.match(html, /<meta name="apple-mobile-web-app-title" content="Lexicon Quest">/);
  assert.match(html, /viewport-fit=cover/);
  const touch = /<link rel="apple-touch-icon"[^>]*href="([^"]+)"/.exec(html);
  assert.ok(touch && exists(touch[1]), 'apple-touch-icon link points at a real file');
  for (const m of html.matchAll(/<link rel="icon"[^>]*href="([^"]+)"/g)) assert.ok(exists(m[1]), `favicon ${m[1]} exists`);
  assert.doesNotMatch(html, /\.\.\/icon-/, 'no link to the old root game icons');
});

test('main.js registers the worker with the right scope, never on ?debug=1, and shows the update toast', () => {
  const main = read('src/main.js');
  assert.match(main, /function registerWorker\(\) \{\s*if \(debug \|\|/, 'registerWorker returns early for debug runs');
  assert.match(main, /new URL\('\.\.\/sw\.js', import\.meta\.url\)/);
  assert.match(main, /new URL\('\.\.\/', import\.meta\.url\)\.pathname/, 'scope is the next/ folder');
  assert.match(main, /if \(!debug\) setTimeout\(registerWorker/);
  assert.match(main, /Update ready, restart to apply/);
});

test('sw.js: debug bypass, range support, versioned shell cache', () => {
  const sw = read('sw.js');
  assert.match(sw, /searchParams\.get\('debug'\) === '1'/);
  assert.match(sw, /isDebugRequest/);
  assert.match(sw, /'range'/);
  assert.match(sw, /status: 206/);
  assert.match(sw, /lq-next-shell-/);
  assert.match(sw, /cache: 'no-cache'/, 'install revalidates instead of trusting the HTTP cache');
});

test('no em dashes in the PWA files', () => {
  for (const f of ['sw.js', 'manifest.webmanifest', 'index.html', 'src/main.js', 'docs/PWA.md', 'qa/pwa/pwa.py', 'qa/pwa/_lib.mjs', 'tools/pwa/build_pwa.py', 'tools/pwa/make_icons.py']) {
    if (exists(f)) assert.ok(!read(f).includes('—'), `${f} contains an em dash`);
  }
});
