"""Extract the owner's blue-ink portraits and replace their drawn circle borders.

Usage: python scripts/prepare_avatars.py path/to/sketch.png
Requires the existing Pillow/numpy art dependencies; not needed at app runtime.
"""
from argparse import ArgumentParser
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageOps

# Portrait-only masks exclude the photographed paper and the uneven pen circles.
PORTRAITS = [
    ((510, 410, 1040, 965), [(604,565),(710,501),(716,479),(757,496),(775,524),(830,476),(828,502),(941,549),(919,572),(977,711),(957,730),(977,760),(936,786),(948,831),(960,867),(908,846),(905,878),(955,892),(934,916),(840,949),(711,946),(649,929),(644,898),(689,894),(651,873),(644,859),(617,852),(624,818),(606,741),(605,661)]),
    ((490, 1025, 1055, 1630), [(546,1199),(610,1155),(655,1134),(692,1153),(725,1110),(779,1104),(817,1113),(842,1105),(859,1145),(928,1146),(953,1178),(938,1222),(969,1260),(948,1301),(966,1330),(946,1396),(950,1483),(951,1517),(944,1554),(887,1596),(794,1611),(730,1605),(655,1586),(581,1520),(546,1473),(563,1424),(546,1383),(561,1339),(554,1310),(565,1273)]),
]


def prepare(source: Path, destination: Path) -> None:
    """Preserve the sketched facial lines as dark ink on transparent circles."""
    photo = ImageOps.exif_transpose(Image.open(source)).convert('RGB')
    destination.mkdir(parents=True, exist_ok=True)
    for index, (box, polygon) in enumerate(PORTRAITS, 1):
        crop = photo.crop(box)
        rgb = np.asarray(crop, dtype=float)
        gray = np.asarray(ImageOps.grayscale(crop), dtype=float)
        background = np.asarray(ImageOps.grayscale(crop).filter(ImageFilter.GaussianBlur(8)), dtype=float)
        # Blue pen has both a local luminance edge and more blue than red.
        blue = rgb[:, :, 2] - rgb[:, :, 0]
        strength = np.clip((background - gray - 1) / 20, 0, 1) * np.clip((blue + 2) / 12, 0, 1)
        mask = Image.new('L', crop.size)
        ImageDraw.Draw(mask).polygon([(x-box[0], y-box[1]) for x,y in polygon], fill=255)
        mask = mask.filter(ImageFilter.MaxFilter(17))
        alpha = Image.fromarray((strength * np.asarray(mask)).astype('uint8'))
        alpha = alpha.filter(ImageFilter.MaxFilter(3)).resize((480,480), Image.Resampling.LANCZOS)
        yy, xx = np.ogrid[:480, :480]
        inside = (xx - 240)**2 + (yy - 240)**2 <= 220**2
        alpha = Image.fromarray(np.where(inside, np.asarray(alpha), 0).astype('uint8'))
        art = Image.new('RGBA', (512,512), (0,0,0,0))
        ink = Image.new('RGBA', (480,480), '#34312c')
        ink.putalpha(alpha)
        art.alpha_composite(ink, (16,16))
        # Supersampling gives a mathematically circular, antialiased outline.
        ring = Image.new('RGBA', (2048,2048))
        ImageDraw.Draw(ring).ellipse((28,28,2020,2020), outline='#34312c', width=12)
        art = Image.alpha_composite(art, ring.resize(art.size, Image.Resampling.LANCZOS))
        art.save(destination / f'portrait-{index}.png')


if __name__ == '__main__':
    parser = ArgumentParser(description=__doc__)
    parser.add_argument('source', type=Path)
    parser.add_argument('--output', type=Path, default=Path('deblock/web/assets/avatars'))
    args = parser.parse_args()
    prepare(args.source, args.output)
