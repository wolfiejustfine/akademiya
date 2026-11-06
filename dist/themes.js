(function(root){
  'use strict';
  const palettes={
    press:{name:'Уголь и бумага',scheme:'dark',paper:'#181818',surface:'#1f1f1f',ink:'#ffffff',muted:'#9b9b9b',accent:'#dca88c',hover:'#ebc1a7',soft:'#1f1f1f',line:'#313131',buttonText:'#181818',compare:'#9b9b9b',error:'#f3aa9c'},
    night:{name:'Ночной графит',scheme:'dark',paper:'#000000',surface:'#181818',ink:'#ffffff',muted:'#9b9b9b',accent:'#e3b58b',hover:'#f4c9a3',soft:'#181818',line:'#313131',buttonText:'#181818',compare:'#9b9b9b',error:'#f3aa9c'},
    copper:{name:'Уголь и медь',scheme:'dark',paper:'#131209',surface:'#1f1f1f',ink:'#ffffff',muted:'#b8ad9d',accent:'#dca88c',hover:'#ebc1a7',soft:'#1f1f1f',line:'#313131',buttonText:'#181818',compare:'#bfb2a7',error:'#f3aa9c'},
    cinnabar:{name:'Киноварь',ink:'#232323',muted:'#665d58',accent:'#962d29',hover:'#74211f',soft:'#f7eeeb',line:'#ded8d3'},
    ultramarine:{name:'Ультрамарин',ink:'#202b3b',muted:'#596577',accent:'#254b8c',hover:'#18366c',soft:'#edf2fa',line:'#d6dfeb'},
    umber:{name:'Умбра',ink:'#352b25',muted:'#6d5e53',accent:'#704734',hover:'#543322',soft:'#f6eee8',line:'#e2d6cc'},
    graphite:{name:'Графит',ink:'#22272e',muted:'#626a73',accent:'#434b57',hover:'#2b323d',soft:'#f0f2f4',line:'#d9dee3'}
  };
  for(const [id,palette] of Object.entries(palettes))palettes[id]={paper:'#ffffff',surface:'#ffffff',buttonText:'#ffffff',compare:'#6f7277',scheme:'light',error:'#a14332',...palette};
  if(typeof module!=='undefined'&&module.exports){module.exports=palettes;return;}
  function apply(id){
    const palette=palettes[id] || palettes.press;
    const style=document.documentElement.style;
    for(const [property,value] of Object.entries({'--paper':palette.paper,'--white':palette.surface,'--ink':palette.ink,'--muted':palette.muted,'--green':palette.accent,'--accent-hover':palette.hover,'--soft':palette.soft,'--line':palette.line,'--button-text':palette.buttonText,'--compare-ink':palette.compare,'--error-ink':palette.error}))style.setProperty(property,value);
    document.documentElement.style.colorScheme=palette.scheme;
    document.querySelector('meta[name="theme-color"]').content=palette.paper;
    document.documentElement.dataset.theme=id in palettes ? id : 'press';
    document.getElementById('theme-select').value=document.documentElement.dataset.theme;
    try{localStorage.setItem('akademiya-theme-v1',document.documentElement.dataset.theme);}catch{}
  }
  let id='press';
  try{id=localStorage.getItem('akademiya-theme-v1') || id;}catch{}
  apply(id);
  document.getElementById('theme-select').addEventListener('change',event=>apply(event.target.value));
})(typeof window==='undefined'?globalThis:window);
