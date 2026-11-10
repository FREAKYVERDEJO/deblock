"""Synthetic research submissions through the same HTTP routes used by the writer."""
import secrets
import uuid

import pytest
from django.core.cache import cache
from django.db import connection
from django.test import Client

from deblock.backend.models import ResearchBehavior, ResearchConsent, ResearchParticipant, ResearchSession, ResearchWriting

pytestmark = pytest.mark.django_db(transaction=True)


@pytest.fixture
def api(settings):
    settings.RESEARCH_ENABLED = True
    cache.clear()
    client = Client()
    secret = secrets.token_hex(32)

    participant_id = None

    def post(path, data, key=secret):
        nonlocal participant_id
        response = client.post(f'/api/research/{path}/', {'participant': participant_id, **data}, content_type='application/json', HTTP_X_RESEARCH_KEY=key)
        if path == 'enroll' and response.status_code == 200:
            participant_id = response.json()['id']
        return response
    return post


def consent(api, scopes, generation=0):
    return api('consent' if generation else 'enroll', {'scopes': scopes, 'generation': generation, 'version': '1'})


def snapshot(**fields):
    return {'mode': 'free', 'schema': 1, 'app_version': 'local-v1', 'revision': 1, 'generation': 1, 'outcome': 'open',
            'start': '2026-11-07T12:00:00Z', 'end': None, **fields}


def test_identity_multiple_sessions_retry_and_reconnect(api):
    person = consent(api, ['writing']).json()
    assert uuid.UUID(person['id']).version == 4
    assert api('state', {}).json() == person == consent(api, ['writing']).json()
    for _ in range(2):
        path = f'sessions/{uuid.uuid4()}'
        initial = snapshot(writing={'text': 'synthetic'})
        assert api(path, initial).status_code == 200
        final = {**initial, 'revision': 2, 'outcome': 'interrupted', 'end': '2026-11-07T12:01:00Z',
                 'writing': {'text': 'synthetic rain'}}
        for payload in [final, final, initial]:
            assert api(path, payload).status_code == 200
    if connection.vendor == 'postgresql':
        connection.close()  # Read committed records on a fresh connection.
    assert ResearchSession.objects.filter(participant_id=person['id'], outcome='interrupted').count() == 2
    assert ResearchWriting.objects.filter(text='synthetic rain', word_count=2).count() == 2
    assert not ResearchBehavior.objects.exists()


def test_consent_generation_authorization_withdrawal_deletion(api):
    path = f'sessions/{uuid.uuid4()}'
    behavioral = snapshot(behavior={'configuration': {'arrows': True}, 'events': {'word_ms': [200]}, 'metrics': {'words_written': 1}})
    assert consent(api, []).status_code == 400
    assert not ResearchParticipant.objects.exists()
    assert api(path, behavioral).status_code == 403
    consent(api, ['behavior'])
    assert api(path, {**behavioral, 'writing': {'text': 'private'}}).status_code == 403
    assert api(path, behavioral).status_code == 200
    behavioral['behavior']['configuration']['source'] = 'private'
    assert api(path, behavioral).status_code == 400
    assert not ResearchWriting.objects.exists()
    assert Client().get(f'/api/research/{path}/').status_code == 405
    assert api('delete', {}, key='a'*64).status_code == 404
    assert consent(api, ['writing'], 1).status_code == 200
    assert api(path, behavioral).status_code == 403
    assert not ResearchBehavior.objects.exists()
    assert api(f'sessions/{uuid.uuid4()}', snapshot(generation=2, writing={'text': 'synthetic'})).status_code == 200
    assert consent(api, [], 2).status_code == 200
    assert not ResearchWriting.objects.exists()
    assert ResearchConsent.objects.filter(withdrawn_at__isnull=False).count() == 2
    assert api('delete', {}).status_code == 200
    assert not ResearchSession.objects.exists()
    assert not ResearchParticipant.objects.exists()
    assert api('state', {}).status_code == 404


def test_collection_switch_and_csrf(api, settings):
    settings.RESEARCH_ENABLED = False
    assert consent(api, ['behavior']).status_code == 403
    assert not ResearchParticipant.objects.exists()
    settings.RESEARCH_ENABLED = True
    client = Client(enforce_csrf_checks=True)
    assert client.post('/api/research/enroll/', {}, content_type='application/json').status_code == 403


def test_stale_owner_and_epoch_cannot_write_or_recreate_a_session(api):
    original = consent(api, ['writing']).json()
    path = f'sessions/{uuid.uuid4()}'
    assert api(path, snapshot(writing={'text': 'synthetic first'})).status_code == 200
    consent(api, [], original['generation'])
    consent(api, ['writing'], 2)
    assert api(path, snapshot(generation=3, writing={'text': 'stale'})).status_code == 409
    assert not ResearchWriting.objects.exists()
    assert api('delete', {}).status_code == 200
    assert consent(api, ['writing']).json()['id'] != original['id']
    assert api(path, snapshot(participant=original['id'], writing={'text': 'old'})).status_code == 403
    assert not ResearchWriting.objects.exists()


