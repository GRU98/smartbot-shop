import { lazy, Suspense, useEffect, useState, memo } from "react";
import { Routes, Route, Link } from "react-router-dom";
import { HelmetProvider, Helmet } from "react-helmet-async";
import { Star, ShoppingCart, Zap, Package, Tag } from "lucide-react";
import { CookieBanner } from "@/components/ui/cookie-banner";
import { Toaster } from "@/components/ui/toaster";
import { useToastStore } from "@/store/useToastStore";
import { Header } from "@/components/Header";
import { MainShowcase } from "@/components/MainShowcase";
import { Button } from "@/components/ui/button";
import { useCartStore } from "@/store/useCartStore";
import { useAuthStore } from "@/store/useAuthStore";
import { apiFetch } from "@/lib/api";
import { Footer } from "@/components/Footer";

const VerifyEmail = lazy(() => import("@/pages/VerifyEmail").then(m => ({ default: m.VerifyEmail })));
const ResetPassword = lazy(() => import("@/pages/ResetPassword").then(m => ({ default: m.ResetPassword })));
const PrivacyPolicy = lazy(() => import("@/pages/PrivacyPolicy").then(m => ({ default: m.PrivacyPolicy })));
const TermsOfService = lazy(() => import("@/pages/TermsOfService").then(m => ({ default: m.TermsOfService })));
const OAuthCallback = lazy(() => import("@/pages/OAuthCallback").then(m => ({ default: m.OAuthCallback })));
const Catalog = lazy(() => import("@/pages/Catalog").then(m => ({ default: m.Catalog })));
const Cart = lazy(() => import("@/pages/Cart").then(m => ({ default: m.Cart })));
const Login = lazy(() => import("@/pages/Login").then(m => ({ default: m.Login })));
const Register = lazy(() => import("@/pages/Register").then(m => ({ default: m.Register })));
const ForgotPassword = lazy(() => import("@/pages/ForgotPassword").then(m => ({ default: m.ForgotPassword })));
const ProductDetail = lazy(() => import("@/pages/ProductDetail").then(m => ({ default: m.ProductDetail })));
const Profile = lazy(() => import("@/pages/Profile").then(m => ({ default: m.Profile })));
const Wishlist = lazy(() => import("@/pages/Wishlist").then(m => ({ default: m.Wishlist })));
const OrderSuccess = lazy(() => import("@/pages/OrderSuccess").then(m => ({ default: m.OrderSuccess })));
const OrderCancelled = lazy(() => import("@/pages/OrderCancelled").then(m => ({ default: m.OrderCancelled })));
const Compare = lazy(() => import("@/pages/Compare").then(m => ({ default: m.Compare })));
const NotFound = lazy(() => import("@/pages/NotFound").then(m => ({ default: m.NotFound })));
const About = lazy(() => import("@/pages/About").then(m => ({ default: m.About })));
const Contacts = lazy(() => import("@/pages/Contacts").then(m => ({ default: m.Contacts })));

const PageLoader = () => (
  <div className="flex min-h-screen items-center justify-center bg-neutral-950">
    <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-700 border-t-white" />
  </div>
);

interface PopularProduct {
  id: number;
  name: string;
  slug: string;
  brand: string;
  price: string;
  image: string;
  is_featured: boolean;
  avg_rating: number | null;
  review_count: number;
  total_sold: number;
  stock: number;
}

type HomeTab = "popular" | "featured" | "new";

const HOME_TABS: { key: HomeTab; label: string; icon: typeof Zap; param: string }[] = [
  { key: "popular", label: "Хіти продажів", icon: Zap, param: "/products/?ordering=popular&limit=12" },
  { key: "featured", label: "Акції", icon: Tag, param: "/products/?featured=true&limit=12" },
  { key: "new", label: "Новинки", icon: Package, param: "/products/?ordering=-created_at&limit=12" },
];

