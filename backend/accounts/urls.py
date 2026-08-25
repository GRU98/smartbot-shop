from django.urls import path

from . import views

app_name = "accounts"

urlpatterns = [
    path("register/", views.RegisterView.as_view(), name="register"),
    path("login/", views.LoginView.as_view(), name="login"),
    path("logout/", views.LogoutView.as_view(), name="logout"),
    path("verify-email/", views.VerifyEmailView.as_view(), name="verify-email"),
    path("password-reset/", views.PasswordResetRequestView.as_view(), name="password-reset"),
    path("password-reset-confirm/", views.PasswordResetConfirmView.as_view(), name="password-reset-confirm"),
    path("profile/", views.ProfileView.as_view(), name="profile"),
    path("profile/change-password/", views.ChangePasswordView.as_view(), name="change-password"),
    path("profile/addresses/", views.ShippingAddressListCreateView.as_view(), name="addresses"),
    path("profile/addresses/<int:pk>/", views.ShippingAddressDetailView.as_view(), name="address-detail"),
    path("profile/orders/", views.MyOrdersView.as_view(), name="my-orders"),
    path("profile/reviews/", views.MyReviewsView.as_view(), name="my-reviews"),
    path("profile/avatar/", views.AvatarUploadView.as_view(), name="avatar-upload"),
    path("oauth/google/", views.OAuthGoogleView.as_view(), name="oauth-google"),
    path("oauth/google/redirect/", views.OAuthGoogleRedirectView.as_view(), name="oauth-google-redirect"),
    path("oauth/google/callback/", views.OAuthGoogleCallbackView.as_view(), name="oauth-google-callback"),
    path("oauth/github/", views.OAuthGitHubView.as_view(), name="oauth-github"),
    path("oauth/github/redirect/", views.OAuthGitHubRedirectView.as_view(), name="oauth-github-redirect"),
    path("oauth/github/callback/", views.OAuthGitHubCallbackView.as_view(), name="oauth-github-callback"),
]
