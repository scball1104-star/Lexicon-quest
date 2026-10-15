/* v61 Wayfinder regression suite: route legality, gates, interaction, save safety. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const W=require('../v61-wayfinder.js');
const L=require('../rpg-engine.js');
let checks=0;
function ok(test,label){assert.ok(test,label);checks++;}
const ROOT=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(ROOT,p),'utf8');
const cols=8,rows=6;
const tiles=Array.from({length:rows},(_,y)=>Array.from({length:cols},(_,x)=>{
  if(x===0||y===0||x===cols-1||y===rows-1)return 'wall';
  if(x===3&&y!==2)return 'wall';
  return 'floor';
}));
const objs=[
 {id:'gate',type:'door',requires:'open',x:3,y:2,label:'Ancient gate'},
 {id:'goal',type:'chest',x:5,y:2,label:'Sealed treasure'},
 {id:'switch',type:'lever',x:1,y:4,label:'Gate control'}
];
const s={place:'dungeon',region:0,floor:0,x:1,y:2,flags:{},cleared:[],party:[{hp:5,maxhp:10}]};
const g={
 s,map(){return {tiles,w:cols,h:rows,objects:objs}},
 objects(){return objs},guide(){return{id:'goal',label:'Sealed treasure',dir:'east',tiles:4}},
 blocked(x,y){return !tiles[y]||!tiles[y][x]||tiles[y][x]==='wall';},
 available(){return true}
};
ok(W.version==='v61','version tag');
const initialState=JSON.stringify(s),initialMap=JSON.stringify(tiles);
const sealed=W.plan(g);
ok(sealed.status==='blocked','locked gate blocks path');
ok(sealed.steps===null,'no invented route distance');
ok(sealed.support?.id==='switch','reachable lever suggested');
ok(!sealed.path.length,'blocked route does not draw fictitious line');
ok(W.findPath(g,5,2,true)===null,'BFS rejects gated objective');
ok(!W.findPath(g,9,8,true),'invalid endpoint safely rejected');
ok(!W.findPath(g,-1,0,true),'negative endpoint safely rejected');
ok(W.findPath(g,1.2,2,true)===null,'fractional endpoint safely rejected');
ok(W.hud(sealed).includes('ROUTE BLOCKED'),'blocked status visible');
ok(W.hud(sealed).includes('goSupport'),'reachable mechanism action available');
ok(!W.hud(sealed).includes('goObjective'),'unreachable travel action hidden');
ok(JSON.stringify(s)===initialState&&JSON.stringify(tiles)===initialMap,'blocked path calculation read-only');
s.flags.open=true;
const open=W.plan(g);
ok(open.status==='ready','released gate enables route');
ok(open.steps>0&&open.steps<=8,'route uses reasonable traversable steps');
ok(open.path[0].x===s.x&&open.path[0].y===s.y,'route begins at current hero tile');
ok(open.path.at(-1).x>=4,'route ends beside the objective');
ok(open.path.some(cell=>cell.x===3&&cell.y===2),'route traverses the open gate');
ok(W.hud(open,true).includes('goObjective'),'travel action now available');
ok(W.hud(open,false).includes('Show route'),'route visibility switch has two states');
ok(W.hud(open,true).includes('aria-pressed="true"'),'visibility state accessible');
const seen=[];
const ctx={
 lineDashOffset:0,save(){seen.push('save')},restore(){seen.push('restore')},
 beginPath(){seen.push('begin')},moveTo(){seen.push('move')},
 lineTo(){seen.push('line')},stroke(){seen.push('stroke')},
 setLineDash(){seen.push('dash')},arc(){seen.push('arc')},fillRect(){seen.push('fill')}
};
ok(W.draw(ctx,open,{x:0,y:0},42)===true,'route overlay paints successfully');
ok(seen.includes('line')&&seen.includes('dash')&&seen.includes('arc'),'overlay includes path, dashed trail, end marker');
ok(seen.at(-1)==='restore','canvas state always restored');
ok(W.draw(null,open,{x:0,y:0})===false,'missing renderer safe');
ok(W.draw(ctx,sealed,{x:0,y:0})===false,'blocked route not falsely painted');
s.x=5;s.y=2;
const here=W.plan(g);
ok(here.status==='here'&&here.steps===0,'standing on destination shows interact');
ok(W.hud(here).includes('Interact now'),'contextual action changes to interact');
s.x=1;s.y=2;
g.guide=()=>({id:'not-present',label:'Find another route'});
const exploration=W.plan(g);
ok(exploration.status==='explore','missing guided object degrades to exploration');
ok(!W.hud(exploration).includes('goObjective'),'exploration offers no misleading travel button');
g.guide=()=>({id:'goal',label:'Sealed treasure'});
const script='&<>"';
const escaped=W.hud({...open,label:script,note:script});
ok(escaped.includes('&amp;&lt;&gt;&quot;'),'route strings properly HTML-escaped');
ok(!escaped.includes('>'+script+'<'),'malicious labels not embedded raw');
const current=new L.Game();
const stateBefore=JSON.stringify(current.s);
const live=W.plan(current);
ok(['ready','here','blocked','explore'].includes(live.status),'real engine guide compatible');
ok(stateBefore===JSON.stringify(current.s),'reading route does not change real save schema');
current.startBattle({id:'test',r:0,type:'enemy'});
ok(W.plan(current).status==='unavailable','combat excludes field wayfinding');
ok(W.hud(W.plan(current))==='','wayfinder does not overlay battle');
const html=read('index.html'),sw=read('sw.js'),ui=read('rpg-ui.js'),css=read('v61-wayfinder.css'),toml=read('netlify.toml');
ok(html.includes('href="v61-wayfinder.css"'),'CSS included in game');
ok(html.includes('src="v61-wayfinder.js"'),'Wayfinder loaded in game');
ok(html.indexOf('v61-wayfinder.js')<html.indexOf('rpg-ui.js'),'navigation runtime precedes RPG UI');
ok(html.indexOf('v61-wayfinder.css')>html.indexOf('v60-premium.css'),'CSS loaded after previous theme');
ok(sw.includes("'./v61-wayfinder.js'")&&sw.includes("'./v61-wayfinder.css'"),'both assets available offline');
ok(ui.includes('Wayfinder.plan(game)'),'field HUD computes game-aware route');
ok(ui.includes('Wayfinder.draw(c,wayPlan,camera'),'field map draws actual route');
ok(ui.includes("if(a==='goObjective'||a==='goSupport')"),'route actions routed through game controls');
ok(toml.includes('node qa/v61-wayfinder-test.cjs'),'build gate includes regression');
ok(css.includes('max-width:700px'),'mobile view supported');
ok(css.includes('prefers-reduced-motion:reduce'),'reduced-motion view supported');
console.log('PASS '+checks+' v61 Wayfinder checks: gated paths, reachable mechanisms, canvas guidance, mobile accessibility, unchanged saves and game integration.');