const ProductCard = memo(function ProductCard({ product, onAdd, onToast }: { product: PopularProduct; onAdd: () => void; onToast: () => void }) {
  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900 transition-all hover:border-neutral-600 hover:shadow-xl hover:shadow-black/40">
      <Link to={`/product/${product.slug}`} className="relative aspect-square overflow-hidden bg-neutral-800">
        {product.image ? (
          <img
            src={product.image}
            alt={product.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="h-full w-full bg-neutral-800" />
        )}
        {product.is_featured && (
          <span className="absolute left-3 top-3 rounded-lg bg-white px-2.5 py-1 text-xs font-bold text-black">
            Акція
          </span>
        )}
        {product.stock === 0 && (
          <div className="absolute inset-0 flex items-end justify-center bg-black/50 pb-4">
            <span className="rounded-lg bg-neutral-900/90 px-3 py-1 text-sm font-medium text-neutral-400">
              Немає в наявності
            </span>
          </div>
        )}
      </Link>

      <div className="flex flex-1 flex-col p-5">
        <p className="text-sm font-medium text-neutral-500">{product.brand}</p>
        <Link to={`/product/${product.slug}`}>
          <h3 className="mt-1 line-clamp-2 text-base font-semibold text-white hover:text-neutral-300 transition-colors">
            {product.name}
          </h3>
        </Link>
        {product.avg_rating != null && (
          <div className="mt-2 flex items-center gap-1.5">
            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
            <span className="text-sm font-medium text-neutral-300">{product.avg_rating.toFixed(1)}</span>
            <span className="text-sm text-neutral-600">({product.review_count})</span>
          </div>
        )}
        <div className="mt-1.5">
          {product.stock === 0 ? (
            <span className="text-xs font-medium text-red-400">Немає в наявності</span>
          ) : product.stock <= 10 ? (
            <span className="text-xs font-medium text-amber-400">Залишок: {product.stock} шт.</span>
          ) : (
            <span className="text-xs font-medium text-green-500">В наявності</span>
          )}
        </div>
        <div className="mt-auto flex items-end justify-between pt-4">
          <div>
            <span className="text-2xl font-bold text-white">
              {Number(product.price).toLocaleString("uk-UA")}
            </span>
            <span className="ml-1 text-base text-neutral-500">грн</span>
          </div>
          <Button
            size="sm"
            disabled={product.stock === 0}
            className="gap-1.5 bg-white text-black hover:bg-neutral-200 disabled:opacity-40"
            onClick={(e) => { e.preventDefault(); if (product.stock > 0) { onAdd(); onToast(); } }}
          >
            <ShoppingCart className="h-4 w-4" />
            В кошик
          </Button>
        </div>
      </div>
    </div>
  );
});

