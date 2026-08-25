import base64
import io
import logging

import qrcode
from django.contrib import admin
from django.contrib.admin.views.decorators import staff_member_required
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.db import DatabaseError
from django.db.models import Count, F, Sum
from django.http import HttpRequest, HttpResponse
from django.shortcuts import redirect, render
from django.urls import path
from django.utils import timezone
from django.views.decorators.cache import never_cache
from django.views.decorators.csrf import csrf_protect
from django_otp import login as otp_login
from django_otp.plugins.otp_totp.admin import TOTPDeviceAdmin as BaseTOTPDeviceAdmin
from django_otp.plugins.otp_totp.models import TOTPDevice

logger = logging.getLogger("smartbot.security")

from .models import AllowedIP, AuditLog, User
from .role_admin import AdminOnlyMixin, UserManagementMixin


class SecuredAdminSite(admin.AdminSite):
    site_header = "SmartBot — Адміністрування"
    site_title = "SmartBot Admin"
    index_title = "Панель керування"

    # Disable AdminSite's final catch-all view so that our custom 2FA URLs
    # (/admin/2fa/setup/ and /admin/2fa/verify/) are matched before the
    # catch-all redirect that would otherwise route them through admin_view().
    final_catch_all_view = False

    def staff_view(self, view, cacheable=False):
        def inner(request, *args, **kwargs):
            return view(request, *args, **kwargs)

        if not cacheable:
            inner = never_cache(inner)
        if not getattr(view, "csrf_exempt", False):
            inner = csrf_protect(inner)
        inner = staff_member_required(inner)
        return inner

    def get_urls(self):
        return [
            *super().get_urls(),
            path("2fa/setup/", self.staff_view(self._setup_2fa), name="2fa_setup"),
            path("2fa/verify/", self.staff_view(self._verify_2fa), name="2fa_verify"),
        ]

    def has_permission(self, request: HttpRequest) -> bool:
        if not super().has_permission(request):
            return False
        try:
            if not TOTPDevice.objects.devices_for_user(request.user, confirmed=True).exists():
                return False
            return getattr(request.user, "is_verified", lambda: False)()
        except DatabaseError:
            logger.exception("2FA permission: database error")
            return False
        except Exception:
            logger.exception("2FA permission: unexpected error")
            return False

    def index(self, request, extra_context=None):
        from orders.models import Order, OrderItem
        from shop.models import Product

        now = timezone.now()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        week_start = now - timezone.timedelta(days=7)

        paid_statuses = ["paid", "shipped", "delivered"]

        total_orders = Order.objects.count()
        orders_today = Order.objects.filter(created_at__gte=today_start).count()
        orders_pending = Order.objects.filter(status="pending").count()

        total_revenue = Order.objects.filter(status__in=paid_statuses).aggregate(s=Sum("total_amount"))["s"] or 0
        revenue_today = Order.objects.filter(status__in=paid_statuses, created_at__gte=today_start).aggregate(s=Sum("total_amount"))["s"] or 0
        revenue_week = Order.objects.filter(status__in=paid_statuses, created_at__gte=week_start).aggregate(s=Sum("total_amount"))["s"] or 0
        revenue_month = Order.objects.filter(status__in=paid_statuses, created_at__gte=month_start).aggregate(s=Sum("total_amount"))["s"] or 0

        total_users = User.objects.count()
        users_today = User.objects.filter(date_joined__gte=today_start).count()

        total_products = Product.objects.filter(is_active=True).count()
        products_low_stock = Product.objects.filter(is_active=True, stock__lte=5).count()
        products_zero_stock = Product.objects.filter(is_active=True, stock=0).count()

        recent_orders = Order.objects.select_related("user").order_by("-created_at")[:15]
        pending_orders = Order.objects.select_related("user").filter(status="pending").order_by("-created_at")[:10]
        zero_stock_products = Product.objects.filter(is_active=True, stock=0).order_by("name")[:10]

        top_products = (
            OrderItem.objects
            .values("product_name")
            .annotate(sold=Sum("quantity"), revenue=Sum(F("product_price") * F("quantity")))
            .order_by("-sold")[:10]
        )

        extra_context = extra_context or {}
        extra_context.update({
            "total_orders": total_orders,
            "orders_today": orders_today,
            "orders_pending": orders_pending,
            "total_revenue": total_revenue,
            "revenue_today": revenue_today,
            "revenue_week": revenue_week,
            "revenue_month": revenue_month,
            "total_users": total_users,
            "users_today": users_today,
            "total_products": total_products,
            "products_low_stock": products_low_stock,
            "products_zero_stock": products_zero_stock,
            "recent_orders": recent_orders,
            "pending_orders": pending_orders,
            "zero_stock_products": zero_stock_products,
            "top_products": top_products,
        })

        return super().index(request, extra_context=extra_context)

    def login(self, request: HttpRequest, extra_context=None) -> HttpResponse:
        if request.method == "GET" and request.user.is_authenticated and request.user.is_staff:
            try:
                if not TOTPDevice.objects.devices_for_user(request.user, confirmed=True).exists():
                    return redirect(f"{self.name}:2fa_setup")
                if not getattr(request.user, "is_verified", lambda: False)():
                    return redirect(f"{self.name}:2fa_verify")
            except Exception:
                logger.exception("2FA login GET redirect error")
        response = super().login(request, extra_context)
        if response.status_code == 302 and request.user.is_authenticated and request.user.is_staff:
            try:
                if not TOTPDevice.objects.devices_for_user(request.user, confirmed=True).exists():
                    return redirect(f"{self.name}:2fa_setup")
                if not getattr(request.user, "is_verified", lambda: False)():
                    return redirect(f"{self.name}:2fa_verify")
            except Exception:
                logger.exception("2FA post-login redirect error")
        return response

    def _get_or_create_unconfirmed_device(self, user):
        try:
            device = TOTPDevice.objects.devices_for_user(user, confirmed=False).first()
            if not device:
                device = TOTPDevice.objects.create(user=user, name="Admin", confirmed=False)
            # Збільшуємо допуск на часові розходження (1 крок = 30 сек).
            device.tolerance = 3
            return device
        except DatabaseError:
            logger.exception("2FA setup: cannot create TOTP device")
            return None

    def _generate_qr_base64(self, config_url: str) -> str:
        qr = qrcode.make(config_url)
        bio = io.BytesIO()
        qr.save(bio, format="PNG")
        return base64.b64encode(bio.getvalue()).decode()

    def _setup_2fa(self, request: HttpRequest) -> HttpResponse:
        try:
            already_set = (
                TOTPDevice.objects.devices_for_user(request.user, confirmed=True).exists()
                and getattr(request.user, "is_verified", lambda: False)()
            )
        except DatabaseError:
            logger.exception("2FA setup: database error")
            return render(request, "admin/setup_2fa.html", {
                "error": "Помилка бази даних. Запустіть python manage.py migrate.",
            })
        if already_set:
            return redirect(f"{self.name}:index")

        if request.method == "POST":
            device_id = request.POST.get("device_id", "").strip()
            token = request.POST.get("otp_code", "").strip()
            try:
                if device_id:
                    device = TOTPDevice.objects.get(pk=device_id, user=request.user, confirmed=False)
                else:
                    device = self._get_or_create_unconfirmed_device(request.user)
            except (TOTPDevice.DoesNotExist, ValueError):
                device = self._get_or_create_unconfirmed_device(request.user)
            except DatabaseError:
                logger.exception("2FA setup: database error")
                return render(request, "admin/setup_2fa.html", {
                    "error": "Помилка бази даних. Запустіть python manage.py migrate.",
                })

            if not device:
                return render(request, "admin/setup_2fa.html", {
                    "error": "Помилка бази даних. Запустіть python manage.py migrate.",
                })

            if device.verify_token(token):
                device.confirmed = True
                device.save()
                otp_login(request, device)
                request.session.save()
                return redirect(f"{self.name}:index")

            qr_code = self._generate_qr_base64(device.config_url)
            return render(request, "admin/setup_2fa.html", {
                "qr_code": qr_code,
                "device_id": device.pk,
                "error": "Невірний код. Спробуйте ще раз.",
            })

        device = self._get_or_create_unconfirmed_device(request.user)
        if not device:
            return render(request, "admin/setup_2fa.html", {
                "error": "Помилка бази даних. Запустіть python manage.py migrate.",
            })

        qr_code = self._generate_qr_base64(device.config_url)
        return render(request, "admin/setup_2fa.html", {
            "qr_code": qr_code,
            "device_id": device.pk,
        })

    def _verify_2fa(self, request: HttpRequest) -> HttpResponse:
        try:
            has_device = TOTPDevice.objects.devices_for_user(request.user, confirmed=True).exists()
        except DatabaseError:
            logger.exception("2FA verify: database error")
            return render(request, "admin/verify_2fa.html", {
                "error": "Помилка бази даних. Запустіть python manage.py migrate.",
            })
        if not has_device:
            return redirect(f"{self.name}:2fa_setup")
        if getattr(request.user, "is_verified", lambda: False)():
            return redirect(f"{self.name}:index")

        try:
            device = TOTPDevice.objects.devices_for_user(request.user, confirmed=True).first()
        except DatabaseError:
            logger.exception("2FA verify: database error")
            return render(request, "admin/verify_2fa.html", {
                "error": "Помилка бази даних. Запустіть python manage.py migrate.",
            })

        if device:
            # Збільшуємо допуск на часові розходження для раніше створених пристроїв.
            device.tolerance = 3
            device.save(update_fields=["tolerance"])

        if request.method == "POST":
            token = request.POST.get("otp_code", "").strip()
            if device and device.verify_token(token):
                otp_login(request, device)
                request.session.save()
                return redirect(f"{self.name}:index")
            return render(request, "admin/verify_2fa.html", {
                "error": "Невірний код. Спробуйте ще раз.",
            })

        return render(request, "admin/verify_2fa.html")


