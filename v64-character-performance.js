/* Lexicon Quest v64 | Character Performance Director
 * Equipment-colored silhouettes, actual six-pose hero choreography, scene
 * footing and action cameos. Everything is render-only and interruptible.
 */
(function(root){
'use strict';
const ATLAS=()=>root.LQV63Atlas,CLASS=['Vanguard','Mystic','Guardian'];
const TYPE={attack:'blade',pierce:'thrust',flare:'flare',frost:'frost',lexibolt:'arcane',prism:'arcane',mend:'heal',revive:'heal',guard:'guard',ward:'ward',resonance:'triad',potion:'heal',ether:'arcane'};
const PALETTE=[
 {coat:'#79b9e0',trim:'#e8cb88',shadow:'#20364e',action:'#ffe09c'},
 {coat:'#b8a0df',trim:'#e6c9f5',shadow:'#3f3456',action:'#eacfff'},
 {coat:'#a4c7a0',trim:'#e9c587',shadow:'#32463f',action:'#cbf6ce'}
];
const pick=i=>((Math.floor(Number(i)||0)%3)+3)%3;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const rect=(c,x,y,w,h,color)=>{c.fillStyle=color;c.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));};
function poseFor(effect){
 if(!effect)return 0;
 const kind=TYPE[String(effect.action||'').toLowerCase()]||effect.kind||'blade';
 return ['guard','ward'].includes(kind)?5:4;
}
function field(c,x,y,options={}){
 const id=pick(options.id),palette=PALETTE[id],moving=!!options.walking;
 const quiet=!!options.reduced;
 const frame=quiet?0:moving?(1+Math.floor(Number(options.phase||0)*3)%3):0;
 const sx=Math.round(x),sy=Math.round(y),phase=quiet?0:Number(options.phase||0);
 const v=ATLAS();
 if(!v)return false;
 // Same dimensions and collision foot anchor as v63, with a less generic
 // role-specific ambient shadow and garment detail.
 rect(c,sx+11,sy+42,28,4,'#020e1670');
 const rv=v.drawHero(c,sx,sy,{...options,pose:frame,walking:moving});
 if(moving){
  const left=Math.sin(phase*11)>0;
  rect(c,sx+(left?17:29),sy+44,4,1,'#e5e2cc87');
  rect(c,sx+(left?14:31),sy+45,3,1,'#faf0c44c');
 }
 // Signature wearable crest at shoulder height. Does not replace original art.
 if(id===0){rect(c,sx+17,sy+22,5,2,palette.trim);rect(c,sx+17,sy+25,2,7,palette.coat);}
 if(id===1){rect(c,sx+26,sy+22,6,2,palette.trim);rect(c,sx+28,sy+25,3,3,palette.coat);}
 if(id===2){rect(c,sx+18,sy+24,13,2,palette.trim);rect(c,sx+20,sy+26,4,3,palette.coat);}
 return rv||true;
}
function portrait(canvas,id,pose=0){
 if(!canvas?.getContext||!ATLAS()?.renderHero)return false;
 const c=canvas.getContext('2d');if(!c)return false;
 const pid=pick(id),p=PALETTE[pid],w=canvas.width||60,h=canvas.height||72;
 c.clearRect(0,0,w,h);
 c.imageSmoothingEnabled=false;
 const z=Math.max(1,Math.min(Math.floor(w/20),Math.floor(h/24)));
 c.save?.();
 if(typeof c.translate==='function')c.translate(Math.floor((w-20*z)/2),Math.floor((h-24*z)/2));
 if(typeof c.scale==='function')c.scale(z,z);
 ATLAS().renderHero(c,pid,'down',pose);
 c.restore?.();
 if(typeof c.strokeRect==='function'){
  c.strokeStyle=p.trim;c.globalAlpha=.7;c.lineWidth=1;c.strokeRect(3,3,w-6,h-6);c.globalAlpha=1;
 }
 return true;
}
function flourish(c,w,h,color,frame){
 if(!c?.beginPath||!c.arc)return;
 c.save();
 const f=clamp(frame,0,1);
 const px=w*.56,py=h*.52,spread=14+f*36;
 c.globalAlpha=(1-f)*.8;c.strokeStyle=color;c.lineWidth=2.5;
 c.beginPath();c.arc(px,py,spread,0,Math.PI*2);c.stroke();
 for(let k=0;k<5;k++){
  const a=(k/5*Math.PI*2+f*3),xx=px+Math.cos(a)*(spread+6),yy=py+Math.sin(a)*(spread+6);
  rect(c,xx,yy,3,3,color);
 }
 c.restore();
}
let last='';
function cameo(stage,effect){
 const v=ATLAS();
 if(!stage||!effect||!v||typeof root.requestAnimationFrame!=='function')return false;
 if(root.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches)return false;
 const id=pick(effect.actor),key=[effect.originId,effect.at,effect.action,id].join('|');
 if(last===key)return false;
 last=key;
 const canvas=root.document?.createElement?.('canvas');
 if(!canvas)return false;
 canvas.width=160;canvas.height=180;
 canvas.className='v64-hero-cameo';
 canvas.setAttribute('aria-hidden','true');
 stage.appendChild(canvas);
 const c=canvas.getContext('2d');
 if(!c){canvas.remove();return false;}
 const action=poseFor(effect),p=PALETTE[id],duration=720;
 const start=root.performance?.now?.()??0;
 function frame(now){
  if(!canvas.isConnected)return;
  const t=clamp((now-start)/duration,0,1),arc=Math.sin(t*Math.PI);
  c.clearRect(0,0,canvas.width,canvas.height);
  c.imageSmoothingEnabled=false;
  c.save();
  const direction=t<.18?'down':t<.75?'right':'down';
  const pose=t<.15?1:t<.75?action:0;
  const leap=arc*13;
  c.translate(26+(t<.42?arc*5:0),30-leap);
  c.scale(5,5);
  v.renderHero(c,id,direction,pose);
  c.restore();
  flourish(c,160,180,p.action,t);
  if(t<1)root.requestAnimationFrame(frame);else canvas.remove();
 }
 root.requestAnimationFrame(frame);
 return true;
}
function decorate(stage,actor,effect){
 if(!stage)return false;
 const avatar=stage.closest?.('.battle-shell')?.querySelector?.('.v62-actor-avatar');
 if(avatar)portrait(avatar,actor,0);
 if(effect&&effect.actor!=null)cameo(stage,effect);
 return true;
}
const api=Object.freeze({version:'v64',classNames:CLASS,field,portrait,poseFor,decorate,cameo,PALETTE});
if(typeof module!=='undefined'&&module.exports)module.exports=api;
if(root)root.LQV64Performance=api;
})(typeof window!=='undefined'?window:typeof globalThis!=='undefined'?globalThis:null);
