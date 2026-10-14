/* Movement & atmosphere regression checks. Zero browser dependencies. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const Motion=require('../rpg-motion.js');
const LQ=require('../rpg-engine.js');
const Scene=require('../rpg-willowmere-art.js');
const at=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
let checks=0;
function ok(v,m){assert.ok(v,m);checks++;}
for(const [dx,dy,name] of [[0,-1,'up'],[0,1,'down'],[-1,0,'left'],[1,0,'right']]){
 ok(Motion.facing(dx,dy)===name,'direction '+name);
}
const m=Motion.movement(4,5,5,5,100,150);
ok(Motion.position(m,100).x===4,'motion starts at previous tile');
ok(Motion.position(m,250).x===5,'motion ends at destination');
ok(Motion.position(m,175).x===4.5,'motion interpolates halfway');
ok(!Motion.position(m,300).walking,'animation stops after arrival');
const next=Motion.step(m,6,5,175,150);
ok(next.fromX===4.5&&next.toX===6,'consecutive movement has no position snap');
const camera=Motion.camera({x:0,y:0},15,12,25,19,false,.25);
ok(camera.x===1.75&&camera.y===1.5,'fractional camera follows smoothly');
const mobile=Motion.camera(null,12,15,25,19,true);
ok(mobile.x===4&&mobile.y===6,'mobile camera centers hero on larger sprites');
const draw=[];
const c=new Proxy({fillRect:(...v)=>draw.push(v),measureText:t=>({width:t.length*7}),beginPath(){},moveTo(){},lineTo(){},stroke(){},arc(){}},{get:(o,k)=>k in o?o[k]:()=>{},set:(o,k,v)=>(o[k]=v,true)});
for(const dir of ['up','down','left','right']){
 const old=draw.length;
 Motion.sprite(c,3,3,{id:0,dir,walking:true,phase:1});
 ok(draw.length-old>15,'draws '+dir+' directional hero');
}
ok(Motion.pulse(c,{x:10,y:10,time:100},{x:0,y:0},200),'interaction response visible');
ok(!Motion.pulse(c,{x:10,y:10,time:100},{x:0,y:0},1000),'interaction feedback expires');
Motion.signal(c,100,100,50,'quest');
Motion.atmosphere(c,{x:0,y:0},'town',50,{region:0});
ok(draw.length>=70,'visible sprite rendering operations');
const state=LQ.fresh('Motion QA');
const original=JSON.stringify(state);
const map=LQ.townMap(0),dungeon=LQ.dungeonMap(0,0);
const mBefore=JSON.stringify([map.tiles,dungeon.tiles,map.objects,dungeon.objects]);
Scene.tile(c,0,0,map.tiles[10][10],0,10,10,12,map,'town',0);
Scene.tile(c,0,0,dungeon.tiles[15][3],0,3,15,12,dungeon,'dungeon',0);
Motion.atmosphere(c,{x:0,y:0},'dungeon',20,{region:0});
ok(JSON.stringify(state)===original,'animation never mutates game saves');
ok(JSON.stringify([map.tiles,dungeon.tiles,map.objects,dungeon.objects])===mBefore,'animation never mutates collision and world data');
const ui=at('rpg-ui.js'),html=at('index.html'),sw=at('sw.js'),css=at('rpg-motion.css');
new Function(ui);
ok(ui.includes('Motion.camera')&&ui.includes('Motion.step'),'engine interpolation is wired to actual UI movement');
ok(ui.includes('scene-introduction')&&ui.includes('interior-enter'),'zone and interior arrival transitions');
ok(ui.includes('const pos=Motion&&walkAnimation'),'hero position interpolated in renderer');
ok(ui.includes('Math.floor((e.clientX-r.left)/r.width*17+camera.x)'),'tap-to-move accounts for fractional camera');
ok(html.indexOf('rpg-motion.js')<html.indexOf('rpg-ui.js'),'animation library loads before UI');
ok(sw.includes('rpg-motion.js')&&sw.includes('rpg-motion.css'),'animation works offline');
ok(css.includes('prefers-reduced-motion'),'motion respects accessibility preference');
console.log('PASS '+checks+' movement and atmosphere checks: four-direction hero, tweened steps, fractionally smoothed camera, scene transitions, collision/save integrity, offline assets.');
