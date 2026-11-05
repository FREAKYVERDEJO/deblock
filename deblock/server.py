"""Start the local writing app, including sign-in and guest writing.

Run from the repository root with ``python -m deblock.server``.
Use ``--browser-only`` for the legacy standard-library prototype without accounts.
"""

import argparse
import json
import os
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit

from deblock.exercises import get_exercise


WEB_ROOT = Path(__file__).with_name("web")
# Exact pseudo-element stylesheet injected by the pinned html2canvas 1.4.1.
# Keep inline scripts/styles blocked; data images are needed for its font metric probe.
EXPORT_STYLE_SOURCE = "'sha256-UP0QZg7irvSMvOBz9mH2PIIE28+57UiavRfeVea0l3g='"
ASSETS = {
    "/": ("index.html", "text/html; charset=utf-8"),
    "/style.css": ("style.css", "text/css; charset=utf-8"),
    "/app.js": ("app.js", "text/javascript; charset=utf-8"),
    "/writing-tools.js": ("writing-tools.js", "text/javascript; charset=utf-8"),
    "/modes.js": ("modes.js", "text/javascript; charset=utf-8"),
    "/poetry.js": ("poetry.js", "text/javascript; charset=utf-8"),
    "/art.js": ("art.js", "text/javascript; charset=utf-8"),
    "/assets/art/catalog.json": ("assets/art/catalog.json", "application/json; charset=utf-8"),
    "/storage.js": ("storage.js", "text/javascript; charset=utf-8"),
    "/account.js": ("account.js", "text/javascript; charset=utf-8"),
    "/shelf.js": ("shelf.js", "text/javascript; charset=utf-8"),
    "/assets/avatars/portrait-1.png": ("assets/avatars/portrait-1.png", "image/png"),
    "/assets/avatars/portrait-2.png": ("assets/avatars/portrait-2.png", "image/png"),
    "/assets/avatars/portrait-3.png": ("assets/avatars/portrait-3.png", "image/png"),
    "/export.js": ("export.js", "text/javascript; charset=utf-8"),
    "/vendor/html2canvas-1.4.1.min.js": ("vendor/html2canvas-1.4.1.min.js", "text/javascript; charset=utf-8"),
    "/vendor/html2canvas-LICENSE.txt": ("vendor/html2canvas-LICENSE.txt", "text/plain; charset=utf-8"),
    "/backdrop.js": ("backdrop.js", "text/javascript; charset=utf-8"),
    "/favicon.svg": ("favicon.svg", "image/svg+xml"),
    "/assets/ReenieBeanie.ttf": ("assets/ReenieBeanie.ttf", "font/ttf"),
    "/assets/OFL.txt": ("assets/OFL.txt", "text/plain; charset=utf-8"),
}
for artwork in json.loads((WEB_ROOT / "assets/art/catalog.json").read_text()):
    ASSETS[artwork["src"]] = (artwork["src"].removeprefix("/"), "image/jpeg")

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
            content = (WEB_ROOT / filename).read_bytes()
            if path == '/':
                # This explicitly account-free preview cannot serve sign-in routes.
                content = content.replace(b'id="guest-sign-in"', b'id="guest-sign-in" hidden')
            self._respond(200, content, content_type)
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
            f"default-src 'self'; script-src 'self'; style-src 'self' {EXPORT_STYLE_SOURCE}; "
            "img-src 'self' blob: data:; connect-src 'self'; object-src 'none'; "
            "base-uri 'none'; frame-ancestors 'none'; form-action 'none'"
        ))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, format: str, *args: object) -> None:
        """Do not record request URLs or writing in access logs."""


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--port", type=int, default=8000)
    parser.add_argument("--browser-only", action="store_true", help="Run the legacy preview without accounts or sign-in")
    args = parser.parse_args()
    if not args.browser_only:
        os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'deblock.backend.settings')
        os.environ.setdefault('DEBLOCK_ORIGIN', f'http://127.0.0.1:{args.port}')
        from django.core.management import execute_from_command_line
        execute_from_command_line(['deblock', 'runserver', f'127.0.0.1:{args.port}', '--noreload'])
        return
    with ThreadingHTTPServer(("127.0.0.1", args.port), PrototypeHandler) as server:
        print(f"deblock is ready at http://127.0.0.1:{server.server_port}", flush=True)
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            pass


if __name__ == "__main__":
    main()
