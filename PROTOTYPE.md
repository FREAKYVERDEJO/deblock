# Run the deblock prototype

```sh
python3 -m deblock.server
```

Open http://127.0.0.1:8000. Use `--port 8001` for a separate preview. The local
server uses only Python's standard library; it is not a production server.

The interface follows the owner's sketch: abstract pixels fill the screen, a vertical
slider controls distortion, and a single handwritten word occupies the writing
space. Every whitespace commits the current word and clears the input immediately;
no previous-word layer is left behind. Enter and the return arrow also commit.
Repeated whitespace is ignored, and pasted text is split into words. The Theme
menu switches to a quiet, warm off-white page in Times New Roman. Switching themes
preserves the chain and unfinished input. `done` reveals the chain with resume
and text-download controls. `?` opens instructions and privacy details.

Writing stays in tab memory. Nothing is sent, logged, or stored automatically.
Download before refreshing or closing. The server exposes only explicitly listed
assets and the read-only exercise API. The original acceptance tests are unchanged.

## Python pixel effects

The attachments are style references only. The app does not load or display them.
The original supplied files remain in `assets/source/`, outside the served assets.
To rebuild the abstract textures:

```sh
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements-art.txt
.venv/bin/python scripts/generate_glitch.py
```

Python generates seeded random color palettes, square noise clusters, torn
horizontal fragments, and scanline texture at 320 × 224 pixels. The browser uses
nearest-neighbor scaling to preserve hard pixel edges. Four texture variants are
baked as lossless WebP sheets; the first is randomly selected and `colours`
shuffles to another variant.

Small, independently phased patches shift by at most three native pixels while
most of the field stays fixed. There is no full-screen swaying, zooming, or
scrolling. Each six-second loop has 48 frames, played at eight frames per second.
The distortion slider controls texture intensity. Motion can be paused;
reduced-motion preferences start static. Playback also pauses in the plain theme,
when the tab is hidden, or while a dialog is open. Image-building dependencies
are not needed to run the app with its baked assets.

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
keyboard entry, colour shuffling, slider adjustment, motion, and done/resume in a
browser when changing the frontend. Export requires browser download permission.

Word-entry regression checks use only Node built-ins:

```sh
node tests/word_input_checks.cjs
```
