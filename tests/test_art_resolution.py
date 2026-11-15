"""Prevent small derivatives or incorrectly labeled images entering fullscreen rotation."""
import json
import struct
from pathlib import Path

WEB = Path(__file__).resolve().parents[1] / 'deblock/web'


def jpeg_size(path: Path) -> tuple[int, int]:
    """Read baseline/progressive JPEG frame dimensions without an image dependency."""
    with path.open('rb') as image:
        assert image.read(2) == b'\xff\xd8'
        while True:
            assert image.read(1) == b'\xff'
            marker = image.read(1)
            while marker == b'\xff':
                marker = image.read(1)
            length = struct.unpack('>H', image.read(2))[0]
            if marker in (b'\xc0', b'\xc2'):
                _, height, width = struct.unpack('>BHH', image.read(5))
                return width, height
            image.seek(length - 2, 1)


def test_catalogue_dimensions_and_fullscreen_quality():
    items = json.loads((WEB / 'assets/art/catalog.json').read_text())
    pools = {'landscape': 0, 'portrait': 0}
    for item in items:
        width, height = jpeg_size(WEB / item['src'].lstrip('/'))
        assert (item['width'], item['height']) == (width, height)
        expected = 'landscape' if width > height else 'portrait' if height > width else 'square'
        assert item['orientation'] == expected
        if item.get('inRotation') is False:
            continue
        assert width <= item['sourceWidth'] and height <= item['sourceHeight'], 'Never upscale a small source'
        if item['orientation'] == 'landscape':
            assert width >= 3200 and height >= 1800 and width / height >= 1.1
        else:
            assert item['orientation'] == 'portrait'
            assert width >= 1600 and height >= 3000 and width / height <= .85
        pools[item['orientation']] += 1
    assert min(pools.values()) >= 5, 'Keep a varied selection for both screen shapes'
