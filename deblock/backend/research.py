"""Write-only, capability-authorized research API. Independent of account cookies."""
import hashlib
import json
import re
import time
import uuid
from datetime import timedelta

from django.conf import settings
from django.core.cache import cache
from django.db import models, transaction
from django.http import JsonResponse
from django.utils import timezone
from django.utils.dateparse import parse_datetime
from django.views.decorators.http import require_POST

from .models import PersonalizationSummary, ResearchBehavior, ResearchConsent, ResearchParticipant, ResearchSession, ResearchWriting
from .views import body, error, text
from .writing import validate_aphorism, validate_blackout, validate_story

SCOPES = {'behavior', 'writing', 'personalize'}
MODES = ('free', 'aphorism', 'story', 'blackout', 'library_edit')
METRICS = set('duration_ms active_ms first_word_ms words_written final_words rate_per_min '
              'median_interval_ms mean_interval_ms longest_pause_ms pauses deleted_chars corrections '
              'corrections_per_word response_chars beats passages_written available_words '
              'concealed_words selection_changes first_input_ms observation_ms usefulness_rating'.split())
EVENTS = {'word_ms', 'pause_durations_ms', 'correction_ms', 'transition_ms', 'transition_to', 'passage_ms', 'features'}
FEATURES = ('arrows-toggle', 'aphorism-toggle', 'art-toggle', 'art-next', 'edit-outline')


def check(condition):
    if not condition:
        raise ValueError('Invalid research record.')


def integer(value, maximum=2**31-1):
    check(type(value) is int and 0 <= value <= maximum)
    return value


def validate_behavior(value, mode):
    check(isinstance(value, dict) and set(value) == {'metrics', 'events', 'configuration'})
    metrics, events, config = (value[k] for k in ('metrics', 'events', 'configuration'))
    check(isinstance(metrics, dict) and metrics.keys() <= METRICS)
    for n in metrics.values():
        check(n is None or type(n) in (int, float) and 0 <= n < 10**12)
    check(isinstance(events, dict) and events.keys() <= EVENTS)
    for key, items in events.items():
        if key == 'features':
            check(isinstance(items, dict) and items.keys() <= set(FEATURES))
            for n in items.values():
                integer(n)
        else:
            check(isinstance(items, list) and len(items) <= 100000)
            for n in items:
                integer(n, 10**12)
    check(isinstance(config, dict) and config.keys() <= {'arrows', 'aphorism'})
    check(type(config.get('arrows')) is bool)
    if 'aphorism' in config:
        check(mode == 'aphorism' and validate_aphorism(config['aphorism']) == config['aphorism'])


def validate_writing(value, mode):
    check(isinstance(value, dict) and value.keys() <= {'text', 'story', 'blackout', 'source', 'aphorism', 'title', 'document_ref', 'words', 'draft'})
    writing = text(value['text'], 'Writing', 1000000)
    structure = {'title': text(value.get('title', ''), 'Title', 300)}
    if 'document_ref' in value:
        structure['document_ref'] = str(uuid.UUID(value['document_ref']))
    if mode == 'free' and 'words' in value:
        check(isinstance(value['words'], list) and len(value['words']) <= 100000)
        structure['words'] = [text(word, 'Word', 1000000) for word in value['words']]
        structure['draft'] = text(value['draft'], 'Draft', 1000000)
    if mode == 'story':
        structure['story'] = validate_story(value['story'])
        check(structure['story'] is not None)
    elif mode == 'aphorism':
        structure['aphorism'] = validate_aphorism(value['aphorism'])
        check(structure['aphorism'] is not None)
    elif mode == 'blackout':
        source = text(value['source'], 'Source', 1000000)
        structure.update(source=source, blackout=validate_blackout(value['blackout'], [source], ''))
        check(structure['blackout'] is not None)
    return {'text': writing, 'structure': structure, 'word_count': len(writing.split())}


def scopes_for(person):
    return ResearchConsent.objects.filter(participant=person, withdrawn_at=None)


def decision(person):
    effective = scopes_for(person).exclude(models.Q(scope='personalize') & ~models.Q(source='terms', version='3'))
    return {'id': str(person.pk), 'generation': person.generation,
            'scopes': list(effective.values_list('scope', flat=True))}


def budget(key, limit):
    bucket = f'research:{key}:{int(time.time()) // 60}'
    return cache.add(bucket, 1, 65) or cache.incr(bucket) <= limit


