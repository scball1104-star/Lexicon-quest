/* Combat presentation model: pure, read-only helpers. Does not modify Game/battle balance. */
(function(root){
'use strict';
const ALLY_ACTIONS=new Set(['mend','revive','potion','ether']);
const NO_TARGET=new Set(['guard','ward','resonance']);
const WARD_STATES=['mirrorShield','royalWard','cinderWard','oracleVeil','skyShield','frostWard','erasureWard'];
function shielded(b){return !!(b&&WARD_STATES.some(k=>b[k]));}
function intentKind(text){const v=String(text||'').toLowerCase();if(/heavy|charging|blizzard|storm|silence|sandstorm|charged|final hammer|final edict|rapid/.test(v))return 'danger';if(/ward|shell|shield|veil|copies|shadows|reflection|rejected truth|false future|writ/.test(v))return 'shield';if(/fortif|restore|siphon/.test(v))return 'support';return 'basic';}
function enemyIntel(g,b,e,i){const raw=g.intent(e),kind=intentKind(raw),hp=Math.max(0,e.hp),percent=e.maxhp?Math.max(0,Math.round(100*hp/e.maxhp)):0;
return {id:i,name:e.name,raw,kind,hp,percent,weak:e.weak||'unknown',resist:e.resist||'none',alive:hp>0,defense:!!e.fortified,break:Math.max(0,e.broken||0),charge:!!e.charge};}
function livingEnemies(b){return b.enemies.map((e,i)=>({...e,id:i})).filter(e=>e.hp>0);}
function suggest(g,action,target){const b=g.battle;if(!b)return {level:'info',label:'Explore',text:'No active encounter.'};const active=g.s.party[b.actor],living=livingEnemies(b),charged=b.enemies.some(e=>e.hp>0&&e.charge),red=b.enemies.some(e=>e.hp>0&&intentKind(g.intent(e))==='danger');
 if(shielded(b)&&living.some(e=>e.id>0))return {level:'warning',label:'Break the protection',text:'The guardian is protected. Defeat its summoned allies first; direct damage to the guardian is greatly reduced.'};
 if(charged)return {level:'danger',label:'Heavy attack imminent',text:'An enemy has finished charging. Guard to reduce damage, use Aegis for party protection, or use an interrupt-capable technique.'};
 if(red)return {level:'warning',label:'Watch enemy intent',text:'A powerful move is being prepared. Choose a defensive turn or interrupt when possible.'};
 if(b.focus>=100&&g.s.party.every(p=>p.hp>0))return {level:'ready',label:'Triad Resonance ready',text:'All three allies are standing. Triad Resonance hits every enemy and ignores armor. It consumes 100 Focus.'};
 if(g.s.party.some(p=>p.hp>0&&p.hp/p.maxhp<=.35)&&g.s.party.some(p=>p.mp>=7))return {level:'warning',label:'Party HP is low',text:'A companion is below 35% HP. Consider Mend or a Potion before another enemy round.'};
 const valid=b.enemies[target]&&b.enemies[target].hp>0?b.enemies[target]:living[0];if(valid&&['flare','frost','pierce'].includes(action)){
  const element=action==='flare'?'fire':action==='frost'?'ice':'pierce';if(valid.weak===element)return {level:'ready',label:'Exploit weakness',text:element.toUpperCase()+' is effective against '+valid.name+'. Hitting a weakness grants bonus Focus.'};
  if(valid.resist===element)return {level:'warning',label:'Target resists '+element,text:valid.name+' resists '+element+'. Try a weapon attack or a different element.'};
 }
 return {level:'info',label:'Build party Focus',text:'Basic attacks generate 22 Focus. Guarding grants 18 Focus and restores 2 MP; techniques build 14, with bonuses for weaknesses.'};
}
function actionPreview(g,action,target){const b=g.battle;if(!b)return '';
 const actor=g.s.party[b.actor],a=g.abilities(actor),enemy=b.enemies[target],ally=g.s.party[target];
 if(!a.includes(action))return 'Choose an available action.';
 if(action==='attack')return 'Direct attack • +22 Focus • trains '+actor.weapon+' mastery.';
 if(action==='guard')return 'Guard • +18 Focus • restore 2 MP • halve incoming damage until your next turn.';
 if(action==='ward')return 'Aegis • protects the party for the next two enemy turns.';
 if(action==='resonance')return 'Team attack • strikes ALL living enemies • ignores armor • consumes 100 Focus.';
 if(action==='potion')return 'Potion • restore up to 65 HP to '+(ally?.name||'an ally')+' • '+g.s.potions+' remaining.';
 if(action==='ether')return 'Ether • restore up to 18 MP to '+(ally?.name||'an ally')+' • '+g.s.ethers+' remaining.';
 if(action==='mend')return 'Mend • restore HP to '+(ally?.name||'an ally')+' with a healing spell.';
 if(action==='revive')return 'Revive • raise a fallen companion. Target an ally with 0 HP.';
 const targetName=enemy?.name||'the selected enemy';const elem=action==='flare'?'fire':action==='frost'?'ice':action==='pierce'?'pierce':null;
 return 'Technique • '+targetName+(elem&&enemy?.weak===elem?' is WEAK to '+elem+'.':elem&&enemy?.resist===elem?' RESISTS '+elem+'.':'.')+' Skill experience increases when used.';
}
function snapshot(g){const b=g.battle;return {round:b?.round||0,focus:b?.focus||0,enemies:(b?.enemies||[]).map(e=>({name:e.name,hp:e.hp,maxhp:e.maxhp})),party:g.s.party.map(p=>({name:p.name,hp:p.hp,mp:p.mp})),log:b?.log?.slice()||[]};}
function summary(before,g,action){if(!before)return null;const b=g.battle,lines=[];
 before.enemies.forEach((o,i)=>{const n=b?.enemies[i];if(!n){return;}const d=(n.hp||0)-o.hp;if(d<0)lines.push({type:'damage',text:n.name+' −'+Math.abs(d)+' HP'});if(d>0)lines.push({type:'heal',text:n.name+' +'+d+' HP'});});
 before.party.forEach((o,i)=>{const n=g.s.party[i];const d=n.hp-o.hp;if(d<0)lines.push({type:'damage',text:n.name+' −'+Math.abs(d)+' HP'});if(d>0)lines.push({type:'heal',text:n.name+' +'+d+' HP'});});
 if(b?.enemies.length>before.enemies.length)lines.push({type:'warning',text:(b.enemies.length-before.enemies.length)+' reinforcements arrived'});
 if(b){const delta=b.focus-before.focus;if(delta)lines.push({type:delta>0?'focus':'info',text:'Focus '+(delta>0?'+':'')+delta});}
 if(!b)lines.push({type:'victory',text:'Encounter resolved — exploration resumed'});
 const log=b?.log||[];const last=log[log.length-1];return {action,lines:lines.slice(0,6),round:b?.round||before.round,message:last||'Your turn is complete.'};
}
function timeline(g){const b=g.battle;if(!b)return [];return g.s.party.map((p,i)=>({name:p.name,active:i===b.actor,done:i<b.actor||p.hp<=0,down:p.hp<=0,id:i})).concat([{name:'Enemy phase',active:false,done:false,hostile:true}]);}
const api={ALLY_ACTIONS,NO_TARGET,shielded,intentKind,enemyIntel,suggest,actionPreview,snapshot,summary,timeline};
if(typeof module!=='undefined'&&module.exports)module.exports=api;
if(root)root.LQBattleUI=api;
})(typeof window!=='undefined'?window:typeof globalThis!=='undefined'?globalThis:null);
