import { Link } from "react-router-dom";
import { SplineScene } from "@/components/ui/spline";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function MainShowcase() {
  return (
    <div className="grid min-h-[80vh] grid-cols-1 items-center gap-8 lg:grid-cols-2">
      {/* Текст зліва */}
      <div className="flex flex-col justify-center py-10">
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-neutral-500">
          Офіційний магазин
        </p>
        <h1 className="text-6xl font-black text-white md:text-7xl lg:text-8xl tracking-tight leading-[0.95]">
          NEXUS<br />TECH
        </h1>
        <p className="mt-6 text-2xl text-neutral-300 md:text-3xl font-light">
          Технології нового покоління
        </p>
        <p className="mt-3 text-base text-neutral-500 max-w-md">
          Найкраща електроніка за найкращими цінами. Офіційна гарантія на всі товари.
        </p>
        <div className="mt-10 flex flex-wrap gap-4">
          <Link to="/catalog">
            <Button size="lg" className="gap-2 bg-white text-black hover:bg-neutral-200 text-base px-8">
              Перейти до каталогу
              <ArrowRight className="h-5 w-5" />
            </Button>
          </Link>
          <Link to="/catalog?featured=true">
            <Button size="lg" variant="outline" className="border-neutral-700 text-neutral-300 hover:bg-neutral-800 text-base px-8">
              Акції та знижки
            </Button>
          </Link>
        </div>
      </div>

      {/* Робот справа / по центру */}
      <div className="relative h-[480px] lg:h-[600px]">
        <SplineScene
          scene="https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode"
          className="absolute inset-0 h-full w-full"
        />
      </div>
    </div>
  );
}
