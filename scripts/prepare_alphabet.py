"""Bake Cyrillic outlines and pair positioning from the bundled OFL fonts."""
import io
import json
import sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / '.tools/python'))
import uharfbuzz as hb
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.transformPen import TransformPen

FONTS = ROOT / 'dist/fonts'
manifest = json.loads((FONTS / 'manifest.json').read_text(encoding='utf-8'))
alphabet = 'АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ'
alphabet += alphabet.lower()
profiles = [
    ('sans', 'ptsans', False, False, {}, 'PT Sans', 'Прямое', 'sans'),
    ('sans-bold', 'ptsans', False, True, {}, 'PT Sans', 'Жирное', 'sans'),
    ('golos', 'golostext', False, False, {'wght':400}, 'Golos Text', 'Прямое', 'sans'),
    ('golos-semibold', 'golostext', False, False, {'wght':600}, 'Golos Text', 'Полужирное', 'sans'),
    ('serif', 'ptserif', False, False, {}, 'PT Serif', 'Прямое', 'serif'),
    ('serif-italic', 'ptserif', True, False, {}, 'PT Serif', 'Курсив', 'serif'),
    ('literata', 'literata', False, False, {'wght':500,'opsz':48}, 'Literata', 'Прямое', 'serif'),
    ('literata-italic', 'literata', True, False, {'wght':500,'opsz':48}, 'Literata', 'Курсив', 'serif'),
]
output = []
for identifier, folder, italic, bold, axes, family, style, category in profiles:
    filename = next(name for name in manifest[folder] if ('Italic' in name)==italic and ('Bold' in name)==bold)
    font = TTFont(FONTS / filename)
    if axes:
        font = instantiateVariableFont(font, axes, inplace=False)
    stream = io.BytesIO(); font.save(stream)
    hbfont = hb.Font(hb.Face(stream.getvalue())); hb.ot_font_set_funcs(hbfont)
    glyphset = font.getGlyphSet()
    cmap = font.getBestCmap()
    cap = getattr(font['OS/2'], 'sCapHeight', 0)
    if not cap:
        pen = BoundsPen(glyphset); glyphset[cmap[ord('Н')]].draw(pen); cap=pen.bounds[3]
    scale = 160 / cap
    def shape(text):
        buffer=hb.Buffer(); buffer.add_str(text); buffer.direction='ltr'; buffer.script='Cyrl'; buffer.language='ru'
        hb.shape(hbfont,buffer,{'kern':True,'liga':False,'clig':False})
        return buffer.glyph_infos,buffer.glyph_positions
    glyphs={}; singles={}
    for char in alphabet:
        assert ord(char) in cmap
        info,positions=shape(char); singles[char]=(info[0].codepoint,positions[0])
        name=font.getGlyphName(info[0].codepoint)
        pen=SVGPathPen(glyphset); glyphset[name].draw(TransformPen(pen,(scale,0,0,-scale,0,190)))
        bounds=BoundsPen(glyphset); glyphset[name].draw(TransformPen(bounds,(scale,0,0,-scale,0,190)))
        assert positions[0].y_offset==0
        glyphs[char]={'path':pen.getCommands(),'bounds':list(bounds.bounds),
                      'advance':positions[0].x_advance*scale,'offset':positions[0].x_offset*scale}
    pairs={}
    for left in alphabet:
        for right in alphabet:
            infos,positions=shape(left+right)
            assert len(infos)==2 and infos[0].codepoint==singles[left][0] and infos[1].codepoint==singles[right][0]
            values=[(positions[0].x_advance-singles[left][1].x_advance)*scale,
                    (positions[1].x_advance-singles[right][1].x_advance)*scale,
                    (positions[0].x_offset-singles[left][1].x_offset)*scale,
                    (positions[1].x_offset-singles[right][1].x_offset)*scale]
            if any(values): pairs[left+right]=values
    # Confirm the additive pair representation against full-word HarfBuzz output.
    for word in ['АФИША','Афиша','ЩЁТКА','ТЮЛЬПАН','СОЮЗ','путешествие','общежитие','КОЛОСОК']:
        infos,positions=shape(word); real_cursor=0; pair_cursor=0
        for i,(char,pos) in enumerate(zip(word,positions)):
            previous=pairs.get(word[i-1:i+1],[0]*4) if i else [0]*4
            following=pairs.get(word[i:i+2],[0]*4)
            expected=real_cursor+pos.x_offset*scale
            actual=pair_cursor+glyphs[char]['offset']+previous[3]+following[2]
            assert abs(actual-expected)<.01, (identifier,word,i,actual,expected)
            real_cursor+=pos.x_advance*scale
            pair_cursor+=glyphs[char]['advance']+previous[1]+following[0]
    output.append({'id':identifier,'family':family,'style':style,'category':category,'glyphs':glyphs,'pairs':pairs,
                   'sourceFamily':folder,'fontFile':filename,'license':'SIL Open Font License 1.1'})

(ROOT/'dist/font-alphabet.js').write_text('window.KERNING_FONTS = '+json.dumps(output,ensure_ascii=False,separators=(',',':'))+';\n',encoding='utf-8')
print('Cyrillic alphabet: '+str(len(output))+' font styles, all pair/full-word checks passed')
