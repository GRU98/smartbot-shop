from decimal import Decimal

from rest_framework import serializers

from accounts.models import AuditLog, User
from orders.models import Order, OrderItem, OrderStatusHistory
from shop.models import Category, Product, ProductImage


class AdminProductImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductImage
        fields = ["id", "url", "alt", "position"]


class AdminProductSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True)
    images = AdminProductImageSerializer(many=True, read_only=True)
    avg_rating = serializers.FloatField(read_only=True, default=None)
    review_count = serializers.IntegerField(read_only=True, default=0)
    total_sold = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = Product
        fields = [
            "id", "name", "slug", "brand", "description", "specs", "price",
            "stock", "image", "category", "category_name", "is_active",
            "is_featured", "images", "avg_rating", "review_count", "total_sold",
            "created_at", "updated_at",
        ]
        extra_kwargs = {
            "slug": {"required": False},
            "description": {"required": False, "allow_blank": True},
            "brand": {"required": False, "allow_blank": True},
            "image": {"required": False, "allow_blank": True},
        }


class AdminProductBulkUpdateSerializer(serializers.Serializer):
    ids = serializers.ListField(child=serializers.IntegerField(), min_length=1)
    price_change_percent = serializers.DecimalField(
        max_digits=6, decimal_places=2, required=False, allow_null=True,
    )
    stock_delta = serializers.IntegerField(required=False, allow_null=True)
    is_active = serializers.BooleanField(required=False, allow_null=True)
    is_featured = serializers.BooleanField(required=False, allow_null=True)
    category = serializers.IntegerField(required=False, allow_null=True)


class AdminOrderItemSerializer(serializers.ModelSerializer):
    line_total = serializers.SerializerMethodField()

    class Meta:
        model = OrderItem
        fields = ["id", "product_id", "product_name", "product_price", "quantity", "line_total"]

    def get_line_total(self, obj):
        return str(obj.product_price * obj.quantity)


class AdminOrderStatusHistorySerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = OrderStatusHistory
        fields = ["id", "status", "status_display", "comment", "created_at"]


class AdminOrderSerializer(serializers.ModelSerializer):
    items = AdminOrderItemSerializer(many=True, read_only=True)
    status_history = AdminOrderStatusHistorySerializer(many=True, read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    user_email = serializers.CharField(source="user.email", read_only=True)
    user_name = serializers.CharField(source="user.name", read_only=True)
    coupon_code = serializers.CharField(source="coupon.code", read_only=True, allow_null=True)
    invoice_pdf_url = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = [
            "id", "user_email", "user_name", "status", "status_display",
            "total_amount", "discount_amount", "coupon_code",
            "delivery_full_name", "delivery_phone", "delivery_city",
            "delivery_address", "delivery_post_office",
            "stripe_session_id", "stripe_payment_intent",
            "invoice_pdf_url", "items", "status_history",
            "created_at", "updated_at",
        ]

    def get_invoice_pdf_url(self, obj):
        if obj.invoice_pdf:
            request = self.context.get("request")
            if request:
                return request.build_absolute_uri(obj.invoice_pdf.url)
            return obj.invoice_pdf.url
        return None


class AdminUserSerializer(serializers.ModelSerializer):
    orders_count = serializers.IntegerField(read_only=True, default=0)
    orders_total = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True, default=Decimal("0"))

    class Meta:
        model = User
        fields = [
            "id", "email", "name", "phone", "role", "is_active",
            "is_staff", "date_joined", "last_login",
            "orders_count", "orders_total",
        ]
        extra_kwargs = {
            "email": {"read_only": True},
            "date_joined": {"read_only": True},
            "last_login": {"read_only": True},
        }


class AdminAuditLogSerializer(serializers.ModelSerializer):
    user_email = serializers.CharField(source="user.email", read_only=True, allow_null=True)

    class Meta:
        model = AuditLog
        fields = ["id", "user_email", "action", "ip_address", "timestamp", "changes_json"]
