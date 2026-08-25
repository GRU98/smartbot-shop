from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("orders", "0002_order_coupon_status_history"),
    ]

    operations = [
        migrations.AddField(
            model_name="order",
            name="delivery_lat",
            field=models.DecimalField(
                blank=True,
                decimal_places=7,
                max_digits=10,
                null=True,
                verbose_name="Широта доставки",
            ),
        ),
        migrations.AddField(
            model_name="order",
            name="delivery_lng",
            field=models.DecimalField(
                blank=True,
                decimal_places=7,
                max_digits=10,
                null=True,
                verbose_name="Довгота доставки",
            ),
        ),
    ]
