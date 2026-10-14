/* Reforged Realms: crossword-free campaign integration and legacy save compatibility. */
'use strict';
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const LQ=require('../rpg-engine.js');
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../rpg-reforged.js'),'utf8'),{LQ,console});
let checks=0;
function ok(v,why){assert.ok(v,why);checks++;}
ok(LQ.relics.length===8,'eight chapter relics');
ok(LQ.trials.length===8,'eight echo trials');
for(let r=0;r<8;r++){
 const save={...LQ.fresh('Reforged Hero'),place:'dungeon',region:r,floor:1,x:14,y:15};
 const g=new LQ.Game(save);
 const map=g.map();
 const trial=map.objects.find(o=>o.type==='trial');
 ok(!!trial,'chapter '+r+' contains a trial');
 ok(map.objects.filter(o=>o.type==='trial').length===1,'chapter '+r+' contains exactly one trial');
 ok(/Echo Warden/i.test(trial.label),'chapter '+r+' names its Echo Warden');
 ok(!/crossword/i.test(g.objective()),'chapter '+r+' objective does not mention crosswords');
 ok(!g.s.flags['seal'+r],'chapter '+r+' initially sealed');
 if(r>=2){
  const ready=[null,null,'lq:ember:fansAligned','lq:vale:pumpsReady','lq:oracle:lensesAligned','lq:sky:relaysReady','lq:frost:lensesReady','lq:first:platesReady'][r];
  g.s.flags[ready]=true;
 }
 const result=g.interact(trial);
 ok(result&&result.screen==='battle','chapter '+r+' opens an actual RPG encounter');
 ok(g.battle&&g.battle.origin.type==='trial','chapter '+r+' battle records trial origin');
 ok(g.battle.enemies[0].name===LQ.trials[r].foes[0],'chapter '+r+' has region-specific foe');
 ok(!g.act('run',0),'chapter '+r+' trial is non-skippable');
 g.battle.enemies.forEach(e=>{e.hp=0});
 g.win();
 ok(!!g.s.flags['seal'+r],'chapter '+r+' seal removed on victory');
 ok(g.s.relics.includes(r),'chapter '+r+' relic granted');
 ok(g.s.gold>=175,'chapter '+r+' battle and first-clear rewards granted');
 if(r>=2)ok(!!g.s.flags[[null,null,'2-1-ventClear','3-1-archive','4-1-horizon','5-1-signals','6-1-light','7-1-text'][r]],'chapter '+r+' combined mechanisms release the gate');
 ok(LQ.validSave(g.s),'chapter '+r+' standard v3 save remains valid');
 ok(g.equipRelic(r).includes('Equipped'),'chapter '+r+' relic can be equipped');
 g.startBattle({id:'relic-check-'+r,type:'enemy',r});
 if(r===0)ok(g.battle.focus===15,'Rootglass gives Focus');
 if(r===1)ok(g.battle.ward>=1,'Silverglass gives Aegis');
 if(r===4){g.battle=null;g.startBattle({id:'guardian-check',type:'boss',r});ok(g.battle.focus>=25,'Sunpath boosts guardian Focus');}
 if(r===6)ok(g.battle.ward>=2,'Stillheart gives double Aegis');
 if(r===7)ok(g.battle.focus>=40,'Keeper Signet supplies minimum Focus');
}
const old=LQ.fresh('Legacy Hero');
old.flags.seal0=true;
old.puzzles[0]=['0-A','0-B'];
const oldGame=new LQ.Game(JSON.parse(JSON.stringify(old)));
ok(oldGame.s.relics.includes(0),'solved old crossword converts to relic');
ok(oldGame.s.equippedRelic===0,'migrated relic auto-equips');
ok(LQ.validSave(oldGame.s),'legacy version 3 save remains valid');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8'),ui=fs.readFileSync(path.join(__dirname,'../rpg-ui.js'),'utf8');
ok(html.includes('rpg-reforged.js')&&html.indexOf('rpg-reforged.js')<html.indexOf('rpg-ui.js'),'Reforged rules load before game UI');
ok(html.includes('rpg-reforged.css'),'Reforged visuals are loaded');
ok(!/crossword/i.test(ui),'main UI contains no crossword experience');
ok(!ui.includes("puzzleHTML("),'crossword grid has been removed from UI');
console.log('PASS '+checks+' Reforged Realms checks: eight trial battles, relics, gate progression, save migration, runtime order, crossword-free UI.');
