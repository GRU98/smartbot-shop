import logging

from django.conf import settings
from django.core.mail import send_mail
from django.db import models


logger = logging.getLogger("smartbot.orders")


class Order(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Очікує оплати"
        PAID = "paid", "Оплачено"
        FAILED = "failed", "Помилка оплати"
        SHIPPED = "shipped", "Відправлено"
        DELIVERED = "delivered", "Доставлено"
        CANCELLED = "cancelled", "Скасовано"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="orders",
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
        db_index=True,
    )
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    delivery_full_name = models.CharField(max_length=255, blank=True, default="")
    delivery_phone = models.CharField(max_length=20, blank=True, default="")
    delivery_city = models.CharField(max_length=100, blank=True, default="")
    delivery_address = models.CharField(max_length=500, blank=True, default="")
    delivery_post_office = models.CharField(max_length=255, blank=True, default="")
    delivery_lat = models.DecimalField(max_digits=10, decimal_places=7, blank=True, null=True)
    delivery_lng = models.DecimalField(max_digits=10, decimal_places=7, blank=True, null=True)
    coupon = models.ForeignKey(
        "shop.Coupon",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="orders",
    )
    discount_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    stripe_session_id = models.CharField(max_length=255, blank=True, default="")
    stripe_payment_intent = models.CharField(max_length=255, blank=True, default="")
    invoice_pdf = models.FileField(upload_to="invoices/", blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "orders"
        ordering = ["-created_at"]
        verbose_name = "Замовлення"
        verbose_name_plural = "Замовлення"

    def __str__(self):
        return f"Замовлення #{self.id} — {self.get_status_display()}"

    def set_status(self, new_status: str, comment: str = "") -> None:
        if self.status != new_status:
            self.status = new_status
            self.save(update_fields=["status", "updated_at"])
            OrderStatusHistory.objects.create(order=self, status=new_status, comment=comment)

    def save(self, *args, **kwargs):
        old_status = None
        if self.pk:
            try:
                old_status = type(self).objects.filter(pk=self.pk).values_list("status", flat=True).first()
            except Exception:
                pass
        super().save(*args, **kwargs)
        if old_status and old_status != self.status:
            self._notify_status_change(old_status)

    def _notify_status_change(self, old_status: str) -> None:
        if not self.user or not self.user.email:
            return

        subject = f"SmartBot Shop — замовлення #{self.id}: {self.get_status_display()}"
        message = (
            f"Статус вашого замовлення #{self.id} змінено.\n"
            f"Новий статус: {self.get_status_display()}\n"
        )

        try:
            send_mail(
                subject=subject,
                message=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[self.user.email],
                fail_silently=True,
            )
            logger.info("Сповіщення про статус %s замовлення #%s надіслано на %s", self.status, self.id, self.user.email)
        except Exception:
            logger.exception("Не вдалося надіслати email про зміну статусу замовлення #%s", self.id)


class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="items")
    product = models.ForeignKey(
        "shop.Product",
        on_delete=models.SET_NULL,
        null=True,
        related_name="order_items",
    )
    product_name = models.CharField(max_length=500)
    product_price = models.DecimalField(max_digits=12, decimal_places=2)
    quantity = models.PositiveIntegerField()

    class Meta:
        db_table = "order_items"
        verbose_name = "Позиція замовлення"
        verbose_name_plural = "Позиції замовлення"

    @property
    def line_total(self):
        return self.product_price * self.quantity

    def __str__(self):
        return f"{self.product_name} x{self.quantity}"


class OrderStatusHistory(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="status_history")
    status = models.CharField(max_length=20, choices=Order.Status.choices)
    comment = models.CharField(max_length=500, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "order_status_history"
        ordering = ["created_at"]
        verbose_name = "Статус замовлення"
        verbose_name_plural = "Історія статусів"

    def __str__(self):
        return f"#{self.order_id} → {self.status}"
