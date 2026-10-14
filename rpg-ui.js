(()=>{
'use strict';
const {Game,fresh,regions,dungeonNames,weapons,weaponTraits,skills,mastery,skillRank,validSave,centers}=LQ;
const Art=typeof LQEnvironmentArt!=='undefined'?LQEnvironmentArt:{tile:()=>false,prop:()=>{},service:(c,x,y,o)=>objectArt(c,x,y,o)};
const SceneArt=typeof LQWillowmereArt!=='undefined'?LQWillowmereArt:null;
const compactMap=()=>typeof matchMedia==='function'&&matchMedia('(max-width:700px)').matches;
const Interiors=LQInteriors;
const Citizens=typeof LQTownsfolk!=='undefined'?LQTownsfolk:null;
const BattleUX=typeof LQBattleUI!=='undefined'?LQBattleUI:null;
const app=document.getElementById('app'),esc=s=>String(LQ.cleanLore?LQ.cleanLore(s):s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let game=null,modal=null,slot=0,chosen='attack',target=0,route=[],walking=null,routeTarget=null,saveError='',titleNotice='',hoverTile=null,interior=null,interiorTimer=null,interiorRoute=[],interiorMessage='',citizens=null,citizenRegion=-1,chatAfterWalk=null,battleReport=null;
const audio=new Audio();audio.loop=true;audio.volume=.24;let track='';
const partyArt=typeof Image==='function'?new Image():null,worldArt=typeof Image==='function'?new Image():null,citizenArt=typeof Image==='function'?new Image():null;
let ambientTick=0,holdDirection=null,holdDelay=null,holdRepeat=null,blockMoveClickUntil=0;
setInterval(()=>{ambientTick=(ambientTick+1)%10000;if(game&&!modal&&!game.battle){if(game.s.place==='town'&&!interior&&Citizens){ensureCitizens();Citizens.tick(citizens,game.s);}interior?drawInterior():drawMap();}},240);
if(partyArt){partyArt.onload=()=>{if(game&&!game.battle)drawMap();};partyArt.src='assets/art/party-sprites.png';}
if(worldArt){worldArt.onload=()=>{if(game&&!game.battle)drawMap();};worldArt.src='assets/art/world-sprites.png';}
if(citizenArt){citizenArt.onload=()=>{if(game&&!game.battle)(interior?drawInterior():drawMap());};citizenArt.src='assets/art/townsfolk-sprites.png';}
const themes=[['#60814b','#365735','#8ba95f'],['#637b82','#40575e','#a1b2b0'],['#795342','#513b32','#b78450'],['#527a78','#305051','#93b6a3'],['#b79758','#7b6843','#d6b97a'],['#718b82','#496e6c','#b4c8a8'],['#a3b7b1','#69898c','#d8e3d3'],['#817b93','#504b67','#b7a1bf']];
function button(label,action,extra='',cls=''){return '<button class="'+cls+'" data-action="'+action+'" '+extra+'>'+label+'</button>';}
function header(){return '<header class="topbar"><div><div class="brand"><span>✦</span> Lexicon Quest</div><small>THE REFORGED REALMS · CLASSIC FANTASY RPG</small></div><div class="row">'+button(game?.s.music?'♫ Music on':'♫ Music off','music')+(game?(game.battle?button('Combat guide','battleHelp'):button('Field menu','menu')):'')+'</div></header>';}
function store(){if(!game||game.battle)return;try{localStorage.setItem('lexicon-realms-v3-'+slot,JSON.stringify(game.s));saveError='';}catch(e){saveError='Autosave unavailable. Open Field menu and export your save.';}}
function load(n){try{const s=JSON.parse(localStorage.getItem('lexicon-realms-v3-'+n));return validSave(s)?s:null;}catch{return null;}}
function music(){if(!game?.s.music){audio.pause();return;}const name=game.battle?(game.battle.boss?'boss':'battle'):game.s.place==='town'?'town':'region-1';if(track!==name){track=name;audio.src='assets/audio/'+name+'.mp3';}audio.play().catch(()=>{});}
function title(){stopInteriorWalk();interior=null;citizens=null;citizenRegion=-1;chatAfterWalk=null;game=null;modal=null;audio.pause();app.innerHTML=header()+'<main class="titlepage"><div><div class="eyebrow">Chapter I · The Missing Name</div><h1>Take the road.<br><span class="gold">Find your story.</span></h1><p>Eight connected realms. Three companions. Lost relics, epic battles, and dungeons filled with secrets.</p><div class="title-actions"><label for="hero">Your hero’s name</label><input id="hero" maxlength="20" value="Scott" autocomplete="given-name">'+button('Begin a new adventure →','start','','primary')+Array.from({length:3},(_,i)=>{const s=load(i);return s?button('Continue '+esc(s.name)+' · Lv '+s.party[0].level+' · Slot '+(i+1),'load','data-id="'+i+'"'):'';}).join('')+button('How this adventure works','help')+button('Import a new-edition save','importTitle')+'</div><p class="notice">'+esc(titleNotice)+'</p><small>Existing chronicles are supported. Every road leads to another story.</small></div><div class="titleart"><div class="panel"><div class="eyebrow">Your first destination</div><h2>Willowmere</h2><small>Speak to Elder Mael. Leave through the south gate.<br>Follow the road to the Rootbound Archive.</small></div></div></main>';}
function partyHTML(p,active=false){return '<div class="partycard"><div class="portrait" style="background-position:'+(p.id*100/3)+'% 0"></div><div><div class="row between"><b>'+esc(p.name)+'</b><small>Lv '+p.level+'</small></div><div class="bar"><i style="width:'+Math.max(0,p.hp/p.maxhp*100)+'%"></i></div><div class="row between"><small>HP '+p.hp+'/'+p.maxhp+'</small><small>MP '+p.mp+'/'+p.maxmp+'</small></div><div class="bar mp"><i style="width:'+p.mp/p.maxmp*100+'%"></i></div><small>'+weapons[p.weapon].name+' · mastery '+mastery(p)+'</small></div></div>';}
const townGuideTypes=new Set(['inn','shop','forge','board','npc','resident','hollowResident','emberWitness','valewynWitness','exit','bell','hollowFountain','coolantStation','civicPlan','oracleWitness','oracleShrine','skyWitness','skyBeacon','frostWitness','frostHearth','firstWitness','firstConcordance']);
function isTownLandmark(o){return townGuideTypes.has(o.type);}
function shortLabel(label){return String(label).replace(/^The\s+/,'').replace(/\s·\s.*$/,'');}
function guidePriority(o){return ({npc:0,resident:1,hollowResident:1,emberWitness:1,valewynWitness:1,inn:2,shop:3,forge:4,hollowFountain:5,bell:5,coolantStation:5,civicPlan:5,oracleWitness:1,oracleShrine:5,skyWitness:1,skyBeacon:5,frostWitness:1,frostHearth:5,firstWitness:1,firstConcordance:5,board:6,exit:7})[o.type]??8;}
function dirText(dx,dy){const bits=[];if(dy<0)bits.push('north');if(dy>0)bits.push('south');if(dx<0)bits.push('west');if(dx>0)bits.push('east');return bits.join('-')||'here';}
function guidePanel(){
 if(!game)return '';
 if(game.s.place!=='town')return '<section class="panel legend-panel"><h3>Know the world</h3><div class="legend"><span><b>⌂</b> Town / service</span><span><b>▥</b> Dungeon</span><span><b>!</b> Person / lever</span><span><b>✦</b> Echo Warden trial</span><span><b>▣</b> Treasure</span><span><b>▼</b> Stairs</span><span><b>●</b> Visible enemy</span><span><b>≈</b> Recovery spring</span></div></section>';
 const s=game.s;
 const list=game.objects().filter(isTownLandmark).sort((a,b)=>guidePriority(a)-guidePriority(b)||Math.abs(a.x-s.x)+Math.abs(a.y-s.y)-Math.abs(b.x-s.x)-Math.abs(b.y-s.y)||a.label.localeCompare(b.label)).slice(0,8);
 return '<section class="panel legend-panel town-guide"><div class="row between"><h3>Town guide</h3><small>'+esc(regions[s.region].name)+'</small></div><div class="town-guide-list">'+list.map(o=>'<button class="guide-link'+(Math.abs(o.x-s.x)+Math.abs(o.y-s.y)<=1?' primary':'')+'" data-action="goto" data-id="'+o.id+'"><span>'+esc(shortLabel(o.label))+'</span><small>'+esc(dirText(o.x-s.x,o.y-s.y))+' · '+(Math.abs(o.x-s.x)+Math.abs(o.y-s.y))+' tiles</small></button>').join('')+'</div><p class="town-guide-note">Select a landmark to auto-walk there. Hover a marker to preview its name.</p></section>';
}

function ensureCitizens(){
 if(!Citizens||!game||game.s.place!=='town'||interior)return null;
 if(!citizens||citizenRegion!==game.s.region){
  citizens=Citizens.create(game.s.region,game.map(),game.objects());citizenRegion=game.s.region;
 }
 return citizens;
}
function closeCitizensIfOutsideTown(){if(!game||game.s.place!=='town'){citizens=null;citizenRegion=-1;chatAfterWalk=null;}}
function citizenNear(){return Citizens&&ensureCitizens()?Citizens.near(citizens,game.s):[];}
function citizenAt(x,y){return Citizens&&ensureCitizens()?Citizens.at(citizens,x,y):null;}
function updateFocusPanel(){const el=document.querySelector('.focus-panel');if(el&&game&&!interior){el.outerHTML=landmarkPanel();}}
function talkCitizen(actor){
 if(!Citizens||!actor||!game||game.s.place!=='town')return;
 if(Math.abs(actor.x-game.s.x)+Math.abs(actor.y-game.s.y)>1){game.emit('Walk closer to '+actor.name+' first.');render();return;}
 stopWalk();Citizens.hold(actor,45);actor.meetings++;
 modal={screen:'citizenChat',actorId:actor.id,topic:0};renderModal();
}
function seekCitizen(actor){
 if(!actor||!game||game.s.place!=='town')return;
 if(Math.abs(actor.x-game.s.x)+Math.abs(actor.y-game.s.y)<=1){talkCitizen(actor);return;}
 Citizens.hold(actor,70);chatAfterWalk=actor.id;walkTo(actor.x,actor.y);
}
function citizenPortrait(actor){
 if(!actor)return '';
 const src=[1,4,0,2,3,5,7,6][Math.max(0,actor.roleIndex)],col=src%4,row=Math.floor(src/4);
 return '<div class="citizen-portrait" style="background-position:'+(col/3*100)+'% '+(row/3*100)+'%" aria-hidden="true"></div>';
}
function timeState(steps=(game?.s.steps||0)){
 const phases=[
  {label:'Dawn',overlay:['#f6d29a33','#1d344400'],mood:'Lanterns fade and the streets begin to stir.'},
  {label:'Day',overlay:['#ffffff0a','#00000000'],mood:'Shops are open and the roads are easiest to read.'},
  {label:'Dusk',overlay:['#d39b6a22','#17294222'],mood:'Windows glow and townsfolk start gathering indoors.'},
  {label:'Night',overlay:['#0c163c55','#050d1f88'],mood:'The streets quiet down; lamps and guidance markers stand out.'}
 ];
 return phases[Math.floor((steps||0)/18)%4];
}
function focusObject(){
 if(!game)return null;
 const obs=game.objects();
 if(hoverTile){const hovered=obs.find(o=>o.x===hoverTile.x&&o.y===hoverTile.y);if(hovered)return hovered;const citizen=citizenAt(hoverTile.x,hoverTile.y);if(citizen)return citizen;}
 const near=game.nearby().find(o=>isTownLandmark(o)||showInlineLabel(o));
 if(near)return near;
 const nearCitizen=citizenNear()[0];if(nearCitizen)return nearCitizen;
 if(routeTarget){const routed=obs.find(o=>o.id===routeTarget.id)||obs.find(o=>o.x===routeTarget.x&&o.y===routeTarget.y);if(routed)return routed;}
 const guide=game.guide();
 return guide?obs.find(o=>o.id===guide.id)||null:null;
}
function focusMeta(o){
 if(o?.type==='citizen')return{tag:'Living townsperson',desc:o.lines[0],tip:'Talk to learn about their work or hear a local rumor.',chips:['Ambient dialogue',o.role,'Optional conversation']};
 if(!o)return {tag:'Situation',desc:'Move near a landmark or hover over one on the map to preview what it does.',tip:'Nearby buttons and auto-walk can both get you there quickly.',chips:['Hover to inspect','Click to route']};
 const dist=game?Math.abs(o.x-game.s.x)+Math.abs(o.y-game.s.y):0;
 const genericTalk=o.talk||o.text||'';
 const types={
  npc:['Main story objective',regions[game.s.region].intro||'Speak with the local leader to learn why this realm is in trouble.','Start here before heading to the dungeon.', ['Quest giver','Primary objective']],
  resident:['Optional testimony',genericTalk||'A townsfolk testimony that deepens the side story and rewards exploration.','Optional, but these often unlock bonuses and rewards.', ['Side quest','Witness']],
  hollowResident:['Optional testimony',genericTalk||'A Hollowmere witness who helps restore the town’s memory.','Collecting all three strengthens the party.', ['Side quest','Witness']],
  emberWitness:['Optional testimony',genericTalk||'A foundry worker with evidence that affects the town and the dungeon.','Witnesses can power up support systems before the boss.', ['Side quest','Witness']],
  firstWitness:['First Library testimony',genericTalk||'An eyewitness to the First Keeper’s original actions.','Collect all three to restore the Living Concordance before the last dungeon.', ['Final chapter','Witness']],
  firstConcordance:['Living Concordance','An open ledger which challenges the Eraser’s authority.','Talk to Ione, Tamsin and Fen to gain supplies, ink protection and Focus.', ['Final chapter','Optional reward']],
  frostWitness:['Northern testimony',genericTalk||'A resident who remembers the paths sealed by the White Phantom.','Listen to three witnesses to rekindle Palehaven’s hearth.', ['Witness','Optional story']],
  frostHearth:['Returning Hearth','A hearth of names that protects travelers on the black frost and lends courage against the Phantom.','Hear Mirael, Oren, and Eira, then return to this fire.', ['Town support','Optional reward']],
  skyWitness:['Lost-fleet testimony',genericTalk||'A Zephyr Landing crewmate who can help restore a vital emergency beacon.','Hear all three crew witnesses, then interact with the Signal Beacon.', ['Sky crew','Optional story']],
  skyBeacon:['Signal restoration','A skyport distress beacon can be rewired with testimony from Liora, Bennet and Suri.','Activating it rewards supplies, calms gust damage, and adds boss Focus.', ['Optional beacon','Battle support']],
  oracleWitness:['Caravan testimony',genericTalk||'A caravan survivor helps restore the missing travelers.', 'All three voices activate the Moonwell.', ['Side story','Witness']],
  oracleShrine:['Caravan landmark','The Moonwell recalls safe caravan routes only after hearing three accounts.', 'Restore it for treasure and reduced sand damage.', ['Moonwell','Optional support']],
  valewynWitness:['Optional testimony',genericTalk||'A civic witness whose statement shapes the council’s choice.','Hear all three before choosing a plan.', ['Side quest','Witness']],
  inn:['Town service',regionServiceText('inn',game.s.region)[1],'Spend gold to fully restore HP and MP for the whole party.', ['Rest','Recovery']],
  shop:['Town service',regionServiceText('shop',game.s.region)[1],'Buy Potions and Ethers before the next expedition.', ['Supplies','Consumables']],
  forge:['Town service',regionServiceText('forge',game.s.region)[1],'Upgrade weapon or armor tiers and review mastery progress.', ['Upgrade gear','Mastery']],
  board:['Local notice board','Read a quick regional summary, local warnings, and puzzle hints.','Boards are great if you forgot what the town is worried about.', ['Hints','Town lore']],
  exit:['Route marker','Return to the overworld road from here.','Useful when you are done preparing in town.', ['Travel','World road']],
  bell:['Optional landmark','The Thirteenth Bell side story advances when all three testimonies are found.','When restored, it grants MP growth and treasure.', ['Side quest','Landmark']],
  hollowFountain:['Optional landmark','This fountain responds when Hollowmere’s witnesses remember one another.','Restore all three testimonies, then revisit the fountain.', ['Side quest','Memory puzzle']],
  coolantStation:['Optional landmark','Collected testimonies can reroute coolant to make the foundry safer.','Activating coolant lowers damage from the hottest floor tiles.', ['Support system','Town effect']],
  civicPlan:['Town decision','The Valewyn council will commit power to one public priority once it hears all testimony.','Your choice changes dungeon support and rewards.', ['Branching choice','Council vote']]
 };
 const hit=types[o.type]||['Field focus',genericTalk||'An important place or object in the current area.','Stand adjacent and press Interact.', ['Explore']];
 return {tag:hit[0],desc:hit[1],tip:hit[2],chips:[...hit[3],dist===0?'Here':dist===1?'Adjacent':dist+' tiles away']};
}
function landmarkPanel(){
 if(!game)return '';
 const s=game.s,phase=timeState(s.steps),o=focusObject(),meta=focusMeta(o);
 const routeText=route.length&&routeTarget?('Auto-route: '+(routeTarget.label||'Destination')+' · '+route.length+' steps queued'):'No route pinned';
 const action=o?(o.type==='citizen'?(Math.abs(o.x-s.x)+Math.abs(o.y-s.y)<=1?button('Talk to '+esc(o.name.split(' ')[0]),'citizenTalk','data-id="'+o.id+'"','primary'):button('Approach '+esc(o.name.split(' ')[0]),'citizenApproach','data-id="'+o.id+'"','primary')):(Math.abs(o.x-s.x)+Math.abs(o.y-s.y)<=1?button('Interact now','use','data-id="'+o.id+'"','primary'):button('Auto-walk here','goto','data-id="'+o.id+'"','primary'))):'';
 return '<section class="panel focus-panel"><div class="row between"><div><span class="eyebrow">Field focus</span><h3>'+(o?esc(o.label):'Look around')+'</h3></div><small>'+phase.label+' · '+(s.place==='town'?esc(regions[s.region].name):esc((game.map().title||regions[s.region].name)))+'</small></div><div class="focus-tag">'+esc(meta.tag)+'</div><p>'+esc(meta.desc)+'</p><div class="focus-chips">'+meta.chips.map(ch=>'<span>'+esc(ch)+'</span>').join('')+'</div>'+(action?'<div class="focus-actions">'+action+'</div>':'')+'<p class="compact">'+esc(meta.tip)+'</p><div class="focus-subline"><strong>Town pulse:</strong> '+esc(phase.mood)+' <span>· '+esc(routeText)+'</span></div></section>';
}
function boardEntries(){
 const s=game?.s||{region:0};
 return [
  {title:'Willowmere notices',items:['Elder Mael requests aid at the north square.','Three townsfolk still remember the Thirteenth Bell: Pip, Edda and Iris.','Road report: Rootbound Archive lies northeast beyond the south gate road.']},
  {title:'Hollowmere postings',items:['The Court of Mirrors lies northeast of the square.','Witnesses Lena, Tovin and Sister Anwen can help the Fountain of Faces remember.','Silverglass inscription: West faces East, North faces South, South faces West.']},
  {title:'Emberpeak postings',items:['Foreman Veyra seeks testimony from Ilya, Rook and Sella.','Coolant station can reduce heat damage before the foundry push.','Foundry note: valve goals read West→East, North→South, South→West.']},
  {title:'Valewyn bulletins',items:['Council hears testimony from Nessa, Dorian and Orel before acting.','Sunken Keep lies northeast across the canals.','Priority choices affect flood safety and archive support in the dungeon.']},
  {title:'Saffron Haven bulletins',items:['Hear caravan testimonies from Yara, Kamal and Nasrin to restore the Moonwell.','The Oracle Labyrinth lies northeast of town.','Windchart: West East, North South, South West. Mirage lenses: Oasis True, Sky False, Stars True.']},
  {title:'Zephyr Landing skyport notices',items:['Captain Aeris seeks lost-flight records from the Storm Observatory.','Ask Liora, Bennet and Suri about the false distress route; restore the Signal Beacon.','Rudders: West South, North East, South West. Relays: West Receive, Crown Amplify, South Receive.']},
  {title:'Palehaven winter notices',items:['Keeper Nox guards the vanishing northern roads.','Ask Mirael, Oren and Eira to rekindle the Returning Hearth and reduce black-frost injuries.','Beacons: West Sunrise, North Noon, South Dusk. Light lenses: West Receive, Crown Reflect, South Receive.']},
  {title:'Scriptorium final reports',items:['The First Library holds the source of the stolen names.','The recovered Northern Keeper Book may help restore names erased by the Eraser.','Prepare equipment, supplies, and spell resources for the last three floors.']}
 ][Math.max(0,Math.min(7,s.region))];
}
function noticeBoardHTML(){
 const b=boardEntries(),phase=timeState(game?.s?.steps||0);
 return '<div class="board-card"><div><span class="eyebrow">Posted this '+phase.label.toLowerCase()+'</span><h3>'+esc(b.title)+'</h3><p>The board condenses the town’s most practical local information into a quick field brief.</p></div><div class="board-icon">☰</div></div><ul class="board-list">'+b.items.map(it=>'<li>'+esc(it)+'</li>').join('')+'</ul><div class="focus-chips"><span>Quick recap</span><span>Regional hints</span><span>Objective support</span></div>';
}
function townBadge(o){
 return o.type==='inn'?['☾','#95c6e9']:
  o.type==='shop'?['✦','#e9cb7a']:
  o.type==='forge'?['⚒','#d89a82']:
  ['npc','resident','hollowResident','emberWitness','valewynWitness','oracleWitness','skyWitness','frostWitness','firstWitness'].includes(o.type)?['!','#f2df9a']:
  o.type==='board'?['≡','#c6b2dd']:
  o.type==='exit'?['↘','#b7d7e8']:
  o.type==='bell'?['♪','#f2df9a']:
  o.type==='hollowFountain'?['◈','#94d8e8']:
  o.type==='coolantStation'?['✹','#bce8ff']:
  o.type==='civicPlan'?['◆','#dcc4ee']:
  o.type==='firstConcordance'?['✦','#f2d39a']:
  o.type==='frostHearth'?['✦','#a3d7fa']:
  o.type==='skyBeacon'?['✦','#9ce0e9']:
  null;
}
function drawBubble(c,x,y,text,bg='#20333c',fg='#f3ead0'){
 c.font='bold 12px system-ui';
 const w=Math.max(18,c.measureText(text).width+10),h=18;
 px(c,x-w/2,y-h/2,w,h,'#08161dee');
 px(c,x-w/2+1,y-h/2+1,w-2,h-2,bg);
 c.fillStyle=fg;c.textAlign='center';c.textBaseline='middle';c.fillText(text,x,y+1);
}

function nearbyHTML(near){
 const nearCit=citizenNear();
 if(!near.length&&!nearCit.length)return '<div class="nearby-strip"><span class="eyebrow">Nearby</span><small>Walk up to a resident, service, or landmark to interact.</small></div>';
 return '<div class="nearby-strip"><span class="eyebrow">Nearby</span><div class="nearby-list">'+near.slice(0,4).map(o=>'<button class="nearby-link" data-action="use" data-id="'+o.id+'">'+esc(o.label)+'</button>').join('')+nearCit.slice(0,3).map(o=>'<button class="nearby-link citizen-nearby" data-action="citizenTalk" data-id="'+o.id+'">Talk · '+esc(o.name)+'</button>').join('')+'</div></div>';
}
function markerColor(o){return ({inn:'#95c6e9',shop:'#e9cb7a',forge:'#d89a82',npc:'#f2df9a',resident:'#9fd3ab',hollowResident:'#9fd3ab',emberWitness:'#e9a57a',valewynWitness:'#8dd4d8',board:'#c6b2dd',exit:'#b7d7e8',bell:'#f2df9a',hollowFountain:'#94d8e8',coolantStation:'#bce8ff',civicPlan:'#dcc4ee',oracleWitness:'#f2df9a',oracleShrine:'#94d8e8',skyWitness:'#cde5fd',skyBeacon:'#9ce0e9',frostWitness:'#bbdeef',frostHearth:'#a3d7fa',firstWitness:'#e7c899',firstConcordance:'#f2d39a'})[o.type]||'#f2df9a';}
function showInlineLabel(o){return ['town','dungeon','boss','trial','up','down','leave','exit'].includes(o.type);}
function drawCallout(c,x,y,label,accent='#f2df9a'){c.font='11px system-ui';const w=Math.min(200,c.measureText(label).width+14),xx=Math.max(w/2+6,Math.min(810-w/2,x));px(c,xx-w/2,y-14,w,18,'#102029f0');px(c,xx-w/2,y+4,w,2,'#5d7277');px(c,xx-w/2,y-14,4,18,accent);c.fillStyle='#f3ead0';c.textAlign='center';c.textBaseline='middle';c.fillText(label,xx,y-5);}
function drawMarker(c,x,y,color){px(c,x-5,y-22,10,10,'#0d1a20ee');px(c,x-4,y-21,8,8,color);px(c,x-1,y-13,2,4,color);}
function drawRoute(c,s){if(!route.length)return;let px0=(s.x-camera.x)*48+24,py0=(s.y-camera.y)*48+24,wx=s.x,wy=s.y;c.strokeStyle='#f4d994';c.lineWidth=3;c.setLineDash([7,5]);c.beginPath();c.moveTo(px0,py0);for(const [dx,dy] of route){wx+=dx;wy+=dy;const cx=(wx-camera.x)*48+24,cy=(wy-camera.y)*48+24;if(cx<0||cy<0||cx>816||cy>624)continue;c.lineTo(cx,cy);}c.stroke();c.setLineDash([]);}
function miniColor(t){if(['oasis','ink','cloudbank','water'].includes(t))return '#376c82';if(['dune','sand','snow','vellum','skygrass'].includes(t))return '#c1ad8c';if(['icewall','snowpine','inkwall'].includes(t))return '#3d5665';return t==='quicksand'?'#b28853':t==='sandstone'?'#b29a68':t==='mosaic'?'#b9a16a':t==='sandroad'?'#d0b27d':t==='water'?'#376c82':t==='road'?'#c0a06e':t==='plaza'?'#9c9a8d':t==='stone'?'#6e7e7e':t==='marble'?'#80949e':t==='metal'?'#636670':t==='ash'?'#7a5948':t==='garden'?'#48735c':t==='meadow'||t==='flowers'?'#699053':t==='bridge'?'#a48a61':t==='wood'||t==='carpet'?'#6f5046':t==='moss'?'#4e615b':t==='wall'?'#2b3942':t==='tree'?'#385644':'#5f7f4d';}
function drawMiniMap(c,m,s,obs,guide){const cell=Math.max(3,Math.floor(Math.min(140/m.w,102/m.h))),w=m.w*cell,h=m.h*cell,ox=816-w-16,oy=16;px(c,ox-6,oy-6,w+12,h+18,'#0d1a21e6');px(c,ox-5,oy-5,w+10,h+10,'#1c2b33');for(let y=0;y<m.h;y++)for(let x=0;x<m.w;x++){c.fillStyle=miniColor(m.tiles[y][x]);c.fillRect(ox+x*cell,oy+y*cell,cell,cell);}for(const o of obs.filter(q=>isTownLandmark(q))){c.fillStyle=markerColor(o);c.fillRect(ox+o.x*cell,oy+o.y*cell,Math.max(2,cell),Math.max(2,cell));}if(guide){c.strokeStyle='#f2df9a';c.lineWidth=2;c.strokeRect(ox+guide.x*cell-1,oy+guide.y*cell-1,cell+2,cell+2);}c.fillStyle='#58bcff';c.fillRect(ox+s.x*cell-1,oy+s.y*cell-1,cell+2,cell+2);c.fillStyle='#f3e8c9';c.font='bold 10px system-ui';c.textAlign='left';c.fillText('MINIMAP',ox,oy+h+10);}
function render(){if(!game){title();if(modal)renderModal();return;}if(interior){renderInterior();return;}closeCitizensIfOutsideTown();if(game.s.place==='town')ensureCitizens();music();if(game.battle){renderBattle();return;}if(game.scene&&!modal){modal=game.scene;game.scene=null;}store();const s=game.s,place=(s.place==='dungeon'&&s.region===0?'Rootbound Archive · '+game.map().title:game.map().title)||(s.place==='world'?'The connected overworld':s.place==='town'?regions[s.region].name:dungeonNames[s.region]),near=game.nearby().filter(o=>o.type!=='plate'),msg=saveError||game.events.at(-1)||game.objective();
app.innerHTML=header()+'<main class="shell"><section><div class="location"><div><span class="eyebrow">'+(s.place==='dungeon'?'Dungeon · Floor '+(s.floor+1)+' of 3':s.place==='town'?'Sanctuary & supplies':'Eight remembered realms')+'</span><h2>'+esc(place)+'</h2><div class="scene-flavor">'+esc(game.map().flavor||'Journey through the remembered realms.')+'</div></div><small>'+s.gold+' gold · '+s.cleared.length+'/8 fragments · '+(s.loot?.length||0)+' gear · '+timeState(s.steps).label+'</small></div><div class="mobile-game-hud"><div class="mobile-next"><span>NEXT DESTINATION</span><strong>'+esc(game.guide()?.label||game.objective())+'</strong></div><div class="mobile-party-hp">'+s.party.map(p=>'<span><b>'+esc(p.name)+'</b><i><em style="width:'+Math.max(0,Math.round(p.hp/p.maxhp*100))+'%"></em></i></span>').join('')+'</div></div><div class="mapframe"><canvas id="field" width="816" height="624" aria-label="Exploration map. Use arrow keys or WASD to walk; E to interact."></canvas><span class="mapbadge">'+(s.place==='world'?regions[s.region].name:'YOU ARE THE BLUE-CLOAKED HERO')+'</span><span class="maphint">Click a path to walk • Hover a marker to identify it • Use Nearby buttons for quick talk/access</span></div><div class="message" role="status">'+esc(msg)+'</div>'+nearbyHTML(near)+'<div class="controls"><div class="pad">'+button('↑','move','data-dx="0" data-dy="-1" aria-label="Move north"','up')+button('←','move','data-dx="-1" data-dy="0" aria-label="Move west"','left')+button('↓','move','data-dx="0" data-dy="1" aria-label="Move south"','down')+button('→','move','data-dx="1" data-dy="0" aria-label="Move east"','right')+'</div><div class="stack"><div class="mobile-action-buttons">'+button(near.length?'Action · '+esc(shortLabel(near[0].label)):'Interact','interact','','primary')+button('Quest','journal','','mobile-extra')+button('Map','atlas','','mobile-extra')+button('Menu','menu','','mobile-extra')+'</div><small>WASD / arrows to move · M for map · Esc for menu</small></div></div></section><aside class="sidebar"><section class="panel objective"><h3>Your next step</h3><p>'+esc(game.objective())+'</p>'+(game.guide()?'<div class="quest-compass"><b>◇ Quest compass</b><span>'+esc(game.guide().label)+' · '+esc(game.guide().dir)+' · approx. '+game.guide().tiles+' tiles</span><small>Follow open corridors; the distance is directional, not a guaranteed route.</small></div>':'')+(s.region===0&&s.place==='town'?'<div class="quest-meter"><b>The Thirteenth Bell</b><span>'+(['pip','edda','iris'].filter(k=>s.flags['lq:bell:'+k]).length)+'/3 testimonies'+(s.flags['lq:bell:done']?' · RESTORED':'')+'</span></div>':s.region===0&&s.place==='dungeon'&&s.floor===2?'<div class="quest-meter"><b>Keeper Oaths</b><span>'+['0-2-oath1','0-2-oath2','0-2-oath3'].filter(k=>s.flags['lq:oath:'+k]).length+'/3 awakened</span></div>':'')+(s.region===1&&s.place==='town'?'<div class="quest-meter"><b>Hollowmere Witnesses</b><span>'+['lena','tovin','anwen'].filter(k=>s.flags['lq:hollow:'+k]).length+'/3 testimonies'+(s.flags['lq:hollow:fountain']?' · Fountain restored':'')+'</span></div>':s.region===1&&s.place==='dungeon'&&s.floor===0?'<div class="quest-meter"><b>Silverglass Alignment</b><span>'+game.map().objects.filter(q=>q.type==='mirror'&&(s.flags['lq:mirror:'+q.id]||0)===q.goal).length+'/3 lenses aligned'+(s.flags['1-0-beam']?' · Lock open':'')+'</span></div>':s.region===1&&s.place==='dungeon'&&s.floor===2?'<div class="quest-meter"><b>The Three Royal Vows</b><span>'+game.map().objects.filter(q=>q.type==='memoryVow'&&s.flags['lq:vow:'+q.id]).length+'/3 restored'+(s.flags['lq:mirror:bond']?' · Mira remembers':'')+'</span></div>':'')+(s.region===2&&s.place==='town'?'<div class="quest-meter"><b>Emberpeak Testimonies</b><span>'+['ilya','rook','sella'].filter(k=>s.flags['lq:ember:witness:'+k]).length+'/3 witnesses'+(s.flags['lq:ember:coolant']?' · COOLANT ACTIVE':'')+'</span></div>':s.region===2&&s.place==='dungeon'&&s.floor===0?'<div class="quest-meter"><b>Furnace Pressure</b><span>'+game.map().objects.filter(q=>q.type==='heatValve'&&(s.flags['lq:ember:valve:'+q.id]||0)===q.goal).length+'/3 valves aligned'+(s.flags['2-0-pressure']?' · BLAST GATE OPEN':'')+'</span></div>':s.region===2&&s.place==='dungeon'&&s.floor===1?'<div class="quest-meter"><b>Ventilation and Seal</b><span>'+game.map().objects.filter(q=>q.type==='forgeFan'&&(s.flags['lq:ember:fan:'+q.id]||0)===q.goal).length+'/3 fans · Echo Warden '+(s.flags.seal2?'restored':'incomplete')+(s.flags['2-1-ventClear']?' · DOOR OPEN':'')+'</span></div>':s.region===2&&s.place==='dungeon'&&s.floor===2?'<div class="quest-meter"><b>Hammer Oath</b><span>'+(s.flags['lq:ember:oathStep']||0)+'/3 strikes · '+(s.flags['lq:ember:bond']?'Bram remembers':'Bram’s memories missing')+'</span></div>':'')+(s.region===3&&s.place==='town'?'<div class="quest-meter"><b>Valewyn Council</b><span>'+['nessa','dorian','orel'].filter(k=>s.flags['lq:vale:witness:'+k]).length+'/3 testimonies · '+(s.flags['lq:vale:plan']||'Decision pending')+'</span></div>':s.region===3&&s.place==='dungeon'&&s.floor===0?'<div class="quest-meter"><b>Floodgates</b><span>'+game.map().objects.filter(q=>q.type==='tideSluice'&&(s.flags['lq:vale:sluice:'+q.id]||0)===q.goal).length+'/3 sluices aligned'+(s.flags['3-0-tide']?' · GATE OPEN':'')+'</span></div>':s.region===3&&s.place==='dungeon'&&s.floor===1?'<div class="quest-meter"><b>Archive Restoration</b><span>'+game.map().objects.filter(q=>q.type==='tidePump'&&(s.flags['lq:vale:pump:'+q.id]||0)===q.goal).length+'/3 pumps · Echo Warden '+(s.flags.seal3?'complete':'missing')+(s.flags['3-1-archive']?' · OPEN':'')+'</span></div>':s.region===3&&s.place==='dungeon'&&s.floor===2?'<div class="quest-meter"><b>True Charter</b><span>'+(s.flags['lq:vale:principleStep']||0)+'/3 principles · '+(s.flags['lq:vale:bond']?'Witness Seal gained':'Lyra’s testimony incomplete')+'</span></div>':'')+(s.region===7&&s.place==='town'?'<div class="quest-meter"><b>Living Concordance</b><span>'+['ione','tamsin','fen'].filter(k=>s.flags['lq:first:witness:'+k]).length+'/3 witnesses'+(s.flags['lq:first:concordance']?' · RESTORED':'')+'</span></div>':s.region===7&&s.place==='dungeon'&&s.floor===0?'<div class="quest-meter"><b>Index Engines</b><span>'+game.map().objects.filter(o=>o.type==='indexEngine'&&(s.flags['lq:first:index:'+o.id]||0)===o.goal).length+'/3 aligned'+(s.flags['7-0-index']?' · BRIDGE OPEN':'')+'</span></div>':s.region===7&&s.place==='dungeon'&&s.floor===1?'<div class="quest-meter"><b>The Palimpsest</b><span>'+game.map().objects.filter(o=>o.type==='printingPlate'&&(s.flags['lq:first:plate:'+o.id]||0)===o.goal).length+'/3 plates · Echo Warden '+(s.flags.seal7?'complete':'missing')+'</span></div>':s.region===7&&s.place==='dungeon'&&s.floor===2?'<div class="quest-meter"><b>The Last Promises</b><span>'+(s.flags['lq:first:vowStep']||0)+'/3 · '+(s.flags['lq:first:bond']?'Keeper’s memories restored':'Recover missing memories')+'</span></div>':'')+(s.region===6&&s.place==='town'?'<div class="quest-meter"><b>Returning Hearth</b><span>'+['mirael','oren','eira'].filter(k=>s.flags['lq:frost:witness:'+k]).length+'/3 witnesses'+(s.flags['lq:frost:hearth']?' · HEARTH LIT':'')+'</span></div>':s.region===6&&s.place==='dungeon'&&s.floor===0?'<div class="quest-meter"><b>Three Sun Beacons</b><span>'+game.map().objects.filter(o=>o.type==='frostBeacon'&&(s.flags['lq:frost:beacon:'+o.id]||0)===o.goal).length+'/3 aligned'+(s.flags['6-0-light']?' · BRIDGE OPEN':'')+'</span></div>':s.region===6&&s.place==='dungeon'&&s.floor===1?'<div class="quest-meter"><b>Borrowed Light</b><span>'+game.map().objects.filter(o=>o.type==='frostLens'&&(s.flags['lq:frost:lens:'+o.id]||0)===o.goal).length+'/3 lenses · Echo Warden '+(s.flags.seal6?'complete':'missing')+'</span></div>':s.region===6&&s.place==='dungeon'&&s.floor===2?'<div class="quest-meter"><b>Keeper Promises</b><span>'+(s.flags['lq:frost:vowStep']||0)+'/3 vows · '+(s.flags['lq:frost:bond']?'Nox remembers':'Memories missing')+'</span></div>':'')+(s.region===5&&s.place==='town'?'<div class="quest-meter"><b>Lost Fleet Signal</b><span>'+['liora','bennet','suri'].filter(k=>s.flags['lq:sky:witness:'+k]).length+'/3 testimonies'+(s.flags['lq:sky:beacon']?' · BEACON ACTIVE':'')+'</span></div>':s.region===5&&s.place==='dungeon'&&s.floor===0?'<div class="quest-meter"><b>Wind Rudders</b><span>'+game.map().objects.filter(q=>q.type==='skyVane'&&(s.flags['lq:sky:vane:'+q.id]||0)===q.goal).length+'/3 aligned'+(s.flags['5-0-rudders']?' · BRIDGE OPEN':'')+'</span></div>':s.region===5&&s.place==='dungeon'&&s.floor===1?'<div class="quest-meter"><b>Signal & Echo Warden</b><span>'+game.map().objects.filter(q=>q.type==='skyRelay'&&(s.flags['lq:sky:relay:'+q.id]||0)===q.goal).length+'/3 relays · Echo Warden '+(s.flags.seal5?'complete':'missing')+(s.flags['5-1-signals']?' · ORRERY OPEN':'')+'</span></div>':s.region===5&&s.place==='dungeon'&&s.floor===2?'<div class="quest-meter"><b>Pilot Oath</b><span>'+(s.flags['lq:sky:vowStep']||0)+'/3 vows · '+(s.flags['lq:sky:bond']?'Flight Oath remembered':'Aeris’s memories missing')+'</span></div>':'')+(s.region===4&&s.place==='town'?'<div class="quest-meter"><b>Caravan Memories</b><span>'+['yara','kamal','nasrin'].filter(q=>s.flags['lq:oracle:witness:'+q]).length+'/3 testimonies'+(s.flags['lq:oracle:moonwell']?' - Moonwell restored':'')+'</span></div>':s.region===4&&s.place==='dungeon'&&s.floor===0?'<div class="quest-meter"><b>Still Wind Vanes</b><span>'+game.map().objects.filter(q=>q.type==='windVane'&&(s.flags['lq:oracle:vane:'+q.id]||0)===q.goal).length+'/3 aligned'+(s.flags['4-0-winds']?' - Gate open':'')+'</span></div>':s.region===4&&s.place==='dungeon'&&s.floor===1?'<div class="quest-meter"><b>True Horizon</b><span>'+game.map().objects.filter(q=>q.type==='mirageLens'&&(s.flags['lq:oracle:lens:'+q.id]||0)===q.goal).length+'/3 lenses; Echo Warden '+(s.flags.seal4?'complete':'missing')+'</span></div>':s.region===4&&s.place==='dungeon'&&s.floor===2?'<div class="quest-meter"><b>Traveler Vows</b><span>'+(s.flags['lq:oracle:vowStep']||0)+'/3 in order'+(s.flags['lq:oracle:bond']?' - Sel remembers':'')+'</span></div>':'')+'<div class="progress-dots">'+regions.map((r,i)=>'<i class="'+(s.cleared.includes(i)?'on':'')+'"></i>').join('')+'</div>'+button('Open world map','atlas')+'</section>'+landmarkPanel()+'<section class="panel party-panel"><div class="row between"><span class="eyebrow">Your companions</span><small>'+s.potions+' potions</small></div>'+s.party.map(p=>partyHTML(p)).join('')+'<div class="side-actions">'+button('Weapons & skills','equipment')+button('Battle relics','relics')+button('Gear & loot','loot')+button('Journal','journal')+'</div></section>'+guidePanel()+'</aside></main>';
drawMap();if(modal)renderModal();}
function px(c,x,y,w,h,color){c.fillStyle=color;c.fillRect(Math.round(x),Math.round(y),w,h);}
function hero(c,x,y,id=0){
 if(partyArt&&partyArt.complete&&partyArt.naturalWidth){const row=id===0?0:id===1?1:2;c.drawImage(partyArt,0,row*128,96,128,x+4,y-3,40,53);return;}
 const cloak=['#518cca','#aa80c0','#9faaa8'][id];px(c,x+15,y+37,20,5,'#14292899');px(c,x+19,y+9,13,6,'#3b2a26');px(c,x+18,y+15,14,10,'#e4b58a');px(c,x+15,y+24,20,13,cloak);px(c,x+17,y+37,6,7,'#213449');px(c,x+28,y+37,6,7,'#213449');px(c,x+12,y+26,5,9,'#e4b58a');px(c,x+35,y+24,3,18,'#d9ddcf');}
function terrain(c,x,y,t,r,tx,ty){const theme=themes[r],n=(tx*13+ty*7)%5;px(c,x,y,48,48,t==='wall'?'#26323a':t==='floor'?'#48524c':t==='road'?'#b39a69':t==='water'?'#315f73':theme[0]);if(t==='grass'){const sway=(ambientTick+tx*3+ty*5)%3;px(c,x+8+n*4,y+9,3,3,theme[2]);px(c,x+29,y+32+n,5,2,theme[1]);px(c,x+10+sway*6,y+24-(sway===1?1:0),2,6,theme[2]);px(c,x+25+((sway+1)%3)*5,y+18+(sway===2?1:0),2,5,theme[2]);}if(t==='road'){px(c,x+8,y+16,6,2,'#a48a5c');px(c,x+32,y+36,3,3,'#c4ac7a');}if(t==='floor'||t==='wall'){px(c,x,y,48,2,t==='wall'?'#5d6763':'#5a6258');px(c,x+24+(ty%2?12:0),y,2,23,'#34423f');px(c,x,y+24,48,2,'#35443f');if(t==='wall')px(c,x,y+42,48,6,'#17272d');}if(t==='water'){const sh=(ambientTick+tx+ty)%4,sh2=(ambientTick+tx*2+ty)%5;px(c,x,y,48,48,'#315f73');px(c,x+4+sh,y+12,16,2,'#7fb2bd');px(c,x+24-sh2,y+24,12,2,'#5d98a5');px(c,x+26,y+32,16,2,'#9dd0d8');px(c,x+10+sh2,y+39,10,1,'#a4d7de');}if(t==='tree'){px(c,x+21,y+27,8,17,'#66503b');px(c,x+7,y+14,33,18,theme[1]);px(c,x+13,y+5,24,18,theme[1]);px(c,x+15,y+8,17,5,theme[2]);}if(t==='mountain'){c.fillStyle='#6a7773';c.beginPath();c.moveTo(x+2,y+43);c.lineTo(x+24,y+5);c.lineTo(x+47,y+43);c.fill();px(c,x+20,y+15,9,6,'#b7c0ac');}if(t==='house'){px(c,x+1,y+4,46,40,'#98754e');px(c,x,y,48,10,'#714f3d');px(c,x+8,y+17,12,14,'#ecd396');px(c,x+30,y+17,12,14,'#ecd396');}}
// Extended authored tile vocabulary: less visual repetition between field, square and crypt.
function terrainEnhanced(c,x,y,t,r,tx,ty){
 terrain(c,x,y,t,r,tx,ty);
 if(r===7&&['inkwall','vellum','parchment','letterpath','scriptmosaic','redaction','goldscript'].includes(t)){
  const pulse=(ambientTick+tx*5+ty*9)%8;
  if(t==='inkwall'){px(c,x,y,48,48,'#1e2837');px(c,x+3,y+3,42,39,'#384658');px(c,x+9,y+3,30,33,'#53616d');px(c,x+11,y+6,26,25,'#3d4557');px(c,x+13,y+10,22,2,'#c2ae80');px(c,x+13,y+17,22,2,'#c2ae80');px(c,x+13,y+24,22,2,'#c2ae80');px(c,x,y+42,48,6,'#121a28');return;}
  const tone=t==='redaction'?'#3c253a':t==='goldscript'?'#9e7e46':t==='scriptmosaic'?'#ad9b79':t==='letterpath'?'#bfae8c':t==='parchment'?'#d3bea0':'#c6bb9d';px(c,x,y,48,48,tone);
  if(t==='redaction'){px(c,x+2,y+8,45,5,'#271d33');px(c,x+5,y+19,39,5,'#1d182c');px(c,x+7,y+33,37,4,'#25182d');px(c,x+5+pulse*3,y+12,14,2,'#bd80a0');}
  else if(t==='goldscript'){px(c,x+2,y+2,44,44,'#bd9a51');px(c,x+3,y+3,42,3,'#f2d593');px(c,x+22,y+6,4,35,'#765936');px(c,x+8,y+19,32,4,pulse<4?'#f9e9b4':'#d9bc6d');}
  else{px(c,x,y+24,48,2,'#937e61');px(c,x+((tx+ty)%2?28:12),y+1,2,22,'#937e61');px(c,x+5+pulse*4,y+9,7,2,'#eee2c4');if(t==='scriptmosaic'){px(c,x+17,y+12,14,23,'#775a50');px(c,x+21,y+16,6,16,'#ead0a2');}if(t==='letterpath'){px(c,x+7,y+34,32,2,'#917f64');}}
  return;
 }
 if(r===6&&['icewall','frostbrick','icepath','iceglass','icebridge','blackfrost'].includes(t)){
  const pulse=(ambientTick+tx*7+ty*5)%7;
  if(t==='icewall'){px(c,x,y,48,48,'#304653');px(c,x+3,y+3,42,39,'#446b7b');px(c,x+8,y+5,31,35,'#6c99a9');px(c,x+12,y+7,22,25,'#86b5c1');px(c,x+20,y+3,3,41,'#d0eaf0');px(c,x,y+41,48,7,'#233641');return;}
  const base=t==='frostbrick'?'#869cad':t==='icepath'?'#9eb7bd':t==='icebridge'?'#b2d6d6':t==='blackfrost'?'#45566b':'#668b9e';px(c,x,y,48,48,base);
  if(t==='blackfrost'){px(c,x+4,y+9,36,3,'#292f4d');px(c,x+10,y+26,32,3,'#2f3854');px(c,x+8+pulse*3,y+16,17,2,'#94bcd1');px(c,x+4,y+38,40,4,'#7796ab');}
  else if(t==='iceglass'){px(c,x+3,y+3,42,42,'#729cad');px(c,x+10,y+6,25,32,'#a5c9d3');px(c,x+20,y+8,3,28,'#d6e9ef');px(c,x+7+pulse,y+11,14,2,'#ecf8fa');}
  else{px(c,x,y+22,48,2,'#5c8291');px(c,x+((tx+ty)%2?26:10),y+2,2,20,'#698e9e');px(c,x+5+pulse,y+7,11,2,'#e9f0e9');if(t==='icebridge'){px(c,x+1,y+1,4,46,'#d2e8ea');px(c,x+43,y+1,4,46,'#d2e8ea');}}return;
 }
 if(r===5&&['cloudbank','skyplank','skywalk','stormglass','skybridge','gustlane'].includes(t)){
  const pulse=(ambientTick+tx*5+ty*3)%7;
  if(t==='cloudbank'){
   px(c,x,y,48,48,'#456d86');px(c,x+2,y+3,44,38,'#638da1');
   for(let k=0;k<3;k++){const ox=(tx*7+ty*11+k*23+pulse)%42,oy=(ty*13+k*11)%30+6;px(c,x+ox,y+oy,15,7,k%2?'#b7c8cf':'#91adbc');px(c,x+ox-4,y+oy+3,19,5,k%2?'#91adbc':'#d0dae0');}
   px(c,x,y+40,48,8,'#233f5a');return;
  }
  const base=t==='skywalk'?'#907b68':t==='skybridge'?'#b5a383':t==='stormglass'?'#697d91':t==='gustlane'?'#7d9dad':'#755e50';
  px(c,x,y,48,48,base);px(c,x,y,48,3,t==='stormglass'?'#c3dbe6':'#b8a287');
  if(t==='stormglass'){px(c,x+3,y+4,42,39,'#617e95');px(c,x+5,y+6,38,34,'#87a0ab');px(c,x+22,y+4,3,39,'#516d81');px(c,x+5,y+23,38,2,'#425c75');px(c,x+7+pulse,y+10,13,2,'#bcd9e1');}
  else if(t==='gustlane'){px(c,x,y+12,48,3,'#bedde7');px(c,x,y+30,48,3,'#aacad7');px(c,x+6+pulse*4,y+17,17,3,'#e4f6fc');px(c,x+18-pulse,y+36,20,2,'#d0f0f8');}
  else{for(let i=0;i<3;i++){px(c,x+2,y+i*16,44,2,t==='skybridge'?'#e0cc9b':'#483c3e');px(c,x+((tx+ty+i)%2?11:29),y+i*16,2,16,'#574b4c');}px(c,x+5,y+8,6,2,'#cbb69a');if(t==='skybridge'){px(c,x+1,y+1,4,46,'#4d6c7b');px(c,x+43,y+1,4,46,'#4d6c7b');}}
  return;
 }
 if(r===4&&['sandstone','sandroad','mosaic','quicksand','dune'].includes(t)){const n=(tx*13+ty*9)%7;const shade=t==='quicksand'?'#c79c63':t==='dune'?'#73523f':t==='mosaic'?'#bba16b':t==='sandroad'?'#c9ab78':'#ae9064';px(c,x,y,48,48,shade);if(t==='quicksand'){for(let i=0;i<3;i++){const wave=(ambientTick+i*9+n)%35;px(c,x+7+wave,y+8+i*12,18,2,i%2?'#e7bc79':'#876449');}px(c,x+17,y+17,9,7,'#af8055');}else if(t==='dune'){for(let i=0;i<3;i++)px(c,x+2,y+12+i*12,40,3,i%2?'#8e7154':'#5a463d');}else if(t==='mosaic'){px(c,x+2,y+2,44,44,'#dec18a');px(c,x+5,y+5,38,38,'#846b63');px(c,x+10,y+10,28,28,'#e3cb99');px(c,x+17,y+17,14,14,'#6b8888');}else {px(c,x,y+22,48,2,'#8f7254');px(c,x+((ty%2)?29:17),y+1,2,21,'#9c805e');px(c,x+5+n,y+8,11,3,'#dec393');}return;}
 const shade=(tx*17+ty*37)%7;
 if(t==='forest'){px(c,x,y,48,48,'#476842');px(c,x+6,y+5,36,33,'#31583b');px(c,x+10,y+8,7,5,'#709455');px(c,x+28,y+28,12,6,'#83a866');px(c,x+20,y+20,4,15,'#2d4634');}
 if(t==='meadow'||t==='flowers'||t==='garden'){px(c,x,y,48,48,t==='garden'?'#426c52':'#668751');for(let i=0;i<7;i++){const ax=(i*17+tx*11+ty*5)%42+3,ay=(i*23+ty*7)%42+3;px(c,x+ax,y+ay,2,5,'#315840');}if(t!=='meadow'){for(let i=0;i<3;i++){const ax=(i*13+tx*7+shade)%36+6,ay=(i*17+ty*11)%36+6;px(c,x+ax,y+ay,5,5,i%2?'#f2d48a':'#d9a5c5');px(c,x+ax+2,y+ay+2,2,2,'#f7ecbb');}}}
 if(t==='plaza'||t==='stone'||t==='rune'){px(c,x,y,48,48,t==='plaza'?'#a8a48e':t==='rune'?'#465766':'#687779');px(c,x,y+23,48,2,'#303f4a');px(c,x+24+(ty%2?11:0),y,2,23,'#344a4b');px(c,x+4+shade,y+6,5,2,'#9aa7a0');if(t==='rune'){px(c,x+16,y+14,17,2,'#75b6c6');px(c,x+23,y+7,2,17,'#75b6c6');px(c,x+20,y+11,8,8,'#376e7d');}}
 if(t==='wood'){px(c,x,y,48,48,'#6c5046');for(let i=0;i<3;i++){px(c,x,y+i*16,48,2,'#362d30');px(c,x+((ty+i)%2?22:8),y+i*16,2,16,'#4b3a36');px(c,x+3,y+i*16+6,18,2,'#89684f');}}
 if(t==='moss'){px(c,x,y,48,48,'#465755');px(c,x,y+23,48,2,'#303c3d');px(c,x+((ty%2)?26:13),y,2,23,'#304b45');for(let i=0;i<3;i++)px(c,x+(tx*5+i*19)%39,y+(ty*7+i*13)%37,7,4,'#6b8d66');}
 if(t==='carpet'){px(c,x,y,48,48,'#684d55');px(c,x+4,y,4,48,'#d0a274');px(c,x+39,y,4,48,'#d0a274');px(c,x+17,y+16,15,15,'#94706d');}
 if(t==='ash'){px(c,x,y,48,48,'#795342');for(let i=0;i<5;i++)px(c,x+(i*17+tx*3)%42,y+(i*19+ty*9)%42,3,2,i%2?'#b48458':'#4f3532');}if(t==='metal'){px(c,x,y,48,48,'#585963');for(let i=0;i<3;i++){px(c,x+2,y+i*16,44,2,'#8a8180');px(c,x+((tx+i)%2?27:10),y+i*16,2,16,'#373c46');}px(c,x+6,y+7,3,3,'#c4ab79');}if(t==='ember'){const flick=(ambientTick+tx+ty)%3;px(c,x,y,48,48,'#64382e');for(let i=0;i<4;i++){const oy=(ty*5+i*13)%38;px(c,x+4+i*11,y+oy,9,5,(i+flick)%2?'#f4a548':'#e76d3c');px(c,x+5+i*11,y+oy+1,4,3,flick===1?'#ffe2a4':'#ffd58c');}px(c,x+18,y+40,12,2,flick===0?'#ffce76':'#9c5640');}if(t==='flood'){const ripple=(ambientTick+tx*2+ty*3)%5;px(c,x,y,48,48,'#477b8c');for(let i=0;i<3;i++){px(c,x+3+(tx*5+i*13+ripple)%29,y+9+i*13,24,2,'#9bc2c7');px(c,x+9+i*7,y+12+i*13,13,2,'#658f9d');}px(c,x+6+ripple,y+40,20,1,'#c7e9ed');}if(t==='marble'){const shine=(ambientTick+tx+ty)%6;px(c,x,y,48,48,'#81969d');px(c,x,y+23,48,2,'#526873');px(c,x+24+(ty%2?11:0),y,2,23,'#59727d');px(c,x+8,y+9,7,3,'#a5b6af');px(c,x+5+shine*6,y+6,4,2,'#d9e7ea55');}if(t==='bridge'){px(c,x,y,48,48,'#285f6d');for(let i=0;i<4;i++){px(c,x,y+i*12,48,10,'#a58b61');px(c,x+3,y+i*12+3,40,2,'#d5bd85');}px(c,x,y,5,48,'#534c3e');px(c,x+43,y,5,48,'#534c3e');}
 if(t==='house'){const styles=[{wall:'#c59668',roof:'#617182',trim:'#f0e1b4',door:'#6d4c39',win:'#efd9a6'},{wall:'#a5a7ae',roof:'#596372',trim:'#ece8dc',door:'#5c5451',win:'#c9d6e3'},{wall:'#866255',roof:'#494548',trim:'#dfb37c',door:'#352926',win:'#ffc487',glow:'#ec7b44'},{wall:'#bcc6c7',roof:'#6d8090',trim:'#f6f1e7',door:'#55636b',win:'#d2eef0'}][Math.max(0,Math.min(3,r||0))];px(c,x+3,y+11,42,31,styles.wall);px(c,x+1,y+8,46,6,styles.trim);px(c,x,y+3,48,12,styles.roof);px(c,x+5,y,38,5,styles.roof);px(c,x+18,y+24,12,18,styles.door);const glow=(ambientTick+tx+ty)%3===0;px(c,x+8,y+20,9,9,glow&&r!==1?(r===3?'#e1fbff':'#ffdf9d'):styles.win);px(c,x+31,y+20,9,9,glow&&r!==1?(r===3?'#d2f3fb':'#f3cf8c'):styles.win);px(c,x+20,y+7,8,5,'#ffffff18');if(r===2){px(c,x+35,y+5,5,10,'#2d3136');px(c,x+36,y+2,3,4,glow?(styles.glow||'#f29a55'):(styles.glow||'#e57a47'));}if(r===3){px(c,x+3,y+32,42,2,'#91a6b2');}}
}
const symbols={town:'⌂',dungeon:'▥',inn:'Z',shop:'$',forge:'⚒',npc:'!',board:'?',exit:'↓',leave:'↓',up:'▲',down:'▼',spring:'≈',chest:'▣',boulder:'■',plate:'○',lever:'!',door:'▤',keydoor:'⚿',worldgate:'▤',trial:'✦',boss:'♛',enemy:'●',obstacle:'×',resident:'❢',hollowResident:'❢',hollowFountain:'◉',valewynWitness:'❢',civicPlan:'⚖',tideSluice:'◉',tidePump:'✺',royalRecord:'▧',royalCache:'▣',royalPrinciple:'♜',lyraMemory:'✧',emberWitness:'❢',coolantStation:'❄',heatValve:'◉',forgeFan:'✺',oreLedger:'▧',forgeCache:'▣',forgeOath:'⚒',bramMemory:'✧',mirror:'◇',mirrorMemory:'✧',hollowPortrait:'▧',hollowCache:'▣',memoryVow:'✦',bell:'♬',sign:'➜',inscription:'✎',lantern:'✧',secret:'▣',prism:'◇',prismChest:'✧',wardstone:'✦',windVane:'✺',mirageLens:'◇',oracleMemory:'✧',oracleRecord:'▧',oracleCache:'▣',oracleVow:'✦',oracleWitness:'❢',oracleShrine:'◈',skyWitness:'❢',skyBeacon:'◈',firstWitness:'❢',firstConcordance:'✧',indexEngine:'▦',printingPlate:'▧',firstRecord:'▤',firstCache:'▣',finalVow:'✦',keeperMemory:'✧',frostWitness:'❢',frostHearth:'✹',frostBeacon:'☼',frostLens:'◇',frostRecord:'▧',frostCache:'▣',frostVow:'✦',noxMemory:'✧'};
function objectArt(c,x,y,o){
 const bob=['npc','resident','hollowResident','emberWitness','valewynWitness','lantern','lyraMemory','mirrorMemory','bramMemory','oracleMemory','aerisMemory','memoryVow','prism'].includes(o.type)?(((ambientTick+o.x+o.y)%6)<3?0:-1):0;
 const glowFrame=(ambientTick+o.x*2+o.y)%4;
 const shadow=(w=26,h=10,col='#00000055')=>{if(c.ellipse){c.fillStyle=col;c.beginPath();c.ellipse(x+24,y+41,w/2,h/2,0,0,Math.PI*2);c.fill();}else px(c,x+11,y+36,w,h,col);};
 const servicePlaque=(fill,label)=>{px(c,x+13,y+35,22,9,'#13222aee');px(c,x+14,y+36,20,7,fill);c.fillStyle='#13222a';c.font='bold 8px system-ui';c.textAlign='center';c.textBaseline='middle';c.fillText(label,x+24,y+40);};
 if(['board','sign','inscription'].includes(o.type)){shadow(18,6);px(c,x+21,y+10,6,29,'#58463a');px(c,x+10,y+7,28,17,o.type==='inscription'?'#8a7b69':'#7a5e49');px(c,x+12,y+9,24,13,'#d6c197');c.fillStyle='#213039';c.font='bold 14px Georgia';c.textAlign='center';c.textBaseline='middle';c.fillText(symbols[o.type]||'?',x+24,y+16);return;}
 if(['exit','leave','up','down'].includes(o.type)){shadow(22,8);px(c,x+11,y+9,26,24,'#314451');px(c,x+14,y+12,20,18,'#445d69');c.fillStyle='#f1e2aa';c.font='bold 20px Georgia';c.textAlign='center';c.textBaseline='middle';c.fillText(symbols[o.type]||'↓',x+24,y+21);return;}
 if(['bell','hollowFountain','coolantStation','civicPlan','oracleShrine','skyBeacon','frostHearth','firstConcordance'].includes(o.type)){shadow(20,8);px(c,x+14,y+30,20,7,'#24353e');px(c,x+17,y+17+bob,14,15,o.type==='coolantStation'?(glowFrame%2?'#84d5ff':'#6fa3bf'):o.type==='hollowFountain'?(glowFrame%2?'#84c5d4':'#658da1'):'#6c5c76');if(o.type==='hollowFountain'){px(c,x+19,y+22+bob,10,2,glowFrame%2?'#d8f7ff':'#b3dfe8');}c.fillStyle='#f1e2aa';c.font='bold 16px Georgia';c.textAlign='center';c.textBaseline='middle';c.fillText(symbols[o.type]||'?',x+24,y+24+bob);return;}
 if(worldArt&&worldArt.complete&&worldArt.naturalWidth){
   const tiles={inn:[0,0,130,120,-41,-70],shop:[3,0,130,120,-41,-70],forge:[1,0,130,120,-41,-70],town:[0,0,70,72,-10,-26],dungeon:[2,2,72,85,-12,-39],spring:[0,2,55,53,-4,-6],chest:[3,2,49,42,0,3],prismChest:[3,2,49,42,0,3],hollowCache:[3,2,49,42,0,3],royalCache:[3,2,49,42,0,3],oracleCache:[3,2,49,42,0,3],skyCache:[3,2,49,42,0,3],oracleMemory:[2,2,55,65,-3,-20],aerisMemory:[2,2,55,65,-3,-20],mirageLens:[2,2,55,68,-4,-22],lyraMemory:[2,2,55,65,-3,-20],prism:[2,2,55,68,-4,-22],mirror:[2,2,55,68,-4,-22],lantern:[0,3,44,71,0,-28],wardstone:[2,2,55,65,-3,-20],memoryVow:[2,2,55,65,-3,-20],mirrorMemory:[2,2,55,65,-3,-20],secret:[3,2,49,42,0,3]};
   const t=tiles[o.type];
   if(t){shadow(['inn','shop','forge'].includes(o.type)?34:24,['inn','shop','forge'].includes(o.type)?12:10);c.drawImage(worldArt,t[0]*256,t[1]*256,256,256,x+t[4],y+t[5]+(['inn','shop','forge'].includes(o.type)?bob:0),t[2],t[3]);if(o.type==='inn'){servicePlaque('#95c6e9','INN');px(c,x+20,y+10,8,4,glowFrame%2?'#ffe9aa':'#d7c07b');}if(o.type==='shop'){servicePlaque('#e9cb7a','SHOP');px(c,x+17,y+15,14,3,glowFrame%2?'#f7db8d':'#c99d54');}if(o.type==='forge'){servicePlaque('#d89a82','FORGE');px(c,x+16,y+14,14,4,glowFrame%2?'#ffbb7f':'#e67c49');}return;}
 }
 if(['npc','resident','hollowResident','emberWitness','valewynWitness','oracleWitness','skyWitness','frostWitness','firstWitness'].includes(o.type)){shadow(18,8);hero(c,x,y+bob,o.type==='npc'?1:o.type==='emberWitness'?2:o.type==='valewynWitness'?1:o.clue==='iris'?2:0);return;}
 const danger=['enemy','boss'].includes(o.type);shadow(22,8,danger?'#00000066':'#00000050');px(c,x+9,y+8+bob,31,32,danger?'#6b394c':o.type==='trial'?'#54496f':'#354945');px(c,x+10,y+8+bob,29,3,danger?'#d98d91':'#dacb8a');if(['lantern','memoryVow','mirrorMemory','bramMemory','lyraMemory','prism'].includes(o.type)){px(c,x+16,y+6+bob,16,6,glowFrame%2?'#f3df9b66':'#9fcfed44');}c.textAlign='center';c.textBaseline='middle';c.fillStyle=danger?'#efb0ac':'#f2df9a';c.font='bold 27px Georgia';c.fillText(symbols[o.type]||'?',x+24,y+25+bob);}
let camera={x:0,y:0};
function drawMap(){const cv=document.getElementById('field');if(!cv)return;const c=cv.getContext('2d'),s=game.s,m=game.map();camera={x:compactMap()?Math.max(-5,Math.min(m.w-12,s.x-8)):Math.max(0,Math.min(m.w-17,s.x-8)),y:Math.max(0,Math.min(m.h-13,s.y-6))};c.imageSmoothingEnabled=false;
for(let y=0;y<13;y++)for(let x=0;x<17;x++){const tx=x+camera.x,ty=y+camera.y,tile=m.tiles[ty]?.[tx]||'wall',region=s.place==='world'?LQ.regionAt(tx,ty):s.region;const authored=(SceneArt&&SceneArt.tile(c,x*48,y*48,tile,region,tx,ty,ambientTick,m,s.place,s.floor))||(s.place==='town'&&Art.tile(c,x*48,y*48,tile,region,tx,ty,ambientTick,m));if(!authored)terrainEnhanced(c,x*48,y*48,tile,region,tx,ty);}
if(typeof c.createLinearGradient==='function'&&(s.place==='town'||s.place==='world')){const haze=c.createLinearGradient(0,0,0,624),phase=timeState(s.steps);if(haze&&typeof haze.addColorStop==='function'){haze.addColorStop(0,phase.overlay[0]);haze.addColorStop(.62,'#00000000');haze.addColorStop(1,phase.overlay[1]);c.fillStyle=haze;c.fillRect(0,0,816,624);}}
if(s.place==='dungeon'&&typeof c.createRadialGradient==='function'){const glow=c.createRadialGradient((s.x-camera.x)*48+24,(s.y-camera.y)*48+24,45,(s.x-camera.x)*48+24,(s.y-camera.y)*48+24,510);if(glow&&typeof glow.addColorStop==='function'){glow.addColorStop(0,'#00000000');glow.addColorStop(1,'#06132660');c.fillStyle=glow;c.fillRect(0,0,816,624);}}
if(worldArt&&worldArt.complete&&worldArt.naturalWidth&&s.place==='world'){for(let ty=camera.y;ty<camera.y+13;ty++)for(let tx=camera.x;tx<camera.x+17;tx++){if(m.tiles[ty]?.[tx]!=='tree'||(tx*7+ty*11)%9!==0)continue;const x=(tx-camera.x)*48,y=(ty-camera.y)*48;c.drawImage(worldArt,256,256,256,256,x-14,y-37,77,86);}}
const obs=game.objects().filter(o=>o.x>=camera.x&&o.y>=camera.y&&o.x<camera.x+17&&o.y<camera.y+13);
if(SceneArt&&s.region===0&&(s.place==='town'||s.place==='dungeon'&&s.floor===0))SceneArt.overlay(c,m,camera,ambientTick,s.place,s.floor);
if((s.place==='town'||(s.place==='dungeon'&&(s.region===5||s.region===6)))&&m.decor)for(const d of m.decor)Art.prop(c,d,camera,s.region,ambientTick);
obs.forEach(o=>{const x=(o.x-camera.x)*48,y=(o.y-camera.y)*48;if(SceneArt&&s.region===0&&SceneArt.object(c,x,y,o,ambientTick,s.place)){}else if(s.place==='town'&&['inn','shop','forge'].includes(o.type))Art.service(c,x,y,o,s.region,ambientTick);else objectArt(c,x,y,o);});
if(s.place==='town'&&Citizens){ensureCitizens();Citizens.draw(citizens,c,citizenArt,camera,s,ambientTick);}
obs.filter(o=>o.type==='tideSluice'||o.type==='tidePump').forEach(o=>{const raw=s.flags[(o.type==='tideSluice'?'lq:vale:sluice:':'lq:vale:pump:')+o.id]||0,txt=o.type==='tideSluice'?['0','LO','HI','REL'][raw]:['×','IN','PUR'][raw],aligned=raw===o.goal,x=(o.x-camera.x)*48+31,y=(o.y-camera.y)*48+42;c.fillStyle=aligned?'#b6e4cf':'#f6cf8b';c.fillRect(x-13,y-16,27,20);c.fillStyle='#1a3644';c.font='bold 10px system-ui';c.textAlign='center';c.fillText(txt,x,y-2);});
obs.filter(o=>o.type==='heatValve'||o.type==='forgeFan').forEach(o=>{const raw=s.flags[(o.type==='heatValve'?'lq:ember:valve:':'lq:ember:fan:')+o.id]||0,txt=o.type==='heatValve'?['↑','→','↓','←'][raw]:['×','IN','EX'][raw],aligned=raw===o.goal,x=(o.x-camera.x)*48+32,y=(o.y-camera.y)*48+42;c.fillStyle=aligned?'#9be2c7':'#ffd18a';c.fillRect(x-12,y-16,24,20);c.fillStyle='#203037';c.font='bold 11px system-ui';c.textAlign='center';c.fillText(txt,x,y-2);});
obs.filter(o=>o.type==='windVane'||o.type==='mirageLens').forEach(o=>{const current=s.flags[(o.type==='windVane'?'lq:oracle:vane:':'lq:oracle:lens:')+o.id]||0;const text=o.type==='windVane'?['N','E','S','W'][current]:['--','TRUE','FALSE'][current];const aligned=current===o.goal,x=(o.x-camera.x)*48+24,y=(o.y-camera.y)*48+45;c.fillStyle=aligned?'#bce3bd':'#f5ce92';c.fillRect(x-19,y-16,38,20);c.fillStyle='#20363c';c.font='bold 10px system-ui';c.textAlign='center';c.textBaseline='middle';c.fillText(text,x,y-6);});
obs.filter(o=>o.type==='skyVane'||o.type==='skyRelay').forEach(o=>{const k=(o.type==='skyVane'?'lq:sky:vane:':'lq:sky:relay:')+o.id,raw=s.flags[k]||0,txt=o.type==='skyVane'?['N','E','S','W'][raw]:['OFF','REC','AMP'][raw],aligned=raw===o.goal,x=(o.x-camera.x)*48+24,y=(o.y-camera.y)*48+42;c.fillStyle=aligned?'#bbecda':'#ffe39c';c.fillRect(x-17,y-17,34,20);c.fillStyle='#1d3444';c.font='bold 10px system-ui';c.textAlign='center';c.textBaseline='middle';c.fillText(txt,x,y-6);});
obs.filter(o=>o.type==='indexEngine'||o.type==='printingPlate').forEach(o=>{const k=(o.type==='indexEngine'?'lq:first:index:':'lq:first:plate:')+o.id,raw=s.flags[k]||0,txt=o.type==='indexEngine'?['VOID','NAME','MEM','CHSE'][raw]:['OFF','WIT','RST'][raw],aligned=raw===o.goal,x=(o.x-camera.x)*48+24,y=(o.y-camera.y)*48+42;c.fillStyle=aligned?'#e9d5a1':'#adabc4';c.fillRect(x-19,y-17,38,20);c.fillStyle='#3a2d38';c.font='bold 10px system-ui';c.textAlign='center';c.textBaseline='middle';c.fillText(txt,x,y-6);});
obs.filter(o=>o.type==='frostBeacon'||o.type==='frostLens').forEach(o=>{const k=(o.type==='frostBeacon'?'lq:frost:beacon:':'lq:frost:lens:')+o.id,raw=s.flags[k]||0,txt=o.type==='frostBeacon'?['OFF','RISE','NOON','DUSK'][raw]:['OFF','IN','REF'][raw],aligned=raw===o.goal,x=(o.x-camera.x)*48+24,y=(o.y-camera.y)*48+42;c.fillStyle=aligned?'#b5e8df':'#dfe3a8';c.fillRect(x-19,y-17,38,20);c.fillStyle='#163849';c.font='bold 10px system-ui';c.textAlign='center';c.textBaseline='middle';c.fillText(txt,x,y-6);});
obs.filter(o=>o.type==='mirror').forEach(o=>{const direction=['↑','→','↓','←'][(s.flags['lq:mirror:'+o.id]||0)%4],aligned=(s.flags['lq:mirror:'+o.id]||0)===o.goal,x=(o.x-camera.x)*48+31,y=(o.y-camera.y)*48+41;c.fillStyle=aligned?'#b7e3c4':'#fde0a2';c.fillRect(x-9,y-15,18,19);c.fillStyle='#15232a';c.font='bold 16px system-ui';c.textAlign='center';c.textBaseline='middle';c.fillText(direction,x,y-6);});
const guide=game.guide(),beacon=obs.find(o=>o.id===guide?.id),hovered=hoverTile?(obs.find(o=>o.x===hoverTile.x&&o.y===hoverTile.y)||citizenAt(hoverTile.x,hoverTile.y)):null;
if(beacon){const bx=(beacon.x-camera.x)*48+24,by=(beacon.y-camera.y)*48+24;c.strokeStyle='#f5d18c';c.lineWidth=3;c.strokeRect(bx-21,by-21,42,42);c.fillStyle='#fbe0a1';c.font='bold 22px Georgia';c.textAlign='center';c.fillText('◆',bx,by-25);} 
drawRoute(c,s);
hero(c,(s.x-camera.x)*48,(s.y-camera.y)*48);
if(s.place==='town'){obs.filter(isTownLandmark).forEach(o=>{const mx=(o.x-camera.x)*48+24,my=(o.y-camera.y)*48+12;if((ambientTick+o.x+o.y)%5===0){c.strokeStyle=markerColor(o)+'66';c.strokeRect(mx-9,my-26,18,18);}drawMarker(c,mx,my,markerColor(o));const badge=townBadge(o);if(badge&&(Math.abs(o.x-s.x)+Math.abs(o.y-s.y)<=2||hovered?.id===o.id||beacon?.id===o.id)){drawBubble(c,mx,my-31,badge[0],badge[1], '#112029');}});if(!compactMap())drawMiniMap(c,m,s,obs,hovered||beacon);}
if(hovered){const hx=(hovered.x-camera.x)*48,hy=(hovered.y-camera.y)*48;c.strokeStyle='#f2df9a';c.lineWidth=2;c.strokeRect(hx+2,hy+2,44,44);} 
if(s.place==='town'&&citizens){
 const nearby=Citizens.near(citizens,s,3).filter(o=>o.y>=camera.y&&o.y<camera.y+13&&o.x>=camera.x&&o.x<camera.x+17);
 const someone=nearby.find(o=>o.id===hovered?.id)||nearby.find(o=>o.paused>12)||(ambientTick%55<17?nearby[0]:null);
 if(someone){const name=someone.name.split(' ')[0],xx=(someone.drawX-camera.x)*48+23,yy=(someone.drawY-camera.y)*48-24;drawCallout(c,xx,yy,name+' · '+(someone.paused>10?'Hello!':'♪'),'#b9d3aa');}
}
const focus=new Map();
obs.filter(o=>showInlineLabel(o)&&Math.abs(o.x-s.x)+Math.abs(o.y-s.y)<=1).forEach(o=>focus.set(o.id,o));
if(hovered&&hovered.type!=='citizen')focus.set(hovered.id,hovered);
if(beacon)focus.set(beacon.id,beacon);
if(s.place==='town')obs.filter(o=>isTownLandmark(o)&&Math.abs(o.x-s.x)+Math.abs(o.y-s.y)<=3).slice(0,2).forEach(o=>focus.set(o.id,o));
[...focus.values()].forEach(o=>{const x=(o.x-camera.x)*48+24,y=(o.y-camera.y)*48-4,label=o.label.length>28?o.label.slice(0,26)+'…':o.label;if(!compactMap()||hovered?.id===o.id||Math.abs(o.x-s.x)+Math.abs(o.y-s.y)<=1)drawCallout(c,x,y,label,markerColor(o));});
cv.onclick=e=>{if(modal)return;const r=cv.getBoundingClientRect(),x=Math.floor((e.clientX-r.left)/r.width*17)+camera.x,y=Math.floor((e.clientY-r.top)/r.height*13)+camera.y;const o=game.objects().find(o=>o.x===x&&o.y===y);if(o){if(Math.abs(x-s.x)+Math.abs(y-s.y)<=1)interact(o);else walkTo(o.x,o.y,o);return;}const citizen=citizenAt(x,y);if(citizen){seekCitizen(citizen);return;}walkTo(x,y);};
cv.onmousemove=e=>{const b=cv.getBoundingClientRect(),x=Math.floor((e.clientX-b.left)/b.width*17)+camera.x,y=Math.floor((e.clientY-b.top)/b.height*13)+camera.y;cv.title=game.objects().find(o=>o.x===x&&o.y===y)?.label||citizenAt(x,y)?.name||m.tiles[y]?.[x]||'';if(!hoverTile||hoverTile.x!==x||hoverTile.y!==y){hoverTile={x,y};drawMap();updateFocusPanel();}};
cv.onmouseleave=()=>{hoverTile=null;cv.title='';drawMap();updateFocusPanel();};}
function stopWalk(){route=[];routeTarget=null;clearInterval(walking);walking=null;}
function stopHeldMovement(){holdDirection=null;clearTimeout(holdDelay);clearInterval(holdRepeat);holdDelay=null;holdRepeat=null;}
function walkTo(tx,ty,goal=null){
 stopWalk();if(!game||game.battle||modal)return;
 const state=game.s,place=state.place,region=state.region,obs=game.objects(),dirs=[[0,1],[1,0],[0,-1],[-1,0]];
 const candidates=goal?dirs.map(([dx,dy])=>[tx+dx,ty+dy]):[[tx,ty]];
 const ends=new Set(candidates.filter(([x,y])=>!game.blocked(x,y)&&!(state.place==='world'&&!game.available(LQ.regionAt(x,y)))).map(([x,y])=>x+','+y));
 if(!ends.size){game.emit('That destination has no accessible approach.');render();return;}
 const previous=new Map(),startKey=state.x+','+state.y,queue=[[state.x,state.y]];
 previous.set(startKey,null);
 let found=null;
 for(let i=0;i<queue.length;i++){
  const [x,y]=queue[i],key=x+','+y;if(ends.has(key)){found=key;break;}
  for(const [dx,dy] of dirs){
   const nx=x+dx,ny=y+dy,next=nx+','+ny;
   if(previous.has(next)||game.blocked(nx,ny)||state.place==='world'&&!game.available(LQ.regionAt(nx,ny)))continue;
   const obstacle=obs.find(q=>q.x===nx&&q.y===ny);
   if(obstacle&&['enemy','boss','boulder','obstacle'].includes(obstacle.type))continue;
   if(obstacle?.type==='door'&&!state.flags[obstacle.requires]||obstacle?.type==='keydoor'&&!state.flags['key'+state.region]||obstacle?.type==='worldgate'&&!state.cleared.includes(obstacle.r))continue;
   previous.set(next,{prev:key,dx,dy});queue.push([nx,ny]);
  }
 }
 if(found===null){chatAfterWalk=null;game.emit('No open path yet. Follow the accessible corridors or release the gate.');render();return;}
 const steps=[];
 for(let key=found;key!==startKey;){const info=previous.get(key);if(!info)break;steps.push([info.dx,info.dy]);key=info.prev;}
 route=steps.reverse();
 routeTarget=goal||{x:tx,y:ty,label:'Selected destination'};
 function arrived(){
  stopWalk();
  if(!game||modal||game.battle||game.s.place!==place||game.s.region!==region)return;
  const target=goal&&game.objects().find(q=>q.id===goal.id);
  if(target&&Math.abs(game.s.x-target.x)+Math.abs(game.s.y-target.y)<=1){chatAfterWalk=null;interact(target);return;}
  const actor=citizens?.people.find(o=>o.id===chatAfterWalk);chatAfterWalk=null;
  if(actor&&Math.abs(actor.x-game.s.x)+Math.abs(actor.y-game.s.y)<=1)talkCitizen(actor);
 }
 if(!route.length){arrived();return;}
 walking=setInterval(()=>{
  if(!route.length||modal||game.battle||game.s.place!==place||game.s.region!==region){stopWalk();return;}
  const [dx,dy]=route.shift(),oldX=game.s.x,oldY=game.s.y;
  move(dx,dy,true);
  if(game.s.x===oldX&&game.s.y===oldY||game.battle){stopWalk();return;}
  if(!route.length)arrived();
 },125);
}
function move(dx,dy,auto=false){if(!game||modal||game.battle)return;if(!auto)stopWalk();store();game.move(dx,dy);chosen='attack';target=0;render();}
function interact(o){if(!o&&!game.nearby().length&&citizenNear().length){talkCitizen(citizenNear()[0]);return;}stopWalk();store();const result=game.interact(o);if(result?.screen==='battle')battleReport=null;if(result&&typeof result==='object'&&['inn','shop','forge'].includes(result.screen)&&game.s.place==='town'){stopInteriorWalk();interior=Interiors.create(result.screen,game.s.region,result.label);interiorMessage='Welcome to '+result.label+'. Walk up to the counter to speak with the attendant.';modal=null;renderInterior();return;}if(result&&typeof result==='object'&&result.screen!=='battle'){modal=result;}render();}

function stopInteriorWalk(){interiorRoute=[];if(interiorTimer!==null)clearInterval(interiorTimer);interiorTimer=null;}
function interiorLeave(){stopInteriorWalk();interior=null;modal=null;interiorMessage='';game.emit('You step out into the town square.');render();}
function interiorUse(id){
 if(!interior)return;
 const options=Interiors.adjacent(interior),o=id?options.find(q=>q.id===id):options.find(q=>q.type!=='exit')||options[0];
 if(!o){interiorMessage='Move close to the counter, an object, or the door first.';renderInterior();return;}
 if(o.type==='exit'){interiorLeave();return;}
 if(o.type==='service'){modal={screen:interior.kind,label:interior.label};interiorMessage='';renderInterior();return;}
 modal={screen:'dialog',title:o.label,text:o.text};interiorMessage=o.label+' inspected.';renderInterior();
}
function interiorStep(dx,dy,auto=false){
 if(!interior||modal)return;
 if(!auto)stopInteriorWalk();
 const moved=Interiors.step(interior,dx,dy);
 interiorMessage=moved?'You move through '+interior.label+'.':'Furniture blocks that way. Follow an open aisle.';
 if(auto){drawInterior();return;}
 renderInterior();
}
function interiorGoTo(x,y){
 if(!interior||modal)return;
 stopInteriorWalk();
 const path=Interiors.route(interior,x,y);
 if(!path){interiorMessage='That furnishing cannot be crossed. Choose an open tile.';renderInterior();return;}
 if(path.length===0){const here=Interiors.adjacent(interior).find(o=>o.x===x&&o.y===y);if(here)interiorUse(here.id);else renderInterior();return;}
 interiorRoute=path.slice();interiorMessage='Walking through the room…';
 interiorTimer=setInterval(()=>{
  if(!interior||modal||!interiorRoute.length){stopInteriorWalk();return;}
  const [dx,dy]=interiorRoute.shift();
  interiorStep(dx,dy,true);
  if(interiorRoute.length===0){stopInteriorWalk();const here=Interiors.adjacent(interior).find(o=>o.x===x&&o.y===y);if(here)interiorUse(here.id);else renderInterior();}
 },120);
}
function drawInterior(){
 if(!interior)return;
 const cv=document.getElementById('interiorField');if(!cv)return;
 const c=cv.getContext('2d');if(!c)return;
 Interiors.draw(interior,c,ambientTick,citizenArt);
 cv.onclick=e=>{
  if(modal)return;
  const b=cv.getBoundingClientRect();
  const tx=Math.min(interior.w-1,Math.max(0,Math.floor((e.clientX-b.left)/b.width*interior.w)));
  const ty=Math.min(interior.h-1,Math.max(0,Math.floor((e.clientY-b.top)/b.height*interior.h)));
  interiorGoTo(tx,ty);
 };
}
function renderInterior(){
 if(!interior)return;
 store();music();
 const s=game.s,r=interior,adj=Interiors.adjacent(r),p=Interiors.THEMES[r.region],menu=Interiors.ROOMS[r.kind],near=adj.filter(o=>o.type!=='exit');
 const actions=near.map(o=>button(esc(o.label),'interiorUse','data-id="'+o.id+'"',o.type==='service'?'primary':'')).join('');
 app.innerHTML=header()+'<main class="interior-shell"><div class="interior-heading"><div><span class="eyebrow">'+esc(p.name)+' · '+esc(menu.name)+'</span><h2>'+esc(r.label)+'</h2><p>'+esc(regionServiceText(r.kind,r.region)[1])+'</p></div>'+button('← Return to town','interiorExit')+'</div><div class="interior-layout"><section class="interior-stage"><div class="interior-mapframe"><canvas id="interiorField" width="720" height="480" aria-label="Walkable '+esc(r.kind)+' interior; use WASD or arrow keys to move, E to interact."></canvas><div class="interior-map-tag">WALKABLE INTERIOR · '+esc(timeState(s.steps).label.toUpperCase())+'</div></div><div class="interior-message" role="status">'+esc(interiorMessage||'Walk to the service counter. You can also inspect objects and leave by the south doorway.')+'</div><div class="interior-controls"><div class="interior-pad">'+button('↑','interiorStep','data-dx="0" data-dy="-1" aria-label="Move north"','up')+button('←','interiorStep','data-dx="-1" data-dy="0" aria-label="Move west"','left')+button('↓','interiorStep','data-dx="0" data-dy="1" aria-label="Move south"','down')+button('→','interiorStep','data-dx="1" data-dy="0" aria-label="Move east"','right')+'</div><div class="interior-action-stack">'+button(near.length?'Interact · '+esc(near[0].label):'Interact · E / Space','interiorUse',near.length?'data-id="'+near[0].id+'"':'','primary')+'<small>WASD / arrows to walk · Tap a floor tile to auto-walk · E to interact</small></div></div></section><aside class="interior-aside"><section class="panel"><span class="eyebrow">A place with a purpose</span><h3>Inside '+esc(r.label)+'</h3><p>'+esc(regionServiceText(r.kind,r.region)[1])+'</p><div class="interior-quicklist">'+r.objects.filter(o=>o.type!=='exit').map(o=>'<button data-action="interiorGoto" data-x="'+o.x+'" data-y="'+o.y+'"><b>'+esc(o.label)+'</b><small>'+esc(o.text)+'</small></button>').join('')+'</div></section><section class="panel"><span class="eyebrow">Nearby</span><div class="interior-nearby">'+(actions||'<small>Move closer to the counter or an object to interact.</small>')+'</div></section><section class="panel interior-notes"><span class="eyebrow">Party status</span><div>'+s.party.map(p=>'<span>'+esc(p.name)+' · '+p.hp+'/'+p.maxhp+' HP</span>').join('')+'</div><p>'+s.gold+' gold · '+s.potions+' Potions · '+s.ethers+' Ethers</p></section></aside></div></main>';
 drawInterior();if(modal)renderModal();
}

function combatGuideHTML(){return '<div class="combat-help-grid"><section><span class="eyebrow">1 · Choose a command</span><h3>Pick the best action for this turn</h3><p><b>Attack</b> deals damage, trains your weapon and grants 22 Focus. <b>Defend</b> halves incoming damage, restores 2 MP and grants 18 Focus. Spells and techniques generate 14 Focus, plus a bonus for hitting elemental weaknesses.</p></section><section><span class="eyebrow">2 · Read enemy intent</span><h3>Respond to threats</h3><p>Red alerts mean a heavy move is approaching. Guard, use Aegis, or interrupt a charge if you can. When a guardian summons protective copies, defeat those copies before trying to damage the guardian.</p></section><section><span class="eyebrow">3 · Pick the target</span><h3>Click a foe or ally</h3><p>Enemies show <b>Weak</b> and <b>Resists</b> beside their HP. Healing and items target your party. A highlighted card indicates your current choice. Confirm your action to advance to the next companion.</p></section><section><span class="eyebrow">4 · Build Resonance</span><h3>Combine all three companions</h3><p>At 100 Focus, when all three allies are alive, use <b>Triad Resonance</b> to hit all living foes and bypass armor. Boss wards may reduce damage to the boss until protective summons are defeated.</p></section></div><p class="notice">Keyboard: 1–9 to select actions, ←/→ to cycle targets, Enter to confirm, G to defend, R to retreat from regular encounters.</p>';}
function runCombatAction(action,tgt){
 const prev=BattleUX&&game?.battle?BattleUX.snapshot(game):null;
 const ok=game.act(action,tgt);
 if(ok&&prev&&BattleUX)battleReport=BattleUX.summary(prev,game,action);
 chosen='attack';target=0;render();
}
function renderBattle(){
 const b=game.battle;if(!b)return render();const p=game.s.party[b.actor];music();
 const abilityInfo={attack:['Attack','0 MP · +22 Focus','Basic weapon damage; advances weapon mastery.'],guard:['Defend','0 MP · +18 Focus','Halve incoming damage and recover 2 MP.'],potion:['Potion',game.s.potions+' remaining','Restore up to 65 HP to a living ally.'],ether:['Ether',game.s.ethers+' remaining','Restore up to 18 MP to an ally.']};
 if(!game.abilities(p).includes(chosen))chosen='attack';
 const ally=['mend','revive','potion','ether'].includes(chosen),noTarget=['guard','ward','resonance'].includes(chosen),targets=ally?game.s.party:b.enemies;
 if(!targets[target]||(chosen==='revive'?targets[target].hp>0:targets[target].hp<=0))target=targets.findIndex(t=>chosen==='revive'?t.hp===0:t.hp>0);
 const intel=b.enemies.map((e,i)=>BattleUX?BattleUX.enemyIntel(game,b,e,i):{name:e.name,raw:game.intent(e),kind:e.charge?'danger':'basic',percent:e.hp/e.maxhp*100,weak:e.weak,resist:e.resist,alive:e.hp>0,defense:e.fortified,break:e.broken,charge:e.charge});
 const coach=BattleUX?BattleUX.suggest(game,chosen,target):{level:'info',label:'Choose your action',text:'Use a command, select a target, then confirm.'};
 const preview=BattleUX?BattleUX.actionPreview(game,chosen,target):'Select a command and target.';
 const timeline=BattleUX?BattleUX.timeline(game):[];
 const phase=b.boss?' · Phase '+((b.phase||0)+1):'';
 const activeTarget=targets[target];
 const enemyCards=b.enemies.map((e,i)=>{
  const v=intel[i],status=v.kind==='danger'?'DANGER':v.kind==='shield'?'PROTECTED':v.kind==='support'?'UTILITY':'STRIKE';
  return '<button data-action="enemyTarget" data-id="'+i+'" aria-label="Target '+esc(e.name)+'. '+esc(v.raw)+'" class="enemy tactical-enemy '+(!ally&&target===i?'selected ':'')+(e.hp<=0?'dead ':'')+'threat-'+v.kind+'" '+(e.hp<=0?'disabled':'')+'><div class="enemy-intent threat-'+v.kind+'"><span class="intent-dot"></span>'+status+'</div><div class="enemy-art '+(b.boss?'boss':'')+'" style="background-position:'+((b.origin.r+i)%4*100/3)+'% '+(b.origin.r>=4?100:0)+'%"></div><b class="enemy-name">'+esc(e.name)+'</b><div class="bar enemy-hp"><i style="width:'+v.percent+'%"></i></div><span class="enemy-numbers">'+e.hp+' / '+e.maxhp+' HP</span><div class="enemy-affinities"><span>Weak: <b>'+esc(e.weak||'none')+'</b></span><span>Resists: '+esc(e.resist||'none')+'</span></div><div class="intent-text">'+esc(v.raw)+'</div>'+(v.break?'<div class="enemy-break">Armor broken · '+v.break+'</div>':'')+'</button>';
 }).join('');
 const last=b.log.slice(-7);
 const reports=battleReport&&battleReport.lines?.length?'<div class="battle-result-strip" role="status"><strong>Last action</strong>'+battleReport.lines.map(item=>'<span class="battle-result '+item.type+'">'+esc(item.text)+'</span>').join('')+'</div>':'';
 const actionButtons=game.abilities(p).map((a,i)=>{const sk=skills[a],info=abilityInfo[a]||[sk.name,sk.cost+' MP · Rank '+skillRank(p,a),sk.desc];const disabled=(sk&&p.mp<sk.cost)||(a==='potion'&&game.s.potions===0)||(a==='ether'&&game.s.ethers===0);return button('<strong><kbd>'+(i+1)+'</kbd> '+esc(info[0])+'</strong><span class="gold compact">'+esc(info[1])+'</span><small>'+esc(info[2])+'</small>','ability','data-id="'+a+'" '+(disabled?'disabled':''),'command '+(chosen===a?'chosen':''));}).join('');
 const targetButtons=noTarget?'<span class="muted">This action needs no target.</span>':targets.map((t,i)=>button(esc(t.name),'target','data-id="'+i+'" '+((chosen==='revive'?t.hp>0:t.hp<=0)?'disabled':''),i===target?'primary':'')).join('');
 app.innerHTML=header()+'<main class="battle-shell"><div class="battle-heading"><div><span class="eyebrow">'+(b.origin.type==='trial'?'Echo Warden trial':b.boss?'Guardian battle':'Visible encounter')+' · Round '+b.round+phase+'</span><h2>'+esc(p.name)+'’s turn</h2></div><div class="battle-heading-side"><span>'+esc(regions[b.origin.r].name)+'</span>'+button('How combat works','battleTips')+'</div></div><div class="battle-turn-order" aria-label="Turn order">'+timeline.map(t=>'<span class="order-person '+(t.active?'current ':'')+(t.done?'spent ':'')+(t.hostile?'foe':'')+'">'+(t.active?'▶ ':t.done?'✓ ':t.hostile?'⚔ ':'○ ')+esc(t.name)+'</span>').join('')+'</div><section class="battle-brief level-'+coach.level+'"><div><small>TACTICAL BRIEFING</small><strong>'+esc(coach.label)+'</strong><p>'+esc(coach.text)+'</p></div><span class="battle-phase">'+(b.boss?'Guardian phase '+((b.phase||0)+1):'Enemies '+b.enemies.filter(e=>e.hp>0).length)+' / '+b.enemies.length+'</span></section><div class="resonance-panel"><div class="row between"><strong>✦ Party Focus · '+(b.focus>=100?'RESONANCE READY':'Building power')+'</strong><strong>'+b.focus+'/100</strong></div><div class="resonance-track"><i style="width:'+b.focus+'%"></i></div><small>Attack +22 · Defend +18 · Skills +14 · Hit a weakness for bonus Focus.</small></div>'+reports+'<div class="battle-stage tactical-stage '+(b.origin.type==='trial'?'echo-trial ':'')+'realm-'+b.origin.r+'">'+enemyCards+'</div><div class="battle-party">'+game.s.party.map(a=>'<button class="panel combat-ally '+(a.id===b.actor?'active':'')+'" data-action="allyTarget" data-id="'+a.id+'" '+(a.hp<=0?'aria-label="'+esc(a.name)+' knocked out"':'')+'>'+partyHTML(a)+'</button>').join('')+'</div><div class="battle-bottom"><section class="battle-console"><div class="battle-console-title"><span class="eyebrow">1 · Choose an action</span><span class="compact">'+esc(weapons[p.weapon].name)+' · mastery '+mastery(p)+'</span></div><div class="commands">'+actionButtons+'</div><div class="battle-preview" aria-live="polite"><b>Action preview</b><span>'+esc(preview)+'</span></div><div class="targetline"><b>2 · '+(noTarget?'Ready to act':ally?'Choose an ally':'Choose an enemy')+'</b>'+targetButtons+'</div><div class="battle-confirm"><div><span class="eyebrow">3 · Confirm</span><small>'+(activeTarget&&!noTarget?'Target: '+esc(activeTarget.name):'No target required')+'</small></div>'+button('Use '+esc(skills[chosen]?.name||abilityInfo[chosen]?.[0]||chosen)+' →','confirmAction',target<0&&!noTarget?'disabled':'','primary')+(!b.boss&&b.origin.type!=='trial'?button('Retreat','run'):'')+'</div></section><aside class="panel battle-log" role="log" aria-live="polite"><span class="eyebrow">Battle chronicle</span>'+last.map(t=>'<p>'+esc(t)+'</p>').join('')+'</aside></div></main>';
}

function regionServiceText(kind,r){
 const byRegion=[
  {inn:['The Lantern Inn','A warm common room with river-tea, braided rugs and a bell-chime by the hearth.'],shop:['Willowmere Goods','Travel packs, lantern oil and stitched field notes line the shelves.'],forge:['Mossforge Smithy','A tidy village forge that favors dependable gear over ceremony.']},
  {inn:['The Signless Inn','Quiet alcoves and silverglass mirrors make this refuge feel careful and contemplative.'],shop:['Hollow Provisioner','Blank labels and neat bundles wait for names to be remembered.'],forge:['Silverglass Smithy','A pale workshop where careful balance matters more than raw force.']},
  {inn:['Coal Lantern Inn','A soot-warm canteen with brass piping, boiler heat and stew for tired workers.'],shop:['Ventworks Supplies','Industrial satchels, coolant canisters and survey tools crowd the counters.'],forge:['Emberpeak Weaponsmith','A roaring forge floor where steel, sparks and oath-bells define the craft.']},
  {inn:['Floodwatch Inn','A raised civic inn overlooking the canals, fitted with dry storage and storm lamps.'],shop:['Riverbank Provisioner','Rope, waxed ledgers and ferry goods prepared for a city living with water.'],forge:['Crown Guard Forge','A disciplined armory-workshop shaped by duty, records and public service.']},
  {inn:['Dune Lantern Rest','A carpeted caravanserai where water and shade are treasured gifts.'],shop:['Saffron Caravan Supplies','Clay jars, desert packs and brass lanterns wait for the next crossing.'],forge:['Copperwind Smithy','Copper and sand-hardened iron ring in the evening market.']},
  {inn:['The Cloudhouse Inn','Sky sailors gather below wind chimes and windows open to the cloud sea.'],shop:['Aeris Flight Provisions','Ropes, sky compasses and lightweight satchels cover the counters.'],forge:['Galewing Workshop','Windwrights adjust brass rigs and blade balance for storm crossings.']},
  {inn:['Thawlight Lodge','The hearth keeps its glow through the longest blizzard in the north.'],shop:['Northwind Provisions','Furs, iceglass lanterns and field rations are stored by the watch.'],forge:['Glass-Ice Armory','Frost-forged blades are tested beside humming aurora crystals.']},
  {inn:['Keeper’s Quiet Rooms','A hush of parchment and candlelight offers rest at the edge of the Last Word.'],shop:['Bibliotheca Supplies','Bookbinder cord, Ethers and quills line the final supply desk.'],forge:['Glyphsmith Atelier','An old master engraves weapons with luminous runes and forgotten names.']}
 ];
 return byRegion[Math.max(0,Math.min(7,r||0))][kind];
}
function serviceScene(kind){
 const accents={inn:'aqua',shop:'gold',forge:'ember'};
 return '<div class="service-scene '+kind+'"><div class="service-backdrop"></div><div class="service-counter"></div><div class="service-silhouette left"></div><div class="service-silhouette right"></div><div class="service-lamp one"></div><div class="service-lamp two"></div><div class="service-icon '+accents[kind]+'">'+(kind==='inn'?'☾':kind==='shop'?'✦':'⚒')+'</div></div>';
}
function serviceCard(kind,label){
 const info=regionServiceText(kind,game?.s?.region||0),name=(label||info[0]),desc=info[1];
 return '<div class="service-hero"><div><span class="eyebrow">Town service</span><h3>'+esc(name)+'</h3><p>'+esc(desc)+'</p></div>'+serviceScene(kind)+'</div>';
}

function helpHTML(){return '<p>You lead a three-person party through eight connected realms. Explore towns and dungeons, defeat visible enemies, operate ancient machinery, and recover the lost fragments of the Living Lexicon. No word answers are required.</p>'+[['Follow the road','Use WASD, arrow keys, or the on-screen pad to walk; click open ground for automatic pathfinding. E, Space, or Interact speaks to nearby people or examines objects.'],['Use your quest compass','The objective panel and compass identify your next destination. Talk to the town leader, leave by the southern gate, and enter the dungeon northeast of town.'],['Solve environmental challenges','Push blocks, operate levers, align mirrors, route pumps, rotate wind vanes, and explore hidden chambers. Every dungeon contains a story and an Echo Warden on floor two.'],['Defeat the Echo Warden','Interact with the shining trial altar on floor two. Defeat its sentinels to release the seal and claim a relic. Later dungeons require their floor machinery to be aligned as well.'],['Master tactical combat','All three allies take turns. Attack to train weapon mastery and build Focus, defend against charged moves, and exploit weaknesses with techniques. At 100 Focus, unleash Triad Resonance when all three companions stand.'],['Build your party','Use Weapons & Skills to change weapons and track mastery. Visit the forge to improve weapons and armor. Recover random-quality charms and equip one on each companion from Gear & Loot. Open Battle Relics for a separate party-wide bonus.'],['Discover the story','Read your Journal, complete optional town stories, find secret caches, and recover companions’ memories. Defeat the guardian on floor three to open the next realm.']].map((a,i)=>'<div class="tutorial"><b>'+(i+1)+'</b><div><h3>'+a[0]+'</h3><p>'+a[1]+'</p></div></div>').join('');}
function renderModal(){document.querySelector('.modal-wrap')?.remove();let titleText='',body='';const s=game?.s,kind=modal.screen;
if(kind==='help'){titleText='Your adventurer’s field guide';body=helpHTML();}
if(kind==='battleTips'){titleText='Tactical combat · Field manual';body=combatGuideHTML();}
if(kind==='board'){titleText=modal.label||'Town notice board';body=noticeBoardHTML();}
if(kind==='citizenChat'){
 const actor=citizens?.people.find(p=>p.id===modal.actorId),topic=modal.topic||0;
 titleText=actor?.name||'Townsperson';
 body=actor?'<div class="citizen-chat"><div class="citizen-chat-portrait">'+citizenPortrait(actor)+'</div><div class="citizen-chat-text"><span class="eyebrow">'+esc(actor.role)+' · '+esc(regions[s.region].name)+'</span><p>'+esc(Citizens.say(actor,topic,s.cleared.includes(s.region)))+'</p><div class="citizen-chat-choices">'+button('Their work','citizenTopic','data-topic="1"',topic===1?'primary':'')+button('Local rumors','citizenTopic','data-topic="2"',topic===2?'primary':'')+button('Say goodbye','close','','')+'</div><small>These conversations add atmosphere and clues, but do not replace your quest journal.</small></div></div>':'<p>The resident has moved on.</p>'+button('Continue','close');
 }
if(kind==='endingChoice'){titleText='The Last Page · The World is Yours';body='<div class="finale-scroll"><span class="eyebrow">The Eraser is defeated · Chapter VIII complete</span><h3>What should the First Lexicon become?</h3><p>The old Keeper believed forgetting would protect the world from grief. Mira and Bram offer a different promise: everyone deserves to be remembered, and everyone deserves to change.</p><p>Choose what happens to the names the Library stole. Both choices restore freedom; your decision determines how the world honors its past. This choice is permanent in this save.</p><div class="finale-choices">'+button('<strong>Return every stolen name</strong><small>Recover the past publicly, and give every person the right to amend or withdraw their name.</small>','finaleChoice','data-id="return"','primary')+button('<strong>Let each person choose</strong><small>Offer the memories back privately, without forcing anyone to publish or keep a name.</small>','finaleChoice','data-id="choose"')+'</div></div>';}
if(kind==='dialog'){titleText=modal.title;body='<p>'+esc(modal.text)+'</p>'+button('Continue exploring','close','','primary');}
if(kind==='menu'){titleText='Field menu';body='<p>'+esc(saveError||'Autosaved to slot '+(slot+1)+'. Battles resume from the safe state just before the encounter if you reload.')+'</p><div class="cards">'+button('Weapons & skills','equipment')+button('Battle relics','relics')+button('Gear & loot','loot')+button('World map','atlas')+(game.s.complete&&!game.s.flags['lq:first:ending']?button('Finish the Last Page','finaleReopen'):'')+button('Quest journal','journal')+button('How to play','help')+button('Export / import save','transfer')+button('Reset dungeon blocks','reset')+button('Return to title','title')+button('Retreat to town','townRecall')+'</div><p class="compact">Retreating to town keeps all dungeon progress. Your old Classic Edition saves are stored separately.</p>';}
if(kind==='inn'||kind==='shop'){titleText=kind==='inn'?(modal.label||regionServiceText('inn',s.region)[0]):(modal.label||regionServiceText('shop',s.region)[0]);body=serviceCard(kind,modal.label)+'<div class="service-grid"><section class="panel"><h3>'+(kind==='inn'?'Party comforts':'Pack supplies')+'</h3><p>You have '+s.gold+' gold, '+s.potions+' Potions, and '+s.ethers+' Ethers.</p>'+(kind==='inn'?'<div class="service-stats"><span>Full HP restoration</span><span>Full MP restoration</span><span>Cost scales by realm</span></div>'+button('Rest the whole party · '+(15+s.region*5)+' gold','buy','data-id="inn"','primary'):'<div class="service-stats"><span>Potion · restores HP</span><span>Ether · restores MP</span><span>Stock never expires</span></div><div class="stack">'+button('Buy Potion · 15 gold','buy','data-id="potion"')+button('Buy Ether · 25 gold','buy','data-id="ether"')+'</div>')+'</section><section class="panel"><h3>'+(kind==='inn'?'What this stop is for':'Why this shop matters')+'</h3><ul class="service-list">'+(kind==='inn'?'<li>Reset before the next dungeon push.</li><li>Top off MP before puzzle-heavy floors.</li><li>Safe place to recover after a guardian wipe.</li>':'<li>Keep at least 3 Potions on hand for long floors.</li><li>Ethers matter most for Vera / Mira spell turns.</li><li>Stock up before boss floors and optional caches.</li>')+'</ul></section></div><p class="notice">'+esc(game.events.at(-1)||'')+'</p>';}
if(kind==='equipment'||kind==='forge'){titleText=kind==='forge'?(modal.label||regionServiceText('forge',s.region)[0]):'Weapons & skill mastery';body=(kind==='forge'?serviceCard('forge',modal.label):'')+'<p>Each character keeps separate mastery for Sword, Spear, Axe, and Staff. Basic attacks unlock your weapon technique at mastery 2, a signature passive at mastery 4, and a stronger passive at mastery 6. Each weapon keeps independent mastery. Skill ranks improve with use.</p><div class="cards">'+s.party.map(p=>'<section class="equipment"><h3>'+esc(p.name)+' · Lv '+p.level+'</h3><small>'+p.xp+'/'+p.level*45+' character XP</small><label><small>Equipped weapon</small><select data-equip="'+p.id+'">'+Object.entries(weapons).map(([w,v])=>'<option value="'+w+'" '+(p.weapon===w?'selected':'')+'>'+v.name+' · mastery '+mastery(p,w)+'</option>').join('')+'</select></label>'+Object.keys(weapons).map(w=>'<div class="skillrow"><span>'+weapons[w].name+'</span><span>Rank '+mastery(p,w)+' · '+(p.mastery[w]||0)+' XP</span></div>').join('')+'<div class="trait-track"><b>Signature weapon passives</b>'+weaponTraits[p.weapon].map((t,i)=>'<div class="trait '+(mastery(p)>=4+i*2?'learned':'locked')+'"><strong>'+esc(t[0])+' · Mastery '+(4+i*2)+'</strong><small>'+esc(t[1])+(mastery(p)>=4+i*2?' · ACTIVE':' · LOCKED')+'</small></div>').join('')+'</div><hr><small>Learned abilities</small>'+game.abilities(p).filter(a=>skills[a]).map(a=>'<div class="skillrow"><span>'+skills[a].name+'</span><span>Rank '+skillRank(p,a)+'</span></div>').join('')+'<p class="compact">Weapon tier '+p.tier+' · Armor tier '+p.armor+'</p>'+(kind==='forge'?'<div class="stack">'+button('Forge weapon · '+(p.tier+1)*60+' gold','upgrade','data-id="'+p.id+'" data-kind="tier"')+button('Forge armor · '+(p.armor+1)*60+' gold','upgrade','data-id="'+p.id+'" data-kind="armor"')+'</div>':'')+'</section>').join('')+'</div><p class="notice">'+esc(game.events.at(-1)||'')+'</p>';}
if(kind==='loot'){
 const gear=LQ.loot;
 const inventory=(s.loot||[]).slice().sort((a,b)=>b.rarity-a.rarity||b.bonus-a.bonus||a.id-b.id);
 titleText='Gear & loot · Party equipment';
 body='<p>Discover enchanted charms from enemies, Echo Wardens and guardians. Equip one charm to each companion. Their bonuses affect actual battles; weaker equipment can be sold for gold.</p>'+
 '<div class="gear-party">'+s.party.map((p,i)=>{const item=gear.equippedItem(s,p);return '<div class="gear-member"><div><strong>'+esc(p.name)+'</strong><small>'+esc(item?item.name+' · '+gear.itemEffect(item):'No charm equipped')+'</small></div>'+(item?button('Remove','removeLoot','data-id="'+i+'"'):'')+'</div>';}).join('')+'</div>'+
 '<div class="gear-inventory-header"><span>'+inventory.length+' of 80 inventory slots</span><span>'+s.gold+' gold</span></div>'+
 (inventory.length?'<div class="gear-inventory">'+inventory.map(item=>{const holder=s.party.find(p=>p.charmId===item.id),quality=gear.qualities[item.rarity];return '<article class="gear-drop quality-'+quality.color+'"><div><span class="gear-rarity">'+quality.name+'</span><h3>'+esc(item.name)+'</h3><p>'+esc(gear.itemEffect(item))+'</p><small>'+esc(item.source)+' · '+esc(regions[item.region].name)+'</small></div><div class="gear-actions">'+(holder?'<small>Equipped: '+esc(holder.name)+'</small>':'')+s.party.map(p=>button(p.charmId===item.id?'Equipped':('Give to '+esc(p.name)),'equipLoot','data-id="'+item.id+'" data-member="'+p.id+'"'+(p.charmId===item.id?' disabled':''),p.charmId===item.id?'primary':'')).join('')+(!holder?button('Sell','sellLoot','data-id="'+item.id+'" aria-label="Sell '+esc(item.name)+'"'):'')+'</div></article>';}).join('')+'</div>':'<p class="panel">No equipment found yet. Win field battles or defeat an Echo Warden to receive your first drop.</p>')+
 '<p class="notice">'+esc(game.events.at(-1)||'')+'</p>';
}
if(kind==='journal'){titleText='The book of remembered names';body='<div class="panel objective"><h3>Current objective</h3><p>'+esc(game.objective())+'</p></div>'+(s.region===0?'<div class="journal-quest"><b>Side story · The Thirteenth Bell</b><p>Three witnesses remember a lost family. Speak with Pip, Edda, and Iris, then examine the town bell. '+(['pip','edda','iris'].filter(k=>s.flags['lq:bell:'+k]).length)+'/3 collected. '+(s.flags['lq:bell:done']?'RESOLVED':'Optional')+'</p></div>':'')+'<h3 style="margin-top:20px">Recovered fragments · '+s.cleared.length+'/8</h3>'+s.journal.map(t=>'<p>'+esc(t)+'</p>').join('')+'<h3>Field tools</h3><p>'+esc(s.tools.join(', ')||'Defeat the first guardian to earn the field axe.')+'</p>'+(s.complete?'<h2 class="gold">The world remembers.</h2><p>You restored all eight fragments of the Living Lexicon. Your companions return home with stories of their own.</p>':'');}
if(kind==='atlas'){titleText='Atlas of the remembered realms';body='<p>Roads connect every town and dungeon. Defeat each guardian to open the next realm. Gold dots are towns, violet dots are dungeons; the blue dot is you.</p><canvas id="atlas" width="768" height="384"></canvas><div class="worldlist">'+regions.map((r,i)=>'<div class="regioncard '+(s.region===i?'current':'')+'"><span class="eyebrow">'+(s.cleared.includes(i)?'Restored':game.available(i)?'Open':'Sealed')+'</span><h3>'+(i+1)+'. '+r.name+'</h3><small>'+dungeonNames[i]+' · 3 floors</small></div>').join('')+'</div>';}
if(kind==='transfer'){titleText='Transfer your adventure';body='<p>Copy this save to another device, or paste a save from this edition and choose Import. Import replaces the current slot.</p><textarea class="transfer" id="transfer" aria-label="Saved adventure">'+esc(JSON.stringify(s))+'</textarea><div class="row">'+button('Copy save','copy')+button('Import into this slot','import')+'</div><p id="transferMessage" role="status"></p>';}
if(kind==='relics'){titleText='Battle relics · Echo Warden treasures';const owned=s.relics||[];body='<p>Every Echo Warden awards a relic after its first defeat. Equip one relic to gain its bonus at the beginning of each battle. Choose the relic that suits your party and the next guardian.</p>'+(owned.length?'<div class="relic-grid">'+owned.map(i=>{const relic=LQ.relics[i];if(!relic)return '';const selected=s.equippedRelic===i;return '<section class="relic-card '+(selected?'active':'')+'"><span class="relic-crest">✦</span><div><h3>'+esc(relic.name)+'</h3><p>'+esc(relic.effect)+'</p><small>Recovered in '+esc(regions[i].name)+'</small></div>'+button(selected?'Equipped':'Equip relic','equipRelic','data-id="'+i+'"'+(selected?' disabled':''),selected?'primary':'')+'</section>';}).join('')+'</div>':'<div class="panel"><p>No relics recovered yet. Travel to the Rootbound Archive, find its second-floor trial altar, and defeat the Rootbound Echo Warden.</p></div>')+'<p class="notice">Recovered '+owned.length+' of '+LQ.relics.length+' legendary relics.</p>';}
const wrap=document.createElement('div');wrap.className='modal-wrap';wrap.innerHTML='<section class="modal" role="dialog" aria-modal="true" aria-label="'+esc(titleText)+'"><div class="modal-head"><div><div class="eyebrow">Lexicon Quest</div><h2>'+esc(titleText)+'</h2></div>'+button('✕','close','aria-label="Close dialog"')+'</div>'+body+'</section>';app.appendChild(wrap);if(kind==='atlas')drawAtlas();wrap.querySelector('button')?.focus({preventScroll:true});}
function drawAtlas(){const cv=document.getElementById('atlas'),c=cv.getContext('2d'),m=LQ.worldMap();for(let y=0;y<48;y++)for(let x=0;x<96;x++){const t=m.tiles[y][x],r=LQ.regionAt(x,y);c.fillStyle=t==='water'?'#285264':t==='road'?'#c6b180':themes[r][t==='tree'?1:0];c.fillRect(x*8,y*8,8,8);}m.objects.filter(o=>o.type==='town'||o.type==='dungeon').forEach(o=>{c.fillStyle=o.type==='town'?'#ffe1a0':'#c4a5ef';c.fillRect(o.x*8-3,o.y*8-3,12,12);});const pos=game.s.place==='world'?game.s:game.s.world;c.fillStyle='#54b8ff';c.beginPath();c.arc(pos.x*8+4,pos.y*8+4,6,0,Math.PI*2);c.fill();}
app.addEventListener('change',e=>{if(e.target.dataset.equip!==undefined){game.equip(Number(e.target.dataset.equip),e.target.value);store();renderModal();}});
app.addEventListener('click',async e=>{const b=e.target.closest('[data-action]');if(!b||b.disabled)return;const a=b.dataset.action,id=b.dataset.id;
if(a==='start'){interior=null;stopInteriorWalk();const name=document.getElementById('hero').value;slot=[0,1,2].find(n=>!load(n));if(slot===undefined){titleNotice='All three slots are occupied. Export a save first, or continue an existing adventure.';title();return;}game=new Game(fresh(name));game.emit('Welcome to Willowmere. Walk north to Elder Mael (!), then leave through the south gate.');modal={screen:'help'};render();return;}
if(a==='load'){interior=null;stopInteriorWalk();slot=Number(id);game=new Game(load(slot));game.emit(game.objective());render();return;}
if(a==='importTitle'){const raw=prompt('Paste a Remembered Realms save (version 3):');if(!raw)return;try{const s=JSON.parse(raw);if(!validSave(s))throw Error();slot=[0,1,2].find(n=>!load(n));if(slot===undefined){titleNotice='All save slots are occupied. Continue a slot and use its Import menu to replace it.';title();return;}game=new Game(s);render();}catch{titleNotice='That is not a valid save for this edition.';title();}return;}
if(a==='battleHelp'||a==='battleTips'){if(game?.battle){modal={screen:'battleTips'};renderModal();}return;}
if(a==='music'){if(game){game.s.music=!game.s.music;music();render();}return;}
if(a==='finaleReopen'){modal={screen:'endingChoice'};renderModal();return;}
if(a==='finaleChoice'){const result=game.finishEnding(id);if(result){store();modal=result;renderModal();}return;}
if(a==='close'){if(modal?.screen==='endingChoice'&&!game.s.flags['lq:first:ending']){game.emit('The Last Page is waiting. Reopen it from the Field menu when you are ready.');}modal=null;render();return;}
if(a==='citizenTopic'){if(modal?.screen==='citizenChat'){modal.topic=Number(b.dataset.topic||0);renderModal();}return;}
if(a==='citizenTalk'){const actor=citizens?.people.find(q=>q.id===id);if(actor)seekCitizen(actor);return;}
if(a==='citizenApproach'){const actor=citizens?.people.find(q=>q.id===id);if(actor)seekCitizen(actor);return;}
if(a==='interiorExit'){interiorLeave();return;}
if(a==='interiorUse'){interiorUse(id);return;}
if(a==='interiorStep'){interiorStep(Number(b.dataset.dx),Number(b.dataset.dy));return;}
if(a==='interiorGoto'){const obj=interior?.objects.find(o=>o.x===Number(b.dataset.x)&&o.y===Number(b.dataset.y));if(obj)interiorGoTo(obj.x,obj.y);return;}
if(a==='title'){store();stopWalk();title();return;}
if(a==='move'){if(Date.now()<blockMoveClickUntil)return;move(Number(b.dataset.dx),Number(b.dataset.dy));return;}
if(a==='interact'){interact();return;}
if(a==='use'){const o=game?.objects().find(q=>q.id===id);if(o)interact(o);return;}
if(a==='goto'){const o=game?.objects().find(q=>q.id===id);if(o){modal=null;walkTo(o.x,o.y,o);game.emit('Heading to '+o.label+'.');render();}return;}
if(['menu','equipment','relics','loot','atlas','journal','help','transfer'].includes(a)){if(game?.battle)return;stopWalk();if(!game){modal={screen:'help'};renderModal();}else{modal={screen:a};renderModal();}return;}
if(a==='townRecall'){stopInteriorWalk();interior=null;game.enter('town');modal=null;render();return;}
if(a==='reset'){game.resetBlocks();modal=null;render();return;}
if(a==='buy'){game.buy(id);store();renderModal();return;}
if(a==='upgrade'){game.upgrade(Number(id),b.dataset.kind);store();renderModal();return;}
if(a==='equipRelic'){game.equipRelic(Number(id));store();renderModal();return;}
if(a==='equipLoot'){game.equipLoot(Number(id),Number(b.dataset.member));store();renderModal();return;}
if(a==='removeLoot'){game.removeLoot(Number(id));store();renderModal();return;}
if(a==='sellLoot'){game.sellLoot(Number(id));store();renderModal();return;}
if(a==='copy'){try{await navigator.clipboard.writeText(document.getElementById('transfer').value);document.getElementById('transferMessage').textContent='Copied.';}catch{document.getElementById('transfer').select();document.getElementById('transferMessage').textContent='Select and copy the text above.';}return;}
if(a==='import'){try{const s=JSON.parse(document.getElementById('transfer').value);if(!validSave(s))throw Error();stopInteriorWalk();interior=null;game=new Game(s);modal=null;game.emit('Save imported.');render();}catch{document.getElementById('transferMessage').textContent='Invalid save. Your current adventure was not changed.';}return;}
if(a==='ability'){chosen=id;target=0;renderBattle();return;}
if(a==='target'){target=Number(id);renderBattle();return;}
if(a==='enemyTarget'){if(!['mend','revive','potion','ether'].includes(chosen))target=Number(id);renderBattle();return;}
if(a==='allyTarget'){if(['mend','revive','potion','ether'].includes(chosen))target=Number(id);renderBattle();return;}
if(a==='confirmAction'||a==='run'){runCombatAction(a==='run'?'run':chosen,target);return;}
});
// Touch/pen/mouse D-pad: one step immediately, then repeat while held.
// Bind at document level so controls can re-render while a finger remains down.
document.addEventListener('pointerdown',e=>{
 const btn=e.target?.closest?.('button[data-action="move"]');
 if(!btn||btn.disabled||!game||game.battle||modal||interior)return;
 if(!['touch','pen','mouse'].includes(e.pointerType))return;
 e.preventDefault();
 stopHeldMovement();
 const dx=Number(btn.dataset.dx),dy=Number(btn.dataset.dy);
 holdDirection=[dx,dy];blockMoveClickUntil=Date.now()+440;
 move(dx,dy);
 holdDelay=setTimeout(()=>{
  if(!holdDirection)return;
  holdRepeat=setInterval(()=>{
   if(!holdDirection||!game||game.battle||modal||interior){stopHeldMovement();return;}
   blockMoveClickUntil=Date.now()+440;
   move(dx,dy);
  },110);
 },260);
});
for(const evt of ['pointerup','pointercancel','visibilitychange'])document.addEventListener(evt,stopHeldMovement);
document.addEventListener('keydown',e=>{if(['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName))return;if(e.key==='Tab'&&modal){const items=[...document.querySelectorAll('.modal button,.modal input,.modal select,.modal textarea')].filter(el=>!el.disabled);const first=items[0],last=items.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}return;}if(e.key==='Escape'){e.preventDefault();stopWalk();if(modal){modal=null;render();return;}if(interior){interiorLeave();return;}if(game&&!game.battle)modal={screen:'menu'};render();return;}if(!game||modal)return;if(interior){const dirs={ArrowUp:[0,-1],w:[0,-1],W:[0,-1],ArrowDown:[0,1],s:[0,1],S:[0,1],ArrowLeft:[-1,0],a:[-1,0],A:[-1,0],ArrowRight:[1,0],d:[1,0],D:[1,0]};if(dirs[e.key]){e.preventDefault();interiorStep(...dirs[e.key]);}else if(['e','E',' '].includes(e.key)){e.preventDefault();interiorUse();}return;}if(game.battle){const b=game.battle,p=game.s.party[b.actor];if(/^[1-9]$/.test(e.key)){const a=game.abilities(p)[Number(e.key)-1];if(a){e.preventDefault();chosen=a;target=0;renderBattle();}return;}if(e.key==='g'||e.key==='G'){e.preventDefault();chosen='guard';renderBattle();return;}if(e.key==='Enter'){e.preventDefault();runCombatAction(chosen,target);return;}if(e.key==='r'||e.key==='R'){if(!b.boss&&b.origin.type!=='trial'){e.preventDefault();runCombatAction('run',target);}return;}if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();const ally=['mend','revive','potion','ether'].includes(chosen),noTarget=['guard','ward','resonance'].includes(chosen);if(noTarget)return;const ts=ally?game.s.party:b.enemies;const choices=ts.map((q,i)=>chosen==='revive'?q.hp===0?i:-1:q.hp>0?i:-1).filter(i=>i>=0);if(!choices.length)return;const ix=choices.indexOf(target);target=choices[(Math.max(0,ix)+(e.key==='ArrowRight'?1:choices.length-1))%choices.length];renderBattle();return;}return;}const dirs={ArrowUp:[0,-1],w:[0,-1],W:[0,-1],ArrowDown:[0,1],s:[0,1],S:[0,1],ArrowLeft:[-1,0],a:[-1,0],A:[-1,0],ArrowRight:[1,0],d:[1,0],D:[1,0]};if(dirs[e.key]){e.preventDefault();move(...dirs[e.key]);}else if(['e','E',' '].includes(e.key)){e.preventDefault();interact();}else if(['m','M'].includes(e.key)){modal={screen:'atlas'};renderModal();}});
document.addEventListener('visibilitychange',()=>{if(document.hidden){stopWalk();audio.pause();store();}else music();});
if('serviceWorker' in navigator&&location.protocol!=='file:')navigator.serviceWorker.register('./sw.js').catch(()=>{});
title();
})();