'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const Architecture=require('../v64-architecture.js'),Performance=require('../v64-character-performance.js'),RPG=require('../rpg-engine.js');
let count=0;const ok=(q,label)=>{assert.ok(q,label);count++};
ok(Architecture.styles.length===8,'eight complete regional styles');
ok(new Set(Architecture.styles.map(p=>p.motif)).size===8,'unique authored motif for each realm');
ok(Performance.classNames.length===3,'three individually dressed party roles');
const calls=[];const c={fillRect(x,y,w,h){calls.push([this.fillStyle,x,y,w,h]);},save(){},restore(){},beginPath(){},stroke(){},arc(){},set fillStyle(v){this._fill=v},get fillStyle(){return this._fill}};
const tiles=[['wall','wall','wall','wall','wall'],['wall','floor','floor','floor','wall'],['wall','floor','floor','floor','wall'],['wall','wall','wall','wall','wall']];
for(let r=0;r<8;r++){
 const start=calls.length,map={w:5,h:4,tiles,objects:[]};
 ok(Architecture.tile(c,0,0,'wall',r,0,0,map,'dungeon'),'wall '+r+' rendered');
 ok(Architecture.tile(c,0,0,'floor',r,1,1,map,'dungeon'),'floor '+r+' rendered');
 ok(calls.length>start,'region '+r+' paints');
}
const town={w:5,h:4,tiles:[['house','house','house','house','house'],['house','house','house','house','house'],['road','road','road','road','road'],['grass','grass','grass','grass','grass']],objects:[]};
ok(Architecture.tile(c,0,0,'house',0,2,0,town,'town'),'connected roof');
ok(Architecture.dress(c,town,{x:0,y:0},{place:'town',region:0},2).crests>=0,'town dress safe');
ok(Architecture.dress(c,{w:5,h:4,tiles,objects:[]},{x:0,y:0},{place:'dungeon',region:0},2).sconces>=0,'sconces respect walls');
const room={w:18,h:12,region:2,kind:'forge',tiles:Array.from({length:12},(_,y)=>Array.from({length:18},(_,x)=>y===0?'wall':y===7?'rug':'floor'))};
ok(Architecture.interior(c,room,0)>=0,'forge detailing');
ok(Architecture.light(c,{w:5,h:4,tiles,objects:[]},{x:0,y:0},{place:'dungeon',region:2})===0,'missing gradients safe');
ok(Performance.poseFor({action:'guard'})===5,'guard stance');
ok(Performance.poseFor({action:'attack'})===4,'attack pose');
ok(Performance.poseFor(null)===0,'idle pose');
const state=new RPG.Game(),before=JSON.stringify(state.s);Architecture.dress(c,state.map(),{x:state.s.x-2,y:state.s.y-2},state.s,0);ok(JSON.stringify(state.s)===before,'save untouched');
const html=fs.readFileSync('index.html','utf8'),ui=fs.readFileSync('rpg-ui.js','utf8'),sw=fs.readFileSync('sw.js','utf8'),interior=fs.readFileSync('rpg-interiors.js','utf8'),netlify=fs.readFileSync('netlify.toml','utf8');
for(const file of ['v64-architecture.js','v64-character-performance.js','v64-world.css']){ok(html.includes(file),'browser loads '+file);ok(sw.includes(file),'offline cache includes '+file);}
ok(html.indexOf('v64-architecture.js')<html.indexOf('rpg-interiors.js'),'architectural layer loads before interiors');
ok(html.indexOf('v64-character-performance.js')<html.indexOf('rpg-ui.js'),'animation layer loads before app');
ok(ui.includes('V64Architecture.tile(')&&ui.includes('V64Architecture.dress('),'architectural layer integrated');
ok(ui.includes('V64Performance.decorate(')&&ui.includes('V64Performance.field('),'hero performance integrated');
ok(interior.includes('LQV64Architecture.interior('),'interior layer integrated');
ok(netlify.includes('node qa/v64-architecture-test.cjs'),'build gate contains v64 tests');
ok(!fs.readFileSync('v64-architecture.js','utf8').includes('localStorage'),'no save changes');
ok(!fs.readFileSync('v64-character-performance.js','utf8').includes('.act('),'no animation-triggered combat');
console.log('PASS '+count+' v64 architecture, town, interiors, characters, saves and browser integration checks');
