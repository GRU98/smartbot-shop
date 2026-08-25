import ipaddress
import json
import logging
import time

import requests as http_requests
from django.conf import settings
from django.contrib.auth.signals import user_login_failed
from django.core.cache import cache
from django.dispatch import receiver
from django.http import HttpRequest, HttpResponse, HttpResponseForbidden

logger = logging.getLogger("smartbot.security")

SAFE_METHODS = ("GET", "HEAD", "OPTIONS")

CACHE_PREFIX_IP = "bruteforce:ip:"
CACHE_PREFIX_EMAIL = "bruteforce:email:"
LOCKOUT_PREFIX_IP = "lockout:ip:"
LOCKOUT_PREFIX_EMAIL = "lockout:email:"


def _is_public_ip(ip: str) -> bool:
    try:
        addr = ipaddress.ip_address(ip.split(":")[0])
        return not (addr.is_loopback or addr.is_private or addr.is_reserved or addr.is_link_local)
    except ValueError:
        return False


def get_client_ip(request: HttpRequest) -> str:
    for header in ("HTTP_CF_CONNECTING_IP", "HTTP_TRUE_CLIENT_IP", "HTTP_X_REAL_IP"):
        ip = request.META.get(header, "").strip()
        if ip:
            return ip

    x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR", "")
    if x_forwarded_for:
        for ip in x_forwarded_for.split(","):
            ip = ip.strip()
            if ip and _is_public_ip(ip):
                return ip
        for ip in x_forwarded_for.split(","):
            ip = ip.strip()
            if ip:
                return ip

    return request.META.get("REMOTE_ADDR", "0.0.0.0")


def get_bruteforce_attempts(ip: str, email: str = "") -> int:
    ip_attempts = cache.get(f"{CACHE_PREFIX_IP}{ip}", 0)
    email_attempts = 0
    if email:
        email_attempts = cache.get(f"{CACHE_PREFIX_EMAIL}{email}", 0)
    return max(ip_attempts, email_attempts)


def increment_bruteforce_counter(ip: str, email: str = "") -> int:
    lockout_seconds = getattr(settings, "BRUTEFORCE_LOCKOUT_SECONDS", 1800)

    ip_key = f"{CACHE_PREFIX_IP}{ip}"
    ip_count = cache.get(ip_key, 0) + 1
    cache.set(ip_key, ip_count, timeout=lockout_seconds)

    email_count = 0
    if email:
        email_key = f"{CACHE_PREFIX_EMAIL}{email}"
        email_count = cache.get(email_key, 0) + 1
        cache.set(email_key, email_count, timeout=lockout_seconds)

    attempts = max(ip_count, email_count)
    max_attempts = getattr(settings, "BRUTEFORCE_MAX_ATTEMPTS", 5)

    if attempts >= max_attempts:
        cache.set(f"{LOCKOUT_PREFIX_IP}{ip}", True, timeout=lockout_seconds)
        if email:
            cache.set(f"{LOCKOUT_PREFIX_EMAIL}{email}", True, timeout=lockout_seconds)
        logger.warning(
            "Брутфорс-блокування: IP=%s, email=%s, спроб=%d, блокування=%dс",
            ip, email, attempts, lockout_seconds,
        )

    return attempts


def is_locked_out(ip: str, email: str = "") -> bool:
    if cache.get(f"{LOCKOUT_PREFIX_IP}{ip}"):
        return True
    if email and cache.get(f"{LOCKOUT_PREFIX_EMAIL}{email}"):
        return True
    return False


def apply_anti_timing_delay(ip: str, email: str = "") -> None:
    attempts = get_bruteforce_attempts(ip, email)
    if attempts > 0:
        delay = min(0.5 * (2 ** attempts), 30.0)
        time.sleep(delay)


def reset_bruteforce_counters(ip: str, email: str = "") -> None:
    cache.delete(f"{CACHE_PREFIX_IP}{ip}")
    cache.delete(f"{LOCKOUT_PREFIX_IP}{ip}")
    if email:
        cache.delete(f"{CACHE_PREFIX_EMAIL}{email}")
        cache.delete(f"{LOCKOUT_PREFIX_EMAIL}{email}")


@receiver(user_login_failed)
def on_user_login_failed(sender, credentials, request, **kwargs):
    if request is None:
        return
    ip = get_client_ip(request)
    email = credentials.get("email", credentials.get("username", ""))
    increment_bruteforce_counter(ip, email)
    logger.info("Невдала спроба входу: IP=%s, email=%s", ip, email)


