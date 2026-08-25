import json
import os
import secrets
import string
import uuid

import requests as http_requests
from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.core.mail import EmailMultiAlternatives
from django.http import HttpResponseRedirect
from django.template.loader import render_to_string
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from urllib.parse import urlencode

from .serializers import (
    ChangePasswordSerializer,
    LoginSerializer,
    OAuthTokenSerializer,
    OrderListSerializer,
    PasswordResetConfirmSerializer,
    PasswordResetRequestSerializer,
    ProfileUpdateSerializer,
    RegisterSerializer,
    ShippingAddressSerializer,
    UserSerializer,
    VerifyEmailSerializer,
)
from .models import ShippingAddress

User = get_user_model()


class AuthThrottle(AnonRateThrottle):
    rate = "10/minute"


def _generate_jwt_pair(user) -> dict:
    refresh = RefreshToken.for_user(user)
    return {
        "access": str(refresh.access_token),
        "refresh": str(refresh),
    }


def _verify_turnstile(token: str) -> bool:
    secret = settings.TURNSTILE_SECRET_KEY
    if not secret:
        return True
    resp = http_requests.post(
        "https://challenges.cloudflare.com/turnstile/v0/siteverify",
        data={"secret": secret, "response": token},
        timeout=10,
    )
    return resp.json().get("success", False)


def _random_password(length: int = 32) -> str:
    alphabet = string.ascii_letters + string.digits + string.punctuation
    return "".join(secrets.choice(alphabet) for _ in range(length))


def _send_html_email(subject: str, template: str, context: dict, to: str, text_body: str = "") -> None:
    html_body = render_to_string(template, context)
    msg = EmailMultiAlternatives(
        subject=subject,
        body=text_body,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[to],
    )
    msg.attach_alternative(html_body, "text/html")
    msg.send(fail_silently=False)


def _decode_uid_user(uid_b64: str):
    try:
        uid = force_str(urlsafe_base64_decode(uid_b64))
        return User.objects.get(pk=uid)
    except (TypeError, ValueError, OverflowError, User.DoesNotExist):
        return None


def _oauth_get_or_create(email: str, name: str, avatar: str, provider: str):
    user, created = User.objects.get_or_create(
        email=email,
        defaults={"username": email, "name": name, "avatar": avatar, "is_active": True, "oauth_provider": provider},
    )
    if not created:
        user.avatar = avatar
        user.save(update_fields=["avatar"])
    else:
        user.set_password(_random_password())
        user.save(update_fields=["password"])
    return user


def _oauth_redirect_url(user) -> str:
    tokens = _generate_jwt_pair(user)
    params = urlencode({"access": tokens["access"], "refresh": tokens["refresh"], "user": json.dumps(UserSerializer(user).data)})
    return f"{settings.FRONTEND_URL}/oauth/callback?{params}"


def _github_primary_email(access_token: str) -> str:
    resp = http_requests.get(
        "https://api.github.com/user/emails",
        headers={"Authorization": f"Bearer {access_token}", "Accept": "application/vnd.github+json"},
        timeout=10,
    )
    if resp.status_code == 200:
        for entry in resp.json():
            if entry.get("primary") and entry.get("verified"):
                return entry["email"].lower()
    return ""


def _send_activation_email(user, request: Request) -> None:
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = default_token_generator.make_token(user)
    activation_link = f"{settings.FRONTEND_URL}/verify-email?uid={uid}&token={token}"
    _send_html_email(
        subject="SmartBot Shop — Підтвердження електронної пошти",
        template="accounts/email_activation.html",
        context={"user": user, "activation_link": activation_link},
        to=user.email,
        text_body=(
            f"Вітаємо, {user.name}!\n\n"
            f"Для активації вашого акаунта перейдіть за посиланням:\n{activation_link}\n\n"
            f"Якщо ви не реєструвалися на SmartBot Shop, проігноруйте цей лист."
        ),
    )


def _send_password_reset_email(user) -> None:
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = default_token_generator.make_token(user)
    reset_link = f"{settings.FRONTEND_URL}/reset-password?uid={uid}&token={token}"
    _send_html_email(
        subject="SmartBot Shop — Відновлення пароля",
        template="accounts/email_password_reset.html",
        context={"user": user, "reset_link": reset_link},
        to=user.email,
        text_body=(
            f"Вітаємо, {user.name}!\n\n"
            f"Для скидання пароля перейдіть за посиланням:\n{reset_link}\n\n"
            f"Якщо ви не запитували скидання пароля, проігноруйте цей лист."
        ),
    )


