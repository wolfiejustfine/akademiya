const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const p=require('../dist/progression.js');
const movement=require('../dist/movement.js');
const scoring=require('../dist/scoring.js');
const scope={window:{}};
vm.runInNewContext(fs.readFileSync(require.resolve('../dist/levels.js'),'utf8'),scope);
const levels=scope.window.KERNING_LEVELS;
test('One result at 95–100 unlocks the following exercise; a failure does not revoke it',()=>{
  const records=levels.map(p.initial);
  assert.equal(p.unlocked(records,0),true);
  assert.equal(p.unlocked(records,1),false);
  records[0]=p.attempt(records[0],94);
  assert.equal(p.unlocked(records,1),false);
  records[0]=p.attempt(records[0],95);
  assert.equal(p.unlocked(records,1),true);
  assert.equal(p.unlocked(records,2),false);
  assert.equal(records[0].masteryScore,95);
  records[0]=p.attempt(records[0],0);
  assert.equal(p.mastered(records[0]),true);
  assert.equal(records[0].masteryScore,95);
  assert.equal(records[0].successes,1);
  assert.equal(p.successful(94.49),false);
  assert.equal(p.successful(94.5),true);
  assert.equal(p.successful(NaN),false);
});
test('Course adds at most one movable letter and stays with one for the first five tasks',()=>{
  assert.deepEqual(Array.from(levels,x=>x.glyphs.length-2),[1,1,1,1,1,2,2,2,2,2,3,3,3,3,4,4,5,5]);
  assert.ok(!levels.slice(0,3).some(level=>/[ТШЖЩЮОС]/.test(level.word)));
});
test('New repetitions change initial positions, preserve anchors and remain below the success threshold',()=>{
  for(const level of levels){
    const before=Array.from(level.glyphs,g=>g.start);
    for(const random of [()=>0,()=>.49,()=>.99]){
      const draft=p.nextDraft(level,before,random);
      assert.equal(movement.valid(draft,level),true);
      assert.equal(draft[0],before[0]);assert.equal(draft.at(-1),before.at(-1));
      assert.notDeepEqual(draft,before);
      assert.equal(p.successful(scoring.score(draft,Array.from(level.glyphs,g=>g.target))),false);
    }
  }
});
test('Rewards cannot go negative and stop changing after the first success',()=>{
  let state={records:levels.map(p.initial),points:0};
  for(const score of [0,100,0,95,100])state=p.apply(state,0,score);
  assert.equal(state.points,10);assert.equal(state.records[0].successes,1);
  assert.deepEqual(state.awards,[1]);
  for(const score of [0,100,0])state=p.apply(state,0,score);
  assert.equal(state.points,10);assert.equal(state.records[0].successes,1);
});
test('Legacy success counters, points and exact successful scores survive migration',()=>{
  const state={records:levels.map(p.initial),points:20,events:[{level:0,positions:Array.from(levels[0].glyphs,(g,i)=>g.target+(i===1?2:0))}]};
  state.records[0].successes=2;state.records[0].attempts=4;
  const migrated=p.migrate(state,levels,scoring.score);
  assert.equal(migrated.points,20);assert.equal(migrated.records[0].successes,2);
  assert.equal(migrated.records[0].masteryScore,98);assert.equal(p.unlocked(migrated.records,1),true);
  assert.equal(p.attempt(migrated.records[0],100).successes,2);
  const historical=p.migrate({...state,events:[]},levels,scoring.score);
  assert.equal(historical.records[0].masteryScore,95);
});
