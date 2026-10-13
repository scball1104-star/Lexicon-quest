/* Scrolling, layered exploration. Authored campaign interactions use a stable bridge. */
(() => {
'use strict';
const T=32, D=[[0,-1],[1,0],[0,1],[-1,0]], ids=['world','willowTown','regionalTown'];
const $=id=>document.getElementById(id), bridge=()=>window.LexiconExplorationBridge;
const themes=[{grass:'#496b4b',deep:'#304b3e',leaf:'#2e6248',roof:'#79516b',water:'#39667c',stone:'#87928d'}, {grass:'#657987',deep:'#455763',leaf:'#53777a',roof:'#52637c',water:'#45677f',stone:'#adb8c0'}, {grass:'#6d5945',deep:'#4c3f37',leaf:'#596343',roof:'#914d3c',water:'#925137',stone:'#9f8d77'}, {grass:'#477969',deep:'#305958',leaf:'#37675b',roof:'#42718b',water:'#34758b',stone:'#a5b8b1'}, {grass:'#b39a68',deep:'#917749',leaf:'#6b7b4d',roof:'#967c53',water:'#456e89',stone:'#d0bd8a'}, {grass:'#759b8c',deep:'#557a6d',leaf:'#52836d',roof:'#567996',water:'#94b6ce',stone:'#c0c6b7'}, {grass:'#c0d0d4',deep:'#92a7b3',leaf:'#51717b',roof:'#617f91',water:'#637e98',stone:'#d7dfe0'}, {grass:'#706c85',deep:'#4f4e67',leaf:'#5c6482',roof:'#73618c',water:'#4d507a',stone:'#b9b1c5'}];
let stateRef=null,scene=null,position=null,kind=null,aux=null,route=[],routeTarget=null,held=null,running=false,lastMove=-Infinity,lastFrame=0,animation=null,frameToken=null,day=0;
let trail=[];let camera={x:0,y:0},savedCamera=false,renderCache=new Map(),spriteCache=new Map(),visits=new Set();
const shells=new Map();
const art={};
function loadArt(key,url){if(typeof Image==='undefined')return;const im=new Image();im.onload=()=>{art[key]=im;renderCache.clear();if(handles())draw(Date.now())};im.onerror=()=>{};im.src=url}
loadArt('interiors','assets/art/interior-sprites.png');loadArt('props','assets/art/world-sprites.png');loadArt('party','assets/art/party-sprites.png');loadArt('enemies','assets/art/enemies.webp');loadArt('bosses','assets/art/bosses.webp');
function prop(c,index,x,y,w,h){if(!art.props)return false;c.drawImage(art.props,(index%4)*256,Math.floor(index/4)*256,256,256,Math.round(x),Math.round(y),w,h);return true}
function indoorProp(c,index,x,y,w,h){if(!art.interiors)return false;c.drawImage(art.interiors,(index%4)*256,Math.floor(index/4)*256,256,256,Math.round(x),Math.round(y),w,h);return true}
function person(c,name,x,y,facing,now,walking){if(!art.party)return false;const row=name==='Mira'?1:name==='Bram'?2:0,col=({2:0,3:1,1:2,0:3})[facing]??0,bob=walking&&state().production?.visualFx!==false&&Math.floor(now/110)%2?1:0;c.drawImage(art.party,col*96,row*128,96,128,Math.round(x-2),Math.round(y-19-bob),36,48);return true}

const state=()=>bridge().state();
function progress(){const s=state();if(!s.exploration||s.exploration.version!==1)s.exploration={version:1,positions:{},rooms:{},opened:[],visited:[]};const e=s.exploration;e.positions=e.positions&&typeof e.positions==='object'&&!Array.isArray(e.positions)?e.positions:{};e.rooms=e.rooms&&typeof e.rooms==='object'&&!Array.isArray(e.rooms)?e.rooms:{};e.opened=Array.isArray(e.opened)?e.opened:[];e.visited=Array.isArray(e.visited)?e.visited:[];return e}
function matrix(w,h,char='grass'){return Array.from({length:h},()=>Array(w).fill(char))}
function rect(m,x,y,w,h,v){for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++)if(m[yy]?.[xx]!==undefined)m[yy][xx]=v}
function road(m,x1,y1,x2,y2){let x=x1,y=y1;const paint=()=>{for(let d=0;d<2;d++)if(m[y+d]?.[x]!==undefined)m[y+d][x]=m[y+d][x]==='water'?'bridge':'road'};paint();while(x!==x2){x+=Math.sign(x2-x);paint()}while(y!==y2){y+=Math.sign(y2-y);paint()}}
function base(w,h,indoor=false){const m=matrix(w,h,indoor?'wood':'grass');for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(x===0||y===0||x===w-1||y===h-1)m[y][x]=indoor?'wall':'mountain';return m}
const obj=(id,x,y,label,action,type='sign',extra={})=>({id,x,y,label,action,type,...extra});
function building(s,x,y,w,h,name,action,style='house'){s.buildings.push({x,y,w,h,name,style});rect(s.tiles,x,y,w,h,'building');const dx=x+Math.floor(w/2),dy=y+h;s.tiles[dy][dx]='road';s.objects.push(obj('door-'+s.buildings.length,dx,dy,'Enter '+name,action,'door',{auto:true}));road(s.tiles,dx,dy,dx,20)}
function worldScene(ch){
 const s={w:44,h:30,name:bridge().chapterName(),tiles:base(44,30),objects:[],buildings:[],spawn:{x:8,y:24},indoor:false,world:true};
 // A real river divides the region; two bridges connect the route network.
 rect(s.tiles,21,1,2,28,'water');for(let y=2;y<27;y++){if(y%5===0){s.tiles[y][20]='water';s.tiles[y+1][23]='water'}}
 const spots=[['town',8,10,bridge().townName(),'town','town'],['N',9,16,bridge().guideName(),'N','npc'],['P',32,9,'Restore the crossword seal','P','seal'],['D',35,19,'Enter the regional ruins','D','ruin'],['B',38,5,bridge().bossName(),'B','guardian'],['T',15,6,'Open the old trail chest','T','chest'],['M',29,22,'Challenge the wandering guardian','M','enemy'],['H',7,5,'Visit the word shrine','H','shrine'],['Q',18,18,'Help the local storyteller','Q','npc'],['S',6,22,'Visit the traveling merchant','S','shop']];
 for(const [id,x,y,label,action,type] of spots){road(s.tiles,8,23,x,y+1);s.objects.push(obj(id,x,y,label,action,type));s.tiles[y][x]='road'}
 road(s.tiles,5,14,39,14);road(s.tiles,6,23,39,23);
 s.objects.push(obj('road-sign',12,23,'Read the road sign','sign','sign',{text:'West: village and merchant. North: shrine and old trail. Across the river: archive seal, ruins, and guardian.'}));
 s.objects.push(obj('cache',38,26,'Search the traveler’s cache','cache','chest',{reward:25+ch*5}));road(s.tiles,29,23,38,27);
 for(let y=2;y<28;y++)for(let x=2;x<42;x++){const n=(x*17+y*23+ch*37)%67;if(s.tiles[y][x]==='grass'&&n<12&&!s.objects.some(o=>Math.abs(o.x-x)+Math.abs(o.y-y)<3))s.tiles[y][x]=n<7?'tree':'flower'}
 // Landmark architecture rises above the walkable route rather than becoming an icon grid.
 s.buildings.push({x:5,y:6,w:7,h:4,name:bridge().townName(),style:'town'});rect(s.tiles,5,6,7,4,'building');
 s.buildings.push({x:30,y:4,w:5,h:4,name:'Archive',style:'archive'});rect(s.tiles,30,4,5,4,'building');
 s.buildings.push({x:36,y:1,w:5,h:3,name:'Guardian’s Gate',style:'gate'});rect(s.tiles,36,1,5,3,'building');
 // Repair roads after placing buildings; preserve their collision footprints.
 for(const o of s.objects)s.tiles[o.y][o.x]='road';return s;
}
function townScene(ch,room){
 const spec=bridge().townSpec(),main=room==='square'||room===0;
 if(!main)return interiorScene(ch,room,spec);
 const s={w:30,h:24,name:spec.name,tiles:base(30,24),objects:[],buildings:[],spawn:{x:14,y:21},indoor:false};
 rect(s.tiles,16,2,1,19,'water');road(s.tiles,6,11,24,11);road(s.tiles,4,20,26,20);road(s.tiles,14,11,14,22);road(s.tiles,6,7,6,20);road(s.tiles,22,7,22,20);
 if(kind==='willowTown'){
  building(s,3,3,7,4,'Paper Lantern Inn','room:inn','inn');building(s,18,3,9,4,'Hall of Names','room:archive','archive');building(s,18,13,7,4,'Mara’s Letterpress','room:workshop','workshop');
  s.objects.push(obj('garden-gate',14,4,'Enter Moonwell Garden','room:garden','arch',{auto:true}));road(s.tiles,14,4,14,11);
 }else{
  building(s,3,3,7,4,'Lantern Inn','aux:inn','inn');building(s,18,3,9,4,spec.rooms[2],'room:2','archive');building(s,18,13,7,4,spec.rooms[1],'room:1','workshop');
  s.objects.push(obj('record',12,10,'Recover '+spec.items[0],'evidence','scroll'));s.objects.push(obj('landmark',14,8,'Examine the town monument','landmark','fountain'));
 }
 building(s,3,13,7,4,'Provisioner & Forge','aux:shop','shop');
 rect(s.tiles,12,7,3,3,'stone');s.objects.push(obj('fountain',13,8,'Read the fountain dedication','sign','fountain',{text:'A place for every name. Speak to residents, inspect records, and visit the buildings to learn this town’s story.'}));
 if(kind==='regionalTown')s.objects.push(obj('secret',24,9,'Search the concealed passage','secret','chest'));
 s.objects.push(obj('exit',14,22,'Leave town for the overworld','exit','arch',{auto:true}));s.objects.push(obj('welcome',13,21,'Read the town directory','sign','sign',{text:'Inn: northwest. Archive: northeast. Workshop: southeast. Provisioner: southwest. Use the map for directions.'}));
 const residents=spec.npcs.filter(n=>n.room===room);
 residents.forEach((n,i)=>s.objects.push(obj('resident-'+i,10+i*3,12,n.name,'talk','npc',{npc:n,patrol:[[10+i*3,12],[11+i*3,12],[11+i*3,13],[10+i*3,13]]})));
 for(const [x,y] of [[5,10],[23,10],[12,19],[24,19]])s.objects.push(obj('lamp-'+x+'-'+y,x,y,'Read the lantern plaque','sign','lamp',{text:'The town lanterns mark safe roads after dusk.'}));
 s.objects.push(obj('bench',10,8,'Rest on the square bench','sign','bench',{text:'A quiet moment beside the fountain. The inn can restore the party.'}));
 rect(s.tiles,19,19,6,1,'flower');rect(s.tiles,3,9,5,1,'flower');
 s.objects.push(obj('visitor',9,19,'Talk to the traveler','chat','npc',{text:ch===0?'The old bridge leads to the shrine. Watch for unopened chests along the roads.':'This town’s records matter to the guardian. Rest here before returning to the wilds.',patrol:[[9,19],[10,19],[11,19],[10,19]]}));
 for(let y=2;y<22;y++)for(let x=2;x<28;x++)if(s.tiles[y][x]==='grass'&&!s.objects.some(o=>Math.abs(o.x-x)+Math.abs(o.y-y)<2)&&!s.buildings.some(b=>x>=b.x-1&&x<=b.x+b.w&&y>=b.y-1&&y<=b.y+b.h+1)){if((x*7+y*13+ch)%31<4)s.tiles[y][x]='flower';else if(x<3||x>26)s.tiles[y][x]='tree'}
 return s;
}
function interiorScene(ch,room,spec){
 const garden=room==='garden';const s={w:garden?22:18,h:garden?18:14,name:room==='inn'?'Paper Lantern Inn':room==='workshop'?'Mara’s Letterpress':room==='archive'?'Hall of Remembered Names':garden?'Moonwell Garden':spec.rooms[Number(room)]||'Town Interior',tiles:base(garden?22:18,garden?18:14,!garden),objects:[],buildings:[],spawn:{x:garden?11:9,y:garden?15:11},indoor:!garden};
 if(garden){rect(s.tiles,5,3,12,6,'water');rect(s.tiles,10,3,2,7,'bridge');road(s.tiles,11,10,11,16);s.objects.push(obj('moonwell',11,4,'Examine the Moonwell','inspect:M','shrine'));s.objects.push(obj('ribbon',5,11,'Recover the Moonwell Ribbon','inspect:R','flower'));for(let y=11;y<15;y++)for(let x=3;x<18;x++)if((x+y)%3===0)s.tiles[y][x]='flower'}
 else{
  rect(s.tiles,2,2,s.w-4,2,'shelf');rect(s.tiles,5,5,8,2,'counter');rect(s.tiles,7,8,4,2,'rug');
  if(room==='inn'){rect(s.tiles,2,5,2,3,'bed');rect(s.tiles,14,5,2,3,'bed');s.objects.push(obj('rest',3,8,'Rest at the inn · 15G','rest','bed'));s.objects.push(obj('hearth',14,10,'Warm yourself by the hearth','sign','fire',{text:'The inn offers a safe place to rest. Use the bed to restore the whole party for 15 gold.'}))}
  if(kind==='willowTown'){
   if(room==='workshop')s.objects.push(obj('record',4,8,'Recover the Press Rubbing','inspect:F','scroll'));
   if(room==='archive'){s.objects.push(obj('record',4,8,'Recover the Archive Ledger','inspect:L','scroll'));s.objects.push(obj('register',13,9,'Examine the town register','inspect:C','seal'))}
  }else{s.objects.push(obj('record',4,8,'Recover '+spec.items[Number(room)],'evidence','scroll'));s.objects.push(obj('landmark',13,9,'Inspect the local landmark','landmark','seal'))}
 }
 if(kind==='regionalTown')s.objects.push(obj('secret',14,10,'Search the concealed passage','secret','chest'));
 const residents=spec.npcs.filter(n=>n.room===room);residents.forEach((n,i)=>s.objects.push(obj('resident-'+i,garden?14:9,garden?12:4,n.name,'talk','npc',{npc:n})));
 s.objects.push(obj('exit',s.spawn.x,s.h-2,'Return to the town square','back','door',{auto:true}));s.tiles[s.h-2][s.spawn.x]='road';return s;
}
function auxScene(which){const s={w:18,h:14,name:which==='inn'?'The Lantern Inn':'Provisioner & Forge',tiles:base(18,14,true),objects:[],buildings:[],spawn:{x:9,y:11},indoor:true};rect(s.tiles,2,2,14,2,'shelf');rect(s.tiles,5,5,8,2,'counter');rect(s.tiles,7,8,4,2,'rug');
 s.objects.push(obj('keeper',9,4,which==='inn'?'Ask the innkeeper':'Browse supplies and equipment',which==='inn'?'chat':'shop','npc',{text:'A bed and a warm meal restore the whole party for 15 gold.'}));
 if(which==='inn'){rect(s.tiles,2,5,2,3,'bed');rect(s.tiles,14,5,2,3,'bed');s.objects.push(obj('rest',3,8,'Rest · restore the party for 15G','rest','bed'))}else{s.objects.push(obj('goods',3,8,'Browse the provisioner’s stock','shop','chest'));s.objects.push(obj('forge',14,8,'Visit the runic forge','forge','anvil'))}
 s.objects.push(obj('exit',9,12,'Return outside','back','door',{auto:true}));s.tiles[12][9]='road';return s;}
function objective(){
 const st=bridge().stage();let id,text;
 if(!st.npc){id='N';text='1. Meet '+bridge().guideName()+'. They explain the missing word and your first task.'}
 else if(!st.puzzle){id='P';text='2. Restore the crossword seal. Solve its Across and Down clues to unlock the boss.'}
 else if(!st.boss){id='B';text='3. Defeat '+bridge().bossName()+'. Rest and buy supplies first if your HP is low.'}
 else{id='B';text=state().completed?'Story complete! Explore the towns or challenge the boss again.':'4. Return to the guardian’s gate to travel to the next chapter.'}
 let target=scene.world?scene.objects.find(o=>o.id===id):scene.objects.find(o=>o.action==='back'||o.action==='exit');
 if(!scene.world)text+=' You are '+(scene.indoor?'inside '+scene.name:'in town')+'; return '+(target?.action==='back'?'outside':'to the overworld')+' to continue. Town exploration is optional for this objective.';
 return {text,target};
}
function objectHelp(o){
 const a=o.action,st=bridge().stage();
 if(a==='N')return st.npc?'Guide · already met. Talk again for the chapter story.':'MAIN QUEST · talk here first to learn your objective.';
 if(a==='P')return st.puzzle?'COMPLETED · crossword seal restored.':!st.npc?'LOCKED · meet the guide first.':'MAIN QUEST · solve the crossword to unlock the boss.';
 if(a==='B')return st.boss?'NEXT CHAPTER · interact to continue.':!st.puzzle?'LOCKED BOSS · restore the crossword seal first.':'BOSS BATTLE · bring healing supplies.';
 if(a==='town')return 'TOWN · safe streets, residents, shops and an inn.';
 if(a==='M')return st.monster?'COMPLETED · guardian defeated.':'OPTIONAL BATTLE · earn experience and gold.';
 if(a==='D')return 'OPTIONAL DUNGEON · enemies, exploration and rewards.';
 if(a==='Q')return 'OPTIONAL STORY QUEST · help a local resident.';
 if(a==='H')return 'OPTIONAL SHRINE · word challenge and rewards.';
 if(a==='T'||a==='cache')return 'TREASURE · collect supplies or gold.';
 if(a==='S'||a==='shop'||a==='aux:shop')return 'SHOP · buy healing supplies and equipment.';
 if(a==='forge')return 'FORGE · improve equipment using gold and shards.';
 if(a==='rest'||a==='aux:inn'||a==='room:inn')return 'INN · restore the whole party for 15 gold.';
 if(a==='exit')return 'EXIT · return to the overworld and main quest.';
 if(a==='back')return 'EXIT · return outside.';
 if(a.startsWith('room:'))return 'ENTER BUILDING · residents and optional town discoveries.';
 if(a==='talk'||a==='chat')return 'PERSON · talk to hear their story or gather information.';
 if(a==='evidence'||a.startsWith('inspect:'))return 'DISCOVERY · examine or collect an item for the town story.';
 if(a==='secret')return 'SECRET · inspect for hidden rewards.';
 return 'EXAMINE · read about this object. Scenery without a label cannot be used.';
}
function guideToObjective(){if(blocked())return;const o=objective().target;if(!o)return;const pos=o.type==='npc'?npcPosition(o):o,p=pathTo(pos.x,pos.y);if(p===null){bridge().message('Open AREA MAP to choose another route.');return}route=p;routeTarget=null;updateContext();bridge().message('Following the gold route. At the destination, use INTERACT. Arrow keys cancel walking.');}
function shell(k){if(shells.has(k))return shells.get(k);const host=$(k),box=document.createElement('div');box.className='explore-shell';box.innerHTML='<div class="explore-heading"><div><small class="explore-region"></small><strong class="explore-place"></strong></div><div class="explore-tools"><button type="button" class="explore-run" aria-pressed="false">WALK</button><button type="button" class="explore-map-button">AREA MAP</button><button type="button" class="explore-menu">MENU</button></div></div><div class="explore-objective"><strong>YOUR NEXT STEP</strong><p class="explore-objective-text"></p><button type="button" class="explore-guide">WALK TO NEXT STEP</button></div><details class="explore-help"><summary>HOW TO READ THE MAP</summary><p>You are the character marked YOU. Gold marks your next main objective. Labeled people and objects can be used. Trees, walls and water block movement; use roads and bridges.</p><p>Move with arrow keys / WASD, the direction buttons, or click a destination. Stand beside a labeled object and press E / Space or INTERACT. AREA MAP lists destinations and what they do.</p><p>Guide → crossword seal → boss → next chapter. Town stories, shrines, treasure and ruins are optional. The inn heals your party; shops sell supplies.</p></details><canvas class="explore-canvas" width="768" height="480" tabindex="0" role="img" aria-label="Scrollable exploration map"></canvas><div class="explore-context" aria-live="polite"></div><div class="explore-mobile"><button data-explore-dir="0,-1" aria-label="Move north">▲</button><div><button data-explore-dir="-1,0" aria-label="Move west">◀</button><button class="explore-act">INTERACT</button><button data-explore-dir="1,0" aria-label="Move east">▶</button></div><button data-explore-dir="0,1" aria-label="Move south">▼</button></div><div class="explore-map-panel" hidden><h3>AREA MAP</h3><canvas class="explore-fullmap" width="352" height="240" aria-label="Area map"></canvas><div class="explore-destinations"></div><button class="explore-map-close" type="button">RETURN TO EXPLORATION</button></div>';
 host.insertBefore(box,host.firstChild);const canvas=box.querySelector('.explore-canvas'),mapPanel=box.querySelector('.explore-map-panel');const entry={box,canvas,ctx:canvas.getContext('2d'),mapPanel};entry.ctx.imageSmoothingEnabled=false;
 box.querySelector('.explore-guide').onclick=guideToObjective;
 box.querySelector('.explore-run').onclick=()=>{running=!running;const b=box.querySelector('.explore-run');b.textContent=running?'RUN':'WALK';b.setAttribute('aria-pressed',running?'true':'false')};box.querySelector('.explore-act').onclick=interact;
 for(const b of box.querySelectorAll('[data-explore-dir]')){b.addEventListener('pointerdown',e=>{e.preventDefault();if(b.setPointerCapture)b.setPointerCapture(e.pointerId);const [dx,dy]=b.dataset.exploreDir.split(',').map(Number);held={dx,dy};route=[];move(dx,dy)});for(const ev of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(ev,()=>{held=null})}
 box.querySelector('.explore-menu').onclick=()=>bridge().openMenu();box.querySelector('.explore-map-button').onclick=openMap;box.querySelector('.explore-map-close').onclick=()=>{mapPanel.hidden=true;canvas.focus()};
 canvas.addEventListener('pointerdown',e=>{if(!handles(k))return;const r=canvas.getBoundingClientRect(),x=Math.floor(((e.clientX-r.left)*canvas.width/r.width+camera.x)/T),y=Math.floor(((e.clientY-r.top)*canvas.height/r.height+camera.y)/T);routeTo(x,y)});
 shells.set(k,entry);return entry;}
function keyFor(room){return state().chapter+':'+kind+':'+String(room)+(aux?':'+aux:'')}
function remember(){if(!scene||!position)return;const e=progress();e.positions[scene.key]={x:position.x,y:position.y,facing:position.facing||2};e.rooms[state().chapter+':'+kind]=aux||null;bridge().save()}
function show(k){
 kind=k;const spec=k==='world'?null:bridge().townSpec(),room=k==='world'?'world':spec.room;aux=k==='world'?null:progress().rooms[state().chapter+':'+k]||null;if(!['inn','shop'].includes(aux))aux=null;
 const key=keyFor(room),same=scene?.key===key&&stateRef===state();stateRef=state();
 if(!same){scene=k==='world'?worldScene(state().chapter):aux?auxScene(aux):townScene(state().chapter,room);scene.key=key;scene.decorations=scene.indoor?[...[2,6,10,14].map(x=>({index:8,x:x*T,y:T,w:(x===14?2:3)*T,h:80,depth:4})),...[5,8,11].map(x=>({index:9,x:x*T,y:4*T,w:3*T,h:3*T,depth:7})),{index:15,x:7*T,y:8*T,w:4*T,h:2*T,depth:0}]:[];if(scene.indoor)for(const x of [2,14])if(scene.tiles[5]?.[x]==='bed')scene.decorations.push({index:10,x:x*T,y:5*T,w:2*T,h:3*T,depth:8});const p=progress().positions[key];position=p&&Number.isInteger(p.x)&&Number.isInteger(p.y)&&walkable(p.x,p.y,false)?{x:p.x,y:p.y,facing:[0,1,2,3].includes(p.facing)?p.facing:2}:{...scene.spawn,facing:0};route=[];routeTarget=null;animation=null;trail=[];savedCamera=false;renderCache.clear();lastMove=-Infinity}
 const sh=shell(k);const narrow=(window.innerWidth||1024)<650,w=Math.min(scene.w*T,narrow?384:768),h=Math.min(scene.h*T,narrow?320:480);if(sh.canvas.width!==w||sh.canvas.height!==h){sh.canvas.width=w;sh.canvas.height=h;sh.ctx.imageSmoothingEnabled=false;savedCamera=false}for(const [other,v] of shells)v.box.hidden=other!==k;sh.box.hidden=false;sh.box.querySelector('.explore-menu').hidden=k!=='world';$(k).classList.add('exploration-active');sh.box.querySelector('.explore-place').textContent=scene.name;sh.box.querySelector('.explore-region').textContent=k==='world'?'OVERWORLD · '+bridge().chapterName():bridge().chapterName()+' · '+(scene.indoor?'INTERIOR':'SETTLEMENT');
 if(!progress().visited.includes(scene.key))progress().visited.push(scene.key);draw(Date.now());updateContext();window.LexiconAudio?.sync();if(frameToken===null)frameToken=requestAnimationFrame(tick);
}
function onView(v){held=null;route=[];for(const [k,sh] of shells)sh.box.hidden=v!==k;if(!ids.includes(v)){if(frameToken!==null)cancelAnimationFrame(frameToken);frameToken=null;animation=null}}
function blocked(){return $('lqCinematic')?.hidden===false||$('dialogLog')?.hidden===false}
function handles(k=kind){return !!(scene&&kind===k&&bridge()?.screen()===k)}
function npcPosition(o){if(!o.patrol)return {x:o.x,y:o.y};const turn=Math.floor((state().steps||0)/4)%o.patrol.length,[x,y]=o.patrol[turn];return {x,y}}
function objectAt(x,y){return scene.objects.find(o=>{const p=o.type==='npc'?npcPosition(o):o;return p.x===x&&p.y===y})}
function walkable(x,y,people=true){const t=scene?.tiles[y]?.[x];if(!t||['water','mountain','tree','wall','building','shelf','counter','bed'].includes(t))return false;const o=people?objectAt(x,y):null;return !(o?.type==='npc')}
function nearest(){if(!scene||!position)return null;const ahead={x:position.x+D[position.facing||0][0],y:position.y+D[position.facing||0][1]};return objectAt(ahead.x,ahead.y)||objectAt(position.x,position.y)||scene.objects.find(o=>{const p=o.type==='npc'?npcPosition(o):o;return Math.abs(p.x-position.x)+Math.abs(p.y-position.y)===1})}
function updateContext(){if(!scene)return;const sh=shells.get(kind);if(!sh)return;const o=nearest(),goal=objective();sh.box.querySelector('.explore-objective-text').textContent=goal.text;sh.box.querySelector('.explore-guide').textContent=scene.world?'WALK TO NEXT STEP':'WALK TO EXIT';const text=o?o.label+' — '+objectHelp(o)+' Press E / Space or INTERACT.':route.length?'Following the marked path. Use a direction key to stop.':'Look for labeled places. WALK TO NEXT STEP helps you find the main quest.';sh.box.querySelector('.explore-context').textContent=text;sh.box.querySelector('.explore-act').textContent=o?'INTERACT: '+o.label:'INTERACT';sh.canvas.setAttribute('aria-label',scene.name+'. '+bridge().heroName()+' at '+position.x+', '+position.y+'. '+goal.text+' '+text);}

function move(dx,dy,fromRoute=false,now=Date.now()){
 if(!handles()||blocked()||!shells.get(kind).mapPanel.hidden)return false;
 if(Math.abs(dx)+Math.abs(dy)!==1)return false;if(now-lastMove<(running?80:135))return false;
 if(!fromRoute){route=[];routeTarget=null}position.facing=dx===1?1:dx===-1?3:dy===1?2:0;
 const nx=position.x+dx,ny=position.y+dy;if(!walkable(nx,ny)){updateContext();draw(now);return false}
 const start=visualPosition(now);animation={x:start.x,y:start.y,start:now,duration:running?80:135};trail.unshift({x:position.x,y:position.y});trail=trail.slice(0,10);position.x=nx;position.y=ny;lastMove=now;bridge().step(kind);remember();const o=objectAt(nx,ny);updateContext();draw(now);
 if(o?.auto){route=[];routeTarget=null;activate(o)}return true;
}
function pathTo(x,y){if(!scene.tiles[y]?.[x])return null;const target=objectAt(x,y);const goals=[];if(walkable(x,y))goals.push([x,y]);if(target)for(const [dx,dy] of D)if(walkable(x+dx,y+dy))goals.push([x+dx,y+dy]);const goalKeys=new Set(goals.map(p=>p.join(','))),queue=[[position.x,position.y]],parents=new Map([[queue[0].join(','),null]]);let reached=null;
 for(let i=0;i<queue.length;i++){const [cx,cy]=queue[i],key=cx+','+cy;if(goalKeys.has(key)){reached=key;break}for(const [dx,dy] of D){const xx=cx+dx,yy=cy+dy,k=xx+','+yy;if(!parents.has(k)&&walkable(xx,yy)){parents.set(k,key);queue.push([xx,yy])}}}
 if(!reached)return null;const path=[];while(parents.get(reached)!==null){path.unshift(reached.split(',').map(Number));reached=parents.get(reached)}return path;
}
function routeTo(x,y){if(!handles()||blocked())return false;const p=pathTo(x,y);if(p===null){bridge().message('No walkable route reaches that point.');return false}route=p;routeTarget=objectAt(x,y)||null;if(!route.length&&routeTarget)activate(routeTarget);updateContext();return true}
function interact(){if(!handles()||blocked()||!shells.get(kind).mapPanel.hidden)return;const o=nearest();if(o){route=[];routeTarget=null;activate(o)}else bridge().message('There is nothing to interact with here. Face a person, door, sign, or treasure.')}
function activate(o){
 const action=o.action;if(action==='sign'){bridge().message(o.text);return}if(action==='chat'){bridge().chat(o.label.replace(/^Talk to /,''),o.text,kind);return}
 if(action==='cache'){const e=progress(),key=scene.key+':'+o.id;if(e.opened.includes(key)){bridge().message('The cache is empty. Its supplies are already in your pack.');return}e.opened.push(key);bridge().cache(o.reward);draw(Date.now());return}
 if(action==='town'){remember();bridge().enterTown();return}
 if(action==='exit'){remember();bridge().exitTown();return}
 if(action==='back'){remember();if(aux){aux=null;progress().rooms[state().chapter+':'+kind]=null;show(kind)}else bridge().room(kind,kind==='willowTown'?'square':0);return}
 if(action.startsWith('room:')){remember();aux=null;progress().rooms[state().chapter+':'+kind]=null;bridge().room(kind,action.slice(5));return}
 if(action.startsWith('aux:')){remember();progress().rooms[state().chapter+':'+kind]=action.slice(4);show(kind);return}
 if(action==='secret'){bridge().secret();return}if(action==='rest'){bridge().rest(kind);return}if(action==='shop'){bridge().shop(kind);return}if(action==='forge'){bridge().forge(kind);return}
 if(kind==='world'){bridge().worldEvent(action);return}
 if(action==='talk'){bridge().townTalk(kind,o.npc);return}
 if(action==='evidence'){bridge().evidence();return}if(action==='landmark'){bridge().landmark();return}
 if(action.startsWith('inspect:'))bridge().inspect(action.slice(8));
}
function visualPosition(now){if(state().production?.visualFx===false||window.matchMedia('(prefers-reduced-motion: reduce)').matches)animation=null;if(!animation)return {x:position.x,y:position.y};const p=Math.max(0,Math.min(1,(now-animation.start)/animation.duration));if(p>=1){animation=null;return {x:position.x,y:position.y}}return {x:animation.x+(position.x-animation.x)*p,y:animation.y+(position.y-animation.y)*p}}
function tick(){frameToken=null;if(!handles()||document.hidden)return;const now=Date.now();if(blocked()){held=null;route=[];routeTarget=null}if(!blocked()&&shells.get(kind).mapPanel.hidden){if(held)move(held.dx,held.dy,false,now);else if(route.length&&now-lastMove>=135){const [x,y]=route[0];if(move(x-position.x,y-position.y,true,now))route.shift();else if(walkable(x,y))lastMove=now;else{route=[];routeTarget=null}}else if(!route.length&&routeTarget){const target=routeTarget;routeTarget=null;if(nearest()?.id===target.id)activate(target)}if(now-lastFrame>=33){draw(now);lastFrame=now}}frameToken=requestAnimationFrame(tick)}
function tileCanvas(type,ch,variant){if(art.interiors&&['shelf','counter','bed','rug'].includes(type))type='wood';const key=type+':'+ch+':'+variant%4;if(renderCache.has(key))return renderCache.get(key);const cv=document.createElement('canvas');cv.width=T;cv.height=T;const c=cv.getContext('2d'),theme=themes[ch];const r=(x,y,w,h,color)=>{c.fillStyle=color;c.fillRect(x,y,w,h)};
 r(0,0,32,32,theme.grass);
 if(type==='grass'||type==='flower'){for(let i=0;i<4;i++){const x=(i*11+variant*7)%31,y=(i*7+variant*5)%31;r(x,y,1,2,i%3?theme.deep:'#bed19666')}if(type==='flower')for(const [x,y] of [[8,9],[21,22],[25,7]]){r(x,y+2,1,3,theme.deep);r(x-1,y,3,2,ch===6?'#e4ebef':ch===2?'#efc47f':'#dda6bb');r(x,y,1,1,'#f3dc9b')}}
 else if(type==='road'&&scene.world){r(0,0,32,32,'#a79c7b');for(let i=0;i<5;i++){const x=(i*13+variant*7)%29,y=(i*9+variant*3)%30;r(x,y,3,1,i%2?'#bbae8c':'#8d896d')}r(0,0,1,32,'#9b9575')}
 else if(type==='road'||type==='stone'){r(0,0,32,32,type==='stone'?theme.stone:'#b19d7d');for(let y=0;y<32;y+=8)for(let x=-((y/8)%2)*8;x<32;x+=16){r(x,y,15,7,type==='stone'?'#83949b':'#998f7d');r(x+1,y,13,1,type==='stone'?'#c3c8c0':'#c8b698');r(x+1,y+6,13,1,'#5a665533')}}
 else if(type==='water'){r(0,0,32,32,theme.water);r(0,8,32,3,'#d2e4e022');r(5,9,12,1,'#d3eee955');r(16,23,14,1,'#bedce844');r(2,29,6,1,'#08182744')}
 else if(type==='bridge'){r(0,0,32,32,theme.water);r(0,3,32,26,'#81694c');for(let x=0;x<32;x+=8){r(x,5,7,22,'#b2956c');r(x,5,6,1,'#e2c69c')}r(0,2,32,3,'#483f3a');r(0,28,32,3,'#493d35')}
 else if(type==='wood'||type==='rug'){r(0,0,32,32,'#8c6d50');for(let x=0;x<32;x+=8){r(x,0,7,32,'#a4825d');r(x+1,0,1,32,'#b6956c');r(x+6,0,1,32,'#6a503c')}if(type==='rug'){r(0,0,32,32,'#664468');r(0,2,32,2,'#c0a077');r(0,28,32,2,'#c0a077');r(5,9,22,13,'#896078')}}
 else if(type==='wall'||type==='mountain'){r(0,0,32,32,type==='mountain'?'#687575':theme.deep);for(let y=0;y<32;y+=8)for(let x=-((y/8)%2)*8;x<32;x+=16){r(x,y,15,7,type==='mountain'?'#82908a':'#63727b');r(x+1,y,13,1,'#c2c5b144');r(x,y+6,15,1,'#14232c66')}}
 else if(type==='building'){r(0,0,32,32,theme.grass)}
 else if(type==='tree'){r(0,0,32,32,theme.grass)}
 else if(type==='counter'){r(0,4,32,24,'#594334');r(0,3,32,16,'#b18a5c');r(0,3,32,2,'#dec08c');r(0,19,32,2,'#372b27')}
 else if(type==='shelf'){r(0,0,32,32,'#533e34');for(let y=3;y<30;y+=12){for(let x=2;x<30;x+=5)r(x,y,4,9,['#9680a2','#779588','#a37d65','#c6ad78'][(x+variant)%4]);r(0,y+9,32,3,'#bea17b')}}
 else if(type==='bed'){r(3,0,26,32,'#58443c');r(5,3,22,8,'#e5decb');r(5,12,22,18,ch===6?'#8da5b3':'#678999');r(7,13,18,2,'#afc4c1')}
 renderCache.set(key,cv);return cv;
}
function sprite(name,frame=0){const key=name+':'+frame;if(!spriteCache.has(key))spriteCache.set(key,window.LexiconPixelArt?.bitmap(name,{animated:false,frame})||tileCanvas('flower',state().chapter,0));return spriteCache.get(key)}
function drawBuilding(c,b,cx,cy,ch){const x=b.x*T-cx,y=b.y*T-cy,w=b.w*T,h=b.h*T,t={...themes[ch],roof:({inn:'#805b53',archive:'#5b7080',workshop:'#75546c',shop:'#56766c'})[b.style]||themes[ch].roof};const r=(xx,yy,ww,hh,col)=>{c.fillStyle=col;c.fillRect(Math.round(xx),Math.round(yy),ww,hh)};
 if(art.props){const ix=({inn:0,archive:1,workshop:2,shop:3,town:0,gate:1})[b.style]??0,aw=w+16,ah=h+64,doorCenter=x+Math.floor(b.w/2)*T+16;c.fillStyle='#06121f33';c.fillRect(x+10,y+h-8,w-5,30);prop(c,ix,doorCenter-aw/2,y-32,aw,ah);c.fillStyle='#10232bd9';c.fillRect(doorCenter-70,y+h+16,140,15);c.fillStyle='#efd7a5';c.font='10px Georgia';c.textAlign='center';c.fillText(b.name,doorCenter,y+h+27);return}
 r(x+7,y+h-2,w,h+12,'#06121f55');r(x+8,y+T*1.2,w-16,h-T*1.2,'#d1c09c');r(x+8,y+h-10,w-16,10,'#6e6255');
 for(let xx=18;xx<w-25;xx+=38){r(x+xx,y+h-42,22,24,'#4d4b4c');r(x+xx+3,y+h-39,16,17,day===1?'#d3ae69':'#91aaba');r(x+xx+10,y+h-39,2,18,'#695746');r(x+xx+3,y+h-31,16,2,'#695746')}
 for(let xx=12;xx<w-12;xx+=48)r(x+xx,y+T*1.2,4,h-T*1.2,'#8c7258');r(x+8,y+h-47,w-16,3,'#927958');
 const roofH=Math.round(h*.62);for(let yy=0;yy<roofH;yy+=4){const inset=Math.max(0,(roofH-yy)*.26);r(x-7+inset,y+yy,w+14-inset*2,5,yy%8===0?t.roof:'#4f465e');for(let xx=0;xx<w;xx+=16)r(x+xx+(yy%8?7:0),y+yy+2,12,1,'#b79da033')}
 r(x-8,y+roofH,w+16,5,'#332f3f');r(x-8,y+roofH+5,w+16,2,'#b99d88');r(x+w-35,y-6,16,25,'#b9b3a0');r(x+w-37,y-9,20,5,'#6e7473');
 if(b.style==='archive'||b.style==='gate'){r(x+w/2-10,y-17,20,24,'#d0c19b');r(x+w/2-4,y-11,8,10,'#675578')}
 const doorX=x+Math.floor(b.w/2)*T;r(doorX+4,y+h-5,24,17,'#2a323b');r(doorX+7,y+h-3,18,17,'#896a4a');r(doorX+21,y+h+4,2,2,'#edcc7f');
 c.font='10px Georgia';c.textAlign='center';c.fillStyle='#efd7a5';c.fillText(b.name,x+w/2,y+h-19);
}
function drawObject(c,o,cx,cy,now){const p=o.type==='npc'?npcPosition(o):o,x=p.x*T-cx,y=p.y*T-cy,ch=state().chapter,theme=themes[ch],s=state(),stage=bridge().stage();const r=(xx,yy,w,h,color)=>{c.fillStyle=color;c.fillRect(Math.round(x+xx),Math.round(y+yy),w,h)};
 if(o.type==='door')return;
 if(o.type==='fire'&&indoorProp(c,11,x-8,y-18,48,50))return;if(o.id==='register'&&indoorProp(c,13,x-8,y-16,48,48))return;if(o.id==='record'&&scene.indoor&&indoorProp(c,scene.name.includes('Letterpress')?12:13,x-8,y-20,48,52))return;
 const pi=({fountain:8,arch:9,ruin:9,seal:10,shrine:10,chest:11,lamp:12,bench:13,anvil:14,flower:15})[o.type];const chestOpen=o.type==='chest'&&(o.id==='T'?stage.chest:progress().opened.includes(scene.key+':'+o.id));if(pi!==undefined&&!chestOpen&&art.props){const wide=o.type==='bench'?48:o.type==='fountain'?48:36,high=['arch','ruin','shrine','seal'].includes(o.type)?48:o.type==='lamp'?50:36;prop(c,pi,x+(32-wide)/2,y+32-high,wide,high);return}
 if(o.type==='guardian'&&!stage.boss&&art.bosses){const im=art.bosses,w=im.naturalWidth/4,h=im.naturalHeight/2;c.drawImage(im,(ch%4)*w,Math.floor(ch/4)*h,w,h,x-12,y-30,56,60);return}
 if(o.type==='enemy'&&!stage.monster&&art.enemies){const im=art.enemies,w=im.naturalWidth/4,h=im.naturalHeight/2;c.drawImage(im,(ch%4)*w,Math.floor(ch/4)*h,w,h,x-4,y-10,40,44);return}
 if(o.type==='lamp'){r(14,7,4,24,'#52616c');r(9,1,14,4,'#465461');r(10,5,12,8,day===1?'#f1cc7d':'#bfc9b4');r(14,4,3,10,'#54636a');r(10,13,12,3,'#58666a');r(10,29,12,3,'#51616b');return}
 if(o.type==='bench'){r(1,11,30,3,'#b79b6e');r(1,16,30,3,'#b79b6e');r(0,22,32,4,'#997c57');r(3,25,4,6,'#475c63');r(25,25,4,6,'#475c63');return}
 if(o.type==='npc'){if(art.interiors){const name=o.npc?.name||o.label,ix=/Edda|innkeeper/i.test(name)?1:/Mara|Iris|Lyra|Sera/i.test(name)?3:/Master Orin|smith|forge/i.test(name)?2:/Keeper Orin|Mael|Nox|Keeper/i.test(name)?0:/Pip|courier|traveler/i.test(name)?4:/Aeris|captain/i.test(name)?6:o.id==='N'?0:ch===4?5:ch===6?7:ch===3?4:ch===5?6:ch===2?2:0;indoorProp(c,ix,x-2,y-18,36,48);return}c.drawImage(sprite(o.id==='N'?'npc':'resident'+['Glass','Forge','Tide','Sand','Sky','Frost','Library'][Math.max(0,ch-1)]),Math.round(x),Math.round(y-9),32,38);return}
 if(o.type==='chest'){const open=o.id==='T'?stage.chest:progress().opened.includes(scene.key+':'+o.id);r(5,12,24,17,'#523f32');r(6,11,22,10,open?'#302b2b':'#b08c55');r(6,20,22,3,'#d5b574');r(15,17,4,7,open?'#3d3d3d':'#e8d095');return}
 if(o.type==='fountain'){r(0,16,32,15,'#677b83');r(3,13,26,14,'#afbcb2');r(6,16,20,8,'#5596ac');r(13,1,6,20,'#c5c8b7');r(8,1,16,4,'#dfe0c6');r(10,15,12,2,'#cae9ea');return}
 if(o.type==='arch'||o.type==='ruin'){r(3,0,6,32,theme.stone);r(23,0,6,32,theme.stone);r(3,0,26,6,'#c8c5ac');r(9,7,14,24,'#172732');return}
 if(o.type==='guardian'){c.drawImage(sprite(stage.boss?'shrine':'boss'),Math.round(x-5),Math.round(y-14),42,46);return}
 if(o.type==='enemy'){if(!stage.monster)c.drawImage(sprite(['slime','wraith','wolf','beetle'][ch%4]),Math.round(x),Math.round(y-4),32,32);return}
 if(o.type==='seal'||o.type==='shrine'){c.drawImage(sprite(o.type==='seal'?'rune':'shrine'),Math.round(x),Math.round(y-7),32,38);return}
 if(o.type==='shop'){c.drawImage(sprite('shop'),Math.round(x-7),Math.round(y-12),46,46);return}
 if(o.type==='town'){return}
 if(o.type==='flower'){r(8,8,17,15,'#588768');r(9,8,4,4,'#d4a1b6');r(19,13,4,4,'#efcab5');return}
 if(o.type==='scroll'){r(6,7,23,18,'#e1d1ae');r(4,5,23,4,'#bfa174');r(9,26,22,4,'#bfa174');r(10,13,13,1,'#85795f');r(10,18,9,1,'#85795f');return}
 if(o.type==='bed'){r(7,2,19,26,'#88715b');r(8,4,17,6,'#eadfc4');r(8,11,17,15,'#739599');return}
 if(o.type==='anvil'){r(2,7,28,7,'#afbdc3');r(12,14,8,11,'#647b91');r(6,25,20,5,'#40556a');return}
 if(o.type==='fire'){r(3,2,27,29,'#69747a');r(7,9,19,19,'#26323b');r(10,17,12,10,'#df9252');r(13,14,6,10,'#f7d384');return}
 r(14,14,4,17,'#785c43');r(3,3,26,17,'#ae9063');r(5,5,22,13,'#c6ac7e');r(7,9,17,1,'#68553e');r(7,13,12,1,'#68553e');
}
function draw(now){if(!scene||!position||!handles())return;const sh=shells.get(kind),cv=sh.canvas,c=sh.ctx,ch=state().chapter,p=visualPosition(now),desiredX=Math.max(0,Math.min(scene.w*T-cv.width,p.x*T-cv.width/2+T/2)),desiredY=Math.max(0,Math.min(scene.h*T-cv.height,p.y*T-cv.height/2+T/2));if(!savedCamera||state().production?.visualFx===false||window.matchMedia('(prefers-reduced-motion: reduce)').matches){camera={x:desiredX,y:desiredY};savedCamera=true}else{camera.x+=(desiredX-camera.x)*.2;camera.y+=(desiredY-camera.y)*.2}camera.x=Math.max(0,camera.x);camera.y=Math.max(0,camera.y);const cx=Math.round(camera.x),cy=Math.round(camera.y);c.clearRect(0,0,cv.width,cv.height);c.fillStyle='#0b1925';c.fillRect(0,0,cv.width,cv.height);
 for(let y=Math.floor(cy/T);y<Math.min(scene.h,Math.ceil((cy+cv.height)/T)+1);y++)for(let x=Math.floor(cx/T);x<Math.min(scene.w,Math.ceil((cx+cv.width)/T)+1);x++)c.drawImage(tileCanvas(scene.tiles[y][x],ch,x+y*3),x*T-cx,y*T-cy);
 const drawTree=(x,y)=>{const px=x*T-cx,py=y*T-cy,t=themes[ch];if(prop(c,ch===6?6:ch===7?7:ch===0||ch===3?4:5,px-10,py-36,52,70))return;const r=(xx,yy,w,h,col)=>{c.fillStyle=col;c.fillRect(px+xx,py+yy,w,h)};r(-4,22,41,9,'#0d282844');r(12,7,9,27,'#594c3e');r(15,13,3,20,'#8f7754');r(8,27,7,5,'#67523e');r(19,27,6,5,'#67523e');
 const crown=(xx,yy,w,h,col)=>{r(xx+6,yy,w-12,h,col);r(xx+2,yy+4,w-4,h-8,col);r(xx,yy+9,w,h-18,col)};
 crown(-6,-7,44,35,t.deep);crown(-5,-15,42,33,t.leaf);crown(2,-22,30,29,ch===6?'#d4e2df':'#578266');crown(6,-24,21,17,ch===6?'#edf2e9':'#6e9973');r(0,3,11,3,'#719575');r(5,-9,7,3,ch===6?'#eef4ef':'#89a783');r(25,-1,6,4,'#456c55');r(16,-16,5,2,ch===6?'#fff9e6':'#a0b28b')};
 const layers=[];for(let y=0;y<scene.h;y++)for(let x=0;x<scene.w;x++)if(scene.tiles[y][x]==='tree'&&x*T>cx-50&&x*T<cx+cv.width+50&&y*T>cy-50&&y*T<cy+cv.height+50)layers.push({y:y+1,fn:()=>drawTree(x,y)});
 for(const deco of scene.decorations||[])if(art.interiors)layers.push({y:deco.depth,fn:()=>indoorProp(c,deco.index,deco.x-cx,deco.y-cy,deco.w,deco.h)});
 for(const b of scene.buildings)layers.push({y:b.y+b.h,fn:()=>drawBuilding(c,b,cx,cy,ch)});
 for(const o of scene.objects)layers.push({y:(o.type==='npc'?npcPosition(o):o).y+1,fn:()=>drawObject(c,o,cx,cy,now)});
 state().party.slice(1,3).forEach((member,i)=>{const f=trail[(i+1)*2-1];if(f)layers.push({y:f.y+1,fn:()=>{c.fillStyle='#09172555';c.fillRect(f.x*T-cx+7,f.y*T-cy+24,21,6);if(!person(c,member,f.x*T-cx,f.y*T-cy,position.facing,now,!!animation))c.drawImage(sprite(member==='Mira'?'mira':'bram',animation?Math.floor(now/100)%2:0),f.x*T-cx,f.y*T-cy-8,32,38)}})});
 layers.push({y:p.y+1,fn:()=>{c.fillStyle='#09172555';c.fillRect(Math.round(p.x*T-cx+7),Math.round(p.y*T-cy+24),21,6);if(!person(c,'hero',p.x*T-cx,p.y*T-cy,position.facing,now,!!animation)){c.drawImage(sprite('hero',animation?Math.floor(now/100)%2:0),Math.round(p.x*T-cx),Math.round(p.y*T-cy-8),32,38);if(position.facing===0){c.fillStyle='#443134';c.fillRect(Math.round(p.x*T-cx+12),Math.round(p.y*T-cy-3),10,13)}}}});
 layers.sort((a,b)=>a.y-b.y).forEach(l=>l.fn());
 if(scene.indoor){c.fillStyle='#32213e1a';c.fillRect(0,0,cv.width,cv.height)}else{day=Math.floor((state().steps||0)/160)%2;if(day===1){c.fillStyle='#0d1c3f28';c.fillRect(0,0,cv.width,cv.height)}}
 if(!scene.indoor&&state().production?.visualFx!==false&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches){c.fillStyle=ch===2?'#ffc57a66':ch===6?'#eef5fa99':'#d6edba55';for(let i=0;i<16;i++){const fx=((i*137+now/(ch===6?65:140))%cv.width),fy=((i*71+(ch===2?-now/90:now/160))%cv.height+cv.height)%cv.height;c.fillRect(Math.floor(fx),Math.floor(fy),ch===6?2:1,2)}c.fillStyle='#c7e5ee44';for(let y=Math.floor(cy/T);y<Math.min(scene.h,Math.ceil((cy+cv.height)/T));y++)for(let x=Math.floor(cx/T);x<Math.min(scene.w,Math.ceil((cx+cv.width)/T));x++)if(scene.tiles[y][x]==='water'&&(x+y)%3===0)c.fillRect(x*T-cx+((Math.floor(now/160)+y*5)%20),y*T-cy+15,8,1)}
 const n=nearest();if(n){const np=n.type==='npc'?npcPosition(n):n;c.strokeStyle='#f1d594';c.lineWidth=1;c.strokeRect(np.x*T-cx+1,np.y*T-cy+1,30,30)}
 if(route.length){c.fillStyle='#ebd6a888';for(const [x,y] of route.slice(0,12))c.fillRect(x*T-cx+14,y*T-cy+14,4,4)}
 // Persistent object names and a visible route make the world readable.
 const goal=objective().target;c.font='bold 11px system-ui';c.textAlign='center';
 for(const [rx,ry] of route){c.fillStyle='#ffe19b';c.fillRect(rx*T-cx+13,ry*T-cy+13,6,6)}
 for(const o of scene.objects){if(['lamp','bench'].includes(o.type))continue;const op=o.type==='npc'?npcPosition(o):o,x=op.x*T-cx+16,y=op.y*T-cy-22;if(x<0||x>cv.width||y<28||y>cv.height-12)continue;const text=(o===goal?'★ ':'')+o.label,w=Math.min(260,text.length*6+12);c.fillStyle=o===goal?'#5a4515ee':'#081321e8';c.fillRect(x-w/2,y-12,w,18);c.fillStyle=o===goal?'#ffe49d':'#ffffff';c.fillText(text,x,y,250)}
 c.fillStyle='#091827ee';c.fillRect(p.x*T-cx-1,p.y*T-cy-36,36,16);c.fillStyle='#ffffff';c.fillText('YOU',p.x*T-cx+17,p.y*T-cy-24);
 // Readable minimap: terrain, landmark dots, and the party marker.
 const mw=scene.w*2,mh=scene.h*2,mx=cv.width-mw-12,my=12;c.fillStyle='#071321dd';c.fillRect(mx-4,my-4,mw+8,mh+8);drawMini(c,mx,my,2);c.fillStyle='#e0c38b';c.font='10px system-ui';c.textAlign='left';c.fillText(scene.indoor?'INTERIOR':day?'DUSK':'DAYLIGHT',12,20);
}
function drawMini(c,x,y,scale){for(let yy=0;yy<scene.h;yy++)for(let xx=0;xx<scene.w;xx++){const t=scene.tiles[yy][xx];c.fillStyle=t==='water'?'#416885':['building','wall','mountain','tree'].includes(t)?'#52616a':['road','bridge'].includes(t)?'#baa77d':'#729474';c.fillRect(x+xx*scale,y+yy*scale,scale,scale)}for(const o of scene.objects){c.fillStyle=o.type==='npc'?'#c1cbe2':o.type==='enemy'?'#d68776':'#e9c989';c.fillRect(x+o.x*scale,y+o.y*scale,scale,scale)}c.fillStyle='#ffffff';c.fillRect(x+position.x*scale-1,y+position.y*scale-1,scale+2,scale+2)}
function openMap(){if(!handles())return;held=null;route=[];routeTarget=null;const sh=shells.get(kind);sh.mapPanel.hidden=false;const cv=sh.box.querySelector('.explore-fullmap');cv.width=scene.w*8;cv.height=scene.h*8;drawMini(cv.getContext('2d'),0,0,8);const dest=sh.box.querySelector('.explore-destinations');dest.replaceChildren();for(const o of scene.objects.filter(o=>!['chat','back','sign'].includes(o.action))){const b=document.createElement('button');b.type='button';b.textContent=(o===objective().target?'★ NEXT STEP · ':'')+o.label+' — '+objectHelp(o);b.onclick=()=>{sh.mapPanel.hidden=true;routeTo(o.x,o.y);sh.canvas.focus()};dest.append(b)}sh.box.querySelector('.explore-map-close').focus()}
window.addEventListener('keydown',e=>{if(!handles()||['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName))return;const sh=shells.get(kind);if(!sh.mapPanel.hidden){if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();sh.mapPanel.hidden=true;sh.canvas.focus()}else if(e.key==='Tab'){const controls=[...sh.mapPanel.querySelectorAll('button')];const i=controls.indexOf(document.activeElement),next=e.shiftKey?(i<=0?controls.length-1:i-1):(i+1)%controls.length;e.preventDefault();e.stopImmediatePropagation();controls[next]?.focus()}else if(!['Enter',' '].includes(e.key)){e.preventDefault();e.stopImmediatePropagation()}return}const dir={ArrowUp:[0,-1],ArrowRight:[1,0],ArrowDown:[0,1],ArrowLeft:[-1,0],w:[0,-1],W:[0,-1],d:[1,0],D:[1,0],s:[0,1],S:[0,1],a:[-1,0],A:[-1,0]}[e.key];if(dir){e.preventDefault();e.stopImmediatePropagation();running=e.shiftKey;held={dx:dir[0],dy:dir[1]};if(!e.repeat){route=[];move(...dir)}return}if(e.key==='Shift')running=true;if(e.key==='g'||e.key==='G'){e.preventDefault();e.stopImmediatePropagation();openMap()}},true);
window.addEventListener('keyup',e=>{if(e.key==='Shift')running=false;const map={ArrowUp:[0,-1],w:[0,-1],W:[0,-1],ArrowRight:[1,0],d:[1,0],D:[1,0],ArrowDown:[0,1],s:[0,1],S:[0,1],ArrowLeft:[-1,0],a:[-1,0],A:[-1,0]};const dir=map[e.key];if(dir&&held&&dir[0]===held.dx&&dir[1]===held.dy)held=null});
window.addEventListener('resize',()=>{if(handles())show(kind)});
window.addEventListener('blur',()=>{held=null;route=[]});document.addEventListener('visibilitychange',()=>{held=null;route=[];if(document.hidden&&frameToken!==null){cancelAnimationFrame(frameToken);frameToken=null}else if(handles()&&frameToken===null)frameToken=requestAnimationFrame(tick)});
window.LexiconExplore={objective,objectHelp,guideToObjective,show,onView,handles,move,interact,routeTo,openMap,draw,get scene(){return scene},get position(){return position},get route(){return route},pathTo,activate,walkable,remember,inspect(){return {key:scene?.key,width:scene?.w,height:scene?.h,position:{...position},objects:scene?.objects.map(o=>({id:o.id,x:o.x,y:o.y,label:o.label,action:o.action}))}}};
})();
