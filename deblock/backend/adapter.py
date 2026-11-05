"""Keep email links on the configured canonical site, never a request Host header."""
from urllib.parse import urlsplit
from allauth.account.adapter import DefaultAccountAdapter
from django.conf import settings


class AccountAdapter(DefaultAccountAdapter):
    def get_email_confirmation_url(self, request, emailconfirmation):
        path = urlsplit(super().get_email_confirmation_url(request, emailconfirmation)).path
        return settings.PUBLIC_ORIGIN + path

    def get_reset_password_from_key_url(self, key):
        path = urlsplit(super().get_reset_password_from_key_url(key)).path
        return settings.PUBLIC_ORIGIN + path
