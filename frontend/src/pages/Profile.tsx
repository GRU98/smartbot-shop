import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  User,
  Lock,
  MapPin,
  Package,
  Star,
  Plus,
  Trash2,
  Check,
  Loader2,
  ChevronRight,
  RotateCcw,
  Clock,
  ShoppingCart,
  Camera,
  FileText,
  RefreshCw,
  XCircle,
} from "lucide-react";
import { Header } from "@/components/Header";
import { GlobalLines } from "@/components/ui/background-paths";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthStore } from "@/store/useAuthStore";
import { useCartStore } from "@/store/useCartStore";
import { apiFetch } from "@/lib/api";
import { MapAddressPicker } from "@/components/MapAddressPicker";


type Tab = "info" | "password" | "addresses" | "orders" | "reviews";

interface ProfileData {
  id: number;
  email: string;
  name: string;
  phone: string;
  role: string;
  avatar: string;
}

interface Address {
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
  created_at: string;
}

interface OrderItem {
  product_name: string;
  product_price: string;
  quantity: number;
  line_total: string;
}

interface StatusHistory {
  id: number;
  status: string;
  status_display: string;
  comment: string;
  created_at: string;
}

interface Order {
  id: number;
  status: string;
  status_display: string;
  total_amount: string;
  discount_amount: string;
  coupon_code: string | null;
  delivery_city: string;
  delivery_address: string;
  delivery_post_office: string;
  delivery_lat: number | null;
  delivery_lng: number | null;
  created_at: string;
  items: OrderItem[];
  status_history: StatusHistory[];
  invoice_pdf_url: string | null;
}

interface Review {
  id: number;
  rating: number;
  text: string;
  product_name?: string;
  created_at: string;
}

const tabs: { key: Tab; label: string; icon: typeof User }[] = [
  { key: "info", label: "Особисті дані", icon: User },
  { key: "password", label: "Зміна пароля", icon: Lock },
  { key: "addresses", label: "Адреси доставки", icon: MapPin },
  { key: "orders", label: "Мої замовлення", icon: Package },
  { key: "reviews", label: "Мої відгуки", icon: Star },
];

const statusColors: Record<string, string> = {
  pending: "bg-yellow-500/20 text-yellow-400",
  paid: "bg-green-500/20 text-green-400",
  shipped: "bg-blue-500/20 text-blue-400",
  delivered: "bg-emerald-500/20 text-emerald-400",
  failed: "bg-red-500/20 text-red-400",
  cancelled: "bg-neutral-500/20 text-neutral-400",
};

