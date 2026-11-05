"""Read local development mail without exposing it through an HTTP endpoint."""
from django.conf import settings
from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    help = 'Print the newest locally saved development email (contains secret links).'

    def handle(self, *args, **options):
        if settings.EMAIL_BACKEND != 'django.core.mail.backends.filebased.EmailBackend':
            raise CommandError('Mailbox is only available with local file-based email.')
        messages = sorted(settings.EMAIL_FILE_PATH.glob('*.log'), key=lambda item: item.stat().st_mtime)
        if not messages:
            self.stdout.write('No local email yet. Sign up or request a password reset first.')
            return
        self.stdout.write(messages[-1].read_text())
