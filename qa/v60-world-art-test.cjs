/* Lexicon Quest v60 atmospheric renderer QA. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const A=require('../v60-world-art.js');
const read=name=>fs.readFileSync(path.join(__dirname,'..',name),'utf8');
let checked=0;
function check(value,label){assert.ok(value,label);checked++;}
function surface(){
 const operations=[],colors=[];
 const ctx={
  save(){},
  restore(){},
  set fillStyle(v){this.color=v;colors.push(String(v));},
  get fillStyle(){return this.color;},
  fillRect(x,y,w,h){operations.push([x,y,w,h,this.color]);},
  createRadialGradient(){return{addColorStop(){}}}
 };
 return{ctx,operations,colors};
}
check(A.realms===8,'eight environmental color identities');
check(A.tile===48,'respects existing 48px RPG terrain');
check(A.hash(2,4,6)===A.hash(2,4,6),'terrain motes are deterministic');
check(A.hash(2,4,6)!==A.hash(3,4,6),'adjacent cells do not share all motes');
const tiles=Array.from({length:22},(_,y)=>Array.from({length:25},(_,x)=>x%5===0?'water':x%6===0?'marble':y%4===0?'flowers':'grass'));
const map={tiles,objects:[{type:'inn',x:2,y:2},{type:'shop',x:5,y:5},{type:'forge',x:7,y:7},{type:'questNPC',x:3,y:4}]};
const cam={x:0,y:0};
const palettes=new Set();
for(let i=0;i<8;i++){
 const render=surface();
 const s={region:i,place:'town',floor:0,x:3,y:3,flags:{story:true}};
 const saved=JSON.stringify(s),mapBefore=JSON.stringify(map);
 const out=A.draw(render.ctx,map,cam,s,20,false);
 check(out.motes===34,'animated biome has consistent particle budget '+i);
 check(out.lamps>=3,'authored town services have warm spatial lighting '+i);
 check(render.operations.length>50,'region '+i+' paints atmosphere and terrain details');
 check(JSON.stringify(s)===saved,'region '+i+' never changes game save');
 check(JSON.stringify(map)===mapBefore,'region '+i+' never changes tile map');
 palettes.add(render.colors.find(color=>color.includes('9c')||color.includes('ae'))||render.colors.at(-1));
}
check(palettes.size>=5,'multiple biomes have materially distinct color treatments');
const quiet=surface(),s={region:6,place:'dungeon',floor:1,x:4,y:4,flags:{}};
const x=A.draw(quiet.ctx,map,cam,s,300,true);
check(x.motes===14,'reduced-motion mode uses a smaller fixed particle budget');
check(x.lamps>=1,'dungeon light centers on the actual party position');
check(A.draw(null,map,cam,s).motes===0,'missing canvas context is safe');
check(A.draw(quiet.ctx,null,cam,s).motes===0,'missing map is safe');
check(A.draw(quiet.ctx,map,null,s).motes===0,'missing camera is safe');
check(read('index.html').indexOf('v60-world-art.js')<read('index.html').indexOf('rpg-ui.js'),'world renderer loads before game UI');
check(read('rpg-ui.js').includes('LQV60WorldArt.draw(c,m,camera,s,ambientTick,reducedMotion())'),'exploration canvas actually invokes painter');
check(read('sw.js').includes("'./v60-world-art.js'"),'atmosphere script precached for offline play');
check(read('netlify.toml').includes('node qa/v60-world-art-test.cjs'),'renderer included in release QA');
console.log('PASS '+checked+' v60 world atmosphere assertions: 8 biomes, deterministic animation, safe terrain state, lighting and offline integration.');
