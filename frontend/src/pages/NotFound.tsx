import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Bot, ArrowLeft, Search } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export function NotFound() {
  return (
    <div className="min-h-screen bg-neutral-950">
      <Helmet>
        <title>404 — Сторінку не знайдено | SmartBot Shop</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <Header />
      <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
        <Bot className="mb-6 h-16 w-16 text-neutral-700" />
        <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-neutral-600">
          Помилка 404
        </p>
        <h1 className="mb-4 text-4xl font-bold text-white sm:text-5xl">
          Сторінку не знайдено
        </h1>
        <p className="mb-10 max-w-md text-neutral-500">
          Схоже, ця сторінка переїхала або ніколи не існувала. Спробуй знайти потрібний товар у каталозі.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/"
            className="flex items-center gap-2 rounded-xl border border-neutral-700 px-5 py-2.5 text-sm font-medium text-neutral-300 transition-colors hover:border-neutral-500 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            На головну
          </Link>
          <Link
            to="/catalog"
            className="flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-medium text-black transition-colors hover:bg-neutral-200"
          >
            <Search className="h-4 w-4" />
            Перейти до каталогу
          </Link>
        </div>
      </div>
      <Footer />
    </div>
  );
}
