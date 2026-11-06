const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const movement=require('../dist/movement.js'),progression=require('../dist/progression.js');
const context={window:{},module:{exports:{}}};
vm.runInNewContext(fs.readFileSync(require.resolve('../dist/levels.js'),'utf8'),context);
context.window.KerningMovement=movement;context.window.KerningProgression=progression;
vm.runInNewContext(fs.readFileSync(require.resolve('../dist/persistence.js'),'utf8'),context);
const {choose,key}=context.module.exports;
function state(successes=0){const records=context.window.KERNING_LEVELS.map(progression.initial);records[0].successes=successes;records[0].attempts=successes;if(successes===3)records[0].masteryScore=95;return {version:3,curriculum:'gentle-18-v1',index:0,records,events:[],points:successes*10};}
function storage(entries){const map=new Map(Object.entries(entries).map(([k,v])=>[k,JSON.stringify(v)]));return {getItem:k=>map.get(k)||null,get length(){return map.size;},key:i=>[...map.keys()][i]};}
test('One-time migration preserves the most advanced browser snapshot without merging attempts',()=>{
  const data=storage({'kirillitsa-kerning-v3':state(1),'kirillitsa-kerning-v3-user-2':state(3)});
  const result=choose(data);assert.equal(result.records[0].successes,3);assert.equal(result.points,30);assert.equal(data.length,2);
});
test('An existing anonymous save takes precedence over old profiles, including an intentional restart',()=>{
  const data=storage({[key]:state(0),'kirillitsa-kerning-v3-user-2':state(3)});
  assert.equal(choose(data).records[0].successes,0);
});
test('Corrupt snapshots are ignored while valid local progress stays available',()=>{
  const invalid=state(3);invalid.records[0].draft[0]+=20;
  assert.equal(choose(storage({[key]:invalid,'kirillitsa-kerning-v3':state(2)})).records[0].successes,2);
  assert.equal(choose(storage({[key]:{version:3}})),null);
});
