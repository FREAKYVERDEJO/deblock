# Run the deblock prototype

**Writing tools:** the dropdown now includes **Story Beats** directly above
Profile and **Free association** for switching back. Each mode keeps its own
draft in tab memory. Story outlines and passages are saved together in Library;
**continue writing** restores them. In a finished associative chain,
**highlight / blackout** lets you choose a poem from the existing words without
erasing the original. Selection and display style are saved with the entry and
shown in PNG/PDF exports. See [FEATURES.md](FEATURES.md).

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
instructions and a brief explanation of saving. Controls turn blue on hover and keyboard focus.

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

## Optional image prompts

The bottom `image off/on` control adds an image above the word. `another` cycles
through a shuffled deck of 23 reviewed CC0 artworks, with no repeat until the pool
is exhausted and no immediate repeat across deck boundaries. Three retired
sculpture images remain available for older saved documents but never enter the
shuffle. The religious selection uses painted icons, devotional paintings, and
calligraphy. Switching off keeps
the selection available for switching back on, without changing the words.
Hover over the image or focus/tap its info button for title, maker, date, cultural
context, museum, CC0 status, and the original object link.

Library saves preserve the selected image and its metadata with the text. Older
text-only entries remain supported. PNG/PDF exports include the full image above
the writing; info overlays are excluded. Export waits for image decoding and
reports missing images rather than silently omitting them. Gallery retains the
combined PNG and image credit metadata.

The bundled pool needs no external network access at runtime. Rights and source
records are in `deblock/web/assets/art/catalog.json` and its adjacent README.

## Profile, Library, and Gallery

The top-left menu follows the supplied sketch. Profile shows the local creation
(date joined) date and saved-entry count, and offers a name, optional email, and
three avatar choices. Click the avatar to choose a picture, then save the profile.
Email is only a local field, not an account credential. Password reset is visibly
unavailable because this prototype has no authentication or email service.
Library opens saved entries without replacing the current draft. Gallery holds
PNG exports and supports downloading them again. Failed storage writes display
an error; PNG downloads remain available if Gallery cannot save the image.

The avatar PNGs are traced from the owner's sketches using Python and Pillow.
Continuous contours remove photographed paper and stray marks; matching circular
borders meet each portrait's shoulders. Portrait 1 retains its existing profile ID.
Regenerate all three transparent PNGs with:

```sh
.venv/bin/python scripts/prepare_avatars.py
```

The tracing coordinates are included in the script. Runtime needs no art dependencies.

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
node tests/art_checks.cjs
```

## Blackout and story outline

Blackout opens as normal text. Drag across words to cover a range with black bars;
click or use Tab and Space/Enter to toggle a word. The question-mark help includes
restore all words. Save applies the blackout and uses the usual library save;
closing without saving discards only the pending blackout changes. Original words
remain intact, and PNG/PDF exports keep the saved blackout presentation. Existing
highlight entries still render, but reopening them in blackout uses black bars.

Story Beats uses upright text and a black caret. Each explicit outline line has a
decorative `>` in the gutter, including blank lines; wrapped continuations do not
get another marker. Markers never become part of typed, copied, or saved text.

`tests/blackout_outline_browser.cjs` checks this revised UI. The earlier
`writing_modes_browser.cjs` and `guest_browser.cjs` retain their historical
highlight-picker flows and do not describe the simplified blackout controls.
