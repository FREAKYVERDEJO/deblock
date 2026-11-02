# Run the deblock prototype

From the repository root:

```sh
python3 -m deblock.server
```

Open http://127.0.0.1:8000. Use `--port 8001` if port 8000 is occupied.
Stop the local server with Ctrl+C. Python's standard library is the only runtime
dependency. This server is for local prototyping, not production hosting.

Type a word or phrase and press Enter (or the arrow button). Each new association
joins the chain and becomes the prompt for the next. Finish at any time, optionally
write a reflection, and download a text file. Resuming preserves the chain,
unfinished input, and reflection.

Writing remains in tab memory. It is not sent to the server, logged, or stored in
cookies or browser storage. Refreshing or closing loses it; download it first.
The server exposes only frontend assets and the read-only exercise endpoint.

The neon contours and horizontal distortion are drawn locally on a canvas. The
Motion button pauses the backdrop and scanner. Reduced-motion preferences default
to a static backdrop. No external fonts, analytics, or image services are used.

## Tests

```sh
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements-dev.txt
source .venv/bin/activate
python -m pytest -q
```

The human-written acceptance tests in `tests/test_exercises.py` remain unchanged.
Additional server tests verify exercise retrieval over HTTP and prevent serving
arbitrary repository files. UI checks are performed in the browser.
