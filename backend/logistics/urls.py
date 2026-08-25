from django.urls import path

from . import views

app_name = "logistics"

urlpatterns = [
    path("hubs/", views.LogisticsHubsView.as_view(), name="hubs"),
    path("geocode/", views.GeocodeSearchView.as_view(), name="geocode"),
    path("geocode/reverse/", views.GeocodeReverseView.as_view(), name="geocode_reverse"),
]
