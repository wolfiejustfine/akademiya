const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const movement=require('../dist/movement.js');
const custom=require('../dist/custom-words.js');
const context={window:{}};
vm.runInNewContext(fs.readFileSync(require.resolve('../dist/levels.js'),'utf8'),context);
vm.runInNewContext(fs.readFileSync(require.resolve('../dist/font-alphabet.js'),'utf8'),context);
const levels=context.window.KERNING_LEVELS;
const fonts=context.window.KERNING_FONTS;
test('Every internal letter can travel beyond the former 30-unit limit in both directions',()=>{
  for(const level of levels){
    const positions=Array.from(level.glyphs,g=>g.start);
    for(let i=1;i<positions.length-1;i++){
      assert.ok(movement.clamp(level,i,positions[i]-80)<positions[i]-30);
      assert.ok(movement.clamp(level,i,positions[i]+80)>positions[i]+30);
      const [min,max]=movement.bounds(level,i);
      assert.equal(movement.clamp(level,i,-1e6),min);
      assert.equal(movement.clamp(level,i,1e6),max);
      const edited=positions.slice();edited[i]=movement.clamp(level,i,positions[i]-80);
      assert.equal(movement.valid(edited,level),true);
    }
    for(const edge of [0,positions.length-1]){
      assert.equal(movement.clamp(level,edge,positions[edge]-80),positions[edge]);
      assert.equal(movement.clamp(level,edge,positions[edge]+80),positions[edge]);
    }
  }
});
test('Curriculum starts with three letters, grows in length, and introduces all requested shapes',()=>{
  assert.equal(levels[0].word.length,3);
  for(let i=1;i<levels.length;i++)assert.ok(levels[i].word.length>=levels[i-1].word.length);
  const advanced=levels.slice(5).flatMap(level=>Array.from(level.word).slice(1,-1)).join('');
  for(const char of 'ТШЖЩЮОС')assert.ok(advanced.includes(char),char);
});
test('Custom words include Russian case and Ё in every font, with serif options and valid movement',()=>{
  assert.ok(fonts.filter(f=>f.category==='serif').length>=2);
  for(const font of fonts)for(const word of ['АФИША','Афиша','ЩЁТКА','союз','ТЮЛЬПАН']){
    const level=custom.build(word,font);
    assert.equal(level.word,word.toLocaleUpperCase('ru-RU'));
    assert.equal(level.glyphs.length,word.length);
    assert.equal(movement.valid(Array.from(level.glyphs,g=>g.start),level),true);
    assert.equal(movement.valid(Array.from(level.glyphs,g=>g.target),level),true);
  }
  for(const word of ['ABBA','АФИШA','два слова','Я','123'])assert.throws(()=>custom.build(word,fonts[0]));
});