@require_POST
def participant(request, action):
    """Serialize consent mutations and session saves on the participant row."""
    if action == 'defaults':
        return error('Review the current terms before collecting summaries.', 403)
    key = request.headers.get('X-Research-Key', '')
    if not re.fullmatch(r'[a-f0-9]{64}', key):
        return error('Research key required.', 403)
    digest = hashlib.sha256(key.encode()).hexdigest()
    try:
        data = body(request)
        with transaction.atomic():
            person = ResearchParticipant.objects.select_for_update().filter(key_digest=digest).first()
            if action in ('enroll', 'accept') and settings.RESEARCH_ENABLED and person is None:
                check(data.get('generation') == 0)
                if not budget('enroll', 60):
                    return error('Try again later.', 429)
                person, _ = ResearchParticipant.objects.select_for_update().get_or_create(key_digest=digest)
            if person is None:
                return error('Unknown research key.', 404 if action in ('state', 'delete') else 403)
            if action in ('delete', 'consent') and data.get('participant') != str(person.pk):
                return error('Research identity changed.', 409)
            if action == 'delete':
                person.delete()
                return JsonResponse({'deleted': True})
            if action == 'aphorism':
                if not settings.RESEARCH_ENABLED or 'personalize' not in decision(person)['scopes']:
                    return error('Collection permission required.', 403)
                if data.get('participant') != str(person.pk) or data.get('generation') != person.generation:
                    return error('Consent changed.', 403)
                check(budget(person.pk, 120))
                check(type(data.get('saved')) is bool)
                value = validate_aphorism({'version': 1, 'id': data.get('id'), 'mode': 'word'})
                ids = set(person.saved_aphorisms)
                if data['saved']:
                    ids.add(value['id'])
                else:
                    ids.discard(value['id'])
                person.saved_aphorisms = sorted(ids)
                person.save(update_fields=['saved_aphorisms'])
                return JsonResponse({'saved': True})
            if action == 'state':
                return JsonResponse(decision(person))
            check(action in ('enroll', 'consent', 'accept'))
            version = data.get('version')
            check(version in ('1', '2', '3') and isinstance(data.get('scopes'), list))
            scopes = set(data['scopes'])
            check(scopes <= SCOPES and (action != 'enroll' or scopes))
            if action == 'accept':
                check(version == '3' and scopes == {'personalize'})
                if not settings.RESEARCH_ENABLED:
                    return error('Collection is closed.', 403)
                if 'personalize' not in decision(person)['scopes']:
                    check(integer(data['generation']) == person.generation)
                    scopes_for(person).filter(scope='personalize').update(withdrawn_at=timezone.now())
                    ResearchConsent.objects.create(participant=person, scope='personalize', version='3', source='terms')
                    person.generation += 1
                    person.withdrawn_at = None
                    person.save()
                return JsonResponse(decision(person))
            if version == '1':
                check('personalize' not in scopes)
            current = set(decision(person)['scopes'])
            check('personalize' not in scopes - current)
            if version in ('2', '3'):
                check('behavior' not in scopes - current)
            if scopes - current and not settings.RESEARCH_ENABLED:
                return error('Enrollment is closed.', 403)
            if action in ('enroll', 'accept') and person.generation:
                return JsonResponse(decision(person))
            if current == scopes and integer(data['generation']) + 1 == person.generation:
                return JsonResponse(decision(person))
            if integer(data['generation']) != person.generation:
                return error('Refresh research settings.', 409)
            if current != scopes:
                now = timezone.now()
                removed = current - scopes
                if 'writing' in removed:
                    ResearchWriting.objects.filter(session__participant=person).delete()
                if 'behavior' in removed:
                    ResearchBehavior.objects.filter(session__participant=person).delete()
                if 'personalize' in removed:
                    person.saved_aphorisms = []
                    summaries = PersonalizationSummary.objects.filter(session__participant=person)
                    headers = ResearchSession.objects.filter(participant=person,
                        id__in=summaries.values('session_id'), researchwriting__isnull=True, researchbehavior__isnull=True)
                    headers.delete()
                    summaries.delete()
                scopes_for(person).filter(scope__in=removed).update(withdrawn_at=now)
                for scope in scopes - current:
                    ResearchConsent.objects.create(participant=person, scope=scope, version=version,
                        source='explicit')
                person.generation += 1
                person.withdrawn_at = None if scopes else now
                person.save()
            return JsonResponse(decision(person))
    except (ValueError, KeyError, TypeError, OverflowError):
        return error('Invalid research settings.')


