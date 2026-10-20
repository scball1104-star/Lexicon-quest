/* Lexicon Quest NEXT service worker (W6-pwa). Registered by src/main.js with scope = this folder (next/).
 *
 * Three kinds of request (full write-up in docs/PWA.md):
 *   shell    the game itself (html, modules, fonts, ui, tiles, sprites, backdrops, sfx, jingles). Listed in PRECACHE,
 *            downloaded at install into a cache named after SHELL_VERSION, served cache-first. A new version
 *            installs next to the old one and waits; the page shows "Update ready, restart to apply" and the new
 *            shell takes over the next time every tab is closed. Never half old, half new.
 *   runtime  music and the big painted sheets (../assets/audio, ../assets/art, ambience). Stale-while-revalidate
 *            into one long-lived cache, so a returning player hears and sees the cached copy at once and the
 *            copy is refreshed in the background. Range requests (the <audio> element) are answered with 206s
 *            cut from the cached file once it is complete; the first play streams from the network while the
 *            full file is cached behind it.
 *   debug    any page opened with ?debug=1, and everything that page loads, goes straight to the network.
 *
 * The block between the build_pwa markers is generated: run `python tools/pwa/build_pwa.py` after changing
 * anything in the shell (it rewrites SHELL_VERSION too, which is what makes browsers install the update).
 */
'use strict';

