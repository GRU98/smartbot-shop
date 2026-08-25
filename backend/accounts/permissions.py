from rest_framework.permissions import BasePermission


class IsAdministrator(BasePermission):
    message = "Доступ дозволено лише адміністраторам."

    def has_permission(self, request, view) -> bool:
        return (
            request.user is not None
            and request.user.is_authenticated
            and getattr(request.user, "role", None) == "administrator"
        )


class IsModerator(BasePermission):
    message = "Доступ дозволено лише модераторам."

    def has_permission(self, request, view) -> bool:
        return (
            request.user is not None
            and request.user.is_authenticated
            and getattr(request.user, "role", None) in ("administrator", "moderator")
        )


class IsEditor(BasePermission):
    message = "Доступ дозволено лише редакторам."

    def has_permission(self, request, view) -> bool:
        return (
            request.user is not None
            and request.user.is_authenticated
            and getattr(request.user, "role", None) in ("administrator", "moderator", "editor")
        )


class IsSupport(BasePermission):
    message = "Доступ дозволено лише команді підтримки."

    def has_permission(self, request, view) -> bool:
        return (
            request.user is not None
            and request.user.is_authenticated
            and getattr(request.user, "role", None)
            in ("administrator", "moderator", "support")
        )
