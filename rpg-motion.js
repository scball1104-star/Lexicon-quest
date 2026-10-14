/* Lexicon Quest: movement, camera, sprite animation, ambient life and readable interactions.
 * Rendering only. Never mutates Game, its maps, its save slots or collision rules.
 */
(function(root){
'use strict';
const TILE=48,FRAME_MS=130;
const colors=[
 {cape:'#548ac9',light:'#8fbced',shade:'#294e88',belt:'#b99057',hair:'#352d35',skin:'#eab992',boot:'#303746',trim:'#e3c889'},
 {cape:'#a87dba',light:'#d6b0da',shade:'#674d82',belt:'#d7bf89',hair:'#6b4345',skin:'#e7b79c',boot:'#33364f',trim:'#e6cd9e'},
 {cape:'#7f9e92',light:'#b5c8a4',shade:'#465f61',belt:'#c3a15c',hair:'#48372f',skin:'#c79a78',boot:'#303c40',trim:'#dfba78'}
];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const ease=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
const hash=(x,y,n=0)=>{let v=Math.imul(x+71,374761393)^Math.imul(y+103,668265263)^Math.imul(n+7,1274126177);v=Math.imul(v^(v>>>13),1274126177);return (v^(v>>>16))>>>0;};
function facing(dx,dy){return Math.abs(dx)>Math.abs(dy)?(dx<0?'left':'right'):(dy<0?'up':'down');}
function step(previous,x,y,now=Date.now(),duration=FRAME_MS){
 const from=previous?position(previous,now):{x,y};
 return {fromX:from.x,fromY:from.y,toX:x,toY:y,time:now,duration:Math.max(45,duration),dir:previous?.dir||'down'};
}
function movement(fromX,fromY,toX,toY,now=Date.now(),duration=FRAME_MS){
 return {fromX,fromY,toX,toY,time:now,duration:Math.max(45,duration),dir:facing(toX-fromX,toY-fromY)};
}
function position(m,now=Date.now()){
 if(!m)return {x:0,y:0,progress:1,walking:false,dir:'down'};
 const t=clamp((now-m.time)/m.duration,0,1),v=ease(t);
 return {x:m.fromX+(m.toX-m.fromX)*v,y:m.fromY+(m.toY-m.fromY)*v,progress:t,walking:t<1,dir:m.dir||'down'};
}
function camera(previous,heroX,heroY,width,height,compact=false,alpha=.32){
 const minX=compact?-5:0,minY=0,limitX=compact?width-12:width-17,limitY=height-13;
 const toX=clamp(heroX-8,minX,Math.max(minX,limitX));
 const toY=clamp(heroY-6,minY,Math.max(minY,limitY));
 if(!previous||!Number.isFinite(previous.x)||!Number.isFinite(previous.y))return{x:toX,y:toY};
 const fx=previous.x+(toX-previous.x)*alpha,fy=previous.y+(toY-previous.y)*alpha;
 return {x:Math.abs(fx-toX)<.025?toX:fx,y:Math.abs(fy-toY)<.025?toY:fy};
}
const fill=(c,x,y,w,h,color)=>{c.fillStyle=color;c.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));};
function sprite(c,x,y,options={}){
 const palette=colors[options.id||0]||colors[0],face=options.dir||'down';
 const walk=!!options.walking,phase=Number(options.phase||0);
 const stride=walk?(Math.sin(phase*11)>0?1:-1):0;
 const bob=walk?Math.round(Math.abs(Math.sin(phase*11))*2):Math.round(Math.sin(phase*1.5));
 x=Math.round(x);y=Math.round(y);
 // Ground contact and moving shadow.
 fill(c,x+12,y+40,27,6,'#07131970');
 fill(c,x+15,y+42,20,2,'#263c4855');
 const sideways=face==='left'||face==='right',back=face==='up';
 // The moving cape is drawn before feet and body, with visible wind/breath animation.
 fill(c,x+13-stride,y+23+bob,24,18,palette.shade);
 fill(c,x+12-stride,y+28+bob,6,12,palette.cape);
 fill(c,x+29+stride,y+28+bob,8,12,palette.cape);
 fill(c,x+19+stride*2,y+36+bob,7,8,palette.boot);
 fill(c,x+27-stride*2,y+36+bob,7,8,palette.boot);
 fill(c,x+18,y+24+bob,17,14,palette.cape);
 fill(c,x+18,y+25+bob,4,11,palette.light);
 fill(c,x+19,y+31+bob,16,4,palette.belt);
 fill(c,x+26,y+31+bob,4,4,palette.trim);
 const leftArm=sideways?Math.max(0,stride)*2:stride;
 fill(c,x+12+leftArm,y+26+bob,6,11,palette.skin);
 fill(c,x+34-leftArm,y+26+bob,6,10,palette.skin);
 if(back){
  fill(c,x+17,y+10+bob,19,15,palette.hair);
  fill(c,x+16,y+13+bob,6,12,palette.hair);
  fill(c,x+21,y+16+bob,11,4,'#57423e');
  fill(c,x+17,y+24+bob,18,4,palette.trim);
 }else if(sideways){
  fill(c,x+19,y+11+bob,16,16,palette.skin);
  fill(c,x+(face==='right'?22:17),y+7+bob,17,9,palette.hair);
  fill(c,x+(face==='right'?31:19),y+16+bob,3,3,'#282c39');
  fill(c,x+17,y+10+bob,5,16,palette.hair);
 }else{
  fill(c,x+19,y+12+bob,15,14,palette.skin);
  fill(c,x+17,y+8+bob,19,9,palette.hair);
  fill(c,x+17,y+13+bob,4,12,palette.hair);
  fill(c,x+22,y+18+bob,2,2,'#293541');
  fill(c,x+30,y+18+bob,2,2,'#293541');
  fill(c,x+24,y+23+bob,5,2,'#bd826b');
 }
 // Distinctive metallic blade carried at the right side, behind the face.
 const bx=face==='left'?x+10:x+38;
 fill(c,bx,y+19+bob,3,20,'#d5e1df');
 fill(c,bx-3,y+30+bob,9,3,palette.trim);
 fill(c,bx,y+33+bob,3,9,'#725642');
 fill(c,x+19,y+25+bob,14,3,palette.light);
}
function atmosphere(c,cam,scene,tick,opts={}){
 if(!cam||!scene)return;
 const r=Number(opts.region||0),isTown=scene==='town',isDungeon=scene==='dungeon';
 if(!isTown&&!isDungeon)return;
 const count=isTown?20:14;
 for(let i=0;i<count;i++){
  const h=hash(i,r,Math.floor(i/3)),wx=(h%38)-7,wy=((h>>>8)%30)-4;
  const tx=(wx-cam.x)*TILE,ty=(wy-cam.y)*TILE;
  if(tx<-8||tx>820||ty<-8||ty>626)continue;
  const f=tick*.018+(h%20),sx=tx+Math.sin(f+i)*8,sy=ty+Math.cos(f*.77+i)*8;
  const color=isTown?(i%3===0?'#fcebb470':'#dafad455'):(i%3===0?'#9bd2ea55':'#e7cb9366');
  fill(c,sx,sy,i%4===0?3:2,2,color);
 }
}
function signal(c,x,y,tick,kind='usable',active=true){
 if(!active)return;
 const t=tick*.13,wave=Math.sin(t)*2.5;
 const gold=kind==='quest'?'#f9d894':kind==='danger'?'#f4aa95':'#b3e8d3';
 c.strokeStyle=gold;c.lineWidth=2;
 c.beginPath();c.moveTo(x+9,y+5+wave);c.lineTo(x+24,y+1+wave);c.lineTo(x+39,y+5+wave);c.stroke();
 fill(c,x+23,y-3+wave,3,3,gold);
}
function pulse(c,feedback,cam,now=Date.now()){
 if(!feedback||!cam)return false;
 const fraction=(now-feedback.time)/540;
 if(fraction>=1)return false;
 const x=(feedback.x-cam.x)*TILE+24,y=(feedback.y-cam.y)*TILE+24;
 c.strokeStyle=feedback.warning?'#f8a2a2':'#f5df9b';c.lineWidth=2;
 if(typeof c.arc==='function'){c.beginPath();c.arc(x,y,8+23*ease(fraction),0,Math.PI*2);c.stroke();}
 else{fill(c,x-8-22*fraction,y-1,3,3,c.strokeStyle);}
 return true;
}
const api={TILE,FRAME_MS,hash,ease,facing,movement,step,position,camera,sprite,atmosphere,signal,pulse};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.LQMotion=api;
})(typeof window!=='undefined'?window:globalThis);
