// The field scene (W2-world): exploration. engine.push('field', { map, x, y, dir, mark, lighting }) or engine.push('field') (reads
// engine.game.map / pos). Owns the TileMap, party, NPCs, enemies, events, cutscene runner, camera, lighting, particles, banner,
// transitions, autosave on map change, and the E2 silverglass / reflections / fog / flag-gated overlays. No HUD (DESIGN 5.1).
// Input: walk, run, confirm, menu, pageR uses a field ability (src/world/abilities.js), pageL switches it.
// LQ_DEBUG: warp, setFlag, give, call('scene', id), lantern(), state(), newGameEp2(name), beams(), turnMirror(id), reflections().

import { createGame, normSlot, newGameEp2,hasFlag as stateHasFlag, setFlag as stateSetFlag, give as stateGive, take as stateTake, setPosition, setSafePoint, serialize, saveMeta, partyMembers, isKeyItem, heal, addMember as stateAddMemberDebug, findGear, addGear } from '../game/state.js';
import { grant, equipOffers, equipGear, deltaLine, gearName, isWeaponKey, baseOf } from '../game/inventory.js';
import { memberName } from '../ui/party.js';
import { touchUi } from '../ui/list.js';
import { drawIcon } from '../ui/window.js';
import { TileMap, TILE } from '../world/tilemap.js';
import { Actor, WALK_FRAMES, RUN_FRAMES } from '../world/actors.js';
import { updateNpc, refreshNpcBehaviour } from '../world/npc.js';
import { Camera } from '../world/camera.js';
import { Lighting } from '../world/lighting.js';
import { Particles } from '../world/particles.js';
import { buildingFeatures, chimneyTops, drawLitWindows } from '../world/townlife.js';
import { Banner, transitionOpts } from '../world/transitions.js';
import { Cutscene } from '../world/cutscene.js';
import { loadMap } from '../world/maps.js';
import { packForMap, packEnabled, packReady, awaitPacks } from '../game/packs.js';
import { landing } from '../game/packFallback.js';
import * as EV from '../world/events.js';
import { DIRS, OPPOSITE, trailingTiles } from '../world/pathfind.js';
import { bannerFor, takeBark, signState, gateSignState, tintFor, creditsPending, markCreditsRolled, pickConditional, CREDITS_HANDOFF, sceneAllowed } from '../game/story.js';
import { Silverglass } from '../world/silverglass.js';
import { Reflections, inGlass } from '../world/reflections.js';
import { Closeup } from '../world/closeup.js';
import { FogBank } from '../world/fog.js';
import { ITEMS } from '../data/items.js';
import { drawWindow } from '../ui/window.js';
import { FieldAbilities, ABILITY_BTN } from '../world/abilities.js';
import { installFieldArt } from '../world/fieldart.js';

const FOLLOW_DEPTH = 2;
// the autosave goes to `game.autosaveSlot` (0 unless the run owns another slot; E3-saves)
const FIELD_RESPAWN_SEC = 150;       // was 60: beaten foes stay away longer
const POST_BATTLE_QUIET = 360;       // frames every foe on the map stands down after any battle (6 s)
const LANTERN_FRAMES = 120;
const LANTERN_HINT_TILES = 2;                       // hidden ink within this many tiles shows the Lantern prompt
/**
 * The touch layout's on-canvas ability button (game px, bottom right, above the dialog area's top edge). It was the
 * Lantern button; W9 made it the field ability button (abilities.js ABILITY_BTN), and a tap there while hidden ink
 * is near still raises the Lantern.
 */
export const LANTERN_BTN = ABILITY_BTN;
const respawnAt = new Map();     // "<map>:<enemyId>" -> engine.time when it comes back (field zones)

export class FieldScene {
  constructor(engine) {
    this.engine = engine;
    this.name = 'field';
    this.game = null;
    this.map = null;
    this.actors = [];
    this.leader = null;
    this.followers = [];
    this.entities = new Map();
    this.byTile = new Map();
    this.enterTriggers = [];
    this.inputLocked = 0;
    this.frame = 0;
    this.time = 0;
    this.rng = engine.rng.fork ? engine.rng.fork('field') : engine.rng;
    this.hasFlag = (f) => stateHasFlag(this.game, f);
    this.sessionGone = new Set();      // pots broken, dungeon enemies beaten (until re-entry)
    this.dungeonGone = new Map();      // mapId -> Set(enemyId)
    this.reentryGone = new Map();      // mapId -> Set(enemyId): field maps with `respawn: 'reentry'`, cleared on entering from another map
    this.warned = new Set();
    this.fadeAlpha = 0; this.fadeTween = null;
    this.lantern = 0;
    this.musicPushed = false;
    this.sceneMusic = null;
    this.loading = false;
    this.pendingWarp = null;
    this.dead = false;
    this.lightSources = [];
    this.lastStepSfx = 0;
    this.prompt = null;
    this.stepCount = 0;
    this.pendingBarks = [];
    this.packReturn = null;
    this.lastMapIsInterior = false;
    this.transparentLetterbox = '#06050c';
    this.features = [];                // windows and chimneys of the buildings on this map (townlife.js)
    this.lastTint = null;
    this.lanternHint = false;          // hidden ink is near and the Lantern is carried: show its prompt
    this.fxTriggers = [];              // one-shot particle tells from the map's ambientFx (the pit page)
    this.fxDone = new Set();
    this.abilities = new FieldAbilities(this);   // W9: Dash Strike, Appraise, the Lantern, Shove
    this.glass = new Silverglass(this);          // E2: silverglass beams, receptors, glass bridges
    this.reflections = new Reflections(this);    // E2: who has a face in the water
    this.closeup = new Closeup(this);            // W11: the framed close-up of the fountain (cutscene s.closeup)
    this.fog = new FogBank(this);                // W11: the Fading Stretch's fog bank and its cairn checkpoints
  }

  warnOnce(key, msg) { if (!this.warned.has(key)) { this.warned.add(key); console.warn(`[field] ${msg}`); } }

  // ---------------------------------------------------------------- scene contract
  async enter(data = {}) {
    const e = this.engine;
    if (!e.game) e.game = createGame('Arden');
    this.game = e.game;
    this.camera = new Camera(this);
    this.lighting = new Lighting(e);
    this.particles = new Particles(this);
    this.banner = new Banner(e);
    this.cutscene = new Cutscene(this);
    e.renderer.setBackdrop(null);
    const g = this.game;
    const mapId = data.map || g.map;
    let x = data.x, y = data.y, dir = data.dir || g.pos.dir;
    // no position given: resume the saved spot on the saved map; a different map uses its own `start`
    if (data.mark == null && x == null && mapId === g.map) { x = g.pos.x; y = g.pos.y; }
    this.tintOverride = data.lighting || null;
    await this.loadMap(mapId, x, y, dir, { mark: data.mark, first: true });
    this.installDebug();
  }

  exit() {
    this.dead = true;
    if (this.cutscene) this.cutscene.cancel();
    const e = this.engine;
    if (this.musicPushed) { e.audio.popMusic(0.6); this.musicPushed = false; }
    e.audio.ambience(null, { fade: 0.8 });
  }

  onResume(result) {
    if (result && result.quit) { this.dead = true; this.cutscene.cancel(); }
  }

