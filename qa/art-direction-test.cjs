/* Visual gameplay milestone QA: characters, mechanisms, real combat impact.
 * Runs in Node without a browser. Validate presentation against actual game flags.
 */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const Sprites=require('../rpg-sprite-atlas.js');
const Props=require('../rpg-dungeon-props.js');
const FX=require('../rpg-battle-effects.js');
const LQ=require('../rpg-engine.js');
const at=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
let checks=0;
const check=(v,message)=>{assert.ok(v,message);checks++;};
function surface(w=24,h=28){
 const grid=Array.from({length:h},()=>Array(w).fill(''));
 return {grid,ctx:{
  _color:'#000',set fillStyle(v){this._color=v},get fillStyle(){return this._color},
  fillRect(x,y,cw,ch){
   for(let yy=Math.max(0,Math.floor(y));yy<Math.min(h,Math.ceil(y+ch));yy++)
    for(let xx=Math.max(0,Math.floor(x));xx<Math.min(w,Math.ceil(x+cw));xx++)grid[yy][xx]=this._color;
  }
 }};
}
const signatures=new Set();
for(let i=0;i<3;i++)for(const direction of Sprites.DIRS)for(let f=0;f<4;f++){
 const s=surface(20,24);
 Sprites.renderFrame(s.ctx,i,direction,f);
 const sig=JSON.stringify(s.grid);
 signatures.add(sig);
 check(s.grid.flat().filter(Boolean).length>55,'character frame includes detailed pixel layers: '+i+'/'+direction+'/'+f);
}
check(signatures.size>=24,'directional / walking frames are meaningfully different');
check(Sprites.metrics().maxFrames===48,'three companions with four facings and four frames');
check(Sprites.metrics().logicalWidth===20&&Sprites.metrics().logicalHeight===24,'native sprite size');
{
 const s=surface(50,55);
 const result=Sprites.draw(s.ctx,0,0,{id:1,dir:'right',walking:true,phase:0.4});
 check(result.id===1&&result.dir==='right'&&result.walking,'draw falls back without browser canvas');
}
const game=new LQ.Game();
const saved=JSON.stringify(game.s);
function paintProp(type,flags={},extra={}){
 const s={...game.s,region:0,flags:{...flags},cleared:[],party:game.s.party};
 const pixels=surface(60,60);
 const o={id:'test-prop',r:0,x:1,y:1,type,...extra};
 const drawn=Props.draw(pixels.ctx,0,0,o,s,2);
 return {drawn,signature:JSON.stringify(pixels.grid)};
}
for(const t of ['chest','door','keydoor','worldgate','lever','boulder','spring','trial','plate','down','up','exit','leave']){
 check(paintProp(t).drawn,'draws readable '+t+' object');
}
check(!paintProp('npc').drawn,'NPCs remain handled by character renderer');
check(paintProp('door',{}, {requires:'key-seal'}).signature!==paintProp('door',{'key-seal':true},{requires:'key-seal'}).signature,'gate visually opens when actual flag changes');
check(paintProp('keydoor').signature!==paintProp('keydoor',{key0:true}).signature,'keydoor visibly responds to key');
check(paintProp('lever').signature!==paintProp('lever',{'test-prop':true}).signature,'lever position reflects activation');
check(paintProp('spring').signature!==paintProp('spring',{'spring:test-prop':true}).signature,'spring quiets after use');
check(paintProp('trial').signature!==paintProp('trial',{seal0:true}).signature,'Echo Warden altar changes after defeat');
check(paintProp('chest').signature!==paintProp('door').signature,'treasure and gates never share placeholder art');
check(JSON.stringify(game.s)===saved,'all rendering leaves game save unchanged');
check(FX.classify('flare')==='fire','fire element');
check(FX.classify('frost')==='ice','ice element');
check(FX.classify('attack')==='physical','physical attack');
check(FX.classify('mend')==='heal','healing skill');
check(FX.classify('resonance')==='resonance','special team move');
const before={enemies:[{name:'Echo Warden',hp:80,maxhp:100}],party:[{name:'Hero',hp:55,mp:10}]};
const after={enemies:[{name:'Echo Warden',hp:48,maxhp:100}],party:[{name:'Hero',hp:61,mp:7}]};
const hit=FX.make(before,after,'frost',100,'battle-id');
check(hit.kind==='ice','impact color derives from actual selected action');
check(hit.enemies[0].delta===-32&&hit.totalDamage===32,'numbers represent actual enemy HP change');
check(hit.party[0].delta===6&&hit.party[0].mpDelta===-3,'ally damage/healing/MP tracked');
check(FX.alive(hit,300,'battle-id'),'impact visible for its current battle');
check(!FX.alive(hit,1300,'battle-id'),'impact expires');
check(!FX.alive(hit,300,'another-battle'),'old effects never appear in other battles');
const html=at('index.html'),sw=at('sw.js'),ui=at('rpg-ui.js'),css=at('rpg-battle-effects.css');
const scripts=['rpg-motion.js','rpg-sprite-atlas.js','rpg-dungeon-props.js','rpg-battle-effects.js','rpg-ui.js'];
for(let i=0;i<scripts.length-1;i++)check(html.indexOf(scripts[i])>=0&&html.indexOf(scripts[i])<html.indexOf(scripts[i+1]),'modules load in dependency order');
for(const asset of [...scripts.slice(1), 'rpg-battle-effects.css'])check(sw.includes(asset),'new gameplay art available offline: '+asset);
new Function(ui);
check(ui.includes('Sprites.draw')&&ui.includes('Props.draw'),'game uses new character and mechanism assets');
check(ui.includes('BattleEffects.make')&&ui.includes('combat-damage'),'damage read from actual combat engine');
check(css.includes('prefers-reduced-motion'),'visual effects accessible');
console.log('PASS '+checks+' visual RPG checks: 48 authored frames, distinct characters, 13 interactive object types, live state changes, true HP damage, offline asset wiring.');
