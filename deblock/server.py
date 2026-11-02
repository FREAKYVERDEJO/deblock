"""Serve the local writing prototype with no third-party runtime dependencies.

Run from the repository root with ``python -m deblock.server``.
Only the exercise API and explicitly listed frontend assets are served.
"""

import argparse
import json
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit

from deblock.exercises import get_exercise


WEB_ROOT = Path(__file__).with_name("web")
ASSETS = {
    "/": ("index.html", "text/html; charset=utf-8"),
    "/style.css": ("style.css", "text/css; charset=utf-8"),
    "/app.js": ("app.js", "text/javascript; charset=utf-8"),
    "/backdrop.js": ("backdrop.js", "text/javascript; charset=utf-8"),
    "/favicon.svg": ("favicon.svg", "image/svg+xml"),
    "/assets/ReenieBeanie.ttf": ("assets/ReenieBeanie.ttf", "font/ttf"),
    "/assets/OFL.txt": ("assets/OFL.txt", "text/plain; charset=utf-8"),
}
for name in ("signal-11", "signal-29", "signal-47", "signal-83"):
    for variant in ("still", "frames"):
        filename = f"assets/{name}-{variant}.webp"
        ASSETS[f"/{filename}"] = (filename, "image/webp")


class PrototypeHandler(BaseHTTPRequestHandler):
    """Read-only endpoints; writing is never sent to this server."""

    def do_GET(self) -> None:
        path = urlsplit(self.path).path
        if path.startswith("/api/exercises/"):
            try:
                exercise = get_exercise(path.removeprefix("/api/exercises/"))
            except ValueError as error:
                self._respond(404, json.dumps({"error": str(error)}).encode(),
                              "application/json; charset=utf-8")
            else:
                self._respond(200, json.dumps(exercise).encode(),
                              "application/json; charset=utf-8")
        elif path in ASSETS:
            filename, content_type = ASSETS[path]
            self._respond(200, (WEB_ROOT / filename).read_bytes(), content_type)
        else:
            self._respond(404, b"Not found", "text/plain; charset=utf-8")

    def _respond(self, status: int, body: bytes, content_type: str) -> None:
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "no-referrer")
        self.send_header("Content-Security-Policy", (
            "default-src 'self'; script-src 'self'; style-src 'self'; "
            "img-src 'self'; connect-src 'self'; object-src 'none'; "
            "base-uri 'none'; frame-ancestors 'none'; form-action 'none'"
        ))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, format: str, *args: object) -> None:
        """Do not record request URLs or writing in access logs."""


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--port", type=int, default=8000)
    args = parser.parse_args()
    with ThreadingHTTPServer(("127.0.0.1", args.port), PrototypeHandler) as server:
        print(f"deblock is ready at http://127.0.0.1:{server.server_port}", flush=True)
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            pass


if __name__ == "__main__":
    main()