  // ---------------------------------------------------------------- map loading
  async loadMap(mapId, x, y, dir, o = {}) {
    const e = this.engine, g = this.game;
    this.loading = true;
    let mod = await loadMap(mapId);
    // W7: a pack map that did not come up is never the test town: wait (bounded), else land on a real map and return once the pack is up
    const hit = !mod && packForMap(mapId);
    if (hit && hit.prefixed && packEnabled(hit.id)) {
      await awaitPacks([hit.id], 8000);
      mod = await loadMap(mapId);
      const l = !mod && landing(mapId), back = l && await loadMap(l[0]);
      if (back) { if (!packReady(hit.id)) this.packReturn = { pack: hit.id, map: mapId, x, y, dir, via: l[0] }; mod = back; [mapId, x, y, dir] = l; o = { ...o, mark: undefined }; }
    }
    if (!mod) {
      this.warnOnce('map:' + mapId, `map "${mapId}" not found; using the test town`);
      mod = await loadMap('_testtown');
      mapId = mod.id;
    }
    // tear down the old map
    for (const a of this.actors.slice()) this.removeActor(a);
    this.actors = []; this.entities = new Map(); this.byTile = new Map();
    installFieldArt(e);                // W9: the ability art (heavy block, root wall, cracked rock) joins the tile db
    this.map = new TileMap(e, mod, { hasFlag: this.hasFlag });
    // W11 (PLAYTEST_REVIEW_3 fix 2): a field map with `respawn: 'reentry'` (the Fading Road) brings its beaten groups
    // back only when the party walks in from another map; a same-map warp (the fog doors) keeps them gone.
    if (mod.id !== this.mapId) this.reentryGone.delete(mod.id);
    this.mapId = mod.id;
    this.abilities.reset();
    this.sliding = [];
    this.lantern = 0;
    this.prompt = null;
    this.lanternHint = false; this._inkKey = null;
    this.fxTriggers = fxTriggersOf(mod); this.fxDone = new Set();
    // position
    let tx = x, ty = y;
    if (o.mark) { const m = this.map.mark(o.mark); if (m) { tx = m[0]; ty = m[1]; } }
    if (tx == null || ty == null) { const s = mod.start || { x: 1, y: 1 }; tx = s.x; ty = s.y; dir = dir || s.dir; }
    dir = DIRS[dir] ? dir : 'down';
    setPosition(g, mod.id, tx, ty, dir);
    // Game over returns the party to the last landmark, not the floor entrance (PLAYTEST 7.11): a map
    // entered from another map or by stairs is one; a same-map notch door or a pit fall is not. Save bells,
    // Keeper's fonts and `safe: true` events mark one when used (markSafe).
    if (o.first || o.landmark) setSafePoint(g);
    // party
    this.rebuildParty(tx, ty, dir);
    // events, reveals
    EV.buildEntities(this);
    EV.applySavedReveals(this);
    this.glass.reset();
    this.reflections.reset();
    this.closeup.reset();
    this.fog.reset();
    this.gateCheck();
    // camera, lighting, particles, music
    this.camera.snapTo(this.leader);
    const lighting = mod.lighting || {};
    this.lighting.setDark(lighting.dark || 0);
    const tintName = this.tintOverride || tintFor(mod.id, lighting.tint, this.hasFlag);
    this.lighting.setTint(tintName === 'ink_light' ? '#b8b0d0' : tintName, 0);
    this.tintOverride = null;
    this.features = buildingFeatures(this.map);
    this.particles.list = [];
    this.particles.setChimneys(chimneyTops(this.features));
    this.particles.setRain(mod.weather === 'rain' && !mod.weatherZone);
    this.particles.setMist(mistAreasOf(mod));
    this.weatherZone = mod.weather === 'rain' ? mod.weatherZone || null : null;
    this.lastTint = null;
    this.syncTimeOfDay();
    if (this.particles.prewarmMist) this.particles.prewarmMist(this.camera);
    this.applyMusic(mod);
    e.audio.ambience(mod.ambience || null, { fade: 1.2 });
    const b = bannerFor(mod.id, mod, this.hasFlag);
    if (b && !o.quiet) this.banner.show(b.title, b.sub);
    if (!o.first) this.autosave();
    this.loading = false;
    this.frame = 0;
    // enter triggers after the fade-in, then any step trigger under the landing tile
    e.after(o.first ? 20 : 8, async () => {
      // W15 (PLAYTEST_REVIEW_4 fix 7): an arrival scene waits until the location banner has been read (it starts as
      // the banner slides out), with input held, so its first window never covers the floor's name. Not under a
      // scene-owned fade (Episode 2's morning after the credits starts on a black screen).
      if (this.banner.active && this.fadeAlpha < 0.5 && !this.fadeTween
          && this.enterTriggers.some((ent) => ent.present && ent.ev.script && sceneAllowed(ent.ev.script, this.hasFlag))) {
        this.lockInput();
        try { await this.untilBannerRead(mod.id); } finally { this.unlockInput(); }
      }
      if (this.dead || this.mapId !== mod.id) return;
      await this.runEnterTriggers();
      if (this.dead || this.mapId !== mod.id) return;
      const L = this.leader;
      for (const ent of EV.entitiesAt(this, L.tx, L.ty)) {
        if (ent.present && ent.type === 'trigger' && (ent.ev.on == null || ent.ev.on === 'step') && ent.ev.script) { this.runScene(ent.ev.script); break; }
      }
    });
    if (this.map.mod.lighting && this.map.mod.lighting.dark > 0.3) e.after(40, () => this.bark('first_dark_room'));
  }

  /** Ambient life for a map at a time of day (tint name): what the particle system keeps alive. */
  ambientFor(mod, tint) {
    const out = [];
    const night = tint === 'dusk' || tint === 'night';
    const still = tint === 'hollow_dusk';            // E2: the Nameless Hollow's evening has no life in the air
    if (mod.area === 'field') out.push('leaves');
    if ((mod.area === 'town' || mod.area === 'field') && night) out.push('fireflies');
    if ((mod.area === 'town' || mod.area === 'field') && !night && !still) out.push('birds');
    if (mod.area === 'town') out.push('smoke');
    if (mod.area === 'dungeon') out.push('motes', 'drips');
    if (mod.lighting && mod.lighting.dark > 0.3) out.push('embers');
    // ambientFx strings are particle kinds; objects ({ fx, at, area }) are one-shot tells handled by fxTriggers
    if (mod.ambientFx) out.push(...mod.ambientFx.filter((k) => typeof k === 'string' && k !== 'page_fall'));
    if (mistAreasOf(mod) !== undefined) out.push('mist');
    return out;
  }

  /**
   * The tint changed (map load, a scene's `tint`, a flag): lamps light up after dusk and go out by day,
   * the ambient set follows (fireflies at night, birds by day) and 'above' particles take the tint.
   */
  syncTimeOfDay() {
    const tint = this.lighting.tintName;
    if (tint === this.lastTint) return;
    this.lastTint = tint;
    const mod = this.map.mod;
    this.particles.setAmbient(this.ambientFor(mod, tint));
    const lit = this.lighting.isNight || this.lighting.lampsLit || tint === 'dawn' || (mod.lighting && mod.lighting.dark > 0.3) ? 1 : 0;
    for (const p of this.map.props) if (p.t === 'lamp_post' && p.state !== lit) this.map.setPropState(p, lit);
  }

  /** Remember the party's current tile as the game over return point (bells, fonts, `safe` events). */
  markSafe() {
    const L = this.leader;
    if (L) setPosition(this.game, this.mapId, L.tx, L.ty, L.dir);
    setSafePoint(this.game);
  }

  applyMusic(mod) {
    const e = this.engine;
    const interior = mod.area === 'interior';
    // E2: `music` may be a first-match list ([{ if: 'nh_restored', id: 'hollowmere' }, { id: 'hollow' }])
    const music = pickConditional(mod.music, this.hasFlag) || null;
    if (this.musicPushed && !interior) { e.audio.popMusic(0.8); this.musicPushed = false; this.currentMusic = this.musicBelow || null; }
    if (interior) {
      if (music && music !== this.currentMusic) {
        if (this.musicPushed) e.audio.music(music);
        else { this.musicBelow = this.currentMusic; e.audio.pushMusic(music); this.musicPushed = true; }
        this.currentMusic = music;
      }
    } else if (music) { if (music !== this.currentMusic) e.audio.music(music); this.currentMusic = music; }
    else { e.audio.stopMusic(1.0); this.currentMusic = null; }
    this.sceneMusic = null;
  }

  /** Resolves once the location banner starts to slide out (or is gone, or the map changed). */
  async untilBannerRead(mapId) {
    const b = this.banner;
    for (let guard = 0; guard < 300 && !this.dead && this.mapId === mapId && b.active && b.t < b.total - 22; guard++) await this.engine.waitFrames(1);
  }

  autosave() {
    try { this.engine.save.save(normSlot(this.game && this.game.autosaveSlot), serialize(this.game), saveMeta(this.game)); } catch (err) { this.warnOnce('autosave', `autosave failed: ${err && err.message}`); }
  }

  async runEnterTriggers() {
    if (this.dead) return;
    for (const ent of this.enterTriggers.slice()) {
      if (!ent.present || !ent.ev.script) continue;
      await this.runScene(ent.ev.script);
      if (this.dead) return;
    }
  }

  /**
   * Transition to another map (or another spot on this one). kind: door | stairs | edge | pit | same | ferry | warp,
   * and E2: mirror (a Keeper mirror: white dither, mirror_step, a landmark like any map-to-map door) | fog (the Fading
   * Stretch's loop doors: a soft white dither, no door sounds, same map).
   */
  warpTo(mapId, x, y, dir, kind = 'door') {
    if (this.pendingWarp) return this.pendingWarp;
    const e = this.engine;
    const same = mapId === this.mapId;
    const k = same && kind === 'door' ? 'same' : kind;
    const L = this.leader;
    const [sx, sy] = this.camera.toScreen(L.feetX, L.feetY - 8);
    const opts = transitionOpts(k, { dir, x: sx, y: sy });
    if (k === 'door' || k === 'same') e.audio.sfx('door_open');
    else if (k === 'stairs') e.audio.sfx('stairs');
    else if (k === 'pit' || k === 'fall') e.audio.sfx('fall');
    else if (k === 'mirror') e.audio.sfx('mirror_step');
    this.inputLocked++;
    const landmark = !same || kind === 'stairs' || kind === 'mirror';
    this.pendingWarp = e.fadeTo(async () => {
      await this.loadMap(mapId, x, y, dir, { quiet: same, landmark });
    }, opts).then(() => {
      this.inputLocked = Math.max(0, this.inputLocked - 1);
      this.pendingWarp = null;
      if (k === 'door' && !same) e.audio.sfx('door_close');
      if (k === 'fog' && !this.dead) this.afterFog();
    });
    return this.pendingWarp;
  }

  /** The fog loop landed the party: a step trigger there (fog_loop) speaks; without one, the fog_loop bark does. */
  afterFog() {
    const L = this.leader;
    const trig = EV.entitiesAt(this, L.tx, L.ty).some((e) => e.present && e.type === 'trigger' && e.ev.script);
    this.setFlag('fog_looped');
    if (!trig) this.bark('fog_loop');
  }

