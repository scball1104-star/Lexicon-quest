'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),S=require('../v65-scene-art.js'),L=require('../rpg-engine.js');
let count=0;const check=(x,m)=>{assert.ok(x,m);count++};
check(S.version==='v65','version');check(S.regions.length===8,'all realm art directions');check(new Set(S.regions.map(r=>r.pattern)).size===8,'distinct symbolic silhouettes');
const rects=[],c={set fillStyle(v){this.color=v},get fillStyle(){return this.color},fillRect(x,y,w,h){rects.push([x,y,w,h,this.color])},beginPath(){},moveTo(){},lineTo(){},stroke(){}};
for(let region=0;region<8;region++){const m=new L.Game({...L.fresh('QA'),region,place:'town',cleared:Array.from({length:region},(_,i)=>i)});const before=JSON.stringify(m.s),map=m.map(),cam={x:m.s.x-8,y:m.s.y-6};const r=S.field(c,map,cam,m.s,3,true,m.guide());check(r.staged>=0&&r.staged<=S.paintBudget,'budget town '+region);check(JSON.stringify(m.s)===before,'save unchanged '+region);const dummy={width:816,height:330};check(S.battle(c,dummy,region,region%2===0),'battle '+region);}
const box={type:'door',id:'door1',x:4,y:4,requires:'unlocked'},s={flags:{},cleared:[],region:0};check(S.detailOnObject(c,box,{x:0,y:0},s),'locked gate');s.flags.unlocked=true;check(S.detailOnObject(c,box,{x:0,y:0},s),'open gate');check(S.field(c,{objects:[]},{x:0,y:0},{x:0,y:0,region:0,flags:{},place:'town'}).staged===0,'no fake markers');check(rects.length>150,'substantial original generated art');
const html=fs.readFileSync('index.html','utf8'),sw=fs.readFileSync('sw.js','utf8'),ui=fs.readFileSync('rpg-ui.js','utf8'),toml=fs.readFileSync('netlify.toml','utf8');
for(const file of ['v65-scene-art.js','v65-scene-art.css']){check(html.includes(file),'html '+file);check(sw.includes(file),'offline '+file);}
check(html.indexOf('v65-scene-art.js')<html.indexOf('rpg-ui.js'),'correct load order');
check(ui.includes('V65SceneArt.field(')&&ui.includes('V65SceneArt.mountBattle('),'renderer integration');check(toml.includes('node qa/v65-curation-test.cjs'),'QA pipeline integrated');
check(!fs.readFileSync('v65-scene-art.js','utf8').includes('localStorage'),'no save writes');
console.log('PASS '+count+' curated scene, realm identity, landmark and save checks');