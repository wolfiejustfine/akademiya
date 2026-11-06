const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {penalty,score,legacyScore,exactMatch,sessionScore}=require('../dist/scoring.js');

test('Original penalty boundaries, including jumps at 10 and 15',()=>{
  for(const [distance,expected] of [[0,0],[1.99,0],[2,1],[3,2],[4,3],[6,7],[9,9],[10,9],[10.01,15.015],[15,22.5],[15.01,45.03]]){
    assert.ok(Math.abs(penalty(distance)-expected)<1e-8);
    assert.ok(Math.abs(penalty(-distance)-expected)<1e-8);
  }
});
test('Perfect solutions, tolerance, fixed endpoints, and zero scores follow original formula',()=>{
  assert.equal(legacyScore([0,100,200,300],[0,100,200,300]),100);
  assert.equal(legacyScore([0,101.9,198.1,300],[0,100,200,300]),100);
  assert.equal(legacyScore([0,106,200,300],[0,100,200,300]),81.25);
  assert.equal(legacyScore([0,130,170,300],[0,100,200,300]),0);
  assert.equal(sessionScore([0,0,0,0,0,0,0,0,0,0]),0);
  assert.equal(sessionScore([99.9,80.9]),90);
  assert.equal(sessionScore([100,100,100,100,100,100,100,100,100,100]),100);
});
test('MIR maximum-score tolerance is not reported as exact geometric coincidence',()=>{
  const target=[0,100,200];
  for(const offset of [1,2,3,4,5,5.99]){
    const positions=[0,100+offset,200];
    assert.equal(legacyScore(positions,target),100);
    assert.equal(exactMatch(positions,target),false);
  }
  assert.equal(exactMatch(target.slice(),target),true);
  assert.equal(exactMatch([0,100+1e-10,200],target),true);
  assert.equal(exactMatch([0,100.001,200],target),false);
  assert.ok(legacyScore([0,106,200],target)<100);
});
test('Active scoring fills 85–99, measures only movable letters and decreases continuously',()=>{
  const targets=[0,100,200];
  for(const distance of [0,0.25,1,2,3,4,5,6,10,20,100,120]){
    assert.equal(score([0,100+distance,200],targets),Math.max(0,100-distance));
    assert.equal(score([0,100-distance,200],targets),Math.max(0,100-distance));
  }
  assert.equal(score([0,105,200],targets),95);
  assert.equal(score([0,105,205,300],[0,100,200,300]),95);
  assert.ok(Math.abs(score([0,103,204,300],[0,100,200,300])-(100-Math.sqrt(12.5)))<1e-6);
});
test('Eighteen Cyrillic exercises have valid paths, frozen anchors, and reachable perfect solutions',()=>{
  const context={window:{}};
  vm.runInNewContext(fs.readFileSync(require.resolve('../dist/levels.js'),'utf8'),context);
  const levels=context.window.KERNING_LEVELS;
  assert.equal(levels.length,18);
  for(const level of levels){
    assert.match(level.word,/^[А-Яа-яЁё]+$/u);
    assert.equal(level.word.length,level.glyphs.length);
    assert.equal(level.glyphs[0].start,level.glyphs[0].target);
    assert.equal(level.glyphs.at(-1).start,level.glyphs.at(-1).target);
    for(const glyph of level.glyphs){assert.ok(glyph.path.length>10);assert.ok(Math.abs(glyph.start-glyph.target)<=30);}
    assert.equal(score(Array.from(level.glyphs,g=>g.target),Array.from(level.glyphs,g=>g.target)),100);
    assert.ok(level.width>0 && level.height>0);
  }
});
