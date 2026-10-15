/* Lexicon Quest v67 — Counterplay Director.
 * Highlights REAL enemy counterattacks from committed combat damage snapshots.
 * No game-rule hooks, RNG calls, player input capture or saved-state writes.
 */
(function(root){
'use strict';
const DURATION=1100,PI=Math.PI,TAU=PI*2;
const REALMS=[
 ['#96d3a7','#e7f4b1'],['#abbfea','#d8eaff'],['#ee946b','#ffe19e'],
 ['#72c7c1','#d5f7ec'],['#ebc38b','#fff0b8'],['#a4cded','#e9f8fb'],
 ['#96d9ef','#eefcff'],['#cfabe4','#f7e7ff']
];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const ease=t=>{t=clamp(t,0,1);return t*t*(3-2*t)};
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function model(fx,realm=0){
 if(!fx||!Number.isFinite(Number(fx.at)))return null;
 const losses=(Array.isArray(fx.party)?fx.party:[]).filter(p=>(p?.delta||0)<0&&Number.isFinite(p.delta)).map(p=>({
  id:Math.floor(Number(p.id)||0),name:String(p.name||'Companion'),
  damage:-p.delta
 }));
 if(!losses.length)return null;
 const total=losses.reduce((n,p)=>n+p.damage,0);
 return {key:[fx.originId||'',fx.at,fx.action||'',losses.map(p=>p.id+':'+p.damage).join('|')].join(':'),
  realm:clamp(Math.floor(Number(realm)||0),0,7),targets:losses,
  total,heavy:total>=38,at:Number(fx.at),
  label:total>=38?'HEAVY ENEMY STRIKE':'ENEMY COUNTERATTACK'};
}
function feedback(m){
 if(!m)return '';
 const entries=m.targets.map(t=>'<span class="v67-damage-item"><strong>'+esc(t.name)+'</strong> <b>−'+t.damage+' HP</b></span>').join('');
 return '<div class="v67-counterplay-report '+(m.heavy?'heavy':'')+'" role="status" aria-live="polite"><span class="v67-report-heading">'+m.label+'</span><span class="v67-report-hits">'+entries+'</span></div>';
}
function points(width,height,targets){
 width=Math.max(1,width);height=Math.max(1,height);
 return targets.map((t,i)=>({
  id:t.id,damage:t.damage,
  from:{x:width*.50,y:height*.31},
  to:{x:width*(.18+Math.min(2,t.id)*.32),y:height*.86}
 }));
}
function circle(c,x,y,r,color,alpha=1){
 c.globalAlpha=clamp(alpha,0,1);c.strokeStyle=color;c.lineWidth=2.4;
 c.beginPath();c.arc(x,y,Math.max(1,r),0,TAU);c.stroke();c.globalAlpha=1;
}
function line(c,a,b,width,color,alpha=1){
 c.globalAlpha=clamp(alpha,0,1);c.lineWidth=width;c.strokeStyle=color;
 c.beginPath();c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);c.stroke();c.globalAlpha=1;
}
function drawFrame(c,m,t,width,height){
 if(!c||!m||typeof c.beginPath!=='function')return false;
 const progress=clamp(t,0,1),colors=REALMS[m.realm],targets=points(width,height,m.targets);
 const alpha=1-ease(clamp((progress-.70)/.30,0,1));
 // Incoming attacks never fake which particular monster hit: the volley starts
 // at the enemy side of the arena, not a made-up attacker ID.
 for(let i=0;i<targets.length;i++){
  const aim=targets[i],travel=ease(clamp((progress-.13)/.55,0,1));
  const projectile={x:aim.from.x+(aim.to.x-aim.from.x)*travel,y:aim.from.y+(aim.to.y-aim.from.y)*travel};
  const tail={x:aim.from.x+(aim.to.x-aim.from.x)*clamp(travel-.16,0,1),y:aim.from.y+(aim.to.y-aim.from.y)*clamp(travel-.16,0,1)};
  if(progress<.75){
   line(c,tail,projectile,8,colors[0],.40);
   line(c,tail,projectile,3,colors[1],.92);
   circle(c,projectile.x,projectile.y,6+3*Math.sin(t*18),colors[1],.6,2);
  }
  if(progress>.43){
   const impact=ease(clamp((progress-.43)/.57,0,1));
   circle(c,aim.to.x,aim.to.y,7+52*impact,colors[0],alpha*.86);
   circle(c,aim.to.x,aim.to.y,5+29*impact,colors[1],alpha*.8);
   for(let n=0;n<9;n++){
    const angle=(n/9)*TAU+(m.realm%3)*.19,rad=10+impact*55;
    c.globalAlpha=alpha*.85;c.fillStyle=colors[n%2];
    c.fillRect(aim.to.x+Math.cos(angle)*rad,aim.to.y+Math.sin(angle)*rad,2.5+(n%3),2.5+(n%3));
   }
   c.globalAlpha=1;
  }
 }
 if(m.heavy&&progress>.4){
  const wave=ease(clamp((progress-.4)/.6,0,1));
  circle(c,width*.5,height*.89,20+wave*width*.42,colors[0],alpha*.45);
 }
 return true;
}
let lastKey='';
function decorate(shell,fx,realm=0){
 if(!shell||!root.document)return false;
 const m=model(fx,realm);
 if(!m||m.key===lastKey)return false;
 lastKey=m.key;
 const stage=shell.querySelector('.battle-stage'),party=shell.querySelector('.battle-party');
 if(!stage||!party)return false;
 const report=root.document.createElement('div');
 report.innerHTML=feedback(m);
 const node=report.firstElementChild;
 if(node)stage.insertAdjacentElement('afterend',node);
 for(const t of m.targets){
  const card=party.querySelector('.combat-ally[data-id="'+t.id+'"]');
  if(!card)continue;
  card.classList.add('v67-ally-hit');
  const floating=root.document.createElement('span');
  floating.className='v67-floating-damage';
  floating.textContent='−'+t.damage+' HP';
  floating.setAttribute('aria-hidden','true');
  card.appendChild(floating);
 }
 if(root.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches)return true;
 if(typeof root.requestAnimationFrame!=='function')return true;
 const canvas=root.document.createElement('canvas');
 canvas.className='v67-reaction-canvas';
 canvas.setAttribute('aria-hidden','true');
 stage.appendChild(canvas);
 const bounds=stage.getBoundingClientRect(),dpr=clamp(root.devicePixelRatio||1,1,1.6);
 const width=Math.max(1,bounds.width),height=Math.max(1,bounds.height);
 canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);
 const c=canvas.getContext('2d');
 if(!c){canvas.remove();return true;}
 c.scale(dpr,dpr);
 const start=root.performance?.now?.()??0;
 function tick(now){
  if(!canvas.isConnected)return;
  const t=clamp((now-start)/DURATION,0,1);
  c.clearRect(0,0,width,height);
  drawFrame(c,m,t,width,height);
  if(t<1)root.requestAnimationFrame(tick);
  else canvas.remove();
 }
 root.requestAnimationFrame(tick);
 return true;
}
const api=Object.freeze({version:'v67',DURATION,REALMS,model,feedback,points,drawFrame,decorate});
if(typeof module!=='undefined'&&module.exports)module.exports=api;
if(root)root.LQV67Counterplay=api;
})(typeof window!=='undefined'?window:typeof globalThis!=='undefined'?globalThis:null);
