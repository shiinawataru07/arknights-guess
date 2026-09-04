"""Package the Vite production output into a double-clickable offline HTML + ZIP.

Only the Python standard library is required by the maintainer at build time.
Recipients need a browser only; no Python, Node.js, server or internet is needed.
"""

import json
import re
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile

ROOT = Path(__file__).resolve().parent.parent


def inline_scripts(html: str, dist: Path) -> str:
    pattern = r'<script\b[^>]*\bsrc="([^"]+)"[^>]*>\s*</script>'

    def inline(match: re.Match) -> str:
        relative = match.group(1).lstrip('/')
        path = (dist / relative).resolve()
        if not path.is_relative_to(dist.resolve()):
            raise ValueError('Unexpected script path outside dist')
        source = path.read_text(encoding='utf-8')
        # Fail closed if the app later gains separately loaded chunks.
        if re.search(r'\bimport\s*\(|\bfrom\s*[\"\']\.', source):
            raise ValueError('Split JS chunks are not supported by the portable packager')
        source = re.sub(r'</script', r'<\\/script', source, flags=re.IGNORECASE)
        return '<script type="module">\n' + source + '\n</script>'

    html, count = re.subn(pattern, inline, html)
    if count != 1:
        raise ValueError(f'Expected one bundled entry script, got {count}')
    return html


def inline_styles(html: str, dist: Path) -> str:
    pattern = r'<link\b[^>]*\brel="stylesheet"[^>]*\bhref="([^"]+)"[^>]*>'

    def inline(match: re.Match) -> str:
        path = (dist / match.group(1).lstrip('/')).resolve()
        if not path.is_relative_to(dist.resolve()):
            raise ValueError('Unexpected stylesheet path outside dist')
        css = path.read_text(encoding='utf-8')
        # Use the existing system-font fallbacks rather than loading Google Fonts.
        css = re.sub(r'@import\s+[^;]+;', '', css)
        if re.search(r'url\(\s*[\"\']?(?!data:)', css):
            raise ValueError('External CSS assets must be embedded before packaging')
        return '<style>\n' + css + '\n</style>'

    html, count = re.subn(pattern, inline, html)
    if count != 1:
        raise ValueError(f'Expected one bundled stylesheet, got {count}')
    return html


def main() -> None:
    dist = ROOT / 'dist'
    html = (dist / 'index.html').read_text(encoding='utf-8')
    snapshot = json.loads((dist / 'data/operators.json').read_text(encoding='utf-8'))
    if not snapshot.get('operators'):
        raise ValueError('Cannot package an empty operator snapshot')
    html = inline_scripts(html, dist)
    html = inline_styles(html, dist)
    if re.search(r'<link\b[^>]*rel="(?:modulepreload|preload)"', html):
        raise ValueError('External preloaded resources are not supported')
    # Escape '<' to prevent any data string from terminating the JSON script tag.
    embedded = json.dumps(snapshot, ensure_ascii=False, separators=(',', ':')).replace('<', '\\u003c')
    html = html.replace('<div id="root"></div>',
                        '<div id="root"></div>\n<script id="operator-data" '
                        'type="application/json">' + embedded + '</script>')
    if 'id="operator-data"' not in html:
        raise ValueError('Missing root element in production HTML')
    output = ROOT / '开始游戏.html'
    output.write_text(html, encoding='utf-8')
    release = ROOT / 'release'
    release.mkdir(exist_ok=True)
    archive = release / '明日方舟猜干员-离线版.zip'
    with ZipFile(archive, 'w', compression=ZIP_DEFLATED) as package:
        package.write(output, arcname=output.name)
    # Check archive integrity and ensure it contains exactly the standalone game.
    with ZipFile(archive) as package:
        assert package.testzip() is None
        assert package.namelist() == [output.name]
        assert package.read(output.name) == output.read_bytes()
    print(f'Portable HTML: {output}')
    print(f'Share ZIP: {archive}')
    print(f'Embedded operators: {len(snapshot["operators"])}')


if __name__ == '__main__':
    main()
