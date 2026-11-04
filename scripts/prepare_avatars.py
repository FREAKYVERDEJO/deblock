"""Render cleaned, hand-traced versions of the owner's three profile sketches.

Run: .venv/bin/python scripts/prepare_avatars.py
Requires Pillow only at asset-generation time, never at app runtime.

Coordinates trace the supplied drawings, rather than thresholding photographed
paper. This joins broken ink, omits the stray line beside the new right portrait,
and preserves the faces and hairstyles. Portrait 1 keeps its existing identity.
"""
from argparse import ArgumentParser
from math import sqrt
from pathlib import Path

from PIL import Image, ImageDraw

SIZE = 512
SCALE = 4
INK = '#34312c'
STROKE_WIDTH = 3 * SCALE
RADIUS = 248

# Each path is one continuous ink contour in a 512 × 512 drawing space.
# Separate eyes, brows and facial features intentionally stay separate.
PORTRAITS = [
    [
        # Ernesta: retain the original short, pointed hair silhouette.
        [(114,398),(120,345),(111,291),(100,246),(103,207),(117,164),(103,155),(123,153),(181,122),(229,96),(209,82),(238,93),(254,113),(283,90),(305,72),(299,95),(352,111),(404,137),(386,148),(401,181),(411,224),(421,260),(441,278),(418,285),(432,312),(431,329),(402,343),(400,366),(416,395),(381,382),(380,415),(348,410),(334,435)],
        [(114,398),(138,383),(149,416),(170,412),(166,434),(197,420),(197,442),(217,435)],
        [(257,153),(246,190),(224,227),(188,239),(169,256),(169,242),(159,267),(158,287),(143,278),(132,247),(135,215)],
        [(272,147),(295,173),(307,206),(315,232),(333,225),(347,238),(363,225),(377,230),(383,254),(380,277),(366,292),(354,282)],
        [(160,278),(172,321),(199,356),(237,380),(273,396),(300,379),(331,349),(346,323),(354,282)],
        [(184,252),(202,245),(220,242)],
        [(275,226),(291,216),(308,216)],
        [(244,269),(252,294),(256,309)],
        [(237,347),(260,349),(282,342),(302,329)],
        [(232,379),(240,410),(231,438),(218,448)],
        [(310,375),(311,411),(325,437),(337,442)],
        [(100,449),(158,453),(193,439),(218,448),(251,463),(287,461),(315,452),(337,442),(363,421),(412,449)],
    ],
    [
        # New left sketch: long straight hair and open smile.
        [(60,407),(83,343),(91,267),(96,205),(112,154),(146,111),(185,75),(230,58),(265,61),(302,55),(351,75),(384,103),(402,155),(415,243),(426,321),(442,406)],
        [(147,232),(132,233),(121,222),(115,200),(119,184),(132,185)],
        [(337,177),(351,155),(364,163),(365,182),(354,202),(350,219)],
        [(132,185),(148,162),(170,134),(199,99),(226,92),(252,105),(279,136),(307,161),(337,177)],
        [(132,185),(142,233),(156,269),(180,295),(211,310),(239,318),(261,328),(286,310),(310,291),(332,269),(339,236),(337,177)],
        [(157,184),(178,172),(202,169)],
        [(260,163),(281,159),(302,159)],
        [(235,188),(238,211),(242,233)],
        [(218,272),(250,259),(286,245),(285,276),(272,290),(248,290),(226,282),(218,272)],
        [(211,310),(213,335),(207,358),(184,375)],
        [(310,291),(302,329),(303,365),(318,379)],
        [(100,449),(132,415),(162,393),(184,375),(211,393),(258,409),(286,397),(318,379),(353,397),(389,420),(412,449)],
    ],
    [
        # New right sketch: continuous wavy hair; the detached stray line is omitted.
        [(103,414),(111,386),(105,355),(111,325),(117,292),(107,264),(97,242),(102,212),(117,181),(119,151),(128,124),(146,94),(169,67),(197,50),(222,48),(246,52),(273,46),(300,49),(329,62),(356,80),(373,100),(377,129),(388,161),(389,195),(395,225),(405,250),(402,280),(408,312),(422,338),(425,382)],
        [(163,129),(183,108),(211,82),(228,84),(242,81),(251,94),(268,100),(289,115),(295,139),(305,164),(312,190),(311,223),(324,246)],
        [(157,143),(149,165),(153,196),(164,238),(177,269),(200,290),(230,308),(251,319),(273,315),(303,292),(324,266),(324,246)],
        [(153,196),(146,176),(143,157)],
        [(168,166),(184,159),(205,160)],
        [(257,162),(277,159),(296,164)],
        [(233,189),(236,210),(239,226)],
        [(213,273),(223,277),(242,273),(258,275),(267,272)],
        [(338,218),(337,184),(347,181),(349,196)],
        [(230,308),(232,341),(224,366),(199,388)],
        [(324,246),(330,271),(324,302),(317,331),(320,365),(328,390),(326,426),(331,467)],
        [(100,449),(129,424),(165,407),(199,388),(216,408),(252,427),(283,416),(319,402)],
        [(425,382),(425,397),(402,392),(381,382),(377,397),(371,424)],
    ],
]
EYES = [
    [(201,276,11,12),(303,256,11,10)],
    [(194,202,8,10),(283,191,7,8)],
    [(187,196,10,11),(280,196,11,11)],
]


def curve(points: list[tuple[int, int]]) -> list[tuple[float, float]]:
    """Interpolate continuous contours with a restrained Catmull–Rom spline."""
    padded = [points[0], *points, points[-1]]
    result = []
    for i in range(1, len(padded) - 2):
        a, b, c, d = padded[i-1:i+3]
        for step in range(12):
            t = step / 12
            result.append(tuple(0.5 * (2*b[k] + (-a[k]+c[k])*t +
                (2*a[k]-5*b[k]+4*c[k]-d[k])*t*t +
                (-a[k]+3*b[k]-3*c[k]+d[k])*t*t*t) * SCALE for k in (0, 1)))
    result.append(tuple(v * SCALE for v in points[-1]))
    return result


def prepare(destination: Path) -> None:
    """Export three antialiased transparent PNGs with equal circular borders."""
    destination.mkdir(parents=True, exist_ok=True)
    for index, paths in enumerate(PORTRAITS, 1):
        art = Image.new('RGBA', (SIZE*SCALE, SIZE*SCALE))
        draw = ImageDraw.Draw(art)
        for points in paths:
            # Shoulder endpoints meet the circle precisely, without a floating bust.
            points = [(x, round(256 + sqrt(RADIUS**2 - (x-256)**2)))
                      if (x, y) in ((100,449), (412,449)) else (x,y) for x,y in points]
            draw.line(curve(points), fill=INK, width=STROKE_WIDTH, joint='curve')
        for x, y, rx, ry in EYES[index-1]:
            draw.ellipse(tuple(v*SCALE for v in (x-rx,y-ry,x+rx,y+ry)), outline=INK, width=STROKE_WIDTH)
        draw.ellipse((8*SCALE,8*SCALE,504*SCALE,504*SCALE), outline=INK, width=STROKE_WIDTH)
        art = art.resize((SIZE,SIZE), Image.Resampling.LANCZOS)
        if index == 2:
            art = art.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
        art.save(destination / f'portrait-{index}.png')


if __name__ == '__main__':
    parser = ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, default=Path('deblock/web/assets/avatars'))
    prepare(parser.parse_args().output)
