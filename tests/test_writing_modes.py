"""R.11/R.12, CT.11/CT.12: structured writing survives the real account boundary."""
import copy
import uuid

import pytest
from allauth.account.models import EmailAddress
from django.core.cache import cache
from django.test import Client

from deblock.backend.models import User

pytestmark = pytest.mark.django_db


@pytest.fixture
def client():
    cache.clear()
    user = User.objects.create_user('story@example.test', 'Only fictional writing 428!')
    EmailAddress.objects.create(user=user, email=user.email, verified=True, primary=True)
    client = Client()
    client.force_login(user, backend='allauth.account.auth_backends.AuthenticationBackend')
    return client


def story():
    return {'version': 1, 'beats': [
        {'id': 'store', 'text': 'i go to the store'},
        {'id': 'stranger', 'text': 'i meet a mysterious stranger'},
        {'id': 'home', 'text': 'i go home'},
    ], 'passages': [
        {'from': 'store', 'to': 'stranger', 'words': ['The', 'bell'], 'draft': 'rings'},
        {'from': 'stranger', 'to': 'home', 'words': [], 'draft': '雨'},
    ], 'active': 1}


def entry(**extra):
    return {'title': 'Between the beats', 'words': ['rain', 'glass', 'sea'],
            'draft': '', 'arrows': False, 'artwork': None, **extra}


def test_story_roundtrip_and_legacy_edit_cannot_flatten_it(client):
    url = f'/api/entries/{uuid.uuid4()}/'
    response = client.put(url, entry(story=story()), content_type='application/json')
    assert response.status_code == 201
    assert response.json()['story'] == story()
    assert response.json()['words'] == ['The', 'bell', 'rings', '雨']
    assert response.json()['draft'] == ''
    assert client.get(url).json()['story'] == story()
    assert client.get('/api/entries/').json()['items'][0]['story'] == story()
    assert client.put(url, entry(revision=1), content_type='application/json').status_code == 400
    updated = story()
    updated['active'] = 0
    updated['passages'][0]['draft'] = 'ringing'
    assert client.put(url, entry(story=updated, revision=1), content_type='application/json').status_code == 200
    assert client.put(url, entry(story=story(), revision=1), content_type='application/json').status_code == 409
    assert client.get(url).json()['story'] == updated
    other = User.objects.create_user('other-story@example.test', 'Other fictional writing 492!')
    EmailAddress.objects.create(user=other, email=other.email, verified=True, primary=True)
    client.force_login(other, backend='allauth.account.auth_backends.AuthenticationBackend')
    assert client.get(url).status_code == 404


@pytest.mark.parametrize('change', [
    lambda s: s.update(version=2),
    lambda s: s.update(active=True),
    lambda s: s.update(active=2),
    lambda s: s['beats'][0].update(text=''),
    lambda s: s['beats'][0].update(text='bad\x00text'),
    lambda s: s['beats'][0].update(id='stranger'),
    lambda s: s['passages'].pop(),
    lambda s: s['passages'][0].update(to='home'),
    lambda s: s['passages'][0].update(words=[3]),
    lambda s: s['passages'][0].update(draft='a' * 250001),
])
def test_invalid_story_is_rejected_without_saving(client, change):
    value = copy.deepcopy(story())
    change(value)
    response = client.put(f'/api/entries/{uuid.uuid4()}/', entry(story=value), content_type='application/json')
    assert response.status_code == 400
    assert client.get('/api/entries/').json()['items'] == []


def test_poetry_roundtrip_and_plain_entry_compatibility(client):
    url = f'/api/entries/{uuid.uuid4()}/'
    selection = {'version': 1, 'style': 'blackout', 'kept': [0, 2]}
    response = client.put(url, entry(blackout=selection), content_type='application/json')
    assert response.status_code == 201
    assert response.json()['blackout'] == selection
    assert response.json()['words'] == ['rain', 'glass', 'sea']
    assert response.json()['story'] is None
    assert client.get(url).json()['blackout'] == selection
    response = client.put(url, entry(blackout=None, revision=1), content_type='application/json')
    assert response.status_code == 200
    assert response.json()['blackout'] is None


def test_character_blackout_roundtrip_includes_spaces(client):
    url = f'/api/entries/{uuid.uuid4()}/'
    selection = {'version': 2, 'style': 'blackout', 'covered': [0, 4, 5]}
    response = client.put(url, entry(blackout=selection), content_type='application/json')
    assert response.status_code == 201
    assert response.json()['blackout'] == selection
    assert client.get(url).json()['blackout'] == selection


@pytest.mark.parametrize('selection', [
    {'version': 1, 'style': 'blackout', 'kept': [3]},
    {'version': 1, 'style': 'blackout', 'kept': [True]},
    {'version': 1, 'style': 'blackout', 'kept': [0, 0]},
    {'version': 1, 'style': 'html', 'kept': [0]},
    {'version': True, 'style': 'highlight', 'kept': [0]},
    {'version': 2, 'style': 'blackout', 'covered': [14]},
    {'version': 2, 'style': 'blackout', 'covered': [True]},
    {'version': 2, 'style': 'blackout', 'covered': [4, 4]},
    {'version': 2, 'style': 'highlight', 'covered': [0]},
])
def test_invalid_poetry_selection_is_rejected(client, selection):
    response = client.put(f'/api/entries/{uuid.uuid4()}/', entry(blackout=selection), content_type='application/json')
    assert response.status_code == 400