  // ---------------------------------------------------------------- party
  rebuildParty(x, y, dir) {
    const g = this.game;
    const members = partyMembers(g);
    const keep = new Map();
    for (const a of this.actors) if (a.kind === 'party') keep.set(a.id, a);
    const lx = x != null ? x : (this.leader ? this.leader.tx : g.pos.x);
    const ly = y != null ? y : (this.leader ? this.leader.ty : g.pos.y);
    const ldir = dir || (this.leader ? this.leader.dir : g.pos.dir);
    const list = [];
    members.forEach((m, i) => {
      let a = keep.get(m.id);
      if (!a) {
        a = new Actor(this, { id: m.id, kind: 'party', sprite: m.id, x: lx, y: ly, dir: ldir, solid: false, name: m.name, portrait: m.id, bob: false });
        this.addActor(a);
      }
      list.push(a);
    });
    for (const a of keep.values()) if (!list.includes(a)) this.removeActor(a);
    this.leader = list[0];
    this.followers = list.slice(1, 1 + FOLLOW_DEPTH);
    const open = (nx, ny) => !!this.map && this.map.inBounds(nx, ny) && !this.map.blockedAt(nx, ny) && this.map.codeAt(nx, ny) !== 'pit' && !this.actorAt(nx, ny);
    if (x != null) {
      this.leader.setPos(lx, ly, ldir);
      // followers line up behind the leader; in a doorway (wall behind) they fall in beside the trail instead
      const spots = trailingTiles(open, lx, ly, ldir, this.followers.length);
      this.followers.forEach((f, i) => { const s = spots[i] || [lx, ly]; f.setPos(s[0], s[1], ldir); });
    } else {
      // a member who just joined falls in on a free tile next to the leader, never on top of them
      const taken = new Set(list.filter((a) => keep.has(a.id)).map((a) => `${a.tx},${a.ty}`));
      for (const f of this.followers) {
        if (keep.has(f.id)) continue;
        const L = this.leader;
        const spots = trailingTiles((nx, ny) => open(nx, ny) && !taken.has(`${nx},${ny}`), L.tx, L.ty, L.dir, 1);
        const s = spots[0] || [L.tx, L.ty];
        f.setPos(s[0], s[1], L.dir);
        taken.add(`${s[0]},${s[1]}`);
      }
    }
  }

  /** Caterpillar: each follower steps into the tile the actor ahead is leaving. Call when the leader starts a step. */
  partyFollow(dur) {
    let prevX = this.leader.fromX / TILE, prevY = this.leader.fromY / TILE;
    for (const f of this.followers) {
      const fx = f.tx, fy = f.ty;
      if ((fx !== prevX || fy !== prevY) && !f.moving) {
        f.startStep(prevX, prevY, dur);
        if (Math.abs(fx - prevX) + Math.abs(fy - prevY) > 1) f.setPos(prevX, prevY, f.dir);
      }
      prevX = fx; prevY = fy;
    }
  }

  // ---------------------------------------------------------------- actors
  addActor(a) { if (!this.actors.includes(a)) this.actors.push(a); }
  removeActor(a) { const i = this.actors.indexOf(a); if (i >= 0) this.actors.splice(i, 1); }
  /** A scripted despawn: the entity stays gone until the map is loaded again (any type, not only NPCs). */
  despawn(a) {
    this.removeActor(a);
    for (const ent of this.entities.values()) if (ent.actor === a) { ent.actor = null; ent.present = false; ent.data.despawned = true; }
  }
  actorById(id) {
    if (id === 'hero') return this.leader;
    for (const a of this.actors) if (a.id === id) return a;
    return null;
  }
  /** Actor occupying a tile (solid ones by default; `any` includes the party and non-solid actors). */
  actorAt(x, y, except = null, any = false) {
    for (const a of this.actors) {
      if (a === except) continue;
      if (!any && (!a.solid || a.kind === 'party')) continue;
      if (a.tx === x && a.ty === y) return a;
      if (a.moving && a.fromX / TILE === x && a.fromY / TILE === y && any) return a;
    }
    return null;
  }
  enemyGone(id) {
    const key = `${this.mapId}:${id}`;
    const dg = this.dungeonGone.get(this.mapId);
    if (dg && dg.has(id)) return true;
    const rg = this.reentryGone.get(this.mapId);
    if (rg && rg.has(id)) return true;
    const t = respawnAt.get(key);
    return t != null && this.engine.time < t;
  }
  eventBlocksNpc(x, y) { return EV.tileHasEvent(this, x, y); }

  /**
   * May `actor` step from (x, y) to (nx, ny) in direction dir? true | false | 'hop' (one-way ledge).
   * Pits are enterable by the party (they fall); never by NPCs or enemies.
   */
  canStep(actor, x, y, nx, ny, dir) {
    const map = this.map;
    if (!map.inBounds(nx, ny)) return false;
    const code = map.codeAt(nx, ny);
    if (code === 'solid' || code === 'water' || code === 'counter' || code === 'void') return false;
    if (code === 'pit') return actor && actor.kind === 'party' ? true : false;
    if (code === 'ledge_s' || code === 'ledge_e' || code === 'ledge_w') {
      const need = code.slice(6) === 's' ? 'down' : code.slice(6) === 'e' ? 'right' : 'left';
      if (dir !== need) return false;
      if (!(actor && actor.kind === 'party')) return false;
      return 'hop';
    }
    const other = this.actorAt(nx, ny, actor);
    if (other && (actor.kind !== 'party' || other.kind !== 'party')) return false;
    if (actor && actor.kind !== 'party' && actor.kind !== 'spawn' && actor.kind !== 'actor') {
      // NPCs and enemies never walk onto the party's tiles
      for (const p of [this.leader, ...this.followers]) if (p && p.tx === nx && p.ty === ny) return false;
    }
    return true;
  }

  onActorLeave(actor, x, y) { for (const ent of EV.entitiesAt(this, x, y)) EV.stepOff(this, ent, actor); }
  onActorEnter(actor, x, y) {
    for (const ent of EV.entitiesAt(this, x, y)) EV.stepOn(this, ent, actor);
    if (this.map.terrainAt(x, y) === 'tallgrass') this.particles.sway(x, y);
  }

  /** Slide a prop to a tile over `frames` (shelves, blocks). Collision moves at the end. */
  slideProp(p, x, y, frames, sfx) {
    const map = this.map;
    const fromX = p.x, fromY = p.y;
    if (sfx) this.engine.audio.sfx(sfx);
    map.moveProp(p, x, y);
    const dx = (fromX - x) * TILE, dy = (fromY - y) * TILE;
    p.offX = dx; p.offY = dy;
    const start = this.frame;
    return new Promise((resolve) => {
      this.sliding.push({ p, dx, dy, start, frames, resolve });
    });
  }

  // ---------------------------------------------------------------- flags, items, dialogue
  setFlag(flag, value = true) {
    stateSetFlag(this.game, flag, value);
    EV.refreshEntities(this);
    for (const a of this.actors) if (a.kind === 'npc') refreshNpcBehaviour(this, a);
    this.gateCheck();
    // E2: flag-gated overlays and overhead tiles (the ford bridge, the Hollow's lettered signs, the clock hands)
    if (this.map && this.map.gated && (this.map.gated.length || this.map.gatedOverhead.length)) this.map.refreshGated(this.hasFlag);
    if (this.glass) this.glass.markDirty();
    const mod = this.map && this.map.mod;
    if (mod && !this.inputLocked) {
      const tintName = tintFor(mod.id, (mod.lighting || {}).tint, this.hasFlag);
      this.lighting.setTint(tintName === 'ink_light' ? '#b8b0d0' : tintName, 30);
    }
    // E2: a conditional map track follows its flags outside scenes (scenes set the music themselves)
    if (mod && Array.isArray(mod.music) && !(this.cutscene && this.cutscene.running) && !this.musicPushed) {
      const m = pickConditional(mod.music, this.hasFlag);
      if (m && m !== this.currentMusic) { this.engine.audio.music(m); this.currentMusic = m; }
    }
  }
  gateCheck() { /* gates with flags are re-evaluated by refreshEntities (present + state) */ }

  lockInput() { this.inputLocked++; this.prompt = null; }
  unlockInput() { this.inputLocked = Math.max(0, this.inputLocked - 1); }

