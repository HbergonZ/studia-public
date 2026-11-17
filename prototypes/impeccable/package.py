"""Bundle the local mockup as a standalone HTML, including fonts and their license."""
from pathlib import Path
import base64

root = Path(__file__).resolve().parent
dist = root / 'dist'
html = (dist / 'index.html').read_text(encoding='utf-8')
css = (dist / 'styles.css').read_text(encoding='utf-8-sig')
for weight in (400, 500, 600, 700):
    name = f'fonts/public-sans-{weight}.ttf'
    data = base64.b64encode((dist / name).read_bytes()).decode('ascii')
    css = css.replace(name, 'data:font/ttf;base64,' + data)
html = html.replace('<link rel="stylesheet" href="styles.css">', '<style>' + css + '</style>')
for name in ('demo-data', 'app'):
    source = (dist / f'{name}.js').read_text(encoding='utf-8').replace('</script', '<\\/script')
    html = html.replace(f'<script defer src="{name}.js"></script>', '')
    html = html.replace('</body>', '<script>' + source + '</script></body>')
license_text = (dist / 'fonts/OFL.txt').read_text(encoding='utf-8')
html = html.replace('</body>', '<script type="text/plain" id="font-license">' + license_text + '</script></body>')
(root / 'studia-mockups.html').write_text(html, encoding='utf-8')
print('HTML independente atualizado.')
