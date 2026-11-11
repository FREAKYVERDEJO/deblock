"""Account forms keep CSRF protection behind Railway's HTTPS proxy."""
import re

import pytest
from allauth.account.models import EmailAddress
from django.core.cache import cache
from django.test import Client

from deblock.backend.models import User


HOST = 'deblock-production.up.railway.app'
ORIGIN = f'https://{HOST}'
PASSWORD = 'A distinct phrase with stars 482!'
pytestmark = pytest.mark.django_db


@pytest.fixture
def account_form(request, settings):
    settings.EMAIL_BACKEND = 'django.core.mail.backends.locmem.EmailBackend'
    cache.clear()
    if request.param == 'login':
        user = User.objects.create_user('writer@example.test', PASSWORD)
        EmailAddress.objects.create(user=user, email=user.email, primary=True, verified=True)
        payload = {'login': user.email, 'password': PASSWORD}
    else:
        payload = {'email': 'writer@example.test', 'password1': PASSWORD, 'password2': PASSWORD}
    client = Client(enforce_csrf_checks=True, HTTP_HOST=HOST)
    path = f'/accounts/{request.param}/'
    page = client.get(path)
    assert page.status_code == 200
    token = re.search(rb'name="csrfmiddlewaretoken" value="([^"]+)"', page.content).group(1).decode()
    return client, path, payload, token


@pytest.mark.parametrize('account_form', ['login', 'signup'], indirect=True)
def test_railway_https_forms_accept_valid_csrf(account_form):
    client, path, payload, token = account_form
    # Railway terminates TLS; Django can receive HTTP with an HTTPS Origin.
    response = client.post(path, {**payload, 'csrfmiddlewaretoken': token}, HTTP_ORIGIN=ORIGIN)
    assert response.status_code == 302
    if path == '/accounts/login/':
        assert client.get('/api/session/').status_code == 200
    else:
        assert User.objects.filter(email=payload['email']).exists()
        assert response.url == '/accounts/confirm-email/'


@pytest.mark.parametrize('account_form', ['login', 'signup'], indirect=True)
def test_railway_forms_still_require_csrf_token(account_form):
    client, path, payload, _ = account_form
    assert client.post(path, payload, HTTP_ORIGIN=ORIGIN).status_code == 403


@pytest.mark.parametrize('account_form', ['login', 'signup'], indirect=True)
def test_railway_forms_reject_foreign_origins(account_form):
    client, path, payload, token = account_form
    response = client.post(path, {**payload, 'csrfmiddlewaretoken': token},
                           HTTP_ORIGIN='https://attacker.up.railway.app')
    assert response.status_code == 403
