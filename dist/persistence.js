(function(root){
  'use strict';
  const key='akademiya-progress-v1',cookie='akademiya_visitor',legacy='kirillitsa-kerning-v3';
  function valid(state){
    const levels=root.KERNING_LEVELS,move=root.KerningMovement;
    return state?.version===3&&state.curriculum==='gentle-18-v1'&&Number.isInteger(state.index)&&state.index>=0&&state.index<levels.length&&
      Array.isArray(state.records)&&state.records.length===levels.length&&state.records.every((r,i)=>
        move.valid(r?.draft,levels[i])&&Number.isInteger(r.successes)&&r.successes>=0&&r.successes<=3&&
        Number.isInteger(r.attempts)&&r.attempts>=r.successes&&(!r.submission||move.valid(r.submission.positions,levels[i]))&&
        (r.successes<3||root.KerningProgression.successful(r.masteryScore)));
  }
  function rank(state){return state.records.reduce((sum,r)=>sum+(root.KerningProgression.mastered(r)?1000:0)+r.successes*10,0);}
  function choose(storage){
    function read(name){try{const value=JSON.parse(storage.getItem(name));return valid(value)?value:null;}catch{return null;}}
    const saved=read(key);if(saved)return saved;
    const candidates=[read(legacy)];
    // One-time migration keeps the most advanced coherent browser snapshot.
    // Old guest/account keys remain untouched as a backup.
    for(let i=0;i<storage.length;i++){const name=storage.key(i);if(name?.startsWith(legacy+'-user-'))candidates.push(read(name));}
    return candidates.filter(Boolean).sort((a,b)=>rank(b)-rank(a)||(b.events?.length||0)-(a.events?.length||0))[0]||null;
  }
  if(typeof module!=='undefined'&&module.exports){module.exports={key,cookie,choose,rank,valid};return;}
  let visitorId='';
  try{visitorId=document.cookie.split('; ').find(value=>value.startsWith(cookie+'='))?.split('=')[1]||'';}catch{}
  if(!/^[a-f0-9]{64}$/.test(visitorId)){const bytes=crypto.getRandomValues(new Uint8Array(32));visitorId=Array.from(bytes,value=>value.toString(16).padStart(2,'0')).join('');}
  try{document.cookie=cookie+'='+visitorId+'; Max-Age=31536000; Path=/; SameSite=Lax'+(location.protocol==='https:'?'; Secure':'');}catch{}
  root.KerningPersistence=Object.freeze({key,cookie,visitorId,
    read:()=>choose(localStorage),
    write:state=>localStorage.setItem(key,JSON.stringify({...state,visitorId})),
  });
})(typeof window==='undefined'?globalThis:window);