def validate_turnstile(token: str) -> bool:
    secret = getattr(settings, "TURNSTILE_SECRET_KEY", "")
    if not secret:
        return True
    try:
        resp = http_requests.post(
            "https://challenges.cloudflare.com/turnstile/v0/siteverify",
            data={"secret": secret, "response": token},
            timeout=10,
        )
        result = resp.json()
        return result.get("success", False)
    except Exception:
        logger.exception("Помилка валідації Turnstile")
        return False


class AuditTrailMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request: HttpRequest) -> HttpResponse:
        response = self.get_response(request)

        if request.method in SAFE_METHODS:
            return response

        try:
            self._record_audit(request, response)
        except Exception:
            logger.exception("Помилка запису аудиту")

        return response

    def _record_audit(self, request: HttpRequest, response: HttpResponse) -> None:
        from .models import AuditLog

        ip = get_client_ip(request)
        user = request.user if request.user.is_authenticated else None
        action = f"{request.method} {request.path}"

        changes = {}
        content_type = request.content_type or ""
        if "json" in content_type:
            try:
                body = json.loads(request.body.decode("utf-8", errors="replace"))
                if isinstance(body, dict):
                    sanitized = {
                        k: "***" if any(s in k.lower() for s in ("password", "token", "secret", "key")) else v
                        for k, v in body.items()
                    }
                    changes = sanitized
            except (json.JSONDecodeError, UnicodeDecodeError):
                pass

        AuditLog.objects.create(
            user=user,
            action=action,
            ip_address=ip,
            changes_json=changes,
        )


class AdminIPWhitelistMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request: HttpRequest) -> HttpResponse:
        if request.path.startswith("/admin/"):
            # Login, logout and 2FA setup/verify are part of authentication flow and
            # must be reachable before the user has fully passed 2FA / IP checks.
            if request.path.startswith(("/admin/login/", "/admin/logout/", "/admin/2fa/setup/", "/admin/2fa/verify/")):
                return self.get_response(request)

            ip = get_client_ip(request)
            if not self._is_ip_allowed(ip):
                logger.warning("Заблокований доступ до адмінки: IP=%s, шлях=%s", ip, request.path)
                self._send_alert(request, ip)
                return HttpResponseForbidden("Access Denied")

        return self.get_response(request)

    def _send_alert(self, request: HttpRequest, ip: str) -> None:
        from django.conf import settings as django_settings
        from django.core.mail import send_mail
        import datetime

        admin_email = getattr(django_settings, "EMAIL_HOST_USER", "") or "batulinivan1011@gmail.com"
        now = datetime.datetime.now().strftime("%d.%m.%Y %H:%M:%S")
        user_agent = request.META.get("HTTP_USER_AGENT", "невідомо")
        path = request.path
        whitelist_url = "https://smartbotik.duckdns.org/admin/accounts/allowedip/add/"

        subject = f"⚠️ SmartBot: заблокована спроба входу в адмінку"
        message = (
            f"Хтось намагався зайти в адмін-панель SmartBot!\n\n"
            f"🕐 Час: {now}\n"
            f"🌐 IP: {ip}\n"
            f"📄 Шлях: {path}\n"
            f"🖥️ User-Agent: {user_agent}\n\n"
            f"Якщо це ви — додайте свій IP у білий список:\n"
            f"{whitelist_url}\n\n"
            f"Якщо це не ви — проігноруйте це повідомлення. "
            f"Доступ заблоковано автоматично."
        )

        try:
            send_mail(
                subject=subject,
                message=message,
                from_email=getattr(django_settings, "DEFAULT_FROM_EMAIL", admin_email),
                recipient_list=[admin_email],
                fail_silently=True,
            )
        except Exception:
            logger.exception("Не вдалося надіслати email-сповіщення про заблокований IP")

    def _is_ip_allowed(self, ip: str) -> bool:
        from .models import AllowedIP

        cache_key = "admin_whitelist_ips"
        allowed_ips = cache.get(cache_key)

        if allowed_ips is None:
            allowed_ips = set(
                AllowedIP.objects.values_list("ip_address", flat=True)
            )
            cache.set(cache_key, allowed_ips, timeout=300)

        if not allowed_ips:
            return True

        return ip in allowed_ips
