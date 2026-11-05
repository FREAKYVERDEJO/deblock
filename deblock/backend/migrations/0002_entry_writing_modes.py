from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [('backend', '0001_initial')]
    operations = [
        migrations.AddField(model_name='entry', name='story', field=models.JSONField(blank=True, null=True)),
        migrations.AddField(model_name='entry', name='blackout', field=models.JSONField(blank=True, null=True)),
    ]
