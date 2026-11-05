"""Small same-origin JSON API backed by Django sessions and owner-scoped queries."""
import io
import json
import time
import uuid
import warnings
from functools import wraps

from allauth.account.models import EmailAddress
from django.conf import settings
from django.contrib.auth import logout
from django.core.cache import cache
from django.db import transaction
from django.db.models import Sum
from django.http import HttpResponse, JsonResponse, Http404
from django.middleware.csrf import get_token
from django.shortcuts import get_object_or_404, redirect
from django.views.decorators.http import require_GET
from PIL import Image, UnidentifiedImageError

from deblock.exercises import get_exercise
from deblock.server import ASSETS, WEB_ROOT
from .models import Entry, GalleryImage, User
from .writing import validate_story, validate_blackout

ARTWORK = {item['id']: item for item in json.loads((WEB_ROOT / 'assets/art/catalog.json').read_text())}
BACKEND_ASSETS = {
    '/storage.js': ('account-storage.js', 'text/javascript; charset=utf-8'),
    '/local-storage.js': ('storage.js', 'text/javascript; charset=utf-8'),
    '/account.js': ('account.js', 'text/javascript; charset=utf-8'),
    '/account.css': ('account.css', 'text/css; charset=utf-8'),
    '/guest.js': ('guest.js', 'text/javascript; charset=utf-8'),
}


class InvalidInput(ValueError):
    pass


def error(message: str, status: int = 400) -> JsonResponse:
    return JsonResponse({'error': message}, status=status)


def account_api(methods):
    """Require a verified session and bind stale browser tabs to their original user."""
    def decorate(view):
        @wraps(view)
        def wrapped(request, *args, **kwargs):
            if request.method not in methods:
                response = error('Method not allowed.', 405)
                response['Allow'] = ', '.join(methods)
                return response
            if not request.user.is_authenticated:
                return error('Sign in to access your saved work.', 401)
            if not EmailAddress.objects.filter(user=request.user, email__iexact=request.user.email, verified=True).exists():
                return error('Verify your email before saving work.', 403)
            account_id = request.headers.get('X-Account-ID')
            if account_id is not None and account_id != str(request.user.pk):
                return error('The signed-in account changed. Reload before saving to another account.', 409)
            if request.method not in {'GET', 'HEAD'}:
                limit = 5 if request.path == '/api/account/' else 20 if request.path == '/api/images/' else 120
                key = f'api-write:{request.user.pk}:{limit}:{int(time.time()) // 60}'
                try:
                    if cache.add(key, 1, 65):
                        count = 1
                    else:
                        count = cache.incr(key)
                except Exception:
                    return error('Saving is temporarily unavailable. Try again shortly.', 503)
                if count > limit:
                    response = error('Too many requests. Please wait a minute.', 429)
                    response['Retry-After'] = '60'
                    return response
            try:
                return view(request, *args, **kwargs)
            except InvalidInput as exc:
                return error(str(exc))
        return wrapped
    return decorate


def body(request) -> dict:
    if request.content_type != 'application/json':
        raise InvalidInput('Expected a JSON request.')
    if len(request.body) > 1024 * 1024:
        raise InvalidInput('This entry is too large.')
    try:
        value = json.loads(request.body)
    except (ValueError, UnicodeDecodeError):
        raise InvalidInput('Invalid JSON.') from None
    if not isinstance(value, dict):
        raise InvalidInput('Expected an object.')
    return value


def text(value, label: str, maximum: int) -> str:
    if not isinstance(value, str) or len(value) > maximum or '\x00' in value:
        raise InvalidInput(f'{label} must be text of at most {maximum} characters.')
    return value


def artwork_id(value) -> str:
    if value is None:
        return ''
    if not isinstance(value, dict) or not isinstance(value.get('id'), str) or value['id'] not in ARTWORK:
        raise InvalidInput('Choose an image from the curated collection.')
    return value['id']


def profile_json(user) -> dict:
    return {'id': 'local', 'accountId': str(user.pk), 'name': user.name, 'email': user.email,
            'avatar': user.avatar, 'joinedAt': user.date_joined.isoformat()}


def entry_json(entry) -> dict:
    return {'id': str(entry.pk), 'title': entry.title, 'words': entry.words, 'draft': entry.draft,
            'story': entry.story, 'blackout': entry.blackout,
            'arrows': entry.arrows, 'artwork': ARTWORK.get(entry.artwork_id), 'revision': entry.revision,
            'createdAt': entry.created_at.isoformat(), 'updatedAt': entry.updated_at.isoformat()}


