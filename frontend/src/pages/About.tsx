import { Helmet } from "react-helmet-async";
import { Bot, ShieldCheck, Truck, HeadphonesIcon, Star } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { GlobalLines } from "@/components/ui/background-paths";

const FEATURES = [
  {
    icon: ShieldCheck,
    title: "Офіційна гарантія",
    desc: "Всі товари мають офіційну гарантію виробника. Ми продаємо тільки оригінальну продукцію.",
  },
  {
    icon: Truck,
    title: "Доставка по всій Україні",
    desc: "Відправляємо Новою Поштою. Доставка 1–2 дні після підтвердження замовлення.",
  },
  {
    icon: HeadphonesIcon,
    title: "Підтримка 7 днів на тиждень",
    desc: "Наша команда готова відповісти на будь-яке питання щодо товарів чи замовлень.",
  },
  {
    icon: Star,
    title: "Перевірена якість",
    desc: "Кожен товар проходить контроль перед відправкою. Більше 5000 задоволених покупців.",
  },
];

export function About() {
  return (
    <div className="min-h-screen bg-neutral-950">
      <Helmet>
        <title>Про нас — SmartBot Shop</title>
        <meta name="description" content="SmartBot Shop — магазин розумної техніки для дому. Роботи-пилососи, розумні колонки, гаджети. Офіційна гарантія, доставка по всій Україні." />
      </Helmet>
      <GlobalLines />
      <Header />

      <div className="mx-auto max-w-4xl px-4 pb-24 pt-32 md:px-8">
        <div className="mb-16 text-center">
          <div className="mb-6 flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-neutral-700 bg-neutral-900">
              <Bot className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="mb-4 text-4xl font-bold text-white sm:text-5xl">
            SmartBot Shop
          </h1>
          <p className="mx-auto max-w-xl text-lg text-neutral-400">
            Магазин розумної техніки для сучасного дому. Ми допомагаємо зробити побут простішим і приємнішим за допомогою технологій.
          </p>
        </div>

        <div className="mb-16 grid gap-6 sm:grid-cols-2">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-6"
            >
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl border border-neutral-700 bg-neutral-800">
                <Icon className="h-5 w-5 text-white" />
              </div>
              <h3 className="mb-2 text-base font-semibold text-white">{title}</h3>
              <p className="text-sm leading-relaxed text-neutral-400">{desc}</p>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-8">
          <h2 className="mb-6 text-2xl font-bold text-white">Наша місія</h2>
          <p className="mb-4 leading-relaxed text-neutral-400">
            SmartBot Shop — це команда ентузіастів розумних технологій. Ми віримо, що якісна техніка має бути доступною кожному, а купівля — простою і приємною.
          </p>
          <p className="leading-relaxed text-neutral-400">
            Ми ретельно відбираємо кожен товар у нашому каталозі, щоб ви отримували тільки перевірену продукцію від надійних виробників.
          </p>
        </div>
      </div>

      <Footer />
    </div>
  );
}
