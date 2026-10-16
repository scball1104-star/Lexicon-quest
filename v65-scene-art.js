/* Lexicon Quest v65 — Curated Scene Direction
 * A small, deliberately composed set of original visual motifs for every
 * playable region. No invisible objects, game flags, save writes, or collision
 * changes. This sits between environmental dressing and gameplay actors.
 */
(function(root){
'use strict';
const TILE=48,WIDTH=816,HEIGHT=624,TAU=2*Math.PI;
const REGIONS=Object.freeze([
 {name:'Willowmere',stem:'#2b5043',silhouette:'#324c47',mid:'#668869',accent:'#d9c686',sky:'#afc59c',pattern:'bough'},
 {name:'Nameless Hollow',stem:'#3f5269',silhouette:'#34475e',mid:'#788da1',accent:'#d7d2eb',sky:'#b7c5db',pattern:'mirror'},
 {name:'Emberpeak',stem:'#573c3b',silhouette:'#473b3d',mid:'#986654',accent:'#f5bf85',sky:'#c39d87',pattern:'forge'},
 {name:'Valewyn',stem:'#31585d',silhouette:'#375a68',mid:'#689aa0',accent:'#c4e5d7',sky:'#a2cad0',pattern:'tide'},
 {name:'Whispering Desert',stem:'#74573f',silhouette:'#674f49',mid:'#b58b63',accent:'#f0d7a6',sky:'#d8b991',pattern:'sun'},
 {name:'Skybound Isles',stem:'#46677f',silhouette:'#456681',mid:'#92bbca',accent:'#ecdeb2',sky:'#bddfea',pattern:'wind'},
 {name:'Hollow North',stem:'#557480',silhouette:'#526c84',mid:'#97bac9',accent:'#e4f8fa',sky:'#d3edf2',pattern:'frost'},
 {name:'The First Library',stem:'#514d5a',silhouette:'#514e66',mid:'#988e94',accent:'#e7d2a9',sky:'#c9bbaa',pattern:'page'}
]);
const OBJECTS=new Set(['inn','shop','forge','bell','spring','hollowFountain','civicPlan','coolantStation','oracleShrine','skyBeacon','frostHearth','firstConcordance','concordance','hearth','trial','down','up','leave','exit','door','keydoor','worldgate','boss','board','lanternMemory','catalogDial']);
const STORY=new Set(['npc','resident','hollowResident','emberWitness','valewynWitness','oracleWitness','skyWitness','frostWitness','firstWitness']);
const PAINT_BUDGET=18;
const int=n=>Math.round(Number(n)||0),clamp=(x,a,b)=>Math.max(a,Math.min(b,x)),realm=i=>REGIONS[clamp(Number(i)||0,0,7)]||REGIONS[0];
const rect=(c,x,y,w,h,color)=>{if(w<=0||h<=0)return;c.fillStyle=color;c.fillRect(int(x),int(y),Math.ceil(w),Math.ceil(h));};
const hash=(x,y,r)=>{let z=Math.imul((x|0)+23,668265263)^Math.imul((y|0)+17,374761393)^Math.imul((r|0)+47,1274126177);return(Math.imul(z^(z>>>13),1274126177)^(z>>>16))>>>0;};
const stroke=(c,x1,y1,x2,y2,color,w=1)=>{c.beginPath();c.lineWidth=w;c.strokeStyle=color;c.moveTo(x1,y1);c.lineTo(x2,y2);c.stroke();};
function icon(c,x,y,p,scale=1){
 const s=scale,r=p.pattern;
 const dot=(dx,dy,w,h,col=p.accent)=>rect(c,x+dx*s,y+dy*s,w*s,h*s,col);
 if(r==='bough'){dot(3,1,2,8);dot(1,1,3,3,p.mid);dot(5,2,3,3,p.mid);dot(0,5,4,2);dot(4,5,3,2);}
 if(r==='mirror'){dot(1,1,6,8,p.stem);dot(2,2,4,6,p.sky);dot(3,3,2,3,p.accent);}
 if(r==='forge'){dot(1,6,7,2,p.mid);dot(3,2,3,5);dot(4,0,2,3,p.sky);}
 if(r==='tide'){dot(0,4,4,2);dot(3,3,4,2,p.mid);dot(5,5,3,2);dot(5,1,2,2,p.sky);}
 if(r==='sun'){dot(2,2,4,4,p.sky);dot(3,0,2,2);dot(3,6,2,2);dot(0,3,2,2);dot(6,3,2,2);}
 if(r==='wind'){dot(0,2,7,2);dot(2,5,6,2,p.sky);dot(5,0,3,1);}
 if(r==='frost'){dot(3,0,2,8);dot(0,3,8,2);dot(1,1,2,2,p.sky);dot(5,5,2,2,p.sky);}
 if(r==='page'){dot(0,1,7,1,p.mid);dot(1,3,6,1);dot(0,5,7,1,p.sky);dot(1,7,5,1);}
}
function plate(c,x,y,p,size=28){
 rect(c,x-size/2+2,y+2,size,size/2,'#04121a66');
 rect(c,x-size/2,y,size,size/2,p.stem);
 rect(c,x-size/2+2,y+2,size-4,size/2-4,p.silhouette);
 rect(c,x-size/2+4,y+2,size-8,2,p.mid);
 icon(c,x-5,y+3,p,1.2);
}
function plinth(c,x,y,p,r,tick,quiet,importance){
 const glow=quiet?0:Math.sin((tick+(r+1)*4)*.12)*2;
 const big=importance==='quest';
 rect(c,x-19,y+27,38,7,'#020b1180');
 rect(c,x-17,y+19,34,9,p.stem);
 rect(c,x-14,y+18,28,3,p.mid);
 rect(c,x-12,y+11,24,9,p.silhouette);
 if(big){
  rect(c,x-3,y+3+glow,6,11,p.accent);
  rect(c,x-1,y+5+glow,2,6,p.sky);
 }else{
  rect(c,x-8,y+11,16,6,p.mid);
  icon(c,x-4,y+8,p,1);
 }
}
function threshold(c,x,y,p,open){
 rect(c,x+8,y+34,32,5,'#05111b84');
 rect(c,x+6,y+14,4,26,p.stem);rect(c,x+38,y+14,4,26,p.stem);
 rect(c,x+10,y+8,28,6,p.mid);
 rect(c,x+12,y+11,24,2,p.accent);
 rect(c,x+10,y+36,28,2,p.mid);
 if(open){
  rect(c,x+10,y+16,27,18,p.sky+'2a');
  rect(c,x+23,y+16,2,18,p.accent+'81');
 }else{
  rect(c,x+11,y+16,27,17,p.stem);
  for(let k=0;k<3;k++)rect(c,x+12+k*9,y+17,2,15,p.mid);
  icon(c,x+21,y+20,p,.8);
 }
}
function stateFor(o,s){
 if(o.type==='door')return !!s.flags?.[o.requires];
 if(o.type==='keydoor')return !!s.flags?.['key'+s.region];
 if(o.type==='worldgate')return !!s.cleared?.includes(o.r);
 if(o.type==='trial')return !!s.flags?.['seal'+s.region];
 return true;
}
function detailOnObject(c,o,cam,s,tick=0,quiet=false,important=false){
 const p=realm(s.region),x=(o.x-cam.x)*TILE,y=(o.y-cam.y)*TILE;
 if(x<-90||y<-95||x>WIDTH+90||y>HEIGHT+90)return false;
 const n=hash(o.x,o.y,s.region);
 if(['door','keydoor','worldgate','down','up','leave','exit'].includes(o.type)){
  threshold(c,x,y,p,stateFor(o,s));return true;
 }
 if(['trial','spring','hollowFountain','oracleShrine','skyBeacon','frostHearth','firstConcordance','concordance','hearth','bell','civicPlan','coolantStation','catalogDial','lanternMemory'].includes(o.type)){
  plinth(c,x+24,y+7,p,s.region,tick,quiet,important?'quest':'landmark');return true;
 }
 if(['inn','shop','forge','board'].includes(o.type)){
  // Quiet region crests on existing service façades, without extra fake doors.
  const where=o.type==='board'?-12:-22;
  plate(c,x+24,y+where,p,28);
  return true;
 }
 if(STORY.has(o.type)&&important){
  // Short directional pennant near the actual quest NPC, never over the sprite.
  rect(c,x+38,y-18,3,18,p.stem);
  rect(c,x+40,y-20,13,11,p.mid);
  rect(c,x+41,y-19,11,8,p.silhouette);
  icon(c,x+43,y-18,p,.8);
  return true;
 }
 if(o.type==='boss'&&important){plinth(c,x+24,y+10,p,s.region,tick,quiet,'quest');return true;}
 return false;
}
function field(c,map,cam,s,tick=0,quiet=false,guide=null){
 if(!c||!map||!cam||!s)return {staged:0,heroSigns:0};
 const o=map.objects||[],guideId=guide?.id||'',selected=[];
 // Prioritize the grounded quest destination and central services; no clutter
 // from dozens of duplicate waypoints on one viewport.
 const primary=o.find(x=>x.id===guideId);
 if(primary)selected.push(primary);
 const other=o.filter(x=>x.id!==guideId&&(OBJECTS.has(x.type)||STORY.has(x.type)))
  .filter(x=>Math.abs(x.x-s.x)<=9&&Math.abs(x.y-s.y)<=7)
  .sort((a,b)=>Math.abs(a.x-s.x)+Math.abs(a.y-s.y)-Math.abs(b.x-s.x)-Math.abs(b.y-s.y));
 for(const item of other){
  if(selected.length>=Math.min(PAINT_BUDGET,s.place==='town'?9:5))break;
  if(STORY.has(item.type)&&item.id!==guideId)continue;
  selected.push(item);
 }
 let staged=0,heroSigns=0;
 for(const item of selected){
  // Do not decorate completed/removed objects.
  if(s.flags?.['done:'+item.id]||item.type==='boss'&&s.cleared?.includes(item.r))continue;
  if(detailOnObject(c,item,cam,s,tick,quiet,item.id===guideId)){staged++;if(item.id===guideId)heroSigns++;}
 }
 return {staged,heroSigns};
}
function battle(c,stage,region=0,boss=false){
 if(!stage||!c||!c.fillRect)return false;
 const p=realm(region),w=stage.width||816,h=stage.height||330;
 const rect0=(x,y,ww,hh,col)=>rect(c,x*w,y*h,ww*w,hh*h,col);
 const art=root.LQArt&&root.LQArt.bg&&root.LQArt.bg(c,region,0,0,w,h);
 if(art){
  // Readability + depth wash over the painted region key-art.
  if(c.createLinearGradient){const g=c.createLinearGradient(0,0,0,h);g.addColorStop(0,'rgba(6,14,22,.42)');g.addColorStop(.52,'rgba(6,14,22,.10)');g.addColorStop(1,'rgba(4,9,15,.66)');c.save();c.fillStyle=g;c.fillRect(0,0,w,h);c.restore();}
  else rect0(0,0,1,1,'#0a131c55');
  rect0(0,.70,1,.01,p.accent+'4a'); // ground line to seat the enemy cards
 }else{
 // Ground line and distant scene architecture behind all enemy cards.
 rect0(0,.69,1,.02,p.stem+'9c');
 rect0(0,.71,1,.29,'#07121a1c');
 for(let k=0;k<6;k++){
  const bx=k/5*.94,seed=hash(k,region,boss?1:0),height=.08+(seed%11)/160;
  if(region===0){ // Ancient canopy
   rect0(bx,.70-height,.014,height+.02,p.stem+'86');
   rect0(bx-.024,.70-height-.05,.066,.038,p.mid+'76');
   rect0(bx-.018,.70-height-.08,.052,.036,p.silhouette+'b1');
  }else if(region===1){
   rect0(bx,.70-height,.025,height+.05,p.stem+'8a');
   rect0(bx-.01,.70-height-.022,.045,.029,p.sky+'4e');
  }else if(region===2){
   rect0(bx,.70-height,.026,height+.08,p.silhouette+'9b');
   rect0(bx+.004,.70-height-.02,.018,.014,p.mid+'b9');
  }else if(region===3){
   rect0(bx,.70-height,.012,height+.07,p.silhouette+'8e');
   rect0(bx-.018,.70-height-.024,.05,.014,p.sky+'52');
  }else if(region===4){
   rect0(bx-.02,.69-height,.062,.039,p.mid+'64');
   rect0(bx,.69-height-.035,.023,.04,p.silhouette+'9a');
  }else if(region===5){
   rect0(bx,.68-height,.016,height+.04,p.stem+'93');
   rect0(bx-.017,.68-height-.013,.048,.012,p.accent+'6c');
  }else if(region===6){
   rect0(bx,.7-height,.026,height+.04,p.mid+'6c');
   rect0(bx+.006,.7-height-.07,.014,.064,p.sky+'64');
  }else{
   rect0(bx,.7-height,.039,height+.03,p.silhouette+'a2');
   for(let j=0;j<3;j++)rect0(bx+.006,.7-height+j*.022,.025,.008,p.accent+'6e');
  }
 }
 }
 // Two-stage arch overhead; frames, rather than obscures, the scene.
 rect0(.01,.09,.016,.60,p.stem+'9a');
 rect0(.974,.09,.016,.60,p.stem+'9a');
 rect0(0,.07,1,.018,p.silhouette+'84');
 rect0(.02,.11,.96,.008,p.mid+'64');
 if(boss){
  rect0(.47,.085,.06,.023,p.accent+'c0');
  icon(c,(w/2)-8,h*.102,p,2);
 }
 return true;
}
function mountBattle(stage,region=0,boss=false){
 if(!stage?.appendChild||!root.document)return false;
 const old=stage.querySelector?.('.v65-scene-scenery');
 if(old)old.remove();
 const canvas=root.document.createElement('canvas');
 canvas.className='v65-scene-scenery';
 canvas.width=816;canvas.height=330;
 canvas.setAttribute('aria-hidden','true');
 const ctx=canvas.getContext('2d');
 if(!ctx)return false;
 battle(ctx,canvas,region,boss);
 stage.insertBefore(canvas,stage.firstChild);
 if(root.LQArt&&!root.LQArt.ready('environments'))root.LQArt.whenReady('environments',()=>{try{battle(ctx,canvas,region,boss);}catch(e){}});
 return true;
}
const api=Object.freeze({version:'v65',regions:REGIONS,field,battle,mountBattle,detailOnObject,icon,hash,paintBudget:PAINT_BUDGET});
if(typeof module!=='undefined'&&module.exports)module.exports=api;
if(root)root.LQV65SceneArt=api;
})(typeof window!=='undefined'?window:typeof globalThis!=='undefined'?globalThis:null);
