from django.core.cache import cache
from django.core.mail import send_mail
from django.conf import settings as django_settings
from django.db.models import Avg, Count, Q, Sum, Case, When, IntegerField
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.pagination import LimitOffsetPagination
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Category, Coupon, Product, RecentlyViewed, Review, StockAlert, Wishlist
from .serializers import (
    CartValidateRequestSerializer,
    CategorySerializer,
    CouponResponseSerializer,
    CouponValidateSerializer,
    ProductListSerializer,
    ReviewCreateSerializer,
    ReviewSerializer,
    StockAlertSerializer,
    WishlistItemSerializer,
)


class ProductPagination(LimitOffsetPagination):
    default_limit = 24
    max_limit = 100


class ProductViewSet(viewsets.ModelViewSet):
    serializer_class = ProductListSerializer
    permission_classes = [AllowAny]
    pagination_class = ProductPagination
    lookup_field = "slug"
    http_method_names = ["get", "post", "head", "options"]

    def create(self, request: Request, *args, **kwargs) -> Response:
        return Response({"detail": "Method not allowed"}, status=status.HTTP_405_METHOD_NOT_ALLOWED)

    def get_queryset(self):
        qs = (
            Product.objects
            .filter(is_active=True)
            .select_related("category")
            .prefetch_related("images")
            .annotate(
                avg_rating=Avg("reviews__rating"),
                review_count=Count("reviews"),
                good_reviews=Count(
                    Case(When(reviews__rating__gte=4, then=1), output_field=IntegerField())
                ),
                total_sold=Sum(
                    Case(
                        When(
                            order_items__order__status__in=["paid", "shipped", "delivered"],
                            then="order_items__quantity",
                        ),
                        default=0,
                        output_field=IntegerField(),
                    )
                ),
            )
        )

        query = self.request.query_params.get("q", "").strip()
        if query:
            qs = qs.filter(
                Q(name__icontains=query)
                | Q(brand__icontains=query)
                | Q(specs__icontains=query)
            )

        category_slug = self.request.query_params.get("category")
        if category_slug:
            qs = qs.filter(category__slug=category_slug)

        brand = self.request.query_params.get("brand", "").strip()
        if brand:
            qs = qs.filter(brand__iexact=brand)

        price_min = self.request.query_params.get("price_min")
        if price_min:
            try:
                qs = qs.filter(price__gte=float(price_min))
            except (ValueError, TypeError):
                pass

        price_max = self.request.query_params.get("price_max")
        if price_max:
            try:
                qs = qs.filter(price__lte=float(price_max))
            except (ValueError, TypeError):
                pass

        in_stock = self.request.query_params.get("in_stock")
        if in_stock == "true":
            qs = qs.filter(stock__gt=0)

        featured = self.request.query_params.get("featured")
        if featured == "true":
            qs = qs.filter(is_featured=True)

        ordering = self.request.query_params.get("ordering", "-created_at")
        allowed_orderings = {
            "price", "-price", "name", "-name", "created_at", "-created_at",
        }
        if ordering == "popular":
            qs = qs.order_by("-total_sold", "-good_reviews", "-avg_rating")
        elif ordering in allowed_orderings:
            qs = qs.order_by(ordering)

        return qs

    @action(detail=False, methods=["get"], url_path="categories")
    def categories(self, request: Request) -> Response:
        def get_category_tree():
            categories = Category.objects.all().order_by("name")
            return CategorySerializer(categories, many=True).data

        data = cache.get_or_set("category_tree", get_category_tree, timeout=900)
        return Response(data)

    @action(detail=False, methods=["get"], url_path="brands")
    def brands(self, request: Request) -> Response:
        data = cache.get("brands_list")
        if data is None:
            data = list(
                Product.objects
                .filter(is_active=True)
                .exclude(brand="")
                .values_list("brand", flat=True)
                .distinct()
                .order_by("brand")
            )
            cache.set("brands_list", data, timeout=600)
        return Response(data)

    @action(detail=False, methods=["get"], url_path="price-range")
    def price_range(self, request: Request) -> Response:
        from django.db.models import Min, Max
        data = cache.get("price_range")
        if data is None:
            result = Product.objects.filter(is_active=True).aggregate(
                min_price=Min("price"),
                max_price=Max("price"),
            )
            data = {
                "min": float(result["min_price"] or 0),
                "max": float(result["max_price"] or 0),
            }
            cache.set("price_range", data, timeout=600)
        return Response(data)

    @action(detail=True, methods=["get"], url_path="recommendations", permission_classes=[AllowAny])
    def recommendations(self, request: Request, slug=None) -> Response:
        product = self.get_object()
        qs = (
            Product.objects
            .filter(is_active=True, category=product.category)
            .exclude(pk=product.pk)
            .annotate(
                avg_rating=Avg("reviews__rating"),
                review_count=Count("reviews"),
                total_sold=Sum(
                    Case(When(order_items__order__status="paid", then="order_items__quantity"),
                         default=0, output_field=IntegerField())
                ),
            )
            .order_by("-total_sold", "-avg_rating")[:8]
        )
        return Response(ProductListSerializer(qs, many=True).data)

    def retrieve(self, request: Request, *args, **kwargs):
        response = super().retrieve(request, *args, **kwargs)
        if request.user.is_authenticated:
            try:
                product = self.get_object()
                RecentlyViewed.objects.update_or_create(
                    user=request.user,
                    product=product,
                    defaults={},
                )
                RecentlyViewed.objects.filter(user=request.user).order_by("-viewed_at")[10:].delete()
            except Exception:
                pass
        return response

    @action(detail=True, methods=["get"], url_path="reviews")
    def reviews(self, request: Request, slug=None) -> Response:
        product = self.get_object()
        reviews = Review.objects.filter(product=product).select_related("user")
        serializer = ReviewSerializer(reviews, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["post"], url_path="reviews/create", permission_classes=[IsAuthenticated])
    def create_review(self, request: Request, slug=None) -> Response:
        product = self.get_object()

        if Review.objects.filter(product=product, user=request.user).exists():
            return Response(
                {"detail": "Ви вже залишили відгук для цього товару."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        has_purchased = request.user.orders.filter(
            status__in=["paid", "shipped", "delivered"],
            items__product=product,
        ).exists()

        if not has_purchased:
            return Response(
                {"detail": "Залишити відгук можна тільки після покупки товару."},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = ReviewCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(user=request.user, product=product)
        return Response(ReviewSerializer(serializer.instance).data, status=status.HTTP_201_CREATED)


class CartValidateView(APIView):
    permission_classes = [AllowAny]

    def post(self, request: Request) -> Response:
        serializer = CartValidateRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        items = serializer.validated_data["items"]
        product_ids = [item["product_id"] for item in items]

        products_qs = Product.objects.filter(id__in=product_ids, is_active=True)
        products_map: dict[int, Product] = {p.id: p for p in products_qs}

        results = []

        for item in items:
            pid = item["product_id"]
            quantity = item["quantity"]
            client_price = item["client_price"]

            product = products_map.get(pid)

            if product is None:
                results.append({
                    "product_id": pid,
                    "actual_price": None,
                    "available_stock": 0,
                    "status": "NOT_FOUND",
                })
                continue

            actual_price = product.price
            available_stock = product.stock

            if quantity > available_stock:
                item_status = "OUT_OF_STOCK"
            elif client_price != actual_price:
                item_status = "PRICE_MISMATCH"
            else:
                item_status = "OK"

            results.append({
                "product_id": pid,
                "actual_price": str(actual_price),
                "available_stock": available_stock,
                "status": item_status,
            })

        is_valid = all(r["status"] == "OK" for r in results)

        return Response(
            {"is_valid": is_valid, "items": results},
            status=status.HTTP_200_OK,
        )


class WishlistView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        items = Wishlist.objects.filter(user=request.user).select_related(
            "product", "product__category"
        ).prefetch_related("product__images")
        serializer = WishlistItemSerializer(items, many=True)
        return Response(serializer.data)

    def post(self, request: Request) -> Response:
        product_id = request.data.get("product_id")
        if not product_id:
            return Response(
                {"detail": "product_id обов'язковий."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            product = Product.objects.get(id=product_id, is_active=True)
        except Product.DoesNotExist:
            return Response(
                {"detail": "Товар не знайдено."},
                status=status.HTTP_404_NOT_FOUND,
            )
        obj, created = Wishlist.objects.get_or_create(user=request.user, product=product)
        if not created:
            return Response({"detail": "Товар вже у списку бажань."}, status=status.HTTP_200_OK)
        return Response(
            {"detail": "Додано до списку бажань.", "id": obj.id},
            status=status.HTTP_201_CREATED,
        )

    def delete(self, request: Request) -> Response:
        product_id = request.data.get("product_id")
        if not product_id:
            return Response(
                {"detail": "product_id обов'язковий."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        deleted, _ = Wishlist.objects.filter(user=request.user, product_id=product_id).delete()
        if not deleted:
            return Response({"detail": "Товар не знайдено у списку бажань."}, status=status.HTTP_404_NOT_FOUND)
        return Response(status=status.HTTP_204_NO_CONTENT)


class WishlistCheckView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        ids = Wishlist.objects.filter(user=request.user).values_list("product_id", flat=True)
        return Response(list(ids))


class CouponValidateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request: Request) -> Response:
        serializer = CouponValidateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        code = serializer.validated_data["code"].strip().upper()
        order_total = serializer.validated_data["order_total"]

        try:
            coupon = Coupon.objects.get(code__iexact=code)
        except Coupon.DoesNotExist:
            return Response({"detail": "Купон не знайдено."}, status=status.HTTP_404_NOT_FOUND)

        valid, message = coupon.is_valid()
        if not valid:
            return Response({"detail": message}, status=status.HTTP_400_BAD_REQUEST)

        if order_total < coupon.min_order_amount:
            return Response(
                {"detail": f"Мінімальна сума замовлення для цього купону: {coupon.min_order_amount} грн."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        discount = coupon.calculate_discount(order_total)
        final_total = order_total - discount

        return Response({
            "coupon": CouponResponseSerializer(coupon).data,
            "discount_amount": str(discount),
            "final_total": str(final_total),
        })


class RecentlyViewedView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        items = (
            RecentlyViewed.objects
            .filter(user=request.user)
            .select_related("product", "product__category")
            .prefetch_related("product__images")
            .annotate(
                avg_rating=Avg("product__reviews__rating"),
                review_count=Count("product__reviews"),
                total_sold=Sum(
                    Case(
                        When(product__order_items__order__status="paid",
                             then="product__order_items__quantity"),
                        default=0,
                        output_field=IntegerField(),
                    )
                ),
            )[:10]
        )
        products = [item.product for item in items]
        for i, item in enumerate(items):
            products[i].avg_rating = item.avg_rating
            products[i].review_count = item.review_count or 0
            products[i].total_sold = item.total_sold or 0
        return Response(ProductListSerializer(products, many=True).data)

    def delete(self, request: Request) -> Response:
        RecentlyViewed.objects.filter(user=request.user).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class StockAlertView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        alerts = StockAlert.objects.filter(user=request.user, notified=False).select_related("product")
        return Response(StockAlertSerializer(alerts, many=True).data)

    def post(self, request: Request) -> Response:
        product_id = request.data.get("product_id")
        if not product_id:
            return Response({"detail": "product_id обов'язковий."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            product = Product.objects.get(id=product_id, is_active=True)
        except Product.DoesNotExist:
            return Response({"detail": "Товар не знайдено."}, status=status.HTTP_404_NOT_FOUND)

        if product.stock > 0:
            return Response({"detail": "Товар вже є в наявності."}, status=status.HTTP_400_BAD_REQUEST)

        obj, created = StockAlert.objects.get_or_create(
            user=request.user,
            product=product,
            defaults={"email": request.user.email},
        )
        if not created:
            return Response({"detail": "Ви вже підписані на сповіщення."}, status=status.HTTP_200_OK)
        return Response({"detail": "Ви отримаєте email, коли товар з'явиться."}, status=status.HTTP_201_CREATED)

    def delete(self, request: Request) -> Response:
        product_id = request.data.get("product_id")
        StockAlert.objects.filter(user=request.user, product_id=product_id).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class GlobalSearchView(APIView):
    permission_classes = [AllowAny]

    def get(self, request: Request) -> Response:
        q = request.query_params.get("q", "").strip()
        if len(q) < 2:
            return Response({"products": [], "categories": []})

        products = (
            Product.objects
            .filter(is_active=True)
            .filter(Q(name__icontains=q) | Q(brand__icontains=q) | Q(description__icontains=q))
            .annotate(
                avg_rating=Avg("reviews__rating"),
                review_count=Count("reviews"),
                total_sold=Sum(
                    Case(When(order_items__order__status="paid", then="order_items__quantity"),
                         default=0, output_field=IntegerField())
                ),
            )
            .order_by("-total_sold")[:8]
        )

        categories = (
            Category.objects
            .filter(name__icontains=q)[:5]
        )

        return Response({
            "products": ProductListSerializer(products, many=True).data,
            "categories": [{"id": c.id, "name": c.name, "slug": c.slug} for c in categories],
        })


class ContactFormView(APIView):
    permission_classes = [AllowAny]

    def post(self, request: Request) -> Response:
        name = request.data.get("name", "").strip()
        email = request.data.get("email", "").strip()
        message = request.data.get("message", "").strip()

        if not name or not email or not message:
            return Response({"error": "Всі поля обов'язкові."}, status=status.HTTP_400_BAD_REQUEST)

        if len(message) > 2000:
            return Response({"error": "Повідомлення занадто довге."}, status=status.HTTP_400_BAD_REQUEST)

        recipient = getattr(django_settings, "EMAIL_HOST_USER", "") or "admin@smartbotik.duckdns.org"
        try:
            send_mail(
                subject=f"[SmartBot] Зворотній зв'язок від {name}",
                message=f"Від: {name} <{email}>\n\n{message}",
                from_email=django_settings.DEFAULT_FROM_EMAIL,
                recipient_list=[recipient],
                fail_silently=False,
            )
        except Exception:
            return Response({"error": "Помилка надсилання листа."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return Response({"ok": True}, status=status.HTTP_200_OK)