function HomePage() {
  const [tab, setTab] = useState<HomeTab>("popular");
  const [tabProducts, setTabProducts] = useState<Record<HomeTab, PopularProduct[]>>({
    popular: [], featured: [], new: [],
  });
  const [loading, setLoading] = useState(true);
  const [recentlyViewed, setRecentlyViewed] = useState<PopularProduct[]>([]);
  const addItem = useCartStore((s) => s.addItem);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const showToast = useToastStore((s) => s.show);

  useEffect(() => {
    document.documentElement.classList.add("dark");
    setLoading(true);
    const currentTab = HOME_TABS.find((t) => t.key === tab)!;
    apiFetch<{ results: PopularProduct[] } | PopularProduct[]>(currentTab.param)
      .then((data) => {
        const list = Array.isArray(data) ? data : (data as { results: PopularProduct[] }).results ?? [];
        setTabProducts((prev) => ({ ...prev, [tab]: list }));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [tab]);

  useEffect(() => {
    if (isAuthenticated) {
      apiFetch<PopularProduct[]>("/recently-viewed/")
        .then(setRecentlyViewed)
        .catch(() => {});
    }
  }, [isAuthenticated]);

  const products = tabProducts[tab];

  return (
    <div className="min-h-screen bg-neutral-950">
      <Helmet>
        <title>SmartBot Shop — Розумна техніка для дому</title>
        <meta name="description" content="Купуй роботи-пилососи, розумні колонки, гаджети для дому з доставкою по всій Україні. Офіційна гарантія, надійні бренди." />
        <meta property="og:title" content="SmartBot Shop" />
        <meta property="og:description" content="Розумна техніка для дому" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://smartbotik.duckdns.org" />
      </Helmet>
      <Header />

      <div className="mx-auto max-w-screen-2xl px-4 pt-24 md:px-8">
        {/* Hero */}
        <MainShowcase />

        {/* Tabs section */}
        <section className="mt-16">
          {/* Tab nav */}
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-1 rounded-xl border border-neutral-800 bg-neutral-900 p-1">
              {HOME_TABS.map((t) => {
                const Icon = t.icon;
                return (
                  <button
                    key={t.key}
                    onClick={() => setTab(t.key)}
                    className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all ${
                      tab === t.key
                        ? "bg-white text-black shadow"
                        : "text-neutral-400 hover:text-white"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {t.label}
                  </button>
                );
              })}
            </div>
            <Link to="/catalog">
              <Button variant="outline" className="border-neutral-700 text-neutral-300 hover:bg-neutral-800">
                Весь каталог →
              </Button>
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="aspect-[3/4] animate-pulse rounded-2xl bg-neutral-800" />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <Package className="mb-4 h-12 w-12 text-neutral-700" />
              <p className="text-lg text-neutral-500">Товари не знайдено</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onAdd={() => addItem({ productId: product.id, name: product.name, price: Number(product.price), image: product.image || "" })}
                  onToast={() => showToast(`${product.name.slice(0, 30)}... додано в кошик`)}
                />
              ))}
            </div>
          )}
        </section>

        {/* Recently Viewed */}
        {recentlyViewed.length > 0 && (
          <section className="mt-16 border-t border-neutral-800 pt-12">
            <h2 className="mb-6 text-2xl font-bold text-white">Нещодавно переглянуті</h2>
            <div className="flex gap-4 overflow-x-auto pb-2">
              {recentlyViewed.map((p) => (
                <Link
                  key={p.id}
                  to={`/product/${p.slug}`}
                  className="group w-44 shrink-0 rounded-xl border border-neutral-800 bg-neutral-900 p-3 hover:border-neutral-600 transition-colors"
                >
                  <div className="aspect-square overflow-hidden rounded-lg bg-neutral-800 mb-3 flex items-center justify-center">
                    {p.image ? (
                      <img src={p.image} alt={p.name} loading="lazy" decoding="async" className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                    ) : (
                      <span className="text-2xl font-black text-white/20">
                        {p.name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase()}
                      </span>
                    )}
                  </div>
                  <p className="line-clamp-2 text-sm text-white">{p.name}</p>
                  <p className="mt-1.5 text-base font-bold text-white">
                    {Number(p.price).toLocaleString("uk-UA")} <span className="text-sm font-normal text-neutral-500">грн</span>
                  </p>
                </Link>
              ))}
            </div>
          </section>
        )}

      </div>

      <Footer />
      <CookieBanner />
      <Toaster />
    </div>
  );
}

export function App() {
  return (
    <HelmetProvider>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/terms-of-service" element={<TermsOfService />} />
          <Route path="/oauth/callback" element={<OAuthCallback />} />
          <Route path="/catalog" element={<Catalog />} />
          <Route path="/product/:slug" element={<ProductDetail />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/wishlist" element={<Wishlist />} />
          <Route path="/order-success" element={<OrderSuccess />} />
          <Route path="/order-cancelled" element={<OrderCancelled />} />
          <Route path="/compare" element={<Compare />} />
          <Route path="/about" element={<About />} />
          <Route path="/contacts" element={<Contacts />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </HelmetProvider>
  );
}
