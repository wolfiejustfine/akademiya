const {test}=require('node:test');
const assert=require('node:assert/strict');
const palettes=require('../dist/themes.js');
function rgb(hex){return [1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255);}
function luminance(rgb){return rgb.map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);}
function contrast(a,b){const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);}
function blend(foreground,background,alpha){return foreground.map((value,i)=>value*alpha+background[i]*(1-alpha));}
test('Light and dark palettes retain contrast on their actual background, including transparency',()=>{
  assert.equal(Object.keys(palettes).length,7);
  assert.equal(palettes.press.scheme,'dark');
  assert.equal(palettes.night.scheme,'dark');
  assert.equal(palettes.copper.scheme,'dark');
  for(const palette of Object.values(palettes)){
    const background=rgb(palette.paper);
    assert.ok(contrast(rgb(palette.muted),background)>=4.5,palette.name+' secondary text');
    assert.ok(contrast(rgb(palette.muted),rgb(palette.soft))>=4.5,palette.name+' panel secondary text');
    assert.ok(contrast(rgb(palette.buttonText),rgb(palette.accent))>=4.5,palette.name+' button');
    assert.ok(contrast(rgb(palette.ink),background)>=7,palette.name+' primary button');
    assert.ok(contrast(blend(rgb(palette.ink),background,.88),background)>=7,palette.name+' main letters');
    assert.ok(contrast(blend(rgb(palette.accent),background,.88),background)>=4.5,palette.name+' selected letter');
    assert.ok(contrast(blend(rgb(palette.compare),background,.88),background)>=3,palette.name+' compared letters');
    assert.ok(contrast(blend(rgb(palette.accent),background,.72),background)>=3,palette.name+' reference overlay');
    assert.ok(contrast(rgb(palette.ink),rgb(palette.soft))>=7,palette.name+' panel text');
  }
});
