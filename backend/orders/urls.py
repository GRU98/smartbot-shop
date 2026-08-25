from django.urls import path

from . import views
from .views import CancelOrderView

app_name = "orders"

urlpatterns = [
    path("checkout/", views.CreateCheckoutSessionView.as_view(), name="checkout"),
    path("stripe/webhook/", views.StripeWebhookView.as_view(), name="stripe-webhook"),
    path("by-session/", views.OrderBySessionView.as_view(), name="by-session"),
    path("<int:pk>/", views.OrderDetailView.as_view(), name="detail"),
    path("<int:pk>/repeat/", views.RepeatOrderView.as_view(), name="repeat"),
    path("<int:pk>/refresh-payment/", views.RefreshPaymentView.as_view(), name="refresh-payment"),
    path("<int:pk>/cancel/", CancelOrderView.as_view(), name="cancel"),
]
