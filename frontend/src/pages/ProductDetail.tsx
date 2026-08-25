import { useEffect, useState, type FormEvent } from "react";
import { useParams, Link } from "react-router-dom";
import { ShoppingCart, Star, Loader2, ChevronLeft, ChevronRight, Heart, Bell, CheckCircle2, BarChart2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/Header";
import { GlobalLines } from "@/components/ui/background-paths";
import { Footer } from "@/components/Footer";
import { useCartStore } from "@/store/useCartStore";
import { useAuthStore } from "@/store/useAuthStore";
import { useCompareStore } from "@/store/useCompareStore";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { apiFetch } from "@/lib/api";

interface Category {
  id: number;
  name: string;
  slug: string;
}

interface ProductImage {
  id: number;
  url: string;
  alt: string;
  position: number;
}

interface Product {
  id: number;
  name: string;
  slug: string;
  brand: string;
  description: string;
  specs: Record<string, string>;
  price: string;
  stock: number;
  image: string;
  category: Category;
  images: ProductImage[];
  is_featured: boolean;
  avg_rating: number | null;
  review_count: number;
  total_sold: number;
}

interface Review {
  id: number;
  rating: number;
  text: string;
  user_name: string;
  user_email: string;
  created_at: string;
}

function Stars({ rating, size = 16 }: { rating: number; size?: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={i <= rating ? "fill-yellow-400 text-yellow-400" : "text-neutral-600"}
          style={{ width: size, height: size }}
        />
      ))}
    </div>
  );
}

function ClickableStars({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          onClick={() => onChange(i)}
          onMouseEnter={() => setHover(i)}
          onMouseLeave={() => setHover(0)}
          className="p-0.5"
        >
          <Star
            className={i <= (hover || value) ? "fill-yellow-400 text-yellow-400" : "text-neutral-600"}
            style={{ width: 24, height: 24 }}
          />
        </button>
      ))}
    </div>
  );
}