// build_pwa:begin
const SHELL_VERSION = 'd45f8019607a';
const PRECACHE = [
  'index.html',
  'manifest.webmanifest',
  'assets/manifest.json',
  'assets/palette.json',
  'assets/audio/manifest.json',
  'src/battle/ai.js',
  'src/battle/ctb.js',
  'src/battle/fx.js',
  'src/battle/loot.js',
  'src/battle/rules.js',
  'src/battle/scene/actors.js',
  'src/battle/scene/animator.js',
  'src/battle/scene/hud.js',
  'src/battle/scene/layout.js',
  'src/battle/scene/menu.js',
  'src/battle/scene/rewards.js',
  'src/battle/status.js',
  'src/core/assets.js',
  'src/core/audio.js',
  'src/core/debug.js',
  'src/core/engine.js',
  'src/core/fallbackFont.js',
  'src/core/font.js',
  'src/core/input.js',
  'src/core/renderer.js',
  'src/core/rng.js',
  'src/core/save.js',
  'src/core/touch.js',
  'src/core/tween.js',
  'src/data/encounters.js',
  'src/data/enemies.js',
  'src/data/items.js',
  'src/data/loot-tables.js',
  'src/data/maps/_kit.js',
  'src/data/maps/archive_boss.js',
  'src/data/maps/archive_f1.js',
  'src/data/maps/archive_f2.js',
  'src/data/maps/archive_f3.js',
  'src/data/maps/bakery.js',
  'src/data/maps/chapel.js',
  'src/data/maps/hero_home.js',
  'src/data/maps/inn.js',
  'src/data/maps/item_shop.js',
  'src/data/maps/library.js',
  'src/data/maps/smithy.js',
  'src/data/maps/valley.js',
  'src/data/maps/whisperwood_hollow.js',
  'src/data/maps/willowmere.js',
  'src/data/npcs.js',
  'src/data/party.js',
  'src/data/quests.js',
  'src/data/shops.js',
  'src/data/skills.js',
  'src/data/story/dialogue.js',
  'src/data/story/ep1.js',
  'src/data/text.js',
  'src/game/inventory.js',
  'src/game/state.js',
  'src/game/story.js',
  'src/main.js',
  'src/scenes/_devField.js',
  'src/scenes/_devGallery.js',
  'src/scenes/_devTitle.js',
  'src/scenes/_devUi.js',
  'src/scenes/battle.js',
  'src/scenes/config.js',
  'src/scenes/credits.js',
  'src/scenes/dialog.js',
  'src/scenes/field.js',
  'src/scenes/gameover.js',
  'src/scenes/inn.js',
  'src/scenes/loadGame.js',
  'src/scenes/menu.js',
  'src/scenes/nameEntry.js',
  'src/scenes/prologue.js',
  'src/scenes/registry.js',
  'src/scenes/shop.js',
  'src/scenes/title.js',
  'src/scenes/titleCard.js',
  'src/ui/choice.js',
  'src/ui/cursor.js',
  'src/ui/dialog.js',
  'src/ui/glyphs.js',
  'src/ui/help.js',
  'src/ui/index.js',
  'src/ui/keyart.js',
  'src/ui/list.js',
  'src/ui/numberPopup.js',
  'src/ui/party.js',
  'src/ui/screens/common.js',
  'src/ui/screens/equip.js',
  'src/ui/screens/items.js',
  'src/ui/screens/journal.js',
  'src/ui/screens/skills.js',
  'src/ui/screens/status.js',
  'src/ui/stage.js',
  'src/ui/text.js',
  'src/ui/toast.js',
  'src/ui/window.js',
  'src/world/_testmap.js',
  'src/world/abilities.js',
  'src/world/actors.js',
  'src/world/autotile.js',
  'src/world/camera.js',
  'src/world/cutscene.js',
  'src/world/events.js',
  'src/world/fieldart.js',
  'src/world/lighting.js',
  'src/world/maps.js',
  'src/world/npc.js',
  'src/world/particles.js',
  'src/world/pathfind.js',
  'src/world/tilemap.js',
  'src/world/townlife.js',
  'src/world/transitions.js',
  'assets/icons/apple-touch-icon.png',
  'assets/icons/favicon-32.png',
  'assets/icons/icon-192.png',
  'assets/icons/icon-512.png',
  'assets/icons/icon-maskable-192.png',
  'assets/icons/icon-maskable-512.png',
  'assets/ui/font.json',
  'assets/ui/font.png',
  'assets/ui/font_large.json',
  'assets/ui/font_large.png',
  'assets/ui/font_num.json',
  'assets/ui/font_num.png',
  'assets/ui/font_num_big.json',
  'assets/ui/heads.json',
  'assets/ui/heads.png',
  'assets/ui/logo.json',
  'assets/ui/logo.png',
  'assets/ui/ui.json',
  'assets/ui/ui.png',
  'assets/ui/window.json',
  'assets/ui/window.png',
  'assets/ui/touch/a.png',
  'assets/ui/touch/a_pressed.png',
  'assets/ui/touch/b.png',
  'assets/ui/touch/b_pressed.png',
  'assets/ui/touch/dpad.png',
  'assets/ui/touch/dpad_down.png',
  'assets/ui/touch/dpad_left.png',
  'assets/ui/touch/dpad_right.png',
  'assets/ui/touch/dpad_up.png',
  'assets/ui/touch/fullscreen.png',
  'assets/ui/touch/fullscreen_pressed.png',
  'assets/ui/touch/menu.png',
  'assets/ui/touch/menu_pressed.png',
  'assets/ui/touch/run.png',
  'assets/ui/touch/run_pressed.png',
  'assets/tiles/archive.png',
  'assets/tiles/cliffs.png',
  'assets/tiles/interior.png',
  'assets/tiles/terrain.png',
  'assets/tiles/tiles.json',
  'assets/tiles/town.png',
  'assets/sprites/bosses_battle.json',
  'assets/sprites/bosses_battle.png',
  'assets/sprites/enemies_battle.json',
  'assets/sprites/enemies_battle.png',
  'assets/sprites/enemies_field.json',
  'assets/sprites/enemies_field.png',
  'assets/sprites/misc.json',
  'assets/sprites/misc.png',
  'assets/sprites/npcs.json',
  'assets/sprites/npcs.png',
  'assets/sprites/party_battle.json',
  'assets/sprites/party_battle.png',
  'assets/sprites/party_field.json',
  'assets/sprites/party_field.png',
  'assets/sprites/portraits.json',
  'assets/sprites/portraits.png',
  'assets/sprites/props.json',
  'assets/sprites/props.png',
  'assets/backdrops/battle_archive.json',
  'assets/backdrops/battle_archive.png',
  'assets/backdrops/battle_boss.json',
  'assets/backdrops/battle_boss.png',
  'assets/backdrops/battle_hollow.json',
  'assets/backdrops/battle_hollow.png',
  'assets/backdrops/battle_valley.json',
  'assets/backdrops/battle_valley.png',
  'assets/backdrops/battle_valley_dusk.json',
  'assets/backdrops/battle_valley_dusk.png',
  'assets/backdrops/dialog_keyart.json',
  'assets/backdrops/dialog_keyart.png',
  'assets/backdrops/title.json',
  'assets/backdrops/title.png',
  'assets/audio/sfx/axe_chop_1.wav',
  'assets/audio/sfx/axe_chop_2.wav',
  'assets/audio/sfx/bell_peal.wav',
  'assets/audio/sfx/bell_toll.wav',
  'assets/audio/sfx/block_push.wav',
  'assets/audio/sfx/boss_die.wav',
  'assets/audio/sfx/bow_shot_1.wav',
  'assets/audio/sfx/bow_shot_2.wav',
  'assets/audio/sfx/brazier_light.wav',
  'assets/audio/sfx/break.wav',
  'assets/audio/sfx/bridge_appear.wav',
  'assets/audio/sfx/buff.wav',
  'assets/audio/sfx/buy.wav',
  'assets/audio/sfx/buzzer.wav',
  'assets/audio/sfx/cancel.wav',
  'assets/audio/sfx/chest_open.wav',
  'assets/audio/sfx/coin.wav',
  'assets/audio/sfx/combo_start.wav',
  'assets/audio/sfx/confirm.wav',
  'assets/audio/sfx/crit.wav',
  'assets/audio/sfx/crystal_hit.wav',
  'assets/audio/sfx/cursor.wav',
  'assets/audio/sfx/debuff.wav',
  'assets/audio/sfx/defend.wav',
  'assets/audio/sfx/door_close.wav',
  'assets/audio/sfx/door_locked.wav',
  'assets/audio/sfx/door_open.wav',
  'assets/audio/sfx/door_rumble.wav',
  'assets/audio/sfx/door_unlock.wav',
  'assets/audio/sfx/drop_common.wav',
  'assets/audio/sfx/drop_legendary.wav',
  'assets/audio/sfx/drop_magic.wav',
  'assets/audio/sfx/drop_rare.wav',
  'assets/audio/sfx/emote_pop.wav',
  'assets/audio/sfx/encounter.wav',
  'assets/audio/sfx/enemy_die.wav',
  'assets/audio/sfx/equip.wav',
  'assets/audio/sfx/fall.wav',
  'assets/audio/sfx/fire.wav',
  'assets/audio/sfx/flee.wav',
  'assets/audio/sfx/footstep_grass_1.wav',
  'assets/audio/sfx/footstep_grass_2.wav',
  'assets/audio/sfx/footstep_grass_3.wav',
  'assets/audio/sfx/footstep_stone_1.wav',
  'assets/audio/sfx/footstep_stone_2.wav',
  'assets/audio/sfx/footstep_stone_3.wav',
  'assets/audio/sfx/footstep_wood_1.wav',
  'assets/audio/sfx/footstep_wood_2.wav',
  'assets/audio/sfx/footstep_wood_3.wav',
  'assets/audio/sfx/fury_art.wav',
  'assets/audio/sfx/fury_ready.wav',
  'assets/audio/sfx/gate_open.wav',
  'assets/audio/sfx/heal.wav',
  'assets/audio/sfx/hit_heavy_1.wav',
  'assets/audio/sfx/hit_heavy_2.wav',
  'assets/audio/sfx/hit_light_1.wav',
  'assets/audio/sfx/hit_light_2.wav',
  'assets/audio/sfx/hit_light_3.wav',
  'assets/audio/sfx/ice.wav',
  'assets/audio/sfx/ink_gurgle.wav',
  'assets/audio/sfx/item_use.wav',
  'assets/audio/sfx/jump.wav',
  'assets/audio/sfx/land.wav',
  'assets/audio/sfx/lantern_reveal.wav',
  'assets/audio/sfx/level_up_sparkle.wav',
  'assets/audio/sfx/menu_close.wav',
  'assets/audio/sfx/menu_open.wav',
  'assets/audio/sfx/miss.wav',
  'assets/audio/sfx/name_devour.wav',
  'assets/audio/sfx/name_restore.wav',
  'assets/audio/sfx/page_flutter.wav',
  'assets/audio/sfx/poison.wav',
  'assets/audio/sfx/pot_break.wav',
  'assets/audio/sfx/revive.wav',
  'assets/audio/sfx/save_chime.wav',
  'assets/audio/sfx/shelf_move.wav',
  'assets/audio/sfx/sign_fade.wav',
  'assets/audio/sfx/spear_thrust_1.wav',
  'assets/audio/sfx/spear_thrust_2.wav',
  'assets/audio/sfx/splash.wav',
  'assets/audio/sfx/staff_hit_1.wav',
  'assets/audio/sfx/staff_hit_2.wav',
  'assets/audio/sfx/stairs.wav',
  'assets/audio/sfx/stun.wav',
  'assets/audio/sfx/summon.wav',
  'assets/audio/sfx/switch_off.wav',
  'assets/audio/sfx/switch_on.wav',
  'assets/audio/sfx/sword_slash_1.wav',
  'assets/audio/sfx/sword_slash_2.wav',
  'assets/audio/sfx/telegraph.wav',
  'assets/audio/sfx/text_blip_high.wav',
  'assets/audio/sfx/text_blip_low.wav',
  'assets/audio/sfx/text_blip_mid.wav',
  'assets/audio/sfx/thunder.wav',
  'assets/audio/jingles/gameover_sting.mp3',
  'assets/audio/jingles/inn_rest.mp3',
  'assets/audio/jingles/item_get.mp3',
  'assets/audio/jingles/key_item.mp3',
  'assets/audio/jingles/level_up.mp3',
  'assets/audio/jingles/party_join.mp3',
  'assets/audio/jingles/quest_done.mp3',
  'assets/audio/jingles/save.mp3',
  'assets/audio/jingles/victory_fanfare.mp3',
];
// build_pwa:end

