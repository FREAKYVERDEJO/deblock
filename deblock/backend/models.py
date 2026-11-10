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


class ResearchParticipant(models.Model):
    """Possession of a separate random recovery key authorizes research writes."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    key_digest = models.CharField(max_length=64, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    generation = models.PositiveIntegerField(default=0)
    withdrawn_at = models.DateTimeField(null=True)

    class Meta:
        db_table = 'research_participants'


class ResearchConsent(models.Model):
    participant = models.ForeignKey(ResearchParticipant, on_delete=models.CASCADE)
    scope = models.CharField(max_length=12)
    version = models.CharField(max_length=20)
    source = models.CharField(max_length=10, default='explicit')
    granted_at = models.DateTimeField(auto_now_add=True)
    withdrawn_at = models.DateTimeField(null=True)

    class Meta:
        db_table = 'research_consent'
        constraints = [models.UniqueConstraint(fields=['participant', 'scope'],
            condition=models.Q(withdrawn_at=None), name='one_current_scope')]


class ResearchSession(models.Model):
    id = models.UUIDField(primary_key=True)
    participant = models.ForeignKey(ResearchParticipant, on_delete=models.CASCADE)
    mode = models.CharField(max_length=12)
    generation = models.PositiveIntegerField()
    revision = models.PositiveIntegerField()
    schema_version = models.PositiveSmallIntegerField(default=1)
    app_version = models.CharField(max_length=80)
    started_at = models.DateTimeField()
    ended_at = models.DateTimeField(null=True)
    outcome = models.CharField(max_length=12)
    received_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'research_sessions'
        indexes = [models.Index(fields=['participant', 'started_at'])]


class ResearchBehavior(models.Model):
    session = models.OneToOneField(ResearchSession, primary_key=True, on_delete=models.CASCADE)
    metrics = models.JSONField()
    events = models.JSONField()
    configuration = models.JSONField()

    class Meta:
        db_table = 'research_behavior'


class ResearchWriting(models.Model):
    session = models.OneToOneField(ResearchSession, primary_key=True, on_delete=models.CASCADE)
    consent = models.ForeignKey(ResearchConsent, on_delete=models.CASCADE)
    text = models.TextField()
    structure = models.JSONField()
    word_count = models.PositiveIntegerField()
    created_at = models.DateTimeField(auto_now_add=True)
    modified_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'research_writing'


class PersonalizationSummary(models.Model):
    """Coarse session totals for future personalization, separate from research writing."""
    session = models.OneToOneField(ResearchSession, primary_key=True, on_delete=models.CASCADE)
    word_band = models.PositiveSmallIntegerField()
    duration_band = models.PositiveSmallIntegerField()
    start_within_two_minutes = models.BooleanField(null=True)
    usefulness_rating = models.PositiveSmallIntegerField(null=True)

    class Meta:
        db_table = 'personalization_summaries'
        constraints = [
            models.CheckConstraint(condition=models.Q(word_band__lte=4), name='valid_word_band'),
            models.CheckConstraint(condition=models.Q(duration_band__lte=4), name='valid_duration_band'),
            models.CheckConstraint(condition=models.Q(usefulness_rating__range=(1, 5)), name='valid_personal_rating'),
        ]