export function ProductDetail() {
  const { slug } = useParams<{ slug: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [reviewSuccess, setReviewSuccess] = useState(false);
  const [recommendations, setRecommendations] = useState<Product[]>([]);
  const [inWishlist, setInWishlist] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const [alertSent, setAlertSent] = useState(false);
  const [alertLoading, setAlertLoading] = useState(false);
  const [compareError, setCompareError] = useState<string | null>(null);
  const addItem = useCartStore((s) => s.addItem);
  const { isAuthenticated, accessToken } = useAuthStore();
  const { addItem: addToCompare, removeItem: removeFromCompare, hasItem: inCompare } = useCompareStore();

  useEffect(() => {
    async function load() {
      if (!slug) return;
      setLoading(true);
      setProduct(null);
      setReviews([]);
      setRecommendations([]);

      try {
        const prod = await apiFetch<Product>(`/products/${slug}/`);
        setProduct(prod);

        apiFetch<Review[]>(`/products/${slug}/reviews/`)
          .then(setReviews)
          .catch(() => {});

        apiFetch<Product[]>(`/products/${slug}/recommendations/`)
          .then(setRecommendations)
          .catch(() => {});

        if (isAuthenticated) {
          apiFetch<number[]>("/wishlist/check/")
            .then((ids) => setInWishlist(ids.includes(prod.id)))
            .catch(() => {});
        }
      } catch (e) {
        console.error("Failed to load product:", e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [slug, isAuthenticated]);

  async function toggleWishlist() {
    if (!isAuthenticated || !product) return;
    setWishlistLoading(true);
    try {
      if (inWishlist) {
        await apiFetch("/wishlist/", { method: "DELETE", body: { product_id: product.id } });
        setInWishlist(false);
      } else {
        await apiFetch("/wishlist/", { method: "POST", body: { product_id: product.id } });
        setInWishlist(true);
      }
    } catch {}
    setWishlistLoading(false);
  }

  async function handleStockAlert() {
    if (!isAuthenticated || !product) return;
    setAlertLoading(true);
    try {
      await apiFetch("/stock-alerts/", { method: "POST", body: { product_id: product.id } });
      setAlertSent(true);
    } catch {}
    setAlertLoading(false);
  }

  async function handleReviewSubmit(e: FormEvent) {
    e.preventDefault();
    if (!product || !accessToken) return;
    setReviewSubmitting(true);
    setReviewError(null);

    try {
      const newReview = await apiFetch<Review>(`/products/${product.slug}/reviews/create/`, {
        method: "POST",
        body: { rating: reviewRating, text: reviewText },
        token: accessToken,
      });
      setReviews((prev) => [newReview, ...prev]);
      setReviewSuccess(true);
      setReviewText("");
      setReviewRating(5);
    } catch (err) {
      setReviewError(err instanceof Error ? err.message : "Помилка відправки відгуку.");
    } finally {
      setReviewSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950">
        <GlobalLines />
        <Header />
        <div className="flex min-h-screen items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-600 border-t-white" />
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-neutral-950">
        <GlobalLines />
        <Header />
        <div className="flex min-h-screen flex-col items-center justify-center gap-4">
          <p className="text-lg text-neutral-400">Товар не знайдено</p>
          <Link to="/catalog"><Button variant="outline" className="border-neutral-700 text-neutral-300">До каталогу</Button></Link>
        </div>
      </div>
    );
  }

  const allImages = product.image
    ? [{ id: 0, url: product.image, alt: product.name, position: 0 }, ...product.images]
    : product.images;

  return (
    <div className="min-h-screen bg-neutral-950 pt-20">
      <GlobalLines />
      <Header />
      <div className="relative z-10 mx-auto max-w-screen-2xl px-4 md:px-8">
        <Breadcrumbs items={[
          { label: "Каталог", href: "/catalog" },
          { label: product.category.name, href: `/catalog?category=${product.category.slug}` },
          { label: product.name },
        ]} />

        <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
          {/* Images */}
          <div>
            <div className="relative aspect-square overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900">
              {allImages.length > 0 ? (
                <img src={allImages[activeImage]?.url} alt={product.name} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-neutral-600">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="h-20 w-20">
                    <path d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
                  </svg>
                </div>
              )}
              {allImages.length > 1 && (
                <>
                  <button onClick={() => setActiveImage((p) => (p > 0 ? p - 1 : allImages.length - 1))} className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/60 p-2 text-white hover:bg-black/80">
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button onClick={() => setActiveImage((p) => (p < allImages.length - 1 ? p + 1 : 0))} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/60 p-2 text-white hover:bg-black/80">
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </>
              )}
            </div>
            {allImages.length > 1 && (
              <div className="mt-3 flex gap-2 overflow-x-auto">
                {allImages.map((img, i) => (
                  <button key={img.id} onClick={() => setActiveImage(i)} className={`h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 ${i === activeImage ? "border-white" : "border-neutral-700"}`}>
                    <img src={img.url} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Info */}
          <div>
            <p className="text-sm text-neutral-500">{product.brand}</p>
            <h1 className="mt-1 text-3xl font-bold text-white">{product.name}</h1>
            <p className="mt-1 text-sm text-neutral-500">{product.category.name}</p>

            <div className="mt-3 flex items-center gap-3">
              {product.avg_rating && (
                <div className="flex items-center gap-2">
                  <Stars rating={Math.round(product.avg_rating)} />
                  <span className="text-sm text-neutral-400">{product.avg_rating.toFixed(1)}</span>
                </div>
              )}
              <span className="text-sm text-neutral-500">{product.review_count} відгуків</span>
            </div>

            <div className="mt-6">
              <span className="text-4xl font-bold text-white">
                {Number(product.price).toLocaleString("uk-UA")}
              </span>
              <span className="ml-2 text-lg text-neutral-400">грн</span>
            </div>

            <p className="mt-2 text-sm text-neutral-500">
              {product.stock > 0 ? `В наявності: ${product.stock} шт.` : "Немає в наявності"}
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              {product.stock > 0 ? (
                <Button
                  size="lg"
                  className="gap-2 bg-white text-black hover:bg-neutral-200"
                  onClick={() => addItem({ productId: product.id, name: product.name, price: Number(product.price), image: product.image || "" })}
                >
                  <ShoppingCart className="h-5 w-5" />
                  Додати в кошик
                </Button>
              ) : (
                <Button
                  size="lg"
                  variant="outline"
                  className="gap-2 border-neutral-700 text-neutral-300 hover:bg-neutral-800"
                  onClick={handleStockAlert}
                  disabled={alertLoading || alertSent}
                >
                  {alertSent ? (
                    <><CheckCircle2 className="h-5 w-5 text-green-400" /> Сповіщення надіслано</>
                  ) : (
                    <><Bell className="h-5 w-5" /> Повідомити про наявність</>
                  )}
                </Button>
              )}
              {isAuthenticated && (
                <Button
                  size="lg"
                  variant="outline"
                  className={`gap-2 border-neutral-700 hover:bg-neutral-800 ${
                    inWishlist ? "text-red-400 hover:text-red-300" : "text-neutral-300"
                  }`}
                  onClick={toggleWishlist}
                  disabled={wishlistLoading}
                >
                  <Heart className={`h-5 w-5 ${inWishlist ? "fill-red-400" : ""}`} />
                  {inWishlist ? "У бажаннях" : "До бажань"}
                </Button>
              )}
              <Button
                size="lg"
                variant="outline"
                className={`gap-2 border-neutral-700 hover:bg-neutral-800 ${
                  inCompare(product.id) ? "text-blue-400" : "text-neutral-300"
                }`}
                onClick={() => {
                  setCompareError(null);
                  if (inCompare(product.id)) {
                    removeFromCompare(product.id);
                  } else {
                    const result = addToCompare({
                      id: product.id,
                      name: product.name,
                      slug: product.slug,
                      brand: product.brand,
                      price: product.price,
                      image: product.image || "",
                      specs: product.specs ?? {},
                      avg_rating: product.avg_rating,
                      review_count: product.review_count,
                      stock: product.stock,
                      category: product.category,
                    });
                    if (result === "category_mismatch") {
                      setCompareError(`Можна порівнювати лише товари однієї категорії`);
                    } else if (result === "limit") {
                      setCompareError("Максимально 3 товари для порівняння");
                    }
                  }
                }}
              >
                <BarChart2 className="h-5 w-5" />
                {inCompare(product.id) ? "У порівнянні" : "Порівняти"}
              </Button>
            </div>

            {compareError && (
              <p className="mt-2 text-sm text-amber-400">{compareError}</p>
            )}

            {product.description && (
              <div className="mt-8">
                <h3 className="mb-2 text-lg font-semibold text-white">Опис</h3>
                <p className="whitespace-pre-line text-sm leading-relaxed text-neutral-400">{product.description}</p>
              </div>
            )}

            {product.specs && Object.keys(product.specs).length > 0 && (
              <div className="mt-8">
                <h3 className="mb-3 text-lg font-semibold text-white">Характеристики</h3>
                <div className="divide-y divide-neutral-800 rounded-xl border border-neutral-800">
                  {Object.entries(product.specs).map(([key, val]) => (
                    <div key={key} className="flex justify-between px-4 py-3">
                      <span className="text-sm text-neutral-400">{key}</span>
                      <span className="text-sm text-white">{val}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <div className="mt-16 border-t border-neutral-800 pt-10">
            <h2 className="mb-6 text-xl font-bold text-white">Схожі товари</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {recommendations.map((rec) => (
                <Link
                  key={rec.id}
                  to={`/product/${rec.slug}`}
                  className="group rounded-xl border border-neutral-800 bg-neutral-900 p-3 hover:border-neutral-600 transition-colors"
                >
                  <div className="aspect-square overflow-hidden rounded-lg bg-neutral-800 mb-3">
                    {rec.image ? (
                      <img src={rec.image} alt={rec.name} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                    ) : (
                      <div className="h-full w-full" />
                    )}
                  </div>
                  <p className="text-xs text-neutral-500">{rec.brand}</p>
                  <p className="mt-0.5 line-clamp-2 text-sm font-medium text-white">{rec.name}</p>
                  <p className="mt-2 font-bold text-white">{Number(rec.price).toLocaleString("uk-UA")} <span className="text-xs font-normal text-neutral-400">грн</span></p>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Reviews */}
        <div className="mt-16 border-t border-neutral-800 pt-10">
          <h2 className="mb-6 text-2xl font-bold text-white">
            Відгуки ({reviews.length})
          </h2>

          {isAuthenticated && !reviewSuccess && (
            <div className="mb-8 rounded-xl border border-neutral-800 bg-neutral-900 p-6">
              <h3 className="mb-4 text-lg font-semibold text-white">Залишити відгук</h3>
              <form onSubmit={handleReviewSubmit} className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm text-neutral-400">Оцінка</label>
                  <ClickableStars value={reviewRating} onChange={setReviewRating} />
                </div>
                <div>
                  <label className="mb-2 block text-sm text-neutral-400">Коментар</label>
                  <textarea
                    value={reviewText}
                    onChange={(e) => setReviewText(e.target.value)}
                    rows={4}
                    className="w-full resize-none rounded-lg border border-neutral-700 bg-neutral-800 p-3 text-sm text-white placeholder-neutral-500 outline-none focus:border-neutral-500"
                    placeholder="Напишіть ваш відгук..."
                  />
                </div>
                {reviewError && <p className="text-sm text-red-400">{reviewError}</p>}
                <Button type="submit" className="bg-white text-black hover:bg-neutral-200" disabled={reviewSubmitting}>
                  {reviewSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Відправити відгук
                </Button>
              </form>
            </div>
          )}

          {reviewSuccess && (
            <div className="mb-8 rounded-xl border border-green-800/50 bg-green-900/20 p-4 text-sm text-green-400">
              Ваш відгук успішно додано!
            </div>
          )}

          {!isAuthenticated && (
            <div className="mb-8 rounded-xl border border-neutral-800 bg-neutral-900 p-6 text-center">
              <p className="text-sm text-neutral-400">
                <Link to="/login" className="text-white underline">Увійдіть</Link>, щоб залишити відгук (доступно тільки після покупки товару).
              </p>
            </div>
          )}

          {reviews.length === 0 ? (
            <p className="py-8 text-center text-neutral-500">Поки немає відгуків</p>
          ) : (
            <div className="space-y-4">
              {reviews.map((review) => (
                <div key={review.id} className="rounded-xl border border-neutral-800 bg-neutral-900 p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-800 text-sm font-semibold text-white">
                        {(review.user_name || review.user_email || "?").charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{review.user_name || review.user_email}</p>
                        <p className="text-xs text-neutral-500">
                          {new Date(review.created_at).toLocaleDateString("uk-UA")}
                        </p>
                      </div>
                    </div>
                    <Stars rating={review.rating} />
                  </div>
                  {review.text && (
                    <p className="mt-3 text-sm leading-relaxed text-neutral-300">{review.text}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
      <Footer />
    </div>
  );
}
