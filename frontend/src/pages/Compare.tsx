import { Link } from "react-router-dom";
import { X, ShoppingCart, Star, BarChart2, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/Header";
import { GlobalLines } from "@/components/ui/background-paths";
import { Footer } from "@/components/Footer";
import { useCompareStore } from "@/store/useCompareStore";
import { useCartStore } from "@/store/useCartStore";

const HIGHER_IS_BETTER = new Set([
  "ram", "пам'ять", "оперативна пам'ять", "storage", "накопичувач", "ssd", "rom",
  "battery", "батарея", "акумулятор", "screen", "екран", "дисплей", "display",
  "cores", "ядра", "частота", "frequency", "resolution", "роздільна здатність",
  "refresh rate", "частота оновлення", "nits", "яскравість",
]);

const LOWER_IS_BETTER = new Set([
  "вага", "weight", "товщина", "thickness", "час заряджання", "charge time",
]);

function parseNumeric(val: string): number | null {
  const m = String(val).match(/[\d.,]+/);
  if (!m) return null;
  return parseFloat(m[0].replace(",", "."));
}

function getHighlightClass(key: string, vals: string[], idx: number): string {
  const numVals = vals.map(parseNumeric);
  const hasNumbers = numVals.every((v) => v !== null);
  if (!hasNumbers || vals.every((v) => v === vals[0])) return "";

  const keyLower = key.toLowerCase();
  const higherBetter = [...HIGHER_IS_BETTER].some((k) => keyLower.includes(k));
  const lowerBetter = [...LOWER_IS_BETTER].some((k) => keyLower.includes(k));

  if (!higherBetter && !lowerBetter) return "";

  const nums = numVals as number[];
  const best = higherBetter ? Math.max(...nums) : Math.min(...nums);
  const worst = higherBetter ? Math.min(...nums) : Math.max(...nums);
  const cur = nums[idx];

  if (cur === best) return "best";
  if (cur === worst && nums.filter((n) => n === worst).length < nums.length) return "worst";
  return "";
}

export function Compare() {
  const { items, removeItem, clear } = useCompareStore();
  const addItem = useCartStore((s) => s.addItem);

  const allSpecKeys = Array.from(
    new Set(items.flatMap((p) => Object.keys(p.specs ?? {})))
  );

  const prices = items.map((p) => Number(p.price));
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);

  const ratings = items.map((p) => p.avg_rating ?? 0);
  const maxRating = Math.max(...ratings);

  return (
    <div className="min-h-screen bg-neutral-950">
      <GlobalLines />
      <Header />
      <div className="relative z-10 mx-auto max-w-screen-2xl px-4 pb-20 pt-24 md:px-8">

        <div className="mb-8 flex items-center justify-between">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-3">
              <BarChart2 className="h-6 w-6 text-white" />
              <h1 className="text-2xl font-bold text-white">Порівняння товарів</h1>
              <span className="rounded-full bg-neutral-800 px-2.5 py-0.5 text-sm text-neutral-400">
                {items.length} / 3
              </span>
            </div>
            {items.length > 0 ? (
              <p className="ml-9 text-sm text-neutral-500">
                Категорія:{" "}
                <span className="font-medium text-neutral-300">{items[0]?.category.name}</span>
                {" — "}
                <span className="text-neutral-600">додавайте лише товари цієї категорії</span>
              </p>
            ) : (
              <p className="ml-9 text-xs text-neutral-600">Порівнювати можна лише товари однієї категорії</p>
            )}
          </div>
          {items.length > 0 && (
            <Button variant="ghost" size="sm" onClick={clear} className="text-neutral-500 hover:text-white">
              Очистити все
            </Button>
          )}
        </div>

        {/* Legend */}
        {items.length > 1 && (
          <div className="mb-6 flex flex-wrap gap-4 text-xs text-neutral-400">
            <span className="flex items-center gap-1.5"><span className="inline-block h-3 w-3 rounded-sm bg-green-500/20 ring-1 ring-green-500/50" /> Краще значення</span>
            <span className="flex items-center gap-1.5"><span className="inline-block h-3 w-3 rounded-sm bg-red-500/20 ring-1 ring-red-500/50" /> Гірше значення</span>
            <span className="flex items-center gap-1.5"><span className="inline-block h-3 w-3 rounded-sm bg-neutral-700" /> Однакове</span>
          </div>
        )}

        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <BarChart2 className="mb-4 h-16 w-16 text-neutral-700" />
            <p className="text-lg text-neutral-400">Немає товарів для порівняння</p>
            <p className="mt-1 text-sm text-neutral-600">Додайте до 3 товарів з каталогу або сторінки товару</p>
            <Link to="/catalog" className="mt-6">
              <Button className="bg-white text-black hover:bg-neutral-200">Перейти до каталогу</Button>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-neutral-800">
            <table className="w-full" style={{ minWidth: `${180 + items.length * 240}px` }}>

              {/* Product cards header */}
              <thead>
                <tr className="border-b border-neutral-800 bg-neutral-900/60">
                  <td className="w-44 p-5 text-xs font-semibold uppercase tracking-wider text-neutral-500">Товар</td>
                  {items.map((p) => (
                    <td key={p.id} className="p-5 align-top">
                      <div className="relative">
                        <button
                          onClick={() => removeItem(p.id)}
                          className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-neutral-800 text-neutral-400 hover:bg-red-500/20 hover:text-red-400 transition-colors"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                        <Link to={`/product/${p.slug}`}>
                          <div className="aspect-square w-full overflow-hidden rounded-xl border border-neutral-700 bg-neutral-900">
                            {p.image
                              ? <img src={p.image} alt={p.name} loading="lazy" className="h-full w-full object-cover" />
                              : <div className="h-full w-full bg-neutral-800" />
                            }
                          </div>
                          <p className="mt-2.5 text-xs text-neutral-500">{p.brand}</p>
                          <p className="mt-0.5 line-clamp-2 text-sm font-semibold text-white hover:underline leading-snug">
                            {p.name}
                          </p>
                        </Link>

                        <div className={`mt-3 rounded-lg px-3 py-2 ${
                          items.length > 1 && Number(p.price) === minPrice
                            ? "bg-green-500/10 ring-1 ring-green-500/30"
                            : items.length > 1 && Number(p.price) === maxPrice
                            ? "bg-red-500/10 ring-1 ring-red-500/30"
                            : "bg-neutral-800/50"
                        }`}>
                          <p className="text-xs text-neutral-500 mb-0.5">Ціна</p>
                          <div className="flex items-center gap-1.5">
                            <span className="text-lg font-bold text-white">
                              {Number(p.price).toLocaleString("uk-UA")}
                            </span>
                            <span className="text-xs text-neutral-400">грн</span>
                            {items.length > 1 && Number(p.price) === minPrice && (
                              <TrendingDown className="h-4 w-4 text-green-400 ml-auto" />
                            )}
                            {items.length > 1 && Number(p.price) === maxPrice && prices.filter(pr => pr === maxPrice).length < items.length && (
                              <TrendingUp className="h-4 w-4 text-red-400 ml-auto" />
                            )}
                          </div>
                        </div>

                        {p.stock === 0 ? (
                          <p className="mt-2 text-xs text-red-400">Немає в наявності</p>
                        ) : p.stock <= 10 ? (
                          <p className="mt-2 text-xs text-amber-400">Залишок: {p.stock} шт.</p>
                        ) : (
                          <p className="mt-2 text-xs text-green-500">В наявності: {p.stock} шт.</p>
                        )}

                        <Button
                          size="sm"
                          className="mt-3 w-full gap-1.5 bg-white text-black hover:bg-neutral-200 disabled:opacity-40"
                          disabled={p.stock === 0}
                          onClick={() => addItem({ productId: p.id, name: p.name, price: Number(p.price), image: p.image })}
                        >
                          <ShoppingCart className="h-3.5 w-3.5" />
                          {p.stock > 0 ? "В кошик" : "Немає"}
                        </Button>
                      </div>
                    </td>
                  ))}
                </tr>
              </thead>

              <tbody>
                {/* Rating */}
                <tr className="border-b border-neutral-800/60">
                  <td className="p-4 text-xs font-semibold uppercase tracking-wider text-neutral-500 bg-neutral-900/40">
                    Рейтинг
                  </td>
                  {items.map((p) => (
                    <td key={p.id} className={`p-4 ${
                      items.length > 1 && (p.avg_rating ?? 0) === maxRating && maxRating > 0
                        ? "bg-green-500/5"
                        : ""
                    }`}>
                      {p.avg_rating ? (
                        <div className="flex items-center gap-1.5">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          <span className="text-sm font-semibold text-white">{p.avg_rating.toFixed(1)}</span>
                          <span className="text-xs text-neutral-500">({p.review_count ?? 0})</span>
                          {items.length > 1 && (p.avg_rating ?? 0) === maxRating && (
                            <span className="ml-auto text-[10px] font-semibold text-green-400 uppercase tracking-wide">Топ</span>
                          )}
                        </div>
                      ) : (
                        <span className="flex items-center gap-1 text-sm text-neutral-600">
                          <Minus className="h-3.5 w-3.5" /> Немає відгуків
                        </span>
                      )}
                    </td>
                  ))}
                </tr>

                {/* Specs */}
                {allSpecKeys.length > 0 ? (
                  allSpecKeys.map((key, idx) => {
                    const vals = items.map((p) => {
                      const v = p.specs?.[key];
                      return v !== undefined && v !== null && v !== "" ? String(v) : "—";
                    });
                    const allSame = vals.every((v) => v === vals[0]);
                    const highlights = vals.map((_, i) => getHighlightClass(key, vals, i));

                    return (
                      <tr
                        key={key}
                        className={`border-b border-neutral-800/40 ${idx % 2 === 0 ? "" : "bg-neutral-900/20"}`}
                      >
                        <td className="p-4 text-sm font-medium text-neutral-400 bg-neutral-900/40 align-top">
                          {key}
                        </td>
                        {items.map((p, i) => (
                          <td
                            key={p.id}
                            className={`p-4 align-top transition-colors ${
                              highlights[i] === "best"
                                ? "bg-green-500/10"
                                : highlights[i] === "worst"
                                ? "bg-red-500/10"
                                : ""
                            }`}
                          >
                            <div className="flex items-start gap-2">
                              {highlights[i] === "best" && <TrendingUp className="mt-0.5 h-3.5 w-3.5 shrink-0 text-green-400" />}
                              {highlights[i] === "worst" && <TrendingDown className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-400" />}
                              <span className={`text-sm ${
                                vals[i] === "—"
                                  ? "text-neutral-600"
                                  : highlights[i] === "best"
                                  ? "font-semibold text-green-300"
                                  : highlights[i] === "worst"
                                  ? "text-red-300"
                                  : allSame
                                  ? "text-neutral-400"
                                  : "text-white"
                              }`}>
                                {vals[i]}
                              </span>
                            </div>
                          </td>
                        ))}
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={items.length + 1} className="p-8 text-center">
                      <p className="text-sm text-neutral-500">Характеристики не заповнені</p>
                      <p className="mt-1 text-xs text-neutral-600">
                        Заповніть поле «Специфікації» при додаванні товару в адмінці
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
