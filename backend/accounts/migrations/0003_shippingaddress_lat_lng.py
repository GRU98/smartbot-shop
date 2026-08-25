from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0002_user_phone_shippingaddress"),
    ]

    operations = [
        migrations.AddField(
            model_name="shippingaddress",
            name="lat",
            field=models.DecimalField(
                blank=True,
                decimal_places=7,
                max_digits=10,
                null=True,
                verbose_name="Широта",
            ),
        ),
        migrations.AddField(
            model_name="shippingaddress",
            name="lng",
            field=models.DecimalField(
                blank=True,
                decimal_places=7,
                max_digits=10,
                null=True,
                verbose_name="Довгота",
            ),
        ),
    ]
