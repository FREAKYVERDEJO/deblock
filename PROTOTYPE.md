# Run the deblock prototype

```sh
python3 -m deblock.server
```

Open http://127.0.0.1:8000. Use `--port 8001` for a separate preview. The local
server uses only Python's standard library; it is not a production server.

The interface follows the owner's sketch: an image fills the screen, a vertical
slider controls distortion, and a single handwritten word occupies the writing
space. Type the next association to gradually scribble over and fade the previous
word, then press Enter or the return arrow. `done` reveals the chain with resume
and text-download controls. `?` opens instructions and privacy details.

Writing stays in tab memory. Nothing is sent, logged, or stored automatically.
Download before refreshing or closing. The server exposes only explicitly listed
assets and the read-only exercise API. The original acceptance tests are unchanged.

## Python image effects

Both source artworks supplied by the owner are in `assets/source/`. The sketch is
layout reference, not a background. To rebuild the image effects:

```sh
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements-art.txt
.venv/bin/python scripts/distort_images.py
```

The Python script uses Pillow and NumPy to displace source pixels, separate color
channels, add scanlines, and sweep a scanner/tear band back and forth. Each image
produces a still, a poster, and a WebP sprite sheet with 48 frames. The browser
plays these pre-rendered frames at 12 fps; it does not synthesize the distortion.
The slider blends between the original and distorted image. `01 / 02` switches
between the two artworks. Motion can be paused; reduced-motion preferences start
with a static frame, and playback pauses when the tab is hidden or a dialog opens.
Image-building dependencies are not needed to run the app with the baked assets.

The locally served Reenie Beanie handwriting font is from Google Fonts, by James
Grieshaber, under the SIL Open Font License. Its license is included in
`deblock/web/assets/OFL.txt`. No external fonts or assets are requested at runtime.

## Tests

```sh
.venv/bin/python -m pip install -r requirements-dev.txt
source .venv/bin/activate
python -m pytest -q
```

The suite covers retrieval and the HTTP file boundary. Verify word replacement,
keyboard entry, image switching, slider adjustment, motion, and done/resume in a
browser when changing the frontend. Export requires browser download permission.
