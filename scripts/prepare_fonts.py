"""Fetch open font releases and bake reproducible Cyrillic SVG exercises."""
import hashlib
import io
import json
import re
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / '.tools/python'))
import uharfbuzz as hb
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.boundsPen import BoundsPen
from fontTools.varLib.instancer import instantiateVariableFont

FONTS = ROOT / 'dist/fonts'
FONTS.mkdir(parents=True, exist_ok=True)
BASE = 'https://raw.githubusercontent.com/google/fonts/main/ofl/'

def fetch(url):
    request = urllib.request.Request(url, headers={'User-Agent': 'CyrillicKerningPractice/1.0'})
    with urllib.request.urlopen(request, timeout=45) as response:
        return response.read()

if '--offline' in sys.argv:
    inventory = json.loads((FONTS / 'manifest.json').read_text(encoding='utf-8'))
else:
    inventory = {}
    for folder in ['ptsans', 'ptserif', 'golostext', 'literata']:
        metadata = fetch(BASE + folder + '/METADATA.pb').decode('utf-8')
        files = re.findall(r'filename: "([^"]+)"', metadata)
        license_bytes = fetch(BASE + folder + '/OFL.txt')
        (FONTS / (folder + '-OFL.txt')).write_bytes(license_bytes)
        inventory[folder] = {}
        for filename in files:
            if folder == 'ptsans' and ('Italic' in filename):
                continue
            if folder == 'ptserif' and ('Bold' in filename):
                continue
            data = fetch(BASE + folder + '/' + urllib.parse.quote(filename))
            (FONTS / filename).write_bytes(data)
            inventory[folder][filename] = {
                'sha256': hashlib.sha256(data).hexdigest(),
                'source': BASE + folder + '/' + urllib.parse.quote(filename),
            }

def select_file(folder, italic=False, bold=False):
    for name in inventory[folder]:
        if ('Italic' in name) == italic and ('Bold' in name) == bold:
            return name
    raise ValueError((folder, italic, bold))

