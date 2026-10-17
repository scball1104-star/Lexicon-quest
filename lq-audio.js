/* Lexicon Quest — WebAudio sound-effects layer.
 * The shipped game had ZERO sound effects. This synthesizes them live (no asset
 * files, no Suno needed) and exposes LQAudio.cue(action, game, extra) for the UI
 * click handler plus LQAudio.sfx(name). Pure presentation; guarded for headless
 * QA (no AudioContext -> every call no-ops).
 */
(function(root){
'use strict';
var AC=root.AudioContext||root.webkitAudioContext;
var ctx=null,master=null,muted=false;
function ensure(){
 if(!AC)return null;
 if(!ctx){try{ctx=new AC();master=ctx.createGain();master.gain.value=0.33;master.connect(ctx.destination);}catch(e){return null;}}
 if(ctx.state==='suspended'){try{ctx.resume();}catch(e){}}
 return ctx;
}
function tone(freq,start,dur,type,vol,slideTo){
 var c=ensure();if(!c)return;
 var t=c.currentTime+start,o=c.createOscillator(),g=c.createGain();
 o.type=type||'square';o.frequency.setValueAtTime(freq,t);
 if(slideTo)try{o.frequency.exponentialRampToValueAtTime(slideTo,t+dur);}catch(e){}
 g.gain.setValueAtTime(0.0001,t);
 g.gain.exponentialRampToValueAtTime(vol||0.25,t+0.012);
 g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
 o.connect(g);g.connect(master);o.start(t);o.stop(t+dur+0.03);
}
function noise(start,dur,vol,hp){
 var c=ensure();if(!c)return;
 var t=c.currentTime+start,n=Math.max(1,Math.floor(c.sampleRate*dur)),buf=c.createBuffer(1,n,c.sampleRate),d=buf.getChannelData(0),i;
 for(i=0;i<n;i++)d[i]=(Math.random()*2-1)*(1-i/n);
 var s=c.createBufferSource();s.buffer=buf;
 var g=c.createGain();g.gain.setValueAtTime(vol||0.22,t);g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
 var f=c.createBiquadFilter();f.type='highpass';f.frequency.value=hp||700;
 s.connect(f);f.connect(g);g.connect(master);s.start(t);s.stop(t+dur+0.03);
}
var SFX={
 blip:function(){tone(640,0,0.05,'square',0.16);},
 confirm:function(){tone(523,0,0.06,'square',0.2);tone(784,0.06,0.1,'square',0.2);},
 cancel:function(){tone(440,0,0.09,'square',0.18,220);},
 step:function(){tone(130,0,0.05,'sine',0.11,80);},
 hit:function(){noise(0,0.13,0.28,500);tone(180,0,0.09,'sawtooth',0.16,90);},
 enemyhit:function(){noise(0,0.1,0.2,900);},
 heal:function(){tone(659,0,0.12,'sine',0.18);tone(880,0.08,0.16,'sine',0.18);tone(1047,0.18,0.22,'sine',0.16);},
 chest:function(){tone(784,0,0.08,'triangle',0.18);tone(988,0.08,0.08,'triangle',0.18);tone(1319,0.16,0.2,'triangle',0.18);},
 levelup:function(){[523,659,784,1047].forEach(function(f,i){tone(f,i*0.08,0.15,'square',0.18);});},
 error:function(){tone(200,0,0.15,'square',0.18,140);},
 victory:function(){[523,659,784,1047,1319].forEach(function(f,i){tone(f,i*0.11,0.32,'triangle',0.2);});},
 defeat:function(){[392,330,262,196].forEach(function(f,i){tone(f,i*0.15,0.42,'sine',0.18);});}
};
function sfx(name){if(muted)return;var fn=SFX[name];if(fn){try{fn();}catch(e){}}}
function cue(action,game,extra){
 if(muted)return;
 var b=game&&game.battle;
 switch(action){
  case 'move': sfx('step'); break;
  case 'confirmAction':
   if(b){ if(extra==='mend'||extra==='revive'||extra==='potion'||extra==='ether')sfx('heal'); else sfx('hit'); }
   else sfx('confirm');
   break;
  case 'start': case 'load': case 'resume': case 'buy': case 'sell':
  case 'equip': case 'use': case 'interact': case 'citizenTalk': case 'forge': sfx('confirm'); break;
  case 'close': case 'back': case 'leaveArea': case 'title': sfx('cancel'); break;
  case 'ability': case 'smartAction': case 'attack': case 'target': sfx('blip'); break;
  default: sfx('blip');
 }
}
function setMuted(m){muted=!!m;}
var api={sfx:sfx,cue:cue,ensure:ensure,setMuted:setMuted,SFX:SFX};
if(typeof module!=='undefined'&&module.exports)module.exports=api;
if(root)root.LQAudio=api;
})(typeof window!=='undefined'?window:typeof globalThis!=='undefined'?globalThis:this);
