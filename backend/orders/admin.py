from django.contrib import admin
from django.utils.html import format_html
from import_export import resources, fields
from import_export.admin import ImportExportModelAdmin
from import_export.widgets import ForeignKeyWidget

from accounts.admin import secured_admin_site
from accounts.role_admin import OrderMixin

from .models import Order, OrderItem, OrderStatusHistory


class OrderResource(resources.ModelResource):
    user_email = fields.Field(column_name="email", attribute="user__email")
    user_name = fields.Field(column_name="ім'я", attribute="user__name")
    coupon_code = fields.Field(column_name="купон", attribute="coupon__code")

    class Meta:
        model = Order
        fields = (
            "id", "user_email", "user_name", "status",
            "total_amount", "discount_amount", "coupon_code",
            "delivery_city", "delivery_post_office", "created_at",
        )
        export_order = fields


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    can_delete = False
    readonly_fields = ("product", "product_name", "product_price", "quantity", "line_total_display")
    fields = ("product_name", "product_price", "quantity", "line_total_display")

    def line_total_display(self, obj):
        if obj.product_price is None or obj.quantity is None:
            return "—"
        return format_html('<b>{} грн</b>', f"{obj.line_total:,.0f}".replace(",", " "))
    line_total_display.short_description = "Сума"

    def has_add_permission(self, request, obj=None):
        return False


class OrderStatusHistoryInline(admin.TabularInline):
    model = OrderStatusHistory
    extra = 0
    can_delete = False
    readonly_fields = ("status", "comment", "created_at")
    fields = ("status", "comment", "created_at")

    def has_add_permission(self, request, obj=None):
        return False


class OrderAdmin(OrderMixin, ImportExportModelAdmin):
    resource_classes = [OrderResource]
    list_display = (
        "order_number", "user_email", "status_badge",
        "total_display", "items_count", "delivery_city", "delivery_phone", "created_at",
    )
    list_filter = ("status", "created_at")
    search_fields = ("user__email", "user__name", "delivery_full_name", "id", "stripe_payment_intent")
    ordering = ("-created_at",)
    inlines = [OrderItemInline, OrderStatusHistoryInline]
    list_per_page = 25
    date_hierarchy = "created_at"
    actions = ["mark_paid", "mark_shipped", "mark_delivered", "mark_cancelled"]

    readonly_fields = (
        "user", "total_amount", "discount_amount", "coupon",
        "stripe_session_id", "stripe_payment_intent",
        "invoice_pdf", "invoice_link",
        "created_at", "updated_at",
    )

    fieldsets = (
        ("Замовлення", {
            "fields": ("user", "status", "created_at", "updated_at"),
        }),
        ("Оплата", {
            "fields": ("total_amount", "discount_amount", "coupon", "stripe_session_id", "stripe_payment_intent"),
        }),
        ("Доставка", {
            "fields": (
                "delivery_full_name", "delivery_phone",
                "delivery_city", "delivery_address", "delivery_post_office",
            ),
        }),
        ("Чек", {
            "fields": ("invoice_pdf", "invoice_link"),
        }),
    )

    def order_number(self, obj):
        return format_html('<b>#{}</b>', obj.id)
    order_number.short_description = "№"

    def user_email(self, obj):
        return obj.user.email if obj.user else "—"
    user_email.short_description = "Клієнт"

    def status_badge(self, obj):
        cfg = {
            "pending":   ("#fef3c7", "#92400e", "Очікує"),
            "paid":      ("#dcfce7", "#14532d", "Оплачено"),
            "shipped":   ("#dbeafe", "#1e3a8a", "Відправлено"),
            "delivered": ("#d1fae5", "#064e3b", "Доставлено"),
            "cancelled": ("#fee2e2", "#7f1d1d", "Скасовано"),
            "failed":    ("#fee2e2", "#7f1d1d", "Помилка"),
        }
        bg, color, label = cfg.get(obj.status, ("#f3f4f6", "#374151", obj.status))
        return format_html(
            '<span style="background:{};color:{};padding:3px 10px;border-radius:5px;font-size:12px;font-weight:600;white-space:nowrap">{}</span>',
            bg, color, label,
        )
    status_badge.short_description = "Статус"

    def total_display(self, obj):
        return format_html('<b>{} грн</b>', f"{obj.total_amount:,.0f}".replace(",", " "))
    total_display.short_description = "Сума"

    def items_count(self, obj):
        return obj.items.count()
    items_count.short_description = "Поз."

    def invoice_link(self, obj):
        if obj.invoice_pdf:
            return format_html('<a href="{}" target="_blank">Скачати PDF</a>', obj.invoice_pdf.url)
        return "—"
    invoice_link.short_description = "Чек"

    def mark_paid(self, request, queryset):
        for o in queryset.filter(status="pending"):
            o.set_status("paid", comment="Вручну адміном")
    mark_paid.short_description = "Позначити як оплачено"

    def mark_shipped(self, request, queryset):
        for o in queryset.filter(status="paid"):
            o.set_status("shipped", comment="Вручну адміном")
    mark_shipped.short_description = "Позначити як відправлено"

    def mark_delivered(self, request, queryset):
        for o in queryset.filter(status="shipped"):
            o.set_status("delivered", comment="Вручну адміном")
    mark_delivered.short_description = "Позначити як доставлено"

    def mark_cancelled(self, request, queryset):
        for o in queryset.exclude(status__in=["delivered", "shipped"]):
            o.set_status("cancelled", comment="Вручну адміном")
    mark_cancelled.short_description = "Скасувати"


secured_admin_site.register(Order, OrderAdmin)