const SHELL_PREFIX = 'lq-next-shell-';
const SHELL_CACHE = SHELL_PREFIX + SHELL_VERSION;
const RUNTIME_CACHE = 'lq-next-runtime-v1';
const BASE = new URL('./', self.location.href);              // .../next/
const INDEX = new URL('index.html', BASE).href;
const SHELL_URLS = new Set(PRECACHE.map((p) => new URL(p, BASE).href));
const CRITICAL = ['index.html', 'src/main.js', 'src/core/engine.js'];   // install fails if these do not arrive
const BATCH = 16;

// ---------------------------------------------------------------- install / activate
self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL_CACHE);
    const failed = [];
    for (let i = 0; i < PRECACHE.length; i += BATCH) {
      await Promise.all(PRECACHE.slice(i, i + BATCH).map(async (p) => {
        const url = new URL(p, BASE).href;
        try {
          // cache: 'no-cache' revalidates with the server (a 304 costs no body), so a new version never precaches
          // stale bytes from the HTTP cache and the files the page has just downloaded are not downloaded twice.
          const res = await fetch(new Request(url, { cache: 'no-cache' }));
          if (!res.ok) throw new Error('HTTP ' + res.status);
          await cache.put(url, res);
        } catch (e) { failed.push(p); }
      }));
    }
    if (CRITICAL.some((p) => failed.includes(p))) {
      await caches.delete(SHELL_CACHE);
      throw new Error('lq-next sw: critical shell files missing: ' + failed.join(', '));
    }
    if (failed.length) console.warn('[sw] precache skipped (will load from the network):', failed.join(', '));
    // The very first install has nothing to wait for: take over now so the page works offline this session.
    if (!self.registration.active) self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter((n) => n.startsWith(SHELL_PREFIX) && n !== SHELL_CACHE).map((n) => caches.delete(n)));
    await self.clients.claim();
  })());
});

