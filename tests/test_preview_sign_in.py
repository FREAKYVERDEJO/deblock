"""The normal preview launcher must serve the same account routes as the app."""
import os
import socket
import subprocess
import sys
import time
from urllib.error import HTTPError, URLError
from urllib.request import urlopen

import pytest


@pytest.fixture
def preview(tmp_path):
    with socket.socket() as sock:
        sock.bind(('127.0.0.1', 0))
        port = sock.getsockname()[1]
    origin = f'http://127.0.0.1:{port}'
    env = {key: value for key, value in os.environ.items()
           if not key.startswith(('DEBLOCK_', 'DJANGO_', 'EMAIL_', 'DATABASE_URL', 'REDIS_URL'))}
    env.update(DEBLOCK_DATA_DIR=str(tmp_path), DEBLOCK_ENV='development')
    process = subprocess.Popen(
        [sys.executable, '-m', 'deblock.server', '--port', str(port)],
        env=env, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True,
    )
    try:
        deadline = time.monotonic() + 15
        while time.monotonic() < deadline:
            if process.poll() is not None:
                pytest.fail(process.stdout.read())
            try:
                with urlopen(origin, timeout=1):
                    break
            except (URLError, TimeoutError):
                time.sleep(.05)
        else:
            pytest.fail('Preview did not start within 15 seconds')
        yield origin
    finally:
        process.terminate()
        try:
            process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            process.kill()
            process.wait(timeout=5)
        process.stdout.close()


def test_default_preview_opens_sign_in_and_keeps_guest_storage(preview):
    try:
        response = urlopen(preview + '/accounts/login/', timeout=5)
    except HTTPError as error:
        pytest.fail(f'Sign-in returned HTTP {error.code} from the default preview launcher')
    with response:
        html = response.read().decode()
        assert response.status == 200
        assert 'name="login"' in html
        assert 'name="password"' in html
        assert 'csrfmiddlewaretoken' in html
        assert "form-action 'self'" in response.headers['Content-Security-Policy']
    with urlopen(preview, timeout=5) as response:
        html = response.read().decode()
        assert response.url == preview + '/guest/'
        assert 'src="/local-storage.js"' in html
        assert 'src="/guest.js"' in html
        assert 'href="/accounts/login/"' in html
    with urlopen(preview + '/storage.js', timeout=5) as response:
        assert b'accountMode: true' in response.read()
