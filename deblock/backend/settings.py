"""Local defaults; production refuses missing secrets and infrastructure settings."""
import os
import secrets
from pathlib import Path
from urllib.parse import unquote, urlsplit

from django.core.exceptions import ImproperlyConfigured

BASE_DIR = Path(__file__).resolve().parents[2]
ENVIRONMENT = os.environ.get('DEBLOCK_ENV', 'development')
if ENVIRONMENT not in {'development', 'production'}:
    raise ImproperlyConfigured('DEBLOCK_ENV must be development or production.')
PRODUCTION = ENVIRONMENT == 'production'
DEBUG = not PRODUCTION
DATA_DIR = Path(os.environ.get('DEBLOCK_DATA_DIR', BASE_DIR / 'var')).resolve()
DATA_DIR.mkdir(mode=0o700, parents=True, exist_ok=True)


def required(name: str) -> str:
    value = os.environ.get(name, '')
    if not value:
        raise ImproperlyConfigured(f'{name} is required in production.')
    return value


SECRET_KEY = os.environ.get('DJANGO_SECRET_KEY', '')
if not SECRET_KEY and not PRODUCTION:
    key_file = DATA_DIR / 'development-secret'
    try:
        with open(key_file, 'x', opener=lambda path, flags: os.open(path, flags, 0o600)) as stream:
            stream.write(secrets.token_urlsafe(64))
    except FileExistsError:
        pass
    SECRET_KEY = key_file.read_text().strip()
if len(SECRET_KEY) < 50:
    raise ImproperlyConfigured('Set DJANGO_SECRET_KEY to a random secret of at least 50 characters.')
PUBLIC_ORIGIN = (required('DEBLOCK_ORIGIN') if PRODUCTION else os.environ.get('DEBLOCK_ORIGIN', 'http://127.0.0.1:8003')).rstrip('/')
origin = urlsplit(PUBLIC_ORIGIN)
if not origin.hostname or origin.path or origin.query or origin.fragment or origin.username:
    raise ImproperlyConfigured('DEBLOCK_ORIGIN must contain only scheme and host (and optional port).')
if origin.scheme != ('https' if PRODUCTION else 'http'):
    raise ImproperlyConfigured('Production needs an HTTPS origin; local development uses HTTP.')
ALLOWED_HOSTS = [origin.hostname] if PRODUCTION else ['127.0.0.1', 'localhost', '[::1]']
CSRF_TRUSTED_ORIGINS = [PUBLIC_ORIGIN]
ROOT_URLCONF = 'deblock.backend.urls'
WSGI_APPLICATION = 'deblock.backend.wsgi.application'
INSTALLED_APPS = [
    'django.contrib.auth', 'django.contrib.contenttypes', 'django.contrib.sessions',
    'django.contrib.messages', 'django.contrib.staticfiles',
    'deblock.backend.apps.BackendConfig', 'allauth', 'allauth.account',
]
MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'deblock.backend.middleware.ResponseSecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'allauth.account.middleware.AccountMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]
TEMPLATES = [{'BACKEND': 'django.template.backends.django.DjangoTemplates',
    'DIRS': [BASE_DIR / 'deblock/backend/templates'], 'APP_DIRS': True,
    'OPTIONS': {'context_processors': [
        'django.template.context_processors.request', 'django.contrib.auth.context_processors.auth',
        'django.contrib.messages.context_processors.messages', 'deblock.backend.context.email_delivery',
    ]}}]
AUTH_USER_MODEL = 'backend.User'
AUTHENTICATION_BACKENDS = ['allauth.account.auth_backends.AuthenticationBackend']
PASSWORD_HASHERS = ['django.contrib.auth.hashers.Argon2PasswordHasher', 'django.contrib.auth.hashers.PBKDF2PasswordHasher']
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator', 'OPTIONS': {'min_length': 12}},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]
ACCOUNT_USER_MODEL_USERNAME_FIELD = None
ACCOUNT_LOGIN_METHODS = {'email'}
ACCOUNT_SIGNUP_FIELDS = ['email*', 'password1*', 'password2*']
ACCOUNT_EMAIL_VERIFICATION = 'mandatory'
ACCOUNT_EMAIL_CONFIRMATION_EXPIRE_DAYS = 1
ACCOUNT_CONFIRM_EMAIL_ON_GET = False
ACCOUNT_EMAIL_NOTIFICATIONS = True
ACCOUNT_CHANGE_EMAIL = True
ACCOUNT_PREVENT_ENUMERATION = True
ACCOUNT_SESSION_REMEMBER = False
ACCOUNT_LOGOUT_ON_PASSWORD_CHANGE = True
ACCOUNT_REAUTHENTICATION_REQUIRED = True
ACCOUNT_ADAPTER = 'deblock.backend.adapter.AccountAdapter'
ACCOUNT_RATE_LIMITS = {'login': '5/m/ip', 'login_failed': '5/5m/key', 'signup': '5/h/ip',
    'reset_password': '5/h/ip,3/h/key', 'confirm_email': '5/10m/key'}
