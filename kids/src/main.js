// Boot, screens and the frame loop for Lexicon Quest Kids (test build).
import { loadPropTable, unlockAudio, music, sfx, jingle, setMuted, preloadSfx } from './assets.js';
import { input, setupTouch, pollInput, clearInput, tap } from './input.js';
import { SVG } from './svgicons.js';
import { Game, LEVELS, UPGRADES, ITEMS, WEAPON_INFO } from './game.js';
import { MAPS } from './maps.js';

const SECRETS = Object.fromEntries(Object.entries(MAPS).map(([k, m]) => [k, m.ents.filter((e) => e[0] === 'U').map((e) => e[3])]));
const WEAPON_AT = Object.fromEntries(Object.entries(MAPS).map(([k, m]) => [k, m.ents.filter((e) => e[0] === 'E').map((e) => e[3])]));
const secretsFound = (id) => SECRETS[id].filter((s) => save.upgrades && save.upgrades[s]).length;
import { HATS, UNLOCKS, ADJ, NOUN, PET_NAMES, PETS, defaultHero } from './avatar.js';
import { SKINS, HAIRS, OUTFITS } from './models.js';
import { World3D, Showcase } from './world3d.js';
import { PET_SHOP, UPGRADE_SHOP, LOCATIONS, lvl } from './shop.js';
import { THEMES, CATALOG, COLORS, RUNWAY_HATS, defaultLook, lookCfg, judge, npcModel, RunwayStage } from './runway.js';

const $ = (id) => document.getElementById(id);
const SAVE_KEY = 'lqk_save_v1';

// ------------------------------------------------------------ save
function loadSave() {
  try { const s = JSON.parse(localStorage.getItem(SAVE_KEY)); if (s && s.hero) return s; } catch (e) { /* ignore */ }
  return { hero: null, coins: 0, stars: {}, assist: false, muted: false, readAloud: false, seenStory: false };
}
let save = loadSave();
if (!save.weapons) save.weapons = { Sword: true };
if (!save.levels) save.levels = {};
if (!save.starsSpent) save.starsSpent = 0;
if (!save.pets) { save.pets = { Slime: true }; if (save.hero && save.hero.pet) save.pets[save.hero.pet] = true; }
function persist() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { /* private mode: play on */ } }
const totalStars = () => Object.values(save.stars).reduce((n, a) => n + a.filter(Boolean).length, 0);
const starsAvail = () => Math.max(0, totalStars() - save.starsSpent);
const cleared = (id) => !!(save.stars[id] && save.stars[id][0]);
const locOf = (id) => LOCATIONS.find((l) => l.floors.includes(id)) || null;
/** A location opens once the top floor of the one before it is beaten. */
const locOpen = (li) => li === 0 || !!save.unlockAll || (!LOCATIONS[li - 1].soon && cleared(LOCATIONS[li - 1].floors[LOCATIONS[li - 1].floors.length - 1]));
const floorOpen = (loc, i) => (i === 0 ? locOpen(LOCATIONS.indexOf(loc)) : (!!save.unlockAll || cleared(loc.floors[i - 1])));
const floorName = (loc, i) => (i === loc.floors.length + (loc.soon ? loc.soon.length : 0) - 1 ? 'Top Floor' : `Floor ${i + 1}`);

// ------------------------------------------------------------ screens
function show(id) {
  document.querySelectorAll('.screen').forEach((s) => s.classList.toggle('on', s.id === id));
  document.body.classList.toggle('playing', id === 'game');
}

const MIRA = { skinHex: '#f2c49b', hairHex: '#6a3aa8', outfitHex: '#7a45d0', pantsHex: '#4a2f80', hat: 'Hood', item: 'Staff' };
const portraits = {};
function portraitURL(who) {
  if (!portraits[who]) portraits[who] = showcase.portrait(who === 'mira' ? MIRA : save.hero, 160);
  return portraits[who];
}

// ------------------------------------------------------------ title + story
const STORY = [
  { who: 'mira', text: 'Names are vanishing! Help me win them back. First, make your hero.' },
];
function startStory(after) {
  let i = 0;
  const step = () => {
    if (i >= STORY.length) { save.seenStory = true; persist(); after(); return; }
    $('storyPortrait').style.backgroundImage = `url(${portraitURL(STORY[i].who)})`;
    $('storyText').textContent = STORY[i].text;
    $('storyNext').textContent = i === STORY.length - 1 ? "Let's go!" : 'Next';
    i++;
  };
  $('storyNext').onclick = () => { sfx('confirm', 0.6); step(); };
  step();
  show('story');
}

// ------------------------------------------------------------ creator / wardrobe
let draft = null;
function cycle(list, cur, d) { const i = list.indexOf(cur); return list[(i + d + list.length) % list.length]; }

