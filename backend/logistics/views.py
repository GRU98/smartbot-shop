import requests as http_requests
from rest_framework.permissions import AllowAny
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView


NOMINATIM_HEADERS = {
    "User-Agent": "SmartBot Shop/1.0 (contact@smartbotik.duckdns.org)",
    "Accept": "application/json",
    "Accept-Language": "uk",
}


LOGISTICS_HUBS_GEOJSON = {
    "type": "FeatureCollection",
    "features": [
        {
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [30.5234, 50.4501],
            },
            "properties": {
                "id": 1,
                "city": "Київ",
                "name": "Головний Хаб Автоматизації №1",
                "status": "ОНЛАЙН / Готовий до видачі",
                "robots_available": 42,
            },
        },
        {
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [24.0297, 49.8397],
            },
            "properties": {
                "id": 2,
                "city": "Львів",
                "name": "Західний Логістичний Центр №2",
                "status": "ОНЛАЙН / Склад заповнений",
                "robots_available": 28,
            },
        },
        {
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [30.7233, 46.4825],
            },
            "properties": {
                "id": 3,
                "city": "Одеса",
                "name": "Портовий Хаб Дистрибуції №3",
                "status": "ОНЛАЙН / Готовий до видачі",
                "robots_available": 35,
            },
        },
        {
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [35.0462, 48.4647],
            },
            "properties": {
                "id": 4,
                "city": "Дніпро",
                "name": "Центральний Вузол Обробки №4",
                "status": "ОНЛАЙН / Склад заповнений",
                "robots_available": 19,
            },
        },
        {
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [36.2304, 49.9935],
            },
            "properties": {
                "id": 5,
                "city": "Харків",
                "name": "Східний Термінал Розподілу №5",
                "status": "ОНЛАЙН / Готовий до видачі",
                "robots_available": 31,
            },
        },
    ],
}


class LogisticsHubsView(APIView):
    permission_classes = [AllowAny]

    def get(self, request: Request) -> Response:
        return Response(LOGISTICS_HUBS_GEOJSON)


class GeocodeSearchView(APIView):
    permission_classes = [AllowAny]

    def get(self, request: Request) -> Response:
        query = request.query_params.get("q", "").strip()
        if not query or len(query) < 2:
            return Response({"results": []})

        try:
            resp = http_requests.get(
                "https://nominatim.openstreetmap.org/search",
                params={
                    "format": "json",
                    "q": query,
                    "limit": "5",
                    "countrycodes": "ua",
                    "addressdetails": "1",
                },
                headers=NOMINATIM_HEADERS,
                timeout=10,
            )
            resp.raise_for_status()
            return Response({"results": resp.json()})
        except Exception:
            return Response({"results": [], "error": "Не вдалося виконати пошук"}, status=503)


class GeocodeReverseView(APIView):
    permission_classes = [AllowAny]

    def get(self, request: Request) -> Response:
        lat = request.query_params.get("lat", "").strip()
        lng = request.query_params.get("lng", "").strip()
        if not lat or not lng:
            return Response({"detail": "Потрібні lat і lng"}, status=400)

        try:
            resp = http_requests.get(
                "https://nominatim.openstreetmap.org/reverse",
                params={
                    "format": "json",
                    "lat": lat,
                    "lon": lng,
                    "addressdetails": "1",
                },
                headers=NOMINATIM_HEADERS,
                timeout=10,
            )
            resp.raise_for_status()
            return Response(resp.json())
        except Exception:
            return Response({"detail": "Не вдалося отримати адресу"}, status=503)
