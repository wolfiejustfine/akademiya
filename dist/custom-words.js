(function(root){
  'use strict';
  function build(word,font){
    word=String(word).trim().toLocaleUpperCase('ru-RU');
    if(!/^[А-Яа-яЁё]{3,18}$/u.test(word)) throw new Error('Введите одно русское слово: от 3 до 18 букв, без пробелов и знаков.');
    if(!font)throw new Error('Выберите шрифт.');
    let cursor=0;
    const glyphs=Array.from(word,(char,i)=>{
      const glyph=font.glyphs[char];
      if(!glyph)throw new Error('В выбранном шрифте нет буквы «'+char+'».');
      const previous=i ? font.pairs[word.slice(i-1,i+1)] || [0,0,0,0] : [0,0,0,0];
      const following=font.pairs[word.slice(i,i+2)] || [0,0,0,0];
      const target=55+cursor+glyph.offset+previous[3]+following[2];
      cursor+=glyph.advance+previous[1]+following[0];
      const disorder=i===0||i===word.length-1 ? 0 : (i%2 ? 1 : -1)*(10+(char.codePointAt(0)+i)%11);
      return {char,path:glyph.path,bounds:glyph.bounds.slice(),target,start:target+disorder};
    });
    const right=Math.max(...glyphs.map(g=>g.target+g.bounds[2]));
    const top=Math.min(...glyphs.map(g=>g.bounds[1]));
    const bottom=Math.max(...glyphs.map(g=>g.bounds[3]));
    return {id:'custom',custom:true,fontId:font.id,word,family:font.family,style:font.style,sourceFamily:font.sourceFamily,fontFile:font.fontFile,
      topic:'Своя практика · '+word.length+' букв',
      note:'Это автоматический образец по кернингу выбранной гарнитуры. Процент показывает совпадение с ним. Оптическая расстановка может отличаться: оценивайте слово целиком.',
      width:right+55,viewY:top-55,height:bottom-top+110,baseline:190,capline:30,glyphs};
  }
  const api=Object.freeze({build});
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.KerningCustomWords=api;
})(typeof window==='undefined'?globalThis:window);