function buildCreator(first) {
  draft = { ...(save.hero || defaultHero()) };
  const stars = totalStars();
  const rows = [
    ['Hair', 'hair', Object.keys(HAIRS)],
    ['Skin', 'skin', Object.keys(SKINS)],
    ['Outfit', 'outfit', Object.keys(OUTFITS)],
    ['Hat', 'hat', Object.keys(HATS)],
    ['Accessory', 'acc', ['None', ...Object.keys(save.accs || {})]],
    ['Pet', 'pet', Object.keys(PETS).filter((k) => save.pets[k])],
    ['Pet color', 'petColor', null],
    ['Pet name', 'petName', PET_NAMES],
  ];
  const box = $('opts'); box.innerHTML = '';
  for (const [label, key, list] of rows) {
    const row = document.createElement('div'); row.className = 'opt';
    row.innerHTML = `<label>${label}</label><button class="arrow">‹</button><div class="val"></div><button class="arrow">›</button>`;
    const val = row.querySelector('.val');
    const values = () => (key === 'petColor' ? Object.keys(PETS[draft.pet].hues) : list);
    const render = () => {
      const v = draft[key];
      const lockedNow = key === 'hat' && hatLocked(v, stars);
      const why = UNLOCKS[v] === 'secret' ? 'secret' : UNLOCKS[v] === 'runway' ? 'win on Runway' : UNLOCKS[v] === 'arena' ? 'beat the Arena' : `${UNLOCKS[v]} stars`;
      val.innerHTML = lockedNow ? `${v} <span class="lock">(${why})</span>` : key === 'pet' ? `${v} <span class="lock">· ${PET_SHOP[v].power}</span>` : v;
    };
    const step = (d) => {
      let v = cycle(values(), draft[key], d);
      draft[key] = v;
      if (key === 'pet' && !(draft.petColor in PETS[v].hues)) draft.petColor = Object.keys(PETS[v].hues)[0];
      sfx('cursor', 0.5);
      refreshPreview(); renderAll();
    };
    const [l, r] = row.querySelectorAll('.arrow');
    l.onclick = () => step(-1); r.onclick = () => step(1);
    row._render = render;
    box.appendChild(row);
  }
  const renderAll = () => { box.querySelectorAll('.opt').forEach((r) => r._render()); $('heroName').textContent = draft.name; checkLock(); };
  const checkLock = () => {
    const locked = hatLocked(draft.hat, stars);
    $('createDone').disabled = locked;
    $('createDone').textContent = locked ? 'Hat is locked' : (first ? "Let's go!" : 'Save');
  };
  $('shuffleName').onclick = () => {
    draft.name = ADJ[Math.floor(Math.random() * ADJ.length)] + ' ' + NOUN[Math.floor(Math.random() * NOUN.length)];
    sfx('cursor', 0.5); renderAll();
  };
  $('createDone').onclick = () => {
    save.hero = { ...draft }; persist(); sfx('confirm', 0.7); delete portraits.hero;
    openMap();
  };
  refreshPreview(); renderAll();
  show('creator');
}

function refreshPreview() { showcase.setHero(draft); }

function drawPreview(dt) {
  if (!$('creator').classList.contains('on')) return;
  const c = $('previewCanvas'), r = c.getBoundingClientRect();
  if (r.width && (c._w !== r.width || c._h !== r.height)) { c._w = r.width; c._h = r.height; showcase.renderer.setSize(r.width, r.height, false); showcase.camera.aspect = r.width / r.height; showcase.camera.updateProjectionMatrix(); }
  showcase.frame(dt);
}

// ------------------------------------------------------------ world map
const KINDS = {
  valley: 'Adventure · beat the Briar Alpha',
  obby: 'Obby · crumbling floors and falling pages',
  archive: 'Puzzles · crates, levers and lanterns',
  race: 'Race · beat Pip across the river',
  boss: 'Boss · the Archivore',
  hollow: 'Adventure · find the Boomerang',
  silverglass: 'Puzzles · turn mirrors, light crystals',
  glassway: 'Obby · jump the red light beams',
  reflection: 'Race · beat your own reflection',
  king: 'Boss · the Nameless King',
  bellows: 'Adventure · find the Grapple Hook',
  ashfall: 'Obby · falling ash and lava',
  liftworks: 'Puzzles · valves, fans and lava',
  minecart: 'Race · beat Bram to the summit',
  warden: 'Boss · the Cinder Warden',
};
function mapTopbar() {
  $('mapName').textContent = save.hero.name;
  $('mapStars').textContent = starsAvail();
  $('mapCoins').textContent = save.coins;
}
function openMap(li) {
  music('town');
  mapTopbar();
  if (li !== undefined) save.loc = li;
  const locI = Math.min(save.loc || 0, LOCATIONS.length - 1), LOC = LOCATIONS[locI];
  $('mapAvatar').src = portraitURL('hero');
  $('locName').textContent = LOC.name;
  $('locPrev').disabled = locI === 0; $('locNext').disabled = locI === LOCATIONS.length - 1;
  $('locPrev').onclick = () => { sfx('cursor', 0.5); openMap(locI - 1); };
  $('locNext').onclick = () => { sfx('cursor', 0.5); openMap(locI + 1); };
  const box = $('nodes'); box.innerHTML = '';
  const prevLoc = LOCATIONS[locI - 1];
  const lockedMsg = (i) => (i > 0 ? `Clear ${floorName(LOC, i - 1)} to open` : prevLoc.soon ? `Finish ${prevLoc.name} to open` : `Beat ${LEVELS[prevLoc.floors[prevLoc.floors.length - 1]].title} to open`);
  LOC.floors.forEach((id, i) => {
    const b = document.createElement('button');
    const L = LEVELS[id], open = floorOpen(LOC, i);
    b.className = 'node ' + (open ? 'open' : 'locked') + (id === 'boss' ? ' bossNode' : '');
    const st = (save.stars[id] || [false, false, false]);
    b.innerHTML = `<span class="num">${floorName(LOC, i)}</span><span class="nm">${L.title}</span><span class="kind">${open ? KINDS[id] : lockedMsg(i)}</span>` +
      (open ? (WEAPON_AT[id] || []).map((w) => `<span class="wfind${save.weapons[w] ? ' got' : ''}"><img src="${ICONS[w.toLowerCase()]}" alt="">${save.weapons[w] ? w + ' found' : 'Find the ' + w + '!'}</span>`).join('') : '<span class="lockBig">🔒</span>') +
      `<span class="secrets">${open && SECRETS[id].length ? `Secrets ${secretsFound(id)}/${SECRETS[id].length}` : ''}</span><span class="stars">${[0, 1, 2].map((k) => `<img src="${st[k] ? STAR : STAR_E}">`).join('')}</span>`;
    b.onclick = open ? () => { sfx('confirm', 0.7); startLevel(id); } : () => sfx('cancel', 0.5);
    box.appendChild(b);
  });
  (LOC.soon || []).forEach((label, k) => {
    const b = document.createElement('button');
    b.className = 'node soon';
    b.innerHTML = `<span class="num">${floorName(LOC, LOC.floors.length + k)}</span><span class="nm">Coming soon</span><span class="kind">Still being built</span><span class="lockBig">&#128679;</span>`;
    b.onclick = () => sfx('cancel', 0.5);
    box.appendChild(b);
  });
  show('map');
}

