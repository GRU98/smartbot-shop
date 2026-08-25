from django.conf import settings
from django.conf.urls.static import static
from django.urls import include, path

from accounts.admin import secured_admin_site

urlpatterns = [
    path("admin/", secured_admin_site.urls),
    path("api/accounts/", include("accounts.urls")),
    path("api/", include("shop.urls")),
    path("api/logistics/", include("logistics.urls")),
    path("api/orders/", include("orders.urls")),
    path("api/v1/admin/", include("admin_api.urls")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
