"""Audit the bundled image pool without network or image-library dependencies."""
import hashlib
import json
from pathlib import Path
from urllib.parse import urlsplit

WEB = Path(__file__).resolve().parents[1] / 'deblock' / 'web'


def test_art_catalog_has_traceable_cc0_sources() -> None:
    items = json.loads((WEB / 'assets/art/catalog.json').read_text())
    assert items and len({item['id'] for item in items}) == len(items)
    for item in items:
        assert item['license'] == 'CC0'
        assert item['licenseUrl'] == 'https://creativecommons.org/publicdomain/zero/1.0/'
        for field in ['title', 'artist', 'culture', 'museum', 'rightsEvidence', 'rightsStatement', 'verifiedAt']:
            assert item[field].strip()
        assert urlsplit(item['sourceUrl']).hostname in {'www.metmuseum.org', 'americanart.si.edu'}
        assert urlsplit(item['rightsEvidence']).hostname in {'collectionapi.metmuseum.org', 'www.si.edu'}


def test_art_files_match_reviewed_checksums() -> None:
    for item in json.loads((WEB / 'assets/art/catalog.json').read_text()):
        assert item['src'] == f"/assets/art/{item['id']}.jpg"
        content = (WEB / item['src'].lstrip('/')).read_bytes()
        assert content.startswith(b'\xff\xd8')
        assert hashlib.sha256(content).hexdigest() == item['sha256']