// ------------------------------------------------------------ shop
let shopTab = 'pets';
function openShop(tab) {
  if (tab) shopTab = tab;
  mapTopbar();
  $('shopStars').textContent = starsAvail(); $('shopCoins').textContent = save.coins;
  document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('on', t.dataset.tab === shopTab));
  const box = $('shopItems'); box.innerHTML = '';
  if (shopTab === 'pets') {
    for (const [pet, info] of Object.entries(PET_SHOP)) {
      const owned = !!save.pets[pet], using = save.hero.pet === pet, afford = starsAvail() >= info.cost;
      const card = document.createElement('div'); card.className = 'shopCard' + (owned ? ' owned' : '');
      card.innerHTML = `<img class="petPic" src="${petPic(pet)}" alt=""><b>${info.title}</b><span class="desc">${info.desc}</span>`;
      const btn = document.createElement('button'); btn.className = 'btn small ' + (owned ? (using ? 'ghost' : 'blue') : '');
      btn.innerHTML = owned ? (using ? 'With you' : 'Take along') : `<img src="${STAR}" alt=""> ${info.cost}`;
      btn.disabled = (!owned && !afford) || using;
      btn.onclick = () => {
        if (!owned) { save.starsSpent += info.cost; save.pets[pet] = true; jingle('key_item'); }
        else sfx('confirm', 0.6);
        save.hero.pet = pet; if (!(save.hero.petColor in PETS[pet].hues)) save.hero.petColor = Object.keys(PETS[pet].hues)[0];
        delete portraits.hero; persist(); openShop();
      };
      card.appendChild(btn); box.appendChild(card);
    }
  } else {
    for (const u of UPGRADE_SHOP) {
      const lv = lvl(save, u.id), max = u.costs.length, cost = u.costs[lv];
      const needsW = u.needs && !save.weapons[u.needs];
      const card = document.createElement('div'); card.className = 'shopCard';
      card.innerHTML = `<img class="upIc" src="${ICONS[u.icon]}" alt=""><b>${u.name}</b><span class="desc">${needsW ? `Find the ${u.needs} first.` : u.desc}</span><span class="pips">${u.costs.map((_, i) => `<i class="${i < lv ? 'on' : ''}"></i>`).join('')}</span>`;
      const btn = document.createElement('button'); btn.className = 'btn small';
      btn.innerHTML = lv >= max ? 'MAX' : `<img src="${ICONS.coin}" alt=""> ${cost}`;
      btn.disabled = lv >= max || needsW || save.coins < cost;
      btn.onclick = () => { save.coins -= cost; save.levels[u.id] = lv + 1; persist(); jingle('key_item'); openShop(); };
      card.appendChild(btn); box.appendChild(card);
    }
  }
  show('shop');
}
const petPics = {};
function petPic(pet) {
  const key = pet + (save.hero.pet === pet ? save.hero.petColor : '');
  if (!petPics[key]) petPics[key] = showcase.petPortrait({ pet, petColor: save.hero.pet === pet ? save.hero.petColor : Object.keys(PETS[pet].hues)[0] }, 160);
  return petPics[key];
}