ALLAUTH_TRUSTED_PROXY_COUNT = int(os.environ.get('DEBLOCK_TRUSTED_PROXY_COUNT', '0'))
LOGIN_URL = '/accounts/login/'
LOGIN_REDIRECT_URL = '/'
ACCOUNT_LOGOUT_REDIRECT_URL = '/accounts/login/'
PASSWORD_RESET_TIMEOUT = 3600
SESSION_COOKIE_NAME = '__Host-deblock-session' if PRODUCTION else 'deblock-session'
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SECURE = PRODUCTION
SESSION_COOKIE_SAMESITE = 'Lax'
SESSION_COOKIE_AGE = 60 * 60 * 12
SESSION_EXPIRE_AT_BROWSER_CLOSE = True
CSRF_COOKIE_HTTPONLY = True
CSRF_COOKIE_SECURE = PRODUCTION
CSRF_COOKIE_SAMESITE = 'Lax'
SECURE_SSL_REDIRECT = PRODUCTION
SECURE_HSTS_SECONDS = 31536000 if PRODUCTION else 0
SECURE_HSTS_INCLUDE_SUBDOMAINS = PRODUCTION
SECURE_HSTS_PRELOAD = PRODUCTION
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_REFERRER_POLICY = 'same-origin'
X_FRAME_OPTIONS = 'DENY'
if os.environ.get('DEBLOCK_TRUST_PROXY_HTTPS') == '1':
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

if PRODUCTION or os.environ.get('DATABASE_URL'):
    database = urlsplit(required('DATABASE_URL'))
    if database.scheme not in {'postgres', 'postgresql'}:
        raise ImproperlyConfigured('DATABASE_URL must use PostgreSQL.')
    DATABASES = {'default': {'ENGINE': 'django.db.backends.postgresql',
        'NAME': unquote(database.path.lstrip('/')), 'USER': unquote(database.username or ''),
        'PASSWORD': unquote(database.password or ''), 'HOST': database.hostname, 'PORT': database.port or 5432,
        'CONN_MAX_AGE': 60, 'OPTIONS': {'sslmode': os.environ.get('DEBLOCK_DB_SSLMODE', 'verify-full')}}}
else:
    DATABASES = {'default': {'ENGINE': 'django.db.backends.sqlite3', 'NAME': DATA_DIR / 'deblock.sqlite3', 'OPTIONS': {'timeout': 20}}}
if PRODUCTION:
    CACHES = {'default': {'BACKEND': 'django.core.cache.backends.redis.RedisCache', 'LOCATION': required('REDIS_URL')}}
else:
    CACHES = {'default': {'BACKEND': 'django.core.cache.backends.locmem.LocMemCache', 'LOCATION': 'deblock-dev'}}
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend' if PRODUCTION or os.environ.get('EMAIL_HOST') else 'django.core.mail.backends.filebased.EmailBackend'
EMAIL_FILE_PATH = DATA_DIR / 'mail'
EMAIL_HOST = required('EMAIL_HOST') if PRODUCTION else os.environ.get('EMAIL_HOST', '')
EMAIL_PORT = int(os.environ.get('EMAIL_PORT', '587'))
EMAIL_HOST_USER = required('EMAIL_HOST_USER') if PRODUCTION else os.environ.get('EMAIL_HOST_USER', '')
EMAIL_HOST_PASSWORD = required('EMAIL_HOST_PASSWORD') if PRODUCTION else os.environ.get('EMAIL_HOST_PASSWORD', '')
EMAIL_USE_TLS = True
EMAIL_TIMEOUT = 15
DEFAULT_FROM_EMAIL = required('DEFAULT_FROM_EMAIL') if PRODUCTION else os.environ.get('DEFAULT_FROM_EMAIL', 'deblock <noreply@localhost>')
SERVER_EMAIL = DEFAULT_FROM_EMAIL
ADMINS = []  # Never email request bodies, passwords, or private writing on errors.
DATA_UPLOAD_MAX_MEMORY_SIZE = 10 * 1024 * 1024
FILE_UPLOAD_MAX_MEMORY_SIZE = 1024 * 1024
DATA_UPLOAD_MAX_NUMBER_FIELDS = 30
DATA_UPLOAD_MAX_NUMBER_FILES = 1
MAX_IMAGE_BYTES = 8 * 1024 * 1024
MAX_GALLERY_BYTES = 100 * 1024 * 1024
MAX_GALLERY_IMAGES = 100
MAX_ENTRIES = 1000
USE_TZ = True
TIME_ZONE = 'UTC'
LANGUAGE_CODE = 'en'
STATIC_URL = '/static/'
STATIC_ROOT = DATA_DIR / 'static'
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'
LOGGING = {'version': 1, 'disable_existing_loggers': False, 'handlers': {'null': {'class': 'logging.NullHandler'}},
    'loggers': {'django.request': {'handlers': ['null'], 'propagate': False},
                'django.server': {'handlers': ['null'], 'propagate': False}}}