  dialog(o) {
    const e = this.engine;
    if (this.dead) return Promise.resolve(undefined);
    if (e.hasScene('dialog')) return e.pushAwait('dialog', o);
    this.warnOnce('nodialog', 'dialog scene missing; text goes to the console');
    console.log('[dialog]', o.name || o.who || '', o.text);
    return e.waitFrames(10).then(() => (o.choices ? 0 : undefined));
  }
  async showBoxes(boxes, defaultWho = null) {
    if (!boxes || !boxes.length) return;
    const list = boxes.map((b) => ({ who: b.who === undefined ? defaultWho : b.who, text: b.text, name: b.name, portrait: b.portrait }));
    if (this.engine.hasScene('dialog')) { await this.engine.pushAwait('dialog', { boxes: list }); return; }
    for (const b of list) await this.dialog(b);
  }
  async choice(options) {
    const e = this.engine;
    if (e.hasScene('choice')) { const r = await e.pushAwait('choice', { options }); return typeof r === 'number' ? r : options.length - 1; }
    const r = await this.dialog({ who: null, text: '', choices: options, instant: true });
    return typeof r === 'number' ? r : options.length - 1;
  }
  /**
   * A first-time companion remark. It only speaks when the field is idle and on top; during a cutscene, an
   * interaction or a battle it waits in `pendingBarks` and plays at the next quiet moment (so the dark-room
   * remark never stacks under an arrival scene's dialogue).
   */
  async bark(key) {
    if (this.inputLocked || this.pendingWarp || (this.cutscene && this.cutscene.running) || this.engine.scene !== this || this.actors.some((a) => a.kind === 'enemy' && a.brain && a.brain.mode === 'chase' && Math.abs(a.tx - this.leader.tx) + Math.abs(a.ty - this.leader.ty) <= 5)) {
      if (!this.pendingBarks.includes(key)) this.pendingBarks.push(key);
      return;
    }
    const boxes = takeBark(this.game, key, this.hasFlag);
    if (!boxes.length) return;
    this.lockInput();
    try { await this.showBoxes(boxes); } finally { this.unlockInput(); }
  }
  /**
   * A chest, pot or scene hands something over: gear goes to the bag as an instance (equippable), the rest
   * counts. The toast plays the jingle or the rarity drop sound (legendaries get the beam); gear that beats
   * what someone wears is then offered through the equip prompt.
   */
  async giveItem(itemId, qty = 1) {
    const e = this.engine;
    const got = grant(this.game, itemId, qty);
    if (got.unknown) this.warnOnce('item:' + itemId, `unknown item "${itemId}" given`);
    const inst = got.kind === 'gear' && got.uid != null ? findGear(this.game, got.uid) : null;
    if (e.toasts) await e.toasts.received(inst || itemId, qty, inst ? { at: this.leaderScreenPoint() } : {});
    else {
      const jingle = e.audio.jingle(isKeyItem(itemId) ? 'key_item' : 'item_get');
      const it = ITEMS[itemId];
      await this.dialog({ who: null, text: `Received {c:gold}${it ? it.name : itemId}{/c}${qty > 1 ? ' x' + qty : ''}.` });
      await jingle;
    }
    if (inst) await this.maybeEquipPrompt(got.uid);
  }
  /** E2 (the cutscene's give('gold', n)): add gold with the coin sound and the "Received n gold." toast. */
  async giveGold(n) {
    const e = this.engine;
    const amount = Math.max(0, Math.round(Number(n) || 0));
    if (!amount) return;
    this.game.gold += amount;
    e.audio.sfx('coin');
    if (e.toasts && e.toasts.gold) await e.toasts.gold(amount);
    else await this.dialog({ who: null, text: `Received {c:gold}${amount} gold{/c}.` });
  }
  /** A rolled gear instance (random chests): into the bag, the toast (beam at `o.at`), then the equip prompt. */
  async giveGear(inst, o = {}) {
    const e = this.engine;
    const uid = addGear(this.game, inst);
    if (uid == null) { this.warnOnce('gear', 'giveGear: not an item'); return null; }
    const it = findGear(this.game, uid);
    if (e.toasts) await e.toasts.received(it, 1, { at: o.at || this.leaderScreenPoint() });
    await this.maybeEquipPrompt(uid);
    return uid;
  }
  /** Screen point (bottom center) at the leader's feet, for the legendary beam. */
  leaderScreenPoint() {
    const L = this.leader;
    if (!L || !this.camera) return undefined;
    return this.camera.toScreen(L.feetX, L.feetY + 1);
  }

  /**
   * The equip prompt (PLAYTEST 3, W5): gear just received that beats what a member wears is offered at once,
   * "Equip the Iron Pike on Bram?" Yes / Later, or the members' names when more than one gains (best gain
   * first). Yes equips through inventory.equipGear and shows the stat arrows in a toast. Off when the
   * `equipPrompts` setting is false. Returns true when something was equipped.
   */
  async maybeEquipPrompt(uid) {
    const e = this.engine;
    if (this.dead || e.settings.equipPrompts === false) return false;
    const offer = equipOffers(this.game, uid);
    if (!offer) return false;
    const name = gearName(offer.item);
    const names = offer.offers.map((x) => memberName(x.member));
    let text, choices, cancel;
    if (offer.offers.length === 1) { text = `Equip the ${name} on ${names[0]}?`; choices = ['Yes', 'Later']; cancel = 1; }
    else { text = `Equip the ${name}?`; choices = [...names, 'Later']; cancel = names.length; }
    const pick = await this.dialog({ who: null, text, choices, cancel });
    if (this.dead || typeof pick !== 'number' || pick < 0 || pick >= offer.offers.length) return false;
    const chosen = offer.offers[pick];
    const out = equipGear(this.game, chosen.member, chosen.key, uid);
    if (!out.ok) { e.audio.sfx('buzzer'); return false; }
    const m = chosen.member;
    if (isWeaponKey(m, chosen.key) && !m.equip[m.weapon]) m.weapon = chosen.key;
    e.audio.sfx('equip');
    const who = isWeaponKey(m, chosen.key) && m.weapon !== chosen.key ? `${memberName(m)} (${chosen.key})` : memberName(m);
    const base = baseOf(offer.item);
    if (e.toasts) await e.toasts.show({ text: `${who}: ${deltaLine(chosen.delta)}`, icon: base ? base.icon : null, icon16: !!(base && base.slot === 'weapon'), frames: 80 });
    return true;
  }
  async takeItem(itemId, qty = 1) {
    stateTake(this.game, itemId, qty);
    const it = ITEMS[itemId];
    if (this.engine.toasts) await this.engine.toasts.show({ text: `Handed over {c:gold}${it ? it.name : itemId}{/c}.`, icon: it && it.icon ? it.icon : null });
  }
  fadeScreen(target, frames) {
    return new Promise((resolve) => {
      if (frames <= 0) { this.fadeAlpha = target; this.fadeTween = null; resolve(); return; }
      this.fadeTween = { from: this.fadeAlpha, to: target, t: 0, dur: frames, resolve };
    });
  }

  runScene(id) { return this.cutscene.run(id); }

  // ---------------------------------------------------------------- battle
  async startBattle(encounterId, o = {}) {
    const e = this.engine;
    this.lockInput();
    let result;
    try {
      if (e.hasScene('battle')) {
        if (this.map.mod.area !== 'interior') e.audio.sfx('encounter');
        // the save's story flags go along: an encounter may read one (the Nameless King's +25 Fury on fountain_done)
        result = await e.pushAwait('battle', { encounterId, start: o.start || 'normal', boss: !!o.boss, canFlee: o.canFlee !== false, flags: this.game.flags });
      } else {
        this.warnOnce('nobattle', 'battle scene missing; encounters auto-win');
        e.renderer.flash('#ffffff', 10, 0.7);
        await e.waitFrames(20);
        result = 'win';
      }
    } finally { this.unlockInput(); }
    if (result === undefined) result = 'lose';
    // the battle writes outcome flags (echo_warden_defeated, ...) straight into engine.game
    if (!this.dead) { EV.refreshEntities(this); for (const a of this.actors) if (a.kind === 'npc') refreshNpcBehaviour(this, a); }
    // gear that dropped in the fight (battle.js leaves the uids on the engine): the equip prompt after the rewards
    const drops = e.lastBattleDrops; e.lastBattleDrops = null;
    if (result === 'win' && drops && drops.length && !this.dead) {
      this.lockInput();
      try {
        while (e.transition && !this.dead) await e.waitFrames(1);
        await e.waitFrames(6);
        for (const uid of drops) { if (this.dead) break; await this.maybeEquipPrompt(uid); }
      } finally { this.unlockInput(); }
    }
    if (result === 'lose' && !this.dead) {
      // the battle scene normally hands off to gameover itself; this is the fallback
      if (e.scene === this && !e.hasScene('gameover')) {
        heal(this.game, { full: true });
        const s = this.game.lastSafe;
        e.fadeTo(() => this.loadMap(s.map, s.pos.x, s.pos.y, s.pos.dir, { landmark: true }), { duration: 1.0, hold: 0.3 });
      } else if (e.scene === this && e.hasScene('gameover')) e.push('gameover');
    }
    if (result === 'flee') await this.bark('flee');
    return result;
  }