// ------------------------------------------------------------ playing
let game = null, paused = false, hintTimer = 0, secretTimer = 0;
function hatLocked(v, stars) {
  if (UNLOCKS[v] === 'secret') return !(save.upgrades && save.upgrades[v.toLowerCase()]);
  if (UNLOCKS[v] === 'runway') return !(save.runwayHats && save.runwayHats[v]);
  if (UNLOCKS[v] === 'arena') return !save.arenaWin;
  return (UNLOCKS[v] || 0) > stars;
}
const hooks = {
  hint(text, who = 'mira') {
    $('hintPortrait').style.backgroundImage = `url(${portraitURL(who)})`;
    $('hintText').textContent = text;
    $('hint').classList.remove('off');
    hintTimer = Math.max(3, text.length * 0.07);
    sfx('emote_pop', 0.5);
    if (save.readAloud && 'speechSynthesis' in window) {
      try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); u.rate = 0.95; u.pitch = 1.15; speechSynthesis.speak(u); } catch (e) { /* ok */ }
    }
  },
  bossBar(v, on, name) {
    $('bossBar').classList.toggle('hidden', !on);
    if (name) $('bossName').textContent = name;
    $('bossFill').style.width = (v * 100) + '%';
  },
  hud() { updateButtons(); },
  result(r) { floorDone(r); },
  arenaOver(r) { arenaOver(r); },
  climb() { climbStairs(); },
  weapon(w) {
    persist();
    $('hint').classList.add('off'); hintTimer = 0;
    $('secretTag').textContent = 'NEW WEAPON!';
    $('secretName').textContent = 'The ' + w; $('secretDesc').textContent = WEAPON_INFO[w].desc + ' Tap it in the bar below to switch.';
    const b = $('secretBanner'); b.classList.remove('hidden'); b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop');
    jingle('key_item');
    clearTimeout(secretTimer); secretTimer = setTimeout(() => b.classList.add('hidden'), 4200);
    freshWeapon = w; buildWeaponBar();
  },
  secret(id) {
    persist();
    const u = UPGRADES[id];
    $('secretTag').textContent = 'SECRET FOUND!';
    $('secretName').textContent = u.name; $('secretDesc').textContent = u.desc;
    const b = $('secretBanner'); b.classList.remove('hidden'); b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop');
    jingle('key_item');
    clearTimeout(secretTimer); secretTimer = setTimeout(() => b.classList.add('hidden'), 3800);
  },
};

function startLevel(id) {
  clearInput();
  if (locOf(id)) save.loc = LOCATIONS.indexOf(locOf(id));
  $('floorToast').classList.remove('on');
  $('fade').classList.remove('on');
  game = new Game(id, save, hooks);
  paused = false;
  $('bossBar').classList.add('hidden');
  $('hint').classList.add('off');
  show('game');
  world.resize();
  world.load(game, save.hero);
  hudKey = '';
  buildWeaponBar();
  const LOC = locOf(id), i = LOC ? LOC.floors.indexOf(id) : 0;
  $('floorTag').textContent = LOC ? `${LOC.name} · ${floorName(LOC, i)}` : 'Minigame'; $('floorTitle').textContent = game.L.title;
  const fb = $('floorBanner'); fb.classList.remove('on'); void fb.offsetWidth; fb.classList.add('on');
}

/** Save stars and coins from a cleared floor. Returns what changed. */
function commitResult(r) {
  const prev = save.stars[r.level.id] || [false, false, false];
  const before = totalStars();
  save.stars[r.level.id] = prev.map((v, i) => v || r.stars[i]);
  save.coins += r.coins;
  persist();
  const after = totalStars();
  return { newStars: after - before, newHats: Object.entries(UNLOCKS).filter(([, n]) => n > before && n <= after).map(([h]) => h) };
}

/** A floor is done: on the way up, a quick toast and a staircase; at the top, the full results card. */
function floorDone(r) {
  const LOC = locOf(r.level.id), i = LOC.floors.indexOf(r.level.id), next = LOC.floors[i + 1];
  if (!next) { showResults(r); return; }
  const c = commitResult(r);
  jingle('victory_fanfare');
  hooks.bossBar(0, false);
  $('toastTitle').textContent = `${floorName(LOC, i)} clear!`;
  $('toastStars').innerHTML = r.stars.map((v) => `<img src="${v ? STAR : STAR_E}" alt="">`).join('');
  $('toastLine').innerHTML = [r.coins ? `+${r.coins} coins` : '', c.newStars ? `+${c.newStars} ★ for the Pet Shop` : ''].filter(Boolean).join(' · ') + (c.newHats.length ? `<br>New hat: <b>${c.newHats.join(', ')}</b>` : '');
  $('toastNext').textContent = `Take the stairs up to ${floorName(LOC, i + 1)}!`;
  const t = $('floorToast'); t.classList.add('on');
  setTimeout(() => t.classList.remove('on'), 3200);
  if (game) game.openStairs(`UP TO ${floorName(LOC, i + 1).toUpperCase()}`);
}

function climbStairs() {
  const LOC = locOf(game.L.id), i = LOC.floors.indexOf(game.L.id), next = LOC.floors[i + 1];
  $('fade').classList.add('on');
  setTimeout(() => { if (game) startLevel(next); }, 450);
}

