/* The Reforged Realms: crossword-free dungeon trials and equipable relics.
 * Additive to save version 3: existing chronicle slots remain compatible.
 */
(function(root){
'use strict';
const LQ=root.LQ;
if(!LQ||!LQ.Game)return;
const Game=LQ.Game;
const trials=[
 {name:'Rootbound Echo Warden',subtitle:'The living roots guard the names the archive once sheltered.',foes:['Briar Sentinel','Archive Wisp']},
 {name:'Silverglass Echo Warden',subtitle:'Reflections become blades when a memory is denied.',foes:['Mirror Knight','Silverglass Shade']},
 {name:'Heartforge Echo Warden',subtitle:'An oath survives even when the forge bell falls silent.',foes:['Cinder Construct','Forge Specter']},
 {name:'Tidebound Echo Warden',subtitle:'The drowned charter has defenders who answer only to truth.',foes:['Tidebound Bailiff','Siltbound Shade']},
 {name:'Sunpath Echo Warden',subtitle:'Beyond the mirages waits a guardian of forgotten roads.',foes:['Sunstone Guardian','Mirage Stalker']},
 {name:'Stormglass Echo Warden',subtitle:'The broken flight chart comes alive in the observatory.',foes:['Stormglass Knight','Skybound Wisp']},
 {name:'Stillheart Echo Warden',subtitle:'Frozen memories demand courage before they will release their names.',foes:['Glacial Sentinel','Pale Remnant']},
 {name:'First Lexicon Echo Warden',subtitle:'The First Library tests whether the party will defend the right to remember.',foes:['First Script Guardian','Erasure Remnant']}
];
const relics=[
 {name:'Rootglass Locket',effect:'Start battles with 15 additional Focus.',kind:'focus',amount:15},
 {name:'Silverglass Oath',effect:'Start battles with one round of Aegis protection.',kind:'ward',amount:1},
 {name:'Heartforge Cinder',effect:'Recover 5 MP for each companion when combat starts.',kind:'mana',amount:5},
 {name:'River Charter Seal',effect:'Recover 18 HP for each companion when combat starts.',kind:'heal',amount:18},
 {name:'Sunpath Charm',effect:'Begin guardian battles with 25 additional Focus.',kind:'bossFocus',amount:25},
 {name:'Stormglass Lens',effect:'Start battles with 10 Focus and restore 3 MP each.',kind:'storm',amount:10},
 {name:'Stillheart Crystal',effect:'Start battles with two rounds of Aegis protection.',kind:'ward',amount:2},
 {name:'Keeper’s Signet',effect:'Begin each battle with at least 40 Focus.',kind:'focusMin',amount:40}
];
const linkedGates=[
 null,null,
 {ready:'lq:ember:fansAligned',gate:'2-1-ventClear'},
 {ready:'lq:vale:pumpsReady',gate:'3-1-archive'},
 {ready:'lq:oracle:lensesAligned',gate:'4-1-horizon'},
 {ready:'lq:sky:relaysReady',gate:'5-1-signals'},
 {ready:'lq:frost:lensesReady',gate:'6-1-light'},
 {ready:'lq:first:platesReady',gate:'7-1-text'}
];
const floorObjectives=[
 ['Challenge the Rootbound Echo Warden in the north gallery, then cross the unlocked seal gate. The prisms conceal an optional treasure.','The Echo Warden is defeated. Pass through the eastern seal gate to the reliquary.'],
 ['Confront the Silverglass Echo Warden in the north gallery. The portraits reveal the King’s forgotten promise.','The mirror seal is released. Cross the eastern gate into the royal wing.'],
 ['Align WEST and SOUTH fans to INTAKE, CORE to EXHAUST, and defeat the Heartforge Echo Warden. Both systems open the east gate.','The Echo Warden is defeated. Align all three ventilation fans to release the eastern gate.'],
 ['Route WEST and SOUTH pumps to INTAKE and CORE to PURGE. Defeat the Tidebound Echo Warden to open the floodlock.','The Echo Warden has fallen. Correct the three archive pumps to release the floodlock.'],
 ['Set Oasis TRUE, Sky FALSE, Stars TRUE and defeat the Sunpath Echo Warden. Both are required for the horizon gate.','The trial is won. Align the three mirage lenses to reveal the true eastern passage.'],
 ['Cycle WEST=RECEIVE, CROWN=AMPLIFY, SOUTH=RECEIVE, then defeat the Stormglass Echo Warden.','The trial is won. Reconnect the three sky relays to open the observatory gate.'],
 ['Set WEST and SOUTH lenses to RECEIVE, CROWN to REFLECT, and defeat the Stillheart Echo Warden.','The trial is won. Tune the three frost lenses to open the Borrowed Light Gate.'],
 ['Set WEST and SOUTH plates to WITNESS, CROWN to RESTORE. Defeat the First Lexicon Echo Warden.','The trial is won. Restore the three printing plates to open the Gallery Gate.']
];
function ensureRelics(s){
 if(!Array.isArray(s.relics))s.relics=[];
 // Previously completed crossword seals automatically translate to relic victories.
 for(let i=0;i<8;i++)if(s.flags&&s.flags['seal'+i]&&!s.relics.includes(i))s.relics.push(i);
 if(!s.relics.includes(s.equippedRelic))s.equippedRelic=s.relics.length?s.relics[0]:null;
}
function finishSeal(s,r){
 s.flags['seal'+r]=true;
 const link=linkedGates[r];
 if(link&&s.flags[link.ready])s.flags[link.gate]=true;
}
const baseMap=Game.prototype.map;
Game.prototype.map=function(){
 const m=baseMap.call(this);
 for(const o of m.objects){
  if(o.type==='crossword'||o.type==='trial'){
   o.type='trial';
   o.label=trials[o.r??this.s.region].name;
  }
 }
 ensureRelics(this.s);
 return m;
};
const baseGuide=Game.prototype.guide;
Game.prototype.guide=function(){
 const s=this.s;
 if(s.place==='dungeon'&&s.floor===1&&!s.flags['seal'+s.region]){
  const o=this.map().objects.find(x=>x.type==='trial');
  if(o){
   const dx=o.x-s.x,dy=o.y-s.y;
   const dir=Math.abs(dx)>Math.abs(dy)?(dx>0?'east':'west'):(dy>0?'south':'north');
   return {id:o.id,label:o.label,dir:dx||dy?dir:'here',tiles:Math.abs(dx)+Math.abs(dy),note:'Follow the open corridors to the trial altar.'};
  }
 }
 return baseGuide.call(this);
};
const baseObjective=Game.prototype.objective;
Game.prototype.objective=function(){
 const s=this.s;
 if(s.place==='dungeon'&&s.floor===1&&!s.cleared.includes(s.region)){
  const r=s.region,won=!!s.flags['seal'+r],link=linkedGates[r];
  if(link&&won&&s.flags[link.gate])return 'The Echo Warden and the floor mechanisms are complete. Take the east passage to the guardian floor.';
  return floorObjectives[r][won?1:0];
 }
 return baseObjective.call(this).replace(/crossword/gi,'Echo Warden trial').replace(/crossed-word/gi,'Echo Warden').replace(/Across\/Down/gi,'relic');
};
const baseInteract=Game.prototype.interact;
Game.prototype.interact=function(o){
 o=o||this.nearby()[0];
 if(o&&o.type==='trial'){
  if(this.s.flags['seal'+o.r])return this.emit('The Echo Warden has fallen. Its seal is open. Continue to the eastern gate.');
  this.startBattle(o);
  return {screen:'battle'};
 }
 return baseInteract.call(this,o);
};
const baseStartBattle=Game.prototype.startBattle;
Game.prototype.startBattle=function(o){
 ensureRelics(this.s);
 baseStartBattle.call(this,o);
 const b=this.battle;
 if(!b)return;
 const choice=this.s.equippedRelic,artifact=relics[choice];
 if(artifact&&this.s.relics.includes(choice)){
  const n=artifact.amount;
  if(artifact.kind==='focus')b.focus=Math.min(100,b.focus+n);
  if(artifact.kind==='focusMin')b.focus=Math.max(b.focus,n);
  if(artifact.kind==='bossFocus'&&b.boss)b.focus=Math.min(100,b.focus+n);
  if(artifact.kind==='ward'){b.ward=Math.max(b.ward,n);b.wardPower=Math.min(b.wardPower||.6,.6);}
  if(artifact.kind==='mana'||artifact.kind==='storm')for(const hero of this.s.party)hero.mp=Math.min(hero.maxmp,hero.mp+(artifact.kind==='mana'?n:3));
  if(artifact.kind==='heal')for(const hero of this.s.party)if(hero.hp>0)hero.hp=Math.min(hero.maxhp,hero.hp+n);
  if(artifact.kind==='storm')b.focus=Math.min(100,b.focus+n);
  this.log('Equipped relic: '+artifact.name+'. '+artifact.effect);
 }
 if(o.type==='trial'){
  const trial=trials[o.r];
  b.enemies.forEach((e,i)=>{
   e.name=trial.foes[i%trial.foes.length];
   e.maxhp=Math.round(e.maxhp*(i===0?1.35:1.1));
   e.hp=e.maxhp;
   e.armor+=i===0?1:0;
   e.weak=i===0?(o.r%2?'fire':'ice'):'pierce';
   e.resist=i===0?(o.r%2?'ice':'fire'):'none';
   e.role=i===0?'warder':i===1?'hunter':'mender';
  });
  this.log('ECHO WARDEN TRIAL: '+trial.subtitle+' Defeat the sentinels to unbind the seal.');
 }
};
const baseAct=Game.prototype.act;
Game.prototype.act=function(action,target){
 if(action==='run'&&this.battle&&this.battle.origin.type==='trial'){
  this.log('The trial seals the exits. Defeat the Echo Warden or fall back to the inn.');
  return false;
 }
 return baseAct.call(this,action,target);
};
const baseWin=Game.prototype.win;
Game.prototype.win=function(){
 const origin=this.battle&&this.battle.origin,trial=origin&&origin.type==='trial',r=origin&&origin.r;
 baseWin.call(this);
 if(!trial)return;
 finishSeal(this.s,r);
 ensureRelics(this.s);
 const first=!this.s.relics.includes(r);
 if(first){
  this.s.relics.push(r);
  if(this.s.equippedRelic===null)this.s.equippedRelic=r;
  this.s.gold+=75;
  this.s.journal.push('Relic trial: defeated '+trials[r].name+' and recovered the '+relics[r].name+'.');
 }
 const link=linkedGates[r],open=!link||!!this.s.flags[link.gate];
 this.emit('ECHO WARDEN DEFEATED. '+(first?'Relic found: '+relics[r].name+'. +75 gold. ':'')+(open?'The eastern seal is open.':'Restore the remaining floor mechanisms to open the gate.'));
 this.scene={screen:'dialog',title:trials[r].name+' · Defeated',text:'The warding spirit releases its hold. '+(first?'You receive the '+relics[r].name+'. ':'')+(open?'The eastern passage opens.':'The ancient machinery must still be aligned.')};
};
Game.prototype.equipRelic=function(id){
 ensureRelics(this.s);
 if(!this.s.relics.includes(id)||!relics[id])return this.emit('That relic has not been recovered.');
 this.s.equippedRelic=id;
 return this.emit('Equipped '+relics[id].name+'. '+relics[id].effect);
};
LQ.relics=relics;
LQ.trials=trials;
LQ.ensureRelics=ensureRelics;
if(typeof module!=='undefined'&&module.exports)module.exports={relics,trials,ensureRelics,finishSeal};
})(typeof window!=='undefined'?window:globalThis);
