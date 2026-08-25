import logging
import os
from decimal import Decimal
from io import BytesIO

import stripe
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from django.conf import settings
from django.core.files.base import ContentFile
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.db import transaction
from django.utils import timezone
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.platypus import (
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from shop.models import Coupon, Product

from .models import Order, OrderItem, OrderStatusHistory
from .serializers import CreateCheckoutSerializer, OrderDetailSerializer

logger = logging.getLogger("smartbot.orders")


def _register_cyrillic_font() -> str:
    """Реєструє перший знайдений системний шрифт з підтримкою кирилиці."""
    candidates = [
        ("CyrillicFont", "C:/Windows/Fonts/arial.ttf"),
        ("CyrillicFont", "C:/Windows/Fonts/times.ttf"),
        ("CyrillicFont", "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"),
        ("CyrillicFont", "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf"),
    ]
    for name, path in candidates:
        if os.path.exists(path):
            try:
                pdfmetrics.registerFont(TTFont(name, path))
                return name
            except Exception as exc:
                logger.warning("Не вдалося зареєструвати шрифт %s: %s", path, exc)
    logger.warning("Cyrillic font not found, falling back to Helvetica")
    return "Helvetica"

stripe.api_key = settings.STRIPE_SECRET_KEY


def _restore_stock(order: Order) -> None:
    with transaction.atomic():
        for item in order.items.select_related("product"):
            if item.product:
                product = Product.objects.select_for_update().get(id=item.product.id)
                product.stock += item.quantity
                product.save(update_fields=["stock"])


class CreateCheckoutSessionView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request: Request) -> Response:
        serializer = CreateCheckoutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        items_data = serializer.validated_data["items"]
        line_items = []
        order_items_bulk = []
        total_amount = Decimal("0.00")

        coupon_obj = None
        coupon_code = serializer.validated_data.get("coupon_code", "").strip().upper()
        if coupon_code:
            try:
                coupon_obj = Coupon.objects.get(code__iexact=coupon_code)
                valid, _ = coupon_obj.is_valid()
                if not valid:
                    coupon_obj = None
            except Coupon.DoesNotExist:
                coupon_obj = None

        try:
            with transaction.atomic():
                order = Order.objects.create(
                    user=request.user,
                    status=Order.Status.PENDING,
                    delivery_full_name=serializer.validated_data.get("delivery_full_name", ""),
                    delivery_phone=serializer.validated_data.get("delivery_phone", ""),
                    delivery_city=serializer.validated_data.get("delivery_city", ""),
                    delivery_address=serializer.validated_data.get("delivery_address", ""),
                    delivery_post_office=serializer.validated_data.get("delivery_post_office", ""),
                    delivery_lat=serializer.validated_data.get("delivery_lat"),
                    delivery_lng=serializer.validated_data.get("delivery_lng"),
                )
                OrderStatusHistory.objects.create(
                    order=order,
                    status=Order.Status.PENDING,
                    comment="Замовлення створено",
                )

                for item_data in items_data:
                    product_id = item_data["product_id"]
                    quantity = item_data["quantity"]

                    product = (
                        Product.objects
                        .select_for_update()
                        .get(id=product_id, is_active=True)
                    )

                    if product.stock < quantity:
                        raise ValueError(
                            f"Недостатньо товару на складі: "
                            f"{product.name} (доступно: {product.stock}, запитано: {quantity})"
                        )

                    product.stock -= quantity
                    product.save(update_fields=["stock"])

                    item_total = product.price * quantity
                    total_amount += item_total

                    order_items_bulk.append(
                        OrderItem(
                            order=order,
                            product=product,
                            product_name=product.name,
                            product_price=product.price,
                            quantity=quantity,
                        )
                    )

                    unit_amount_kopecks = int((product.price * 100).to_integral_value())

                    line_items.append({
                        "price_data": {
                            "currency": "uah",
                            "unit_amount": unit_amount_kopecks,
                            "product_data": {
                                "name": product.name,
                            },
                        },
                        "quantity": quantity,
                    })

                OrderItem.objects.bulk_create(order_items_bulk)

                discount_amount = Decimal("0.00")
                if coupon_obj:
                    discount_amount = coupon_obj.calculate_discount(total_amount)
                    if discount_amount > 0:
                        coupon_obj.used_count += 1
                        coupon_obj.save(update_fields=["used_count"])

                order.total_amount = total_amount - discount_amount
                order.discount_amount = discount_amount
                if coupon_obj:
                    order.coupon = coupon_obj
                order.save(update_fields=["total_amount", "discount_amount", "coupon"])
        except Product.DoesNotExist:
            return Response(
                {"detail": "Товар не знайдено або він неактивний."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except ValueError as exc:
            return Response(
                {"detail": str(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            checkout_session = stripe.checkout.Session.create(
                payment_method_types=["card"],
                line_items=line_items,
                mode="payment",
                success_url=f"{settings.FRONTEND_URL}/order-success?session_id={{CHECKOUT_SESSION_ID}}",
                cancel_url=f"{settings.FRONTEND_URL}/order-cancelled",
                metadata={"order_id": str(order.id)},
                customer_email=request.user.email,
            )
        except stripe.error.StripeError as e:
            logger.exception("Помилка створення Stripe Checkout Session")
            self._rollback_stock(order)
            return Response(
                {"detail": f"Помилка платіжної системи: {str(e)}"},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        order.stripe_session_id = checkout_session.id
        order.save(update_fields=["stripe_session_id"])

        return Response(
            {
                "checkout_url": checkout_session.url,
                "session_id": checkout_session.id,
                "order_id": order.id,
            },
            status=status.HTTP_201_CREATED,
        )

    def _rollback_stock(self, order: Order) -> None:
        _restore_stock(order)
        order.status = Order.Status.FAILED
        order.save(update_fields=["status"])


class StripeWebhookView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request: Request) -> Response:
        payload = request.body
        sig_header = request.META.get("HTTP_STRIPE_SIGNATURE", "")
        endpoint_secret = settings.STRIPE_WEBHOOK_SECRET

        try:
            event = stripe.Webhook.construct_event(
                payload, sig_header, endpoint_secret
            )
        except ValueError:
            logger.warning("Невалідний Stripe webhook payload")
            return Response(
                {"detail": "Невалідний payload"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except stripe.error.SignatureVerificationError:
            logger.warning("Невалідний підпис Stripe webhook")
            return Response(
                {"detail": "Невалідний підпис"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        event_type = event["type"]
        data_object = event["data"]["object"]

        if event_type in ("checkout.session.completed", "payment_intent.succeeded"):
            self._handle_payment_success(data_object, event_type)
        elif event_type == "payment_intent.payment_failed":
            self._handle_payment_failed(data_object)

        return Response({"status": "ok"}, status=status.HTTP_200_OK)

    def _handle_payment_success(self, data_object: dict, event_type: str) -> None:
        if event_type == "checkout.session.completed":
            order_id = data_object.get("metadata", {}).get("order_id")
            payment_intent = data_object.get("payment_intent", "")
        else:
            order_id = data_object.get("metadata", {}).get("order_id")
            payment_intent = data_object.get("id", "")

        if not order_id:
            logger.warning("Stripe webhook: order_id не знайдено в metadata")
            return

        try:
            order = Order.objects.get(id=int(order_id))
        except (Order.DoesNotExist, ValueError):
            logger.warning("Stripe webhook: замовлення #%s не знайдено", order_id)
            return

        if order.status == Order.Status.PAID:
            return

        order.status = Order.Status.PAID
        order.stripe_payment_intent = payment_intent
        order.save(update_fields=["status", "stripe_payment_intent", "updated_at"])

        logger.info("Замовлення #%s оплачено успішно", order.id)

        try:
            generate_and_send_invoice(order)
        except Exception:
            logger.exception("Помилка генерації інвойсу для замовлення #%s", order.id)

    def _handle_payment_failed(self, data_object: dict) -> None:
        order_id = data_object.get("metadata", {}).get("order_id")
        if not order_id:
            return

        try:
            order = Order.objects.get(id=int(order_id))
        except (Order.DoesNotExist, ValueError):
            return

        _restore_stock(order)
        order.status = Order.Status.FAILED
        order.save(update_fields=["status", "updated_at"])
        logger.info("Оплату замовлення #%s відхилено, товари повернуто на склад", order.id)


def generate_and_send_invoice(order: Order) -> None:
    pdf_buffer = BytesIO()

    doc = SimpleDocTemplate(
        pdf_buffer,
        pagesize=A4,
        leftMargin=20 * mm,
        rightMargin=20 * mm,
        topMargin=20 * mm,
        bottomMargin=20 * mm,
    )

    font_name = _register_cyrillic_font()
    styles = getSampleStyleSheet()

    style_title = ParagraphStyle(
        "InvoiceTitle",
        parent=styles["Heading1"],
        fontName=font_name,
        fontSize=18,
        spaceAfter=6 * mm,
    )
    style_normal = ParagraphStyle(
        "InvoiceNormal",
        parent=styles["Normal"],
        fontName=font_name,
        fontSize=10,
        leading=14,
    )
    style_small = ParagraphStyle(
        "InvoiceSmall",
        parent=styles["Normal"],
        fontName=font_name,
        fontSize=8,
        textColor=colors.grey,
    )

    elements = []

    elements.append(Paragraph(
        f"ФІСКАЛЬНИЙ ЧЕК / ІНВОЙС #{order.id}",
        style_title,
    ))
    elements.append(Spacer(1, 2 * mm))

    company_name = getattr(settings, "COMPANY_NAME", "TOB SmartBot Shop")
    company_edrpou = getattr(settings, "COMPANY_EDRPOU", "12345678")
    company_address = getattr(settings, "COMPANY_ADDRESS", "м. Київ")

    elements.append(Paragraph(f"<b>Продавець:</b> {company_name}", style_normal))
    elements.append(Paragraph(f"<b>ЄДРПОУ:</b> {company_edrpou}", style_normal))
    elements.append(Paragraph(f"<b>Адреса:</b> {company_address}", style_normal))
    elements.append(Spacer(1, 3 * mm))

    elements.append(Paragraph(
        f"<b>Покупець:</b> {order.user.name or order.user.email}",
        style_normal,
    ))
    elements.append(Paragraph(f"<b>Email:</b> {order.user.email}", style_normal))
    elements.append(Paragraph(
        f"<b>Дата:</b> {timezone.localtime(order.created_at).strftime('%d.%m.%Y %H:%M')}",
        style_normal,
    ))
    elements.append(Spacer(1, 6 * mm))

    table_data = [["#", "Найменування", "Кількість", "Ціна, грн", "Сума, грн"]]

    items = order.items.all()
    for idx, item in enumerate(items, start=1):
        line_total = item.product_price * item.quantity
        table_data.append([
            str(idx),
            item.product_name,
            str(item.quantity),
            f"{item.product_price:.2f}",
            f"{line_total:.2f}",
        ])

    table_data.append(["", "", "", "РАЗОМ:", f"{order.total_amount:.2f}"])

    col_widths = [10 * mm, 80 * mm, 22 * mm, 28 * mm, 30 * mm]
    table = Table(table_data, colWidths=col_widths)
    table.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (-1, -1), font_name),
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#00b8d4")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTSIZE", (0, 0), (-1, 0), 10),
        ("FONTSIZE", (0, 1), (-1, -1), 9),
        ("ALIGN", (2, 0), (-1, -1), "CENTER"),
        ("ALIGN", (3, 0), (-1, -1), "RIGHT"),
        ("GRID", (0, 0), (-1, -2), 0.5, colors.HexColor("#cccccc")),
        ("LINEABOVE", (0, -1), (-1, -1), 1.5, colors.HexColor("#00b8d4")),
        ("FONTSIZE", (0, -1), (-1, -1), 11),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    elements.append(table)
    elements.append(Spacer(1, 8 * mm))

    fiscal_marker = f"ФІСКАЛЬНИЙ МАРКЕР: SM-{order.id:06d}-{order.created_at.strftime('%Y%m%d')}"
    elements.append(Paragraph(fiscal_marker, style_normal))
    elements.append(Spacer(1, 4 * mm))

    elements.append(Paragraph(
        f"Stripe Payment: {order.stripe_payment_intent or 'N/A'}",
        style_small,
    ))
    elements.append(Paragraph(
        "Цей документ є підтвердженням оплати замовлення в інтернет-магазині SmartBot Shop.",
        style_small,
    ))

    doc.build(elements)

    pdf_bytes = pdf_buffer.getvalue()
    pdf_buffer.close()

    filename = f"invoice_{order.id}.pdf"
    order.invoice_pdf.save(filename, ContentFile(pdf_bytes), save=True)

    subject = f"SmartBot Shop — Чек замовлення #{order.id}"
    text_body = (
        f"Дякуємо за покупку!\n\n"
        f"Ваше замовлення #{order.id} успішно оплачено.\n"
        f"Сума: {order.total_amount:.2f} грн\n\n"
        f"Фіскальний чек у вкладенні.\n\n"
        f"З повагою,\nКоманда SmartBot Shop"
    )

    html_body = render_to_string(
        "orders/receipt_email.html",
        {
            "order": order,
            "items": order.items.all(),
            "company_name": getattr(settings, "COMPANY_NAME", "TOB SmartBot Shop"),
            "company_address": getattr(settings, "COMPANY_ADDRESS", "м. Київ"),
            "company_edrpou": getattr(settings, "COMPANY_EDRPOU", "12345678"),
        },
    )

    msg = EmailMultiAlternatives(
        subject=subject,
        body=text_body,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[order.user.email],
    )
    msg.attach_alternative(html_body, "text/html")
    msg.attach(filename, pdf_bytes, "application/pdf")
    msg.send(fail_silently=False)

    logger.info("Інвойс для замовлення #%s згенеровано та надіслано", order.id)


class OrderDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request: Request, pk: int) -> Response:
        try:
            order = Order.objects.prefetch_related("items").get(pk=pk, user=request.user)
        except Order.DoesNotExist:
            return Response({"detail": "Замовлення не знайдено."}, status=status.HTTP_404_NOT_FOUND)
        return Response(OrderDetailSerializer(order).data)


class OrderBySessionView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        session_id = request.query_params.get("session_id")
        if not session_id:
            return Response({"detail": "session_id обов'язковий."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            order = Order.objects.prefetch_related("items", "status_history").get(
                stripe_session_id=session_id, user=request.user
            )
        except Order.DoesNotExist:
            return Response({"detail": "Замовлення не знайдено."}, status=status.HTTP_404_NOT_FOUND)

        if order.status != Order.Status.PAID and order.stripe_session_id:
            try:
                stripe_session = stripe.checkout.Session.retrieve(order.stripe_session_id)
                if stripe_session.get("payment_status") == "paid":
                    order.status = Order.Status.PAID
                    order.stripe_payment_intent = stripe_session.get("payment_intent", "")
                    order.save(update_fields=["status", "stripe_payment_intent", "updated_at"])
                    try:
                        generate_and_send_invoice(order)
                    except Exception:
                        logger.exception("Помилка генерації інвойсу для замовлення #%s", order.id)
            except stripe.error.StripeError:
                logger.exception("Помилка отримання Stripe Session для замовлення #%s", order.id)

        return Response(OrderDetailSerializer(order).data)


class RefreshPaymentView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request: Request, pk: int) -> Response:
        try:
            order = Order.objects.get(pk=pk, user=request.user)
        except Order.DoesNotExist:
            return Response({"detail": "Замовлення не знайдено."}, status=status.HTTP_404_NOT_FOUND)

        if order.status == Order.Status.PAID:
            return Response(OrderDetailSerializer(order).data)

        if not order.stripe_session_id:
            return Response({"detail": "Stripe session для замовлення відсутній."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            stripe_session = stripe.checkout.Session.retrieve(order.stripe_session_id)
        except stripe.error.StripeError as exc:
            logger.exception("Помилка отримання Stripe Session для замовлення #%s", order.id)
            return Response({"detail": f"Помилка Stripe: {str(exc)}"}, status=status.HTTP_502_BAD_GATEWAY)

        if stripe_session.get("payment_status") == "paid":
            order.status = Order.Status.PAID
            order.stripe_payment_intent = stripe_session.get("payment_intent", "")
            order.save(update_fields=["status", "stripe_payment_intent", "updated_at"])
            try:
                generate_and_send_invoice(order)
            except Exception:
                logger.exception("Помилка генерації інвойсу для замовлення #%s", order.id)
            return Response(OrderDetailSerializer(order).data)

        return Response(
            {"detail": f"Статус оплати: {stripe_session.get('payment_status')}"},
            status=status.HTTP_402_PAYMENT_REQUIRED,
        )


class CancelOrderView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request: Request, pk: int) -> Response:
        try:
            order = Order.objects.prefetch_related("items__product").get(pk=pk, user=request.user)
        except Order.DoesNotExist:
            return Response({"detail": "Замовлення не знайдено."}, status=status.HTTP_404_NOT_FOUND)

        if order.status not in (Order.Status.PENDING,):
            return Response(
                {"detail": "Скасувати можна лише замовлення зі статусом 'Очікує оплати'."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        delta = timezone.now() - order.created_at
        if delta.total_seconds() > 86400:
            return Response(
                {"detail": "Скасування замовлення доступне лише протягом 24 годин після створення."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        _restore_stock(order)
        order.set_status(Order.Status.CANCELLED, comment="Скасовано покупцем")

        return Response(OrderDetailSerializer(order).data)


class RepeatOrderView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request: Request, pk: int) -> Response:
        try:
            order = Order.objects.prefetch_related("items__product").get(pk=pk, user=request.user)
        except Order.DoesNotExist:
            return Response({"detail": "Замовлення не знайдено."}, status=status.HTTP_404_NOT_FOUND)

        cart_items = []
        for item in order.items.all():
            if item.product and item.product.is_active:
                cart_items.append({
                    "product_id": item.product.id,
                    "name": item.product_name,
                    "price": str(item.product.price),
                    "quantity": item.quantity,
                    "image": item.product.image or "",
                })

        return Response({"items": cart_items})
