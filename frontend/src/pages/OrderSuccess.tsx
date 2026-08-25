import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, Package, ArrowRight, Loader2, FileText, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/Header";
import { GlobalLines } from "@/components/ui/background-paths";
import { apiFetch } from "@/lib/api";

interface OrderItem {
  id: number;
  product_name: string;
  product_price: string;
  quantity: number;
  line_total: string;
}

interface Order {
  id: number;
  status: string;
  status_display: string;
  total_amount: string;
  delivery_full_name: string;
  delivery_phone: string;
  delivery_city: string;
  delivery_post_office: string;
  created_at: string;
  items: OrderItem[];
  invoice_pdf_url: string | null;
}

export function OrderSuccess() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sessionId) { setLoading(false); return; }
    apiFetch<Order>(`/orders/by-session/?session_id=${sessionId}`)
      .then(setOrder)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [sessionId]);

  return (
    <div className="min-h-screen bg-neutral-950">
      <GlobalLines />
      <Header />
      <div className="relative z-10 mx-auto max-w-2xl px-4 pt-24 pb-20 md:px-6">
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-8 text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full border-2 border-green-500/30 bg-green-500/10">
            <CheckCircle2 className="h-10 w-10 text-green-400" />
          </div>
          <h1 className="text-2xl font-bold text-white">Оплата успішна!</h1>
          <p className="mt-2 text-neutral-400">Дякуємо за покупку. Чек також надіслано на вашу пошту.</p>
        </div>

        {loading && (
          <div className="mt-6 flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-neutral-500" />
          </div>
        )}

        {order && (
          <div className="mt-6 space-y-4">
            <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-6">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-neutral-400" />
                  <span className="font-semibold text-white">Замовлення #{order.id}</span>
                </div>
                <span className="rounded-full bg-green-500/10 px-3 py-1 text-xs font-medium text-green-400">
                  {order.status_display}
                </span>
              </div>

              <div className="space-y-2">
                {order.items.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span className="text-neutral-300">{item.product_name} × {item.quantity}</span>
                    <span className="text-white">{Number(item.line_total).toLocaleString("uk-UA")} грн</span>
                  </div>
                ))}
              </div>

              <div className="mt-4 border-t border-neutral-800 pt-4">
                <div className="flex justify-between font-semibold">
                  <span className="text-neutral-400">Разом сплачено:</span>
                  <span className="text-white">{Number(order.total_amount).toLocaleString("uk-UA")} грн</span>
                </div>
              </div>
            </div>

            {order.delivery_city && (
              <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-6">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-500">Доставка</p>
                <p className="text-sm text-white">{order.delivery_full_name}</p>
                <p className="text-sm text-neutral-400">{order.delivery_phone}</p>
                <p className="text-sm text-neutral-400">Нова Пошта, {order.delivery_city}, {order.delivery_post_office}</p>
              </div>
            )}

            {order.invoice_pdf_url && (
              <a
                href={order.invoice_pdf_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 rounded-2xl border border-neutral-700 bg-neutral-900/50 p-4 text-sm font-medium text-white transition-colors hover:bg-neutral-800"
              >
                <FileText className="h-4 w-4" />
                Завантажити фіскальний чек (PDF)
              </a>
            )}

            <div className="flex items-start gap-3 rounded-2xl border border-blue-500/20 bg-blue-500/5 p-4">
              <Mail className="mt-0.5 h-4 w-4 shrink-0 text-blue-400" />
              <p className="text-xs text-neutral-400">
                HTML-версія чека надіслана на <span className="text-white">{order.delivery_phone ? "ваш email" : "ваш email"}</span>.
              </p>
            </div>
          </div>
        )}

        <div className="mt-8 flex justify-center gap-4">
          <Link to="/profile">
            <Button variant="outline" className="border-neutral-700 text-neutral-300 hover:bg-neutral-800">
              Мої замовлення
            </Button>
          </Link>
          <Link to="/catalog">
            <Button className="bg-white text-black hover:bg-neutral-200">
              До каталогу
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
