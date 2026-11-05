"""Account boundary regression tests; original acceptance tests are untouched."""
import io
import uuid

import pytest
from allauth.account.models import EmailAddress
from django.core.cache import cache
from django.test import Client
from django.core.files.uploadedfile import SimpleUploadedFile
from PIL import Image

from deblock.backend.models import Entry, GalleryImage, User

pytestmark = pytest.mark.django_db


@pytest.fixture(autouse=True)
def isolated_limits(settings):
    cache.clear()
    settings.EMAIL_BACKEND = 'django.core.mail.backends.locmem.EmailBackend'


@pytest.fixture
def users():
    result = []
    for name in ['alice', 'bob']:
        user = User.objects.create_user(f'{name}@example.test', 'A long unique password 937!')
        EmailAddress.objects.create(user=user, email=user.email, verified=True, primary=True)
        result.append(user)
    return result


def signed_in(user, csrf=False):
    client = Client(enforce_csrf_checks=csrf)
    client.force_login(user, backend='allauth.account.auth_backends.AuthenticationBackend')
    return client


def payload(**extra):
    return {'title': 'A small beginning', 'words': ['moon', '<script>alert(1)</script>'],
            'draft': 'tide', 'arrows': True, 'artwork': None, **extra}


def png():
    buffer = io.BytesIO()
    Image.new('RGB', (8, 8), 'white').save(buffer, format='PNG')
    return SimpleUploadedFile('entry.png', buffer.getvalue(), content_type='image/png')


def test_anonymous_and_unverified_users_cannot_access_records(users):
    assert Client().get('/api/entries/').status_code == 401
    EmailAddress.objects.filter(user=users[0]).update(verified=False)
    assert signed_in(users[0]).get('/api/entries/').status_code == 403


def test_entry_roundtrip_isolated_and_delete(users):
    alice, bob = map(signed_in, users)
    key = uuid.uuid4()
    response = alice.put(f'/api/entries/{key}/', payload(), content_type='application/json')
    assert response.status_code == 201
    assert response.json()['words'] == payload()['words']
    assert bob.get('/api/entries/').json()['items'] == []
    assert bob.get(f'/api/entries/{key}/').status_code == 404
    assert bob.put(f'/api/entries/{key}/', payload(), content_type='application/json').status_code == 404
    assert bob.delete(f'/api/entries/{key}/').status_code == 404
    assert Entry.objects.get(pk=key).owner == users[0]
    assert alice.delete(f'/api/entries/{key}/').status_code == 204
    assert not Entry.objects.filter(pk=key).exists()


def test_updates_reject_stale_revision_and_untrusted_artwork(users):
    client = signed_in(users[0]); key = uuid.uuid4(); url = f'/api/entries/{key}/'
    assert client.put(url, payload(), content_type='application/json').status_code == 201
    assert client.put(url, payload(revision=1, title='Changed'), content_type='application/json').status_code == 200
    assert client.put(url, payload(revision=1), content_type='application/json').status_code == 409
    assert Entry.objects.get(pk=key).title == 'Changed'
    assert client.put(url, payload(revision=2, artwork={'id': 'https://evil.test/x'}), content_type='application/json').status_code == 400


def test_csrf_and_cross_account_tab_checks(users):
    client = signed_in(users[0], csrf=True)
    url = f'/api/entries/{uuid.uuid4()}/'
    assert client.put(url, payload(), content_type='application/json').status_code == 403
    token = client.get('/api/session/').json()['csrfToken']
    assert client.put(url, payload(), content_type='application/json', HTTP_X_CSRFTOKEN=token,
                      HTTP_ORIGIN='https://evil.test').status_code == 403
    assert client.put(url, payload(), content_type='application/json', HTTP_X_CSRFTOKEN=token,
                      HTTP_X_ACCOUNT_ID=str(users[1].pk)).status_code == 409
    assert client.put(url, payload(), content_type='application/json', HTTP_X_CSRFTOKEN=token,
                      HTTP_X_ACCOUNT_ID=str(users[0].pk)).status_code == 201


