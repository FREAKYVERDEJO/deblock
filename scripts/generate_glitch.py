"""Generate abstract pixel-corruption textures; no reference image is read.

Run with .venv/bin/python scripts/generate_glitch.py. Pillow and NumPy are
build-time dependencies only. Small patches shift; the overall field stays still.
"""

import colorsys
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / 'deblock/web/assets'
WIDTH, HEIGHT = 320, 224
FRAMES, COLUMNS = 48, 8


def noise(rng: np.random.Generator, width: int, height: int) -> np.ndarray:
    """Upscale a small noise grid without smoothing its square pixels."""
    grid = Image.fromarray(rng.integers(0, 256, (height, width), dtype=np.uint8))
    return np.asarray(grid.resize((WIDTH, HEIGHT), Image.Resampling.NEAREST)) / 255


def build(seed: int) -> None:
    rng = np.random.default_rng(seed)
    y, x = np.mgrid[:HEIGHT, :WIDTH]
    coarse = noise(rng, 17, 13)
    medium = noise(rng, 65, 28)
    fine = noise(rng, 160, 112)
    # Stationary, torn horizontal regions: pixel geometry, never a liquid warp.
    field = coarse * .48 + medium * .32 + fine * .2
    shifts = rng.integers(-14, 15, HEIGHT // 4 + 1)
    field = np.take_along_axis(field, (x + shifts[y // 4]) % WIDTH, axis=1)
    hue = rng.random()
    palette = np.array([
        colorsys.hsv_to_rgb((hue + offset) % 1, .88, 1)
        for offset in (0, .18, .48, .69)
    ]) * 255
    indices = np.minimum((noise(rng, 23, 19) * 4).astype(int), 3)
    color = palette[indices]
    # Broken signal clusters; keep negative space around the writing field.
    energy = np.clip((field - .48) * 4, 0, 1)
    center = np.exp(-(((x / WIDTH - .5) / .26) ** 2 + ((y / HEIGHT - .40) / .26) ** 2))
    energy *= .9 - center * .7
    energy *= np.where(y % 3 == 0, .52, 1)
    base = np.array([3, 3, 8]) + color * energy[:, :, None] * .78
    # Sparse RGB line fragments evoke damaged video memory without scrolling it.
    for _ in range(90):
        row = int(rng.integers(0, HEIGHT))
        start = int(rng.integers(0, WIDTH - 8))
        length = int(rng.integers(3, 36))
        base[row, start:start + length] += palette[int(rng.integers(0, 4))] * .17
    base = np.clip(base, 0, 255)
    source = Image.fromarray(base.astype(np.uint8))
    name = f'signal-{seed}'
    source.save(OUTPUT / f'{name}-still.webp', lossless=True)
    # Small, independently phased patches shift by at most three native pixels.
    # Most of the field stays fixed: no full-screen translation or liquid sway.
    phase = noise(rng, 40, 28) * np.pi * 2
    active = noise(rng, 40, 28) > .82
    atlas = Image.new('RGB', (WIDTH * COLUMNS, HEIGHT * (FRAMES // COLUMNS)))
    for frame in range(FRAMES):
        angle = frame / FRAMES * np.pi * 2
        offset = np.rint(3 * np.sin(angle + phase) * active).astype(int)
        shifted = base[y, np.clip(x + offset, 0, WIDTH - 1)]
        modulation = 1 + .12 * np.sin(angle + phase) * active
        pixels = np.clip(shifted * modulation[:, :, None], 0, 255).astype(np.uint8)
        atlas.paste(Image.fromarray(pixels), ((frame % COLUMNS) * WIDTH, (frame // COLUMNS) * HEIGHT))
    atlas.save(OUTPUT / f'{name}-frames.webp', lossless=True, method=5)
    print(f'{name}: abstract {WIDTH}x{HEIGHT} pixels, 48 frames with localized pixel displacement', flush=True)


if __name__ == '__main__':
    OUTPUT.mkdir(parents=True, exist_ok=True)
    for seed in (11, 29, 47, 83):
        build(seed)