// ---------------------------------------------------------------- helpers
const debugClients = new Set();
const normalClients = new Set();

function isDebugUrl(href) {
  try { return new URL(href).searchParams.get('debug') === '1'; } catch (e) { return false; }
}

/** True when the request comes from a page that was opened with ?debug=1 (those runs are never cached). */
async function isDebugRequest(event) {
  const req = event.request;
  if (req.mode === 'navigate') return isDebugUrl(req.url);
  const id = event.clientId;
  if (!id) return false;
  if (debugClients.has(id)) return true;
  if (normalClients.has(id)) return false;
  let debug = false;
  try { const c = await self.clients.get(id); debug = !!c && isDebugUrl(c.url); } catch (e) { debug = false; }
  (debug ? debugClients : normalClients).add(id);
  if (normalClients.size > 64) normalClients.clear();
  if (debugClients.size > 64) debugClients.clear();
  return debug;
}

/** 'shell' | 'nav' | 'runtime' | 'other' */
function classify(request, url) {
  if (request.mode === 'navigate') return url.href.startsWith(BASE.href) ? 'nav' : 'other';
  const bare = url.origin + url.pathname;
  if (SHELL_URLS.has(bare)) return 'shell';
  const p = url.pathname;
  if (/\/assets\/(audio|art)\//.test(p) && /\.(mp3|ogg|wav|webp|png|jpg)$/i.test(p)) return 'runtime';
  return 'other';
}

function rangeFrom(header, size) {
  const m = /^bytes=(\d*)-(\d*)$/.exec(header || '');
  if (!m || (!m[1] && !m[2])) return null;
  let start = m[1] ? Number(m[1]) : Math.max(0, size - Number(m[2]));
  let end = m[1] && m[2] ? Number(m[2]) : size - 1;
  end = Math.min(end, size - 1);
  if (start >= size || start > end) return { bad: true };
  return { start, end };
}

async function sliceResponse(cached, rangeHeader) {
  const buf = await cached.arrayBuffer();
  const r = rangeFrom(rangeHeader, buf.byteLength);
  const type = cached.headers.get('content-type') || 'application/octet-stream';
  if (!r) return new Response(buf, { status: 200, headers: { 'Content-Type': type, 'Content-Length': String(buf.byteLength), 'Accept-Ranges': 'bytes' } });
  if (r.bad) return new Response(null, { status: 416, headers: { 'Content-Range': 'bytes */' + buf.byteLength } });
  const body = buf.slice(r.start, r.end + 1);
  return new Response(body, {
    status: 206,
    headers: { 'Content-Type': type, 'Content-Range': `bytes ${r.start}-${r.end}/${buf.byteLength}`, 'Content-Length': String(body.byteLength), 'Accept-Ranges': 'bytes' },
  });
}

async function shellMatch(request, url) {
  const cache = await caches.open(SHELL_CACHE);
  return cache.match(url.origin + url.pathname) || null;
}

const filling = new Map();   // url -> Promise: full-file fetches in flight (runtime cache fill)
function fillRuntime(url) {
  if (filling.has(url)) return filling.get(url);
  const p = (async () => {
    try {
      const res = await fetch(url);                         // no Range: the cache holds complete 200 responses
      if (res.ok && res.status === 200) { const cache = await caches.open(RUNTIME_CACHE); await cache.put(url, res); }
    } catch (e) { /* offline or blocked: try again next time */ } finally { filling.delete(url); }
  })();
  filling.set(url, p);
  return p;
}

async function runtime(event) {
  const request = event.request;
  const url = new URL(request.url);
  const key = url.origin + url.pathname;
  const cache = await caches.open(RUNTIME_CACHE);
  const cached = await cache.match(key);
  const range = request.headers.get('range');
  if (cached) {
    // Stale-while-revalidate: answer from the cache now, refresh the copy in the background.
    event.waitUntil(refresh(cache, key, url.href));
    return range ? sliceResponse(cached.clone(), range) : cached;
  }
  if (range) {
    // First play of a track: let the network answer (it speaks Range natively) and cache the whole file behind it.
    event.waitUntil(fillRuntime(key));
    return fetch(request);
  }
  const res = await fetch(request);
  if (res.ok && res.status === 200 && res.type !== 'opaque') event.waitUntil(cache.put(key, res.clone()));
  return res;
}

const refreshed = new Map();   // url -> last refresh time (at most one background refresh per file per 10 minutes)
async function refresh(cache, key, href) {
  const last = refreshed.get(key) || 0;
  if (Date.now() - last < 600000) return;
  refreshed.set(key, Date.now());
  try {
    const res = await fetch(href, { cache: 'no-cache' });  // revalidates (304 when unchanged)
    if (res.ok && res.status === 200) await cache.put(key, res);
  } catch (e) { /* offline: keep the cached copy */ }
}

async function handle(event) {
  const request = event.request;
  const url = new URL(request.url);
  if (await isDebugRequest(event)) return fetch(request);
  const kind = classify(request, url);
  if (kind === 'nav') {
    // Any navigation inside next/ (with or without a query) gets the cached shell page; offline it is all we have.
    const cache = await caches.open(SHELL_CACHE);
    const hit = await cache.match(INDEX);
    if (hit) return hit;
    return fetch(request);
  }
  if (kind === 'shell') {
    const hit = await shellMatch(request, url);
    if (hit) return request.headers.has('range') ? sliceResponse(hit.clone(), request.headers.get('range')) : hit;
    return fetch(request);
  }
  if (kind === 'runtime') {
    try { return await runtime(event); } catch (e) { return new Response('Offline', { status: 503, statusText: 'Offline' }); }
  }
  return fetch(request);
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  event.respondWith(handle(event));
});
