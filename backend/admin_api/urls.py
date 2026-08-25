from django.urls import path

from . import views

app_name = "admin_api"

urlpatterns = [
    path("dashboard/stats/", views.DashboardStatsView.as_view(), name="dashboard-stats"),

    path("products/", views.AdminProductListCreateView.as_view(), name="product-list"),
    path("products/<int:pk>/", views.AdminProductDetailView.as_view(), name="product-detail"),
    path("products/bulk-update/", views.AdminProductBulkUpdateView.as_view(), name="product-bulk-update"),

    path("orders/", views.AdminOrderListView.as_view(), name="order-list"),
    path("orders/<int:pk>/", views.AdminOrderDetailView.as_view(), name="order-detail"),
    path("orders/<int:pk>/change-status/", views.AdminOrderChangeStatusView.as_view(), name="order-change-status"),
    path("orders/<int:pk>/refund/", views.AdminOrderRefundView.as_view(), name="order-refund"),

    path("users/", views.AdminUserListView.as_view(), name="user-list"),
    path("users/<int:pk>/", views.AdminUserDetailView.as_view(), name="user-detail"),
    path("users/<int:pk>/impersonate/", views.AdminImpersonateView.as_view(), name="user-impersonate"),

    path("audit-logs/", views.AdminAuditLogListView.as_view(), name="audit-logs"),
]