secured_admin_site = SecuredAdminSite(name="secured_admin")


class UserAdmin(UserManagementMixin, BaseUserAdmin):
    list_display = ("email", "name", "phone", "role_badge", "is_active", "orders_count", "date_joined")
    list_filter = ("role", "is_active", "is_staff", "oauth_provider")
    search_fields = ("email", "name", "phone")
    ordering = ("-date_joined",)
    list_per_page = 25
    actions = ["activate_users", "deactivate_users", "set_role_customer", "set_role_support"]

    fieldsets = (
        ("Обліковий запис", {"fields": ("username", "email", "password")}),
        ("Особисті дані", {"fields": ("name", "phone", "avatar")}),
        ("Роль та доступ", {"fields": ("role", "is_active", "is_staff", "is_superuser", "groups", "user_permissions")}),
        ("OAuth", {"fields": ("oauth_provider",), "classes": ("collapse",)}),
        ("Дати", {"fields": ("last_login", "date_joined"), "classes": ("collapse",)}),
    )
    add_fieldsets = (
        (None, {
            "classes": ("wide",),
            "fields": ("username", "email", "name", "phone", "role", "password1", "password2"),
        }),
    )
    readonly_fields = ("last_login", "date_joined")

    def role_badge(self, obj):
        from django.utils.html import format_html
        colors = {
            "administrator": ("#dc2626", "#fee2e2"),
            "moderator": ("#7c3aed", "#ede9fe"),
            "editor": ("#2563eb", "#dbeafe"),
            "support": ("#d97706", "#fef3c7"),
            "customer": ("#374151", "#f3f4f6"),
        }
        bg, fg = colors.get(obj.role, ("#374151", "#f3f4f6"))
        return format_html(
            '<span style="background:{};color:{};padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600">{}</span>',
            fg, bg, obj.get_role_display()
        )
    role_badge.short_description = "Роль"

    def orders_count(self, obj):
        from django.utils.html import format_html
        count = obj.orders.count()
        if count == 0:
            return "0"
        return format_html(
            '<a href="/admin/orders/order/?user__id__exact={}" style="font-weight:600;color:#60a5fa">{}</a>',
            obj.pk, count
        )
    orders_count.short_description = "Замовлень"

    def activate_users(self, request, queryset):
        queryset.update(is_active=True)
    activate_users.short_description = "Активувати обрані акаунти"

    def deactivate_users(self, request, queryset):
        queryset.update(is_active=False)
    deactivate_users.short_description = "Деактивувати обрані акаунти"

    def set_role_customer(self, request, queryset):
        queryset.update(role="customer")
    set_role_customer.short_description = "Роль: Покупець"

    def set_role_support(self, request, queryset):
        queryset.update(role="support")
    set_role_support.short_description = "Роль: Підтримка"


