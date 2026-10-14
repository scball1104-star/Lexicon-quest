/* Lexicon Quest — Cinematic Adventure Director v52
 * Original lightweight scene choreography, dungeon lighting, readable mechanism
 * transitions, region-specific party dialogue, and deliberate monster tactics.
 * Adds no save-schema requirements. Zero remote assets and no timers at import.
 */
(function(root){
'use strict';
const LQ=root.LQ;if(!LQ?.Game)return;
const Game=LQ.Game;
const palettes=[
 {stone:'#6c7673',light:'#f7dca0',shadow:'#0d2531',rune:'#b3deb7',dust:'#f9deb37a',name:'Rootbound Archive'},
 {stone:'#a7b0b5',light:'#d9effb',shadow:'#152d3d',rune:'#c8e5ec',dust:'#eaf4ff67',name:'Court of Mirrors'},
 {stone:'#846754',light:'#ffae6a',shadow:'#2d2221',rune:'#f8b36f',dust:'#f9b87a72',name:'Forge of Ash'},
 {stone:'#729898',light:'#b8f2e7',shadow:'#102c34',rune:'#a5e2d6',dust:'#b2f9ec59',name:'Sunken Keep'},
 {stone:'#bbaa7d',light:'#fae4a3',shadow:'#453926',rune:'#f0c979',dust:'#e9d7aa6b',name:'Oracle Labyrinth'},
 {stone:'#819eb0',light:'#a8d8ff',shadow:'#192d43',rune:'#b9ddfa',dust:'#d7ebff66',name:'Storm Observatory'},
 {stone:'#92b8b9',light:'#e8f8fe',shadow:'#213d50',rune:'#a9deed',dust:'#d0f5fc6f',name:'Frostbound Vault'},
 {stone:'#998dab',light:'#e7d6f7',shadow:'#25213a',rune:'#d6c5ff',dust:'#ebd9fa62',name:'First Library'}
];
const speeches=[
 {Mira:'These pages keep names alive. Listen to the rooms; their silence is part of the story.',Bram:'Old stone. New danger. We will clear a way through, one chamber at a time.'},
 {Mira:'A reflection shows what we fear to lose. It cannot tell us what we choose.',Bram:'If a mirror lies, steel will show us which way is real.'},
 {Mira:'The furnace remembers every strike. Something is calling us into the heat.',Bram:'My father taught me: do not rush a forge. Respect its rhythm.'},
 {Mira:'Those flooded halls hide promises that were never meant to disappear.',Bram:'Water moves a stone eventually. We just need to find where it wants to go.'},
 {Mira:'The mirage will offer an easy answer. I would rather find the true road.',Bram:'Watch the sand. It tells us where the ground is solid.'},
 {Mira:'The signals are still speaking. Someone wanted them to go unheard.',Bram:'Wind against us means we are on the right course.'},
 {Mira:'Cold makes every step harder, not less important.',Bram:'Keep moving. Warmth is something we make together.'},
 {Mira:'A story is more than what the Keeper wrote.',Bram:'We decide how this ends. Not some book.'}
];
const eventSpeech={
 lanternMemory:['Mira','Every recovered memory changes what this valley can become.'],
 catalogDial:['Bram','Hear that click? One of the old locks has moved.'],
 catalogDiagram:['Mira','The diagram is a clue, not a test of spelling. We can solve it by exploring.'],
 trailCamp:['Bram','A warm fire on a long road. Even heroes need rest.'],
 lever:['Bram','That mechanism moved somewhere deeper in the halls.'],
 chest:['Mira','Someone hid this for a traveler who would need it.'],
 spring:['Mira','Restoration leaves a trace. We should use it carefully.'],
 trial:['Bram','A guardian blocks our path. We fight together.'],
 prism:['Mira','Light remembers its direction. Follow the beam.'],
 wardstone:['Bram','These oaths may protect us against the thing below.'],
 mirror:['Mira','I can see a thousand possibilities. Only one is true.'],
 forgeFan:['Bram','Listen for the forge to settle into a steady beat.'],
 heatValve:['Bram','Pressure travels through the entire room.'],
 tideSluice:['Mira','One gate changes the water beyond the next.'],
 tidePump:['Bram','Work out the direction before pulling the handle.'],
 windVane:['Mira','Follow the real wind, not the mirage.'],
 skyRelay:['Mira','The relays tell each other a story across the sky.'],
 frostLens:['Bram','Keep the light moving. We are almost through.'],
 printingPlate:['Mira','Give these old pages the right order and they will open.'],
 boss:['Bram','Our road has brought us here. Hold fast.']
};
const mechanismTypes=new Set(['lever','door','keydoor','worldgate','plate','spring','catalogDial','lanternMemory','prism','mirror','tideSluice','tidePump','forgeFan','heatValve','windVane','skyRelay','frostLens','printingPlate','indexEngine','frostBeacon']);
const transitionStates=new Map(),MAX_STATES=160;
const now=()=>Date.now(),limit=(v,a,b)=>Math.max(a,Math.min(b,v));
function renderSignature(o,s){
 const f=s.flags||{},id=o.id||'',r=o.r??s.region;
 switch(o.type){
  case 'lever':return !!f[id];
  case 'door':return !!f[o.requires];
  case 'keydoor':return !!f['key'+r];
  case 'worldgate':return !!s.cleared?.includes(r);
  case 'spring':return !!f['spring:'+id];
  case 'lanternMemory':return !!f['lq:ch1:memory:'+id];
  case 'catalogDial':return f['lq:ch1:dial:'+id]||0;
  case 'tideSluice':return f['lq:vale:sluice:'+id]||0;
  case 'tidePump':return f['lq:vale:pump:'+id]||0;
  case 'forgeFan':return f['lq:ember:fan:'+id]||0;
  case 'heatValve':return f['lq:ember:valve:'+id]||0;
  case 'mirror':return f['lq:mirror:'+id]||0;
  case 'prism':return f['lq:prism:'+id]||0;
  case 'plate':return !!f['lq:plate:'+id];
  default:return JSON.stringify([f[id],f['lq:sky:relay:'+id],f['lq:frost:lens:'+id],f['lq:first:plate:'+id]]);
 }
}
function mechanismState(o,s,at=now()){
 const scope=s.place+':'+s.region+':'+s.floor+':'+o.id,signature=String(renderSignature(o,s));
 const old=transitionStates.get(scope);
 if(!old){
  if(transitionStates.size>=MAX_STATES)transitionStates.delete(transitionStates.keys().next().value);
  transitionStates.set(scope,{signature,start:at,previous:signature,change:0});
  return {changed:false,progress:1,signature};
 }
 if(old.signature!==signature){old.previous=old.signature;old.signature=signature;old.start=at;old.change++;return {changed:true,progress:0,signature,previous:old.previous};}
 return {changed:false,progress:limit((at-old.start)/560,0,1),signature,previous:old.previous,change:old.change};
}
const sq=(c,x,y,w,h,color)=>{c.fillStyle=color;c.fillRect(Math.round(x),Math.round(y),Math.max(1,Math.round(w)),Math.max(1,Math.round(h)));};
function drawMechanism(c,x,y,o,s,tick=0,at=now(),lowMotion=false){
 if(!mechanismTypes.has(o.type))return false;
 const state=mechanismState(o,s,at),p=palettes[limit(s.region||0,0,7)],fraction=lowMotion?1:state.progress;
 if(fraction>=1){
  if(o.type==='door'||o.type==='keydoor'||o.type==='worldgate'){
   if(String(state.signature)==='true'){sq(c,x+10,y+38,28,3,p.rune);sq(c,x+14,y+40,20,2,p.light);}
  }
  return true;
 }
 const fading=1-fraction;
 // Architectural movement: gate leaves travel upward, powered devices rotate,
 // and memory lamps radiate outward. Purely drawn overlays, no collision edits.
 if(['door','keydoor','worldgate'].includes(o.type)){
  const open=state.signature==='true',height=Math.round(33*(open?fading:fraction));
  if(height>0){
   sq(c,x+10,y+6,28,height,p.stone);sq(c,x+14,y+6,4,height,p.light);
   sq(c,x+33,y+6,3,height,p.shadow);
  }
  sq(c,x+6,y+42,36,2,p.rune);
 }else if(o.type==='lever'||o.type==='catalogDial'||o.type==='prism'||o.type==='mirror'){
  for(let i=0;i<4;i++){
   const a=fraction*Math.PI*2+i*Math.PI/2;
   sq(c,x+23+Math.cos(a)*18,y+24+Math.sin(a)*16,3,3,i%2?p.light:p.rune);
  }
  sq(c,x+18,y+37,12,3,p.rune);
 }else if(o.type==='spring'||o.type==='lanternMemory'){
  const radius=8+fading*18;
  sq(c,x+24-radius,y+16,2,16,p.light);sq(c,x+22+radius,y+16,2,16,p.rune);
 }else{
  sq(c,x+8,y+7+Math.sin(tick*.2)*3,32,3,p.light);
  sq(c,x+12,y+33,24,3,p.rune);
 }
 return true;
}
function architecture(c,map,cam,s,tick=0){
 if(s.place!=='dungeon'||!map?.tiles)return;
 const pal=palettes[limit(s.region||0,0,7)];
 const x0=Math.max(0,Math.floor(cam.x)-1),y0=Math.max(0,Math.floor(cam.y)-1);
 const x1=Math.min(map.w-1,Math.ceil(cam.x+17)),y1=Math.min(map.h-1,Math.ceil(cam.y+13));
 for(let ty=y0;ty<=y1;ty++)for(let tx=x0;tx<=x1;tx++){
  const t=map.tiles[ty]?.[tx],x=Math.round((tx-cam.x)*48),y=Math.round((ty-cam.y)*48);
  if(!t||['wall','tree','water','mountain','house'].includes(t))continue;
  const h=((tx*73+ty*137+s.region*541)>>>0);
  // Room boundaries: shadows follow adjacent masonry rather than generic grids.
  if(map.tiles[ty-1]?.[tx]==='wall'){
   sq(c,x,y,48,4,pal.shadow+'bb');sq(c,x+3,y+4,42,2,pal.stone);
   if(h%11===0){sq(c,x+17,y+5,14,2,pal.light);sq(c,x+21,y+7,5,4,pal.rune);}
  }
  if(map.tiles[ty]?.[tx-1]==='wall')sq(c,x,y+5,3,39,pal.shadow+'aa');
  if(map.tiles[ty]?.[tx+1]==='wall')sq(c,x+45,y+5,3,39,pal.shadow+'aa');
  // Each region has its own carved floor ornament, lightly detailed for clarity.
  if((h%17===0)&&!['carpet','bridge'].includes(t)){
   sq(c,x+18,y+20,12,2,pal.rune+'99');sq(c,x+23,y+14,2,14,pal.rune+'99');
   if(s.region===2)sq(c,x+23,y+14,2,5,'#ffb76a');
   if(s.region===6)sq(c,x+16,y+18,17,2,'#ddf6ff');
  }
  if(h%29===0&&tick%10>=2){
   const drift=Math.sin((tick+tx*3)*.11)*4;
   sq(c,x+17+drift,y+12,2,2,pal.dust);
   sq(c,x+30-drift,y+30,2,2,pal.dust);
  }
 }
}
function companion(s,trigger,object){
 const r=limit(s.region||0,0,7);
 if(trigger==='enter')return {name:s.party?.[r%2+1]?.name||(r%2?'Bram':'Mira'),text:r%2?speeches[r].Bram:speeches[r].Mira,kind:'region'};
 const type=object?.type||trigger;
 const msg=eventSpeech[type];
 if(msg)return {name:msg[0],text:msg[1],kind:'discovery'};
 if(trigger==='victory')return{name:'Bram',text:'The path is open. The next story is waiting for us.',kind:'victory'};
 if(trigger==='retreat')return{name:'Mira',text:'We can return better prepared. A retreat is not forgetting.',kind:'warning'};
 return null;
}
function phaseCue(before,after){
 if(!after?.boss)return null;
 if(!before||before.phase===after.phase)return null;
 const phase=(after.phase||0)+1,r=after.origin?.r||0,guardian=after.enemies[0]?.name||'Guardian';
 return {title:'PHASE '+phase+' · '+guardian.toUpperCase(),text:['The guardian changes its tactics. Watch for the next attack.','The guardian summons its final strength. Protect the wounded.','Its defenses fracture. Look for an opening.'][Math.min(phase-2,2)]||'Watch the enemy intent and prepare.',region:r,kind:'phase',phase};
}
function tone(event='step',enabled=true){
 if(!enabled||typeof root.AudioContext!=='function'&&typeof root.webkitAudioContext!=='function')return false;
 const Constructor=root.AudioContext||root.webkitAudioContext;
 try{
  const ctx=tone.ctx||(tone.ctx=new Constructor());if(ctx.state==='suspended')ctx.resume()?.catch?.(()=>{});
  const patterns={lever:[280,415],dial:[390,585],chest:[540,720],memory:[420,630],gate:[170,245],step:[170],phase:[160,260,410],victory:[510,660,840],hit:[95,160],discovery:[490,650]};
  const notes=patterns[event]||patterns.step,base=ctx.currentTime;
  notes.forEach((freq,i)=>{
   const osc=ctx.createOscillator(),gain=ctx.createGain(),at=base+i*.072;
   osc.type=['hit','gate'].includes(event)?'triangle':'sine';osc.frequency.setValueAtTime(freq,at);
   gain.gain.setValueAtTime(.0001,at);gain.gain.exponentialRampToValueAtTime(.035,at+.012);
   gain.gain.exponentialRampToValueAtTime(.0001,at+.19);
   osc.connect(gain);gain.connect(ctx.destination);osc.start(at);osc.stop(at+.2);
  });
  return true;
 }catch{return false;}
}
function soundFor(o){return({lever:'lever',catalogDial:'dial',lanternMemory:'memory',chest:'chest',door:'gate',keydoor:'gate',worldgate:'gate',trial:'phase',boss:'phase',spring:'discovery',trailCamp:'discovery'})[o?.type]||'step';}
// The first two nonboss rounds now teach visible enemy tactics. Enemy charges
// are set AFTER the existing enemy turn; piercing interrupts before they resolve.
const baseEnemyTurn=Game.prototype.enemyTurn;
Game.prototype.enemyTurn=function(){
 const b=this.battle;
 const before=b?b.round:null;
 const outcome=baseEnemyTurn.call(this);
 if(!this.battle||this.battle!==b||b.boss||b.round===before)return outcome;
 if(b.round>=3&&b.round%4===3){
  const hunter=b.enemies.find(e=>e.hp>0&&e.role==='hunter'&&!e.charge&&!e.silenced);
  if(hunter){hunter.charge=true;hunter.tactic='Ambush';this.log(hunter.name+' SIGNALS AN AMBUSH! A heavy attack is coming. Piercing Thrust interrupts; Aegis or Guard mitigates.');}
 }
 if(b.round>=2&&b.round%4===2){
  const healer=b.enemies.find(e=>e.hp>0&&e.role==='mender'&&!e.silenced)&&b.enemies.some(e=>e.hp>0&&e.hp<e.maxhp);
  if(healer){const preparing=b.enemies.find(e=>e.hp>0&&e.role==='mender'&&!e.silenced);preparing.tactic='Restoration';this.log(healer.name+' prepares a restorative spell. Strike the healer before the next enemy turn.');}
 }
 return outcome;
};
LQ.cinematic={palettes,speeches,mechanismTypes,renderSignature,mechanismState,drawMechanism,architecture,companion,phaseCue,tone,soundFor};
})(typeof window!=='undefined'?window:globalThis);
