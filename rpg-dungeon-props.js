/* Reforged Realms: authored, state-aware dungeon interactables.
 * Canvas rendering only; gate/reward state comes from existing game flags.
 * Objects can be reused in every realm without changing collision rules.
 */
(function(root){
'use strict';
const rect=(c,x,y,w,h,color)=>{if(w<=0||h<=0)return;c.fillStyle=color;c.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));};
const colors=[
 ['#ceb78a','#6d665c','#b6d5b3','#6a9f9b'],['#bacbd2','#647685','#b0d5ed','#7f91cb'],
 ['#e0aa7e','#77614e','#ffd58b','#c87952'],['#b5d4d3','#61717a','#9de8dc','#6d9fbc'],
 ['#e9c28c','#947453','#f7df9b','#d7a775'],['#b0d3dd','#5c668b','#d1e6fe','#7da8ef'],
 ['#d7edf0','#738d9b','#c3f9fa','#8ac0d2'],['#e1d2b3','#72706d','#f5dfae','#b09bbc']
];
function draw(c,x,y,o,s,tick=0){
 if(!o||!s)return false;
 const type=o.type,flags=s.flags||{},r=Math.max(0,Math.min(7,Number(o.r??s.region)||0)),p=colors[r];
 const fade=Math.sin(tick*.09+o.x+o.y),pulse=Math.round(fade*2);
 const base=(v)=>rect(c,x+6,y+38,36,7,v||'#131f2885');
 const gem=(cx,cy,col)=>{rect(c,x+cx,y+cy,8,9,col);rect(c,x+cx+2,y+cy+1,3,4,'#f6fff7');rect(c,x+cx+3,y+cy+7,2,2,p[1]);};
 if(type==='chest'||/Cache|Chest/.test(type)&&type!=='prismChest'||type==='prismChest'){
  const unlocked=type!=='prismChest'||!!flags['lq:prism:solved'];
  const opened=!!flags['done:'+o.id];
  base();
  if(opened){
   rect(c,x+8,y+13,32,10,'#584239');rect(c,x+11,y+10,26,4,'#c5a16c');
   rect(c,x+8,y+27,32,15,'#3c332e');rect(c,x+11,y+28,26,11,'#9b7450');
   rect(c,x+13,y+31,22,7,'#242c31');rect(c,x+22,y+26,6,13,'#d2ae72');
   return true;
  }
  rect(c,x+9,y+20,30,23,'#483b36');rect(c,x+11,y+25,26,14,'#986c4c');
  rect(c,x+8,y+18,32,10,'#6d4e3d');rect(c,x+11,y+16,26,5,'#b28c61');
  rect(c,x+13,y+22,22,3,'#c9a16a');rect(c,x+16,y+27,3,12,'#d6b17c');
  rect(c,x+30,y+27,3,12,'#d6b17c');rect(c,x+22,y+24,6,9,unlocked?'#e3cf84':'#8d91ac');
  if(unlocked&&pulse>0)rect(c,x+24,y+17,2,3,'#fff1b3');
  return true;
 }
 if(type==='door'||type==='keydoor'||type==='worldgate'){
  const open=type==='worldgate'?!!s.cleared?.includes(o.r):type==='keydoor'?!!flags['key'+s.region]:!!flags[o.requires];
  base('#091b2466');
  rect(c,x+3,y+3,42,44,p[1]);rect(c,x+6,y+5,36,41,p[0]);rect(c,x+8,y+6,32,40,'#283d45');
  if(open){
   rect(c,x+8,y+6,32,39,'#152c30');rect(c,x+9,y+8,4,36,p[0]);rect(c,x+35,y+8,4,36,p[0]);
   rect(c,x+13,y+13,22,29,'#1b434b');rect(c,x+16,y+18,16,18,'#8fcebc27');
   rect(c,x+24,y+13,2,18,p[2]);
  }else{
   rect(c,x+10,y+7,28,35,'#6a5448');rect(c,x+12,y+9,11,31,'#8a6851');
   rect(c,x+25,y+9,11,31,'#765742');for(let j=0;j<3;j++)rect(c,x+12,y+14+j*10,24,3,p[1]);
   rect(c,x+20,y+17,8,14,p[0]);gem(21,17,p[2]);
  }
  rect(c,x+5,y+41,38,3,p[1]);
  return true;
 }
 if(type==='lever'){
  const pulled=!!flags[o.id];
  base();
  rect(c,x+11,y+32,26,10,p[1]);rect(c,x+14,y+35,20,5,p[0]);
  rect(c,x+21,y+15,5,21,p[1]);
  rect(c,x+(pulled?27:16),y+(pulled?20:7),4,18,pulled?p[3]:p[2]);
  rect(c,x+(pulled?29:17),y+(pulled?17:5),9,6,pulled?p[2]:'#d8ad6d');
  if(pulled)rect(c,x+14,y+34,20,3,'#a6d7ba');
  return true;
 }
 if(type==='boulder'){
  base();
  rect(c,x+8,y+17,32,26,p[1]);rect(c,x+12,y+10,24,27,'#89938a');
  rect(c,x+18,y+7,15,12,'#a8b0a3');rect(c,x+14,y+14,13,4,p[0]);
  rect(c,x+17,y+21,11,2,'#586666');rect(c,x+20,y+24,4,13,'#66767b');
  return true;
 }
 if(type==='spring'){
  const used=!!flags['spring:'+o.id];
  base();rect(c,x+6,y+25,36,19,p[1]);rect(c,x+9,y+29,30,12,used?'#405867':p[3]);
  rect(c,x+13,y+29,22,3,used?'#738d96':p[2]);
  if(!used){rect(c,x+17,y+17+pulse,4,8,p[2]);rect(c,x+25,y+13-pulse,4,10,p[2]);rect(c,x+20,y+9,7,6,'#fcffe1');}
  return true;
 }
 if(type==='trial'){
  const done=!!flags['seal'+s.region];
  base();
  rect(c,x+13,y+30,22,11,p[1]);rect(c,x+16,y+19,16,15,p[0]);
  rect(c,x+21,y+11,6,14,done?'#91b5a6':'#4e5279');
  rect(c,x+13,y+13+pulse,22,3,done?p[2]:'#b69cfc');
  rect(c,x+16,y+8-pulse,16,3,done?p[3]:'#d8bcff');
  rect(c,x+22,y+1+pulse,4,7,'#f4eac5');
  gem(21,17,done?p[2]:'#c7adff');
  return true;
 }
 if(type==='plate'){
  base();rect(c,x+7,y+34,34,9,p[1]);rect(c,x+13,y+36,22,5,p[0]);rect(c,x+21,y+37,6,3,p[2]);return true;
 }
 if(type==='up'||type==='down'||type==='leave'||type==='exit'){
  base();rect(c,x+8,y+8,32,34,p[1]);rect(c,x+12,y+12,24,28,'#243b46');
  rect(c,x+16,y+18,16,3,p[2]);rect(c,x+19,y+21,10,3,p[0]);rect(c,x+22,y+24,4,9,p[3]);
  rect(c,x+17,y+7,14,3,p[0]);return true;
 }
 return false;
}
const api={draw,colors};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.LQDungeonProps=api;
})(typeof window!=='undefined'?window:globalThis);
