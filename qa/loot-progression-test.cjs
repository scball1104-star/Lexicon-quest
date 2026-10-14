/* Reforged Realms equipment-drop and combat-stat integration QA */
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const LQ=require('../rpg-engine.js');
const context={LQ,console};vm.createContext(context);
for(const name of ['rpg-reforged.js','rpg-loot.js'])vm.runInContext(fs.readFileSync(require('node:path').join(__dirname,'..',name),'utf8'),context,{filename:name});
let checks=0;function ok(x,label){assert.ok(x,label);checks++;}
ok(LQ.loot.qualities.length===4,'rarities defined');
ok(LQ.loot.types.length>=4,'affix types defined');
for(let r=0;r<8;r++){
 const g=new LQ.Game({...LQ.fresh('Loot QA'),region:r});
 g.startBattle({id:'qa-boss-'+r,r,type:'boss'});
 g.battle.enemies.forEach(e=>{e.hp=0;});
 g.win();
 ok(g.s.loot.length===1,'region '+r+' guaranteed boss drop');
 const item=g.s.loot[0];
 ok(item.rarity>=2,'region '+r+' boss drops rare or better');
 ok(item.region===r,'region '+r+' thematic loot');
 ok(!!LQ.loot.itemEffect(item),'region '+r+' item has mechanical effect');
 ok(g.equipLoot(item.id,0),'region '+r+' gear equips');
 ok(g.s.party[0].charmId===item.id,'region '+r+' charm stored on hero');
 ok(g.equipLoot(item.id,1),'region '+r+' gear transfers');
 ok(g.s.party[0].charmId===null&&g.s.party[1].charmId===item.id,'region '+r+' prevents duplicate equips');
 ok(LQ.validSave(g.s),'region '+r+' version 3 saves with loot');
 ok(!g.sellLoot(item.id).includes('Sold'),'region '+r+' cannot sell equipped loot');
 ok(g.removeLoot(1),'region '+r+' removes charm');
 const before=g.s.gold;
 ok(g.sellLoot(item.id).includes('Sold'),'region '+r+' resells unequipped gear');
 ok(g.s.gold>before&&g.s.loot.length===0,'region '+r+' resale updates gold and inventory');
}
{
 const g=new LQ.Game();LQ.loot.ensureLoot(g.s);
 g.s.loot.push({id:1,rarity:2,stat:'might',bonus:3,region:0,name:'Damage Charm'});
 g.s.lootNextId=2;g.equipLoot(1,0);g.startBattle({id:'test-might',r:0,type:'enemy'});
 const tier=g.s.party[0].tier,hp=g.battle.enemies[0].hp;
 g.act('attack',0);
 ok(g.s.party[0].tier===tier,'temporary enchant does not corrupt forge tier');
 ok(hp-g.battle.enemies[0].hp>=30,'weapon charm improves attack');
 const cloned=LQ.fresh();const h=new LQ.Game(cloned);h.startBattle({id:'test-might',r:0,type:'enemy'});
 const baseline=h.battle.enemies[0].hp;h.act('attack',0);
 ok(hp-g.battle.enemies[0].hp>baseline-h.battle.enemies[0].hp,'attack bonus exceeds baseline');
}
{
 const g=new LQ.Game();g.s.loot=[{id:1,rarity:3,stat:'guard',bonus:2,region:0,name:'Defense Crest'}];g.equipLoot(1,1);
 g.startBattle({id:'guard-check',r:0,type:'enemy'});
 g.battle.enemies=g.battle.enemies.slice(0,1);g.battle.enemies[0].role='hunter';g.battle.enemies[0].power=30;
 const armor=g.s.party[1].armor,hp=g.s.party[1].hp;
 g.enemyTurn();
 ok(g.s.party[1].armor===armor,'defense enchant cannot corrupt armor forge tier');
 const damage=hp-g.s.party[1].hp;
 const h=new LQ.Game();h.startBattle({id:'guard-check',r:0,type:'enemy'});
 h.battle.enemies=h.battle.enemies.slice(0,1);h.battle.enemies[0].role='hunter';h.battle.enemies[0].power=30;
 const baseline=h.s.party[1].hp;h.enemyTurn();
 ok(damage<baseline-h.s.party[1].hp,'guard charm reduces damage');
}
for(const [stat,bonus,expected] of [['focus',3,21],['spirit',3,9],['vitality',3,27]]){
 const g=new LQ.Game();
 g.s.loot=[{id:1,rarity:1,stat,bonus,region:0,name:stat+' Charm'}];g.equipLoot(1,0);
 g.s.party[0].hp=Math.max(1,g.s.party[0].maxhp-40);g.s.party[0].mp=Math.max(0,g.s.party[0].maxmp-15);
 const oldHp=g.s.party[0].hp,oldMp=g.s.party[0].mp;
 g.startBattle({id:'test-buff',r:0,type:'enemy'});
 if(stat==='focus')ok(g.battle.focus===expected,'Focus buff in battle');
 if(stat==='spirit')ok(g.s.party[0].mp===oldMp+expected,'MP recovery in battle');
 if(stat==='vitality')ok(g.s.party[0].hp===oldHp+expected,'HP recovery in battle');
}
const legacy=LQ.fresh('Old Save');
const fromLegacy=new LQ.Game(JSON.parse(JSON.stringify(legacy)));
ok(Array.isArray(fromLegacy.s.loot),'old save receives loot inventory');
ok(fromLegacy.s.party.every(p=>p.charmId===null),'old party starts without charms');
ok(LQ.validSave(fromLegacy.s),'old save remains valid after loot migration');
const html=fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8');
ok(html.indexOf('rpg-reforged.js')<html.indexOf('rpg-loot.js')&&html.indexOf('rpg-loot.js')<html.indexOf('rpg-ui.js'),'correct runtime script order');
console.log('PASS '+checks+' loot checks: all realms drop themed gear, rarities, transfers, sales, damage/defense/HP/MP/Focus modifiers, and save compatibility.');
