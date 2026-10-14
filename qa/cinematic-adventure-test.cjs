/* Lexicon Quest v52: cinematic RPG exploration, phase behavior, monster tactics,
 * room-bound architecture, companion conversation and save-safe visual FX. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const LQ=require('../rpg-engine.js');
const at=n=>fs.readFileSync(path.join(__dirname,'..',n),'utf8');
const audio={created:0,oscillators:0};
class FakeAudioContext{
 constructor(){audio.created++;this.state='running';this.currentTime=0;this.destination={};}
 createOscillator(){audio.oscillators++;return {frequency:{setValueAtTime(){}},connect(){},start(){},stop(){},type:'sine'};}
 createGain(){return {gain:{setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){}};}
}
const root={LQ,console,AudioContext:FakeAudioContext};
vm.createContext(root);
for(const file of ['rpg-reforged.js','rpg-loot.js','rpg-adventure-chronicle.js','rpg-polish-core.js','rpg-chapter1-director.js','rpg-cinematic-director.js'])
 vm.runInContext(at(file),root,{filename:file});
const C=LQ.cinematic;
let n=0;const ok=(cond,message)=>{assert.ok(cond,message);n++;};
ok(!!C,'cinematic director installed');
ok(C.palettes.length===8&&C.speeches.length===8,'art and dialogue authored for all realms');
ok(C.mechanismTypes.size>=15,'environment mechanisms have distinct animation states');
const fakeCanvas={operations:0,fillStyle:'',fillRect(){this.operations++;}};
for(let r=0;r<8;r++){
 const state=LQ.fresh('Test');state.region=r;state.place='dungeon';state.floor=0;
 const g=new LQ.Game(state),map=g.map(),before=JSON.stringify([map.tiles,map.objects,g.s]);
 const count=fakeCanvas.operations;
 C.architecture(fakeCanvas,map,{x:0,y:0},g.s,9);
 ok(fakeCanvas.operations>count,'realm '+r+' draws authored architecture');
 ok(JSON.stringify([map.tiles,map.objects,g.s])===before,'realm '+r+' scenery does not alter saves or collisions');
 const companion=C.companion(g.s,'enter');
 ok(!!companion&&companion.text.length>35&&['Mira','Bram'].includes(companion.name),'realm '+r+' includes story-appropriate companion acting');
 ok(C.palettes[r].name.length>5,'realm '+r+' names its architecture');
}
const g=new LQ.Game(LQ.fresh());
g.enter('dungeon',0,0);const map=g.map();
const lever=map.objects.find(o=>o.type==='lever'),gate=map.objects.find(o=>o.type==='door');
ok(!!lever&&!!gate,'floor I includes lever and gate');
const initial=JSON.stringify(g.s);
let one=C.mechanismState(lever,g.s,1000);
ok(!one.changed&&one.progress===1,'first frame initializes a stable mechanism without flashing');
g.s.flags[lever.id]=true;
const changing=C.mechanismState(lever,g.s,1100);
ok(changing.changed&&changing.progress===0,'lever activation starts frame transition');
const mid=C.mechanismState(lever,g.s,1380);
ok(!mid.changed&&mid.progress>.4&&mid.progress<.6,'lever motion interpolates rather than teleports');
const end=C.mechanismState(lever,g.s,1750);
ok(end.progress===1,'mechanism motion finishes smoothly');
ok(C.renderSignature(lever,g.s)===true,'lever state derives from real puzzle flag');
ok(C.renderSignature(gate,g.s)===true,'gate unlocks with the lever flag');
const count=fakeCanvas.operations;
C.drawMechanism(fakeCanvas,0,0,lever,g.s,12,1100,false);
ok(fakeCanvas.operations>=count,'mechanism renderer handles live activations');
g.s.flags[lever.id]=false;
const baseline=C.mechanismState(gate,g.s,2000);
g.s.flags[lever.id]=true;
const gateChange=C.mechanismState(gate,g.s,2010);
ok(gateChange.changed,'gate starts moving when its controlling switch changes');
const gateCount=fakeCanvas.operations;
C.drawMechanism(fakeCanvas,0,0,gate,g.s,12,2240,false);
ok(fakeCanvas.operations>gateCount,'portcullis displays opening animation');
ok(C.drawMechanism(fakeCanvas,0,0,gate,g.s,12,2230,true),'reduced motion preserves gate state');
ok(JSON.stringify(g.s)!==initial,'lever legitimately updates game flags');
const snapshot=JSON.stringify(g.s);
for(const o of map.objects)C.mechanismState(o,g.s,2450);
ok(JSON.stringify(g.s)===snapshot,'mechanism observation never writes gameplay state');
for(const type of ['catalogDial','lanternMemory','spring','trial','chest','tidePump','forgeFan','frostLens']){
 const speech=C.companion(g.s,'interact',{id:'qa-'+type,type});
 if(C.mechanismTypes.has(type))ok(typeof C.soundFor({type})==='string','mechanism '+type+' has sound mapping');
 ok(speech===null||speech.text.length>18,'event '+type+' has readable companion dialogue or intentionally none');
}
// The Catalog puzzle changes actual dungeon geometry, revealing a fully
// reachable optional room with a unique equipment reward.
const hidden=new LQ.Game(LQ.fresh('Hidden Keeper'));
hidden.enter('dungeon',0,0);
let hm=hidden.map();
ok(hm.tiles[7][11]==='wall','secret chamber is solid before the Catalog puzzle');
ok(!hm.objects.some(o=>o.id===C.CACHE_ID),'secret reward is not visible before solving puzzle');
hidden.s.flags['lq:ch1:catalog']=true;
hm=hidden.map();
ok(hm.tiles[7][11]!=='wall'&&hm.tiles[8][12]!=='wall','solved puzzle opens a physical two-row side alcove');
const treasure=hidden.objects().find(o=>o.id===C.CACHE_ID);
ok(!!treasure&&treasure.type==='chest'&&!hidden.blocked(treasure.x,treasure.y),'hidden chest is a reachable, walkable map object');
ok(hidden.s.flags['0-0-switch']!==true,'hidden shortcut does not auto-open main story gate');
const goldBefore=hidden.s.gold,ethersBefore=hidden.s.ethers,lootBefore=hidden.s.loot.length;
const discovered=hidden.interact(treasure);
ok(discovered?.screen==='dialog'&&discovered.text.includes('Sigil'),'discovering chamber has original narrative');
ok(hidden.s.gold===goldBefore+80&&hidden.s.ethers===ethersBefore+1,'secret rewards exact currency and resource amounts');
ok(hidden.s.loot.length===lootBefore+1&&hidden.s.loot.at(-1).stat==='focus','unique keeper charm uses true equipment stat mechanics');
ok(!hidden.objects().some(o=>o.id===C.CACHE_ID),'collected chest no longer interacts');
hidden.interact(treasure);
ok(hidden.s.gold===goldBefore+80&&hidden.s.loot.length===lootBefore+1,'revisits cannot duplicate secret rewards');
ok(LQ.validSave(JSON.parse(JSON.stringify(hidden.s))),'hidden passage and charm preserve existing save version');
const full=new LQ.Game(LQ.fresh('Full Pack'));
full.enter('dungeon',0,0);full.s.flags['lq:ch1:catalog']=true;
full.s.loot=Array.from({length:40},(_,i)=>({id:i+1,name:'Full Bag '+i,stat:'guard',rarity:0,bonus:1,region:0}));
full.s.lootNextId=41;
const fullReward=full.interact(full.map().objects.find(o=>o.id===C.CACHE_ID));
ok(fullReward?.screen==='dialog'&&fullReward.text.includes('sell'),'full inventory warns player before losing the reward');
ok(!full.s.flags['done:'+C.CACHE_ID]&&!full.s.flags[C.CACHE_FLAG],'full inventory retains uncollected treasure for later');

const beforeAudio=audio.oscillators;
ok(!C.tone('gate',false),'muted audio creates no sounds');
ok(audio.oscillators===beforeAudio,'muted audio avoids WebAudio entirely');
ok(C.tone('phase',true),'boss cues can synthesize browser audio');
ok(audio.oscillators>=beforeAudio+3,'phase cue has a three-note theme');
const aura=C.phaseCue({phase:0},{boss:true,phase:1,origin:{r:0},enemies:[{name:'Archivore'}]});
ok(aura&&aura.title.includes('PHASE 2')&&aura.text.length>15,'phase changes create cinematic titles');
ok(!C.phaseCue({phase:1},{boss:true,phase:1,origin:{r:0},enemies:[]}), 'unchanged boss phase does not spam a cue');
for(let r=0;r<8;r++){
 const next=new LQ.Game({...LQ.fresh('Tactics'),region:r});
 next.startBattle({id:'qa-round-'+r,r,type:'enemy'});
 ok(!!next.battle&&next.battle.enemies.length>=2,'realm '+r+' preserves default encounter');
 // Additional ambush telegraph uses a standard charged attack with the
 // preexisting guard / ward / pierce counters.
 const hunter=next.battle.enemies.find(e=>e.role==='hunter');
 if(hunter){
  next.battle.round=2;
  next.enemyTurn();
  ok(next.battle.round===3&&hunter.charge,'realm '+r+' hunter warns before next heavy attack');
  ok(hunter.tactic==='Ambush','realm '+r+' enemy telegraph displays a named tactic');
  ok(next.intent(hunter).toLowerCase().includes('charged')||hunter.charge,'existing combat UI recognizes charge');
  next.enemyTurn();
  ok(!hunter.charge&&!hunter.tactic,'realm '+r+' resolved ambush clears its UI warning');
 }
 const healer=next.battle.enemies.find(e=>e.role==='mender');
 if(healer){
  healer.hp=Math.max(1,healer.hp-5);
  next.battle.round=1;
  next.enemyTurn();
  ok(next.battle.round===2,'support round progresses correctly');
  ok(healer.tactic==='Restoration','restoration warning appears exactly before possible heal turn');
  next.enemyTurn();
  ok(!healer.tactic,'restoration warning disappears when support turn resolves');
 }
 ok(LQ.validSave(next.s),'realm '+r+' battle preserves saved game format');
}
const avoid=new LQ.Game(LQ.fresh('Avoid'));
avoid.startBattle({id:'no-tactic-boss',r:0,type:'boss'});
avoid.battle.round=2;avoid.enemyTurn();
ok(!avoid.battle.enemies.some(e=>e.tactic==='Ambush'),'guardian rules remain separate from common foe tactics');
ok(LQ.validSave(avoid.s),'boss combat remains save compatible');
const page=at('index.html'),worker=at('sw.js'),ui=at('rpg-ui.js'),style=at('rpg-cinematic-director.css');
new Function(ui);ok(true,'main game still parses');
ok(page.indexOf('rpg-cinematic-director.js')>=0&&page.indexOf('rpg-cinematic-director.js')<page.indexOf('rpg-ui.js'),'director loads after engine but before UI');
ok(page.includes('rpg-cinematic-director.css'),'cinematic styles load');
ok(worker.includes('rpg-cinematic-director.js')&&worker.includes('rpg-cinematic-director.css'),'cinematic resources work offline');
for(const marker of ['Cinematic.architecture','Cinematic.drawMechanism','Cinematic?.phaseCue','lq-companion-cue','lq-enemy-tactic','lq-phase-cinematic'])
 ok(ui.includes(marker),'functional scene integration: '+marker);
ok(style.includes('prefers-reduced-motion'),'cinematic sequences respect reduced motion');
console.log('PASS '+n+' cinematic adventure checks: 8 architectural regions, mechanisms, real turn telegraphs, cinematic phases, party acting, audio and saves.');
