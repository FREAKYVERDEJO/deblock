from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [('backend', '0002_entry_writing_modes')]
    operations = [
        migrations.AddField(
            model_name='galleryimage', name='caption',
            field=models.TextField(blank=True, default=''),
        ),
    ]
