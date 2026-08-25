import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import {
  Minus, Plus, Trash2, ShoppingBag, CreditCard, MapPin,
  ArrowLeft, AlertCircle, Lock, ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/Header";
import { GlobalLines } from "@/components/ui/background-paths";
import { useCartStore } from "@/store/useCartStore";
import { useAuthStore } from "@/store/useAuthStore";
import { apiFetch } from "@/lib/api";
import { MapAddressPicker, type AddressValue } from "@/components/MapAddressPicker";

interface SavedAddress {
  id: number;
  title: string;
  full_name: string;
  phone: string;
  city: string;
  address_line: string;
  post_office: string;
  lat: number | null;
  lng: number | null;
  is_default: boolean;
}

type Step = "cart" | "delivery" | "payment";

export function Cart() {
  const { items, removeItem, updateQuantity, clearCart, totalPrice } = useCartStore();
  const { isAuthenticated, accessToken } = useAuthStore();
  const [step, setStep] = useState<Step>("cart");
  const [city, setCity] = useState("");
  const [addressLine, setAddressLine] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [phone, setPhone] = useState("");
  const [fullName, setFullName] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [addAddressLoading, setAddAddressLoading] = useState(false);
  const [newAddress, setNewAddress] = useState({
    title: "Основна адреса",
    full_name: "",
    phone: "",
    city: "",
    address_line: "",
    post_office: "",
    lat: null as number | null,
    lng: null as number | null,
    is_default: true,
  });
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState("");
  const [couponData, setCouponData] = useState<{
    discount_amount: string; final_total: string;
    coupon: { code: string; description: string; discount_type: string; discount_value: string };
  } | null>(null);

  const total = totalPrice();

  useEffect(() => {
    if (!isAuthenticated || !accessToken) return;
    refreshSavedAddresses().then((addrs) => {
      if (!addrs) return;
      const def = addrs.find((a) => a.is_default) ?? addrs[0];
      if (def) {
        setSelectedAddressId(def.id);
        setFullName(def.full_name);
        setPhone(def.phone);
        setCity(def.city);
        setAddressLine(def.address_line);
        setLat(def.lat);
        setLng(def.lng);
      }
    });
  }, [isAuthenticated, accessToken]);

  function handleSelectAddress(addr: SavedAddress) {
    setSelectedAddressId(addr.id);
    setFullName(addr.full_name);
    setPhone(addr.phone);
    setCity(addr.city);
    setAddressLine(addr.address_line);
    setLat(addr.lat);
    setLng(addr.lng);
  }

  function handleMapSelect(value: AddressValue | null) {
    if (value) {
      setCity(value.city);
      setAddressLine(value.address);
      setLat(value.lat);
      setLng(value.lng);
    } else {
      setAddressLine("");
      setLat(null);
      setLng(null);
    }
  }

  function handleNewAddressMap(value: AddressValue | null) {
    if (value) {
      setNewAddress((prev) => ({
        ...prev,
        city: value.city,
        address_line: value.address,
        lat: value.lat,
        lng: value.lng,
      }));
    } else {
      setNewAddress((prev) => ({ ...prev, address_line: "", lat: null, lng: null }));
    }
  }

  async function refreshSavedAddresses() {
    if (!isAuthenticated || !accessToken) return;
    try {
      const addrs = await apiFetch<SavedAddress[]>("/accounts/profile/addresses/");
      setSavedAddresses(addrs);
      return addrs;
    } catch {
      return savedAddresses;
    }
  }

  async function handleSaveNewAddress(e: FormEvent) {
    e.preventDefault();
    if (!newAddress.full_name || !newAddress.phone || !newAddress.city || !newAddress.address_line) {
      setCheckoutError("Заповніть ПІБ, телефон та адресу для збереження.");
      return;
    }
    setAddAddressLoading(true);
    setCheckoutError("");
    try {
      const saved = await apiFetch<SavedAddress>("/accounts/profile/addresses/", {
        method: "POST",
        body: {
          ...newAddress,
          title: newAddress.title || "Основна адреса",
        },
      });
      const addrs = await refreshSavedAddresses();
      if (addrs) {
        const picked = addrs.find((a) => a.id === saved.id) ?? saved;
        handleSelectAddress(picked);
      }
      setShowAddressForm(false);
      setNewAddress({
        title: "Основна адреса",
        full_name: "",
        phone: "",
        city: "",
        address_line: "",
        post_office: "",
        lat: null,
        lng: null,
        is_default: true,
      });
    } catch (err: unknown) {
      setCheckoutError(err instanceof Error ? err.message : "Не вдалося зберегти адресу.");
    } finally {
      setAddAddressLoading(false);
    }
  }

  async function handleApplyCoupon() {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    setCouponError("");
    setCouponData(null);
    try {
      const data = await apiFetch<typeof couponData>("/coupons/validate/", {
        method: "POST",
        body: { code: couponCode.trim(), order_total: total },
      });
      setCouponData(data);
    } catch (err: unknown) {
      setCouponError(err instanceof Error ? err.message : "Невірний купон");
    } finally {
      setCouponLoading(false);
    }
  }

  async function handleCheckout() {
    if (!isAuthenticated) return;
    setCheckoutLoading(true);
    setCheckoutError("");
    try {
      const payload = {
        items: items.map((i) => ({ product_id: i.productId, quantity: i.quantity })),
        delivery_full_name: fullName,
        delivery_phone: phone,
        delivery_city: city,
        delivery_address: addressLine,
        delivery_lat: lat,
        delivery_lng: lng,
        coupon_code: couponData ? couponData.coupon.code : "",
      };
      const data = await apiFetch<{ checkout_url: string }>("/orders/checkout/", {
        method: "POST",
        body: payload,
      });
      clearCart();
      window.location.href = data.checkout_url;
    } catch (err: unknown) {
      setCheckoutError(err instanceof Error ? err.message : "Помилка оформлення замовлення");
    } finally {
      setCheckoutLoading(false);
    }
  }

  const STEPS: { key: Step; label: string }[] = [
    { key: "cart", label: "Кошик" },
    { key: "delivery", label: "Доставка" },
    { key: "payment", label: "Оплата" },
  ];
  const stepIndex = STEPS.findIndex((s) => s.key === step);

  return (
    <div className="min-h-screen bg-neutral-950">
      <GlobalLines />
      <Header />

      <div className="relative z-10 mx-auto max-w-4xl px-4 pt-24 pb-20 md:px-6">
        <div className="mb-8 flex items-center gap-2">
          {STEPS.map((s, i) => (
            <div key={s.key} className="flex items-center gap-2">
              <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                i < stepIndex ? "bg-green-500 text-white" :
                i === stepIndex ? "bg-white text-black" :
                "border border-neutral-700 text-neutral-500"
              }`}>
                {i + 1}
              </div>
              <span className={`text-sm ${i === stepIndex ? "text-white font-medium" : "text-neutral-500"}`}>
                {s.label}
              </span>
              {i < STEPS.length - 1 && <ChevronRight className="h-4 w-4 text-neutral-700" />}
            </div>
          ))}
        </div>

        {step === "cart" && (
          <>
            <div className="mb-8">
              <h1 className="flex items-center gap-3 text-2xl font-bold text-white">
                <ShoppingBag className="h-6 w-6" />
                Кошик
              </h1>
            </div>

            {items.length === 0 ? (
              <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 py-20 text-center">
                <ShoppingBag className="mx-auto mb-4 h-12 w-12 text-neutral-600" />
                <p className="text-neutral-400">Кошик порожній</p>
                <Link
                  to="/catalog"
                  className="mt-4 inline-flex items-center gap-2 text-sm text-white underline-offset-4 hover:underline"
                >
                  <ArrowLeft className="h-4 w-4" />
                  До каталогу
                </Link>
              </div>
            ) : (
              <div className="lg:grid lg:grid-cols-3 lg:gap-8">
                <div className="lg:col-span-2 space-y-3">
                  {items.map((item) => (
                    <div
                      key={item.productId}
                      className="flex items-center gap-4 rounded-xl border border-neutral-800 bg-neutral-900/50 p-4"
                    >
                      {item.image ? (
                        <img src={item.image} alt={item.name} className="h-16 w-16 shrink-0 rounded-lg object-cover" />
                      ) : (
                        <div className="h-16 w-16 shrink-0 rounded-lg bg-neutral-800" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="truncate font-medium text-white">{item.name}</p>
                        <p className="text-sm text-neutral-400">{item.price.toLocaleString("uk-UA")} грн / шт.</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-700 text-neutral-400 hover:border-neutral-500 hover:text-white"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="w-8 text-center text-sm font-medium text-white">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-700 text-neutral-400 hover:border-neutral-500 hover:text-white"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <p className="w-28 shrink-0 text-right font-semibold text-white">
                        {(item.price * item.quantity).toLocaleString("uk-UA")} грн
                      </p>
                      <button onClick={() => removeItem(item.productId)} className="text-neutral-600 hover:text-red-400">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="mt-6 lg:mt-0">
                  <div className="sticky top-24 rounded-2xl border border-neutral-800 bg-neutral-900/60 p-6">
                    <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-neutral-500">Підсумок</p>
                    <div className="space-y-2 text-sm text-neutral-400">
                      {items.map((i) => (
                        <div key={i.productId} className="flex justify-between">
                          <span className="truncate pr-2">{i.name} × {i.quantity}</span>
                          <span className="shrink-0">{(i.price * i.quantity).toLocaleString("uk-UA")}</span>
                        </div>
                      ))}
                    </div>
                    <div className="my-4 border-t border-neutral-800" />
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-400">Разом:</span>
                      <span className="text-2xl font-bold text-white">{total.toLocaleString("uk-UA")} <span className="text-base font-normal">грн</span></span>
                    </div>
                    <div className="mt-5 space-y-3">
                      <Link to="/catalog">
                        <Button variant="outline" className="w-full border-neutral-700 text-neutral-300 hover:bg-neutral-800">
                          <ArrowLeft className="mr-2 h-4 w-4" />
                          Продовжити покупки
                        </Button>
                      </Link>
                      {isAuthenticated ? (
                        <Button
                          className="w-full bg-white text-black hover:bg-neutral-200"
                          onClick={() => setStep("delivery")}
                        >
                          Оформити замовлення
                          <ChevronRight className="ml-1 h-4 w-4" />
                        </Button>
                      ) : (
                        <Link to="/login">
                          <Button className="w-full bg-white text-black hover:bg-neutral-200">
                            Увійти для оформлення
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {step === "delivery" && (
          <>
            <div className="mb-8">
              <h1 className="flex items-center gap-3 text-2xl font-bold text-white">
                <MapPin className="h-6 w-6" />
                Доставка
              </h1>
              <p className="mt-1 text-sm text-neutral-400">Нова Пошта — доставка по всій Україні</p>
            </div>

            <div className="mb-5">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Збережені адреси</p>
                <Link to="/profile" className="text-xs text-neutral-400 hover:text-white">Керувати адресами</Link>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {savedAddresses.map((addr) => (
                  <button
                    key={addr.id}
                    onClick={() => handleSelectAddress(addr)}
                    className={`rounded-xl border p-4 text-left transition-colors ${
                      selectedAddressId === addr.id
                        ? "border-white bg-white/5"
                        : "border-neutral-700 hover:border-neutral-500"
                    }`}
                  >
                    <p className="text-sm font-medium text-white">{addr.title || addr.full_name}</p>
                    <p className="mt-0.5 text-xs text-neutral-400">{addr.full_name}</p>
                    <p className="text-xs text-neutral-500">{addr.city}, {addr.address_line}</p>
                    <p className="text-xs text-neutral-500">{addr.phone}</p>
                    {addr.is_default && (
                      <span className="mt-1 inline-block rounded bg-white/10 px-2 py-0.5 text-[10px] text-neutral-300">
                        За замовчуванням
                      </span>
                    )}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setNewAddress((prev) => ({
                      ...prev,
                      full_name: fullName,
                      phone,
                      city,
                      address_line: addressLine,
                      lat,
                      lng,
                    }));
                    setShowAddressForm(true);
                  }}
                  className="flex min-h-[96px] items-center justify-center gap-2 rounded-xl border border-dashed border-neutral-600 p-4 text-sm text-neutral-400 transition-colors hover:border-neutral-400 hover:text-white"
                >
                  <Plus className="h-4 w-4" />
                  Додати нову адресу
                </button>
              </div>
            </div>

            {showAddressForm && (
              <form onSubmit={handleSaveNewAddress} className="mb-5 space-y-4 rounded-2xl border border-neutral-800 bg-neutral-900/50 p-6">
                <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Нова адреса</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm text-neutral-400">Назва адреси</label>
                    <input
                      type="text"
                      value={newAddress.title}
                      onChange={(e) => setNewAddress((prev) => ({ ...prev, title: e.target.value }))}
                      placeholder="Основна адреса"
                      className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-3 text-sm text-white placeholder-neutral-500 outline-none focus:border-neutral-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-neutral-400">ПІБ отримувача</label>
                    <input
                      type="text"
                      value={newAddress.full_name}
                      onChange={(e) => setNewAddress((prev) => ({ ...prev, full_name: e.target.value }))}
                      placeholder="Іванов Іван Іванович"
                      className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-3 text-sm text-white placeholder-neutral-500 outline-none focus:border-neutral-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-neutral-400">Телефон</label>
                    <input
                      type="tel"
                      value={newAddress.phone}
                      onChange={(e) => setNewAddress((prev) => ({ ...prev, phone: e.target.value }))}
                      placeholder="+380 XX XXX XX XX"
                      className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-3 text-sm text-white placeholder-neutral-500 outline-none focus:border-neutral-500"
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <MapAddressPicker
                      value={
                        newAddress.address_line && newAddress.lat != null && newAddress.lng != null
                          ? { address: newAddress.address_line, city: newAddress.city, lat: newAddress.lat, lng: newAddress.lng }
                          : null
                      }
                      onChange={handleNewAddressMap}
                    />
                  </div>
                  <div className="flex items-center gap-2 sm:col-span-2">
                    <input
                      type="checkbox"
                      id="is_default"
                      checked={newAddress.is_default}
                      onChange={(e) => setNewAddress((prev) => ({ ...prev, is_default: e.target.checked }))}
                      className="h-4 w-4 rounded border-neutral-600 bg-neutral-800 accent-white"
                    />
                    <label htmlFor="is_default" className="text-sm text-neutral-300">Адреса за замовчуванням</label>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button type="submit" disabled={addAddressLoading} className="bg-white text-black hover:bg-neutral-200">
                    {addAddressLoading ? "Збереження..." : "Зберегти адресу"}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setShowAddressForm(false)} className="border-neutral-700 text-neutral-300 hover:bg-neutral-800">
                    Скасувати
                  </Button>
                </div>
              </form>
            )}

            <div className="space-y-5 rounded-2xl border border-neutral-800 bg-neutral-900/50 p-6">
              <div className="grid gap-5 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm text-neutral-400">ПІБ отримувача</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Іванов Іван Іванович"
                    className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-3 text-sm text-white placeholder-neutral-500 outline-none focus:border-neutral-500"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-neutral-400">Телефон</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+380 XX XXX XX XX"
                    className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-3 text-sm text-white placeholder-neutral-500 outline-none focus:border-neutral-500"
                  />
                </div>
              </div>

              <MapAddressPicker
                value={addressLine && lat != null && lng != null ? { address: addressLine, city, lat, lng } : null}
                onChange={handleMapSelect}
              />
              <label className="flex items-start gap-3 pt-2">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-neutral-600 bg-neutral-800 accent-white"
                />
                <span className="text-xs text-neutral-400">
                  Я погоджуюсь з{" "}
                  <Link to="/terms-of-service" className="underline hover:text-white">умовами обслуговування</Link>{" "}
                  та{" "}
                  <Link to="/privacy-policy" className="underline hover:text-white">політикою конфіденційності</Link>
                </span>
              </label>
            </div>

            <div className="mt-6 flex gap-4">
              <Button variant="outline" className="border-neutral-700 text-neutral-300 hover:bg-neutral-800" onClick={() => setStep("cart")}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Назад
              </Button>
              <Button
                className="flex-1 bg-white text-black hover:bg-neutral-200"
                onClick={() => setStep("payment")}
                disabled={!city || !addressLine || !phone || !fullName || !agreed}
              >
                Далі — огляд і оплата
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </>
        )}

        {step === "payment" && (
          <>
            <div className="mb-8">
              <h1 className="flex items-center gap-3 text-2xl font-bold text-white">
                <CreditCard className="h-6 w-6" />
                Огляд замовлення
              </h1>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-6">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-500">Доставка</p>
                <p className="text-sm font-medium text-white">{fullName}</p>
                <p className="mt-1 text-sm text-neutral-400">{phone}</p>
                <p className="mt-1 text-sm text-neutral-400">{addressLine}</p>
              </div>

              <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-6">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-500">Товари</p>
                <div className="space-y-2">
                  {items.map((i) => (
                    <div key={i.productId} className="flex justify-between text-sm">
                      <span className="text-neutral-300">{i.name} × {i.quantity}</span>
                      <span className="font-medium text-white">{(i.price * i.quantity).toLocaleString("uk-UA")} грн</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 border-t border-neutral-800 pt-4 space-y-1">
                  {couponData && (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-neutral-400">Сума:</span>
                        <span className="text-neutral-400">{total.toLocaleString("uk-UA")} грн</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-green-400">Знижка ({couponData.coupon.code}):</span>
                        <span className="text-green-400">−{Number(couponData.discount_amount).toLocaleString("uk-UA")} грн</span>
                      </div>
                    </>
                  )}
                  <div className="flex justify-between">
                    <span className="font-medium text-neutral-400">До сплати:</span>
                    <span className="text-xl font-bold text-white">
                      {couponData ? Number(couponData.final_total).toLocaleString("uk-UA") : total.toLocaleString("uk-UA")} грн
                    </span>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-6">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-500">Промокод</p>
                {couponData ? (
                  <div className="flex items-center justify-between rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold text-green-400">{couponData.coupon.code}</p>
                      <p className="text-xs text-neutral-400">{couponData.coupon.description || "Знижку застосовано"}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-green-400">−{Number(couponData.discount_amount).toLocaleString("uk-UA")} грн</p>
                      <button onClick={() => { setCouponData(null); setCouponCode(""); }} className="text-xs text-neutral-500 hover:text-neutral-300">Скасувати</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      onKeyDown={(e) => e.key === "Enter" && handleApplyCoupon()}
                      placeholder="ПРОМОКОД"
                      className="flex-1 rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-2.5 text-sm text-white placeholder-neutral-500 outline-none focus:border-neutral-500"
                    />
                    <Button
                      variant="outline"
                      onClick={handleApplyCoupon}
                      disabled={couponLoading || !couponCode.trim()}
                      className="border-neutral-700 text-neutral-300 hover:bg-neutral-800"
                    >
                      {couponLoading ? "..." : "Застосувати"}
                    </Button>
                  </div>
                )}
                {couponError && <p className="mt-2 text-xs text-red-400">{couponError}</p>}
              </div>

              <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-4 flex items-start gap-3">
                <Lock className="mt-0.5 h-4 w-4 shrink-0 text-blue-400" />
                <p className="text-xs text-neutral-400">
                  Оплата відбувається через захищений шлюз <strong className="text-white">Stripe</strong>. Ваші платіжні дані не зберігаються на наших серверах.
                </p>
              </div>

              {checkoutError && (
                <div className="flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
                  <p className="text-sm text-red-400">{checkoutError}</p>
                </div>
              )}
            </div>

            <div className="mt-6 flex gap-4">
              <Button variant="outline" className="border-neutral-700 text-neutral-300 hover:bg-neutral-800" onClick={() => setStep("delivery")}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Змінити доставку
              </Button>
              <Button
                className="flex-1 bg-white text-black hover:bg-neutral-200 disabled:opacity-60"
                onClick={handleCheckout}
                disabled={checkoutLoading}
              >
                {checkoutLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-neutral-400 border-t-black" />
                    Перенаправлення...
                  </span>
                ) : (
                  <>
                    <CreditCard className="mr-2 h-4 w-4" />
                    Сплатити через Stripe
                  </>
                )}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
