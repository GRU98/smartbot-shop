from django.conf import settings
from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    class Role(models.TextChoices):
        CUSTOMER = "customer", "Покупець"
        ADMINISTRATOR = "administrator", "Адміністратор"
        MODERATOR = "moderator", "Модератор"
        EDITOR = "editor", "Редактор"
        SUPPORT = "support", "Підтримка"

    email = models.EmailField(unique=True)
    name = models.CharField(max_length=255, blank=True, default="")
    phone = models.CharField(max_length=20, blank=True, default="")
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.CUSTOMER)
    avatar = models.URLField(max_length=500, blank=True, default="")
    oauth_provider = models.CharField(max_length=20, blank=True, default="")

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["username"]

    class Meta:
        db_table = "users"
        verbose_name = "Користувач"
        verbose_name_plural = "Користувачі"

    def __str__(self):
        return self.email


class ShippingAddress(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="shipping_addresses",
    )
    title = models.CharField(max_length=100, default="Основна адреса")
    full_name = models.CharField(max_length=255)
    phone = models.CharField(max_length=20)
    city = models.CharField(max_length=100)
    address_line = models.CharField(max_length=500)
    post_office = models.CharField(max_length=255, blank=True, default="")
    lat = models.DecimalField(max_digits=10, decimal_places=7, blank=True, null=True)
    lng = models.DecimalField(max_digits=10, decimal_places=7, blank=True, null=True)
    is_default = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "shipping_addresses"
        ordering = ["-is_default", "-created_at"]
        verbose_name = "Адреса доставки"
        verbose_name_plural = "Адреси доставки"

    def __str__(self):
        return f"{self.title} — {self.city}, {self.address_line}"

    def save(self, *args, **kwargs):
        if self.is_default:
            ShippingAddress.objects.filter(user=self.user, is_default=True).exclude(pk=self.pk).update(is_default=False)
        super().save(*args, **kwargs)


class AuditLog(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="audit_logs",
    )
    action = models.CharField(max_length=255)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)
    changes_json = models.JSONField(default=dict, blank=True)

    class Meta:
        db_table = "audit_logs"
        ordering = ["-timestamp"]
        verbose_name = "Запис аудиту"
        verbose_name_plural = "Журнал аудиту"

    def __str__(self):
        return f"[{self.timestamp}] {self.action} — {self.ip_address}"


class AllowedIP(models.Model):
    ip_address = models.GenericIPAddressField(unique=True)
    description = models.CharField(max_length=255, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "allowed_ips"
        verbose_name = "Дозволена IP-адреса"
        verbose_name_plural = "Білий список IP"

    def __str__(self):
        return f"{self.ip_address} — {self.description}"