  /** Contact with a visible enemy: by 'player' (the leader stepped into it) or 'enemy' (it stepped into the leader). */
  async touchEnemy(enemy, by) {
    if (this.inputLocked || this.dead || enemy.data?.fighting) return;
    const ent = [...this.entities.values()].find((x) => x.actor === enemy);
    if (!ent) return;
    enemy.data = enemy.data || {}; enemy.data.fighting = true;
    const L = this.leader;
    let start = 'normal';
    const facingEachOther = DIRS[L.dir][0] === -DIRS[enemy.dir][0] && DIRS[L.dir][1] === -DIRS[enemy.dir][1];
    if (by === 'player' && !facingEachOther && enemy.dir === L.dir) start = 'preemptive';
    if (by === 'enemy' && enemy.dir === L.dir) start = 'ambush';
    if (by === 'enemy') L.faceToward(enemy); else enemy.faceToward(L);
    await this.bark('first_visible_enemy');
    const enc = EV.encounterFor(ent);
    const result = await this.startBattle(enc.id, { boss: enc.boss, canFlee: enc.canFlee, start });
    enemy.data.fighting = false;
    for (const o of this.actors) if (o !== enemy && o.brain && !(o.brain.stun > POST_BATTLE_QUIET)) o.brain.stun = POST_BATTLE_QUIET;
    if (result === 'win') {
      this.removeActor(enemy);
      ent.actor = null; ent.present = false;
      if (this.map.mod.area === 'dungeon') {
        if (!this.dungeonGone.has(this.mapId)) this.dungeonGone.set(this.mapId, new Set());
        this.dungeonGone.get(this.mapId).add(ent.id);
      } else if (this.map.mod.respawn === 'reentry') {
        if (!this.reentryGone.has(this.mapId)) this.reentryGone.set(this.mapId, new Set());
        this.reentryGone.get(this.mapId).add(ent.id);
      } else respawnAt.set(`${this.mapId}:${ent.id}`, this.engine.time + FIELD_RESPAWN_SEC);
      this.particles.burst('shard', enemy.feetX, enemy.feetY - 6, 6, '#8a7cc8');
    } else if (result === 'flee') {
      if (enemy.brain) enemy.brain.stun = 120;
      // step the party one tile away so the enemy cannot re-touch on the same frame
      const d = OPPOSITE[L.dir];
      if (this.canStep(L, L.tx, L.ty, L.tx + DIRS[d][0], L.ty + DIRS[d][1], d) === true) { L.tryStep(d, RUN_FRAMES); this.partyFollow(RUN_FRAMES); L.face(OPPOSITE[d]); }
    }
  }

  // ---------------------------------------------------------------- update
  update(dt, below) {
    const e = this.engine, input = e.input;
    if (!this.map || this.loading || this.dead) return;
    this.frame++;
    this.time += dt;
    this.game.playtime += dt;
    const L = this.leader;
    const canControl = !below && !this.inputLocked && !this.pendingWarp;

    // actors: interpolation and arrivals
    let leaderArrived = false;
    for (const a of this.actors) {
      const arrived = a.update();
      if (arrived && a === L) leaderArrived = true;
      if (arrived && a.kind === 'party' && a !== L) { /* followers: nothing */ }
    }
    // sliding props
    if (this.sliding.length) {
      const keep = [];
      for (const s of this.sliding) {
        const k = Math.min(1, (this.frame - s.start) / s.frames);
        s.p.offX = Math.round(s.dx * (1 - k)); s.p.offY = Math.round(s.dy * (1 - k));
        if (k >= 1) { s.p.offX = 0; s.p.offY = 0; s.resolve(); } else keep.push(s);
      }
      this.sliding = keep;
    }
    if (leaderArrived) this.onLeaderArrived();

    // behaviours
    if (!this.inputLocked) {
      for (const a of this.actors) {
        if (a.kind === 'npc') updateNpc(this, a);
        else if (a.kind === 'enemy' && a.brain) a.brain.tick(this);
      }
    }

    // E2: silverglass (a dirty trace, the bridge grace rule) and a receptor's first-light scene once the field is quiet
    this.glass.update();
    if (canControl && !L.moving && e.scene === this && !this.cutscene.running && this.glass.queue.length) this.runScene(this.glass.takeScript());
    // a companion remark that had to wait (a scene, a battle, a chest) speaks now that the field is quiet
    if (canControl && !L.moving && this.pendingBarks.length && e.scene === this && !this.banner.active) this.bark(this.pendingBarks.shift());
    // W7: after a fallback landing, go back to the saved place once the pack is up
    const r = this.packReturn;
    if (r && this.mapId !== r.via) this.packReturn = null;
    else if (r && packReady(r.pack) && canControl && !L.moving && e.scene === this && !this.cutscene.running) { this.packReturn = null; this.warpTo(r.map, r.x, r.y, r.dir, 'door'); }

    // player input
    if (canControl && !L.moving && !this.pendingWarp) {
      const running = (input.held('run') || (input.lastDevice === 'keyboard' && input.held('cancel'))) !== !!e.settings.alwaysRun;
      const dur = running ? RUN_FRAMES : WALK_FRAMES;
      const dir = input.heldDir();
      if (dir) {
        if (this.tryLeaderStep(dir, dur) && !leaderArrived) for (const a of this.actors) if (a.kind === 'party') a.update();
      } else if (input.pressed('confirm')) this.interact();
      else if (input.pressed('menu')) this.openMenu();
      else if (input.pressed('pageR')) this.abilities.usePressed();
      else if (input.pressed('pageL')) this.abilities.cycle(1);
      else this.abilities.handleTouch(input, true);
    }
    this.abilities.update(canControl && !L.moving && e.scene === this);

    // prompt over the faced interactable
    this.prompt = null;
    if (canControl && !L.moving) {
      const [fx, fy] = L.facingTile();
      const list = EV.interactables(this, fx, fy);
      if (list.length) this.prompt = { x: fx, y: fy, kind: EV.promptKind(list[0]), ent: list[0] };
      // E2: the first turnable mirror the party faces earns Mira's remark
      if (this.prompt && this.prompt.ent.type === 'mirror' && !this.prompt.ent.ev.fixed && !this.game.counters['bark:first_mirror']) this.bark('first_mirror');
    }
    // the Lantern prompt: carried, not raised, and unrevealed ink within reach
    this.lanternHint = canControl && !L.moving && this.lantern <= 0 && this.hiddenInkNear();

    // lantern timer and reveals
    if (this.lantern > 0) {
      this.lantern--;
      if (this.lantern === LANTERN_FRAMES - 20) EV.revealInk(this, L.tx, L.ty);
    }

    // fade overlay tween
    if (this.fadeTween) {
      const f = this.fadeTween; f.t++;
      this.fadeAlpha = f.from + (f.to - f.from) * Math.min(1, f.t / f.dur);
      if (f.t >= f.dur) { this.fadeTween = null; f.resolve(); }
    }
    // weather zone
    if (this.weatherZone) {
      const z = this.weatherZone;
      this.particles.setRain(L.tx >= z.x && L.ty >= z.y && L.tx < z.x + z.w && L.ty < z.y + z.h);
    }
    this.camera.update();
    this.lighting.update();
    this.closeup.update();
    this.fog.update();
    this.syncTimeOfDay();
    this.particles.setShade(this.lighting.shade());
    this.particles.update(this.camera);
    EV.tickGlints(this);
    this.banner.update();
    if (!this.inputLocked && !this.pendingWarp) { const ep = creditsPending(this.game, this.hasFlag); if (ep) this.rollCredits(ep); }
  }

  tryLeaderStep(dir, dur) {
    const L = this.leader;
    L.dir = dir;
    const [dx, dy] = DIRS[dir];
    const nx = L.tx + dx, ny = L.ty + dy;
    // enemies: walking into one starts its battle
    const enemy = this.actorAt(nx, ny, L);
    if (enemy && enemy.kind === 'enemy') { this.touchEnemy(enemy, 'player'); return false; }
    // push blocks (and E2's sliding mirrors)
    for (const ent of EV.entitiesAt(this, nx, ny)) if (ent.present && EV.isPushable(ent)) { EV.pushBlock(this, ent, dir); return false; }
    const v = this.canStep(L, L.tx, L.ty, nx, ny, dir);
    if (v === false) return false;
    if (v === 'hop') { L.hop(dir); this.partyFollow(14); return true; }
    L.startStep(nx, ny, dur);
    this.partyFollow(dur);
    this.stepCount++;
    if (L.stepSfx && this.stepCount % 2 === 0) this.engine.audio.sfx(`footstep_${this.map.surfaceAt(nx, ny)}`, { volume: 0.7 });
    if (dur <= RUN_FRAMES) this.particles.puff(L.feetX, L.feetY);
    for (const a of this.actors) if (a.kind === 'enemy' && a.brain) a.brain.onPlayerStep();
    return true;
  }

  onLeaderArrived() {
    const L = this.leader, g = this.game;
    setPosition(g, this.mapId, L.tx, L.ty, L.dir);
    this.checkFxTriggers();
    this.fog.onLeaderArrived(L.tx, L.ty);      // W11: the last cairn passed is where a wrong step into the fog lands
    if (this.pendingWarp || this.inputLocked) return;
    const code = this.map.codeAt(L.tx, L.ty);
    // only pit TILES swallow the party; a `pit` area event just says where those tiles drop to (docs/MAPS.md)
    if (code === 'pit') { this.fallInPit(EV.pitDropAt(this, L.tx, L.ty)); return; }
    EV.entitiesAt(this, L.tx, L.ty).forEach((t) => { if (t.present && t.ev.bark) this.bark(t.ev.bark); });   // W7: bark-only triggers
    // doors, exits, triggers on this tile
    for (const ent of EV.entitiesAt(this, L.tx, L.ty)) {
      if (!ent.present) continue;
      if (ent.type === 'door' && ent.ev.to) { this.useDoor(ent); return; }
      if (ent.type === 'gate' && ent.state === 'open' && ent.ev.to && ent.prop && ent.prop.doorAt && ent.prop.doorAt[0] === L.tx && ent.prop.doorAt[1] === L.ty) { this.warpTo(...ent.ev.to, 'door'); return; }
      if (ent.type === 'locked_door' && ent.state === 'open' && ent.ev.to) { this.warpTo(...ent.ev.to, 'door'); return; }
      if (ent.type === 'trigger' && (ent.ev.on == null || ent.ev.on === 'step') && ent.ev.script) { this.runScene(ent.ev.script); return; }
    }
    for (const ex of this.map.mod.exits || []) {
      const w = ex.w || 1, h = ex.h || 1;
      if (L.tx >= ex.x && L.tx < ex.x + w && L.ty >= ex.y && L.ty < ex.y + h && ex.to) { this.warpTo(ex.to[0], ex.to[1], ex.to[2], ex.to[3] || L.dir, 'edge'); return; }
    }
    // a gate door tile that is open (door_boss_open): stepping on its doorAt cell
    for (const ent of this.entities.values()) {
      if (ent.type === 'gate' && ent.state === 'open' && ent.ev.to && ent.prop && ent.prop.doorAt && ent.prop.doorAt[0] === L.tx && ent.prop.doorAt[1] === L.ty) { this.warpTo(...ent.ev.to, 'door'); return; }
    }
  }

