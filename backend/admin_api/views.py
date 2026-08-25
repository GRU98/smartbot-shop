import logging
from datetime import timedelta
from decimal import Decimal

import stripe
from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import Avg, Count, DecimalField, Q, Sum
from django.db.models.functions import Coalesce, TruncDay
from django.utils import timezone
from rest_framework import status
from rest_framework.pagination import PageNumberPagination
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.models import AuditLog
from accounts.permissions import IsAdministrator, IsEditor, IsModerator, IsSupport
from django.conf import settings
from orders.models import Order, OrderItem, OrderStatusHistory
from shop.models import Category, Product

from .serializers import (
    AdminAuditLogSerializer,
    AdminOrderSerializer,
    AdminProductBulkUpdateSerializer,
    AdminProductSerializer,
    AdminUserSerializer,
)

logger = logging.getLogger("smartbot.admin_api")
User = get_user_model()

stripe.api_key = settings.STRIPE_SECRET_KEY


class AdminPagination(PageNumberPagination):
    page_size = 25
    page_size_query_param = "page_size"
    max_page_size = 200


class DashboardStatsView(APIView):
    permission_classes = [IsAdministrator | IsModerator | IsSupport]

    def get(self, request: Request) -> Response:
        period = request.query_params.get("period", "month")
        now = timezone.now()
        if period == "week":
            since = now - timedelta(days=7)
        elif period == "year":
            since = now - timedelta(days=365)
        else:
            since = now - timedelta(days=30)

        paid_orders = Order.objects.filter(status=Order.Status.PAID)
        recent_paid = paid_orders.filter(created_at__gte=since)

        revenue = recent_paid.aggregate(
            total=Coalesce(Sum("total_amount"), Decimal("0"), output_field=DecimalField())
        )["total"]
        orders_count = recent_paid.count()
        new_users = User.objects.filter(date_joined__gte=since).count()
        avg_order = recent_paid.aggregate(
            avg=Coalesce(Avg("total_amount"), Decimal("0"), output_field=DecimalField())
        )["avg"]

        pending_count = Order.objects.filter(status=Order.Status.PENDING).count()
        low_stock = Product.objects.filter(is_active=True, stock__lte=5).count()

        daily = (
            recent_paid
            .annotate(day=TruncDay("created_at"))
            .values("day")
            .annotate(revenue=Sum("total_amount"), count=Count("id"))
            .order_by("day")
        )

        status_breakdown = (
            Order.objects
            .filter(created_at__gte=since)
            .values("status")
            .annotate(count=Count("id"))
        )

        top_products = (
            OrderItem.objects
            .filter(order__status=Order.Status.PAID, order__created_at__gte=since)
            .values("product_name")
            .annotate(sold=Sum("quantity"), revenue=Sum("product_price"))
            .order_by("-sold")[:10]
        )

        return Response({
            "revenue": str(revenue),
            "orders_count": orders_count,
            "new_users": new_users,
            "avg_order": str(avg_order),
            "pending_count": pending_count,
            "low_stock_count": low_stock,
            "daily_chart": [
                {
                    "date": d["day"].strftime("%Y-%m-%d"),
                    "revenue": str(d["revenue"]),
                    "count": d["count"],
                }
                for d in daily
            ],
            "status_breakdown": list(status_breakdown),
            "top_products": list(top_products),
        })


