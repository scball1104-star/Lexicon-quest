/* Adventure Flow v50: playable game engine, combat coach, bestiary and mobile UI. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const LQ=require('../rpg-engine.js');
const ctx=vm.createContext({LQ,console});
for(const p of ['rpg-reforged.js','rpg-loot.js','rpg-adventure-chronicle.js','rpg-polish-core.js'])
 vm.runInContext(fs.readFileSync(path.join(__dirname,'..',p),'utf8'),ctx,{filename:p});
let checks=0;
const ok=(x,msg)=>{assert.ok(x,msg);checks++};
const P=LQ.polish,C=LQ.chronicle;
ok(!!P&&!!C,'adventure modules loaded');
const s=LQ.fresh('Hero');const g=new LQ.Game(s);
ok(LQ.validSave(s),'baseline v3 save valid');
ok(P.guide(g).objective.length>0,'first quest has an actionable objective');
ok(P.guide(g).fragments===0,'starting chapter score correct');
ok(P.questBanner(g).includes('NEXT DESTINATION'),'accessible quest banner');
ok(P.questRoute(g)===null||P.questRoute(g).tiles>=0,'quest route is safe with existing chapter objects');
const map={w:6,h:5,tiles:[]};
const walls=new Set(['2,1','2,2','2,3']);
const mock={s:{x:1,y:2,region:0,flags:{},cleared:[],place:'dungeon'},
 map(){return map},objects(){return []},blocked(x,y){return x<0||y<0||x>=6||y>=5||walls.has(x+','+y)}};
const pathAround=P.route(mock,4,2);
ok(!!pathAround,'pathfinder routes around obstacles');
ok(pathAround.tiles===7,'pathfinder returns real shortest step count');
ok(P.route(mock,2,2)===null,'impassable destination has no route');
ok(P.route(mock,2,2,true)?.tiles>=0,'adjacent object routes to a usable location');
const heal=new LQ.Game(LQ.fresh('Healer'));
heal.s.party[1].hp=10;heal.s.party[0].hp=heal.s.party[0].maxhp-5;heal.s.potions=2;
const got=P.quickRecover(heal);
ok(got.ok&&got.hero==='Mira','field heal prioritizes the most wounded living ally');
ok(heal.s.party[1].hp>10&&heal.s.potions===1,'potions heal actual state and consume inventory');
const full=new LQ.Game(LQ.fresh());
ok(!P.quickRecover(full).ok,'cannot waste healing at full health');
full.s.party[0].hp=0;full.s.party[1].hp-=10;full.s.party[2].hp=full.s.party[2].maxhp;
const dead=P.quickRecover(full);
ok(dead.ok&&full.s.party[0].hp===0,'field healing does not revive incapacitated allies');
full.startBattle({id:'test',type:'enemy',r:0});
ok(!P.quickRecover(full).ok,'field healing unavailable mid-combat');
const equip=new LQ.Game(LQ.fresh());
LQ.loot.ensureLoot(equip.s);
equip.s.loot=[{id:100,rarity:1,region:0,stat:'might',bonus:1,name:'Plain Charm'},{id:101,rarity:3,region:0,stat:'might',bonus:4,name:'Rare Sword Charm'}];
equip.s.lootNextId=102;
const suggest=P.recommendations(equip.s);
ok(suggest.length===3,'three party recommendations');
ok(suggest[0].upgrade&&suggest[0].best.id===101,'recommended gear has actual stat advantage');
const swapped=P.equipBest(equip,0);
ok(swapped.ok&&equip.s.party[0].charmId===101,'one tap equipment upgrade uses actual equip action');
ok(!P.equipBest(equip,0).ok,'no repeated already-equivalent upgrade');
ok(LQ.validSave(equip.s),'equipment remains valid save data');
for(let r=0;r<8;r++){
 const h=LQ.fresh('Hero');h.region=r;
 const game=new LQ.Game(h);
 const before=JSON.stringify(game.s);
 const brief=P.guide(game);
 ok(!!brief.objective,'chapter '+r+' quest available');
 ok(brief.healthBand==='ready','chapter '+r+' starts healthy');
 ok(!!P.questBanner(game),'chapter '+r+' renders objective');
 ok(JSON.stringify(game.s)===before,'chapter '+r+' guide is read only');
 game.startBattle({id:'qa-'+r,type:'enemy',r});
 const list=P.enemies(game);
 ok(list.length>=2,'chapter '+r+' has actionable foes');
 ok(list.every(i=>i.name&&i.role&&i.counter),'chapter '+r+' enemy weaknesses & roles explained');
 const rec=P.recommend(game);
 ok(rec&&game.abilities(game.s.party[game.battle.actor]).includes(rec.action),'chapter '+r+' recommends unlocked skill');
 ok(rec.target>=0,'chapter '+r+' recommendation targets safely');
 ok(P.battleBanner(game).includes('BATTLE READ'),'chapter '+r+' coaching card renders');
 ok(C.entries(game.s).length>0,'chapter '+r+' bestiary records discovered foes');
 ok(C.entries(game.s).every(v=>v.region===r),'chapter '+r+' bestiary is region specific');
 game.battle.enemies.forEach(e=>{e.hp=0});
 game.win();
 ok(C.stats(game.s).defeated>=2,'chapter '+r+' bestiary tracks battle victories');
 ok(LQ.validSave(game.s),'chapter '+r+' bestiary preserves v3 saves');
 ok(C.html(game.s,LQ.regions).includes('Weakness:'),'chapter '+r+' codex displays mechanical information');
}
const game=new LQ.Game(LQ.fresh());
game.startBattle({id:'charge-target',type:'enemy',r:0});
game.battle.enemies[0].charge=true;
const charge=P.recommend(game);
ok(charge.level==='danger'&&['guard','ward','pierce'].includes(charge.action),'charged attack produces a defensive counter');
const copied=JSON.parse(JSON.stringify(game.s));
ok(LQ.validSave(copied),'expanded save roundtrip compatible');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const sw=fs.readFileSync(path.join(__dirname,'../sw.js'),'utf8');
const ui=fs.readFileSync(path.join(__dirname,'../rpg-ui.js'),'utf8');
new Function(ui);ok(true,'main UI JavaScript parses');
for(const p of ['rpg-adventure-chronicle.js','rpg-polish-core.js']){
 ok(html.indexOf(p)>=0&&html.indexOf(p)<html.indexOf('rpg-ui.js'),'module '+p+' loads before UI');
 ok(sw.includes(p),'module '+p+' pre-cached for offline use');
}
ok(html.includes('rpg-adventure-flow.css'),'coherent visual styles loaded');
for(const text of ["'smartAction'","'recoverField'","'equipSuggested'","'codex'"]){
 ok(ui.includes(text),'real UI action wired '+text);
}
ok(ui.includes('lq-coach-bar')&&ui.includes('lq-loadout-guide'),'the battle and equipment panels are real');
console.log('PASS '+checks+' adventure flow assertions across 8 regions, pathfinding, one-tap equip/recovery, battle guidance, persistent codex and UI.');