  useDoor(ent) {
    let to = ent.ev.to;
    const k = ent.ev.kind;
    const kind = k === 'stairs' || k === 'mirror' || k === 'fog' ? k : 'door';
    // W11 (PLAYTEST_REVIEW_3 item 9): a fog door lands the party at the last cairn passed, not the stretch's start
    if (kind === 'fog' && to[0] === this.mapId) { const at = this.fog.landing(); if (at) to = [to[0], ...at]; }
    this.warpTo(to[0], to[1], to[2], to[3] || this.leader.dir, kind);
  }

  fallInPit(to) {
    const t = to || this.map.mod.pitTo;
    if (!t) { this.warnOnce('pit', `map ${this.mapId} has pit tiles but no pitTo`); return; }
    this.warpTo(t[0], t[1], t[2], t[3] || 'down', 'pit');
  }

  async interact() {
    const L = this.leader;
    const [fx, fy] = L.facingTile();
    const list = EV.interactables(this, fx, fy);
    let ent = list[0];
    // counters: talk across them (one tile further)
    if (!ent && this.map.collisionAt(fx, fy) === 'counter') {
      const [dx, dy] = DIRS[L.dir];
      ent = EV.interactables(this, fx + dx, fy + dy)[0];
    }
    if (!ent) return;
    this.lockInput();
    try { await EV.interact(this, ent); }
    catch (err) { console.error('[field] interact failed', err); }
    finally { this.unlockInput(); }
  }

  async openMenu() {
    const e = this.engine;
    if (!e.hasScene('menu')) { this.warnOnce('nomenu', 'menu scene missing'); return; }
    const r = await e.pushAwait('menu');   // the menu plays menu_open / menu_close itself
    if (r && r.quit) { this.dead = true; this.cutscene.cancel(); }
  }

  useLantern() {
    if (this.lantern > 0) return;
    if (!this.game.items.lantern_of_recall) return;
    this.lantern = LANTERN_FRAMES;
    this.lanternHint = false; this._inkKey = null;
    this.lighting.raiseLantern(LANTERN_FRAMES);
    this.engine.audio.sfx('lantern_reveal');
    const L = this.leader;
    L.showEmote('idea', 40);
    this.engine.after(LANTERN_FRAMES - 20, () => { if (!this.dead) this.bark('first_hidden_ink'); });
  }

  /**
   * Is unrevealed hidden ink (any `*_faint` tile: bridges, wall glyphs, ink switches) within LANTERN_HINT_TILES
   * of the leader while the Lantern of Recall is carried? Cached per tile, rechecked every 20 frames.
   */
  hiddenInkNear() {
    if (!this.game.items.lantern_of_recall || !this.map) return false;
    const L = this.leader;
    const key = `${L.tx},${L.ty}`;
    if (this._inkKey === key && this.frame - this._inkFrame < 20) return this._inkNear;
    this._inkKey = key; this._inkFrame = this.frame;
    const R = LANTERN_HINT_TILES;
    let near = false;
    for (let y = L.ty - R; y <= L.ty + R && !near; y++) {
      for (let x = L.tx - R; x <= L.tx + R; x++) {
        if (!this.map.inBounds(x, y)) continue;
        if (this.map.idsAt(x, y).some((id) => id.endsWith('_faint'))) { near = true; break; }
      }
    }
    this._inkNear = near;
    return near;
  }

  /**
   * One-shot particle tells from the map's `ambientFx` (fxTriggersOf): a `page_fall` entry sends one page
   * drifting down into a pit when the party first steps into its `area` (or, with no area, within `radius`
   * tiles of the nearest pit tile). Once per map load.
   */
  checkFxTriggers() {
    if (!this.fxTriggers.length) return;
    const L = this.leader;
    for (const t of this.fxTriggers) {
      if (this.fxDone.has(t.id)) continue;
      let at = t.at || null;
      let hit = false;
      if (t.area) hit = L.tx >= t.area.x && L.tx < t.area.x + (t.area.w || 1) && L.ty >= t.area.y && L.ty < t.area.y + (t.area.h || 1);
      if (!at || (!t.area && !hit)) {
        const p = this.nearestPit(L.tx, L.ty, t.radius || 5);
        if (!t.area) hit = !!p;
        if (!at) at = p;
      }
      if (!hit || !at) continue;
      this.fxDone.add(t.id);
      if (t.fx === 'page_fall') this.particles.pageFall(at[0] * TILE + 8, at[1] * TILE + 8);
    }
  }
  /** Nearest pit tile within `r` tiles (manhattan), or null. */
  nearestPit(cx, cy, r) {
    let best = null, bestD = Infinity;
    for (let y = cy - r; y <= cy + r; y++) for (let x = cx - r; x <= cx + r; x++) {
      const d = Math.abs(x - cx) + Math.abs(y - cy);
      if (d > r || d >= bestD || !this.map.inBounds(x, y)) continue;
      if (this.map.codeAt(x, y) === 'pit') { best = [x, y]; bestD = d; }
    }
    return best;
  }

  /**
   * An episode's ending handoff (story.js CREDITS_HANDOFF): Episode 1 rolls CREDITS and wakes the party at home in
   * bed; Episode 2 rolls CREDITS_EP2 over `hollowmere`, sets the counter credits2_rolled and wakes them in
   * Hollowmere's inn (nh_inn, inn_bed). Both in day light.
   */
  async rollCredits(episode = 1) {
    const e = this.engine;
    const h = CREDITS_HANDOFF[episode] || CREDITS_HANDOFF[1];
    markCreditsRolled(this.game, episode);
    this.lockInput();
    try {
      if (e.hasScene('credits')) await e.pushAwait('credits', episode === 2 ? { cards: h.cards, music: h.music } : undefined);
      // W15: Episode 2 ends on a card that says the story goes on and the next road is not in the game yet; the night
      // square stays dark under it.
      if (h.endCard && e.hasScene('titleCard')) { this.fadeAlpha = 1; this.fadeTween = null; await e.pushAwait('titleCard', { ...h.endCard }); }
      await this.fadeScreen(1, 1);
      this.lighting.setTint('day', 0);
      await e.fadeTo(() => this.loadMap(h.map, null, null, 'down', { mark: h.mark, landmark: true }), { duration: 1.0, hold: 0.2 });
      // A scene the wake-up map starts on entry (Episode 2's ep2_morning, right after the Episode 1 credits) owns the
      // fade from here: dropping its tween left it waiting forever with input locked (E2-integrate).
      if (!(this.fadeTween && this.cutscene.running)) { this.fadeAlpha = 0; this.fadeTween = null; }
      this.lighting.setTint('day', 0);
    } finally { this.unlockInput(); }
  }

  // ---------------------------------------------------------------- draw
  draw(r) {
    r.clear('#06050c');
    if (!this.map) return;
    const cam = this.camera, map = this.map, t = this.time;
    r.pushCamera(cam.x, cam.y);
    map.drawGround(r, cam, t);
    this.drawSignFades(r);
    this.reflections.draw(r, t);       // E2: under everything that stands on the floor
    this.glass.drawBeams(r, t);        // E2: the light runs under the actors and props that stand in it
    this.particles.draw(r, cam, 'below');
    // y-sorted props and actors
    const items = [];
    for (const p of map.props) {
      if (!p.visible || !p.draw) continue;
      const d = p.draw;
      if (!cam.visible(d.dx + p.offX, d.dy + p.offY, d.w, d.h, 8)) continue;
      items.push({ y: p.sortY + p.offY + p.sortBias, k: 0, p });
    }
    for (const a of this.actors) {
      if (!a.visible) continue;
      if (!cam.visible(a.px - 8, a.py - 24, 32, 40, 8)) continue;
      items.push({ y: a.sortY, k: a === this.leader ? 2 : 1, a });
    }
    const ab = this.abilities;
    for (const g of ab.ghosts) items.push({ y: g.y, k: 0.5, g });          // Dash Strike afterimages
    items.sort((u, v) => (u.y - v.y) || (u.k - v.k));
    const lean = ab.lean;
    for (const it of items) {
      if (it.p) {
        const p = it.p;
        if (p.tall && !p.draw.anim && p.draw.blend !== 'lighter') this.drawPropShadow(r, p);
        map.drawProp(r, p, t);
      } else if (it.g) ab.drawGhost(r, it.g);
      else if (inGlass(it.a)) this.reflections.drawInGlass(r, t, it.a);
      else if (lean && it.a === lean.actor) {
        it.a.px += lean.dx * 2; it.a.py += lean.dy * 2;
        it.a.draw(r, t);
        it.a.px -= lean.dx * 2; it.a.py -= lean.dy * 2;
      } else it.a.draw(r, t);
    }
    ab.drawFx(r);
    this.reflections.drawOver(r);      // E2: faces in the fountain go over the fountain's art
    this.glass.drawFlares(r, t);       // E2: bounce flares, splashes, lit receptors
    this.particles.draw(r, cam, 'mid');
    map.drawOverhead(r, cam);
    r.popCamera();
    this.fog.draw(r, cam);             // W11: the fog bank over the Fading Stretch (above the actors), cairn lights
    // lighting (tints, darkness, glows)
    this.lightSources = this.collectLights();
    const L = this.leader;
    this.lighting.draw(r, cam, this.lightSources, this.lantern > 0 ? [L.feetX, L.feetY - 10] : null);
    r.pushCamera(cam.x, cam.y);
    drawLitWindows(r, cam, map, this.features, this.lighting.glowStrength);
    this.particles.draw(r, cam, 'above');
    for (const a of this.actors) if (a.emote) a.drawEmote(r);
    this.drawPrompt(r);
    this.drawLanternHint(r);
    const idle = !this.inputLocked && !this.pendingWarp && this.engine.scene === this && !L.moving;
    ab.drawOverlay(r, idle);
    r.popCamera();
    ab.drawScreen(r, idle);
    this.closeup.draw(r);              // W11: the fountain close-up (screen space, over the lighting)
    if (this.fadeAlpha > 0) r.fade('#000000', this.fadeAlpha);
    if (!this.closeup.isOpen) this.banner.draw(r);
  }

