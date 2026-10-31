#!/usr/bin/env python3
"""Check local HTML references and copied demo assets; no rendering claim."""
import hashlib
import json
import sys
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit

site = Path(sys.argv[1]).resolve()
class References(HTMLParser):
    def __init__(self):
        super().__init__()
        self.refs = []
    def handle_starttag(self, tag, attrs):
        for key, value in attrs:
            if key in ('src', 'href') and value:
                self.refs.append(value)

checked = 0
for html in site.rglob('*.html'):
    parser = References()
    parser.feed(html.read_text())
    for ref in parser.refs:
        url = urlsplit(ref)
        if url.scheme or url.netloc or not url.path:
            continue
        assert not url.path.startswith('/'), f'Root-absolute reference: {html}: {ref}'
        target = (html.parent / unquote(url.path)).resolve()
        assert target.is_relative_to(site), f'Reference escapes site: {ref}'
        assert target.exists(), f'Missing reference: {html}: {ref}'
        checked += 1
for name, expected in [('deepseek', 72), ('glm', 72), ('mimo', 68)]:
    data = site / name / 'data/quito_predios_sinteticos.geojson'
    parsed = json.loads(data.read_text())
    assert parsed['type'] == 'FeatureCollection' and len(parsed['features']) == expected
    original = Path(__file__).resolve().parents[1] / 'implementations' / name / 'public/data/quito_predios_sinteticos.geojson'
    assert hashlib.sha256(original.read_bytes()).digest() == hashlib.sha256(data.read_bytes()).digest()
print(f'PASS: {checked} local HTML references; three byte-identical demonstration datasets. Browser behavior unverified.')
