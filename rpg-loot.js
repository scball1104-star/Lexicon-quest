/* Reforged Realms: collectible, equipable dungeon loot for three party members.
 * Optional additive data in existing version-3 save slots.
 */
(function(root){
'use strict';
const LQ=root.LQ;if(!LQ||!LQ.Game)return;
const Game=LQ.Game;
const qualities=[
 {name:'Common',weight:60,color:'common',multiplier:1},
 {name:'Enchanted',weight:26,color:'magic',multiplier:1.5},
 {name:'Rare',weight:12,color:'rare',multiplier:2.25},
 {name:'Legendary',weight:2,color:'legendary',multiplier:3}
];
const types=[
 {stat:'might',base:'Blade Charm',desc:'Additional weapon damage'},
 {stat:'guard',base:'Guardian Crest',desc:'Additional physical defense'},
 {stat:'focus',base:'Dawn Pendant',desc:'Extra Focus at battle start'},
 {stat:'spirit',base:'Mana Bead',desc:'MP restoration at battle start'},
 {stat:'vitality',base:'Heartstone',desc:'HP restoration at battle start'}
];
const slots={charm:'charmId',armor:'armorId',boots:'bootsId'};
const modifiers=['Rootbound','Silverglass','Emberforged','Tidebound','Sunpath','Stormglass','Stillheart','Firstborn'];
const titles=['of Resolve','of Echoes','of the Wanderer','of Memory','of the Watch','of Returning','of Courage','of the Living'];
function ensureLoot(s){
 if(!Array.isArray(s.loot))s.loot=[];
 if(!Number.isInteger(s.lootWins)||s.lootWins<0)s.lootWins=0;
 if(!Number.isInteger(s.lootNextId)||s.lootNextId<1)s.lootNextId=Math.max(1,...s.loot.map(i=>i.id+1));
 for(const p of s.party)for(const key of Object.values(slots))if(!Number.isInteger(p[key]))p[key]=null;
}
function dice(x){
 x=(x^x>>>16)>>>0;x=Math.imul(x,0x7feb352d);x=(x^x>>>15)>>>0;x=Math.imul(x,0x846ca68b);return (x^x>>>16)>>>0;
}
function makeItem(s,r,boss,trial){
 const seed=dice((s.lootWins+1)*1729+173*r+(s.steps||0)*31+(boss?619:0)+(trial?433:0));
 const qualityRoll=seed%100;let rarity=qualityRoll<60?0:qualityRoll<86?1:qualityRoll<98?2:3;
 if(boss)rarity=Math.max(2,rarity);
 if(trial)rarity=Math.max(1,rarity);
 const kind=types[dice(seed+11)%types.length];
 const bonus=Math.max(1,Math.round((1+r*.44)*qualities[rarity].multiplier));
 const name=qualities[rarity].name==='Common'?modifiers[r]+' '+kind.base:modifiers[r]+' '+kind.base+' '+titles[dice(seed+7)%titles.length];
 const slot=boss?'charm':trial?'armor':['charm','armor','boots'][dice(seed+21)%3];
 const stats=rarity>0?{[slot==='boots'?'speed':kind.stat==='guard'?'might':'guard']:Math.max(1,rarity)}:{};
 return {id:s.lootNextId++,rarity,region:r,slot,stats,stat:kind.stat,bonus,name:slot==='charm'?name:modifiers[r]+' '+(slot==='armor'?'Keeper Mantle':'Wayfarer Boots')+(rarity?' '+titles[dice(seed+7)%titles.length]:''),source:boss?'Guardian victory':trial?'Echo Warden trial':'Field encounter'};
}
function singleEffect(item){
 if(!item)return '';
 switch(item.stat){
  case 'might':return '+'+(item.bonus*5)+' weapon damage';
  case 'guard':return '+'+(item.bonus*3)+' physical defense';
  case 'focus':return '+'+(item.bonus*7)+' starting Focus';
  case 'spirit':return '+'+(item.bonus*3)+' MP recovery at battle start';
  case 'vitality':return '+'+(item.bonus*9)+' HP recovery at battle start';
  default:return '';
 }
}
function itemEffect(item){if(!item)return '';return singleEffect(item)+Object.entries(item.stats||{}).map(([stat,bonus])=>' · '+(stat==='speed'?'+'+bonus+' speed':singleEffect({stat,bonus}))).join('');}
function equippedItem(s,p,slot='charm'){
 if(!p||!Number.isInteger(p[slots[slot]]))return null;
 return (s.loot||[]).find(i=>i.id===p[slots[slot]])||null;
}
function equippedItems(s,p){return Object.keys(slots).map(slot=>equippedItem(s,p,slot)).filter(Boolean);}
function total(s,p,stat){return equippedItems(s,p).reduce((n,i)=>n+(i.stat===stat?i.bonus:0)+(i.stats?.[stat]||0),0);}
const baseMap=Game.prototype.map;
Game.prototype.map=function(){ensureLoot(this.s);return baseMap.call(this);};
const baseStartBattle=Game.prototype.startBattle;
Game.prototype.startBattle=function(o){
 ensureLoot(this.s);
 baseStartBattle.call(this,o);
 if(!this.battle)return;
 for(const p of this.s.party){
  this.battle.focus=Math.min(100,this.battle.focus+total(this.s,p,'focus')*7);
  p.mp=Math.min(p.maxmp,p.mp+total(this.s,p,'spirit')*3);
  if(p.hp>0)p.hp=Math.min(p.maxhp,p.hp+total(this.s,p,'vitality')*9);
 }
};
const baseAct=Game.prototype.act;
Game.prototype.act=function(action,target){
 const b=this.battle;
 if(!b)return baseAct.call(this,action,target);
 const p=this.s.party[b.actor],might=p?total(this.s,p,'might'):0;
 if(!p||!might||!['attack','cleave','pierce','crush'].includes(action))return baseAct.call(this,action,target);
 const tier=p.tier;
 try{p.tier+=might;return baseAct.call(this,action,target);}
 finally{p.tier=tier;}
};
const baseEnemyTurn=Game.prototype.enemyTurn;
Game.prototype.enemyTurn=function(){
 const bonuses=this.s.party.map(p=>total(this.s,p,'guard'));
 try{this.s.party.forEach((p,i)=>p.armor+=bonuses[i]);return baseEnemyTurn.call(this);}
 finally{this.s.party.forEach((p,i)=>p.armor-=bonuses[i]);}
};
const baseWin=Game.prototype.win;
Game.prototype.win=function(){
 const origin=this.battle?.origin,region=origin?.r??this.s.region,guardian=origin?.type==='boss',trial=origin?.type==='trial';
 ensureLoot(this.s);
 const defeatedId=origin?.id;
 baseWin.call(this);
 if(!origin||defeatedId===undefined)return;
 this.s.lootWins++;
 const seed=dice(this.s.lootWins*11939+this.s.steps*31+region*439);
 if(!guardian&&!trial&&(seed%100)>=68)return;
 if(this.s.loot.length>=80){this.emit('Inventory full: visit Gear & Loot and sell unwanted charms.');return;}
 const item=makeItem(this.s,region,guardian,trial);
 this.s.loot.push(item);
 this.emit('LOOT FOUND: '+item.name+' ('+qualities[item.rarity].name+') — '+itemEffect(item)+'. Equip it from Gear & Loot.');
};
Game.prototype.equipLoot=function(id,member){
 ensureLoot(this.s);
 if(this.battle)return false;
 if(!Number.isInteger(id)||!Number.isInteger(member)||member<0||member>=this.s.party.length)return false;
 const item=this.s.loot.find(x=>x.id===id);
 if(!item)return false;
 const key=slots[item.slot||'charm'];if(!key)return false;
 for(const p of this.s.party)for(const k of Object.values(slots))if(p[k]===id)p[k]=null;
 this.s.party[member][key]=id;
 this.emit(this.s.party[member].name+' equips '+item.name+' ('+itemEffect(item)+').');
 return true;
};
Game.prototype.removeLoot=function(member,slot='charm'){
 if(this.battle||!slots[slot])return false;
 if(!Number.isInteger(member)||member<0||member>=this.s.party.length)return false;
 const p=this.s.party[member],item=equippedItem(this.s,p,slot);if(!item)return false;
 p[slots[slot]]=null;
 this.emit(p.name+' unequips '+item.name+'.');
 return true;
};
Game.prototype.sellLoot=function(id){
 ensureLoot(this.s);
 const item=this.s.loot.find(i=>i.id===id);if(!item)return false;
 if(this.s.party.some(p=>equippedItems(this.s,p).some(i=>i.id===id)))return this.emit('Unequip '+item.name+' before selling it.');
 const value=Math.round(12*(item.rarity+1)*(item.bonus+1));
 this.s.loot=this.s.loot.filter(i=>i.id!==id);
 this.s.gold+=value;
 return this.emit('Sold '+item.name+' for '+value+' gold.');
};
LQ.loot={qualities,types,slots,ensureLoot,itemEffect,equippedItem,equippedItems,total};
if(typeof module!=='undefined'&&module.exports)module.exports=LQ.loot;
})(typeof window!=='undefined'?window:globalThis);
