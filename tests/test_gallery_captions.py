"""Gallery captions survive account saves and remain private."""
import uuid

import pytest
from django.test import Client

from tests.test_accounts import isolated_limits, png, signed_in, users

pytestmark = pytest.mark.django_db


def test_caption_round_trip_is_private(users):
    owner = signed_in(users[0])
    caption = 'Moonlight over water\n<script>literal words</script>'
    response = owner.post('/api/images/', {
        'id': uuid.uuid4(), 'title': 'Untitled', 'caption': caption, 'image': png(),
    })
    assert response.status_code == 201
    item = response.json()
    assert item['caption'] == caption
    assert owner.get('/api/images/').json()['items'][0]['caption'] == caption
    assert signed_in(users[1]).get('/api/images/').json()['items'] == []
    assert Client().get('/api/images/').status_code == 401


def test_caption_length_is_validated(users):
    response = signed_in(users[0]).post('/api/images/', {
        'id': uuid.uuid4(), 'caption': 'x' * 250001, 'image': png(),
    })
    assert response.status_code == 400
    assert 'Caption' in response.json()['error']


def test_older_gallery_uploads_need_no_caption(users):
    response = signed_in(users[0]).post('/api/images/', {'id': uuid.uuid4(), 'image': png()})
    assert response.status_code == 201
    assert response.json()['caption'] == ''