@require_POST
def save(request, key):
    if not settings.RESEARCH_ENABLED:
        return error('Research collection is closed.', 403)
    digest = hashlib.sha256(request.headers.get('X-Research-Key', '').encode()).hexdigest()
    try:
        with transaction.atomic():
            person = ResearchParticipant.objects.select_for_update().filter(key_digest=digest).first()
            if not person:
                return error('Research key required.', 403)
            if not budget(person.pk, 120):
                return error('Please retry later.', 429)
            data = body(request, maximum=8 * 1024 * 1024)
            # Reject unpaired UTF-16 surrogates before PostgreSQL processes JSONB.
            json.dumps(data, ensure_ascii=False).encode('utf-8')
            scopes = {record.scope: record for record in scopes_for(person)}
            if 'personalize' in scopes and (scopes['personalize'].source, scopes['personalize'].version) != ('terms', '3'):
                del scopes['personalize']
            submitted = data.keys() & SCOPES
            if (not submitted or submitted - scopes.keys() or data.get('participant') != str(person.pk)
                    or integer(data['generation']) != person.generation):
                return error('Consent changed.', 403)
            check(data.keys() <= SCOPES | {'participant', 'generation', 'schema', 'app_version', 'revision', 'mode', 'start', 'end', 'outcome'})
            check(type(data['schema']) is int and data['schema'] == 1 and data['mode'] in MODES)
            version = data['app_version']
            check(isinstance(version, str) and re.fullmatch(r'local-v1|[a-fA-F0-9]{7,64}', version))
            revision = integer(data['revision'])
            start = parse_datetime(data['start'])
            check(start and timezone.is_aware(start))
            end = parse_datetime(data['end']) if data['end'] else None
            outcome = data['outcome']
            check(outcome in ('open', 'completed', 'interrupted'))
            check((outcome == 'open') == (end is None))
            check(end is None or timezone.is_aware(end) and start <= end <= start + timedelta(days=365))
            if 'behavior' in submitted:
                validate_behavior(data['behavior'], data['mode'])
                metrics = data['behavior']['metrics']
                if {'first_input_ms', 'observation_ms', 'usefulness_rating'} & metrics.keys():
                    check(data['mode'] == 'free' and 'first_input_ms' in metrics)
                    observed = integer(metrics['observation_ms'], 10**12)
                    if metrics['first_input_ms'] is not None:
                        integer(metrics['first_input_ms'], observed)
                    if 'usefulness_rating' in metrics:
                        rating = metrics['usefulness_rating']
                        check(outcome == 'completed' and (rating is None or integer(rating, 5) >= 1))
            summary = data.get('personalize')
            if 'personalize' in submitted:
                check(isinstance(summary, dict) and set(summary) ==
                      {'word_band', 'duration_band', 'start_within_two_minutes', 'usefulness_rating'})
                integer(summary['word_band'], 4)
                integer(summary['duration_band'], 4)
                started = summary['start_within_two_minutes']
                check(started is None or (data['mode'] == 'free' and type(started) is bool))
                rating = summary['usefulness_rating']
                check(rating is None or (data['mode'] == 'free' and outcome == 'completed' and integer(rating, 5) >= 1))
                if submitted == {'personalize'}:
                    check(start.second == start.microsecond == 0 and (end is None or end.second == end.microsecond == 0))
            writing = validate_writing(data['writing'], data['mode']) if 'writing' in submitted else None
            session, created = ResearchSession.objects.get_or_create(id=key, defaults=dict(
                participant=person, mode=data['mode'], generation=person.generation, revision=revision,
                started_at=start, outcome=outcome, app_version=version))
            if (session.participant_id != person.pk or session.generation != person.generation
                    or session.mode != data['mode'] or session.started_at != start or session.app_version != version):
                return error('Session conflict.', 409)
            if not created and revision > session.revision and session.outcome == outcome == 'completed':
                if summary and summary['usefulness_rating'] is not None:
                    PersonalizationSummary.objects.filter(session=session, usefulness_rating=None).update(
                        usefulness_rating=summary['usefulness_rating'])
                # After Done, only the explicitly submitted rating can change.
                if 'behavior' in submitted and metrics.get('usefulness_rating') is not None:
                    previous = ResearchBehavior.objects.filter(session=session).first()
                    if previous and 'usefulness_rating' in previous.metrics and previous.metrics['usefulness_rating'] is None:
                        previous.metrics['usefulness_rating'] = metrics['usefulness_rating']
                        previous.save(update_fields=['metrics'])
                        session.revision = revision
                        session.save(update_fields=['revision', 'received_at'])
            if not created and (revision <= session.revision or session.outcome != 'open'):
                return JsonResponse({'saved': True})
            session.revision, session.outcome, session.ended_at = revision, outcome, end
            session.save()
            if 'behavior' in submitted:
                ResearchBehavior.objects.update_or_create(session=session, defaults=data['behavior'])
            if summary is not None:
                PersonalizationSummary.objects.update_or_create(session=session, defaults=summary)
            if writing is not None:
                ResearchWriting.objects.update_or_create(session=session, defaults={**writing, 'consent': scopes['writing']})
            return JsonResponse({'saved': True})
    except (ValueError, TypeError, KeyError, AttributeError, OverflowError, RecursionError):
        return error('Invalid research snapshot.')
