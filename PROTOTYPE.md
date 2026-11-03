# Run the deblock prototype

```sh
python3 -m deblock.server
```

Open http://127.0.0.1:8000. Use `--port 8001` for a separate preview. The local
server uses only Python's standard library; it is not a production server.

The interface is a single warm white page in Times New Roman. Whitespace commits
and clears the current word immediately; Enter also commits. Repeated whitespace
is ignored and pasted text is split into words. There is no theme switcher,
background animation, next-word hint, or submit button below the input.
`reset` asks before clearing the chain and unfinished word. `done` shows the whole
chain with resume and a `save` menu offering `to library`, `as PNG`, and `as PDF`. `?` opens
instructions and privacy details. Controls turn blue on hover and keyboard focus.

In the finished document, click the title to edit it. `arrows on/off` switches
between the association chain and continuous text without changing your words.
The title and formatting persist when you resume writing and apply to PNG and PDF
downloads. Reset restores the default title while keeping your arrow
preference for the next chain.

PNG and PDF preserve the finished panel's fonts, colours, width, and line wrapping,
including content below its scroll area. The PDF embeds the same lossless pixels
as the PNG on one page, rather than reflowing text onto standard paper. Exports
run entirely in the browser using a vendored copy of html2canvas 1.4.1 (MIT;
license in `deblock/web/vendor/`). Very large documents show an explicit error
instead of silently clipping the chain; you can select and copy the writing.

Draft writing stays in tab memory until an explicit save. Library entries, PNG
exports in Gallery, and profile details are stored in IndexedDB in this browser
on this origin (host and port). Nothing is sent or logged. Clearing browser data
removes local collections; download important work as a backup. Reset clears only
the current draft, not saved collections. Repeated library saves update the same
entry until reset starts a new one. The server exposes only explicitly listed
assets and the read-only exercise API. The original acceptance tests are unchanged.

## Profile, Library, and Gallery

The top-left menu follows the supplied sketch. Profile shows the local creation
(date joined) date and saved-entry count, and offers a name, optional email, and
two avatar choices. Click the avatar to choose a picture, then save the profile.
Email is only a local field, not an account credential. Password reset is visibly
unavailable because this prototype has no authentication or email service.
Library opens saved entries without replacing the current draft. Gallery holds
PNG exports and supports downloading them again. Failed storage writes display
an error; PNG downloads remain available if Gallery cannot save the image.

The avatar PNGs are extracted from the owner's blue-ink sketches using Pillow and
numpy, with paper/background removal and antialiased circular outlines. Rebuild
from the same source photograph using:

```sh
.venv/bin/python scripts/prepare_avatars.py /path/to/sketch.png
```

The crop masks are specific to that photograph. Runtime needs no art dependencies.

## Earlier visual experiments

The Python texture generator, its assets, and the handwriting font remain in the
repository as earlier experiments. The current interface does not load them.

## Tests

```sh
.venv/bin/python -m pip install -r requirements-dev.txt
source .venv/bin/activate
python -m pytest -q
```

The suite covers retrieval and the HTTP file boundary. Verify whitespace entry,
reset cancellation/confirmation, done/resume, exports, and narrow layouts in a
browser when changing the frontend. Export requires browser download permission.

Word-entry regression checks use only Node built-ins:

```sh
node tests/word_input_checks.cjs
node tests/reset_checks.cjs
node tests/export_checks.cjs
node tests/document_checks.cjs
node tests/collection_checks.cjs
```