class AdminProductListCreateView(APIView):
    permission_classes = [IsAdministrator | IsEditor]
    pagination_class = AdminPagination

    def get(self, request: Request) -> Response:
        qs = (
            Product.objects
            .select_related("category")
            .prefetch_related("images")
            .annotate(
                avg_rating=Avg("reviews__rating"),
                review_count=Count("reviews", distinct=True),
                total_sold=Coalesce(Sum("order_items__quantity"), 0),
            )
            .order_by("-created_at")
        )

        search = request.query_params.get("search")
        if search:
            qs = qs.filter(Q(name__icontains=search) | Q(brand__icontains=search))

        category = request.query_params.get("category")
        if category:
            qs = qs.filter(category_id=category)

        stock_status = request.query_params.get("stock_status")
        if stock_status == "low":
            qs = qs.filter(stock__lte=5)
        elif stock_status == "out":
            qs = qs.filter(stock=0)

        is_active = request.query_params.get("is_active")
        if is_active is not None:
            qs = qs.filter(is_active=is_active.lower() in ("true", "1"))

        paginator = AdminPagination()
        page = paginator.paginate_queryset(qs, request)
        serializer = AdminProductSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)

    def post(self, request: Request) -> Response:
        serializer = AdminProductSerializer(data=request.data)
        if serializer.is_valid():
            product = serializer.save()
            logger.info("Admin %s created product #%s", request.user.email, product.id)
            return Response(AdminProductSerializer(product).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class AdminProductDetailView(APIView):
    permission_classes = [IsAdministrator | IsEditor]

    def _get_product(self, pk):
        try:
            return Product.objects.select_related("category").prefetch_related("images").get(pk=pk)
        except Product.DoesNotExist:
            return None

    def get(self, request: Request, pk: int) -> Response:
        product = self._get_product(pk)
        if not product:
            return Response({"detail": "Не знайдено."}, status=status.HTTP_404_NOT_FOUND)
        return Response(AdminProductSerializer(product).data)

    def patch(self, request: Request, pk: int) -> Response:
        product = self._get_product(pk)
        if not product:
            return Response({"detail": "Не знайдено."}, status=status.HTTP_404_NOT_FOUND)
        old = {"price": str(product.price), "stock": product.stock, "is_active": product.is_active}
        serializer = AdminProductSerializer(product, data=request.data, partial=True)
        if serializer.is_valid():
            product = serializer.save()
            new = {"price": str(product.price), "stock": product.stock, "is_active": product.is_active}
            AuditLog.objects.create(
                user=request.user,
                action=f"UPDATE product #{product.id} ({product.name})",
                ip_address=request.META.get("REMOTE_ADDR"),
                changes_json={"old": old, "new": new},
            )
            return Response(AdminProductSerializer(product).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request: Request, pk: int) -> Response:
        product = self._get_product(pk)
        if not product:
            return Response({"detail": "Не знайдено."}, status=status.HTTP_404_NOT_FOUND)
        name = product.name
        product.delete()
        AuditLog.objects.create(
            user=request.user,
            action=f"DELETE product #{pk} ({name})",
            ip_address=request.META.get("REMOTE_ADDR"),
        )
        return Response(status=status.HTTP_204_NO_CONTENT)


class AdminProductBulkUpdateView(APIView):
    permission_classes = [IsAdministrator | IsEditor]

    def patch(self, request: Request) -> Response:
        serializer = AdminProductBulkUpdateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        ids = data["ids"]
        products = Product.objects.filter(id__in=ids)
        updated = 0

        with transaction.atomic():
            for product in products:
                changed = False
                if data.get("price_change_percent") is not None:
                    factor = 1 + data["price_change_percent"] / Decimal("100")
                    product.price = (product.price * factor).quantize(Decimal("0.01"))
                    changed = True
                if data.get("stock_delta") is not None:
                    product.stock = max(0, product.stock + data["stock_delta"])
                    changed = True
                if data.get("is_active") is not None:
                    product.is_active = data["is_active"]
                    changed = True
                if data.get("is_featured") is not None:
                    product.is_featured = data["is_featured"]
                    changed = True
                if data.get("category") is not None:
                    try:
                        product.category_id = data["category"]
                        changed = True
                    except Exception:
                        pass
                if changed:
                    product.save()
                    updated += 1

        AuditLog.objects.create(
            user=request.user,
            action=f"BULK_UPDATE products ids={ids}",
            ip_address=request.META.get("REMOTE_ADDR"),
            changes_json={"ids": ids, "payload": {k: str(v) for k, v in data.items() if k != "ids"}},
        )
        return Response({"updated": updated})


class AdminOrderListView(APIView):
    permission_classes = [IsAdministrator | IsModerator | IsSupport]

    def get(self, request: Request) -> Response:
        qs = (
            Order.objects
            .select_related("user", "coupon")
            .prefetch_related("items", "status_history")
            .order_by("-created_at")
        )

        status_filter = request.query_params.get("status")
        if status_filter:
            qs = qs.filter(status=status_filter)

        search = request.query_params.get("search")
        if search:
            qs = qs.filter(
                Q(user__email__icontains=search)
                | Q(user__name__icontains=search)
                | Q(delivery_full_name__icontains=search)
                | Q(id__icontains=search)
            )

        date_from = request.query_params.get("date_from")
        if date_from:
            qs = qs.filter(created_at__date__gte=date_from)
        date_to = request.query_params.get("date_to")
        if date_to:
            qs = qs.filter(created_at__date__lte=date_to)

        paginator = AdminPagination()
        page = paginator.paginate_queryset(qs, request)
        serializer = AdminOrderSerializer(page, many=True, context={"request": request})
        return paginator.get_paginated_response(serializer.data)


class AdminOrderDetailView(APIView):
    permission_classes = [IsAdministrator | IsModerator | IsSupport]

    def get(self, request: Request, pk: int) -> Response:
        try:
            order = (
                Order.objects
                .select_related("user", "coupon")
                .prefetch_related("items", "status_history")
                .get(pk=pk)
            )
        except Order.DoesNotExist:
            return Response({"detail": "Не знайдено."}, status=status.HTTP_404_NOT_FOUND)
        return Response(AdminOrderSerializer(order, context={"request": request}).data)


class AdminOrderChangeStatusView(APIView):
    permission_classes = [IsAdministrator | IsModerator]

    def patch(self, request: Request, pk: int) -> Response:
        try:
            order = Order.objects.select_related("user").get(pk=pk)
        except Order.DoesNotExist:
            return Response({"detail": "Не знайдено."}, status=status.HTTP_404_NOT_FOUND)

        new_status = request.data.get("status")
        if new_status not in Order.Status.values:
            return Response(
                {"detail": f"Невалідний статус. Доступні: {Order.Status.values}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        comment = request.data.get("comment", "")
        old_status = order.status
        order.set_status(new_status, comment=comment)

        AuditLog.objects.create(
            user=request.user,
            action=f"CHANGE_STATUS order #{pk}",
            ip_address=request.META.get("REMOTE_ADDR"),
            changes_json={"old": old_status, "new": new_status, "comment": comment},
        )
        return Response(AdminOrderSerializer(order, context={"request": request}).data)


class AdminOrderRefundView(APIView):
    permission_classes = [IsAdministrator | IsModerator]

    def post(self, request: Request, pk: int) -> Response:
        try:
            order = Order.objects.prefetch_related("items__product").get(pk=pk)
        except Order.DoesNotExist:
            return Response({"detail": "Не знайдено."}, status=status.HTTP_404_NOT_FOUND)

        if order.status == Order.Status.CANCELLED:
            return Response({"detail": "Замовлення вже скасовано."}, status=status.HTTP_400_BAD_REQUEST)
        if not order.stripe_payment_intent:
            return Response({"detail": "Stripe payment intent відсутній."}, status=status.HTTP_400_BAD_REQUEST)

        amount_cents = request.data.get("amount")
        refund_params = {"payment_intent": order.stripe_payment_intent}
        if amount_cents is not None:
            refund_params["amount"] = int(Decimal(str(amount_cents)) * 100)

        try:
            refund = stripe.Refund.create(**refund_params)
        except stripe.error.StripeError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_502_BAD_GATEWAY)

        with transaction.atomic():
            for item in order.items.select_related("product"):
                if item.product:
                    prod = Product.objects.select_for_update().get(id=item.product.id)
                    prod.stock += item.quantity
                    prod.save(update_fields=["stock"])
            order.set_status(Order.Status.CANCELLED, comment=f"Refund {refund.id}")

        AuditLog.objects.create(
            user=request.user,
            action=f"REFUND order #{pk}",
            ip_address=request.META.get("REMOTE_ADDR"),
            changes_json={"refund_id": refund.id, "amount": amount_cents},
        )
        return Response({"refund_id": refund.id, "status": refund.status})


class AdminUserListView(APIView):
    permission_classes = [IsAdministrator | IsModerator | IsSupport]

    def get(self, request: Request) -> Response:
        qs = (
            User.objects
            .annotate(
                orders_count=Count("orders", distinct=True),
                orders_total=Coalesce(
                    Sum("orders__total_amount", filter=Q(orders__status=Order.Status.PAID)),
                    Decimal("0"),
                    output_field=DecimalField(),
                ),
            )
            .order_by("-date_joined")
        )

        search = request.query_params.get("search")
        if search:
            qs = qs.filter(Q(email__icontains=search) | Q(name__icontains=search))

        role = request.query_params.get("role")
        if role:
            qs = qs.filter(role=role)

        paginator = AdminPagination()
        page = paginator.paginate_queryset(qs, request)
        serializer = AdminUserSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)


class AdminUserDetailView(APIView):
    permission_classes = [IsAdministrator]

    def patch(self, request: Request, pk: int) -> Response:
        try:
            user = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response({"detail": "Не знайдено."}, status=status.HTTP_404_NOT_FOUND)

        allowed_fields = {"role", "is_active", "name", "phone"}
        data = {k: v for k, v in request.data.items() if k in allowed_fields}
        serializer = AdminUserSerializer(user, data=data, partial=True)
        if serializer.is_valid():
            serializer.save()
            AuditLog.objects.create(
                user=request.user,
                action=f"UPDATE user #{pk}",
                ip_address=request.META.get("REMOTE_ADDR"),
                changes_json=data,
            )
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class AdminImpersonateView(APIView):
    permission_classes = [IsAdministrator]

    def post(self, request: Request, pk: int) -> Response:
        if request.user.id == pk:
            return Response({"detail": "Не можна увійти під своїм акаунтом."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            target = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response({"detail": "Користувача не знайдено."}, status=status.HTTP_404_NOT_FOUND)

        refresh = RefreshToken.for_user(target)
        refresh["impersonated_by"] = request.user.id

        AuditLog.objects.create(
            user=request.user,
            action=f"IMPERSONATE user #{pk} ({target.email})",
            ip_address=request.META.get("REMOTE_ADDR"),
        )
        return Response({
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "impersonated_user": {
                "id": target.id,
                "email": target.email,
                "name": target.name,
            },
        })


class AdminAuditLogListView(APIView):
    permission_classes = [IsAdministrator]

    def get(self, request: Request) -> Response:
        qs = AuditLog.objects.select_related("user").order_by("-timestamp")

        user_id = request.query_params.get("user_id")
        if user_id:
            qs = qs.filter(user_id=user_id)

        action = request.query_params.get("action")
        if action:
            qs = qs.filter(action__icontains=action)

        ip = request.query_params.get("ip")
        if ip:
            qs = qs.filter(ip_address=ip)

        date_from = request.query_params.get("date_from")
        if date_from:
            qs = qs.filter(timestamp__date__gte=date_from)

        paginator = AdminPagination()
        page = paginator.paginate_queryset(qs, request)
        serializer = AdminAuditLogSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)