  /**
   * The Lantern prompt over the leader's head: the lantern icon with the pageR button glyph beside it, bobbing
   * (touch layouts show the icon alone; the tappable button sits in the corner, drawLanternButton).
   */
  drawLanternHint(r) {
    if (!this.lanternHint || !this.engine.assets.has('ui')) return;
    const L = this.leader;
    const bob = Math.floor(this.frame / 10) % 2;
    const headY = L.feetY - L.lift - (L.spr.h - 2);
    const y = headY - 16 - bob;
    const touch = touchUi(this.engine);
    const glyphW = touch ? 0 : r.measure('{i:btn_pageR}');
    const w = 12 + (glyphW ? glyphW + 2 : 0);
    const x = L.feetX - Math.round(w / 2);
    drawIcon(r, 'lantern', x, y);
    if (glyphW) r.text('{i:btn_pageR}', x + 14, y + 1, { shadow: true });
  }
  /** Touch layouts: the ability button (abilities.drawScreen) took over the old Lantern button; kept for callers. */
  drawLanternButton(r) { this.abilities.drawScreen(r, !this.inputLocked && !this.pendingWarp); }

  drawPropShadow(r, p) {
    const d = p.draw;
    const cx = d.dx + p.offX + Math.round(d.w / 2), cy = p.sortY + p.offY + 1;
    const rx = Math.max(6, Math.round(Math.min(d.w, 40) / 2) - 2);
    r.withAlpha(0.45, () => r.ditherEllipse(cx + 2, cy, rx, 3, '#14101e', 0.5));
  }

  collectLights() {
    const out = [];
    const map = this.map;
    const dark = this.lighting.dark > 0.01;
    if (dark) {
      // the party's own light is slightly cool; with the Lantern raised it turns pale green and reaches further
      const L = this.leader;
      out.push({ x: L.feetX, y: L.feetY - 10, r: 58 + (this.lantern > 0 ? 40 : 0), color: null, kind: this.lantern > 0 ? 'lantern' : 'cool' });
      for (const f of this.followers) out.push({ x: f.feetX, y: f.feetY - 10, r: 34, color: null, kind: 'cool' });
    }
    for (const l of map.lights) out.push({ ...l, kind: l.kind || (l.color ? 'warm' : 'neutral'), flicker: !!l.color && l.kind !== 'cool' });
    for (const p of map.props) if (p.light && p.visible) out.push({ ...p.light, kind: 'warm', flicker: true });
    if (dark && this.glass.active) out.push(...this.glass.lights());   // E2: the beam is a light in dark rooms
    // W11 (CRITIQUE_4 item 2): Hollowmere's night lanterns on the fountain water warm the basin under the night tint.
    if (this.lighting.tintName === 'night' && this.reflections.fountains.length && this.hasFlag('nh_restored')) {
      for (const p of this.reflections.fountains) {
        const d = p.draw, cx = d.dx + p.offX + d.w / 2, cy = d.dy + p.offY + d.h * 0.55;
        for (const [ox, oy] of [[-14, 2], [0, -4], [14, 2]]) out.push({ x: cx + ox, y: cy + oy, r: 26, color: '#ffd27a', kind: 'warm', flicker: true });
      }
    }
    return out;
  }

  drawPrompt(r) {
    const p = this.prompt;
    if (!p || !this.engine.assets.has('ui')) return;
    // W9: a breakable shows its ability prompt instead (abilities.drawOverlay); confirm still reads its text
    if (p.ent && p.ent.ev && p.ent.ev.breakable) return;
    const ui = this.engine.assets.atlas('ui');
    const bob = Math.floor(this.frame / 10) % 2;
    let name, x, y;
    if (p.kind === 'talk') {
      name = `prompt_talk_${Math.floor(this.frame / 12) % 3}`;
      const a = p.ent.actor;
      x = a ? a.feetX : p.x * TILE + 8; y = (a ? a.feetY - a.spr.h : p.y * TILE) - 1 - bob;
    } else {
      name = `prompt_check_${Math.floor(this.frame / 14) % 2}`;
      x = p.x * TILE + 8; y = p.y * TILE - 2 - bob;
      const prop = p.ent.prop;
      if (prop && prop.draw) y = Math.min(y, prop.draw.dy + prop.offY - 2 - bob);
    }
    if (ui.frames[name]) r.sprite(ui, name, x, y);
  }

  /** Flag-driven sign fading (STAGING section 2): paint over painted sign tiles while names are missing. */
  drawSignFades(r) {
    const state = signState(this.hasFlag);
    const gate = gateSignState(this.hasFlag);
    if (state === 'normal' && gate === 'normal') return;
    for (const ent of this.entities.values()) {
      if (ent.type !== 'sign' || !ent.ev.fade || !ent.present) continue;
      const kind = ent.ev.fade;
      let amount = 0;
      if (kind === 'gate') amount = gate === 'half' ? 0.6 : 0;
      else if (kind === 'square') amount = state === 'fading' ? 0.55 : 0;
      else amount = state === 'fading' ? 1 : 0;
      if (amount <= 0) continue;
      let rx, ry, rw, rh;
      if (kind === 'gate') {
        // the WILLOWMERE plank hangs under the gate arch: find the gate prefab and wash its plank
        const gateObj = this.map.statics.find((s) => s.t === 'town_gate');
        if (!gateObj) continue;
        rx = (gateObj.x - gateObj.meta.anchor[0]) * TILE + 36; ry = (gateObj.y - gateObj.meta.anchor[1]) * TILE + 18; rw = 24; rh = 7;
      } else {
        const sr = ent.data.signRect || (ent.data.signRect = this.findSignRect(ent));
        rx = sr.x + 3; ry = sr.y + 4; rw = sr.w - 6; rh = sr.h - 8;
      }
      // wash the lettering toward the board's own wood so the sign reads as blank, not painted over
      r.withAlpha(0.85 * amount, () => r.rect(rx, ry, rw, rh, '#9a6334'));
      r.withAlpha(0.5 * amount, () => r.dither(rx, ry, rw, rh, '#7a4a24', 0.4));
    }
  }

  /**
   * Where a sign's art really is: the kit sign tile (ev.tile) template-matched inside the building prefab
   * that owns the event cell, else the event tile itself. Computed once per entity per map load.
   */
  findSignRect(ent) {
    const fallback = { x: ent.x * TILE, y: ent.y * TILE, w: 16, h: 16 };
    const tileId = ent.ev.tile;
    const t = tileId && this.map.db.tiles[tileId];
    if (!t || typeof document === 'undefined') return fallback;
    const near = (s) => (s.meta.footprint || []).some(([dx, dy]) => Math.abs(s.x + dx - ent.x) <= 1 && Math.abs(s.y + dy - ent.y) <= 1);
    const s = this.map.statics.find(near);
    if (!s) return fallback;
    try {
      const [rx, ry, rw, rh] = s.meta.rect;
      const grab = (img, x, y, w, h) => {
        const c = document.createElement('canvas'); c.width = w; c.height = h;
        const g = c.getContext('2d'); g.drawImage(img, x, y, w, h, 0, 0, w, h);
        return g.getImageData(0, 0, w, h).data;
      };
      const A = grab(this.map.sheet(s.meta.sheet), rx, ry, rw, rh);
      const B = grab(this.map.sheet(t.sheet), t.x, t.y, t.w || 16, t.h || 16);
      const tw = t.w || 16, th = t.h || 16;
      const pts = [];
      for (let y = 0; y < th; y++) for (let x = 0; x < tw; x++) { const i = (y * tw + x) * 4; if (B[i + 3] > 200) pts.push([x, y, B[i], B[i + 1], B[i + 2]]); }
      if (pts.length < 40) return fallback;
      for (let y = 0; y <= rh - th; y++) for (let x = 0; x <= rw - tw; x++) {
        let ok = true;
        for (let k = 0; k < pts.length; k += 3) {
          const [px, py, r, g, b] = pts[k];
          const i = ((y + py) * rw + (x + px)) * 4;
          if (A[i] !== r || A[i + 1] !== g || A[i + 2] !== b) { ok = false; break; }
        }
        if (!ok) continue;
        for (let k = 0; k < pts.length; k++) {
          const [px, py, r, g, b] = pts[k];
          const i = ((y + py) * rw + (x + px)) * 4;
          if (A[i] !== r || A[i + 1] !== g || A[i + 2] !== b) { ok = false; break; }
        }
        if (ok) return { x: (s.x - s.meta.anchor[0]) * TILE + x, y: (s.y - s.meta.anchor[1]) * TILE + y, w: tw, h: th };
      }
    } catch (err) { this.warnOnce('signrect', `sign lookup failed: ${err && err.message}`); }
    return fallback;
  }

