"""
Role-based permission mixin for Django admin.

Матриця прав:
  administrator — повний доступ (view/add/change/delete)
  moderator     — view/change (без add/delete для чутливих моделей)
  editor        — view/add/change товарів і категорій (без delete)
  support       — тільки view замовлень і користувачів
  customer      — немає доступу до адмінки
"""


def _role(request) -> str:
    return getattr(request.user, "role", "customer")


class AdminOnlyMixin:
    """Тільки administrator."""

    def has_view_permission(self, request, obj=None):
        return _role(request) == "administrator"

    def has_add_permission(self, request):
        return _role(request) == "administrator"

    def has_change_permission(self, request, obj=None):
        return _role(request) == "administrator"

    def has_delete_permission(self, request, obj=None):
        return _role(request) == "administrator"

    def has_module_perms(self, request, app_label):
        return _role(request) == "administrator"


class ProductEditorMixin:
    """
    administrator — всі права.
    moderator     — view + change + add (без delete).
    editor        — view + change + add (без delete).
    support       — тільки view.
    """

    def has_view_permission(self, request, obj=None):
        return _role(request) in ("administrator", "moderator", "editor", "support")

    def has_add_permission(self, request):
        return _role(request) in ("administrator", "moderator", "editor")

    def has_change_permission(self, request, obj=None):
        return _role(request) in ("administrator", "moderator", "editor")

    def has_delete_permission(self, request, obj=None):
        return _role(request) == "administrator"


class OrderMixin:
    """
    administrator — всі права.
    moderator     — view + change статусу (без delete).
    support       — view + change статусу (без delete).
    editor        — тільки view.
    """

    def has_view_permission(self, request, obj=None):
        return _role(request) in ("administrator", "moderator", "support", "editor")

    def has_add_permission(self, request):
        return _role(request) == "administrator"

    def has_change_permission(self, request, obj=None):
        return _role(request) in ("administrator", "moderator", "support")

    def has_delete_permission(self, request, obj=None):
        return _role(request) == "administrator"


class ReviewModerationMixin:
    """
    administrator — всі права.
    moderator     — view + delete (модерація відгуків).
    editor        — тільки view.
    support       — тільки view.
    """

    def has_view_permission(self, request, obj=None):
        return _role(request) in ("administrator", "moderator", "editor", "support")

    def has_add_permission(self, request):
        return _role(request) == "administrator"

    def has_change_permission(self, request, obj=None):
        return _role(request) in ("administrator", "moderator")

    def has_delete_permission(self, request, obj=None):
        return _role(request) in ("administrator", "moderator")


class UserManagementMixin:
    """
    administrator — всі права.
    support       — тільки view.
    """

    def has_view_permission(self, request, obj=None):
        return _role(request) in ("administrator", "support")

    def has_add_permission(self, request):
        return _role(request) == "administrator"

    def has_change_permission(self, request, obj=None):
        return _role(request) == "administrator"

    def has_delete_permission(self, request, obj=None):
        return _role(request) == "administrator"
