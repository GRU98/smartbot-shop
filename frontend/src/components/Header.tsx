import { useEffect, useRef, useState } from "react";
import { LogIn, LogOut, ShoppingCart, Bot, Package, UserCircle, Heart, Search, X, BarChart2, Trash2, ArrowRight } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/useAuthStore";
import { useCartStore } from "@/store/useCartStore";
import { useCompareStore } from "@/store/useCompareStore";
import { apiFetch } from "@/lib/api";

interface SearchProduct { id: number; name: string; slug: string; image: string; price: string; brand: string; }
interface SearchCategory { id: number; name: string; slug: string; }
interface SearchResult { products: SearchProduct[]; categories: SearchCategory[]; }

export function Header() {
  const { isAuthenticated, user, logout } = useAuthStore();
  const { items: cartItems, removeItem: removeCartItem, totalPrice } = useCartStore();
  const totalItems = cartItems.reduce((a, i) => a + i.quantity, 0);
  const compareCount = useCompareStore((s) => s.items.length);
  const navigate = useNavigate();
  const [cartOpen, setCartOpen] = useState(false);
  const cartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (cartRef.current && !cartRef.current.contains(e.target as Node)) {
        setCartOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (query.length < 2) { setResults(null); return; }
    timerRef.current = setTimeout(() => {
      apiFetch<SearchResult>(`/search/?q=${encodeURIComponent(query)}`)
        .then(setResults)
        .catch(() => {});
    }, 300);
  }, [query]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setResults(null);
    setSearchOpen(false);
    setQuery("");
    navigate(`/catalog?q=${encodeURIComponent(query)}`);
  }

  function closeSearch() {
    setSearchOpen(false);
    setQuery("");
    setResults(null);
  }

  return (
    <header className="fixed left-0 right-0 top-0 z-50 border-b border-white/10 bg-black/60 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-screen-2xl items-center justify-between gap-3 px-4 md:px-8">
        <Link to="/" className="flex shrink-0 items-center gap-2">
          <Bot className="h-7 w-7 text-white" />
          <span className="hidden text-lg font-bold tracking-tight text-white sm:block">
            NEXUS TECH
          </span>
        </Link>

        <form onSubmit={handleSubmit} className="relative flex-1 max-w-xl">
          <div className="relative flex items-center">
            <Search className="absolute left-3 h-4 w-4 text-neutral-400" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setSearchOpen(true); }}
              onFocus={() => setSearchOpen(true)}
              placeholder="Пошук товарів..."
              className="w-full rounded-lg border border-neutral-700 bg-neutral-900 py-2 pl-9 pr-8 text-sm text-white placeholder-neutral-500 outline-none focus:border-neutral-500"
            />
            {query && (
              <button type="button" onClick={closeSearch} className="absolute right-2 text-neutral-400 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {searchOpen && results && (results.products.length > 0 || results.categories.length > 0) && (
            <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-xl border border-neutral-700 bg-neutral-900 shadow-2xl">
              {results.categories.length > 0 && (
                <div className="border-b border-neutral-800 p-2">
                  <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-neutral-500">Категорії</p>
                  {results.categories.map((cat) => (
                    <Link
                      key={cat.id}
                      to={`/catalog?category=${cat.slug}`}
                      onClick={closeSearch}
                      className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-neutral-300 hover:bg-neutral-800 hover:text-white"
                    >
                      <Package className="h-3.5 w-3.5 text-neutral-500" />
                      {cat.name}
                    </Link>
                  ))}
                </div>
              )}
              {results.products.length > 0 && (
                <div className="p-2">
                  <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-neutral-500">Товари</p>
                  {results.products.map((p) => (
                    <Link
                      key={p.id}
                      to={`/product/${p.slug}`}
                      onClick={closeSearch}
                      className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-neutral-800"
                    >
                      {p.image ? (
                        <img src={p.image} alt={p.name} className="h-9 w-9 rounded object-cover" />
                      ) : (
                        <div className="h-9 w-9 rounded bg-neutral-800" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-white">{p.name}</p>
                        <p className="text-xs text-neutral-500">{p.brand}</p>
                      </div>
                      <span className="shrink-0 text-sm font-semibold text-white">
                        {Number(p.price).toLocaleString("uk-UA")} грн
                      </span>
                    </Link>
                  ))}
                  <button
                    type="submit"
                    className="mt-1 w-full rounded-lg px-3 py-2 text-left text-sm text-neutral-400 hover:bg-neutral-800 hover:text-white"
                  >
                    Показати всі результати для «{query}»
                  </button>
                </div>
              )}
            </div>
          )}
        </form>

        <nav className="hidden items-center gap-1 md:flex">
          <Link to="/catalog">
            <Button variant="ghost" size="sm" className="text-white/70 hover:text-white hover:bg-white/10">
              <Package className="mr-1.5 h-4 w-4" />
              Каталог
            </Button>
          </Link>
          <Link to="/wishlist">
            <Button variant="ghost" size="sm" className="text-white/70 hover:text-white hover:bg-white/10">
              <Heart className="mr-1.5 h-4 w-4" />
              Бажання
            </Button>
          </Link>
          {compareCount > 0 && (
            <Link to="/compare">
              <Button variant="ghost" size="sm" className="relative text-white/70 hover:text-white hover:bg-white/10">
                <BarChart2 className="mr-1.5 h-4 w-4" />
                Порівняння
                <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-white text-[10px] font-bold text-black">
                  {compareCount}
                </span>
              </Button>
            </Link>
          )}
          <div ref={cartRef} className="relative">
            <Button
              variant="ghost"
              size="sm"
              className="relative text-white/70 hover:text-white hover:bg-white/10"
              onClick={() => setCartOpen((v) => !v)}
            >
              <ShoppingCart className="mr-1.5 h-4 w-4" />
              Кошик
              {totalItems > 0 && (
                <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-white text-[10px] font-bold text-black">
                  {totalItems}
                </span>
              )}
            </Button>

            {cartOpen && (
              <div className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-2xl border border-neutral-700 bg-neutral-900 shadow-2xl">
                <div className="flex items-center justify-between border-b border-neutral-800 px-4 py-3">
                  <p className="text-sm font-semibold text-white">Кошик ({totalItems})</p>
                  <button onClick={() => setCartOpen(false)} className="text-neutral-500 hover:text-white">
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {cartItems.length === 0 ? (
                  <div className="px-4 py-8 text-center">
                    <ShoppingCart className="mx-auto mb-2 h-8 w-8 text-neutral-700" />
                    <p className="text-sm text-neutral-500">Кошик порожній</p>
                  </div>
                ) : (
                  <>
                    <div className="max-h-72 overflow-y-auto divide-y divide-neutral-800">
                      {cartItems.map((item) => (
                        <div key={item.productId} className="flex items-center gap-3 px-4 py-3">
                          <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-neutral-800">
                            {item.image ? (
                              <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                            ) : (
                              <div className="h-full w-full" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs text-white">{item.name}</p>
                            <p className="text-xs text-neutral-500">
                              {item.quantity} × {item.price.toLocaleString("uk-UA")} грн
                            </p>
                          </div>
                          <button
                            onClick={() => removeCartItem(item.productId)}
                            className="shrink-0 text-neutral-600 hover:text-red-400"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="border-t border-neutral-800 p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <span className="text-sm text-neutral-400">Разом:</span>
                        <span className="font-bold text-white">
                          {totalPrice().toLocaleString("uk-UA")} грн
                        </span>
                      </div>
                      <Button
                        className="w-full gap-2 bg-white text-black hover:bg-neutral-200"
                        onClick={() => { setCartOpen(false); navigate("/cart"); }}
                      >
                        Оформити замовлення
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <Link to="/cart" className="relative md:hidden">
            <Button variant="ghost" size="icon" className="text-white/70 hover:text-white hover:bg-white/10">
              <ShoppingCart className="h-5 w-5" />
              {totalItems > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-white text-[10px] font-bold text-black">
                  {totalItems}
                </span>
              )}
            </Button>
          </Link>

          {isAuthenticated ? (
            <>
              <Link to="/profile">
                <Button variant="ghost" size="sm" className="gap-1.5 text-white/70 hover:text-white hover:bg-white/10">
                  <UserCircle className="h-4 w-4" />
                  <span className="hidden sm:inline">{user?.name || user?.email}</span>
                </Button>
              </Link>
              <Button variant="ghost" size="icon" className="text-white/70 hover:text-white hover:bg-white/10" onClick={() => void logout()}>
                <LogOut className="h-5 w-5" />
              </Button>
            </>
          ) : (
            <Link to="/login">
              <Button size="sm" className="bg-white text-black hover:bg-neutral-200">
                <LogIn className="mr-1 h-4 w-4" />
                Увійти
              </Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
