import { useState } from "react";
import { Minus, Plus, Trash2, ShoppingBag, CreditCard, MapPin } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useCartStore } from "@/store/useCartStore";
import { useAuthStore } from "@/store/useAuthStore";

type Step = "cart" | "delivery" | "payment" | "done";

const NOVA_POSHTA_CITIES = [
  "Київ",
  "Харків",
  "Одеса",
  "Дніпро",
  "Запоріжжя",
  "Львів",
  "Вінниця",
  "Полтава",
  "Чернігів",
  "Суми",
  "Івано-Франківськ",
  "Тернопіль",
  "Рівне",
  "Луцьк",
  "Хмельницький",
  "Ужгород",
  "Миколаїв",
  "Кропивницький",
];

interface CartModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CartModal({ open, onOpenChange }: CartModalProps) {
  const { items, removeItem, updateQuantity, clearCart, totalPrice } = useCartStore();
  const { isAuthenticated } = useAuthStore();
  const [step, setStep] = useState<Step>("cart");
  const [city, setCity] = useState("");
  const [branch, setBranch] = useState("");
  const [phone, setPhone] = useState("");
  const [fullName, setFullName] = useState("");
  const [payMethod, setPayMethod] = useState<"card" | "cash">("card");

  function resetCheckout() {
    setStep("cart");
    setCity("");
    setBranch("");
    setPhone("");
    setFullName("");
    setPayMethod("card");
  }

  function handleClose(v: boolean) {
    if (!v) resetCheckout();
    onOpenChange(v);
  }

  function handleProceedToDelivery() {
    setStep("delivery");
  }

  function handleProceedToPayment() {
    if (!city || !branch || !phone || !fullName) return;
    setStep("payment");
  }

  function handleConfirmOrder() {
    clearCart();
    setStep("done");
  }

  const total = totalPrice();

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="border-neutral-800 bg-neutral-950 sm:max-w-[500px] max-h-[85vh] overflow-y-auto">
        {step === "cart" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-white">
                <ShoppingBag className="h-5 w-5" />
                Кошик
              </DialogTitle>
            </DialogHeader>

            {items.length === 0 ? (
              <div className="py-12 text-center text-neutral-500">
                Кошик порожній
              </div>
            ) : (
              <div className="space-y-4">
                {items.map((item) => (
                  <div
                    key={item.productId}
                    className="flex items-center gap-3 rounded-lg border border-neutral-800 bg-neutral-900 p-3"
                  >
                    {item.image && (
                      <img
                        src={item.image}
                        alt={item.name}
                        className="h-12 w-12 rounded object-cover"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-medium text-white">
                        {item.name}
                      </p>
                      <p className="text-xs text-neutral-400">
                        {item.price.toLocaleString("uk-UA")} грн
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                        className="flex h-7 w-7 items-center justify-center rounded border border-neutral-700 text-neutral-400 hover:text-white"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="w-6 text-center text-sm text-white">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                        className="flex h-7 w-7 items-center justify-center rounded border border-neutral-700 text-neutral-400 hover:text-white"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                    <button
                      onClick={() => removeItem(item.productId)}
                      className="text-neutral-500 hover:text-red-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}

                <div className="flex items-center justify-between border-t border-neutral-800 pt-4">
                  <span className="text-sm text-neutral-400">Разом:</span>
                  <span className="text-lg font-bold text-white">
                    {total.toLocaleString("uk-UA")} грн
                  </span>
                </div>

                <Button
                  className="w-full bg-white text-black hover:bg-neutral-200"
                  onClick={handleProceedToDelivery}
                  disabled={!isAuthenticated}
                >
                  {isAuthenticated ? "Оформити замовлення" : "Увійдіть для оформлення"}
                </Button>
              </div>
            )}
          </>
        )}

        {step === "delivery" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-white">
                <MapPin className="h-5 w-5" />
                Доставка — Нова Пошта
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm text-neutral-400">ПІБ отримувача</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Іванов Іван Іванович"
                  className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2.5 text-sm text-white placeholder-neutral-500 outline-none focus:border-neutral-500"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm text-neutral-400">Телефон</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+380 XX XXX XX XX"
                  className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2.5 text-sm text-white placeholder-neutral-500 outline-none focus:border-neutral-500"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm text-neutral-400">Місто</label>
                <select
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2.5 text-sm text-white outline-none focus:border-neutral-500"
                >
                  <option value="">Оберіть місто</option>
                  {NOVA_POSHTA_CITIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm text-neutral-400">Відділення Нової Пошти</label>
                <input
                  type="text"
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  placeholder="Відділення №1, вул. Прикладна, 10"
                  className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2.5 text-sm text-white placeholder-neutral-500 outline-none focus:border-neutral-500"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  className="flex-1 border-neutral-700 text-neutral-300 hover:bg-neutral-800"
                  onClick={() => setStep("cart")}
                >
                  Назад
                </Button>
                <Button
                  className="flex-1 bg-white text-black hover:bg-neutral-200"
                  onClick={handleProceedToPayment}
                  disabled={!city || !branch || !phone || !fullName}
                >
                  Далі
                </Button>
              </div>
            </div>
          </>
        )}

        {step === "payment" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-white">
                <CreditCard className="h-5 w-5" />
                Оплата
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-4">
                <p className="mb-1 text-xs text-neutral-500">Доставка:</p>
                <p className="text-sm text-neutral-300">
                  Нова Пошта, {city}, {branch}
                </p>
                <p className="text-sm text-neutral-300">{fullName}, {phone}</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm text-neutral-400">Спосіб оплати</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setPayMethod("card")}
                    className={`rounded-lg border p-3 text-center text-sm transition-colors ${
                      payMethod === "card"
                        ? "border-white bg-white/5 text-white"
                        : "border-neutral-700 text-neutral-400 hover:border-neutral-500"
                    }`}
                  >
                    <CreditCard className="mx-auto mb-1 h-5 w-5" />
                    Картка онлайн
                  </button>
                  <button
                    onClick={() => setPayMethod("cash")}
                    className={`rounded-lg border p-3 text-center text-sm transition-colors ${
                      payMethod === "cash"
                        ? "border-white bg-white/5 text-white"
                        : "border-neutral-700 text-neutral-400 hover:border-neutral-500"
                    }`}
                  >
                    <ShoppingBag className="mx-auto mb-1 h-5 w-5" />
                    Накладений платіж
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-neutral-800 pt-4">
                <span className="text-sm text-neutral-400">До сплати:</span>
                <span className="text-lg font-bold text-white">
                  {total.toLocaleString("uk-UA")} грн
                </span>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1 border-neutral-700 text-neutral-300 hover:bg-neutral-800"
                  onClick={() => setStep("delivery")}
                >
                  Назад
                </Button>
                <Button
                  className="flex-1 bg-white text-black hover:bg-neutral-200"
                  onClick={handleConfirmOrder}
                >
                  Підтвердити замовлення
                </Button>
              </div>
            </div>
          </>
        )}

        {step === "done" && (
          <div className="py-12 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border-2 border-green-500/40 bg-green-500/10">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-8 w-8 text-green-400">
                <path d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="mb-2 text-lg font-semibold text-white">
              Замовлення оформлено!
            </h3>
            <p className="text-sm text-neutral-400">
              Очікуйте SMS з номером ТТН на {phone}
            </p>
            <Button
              className="mt-6 bg-white text-black hover:bg-neutral-200"
              onClick={() => handleClose(false)}
            >
              Закрити
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
