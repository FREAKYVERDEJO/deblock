"""Exercise real allauth forms, verification/reset tokens, CSRF, and sessions."""
import re
from urllib.parse import urlsplit

import pytest
from allauth.account.models import EmailAddress
from django.core import mail
from django.core.cache import cache
from django.test import Client

from deblock.backend.models import User

pytestmark = pytest.mark.django_db
PASSWORD = 'A distinct phrase with stars 482!'
NEW_PASSWORD = 'Another distinct phrase with stars 573!'


@pytest.fixture(autouse=True)
def mail_and_limits(settings):
    settings.EMAIL_BACKEND = 'django.core.mail.backends.locmem.EmailBackend'
    cache.clear()


def verified_user():
    user = User.objects.create_user('writer@example.test', PASSWORD)
    EmailAddress.objects.create(user=user, email=user.email, primary=True, verified=True)
    return user


def mail_path(fragment):
    for message in reversed(mail.outbox):
        for url in re.findall(r'https?://[^\s<>]+', message.body):
            if fragment in url:
                assert url.startswith('http://127.0.0.1:8003/')
                return urlsplit(url).path
    raise AssertionError('Expected account email was not sent')


def test_signup_verification_login_logout():
    client = Client()
    response = client.post('/accounts/signup/', {'email': 'writer@example.test', 'password1': PASSWORD, 'password2': PASSWORD})
    assert response.status_code == 302
    user = User.objects.get(email='writer@example.test')
    assert user.password.startswith('argon2$') and user.check_password(PASSWORD)
    assert client.get('/api/entries/').status_code == 401
    verify = mail_path('/confirm-email/')
    assert client.get(verify).status_code == 200
    assert not EmailAddress.objects.get(user=user).verified
    assert client.post(verify).status_code == 302
    assert EmailAddress.objects.get(user=user).verified
    assert client.post('/accounts/login/', {'login': user.email, 'password': PASSWORD}).status_code == 302
    assert client.get('/api/entries/').status_code == 200
    assert client.post('/accounts/logout/').status_code == 302
    assert client.get('/api/entries/').status_code == 401


def test_password_reset_invalidates_sessions_and_token():
    user = verified_user()
    signed_in = Client()
    signed_in.force_login(user, backend='allauth.account.auth_backends.AuthenticationBackend')
    client = Client()
    assert client.post('/accounts/password/reset/', {'email': user.email}).status_code == 302
    path = mail_path('/password/reset/key/')
    redirect = client.get(path)
    assert redirect.status_code == 302
    response = client.post(redirect.url, {'password1': NEW_PASSWORD, 'password2': NEW_PASSWORD})
    assert response.status_code == 302
    user.refresh_from_db()
    assert user.check_password(NEW_PASSWORD)
    assert signed_in.get('/api/entries/').status_code == 401
    invalid = Client().get(path, follow=True)
    assert b'invalid' in invalid.content.lower() or b'used' in invalid.content.lower()


def test_login_csrf_open_redirect_and_session_rotation():
    user = verified_user(); client = Client(enforce_csrf_checks=True)
    assert client.post('/accounts/login/', {'login': user.email, 'password': PASSWORD}).status_code == 403
    page = client.get('/accounts/login/')
    token = re.search(rb'name="csrfmiddlewaretoken" value="([^"]+)"', page.content).group(1).decode()
    session = client.session; session['before_login'] = True; session.save()
    old_key = client.session.session_key
    response = client.post('/accounts/login/?next=https://evil.example/', {'login': user.email, 'password': PASSWORD, 'csrfmiddlewaretoken': token})
    assert response.status_code == 302 and response.url == '/'
    assert client.session.session_key != old_key
    assert response.cookies['deblock-session']['httponly']
    assert response.cookies['deblock-session']['samesite'] == 'Lax'


def test_login_rate_limit_and_generic_reset_response():
    user = verified_user(); client = Client()
    codes = [client.post('/accounts/login/', {'login': user.email, 'password': 'wrong'}).status_code for _ in range(8)]
    assert 429 in codes
    cache.clear()
    known = client.post('/accounts/password/reset/', {'email': user.email})
    unknown = client.post('/accounts/password/reset/', {'email': 'unknown@example.test'})
    assert known.status_code == unknown.status_code == 302 and known.url == unknown.url


def test_weak_password_is_rejected():
    response = Client().post('/accounts/signup/', {'email': 'writer@example.test', 'password1': 'password', 'password2': 'password'})
    assert response.status_code == 200
    assert not User.objects.exists()
