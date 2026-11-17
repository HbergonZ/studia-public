"""Gera um HTML único para abrir diretamente e um ZIP do protótipo completo."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED

root = Path(__file__).resolve().parent
dist = root / 'dist'
html = (dist / 'index.html').read_text(encoding='utf-8')
css = (dist / 'styles.css').read_text(encoding='utf-8')
js = (dist / 'app.js').read_text(encoding='utf-8')
html = html.replace('<link rel="stylesheet" href="styles.css">', '<style>\n' + css + '\n</style>')
html = html.replace('<script src="app.js" defer></script>', '<script>\n' + js + '\n</script>')
(root / 'studia-layouts.html').write_text(html, encoding='utf-8')
with ZipFile(root / 'studia-layouts.zip', 'w', ZIP_DEFLATED) as archive:
    for file in sorted(dist.rglob('*')):
        if file.is_file():
            archive.write(file, file.relative_to(root))
    for name in ['README.md', 'DESIGN.md', 'studia-layouts.html']:
        archive.write(root / name, name)
print('HTML único e ZIP gerados em prototypes/layouts/.')
