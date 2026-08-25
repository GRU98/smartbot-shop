import re

from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import ShippingAddress

User = get_user_model()


def validate_password_strength(password: str) -> str:
    if len(password) < 8:
        raise serializers.ValidationError("Пароль повинен містити щонайменше 8 символів.")
    if not re.search(r"\d", password):
        raise serializers.ValidationError("Пароль повинен містити щонайменше одну цифру.")
    if not re.search(r"[!@#$%^&*()_+\-=\[\]{};':\"\\|,.<>\/?]", password):
        raise serializers.ValidationError("Пароль повинен містити щонайменше один спецсимвол.")
    return password


class RegisterSerializer(serializers.Serializer):
    email = serializers.EmailField()
    name = serializers.CharField(max_length=255)
    password = serializers.CharField(write_only=True)
    turnstile_token = serializers.CharField(write_only=True, required=False, allow_blank=True, default="")

    def validate_email(self, value: str) -> str:
        lower = value.lower()
        if User.objects.filter(email=lower).exists():
            raise serializers.ValidationError("Користувач із цією електронною адресою вже існує.")
        return lower

    def validate_password(self, value: str) -> str:
        return validate_password_strength(value)


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)
    turnstile_token = serializers.CharField(write_only=True, required=False, allow_blank=True, default="")


class VerifyEmailSerializer(serializers.Serializer):
    uid = serializers.CharField()
    token = serializers.CharField()


class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()


class PasswordResetConfirmSerializer(serializers.Serializer):
    uid = serializers.CharField()
    token = serializers.CharField()
    new_password = serializers.CharField(write_only=True)

    def validate_new_password(self, value: str) -> str:
        return validate_password_strength(value)


class OAuthTokenSerializer(serializers.Serializer):
    access_token = serializers.CharField()


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("id", "email", "name", "phone", "role", "avatar")
        read_only_fields = fields


class ProfileUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("name", "phone", "avatar")

    def validate_phone(self, value: str) -> str:
        cleaned = re.sub(r"[\s\-()]", "", value)
        if cleaned and not re.match(r"^\+?\d{10,15}$", cleaned):
            raise serializers.ValidationError("Невірний формат номера телефону.")
        return cleaned


class ChangePasswordSerializer(serializers.Serializer):
    current_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True)

    def validate_new_password(self, value: str) -> str:
        return validate_password_strength(value)


class ShippingAddressSerializer(serializers.ModelSerializer):
    class Meta:
        model = ShippingAddress
        fields = ("id", "title", "full_name", "phone", "city", "address_line", "post_office", "lat", "lng", "is_default", "created_at")
        read_only_fields = ("id", "created_at")


class OrderItemSerializer(serializers.Serializer):
    product_name = serializers.CharField()
    product_price = serializers.DecimalField(max_digits=12, decimal_places=2)
    quantity = serializers.IntegerField()
    line_total = serializers.DecimalField(max_digits=12, decimal_places=2)


class OrderListSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    status = serializers.CharField()
    status_display = serializers.SerializerMethodField()
    total_amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    created_at = serializers.DateTimeField()
    items = OrderItemSerializer(many=True)
    delivery_city = serializers.CharField()
    delivery_address = serializers.CharField()
    delivery_post_office = serializers.CharField()
    delivery_lat = serializers.DecimalField(max_digits=10, decimal_places=7, allow_null=True)
    delivery_lng = serializers.DecimalField(max_digits=10, decimal_places=7, allow_null=True)
    invoice_pdf_url = serializers.SerializerMethodField()

    def get_status_display(self, obj):
        return obj.get_status_display()

    def get_invoice_pdf_url(self, obj):
        if obj.invoice_pdf and obj.invoice_pdf.name:
            return obj.invoice_pdf.url
        return None
