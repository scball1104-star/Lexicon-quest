'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const V=require('../v67-counterplay.js');
const RPG=require('../rpg-engine.js'),UI=require('../rpg-combat-ui.js'),Effects=require('../rpg-battle-effects.js');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
let count=0;function ok(value,label){assert.ok(value,label);count++;}
ok(V.version==='v67','director version');
ok(V.REALMS.length===8,'all eight realms use separate attack effects');
ok(V.DURATION>=650&&V.DURATION<=1400,'retaliation effect is transient');
const fake={originId:'boss',at:123,action:'attack',party:[
 {id:0,name:'Hero',delta:-22,mpDelta:0},
 {id:1,name:'Mage',delta:-12,mpDelta:0},
 {id:2,name:'Guard',delta:0,mpDelta:-2}
],enemies:[{id:0,name:'Boss',delta:-17}]};
const before=JSON.stringify(fake),m=V.model(fake,5);
ok(m?.targets.length===2,'reads only actual wounded allies');
ok(m.total===34&&!m.heavy,'total counts HP only, ignores MP');
ok(m.targets[0].damage===22,'retains confirmed HP delta');
ok(m.realm===5,'supports all regional effects');
ok(JSON.stringify(fake)===before,'effect model does not mutate authoritative data');
ok(V.feedback(m).includes('Hero'),'hit report names injured ally');
ok(V.feedback(m).includes('22 HP'),'hit report includes actual injury');
ok(V.model({...fake,party:[{id:0,name:'Hero',delta:25}]})===null,'healing never creates enemy counterattack');
ok(V.model({...fake,party:[{id:0,name:'Hero',delta:0,mpDelta:-25}]})===null,'spending MP never creates enemy counterattack');
ok(V.model(null)===null,'no battle snapshot safe');
ok(V.model({at:123,party:[]})===null,'no party injury safe');
const big=V.model({...fake,party:[{id:2,name:'Guardian',delta:-42}]},7);
ok(big.heavy,'hard hit earns heavy strike treatment');
ok(V.feedback(big).includes('HEAVY ENEMY STRIKE'),'heavy impact visible');
const markup=V.feedback({...m,targets:[{id:0,name:'<img onerror=1>',damage:12}]});
ok(!markup.includes('<img'),'enemy-origin names escape HTML');
ok(markup.includes('&lt;img'),'escape encoding intact');
const targets=V.points(816,310,m.targets);
ok(targets.length===2,'visual destinations match damaged allies');
ok(targets[0].from.x===408&&targets[0].to.x>=0,'enemy volley source located inside stage');
ok(targets[1].to.x>targets[0].to.x,'two heroes receive distinct destinations');
const ctx={
 globalAlpha:1,strokeStyle:'',fillStyle:'',lineWidth:1,lines:0,arcs:0,rects:0,
 beginPath(){},moveTo(){},lineTo(){this.lines++},stroke(){},arc(){this.arcs++},
 fillRect(){this.rects++}
};
for(let i=0;i<8;i++){
 const variant=V.model(fake,i);
 const start=JSON.stringify(variant);
 ok(V.drawFrame(ctx,variant,.24,816,310),'realm '+i+' attack travel draws');
 ok(V.drawFrame(ctx,variant,.77,816,310),'realm '+i+' impact bloom draws');
 ok(JSON.stringify(variant)===start,'realm '+i+' renderer leaves model unchanged');
}
ok(ctx.lines>=10&&ctx.arcs>=10&&ctx.rects>=10,'draws beams, arc rings, and impact sparks');
ok(!V.drawFrame(null,m,.2,100,100),'missing rendering surface safe');
const g=new RPG.Game();g.startBattle({id:'counterplay-test',r:0,type:'boss'});
const stateBefore=UI.snapshot(g),actor=g.battle.actor;
ok(g.act('attack',0)===true,'real combat still resolves normally');
const real=Effects.make(stateBefore,UI.snapshot(g),'attack',Date.now(),'counterplay-test');
ok(real.action==='attack'&&g.battle.actor===actor+1,'real game turn advances normally');
ok(g.s.party[0].hp===stateBefore.party[0].hp,'drawing itself did not change actor HP');
const html=read('index.html'),sw=read('sw.js'),game=read('rpg-ui.js'),css=read('v67-counterplay.css');
ok(html.includes('src="v67-counterplay.js"'),'director loaded in playable index');
ok(html.includes('href="v67-counterplay.css"'),'director styles active');
ok(html.indexOf('v67-counterplay.js')<html.indexOf('rpg-ui.js'),'effect director loaded before battle UI');
ok(sw.includes("'./v67-counterplay.js'")&&sw.includes("'./v67-counterplay.css'"),'offline cache includes both assets');
ok(game.includes("V67Counterplay.decorate(app.querySelector('.battle-shell'),fx,b.origin.r)"),'battle renderer receives actual result');
ok(!read('v67-counterplay.js').includes('localStorage'),'director cannot edit player saves');
ok(!read('v67-counterplay.js').includes('.act('),'director does not execute combat rules');
ok(css.includes('prefers-reduced-motion:reduce'),'static reduced motion feedback available');
ok(css.includes('max-width:700px'),'phone-sized counterattack badges supported');
ok(read('netlify.toml').includes('node qa/v67-counterplay-test.cjs'),'new suite executes in actual build verification');
console.log('PASS '+count+' v67 counterplay checks (real HP snapshots, eight realm attacks, accessibility, compatibility).');