let freshWeapon = null;
function buildWeaponBar() {
  const bar = $('weaponBar'); bar.innerHTML = '';
  ITEMS.forEach((w, i) => {
    const owned = !!(save.weapons && save.weapons[w]);
    const el = document.createElement('button');
    el.className = 'wslot' + (owned ? '' : ' locked') + (w === freshWeapon ? ' fresh' : '');
    el.innerHTML = `<kbd>${i + 1}</kbd><img src="${ICONS[w.toLowerCase()]}" alt=""><b>${owned ? w.toUpperCase() : '???'}</b>`;
    el.setAttribute('aria-label', owned ? w : 'Weapon not found yet');
    el.addEventListener('pointerdown', (e) => {
      e.preventDefault(); e.stopPropagation();
      if (!owned) { sfx('cancel', 0.4); if (game) hooks.hint('Not found yet! Keep exploring to find this weapon.', 'mira'); return; }
      tap('w' + (i + 1));
    });
    bar.appendChild(el);
  });
  freshWeapon = null;
  updateButtons();
}

function updateButtons() {
  if (!game) return;
  const it = game.itemName;
  const ic = it.toLowerCase();
  $('attackIc').src = ICONS[ic];
  document.querySelectorAll('.wslot').forEach((el, i) => el.classList.toggle('on', i === game.item));
  const p = game.player.special;
  $('bSpecial').style.setProperty('--p', p + '%');
  $('bSpecial').classList.toggle('ready', p >= 100);
}

function showResults(r) {
  const c = commitResult(r);
  jingle('victory_fanfare');
  const LOC = locOf(r.level.id), li = LOCATIONS.indexOf(LOC);
  const top = !LOC.soon && LOC.floors[LOC.floors.length - 1] === r.level.id;
  $('resTitle').textContent = top ? `${LOC.name} complete!` : r.level.title + ' clear!';
  const box = $('resStars'); box.innerHTML = '';
  r.level.stars.forEach((label, i) => {
    const d = document.createElement('div'); d.className = 'starItem';
    d.innerHTML = `<img src="${r.stars[i] ? STAR : STAR_E}"> ${label}`;
    box.appendChild(d);
    setTimeout(() => { d.classList.add('show'); if (r.stars[i]) sfx('level_up_sparkle', 0.5, 1 + i * 0.12); }, 500 + i * 450);
  });
  $('resPrize').innerHTML = `You brought back a name: <b>${r.level.prize}</b>. ${r.level.prizeText}`;
  const t = Math.floor(r.time);
  $('resCoins').textContent = `Coins: ${r.coins}` + (r.level.timeStar ? `  ·  Time: ${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}` : '') + (SECRETS[r.level.id].length ? `  ·  Secrets: ${secretsFound(r.level.id)}/${SECRETS[r.level.id].length}` : '');
  const newHats = c.newHats;
  $('resUnlock').innerHTML = (newHats.length ? `New hat unlocked: <b>${newHats.join(', ')}</b>! Try it in the Wardrobe. ` : '') + `You have <b>${starsAvail()} ★</b> and <b>${save.coins} coins</b> to spend in the Shop.` +
    (top && LOCATIONS[li + 1] ? (LOCATIONS[li + 1].floors.length ? `<br><b>${LOCATIONS[li + 1].name}</b> is open! Find it on the map.` : `<br>Next stop: <b>${LOCATIONS[li + 1].name}</b>, coming soon!`) : '') +
    (LOC.soon && LOC.floors[LOC.floors.length - 1] === r.level.id ? '<br>More floors of this location are coming soon!' : '');
  $('results').classList.add('on');
  $('toMapBtn').textContent = 'World map';
  $('againBtn').onclick = () => { $('results').classList.remove('on'); startLevel(r.level.id); };
  $('toMapBtn').onclick = () => { $('results').classList.remove('on'); game = null; world.scene = null; openMap(top && LOCATIONS[li + 1] && LOCATIONS[li + 1].floors.length ? li + 1 : li); };
}

// ------------------------------------------------------------ minigames
function openGames() {
  music('town');
  $('gamesStars').textContent = starsAvail(); $('gamesCoins').textContent = save.coins;
  $('arenaBest').textContent = save.arenaWin ? 'Champion! You beat all 10 waves' : save.arenaBest ? `Best: wave ${save.arenaBest}` : 'Not played yet';
  $('runwayBest').textContent = save.runwayWins ? `Runway wins: ${save.runwayWins}` : save.runwayBest ? `Best score: ${save.runwayBest.toFixed(1)} stars` : 'Not played yet';
  show('games');
}
$('gamesBtn').onclick = () => { sfx('confirm', 0.6); openGames(); };
$('gamesBack').onclick = () => { sfx('cancel', 0.5); openMap(); };
$('gArena').onclick = () => { sfx('confirm', 0.7); startLevel('arena'); };
$('gRunway').onclick = () => { sfx('confirm', 0.7); openRunway(); };