def test_enforced_scopes_after_collection_closes(api, settings):
    person = consent(api, ['behavior', 'writing']).json()
    settings.RESEARCH_ENABLED = False
    assert api('state', {}).json() == person
    assert api(f'sessions/{uuid.uuid4()}', snapshot(writing={'text': 'closed'})).status_code == 403
    assert consent(api, [], 1).status_code == 200
    assert api('delete', {}).status_code == 200


@pytest.mark.parametrize(('mode', 'writing', 'structure_key'), [
    ('free', {'text': 'rain sea', 'words': ['rain'], 'draft': 'sea'}, 'words'),
    ('aphorism', {'text': 'rain', 'aphorism': {'id': 'aotd-001', 'version': 1, 'mode': 'text'}}, 'aphorism'),
    ('blackout', {'text': 'ain', 'source': 'rain', 'blackout': {'version': 2, 'style': 'blackout', 'covered': [0]}}, 'blackout'),
    ('story', {'text': 'rain', 'story': {'version': 1, 'active': 0,
        'beats': [{'id': 'a', 'text': 'Cloud'}, {'id': 'b', 'text': 'Sea'}],
        'passages': [{'from': 'a', 'to': 'b', 'words': ['rain'], 'draft': ''}]}}, 'story'),
    ('library_edit', {'text': 'rain\ninto the sea', 'title': 'Synthetic title'}, 'title'),
])
def test_mode_structure_round_trip_with_content_only(api, mode, writing, structure_key):
    consent(api, ['writing'])
    sid = uuid.uuid4()
    assert api(f'sessions/{sid}', snapshot(mode=mode, writing=writing)).status_code == 200
    row = ResearchWriting.objects.get(session_id=sid)
    assert row.text == writing['text']
    assert row.structure[structure_key] == writing[structure_key]
    assert row.consent.scope == 'writing'
    assert not ResearchBehavior.objects.exists()


def test_pilot_rating_arrives_after_done_and_cannot_rewrite_measurements(api):
    consent(api, ['behavior'])
    path = f'sessions/{uuid.uuid4()}'
    metrics = {'observation_ms': 120500, 'first_input_ms': 450, 'usefulness_rating': None}
    data = snapshot(outcome='completed', end='2026-11-07T12:03:00Z',
                    behavior={'metrics': metrics, 'events': {}, 'configuration': {'arrows': True}})
    assert api(path, data).status_code == 200
    for invalid in (0, 6, True, 2.5):
        metrics['usefulness_rating'] = invalid
        assert api(path, dict(data, revision=2)).status_code == 400
    metrics.update(usefulness_rating=4, first_input_ms=50)
    assert api(path, dict(data, revision=2)).status_code == 200
    assert api(path, data).status_code == 200
    assert ResearchBehavior.objects.get().metrics == {
        'observation_ms': 120500, 'first_input_ms': 450, 'usefulness_rating': 4}
    assert not ResearchWriting.objects.exists()
    assert consent(api, [], 1).status_code == 200
    assert not ResearchBehavior.objects.exists()


def test_only_terms_acceptance_allows_new_coarse_summaries(api):
    from deblock.backend.models import PersonalizationSummary
    defaults = {'version': '2', 'generation': 0, 'scopes': ['personalize']}
    assert api('defaults', defaults).status_code == 403
    assert api('enroll', defaults).status_code == 400
    assert not ResearchParticipant.objects.exists()
    terms = {**defaults, 'version': '3'}
    assert api('accept', {**terms, 'scopes': ['personalize', 'writing']}).status_code == 400
    person = api('accept', terms).json()
    assert person['scopes'] == ['personalize']
    assert ResearchConsent.objects.get().source == 'terms'
    payload = snapshot(participant=person['id'], personalize={
        'word_band': 1, 'duration_band': 0, 'start_within_two_minutes': True, 'usefulness_rating': None})
    path = f'sessions/{uuid.uuid4()}'
    assert api(path, {**payload, 'writing': {'text': 'private'}}).status_code == 403
    assert api(path, {**payload, 'personalize': {**payload['personalize'], 'draft': 'private'}}).status_code == 400
    assert api(path, payload).status_code == 200
    assert PersonalizationSummary.objects.count() == 1
    assert not ResearchWriting.objects.exists()
    assert not ResearchBehavior.objects.exists()
    assert api('consent', {'version':'2', 'generation':1, 'scopes':[], 'participant':person['id']}).status_code == 200
    assert api('state', {}).json()['scopes'] == []
    assert not PersonalizationSummary.objects.exists()
    assert not ResearchSession.objects.exists()
