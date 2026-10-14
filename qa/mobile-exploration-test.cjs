/* Touch exploration regression: direct play, held directional movement,
 * objective/map controls, large tap targets, shortest-path navigation and scene art.
 */
'use strict';
const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const at=n=>fs.readFileSync(path.join(__dirname,'..',n),'utf8');
const LQ=require('../rpg-engine.js'),Interiors=require('../rpg-interiors.js'),BattleUX=require('../rpg-combat-ui.js');
const events={},timers=new Map(),saves=new Map(),nodes=new Map();
let nextTimer=1,checks=0;
const check=(v,m)=>{assert.ok(v,m);checks++;};
const paints=[];
const canvas=new Proxy({measureText:t=>({width:String(t).length*7}),fillRect:(...args)=>paints.push(args)},{get:(o,k)=>k in o?o[k]:(()=>{}),set:(o,k,v)=>(o[k]=v,true)});
function elem(id=''){
 return {id,tagName:'DIV',dataset:{},children:[],value:'',_html:'',style:{},
 get innerHTML(){return this._html;},set innerHTML(v){this._html=v;if(id==='app')nodes.delete('modal');for(const m of v.matchAll(/id="([^"]+)"/g))if(!nodes.has(m[1]))nodes.set(m[1],elem(m[1]));const hero=/<input id="hero"[^>]*value="([^"]*)"/.exec(v);if(hero)nodes.get('hero').value=hero[1];},
 appendChild(n){this.children.push(n);if(n.className==='modal-wrap')nodes.set('modal',n);},
 addEventListener(k,f){(events['app:'+k]??=[]).push(f);},
 querySelector(){return {focus(){}};},focus(){},remove(){nodes.delete('modal');},
 getContext:()=>canvas,getBoundingClientRect:()=>({left:0,top:0,width:816,height:624})
 };
}
nodes.set('app',elem('app'));
const document={
 getElementById:id=>nodes.get(id),createElement:()=>elem(),
 querySelector:q=>q==='.modal-wrap'?nodes.get('modal'):null,querySelectorAll:()=>[],
 addEventListener:(k,f)=>(events[k]??=[]).push(f),hidden:false
};
function timer(fn,ms){const id=nextTimer++;timers.set(id,{fn,ms});return id;}
const clear=id=>timers.delete(id);
class Audio{play(){return Promise.resolve()}pause(){}}
const sandbox={LQ,LQInteriors:Interiors,LQBattleUI:BattleUX,document,Audio,localStorage:{getItem:k=>saves.get(k)||null,setItem:(k,v)=>saves.set(k,v)},navigator:{},location:{protocol:'file:'},matchMedia:()=>({matches:true}),setInterval:timer,setTimeout:timer,clearInterval:clear,clearTimeout:clear,console,Image:undefined,prompt:()=>null};
vm.createContext(sandbox);
for(const script of ['rpg-reforged.js','rpg-loot.js','rpg-environment-art.js','rpg-willowmere-art.js','rpg-motion.js','rpg-sprite-atlas.js','rpg-dungeon-props.js','rpg-battle-effects.js','rpg-cinematic-director.js','rpg-ui.js'])vm.runInContext(at(script),sandbox,{filename:script});
async function click(action,id,extra={}){
 const btn={dataset:{action,id,...extra},disabled:false};for(const fn of events['app:click']||[])await fn({target:{closest:()=>btn}});
}
function fire(type,evt={}){for(const fn of events[type]||[])fn(evt);}
function tick(ms){for(const [id,t] of [...timers])if(timers.has(id)&&t.ms===ms)t.fn();}
function state(){const raw=saves.get('lexicon-realms-v3-0');return raw&&JSON.parse(raw);}
(async()=>{
 check(nodes.get('app').innerHTML.includes('Begin a new adventure'),'title loads');
 await click('start');
 check(!nodes.has('modal'),'first launch does not obstruct play');
 check(nodes.get('app').innerHTML.includes('mobile-game-hud'),'compact quest and health HUD shown');
 check(nodes.get('app').innerHTML.includes('lq-companion-cue'),'mobile party banter is visible but nonblocking');
 check(nodes.get('app').innerHTML.includes('mobile-action-buttons'),'mobile action dock shown');
 check(nodes.get('app').innerHTML.includes('Elder Mael'),'initial objective clear');
 check(state().y===15,'initial Willowmere entry correct');
 const btn={dataset:{action:'move',dx:'0',dy:'-1'},disabled:false};
 fire('pointerdown',{target:{closest:()=>btn},pointerType:'touch',preventDefault(){}});
 check(state().y===14,'finger down immediately moves one tile');
 const repeated=[...timers].find(([,t])=>t.ms===260);
 check(!!repeated,'hold delay armed');
 repeated[1].fn();
 check([...timers].some(([,t])=>t.ms===110),'hold repeat armed');
 tick(110);
 check(state().y===13,'held direction repeats without extra tapping');
 check(paints.length>200,'walking movement renders scenery and animated companions');
 fire('pointerup');
 check(![...timers].some(([,t])=>t.ms===110),'lift finger stops movement');
 await click('move',undefined,{dx:'0',dy:'-1'});
 check(state().y===13,'synthetic post-touch click cannot duplicate a move');
 const cv=nodes.get('field');
 check(typeof cv.onclick==='function','map tap handler installed');
 // Elder at map (12,6); mobile camera after movement is x=4, y=6.
 cv.onclick({clientX:(12-4+.5)*48,clientY:(6-6+.5)*48});
 check([...timers].some(([,t])=>t.ms===125),'tap landmark starts pathfinding');
 for(let i=0;i<65&&!nodes.has('modal');i++)tick(125);
 check(!!state().flags.talk0,'arrival automatically starts Elder Mael conversation');
 check(nodes.has('modal'),'dialog opens after arrival');
 await click('close');
 check(!nodes.has('modal'),'continue from quest conversation');
 // One-tap combat is always accessible without scrolling to the command list.
 await click('title');
 const combatSave=state();
 combatSave.place='dungeon';combatSave.region=0;combatSave.floor=0;combatSave.x=5;combatSave.y=12;
 saves.set('lexicon-realms-v3-0',JSON.stringify(combatSave));
 await click('load','0');
 const combatCanvas=nodes.get('field');
 combatCanvas.onclick({clientX:(5-(-3)+.5)*48,clientY:(11-6+.5)*48});
 check(nodes.get('app').innerHTML.includes('mobile-battle-quickbar'),'battle presents mobile quick actions');
 check(nodes.get('app').innerHTML.includes('Skills & items'),'skill access available without hidden desktop hotkeys');
 await click('quickAttack');
 check(nodes.get('app').innerHTML.includes('Mira'),'quick Attack advances to companion turn');
 await click('quickGuard');
 check(nodes.get('app').innerHTML.includes('Bram'),'quick Defend advances to next companion');

 const art=require('../rpg-willowmere-art.js'),chapter=require('../rpg-chapter1.js');
 const town=chapter.town(),floor=chapter.dungeon(0);
 const prior=JSON.stringify([town.tiles,floor.tiles]);
 for(let y=0;y<town.h;y++)for(let x=0;x<town.w;x++)check(art.tile(canvas,0,0,town.tiles[y][x],0,x,y,3,town,'town',0),'town tile '+x+','+y);
 for(let y=0;y<floor.h;y++)for(let x=0;x<floor.w;x++)check(art.tile(canvas,0,0,floor.tiles[y][x],0,x,y,3,floor,'dungeon',0),'Archive tile '+x+','+y);
 art.overlay(canvas,town,{x:0,y:0},5,'town',0);art.overlay(canvas,floor,{x:0,y:0},5,'dungeon',0);
 check(prior===JSON.stringify([town.tiles,floor.tiles]),'art does not modify collision or layout');
 check(paints.length>3000,'scene paints detailed pixel tiles');
 const css=at('rpg-mobile-play.css'),html=at('index.html'),sw=at('sw.js');
 for(const fragment of ['safe-area-inset-bottom','width:165%','position:fixed','touch-action:none','mobile-game-hud','mobile-battle-quickbar','z-index:100','battle-confirm'])check(css.includes(fragment),'mobile style '+fragment);
 check(html.includes('rpg-mobile-play.css')&&html.includes('rpg-willowmere-art.js'),'page includes milestone assets');
 check(sw.includes('rpg-mobile-play.css')&&sw.includes('rpg-willowmere-art.js'),'assets available offline');
 check(sw.includes('rpg-motion.js')&&html.includes('rpg-motion.js'),'motion module is deployed and available offline');
 check(at('rpg-motion.css').includes('prefers-reduced-motion'),'movement styling respects accessibility settings');
 console.log('PASS '+checks+' mobile exploration checks: hold-to-walk, one-step touch semantics, tap-to-approach NPC, one-tap mobile combat, readable HUD, chapter art, offline asset wiring.');
})().catch(e=>{console.error(e);process.exitCode=1;});
