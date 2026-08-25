from rest_framework import serializers

from .models import Order, OrderItem, OrderStatusHistory


class CheckoutItemSerializer(serializers.Serializer):
    product_id = serializers.IntegerField()
    quantity = serializers.IntegerField(min_value=1)


class CreateCheckoutSerializer(serializers.Serializer):
    items = serializers.ListField(
        child=CheckoutItemSerializer(),
        min_length=1,
        max_length=50,
    )
    delivery_full_name = serializers.CharField(max_length=255, required=False, allow_blank=True, default="")
    delivery_phone = serializers.CharField(max_length=20, required=False, allow_blank=True, default="")
    delivery_city = serializers.CharField(max_length=100, required=False, allow_blank=True, default="")
    delivery_address = serializers.CharField(max_length=500, required=False, allow_blank=True, default="")
    delivery_post_office = serializers.CharField(max_length=255, required=False, allow_blank=True, default="")
    delivery_lat = serializers.DecimalField(max_digits=10, decimal_places=7, required=False, allow_null=True)
    delivery_lng = serializers.DecimalField(max_digits=10, decimal_places=7, required=False, allow_null=True)
    coupon_code = serializers.CharField(max_length=50, required=False, allow_blank=True, default="")


class OrderStatusHistorySerializer(serializers.ModelSerializer):
    status_display = serializers.SerializerMethodField()

    class Meta:
        model = OrderStatusHistory
        fields = ("id", "status", "status_display", "comment", "created_at")
        read_only_fields = fields

    def get_status_display(self, obj):
        return obj.get_status_display()


class OrderItemDetailSerializer(serializers.ModelSerializer):
    line_total = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = OrderItem
        fields = ("id", "product_name", "product_price", "quantity", "line_total")


class OrderDetailSerializer(serializers.ModelSerializer):
    items = OrderItemDetailSerializer(many=True, read_only=True)
    status_display = serializers.SerializerMethodField()
    status_history = OrderStatusHistorySerializer(many=True, read_only=True)
    coupon_code = serializers.CharField(source="coupon.code", read_only=True, default=None)
    invoice_pdf_url = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = (
            "id", "status", "status_display", "total_amount",
            "discount_amount", "coupon_code",
            "delivery_full_name", "delivery_phone", "delivery_city",
            "delivery_address", "delivery_post_office",
            "delivery_lat", "delivery_lng",
            "created_at", "updated_at", "items", "status_history",
            "invoice_pdf_url",
        )

    def get_status_display(self, obj):
        return obj.get_status_display()

    def get_invoice_pdf_url(self, obj: Order) -> str | None:
        if obj.invoice_pdf and obj.invoice_pdf.name:
            return obj.invoice_pdf.url
        return None
