import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { apiFetch } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/Header";
import { GlobalLines } from "@/components/ui/background-paths";
import { useCartStore } from "@/store/useCartStore";
import { useAuthStore } from "@/store/useAuthStore";
import { useToastStore } from "@/store/useToastStore";
import { Toaster } from "@/components/ui/toaster";
import { Footer } from "@/components/Footer";
import {
  ShoppingCart, Search, Star, Heart, SlidersHorizontal,
  ChevronLeft, ChevronRight, X, Check,
} from "lucide-react";

const PAGE_SIZE = 24;

const SORT_OPTIONS = [
  { value: "popular", label: "Популярні" },
  { value: "-created_at", label: "Новинки" },
  { value: "price", label: "Дешевші" },
  { value: "-price", label: "Дорожчі" },
  { value: "-avg_rating", label: "Топ рейтинг" },
];

interface Category {
  id: number;
  name: string;
  slug: string;
}

interface Product {
  id: number;
  name: string;
  slug: string;
  brand: string;
  price: string;
  stock: number;
  image: string;
  category: Category;
  is_featured: boolean;
  avg_rating: number | null;
  review_count: number;
}

interface PaginatedProducts {
  count: number;
  next: string | null;
  previous: string | null;
  results: Product[];
}

export function Catalog() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState({ min: 0, max: 99999 });
  const [loading, setLoading] = useState(true);
  const [wishlistIds, setWishlistIds] = useState<Set<number>>(new Set());
  const [wishlistPending, setWishlistPending] = useState<Set<number>>(new Set());
  const [addedToCart, setAddedToCart] = useState<Set<number>>(new Set());
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const addItem = useCartStore((s) => s.addItem);
  const token = useAuthStore((s) => s.accessToken);
  const showToast = useToastStore((s) => s.show);

  const ordering = searchParams.get("ordering") || "popular";
  const selectedCategory = searchParams.get("category") || "";
  const selectedBrand = searchParams.get("brand") || "";
  const searchQuery = searchParams.get("q") || "";
  const inStock = searchParams.get("in_stock") === "true";
  const priceMin = searchParams.get("price_min") || "";
  const priceMax = searchParams.get("price_max") || "";
  const page = parseInt(searchParams.get("page") || "1", 10);

  const [localSearch, setLocalSearch] = useState(searchQuery);
  const [localPriceMin, setLocalPriceMin] = useState(priceMin);
  const [localPriceMax, setLocalPriceMax] = useState(priceMax);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function setParam(key: string, value: string) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value) next.set(key, value);
      else next.delete(key);
      next.delete("page");
      return next;
    });
  }

  function setPage(p: number) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (p > 1) next.set("page", String(p));
      else next.delete("page");
      return next;
    });
  }

  useEffect(() => {
    setLocalSearch(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    setLocalPriceMin(priceMin);
    setLocalPriceMax(priceMax);
  }, [priceMin, priceMax]);

  useEffect(() => {
    Promise.all([
      apiFetch<Category[]>("/products/categories/"),
      apiFetch<string[]>("/products/brands/"),
      apiFetch<{ min: number; max: number }>("/products/price-range/"),
    ]).then(([cats, br, range]) => {
      setCategories(cats);
      setBrands(br);
      setPriceRange(range);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!token) return;
    apiFetch<number[]>("/wishlist/check/").then((ids) => {
      setWishlistIds(new Set(ids));
    }).catch(() => {});
  }, [token]);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ ordering });
    params.set("limit", String(PAGE_SIZE));
    params.set("offset", String((page - 1) * PAGE_SIZE));
    if (selectedCategory) params.set("category", selectedCategory);
    if (selectedBrand) params.set("brand", selectedBrand);
    if (searchQuery) params.set("q", searchQuery);
    if (inStock) params.set("in_stock", "true");
    if (priceMin) params.set("price_min", priceMin);
    if (priceMax) params.set("price_max", priceMax);

    apiFetch<PaginatedProducts>(`/products/?${params.toString()}`)
      .then((data) => {
        setProducts(data.results);
        setTotalCount(data.count);
      })
      .catch((err) => {
        console.error("Catalog fetch failed:", err);
        setProducts([]);
        setTotalCount(0);
      })
      .finally(() => setLoading(false));
  }, [ordering, selectedCategory, selectedBrand, searchQuery, inStock, priceMin, priceMax, page]);

  function handleSearchChange(v: string) {
    setLocalSearch(v);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => setParam("q", v), 400);
  }

  function handlePriceApply() {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (localPriceMin) next.set("price_min", localPriceMin);
      else next.delete("price_min");
      if (localPriceMax) next.set("price_max", localPriceMax);
      else next.delete("price_max");
      next.delete("page");
      return next;
    });
  }

  function clearFilters() {
    setSearchParams({});
    setLocalSearch("");
    setLocalPriceMin("");
    setLocalPriceMax("");
  }

  async function toggleWishlist(product: Product) {
    if (!token) return;
    setWishlistPending((s) => new Set(s).add(product.id));
    const isIn = wishlistIds.has(product.id);
    try {
      if (isIn) {
        await apiFetch("/wishlist/", { method: "DELETE", body: { product_id: product.id } });
        setWishlistIds((s) => { const n = new Set(s); n.delete(product.id); return n; });
      } else {
        await apiFetch("/wishlist/", { method: "POST", body: { product_id: product.id } });
        setWishlistIds((s) => new Set(s).add(product.id));
      }
      if (!isIn) showToast(`${product.name.slice(0, 28)}... додано до вішліста`, "info");
    } catch {}
    setWishlistPending((s) => { const n = new Set(s); n.delete(product.id); return n; });
  }

  function handleAddToCart(product: Product) {
    addItem({ productId: product.id, name: product.name, price: Number(product.price), image: product.image || "" });
    setAddedToCart((s) => new Set(s).add(product.id));
    showToast(`${product.name.slice(0, 28)}... додано в кошик`);
    setTimeout(() => setAddedToCart((s) => { const n = new Set(s); n.delete(product.id); return n; }), 1500);
  }

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const hasActiveFilters = selectedCategory || selectedBrand || inStock || priceMin || priceMax || searchQuery;

  const Sidebar = (
    <div className="space-y-6">
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-500">Категорія</p>
        <div className="space-y-1">
          <button
            onClick={() => setParam("category", "")}
            className={`w-full rounded px-3 py-1.5 text-left text-sm transition-colors ${!selectedCategory ? "bg-white/10 text-white" : "text-neutral-400 hover:text-white"}`}
          >
            Всі категорії
          </button>
          {categories.map((cat) => (
            <button
              key={cat.slug}
              onClick={() => setParam("category", cat.slug)}
              className={`w-full rounded px-3 py-1.5 text-left text-sm transition-colors ${selectedCategory === cat.slug ? "bg-white/10 text-white" : "text-neutral-400 hover:text-white"}`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {brands.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-500">Бренд</p>
          <div className="max-h-52 space-y-0.5 overflow-y-auto pr-1">
            {brands.map((b) => {
              const active = selectedBrand === b;
              return (
                <label
                  key={b}
                  onClick={() => setParam("brand", active ? "" : b)}
                  className="flex cursor-pointer items-center gap-2.5 rounded px-2 py-1.5 text-sm transition-colors hover:bg-neutral-800"
                >
                  <div className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                    active ? "border-white bg-white" : "border-neutral-600 bg-transparent"
                  }`}>
                    {active && <Check className="h-2.5 w-2.5 text-black" />}
                  </div>
                  <span className={active ? "text-white" : "text-neutral-400"}>{b}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-500">
          Ціна (грн)
        </p>
        <div className="flex items-center gap-2">
          <input
            type="number"
            placeholder={String(Math.floor(priceRange.min))}
            value={localPriceMin}
            onChange={(e) => setLocalPriceMin(e.target.value)}
            className="w-full rounded border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-sm text-white outline-none focus:border-neutral-500"
          />
          <span className="text-neutral-600">—</span>
          <input
            type="number"
            placeholder={String(Math.ceil(priceRange.max))}
            value={localPriceMax}
            onChange={(e) => setLocalPriceMax(e.target.value)}
            className="w-full rounded border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-sm text-white outline-none focus:border-neutral-500"
          />
        </div>
        <Button
          size="sm"
          onClick={handlePriceApply}
          className="mt-2 w-full bg-white text-black text-xs hover:bg-neutral-200"
        >
          Застосувати
        </Button>
      </div>

      <div>
        <label className="flex cursor-pointer items-center gap-2">
          <div
            onClick={() => setParam("in_stock", inStock ? "" : "true")}
            className={`flex h-5 w-9 items-center rounded-full transition-colors ${inStock ? "bg-white" : "bg-neutral-700"}`}
          >
            <div className={`h-4 w-4 rounded-full bg-neutral-900 transition-transform ${inStock ? "translate-x-4" : "translate-x-0.5"}`} />
          </div>
          <span className="text-sm text-neutral-300">Тільки в наявності</span>
        </label>
      </div>

      {hasActiveFilters && (
        <button
          onClick={clearFilters}
          className="flex w-full items-center gap-2 rounded-lg border border-neutral-700 px-3 py-2 text-sm text-neutral-400 transition-colors hover:border-neutral-500 hover:text-white"
        >
          <X className="h-3.5 w-3.5" />
          Скинути всі фільтри
        </button>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-neutral-950 pt-20">
      <GlobalLines />
      <Header />
      <div className="relative z-10 mx-auto max-w-screen-2xl px-4 md:px-8">

        <div className="mb-6 mt-6">
          <h1 className="text-3xl font-bold text-white">Каталог товарів</h1>
          <p className="mt-1 text-sm text-neutral-400">
            {loading ? "Завантаження..." : `${totalCount} товарів`}
          </p>
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              placeholder="Пошук товарів..."
              value={localSearch}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full rounded-lg border border-neutral-700 bg-neutral-900 py-2.5 pl-10 pr-4 text-sm text-white placeholder-neutral-500 outline-none focus:border-neutral-500"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {SORT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setParam("ordering", opt.value)}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  ordering === opt.value
                    ? "bg-white text-black"
                    : "border border-neutral-700 text-neutral-400 hover:border-neutral-500 hover:text-white"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => setSidebarOpen((v) => !v)}
            className="flex items-center gap-1.5 rounded-lg border border-neutral-700 px-3 py-2 text-sm text-neutral-400 hover:text-white lg:hidden"
          >
            <SlidersHorizontal className="h-4 w-4" />
            Фільтри
          </button>
        </div>

        <div className="flex gap-6">
          <aside className="hidden w-56 shrink-0 lg:block">
            <div className="sticky top-24 rounded-xl border border-neutral-800 bg-neutral-900/60 p-4">
              {Sidebar}
            </div>
          </aside>

          {sidebarOpen && (
            <div className="fixed inset-0 z-50 flex lg:hidden">
              <div className="absolute inset-0 bg-black/60" onClick={() => setSidebarOpen(false)} />
              <div className="relative ml-auto h-full w-72 overflow-y-auto bg-neutral-900 p-6">
                <button onClick={() => setSidebarOpen(false)} className="mb-4 text-neutral-400 hover:text-white">
                  <X className="h-5 w-5" />
                </button>
                {Sidebar}
              </div>
            </div>
          )}

          <main className="flex-1 min-w-0">
            {loading ? (
              <div className="flex justify-center py-20">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-700 border-t-white" />
              </div>
            ) : products.length === 0 ? (
              <div className="py-20 text-center text-neutral-400">
                <p className="text-lg">Товарів не знайдено</p>
                {hasActiveFilters && (
                  <button onClick={clearFilters} className="mt-3 text-sm text-white underline">
                    Скинути фільтри
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {products.map((product) => (
                    <Card
                      key={product.id}
                      className="group relative flex flex-col overflow-hidden border-neutral-800 bg-neutral-900 transition-shadow hover:shadow-lg"
                      style={{ contentVisibility: "auto", containIntrinsicSize: "0 400px" }}
                    >
                      <Link to={`/product/${product.slug}`} className="relative aspect-square overflow-hidden bg-neutral-800">
                        {product.image ? (
                          <img
                            src={product.image}
                            alt={product.name}
                            className="h-full w-full object-cover"
                            loading="lazy"
                            decoding="async"
                          />
                        ) : (
                          <div className="h-full w-full bg-neutral-800" />
                        )}
                        {product.is_featured && (
                          <span className="absolute left-2 top-2 rounded bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-neutral-900">
                            Хіт
                          </span>
                        )}
                        {product.stock === 0 && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                            <span className="rounded bg-white px-3 py-1 text-xs font-semibold text-neutral-900">
                              Немає в наявності
                            </span>
                          </div>
                        )}
                      </Link>

                      {token && (
                        <button
                          onClick={() => toggleWishlist(product)}
                          disabled={wishlistPending.has(product.id)}
                          className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-neutral-900/80 transition-colors hover:bg-neutral-800"
                        >
                          <Heart
                            className={`h-4 w-4 transition-colors ${
                              wishlistIds.has(product.id) ? "fill-red-500 text-red-500" : "text-neutral-400"
                            }`}
                          />
                        </button>
                      )}

                      <div className="flex flex-1 flex-col p-4">
                        <p className="text-xs text-neutral-500">{product.brand}</p>
                        <Link to={`/product/${product.slug}`}>
                          <h3 className="mt-1 line-clamp-2 text-sm font-medium text-white hover:underline">
                            {product.name}
                          </h3>
                        </Link>
                        <p className="mt-0.5 text-xs text-neutral-500">{product.category.name}</p>
                        {product.avg_rating != null && (
                          <div className="mt-1 flex items-center gap-1">
                            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                            <span className="text-xs text-neutral-400">
                              {product.avg_rating.toFixed(1)} ({product.review_count})
                            </span>
                          </div>
                        )}
                        <div className="mt-1.5">
                          {product.stock === 0 ? (
                            <span className="text-xs font-medium text-red-400">Немає в наявності</span>
                          ) : product.stock <= 10 ? (
                            <span className="text-xs font-medium text-amber-400">Залишок: {product.stock} шт.</span>
                          ) : (
                            <span className="text-xs font-medium text-green-500">В наявності: {product.stock} шт.</span>
                          )}
                        </div>
                        <div className="mt-auto flex items-end justify-between pt-3">
                          <span className="text-lg font-bold text-white">
                            {Number(product.price).toLocaleString("uk-UA")}
                            <span className="ml-1 text-sm font-normal text-neutral-400">грн</span>
                          </span>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={product.stock === 0}
                            onClick={() => handleAddToCart(product)}
                            className={`gap-1.5 border-neutral-700 text-sm transition-colors ${
                              addedToCart.has(product.id)
                                ? "border-green-600 bg-green-600/10 text-green-400"
                                : "text-neutral-300 hover:bg-neutral-800"
                            }`}
                          >
                            {addedToCart.has(product.id) ? (
                              <Check className="h-3.5 w-3.5" />
                            ) : (
                              <ShoppingCart className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>

                {totalPages > 1 && (
                  <div className="mt-10 flex items-center justify-center gap-2">
                    <button
                      disabled={page <= 1}
                      onClick={() => setPage(page - 1)}
                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-700 text-neutral-400 disabled:opacity-30 hover:border-neutral-500 hover:text-white"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                      let p: number;
                      if (totalPages <= 7) p = i + 1;
                      else if (page <= 4) p = i + 1;
                      else if (page >= totalPages - 3) p = totalPages - 6 + i;
                      else p = page - 3 + i;
                      return (
                        <button
                          key={p}
                          onClick={() => setPage(p)}
                          className={`flex h-9 w-9 items-center justify-center rounded-lg text-sm font-medium transition-colors ${
                            p === page
                              ? "bg-white text-black"
                              : "border border-neutral-700 text-neutral-400 hover:border-neutral-500 hover:text-white"
                          }`}
                        >
                          {p}
                        </button>
                      );
                    })}
                    <button
                      disabled={page >= totalPages}
                      onClick={() => setPage(page + 1)}
                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-700 text-neutral-400 disabled:opacity-30 hover:border-neutral-500 hover:text-white"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </>
            )}
          </main>
        </div>

      </div>
      <Footer />
      <Toaster />
    </div>
  );
}
