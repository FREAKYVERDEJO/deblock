from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [('backend', '0003_galleryimage_caption')]
    operations = [
        migrations.AddField(
            model_name='entry', name='aphorism',
            field=models.JSONField(null=True, blank=True),
        ),
    ]
