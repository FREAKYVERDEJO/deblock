"""Bake looping CRT distortion from the owner's artwork into local sprite sheets.

Run: .venv/bin/python scripts/distort_images.py
Requires requirements-art.txt only when rebuilding; the app serves the results.
"""

from pathlib import Path
import math

import numpy as np
from PIL import Image, ImageOps


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "deblock/web/assets"
WIDTH, HEIGHT = 768, 536
FRAMES, COLUMNS = 48, 8


def distort(source: np.ndarray, phase: float) -> Image.Image:
    """Displace actual image pixels with a seamless, four-second oscillation."""
    y, x = np.mgrid[:HEIGHT, :WIDTH]
    sweep = (math.sin(phase) * .5 + .5) * HEIGHT
    band = np.exp(-((y - sweep) / 42) ** 2)
    shift = (
        25 * np.sin(y / 93 + phase)
        + 12 * np.sin(y / 17 - phase * 2)
        + 4 * np.sin(y / 3 + phase * 3)
        + band * 46 * np.sin(phase + y / 9)
    )

    # Mirror edges rather than wrapping unrelated pixels onto the other side.
    def mirrored(indices: np.ndarray, size: int) -> np.ndarray:
        folded = np.mod(indices, 2 * (size - 1))
        return np.minimum(folded, 2 * (size - 1) - folded).astype(int)

    sy = mirrored(np.rint(y + 5 * np.sin(x / 115 + phase)), HEIGHT)
    result = np.empty_like(source, dtype=np.float32)
    for channel, separation in enumerate((-7, 0, 9)):
        sx = mirrored(np.rint(x + shift + separation * (.6 + band)), WIDTH)
        result[:, :, channel] = source[sy, sx, channel]

    # CRT lines and a broad scanner. Modest luminance changes avoid flashing.
    scanlines = np.where(y % 4 == 0, .62, np.where(y % 4 == 1, .88, 1))
    result *= scanlines[:, :, None]
    result += band[:, :, None] * np.array([8, 9, 17])
    result += (np.sin(x * 1.71 + y * 2.31 + phase * 2) * 3)[:, :, None]
    return Image.fromarray(np.clip(result, 0, 255).astype(np.uint8))


def build(name: str) -> None:
    with Image.open(ROOT / "assets/source" / f"{name}.png") as image:
        base = ImageOps.fit(image.convert("RGB"), (WIDTH, HEIGHT),
                            method=Image.Resampling.LANCZOS, centering=(.5, .45))
    base.save(OUTPUT / f"{name}-still.webp", quality=88)
    source = np.asarray(base)
    atlas = Image.new("RGB", (WIDTH * COLUMNS, HEIGHT * (FRAMES // COLUMNS)))
    for frame in range(FRAMES):
        rendered = distort(source, frame / FRAMES * math.tau)
        atlas.paste(rendered, ((frame % COLUMNS) * WIDTH, (frame // COLUMNS) * HEIGHT))
        if frame == 0:
            rendered.save(OUTPUT / f"{name}-poster.webp", quality=88)
    target = OUTPUT / f"{name}-frames.webp"
    atlas.save(target, quality=76, method=5)
    print(f"{target.relative_to(ROOT)}: {target.stat().st_size / 1024**2:.1f} MiB", flush=True)


if __name__ == "__main__":
    OUTPUT.mkdir(parents=True, exist_ok=True)
    for name in ("neon", "blue"):
        build(name)