export function Profile() {
  const { isAuthenticated } = useAuthStore();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>("info");

  useEffect(() => {
    document.documentElement.classList.add("dark");
    if (!isAuthenticated) navigate("/login");
  }, [isAuthenticated, navigate]);

  return (
    <div className="relative min-h-screen bg-neutral-950">
      <GlobalLines />
      <Header />

      <div className="relative z-10 mx-auto max-w-6xl px-4 pb-20 pt-24 md:px-6">
        <h1 className="mb-8 text-3xl font-bold text-white">Мій профіль</h1>

        <div className="flex flex-col gap-6 lg:flex-row">
          {/* Sidebar */}
          <aside className="shrink-0 lg:w-64">
            <nav className="flex flex-row gap-1 overflow-x-auto lg:flex-col">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex items-center gap-3 whitespace-nowrap rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
                      activeTab === tab.key
                        ? "bg-white text-black"
                        : "text-neutral-400 hover:bg-neutral-800 hover:text-white"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </aside>

          {/* Content */}
          <main className="min-w-0 flex-1">
            <div className="rounded-2xl border border-neutral-800 bg-neutral-900/80 p-6 backdrop-blur-sm md:p-8">
              {activeTab === "info" && <PersonalInfo />}
              {activeTab === "password" && <ChangePassword />}
              {activeTab === "addresses" && <Addresses />}
              {activeTab === "orders" && <Orders />}
              {activeTab === "reviews" && <Reviews />}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

function PersonalInfo() {
  const { setAuth, accessToken, refreshToken } = useAuthStore();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<ProfileData>("/accounts/profile/").then((data) => {
      setProfile(data);
      setName(data.name);
      setPhone(data.phone);
    });
  }, []);

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const data = await apiFetch<ProfileData>("/accounts/profile/", {
        method: "PATCH",
        body: { name, phone },
      });
      setProfile(data);
      if (accessToken && refreshToken) {
        setAuth(
          { id: data.id, email: data.email, name: data.name, role: data.role, avatar: data.avatar },
          accessToken,
          refreshToken
        );
      }
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Помилка збереження.");
    } finally {
      setSaving(false);
    }
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarUploading(true);
    setAvatarError(null);
    try {
      const formData = new FormData();
      formData.append("avatar", file);
      const token = localStorage.getItem("sb_access") ?? "";
      const base = import.meta.env.VITE_API_BASE_URL ?? "";
      const res = await fetch(`${base}/accounts/profile/avatar/`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { detail?: string }).detail ?? "Помилка завантаження");
      }
      const data: { avatar: string } = await res.json();
      setProfile((prev) => prev ? { ...prev, avatar: data.avatar } : prev);
      if (accessToken && refreshToken && profile) {
        setAuth(
          { id: profile.id, email: profile.email, name: profile.name, role: profile.role, avatar: data.avatar },
          accessToken,
          refreshToken,
        );
      }
    } catch (err) {
      setAvatarError(err instanceof Error ? err.message : "Помилка");
    } finally {
      setAvatarUploading(false);
    }
  }

  if (!profile) {
    return <div className="flex justify-center py-12"><div className="h-6 w-6 animate-spin rounded-full border-2 border-neutral-700 border-t-white" /></div>;
  }

  return (
    <div>
      <h2 className="mb-6 text-xl font-bold text-white">Особисті дані</h2>

      {/* Avatar */}
      <div className="mb-8 flex items-center gap-5">
        <div className="relative h-20 w-20 shrink-0">
          {profile.avatar ? (
            <img src={profile.avatar} alt="avatar" className="h-20 w-20 rounded-full object-cover border-2 border-neutral-700" />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-neutral-700 bg-neutral-800 text-2xl font-bold text-white">
              {(profile.name || profile.email)[0]?.toUpperCase()}
            </div>
          )}
          <label className="absolute -bottom-1 -right-1 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-neutral-700 hover:bg-neutral-600 transition-colors">
            {avatarUploading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-white" />
            ) : (
              <Camera className="h-3.5 w-3.5 text-white" />
            )}
            <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleAvatarChange} disabled={avatarUploading} />
          </label>
        </div>
        <div>
          <p className="font-medium text-white">{profile.name || profile.email}</p>
          <p className="text-sm text-neutral-500">{profile.role}</p>
          {avatarError && <p className="mt-1 text-xs text-red-400">{avatarError}</p>}
        </div>
      </div>

      <form onSubmit={handleSave} className="max-w-md space-y-5">
        <div className="space-y-2">
          <Label className="text-neutral-300">Електронна пошта</Label>
          <Input value={profile.email} disabled className="border-neutral-700 bg-neutral-800 text-neutral-400" />
        </div>
        <div className="space-y-2">
          <Label className="text-neutral-300">Ім'я</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} className="border-neutral-700 bg-neutral-800 text-white" />
        </div>
        <div className="space-y-2">
          <Label className="text-neutral-300">Телефон</Label>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+380XXXXXXXXX" className="border-neutral-700 bg-neutral-800 text-white placeholder-neutral-500" />
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}
        {success && <p className="flex items-center gap-1 text-sm text-green-400"><Check className="h-4 w-4" /> Збережено</p>}

        <Button type="submit" className="bg-white text-black hover:bg-neutral-200" disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Зберегти
        </Button>
      </form>
    </div>
  );
}

function ChangePassword() {
  const [current, setCurrent] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (newPass !== confirm) { setError("Паролі не співпадають."); return; }
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      await apiFetch("/accounts/profile/change-password/", {
        method: "POST",
        body: { current_password: current, new_password: newPass },
      });
      setSuccess(true);
      setCurrent("");
      setNewPass("");
      setConfirm("");
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Помилка зміни пароля.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h2 className="mb-6 text-xl font-bold text-white">Зміна пароля</h2>
      <form onSubmit={handleSubmit} className="max-w-md space-y-5">
        <div className="space-y-2">
          <Label className="text-neutral-300">Поточний пароль</Label>
          <Input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} className="border-neutral-700 bg-neutral-800 text-white" />
        </div>
        <div className="space-y-2">
          <Label className="text-neutral-300">Новий пароль</Label>
          <Input type="password" value={newPass} onChange={(e) => setNewPass(e.target.value)} className="border-neutral-700 bg-neutral-800 text-white" />
        </div>
        <div className="space-y-2">
          <Label className="text-neutral-300">Підтвердити новий пароль</Label>
          <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className="border-neutral-700 bg-neutral-800 text-white" />
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}
        {success && <p className="flex items-center gap-1 text-sm text-green-400"><Check className="h-4 w-4" /> Пароль змінено</p>}

        <Button type="submit" className="bg-white text-black hover:bg-neutral-200" disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Змінити пароль
        </Button>
      </form>
    </div>
  );
}