function arenaOver(r) {
  save.coins += r.coins;
  const firstWin = r.won && !save.arenaWin;
  save.arenaBest = Math.max(save.arenaBest || 0, r.wave);
  if (r.won) save.arenaWin = true;
  persist();
  jingle(r.won ? 'victory_fanfare' : 'key_item');
  $('resTitle').textContent = r.won ? 'Arena Champion!' : `You reached wave ${r.wave}!`;
  $('resStars').innerHTML = '';
  $('resPrize').innerHTML = r.won ? 'You survived all 10 waves!' : `Your best is wave ${save.arenaBest}. Try again to beat it!`;
  $('resCoins').textContent = `Coins: ${r.coins}`;
  $('resUnlock').innerHTML = firstWin ? 'New hat unlocked: <b>Laurel</b>! Try it in the Wardrobe.' : '';
  $('results').classList.add('on');
  $('toMapBtn').textContent = 'Minigames';
  $('againBtn').onclick = () => { $('results').classList.remove('on'); startLevel('arena'); };
  $('toMapBtn').onclick = () => { $('results').classList.remove('on'); game = null; world.scene = null; openGames(); };
}

// ------------------------------------------------------------ Runway
let rw = null, stage = null;
const RW_ROWS = [['Top', 'top'], ['Pattern', 'pattern'], ['Bottoms', 'bottoms'], ['Shoes', 'shoes'], ['Hat', 'hat'], ['Accessory', 'acc'], ['Face paint', 'face'], ['Pose', 'pose']];
const rwValues = (key) => (['top', 'bottoms', 'shoes'].includes(key) ? Object.keys(COLORS) : Object.keys(CATALOG[key]));
function openRunway() {
  if (!stage) stage = new RunwayStage($('runwayCanvas'));
  const theme = THEMES[Math.floor(Math.random() * THEMES.length)];
  rw = { theme, look: defaultLook(save.hero), t: 90, phase: 'intro', introT: 2.4 };
  $('rwTheme').textContent = theme.name; $('rwIntroTheme').textContent = theme.name;
  $('rwIntro').classList.remove('hidden'); $('rwShow').classList.add('hidden'); $('rwPanel').classList.remove('hidden'); $('rwTop').classList.remove('hidden');
  const box = $('rwPanel'); box.innerHTML = '';
  for (const [label, key] of RW_ROWS) {
    const row = document.createElement('div'); row.className = 'opt';
    row.innerHTML = `<label>${label}</label><button class="arrow">&lsaquo;</button><div class="val"></div><button class="arrow">&rsaquo;</button>`;
    const val = row.querySelector('.val');
    row._render = () => { const v = rw.look[key]; val.innerHTML = ['top', 'bottoms', 'shoes'].includes(key) ? `<i class="sw" style="background:${COLORS[v]}"></i>${v}` : v; };
    const step = (d) => {
      const list = rwValues(key), i = list.indexOf(rw.look[key]);
      rw.look[key] = list[(i + d + list.length) % list.length];
      sfx('cursor', 0.5); row._render();
      if (key !== 'pose') stage.dress(lookCfg(save.hero, rw.look));
    };
    const [l, r] = row.querySelectorAll('.arrow'); l.onclick = () => step(-1); r.onclick = () => step(1);
    row._render(); box.appendChild(row);
  }
  stage.dress(lookCfg(save.hero, rw.look));
  show('runway'); music('town');
}
$('rwDone').onclick = () => { if (rw && rw.phase === 'dress') { sfx('confirm', 0.7); startShow(); } };
$('rwSkip').onclick = () => { if (rw && rw.phase === 'show') runwayResults(); };
$('rwQuit').onclick = () => { sfx('cancel', 0.5); rw = null; openGames(); };

