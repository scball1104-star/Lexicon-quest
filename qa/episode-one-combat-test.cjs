const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const LQ=require('../rpg-engine.js'),context=vm.createContext({LQ});
for(const file of ['rpg-reforged.js','rpg-loot.js'])vm.runInContext(fs.readFileSync(file,'utf8'),context);
function encounter(){const g=new LQ.Game();g.startBattle({id:'test',r:0,type:'enemy'});for(const e of g.battle.enemies){e.hp=e.maxhp=999;e.power=0;}return g;}
{
 const g=encounter();g.s.party[2].speed=30;g.beginRound();assert.deepEqual(g.battle.order,[2,0,1]);
 const actors=[];for(let i=0;i<3;i++){actors.push(g.battle.actor);g.act('guard');}
 assert.deepEqual(actors,[2,0,1]);assert.equal(g.battle.round,2);assert.equal(g.battle.actor,2);
 g.s.party[0].hp=0;g.beginRound();g.act('guard');assert.equal(g.battle.actor,1);
 assert.equal(LQ.validSave(JSON.parse(JSON.stringify(g.s))),true);
}
{
 const g=encounter();g.act('guard');const e=g.battle.enemies[0],hp=e.hp;
 assert.equal(g.act('venom',0),true);assert.equal(e.poisonTurns,3);g.act('guard');
 assert.equal(e.hp,hp-8);assert.equal(e.poisonTurns,2);
 g.enemyTurn();g.enemyTurn();assert.equal(e.hp,hp-24);assert.equal(e.poisonTurns,0);
 g.enemyTurn();assert.equal(e.hp,hp-24,'expired poison does no damage');
}
{
 const g=encounter(),p=g.s.party[0];p.weapon='axe';p.mastery.axe=30;
 assert.equal(g.act('crush',0),true);assert.equal(g.battle.enemies[0].stun,1);
 g.enemyTurn();assert.equal(g.battle.enemies[0].stun,0);assert.ok(g.battle.enemies[0].stunRecovery>0);
 g.battle.actor=0;g.act('crush',0);assert.equal(g.battle.enemies[0].stun,0,'no stun lock during recovery');
}
{
 const normal=encounter(),buff=encounter();buff.battle.rally=2;
 normal.act('attack',0);buff.act('attack',0);
 assert.ok(buff.battle.enemies[0].hp<normal.battle.enemies[0].hp);
 buff.enemyTurn();assert.equal(buff.battle.rally,1);buff.enemyTurn();assert.equal(buff.battle.rally,0);
}
{
 const g=new LQ.Game();g.s.loot=[
  {id:1,name:'Old charm',stat:'might',bonus:1,rarity:0,region:0},
  {id:2,name:'Keeper Mantle',slot:'armor',stat:'guard',bonus:2,stats:{might:1},rarity:1,region:0},
  {id:3,name:'Courier Boots',slot:'boots',stat:'vitality',bonus:1,stats:{speed:7},rarity:1,region:0}
 ];
 assert.equal(g.equipLoot(1,0),true);assert.equal(g.equipLoot(2,0),true);assert.equal(g.equipLoot(3,2),true);
 assert.equal(LQ.loot.total(g.s,g.s.party[0],'might'),2);assert.equal(LQ.loot.total(g.s,g.s.party[0],'guard'),2);
 assert.equal(g.speed(g.s.party[2]),17);assert.ok(LQ.loot.itemEffect(g.s.loot[2]).includes('+7 speed'));
 assert.equal(g.equipLoot(2,1),true);assert.equal(g.s.party[0].armorId,null);
 assert.ok(!g.sellLoot(2).includes('Sold'));assert.equal(g.removeLoot(1,'armor'),true);
 assert.ok(g.sellLoot(2).includes('Sold'));assert.equal(g.s.party[0].charmId,1);
 g.startBattle({id:'gear',r:0,type:'enemy'});assert.equal(g.battle.actor,2);
 assert.equal(g.equipLoot(1,2),false,'cannot change loadout mid battle');
 assert.equal(LQ.validSave(JSON.parse(JSON.stringify(g.s))),true);
}
console.log('PASS speed order, fallen actors, poison duration, stun recovery, Rally, three gear slots, legacy saves and transfer safety');
