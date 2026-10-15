/* v62 Living Combat: real combat state, pure visual model, mobile/studio integration. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const Studio=require('../v62-combat-studio.js');
const Effects=require('../rpg-battle-effects.js');
const UI=require('../rpg-combat-ui.js');
const RPG=require('../rpg-engine.js');
let checks=0;
const check=(value,label)=>{assert.ok(value,label);checks++;};
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
check(Studio.version==='v62','version tag');
check(Studio.DURATION>=650&&Studio.DURATION<2000,'effect animation is concise');
check(Object.keys(Studio.P).length>=10,'battle palette has ten distinct effects');
const cases={
 attack:'physical',pierce:'pierce',flare:'fire',frost:'ice',lexibolt:'arcane',prism:'arcane',
 resonance:'resonance',mend:'heal',revive:'heal',potion:'heal',ether:'mana',ward:'ward',guard:'guard'
};
for(const [action,kind] of Object.entries(cases)){
 check(Studio.classify(action)===kind,action+' resolves to '+kind);
 check(Studio.actionLabel(kind).length>3,kind+' has a battle legend');
 check(Studio.P[kind].length===3,kind+' palette contains three contrasting colors');
}
check(Studio.classify('unknown')==='physical','unrecognized action has physical fallback');
check(Effects.classify('flare')==='fire','inherits underlying effect classifier');
const particles=Studio.particles('fire',7,24);
check(particles.length===24,'particle budget bounded');
check(JSON.stringify(particles)===JSON.stringify(Studio.particles('fire',7,24)),'particle field deterministic');
check(JSON.stringify(particles)!==JSON.stringify(Studio.particles('fire',8,24)),'separate battle seed changes field');
const geo=Studio.geometry(640,320,[{x:500,y:140}], 'enemies');
check(geo.destination.x===500&&geo.destination.y===140,'projectile terminates at foe');
check(geo.start.x>=0&&geo.start.y<=320,'projectile launches inside scene');
const invalid=Studio.cast(null,0);
check(invalid===null,'missing battle effect safe');
const fx={originId:'rootbound',at:200,kind:'fire',action:'flare',
 enemies:[{id:0,name:'Warden',delta:-31,defeated:false},{id:1,name:'Shade',delta:0}],
 party:[],totalDamage:31};
const original=JSON.stringify(fx);
const c=Studio.cast(fx,1);
check(c.kind==='fire'&&c.actor===1,'original actor index retained');
check(c.targets.length===1&&c.targets[0].id===0,'only actual damaged enemies targeted');
check(c.side==='enemies','damage goes to enemy side');
check(JSON.stringify(fx)===original,'animation never mutates authoritative damage');
const healed=Studio.cast({at:300,kind:'heal',action:'mend',enemies:[],party:[{id:1,delta:25,mpDelta:0}]},2);
check(healed.side==='party','healing targets allies');
check(healed.party[0].delta===25,'healing magnitude preserved');
const guarded=Studio.cast({at:300,kind:'guard',action:'guard',party:[],enemies:[]},0);
check(guarded.kind==='guard'&&guarded.side==='neutral','guard with no HP change still animates');
const ctx={
 globalAlpha:1,save(){},restore(){},clearRect(){},scale(){},
 beginPath(){},moveTo(){},lineTo(){},stroke(){},arc(){},fillRect(){},
 fillStyle:'',strokeStyle:'',lineWidth:1
};
for(const kind of Object.keys(Studio.P)){
 const visual={...c,kind,palette:Studio.P[kind]};
 const before=JSON.stringify(visual);
 check(Studio.renderFrame(ctx,visual,.4,[{x:370,y:145}],640,320)===true,kind+' renders midpoint');
 check(JSON.stringify(visual)===before,kind+' rendering does not mutate model');
}
let drawn=0;
global.LQSpriteAtlas={renderFrame(context,id,dir,frame){drawn++;context.fillRect(0,0,5,5);}};
const bitmap={
 width:60,height:72,
 getContext(){return {...ctx,translate(){},scale(){},fillRect(){}};}
};
check(Studio.drawSprite(bitmap,1,2),'actor portrait renders through original atlas');
check(drawn===1,'character atlas called once');
delete global.LQSpriteAtlas;
const game=new RPG.Game();
for(let region=0;region<8;region++){
 const g=new RPG.Game();g.startBattle({id:'studio'+region,r:region,type:'boss'});
 const before=UI.snapshot(g),hp=g.battle.enemies[0].hp;
 const actor=g.battle.actor;
 const success=g.act('attack',0);
 check(success===true,'battle region '+region+' accepts attack');
 check(g.battle.enemies[0].hp<hp,'region '+region+' keeps original damage');
 const resolved=Effects.make(before,UI.snapshot(g),'attack',1234,'battle'+region);
 resolved.actor=actor;
 const model=Studio.cast(resolved,resolved.actor);
 check(model.kind==='physical','region '+region+' builds physical visual');
 check(model.actor===actor,'region '+region+' preserves acting ally');
 check(model.targets.some(t=>t.delta<0),'region '+region+' contains real damage');
}
const html=read('index.html'),sw=read('sw.js'),ui=read('rpg-ui.js'),css=read('v62-combat-studio.css'),netlify=read('netlify.toml');
check(html.includes('src="v62-combat-studio.js"'),'studio file linked in playable entry');
check(html.includes('href="v62-combat-studio.css"'),'studio stylesheet linked');
check(html.indexOf('v62-combat-studio.js')>html.indexOf('rpg-sprite-atlas.js'),'actor art atlas preloaded');
check(html.indexOf('v62-combat-studio.js')<html.indexOf('rpg-ui.js'),'studio ready when battle UI renders');
check(html.indexOf('v62-combat-studio.css')>html.indexOf('v60-premium.css'),'effects loaded after baseline theme');
check(sw.includes("'./v62-combat-studio.js'")&&sw.includes("'./v62-combat-studio.css'"),'offline cache includes combat studio');
check(ui.includes("if(CombatStudio)CombatStudio.decorate(app.querySelector('.battle-stage'),b.actor,fx)"),'studio decorates battle screen');
check(ui.includes('combatImpact.actor=combatActor'),'hero action stored before turn advances');
check(!read('v62-combat-studio.js').includes('localStorage'),'combat visual cannot edit local saves');
check(!read('v62-combat-studio.js').includes('.act('),'combat visual never executes game actions');
check(css.includes('prefers-reduced-motion:reduce'),'combat has reduced motion mode');
check(css.includes('max-width:700px'),'combat portrait adapts to phones');
check(netlify.includes('node qa/v62-combat-studio-test.cjs'),'studio included in regression pipeline');
console.log('PASS '+checks+' v62 Living Combat: action palettes, generated frames, projectile targets, party sprite use, all eight bosses, unchanged saves and deployment.');