function startShow() {
  rw.phase = 'show';
  const you = { hero: save.hero, look: { ...rw.look }, you: true, name: save.hero.name };
  const npcs = [0, 1, 2].map(() => { const n = npcModel(rw.theme); return { hero: n.hero, look: n.look, name: n.hero.name }; });
  const order = [npcs[0], npcs[1], you, npcs[2]];
  for (const m of order) { m.cards = judge(m.look, rw.theme); m.score = m.cards.reduce((a, b) => a + b, 0) / 3; }
  rw.order = order; rw.i = -1; rw.showT = 0;
  $('rwPanel').classList.add('hidden'); $('rwTop').classList.add('hidden'); $('rwIntro').classList.add('hidden'); $('rwShow').classList.remove('hidden');
  nextModel();
}
function nextModel() {
  rw.i++;
  if (rw.i >= rw.order.length) { runwayResults(); return; }
  const m = rw.order[rw.i];
  rw.showT = 0;
  stage.walk(lookCfg(m.hero, m.look), m.look.pose);
  $('rwWho').textContent = m.you ? `${m.name} (you!)` : m.name;
  $('rwJudges').innerHTML = '';
}
function runwayFrame(dt) {
  if (!rw || !$('runway').classList.contains('on')) return;
  const c = $('runwayCanvas'), r = c.getBoundingClientRect();
  if (r.width && (c._w !== r.width || c._h !== r.height)) { c._w = r.width; c._h = r.height; stage.size(r.width, r.height); }
  if (rw.phase === 'intro') { rw.introT -= dt; if (rw.introT <= 0) { rw.phase = 'dress'; $('rwIntro').classList.add('hidden'); } }
  else if (rw.phase === 'dress') {
    rw.t -= dt; $('rwTimer').textContent = Math.max(0, Math.ceil(rw.t));
    $('rwTimer').classList.toggle('late', rw.t < 10);
    if (rw.t <= 0) startShow();
  } else if (rw.phase === 'show') {
    rw.showT += dt;
    if (rw.showT > 2.7 && !$('rwJudges').children.length) {
      const m = rw.order[rw.i];
      $('rwJudges').innerHTML = m.cards.map((n, k) => `<div class="jcard" style="animation-delay:${k * 0.15}s"><span>Judge ${k + 1}</span><b>${n}</b><i>${'&#9733;'.repeat(n)}</i></div>`).join('');
      sfx('level_up_sparkle', 0.5, 0.9 + m.score * 0.08);
    }
    if (rw.showT > 4.6) nextModel();
  }
  if (!window.__noRender) stage.frame(dt);
}
function runwayResults() {
  if (rw.phase === 'done') return;
  rw.phase = 'done';
  const ranked = [...rw.order].sort((a, b) => b.score - a.score);
  const place = ranked.findIndex((m) => m.you) + 1, me = ranked[place - 1];
  const coins = 5 + Math.round(me.score * 4) + ([0, 15, 8, 4][place] || 0);
  save.coins += coins;
  save.runwayBest = Math.max(save.runwayBest || 0, me.score);
  if (place === 1) save.runwayWins = (save.runwayWins || 0) + 1;
  const unlocked = [];
  if (place <= 3) {
    save.runwayHats = save.runwayHats || {}; save.accs = save.accs || {};
    if (RUNWAY_HATS.includes(me.look.hat) && !save.runwayHats[me.look.hat]) { save.runwayHats[me.look.hat] = true; unlocked.push(me.look.hat + ' hat'); }
    if (me.look.acc !== 'None' && !save.accs[me.look.acc]) { save.accs[me.look.acc] = true; unlocked.push(me.look.acc); }
  }
  persist();
  jingle(place === 1 ? 'victory_fanfare' : 'key_item');
  $('resTitle').textContent = `Runway: ${rw.theme.name}`;
  const box = $('resStars'); box.innerHTML = '';
  ranked.slice(0, 3).forEach((m, i) => {
    const d = document.createElement('div'); d.className = 'starItem podium' + (m.you ? ' you' : '');
    d.innerHTML = `<b class="place">${['1st', '2nd', '3rd'][i]}</b><img class="pic" src="${showcase.portrait(lookCfg(m.hero, m.look), 96, true)}" alt=""><span class="who">${m.name}${m.you ? ' (you!)' : ''}</span><span class="sc"><img src="${STAR}" alt=""> ${m.score.toFixed(1)}</span>`;
    box.appendChild(d);
    setTimeout(() => d.classList.add('show'), 300 + i * 350);
  });
  $('resPrize').innerHTML = place <= 3 ? (place === 1 ? 'You won the Runway! The judges loved your look.' : `You placed ${['', '1st', '2nd', '3rd'][place]}! Great look.`) : 'Nice walk! Next time, match the theme&#8217;s colors and items.';
  $('resCoins').textContent = `Coins: +${coins}`;
  $('resUnlock').innerHTML = unlocked.length ? `Now in your Wardrobe: <b>${unlocked.join(', ')}</b>!` : '';
  $('results').classList.add('on');
  $('toMapBtn').textContent = 'Minigames';
  $('againBtn').onclick = () => { $('results').classList.remove('on'); openRunway(); };
  $('toMapBtn').onclick = () => { $('results').classList.remove('on'); rw = null; openGames(); };
}


// ------------------------------------------------------------ pause / settings
function setToggle(id, on) { const b = $(id); b.textContent = on ? 'On' : 'Off'; b.classList.toggle('yes', on); }
function openPause(fromMap) {
  paused = true; clearInput();
  setToggle('tAssist', save.assist); setToggle('tSound', !save.muted); setToggle('tRead', save.readAloud); setToggle('tAll', !!save.unlockAll);
  $('testerRow').classList.toggle('hidden', !fromMap);
  $('quitBtn').classList.toggle('hidden', !!fromMap);
  $('resumeBtn').textContent = fromMap ? 'Done' : 'Keep playing';
  $('assistNote').classList.toggle('hidden', !!fromMap);
  $('pause').querySelector('h2').textContent = fromMap ? 'Settings' : 'Paused';
  $('pause').classList.add('on');
}
$('tAssist').onclick = () => { save.assist = !save.assist; persist(); setToggle('tAssist', save.assist); };
$('tSound').onclick = () => { save.muted = !save.muted; setMuted(save.muted); persist(); setToggle('tSound', !save.muted); };
$('tAll').onclick = () => { save.unlockAll = !save.unlockAll; persist(); setToggle('tAll', save.unlockAll); openMap(); };
$('tRead').onclick = () => { save.readAloud = !save.readAloud; persist(); setToggle('tRead', save.readAloud); };
$('resumeBtn').onclick = () => { $('pause').classList.remove('on'); paused = false; };
$('quitBtn').onclick = () => { $('pause').classList.remove('on'); paused = false; game = null; world.scene = null; hooks.bossBar(0, false); openMap(); };
$('bPause').onclick = () => { if (game) openPause(false); };
$('settingsBtn').onclick = () => openPause(true);
$('wardrobeBtn').onclick = () => { sfx('confirm', 0.6); buildCreator(false); };
$('shopBtn').onclick = () => { sfx('confirm', 0.6); openShop(); };
$('shopBack').onclick = () => { sfx('cancel', 0.5); openMap(); };
document.querySelectorAll('.tab').forEach((t) => { t.onclick = () => { sfx('cursor', 0.5); openShop(t.dataset.tab); }; });
$('friendsBtn').onclick = () => $('friends').classList.add('on');
$('friendsOk').onclick = () => $('friends').classList.remove('on');
$('hint').onclick = () => { $('hint').classList.add('off'); };

