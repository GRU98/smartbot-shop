import { Link } from "react-router-dom";
import { Bot } from "lucide-react";

export function Footer() {
  return (
    <footer className="mt-24 border-t border-neutral-800 bg-neutral-950">
      <div className="mx-auto max-w-screen-2xl px-4 py-12 md:px-8">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">

          <div className="flex flex-col gap-4">
            <Link to="/" className="flex items-center gap-2">
              <Bot className="h-6 w-6 text-white" />
              <span className="text-lg font-bold tracking-tight text-white">NEXUS TECH</span>
            </Link>
            <p className="text-sm text-neutral-500 leading-relaxed">
              Офіційний магазин техніки нового покоління. Офіційна гарантія на всі товари.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <h3 className="text-sm font-semibold uppercase tracking-widest text-neutral-400">Магазин</h3>
            <Link to="/catalog" className="text-sm text-neutral-500 hover:text-white transition-colors">Каталог товарів</Link>
            <Link to="/cart" className="text-sm text-neutral-500 hover:text-white transition-colors">Кошик</Link>
            <Link to="/wishlist" className="text-sm text-neutral-500 hover:text-white transition-colors">Список бажань</Link>
            <Link to="/profile" className="text-sm text-neutral-500 hover:text-white transition-colors">Мій профіль</Link>
          </div>

          <div className="flex flex-col gap-3">
            <h3 className="text-sm font-semibold uppercase tracking-widest text-neutral-400">Компанія</h3>
            <Link to="/about" className="text-sm text-neutral-500 hover:text-white transition-colors">Про нас</Link>
            <Link to="/contacts" className="text-sm text-neutral-500 hover:text-white transition-colors">Контакти</Link>
            <Link to="/privacy-policy" className="text-sm text-neutral-500 hover:text-white transition-colors">Політика конфіденційності</Link>
            <Link to="/terms-of-service" className="text-sm text-neutral-500 hover:text-white transition-colors">Умови використання</Link>
          </div>

          <div className="flex flex-col gap-3">
            <h3 className="text-sm font-semibold uppercase tracking-widest text-neutral-400">Контакти</h3>
            <p className="text-sm text-neutral-500">м. Київ, вул. Хрещатик, 1</p>
            <p className="text-sm text-neutral-500">Пн–Нд: 9:00 – 21:00</p>
            <a href="mailto:info@smartbotik.duckdns.org" className="text-sm text-neutral-500 hover:text-white transition-colors">info@smartbotik.duckdns.org</a>
          </div>

        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-neutral-800 pt-8 sm:flex-row">
          <p className="text-xs text-neutral-600">
            © {new Date().getFullYear()} NEXUS TECH. Всі права захищені.
          </p>
          <div className="flex gap-6">
            <Link to="/privacy-policy" className="text-xs text-neutral-600 hover:text-neutral-400 transition-colors">Privacy Policy</Link>
            <Link to="/terms-of-service" className="text-xs text-neutral-600 hover:text-neutral-400 transition-colors">Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
