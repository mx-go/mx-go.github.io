"""Generate small icon fonts; upstream fonts remain as fallbacks for new icons."""
import re
from pathlib import Path
from fontTools import subset
from fontTools.ttLib import TTFont

root = Path(__file__).resolve().parents[1]
vendor = root / 'source/vendor/fontawesome-free/7.3.1'
css = (vendor / 'css/all.min.css').read_text()
inputs = [root / '_config.yml', root / 'themes/butterfly/_config.yml']
for directory in ['themes/butterfly/layout', 'themes/butterfly/source/js', 'themes/butterfly/source/css', 'source/_posts']:
    inputs += [p for p in (root / directory).rglob('*') if p.suffix in ['.pug', '.js', '.styl', '.md'] and not p.name.endswith('.min.js')]
inputs += list((root / 'public').rglob('*.html'))
text = '\n'.join(p.read_text(errors='replace') for p in inputs)
names = set(re.findall(r'\bfa-[a-z0-9-]+\b', text))
codes = {0x20} | {int(value, 16) for value in re.findall(r'\\([a-fA-F0-9]{4,6})', text)}
for selectors, declaration in re.findall(r'([^{}]+)\{([^{}]*)\}', css):
    match = re.search(r'--fa:["\']?\\([a-fA-F0-9]+)', declaration)
    if match and names.intersection(re.findall(r'\.([a-z0-9-]+)', selectors)):
        codes.add(int(match[1], 16))

font_codes = {}
full_codes = {}
for source in sorted((vendor / 'webfonts').glob('fa-*.woff2')):
    font = TTFont(source)
    full_codes[source.name] = set(font.getBestCmap())
    selected = codes.intersection(font.getBestCmap())
    if not selected:
        continue
    options = subset.Options()
    options.flavor = 'woff2'
    options.recalc_timestamp = False
    worker = subset.Subsetter(options=options)
    worker.populate(unicodes=selected)
    worker.subset(font)
    target = source.with_name('site-' + source.name)
    font.flavor = 'woff2'
    font.save(target)
    font_codes[source.name] = selected
    print(f'{source.name}: {source.stat().st_size} -> {target.stat().st_size} bytes, glyphs:{len(selected)}')

rules = ['/* Site subsets of Font Awesome Free 7.3.1. Upstream licenses and full-font fallbacks are retained. */']
def unicode_ranges(codes):
    groups = []
    for code in sorted(codes):
        if groups and groups[-1][1] + 1 == code:
            groups[-1][1] = code
        else:
            groups.append([code, code])
    return ','.join(f'U+{a:04X}' + (f'-{b:04X}' if a != b else '') for a, b in groups)

def fallback(face):
    name = re.search(r'\.\./webfonts/(fa-[^\)"\']+)', face)[1]
    if name not in font_codes or 'unicode-range:' in face:
        return face
    # Restrict fallbacks to real, non-subset glyphs so weight matching does not
    # download a full font merely to discover that a glyph is absent.
    remaining = full_codes[name] - font_codes[name]
    return face[:-1] + ';unicode-range:' + unicode_ranges(remaining) + '}' if remaining else ''

for face in re.findall(r'@font-face\{[^}]+\}', css):
    name = re.search(r'\.\./webfonts/(fa-[^\)"\']+)', face)[1]
    if name not in font_codes:
        continue
    selected = font_codes[name]
    original = re.search(r'unicode-range:([^}]+)', face)
    if original:
        allowed = set()
        for begin, end in re.findall(r'u\+([a-fA-F0-9]+)(?:-([a-fA-F0-9]+))?', original[1], re.I):
            allowed.update(range(int(begin, 16), int(end or begin, 16) + 1))
        selected = selected.intersection(allowed)
    if not selected:
        continue
    face = re.sub(r';unicode-range:[^}]+', '', face)
    face = face.replace('../webfonts/' + name, '../webfonts/site-' + name).replace('font-display:block', 'font-display:swap')
    ranges = ','.join(f'U+{code:04X}' for code in sorted(selected))
    rules.append(face[:-1] + ';unicode-range:' + ranges + '}')
(vendor / 'css/site-subset.css').write_text('\n'.join(rules) + '\n')
(vendor / 'css/site-icons.css').write_text(re.sub(r'@font-face\{[^}]+\}', lambda match: fallback(match[0]), css) + '\n' + '\n'.join(rules) + '\n')
