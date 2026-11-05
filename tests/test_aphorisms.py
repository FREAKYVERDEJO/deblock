"""Daily prompts and writing survive guest and account boundaries."""
import json
import uuid

import pytest
from allauth.account.models import EmailAddress
from django.test import Client

from deblock.backend.models import User
from deblock.server import WEB_ROOT, ASSETS


def test_curated_source_is_served_intact():
    path, mime = ASSETS['/assets/deblock_aotd_100_curated.json']
    catalog = json.loads((WEB_ROOT / path).read_text())
    assert mime.startswith('application/json')
    assert len(catalog['items']) == catalog['count'] == 100
    assert len({item['id'] for item in catalog['items']}) == 100
    assert all(item['text'] and item['author'] and item['work'] for item in catalog['items'])


@pytest.fixture
def client(db):
    user = User.objects.create_user('aphorism@example.test', 'Fictional password 428!')
    EmailAddress.objects.create(user=user, email=user.email, verified=True, primary=True)
    client = Client()
    client.force_login(user, backend='allauth.account.auth_backends.AuthenticationBackend')
    return client


def entry(**changes):
    return {'title': 'A response', 'words': ['rain  falls\n\nsoftly.  '], 'draft': 'sea',
            'arrows': False, 'artwork': None,
            'aphorism': {'version': 1, 'id': 'aotd-001', 'mode': 'text'}, **changes}


def test_aphorism_roundtrip_preserves_prompt_mode_and_spacing(client):
    url = f'/api/entries/{uuid.uuid4()}/'
    original = entry()
    response = client.put(url, original, content_type='application/json')
    assert response.status_code == 201
    assert response.json()['aphorism'] == original['aphorism']
    assert client.get(url).json()['words'] == original['words']
    assert client.get('/api/entries/').json()['items'][0]['aphorism'] == original['aphorism']
    original['aphorism']['mode'] = 'word'
    response = client.put(url, {**original, 'revision': 1}, content_type='application/json')
    assert response.status_code == 200
    assert response.json()['aphorism']['mode'] == 'word'
    assert response.json()['draft'] == 'sea'
    # Older editors must not silently strip the prompt.
    assert client.put(url, entry(aphorism=None, revision=2), content_type='application/json').status_code == 400


@pytest.mark.parametrize('aphorism', [
    {'version': 1, 'id': 'missing', 'mode': 'word'},
    {'version': True, 'id': 'aotd-001', 'mode': 'word'},
    {'version': 1, 'id': 'aotd-001', 'mode': 'image'},
    'aotd-001',
])
def test_invalid_aphorism_is_rejected(client, aphorism):
    assert client.put(f'/api/entries/{uuid.uuid4()}/', entry(aphorism=aphorism),
                      content_type='application/json').status_code == 400
    assert client.get('/api/entries/').json()['items'] == []



def test_aphorism_cannot_attach_an_image_or_poetry(client):
    for changes in [
        {'artwork': {'id': 'any-image'}},
        {'blackout': {'version': 1, 'style': 'blackout', 'kept': []}},
    ]:
        response = client.put(f'/api/entries/{uuid.uuid4()}/', entry(**changes), content_type='application/json')
        assert response.status_code == 400
    assert client.get('/api/entries/').json()['items'] == []


def test_guest_can_read_catalog_and_script():
    client = Client()
    for url in ['/assets/deblock_aotd_100_curated.json', '/aphorisms.js']:
        assert client.get(url).status_code == 200
