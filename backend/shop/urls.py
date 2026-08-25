from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

app_name = "shop"

router = DefaultRouter()
router.register("products", views.ProductViewSet, basename="product")

urlpatterns = [
    path("cart/validate/", views.CartValidateView.as_view(), name="cart-validate"),
    path("wishlist/", views.WishlistView.as_view(), name="wishlist"),
    path("wishlist/check/", views.WishlistCheckView.as_view(), name="wishlist-check"),
    path("coupons/validate/", views.CouponValidateView.as_view(), name="coupon-validate"),
    path("recently-viewed/", views.RecentlyViewedView.as_view(), name="recently-viewed"),
    path("stock-alerts/", views.StockAlertView.as_view(), name="stock-alerts"),
    path("search/", views.GlobalSearchView.as_view(), name="search"),
    path("contact/", views.ContactFormView.as_view(), name="contact"),
    path("", include(router.urls)),
]