function Addresses() {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "Основна адреса",
    full_name: "",
    phone: "",
    city: "",
    address_line: "",
    post_office: "",
    lat: null as number | null,
    lng: null as number | null,
    is_default: false,
  });

  useEffect(() => {
    loadAddresses();
  }, []);

  async function loadAddresses() {
    try {
      const data = await apiFetch<Address[]>("/accounts/profile/addresses/");
      setAddresses(data);
    } finally {
      setLoading(false);
    }
  }

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await apiFetch("/accounts/profile/addresses/", { method: "POST", body: form });
      setShowForm(false);
      setForm({ title: "Основна адреса", full_name: "", phone: "", city: "", address_line: "", post_office: "", lat: null, lng: null, is_default: false });
      await loadAddresses();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    await apiFetch(`/accounts/profile/addresses/${id}/`, { method: "DELETE" });
    setAddresses((prev) => prev.filter((a) => a.id !== id));
  }

  async function handleSetDefault(id: number) {
    await apiFetch(`/accounts/profile/addresses/${id}/`, { method: "PATCH", body: { is_default: true } });
    await loadAddresses();
  }

  if (loading) {
    return <div className="flex justify-center py-12"><div className="h-6 w-6 animate-spin rounded-full border-2 border-neutral-700 border-t-white" /></div>;
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Адреси доставки</h2>
        <Button size="sm" onClick={() => setShowForm(!showForm)} className="gap-1.5 bg-white text-black hover:bg-neutral-200">
          <Plus className="h-4 w-4" />
          Додати
        </Button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="mb-6 space-y-4 rounded-xl border border-neutral-700 bg-neutral-800/50 p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-neutral-400 text-xs">Назва адреси</Label>
              <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} className="border-neutral-600 bg-neutral-800 text-white" />
            </div>
            <div className="space-y-1">
              <Label className="text-neutral-400 text-xs">ПІБ отримувача</Label>
              <Input value={form.full_name} onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))} className="border-neutral-600 bg-neutral-800 text-white" />
            </div>
            <div className="space-y-1">
              <Label className="text-neutral-400 text-xs">Телефон</Label>
              <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="+380XXXXXXXXX" className="border-neutral-600 bg-neutral-800 text-white placeholder-neutral-500" />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label className="text-neutral-400 text-xs">Адреса доставки</Label>
              <MapAddressPicker
                value={form.address_line && form.lat != null && form.lng != null ? { address: form.address_line, city: form.city, lat: form.lat, lng: form.lng } : null}
                onChange={(v) => {
                  if (v) {
                    setForm((f) => ({ ...f, address_line: v.address, city: v.city, lat: v.lat, lng: v.lng }));
                  } else {
                    setForm((f) => ({ ...f, lat: null, lng: null }));
                  }
                }}
              />
            </div>
            <div className="flex items-end">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-neutral-300">
                <input type="checkbox" checked={form.is_default} onChange={(e) => setForm((f) => ({ ...f, is_default: e.target.checked }))} className="rounded border-neutral-600" />
                За замовчуванням
              </label>
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="submit" size="sm" className="bg-white text-black hover:bg-neutral-200" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Зберегти
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setShowForm(false)} className="border-neutral-600 text-neutral-400">
              Скасувати
            </Button>
          </div>
        </form>
      )}

      {addresses.length === 0 ? (
        <p className="py-8 text-center text-neutral-500">Ви ще не додали адрес доставки</p>
      ) : (
        <div className="space-y-3">
          {addresses.map((addr) => (
            <div key={addr.id} className="flex items-start justify-between rounded-xl border border-neutral-700 bg-neutral-800/40 p-4">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium text-white">{addr.title}</p>
                  {addr.is_default && (
                    <span className="rounded bg-green-500/20 px-2 py-0.5 text-[10px] font-semibold text-green-400">За замовчуванням</span>
                  )}
                </div>
                <p className="mt-1 text-sm text-neutral-400">{addr.full_name} · {addr.phone}</p>
                <p className="text-sm text-neutral-500">{addr.city}, {addr.address_line}</p>
              </div>
              <div className="flex gap-1">
                {!addr.is_default && (
                  <Button size="icon" variant="ghost" onClick={() => handleSetDefault(addr.id)} className="h-8 w-8 text-neutral-500 hover:text-green-400" title="Зробити основною">
                    <Check className="h-4 w-4" />
                  </Button>
                )}
                <Button size="icon" variant="ghost" onClick={() => handleDelete(addr.id)} className="h-8 w-8 text-neutral-500 hover:text-red-400" title="Видалити">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Orders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [repeatLoading, setRepeatLoading] = useState<number | null>(null);
  const [refreshLoading, setRefreshLoading] = useState<number | null>(null);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [cancelLoading, setCancelLoading] = useState<number | null>(null);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const addItem = useCartStore((s) => s.addItem);
  const navigate = useNavigate();

  useEffect(() => {
    apiFetch<{ results: Order[] } | Order[]>("/accounts/profile/orders/")
      .then((data) => setOrders(Array.isArray(data) ? data : (data as { results: Order[] }).results ?? []))
      .finally(() => setLoading(false));
  }, []);

  async function refreshOrders() {
    try {
      const data = await apiFetch<{ results: Order[] } | Order[]>("/accounts/profile/orders/");
      setOrders(Array.isArray(data) ? data : (data as { results: Order[] }).results ?? []);
    } catch {}
  }

  async function handleRepeat(orderId: number) {
    setRepeatLoading(orderId);
    try {
      const data = await apiFetch<{ items: { product_id: number; name: string; price: string; quantity: number; image: string }[] }>(
        `/orders/${orderId}/repeat/`,
        { method: "POST" },
      );
      data.items.forEach((i) =>
        addItem({ productId: i.product_id, name: i.name, price: Number(i.price), image: i.image })
      );
      navigate("/cart");
    } catch {}
    setRepeatLoading(null);
  }

  async function handleCancel(orderId: number) {
    if (!confirm("Скасувати це замовлення?")) return;
    setCancelError(null);
    setCancelLoading(orderId);
    try {
      const updated = await apiFetch<Order>(`/orders/${orderId}/cancel/`, { method: "POST" });
      setOrders((prev) => prev.map((o) => (o.id === orderId ? updated : o)));
    } catch (err) {
      setCancelError(err instanceof Error ? err.message : "Помилка скасування");
    } finally {
      setCancelLoading(null);
    }
  }

  async function handleRefreshPayment(orderId: number) {
    setRefreshError(null);
    setRefreshLoading(orderId);
    try {
      await apiFetch(`/orders/${orderId}/refresh-payment/`, { method: "POST" });
      await refreshOrders();
    } catch (err) {
      setRefreshError(err instanceof Error ? err.message : "Помилка перевірки оплати");
    } finally {
      setRefreshLoading(null);
    }
  }

  if (loading) {
    return <div className="flex justify-center py-12"><div className="h-6 w-6 animate-spin rounded-full border-2 border-neutral-700 border-t-white" /></div>;
  }

  return (
    <div>
      <h2 className="mb-6 text-xl font-bold text-white">Мої замовлення</h2>

      {orders.length === 0 ? (
        <div className="py-12 text-center">
          <ShoppingCart className="mx-auto mb-3 h-10 w-10 text-neutral-700" />
          <p className="text-neutral-500">У вас поки немає замовлень</p>
          <Link to="/catalog" className="mt-4 inline-block">
            <Button variant="outline" className="border-neutral-700 text-neutral-300 hover:bg-neutral-800">До каталогу</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <div key={order.id} className="rounded-xl border border-neutral-700 bg-neutral-800/40">
              <button
                onClick={() => setExpanded(expanded === order.id ? null : order.id)}
                className="flex w-full items-center justify-between p-4 text-left"
              >
                <div className="flex items-center gap-4">
                  <div>
                    <p className="font-medium text-white">Замовлення #{order.id}</p>
                    <p className="text-xs text-neutral-500">{new Date(order.created_at).toLocaleDateString("uk-UA")}</p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${statusColors[order.status] || "bg-neutral-700 text-neutral-300"}`}>
                    {order.status_display}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-white">{Number(order.total_amount).toLocaleString("uk-UA")} грн</span>
                  <ChevronRight className={`h-4 w-4 text-neutral-500 transition-transform ${expanded === order.id ? "rotate-90" : ""}`} />
                </div>
              </button>

              {expanded === order.id && (
                <div className="border-t border-neutral-700 p-4 space-y-5">
                  {/* Items table */}
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-neutral-500">
                        <th className="pb-2 text-left font-normal">Товар</th>
                        <th className="pb-2 text-right font-normal">Ціна</th>
                        <th className="pb-2 text-right font-normal">К-сть</th>
                        <th className="pb-2 text-right font-normal">Сума</th>
                      </tr>
                    </thead>
                    <tbody>
                      {order.items.map((item, i) => (
                        <tr key={i} className="border-t border-neutral-700/50">
                          <td className="py-2 text-white">{item.product_name}</td>
                          <td className="py-2 text-right text-neutral-400">{Number(item.product_price).toLocaleString("uk-UA")} грн</td>
                          <td className="py-2 text-right text-neutral-400">{item.quantity}</td>
                          <td className="py-2 text-right text-white">{Number(item.line_total).toLocaleString("uk-UA")} грн</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Discount row */}
                  {Number(order.discount_amount) > 0 && (
                    <p className="text-sm text-green-400">
                      Знижка{order.coupon_code ? ` (${order.coupon_code})` : ""}: −{Number(order.discount_amount).toLocaleString("uk-UA")} грн
                    </p>
                  )}

                  {/* Delivery */}
                  {order.delivery_city && (
                    <p className="text-xs text-neutral-500">
                      {order.delivery_address || ""}
                    </p>
                  )}

                  {/* Status timeline */}
                  {order.status_history && order.status_history.length > 0 && (
                    <div>
                      <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                        <Clock className="h-3.5 w-3.5" /> Хронологія
                      </p>
                      <div className="space-y-2">
                        {order.status_history.map((h, idx) => (
                          <div key={h.id} className="flex items-start gap-3">
                            <div className={`mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full border-2 ${
                              idx === order.status_history.length - 1
                                ? "border-white bg-white"
                                : "border-neutral-500 bg-neutral-800"
                            }`} />
                            <div>
                              <p className="text-xs font-medium text-white">{h.status_display}</p>
                              {h.comment && <p className="text-xs text-neutral-500">{h.comment}</p>}
                              <p className="text-[10px] text-neutral-600">{new Date(h.created_at).toLocaleString("uk-UA")}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Receipt download */}
                  {order.invoice_pdf_url && (
                    <a
                      href={order.invoice_pdf_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-lg border border-neutral-600 bg-neutral-800 px-4 py-2 text-sm text-white transition-colors hover:bg-neutral-700"
                    >
                      <FileText className="h-4 w-4" />
                      Завантажити чек (PDF)
                    </a>
                  )}

                  {/* Cancel order */}
                  {order.status === "pending" && (() => {
                    const hoursAgo = (Date.now() - new Date(order.created_at).getTime()) / 3600000;
                    return hoursAgo < 24 ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-2 border-red-800 text-red-400 hover:bg-red-950/40"
                        onClick={() => handleCancel(order.id)}
                        disabled={cancelLoading === order.id}
                      >
                        {cancelLoading === order.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <XCircle className="h-4 w-4" />
                        )}
                        Скасувати замовлення
                      </Button>
                    ) : null;
                  })()}

                  {cancelError && <p className="text-sm text-red-400">{cancelError}</p>}

                  {/* Refresh payment */}
                  {order.status === "pending" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-2 border-neutral-700 text-neutral-300 hover:bg-neutral-800"
                      onClick={() => handleRefreshPayment(order.id)}
                      disabled={refreshLoading === order.id}
                    >
                      {refreshLoading === order.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4" />
                      )}
                      Перевірити оплату
                    </Button>
                  )}

                  {refreshError && (
                    <p className="text-sm text-red-400">{refreshError}</p>
                  )}

                  {/* Repeat order */}
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-2 border-neutral-700 text-neutral-300 hover:bg-neutral-800"
                    onClick={() => handleRepeat(order.id)}
                    disabled={repeatLoading === order.id}
                  >
                    {repeatLoading === order.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RotateCcw className="h-4 w-4" />
                    )}
                    Повторити замовлення
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Reviews() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<Review[]>("/accounts/profile/reviews/")
      .then(setReviews)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="flex justify-center py-12"><div className="h-6 w-6 animate-spin rounded-full border-2 border-neutral-700 border-t-white" /></div>;
  }

  return (
    <div>
      <h2 className="mb-6 text-xl font-bold text-white">Мої відгуки</h2>

      {reviews.length === 0 ? (
        <p className="py-8 text-center text-neutral-500">Ви ще не залишили жодного відгуку</p>
      ) : (
        <div className="space-y-3">
          {reviews.map((review) => (
            <div key={review.id} className="rounded-xl border border-neutral-700 bg-neutral-800/40 p-4">
              <div className="flex items-center justify-between">
                <p className="font-medium text-white">{review.product_name || "Товар"}</p>
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      className={`h-4 w-4 ${s <= review.rating ? "fill-yellow-400 text-yellow-400" : "text-neutral-600"}`}
                    />
                  ))}
                </div>
              </div>
              {review.text && <p className="mt-2 text-sm text-neutral-400">{review.text}</p>}
              <p className="mt-2 text-xs text-neutral-600">{new Date(review.created_at).toLocaleDateString("uk-UA")}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