def image_json(image) -> dict:
    return {'id': str(image.pk), 'title': image.title, 'caption': image.caption, 'artwork': ARTWORK.get(image.artwork_id),
            'updatedAt': image.created_at.isoformat(), 'url': f'/api/images/{image.pk}/file/'}


def page(request, query, serialize) -> JsonResponse:
    try:
        number = int(request.GET.get('page', '1'))
    except ValueError:
        raise InvalidInput('Invalid page.') from None
    if not 1 <= number <= 10000:
        raise InvalidInput('Invalid page.')
    items = list(query[(number-1)*50:number*50+1])
    return JsonResponse({'items': [serialize(item) for item in items[:50]], 'nextPage': number+1 if len(items)>50 else None})


@require_GET
def index(request):
    if not request.user.is_authenticated or not EmailAddress.objects.filter(
            user=request.user, email__iexact=request.user.email, verified=True).exists():
        return redirect('guest-writing')
    return HttpResponse((WEB_ROOT / 'index.html').read_text(), content_type='text/html; charset=utf-8')


@require_GET
def guest(request):
    """Open the shared writer with explicit browser-only storage, without changing identity."""
    html = (WEB_ROOT / 'index.html').read_text()
    html = html.replace('src="/storage.js"', 'src="/local-storage.js"')
    html = html.replace('src="/account.js"', 'src="/guest.js"')
    return HttpResponse(html, content_type='text/html; charset=utf-8')


@require_GET
def asset(request, path):
    route = '/' + path
    found = BACKEND_ASSETS.get(route) or ASSETS.get(route)
    if found is None or found[0] == 'index.html':
        raise Http404
    filename, mime = found
    return HttpResponse((WEB_ROOT / filename).read_bytes(), content_type=mime)


@require_GET
def exercise(request, exercise_id):
    try:
        return JsonResponse(get_exercise(exercise_id))
    except ValueError as exc:
        return error(str(exc), 404)


@account_api(['GET'])
def session(request):
    return JsonResponse({'profile': profile_json(request.user), 'csrfToken': get_token(request)})


@account_api(['GET', 'PUT'])
def profile(request):
    if request.method == 'PUT':
        value = body(request)
        name = text(value.get('name', ''), 'Name', 100)
        avatar = value.get('avatar')
        if not isinstance(avatar, str) or avatar not in {'1', '2', '3'}:
            raise InvalidInput('Choose one of the three profile drawings.')
        request.user.name, request.user.avatar = name, avatar
        request.user.save(update_fields=['name', 'avatar'])
    return JsonResponse(profile_json(request.user))


@account_api(['GET'])
def entries(request):
    return page(request, Entry.objects.filter(owner=request.user).order_by('-updated_at', 'pk'), entry_json)


@account_api(['GET', 'PUT', 'DELETE'])
def entry(request, key):
    if request.method == 'GET':
        return JsonResponse(entry_json(get_object_or_404(Entry, owner=request.user, pk=key)))
    if request.method == 'DELETE':
        get_object_or_404(Entry, owner=request.user, pk=key).delete()
        return HttpResponse(status=204)
    value = body(request)
    title = text(value.get('title', ''), 'Title', 300)
    words = value.get('words')
    if not isinstance(words, list) or len(words) > 20000 or any(not isinstance(word, str) for word in words):
        raise InvalidInput('Words must be a list of at most 20,000 text items.')
    draft = text(value.get('draft', ''), 'Draft', 250000)
    try:
        story = validate_story(value.get('story'))
        if story:
            words = [word for passage in story['passages'] for word in
                     [*passage['words'], *([passage['draft']] if passage['draft'] else [])]]
            draft = ''
        blackout = validate_blackout(value.get('blackout'), words, draft)
        if story and blackout:
            raise ValueError('Blackout poetry is available for free-association chains.')
    except ValueError as exc:
        raise InvalidInput(str(exc)) from None
    if sum(len(word) for word in words) + len(draft) > 250000 or any('\x00' in word for word in words):
        raise InvalidInput('An entry can contain at most 250,000 characters.')
    arrows = value.get('arrows')
    if not isinstance(arrows, bool):
        raise InvalidInput('Arrows must be true or false.')
    art = artwork_id(value.get('artwork'))
    with transaction.atomic():
        # Serializes quota checks and updates per user on PostgreSQL.
        user = User.objects.select_for_update().get(pk=request.user.pk)
        record = Entry.objects.filter(pk=key).first()
        if record and record.owner_id != user.pk:
            raise Http404
        created = record is None
        if created:
            if Entry.objects.filter(owner=user).count() >= settings.MAX_ENTRIES:
                return error('Your library is full. Delete an entry before saving another.', 409)
            record = Entry(id=key, owner=user)
        else:
            if record.story and not story:
                raise InvalidInput('Open this story in Story Beats to preserve its outline and passages.')
            if type(value.get('revision')) is not int or value['revision'] != record.revision:
                return error('This entry changed in another tab. Reopen it before saving your edits.', 409)
            record.revision += 1
        record.title, record.words, record.draft, record.arrows, record.artwork_id = title, words, draft, arrows, art
        record.story, record.blackout = story, blackout
        record.save()
    return JsonResponse(entry_json(record), status=201 if created else 200)