# Small authored refinements of the font's shaped positions. Reference solutions
# are editable teaching samples, not a claim of approval by the academy.
SPECS = [
    ('МИР', 'ptsans', False, False, {}, [0, 0, 0], [0, 8, 0], 'PT Sans', 'Прямое', 'Первый интервал', 'Перемещайте среднюю «И». Оцените белое пространство слева и справа.'),
    ('ДАР', 'ptsans', False, False, {}, [0, 0, 0], [0, 10, 0], 'PT Sans', 'Прямое', 'Одна буква · закрепление', 'Продолжаем с одной подвижной буквой. Найдите равновесие около диагоналей «А».'),
    ('ЛИК', 'ptsans', False, False, {}, [0, 0, 0], [0, 11, 0], 'PT Sans', 'Прямое', 'Одна буква · новый ритм', 'Двигайте среднюю «И». Оцените обе паузы, затем посмотрите на слово целиком.'),
    ('ПИР', 'golostext', False, False, {'wght': 400}, [0, 0, 0], [0, 12, 0], 'Golos Text', 'Прямое', 'Одна буква · другая гарнитура', 'Знакомая задача в другой гарнитуре. Перемещается только средняя «И».'),
    ('МАК', 'ptserif', False, False, {}, [0, 0, 0], [0, 8, 0], 'PT Serif', 'Прямое', 'Одна буква · знакомство с засечками', 'Перемещайте «А». Учитывайте засечки и форму белого пространства по всей высоте.'),
    ('ЛИРА', 'ptsans', False, False, {}, [0, -1, 1, 0], [0, 9, -10, 0], 'PT Sans', 'Прямое', 'Две буквы · первый шаг', 'Теперь подвижны «И» и «Р». Начните с одного промежутка, затем оцените всё слово.'),
    ('МЕРА', 'ptserif', False, False, {}, [0, 0, 0, 0], [0, 10, -11, 0], 'PT Serif', 'Прямое', 'Две буквы · закрепление', 'Продолжаем с двумя подвижными буквами. После каждого сдвига смотрите на слово целиком.'),
    ('РОСА', 'ptserif', False, False, {}, [0, 0, 0, 0], [0, 11, -12, 0], 'PT Serif', 'Прямое', 'Две буквы · О и С', 'Добавляем круглую «О» и открытую «С». Оценивайте зрительную плотность, а не расстояния по линейке.'),
    ('СТОЛ', 'ptsans', False, False, {}, [0, 0, 0, 0], [0, 12, -8, 0], 'PT Sans', 'Прямое', 'Две буквы · нависание Т', 'Следите за пространством под перекладиной «Т» и рядом с круглой «О».'),
    ('АЖУР', 'ptsans', False, False, {}, [0, 0, 0, 0], [0, 8, -9, 0], 'PT Sans', 'Прямое', 'Две буквы · широкая Ю', 'Перемещайте «Ж» и «Ю». Широкие формы меняют рисунок промежутков; крайние буквы остаются закреплены.'),
    ('КНИГА', 'ptsans', False, False, {}, [0, 0, 0, 0, 0], [0, 9, -10, 11, 0], 'PT Sans', 'Прямое', 'Три буквы · первый шаг', 'Добавляется третья подвижная буква. Сначала найдите самый заметный разрыв ритма.'),
    ('РАМКА', 'ptserif', False, False, {}, [0, 0, 0, 0, 0], [0, 10, -11, 12, 0], 'PT Serif', 'Прямое', 'Три буквы · закрепление', 'Продолжаем с тремя подвижными буквами. Согласуйте середину слова с его краями.'),
    ('АФИША', 'ptsans', False, False, {}, [0, 0, 0, 0, 0], [0, 11, -12, 8, 0], 'PT Sans', 'Прямое', 'Три буквы · широкая Ш', 'Сравните промежутки около округлой «Ф» и широкой «Ш». Образец стоит обсудить с преподавателем: оптическая расстановка допускает варианты.'),
    ('ВЕЩИЙ', 'ptsans', False, False, {}, [0, 0, 0, 0, 0], [0, 12, -8, 9, 0], 'PT Sans', 'Прямое', 'Три буквы · широкая Щ', 'Сравните широкую «Щ» с более узкими соседями. Оценивайте зрительную плотность промежутков по всей высоте букв.'),
    ('ЛИТЕРА', 'ptserif', False, False, {}, [0, 1, -1, 1, -1, 0], [0, 8, -9, 10, -11, 0], 'PT Serif', 'Прямое', 'Четыре буквы · первый шаг', 'Слово стало на одну букву длиннее. Оцените общий ритм, затем уточните отдельные интервалы.'),
    ('КЛЮКВА', 'ptsans', False, False, {}, [0, 0, 0, 0, 0, 0], [0, 9, -10, 11, -12, 0], 'PT Sans', 'Прямое', 'Четыре буквы · широкая Ю', 'Продолжаем с четырьмя подвижными буквами. Сравните плотность около «Ю» с соседними участками.'),
    ('ТЮЛЬПАН', 'ptsans', False, False, {}, [0, 0, 0, 0, 0, 0, 0], [0, 10, -11, 12, -8, 9, 0], 'PT Sans', 'Прямое', 'Пять букв · первый шаг', 'Добавляется пятая подвижная буква. Проверьте начало «ТЮ», середину и конец слова по очереди.'),
    ('ГАЛЕРЕЯ', 'ptserif', True, False, {}, [0, 0, 0, 0, 0, 0, 0], [0, 11, -12, 8, -9, 10, 0], 'PT Serif', 'Курсив', 'Пять букв · курсив', 'Закрепляем работу с пятью буквами в курсиве. Учитывайте наклон и видимые очертания букв.'),
]

