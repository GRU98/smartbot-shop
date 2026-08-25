from django import forms
from django.contrib import admin
from django.utils.html import format_html
from import_export import resources
from import_export.admin import ImportExportModelAdmin

from accounts.admin import secured_admin_site
from accounts.role_admin import AdminOnlyMixin, ProductEditorMixin, ReviewModerationMixin

from .models import Category, Coupon, Product, ProductImage, Review, StockAlert
from .widgets import SpecsWidget


class ProductResource(resources.ModelResource):
    class Meta:
        model = Product
        fields = (
            "id", "name", "brand", "category__name",
            "price", "stock", "is_active", "is_featured", "created_at",
        )
        export_order = fields


class ProductAdminForm(forms.ModelForm):
    class Meta:
        model = Product
        fields = "__all__"
        widgets = {"specs": SpecsWidget()}


class ProductImageInline(admin.TabularInline):
    model = ProductImage
    extra = 1
    fields = ("image_preview", "url", "alt", "position")
    readonly_fields = ("image_preview",)

    def image_preview(self, obj):
        if obj.url:
            return format_html('<img src="{}" style="height:48px;border-radius:4px;object-fit:cover">', obj.url)
        return "—"
    image_preview.short_description = "Вигляд"


class CategoryAdmin(ProductEditorMixin, admin.ModelAdmin):
    list_display = ("name", "slug", "product_count")
    prepopulated_fields = {"slug": ("name",)}
    search_fields = ("name",)

    def product_count(self, obj):
        cnt = obj.products.count()
        return format_html('<b>{}</b> товарів', cnt)
    product_count.short_description = "Товарів"


class ProductAdmin(ProductEditorMixin, ImportExportModelAdmin):
    resource_classes = [ProductResource]
    form = ProductAdminForm
    list_display = (
        "image_thumb", "name", "brand", "category",
        "price", "stock", "stock_status", "is_featured", "is_active", "created_at",
    )
    list_filter = ("category", "is_active", "is_featured", "brand")
    list_editable = ("price", "stock", "is_active", "is_featured")
    search_fields = ("name", "slug", "brand")
    prepopulated_fields = {"slug": ("name",)}
    inlines = [ProductImageInline]
    list_per_page = 25
    list_display_links = ("image_thumb", "name")
    actions = ["make_featured", "make_unfeatured", "activate", "deactivate", "add_stock_100"]

    fieldsets = (
        ("Основна інформація", {
            "fields": ("name", "slug", "brand", "category", "description"),
        }),
        ("Ціна та склад", {
            "fields": ("price", "stock", "is_active", "is_featured"),
            "description": "⚠️ Щоб товар відображався на сайті — увімкніть «Активний».",
        }),
        ("Зображення (URL)", {
            "fields": ("image",),
            "description": "Головне зображення товару. Додаткові — у блоці нижче.",
        }),
        ("Специфікації (JSON)", {
            "fields": ("specs",),
            "classes": ("collapse",),
        }),
    )

    def image_thumb(self, obj):
        if obj.image:
            return format_html('<img src="{}" style="height:40px;width:40px;object-fit:cover;border-radius:6px">', obj.image)
        return format_html('<div style="height:40px;width:40px;background:#1f2937;border-radius:6px;"></div>')
    image_thumb.short_description = ""

    def price_display(self, obj):
        return format_html('<b style="color:#22c55e">{} грн</b>', f"{obj.price:,.0f}".replace(",", " "))
    price_display.short_description = "Ціна"

    def stock_status(self, obj):
        if obj.stock == 0:
            return format_html('<span style="color:#ef4444;font-weight:700">—</span>')
        elif obj.stock <= 5:
            return format_html('<span style="color:#f59e0b;font-weight:700">!</span>')
        return format_html('<span style="color:#22c55e;font-weight:700">+</span>')
    stock_status.short_description = ""

    def make_featured(self, request, queryset):
        queryset.update(is_featured=True)
    make_featured.short_description = "Позначити як хіт/акція"

    def make_unfeatured(self, request, queryset):
        queryset.update(is_featured=False)
    make_unfeatured.short_description = "Зняти хіт"

    def activate(self, request, queryset):
        queryset.update(is_active=True)
    activate.short_description = "Активувати товари"

    def deactivate(self, request, queryset):
        queryset.update(is_active=False)
    deactivate.short_description = "Деактивувати товари"

    def add_stock_100(self, request, queryset):
        for p in queryset:
            p.stock += 100
            p.save(update_fields=["stock"])
    add_stock_100.short_description = "Додати +100 до залишку"


class ReviewAdmin(ReviewModerationMixin, admin.ModelAdmin):
    list_display = ("product", "user", "rating_stars", "short_text", "created_at")
    list_filter = ("rating", "created_at")
    search_fields = ("product__name", "user__email")
    readonly_fields = ("product", "user", "rating", "text", "created_at")
    list_per_page = 30

    def rating_stars(self, obj):
        stars = "★" * obj.rating + "☆" * (5 - obj.rating)
        colors = {1: "#ef4444", 2: "#f97316", 3: "#eab308", 4: "#84cc16", 5: "#22c55e"}
        return format_html('<span style="color:{};font-size:14px">{}</span>', colors.get(obj.rating, "#888"), stars)
    rating_stars.short_description = "Оцінка"

    def short_text(self, obj):
        return (obj.text[:60] + "…") if len(obj.text) > 60 else obj.text
    short_text.short_description = "Текст"


class CouponAdmin(AdminOnlyMixin, admin.ModelAdmin):
    list_display = ("code", "discount_type", "discount_value", "min_order_amount", "used_count", "max_uses", "is_active", "valid_to")
    list_filter = ("discount_type", "is_active")
    search_fields = ("code", "description")
    list_editable = ("is_active",)
    list_per_page = 25

    fieldsets = (
        ("Купон", {"fields": ("code", "description", "is_active")}),
        ("Знижка", {"fields": ("discount_type", "discount_value", "min_order_amount")}),
        ("Ліміти", {"fields": ("max_uses", "used_count", "valid_from", "valid_to")}),
    )
    readonly_fields = ("used_count",)


class StockAlertAdmin(AdminOnlyMixin, admin.ModelAdmin):
    list_display = ("email", "product", "notified", "created_at", "notified_at")
    list_filter = ("notified",)
    search_fields = ("email", "product__name")
    readonly_fields = ("user", "product", "email", "created_at", "notified_at")


secured_admin_site.register(Category, CategoryAdmin)
secured_admin_site.register(Product, ProductAdmin)
secured_admin_site.register(Review, ReviewAdmin)
secured_admin_site.register(Coupon, CouponAdmin)
secured_admin_site.register(StockAlert, StockAlertAdmin)
