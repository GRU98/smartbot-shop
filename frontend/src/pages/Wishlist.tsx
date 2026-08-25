import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Heart, ShoppingCart, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Header } from "@/components/Header";
import { GlobalLines } from "@/components/ui/background-paths";
import { Footer } from "@/components/Footer";
import { apiFetch } from "@/lib/api";
import { useCartStore } from "@/store/useCartStore";
import { useAuthStore } from "@/store/useAuthStore";

interface WishlistProduct {
  id: number;
  name: string;
  slug: string;
  brand: string;
  price: string;
  stock: number;
  image: string;
  avg_rating: number | null;
}

interface WishlistItem {
  id: number;
  product: WishlistProduct;
  created_at: string;
}

export function Wishlist() {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const addItem = useCartStore((s) => s.addItem);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    if (!isAuthenticated) { setLoading(false); return; }
    apiFetch<WishlistItem[]>("/wishlist/")
      .then(setItems)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isAuthenticated]);

  async function removeFromWishlist(productId: number) {
    try {
      await apiFetch("/wishlist/", { method: "DELETE", body: { product_id: productId } });
      setItems((prev) => prev.filter((i) => i.product.id !== productId));
    } catch {}
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-neutral-950">
        <GlobalLines />
        <Header />
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <Heart className="mx-auto mb-4 h-12 w-12 text-neutral-600" />
            <p className="text-neutral-400">Увійдіть, щоб переглянути список бажань</p>
            <Link to="/login" className="mt-4 inline-block">
              <Button className="bg-white text-black hover:bg-neutral-200">Увійти</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 pt-20">
      <GlobalLines />
      <Header />
      <div className="relative z-10 mx-auto max-w-screen-2xl px-4 md:px-8">
        <div className="mb-8 mt-6">
          <h1 className="flex items-center gap-3 text-3xl font-bold text-white">
            <Heart className="h-7 w-7 text-red-400" />
            Список бажань
          </h1>
          {!loading && (
            <p className="mt-1 text-sm text-neutral-400">{items.length} товарів</p>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-700 border-t-white" />
          </div>
        ) : items.length === 0 ? (
          <div className="py-20 text-center">
            <Heart className="mx-auto mb-4 h-12 w-12 text-neutral-700" />
            <p className="text-neutral-400">Список бажань порожній</p>
            <Link to="/catalog" className="mt-4 inline-block">
              <Button variant="outline" className="border-neutral-700 text-neutral-300 hover:bg-neutral-800">
                До каталогу
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {items.map(({ id: wishId, product }) => (
              <Card
                key={wishId}
                className="group relative flex flex-col overflow-hidden border-neutral-800 bg-neutral-900"
              >
                <Link to={`/product/${product.slug}`} className="relative aspect-square overflow-hidden bg-neutral-800">
                  {product.image ? (
                    <img
                      src={product.image}
                      alt={product.name}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="h-12 w-12 text-neutral-600">
                        <path d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
                      </svg>
                    </div>
                  )}
                  {product.stock === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                      <span className="rounded bg-white px-3 py-1 text-xs font-semibold text-neutral-900">Немає в наявності</span>
                    </div>
                  )}
                </Link>

                <button
                  onClick={() => removeFromWishlist(product.id)}
                  className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-neutral-900/80 text-red-400 hover:bg-neutral-800"
                >
                  <Trash2 className="h-4 w-4" />
                </button>

                <div className="flex flex-1 flex-col p-4">
                  <p className="text-xs text-neutral-500">{product.brand}</p>
                  <Link to={`/product/${product.slug}`}>
                    <h3 className="mt-1 line-clamp-2 text-sm font-medium text-white hover:underline">
                      {product.name}
                    </h3>
                  </Link>
                  <div className="mt-auto flex items-end justify-between pt-3">
                    <span className="text-lg font-bold text-white">
                      {Number(product.price).toLocaleString("uk-UA")}
                      <span className="ml-1 text-sm font-normal text-neutral-400">грн</span>
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={product.stock === 0}
                      onClick={() => addItem({
                        productId: product.id,
                        name: product.name,
                        price: Number(product.price),
                        image: product.image || "",
                      })}
                      className="gap-1.5 border-neutral-700 text-neutral-300 hover:bg-neutral-800"
                    >
                      <ShoppingCart className="h-3.5 w-3.5" />
                      В кошик
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