  // ---------------------------------------------------------------- debug
  installDebug() {
    const D = typeof window !== 'undefined' ? window.LQ_DEBUG : null;
    if (!D) return;
    const self = this;
    const cmds = new Set(D.commands());
    D.register('warp', async (mapId, x, y, dir) => {
      const f = self.engine.scene && self.engine.scene.name === 'field' ? self.engine.scene : null;
      if (f && !f.dead) { await f.warpTo(mapId, x, y, dir || 'down', 'warp'); return [mapId, x, y]; }
      self.engine.reset('field', { map: mapId, x, y, dir: dir || 'down' });
      return [mapId, x, y];
    });
    D.register('setFlag', (flag, value = true) => { const f = self.current(); if (f) f.setFlag(flag, value); else stateSetFlag(self.engine.game, flag, value); return !!value; });
    if (!cmds.has('give')) D.register('give', (id, qty = 1) => { stateGive(self.engine.game, id, qty); return self.engine.game.items[id]; });
    D.register('scene', (id) => { const f = self.current(); return f ? f.runScene(id) : false; });
    D.register('lantern', () => { const f = self.current(); if (f) f.useLantern(); return !!f; });
    // W9 field abilities: ability() uses what pageR would (or `id` forced), cycleAbility() is pageL, abilityState()
    D.register('ability', (id) => {
      const f = self.current(); if (!f) return null;
      if (id) f.game.fieldAbility = id;
      f.abilities.usePressed();
      return f.abilities.debugState();
    });
    D.register('cycleAbility', (d = 1) => { const f = self.current(); if (f) f.abilities.cycle(d); return f ? f.abilities.selected() : null; });
    D.register('abilityState', () => { const f = self.current(); return f ? { ...f.abilities.debugState(), resolve: (() => { const c = f.abilities.resolve(); return c ? { id: c.id, kind: c.kind || null, at: c.at || null, target: !!c.target } : null; })() } : null; });
    D.register('fieldState', () => { const f = self.current(); return f ? f.debugState() : null; });
    // E2-world: the silverglass state, turning a mirror by id (as confirm would), the reflections drawn last frame
    D.register('fog', () => { const f = self.current(); return f ? f.fog.debugState() : null; });
    D.register('closeup', () => { const f = self.current(); return f ? f.closeup.debugState() : null; });
    D.register('beams', () => { const f = self.current(); return f ? f.glass.debugState() : null; });
    D.register('turnMirror', async (id) => {
      const f = self.current(); if (!f) return null;
      const ent = f.entities.get(id);
      if (!ent || ent.type !== 'mirror') return null;
      await EV.turnMirror(f, ent);
      return f.glass.debugState();
    });
    D.register('reflections', () => { const f = self.current(); return f ? { active: f.reflections.active, drawn: f.reflections.drawn } : null; });
    D.register('party', (...ids) => {
      const f = self.current(); if (!f) return null;
      for (const id of ids.flat()) { try { stateAddMemberDebug(f.game, id); } catch (e) { console.warn(e.message); } }
      f.rebuildParty();
      return f.game.party.map((m) => m.id);
    });
    D.register('goto', async (x, y, run = false) => {
      const f = self.current(); if (!f) return false;
      const L = f.leader;
      const { findPath } = await import('../world/pathfind.js');
      const route = findPath((cx, cy, nx, ny, d) => f.canStep(L, cx, cy, nx, ny, d) === true, [L.tx, L.ty], [x, y], { maxNodes: 20000 });
      if (!route) return null;
      for (const d of route) {
        while (f.leader.moving || f.pendingWarp || f.inputLocked) await self.engine.waitFrames(1);
        if (f.dead) return null;
        f.tryLeaderStep(d, run ? RUN_FRAMES : WALK_FRAMES);
        while (f.leader.moving) await self.engine.waitFrames(1);
        await self.engine.waitFrames(1);
      }
      return [f.leader.tx, f.leader.ty];
    });
    D.register('walk', async (dirs, run = false) => {
      const f = self.current(); if (!f) return false;
      const list = typeof dirs === 'string' ? dirs.split(/[ ,]+/).filter(Boolean) : dirs;
      for (const d of list) {
        while (f.leader.moving || f.pendingWarp || f.inputLocked) await self.engine.waitFrames(1);
        f.tryLeaderStep(d, run ? RUN_FRAMES : WALK_FRAMES);
        while (f.leader.moving) await self.engine.waitFrames(1);
        await self.engine.waitFrames(1);
      }
      return [f.leader.tx, f.leader.ty];
    });
  }
  current() { const s = this.engine.scene; return s && s.name === 'field' && !s.dead ? s : (this.dead ? null : this); }

  debugState() {
    const L = this.leader;
    return {
      map: this.mapId, leader: L ? L.debugState() : null, followers: this.followers.map((f) => f.debugState()),
      camera: { x: this.camera.x, y: this.camera.y }, locked: this.inputLocked, scene: this.cutscene.running,
      actors: this.actors.length, props: this.map ? this.map.props.length : 0, lantern: this.lantern,
      entities: [...this.entities.values()].filter((e) => e.present).map((e) => `${e.type}:${e.id}@${e.x},${e.y}${e.state ? ':' + e.state : ''}`),
      prompt: this.prompt ? { x: this.prompt.x, y: this.prompt.y, kind: this.prompt.kind } : null,
      lanternHint: this.lanternHint, fxDone: [...this.fxDone], abilities: this.abilities.debugState(),
      glass: this.glass.debugState(), reflections: this.reflections.drawn,
      perf: this.engine.perfStats(),
    };
  }
}

/**
 * One-shot tells from a map's `ambientFx`: strings are particle kinds (motes, leaves, ...); `'page_fall'` or an
 * object `{ fx: 'page_fall', at?: [x, y], area?: { x, y, w, h }, radius?: 5, id? }` sends one page drifting
 * into a pit (`at`, else the nearest pit tile) when the party first enters `area` (else comes within `radius`
 * tiles of a pit). Default off: a map without the entry shows nothing.
 */
export function fxTriggersOf(mod) {
  const out = [];
  for (const k of (mod && mod.ambientFx) || []) {
    if (typeof k === 'string') { if (k === 'page_fall') out.push({ id: `page_fall_${out.length}`, fx: 'page_fall', radius: 5 }); continue; }
    if (k && typeof k === 'object' && k.fx) out.push({ id: k.id || `${k.fx}_${out.length}`, radius: 5, ...k });
  }
  return out;
}

/**
 * E2: where the `mist` particles may drift. `ambientFx` holds 'mist' (anywhere: returns null) or
 * { fx: 'mist', area: { x, y, w, h } } entries (tile rects). undefined when the map has no mist.
 */
export function mistAreasOf(mod) {
  let any = false;
  const areas = [];
  for (const k of (mod && mod.ambientFx) || []) {
    if (k === 'mist') { any = true; continue; }
    if (k && typeof k === 'object' && k.fx === 'mist') { any = true; if (k.area) areas.push(k.area); }
  }
  if (!any) return undefined;
  return areas.length ? areas : null;
}

export default FieldScene;

/** Registered by the scene registry: debug commands that work before the field is on screen. */
export async function install(engine) {
  const D = typeof window !== 'undefined' ? window.LQ_DEBUG : null;
  if (!D) return;
  if (!D.commands().includes('warp')) {
    D.register('warp', (mapId, x, y, dir) => {
      if (!engine.game) engine.game = createGame('Arden');
      engine.reset('field', { map: mapId, x, y, dir: dir || 'down' });
      return [mapId, x, y];
    });
  }
  if (!D.commands().includes('setFlag')) D.register('setFlag', (flag, value = true) => { if (!engine.game) engine.game = createGame('Arden'); stateSetFlag(engine.game, flag, value); return !!value; });
  /**
   * LQ_DEBUG.newGameEp2(name, { scene: 'field' | 'none' }): the Episode 2 quick start (state.js newGameEp2): a Lv 9
   * party at home in bed with every Episode 1 main flag, so ep2_morning runs. The title's Episode 2 entry calls it.
   */
  D.register('newGameEp2', (name = 'Hero', o = {}) => {
    const g = newGameEp2(name, o);
    engine.game = g;
    if (o.scene === 'none' || !engine.hasScene('field')) return g.map;
    engine.reset('field', { map: g.map, mark: 'bed', dir: 'down' });
    return g.map;
  });
}