def test_gallery_is_private_and_only_accepts_decodable_png(users):
    alice, bob = map(signed_in, users)
    response = alice.post('/api/images/', {'id': uuid.uuid4(), 'title': 'Sample', 'image': png()})
    assert response.status_code == 201
    item = response.json(); url = item['url']
    assert alice.get(url).status_code == 200
    assert alice.get(url)['Content-Type'] == 'image/png'
    assert bob.get(url).status_code == 404
    assert Client().get(url).status_code == 401
    assert bob.delete(f"/api/images/{item['id']}/").status_code == 404
    assert alice.post('/api/images/', {'id': uuid.uuid4(), 'image': SimpleUploadedFile('bad.png', b'<svg/>', content_type='image/png')}).status_code == 400
    assert alice.delete(f"/api/images/{item['id']}/").status_code == 204
    assert GalleryImage.objects.count() == 0


def test_profile_cannot_change_owner_email_or_join_date(users):
    client = signed_in(users[0])
    response = client.put('/api/profile/', {'name': '<b>Writer</b>', 'avatar': '3', 'email': users[1].email,
        'joinedAt': '1900-01-01', 'id': users[1].pk}, content_type='application/json')
    assert response.status_code == 200
    users[0].refresh_from_db()
    assert users[0].email == 'alice@example.test'
    assert users[0].name == '<b>Writer</b>' and users[0].avatar == '3'
    assert client.put('/api/profile/', {'name': '', 'avatar': '99'}, content_type='application/json').status_code == 400


def test_limits_bad_json_and_security_headers(users, settings):
    client = signed_in(users[0]); settings.MAX_ENTRIES = 1
    assert client.put(f'/api/entries/{uuid.uuid4()}/', payload(), content_type='application/json').status_code == 201
    assert client.put(f'/api/entries/{uuid.uuid4()}/', payload(), content_type='application/json').status_code == 409
    assert client.put('/api/profile/', 'broken', content_type='application/json').status_code == 400
    response = client.get('/api/profile/')
    assert response['Cache-Control'] == 'no-store'
    assert response['X-Content-Type-Options'] == 'nosniff'
    assert response['X-Frame-Options'] == 'DENY'
    assert "frame-ancestors 'none'" in response['Content-Security-Policy']


def test_private_files_are_never_static():
    for path in ['/var/deblock.sqlite3', '/.env', '/AGENTS.md', '/.git/config']:
        assert Client().get(path).status_code == 404


def test_account_deletion_requires_password_and_cascades_only_owned_records(users):
    alice, bob = users
    client = signed_in(alice)
    mine = Entry.objects.create(owner=alice, title='Mine')
    theirs = Entry.objects.create(owner=bob, title='Theirs')
    GalleryImage.objects.create(owner=alice, png=b'png', size=3)
    assert client.delete('/api/account/', {'password': 'incorrect'}, content_type='application/json').status_code == 403
    assert User.objects.filter(pk=alice.pk).exists()
    assert client.delete('/api/account/', {'password': 'A long unique password 937!'}, content_type='application/json').status_code == 204
    assert not Entry.objects.filter(pk=mine.pk).exists()
    assert not GalleryImage.objects.filter(owner_id=alice.pk).exists()
    assert Entry.objects.filter(pk=theirs.pk).exists()
    assert client.get('/api/entries/').status_code == 401


def test_malformed_profile_upload_quota_and_delete_rate_limit(users, settings):
    client = signed_in(users[0])
    assert client.put('/api/profile/', {'avatar': {}}, content_type='application/json').status_code == 400
    settings.MAX_GALLERY_IMAGES = 0
    assert client.post('/api/images/', {'id': uuid.uuid4(), 'image': png()}).status_code == 409
    assert GalleryImage.objects.count() == 0
    for _ in range(5):
        assert client.delete('/api/account/', {'password': 'wrong'}, content_type='application/json').status_code == 403
    assert client.delete('/api/account/', {'password': 'wrong'}, content_type='application/json').status_code == 429


def test_paginated_entries_and_account_ui(users):
    client = signed_in(users[0])
    Entry.objects.bulk_create([Entry(owner=users[0], title=str(index)) for index in range(52)])
    first = client.get('/api/entries/').json()
    second = client.get('/api/entries/?page=2').json()
    assert len(first['items']) == 50 and first['nextPage'] == 2
    assert len(second['items']) == 2 and second['nextPage'] is None
    assert set(item['id'] for item in first['items']).isdisjoint(item['id'] for item in second['items'])
    assert client.get('/api/entries/?page=bad').status_code == 400
    assert b'accountMode: true' in client.get('/storage.js').content
    assert b'account.js' in client.get('/').content
    assert client.get('/')['Referrer-Policy'] == 'same-origin'
    assert Client().get('/').status_code == 302
