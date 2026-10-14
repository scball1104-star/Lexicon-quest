/* Lexicon Quest — Chapter I Director / Lanterns of Memory
 * Complete optional Willowmere-to-Archive microcampaign.
 * Additive save flags, original environment artwork, and no crossword gates.
 */
(function(root){
'use strict';
const LQ=root.LQ;if(!LQ?.Game)return;
const Game=LQ.Game;
const memory=[
 {id:'lq1-bell',place:'town',floor:0,x:10,y:8,label:'Lantern Memory · The Hearth',name:'Hearth',text:'The lantern remembers warmth shared freely. The villagers once kept a light burning for travelers who had no names left to give.'},
 {id:'lq1-road',place:'world',floor:0,x:18,y:8,label:'Lantern Memory · The Road',name:'Road',text:'The milestone remembers every pilgrim who reached for the Archive. They came to defend the names of friends, not to recover treasure.'},
 {id:'lq1-oath',place:'dungeon',floor:0,x:17,y:4,label:'Lantern Memory · The Oath',name:'Oath',text:'A keeper pledged that no name could be erased without a living witness. Something beneath the Archive broke that promise.'}
];
const dials=[
 {id:'lq1-dial-root',x:3,y:7,label:'Catalog Mechanism · Root Dial',name:'Root',goal:1,color:'#a2d5a6'},
 {id:'lq1-dial-flame',x:14,y:11,label:'Catalog Mechanism · Lantern Dial',name:'Lantern',goal:2,color:'#efbd7a'},
 {id:'lq1-dial-star',x:23,y:7,label:'Catalog Mechanism · Star Dial',name:'Star',goal:3,color:'#c2b2ee'}
];
const directions=['North','East','South','West'];
const descriptions=['The Root faces EAST.','The Lantern faces SOUTH.','The Star faces WEST.'];
const names=['Root','Lantern','Star'];
const memoryKey=id=>'lq:ch1:memory:'+id;
const dialKey=id=>'lq:ch1:dial:'+id;
const esc=t=>String(t??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function collected(s){return memory.filter(x=>!!s.flags[memoryKey(x.id)]).length;}
function aligned(s){return dials.filter(x=>(s.flags[dialKey(x.id)]||0)===x.goal).length;}
function has(s,k){return !!s.flags[k];}
function status(s){
 return {memories:collected(s),dials:aligned(s),lantern:has(s,'lq:ch1:lantern'),catalog:has(s,'lq:ch1:catalog'),pathRested:has(s,'lq:ch1:wayrest'),total:collected(s)+aligned(s)};
}
function objective(s){
 const st=status(s);
 if(st.memories<3){
  const next=memory.find(x=>!has(s,memoryKey(x.id)));
  return {title:'The Lanterns of Memory',body:'Recover three moments from the Hearth, Road and Archive. '+st.memories+'/3 remembered.',next:next?next.label:'Return to the square'};
 }
 if(!st.lantern)return {title:'The Lanterns of Memory',body:'All three memories resonate. Examine any memory lantern to restore its blessing.',next:'Claim the lantern blessing'};
 if(st.dials<3)return {title:'The Catalog Mechanisms',body:'Read the Catalog Diagram and orient the Root EAST, Lantern SOUTH and Star WEST. '+st.dials+'/3 aligned.',next:'Root, Lantern and Star dials on Archive Floor I'};
 if(!st.catalog)return {title:'The Catalog Mechanisms',body:'Align the three mechanisms to uncover the hidden passage and its forgotten treasure.',next:'Align the Catalog mechanisms'};
 if(!s.flags['lq:ch1:keeperCache'])return {title:'The Keeper’s Alcove',body:'A hidden passage has opened beyond the central gallery of Archive Floor I. Search the chamber for the Keeper’s lost sigil.',next:'Discover the Keeper’s Alcove · optional'};
 return {title:'Chapter I · Optional paths complete',body:'Lantern blessing recovered and catalog cache opened. Continue the Rootbound Archive story.',next:'Defeat the Archivore'};
}
function progressHTML(s,objects=[],place='town',floor=0){
 const st=status(s),goal=objective(s);
 const records=memory.map(o=>{
  const done=!!s.flags[memoryKey(o.id)],where=o.place==='town'?'Willowmere':o.place==='world'?'Willowmere Valley':'Archive · Floor I';
  const accessible=o.place===place&&(o.place!=='dungeon'||floor===o.floor);
  return '<div class="lq-quest-track-row"><span class="'+(done?'done':'pending')+'">'+(done?'✓':'◇')+'</span><div><strong>'+esc(o.name)+' memory</strong><small>'+where+' · '+(done?'Recovered':'Undiscovered')+'</small></div>'+(accessible&&!done?'<button data-action="goto" data-id="'+esc(o.id)+'">Travel</button>':'')+'</div>';
 }).join('');
 const dialRecords=dials.map(o=>{
  const value=s.flags[dialKey(o.id)]||0,done=value===o.goal;
  const accessible=place==='dungeon'&&floor===0;
  return '<div class="lq-quest-track-row"><span class="'+(done?'done':'pending')+'">'+(done?'✓':'◈')+'</span><div><strong>'+esc(o.name)+' dial</strong><small>'+(done?'Aligned':directions[value]+' · target '+directions[o.goal])+'</small></div>'+(accessible?'<button data-action="goto" data-id="'+esc(o.id)+'">Travel</button>':'')+'</div>';
 }).join('');
 return '<div class="lq-chapter-tracker"><div class="lq-chapter-head"><span>Chapter I · Optional adventure</span><h3>'+esc(goal.title)+'</h3><p>'+esc(goal.body)+'</p></div><div class="lq-track-block"><div class="lq-track-heading"><b>The Living Lantern</b><small>'+st.memories+'/3 memories '+(st.lantern?'· BLESSING ACTIVE':'')+'</small></div>'+records+'</div><div class="lq-track-block"><div class="lq-track-heading"><b>The Catalog Diagram</b><small>'+st.dials+'/3 mechanisms '+(st.catalog?'· CACHE CLAIMED':'')+'</small></div>'+dialRecords+'</div><div class="lq-track-block"><div class="lq-track-heading"><b>Hidden Keeper’s Alcove</b><small>'+(s.flags['lq:ch1:keeperCache']?'DISCOVERED':st.catalog?'PASSAGE REVEALED':'SEALED')+'</small></div><div class="lq-quest-track-row"><span class="'+(s.flags['lq:ch1:keeperCache']?'done':'pending')+'">'+(s.flags['lq:ch1:keeperCache']?'✓':'◇')+'</span><div><strong>Forgotten Keeper’s Sigil</strong><small>'+(s.flags['lq:ch1:keeperCache']?'Rare Focus charm recovered':st.catalog?'Search western Archive Floor I':'Complete the three Catalog mechanisms first')+'</small></div>'+(place==='dungeon'&&floor===0&&st.catalog&&!s.flags['lq:ch1:keeperCache']?'<button data-action="goto" data-id="lq1-hidden-keeper-cache">Travel</button>':'')+'</div></div><p class="lq-track-reward">Rewards: a permanent +8 Max HP and +2 Max MP for each hero; a guardian-battle Focus bonus; and an optional cache of gold and restorative supplies.</p></div>';
}
const baseMap=Game.prototype.map;
Game.prototype.map=function(){
 const map=baseMap.call(this),s=this.s;
 if(s.region!==0)return map;
 for(const m of memory){
  if(s.place!==m.place||(m.place==='dungeon'&&s.floor!==m.floor))continue;
  if(!map.objects.some(x=>x.id===m.id))map.objects.push({id:m.id,type:'lanternMemory',label:m.label,x:m.x,y:m.y,r:0,f:m.floor});
 }
 if(s.place==='world'&&!map.objects.some(x=>x.id==='lq1-camp'))map.objects.push({id:'lq1-camp',type:'trailCamp',x:16,y:12,r:0,label:'The Pilgrim Rest'});
 if(s.place==='dungeon'&&s.floor===0){
  for(const dial of dials)if(!map.objects.some(x=>x.id===dial.id))map.objects.push({id:dial.id,type:'catalogDial',x:dial.x,y:dial.y,r:0,f:0,label:dial.label});
  if(!map.objects.some(x=>x.id==='lq1-diagram'))map.objects.push({id:'lq1-diagram',type:'catalogDiagram',x:12,y:12,r:0,f:0,label:'The Catalog Diagram'});
 }
 return map;
};
const baseInteract=Game.prototype.interact;
Game.prototype.interact=function(o){
 o=o||this.nearby()[0];
 if(!o||this.s.region!==0||!['lanternMemory','catalogDial','catalogDiagram','trailCamp'].includes(o.type))return baseInteract.call(this,o);
 const s=this.s,st=status(s);
 if(o.type==='lanternMemory'){
  const record=memory.find(x=>x.id===o.id);if(!record)return null;
  if(s.flags[memoryKey(o.id)])return {screen:'dialog',title:record.label,text:'The '+record.name.toLowerCase()+' memory shines steadily. '+(st.lantern?'The lantern blessing already protects the party.':'Find the remaining memories.')};
  s.flags[memoryKey(o.id)]=true;
  const number=collected(s);s.journal.push('Living Lantern '+number+'/3: '+record.text);
  let suffix='Continue seeking the other memories.';
  if(number===3){
   s.flags['lq:ch1:lantern']=true;
   for(const p of s.party){p.maxhp+=8;p.hp=Math.min(p.maxhp,p.hp+8);p.maxmp+=2;p.mp=Math.min(p.maxmp,p.mp+2);}
   s.journal.push('The Living Lantern restored: the entire party gains +8 Max HP, +2 Max MP and 15 bonus Focus against the Rootbound guardian.');
   suffix='The Living Lantern reunites. Every companion gains +8 Max HP and +2 Max MP permanently. It will strengthen your resolve against the Archivore.';
  }
  this.emit('LANTERN MEMORY '+number+'/3 · '+record.name+(number===3?' · BLESSING AWAKENED':''));
  return {screen:'dialog',title:record.label,text:record.text+' '+suffix};
 }
 if(o.type==='catalogDiagram')return {screen:'dialog',title:'The Catalog Diagram',text:'These are symbols of the Keepers, not words to enter. Turn the Root mechanism EAST, the Lantern SOUTH, and the Star WEST. The arrangement reveals a hidden restoration cache.'};
 if(o.type==='catalogDial'){
  const d=dials.find(x=>x.id===o.id);if(!d)return null;
  const key=dialKey(o.id),newValue=((s.flags[key]||0)+1)%4;
  s.flags[key]=newValue;
  let note=names[dials.indexOf(d)]+' now faces '+directions[newValue]+'. '+(newValue===d.goal?'The alignment glows.':'Follow the Catalog Diagram.');
  if(aligned(s)===3&&!s.flags['lq:ch1:catalog']){
   s.flags['lq:ch1:catalog']=true;s.gold+=135;s.potions+=2;s.ethers+=1;
   s.journal.push('The Catalog Mechanisms: all three dials aligned. Found 135 gold, two potions and an Ether.');
   note+=' The central gallery wall also opens a hidden alcove to the WEST, holding a Keeper’s sigil. Obtained 135 gold, 2 potions, and 1 Ether.';
  }else if(s.flags['lq:ch1:catalog'])note+=' The hidden cache has already been claimed.';
  this.emit('CATALOG ALIGNMENT · '+aligned(s)+'/3'+(s.flags['lq:ch1:catalog']?' · COMPLETE':''));
  return {screen:'dialog',title:d.label,text:note};
 }
 if(o.type==='trailCamp'){
  if(s.flags['lq:ch1:wayrest'])return {screen:'dialog',title:'The Pilgrim Rest',text:'The travel cache is empty. Return to Willowmere for a full night’s rest.'};
  s.flags['lq:ch1:wayrest']=true;
  for(const p of s.party)if(p.hp>0){p.hp=Math.min(p.maxhp,p.hp+24);p.mp=Math.min(p.maxmp,p.mp+7);}
  s.potions+=1;
  this.emit('PILGRIM REST · +24 HP and +7 MP to living companions; found one Potion.');
  return {screen:'dialog',title:'The Pilgrim Rest',text:'Under the old milestones, a sheltered fire and spare potion wait for exhausted travelers. The party recovers 24 HP and 7 MP, and receives 1 Potion. The rest can be used once.'};
 }
 return null;
};
const baseStart=Game.prototype.startBattle;
Game.prototype.startBattle=function(o){
 const result=baseStart.call(this,o);
 if(this.battle&&o.r===0&&o.type==='boss'&&this.s.flags['lq:ch1:lantern']){
  this.battle.focus=Math.min(100,this.battle.focus+15);
  this.log('THE LIVING LANTERN: recovered memories strengthen the party. +15 Focus.');
 }
 return result;
};
function draw(c,x,y,o,s,tick=0){
 if(!o||s.region!==0||!['lanternMemory','catalogDial','catalogDiagram','trailCamp'].includes(o.type))return false;
 const fill=(a,b,w,h,color)=>{c.fillStyle=color;c.fillRect(Math.round(x+a),Math.round(y+b),w,h);};
 const phase=Math.sin(tick*.11+o.x*1.5)*2;
 fill(10,38,28,7,'#10272a77');
 if(o.type==='lanternMemory'){
  const done=!!s.flags[memoryKey(o.id)];
  fill(17,34,14,9,'#504739');fill(20,30,8,6,'#b5a071');fill(22,22,4,10,'#837b66');
  fill(17,8+phase,14,16,done?'#508b78':'#9264ae');
  fill(20,10+phase,8,12,done?'#aae9c4':'#dfc7ff');
  fill(23,3+phase,2,6,'#fff5c4');fill(16,6+phase,16,3,'#d8bc85');
  fill(19,4+phase,3,3,'#fef0c7');fill(29,18+phase,3,3,'#d8bdff');
  return true;
 }
 if(o.type==='catalogDial'){
  const index=dials.findIndex(d=>d.id===o.id),d=dials[index],v=s.flags[dialKey(o.id)]||0,done=v===d.goal;
  const rim=done?'#98d3b1':'#ae9d88';
  fill(10,31,28,11,'#36464b');fill(13,19,22,16,'#77878a');fill(16,10,16,23,'#4b6170');
  fill(19,13,10,15,rim);fill(23,5,3,30,'#304552');fill(13,17,22,3,'#b7aa8b');
  fill(19,17,10,10,d.color);
  const marks=[[22,11],[31,20],[22,29],[13,20]];
  const pos=marks[v];fill(pos[0],pos[1],5,5,'#fff1c5');
  if(done)fill(18,4+phase,12,3,'#ddf7b1');
  return true;
 }
 if(o.type==='catalogDiagram'){
  fill(10,32,28,9,'#3c3b3b');fill(13,15,22,20,'#ae9a7d');fill(15,17,18,16,'#ede0b7');
  for(let i=0;i<3;i++){fill(18,19+i*4,12,2,'#806e59');fill(18+i*3,18+i*4,3,3,'#caa06b');}
  fill(21,8,6,6,'#ded1ad');return true;
 }
 if(o.type==='trailCamp'){
  const spent=!!s.flags['lq:ch1:wayrest'];
  fill(12,32,24,11,'#6b5947');fill(16,29,16,4,'#a79775');
  fill(19,22,11,12,spent?'#4a5252':'#e09959');
  if(!spent){fill(22,11+phase,5,14,'#ffd18c');fill(23,8+phase,3,7,'#fff1bc');}
  fill(9,36,10,5,'#5b5c53');fill(30,35,9,6,'#666257');
  return true;
 }
 return false;
}
LQ.chapterOne={memory,dials,status,objective,progressHTML,draw,descriptions};
})(typeof window!=='undefined'?window:globalThis);