def verified_png(upload) -> bytes:
    if upload is None or upload.size > settings.MAX_IMAGE_BYTES:
        raise InvalidInput('Choose a PNG smaller than 8 MB.')
    raw = upload.read(settings.MAX_IMAGE_BYTES + 1)
    if not raw.startswith(b'\x89PNG\r\n\x1a\n'):
        raise InvalidInput('Only PNG images are accepted.')
    try:
        with warnings.catch_warnings():
            warnings.simplefilter('error', Image.DecompressionBombWarning)
            with Image.open(io.BytesIO(raw)) as picture:
                if picture.format != 'PNG' or picture.width * picture.height > 24000000 or getattr(picture, 'n_frames', 1) != 1:
                    raise InvalidInput('Use a still PNG of at most 24 megapixels.')
                picture.verify()
            with Image.open(io.BytesIO(raw)) as picture:
                picture.load()
                output = io.BytesIO()
                picture.convert('RGBA').save(output, format='PNG')  # Strip untrusted ancillary data.
        data = output.getvalue()
    except (UnidentifiedImageError, OSError, ValueError, Image.DecompressionBombError, Image.DecompressionBombWarning):
        raise InvalidInput('This PNG could not be read.') from None
    if len(data) > settings.MAX_IMAGE_BYTES:
        raise InvalidInput('The processed image is larger than 8 MB.')
    return data


@account_api(['GET', 'POST'])
def images(request):
    if request.method == 'GET':
        return page(request, GalleryImage.objects.filter(owner=request.user).defer('png').order_by('-created_at', 'pk'), image_json)
    try:
        key = uuid.UUID(request.POST.get('id', ''))
    except ValueError:
        raise InvalidInput('Invalid image ID.') from None
    title = text(request.POST.get('title', ''), 'Title', 300)
    caption = text(request.POST.get('caption', ''), 'Caption', 250000)
    art = artwork_id({'id': request.POST['artworkId']} if request.POST.get('artworkId') else None)
    data = verified_png(request.FILES.get('image'))
    with transaction.atomic():
        user = User.objects.select_for_update().get(pk=request.user.pk)
        existing = GalleryImage.objects.filter(pk=key).first()
        if existing:
            if existing.owner_id != user.pk:
                raise Http404
            return JsonResponse(image_json(existing))  # Idempotent retry/import.
        owned = GalleryImage.objects.filter(owner=user)
        if owned.count() >= settings.MAX_GALLERY_IMAGES or (owned.aggregate(total=Sum('size'))['total'] or 0) + len(data) > settings.MAX_GALLERY_BYTES:
            return error('Your gallery is full. Download and remove an image to make room.', 409)
        image = GalleryImage.objects.create(id=key, owner=user, title=title, caption=caption, artwork_id=art, png=data, size=len(data))
    return JsonResponse(image_json(image), status=201)


@account_api(['DELETE'])
def image_detail(request, key):
    get_object_or_404(GalleryImage, pk=key, owner=request.user).delete()
    return HttpResponse(status=204)


@account_api(['GET'])
def image_file(request, key):
    image = get_object_or_404(GalleryImage, pk=key, owner=request.user)
    response = HttpResponse(bytes(image.png), content_type='image/png')
    response['Content-Disposition'] = 'inline; filename="deblock-document.png"'
    return response


@account_api(['DELETE'])
def delete_account(request):
    value = body(request)
    password = text(value.get('password', ''), 'Password', 4096)
    if not request.user.check_password(password):
        return error('The password was not correct.', 403)
    with transaction.atomic():
        request.user.delete()
        logout(request)
    return HttpResponse(status=204)
