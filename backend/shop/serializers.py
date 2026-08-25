from rest_framework import serializers

from .models import Category, Coupon, Product, ProductImage, Review, StockAlert, Wishlist


class CartItemValidator(serializers.Serializer):
    product_id = serializers.IntegerField()
    quantity = serializers.IntegerField(min_value=1)
    client_price = serializers.DecimalField(max_digits=12, decimal_places=2)


class CartValidateRequestSerializer(serializers.Serializer):
    items = serializers.ListField(child=CartItemValidator(), min_length=1, max_length=100)


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ("id", "name", "slug")
        read_only_fields = fields


class ProductImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductImage
        fields = ("id", "url", "alt", "position")
        read_only_fields = fields


class ReviewSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source="user.name", read_only=True)
    user_email = serializers.CharField(source="user.email", read_only=True)
    product_name = serializers.CharField(source="product.name", read_only=True, default="")

    class Meta:
        model = Review
        fields = ("id", "rating", "text", "user_name", "user_email", "product_name", "created_at")
        read_only_fields = ("id", "user_name", "user_email", "product_name", "created_at")


class ReviewCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Review
        fields = ("rating", "text")

    def validate_rating(self, value):
        if value < 1 or value > 5:
            raise serializers.ValidationError("Рейтинг має бути від 1 до 5.")
        return value


class ProductListSerializer(serializers.ModelSerializer):
    category = CategorySerializer(read_only=True)
    images = ProductImageSerializer(many=True, read_only=True)
    avg_rating = serializers.FloatField(read_only=True, default=None, allow_null=True)
    review_count = serializers.IntegerField(read_only=True, default=0)
    total_sold = serializers.IntegerField(read_only=True, default=0, allow_null=True)

    class Meta:
        model = Product
        fields = (
            "id",
            "name",
            "slug",
            "brand",
            "description",
            "specs",
            "price",
            "stock",
            "image",
            "category",
            "images",
            "is_active",
            "is_featured",
            "created_at",
            "avg_rating",
            "review_count",
            "total_sold",
        )
        read_only_fields = fields


class WishlistItemSerializer(serializers.ModelSerializer):
    product = ProductListSerializer(read_only=True)

    class Meta:
        model = Wishlist
        fields = ("id", "product", "created_at")
        read_only_fields = fields


class CouponValidateSerializer(serializers.Serializer):
    code = serializers.CharField(max_length=50)
    order_total = serializers.DecimalField(max_digits=12, decimal_places=2)


class CouponResponseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Coupon
        fields = ("code", "description", "discount_type", "discount_value", "min_order_amount")
        read_only_fields = fields


class StockAlertSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)
    product_id = serializers.IntegerField(write_only=True)

    class Meta:
        model = StockAlert
        fields = ("id", "product_id", "product_name", "email", "notified", "created_at")
        read_only_fields = ("id", "product_name", "notified", "created_at")