class AuditLogAdmin(AdminOnlyMixin, admin.ModelAdmin):
    list_display = ("timestamp", "user_link", "action_colored", "ip_address")
    list_filter = ("timestamp",)
    search_fields = ("user__email", "ip_address", "action")
    readonly_fields = ("user", "action", "ip_address", "timestamp", "changes_json")
    ordering = ("-timestamp",)
    list_per_page = 50
    date_hierarchy = "timestamp"

    def user_link(self, obj):
        from django.utils.html import format_html
        if obj.user:
            return format_html('<span style="font-weight:500">{}</span>', obj.user.email)
        return "—"
    user_link.short_description = "Користувач"

    def action_colored(self, obj):
        from django.utils.html import format_html
        action = obj.action or ""
        if "DELETE" in action:
            color = "#ef4444"
        elif "CREATE" in action or "ADD" in action:
            color = "#22c55e"
        elif "UPDATE" in action or "CHANGE" in action:
            color = "#3b82f6"
        elif "IMPERSONATE" in action:
            color = "#a855f7"
        elif "REFUND" in action:
            color = "#f97316"
        else:
            color = "#6b7280"
        return format_html('<span style="color:{};font-weight:500">{}</span>', color, action)
    action_colored.short_description = "Дія"

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return request.user.is_superuser


class AllowedIPAdmin(AdminOnlyMixin, admin.ModelAdmin):
    list_display = ("ip_address", "description", "created_at")
    search_fields = ("ip_address", "description")
    list_per_page = 50


class TOTPDeviceAdmin(BaseTOTPDeviceAdmin):
    list_display = ("user", "name", "confirmed")
    list_filter = ("confirmed",)


secured_admin_site.register(User, UserAdmin)
secured_admin_site.register(AuditLog, AuditLogAdmin)
secured_admin_site.register(AllowedIP, AllowedIPAdmin)
secured_admin_site.register(TOTPDevice, TOTPDeviceAdmin)
