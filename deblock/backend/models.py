"""Account-owned records. No client-provided owner is ever trusted."""
import uuid
from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models
from django.db.models.functions import Lower


class UserManager(BaseUserManager):
    use_in_migrations = True

    def create_user(self, email: str, password: str | None = None, **extra):
        user = self.model(email=email.strip().lower(), **extra)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email: str, password: str, **extra):
        return self.create_user(email, password, is_staff=True, is_superuser=True, **extra)


class User(AbstractUser):
    username = None
    email = models.EmailField(unique=True)
    name = models.CharField(max_length=100, blank=True)
    avatar = models.CharField(max_length=1, choices=[('1', 'Short hair'), ('2', 'Straight hair'), ('3', 'Wavy hair')], default='1')
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []
    objects = UserManager()

    class Meta:
        constraints = [models.UniqueConstraint(Lower('email'), name='user_email_case_insensitive')]


class Entry(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='entries')
    title = models.CharField(max_length=300, blank=True)
    words = models.JSONField(default=list)
    draft = models.TextField(blank=True)
    aphorism = models.JSONField(null=True, blank=True)
    story = models.JSONField(null=True, blank=True)
    blackout = models.JSONField(null=True, blank=True)
    arrows = models.BooleanField(default=True)
    artwork_id = models.CharField(max_length=80, blank=True)
    revision = models.PositiveIntegerField(default=1)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [models.Index(fields=['owner', '-updated_at'])]


class GalleryImage(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='images')
    title = models.CharField(max_length=300, blank=True)
    caption = models.TextField(blank=True, default='')
    artwork_id = models.CharField(max_length=80, blank=True)
    png = models.BinaryField()
    size = models.PositiveIntegerField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [models.Index(fields=['owner', '-created_at'])]
