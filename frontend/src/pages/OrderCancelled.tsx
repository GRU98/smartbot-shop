import { Link } from "react-router-dom";
import { XCircle, ArrowLeft, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/Header";
import { GlobalLines } from "@/components/ui/background-paths";

export function OrderCancelled() {
  return (
    <div className="min-h-screen bg-neutral-950">
      <GlobalLines />
      <Header />
      <div className="relative z-10 mx-auto max-w-xl px-4 pt-24 pb-20 md:px-6">
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 py-16 text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full border-2 border-red-500/30 bg-red-500/10">
            <XCircle className="h-10 w-10 text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-white">Оплату скасовано</h1>
          <p className="mt-2 text-neutral-400">
            Ваше замовлення не було оплачено. Товари повернуто на склад.
          </p>
          <div className="mt-8 flex justify-center gap-4">
            <Link to="/cart">
              <Button variant="outline" className="border-neutral-700 text-neutral-300 hover:bg-neutral-800">
                <ShoppingCart className="mr-2 h-4 w-4" />
                Повернутись до кошика
              </Button>
            </Link>
            <Link to="/catalog">
              <Button className="bg-white text-black hover:bg-neutral-200">
                <ArrowLeft className="mr-2 h-4 w-4" />
                До каталогу
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
