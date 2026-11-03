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
chain with resume, PNG, PDF, and text downloads. `?` opens instructions and privacy
details. Controls turn blue on hover and keyboard focus.

PNG and PDF preserve the finished panel's fonts, colours, width, and line wrapping,
including content below its scroll area. The PDF embeds the same lossless pixels
as the PNG on one page, rather than reflowing text onto standard paper. Exports
run entirely in the browser using a vendored copy of html2canvas 1.4.1 (MIT;
license in `deblock/web/vendor/`). Very large documents show an explicit error
instead of silently clipping the chain; the text download remains available.

Writing stays in tab memory. Nothing is sent, logged, or stored automatically.
Download before refreshing or closing. The server exposes only explicitly listed
assets and the read-only exercise API. The original acceptance tests are unchanged.

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
```