class RegisterView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [AuthThrottle]

    def post(self, request: Request) -> Response:
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        if not _verify_turnstile(serializer.validated_data["turnstile_token"]):
            return Response(
                {"detail": "Перевірку CAPTCHA не пройдено. Спробуйте ще раз."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = User.objects.create_user(
            username=serializer.validated_data["email"],
            email=serializer.validated_data["email"],
            password=serializer.validated_data["password"],
            name=serializer.validated_data["name"],
            is_active=False,
        )

        _send_activation_email(user, request)

        return Response(
            {"detail": "Реєстрація успішна. Перевірте вашу електронну пошту для активації акаунта."},
            status=status.HTTP_201_CREATED,
        )


class LoginView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [AuthThrottle]

    def post(self, request: Request) -> Response:
        from .middleware import (
            apply_anti_timing_delay,
            get_client_ip,
            increment_bruteforce_counter,
            is_locked_out,
            reset_bruteforce_counters,
        )

        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data["email"].lower()
        ip = get_client_ip(request)

        if is_locked_out(ip, email):
            return Response(
                {"detail": "Забагато невдалих спроб. Спробуйте через 30 хвилин."},
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )

        apply_anti_timing_delay(ip, email)

        if not _verify_turnstile(serializer.validated_data["turnstile_token"]):
            return Response(
                {"detail": "Перевірку CAPTCHA не пройдено."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        password = serializer.validated_data["password"]

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            increment_bruteforce_counter(ip, email)
            return Response(
                {"detail": "Невірна електронна адреса або пароль."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        if not user.check_password(password):
            increment_bruteforce_counter(ip, email)
            return Response(
                {"detail": "Невірна електронна адреса або пароль."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        if not user.is_active:
            return Response(
                {"detail": "Акаунт не активовано. Перевірте електронну пошту."},
                status=status.HTTP_403_FORBIDDEN,
            )

        reset_bruteforce_counters(ip, email)

        tokens = _generate_jwt_pair(user)
        return Response(
            {"user": UserSerializer(user).data, **tokens},
            status=status.HTTP_200_OK,
        )


class VerifyEmailView(APIView):
    permission_classes = [AllowAny]

    def post(self, request: Request) -> Response:
        serializer = VerifyEmailSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = _decode_uid_user(serializer.validated_data["uid"])
        if user is None:
            return Response(
                {"detail": "Недійсне посилання активації."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not default_token_generator.check_token(user, serializer.validated_data["token"]):
            return Response(
                {"detail": "Токен активації недійсний або прострочений."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user.is_active = True
        user.save(update_fields=["is_active"])

        tokens = _generate_jwt_pair(user)
        return Response(
            {"detail": "Акаунт успішно активовано.", "user": UserSerializer(user).data, **tokens},
            status=status.HTTP_200_OK,
        )


class PasswordResetRequestView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [AuthThrottle]

    def post(self, request: Request) -> Response:
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data["email"].lower()
        try:
            user = User.objects.get(email=email, is_active=True)
            _send_password_reset_email(user)
        except User.DoesNotExist:
            pass

        return Response(
            {"detail": "Якщо акаунт з такою адресою існує, лист для скидання пароля надіслано."},
            status=status.HTTP_200_OK,
        )


class PasswordResetConfirmView(APIView):
    permission_classes = [AllowAny]

    def post(self, request: Request) -> Response:
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = _decode_uid_user(serializer.validated_data["uid"])
        if user is None:
            return Response(
                {"detail": "Недійсне посилання скидання пароля."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not default_token_generator.check_token(user, serializer.validated_data["token"]):
            return Response(
                {"detail": "Токен скидання недійсний або прострочений."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user.set_password(serializer.validated_data["new_password"])
        user.save(update_fields=["password"])

        return Response(
            {"detail": "Пароль успішно змінено. Тепер ви можете увійти з новим паролем."},
            status=status.HTTP_200_OK,
        )


class LogoutView(APIView):
    def post(self, request: Request) -> Response:
        refresh_token = request.data.get("refresh")
        if refresh_token:
            try:
                token = RefreshToken(refresh_token)
                token.blacklist()
            except Exception:
                pass
        return Response(
            {"detail": "Вихід виконано успішно."},
            status=status.HTTP_200_OK,
        )


class OAuthGoogleRedirectView(APIView):
    permission_classes = [AllowAny]

    def get(self, request: Request):
        params = urlencode({
            "client_id": settings.GOOGLE_OAUTH_CLIENT_ID,
            "redirect_uri": f"{settings.BACKEND_URL}/api/accounts/oauth/google/callback/",
            "response_type": "code",
            "scope": "openid email profile",
            "access_type": "offline",
            "prompt": "consent",
        })
        return HttpResponseRedirect(f"https://accounts.google.com/o/oauth2/v2/auth?{params}")


class OAuthGoogleCallbackView(APIView):
    permission_classes = [AllowAny]

    def get(self, request: Request):
        code = request.query_params.get("code")
        if not code:
            return HttpResponseRedirect(f"{settings.FRONTEND_URL}?error=oauth_failed")

        token_resp = http_requests.post(
            "https://oauth2.googleapis.com/token",
            data={
                "code": code,
                "client_id": settings.GOOGLE_OAUTH_CLIENT_ID,
                "client_secret": settings.GOOGLE_OAUTH_CLIENT_SECRET,
                "redirect_uri": f"{settings.BACKEND_URL}/api/accounts/oauth/google/callback/",
                "grant_type": "authorization_code",
            },
            timeout=10,
        )

        if token_resp.status_code != 200:
            return HttpResponseRedirect(f"{settings.FRONTEND_URL}?error=oauth_failed")

        access_token = token_resp.json().get("access_token")
        if not access_token:
            return HttpResponseRedirect(f"{settings.FRONTEND_URL}?error=oauth_failed")

        google_resp = http_requests.get(
            "https://www.googleapis.com/oauth2/v2/userinfo",
            headers={"Authorization": f"Bearer {access_token}"},
            timeout=10,
        )

        if google_resp.status_code != 200:
            return HttpResponseRedirect(f"{settings.FRONTEND_URL}?error=oauth_failed")

        profile = google_resp.json()
        email = profile.get("email", "").lower()
        if not email:
            return HttpResponseRedirect(f"{settings.FRONTEND_URL}?error=oauth_no_email")

        user = _oauth_get_or_create(email, profile.get("name", ""), profile.get("picture", ""), "google")
        return HttpResponseRedirect(_oauth_redirect_url(user))


class OAuthGoogleView(APIView):
    permission_classes = [AllowAny]

    def post(self, request: Request) -> Response:
        serializer = OAuthTokenSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        access_token = serializer.validated_data["access_token"]

        google_resp = http_requests.get(
            "https://www.googleapis.com/oauth2/v2/userinfo",
            headers={"Authorization": f"Bearer {access_token}"},
            timeout=10,
        )
        if google_resp.status_code != 200:
            return Response(
                {"detail": "Не вдалося отримати дані від Google."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        profile = google_resp.json()
        email = profile.get("email", "").lower()
        if not email:
            return Response(
                {"detail": "Google не повернув електронну адресу."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = _oauth_get_or_create(email, profile.get("name", ""), profile.get("picture", ""), "google")
        return Response({"user": UserSerializer(user).data, **_generate_jwt_pair(user)})


class OAuthGitHubRedirectView(APIView):
    permission_classes = [AllowAny]

    def get(self, request: Request):
        params = urlencode({
            "client_id": settings.GITHUB_OAUTH_CLIENT_ID,
            "redirect_uri": f"{settings.BACKEND_URL}/api/accounts/oauth/github/callback/",
            "scope": "user:email",
        })
        return HttpResponseRedirect(f"https://github.com/login/oauth/authorize?{params}")


class OAuthGitHubCallbackView(APIView):
    permission_classes = [AllowAny]

    def get(self, request: Request):
        code = request.query_params.get("code")
        if not code:
            return HttpResponseRedirect(f"{settings.FRONTEND_URL}?error=oauth_failed")

        token_resp = http_requests.post(
            "https://github.com/login/oauth/access_token",
            data={
                "client_id": settings.GITHUB_OAUTH_CLIENT_ID,
                "client_secret": settings.GITHUB_OAUTH_CLIENT_SECRET,
                "code": code,
                "redirect_uri": f"{settings.BACKEND_URL}/api/accounts/oauth/github/callback/",
            },
            headers={"Accept": "application/json"},
            timeout=10,
        )

        if token_resp.status_code != 200:
            return HttpResponseRedirect(f"{settings.FRONTEND_URL}?error=oauth_failed")

        access_token = token_resp.json().get("access_token")
        if not access_token:
            return HttpResponseRedirect(f"{settings.FRONTEND_URL}?error=oauth_failed")

        user_resp = http_requests.get(
            "https://api.github.com/user",
            headers={"Authorization": f"Bearer {access_token}", "Accept": "application/vnd.github+json"},
            timeout=10,
        )

        if user_resp.status_code != 200:
            return HttpResponseRedirect(f"{settings.FRONTEND_URL}?error=oauth_failed")

        profile = user_resp.json()
        email = (profile.get("email") or "").lower()
        name = profile.get("name") or profile.get("login", "")
        avatar = profile.get("avatar_url", "")

        if not email:
            email = _github_primary_email(access_token)
        if not email:
            return HttpResponseRedirect(f"{settings.FRONTEND_URL}?error=oauth_no_email")

        user = _oauth_get_or_create(email, name, avatar, "github")
        return HttpResponseRedirect(_oauth_redirect_url(user))


class OAuthGitHubView(APIView):
    permission_classes = [AllowAny]

    def post(self, request: Request) -> Response:
        serializer = OAuthTokenSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        access_token = serializer.validated_data["access_token"]

        user_resp = http_requests.get(
            "https://api.github.com/user",
            headers={"Authorization": f"Bearer {access_token}", "Accept": "application/vnd.github+json"},
            timeout=10,
        )
        if user_resp.status_code != 200:
            return Response(
                {"detail": "Не вдалося отримати дані від GitHub."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        profile = user_resp.json()
        email = (profile.get("email") or "").lower()
        name = profile.get("name") or profile.get("login", "")
        avatar = profile.get("avatar_url", "")

        if not email:
            email = _github_primary_email(access_token)
        if not email:
            return Response(
                {"detail": "GitHub не повернув електронну адресу."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = _oauth_get_or_create(email, name, avatar, "github")
        return Response({"user": UserSerializer(user).data, **_generate_jwt_pair(user)})


class ProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        return Response(UserSerializer(request.user).data)

    def patch(self, request: Request) -> Response:
        serializer = ProfileUpdateSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(UserSerializer(request.user).data)


class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request: Request) -> Response:
        serializer = ChangePasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        if not request.user.check_password(serializer.validated_data["current_password"]):
            return Response(
                {"detail": "Поточний пароль невірний."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        request.user.set_password(serializer.validated_data["new_password"])
        request.user.save(update_fields=["password"])
        return Response({"detail": "Пароль успішно змінено."})


class ShippingAddressListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        addresses = ShippingAddress.objects.filter(user=request.user)
        return Response(ShippingAddressSerializer(addresses, many=True).data)

    def post(self, request: Request) -> Response:
        serializer = ShippingAddressSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(user=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class ShippingAddressDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def _get_address(self, request, pk):
        try:
            return ShippingAddress.objects.get(pk=pk, user=request.user)
        except ShippingAddress.DoesNotExist:
            return None

    def patch(self, request: Request, pk: int) -> Response:
        address = self._get_address(request, pk)
        if not address:
            return Response({"detail": "Адресу не знайдено."}, status=status.HTTP_404_NOT_FOUND)
        serializer = ShippingAddressSerializer(address, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def delete(self, request: Request, pk: int) -> Response:
        address = self._get_address(request, pk)
        if not address:
            return Response({"detail": "Адресу не знайдено."}, status=status.HTTP_404_NOT_FOUND)
        address.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class MyOrdersView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        from orders.models import Order
        orders = Order.objects.filter(user=request.user).prefetch_related("items").order_by("-created_at")
        return Response(OrderListSerializer(orders, many=True).data)


class MyReviewsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        from shop.models import Review
        from shop.serializers import ReviewSerializer
        reviews = Review.objects.filter(user=request.user).select_related("product").order_by("-created_at")
        return Response(ReviewSerializer(reviews, many=True).data)


class AvatarUploadView(APIView):
    permission_classes = [IsAuthenticated]
    ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp"}
    MAX_SIZE_MB = 5

    def post(self, request: Request) -> Response:
        avatar_file = request.FILES.get("avatar")
        if not avatar_file:
            return Response({"detail": "Файл обов'язковий."}, status=status.HTTP_400_BAD_REQUEST)

        if avatar_file.content_type not in self.ALLOWED_TYPES:
            return Response(
                {"detail": "Дозволені формати: JPEG, PNG, WebP."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if avatar_file.size > self.MAX_SIZE_MB * 1024 * 1024:
            return Response(
                {"detail": f"Максимальний розмір файлу — {self.MAX_SIZE_MB} МБ."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        ext = os.path.splitext(avatar_file.name)[1].lower() or ".jpg"
        filename = f"avatars/{request.user.pk}_{uuid.uuid4().hex}{ext}"

        saved_path = default_storage.save(filename, ContentFile(avatar_file.read()))
        avatar_url = request.build_absolute_uri(default_storage.url(saved_path))

        request.user.avatar = avatar_url
        request.user.save(update_fields=["avatar"])

        return Response({"avatar": avatar_url})
