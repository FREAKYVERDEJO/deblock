from django.apps import AppConfig


class BackendConfig(AppConfig):
    name = 'deblock.backend'
    label = 'backend'
    default_auto_field = 'django.db.models.BigAutoField'
