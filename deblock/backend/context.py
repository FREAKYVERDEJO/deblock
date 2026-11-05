"""Development-only email delivery hint on account pages."""
from django.conf import settings


def email_delivery(request):
    return {'local_email_delivery': settings.EMAIL_BACKEND == 'django.core.mail.backends.filebased.EmailBackend'}
