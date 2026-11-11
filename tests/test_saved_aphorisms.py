"""Bookmarks stay separate from writing and respect account and collection permissions."""
import secrets

import pytest
from allauth.account.models import EmailAddress
from django.test import Client

from deblock.backend.models import ResearchParticipant, SavedAphorism, User

pytestmark = pytest.mark.django_db


def account(email):
    user = User.objects.create_user(email, 'Fictional password 428!')
    EmailAddress.objects.create(user=user, email=email, verified=True, primary=True)
    client = Client()
    client.force_login(user, backend='allauth.account.auth_backends.AuthenticationBackend')
    return client, user


def test_bookmarks_are_idempotent_private_and_independent_of_writing():
    client, user = account('bookmark@example.test')
    other, _ = account('other@example.test')
    url = '/api/aphorisms/aotd-001/'
    assert Client().put(url, {}, content_type='application/json').status_code == 401
    assert client.put(url, {}, content_type='application/json', HTTP_X_ACCOUNT_ID='wrong').status_code == 409
    assert client.put(url, {}, content_type='application/json').status_code == 201
    assert client.put(url, {}, content_type='application/json').status_code == 200
    assert SavedAphorism.objects.filter(owner=user).count() == 1
    assert client.get('/api/aphorisms/').json()['items'][0]['id'] == 'aotd-001'
    assert other.get('/api/aphorisms/').json()['items'] == []
    assert other.delete(url).status_code == 204
    assert SavedAphorism.objects.filter(owner=user).exists()
    assert client.get('/api/entries/').json()['items'] == []
    assert client.put('/api/aphorisms/unknown/', {}, content_type='application/json').status_code == 400
    assert client.delete(url).status_code == 204
    assert client.delete(url).status_code == 204
    assert client.get('/api/aphorisms/').json()['items'] == []


def test_collection_requires_permission_valid_id_and_current_generation(settings):
    settings.RESEARCH_ENABLED = True
    client = Client()
    key = secrets.token_hex(32)
    def post(action, data):
        return client.post('/api/research/' + action + '/', data,
                           content_type='application/json', HTTP_X_RESEARCH_KEY=key)
    state = post('enroll', {'version': '3', 'generation': 0, 'scopes': ['writing']}).json()
    data = {'participant': state['id'], 'generation': state['generation'], 'id': 'aotd-001', 'saved': True}
    assert post('aphorism', data).status_code == 403
    state = post('accept', {'version': '3', 'generation': state['generation'], 'scopes': ['personalize']}).json()
    assert post('aphorism', data).status_code == 403
    data['generation'] = state['generation']
    assert post('aphorism', {**data, 'id': 'unknown'}).status_code == 400
    assert post('aphorism', {**data, 'saved': 'yes'}).status_code == 400
    for _ in range(2):
        assert post('aphorism', data).status_code == 200
    person = ResearchParticipant.objects.get(pk=state['id'])
    assert person.saved_aphorisms == ['aotd-001']
    assert post('aphorism', {**data, 'saved': False}).status_code == 200
    person.refresh_from_db()
    assert person.saved_aphorisms == []
    assert post('aphorism', data).status_code == 200
    state = post('consent', {'participant': state['id'], 'version': '3', 'generation': state['generation'], 'scopes': []}).json()
    person.refresh_from_db()
    assert person.saved_aphorisms == []
    assert post('aphorism', data).status_code == 403
    assert post('delete', {'participant': state['id']}).status_code == 200
    assert not ResearchParticipant.objects.filter(pk=state['id']).exists()
