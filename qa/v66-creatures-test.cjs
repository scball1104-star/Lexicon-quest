'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),A=require('../v66-creatures.js');
let checks=0;const ok=(v,n)=>{assert.ok(v,n);checks++};
ok(A.version==='v66','version');ok(A.realms.length===8,'eight region-specific silhouettes');
ok(new Set(A.realms).size===8,'eight distinct realm identities');
const renderLog=[];const c={fillRect(x,y,w,h){renderLog.push([this.fillStyle,x,y,w,h])},save(){},restore(){},translate(){},scale(){},set fillStyle(v){this._style=v},get fillStyle(){return this._style}};
for(let r=0;r<8;r++)for(let v=0;v<3;v++)for(let f=0;f<6;f++){
 const base=renderLog.length,ret=A.paint(c,{realm:r,variant:v,frame:f,boss:false});
 ok(ret.realm===r&&ret.variant===v&&ret.frame===f,'deterministic model '+r+'/'+v+'/'+f);
 ok(renderLog.length-base>=15,'visibly composed silhouette '+r+'/'+v+'/'+f);
}
for(let r=0;r<8;r++){
 ok(A.paint(c,{realm:r,variant:2,frame:4,boss:true}).boss,'boss visual '+r);
 ok(A.draw(c,0,0,{realm:r,frame:3,boss:true,variant:1,width:90,height:100}),'boss draw '+r);
}
const raw=fs.readFileSync('v66-creatures.js','utf8'),html=fs.readFileSync('index.html','utf8'),sw=fs.readFileSync('sw.js','utf8'),ui=fs.readFileSync('rpg-ui.js','utf8'),atlas=fs.readFileSync('v63-animated-atlas.js','utf8'),toml=fs.readFileSync('netlify.toml','utf8');
ok(html.includes('src="v66-creatures.js"'),'release HTML imports v66');
ok(sw.includes("'./v66-creatures.js'"),'offline cache v66');
ok(html.indexOf('v66-creatures.js')<html.indexOf('rpg-ui.js'),'v66 loaded before UI');
ok(ui.includes('V66Creatures?.draw'),'new creatures used in actual battle');
ok(atlas.includes('root.LQV66Creatures?.draw'),'new sprites animated during battle');
ok(!raw.includes('localStorage'),'no save-schema writes');
ok(!raw.includes('.act('),'no combat-rule mutation');
ok(toml.includes('qa/v66-creatures-test.cjs'),'new regression in build gate');
console.log('PASS '+checks+' v66 art contract and integration checks');
