(function(root){
  'use strict';
  const required=1, threshold=95, version=3;
  const badges=Object.freeze([{count:1,title:'Первый набор'},{count:5,title:'Чувство ритма'},{count:10,title:'Точный взгляд'},{count:18,title:'Кириллический набор'}]);
  // The criterion uses the percentage actually shown to the student.
  function successful(score){return Number.isFinite(score)&&Math.round(score)>=threshold&&score<=100;}
  function mastered(record){return Number.isInteger(record?.successes)&&record.successes>=required;}
  function unlocked(records,index){return Number.isInteger(index)&&index>=0&&index<records.length&&records.slice(0,index).every(mastered);}
  function firstOpen(records){const index=records.findIndex(record=>!mastered(record));return index<0?records.length-1:index;}
  function initial(level){return {draft:level.glyphs.map(g=>g.start),attemptStart:level.glyphs.map(g=>g.start),submission:null,phase:'edit',successes:0,attempts:0,masteryScore:null};}
  function attempt(record,score){
    const pass=successful(score);
    return {...record,attempts:(record.attempts||0)+1,successes:Math.max(record.successes||0,pass?required:0),
      masteryScore:!mastered(record)&&pass ? score : record.masteryScore??null};
  }
  // Older saves counted up to three successful attempts. Their recorded successes
  // now unlock the next exercise; recover the exact score from the attempt ledger.
  function migrate(state,levels,score){
    const records=state.records.map((record,index)=>{
      if(!mastered(record)||successful(record.masteryScore))return record;
      const level=levels[index],targets=level.glyphs.map(g=>g.target);
      const positions=[...(state.events||[]).filter(e=>e.level===index).map(e=>e.positions),record.submission?.positions];
      const value=positions.filter(p=>Array.isArray(p)&&p.length===targets.length).map(p=>score(p,targets)).find(successful);
      // A legacy success counter proves the threshold was met even if its old
      // version did not retain that attempt's coordinates. Keep its lower bound.
      return {...record,masteryScore:value??threshold};
    });
    return {...state,records};
  }
  function nextDraft(level,previous=[],random=Math.random){
    return level.glyphs.map((glyph,i)=>{
      if(i===0||i===level.glyphs.length-1)return glyph.start;
      const sign=random()<.5?-1:1;
      let offset=sign*(8+Math.floor(random()*6));
      if(Math.abs(glyph.target+offset-previous[i])<2)offset=-offset;
      return glyph.target+offset;
    });
  }
  function apply(state,index,score){
    const record=state.records[index],points=Number.isFinite(state.points)?state.points:0;
    const reward=mastered(record)?0:successful(score)?10:-Math.min(3,points);
    const records=state.records.slice();records[index]=attempt(record,score);
    records[index].submission=record.submission?{...record.submission,reward}:null;
    const count=records.filter(mastered).length;
    return {...state,records,points:points+reward,awards:badges.filter(b=>count>=b.count).map(b=>b.count)};
  }
  const api = Object.freeze({required,threshold,version,badges,successful,mastered,unlocked,firstOpen,initial,attempt,nextDraft,apply,migrate});
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.KerningProgression=api;
})(typeof window==='undefined'?globalThis:window);
