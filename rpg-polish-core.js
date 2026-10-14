/* Lexicon Quest / RPG Adventure Flow. Readable combat, navigation and inventory.
 * All gameplay actions reuse existing rules and save fields. */
(function(root){
'use strict';
const LQ=root.LQ;if(!LQ?.Game)return;
const direction=[[0,-1],[1,0],[0,1],[-1,0]];
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function guide(g){
 const s=g?.s;if(!s)return null;
 let h=null;try{h=g.guide();}catch{}
 const hp=s.party.reduce((n,p)=>n+p.hp,0),max=s.party.reduce((n,p)=>n+p.maxhp,0);
 return {objective:String(g.objective()||'Explore the realm'),target:h,region:s.region,
  health:max?hp/max:0,healthBand:hp/max<.35?'critical':hp/max<.7?'caution':'ready',
  fragments:s.cleared?.length||0,potions:s.potions||0};
}
function route(g,tx,ty,adjacent=false){
 const s=g?.s,map=g?.map();if(!s||!map||!Number.isInteger(tx)||!Number.isInteger(ty))return null;
 const start=s.x+','+s.y,goals=new Set(),objects=g.objects?.()||[];
 for(const [dx,dy] of adjacent?direction:[[0,0]]){
  const x=tx+dx,y=ty+dy;
  if(x>=0&&x<map.w&&y>=0&&y<map.h&&!g.blocked(x,y))goals.add(x+','+y);
 }
 if(!goals.size)return null;
 let found=null;const seen=new Map([[start,null]]),queue=[[s.x,s.y]];
 for(let i=0;i<queue.length;i++){
  const [x,y]=queue[i],key=x+','+y;
  if(goals.has(key)){found=key;break;}
  if(i>map.w*map.h)break;
  for(const [dx,dy] of direction){
   const a=x+dx,b=y+dy,k=a+','+b;
   if(a<0||b<0||a>=map.w||b>=map.h||seen.has(k)||g.blocked(a,b))continue;
   const o=objects.find(v=>v.x===a&&v.y===b);
   if(o){
    if(['enemy','boss','boulder','obstacle'].includes(o.type))continue;
    if(o.type==='door'&&!s.flags[o.requires])continue;
    if(o.type==='keydoor'&&!s.flags['key'+s.region])continue;
    if(o.type==='worldgate'&&!s.cleared.includes(o.r))continue;
   }
   if(s.place==='world'&&LQ.regionAt&&!g.available(LQ.regionAt(a,b)))continue;
   seen.set(k,{before:key,dx,dy});queue.push([a,b]);
  }
 }
 if(found===null)return null;
 let at=found;const path=[];
 while(at!==start){const link=seen.get(at);if(!link)break;path.unshift([link.dx,link.dy]);at=link.before;}
 return {path,tiles:path.length,end:found};
}
function questRoute(g){
 try{const h=g.guide();const o=h?.id&&g.objects().find(v=>v.id===h.id);return o?route(g,o.x,o.y,true):null;}
 catch{return null;}
}
const weight={might:5.3,guard:3.9,focus:2.4,spirit:3.3,vitality:2.2};
function score(i,p){
 if(!i)return 0;let x=(i.bonus||0)*(weight[i.stat]||1);
 if(i.stat==='spirit'&&p?.maxmp)x*=1+.6*(1-p.mp/p.maxmp);
 if(i.stat==='vitality'&&p?.maxhp)x*=1+.4*(1-p.hp/p.maxhp);
 return x+(i.rarity||0)*.1;
}
function compare(item,old,p){
 const delta=score(item,p)-score(old,p);
 return {delta,more:delta>.15,label:!old?'Empty slot':old.stat!==item.stat?'Different build':delta>.15?'Upgrade':delta<-.15?'Downgrade':'Equivalent'};
}
function recommendations(s){
 if(!s?.party||!LQ.loot?.equippedItem)return [];
 return s.party.map((p,index)=>{
  const current=LQ.loot.equippedItem(s,p);
  const items=(s.loot||[]).filter(i=>!s.party.some(q=>q!==p&&q.charmId===i.id));
  const best=items.sort((a,b)=>score(b,p)-score(a,p))[0]||null;
  return {index,hero:p.name,current,best,comparison:best?compare(best,current,p):null,
   upgrade:!!best&&(!current||score(best,p)>score(current,p)+.15)&&best.id!==current?.id};
 });
}
function equipBest(g,index){
 const pick=recommendations(g?.s)[index];
 if(!pick?.upgrade)return {ok:false,message:'Your current equipment is already a strong fit.'};
 const ok=g.equipLoot(pick.best.id,index)===true;
 return {ok,message:ok?'Equipped '+pick.best.name+' for '+pick.hero+'.':'Could not equip this item.'};
}
function quickRecover(g){
 if(!g?.s||g.battle)return {ok:false,message:'Recovery is unavailable during combat.'};
 const s=g.s,needs=s.party.filter(p=>p.hp>0&&p.hp<p.maxhp);
 if(!needs.length)return {ok:false,message:'The party is at full health.'};
 if(!s.potions)return {ok:false,message:'No potions remain. Visit the town inn.'};
 needs.sort((a,b)=>a.hp/a.maxhp-b.hp/b.maxhp);
 const p=needs[0],old=p.hp;p.hp=Math.min(p.maxhp,p.hp+65);s.potions--;
 const message='Potion restores '+(p.hp-old)+' HP to '+p.name+'. '+s.potions+' remaining.';
 g.emit(message);return {ok:true,message,recovered:p.hp-old,hero:p.name};
}
function enemies(g){
 const b=g?.battle;if(!b)return [];
 return b.enemies.map((e,index)=>{
  const role=e.role==='mender'?'Healer':e.role==='warder'?'Defender':e.role==='hunter'?'Striker':e.role==='guardian'?'Guardian':'Enemy';
  const threat=e.charge?100:e.role==='mender'?75:e.role==='hunter'?55:e.role==='warder'?40:60;
  return {index,name:e.name,role,threat,hp:e.hp,maxhp:e.maxhp,weak:e.weak||'none',resist:e.resist||'none',
   warn:e.charge?'Charging a heavy attack':e.fortified?'Protected by armor':e.role==='mender'?'May restore allies':'Preparing an attack',
   counter:e.charge?'Guard, cast Aegis, or interrupt':e.fortified?'Break armor with piercing skills':e.weak==='fire'?'Use fire':e.weak==='ice'?'Use frost':e.weak==='pierce'?'Use Piercing Thrust':'Build Focus',
   defeated:e.hp<=0};
 });
}
function priority(g){return enemies(g).filter(e=>!e.defeated).sort((a,b)=>b.threat-a.threat||a.hp/a.maxhp-b.hp/b.maxhp)[0]||null;}
function recommend(g){
 const b=g?.battle;if(!b)return null;
 const p=g.s.party[b.actor],abilities=g.abilities(p),charged=enemies(g).find(e=>!e.defeated&&e.threat===100);
 if(charged){
  if(abilities.includes('pierce'))return {title:'Interrupt the charged attack',description:'Target '+charged.name+' with Piercing Thrust.',action:'pierce',target:charged.index,level:'danger'};
  if(abilities.includes('ward')&&p.mp>=(LQ.skills?.ward?.cost||0))return {title:'Shield your companions',description:'Aegis can reduce the incoming burst.',action:'ward',target:0,level:'danger'};
  return {title:'Defend this turn',description:'A heavy attack is coming. Guard to reduce damage.',action:'guard',target:0,level:'danger'};
 }
 const hurt=g.s.party.find(q=>q.hp>0&&q.hp/q.maxhp<.38);
 if(hurt&&abilities.includes('mend')&&p.mp>=(LQ.skills?.mend?.cost||0))return {title:'Heal a wounded ally',description:hurt.name+' has low HP.',action:'mend',target:g.s.party.indexOf(hurt),level:'caution'};
 const e=priority(g);
 if(e){
  const match=[['flare','fire'],['frost','ice'],['pierce','pierce'],['crush','crush']].find(([skill,kind])=>e.weak===kind&&abilities.includes(skill));
  if(match)return {title:'Strike a weakness',description:e.name+' is weak to '+e.weak+'.',action:match[0],target:e.index,level:'advantage'};
 }
 return {title:'Build Focus and mastery',description:e?'Attack '+e.name+' and prepare for its next move.':'Choose an action.',action:'attack',target:e?.index||0,level:'info'};
}
function battleBanner(g){
 const h=recommend(g);return !h?'':'<div class="lq-battle-read is-'+esc(h.level)+'" role="status"><span>BATTLE READ</span><strong>'+esc(h.title)+'</strong><small>'+esc(h.description)+'</small></div>';
}
function questBanner(g){
 const h=guide(g);if(!h)return '';
 const r=questRoute(g),name=h.target?.label||h.objective;
 const dist=r?'Path verified: '+r.tiles+' steps':h.target?h.target.dir+' · approx. '+h.target.tiles+' tiles':'Explore this area';
 return '<div class="lq-quest-read"><div><span>NEXT DESTINATION</span><strong>'+esc(name)+'</strong></div><small>'+esc(dist)+'</small></div>';
}
LQ.polish={guide,route,questRoute,score,compare,recommendations,equipBest,quickRecover,enemies,priority,recommend,battleBanner,questBanner};
})(typeof window!=='undefined'?window:globalThis);
