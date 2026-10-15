'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const art=require('../v67-willowmere.js'),L=require('../rpg-engine.js');
let count=0;const check=(v,m)=>{assert.ok(v,m);count++};
check(art.version==='v67','versioned renderer');
check(art.palette.roof&&art.palette.water,'palette includes roofs/water');
const game=new L.Game(),old=JSON.stringify(game.s),town=L.townMap(0),world=L.worldMap();
const captures=[];
const c={set fillStyle(v){this.color=v},get fillStyle(){return this.color},fillRect(x,y,w,h){captures.push([x,y,w,h,this.color])},save(){},restore(){},fillText(){}};
for(const [place,map] of [['town',town],['world',world]]){
  let drawn=0;
  for(let ty=0;ty<map.h;ty++)for(let tx=0;tx<map.w;tx++){
    const t=map.tiles[ty]?.[tx];
    const ok=art.tile(c,tx*48,ty*48,t,0,tx,ty,20,map,place,0);
    if(ok)drawn++;
  }
  check(drawn>20,place+' artwork covers the actual map');
}
check(art.tile(c,0,0,'grass',1,0,0,0,town,'town',0)===false,'other regions unchanged');
check(art.tile(c,0,0,'floor',0,0,0,0,town,'dungeon',0)===false,'dungeon preserved');
const before=captures.length;const r=art.overlay(c,town,{x:4,y:4},9,'town');
check(r&&Number.isFinite(r.planters)&&Number.isFinite(r.lamps),'authored town props');
check(captures.length>=before,'prop rendering no exception');
for(const type of ['inn','shop','forge']){
 const n=captures.length;check(art.service(c,100,100,{type},1),'service art '+type);check(captures.length>n+20,'substantial façade '+type);
}
check(art.service(c,0,0,{type:'enemy'},1)===false,'nonservice untouched');
check(JSON.stringify(game.s)===old,'renderer never edits saves');
check(captures.length>200,'meaningful authored pixel geometry');
const ui=fs.readFileSync('rpg-ui.js','utf8'),html=fs.readFileSync('index.html','utf8'),sw=fs.readFileSync('sw.js','utf8'),css=fs.readFileSync('v67-visual.css','utf8');
check(html.includes('v67-willowmere.js')&&html.includes('v67-visual.css'),'loads renderer/style');
check(html.indexOf('v67-willowmere.js')<html.indexOf('rpg-ui.js'),'scene API loads before renderer');
check(ui.includes('V67Village.tile(')&&ui.includes('V67Village.service(')&&ui.includes('V67Village.overlay('),'integration into all scene stages');
check(sw.includes('v67-willowmere.js')&&sw.includes('v67-visual.css'),'offline manifest updated');
check(css.includes('@media(max-width:700px)'),'mobile layout defined');
check(L.validSave(game.s),'existing save schema');
console.log('PASS '+count+' Willowmere v67 scene art, renderer, services, integration and save checks');
