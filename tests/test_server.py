"""Integration checks for the local prototype's narrow, read-only HTTP surface."""

import json
from collections.abc import Iterator
from http.client import HTTPConnection
from http.server import ThreadingHTTPServer
from threading import Thread

import pytest

from deblock.exercises import get_exercise
from deblock.server import PrototypeHandler


@pytest.fixture
def connection() -> Iterator[HTTPConnection]:
    server = ThreadingHTTPServer(("127.0.0.1", 0), PrototypeHandler)
    thread = Thread(target=server.serve_forever, daemon=True)
    thread.start()
    client = HTTPConnection(*server.server_address, timeout=5)
    try:
        yield client
    finally:
        client.close()
        server.shutdown()
        server.server_close()
        thread.join()


def test_api_uses_the_python_exercise(connection: HTTPConnection) -> None:
    connection.request("GET", "/api/exercises/free_association")
    response = connection.getresponse()
    assert response.status == 200
    assert json.loads(response.read()) == get_exercise("free_association")
    assert response.getheader("Cache-Control") == "no-store"


def test_unknown_exercise_has_clear_http_error(connection: HTTPConnection) -> None:
    connection.request("GET", "/api/exercises/missing")
    response = connection.getresponse()
    assert response.status == 404
    assert "Unknown exercise" in json.loads(response.read())["error"]


@pytest.mark.parametrize("path", ["/AGENTS.md", "/../spec.md", "/.git/config"])
def test_repository_files_are_not_served(connection: HTTPConnection, path: str) -> None:
    connection.request("GET", path)
    response = connection.getresponse()
    assert response.status == 404
    assert response.read() == b"Not found"
