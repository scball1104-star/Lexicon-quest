/* Lexicon Quest combat telegraph / impact presentation data.
 * No changes to damage, targeting, encounter rules, or saved game state.
 */
(function(root){
'use strict';
const elements={flare:'fire',frost:'ice',lexibolt:'arcane',prism:'arcane',resonance:'resonance',ward:'ward',guard:'guard',mend:'heal',revive:'heal',potion:'heal',ether:'mana'};
function classify(action){
 const v=String(action||'attack').toLowerCase();
 if(elements[v])return elements[v];
 if(v.includes('fire')||v.includes('ember'))return 'fire';
 if(v.includes('ice')||v.includes('freeze'))return 'ice';
 if(v.includes('heal'))return 'heal';
 if(v.includes('shield'))return 'ward';
 return 'physical';
}
function compare(before,after){
 if(!before||!after)return {enemies:[],party:[]};
 const enemies=(before.enemies||[]).map((e,i)=>{const a=after.enemies?.[i];return a?{id:i,name:e.name,delta:(a.hp||0)-(e.hp||0),defeated:e.hp>0&&a.hp<=0}:null;}).filter(Boolean);
 const party=(before.party||[]).map((p,i)=>{const a=after.party?.[i];return a?{id:i,name:p.name,delta:(a.hp||0)-(p.hp||0),mpDelta:(a.mp||0)-(p.mp||0)}:null;}).filter(Boolean);
 return {enemies,party};
}
function make(before,after,action,now=Date.now(),originId=''){
 const hit=compare(before,after);
 return {kind:classify(action),action:String(action||'attack'),at:now,originId,
  enemies:hit.enemies.filter(e=>e.delta!==0||e.defeated),
  party:hit.party.filter(e=>e.delta!==0||e.mpDelta!==0),
  totalDamage:hit.enemies.reduce((t,e)=>t+Math.max(0,-e.delta),0)};
}
function alive(fx,now=Date.now(),originId){
 return !!fx&&(!originId||fx.originId===originId)&&now-fx.at>=0&&now-fx.at<950;
}
const api={classify,compare,make,alive};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.LQBattleEffects=api;
})(typeof window!=='undefined'?window:globalThis);