// ------------------------------------------------------------ layout + HUD
let world, showcase, hudKey = '';
window.addEventListener('resize', () => { if (world) world.resize(); });

function updateHud() {
  const p = game.player, L = game.L;
  const t = Math.floor(game.clock);
  const key = [p.hp, p.maxHp, game.coins, game.lettersGot.join(), game.gotScroll, L.timeStar ? t : '', game.wave].join('|');
  if (key === hudKey) return;
  hudKey = key;
  let hearts = '';
  for (let i = 0; i < p.maxHp / 2; i++) { const v = p.hp - i * 2; hearts += `<img src="${ICONS[v >= 2 ? 'heart' : v === 1 ? 'heart_half' : 'heart_empty']}">`; }
  $('hudHearts').innerHTML = hearts;
  $('hudCoins').textContent = game.coins;
  $('hudWord').innerHTML = L.word.split('').map((ch, i) => `<span class="${game.lettersGot[i] ? 'got' : ''}">${game.lettersGot[i] ? ch : '?'}</span>`).join('');
  $('hudScroll').classList.toggle('hidden', !game.gotScroll);
  $('hudTime').classList.toggle('hidden', !L.timeStar && !L.waves);
  if (L.waves) { $('hudTime').textContent = `WAVE ${game.wave || 0}/${L.waves}`; $('hudTime').classList.remove('late'); }
  if (L.timeStar) { $('hudTime').textContent = `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`; $('hudTime').classList.toggle('late', game.clock > L.timeStar); }
}

// ------------------------------------------------------------ loop
let last = 0, acc = 0;
const STEP = 1 / 60;
function frame(t) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.1, (t - last) / 1000 || 0); last = t;
  drawPreview(dt);
  runwayFrame(dt);
  if (hintTimer > 0) { hintTimer -= dt; if (hintTimer <= 0) $('hint').classList.add('off'); }
  if (!game) return;
  if (!paused && !document.hidden && !window.__lqkHold) {
    acc += dt;
    while (acc >= STEP) {
      pollInput();
      if (input.pressed.pause) { openPause(false); break; }
      game.update(STEP);
      acc -= STEP;
    }
    if (game) { updateButtons(); updateHud(); }
  } else acc = 0;
  if (game && world.scene) { world.sync(paused ? 0 : dt); if (!window.__noRender) world.render(); }
}

// ------------------------------------------------------------ boot
let STAR, STAR_E;
const ICONS = {};
async function boot() {
  try {
    if (!window.THREE) throw new Error('3D library missing');
    await loadPropTable();
    $('bootBar').firstElementChild.style.width = '100%';
    world = new World3D($('view'));
    showcase = new Showcase($('previewCanvas'));
  } catch (e) {
    document.querySelector('#boot .tiny').textContent = 'Could not load the game files. Check your connection and reload.';
    return;
  }
  STAR = SVG.star; STAR_E = SVG.star_empty;
  Object.assign(ICONS, SVG);
  window.__icons = ICONS;
  $('hudCoinIc').src = ICONS.coin; $('hudScroll').src = ICONS.scroll;
  // title art: the hero team rendered in the new style
  $('titleHero').src = showcase.portrait(save.hero || defaultHero(), 360, true);
  $('titleMira').src = showcase.portrait(MIRA, 300, true);
  $('starIc').src = STAR; $('coinIc').src = SVG.coin; $('shopStarIc').src = STAR; $('shopCoinIc').src = SVG.coin;
  setupTouch($('game'));
  setMuted(!!save.muted);
  const touch = matchMedia('(pointer: coarse)').matches;
  if (!touch) $('keys').classList.remove('hidden');
  show('title');
  $('playBtn').onclick = () => {
    unlockAudio();
    preloadSfx(['sword_slash_1', 'sword_slash_2', 'hit_light_1', 'hit_light_2', 'hit_heavy_1', 'jump', 'land', 'coin', 'enemy_die', 'telegraph', 'cursor', 'confirm', 'emote_pop']);
    sfx('confirm', 0.7);
    if (!save.hero) { if (!save.seenStory) startStory(() => buildCreator(true)); else buildCreator(true); }
    else openMap();
    if (touch && document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(() => {});
  };
  requestAnimationFrame(frame);
  window.__lqk = { get game() { return game; }, startLevel, openMap, openShop, openGames, openRunway, get rw() { return rw; }, startShow, save: () => save, persist };
  window.__lqkWorld = world;
}
boot();
