/* Lexicon Quest v62 — Living Combat Studio.
 * Original canvas-based action choreography and actor portraits built from the
 * game's own sprite renderer. Presentation ONLY: never calls Game.act, never
 * changes HP, saves, combat rolls or input handling.
 */
(function(root){
'use strict';
const TILE_W=20,TILE_H=24,DURATION=900,TAU=Math.PI*2;
const KIND={
 attack:'physical',guard:'guard',ward:'ward',resonance:'resonance',
 flare:'fire',frost:'ice',pierce:'pierce',crush:'physical',
 lexibolt:'arcane',prism:'arcane',mend:'heal',revive:'heal',
 potion:'heal',ether:'mana'
};
const P={
 physical:['#ecf0f2','#d7d7c1','#c9ab73'],
 pierce:['#f7eecc','#fff7da','#acc9d5'],
 fire:['#fba35e','#ffe098','#ff6d4e'],
 ice:['#8bdcff','#e1faff','#6eb5ec'],
 arcane:['#b89af6','#f4d5ff','#849ee3'],
 resonance:['#f9d082','#fff4c0','#c2a0ff'],
 heal:['#7fcda8','#efffe4','#a8e5b8'],
 mana:['#92b5fa','#f1e6ff','#b69ced'],
 ward:['#94d2be','#f7edb5','#9bbaea'],
 guard:['#c3d8d3','#f4dfb5','#91aebc']
};
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const ease=x=>{x=clamp(x,0,1);return x*x*(3-2*x);};
const isSupport=k=>['heal','mana','ward','guard'].includes(k);
function classify(action){return KIND[String(action||'').toLowerCase()]||'physical';}
function direction(fx){
 return fx?.enemies?.some(e=>e.delta<0)?'enemies':fx?.party?.some(e=>e.delta!==0||e.mpDelta!==0)?'party':'neutral';
}
function cast(fx,actor=0){
 if(!fx||!Number.isFinite(Number(fx.at)))return null;
 const kind=P[fx.kind]?fx.kind:classify(fx.action);
 return {
  key:String(fx.originId||'')+':'+String(fx.at)+':'+String(fx.action||''),
  at:Number(fx.at),kind,actor:clamp(Number(actor)||0,0,2),
  side:direction(fx),
  targets:(fx.enemies||[]).filter(e=>e.delta!==0||e.defeated).map(e=>({id:e.id,delta:e.delta,defeated:!!e.defeated})),
  party:(fx.party||[]).filter(e=>e.delta!==0||e.mpDelta!==0).map(e=>({id:e.id,delta:e.delta,mp:e.mpDelta})),
  palette:P[kind].slice()
 };
}
function geometry(width,height,targets,side){
 width=Math.max(1,width);height=Math.max(1,height);
 const start={x:Math.min(width*.16,92),y:height*.68};
 const destination=targets.length?targets:side==='party'?[{x:width*.18,y:height*.53}]:[{x:width*.67,y:height*.50}];
 return {start,destination:center(destination)};
}
function center(pts){
 const n=pts.length||1;
 return{x:pts.reduce((a,p)=>a+p.x,0)/n,y:pts.reduce((a,p)=>a+p.y,0)/n};
}
function seeded(seed){let x=(seed|0)||47;return()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return(x>>>0)/4294967296;};}
function particles(kind,seed=1,n=28){
 const rand=seeded(seed);
 return Array.from({length:n},(_,i)=>({
  angle:i/n*TAU+(rand()-.5)*.52,
  spread:.25+rand()*.7,
  speed:22+rand()*90,
  radius:1.1+rand()*2.9,
  twist:(rand()-.5)*.8
 }));
}
function actionLabel(kind){
 return ({physical:'BLADE STRIKE',pierce:'PIERCING THRUST',fire:'FIRE ARTS',ice:'FROST ARTS',arcane:'ARCANE TECHNIQUE',
 resonance:'TRIAD RESONANCE',heal:'RECOVERY',mana:'ETHER FLOW',ward:'AEGIS WARD',guard:'DEFENSIVE STANCE'})[kind]||'TECHNIQUE';
}
function q(sel,parent){return parent?.querySelector?.(sel)||null;}
function drawSprite(canvas,id,frame=0){
 const atlas=root.LQSpriteAtlas;if(!atlas?.renderFrame||!canvas?.getContext)return false;
 const c=canvas.getContext('2d');if(!c)return false;
 c.clearRect(0,0,canvas.width,canvas.height);
 c.imageSmoothingEnabled=false;
 const size=Math.min(Math.floor(canvas.width/TILE_W),Math.floor(canvas.height/TILE_H));
 const scale=Math.max(1,size);
 c.save();
 c.translate(Math.floor((canvas.width-TILE_W*scale)/2),Math.floor((canvas.height-TILE_H*scale)/2));
 c.scale(scale,scale);
 atlas.renderFrame(c,id,'down',frame);
 c.restore();
 return true;
}
let lastKey='';
function portrait(stage,actorIndex){
 const header=stage?.closest?.('.battle-shell')?.querySelector?.('.battle-heading');
 if(!header)return false;
 const area=q('h2',header)?.parentNode;
 if(!area||!root.document)return false;
 const sprite=root.document.createElement('canvas');
 sprite.className='v62-actor-avatar';
 sprite.width=60;sprite.height=72;
 sprite.setAttribute('aria-hidden','true');
 drawSprite(sprite,actorIndex,0);
 area.classList.add('v62-actor-heading');
 area.insertBefore(sprite,area.querySelector('h2'));
 return true;
}
function targetPoints(stage,model){
 const bounds=stage.getBoundingClientRect();
 const pts=[];
 const enemies=model?.targets||[];
 if(model.side==='enemies'){
  for(const item of enemies){
   const el=q('.tactical-enemy[data-id="'+item.id+'"]',stage);
   if(!el)continue;
   const r=el.getBoundingClientRect();
   pts.push({x:r.left-bounds.left+r.width*.5,y:r.top-bounds.top+r.height*.48});
  }
 }else if(model.side==='party'){
  pts.push({x:bounds.width*.22,y:bounds.height*.68});
 }
 return pts;
}
function stroke(c,x1,y1,x2,y2,w,color,alpha=1){
 c.globalAlpha=alpha;c.strokeStyle=color;c.lineWidth=w;c.beginPath();
 c.moveTo(x1,y1);c.lineTo(x2,y2);c.stroke();c.globalAlpha=1;
}
function ring(c,x,y,r,color,alpha=1,width=2){
 c.globalAlpha=clamp(alpha,0,1);c.strokeStyle=color;c.lineWidth=width;
 c.beginPath();c.arc(x,y,Math.max(1,r),0,TAU);c.stroke();c.globalAlpha=1;
}
function renderFrame(c,scene,t,points,width,height){
 if(!scene||!c)return false;
 const {kind,palette}=scene,progress=clamp(t,0,1);
 const {start,destination}=geometry(width,height,points,scene.side);
 const p=scene.side==='party'?{x:width*.22,y:height*.68}:destination;
 const travel=ease(clamp(progress/.55,0,1));
 const at={x:start.x+(p.x-start.x)*travel,y:start.y+(p.y-start.y)*travel};
 const opacity=1-ease(clamp((progress-.66)/.34,0,1));
 if(isSupport(kind)){
  const supportive=kind==='ward'||kind==='guard';
  const sx=supportive?width*.25:p.x,sy=supportive?height*.60:p.y;
  ring(c,sx,sy,9+110*ease(progress),palette[0],opacity*.84,4);
  ring(c,sx,sy,23+70*progress,palette[1],opacity*.82,1.8);
  for(let i=0;i<12;i++){
   const angle=i/12*TAU+progress*(supportive?-1:1);
   const rad=20+44*progress;
   c.fillStyle=palette[i%3];c.globalAlpha=opacity;
   c.fillRect(sx+Math.cos(angle)*rad,sy+Math.sin(angle)*rad,3.5,3.5);
  }
  c.globalAlpha=1;
  if(supportive){
   stroke(c,sx-23,sy-14,sx,sy-32,3,palette[1],opacity);
   stroke(c,sx,sy-32,sx+23,sy-14,3,palette[1],opacity);
  }
 }else{
  // The attack projectile is physically interpolated from actor to targets.
  const beam=kind==='fire'||kind==='ice'||kind==='arcane'||kind==='resonance';
  if(progress<.67){
   ring(c,at.x,at.y,8+12*progress,palette[1],.75,beam?2.5:1.5);
   for(let k=0;k<(beam?3:2);k++)
    stroke(c,at.x-(p.x-start.x)*.07*k,at.y-(p.y-start.y)*.07*k,at.x,at.y,2+k*1.8,palette[k],.65-progress*.2);
  }
  if(progress>.28){
   const burst=clamp((progress-.28)/.72,0,1),fade=1-ease(clamp((burst-.4)/.6,0,1));
   ring(c,p.x,p.y,5+80*ease(burst),palette[0],fade*.83,4);
   if(kind==='physical'||kind==='pierce'){
    for(let k=0;k<3;k++){
     const off=(k-1)*11,half=44+burst*33;
     stroke(c,p.x-half,p.y+half*.25+off,p.x+half,p.y-half*.46+off,6-k,palette[k],fade);
    }
   }else if(kind==='ice'){
    for(let k=0;k<8;k++){
     const angle=k/8*TAU+progress*.5,r=28+55*burst;
     const sx=p.x+Math.cos(angle)*r,sy=p.y+Math.sin(angle)*r;
     stroke(c,sx-5,sy-5,sx+6,sy+6,2.5,palette[k%3],fade);
     stroke(c,sx+5,sy-5,sx-6,sy+6,2.5,palette[1],fade);
    }
   }else if(kind==='resonance'){
    for(let i=0;i<3;i++)ring(c,p.x,p.y,25+i*28+burst*34,palette[i],fade*.72,2);
   }
  }
 }
 const sparks=particles(kind,scene.at+scene.actor*47,kind==='resonance'?48:32);
 for(let i=0;i<sparks.length;i++){
  const a=sparks[i],appear=clamp((progress-.19)*4,0,1),fade=(1-ease(progress))*appear;
  const r=a.speed*progress*a.spread,angle=a.angle+a.twist*progress;
  const x=p.x+Math.cos(angle)*r,y=p.y+Math.sin(angle)*r-(kind==='fire'?progress*35:0);
  c.globalAlpha=fade;c.fillStyle=palette[i%3];
  c.fillRect(x,y,a.radius,a.radius);
 }
 c.globalAlpha=1;
 return true;
}
function animate(stage,scene){
 if(!stage||!scene||typeof root.requestAnimationFrame!=='function')return false;
 if(root.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches)return false;
 const cv=root.document.createElement('canvas');
 cv.className='v62-vfx';
 cv.setAttribute('aria-hidden','true');
 stage.appendChild(cv);
 const stageSize=stage.getBoundingClientRect();
 const ratio=clamp(root.devicePixelRatio||1,1,2);
 const w=Math.max(1,stageSize.width),h=Math.max(1,stageSize.height);
 cv.width=Math.ceil(w*ratio);cv.height=Math.ceil(h*ratio);
 const ctx=cv.getContext('2d');if(!ctx)return false;
 ctx.scale(ratio,ratio);
 const points=targetPoints(stage,scene),started=performance.now();
 function step(now){
  if(!cv.isConnected)return;
  const t=clamp((now-started)/DURATION,0,1);
  ctx.clearRect(0,0,w,h);
  renderFrame(ctx,scene,t,points,w,h);
  if(t<1)root.requestAnimationFrame(step);else cv.remove();
 }
 root.requestAnimationFrame(step);
 return true;
}
function decorate(stage,actor=0,fx=null){
 if(!stage)return false;
 portrait(stage,actor);
 // Only display an impact once per actual, committed combat action.
 const e=fx&&typeof root.LQBattleEffects?.alive==='function'&&root.LQBattleEffects.alive(fx)?cast(fx,actor):null;
 if(e&&e.key!==lastKey){lastKey=e.key;animate(stage,e);}
 return true;
}
const api={version:'v62',KIND,P,DURATION,cast,classify,particles,geometry,renderFrame,drawSprite,actionLabel,decorate};
if(typeof module!=='undefined'&&module.exports)module.exports=api;
if(root)root.LQCombatStudio=api;
})(typeof window!=='undefined'?window:typeof globalThis!=='undefined'?globalThis:null);
