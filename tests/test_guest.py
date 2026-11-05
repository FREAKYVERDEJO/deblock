"""R.13/CT.13: guest writing is public, account storage is not."""
import pytest
from allauth.account.models import EmailAddress
from django.test import Client

from deblock.backend.models import User


def test_sign_in_offers_guest_entry_and_local_storage():
    client = Client()
    login = client.get('/accounts/login/?next=/')
    assert b'Continue without signing in' in login.content
    assert b'href="/guest/"' in login.content
    page = client.get('/guest/')
    assert page.status_code == 200
    assert b'src="/local-storage.js"' in page.content
    assert b'src="/guest.js"' in page.content
    assert b'src="/storage.js"' not in page.content
    assert b'src="/account.js"' not in page.content
    assert b'id="open-story"' in page.content
    assert b'id="open-poetry"' in page.content
    assert b'indexedDB.open' in client.get('/local-storage.js').content
    assert client.get('/guest.js').status_code == 200
    assert page['Cache-Control'] == 'no-store'


def test_guest_entry_does_not_unlock_account_apis():
    client = Client()
    assert client.get('/guest/').status_code == 200
    assert client.get('/').status_code == 302
    for url in ['/api/session/', '/api/profile/', '/api/entries/', '/api/images/']:
        assert client.get(url).status_code == 401
    assert client.put('/api/profile/', {'name': 'Guest'}, content_type='application/json').status_code == 401


@pytest.mark.django_db
def test_guest_choice_does_not_sign_out_an_existing_account():
    user = User.objects.create_user('guest-boundary@example.test', 'Fictional boundary password 421!')
    EmailAddress.objects.create(user=user, email=user.email, verified=True, primary=True)
    client = Client()
    client.force_login(user, backend='allauth.account.auth_backends.AuthenticationBackend')
    account_id = client.get('/api/session/').json()['profile']['accountId']
    assert b'src="/local-storage.js"' in client.get('/guest/').content
    assert client.get('/api/session/').json()['profile']['accountId'] == account_id
    assert b'src="/storage.js"' in client.get('/').content