levels = []
for index, spec in enumerate(SPECS):
    word, folder, italic, bold, axes, refine, disorder, family, style, topic, note = spec
    assert re.fullmatch(r'[А-Яа-яЁё]+', word)
    assert len(word) == len(refine) == len(disorder)
    filename = select_file(folder, italic, bold)
    font = TTFont(FONTS / filename)
    if axes:
        font = instantiateVariableFont(font, axes, inplace=False)
    stream = io.BytesIO()
    font.save(stream)
    font_bytes = stream.getvalue()
    hbfont = hb.Font(hb.Face(font_bytes))
    hb.ot_font_set_funcs(hbfont)
    buffer = hb.Buffer()
    buffer.add_str(word)
    buffer.direction = 'ltr'
    buffer.script = 'Cyrl'
    buffer.language = 'ru'
    hb.shape(hbfont, buffer, {'kern': True, 'liga': False, 'clig': False})
    infos, positions = buffer.glyph_infos, buffer.glyph_positions
    assert len(infos) == len(word), 'One independent glyph per letter is required'
    glyphset = font.getGlyphSet()
    cmap = font.getBestCmap()
    for char in word:
        assert ord(char) in cmap, (word, char, filename)
    # All exercises use a 160-unit cap height: original scoring thresholds remain
    # comparable across typefaces and are independent of browser dimensions.
    cap_height = getattr(font['OS/2'], 'sCapHeight', 0)
    if not cap_height:
        cap_pen = BoundsPen(glyphset)
        glyphset[cmap[ord('Н')]].draw(cap_pen)
        cap_height = cap_pen.bounds[3]
    scale = 160 / cap_height
    cursor = 0
    glyphs = []
    for i, (info, pos) in enumerate(zip(infos, positions)):
        name = font.getGlyphName(info.codepoint)
        pen = SVGPathPen(glyphset)
        transformed = TransformPen(pen, (scale, 0, 0, -scale, 0, 190))
        glyphset[name].draw(transformed)
        bounds_pen = BoundsPen(glyphset)
        glyphset[name].draw(TransformPen(bounds_pen, (scale, 0, 0, -scale, 0, 190)))
        target = round(55 + (cursor + pos.x_offset) * scale + refine[i], 3)
        glyphs.append({'char': word[i], 'path': pen.getCommands(), 'target': target,
                       'start': target + disorder[i], 'bounds': list(bounds_pen.bounds)})
        cursor += pos.x_advance
    right = max(g['target'] + g['bounds'][2] for g in glyphs)
    min_y = min(g['bounds'][1] for g in glyphs)
    max_y = max(g['bounds'][3] for g in glyphs)
    levels.append({'id': index + 1, 'word': word, 'family': family, 'style': style,
                   'topic': topic, 'note': note, 'fontFile': filename, 'sourceFamily': folder,
                   'width': round(right + 55, 3), 'viewY': min_y - 55,
                   'height': max_y - min_y + 110, 'baseline': 190,
                   'capline': 30, 'glyphs': glyphs})

(ROOT / 'dist/levels.js').write_text('window.KERNING_LEVELS = ' + json.dumps(levels, ensure_ascii=False, separators=(',', ':')) + ';\n', encoding='utf-8')
(FONTS / 'manifest.json').write_text(json.dumps(inventory, ensure_ascii=False, indent=2), encoding='utf-8')
# UI font: a fixed local filename, no external font requests at runtime.
golos = select_file('golostext')
(ROOT / 'dist/fonts.css').write_text('\n'.join([
    '@font-face{font-family:"Manrope";src:url("./fonts/Manrope[wght].ttf") format("truetype");font-weight:400 700;font-style:normal;font-display:swap}',
    '@font-face{font-family:"PT Sans";src:url("./fonts/PT_Sans-Web-Regular.ttf") format("truetype");font-weight:400;font-style:normal;font-display:swap}',
    '@font-face{font-family:"PT Sans";src:url("./fonts/PT_Sans-Web-Bold.ttf") format("truetype");font-weight:700;font-style:normal;font-display:swap}',
    '@font-face{font-family:"PT Serif";src:url("./fonts/PT_Serif-Web-Regular.ttf") format("truetype");font-weight:400;font-style:normal;font-display:swap}',
]) + '\n', encoding='utf-8')
print(json.dumps({'levels': len(levels), 'fontFiles': sum(map(len, inventory.values())), 'words': [x['word'] for x in levels]}, ensure_ascii=False))
