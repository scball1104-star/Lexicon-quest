/* DOM contract smoke test. This does not substitute for rendered browser QA. */
const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
const nodes=new Map(),handlers={},saves=new Map();
const ctx=new Proxy({measureText:t=>({width:t.length*6})},{get:(t,k)=>t[k]||(()=>{}),set:(t,k,v)=>(t[k]=v,true)});
function el(id=''){return {id,tagName:'DIV',dataset:{},children:[],value:'',_html:'',get innerHTML(){return this._html},set innerHTML(v){this._html=v;for(const m of v.matchAll(/id="([^"]+)"/g)){if(!nodes.has(m[1]))nodes.set(m[1],el(m[1]));}const hero=/<input id="hero"[^>]*value="([^"]*)"/.exec(v);if(hero)nodes.get('hero').value=hero[1];},appendChild(n){this.children.push(n);if(n.className==='modal-wrap')nodes.set('modal',n);},addEventListener(k,f){if(id==='app')handlers[k]=f;},querySelector(){return {focus(){}}},focus(){},remove(){nodes.delete('modal')},getContext:()=>ctx,getBoundingClientRect:()=>({left:0,top:0,width:816,height:624})};}
nodes.set('app',el('app'));
const document={getElementById:id=>nodes.get(id),createElement:()=>el(),querySelector:q=>q==='.modal-wrap'?nodes.get('modal'):null,querySelectorAll:()=>[],addEventListener(){},hidden:false};
class Audio{play(){return Promise.resolve()}pause(){}}
const sandbox={LQ:require('./rpg-engine.js'),LQInteriors:require('./rpg-interiors.js'),LQBattleUI:require('./rpg-combat-ui.js'),document,Audio,localStorage:{getItem:k=>saves.get(k)||null,setItem:(k,v)=>saves.set(k,v)},navigator:{},location:{protocol:'file:'},setInterval:()=>1,clearInterval(){},prompt:()=>null,console};vm.createContext(sandbox);vm.runInContext(fs.readFileSync(__dirname+'/rpg-reforged.js','utf8'),sandbox);vm.runInContext(fs.readFileSync(__dirname+'/rpg-loot.js','utf8'),sandbox);vm.runInContext(fs.readFileSync(__dirname+'/rpg-ui.js','utf8'),sandbox);
async function click(action,id,extra={}){const b={dataset:{action,id,...extra},disabled:false};await handlers.click({target:{closest:()=>b}});}
(async()=>{
assert.match(nodes.get('app').innerHTML,/Begin a new adventure/);
await click('start');assert.match(nodes.get('app').innerHTML,/Willowmere/i);assert.ok(nodes.get('modal'));
await click('close');assert.ok(nodes.get('field'));assert.equal(saves.size,1);
for(const action of ['equipment','relics','loot','atlas','journal','help','menu','transfer']){await click(action);assert.ok(nodes.get('modal'),action);await click('close');}
const saved=JSON.parse(saves.values().next().value);saved.place='dungeon';saved.region=0;saved.floor=1;saved.x=14;saved.y=3;saves.set('lexicon-realms-v3-0',JSON.stringify(saved));
await click('title');saves.set('lexicon-realms-v3-0',JSON.stringify(saved));await click('load','0');await click('interact');assert.match(nodes.get('app').innerHTML,/Echo Warden trial/i);assert.match(nodes.get('app').innerHTML,/Briar Sentinel/i);assert.doesNotMatch(nodes.get('app').innerHTML,/crossword|across|down clue/i);
await click('title');saved.floor=0;saved.x=5;saved.y=12;saves.set('lexicon-realms-v3-0',JSON.stringify(saved));await click('load','0');await click('move',undefined,{dx:'0',dy:'-1'});assert.match(nodes.get('app').innerHTML,/Choose an action/i);await click('confirmAction');assert.match(nodes.get('app').innerHTML,/Mira/);await click('ability','frost');await click('confirmAction');await click('run');
assert.match(nodes.get('app').innerHTML,/Rootbound Archive/);
console.log('UI smoke checks passed: title, new/continue, map, relics, journal, menus, Echo Warden encounter, battle commands, retreat and save.');
})().catch(e=>{console.error(e);process.exitCode=1});
