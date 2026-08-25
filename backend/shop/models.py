import uuid
from decimal import Decimal

from django.conf import settings
from django.db import models
from django.utils import timezone


class Category(models.Model):
    name = models.CharField(max_length=255)
    slug = models.SlugField(unique=True)

    class Meta:
        db_table = "categories"
        verbose_name = "Категорія"
        verbose_name_plural = "Категорії"

    def __str__(self):
        return self.name


class Product(models.Model):
    name = models.CharField(max_length=500)
    slug = models.SlugField(unique=True)
    brand = models.CharField(max_length=255, blank=True, default="")
    description = models.TextField(blank=True, default="")
    specs = models.JSONField(default=dict, blank=True)
    price = models.DecimalField(max_digits=12, decimal_places=2)
    stock = models.PositiveIntegerField(default=0)
    image = models.URLField(max_length=1000, blank=True, default="")
    category = models.ForeignKey(Category, on_delete=models.CASCADE, related_name="products")
    is_active = models.BooleanField(default=True, db_index=True)
    is_featured = models.BooleanField(default=False, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "products"
        verbose_name = "Товар"
        verbose_name_plural = "Товари"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["is_active", "created_at"]),
            models.Index(fields=["is_active", "is_featured"]),
            models.Index(fields=["is_active", "category"]),
            models.Index(fields=["is_active", "brand"]),
            models.Index(fields=["is_active", "price"]),
            models.Index(fields=["is_active", "stock"]),
        ]

    def __str__(self):
        return self.name


class ProductImage(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="images")
    url = models.URLField(max_length=1000)
    alt = models.CharField(max_length=255, blank=True, default="")
    position = models.PositiveSmallIntegerField(default=0)

    class Meta:
        db_table = "product_images"
        ordering = ["position"]
        verbose_name = "Зображення товару"
        verbose_name_plural = "Зображення товарів"

    def __str__(self):
        return f"{self.product.name} — #{self.position}"


class Wishlist(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="wishlist_items",
    )
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="wishlisted_by")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "wishlist"
        unique_together = [("user", "product")]
        ordering = ["-created_at"]
        verbose_name = "Список бажань"
        verbose_name_plural = "Списки бажань"

    def __str__(self):
        return f"{self.user.email} — {self.product.name}"


class Review(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="reviews")
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="reviews",
    )
    rating = models.PositiveSmallIntegerField()
    text = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "reviews"
        ordering = ["-created_at"]
        unique_together = [("product", "user")]
        verbose_name = "Відгук"
        verbose_name_plural = "Відгуки"

    def __str__(self):
        return f"{self.user.email} — {self.product.name} ({self.rating}/5)"


class Coupon(models.Model):
    class DiscountType(models.TextChoices):
        PERCENT = "percent", "Відсоток"
        FIXED = "fixed", "Фіксована сума"

    code = models.CharField(max_length=50, unique=True)
    description = models.CharField(max_length=255, blank=True, default="")
    discount_type = models.CharField(max_length=10, choices=DiscountType.choices, default=DiscountType.PERCENT)
    discount_value = models.DecimalField(max_digits=10, decimal_places=2)
    min_order_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    max_uses = models.PositiveIntegerField(default=0)
    used_count = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    valid_from = models.DateTimeField(default=timezone.now)
    valid_to = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "coupons"
        verbose_name = "Купон"
        verbose_name_plural = "Купони"

    def __str__(self):
        return f"{self.code} ({self.discount_type}: {self.discount_value})"

    def is_valid(self):
        now = timezone.now()
        if not self.is_active:
            return False, "Купон неактивний."
        if now < self.valid_from:
            return False, "Купон ще не дійсний."
        if self.valid_to and now > self.valid_to:
            return False, "Термін дії купону закінчився."
        if self.max_uses > 0 and self.used_count >= self.max_uses:
            return False, "Купон вичерпано."
        return True, ""

    def calculate_discount(self, order_total: Decimal) -> Decimal:
        if order_total < self.min_order_amount:
            return Decimal("0.00")
        if self.discount_type == self.DiscountType.PERCENT:
            return (order_total * self.discount_value / 100).quantize(Decimal("0.01"))
        return min(self.discount_value, order_total)


class RecentlyViewed(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="recently_viewed",
    )
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="viewed_by")
    viewed_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "recently_viewed"
        unique_together = [("user", "product")]
        ordering = ["-viewed_at"]
        verbose_name = "Нещодавно переглянутий"
        verbose_name_plural = "Нещодавно переглянуті"

    def __str__(self):
        return f"{self.user.email} → {self.product.name}"


class StockAlert(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="stock_alerts",
    )
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="stock_alerts")
    email = models.EmailField()
    notified = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    notified_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "stock_alerts"
        unique_together = [("user", "product")]
        verbose_name = "Повідомлення про наявність"
        verbose_name_plural = "Повідомлення про наявність"

    def __str__(self):
        return f"{self.email} → {self.product.name}"
